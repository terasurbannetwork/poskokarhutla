"""IR-17: mengapa kode desa ACEBS (inarisk2) tidak jatuh di kab/kota kodenya. Lab, tanpa keluaran publik.

  python3 -I scripts/bnpb/acebs_telusur.py          # tarik ACEBS ke cache (2,8 MB, sekali) lalu cetak jumlah per sebab
  python3 -I scripts/bnpb/acebs_telusur.py --cek    # self-check tanpa jaringan (titik buatan di poligon buatan)

Rujukan kode dan poligon: desa Kemendagri `public/geo/desa/<kab>.json` (properti `kd`, BIG). Kode dibaca apa adanya;
tidak ada padanan yang ditebak dari nama. Alamat dan titik per lokasi hanya dibaca dari cache, tidak pernah ditulis.
Hasil dan tafsirnya: data/kajian-bnpb/inarisk/RISET.md bagian "IR-17".
"""
import collections, json, math, os, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CACHE = os.path.join(AKAR, "data", "raw", "inarisk", "acebs.geojson")
URL = "https://inarisk2.bnpb.go.id/apiv4/acebs/geojson"
G = 0.1  # sel grid indeks (derajat)
PAPUA_LAMA = ("91", "92")  # provinsi sebelum pemekaran 2022 (Papua Selatan, Tengah, Pegunungan, Barat Daya)


def pip(x, y, rings):
    ins = False
    for r in rings:
        for i in range(len(r)):
            x0, y0 = r[i][0], r[i][1]; x1, y1 = r[i - 1][0], r[i - 1][1]
            if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0:
                ins = not ins
    return ins


class Desa:
    """Indeks grid poligon desa: kode sah, cari desa di titik, jarak ke kab."""

    def __init__(self, fitur):
        self.kode, self.grid, self.sisi = set(), collections.defaultdict(list), collections.defaultdict(list)
        for f in fitur:
            kd = f["properties"]["kd"].replace(".", ""); self.kode.add(kd)
            g = f.get("geometry")
            if not g:
                continue
            ps = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            xs = [p[0] for pol in ps for r in pol for p in r]; ys = [p[1] for pol in ps for r in pol for p in r]
            b = (min(xs), min(ys), max(xs), max(ys))
            for gx in range(math.floor(b[0] / G), math.floor(b[2] / G) + 1):
                for gy in range(math.floor(b[1] / G), math.floor(b[3] / G) + 1):
                    self.grid[(gx, gy)].append((kd, b, ps))
            self.sisi[kd[:4]].extend((r[i - 1], r[i]) for pol in ps for r in pol for i in range(1, len(r)))
        self.kab = {k[:4] for k in self.kode}

    def di(self, x, y):
        for kd, b, ps in self.grid.get((math.floor(x / G), math.floor(y / G)), []):
            if b[0] <= x <= b[2] and b[1] <= y <= b[3] and any(pip(x, y, p) for p in ps):
                return kd
        return None

    def jarak_kab(self, kab, x, y):
        """km dari titik ke tepi poligon desa terdekat di kab itu (bidang datar lokal)."""
        c = math.cos(math.radians(y)); best = 1e9
        for a, b in self.sisi.get(kab, []):
            ax, ay = (a[0] - x) * 111.32 * c, (a[1] - y) * 110.57
            bx, by = (b[0] - x) * 111.32 * c, (b[1] - y) * 110.57
            dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
            u = 0 if L == 0 else max(0, min(1, -(ax * dx + ay * dy) / L))
            best = min(best, math.hypot(ax + u * dx, ay + u * dy))
        return best


def sebab(f, D):
    """Satu sebab per baris, urut: kode dulu, lalu titik. 'cocok' = titik di desa ber-kab sama dengan kodenya."""
    kd = str(f["properties"].get("id_desa") or "").strip()
    if not (kd.isdigit() and len(kd) == 10):
        return "kode_kosong_rusak"
    if kd not in D.kode:
        if kd[:4] not in D.kab and kd[:2] in PAPUA_LAMA:
            return "kode_papua_pra2022"
        return "kode_pola_bps" if kd[6] == "0" else "kode_tak_dikenal"  # desa Kemendagri 4 digit selalu 1xxx/2xxx
    x, y = map(float, f["geometry"]["coordinates"][:2])
    if not (94 <= x <= 142 and -12 <= y <= 7):
        return "titik_rusak"
    td = D.di(x, y)
    if td and td[:4] == kd[:4]:
        return "cocok"
    d = D.jarak_kab(kd[:4], x, y)
    if td is None:
        return "titik_laut_pantai" if d <= 1 else "titik_laut_jauh"
    return "titik_kab_tetangga" if d <= 2 else "titik_kab_lain"


