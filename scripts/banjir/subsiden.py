"""Penurunan tanah per kecamatan: dekomposisi vertikal + agregasi dari laju LOS hasil LiCSBAS.

Data TIDAK diproses di repo. LiCSAR publik tidak punya produk laju untuk Indonesia (`vlos_eur.tif` hanya
koreksi gerak lempeng), jadi laju LOS dihitung di luar repo dengan LiCSBAS (Morishita dkk. 2020) dari
interferogram COMET LiCSAR; resepnya di RISET-SUBSIDEN.md. Skrip ini (stdlib saja) hanya:
  1. membaca laju LOS naik dan turun (float32 mentah LiCSBAS, `vel.filt.mskd`) + vektor pandang E, U + `EQA.dem_par`;
  2. mendekomposisi ke vertikal (`vertikal`), mereferensikan ke area stabil;
  3. mengagregasi per kecamatan (public/geo/kecamatan) dan menulis public/banjir/data/subsiden.json.
Terbit hanya bila pola lolos `gerbang_pola`: pesisir utara Jakarta harus turun lebih cepat dari selatan
(bila tidak, tidak ada berkas ditulis: kami tidak menerbitkan angka yang tak masuk akal).

Dekomposisi: v_LOS = E*vE + U*vU (vN diabaikan: orbit hampir kutub). Dua geometri -> selesaikan vU;
satu geometri -> vU = v_LOS / U (asumsi gerak murni vertikal). Tanda: LiCSBAS mm/thn, positif = mendekati satelit
(naik), jadi vertikal negatif = turun. Hasil dilaporkan cm/thn.
ASUMSI: HIPOTESIS sampai dibandingkan dengan GNSS/levelling (subsiden_literatur.json).

Pakai: python3 scripts/banjir/subsiden.py uji
       python3 scripts/banjir/subsiden.py hitung <kota> <prov> <dir_naik> <dir_turun> <frame_naik> <frame_turun> <periode> [ref_lat [tgl_awal tgl_akhir]]
Atribusi: Contains modified Copernicus Sentinel data; COMET LiCSAR (Lazecky dkk. 2020); LiCSBAS (Morishita dkk. 2020).
"""
import array, json, math, os, random, statistics, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, simpan
from wilayah import AKAR, _cincin

ATRIBUSI = "Contains modified Copernicus Sentinel data; COMET LiCSAR (Lazecky dkk. 2020); LiCSBAS (Morishita dkk. 2020)"
VERSI = 3           # 2 = tambah p10, galat, tgl_awal/tgl_akhir (PT-03); 3 = galat bootstrap blok (K3)
MIN_PIKSEL = 10     # kecamatan dengan piksel valid lebih sedikit tidak dilaporkan
SAH_MM = 400.0      # |laju LOS| lebih besar = pencilan, dibuang
U_MIN = 0.3
DET_MIN = 0.35      # |E_a/U_a - E_t/U_t| minimum agar dua geometri stabil
BLOK_DERAJAT = 0.01  # D9 [BAWAAN SEMENTARA]: sisi blok bootstrap (~1,1 km), belum diukur dari variogram
BOOT_N = 200
BLOK_MIN = 4        # kurang dari ini: galat tidak dihitung (None), tidak diproyeksikan


def baca_par(jalur):
    """EQA.dem_par (format GAMMA) -> dict width, length, lat0, lon0, dlat, dlon (pojok kiri-atas piksel)."""
    d = {}
    for baris in open(jalur):
        k, _, v = baris.partition(":")
        if v.strip():
            d[k.strip()] = v.split()[0]
    return dict(w=int(d["width"]), h=int(d["nlines"] if "nlines" in d else d["length"]),
                lat0=float(d["corner_lat"]), lon0=float(d["corner_lon"]), dlat=float(d["post_lat"]), dlon=float(d["post_lon"]))


def baca_raw(jalur, w, h):
    a = array.array("f")
    with open(jalur, "rb") as f:
        a.fromfile(f, w * h)
    if sys.byteorder != "little":
        a.byteswap()
    return [a[j * w:(j + 1) * w] for j in range(h)]


