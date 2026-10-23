"""Tren api tahunan per KONSESI dan per DESA dari arsip VIIRS S-NPP 2012-2026 -> public/data/konsesi2026/riwayat_konsesi.json
dan public/data/riwayat_desa/<kode prov>.json.

Titik: sama dengan riwayat_sel.py (S-NPP satu sensor, keyakinan n/h, api vegetasi lewat riwayat_grid.bukan_vegetasi/vegetasi,
hari WIB, kotak Nusantara). Dibaca dari data/raw/firms/viirs_2012_2014.csv + viirs.csv (lokal, tidak di CI).

Titik-dalam-poligon (4,6 juta titik): titik dibin dulu ke sel 0,01 derajat (~1,1 km, sekitar tiga piksel VIIRS); tiap sel
diwakili SATU posisi, rata-rata posisi titik di dalamnya, lalu diuji ke poligon (Indeks aktor_walhi, kotak pembatas + ray casting).
Hampir semua titik sebuah sel ikut poligon yang memuat rata-ratanya; sel yang membelah batas poligon menyumbang seluruh titiknya ke
satu sisi saja (galat batas <= ~1 km). Konsesi yang tumpang tindih: sel dihitung di tiap perusahaan, sekali per perusahaan.
Desa: tiap sel ke satu desa (yang pertama memuatnya). Desa dari data/raw/desa (cahyadsn/wilayah_boundaries, 9 provinsi
prioritas saja); kab/kec dari centroid desa lewat wilayah.Wilayah.

Konsesi dikunci seperti konsesi_laporan.bangun: satu perusahaan = (kunci(nama) atau id, jenis, prov); kunci keluaran = id fitur
pertama perusahaan itu = field "id" tiap perusahaan di konsesi2026/<prov>.json. Hanya perusahaan dengan >= 1 titik yang ditulis.

Pakai:  python3 scripts/data/riwayat_wilayah.py        # bangun
        python3 scripts/data/riwayat_wilayah.py uji    # self-check logika rangkum()
"""
import csv, datetime as dt, glob, json, math, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR, Wilayah  # noqa: E402
from riwayat_grid import bukan_vegetasi, vegetasi  # noqa: E402
from riwayat_sel import X0, X1, Y0, Y1, TH0, THM0, AKTIF_MODIS  # noqa: E402  (kotak, tahun awal, ambang sama dengan riwayat_sel)
from aktor_walhi import Indeks, kunci  # noqa: E402

CELL = 0.01
EL_NINO = (2004, 2006, 2009, 2015, 2019, 2023)   # seri panjang MODIS
TAHUN_AKTIF = AKTIF_MODIS   # titik MODIS per tahun penuh yang dihitung "terbakar" (3, sama dengan riwayat_grid/riwayat_sel)
MIN_DESA = 20      # titik total (VIIRS atau MODIS, semua tahun) agar desa ditulis
TH_PENUH0 = 2013   # S-NPP mulai 19 Jan 2012: 2012 sebagian, bukan tahun penuh (hanya untuk rata-rata yd VIIRS)
DESA_KODE = ["14", "15", "16", "53", "61", "62", "63", "64", "93"]
BARIS = re.compile(r"\('(\d\d\.\d\d\.\d\d\.\d{4})','((?:[^']|'')*)',(-?[\d.]+),(-?[\d.]+),'(\[[^']*\])'\)")


def definisi(th1, doy):
    penuh = list(range(THM0, th1))
    return {
        "n": len(penuh), "tahun_penuh": f"{penuh[0]}-{penuh[-1]}", "thm0": THM0, "th0": TH0, "sd": None,
        "ym": f"titik MODIS Terra+Aqua per tahun {THM0}..{th1} (keyakinan >= 30, api vegetasi); {th1} belum lengkap",
        "y": f"titik VIIRS S-NPP per tahun {TH0}..{th1} (keyakinan n/h); {th1} belum lengkap, {TH0} sebagian (sensor mulai 19 Jan 2012)",
        "a": f"jumlah tahun penuh {penuh[0]}-{penuh[-1]} dengan >= {TAHUN_AKTIF} titik MODIS (dari n tahun penuh)",
        "tr": f"tren dari ym: rata-rata 10 tahun penuh terakhir ({th1 - 10}-{th1 - 1}) dibanding 10 tahun pertama ({THM0}-{THM0 + 9}); naik bila rasio >= 1,5, turun bila <= 0,67, selain itu datar; "
              "tidak dinilai (null) bila 20 tahun itu < " + str(MIN_TREN) + " titik; rt = rasio (null bila pembagi 0)",
        "el": f"rata-rata titik MODIS tahun El Nino {', '.join(map(str, EL_NINO))} dibanding rata-rata tahun penuh lainnya; null bila pembagi 0",
        "yd": f"[titik VIIRS {th1} s.d. hari ke-{doy} tahun, rata-rata VIIRS tahun penuh {TH_PENUH0}-{th1 - 1} pada rentang hari yang sama]",
        "pk": "[tahun, titik MODIS] tahun penuh dengan titik terbanyak (seri: tahun paling awal)",
        "lg": f"desa langganan: a >= ceil(n/3) = {math.ceil(len(penuh) / 3)} tahun penuh",
    }


