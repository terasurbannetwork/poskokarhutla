"""Pengecil PNG citra bukti DAS (stdlib). S1 radar disimpan abu-abu 1 kanal (bukan RGB tiga salinan sama): lossless, ~25% lebih kecil.

Pakai:  python3 scripts/banjir/ringkas_citra.py          # kecilkan citra yang ada sampai public/banjir/data/bukti <= SASARAN
        python3 scripts/banjir/ringkas_citra.py uji       # uji luring
Langkah 1 lossless (RGB dengan kanal sama -> abu-abu). Langkah 2 hanya bila masih di atas SASARAN: bit rendah PNG S2 terbesar dibuang
(tangga topeng yang sama dengan scripts/data/citra.py), satu per satu, sampai muat. Plafon bukti_das.PLAFON_TOTAL tidak diubah.
"""
import glob, os, struct, sys, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bukti_das as B  # noqa: E402

SASARAN = int(B.PLAFON_TOTAL * 0.98)   # sisa ruang untuk kabupaten baru
TANGGA = (0xFF, 0xFE, 0xFC, 0xF8, 0xF0)


def _blok(k, d):
    return struct.pack(">I", len(d)) + k + d + struct.pack(">I", zlib.crc32(k + d))


def png_abu(g, n, maks):
    """g = array/bytes 0..255 sepanjang n*n -> PNG abu-abu 8 bit <= maks (bit rendah dibuang bila perlu); filter Sub"""
    for m in TANGGA:
        b = _kode([bytes(g[i * n:(i + 1) * n]) for i in range(n)], n, n, 1, m)
        if len(b) <= maks:
            break
    return b


def _kode(rows, w, h, bpp, mask):
    raw = b"".join(b"\x01" + bytes((r[j] & mask) - (r[j - bpp] & mask) & 255 if j >= bpp else r[j] & mask for j in range(len(r))) for r in rows)
    ct = 0 if bpp == 1 else 2
    return b"\x89PNG\r\n\x1a\n" + _blok(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ct, 0, 0, 0)) + _blok(b"IDAT", zlib.compress(raw, 9)) + _blok(b"IEND", b"")


def baca(b):
    """-> (w, h, bpp, rows) untuk PNG 8 bit abu/RGB berfilter 0 atau 1"""
    p, idat = 8, b""
    while p < len(b):
        n, k = struct.unpack(">I4s", b[p:p + 8])
        d = b[p + 8:p + 8 + n]
        p += 12 + n
        if k == b"IHDR":
            w, h, bd, ct = struct.unpack(">IIBB", d[:10])
            assert bd == 8 and ct in (0, 2), "hanya 8 bit abu/RGB"
        elif k == b"IDAT":
            idat += d
    bpp = 1 if ct == 0 else 3
    raw, rows, i = zlib.decompress(idat), [], 0
    for _ in range(h):
        f, ln = raw[i], bytearray(raw[i + 1:i + 1 + w * bpp])
        i += 1 + w * bpp
        assert f in (0, 1), f"filter {f} tak didukung"
        if f == 1:
            for j in range(bpp, len(ln)):
                ln[j] = (ln[j] + ln[j - bpp]) & 255
        rows.append(bytes(ln))
    return w, h, bpp, rows


def abu_dari_rgb(w, h, bpp, rows):
    """RGB berkanal sama -> (w, h, 1, rows abu); selain itu tak diubah"""
    if bpp == 3 and all(r[0::3] == r[1::3] == r[2::3] for r in rows):
        return w, h, 1, [r[0::3] for r in rows]
    return w, h, bpp, rows


def ringkas(dir_citra, sasaran=SASARAN, akar=None):
    akar = akar or os.path.dirname(dir_citra)
    ukuran = lambda: sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(akar) for f in fs)
    for f in sorted(glob.glob(os.path.join(dir_citra, "*.png"))):
        w, h, bpp, rows = abu_dari_rgb(*baca(open(f, "rb").read()))
        if bpp == 1:
            b = _kode(rows, w, h, 1, 0xFF)
            if len(b) < os.path.getsize(f):
                open(f, "wb").write(b)
    for m in TANGGA[3:]:                        # langkah 2: hanya S2 terbesar, sampai muat
        for f in sorted(glob.glob(os.path.join(dir_citra, "*_s2_*.png")), key=os.path.getsize, reverse=True):
            if ukuran() <= sasaran:
                return ukuran()
            w, h, bpp, rows = baca(open(f, "rb").read())
            b = _kode(rows, w, h, bpp, m)
            if len(b) < os.path.getsize(f):
                open(f, "wb").write(b)
    return ukuran()


def uji():
    import random, tempfile
    random.seed(1)
    n = 16
    g = bytes(random.randrange(256) for _ in range(n * n))
    w, h, bpp, rows = baca(png_abu(g, n, 10**6))
    assert (w, h, bpp) == (n, n, 1) and b"".join(rows) == g
    rgb = _kode([bytes(v for x in g[i * n:(i + 1) * n] for v in (x, x, x)) for i in range(n)], n, n, 3, 0xFF)
    w, h, bpp, rows = abu_dari_rgb(*baca(rgb))
    assert bpp == 1 and b"".join(rows) == g
    with tempfile.TemporaryDirectory() as t:
        os.makedirs(os.path.join(t, "citra"))
        p = os.path.join(t, "citra", "x_s1_sebelum_20250101.png")
        open(p, "wb").write(rgb)
        ringkas(os.path.join(t, "citra"), 10**9)
        assert baca(open(p, "rb").read())[2] == 1
    print("uji ringkas_citra: lolos", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        print(ringkas(B.KELUAR + "/citra", akar=B.KELUAR))
