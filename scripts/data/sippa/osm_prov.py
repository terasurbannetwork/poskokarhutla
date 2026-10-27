#!/usr/bin/env python3
"""SIPPA SP-108 + SP-109: jarak kompleks api ke jalan dan air OSM per provinsi gambut (Overpass, ubin 0,5 derajat, tepi 0,15).

Pakai:
  python3 osm_prov.py tarik 62 16       # unduh ubin (bisa dilanjut; berkas yang sudah ada dilewati)
  python3 osm_prov.py jarak 62 16       # hitung -> data/kajian-bnpb/pipa/data/osm_jarak.csv (62) | osm_jarak_<prov>.csv (lain)
  python3 osm_prov.py uji               # self-check (tanpa jaringan)
Mode tarik: prov 62 = "tambah" (hanya relasi multipoligon air, garis pantai, air payau; jalan dan way air lama dari osm_jarak.csv DIPERTAHANKAN
  supaya angka buku Kalteng hanya berubah karena SP-108). prov lain = "penuh" (jalan + semua air + relasi + pantai).
Mentah: data/raw/pipa/osm_<prov>/ubin_*.json (gitignore). ODbL (c) kontributor OpenStreetMap. Python 3.12 stdlib.

Kelas air: TAWAR = waterway river/canal/stream/ditch/drain + tepi natural=water/landuse=reservoir (way DAN relasi multipoligon) tanpa tanda asin.
  ASIN = natural=coastline (laut) + natural=water dengan salt=yes, brackish=yes, atau water=lagoon (payau).
  Zona A-D memakai air tawar (air_semua_km). air_asin_* dihitung terpisah; air_asin=1 bila air asin lebih dekat daripada air tawar.
Jarak garis lurus ke titik terpadat (<= 150 m) pada garis OSM, dibatasi 16 km (kolom *_terpotong). Keyakinan: terverifikasi (data OSM), bukan survei.
"""
import csv, glob, json, math, os, sys, time
import urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PUB = os.path.join(AKAR, "public", "data")
OUT = os.path.join(AKAR, "data", "kajian-bnpb", "pipa", "data")
RAW = os.path.join(AKAR, "data", "raw", "pipa")
OVP = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
PAD, UBIN, CAP, RAPAT = 0.15, 0.5, 16.0, 0.15
JALAN_RE = ("motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|track|path|motorway_link|trunk_link|"
            "primary_link|secondary_link|tertiary_link|living_street")
KEND = {"motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "service", "track",
        "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link", "living_street"}
UTAMA = {"motorway", "trunk", "primary", "secondary", "tertiary", "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link"}
JENIS_AIR = {"river": "sungai", "canal": "kanal", "ditch": "parit", "drain": "parit", "stream": "anak_sungai"}
KATEGORI = ("jalan_kend", "jalan_utama", "jalan_setapak", "air_semua", "air_kecil", "air_poligon", "air_asin")
LAT0 = {"62": -1.5}                       # 62 mereproduksi proyeksi pipa_data.py persis; lainnya: rerata lintang kompleks


def asin_jenis(t):
    """Jenis air asin dari tag, atau None. Tanpa tag asin = air tawar."""
    if t.get("natural") == "coastline":
        return "laut"
    if t.get("natural") == "water" or t.get("landuse") == "reservoir":
        if t.get("salt") == "yes" or t.get("brackish") == "yes" or t.get("water") == "lagoon":
            return "payau"
    return None


def klasifikasi(t, relasi=False):
    """tags -> [(kategori, label)]. relasi=True: tepi air dari multipoligon (kategori air_poligon juga, untuk diagnosa SP-108)."""
    h, w, hasil = t.get("highway"), t.get("waterway"), []
    a = asin_jenis(t)
    if a:
        return [("air_asin", a)]
    if h in KEND:
        hasil.append(("jalan_kend", h))
        if h in UTAMA:
            hasil.append(("jalan_utama", h))
    elif h == "path":
        hasil.append(("jalan_setapak", h))
    if w in JENIS_AIR:
        hasil.append(("air_semua", JENIS_AIR[w]))
        if w in ("stream", "ditch", "drain"):
            hasil.append(("air_kecil", JENIS_AIR[w]))
    elif t.get("natural") == "water" or t.get("landuse") == "reservoir":
        hasil.append(("air_semua", "danau_kolam"))
        if relasi:
            hasil.append(("air_poligon", "danau_kolam"))
    return hasil


