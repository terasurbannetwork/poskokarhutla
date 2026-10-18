"""Bukti DAS hulu untuk daerah langganan banjir: batas daerah tangkapan, hutan hilang per tahun, konsesi di hulu.

Pakai:  python3 scripts/banjir/bukti_das.py            # bangun semua daerah -> public/banjir/data/bukti/{index,<slug>}.json
        python3 scripts/banjir/bukti_das.py bangun "32|Bogor,11|Aceh Selatan"   # hanya kabupaten itu (kunci "prov|kab", dipisah koma)
        python3 scripts/banjir/bukti_das.py lengkapi    # hitung ulang bidang turunan (korelasi, tumpuk, % kabupaten, sumber) tanpa jaringan
        python3 scripts/banjir/bukti_das.py uji         # invarian berkas hasil + uji fungsi murni (luring)
Lalu  python3 scripts/banjir/citra_banjir.py            # menambah citra sebelum-sesudah ke berkas yang sama

JALAN MANUAL / jarang (seperti scripts/data/konsesi_laporan.py), BUKAN bagian banjir.yml harian: DAS dan hutan hilang
berubah setahun sekali (rilis Hansen), kejadian DIBI berubah pelan. Satu daerah ~2-6 menit (jaringan GCS), seluruhnya ~30 menit.
Hasilnya (JSON + PNG) di-commit; data/raw/banjir/das/ (zip HydroBASINS ~70 MB) tidak.

Sumber (semua terbuka):
- Batas DAS: HydroBASINS v1c level 9 (Lehner & Grill 2013, HydroSHEDS, data.hydrosheds.org), file as + au, rantai NEXT_DOWN.
  Hulu sebuah sub-DAS = dirinya + semua sub-DAS yang aliran akhirnya sampai di situ; poligon digabung dengan membuang sisi bersama.
- Hutan: Hansen/UMD/Google/USGS/NASA Global Forest Change v1.13 (2001-2025), treecover2000 dan lossyear, 30 m, CC BY 4.0,
  dibaca langsung dari storage.googleapis.com/earthenginepartners-hansen lewat HTTP Range per baris (LZW, tanpa unduh 85-280 MB).
  Hutan awal = tutupan kanopi tahun 2000 >= 30%. Hutan hilang = piksel hutan itu yang ditandai hilang pada tahun tertentu.
  Cuplikan: satu piksel tiap 4 (120 m), hasil dikali luas sel. Diuji sekali terhadap hitung penuh (S=1) pada jendela 0,06 x 0,06 derajat
  di Rokan Hulu (4.431 ha, 18 Okt 2026): luas -0,0%, hutan awal +0,3%, hutan hilang total -1,4%, per tahun (>100 ha) sampai +-4,2%,
  selisih mutlak per tahun maksimum 17 ha. Karena itu angka konsesi atau per tahun di bawah 10 ha tampil "~" di layar (derau cuplikan).
- Konsesi: public/data/lahan/konsesi.geojson (sawit GFW/Kemenhut 2014, HPH GFW 2014, HTI Trase 2026, tambang PPKH Kemenhut Jan 2026),
  dipotong ke DAS pada cuplikan yang sama.
- Kejadian banjir: public/banjir/data/kejadian.json (DIBI/BNPB per kabupaten per tahun). Status: status.json.

Batas yang jujur:
- Aturan titik keluaran (juga ditulis di layar): sub-DAS terbesar (luas tangkapan <= PLAFON_KM2) yang memuat pusat kecamatan di kabupaten itu; bukan titik banjir persis.
- Hansen "hilang" = tutupan kanopi hilang karena sebab apa pun (tebang HTI daur ulang, panen sawit, longsor, kebakaran, bukan hanya
  deforestasi permanen) dan bisa terjadi sebelum izin konsesi terbit. Batas konsesi adalah salinan terakhir, bukan batas tiap tahun.
- Kejadian DIBI tercatat per kabupaten dan tidak lengkap (terutama 2024); korelasi dengan hutan hilang per tahun hanya menunjukkan
  dua deret bergerak searah atau tidak, bukan sebab-akibat. Hujan ekstrem dan tata guna lahan di hilir ikut menentukan.

Ukuran dijaga: tiap <slug>.json <= PLAFON_JSON byte, tiap PNG citra <= 120 KB, seluruh public/banjir/data/bukti <= PLAFON_TOTAL byte.
"""
import collections, datetime as dt, gzip, json, math, os, re, struct, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import KELUAR as KELUAR_BANJIR, MENTAH, simpan
from wilayah import AKAR, PROVINSI

sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
import lahan as L  # noqa: E402  (baca_shp, dp; berkasnya aman diimpor, main dijaga)

DAS_DIR = os.path.join(MENTAH, "das")
KELUAR = os.path.join(KELUAR_BANJIR, "bukti")
ZIP = [os.path.join(DAS_DIR, f"hybas_{w}_lev09_v1c.zip") for w in ("as", "au")]
KONSESI = os.path.join(AKAR, "public/data/lahan/konsesi.geojson")
PLAFON_KM2 = 25_000     # luas tangkapan terbesar yang dipakai sebagai titik keluaran
MIN_KM2 = 300           # lebih kecil dari ini bukan DAS yang berarti untuk hutan
N_DAERAH, MAKS_PER_PROV, MAKS_JAWA = 10, 2, 4   # Jawa (kode 31-36) dibatasi: konsesi sawit/HTI/tambang di sana sedikit, bukti hulunya kurang beragam
PLAFON_JSON, PLAFON_TOTAL, PLAFON_PNG = 200_000, 6_000_000, 120_000
INDO = (94, -11.5, 141.5, 6.5)
HANSEN = "https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_{}_{}.tif"
PX, S, UJUNG = 0.00025, 4, 40000     # derajat per piksel Hansen, langkah cuplik, sisi ubin
TAHUN0 = 2000
JENIS = ("sawit", "hti", "hph", "tambang")
UA = {"User-Agent": "poskobanjir/1.0 (+github.com/pangantara/poskokarhutla)"}


