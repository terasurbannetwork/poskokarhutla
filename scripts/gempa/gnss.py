"""Panen #22: deret waktu GNSS Nevada Geodetic Laboratory (Sumatra) -> kecepatan stasiun, penanda transien, indeks regangan per provinsi.

Sumber : https://geodesy.unr.edu/gps_timeseries/IGS20/tenv3/SU/<STA>.SU.tenv3  (harian, kerangka IGS20, E/N/U meter)
         https://geodesy.unr.edu/NGLStationPages/DataHoldings.txt (letak, rentang)  dan  .../steps.txt (loncatan antena/gempa)
Sitasi : Blewitt, G., W. C. Hammond, C. Kreemer (2018), Harnessing the GPS data explosion for interdisciplinary science,
         Eos, 99, https://doi.org/10.1029/2018EO104623.  Data NGL bebas dipakai dengan sitasi tersebut.
Metode : per stasiun & komponen (E, N), jendela 6 tahun terakhir milik stasiun itu: kuadrat terkecil
         x = a + b t + tahunan + semitahunan + loncatan (tiap entri steps.txt di dalam jendela, minimal 30 hari dari tepi);
         pencilan |r| > 4 x MAD (1,4826) dibuang bertahap; sigma kecepatan = sigma LSQ x sqrt((1+phi)/(1-phi)) (phi = autokorelasi lag-1 residu, AR1).
Transien: model dilatih sampai 30 hari sebelum data terakhir, median residual 30 hari terakhir dibandingkan sebaran median 30-hari-bergulir
         latar (robust, 1,4826 MAD): bendera bila |z| > 3 pada E atau N. BUKAN peringatan dini: ini penanda statistik, bisa berupa loncatan
         gempa yang belum masuk steps.txt, hujan/antena, atau gerak lambat sungguhan. Hanya stasiun aktif (data <= 60 hari dari yang terbaru) dinilai.
Regangan: per provinsi (kode 11-18, 7-8 provinsi Sumatra; stasiun di timur 116 BT dibuang), medan kecepatan v = v0 + G x dipasang pada
         >= 4 stasiun; indeks = sqrt(exx^2 + eyy^2 + 2 exy^2) (nanoregangan/tahun; 1 mm/th per km = 1000 nstrain/th), sigma dari 200 undian sigma kecepatan.
         Translasi bersama (gerak lempeng Sunda ~30 mm/th) hilang di G. Stasiun beda zaman (sebagian berhenti 2021-2024) dicampur: lihat catatan.
Pakai  : python3 scripts/gempa/gnss.py ambil | hitung | uji
"""
import json, math, os, random, statistics, sys
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import umum

