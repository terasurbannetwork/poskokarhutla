"""#40: indeks akses logistik per kecamatan dari Overture Maps places -> public/data/logistik.json   (INDEKS, bukan prediksi)

Akses: Overture Maps GeoParquet publik di S3 anonim (s3://overturemaps-us-west-2/release/<rilis>/theme=places/type=place/), lisensi CDLA-Permissive-2.0
       untuk places (atribusi "Overture Maps Foundation"); tiap record memuat sumber+lisensi sendiri. Skema rilis 2026-10-21: taxonomy.primary (BUKAN categories.primary).
Tahap 1 (LAB, butuh `pip install duckdb`; dipindai ~3 menit dari jaringan lokal; dijalankan triwulan):
       <python-dengan-duckdb> scripts/umum/logistik.py lab [rilis]   -> data/raw/logistik/poi.csv (lon,lat,kelas)
Tahap 2 (stdlib, murni): poi.csv + centroid kecamatan -> jarak terdekat per kelas -> indeks.
Rumus: d_k = jarak haversine (km) centroid kecamatan ke POI terdekat kelas k  (k = spbu, gudang, pasar; toko = pelengkap, tak masuk indeks)
       akses_k = 1/(1+exp((d_k - D0)/S)), D0 = 15 km, S = 7,5 km  (logistik: 0,5 pada 15 km, ~0,88 pada 0 km... lihat uji)
       indeks = rata-rata akses_k (bobot sama; dipilih tetap, tidak dikalibrasi karena tak ada label) skala 0-1.
Batas: centroid kecamatan = rata-rata simpul cincin terbesar (bukan pusat permukiman); jarak lurus, bukan jarak jalan; kelengkapan Overture di luar
       Jawa rendah, jadi indeks rendah di sana bisa berarti data kosong. Dicatat: n_poi per kelas per provinsi.
"""
import csv, importlib.util, json, math, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
POI = os.path.join(AKAR, "data/raw/logistik/poi.csv")
KELAS = {"spbu": ("gas_station", "truck_gas_station"),
         "gudang": ("warehouse", "storage_facility", "wholesaler", "wholesale_grocer", "warehouse_club_store", "self_storage_facility"),
         "pasar": ("farmers_market", "flea_market", "night_market", "public_market", "seafood_market"),
         "toko": ("grocery_store", "hardware_store")}
D0, S = 15.0, 7.5
SEL = 0.25


def lab(rilis="2026-10-21.0"):
    import duckdb  # lab saja; produksi stdlib
    c = duckdb.connect()
    c.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    sem = {t: k for k, ts in KELAS.items() for t in ts}
    daftar = ",".join(f"'{t}'" for t in sem)
    src = f"read_parquet('s3://overturemaps-us-west-2/release/{rilis}/theme=places/type=place/*', hive_partitioning=1)"
    baris = c.execute(f"""select bbox.xmin, bbox.ymin, taxonomy.primary from {src}
        where bbox.xmin between 94.5 and 141.5 and bbox.ymin between -11.5 and 6.5 and taxonomy.primary in ({daftar})
        and coalesce(operating_status,'open') != 'closed'""").fetchall()
    os.makedirs(os.path.dirname(POI), exist_ok=True)
    with open(POI, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["lon", "lat", "kelas"])
        for x, y, t in baris:
            w.writerow([round(x, 5), round(y, 5), sem[t]])
    print(f"logistik lab: {len(baris)} POI dari rilis {rilis}")


def haversine(lon1, lat1, lon2, lat2):
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def indeks_poi(titik):
    """titik: [(lon,lat)] -> grid sel SEL derajat."""
    g = {}
    for lon, lat in titik:
        g.setdefault((math.floor(lon / SEL), math.floor(lat / SEL)), []).append((lon, lat))
    return g


def terdekat(g, lon, lat, maks_cincin=40):
    """Jarak km ke titik terdekat; cari cincin sel makin lebar; berhenti saat cincin berikut pasti lebih jauh dari yang ditemukan. None bila kosong."""
    if not g:
        return None
    gx, gy = math.floor(lon / SEL), math.floor(lat / SEL)
    best = None
    for r in range(maks_cincin + 1):
        if best is not None and (r - 1) * SEL * 105 > best:  # 1 derajat >= ~105 km di lintang ini (cos 25 derajat): batas bawah aman
            break
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if max(abs(dx), abs(dy)) == r:
                    for x, y in g.get((gx + dx, gy + dy), ()):
                        d = haversine(lon, lat, x, y)
                        if best is None or d < best:
                            best = d
    return best