class Kisi:
    """Raster lintang-bujur: baris ke selatan (dlat negatif)."""
    def __init__(s, par, baris):
        s.p, s.v = par, baris

    def di(s, lon, lat):
        i = int(math.floor((lon - s.p["lon0"]) / s.p["dlon"]))
        j = int(math.floor((lat - s.p["lat0"]) / s.p["dlat"]))
        return s.v[j][i] if 0 <= j < s.p["h"] and 0 <= i < s.p["w"] else float("nan")

    def pusat(s, i, j):
        return s.p["lon0"] + (i + .5) * s.p["dlon"], s.p["lat0"] + (j + .5) * s.p["dlat"]


def vertikal(a, t):
    """a, t = (vlos mm/thn, E, U) naik / turun atau None. -> (vertikal mm/thn, metode) atau None."""
    def sah(p):
        return p is not None and all(v == v for v in p) and p[2] > U_MIN and abs(p[0]) < SAH_MM
    a, t = (a if sah(a) else None), (t if sah(t) else None)
    if a and t:
        det = a[1] / a[2] - t[1] / t[2]
        ya, yt = a[0] / a[2], t[0] / t[2]  # vlos/U = (E/U)*vE + vU
        if abs(det) >= DET_MIN:
            return ya - a[1] / a[2] * (ya - yt) / det, "dua"
        return (ya + yt) / 2, "rata"
    p = a or t
    return (p[0] / p[2], "satu") if p else None


def kuantil(xs, q):
    xs = sorted(xs)
    i = (len(xs) - 1) * q
    lo = int(i)
    return xs[lo] + (xs[min(lo + 1, len(xs) - 1)] - xs[lo]) * (i - lo)


def blok_kunci(p, i, j):
    """Kunci blok bootstrap untuk piksel kolom i, baris j."""
    return int(i * abs(p["dlon"]) / BLOK_DERAJAT), int(j * abs(p["dlat"]) / BLOK_DERAJAT)


def sb_median_blok(blok, benih):
    """blok = {kunci: [nilai]} -> simpangan baku median dari BOOT_N ulangan bootstrap blok spasial (K3), satuan nilai.
    Blok diambil ulang dengan pengembalian, jadi piksel berkorelasi di dalam satu blok ikut bersama. None bila < BLOK_MIN blok."""
    isi = [v for v in blok.values() if v]
    if len(isi) < BLOK_MIN:
        return None
    r = random.Random(benih)
    return statistics.pstdev([statistics.median([x for b in r.choices(isi, k=len(isi)) for x in b]) for _ in range(BOOT_N)])


def sapu(cincin, lat, lon0, dlon, n):
    """Rentang kolom [i0,i1) yang pusatnya di dalam cincin pada garis `lat` (pengisian garis pindai)."""
    xs = []
    for k in range(len(cincin)):
        (x1, y1), (x2, y2) = cincin[k][:2], cincin[k - 1][:2]
        if (y1 > lat) != (y2 > lat):
            xs.append(x1 + (lat - y1) * (x2 - x1) / (y2 - y1))
    xs.sort()
    for i in range(0, len(xs) - 1, 2):
        yield max(0, math.ceil((xs[i] - lon0) / dlon - .5)), min(n, math.floor((xs[i + 1] - lon0) / dlon - .5) + 1)


