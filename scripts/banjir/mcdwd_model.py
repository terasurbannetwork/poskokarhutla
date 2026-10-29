"""Model P(banjir terdeteksi MODIS besok di kabupaten | hujan 3 hari, debit GloFAS naik) + validasi aturan status.py terhadap MCDWD
-> public/banjir/data/mcdwd_model.json

Sasaran  y(kab, d+1) = 1 bila mcdwd.py melihat >= MIN_PX piksel banjir (kelas Flood + Recurring flood, ~2 km) di kabupaten pada hari d+1
         DAN tutupan teramati >= 0,5. Hari berawan (tutupan < 0,5) tidak dipakai sebagai label (bukan bukti tak banjir).
Fitur    (hari d, semua dari masa lalu; max atas sel/titik kabupaten)
         x1 = ln(1 + r3)       r3 = hujan harian d-2..d (mm)                       ERA5 (lab) / hujan.json (produksi)
         x2 = ln(1 + a7)       a7 = hujan d-9..d-3 (anteseden)
         x3 = dq3              ln((Q_d + 1) / (Q_{d-3} + 1)), debit GloFAS, dijepit [-1, 2]   Open-Meteo Flood API / sungai.json
         x4 = dq1              ln((Q_d + 1) / (Q_{d-1} + 1)), dijepit [-1, 1]
         Tanpa debit mutlak: skalanya beda antar titik dan titik produksi (sungai_titik.json) bukan titik latih.
Model    regresi logistik L2 (Newton/IRLS, ditulis tangan), fitur dibakukan dengan rata-rata/SD data latih.
Pembagian waktu: LATIH label <= 2023-12-31, UJI label >= 2024-01-01 (tak ada pengacakan, fitur hanya dari masa lalu).
Pembanding (diumumkan sebelum melihat data uji):
  persistensi   skor = ada banjir di kabupaten hari d (jika d berawan: tidak ada skor -> dihitung sebagai 0)
  klimatologi   skor = frekuensi kabupaten x bulan di data latih (dihaluskan ke frekuensi kabupaten)
Metrik   AUC (peringkat Mann-Whitney), skor Brier, skill Brier terhadap klimatologi; CI 95% bootstrap blok kabupaten x tahun, 1.000 ulangan.
Aturan LOLOS (ditulis sebelum uji): AUC model - AUC pembanding terbaik > 0 dengan batas bawah CI 95% > 0, DAN skill Brier terhadap
klimatologi > 0. Selain itu GAGAL, apa adanya.

Validasi aturan status (a): level_banjir() status.py dengan ERA5 sebagai prakiraan sempurna (cara uji_balik.py) per kabupaten-hari
dibandingkan dengan deteksi MCDWD hari yang sama; POD/FAR/CSI/ETS, bootstrap blok.

Pakai:  python3 scripts/banjir/mcdwd_model.py glofas        unduh debit GloFAS harian sel sampel (lanjut dari cache; kuota Open-Meteo)
        python3 scripts/banjir/mcdwd_model.py latih          lab: bangun dataset, latih, uji, validasi, tulis mcdwd_model.json
        python3 scripts/banjir/mcdwd_model.py prakira        produksi: hitung P besok dari mcdwd.json + hujan.json + sungai.json (tanpa jaringan)
        python3 scripts/banjir/mcdwd_model.py uji            swa-uji fungsi murni
"""
import datetime as dt, gzip, json, math, os, random, sys, time
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, KuotaHabis, ambil, baca, simpan

MIN_PX = 2
MIN_TUTUPAN = 0.5
LATIH_AKHIR = dt.date(2023, 12, 31)
FITUR = ["ln(1+r3)", "ln(1+a7)", "dq3", "dq1"]
L2 = 1.0
ULANG = 1000
KELUARAN = os.path.join(KELUAR, "mcdwd_model.json")
FLOOD_API = "https://flood-api.open-meteo.com/v1/flood"
GLO_DIR = os.path.join(MENTAH, "glofas_hist")
ERA5_ASAL = os.environ.get("MCDWD_ERA5", "")     # folder uji_balik berisi *.json.gz (bawaan: MENTAH/uji_balik)
AWAL_GLO, AKHIR_GLO = "2021-03-01", "2025-12-31"


