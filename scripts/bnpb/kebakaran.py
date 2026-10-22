"""Indeks risiko kebakaran permukiman padat per kelurahan (bahan Damkar pemda) -> public/bnpb/data/kebakaran_<prov>.json

HIPOTESIS. Bobot dipilih sebelum melihat kejadian (rata-rata empat peringkat, bobot sama), tidak disetel ke data kejadian.
Label "hipotesis" baru boleh dilepas bila uji balik di bawah lulus di KEDUA periode.

  SKOR (0-100) = 100 x rata-rata peringkat persentil (0-1, di antara kelurahan satu kota) dari:
    tutupan   luas tapak bangunan / luas kelurahan (KDB nyata). Api merambat antarbangunan yang berimpit.
    kepadatan bangunan per hektare. Bersama tutupan: banyak bangunan kecil rapat = permukiman padat.
    waktu     menit tempuh Damkar, median tertimbang bangunan: Dijkstra multi-sumber dari semua pos Damkar lewat jalan
              yang bisa dilalui mobil pemadam, ditambah jalan kaki/selang dari jalan itu ke bangunan (4 km/jam).
              Kecepatan per kelas jalan DIANDAIKAN (tabel KECEPATAN), tanpa data lalu lintas; arah satu jalur diabaikan.
    sempit    porsi panjang jalan di kelurahan yang tidak bisa dilalui mobil pemadam: gang (footway, path, steps,
              pedestrian, track, living_street, service=alley) atau width < 3,5 m bila ditandai di OSM.
  Hidran (OSM emergency=fire_hydrant) DITAMPILKAN, tidak masuk skor: pemetaan hidran di OSM sangat tidak lengkap, jadi
  "jauh dari hidran" lebih banyak mengukur kelengkapan peta daripada risiko.
  Kelas relatif dalam satu kota: 10% teratas Sangat tinggi, 20% berikutnya Tinggi, 30% Sedang, sisanya Rendah.

Uji balik (tidak ada data kejadian yang masuk rumus, jadi kedua periode di luar sampel):
  Kejadian: Dinas Gulkarmat DKI lewat Satu Data Jakarta. Periode A 2015-2023 (jumlah peristiwa per kelurahan dan penyebab),
  periode B 2024-2025 (rekap bulanan per kelurahan). Mencakup SEMUA kebakaran yang ditangani (termasuk sampah, kendaraan,
  gedung), bukan hanya permukiman; data tidak memisahkannya.
  Ukuran: tangkapan 20% = porsi kejadian yang jatuh di 20% kelurahan dengan nilai tertinggi. Juga Spearman.
  Pembanding: jumlah bangunan (kelurahan besar wajar lebih sering terbakar), kepadatan saja, dan untuk periode B riwayat A.
  ATURAN LULUS (tetap, ditulis sebelum melihat hasil): di periode A DAN B, tangkapan indeks >= tangkapan pembanding jumlah
  bangunan dan kepadatan saja + 5 poin, dan batas bawah selang 90% bootstrap (2.000 ulangan kelurahan, benih 7) selisihnya > 0.
  Riwayat A dilaporkan sebagai pembanding kuat, tidak masuk aturan: indeks ini untuk kota yang tak punya catatan kejadian.

Sumber: batas desa/kelurahan BIG (geoservices.big.go.id BATAS_DESAKEL_AR); Satu Data Jakarta (pos Damkar 2024, kejadian);
OpenStreetMap via Overpass (ODbL); Google Open Buildings v3 (CC BY 4.0), dibaca mengalir tanpa disimpan, ambang keyakinan 0,70.

Pakai:  python3 scripts/bnpb/kebakaran.py [--prov 31]     (unduh mentah ke data/raw/kebakaran/ bila belum ada, lalu hitung)
        python3 scripts/bnpb/kebakaran.py --cek           (swa-uji sintetis, tanpa jaringan)
"""
import argparse, bisect, collections, difflib, gzip, heapq, json, math, os, random, re, sys, urllib.parse, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
import kejadian as _kej   # simpan (atomik, "dibuat" pertama)

MENTAH = os.path.join(AKAR, "data/raw/kebakaran")
KELUAR = os.path.join(AKAR, "public/bnpb/data")
LABEL = "hipotesis, belum lulus uji balik"

# Kota pilot. Menambah kota = satu entri; tanpa sumber kejadian, uji balik dilewati dan label tetap hipotesis.
KOTA = {
    "31": {"nama": "DKI Jakarta", "iso": "ID-JK", "big": "WADMPR like '%Jakarta%'",
           "kotak": (-6.38, 106.68, -6.08, 106.98),          # lat0, lon0, lat1, lon1 daratan (Kepulauan Seribu di luar)
           "kecuali_kab": ["kepulauan seribu", "kep seribu"],             # tanpa jaringan jalan; Damkar lewat laut
           "pos": "data-pos-pemadam-kebakaran",
           "kejadian_a": "jumlah-peristiwa-kebakaran-menurut-kelurahan",
           "kejadian_b": "data-rekapitulasi-kejadian-kebakaran"},
}
BIG = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_DESAKEL_AR/MapServer/0/query"
SATUDATA = "https://satudata.jakarta.go.id/backend/api/v2/satudata/detail"
OB = "https://storage.googleapis.com/open-buildings-data/v3/polygons_s2_level_6_gzip_no_header/{}_buildings.csv.gz"
UA = {"User-Agent": "Mozilla/5.0 (pantau-bencana; indeks kebakaran permukiman)"}

