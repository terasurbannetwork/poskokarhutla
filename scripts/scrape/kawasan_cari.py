"""Kawasan bernama untuk kotak cari peta -> public/data/kawasan_cari.json (indeks) + public/data/kawasan_cari.geojson (batas OSM).

Kategori dan sumber batasnya (dicatat per item di "sb", ditampilkan kartu):
- tn / tahura / sm / ca / twa / tb (taman nasional, taman hutan raya, suaka margasatwa, cagar alam, taman wisata alam, taman buru):
  OpenStreetMap (ODbL) lewat Overpass: boundary=national_park|protected_area atau leisure=nature_reserve, nama berawalan jenis kawasannya.
  Batas OSM = digitasi kontributor, BUKAN SK penetapan Kemenhut; disederhanakan ~100 m.
- danau: OSM natural=water untuk DANAU (daftar tetap di bawah).
- gunung: katalog gunung api MAGMA/PVMBG (public/gunungapi/data/gunung.json), kawasan = lingkaran RADIUS_GUNUNG km dari puncak (bukan KRB).
- metro: gabungan kab/kota (public/geo/kabupaten, METRO di bawah); poligonnya dirakit layar dari batas kab/kota yang sudah ada.
- khg: kesatuan hidrologis gambut BRGM PRIMS (public/data/lahan/khg.geojson, tidak disalin; layar mengambil poligon lewat kode).
Konsesi tetap di cari.json (cari_konsesi.py); layar menghitung angka kawasan dan konsesi dengan mesin yang sama (public/angka_kawasan.js).

Item indeks: t n p (kode prov wakil) b [bbox] id sb (sumber) + c [lon,lat] untuk gunung, kab ["prov|kab", ...] untuk metro.

Pakai:  python3 scripts/scrape/kawasan_cari.py         # tarik (cache di data/raw/kawasan/) + bangun + uji
        python3 scripts/scrape/kawasan_cari.py --uji   # uji keluaran saja
"""
import json, math, os, re, sys, time, urllib.parse, urllib.request

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import PROVINSI, Wilayah  # noqa: E402

MENTAH = os.path.join(AKAR, "data/raw/kawasan")
INDEKS = os.path.join(AKAR, "public/data/kawasan_cari.json")
BATAS = os.path.join(AKAR, "public/data/kawasan_cari.geojson")
SERVER = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
UA = {"User-Agent": "PantauBencana/1.0 (centurisk97.id)"}
BBOX = "-11.5,94,6.5,141.5"
TOL = 0.001            # derajat Douglas-Peucker (~110 m)
RADIUS_GUNUNG = 10     # km
JENIS = [("tn", r"^(Taman Nasional|TN )|National Park$"), ("tahura", r"^(Taman Hutan Raya|Tahura)\b"), ("sm", r"^Suaka Margasatwa\b"),
         ("ca", r"^Cagar Alam\b"), ("twa", r"^Taman Wisata Alam\b"), ("tb", r"^Taman Buru\b")]
DANAU = ["Toba", "Singkarak", "Maninjau", "Kerinci", "Ranau", "Sentani", "Poso", "Tempe", "Matano", "Towuti", "Limboto", "Tondano",
         "Batur", "Rawa Pening", "Sentarum", "Jempang", "Paniai", "Laut Tawar", "Diatas", "Dibawah", "Lindu", "Sidenreng"]
METRO = {
    "Jabodetabek": [("31", "*"), ("32", "Bogor"), ("32", "Kota Bogor"), ("32", "Kota Depok"), ("36", "Tangerang"), ("36", "Kota Tangerang"),
                    ("36", "Kota Tangerang Selatan"), ("32", "Bekasi"), ("32", "Kota Bekasi")],
    "Bandung Raya": [("32", "Bandung"), ("32", "Kota Bandung"), ("32", "Bandung Barat"), ("32", "Kota Cimahi"), ("32", "Sumedang")],
    "Gerbangkertosusila": [("35", "Gresik"), ("35", "Bangkalan"), ("35", "Mojokerto"), ("35", "Kota Mojokerto"), ("35", "Kota Surabaya"),
                           ("35", "Sidoarjo"), ("35", "Lamongan")],
    "Kedungsepur": [("33", "Kendal"), ("33", "Demak"), ("33", "Semarang"), ("33", "Kota Semarang"), ("33", "Kota Salatiga"), ("33", "Grobogan")],
    "Mebidangro": [("12", "Kota Medan"), ("12", "Kota Binjai"), ("12", "Deli Serdang"), ("12", "Karo")],
    "Mamminasata": [("73", "Kota Makassar"), ("73", "Maros"), ("73", "Gowa"), ("73", "Takalar")],
    "Sarbagita": [("51", "Kota Denpasar"), ("51", "Badung"), ("51", "Gianyar"), ("51", "Tabanan")],
    "Patungraya Agung": [("16", "Kota Palembang"), ("16", "Banyuasin"), ("16", "Ogan Ilir"), ("16", "Ogan Komering Ilir")],
    "Banjarbakula": [("63", "Kota Banjarmasin"), ("63", "Kota Banjarbaru"), ("63", "Banjar"), ("63", "Barito Kuala"), ("63", "Tanah Laut")],
}