# ------------------------------------------------------------------ rumus murni
def auc(skor, y):
    """AUC Mann-Whitney (rata-rata peringkat untuk skor sama). None bila satu kelas kosong."""
    n1 = sum(y)
    n0 = len(y) - n1
    if not n1 or not n0:
        return None
    ur = sorted(range(len(y)), key=lambda i: skor[i])
    r, i, jum = [0.0] * len(y), 0, 0.0
    while i < len(ur):
        j = i
        while j + 1 < len(ur) and skor[ur[j + 1]] == skor[ur[i]]:
            j += 1
        for k in range(i, j + 1):
            r[ur[k]] = (i + j) / 2 + 1
        i = j + 1
    jum = sum(r[k] for k in range(len(y)) if y[k])
    return (jum - n1 * (n1 + 1) / 2) / (n1 * n0)


def brier(p, y):
    return sum((a - b) ** 2 for a, b in zip(p, y)) / len(y) if y else None


def sigmoid(z):
    return 1 / (1 + math.exp(-z)) if z >= 0 else math.exp(z) / (1 + math.exp(z))


def selesaikan(A, b):
    """Gauss-Jordan dengan pivot sebagian untuk sistem kecil Ax = b."""
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        if abs(M[c][c]) < 1e-12:
            raise ZeroDivisionError("matriks singular")
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                M[r] = [x - f * y for x, y in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]


def baku(X):
    k = len(X[0])
    mu = [sum(r[j] for r in X) / len(X) for j in range(k)]
    sd = [math.sqrt(sum((r[j] - mu[j]) ** 2 for r in X) / len(X)) or 1.0 for j in range(k)]
    return mu, sd


def latih_logistik(X, y, mu, sd, l2=L2, iter_maks=30):
    """Newton/IRLS pada fitur terbakukan; ridge pada koefisien (bukan intersep). -> [b0, b1..bk] pada skala terbakukan."""
    k = len(X[0])
    Z = [[1.0] + [(r[j] - mu[j]) / sd[j] for j in range(k)] for r in X]
    w = [0.0] * (k + 1)
    w[0] = math.log((sum(y) + .5) / (len(y) - sum(y) + .5))
    for _ in range(iter_maks):
        g = [0.0] * (k + 1)
        H = [[0.0] * (k + 1) for _ in range(k + 1)]
        for z, t in zip(Z, y):
            p = sigmoid(sum(a * b for a, b in zip(w, z)))
            e, s = p - t, p * (1 - p)
            for i in range(k + 1):
                g[i] += e * z[i]
                zi = s * z[i]
                Hi = H[i]
                for j in range(i, k + 1):
                    Hi[j] += zi * z[j]
        for i in range(k + 1):
            for j in range(i):
                H[i][j] = H[j][i]
        for i in range(1, k + 1):
            g[i] += l2 * w[i]
            H[i][i] += l2
        H[0][0] += 1e-9
        d = selesaikan(H, g)
        w = [a - b for a, b in zip(w, d)]
        if max(abs(x) for x in d) < 1e-7:
            break
    return w


def prediksi(w, mu, sd, x):
    return sigmoid(w[0] + sum(w[j + 1] * (x[j] - mu[j]) / sd[j] for j in range(len(x))))


def kontingensi(prediksi_ya, kejadian):
    a = sum(1 for p, o in zip(prediksi_ya, kejadian) if p and o)
    b = sum(1 for p, o in zip(prediksi_ya, kejadian) if p and not o)
    c = sum(1 for p, o in zip(prediksi_ya, kejadian) if not p and o)
    return [a, b, c, len(kejadian) - a - b - c]


def skor_kontingensi(a, b, c, d):
    n = a + b + c + d
    bagi = lambda x, y: x / y if y else None
    ar = (a + b) * (a + c) / n if n else 0
    return {"pod": bagi(a, a + c), "far": bagi(b, a + b), "csi": bagi(a, a + b + c), "ets": bagi(a - ar, a + b + c - ar)}


def ln_rasio(q, q0, lo, hi):
    return min(hi, max(lo, math.log((q + 1) / (q0 + 1))))


def fitur_hari(hujan, debit, i):
    """hujan, debit: deret harian satu sel (indeks hari); i = indeks hari d. -> [x1..x4] atau None bila debit kurang."""
    if i < 9 or i >= len(hujan) or debit[i] is None or debit[i - 1] is None or debit[i - 3] is None:
        return None
    r3, a7 = sum(hujan[i - 2:i + 1]), sum(hujan[i - 9:i - 2])
    return [math.log1p(r3), math.log1p(a7), ln_rasio(debit[i], debit[i - 3], -1, 2), ln_rasio(debit[i], debit[i - 1], -1, 1)]