def akses(d):
    """Jarak km -> 0..1; tak ada POI (None) = 0."""
    return 0.0 if d is None else 1 / (1 + math.exp((d - D0) / S))


def centroid(geom):
    bagian = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    r = max((p[0] for p in bagian), key=len)
    return sum(c[0] for c in r) / len(r), sum(c[1] for c in r) / len(r)


def jalan():
    if not os.path.exists(POI):
        sys.exit(f"{POI} belum ada: jalankan tahap lab (duckdb) dulu")
    G = {k: [] for k in KELAS}
    for r in csv.DictReader(open(POI)):
        G[r["kelas"]].append((float(r["lon"]), float(r["lat"])))
    idx = {k: indeks_poi(v) for k, v in G.items()}
    kec, per_prov = [], {}
    gd = os.path.join(AKAR, "public/geo/kecamatan")
    for fn in sorted(os.listdir(gd)):
        if not fn.endswith(".json"):
            continue
        prov = fn[:-5]
        for f in json.load(open(os.path.join(gd, fn)))["features"]:
            p = f["properties"]
            if not p.get("kec"):
                continue
            lon, lat = centroid(f["geometry"])
            d = {k: terdekat(idx[k], lon, lat) for k in ("spbu", "gudang", "pasar")}
            ak = sum(akses(v) for v in d.values()) / 3
            kec.append([prov, p.get("kab"), p["kec"], round(lon, 3), round(lat, 3)] + [None if v is None else round(v, 1) for v in d.values()] + [round(ak, 3)])
            per_prov.setdefault(prov, []).append(ak)
    s = importlib.util.spec_from_file_location("umum_kejadian", os.path.join(AKAR, "scripts/umum/kejadian.py")); k = importlib.util.module_from_spec(s); s.loader.exec_module(k)
    k.simpan(os.path.join(AKAR, "public/data/logistik.json"), {
        "sumber": "Overture Maps places (GeoParquet, CDLA-Permissive-2.0)", "atribusi": "Overture Maps Foundation, https://overturemaps.org",
        "jenis_keluaran": "INDEKS (tanpa label; bukan prediksi)", "rumus": f"akses_k = 1/(1+exp((d_km - {D0})/{S})); indeks = rata-rata akses spbu, gudang, pasar",
        "kelas": {k_: list(v) for k_, v in KELAS.items()}, "n_poi": {k_: len(v) for k_, v in G.items()},
        "catatan": "Jarak lurus dari centroid kecamatan; kelengkapan Overture di luar Jawa rendah (indeks rendah dapat berarti data kosong). Tanpa POI = akses 0.",
        "kolom": ["prov", "kab", "kec", "lon", "lat", "d_spbu_km", "d_gudang_km", "d_pasar_km", "indeks"], "kecamatan": kec,
        "rata_provinsi": {p: round(sum(v) / len(v), 3) for p, v in sorted(per_prov.items())}})
    print(f"logistik: {len(kec)} kecamatan, POI {({k_: len(v) for k_, v in G.items()})}")


def uji():
    assert abs(haversine(0, 0, 0, 1) - 111.19) < 0.3
    g = indeks_poi([(100.0, 0.0), (101.0, 0.0), (110.0, 0.0)])
    assert abs(terdekat(g, 100.8, 0.0) - haversine(100.8, 0, 101, 0)) < 1e-9
    assert terdekat(indeks_poi([]), 1, 1) is None and akses(None) == 0
    assert abs(akses(D0) - .5) < 1e-9 and akses(0) > akses(10) > akses(50)
    assert abs(terdekat(indeks_poi([(100.0, 0.0)]), 105.0, 0.0) - haversine(105, 0, 100, 0)) < 1e-9  # jauh (> beberapa cincin)
    print("uji logistik: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["lab"]:
        lab(*a[1:2])
    else:
        jalan()
