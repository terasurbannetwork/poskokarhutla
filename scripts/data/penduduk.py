"""Penduduk per sel 0,25 derajat dan per kecamatan -> public/data/penduduk.json, plus paparan asap.

Pakai:  python3 scripts/data/penduduk.py            # bangun penduduk.json (sekali / tahunan)
        python3 scripts/data/penduduk.py paparan    # cetak penduduk per kelas ISPU per provinsi per hari
Sumber: WorldPop Global2 R2025A, 2026 constrained, UN-adjusted, 30 arc-detik (~1 km), CC BY 4.0.
Dibaca tanpa GDAL: BigTIFF ber-ubin, LZW tanpa prediktor, float32 (diperiksa di baca_tiff).
Kecamatan: piksel dihimpun per blok 3x3 (1/40 derajat, ~2,8 km) lalu pusat blok dicari di poligon
public/geo/kecamatan; penduduk blok di tepi kecamatan bisa jatuh ke tetangganya (galat tepi ~1 blok).
"""
import array, json, math, os, struct, sys, urllib.request

AKAR = os.path.join(os.path.dirname(__file__), "../..")
sys.path.insert(0, os.path.dirname(__file__))
from wilayah import Wilayah

URL = ("https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2026/IDN/v1/1km_ua/constrained/"
       "idn_pop_2026_CN_1km_R2025A_UA_v1.tif")
MENTAH = os.path.join(AKAR, "data/raw/penduduk", os.path.basename(URL))
KELUAR = os.path.join(AKAR, "public/data/penduduk.json")
SEL = 0.25
BLOK = 3
# ambang ISPU PM2.5 (µg/m3), sama dengan ST_PM di index.html: baik, sedang, tidak sehat, sangat tidak sehat, berbahaya
KELAS = ["baik", "sedang", "tidak sehat", "sangat tidak sehat", "berbahaya"]
AMBANG = [15.5, 55.4, 150.4, 250.4]


def lzw(data):
    """Dekoder LZW TIFF (MSB-first, 9-12 bit, early change)."""
    out, tab, prev = bytearray(), [bytes([i]) for i in range(256)] + [b"", b""], None
    pos, n, lebar = 0, len(data) * 8, 9
    data = bytes(data) + b"\0\0\0"
    while pos + lebar <= n:
        b = pos >> 3
        kode = (int.from_bytes(data[b:b + 3], "big") >> (24 - (pos & 7) - lebar)) & ((1 << lebar) - 1)
        pos += lebar
        if kode == 256:
            tab, lebar, prev = tab[:258], 9, None
            continue
        if kode == 257:
            break
        if prev is None:
            isi = tab[kode]
        else:
            isi = tab[kode] if kode < len(tab) else prev + prev[:1]
            tab.append(prev + isi[:1])
        out += isi
        prev = isi
        if len(tab) + 1 >= (1 << lebar) and lebar < 12:
            lebar += 1
    return out


