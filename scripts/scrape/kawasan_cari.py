"""Kawasan bernama untuk kotak cari peta -> public/data/kawasan_cari.json (indeks) + public/data/kawasan_cari.geojson (batas OSM).

Kategori dan sumber batasnya (dicatat per item di "sb", ditampilkan kartu):
- tn / tahura / sm / ca / twa / tb (taman nasional, taman hutan raya, suaka margasatwa, cagar alam, taman wisata alam, taman buru):
  OpenStreetMap (ODbL) lewat Overpass: boundary=national_park|protected_area atau leisure=nature_reserve, nama berawalan jenis kawasannya.
  Batas OSM = digitasi kontributor, BUKAN SK penetapan Kemenhut; disederhanakan ~100 m.
- danau: OSM natural=water untuk DANAU (daftar tetap di bawah).
- gunung: katalog gunung api MAGMA/PVMBG (public/gunungapi/data/gunung.json), kawasan = lingkaran RADIUS_GUNUNG km dari puncak (bukan KRB).
- metro: gabungan kab/kota (public/geo/kabupaten, METRO di bawah); poligonnya dirakit layar dari batas kab/kota yang sudah ada.
- hl / hp (hutan lindung, hutan produksi termasuk HPT/HPK): OSM (ODbL), nama berawalan "Hutan Lindung|HL " / "Hutan Produksi|HP|HPT|HPK".
  Nama polos "Hutan Lindung" (separuh lebih elemen OSM) diberi lokasi: "Hutan Lindung (kab/kota)". Dataset kawasan hutan KLHK di GFW
  (idn_forest_area) dan PRIMS (kawasan_hutan) hampir tak bernama (nama_obj "-") dan lisensinya tak jelas, jadi TIDAK dipakai.
- sungai: OSM relasi waterway sungai bernama, >= SUNGAI_MIN_KM per (nama, provinsi); poligon = KORIDOR SUNGAI_LEBAR km kiri-kanan garis sungai
  (garis disederhanakan ~450 m), bukan batas DAS atau sempadan resmi.
- restorasi: BRGM PRIMS lapisan target_restorasi (target=TARGET), digabung per KHG x kabupaten; atribut tak diubah, geometri disederhanakan.
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
SUNGAI_MIN_KM = 50     # panjang minimum per (nama, provinsi)
SUNGAI_LEBAR = 2       # km kiri dan kanan garis sungai
TOL_SUNGAI = 0.004     # derajat (~450 m)
MIN_HUTAN = 2e-5       # derajat persegi (~25 ha): serpihan OSM lebih kecil dibuang
NAMA_HUTAN = r"^(Kawasan )?(Hutan Lindung|Hutan Produksi|HL|HP|HPT|HPK)\b"
BUANG_HUTAN = r"vihara|training|dragon|farm|\b(HL|HP) \d$"
KATA_SUNGAI = r"^(Sungai|Kali|Batang|Way|Krueng|Air|Ci|Sei|Bengawan|Kuala|Tukad|Aek|Lau|Wai|Banjir Kanal|Alur)\b"
Q_HUTAN = (f'[out:json][timeout:250][bbox:{BBOX}];(relation["name"~"^(Hutan Lindung|Hutan Produksi|Hutan Produksi Terbatas|HL |HP |HPT |HPK |Kawasan Hutan Lindung|Kawasan Hutan Produksi)",i];'
           'way["name"~"^(Hutan Lindung|Hutan Produksi|HL |HP |HPT |HPK |Kawasan Hutan Lindung|Kawasan Hutan Produksi)",i][!"highway"][!"building"];);out tags;')
Q_SUNGAI = f'[out:json][timeout:280][bbox:{BBOX}];(relation["waterway"="river"]["name"];relation["type"="waterway"]["name"];);out geom;'
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


TARGET = ("https://prims.brgm.go.id/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=prims:target_restorasi"
          "&outputFormat=application/json&srsName=EPSG:4326&sortBy=gid&count=250&startIndex={s}")


def prims_target():
    """Semua poligon prims:target_restorasi (18.659), per 250 fitur dan di-cache; unduhan utuh sering terpotong."""
    os.makedirs(MENTAH, exist_ok=True)
    out, s = [], 0
    while True:
        p = os.path.join(MENTAH, f"target_restorasi_{s}.json")
        if not os.path.exists(p):
            for coba in range(5):
                try:
                    r = urllib.request.urlopen(urllib.request.Request(TARGET.format(s=s), headers=UA), timeout=180).read()
                    json.loads(r)
                    open(p, "wb").write(r)
                    break
                except Exception as e:
                    print("prims", s, coba, e, file=sys.stderr)
                    time.sleep(5 * (coba + 1))
            else:
                raise SystemExit(f"PRIMS target_restorasi gagal di {s}")
        fs = json.load(open(p))["features"]
        out += fs
        if len(fs) < 250:
            return out
        s += 250


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


# ---------------------------------------------------------------- hutan lindung / produksi, sungai, restorasi
def jenis_hutan(n):
    """(t, nama baku) untuk nama OSM hutan lindung/produksi; None kalau bukan atau serpihan iseng."""
    if not re.search(NAMA_HUTAN, n, re.I) or re.search(BUANG_HUTAN, n, re.I):
        return None
    n = re.sub(r"^Kawasan ", "", n, flags=re.I)
    n = re.sub(r"^hutan lindung", "Hutan Lindung", n, flags=re.I)
    n = re.sub(r"^hutan produksi", "Hutan Produksi", n, flags=re.I)
    for k, v in (("HL", "Hutan Lindung"), ("HPT", "Hutan Produksi Terbatas"), ("HPK", "Hutan Produksi Konversi"), ("HP", "Hutan Produksi")):
        n = re.sub(rf"^{k}\b", v, n)
    return ("hl" if n.startswith("Hutan Lindung") else "hp"), n


def luas_mp(mp):
    return sum(luas(p[0]) for p in mp)


def titik_dalam(mp):
    """Satu titik di dalam poligon terbesar (sampel kisi dekat pusat), untuk memberi nama lokasi."""
    r = mp[0][0]
    xs, ys = [c[0] for c in r], [c[1] for c in r]
    for f in (0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8):
        for g in (0.5, 0.4, 0.6, 0.3, 0.7):
            x, y = min(xs) + (max(xs) - min(xs)) * f, min(ys) + (max(ys) - min(ys)) * g
            if dalam(x, y, r):
                return x, y
    return r[0]


def kerja_hutan(w):
    """-> {(t, nama): [mp, ...]} dari OSM; elemen tanpa geometri atau di luar Indonesia dibuang."""
    tag = overpass(Q_HUTAN, "hlhp_tag.json")
    pilih = {(e["type"], e["id"]): jenis_hutan(" ".join(e["tags"]["name"].split())) for e in tag["elements"]}
    pilih = {k: v for k, v in pilih.items() if v}
    rel = ",".join(str(i) for (ty, i) in pilih if ty == "relation")
    way = ",".join(str(i) for (ty, i) in pilih if ty == "way")
    geo = overpass(f"[out:json][timeout:280];(relation(id:{rel});way(id:{way}););out geom;", "hlhp_geom.json")
    hasil = {}
    for el in geo["elements"]:
        t, n = pilih[(el["type"], el["id"])]
        mp = geom_el(el)
        if not mp or luas_mp(mp) < MIN_HUTAN:
            continue
        x, y = titik_dalam(mp)
        a = w.cari(x, y)
        if not a:
            continue  # luar negeri / laut
        if n in ("Hutan Lindung", "Hutan Produksi"):
            n = f"{n} ({a[1]})"  # nama polos tak bisa dicari; kab/kota membedakan
        hasil.setdefault((t, n), []).append((f"{el['type'][0]}{el['id']}", mp))
    return hasil


def garis_sungai(el):
    """Relasi sungai -> daftar rantai titik (way anggota utama disambung ujung ke ujung)."""
    ways = [[(round(g["lon"], 5), round(g["lat"], 5)) for g in m["geometry"]] for m in el.get("members", [])
            if m["type"] == "way" and m.get("geometry") and m.get("role", "") in ("", "main_stream")]
    rantai = []
    for g in ways:
        for r in rantai:
            if r[-1] == g[0]:
                r += g[1:]
            elif r[-1] == g[-1]:
                r += g[-2::-1]
            elif r[0] == g[-1]:
                r[:0] = g[:-1]
            elif r[0] == g[0]:
                r[:0] = g[:0:-1]
            else:
                continue
            break
        else:
            rantai.append(g[:])
    return [r for r in rantai if len(r) >= 2]


def km(a, b):
    return math.hypot((b[0] - a[0]) * 111.32 * math.cos(math.radians((a[1] + b[1]) / 2)), (b[1] - a[1]) * 110.57)


def potong(garis):
    """Pecah garis di tikungan > 60 derajat dan tiap <= 30 titik, supaya koridor tiap potongan tak melipat diri."""
    out, cur = [], [garis[0]]
    for i in range(1, len(garis)):
        cur.append(garis[i])
        if i < len(garis) - 1:
            a1 = math.atan2(garis[i][1] - garis[i - 1][1], (garis[i][0] - garis[i - 1][0]) * math.cos(math.radians(garis[i][1])))
            a2 = math.atan2(garis[i + 1][1] - garis[i][1], (garis[i + 1][0] - garis[i][0]) * math.cos(math.radians(garis[i][1])))
            if abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi) > math.pi / 3 or len(cur) >= 30:
                out.append(cur)
                cur = [garis[i]]
    out.append(cur)
    return [c for c in out if len(c) >= 2]


def silang(a, b, c, d):
    o = lambda p, q, r: (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return o(a, b, c) * o(a, b, d) < 0 and o(c, d, a) * o(c, d, b) < 0


def sederhana(r):
    n = len(r) - 1
    return not any(silang(r[i], r[i + 1], r[j], r[j + 1]) for i in range(n) for j in range(i + 2, n) if not (i == 0 and j == n - 1))


def koridor(pot, lebar=SUNGAI_LEBAR):
    """Potongan garis -> daftar cincin (satu poligon offset kiri-kanan; kalau melipat: persegi panjang per ruas)."""
    lat0 = sum(p[1] for p in pot) / len(pot)
    kx, ky = 111.32 * math.cos(math.radians(lat0)), 110.57
    P = [(x * kx, y * ky) for x, y in pot]
    N = []
    for i in range(len(P) - 1):
        dx, dy = P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]
        L = math.hypot(dx, dy) or 1e-9
        N.append((-dy / L, dx / L))
    kiri, kanan = [], []
    for i, p in enumerate(P):
        a, b = N[max(i - 1, 0)], N[min(i, len(N) - 1)]
        mx, my = a[0] + b[0], a[1] + b[1]
        m = math.hypot(mx, my) or 1
        mx, my = mx / m, my / m
        sk = lebar / max(0.6, mx * b[0] + my * b[1])
        kiri.append((p[0] + mx * sk, p[1] + my * sk))
        kanan.append((p[0] - mx * sk, p[1] - my * sk))
    back = lambda q: [round(q[0] / kx, 4), round(q[1] / ky, 4)]
    r = [back(q) for q in kiri + kanan[::-1]]
    r.append(r[0])
    if sederhana(r):
        return [r]
    out = []
    for i in range(len(P) - 1):
        out.append([back((P[j][0] + s * N[i][0] * lebar, P[j][1] + s * N[i][1] * lebar)) for j, s in ((i, 1), (i + 1, 1), (i + 1, -1), (i, -1), (i, 1))])
    return out


def kerja_sungai(w):
    """-> {(nama, prov): (km, id relasi pertama, [poligon])}; sungai >= SUNGAI_MIN_KM per (nama, provinsi)."""
    d = overpass(Q_SUNGAI, "sungai.json")
    grup = {}
    for el in d["elements"]:
        if el["tags"].get("waterway") in ("stream", "canal", "ditch", "drain"):
            continue
        n = re.sub(r" River$", "", " ".join(el["tags"]["name"].split()), flags=re.I)
        if re.search(r"\bDAS\b|^(Sungai )?\w$", n):
            continue  # "Sungai A", "Sungai 2 DAS": label kerja kontributor
        n = n[0].upper() + n[1:] if n[0].islower() else n
        n = re.sub(r"^(Sungai|Kali) ([a-z])", lambda m: m[1] + " " + m[2].upper(), n)
        if not re.search(KATA_SUNGAI, n):
            n = "Sungai " + n
        for g in garis_sungai(el):
            g = dp(g, TOL_SUNGAI)
            for pot in potong(g):
                mid = pot[len(pot) // 2]
                a = w.cari(*mid)
                if not a:
                    continue
                e = grup.setdefault((n.lower(), a[0]), {"n": n, "km": 0, "id": el["id"], "po": []})
                e["km"] += sum(km(pot[i], pot[i + 1]) for i in range(len(pot) - 1))
                e["po"] += [[r] for r in koridor(pot)]
    return {k: v for k, v in grup.items() if v["km"] >= SUNGAI_MIN_KM}


def kerja_restorasi(w):
    grup = {}
    for f in prims_target():
        pr = f["properties"]
        if pr.get("target") != "TARGET":
            continue
        g = grup.setdefault((pr["kode_khg"], pr["kabupaten"]), {"pr": pr, "mp": [], "ha": 0, "th": set(), "n": 0})
        g["ha"] += pr["luas_ha_1"] or 0
        g["th"].add(pr["sasaran"])
        g["n"] += 1
        for po in f["geometry"]["coordinates"]:
            r = dp([tuple(c) for c in po[0]], 0.002)
            if len(r) >= 4 and luas(r) >= MIN_HUTAN:
                g["mp"].append([[[round(x, 4), round(y, 4)] for x, y in r]])
    return {k: v for k, v in grup.items() if v["mp"]}


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

    for (t, n), daftar in sorted(kerja_hutan(w).items()):
        mp = [po for _, m in daftar for po in m]
        i = "osm:" + daftar[0][0]
        fitur.append({"type": "Feature", "properties": {"id": i}, "geometry": {"type": "MultiPolygon", "coordinates": mp}})
        item.append({"t": t, "n": n, "p": prov_wakil(mp, w), "b": bbox(mp), "id": i,
                     "sb": "OpenStreetMap (ODbL) " + ", ".join(("relation " if x[0] == "r" else "way ") + x[1:] for x, _ in daftar[:6]) + (f" +{len(daftar) - 6}" if len(daftar) > 6 else "")
                           + "; batas digitasi, bukan SK penetapan"})

    for (_, p), e in sorted(kerja_sungai(w).items(), key=lambda x: x[1]["n"]):
        i = f"osm:r{e['id']}-{p}"
        fitur.append({"type": "Feature", "properties": {"id": i}, "geometry": {"type": "MultiPolygon", "coordinates": e["po"]}})
        item.append({"t": "sungai", "n": e["n"], "p": p, "b": bbox(e["po"]), "id": i,
                     "sb": f"koridor {SUNGAI_LEBAR} km kiri-kanan sungai, OSM (ODbL) relasi {e['id']}; sekitar {round(e['km'])} km di provinsi ini, bukan batas DAS"})

    for (kode, kab), g in sorted(kerja_restorasi(w).items()):
        pr = g["pr"]
        i = f"restorasi:{kode}|{kab}"
        fitur.append({"type": "Feature", "properties": {"id": i}, "geometry": {"type": "MultiPolygon", "coordinates": g["mp"]}})
        th = sorted(g["th"])
        item.append({"t": "restorasi", "n": f"Target restorasi {pr['nama_khg']}, {kab.title().replace('Kab. ', 'Kab. ')}",
                     "p": prov_wakil(g["mp"], w) or kode.split(".")[1][:2], "b": bbox(g["mp"]), "id": i,
                     "sb": f"BRGM PRIMS, lapisan target_restorasi ({kode}; {g['n']} poligon, sasaran {th[0]}-{th[-1]}, {round(g['ha'])} ha)"})

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

    json.dump({"type": "FeatureCollection", "sumber": "OpenStreetMap (ODbL), (c) kontributor OpenStreetMap; batas digitasi, bukan SK penetapan. Target restorasi: BRGM PRIMS (nonkomersial, tautan ke wali data)",
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
    # jenis baru: tiap jenis ada, id unik, koridor sungai benar-benar memuat titik di sungai
    for t in ("hl", "hp", "sungai", "restorasi"):
        assert jumlah.get(t, 0) >= 1, f"jenis '{t}' kosong di indeks kawasan"
    assert len(d["item"]) == len({i["id"] for i in d["item"]}), "id item kembar di indeks kawasan"
    assert {f["properties"]["id"] for f in g["features"]} <= {i["id"] for i in d["item"]}, "poligon yatim di kawasan_cari.geojson (tanpa item)"
    poli = {f["properties"]["id"]: f["geometry"]["coordinates"] for f in g["features"]}
    isi = lambda i, x, y: any(dalam(x, y, p[0]) and not any(dalam(x, y, h) for h in p[1:]) for p in poli[i["id"]])
    for jenis, nm, prov, x, y in [("sungai", "Sungai Kapuas", "61", 111.4922, 0.0798),   # simpul OSM di Sintang
                                  ("sungai", "Sungai Musi", "16", 104.7682, -2.9879)]:  # simpul OSM di Palembang
        it = next((i for i in d["item"] if i["t"] == jenis and i["n"] == nm and i["p"] == prov), None)
        assert it, f"{nm} (prov {prov}) tidak ada di indeks kawasan"
        assert isi(it, x, y), f"koridor {nm} tidak memuat titik sungai {x},{y}"
    for i in d["item"]:
        if i["t"] == "sungai":
            assert "koridor" in i["sb"] and "OSM" in i["sb"], f"{i['n']}: sb sungai harus menyebut koridor dan OSM"
        if i["t"] == "restorasi":
            assert "PRIMS" in i["sb"], f"{i['n']}: sb restorasi harus menyebut PRIMS"
    assert dp([(0, 0), (1, 0.0001), (2, 0), (3, 5), (4, 0)], 0.01) == [(0, 0), (2, 0), (3, 5), (4, 0)]
    assert jenis_hutan("HPT Air Ipuh II") == ("hp", "Hutan Produksi Terbatas Air Ipuh II") and jenis_hutan("Kawasan Hutan Lindung X") == ("hl", "Hutan Lindung X")
    assert jenis_hutan("HP training") is None and jenis_hutan("Hutan Lindung Vihara") is None
    kor = koridor([(110.0, 0.0), (110.1, 0.0)])[0]  # 2 km kiri-kanan di khatulistiwa = +-0,018 BT/LS
    assert dalam(110.05, 0.015, kor) and not dalam(110.05, 0.025, kor), "lebar koridor bukan 2 km"
    assert rakit([[(0, 0), (1, 0)], [(1, 1), (1, 0)], [(1, 1), (0, 0)]])[0][0] == rakit([[(0, 0), (1, 0)], [(1, 1), (1, 0)], [(1, 1), (0, 0)]])[0][-1]
    print("uji kawasan_cari OK", jumlah)


if __name__ == "__main__":
    if "--uji" not in sys.argv:
        bangun()
    uji()
