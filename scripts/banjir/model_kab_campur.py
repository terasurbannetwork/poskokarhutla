"""Model campuran bertingkat banjir kabupaten-hari (CAMPUR) -> data/raw/banjir/model_kab_campur/ (BUKAN public/)

Protokol di PRAREG-CAMPUR.md revisi 5 (KONTRAK); berkas ini hanya melaksanakannya. Fungsi data dipakai ulang lewat IMPOR dari
model_kab2 / model_kab_hulu / model_kab_debit / uji_logbook / label_bersatu_v2 / pasang_astro (tidak disunting).
Python stdlib saja. Label tanggal >= 2026-10-19 TIDAK PERNAH dibaca (LABEL_AKHIR).

Pakai:  python3 scripts/banjir/model_kab_campur.py uji                  swauji tanpa jaringan, tanpa label nyata
        python3 scripts/banjir/model_kab_campur.py baris                hitung kab/baris/wilayah (tanpa skor)
        python3 scripts/banjir/model_kab_campur.py latih --kering       alur latih pada data SINTETIS (tidak menyentuh data nyata)
        python3 scripts/banjir/model_kab_campur.py latih [--ulang]      latih nyata (JANGAN dijalankan sebelum pemblokir 6a-A beres)
        python3 scripts/banjir/model_kab_campur.py pemblokir            cek pemblokir 6a-A yang bisa diperiksa kode
        python3 scripts/banjir/model_kab_campur.py gerbang              lima lipatan F1-F5 + gerbang pembekuan §4.2
        python3 scripts/banjir/model_kab_campur.py sidik                bekukan kandidat (commit .sidik sesudahnya)
        python3 scripts/banjir/model_kab_campur.py buka --kering | buka [--awal YYYY-MM-DD]
"""
import bisect, collections, contextlib, datetime as dt, hashlib, inspect, io, json, math, os, random, statistics, subprocess, sys, tempfile
from collections import defaultdict

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
import model_kab2 as K2             # noqa: E402  (impor menambal MK.LATIH ke 2016-2023; pasang() hanya dari __main__)
import uji_logbook as UL            # noqa: E402

MK, HU, ub, G, V2, MKD = K2.MK, K2.HU, K2.ub, K2.G, K2.V2, K2.MKD

KELUAR = os.path.join(AKAR, "data/raw/banjir/model_kab_campur")
PROTOKOL = os.path.join(AKAR, "scripts/banjir/PRAREG-CAMPUR.md")
SIDIK_JEJAK = os.path.join(AKAR, "scripts/banjir/model_kab_campur.sidik")
SAMPEL = os.path.join(AKAR, "data/banjir/kab2_ops/sampel.json")
DERET_BULANAN = os.path.join(AKAR, "public/data/neraca_air/deret_bulanan.json")
GRACE = os.path.join(AKAR, "public/data/neraca_air/grace.json")
JAM_ERA5 = os.path.join(AKAR, "data/raw/banjir/jam_era5")
IKLIM_DIR = os.path.join(AKAR, "data/raw/banjir/iklim")           # ASUMSI lokasi oni.ascii.txt / dmi.had.long.data (pertanyaan P-3)

LATIH = range(2016, 2026)
LIPATAN = {1: 2022, 2: 2023, 3: 2024, 4: 2025, 5: 2026}           # F1-F4 memilih, F5 diagnostik
LABEL_AKHIR = dt.date(2026, 10, 18)                               # label sesudah ini DILARANG dibaca (§4.4 butir 2)
PROSPEKTIF_AKHIR = dt.date(2027, 4, 30)
BUKA_PALING_CEPAT = dt.date(2027, 6, 29)                          # label susulan L2 (§5.3d)
WIB = dt.timezone(dt.timedelta(hours=7))

TAU_GRID, TAUW_GRID, TAU_IKLIM = (0.05, 0.10, 0.25), (0.02, 0.05), 0.05
LANTAI_MIN, LANTAI_MAK, HALUS = 1e-5, 0.5, 30
ETA_JEPIT, ITER_MAKS, TOL = 30.0, 50, 1e-6
M_KELUARGA, Q_LO, Q_HI = 14, 0.0017, 0.9983                       # selang 99,66% (§5.1)
ULANG_GERBANG, ULANG_BUKA, BIJI = 5000, 20000, 11
JENDELA = {"h3": (-1, 1), "p_ant": (-8, -2), "q_ant": (-7, -2), "dq": (-4, -1), "swi_akhir": -2, "cs": (-1, 1), "neraca_lag": 4,
           "twsa_lag": 5, "oni_lag": 3, "dmi_lag": 6, "hu3_utc": (-4, -2)}
Q_ANT_BATAS = 4                                                   # dq = log1p(q(e-1)) - log1p(q(e-4))
SWI = {"L1": 15.0, "a1": 0.1, "L2": 60.0, "a2": 0.15, "b1": 0.12, "L3": 15.0, "a3": 0.05, "b2": 0.05, "L4": 15.0, "a4": 0.01, "b3": 0.01}
SWI_DT = 1 / 6
CENS = {"lon": (105.0, 115.0), "lat": (-5.0, 0.0), "ambang": 5.0}
PERSENTIL_A, KUAT_A, DURASI_PENUH, DURASI_CADANGAN = 0.20, 5, (1, 3, 6, 8, 12, 24, 72), (1, 24, 72)

WIL_CALON = {"Sumatera": ("11", "12", "13", "14", "15", "16", "17", "18", "19", "21"), "Jawa": ("31", "32", "33", "34", "35", "36"),
             "Kalimantan": ("61", "62", "63", "64", "65"), "Sulawesi": ("71", "72", "73", "74", "75", "76"), "Bali-NT": ("51", "52", "53"),
             "Maluku-Papua": ("81", "82", "91", "92", "93", "94", "95", "96")}
SYARAT_WIL = {"n_kab": 6, "P_w": 100, "T_w": 5, "T_min_positif": 5}
PENAMPUNG = "Lainnya"
KOREKSI_BIAS = {"Sumatera": "Sumatera", "Jawa": "Jawa", "Kalimantan": "Kalimantan"}   # selain ini -> "Lainnya" (koreksi_bias.WILAYAH)

S0 = ["pers_h3", "lh3", "limax", "sm", "h3_sm"]
S1 = S0 + ["q_q2"]
S2 = S1 + ["hx", "qa"]
S3 = S2 + ["q_ant_mx", "q_ant_mn", "dq", "p_ant"]
SETS = {"S0": S0, "S1": S1, "S2": S2, "S3": S3}
EKSTENSI = [("E_kedap", ["kd_limax"]), ("E_pasang", ["pa_h3", "pa_q"]), ("E_hulu", ["hu3"]), ("E_neraca", ["sa"]), ("E_twsa", ["twsa"]),
            ("E_swi", ["swi", "swi_h3"]), ("E_cs", ["cs_h3"]), ("E_iklim", ["oni", "dmi", "oni_l", "dmi_l"])]
BERLAKU = {"E_neraca": {"Jawa"}, "E_twsa": {"Jawa"}, "E_cs": {"Jawa", "Sumatera"}}
IKLIM_NAMA = ("oni", "dmi", "oni_l", "dmi_l")
TURUNAN = {"oni_l": "oni", "dmi_l": "dmi"}                        # kolom turunan: z(oni)*(logit p0 - m_w)
NETRAL = {"twsa"}                                                 # hilang -> 0 setelah standardisasi (§3.2b butir 5)
TANPA_P2 = {"hu3", "twsa", "q_q2", "q_ant_mx", "q_ant_mn", "dq", "qa", "pa_q", "sa", "swi", "swi_h3", "cs_h3"}   # §5.2b + catatan P2 rev.4
URUT_FITUR = [f for f in dict.fromkeys(S3 + [x for _, fs in EKSTENSI for x in fs])]

KRITERIA = {
    "model": "eta = logit(p0) + sum beta*z; offset 1, tanpa intersep, beta >= 0, L2 tau, partial pooling per wilayah efektif (tau_w), Platt per wilayah LOYO bersarang",
    "tau": list(TAU_GRID), "tau_w": list(TAUW_GRID), "tau_iklim": TAU_IKLIM, "satu_se": "n=4 lipatan F1-F4, simpangan baku sampel / akar n",
    "lulus": "batas bawah (lebih kecil dari dua skema) dETS(C-klim) Waspada & Siaga > 0, dBSS(C-klim) > 0, dETS(C-LR1) Waspada > 0, dBSS(C-LR1) > 0, dETS(C-aturan) Waspada & Siaga > 0",
    "tidak_lulus": "dETS(C-klim) Waspada titik <= 0, atau batas atas dETS(C-LR1) Waspada < 0, atau batas atas dETS(C-aturan) Waspada < 0",
    "selang": [Q_LO, Q_HI], "m": M_KELUARGA, "bootstrap": [ULANG_GERBANG, ULANG_BUKA], "biji": BIJI,
    "label_akhir": str(LABEL_AKHIR), "buka_paling_cepat": str(BUKA_PALING_CEPAT),
}


def J(nama):
    return os.path.join(KELUAR, nama)


class DataBelumAda(Exception):
    """Jalur ekstensi/pemblokir yang datanya belum ada: gagal rapi, ekstensi dihapus sesuai aturan dokumen."""


class GagalKonvergen(SystemExit):
    def __init__(self, pesan):
        super().__init__(3)
        self.pesan = pesan
        print("GAGAL KONVERGEN:", pesan, file=sys.stderr)


# ================================================================== A. matematika dasar dan penyelesai (§3.2c)
def logit(p):
    p = min(max(p, 1e-12), 1 - 1e-12)
    return math.log(p / (1 - p))


def sig(z):
    z = max(-ETA_JEPIT, min(ETA_JEPIT, z))
    return 1 / (1 + math.exp(-z))


def offset_dari(p0):
    """logit(p0) dijepit ke [logit(1e-5), logit(0,5)]. Konstanta dibaca di badan fungsi (kasus ilmu 1 Nov)."""
    return min(max(logit(p0), logit(LANTAI_MIN)), logit(LANTAI_MAK))


def gauss(A, v):
    n = len(v)
    M = [r[:] + [v[i]] for i, r in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        if abs(M[c][c]) < 1e-300:
            continue
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            if f:
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    x = [0.0] * n
    for c in range(n - 1, -1, -1):
        x[c] = (M[c][n] - sum(M[c][k] * x[k] for k in range(c + 1, n))) / M[c][c] if abs(M[c][c]) >= 1e-300 else 0.0
    return x


def standarisasi(X, w):
    """Rerata dan simpangan baku BERBOBOT baris latih (None diabaikan). -> mu, sd."""
    m = len(X[0]) if X else 0
    mu, sd = [], []
    for j in range(m):
        pv = [(r[j], wi) for r, wi in zip(X, w) if r[j] is not None]
        sw = sum(wi for _, wi in pv) or 1.0
        a = sum(v * wi for v, wi in pv) / sw
        s = math.sqrt(sum(wi * (v - a) ** 2 for v, wi in pv) / sw)
        mu.append(a)
        sd.append(s if s > 1e-12 else 1.0)
    return mu, sd


def selesai(Z, y, w, off, g=None, W=0, tau=None, tau_w=None, mask=None, tau_kol=None, bebas=None, nonneg=True):
    """IRLS/Newton penuh dengan himpunan-aktif (§3.2c). Z: n x m SUDAH terstandardisasi. off: logit(p0) per baris (koefisien tetap 1).
    Variabel [beta_nas (m), b_1..b_W (m masing-masing)], b_w = beta_nas + delta_w koefisien efektif wilayah w; semua >= 0 (kecuali `bebas`).
    Prior: beta^2/(2 tau^2) + (b_w - beta)^2/(2 tau_w^2) (setara delta_w ~ N(0, tau_w^2)). tau_w None = tanpa pooling (CN).
    mask[w][j] False = fitur j dipaksa 0 untuk wilayah w. -> {beta, koef[w], iter, grad, terjepit}. Gagal konvergen = GagalKonvergen (keluar 3)."""
    n = len(Z)
    m = len(Z[0]) if n else 0
    pooled = tau_w is not None and W > 0
    if m == 0:
        return {"beta": [], "koef": [[] for _ in range(max(W, 1))], "iter": 0, "grad": 0.0, "terjepit": 0}
    nv = m * (1 + W) if pooled else m
    tj = list(tau_kol) if tau_kol else [tau] * m
    bb = list(bebas) if bebas else [False] * m
    ok = [True] * nv
    lo = [(-math.inf if (bb[v % m] or not nonneg) else 0.0) for v in range(nv)]
    if pooled and mask:
        for k in range(W):
            for j in range(m):
                if not mask[k][j]:
                    ok[m * (1 + k) + j] = False
    gi = [m * (1 + g[i]) for i in range(n)] if pooled else [0] * n
    sw = sum(w)

    def hitung(th, penuh):
        f = 0.0
        if penuh:
            gr, H = [0.0] * nv, [[0.0] * nv for _ in range(nv)]
        for i in range(n):
            o, z = gi[i], Z[i]
            eta = off[i] + sum(z[j] * th[o + j] for j in range(m))
            eta = max(-ETA_JEPIT, min(ETA_JEPIT, eta))
            f += w[i] * (max(eta, 0.0) + math.log1p(math.exp(-abs(eta))) - y[i] * eta)
            if penuh:
                p = 1 / (1 + math.exp(-eta))
                r, q = w[i] * (p - y[i]), w[i] * p * (1 - p)
                for a in range(m):
                    gr[o + a] += r * z[a]
                    qa, Ha = q * z[a], H[o + a]
                    for c in range(m):
                        Ha[o + c] += qa * z[c]
        for j in range(m):
            inv = 1 / (tj[j] ** 2)
            f += th[j] ** 2 * inv / 2
            if penuh:
                gr[j] += th[j] * inv
                H[j][j] += inv
            if pooled:
                itw = 1 / tau_w ** 2
                for k in range(W):
                    v = m * (1 + k) + j
                    if not ok[v]:                    # A-9: pasangan (w,j) nonaktif (b dipaksa 0) tidak ikut penalti pooling
                        continue
                    d = th[v] - th[j]
                    f += d * d * itw / 2
                    if penuh:
                        gr[v] += d * itw
                        gr[j] -= d * itw
                        H[v][v] += itw
                        H[j][j] += itw
                        H[v][j] -= itw
                        H[j][v] -= itw
        return (f, gr, H) if penuh else (f, None, None)

    th, prev, it, pgn = [0.0] * nv, math.inf, 0, math.inf
    while True:
        f, gr, H = hitung(th, True)
        pgn = math.sqrt(sum((min(gr[v], 0.0) if th[v] <= lo[v] else gr[v]) ** 2 for v in range(nv) if ok[v]))
        if prev < TOL and pgn < TOL * sw:
            break
        if it >= ITER_MAKS:
            raise GagalKonvergen(f"{ITER_MAKS} iterasi tak cukup (perubahan {prev:.3g}, gradien aktif {pgn:.3g}, n={n}, m={m}, W={W})")
        it += 1
        F = [v for v in range(nv) if ok[v] and not (th[v] <= lo[v] and gr[v] >= 0)]
        while True:
            s = gauss([[H[a][b] for b in F] for a in F], [-gr[a] for a in F]) if F else []
            bad = [v for v, dv in zip(F, s) if th[v] <= lo[v] and dv < 0]
            if not bad:
                break
            F = [v for v in F if v not in bad]
        t, cand = 1.0, None
        for _ in range(40):
            c = th[:]
            for v, dv in zip(F, s):
                c[v] = max(lo[v], th[v] + t * dv)
            fc = hitung(c, False)[0]
            if fc <= f + 1e-12 * abs(f):
                cand = c
                break
            t /= 2
        if cand is None:
            if pgn < TOL * sw:
                break
            raise GagalKonvergen(f"garis-pencarian gagal (gradien aktif {pgn:.3g}, n={n}, m={m}, W={W})")
        prev, th = max(abs(a - b) for a, b in zip(cand, th)), cand
    beta = th[:m]
    koef = [th[m * (1 + k):m * (2 + k)] for k in range(W)] if pooled else [beta] * max(W, 1)
    return {"beta": beta, "koef": koef, "iter": it, "grad": pgn, "terjepit": sum(1 for v in range(nv) if ok[v] and lo[v] == 0.0 and th[v] == 0.0)}


# ================================================================== B. tingkat 1: lantai klimatologi kab x bulan (§3.1)
def prov_dari(kab):
    return kab.split("|", 1)[0]


def calon_dari(prov):
    for c, ps in WIL_CALON.items():
        if prov in ps:
            return c
    return None


def lantai_fit(T, ix):
    """p0 dari baris `ix` saja (tahun latih). Unit musim = provinsi bila >= 3 kab di sampel ix, selain itu pulau (calon wilayah)."""
    kp = defaultdict(set)
    for i in ix:
        kp[prov_dari(T["kab"][i])].add(T["kab"][i])
    unit = lambda kab: prov_dari(kab) if len(kp.get(prov_dari(kab), ())) >= 3 else "pulau:" + str(calon_dari(prov_dari(kab)))
    agr = {k: defaultdict(lambda: [0.0, 0.0]) for k in ("u", "ub", "k", "kb")}
    tot = [0.0, 0.0]
    for i in ix:
        a, b, kab, bl = T["w"][i] * T["y"][i], T["w"][i], T["kab"][i], T["bulan"][i]
        u = unit(kab)
        for d in (agr["u"][u], agr["ub"][f"{u}|{bl}"], agr["k"][kab], agr["kb"][f"{kab}|{bl}"], tot):
            d[0] += a
            d[1] += b
    r0 = tot[0] / tot[1] if tot[1] else LANTAI_MIN
    ru = {u: v[0] / v[1] for u, v in agr["u"].items() if v[1]}
    s = {}
    for ub_, v in agr["ub"].items():
        u = ub_.rsplit("|", 1)[0]
        rub = (v[0] + HALUS * ru[u]) / (v[1] + HALUS)
        s[ub_] = rub / ru[u] if ru[u] > 0 else 1.0
    rk = {kab: (v[0] + HALUS * ru[unit(kab)]) / (v[1] + HALUS) for kab, v in agr["k"].items()}
    return {"r0": r0, "ru": ru, "s": s, "rk": rk, "kb": {k: list(v) for k, v in agr["kb"].items()}, "n_kab_prov": {p: len(v) for p, v in kp.items()}}


def lantai_p(mod, kab, bulan):
    p = prov_dari(kab)
    u = p if mod["n_kab_prov"].get(p, 0) >= 3 else "pulau:" + str(calon_dari(p))
    ru = mod["ru"].get(u, mod["r0"])
    prior = mod["rk"].get(kab, ru) * mod["s"].get(f"{u}|{bulan}", 1.0)
    a, b = mod["kb"].get(f"{kab}|{bulan}", (0.0, 0.0))
    return min(max((a + HALUS * prior) / (b + HALUS), LANTAI_MIN), LANTAI_MAK)


def lantai_loyo(T, ix):
    """p0 baris latih `ix` yang dihitung TANPA tahun baris itu (pencegah kebocoran tumpukan). -> {i: p0}."""
    out = {}
    for z in sorted({T["tahun"][i] for i in ix}):
        mod = lantai_fit(T, [i for i in ix if T["tahun"][i] != z])
        for i in ix:
            if T["tahun"][i] == z:
                out[i] = lantai_p(mod, T["kab"][i], T["bulan"][i])
    return out


# ================================================================== C. wilayah efektif (§3.2b langkah 1)
def gabung_wilayah(kab, tahun, y, w, tahun_latih):
    """Baris latih (kab, tahun, y, w) -> {'peta': {calon: wilayah efektif}, 'rincian': {calon: {n_kab, P_w, T_w, lolos}}, 'koreksi_bias': {...}, 'urutan': [...]}.
    Calon lolos bila n_kab >= 6 DAN P_w >= 100 DAN T_w >= 5 (positif BERBOBOT); selain itu digabung ke Lainnya. Hanya tahun latih."""
    ada, P, per_th = defaultdict(set), defaultdict(float), defaultdict(float)
    for k, t, yi, wi in zip(kab, tahun, y, w):
        c = calon_dari(prov_dari(k))
        if c is None or t not in tahun_latih:
            continue
        ada[c].add(k)
        if yi:
            P[c] += wi
            per_th[(c, t)] += wi
    rinci, peta = {}, {}
    for c in WIL_CALON:
        n_kab, Pw = len(ada[c]), P[c]
        Tw = sum(1 for t in tahun_latih if per_th[(c, t)] >= SYARAT_WIL["T_min_positif"])
        lolos = n_kab >= SYARAT_WIL["n_kab"] and Pw >= SYARAT_WIL["P_w"] and Tw >= SYARAT_WIL["T_w"]
        rinci[c] = {"n_kab": n_kab, "P_w": round(Pw, 3), "T_w": Tw, "lolos": lolos}
        peta[c] = c if lolos else PENAMPUNG
    pw = {}
    for c in WIL_CALON:
        if peta[c] == c:
            pw[c] = (-rinci[c]["P_w"], min(p for p in WIL_CALON[c]))
    urutan = sorted(pw, key=lambda c: pw[c]) + ([PENAMPUNG] if PENAMPUNG in peta.values() else [])
    return {"peta": peta, "rincian": rinci, "urutan": urutan,
            "koreksi_bias": {w_: KOREKSI_BIAS.get(w_, "Lainnya") for w_ in set(peta.values())},     # A-7 rev: dari WILAYAH EFEKTIF (§3.2b tabel tetap)
            "cw_sekunder": len(set(peta.values())) < 3}


def wil_dari_kab(kab, peta):
    return peta.get(calon_dari(prov_dari(kab)), PENAMPUNG)


# ================================================================== D. fitur murni (§3.2, §3.2d), semuanya fungsi dari statistik TAHUN LATIH
def batas_acuan(nilai, tahun, acuan):
    """Batas persentil terurut dari nilai pada tahun `acuan` saja."""
    return sorted(v for v, t in zip(nilai, tahun) if t in acuan and v is not None)


def pers_dari(batas, v):
    return bisect.bisect_left(batas, v) / len(batas) if batas else 0.0


def anomali_kb(nilai, kab, bulan, tahun, wil, acuan, minimal=30):
    """Anomali per kab-bulan: (v - rerata_kb)/sd_kb dari TAHUN LATIH saja; kab-bulan < `minimal` hari latih memakai wilayah-bulan."""
    def agr(kunci):
        d = defaultdict(list)
        for v, k, t in zip(nilai, kunci, tahun):
            if t in acuan and v is not None:
                d[k].append(v)
        out = {}
        for k, v in d.items():
            mu = sum(v) / len(v)
            sd = math.sqrt(sum((x - mu) ** 2 for x in v) / len(v))
            out[k] = (mu, sd if sd > 1e-12 else 1.0, len(v))
        return out
    akb, awb = agr([(k, b) for k, b in zip(kab, bulan)]), agr([(w_, b) for w_, b in zip(wil, bulan)])
    out = []
    for v, k, b, w_ in zip(nilai, kab, bulan, wil):
        if v is None:
            out.append(None)
            continue
        s = akb.get((k, b))
        s = s if s and s[2] >= minimal else awb.get((w_, b))
        out.append((v - s[0]) / s[1] if s else 0.0)
    return out


def gumbel_q2(maks):
    """Q2 Gumbel-momen dari maksimum tahunan (>= 5 tahun); T=2: mean - sd*sqrt(6)/pi*(gamma + ln ln 2). Tak terhitung/<=0 -> None."""
    maks = [v for v in maks if v is not None]
    if len(maks) < 5:
        return None
    a = statistics.stdev(maks) * math.sqrt(6) / math.pi
    q2 = statistics.mean(maks) - a * (0.5772156649 + math.log(math.log(2)))
    return q2 if q2 > 0 else None


def q2_per_sel(q_harian, tahun_hari, acuan, median_min=5.0):
    """Q2 sel dari maksimum tahunan debit tahun `acuan` saja (rolling; penyimpangan sadar dari GRRR TAHUN_Q2=2021). Sel median < 5 m3/s -> None."""
    per = defaultdict(list)
    for q, t in zip(q_harian, tahun_hari):
        if q is not None and t in acuan:
            per[t].append(q)
    semua = [q for v in per.values() for q in v]
    if not semua or statistics.median(semua) < median_min:
        return None
    return gumbel_q2([max(v) for v in per.values()])


def q_q2_fitur(q3_log, q2):
    """q3 SUDAH log1p (model_kab_debit.fitur_q) -> q3 - log1p(Q2); Q2 tak ada -> 0 (tanpa log1p ganda)."""
    return 0.0 if q2 is None or q3_log is None else q3_log - math.log1p(q2)


def jendela_q(q, e, a, b):
    """Nilai non-None di q[e+a..e+b]; e+a < 0 -> [] (indeks negatif membungkus ke ekor deret = membaca masa depan: DILARANG)."""
    return [] if e + a < 0 else [x for x in q[e + a:e + b + 1] if x is not None]


def q_anteseden(q, e, q2):
    """-> (q_ant_mx, q_ant_mn, dq) dari debit hari <= e-1 saja. Q2 tak ada atau jendela kosong -> (0,0,0)."""
    if q2 is None:
        return 0.0, 0.0, 0.0
    w = jendela_q(q, e, *JENDELA["q_ant"])
    mx, mn = (math.log1p(max(w)) - math.log1p(q2), math.log1p(sum(w) / len(w)) - math.log1p(q2)) if w else (0.0, 0.0)
    a = q[e - 1] if e - 1 >= 0 else None
    b = q[e - Q_ANT_BATAS] if e - Q_ANT_BATAS >= 0 else None
    return mx, mn, (math.log1p(a) - math.log1p(b) if a is not None and b is not None else 0.0)


def p_ant_fitur(p_harian, e, batas7):
    """Persentil jumlah hujan e-8..e-2 terhadap sebaran jumlah 7 hari sel itu (tahun latih)."""
    a, b = JENDELA["p_ant"]
    if e + a < 0:
        return None                                  # jendela keluar dari awal deret: fitur hilang (baris dibuang)
    return pers_dari(batas7, sum(p_harian[e + a:e + b + 1]))


def swi_jma(hujan_jam, dt_jam=None):
    """SWI tiga tangki JMA (Tabel 1, Ishihara & Kobatake 1979). hujan_jam mm/jam beruntun; dt_jam = 1/6 jam (langkah 10 menit). dt >= 1 jam DILARANG
    (hujan harian dibagi rata juga). -> SWI mm pada AKHIR tiap jam. R per sub-langkah = mm/jam * dt."""
    dtj = SWI_DT if dt_jam is None else dt_jam
    if dtj > SWI_DT + 1e-12:
        raise ValueError(f"dt {dtj} jam > 1/6 jam: DILARANG (dt = 24 jam membuat simpanan negatif)")
    P, n = SWI, int(round(1 / dtj))
    s1 = s2 = s3 = 0.0
    out = []
    for r in hujan_jam:
        for _ in range(n):
            q1 = P["a1"] * max(s1 - P["L1"], 0.0) + P["a2"] * max(s1 - P["L2"], 0.0)
            q2, q3 = P["a3"] * max(s2 - P["L3"], 0.0), P["a4"] * max(s3 - P["L4"], 0.0)
            s1, s2, s3 = ((1 - P["b1"] * dtj) * s1 - q1 * dtj + r * dtj, (1 - P["b2"] * dtj) * s2 - q2 * dtj + P["b1"] * s1 * dtj,
                          (1 - P["b3"] * dtj) * s3 - q3 * dtj + P["b2"] * s2 * dtj)
        out.append(s1 + s2 + s3)
    return out


def cs_cont(v_area_hari, e):
    """CENS: v_area_hari[d] = rerata area (-v) 10 m kotak 105-115 BT, 5 LS-0 pada hari d (WIB). vbar = rerata hari e-1..e+1; cont = max(0, vbar - 5)."""
    a, b = JENDELA["cs"]
    if e + a < 0:
        return None, None
    w = [x for x in v_area_hari[e + a:e + b + 1] if x is not None]
    vbar = sum(w) / len(w) if w else 0.0
    return max(0.0, vbar - CENS["ambang"]), 1.0 if vbar > CENS["ambang"] else 0.0


def pa_harian(tgl, profil, skala=None):
    """Indeks gaya pembangkit pasang (0-1; BUKAN tinggi pasang) = maks harian (jam WIB) dari profil.diurnal*d/mx0 + profil.semi*s/mx1.
    Murni fungsi tanggal; profil dari pasang_astro.PROFIL (tidak diubah)."""
    import pasang_astro as PA
    mx = skala or PA.skala()
    p = PA.PROFIL[profil]
    t0 = dt.datetime(tgl.year, tgl.month, tgl.day, tzinfo=WIB)
    best = 0.0
    for h in range(24):
        d, s = PA.gaya((t0 + dt.timedelta(hours=h)).astimezone(dt.timezone.utc))
        best = max(best, p["diurnal"] * d / mx[0] + p["semi"] * s / mx[1])
    return best


def profil_pasang(prov):
    import pasang_astro as PA
    return "pantura" if prov in PA.KP_PANTURA else "lain"


def geser_bulan(tahun, bulan, k):
    i = tahun * 12 + (bulan - 1) - k
    return i // 12, i % 12 + 1


def parse_oni(teks):
    """oni.ascii.txt 'SEAS YR TOTAL ANOM' -> {(tahun_pusat, bulan_pusat): anom}. DJF pusat Jan ... NDJ pusat Des."""
    musim = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]
    out = {}
    for ln in teks.splitlines():
        p = ln.split()
        if len(p) >= 4 and p[0] in musim:
            out[(int(p[1]), musim.index(p[0]) + 1)] = float(p[3])
    return out


