"""Pembaca GeoTIFF/COG ubin minimal, stdlib saja (TIFF klasik, ubin atau strip, 1 pita).
Kompresi: tanpa (1), deflate (8/32946), zstd (50000: modul `compression.zstd` Python 3.14, `zstandard`, atau CLI `zstd`).
Prediktor: 1 (tanpa), 2 (horizontal), 3 (titik-mengambang). Tipe: uint8, int16, uint16, float32.
Tidak menggantikan GDAL: tanpa overview, tanpa multi-pita, tanpa BigTIFF."""
import array, struct, subprocess, sys, zlib

_UKURAN = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 12: 8, 16: 8}
_FMT = {1: "B", 2: "c", 3: "H", 4: "I", 12: "d", 16: "Q"}


def zstd_buka(b):
    try:
        from compression import zstd  # Python 3.14+
        return zstd.decompress(b)
    except ImportError:
        pass
    try:
        import zstandard
        return zstandard.ZstdDecompressor().decompress(b, max_output_size=1 << 28)
    except ImportError:
        pass
    p = subprocess.run(["zstd", "-d", "-c", "-q"], input=b, capture_output=True)
    if p.returncode:
        raise RuntimeError("zstd gagal: " + p.stderr.decode()[:200])
    return p.stdout


class Tiff:
    def __init__(self, jalur):
        self.f = open(jalur, "rb")
        h = self.f.read(8)
        if h[:2] != b"II" or struct.unpack("<H", h[2:4])[0] != 42:
            raise ValueError("bukan TIFF klasik little-endian")
        off = struct.unpack("<I", h[4:])[0]
        self.f.seek(off)
        n = struct.unpack("<H", self.f.read(2))[0]
        ents = self.f.read(12 * n)
        self.tag = {}
        for i in range(n):
            t, ty, c, v = struct.unpack("<HHI4s", ents[12 * i:12 * i + 12])
            tot = _UKURAN[ty] * c
            if tot > 4:
                self.f.seek(struct.unpack("<I", v)[0])
                v = self.f.read(tot)
            else:
                v = v[:tot]
            if ty == 2:
                self.tag[t] = v.rstrip(b"\0").decode("latin-1")
            elif ty == 5:
                self.tag[t] = struct.unpack("<%dI" % (2 * c), v)
            else:
                self.tag[t] = struct.unpack("<%d%s" % (c, _FMT[ty]), v)
        g = lambda k, d=None: self.tag[k][0] if k in self.tag else d
        self.lebar, self.tinggi = g(256), g(257)
        self.bit, self.komp, self.pred = g(258), g(259), g(317, 1)
        self.tl, self.tt = g(322), g(323)
        self.fmt = g(339, 1)
        if 324 in self.tag:
            self.offs, self.cnts = self.tag[324], self.tag[325]
        else:  # berkas berstrip (mis. DEMNAS): satu strip = satu "ubin" selebar citra
            self.offs, self.cnts, self.tl, self.tt = self.tag[273], self.tag[279], self.lebar, g(278, self.tinggi)
        self.nodata = float(self.tag[42113]) if 42113 in self.tag else None
        self.kode = {(1, 8): "B", (2, 16): "h", (1, 16): "H", (3, 32): "f"}[(self.fmt, self.bit)]
        sc, tp = self.tag.get(33550), self.tag.get(33922)
        self.skala = sc            # (dx, dy, dz) bila ada
        self.titik_ikat = tp       # (i, j, k, x, y, z)
        self.per_baris = -(-self.lebar // self.tl)

    def ubin(self, kol, baris):
        """Ubin (kol, baris) sebagai array 1-D tl*tt (baris demi baris)."""
        k = baris * self.per_baris + kol
        self.f.seek(self.offs[k])
        b = self.f.read(self.cnts[k])
        if self.komp in (8, 32946):
            b = zlib.decompress(b)
        elif self.komp == 50000:
            b = zstd_buka(b)
        elif self.komp != 1:
            raise ValueError(f"kompresi {self.komp} tidak didukung")
        w, nb = self.tl, self.bit // 8
        if self.pred == 2:
            b = bytearray(b)
            for r in range(self.tt):
                for i in range(r * w * nb + nb, (r + 1) * w * nb):  # ponytail: prediktor 2 hanya benar utk 8 bit
                    b[i] = (b[i] + b[i - nb]) & 255
        elif self.pred == 3:
            b = self._pred3(bytearray(b))
        a = array.array(self.kode)
        a.frombytes(bytes(b))
        if self.kode != "B" and sys.byteorder == "big":
            a.byteswap()
        return a

    def _pred3(self, b):
        w, nb = self.tl, self.bit // 8
        keluar = bytearray(len(b))
        for r in range(self.tt):
            baris = b[r * w * nb:(r + 1) * w * nb]
            for i in range(1, len(baris)):  # penjumlahan kumulatif per byte
                baris[i] = (baris[i] + baris[i - 1]) & 255
            for k in range(nb):  # bidang byte (MSB dulu) -> little-endian
                keluar[r * w * nb + (nb - 1 - k):(r + 1) * w * nb:nb] = baris[k * w:(k + 1) * w]
        return keluar


if __name__ == "__main__":
    import os, tempfile
    # TIFF mini 2x2 piksel, 1 ubin 2x2 uint8 tanpa kompresi, dibuat langsung
    isi = bytes([1, 2, 3, 4])
    ent = [(256, 3, 1, 2), (257, 3, 1, 2), (258, 3, 1, 8), (259, 3, 1, 1), (322, 3, 1, 2), (323, 3, 1, 2),
           (324, 4, 1, 8 + 2 + 12 * 8 + 4), (325, 4, 1, 4)]
    b = b"II*\0" + struct.pack("<I", 8) + struct.pack("<H", len(ent))
    for t, ty, c, v in ent:
        b += struct.pack("<HHII", t, ty, c, v)
    b += struct.pack("<I", 0) + isi
    j = os.path.join(tempfile.mkdtemp(), "m.tif")
    open(j, "wb").write(b)
    t = Tiff(j)
    assert (t.lebar, t.tl, t.kode) == (2, 2, "B") and list(t.ubin(0, 0)) == [1, 2, 3, 4], list(t.ubin(0, 0))
    # prediktor 3 pada float32: kodekan 1.5 dan 2.5 lalu cek balik
    t.bit, t.tl, t.tt, t.pred, t.kode = 32, 2, 1, 3, "f"
    mentah = struct.pack(">2f", 1.5, 2.5)            # urutan byte MSB dulu per bidang
    bid = bytes([mentah[0], mentah[4], mentah[1], mentah[5], mentah[2], mentah[6], mentah[3], mentah[7]])
    diff = bytes([bid[0]] + [(bid[i] - bid[i - 1]) & 255 for i in range(1, 8)])
    a = array.array("f"); a.frombytes(bytes(t._pred3(bytearray(diff))))
    assert list(a) == [1.5, 2.5], list(a)
    print("ok")
