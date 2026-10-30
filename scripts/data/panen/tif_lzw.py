"""Pembaca GeoTIFF ubin LZW 8-bit via HTTP Range (stdlib + numpy; LAB SAJA). Tanpa rasterio/GDAL.
Hanya yang dibutuhkan MapBiomas: 1 pita uint8, ubin, kompresi 5 (LZW), predictor 1, TIFF klasik.
Self-check: python3 tif_lzw.py (dekoder LZW diuji terhadap encoder referensi)."""
import struct, urllib.request, time
import numpy as np
from panen_util import UA


def lzw_decode(data):
    """LZW TIFF (MSB dulu, kode 9-12 bit, 'early change'), clear=256, EOI=257."""
    out = bytearray(); tab = None; nxt = 258; bits = 9; buf = 0; nb = 0; prev = None
    def reset():
        return [bytes([i]) for i in range(256)] + [b"", b""]
    tab = reset()
    for byte in data:
        buf = (buf << 8) | byte; nb += 8
        while nb >= bits:
            code = (buf >> (nb - bits)) & ((1 << bits) - 1); nb -= bits; buf &= (1 << nb) - 1
            if code == 257:
                return bytes(out)
            if code == 256:
                tab = reset(); bits = 9; prev = None; continue
            if prev is None:
                s = tab[code]; out += s; prev = s; continue
            if code < len(tab):
                s = tab[code]; tab.append(prev + s[:1])
            else:
                s = prev + prev[:1]; tab.append(s)
            out += s; prev = s
            n = len(tab) + 1  # early change
            bits = 9 if n < 512 else 10 if n < 1024 else 11 if n < 2048 else 12
    return bytes(out)


def lzw_encode(data):
    """Encoder referensi (hanya untuk uji)."""
    tab = {bytes([i]): i for i in range(256)}; nxt = 258; bits = 9; out = []; cur = b""
    def emit(c): out.append((c, bits))
    emit(256)
    for b in data:
        w = cur + bytes([b])
        if w in tab: cur = w; continue
        emit(tab[cur]); tab[w] = nxt; nxt += 1; cur = bytes([b])
        if nxt >= 4094:
            emit(256); tab = {bytes([i]): i for i in range(256)}; nxt = 258; bits = 9
        else:
            bits = 9 if nxt < 512 else 10 if nxt < 1024 else 11 if nxt < 2048 else 12
    if cur: emit(tab[cur])
    emit(257)
    acc = 0; n = 0; res = bytearray()
    for c, b in out:
        acc = (acc << b) | c; n += b
        while n >= 8: res.append((acc >> (n - 8)) & 255); n -= 8
        acc &= (1 << n) - 1
    if n: res.append((acc << (8 - n)) & 255)
    return bytes(res)


def rng(url, a, b, tries=4):
    err = None
    for i in range(tries):
        try:
            rq = urllib.request.Request(url, headers={"User-Agent": UA, "Range": f"bytes={a}-{b}"})
            with urllib.request.urlopen(rq, timeout=90) as r:
                return r.read()
        except Exception as e:
            err = e; time.sleep(2 ** (i + 1))
    raise err


class Tif:
    def __init__(self, url):
        self.url = url
        h = rng(url, 0, 262143)
        assert h[:2] == b"II" and struct.unpack("<H", h[2:4])[0] == 42, "bukan TIFF klasik little-endian"
        off = struct.unpack("<I", h[4:8])[0]; n = struct.unpack("<H", h[off:off + 2])[0]; e = {}
        for i in range(n):
            t, ty, c, v = struct.unpack("<HHII", h[off + 2 + 12 * i: off + 14 + 12 * i]); e[t] = (ty, c, v)
        g = lambda t: e[t][2]
        assert g(259) == 5 and g(317) == 1 and g(258) == 8, "bukan LZW/predictor1/8-bit"
        self.W, self.H, self.tw, self.th = g(256), g(257), g(322), g(323)
        self.nx = -(-self.W // self.tw); self.ny = -(-self.H // self.th)
        head = rng(url, 0, max(g(324), g(325)) + 4 * e[324][1] + 16)
        N = e[324][1]
        self.off = struct.unpack(f"<{N}I", head[g(324): g(324) + 4 * N]); self.cnt = struct.unpack(f"<{N}I", head[g(325): g(325) + 4 * N])
        sx, sy, _ = struct.unpack("<3d", head[g(33550): g(33550) + 24]); t = struct.unpack("<6d", head[g(33922): g(33922) + 48])
        self.x0, self.y0, self.sx, self.sy = t[3], t[4], sx, sy  # derajat; y turun
        self.cache = {}

    def px(self, lon, lat):
        return int((lon - self.x0) / self.sx), int((self.y0 - lat) / self.sy)

    def tile(self, tx, ty):
        k = ty * self.nx + tx
        if k in self.cache: return self.cache[k]
        if self.cnt[k] == 0:
            a = np.zeros((self.th, self.tw), np.uint8)
        else:
            raw = lzw_decode(rng(self.url, self.off[k], self.off[k] + self.cnt[k] - 1))
            a = np.frombuffer(raw, np.uint8)[: self.th * self.tw].reshape(self.th, self.tw)
        if len(self.cache) > 64: self.cache.clear()
        self.cache[k] = a
        return a

    def val(self, ix, iy):
        if not (0 <= ix < self.W and 0 <= iy < self.H): return 0
        return int(self.tile(ix // self.tw, iy // self.th)[iy % self.th, ix % self.tw])


if __name__ == "__main__":
    import os
    d = bytes(np.random.default_rng(1).integers(0, 6, 40000, dtype=np.uint8)) + bytes(5000)
    assert lzw_decode(lzw_encode(d)) == d
    d2 = os.urandom(300)
    assert lzw_decode(lzw_encode(d2)) == d2
    print("tif_lzw OK")