# ---------------------------------------------------------------- geometri murni
def luas_ring(r):
    """luas bertanda (derajat^2, shoelace); negatif = searah jarum jam (cincin luar shapefile)"""
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1])) / 2


def km2(r):
    lat = sum(p[1] for p in r) / len(r)
    return abs(luas_ring(r)) * 111.32 * math.cos(math.radians(lat)) * 110.574


def di_dalam(x, y, rings):
    """even-odd atas semua cincin (lubang ikut)"""
    c = False
    for r in rings:
        for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
    return c


def larutkan(rings):
    """Gabung poligon bertetangga: sisi yang dilalui dua arah berlawanan dibuang, sisanya dirangkai jadi cincin.
    -> (cincin luar [..], lubang [..]); luar = searah jarum jam seperti di shapefile."""
    ada = {}
    for r in rings:
        for a, b in zip(r, r[1:]):
            if a == b:
                continue
            if (b, a) in ada and ada[(b, a)] > 0:
                ada[(b, a)] -= 1
            else:
                ada[(a, b)] = ada.get((a, b), 0) + 1
    ke = collections.defaultdict(list)
    for (a, b), n in ada.items():
        ke[a] += [b] * n
    hasil = []
    for awal in list(ke):
        while ke[awal]:
            r, p = [awal], awal
            while True:
                q = ke[p].pop()
                r.append(q)
                p = q
                if p == awal or not ke[p]:
                    break
            if p == awal and len(r) >= 4:
                hasil.append(r)
    luar = [r for r in hasil if luas_ring(r) < 0]
    return luar, [r for r in hasil if luas_ring(r) > 0]


def sederhana(r, tol=0.002):
    s = L.dp(r[:-1], tol) if r[0] == r[-1] else L.dp(r, tol)
    return s + [s[0]] if len(s) >= 3 else None


def poligon_geojson(luar, lubang):
    """MultiPolygon GeoJSON, 4 desimal; lubang masuk ke luar terkecil yang memuatnya"""
    luar = sorted(luar, key=lambda r: luas_ring(r))  # paling besar dulu (paling negatif)
    ps = [[[list(map(lambda v: round(v, 4), p)) for p in r[::-1]]] for r in luar]
    for h in lubang:
        for i in range(len(luar) - 1, -1, -1):
            if di_dalam(h[0][0], h[0][1], [luar[i]]):
                ps[i].append([list(map(lambda v: round(v, 4), p)) for p in h[::-1]])
                break
    return {"type": "MultiPolygon", "coordinates": ps}


class Garis:
    """Scanline even-odd: x-silang cincin pada lintang y -> rentang [(x1, x2)] terurut."""

    def __init__(self, rings):
        self.sisi = [(a[0], a[1], b[0], b[1]) for r in rings for a, b in zip(r, r[1:] + ([r[0]] if r[0] != r[-1] else []))
                     if a[1] != b[1]]
        ys = [e[1] for e in self.sisi] + [e[3] for e in self.sisi]
        xs = [e[0] for e in self.sisi] + [e[2] for e in self.sisi]
        self.bbox = (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, 0, 0)

    def rentang(self, y):
        if not (self.bbox[1] <= y <= self.bbox[3]):
            return []
        x = sorted(x1 + (y - y1) * (x2 - x1) / (y2 - y1) for x1, y1, x2, y2 in self.sisi if (y1 > y) != (y2 > y))
        return list(zip(x[0::2], x[1::2]))


def potong(a, b):
    """irisan dua daftar interval inklusif terurut"""
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        lo, hi = max(a[i][0], b[j][0]), min(a[i][1], b[j][1])
        if lo <= hi:
            out.append((lo, hi))
        if a[i][1] < b[j][1]:
            i += 1
        else:
            j += 1
    return out


def gabung(a):
    out = []
    for lo, hi in sorted(a):
        if out and lo <= out[-1][1] + 1:
            out[-1] = (out[-1][0], max(out[-1][1], hi))
        else:
            out.append((lo, hi))
    return out


# ---------------------------------------------------------------- HydroBASINS
def lintas_zip():
    for z in ZIP:
        if os.path.exists(z):
            yield from L.baca_shp(z)


def bbox_ring(rings):
    xs = [p[0] for r in rings for p in r]
    ys = [p[1] for r in rings for p in r]
    return min(xs), min(ys), max(xs), max(ys)