def overpass(q, nama):
    os.makedirs(MENTAH, exist_ok=True)
    p = os.path.join(MENTAH, nama)
    if os.path.exists(p):
        return json.load(open(p))
    data = urllib.parse.urlencode({"data": q}).encode()
    for coba in range(8):
        try:
            r = urllib.request.urlopen(urllib.request.Request(SERVER[coba % len(SERVER)], data=data, headers=UA), timeout=300).read()
            d = json.loads(r)
            json.dump(d, open(p, "w"))
            return d
        except Exception as e:  # 429/504 publik sering
            print("overpass", coba, e, file=sys.stderr)
            time.sleep(10 * (coba + 1))
    raise SystemExit("Overpass gagal 8x: " + nama)


# ---------------------------------------------------------------- geometri
def dp(pts, tol):
    """Douglas-Peucker iteratif (titik ujung dipertahankan)."""
    if len(pts) < 5:
        return pts
    simpan, tumpuk = {0, len(pts) - 1}, [(0, len(pts) - 1)]
    while tumpuk:
        a, b = tumpuk.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy) or 1e-12
        i, dm = None, tol
        for k in range(a + 1, b):
            d = abs(dy * (pts[k][0] - x1) - dx * (pts[k][1] - y1)) / L if (dx or dy) else math.hypot(pts[k][0] - x1, pts[k][1] - y1)
            if d > dm:
                i, dm = k, d
        if i is not None:
            simpan.add(i)
            tumpuk += [(a, i), (i, b)]
    return [pts[k] for k in sorted(simpan)]


def rakit(garis):
    """Sambung potongan way (daftar titik) jadi cincin tertutup; potongan yang tak menutup dibuang."""
    garis = [g[:] for g in garis if len(g) >= 2]
    cincin = []
    while garis:
        r = garis.pop()
        while r[0] != r[-1]:
            for k, g in enumerate(garis):
                if g[0] == r[-1]:
                    r += g[1:]
                elif g[-1] == r[-1]:
                    r += g[-2::-1]
                elif g[-1] == r[0]:
                    r = g[:-1] + r
                elif g[0] == r[0]:
                    r = g[:0:-1] + r
                else:
                    continue
                garis.pop(k)
                break
            else:
                break
        if r[0] == r[-1] and len(r) >= 4:
            cincin.append(r)
    return cincin


def dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
            c = not c
        j = i
    return c


def luas(r):
    return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2


def geom_el(el):
    """Elemen Overpass (out geom) -> MultiPolygon coordinates (lubang dipasang ke cincin luar yang memuatnya) atau None."""
    pt = lambda gs: [(round(g["lon"], 5), round(g["lat"], 5)) for g in gs]
    if el["type"] == "way":
        luar, dlm = rakit([pt(el.get("geometry", []))]), []
    else:
        m = [x for x in el.get("members", []) if x["type"] == "way" and x.get("geometry")]
        luar = rakit([pt(x["geometry"]) for x in m if x.get("role") != "inner"])
        dlm = rakit([pt(x["geometry"]) for x in m if x.get("role") == "inner"])
    out = []
    for r in sorted(luar, key=luas, reverse=True):
        s = dp(r, TOL)
        if len(s) >= 4 and luas(s) > 1e-7:
            out.append([s])
    for r in dlm:
        s = dp(r, TOL)
        if len(s) < 4:
            continue
        for p in out:
            if dalam(s[0][0], s[0][1], p[0]):
                p.append(s)
                break
    return [[[[round(x, 4), round(y, 4)] for x, y in r] for r in p] for p in out] or None


def bbox(mp):
    xs = [c[0] for p in mp for c in p[0]]
    ys = [c[1] for p in mp for c in p[0]]
    return [math.floor(min(xs) * 100) / 100, math.floor(min(ys) * 100) / 100, math.ceil(max(xs) * 100) / 100, math.ceil(max(ys) * 100) / 100]