def max_fitur(daftar):
    """Fitur kabupaten = maksimum tiap fitur atas sel-selnya (tanpa sel -> None)."""
    daftar = [f for f in daftar if f]
    return [max(f[j] for f in daftar) for j in range(len(FITUR))] if daftar else None


def bootstrap_blok(blok_nilai, fungsi, ulang=ULANG, seed=7):
    """blok_nilai: {kunci_blok: data}; fungsi(list_data) -> angka atau None. -> (nilai, [p2,5, p97,5])."""
    kunci, r, xs = sorted(blok_nilai), random.Random(seed), []
    for _ in range(ulang):
        v = fungsi([blok_nilai[r.choice(kunci)] for _ in kunci])
        if v is not None:
            xs.append(v)
    xs.sort()
    if not xs:
        return None, None
    return fungsi([blok_nilai[k] for k in kunci]), [round(xs[int(.025 * (len(xs) - 1))], 4), round(xs[int(.975 * (len(xs) - 1))], 4)]


def auc_gabung(blok):
    s, y = [], []
    for b in blok:
        s += b[0]
        y += b[1]
    return auc(s, y)


def selisih_auc(blok):
    """blok: list tiap elemen (skor_model, y, skor_pembanding, ...) -> AUC model - AUC pembanding. """
    sm, sp, y = [], [], []
    for b in blok:
        sm += b[0]
        sp += b[2]
        y += b[1]
    a1, a0 = auc(sm, y), auc(sp, y)
    return None if a1 is None or a0 is None else a1 - a0


# ------------------------------------------------------------------ data lab
def tgl_ke_i(t):
    return (dt.date.fromisoformat(t) - dt.date(2015, 12, 22)).days


def sel_era5():
    import uji_balik as ub
    return ub


def jalur_era5(la, lo):
    return os.path.join(ERA5_ASAL or os.path.join(MENTAH, "uji_balik"), f"{la:.3f}_{lo:.3f}.json.gz")


def jalur_glo(la, lo):
    return os.path.join(GLO_DIR, f"{la:.3f}_{lo:.3f}.json")


def ambil_glofas(sel, maks_menit=240):
    """Debit harian GloFAS (Open-Meteo Flood API) AWAL_GLO..AKHIR_GLO per sel; bobot ~126 per sel (1.767 hari / 14). Lanjut dari cache.
    Kuota jam habis -> tunggu 20 menit; kuota harian habis -> berhenti."""
    os.makedirs(GLO_DIR, exist_ok=True)
    sisa = [s for s in sel if not os.path.exists(jalur_glo(*s))]
    print(f"glofas: {len(sel)} sel, {len(sisa)} belum di cache (~{len(sisa) * 126} bobot)", file=sys.stderr)
    t0 = time.time()
    for s in sisa:
        if time.time() - t0 > maks_menit * 60:
            break
        for coba in range(4):
            try:
                d = ambil(f"{FLOOD_API}?latitude={s[0]}&longitude={s[1]}&daily=river_discharge&start_date={AWAL_GLO}&end_date={AKHIR_GLO}", batas_waktu=300)
                break
            except KuotaHabis as e:
                if "Hourly" in str(e) and coba < 3:
                    print("  kuota jam habis, tunggu 20 menit", file=sys.stderr)
                    time.sleep(1200)
                else:
                    print(f"  berhenti: {e}", file=sys.stderr)
                    return False
        simpan(jalur_glo(*s), {"lat": d["latitude"], "lon": d["longitude"], "t0": AWAL_GLO, "q": d["daily"]["river_discharge"]})
        time.sleep(20)   # 4 sel/menit * 126 = 504 < 600/menit
    return True


