"""Titik perkiraan kejadian logbook dari nama desa (KEPUTUSAN-INARISK K6/Q6, SK-113): nama desa + kab4 -> pusat poligon desa.

Pencari desa dipakai ulang: daftar nama public/data/desa_cari.json (kd, desa, kec; kab = kd[:5]) dan poligon public/geo/desa/<kk>.json,
kode kab = kab4 Kemendagri (scripts/siklus/kunci.py), tanpa unduhan baru. Ketat, tidak menebak:
  - nama dinormalkan (huruf kecil, tanpa awalan desa/kel./kelurahan, tanpa tanda baca); dicocokkan HANYA di kab yang dikenal;
  - kecamatan ada di logbook: kandidat dibatasi ke kecamatan itu; tak ada yang cocok = tidak_cocok (tidak jatuh ke kab);
  - kandidat tepat satu = cocok_desa; nol atau lebih dari satu = tidak_cocok (alasan tertulis). Tidak pernah pusat kab/kec.
  - satu kejadian dengan lebih dari satu desa atau kab = tidak_cocok (banyak_desa); satu titik tidak mewakili dua desa.
Titik selalu `dasar: "pusat_desa"`: PERKIRAAN pusat desa (centroid poligon terbesar, bila di luar poligon diganti titik tengah
irisan garis lintang), BUKAN titik kejadian. Titik koordinat nyata dari sumber lain tidak pernah ditimpa (pemanggil: `gabung`).
Keluaran ke data/raw/siklus/titik_desa/<tahun>.json (di luar siklus/, tidak diunggah): {id_kejadian: {status, lat, lon, kd, ...}}.
Pakai: python3 -I scripts/siklus/titik_desa.py bangun [--baris GLOB] [--keluar DIR] | uji
"""
import collections, csv, glob, importlib.util, json, math, os, re, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
CARI = os.path.join(AKAR, "public/data/desa_cari.json")
GEO = os.path.join(AKAR, "public/geo/desa")
BARIS = os.path.join(AKAR, "data/raw/logbook/arsip/*/baris.csv")
KELUAR = os.path.join(AKAR, "data/raw/siklus/titik_desa")
DASAR = "pusat_desa"


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def norm(s):
    s = re.sub(r"[^a-z0-9 ]", " ", (s or "").lower().replace("’", "'"))
    s = re.sub(r"^(desa|ds|kelurahan|kel|gampong|nagari|kampung|kp)\s+", "", s.strip())
    return re.sub(r"\s+", " ", s).strip()


def _pip(x, y, r):
    d = False
    j = len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
            d = not d
        j = i
    return d


def _luas_pusat(r):
    a = cx = cy = 0.0
    for i in range(len(r) - 1):
        k = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
        a += k
        cx += (r[i][0] + r[i + 1][0]) * k
        cy += (r[i][1] + r[i + 1][1]) * k
    return (abs(a) / 2, cx / (3 * a), cy / (3 * a)) if a else (0.0, r[0][0], r[0][1])


def pusat_poligon(geom):
    """GeoJSON Polygon/MultiPolygon -> (lat, lon) di dalam cincin luar terbesar, atau None."""
    t, c = geom.get("type"), geom.get("coordinates") or []
    luar = [p[0] for p in c] if t == "MultiPolygon" else [c[0]] if t == "Polygon" and c else []
    luar = [r for r in luar if len(r) >= 4]
    if not luar:
        return None
    r = max(luar, key=lambda q: _luas_pusat(q)[0])
    _, x, y = _luas_pusat(r)
    if not _pip(x, y, r):          # cekung: titik tengah irisan terlebar pada garis lintang pusat
        xs = []
        for i in range(len(r) - 1):
            (x0, y0), (x1, y1) = r[i], r[i + 1]
            if (y0 > y) != (y1 > y):
                xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        irisan = [(xs[i], xs[i + 1]) for i in range(0, len(xs) - 1, 2)]
        if not irisan:
            return None
        a, b = max(irisan, key=lambda p: p[1] - p[0])
        x = (a + b) / 2
    return round(y, 5), round(x, 5)