def garis_elemen(e):
    """element Overpass -> [(id, tags, [geom,...], relasi?)]: way = 1 geom; relasi = geom tiap anggota way (outer dan inner = tepi air)."""
    if e["type"] == "way" and len(e.get("geometry", ())) >= 2:
        return [(("w", e["id"]), e.get("tags", {}), [e["geometry"]], False)]
    if e["type"] == "relation":
        gs = [m["geometry"] for m in e.get("members", ()) if m.get("type") == "way" and len(m.get("geometry", ())) >= 2]
        # ponytail: anggota yang sama muncul di dua relasi dihitung dua kali; tidak mengubah jarak minimum
        return [(("r", e["id"]), e.get("tags", {}), gs, True)] if gs else []
    return []


# ---------- kompleks ----------
def kompleks(prov):
    k = json.load(open(os.path.join(PUB, "kendala.json")))["kompleks"]
    op = {x["id"]: x for x in json.load(open(os.path.join(PUB, "operasi.json")))["kompleks"]}
    return [dict(id=i, kab=v["kab"], lat=op[i]["lat"], lon=op[i]["lon"], air_km_lama=v["air_km"], jalan_km_lama=v["jalan_km"])
            for i, v in sorted(k.items()) if v["prov"] == prov and i in op]


def ubin_prov(komp):
    return sorted({(math.floor(r["lat"] / UBIN), math.floor(r["lon"] / UBIN)) for r in komp})


# ---------- tarik ----------
def kueri(la, lo, mode):
    b = f"({la*UBIN-PAD},{lo*UBIN-PAD},{la*UBIN+UBIN+PAD},{lo*UBIN+UBIN+PAD})"
    air = (f'relation["natural"="water"]{b};relation["landuse"="reservoir"]{b};way["natural"="coastline"]{b};'
           f'way["natural"="water"]["salt"="yes"]{b};way["natural"="water"]["water"="lagoon"]{b};way["natural"="water"]["brackish"="yes"]{b};')
    if mode == "penuh":
        air += (f'way["highway"~"^({JALAN_RE})$"]{b};way["waterway"~"^(stream|ditch|drain|canal|river)$"]{b};'
                f'way["natural"="water"]{b};way["landuse"="reservoir"]{b};')
    return f"[out:json][timeout:240];({air});out tags geom;"


def tarik(prov):
    komp = kompleks(prov)
    mode = "tambah" if prov == "62" else "penuh"
    d = os.path.join(RAW, f"osm_{prov}")
    os.makedirs(d, exist_ok=True)

    def satu(t):
        fn = os.path.join(d, f"ubin_{t[0]}_{t[1]}.json")
        if os.path.exists(fn):
            return t, "ada"
        q, err = kueri(t[0], t[1], mode), ""
        for n in range(6):
            host = OVP[n % len(OVP)]
            try:
                rq = urllib.request.Request(host, urllib.parse.urlencode({"data": q}).encode(),
                                            {"User-Agent": "poskokarhutla-sippa/1.0 (pinkatitan@gmail.com)", "Accept": "*/*"})
                dat = urllib.request.urlopen(rq, timeout=400).read()
                json.loads(dat)
                with open(fn + ".tmp", "wb") as h:
                    h.write(dat)
                os.replace(fn + ".tmp", fn)
                return t, f"{len(dat)//1024} KB"
            except Exception as e:
                err = repr(e)[:120]
                time.sleep(15 * (n + 1))
        return t, "GAGAL " + err

    ub = ubin_prov(komp)
    print(prov, mode, len(ub), "ubin", flush=True)
    with ThreadPoolExecutor(2) as ex:
        for t, st in ex.map(satu, ub):
            print(prov, t, st, flush=True)


# ---------- jarak ----------
class Titik:
    """Indeks grid 2 km untuk titik per kategori; titik di luar jangkauan (> 20 km dari semua kompleks) dibuang."""
    SEL = 2.0

    def __init__(self, qxy):
        self.q = {(math.floor(x / 4), math.floor(y / 4)) for x, y in qxy}
        self.g = {k: {} for k in KATEGORI}
        self.n = {k: 0 for k in KATEGORI}

    def dekat(self, x, y):
        a, b = math.floor(x / 4), math.floor(y / 4)
        return any((a + i, b + j) in self.q for i in range(-5, 6) for j in range(-5, 6))

    def tambah(self, kat, x, y, lab, lat, lon):
        self.g[kat].setdefault((math.floor(x / self.SEL), math.floor(y / self.SEL)), []).append((x, y, lab, lat, lon))
        self.n[kat] += 1

    def terdekat(self, kat, qx, qy):
        g, c = self.g[kat], self.SEL
        if not g:
            return None
        cx, cy = math.floor(qx / c), math.floor(qy / c)
        best, maks = None, math.ceil(CAP / c) + 1
        for r in range(maks + 1):
            sel = [(cx + i, cy + j) for i in range(-r, r + 1) for j in range(-r, r + 1) if max(abs(i), abs(j)) == r] if r else [(cx, cy)]
            for s in sel:
                for p in g.get(s, ()):
                    d = math.hypot(p[0] - qx, p[1] - qy)
                    if best is None or d < best[0]:
                        best = (d, p)
            if best and best[0] <= r * c:
                break
        return best