def bangun_dataset():
    """-> baris per (kab, hari): dict(kab, tgl, x, y, y0 (banjir hari d, None bila berawan), bulan). Hanya sel yang punya ERA5 dan GloFAS."""
    ub = sel_era5()
    import mcdwd
    S = json.load(open(os.environ.get("MCDWD_SAMPEL", os.path.join(MENTAH, "mcdwd", "sampel.json"))))
    arsip = mcdwd.baca_arsip()
    peta = mcdwd.muat_peta()
    ik = {k: i for i, k in enumerate(peta["kab"])}
    glo, era = {}, {}
    for kab, cells in S["cells"].items():
        for c in cells:
            c = (c[0], c[1])
            if os.path.exists(jalur_glo(*c)) and os.path.exists(jalur_era5(*c)) and c not in era:
                try:
                    era[c] = ub.deret(json.load(gzip.open(jalur_era5(*c))))["p"]
                except Exception as e:   # cache ERA5 rusak/terputus: sel dilewati, dicetak
                    print(f"sel {c} dilewati: {e}", file=sys.stderr)
                    continue
                q = json.load(open(jalur_glo(*c)))["q"]
                glo[c] = [None] * tgl_ke_i(AWAL_GLO) + q
    baris = []
    for kab, cells in S["cells"].items():
        cs = [(c[0], c[1]) for c in cells if (c[0], c[1]) in era]
        if not cs or kab not in ik:
            continue
        for tg in sorted(arsip):
            d = dt.date.fromisoformat(tg)
            tg1 = (d + dt.timedelta(days=1)).isoformat()
            if tg1 not in arsip or d.year > 2025 or d > dt.date(2025, 12, 30):
                continue
            f1, tut1 = mcdwd.banjir_valid(arsip[tg1][ik[kab]])
            if tut1 is None or tut1 < MIN_TUTUPAN:
                continue
            i = tgl_ke_i(tg)
            x = max_fitur([fitur_hari(era[c], glo[c], i) for c in cs])
            if x is None:
                continue
            f0, tut0 = mcdwd.banjir_valid(arsip[tg][ik[kab]])
            baris.append({"kab": kab, "tgl": tg, "x": x, "y": int(f1 >= MIN_PX),
                          "y0": None if tut0 is None or tut0 < MIN_TUTUPAN else int(f0 >= MIN_PX), "bln": d.month, "f1": f1})
    return baris


