"""Akses regu: waktu tempuh Daops/posko -> kompleks prioritas lewat jaringan jalan & sungai OSM.

Pakai:  python3 scripts/scrape/akses.py graf     # bulanan: OSM mentah -> data/graf_jalan.json.gz + public/data/jalan.geojson
        python3 scripts/scrape/akses.py          # harian: graf + kluster/daops/posko -> public/data/akses.json
Mentah: data/raw/osm/prov-jalan-<kode>.json dari scripts/scrape/tarik_osm.py jalan (ODbL, (c) kontributor OpenStreetMap).

Model (perkiraan perencanaan, bukan navigasi):
  laju jalan km/jam  trunk/primary 50, secondary 40, tertiary 30, unclassified 25, track 15; *_link = kelas induknya
  sungai (waterway=river) 15 km/jam perahu; pindah jalan<->sungai di simpul berjarak <= 1 km: 30 menit + jalan kaki
  ujung kompleks: dari titik tengah kompleks ke simpul mana pun dalam 15 km, garis lurus jalan kaki 4 km/jam
  ujung markas : dari Daops/posko ke simpul dalam 10 km, garis lurus x 1,3 pada 20 km/jam (jalan kecil tak terpeta)
  celah peta: komponen jaringan kecil (< 3000 simpul) disambung ke komponen lain lewat celah <= 5 km, garis lurus x 1,3
               pada 10 km/jam (jalan kebun tak terpeta)
  batas cari 18 jam; di atasnya dianggap tidak terjangkau lewat darat/sungai (andalkan udara).
  jejak GPS regu: bila berkas JEJAK ada (env AKSES_JEJAK, bawaan data/jejak_regu.json) tiap jejak jadi ruas "track" 15 km/jam yang disambung ke simpul graf dalam 0,3 km
               (jalan kaki 4 km/jam). Bentuk berkas: {"jejak": [[[lat, lon], ...], ...]} atau GeoJSON LineString/MultiLineString ([lon, lat]). Tanpa nama/identitas regu.
Kompleks yang dihitung (harian): level 3 di provinsi prioritas (kluster.json) DITAMBAH setiap kompleks di tugas_kompleks.json (level >= 2 teramati <= 24 jam, SEMUA provinsi),
  paling banyak MAKS_KOMPLEKS terpenting (level, lalu n24), dalam MAKS_DETIK dan akses.json < MAKS_BYTE. Tiap entri yang punya sumber air terdekat juga membawa `air` (air_dem.py).
Graf dipadatkan: simpul = persimpangan, ujung ruas, dan titik jangkar tiap <= 2 km di sepanjang ruas.
"""
import gzip, heapq, json, math, os, sys, time