class Pencari:
    def __init__(self, cari=CARI, geo=GEO):
        self.geo, self.poli = geo, {}
        self.desa = collections.defaultdict(lambda: collections.defaultdict(list))   # kab4 -> nama normal -> [(kd, kec normal)]
        self.nama = {}
        for kd, d, kec in json.load(open(cari, encoding="utf-8"))["baris"]:
            self.desa[kd[:5].replace(".", "")][norm(d)].append((kd, norm(kec)))
            self.nama[kd] = (d, kec)

    def _pusat(self, kd):
        kk = kd[:5]
        if kk not in self.poli:
            try:
                self.poli[kk] = {f["properties"]["kd"]: f["geometry"] for f in json.load(open(os.path.join(self.geo, kk + ".json")))["features"]}
            except (OSError, ValueError, KeyError):
                self.poli[kk] = {}
        g = self.poli[kk].get(kd)
        return pusat_poligon(g) if g else None

    def cari(self, kab4, desa, kec=None):
        """-> {status: cocok_desa|tidak_cocok, ...}. Satu desa di satu kab."""
        if not kab4 or not norm(desa):
            return {"status": "tidak_cocok", "alasan": "nama_atau_kab_kosong"}
        kand = list(self.desa.get(kab4, {}).get(norm(desa), []))
        if not kand:
            return {"status": "tidak_cocok", "alasan": "desa_tak_ada_di_kab"}
        if norm(kec):
            kand = [k for k in kand if k[1] == norm(kec)]
            if not kand:
                return {"status": "tidak_cocok", "alasan": "kecamatan_tak_cocok"}
        if len(kand) > 1:
            return {"status": "tidak_cocok", "alasan": "kembar"}
        kd = kand[0][0]
        p = self._pusat(kd)
        if p is None:
            return {"status": "tidak_cocok", "alasan": "poligon_tak_ada"}
        return {"status": "cocok_desa", "lat": p[0], "lon": p[1], "kd": kd, "dasar": DASAR}


def titik_kejadian(pencari, baris, kab4=None):
    """baris: dict kolom baris.csv (kabkota, prov_kode, kecamatan, desa) milik SATU kejadian. kab4(nama, prov) dari kunci.py."""
    pasang = set()
    for r in baris:
        kb = kab4(r.get("kabkota"), r.get("prov_kode")) if (r.get("kabkota") or "").strip() and ";" not in r["kabkota"] else None
        for d in [x for x in (r.get("desa") or "").split(";") if x.strip()]:
            pasang.add((kb, norm(d), norm(r.get("kecamatan")) if ";" not in (r.get("kecamatan") or "") else ""))
    if not pasang:
        return {"status": "tidak_cocok", "alasan": "tanpa_desa"}
    desa = {(k, d) for k, d, _ in pasang}
    if len(desa) > 1:
        return {"status": "tidak_cocok", "alasan": "banyak_desa"}
    (k, d), kecs = next(iter(desa)), {c for _, _, c in pasang if c}
    if len(kecs) > 1:
        return {"status": "tidak_cocok", "alasan": "kecamatan_berbeda"}
    return pencari.cari(k, d, next(iter(kecs)) if kecs else None)


def gabung(koordinat_asli, titik):
    """Koordinat nyata menang; titik desa dipakai hanya bila tidak ada dan cocok. -> {lat, lon, dasar} | None."""
    if koordinat_asli and koordinat_asli.get("lat") is not None and koordinat_asli.get("lon") is not None:
        return koordinat_asli
    if titik and titik.get("status") == "cocok_desa":
        return {"lat": titik["lat"], "lon": titik["lon"], "dasar": DASAR}
    return None