# ------------------------------------------------------------------ latih + uji
def latih_uji(baris, ulang=ULANG):
    lat = [b for b in baris if dt.date.fromisoformat(b["tgl"]) <= LATIH_AKHIR]
    uji_ = [b for b in baris if dt.date.fromisoformat(b["tgl"]) > LATIH_AKHIR]
    mu, sd = baku([b["x"] for b in lat])
    w = latih_logistik([b["x"] for b in lat], [b["y"] for b in lat], mu, sd)
    # klimatologi: frekuensi kab x bulan di data latih, dihaluskan ke frekuensi kab (pseudo-hitung 5)
    kab_n, kab_y, kb_n, kb_y = defaultdict(int), defaultdict(int), defaultdict(int), defaultdict(int)
    for b in lat:
        kab_n[b["kab"]] += 1; kab_y[b["kab"]] += b["y"]
        kb_n[b["kab"], b["bln"]] += 1; kb_y[b["kab"], b["bln"]] += b["y"]
    base = sum(b["y"] for b in lat) / len(lat)
    fk = lambda k: (kab_y[k] + base * 5) / (kab_n[k] + 5)
    klim = lambda b: (kb_y[b["kab"], b["bln"]] + fk(b["kab"]) * 5) / (kb_n[b["kab"], b["bln"]] + 5)
    blok = defaultdict(lambda: [[], [], [], [], [], []])   # skor model, y, persistensi, klimatologi, p model, p klim
    for b in uji_:
        k = blok[b["kab"], b["tgl"][:4]]
        p = prediksi(w, mu, sd, b["x"])
        k[0].append(p); k[1].append(b["y"]); k[2].append(0.0 if not b["y0"] else 1.0)
        k[3].append(klim(b)); k[4].append(p); k[5].append(klim(b))
    # skor sama untuk persistensi (0/1) membuat AUC rendah bila jarang: itu sifat pembanding itu, dilaporkan apa adanya
    sm = [s for b in blok.values() for s in b[0]]
    y = [t for b in blok.values() for t in b[1]]
    sp = [s for b in blok.values() for s in b[2]]
    sk = [s for b in blok.values() for s in b[3]]
    out = {"n_latih": len(lat), "n_uji": len(uji_), "positif_latih": sum(b["y"] for b in lat), "positif_uji": sum(y),
           "laju_latih": round(base, 4), "laju_uji": round(sum(y) / len(y), 4),
           "koef": {"b0": w[0], **{FITUR[j]: round(w[j + 1], 4) for j in range(len(FITUR))}}, "mu": [round(v, 5) for v in mu], "sd": [round(v, 5) for v in sd]}
    out["auc"] = {"model": round(auc(sm, y), 4), "persistensi": round(auc(sp, y), 4), "klimatologi": round(auc(sk, y), 4)}
    out["brier"] = {"model": round(brier(sm, y), 5), "klimatologi": round(brier(sk, y), 5), "laju_konstan": round(brier([base] * len(y), y), 5)}
    out["skill_brier_vs_klim"] = round(1 - out["brier"]["model"] / out["brier"]["klimatologi"], 4)
    isi = [(b[0], b[1], b[2], b[3]) for b in blok.values()]
    blk = {i: v for i, v in enumerate(isi)}
    d_pers = bootstrap_blok(blk, lambda L: selisih_auc([(a[0], a[1], a[2]) for a in L]), ulang)
    d_klim = bootstrap_blok(blk, lambda L: selisih_auc([(a[0], a[1], a[3]) for a in L]), ulang)
    out["selisih_auc_vs_persistensi"] = {"nilai": round(d_pers[0], 4), "ci95": d_pers[1]}
    out["selisih_auc_vs_klimatologi"] = {"nilai": round(d_klim[0], 4), "ci95": d_klim[1]}
    terbaik = max(("persistensi", d_pers), ("klimatologi", d_klim), key=lambda t: -t[1][0])  # pembanding terkuat = selisih terkecil
    out["pembanding_terkuat"] = terbaik[0]
    lolos = terbaik[1][1][0] > 0 and out["skill_brier_vs_klim"] > 0
    out["vonis"] = "LOLOS" if lolos else "GAGAL"
    out["alasan"] = (f"AUC model {out['auc']['model']} vs persistensi {out['auc']['persistensi']} vs klimatologi {out['auc']['klimatologi']}; "
                     f"selisih terhadap pembanding terkuat ({terbaik[0]}) {round(terbaik[1][0], 4)} CI95 {terbaik[1][1]}; skill Brier terhadap klimatologi {out['skill_brier_vs_klim']}")
    return out, (w, mu, sd)


# ------------------------------------------------------------------ uji swa
def uji():
    # AUC: pemisahan sempurna, acak, dan skor sama
    assert auc([.1, .2, .8, .9], [0, 0, 1, 1]) == 1.0
    assert auc([.9, .8, .2, .1], [0, 0, 1, 1]) == 0.0
    assert auc([.5] * 4, [0, 1, 0, 1]) == 0.5
    assert auc([.1, .2], [0, 0]) is None
    # Brier
    assert brier([1, 0], [1, 0]) == 0 and abs(brier([.5, .5], [1, 0]) - .25) < 1e-12
    # Gauss-Jordan
    x = selesaikan([[2, 1], [1, 3]], [5, 10])
    assert abs(x[0] - 1) < 1e-9 and abs(x[1] - 3) < 1e-9
    # logistik: data sintetis dengan koefisien diketahui, harus menemukan arah dan skala mendekati
    r = random.Random(3)
    X, y = [], []
    for _ in range(6000):
        a, b = r.gauss(0, 1), r.gauss(0, 1)
        p = sigmoid(-2.0 + 1.5 * a + 0.0 * b)
        X.append([a, b]); y.append(int(r.random() < p))
    mu, sd = baku(X)
    w = latih_logistik(X, y, mu, sd, l2=0.01)
    assert 1.2 < w[1] / sd[0] < 1.8 and abs(w[2] / sd[1]) < 0.15, w          # koef a ~1,5; b ~0
    assert -2.4 < w[0] - w[1] * mu[0] / sd[0] < -1.6, w                      # intersep ~ -2
    ps = [prediksi(w, mu, sd, x) for x in X]
    assert auc(ps, y) > 0.8
    # fitur: hujan 30 mm di d-1 dan debit naik
    h = [0.0] * 20
    h[9] = 30.0
    q = [10.0] * 20
    q[10] = 40.0
    f = fitur_hari(h, q, 10)
    assert abs(f[0] - math.log1p(30)) < 1e-9 and abs(f[2] - math.log(41 / 11)) < 1e-9 and f[3] == 1.0
    assert fitur_hari(h, q, 5) is None and fitur_hari(h, [None] * 20, 10) is None
    assert max_fitur([[1, 2, 3, 4], None, [2, 0, 1, 9]]) == [2, 2, 3, 9] and max_fitur([None]) is None
    # kontingensi
    k = kontingensi([1, 1, 0, 0, 1], [1, 0, 1, 0, 0])
    assert k == [1, 2, 1, 1], k
    s = skor_kontingensi(*k)
    assert abs(s["pod"] - .5) < 1e-12 and abs(s["far"] - 2 / 3) < 1e-12 and abs(s["csi"] - .25) < 1e-12
    # alur penuh pada data sintetis: model harus LOLOS bila sinyal nyata, GAGAL bila label acak
    def sintetis(sinyal, seed):
        r = random.Random(seed)
        out = []
        for kab in range(20):
            for hari in range(0, 1800):
                d = dt.date(2021, 3, 22) + dt.timedelta(days=hari)
                x = [r.gauss(2, 1), r.gauss(2, 1), r.gauss(0, .5), r.gauss(0, .3)]
                p = sigmoid(-3.0 + (1.6 * (x[0] - 2) + 1.2 * x[2]) * sinyal)
                out.append({"kab": str(kab), "tgl": d.isoformat(), "x": x, "y": int(r.random() < p), "y0": int(r.random() < .02), "bln": d.month, "f1": 0})
        return out
    o, _ = latih_uji(sintetis(1, 11), 100)
    assert o["vonis"] == "LOLOS" and o["auc"]["model"] > 0.7, o["alasan"]
    o2, _ = latih_uji(sintetis(0, 12), 100)
    assert o2["vonis"] == "GAGAL", o2["alasan"]
    print("ok")