def baca_tiff(p):
    """(lebar, tinggi, x0, y0, langkah, nodata, iter ubin (bx, by, ukuran, array float32))"""
    b = open(p, "rb").read()
    assert b[:4] == b"II+\0", "bukan BigTIFF little-endian"
    off = struct.unpack("<Q", b[8:16])[0]
    ukuran = {3: 2, 4: 4, 12: 8, 16: 8, 2: 1}
    fmt = {3: "H", 4: "I", 12: "d", 16: "Q"}
    tag = {}
    for i in range(struct.unpack("<Q", b[off:off + 8])[0]):
        q = off + 8 + i * 20
        t, jenis, n = struct.unpack("<HHQ", b[q:q + 12])
        sz = ukuran.get(jenis, 1) * n
        raw = b[q + 12:q + 12 + sz] if sz <= 8 else b[struct.unpack("<Q", b[q + 12:q + 20])[0]:][:sz]
        tag[t] = raw.decode("latin1").rstrip("\0") if jenis == 2 else struct.unpack("<" + fmt[jenis] * n, raw)
    assert tag[259] == (5,) and tag.get(317, (1,)) == (1,) and tag[258] == (32,) and tag[339] == (3,), "format TIFF berubah"
    w, h, tw = tag[256][0], tag[257][0], tag[322][0]
    sx, x0, y0 = tag[33550][0], tag[33922][3], tag[33922][4]
    nodata = float(tag.get(42113, "-99999"))
    per_baris = math.ceil(w / tw)

    def ubin():
        for i, (o, n) in enumerate(zip(tag[324], tag[325])):
            a = array.array("f")
            a.frombytes(bytes(lzw(b[o:o + n])))
            yield (i % per_baris) * tw, (i // per_baris) * tw, tw, a
    return w, h, x0, y0, sx, nodata, ubin()


def bangun():
    if not os.path.exists(MENTAH):
        os.makedirs(os.path.dirname(MENTAH), exist_ok=True)
        req = urllib.request.Request(URL, headers={"User-Agent": "poskokarhutla/1.0"})
        open(MENTAH, "wb").write(urllib.request.urlopen(req, timeout=600).read())
    w, h, x0, y0, sx, nodata, ubin = baca_tiff(MENTAH)
    blok = {}
    for bx, by, tw, a in ubin:
        for r in range(tw):
            gy = by + r
            if gy >= h:
                break
            base = r * tw
            for c in range(tw):
                v = a[base + c]
                if v > 0 and v != nodata and bx + c < w:
                    k = (gy // BLOK, (bx + c) // BLOK)
                    blok[k] = blok.get(k, 0.0) + v
    wil = Wilayah()
    grid, kec, total, luar = {}, {}, 0.0, 0.0
    for (ry, rx), v in blok.items():
        lat = y0 - (ry + 0.5) * BLOK * sx
        lon = x0 + (rx + 0.5) * BLOK * sx
        total += v
        ident = wil.cari(lon, lat)
        d = BLOK * sx  # pesisir: pusat blok di laut, coba geser satu blok ke 8 arah
        for dy, dx in ((0, d), (0, -d), (d, 0), (-d, 0), (d, d), (d, -d), (-d, d), (-d, -d)):
            if ident:
                break
            ident = wil.cari(lon + dx, lat + dy)
        prov = ident[0] if ident else ""
        if ident:
            k = "|".join(ident)
            kec[k] = kec.get(k, 0.0) + v
        else:
            luar += v
        g = (math.floor(lat / SEL) * SEL + SEL / 2, math.floor(lon / SEL) * SEL + SEL / 2, prov)
        grid[g] = grid.get(g, 0.0) + v
    out = {"sumber": "WorldPop Global2 R2025A, penduduk 2026 constrained UN-adjusted 1 km (CC BY 4.0)",
           "sel": SEL, "kolom": ["lat", "lon", "penduduk", "prov"],
           "catatan": "Satu sel bisa muncul lebih dari sekali bila terbelah batas provinsi; prov kosong = blok tetap di luar poligon kecamatan setelah digeser satu blok (pulau kecil yang tidak ada di peta batas).",
           "total": round(total), "di_luar_poligon": round(luar),
           "grid": sorted([[la, lo, round(v), p] for (la, lo, p), v in grid.items() if v >= 1]),
           "kec": {k: round(v) for k, v in sorted(kec.items())}}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"penduduk.json {len(out['grid'])} sel, {len(out['kec'])} kecamatan, total {total / 1e6:.1f} jt, "
          f"di luar poligon {luar / total:.1%}, {os.path.getsize(KELUAR) / 1e3:.0f} KB")
    # invarian: proyeksi penduduk Indonesia 2026 ~ 280-290 jt; di luar itu berarti TIFF salah dibaca
    assert 250e6 < total < 320e6, f"total penduduk {total:.0f} di luar 250-320 jt: skala/format piksel salah"
    assert luar / total < 0.01, f"{luar / total:.1%} penduduk di luar poligon kecamatan (> 1%): batas wilayah bergeser?"


def kelas(pm):
    return sum(pm > a for a in AMBANG)


def paparan(pen, asap, prov=None):
    """{prov: {tgl: [jiwa per KELAS]}} — tiap sel penduduk 0,25 derajat memakai PM2.5 maks harian sel asap 1 derajat yang memuatnya."""
    idx = {(la, lo): pm for la, lo, pm, *_ in asap["grid"]}
    s = asap["sel"]
    out = {}
    for la, lo, jiwa, p in pen["grid"]:
        if not p or (prov and p != prov):
            continue
        pm = idx.get((math.floor(la / s) * s + s / 2, math.floor(lo / s) * s + s / 2))
        if not pm:
            continue
        per = out.setdefault(p, {t: [0] * len(KELAS) for t in asap["hari"]})
        for t, v in zip(asap["hari"], pm):
            if v is not None:
                per[t][kelas(v)] += jiwa
    return out


def uji():
    # LZW: "ABABABA" disandi tangan -> kode 256(clear) 65 66 258 260 257 dalam 9 bit
    bits = "".join(format(k, "09b") for k in (256, 65, 66, 258, 260, 257))
    bits += "0" * (-len(bits) % 8)
    assert lzw(int(bits, 2).to_bytes(len(bits) // 8, "big")) == b"ABABABA"
    assert [kelas(x) for x in (10, 15.5, 15.6, 55.5, 151, 300)] == [0, 0, 1, 2, 3, 4]
    pen = {"grid": [[-2.125, 113.875, 1000, "62"], [-2.125, 113.875, 50, "63"]]}
    asap = {"sel": 1, "hari": ["a", "b"], "grid": [[-2.5, 113.5, [20, 200], [0, 0]]]}
    assert paparan(pen, asap) == {"62": {"a": [0, 1000, 0, 0, 0], "b": [0, 0, 0, 1000, 0]}, "63": {"a": [0, 50, 0, 0, 0], "b": [0, 0, 0, 50, 0]}}


if __name__ == "__main__":
    uji()
    if sys.argv[1:] == ["paparan"]:
        pen = json.load(open(KELUAR))
        asap = json.load(open(os.path.join(AKAR, "public/data/asap.json")))
        for p, per in sorted(paparan(pen, asap).items()):
            print(p, {t: [round(x / 1e3) for x in v] for t, v in per.items()}, "(ribu jiwa: " + ", ".join(KELAS) + ")")
    else:
        bangun()
