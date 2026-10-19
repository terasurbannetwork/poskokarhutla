"""Pembaca peta tahun tanam sawit global (Descals dkk. 2024) untuk pemantauan lahan terbakar di konsesi.

Sumber: Descals, A. dkk. 2024, "Global mapping of oil palm planting year from 1990 to 2021", ESSD 16:5111,
Zenodo 10.5281/zenodo.13379129, lisensi CC BY 4.0. Ubin GlobalOilPalm_OP-YoP_<ID>.tif di data/raw/sawit/yop/
(bila belum ada: https://zenodo.org/api/records/13379129/files/GlobalOilPalm_OP-YoP.zip/content, unzip ke situ).

Nilai piksel (uint16, ~30 m, EPSG:4326) = tahun tanam 1990..2021 (ubin nyata juga memuat segelintir piksel 1989 dan 2022); 0 = bukan sawit (per 2021).
PENTING: "tahun tanam" = tahun PERSIAPAN LAHAN terakhir sebelum kebun yang sekarang berdiri, jadi replanting ikut
terhitung (kebun tua yang ditanam ulang berumur muda). RMSE 2,0 tahun untuk industri, 4,9 tahun untuk rakyat.
Peta berhenti di 2021: sawit yang ditanam 2022+ terbaca "bukan sawit".

Format ubin: BigTIFF, LZW, tanpa prediktor, blok 256x256. Dekoder LZW stdlib, hanya blok yang disentuh didekode
(LRU kecil). Indeks ubin (kiri-atas, ukuran) dibaca dari kepala berkas lalu di-cache ke data/raw/sawit/indeks.json.

Pakai:  import sawit_peta as S;  S.tahun_tanam(barat, selatan, timur, utara, n) -> n*n sel (baris 0 = utara),
        tiap sel (fraksi_sawit, median_tahun) atau None bila tak ada data; median_tahun None bila tak ada sawit.
Uji:    python3 scripts/data/sawit_peta.py uji
"""
import glob, json, os, struct, sys
from array import array
from collections import OrderedDict

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DIR = os.path.join(AKAR, "data/raw/sawit")
YOP = os.path.join(DIR, "yop")
SAMPEL = 8          # contoh SAMPEL x SAMPEL piksel per sel
LRU_MAKS = 400      # blok terdekompresi (~130 KB per blok)
_blok = OrderedDict()
_indeks = None


def lzw(data):
    """dekoder LZW TIFF: MSB-first, 256 = clear, 257 = EOI, early change, lebar 9..12 bit"""
    out, tabel, n, buf, nb, prev = bytearray(), None, 9, 0, 0, None
    for byte in data:
        buf = (buf << 8) | byte
        nb += 8
        while nb >= n:
            kode = (buf >> (nb - n)) & ((1 << n) - 1)
            nb -= n
            buf &= (1 << nb) - 1
            if kode == 257:
                return bytes(out)
            if kode == 256:
                tabel, n, prev = [bytes((i,)) for i in range(256)] + [b"", b""], 9, None
                continue
            if prev is None:
                s = tabel[kode]
            else:
                s = tabel[kode] if kode < len(tabel) else prev + prev[:1]
                tabel.append(prev + s[:1])
            out += s
            prev = s
            if len(tabel) + 1 >= (1 << n) and n < 12:
                n += 1
    return bytes(out)


def ifd(b):
    """BigTIFF little-endian: kamus tag -> nilai (tuple/skalar). Nilai yang lebih dari 8 bita dibaca dari b."""
    assert b[:4] == b"II+\x00", "bukan BigTIFF little-endian"
    o = struct.unpack("<Q", b[8:16])[0]
    n = struct.unpack("<Q", b[o:o + 8])[0]
    ukuran = {3: ("H", 2), 4: ("I", 4), 12: ("d", 8), 16: ("Q", 8), 2: ("c", 1)}
    t = {}
    for i in range(n):
        tag, ty, c, v = struct.unpack("<HHQQ", b[o + 8 + 20 * i:o + 28 + 20 * i])
        k, w = ukuran.get(ty, ("B", 1))
        if c * w <= 8:
            raw = struct.pack("<Q", v)[:c * w]
        else:
            raw = b[v:v + c * w]
        t[tag] = struct.unpack("<%d%s" % (c, k), raw) if k != "c" else raw
    return t


def indeks():
    """{id: [lon_kiri, lat_atas, W, H]} dari kepala tiap ubin; di-cache ke indeks.json"""
    global _indeks
    if _indeks is None:
        jalur = os.path.join(DIR, "indeks.json")
        if os.path.exists(jalur):
            _indeks = json.load(open(jalur))
        else:
            _indeks = {}
            for f in sorted(glob.glob(os.path.join(YOP, "GlobalOilPalm_OP-YoP_*.tif"))):
                t = ifd(open(f, "rb").read(8192))   # IFD + tiepoint ada di awal berkas
                tp = t[33922]
                _indeks[os.path.basename(f).rsplit("_", 1)[1][:-4]] = [tp[3], tp[4], t[256][0], t[257][0]]
            json.dump(_indeks, open(jalur, "w"), separators=(",", ":"))
    return _indeks