def agregasi(fitur, g, min_piksel=MIN_PIKSEL, vstd=None, tgl=(None, None)):
    """g = Kisi vertikal (mm/thn) -> baris per kecamatan; cm/thn, negatif = turun.
    vstd = Kisi galat piksel VERTIKAL (vstd LiCSBAS dibagi U, mm/thn, grid sama) atau None; tgl = (awal, akhir) deret.
    galat (cm/thn) = akar(sb_median_blok^2 + 1,2533^2 * rerata vstd^2 / jumlah blok) (K3, ALGORITMA 4); None bila
    kurang dari BLOK_MIN blok. galat_sumber = "vstd" atau "antarpiksel_saja"."""
    p, hasil = g.p, []
    for f in fitur:
        nilai, ses, total, blok = [], [], 0, {}
        for r in _cincin(f["geometry"]):
            ys = [c[1] for c in r]
            j0 = max(0, math.ceil((max(ys) - p["lat0"]) / p["dlat"] - .5))
            j1 = min(p["h"] - 1, math.floor((min(ys) - p["lat0"]) / p["dlat"] - .5))
            for j in range(j0, j1 + 1):
                lat = p["lat0"] + (j + .5) * p["dlat"]
                for i0, i1 in sapu(r, lat, p["lon0"], p["dlon"], p["w"]):
                    total += i1 - i0
                    for i in range(i0, i1):
                        if g.v[j][i] == g.v[j][i]:
                            nilai.append(g.v[j][i])
                            blok.setdefault(blok_kunci(p, i, j), []).append(g.v[j][i])
                    if vstd:
                        ses += [e for v, e in zip(g.v[j][i0:i1], vstd.v[j][i0:i1]) if v == v and e == e]
        if len(nilai) >= min_piksel:
            sb, nb = sb_median_blok(blok, f["properties"]["kec"]), len(blok)
            ev = 1.2533 ** 2 * sum(e * e for e in ses) / len(ses) / nb if ses else 0.0
            galat = None if sb is None else round(math.sqrt(sb * sb + ev) / 10, 2)
            hasil.append(dict(kec=f["properties"]["kec"], kab=f["properties"]["kab"], n=len(nilai),
                              cakupan=round(100 * len(nilai) / max(total, 1)),
                              med=round(statistics.median(nilai) / 10, 1),
                              p90=round(kuantil(nilai, .10) / 10, 1),  # P90 sisi turun: 90% piksel tidak lebih dalam dari ini
                              p10=round(kuantil(nilai, .90) / 10, 1),  # sisi naik/dangkal
                              galat=galat, blok=nb,
                              galat_sumber="vstd" if ses else "antarpiksel_saja",
                              tgl_awal=tgl[0], tgl_akhir=tgl[1]))
    return hasil


def gerbang_pola(hasil):
    """Jakarta: median laju kecamatan Jakarta Utara harus lebih turun >= 1 cm/thn dari Jakarta Selatan. -> (lolos, utara, selatan)."""
    def med(kata):
        x = [h["med"] for h in hasil if kata in h["kab"]]
        return statistics.median(x) if x else None
    u, s = med("Jakarta Utara"), med("Jakarta Selatan")
    return (u is not None and s is not None and u <= s - 1.0), u, s


def galat_acuan(blok, va, vt):
    """e_ref cm/thn = sb bootstrap blok median piksel acuan + |selisih median acuan naik vs turun| (K3); None bila tak bisa.
    blok = {kunci: [vertikal mm/thn]} piksel acuan gabungan; va, vt = vertikal acuan hanya-naik, hanya-turun."""
    sb = sb_median_blok(blok, "acuan")
    if sb is None or not va or not vt:
        return None
    return round((sb + abs(statistics.median(va) - statistics.median(vt))) / 10, 3)


def hitung(kota, prov, dn, dt, fn, ft, periode, ref_lat=None, tgl=(None, None)):
    pa, pt = baca_par(os.path.join(dn, "EQA.dem_par")), baca_par(os.path.join(dt, "EQA.dem_par"))
    rd = lambda d, p, n: Kisi(p, baca_raw(os.path.join(d, n), p["w"], p["h"]))
    A = [rd(dn, pa, n) for n in ("vel.filt.mskd", "E.geo", "U.geo")]
    T = [rd(dt, pt, n) for n in ("vel.filt.mskd", "E.geo", "U.geo")]
    nan = float("nan")
    # grid keluaran = grid turun; naik diambil terdekat
    V, metode, ra, rt = [], {}, [], []  # ra, rt: vertikal tunggal-geometri di area acuan (untuk e_ref)
    for j in range(pt["h"]):
        baris = array.array("f")
        for i in range(pt["w"]):
            lon, lat = T[0].pusat(i, j)
            t = tuple(k.v[j][i] for k in T)
            a = tuple(k.di(lon, lat) for k in A)
            r = vertikal(a, t)
            baris.append(r[0] if r else nan)
            if ref_lat is None or lat <= ref_lat:
                for dst, x in ((ra, vertikal(a, None)), (rt, vertikal(None, t))):
                    if x:
                        dst.append(x[0])
            if r:
                metode[r[1]] = metode.get(r[1], 0) + 1
        V.append(baris)
    g = Kisi(pt, V)
    # referensi: median piksel dengan lintang <= ref_lat (area stabil di selatan; dipilih manual dan dilaporkan)
    ref, rblok = [], {}
    for j, b in enumerate(V):
        if ref_lat is None or g.pusat(0, j)[1] <= ref_lat:
            for i, v in enumerate(b):
                if v == v:
                    ref.append(v)
                    rblok.setdefault(blok_kunci(pt, i, j), []).append(v)
    med_ref = statistics.median(ref)
    for b in V:
        for i in range(len(b)):
            b[i] -= med_ref
    fitur = json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{prov}.json")))["features"]
    e_ref = galat_acuan(rblok, ra, rt)  # nilai sebelum dikurangi median; simpangan tak terpengaruh
    vs = os.path.join(dt, "vstd")  # opsional: galat piksel LiCSBAS geometri turun; dibagi U -> galat vertikal
    gv = None
    if os.path.exists(vs):
        sv = baca_raw(vs, pt["w"], pt["h"])
        gv = Kisi(pt, [array.array("f", [(e / u if u > U_MIN else nan) for e, u in zip(sv[j], T[2].v[j])]) for j in range(pt["h"])])
    hasil = agregasi(fitur, g, vstd=gv, tgl=tgl)
    if e_ref is None:
        for h in hasil:
            h["acuan_belum_dihitung"] = True
    ok, u, s = gerbang_pola(hasil)
    return dict(versi=VERSI, kota=kota, periode=periode, frame=dict(naik=fn, turun=ft), metode_piksel=metode,
                referensi=dict(median_dikurangkan_cm_thn=round(med_ref / 10, 2), lintang_maks=ref_lat,
                               galat_cm_thn=e_ref, acuan_belum_dihitung=e_ref is None,
                               catatan="median piksel area stabil (selatan, dataran tinggi) dikurangkan"),
                galat_jenis="bootstrap_blok",
                gerbang=dict(lolos=ok, utara=u, selatan=s), kecamatan=hasil), ok