AKAR = os.path.join(os.path.dirname(__file__), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import PRIORITAS, PROVINSI

MENTAH = os.path.join(AKAR, "data/raw/osm")
GRAF = os.path.join(AKAR, "data/graf_jalan.json.gz")
DATA = os.path.join(AKAR, "public/data")
LAJU = {"trunk": 50, "primary": 50, "secondary": 40, "tertiary": 30, "unclassified": 25, "track": 15, "river": 15}
KELAS = {"trunk": 1, "primary": 1, "secondary": 2, "tertiary": 3, "unclassified": 4, "track": 5, "river": 6}
JANGKAR_KM = 2.0
PINDAH_KM, PINDAH_MENIT = 1.0, 30
KAKI_KMJ, KAKI_MAKS_KM = 4.0, 15.0
MARKAS_KMJ, MARKAS_MAKS_KM, KELOK = 20.0, 10.0, 1.3
BATAS_JAM = 18.0
PULAU, CELAH_KM, CELAH_KMJ = 3000, 5.0, 10.0  # komponen < 3000 simpul disambung lewat celah <= 5 km, 10 km/jam
SEL = 0.05  # indeks ruang (derajat)
# akses.json berkunci id kompleks harian (K0001..., diurut ulang tiap putaran) -> dicocokkan ke kompleks lewat LOKASI.
# 1,5 km = eps DBSCAN (harian.EPS_KM): pusat kompleks yang sama bergeser antar putaran sekitar satu tautan; lebih longgar
# (3 km) membuat tetangga 1,5-3 km ikut mengambil akses kompleks lain. Satu entri hanya untuk SATU kompleks per putaran
# (pasangan terdekat menang). Asumsi platform, belum diuji balik terhadap drift nyata (butuh arsip kluster antar putaran).
COCOK_KM = 1.5
MAKS_KOMPLEKS, MAKS_DETIK, MAKS_BYTE = 1500, 600, 3_000_000
JEJAK = os.environ.get("AKSES_JEJAK") or os.path.join(AKAR, "data/jejak_regu.json")
JEJAK_SAMBUNG_KM, JEJAK_LAJU = 0.3, LAJU["track"]


def km(a1, o1, a2, o2):
    return math.hypot((a2 - a1) * 110.57, (o2 - o1) * 111.32 * math.cos(math.radians((a1 + a2) / 2)))


def kelas(t):
    h = t.get("highway", "").replace("_link", "")
    return h if h in LAJU else ("river" if t.get("waterway") == "river" else None)


def bangun_graf(ruas):
    """ruas: [(kelas, [(lat, lon), ...])] -> (simpul [(lat, lon)], sisi [(a, b, menit, meter)])"""
    kunci = lambda p: (round(p[0] * 1e5), round(p[1] * 1e5))
    def rapat(pts):  # sisipkan titik supaya tidak ada celah > 1 km (ruas lurus panjang tetap punya jangkar)
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            n = math.ceil(km(*a, *b) / JANGKAR_KM) - 1
            out += [(a[0] + (b[0] - a[0]) * t / (n + 1), a[1] + (b[1] - a[1]) * t / (n + 1)) for t in range(1, n + 1)] + [b]
        return out
    ruas = [(kl, rapat(pts)) for kl, pts in ruas]
    n = {}
    for _, pts in ruas:
        for p in pts:
            k = kunci(p)
            n[k] = n.get(k, 0) + 1
    idx, simpul, sisi = {}, [], []
    def id_(p):
        k = kunci(p)
        if k not in idx:
            idx[k] = len(simpul)
            simpul.append((k[0] / 1e5, k[1] / 1e5))
        return idx[k]
    for kl, pts in ruas:
        a, d = id_(pts[0]), 0.0
        for i in range(1, len(pts)):
            d += km(*pts[i - 1], *pts[i])
            if i == len(pts) - 1 or n[kunci(pts[i])] > 1 or d >= JANGKAR_KM * 0.99:
                b = id_(pts[i])
                if b != a:
                    sisi.append((a, b, round(d / LAJU[kl] * 60, 2), round(d * 1000), kl == "river"))
                a, d = b, 0.0
    # simpul sungai <-> simpul jalan berdekatan: dermaga/tepian kampung
    sungai = {a for a, b, *_, s in sisi if s} | {b for a, b, *_, s in sisi if s}
    jalan = {a for a, b, *_, s in sisi if not s} | {b for a, b, *_, s in sisi if not s}
    ind = indeks(simpul, jalan)
    for s in sungai - jalan:
        for j, d in dekat(ind, simpul, *simpul[s], PINDAH_KM):
            sisi.append((s, j, round(PINDAH_MENIT + d / KAKI_KMJ * 60, 2), round(d * 1000), False))
    sisi = [x[:4] for x in sisi]
    return simpul, sisi + sambung_pulau(simpul, sisi)


def sambung_pulau(simpul, sisi):
    """Jaringan OSM sering terputus (jalan kebun digambar dari citra tanpa disambung). Tiap komponen kecil
    (< PULAU simpul) disambung ke komponen lain lewat 3 pasangan simpul terdekat dalam CELAH_KM, laju jalan tak terpeta."""
    induk = list(range(len(simpul)))
    def akar(i):
        while induk[i] != i:
            induk[i] = induk[induk[i]]
            i = induk[i]
        return i
    for a, b, *_ in sisi:
        ra, rb = akar(a), akar(b)
        if ra != rb:
            induk[ra] = rb
    kom = {}
    for i in range(len(simpul)):
        kom.setdefault(akar(i), []).append(i)
    ind = indeks(simpul)
    baru = []
    for r, anggota in kom.items():
        if len(anggota) >= PULAU:
            continue
        cand = sorted((d, i, j) for i in anggota for j, d in dekat(ind, simpul, *simpul[i], CELAH_KM) if akar(j) != r)
        pakai = set()
        for d, i, j in cand:
            if akar(j) in pakai:
                continue
            pakai.add(akar(j))
            baru.append((i, j, round(d * KELOK / CELAH_KMJ * 60, 2), round(d * KELOK * 1000)))
            if len(pakai) >= 3:
                break
    return baru


def indeks(simpul, pilih=None):
    ind = {}
    for i in (pilih if pilih is not None else range(len(simpul))):
        la, lo = simpul[i]
        ind.setdefault((math.floor(la / SEL), math.floor(lo / SEL)), []).append(i)
    return ind


def dekat(ind, simpul, lat, lon, r_km):
    r = math.ceil(r_km / (SEL * 110)) + 1
    gy, gx = math.floor(lat / SEL), math.floor(lon / SEL)
    for y in range(gy - r, gy + r + 1):
        for x in range(gx - r, gx + r + 1):
            for i in ind.get((y, x), ()):
                d = km(lat, lon, *simpul[i])
                if d <= r_km:
                    yield i, d


def dijkstra(adj, benih, batas_menit):
    """benih: {simpul: (menit, meter)} -> {simpul: (menit, meter)} dalam batas."""
    best = dict(benih)
    h = [(m, d, i) for i, (m, d) in benih.items()]
    heapq.heapify(h)
    while h:
        m, d, i = heapq.heappop(h)
        if m > best[i][0] or m > batas_menit:
            continue
        for j, mm, dd in adj[i]:
            t = m + mm
            if t < best.get(j, (1e18,))[0]:
                best[j] = (t, d + dd)
                heapq.heappush(h, (t, d + dd, j))
    return best


def sederhana(pts, tol):
    """Douglas-Peucker (derajat), iteratif."""
    if len(pts) < 3:
        return pts
    simpan, tumpuk = {0, len(pts) - 1}, [(0, len(pts) - 1)]
    while tumpuk:
        a, b = tumpuk.pop()
        (y1, x1), (y2, x2) = pts[a], pts[b]
        dy, dx = y2 - y1, x2 - x1
        L = math.hypot(dx, dy) or 1e-12
        jauh, k = 0, None
        for i in range(a + 1, b):
            d = abs(dy * (pts[i][1] - x1) - dx * (pts[i][0] - y1)) / L
            if d > jauh:
                jauh, k = d, i
        if k is not None and jauh > tol:
            simpan.add(k)
            tumpuk += [(a, k), (k, b)]
    return [pts[i] for i in sorted(simpan)]


def graf():
    ruas, fitur = [], {}
    for kode in sorted(PROVINSI, key=lambda k: (k not in PRIORITAS, k)):  # semua provinsi yang mentahnya sudah ditarik
        p = os.path.join(MENTAH, f"prov-jalan-{kode}.json")
        if not os.path.exists(p):
            print("lewati", kode, "(belum ditarik: python3 scripts/scrape/tarik_osm.py jalan)", file=sys.stderr)
            continue
        for el in json.load(open(p))["elements"]:
            kl = kelas(el.get("tags", {}))
            if not kl or not el.get("geometry"):
                continue
            pts = [(g["lat"], g["lon"]) for g in el["geometry"]]
            ruas.append((kl, pts))
            # peta (< 3 MB untuk 9 provinsi): hanya jalan tersier ke atas + sungai, disederhanakan ~150-200 m,
            # 3 desimal (~110 m), digabung per kelas. Jalan desa & jalan tanah tetap di graf waktu tempuh.
            if KELAS[kl] in (4, 5):
                continue
            # di luar 9 provinsi prioritas peta cukup jalan nasional/provinsi (kelas 1-2) + sungai yang lebih disederhanakan,
            # supaya jalan.geojson untuk seluruh Indonesia tetap ringan; graf waktu tempuh tetap memakai semua ruas
            luar = kode not in PRIORITAS
            if luar and KELAS[kl] == 3:
                continue
            s = sederhana(pts, (0.004 if luar else 0.002) if KELAS[kl] <= 3 else (0.006 if luar else 0.003))
            garis = [[round(x, 3), round(y, 3)] for y, x in s]
            garis = [c for i, c in enumerate(garis) if i == 0 or c != garis[i - 1]]
            if len(garis) > 1:
                fitur.setdefault(KELAS[kl], []).append(garis)
    simpul, sisi = bangun_graf(ruas)
    os.makedirs(os.path.dirname(GRAF), exist_ok=True)
    with gzip.open(GRAF, "wt") as f:
        json.dump({"simpul": [[round(a, 4), round(b, 4)] for a, b in simpul], "sisi": [[a, b, round(m, 1), d] for a, b, m, d in sisi]}, f, separators=(",", ":"))
    p = os.path.join(DATA, "jalan.geojson")
    fc = [{"type": "Feature", "properties": {"k": k}, "geometry": {"type": "MultiLineString", "coordinates": g}} for k, g in sorted(fitur.items())]
    json.dump({"type": "FeatureCollection", "features": fc}, open(p, "w"), separators=(",", ":"))
    print(f"graf {len(simpul)} simpul {len(sisi)} sisi, {os.path.getsize(GRAF) / 1e6:.1f} MB | jalan.geojson {sum(map(len, fitur.values()))} garis {os.path.getsize(p) / 1e6:.2f} MB")
    assert os.path.getsize(p) < 3e6, "jalan.geojson >= 3 MB: naikkan toleransi sederhana()"


def markas():
    out = [{"dari": d["nama"], "kode": d["kode"], "jenis": "daops", "lat": d["lat"], "lon": d["lon"]}
           for d in json.load(open(os.path.join(DATA, "daops.json")))]
    out += [{"dari": f'{p["id"]} {p["nama"]}', "kode": p["id"], "jenis": "posko", "lat": p["lat"], "lon": p["lon"]}
            for p in json.load(open(os.path.join(DATA, "posko.json")))["posko"]]
    return out


def muat_jejak(path=JEJAK):
    """berkas jejak -> [[(lat, lon), ...]] (>= 2 titik, koordinat sah). Tak ada/rusak = []."""
    try:
        d = json.load(open(path))
    except (OSError, ValueError):
        return []
    garis = []
    if isinstance(d, dict) and isinstance(d.get("jejak"), list):
        garis = [[(p[0], p[1]) for p in g if isinstance(p, (list, tuple)) and len(p) >= 2] for g in d["jejak"] if isinstance(g, list)]
    elif isinstance(d, dict) and d.get("type") == "FeatureCollection":
        for f in d.get("features", []):
            g = (f or {}).get("geometry") or {}
            ls = [g["coordinates"]] if g.get("type") == "LineString" else g["coordinates"] if g.get("type") == "MultiLineString" else []
            garis += [[(p[1], p[0]) for p in l if isinstance(p, (list, tuple)) and len(p) >= 2] for l in ls]
    ok = lambda p: all(isinstance(v, (int, float)) for v in p) and -11.5 <= p[0] <= 6.5 and 94 <= p[1] <= 141.5
    return [g for g in ([p for p in g if ok(p)] for g in garis) if len(g) >= 2]


def tambah_jejak(simpul, sisi, jejak):
    """Jejak GPS regu jadi ruas track: (simpul', sisi', n_ruas, n_sambung). Titik jejak dirapatkan tiap JANGKAR_KM seperti ruas OSM; tiap titik
    disambung ke simpul graf terdekat dalam JEJAK_SAMBUNG_KM (jalan kaki), sehingga jejak yang menyusuri jalan tak memotong jalan itu."""
    if not jejak:
        return simpul, sisi, 0, 0
    simpul, sisi = list(simpul), list(sisi)
    ind = indeks(simpul)
    baru, n_sambung = {}, 0
    for pts in jejak:
        prev = None
        for a, b in zip(pts, pts[1:]):
            n = max(1, math.ceil(km(*a, *b) / JANGKAR_KM))
            for t in range(n + 1):
                p = (round(a[0] + (b[0] - a[0]) * t / n, 5), round(a[1] + (b[1] - a[1]) * t / n, 5))
                if p not in baru:
                    baru[p] = len(simpul)
                    simpul.append(p)
                    for j, d in sorted(dekat(ind, simpul, *p, JEJAK_SAMBUNG_KM), key=lambda x: x[1])[:2]:
                        sisi.append((baru[p], j, round(d / KAKI_KMJ * 60, 2), round(d * 1000)))
                        n_sambung += 1
                i = baru[p]
                if prev is not None and prev != i:
                    d = km(*simpul[prev], *p)
                    sisi.append((prev, i, round(d / JEJAK_LAJU * 60, 2), round(d * 1000)))
                prev = i
    return simpul, sisi, len(jejak), n_sambung


def akses(simpul, sisi, kompleks, basis, n_daops=3, n_posko=2, detik=None):
    t0 = time.time()
    adj = [[] for _ in simpul]
    for a, b, m, d in sisi:
        adj[a].append((b, m, d))
        adj[b].append((a, m, d))
    ind = indeks(simpul)
    hub = []  # per markas: simpul dalam jangkauan + biaya sambung
    for b in basis:
        hub.append([(i, d * KELOK / MARKAS_KMJ * 60, d * KELOK) for i, d in dekat(ind, simpul, b["lat"], b["lon"], MARKAS_MAKS_KM)])
    out = {}
    for k in kompleks:
        if detik and time.time() - t0 > detik:
            print(f"akses: batas waktu {detik} dtk, {len(out)}/{len(kompleks)} cluster selesai (sisanya garis lurus)", file=sys.stderr)
            break
        benih = {}
        for i, d in dekat(ind, simpul, k["lat"], k["lon"], KAKI_MAKS_KM):
            m = d / KAKI_KMJ * 60
            if m < benih.get(i, (1e18,))[0]:
                benih[i] = (m, d * 1000)
        if not benih:
            continue
        kaki = min(benih.values())[1] / 1000
        best = dijkstra(adj, benih, BATAS_JAM * 60)
        hasil = []
        for b, h in zip(basis, hub):
            c = min(((best[i][0] + mm, best[i][1] / 1000 + dk) for i, mm, dk in h if i in best), default=None)
            if c and c[0] <= BATAS_JAM * 60:
                hasil.append({"dari": b["dari"], "kode": b["kode"], "jenis": b["jenis"], "km_jalan": round(c[1], 1), "jam": round(c[0] / 60, 1)})
        hasil.sort(key=lambda x: x["jam"])
        pilih = [x for x in hasil if x["jenis"] == "daops"][:n_daops] + [x for x in hasil if x["jenis"] == "posko"][:n_posko]
        out[k["id"]] = {"lat": round(k["lat"], 4), "lon": round(k["lon"], 4), "kaki_km": round(kaki, 1), "dari": sorted(pilih, key=lambda x: x["jam"])}
    return out


def daftar_akses(ak):
    """akses.json -> [(lat, lon, entri)]. Entri tanpa lat/lon (berkas lama, id harian yang sudah basi) DIABAIKAN, bukan ditempel."""
    return [(v["lat"], v["lon"], v) for k, v in (ak or {}).items()
            if k != "_meta" and isinstance(v, dict) and isinstance(v.get("lat"), (int, float)) and isinstance(v.get("lon"), (int, float))]


def pasangkan_akses(daftar, titik, maks_km=COCOK_KM):
    """titik [(kunci, lat, lon)] -> {kunci: entri akses}. Pasangan terdekat dalam maks_km menang; satu entri hanya untuk satu
    kompleks, kompleks lain (tetangga tanpa entri sendiri) tidak mendapat apa-apa. ID kompleks tidak dipakai."""
    pasang = sorted((km(la, lo, a, b), i, j) for i, (_, la, lo) in enumerate(titik) for j, (a, b, _) in enumerate(daftar))
    out, pakai_t, pakai_d = {}, set(), set()
    for d, i, j in pasang:
        if d > maks_km:
            break
        if i not in pakai_t and j not in pakai_d:
            out[titik[i][0]] = daftar[j][2]
            pakai_t.add(i)
            pakai_d.add(j)
    return out


def pilih_kompleks(kluster, tugas):
    """Level 3 di provinsi prioritas (kluster.json, perilaku lama) DITAMBAH semua kompleks tugas_kompleks.json (semua provinsi), tanpa dobel id,
    terpenting dulu (level lalu n24), paling banyak MAKS_KOMPLEKS. -> daftar properti dengan id, lat, lon."""
    ada = {}
    for f in kluster:
        p = f["properties"]
        if p.get("level") == 3 and p.get("prov") in PRIORITAS:
            ada[p["id"]] = p
    for t in (tugas or {}).get("kompleks", []):
        if isinstance(t.get("lat"), (int, float)) and isinstance(t.get("lon"), (int, float)):
            ada.setdefault(t["id"], t)
    return sorted(ada.values(), key=lambda p: (-(p.get("level") or 0), -(p.get("n24") or 0), p["id"]))[:MAKS_KOMPLEKS]


def harian():
    with gzip.open(GRAF, "rt") as f:
        g = json.load(f)
    kl = json.load(open(os.path.join(DATA, "kluster.json")))["features"]
    try:
        tugas = json.load(open(os.path.join(DATA, "tugas_kompleks.json")))
    except (OSError, ValueError):
        tugas = None
    lama = sum(1 for f in kl if f["properties"].get("level") == 3 and f["properties"].get("prov") in PRIORITAS)
    kompleks = pilih_kompleks(kl, tugas)
    simpul, sisi, n_jejak, n_sambung = tambah_jejak([tuple(s) for s in g["simpul"]], g["sisi"], muat_jejak())
    hasil = akses(simpul, sisi, kompleks, markas(), detik=MAKS_DETIK)
    air = None
    try:
        import air_dem
        for e in hasil.values():
            e.pop("air", None)
        n_s, n_b = air_dem.tambah(hasil)
        air = {"kompleks_dengan_sumber": n_s, "dengan_beda_tinggi": n_b, "cari_km": air_dem.CARI_KM, "dem": air_dem.DEM_KET,
               "arti": "beda_tinggi_m = elevasi cluster - elevasi sumber (positif: air harus dinaikkan); km = garis lurus ke sumber, jarak selang = km x 1,2 (hitungEstafet)"} if n_s else None
    except Exception as e:     # sumber air/DEM gagal tidak boleh menjatuhkan rute
        print(f"akses: air_dem dilewati ({e.__class__.__name__}: {e})", file=sys.stderr)
    out = {"_meta": {"laju_kmj": LAJU, "kaki_kmj": KAKI_KMJ, "batas_jam": BATAS_JAM, "kompleks": len(kompleks), "terjangkau": len(hasil),
                     "level3_prioritas_lama": lama, "dari_tugas": len((tugas or {}).get("kompleks", [])), "jejak_regu": {"ruas": n_jejak, "sambungan": n_sambung},
                     **({"air": air} if air else {}),
                     "sumber": "OpenStreetMap (ODbL), (c) kontributor OpenStreetMap",
                     "catatan": "Perkiraan perencanaan: kondisi jalan, banjir, portal perusahaan, dan izin lewat tidak dimodelkan."}}
    urut = list(hasil.items())
    out.update(urut)
    teks = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    while len(teks.encode()) > MAKS_BYTE and len(out) > 1:     # kompleks paling tidak penting (ujung daftar) dibuang dulu
        del out[urut.pop()[0]]
        teks = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    p = os.path.join(DATA, "akses.json")
    open(p, "w").write(teks)
    print(f"akses.json {len(urut)}/{len(kompleks)} kompleks terjangkau (graf), {sum(1 for _, e in urut if e.get('dari'))} punya rute dari markas, {os.path.getsize(p) / 1e3:.0f} KB; "
          f"{lama} level-3 prioritas lama + tugas_kompleks {len((tugas or {}).get('kompleks', []))}; jejak regu {n_jejak} ruas")


def uji():
    # dua jalan primary 10 km (lurus ke timur) bersambung di (0, 0.0898); kompleks 1 km di utara ujung timur
    e = 10 / 111.32
    ruas = [("primary", [(0, 0), (0, e)]), ("track", [(0, e), (0, 2 * e)])]
    simpul, sisi = bangun_graf(ruas)
    assert len(simpul) == 11, len(simpul)  # jangkar tiap 2 km: 0..20 km
    basis = [{"dari": "A", "kode": "A", "jenis": "daops", "lat": 0, "lon": 0}]
    k = {"id": "K", "lat": 1 / 110.57, "lon": 2 * e}
    r = akses(simpul, sisi, [k], basis)["K"]
    # 10 km/50 + 10 km/15 + 1 km kaki/4 = 0,2 + 0,667 + 0,25 = 1,12 jam
    assert abs(r["dari"][0]["jam"] - 1.1) < 0.051 and abs(r["dari"][0]["km_jalan"] - 21) < 0.2, r
    assert r["kaki_km"] == 1.0
    # sungai ditolak sebagai jalan biasa: pindah moda dikenai 30 menit
    s2, e2 = bangun_graf([("primary", [(0, 0), (0, e)]), ("river", [(0.001, e), (0.001, 2 * e)])])
    assert any(m >= PINDAH_MENIT for *_, m, _ in e2), "sisi pindah sungai-jalan tidak terbentuk"
    # dua jalan terpisah celah 1 km: disambung, biaya 1 km x 1,3 / 10 km/jam = 7,8 menit
    s3, e3 = bangun_graf([("primary", [(0, 0), (0, e)]), ("primary", [(1 / 110.57, 0), (1 / 110.57, e)])])
    assert any(abs(m - 7.8) < 0.1 for *_, m, _ in e3), "pulau jaringan tidak disambung"
    assert sederhana([(0, 0), (0, 1e-5), (0, 1)], 1e-4) == [(0, 0), (0, 1)]
    # akses.json menyimpan lokasi; pencocokan ke kompleks lewat lokasi, bukan id
    assert (r["lat"], r["lon"]) == (round(k["lat"], 4), round(k["lon"], 4)), r
    d = daftar_akses({"_meta": {}, "K0001": r, "K0002": {"kaki_km": 1.0, "dari": []}})   # K0002 berkas lama tanpa lokasi
    assert len(d) == 1, d
    kc = lambda dy, key="X": (key, k["lat"] + dy / 110.57, k["lon"])
    assert pasangkan_akses(d, [kc(0)])["X"] is r
    assert pasangkan_akses(d, [kc(1)])["X"] is r, "id berubah (K0001 -> K0950) tapi lokasi 1 km: tetap cocok"
    assert pasangkan_akses(d, [kc(COCOK_KM + 0.5)]) == {}, "lokasi jauh tidak boleh cocok"
    assert pasangkan_akses([], [kc(0)]) == {} and pasangkan_akses(daftar_akses(None), [kc(0)]) == {} and pasangkan_akses(d, []) == {}
    lain = {"lat": k["lat"] + 2 / 110.57, "lon": k["lon"], "kaki_km": 9.0, "dari": []}
    assert pasangkan_akses(daftar_akses({"A": r, "B": lain}), [kc(1.4)])["X"] is lain, "yang terdekat menang"
    # dua kompleks di 1 km dan 1,4 km dari SATU entri: hanya yang terdekat mendapat, tetangga tidak mengambil milik orang
    m = pasangkan_akses(d, [kc(1.4, "jauh"), kc(1.0, "dekat")])
    assert m == {"dekat": r}, m
    # jejak GPS regu menyambung dua jaringan yang terpisah celah 20 km (> CELAH_KM): tanpa jejak tak ada rute dari markas, dengan jejak ada
    kb = [("primary", [(0, 0), (0, e)]), ("primary", [(0, 3 * e), (0, 4 * e)])]
    s4, e4 = bangun_graf(kb)
    kx = {"id": "KJ", "lat": 0.0, "lon": 4 * e}
    assert akses(s4, e4, [kx], basis)["KJ"]["dari"] == [], "tanpa jejak seharusnya tak terjangkau"
    s5, e5, nr, ns = tambah_jejak(s4, e4, [[(0, e), (0, 3 * e)]])
    j = akses(s5, e5, [kx], basis)["KJ"]["dari"]
    assert nr == 1 and ns >= 2 and j and 1.3 < j[0]["jam"] < 1.9, (nr, ns, j)   # 10/50 + 20/15 + 10/50 = 1,73 jam
    assert tambah_jejak(s4, e4, [])[2:] == (0, 0) and len(tambah_jejak(s4, e4, [])[0]) == len(s4)
    # muat_jejak: dua bentuk berkas, koordinat tak sah/rusak dibuang
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        pj = os.path.join(d, "j.json")
        json.dump({"jejak": [[[0, 100], [0, 100.1]], [[0, 100]], [[99, 99], [0, 100]]]}, open(pj, "w"))
        assert muat_jejak(pj) == [[(0, 100), (0, 100.1)]], muat_jejak(pj)
        json.dump({"type": "FeatureCollection", "features": [{"geometry": {"type": "LineString", "coordinates": [[100, 0], [100.1, 0]]}}, {"geometry": None}]}, open(pj, "w"))
        assert muat_jejak(pj) == [[(0, 100), (0, 100.1)]]
        open(pj, "w").write("{rusak")
        assert muat_jejak(pj) == [] and muat_jejak(os.path.join(d, "tidak_ada.json")) == []
    # pilih_kompleks: level 3 prioritas lama + tugas semua provinsi, tanpa dobel, terpenting dulu
    kl_ = [{"properties": {"id": "A", "level": 3, "prov": "62", "lat": 0, "lon": 100, "n24": 5}}, {"properties": {"id": "B", "level": 3, "prov": "11", "lat": 0, "lon": 100, "n24": 5}}]
    tg_ = {"kompleks": [{"id": "A", "lat": 0, "lon": 100, "level": 3}, {"id": "C", "lat": 1, "lon": 101, "level": 2, "n24": 9}, {"id": "D", "level": 2}]}
    assert [p["id"] for p in pilih_kompleks(kl_, tg_)] == ["A", "C"], pilih_kompleks(kl_, tg_)   # B bukan prioritas dan tak ada di tugas; D tanpa koordinat
    assert pilih_kompleks(kl_, None) == [kl_[0]["properties"]]

if __name__ == "__main__":
    uji()
    if sys.argv[1:] == ["graf"]:
        graf()
    elif sys.argv[1:] != ["uji"]:
        harian()