def parse_dmi(teks):
    """dmi.had.long.data: 'YYYY v1..v12'; -9999 = hilang -> {(tahun, bulan): nilai}."""
    out = {}
    for ln in teks.splitlines():
        p = ln.split()
        if len(p) == 13 and p[0].isdigit() and 1800 < int(p[0]) < 2100:
            for b, v in enumerate(p[1:], 1):
                if float(v) > -999:
                    out[(int(p[0]), b)] = float(v)
    return out


def iklim_lag(seri, tahun, bulan, kunci):
    """Nilai indeks iklim untuk bulan sasaran: ONI = musim BERAKHIR di b-2 (pusat b-3), DMI = bulan b-6 (JENDELA)."""
    return seri.get(geser_bulan(tahun, bulan, JENDELA[kunci]))


_DERET = []
_AN_CACHE = {}


def _modul_deret():
    if not _DERET:
        import importlib.util
        jalur = os.path.join(AKAR, "scripts/air/neraca/deret.py")
        spec = importlib.util.spec_from_file_location("deret_neraca", jalur)
        sys.path.insert(0, os.path.dirname(jalur))
        try:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
        finally:
            sys.path.pop(0)
        _DERET.append(mod)
    return _DERET[0]


def sa_neraca(deret_s, tahun, bulan, acuan):
    """Anomali S bulan m-4: S(m-4) - rerata bulan-kalender yang sama atas TAHUN `acuan` (deret.anomali). deret_s: {'YYYY-MM': S|None}."""
    mod = _modul_deret()
    y, m = geser_bulan(tahun, bulan, JENDELA["neraca_lag"])
    kunci = (id(deret_s), tuple(sorted(acuan)), hash(tuple(deret_s.items())))
    if kunci not in _AN_CACHE:
        _AN_CACHE.clear() if len(_AN_CACHE) > 64 else None
        _AN_CACHE[kunci] = mod.anomali(deret_s, sorted(acuan))
    return _AN_CACHE[kunci].get(f"{y}-{m:02d}")


def twsa_fitur(tws, waktu, tahun, bulan, acuan, minimal=4):
    """tws_cm bulan b-5 dikurangi klimatologi bulan-kalender dari bulan GRACE pada TAHUN `acuan` saja; < 4 pengamatan atau bulan hilang -> None."""
    y, m = geser_bulan(tahun, bulan, JENDELA["twsa_lag"])
    idx = {w_: i for i, w_ in enumerate(waktu)}
    kunci = f"{y}-{m:02d}"
    if kunci not in idx or tws[idx[kunci]] is None:
        return None
    ref = [tws[idx[w_]] for w_ in waktu if int(w_[:4]) in acuan and int(w_[5:]) == m and tws[idx[w_]] is not None]
    return tws[idx[kunci]] - sum(ref) / len(ref) if len(ref) >= minimal else None


def hash_potongan(deret_kab, sampai="2026-07"):
    """sha256 nilai P, ETa, R, S per kab untuk bulan <= `sampai` (berkas utuh diperpanjang tiap bulan)."""
    isi = {}
    for kode in sorted(deret_kab):
        d = deret_kab[kode]
        n = sum(1 for b in d["bulan"] if b <= sampai)
        isi[kode] = [d["bulan"][:n]] + [d[k][:n] for k in ("P", "ETa", "R", "S")]
    return hashlib.sha256(json.dumps(isi, sort_keys=True).encode()).hexdigest()


# ================================================================== E. konteks, cocok, prediksi, validasi bersarang (§3.2, §3.3, §3.2c)
class Konteks:
    """T: kolom tabel baris (kab, wil, tahun, bulan, e, y, w, ye, uji, level) + fitur(acuan)->{nama: [nilai|None]} (statistik HANYA dari `acuan`).
    wilayah: daftar wilayah efektif (urutan = indeks grup). X_lr1: matriks LR1 (opsional)."""

    def __init__(self, T, bangun, wilayah, X_lr1=None, tersedia=None):
        self.T, self._bangun, self.wilayah, self.X_lr1 = T, bangun, list(wilayah), X_lr1
        self.n, self._cache = len(T["y"]), {}
        self.tersedia = tersedia if tersedia is not None else set(URUT_FITUR)

    def F(self, acuan):
        k = frozenset(acuan)
        if k not in self._cache:
            self._cache[k] = self._bangun(k)
        return self._cache[k]


def nama_set(cfg, wil=None):
    s = cfg["set"]
    ws = [wil] if wil else list(s)
    return [f for f in URUT_FITUR if any(f in s[w_] for w_ in ws)]


def cocok(ctx, acuan, cfg):
    """Cocokkan satu model pada tahun `acuan`: lantai LOYO, fitur dengan statistik LOYO, standardisasi baris latih, penyelesai. -> model (JSON-able)."""
    T, acuan = ctx.T, frozenset(acuan)
    ix = [i for i in range(ctx.n) if T["tahun"][i] in acuan and T["w"][i] > 0]
    if not ix:
        raise ValueError("tidak ada baris latih")
    p0 = lantai_loyo(T, ix)
    nama = nama_set(cfg)
    kolom = [n for n in nama if n not in TURUNAN]
    mentah = {n: {} for n in kolom}
    for z in acuan:
        Fz = ctx.F(acuan - {z}) if kolom else {}
        for n in kolom:
            col = Fz[n]
            for i in ix:
                if T["tahun"][i] == z:
                    mentah[n][i] = col[i]
    wil_i = {i: T["wil"][i] for i in ix}
    sah = [i for i in ix if all(mentah[n][i] is not None for n in kolom if n in cfg["set"][wil_i[i]] and n not in NETRAL)]
    if not sah:
        raise ValueError("semua baris latih gugur karena fitur hilang")
    w_ = [T["w"][i] for i in sah]
    mu, sd = standarisasi([[mentah[n][i] for n in kolom] for i in sah], w_) if kolom else ([], [])
    Z = [[0.0 if mentah[n][i] is None else (mentah[n][i] - mu[j]) / sd[j] for j, n in enumerate(kolom)] for i in sah]
    off = [offset_dari(p0[i]) for i in sah]
    mw = {}
    for wl in ctx.wilayah:
        o = [a for a, i in zip(off, sah) if wil_i[i] == wl]
        mw[wl] = sum(o) / len(o) if o else 0.0
    nama_z = list(kolom)
    for t, dasar in TURUNAN.items():
        if t in nama:
            j = kolom.index(dasar)
            for r, a, i in zip(Z, off, sah):
                r.append(r[j] * (a - mw[wil_i[i]]))
            nama_z.append(t)
    m = len(nama_z)
    W = len(ctx.wilayah)
    g = [ctx.wilayah.index(wil_i[i]) for i in sah]
    mask = [[(n in cfg["set"][wl]) for n in nama_z] for wl in ctx.wilayah]
    tkol = [TAU_IKLIM if n in IKLIM_NAMA else cfg["tau"] for n in nama_z]
    bebas = [n in IKLIM_NAMA for n in nama_z]
    hasil = selesai(Z, [T["y"][i] for i in sah], w_, off, g, W, cfg["tau"], cfg.get("tau_w"), mask, tkol, bebas)
    return {"nama": nama_z, "kolom": kolom, "mu": mu, "sd": sd, "koef": hasil["koef"], "beta": hasil["beta"], "mw": mw,
            "lantai": lantai_fit(T, ix), "acuan": sorted(acuan), "iter": hasil["iter"], "grad": hasil["grad"], "terjepit": hasil["terjepit"],
            "n_latih": len(sah), "n_gugur": len(ix) - len(sah)}


def eta_baris(ctx, mod, rows):
    """Logit akhir baris `rows` dengan fitur berstatistik tahun-latih model; fitur hilang -> 0 (netral, dihitung)."""
    T, nm = ctx.T, mod["nama"]
    F = ctx.F(mod["acuan"]) if mod["kolom"] else {}
    out = []
    for i in rows:
        off = offset_dari(lantai_p(mod["lantai"], T["kab"][i], T["bulan"][i]))
        wl = ctx.wilayah.index(T["wil"][i])
        z = [0.0 if F[n][i] is None else (F[n][i] - mod["mu"][j]) / mod["sd"][j] for j, n in enumerate(mod["kolom"])]
        for t, dasar in TURUNAN.items():
            if t in nm:
                z.append(z[mod["kolom"].index(dasar)] * (off - mod["mw"][T["wil"][i]]))
        out.append(off + sum(c * v for c, v in zip(mod["koef"][wl], z)))
    return out


PLATT_NETRAL = {"mu": 0.0, "sd": 1.0, "b0": 0.0, "b1": 1.0}


def platt_wil(eta, y, w, wil):
    """Platt (model_kab2.platt_w) per wilayah efektif; wilayah tanpa dua kelas -> netral (dicatat oleh pemanggil)."""
    out = {}
    for wl in set(wil):
        ix = [i for i, a in enumerate(wil) if a == wl]
        out[wl] = K2.platt_w([eta[i] for i in ix], [y[i] for i in ix], [w[i] for i in ix]) if 0 < sum(y[i] for i in ix) < len(ix) else dict(PLATT_NETRAL)
    return out


def pakai_platt_wil(pl, eta, wil):
    return [G.sigmoid(pl[a]["b0"] + pl[a]["b1"] * (z - pl[a]["mu"]) / pl[a]["sd"]) if a in pl else G.sigmoid(z) for z, a in zip(eta, wil)]


def cocok_penuh(ctx, acuan, cfg):
    """Model + Platt per wilayah dari logit luar-lipatan LOYO BERSARANG: model tahun z dilatih pada acuan\\{z} utuh (lantai, fitur, beta, Platt-nya sendiri)."""
    T, acuan = ctx.T, frozenset(acuan)
    mod = cocok(ctx, acuan, cfg)
    ix = [i for i in range(ctx.n) if T["tahun"][i] in acuan and T["w"][i] > 0]
    eta = {}
    for z in sorted(acuan):
        mz = cocok(ctx, acuan - {z}, cfg)
        ke = [i for i in ix if T["tahun"][i] == z]
        for i, v in zip(ke, eta_baris(ctx, mz, ke)):
            eta[i] = v
    pl = platt_wil([eta[i] for i in ix], [T["y"][i] for i in ix], [T["w"][i] for i in ix], [T["wil"][i] for i in ix])
    return {"model": mod, "platt": pl, "oof": {i: eta[i] for i in ix}}


def skor_penuh(ctx, kp, rows):
    return pakai_platt_wil(kp["platt"], eta_baris(ctx, kp["model"], rows), [ctx.T["wil"][i] for i in rows])


def cfg_dari(ctx, nama_set_, tau, tau_w, per_wil=None):
    """Fitur di luar ctx.tersedia (data belum ada) DIBUANG dari set (aturan hapus-ekstensi §3.2d)."""
    base = list(SETS[nama_set_]) if isinstance(nama_set_, str) else list(nama_set_)
    ok = lambda fs: [f for f in fs if f in ctx.tersedia or f in TURUNAN]
    return {"tau": tau, "tau_w": tau_w, "set": {wl: ok((per_wil or {}).get(wl, base)) for wl in ctx.wilayah}}