HALUS = 2000            # sel bangunan 1/2000 derajat (~55 m)
KEYAKINAN = 0.70        # sama dengan scripts/umum/bangunan.py
JALAN_KAKI = 4.0        # km/jam, regu menarik selang dari mobil ke bangunan
# km/jam mobil pemadam per kelas jalan, diandaikan (tanpa data lalu lintas)
KECEPATAN = {"motorway": 50, "trunk": 40, "primary": 35, "secondary": 30, "tertiary": 25, "unclassified": 18,
             "residential": 18, "service": 12, "living_street": 10, "road": 15}
GANG = {"footway", "path", "steps", "pedestrian", "track", "living_street"}
TROTOAR = {"sidewalk", "crossing", "traffic_island", "access_aisle"}
LEBAR_MIN = 3.5         # m; mobil pompa ±2,5 m + ruang buka pintu
SEL_JALAN = 0.002       # derajat, ember pencarian simpul terdekat
KELAS = [(0.10, 3, "Sangat tinggi"), (0.30, 2, "Tinggi"), (0.60, 1, "Sedang"), (1.01, 0, "Rendah")]
PUNCAK = 0.20           # tangkapan 20% teratas
MARGIN, ULANG, BENIH = 0.05, 2000, 7


# ---------------- unduh (cache di data/raw/kebakaran) ----------------
def _json_url(url, data=None, headers=None, timeout=300):
    req = urllib.request.Request(url, data, headers={**UA, **(headers or {})})
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8-sig"))


def _cache(nama, fungsi):
    p = os.path.join(MENTAH, nama)
    if os.path.exists(p):
        return json.load(open(p, encoding="utf-8"))
    o = fungsi()
    os.makedirs(MENTAH, exist_ok=True)
    with open(p + ".tmp", "w", encoding="utf-8") as f:   # atomik: jalan yang terputus tak meninggalkan cache terpotong
        json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(p + ".tmp", p)
    return o


def ambil_kelurahan(prov):
    def f():
        out, ofs = [], 0
        while True:
            q = {"where": KOTA[prov]["big"], "outFields": "WADMKD,WADMKC,WADMKK,KDEPUM", "outSR": 4326, "f": "json",
                 "returnGeometry": "true", "resultOffset": ofs, "resultRecordCount": 100, "orderByFields": "OBJECTID"}
            d = _json_url(BIG + "?" + urllib.parse.urlencode(q))
            for ft in d.get("features", []):
                a = ft["attributes"]
                out.append({"kode": a["KDEPUM"], "nama": a["WADMKD"].strip(), "kec": a["WADMKC"].strip(), "kab": a["WADMKK"].strip(),
                            "cincin": [[[round(x, 6), round(y, 6)] for x, y in r] for r in ft["geometry"]["rings"]]})
            if not d.get("exceededTransferLimit") and len(d.get("features", [])) < 100:
                return out
            ofs += 100
    return _cache(f"kelurahan_{prov}.json", f)


def ambil_satudata(page_url):
    def f():
        baris, hal = [], 1
        while True:
            body = json.dumps({"page_url": page_url, "kategori": "dataset", "data_no": hal, "per_page": 100}).encode()
            d = _json_url(SATUDATA, body, {"content-type": "application/json"}, 120)
            fd = d.get("filedata") or []
            baris += fd
            if not fd or len(baris) >= int(d.get("totalFiledata") or 0):
                return baris
            hal += 1
    return _cache(f"satudata_{page_url}.json", f)


def ambil_osm(prov):
    import osm   # scripts/scrape/osm.py: Overpass dengan cermin, coba ulang, cache per berkas
    # 21 Okt 2026: overpass-api.de penuh (502) dan menolak jabat tangan TLS Python 3.9; private.coffee menjawab
    osm.SERVER[:] = ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter"]
    iso = KOTA[prov]["iso"]
    jalan = osm.overpass(f'[out:json][timeout:900];area["ISO3166-2"="{iso}"]->.a;(way[highway](area.a););out body geom qt;',
                         os.path.join(MENTAH, f"jalan_{prov}.json"))
    air = osm.overpass(f'[out:json][timeout:300];area["ISO3166-2"="{iso}"]->.a;'
                       f'(nwr[emergency~"^(fire_hydrant|water_tank|suction_point|fire_water_pond)$"](area.a);nwr[amenity=fire_station](area.a););out center tags;',
                       os.path.join(MENTAH, f"hidran_{prov}.json"))
    return jalan["elements"], air["elements"]