# ------------------------------------------------------------------ sampel kabupaten (lab)
def buat_sampel():
    """Sampel kabupaten + sel ERA5 dari uji_balik.pilih() (DIBI banjir/longsor; daftar kab yang sama dengan validasi.json).
    Catatan: dipilih dari jumlah hari kejadian DIBI semua tahun, jadi kabupaten rawan, bukan acak. DIBI tak dipakai sebagai label di sini."""
    ub = sel_era5()
    dibi = os.environ.get("MCDWD_DIBI", os.path.join(MENTAH, "dibi_tanggal.json"))
    ev = ub.peristiwa(json.load(open(dibi)))
    sk = ub.sel_per_kab()
    kabs = ub.pilih(ev, sk)
    out = {"kabs": kabs, "cells": {k: [[s[0], s[1], b[0], b[1]] for s, b in sk[k].items()] for k in kabs}}
    simpan(os.path.join(MENTAH, "mcdwd", "sampel.json"), out)
    return out


def muat_sampel():
    p = os.path.join(MENTAH, "mcdwd", "sampel.json")
    return baca(p) or buat_sampel()


def sel_glofas_ada(S):
    sel = sorted({(c[0], c[1]) for k in S["kabs"] for c in S["cells"][k]})
    return [s for s in sel if os.path.exists(jalur_era5(*s))]