def baris_uji(ctx, tahun):
    return [i for i in range(ctx.n) if ctx.T["tahun"][i] == tahun and ctx.T["uji"][i]]


def lipat(ctx, cfg, tahun_uji):
    """Satu lipatan luar: latih pada tahun < tahun_uji (2026 -> semua 2016-2025), skor baris uji tahun itu. -> (rows, p)."""
    acuan = frozenset(t for t in LATIH if t < tahun_uji)
    kp = cocok_penuh(ctx, acuan, cfg)
    rows = baris_uji(ctx, tahun_uji)
    return rows, skor_penuh(ctx, kp, rows)


def p_klimatologi(ctx, tahun_uji):
    return lipat(ctx, cfg_dari(ctx, [], 0.05, None), tahun_uji)


def p_lr1(ctx, tahun_uji):
    """LR1 tanpa offset (resep model_kab: G.latih_lr l2 1,0) + Platt per wilayah LOYO; fitur ctx.X_lr1."""
    T, acuan = ctx.T, frozenset(t for t in LATIH if t < tahun_uji)
    ix = [i for i in range(ctx.n) if T["tahun"][i] in acuan and T["w"][i] > 0]
    TRs = {"tahun": [T["tahun"][i] for i in ix], "y": [T["y"][i] for i in ix]}
    X, y, w = [ctx.X_lr1[i] for i in ix], TRs["y"], [T["w"][i] for i in ix]
    z = K2.loyo(TRs, lambda k: G.latih_lr([X[j] for j in k], [y[j] for j in k], [w[j] for j in k], l2=1.0),
                lambda m, ke: [m["b"][0] + sum(b * (X[j][c] - m["mu"][c]) / m["sd"][c] for c, b in enumerate(m["b"][1:])) for j in ke])
    pl = platt_wil(z, y, w, [T["wil"][i] for i in ix])
    m = G.latih_lr(X, y, w, l2=1.0)
    rows = baris_uji(ctx, tahun_uji)
    eta = [m["b"][0] + sum(b * (ctx.X_lr1[i][c] - m["mu"][c]) / m["sd"][c] for c, b in enumerate(m["b"][1:])) for i in rows]
    return rows, pakai_platt_wil(pl, eta, [T["wil"][i] for i in rows])


# ================================================================== F. pemilihan konfigurasi (§3.2b langkah 3-4b, aturan satu-SE §3.2c)
def satu_se(konfig):
    """konfig: [(nama, [logloss per lipatan])] diurut dari PALING SEDERHANA. Dipilih yang paling sederhana dengan rerata <= rerata minimum + SE konfigurasi minimum."""
    ok = [i for i in range(len(konfig[0][1])) if all(math.isfinite(v[i]) for _, v in konfig)]   # lipatan tanpa positif (nan) dibuang dari SEMUA konfigurasi
    if len(ok) < 2:                                   # < 2 lipatan valid: SE tak terdefinisi -> konfigurasi paling sederhana
        return konfig[0][0]
    konfig = [(nm, [v[i] for i in ok]) for nm, v in konfig]
    rata = [sum(v) / len(v) for _, v in konfig]
    k = min(range(len(konfig)), key=lambda i: rata[i])
    v = konfig[k][1]
    se = statistics.stdev(v) / math.sqrt(len(v)) if len(v) > 1 else 0.0
    for nm, vv in konfig:
        if sum(vv) / len(vv) <= rata[k] + se + 1e-15:
            return nm
    return konfig[k][0]


def terima_ekstensi(ll0, ll1, ets0, ets1):
    """§3.2b 4b: (a) rerata logloss turun > 1 SE selisih berpasangan, (b) dETS Waspada > 0 pada >= 3 dari 4 lipatan, (c) logloss turun pada >= 3 dari 4."""
    if not all(math.isfinite(x) for x in list(ll0) + list(ll1)):
        return False
    d = [a - b for a, b in zip(ll0, ll1)]
    se = statistics.stdev(d) / math.sqrt(len(d)) if len(d) > 1 else 0.0
    return sum(d) / len(d) > se and sum(1 for a, b in zip(ets0, ets1) if b - a > 0) >= 3 and sum(1 for x in d if x > 0) >= 3


def ekstensi_berlaku(nama, wil, tersedia):
    fs = dict(EKSTENSI)[nama]
    return wil in BERLAKU.get(nama, {wil}) and all(f in tersedia or f in TURUNAN for f in fs if f != "pa_q")


def pilih_semua(ctx, evaluasi, urutan_wil, cw_sekunder=False):
    """Seluruh pemilihan §3.2b langkah 3-4b. evaluasi(cfg, buang=None) -> {'ll': [4], 'll_wil': {wl: [4]}, 'ets_wil': {wl: [4]}}.
    1) tau pada CN (S1 semua wilayah, tanpa delta); 2) tau_w pada CW; 3) set per wilayah (urutan P_w menurun, Lainnya terakhir, SATU putaran);
    4) ekstensi berurutan per wilayah. -> {tau, tau_w, set, ekstensi_diterima, log}."""
    S1_ = list(SETS["S1"])
    log = {}
    tau = satu_se([(t, evaluasi(cfg_dari(ctx, S1_, t, None))["ll"]) for t in sorted(TAU_GRID)])
    tw = satu_se([(t, evaluasi(cfg_dari(ctx, S1_, tau, t))["ll"]) for t in sorted(TAUW_GRID)])
    pilihan = {wl: "S1" for wl in ctx.wilayah}
    irisan_set = [f for f in SETS["S3"] if f in ctx.tersedia]                                    # A-4: bandingkan antar-set pada irisan baris valid SEMUA kandidat
    if cw_sekunder:
        return {"tau": tau, "tau_w": tw, "set": {wl: list(S1_) for wl in ctx.wilayah}, "ekstensi_diterima": {}, "log": {"cw_sekunder": True}}
    for wl in urutan_wil:
        kand = []
        for ns in ("S0", "S1", "S2", "S3"):
            if not all(f in ctx.tersedia or f in SETS["S0"] for f in SETS[ns]):
                continue
            per = {w2: SETS[pilihan[w2]] for w2 in ctx.wilayah}
            per[wl] = SETS[ns]
            kand.append((ns, evaluasi(cfg_dari(ctx, S1_, tau, tw, per), buang=irisan_set)["ll_wil"][wl]))
        pilihan[wl] = satu_se(kand)
        log[wl] = {"set": pilihan[wl], "kandidat": {k: round(sum(v) / len(v), 6) for k, v in kand}}
    terima = {wl: [] for wl in ctx.wilayah}
    for wl in urutan_wil:
        for nm, fs in EKSTENSI:
            if not ekstensi_berlaku(nm, wl, ctx.tersedia):
                continue
            fs = [f for f in fs if f != "pa_q" or "q_q2" in SETS[pilihan[wl]]]
            dasar = {w2: list(SETS[pilihan[w2]]) + [f for e in terima[w2] for f in dict(EKSTENSI)[e]] for w2 in ctx.wilayah}
            coba = {**dasar, wl: dasar[wl] + fs}
            bagi = sorted(set(dasar[wl]) | set(fs))                                              # A-4: irisan baris valid dasar + ekstensi
            r0 = evaluasi(cfg_dari(ctx, S1_, tau, tw, dasar), buang=bagi)
            r1 = evaluasi(cfg_dari(ctx, S1_, tau, tw, coba), buang=bagi)
            if terima_ekstensi(r0["ll_wil"][wl], r1["ll_wil"][wl], r0["ets_wil"][wl], r1["ets_wil"][wl]):
                terima[wl].append(nm)
            log.setdefault(wl, {}).setdefault("ekstensi", {})[nm] = nm in terima[wl]
    final = cfg_dari(ctx, [], tau, tw, {wl: list(SETS[pilihan[wl]]) + [f for e in terima[wl] for f in dict(EKSTENSI)[e]] for wl in ctx.wilayah})["set"]
    return {"tau": tau, "tau_w": tw, "set": final, "ekstensi_diterima": terima, "log": log}


# ================================================================== G. penilaian: ETS, bootstrap blok, vonis (§5)
def ets_waspada(p, ye, level, ix=None, ambang=1):
    ix = list(range(len(p))) if ix is None else ix
    n = sum(1 for i in ix if level[i] >= ambang)
    al = MK.alarm_sebanyak([p[i] for i in ix], n)
    kon = [0, 0, 0, 0]
    for a, i in zip(al, ix):
        y = ye[i]
        kon[0 if a and y else 1 if a else 2 if y else 3] += 1
    return HU.ets_t(kon)


def evaluator(ctx):
    """evaluasi(cfg, buang) untuk pilih_semua: logloss berbobot (label latih y,w) dan ETS Waspada (label eval ye, alarm = jumlah level>=1) pada F1-F4."""
    T, cache = ctx.T, {}

    def evaluasi(cfg, buang=None):
        kunci = json.dumps([cfg, sorted(buang or [])], sort_keys=True)
        if kunci in cache:
            return cache[kunci]
        ll, llw, etw = [], defaultdict(list), defaultdict(list)
        for f in (1, 2, 3, 4):
            th = LIPATAN[f]
            rows, p = lipat(ctx, cfg, th)
            if buang:
                Fa = ctx.F(frozenset(t for t in LATIH if t < th))
                sah = [k for k, i in enumerate(rows) if all(Fa[b][i] is not None for b in buang if b in Fa)]
                rows, p = [rows[k] for k in sah], [p[k] for k in sah]
            ok = [k for k, i in enumerate(rows) if T["w"][i] > 0]
            ll.append(G.logloss([p[k] for k in ok], [T["y"][rows[k]] for k in ok], [T["w"][rows[k]] for k in ok]))
            for wl in ctx.wilayah:
                kw = [k for k in ok if T["wil"][rows[k]] == wl]
                if kw and sum(T["y"][rows[k]] * T["w"][rows[k]] for k in kw) > 0:
                    llw[wl].append(G.logloss([p[k] for k in kw], [T["y"][rows[k]] for k in kw], [T["w"][rows[k]] for k in kw]))
                    etw[wl].append(ets_waspada(p, [T["ye"][i] for i in rows], [T["level"][i] for i in rows], kw))
                else:
                    llw[wl].append(float("nan"))
                    etw[wl].append(0.0)
        cache[kunci] = {"ll": ll, "ll_wil": dict(llw), "ets_wil": dict(etw)}
        return cache[kunci]
    return evaluasi


KONTRAS = ("klim", "lr1", "aturan")


def boot_c(B, alarm, P, ulang=None, acuan="klim"):
    """Bootstrap blok berpasangan dua skema (kab x musim-tahun, pulau x minggu), resampel identik antar-penilai; batas bawah = terkecil, atas = terbesar.
    B: kab, tahun, bulan, e, y (label eval), level. alarm[m][lv] bool; P[m] peluang. Selang [Q_LO, Q_HI] (m = 14)."""
    ulang = ULANG_GERBANG if ulang is None else ulang
    y, hasil = B["y"], defaultdict(dict)
    LV = MK.LEVEL_ALARM
    for skema in HU.SKEMA:
        bl = HU.blok_h(B, skema)
        kunci = sorted(bl)
        cnt = {m: {lv: MK.cacah(B, alarm[m][lv], bl) for lv in LV} for m in alarm}
        se = {k: {m: sum((P[m][i] - y[i]) ** 2 for i in ix) for m in P} for k, ix in bl.items()}

        def stat(ks):
            e = {m: {lv: HU.ets_t(MK.jumlah(cnt[m][lv], ks)) for lv in LV} for m in cnt}
            t = {m: sum(se[k][m] for k in ks) for m in P}
            out = {f"dets_model-{b}_{lv}": e["model"][lv] - e[b][lv] for b in P if b != "model" for lv in LV}
            out.update({f"dbss_model-{b}": (t[b] - t["model"]) / t[acuan] for b in P if b != "model"})
            return out
        titik, r, xs = stat(kunci), random.Random(BIJI), defaultdict(list)
        for _ in range(ulang):
            for k, v in stat([r.choice(kunci) for _ in kunci]).items():
                xs[k].append(v)
        for k in titik:
            v = sorted(xs[k])
            hasil[k][skema] = {"nilai": round(titik[k], 5), "ci": [round(v[int(Q_LO * (ulang - 1))], 5), round(v[int(Q_HI * (ulang - 1))], 5)], "blok": len(bl)}
    for k, d in hasil.items():
        d["nilai"] = d[HU.SKEMA[0]]["nilai"]
        d["ci"] = [min(d[s]["ci"][0] for s in HU.SKEMA), max(d[s]["ci"][1] for s in HU.SKEMA)]
    return dict(hasil)


def vonis_c(k, mde80=None, ets_klim=None):
    """§5.2: LULUS / TIDAK LULUS / TIDAK MEYAKINKAN pada model TAYANG, label y0. '(daya rendah)' bila mde80 > 0,25 x ETS klimatologi."""
    syarat = {"dets_klim_waspada": k["dets_model-klim_waspada"]["ci"][0] > 0, "dets_klim_siaga": k["dets_model-klim_siaga"]["ci"][0] > 0,
              "dbss_klim": k["dbss_model-klim"]["ci"][0] > 0, "dets_lr1_waspada": k["dets_model-lr1_waspada"]["ci"][0] > 0,
              "dbss_lr1": k["dbss_model-lr1"]["ci"][0] > 0, "dets_aturan_waspada": k["dets_model-aturan_waspada"]["ci"][0] > 0,
              "dets_aturan_siaga": k["dets_model-aturan_siaga"]["ci"][0] > 0}
    gagal = k["dets_model-klim_waspada"]["nilai"] <= 0 or k["dets_model-lr1_waspada"]["ci"][1] < 0 or k["dets_model-aturan_waspada"]["ci"][1] < 0
    v = "LULUS" if all(syarat.values()) else "TIDAK LULUS" if gagal else "TIDAK MEYAKINKAN"
    if mde80 is not None and ets_klim and mde80 > 0.25 * ets_klim:
        v += " (daya rendah)"
    return {"vonis": v, "rincian": syarat}


def gerbang_pembekuan(dets_gabungan, dets_lipatan):
    """§4.2: C dihentikan bila dETS(C-klim) Waspada gabungan <= 0 ATAU positif pada < 4 dari 5 lipatan. Hanya bisa menolak."""
    hentikan = dets_gabungan <= 0 or sum(1 for d in dets_lipatan if d > 0) < 4
    return {"hentikan": hentikan, "vonis": "tidak terbukti (tidak layak dibekukan)" if hentikan else "boleh dibekukan"}


# ================================================================== H. kandidat A: ambang pemicu intensitas-durasi (§3.6)
def kuantil_berbobot(nilai, bobot, q):
    """Kuantil bawah berbobot: nilai terkecil dengan bobot kumulatif >= q x total."""
    if not nilai:
        return None
    urut = sorted(zip(nilai, bobot))
    tot, c = sum(b for _, b in urut), 0.0
    for v, b in urut:
        c += b
        if c >= q * tot - 1e-12:
            return v
    return urut[-1][0]


def theta_A(kej, durasi):
    """kej: [(kab, wil, {D: acc_D}, bobot)] hari KEJADIAN tahun latih (TINGGI/SEDANG). -> {D: {kab: theta}} dengan partial pooling §3.6 langkah 2:
    n_k < 5 -> kuantil wilayah sepenuhnya; n_k >= 5 -> (n_k q_k + 5 q_w)/(n_k + 5); wilayah < 5 kejadian -> nasional."""
    out = {}
    for D in durasi:
        nas = kuantil_berbobot([a[D] for _, _, a, _ in kej], [b for *_, b in kej], PERSENTIL_A)
        wil = {}
        for wl in {x[1] for x in kej}:
            s = [x for x in kej if x[1] == wl]
            wil[wl] = kuantil_berbobot([a[D] for _, _, a, _ in s], [b for *_, b in s], PERSENTIL_A) if len(s) >= KUAT_A else nas
        per = {}
        for kab in {x[0] for x in kej}:
            s = [x for x in kej if x[0] == kab]
            wl = s[0][1]
            qk = kuantil_berbobot([a[D] for _, _, a, _ in s], [b for *_, b in s], PERSENTIL_A)
            per[kab] = wil[wl] if len(s) < KUAT_A else (len(s) * qk + KUAT_A * wil[wl]) / (len(s) + KUAT_A)
        out[D] = {"kab": per, "wil": wil, "nas": nas}
    return out


def theta_untuk(th, D, kab, wl):
    t = th[D]
    return t["kab"].get(kab, t["wil"].get(wl, t["nas"]))


def kondisi_s(acc, th, kab, wl, durasi):
    """s(k,e) = jumlah durasi D dengan acc_D >= theta_{k,D}."""
    return sum(1 for D in durasi if theta_untuk(th, D, kab, wl) is not None and acc[D] >= theta_untuk(th, D, kab, wl))


def sel_A(baris, durasi):
    """baris: [(kab, wil, s, a, y, w)] -> peluang terkalibrasi bersarang per sel c=(s,a): p_w(c) = (pos_w(c)+30 r_w)/(hari_w(c)+30); p(k,c) = (pos_k(c)+30 p_w(c))/(hari_k(c)+30).
    Hari TANPA banjir yang melampaui ambang ikut penyebut. -> {'r_w', 'pw', 'pk'} (kunci string)."""
    rw, pos_w, hari_w, pos_k, hari_k = defaultdict(lambda: [0.0, 0.0]), defaultdict(float), defaultdict(float), defaultdict(float), defaultdict(float)
    for kab, wl, s, a, y, w in baris:
        rw[wl][0] += w * y
        rw[wl][1] += w
        pos_w[(wl, s, a)] += w * y
        hari_w[(wl, s, a)] += w
        pos_k[(kab, s, a)] += w * y
        hari_k[(kab, s, a)] += w
    r = {wl: v[0] / v[1] if v[1] else LANTAI_MIN for wl, v in rw.items()}
    pw = {f"{k[0]}|{k[1]}|{k[2]}": (pos_w[k] + HALUS * r[k[0]]) / (hari_w[k] + HALUS) for k in hari_w}
    wl_dari = {kab: wl for kab, wl, *_ in baris}
    pk = {f"{k[0]}|{k[1]}|{k[2]}": (pos_k[k] + HALUS * pw[f"{wl_dari[k[0]]}|{k[1]}|{k[2]}"]) / (hari_k[k] + HALUS) for k in hari_k}
    return {"r_w": r, "pw": pw, "pk": pk}


def p_A(sel, kab, wl, s, a):
    return sel["pk"].get(f"{kab}|{s}|{a}", sel["pw"].get(f"{wl}|{s}|{a}", sel["r_w"].get(wl, LANTAI_MIN)))


def durasi_A(jam_lengkap):
    """Keputusan fallback durasi SEKALI sebelum latih (dicatat di latih.json bagian A_durasi): jam-an lengkap -> D penuh, selain itu {1,24,72} ('24' = hari kalender WIB)."""
    return {"durasi": list(DURASI_PENUH if jam_lengkap else DURASI_CADANGAN), "jam_lengkap": bool(jam_lengkap),
            "catatan": "" if jam_lengkap else "durasi menengah tidak dinilai; 24 jam = hari kalender WIB"}


# ================================================================== I. guard waktu, label, sidik (§4.4, §7)
def pastikan_label_terpotong(tanggal):
    """Tolak tanggal label sesudah LABEL_AKHIR. Dipakai SETIAP jalur yang membentuk label."""
    kd = lambda x: x.date() if isinstance(x, dt.datetime) else x if isinstance(x, dt.date) else dt.date.fromisoformat(str(x)[:10])
    d = [x for x in tanggal if kd(x) > LABEL_AKHIR]
    if d:
        sys.exit(f"label bertanggal sesudah {LABEL_AKHIR} ({len(d)} tanggal, contoh {d[0]}) DILARANG dibaca sebelum sidik di-commit (§4.4)")


def potong_label_tanggal(peta):
    """{kunci: [tanggal]} -> hanya tanggal <= LABEL_AKHIR."""
    return {k: [t for t in v if dt.date.fromisoformat(str(t)[:10]) <= LABEL_AKHIR] for k, v in peta.items()}


def tgl_wib(iso):
    d = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return d.astimezone(WIB).date()


