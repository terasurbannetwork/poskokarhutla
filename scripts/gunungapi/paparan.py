"""Paparan gunung api -> public/gunungapi/data/paparan.json (+ paparan_geo.json dimuat malas). Skema: kontrak P2.

Per gunung (SEMUA gunung di gunungapi_status.json, 69 per 19 Okt 2026; sebelumnya hanya level >= 2 + Merapi, Semeru, Kelud, Agung, Ruang):
  zona      KRB PVMBG (geoportal ESDM gis4 BGV_GA/KRB_Gunung_Api_Area, edisi 2018) > InaRISK bahaya gunung api (proksi) > cincin radius rekomendasi.
            KRB III/II/I = lcode 0703/0702/0701 (radius KRB 0603/0602/0601 dipakai bila gunung hanya punya itu).
  desa, sekolah, faskes, titik kumpul   OSM Overpass dalam 20 km (ODbL). Hanya yang berzona dicatat per nama; hitungan sekolah/faskes memuat yang tanpa nama.
  penduduk  WorldPop R2025A 2026 constrained 1 km (piksel ~0,9 km): jumlah piksel yang PUSATNYA di cincin/zona. Orde besar, galat tepi ~1 km.
            Per desa = piksel dialokasikan ke desa OSM terdekat (<= 3 km): perkiraan kasar, bukan penduduk administratif.
  tambang   WIUP geoportal ESDM (gis1 Overlay_WIUP_vs_Kawasan_Hutan), hanya badan usaha (PT/CV/PD/koperasi/firma), di dalam zona.
  evakuasi  jalan OSM (motorway..residential), Dijkstra berganda dari titik aman: jalan tertier ke atas di luar zona III/II dan di luar
            radius rekomendasi + 2 km; titik kumpul bertanda OSM (assembly_point/shelter) diutamakan (selisih <= 10 menit).
Mentah di-cache di data/raw/gunungapi/ (bukan di public). Kegagalan satu gunung/sumber tidak menggagalkan yang lain.
Pakai:  python3 scripts/gunungapi/paparan.py          tulis berkas
        python3 scripts/gunungapi/paparan.py unduh    hanya mengisi cache mentah
Gunung yang sudah ada di paparan.json DIPAKAI ULANG apa adanya (tanpa jaringan); hanya yang baru dihitung. PAPARAN_ULANG=1 menghitung ulang semuanya.
Gunung tanpa KRB PVMBG, tanpa InaRISK, dan tanpa radius rekomendasi (Level I) hanya mendapat jiwa per cincin 3/5/10/15 km (zona_sumber ZONA_JARAK); desa, sekolah, tambang, evakuasi dibuang, bukan dikarang.
        python3 scripts/gunungapi/paparan.py uji      self-check dari contoh/paparan_contoh.json
"""
import datetime as dt, heapq, json, math, os, re, statistics, sys, time, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
MENTAH = os.path.join(AKAR, "data/raw/gunungapi")
STATUS = os.path.join(AKAR, "public/banjir/data/gunungapi_status.json")
KELUAR = os.path.join(AKAR, "public/gunungapi/data/paparan.json")
KELUAR_GEO = os.path.join(AKAR, "public/gunungapi/data/paparan_geo.json")
WIB = dt.timezone(dt.timedelta(hours=7))
# UA jujur untuk semua host. Dibuktikan 19 Okt 2026 dengan curl -A: geoportal.esdm.go.id (gis4, gis1), gis.bnpb.go.id, earth-search, maps.mail.ru menjawab 200.
# UA peramban penuh malah ditolak overpass-api.de (406), jadi tidak ada host yang membutuhkannya.
UA = "poskokarhutla/1.0 (+https://github.com/terasurbannetwork/poskokarhutla)"
MAKS_RESPON = 120_000_000   # byte; jalan Merapi 20 km ~35 MB
KRB_URL = "https://geoportal.esdm.go.id/gis4/rest/services/BGV_GA/KRB_Gunung_Api_Area/MapServer/0"
WIUP_URL = "https://geoportal.esdm.go.id/gis1/rest/services/Overlay_WIUP_vs_Kawasan_Hutan/MapServer/0"
INARISK = "https://gis.bnpb.go.id/server/rest/services/inarisk/INDEKS_BAHAYA_GUNUNGAPI/ImageServer"
UA_OSM = UA
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
            "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
TIFF = os.path.join(AKAR, "data/raw/penduduk/idn_pop_2026_CN_1km_R2025A_UA_v1.tif")
ZONA_JARAK = "cincin jarak dari kawah (proksi, bukan KRB PVMBG)"
R_CARI = 20.0          # km, desa/sekolah/faskes/tambang
CINCIN = (3, 5, 10, 15)
RANK = {"III": 3, "II": 2, "I": 1}
LCODE = {"0703": "III", "0702": "II", "0701": "I", "0603": "III", "0602": "II", "0601": "I"}
# kecepatan rata-rata km/jam kendaraan evakuasi padat per kelas jalan OSM (sengaja konservatif: lalu lintas padat, jalan gunung)
KECEPATAN = {"motorway": 50, "trunk": 40, "primary": 35, "secondary": 30, "tertiary": 25, "unclassified": 18, "residential": 15}
KELAS_AMAN = {"motorway", "trunk", "primary", "secondary", "tertiary"}   # titik kumpul hanya di jalan kelas ini
ALIAS = {"ililewotolok": {"lewotolo"}, "lewotobilakilaki": {"lewotobilakilaki", "lewotobilakilakidanperempuan"}}
BADAN_OK = {"PT", "CV", "PD", "KSU", "KUD", "KOPERASI", "FIRMA"}
BATAS = {"desa": 90, "sekolah": 40, "faskes": 40, "tambang": 25, "evakuasi": 60}   # per gunung; diturunkan bila berkas > batas ukuran
MAKS_JSON, MAKS_GEO = 400_000, 1_500_000