# ------------------------------------------------------------------ validasi (a): aturan status.py vs MCDWD
def validasi_aturan(S, arsip, peta):
    ub = sel_era5()
    ik = {k: i for i, k in enumerate(peta["kab"])}
    import mcdwd
    era = {}
    tabel = {"semua": {}, "2021-2023": {}, "2024-2025": {}}
    pers = {"semua": [0, 0, 0, 0], "2021-2023": [0, 0, 0, 0], "2024-2025": [0, 0, 0, 0]}
    n_kab = 0
    for kab in S["kabs"]:
        cs = [c for c in S["cells"][kab] if os.path.exists(jalur_era5(c[0], c[1]))]
        if not cs or kab not in ik:
            continue
        for c in cs:
            if (c[0], c[1]) not in era:
                try:
                    era[c[0], c[1]] = ub.deret(json.load(gzip.open(jalur_era5(c[0], c[1]))))
                except Exception:
                    era[c[0], c[1]] = None
        cs = [c for c in cs if era[c[0], c[1]] is not None]
        if not cs:
            continue
        n_kab += 1
        tgls = sorted(t for t in arsip if "2021-03-22" <= t <= "2025-12-29")
        hari, ev, ok = [], {}, {}
        for t in tgls:
            d = dt.date.fromisoformat(t)
            t1 = (d + dt.timedelta(days=1)).isoformat()
            if t1 not in arsip:
                continue
            f0, v0 = mcdwd.banjir_valid(arsip[t][ik[kab]])
            f1, v1 = mcdwd.banjir_valid(arsip[t1][ik[kab]])
            kej = f0 >= MIN_PX or f1 >= MIN_PX
            valid = (v0 is not None and v0 >= MIN_TUTUPAN) or (v1 is not None and v1 >= MIN_TUTUPAN)
            if kej or valid:
                hari.append(t)
                ev[t] = kej
        idx = [tgl_ke_i(t) for t in hari]
        lv = [max(z) for z in zip(*(ub.level_harian(era[c[0], c[1]], [c[2], c[3]], "banjir", ub.BERLAKU["banjir"], idx) for c in cs))]
        for t, l in zip(hari, lv):
            y = t[:4]
            per = "2021-2023" if y <= "2023" else "2024-2025"
            for nama in ("semua", per):
                blok = tabel[nama].setdefault((kab, y), [[0, 0, 0, 0] for _ in ub.LEVEL])
                o = ev[t]
                for i, L in enumerate(ub.LEVEL):
                    blok[i][(0 if o else 1) if l >= L else (2 if o else 3)] += 1
        # persistensi: alarm hari e = ada deteksi (valid) hari e-1
        for j, t in enumerate(hari):
            if j == 0 or tgl_ke_i(hari[j - 1]) != tgl_ke_i(t) - 1:
                continue
            f_ = mcdwd.banjir_valid(arsip[hari[j - 1]][ik[kab]])
            alarm = f_[0] >= MIN_PX
            o = ev[t]
            per = "2021-2023" if t[:4] <= "2023" else "2024-2025"
            for nama in ("semua", per):
                pers[nama][(0 if o else 1) if alarm else (2 if o else 3)] += 1
    out = {"n_kab": n_kab, "definisi": f"kejadian = >= {MIN_PX} piksel banjir MODIS (~2 km) di kab pada hari e atau e+1; hanya hari dengan kejadian atau tutupan >= {MIN_TUTUPAN}; "
           "alarm = level_banjir() status.py (k=0,8, H3 e-1..e+1 ERA5 sempurna, bahaya InaRISK) maks atas sel sampel"}
    for nama, blok in tabel.items():
        out[nama] = {}
        for i, L in enumerate(ub.LEVEL.values()):
            r = ub.ringkas(blok, i)
            out[nama][f">={L}"] = r
        out[nama]["persistensi_deteksi_kemarin"] = {**{m: None if v is None else round(v, 3) for m, v in skor_kontingensi(*pers[nama]).items()},
                                                    "n": dict(zip("abcd", pers[nama]))}
        n = [sum(b[0][i] for b in blok.values()) for i in range(4)]
        out[nama]["laju_kejadian"] = round((n[0] + n[2]) / sum(n), 4)
    return out


# ------------------------------------------------------------------ produksi: P besok
def kab_sel_hujan():
    """-> {kab: [indeks grid hujan.json]} dengan Wilayah.cari (titik pusat sel)."""
    from wilayah import Wilayah
    w = Wilayah()
    h = baca(os.path.join(KELUAR, "hujan.json"))
    out = defaultdict(list)
    for i, g in enumerate(h["grid"]):
        a = w.cari(g["lon"], g["lat"])
        if a:
            out[f"{a[0]}|{a[1]}"].append(i)
    return h, out