def hitung(fitur, D):
    c = collections.Counter(sebab(f, D) for f in fitur)
    # titik bawaan: satu koordinat yang dipakai baris dengan >= 3 kode kab berbeda (pusat peta, kantor operator)
    kab_per = collections.defaultdict(set)
    for f in fitur:
        kab_per[tuple(round(v, 3) for v in f["geometry"]["coordinates"][:2])].add(str(f["properties"].get("id_desa") or "")[:4])
    bawaan = {k for k, s in kab_per.items() if len(s) >= 3}
    c["_titik_bawaan_di_tak_cocok"] = sum(
        1 for f in fitur if tuple(round(v, 3) for v in f["geometry"]["coordinates"][:2]) in bawaan and sebab(f, D).startswith("titik"))
    return c


def cek():
    kotak = lambda x0, y0: {"type": "Polygon", "coordinates": [[[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1], [x0, y0]]]}
    D = Desa([{"properties": {"kd": "11.01.01.2001"}, "geometry": kotak(100, 0)},
              {"properties": {"kd": "11.02.01.2001"}, "geometry": kotak(101, 0)}])
    t = lambda kd, x, y: {"properties": {"id_desa": kd}, "geometry": {"coordinates": [x, y]}}
    kasus = [(t("1101012001", 100.5, 0.5), "cocok"), (t("", 100.5, 0.5), "kode_kosong_rusak"),
             (t("31", 100.5, 0.5), "kode_kosong_rusak"), (t("9108050008", 100.5, 0.5), "kode_papua_pra2022"),
             (t("1101020013", 100.5, 0.5), "kode_pola_bps"), (t("1101012001", 1100052, 0.5), "titik_rusak"),
             (t("1101012001", 101.005, 0.5), "titik_kab_tetangga"), (t("1101012001", 99.995, 0.5), "titik_laut_pantai"),
             (t("1101012001", 118.0, -2.6), "titik_laut_jauh")]
    for f, harap in kasus:
        assert sebab(f, D) == harap, (f, sebab(f, D), harap)
    jauh = Desa([{"properties": {"kd": "11.01.01.2001"}, "geometry": kotak(100, 0)},
                 {"properties": {"kd": "11.02.01.2001"}, "geometry": kotak(105, 0)},
                 {"properties": {"kd": "33.01.01.2001"}, "geometry": kotak(110, 0)}])
    assert sebab(t("1101012001", 110.5, 0.5), jauh) == "titik_kab_lain"
    c = hitung([t(k, 118.0, -2.6) for k in ("1101012001", "1102012001", "3301012001")], jauh)
    assert c["_titik_bawaan_di_tak_cocok"] == 3, c
    print("cek acebs_telusur: ok")


def main():
    if not os.path.exists(CACHE):
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from inarisk import ambil  # noqa: E402  pakai klien yang sama (UA, ulang)
        teks = ambil(URL)
        assert teks, "ACEBS kosong/404"
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        open(CACHE, "w", encoding="utf-8").write(teks)
    fitur = json.load(open(CACHE, encoding="utf-8"))["features"]
    dir_desa = os.path.join(AKAR, "public", "geo", "desa")
    D = Desa([f for fn in sorted(os.listdir(dir_desa)) for f in json.load(open(os.path.join(dir_desa, fn)))["features"]])
    c = hitung(fitur, D); n = len(fitur)
    for k in sorted(c, key=lambda k: -c[k]):
        print(f"{k:28s} {c[k]:6d} {100 * c[k] / n:6.2f}%")
    sah = sum(v for k, v in c.items() if k in ("cocok",) or k.startswith("titik"))
    print(f"baris {n}; kode desa sah Kemendagri {sah} ({100 * sah / n:.1f}%); titik di kab kodenya {c['cocok']} ({100 * c['cocok'] / n:.1f}%)")


if __name__ == "__main__":
    cek() if "--cek" in sys.argv else main()