MIN_TREN = 30   # titik MODIS minimal di dua blok 10 tahun sebelum tren dinilai

def rangkum(y, yd, th1, ym):
    """y, yd = titik VIIRS per tahun TH0..th1 (yd terpotong di hari-dalam-tahun arsip); ym = titik MODIS per tahun THM0..th1."""
    if len(y) != len(yd) or len(y) != th1 - TH0 + 1 or len(ym) != th1 - THM0 + 1:
        raise ValueError(f"panjang seri salah: y={len(y)} yd={len(yd)} ym={len(ym)}, harus {th1 - TH0 + 1}/{th1 - THM0 + 1}")
    penuh = {t: ym[t - THM0] for t in range(THM0, th1)}
    rata = lambda xs: sum(xs) / len(xs)
    r = {"ym": ym, "y": y, "a": sum(1 for v in penuh.values() if v >= TAHUN_AKTIF)}
    akhir10 = [penuh[t] for t in range(th1 - 10, th1)]
    awal10 = [penuh[t] for t in range(THM0, THM0 + 10)]
    if sum(akhir10) + sum(awal10) >= MIN_TREN:   # audit validasi-model 23 Okt 2026: 10 titik dalam 20 tahun terlalu sedikit untuk menyebut "naik"
        a, b = rata(akhir10), rata(awal10)
        rt = a / b if b else None
        r["tr"] = "datar" if rt is None and not a else "naik" if rt is None or rt >= 1.5 else "turun" if rt <= 0.67 else "datar"
        r["rt"] = round(rt, 2) if rt is not None else None
    else:
        r["tr"], r["rt"] = None, None
    en = [v for t, v in penuh.items() if t in EL_NINO]
    lain = [v for t, v in penuh.items() if t not in EL_NINO]
    r["el"] = round(rata(en) / rata(lain), 1) if rata(lain) else None
    r["yd"] = [yd[th1 - TH0], round(rata([yd[t - TH0] for t in range(TH_PENUH0, th1)]), 1)]
    if any(penuh.values()):
        t = max(penuh, key=lambda t: (penuh[t], -t))
        r["pk"] = [t, penuh[t]]
    return r


def baca_modis01(berkas, th1):
    """MODIS, filter sama dengan riwayat_sel.baca_modis (keyakinan >= 30, riwayat_grid.vegetasi, hari UTC) tetapi sel 0,01 derajat
    berposisi rata-rata: -> {(ix,iy): (sum lon, sum lat, [titik per tahun THM0..th1], sama)}."""
    nonveg, out = bukan_vegetasi(berkas), {}
    for r in csv.DictReader(open(berkas)):
        c = r.get("confidence", "")
        th = int(r["acq_date"][:4])
        if not c.isdigit() or int(c) < 30 or not THM0 <= th <= th1 or not vegetasi(r, nonveg):
            continue
        lon, lat = float(r["longitude"]), float(r["latitude"])
        if X0 <= lon < X1 and Y0 < lat <= Y1:
            e = out.setdefault((math.floor(lon / CELL), math.floor(lat / CELL)), [0.0, 0.0, [0] * (th1 - THM0 + 1)])
            e[0] += lon; e[1] += lat; e[2][th - THM0] += 1
    return {k: (e[0], e[1], e[2], e[2]) for k, e in out.items()}