def bangun(glob_baris=BARIS, keluar=KELUAR, pencari=None):
    csv.field_size_limit(10 ** 9)
    kn, pencari = _muat("kunci"), pencari or Pencari()
    per = collections.defaultdict(list)
    for f in sorted(glob.glob(glob_baris)):
        with open(f, encoding="utf-8-sig", newline="") as fh:
            for r in csv.DictReader(fh):
                per[r["id_kejadian"]].append(r)
    hasil, rekap, alasan = {}, collections.Counter(), collections.Counter()
    for i, rs in per.items():
        t = titik_kejadian(pencari, rs, kn.kab4)
        hasil[i] = t
        rekap[t["status"]] += 1
        if t["status"] != "cocok_desa":
            alasan[t["alasan"]] += 1
    os.makedirs(keluar, exist_ok=True)
    tahun = collections.defaultdict(dict)
    for i, t in hasil.items():
        tahun[2000 + int(i[2:4])][i] = t
    for th, d in tahun.items():
        with open(os.path.join(keluar, "%d.json" % th), "w", encoding="utf-8") as fh:
            json.dump({"v": 1, "dasar": DASAR, "titik": d}, fh, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    n = len(hasil)
    return {"kejadian": n, "cocok_desa": rekap["cocok_desa"], "tidak_cocok": rekap["tidak_cocok"],
            "persen_cocok": round(100 * rekap["cocok_desa"] / n, 1) if n else None, "alasan": dict(alasan)}


def _uji():
    sq = lambda x0, y0, x1, y1: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]
    assert pusat_poligon({"type": "Polygon", "coordinates": sq(110, -7, 112, -5)}) == (-6.0, 111.0)
    u = [[0, 0], [10, 0], [10, 10], [9, 10], [9, 1], [0, 1], [0, 0]]    # bentuk L: centroid jatuh di luar
    la, lo = pusat_poligon({"type": "Polygon", "coordinates": [u]})
    assert _pip(lo, la, u), "pusat harus di dalam poligon"
    assert norm("Desa  Sumber-Wuluh") == "sumber wuluh" and norm("Kel. Kota Baru") == "kota baru" and norm("Kelurahan Ds") == "ds"
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        json.dump({"baris": [["33.08.01.2001", "Tuksongo", "Borobudur"], ["33.08.02.2001", "Kembar", "A"], ["33.08.03.2001", "Kembar", "B"],
                             ["33.08.01.2002", "Hilang", "Borobudur"], ["33.09.01.2001", "Tuksongo", "Lain"]], "kab": {}}, open(os.path.join(t, "c.json"), "w"))
        json.dump({"features": [{"properties": {"kd": "33.08.01.2001"}, "geometry": {"type": "Polygon", "coordinates": sq(110, -8, 111, -7)}}]},
                  open(os.path.join(t, "33.08.json"), "w"))
        p = Pencari(os.path.join(t, "c.json"), t)
        c = p.cari("3308", "Desa Tuksongo", "Borobudur")
        assert c == {"status": "cocok_desa", "lat": -7.5, "lon": 110.5, "kd": "33.08.01.2001", "dasar": DASAR}, c
        assert p.cari("3308", "Tuksongo")["status"] == "cocok_desa"
        assert p.cari("3308", "Tuksongo", "Mungkid")["alasan"] == "kecamatan_tak_cocok", "kecamatan ada tapi beda: jangan jatuh ke kab"
        assert p.cari("3308", "Kembar")["alasan"] == "kembar" and p.cari("3308", "Kembar", "B")["alasan"] == "poligon_tak_ada"
        assert p.cari("3309", "Tuksongo")["alasan"] == "poligon_tak_ada", "kab lain: desa sama nama tidak dipinjam"
        assert p.cari("3308", "Hilang", "Borobudur")["alasan"] == "poligon_tak_ada", "poligon tak ada = tanpa titik, bukan titik kab"
        assert p.cari("3310", "Tuksongo")["alasan"] == "desa_tak_ada_di_kab" and p.cari(None, "x")["status"] == "tidak_cocok"
        k4 = lambda n, pv: "3308" if "Magelang" in n else None
        R = lambda d, kab="Kab. Magelang", kec="Borobudur": {"kabkota": kab, "prov_kode": "33", "kecamatan": kec, "desa": d}
        assert titik_kejadian(p, [R("Tuksongo"), R("tuksongo")], k4)["status"] == "cocok_desa"
        assert titik_kejadian(p, [R("Tuksongo; Hilang")], k4)["alasan"] == "banyak_desa"
        assert titik_kejadian(p, [R("")], k4)["alasan"] == "tanpa_desa"
        assert titik_kejadian(p, [R("Tuksongo", kab="Kab. Lain")], k4)["alasan"] == "nama_atau_kab_kosong"
    asli = {"lat": -1.0, "lon": 100.0}
    assert gabung(asli, {"status": "cocok_desa", "lat": 5, "lon": 6}) is asli, "koordinat nyata tidak ditimpa"
    assert gabung(None, {"status": "tidak_cocok"}) is None and gabung(None, {"status": "cocok_desa", "lat": 5, "lon": 6})["dasar"] == DASAR
    print("titik_desa: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    op = lambda n, b: a[a.index(n) + 1] if n in a else b
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["bangun"]:
        print(json.dumps(bangun(op("--baris", BARIS), op("--keluar", KELUAR)), ensure_ascii=False, indent=1))
    else:
        sys.exit("pakai: titik_desa.py bangun [--baris GLOB] [--keluar DIR] | uji")