class Ubin:
    PIX = 0.00026949458523585647

    def __init__(self, id_):
        self.b = open(os.path.join(YOP, f"GlobalOilPalm_OP-YoP_{id_}.tif"), "rb").read()
        t = ifd(self.b)
        assert t[259][0] == 5 and t.get(317, (1,))[0] == 1 and t[258][0] == 16, "bukan LZW/uint16 tanpa prediktor"
        self.W, self.H, self.T = t[256][0], t[257][0], t[322][0]
        self.tx = -(-self.W // self.T)
        self.off, self.cnt = t[324], t[325]
        self.id = id_

    def blok(self, k):
        kunci = (self.id, k)
        if kunci in _blok:
            _blok.move_to_end(kunci)
            return _blok[kunci]
        a = array("H")
        a.frombytes(lzw(self.b[self.off[k]:self.off[k] + self.cnt[k]]))
        if sys.byteorder == "big":
            a.byteswap()
        _blok[kunci] = a
        if len(_blok) > LRU_MAKS:
            _blok.popitem(last=False)
        return a

    def nilai(self, x, y):
        if not (0 <= x < self.W and 0 <= y < self.H):
            return None
        a = self.blok((y // self.T) * self.tx + x // self.T)
        i = (y % self.T) * self.T + x % self.T
        return a[i] if i < len(a) else None


_ubin = {}


def ubin(id_):
    if id_ not in _ubin:
        if len(_ubin) > 12:
            _ubin.clear()
        _ubin[id_] = Ubin(id_)
    return _ubin[id_]


def nilai_di(lon, lat, kand):
    """tahun tanam (0 = bukan sawit) di satu titik; None = di luar semua ubin"""
    for id_, (x0, y0, W, H) in kand:
        x, y = int((lon - x0) / Ubin.PIX), int((y0 - lat) / Ubin.PIX)
        if 0 <= x < W and 0 <= y < H:
            return ubin(id_).nilai(x, y)
    return None


def tahun_tanam(barat, selatan, timur, utara, n):
    """n*n sel (baris 0 = utara) -> (fraksi_sawit, median_tahun_tanam) | None bila sel tanpa data"""
    kand = [(i, v) for i, v in indeks().items()
            if v[0] < timur and v[0] + v[2] * Ubin.PIX > barat and v[1] > selatan and v[1] - v[3] * Ubin.PIX < utara]
    dx, dy = (timur - barat) / n, (utara - selatan) / n
    hasil = []
    for i in range(n):
        for j in range(n):
            th = []
            for a in range(SAMPEL):
                lat = utara - (i + (a + .5) / SAMPEL) * dy
                for c in range(SAMPEL):
                    v = nilai_di(barat + (j + (c + .5) / SAMPEL) * dx, lat, kand)
                    if v is not None:
                        th.append(v)
            if not th:
                hasil.append(None)
                continue
            sw = sorted(v for v in th if v)
            hasil.append((len(sw) / len(th), sw[len(sw) // 2] if sw else None))
    return hasil


# ---------------------------------------------------------------- uji
def _enkode(data):
    """encoder LZW TIFF kecil (uji saja): greedy, early change, clear saat tabel penuh"""
    kode, buf, nb = [], 0, 0

    def tulis(c, n):
        nonlocal buf, nb
        buf = (buf << n) | c
        nb += n
        while nb >= 8:
            kode.append((buf >> (nb - 8)) & 255)
            nb -= 8
        buf &= (1 << nb) - 1
    tabel, n = {bytes((i,)): i for i in range(256)}, 9
    tulis(256, n)
    w = b""
    for byte in data:
        wc = w + bytes((byte,))
        if wc in tabel:
            w = wc
            continue
        tulis(tabel[w], n)
        tabel[wc] = len(tabel) + 2
        if len(tabel) + 2 >= (1 << n) and n < 12:   # dekoder menambah entri satu kode lebih lambat dari enkoder
            n += 1
        if len(tabel) + 2 >= 4093:
            tulis(256, n)
            tabel, n = {bytes((i,)): i for i in range(256)}, 9
        w = bytes((byte,))
    if w:
        tulis(tabel[w], n)
    tulis(257, n)
    if nb:
        tulis(0, 8 - nb)
    return bytes(kode)


def uji():
    import random
    r = random.Random(7)
    for data in (b"", b"a", b"abababababab" * 50, bytes(r.choice(b"abcd") for _ in range(30000)), bytes(r.randrange(256) for _ in range(20000)),
                 bytes(2000) + bytes(range(256)) * 40):
        assert lzw(_enkode(data)) == data, len(data)
    print("uji lzw ok")
    fs = sorted(glob.glob(os.path.join(YOP, "GlobalOilPalm_OP-YoP_*.tif")))
    if not fs:
        print("tanpa ubin nyata: lewati uji dekode")
        return
    u = Ubin(os.path.basename(max(fs, key=os.path.getsize)).rsplit("_", 1)[1][:-4])
    ada = set()
    for k in range(0, len(u.cnt), max(1, len(u.cnt) // 12)):
        if u.cnt[k]:
            ada |= set(u.blok(k))
    assert ada and all(v == 0 or 1989 <= v <= 2022 for v in ada), sorted(ada)[:20]
    print("uji ubin nyata ok", u.id, "nilai", sorted(ada)[:3], "...", sorted(ada)[-2:])
    ix = indeks()
    x0, y0, W, H = ix[u.id]
    h = tahun_tanam(x0 + .1, y0 - .5, x0 + .6, y0 - .1, 4)
    assert len(h) == 16 and all(c is None or 0 <= c[0] <= 1 for c in h) and any(c and c[0] > 0 for c in h), h
    print("tahun_tanam ok", h[:2])


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        print(__doc__)