def tanggal_T(repo=None, ref="origin/main", rel=None, lain=()):
    """T = tanggal kalender WIB dari COMMITTER date commit PERTAMA yang memuat baris jenis=sidik di `rel` pada `ref` (bukan author date, bukan HEAD lokal).
    `lain` = tanggal pengunci tambahan (waktu run workflow / push dari `gh api`); T = yang PALING AKHIR. -> date atau None bila belum ada baris sidik."""
    repo, rel = repo or AKAR, rel or os.path.relpath(SIDIK_JEJAK, AKAR)
    r = subprocess.run(["git", "-C", repo, "log", ref, "--reverse", "--format=%H %cI", "--", rel], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"git log {ref} gagal: {r.stderr.strip()[:200]} (jalankan `git fetch` dahulu)")
    for ln in r.stdout.splitlines():
        h, iso = ln.split(" ", 1)
        isi = subprocess.run(["git", "-C", repo, "show", f"{h}:{rel}"], capture_output=True, text=True).stdout
        if any(json.loads(x).get("jenis") == "sidik" for x in isi.splitlines() if x.strip()):
            return max([tgl_wib(iso)] + list(lain))
    return None


def awal_efektif(T):
    return T + dt.timedelta(1)


def gerbang_buka(awal_diminta, T, hari_ini, kering=False):
    """buka menolak bila sidik belum di-commit, bila jendela dimulai pada/sebelum tanggal commit .sidik, atau sebelum label susulan L2 (kecuali --kering)."""
    if T is None:
        sys.exit("baris `sidik` belum ada di origin/main: buka ditolak")
    if awal_diminta <= T:
        sys.exit(f"tanggal commit .sidik ({T}) lebih baru dari awal jendela yang diminta ({awal_diminta}): buka ditolak (awal efektif {awal_efektif(T)})")
    if not kering and hari_ini < BUKA_PALING_CEPAT:
        sys.exit(f"buka paling cepat {BUKA_PALING_CEPAT} (label susulan L2, §5.3d); hari ini {hari_ini}")
    return awal_efektif(T)


def saring_sasaran(tanggal_sasaran, T):
    """indeks baris yang tanggal sasarannya >= T+1 (sisanya dikeluarkan dari penilaian)."""
    a = awal_efektif(T)
    return [i for i, d in enumerate(tanggal_sasaran) if d >= a and d <= PROSPEKTIF_AKHIR]


def tulis_mulai(mode, sidik):
    try:
        fd = os.open(J(mode + ".mulai"), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sys.exit(f"{mode}.mulai sudah ada: sudah dimulai, tidak bisa dijalankan lagi")
    with os.fdopen(fd, "w") as f:
        json.dump({"waktu": dt.datetime.now().isoformat(timespec="seconds"), "sidik": sidik}, f)


def tambal():
    """Konstanta yang dikunci sidik (mutasi TAU/LANTAI/JENDELA/dst. harus mengubah sidik)."""
    return {"LATIH": [LATIH[0], LATIH[-1]], "LIPATAN": LIPATAN, "LABEL_AKHIR": str(LABEL_AKHIR), "TAU_GRID": TAU_GRID, "TAUW_GRID": TAUW_GRID, "TAU_IKLIM": TAU_IKLIM,
            "LANTAI": [LANTAI_MIN, LANTAI_MAK], "HALUS": HALUS, "ETA_JEPIT": ETA_JEPIT, "ITER_MAKS": ITER_MAKS, "TOL": TOL, "JENDELA": JENDELA, "SWI": SWI,
            "SWI_DT": SWI_DT, "CENS": CENS, "A": [PERSENTIL_A, KUAT_A, DURASI_PENUH, DURASI_CADANGAN], "WIL_CALON": WIL_CALON, "SYARAT_WIL": SYARAT_WIL,
            "SETS": SETS, "EKSTENSI": EKSTENSI, "BERLAKU": {k: sorted(v) for k, v in BERLAKU.items()}, "TANPA_P2": sorted(TANPA_P2), "Q": [Q_LO, Q_HI],
            "M": M_KELUARGA, "BIJI": BIJI, "BUKA_PALING_CEPAT": str(BUKA_PALING_CEPAT), "MULAI": MK.MULAI, "AWAL": str(ub.AWAL), "AKHIR": str(ub.AKHIR)}


BERKAS_SIDIK = {   # relatif AKAR; wajib = tanpa itu sidik ditolak; ekstensi = boleh tak ada bila ekstensinya dihapus (dicatat)
    "wajib": ["scripts/banjir/model_kab_campur.py", "scripts/banjir/model_kab_campur_nilai.py", "scripts/banjir/PRAREG-CAMPUR.md", "scripts/banjir/PRAREG-CAMPUR-AMANDEMEN.md", "scripts/banjir/model_kab.py", "scripts/banjir/model_kab2.py",
              "scripts/banjir/model_kab_debit.py", "scripts/banjir/label_bersatu_v2.py", "scripts/banjir/uji_logbook.py", "scripts/banjir/status.py",
              "scripts/banjir/umum.py", "scripts/banjir/uji_balik.py", "data/banjir/kab2_ops/sampel.json", "scripts/banjir/model_kab_hulu.py",
              "scripts/banjir/fitur_banjir.py", "scripts/sebaran/gbdt.py"],
    "ekstensi": ["scripts/banjir/koreksi_bias.py", "public/banjir/data/koreksi_bias.json", "public/data/neraca_air/grace.json", "scripts/banjir/pasang_astro.py",
                 "scripts/air/neraca/deret.py", "data/raw/banjir/model_kab_campur/kedap.json", "data/raw/banjir/q2_pusat/manifest.json", "scripts/banjir/q2_pusat.py", "scripts/banjir/kedap_kab.py", "data/raw/banjir/iklim/oni.ascii.txt", "data/raw/banjir/iklim/dmi.had.long.data",
                 "data/raw/banjir/label_bersatu_v2/kab_hari.csv.gz", "data/raw/banjir/label_bersatu_v2/cakupan_hari.csv.gz", "data/raw/banjir/model_kab_campur/label_latih.json", "data/raw/banjir/model_kab_campur/label_26.json", "data/raw/banjir/dibi_tanggal.json"],
    "label_hidup": ["public/data/logbook_kejadian.json", "public/data/dibi_kejadian.json", "data/raw/banjir/dibi_tanggal.json"]}


def hash_berkas(rel):
    p = os.path.join(AKAR, rel)
    return K2.sha_berkas(p) if os.path.exists(p) else None


def sidik_penuh(kand, hash_fn=None):
    hf = hash_fn or hash_berkas
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "kand": kand, "tambal": tambal()}, sort_keys=True).encode())
    h.update(json.dumps({r: hf(r) for r in BERKAS_SIDIK["wajib"] + BERKAS_SIDIK["ekstensi"]}, sort_keys=True).encode())
    h.update(K2.sumber(UL.label_dari, UL.kode_geo, UL.bersih, UL.pod_kejadian, UL.JENIS_LB, UL.JENIS_DIBI, UL.MAKS_AKTIF, UL.TAHUN0, UL.AWAL, UL.LEVEL).encode())
    h.update(K2.sumber(V2.hari_j3, V2.MIN_GS_KAB_TAHUN).encode())
    if os.path.exists(DERET_BULANAN):
        h.update(hash_potongan(json.load(open(DERET_BULANAN))["kab"]).encode())
    return h.hexdigest()[:16]


def sidik_wajib_ada(hash_fn=None):
    hf = hash_fn or hash_berkas
    hilang = [r for r in BERKAS_SIDIK["wajib"] if hf(r) is None]
    if hilang:
        sys.exit("berkas wajib sidik tidak ada: " + ", ".join(hilang))


# ================================================================== J. data nyata (jalur ekstensi gagal rapi: DataBelumAda)
def jam_hujan(sel):
    """Hujan jam-an ERA5 sel (jam_era5.py, 2015-01-01 00:00 WIB .. 2026-10-18 23:00) -> list mm/jam. Berkas tahun ada yang hilang -> DataBelumAda."""
    import gzip
    out = []
    for y in range(2015, 2027):
        p = os.path.join(JAM_ERA5, "hujan", f"{sel[0]:.3f}_{sel[1]:.3f}", f"{y}.json.gz")
        if not os.path.exists(p):
            raise DataBelumAda(f"hujan jam-an {sel} tahun {y} belum ada ({p}): E_swi dihapus, A jatuh ke D={{1,24,72}}")
        out += json.load(gzip.open(p, "rt"))["p"]
    return out


def sumber_tak_ada(nama, detail):
    raise DataBelumAda(f"{nama}: {detail}")


def baca_iklim():
    po, pd = os.path.join(IKLIM_DIR, "oni.ascii.txt"), os.path.join(IKLIM_DIR, "dmi.had.long.data")
    if not (os.path.exists(po) and os.path.exists(pd)):
        raise DataBelumAda(f"ONI/DMI belum diunduh ke {IKLIM_DIR}: E_iklim dihapus")
    return parse_oni(open(po).read()), parse_dmi(open(pd).read())


def cek_ekstensi():
    """Periksa tiap sumber ekstensi tanpa jaringan -> ({ekstensi: None|alasan}). Dipakai `pemblokir` dan `latih` (ekstensi yang gagal DIHAPUS dan dicatat)."""
    cek = {}

    def coba(nama, f):
        try:
            f()
            cek[nama] = None
        except DataBelumAda as e:
            cek[nama] = str(e)
    coba("E_kedap", lambda: sumber_tak_ada("E_kedap", "kedap.json (kedap_kab.py unduh/hitung) belum ada") if not os.path.exists(J("kedap.json")) else None)
    coba("E_pasang", lambda: sumber_tak_ada("E_pasang", "daftar kab pesisir (latih.json bagian pesisir / pesisir.json) belum ada") if not os.path.exists(J("pesisir.json")) else None)
    coba("E_hulu", lambda: sumber_tak_ada("E_hulu", "CHIRPS hulu (model_kab_hulu/chirps) belum ada") if not os.path.isdir(HU.CHIRPS_DIR) else None)
    coba("E_neraca", lambda: sumber_tak_ada("E_neraca", "deret_bulanan.json belum ada") if not os.path.exists(DERET_BULANAN) else None)
    coba("E_twsa", lambda: sumber_tak_ada("E_twsa", "grace.json belum ada") if not os.path.exists(GRACE) else None)
    coba("E_swi", lambda: [jam_hujan(s) for s in [(-6.125, 106.625)]] and None)
    coba("E_cs", lambda: sumber_tak_ada("E_cs", "angin 10 m ERA5 (jam_era5 angin) belum ada") if not os.path.isdir(os.path.join(JAM_ERA5, "angin")) else None)
    coba("E_iklim", baca_iklim)
    return cek


def pemblokir():
    """Pemblokir 6a-A yang BISA diperiksa kode tanpa label dan tanpa jaringan -> {no: (status, keterangan)}."""
    s = {}
    s[1] = ("manual-latih", "P_w/T_w dihitung `latih`/`baris` dari label v2 (berkas v2 diperlukan)") if not os.path.exists(V2.OUT_KAB) else ("siap", "label v2 ada; jalankan `baris`")
    titik = os.path.join(AKAR, "data/raw/banjir/model_kab_debit/titik.json")
    s[2] = ("siap", "titik latih ada") if os.path.exists(titik) else ("BLOK", "model_kab_debit/titik.json tidak ada: `arsip_debit.py salin-titik` atau Q2 dihitung ulang di pusat sel")
    cek = cek_ekstensi()
    s[3] = ("siap", "jam-an ERA5 tersedia") if cek["E_swi"] is None else ("BLOK", cek["E_swi"])
    s[5] = ("siap", "semua cache ada") if not any(cek[k] for k in ("E_kedap", "E_pasang")) else ("BLOK", "; ".join(str(cek[k]) for k in ("E_kedap", "E_pasang") if cek[k]))
    try:
        K2.peta_kode(json.load(open(SAMPEL))["kab"]) if os.path.exists(os.path.join(AKAR, "public/data/desa_cari.json")) else sumber_tak_ada("peta", "desa_cari.json tidak ada")
        s[6] = ("siap", "peta nama kab -> kode BPS terbentuk (UL.kode_geo)")
    except DataBelumAda as e:
        s[6] = ("BLOK", str(e))
    try:
        sam_ = json.load(open(SAMPEL))
        sk_ = {k: [tuple(x[:2]) for x in v] for k, v in sam_["sk"].items()}
        sel_ = {x for v in sk_.values() for x in v}
        hil = []
        for x in sorted(sel_):
            try:
                cuaca_satu(x)
            except DataBelumAda:
                hil.append(x)
        s[9] = ("siap", f"hujan jam-an + sm: {len(sel_)} sel utuh") if not hil else ("BLOK", f"hujan jam-an + sm belum utuh untuk {len(hil)} dari {len(sel_)} sel (jam_era5.py panen hujan, sm_era5.py panen)")
    except (OSError, KeyError, ValueError) as e:
        s[9] = ("BLOK", f"sampel/ERA5 tak terbaca: {e}")
    s[10] = ("siap", "q2_pusat utuh") if os.path.exists(os.path.join(AKAR, "data/raw/banjir/q2_pusat/manifest.json")) else ("BLOK-ringan", "q2_pusat belum tuntas: q_q2/q_ant/dq/qa dicopot dari model tayang (A-11)")
    s[7] = ("siap", "guard terpasang (uji: pastikan_label_terpotong, gerbang_buka)")
    s[8] = ("BLOK" if cek["E_cs"] else "siap", cek["E_cs"] or "angin ada")
    return s, cek


GEO_KAB = os.path.join(AKAR, "public/geo/kabupaten")
PESISIR_AMBANG_KM = 5.0          # tepi luar >= 5 km (setelah buang batas negara darat) = menyentuh garis pantai
SNAP_DESIMAL = 4                 # simpul dibulatkan 1e-4 derajat (~11 m) agar tepi bersama antar-kab terpasang
BATAS_NEGARA = [   # (awalan provinsi, lon_min, lon_maks, lat_min, lat_maks): tepi luar di kotak ini dianggap batas darat, bukan pantai
    (("61",), 109.4, 114.5, 0.8, 2.3),       # Kalbar-Sarawak (pantai Sambas lon < 109,4 tetap dihitung)
    (("64", "65"), 114.0, 117.3, 0.8, 4.6),  # Kaltim/Kaltara-Sabah/Sarawak (pantai timur Tarakan lon > 117,3 tetap)
    (("91", "92", "93", "94", "95", "96"), 140.98, 141.02, -9.2, -2.5),   # Papua-PNG di bujur 141
    (("53",), 124.0, 127.0, -9.6, -9.1)]     # NTT-Timor Leste: PERKIRAAN kasar, kab terdampak ditampilkan untuk ditinjau


def km_tepi(a, b):
    return math.hypot((b[0] - a[0]) * 111.32 * math.cos(math.radians((a[1] + b[1]) / 2)), (b[1] - a[1]) * 110.57)


def tepi_luar(fitur, desimal=None):
    """fitur: [(kunci 'pp|Nama', geometry)] -> {kunci: (km tepi luar, km tepi luar di batas negara)}. Tepi luar = segmen yang HANYA dipakai satu poligon
    satu kali (setelah snapping simpul); segmen di kotak BATAS_NEGARA dihitung terpisah."""
    n = SNAP_DESIMAL if desimal is None else desimal
    pakai = defaultdict(list)
    for kunci, g in fitur:
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for poly in polys:
            for ring in poly:
                for a, b in zip(ring, ring[1:]):
                    ea, eb = (round(a[0], n), round(a[1], n)), (round(b[0], n), round(b[1], n))
                    if ea != eb:
                        pakai[tuple(sorted((ea, eb)))].append(kunci)
    out = {k: [0.0, 0.0] for k, _ in fitur}
    for e, ks in pakai.items():
        if len(ks) != 1:
            continue
        k, mx, my = ks[0], (e[0][0] + e[1][0]) / 2, (e[0][1] + e[1][1]) / 2
        neg = any(k.split("|", 1)[0] in pv and x0 <= mx <= x1 and y0 <= my <= y1 for pv, x0, x1, y0, y1 in BATAS_NEGARA)
        out[k][1 if neg else 0] += km_tepi(*e)
    return {k: (v[0], v[1]) for k, v in out.items()}


def susun_pesisir(tulis=True):
    """pesisir.json: kab (poligon nasional public/geo/kabupaten) dengan tepi luar >= PESISIR_AMBANG_KM. Dikunci di latih.json oleh latih_nyata."""
    fitur = []
    for f in sorted(os.listdir(GEO_KAB)):
        for ft in json.load(open(os.path.join(GEO_KAB, f)))["features"]:
            fitur.append((f"{f[:-5]}|{ft['properties']['kab']}", ft["geometry"]))
    tl = tepi_luar(fitur)
    sam = json.load(open(SAMPEL))["kab"]
    pes = sorted(k for k, (a, _) in tl.items() if a >= PESISIR_AMBANG_KM)
    out = {"metode": f"tepi poligon yang dipakai satu kab saja (simpul dibulatkan {SNAP_DESIMAL} desimal) dikurangi kotak BATAS_NEGARA; pesisir bila >= {PESISIR_AMBANG_KM} km",
           "sumber": "public/geo/kabupaten/*.json", "sha256_sumber": hashlib.sha256(b"".join(open(os.path.join(GEO_KAB, f), "rb").read() for f in sorted(os.listdir(GEO_KAB)))).hexdigest(),
           "batas_negara": BATAS_NEGARA, "n_kab": len(tl), "n_pesisir": len(pes), "pesisir": pes, "km": {k: [round(a, 1), round(b, 1)] for k, (a, b) in tl.items()},
           "sampel": {"n": len(sam), "pesisir": [k for k in sam if k in pes], "n_pesisir": sum(1 for k in sam if k in pes), "tidak_terpetakan": [k for k in sam if k not in tl]},
           "terdampak_batas_negara": sorted(k for k, (a, b) in tl.items() if b > 0 and a < PESISIR_AMBANG_KM <= a + b)}
    if tulis:
        os.makedirs(KELUAR, exist_ok=True)
        json.dump(out, open(J("pesisir.json"), "w"), separators=(",", ":"))
    return out


def baris():
    """Hitung kab, baris, wilayah (tanpa skor); label hanya sampai LABEL_AKHIR."""
    sam = json.load(open(SAMPEL))
    K2.pasang()
    D = K2.data_latih(sam, tulis=False)
    TR = D["TR"]
    g = gabung_wilayah(TR["kab"], TR["tahun"], TR["y"], TR["w"], set(LATIH))
    print(f"kab {len(D['kabs'])}, sel {len(D['sel'])}; baris latih {len(TR['y'])}, positif {sum(TR['y'])}")
    print("wilayah:", json.dumps(g["rincian"]), "->", json.dumps(g["peta"]), "cw_sekunder:", g["cw_sekunder"])


TABEL_BUKA = [   # §5.1 tatapan atas 2024-2025 (11); baris dengan tanda tanggal BELUM DICEK diambil apa adanya dari dokumen
    (1, "~19 Okt 2026 (BELUM DICEK)", "ambang_wilayah / uji_balik aturan status.py", "2022-2025"), (2, "29 Okt", "model_kab buka (TIDAK LULUS)", "2024-2025"),
    (3, "30 Okt", "model_dampak buka", "2024-2026-09-30"), (4, "30 Okt", "DEBIT latih (validasi dibaca)", "2024-2025"), (5, "1 Nov", "HULU latih (3 kali, A1)", "2024-2025"),
    (6, "1 Nov", "TANAH latih", "2024-2025"), (7, "1 Nov", "KAB2 latih LOYO dan uji26", "2016-2025; 2026-01..10-18"), (8, "1 Nov", "uji_logbook arsip 2022-2025 dan 2026", "2022-2026"),
    (9, "2 Nov", "GRRR sia/buka", "2024-2025"), (10, "2 Nov", "GloFAS+MCDWD uji ulang", "2024-2026"), (11, "1 Nov 21:11", "ambang_persentil buka (commit 0fba84ac)", "2024-2025 (+2026)")]