def baca_sel(berkas):
    """-> ({(ix,iy): [sum lon, sum lat, {ordinal hari: n}]}, tanggal terakhir). yd butuh tanggal arsip terakhir, jadi hari disimpan dulu."""
    akhir = dt.date(TH0, 1, 1)
    sel = {}
    for b in berkas:
        nonveg = bukan_vegetasi(b)
        for r in csv.DictReader(open(b)):
            if r["confidence"] not in ("n", "h") or not vegetasi(r, nonveg):
                continue
            lon, lat = float(r["longitude"]), float(r["latitude"])
            if not (X0 <= lon < X1 and Y0 < lat <= Y1):
                continue
            t = r["acq_time"].zfill(4)
            w = (dt.datetime.fromisoformat(r["acq_date"]) + dt.timedelta(hours=int(t[:2]) + 7, minutes=int(t[2:]))).date()
            if w.year < TH0:
                continue
            akhir = max(akhir, w)
            k = (math.floor(lon / CELL), math.floor(lat / CELL))
            c = sel.get(k)
            if c is None:
                c = sel[k] = [0.0, 0.0, {}]
            c[0] += lon; c[1] += lat
            c[2][w.toordinal()] = c[2].get(w.toordinal(), 0) + 1
    return sel, akhir


def sel_ke_tahun(sel, akhir):
    """{(ix,iy): [sum lon, sum lat, n, y[], yd[]]} dengan yd dipotong di hari-dalam-tahun `akhir`."""
    th1, doy = akhir.year, akhir.timetuple().tm_yday
    out = {}
    for k, (sx, sy, hr) in sel.items():
        y, yd = [0] * (th1 - TH0 + 1), [0] * (th1 - TH0 + 1)
        for o, n in hr.items():
            d = dt.date.fromordinal(o)
            y[d.year - TH0] += n
            if d.timetuple().tm_yday <= doy:
                yd[d.year - TH0] += n
        out[k] = (sx, sy, y, yd)
    return out


class Akum:
    def __init__(self, ny):
        self.y, self.yd = [0] * ny, [0] * ny

    def tambah(self, y, yd):
        for i, v in enumerate(y):
            self.y[i] += v
        for i, v in enumerate(yd):
            self.yd[i] += v


def petakan(sel, indeks, ny, kunci_fitur):
    """sel -> {kunci: Akum}; kunci_fitur(i) memberi kunci kelompok fitur i (tumpang tindih: sekali per kunci per sel)."""
    out = {}
    for (sx, sy, y, yd) in sel.values():
        n = sum(y)
        for k in {kunci_fitur(i) for i in indeks.cari(sx / n, sy / n)}:
            out.setdefault(k, Akum(ny)).tambah(y, yd)
    return out


def desa_fitur(prov):
    """-> [{'kode','nama','lat','lng','geometry'}] dari SQL cahyadsn/wilayah_boundaries (path = [lat, lng])."""
    out = []
    for f in sorted(glob.glob(os.path.join(AKAR, f"data/raw/desa/wilayah_boundaries_kel_{prov}.*.sql"))):
        for m in BARIS.finditer(open(f, encoding="utf-8").read()):
            p = json.loads(m[5])
            if not p:
                continue
            balik = lambda ring: [[x[1], x[0]] for x in ring]
            dalam = 0  # 1 = satu cincin, 2 = daftar cincin (tiap cincin dianggap bagian sendiri, lubang diabaikan), 3 = daftar bagian berlubang
            q = p
            while isinstance(q[0], list):
                q, dalam = q[0], dalam + 1
            polys = [[balik(p)]] if dalam == 1 else [[balik(r)] for r in p] if dalam == 2 else [[balik(r) for r in poli] for poli in p]
            out.append({"properties": {"kode": m[1], "nama": m[2].replace("''", "'"), "lat": float(m[3]), "lng": float(m[4])},
                        "geometry": {"type": "MultiPolygon", "coordinates": polys}})
    return out