def prov_wakil(mp, w):
    """Kode provinsi tempat bagian terbesar kawasan berada: sampel kisi di poligon terbesar; None = di luar Indonesia."""
    r = mp[0][0]
    xs, ys = [c[0] for c in r], [c[1] for c in r]
    hit = {}
    for i in range(1, 8):
        for j in range(1, 8):
            x, y = min(xs) + (max(xs) - min(xs)) * i / 8, min(ys) + (max(ys) - min(ys)) * j / 8
            if dalam(x, y, r) and (a := w.cari(x, y)):
                hit[a[0]] = hit.get(a[0], 0) + 1
    if not hit:  # pulau kecil / poligon tipis: titik-titik cincin
        for x, y in r[::max(1, len(r) // 40)]:
            if a := w.cari(x, y):
                hit[a[0]] = hit.get(a[0], 0) + 1
    return max(hit, key=hit.get) if hit else None


def rapi(n):
    """Nama tampilan: OSM kadang menulis 'X National Park' tanpa nama Indonesia."""
    n = " ".join(n.split())
    m = re.match(r"^(.*) National Park$", n)
    return "Taman Nasional " + m.group(1) if m and not n.startswith("Taman") else n


# ---------------------------------------------------------------- bangun
def bangun():
    w = Wilayah()
    tag = overpass(f'[out:json][timeout:250][bbox:{BBOX}];(nwr["boundary"="national_park"];relation["boundary"="protected_area"]["name"];'
                   f'way["boundary"="protected_area"]["name"];relation["leisure"="nature_reserve"]["name"];way["leisure"="nature_reserve"]["name"];);out tags;', "tag.json")
    pilih = {}
    for el in tag["elements"]:
        if el["type"] == "node":
            continue
        n = rapi(el["tags"].get("name", ""))
        t = next((t for t, rx in JENIS if re.search(rx, n, re.I)), None)
        if t:
            pilih[(el["type"], el["id"])] = (t, n)
    rel = ",".join(str(i) for (ty, i) in pilih if ty == "relation")
    way = ",".join(str(i) for (ty, i) in pilih if ty == "way")
    geo = overpass(f"[out:json][timeout:280];(relation(id:{rel});way(id:{way}););out geom;", "geom.json")
    nd = "|".join(DANAU)
    dn = overpass(f'[out:json][timeout:200][bbox:{BBOX}];(relation["natural"="water"]["name"~"^Danau ({nd})$"];way["natural"="water"]["name"~"^Danau ({nd})$"];);out geom;', "danau.json")
    for el in dn["elements"]:
        pilih[(el["type"], el["id"])] = ("danau", " ".join(el["tags"]["name"].split()))

    fitur, item, lihat = [], [], {}
    for el in geo["elements"] + dn["elements"]:
        key = (el["type"], el["id"])
        if key not in pilih:
            continue
        t, n = pilih[key]
        mp = geom_el(el)
        if not mp:
            print("tanpa geometri:", key, n, file=sys.stderr)
            continue
        p = prov_wakil(mp, w)
        if not p:
            continue  # Malaysia, Australia, Timor-Leste, PNG
        i = f"osm:{el['type'][0]}{el['id']}"
        b = bbox(mp)
        ha = None
        # nama sama (kawasan terpecah jadi beberapa way/relasi): gabung jadi satu item
        k = (t, n.lower())
        if k in lihat:
            f = lihat[k]
            f["geometry"]["coordinates"] += mp
            it = next(x for x in item if x["id"] == f["properties"]["id"])
            it["b"] = bbox(f["geometry"]["coordinates"])
            it["sb"] += f", {el['type']} {el['id']}"
            continue
        f = {"type": "Feature", "properties": {"id": i}, "geometry": {"type": "MultiPolygon", "coordinates": mp}}
        lihat[k] = f
        fitur.append(f)
        item.append({"t": t, "n": n, "p": p, "b": b, "id": i, "sb": f"OpenStreetMap (ODbL) {el['type']} {el['id']}"})

    gn = json.load(open(os.path.join(AKAR, "public/gunungapi/data/gunung.json")))
    kp = {v: k for k, v in PROVINSI.items()}
    for nama, g in sorted(gn.items()):
        a = w.cari(g["lon"], g["lat"])
        p = a[0] if a else kp.get(g["prov"])
        dl, dlo = RADIUS_GUNUNG / 111.2, RADIUS_GUNUNG / (111.2 * math.cos(math.radians(g["lat"])))
        item.append({"t": "gunung", "n": "Gunung " + nama if not nama.lower().startswith(("gunung", "anak")) else nama, "p": p, "id": "gunung:" + nama,
                     "c": [g["lon"], g["lat"]], "r": RADIUS_GUNUNG,
                     "b": [round(g["lon"] - dlo, 2), round(g["lat"] - dl, 2), round(g["lon"] + dlo, 2), round(g["lat"] + dl, 2)],
                     "sb": f"Katalog gunung api MAGMA/PVMBG; lingkaran {RADIUS_GUNUNG} km dari puncak (bukan KRB)"})

    for nama, daftar in METRO.items():
        kab = []
        for p, k in daftar:
            fs = json.load(open(os.path.join(AKAR, f"public/geo/kabupaten/{p}.json")))["features"]
            ada = [f for f in fs if k == "*" or f["properties"]["kab"] == k]
            assert ada, f"{nama}: kab {p}|{k} tak ada di public/geo/kabupaten"
            for f in ada:
                if k == "*" and "Seribu" in f["properties"]["kab"]:
                    continue
                kab.append((p, f))
        mp = [po for _, f in kab for po in (f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiPolygon" else [f["geometry"]["coordinates"]])]
        item.append({"t": "metro", "n": nama, "p": kab[0][0], "id": "metro:" + nama, "b": bbox(mp), "kab": [f"{p}|{f['properties']['kab']}" for p, f in kab],
                     "sb": "Gabungan batas kab/kota (public/geo/kabupaten): " + ", ".join(f["properties"]["kab"] for _, f in kab)})

    khg = json.load(open(os.path.join(AKAR, "public/data/lahan/khg.geojson")))
    for f in khg["features"]:
        pr = f["properties"]
        g = f["geometry"]
        mp = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        item.append({"t": "khg", "n": pr["nama"], "p": pr["kode"].split(".")[1][:2], "id": "khg:" + pr["kode"], "b": bbox(mp),
                     "sb": "BRGM PRIMS, lapisan KHG (" + pr["kode"] + ")"})

    json.dump({"type": "FeatureCollection", "sumber": "OpenStreetMap (ODbL), (c) kontributor OpenStreetMap; batas digitasi, bukan SK penetapan",
               "features": fitur}, open(BATAS, "w"), separators=(",", ":"))
    json.dump({"dibuat": time.strftime("%Y-%m-%d"), "item": item}, open(INDEKS, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(item)} item, {len(fitur)} batas OSM, {os.path.getsize(BATAS) // 1024} KB")


def uji():
    d = json.load(open(INDEKS))
    g = json.load(open(BATAS))
    ids = {f["properties"]["id"] for f in g["features"]}
    jumlah = {}
    for i in d["item"]:
        jumlah[i["t"]] = jumlah.get(i["t"], 0) + 1
        assert i["p"] in PROVINSI, f"{i['n']}: provinsi {i['p']} bukan kode BPS"
        assert i["sb"], f"{i['n']}: sumber batas kosong"
        b = i["b"]
        assert 94 <= b[0] < b[2] <= 141.5 and -11.5 <= b[1] < b[3] <= 6.5, f"{i['n']}: bbox {b} di luar Indonesia"
        if i["id"].startswith("osm:"):
            assert i["id"] in ids, f"{i['n']}: poligon {i['id']} tidak ada di kawasan_cari.geojson"
    nama = {i["n"] for i in d["item"]}
    for wajib in ["Taman Nasional Way Kambas", "Taman Nasional Berbak", "Taman Nasional Tanjung Puting", "Taman Nasional Sebangau",
                  "Taman Nasional Tesso Nilo", "Taman Nasional Bromo Tengger Semeru", "Gunung Bromo", "Gunung Semeru", "Gunung Batur",
                  "Danau Toba", "Jabodetabek"]:
        assert wajib in nama, f"'{wajib}' hilang dari indeks kawasan"
    # Way Kambas (relasi 7757736) memuat Labuhan Ratu, Lampung Timur; bukan Jakarta
    wk = next(f for f in g["features"] if f["properties"]["id"] == "osm:r7757736")
    assert any(dalam(105.78, -5.0, p[0]) for p in wk["geometry"]["coordinates"]), "Way Kambas tidak memuat 105,78 BT 5,0 LS"
    assert dp([(0, 0), (1, 0.0001), (2, 0), (3, 5), (4, 0)], 0.01) == [(0, 0), (2, 0), (3, 5), (4, 0)]
    assert rakit([[(0, 0), (1, 0)], [(1, 1), (1, 0)], [(1, 1), (0, 0)]])[0][0] == rakit([[(0, 0), (1, 0)], [(1, 1), (1, 0)], [(1, 1), (0, 0)]])[0][-1]
    print("uji kawasan_cari OK", jumlah)


if __name__ == "__main__":
    if "--uji" not in sys.argv:
        bangun()
    uji()