# --- uji tanpa jaringan -------------------------------------------------------------------------------------------

def uji():
    ea, et, u = -0.55, 0.55, 0.83  # naik mengintip ke barat, turun ke timur; U = cos(insiden)
    for vu, ve in [(-100.0, 0.0), (-50.0, 20.0), (30.0, -10.0)]:
        got = vertikal((ea * ve + u * vu, ea, u), (et * ve + u * vu, et, u))
        assert abs(got[0] - vu) < 1e-6 and got[1] == "dua", (vu, ve, got)
    assert vertikal((-83.0, -0.55, 0.83), None) == (-100.0, "satu")
    assert vertikal((-83.0, 0.1, 0.83), (-83.0, 0.1, 0.83))[1] == "rata"
    nan = float("nan")
    assert vertikal((nan, 0, 1), None) is None and vertikal((900.0, 0, 1), None) is None and vertikal((1.0, 0, .1), None) is None
    assert kuantil([1, 2, 3, 4, 5], .5) == 3 and kuantil([0, 10], .1) == 1.0
    # agregasi: kisi 8x8 piksel 0,1 derajat dari (0, 0,8) ke selatan; kolom 0-3 = -100 mm/thn, kolom 4-7 kosong
    v = [array.array("f", [-100.0] * 4 + [nan] * 4) for _ in range(8)]
    g = Kisi(dict(w=8, h=8, lat0=.8, lon0=0.0, dlat=-.1, dlon=.1), v)
    kot = lambda x0, x1: {"type": "Polygon", "coordinates": [[[x0, 0.0], [x1, 0.0], [x1, .8], [x0, .8], [x0, 0.0]]]}
    fit = [dict(properties=dict(kec="A", kab="X"), geometry=kot(0.0, .4)), dict(properties=dict(kec="B", kab="X"), geometry=kot(.4, .8))]
    h = agregasi(fit, g, 1)
    assert [x["kec"] for x in h] == ["A"] and h[0]["n"] == 32 and h[0]["med"] == -10.0 and h[0]["cakupan"] == 100, h
    # p10, galat, tanggal; vstd menambah galat
    vk = [array.array("f", [30.0] * 4 + [nan] * 4) for _ in range(8)]
    h2 = agregasi(fit, g, 1, vstd=Kisi(g.p, vk), tgl=("2019-01-01", "2025-01-01"))[0]
    assert h2["p10"] == -10.0 and h2["tgl_awal"] == "2019-01-01" and h2["tgl_akhir"] == "2025-01-01", h2
    assert abs(h2["galat"] - round(1.2533 * 30 / math.sqrt(32) / 10, 2)) < 1e-9 and h[0]["galat"] == 0.0, (h2, h[0])
    assert h2["galat_sumber"] == "vstd" and h[0]["galat_sumber"] == "antarpiksel_saja"
    # suku pvariance tak nol: nilai bervariasi -> galat > 0 tanpa vstd
    vv = [array.array("f", [-100.0, -200.0, -100.0, -200.0] + [nan] * 4) for _ in range(8)]
    h3 = agregasi(fit, Kisi(g.p, vv), 1)[0]
    assert h3["galat"] > 0 and h3["blok"] == 32, h3
    # bootstrap blok: < BLOK_MIN blok -> None; blok seragam -> 0; benih tetap -> sama; blok berkorelasi -> lebih lebar dari rumus bebas
    assert sb_median_blok({k: [1.0] for k in range(3)}, "x") is None and sb_median_blok({k: [2.0] for k in range(5)}, "x") == 0.0
    bk = {k: [float(k % 3)] * 10 for k in range(12)}
    assert sb_median_blok(bk, "x") == sb_median_blok(bk, "x")
    datar = [x for b in bk.values() for x in b]
    assert sb_median_blok(bk, "x") > 1.2533 * statistics.pstdev(datar) / math.sqrt(len(datar)), "blok harus melebarkan galat"
    # kecamatan kecil di dalam satu blok 0,01 derajat -> galat None
    v1 = [array.array("f", [-100.0] * 8) for _ in range(8)]
    kecil = Kisi(dict(w=8, h=8, lat0=.8, lon0=0.0, dlat=-.001, dlon=.001), v1)
    kot2 = {"type": "Polygon", "coordinates": [[[0.0, .792], [.008, .792], [.008, .8], [0.0, .8], [0.0, .792]]]}
    hk = agregasi([dict(properties=dict(kec="K", kab="X"), geometry=kot2)], kecil, 1)[0]
    assert hk["blok"] == 1 and hk["galat"] is None, hk
    # e_ref: blok seragam (sb 0) + selisih median 20 mm -> 2 cm; tak bisa dihitung -> None
    assert galat_acuan({k: [5.0] for k in range(4)}, [10.0], [-10.0]) == 2.0
    assert galat_acuan({0: [1.0]}, [1.0], [1.0]) is None and galat_acuan({k: [1.0] for k in range(4)}, [], [1.0]) is None
    # gerbang pola
    assert gerbang_pola([dict(kab="Jakarta Utara", med=-6), dict(kab="Jakarta Selatan", med=-1)])[0]
    assert not gerbang_pola([dict(kab="Jakarta Utara", med=-1), dict(kab="Jakarta Selatan", med=-1)])[0]
    assert not gerbang_pola([dict(kab="Jakarta Utara", med=-6)])[0]
    # baca_par + baca_raw lewat berkas sementara
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        open(os.path.join(d, "p"), "w").write("width: 3\nnlines: 2\ncorner_lat: -6.0 decimal degrees\ncorner_lon: 106.5 decimal degrees\npost_lat: -0.003 decimal degrees\npost_lon: 0.003 decimal degrees\n")
        a = array.array("f", [1, 2, 3, 4, 5, 6])
        a.tofile(open(os.path.join(d, "r"), "wb"))
        p = baca_par(os.path.join(d, "p"))
        assert p["w"] == 3 and p["h"] == 2 and p["lat0"] == -6.0, p
        r = baca_raw(os.path.join(d, "r"), 3, 2)
        assert list(r[1]) == [4, 5, 6] and Kisi(p, r).di(106.5 + .0045, -6.0 - .0045) == 5.0
    print("subsiden uji: OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["hitung"] and len(a) >= 8:
        hasil, ok = hitung(a[1], a[2], a[3], a[4], a[5], a[6], a[7], float(a[8]) if len(a) > 8 else None,
                           (a[9], a[10]) if len(a) > 10 else (None, None))
        print(json.dumps(hasil["gerbang"]), "kecamatan:", len(hasil["kecamatan"]))
        if not ok:
            sys.exit("gerbang pola GAGAL: tidak diterbitkan")
        hasil["dihitung"] = __import__("datetime").date.today().isoformat()
        hasil["atribusi"] = ATRIBUSI
        hasil["label"] = "hipotesis: laju vertikal kasar dari LOS, belum divalidasi GNSS"
        simpan(os.path.join(KELUAR, "subsiden.json"), hasil)
    else:
        print(__doc__)