BASE = "https://geodesy.unr.edu/"
CACHE = os.path.join(umum.AKAR, "data/raw/gempa/gnss")
BULAN = {m: i + 1 for i, m in enumerate("JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split())}
JENDELA_TH = 6.0
MIN_TH, MIN_OBS, AKHIR_MIN = 3.0, 800, "2021-01-01"
PROV_SUMATRA = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan",
                "17": "Bengkulu", "18": "Lampung"}


def tahun_desimal(s):
    """'17MAY04' -> 2017.34"""
    d = date(2000 + int(s[:2]) if int(s[:2]) < 90 else 1900 + int(s[:2]), BULAN[s[2:5]], int(s[5:7]))
    return d.year + (d.timetuple().tm_yday - 0.5) / (366 if d.year % 4 == 0 else 365)


def stasiun_daftar():
    """DataHoldings -> stasiun Sumatra yang cukup panjang dan berakhir >= AKHIR_MIN."""
    t = umum.ambil(BASE + "NGLStationPages/DataHoldings.txt", mentah=True).decode()
    out = []
    for b in t.splitlines()[1:]:
        p = b.split()
        if len(p) < 10:
            continue
        lat, lon = float(p[1]), float(p[2])
        if not (-6.5 <= lat <= 6.2 and 94 <= lon <= 109 and lon < 116):
            continue
        if p[8] < AKHIR_MIN or (date.fromisoformat(p[8]) - date.fromisoformat(p[7])).days < MIN_TH * 365.25:
            continue
        pr = umum.terdekat(lat, lon, 100)
        if pr and pr[0] in PROV_SUMATRA:
            out.append({"id": p[0], "lat": lat, "lon": lon, "prov": pr[0], "mulai": p[7], "akhir": p[8]})
    return out


def muat_deret(sta):
    j = os.path.join(CACHE, sta + ".tenv3")
    if not os.path.exists(j):
        os.makedirs(CACHE, exist_ok=True)
        open(j, "wb").write(umum.ambil(f"{BASE}gps_timeseries/IGS20/tenv3/SU/{sta}.SU.tenv3", mentah=True))
    return parse_tenv3(open(j).read())


def parse_tenv3(teks):
    """-> (t[], E_mm[], N_mm[]) menurut tahun desimal."""
    t, e, n = [], [], []
    for b in teks.splitlines()[1:]:
        p = b.split()
        if len(p) < 17:
            continue
        t.append(float(p[2])); e.append(float(p[8]) * 1000); n.append(float(p[10]) * 1000)
    return t, e, n


def muat_steps():
    j = os.path.join(CACHE, "steps.txt")
    if not os.path.exists(j):
        os.makedirs(CACHE, exist_ok=True)
        open(j, "wb").write(umum.ambil(BASE + "NGLStationPages/steps.txt", mentah=True))
    d = {}
    for b in open(j).read().splitlines():
        p = b.split()
        if len(p) >= 3 and p[1][:2].isdigit() and p[1][2:5] in BULAN:
            try:
                d.setdefault(p[0], []).append(tahun_desimal(p[1]))
            except ValueError:
                pass
    return d


# --- LSQ stdlib ---------------------------------------------------------------------------------------------------------------
def selesaikan(A, b):
    """Gauss-Jordan dengan pivot parsial; kembalikan (x, A^-1). A kecil (<= ~40)."""
    n = len(A)
    M = [A[i][:] + [b[i]] + [1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[p][c]) < 1e-12:
            raise ValueError("matriks singular")
        M[c], M[p] = M[p], M[c]
        pv = M[c][c]
        M[c] = [v / pv for v in M[c]]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c]
                M[r] = [v - f * w for v, w in zip(M[r], M[c])]
    return [M[i][n] for i in range(n)], [row[n + 1:] for row in M]


def desain(t, t0, loncatan):
    w = 2 * math.pi
    return [[1.0, ti - t0, math.sin(w * ti), math.cos(w * ti), math.sin(2 * w * ti), math.cos(2 * w * ti)] +
            [1.0 if ti >= s else 0.0 for s in loncatan] for ti in t]


def lsq(X, y):
    k = len(X[0])
    AtA = [[sum(r[i] * r[j] for r in X) for j in range(k)] for i in range(k)]
    Aty = [sum(r[i] * v for r, v in zip(X, y)) for i in range(k)]
    x, inv = selesaikan(AtA, Aty)
    return x, inv


def mad_sigma(v):
    m = statistics.median(v)
    return 1.4826 * statistics.median(abs(a - m) for a in v)


def fit(t, y, t0, loncatan, putaran=4):
    """-> dict(b, sb, phi, sigma, n, buang, params, idx). Pencilan 4 MAD dibuang bertahap."""
    idx = list(range(len(t)))
    for _ in range(putaran):
        X = desain([t[i] for i in idx], t0, loncatan)
        x, inv = lsq(X, [y[i] for i in idx])
        res = [y[i] - sum(a * b for a, b in zip(r, x)) for i, r in zip(idx, X)]
        s = mad_sigma(res) or 1e-6
        baru = [i for i, r in zip(idx, res) if abs(r) <= 4 * s]
        if len(baru) == len(idx):
            break
        idx = baru
    X = desain([t[i] for i in idx], t0, loncatan)
    x, inv = lsq(X, [y[i] for i in idx])
    res = [y[i] - sum(a * b for a, b in zip(r, x)) for i, r in zip(idx, X)]
    sg = math.sqrt(sum(r * r for r in res) / max(1, len(res) - len(x)))
    num = sum(a * b for a, b in zip(res[1:], res[:-1]))
    phi = max(0.0, min(0.95, num / sum(r * r for r in res)))
    sb = sg * math.sqrt(inv[1][1]) * math.sqrt((1 + phi) / (1 - phi))
    return {"b": x[1], "sb": sb, "phi": phi, "sigma": sg, "n": len(idx), "buang": len(t) - len(idx), "x": x, "idx": idx}


def transien(t, y, t0, loncatan, hari=30):
    """z robust median residual `hari` hari terakhir (model dilatih tanpa itu) terhadap sebaran median bergulir latar."""
    batas = t[-1] - hari / 365.25
    n_latih = sum(1 for v in t if v < batas)
    lat_t, lat_y = t[:n_latih], y[:n_latih]
    ls = [s for s in loncatan if s < batas - 30 / 365.25]
    f = fit(lat_t, lat_y, t0, ls)
    ekstra = lambda ti: sum(a * b for a, b in zip(desain([ti], t0, ls)[0], f["x"]))
    res_lat = [lat_y[i] - ekstra(lat_t[i]) for i in f["idx"]]
    # median 30-hari-bergulir (langkah 5 hari) pada residu latar
    ti = [lat_t[i] for i in f["idx"]]
    med, a = [], 0
    for b in range(0, len(ti)):
        if b % 5:
            continue
        while ti[a] < ti[b] - hari / 365.25:
            a += 1
        if b - a >= hari // 3:
            med.append(statistics.median(res_lat[a:b + 1]))
    sb = mad_sigma(med) if len(med) > 20 else None
    ter = [y[i] - ekstra(t[i]) for i in range(n_latih, len(t))]
    if not sb or len(ter) < 10:
        return None
    m = statistics.median(ter)
    return {"median_mm": m, "sigma_latar_mm": sb, "z": m / sb}


def indeks_regangan(st, rnd=None, undian=200):
    """st = [(lat, lon, ve, vn, sve, svn)] -> {indeks_nstrain, sigma, n} atau None bila < 4 stasiun. Pasangan v = v0 + G x (x dalam km)."""
    if len(st) < 4:
        return None
    la0 = statistics.fmean(s[0] for s in st)
    lo0 = statistics.fmean(s[1] for s in st)
    pos = [((s[1] - lo0) * 111.32 * math.cos(math.radians(la0)), (s[0] - la0) * 110.57) for s in st]
    X = [[1.0, x, y] for x, y in pos]
    AtA = [[sum(r[i] * r[j] for r in X) for j in range(3)] for i in range(3)]

    def ind(ve, vn):
        a = selesaikan(AtA, [sum(r[i] * v for r, v in zip(X, ve)) for i in range(3)])[0]
        b = selesaikan(AtA, [sum(r[i] * v for r, v in zip(X, vn)) for i in range(3)])[0]
        exx, eyy, exy = a[1], b[2], 0.5 * (a[2] + b[1])  # mm/th per km
        return 1000.0 * math.sqrt(exx ** 2 + eyy ** 2 + 2 * exy ** 2)

    nilai = ind([s[2] for s in st], [s[3] for s in st])
    rnd = rnd or random.Random(11)
    u = sorted(ind([s[2] + rnd.gauss(0, s[4]) for s in st], [s[3] + rnd.gauss(0, s[5]) for s in st]) for _ in range(undian))
    return {"indeks_nstrain": nilai, "selang90": [u[int(.05 * undian)], u[int(.95 * undian) - 1]], "n": len(st)}


def ambil_semua():
    daftar = stasiun_daftar()
    muat_steps()
    for s in daftar:
        muat_deret(s["id"])
    return daftar


def hitung():
    daftar = ambil_semua()
    steps = muat_steps()
    out, per_prov = [], {}
    terbaru = 0.0
    deret = {}
    for s in daftar:
        deret[s["id"]] = muat_deret(s["id"])
        terbaru = max(terbaru, deret[s["id"]][0][-1])
    for s in daftar:
        t, e, n = deret[s["id"]]
        i0 = next(i for i, v in enumerate(t) if v >= t[-1] - JENDELA_TH)
        t, e, n = t[i0:], e[i0:], n[i0:]
        if len(t) < MIN_OBS or t[-1] - t[0] < MIN_TH:
            continue
        t0 = (t[0] + t[-1]) / 2
        ls = sorted(set(x for x in steps.get(s["id"], []) if t[0] + 30 / 365.25 < x < t[-1] - 30 / 365.25))
        ls = [x for i, x in enumerate(ls) if i == 0 or x - ls[i - 1] > 10 / 365.25]  # loncatan <10 hari berdempet -> satu
        ls = [x for x in ls if sum(1 for v in t if x - 30 / 365.25 < v < x) >= 20 and sum(1 for v in t if x <= v < x + 30 / 365.25) >= 20]  # data kedua sisi
        try:
            fe, fn = fit(t, e, t0, ls), fit(t, n, t0, ls)
        except ValueError as ex:
            print("lewati", s["id"], ex)
            continue
        aktif = (terbaru - t[-1]) * 365.25 <= 60
        tr = None
        if aktif:
            try:
                te, tn = transien(t, e, t0, ls), transien(t, n, t0, ls)
                if te and tn:
                    z = max(abs(te["z"]), abs(tn["z"]))
                    tr = {"z_e": round(te["z"], 2), "z_n": round(tn["z"], 2), "median_e_mm": round(te["median_mm"], 2),
                          "median_n_mm": round(tn["median_mm"], 2), "bendera": z > 3}
            except ValueError:
                tr = None
        r = {"id": s["id"], "lat": round(s["lat"], 4), "lon": round(s["lon"], 4), "prov": s["prov"],
             "jendela": [round(t[0], 2), round(t[-1], 2)], "n": fe["n"], "loncatan": len(ls), "pencilan": fe["buang"] + fn["buang"],
             "ve_mm_th": round(fe["b"], 2), "vn_mm_th": round(fn["b"], 2), "sve": round(fe["sb"], 3), "svn": round(fn["sb"], 3),
             "phi": round((fe["phi"] + fn["phi"]) / 2, 2), "aktif": aktif, "transien": tr}
        out.append(r)
        per_prov.setdefault(s["prov"], []).append((s["lat"], s["lon"], fe["b"], fn["b"], fe["sb"], fn["sb"]))
    prov = {}
    for k in sorted(PROV_SUMATRA):
        ind = indeks_regangan(per_prov.get(k, []))
        prov[k] = {"nama": PROV_SUMATRA[k], "stasiun": len(per_prov.get(k, [])),
                   **({"indeks_nstrain_th": round(ind["indeks_nstrain"], 1), "selang90": [round(x, 1) for x in ind["selang90"]]} if ind else
                      {"indeks_nstrain_th": None, "alasan": "kurang dari 4 stasiun"})}
    bendera = [r["id"] for r in out if r["transien"] and r["transien"]["bendera"]]
    hasil = {"versi": 1, "dibuat": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "jenis": "gnss_kecepatan_regangan",
             "sumber": "Nevada Geodetic Laboratory IGS20 tenv3",
             "sitasi": "Blewitt, G., W. C. Hammond, C. Kreemer (2018), Eos 99, doi:10.1029/2018EO104623",
             "data_terbaru": round(terbaru, 3), "cacah": {"stasiun": len(out), "aktif": sum(r["aktif"] for r in out), "bendera": len(bendera)},
             "bendera_transien": bendera, "provinsi": prov, "stasiun": out,
             "catatan": "Kecepatan dalam kerangka IGS20 (termasuk gerak lempeng Sunda ~30 mm/th; hilang pada gradien regangan). Jendela 6 tahun TERAKHIR "
                        "tiap stasiun, jadi stasiun yang berhenti 2021-2024 mencerminkan zaman lebih tua (sebagian mengandung relaksasi pasca-gempa Bengkulu 2007/"
                        "Aceh 2004 yang sudah mengecil). Indeks regangan = fitur kasar untuk peluang_gempa.py, BUKAN prakiraan gempa. Bendera transien = "
                        "penanda statistik 3x latar robust (tidak setara peringatan; latar dihitung dalam-sampel jadi terlalu sempit), bukan klaim slow-slip."}
    umum.simpan(os.path.join(umum.KELUAR, "gnss.json"), hasil)
    print(json.dumps({"cacah": hasil["cacah"], "bendera": bendera, "provinsi": {k: (v["stasiun"], v["indeks_nstrain_th"]) for k, v in prov.items()}}, ensure_ascii=False))


def uji():
    rnd = random.Random(3)
    # deret sintetis harian 6 th: kecepatan 12 mm/th, tahunan 3 mm, loncatan 10 mm di t=2022.5, derau putih 1 mm, 3 pencilan
    t = [2020 + i / 365.25 for i in range(int(6 * 365.25))]
    y = [12 * (ti - 2023) + 3 * math.sin(2 * math.pi * ti) + (10 if ti >= 2022.5 else 0) + rnd.gauss(0, 1) for ti in t]
    for i in (100, 900, 1500):
        y[i] += 80
    f = fit(t, y, 2023, [2022.5])
    assert abs(f["b"] - 12) < 3 * f["sb"] + 0.05 and abs(f["b"] - 12) < 0.3, f["b"]
    assert f["buang"] >= 3
    # tanpa loncatan dimodelkan, kecepatan bias: bukti bahwa steps.txt perlu
    assert abs(fit(t, y, 2023, [])["b"] - 12) > abs(f["b"] - 12)
    # AR1 menaikkan sigma: deret berwarna punya sb > deret putih
    z, c = 0.0, []
    for _ in t:
        z = 0.9 * z + rnd.gauss(0, 1); c.append(z)
    assert fit(t, c, 2023, [])["phi"] > 0.7 and fit(t, c, 2023, [])["sb"] > fit(t, [rnd.gauss(0, 1) for _ in t], 2023, [])["sb"]
    # transien: gerak 6 mm di 30 hari terakhir ditandai, tanpanya tidak
    ls = []
    ok = transien(t, [rnd.gauss(0, 1) + 12 * (ti - 2023) for ti in t], 2023, ls)
    y2 = [rnd.gauss(0, 1) + 12 * (ti - 2023) + (6 if ti > t[-1] - 20 / 365.25 else 0) for ti in t]
    bad = transien(t, y2, 2023, ls)
    assert abs(ok["z"]) < 3 and abs(bad["z"]) > 3, (ok["z"], bad["z"])
    # regangan: medan v = 30 + 0,01*x (mm/th, x km) -> exx = 0,01 mm/th/km = 10 nstrain/th; translasi murni -> ~0
    st = []
    for la, lo in ((0, 100), (0, 101), (1, 100), (1, 101), (.5, 100.5)):
        x = (lo - 100) * 111.32
        st.append((la, lo, 30 + 0.01 * x, -15.0, 0.05, 0.05))
    r = indeks_regangan(st)
    assert 8 < r["indeks_nstrain"] < 12, r
    assert indeks_regangan([(a, b, 30, -15, .05, .05) for a, b, *_ in st])["indeks_nstrain"] < 0.01
    assert indeks_regangan(st[:3]) is None
    assert abs(tahun_desimal("17MAY04") - 2017.34) < 0.01
    print("gnss uji: OK")


if __name__ == "__main__":
    {"ambil": ambil_semua, "hitung": hitung, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "uji", uji)()