def main():
    t0 = time.time()
    raw = os.path.join(AKAR, "data/raw/firms")
    sel, akhir = baca_sel([os.path.join(raw, "viirs_2012_2014.csv"), os.path.join(raw, "viirs.csv")])
    sel = sel_ke_tahun(sel, akhir)
    th1, doy = akhir.year, akhir.timetuple().tm_yday
    ny, nym = th1 - TH0 + 1, th1 - THM0 + 1
    selm = baca_modis01(os.path.join(raw, "modis.csv"), th1)
    print(f"{len(sel)} sel VIIRS + {len(selm)} sel MODIS 0,01 derajat, arsip VIIRS s.d. {akhir}, {time.time() - t0:.0f} dtk", file=sys.stderr)
    df = definisi(th1, doy)
    df["sd"] = akhir.isoformat()
    meta = {"sumber": f"NASA FIRMS MODIS Terra+Aqua {THM0}-{th1} (keyakinan >= 30) + VIIRS S-NPP {TH0}-{th1} (keyakinan n/h), api vegetasi", "sd": akhir.isoformat(), "definisi": df}

    # --- konsesi
    lahan = os.path.join(AKAR, "public/data/lahan/konsesi.geojson")
    fitur = json.load(open(lahan))["features"]
    ix = Indeks(fitur)
    grup = {}
    for i, f in enumerate(fitur):
        p = f["properties"]
        grup.setdefault((kunci(p["nama"]) or p["id"], p["jenis"], p["prov"]), []).append(i)
    id_dari = {k: fitur[v[0]]["properties"]["id"] for k, v in grup.items()}
    kunci_i = {i: k for k, v in grup.items() for i in v}
    per, perm = petakan(sel, ix, ny, lambda i: kunci_i[i]), petakan(selm, ix, nym, lambda i: kunci_i[i])
    nol, nolm = Akum(ny), Akum(nym)
    kons = {id_dari[k]: rangkum((per.get(k) or nol).y, (per.get(k) or nol).yd, th1, (perm.get(k) or nolm).y)
            for k in set(per) | set(perm) if sum((per.get(k) or nol).y) + sum((perm.get(k) or nolm).y)}
    p = os.path.join(AKAR, "public/data/konsesi2026/riwayat_konsesi.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump({**meta, "perusahaan": kons}, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"konsesi: {len(kons)} dari {len(grup)} perusahaan bertitik, {os.path.getsize(p) / 1e3:.0f} KB, {time.time() - t0:.0f} dtk", file=sys.stderr)

    # --- desa
    wil = Wilayah()
    kel = os.path.join(AKAR, "public/data/riwayat_desa")
    os.makedirs(kel, exist_ok=True)
    for kode in DESA_KODE:
        fd = desa_fitur(kode)
        if not fd:
            continue
        ind = Indeks(fd)  # tiap sel ke semua desa yang memuat (batas bersama: jarang ganda)
        per, perm = petakan(sel, ind, ny, lambda i: i), petakan(selm, ind, nym, lambda i: i)
        rows = []
        for i in set(per) | set(perm):
            a, am = per.get(i) or nol, perm.get(i) or nolm
            if max(sum(a.y), sum(am.y)) < MIN_DESA:
                continue
            pr = fd[i]["properties"]
            w = wil.cari(pr["lng"], pr["lat"]) or wil.cari(*fd[i]["geometry"]["coordinates"][0][0][0])
            r = rangkum(a.y, a.yd, th1, am.y)
            r.update({"kd": pr["kode"], "desa": pr["nama"], "kab": w[1] if w else "", "kec": w[2] if w else ""})
            r["lg"] = int(r["a"] >= math.ceil(df["n"] / 3))
            rows.append(r)
        rows.sort(key=lambda r: (r["kd"]))
        p = os.path.join(kel, f"{kode}.json")
        json.dump({**meta, "desa": rows}, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
        print(f"desa {kode}: {len(fd)} desa, {len(rows)} ditulis, {sum(r['lg'] for r in rows)} langganan, {os.path.getsize(p) / 1e3:.0f} KB, {time.time() - t0:.0f} dtk", file=sys.stderr)


def uji():
    th1 = 2026
    ny, nym = th1 - TH0 + 1, th1 - THM0 + 1
    y = [0] * ny
    for t in range(2013, 2026): y[t - TH0] = 4
    y[th1 - TH0] = 30
    ym = [2] * nym
    for t in range(2013, 2026): ym[t - THM0] = 4
    for t in (2004, 2006, 2009): ym[t - THM0] = 10
    for t in (2015, 2019, 2023): ym[t - THM0] = 20
    ym[th1 - THM0] = 5
    r = rangkum(y, [v // 2 for v in y], th1, ym)
    # tahun penuh MODIS 2003-2025 (23); >= 3 titik: 3 tahun El Nino awal (10) + 2013-2025 (13) = 16
    assert r["a"] == 16 and r["pk"] == [2015, 20] and r["ym"] == ym, r
    # 2016-2025 = 72 -> 7,2; 2003-2012 = 44 -> 4,4; rasio 1,64
    assert (r["tr"], r["rt"]) == ("naik", 1.64), r
    assert r["el"] == 4.7, r["el"]                 # (3*10 + 3*20)/6 = 15 lawan (7*2 + 10*4)/17 = 3,18
    assert r["yd"] == [15, 2.0], r["yd"]           # VIIRS: yd 2026 = 30 // 2, rata-rata 2013-2025 = 4 // 2
    z = [2] * nym
    for t in range(2016, 2026): z[t - THM0] = 1
    z[0] = z[1] = z[2] = z[3] = z[4] = z[5] = z[6] = z[7] = z[8] = z[9] = 4
    assert rangkum(y, y, th1, z + [0] * 0)["tr"] == "turun"
    z = [3] * nym
    assert rangkum(y, y, th1, z)["tr"] == "datar"
    z = [0] * nym; z[2025 - THM0] = 9
    assert rangkum(y, y, th1, z)["tr"] is None       # < MIN_TREN titik di 20 tahun: tidak dinilai
    z[2025 - THM0] = 29
    assert rangkum(y, y, th1, z)["tr"] is None       # 29 titik, semua di blok akhir: tetap tidak dinilai
    z[2025 - THM0] = 35
    q = rangkum(y, y, th1, z)
    assert (q["tr"], q["rt"], q["el"]) == ("naik", None, 0.0), q   # awal 0 -> naik tanpa rasio
    assert rangkum(y, y, th1, [0] * nym).get("pk") is None
    # masukan salah ditolak: panjang seri tidak cocok tahun arsip
    for salah in (lambda: rangkum(y, y, th1, ym[:-1]), lambda: rangkum(y[:-1], y[:-1], th1, ym), lambda: rangkum(y, y[:-1], th1, ym)):
        try:
            salah()
        except ValueError:
            continue
        raise AssertionError("seri berpanjang salah tidak ditolak")
    # jalur MODIS: berkas CSV kecil -> sel 0,01 berposisi rata-rata, keyakinan < 30 dan type 2 (industri) dibuang
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        f = os.path.join(d, "m.csv")
        open(f, "w").write("latitude,longitude,acq_date,confidence,type\n"
                           "-2.001,113.001,2003-08-01,50,0\n-2.003,113.003,2003-09-01,80,0\n-2.001,113.001,2003-09-02,20,0\n"
                           "-2.001,113.001,2004-08-01,50,2\n-2.001,113.001,1999-08-01,50,0\n-2.101,113.001,2026-01-05,31,0\n")
        m = baca_modis01(f, 2026)
        assert len(m) == 2, m
        sx, sy, ys, _ = m[(math.floor(113.001 / CELL), math.floor(-2.001 / CELL))]
        assert ys[0] == 2 and sum(ys) == 2 and abs(sx / 2 - 113.002) < 1e-9, (sx, ys)   # 2004 (type 2 di sel itu) dan 1999 dan conf 20 dibuang
        assert sum(m[(math.floor(113.001 / CELL), math.floor(-2.101 / CELL))][2]) == 1
    # titik-dalam-poligon: sel di dua blok tumpang tindih milik perusahaan sama dihitung sekali; sel di luar tidak
    kot = lambda x0, x1: {"geometry": {"type": "Polygon", "coordinates": [[[x0, 0], [x1, 0], [x1, 1], [x0, 1], [x0, 0]]]}}
    ind = Indeks([kot(0, 1), kot(0.5, 1.5)])
    yy = [1] + [0] * (ny - 1)
    sel = {(0, 0): (0.6, 0.5, yy, yy), (1, 1): (0.2, 0.5, yy, yy), (2, 2): (2.5, 0.5, yy, yy)}
    per = petakan(sel, ind, ny, lambda i: "A")
    assert list(per) == ["A"] and per["A"].y[0] == 2, per["A"].y
    per = petakan(sel, ind, ny, lambda i: i)
    assert per[0].y[0] == 2 and per[1].y[0] == 1
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