# ---------------------------------------------------------------- geometri murni
def haversine(la1, lo1, la2, lo2):
    p1, p2 = math.radians(la1), math.radians(la2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
    return 12742.0 * math.asin(math.sqrt(a))


def slug(n):
    return "-".join("".join(ch for ch in n.lower() if ch.isalnum() or ch in " -").split())   # sama dengan abu.id_gunung


def kunci(n):
    return re.sub(r"[^a-z]", "", n.lower())


def polys_dari(geom):
    """GeoJSON Polygon/MultiPolygon -> [(bbox, [cincin...])]; cincin = [[lon, lat]...]"""
    ps = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    out = []
    for p in ps:
        xs = [c[0] for c in p[0]]; ys = [c[1] for c in p[0]]
        out.append(((min(xs), min(ys), max(xs), max(ys)), p))
    return out


def dalam(poly, x, y):
    """titik di poligon dengan lubang (genap-ganjil lintas semua cincin)"""
    (x0, y0, x1, y1), rings = poly
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    ada = False
    for r in rings:
        for (ax, ay), (bx, by) in zip(r, r[1:] + r[:1]):
            if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
                ada = not ada
    return ada


def zona_titik(zon, lon, lat):
    """zon = {'III': [poly...], 'II': ..., 'I': ...} -> 'III' | 'II' | 'I' | None (yang tertinggi menang)"""
    for z in ("III", "II", "I"):
        if any(dalam(p, lon, lat) for p in zon.get(z, ())):
            return z
    return None


def dp(pts, tol):
    """Douglas-Peucker pada [[x, y]...] (derajat)"""
    if len(pts) < 3:
        return pts
    ax, ay = pts[0]; bx, by = pts[-1]
    dx, dy = bx - ax, by - ay
    n = dx * dx + dy * dy
    jauh, idx = -1, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = math.hypot(x - ax, y - ay) if n == 0 else abs(dy * (x - ax) - dx * (y - ay)) / math.sqrt(n)
        if d > jauh:
            jauh, idx = d, i
    if jauh <= tol:
        return [pts[0], pts[-1]]
    return dp(pts[:idx + 1], tol)[:-1] + dp(pts[idx:], tol)


def sederhana(geom, tol):
    """MultiPolygon yang disederhanakan; cincin yang runtuh dibuang"""
    out = []
    for _, rings in polys_dari(geom):
        hasil = []
        for k, r in enumerate(rings):
            s = dp([list(c) for c in r[:-1]], tol) if r[0] == r[-1] else dp([list(c) for c in r], tol)
            if len(s) >= 3:
                hasil.append([[round(x, 4), round(y, 4)] for x, y in s] + [[round(s[0][0], 4), round(s[0][1], 4)]])
            elif k == 0:
                break
        else:
            out.append(hasil)
            continue
        if hasil and len(hasil[0]) >= 4:
            out.append(hasil)
    return {"type": "MultiPolygon", "coordinates": out}


# ---------------------------------------------------------------- graf & Dijkstra
def dijkstra(adj, sumber):
    """adj: {u: [(v, menit, km)]}; sumber: {u: biaya_awal menit}. Multi-sumber -> (menit, km, prev, akar)"""
    mnt, km, prev, akar = {}, {}, {}, {}
    h = []
    for u, c in sumber.items():
        mnt[u], km[u], akar[u] = c, 0.0, u
        heapq.heappush(h, (c, u))
    while h:
        c, u = heapq.heappop(h)
        if c > mnt.get(u, 1e18):
            continue
        for v, m, k in adj.get(u, ()):
            if c + m < mnt.get(v, 1e18):
                mnt[v], km[v], prev[v], akar[v] = c + m, km[u] + k, u, akar[u]
                heapq.heappush(h, (c + m, v))
    return mnt, km, prev, akar


def bangun_graf(ways):
    """elemen way Overpass (out geom) -> (adj, pos {id: (lat, lon)}, aman {id}, nama {id: jalan}); jalan dua arah"""
    adj, pos, aman, nama = {}, {}, set(), {}
    for w in ways:
        t = w.get("tags", {})
        hw = t.get("highway", "").replace("_link", "")
        v = KECEPATAN.get(hw)
        ids, g = w.get("nodes", []), w.get("geometry", [])
        if not v or len(ids) != len(g):
            continue
        for i, p in zip(ids, g):
            if p:
                pos[i] = (p["lat"], p["lon"])
        for a, b in zip(ids, ids[1:]):
            if a not in pos or b not in pos:
                continue
            k = haversine(*pos[a], *pos[b])
            adj.setdefault(a, []).append((b, k / v * 60, k))
            adj.setdefault(b, []).append((a, k / v * 60, k))
        if hw in KELAS_AMAN:
            for i in ids:
                aman.add(i)
                nama.setdefault(i, t.get("name") or t.get("ref") or "")
    return adj, pos, aman, nama


class Indeks:
    """grid 0,01 derajat untuk titik terdekat"""
    def __init__(self, pos):
        self.g = {}
        for i, (la, lo) in pos.items():
            self.g.setdefault((int(la * 100), int(lo * 100)), []).append((i, la, lo))

    def terdekat(self, la, lo, maks_km):
        c = (int(la * 100), int(lo * 100))
        best, bd = None, maks_km
        for r in (1, 2, 4, 8):
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if max(abs(dy), abs(dx)) < r // 2 and r > 1:
                        continue
                    for i, a, b in self.g.get((c[0] + dy, c[1] + dx), ()):
                        d = haversine(la, lo, a, b)
                        if d < bd:
                            best, bd = i, d
            if best is not None and bd < r * 0.9:
                break
        return best, bd


def rute(prev, u):
    p = [u]
    while p[-1] in prev:
        p.append(prev[p[-1]])
    return p


# ---------------------------------------------------------------- penetapan zona gunung
def pilih_krb(fitur, g):
    """fitur KRB GeoJSON -> zon {'III': [poly], ...} untuk gunung g (nama dulu, diverifikasi jarak <= 30 km dari puncak; lalu poligon yang memuat puncak)"""
    k = kunci(g["nama"])
    nama_ok = ALIAS.get(k, {k})
    terpilih = [f for f in fitur if kunci(f["properties"]["namobj"]) in nama_ok and f["properties"]["lcode"] in LCODE]

    def dekat(f):
        return any(haversine(g["lat"], g["lon"], c[1], c[0]) <= 30 for _, p in polys_dari(f["geometry"]) for c in p[0][::3])
    terpilih = [f for f in terpilih if dekat(f)]
    if not terpilih:   # nama tak cocok: poligon KRB mana pun yang memuat puncak
        terpilih = [f for f in fitur if f["properties"]["lcode"] in LCODE
                    and any(dalam(p, g["lon"], g["lat"]) for p in polys_dari(f["geometry"]))]
    zon = {}
    for f in terpilih:
        zon.setdefault(LCODE[f["properties"]["lcode"]], []).extend(polys_dari(f["geometry"]))
    if "07" in "".join(f["properties"]["lcode"][:2] for f in terpilih):   # ada KRB poligon: abaikan lingkaran radius KRB
        zon = {}
        for f in terpilih:
            if f["properties"]["lcode"].startswith("07"):
                zon.setdefault(LCODE[f["properties"]["lcode"]], []).extend(polys_dari(f["geometry"]))
    return zon


def lingkaran(lat, lon, km, n=48):
    c = [[round(lon + km / (111.32 * math.cos(math.radians(lat))) * math.sin(2 * math.pi * i / n),5),
          round(lat + km / 110.574 * math.cos(2 * math.pi * i / n), 5)] for i in range(n)]
    return polys_dari({"type": "Polygon", "coordinates": [c + [c[0]]]})


def zon_radius(g):
    """proksi terakhir: cincin radius rekomendasi PVMBG; III = radius, II = 2x, I = 3x"""
    r = g.get("radius_km") or 3.0
    return {"III": lingkaran(g["lat"], g["lon"], r), "II": lingkaran(g["lat"], g["lon"], 2 * r), "I": lingkaran(g["lat"], g["lon"], 3 * r)}


# ---------------------------------------------------------------- penghitung
def kelas_osm(e):
    """elemen Overpass -> ('desa'|'sekolah'|'faskes'|'kumpul'|None, nama, lat, lon)"""
    t = e.get("tags", {})
    la, lo = e.get("lat"), e.get("lon")
    if la is None and e.get("center"):
        la, lo = e["center"]["lat"], e["center"]["lon"]
    if la is None:
        return None, "", 0, 0
    nm = (t.get("name") or "").strip()
    am = t.get("amenity", "")
    if t.get("place") in ("village", "hamlet", "town"):
        return "desa", nm, la, lo
    if am in ("school", "kindergarten", "college", "university"):
        return "sekolah", nm, la, lo
    if am in ("hospital", "clinic", "doctors") or t.get("healthcare") in ("hospital", "clinic", "doctor", "centre", "midwife") \
            or "puskesmas" in nm.lower():
        return "faskes", nm, la, lo
    if am == "assembly_point" or t.get("emergency") == "assembly_point":
        return "kumpul", nm, la, lo
    return None, nm, la, lo


def hitung_poi(elemen, g, zon):
    """elemen Overpass -> dict objek per jenis dengan zona & km dari puncak; dedupe nama+~110 m"""
    out = {"desa": [], "sekolah": [], "faskes": [], "kumpul": []}
    lihat = set()
    for e in elemen:
        j, nm, la, lo = kelas_osm(e)
        if not j:
            continue
        km = haversine(g["lat"], g["lon"], la, lo)
        if km > R_CARI:
            continue
        k = (j, kunci(nm) or e.get("id"), round(la, 3), round(lo, 3))
        if k in lihat:
            continue
        lihat.add(k)
        out[j].append({"nama": nm, "lat": round(la, 4), "lon": round(lo, 4), "zona": zona_titik(zon, lo, la), "km": round(km, 1)})
    return out


def penduduk_cincin(piksel, g):
    """piksel [[lat, lon, jiwa]] -> [{km, penduduk}] pada CINCIN (kumulatif)"""
    return [{"km": r, "penduduk": round(sum(p[2] for p in piksel if haversine(g["lat"], g["lon"], p[0], p[1]) <= r))} for r in CINCIN]


def alokasi_desa(piksel, desa):
    """tiap piksel ke desa OSM terdekat (<= 3 km) -> jiwa per indeks desa"""
    jiwa = [0.0] * len(desa)
    for la, lo, v in piksel:
        best, bd = -1, 3.0
        for i, d in enumerate(desa):
            if abs(d["lat"] - la) > 0.03 or abs(d["lon"] - lo) > 0.03:
                continue
            k = haversine(la, lo, d["lat"], d["lon"])
            if k < bd:
                best, bd = i, k
        if best >= 0:
            jiwa[best] += v
    return jiwa


def hitung_tambang(fitur, g, zon):
    """fitur WIUP ArcGIS JSON (geometry.rings) -> izin badan usaha di dalam zona; zona = tertinggi dari titik pusat + simpul"""
    out, lihat = [], set()
    for f in fitur:
        a = f["attributes"]
        bu = (a.get("badan_usah") or "").strip().upper()
        if bu not in BADAN_OK or not a.get("nama_usaha"):
            continue
        rings = (f.get("geometry") or {}).get("rings") or []
        if not rings:
            continue
        pts = [p for r in rings for p in r]
        cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        zs = [zona_titik(zon, x, y) for x, y in [(cx, cy)] + pts[::max(1, len(pts) // 40)]]
        z = max((z for z in zs if z), key=lambda z: RANK[z], default=None)
        if not z:
            continue
        nm = f"{bu.title() if bu in ('KOPERASI',) else bu} {a['nama_usaha'].strip().title()}"
        k = (nm, a.get("komoditas"), a.get("kode_wiup") or a.get("sk_iup"))
        if k in lihat:
            continue
        lihat.add(k)
        out.append({"nama": nm, "komoditas": (a.get("komoditas") or "").strip().lower(), "lat": round(cy, 4), "lon": round(cx, 4), "zona": z,
                    "sumber": "ESDM WIUP", "kegiatan": (a.get("kegiatan") or "").strip().lower()})
    return sorted(out, key=lambda t: (-RANK[t["zona"]], haversine(g["lat"], g["lon"], t["lat"], t["lon"])))


def hitung_evakuasi(jalan, poi, g, zon, jiwa_desa=None, maks=60):
    """-> (evakuasi[], rute[], ringkas, alasan). Kandidat: desa berzona III/II atau dalam radius rekomendasi; bila tak ada, desa KRB I terdekat
    (ditandai zona_desa 'I', DIKECUALIKAN dari ringkasan: sudah di luar zona bahaya). Titik aman = jalan tertier+ di luar III/II dan > radius+2 km.
    ringkas dihitung dari SEMUA desa III/II yang punya rute (sebelum daftar dipotong ke maks); alasan = penjelasan jujur bila kosong."""
    adj, pos, aman, nama = bangun_graf(jalan)
    if not adj:
        return [], [], None, "tidak ada jalan OSM terbaca di sekitar gunung", 0
    idx = Indeks(pos)
    rek = g.get("radius_km") or 3.0
    sumber, kumpul_nama = {}, {}
    for s in poi["kumpul"]:
        n, d = idx.terdekat(s["lat"], s["lon"], 1.0)
        if n is not None and n in aman:
            sumber[n] = 0.0
            kumpul_nama[n] = s["nama"] or "titik kumpul OSM"
    for n in aman:
        la, lo = pos[n]
        if n in sumber or haversine(g["lat"], g["lon"], la, lo) <= rek + 2:
            continue
        if zona_titik(zon, lo, la) in ("III", "II"):
            continue
        sumber[n] = 10.0
    if not sumber:
        return [], [], None, "tidak ada jalan tertier ke atas di luar zona bahaya dalam jangkauan jalan OSM", 0
    mnt, km, prev, akar = dijkstra(adj, sumber)
    cand = [d for d in poi["desa"] if d["nama"] and (d["zona"] in ("III", "II") or d["km"] <= rek)]
    cand.sort(key=lambda d: (-(RANK.get(d["zona"], 0)), d["km"]))
    if not cand:   # tak ada desa di zona III/II: desa KRB I terdekat (peringatan dini), bukan daftar kosong
        cand = sorted((d for d in poi["desa"] if d["nama"] and d["zona"] == "I"), key=lambda d: d["km"])[:10]
    ev, rt = [], []
    for d in cand:
        n, jd = idx.terdekat(d["lat"], d["lon"], 2.0)
        if n is None or n not in mnt:
            continue
        a = akar[n]
        ujung = pos[a]
        label = kumpul_nama.get(a) or (nama[a] if nama.get(a) else "jalan aman di luar zona")
        garis = [[round(d["lon"], 4), round(d["lat"], 4)]] + [[round(pos[i][1], 5), round(pos[i][0], 5)] for i in rute(prev, n)]
        ev.append({"desa": d["nama"], "zona_desa": d["zona"] or "radius", "dari": [d["lon"], d["lat"]], "ke": [round(ujung[1], 4), round(ujung[0], 4)],
                   "titik_kumpul": label, "km": round(km[n] + jd, 1), "menit": max(1, round(mnt[n] - sumber[a] + jd / 15 * 60))})
        rt.append([[round(x, 4), round(y, 4)] for x, y in dp(garis, 0.0004)])
    bahaya = sorted(e["menit"] for e in ev if e["zona_desa"] in ("III", "II"))
    ringkas = {"n": len(bahaya), "median_menit": round(statistics.median(bahaya)), "maks_menit": bahaya[-1],
               "label": "waktu tempuh arus bebas"} if bahaya else None
    alasan = None
    if not ev:
        alasan = "tidak ada desa OSM berzona III/II atau dalam radius rekomendasi yang tersambung ke jalan" if not cand else \
                 "desa kandidat tidak berjarak <= 2 km dari jalan OSM yang tersambung ke titik aman"
    return ev[:maks], rt[:maks], ringkas, alasan, len(ev)


def ringkas_zona(g, zon, poi, tambang, piksel):
    """-> {'III': {penduduk, sekolah, faskes, desa, tambang}, ...}"""
    out = {z: {"penduduk": 0, "sekolah": 0, "faskes": 0, "desa": 0, "tambang": 0} for z in ("III", "II", "I")}
    for la, lo, v in piksel:
        z = zona_titik(zon, lo, la)
        if z:
            out[z]["penduduk"] += v
    for j in ("sekolah", "faskes", "desa"):
        for o in poi[j]:
            if o["zona"]:
                out[o["zona"]][j] += 1
    for t in tambang:
        out[t["zona"]]["tambang"] += 1
    for z in out:
        out[z]["penduduk"] = round(out[z]["penduduk"])
    return out


def susun(g, zon, zona_sumber, poi, piksel, tambang, jalan):
    """satu gunung -> (entri paparan.json, entri paparan_geo.json); murni (tanpa jaringan)"""
    piksel = [p for p in piksel if haversine(g["lat"], g["lon"], p[0], p[1]) <= R_CARI]
    jiwa = alokasi_desa(piksel, poi["desa"])
    for d, v in zip(poi["desa"], jiwa):
        d["penduduk"] = round(v)
    ev, rt, ering, alasan, n_ev = hitung_evakuasi(jalan, poi, g, zon, maks=BATAS["evakuasi"])
    if ev and not ering:
        alasan = "Tidak ada desa di KRB III/II yang tersambung ke jalan; rute dari desa KRB I terdekat"
    e = {"id": slug(g["nama"]), "nama": g["nama"], "zona_sumber": zona_sumber,
         "cincin": penduduk_cincin(piksel, g), "zona": ringkas_zona(g, zon, poi, tambang, piksel)}
    zrank = lambda o: (-RANK.get(o["zona"], 0), o["km"])
    for j in ("desa", "sekolah", "faskes"):
        lis = [o for o in poi[j] if o["zona"] and (o["nama"] or j != "desa")]
        for o in lis:
            o["nama"] = o["nama"] or ("Sekolah" if j == "sekolah" else "Fasilitas kesehatan") + " (tanpa nama di OSM)"
        e[j] = sorted((o for o in lis if o["zona"] in ("III", "II") or j == "desa"), key=zrank)
    e["tambang"] = tambang
    e["evakuasi"] = ev
    e["evakuasi_ringkas"] = ering
    e["evakuasi_total"] = n_ev
    if alasan:
        e["catatan"] = alasan if ev else "jalur evakuasi tidak terhitung: " + alasan
    e["citra"] = []
    geo = {"zona": {z: {"type": "MultiPolygon", "coordinates": [p[1] for p in zon[z]]} for z in ("III", "II", "I") if zon.get(z)}, "rute": rt}
    return e, geo


# ---------------------------------------------------------------- jaringan
def ambil(url, data=None, coba=3, timeout=120, ua=UA):
    for i in range(coba):
        try:
            h = {"User-Agent": ua, "Accept": "*/*"}
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h), timeout=timeout) as r:
                b = r.read(MAKS_RESPON + 1)
            if len(b) > MAKS_RESPON:
                raise ValueError(f"respons > {MAKS_RESPON} byte: ditolak")
            return b
        except Exception as e:
            if i == coba - 1:
                raise
            time.sleep(5 * (i + 1))


def overpass(q, berkas, coba=12):
    """cache berkas; mirror bergilir, jeda naik; None bila menyerah"""
    if os.path.exists(berkas):
        return json.load(open(berkas))
    data = urllib.parse.urlencode({"data": q}).encode()
    for i in range(coba):
        url = OVERPASS[i % len(OVERPASS)]
        try:
            raw = ambil(url, data, coba=1, timeout=200, ua=UA_OSM)
            j = json.loads(raw)
            if "elements" not in j or ("remark" in j and "error" in j["remark"].lower()):
                raise RuntimeError(str(j.get("remark", "tanpa elements"))[:120])
            os.makedirs(MENTAH, exist_ok=True)
            open(berkas, "wb").write(raw)
            time.sleep(4)
            return j
        except Exception as e:
            print(f"  overpass {url.split('/')[2]}: {str(e)[:80]}", file=sys.stderr)
            time.sleep(min(10 * (i + 1), 60))
    return None


def q_poi(g):
    a = f"(around:{int(R_CARI * 1000)},{g['lat']},{g['lon']})"
    return (f'[out:json][timeout:150];(node[place~"^(village|hamlet|town)$"]{a};nwr[amenity~"^(school|kindergarten|college|university)$"]{a};'
            f'nwr[amenity~"^(hospital|clinic|doctors)$"]{a};nwr[healthcare]{a};nwr[amenity=assembly_point]{a};nwr[emergency=assembly_point]{a};);out center tags;')


def r_jalan(g, zon):
    far = max([haversine(g["lat"], g["lon"], c[1], c[0]) for z in ("III", "II") for _, p in zon.get(z, ()) for c in p[0][::4]] or [0])
    return min(max((g.get("radius_km") or 3) + 10, far + 5), 22)


def q_jalan(g, r, ringan=False):
    if ringan:   # tanpa residential: kueri jauh lebih ringan bila Overpass sesak
        return (f'[out:json][timeout:180];way[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](around:{int(r * 1000)},{g["lat"]},{g["lon"]});out geom qt;')
    return (f'[out:json][timeout:180];way[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|motorway_link|trunk_link|'
            f'primary_link|secondary_link|tertiary_link)$"](around:{int(r * 1000)},{g["lat"]},{g["lon"]});out geom qt;')


def muat_krb():
    p = os.path.join(MENTAH, "krb.geojson")
    if not os.path.exists(p):
        os.makedirs(MENTAH, exist_ok=True)
        u = KRB_URL + "/query?" + urllib.parse.urlencode({"where": "1=1", "outFields": "namobj,lcode,thterbit", "returnGeometry": "true",
                                                           "outSR": 4326, "maxAllowableOffset": 0.0003, "geometryPrecision": 5, "f": "geojson"})
        open(p, "wb").write(ambil(u, timeout=300))
    return json.load(open(p))["features"]


def ambil_wiup(g, id_):
    p = os.path.join(MENTAH, f"wiup_{id_}.json")
    if os.path.exists(p):
        return json.load(open(p))
    dl, dn = R_CARI / 110.574, R_CARI / (111.32 * math.cos(math.radians(g["lat"])))
    u = WIUP_URL + "/query?" + urllib.parse.urlencode({
        "geometry": f"{g['lon'] - dn},{g['lat'] - dl},{g['lon'] + dn},{g['lat'] + dl}", "geometryType": "esriGeometryEnvelope", "inSR": 4326,
        "spatialRel": "esriSpatialRelIntersects", "outFields": "nama_usaha,badan_usah,komoditas,kegiatan,jenis_izin,sk_iup,kode_wiup",
        "returnGeometry": "true", "outSR": 4326, "maxAllowableOffset": 0.0008, "f": "json"})
    f = json.loads(ambil(u, timeout=120)).get("features")
    if f is None:
        raise RuntimeError("WIUP tanpa features")
    json.dump(f, open(p, "w"), separators=(",", ":"))
    return f


def piksel_penduduk(gs):
    """piksel WorldPop > 0 dalam ~22 km dari tiap gunung -> {id: [[lat, lon, jiwa]]}; cache data/raw/gunungapi/pop_piksel.json"""
    p = os.path.join(MENTAH, "pop_piksel.json")
    if os.path.exists(p):
        c = json.load(open(p))
        if all(slug(g["nama"]) in c for g in gs):
            return c
    sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
    import penduduk as P
    w, h, x0, y0, sx, nodata, ubin = P.baca_tiff(TIFF)
    kotak = [(slug(g["nama"]), g["lat"] - .2, g["lat"] + .2, g["lon"] - .2 / math.cos(math.radians(g["lat"])), g["lon"] + .2 / math.cos(math.radians(g["lat"]))) for g in gs]
    out = {k[0]: [] for k in kotak}
    for bx, by, tw, a in ubin:
        lo0, lo1, la1, la0 = x0 + bx * sx, x0 + (bx + tw) * sx, y0 - by * sx, y0 - (by + tw) * sx
        ada = [k for k in kotak if k[1] < la1 and k[2] > la0 and k[3] < lo1 and k[4] > lo0]
        if not ada:
            continue
        for r in range(tw):
            gy = by + r
            if gy >= h:
                break
            lat = y0 - (gy + .5) * sx
            for c in range(tw):
                v = a[r * tw + c]
                if v > 0 and v != nodata and bx + c < w:
                    lon = x0 + (bx + c + .5) * sx
                    for k in ada:
                        if k[1] < lat < k[2] and k[3] < lon < k[4]:
                            out[k[0]].append([round(lat, 4), round(lon, 4), round(v, 1)])
    json.dump(out, open(p, "w"), separators=(",", ":"))
    return out


def inarisk_zon(g):
    """proksi InaRISK: sampel kisi 1 km 25x25 di sekitar puncak lewat getSamples (indeks 0-1: >=0,66 tinggi, >=0,33 sedang, >0 rendah) -> zon dari kotak sel; None bila gagal"""
    try:
        pts = []
        n, st = 12, 1.0
        for i in range(-n, n + 1):
            for j in range(-n, n + 1):
                pts.append([round(g["lon"] + j * st / (111.32 * math.cos(math.radians(g["lat"]))), 5), round(g["lat"] + i * st / 110.574, 5)])
        q = urllib.parse.urlencode({"geometry": json.dumps({"points": pts, "spatialReference": {"wkid": 4326}}), "geometryType": "esriGeometryMultipoint",
                                    "returnFirstValueOnly": "true", "f": "json"})
        s = json.loads(ambil(f"{INARISK}/getSamples?{q}", timeout=90))["samples"]
    except Exception as e:
        print(f"  InaRISK gagal {g['nama']}: {e}", file=sys.stderr)
        return None
    zon = {}
    for sm in s:
        try:
            v = float(sm["value"])
        except (KeyError, ValueError, TypeError):
            continue
        z = "III" if v >= .66 else "II" if v >= .33 else "I" if v > 0 else None
        if z:
            x, y = sm["location"]["x"], sm["location"]["y"]
            dx, dy = .5 / (111.32 * math.cos(math.radians(y))), .5 / 110.574
            zon.setdefault(z, []).extend(polys_dari({"type": "Polygon", "coordinates": [[[x - dx, y - dy], [x + dx, y - dy], [x + dx, y + dy], [x - dx, y + dy], [x - dx, y - dy]]]}))
    return zon if zon else None


# ---------------------------------------------------------------- alur utama
def sasaran():
    st = json.load(open(STATUS))
    gs = list(st["gunung"])
    return sorted(gs, key=lambda g: (-g["level"], g["nama"]), reverse=bool(os.environ.get("PAPARAN_BALIK")))   # BALIK=1: pengunduh kedua dari ujung lain


def tulis(unduh_saja=False):
    semua = sasaran()
    lama = json.load(open(KELUAR)) if os.path.exists(KELUAR) else {"gunung": []}
    geo_lama = json.load(open(KELUAR_GEO)) if os.path.exists(KELUAR_GEO) else {}
    ada = {} if os.environ.get("PAPARAN_ULANG") else {x["id"]: x for x in lama.get("gunung", []) if x["id"] in geo_lama}
    gs = [g for g in semua if slug(g["nama"]) not in ada]
    print(f"{len(ada)} gunung dipakai ulang, {len(gs)} dihitung", file=sys.stderr)
    krb = muat_krb()
    piks = piksel_penduduk(gs) if gs else {}
    citra_lama = {x["id"]: x.get("citra", []) for x in lama.get("gunung", [])}
    hasil, geo, log = [], {}, []
    for g in gs:
        id_ = slug(g["nama"])
        zon = pilih_krb(krb, g)
        zs = "KRB PVMBG"
        if not zon:
            zon = inarisk_zon(g)
            zs = "InaRISK bahaya gunung api (proksi KRB)"
        if not zon:
            zon, zs = zon_radius(g), "radius rekomendasi (proksi)" if g.get("radius_km") else ZONA_JARAK
        log.append(f"{g['nama']}: zona {zs}")
        if zs == ZONA_JARAK:   # tanpa KRB/InaRISK/radius rekomendasi: zona karangan tak dipakai menghitung desa, sekolah, tambang, evakuasi; hanya jiwa per cincin jarak
            if unduh_saja:
                continue
            e, ge = susun(g, {}, zs, {"desa": [], "sekolah": [], "faskes": [], "kumpul": []}, piks.get(id_, []), [], [])
            e["catatan"] = "tanpa zona KRB PVMBG: hanya jiwa dalam radius yang dihitung, tanpa desa, sekolah, tambang, dan rute evakuasi"
            e["citra"] = citra_lama.get(id_, [])
            hasil.append(e)
            geo[id_] = ge
            print(f"  {g['nama']}: {zs}, jiwa {e['cincin'][-1]['penduduk']}", file=sys.stderr)
            continue
        poi_raw = overpass(q_poi(g), os.path.join(MENTAH, f"poi_{id_}.json"))
        rj = r_jalan(g, zon)
        jb = os.path.join(MENTAH, f"jalan_{id_}.json")
        jal_raw = overpass(q_jalan(g, rj), jb, coba=6) or overpass(q_jalan(g, rj, True), jb, coba=6)
        try:
            wiup = ambil_wiup(g, id_)
            tambang_ok = True
        except Exception as e:
            print(f"  WIUP gagal {g['nama']}: {e}", file=sys.stderr)
            wiup, tambang_ok = [], False
        if unduh_saja:
            continue
        poi = hitung_poi((poi_raw or {}).get("elements", []), g, zon)
        e, ge = susun(g, zon, zs, poi, piks.get(id_, []), hitung_tambang(wiup, g, zon), [x for x in (jal_raw or {}).get("elements", []) if x.get("type") == "way"])
        cat = []
        if poi_raw is None:
            cat.append("OSM (desa, sekolah, faskes) tidak terjangkau saat dibangun")
        if jal_raw is None:
            cat.append("jalan OSM tidak terjangkau: tanpa jalur evakuasi")
        if not tambang_ok:
            cat.append("WIUP ESDM tidak terjangkau")
        if cat:
            e["catatan"] = "; ".join(cat + ([e["catatan"]] if e.get("catatan") else []))
        e["citra"] = citra_lama.get(id_, [])
        hasil.append(e)
        geo[id_] = ge
        print(f"  {g['nama']}: {zs}, desa {len(e['desa'])}, evakuasi {len(e['evakuasi'])}, tambang {len(e['tambang'])}", file=sys.stderr)
    if unduh_saja:
        print("\n".join(log))
        return
    for g in semua:   # urutan = urutan status; yang dipakai ulang masuk dengan geometrinya
        i = slug(g["nama"])
        if i in ada:
            hasil.append(ada[i])
            geo[i] = geo_lama[i]
    urut = {slug(g["nama"]): n for n, g in enumerate(semua)}
    hasil.sort(key=lambda e: urut[e["id"]])
    cetak(hasil, geo)


def cetak(hasil, geo):
    """tulis atomik; turunkan batas daftar dan perkasar geometri sampai muat ukuran"""
    sumber = [{"nama": "KRB Gunung Api PVMBG/Badan Geologi (edisi 2018)", "url": "https://geoportal.esdm.go.id/gis4/rest/services/BGV_GA/KRB_Gunung_Api_Area/MapServer"},
              {"nama": "OpenStreetMap via Overpass (ODbL)", "url": "https://www.openstreetmap.org/copyright"},
              {"nama": "WorldPop Global2 R2025A 2026 1 km", "url": "https://hub.worldpop.org"},
              {"nama": "WIUP ESDM (geoportal, overlay kawasan hutan)", "url": "https://geoportal.esdm.go.id"},
              {"nama": "InaRISK BNPB (cadangan zona)", "url": "https://inarisk.bnpb.go.id"}]
    skala = 1.0
    for _ in range(8):
        h = []
        for e in hasil:
            c = dict(e)
            for k, m in BATAS.items():
                c[k] = e[k][:max(3, int(m * skala))]
            tot = e.get("evakuasi_total", 0)
            c["evakuasi_catatan"] = (f"Memuat semua {tot} desa yang punya rute." if len(c["evakuasi"]) >= tot else
                                     f"Memuat {len(c['evakuasi'])} dari {tot} desa yang punya rute: urut zona III, lalu II, lalu terdekat kawah, dipotong setelahnya. Bukan sampel acak. "
                                     "Ringkasan waktu dihitung dari semua desa III/II, bukan hanya yang tampil.")
            h.append(c)
        isi = {"v": 1, "dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sumber": sumber, "gunung": h}
        b = json.dumps(isi, ensure_ascii=False, separators=(",", ":"))
        if len(b.encode()) <= MAKS_JSON:
            break
        skala *= .75
    tol = 0.002
    for _ in range(8):
        gj = {}
        for id_, g in geo.items():
            gj[id_] = {"zona": {z: sederhana(m, tol) for z, m in g["zona"].items()}, "rute": g["rute"][:max(3, int(BATAS["evakuasi"] * skala))]}
        bg = json.dumps(gj, separators=(",", ":"))
        if len(bg.encode()) <= MAKS_GEO:
            break
        tol *= 1.6
    for p, s in ((KELUAR, b), (KELUAR_GEO, bg)):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p + ".tmp", "w").write(s)
        os.replace(p + ".tmp", p)
    print(f"paparan.json {len(b.encode()) / 1e3:.0f} KB, paparan_geo.json {len(bg.encode()) / 1e3:.0f} KB, {len(hasil)} gunung", file=sys.stderr)


# ---------------------------------------------------------------- self-check
def uji():
    # haversine: 1 derajat bujur di khatulistiwa ~ 111,19 km
    assert abs(haversine(0, 0, 0, 1) - 111.19) < .1
    assert slug("Anak Krakatau") == "anak-krakatau" and slug("Lewotobi Laki-laki") == "lewotobi-laki-laki"
    # titik dalam poligon dengan lubang: kotak 0..10 berlubang 4..6
    pl = polys_dari({"type": "Polygon", "coordinates": [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]]})[0]
    assert dalam(pl, 2, 2) and not dalam(pl, 5, 5) and not dalam(pl, 11, 5)
    # zona tertinggi menang
    zon = {"III": [polys_dari({"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]})[0]],
           "II": [polys_dari({"type": "Polygon", "coordinates": [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]]})[0]]}
    assert [zona_titik(zon, *p) for p in ((1, 1), (3, 3), (9, 9))] == ["III", "II", None]
    # Dijkstra: A-B-C panjang, A-C pintas mahal; sumber di C
    adj = {"A": [("B", 1, 1), ("C", 5, 5)], "B": [("A", 1, 1), ("C", 1, 1)], "C": [("B", 1, 1), ("A", 5, 5)]}
    m, k, pv, ak = dijkstra(adj, {"C": 0})
    assert m["A"] == 2 and k["A"] == 2 and rute(pv, "A") == ["A", "B", "C"] and ak["A"] == "C"
    m2, _, _, ak2 = dijkstra(adj, {"C": 10, "A": 0})
    assert ak2["B"] == "A"            # biaya awal 10 menit membuat sumber A menang di B
    # Douglas-Peucker: titik segaris dibuang
    assert dp([[0, 0], [1, 0.0001], [2, 0]], 0.01) == [[0, 0], [2, 0]]
    # contoh tersimpan: gunung rekaan, KRB III 0..0,05 derajat, 3 desa, 1 jalan
    c = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "contoh/paparan_contoh.json")))
    g = c["gunung"]
    zon = pilih_krb(c["krb"], g)
    assert set(zon) == {"III", "II"}, f"KRB contoh harus III dan II, dapat {set(zon)}"
    poi = hitung_poi(c["poi"], g, zon)
    assert [d["zona"] for d in sorted(poi["desa"], key=lambda d: d["km"])] == c["harapan"]["zona_desa"], "penetapan zona desa berubah"
    assert len(poi["sekolah"]) == 1 and len(poi["faskes"]) == 2          # clinic + puskesmas bernama; kafe diabaikan
    e, ge = susun(g, zon, "KRB PVMBG", poi, c["piksel"], hitung_tambang(c["wiup"], g, zon), c["jalan"])
    assert e["zona_sumber"] == "KRB PVMBG" and e["id"] == "uji-gunung"
    assert [x["km"] for x in e["cincin"]] == [3, 5, 10, 15] and e["cincin"][0]["penduduk"] <= e["cincin"][3]["penduduk"]
    assert e["zona"]["III"]["penduduk"] == c["harapan"]["pend_III"], f"penduduk zona III {e['zona']['III']['penduduk']}"
    assert [t["nama"] for t in e["tambang"]] == ["CV Batu Kali"], "perorangan dan di luar zona harus dibuang"
    assert e["zona"]["III"]["sekolah"] == 1 and e["zona"]["III"]["faskes"] >= 1
    assert len(e["evakuasi"]) == len(ge["rute"]) >= 1
    er = e["evakuasi_ringkas"]
    assert er["n"] == 2 and er["median_menit"] == 16 and er["maks_menit"] == 21 and er["label"] == "waktu tempuh arus bebas", er   # Desa A 21, Dusun B 11 menit
    assert all(x["zona_desa"] in ("III", "II", "radius", "I") for x in e["evakuasi"])
    # desa KRB I sebagai cadangan tidak boleh masuk ringkasan: geser semua desa ke luar zona III/II
    poi2 = hitung_poi(c["poi"], g, zon)
    for d in poi2["desa"]:
        d["zona"] = "I" if d["zona"] else None
    ev2, _, er2, _, _ = hitung_evakuasi(c["jalan"], poi2, g, zon)
    assert ev2 and all(x["zona_desa"] == "I" for x in ev2) and er2 is None, "fallback KRB I masuk ringkasan"
    poi3 = hitung_poi(c["poi"], g, zon)
    for d in poi3["desa"]:
        d["zona"] = "I" if d["zona"] else None
    e3, _ = susun(g, zon, "KRB PVMBG", poi3, c["piksel"], [], c["jalan"])
    assert e3["evakuasi"] and e3["evakuasi_ringkas"] is None and "KRB I terdekat" in e3.get("catatan", ""), "kasus cadangan KRB I tanpa catatan"
    ev = e["evakuasi"][0]
    assert ev["menit"] > 0 and ev["km"] > 0 and ev["titik_kumpul"] and ge["rute"][0][-1] == ev["ke"], "rute harus berujung di titik kumpul"
    assert e["desa"] and all({"nama", "lat", "lon", "penduduk", "zona", "km"} <= set(d) for d in e["desa"])
    # skema berkas nyata bila ada
    for p, mk in ((KELUAR, MAKS_JSON), (KELUAR_GEO, MAKS_GEO)):
        if os.path.exists(p):
            assert os.path.getsize(p) <= mk, f"{os.path.basename(p)} {os.path.getsize(p)} B > {mk} B"
    if os.path.exists(KELUAR):
        j = json.load(open(KELUAR))
        assert j["v"] == 1 and j["gunung"]
        for x in j["gunung"]:
            assert {"id", "nama", "zona_sumber", "cincin", "zona", "desa", "sekolah", "faskes", "tambang", "evakuasi", "citra", "evakuasi_ringkas", "evakuasi_catatan"} <= set(x), x["id"]
            if x["evakuasi_ringkas"]:
                bahaya = [v["menit"] for v in x["evakuasi"] if v["zona_desa"] in ("III", "II")]
                assert x["evakuasi_ringkas"]["n"] >= len(bahaya) and x["evakuasi_ringkas"]["label"] == "waktu tempuh arus bebas", x["id"]
            if x["evakuasi"] and not x["evakuasi_ringkas"]:
                assert "KRB I" in x.get("catatan", ""), f"{x['id']}: rute cadangan KRB I tanpa catatan"
            if not x["evakuasi"]:
                assert x.get("catatan"), f"{x['id']}: evakuasi kosong tanpa catatan"
            assert x["zona_sumber"] in ("KRB PVMBG", "InaRISK bahaya gunung api (proksi KRB)", "radius rekomendasi (proksi)", ZONA_JARAK)
    print("paparan uji: ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        tulis(unduh_saja=sys.argv[1:] == ["unduh"])