def padat(g, kx, ky, lat0):
    """geometry Overpass -> titik (x, y, lat, lon) tiap <= RAPAT km."""
    out = []
    for a, b in zip(g, g[1:]):
        dx, dy = (b["lon"] - a["lon"]) * kx, (b["lat"] - a["lat"]) * ky
        n = max(math.ceil(math.hypot(dx, dy) / RAPAT), 1)
        for i in range(n):
            f = i / n
            out.append((a["lat"] + (b["lat"] - a["lat"]) * f, a["lon"] + (b["lon"] - a["lon"]) * f))
    out.append((g[-1]["lat"], g[-1]["lon"]))
    return [((lo - 111.0) * kx, (la - lat0) * ky, la, lo) for la, lo in out]


def muat(prov, qxy, kx, ky, lat0):
    ind, seen = Titik(qxy), set()
    for fn in sorted(glob.glob(os.path.join(RAW, f"osm_{prov}", "ubin_*.json"))):
        for e in json.load(open(fn))["elements"]:
            for eid, t, gs, rel in garis_elemen(e):
                kl = klasifikasi(t, rel)
                if not kl or eid in seen:
                    continue
                seen.add(eid)
                for g in gs:
                    for x, y, pla, plo in padat(g, kx, ky, lat0):
                        if not ind.dekat(x, y):
                            continue
                        for kat, lab in kl:
                            ind.tambah(kat, x, y, lab, pla, plo)
    return ind


def hitung(prov, komp):
    lat0 = LAT0.get(prov, sum(r["lat"] for r in komp) / len(komp))
    kx, ky = 111.32 * math.cos(math.radians(lat0)), 110.57
    qxy = [((r["lon"] - 111.0) * kx, (r["lat"] - lat0) * ky) for r in komp]
    ind = muat(prov, qxy, kx, ky, lat0)
    baris = []
    for r, (qx, qy) in zip(komp, qxy):
        o = dict(id=r["id"], kab=r["kab"], lat=r["lat"], lon=r["lon"], air_km_lama=r["air_km_lama"], jalan_km_lama=r["jalan_km_lama"])
        for kat in KATEGORI:
            b = ind.terdekat(kat, qx, qy)
            d = min(b[0], CAP) if b else CAP
            o[kat + "_km"] = round(d, 2)
            o[kat + "_terpotong"] = int(not b or b[0] > CAP)
            if kat in ("jalan_kend", "air_semua", "jalan_utama", "air_asin"):
                o[kat + "_jenis"] = b[1][2] if b and b[0] <= CAP else ""
                o[kat + "_lat"] = round(b[1][3], 5) if b and b[0] <= CAP else ""
                o[kat + "_lon"] = round(b[1][4], 5) if b and b[0] <= CAP else ""
        baris.append(o)
    return baris, ind.n


def gabung_lama(baru, lama):
    """prov 62: pertahankan kolom jalan dan way air dari osm_jarak.csv lama; air_semua = lebih dekat dari {lama, relasi}; air_asin dari ubin tambahan."""
    hasil = []
    for b in baru:
        o = dict(lama[b["id"]])
        if b["air_poligon_km"] < float(o["air_semua_km"]) and not b["air_poligon_terpotong"]:
            o.update(air_semua_km=b["air_poligon_km"], air_semua_terpotong=0, air_semua_jenis="danau_kolam",
                     air_semua_lat=b["air_semua_lat"], air_semua_lon=b["air_semua_lon"])
        for k in ("air_poligon_km", "air_poligon_terpotong", "air_asin_km", "air_asin_terpotong", "air_asin_jenis", "air_asin_lat", "air_asin_lon"):
            o[k] = b[k]
        hasil.append(o)
    return hasil


def tandai_asin(baris):
    """air_asin = 1 bila air asin (laut/payau) lebih dekat daripada air tawar. Terpotong 16 km di keduanya = 0."""
    for o in baris:
        o["air_asin"] = int(float(o["air_asin_km"]) < float(o["air_semua_km"]))
    return baris


def tulis_csv(nama, baris):
    kol = list(baris[0].keys())
    for o in baris:
        for k in o:
            if k not in kol:
                kol.append(k)
    with open(os.path.join(OUT, nama), "w", newline="") as h:
        w = csv.DictWriter(h, fieldnames=kol)
        w.writeheader()
        w.writerows(baris)