def prakira(model):
    """Dari mcdwd.json (kemarin) + hujan.json + sungai.json -> {kab: P besok}. Tidak ada jaringan. Fitur dihitung sama dengan lab:
    r3 = h[1..3] (3 hari terakhir termasuk hari ini), a7 = hujan anteseden hujan.json (a7 = 7 hari sebelum hari ini, dipakai sebagai pengganti d-9..d-3)."""
    h, kab_sel = kab_sel_hujan()
    sg = baca(os.path.join(KELUAR, "sungai.json"), {"titik": []})
    mc = baca(os.path.join(KELUAR, "mcdwd.json"), {})
    w, mu, sd = model["w"], model["mu"], model["sd"]
    sung = defaultdict(list)
    for t in sg.get("titik", []):
        q = t.get("q") or []
        if len(q) >= 4 and q[0] is not None and q[2] is not None and q[3] is not None:
            sung[f"{t['prov']}|{t['kab']}"].append([ln_rasio(q[3], q[0], -1, 2), ln_rasio(q[3], q[2], -1, 1)])
    out = {}
    for kab, idx in kab_sel.items():
        r3 = max(sum(x or 0 for x in h["grid"][i]["h"][1:4]) for i in idx)
        a7 = max(h["grid"][i].get("a7") or 0 for i in idx)
        dq = sung.get(kab)
        dq3, dq1 = (max(d[0] for d in dq), max(d[1] for d in dq)) if dq else (0.0, 0.0)
        x = [math.log1p(r3), math.log1p(a7), dq3, dq1]
        p = prediksi(w, mu, sd, x)
        out[kab] = {"p": round(p, 4), "r3": round(r3, 1), "dq3": round(dq3, 2), "sungai": bool(dq)}
    return out, h.get("hari_ini"), mc


def tulis(hasil_latih, validasi, model=None):
    isi = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds"),
           "sasaran": f"P(>= {MIN_PX} piksel banjir MODIS ~2 km terdeteksi di kabupaten pada hari d+1 | tutupan >= {MIN_TUTUPAN})",
           "fitur": FITUR, "model": hasil_latih, "validasi_aturan_status": validasi,
           "pembagian": {"latih": f"label <= {LATIH_AKHIR}", "uji": "label >= 2024-01-01 s.d. 2025-12-30"},
           "batas": ["sampel kabupaten rawan (dipilih dari jumlah hari kejadian DIBI), bukan acak", "hujan latih ERA5 vs produksi hujan.json (prakiraan): bias basah",
                     "a7 produksi = 7 hari sebelum hari ini, latih = d-9..d-3: tidak identik", "kabupaten tanpa titik sungai memakai dq=0"],
           "atribusi": "NASA LANCE MCDWD via GIBS; Open-Meteo (ERA5, GloFAS, CC BY 4.0)"}
    simpan(KELUARAN, isi)
    return isi


def main(a):
    if a[0] == "sampel":
        S = buat_sampel()
        print(len(S["kabs"]), "kab", len(sel_glofas_ada(S)), "sel dengan cache ERA5")
    elif a[0] == "glofas":
        ambil_glofas(sel_glofas_ada(muat_sampel()))
    elif a[0] == "latih":
        import mcdwd
        S = muat_sampel()
        baris = bangun_dataset()
        print(len(baris), "baris", file=sys.stderr)
        hasil, (w, mu, sd) = latih_uji(baris)
        peta = mcdwd.muat_peta()
        val = validasi_aturan(S, mcdwd.baca_arsip(), peta)
        hasil["w"], hasil["mu"], hasil["sd"] = [round(v, 6) for v in w], [round(v, 6) for v in mu], [round(v, 6) for v in sd]
        tulis(hasil, val)
        print(json.dumps({k: hasil[k] for k in ("n_latih", "n_uji", "positif_latih", "positif_uji", "auc", "brier", "skill_brier_vs_klim", "vonis", "alasan")}, indent=1, ensure_ascii=False))
    elif a[0] == "prakira":
        isi = baca(KELUARAN)
        if not isi:
            sys.exit("mcdwd_model.json belum ada: jalankan `latih` di lab dulu")
        m = isi["model"]
        if m["vonis"] != "LOLOS":
            isi["prakiraan"] = None
            isi["catatan_prakiraan"] = f"model {m['vonis']} pada uji balik: prakiraan TIDAK diterbitkan"
        else:
            hasil, hari, mc = prakira(m)
            urut = sorted(hasil.items(), key=lambda t: -t[1]["p"])
            isi["prakiraan"] = {"hari_data": hari, "berlaku": (dt.date.fromisoformat(hari) + dt.timedelta(days=1)).isoformat() if hari else None,
                                "kab": dict(urut[:60]), "n_kab": len(hasil), "laju_latih": m["laju_latih"]}
        isi["dibuat_prakiraan"] = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds")
        simpan(KELUARAN, isi)
    else:
        sys.exit("pakai: sampel | glofas | latih | prakira | uji")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "uji":
        uji()
    else:
        main(a)
