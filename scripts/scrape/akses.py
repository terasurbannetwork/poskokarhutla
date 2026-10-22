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
Graf dipadatkan: simpul = persimpangan, ujung ruas, dan titik jangkar tiap <= 2 km di sepanjang ruas.
"""
import gzip, heapq, json, math, os, sys

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
# 3 km = 2 x eps DBSCAN 1,5 km (harian.EPS_KM): dua titik pusat kompleks yang sama antar putaran tak mungkin lebih jauh dari
# satu tautan; sama dengan jari-jari pasang_kompleks di konsesi_kompleks.py. Asumsi platform, bukan standar baku.
COCOK_KM = 3.0


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


def akses(simpul, sisi, kompleks, basis, n_daops=3, n_posko=2):
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


def cocok_akses(daftar, lat, lon, maks_km=COCOK_KM):
    """Entri akses terdekat dari (lat, lon) dalam maks_km, atau None. ID kompleks tidak dipakai."""
    best, jarak = None, maks_km
    for la, lo, v in daftar:
        d = km(lat, lon, la, lo)
        if d <= jarak:
            best, jarak = v, d
    return best


def harian():
    with gzip.open(GRAF, "rt") as f:
        g = json.load(f)
    kl = json.load(open(os.path.join(DATA, "kluster.json")))["features"]
    kompleks = [f["properties"] for f in kl if f["properties"].get("level") == 3 and f["properties"].get("prov") in PRIORITAS]
    hasil = akses([tuple(s) for s in g["simpul"]], g["sisi"], kompleks, markas())
    out = {"_meta": {"laju_kmj": LAJU, "kaki_kmj": KAKI_KMJ, "batas_jam": BATAS_JAM, "kompleks": len(kompleks), "terjangkau": len(hasil),
                     "sumber": "OpenStreetMap (ODbL), (c) kontributor OpenStreetMap",
                     "catatan": "Perkiraan perencanaan: kondisi jalan, banjir, portal perusahaan, dan izin lewat tidak dimodelkan."}}
    out.update(hasil)
    p = os.path.join(DATA, "akses.json")
    json.dump(out, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"akses.json {len(hasil)}/{len(kompleks)} kompleks prioritas terjangkau, {os.path.getsize(p) / 1e3:.0f} KB")


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
    assert cocok_akses(d, k["lat"], k["lon"]) is r
    assert cocok_akses(d, k["lat"] + 1 / 110.57, k["lon"]) is r, "id berubah (K0001 -> K0950) tapi lokasi 1 km: tetap cocok"
    assert cocok_akses(d, k["lat"] + (COCOK_KM + 0.5) / 110.57, k["lon"]) is None, "lokasi jauh tidak boleh cocok"
    assert cocok_akses([], 0, 0) is None and cocok_akses(daftar_akses(None), 0, 0) is None
    lain = {"lat": k["lat"] + 2 / 110.57, "lon": k["lon"], "kaki_km": 9.0, "dari": []}
    assert cocok_akses(daftar_akses({"A": r, "B": lain}), k["lat"] + 1.8 / 110.57, k["lon"]) is lain, "yang terdekat menang"


if __name__ == "__main__":
    uji()
    if sys.argv[1:] == ["graf"]:
        graf()
    elif sys.argv[1:] != ["uji"]:
        harian()