def indeks_basin(titik):
    """Satu lintasan: atribut semua sub-DAS Indonesia + sub-DAS yang memuat pusat kecamatan.
    titik: {kunci: (lat, lon)} -> (attr {id: (next_down, sub_km2, up_km2)}, milik {kunci: id})"""
    sel = collections.defaultdict(list)
    for k, (la, lo) in titik.items():
        sel[(int(la * 10 // 1), int(lo * 10 // 1))].append((k, la, lo))
    attr, milik = {}, {}
    for p, rings in lintas_zip():
        if not rings:
            continue
        bb = bbox_ring(rings)
        cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        if not (INDO[0] <= cx <= INDO[2] and INDO[1] <= cy <= INDO[3]):
            continue
        i = int(p["hybas_id"])
        attr[i] = (int(p["next_down"]), float(p["sub_area"]), float(p["up_area"]))
        for gx in range(int(bb[1] * 10 // 1), int(bb[3] * 10 // 1) + 1):
            for gy in range(int(bb[0] * 10 // 1), int(bb[2] * 10 // 1) + 1):
                for k, la, lo in sel.get((gx, gy), ()):
                    if k not in milik and bb[0] <= lo <= bb[2] and bb[1] <= la <= bb[3] and di_dalam(lo, la, rings):
                        milik[k] = i
    return attr, milik


def hulu(attr, keluar):
    """id sub-DAS yang aliran akhirnya sampai di `keluar` (termasuk dirinya)"""
    anak = collections.defaultdict(list)
    for i, (nd, _, _) in attr.items():
        if nd:
            anak[nd].append(i)
    out, tumpuk = {keluar}, [keluar]
    while tumpuk:
        for c in anak[tumpuk.pop()]:
            if c not in out:
                out.add(c)
                tumpuk.append(c)
    return out


# ---------------------------------------------------------------- Hansen lewat HTTP Range
def rentang(url, a, b, coba=4):
    for i in range(coba):
        try:
            h = dict(UA, Range=f"bytes={a}-{b - 1}")
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=90) as r:
                return r.read()
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(2 * (i + 1))


def lzw(data):
    """dekompresi LZW TIFF (MSB dulu, early change); berhenti di kode EOI"""
    tabel = [bytes([i]) for i in range(256)] + [b"", b""]
    out, buf, nb, w, prev, i, n = [], 0, 0, 9, None, 0, len(data)
    while True:
        while nb < w:
            if i >= n:
                return b"".join(out)
            buf = (buf << 8) | data[i]
            i += 1
            nb += 8
        nb -= w
        kode = (buf >> nb) & ((1 << w) - 1)
        buf &= (1 << nb) - 1
        if kode == 257:
            return b"".join(out)
        if kode == 256:
            del tabel[258:]
            w, prev = 9, None
            continue
        if prev is None:
            s = tabel[kode]
        else:
            s = tabel[kode] if kode < len(tabel) else prev + prev[:1]
            tabel.append(prev + s[:1])
        out.append(s)
        prev = s
        t = len(tabel)
        w = 9 if t < 511 else 10 if t < 1023 else 11 if t < 2047 else 12


def lzw_enkode(data):
    """pasangan uji untuk lzw(): enkoder LZW TIFF sederhana (kode lebar sama dengan dekoder)"""
    tabel = {bytes([i]): i for i in range(256)}
    bits, buf, nb, w = [], 0, 0, 9
    def tulis(k):
        nonlocal buf, nb
        buf = (buf << w) | k
        nb += w
        while nb >= 8:
            nb -= 8
            bits.append((buf >> nb) & 255)
            buf &= (1 << nb) - 1
    tulis(256)
    s = b""
    for c in data:
        sc = s + bytes([c])
        if sc in tabel:
            s = sc
            continue
        tulis(tabel[s])
        tabel[sc] = len(tabel) + 2
        t = len(tabel) + 1  # enkoder satu entri di depan dekoder
        w = 9 if t < 511 else 10 if t < 1023 else 11 if t < 2047 else 12
        if t >= 4093:
            tulis(256)
            tabel = {bytes([i]): i for i in range(256)}
            w = 9
        s = bytes([c])
    if s:
        tulis(tabel[s])
    tulis(257)
    if nb:
        bits.append((buf << (8 - nb)) & 255)
    return bytes(bits)


class Ubin:
    """Satu ubin Hansen 10 x 10 derajat (strip 1 baris, LZW). Tabel strip di-cache di data/raw/banjir/das."""

    def __init__(self, lapis, atas, kiri):
        ns = f"{abs(atas):02d}{'N' if atas >= 0 else 'S'}"
        ew = f"{kiri:03d}{'E' if kiri >= 0 else 'W'}"
        self.url = HANSEN.format(lapis, f"{ns}_{ew}")
        self.atas, self.kiri = atas, kiri
        cache = os.path.join(DAS_DIR, f"strip_{lapis}_{ns}_{ew}.json")
        if os.path.exists(cache):
            self.off, self.cnt = json.load(open(cache))
        else:
            kepala = rentang(self.url, 0, 4096)
            assert kepala[:2] == b"II", f"{self.url}: bukan TIFF little-endian"
            o = struct.unpack("<I", kepala[4:8])[0]
            tg = {}
            for j in range(struct.unpack("<H", kepala[o:o + 2])[0]):
                t, ty, c, v = struct.unpack("<HHII", kepala[o + 2 + 12 * j:o + 14 + 12 * j])
                tg[t] = (c, v)
            assert tg[259][1] == 5 and tg[256][1] == UJUNG and tg[257][1] == UJUNG and tg[273][0] == UJUNG, f"{self.url}: struktur tak terduga {tg}"
            self.off = list(struct.unpack(f"<{UJUNG}I", rentang(self.url, tg[273][1], tg[273][1] + 4 * UJUNG)))
            self.cnt = list(struct.unpack(f"<{UJUNG}I", rentang(self.url, tg[279][1], tg[279][1] + 4 * UJUNG)))
            os.makedirs(DAS_DIR, exist_ok=True)
            json.dump([self.off, self.cnt], open(cache, "w"))

    def blok(self, y0, y1):
        """baris y0..y1 inklusif -> {y: 40000 byte}; satu permintaan Range bila strip berurutan"""
        a, b = self.off[y0], self.off[y1] + self.cnt[y1]
        if b - a > 8_000_000 or any(self.off[y + 1] != self.off[y] + self.cnt[y] for y in range(y0, y1)):
            return {y: lzw(rentang(self.url, self.off[y], self.off[y] + self.cnt[y])) for y in range(y0, y1 + 1)}
        raw = rentang(self.url, a, b)
        return {y: lzw(raw[self.off[y] - a:self.off[y] - a + self.cnt[y]]) for y in range(y0, y1 + 1)}


T30 = bytes(1 if v >= 30 else 0 for v in range(256))


def tally(hilang, tutup, k0, k1):
    """interval kolom cuplik inklusif [k0, k1] pada satu baris -> (sel, sel hutan, Counter tahun hilang pada piksel hutan)"""
    ls = hilang[k0 * S:k1 * S + 1:S]
    ts = tutup[k0 * S:k1 * S + 1:S]
    n = len(ls)
    hutan = ts.translate(T30)
    gabung_ = bytes(l if f else 0 for l, f in zip(ls, hutan))
    c = collections.Counter(gabung_)
    c.pop(0, None)
    return n, hutan.count(1), c


class Jumlah:
    """penjumlah hektare: sel, hutan awal, hilang per tahun"""
    __slots__ = ("ha", "hutan", "hilang")

    def __init__(self):
        self.ha = self.hutan = 0.0
        self.hilang = collections.defaultdict(float)

    def tambah(self, t, ha_sel):
        n, f, c = t
        self.ha += n * ha_sel
        self.hutan += f * ha_sel
        for y, v in c.items():
            self.hilang[TAHUN0 + y] += v * ha_sel

    def total(self):
        return sum(self.hilang.values())


def ha_sel(lat):
    return (S * PX * 111.32 * math.cos(math.radians(lat))) * (S * PX * 110.574) * 100


def hitung_hansen(garis_das, konsesi, sedang=print):
    """Cuplik Hansen di dalam DAS. konsesi: [(id, jenis, Garis)]. -> (das Jumlah, {jenis: Jumlah}, {id: Jumlah}, titik_hilang)"""
    lo0, la0, lo1, la1 = garis_das.bbox
    das, per_j, per_k = Jumlah(), {j: Jumlah() for j in JENIS + ("semua",)}, collections.defaultdict(Jumlah)
    sel_hilang = collections.Counter()
    for atas in range(int(math.ceil(la1 / 10.0)) * 10, int(math.ceil(la0 / 10.0)) * 10 - 1, -10):
        for kiri in range(int(math.floor(lo0 / 10.0)) * 10, int(math.floor(lo1 / 10.0)) * 10 + 1, 10):
            ya = max(0, int((atas - la1) / PX))
            yb = min(UJUNG - 1, int((atas - la0) / PX) + 1)
            baris = [y for y in range(ya - ya % S, yb + 1, S) if y >= ya]
            tugas = []
            for y in baris:
                lat = atas - (y + .5) * PX
                r = [((a - kiri) / PX / S, (b - kiri) / PX / S) for a, b in garis_das.rentang(lat)]
                r = [(max(0, math.ceil(a)), min(UJUNG // S - 1, math.floor(b))) for a, b in r]
                r = [x for x in r if x[0] <= x[1]]
                if r:
                    tugas.append((y, lat, r))
            if not tugas:
                continue
            ub = {l: Ubin(l, atas, kiri) for l in ("lossyear", "treecover2000")}
            grup = collections.defaultdict(list)
            for t in tugas:
                grup[t[0] // 32].append(t)
            def ambil(g):
                ys = [t[0] for t in g]
                return g, ub["lossyear"].blok(min(ys), max(ys)), ub["treecover2000"].blok(min(ys), max(ys))
            with ThreadPoolExecutor(12) as ex:
                for g, hl, tc in ex.map(ambil, list(grup.values())):
                    for y, lat, r in g:
                        ha = ha_sel(lat)
                        for k0, k1 in r:
                            t = tally(hl[y], tc[y], k0, k1)
                            das.tambah(t, ha)
                            baru = sum(v for yy, v in t[2].items() if yy >= 21)
                            if baru:
                                sel_hilang[(round(lat / .05), round((kiri + (k0 + k1) / 2 * S * PX) / .05))] += baru
                        uni = collections.defaultdict(list)
                        for kid, jenis, gk in konsesi:
                            if not (gk.bbox[1] <= lat <= gk.bbox[3]):
                                continue
                            rk = [((a - kiri) / PX / S, (b - kiri) / PX / S) for a, b in gk.rentang(lat)]
                            rk = [(math.ceil(a), math.floor(b)) for a, b in rk]
                            rk = potong([x for x in rk if x[0] <= x[1]], r)
                            for k0, k1 in rk:
                                per_k[kid].tambah(tally(hl[y], tc[y], k0, k1), ha)
                            uni[jenis] += rk
                            uni["semua"] += rk
                        for jenis, rk in uni.items():
                            for k0, k1 in gabung(rk):
                                per_j[jenis].tambah(tally(hl[y], tc[y], k0, k1), ha)
                    sedang(f"    ubin {atas}/{kiri}: baris {g[-1][0]}")
    titik = None
    if sel_hilang:
        (a, b), _ = sel_hilang.most_common(1)[0]
        titik = [round(a * .05, 3), round(b * .05, 3)]
    return das, per_j, per_k, titik


# ---------------------------------------------------------------- data repo
def baca_json(*jalur):
    return json.load(open(os.path.join(AKAR, *jalur)))


def pearson(x, y):
    n = len(x)
    if n < 4:
        return None
    mx, my = sum(x) / n, sum(y) / n
    sx = math.sqrt(sum((a - mx) ** 2 for a in x))
    sy = math.sqrt(sum((b - my) ** 2 for b in y))
    return None if sx == 0 or sy == 0 else sum((a - mx) * (b - my) for a, b in zip(x, y)) / (sx * sy)


def peringkat(x):
    urut = sorted(range(len(x)), key=lambda i: x[i])
    r, i = [0.0] * len(x), 0
    while i < len(x):
        j = i
        while j + 1 < len(x) and x[urut[j + 1]] == x[urut[i]]:
            j += 1
        for k in range(i, j + 1):
            r[urut[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def r_kritis(n):
    """|r| minimum agar tak dapat dibedakan dari kebetulan (uji dua sisi 5%, aproksimasi t); n=14 -> 0,53"""
    df = n - 2
    t = 1.96 + 2.4 / df + 1.0 / df ** 2 if df > 0 else 99
    return t / math.sqrt(df + t * t)


def korelasi(kej, hilang, dari=2010, sampai=2023):
    """Pearson, Spearman, dan Pearson selisih tahunan antara hutan hilang per tahun dan kejadian banjir DIBI per tahun.
    Hanya tahun yang ada catatannya (tahun tanpa catatan TIDAK diisi 0). r=None bila kejadian < 30 atau tahun berkejadian > 0 kurang dari 8."""
    th = [y for y in range(dari, sampai + 1) if str(y) in kej]
    k = [kej[str(y)] for y in th]
    x = [hilang.get(str(y), 0) for y in th]
    aktif = sum(1 for v in k if v > 0)
    out = {"n": len(th), "dari": dari, "sampai": sampai, "total_kejadian": sum(k), "tahun_berkejadian": aktif,
           "bisa": sum(k) >= 30 and aktif >= 8, "r": None, "rho": None, "r_selisih": None, "r_kritis": round(r_kritis(len(th)), 2)}
    if out["bisa"]:
        r = pearson(x, k)
        rho = pearson(peringkat(x), peringkat(k))
        sel = [(x[i] - x[i - 1], k[i] - k[i - 1]) for i in range(1, len(th)) if th[i] - th[i - 1] == 1]
        rs = pearson([a for a, _ in sel], [b for _, b in sel])
        out.update(r=None if r is None else round(r, 2), rho=None if rho is None else round(rho, 2),
                   r_selisih=None if rs is None else round(rs, 2))
        out["bisa"] = r is not None
    return out


BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def rentang_hari(hari):
    """['2026-10-13', ..., '2026-10-16'] -> '13 s.d. 16 Okt'"""
    a, b = dt.date.fromisoformat(hari[0]), dt.date.fromisoformat(hari[-1])
    return f"{a.day} s.d. {b.day} {BULAN[b.month - 1]}" if a.month == b.month else f"{a.day} {BULAN[a.month - 1]} s.d. {b.day} {BULAN[b.month - 1]}"


def slug(kunci):
    return re.sub(r"[^a-z0-9]+", "-", kunci.lower()).strip("-")


def pilih_daerah(titik, attr, milik):
    """Kandidat urut menurut jumlah kejadian banjir DIBI 2010-2023 (maks MAKS_PER_PROV per provinsi) + wilayah Siaga/Awas hari ini.
    -> [(kunci kabupaten, id sub-DAS keluaran, kunci kecamatan keluaran, alasan)]"""
    kej = baca_json("public/banjir/data/kejadian.json")["kab"]
    skor = sorted(((sum(v.get("banjir", {}).get(str(y), 0) for y in range(2010, 2024)), k) for k, v in kej.items()), reverse=True)
    status = baca_json("public/banjir/data/status.json")["kec"]
    siaga = []
    for k, v in status.items():
        if max(v["b"]) >= 2:
            p, kab, _ = k.split("|")
            if f"{p}|{kab}" not in siaga:
                siaga.append(f"{p}|{kab}")
    per_kab = collections.defaultdict(list)
    for k, i in milik.items():
        p, kab, kec = k.split("|")
        per_kab[f"{p}|{kab}"].append((attr[i][2], k, i))

    def keluaran(kab):
        ok = [(u, k, i) for u, k, i in per_kab.get(kab, ()) if MIN_KM2 <= u <= PLAFON_KM2]
        return max(ok) if ok else None

    hasil, pakai, prov = [], set(), collections.Counter()
    for n, kab in skor:
        k = keluaran(kab)
        if not k or k[2] in pakai or prov[kab[:2]] >= MAKS_PER_PROV:
            continue
        if kab[:2] in ("31", "32", "33", "34", "35", "36") and sum(prov[x] for x in ("31", "32", "33", "34", "35", "36")) >= MAKS_JAWA:
            continue
        hasil.append((kab, k[2], k[1], f"{n} kejadian banjir DIBI 2010-2023"))
        pakai.add(k[2])
        prov[kab[:2]] += 1
        if len(hasil) >= N_DAERAH:
            break
    for kab in siaga:
        k = keluaran(kab)
        if k and k[2] not in pakai and kab not in [h[0] for h in hasil]:
            hasil.append((kab, k[2], k[1], f"status Siaga/Awas {rentang_hari(baca_json('public/banjir/data/status.json')['hari'])}"))
            pakai.add(k[2])
    return hasil


def konsesi_dalam(bbox_das):
    out = []
    for f in baca_json("public/data/lahan/konsesi.geojson")["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        rings = [r for p in polys for r in p]
        bb = bbox_ring(rings)
        if bb[2] < bbox_das[0] or bb[0] > bbox_das[2] or bb[3] < bbox_das[1] or bb[1] > bbox_das[3]:
            continue
        out.append((f["properties"], rings))
    return out


def daerah(kab, keluar_id, kec_keluar, alasan, attr, titik):
    p, nama = kab.split("|")
    print(f"== {kab} ({alasan}); keluaran {keluar_id} via {kec_keluar}", file=sys.stderr)
    ids = hulu(attr, keluar_id)
    rings = [r for pp, rr in lintas_zip() if rr and int(pp["hybas_id"]) in ids for r in rr]
    assert len(rings) >= len(ids), f"{kab}: {len(rings)} cincin untuk {len(ids)} sub-DAS"
    luar, lubang = larutkan(rings)
    luar_s = [s for s in (sederhana(r) for r in luar) if s and km2(s) > 0.5]
    lubang_s = [s for s in (sederhana(r) for r in lubang) if s and km2(s) > 0.5]
    geom = poligon_geojson(luar_s, lubang_s)
    garis = Garis(luar_s + lubang_s)
    kons = konsesi_dalam(garis.bbox)
    pk = {pr["id"]: (pr, Garis(rr)) for pr, rr in kons}
    das, per_j, per_k, titik_hilang = hitung_hansen(garis, [(i, pr["jenis"], g) for i, (pr, g) in pk.items()],
                                                    lambda s: print(s, file=sys.stderr, end="\r"))
    luas_sub = sum(attr[i][1] for i in ids)
    luas_gabung = sum(km2(r) for r in luar_s) - sum(km2(r) for r in lubang_s)
    kej = baca_json("public/banjir/data/kejadian.json")["kab"].get(kab, {}).get("banjir", {})
    kej = {y: kej[y] for y in sorted(kej) if int(y) <= 2025}
    status = baca_json("public/banjir/data/status.json")["kec"]
    lv = [(max(v["b"]), k.split("|")[2]) for k, v in status.items() if k.startswith(kab + "|")]
    top = sorted(((v.ha, i) for i, v in per_k.items() if v.ha > 0), reverse=True)[:8]
    ringkas = lambda j: {"luas_ha": round(j.ha), "hutan_ha": round(j.hutan), "hilang_ha": round(j.total()),
                         "hilang_tahun": {str(y): round(v) for y, v in sorted(j.hilang.items())}}
    return {
        "kunci": kab, "slug": slug(kab), "kab": nama, "prov": p, "prov_nama": PROVINSI.get(p, p), "alasan": alasan,
        "dibuat": dt.date.today().isoformat(),
        "keluaran": {"kec": kec_keluar.split("|")[2], "id": keluar_id, "lat": titik[kec_keluar][0], "lon": titik[kec_keluar][1]},
        "das": {"luas_km2": round(luas_sub), "luas_gabung_km2": round(luas_gabung), "luas_cuplik_km2": round(das.ha / 100),
                "n_subdas": len(ids), "bbox": [round(v, 3) for v in garis.bbox], "geom": geom},
        "hutan": {"awal_ha": round(das.hutan), "hilang_ha": round(das.total()),
                  "tahun": {str(y): round(v) for y, v in sorted(das.hilang.items())}},
        "kejadian": kej,
        "korelasi": korelasi(kej, {str(y): round(v) for y, v in das.hilang.items()}),
        "konsesi": {j: dict(ringkas(per_j[j]), n=sum(1 for pr, _ in pk.values() if (j == "semua" or pr["jenis"] == j) and per_k[pr["id"]].ha > 0))
                    for j in JENIS + ("semua",)},
        "konsesi_top": [dict(id=i, nama=pk[i][0]["nama"], jenis=pk[i][0]["jenis"], kab=pk[i][0].get("kab") or "",
                             **{k: v for k, v in ringkas(per_k[i]).items() if k != "hilang_tahun"}) for _, i in top],
        "status": {"level": max((a for a, _ in lv), default=0), "kec": sorted(k for a, k in lv if a >= 2)},
        "titik_hilang": titik_hilang,
        "sumber": {"das": "HydroBASINS v1c lev 9 (HydroSHEDS)", "hutan": "Hansen/UMD/Google/USGS/NASA GFC v1.13 (2001-2025)",
                   "kejadian": "DIBI BNPB per kabupaten", "konsesi": "konsesi.geojson (GFW/Kemenhut 2014, Trase 2026, PPKH Jan 2026)"},
    }


# ---------------------------------------------------------------- pelengkap (tanpa jaringan)
def persen_di_kab(geom, prov, kab):
    """% luas DAS yang jatuh di dalam kabupaten (scanline lintang tiap 0,004 derajat); None bila poligon kabupaten tak ketemu"""
    fs = json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{prov}.json")))["features"]
    rk = [r for f in fs if f["properties"]["kab"] == kab for r in (f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiPolygon" else [f["geometry"]["coordinates"]]) for r in [r[0]]]
    if not rk:
        return None
    das = Garis([r for pl in geom["coordinates"] for r in pl])
    kb = Garis(rk)
    tot = dalam = 0.0
    y = das.bbox[1] + 0.002
    while y < das.bbox[3]:
        a = das.rentang(y)
        w = math.cos(math.radians(y))
        tot += sum(h - l for l, h in a) * w
        dalam += sum(h - l for l, h in potong(a, kb.rentang(y))) * w
        y += 0.004
    return round(100 * dalam / tot, 1) if tot else None


def lengkapi():
    """Isi bidang turunan di tiap <slug>.json dan index.json dari berkas yang sudah ada (tanpa Hansen/jaringan):
    korelasi, golongan daerah, status + rentang tanggalnya, penanda kelengkapan konsesi, sumber bertahun, % DAS di dalam kabupaten,
    dan DAS bertumpuk (satu DAS memuat titik keluaran DAS lain)."""
    idx = json.load(open(os.path.join(KELUAR, "index.json")))
    st = baca_json("public/banjir/data/status.json")
    ds = {e["kunci"]: json.load(open(os.path.join(KELUAR, e["slug"] + ".json"))) for e in idx["daerah"]}
    attr, _ = indeks_basin({})
    ids = {k: hulu(attr, d["keluaran"]["id"]) for k, d in ds.items()}
    for k, d in ds.items():
        d["golongan"] = "siaga" if d["alasan"].startswith("status") else "langganan"
        if d["golongan"] == "siaga":
            d["alasan"] = f"status Siaga/Awas {rentang_hari(st['hari'])}"
        d["status"]["hari"] = [st["hari"][0], st["hari"][-1]]
        d["korelasi"] = korelasi(d["kejadian"], d["hutan"]["tahun"])
        # None = tak diketahui: 0 ha tercatat tidak berarti tidak ada konsesi (daftar repo hanya sawit/HPH 2014, HTI Trase, tambang PPKH)
        d["konsesi"]["lengkap"] = None if d["konsesi"]["semua"]["luas_ha"] == 0 else False
        d["sumber"] = {"das": "HydroBASINS v1c level 9 (HydroSHEDS, 2014)", "hutan": "Hansen/UMD/Google/USGS/NASA Global Forest Change v1.13 (2001 s.d. 2025)",
                       "kejadian": "DIBI BNPB (kejadian dan warga terdampak per kabupaten, 2010 s.d. 2023)",
                       "konsesi": "GFW/Kemenhut 2014 (sawit, HPH), Trase 2026 (HTI), PPKH Kemenhut Jan 2026 (tambang)",
                       "citra": "Copernicus Sentinel-1 dan Sentinel-2 (Earth Search, Planetary Computer)"}
        d["das"]["persen_kab"] = persen_di_kab(d["das"]["geom"], d["prov"], d["kab"])
        d["das"]["memuat"] = sorted(o["kab"] for ok, o in ds.items() if ok != k and o["keluaran"]["id"] in ids[k])
        d["das"]["bagian_dari"] = sorted(o["kab"] for ok, o in ds.items() if ok != k and d["keluaran"]["id"] in ids[ok])
        validasi(d)
        simpan(os.path.join(KELUAR, d["slug"] + ".json"), d)
    idx["status_hari"] = [st["hari"][0], st["hari"][-1]]
    idx["daerah"] = sorted((ringkas_indeks(d) for d in ds.values()), key=lambda e: -e["hilang_ha"])
    idx["sumber"] = next(iter(ds.values()))["sumber"]
    simpan(os.path.join(KELUAR, "index.json"), idx)
    print(f"lengkapi: {len(ds)} daerah", file=sys.stderr)


def bangun(pilihan=None):
    titik = baca_json("public/banjir/data/pusat_kec.json")
    print("indeks HydroBASINS ...", file=sys.stderr)
    attr, milik = indeks_basin(titik)
    print(f"  {len(attr)} sub-DAS Indonesia, {len(milik)}/{len(titik)} kecamatan terpetakan", file=sys.stderr)
    daftar = pilih_daerah(titik, attr, milik)
    if pilihan:
        daftar = [d for d in daftar if d[0] in pilihan]
    idx_lama = {}
    jalur = os.path.join(KELUAR, "index.json")
    if os.path.exists(jalur):
        idx_lama = {d["kunci"]: d for d in json.load(open(jalur))["daerah"]}
    for kab, kid, kec, alasan in daftar:
        d = daerah(kab, kid, kec, alasan, attr, titik)
        lama = os.path.join(KELUAR, d["slug"] + ".json")
        if os.path.exists(lama):  # pertahankan citra yang sudah dibuat citra_banjir.py
            d["citra"] = json.load(open(lama)).get("citra")
        validasi(d)
        simpan(lama, d)
        idx_lama[kab] = ringkas_indeks(d)
        print(f"   {kab}: DAS {d['das']['luas_km2']} km2, hutan awal {d['hutan']['awal_ha']} ha, hilang {d['hutan']['hilang_ha']} ha, "
              f"konsesi {d['konsesi']['semua']['luas_ha']} ha, r={d['korelasi']['r']}", file=sys.stderr)
    simpan(jalur, {"dibuat": dt.date.today().isoformat(), "daerah": sorted(idx_lama.values(), key=lambda d: -d["hilang_ha"]), "sumber": {}})
    lengkapi()
    uji()


def ringkas_indeks(d):
    return {"kunci": d["kunci"], "slug": d["slug"], "kab": d["kab"], "prov_nama": d["prov_nama"], "alasan": d["alasan"],
            "luas_km2": d["das"]["luas_km2"], "hutan_awal_ha": d["hutan"]["awal_ha"], "hilang_ha": d["hutan"]["hilang_ha"],
            "konsesi_ha": d["konsesi"]["semua"]["luas_ha"], "konsesi_lengkap": d["konsesi"].get("lengkap"), "kejadian": d["korelasi"].get("total_kejadian"), "siaga": d["status"]["level"] >= 2,
            "golongan": d.get("golongan"), "tumpuk": bool(d["das"].get("memuat") or d["das"].get("bagian_dari")), "citra": bool(d.get("citra"))}


# ---------------------------------------------------------------- uji
def validasi(d):
    """invarian satu daerah; AssertionError dengan angkanya bila dilanggar"""
    k = d["kunci"]
    luas_ha = d["das"]["luas_km2"] * 100
    assert d["das"]["luas_km2"] > 0, f"{k}: luas DAS {d['das']['luas_km2']} <= 0"
    g = d["das"]["geom"]
    rings = [pl[0] for pl in g["coordinates"]]
    assert di_dalam(d["keluaran"]["lon"], d["keluaran"]["lat"], rings), f"{k}: titik keluaran {d['keluaran']['lat']},{d['keluaran']['lon']} di luar poligon DAS"
    rasio = d["das"]["luas_gabung_km2"] / d["das"]["luas_km2"]
    assert 0.9 <= rasio <= 1.1, f"{k}: luas poligon gabungan {d['das']['luas_gabung_km2']} km2 vs jumlah sub-DAS {d['das']['luas_km2']} km2 (rasio {rasio:.2f}); sisi bersama tidak terbuang?"
    h = d["hutan"]
    assert h["hilang_ha"] <= h["awal_ha"] <= luas_ha * 1.05, f"{k}: hilang {h['hilang_ha']} > hutan awal {h['awal_ha']} atau hutan awal > luas DAS {luas_ha}"
    assert abs(sum(h["tahun"].values()) - h["hilang_ha"]) <= len(h["tahun"]), f"{k}: jumlah per tahun {sum(h['tahun'].values())} != total {h['hilang_ha']}"
    for j, v in d["konsesi"].items():
        if not isinstance(v, dict):   # "lengkap"
            continue
        assert v["luas_ha"] <= luas_ha * 1.05, f"{k}: konsesi {j} {v['luas_ha']} ha > luas DAS {luas_ha} ha (belum dipotong ke DAS?)"
        assert v["hilang_ha"] <= v["hutan_ha"] <= v["luas_ha"] + 1, f"{k}: konsesi {j}: hilang {v['hilang_ha']} / hutan {v['hutan_ha']} / luas {v['luas_ha']} tidak berurutan"
        assert v["hilang_ha"] <= h["hilang_ha"] + 1, f"{k}: hilang di konsesi {j} {v['hilang_ha']} > hilang di seluruh DAS {h['hilang_ha']}"
    for t in d["konsesi_top"]:
        assert t["luas_ha"] <= luas_ha * 1.05 and t["hilang_ha"] <= t["hutan_ha"], f"{k}: konsesi {t['id']} tidak masuk akal {t}"
    ky = d["konsesi"]
    jml = sum(ky[j]["luas_ha"] for j in JENIS)
    assert ky["semua"]["luas_ha"] <= jml + 1, f"{k}: konsesi semua {ky['semua']['luas_ha']} ha > jumlah per jenis {jml} ha (gabungan tak boleh melebihi jumlah)"
    for j, v in ky.items():
        if isinstance(v, dict) and v.get("hilang_tahun"):
            sm = sum(v["hilang_tahun"].values())
            assert abs(sm - v["hilang_ha"]) <= len(v["hilang_tahun"]), f"{k}: konsesi {j}: jumlah hilang per tahun {sm} != total {v['hilang_ha']}"
    kr = d["korelasi"]
    if "bisa" in kr:
        assert kr["bisa"] == (kr["r"] is not None), f"{k}: bisa={kr['bisa']} tetapi r={kr['r']}"
        assert kr["bisa"] or (kr["total_kejadian"] < 30 or kr["tahun_berkejadian"] < 8 or kr["r"] is None), f"{k}: r ditahan padahal data cukup"
        assert kr["n"] == len([y for y in d["kejadian"] if kr["dari"] <= int(y) <= kr["sampai"]]), f"{k}: n {kr['n']} != tahun bercatat (tahun tanpa catatan tak boleh diisi 0)"
    s1 = (d.get("citra") or {}).get("s1")
    if s1:
        assert s1["sesudah"]["tgl"] >= s1["kejadian"]["tanggal"], f"{k}: citra S1 'sesudah' {s1['sesudah']['tgl']} lebih awal dari kejadian {s1['kejadian']['tanggal']}"
        assert s1["sebelum"]["tgl"] < s1["kejadian"]["tanggal"], f"{k}: citra S1 'sebelum' {s1['sebelum']['tgl']} tidak mendahului kejadian"
    if d.get("citra"):
        for c in d["citra"].get("gambar", []):
            assert c.startswith("citra/"), f"{k}: jalur citra {c}"


def uji():
    # fungsi murni
    kotak = lambda x0, y0, x1, y1: [(x0, y0), (x0, y1), (x1, y1), (x1, y0), (x0, y0)]  # searah jarum jam
    luar, lubang = larutkan([kotak(0, 0, 1, 1), kotak(1, 0, 2, 1)])
    assert len(luar) == 1 and not lubang, f"dua kotak bersisian harus jadi satu cincin, dapat {len(luar)} luar {len(lubang)} lubang"
    assert abs(abs(luas_ring(luar[0])) - 2) < 1e-9, f"luas gabungan {luas_ring(luar[0])} != 2"
    assert Garis([kotak(0, 0, 4, 4), kotak(1, 1, 2, 2)]).rentang(1.5) == [(0, 1), (2, 4)], "lubang harus memotong rentang"
    assert potong([(0, 5), (8, 9)], [(3, 8)]) == [(3, 5), (8, 8)] and gabung([(5, 6), (0, 2), (3, 4)]) == [(0, 6)], "potong/gabung"
    bahan = bytes(range(256)) * 20 + b"\0" * 5000 + bytes(i * 7 % 251 for i in range(3000))
    assert lzw(lzw_enkode(bahan)) == bahan, "LZW bolak-balik gagal"
    n, f, c = tally(bytes([3, 4, 0, 0, 25, 1, 0, 0]), bytes([50, 0, 0, 0, 50, 10, 0, 0]), 0, 1)
    assert (n, f) == (2, 2) and dict(c) == {3: 1, 25: 1}, f"tally: piksel non-hutan harus tak dihitung, dapat {n} {f} {dict(c)}"
    assert abs(pearson([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-9, "pearson"
    assert korelasi({str(y): 1 for y in range(2010, 2024)}, {})["r"] is None, "kejadian 14 < 30: r harus None"
    sedikit = {str(y): (5 if y < 2016 else 0) for y in range(2010, 2024)}
    assert korelasi(sedikit, {})["bisa"] is False, "tahun berkejadian < 8: r harus None"
    assert korelasi({"2012": 40}, {})["n"] == 1, "tahun tanpa catatan tidak boleh diisi 0"
    assert abs(r_kritis(14) - 0.53) < 0.01, f"r_kritis(14) = {r_kritis(14)}"
    assert peringkat([5, 5, 1]) == [2.5, 2.5, 1.0], "peringkat berikat"
    # penolakan masukan salah
    jalur = os.path.join(KELUAR, "index.json")
    if not os.path.exists(jalur):
        print("uji bukti_das: fungsi murni lolos (belum ada berkas hasil)", file=sys.stderr)
        return
    idx = json.load(open(jalur))
    assert len(idx["daerah"]) >= 1, "index.json tanpa daerah"
    total = 0
    for e in idx["daerah"]:
        p = os.path.join(KELUAR, e["slug"] + ".json")
        d = json.load(open(p))
        validasi(d)
        ukuran = os.path.getsize(p)
        assert ukuran <= PLAFON_JSON, f"{p}: {ukuran} byte > plafon {PLAFON_JSON}"
        for g in (d.get("citra") or {}).get("gambar", []):
            assert os.path.getsize(os.path.join(KELUAR, g)) <= PLAFON_PNG, f"{g} > {PLAFON_PNG} byte"
        buruk = json.loads(json.dumps(d))
        buruk["hutan"]["hilang_ha"] = buruk["hutan"]["awal_ha"] + 1000
        try:
            validasi(buruk)
        except AssertionError:
            pass
        else:
            raise AssertionError(f"{e['kunci']}: validasi tidak menolak hutan hilang > hutan awal")
        buruk = json.loads(json.dumps(d))
        buruk["konsesi"]["semua"]["luas_ha"] = d["das"]["luas_km2"] * 1000
        try:
            validasi(buruk)
        except AssertionError:
            pass
        else:
            raise AssertionError(f"{e['kunci']}: validasi tidak menolak konsesi lebih luas dari DAS")
    for dp_, _, fs in os.walk(KELUAR):
        total += sum(os.path.getsize(os.path.join(dp_, f)) for f in fs)
    assert total <= PLAFON_TOTAL, f"public/banjir/data/bukti {total} byte > plafon {PLAFON_TOTAL}"
    print(f"uji bukti_das: lolos ({len(idx['daerah'])} daerah, {total // 1000} KB)", file=sys.stderr)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["lengkapi"]:
        lengkapi()
        uji()
    else:
        bangun(set(a[1].split(",")) if a[:1] == ["bangun"] and len(a) > 1 else None)