def ambil_bangunan(prov):
    """Sel ~55 m {"i,j": [n, luas_m2]} di kotak kota. Ubin S2 level 6 dibaca mengalir (1,7 GB untuk Jakarta), tak disimpan."""
    import bangunan as ob   # scripts/umum/bangunan.py: token_s2, daftar ubin bucket
    la0, lo0, la1, lo1 = KOTA[prov]["kotak"]

    def f():
        ada = ob.daftar(6)
        tok = sorted({ob.token_s2(la0 + (la1 - la0) * a / 20, lo0 + (lo1 - lo0) * b / 20, 6) for a in range(21) for b in range(21)} & set(ada))
        sel = {}
        for t in tok:
            print(f"  open buildings ubin {t} ({ada[t] / 1e9:.1f} GB), dibaca mengalir", flush=True)
            r = urllib.request.urlopen(urllib.request.Request(OB.format(t), headers=UA), timeout=600)
            with gzip.GzipFile(fileobj=r) as g:
                tambah_bangunan(sel, g, KOTA[prov]["kotak"])
        return sel
    return _cache(f"bangunan_{prov}.json", f)


def tambah_bangunan(sel, baris, kotak, ambang=KEYAKINAN):
    la0, lo0, la1, lo1 = kotak
    for b in baris:
        p = b.split(b",", 4)
        if len(p) < 5:
            continue
        lat, lon = float(p[0]), float(p[1])
        if not (la0 <= lat <= la1 and lo0 <= lon <= lo1) or float(p[3]) < ambang:
            continue
        k = "%d,%d" % (math.floor(lat * HALUS), math.floor(lon * HALUS))
        e = sel.setdefault(k, [0, 0.0])
        e[0] += 1
        e[1] = round(e[1] + float(p[2]), 1)
    return sel


# ---------------- geometri ----------------
def dalam(x, y, cincin):
    """Genap-ganjil atas semua cincin (lubang dan bagian terpisah sekaligus)."""
    d = False
    for r in cincin:
        j = len(r) - 1
        for i in range(len(r)):
            xi, yi = r[i]
            xj, yj = r[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                d = not d
            j = i
    return d


def luas_ha(cincin):
    """Shoelace bertanda di proyeksi equirectangular; cincin luar dan lubang berlawanan arah (ArcGIS), jadi jumlah mutlak = luas bersih."""
    s, n = 0.0, 0
    for r in cincin:
        lat = sum(p[1] for p in r) / len(r)
        kx = 111.32e3 * math.cos(math.radians(lat))
        s += sum((r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]) for i in range(len(r) - 1)) * kx * 110.57e3
        n += 1
    return abs(s) / 2 / 1e4


def km(a, b):
    return _kej.km(a, b)


def sederhana(r, tol):
    """Douglas-Peucker satu cincin (derajat)."""
    if len(r) < 3:
        return r
    a, b = r[0], r[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1e-12
    jauh, ji = -1, 0
    for i in range(1, len(r) - 1):
        d = abs(dy * (r[i][0] - a[0]) - dx * (r[i][1] - a[1])) / L if (dx or dy) else math.hypot(r[i][0] - a[0], r[i][1] - a[1])
        if d > jauh:
            jauh, ji = d, i
    if jauh <= tol:
        return [a, b]
    return sederhana(r[:ji + 1], tol)[:-1] + sederhana(r[ji:], tol)


class Pencari:
    """Kelurahan untuk titik; kotak pembatas dulu, lalu genap-ganjil. Memo per sel ~55 m."""
    def __init__(self, kel):
        self.kel = kel
        self.kotak = []
        for i, k in enumerate(kel):
            xs = [p[0] for r in k["cincin"] for p in r]
            ys = [p[1] for r in k["cincin"] for p in r]
            self.kotak.append((min(xs), min(ys), max(xs), max(ys), i))
        self.memo = {}

    def cari(self, lon, lat):
        k = (math.floor(lat * HALUS), math.floor(lon * HALUS))
        if k not in self.memo:
            x, y = (k[1] + .5) / HALUS, (k[0] + .5) / HALUS
            self.memo[k] = next((i for x0, y0, x1, y1, i in self.kotak if x0 <= x <= x1 and y0 <= y <= y1 and dalam(x, y, self.kel[i]["cincin"])), None)
        return self.memo[k]


# ---------------- jaringan jalan ----------------
def kelas_jalan(tag):
    """'mobil' (bisa dilalui pemadam), 'gang', atau None (bukan jalan untuk orang/mobil, mis. jalan tol untuk akses, rencana)."""
    h = tag.get("highway", "")
    h0 = h.replace("_link", "")
    if h in ("construction", "proposed", "platform", "elevator", "bus_stop", "raceway", "abandoned", "disused"):
        return None
    try:
        lebar = float(re.sub(r"[^\d.]", "", tag.get("width", "").replace(",", ".")) or "nan")
    except ValueError:
        lebar = float("nan")
    if h in GANG and (tag.get("footway") in TROTOAR or tag.get("area") == "yes" or tag.get("indoor") not in (None, "no")):
        return None   # trotoar, zebra cross, plaza, lorong gedung: bukan gang permukiman
    if h in GANG or tag.get("service") == "alley" or (not math.isnan(lebar) and lebar < LEBAR_MIN):
        return "gang"
    if h0 in KECEPATAN and tag.get("service") not in ("driveway", "parking_aisle", "drive-through") and tag.get("access") not in ("no", "private"):
        return "mobil"
    return None


def graf(ways):
    """-> simpul {id:(lat,lon)}, tetangga {id:[(id, menit)]}, ruas [(lat, lon tengah, panjang_km, kelas)], akses {id}.
    akses = simpul jalan biasa (bukan tol): bangunan dan pos hanya boleh menempel ke sini, jalan tol cuma dilewati."""
    simpul, tet, ruas, akses = {}, collections.defaultdict(list), [], set()
    for w in ways:
        if w.get("type") != "way" or "geometry" not in w:
            continue
        kl = kelas_jalan(w.get("tags", {}))
        if not kl:
            continue
        v = KECEPATAN.get(w["tags"]["highway"].replace("_link", ""), 15)
        ids, geo = w["nodes"], w["geometry"]
        for i in range(len(ids) - 1):
            a, b = (geo[i]["lat"], geo[i]["lon"]), (geo[i + 1]["lat"], geo[i + 1]["lon"])
            d = km(a, b)
            ruas.append(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d, kl))
            if kl == "mobil":
                simpul[ids[i]], simpul[ids[i + 1]] = a, b
                if not w["tags"]["highway"].startswith("motorway"):
                    akses.update((ids[i], ids[i + 1]))
                m = d / v * 60
                tet[ids[i]].append((ids[i + 1], m))
                tet[ids[i + 1]].append((ids[i], m))
    return simpul, tet, ruas, akses