def daftar_buka(tulis=False):
    """§5.1: daftar tatapan atas 2024-2025 = tabel dokumen + baris sia/buka/uji26/latih dari tiap scripts/banjir/*.sidik. m = jumlah baris tabel (harus 11)."""
    import glob
    kutip = {}
    for f in sorted(glob.glob(os.path.join(AKAR, "scripts/banjir/*.sidik"))):
        rows = []
        for ln in open(f):
            try:
                b = json.loads(ln)
            except ValueError:
                continue
            if b.get("jenis") in ("sia", "buka", "buka_mulai", "uji26", "latih", "segel", "sidik"):
                rows.append({k: b.get(k) for k in ("jenis", "waktu", "sidik") if k in b})
        kutip[os.path.basename(f)] = rows
    out = {"tabel": [dict(zip(("no", "tanggal", "uji", "periode"), r)) for r in TABEL_BUKA], "jumlah": len(TABEL_BUKA), "m_konsisten": len(TABEL_BUKA) == M_KELUARGA - 3,
           "sidik": kutip}
    if tulis:
        os.makedirs(KELUAR, exist_ok=True)
        json.dump(out, open(J("daftar_buka.json"), "w"), separators=(",", ":"))
    return out


def B_dari(ctx, rows, ye="ye"):
    T = ctx.T
    return {"kab": [T["kab"][i] for i in rows], "tahun": [T["tahun"][i] for i in rows], "bulan": [T["bulan"][i] for i in rows], "e": [T["e"][i] for i in rows],
            "y": [T[ye][i] for i in rows], "level": [T["level"][i] for i in rows]}


def kontrol_peka_label(ctx, cfg, tahun_uji):
    """§5.3: K1 = latih y=DIBI saja (bobot 1 pada baris berlabel), evaluasi DIBI; K2 = latih v2 berbobot, evaluasi DIBI. Resep, tau, set sama.
    -> {K1: {rows, p, klim, y}, K2: ...}; pemanggil menghitung dETS(model-klim) dengan boot_c pada label DIBI."""
    T = ctx.T
    k1 = Konteks({**T, "y": list(T["y_dibi"]), "w": [1.0 if w > 0 else 0.0 for w in T["w"]]}, ctx._bangun, ctx.wilayah, ctx.X_lr1, ctx.tersedia)
    k2 = ctx
    out = {}
    for nm, c in (("K1", k1), ("K2", k2)):
        rows, p = lipat(c, cfg, tahun_uji)
        _, pk = lipat(c, cfg_dari(c, [], cfg["tau"], None), tahun_uji)
        out[nm] = {"rows": rows, "p": p, "klim": pk, "y": [T["y_dibi"][i] for i in rows]}
    return out


def potong_sumber_label(lb, dibi):
    """Buang entri label bertanggal > LABEL_AKHIR SEBELUM diproses (logbook: mulai; DIBI: tanggal)."""
    f = lambda t: str(t)[:10] <= str(LABEL_AKHIR)
    return [e for e in lb if f(e["mulai"])], [e for e in dibi if f(e["tanggal"])]


AKHIR_DATA = dt.date(2026, 10, 18)             # akhir hujan jam-an jam_era5.py; hari terakhir yang bisa dinilai = AKHIR_DATA - 2 (butuh e+1 dan cadangan)
SM_ERA5 = os.path.join(AKAR, "data/raw/banjir/sm_era5")