def jarak(prov):
    komp = kompleks(prov)
    baru, n = hitung(prov, komp)
    print(prov, len(komp), "kompleks; titik per kategori", n, flush=True)
    if prov == "62":
        lama = {r["id"]: r for r in csv.DictReader(open(os.path.join(OUT, "osm_jarak.csv")))}
        assert set(lama) == {r["id"] for r in komp}, "osm_jarak.csv lama tak cocok dengan kompleks 62"
        baris = gabung_lama(baru, lama)
        for o in baris:   # kolom lama + baru: urutan kolom lama dipertahankan
            o.setdefault("air_poligon_km", "")
        nama = "osm_jarak.csv"
    else:
        for o in baru:
            for k in [k for k in o if k.startswith("air_poligon")]:
                del o[k]            # diagnosa SP-108 hanya untuk 62; di provinsi lain relasi sudah ikut air_semua
        baris, nama = baru, f"osm_jarak_{prov}.csv"
    tandai_asin(baris)
    tulis_csv(nama, baris)
    print(nama, "ditulis;", sum(o["air_asin"] for o in baris), "kompleks air terdekatnya asin")


# ---------- uji ----------
def uji():
    assert asin_jenis({"natural": "coastline"}) == "laut" and asin_jenis({"natural": "water", "salt": "yes"}) == "payau"
    assert asin_jenis({"natural": "water", "water": "lagoon"}) == "payau" and asin_jenis({"natural": "water"}) is None
    assert klasifikasi({"natural": "water"}, True) == [("air_semua", "danau_kolam"), ("air_poligon", "danau_kolam")]
    assert klasifikasi({"natural": "water", "salt": "yes"}) == [("air_asin", "payau")]
    assert ("jalan_utama", "primary") in klasifikasi({"highway": "primary"}) and klasifikasi({"highway": "footway"}) == []
    g = [{"lat": 0.0, "lon": 111.0}, {"lat": 0.0, "lon": 111.0 + 1 / 111.32}]    # 1 km
    rel = {"type": "relation", "id": 1, "tags": {"natural": "water"}, "members": [{"type": "way", "geometry": g}, {"type": "node"}]}
    assert garis_elemen(rel)[0][3] and len(garis_elemen(rel)[0][2]) == 1
    p = padat(g, 111.32, 110.57, 0.0)
    assert len(p) == 8 and abs(p[-1][0] - 1.0) < 1e-6          # ceil(1/0,15)=7 segmen + titik akhir
    ind = Titik([(0.0, 0.0)])
    for i in range(-30, 31):
        ind.tambah("air_asin", 5.0 + i * 0.1, 0.0, "laut", 0, 0)
    d, pt = ind.terdekat("air_asin", 0.0, 0.0)
    assert abs(d - 2.0) < 1e-9 and pt[2] == "laut", d
    ind.tambah("air_semua", 40.0, 0.0, "x", 0, 0)
    assert ind.terdekat("air_semua", 0.0, 0.0) is None            # di luar jangkauan 16 km: dipotong pemanggil
    assert ind.terdekat("air_poligon", 0.0, 0.0) is None
    baris = tandai_asin([dict(air_asin_km="1.0", air_semua_km="2.0"), dict(air_asin_km="16.0", air_semua_km="16.0"), dict(air_asin_km="3", air_semua_km="1")])
    assert [o["air_asin"] for o in baris] == [1, 0, 0]
    lama = {"K": dict(id="K", air_semua_km="3.0", air_semua_terpotong="0", air_semua_jenis="parit", air_semua_lat="1", air_semua_lon="2")}
    b = dict(id="K", air_poligon_km=1.2, air_poligon_terpotong=0, air_semua_lat=9, air_semua_lon=8, air_asin_km=5.0, air_asin_terpotong=0,
             air_asin_jenis="laut", air_asin_lat=3, air_asin_lon=4)
    o = gabung_lama([b], lama)[0]
    assert o["air_semua_km"] == 1.2 and o["air_semua_jenis"] == "danau_kolam" and o["air_asin_jenis"] == "laut"
    b["air_poligon_km"] = 4.0
    assert gabung_lama([b], lama)[0]["air_semua_km"] == "3.0", "relasi lebih jauh tidak menimpa way lama"
    print("uji osm_prov: lolos")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["tarik"]:
        [tarik(p) for p in a[1:]]
    elif a[:1] == ["jarak"]:
        [jarak(p) for p in a[1:]]
    else:
        sys.exit(__doc__)