class Terdekat:
    def __init__(self, simpul):
        self.ember = collections.defaultdict(list)
        for n, (la, lo) in simpul.items():
            self.ember[(int(la // SEL_JALAN), int(lo // SEL_JALAN))].append((n, la, lo))

    def cari(self, lat, lon, maks=12):
        ci, cj = int(lat // SEL_JALAN), int(lon // SEL_JALAN)
        for r in range(maks):
            calon = [(km((lat, lon), (la, lo)), n) for di in range(-r, r + 1) for dj in range(-r, r + 1)
                     if max(abs(di), abs(dj)) == r for n, la, lo in self.ember.get((ci + di, cj + dj), [])]
            if calon:   # ponytail: cincin r ditemukan, cek satu cincin lagi; galat maks puluhan meter, cari sampai jarak terbaik terlampaui bila perlu persis
                calon += [(km((lat, lon), (la, lo)), n) for di in range(-r - 1, r + 2) for dj in range(-r - 1, r + 2)
                          if max(abs(di), abs(dj)) == r + 1 for n, la, lo in self.ember.get((ci + di, cj + dj), [])]
                return min(calon)
        return None


def dijkstra(tet, sumber):
    """sumber {simpul: menit awal} -> {simpul: menit} dari pos terdekat."""
    t = dict(sumber)
    h = [(m, n) for n, m in sumber.items()]
    heapq.heapify(h)
    while h:
        m, n = heapq.heappop(h)
        if m > t.get(n, 1e18):
            continue
        for v, w in tet.get(n, ()):
            mv = m + w
            if mv < t.get(v, 1e18):
                t[v] = mv
                heapq.heappush(h, (mv, v))
    return t


# ---------------- skor ----------------
def peringkat(nilai):
    """Peringkat persentil 0-1 (seri = rata-rata), None tetap None."""
    ada = sorted(v for v in nilai if v is not None)
    if len(ada) < 2:
        return [None if v is None else 0.5 for v in nilai]
    return [None if v is None else (bisect.bisect_left(ada, v) + bisect.bisect_right(ada, v) - 1) / 2 / (len(ada) - 1) for v in nilai]


def median_bobot(pasang):
    """pasang [(nilai, bobot)] -> median tertimbang."""
    pasang = sorted(pasang)
    tot, s = sum(b for _, b in pasang), 0
    for v, b in pasang:
        s += b
        if s >= tot / 2:
            return v
    return None


def kelas(urut, n):
    """urut 0 = tertinggi."""
    for batas, k, _ in KELAS:
        if urut < batas * n:
            return k
    return 0


# ---------------- kejadian & uji balik ----------------
def norm(s):
    s = (s or "").lower()
    s = re.sub(r"^(kota adm\.?|kota administrasi|kab\.? adm\.?|kabupaten administrasi|kota)\s+", "", s.strip())
    return re.sub(r"[^a-z0-9]", "", s)


def varian(kl):
    """'Kampung Tengah' -> juga 'Tengah'; 'Kampung Mester/Melayu' -> juga 'Kampung Melayu' (BIG menulis tanpa awalan / nama baru)."""
    v = [kl] + [norm(x) for x in re.split(r"/", kl) if x]
    v += [re.sub(r"^kampung", "", x) for x in v if x.startswith("kampung")]
    v += ["kampung" + norm(x) for x in kl.split("/")[1:]]
    return [x for x in dict.fromkeys(v) if x]


def cocokkan(kel, baris, kolom, kecuali=()):
    """baris satudata -> {indeks kelurahan: jumlah}. Kunci (kab, kec, kel) dinormalkan; lalu kelurahan saja bila unik di kota;
    lalu difflib >= 0,85 di kecamatan yang sama. Baris yang wilayah/kecamatannya memuat salah satu `kecuali` (mis. Kepulauan Seribu)
    dilewati. Kembalikan (hitung, tak_cocok Counter{(kab,kec,kel): jumlah})."""
    persis = {(norm(k["kab"]), norm(k["kec"]), norm(k["nama"])): i for i, k in enumerate(kel)}
    nama = collections.defaultdict(list)
    for i, k in enumerate(kel):
        nama[(norm(k["kab"]), norm(k["nama"]))].append(i)
    hit, tak = collections.Counter(), collections.Counter()
    for b in baris:
        try:
            n = int(float(str(b.get(kolom) or 0).replace(",", ".")))
        except ValueError:
            continue
        kab, kec = norm(b.get("wilayah")), norm(b.get("kecamatan"))
        if any(norm(x) in kab + "|" + kec for x in kecuali):
            continue
        mentah = (b.get("kelurahan") or "").lower()
        kl = norm(mentah)
        i = None
        for v in varian(mentah):
            i = persis.get((kab, kec, v))
            if i is None and len(nama.get((kab, v), [])) == 1:
                i = nama[(kab, v)][0]
            if i is not None:
                break
        if i is None:
            calon = [(difflib.SequenceMatcher(None, kl, norm(k["nama"])).ratio(), j) for j, k in enumerate(kel)
                     if norm(k["kab"]) == kab and difflib.SequenceMatcher(None, kec, norm(k["kec"])).ratio() >= 0.85]
            r, j = max(calon) if calon else (0, None)
            i = j if r >= 0.85 else None
        if i is None:
            tak[(b.get("wilayah"), b.get("kecamatan"), b.get("kelurahan"))] += n
        else:
            hit[i] += n
    return hit, tak


def tangkapan(prediksi, sasaran, puncak=PUNCAK):
    """Porsi total sasaran yang jatuh di `puncak` teratas menurut prediksi. Seri dipecah acak berbenih tetap."""
    acak = random.Random(BENIH)
    urut = sorted(range(len(prediksi)), key=lambda i: (-prediksi[i], acak.random()))
    k = max(1, round(puncak * len(urut)))
    tot = sum(sasaran)
    return sum(sasaran[i] for i in urut[:k]) / tot if tot else None


def spearman(a, b):
    ra, rb = peringkat(a), peringkat(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    sa = math.sqrt(sum((x - ma) ** 2 for x in ra))
    sb = math.sqrt(sum((y - mb) ** 2 for y in rb))
    return sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / (sa * sb) if sa and sb else None


def bandingkan(skor, pemb, sasaran):
    """Selisih tangkapan skor - pembanding dengan selang 90% bootstrap kelurahan."""
    d0 = tangkapan(skor, sasaran) - tangkapan(pemb, sasaran)
    acak, n, ds = random.Random(BENIH), len(skor), []
    for _ in range(ULANG):
        ix = [acak.randrange(n) for _ in range(n)]
        s = [sasaran[i] for i in ix]
        if sum(s):
            ds.append(tangkapan([skor[i] for i in ix], s) - tangkapan([pemb[i] for i in ix], s))
    ds.sort()
    return {"selisih": round(d0, 3), "selang90": [round(ds[int(.05 * len(ds))], 3), round(ds[int(.95 * len(ds)) - 1], 3)]}


def uji_balik(skor, pembanding, periode):
    """skor [float]; pembanding {nama: [float]}; periode {nama: (keterangan, [sasaran], {pembanding tambahan})}."""
    hasil, lulus = {}, True
    for p, (ket, sas, tambahan) in periode.items():
        r = {"keterangan": ket, "kejadian": sum(sas), "kelurahan_berkejadian": sum(1 for s in sas if s),
             "tangkapan": {"indeks": round(tangkapan(skor, sas), 3)}, "spearman": {"indeks": round(spearman(skor, sas), 3)}, "banding": {}}
        for nama, v in {**pembanding, **tambahan}.items():
            r["tangkapan"][nama] = round(tangkapan(v, sas), 3)
            r["spearman"][nama] = round(spearman(v, sas), 3)
            b = bandingkan(skor, v, sas)
            b["aturan"] = nama in pembanding
            b["lulus"] = b["selisih"] >= MARGIN and b["selang90"][0] > 0
            if b["aturan"] and not b["lulus"]:
                lulus = False
            r["banding"][nama] = b
        hasil[p] = r
    return {"aturan": f"tangkapan {round(PUNCAK * 100)}% teratas >= tiap pembanding beraturan + {round(MARGIN * 100)} poin, "
                      f"batas bawah selang 90% > 0, di semua periode", "lulus": lulus, "periode": hasil}


# ---------------- rakit ----------------
def hitung(prov):
    cfg = KOTA[prov]
    kel_semua = ambil_kelurahan(prov)
    kel = [k for k in kel_semua if k["kode"] and not any(x in k["kab"].lower() for x in cfg["kecuali_kab"])]
    print(f"kelurahan {len(kel)} (di luar cakupan {len(kel_semua) - len(kel)})", flush=True)
    cari = Pencari(kel)
    for k in kel:
        k["ha"] = luas_ha(k["cincin"])

    # bangunan per kelurahan, dan sel bangunan untuk waktu tempuh
    sel = ambil_bangunan(prov)
    nb, lb = collections.Counter(), collections.Counter()
    sel_kel = []
    for kunci, (n, a) in sel.items():
        i, j = map(int, kunci.split(","))
        lat, lon = (i + .5) / HALUS, (j + .5) / HALUS
        x = cari.cari(lon, lat)
        if x is None:
            continue
        nb[x] += n
        lb[x] += a
        sel_kel.append((x, lat, lon, n))
    print(f"bangunan {sum(nb.values()):,} di {len(sel_kel):,} sel", flush=True)

    # jalan, pos, hidran
    ways, air = ambil_osm(prov)
    simpul, tet, ruas, akses = graf(ways)
    dekat = Terdekat({n: simpul[n] for n in akses})
    pjg, pjg_gang = collections.Counter(), collections.Counter()
    for la, lo, d, kl in ruas:
        x = cari.cari(lo, la)
        if x is not None:
            pjg[x] += d
            if kl == "gang":
                pjg_gang[x] += d
    pos = []
    for b in ambil_satudata(cfg["pos"]):
        try:
            la, lo = float(b["latitude"]), float(b["longitude"])
        except (TypeError, ValueError, KeyError):
            continue
        if (b.get("status_pos") or "Aktif").strip().lower() == "aktif" and cfg["kotak"][0] - .1 <= la <= cfg["kotak"][2] + .1:
            pos.append((la, lo, (b.get("nama_pos_sektor") or "").strip()))
    sumber = {}
    for la, lo, _ in pos:
        t = dekat.cari(la, lo)
        if t:
            sumber[t[1]] = min(sumber.get(t[1], 1e9), t[0] / JALAN_KAKI * 60)
    menit = dijkstra(tet, sumber)
    print(f"jalan mobil {len(simpul):,} simpul, pos Damkar {len(pos)}, terjangkau {len(menit):,}", flush=True)

    waktu = collections.defaultdict(list)
    jauh = collections.Counter()
    for x, lat, lon, n in sel_kel:
        t = dekat.cari(lat, lon)
        if not t or t[1] not in menit:
            continue
        waktu[x].append((menit[t[1]] + t[0] / JALAN_KAKI * 60, n))
        if t[0] > 0.1:
            jauh[x] += n
    hid = collections.Counter()
    n_hidran = 0
    for e in air:
        tg = e.get("tags", {})
        if tg.get("emergency") != "fire_hydrant":
            continue
        la, lo = (e.get("lat"), e.get("lon")) if "lat" in e else (e.get("center", {}).get("lat"), e.get("center", {}).get("lon"))
        x = cari.cari(lo, la) if la is not None else None
        if x is not None:
            hid[x] += 1
            n_hidran += 1

    # komponen dan skor
    komp = {"tutupan": [], "kepadatan": [], "waktu": [], "sempit": []}
    for i, k in enumerate(kel):
        ada = nb[i] >= 50 and k["ha"] > 0
        komp["tutupan"].append(lb[i] / (k["ha"] * 1e4) if ada else None)
        komp["kepadatan"].append(nb[i] / k["ha"] if ada else None)
        komp["waktu"].append(median_bobot(waktu[i]) if ada and waktu[i] else None)
        komp["sempit"].append(pjg_gang[i] / pjg[i] if ada and pjg[i] > 0.5 else None)
    pr = {kk: peringkat(v) for kk, v in komp.items()}
    skor = []
    for i in range(len(kel)):
        v = [pr[kk][i] for kk in komp]
        skor.append(round(100 * sum(v) / 4, 1) if None not in v else None)
    ber = sorted((s, i) for i, s in enumerate(skor) if s is not None)[::-1]
    kls = [None] * len(kel)
    for u, (_, i) in enumerate(ber):
        kls[i] = kelas(u, len(ber))

    # kejadian
    hit_a, tak_a = cocokkan(kel, ambil_satudata(cfg["kejadian_a"]), "jumlah", cfg["kecuali_kab"])
    hit_b, tak_b = cocokkan(kel, ambil_satudata(cfg["kejadian_b"]), "frekuensi", cfg["kecuali_kab"])
    tahun_a = sorted({str(b.get("periode_data")) for b in ambil_satudata(cfg["kejadian_a"])})
    tahun_b = sorted({str(b.get("periode_data")) for b in ambil_satudata(cfg["kejadian_b"])})
    print(f"kejadian A {sum(hit_a.values())} cocok, {sum(tak_a.values())} tak cocok; B {sum(hit_b.values())} cocok, {sum(tak_b.values())} tak cocok", flush=True)

    ix = [i for i in range(len(kel)) if skor[i] is not None]
    S = [skor[i] for i in ix]
    uji = uji_balik(S, {"jumlah_bangunan": [nb[i] for i in ix], "kepadatan_saja": [komp["kepadatan"][i] for i in ix]},
                    {"A": (f"{tahun_a[0]}–{tahun_a[-1]}", [hit_a[i] for i in ix], {}),
                     "B": (f"{tahun_b[0]}–{tahun_b[-1]}", [hit_b[i] for i in ix], {"riwayat_A": [hit_a[i] for i in ix]})})
    # Ditambahkan SESUDAH melihat vonis (indeks kalah dari jumlah bangunan): apakah indeks setidaknya menunjuk kelurahan yang
    # LAJU kebakarannya per bangunan tinggi? Hanya keterangan; tidak mengubah `lulus`.
    laju = lambda hit: [1000 * hit[i] / nb[i] for i in ix]
    uji["kepekaan_pascahoc"] = {
        "keterangan": "Spearman terhadap kejadian per 1.000 bangunan; ditambahkan sesudah melihat hasil, tidak dipakai vonis",
        **{p: {"indeks": round(spearman(S, laju(h)), 3), **{kk: round(spearman([komp[kk][i] for i in ix], laju(h)), 3) for kk in komp}}
           for p, h in (("A", hit_a), ("B", hit_b))}}
    uji["tak_cocok"] = {"A": sum(tak_a.values()), "B": sum(tak_b.values()),
                        "contoh": [list(k) + [n] for k, n in (tak_a + tak_b).most_common(8)]}

    r1 = lambda v, d=1: None if v is None else round(v, d)
    baris = []
    for i, k in enumerate(kel):
        baris.append([k["kode"], k["nama"], k["kec"], re.sub(r"^Kota Administrasi ", "", k["kab"]), skor[i], kls[i],
                      r1(komp["tutupan"][i] and 100 * komp["tutupan"][i]), r1(komp["kepadatan"][i]), r1(komp["waktu"][i]),
                      r1(komp["sempit"][i] and 100 * komp["sempit"][i]), round(100 * jauh[i] / nb[i]) if nb[i] else None,
                      nb[i], hid[i], hit_a[i], hit_b[i]])
    geo = {k["kode"]: [[[round(x, 5), round(y, 5)] for x, y in sederhana(r, 0.00012)] for r in k["cincin"] if len(r) >= 4] for k in kel}
    meta = {
        "label": LABEL if not uji["lulus"] else "lulus uji balik, tetap relatif terhadap kelurahan lain di kota ini",
        "prov": prov, "kota": cfg["nama"],
        "kolom": ["kode", "nama", "kec", "kab", "skor", "kelas", "tutupan_pct", "bangunan_per_ha", "menit_damkar", "gang_pct",
                  "jauh_jalan_pct", "bangunan", "hidran_osm", "kejadian_a", "kejadian_b"],
        "kelas": [[k, n] for _, k, n in sorted(KELAS, key=lambda x: x[1])],
        "ringkasan": {"kelurahan": len(kel), "berskor": len(ix), "bangunan": sum(nb.values()), "pos_damkar": len(pos),
                      "hidran_osm": n_hidran, "kelurahan_di_luar": len(kel_semua) - len(kel), "kab_di_luar": cfg["kecuali_kab"][0]},
        "asumsi": {"kecepatan_kmj": KECEPATAN, "jalan_kaki_kmj": JALAN_KAKI, "lebar_min_m": LEBAR_MIN, "keyakinan_bangunan": KEYAKINAN},
        "sumber": ["Batas desa/kelurahan: Badan Informasi Geospasial", "Pos Damkar dan kebakaran (semua jenis): Dinas Gulkarmat DKI, Satu Data Jakarta",
                   "Jalan dan hidran: (c) kontributor OpenStreetMap (ODbL)", "Bangunan: Google Open Buildings v3 (CC BY 4.0)"],
        "pos": [[round(a, 5), round(b, 5), n] for a, b, n in pos],
        "baris": baris, "ujibalik": uji,
    }
    _kej.simpan(os.path.join(KELUAR, f"kebakaran_{prov}.json"), meta)
    _kej.simpan(os.path.join(KELUAR, f"kebakaran_geo_{prov}.json"), {"prov": prov, "kel": geo})
    return meta


# ---------------- swa-uji ----------------
def cek():
    persegi = [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
    lubang = persegi + [[[.4, .4], [.6, .4], [.6, .6], [.4, .6], [.4, .4]]]
    assert dalam(.5, .5, persegi) and not dalam(.5, .5, lubang) and dalam(.2, .2, lubang) and not dalam(1.5, .5, persegi)
    # luas: kotak 0,01 derajat di khatulistiwa ~ 123 ha; lubang mengurangi
    k = [[[0, 0], [0, .01], [.01, .01], [.01, 0], [0, 0]]]
    assert 120 < luas_ha(k) < 126, luas_ha(k)
    assert luas_ha(k + [[[.004, .004], [.006, .004], [.006, .006], [.004, .006], [.004, .004]]]) < luas_ha(k)
    # DP: titik segaris dibuang, sudut dipertahankan
    assert sederhana([[0, 0], [1, 0], [2, 0], [3, 0], [3, 3], [0, 0]], 0.01) == [[0, 0], [3, 0], [3, 3], [0, 0]]
    # kelas jalan
    assert kelas_jalan({"highway": "residential"}) == "mobil" and kelas_jalan({"highway": "footway"}) == "gang"
    assert kelas_jalan({"highway": "residential", "width": "2.5 m"}) == "gang" and kelas_jalan({"highway": "service", "service": "driveway"}) is None
    assert kelas_jalan({"highway": "residential", "width": "3,0"}) == "gang"
    assert kelas_jalan({"highway": "service", "service": "alley"}) == "gang" and kelas_jalan({"highway": "proposed"}) is None
    # graf + Dijkstra multi-sumber: A-B-C lurus 1 km tiap ruas residential (18 km/jam = 3,33 menit/km); gang tidak masuk graf
    W = [{"type": "way", "tags": {"highway": "residential"}, "nodes": [1, 2, 3], "geometry": [{"lat": 0, "lon": 0}, {"lat": 0, "lon": 1 / 111.2}, {"lat": 0, "lon": 2 / 111.2}]},
         {"type": "way", "tags": {"highway": "footway"}, "nodes": [3, 4], "geometry": [{"lat": 0, "lon": 2 / 111.2}, {"lat": 0, "lon": 3 / 111.2}]}]
    W.append({"type": "way", "tags": {"highway": "motorway"}, "nodes": [3, 5], "geometry": [{"lat": 0, "lon": 2 / 111.2}, {"lat": 0, "lon": 2.0001 / 111.2}]})
    s, t, r, ak = graf(W)
    assert ak == {1, 2, 3} and 5 in s, "simpul tol masuk graf tapi bukan titik akses"
    del s[5]
    assert set(s) == {1, 2, 3} and len(r) == 4 and sum(1 for x in r if x[3] == "gang") == 1
    m = dijkstra(t, {1: 0.0, 3: 1.0})
    assert abs(m[2] - 60 / 18) < 0.01 and m[3] == 1.0, m
    assert Terdekat(s).cari(0.0001, 1.9 / 111.2)[1] == 3
    # peringkat, median, kelas
    assert peringkat([3, 1, 2, None]) == [1.0, 0.0, 0.5, None] and peringkat([1, 1]) == [0.5, 0.5]
    assert median_bobot([(10, 1), (1, 5), (5, 1)]) == 1
    assert [kelas(u, 10) for u in range(10)] == [3, 2, 2, 1, 1, 1, 0, 0, 0, 0]
    # bangunan: baris di luar kotak dan di bawah ambang keyakinan dibuang
    sel = tambah_bangunan({}, [b"-6.2,106.8,40.0,0.9,POLYGON,x", b"-6.2,106.8,10,0.5,P,x", b"-7,106.8,10,0.9,P,x", b"rusak"], KOTA["31"]["kotak"])
    assert list(sel.values()) == [[1, 40.0]], sel
    # pencocokan nama Satu Data -> BIG: spasi/awalan kota, nama unik di kota, salah eja ringan
    kel = [{"kab": "Kota Administrasi Jakarta Timur", "kec": "Kramatjati", "nama": "Kampung Tengah"},
           {"kab": "Kota Administrasi Jakarta Pusat", "kec": "Cempaka Putih", "nama": "Cempaka Putih Barat"}]
    h, tak = cocokkan(kel, [{"wilayah": "Jakarta Timur", "kecamatan": "Kramat Jati", "kelurahan": "Kampung Tengah", "jumlah": "2"},
                            {"wilayah": "Kota Adm. Jakarta Pusat", "kecamatan": "Cempaka Putih", "kelurahan": "Cempaka Putih Barat ", "jumlah": "1"},
                            {"wilayah": "Jakarta Pusat", "kecamatan": "Cempaka Puti", "kelurahan": "Cempaka Puth Barat", "jumlah": "4"},
                            {"wilayah": "Jakarta Utara", "kecamatan": "Koja", "kelurahan": "Tugu", "jumlah": "3"}], "jumlah")
    assert h == {0: 2, 1: 5} and sum(tak.values()) == 3, (h, tak)
    kel2 = [{"kab": "Kota Administrasi Jakarta Timur", "kec": "Kramatjati", "nama": "Tengah"}, {"kab": "Kota Administrasi Jakarta Timur", "kec": "Jatinegara", "nama": "Kampung Melayu"}]
    h, tak = cocokkan(kel2, [{"wilayah": "Jakarta Timur", "kecamatan": "Kramat Jati", "kelurahan": "Kampung Tengah", "jumlah": "3"},
                             {"wilayah": "Jakarta Timur", "kecamatan": "Jatinegara", "kelurahan": "Kampung Mester/Melayu", "jumlah": "2"},
                             {"wilayah": "Jakarta Utara", "kecamatan": "Kepulauan Seribu Selatan", "kelurahan": "Pulau Tidung", "jumlah": "9"}], "jumlah", ["kepulauan seribu"])
    assert h == {0: 3, 1: 2} and not tak, (h, tak)
    assert kelas_jalan({"highway": "footway", "footway": "sidewalk"}) is None and kelas_jalan({"highway": "pedestrian", "area": "yes"}) is None
    # uji balik: sasaran terkonsentrasi di skor tinggi -> tangkapan 1; pembanding acak kalah, aturan lulus
    sk = list(range(50))
    sas = [5 if i >= 40 else 0 for i in range(50)]
    assert tangkapan(sk, sas) == 1.0 and tangkapan([1] * 50, [1] * 50) == 0.2
    assert abs(spearman(sk, sk) - 1) < 1e-9
    u = uji_balik(sk, {"naif": [i % 7 for i in range(50)]}, {"A": ("x", sas, {}), "B": ("y", sas, {"riwayat": sas})})
    assert u["lulus"] and u["periode"]["B"]["banding"]["riwayat"]["aturan"] is False
    u = uji_balik(sk, {"naif": sk}, {"A": ("x", sas, {})})
    assert not u["lulus"], "pembanding setara harus membuat gagal (margin 5 poin)"
    print("cek kebakaran.py: semua lulus")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--prov", default="31", choices=sorted(KOTA))
    ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    if a.cek:
        cek()
    else:
        m = hitung(a.prov)
        print(json.dumps({"ringkasan": m["ringkasan"], "label": m["label"], "lulus": m["ujibalik"]["lulus"]}, ensure_ascii=False))