def harian_dari_jam(jam):
    """Hujan jam-an (mm/jam, mulai 2015-01-01 00:00 WIB) -> (p harian WIB, imax = maks jam per hari WIB) sejak ub.AWAL. Identik dengan cache uji_balik
    (selisih 0 pada sel yang ada di keduanya; hari dengan jam None dihitung 0 untuk p dan dilewati untuk im)."""
    d0 = (ub.AWAL - dt.date(2015, 1, 1)).days
    p, im = [], []
    for d in range(d0, len(jam) // 24):
        h = jam[24 * d:24 * d + 24]
        v = [x for x in h if x is not None]
        p.append(sum(v))
        im.append(max(v) if v else None)
    return p, im


def cuaca_satu(s):
    """{p, im, sm} sel s dari ub.AWAL sampai AKHIR_DATA: p/im dari jam-an, sm dari cache uji_balik (<= ub.AKHIR) + sm_era5 (sisanya). Data hilang -> DataBelumAda."""
    import gzip
    p, im = harian_dari_jam(jam_hujan(s))
    ke = os.path.join(SM_ERA5, f"{s[0]:.3f}_{s[1]:.3f}.json.gz")
    if not os.path.exists(ke):
        raise DataBelumAda(f"sm_era5 sel {s} belum diunduh ({ke}): `sm_era5.py panen`")
    ext = json.load(gzip.open(ke, "rt"))
    sm = (ub.deret(json.load(gzip.open(ub.jalur(*s), "rt")))["sm"] if os.path.exists(ub.jalur(*s)) else []) + ext["sm"]
    if os.path.exists(ub.jalur(*s)) and ext["awal"] != str(ub.AKHIR + dt.timedelta(1)):
        raise DataBelumAda(f"sm_era5 sel {s} mulai {ext['awal']}, harus {ub.AKHIR + dt.timedelta(1)}")
    n = (AKHIR_DATA - ub.AWAL).days + 1
    if min(len(p), len(sm)) < n:
        raise DataBelumAda(f"deret sel {s} pendek: p {len(p)}, sm {len(sm)}, perlu {n}")
    return {"p": p[:n], "im": im[:n], "sm": sm[:n]}


def konteks_nyata(kering=False):
    """Adaptor data nyata: tabel kab-hari 2016-2026-10-16 (semua hari; w>0 hanya baris latih berlabel v2), fitur berstatistik tahun-acuan,
    label eval gab_mulai (ye) dan DIBI (y_dibi). Fitur tanpa data (q_*, hx, qa, pa, hu3, kd, swi, cs) TIDAK masuk `tersedia` (dihapus, dicatat).
    Hujan: jam-an ERA5 (jam_era5.py) -> p/imax harian; sm: cache uji_balik + sm_era5. Tanpa itu: kering memakai cache uji_balik apa adanya (tanpa 2026)."""
    K2.pasang()
    sam = json.load(open(SAMPEL))
    kabs, sk = K2.sk_dari(sam)
    sel_semua = sorted({x for k in kabs for x in sk[k]})
    cu, alasan = {}, None
    for x in sel_semua:
        try:
            cu[x] = cuaca_satu(x)
        except DataBelumAda as e:
            alasan = alasan or str(e)
    lengkap = [k for k in kabs if all(x in cu for x in sk[k])]
    ada26 = bool(lengkap)
    if len(lengkap) < len(kabs):
        if not kering:
            raise DataBelumAda(f"{len(kabs) - len(lengkap)} dari {len(kabs)} kab belum punya hujan jam-an + sm lengkap: {alasan}")
        if not lengkap:                                      # dry-run tanpa jam-an: cache uji_balik apa adanya, 2016-2025
            lengkap = [k for k in kabs if all(os.path.exists(ub.jalur(*x)) for x in sk[k])]
        kabs = lengkap
    sel = sorted({x for k in kabs for x in sk[k]})
    dibi = [r for r in json.load(open(K2.DIBI_TGL)) if r[3] <= "2025-12-31"]
    cuaca = {x: cu[x] for x in sel} if ada26 else MK.muat_cuaca(sel)
    pers = MK.persentil_batas(cuaca)
    penuh, eks = MK.frekuensi(ub.peristiwa(dibi), kabs, MK.laju_awal(dibi, kabs))
    Bs = [MK.bangun(cuaca, sk, kabs, {"banjir": {}, "longsor": {}}, LATIH, pers, penuh, eks)]
    if ada26:
        with HU.tambal_ub(akhir=AKHIR_DATA):
            B6 = MK.bangun(cuaca, sk, kabs, {"banjir": {}, "longsor": {}}, range(2026, 2027), pers, penuh, {})
        lo, hi = ub.hari_ke(dt.date(2026, 1, 1)), ub.hari_ke(LABEL_AKHIR)
        ix6 = [i for i, e in enumerate(B6["e"]) if lo <= e <= hi]
        Bs.append({k: [v[i] for i in ix6] for k, v in B6.items()})
    B = {k: sum((b[k] for b in Bs), []) for k in Bs[0]}
    n = len(B["e"])
    tgl = [K2.tgl_e(e) for e in B["e"]]
    pastikan_label_terpotong(tgl)
    # label v2 (latih) dan label eval. kering=True: dry-run adaptor TANPA label v2 dan TANPA berkas label hidup (proksi DIBI <= 2025 dari dibi_tanggal.json)
    tl = {(f"{p_}|{n_}", dt.date.fromisoformat(t)) for jenis, p_, n_, t, v_ in dibi if v_ >= 1 and {"banjir", "bandang"} & set(jenis) and f"{p_}|{n_}" in set(kabs)}
    if kering:
        labv2 = {(k, d): ((1, 1.0) if (k, d) in tl else (0, 1.0)) for k in kabs for d in K2.hari_latih()}
        st, gab, dibi_set = {"proksi": "DRY-RUN: DIBI <= 2025 sebagai pengganti label v2"}, set(tl), set(tl)
    else:
        baris_, pb = K2.baca_v2()
        labv2, st = K2.label_kab(baris_, pb, V2.hari_j3(), set(kabs), K2.hari_latih())
        lb_, db_ = potong_sumber_label(json.load(open(UL.LB))["kejadian"], json.load(open(UL.DIBI))["kejadian"])
        ke = {v: k for k, v in K2.peta_kode(kabs).items()}
        lab_e, _ = UL.label_dari(lb_, db_, akhir=LABEL_AKHIR)
        jadi = lambda nm: {(ke[k], UL.AWAL + dt.timedelta(i)) for k, v in lab_e[nm].items() if k in ke for i in v}
        gab, dibi_set = jadi("gab_mulai") | tl, jadi("dibi") | tl            # A-8: DIBI <= 2025 dari dibi_tanggal.json (berkas publik hanya memuat 2025+)
    pastikan_label_terpotong([d for _, d in gab | dibi_set])
    T = {"kab": B["kab"], "tahun": B["tahun"], "bulan": B["bulan"], "e": B["e"], "level": B["level"], "uji": [], "y": [], "w": [], "ye": [], "y_dibi": []}
    for k, d, th in zip(B["kab"], tgl, B["tahun"]):
        yw = labv2.get((k, d))
        T["y"].append(yw[0] if yw else 0); T["w"].append(yw[1] if yw and th < 2026 else 0.0)
        T["ye"].append(int((k, d) in gab)); T["y_dibi"].append(int((k, d) in dibi_set))
        T["uji"].append(bool(yw) if th < 2026 else True)
    for i in range(n):
        if T["tahun"][i] == 2026:
            T["y"][i] = T["ye"][i]
    gw = gabung_wilayah(T["kab"], T["tahun"], T["y"], T["w"], set(LATIH))
    T["wil"] = [wil_dari_kab(k, gw["peta"]) for k in T["kab"]]
    wilayah = sorted(set(T["wil"]))
    # fitur per sel: seri harian, batas persentil berstatistik `acuan`
    hari = [e for e in sorted(set(B["e"]))]
    with HU.tambal_ub(akhir=AKHIR_DATA if ada26 else ub.AKHIR):
        seri = {s: MK.seri_sel(cuaca[s], MK.hari_tahun(range(2016, 2027 if ada26 else 2026))) for s in sel}
    kabsel = {k: list(sk[k]) for k in kabs}
    tahun_e = {e: MK.tahun_dari(e) for e in seri[sel[0]]}
    p7 = {s: {e: sum(cuaca[s]["p"][e + JENDELA["p_ant"][0]:e + JENDELA["p_ant"][1] + 1]) for e in seri[s]} for s in sel}
    kode_kab = K2.peta_kode(kabs)
    neraca = json.load(open(DERET_BULANAN))["kab"] if os.path.exists(DERET_BULANAN) else None
    grace = json.load(open(GRACE)) if os.path.exists(GRACE) else None
    try:
        oni_d, dmi_d = baca_iklim()
    except DataBelumAda:
        oni_d = dmi_d = None
    tersedia = set(S0) | {"p_ant"} | ({"sa"} if neraca else set()) | ({"twsa"} if grace else set()) | ({"oni", "dmi"} if oni_d else set())
    # anomali sm di SEMUA kab-hari (bukan hanya baris berlabel) dipetakan ke baris

    def bangun(acuan):
        bs = {}
        for s in sel:
            bs[s] = (batas_acuan([seri[s][e]["h3"] for e in seri[s]], [tahun_e[e] for e in seri[s]], acuan),
                     batas_acuan([p7[s][e] for e in seri[s]], [tahun_e[e] for e in seri[s]], acuan))
        pers_h3 = [max(pers_dari(bs[s][0], seri[s][e]["h3"]) for s in kabsel[k]) for k, e in zip(B["kab"], B["e"])]
        p_ant = [max(pers_dari(bs[s][1], p7[s][e]) for s in kabsel[k]) for k, e in zip(B["kab"], B["e"])]
        h3 = [max(seri[s][e]["h3"] for s in kabsel[k]) for k, e in zip(B["kab"], B["e"])]
        imax = [max(seri[s][e]["imax"] for s in kabsel[k]) for k, e in zip(B["kab"], B["e"])]
        sm = [max(seri[s][e]["sm"] for s in kabsel[k]) for k, e in zip(B["kab"], B["e"])]
        zsm = anomali_kb(sm, T["kab"], T["bulan"], T["tahun"], T["wil"], acuan)     # ponytail: dari baris tabel (semua hari ERA5 di sampel), per kab-bulan
        F = {"pers_h3": pers_h3, "lh3": [math.log1p(v) for v in h3], "limax": [math.log1p(v) for v in imax], "sm": sm,
             "h3_sm": [p * z for p, z in zip(pers_h3, zsm)], "p_ant": p_ant}
        if neraca:
            F["sa"] = [None] * n
            for k in set(T["kab"]):
                kd = (kode_kab.get(k) or "").replace(".", "")
                if kd in neraca:
                    ds = dict(zip(neraca[kd]["bulan"], neraca[kd]["S"]))
                    for i in range(n):
                        if T["kab"][i] == k and T["wil"][i] == "Jawa":
                            F["sa"][i] = sa_neraca(ds, T["tahun"][i], T["bulan"][i], acuan)
        if grace:
            F["twsa"] = [None] * n
            for i in range(n):
                kd = (kode_kab.get(T["kab"][i]) or "").replace(".", "")
                if kd in grace["kab"] and T["wil"][i] == "Jawa":
                    F["twsa"][i] = twsa_fitur(grace["kab"][kd]["tws_cm"], grace["meta"]["waktu"], T["tahun"][i], T["bulan"][i], acuan)
        if oni_d:                                            # E_iklim: indeks bulan b-3 (ONI) dan b-6 (DMI); murni fungsi bulan, tak bergantung acuan
            F["oni"] = [iklim_lag(oni_d, T["tahun"][i], T["bulan"][i], "oni_lag") for i in range(n)]
            F["dmi"] = [iklim_lag(dmi_d, T["tahun"][i], T["bulan"][i], "dmi_lag") for i in range(n)]
        return F
    X = [[B["X"][i][j] for j in K2.AKTIF] for i in range(n)]
    ctx = Konteks(T, bangun, wilayah, X_lr1=X, tersedia=tersedia)
    ctx.wilayah_info = gw
    ctx.catatan = {"era5_2026": ada26, "tersedia": sorted(tersedia), "label_v2": st, "tanpa_data": sorted(set(URUT_FITUR) - tersedia)}
    return ctx


def dry_run_nyata():
    """`latih --nyata-kering`: adaptor data nyata end-to-end TANPA menulis apa pun, TANPA label v2, TANPA berkas label hidup (proksi DIBI <= 2025), TANPA sidik.
    Mencetak waktu, baris per wilayah, P_w/T_w (proksi), fitur tersedia/dihapus, dan satu pencocokan model S0(+p_ant,sa,twsa) pada 2016-2021."""
    import time
    t0 = time.time()
    ctx = konteks_nyata(kering=True)
    print(f"adaptor: {ctx.n} baris, {len(set(ctx.T['kab']))} kab, {time.time() - t0:.0f} dtk; tersedia {sorted(ctx.tersedia)}; tanpa data {ctx.catatan['tanpa_data']}")
    T = ctx.T
    for wl in ctx.wilayah:
        ix = [i for i in range(ctx.n) if T["wil"][i] == wl]
        lat = [i for i in ix if T["w"][i] > 0]
        print(f"  {wl}: baris {len(ix)}, latih {len(lat)}, positif proksi {sum(T['y'][i] for i in lat)}")
    print("  P_w/T_w (proksi DIBI, BUKAN label v2):", json.dumps({c: (v["P_w"], v["T_w"], v["lolos"]) for c, v in ctx.wilayah_info["rincian"].items()}))
    nm = [f for f in ("pers_h3", "lh3", "limax", "sm", "h3_sm", "p_ant") if f in ctx.tersedia]
    t1 = time.time()
    F = ctx.F(frozenset(range(2016, 2022)))
    print(f"fitur acuan 2016-2021: {len(F)} kolom, {time.time() - t1:.0f} dtk; hilang per kolom: {json.dumps({k: sum(v is None for v in c) for k, c in F.items()})}")
    t2 = time.time()
    mod = cocok(ctx, frozenset(range(2016, 2022)), cfg_dari(ctx, nm, 0.1, 0.05))
    print(f"cocok S0+p_ant 2016-2021: {mod['n_latih']} baris latih, iter {mod['iter']}, koef wilayah pertama {[round(c, 3) for c in mod['koef'][0]]}, {time.time() - t2:.0f} dtk")
    print(f"dry-run OK ({time.time() - t0:.0f} dtk total); tidak menulis apa pun")


def tambah_jejak(baris_):
    with open(SIDIK_JEJAK, "a") as f:
        f.write(json.dumps(baris_, sort_keys=True) + "\n")


def skor_lipatan(ctx, cfg, tahun_uji):
    """-> (B, P, alarm) satu lipatan: model, klim (Platt), lr1, aturan (laju level latih); alarm = jumlah Waspada/Siaga status.py."""
    rows, p = lipat(ctx, cfg, tahun_uji)
    _, pk = p_klimatologi(ctx, tahun_uji)
    _, pl = p_lr1(ctx, tahun_uji) if ctx.X_lr1 else (rows, pk)
    T, acu = ctx.T, set(t for t in LATIH if t < tahun_uji)
    lat = [i for i in range(ctx.n) if T["tahun"][i] in acu and T["w"][i] > 0]
    lr_ = [(sum(T["w"][i] * T["y"][i] for i in lat if T["level"][i] == l) + 0.5) / (sum(T["w"][i] for i in lat if T["level"][i] == l) + 1) for l in range(4)]
    B = B_dari(ctx, rows)
    P = {"model": p, "klim": pk, "lr1": pl, "aturan": [lr_[l] for l in B["level"]]}
    ns = {lv: sum(1 for l in B["level"] if l >= L) for lv, L in MK.LEVEL_ALARM.items()}
    al = {"aturan": {lv: [l >= L for l in B["level"]] for lv, L in MK.LEVEL_ALARM.items()},
          **{m: {lv: MK.alarm_sebanyak(P[m], ns[lv]) for lv in ns} for m in ("model", "klim", "lr1")}}
    return B, P, al, ns


def gerbang_lipatan(ctx, cfg, ulang=None):
    """Lima lipatan F1-F5: dETS(C-klim) Waspada titik per lipatan + gabungan (bootstrap blok) -> keputusan gerbang pembekuan §4.2."""
    per, gab = [], None
    for f in (1, 2, 3, 4, 5):
        B, P, al, ns = skor_lipatan(ctx, cfg, LIPATAN[f])
        k = boot_c(B, al, P, ulang=ulang if ulang is not None else 200)["dets_model-klim_waspada"]
        per.append(k["nilai"])
        gab = B if gab is None else {kk: gab[kk] + B[kk] for kk in gab}
    return per, gab


def latih_nyata(ulang=False):
    """Latih nyata: wilayah -> latih.json bagian wilayah SEBELUM pemilihan; pemilihan F1-F4; model penuh dan tayang; gerbang pembekuan; kandidat.json + jejak."""
    if os.path.exists(J("kandidat.json")) and not ulang:
        sys.exit("kandidat.json sudah ada: latih ulang butuh --ulang")
    ctx = konteks_nyata()
    os.makedirs(KELUAR, exist_ok=True)
    pes = json.load(open(J("pesisir.json"))) if os.path.exists(J("pesisir.json")) else None
    json.dump({"wilayah": ctx.wilayah_info, "catatan": ctx.catatan, "A_durasi": durasi_A(False),
               "pesisir": pes and {k: pes[k] for k in ("metode", "sha256_sumber", "n_pesisir", "sampel", "pesisir")}}, open(J("latih.json"), "w"), separators=(",", ":"))
    daftar_buka(tulis=True)
    pil = pilih_semua(ctx, evaluator(ctx), ctx.wilayah_info["urutan"], ctx.wilayah_info["cw_sekunder"])
    cfg = {"tau": pil["tau"], "tau_w": pil["tau_w"], "set": pil["set"]}
    cfg_tayang = {**cfg, "set": {wl: [f for f in fs if f not in TANPA_P2] for wl, fs in pil["set"].items()}}
    per, _ = gerbang_lipatan(ctx, cfg_tayang)
    g = gerbang_pembekuan(sum(per) / len(per), per)
    acu = frozenset(LATIH)
    def ser(kp):
        return {"model": kp["model"], "platt": kp["platt"]}
    kand = {"versi": "model-kab-campur-1", "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "pilihan": pil, "gerbang_pembekuan": g, "dets_lipatan": per,
            "penuh": ser(cocok_penuh(ctx, acu, cfg)), "tayang": ser(cocok_penuh(ctx, acu, cfg_tayang)), "sidik_kriteria": hashlib.sha256(json.dumps(KRITERIA, sort_keys=True).encode()).hexdigest()[:16]}
    if g["hentikan"]:
        json.dump(kand, open(J("kandidat_dihentikan.json"), "w"), separators=(",", ":"))
        sys.exit(f"gerbang pembekuan: {g['vonis']}; sidik tidak ditulis, tidak ada prospektif")
    kand["sidik"] = sidik_penuh({k: v for k, v in kand.items() if k != "sidik"})
    json.dump(kand, open(J("kandidat.json"), "w"), separators=(",", ":"))
    tambah_jejak({"jenis": "latih", "waktu": kand["dibuat"], "sidik": kand["sidik"]})
    print("kandidat.json ditulis; lanjut `sidik`, lalu COMMIT model_kab_campur.sidik + kode")


def sidik():
    kp = J("kandidat.json")
    if not os.path.exists(kp):
        sys.exit("kandidat.json belum ada: jalankan `latih`")
    kand = json.load(open(kp))
    if kand["sidik"] != sidik_penuh({k: v for k, v in kand.items() if k != "sidik"}):
        sys.exit("sidik berubah sejak `latih`: ditolak")
    sidik_wajib_ada()
    tambah_jejak({"jenis": "sidik", "sidik": kand["sidik"], "waktu": dt.datetime.now(WIB).isoformat(timespec="seconds"),
                  "awal_prospektif": str(awal_efektif(dt.datetime.now(WIB).date())), "sha256_label_hidup": {r: hash_berkas(r) for r in BERKAS_SIDIK["label_hidup"]}})
    print("sidik ditulis; COMMIT lalu push ke origin/main; T = tanggal commit pertama yang memuat baris sidik")


# ================================================================== K. data sintetis (uji dan `latih --kering`)
def sintetis(seed=5, kab_per_prov=(("11", 4), ("32", 6), ("61", 3), ("51", 3), ("71", 2)), hari_per_tahun=36, sinyal=1.2):
    """Konteks sintetis 2016-2026 (TANPA label nyata) dengan sinyal hujan nyata pada pers_h3."""
    r = random.Random(seed)
    T = {k: [] for k in ("kab", "wil", "tahun", "bulan", "e", "y", "w", "ye", "uji", "level", "y_dibi")}
    h3, imax, sm, q3 = [], [], [], []
    kabs = [f"{p}|k{i}" for p, n in kab_per_prov for i in range(n)]
    peta = {c: c for c in WIL_CALON}
    for kab in kabs:
        base = r.uniform(-0.3, 0.3)
        for t in range(2016, 2027):
            for d in range(hari_per_tahun):
                b = 1 + (d * 7) % 12
                e = (t - 2016) * 366 + d * 9 + int(kab.split("k")[1])
                x = r.gammavariate(1.2, 12) * (1.6 if b in (11, 12, 1, 2, 3) else 0.6)
                T["kab"].append(kab); T["wil"].append(PENAMPUNG if prov_dari(kab) in ("71",) else calon_dari(prov_dari(kab)))
                T["tahun"].append(t); T["bulan"].append(b); T["e"].append(e)
                h3.append(x); imax.append(x * r.uniform(0.1, 0.4)); sm.append(0.3 + 0.1 * r.random() + 0.002 * x); q3.append(math.log1p(x * r.uniform(0.5, 2)))
                p = sig(-4.2 + base + (0.55 if b in (11, 12, 1, 2, 3) else 0) + sinyal * (min(x, 120) - 20) / 30)
                y = 1 if r.random() < p else 0
                T["y"].append(y); T["ye"].append(y); T["y_dibi"].append(1 if (y and r.random() < 0.7) else 0); T["w"].append(1.0 if t < 2026 else 0.0); T["uji"].append(True)
                T["level"].append(2 if x > 70 else 1 if x > 35 else 0)
    n = len(T["y"])
    kab_i = defaultdict(list)
    for i, k in enumerate(T["kab"]):
        kab_i[k].append(i)

    def bangun(acuan):
        pers, lh3, limax, zsm = [0.0] * n, [None] * n, [None] * n, None
        for k, ix in kab_i.items():
            bt = batas_acuan([h3[i] for i in ix], [T["tahun"][i] for i in ix], acuan)
            for i in ix:
                pers[i] = pers_dari(bt, h3[i])
        lh3 = [math.log1p(v) for v in h3]
        limax = [math.log1p(v) for v in imax]
        zsm = anomali_kb(sm, T["kab"], T["bulan"], T["tahun"], T["wil"], acuan, minimal=5)
        h3sm = [p * z for p, z in zip(pers, zsm)]
        q2 = {k: q2_per_sel([math.expm1(q3[i]) for i in ix], [T["tahun"][i] for i in ix], acuan, median_min=0.0) for k, ix in kab_i.items()}
        qq = [q_q2_fitur(q3[i], q2[T["kab"][i]]) for i in range(n)]
        return {"pers_h3": pers, "lh3": lh3, "limax": limax, "sm": list(sm), "h3_sm": h3sm, "q_q2": qq}
    X = [[h3[i], imax[i], sm[i], math.sin(T["bulan"][i]), math.cos(T["bulan"][i])] for i in range(n)]
    return Konteks(T, bangun, sorted(set(T["wil"])), X_lr1=X, tersedia=set(S1)), peta


def latih_kering():
    """`latih --kering`: alur penuh pada data SINTETIS (tanpa data nyata, tanpa tulis ke KELUAR): wilayah, pemilihan tau/tau_w/set, lipatan, Platt bersarang."""
    ctx, _ = sintetis(hari_per_tahun=24, kab_per_prov=(("11", 3), ("32", 4), ("61", 3)))
    ev = evaluator(ctx)
    pil = pilih_semua(ctx, ev, [w for w in ctx.wilayah])
    print("kering: tau", pil["tau"], "tau_w", pil["tau_w"], "set", {w: len(s) for w, s in pil["set"].items()})
    rows, p = lipat(ctx, cfg_dari(ctx, pil["set"][ctx.wilayah[0]], pil["tau"], pil["tau_w"], pil["set"]), LIPATAN[4])
    print(f"kering: lipatan F4 {len(rows)} baris, peluang rerata {sum(p) / len(p):.4f}, laju {sum(ctx.T['ye'][i] for i in rows) / len(rows):.4f}")
    print("kering OK: tidak menyentuh data nyata dan tidak menulis apa pun")


# ================================================================== L. swauji
def _tolak(f, frag):
    try:
        f()
    except SystemExit as e:
        pesan = getattr(e, "pesan", None) or str(e)
        assert frag in pesan, (frag, pesan)
        return
    except Exception as e:     # DataBelumAda, ValueError
        assert frag in str(e), (frag, str(e))
        return
    raise AssertionError(f"harus ditolak: {frag}")


def _rnd_data(r, n, m, bobot=False):
    X = [[r.gauss(0, 1) for _ in range(m)] for _ in range(n)]
    return X, [r.random() < 0.3 for _ in range(n)]


def uji():
    global TAU_GRID, LANTAI_MIN, JENDELA, ITER_MAKS
    r = random.Random(7)
    # 1. penyelesai (i): tanpa fitur p = p0 persis; (ii) tau -> 0 beta -> 0; (iv) koefisien sebenarnya negatif -> 0; (iii) cocok latih_lr; tanda >= 0
    n = 600
    ctx0, _ = sintetis(kab_per_prov=(("11", 2), ("32", 2)), hari_per_tahun=12)
    kp0 = cocok_penuh(ctx0, frozenset(range(2016, 2024)), cfg_dari(ctx0, [], 0.1, None))
    rows0 = baris_uji(ctx0, 2024)
    assert kp0["model"]["beta"] == [] and kp0["model"]["nama"] == []
    for i, v in zip(rows0, eta_baris(ctx0, kp0["model"], rows0)):                                 # (1) beta = 0 -> klimatologi persis; (2) offset 1
        assert abs(v - offset_dari(lantai_p(kp0["model"]["lantai"], ctx0.T["kab"][i], ctx0.T["bulan"][i]))) < 1e-12
    X = [[r.gauss(0, 1) for _ in range(3)] for _ in range(n)]
    off = [r.gauss(-2, 0.5) for _ in range(n)]
    y = [1 if r.random() < sig(off[i] + 0.8 * X[i][0] + 0.4 * X[i][1]) else 0 for i in range(n)]
    w = [1.0] * n
    s = selesai(X, y, w, off, tau=1.0)
    assert all(b >= 0 for b in s["beta"]) and s["beta"][0] > 0.3 and s["iter"] <= ITER_MAKS and s["grad"] < TOL * n
    assert selesai(X, y, w, off, tau=1e-8)["beta"] == [0.0, 0.0, 0.0] or max(selesai(X, y, w, off, tau=1e-8)["beta"]) < 1e-9     # (ii)
    yneg = [1 if r.random() < sig(off[i] - 1.0 * X[i][2]) else 0 for i in range(n)]               # (iv) koefisien sebenarnya negatif -> 0, terjepit tercatat
    sn = selesai(X, yneg, w, off, tau=1.0)
    assert sn["beta"][2] == 0.0 and sn["terjepit"] >= 1 and all(b >= 0 for b in sn["beta"])
    bebas_ = selesai(X, yneg, w, off, tau=1.0, nonneg=False)["beta"]
    assert bebas_[2] < -0.5                                                                       # kontrol: tanpa tanda nonneg benar-benar negatif
    # (iii) tanpa offset, nonneg mati, pooling mati, tau besar: cocok G.latih_lr (intersep = kolom konstan)
    mu, sd = standarisasi(X, w)
    Z = [[1.0] + [(row[j] - mu[j]) / sd[j] for j in range(3)] for row in X]
    sl = selesai(Z, y, w, [0.0] * n, tau_kol=[1e6] * 4, bebas=[True] * 4, nonneg=False, tau=1e6)
    lr = G.latih_lr(X, y, w, l2=1e-9)
    for i in range(0, n, 37):
        p_lr = G.sigmoid(lr["b"][0] + sum(b * (X[i][j] - lr["mu"][j]) / lr["sd"][j] for j, b in enumerate(lr["b"][1:])))
        assert abs(p_lr - sig(sum(a * b for a, b in zip(Z[i], sl["beta"])))) < 1e-4, i
    # nilai awal 0 + konvergensi: tujuan cembung -> hasil sama dari Z yang diacak urutan barisnya; jepit eta aman terhadap offset ekstrem
    pm = list(range(n)); r.shuffle(pm)
    s2 = selesai([X[i] for i in pm], [y[i] for i in pm], w, [off[i] for i in pm], tau=1.0)
    assert max(abs(a - b) for a, b in zip(s["beta"], s2["beta"])) < 1e-6
    sx = selesai(X, [0] * n, w, [-80.0] * n, tau=1.0)                                            # eta dijepit [-30,30]: tak meledak (exp(80) aman)
    assert all(math.isfinite(b) for b in sx["beta"]) and sig(-80.0) == sig(-30.0) > 0
    simpan_it = ITER_MAKS
    try:
        ITER_MAKS = 1
        _tolak(lambda: selesai(X, y, w, off, tau=1.0), "iterasi tak cukup")                       # gagal konvergen = galat keras keluar 3
    finally:
        ITER_MAKS = simpan_it
    try:
        selesai(X, y, w, off, tau=1.0, mask=None, g=None, W=0)
        e3 = None
        ITER_MAKS = 1
        selesai(X, y, w, off, tau=1.0)
    except GagalKonvergen as e:
        e3 = e.code
    finally:
        ITER_MAKS = simpan_it
    assert e3 == 3
    # (v) delta_w = 0 identik CN; fitur di luar set wilayah = 0; tau_w kecil -> pooling penuh
    g = [i % 2 for i in range(n)]
    cn = selesai(X, y, w, off, tau=1.0)
    pl = selesai(X, y, w, off, g, 2, 1.0, 1e-4, [[True] * 3, [True] * 3])
    assert max(abs(c - cn["beta"][j]) for k in range(2) for j, c in enumerate(pl["koef"][k])) < 1e-3
    mk = selesai(X, y, w, off, g, 2, 1.0, 0.5, [[True, True, False], [True, False, True]])
    assert mk["koef"][0][2] == 0.0 and mk["koef"][1][1] == 0.0 and all(c >= 0 for k in mk["koef"] for c in k)
    ya = [1 if r.random() < sig(off[i] + (1.5 if g[i] == 0 else 0.0) * X[i][0]) else 0 for i in range(n)]
    pw = selesai(X, ya, w, off, g, 2, 1.0, 0.5)
    assert pw["koef"][0][0] > pw["koef"][1][0] + 0.5                                                # partial pooling: wilayah berbeda bisa berbeda
    # bobot sampel dipakai (bobot 0,5 beda dari 1,0)
    wb = [0.5 if yy else 1.0 for yy in y]
    assert abs(selesai(X, y, wb, off, tau=1.0)["beta"][0] - s["beta"][0]) > 1e-3
    # 2. lantai: LOYO tidak berubah bila label tahun baris itu diubah (4); fitur tahun y tak berubah bila label y diubah (5)
    T = ctx0.T
    ix = [i for i in range(ctx0.n) if T["tahun"][i] < 2024]
    p0 = lantai_loyo(T, ix)
    z = 2019
    simpan_y = list(T["y"])
    for i in ix:
        if T["tahun"][i] == z:
            T["y"][i] = 1 - T["y"][i]
    p0b = lantai_loyo(T, ix)
    assert all(p0[i] == p0b[i] for i in ix if T["tahun"][i] == z)                                  # baris tahun z: lantai tak melihat label z
    assert any(p0[i] != p0b[i] for i in ix if T["tahun"][i] != z)                                  # tahun lain berubah lewat lantai (diharapkan)
    Fa = ctx0.F(frozenset(range(2016, 2024)))
    fb = ctx0._bangun(frozenset(range(2016, 2024)))
    assert all(Fa[k] == fb[k] for k in Fa)                                                         # fitur tak bergantung label
    T["y"][:] = simpan_y
    # lantai: bentuk dua tingkat, kab tanpa data -> unit/global, jepit
    lm = lantai_fit(T, list(range(ctx0.n)))
    assert all(LANTAI_MIN <= lantai_p(lm, T["kab"][i], T["bulan"][i]) <= LANTAI_MAK for i in range(0, ctx0.n, 11))
    assert LANTAI_MIN <= lantai_p(lm, "99|x", 1) <= LANTAI_MAK
    TT = {"kab": ["32|a"] * 3 + ["32|b"] * 3 + ["32|c"] * 3, "bulan": [1, 2, 3] * 3, "y": [1, 0, 0, 0, 0, 0, 0, 0, 0], "w": [1.0] * 9}
    assert lantai_fit(TT, range(9))["n_kab_prov"] == {"32": 3}
    assert "pulau:Jawa" in lantai_fit({**TT, "kab": ["32|a"] * 9}, range(9))["ru"]                # < 3 kab -> unit musim jatuh ke pulau
    assert "32" in lantai_fit(TT, range(9))["ru"]                                                  # >= 3 kab -> provinsi
    # 3. Platt bersarang LOYO: label tahun z tidak mengubah logit luar-lipatan tahun z (i); mengubah logit tahun lain (ii); p0 baris z tak berubah (iii)
    cfg = cfg_dari(ctx0, ["pers_h3", "lh3"], 0.25, None)
    ac = frozenset(range(2016, 2022))
    kp_a = cocok_penuh(ctx0, ac, cfg)
    simpan_y = list(ctx0.T["y"])
    for i in range(ctx0.n):
        if ctx0.T["tahun"][i] == 2018:
            ctx0.T["y"][i] = 1 - ctx0.T["y"][i]
    kp_b = cocok_penuh(ctx0, ac, cfg)
    ix18 = [i for i in kp_a["oof"] if ctx0.T["tahun"][i] == 2018]
    assert all(abs(kp_a["oof"][i] - kp_b["oof"][i]) < 1e-9 for i in ix18)                          # (i)
    assert any(abs(kp_a["oof"][i] - kp_b["oof"][i]) > 1e-6 for i in kp_a["oof"] if ctx0.T["tahun"][i] != 2018)   # (ii)
    ctx0.T["y"][:] = simpan_y
    # 4. h3_sm = pers_h3 * zsm; zsm per kab-bulan dari tahun latih; sm jendela sama dengan komponennya
    Fk = ctx0.F(ac)
    zs = anomali_kb(Fk["sm"], T["kab"], T["bulan"], T["tahun"], T["wil"], ac, minimal=5)
    assert all(abs(a - p * zz) < 1e-12 for a, p, zz in zip(Fk["h3_sm"], Fk["pers_h3"], zs) if zz is not None)
    kb = [i for i in range(ctx0.n) if T["kab"][i] == T["kab"][0] and T["bulan"][i] == T["bulan"][0] and T["tahun"][i] in ac]
    zz = [zs[i] for i in kb]
    assert len(kb) >= 5 and abs(sum(zz) / len(zz)) < 1e-9 and abs(math.sqrt(sum(v * v for v in zz) / len(zz)) - 1) < 1e-9   # anomali: nol rata, sd 1 di tahun latih
    zm = anomali_kb([1.0, 2.0, 3.0, 10.0], ["a"] * 4, [1] * 4, [2016, 2017, 2018, 2019], ["Jawa"] * 4, {2016, 2017, 2018}, minimal=2)
    assert abs(zm[3] - (10 - 2) / math.sqrt(2 / 3)) < 1e-9                                         # tahun uji (2019) tak ikut rerata/sd
    zw = anomali_kb([1.0, 2.0, 3.0, 5.0], ["a", "b", "b", "a"], [1] * 4, [2016, 2016, 2017, 2018], ["W"] * 4, {2016, 2017}, minimal=3)
    assert abs(zw[3] - (5 - 2.0) / math.sqrt(2 / 3)) < 1e-9                                        # kab-bulan < 30/minimal -> wilayah-bulan
    # 5. q_q2: skala log tanpa log1p ganda; Q2 lipatan tak berubah bila deret tahun >= uji dimutasi; cocok formula Gumbel GRRR bila acuan = <=2021
    assert q_q2_fitur(math.log1p(100.0), 80.0) == math.log1p(100.0) - math.log1p(80.0) and q_q2_fitur(2.0, None) == 0.0
    qd = [float(10 + (i * 7) % 23 + t) for t in range(2016, 2026) for i in range(30)]
    th = [t for t in range(2016, 2026) for _ in range(30)]
    q2a = q2_per_sel(qd, th, set(range(2016, 2022)))
    qm = [v * (50 if t >= 2022 else 1) for v, t in zip(qd, th)]
    assert q2_per_sel(qm, th, set(range(2016, 2022))) == q2a and q2_per_sel(qm, th, set(range(2016, 2023))) != q2a        # mutasi >= uji tak mengubah
    try:
        sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
        from sungai import gumbel as gum
        mx = [max(v for v, t in zip(qd, th) if t == yy) for yy in range(2016, 2022)]
        g10 = gum([float(v) for v in mx + mx[:4]])
        assert abs(gumbel_q2(mx + mx[:4]) - g10[2]) < 1e-6                                          # sama dengan formula GRRR/sungai.gumbel (mean, sd identik)
    except ImportError:
        pass
    assert q2_per_sel([1.0] * 300, [2016] * 300, {2016}) is None and gumbel_q2([1, 2, 3]) is None
    # q_ant / dq: jendela <= e-1; mutasi hari >= e tak mengubah
    q = [float(10 + i % 5) for i in range(40)]
    a1 = q_anteseden(q, 20, 50.0)
    q2_ = list(q); q2_[20] = 999.0; q2_[21] = 999.0
    assert q_anteseden(q2_, 20, 50.0) == a1 and q_anteseden(q, 20, None) == (0.0, 0.0, 0.0)
    q2_ = list(q); q2_[19] = 999.0
    assert q_anteseden(q2_, 20, 50.0)[2] != a1[2] and q_anteseden(q2_, 20, 50.0)[0] == a1[0]        # e-1 hanya masuk dq, bukan q_ant (e-7..e-2)
    # p_ant: jendela <= e-2 (nol tumpang tindih dengan h3 e-1..e+1)
    ph = [1.0] * 40
    pa0 = p_ant_fitur(ph, 20, [3.0, 5.0, 7.0, 9.0])
    ph2 = list(ph); ph2[19] = 50; ph2[20] = 50; ph2[21] = 50
    assert p_ant_fitur(ph2, 20, [3.0, 5.0, 7.0, 9.0]) == pa0
    ph3 = list(ph); ph3[18] = 50
    assert p_ant_fitur(ph3, 20, [3.0, 5.0, 7.0, 9.0]) != pa0
    # 6. SWI JMA: nol hujan nol; massa (di bawah ambang L) = masuk - keluar beta3; dt=1/6 vs harian-dibagi-rata beda; dt besar ditolak; hujan e-1.. tak masuk swi hari e
    assert all(v == 0.0 for v in swi_jma([0.0] * 48)) and SWI["L1"] == 15.0 and SWI["a2"] == 0.15 and SWI["b3"] == 0.01 and SWI["L2"] == 60.0
    hh = [0.0] * 10 + [2.0, 1.0] + [0.0] * 30
    sj = swi_jma(hh)
    assert 0 < max(sj) < sum(hh) and sj[11] > sj[10] > 0 and sj[-1] < max(sj)
    _tolak(lambda: swi_jma(hh, 1.0), "DILARANG")
    _tolak(lambda: swi_jma(hh, 24.0), "DILARANG")
    kuat = [0.0] * 5 + [80.0] + [0.0] * 20
    harian_rata = [80.0 / 24] * 24
    assert max(swi_jma(kuat)) > max(swi_jma(harian_rata + [0.0] * 20)) + 1                           # puncak jam-an tidak diratakan
    # simulasi pencocokan konservasi massa dengan kode independen (pembeda): S1 di bawah ambang -> hanya beta1 memindah, beta3 keluar
    s1 = s2 = s3 = 0.0; keluar = 0.0; masuk = 0.0
    for rr in [3.0, 0.0, 2.0] + [0.0] * 30:
        for _ in range(6):
            dtj = 1 / 6
            masuk += rr * dtj
            n1, n2, n3 = (1 - 0.12 * dtj) * s1 + rr * dtj, (1 - 0.05 * dtj) * s2 + 0.12 * s1 * dtj, (1 - 0.01 * dtj) * s3 + 0.05 * s2 * dtj
            keluar += 0.01 * s3 * dtj
            s1, s2, s3 = n1, n2, n3
    assert abs(masuk - (s1 + s2 + s3) - keluar) < 1e-9
    hh2 = [0.0] * 5 + [4.0] + [0.0] * 10
    mm = swi_jma(hh2)
    assert abs(sum([4.0]) - (mm[-1] + 0.0)) < 4.0 and mm[-1] > 0                                    # sisa air belum 0
    # 7. CENS: kotak/ambang; jendela e-1..e+1; kontinu & biner
    v = [0.0] * 20; v[8:11] = [9.0, 9.0, 9.0]
    assert cs_cont(v, 9) == (4.0, 1.0)
    v2 = list(v); v2[12] = 99.0; v2[6] = 99.0
    assert cs_cont(v2, 9) == (4.0, 1.0) and cs_cont([4.0] * 20, 9) == (0.0, 0.0) and CENS["lon"] == (105.0, 115.0) and CENS["lat"] == (-5.0, 0.0)
    # 8. neraca: anomali bulan m-4, klimatologi tahun latih saja; twsa b-5, klimatologi latih saja, < 4 pengamatan -> None
    bulan = [f"{y}-{m:02d}" for y in range(2016, 2024) for m in range(1, 13)]
    S = {b: float(int(b[:4]) % 5 + int(b[5:])) for b in bulan}
    a_dasar = sa_neraca(S, 2020, 5, {2016, 2017, 2018, 2019})
    S2m = dict(S); S2m["2020-02"] = 999.0; S2m["2021-01"] = 999.0                                    # bulan m-3 (2020-02) dan tahun uji: tak boleh mengubah fitur (2020, bulan 5 -> sumber 2020-01)
    assert sa_neraca(S2m, 2020, 5, {2016, 2017, 2018, 2019}) == a_dasar
    S3m = dict(S); S3m["2020-01"] += 5.0
    assert abs(sa_neraca(S3m, 2020, 5, {2016, 2017, 2018, 2019}) - a_dasar - 5.0) < 1e-9             # tapi nilai sumber (m-4) memang masuk
    S4m = dict(S); S4m["2023-01"] = 999.0
    assert sa_neraca(S4m, 2020, 5, {2016, 2017, 2018, 2019}) == a_dasar                              # tahun di luar acuan tak masuk klimatologi
    waktu = [f"{y}-{m:02d}" for y in range(2016, 2024) for m in range(1, 13)]
    tws = [float(i % 7) for i in range(len(waktu))]
    t0 = twsa_fitur(tws, waktu, 2022, 8, {2016, 2017, 2018, 2019, 2020, 2021})
    tws2 = list(tws); tws2[waktu.index("2022-04")] += 0.0; tws2[waktu.index("2022-05")] = 99.0     # bulan b-3 dan b-4 tak mengubah (sumber 2022-03)
    assert twsa_fitur(tws2, waktu, 2022, 8, {2016, 2017, 2018, 2019, 2020, 2021}) == t0 and t0 is not None
    tws3 = list(tws); tws3[waktu.index("2022-03")] += 3.0
    assert abs(twsa_fitur(tws3, waktu, 2022, 8, {2016, 2017, 2018, 2019, 2020, 2021}) - t0 - 3.0) < 1e-9
    assert twsa_fitur(tws, waktu, 2022, 8, {2016, 2017}) is None                                      # < 4 pengamatan klimatologi
    tws4 = list(tws); tws4[waktu.index("2022-03")] = None
    assert twsa_fitur(tws4, waktu, 2022, 8, {2016, 2017, 2018, 2019, 2020, 2021}) is None
    # potongan hash deret: perpanjangan/mutasi bulan > 2026-07 tak mengubah; mutasi <= 2026-07 mengubah
    dk = {"3101": {"bulan": ["2026-06", "2026-07", "2026-08"], "P": [1, 2, 3], "ETa": [1, 2, 3], "R": [1, 2, 3], "S": [1, 2, 3]}}
    h0 = hash_potongan(dk)
    dk2 = json.loads(json.dumps(dk)); dk2["3101"]["S"][2] = 99; dk2["3101"]["bulan"].append("2026-09"); [dk2["3101"][k].append(5) for k in ("P", "ETa", "R", "S")]
    assert hash_potongan(dk2) == h0
    dk3 = json.loads(json.dumps(dk)); dk3["3101"]["S"][1] = 99
    assert hash_potongan(dk3) != h0
    # 9. pembeda indeks hari / zona waktu: pasang murni tanggal & WIB; ONI/DMI lag; hari WIB (UTC+7) bukan UTC
    d1 = pa_harian(dt.date(2024, 3, 10), "lain")
    assert d1 == pa_harian(dt.date(2024, 3, 10), "lain") and 0 <= d1 <= 1.0 + 1e-9
    assert tgl_wib("2026-11-04T18:00:00Z") == dt.date(2026, 11, 5) and tgl_wib("2026-11-04T16:59:00+00:00") == dt.date(2026, 11, 4)    # 17:00 UTC = 00:00 WIB berikut
    assert K2.tgl_e(0) == ub.AWAL and (K2.tgl_e(1) - K2.tgl_e(0)).days == 1
    assert geser_bulan(2026, 11, 3) == (2026, 8) and geser_bulan(2026, 2, 3) == (2025, 11) and geser_bulan(2026, 11, 6) == (2026, 5)
    oni = parse_oni("SEAS  YR   TOTAL ANOM\n JAS 2026 28.1 0.4\n DJF 2026 27.0 -0.3\n SON 2026 27.9 0.1\n")
    assert oni[(2026, 8)] == 0.4 and oni[(2026, 1)] == -0.3 and iklim_lag(oni, 2026, 11, "oni_lag") == 0.4          # Nov: b-3 = Agu -> JAS
    dmi = parse_dmi("2026 0.1 0.2 0.3 0.4 0.5 -9999 -9999 -9999 -9999 -9999 -9999 -9999\n")
    assert dmi.get((2026, 5)) == 0.5 and (2026, 6) not in dmi and iklim_lag(dmi, 2026, 11, "dmi_lag") == 0.5
    # 10. wilayah calon: n_kab/P_w/T_w; gabung ke Lainnya; urutan P_w menurun; Lainnya terakhir; cw_sekunder
    kab_, th_, y_, w_ = [], [], [], []
    for p, nk, pos in (("11", 7, 200), ("32", 13, 600), ("61", 7, 50), ("51", 7, 300), ("71", 4, 500), ("81", 3, 500)):
        for i in range(nk):
            for t in range(2016, 2026):
                for j in range(pos // (nk * 10) + 1):
                    kab_.append(f"{p}|k{i}"); th_.append(t); y_.append(1); w_.append(1.0)
    gw = gabung_wilayah(kab_, th_, y_, w_, set(LATIH))
    assert gw["peta"]["Jawa"] == "Jawa" and gw["peta"]["Sulawesi"] == PENAMPUNG and gw["peta"]["Maluku-Papua"] == PENAMPUNG and gw["peta"]["Kalimantan"] == PENAMPUNG   # Kal P_w<100
    assert gw["peta"]["Bali-NT"] == "Bali-NT" and gw["rincian"]["Sulawesi"]["n_kab"] == 4 and not gw["rincian"]["Sulawesi"]["lolos"]
    assert gw["urutan"][0] == "Jawa" and gw["urutan"][-1] == PENAMPUNG and gw["koreksi_bias"]["Bali-NT"] == "Lainnya" and gw["koreksi_bias"]["Jawa"] == "Jawa"
    assert wil_dari_kab("71|x", gw["peta"]) == PENAMPUNG and not gw["cw_sekunder"]
    gw2 = gabung_wilayah(kab_[:5], th_[:5], y_[:5], w_[:5], set(LATIH))
    assert gw2["cw_sekunder"]                                                                         # < 3 wilayah efektif
    # 11. kandidat A: kuantil berbobot, pooling ambang, s, sel nested, fallback D
    assert kuantil_berbobot([1, 2, 3, 4, 5], [1] * 5, 0.2) == 1 and kuantil_berbobot([1, 2, 3, 4, 5], [1, 1, 1, 1, 6], 0.5) == 5
    kej = [("a", "W", {1: 10.0, 24: 20.0}, 1.0)] * 2 + [("b", "W", {1: 30.0, 24: 40.0}, 1.0)] * 6
    tha = theta_A(kej, (1, 24))
    assert tha[1]["kab"]["a"] == tha[1]["wil"]["W"] and tha[1]["wil"]["W"] == 10.0                    # n_k < 5 -> wilayah sepenuhnya
    assert abs(tha[1]["kab"]["b"] - (6 * 30.0 + 5 * 10.0) / 11) < 1e-9
    assert kondisi_s({1: 11.0, 24: 5.0}, tha, "a", "W", (1, 24)) == 1 and kondisi_s({1: 5.0, 24: 5.0}, tha, "a", "W", (1, 24)) == 0
    kej_loyo = [x for x in kej if x[0] != "b"]
    assert theta_A(kej_loyo, (1,))[1]["kab"].get("b") is None and theta_untuk(theta_A(kej_loyo, (1,)), 1, "b", "W") == 10.0
    sa_ = sel_A([("a", "W", 1, 1, 1, 1.0), ("a", "W", 1, 1, 0, 1.0), ("a", "W", 0, 0, 0, 1.0), ("b", "W", 1, 1, 0, 1.0)], (1, 24))
    pw_ = (1 + HALUS * (1 / 4)) / (3 + HALUS)
    assert abs(sa_["pw"]["W|1|1"] - pw_) < 1e-12 and abs(sa_["pk"]["a|1|1"] - (1 + HALUS * pw_) / (2 + HALUS)) < 1e-12
    assert abs(p_A(sa_, "z", "W", 1, 1) - pw_) < 1e-12 and p_A(sa_, "z", "W", 5, 5) == sa_["r_w"]["W"]
    assert durasi_A(False)["durasi"] == [1, 24, 72] and durasi_A(True)["durasi"] == [1, 3, 6, 8, 12, 24, 72]
    # 12. satu-SE, ekstensi, gerbang pembekuan, vonis
    assert satu_se([("a", [0.30, 0.31, 0.29, 0.30]), ("b", [0.29, 0.30, 0.28, 0.30]), ("c", [0.2, 0.2, 0.2, 0.2])]) == "c"
    assert satu_se([("a", [0.3, float("nan"), 0.3, 0.3]), ("b", [0.2, 0.9, 0.2, 0.2])]) == "b" and not terima_ekstensi([.3, float("nan"), .3, .3], [.2] * 4, [0] * 4, [1] * 4)
    assert satu_se([("a", [0.301, 0.29, 0.31, 0.30]), ("b", [0.30, 0.29, 0.31, 0.299])]) == "a"       # dalam satu SE -> paling sederhana
    assert terima_ekstensi([.3, .3, .3, .3], [.2, .21, .2, .2], [.01] * 4, [.02] * 4) and not terima_ekstensi([.3] * 4, [.299, .301, .3, .3], [.01] * 4, [.02] * 4)
    assert not terima_ekstensi([.3] * 4, [.1] * 4, [.02] * 4, [.01, .01, .01, .03])                    # dETS > 0 hanya 1 dari 4 lipatan
    assert terima_ekstensi([.3, .3, .3, .3], [.2, .2, .2, .31], [.01] * 4, [.02] * 4)               # 3 dari 4 lipatan cukup
    assert not terima_ekstensi([.3, .3, .3, .3], [.2, .2, .31, .31], [.01] * 4, [.02] * 4)           # 2 dari 4: tidak
    assert gerbang_pembekuan(0.0, [1, 1, 1, 1, 1])["hentikan"] and gerbang_pembekuan(0.01, [1, 1, 1, -1, -1])["hentikan"] and not gerbang_pembekuan(0.01, [1, 1, 1, 1, -1])["hentikan"]
    k_ok = {n: {"nilai": .02, "ci": [.01, .03]} for n in ("dets_model-klim_waspada", "dets_model-klim_siaga", "dbss_model-klim", "dets_model-lr1_waspada",
                                                         "dbss_model-lr1", "dets_model-aturan_waspada", "dets_model-aturan_siaga")}
    assert vonis_c(k_ok)["vonis"] == "LULUS" and vonis_c(k_ok, 0.1, 0.2)["vonis"] == "LULUS (daya rendah)"
    for kk in k_ok:
        kb_ = json.loads(json.dumps(k_ok)); kb_[kk]["ci"] = [-.01, .03]
        assert vonis_c(kb_)["vonis"] == "TIDAK MEYAKINKAN", kk
    kg = json.loads(json.dumps(k_ok)); kg["dets_model-klim_waspada"].update(nilai=0.0, ci=[-0.02, 0.01])
    assert vonis_c(kg)["vonis"] == "TIDAK LULUS"
    kg = json.loads(json.dumps(k_ok)); kg["dets_model-lr1_waspada"]["ci"] = [-.03, -.01]
    assert vonis_c(kg)["vonis"] == "TIDAK LULUS"
    kg = json.loads(json.dumps(k_ok)); kg["dets_model-aturan_waspada"]["ci"] = [-.03, -.01]
    assert vonis_c(kg)["vonis"] == "TIDAK LULUS" and int(Q_LO * 4999) == 8 and int(Q_HI * 4999) == 4990
    # bootstrap: model sempurna LULUS pada data mainan HU._toy_B
    Bs = HU._toy_B(n_per=28)
    sem = [0.9 if v else 0.03 for v in Bs["y"]]
    kl = [sum(Bs["y"]) / len(Bs["y"])] * len(Bs["y"])
    at = [0.02 + 0.05 * l for l in Bs["level"]]
    LV_ = MK.LEVEL_ALARM
    ns = {lv: sum(1 for l in Bs["level"] if l >= L) for lv, L in LV_.items()}
    P = {"model": sem, "klim": kl, "lr1": kl, "aturan": at}
    al = {"aturan": {lv: [l >= L for l in Bs["level"]] for lv, L in LV_.items()}, **{m: {lv: MK.alarm_sebanyak(P[m], ns[lv]) for lv in LV_} for m in ("model", "klim", "lr1")}}
    bt = boot_c(Bs, al, P, ulang=200)
    assert vonis_c(bt)["vonis"] == "LULUS" and bt["dets_model-klim_waspada"]["ci"][0] > 0
    # 13. guard label 2026-10-18, T dari git, buka
    pastikan_label_terpotong([dt.date(2026, 10, 18), "2026-01-01"])
    _tolak(lambda: pastikan_label_terpotong([dt.date(2026, 10, 19)]), "DILARANG")
    _tolak(lambda: pastikan_label_terpotong(["2026-11-02"]), "DILARANG")
    assert potong_label_tanggal({"k": ["2026-10-18", "2026-10-19", "2027-01-01"]}) == {"k": ["2026-10-18"]}
    T0 = dt.date(2026, 11, 10)
    _tolak(lambda: gerbang_buka(dt.date(2026, 11, 10), T0, dt.date(2027, 7, 1)), "lebih baru dari awal jendela")
    _tolak(lambda: gerbang_buka(dt.date(2026, 11, 9), T0, dt.date(2027, 7, 1)), "lebih baru dari awal jendela")
    _tolak(lambda: gerbang_buka(dt.date(2026, 11, 11), T0, dt.date(2027, 6, 28)), "paling cepat")
    _tolak(lambda: gerbang_buka(dt.date(2026, 11, 11), None, dt.date(2027, 7, 1)), "belum ada")
    assert gerbang_buka(dt.date(2026, 11, 11), T0, dt.date(2027, 6, 29)) == dt.date(2026, 11, 11) and gerbang_buka(dt.date(2026, 11, 11), T0, dt.date(2026, 12, 1), kering=True)
    sas = [dt.date(2026, 11, 10), dt.date(2026, 11, 11), dt.date(2027, 4, 30), dt.date(2027, 5, 1)]
    assert saring_sasaran(sas, T0) == [1, 2]
    with tempfile.TemporaryDirectory() as tmp:
        git = lambda *a, env=None: subprocess.run(["git", "-C", tmp, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True,
                                                  env={**os.environ, **(env or {})})
        git("init", "-q", "-b", "main")
        f = os.path.join(tmp, "x.sidik")
        waktu1 = {"GIT_COMMITTER_DATE": "2026-11-04T10:00:00+07:00", "GIT_AUTHOR_DATE": "2026-11-01T10:00:00+07:00"}
        waktu2 = {"GIT_COMMITTER_DATE": "2026-11-06T23:30:00+07:00", "GIT_AUTHOR_DATE": "2026-10-01T10:00:00+07:00"}
        open(f, "w").write(json.dumps({"jenis": "latih"}) + "\n")
        git("add", "x.sidik"); git("commit", "-q", "-m", "l", env=waktu1)
        assert tanggal_T(tmp, "main", "x.sidik") is None                                              # latih bukan sidik
        open(f, "a").write(json.dumps({"jenis": "sidik"}) + "\n")
        git("add", "x.sidik"); git("commit", "-q", "-m", "s", env=waktu2)
        assert tanggal_T(tmp, "main", "x.sidik") == dt.date(2026, 11, 6)                              # committer date commit PERTAMA yang memuat sidik, bukan author date
        assert tanggal_T(tmp, "main", "x.sidik", lain=[dt.date(2026, 11, 8)]) == dt.date(2026, 11, 8)   # pengunci lain yang lebih akhir menang
        open(f, "a").write(json.dumps({"jenis": "buka_mulai"}) + "\n")
        git("add", "x.sidik"); git("commit", "-q", "-m", "b", env={"GIT_COMMITTER_DATE": "2027-01-01T10:00:00+07:00"})
        assert tanggal_T(tmp, "main", "x.sidik") == dt.date(2026, 11, 6)                              # commit susulan tak menggeser T
        _tolak(lambda: tanggal_T(tmp, "origin/tidak-ada", "x.sidik"), "git log")
    # 14. daftar kab pesisir/ekstensi gagal rapi, bukan crash; pemblokir dikembalikan; jam-an hilang -> DataBelumAda
    _tolak(lambda: jam_hujan((99.0, 99.0)), "belum ada")
    cek = cek_ekstensi()
    assert set(cek) == {n for n, _ in EKSTENSI} and all(v is None or isinstance(v, str) for v in cek.values())
    lbx, dbx = potong_sumber_label([{"mulai": "2026-10-18"}, {"mulai": "2026-10-19"}], [{"tanggal": "2026-10-18T00:00"}, {"tanggal": "2026-11-02"}])
    assert len(lbx) == 1 and len(dbx) == 1                                                       # label > LABEL_AKHIR dibuang sebelum diproses
    db = daftar_buka()
    assert db["jumlah"] == 11 and db["m_konsisten"] and M_KELUARGA == 14
    cs_, _ = sintetis(sinyal=1.6, kab_per_prov=(("11", 3), ("32", 4)), hari_per_tahun=18)
    kc = kontrol_peka_label(cs_, cfg_dari(cs_, S0, 0.25, None), 2024)
    assert set(kc) == {"K1", "K2"} and len(kc["K1"]["p"]) == len(kc["K1"]["rows"]) == len(kc["K2"]["rows"]) and kc["K1"]["klim"] != kc["K2"]["p"]
    assert kc["K1"]["y"] == [cs_.T["y_dibi"][i] for i in kc["K1"]["rows"]]                   # evaluasi DIBI saja
    assert cs_.T["y"] == cs_.T["y"] and sum(cs_.T["y_dibi"]) < sum(cs_.T["y"])                     # K1 tidak menimpa konteks asli
    # 15. sidik: mutasi konstanta TAU / LANTAI / JENDELA / berkas mengubah sidik; potongan deret ikut; label hidup tidak (bukan pengunci)
    kd = {"x": 1}
    hf = lambda r: "h"
    s0 = sidik_penuh(kd, hf)
    simpan_t, simpan_l, simpan_j = TAU_GRID, LANTAI_MIN, dict(JENDELA)
    try:
        TAU_GRID = (0.05, 0.10, 0.30)
        assert sidik_penuh(kd, hf) != s0
        TAU_GRID = simpan_t
        LANTAI_MIN = 2e-5
        assert sidik_penuh(kd, hf) != s0
        LANTAI_MIN = simpan_l
        JENDELA["p_ant"] = (-9, -2)
        assert sidik_penuh(kd, hf) != s0
        JENDELA.clear(); JENDELA.update(simpan_j)
        assert sidik_penuh(kd, hf) == s0 and sidik_penuh({"x": 2}, hf) != s0 and sidik_penuh(kd, lambda r: "g" if r.endswith("status.py") else "h") != s0
    finally:
        TAU_GRID, LANTAI_MIN = simpan_t, simpan_l
        JENDELA.clear(); JENDELA.update(simpan_j)
    _tolak(lambda: sidik_wajib_ada(lambda r: None if r.endswith("umum.py") else "h"), "umum.py")
    # default argumen tidak boleh mengikat OBJEK konstanta global saat def (kasus ilmu 1 Nov): bandingkan identitas dengan semua global huruf-besar
    besar = [v for k, v in globals().items() if k.isupper() and isinstance(v, (tuple, list, dict, set))]
    for nm, fn in list(globals().items()):
        if inspect.isfunction(fn) and fn.__module__ == __name__:
            for p_ in inspect.signature(fn).parameters.values():
                assert not any(p_.default is v for v in besar), (nm, p_.name)
    # 16. pemilihan: tau/tau_w/set/ekstensi pada evaluasi palsu (satu putaran, urutan, Lainnya terakhir, ekstensi hanya bila lolos 4b)
    class Palsu(Konteks):
        pass
    cp = Konteks({"y": [0]}, lambda a: {}, ["Jawa", PENAMPUNG], tersedia=set(S3) | {"sa", "twsa"})
    jejak = []

    def ev(cfg, buang=None):
        jejak.append(cfg)
        ada = lambda wl: len(cfg["set"][wl])
        ll = {wl: [0.30 - 0.01 * (ada(wl) >= 6) - 0.02 * (ada(wl) >= 7 and wl == "Jawa")] * 4 for wl in cp.wilayah}
        if buang and "sa" in buang:
            for wl in cp.wilayah:
                ll[wl] = [x - (0.02 if "sa" in cfg["set"][wl] else 0.0) + 0.001 * k for k, x in enumerate(ll[wl])]
        return {"ll": [0.3 - 0.01 * (ada("Jawa") >= 6)] * 4, "ll_wil": ll, "ets_wil": {wl: [0.01 + (0.01 if "sa" in cfg["set"][wl] else 0.0)] * 4 for wl in cp.wilayah}}
    pil = pilih_semua(cp, ev, ["Jawa", PENAMPUNG])
    assert pil["tau"] in TAU_GRID and pil["tau_w"] in TAUW_GRID and set(pil["set"]) == {"Jawa", PENAMPUNG}
    assert "E_neraca" in pil["ekstensi_diterima"]["Jawa"]
    assert "E_neraca" not in pil["ekstensi_diterima"][PENAMPUNG] and "E_twsa" not in pil["ekstensi_diterima"][PENAMPUNG]       # berlaku hanya Jawa
    assert pilih_semua(cp, ev, ["Jawa"], cw_sekunder=True)["ekstensi_diterima"] == {}                                           # CW sekunder: tanpa ekstensi
    # 17. alur penuh sintetis: sinyal nyata -> koefisien positif, p > klimatologi pada AUC, tanda >= 0, LR1, evaluator, pembeda mutasi
    ctx, _ = sintetis(sinyal=1.6)
    cfgs = cfg_dari(ctx, S1, 0.25, None)
    rows, p = lipat(ctx, cfgs, 2024)
    rk, pk = p_klimatologi(ctx, 2024)
    rl, pl_ = p_lr1(ctx, 2024)
    yv = [ctx.T["ye"][i] for i in rows]
    assert rows == rk == rl and 0 < sum(yv) < len(yv)
    assert G.auc(p, yv) > G.auc(pk, yv) + 0.02 and G.auc(pl_, yv) > 0.55
    m_ = cocok(ctx, frozenset(range(2016, 2024)), cfgs)
    assert all(c >= 0 for k in m_["koef"] for c in k) and sum(m_["beta"]) > 0.3 and m_["n_gugur"] == 0
    ev2 = evaluator(ctx)
    r_a = ev2(cfg_dari(ctx, S0, 0.25, None))
    r_b = ev2(cfg_dari(ctx, [], 0.25, None))
    assert sum(r_a["ll"]) < sum(r_b["ll"]) and len(r_a["ll"]) == 4 and set(r_a["ll_wil"]) == set(ctx.wilayah)
    # 18. uji mutasi: swauji GAGAL bila logika diganggu (pencegah swauji yang selalu hijau)
    def hijau_lantai():
        t_ = {"kab": ["32|a", "32|a", "32|a", "32|a"], "bulan": [1, 1, 1, 1], "tahun": [2016, 2017, 2018, 2019], "y": [1, 0, 0, 0], "w": [1.0] * 4}
        a = lantai_loyo(t_, [0, 1, 2, 3])
        t2 = {**t_, "y": [1, 0, 0, 1]}
        b = lantai_loyo(t2, [0, 1, 2, 3])
        assert a[3] == b[3]                                                       # label tahun 2019 tak boleh mengubah lantai baris 2019
        return True
    assert hijau_lantai()
    asli = globals()["lantai_loyo"]
    try:
        globals()["lantai_loyo"] = lambda T_, ix_: {i: lantai_p(lantai_fit(T_, ix_), T_["kab"][i], T_["bulan"][i]) for i in ix_}   # mutasi: LOYO diganti dalam-sampel
        try:
            hijau_lantai()
            raise RuntimeError("mutasi LOYO lolos")
        except AssertionError:
            pass
    finally:
        globals()["lantai_loyo"] = asli
    def hijau_nonneg():
        return all(b >= 0 for b in selesai(X, yneg, w, off, tau=1.0)["beta"])
    asli_s = globals()["selesai"]
    assert hijau_nonneg()
    try:
        globals()["selesai"] = lambda *a, **k: asli_s(*a, **{**k, "nonneg": False})
        assert not hijau_nonneg()                                                  # mutasi: tanda nonneg dimatikan harus terdeteksi
    finally:
        globals()["selesai"] = asli_s
    def hijau_potong():
        _tolak(lambda: pastikan_label_terpotong([dt.date(2026, 10, 19)]), "DILARANG")
    asli_la = LABEL_AKHIR
    try:
        globals()["LABEL_AKHIR"] = dt.date(2026, 10, 25)
        try:
            hijau_potong()
            raise RuntimeError("mutasi LABEL_AKHIR lolos")
        except AssertionError:
            pass
    finally:
        globals()["LABEL_AKHIR"] = asli_la
    hijau_potong()
    assert sidik_penuh(kd, hf) == s0
    # 19. A-9: pooling hanya pada pasangan (w,j) aktif; fitur satu-wilayah pulih seperti kasus tunggal (bukan menyusut ke 0)
    gg = [i % 2 for i in range(n)]
    yb = [1 if r.random() < sig(off[i] + (1.0 * X[i][2] if gg[i] == 0 else 0.0)) else 0 for i in range(n)]
    ref = selesai([X[i] for i in range(n) if gg[i] == 0], [yb[i] for i in range(n) if gg[i] == 0], [1.0] * (n // 2), [off[i] for i in range(n) if gg[i] == 0], tau=1.0)["beta"][2]
    mm = selesai(X, yb, w, off, gg, 2, 1.0, 0.02, [[True, True, True], [True, True, False]])
    assert ref > 0.5 and mm["koef"][0][2] > 0.8 * ref and mm["koef"][1][2] == 0.0 and abs(mm["beta"][2] - mm["koef"][0][2]) < 0.2 * ref, (ref, mm["koef"], mm["beta"])
    # 20. indeks negatif tidak membungkus ke ekor deret
    assert q_anteseden([10.0] * 30 + [500.0] * 3, 2, 50.0) == (0.0, 0.0, 0.0) and q_anteseden([10.0] * 30 + [500.0] * 3, 5, 50.0)[2] == 0.0
    assert jendela_q([1.0, 2.0, 3.0, 99.0], 1, -3, 0) == [] and p_ant_fitur([1.0] * 30 + [900.0] * 3, 3, [1.0, 2.0]) is None and cs_cont([1.0] * 30 + [900.0], 0) == (None, None)
    # 21. LOYO fitur: baris tahun z TIDAK boleh memakai statistik yang melihat z (mutasi ctx.F(acuan-{z}) -> ctx.F(acuan) harus gagal)
    jejak_ac = []
    c21, _ = sintetis(kab_per_prov=(("32", 4),), hari_per_tahun=10)

    def bangun_palsu(acuan):
        jejak_ac.append(frozenset(acuan))
        return {"pers_h3": [float(2018 in acuan)] * c21.n}
    c21._bangun, c21._cache, c21.tersedia = bangun_palsu, {}, {"pers_h3"}
    m21 = cocok(c21, frozenset({2016, 2017, 2018}), cfg_dari(c21, ["pers_h3"], 0.25, None))
    frak = sum(1 for i in range(c21.n) if c21.T["tahun"][i] in (2016, 2017) and c21.T["w"][i] > 0) / sum(1 for i in range(c21.n) if c21.T["tahun"][i] in (2016, 2017, 2018) and c21.T["w"][i] > 0)
    assert abs(m21["mu"][0] - frak) < 1e-9 and frozenset({2016, 2017}) in jejak_ac and frozenset({2016, 2017, 2018}) not in jejak_ac[:3], (m21["mu"], frak)
    # 22. mutasi lolos sebelumnya: gabung_wilayah (bobot, tahun latih), NETRAL twsa, Platt satu kelas, sidik memuat potongan deret
    kw = ["32|a"] * 12 + ["32|b"] * 12
    gx = gabung_wilayah(kw, [2020] * 24, [1] * 24, [0.5] * 24, {2020})
    assert gx["rincian"]["Jawa"]["P_w"] == 12.0                                                    # positif BERBOBOT (0,5), bukan cacah
    assert gabung_wilayah(kw, [2020] * 12 + [2031] * 12, [1] * 24, [0.5] * 24, {2020})["rincian"]["Jawa"]["P_w"] == 6.0   # tahun di luar latih diabaikan
    cn_, _ = sintetis(kab_per_prov=(("32", 4),), hari_per_tahun=10)
    asli_b = cn_._bangun
    cn_.tersedia = set(cn_.tersedia) | {"twsa"}
    def b_tw(ac):
        F = dict(asli_b(ac)); F["twsa"] = [None if i % 3 == 0 else 1.0 * (i % 5) for i in range(cn_.n)]; return F
    cn_._bangun, cn_._cache = b_tw, {}
    ac3 = frozenset({2016, 2017, 2018})
    assert cocok(cn_, ac3, cfg_dari(cn_, ["lh3", "twsa"], 0.25, None))["n_gugur"] == 0               # twsa hilang -> netral, baris tetap
    def b_lh(ac):
        F = dict(asli_b(ac)); F["lh3"] = [None if i % 3 == 0 else v for i, v in enumerate(F["lh3"])]; return F
    cn_._bangun, cn_._cache = b_lh, {}
    assert cocok(cn_, ac3, cfg_dari(cn_, ["lh3"], 0.25, None))["n_gugur"] > 0                         # fitur lain hilang -> baris dibuang
    pl1 = platt_wil([0.1, 0.2, 0.3], [0, 0, 0], [1.0] * 3, ["W"] * 3)
    assert pl1["W"] == PLATT_NETRAL
    global DERET_BULANAN
    simpan_db = DERET_BULANAN
    with tempfile.TemporaryDirectory() as tmp:
        try:
            DERET_BULANAN = os.path.join(tmp, "d.json")
            json.dump({"kab": dk}, open(DERET_BULANAN, "w"))
            sa_ = sidik_penuh(kd, hf)
            json.dump({"kab": dk3}, open(DERET_BULANAN, "w"))
            assert sidik_penuh(kd, hf) != sa_                                                       # potongan <= 2026-07 berubah -> sidik berubah
            json.dump({"kab": dk2}, open(DERET_BULANAN, "w"))
            assert sidik_penuh(kd, hf) == sa_                                                       # perpanjangan bulan > 2026-07 tidak
        finally:
            DERET_BULANAN = simpan_db
    assert pastikan_label_terpotong([dt.datetime(2026, 10, 18, 23, 0)]) is None
    _tolak(lambda: pastikan_label_terpotong([dt.datetime(2026, 10, 19, 0, 0)]), "DILARANG")
    assert set(gw["koreksi_bias"]) == set(gw["peta"].values()) and gw["koreksi_bias"]["Bali-NT"] == "Lainnya" and gw["koreksi_bias"]["Jawa"] == "Jawa" and gw["koreksi_bias"][PENAMPUNG] == "Lainnya"
    # 23. pesisir: tepi bersama bukan pantai, tepi luar dihitung, batas negara dikurangi
    kot = lambda x0, y0, x1, y1: {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}
    tl_ = tepi_luar([("32|A", kot(107, -7, 108, -6)), ("32|B", kot(108, -7, 109, -6))])
    assert abs(tl_["32|A"][0] - (3 * 111.0)) < 15 and tl_["32|A"][1] == 0.0                         # 3 sisi luar (sisi bersama dibuang)
    tl2 = tepi_luar([("32|A", kot(107, -7, 108, -6)), ("32|B", kot(108.00001, -7, 109, -6))])        # snapping 1e-4: celah 1e-5 tetap dianggap berbagi
    assert tl2["32|A"][0] < tl_["32|A"][0] + 1 and tl2["32|A"][0] > 2 * 100
    tl3 = tepi_luar([("61|A", kot(110, 1.0, 111, 2.0)), ("61|B", kot(107, -1, 108, 0))])             # kotak A di lintasan batas negara Kalbar-Sarawak
    assert tl3["61|A"][0] < 1e-6 and tl3["61|A"][1] > 300 and tl3["61|B"][0] > 300 and tl3["61|B"][1] == 0.0
    # 24. hujan harian/imax dari jam-an identik cache uji_balik (sel yang ada di kedua cache), toy + nyata bila ada
    jm = [0.0] * 24 + [1.0] * 24 + [None] * 23 + [3.0]
    jm0 = [0.0] * ((ub.AWAL - dt.date(2015, 1, 1)).days * 24)
    pj, ij = harian_dari_jam(jm0 + jm)
    assert pj == [0.0, 24.0, 3.0] and ij == [0.0, 1.0, 3.0] and harian_dari_jam(jm0 + [None] * 24)[1] == [None]
    cocok_n = 0
    if os.path.isdir(os.path.join(JAM_ERA5, "hujan")):
        import gzip
        for dn in sorted(os.listdir(os.path.join(JAM_ERA5, "hujan")))[:40]:
            sl = tuple(float(v) for v in dn.split("_"))
            if cocok_n >= 3 or not os.path.exists(ub.jalur(*sl)):
                continue
            try:
                pj, ij = harian_dari_jam(jam_hujan(sl))
            except DataBelumAda:
                continue
            c = ub.deret(json.load(gzip.open(ub.jalur(*sl), "rt")))
            assert all(abs(a - b) < 1e-9 for a, b in zip(pj, c["p"])) and all(a == b for a, b in zip(ij, c["im"])), sl
            cocok_n += 1
    print("ok model_kab_campur")


# ================================================================== M. mode
def _arg(nama, bawaan=None):
    return sys.argv[sys.argv.index(nama) + 1] if nama in sys.argv else bawaan


def main():
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m == "uji":
        uji()
    elif m == "pemblokir":
        s, cek = pemblokir()
        for k, (st, ket) in sorted(s.items()):
            print(f"6a-A.{k}: {st} - {ket}")
        for k, v in cek.items():
            print(f"  {k}: {'siap' if v is None else v}")
    elif m == "baris":
        baris()
    elif m == "pesisir":
        o = susun_pesisir()
        print(f"{o['n_pesisir']} dari {o['n_kab']} kab pesisir; sampel {o['sampel']['n_pesisir']} dari {o['sampel']['n']}: {o['sampel']['pesisir']}; terdampak batas negara: {o['terdampak_batas_negara']}")
    elif m == "latih" and "--kering" in sys.argv:
        latih_kering()
    elif m == "latih" and "--nyata-kering" in sys.argv:
        try:
            dry_run_nyata()
        except DataBelumAda as e:
            sys.exit(f"dry-run ditolak, data belum ada: {e}")
    elif m in ("latih", "gerbang", "sidik", "buka", "nilai"):
        if m == "buka" and "--kering" in sys.argv:
            sys.exit("buka --kering: butuh kandidat.json (belum ada; `latih` nyata belum boleh dijalankan)")
        s, cek = pemblokir()
        blok = {k: v for k, v in s.items() if v[0] == "BLOK"}
        if blok:
            sys.exit(f"{m} ditolak: pemblokir 6a-A belum beres: " + "; ".join(f"{k}: {v[1]}" for k, v in sorted(blok.items())))
        try:
            {"latih": lambda: latih_nyata("--ulang" in sys.argv), "sidik": sidik}.get(m, konteks_nyata)()
        except DataBelumAda as e:
            sys.exit(f"{m} ditolak, data belum ada: {e}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
