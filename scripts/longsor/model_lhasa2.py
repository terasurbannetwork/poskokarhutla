"""Nowcast longsor kab-hari resep LHASA v2 (lantai klimatologi sebagai offset) -> data/raw/longsor/model_lhasa2/ (BUKAN public/)

Protokol: scripts/longsor/PRAREG-LHASA2.md rev. 2 (KONTRAK); berkas ini hanya melaksanakannya. Pola, penyelesai, dan penjaga dipakai ulang
lewat IMPOR dari scripts/banjir/model_kab_campur.py (milik banjir, dibekukan, TIDAK disunting; hash dikunci di pemblokir 7A2 dan di sidik).
Python stdlib saja. Label bertanggal > 2026-10-18 DIPOTONG di kode (LABEL_AKHIR); 2024 dibuang; hari DIBI g=1 ("Banjir dan Tanah Longsor") POSITIF.

Pakai:  python3 scripts/longsor/model_lhasa2.py uji                swauji tanpa jaringan, data mainan (§8 a-l, §7A2 a-d)
        python3 scripts/longsor/model_lhasa2.py pemblokir          status tiap butir §7A: siap / BLOK / (turun ke aturan tertulis)
        python3 scripts/longsor/model_lhasa2.py baris              kab, sel, baris, wilayah calon (tanpa skor)
        python3 scripts/longsor/model_lhasa2.py latih --kering     alur penuh pada sel yang SUDAH ada (parsial), tidak menulis, tidak mencetak skor keterampilan
        python3 scripts/longsor/model_lhasa2.py latih [--ulang]    latih nyata (DITOLAK bila ada pemblokir BLOK)
        python3 scripts/longsor/model_lhasa2.py gerbang            lima lipatan F1-F5 + gerbang kesia-siaan §4.2 (pilihan dari latih.json)
        python3 scripts/longsor/model_lhasa2.py sidik              bekukan kandidat (commit model_lhasa2.sidik sesudahnya)
        python3 scripts/longsor/model_lhasa2.py buka --kering | buka [--awal YYYY-MM-DD]

Cache lengas (butir 7A4, pembaca ada, fitur sm BELUM ditulis): data/raw/longsor/sm_era5/<lat>_<lon>.json.gz, kunci = pusat sel 0,5 derajat
format "%.2f_%.2f" (mis. -6.75_107.75.json.gz); isi {"awal": "YYYY-MM-DD", "sm": [rerata soil_moisture_0_to_7cm dan 7_to_28cm akhir hari WIB, satu per hari]}.
"""
import array, bisect, datetime as dt, gzip, hashlib, importlib.util, inspect, json, math, os, random, subprocess, sys, tempfile
from collections import defaultdict

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR_LONGSOR = os.path.join(AKAR, "scripts/longsor")


def _muat(nama, jalur):
    """Muat modul lewat importlib dengan nama unik (kejadian.py dan umum.py ada di banjir DAN longsor: impor telanjang bentrok)."""
    sys.path.insert(0, os.path.dirname(jalur))
    try:
        s = importlib.util.spec_from_file_location(nama, jalur)
        m = importlib.util.module_from_spec(s)
        sys.modules[nama] = m
        s.loader.exec_module(m)
    finally:
        sys.path.remove(os.path.dirname(jalur))
    return m


# --- modul longsor DULU (sebelum model_kab_campur), supaya swauji k3 membandingkan keadaan sebelum/sesudah impor banjir
RUMUS = _muat("longsor_rumus", os.path.join(DIR_LONGSOR, "rumus.py"))
sys.modules.setdefault("rumus", RUMUS)
DASAR = _muat("longsor_dasar", os.path.join(DIR_LONGSOR, "dasar.py"))
sys.modules.setdefault("dasar", DASAR)
LM = _muat("longsor_model", os.path.join(DIR_LONGSOR, "model.py"))


def _toy_uji_balik_v1():
    """Keluaran model.uji_balik v1 pada data mainan tetap (pembeda swauji k3: sebelum vs sesudah impor model_kab_campur)."""
    r = random.Random(1)
    awal = dt.date(2017, 1, 1)
    hari = (dt.date(2025, 12, 31) - awal).days + 1
    sel = {DASAR.kunci_sel(-6.75, 107.75): [r.randint(0, 150) if r.random() < .3 else 0 for _ in range(hari)],
           DASAR.kunci_sel(-6.25, 107.75): [r.randint(0, 150) if r.random() < .3 else 0 for _ in range(hari)]}
    kecs = [{"id": "a|K1|A", "prov": "a", "kab": "K1", "lat": -6.9, "lon": 107.6}, {"id": "a|K2|B", "prov": "a", "kab": "K2", "lat": -6.4, "lon": 107.6}]
    kerent = {"kec": ["a|K1|A", "a|K2|B"], "k": [[0, 0, 0, 0, 0, 0.9], [0, 0, 0, 0, 0, 0.1]]}
    dib = [(dt.date(2023, 1, 1) + dt.timedelta(days=i)).isoformat() for i in range(0, 700, 3)]
    kej = {"kab": ["a|K1", "a|K2"], "dibi": [(t, 0, 1, 0) for t in dib], "glc": []}
    o = LM.uji_balik(kej, kecs, kerent, (awal, sel))
    return json.dumps({k: o[k] for k in ("auc", "cakupan", "kelas", "vonis")}, sort_keys=True)


_ANTES = {"konst": repr((LM.LATIH, LM.UJI_TAHUN, LM.MULAI, LM.CN_BAWAAN)), "uji_balik": _toy_uji_balik_v1()}

sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
import model_kab_campur as KC   # noqa: E402  (impor menambal MK.LATIH banjir; TIDAK menyentuh konstanta longsor, dibuktikan swauji k3)
sys.path.remove(os.path.join(AKAR, "scripts/banjir"))
UL, K2, G = KC.UL, KC.K2, KC.G
alarm_sebanyak = KC.MK.alarm_sebanyak   # alarm = n skor tertinggi, seri dipecah acak biji 11

KELUAR = os.path.join(AKAR, "data/raw/longsor/model_lhasa2")
MENTAH = os.path.join(AKAR, "data/raw/longsor")
HUJAN = os.path.join(MENTAH, "hujan.json")
SM_DIR = os.path.join(MENTAH, "sm_era5")
PROTOKOL = os.path.join(DIR_LONGSOR, "PRAREG-LHASA2.md")
SIDIK_JEJAK = os.path.join(DIR_LONGSOR, "model_lhasa2.sidik")
KEJADIAN = os.path.join(AKAR, "public/longsor/data/kejadian.json")
LOGBOOK = os.path.join(AKAR, "public/data/logbook_kejadian.json")
GEO_KEC = os.path.join(AKAR, "public/geo/kecamatan")
KERENTANAN = os.path.join(AKAR, "public/longsor/data/kerentanan.json")
PVMBG = os.path.join(AKAR, "public/longsor/data/pvmbg.json")
PENDUDUK = os.path.join(AKAR, "public/data/penduduk.json")
DESA = os.path.join(AKAR, "public/data/desa_cari.json")
WORLDCOVER = os.path.join(AKAR, "data/raw/banjir/fitur/worldcover")
GAGAL_HUJAN = os.path.join(MENTAH, "hujan_gagal.json")   # penanda manual: daftar kunci sel yang dinyatakan gagal SESUDAH panen tuntas (7A1)
HASH_CAMPUR = "93d38074895bb88ae621f143a48011380faac3b5accf2277c17e53b9e351708b"   # sha256 model_kab_campur.py yang dibekukan (sidik b7afd76dc61da3d0)
SIDIK_CAMPUR = "b7afd76dc61da3d0"

HARI0 = dt.date(2017, 1, 1)
LATIH_TAHUN = (2017, 2018, 2019, 2020, 2021, 2022, 2023, 2025, 2026)
LIPATAN = {1: 2021, 2: 2022, 3: 2023, 4: 2025, 5: 2026}           # F1-F4 memilih, F5 diagnostik (§4.2)
LABEL_AKHIR = dt.date(2026, 10, 18)                               # label sesudah ini DIPOTONG di kode (§2.2)
AKHIR_BARIS = dt.date(2026, 10, 17)                               # baris terakhir: y1 (+-1 hari) butuh e+1 <= LABEL_AKHIR
PROSPEKTIF_AKHIR = dt.date(2027, 4, 30)
BUANG_TAHUN = 2024
WARMUP = 14                                                       # a14 butuh e-14 (A-10: jendela di luar awal deret -> baris tidak dibentuk)
WIB = KC.WIB
BIJI = 11
ALARM = {"waspada": 0.10, "siaga": 0.03, "level3": 0.01, "level4": 0.003}
TAU_GRID, TAUW_GRID = (0.05, 0.10, 0.25), (0.02, 0.05)
SYARAT_WIL = {"n_kab": 15, "P_w": 200, "T_w": 4, "T_min_positif": 10}
NEG_LAJU = 0.04                       # PILIHAN KODE (bukan protokol): negatif latih disampel 4% berbobot 25; lantai/alarm/skor memakai SEMUA baris
B_GAMMA = 500
M_KELUARGA = 10
Q_LO, Q_HI = 0.0025, 0.9975           # 2,5%/10 satu-sisi -> selang tengah 99,5%
ULANG_GERBANG, ULANG_BUKA = 5000, 10000    # ULANG_BUKA diturunkan dari 20.000 setelah diukur (A-27): 20.000 ~ 2,8 jam untuk dua kandidat pada ~450 rb baris
ILEWS = (61.0, 91.0)                  # P1 mm, P3 mm (Hidayat dkk. 2019; BELUM DICEK §7B12)
MUNTOHAR = (7.83, -0.328, 2, 18)      # I = 7,83 D^-0,328 mm/jam, D = 2..18 hari
MDE_POSITIF_PROSPEKTIF = 1625         # y1 prospektif taksiran: 650 y0 x 2,5 (tengah 400-900, §5.5; BELUM DICEK)
WIL_CALON = KC.WIL_CALON
PENAMPUNG = KC.PENAMPUNG
FITUR_ALL = ["rH", "a2", "a7", "a14", "lr_lereng", "lr_sesar", "lr_pv"]
TERSEDIA = set(FITUR_ALL)             # sm/rH_sm (7A4) dan lr_lahan (7A5) TIDAK ADA -> S2, S3 dicoret; S3' = S1 + lr_lahan ikut dicoret
SETS = {"S0": ["rH", "a2", "a7", "a14"], "S1": ["rH", "a2", "a7", "a14", "lr_lereng", "lr_sesar", "lr_pv"]}
SETS["S2"] = SETS["S1"] + ["sm", "rH_sm"]
SETS["S3"] = SETS["S2"] + ["lr_lahan"]
SETS["S3p"] = SETS["S1"] + ["lr_lahan"]
TANPA_P2 = {"sm", "rH_sm", "swi", "swi_rH"}
KRITERIA = {
    "model": "eta = logit(p0) + sum beta*z; offset 1, tanpa intersep, beta >= 0, L2 tau, hujan hari-H/P99 + anteseden terpisah + statis peringkat x rH; LH-N nasional, LH-W berpooling per wilayah; Platt per wilayah pada y0, LOYO bersarang",
    "tau": list(TAU_GRID), "tau_w": list(TAUW_GRID), "alarm": ALARM, "m": M_KELUARGA, "selang": [Q_LO, Q_HI], "bootstrap": [ULANG_GERBANG, ULANG_BUKA], "biji": BIJI,
    "lulus": "batas bawah dTSS(C-klim) Waspada & Siaga, dAUC dalam-kab(C-klim), dTSS(C-B2b), dTSS(C-hujan v1), dTSS(C-ILEWS kuning & merah), dTSS(C-Muntohar), dTSS(C-v1) semuanya > 0",
    "tidak_lulus": "dTSS(C-klim) Waspada titik <= 0, atau batas atas dTSS(C-B2b) < 0, atau batas atas dTSS(C-ILEWS) < 0",
    "pembekuan": "dTSS(C-klim) Waspada gabungan <= 0 atau positif pada < 4 dari 5 lipatan -> dihentikan", "label_akhir": str(LABEL_AKHIR),
    "buka_paling_cepat": str(KC.BUKA_PALING_CEPAT), "latih_tahun": list(LATIH_TAHUN), "lipatan": LIPATAN, "buang_tahun": BUANG_TAHUN, "g1": "positif",
}


class DataBelumAda(Exception):
    """Sumber belum ada: pemblokir menyebutnya; aturan jatuh tertulis (§3.2, §7A) dipakai bila bukan BLOK."""


def J(nama):
    return os.path.join(KELUAR, nama)


# ================================================================== A. waktu dan label (§2)
def idx_tgl(d, mulai=None):
    return (d - (HARI0 if mulai is None else mulai)).days


def tgl_idx(i, mulai=None):
    return (HARI0 if mulai is None else mulai) + dt.timedelta(i)


def potong_tanggal(tanggal, akhir=None):
    """Buang tanggal (date/str) bertanggal > LABEL_AKHIR dan tahun BUANG_TAHUN. -> list[date]."""
    akhir = LABEL_AKHIR if akhir is None else akhir
    kd = lambda x: x.date() if isinstance(x, dt.datetime) else x if isinstance(x, dt.date) else dt.date.fromisoformat(str(x)[:10])
    return [d for d in map(kd, tanggal) if d <= akhir and d.year != BUANG_TAHUN]


def label_dibi(kej, kabs, akhir=None, tanpa_g1_murni=False):
    """kejadian.json -> ({kab: {date}} hari y0 (g=0 DAN g=1 POSITIF), {kab: {date}} g=1 murni, n_kab_tak_terpetakan). Dipotong di kode."""
    ada = set(kabs)
    g0, g1 = defaultdict(set), defaultdict(set)
    hilang = set()
    for tgl, ki, _n, gab in kej["dibi"]:
        nama = kej["kab"][ki]
        if nama not in ada:
            hilang.add(nama)
            continue
        for d in potong_tanggal([tgl], akhir):
            (g1 if gab else g0)[nama].add(d)
    murni = {k: g1[k] - g0.get(k, set()) for k in g1}
    pos = {k: g0.get(k, set()) | g1.get(k, set()) for k in set(g0) | set(g1)}
    if tanpa_g1_murni:
        pos = {k: v - murni.get(k, set()) for k, v in pos.items()}
    return pos, murni, len(hilang)


JENIS_LB_LONGSOR = {"longsor", "banjir_longsor"}


def label_logbook(lb, ke_kab, akhir=None):
    """logbook_kejadian.json['kejadian'] -> {kab: {date}} hari `mulai` WIB kejadian longsor. mulai None hanya bila terlihat[0] >= 2026-01-01. Dipotong di kode."""
    out = defaultdict(set)
    for e in lb:
        if e.get("jenis") not in JENIS_LB_LONGSOR or not e.get("kab_kode") or e["kab_kode"] not in ke_kab:
            continue
        m = e.get("mulai") or e["terlihat"][0]
        if e.get("mulai") is None and e["terlihat"][0] < "2026-01-01":
            continue
        for d in potong_tanggal([m], akhir):
            out[ke_kab[e["kab_kode"]]].add(d)
    return dict(out)


def peta_kode_kab(kabs, desa=None):
    """{kode 'pp.kk': 'pp|nama'} lewat UL.kode_geo (banjir)."""
    kab_desa = (desa if desa is not None else json.load(open(DESA)))["kab"]
    return {v: f"{p}|{n}" for (p, n), v in UL.kode_geo(kab_desa, [tuple(k.split("|", 1)) for k in kabs]).items()}


# ================================================================== B. kab, sel, fitur statis (§3.1, §3.2)
def kab_valid(nama):
    return nama not in (None, "", "None")


def peta_kab(kecs):
    """-> (kabs terurut 'prov|kab', {kab: [kunci sel]}, {kab: [indeks kec]}). Lima poligon kab bernama 'None' DIKELUARKAN (§2.1)."""
    sel, kec = {}, {}
    for n, k in enumerate(kecs):
        if not kab_valid(k["kab"]):
            continue
        kb = f'{k["prov"]}|{k["kab"]}'
        sel.setdefault(kb, set()).add(DASAR.kunci_sel(*DASAR.sel_hujan(k["lat"], k["lon"])))
        kec.setdefault(kb, []).append(n)
    return sorted(sel), {k: sorted(v) for k, v in sel.items()}, kec


def luas_cincin_km2(r):
    a = 0.0
    for i in range(len(r) - 1):
        a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    lat = sum(p[1] for p in r) / max(1, len(r))
    return abs(a) / 2 * 111.32 * math.cos(math.radians(lat)) * 110.57


def statis_kab(kerent, kecs, kec_idx, penduduk=None):
    """kerentanan.json (kolom BERNAMA: lereng_p75, sesar_km, pv_zona; kolom lain termasuk prakiraan Des-2024 TIDAK dibaca) -> ({kab: {lereng, sesar, pv|None}}, {kab: a_k|None}).
    lereng = rerata p75 kec; sesar = rerata -log1p(km); pv = rerata zona statis kec tercakup; a_k = log(penduduk / luas km2) (luas = jumlah luas cincin luar kec)."""
    kol = {n: i for i, n in enumerate(kerent["kolom"])}
    baris = dict(zip(kerent["kec"], kerent["k"]))
    st, a = {}, {}
    for kb, idx in kec_idx.items():
        rs = [baris[kecs[n]["id"]] for n in idx if kecs[n]["id"] in baris]
        if not rs:
            continue
        pv = [r[kol["pv_zona"]] for r in rs if r[kol["pv_zona"]] is not None]
        st[kb] = {"lereng": sum(r[kol["lereng_p75"]] for r in rs) / len(rs), "sesar": sum(-math.log1p(r[kol["sesar_km"]]) for r in rs) / len(rs),
                  "pv": sum(pv) / len(pv) if pv else None}
        if penduduk is not None:
            pop = sum(penduduk["kec"].get(kecs[n]["id"], 0) for n in idx)
            luas = sum(luas_cincin_km2(r) for n in idx for r in kecs[n]["cincin"])
            a[kb] = math.log(pop / luas) if pop > 0 and luas > 0 else None
    return st, a


def peringkat(nilai):
    """Persentil 0-1 antar kab (seri = tengah); nilai None -> rerata peringkat yang ada (netral). Statis, tidak bergantung label."""
    ada = sorted(v for v in nilai if v is not None)
    if not ada:
        return [0.5] * len(nilai)
    pr = lambda v: (bisect.bisect_left(ada, v) + bisect.bisect_right(ada, v)) / 2 / len(ada)
    r = [pr(v) if v is not None else None for v in nilai]
    m = sum(x for x in r if x is not None) / len([x for x in r if x is not None])
    return [m if x is None else x for x in r]


# ================================================================== C. konteks: baris, agregat lantai, jendela hujan (§2, §3.1-3.2)
class Ctx:
    pass


def jendela_hujan(h):
    """h: tenths mm (-1 kosong) -> (a2, a7, a14): jumlah hujan e-2..e-1, e-7..e-3, e-14..e-8 (None bila memuat hari kosong atau keluar awal deret). Tidak ada yang memuat hari e."""
    n = len(h)
    P, M = [0] * (n + 1), [0] * (n + 1)
    for i, v in enumerate(h):
        P[i + 1] = P[i] + (v if v >= 0 else 0)
        M[i + 1] = M[i] + (v < 0)

    def win(a, b):
        out = [None] * n
        for e in range(a, n):
            lo, hi = e - a, e - b + 1
            if M[hi] == M[lo]:
                out[e] = P[hi] - P[lo]
        return out
    return win(2, 1), win(7, 3), win(14, 8)


def bangun_ctx(H, mulai, kabs, kab_sel, statis, a_kab, ev0, ev_lb, hari_awal, hari_akhir, neg_laju=None, tanpa=None, kec_sel=None, ev_g0=None):
    """H {kunci sel: [tenths mm]} (hujan.json), ev0 {kab: {date}} y0 (DIBI g0+g1), ev_lb {kab: {date}} logbook longsor, tanpa {kab: {date}} baris dikeluarkan (K2).
    Baris = kab-hari, hari_awal..hari_akhir, tanpa 2024 dan tanpa hari yang tetangganya (e+-1) jatuh di 2024. Terurut (tahun, kab, hari)."""
    neg_laju = NEG_LAJU if neg_laju is None else neg_laju
    c = Ctx()
    c.mulai, c.kab_keys, c.nk = mulai, list(kabs), len(kabs)
    c.ki = {k: i for i, k in enumerate(c.kab_keys)}
    c.sels = [list(kab_sel[k]) for k in c.kab_keys]
    sel_pakai = sorted({s for ss in c.sels for s in ss})
    n_hari = max(len(H[s]) for s in sel_pakai)
    c.H = {s: (H[s] if len(H[s]) == n_hari else list(H[s]) + [-1] * (n_hari - len(H[s]))) for s in sel_pakai}
    c.sel_pakai, c.n_hari, c.W, c._stat, c._F, c._kp, c._lf, c._p0, c._gam = sel_pakai, n_hari, {}, {}, {}, {}, {}, {}, {}
    c.b_gamma, c.tersedia = None, set(TERSEDIA)
    tgl = [mulai + dt.timedelta(i) for i in range(n_hari)]
    ok_stat = lambda e: e >= WARMUP and tgl[e].year != BUANG_TAHUN and tgl[e] <= AKHIR_BARIS
    c.hari_stat = defaultdict(list)
    for e in range(WARMUP, n_hari):
        if ok_stat(e):
            c.hari_stat[tgl[e].year].append(e)
    nb = lambda e: BUANG_TAHUN in (tgl[e].year, tgl[max(e - 1, 0)].year, tgl[min(e + 1, n_hari - 1)].year)
    dias = defaultdict(list)
    for e in range(WARMUP, n_hari - 1):
        if hari_awal <= tgl[e] <= hari_akhir and not nb(e):
            dias[tgl[e].year].append(e)
    c.dias = dict(dias)
    c.R_kab, c.R_e, c.R_bl, c.R_y0, c.R_g0, c.R_y1, c.R_y1d, c.sl = [], [], [], bytearray(), bytearray(), bytearray(), bytearray(), {}
    mo = [d.month for d in tgl]
    tanpa = tanpa or {}
    for th in sorted(c.dias):
        awal_th = len(c.R_kab)
        for ki, kb in enumerate(c.kab_keys):
            b0, bl = bytearray(n_hari + 2), bytearray(n_hari + 2)
            for d in ev0.get(kb, ()):
                i = (d - mulai).days
                if 0 <= i < n_hari:
                    b0[i] = 1
            for d in ev_lb.get(kb, ()):
                i = (d - mulai).days
                if 0 <= i < n_hari:
                    bl[i] = 1
            es = c.dias[th]
            g0b = b0
            if ev_g0 is not None:                                        # hari g=0 saja (sasaran v1 sendiri); bawaan = y0
                g0b = bytearray(n_hari + 2)
                for d in ev_g0.get(kb, ()):
                    i = (d - mulai).days
                    if 0 <= i < n_hari:
                        g0b[i] = 1
            if kb in tanpa:
                bu = {(d - mulai).days for d in tanpa[kb]}
                es = [e for e in es if e not in bu]
            c.R_kab.extend([ki] * len(es))
            c.R_e.extend(es)
            c.R_bl.extend(mo[e] for e in es)
            c.R_y0.extend(b0[e] for e in es)
            c.R_g0.extend(g0b[e] for e in es)
            c.R_y1d.extend(1 if (b0[e - 1] or b0[e] or b0[e + 1]) else 0 for e in es)
            c.R_y1.extend(1 if (b0[e - 1] or b0[e] or b0[e + 1] or bl[e - 1] or bl[e] or bl[e + 1]) else 0 for e in es)
        c.sl[th] = (awal_th, len(c.R_kab))
    c.n = len(c.R_kab)
    # agregat (kab, tahun, bulan) untuk lantai: w = hari, y = laju => w*y = cacah positif persis
    ag = defaultdict(lambda: [0, 0])
    for th, (a, b) in c.sl.items():
        for i in range(a, b):
            t = ag[(c.R_kab[i], th, c.R_bl[i])]
            t[0] += c.R_y0[i]
            t[1] += 1
    kunci = sorted(ag)
    c.AG = {"kab": [c.kab_keys[k[0]] for k in kunci], "tahun": [k[1] for k in kunci], "bulan": [k[2] for k in kunci],
            "w": [float(ag[k][1]) for k in kunci], "y": [ag[k][0] / ag[k][1] for k in kunci], "ki": [k[0] for k in kunci]}
    c.AGi = defaultdict(list)
    for j, t in enumerate(c.AG["tahun"]):
        c.AGi[t].append(j)
    # sampel latih (positif semua; negatif neg_laju, bobot 1/neg_laju) per tahun
    c.tr = {}
    for th, (a, b) in c.sl.items():
        r = random.Random(BIJI * 1000 + th)
        idx, wts = [], []
        for i in range(a, b):
            if c.R_y0[i]:
                idx.append(i); wts.append(1.0)
            elif neg_laju >= 1 or r.random() < neg_laju:
                idx.append(i); wts.append(1.0 if neg_laju >= 1 else 1.0 / neg_laju)
        c.tr[th] = (idx, wts)
    # statis: peringkat antar kab
    sg = [statis.get(k) or {} for k in c.kab_keys]
    c.rank = {"lr_lereng": peringkat([s.get("lereng") for s in sg]), "lr_sesar": peringkat([s.get("sesar") for s in sg]), "lr_pv": peringkat([s.get("pv") for s in sg])}
    c.a_kab = {k: a_kab.get(k) for k in c.kab_keys}
    prov = defaultdict(list)
    for k, v in c.a_kab.items():
        if v is not None:
            prov[KC.prov_dari(k)].append(v)
    c.a_dev = {k: (v - sum(prov[KC.prov_dari(k)]) / len(prov[KC.prov_dari(k)])) if v is not None else None for k, v in c.a_kab.items()}
    c.kec_sel = kec_sel or {}
    c.wilayah, c.wil_kab, c.wi_kab, c.wilayah_info = [PENAMPUNG], [PENAMPUNG] * c.nk, [0] * c.nk, None
    return c


def set_wilayah(ctx, peta):
    """peta {calon: wilayah efektif} -> ctx.wilayah (terurut), wil_kab, wi_kab."""
    ctx.wil_kab = [KC.wil_dari_kab(k, peta) for k in ctx.kab_keys]
    ctx.wilayah = sorted(set(ctx.wil_kab))
    ctx.wi_kab = [ctx.wilayah.index(w) for w in ctx.wil_kab]


def gabung_wilayah(ctx, acuan, syarat=None):
    """§3.3: calon lolos bila n_kab >= 15 DAN P_w >= 200 (positif y0 berbobot) DAN T_w >= 4 tahun dengan >= 10 positif; selain itu -> Lainnya. Hanya tahun `acuan`."""
    syarat = SYARAT_WIL if syarat is None else syarat
    ada, P, per = defaultdict(set), defaultdict(float), defaultdict(float)
    for j in range(len(ctx.AG["w"])):
        c = KC.calon_dari(KC.prov_dari(ctx.AG["kab"][j]))
        if c is None or ctx.AG["tahun"][j] not in acuan:
            continue
        ada[c].add(ctx.AG["kab"][j])
        a = ctx.AG["w"][j] * ctx.AG["y"][j]
        P[c] += a
        per[(c, ctx.AG["tahun"][j])] += a
    rinci, peta = {}, {}
    for c in WIL_CALON:
        Tw = sum(1 for t in acuan if per[(c, t)] >= syarat["T_min_positif"])
        lolos = len(ada[c]) >= syarat["n_kab"] and P[c] >= syarat["P_w"] and Tw >= syarat["T_w"]
        rinci[c] = {"n_kab": len(ada[c]), "P_w": round(P[c], 3), "T_w": Tw, "lolos": lolos}
        peta[c] = c if lolos else PENAMPUNG
    urut = sorted((c for c in WIL_CALON if peta[c] == c), key=lambda c: (-rinci[c]["P_w"], min(WIL_CALON[c]))) + ([PENAMPUNG] if PENAMPUNG in peta.values() else [])
    return {"peta": peta, "rincian": rinci, "urutan": urut, "cw_sekunder": len(set(peta.values())) < 3, "syarat": dict(syarat)}


# ================================================================== D. fitur (§3.2): statistik HANYA dari tahun `acuan`
def jendela_sel(ctx, s):
    if s not in ctx.W:
        ctx.W[s] = jendela_hujan(ctx.H[s])
    return ctx.W[s]


def stat(ctx, acuan):
    """Statistik tahun `acuan`: per sel P99 hujan harian hari basah (>= 1 mm) dan sebaran terurut a2/a7/a14. Dipakai ulang (cache kecil)."""
    key = frozenset(acuan)
    if key in ctx._stat:
        return ctx._stat[key]
    D = [e for y in sorted(key) for e in ctx.hari_stat.get(y, ())]
    per = {}
    for s in ctx.sel_pakai:
        h = ctx.H[s]
        wet = sorted(h[e] / 10 for e in D if h[e] >= 10)
        if len(wet) < 30:
            per[s] = None
            continue
        w = jendela_sel(ctx, s)
        per[s] = (wet[int(0.99 * (len(wet) - 1))], sorted(v for v in (w[0][e] for e in D) if v is not None), sorted(v for v in (w[1][e] for e in D) if v is not None),
                  sorted(v for v in (w[2][e] for e in D) if v is not None), h, w[0], w[1], w[2])
    kab = [[per[s] for s in ctx.sels[ki] if per.get(s) and per[s][1] and per[s][2] and per[s][3]] for ki in range(ctx.nk)]
    if len(ctx._stat) >= 6:
        ctx._stat.pop(next(iter(ctx._stat)))
    ctx._stat[key] = {"kab": kab, "p99": {s: (v[0] if v else None) for s, v in per.items()}}
    return ctx._stat[key]


NAN = float("nan")


def fitur(ctx, acuan, ix):
    """Fitur baris global `ix` -> {nama: array('d')} (NaN = hilang). rH = log1p(max_sel h[e]/P99_s) (hari e utuh WIB); a2/a7/a14 = persentil sel jumlah e-2..e-1 / e-7..e-3 /
    e-14..e-8, maks atas sel; lr_* = rH x peringkat(statis) (rH >= 0, peringkat 0-1: kolom interaksi nonneg)."""
    st = stat(ctx, acuan)["kab"]
    out = {n: array.array("d") for n in FITUR_ALL}
    Rk, Re, rk = ctx.R_kab, ctx.R_e, ctx.rank
    bl, log1p = bisect.bisect_left, math.log1p
    for i in ix:
        ki, e = Rk[i], Re[i]
        rm, p2, p7, p14, ada = -1.0, 0.0, 0.0, 0.0, False
        for p99, o2, o7, o14, h, w2, w7, w14 in st[ki]:
            v = h[e]
            if v < 0:
                continue
            ada = True
            r = v / (10 * p99)
            if r > rm:
                rm = r
            x = w2[e]
            if x is not None:
                q = bl(o2, x) / len(o2)
                p2 = q if q > p2 else p2
            x = w7[e]
            if x is not None:
                q = bl(o7, x) / len(o7)
                p7 = q if q > p7 else p7
            x = w14[e]
            if x is not None:
                q = bl(o14, x) / len(o14)
                p14 = q if q > p14 else p14
        if not ada:
            for n in FITUR_ALL:
                out[n].append(NAN)
            continue
        rh = log1p(rm)
        out["rH"].append(rh); out["a2"].append(p2); out["a7"].append(p7); out["a14"].append(p14)
        out["lr_lereng"].append(rh * rk["lr_lereng"][ki]); out["lr_sesar"].append(rh * rk["lr_sesar"][ki]); out["lr_pv"].append(rh * rk["lr_pv"][ki])
    return out


def F_tr(ctx, acuan, th):
    k = ("tr", frozenset(acuan), th)
    if k not in ctx._F:
        ctx._F[k] = fitur(ctx, acuan, ctx.tr[th][0])
    return ctx._F[k]


def F_ev(ctx, acuan, th):
    k = ("ev", frozenset(acuan), th)
    if k not in ctx._F:
        if len(ctx._F) > 400:
            for kk in [kk for kk in ctx._F if kk[0] == "ev"][:10]:
                ctx._F.pop(kk)
        ctx._F[k] = fitur(ctx, acuan, range(*ctx.sl[th]))
    return ctx._F[k]


# ================================================================== E. tingkat 1: lantai kab x bulan + aksesibilitas (§3.1)
def _gamma_mle(items):
    """Regresi Poisson jumlah hari berlabel, offset log hari, efek tetap provinsi (dibuang lewat kondisional): items (prov, cacah, hari, a). -> gamma."""
    grp = defaultdict(list)
    for p, n, d, a in items:
        grp[p].append((n, d, a))
    g = 0.0
    for _ in range(30):
        sk = inf = 0.0
        for lst in grp.values():
            N = sum(n for n, _, _ in lst)
            if N <= 0 or len(lst) < 2:
                continue
            ws = [d * math.exp(max(-50, min(50, g * a))) for _, d, a in lst]
            S = sum(ws)
            if S <= 0:
                continue
            m1 = sum(w * a for w, (_, _, a) in zip(ws, lst)) / S
            m2 = sum(w * a * a for w, (_, _, a) in zip(ws, lst)) / S
            sk += sum(n * a for n, _, a in lst) - N * m1
            inf += N * (m2 - m1 * m1)
        if inf <= 1e-12:
            break
        step = max(-1.0, min(1.0, sk / inf))
        g += step
        if abs(step) < 1e-9:
            break
    return g


def gamma_taksir(ctx, tahun):
    """gamma ditetapkan SEKALI per pencocokan (tahun `tahun`): bila CI persentil 95% bootstrap kab (B = B_GAMMA) <= 0 atau melewati 0 -> 0 (tanpa klaim aksesibilitas)."""
    key = frozenset(tahun)
    if key in ctx._gam:
        return ctx._gam[key]
    n, d = defaultdict(float), defaultdict(float)
    for t in key:
        for j in ctx.AGi.get(t, ()):
            k = ctx.AG["kab"][j]
            n[k] += ctx.AG["w"][j] * ctx.AG["y"][j]
            d[k] += ctx.AG["w"][j]
    ks = [k for k in n if ctx.a_dev.get(k) is not None]
    items = [(KC.prov_dari(k), n[k], d[k], ctx.a_dev[k]) for k in ks]
    g0 = _gamma_mle(items) if len(items) >= 10 else 0.0
    res = 0.0
    if g0 > 0:
        B = ctx.b_gamma if ctx.b_gamma is not None else B_GAMMA
        r = random.Random(BIJI)
        xs = sorted(_gamma_mle([items[r.randrange(len(items))] for _ in items]) for _ in range(B))
        res = g0 if xs[int(0.025 * (B - 1))] > 0 else 0.0
    ctx._gam[key] = res
    return res


def rk_aksesibilitas(mod, kabs, a_dev, g):
    """rk kab saat gamma > 0 (PRAREG §3.1 "Prior kab menjadi r_prov x exp(gamma (a_k - rerata_prov(a)))"): prior eksponensial dihaluskan dengan cacah kab sendiri (bobot HALUS)."""
    n, d = defaultdict(float), defaultdict(float)
    for kunci, (a_, b_) in mod["kb"].items():
        k = kunci.rsplit("|", 1)[0]
        n[k] += a_
        d[k] += b_
    out = {}
    for k in kabs:
        p = KC.prov_dari(k)
        u = p if mod["n_kab_prov"].get(p, 0) >= 3 else "pulau:" + str(KC.calon_dari(p))
        out[k] = (n[k] + KC.HALUS * mod["ru"].get(u, mod["r0"]) * math.exp(g * (a_dev.get(k) or 0.0))) / (d[k] + KC.HALUS)
    return out


def lantai_fit(ctx, tahun):
    """p0 dari baris agregat tahun `tahun` saja (penghalusan CAMPUR §3.1 persis lewat KC.lantai_fit). gamma > 0: prior kab = r_prov(b) x exp(gamma (a_k - rerata_prov(a)))."""
    key = frozenset(tahun)
    if key not in ctx._lf:
        ix = [j for t in sorted(key) for j in ctx.AGi.get(t, ())]
        mod = KC.lantai_fit(ctx.AG, ix)
        g = gamma_taksir(ctx, key)
        mod["gamma"] = g
        if g > 0:                                   # A-3 rev.: exp(gamma*dev) hanya PRIOR; laju kab sendiri tetap masuk: rk = (n_k + HALUS*ru*exp)/(d_k + HALUS)
            mod["rk"] = rk_aksesibilitas(mod, ctx.kab_keys, ctx.a_dev, g)
        ctx._lf[key] = mod
    return ctx._lf[key]


def p0_loyo(ctx, acuan):
    """{(ki, tahun, bulan): p0} untuk tahun `acuan`, tiap tahun z dari lantai yang dilatih tanpa z (LOYO: lantai tak pernah melihat label tahun barisnya)."""
    key = frozenset(acuan)
    if key not in ctx._p0:
        out = {}
        for z in key:
            mod = lantai_fit(ctx, key - {z})
            for ki, kb in enumerate(ctx.kab_keys):
                for b in range(1, 13):
                    out[(ki, z, b)] = KC.lantai_p(mod, kb, b)
        ctx._p0[key] = out
    return ctx._p0[key]


# ================================================================== F. model, Platt, lipatan (§3.2-3.4)
def nama_set(cfg):
    s = {f for fs in cfg["set"].values() for f in fs}
    return [f for f in FITUR_ALL if f in s]


def cfg_dari(ctx, set_, tau, tau_w):
    base = list(SETS[set_]) if isinstance(set_, str) else list(set_)
    return {"tau": tau, "tau_w": tau_w, "set": {wl: [f for f in base if f in ctx.tersedia] for wl in ctx.wilayah}}


def cocok(ctx, acuan, cfg):
    """Cocokkan satu model pada `acuan`: lantai LOYO, fitur berstatistik LOYO (tahun z memakai acuan\\{z}), standardisasi baris latih, penyelesai KC.selesai."""
    acuan = frozenset(acuan)
    nama = nama_set(cfg)
    p0 = p0_loyo(ctx, acuan)
    mentah, y, w, off, g = {n: [] for n in nama}, [], [], [], []
    n_gugur = 0
    for th in sorted(acuan):
        idx, wts = ctx.tr[th]
        F = F_tr(ctx, acuan - {th}, th)
        for k, i in enumerate(idx):
            if F["rH"][k] != F["rH"][k]:
                n_gugur += 1
                continue
            for n in nama:
                mentah[n].append(F[n][k])
            y.append(ctx.R_y0[i]); w.append(wts[k]); g.append(ctx.wil_kab[ctx.R_kab[i]])
            off.append(KC.offset_dari(p0[(ctx.R_kab[i], th, ctx.R_bl[i])]))
    if not y:
        raise ValueError("tidak ada baris latih")
    mu, sd = KC.standarisasi([[mentah[n][r] for n in nama] for r in range(len(y))], w) if nama else ([], [])
    Z = [[(mentah[n][r] - mu[j]) / sd[j] for j, n in enumerate(nama)] for r in range(len(y))]
    # §3.3: "Lainnya" hanya koefisien nasional (tanpa delta_w): baris Lainnya memakai blok beta_nas langsung (g = -1); pooling hanya wilayah efektif lain
    pool_w = [wl for wl in ctx.wilayah if wl != PENAMPUNG] if cfg.get("tau_w") is not None else list(ctx.wilayah)
    pooled = cfg.get("tau_w") is not None and bool(pool_w)
    gi = [(pool_w.index(wl) if wl in pool_w else -1) for wl in g] if pooled else [ctx.wilayah.index(wl) for wl in g]
    W = len(pool_w) if pooled else len(ctx.wilayah)
    mask = [[(n in cfg["set"][wl]) for n in nama] for wl in pool_w]
    hasil = KC.selesai(Z, y, w, off, gi, W, cfg["tau"], cfg.get("tau_w") if pooled else None, mask, [cfg["tau"]] * len(nama), [False] * len(nama))
    koef_w = {wl: (hasil["koef"][pool_w.index(wl)] if pooled and wl in pool_w else hasil["beta"]) for wl in ctx.wilayah}
    return {"nama": nama, "mu": mu, "sd": sd, "koef": hasil["koef"], "koef_w": koef_w, "beta": hasil["beta"], "lantai": lantai_fit(ctx, acuan), "acuan": sorted(acuan),
            "iter": hasil["iter"], "grad": hasil["grad"], "terjepit": hasil["terjepit"], "n_latih": len(y), "n_gugur": n_gugur}


def eta_baris(ctx, mod, ix, F):
    """Logit akhir baris `ix` (F sejajar ix); fitur hilang -> 0 (netral)."""
    out, tab, nm = [], {}, mod["nama"]
    cols = [F[n] for n in nm]
    for k, i in enumerate(ix):
        ki, b = ctx.R_kab[i], ctx.R_bl[i]
        if (ki, b) not in tab:
            tab[(ki, b)] = KC.offset_dari(KC.lantai_p(mod["lantai"], ctx.kab_keys[ki], b))
        co = mod["koef_w"][ctx.wil_kab[ki]]
        e = tab[(ki, b)]
        for j, col in enumerate(cols):
            v = col[k]
            if v == v:
                e += co[j] * (v - mod["mu"][j]) / mod["sd"][j]
        out.append(e)
    return out


def platt_aman(eta, y, w, wil, berfitur):
    """A-28: Platt per wilayah (KC.platt_wil); wilayah dengan b1 <= 0 atau satu kelas (netral) jatuh ke Platt NASIONAL model yang sama (seluruh logit OOF semua wilayah).
    b1 nasional <= 0: model berfitur -> ValueError (temuan sah); klimatologi -> netral. -> (platt per wilayah, daftar wilayah yang jatuh). Daftar hanya dicatat, tidak memengaruhi seleksi/vonis."""
    pl = KC.platt_wil(eta, y, w, wil)
    nas = K2.platt_w(eta, y, w) if 0 < sum(y) < len(y) else dict(KC.PLATT_NETRAL)
    if nas != KC.PLATT_NETRAL and not nas["b1"] > 0:
        if berfitur:
            raise ValueError(f"Platt nasional b1 = {nas['b1']:.4g} <= 0 (skor terbalik), model ditolak")
        nas = dict(KC.PLATT_NETRAL)
    jatuh = []
    for wl_ in sorted(pl):
        if pl[wl_] == KC.PLATT_NETRAL or not pl[wl_]["b1"] > 0:
            pl[wl_] = dict(nas)
            jatuh.append(wl_)
    return pl, jatuh


def cocok_penuh(ctx, acuan, cfg):
    """Model + Platt per wilayah dari logit luar-lipatan LOYO BERSARANG, Platt dilatih pada y0 (bukan y1)."""
    acuan = frozenset(acuan)
    k = (json.dumps(cfg, sort_keys=True), acuan)
    if k in ctx._kp:
        return ctx._kp[k]
    mod = cocok(ctx, acuan, cfg)
    eta, y, w, wil = [], [], [], []
    for z in sorted(acuan):
        mz = cocok(ctx, acuan - {z}, cfg)
        idx, wts = ctx.tr[z]
        F = F_tr(ctx, acuan - {z}, z)
        eta += eta_baris(ctx, mz, idx, F)
        y += [ctx.R_y0[i] for i in idx]; w += wts; wil += [ctx.wil_kab[ctx.R_kab[i]] for i in idx]
    pl, jatuh = platt_aman(eta, y, w, wil, bool(mod["nama"]))
    ctx._kp[k] = {"model": mod, "platt": pl, "platt_jatuh": jatuh}
    return ctx._kp[k]


def skor_penuh(ctx, kp, ix, F):
    return KC.pakai_platt_wil(kp["platt"], eta_baris(ctx, kp["model"], ix, F), [ctx.wil_kab[ctx.R_kab[i]] for i in ix])


def lipat(ctx, cfg, tahun_uji):
    """Satu lipatan luar: latih pada tahun LATIH_TAHUN < tahun_uji, skor SEMUA kab-hari tahun_uji. -> (indeks baris, p)."""
    A = frozenset(t for t in LATIH_TAHUN if t < tahun_uji)
    kp = cocok_penuh(ctx, A, cfg)
    ix = list(range(*ctx.sl[tahun_uji]))
    return ix, skor_penuh(ctx, kp, ix, F_ev(ctx, A, tahun_uji))


def evaluator(ctx):
    cache = {}

    def evaluasi(cfg):
        k = json.dumps(cfg, sort_keys=True)
        if k not in cache:
            ll = []
            for f in (1, 2, 3, 4):
                ix, p = lipat(ctx, cfg, LIPATAN[f])
                ll.append(G.logloss(p, [ctx.R_y0[i] for i in ix]))
            cache[k] = ll
        return cache[k]
    return evaluasi


def pilih_semua(ctx, evaluasi, cw_sekunder=False):
    """§3.3: tau (CN, S1) -> tau_w (CW, S1) -> set nasional (CN) lewat aturan satu-SE KC.satu_se pada logloss F1-F4 (urutan paling sederhana dulu). Set yang memuat fitur
    tak tersedia (S2, S3, S3') DICORET. -> {tau, tau_w, set, log}."""
    S1_ = SETS["S1"]
    tau = KC.satu_se([(t, evaluasi(cfg_dari(ctx, S1_, t, None))) for t in sorted(TAU_GRID)])
    tw = KC.satu_se([(t, evaluasi(cfg_dari(ctx, S1_, tau, t))) for t in sorted(TAUW_GRID)]) if not cw_sekunder else None
    kand = [(ns, evaluasi(cfg_dari(ctx, ns, tau, None))) for ns in ("S0", "S1", "S2", "S3", "S3p") if all(f in ctx.tersedia for f in SETS[ns])]
    ns = KC.satu_se(kand)
    return {"tau": tau, "tau_w": tw, "set": ns, "log": {"kandidat_set": {k: round(sum(v) / len(v), 6) for k, v in kand}, "dicoret": [s for s in SETS if not all(f in ctx.tersedia for f in SETS[s])],
                                                         "cw_sekunder": cw_sekunder}}


# ================================================================== G. ukuran: TSS, alarm, gerbang kesia-siaan (§4.2, §5.1)
def kontingensi(alarm, y):
    t = [0, 0, 0, 0]
    for a, yy in zip(alarm, y):
        t[0 if a and yy else 1 if a else 2 if yy else 3] += 1
    return t


def tss_dari(t):
    tp, fp, fn, tn = t
    return (tp / (tp + fn) if tp + fn else 0.0) - (fp / (fp + tn) if fp + tn else 0.0)


def sedi_dari(t):
    tp, fp, fn, tn = t
    H, F = tp / (tp + fn) if tp + fn else 0.0, fp / (fp + tn) if fp + tn else 0.0
    if min(H, F) <= 0 or max(H, F) >= 1:
        return None
    a, b = math.log(F), math.log(H)
    c, d = math.log(1 - F), math.log(1 - H)
    return (a - b - c + d) / (a + b + c + d)


def n_alarm(n, frac):
    return max(1, int(round(frac * n)))


def gerbang_lipatan(ctx, cfg_kand):
    """Lima lipatan F1-F5: dTSS(C-klim) Waspada (alarm 10% kab-hari, y1) per lipatan dan gabungan (konfusi dijumlah). cfg_kand {nama: cfg}. -> {nama: {...}}, blok untuk MDE."""
    klim = cfg_dari(ctx, [], 0.05, None)
    jum = {n: [0, 0, 0, 0] for n in list(cfg_kand) + ["klim"]}
    per = {n: [] for n in cfg_kand}
    blok = {n: defaultdict(lambda: [0] * 8) for n in cfg_kand}
    for f in (1, 2, 3, 4, 5):
        th = LIPATAN[f]
        ix, pk = lipat(ctx, klim, th)
        y = [ctx.R_y1[i] for i in ix]
        na = n_alarm(len(ix), ALARM["waspada"])
        ak = alarm_sebanyak(pk, na)
        tk = kontingensi(ak, y)
        jum["klim"] = [a + b for a, b in zip(jum["klim"], tk)]
        for nm, cfg in cfg_kand.items():
            _, pc = lipat(ctx, cfg, th)
            ac = alarm_sebanyak(pc, na)
            tc = kontingensi(ac, y)
            jum[nm] = [a + b for a, b in zip(jum[nm], tc)]
            per[nm].append(tss_dari(tc) - tss_dari(tk))
            for k, i in enumerate(ix):
                b = blok[nm][(ctx.R_kab[i], th, ctx.R_bl[i])]
                b[(0 if ac[k] and y[k] else 1 if ac[k] else 2 if y[k] else 3)] += 1
                b[4 + (0 if ak[k] and y[k] else 1 if ak[k] else 2 if y[k] else 3)] += 1
    out = {}
    for nm in cfg_kand:
        gab = tss_dari(jum[nm]) - tss_dari(jum["klim"])
        out[nm] = {"dtss_lipatan": [round(x, 5) for x in per[nm]], "dtss_gabungan": round(gab, 5), **KC.gerbang_pembekuan(gab, per[nm])}
    return out, blok


def mde_dari_blok(blok, n_pos_pros=None, ulang=100, biji=5):
    """§5.5: SE dTSS (C-klim) dari bootstrap blok kab x bulan-tahun pada lipatan F1-F5 (5 biji x `ulang`), diskalakan sqrt(n_pos_lipatan / n_pos_prospektif);
    mde = z(0,9975) SE, mde_80 = (z + 0,8416) SE. Taksiran (BELUM DICEK), bukan hasil."""
    n_pos_pros = MDE_POSITIF_PROSPEKTIF if n_pos_pros is None else n_pos_pros
    kunci = sorted(blok)
    npos = sum(blok[k][0] + blok[k][2] for k in kunci) or 1
    ses = []
    for sd_ in range(biji):
        r, xs = random.Random(sd_ + 1), []
        for _ in range(ulang):
            a, b = [0, 0, 0, 0], [0, 0, 0, 0]
            for k in (r.choice(kunci) for _ in kunci):
                for j in range(4):
                    a[j] += blok[k][j]; b[j] += blok[k][4 + j]
            xs.append(tss_dari(a) - tss_dari(b))
        m = sum(xs) / len(xs)
        ses.append(math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1)))
    se = sum(ses) / len(ses) * math.sqrt(npos / n_pos_pros)
    z = 2.8070
    return {"se": round(se, 5), "mde": round(z * se, 5), "mde_80": round((z + 0.8416) * se, 5), "n_pos_lipatan": npos, "n_pos_prospektif_taksir": n_pos_pros,
            "se_skala": se * math.sqrt(n_pos_pros)}   # SE x sqrt(positif): SE nyata = se_skala / sqrt(positif y1 prospektif nyata) (P3)


def mde80_nyata(se_skala, n_pos_nyata):
    """mde_80 pada positif y1 prospektif NYATA (bukan taksiran perencanaan)."""
    return (2.8070 + 0.8416) * se_skala / math.sqrt(max(1, n_pos_nyata))


# ================================================================== H. pembanding (§3.5): skor ordinal/kontinu per baris
def muntohar_skor(h_tenths, e):
    """max_{D=2..18} rerata intensitas (mm/jam) hari e-D+1..e dibagi I(D) = 7,83 D^-0,328. Hari kosong dihitung 0. Alarm alami bila >= 1."""
    a, b, d0, d1 = MUNTOHAR
    best, s = 0.0, 0.0
    for D in range(1, d1 + 1):
        if e - D + 1 < 0:
            break
        v = h_tenths[e - D + 1]
        s += v if v > 0 else 0
        if D >= d0:
            best = max(best, (s / 10 / (24 * D)) / (a * D ** b))
    return best


def ilews_skor(h_tenths, e):
    """Skor ordinal 0/1/2: kuning = tepat satu ambang (P1 >= 61 mm ATAU P3 >= 91 mm), merah = keduanya. P1 hari e, P3 e-2..e."""
    p1 = max(h_tenths[e], 0) / 10
    p3 = sum(max(h_tenths[j], 0) for j in range(max(0, e - 2), e + 1)) / 10
    return int(p1 >= ILEWS[0]) + int(p3 >= ILEWS[1])


def penilai_lain(ctx, ix):
    """Skor pembanding untuk baris `ix` (maks atas sel kab): hujan (r7/P95 tahun LM.LATIH, hujan-saja v1), v1, v2 (kerentanan.json S/S_pv x hujan), ilews, muntohar.
    ctx.kec_sel[ki] = [(S_v1, S_v2, kunci sel)]; tanpanya v1/v2 = None."""
    awal, hasil = ctx.mulai, {n: [] for n in ("hujan", "v1", "v2", "ilews", "muntohar")}
    p95 = {}
    r7 = {}
    for s in ctx.sel_pakai:
        r7[s] = RUMUS.jumlah7(ctx.H[s])
        p95[s] = LM.p95_sel({s: ctx.H[s]}, awal, *LM.LATIH).get(s)
    for i in ix:
        ki, e = ctx.R_kab[i], ctx.R_e[i]
        t_sel = {s: (r7[s][e] / 10 / p95[s] if r7[s][e] is not None and p95.get(s) else None) for s in ctx.sels[ki]}
        tv = [t for t in t_sel.values() if t is not None]
        hasil["hujan"].append(max(tv) if tv else 0.0)
        for nm, kol in (("v1", 0), ("v2", 1)):
            v = [RUMUS.skor(sc[kol], t_sel[sc[2]]) for sc in ctx.kec_sel.get(ki, ()) if t_sel.get(sc[2]) is not None]
            hasil[nm].append(max(v) if v else 0.0)
        hasil["ilews"].append(max(ilews_skor(ctx.H[s], e) for s in ctx.sels[ki]))
        hasil["muntohar"].append(max(muntohar_skor(ctx.H[s], e) for s in ctx.sels[ki]))
    return hasil


# ================================================================== I. bootstrap blok dan vonis (§5.1-5.2)
def blok_ids(ctx, ix, skema):
    """Blok per baris: kab_musim = (kab, bulan-tahun); pulau_minggu = (calon pulau, minggu hari)."""
    if skema == "kab_musim":
        return [(ctx.R_kab[i], dt.date.fromordinal(ctx.mulai.toordinal() + ctx.R_e[i]).year, ctx.R_bl[i]) for i in ix]
    return [(str(KC.calon_dari(KC.prov_dari(ctx.kab_keys[ctx.R_kab[i]]))), ctx.R_e[i] // 7) for i in ix]


SKEMA = ("kab_musim", "pulau_minggu")


def _auc_pair(pos, neg_sorted):
    return sum(bisect.bisect_left(neg_sorted, p) + 0.5 * (bisect.bisect_right(neg_sorted, p) - bisect.bisect_left(neg_sorted, p)) for p in pos)


def auc_dalam_kab(ki_rows, y, skor, min_pos=5, min_neg=30):
    """Rerata AUC per kab (>= 5 hari y=1 dan >= 30 hari y=0), berbobot jumlah positif. -> (nilai|None, n_kab)."""
    per = defaultdict(lambda: ([], []))
    for k, yy, s in zip(ki_rows, y, skor):
        per[k][0 if yy else 1].append(s)
    tot = w = 0.0
    n = 0
    for k, (p, q) in per.items():
        if len(p) >= min_pos and len(q) >= min_neg:
            tot += len(p) * _auc_pair(p, sorted(q)) / (len(p) * len(q))
            w += len(p)
            n += 1
    return (tot / w if w else None), n


def _tabel_dauc(kis, y, bl, sc_c, sc_r, min_pos=5, min_neg=30):
    """Tabel sparse konkordansi pasangan (blok pos, blok neg) per kab untuk dua penilai. -> [(npos_blok{b:n}, nneg_blok{b:n}, [(b1, b2, Cc, Cr)])] kab memenuhi syarat penuh sampel."""
    per = defaultdict(lambda: defaultdict(lambda: ([], [], [], [])))
    for k, yy, b, a, r in zip(kis, y, bl, sc_c, sc_r):
        t = per[k][b]
        if yy:
            t[0].append(a); t[2].append(r)
        else:
            t[1].append(a); t[3].append(r)
    out = []
    for k, bs in per.items():
        npos = sum(len(v[0]) for v in bs.values())
        nneg = sum(len(v[1]) for v in bs.values())
        if npos < min_pos or nneg < min_neg:
            continue
        ent = []
        for b1, v1 in bs.items():
            if not v1[0]:
                continue
            for b2, v2 in bs.items():
                if v2[1]:
                    ent.append((b1, b2, _auc_pair(v1[0], sorted(v2[1])), _auc_pair(v1[2], sorted(v2[3]))))
        out.append(({b: len(v[0]) for b, v in bs.items() if v[0]}, {b: len(v[1]) for b, v in bs.items() if v[1]}, ent))
    return out


def selang_m(m):
    """Batas persentil bootstrap untuk m perbandingan: 2,5%/m satu-sisi dibulatkan KE BAWAH 4 desimal (m = 10 -> 0,0025 = selang 99,5%; m = 9 -> 0,0027 = 99,46%)."""
    lo = math.floor(0.025 / m * 10000 + 1e-9) / 10000
    return lo, 1 - lo


def boot_kontras(ctx, ix, y, skor, alarm, kontras, ulang=None, daya_auc=True, m=None):
    """Bootstrap blok BERPASANGAN dua skema, resampel identik untuk semua penilai. skor {nama: [..]}; alarm {nama_alarm: [bool..]};
    kontras {nama: (alarm_c, alarm_r)} dTSS; kontras AUC dalam-kab {'dauc_x': (skor_c, skor_r)} bila daya_auc. Batas bawah = terkecil lintas skema, atas = terbesar.
    -> {nama: {'nilai', 'ci': [lo, hi], skema: {...}}}."""
    ulang = ULANG_BUKA if ulang is None else ulang
    q_lo, q_hi = (Q_LO, Q_HI) if m is None else selang_m(m)
    kis = [ctx.R_kab[i] for i in ix]
    hasil = defaultdict(dict)
    dauc = {n: v for n, v in kontras.items() if n.startswith("dauc_")}
    dtss = {n: v for n, v in kontras.items() if not n.startswith("dauc_")}
    for sk in SKEMA:
        bl = blok_ids(ctx, ix, sk)
        kunci = sorted(set(bl))
        pos = {b: j for j, b in enumerate(kunci)}
        grup = defaultdict(list)
        for r, b in enumerate(bl):
            grup[b].append(r)
        cnt = {a: {b: kontingensi([alarm[a][r] for r in rs], [y[r] for r in rs]) for b, rs in grup.items()} for a in alarm}
        tabel = {n: _tabel_dauc(kis, y, bl, skor[c], skor[r_]) for n, (c, r_) in dauc.items()} if daya_auc else {}
        rg = random.Random(BIJI)

        def stat(draw):
            c = defaultdict(int)
            for b in draw:
                c[b] += 1
            out = {}
            for n, (ac, ar) in dtss.items():
                tc, tr = [0, 0, 0, 0], [0, 0, 0, 0]
                for b, m in c.items():
                    for j in range(4):
                        tc[j] += m * cnt[ac][b][j]; tr[j] += m * cnt[ar][b][j]
                out[n] = tss_dari(tc) - tss_dari(tr)
            for n, tb in tabel.items():
                num = den = 0.0
                for npb, nnb, ent in tb:
                    P = sum(c[b] * v for b, v in npb.items())
                    N = sum(c[b] * v for b, v in nnb.items())
                    if not P or not N:
                        continue
                    ac_ = sum(c[b1] * c[b2] * cc for b1, b2, cc, _ in ent)
                    ar_ = sum(c[b1] * c[b2] * cr for b1, b2, _, cr in ent)
                    num += (ac_ - ar_) / N
                    den += P
                out[n] = num / den if den else 0.0
            return out
        titik, xs = stat(kunci), defaultdict(list)
        for _ in range(ulang):
            for n, v in stat([rg.choice(kunci) for _ in kunci]).items():
                xs[n].append(v)
        for n in titik:
            v = sorted(xs[n])
            hasil[n][sk] = {"nilai": round(titik[n], 5), "ci": [round(v[int(q_lo * (ulang - 1))], 5), round(v[int(q_hi * (ulang - 1))], 5)], "blok": len(kunci)}
    for n, d in hasil.items():
        d["nilai"] = d[SKEMA[0]]["nilai"]
        d["ci"] = [min(d[s]["ci"][0] for s in SKEMA), max(d[s]["ci"][1] for s in SKEMA)]
    return dict(hasil)


def vonis_buka(k, mde80=None, tss_klim=None):
    """§5.2: LULUS / TIDAK LULUS / TIDAK MEYAKINKAN (+ '(daya rendah)'). k dari boot_kontras (kunci dtss_*/dauc_*)."""
    lo = lambda n: k[n]["ci"][0]
    hi = lambda n: k[n]["ci"][1]
    il = [n for n in ("ilews_kuning", "ilews_merah") if f"dtss_{n}" in k]     # alarm ILEWS 0 -> kontras tak terdefinisi, TIDAK ikut syarat (dilaporkan, A-ILEWS)
    syarat = {"klim_waspada": lo("dtss_klim_waspada") > 0, "klim_siaga": lo("dtss_klim_siaga") > 0, "dauc_klim": lo("dauc_klim") > 0, "b2b_waspada": lo("dtss_b2b_waspada") > 0,
              "hujan_waspada": lo("dtss_hujan_waspada") > 0, **{n: lo(f"dtss_{n}") > 0 for n in il},
              "muntohar_waspada": lo("dtss_muntohar_waspada") > 0, "v1_waspada": lo("dtss_v1_waspada") > 0}
    gagal = k["dtss_klim_waspada"]["nilai"] <= 0 or hi("dtss_b2b_waspada") < 0 or any(hi(f"dtss_{n}") < 0 for n in il)
    v = "LULUS" if all(syarat.values()) else "TIDAK LULUS" if gagal else "TIDAK MEYAKINKAN"
    if mde80 is not None and tss_klim and mde80 > 0.25 * tss_klim:
        v += " (daya rendah)"
    return {"vonis": v, "rincian": syarat}


def nilai_ekonomi(alarm, y, a):
    """Richardson 2000: V(a) = (E_klim - E_fc) / (E_klim - E_sempurna), biaya/ kerugian = a."""
    tp, fp, fn, tn = kontingensi(alarm, y)
    n = tp + fp + fn + tn
    s = (tp + fn) / n
    e_klim, e_fc, e_sem = min(a, s), (tp + fp) / n * a + fn / n, s * a
    return (e_klim - e_fc) / (e_klim - e_sem) if e_klim > e_sem else None


# ================================================================== J. guard waktu, label, sidik (§4.4, §8)
def prakiraan_ok(terbit, e, k):
    """Tenggang +k (§2.1, swauji j): prakiraan hanya dipakai bila terbit pada atau sebelum hari e-k (date)."""
    return terbit <= e - dt.timedelta(days=k)


def hash_label_hidup():
    """§4.4: sha256 berkas label dan hujan HIDUP saat `buka` dimulai (bukti keadaan, bukan pengunci)."""
    return {n: (_sha_isi(p) if os.path.exists(p) else None) for n, p in (("hujan", HUJAN), ("kejadian", KEJADIAN), ("logbook", LOGBOOK))}


def tulis_mulai(mode, sidik_, extra=None):
    os.makedirs(KELUAR, exist_ok=True)
    try:
        fd = os.open(J(mode + ".mulai"), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sys.exit(f"{mode}.mulai sudah ada: sudah dimulai, tidak bisa dijalankan lagi")
    with os.fdopen(fd, "w") as f:
        json.dump({"waktu": dt.datetime.now().isoformat(timespec="seconds"), "sidik": sidik_, **(extra or {})}, f)


def tambal():
    """Konstanta yang dikunci sidik (mutasi TAU/alarm/jendela/dst. harus mengubah sidik)."""
    return {"LATIH_TAHUN": list(LATIH_TAHUN), "LIPATAN": LIPATAN, "LABEL_AKHIR": str(LABEL_AKHIR), "AKHIR_BARIS": str(AKHIR_BARIS), "BUANG_TAHUN": BUANG_TAHUN, "WARMUP": WARMUP,
            "ALARM": ALARM, "TAU_GRID": TAU_GRID, "TAUW_GRID": TAUW_GRID, "SYARAT_WIL": SYARAT_WIL, "NEG_LAJU": NEG_LAJU, "B_GAMMA": B_GAMMA, "M": M_KELUARGA, "Q": [Q_LO, Q_HI],
            "BOOT": [ULANG_GERBANG, ULANG_BUKA], "BIJI": BIJI, "ILEWS": ILEWS, "MUNTOHAR": MUNTOHAR, "SETS": SETS, "FITUR_ALL": FITUR_ALL, "TERSEDIA": sorted(TERSEDIA),
            "TANPA_P2": sorted(TANPA_P2), "WIL_CALON": WIL_CALON, "SEL_DERAJAT": DASAR.SEL, "PROSPEKTIF_AKHIR": str(PROSPEKTIF_AKHIR), "BUKA_PALING_CEPAT": str(KC.BUKA_PALING_CEPAT),
            "KC": {"HALUS": KC.HALUS, "LANTAI": [KC.LANTAI_MIN, KC.LANTAI_MAK], "ETA_JEPIT": KC.ETA_JEPIT, "ITER_MAKS": KC.ITER_MAKS, "TOL": KC.TOL},
            "LM": {"LATIH": [str(x) for x in LM.LATIH], "UJI_TAHUN": list(LM.UJI_TAHUN)}}


BERKAS_SIDIK = {   # relatif AKAR
    "wajib": ["scripts/longsor/model_lhasa2.py", "scripts/longsor/PRAREG-LHASA2.md", "scripts/longsor/model.py", "scripts/longsor/rumus.py", "scripts/longsor/dasar.py",
              "scripts/longsor/kejadian.py", "scripts/banjir/model_kab_campur.py", "scripts/banjir/uji_logbook.py"],
    # berkas data HIDUP (hujan, kejadian, logbook, penduduk, desa_cari, kerentanan, pvmbg, geo) tidak di sini: yang di-hash adalah salinan beku (manifest_beku)
    "opsional": ["scripts/longsor/PRAREG-LHASA2-AMANDEMEN.md", "data/raw/longsor/fitur_statis.json"],   # jam_era5 (SWI sekunder) tidak dipakai: bukan bagian sidik
    "label_hidup": ["public/longsor/data/kejadian.json", "public/data/logbook_kejadian.json", "public/data/dibi_kejadian.json"]}


def hash_berkas(rel):
    p = os.path.join(AKAR, rel)
    return K2.sha_berkas(p) if os.path.exists(p) else None


def manifest_hujan(jalur=None):
    """sha256 per sel hujan.json + hash gabungan (daftar sel dan isinya terkunci)."""
    d = json.load(open(jalur or HUJAN))
    per = {k: hashlib.sha256(json.dumps(v, separators=(",", ":")).encode()).hexdigest()[:16] for k, v in sorted(d["sel"].items())}
    return {"mulai": d["mulai"], "n_sel": len(per), "gabungan": hashlib.sha256(json.dumps(per, sort_keys=True).encode()).hexdigest()}


def jalur_beku(nama):
    return os.path.join(KELUAR, "beku", nama)


def _sha_isi(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


BERKAS_BEKU = {"hujan": "hujan.json", "kejadian": "kejadian.json", "logbook": "logbook.json", "penduduk": "penduduk.json", "desa": "desa_cari.json",
               "kerentanan": "kerentanan.json", "pvmbg": "pvmbg.json"}
GEO_REL = "public/geo/kecamatan"


def _geo_dir(root):
    return os.path.join(root, GEO_REL)


def sha_geo(root=None):
    """sha256 isi public/geo/kecamatan/*.json di bawah `root` (bawaan: salinan beku bila ada, selain itu hidup)."""
    if root is None:
        root = jalur_beku("") if os.path.isdir(_geo_dir(jalur_beku(""))) else AKAR
    h = hashlib.sha256()
    for f in sorted(os.listdir(_geo_dir(root))):
        h.update(f.encode())
        h.update(open(os.path.join(_geo_dir(root), f), "rb").read())
    return h.hexdigest()


def manifest_beku():
    """Hash salinan beku (hujan per sel, kejadian, logbook, penduduk, desa_cari, kerentanan, pvmbg, geo kecamatan); None bila belum dibekukan. Inilah yang masuk sidik
    (BUKAN berkas hidup yang terus tumbuh atau ditulis ulang pipeline bulanan)."""
    if not all(os.path.exists(jalur_beku(n)) for n in BERKAS_BEKU.values()) or not os.path.isdir(_geo_dir(jalur_beku(""))):
        return None
    m = {k: _sha_isi(jalur_beku(n)) for k, n in BERKAS_BEKU.items() if k != "hujan"}
    return {**m, "hujan": manifest_hujan(jalur_beku("hujan.json")), "geo": sha_geo(jalur_beku(""))}


def bekukan():
    """P1/P4: salinan beku masukan hidup di data/raw/longsor/model_lhasa2/beku/ (gitignored; di git hanya hash): hujan.json (tiap sel s.d. LABEL_AKHIR), kejadian.json (baris `dibi`
    <= LABEL_AKHIR, tanpa 'dibuat'), logbook.json (jenis, kab_kode, mulai, terlihat; mulai <= LABEL_AKHIR), penduduk.json, desa_cari.json, kerentanan.json, pvmbg.json, dan
    public/geo/kecamatan. Idempoten: bila sudah ada TIDAK ditimpa (hapus manual untuk membekukan ulang; itu mematahkan sidik)."""
    import shutil
    if manifest_beku() is not None:
        return manifest_beku()
    os.makedirs(jalur_beku(""), exist_ok=True)
    d = json.load(open(HUJAN))
    n = idx_tgl(LABEL_AKHIR, dt.date.fromisoformat(d["mulai"])) + 1
    json.dump({"mulai": d["mulai"], "sampai": str(LABEL_AKHIR), "sel": {k: v[:n] for k, v in d["sel"].items()}}, open(jalur_beku("hujan.json"), "w"), separators=(",", ":"))
    kj = json.load(open(KEJADIAN))
    kj = {k: v for k, v in kj.items() if k != "dibuat"}
    kj["dibi"] = [r for r in kj["dibi"] if r[0] <= str(LABEL_AKHIR)]
    json.dump(kj, open(jalur_beku("kejadian.json"), "w"), separators=(",", ":"))
    lb = []
    for e in json.load(open(LOGBOOK))["kejadian"]:
        if str(e.get("mulai") or e["terlihat"][0])[:10] <= str(LABEL_AKHIR):
            lb.append({k: e.get(k) for k in ("jenis", "kab_kode", "mulai", "terlihat")})
    json.dump({"kejadian": lb}, open(jalur_beku("logbook.json"), "w"), separators=(",", ":"))
    for kunci, sumber in (("penduduk", PENDUDUK), ("desa", DESA), ("kerentanan", KERENTANAN), ("pvmbg", PVMBG)):
        shutil.copyfile(sumber, jalur_beku(BERKAS_BEKU[kunci]))
    if os.path.isdir(_geo_dir(jalur_beku(""))):
        shutil.rmtree(_geo_dir(jalur_beku("")))
    shutil.copytree(GEO_KEC, _geo_dir(jalur_beku("")))
    return manifest_beku()


def jalur_sumber(sumber="auto"):
    """{hujan, kejadian, logbook, penduduk, desa, kerentanan, pvmbg, root}: 'beku' (wajib ada), 'hidup', atau 'auto' (beku bila ada). Konteks latih = beku; hanya konteks
    prospektif membaca berkas hidup. `root` = akar yang memuat public/geo/kecamatan."""
    beku = {k: jalur_beku(n) for k, n in BERKAS_BEKU.items()}
    beku["root"] = jalur_beku("")
    ada = manifest_beku() is not None
    hidup = {"hujan": HUJAN, "kejadian": KEJADIAN, "logbook": LOGBOOK, "penduduk": PENDUDUK, "desa": DESA, "kerentanan": KERENTANAN, "pvmbg": PVMBG, "root": AKAR}
    if sumber == "hidup" or (sumber == "auto" and not ada):
        return hidup
    if not ada:
        raise DataBelumAda("salinan beku belum ada (dibuat oleh `latih`)")
    if sumber == "prospektif":                      # P3: HANYA hujan, kejadian, logbook yang hidup; geo kecamatan, kerentanan, penduduk, desa_cari, pvmbg dari beku
        return {**beku, "hujan": HUJAN, "kejadian": KEJADIAN, "logbook": LOGBOOK}
    return beku


def daftar_kec_dari(root):
    """DASAR.daftar_kec() membaca <DASAR.AKAR>/public/geo/kecamatan; AKAR modul dasar dialihkan sementara ke `root` (beku atau hidup)."""
    simpan = DASAR.AKAR
    DASAR.AKAR = root
    try:
        return DASAR.daftar_kec()
    finally:
        DASAR.AKAR = simpan


def cek_live_vs_beku():
    """Awalan hujan hidup HARUS sama dengan salinan beku (arsip ERA5 tak direvisi); beda -> -sel yang berbeda."""
    mb, Hb = muat_hujan(jalur_beku("hujan.json"))
    ml, Hl = muat_hujan(HUJAN)
    bad = [k for k, v in Hb.items() if Hl.get(k, [])[:len(v)] != v]
    if ml != mb or bad:
        sys.exit(f"hujan hidup berbeda dari salinan beku ({len(bad)} sel, contoh {bad[:3]}): konteks prospektif ditolak")


def jejak_kontekstual(ctx, peta):
    """Isi kandidat.json untuk P5: daftar kab, peta wilayah, hash geo kecamatan dan desa_cari BEKU (menentukan kab, sel, kode logbook)."""
    return {"kab": list(ctx.kab_keys), "wilayah_peta": dict(peta), "geo_sha": sha_geo(), "desa_sha": _sha_isi(jalur_beku("desa_cari.json")) if os.path.exists(jalur_beku("desa_cari.json"))
            else hash_berkas("public/data/desa_cari.json")}


def cek_konteks_beku(ctx_t, kand, geo_sha=None, desa_sha=None):
    """P5/butir 3: konteks latih saat `buka` (dibangun sendiri dari label beku: peta wilayah dihitung ulang oleh gabung_wilayah) harus identik dengan yang dibekukan `latih`:
    peta wilayah, daftar kab, wilayah tiap kab, hash geo/desa."""
    assert ctx_t.wilayah_info["peta"] == kand["wilayah_peta"], "peta wilayah dari label beku berbeda dari yang dibekukan"
    assert list(ctx_t.kab_keys) == list(kand["kab"]), f"daftar kab berubah ({len(ctx_t.kab_keys)} vs {len(kand['kab'])})"
    assert list(ctx_t.wil_kab) == [KC.wil_dari_kab(k, kand["wilayah_peta"]) for k in kand["kab"]], "wilayah kab di konteks latih berbeda dari peta beku"
    g = geo_sha if geo_sha is not None else sha_geo()
    d = desa_sha if desa_sha is not None else (_sha_isi(jalur_beku("desa_cari.json")) if os.path.exists(jalur_beku("desa_cari.json")) else hash_berkas("public/data/desa_cari.json"))
    assert g == kand["geo_sha"], "public/geo/kecamatan (beku) berubah sejak latih"
    assert d == kand["desa_sha"], "desa_cari.json (beku) berubah sejak latih"


def sidik_penuh(kand, hash_fn=None, manifest=None):
    hf = hash_fn or hash_berkas
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "kand": kand, "tambal": tambal()}, sort_keys=True).encode())
    h.update(json.dumps({r: hf(r) for r in BERKAS_SIDIK["wajib"] + BERKAS_SIDIK["opsional"]}, sort_keys=True).encode())
    h.update(json.dumps(manifest if manifest is not None else manifest_beku(), sort_keys=True).encode())
    h.update(K2.sumber(KC.selesai, KC.lantai_fit, KC.lantai_p, KC.lantai_loyo, KC.satu_se, KC.platt_wil, KC.standarisasi, KC.offset_dari, KC.gerbang_pembekuan, alarm_sebanyak).encode())
    return h.hexdigest()[:16]


def sidik_wajib_ada(hash_fn=None):
    hf = hash_fn or hash_berkas
    hilang = [r for r in BERKAS_SIDIK["wajib"] if hf(r) is None]
    if hilang:
        sys.exit("berkas wajib sidik tidak ada: " + ", ".join(hilang))


def tambah_jejak(b):
    with open(SIDIK_JEJAK, "a") as f:
        f.write(json.dumps(b, sort_keys=True) + "\n")


def tanggal_T():
    return KC.tanggal_T(AKAR, "origin/main", os.path.relpath(SIDIK_JEJAK, AKAR))


def sidik_commit(repo=None, ref="origin/main", rel=None):
    """P2: baris `sidik` PERTAMA yang ter-commit di `ref` (pola KC.tanggal_T: commit tertua yang memuat jenis=sidik), dibaca dari git, bukan dari berkas lokal. -> dict | None."""
    repo, rel = repo or AKAR, rel or os.path.relpath(SIDIK_JEJAK, AKAR)
    r = subprocess.run(["git", "-C", repo, "log", ref, "--reverse", "--format=%H", "--", rel], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"git log {ref} gagal: {r.stderr.strip()[:200]} (jalankan `git fetch` dahulu)")
    for h in r.stdout.split():
        isi = subprocess.run(["git", "-C", repo, "show", f"{h}:{rel}"], capture_output=True, text=True).stdout
        for x in isi.splitlines():
            if x.strip() and json.loads(x).get("jenis") == "sidik":
                return json.loads(x)
    return None


def hari_ini():
    return dt.datetime.now(WIB).date()


# ================================================================== K. data nyata
def muat_hujan(jalur=None):
    d = json.load(open(jalur or HUJAN))
    return dt.date.fromisoformat(d["mulai"]), d["sel"]


def muat_sm(kunci_sel_, folder=None):
    """Pembaca cache lengas (7A4): {'awal': date, 'sm': [...]} untuk satu sel 'lat,lon'; tidak ada -> DataBelumAda. Fitur sm/rH_sm BELUM ditulis (S2/S3 dicoret)."""
    lat, lon = (float(x) for x in kunci_sel_.split(","))
    p = os.path.join(folder or SM_DIR, f"{lat:.2f}_{lon:.2f}.json.gz")
    if not os.path.exists(p):
        raise DataBelumAda(f"lengas sel {kunci_sel_} belum ada ({p})")
    d = json.load(gzip.open(p, "rt"))
    return {"awal": dt.date.fromisoformat(d["awal"]), "sm": d["sm"]}


def kab_lengkap(kabs, kab_sel, H, n_hari):
    """Kab yang SEMUA selnya ada di hujan.json sepanjang >= n_hari."""
    return [k for k in kabs if all(s in H and len(H[s]) >= n_hari for s in kab_sel[k])]


def konteks_nyata(kering=False, maks_kab=None, awal=None, akhir=None, tanpa_g1_murni=False, akhir_label=None, sumber="auto"):
    """Adaptor data nyata. kering=True: hanya kab yang selnya sudah lengkap (parsial), opsional dibatasi maks_kab; selain itu SEMUA kab harus lengkap (atau
    GAGAL_HUJAN menyatakan sel gagal -> kab parsial dikeluarkan). Label dipotong di kode; 2024 dibuang; g=1 positif.
    sumber: 'beku' (konteks latih, wajib), 'hidup' (hanya konteks prospektif), 'auto' (beku bila ada: baris/kering)."""
    P = jalur_sumber(sumber)
    kecs = daftar_kec_dari(P["root"])
    kabs, kab_sel, kec_idx = peta_kab(kecs)
    p_hujan, p_kej, p_lb = P["hujan"], P["kejadian"], P["logbook"]
    mulai, H = muat_hujan(p_hujan)
    awal = HARI0 + dt.timedelta(WARMUP) if awal is None else awal
    akhir = AKHIR_BARIS if akhir is None else akhir
    n_hari = idx_tgl(akhir, mulai) + 2
    lengkap = kab_lengkap(kabs, kab_sel, H, n_hari)
    gagal = set(json.load(open(GAGAL_HUJAN))) if os.path.exists(GAGAL_HUJAN) else set()
    if len(lengkap) < len(kabs) and not kering:
        parsial = [k for k in kabs if k not in lengkap]
        if not (gagal and all(any(s in gagal or s not in H for s in kab_sel[k]) for k in parsial)):
            raise DataBelumAda(f"{len(parsial)} dari {len(kabs)} kab belum bersel hujan utuh (panen belum tuntas): `sidik` MENUNGGU 948 sel")
    kej = json.load(open(p_kej))
    if kering and maks_kab:
        n = defaultdict(int)
        for r in kej["dibi"]:
            n[kej["kab"][r[1]]] += r[2]
        lengkap = sorted(sorted(lengkap), key=lambda k: -n.get(k, 0))[:maks_kab]
        lengkap.sort()
    kabs = lengkap
    kerent = json.load(open(P["kerentanan"]))
    pend = json.load(open(P["penduduk"])) if os.path.exists(P["penduduk"]) else None
    statis, a_kab = statis_kab(kerent, kecs, {k: kec_idx[k] for k in kabs}, pend)
    kabs = [k for k in kabs if k in statis]
    pos, murni, _hilang = label_dibi(kej, kabs, akhir_label)
    lb = json.load(open(p_lb))["kejadian"]
    lbl = label_logbook(lb, peta_kode_kab(kabs, json.load(open(P["desa"]))), akhir_label)
    if tanpa_g1_murni:
        pos, _, _ = label_dibi(kej, kabs, akhir_label, tanpa_g1_murni=True)
    tl = [d for v in list(pos.values()) + list(lbl.values()) for d in v]
    if akhir_label is None:
        KC.pastikan_label_terpotong(tl)
    g0 = {k: v - murni.get(k, set()) for k, v in pos.items()}
    ctx = bangun_ctx(H, mulai, kabs, kab_sel, statis, a_kab, pos, lbl, awal, akhir, NEG_LAJU if not kering else 0.05, murni if tanpa_g1_murni else None, {}, g0)
    # v1/v2 untuk pembanding: (S, S_pv, sel) per kec
    kol = {n: i for i, n in enumerate(kerent["kolom"])}
    baris = dict(zip(kerent["kec"], kerent["k"]))
    for ki, k in enumerate(kabs):
        ctx.kec_sel[ki] = [(baris[kecs[n]["id"]][kol["S"]], baris[kecs[n]["id"]][kol["S_pv"]], DASAR.kunci_sel(*DASAR.sel_hujan(kecs[n]["lat"], kecs[n]["lon"])))
                           for n in kec_idx[k] if kecs[n]["id"] in baris]
    gw = gabung_wilayah(ctx, set(LATIH_TAHUN) if not kering else set(LATIH_TAHUN) & set(ctx.sl))
    set_wilayah(ctx, gw["peta"])
    ctx.wilayah_info = gw
    ctx.catatan = {"kab": len(kabs), "baris": ctx.n, "tersedia": sorted(ctx.tersedia), "label": {"dibi_kab_hari": sum(len(v) for v in pos.values()),
                   "logbook_kab_hari": sum(len(v) for v in lbl.values()), "g1_murni": sum(len(v) for v in murni.values())}}
    return ctx


# ================================================================== L. mode: pemblokir, baris, latih, gerbang, sidik, buka
def ubin_perlu(kecs, kabs):
    """Ubin WorldCover 3x3 derajat (nama NSS EEE) yang menutupi kotak pembatas semua kab (pola scripts/banjir/kedap_kab.ubin_perlu)."""
    kab_set, t = set(kabs), set()
    for k in kecs:
        if f'{k["prov"]}|{k["kab"]}' not in kab_set:
            continue
        xs, ys = [c[0] for r in k["cincin"] for c in r], [c[1] for r in k["cincin"] for c in r]
        for la in range(math.floor(min(ys) / 3) * 3, math.floor(max(ys) / 3) * 3 + 1, 3):
            for lo in range(math.floor(min(xs) / 3) * 3, math.floor(max(xs) / 3) * 3 + 1, 3):
                t.add(f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}")
    return sorted(t)


def pemblokir(kecs=None):
    """-> {no butir 7A: (status, keterangan)}. Status 'BLOK' menolak latih/gerbang/sidik/buka; selain itu aturan jatuh tertulis atau siap."""
    s = {}
    kecs = kecs or DASAR.daftar_kec()
    kabs, kab_sel, kec_idx = peta_kab(kecs)
    sel_perlu = {x for k in kabs for x in kab_sel[k]}
    if os.path.exists(HUJAN):
        mulai, H = muat_hujan()
        n_hari = idx_tgl(AKHIR_BARIS, mulai) + 2
        ada = {x for x in sel_perlu if x in H and len(H[x]) >= n_hari}
        gagal = set(json.load(open(GAGAL_HUJAN))) if os.path.exists(GAGAL_HUJAN) else set()
        lengkap = kab_lengkap(kabs, kab_sel, H, n_hari)
        if len(ada) == len(sel_perlu):
            s[1] = ("siap", f"{len(ada)} dari {len(sel_perlu)} sel utuh")
        elif gagal and all(any(x in gagal or x not in H for x in kab_sel[k]) for k in kabs if k not in lengkap):
            s[1] = ("siap", f"panen tuntas dengan {len(gagal)} sel gagal: {len(kabs) - len(lengkap)} kab parsial dikeluarkan, {len(lengkap)} kab dinilai")
        else:
            s[1] = ("BLOK", f"{len(ada)} dari {len(sel_perlu)} sel utuh; {len(lengkap)} dari {len(kabs)} kab bersel utuh (`sidik` MENUNGGU 948 sel, hujan_riwayat.py)")
    else:
        s[1] = ("BLOK", "data/raw/longsor/hujan.json tidak ada")
    h = hash_berkas("scripts/banjir/model_kab_campur.py")
    jejak = [json.loads(x) for x in open(os.path.join(AKAR, "scripts/banjir/model_kab_campur.sidik")) if x.strip()] if os.path.exists(os.path.join(AKAR, "scripts/banjir/model_kab_campur.sidik")) else []
    fungsi = [n for n in ("selesai", "lantai_fit", "lantai_p", "lantai_loyo", "satu_se", "platt_wil", "pakai_platt_wil", "standarisasi", "offset_dari", "gerbang_pembekuan", "tanggal_T")
              if not callable(getattr(KC, n, None))]
    if h != HASH_CAMPUR or fungsi or not any(b.get("sidik") == SIDIK_CAMPUR and b.get("jenis") == "latih" for b in jejak):
        s[2] = ("BLOK", f"model_kab_campur.py berubah/hilang (sha {str(h)[:12]} != {HASH_CAMPUR[:12]}) atau fungsi hilang {fungsi}")
    else:
        s[2] = ("siap", f"penyelesai diimpor dari model_kab_campur (sha {h[:12]}, sidik {SIDIK_CAMPUR}); swauji a-d lewat `uji`")
    s[3] = ("kosong", "GBDT dibuang rev. 2")
    n_sm = 0
    for x in sel_perlu:
        try:
            muat_sm(x)
            n_sm += 1
        except DataBelumAda:
            pass
    s[4] = ("tidak tersedia", f"lengas sm: {n_sm} dari {len(sel_perlu)} sel di {SM_DIR} (pembaca ada, fitur sm BELUM ditulis); S2/S3 dicoret, S3' = S1 + lr_lahan (§3.2)")
    perlu = ubin_perlu(kecs, kabs)
    punya = sorted(f[:-4] for f in os.listdir(WORLDCOVER)) if os.path.isdir(WORLDCOVER) else []
    kurang = [u for u in perlu if u not in punya]
    s[5] = ("tidak tersedia", f"WorldCover: {len(perlu) - len(kurang)} dari {len(perlu)} ubin 3x3 derajat menutupi kab longsor (ubin banjir = sampel 40 kab); lr_lahan DIHAPUS (§7A5)"
            if kurang else f"ubin lengkap, tetapi pembaca kelas 20/30/40/60 belum ditulis: lr_lahan tetap DIHAPUS")
    s[6] = ("sekunder", "SWI tidak diimplementasi pada rev. ini (§3.2); tidak memblokir")
    try:
        _guard_kode()
        s[7] = ("siap", "guard terpasang: potong label, buang 2024, g=1 positif, kab 'None' keluar, tenggang prakiraan")
    except AssertionError as e:
        s[7] = ("BLOK", f"guard kode gagal: {e}")
    s[8] = ("sebagian", "logbook 2025-2026 dipakai; arsip data/pusdalops/logbook_kejadian.csv BELUM disambungkan: y1 F2-F3 = DIBI saja (kelonggaran A-8 dilaporkan)")
    pend = os.path.exists(PENDUDUK)
    st = None
    if pend:
        pj = json.load(open(PENDUDUK))["kec"]
        kab_set = {f'{k["prov"]}|{k["kab"]}' for k in kecs if kab_valid(k["kab"])}
        cocok_ = sum(1 for k in kecs if kab_valid(k["kab"]) and k["id"] in pj)
        st = f"nama kec cocok {cocok_} dari {sum(1 for k in kecs if kab_valid(k['kab']))}; luas kab = jumlah cincin luar kec (public/geo/kecamatan), bukan poligon kabupaten"
    s[9] = ("siap", st) if pend else ("BLOK", "public/data/penduduk.json tidak ada")
    s[10] = ("belum ada", "arsip prakiraan beku hujan per sel longsor belum berjalan: tenggang +1..+3 tidak dinilai musim ini")
    try:
        kj = json.load(open(KEJADIAN))
        assert kj["kolom_dibi"] == ["tanggal", "kab", "n", "gab"]
        s[11] = ("siap", f"kejadian.json kolom n/gab ada; jenis 'Gerakan Tanah' = gab 0; GLC hanya kontrol recall (tidak dipakai latih), {len(kj['glc'])} titik")
    except (OSError, KeyError, AssertionError) as e:
        s[11] = ("BLOK", f"kejadian.json tak terbaca/skema berubah: {e}")
    return s


def _guard_kode():
    assert LABEL_AKHIR == KC.LABEL_AKHIR and KC.BUKA_PALING_CEPAT == dt.date(2027, 6, 29) and KC.PROSPEKTIF_AKHIR == PROSPEKTIF_AKHIR
    assert potong_tanggal(["2026-10-18", "2026-10-19", "2024-05-05", "2025-01-01"]) == [dt.date(2026, 10, 18), dt.date(2025, 1, 1)]
    pos, murni, _ = label_dibi({"kab": ["32|A", "32|None"], "dibi": [["2025-01-01", 0, 1, 1], ["2024-02-02", 0, 1, 0], ["2026-10-19", 0, 1, 0]]}, ["32|A"])
    assert pos == {"32|A": {dt.date(2025, 1, 1)}} and murni == {"32|A": {dt.date(2025, 1, 1)}}
    assert not kab_valid("None") and prakiraan_ok(dt.date(2026, 1, 1), dt.date(2026, 1, 2), 1) and not prakiraan_ok(dt.date(2026, 1, 2), dt.date(2026, 1, 2), 1)


def cetak_pemblokir(s):
    for k, (st, ket) in sorted(s.items()):
        print(f"7A.{k}: {st} - {ket}")


def tolak_bila_blok():
    s = pemblokir()
    blok = {k: v for k, v in s.items() if v[0] == "BLOK"}
    if blok:
        sys.exit("ditolak: pemblokir §7A belum beres: " + "; ".join(f"7A.{k}: {v[1]}" for k, v in sorted(blok.items())))


def baris():
    """`baris`: kab, sel, baris, wilayah calon (tanpa skor)."""
    try:
        ctx = konteks_nyata(kering=True)
    except DataBelumAda as e:
        sys.exit(str(e))
    kabs_all = peta_kab(DASAR.daftar_kec())[0]
    print(f"kab dalam peta {len(kabs_all)}, kab bersel hujan lengkap {ctx.nk}; baris {ctx.n}; positif y0 {sum(ctx.R_y0)}; tahun {sorted(ctx.sl)}")
    print("wilayah calon (hanya kab lengkap):", json.dumps(ctx.wilayah_info["rincian"]), "->", json.dumps(ctx.wilayah_info["peta"]), "cw_sekunder:", ctx.wilayah_info["cw_sekunder"])


def latih_kering():
    """`latih --kering`: alur penuh (wilayah, tau, tau_w, set, satu model penuh) pada kab yang selnya SUDAH lengkap, dibatasi 24 kab; TIDAK menulis, TIDAK mencetak skor keterampilan."""
    import time
    t0 = time.time()
    ctx = konteks_nyata(kering=True, maks_kab=24)
    gw = ctx.wilayah_info
    print(f"kering: {ctx.nk} kab, {ctx.n} baris, positif y0 {sum(ctx.R_y0)}, wilayah efektif {ctx.wilayah}, cw_sekunder {gw['cw_sekunder']} ({time.time() - t0:.0f} dtk)")
    ev = evaluator(ctx)
    pil = pilih_semua(ctx, ev, cw_sekunder=gw["cw_sekunder"])
    print(f"kering: pilihan tau/tau_w/set dihitung dari label nyata dan TIDAK dicetak; set dicoret {pil['log']['dicoret']} ({time.time() - t0:.0f} dtk)")
    cfg = cfg_dari(ctx, pil["set"], pil["tau"], None)
    kp = cocok_penuh(ctx, frozenset(LATIH_TAHUN) & frozenset(ctx.sl), cfg)
    m = kp["model"]
    print(f"kering: model penuh iter {m['iter']}, gradien {m['grad']:.2g}, n_latih {m['n_latih']}, gugur {m['n_gugur']}, beta>=0 {all(b >= 0 for b in m['beta'])} ({time.time() - t0:.0f} dtk)")
    print("kering OK: tidak menulis apa pun, tidak ada skor keterampilan dicetak")


def baca_jejak():
    return [json.loads(x) for x in open(SIDIK_JEJAK) if x.strip()] if os.path.exists(SIDIK_JEJAK) else []


def latih_nyata(ulang=False):
    """Pra-pemeriksaan dari JEJAK yang sama dengan riwayat: latih apa pun (ok, dihentikan, galat) atau kandidat(_dihentikan).json yang ada menolak latih tanpa --ulang; baris `sidik`
    di jejak lokal menolak latih BAHKAN dengan --ulang (P2). Setiap latih yang berhenti sebelum selesai (gerbang, ValueError Platt, galat apa pun) dicatat di jejak, lalu dilempar ulang."""
    jejak = baca_jejak()
    if any(b.get("jenis") == "sidik" for b in jejak):
        sys.exit("jejak sudah memuat baris `sidik`: latih ulang DITOLAK (kandidat sudah dibekukan; sidik baru butuh protokol baru)")
    lt = [b for b in jejak if b.get("jenis") == "latih"]
    tak_tertutup = sum(1 for b in lt if b.get("hasil") == "mulai") > sum(1 for b in lt if b.get("hasil") in ("ok", "dihentikan", "galat"))      # N1: dimatikan paksa (SIGTERM/SIGKILL/OOM)
    if (os.path.exists(J("kandidat.json")) or os.path.exists(J("kandidat_dihentikan.json")) or os.path.exists(J("latih.json")) or lt) and not ulang:
        sys.exit("kandidat(.json/_dihentikan.json), latih.json, atau jejak latih sudah ada" + (" (ADA baris `mulai` tanpa penutup: latih sebelumnya mungkin dimatikan paksa)" if tak_tertutup else "") + ": latih ulang butuh --ulang")
    prior = [b for b in jejak if b.get("jenis") == "latih" and b.get("hasil") == "mulai"]      # `ke` = jumlah baris "mulai" (bertahan walau proses dimatikan paksa)
    os.makedirs(KELUAR, exist_ok=True)
    tambah_jejak({"jenis": "latih", "hasil": "mulai", "waktu": dt.datetime.now(WIB).isoformat(timespec="minutes"), "ke": len(prior) + 1, "ulang": bool(ulang)})
    try:
        _latih_isi(ulang, prior)
    except BaseException as e:
        if not getattr(e, "dicatat", False):
            tambah_jejak({"jenis": "latih", "hasil": "galat", "waktu": dt.datetime.now(WIB).isoformat(timespec="minutes"), "ke": len(prior) + 1, "ulang": bool(ulang), "alasan": repr(e)[:200]})
        raise


def _latih_isi(ulang, prior):
    bekukan()                                       # P1: konteks latih membaca SALINAN beku (dibuat sekali; --ulang tidak membekukan ulang)
    ctx = konteks_nyata(sumber="beku")
    gw = ctx.wilayah_info
    pb = pemblokir()
    riwayat = {"ke": len(prior) + 1, "sebelumnya": len(prior), "waktu_sebelumnya": [b.get("waktu") for b in prior], "ulang": bool(ulang)}   # butir 9: --ulang tercatat dan ikut sidik
    latih_json = {"wilayah": gw, "catatan": getattr(ctx, "catatan", {}), "daftar_buka": daftar_buka(), "kab": ctx.kab_keys, "beku": manifest_beku(), "neg_laju": NEG_LAJU,
                  "pemblokir_7A": {str(k): list(v) for k, v in sorted(pb.items())}, "label_sha_hidup": {r: hash_berkas(r) for r in BERKAS_SIDIK["label_hidup"]}, "riwayat_latih": riwayat}
    json.dump(latih_json, open(J("latih.json"), "w"), separators=(",", ":"))
    pil = pilih_semua(ctx, evaluator(ctx), gw["cw_sekunder"])
    cN = cfg_dari(ctx, pil["set"], pil["tau"], None)
    kand_cfg = {"LH-N": cN}
    if not gw["cw_sekunder"]:
        kand_cfg["LH-W"] = cfg_dari(ctx, pil["set"], pil["tau"], pil["tau_w"])
    m = M_KELUARGA if "LH-W" in kand_cfg else M_KELUARGA - 1          # LH-W sekunder (wilayah efektif < 3): m = 9, selang 99,46%
    gerb, blok = gerbang_lipatan(ctx, kand_cfg)
    hidup = [n for n, g in gerb.items() if not g["hentikan"]]
    acu = frozenset(LATIH_TAHUN)
    pack = lambda cfg: (lambda kp: {"model": kp["model"], "platt": kp["platt"]})(cocok_penuh(ctx, acu, cfg))
    mp = model_pembanding(ctx, pil["tau"])                      # butir 2: klim dan B2b dilatih DI SINI dan ikut sidik; `buka` tidak melatih apa pun
    pack_p = lambda n: {"model": mp[n]["model"], "platt": mp[n]["platt"]}
    simpan_model = list(hidup) + (["LH-N"] if "LH-W" in hidup and "LH-N" not in hidup else []) + ["klim", "b2b"]   # P2: LH-N dibekukan sebagai pembanding walau dihentikan gerbang
    kand = {"versi": "model-lhasa2-2", "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "pilihan": pil, "cfg": kand_cfg, "gerbang_pembekuan": gerb, "hidup": hidup,
            "pembanding_saja": [n for n in simpan_model if n not in hidup], "m": m, "selang": list(selang_m(m)),
            "mde": {n: mde_dari_blok(blok[n]) for n in kand_cfg}, "model": {n: (pack(kand_cfg[n]) if n in kand_cfg else pack_p(n)) for n in simpan_model}, "riwayat_latih": riwayat,
            "tenggang": {"+1": "tidak dinilai musim ini (7A10)", "+2": "tidak dinilai musim ini (7A10)", "+3": "tidak dinilai musim ini (7A10)"},
            **jejak_kontekstual(ctx, gw["peta"]), "sidik_kriteria": hashlib.sha256(json.dumps(KRITERIA, sort_keys=True).encode()).hexdigest()[:16]}
    if not hidup:
        json.dump(kand, open(J("kandidat_dihentikan.json"), "w"), separators=(",", ":"))
        tambah_jejak({"jenis": "latih", "hasil": "dihentikan", "waktu": kand["dibuat"], "ke": riwayat["ke"], "ulang": bool(ulang), "gerbang": {n: g["hentikan"] for n, g in gerb.items()}})
        lama = " PERINGATAN: kandidat.json LAMA (latih sebelumnya) MASIH ADA dan BUKAN hasil latih ini; jangan dipakai." if os.path.exists(J("kandidat.json")) else ""
        e_ = SystemExit("gerbang pembekuan: semua kandidat dihentikan (tidak terbukti, tidak layak dibekukan); sidik tidak ditulis; layar TETAP v1 (§5.5)." + lama)
        e_.dicatat = True
        raise e_
    kand["sidik"] = sidik_penuh({k: v for k, v in kand.items() if k != "sidik"})
    json.dump(kand, open(J("kandidat.json"), "w"), separators=(",", ":"))
    latih_json["platt_jatuh"] = [{"cfg": json.loads(k_[0]), "tahun": sorted(k_[1]), "jatuh": v_["platt_jatuh"]} for k_, v_ in ctx._kp.items() if v_["platt_jatuh"]]   # A-28: dicatat saja
    json.dump(latih_json, open(J("latih.json"), "w"), separators=(",", ":"))
    tambah_jejak({"jenis": "latih", "hasil": "ok", "waktu": kand["dibuat"], "sidik": kand["sidik"], "hidup": hidup, "ke": riwayat["ke"], "ulang": bool(ulang)})
    print("kandidat.json ditulis; lanjut `sidik`, lalu COMMIT model_lhasa2.sidik + kode. Hidup:", hidup)


def daftar_buka():
    """§5.1: tabel tatapan (8) dari dokumen; m = 8 tatapan + 2 kandidat = 10."""
    tabel = [(1, "29 Okt", "uji balik v1", "2022, 2023, 2025"), (2, "29-30 Okt", "uji_logbook_longsor level_longsor", "2026-01..10"), (3, "30 Okt", "uji balik v2 (+ PVMBG)", "2022, 2023, 2025"),
             (4, "30 Okt", "ambang_kab", "fit <= 2020; validasi 2021-2025; uji 2026"), (5, "1 Nov", "uji_logbook_longsor --arsip", "2016-2025"), (6, "2 Nov", "uji ulang 515 sel + bootstrap blok", "2022, 2023, 2025"),
             (7, "3 Nov", "uji ulang setelah perbaikan g=1", "2022, 2023, 2025"), (8, "3 Nov", "eksplorasi klimatologi + hujan dalam-kab", "tahun uji")]
    return {"tabel": [dict(zip(("no", "tanggal", "uji", "periode"), r)) for r in tabel], "tatapan": len(tabel), "kandidat": 2, "m": len(tabel) + 2, "m_konsisten": len(tabel) + 2 == M_KELUARGA}


def gerbang_mode():
    if not os.path.exists(J("latih.json")):
        sys.exit("latih.json belum ada: jalankan `latih` dahulu (pilihan tau/tau_w/set dibekukan di sana)")
    lt = [b for b in baca_jejak() if b.get("jenis") == "latih"]
    akhir = lt[-1].get("hasil") if lt else None
    if akhir not in ("ok", "dihentikan"):
        sys.exit(f"baris jejak latih terakhir bukan 'ok'/'dihentikan' (ada: {akhir}): kandidat.json tidak dibaca")
    ctx = konteks_nyata(sumber="beku")
    pil_f = J("kandidat.json") if akhir == "ok" else J("kandidat_dihentikan.json")
    if not os.path.exists(pil_f):
        sys.exit("kandidat(.json/_dihentikan.json) belum ada")
    k = json.load(open(pil_f))
    cfg = {n: {"tau": c["tau"], "tau_w": c["tau_w"], "set": c["set"]} for n, c in k["cfg"].items()}
    cfg = {n: {**c, "set": {wl: c["set"].get(wl, c["set"][next(iter(c["set"]))]) for wl in ctx.wilayah}} for n, c in cfg.items()}
    gerb, _ = gerbang_lipatan(ctx, cfg)
    json.dump(gerb, open(J("gerbang.json"), "w"), separators=(",", ":"))
    for n, g in gerb.items():                       # hanya vonis/hentikan; dTSS per lipatan/gabungan ada di gerbang.json (bukan dicetak)
        print(n, "hentikan" if g["hentikan"] else "lolos pembekuan", "-", g["vonis"])


INFO_TRANSITIF = ["scripts/banjir/umum.py", "scripts/banjir/model_kab2.py", "scripts/banjir/model_kab.py", "scripts/banjir/kejadian.py"]


def info_transitif():
    """Hash impor transitif banjir sebagai INFORMASI (BUKAN wajib, BUKAN bagian sidik): umum.py dibekukan sidik J4 sampai Apr 2027 dan dibagi lintas modul. Risiko diterima (A-44)."""
    return {r: hash_berkas(r) for r in INFO_TRANSITIF}


def sidik():
    kp = J("kandidat.json")
    if not os.path.exists(kp):
        sys.exit("kandidat.json belum ada: jalankan `latih`")
    kand = json.load(open(kp))
    if kand["sidik"] != sidik_penuh({k: v for k, v in kand.items() if k != "sidik"}):
        sys.exit("sidik berubah sejak `latih`: ditolak")
    sidik_wajib_ada()
    tambah_jejak({"jenis": "sidik", "sidik": kand["sidik"], "waktu": dt.datetime.now(WIB).isoformat(timespec="seconds"),
                  "awal_prospektif": str(KC.awal_efektif(dt.datetime.now(WIB).date())), "sha256_label_hidup": {r: hash_berkas(r) for r in BERKAS_SIDIK["label_hidup"]}, "info_banjir_transitif": info_transitif()})
    print("sidik ditulis; COMMIT lalu push ke origin/main; T = tanggal commit pertama yang memuat baris sidik")


def model_pembanding(ctx_t, tau=None):
    """Klimatologi (+ Platt) dan hujan-saja berlantai B2b = lantai + {rH}, dilatih pada SEMUA tahun latih konteks pelatihan `ctx_t`. tau B2b = tau terpilih kandidat (satu-SE yang sama)."""
    A = frozenset(LATIH_TAHUN)
    tau = 0.10 if tau is None else tau
    return {"klim": cocok_penuh(ctx_t, A, cfg_dari(ctx_t, [], 0.05, None)), "b2b": cocok_penuh(ctx_t, A, cfg_dari(ctx_t, ["rH"], tau, None))}


def kab_aktif_dari(ctx_t):
    """Kab aktif (§5.3): >= 1 hari longsor resmi (y0) di >= 3 dari tahun latih, dari agregat konteks pelatihan."""
    th = defaultdict(set)
    for j in range(len(ctx_t.AG["w"])):
        if ctx_t.AG["w"][j] * ctx_t.AG["y"][j] > 0.5:
            th[ctx_t.AG["kab"][j]].add(ctx_t.AG["tahun"][j])
    return sorted(k for k, v in th.items() if len(v) >= 3)


def ap_dari(skor, y):
    """AUC-PR sebagai average precision (seri: urutan indeks)."""
    npos = sum(y)
    if not npos:
        return None
    tp = 0
    tot = 0.0
    for r, j in enumerate(sorted(range(len(y)), key=lambda j: -skor[j]), 1):
        if y[j]:
            tp += 1
            tot += tp / r
    return tot / npos


def fbeta_pm1(ctx, ix, alarm, y1, beta=0.8):
    """§5.4(2): presisi = alarm yang punya kejadian di e-1..e+1 (y1); recall = hari kejadian (y0) yang punya alarm di e-1..e+1 pada kab sama. F_beta, beta = 0,8."""
    pos = {(ctx.R_kab[i], ctx.R_e[i]): j for j, i in enumerate(ix)}
    na = sum(alarm)
    prec = sum(1 for j in range(len(ix)) if alarm[j] and y1[j]) / na if na else 0.0
    ev = [(ctx.R_kab[i], ctx.R_e[i]) for i in ix if ctx.R_y0[i]]
    rec = sum(1 for k, e in ev if any(alarm[pos[(k, d)]] for d in (e - 1, e, e + 1) if (k, d) in pos)) / len(ev) if ev else 0.0
    b2 = beta * beta
    return {"presisi": round(prec, 5), "recall": round(rec, 5), "f_beta": round((1 + b2) * prec * rec / (b2 * prec + rec), 5) if prec + rec else 0.0}


def _tertil(nilai_per_kab):
    v = sorted(x for x in nilai_per_kab.values() if x is not None)
    if len(v) < 3:
        return lambda k: 0
    c1, c2 = v[len(v) // 3], v[2 * len(v) // 3]
    return lambda k: None if nilai_per_kab.get(k) is None else (0 if nilai_per_kab[k] < c1 else 1 if nilai_per_kab[k] < c2 else 2)


def strata_laporan(ctx, ix, y, al_c, al_k, kunci):
    """Laporan per stratum (FAR = batas ATAS karena kurang lapor, §5.4): n, positif, POD/FAR/TSS alarm C dan klimatologi (alarm global yang sama)."""
    grup = defaultdict(list)
    for j, i in enumerate(ix):
        grup[kunci(i)].append(j)
    out = {}
    for g_, js in sorted(grup.items(), key=lambda kv: str(kv[0])):
        d = {"n": len(js), "positif": sum(y[j] for j in js)}
        for nm, al in (("C", al_c), ("klim", al_k)):
            t = kontingensi([al[j] for j in js], [y[j] for j in js])
            d[nm] = {"pod": round(t[0] / (t[0] + t[2]), 5) if t[0] + t[2] else None, "far_batas_atas": round(t[1] / (t[0] + t[1]), 5) if t[0] + t[1] else None, "tss": round(tss_dari(t), 5)}
        out[str(g_)] = d
    return out


def laporan_buka(ctx, ix, y, pc, pk, ac, ak, na, kab_aktif, v1_skor, v1_alarm):
    """Keluaran laporan §5.1/§5.3/§5.4 yang tidak menjadi gerbang: POD/FAR/bias, AUC total, AUC-PR, dBSS, konfusi per level, y0 hari tepat, F-beta +-1, strata
    (kepadatan, n_sel, wilayah, bulan, kab aktif), v1 pada sasaran g=0 sendiri."""
    N = len(ix)
    ukuran = lambda t: {"pod": round(t[0] / (t[0] + t[2]), 5) if t[0] + t[2] else None, "far": round(t[1] / (t[0] + t[1]), 5) if t[0] + t[1] else None,
                        "bias": round((t[0] + t[1]) / (t[0] + t[2]), 4) if t[0] + t[2] else None, "tss": round(tss_dari(t), 5), "konfusi": t}
    bs = lambda p: G.brier(p, y)
    y0 = [ctx.R_y0[i] for i in ix]
    r = {"waspada": {"C": ukuran(kontingensi(ac["waspada"], y)), "klim": ukuran(kontingensi(ak["waspada"], y))},
         "auc_total": {"C": G.auc(pc, y), "klim": G.auc(pk, y)}, "auc_pr": {"C": ap_dari(pc, y), "klim": ap_dari(pk, y)},
         "dbss_vs_klim": round((bs(pk) - bs(pc)) / bs(pk), 5) if bs(pk) > 0 else None,
         "konfusi_per_level": {lv: {"frekuensi_alarm": round(na[lv] / N, 5), "C": ukuran(kontingensi(ac[lv], y)), "klim": ukuran(kontingensi(ak[lv], y))} for lv in na},
         "y0_hari_tepat_waspada": {"C": round(tss_dari(kontingensi(ac["waspada"], y0)), 5), "klim": round(tss_dari(kontingensi(ak["waspada"], y0)), 5)},
         "f_beta_pm1_waspada": {"C": fbeta_pm1(ctx, ix, ac["waspada"], y), "klim": fbeta_pm1(ctx, ix, ak["waspada"], y)}}
    dens, nsel = _tertil({k: ctx.a_kab.get(k) for k in ctx.kab_keys}), _tertil({k: float(len(ctx.sels[ki])) for ki, k in enumerate(ctx.kab_keys)})
    aktif = set(kab_aktif or ())
    A_, K_ = ac["waspada"], ak["waspada"]
    r["strata"] = {"kepadatan_tertil": strata_laporan(ctx, ix, y, A_, K_, lambda i: dens(ctx.kab_keys[ctx.R_kab[i]])),
                   "n_sel_tertil": strata_laporan(ctx, ix, y, A_, K_, lambda i: nsel(ctx.kab_keys[ctx.R_kab[i]])),
                   "wilayah": strata_laporan(ctx, ix, y, A_, K_, lambda i: ctx.wil_kab[ctx.R_kab[i]]),
                   "bulan": strata_laporan(ctx, ix, y, A_, K_, lambda i: ctx.R_bl[i]),
                   "kab_aktif": strata_laporan(ctx, ix, y, A_, K_, lambda i: "aktif" if ctx.kab_keys[ctx.R_kab[i]] in aktif else "tak_diketahui")}
    sub = [j for j, i in enumerate(ix) if not (ctx.R_y0[i] and not ctx.R_g0[i])]       # sasaran v1 sendiri: g=0 hari tepat, g=1 murni bukan negatif
    yg = [ctx.R_g0[ix[j]] for j in sub]
    r["v1_sasaran_g0_sendiri"] = {"n": len(sub), "positif": sum(yg), "auc": G.auc([v1_skor[j] for j in sub], yg), **ukuran(kontingensi([v1_alarm[j] for j in sub], yg))}
    return r


def buka_hitung(ctx, ix, kandidat, modelos, ulang, se_skala=None, m=None, kab_aktif=None):
    """Inti `buka` (dipakai juga `buka --kering` pada data mainan). ctx = konteks prospektif (kab dan wilayah SAMA dengan konteks latih); ix = baris dinilai;
    modelos {nama: {model, platt}} dilatih pada semua tahun latih, wajib memuat 'klim', 'b2b' dan tiap `kandidat`; bila 'LH-N' ada, LH-W dikontraskan dengannya (P2).
    se_skala {nama: SE x sqrt(positif)} dari kandidat.json -> mde_80 dihitung dengan positif y1 NYATA; m = jumlah perbandingan keluarga (10, atau 9 bila LH-W sekunder).
    -> {nama: {kontras, vonis, rinci, vektor}, '_ringkas': {...}}."""
    A = frozenset(LATIH_TAHUN)
    F = fitur(ctx, A, ix)
    y = [ctx.R_y1[i] for i in ix]
    N = len(ix)
    lain = penilai_lain(ctx, ix)
    kl = skor_penuh(ctx, modelos["klim"], ix, F)
    b2b = skor_penuh(ctx, modelos["b2b"], ix, F)
    lhn = skor_penuh(ctx, modelos["LH-N"], ix, F) if "LH-N" in modelos else None
    na = {k: n_alarm(N, f) for k, f in ALARM.items()}
    n_kuning, n_merah = sum(1 for s in lain["ilews"] if s >= 1), sum(1 for s in lain["ilews"] if s >= 2)
    kis = [ctx.R_kab[i] for i in ix]
    out = {}
    for nm in kandidat:
        pc = skor_penuh(ctx, modelos[nm], ix, F)
        sk = {"C": pc, "klim": kl, "b2b": b2b, **{k: v for k, v in lain.items() if k != "ilews"}, "ilews": [float(v) + random.Random(BIJI + j).random() * 1e-6 for j, v in enumerate(lain["ilews"])]}
        if lhn is not None and nm == "LH-W":
            sk["LHN"] = lhn
        al = {}
        for a in ("waspada", "siaga"):
            for who in ("C", "klim", "b2b", "hujan", "muntohar", "v1") + (("LHN",) if "LHN" in sk else ()):
                al[f"{who}_{a}"] = alarm_sebanyak(sk[who], na[a])
        kontras = {"dtss_klim_waspada": ("C_waspada", "klim_waspada"), "dtss_klim_siaga": ("C_siaga", "klim_siaga"), "dtss_b2b_waspada": ("C_waspada", "b2b_waspada"),
                   "dtss_hujan_waspada": ("C_waspada", "hujan_waspada"), "dtss_muntohar_waspada": ("C_waspada", "muntohar_waspada"), "dtss_v1_waspada": ("C_waspada", "v1_waspada"),
                   "dauc_klim": ("C", "klim")}
        if "LHN" in sk:
            kontras["dtss_lhn_waspada"] = ("C_waspada", "LHN_waspada")
            kontras["dauc_lhn"] = ("C", "LHN")
        tak_def = {}
        for lv, nn in (("kuning", n_kuning), ("merah", n_merah)):
            if nn == 0 or nn >= N:                                            # tak ada alarm ILEWS (atau semua): TSS tak terdefinisi, jangan dikontraskan
                tak_def[f"ilews_{lv}"] = f"tak terdefinisi ({nn} alarm {lv} dari {N} baris)"
                continue
            al[f"C_{lv}"] = alarm_sebanyak(pc, nn)
            al[f"ilews_{lv}"] = [s >= (1 if lv == "kuning" else 2) for s in lain["ilews"]]
            kontras[f"dtss_ilews_{lv}"] = (f"C_{lv}", f"ilews_{lv}")
        k = boot_kontras(ctx, ix, y, sk, al, kontras, ulang, m=m)
        tss_klim = tss_dari(kontingensi(al["klim_waspada"], y))
        mde = mde80_nyata(se_skala[nm], sum(y)) if se_skala and nm in se_skala else None
        rinci = {"auc_dalam_kab": {n: auc_dalam_kab(kis, y, sk[n])[0] for n in ("C", "klim", "b2b", "hujan", "v1") + (("LHN",) if "LHN" in sk else ())},
                 "tss": {n: round(tss_dari(kontingensi(al[n], y)), 5) for n in al}, "sedi_waspada": {n: sedi_dari(kontingensi(al[f"{n}_waspada"], y)) for n in ("C", "klim")},
                 "nilai_ekonomi": {f"a={a}|{lv}": {n: nilai_ekonomi(alarm_sebanyak(sk[n], na[lv]), y, a) for n in ("C", "klim")} for a in (0.02, 0.10, 0.30) for lv in na},
                 "n": N, "positif_y1": sum(y), "positif_y0": sum(ctx.R_y0[i] for i in ix), "positif_y1_dibi_saja": sum(ctx.R_y1d[i] for i in ix),
                 "ilews": tak_def or "terdefinisi", "mde_80_nyata": mde, "m": m}
        wl_d = {}
        for wl in ctx.wilayah:
            r_ = [j for j, i in enumerate(ix) if ctx.wil_kab[ctx.R_kab[i]] == wl]
            pw = sum(y[j] for j in r_)
            if pw >= 40:
                d = tss_dari(kontingensi([al["C_waspada"][j] for j in r_], [y[j] for j in r_])) - tss_dari(kontingensi([al["klim_waspada"][j] for j in r_], [y[j] for j in r_]))
                wl_d[wl] = {"dtss_waspada": round(d, 5), "positif": pw, "status": "tidak terbukti di wilayah ini (menahan)" if d <= 0 else "tidak menahan"}
            else:
                wl_d[wl] = {"status": "belum cukup data", "positif": pw}
        rinci["per_wilayah"] = wl_d
        K1 = tss_dari(kontingensi(al["C_waspada"], [ctx.R_y1d[i] for i in ix])) - tss_dari(kontingensi(al["klim_waspada"], [ctx.R_y1d[i] for i in ix]))
        rinci["K1_dibi_saja_dtss_waspada"] = round(K1, 5)
        ak_ = {lv: alarm_sebanyak(kl, na[lv]) for lv in na}
        ac_ = {lv: alarm_sebanyak(pc, na[lv]) for lv in na}
        rinci["laporan"] = laporan_buka(ctx, ix, y, pc, kl, ac_, ak_, na, kab_aktif, sk["v1"], al["v1_waspada"])
        v = vonis_buka(k, mde, tss_klim)
        out[nm] = {"kontras": k, "vonis": v, "rinci": rinci,
                   "vektor": {"ix": list(ix), "kab": [ctx.kab_keys[x] for x in kis], "tanggal": [str(tgl_idx(ctx.R_e[i], ctx.mulai)) for i in ix], "y1": y, "y0": [ctx.R_y0[i] for i in ix],
                              "skor": {n: [round(x, 7) for x in v_] for n, v_ in sk.items()}, "alarm": {n: [int(x) for x in v_] for n, v_ in al.items()}}}
    lulus = {n: out[n]["vonis"]["vonis"].startswith("LULUS") for n in kandidat}
    tay = None
    if "LH-W" in kandidat and lulus["LH-W"] and "dtss_lhn_waspada" in out["LH-W"]["kontras"] and out["LH-W"]["kontras"]["dtss_lhn_waspada"]["ci"][0] > 0 and out["LH-W"]["kontras"]["dauc_lhn"]["ci"][0] > 0:
        tay = "LH-W"
    elif lulus.get("LH-N"):
        tay = "LH-N"
    out["_ringkas"] = {"lulus_p1_calon": tay, "lulus": lulus, "p2": "tidak dinilai, izin tayang BELUM penuh",
                       "catatan": "LH-W calon hanya bila LULUS dan menang atas LH-N (dTSS Waspada dan dAUC dalam-kab batas bawah > 0); LH-N pembanding-saja tak pernah calon. LULUS P1 (ERA5) = calon, BUKAN izin tayang"}
    return out


def dtss_waspada_titik(ctx_t, ctx_p, ix, cfg, y_nama="R_y1"):
    """Titik dTSS Waspada (C - klim) pada baris `ix` konteks prospektif, model dilatih pada ctx_t (dipakai K2: ctx_t tanpa hari g=1 murni)."""
    A = frozenset(LATIH_TAHUN)
    F = fitur(ctx_p, A, ix)
    y = [getattr(ctx_p, y_nama)[i] for i in ix]
    na = n_alarm(len(ix), ALARM["waspada"])
    pc = skor_penuh(ctx_p, cocok_penuh(ctx_t, A, cfg), ix, F)
    pk = skor_penuh(ctx_p, cocok_penuh(ctx_t, A, cfg_dari(ctx_t, [], 0.05, None)), ix, F)
    return tss_dari(kontingensi(alarm_sebanyak(pc, na), y)) - tss_dari(kontingensi(alarm_sebanyak(pk, na), y))


def buka_tulis(hasil, k2_fn, folder=None):
    """P4: tulis hasil utama (buka.json) dan vektor per baris (buka_vektor.json.gz) LEBIH DULU; K2 (latih ulang, lama, bisa gagal) dibungkus try dan ditulis terpisah."""
    folder = folder or KELUAR
    vek = {n: h.pop("vektor") for n, h in hasil.items() if n != "_ringkas"}
    json.dump(hasil, open(os.path.join(folder, "buka.json"), "w"), separators=(",", ":"))
    json.dump(vek, gzip.open(os.path.join(folder, "buka_vektor.json.gz"), "wt"), separators=(",", ":"))
    try:
        k2 = k2_fn()
    except Exception as e:
        k2 = {"galat": repr(e)[:300], "catatan": "K2 gagal; hasil utama sudah tertulis"}
        print("K2 gagal (hasil utama sudah tertulis):", repr(e)[:200])
    json.dump(k2, open(os.path.join(folder, "buka_k2.json"), "w"), separators=(",", ":"))
    return k2


def tulis_galat_buka(e, riwayat_awal=None):
    """buka.galat.json: alasan, waktu, sha256 hidup saat galat; galat sebelumnya disimpan di `riwayat`."""
    lama = json.load(open(J("buka.galat.json"))) if os.path.exists(J("buka.galat.json")) else None
    json.dump({"alasan": repr(e)[:300], "waktu": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sha256_hidup": hash_label_hidup(),
               "riwayat": ([{k: lama[k] for k in ("alasan", "waktu", "sha256_hidup")}] + lama.get("riwayat", [])) if lama else []}, open(J("buka.galat.json"), "w"), separators=(",", ":"))


def syarat_lanjut():
    """`buka --lanjut` hanya bila: buka.mulai ada, buka.json TIDAK ada, buka.galat.json ada, dan sha256_hidup sekarang sama dengan yang di buka.mulai. -> dict mulai."""
    if not os.path.exists(J("buka.mulai")):
        sys.exit("--lanjut ditolak: buka.mulai belum ada (jalankan `buka` biasa)")
    if os.path.exists(J("buka.json")):
        sys.exit("--lanjut ditolak: buka.json sudah ada (buka sudah selesai)")
    if not os.path.exists(J("buka.galat.json")):
        sys.exit("--lanjut ditolak: buka.galat.json tidak ada (buka tidak berhenti karena galat tercatat)")
    mu = json.load(open(J("buka.mulai")))
    if mu.get("sha256_hidup") != hash_label_hidup():
        sys.exit("--lanjut ditolak: berkas hidup (hujan/kejadian/logbook) berbeda dari saat buka.mulai ditulis")
    return mu


def buka(awal_diminta=None, ulang=None, lanjut=False):
    """buka: menolak bila sidik belum di-commit di origin/main, jendela dimulai pada/sebelum tanggal commit .sidik, atau sebelum label susulan L2 (2027-06-29).
    Semua pemeriksaan murah SEBELUM buka.mulai (satu-kali); penilaian dibungkus: galat apa pun menulis buka.galat.json lalu dilempar ulang; `lanjut` (A-42) hanya pada syaratnya."""
    T = tanggal_T()
    hi = hari_ini()
    awal = KC.gerbang_buka(awal_diminta or KC.awal_efektif(T or hi), T, hi, kering=False)
    kp = J("kandidat.json")
    if not os.path.exists(kp):
        sys.exit("kandidat.json belum ada")
    kand = json.load(open(kp))
    sidik_ = kand["sidik"]
    if sidik_ != sidik_penuh({k: v for k, v in kand.items() if k != "sidik"}):
        sys.exit("sidik berubah sejak `latih`: buka ditolak")
    bc = sidik_commit()                                  # P2: kandidat.json lokal harus SAMA dengan sidik yang benar-benar ter-commit di origin/main
    if bc is None or bc.get("sidik") != sidik_:
        sys.exit(f"sidik kandidat.json ({sidik_}) berbeda dari sidik ter-commit di origin/main ({None if bc is None else bc.get('sidik')}): buka ditolak")
    mulai_lama = syarat_lanjut() if lanjut else None
    lt = [b for b in baca_jejak() if b.get("jenis") == "latih"]
    if lt and lt[-1].get("hasil") != "ok":
        sys.exit(f"baris jejak latih terakhir bukan 'ok' ({lt[-1].get('hasil')}): kandidat.json bukan hasil latih terakhir, buka ditolak")
    peta = kand["wilayah_peta"]
    ctx_t = konteks_nyata(sumber="beku")           # peta wilayah dihitung ulang dari label beku; cek_konteks_beku menguji sama dengan yang dibekukan (BUKAN diset dari kand)
    cek_konteks_beku(ctx_t, kand)
    cek_live_vs_beku()
    akhir = PROSPEKTIF_AKHIR - dt.timedelta(days=1)
    akh_lb = PROSPEKTIF_AKHIR + dt.timedelta(days=1)
    ctx_p = konteks_nyata(awal=awal, akhir=akhir, akhir_label=akh_lb, sumber="prospektif")
    set_wilayah(ctx_p, peta)
    assert ctx_p.kab_keys == ctx_t.kab_keys and ctx_p.wilayah == ctx_t.wilayah and ctx_p.sels == ctx_t.sels, "kab/wilayah/sel konteks prospektif berbeda dari konteks latih"
    ix = [i for i in range(ctx_p.n) if awal <= tgl_idx(ctx_p.R_e[i], ctx_p.mulai) <= PROSPEKTIF_AKHIR]
    # --- semua yang murah dan bisa gagal SEBELUM tulis_mulai (N2)
    wajib_model = set(kand["hidup"]) | {"klim", "b2b"} | ({"LH-N"} if "LH-W" in kand["hidup"] else set())
    if not wajib_model <= set(kand["model"]) or not set(kand["hidup"]) <= set(kand["mde"]):
        sys.exit(f"kandidat.json tak lengkap: model hilang {sorted(wajib_model - set(kand['model']))}, mde hilang {sorted(set(kand['hidup']) - set(kand['mde']))}")
    if not ix:
        sys.exit("tidak ada baris prospektif pada jendela ini (hujan hidup belum menjangkau awal jendela?): buka ditolak")
    if sum(ctx_p.R_y1[i] for i in ix) <= 0:
        sys.exit("positif y1 prospektif = 0 (label belum terisi?): buka ditolak")
    kab_aktif = kab_aktif_dari(ctx_t)
    se_skala = {n: kand["mde"][n]["se_skala"] for n in kand["hidup"]}
    modelos = kand["model"]                        # semua model (kandidat, LH-N, klim, B2b) dibekukan di `latih`; tidak ada pelatihan di sini
    ke = kand["riwayat_latih"]["ke"]
    if lanjut:
        jejak_lanjut = [b for b in baca_jejak() if b.get("jenis") == "lanjut"]
        tambah_jejak({"jenis": "lanjut", "waktu": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sidik": sidik_, "ke": len(jejak_lanjut) + 1,
                      "galat_sebelumnya": json.load(open(J("buka.galat.json")))["alasan"]})
        n_lanjut = len(jejak_lanjut) + 1
    else:
        tulis_mulai("buka", sidik_, {"sha256_hidup": hash_label_hidup()})
        n_lanjut = 0
    try:
        hasil = buka_hitung(ctx_p, ix, kand["hidup"], modelos, ULANG_BUKA if ulang is None else ulang, se_skala, kand["m"], kab_aktif)
        info_lama = bc.get("info_banjir_transitif") or {}
        beda = [r for r in INFO_TRANSITIF if info_lama.get(r) != hash_berkas(r)]        # (c) INFORMASI saja: dilaporkan, tidak menolak
        hasil["_ringkas"].update({"lanjut": n_lanjut, "latih_ke": ke, "info_banjir_transitif_beda": beda,
                                  "catatan_latih": ("latih ke-%d: %d percobaan latih sebelumnya; koreksi uji jamak (m) tidak mencakup percobaan ulang" % (ke, ke - 1)) if ke > 1 else None})
        for n, h in hasil.items():
            if n != "_ringkas":
                h["vonis"]["latih_ke"] = ke
                h["vonis"]["lanjut"] = n_lanjut

        def k2():
            ct2, cp2 = konteks_nyata(tanpa_g1_murni=True, sumber="beku"), konteks_nyata(awal=awal, akhir=akhir, akhir_label=akh_lb, tanpa_g1_murni=True, sumber="prospektif")
            set_wilayah(ct2, peta); set_wilayah(cp2, peta)
            ix2 = [i for i in range(cp2.n) if awal <= tgl_idx(cp2.R_e[i], cp2.mulai) <= PROSPEKTIF_AKHIR]
            out = {}
            for n in kand["hidup"]:
                d2 = round(dtss_waspada_titik(ct2, cp2, ix2, kand["cfg"][n]), 5)
                d1 = hasil[n]["rinci"]["K1_dibi_saja_dtss_waspada"]
                out[n] = {"K1_dtss_waspada": d1, "K2_dtss_waspada": d2, "peka_label": min(d1, d2) <= 0 and hasil[n]["vonis"]["vonis"].startswith("LULUS")}
            return out
        buka_tulis(hasil, k2)
    except BaseException as e:
        tulis_galat_buka(e)
        raise
    for n, h in hasil.items():
        if n != "_ringkas":
            print(n, h["vonis"]["vonis"])
    print("lulus P1 (calon):", hasil["_ringkas"]["lulus_p1_calon"], "-", hasil["_ringkas"]["p2"], "| latih ke", ke, "| lanjut", n_lanjut)
    if hasil["_ringkas"]["info_banjir_transitif_beda"]:
        print("INFO: impor transitif banjir berbeda dari saat sidik:", hasil["_ringkas"]["info_banjir_transitif_beda"])


# ================================================================== M. data sintetis dan swauji
def sintetis(seed=5, kab_per_prov=(("32", 5), ("11", 4), ("61", 3)), sinyal=1.6, neg_laju=0.5, hari_akhir=None, g1=True):
    """Konteks sintetis 2017-2026 (tanpa data nyata): hujan gamma musiman, kejadian = lantai kab x bulan + sinyal hujan hari-H dan anteseden; statis acak."""
    r = random.Random(seed)
    n_hari = (dt.date(2026, 10, 31) - HARI0).days + 1
    kabs, kab_sel, H, statis, a_kab, ev0, ev_lb = [], {}, {}, {}, {}, {}, {}
    for p, n in kab_per_prov:
        for i in range(n):
            kb = f"{p}|k{i}"
            kabs.append(kb)
            ss = [f"{-6 - i * 0.5 - (0 if j else 0):.2f},{100 + len(kabs) + j * 0.5:.2f}" for j in range(1 + i % 2)]
            kab_sel[kb] = ss
            for s in ss:
                if s not in H:
                    h = []
                    for d in range(n_hari):
                        m = (HARI0 + dt.timedelta(d)).month
                        h.append(int(r.gammavariate(0.8, 14) * (1.7 if m in (11, 12, 1, 2, 3) else 0.5) * 10) if r.random() < 0.55 else 0)
                    H[s] = h
            statis[kb] = {"lereng": r.uniform(2, 30), "sesar": -math.log1p(r.uniform(1, 80)), "pv": r.random() if i % 4 else None}
            a_kab[kb] = r.gauss(5, 1)
    kabs.sort()
    W = {s: jendela_hujan(h) for s, h in H.items()}
    for kb in kabs:
        base = r.uniform(-0.4, 0.4) + 0.8 * (a_kab[kb] - 5) * 0.3
        e0, e1 = set(), set()
        for d in range(WARMUP, n_hari):
            dd = HARI0 + dt.timedelta(d)
            if dd > LABEL_AKHIR:
                break
            m = dd.month
            x = max(H[s][d] for s in kab_sel[kb]) / 10
            a2 = max(W[s][0][d] or 0 for s in kab_sel[kb]) / 10
            eta = -5.6 + base + (0.6 if m in (11, 12, 1, 2, 3) else 0) + sinyal * (min(x, 100) / 100) * 3 + sinyal * 0.8 * min(a2, 100) / 100 * 2 + statis[kb]["lereng"] / 30 * min(x, 100) / 100 * 2
            if r.random() < 1 / (1 + math.exp(-eta)):
                e0.add(dd) if (not g1 or r.random() < 0.9) else e0.add(dd)
        ev0[kb] = e0
        ev_lb[kb] = {d for d in e0 if d.year >= 2025 and r.random() < 0.6} | ({LABEL_AKHIR - dt.timedelta(days=40 + r.randrange(30))} if r.random() < 0.3 else set())
    ctx = bangun_ctx(H, HARI0, kabs, kab_sel, statis, a_kab, ev0, ev_lb, HARI0 + dt.timedelta(WARMUP), hari_akhir or AKHIR_BARIS, neg_laju)
    ctx.b_gamma = 40
    gw = gabung_wilayah(ctx, set(LATIH_TAHUN), {"n_kab": 3, "P_w": 20, "T_w": 3, "T_min_positif": 3})
    set_wilayah(ctx, gw["peta"])
    ctx.wilayah_info = gw
    ctx.ev0, ctx.ev_lb, ctx.kab_sel_in = ev0, ev_lb, kab_sel
    return ctx


def _tolak(f, frag):
    try:
        f()
    except SystemExit as e:
        pesan = getattr(e, "pesan", None) or str(e)
        assert frag in pesan, (frag, pesan)
        return
    except Exception as e:
        assert frag in str(e), (frag, str(e))
        return
    raise AssertionError(f"harus ditolak: {frag}")


def uji():
    global TAU_GRID, ALARM, B_GAMMA, LABEL_AKHIR
    r = random.Random(7)
    # --- k3: impor model_kab_campur TIDAK mengubah konstanta longsor maupun keluaran model.uji_balik v1 (snapshot diambil SEBELUM impor)
    assert _ANTES["konst"] == repr((LM.LATIH, LM.UJI_TAHUN, LM.MULAI, LM.CN_BAWAAN)), "impor banjir mengubah konstanta longsor"
    assert _ANTES["uji_balik"] == _toy_uji_balik_v1(), "impor banjir mengubah keluaran model.uji_balik v1"
    assert LM.UJI_TAHUN == (2022, 2023, 2025) and K2.MK.LATIH != LM.LATIH   # banjir ditambal ke 2016-2023, longsor tetap sendiri
    assert LABEL_AKHIR == KC.LABEL_AKHIR and KC.PROSPEKTIF_AKHIR == PROSPEKTIF_AKHIR and KC.BUKA_PALING_CEPAT == dt.date(2027, 6, 29)
    ctx = sintetis()
    assert ctx.nk == 12 and len(ctx.wilayah) >= 2 and {t for t in ctx.sl} == set(LATIH_TAHUN), (ctx.nk, ctx.wilayah, sorted(ctx.sl))
    # --- (k) 2024 tidak masuk baris; tetangga 2024 keluar; g=1 positif; GLC/logbook tidak masuk y0
    assert 2024 not in ctx.sl and all(tgl_idx(e).year != 2024 for e in ctx.R_e)
    dset = {tgl_idx(e) for e in ctx.R_e}
    assert dt.date(2023, 12, 31) not in dset and dt.date(2025, 1, 1) not in dset and dt.date(2023, 12, 30) in dset and dt.date(2025, 1, 2) in dset
    assert max(tgl_idx(e) for e in ctx.R_e) == AKHIR_BARIS and min(tgl_idx(e) for e in ctx.R_e) == HARI0 + dt.timedelta(WARMUP)
    kej_m = {"kab": ["32|k0", "32|k1"], "dibi": [["2025-03-01", 0, 1, 0], ["2025-03-02", 0, 1, 1], ["2025-03-03", 1, 1, 1], ["2024-03-03", 0, 1, 0], ["2026-10-19", 0, 1, 0], ["2026-10-18", 1, 1, 0]]}
    pos, murni, _ = label_dibi(kej_m, ["32|k0", "32|k1"])
    assert pos["32|k0"] == {dt.date(2025, 3, 1), dt.date(2025, 3, 2)} and pos["32|k1"] == {dt.date(2025, 3, 3), dt.date(2026, 10, 18)}      # g=1 positif, 2024 & > 10-18 dibuang
    assert murni == {"32|k0": {dt.date(2025, 3, 2)}, "32|k1": {dt.date(2025, 3, 3)}}
    p2, _, _ = label_dibi(kej_m, ["32|k0", "32|k1"], tanpa_g1_murni=True)
    assert p2["32|k0"] == {dt.date(2025, 3, 1)}                                                                                          # K2: g=1 murni dibuang
    kej_g = {**kej_m, "dibi": [["2025-03-01", 0, 1, 0]]}
    assert label_dibi(kej_g, ["32|k0"])[0] != label_dibi({**kej_g, "dibi": []}, ["32|k0"])[0]                                              # mutasi tipe/g mengubah y0
    lbm = label_logbook([{"jenis": "longsor", "kab_kode": "32.01", "mulai": "2026-10-18", "terlihat": ["2026-10-18"] * 2}, {"jenis": "longsor", "kab_kode": "32.01", "mulai": "2026-10-19", "terlihat": ["2026-10-19"] * 2},
                         {"jenis": "banjir", "kab_kode": "32.01", "mulai": "2026-03-01", "terlihat": ["2026-03-01"] * 2}, {"jenis": "longsor", "kab_kode": "32.01", "mulai": None, "terlihat": ["2025-05-05"] * 2}],
                        {"32.01": "32|k0"})
    assert lbm == {"32|k0": {dt.date(2026, 10, 18)}}
    # mutasi logbook/GLC tidak mengubah y0 (hanya y1)
    ev_lb2 = {k: set(v) | {HARI0 + dt.timedelta(400)} for k, v in ctx.ev_lb.items()}
    c2 = bangun_ctx(ctx.H, ctx.mulai, ctx.kab_keys, ctx.kab_sel_in, {k: {"lereng": 1, "sesar": 1, "pv": 0.5} for k in ctx.kab_keys}, {}, ctx.ev0, ev_lb2, HARI0 + dt.timedelta(WARMUP), AKHIR_BARIS, 0.5)
    assert bytes(c2.R_y0) == bytes(ctx.R_y0) and bytes(c2.R_y1) != bytes(ctx.R_y1) and c2.AG == ctx.AG
    assert all(ctx.R_y1[i] >= ctx.R_y0[i] and ctx.R_y1[i] >= ctx.R_y1d[i] >= ctx.R_y0[i] for i in range(0, ctx.n, 7))
    # y1 = +-1 hari simetris
    ki0 = 0
    ev = sorted(ctx.ev0[ctx.kab_keys[ki0]] - {d for d in ctx.ev0[ctx.kab_keys[ki0]] if d.year == 2024})
    d0 = next(d for d in ev if 2018 <= d.year <= 2022 and d.day > 3)
    pos_i = {(ctx.R_kab[i], tgl_idx(ctx.R_e[i])): i for i in range(*ctx.sl[d0.year]) if ctx.R_kab[i] == ki0}
    for dd in (-1, 0, 1):
        assert ctx.R_y1d[pos_i[(ki0, d0 + dt.timedelta(dd))]] == 1
    assert ctx.R_y0[pos_i[(ki0, d0 + dt.timedelta(1))]] == (1 if d0 + dt.timedelta(1) in ctx.ev0[ctx.kab_keys[ki0]] else 0)
    # --- (e) fitur hari e: hujan > e tidak berpengaruh; rH memakai hari e; a2 hanya e-2..e-1; a7 e-7..e-3; a14 e-14..e-8; terpisah
    A = frozenset({2017, 2018, 2019, 2020})
    ixs = [i for i in range(*ctx.sl[2022])][::97][:30]
    f0 = {n: list(v) for n, v in fitur(ctx, A, ixs).items()}
    i_t = ixs[5]
    ki_t, e_t = ctx.R_kab[i_t], ctx.R_e[i_t]
    s_t = ctx.sels[ki_t][0]
    def mut(dd, v=900):
        h = ctx.H[s_t]
        simpan = list(h)
        for d in dd:
            h[e_t + d] = v
        ctx.W.pop(s_t, None); ctx._stat.clear()
        try:
            return {n: list(vv) for n, vv in fitur(ctx, A, ixs).items()}
        finally:
            h[:] = simpan
            ctx.W.pop(s_t, None); ctx._stat.clear()
    idx5 = 5
    def beda(m, nama):
        return [n for n in nama if m[n][idx5] != f0[n][idx5]]
    assert not beda(mut(range(1, 12)), FITUR_ALL)                                         # hujan > e: tak satu fitur pun
    assert "rH" in beda(mut([0]), FITUR_ALL) and set(beda(mut([0]), FITUR_ALL)) <= {"rH", "lr_lereng", "lr_sesar", "lr_pv"}   # hari e hanya rH (dan interaksinya)
    assert beda(mut([-1]), ["a2", "a7", "a14", "rH"]) == ["a2"] and beda(mut([-2]), ["a2", "a7", "a14", "rH"]) == ["a2"]
    assert beda(mut([-3]), ["a2", "a7", "a14", "rH"]) == ["a7"] and beda(mut([-7]), ["a2", "a7", "a14", "rH"]) == ["a7"]
    assert beda(mut([-8]), ["a2", "a7", "a14", "rH"]) == ["a14"] and beda(mut([-14]), ["a2", "a7", "a14", "rH"]) == ["a14"]
    assert not beda(mut([-15]), ["a2", "a7", "a14", "rH"])
    w = jendela_hujan([10] * 20)
    assert w[0][2] == 20 and w[0][1] is None and w[1][7] == 50 and w[2][14] == 70 and w[2][13] is None
    assert jendela_hujan([10] * 9 + [-1] + [10] * 10)[0][11] is None and jendela_hujan([10] * 9 + [-1] + [10] * 10)[0][10] is None
    # --- (f) P99/persentil/standardisasi lipatan tak berubah bila hujan tahun uji (2022) dimutasi
    ac = frozenset({2017, 2018, 2019, 2020, 2021})
    cfg = cfg_dari(ctx, "S1", 0.25, None)
    m_a = cocok(ctx, ac, cfg)
    s_a = {s: v for s, v in stat(ctx, ac)["p99"].items()}
    for s in ctx.sel_pakai:
        for e in ctx.hari_stat[2022]:
            ctx.H[s][e] = 5000
    ctx.W.clear(); ctx._stat.clear(); ctx._F.clear(); ctx._kp.clear()
    m_b = cocok(ctx, ac, cfg)
    assert stat(ctx, ac)["p99"] == s_a and m_a["mu"] == m_b["mu"] and m_a["sd"] == m_b["sd"] and m_a["beta"] == m_b["beta"]
    ctx = sintetis()                                                                       # bangun ulang bersih
    # --- 7A2 (a)(b): beta = 0 -> p = p0 (offset koefisien 1); (c) beta >= 0; (d) mutasi label tahun z tak mengubah lantai LOYO/fitur z
    cfg0 = cfg_dari(ctx, [], 0.1, None)
    Aj = frozenset({2017, 2018, 2019, 2020, 2021})
    kp0 = cocok_penuh(ctx, Aj, cfg0)
    ix22 = list(range(*ctx.sl[2022]))
    assert kp0["model"]["beta"] == [] and kp0["model"]["nama"] == []
    e0 = eta_baris(ctx, kp0["model"], ix22, {})
    for k, i in enumerate(ix22[::53]):
        assert abs(e0[k * 53] - KC.offset_dari(KC.lantai_p(kp0["model"]["lantai"], ctx.kab_keys[ctx.R_kab[i]], ctx.R_bl[i]))) < 1e-12
    cfg1 = cfg_dari(ctx, "S1", 0.25, None)
    m1 = cocok(ctx, Aj, cfg1)
    assert all(b >= 0 for b in m1["beta"]) and all(c >= 0 for k in m1["koef"] for c in k) and all(c >= 0 for k in m1["koef_w"].values() for c in k) and sum(m1["beta"]) > 0.2 and m1["iter"] <= KC.ITER_MAKS
    F22 = F_ev(ctx, Aj, 2022)
    e1 = eta_baris(ctx, m1, ix22, F22)
    for k in range(0, len(ix22), 211):                                                     # (b): eta = logit(p0) + sum beta z, koefisien offset TETAP 1
        i = ix22[k]
        z = sum(m1["koef_w"][ctx.wil_kab[ctx.R_kab[i]]][j] * (F22[n][k] - m1["mu"][j]) / m1["sd"][j] for j, n in enumerate(m1["nama"]) if F22[n][k] == F22[n][k])
        assert abs(e1[k] - KC.offset_dari(KC.lantai_p(m1["lantai"], ctx.kab_keys[ctx.R_kab[i]], ctx.R_bl[i])) - z) < 1e-9
    # koefisien sebenarnya negatif -> 0: balik tanda sinyal hujan pada label
    kp_a = cocok_penuh(ctx, Aj, cfg1)
    oof_a = _oof_tahun(ctx, Aj, cfg1, 2019)
    y_asli = bytes(ctx.R_y0)
    p0_a = dict(p0_loyo(ctx, Aj))
    F_a = {n: list(v) for n, v in F_tr(ctx, Aj - {2019}, 2019).items()}
    lab = ctx.R_y0
    a0, a1 = ctx.sl[2019]
    for i in range(a0, a1):
        lab[i] = 1 - lab[i]
    ag_simpan = (list(ctx.AG["y"]),)                                                       # agregat lantai mengikuti label baru
    for j in ctx.AGi[2019]:
        ctx.AG["y"][j] = 1 - ctx.AG["y"][j]
    ctx._lf.clear(); ctx._p0.clear(); ctx._kp.clear(); ctx._gam.clear()
    p0_b = p0_loyo(ctx, Aj)
    assert all(p0_a[(ki, 2019, b)] == p0_b[(ki, 2019, b)] for ki in range(ctx.nk) for b in range(1, 13))           # (d) lantai LOYO baris z tak melihat label z
    assert any(p0_a[(ki, 2020, b)] != p0_b[(ki, 2020, b)] for ki in range(ctx.nk) for b in range(1, 13))           # tahun lain berubah (diharapkan)
    F_b = {n: list(v) for n, v in F_tr(ctx, Aj - {2019}, 2019).items()}
    assert all(F_a[n][:50] == F_b[n][:50] or all((x != x and y != y) or x == y for x, y in zip(F_a[n], F_b[n])) for n in FITUR_ALL)   # fitur tak bergantung label
    oof_b = _oof_tahun(ctx, Aj, cfg1, 2019)
    assert all(abs(x - y) < 1e-9 for x, y in zip(oof_a, oof_b))                                                    # logit luar-lipatan tahun z tak berubah
    lab[:] = y_asli
    ctx.AG["y"][:] = ag_simpan[0]
    ctx._lf.clear(); ctx._p0.clear(); ctx._kp.clear(); ctx._gam.clear()
    # penyelesai menjepit koefisien negatif: label dibalik terhadap rH
    Zs = [[r.gauss(0, 1) for _ in range(3)] for _ in range(500)]
    offs = [r.gauss(-2, .4) for _ in range(500)]
    ys = [1 if r.random() < KC.sig(offs[i] - 1.0 * Zs[i][2] + 0.8 * Zs[i][0]) else 0 for i in range(500)]
    sn = KC.selesai(Zs, ys, [1.0] * 500, offs, tau=1.0)
    assert sn["beta"][2] == 0.0 and sn["beta"][0] > 0.3 and sn["terjepit"] >= 1
    # --- (k2) monotone: statis ternormalisasi peringkat nonneg dan beta >= 0 -> p tidak turun saat rH naik
    assert all(0.0 <= v <= 1.0 for rk in ctx.rank.values() for v in rk)
    assert peringkat([3.0, 1.0, 2.0]) == [5 / 6, 1 / 6, 0.5] and peringkat([None, None]) == [0.5, 0.5] and peringkat([1.0, None, 3.0])[1] == 0.5 * (0.25 + 0.75)
    mm = cocok(ctx, Aj, cfg1)
    nm = mm["nama"]
    jr = nm.index("rH")
    prev = {}
    for step in range(12):
        rh = step * 0.4
        for kab in (0, ctx.nk - 1):
            Fm = {n: array.array("d", [0.0]) for n in FITUR_ALL}
            Fm["rH"] = array.array("d", [rh])
            for n, rk in ctx.rank.items():
                Fm[n] = array.array("d", [rh * rk[kab]])
            ix_m = [next(i for i in range(*ctx.sl[2022]) if ctx.R_kab[i] == kab)]
            eta = eta_baris(ctx, mm, ix_m, Fm)[0]
            assert kab not in prev or eta >= prev[kab] - 1e-12, (rh, eta, prev)
            prev[kab] = eta
    # --- (l) mutasi konstanta tertangkap sidik
    kd, hf, mf = {"x": 1}, (lambda rel: "h"), {"mulai": "2017-01-01", "n_sel": 1, "gabungan": "g"}
    s0 = sidik_penuh(kd, hf, mf)
    simpan = (TAU_GRID, dict(ALARM), B_GAMMA, NEG_LAJU, dict(SYARAT_WIL))
    try:
        TAU_GRID = (0.05, 0.10, 0.30)
        assert sidik_penuh(kd, hf, mf) != s0
        TAU_GRID = simpan[0]
        ALARM["waspada"] = 0.11
        assert sidik_penuh(kd, hf, mf) != s0
        ALARM["waspada"] = 0.10
        B_GAMMA = 400
        assert sidik_penuh(kd, hf, mf) != s0
        B_GAMMA = simpan[2]
        SYARAT_WIL["P_w"] = 199
        assert sidik_penuh(kd, hf, mf) != s0
        SYARAT_WIL["P_w"] = 200
        assert sidik_penuh(kd, hf, mf) == s0 and sidik_penuh({"x": 2}, hf, mf) != s0 and sidik_penuh(kd, hf, {**mf, "gabungan": "h"}) != s0
        assert sidik_penuh(kd, lambda rel: "g" if rel.endswith("model.py") else "h", mf) != s0
        assert sidik_penuh(kd, lambda rel: "g" if rel.endswith("kejadian.json") else "h", mf) == s0
        _tolak(lambda: sidik_wajib_ada(lambda rel: None if rel.endswith("dasar.py") else "h"), "dasar.py")
    finally:
        TAU_GRID, B_GAMMA = simpan[0], simpan[2]
        ALARM.clear(); ALARM.update(simpan[1])
        SYARAT_WIL.clear(); SYARAT_WIL.update(simpan[4])
    besar = [v for k, v in globals().items() if k.isupper() and isinstance(v, (tuple, list, dict, set))]
    for nm_, fn in list(globals().items()):                                              # default argumen tidak boleh mengikat OBJEK konstanta global (kasus ilmu 1 Nov)
        if inspect.isfunction(fn) and fn.__module__ == __name__:
            for p_ in inspect.signature(fn).parameters.values():
                assert not any(p_.default is v for v in besar), (nm_, p_.name)
    # --- (i) pemotongan label dan penolakan buka; (mutasi LABEL_AKHIR tertangkap)
    KC.pastikan_label_terpotong([dt.date(2026, 10, 18)])
    _tolak(lambda: KC.pastikan_label_terpotong([dt.date(2026, 10, 19)]), "DILARANG")
    assert potong_tanggal(["2026-10-19", "2026-10-18T10:00"]) == [dt.date(2026, 10, 18)]
    T0 = dt.date(2026, 11, 10)
    _tolak(lambda: KC.gerbang_buka(dt.date(2026, 11, 10), T0, dt.date(2027, 7, 1)), "lebih baru dari awal jendela")
    _tolak(lambda: KC.gerbang_buka(dt.date(2026, 11, 11), T0, dt.date(2027, 6, 28)), "paling cepat")
    _tolak(lambda: KC.gerbang_buka(dt.date(2026, 11, 11), None, dt.date(2027, 7, 1)), "belum ada")
    assert KC.gerbang_buka(dt.date(2026, 11, 11), T0, dt.date(2027, 6, 29)) == dt.date(2026, 11, 11)
    with tempfile.TemporaryDirectory() as tmp:                                           # T dari committer date commit sidik pertama (bukan author date)
        git = lambda *a, env=None: subprocess.run(["git", "-C", tmp, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True, env={**os.environ, **(env or {})})
        git("init", "-q", "-b", "main")
        f = os.path.join(tmp, "x.sidik")
        open(f, "w").write(json.dumps({"jenis": "latih"}) + "\n")
        git("add", "x.sidik"); git("commit", "-q", "-m", "l", env={"GIT_COMMITTER_DATE": "2026-11-04T10:00:00+07:00"})
        assert KC.tanggal_T(tmp, "main", "x.sidik") is None
        open(f, "a").write(json.dumps({"jenis": "sidik"}) + "\n")
        git("add", "x.sidik"); git("commit", "-q", "-m", "s", env={"GIT_COMMITTER_DATE": "2026-11-06T23:30:00+07:00", "GIT_AUTHOR_DATE": "2026-10-01T10:00:00+07:00"})
        assert KC.tanggal_T(tmp, "main", "x.sidik") == dt.date(2026, 11, 6)
        assert sidik_commit(tmp, "main", "x.sidik") is not None and sidik_commit(tmp, "main", "x.sidik")["jenis"] == "sidik"
    with tempfile.TemporaryDirectory() as tmp:                                           # P2: sidik ter-commit PERTAMA dibaca dari git, bukan berkas lokal
        git = lambda *a: subprocess.run(["git", "-C", tmp, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True)
        git("init", "-q", "-b", "main")
        f = os.path.join(tmp, "x.sidik")
        open(f, "w").write(json.dumps({"jenis": "latih", "sidik": "L"}) + "\n")
        git("add", "x.sidik"); git("commit", "-q", "-m", "l")
        assert sidik_commit(tmp, "main", "x.sidik") is None
        open(f, "a").write(json.dumps({"jenis": "sidik", "sidik": "aaa"}) + "\n")
        git("add", "x.sidik"); git("commit", "-q", "-m", "s")
        open(f, "a").write(json.dumps({"jenis": "sidik", "sidik": "bbb"}) + "\n")
        git("add", "x.sidik"); git("commit", "-q", "-m", "s2")
        assert sidik_commit(tmp, "main", "x.sidik")["sidik"] == "aaa"                           # yang pertama ter-commit menang
        open(f, "a").write(json.dumps({"jenis": "sidik", "sidik": "lokal-belum-commit"}) + "\n")
        assert sidik_commit(tmp, "main", "x.sidik")["sidik"] == "aaa"
        _tolak(lambda: sidik_commit(tmp, "origin/tidak-ada", "x.sidik"), "git log")
    # --- (j) tenggang +k: prakiraan hanya dari terbit <= e-k
    e_ = dt.date(2026, 12, 10)
    assert prakiraan_ok(dt.date(2026, 12, 9), e_, 1) and not prakiraan_ok(dt.date(2026, 12, 10), e_, 1) and prakiraan_ok(dt.date(2026, 12, 7), e_, 3) and not prakiraan_ok(dt.date(2026, 12, 8), e_, 3)
    # --- (g) hari WIB bukan UTC (SWI sekunder, belum diimplementasi: hanya pembeda indeks hari)
    assert KC.tgl_wib("2026-11-04T18:00:00Z") == dt.date(2026, 11, 5) and KC.tgl_wib("2026-11-04T16:59:00+00:00") == dt.date(2026, 11, 4) and tgl_idx(1) - tgl_idx(0) == dt.timedelta(1)
    # --- (h) zona_perki (prakiraan Des 2024) tidak terbaca: kolom dibaca BERNAMA, kolom beracun tak mengubah hasil
    kecs_m = [{"id": "32|A|a", "prov": "32", "kab": "A", "kec": "a", "cincin": [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]]}, {"id": "32|A|b", "prov": "32", "kab": "A", "kec": "b", "cincin": [[[0.1, 0], [0.2, 0], [0.2, 0.1], [0.1, 0.1], [0.1, 0]]]}]
    ker = {"kolom": ["lat", "lon", "lereng_p75", "sesar_km", "cn", "S", "pv_zona", "S_pv"], "kec": ["32|A|a", "32|A|b"], "k": [[0, 0, 10, 4, 84, .5, 0.4, .5], [0, 0, 20, 8, 84, .5, None, .5]]}
    s1, a1 = statis_kab(ker, kecs_m, {"32|A": [0, 1]}, {"kec": {"32|A|a": 1000, "32|A|b": 3000}})
    ker2 = {**ker, "kolom": ker["kolom"] + ["zona_perki"], "k": [row + [99.0] for row in ker["k"]]}
    assert statis_kab(ker2, kecs_m, {"32|A": [0, 1]}, {"kec": {"32|A|a": 1000, "32|A|b": 3000}}) == (s1, a1)
    assert s1["32|A"]["pv"] == 0.4 and abs(s1["32|A"]["lereng"] - 15) < 1e-9 and "perki" not in inspect.getsource(statis_kab).replace("zona_perki", "") and a1["32|A"] is not None
    # --- kab 'None' keluar dari peta
    kk, ks_, ke_ = peta_kab([{"id": "12|None|a", "prov": "12", "kab": "None", "lat": 1.1, "lon": 99.1}, {"id": "12|B|a", "prov": "12", "kab": "B", "lat": 1.1, "lon": 99.1}])
    assert kk == ["12|B"] and "12|None" not in ks_
    # --- wilayah: syarat 15 / 200 / 4 tahun >= 10; Lainnya penampung; urutan P_w menurun
    gw = gabung_wilayah(ctx, set(LATIH_TAHUN), {"n_kab": 3, "P_w": 20, "T_w": 3, "T_min_positif": 3})
    assert gw["peta"]["Jawa"] == "Jawa" and gw["peta"]["Sulawesi"] == PENAMPUNG and gw["urutan"][-1] == PENAMPUNG
    gw_ketat = gabung_wilayah(ctx, set(LATIH_TAHUN))
    assert not any(v["lolos"] for v in gw_ketat["rincian"].values()) and gw_ketat["cw_sekunder"] and gw_ketat["syarat"] == SYARAT_WIL
    assert SYARAT_WIL == {"n_kab": 15, "P_w": 200, "T_w": 4, "T_min_positif": 10}
    # --- aksesibilitas: gamma > 0 bila kepadatan menaikkan laju lapor, = 0 bila tidak; gamma = 0 -> lantai persis CAMPUR
    it = []
    rr = random.Random(3)
    for p in ("32", "11", "61"):
        for k in range(14):
            a = rr.gauss(0, 1)
            it.append((p, 40 * math.exp(0.8 * a) * rr.uniform(.9, 1.1), 1000.0, a))
    g_pos = _gamma_mle(it)
    assert 0.5 < g_pos < 1.1, g_pos
    it0 = [(p, 40 * rr.uniform(.9, 1.1), 1000.0, a) for p, _, _, a in it]
    assert abs(_gamma_mle(it0)) < 0.3
    mod_g = lantai_fit(ctx, frozenset({2017, 2018, 2019}))
    ref = KC.lantai_fit(ctx.AG, [j for t in (2017, 2018, 2019) for j in ctx.AGi[t]])
    assert mod_g["gamma"] > 0 and mod_g["rk"] != ref["rk"]                                      # CI bootstrap > 0: prior kab mengikuti kepadatan
    k32 = sorted((k for k in ctx.kab_keys if k.startswith("32|")), key=lambda k: ctx.a_dev[k])
    unit_ = lambda k: KC.prov_dari(k) if mod_g["n_kab_prov"].get(KC.prov_dari(k), 0) >= 3 else "pulau:" + str(KC.calon_dari(KC.prov_dari(k)))
    nk_ = {k: sum(v[0] for kk, v in ref["kb"].items() if kk.rsplit("|", 1)[0] == k) for k in ctx.kab_keys}
    dk_ = {k: sum(v[1] for kk, v in ref["kb"].items() if kk.rsplit("|", 1)[0] == k) for k in ctx.kab_keys}
    for k in ctx.kab_keys:                                                                       # A-3 rev.: (n_k + HALUS ru exp(g dev)) / (d_k + HALUS); laju kab sendiri TETAP masuk
        assert abs(mod_g["rk"][k] - (nk_[k] + KC.HALUS * ref["ru"][unit_(k)] * math.exp(mod_g["gamma"] * ctx.a_dev[k])) / (dk_[k] + KC.HALUS)) < 1e-12, k
        assert abs(rk_aksesibilitas(ref, ctx.kab_keys, ctx.a_dev, 0.0)[k] - ref["rk"][k]) < 1e-12              # gamma = 0 -> rk CAMPUR persis
    assert any(abs(mod_g["rk"][k] - ref["ru"][unit_(k)] * math.exp(mod_g["gamma"] * ctx.a_dev[k])) > 1e-6 for k in ctx.kab_keys)      # bukan prior murni
    mod_0 = lantai_fit(ctx, frozenset(LATIH_TAHUN))
    ref0 = KC.lantai_fit(ctx.AG, [j for t in LATIH_TAHUN for j in ctx.AGi[t]])
    assert mod_0["gamma"] == 0.0 and mod_0["rk"] == ref0["rk"]                                  # CI melewati 0 -> gamma := 0 -> lantai = CAMPUR persis
    assert all(KC.lantai_p(mod_0, k, b) == KC.lantai_p(ref0, k, b) for k in ctx.kab_keys for b in (1, 6, 12))
    # --- ukuran dan pembanding: TSS/SEDI/alarm; ILEWS; Muntohar; nilai ekonomi
    assert abs(tss_dari([8, 2, 2, 88]) - (0.8 - 2 / 90)) < 1e-12 and sedi_dari([0, 3, 4, 3]) is None and sedi_dari([8, 2, 2, 88]) > 0.8
    assert sum(alarm_sebanyak([0.1] * 100, 10)) == 10 and sum(alarm_sebanyak([float(i) for i in range(100)], 3)) == 3 and n_alarm(1000, 0.10) == 100 and n_alarm(1000, 0.03) == 30
    hh = [0] * 20
    hh[10] = 620
    assert ilews_skor(hh, 10) == 1 and ilews_skor(hh, 11) == 0 and ilews_skor(hh, 12) == 0 + int(sum(hh[10:13]) / 10 >= 91)
    hh2 = [0] * 20
    hh2[8], hh2[9], hh2[10] = 300, 300, 400
    assert ilews_skor(hh2, 10) == 1 and ilews_skor([0, 0, 650, 0, 0], 2) == 1 and ilews_skor([0, 0, 650, 300, 0], 3) == 1
    hh3 = [0] * 20
    hh3[10] = 620
    hh3[9] = 300
    assert ilews_skor(hh3, 10) == 2
    d3 = [0] * 30
    for j in range(3):
        d3[20 - j] = 240                       # 24 mm/hari x 3 hari = 72 mm: rerata 1 mm/jam
    assert abs(muntohar_skor(d3, 20) - max((72 / (24 * 3)) / (7.83 * 3 ** -0.328), (48 / (24 * 2)) / (7.83 * 2 ** -0.328))) < 1e-9
    assert muntohar_skor([0] * 30, 20) == 0.0 and muntohar_skor([0, 0, 900], 2) > 0 and muntohar_skor([0, 0, 900], 1) == 0.0
    pk = [True] * 10 + [False] * 90
    assert nilai_ekonomi(pk, [1] * 10 + [0] * 90, 0.3) > 0.99                           # alarm sempurna: V = 1
    # --- gerbang kesia-siaan §4.2: hanya bisa menolak
    assert KC.gerbang_pembekuan(0.0, [1, 1, 1, 1, 1])["hentikan"] and KC.gerbang_pembekuan(0.01, [1, 1, 1, -1, -1])["hentikan"] and not KC.gerbang_pembekuan(0.01, [1, 1, 1, 1, -1])["hentikan"]
    # --- alur penuh sintetis: lipatan, gerbang lima lipatan, MDE, penilai lain, buka_hitung
    ctx = sintetis(sinyal=2.2)
    ev = evaluator(ctx)
    pil = pilih_semua(ctx, ev, cw_sekunder=False)
    assert pil["tau"] in TAU_GRID and pil["tau_w"] in TAUW_GRID and pil["set"] in ("S0", "S1") and set(pil["log"]["dicoret"]) == {"S2", "S3", "S3p"}
    cN, cW = cfg_dari(ctx, pil["set"], pil["tau"], None), cfg_dari(ctx, pil["set"], pil["tau"], pil["tau_w"])
    ix, p = lipat(ctx, cN, 2025)
    ixk, pk_ = lipat(ctx, cfg_dari(ctx, [], 0.05, None), 2025)
    y1 = [ctx.R_y1[i] for i in ix]
    assert ix == ixk and 0 < sum(y1) < len(y1) and G.auc(p, y1) > G.auc(pk_, y1)       # sinyal hujan nyata: lebih baik dari klimatologi
    gerb, blok = gerbang_lipatan(ctx, {"LH-N": cN, "LH-W": cW})
    assert all(len(g["dtss_lipatan"]) == 5 and g["vonis"] for g in gerb.values()) and gerb["LH-N"]["dtss_gabungan"] > 0 and not gerb["LH-N"]["hentikan"], gerb
    md = mde_dari_blok(blok["LH-N"], ulang=20, biji=2)
    assert md["mde_80"] > md["mde"] > 0
    kp_final = cocok_penuh(ctx, frozenset(LATIH_TAHUN), cN)
    assert all(b >= 0 for b in kp_final["model"]["beta"])
    # kandidat tanpa sinyal (hujan diacak) -> gerbang menolak
    ctx_n = sintetis(sinyal=0.0)
    gn, _ = gerbang_lipatan(ctx_n, {"LH-N": cfg_dari(ctx_n, "S1", 0.25, None)})
    assert gn["LH-N"]["dtss_gabungan"] < gerb["LH-N"]["dtss_gabungan"]
    # penilai lain + bootstrap + vonis pada baris tahun 2025
    ctx.kec_sel = {ki: [(0.3 + 0.05 * ki, 0.4, ctx.sels[ki][0])] for ki in range(ctx.nk)}
    ixb = list(range(*ctx.sl[2025]))[::3]
    lain = penilai_lain(ctx, ixb)
    assert set(lain) == {"hujan", "v1", "v2", "ilews", "muntohar"} and all(len(v) == len(ixb) for v in lain.values()) and set(lain["ilews"]) <= {0, 1, 2}
    A_ = frozenset(LATIH_TAHUN)
    mods = {"LH-N": cocok_penuh(ctx, A_, cN), "LH-W": cocok_penuh(ctx, A_, cW), **model_pembanding(ctx, pil["tau"])}
    hasil = buka_hitung(ctx, ixb, ["LH-N", "LH-W"], mods, 30, {"LH-N": md["se_skala"], "LH-W": md["se_skala"]}, 10, kab_aktif_dari(ctx))
    assert isinstance(dtss_waspada_titik(ctx, ctx, ixb, cN), float)
    # P3: SE skala -> mde_80 pada positif nyata; sama dengan mde_dari_blok bila positif = taksiran
    assert abs(mde80_nyata(md["se_skala"], MDE_POSITIF_PROSPEKTIF) - md["mde_80"]) < 1e-3 and mde80_nyata(md["se_skala"], 4 * MDE_POSITIF_PROSPEKTIF) < md["mde_80"]
    assert hasil["LH-N"]["rinci"]["mde_80_nyata"] is not None and hasil["LH-N"]["rinci"]["m"] == 10
    # P2: kontras LH-W - LH-N hanya di LH-W; tayang LH-W hanya bila LULUS dan menang atas LH-N; LH-N pembanding-saja tak pernah tayang
    assert "dtss_lhn_waspada" in hasil["LH-W"]["kontras"] and "dauc_lhn" in hasil["LH-W"]["kontras"] and "dtss_lhn_waspada" not in hasil["LH-N"]["kontras"]
    assert hasil["_ringkas"]["lulus_p1_calon"] in (None, "LH-N", "LH-W") and "BELUM penuh" in hasil["_ringkas"]["p2"] and "izin_tayang" not in hasil["_ringkas"]
    h2 = buka_hitung(ctx, ixb, ["LH-W"], mods, 20, {"LH-W": md["se_skala"]}, 9, kab_aktif_dari(ctx))
    assert set(h2) == {"LH-W", "_ringkas"} and "dauc_lhn" in h2["LH-W"]["kontras"] and h2["_ringkas"]["lulus_p1_calon"] in (None, "LH-W") and h2["LH-W"]["rinci"]["m"] == 9
    rp = h2["LH-W"]["rinci"]["laporan"]
    assert set(rp) >= {"waspada", "auc_total", "auc_pr", "dbss_vs_klim", "konfusi_per_level", "y0_hari_tepat_waspada", "f_beta_pm1_waspada", "strata", "v1_sasaran_g0_sendiri"}
    assert set(rp["strata"]) == {"kepadatan_tertil", "n_sel_tertil", "wilayah", "bulan", "kab_aktif"} and set(rp["konfusi_per_level"]) == set(ALARM) and 0 <= rp["auc_pr"]["C"] <= 1
    assert 0 <= rp["f_beta_pm1_waspada"]["C"]["f_beta"] <= 1 and rp["waspada"]["C"]["konfusi"][0] + rp["waspada"]["C"]["konfusi"][1] == n_alarm(len(ixb), ALARM["waspada"])
    assert set(h2["LH-W"]["vektor"]) == {"ix", "kab", "tanggal", "y1", "y0", "skor", "alarm"} and len(h2["LH-W"]["vektor"]["y1"]) == len(ixb)
    assert selang_m(10) == (0.0025, 0.9975) and selang_m(9) == (0.0027, 0.9973)                     # m = 9 bila LH-W sekunder: selang 99,46%
    # ILEWS: tak ada alarm merah/kuning -> kontras tak terdefinisi, dilaporkan, tidak masuk syarat; vonis tetap terbentuk
    asli_pl = globals()["penilai_lain"]
    try:
        globals()["penilai_lain"] = lambda c_, ix_: {**asli_pl(c_, ix_), "ilews": [0] * len(ix_)}
        h3 = buka_hitung(ctx, ixb, ["LH-N"], mods, 10, None, 10, None)
        assert "dtss_ilews_merah" not in h3["LH-N"]["kontras"] and "dtss_ilews_kuning" not in h3["LH-N"]["kontras"] and "tak terdefinisi" in str(h3["LH-N"]["rinci"]["ilews"])
        assert "ilews_merah" not in h3["LH-N"]["vonis"]["rincian"] and h3["LH-N"]["rinci"]["mde_80_nyata"] is None
    finally:
        globals()["penilai_lain"] = asli_pl
    # P4: buka.json + vektor DITULIS SEBELUM K2; K2 gagal tidak menghapus hasil utama
    with tempfile.TemporaryDirectory() as tmp:
        urut = []
        def k2_gagal():
            urut.append((os.path.exists(os.path.join(tmp, "buka.json")), os.path.exists(os.path.join(tmp, "buka_vektor.json.gz"))))
            raise RuntimeError("K2 sengaja gagal")
        k2r = buka_tulis(json.loads(json.dumps(h2)), k2_gagal, tmp)
        assert urut == [(True, True)] and "galat" in k2r and json.load(open(os.path.join(tmp, "buka_k2.json")))["galat"].startswith("RuntimeError")
        bj = json.load(open(os.path.join(tmp, "buka.json")))
        assert "vektor" not in bj["LH-W"] and bj["LH-W"]["vonis"] and "LH-W" in json.load(gzip.open(os.path.join(tmp, "buka_vektor.json.gz"), "rt"))
    # P5: konteks latih saat buka harus sama dengan yang dibekukan (kab, peta wilayah, hash geo/desa)
    jk = jejak_kontekstual(ctx, ctx.wilayah_info["peta"])
    cek_konteks_beku(ctx, jk)
    _tolak(lambda: cek_konteks_beku(ctx, {**jk, "kab": jk["kab"][:-1]}), "daftar kab berubah")
    _tolak(lambda: cek_konteks_beku(ctx, {**jk, "geo_sha": "x"}), "geo")
    _tolak(lambda: cek_konteks_beku(ctx, {**jk, "desa_sha": "x"}), "desa_cari")
    _tolak(lambda: cek_konteks_beku(ctx, {**jk, "wilayah_peta": {**jk["wilayah_peta"], "Jawa": PENAMPUNG}}), "peta wilayah")
    # butir 3: mengubah LABEL (beku) saja mengubah peta wilayah hasil gabung_wilayah -> cek_konteks_beku menolak (bukan tautologi dari kand)
    ev0_x = {k: (set() if k.startswith("32|") else v) for k, v in ctx.ev0.items()}
    ctx2 = bangun_ctx(ctx.H, ctx.mulai, ctx.kab_keys, ctx.kab_sel_in, {k: {"lereng": 1, "sesar": 1, "pv": .5} for k in ctx.kab_keys}, {}, ev0_x, ctx.ev_lb, HARI0 + dt.timedelta(WARMUP), AKHIR_BARIS, 0.5)
    gw2 = gabung_wilayah(ctx2, set(LATIH_TAHUN), {"n_kab": 3, "P_w": 20, "T_w": 3, "T_min_positif": 3})
    set_wilayah(ctx2, gw2["peta"]); ctx2.wilayah_info = gw2
    assert gw2["peta"] != ctx.wilayah_info["peta"] and ctx2.kab_keys == ctx.kab_keys
    _tolak(lambda: cek_konteks_beku(ctx2, jk), "peta wilayah dari label beku")
    for n in ("LH-N", "LH-W"):
        k = hasil[n]["kontras"]
        assert set(k) >= {"dtss_klim_waspada", "dtss_klim_siaga", "dauc_klim", "dtss_b2b_waspada", "dtss_hujan_waspada", "dtss_ilews_kuning", "dtss_ilews_merah", "dtss_muntohar_waspada", "dtss_v1_waspada"}
        assert hasil[n]["vonis"]["vonis"].split(" (")[0] in ("LULUS", "TIDAK LULUS", "TIDAK MEYAKINKAN")
        assert "per_wilayah" in hasil[n]["rinci"] and hasil[n]["rinci"]["n"] == len(ixb)
    # --- latih_nyata -> kandidat.json -> sidik() pada konteks mainan (keluaran di folder sementara): serialisasi JSON, sidik membeku, mutasi konstanta menolak
    mf = {"mulai": "2017-01-01", "n_sel": 1, "gabungan": "g"}
    simpan_g = {k: globals()[k] for k in ("KELUAR", "SIDIK_JEJAK", "konteks_nyata", "bekukan", "manifest_beku", "pemblokir")}
    with tempfile.TemporaryDirectory() as tmp:
        try:
            globals().update(KELUAR=tmp, SIDIK_JEJAK=os.path.join(tmp, "x.sidik"), konteks_nyata=lambda *a, **k: ctx, bekukan=lambda: mf, manifest_beku=lambda: mf,
                           pemblokir=lambda kecs=None: {1: ("BLOK", "uji"), 4: ("tidak tersedia", "x")})
            latih_nyata()
            kand = json.load(open(J("kandidat.json")))
            assert kand["hidup"] and kand["sidik"] == sidik_penuh({k: v for k, v in kand.items() if k != "sidik"}) and set(kand["hidup"]) <= set(kand["model"]) and set(kand["model"]) - set(kand["hidup"]) == set(kand["pembanding_saja"])
            assert kand["m"] == 10 and kand["selang"] == [0.0025, 0.9975] and kand["kab"] == ctx.kab_keys and kand["wilayah_peta"] == ctx.wilayah_info["peta"] and "geo_sha" in kand and kand["desa_sha"]
            assert set(kand["tenggang"]) == {"+1", "+2", "+3"} and all("tidak dinilai" in v for v in kand["tenggang"].values()) and all("se_skala" in v for v in kand["mde"].values())
            assert json.load(open(J("latih.json")))["pemblokir_7A"]["1"][0] == "BLOK"
            assert json.load(open(J("latih.json")))["wilayah"]["peta"] == ctx.wilayah_info["peta"] and os.path.exists(J("latih.json"))
            assert {"klim", "b2b"} <= set(kand["model"]) and {"klim", "b2b"} <= set(kand["pembanding_saja"]) and kand["riwayat_latih"] == {"ke": 1, "sebelumnya": 0, "waktu_sebelumnya": [], "ulang": False}   # butir 2
            _tolak(lambda: latih_nyata(), "--ulang")
            nm_ = kand["hidup"][0]
            mem = buka_hitung(ctx, ixb, [nm_], {nm_: cocok_penuh(ctx, A_, cN if nm_ == "LH-N" else cW), **model_pembanding(ctx, kand["pilihan"]["tau"])}, 20)
            dsk = buka_hitung(ctx, ixb, [nm_], kand["model"], 20)                                      # buka memakai model beku apa adanya, tanpa melatih
            latih_nyata(ulang=True)                                                                    # butir 9: --ulang tercatat (jumlah + waktu) dan ikut sidik
            kand_u = json.load(open(J("kandidat.json")))
            assert kand_u["riwayat_latih"]["ke"] == 2 and kand_u["riwayat_latih"]["sebelumnya"] == 1 and kand_u["riwayat_latih"]["ulang"] and len(kand_u["riwayat_latih"]["waktu_sebelumnya"]) == 1
            assert kand_u["sidik"] != kand["sidik"] and kand_u["sidik"] == sidik_penuh({k: v for k, v in kand_u.items() if k != "sidik"})
            kand = kand_u
            assert {k: v["nilai"] for k, v in mem[nm_]["kontras"].items()} == {k: v["nilai"] for k, v in dsk[nm_]["kontras"].items()}      # model lewat JSON = model di memori
            sidik()
            baris_s = [json.loads(x) for x in open(SIDIK_JEJAK)]
            assert [(b["jenis"], b.get("hasil")) for b in baris_s] == [("latih", "mulai"), ("latih", "ok"), ("latih", "mulai"), ("latih", "ok"), ("sidik", None)]    # N1: mulai lalu penutup
            assert baris_s[-1]["sidik"] == kand["sidik"] and baris_s[-1]["awal_prospektif"] > str(dt.date(2026, 11, 5)) and set(baris_s[-1]["info_banjir_transitif"]) == set(INFO_TRANSITIF)
            assert [b.get("ulang") for b in baris_s[:4]] == [False, False, True, True] and [b.get("ke") for b in baris_s[:4]] == [1, 1, 2, 2]
            assert not any(r in BERKAS_SIDIK["wajib"] + BERKAS_SIDIK["opsional"] for r in INFO_TRANSITIF)          # (c) informasi, bukan pengunci
            simpan_tau = TAU_GRID
            try:
                TAU_GRID = (0.05, 0.10, 0.30)
                _tolak(sidik, "sidik berubah sejak")
            finally:
                TAU_GRID = simpan_tau
            # --- buka() ujung ke ujung (git, tanggal, konteks ditambal; data mainan hidup dan beku): sumber konteks, urutan tulis, sidik ter-commit, tulis_mulai + sha256
            ts = ("tanggal_T", "hari_ini", "sidik_commit", "cek_live_vs_beku", "HUJAN", "KEJADIAN", "LOGBOOK")
            simpan_b = {k: globals()[k] for k in ts}
            panggilan = []
            kecil = {n: os.path.join(tmp, n) for n in ("h.json", "k.json", "l.json")}
            for n, isi in zip(kecil, ("{\"hujan\": 1}", "{\"kejadian\": 1}", "{\"logbook\": 1}")):
                open(kecil[n], "w").write(isi)
            try:
                def kn(*a, **k):
                    panggilan.append(k.get("sumber"))
                    return ctx
                globals().update(tanggal_T=lambda: dt.date(2025, 3, 1), hari_ini=lambda: dt.date(2027, 7, 1), sidik_commit=lambda: {"jenis": "sidik", "sidik": kand["sidik"]}, cek_live_vs_beku=lambda: None,
                                 HUJAN=kecil["h.json"], KEJADIAN=kecil["k.json"], LOGBOOK=kecil["l.json"], konteks_nyata=kn)
                for sc, frag in ((lambda: {"jenis": "sidik", "sidik": "deadbeef"}, "berbeda dari sidik ter-commit"), (lambda: None, "berbeda dari sidik ter-commit")):
                    globals()["sidik_commit"] = sc
                    _tolak(buka, frag)                                                        # sidik lokal != yang ter-commit (atau belum ada) -> ditolak SEBELUM buka.mulai
                    assert not os.path.exists(J("buka.mulai")), "buka.mulai tidak boleh ditulis pada penolakan"
                globals()["sidik_commit"] = lambda: {"jenis": "sidik", "sidik": kand["sidik"]}
                globals()["hari_ini"] = lambda: dt.date(2027, 5, 1)
                _tolak(buka, "paling cepat")
                assert not os.path.exists(J("buka.mulai")) and panggilan == []
                globals()["hari_ini"] = lambda: dt.date(2027, 7, 1)
                # N2: pemeriksaan murah SEBELUM buka.mulai (tidak membakar satu-kali)
                globals()["tanggal_T"] = lambda: dt.date(2027, 5, 1)                                  # jendela mulai 2027-05-02: konteks mainan tak punya baris di sana
                try:
                    _tolak(lambda: buka(ulang=15), "tidak ada baris prospektif")
                finally:
                    globals()["tanggal_T"] = lambda: dt.date(2025, 3, 1)
                y1_simpan = bytes(ctx.R_y1)
                ctx.R_y1[:] = bytes(len(y1_simpan))
                try:
                    _tolak(lambda: buka(ulang=15), "positif y1 prospektif = 0")
                finally:
                    ctx.R_y1[:] = y1_simpan
                assert not os.path.exists(J("buka.mulai")) and not os.path.exists(J("buka.galat.json"))
                _tolak(lambda: buka(ulang=15, lanjut=True), "buka.mulai belum ada")                  # --lanjut tanpa buka.mulai
                # N2: galat di buka_hitung -> buka.galat.json (alasan, waktu, sha256_hidup) lalu re-raise; buka kedua ditolak; --lanjut hanya pada syaratnya
                asli_bh = globals()["buka_hitung"]
                globals()["buka_hitung"] = lambda *a_, **k_: (_ for _ in ()).throw(RuntimeError("boom"))
                try:
                    _tolak(lambda: buka(ulang=15), "boom")
                finally:
                    globals()["buka_hitung"] = asli_bh
                gl = json.load(open(J("buka.galat.json")))
                mu = json.load(open(J("buka.mulai")))
                assert "boom" in gl["alasan"] and gl["waktu"] and gl["sha256_hidup"] == mu["sha256_hidup"] == {"hujan": _sha_isi(kecil["h.json"]), "kejadian": _sha_isi(kecil["k.json"]), "logbook": _sha_isi(kecil["l.json"])}
                assert not os.path.exists(J("buka.json")) and mu["sidik"] == kand["sidik"]
                _tolak(lambda: buka(ulang=15), "sudah ada")                                         # buka biasa kedua ditolak
                simpan_isi = open(kecil["h.json"]).read()
                open(kecil["h.json"], "w").write("{\"hujan\": 2}")
                _tolak(lambda: buka(ulang=15, lanjut=True), "berbeda dari saat buka.mulai")          # berkas hidup berubah -> --lanjut ditolak
                open(kecil["h.json"], "w").write(simpan_isi)
                os.rename(J("buka.galat.json"), J("buka.galat.sementara"))
                _tolak(lambda: buka(ulang=15, lanjut=True), "buka.galat.json tidak ada")
                os.rename(J("buka.galat.sementara"), J("buka.galat.json"))
                open(J("buka.json"), "w").write("{}")
                _tolak(lambda: buka(ulang=15, lanjut=True), "buka.json sudah ada")
                os.remove(J("buka.json"))
                assert not [b for b in baca_jejak() if b.get("jenis") == "lanjut"]                    # penolakan tak menulis jejak lanjut
                del panggilan[:]
                globals()["sidik_commit"] = lambda: {"jenis": "sidik", "sidik": kand["sidik"], "info_banjir_transitif": {**info_transitif(), "scripts/banjir/umum.py": "x"}}
                buka(ulang=15, lanjut=True)                                                       # semua syarat terpenuhi: lolos
                assert panggilan == ["beku", "prospektif", "beku", "prospektif"], panggilan        # latih = beku; prospektif = hujan/kejadian/logbook hidup + sisanya beku; bukan 'hidup' penuh
                for n_ in ("buka.json", "buka_vektor.json.gz", "buka_k2.json", "buka.mulai"):
                    assert os.path.exists(J(n_)), n_
                bj = json.load(open(J("buka.json")))
                assert set(bj) >= set(kand["hidup"]) | {"_ringkas"} and "lulus_p1_calon" in bj["_ringkas"]
                assert bj["_ringkas"]["lanjut"] == 1 and bj["_ringkas"]["latih_ke"] == 2 and bj["_ringkas"]["catatan_latih"] and all(bj[n]["vonis"]["latih_ke"] == 2 and bj[n]["vonis"]["lanjut"] == 1 for n in kand["hidup"])   # catatan (a)
                assert bj["_ringkas"]["info_banjir_transitif_beda"] == ["scripts/banjir/umum.py"]            # (c): dilaporkan, tidak menolak
                jl = [b for b in baca_jejak() if b.get("jenis") == "lanjut"]
                assert len(jl) == 1 and "boom" in jl[0]["galat_sebelumnya"]
                _tolak(lambda: buka(ulang=15, lanjut=True), "buka.json sudah ada")                  # selesai: --lanjut lagi ditolak
                _tolak(lambda: buka(ulang=15), "sudah ada")                                         # sekali saja
            finally:
                globals().update(simpan_b)
        finally:
            globals().update(simpan_g)
    # --- P1/P2 jejak latih: dihentikan / galat tercatat; latih ulang tanpa --ulang ditolak; baris sidik menolak bahkan dengan --ulang
    nama_l = ("KELUAR", "SIDIK_JEJAK", "konteks_nyata", "bekukan", "manifest_beku", "pemblokir", "gerbang_lipatan", "pilih_semua")
    simpan_l = {k: globals()[k] for k in nama_l}
    with tempfile.TemporaryDirectory() as tmp2:
        try:
            globals().update(KELUAR=tmp2, SIDIK_JEJAK=os.path.join(tmp2, "y.sidik"), konteks_nyata=lambda *a, **k: ctx, bekukan=lambda: mf, manifest_beku=lambda: mf,
                             pemblokir=lambda kecs=None: {1: ("siap", "x")},
                             gerbang_lipatan=lambda c_, cfgs: ({n: {"hentikan": True, "vonis": "x", "dtss_lipatan": [0.0] * 5, "dtss_gabungan": -0.1} for n in cfgs}, {n: {(0, 2021, 1): [1, 2, 3, 4, 1, 2, 3, 4]} for n in cfgs}))
            _tolak(latih_nyata, "dihentikan")
            jj = baca_jejak()
            assert [b["hasil"] for b in jj] == ["mulai", "dihentikan"] and jj[1]["ke"] == 1 and os.path.exists(J("kandidat_dihentikan.json")) and not os.path.exists(J("kandidat.json"))
            _tolak(latih_nyata, "--ulang")                                                         # dihentikan lalu latih lagi tanpa --ulang: ditolak
            assert len(baca_jejak()) == 2                                                          # penolakan pra-pemeriksaan tidak menambah jejak
            open(J("kandidat.json"), "w").write("{}")                                              # (b) kandidat.json LAMA masih ada: pesan menyebutnya
            _tolak(lambda: latih_nyata(ulang=True), "kandidat.json LAMA")
            os.remove(J("kandidat.json"))
            jj = baca_jejak()
            assert [b["hasil"] for b in jj] == ["mulai", "dihentikan", "mulai", "dihentikan"] and [b["ke"] for b in jj] == [1, 1, 2, 2] and jj[3]["ulang"] is True
            globals()["pilih_semua"] = lambda *a, **k: (_ for _ in ()).throw(ValueError("Platt nasional b1 = -0.1 <= 0 (skor terbalik), model ditolak"))
            _tolak(lambda: latih_nyata(ulang=True), "Platt nasional")                              # ValueError Platt: tercatat 'galat', dilempar ulang
            jj = baca_jejak()
            assert jj[-1]["hasil"] == "galat" and "Platt nasional" in jj[-1]["alasan"] and jj[-1]["ke"] == 3 and len(jj) == 6
            tambah_jejak({"jenis": "sidik", "sidik": "abc"})
            _tolak(lambda: latih_nyata(ulang=True), "DITOLAK")                                     # P2: sudah ada baris sidik -> ditolak walau --ulang
            assert len(baca_jejak()) == 7
            # N1: dimatikan paksa -> baris "mulai" tanpa penutup; (b) gerbang_mode menolak membaca kandidat.json bila jejak latih terakhir bukan ok
            with tempfile.TemporaryDirectory() as tmp3:
                globals().update(KELUAR=tmp3, SIDIK_JEJAK=os.path.join(tmp3, "z.sidik"))
                tambah_jejak({"jenis": "latih", "hasil": "mulai", "ke": 1, "ulang": False})
                _tolak(latih_nyata, "tanpa penutup")
                assert len(baca_jejak()) == 1
                open(J("latih.json"), "w").write("{}")
                open(J("kandidat.json"), "w").write("{}")
                _tolak(gerbang_mode, "bukan 'ok'")                                                  # terakhir 'mulai'
                tambah_jejak({"jenis": "latih", "hasil": "galat", "ke": 1})
                _tolak(gerbang_mode, "bukan 'ok'")
                os.remove(SIDIK_JEJAK)
                _tolak(latih_nyata, "--ulang")                                                      # latih.json ada tanpa jejak: tetap ditolak tanpa --ulang
                assert baca_jejak() == []
                _tolak(gerbang_mode, "bukan 'ok'")                                                  # tanpa jejak latih sama sekali
        finally:
            globals().update(simpan_l)
    # --- P1/butir 4: sidik hanya meng-hash SALINAN beku (hujan, kejadian, logbook, penduduk, desa_cari, kerentanan, pvmbg, geo kecamatan); berkas hidup yang tumbuh atau ditulis ulang
    #     (statis.yml menulis penduduk.json bulanan) tidak mengubah sidik; konteks latih baca beku, prospektif baca hidup
    for rel in ("public/longsor/data/kejadian.json", "public/data/penduduk.json", "public/longsor/data/kerentanan.json", "public/longsor/data/pvmbg.json", "public/data/desa_cari.json"):
        assert rel not in BERKAS_SIDIK["wajib"], rel
    akar_dasar0 = DASAR.AKAR
    assert not any("jam_era5" in r for r in BERKAS_SIDIK["wajib"] + BERKAS_SIDIK["opsional"])      # P4
    nama_g = ("KELUAR", "HUJAN", "KEJADIAN", "LOGBOOK", "PENDUDUK", "DESA", "KERENTANAN", "PVMBG", "GEO_KEC")
    sg = {k: globals()[k] for k in nama_g}
    with tempfile.TemporaryDirectory() as tmp:
        try:
            g_ = lambda n: os.path.join(tmp, n)
            globals().update(KELUAR=g_("o"), HUJAN=g_("h.json"), KEJADIAN=g_("k.json"), LOGBOOK=g_("l.json"), PENDUDUK=g_("p.json"), DESA=g_("d.json"), KERENTANAN=g_("r.json"), PVMBG=g_("v.json"), GEO_KEC=g_("geo"))
            nh = idx_tgl(LABEL_AKHIR) + 1
            def tulis_geo(nilai):
                os.makedirs(GEO_KEC, exist_ok=True)
                json.dump({"features": [{"properties": {"kab": "A", "kec": "a", "n": nilai}, "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}}]}, open(os.path.join(GEO_KEC, "11.json"), "w"))
            def tulis_hidup(extra, geser=0, dibi_x=(), lb_x=(), pend=1, ker=1, geo=1):
                json.dump({"mulai": "2017-01-01", "sampai": "x", "sel": {"1.00,2.00": [5 + geser] * (nh + extra), "3.00,4.00": [7] * (nh + extra)}}, open(HUJAN, "w"))
                json.dump({"dibuat": f"t{extra}", "kab": ["32|a"], "dibi": [["2025-01-01", 0, 1, 0], ["2026-10-18", 0, 1, 1], *dibi_x], "glc": []}, open(KEJADIAN, "w"))
                json.dump({"kejadian": [{"jenis": "longsor", "kab_kode": "32.01", "mulai": "2026-10-18", "terlihat": ["2026-10-18"] * 2, "jiwa": extra}, *lb_x]}, open(LOGBOOK, "w"))
                json.dump({"kec": {"11|A|a": 1000 * pend}}, open(PENDUDUK, "w")); json.dump({"kab": {"11.01": "A"}, "v": pend}, open(DESA, "w"))
                json.dump({"kolom": [], "kec": [], "k": [], "v": ker}, open(KERENTANAN, "w")); json.dump({"kec": [], "k": []}, open(PVMBG, "w"))
                tulis_geo(geo)
            tulis_hidup(0, 0, [["2026-10-19", 0, 1, 0]], [{"jenis": "longsor", "kab_kode": "32.01", "mulai": "2026-10-19", "terlihat": ["2026-10-19"] * 2}])
            assert manifest_beku() is None and jalur_sumber("auto")["hujan"] == HUJAN and jalur_sumber("auto")["root"] == AKAR
            _tolak(lambda: jalur_sumber("beku"), "belum ada")
            m0 = bekukan()
            fh, fk, fl = (json.load(open(jalur_beku(n))) for n in ("hujan.json", "kejadian.json", "logbook.json"))
            assert all(len(v) == nh for v in fh["sel"].values()) and [r[0] for r in fk["dibi"]] == ["2025-01-01", "2026-10-18"] and "dibuat" not in fk
            assert len(fl["kejadian"]) == 1 and "jiwa" not in fl["kejadian"][0]                    # label > LABEL_AKHIR tak ikut; kolom tak relevan dibuang
            P_b, P_h = jalur_sumber("auto"), jalur_sumber("hidup")
            assert P_b["hujan"] == jalur_beku("hujan.json") and P_h["hujan"] == HUJAN and jalur_sumber("beku")["kejadian"] == jalur_beku("kejadian.json")
            P_p = jalur_sumber("prospektif")                                                       # P3: hanya hujan/kejadian/logbook hidup; sisanya beku
            assert (P_p["hujan"], P_p["kejadian"], P_p["logbook"]) == (HUJAN, KEJADIAN, LOGBOOK) and all(P_p[k] == P_b[k] for k in ("penduduk", "desa", "kerentanan", "pvmbg", "root"))
            assert P_p["root"] == jalur_beku("") and P_p["penduduk"] == jalur_beku("penduduk.json")
            assert P_b["penduduk"] == jalur_beku("penduduk.json") and P_b["kerentanan"] == jalur_beku("kerentanan.json") and P_b["desa"] == jalur_beku("desa_cari.json") and P_b["root"] == jalur_beku("")
            assert json.load(open(P_b["penduduk"])) == {"kec": {"11|A|a": 1000}} and os.path.exists(os.path.join(_geo_dir(P_b["root"]), "11.json"))
            kc_b = daftar_kec_dari(P_b["root"])
            assert [k["id"] for k in kc_b] == ["11|A|a"] and DASAR.AKAR == akar_dasar0              # daftar kec dibaca dari salinan beku; AKAR dasar dipulihkan
            kd1, hf1 = {"x": 1}, (lambda rel: "h")
            s_beku = sidik_penuh(kd1, hf1)
            tulis_hidup(40, 3, [["2026-10-25", 0, 1, 0]], [{"jenis": "longsor", "kab_kode": "32.01", "mulai": "2026-10-30", "terlihat": ["2026-10-30"] * 2}], pend=9, ker=9, geo=9)      # hidup tumbuh/ditulis ulang
            assert bekukan() == m0 and sidik_penuh(kd1, hf1) == s_beku                                # sidik tidak ikut berubah, salinan beku tidak ditimpa
            assert json.load(open(jalur_sumber("auto")["penduduk"])) == {"kec": {"11|A|a": 1000}} and json.load(open(jalur_sumber("hidup")["penduduk"])) == {"kec": {"11|A|a": 9000}}
            _tolak(cek_live_vs_beku, "berbeda dari salinan beku")                                     # awalan hujan hidup direvisi (geser=3) -> prospektif ditolak
            tulis_hidup(40, 0, pend=9, ker=9, geo=9)
            cek_live_vs_beku()                                                                         # hanya diperpanjang: boleh
            for n_ in ("penduduk.json", "desa_cari.json", "kerentanan.json", "pvmbg.json", "kejadian.json", "logbook.json"):      # menyentuh salinan beku apa pun -> sidik berubah
                isi_ = open(jalur_beku(n_)).read()
                open(jalur_beku(n_), "a").write(" ")
                assert sidik_penuh(kd1, hf1) != s_beku, n_
                open(jalur_beku(n_), "w").write(isi_)
            open(os.path.join(_geo_dir(jalur_beku("")), "11.json"), "a").write(" ")
            assert sidik_penuh(kd1, hf1) != s_beku and sha_geo() != m0["geo"]
            open(os.path.join(_geo_dir(jalur_beku("")), "11.json"), "w").write(open(os.path.join(GEO_KEC, "11.json")).read().replace('"n": 9', '"n": 1'))
            assert sidik_penuh(kd1, hf1) == s_beku
            fh["sel"]["1.00,2.00"][5] = 99
            json.dump(fh, open(jalur_beku("hujan.json"), "w"))
            assert sidik_penuh(kd1, hf1) != s_beku                                                     # hujan beku disentuh -> sidik berubah
        finally:
            globals().update(sg)
    # --- A-28 Platt: wilayah dengan b1 <= 0 / satu kelas jatuh ke Platt NASIONAL model yang sama (semua model termasuk klimatologi); b1 nasional <= 0: berfitur ValueError, klim netral
    et = [0.1 * i for i in range(40)]
    yt = [0] * 20 + [1 if i % 2 == 0 else 0 for i in range(20)]                     # positif hanya di paruh atas eta: b1 nasional > 0
    yinv = [1 if i % 2 == 0 else 0 for i in range(20)] + [0] * 20                    # kebalikan: b1 nasional < 0
    wt = [1.0] * 40
    wl_t = ["A"] * 20 + ["B"] * 20
    asli_pw = KC.platt_wil
    try:
        KC.platt_wil = lambda eta, y, w, wil: {"A": {"mu": 0.0, "sd": 1.0, "b0": 0.0, "b1": 2.0}, "B": {"mu": 0.0, "sd": 1.0, "b0": 0.0, "b1": -0.5}, "C": dict(KC.PLATT_NETRAL)}
        plt, jt = platt_aman(et, yt, wt, wl_t, True)
        nas_t = K2.platt_w(et, yt, wt)
        assert jt == ["B", "C"] and plt["B"] == nas_t == plt["C"] and plt["A"]["b1"] == 2.0 and nas_t["b1"] > 0
        _tolak(lambda: platt_aman(et, yinv, wt, wl_t, True), "Platt nasional")                         # berfitur dengan skor terbalik: ValueError (temuan sah)
        pk2, jk2 = platt_aman(et, yinv, wt, wl_t, False)                                                 # klimatologi: nasional <= 0 -> netral (0, 1)
        assert pk2["B"] == KC.PLATT_NETRAL and pk2["C"] == KC.PLATT_NETRAL and jk2 == ["B", "C"]
    finally:
        KC.platt_wil = asli_pw
    ctx._kp.clear()
    for cfg_p in (cfg_dari(ctx, [], 0.05, None), cfg_dari(ctx, "S1", 0.25, None), cfg_dari(ctx, "S1", 0.25, 0.05)):        # klimatologi, LH-N, LH-W lewat cocok_penuh sungguhan
        try:
            KC.platt_wil = lambda eta, y, w, wil: {wl_: ({"mu": 0.0, "sd": 1.0, "b0": 0.0, "b1": -1.0} if i == 0 else asli_pw(eta, y, w, wil)[wl_]) for i, wl_ in enumerate(sorted(set(wil)))}
            kp_p = cocok_penuh(ctx, Aj, cfg_p)
        finally:
            KC.platt_wil = asli_pw
        w0 = sorted(kp_p["platt"])[0]
        assert kp_p["platt_jatuh"] == [w0] and all(v["b1"] > 0 for v in kp_p["platt"].values()), (cfg_p["set"], kp_p["platt_jatuh"])
    ctx._kp.clear()
    # --- Lainnya hanya koefisien nasional (§3.3); kab aktif
    ca = cocok(ctx, Aj, cfg_dari(ctx, "S1", 0.25, 0.05))
    assert ca["koef_w"].keys() == set(ctx.wilayah) and (PENAMPUNG not in ctx.wilayah or ca["koef_w"][PENAMPUNG] == ca["beta"])
    if PENAMPUNG in ctx.wilayah:
        assert len(ca["koef"]) == len(ctx.wilayah) - 1
    else:
        assert len(ca["koef"]) == len(ctx.wilayah)
    assert set(kab_aktif_dari(ctx)) <= set(ctx.kab_keys) and len(kab_aktif_dari(ctx)) > 0
    # --- boot_kontras: penilai sempurna LULUS, penilai acak tidak; vonis mengikuti §5.2
    kk_ = lambda lo, hi, v=0.1: {"nilai": v, "ci": [lo, hi]}
    k_ok = {n: kk_(0.01, 0.2) for n in ("dtss_klim_waspada", "dtss_klim_siaga", "dauc_klim", "dtss_b2b_waspada", "dtss_hujan_waspada", "dtss_ilews_kuning", "dtss_ilews_merah", "dtss_muntohar_waspada", "dtss_v1_waspada")}
    assert vonis_buka(k_ok)["vonis"] == "LULUS" and vonis_buka(k_ok, 0.1, 0.2)["vonis"] == "LULUS (daya rendah)"
    for n in k_ok:
        kb = json.loads(json.dumps(k_ok)); kb[n]["ci"] = [-0.01, 0.2]
        assert vonis_buka(kb)["vonis"] == "TIDAK MEYAKINKAN", n
    kg = json.loads(json.dumps(k_ok)); kg["dtss_klim_waspada"].update(nilai=0.0, ci=[-0.1, 0.01])
    assert vonis_buka(kg)["vonis"] == "TIDAK LULUS"
    for n in ("dtss_b2b_waspada", "dtss_ilews_kuning", "dtss_ilews_merah"):
        kg = json.loads(json.dumps(k_ok)); kg[n]["ci"] = [-0.2, -0.01]
        assert vonis_buka(kg)["vonis"] == "TIDAK LULUS", n
    cs = sintetis(sinyal=2.0, kab_per_prov=(("32", 5), ("11", 4)))
    ixc = list(range(*cs.sl[2025]))
    yc = [cs.R_y1[i] for i in ixc]
    sempurna = [0.9 if v else 0.01 for v in yc]
    acak = [random.Random(i).random() for i in range(len(ixc))]
    al_ = {"s": alarm_sebanyak(sempurna, n_alarm(len(ixc), .1)), "a": alarm_sebanyak(acak, n_alarm(len(ixc), .1))}
    bk = boot_kontras(cs, ixc, yc, {"s": sempurna, "a": acak}, al_, {"dtss_x": ("s", "a"), "dauc_x": ("s", "a")}, 60)
    assert bk["dtss_x"]["ci"][0] > 0 and bk["dauc_x"]["ci"][0] > 0 and bk["dtss_x"]["kab_musim"]["blok"] > 1 and bk["dtss_x"]["pulau_minggu"]["blok"] > 1
    ak_, n_ = auc_dalam_kab([0] * 45, [0] * 40 + [1] * 5, [0.0] * 40 + [1.0] * 5)
    assert ak_ == 1.0 and n_ == 1 and auc_dalam_kab([0] * 10, [0] * 5 + [1] * 5, list(range(10)))[1] == 0         # kab < 30 negatif / < 5 positif tak dinilai
    # --- mutasi: swauji GAGAL bila logika diganggu
    asli = globals()["potong_tanggal"]
    try:
        globals()["potong_tanggal"] = lambda tanggal, akhir=None: [x for x in map(lambda t: dt.date.fromisoformat(str(t)[:10]), tanggal)]
        try:
            _guard_kode()
            raise RuntimeError("mutasi potong_tanggal lolos")
        except AssertionError:
            pass
    finally:
        globals()["potong_tanggal"] = asli
    _guard_kode()
    asli_s = KC.selesai
    try:
        KC.selesai = lambda *a, **k: asli_s(*a, **{**k, "nonneg": False})
        sneg = KC.selesai(Zs, ys, [1.0] * 500, offs, tau=1.0)
        assert sneg["beta"][2] < -0.5                                                              # mutasi terdeteksi: tanda nonneg mati -> beta negatif
    finally:
        KC.selesai = asli_s
    # --- pemblokir: bentuk keluaran, dan latih ditolak bila ada BLOK (aturan jatuh bukan BLOK)
    sp = pemblokir()
    assert set(sp) == set(range(1, 12)) and all(v[0] in ("siap", "BLOK", "kosong", "tidak tersedia", "sekunder", "sebagian", "belum ada") for v in sp.values()), sp
    assert sp[4][0] != "BLOK" and sp[5][0] != "BLOK" and sp[6][0] != "BLOK" and sp[3][0] == "kosong"
    asli_pb = globals()["pemblokir"]
    try:
        globals()["pemblokir"] = lambda kecs=None: {1: ("BLOK", "sel 515 dari 948"), 4: ("tidak tersedia", "x")}
        _tolak(tolak_bila_blok, "7A.1")
        globals()["pemblokir"] = lambda kecs=None: {1: ("siap", "x"), 4: ("tidak tersedia", "x")}
        tolak_bila_blok()
    finally:
        globals()["pemblokir"] = asli_pb
    _tolak(lambda: muat_sm("1.00,1.00", folder=tempfile.gettempdir()), "belum ada")
    with tempfile.TemporaryDirectory() as tmp:
        json.dump({"awal": "2017-01-01", "sm": [0.1, 0.2]}, gzip.open(os.path.join(tmp, "-6.75_107.75.json.gz"), "wt"))
        assert muat_sm("-6.75,107.75", tmp) == {"awal": dt.date(2017, 1, 1), "sm": [0.1, 0.2]}
    db = daftar_buka()
    assert db["tatapan"] == 8 and db["m"] == M_KELUARGA == 10 and db["m_konsisten"] and abs(0.025 / M_KELUARGA - Q_LO) < 1e-12
    print("ok model_lhasa2")


def _oof_tahun(ctx, A, cfg, z):
    """Logit luar-lipatan baris latih tahun z: model dilatih pada A\\{z} (lantai, fitur, beta)."""
    mz = cocok(ctx, A - {z}, cfg)
    idx, _ = ctx.tr[z]
    return eta_baris(ctx, mz, idx, F_tr(ctx, A - {z}, z))


def _arg(nama, bawaan=None):
    return sys.argv[sys.argv.index(nama) + 1] if nama in sys.argv else bawaan


def main():
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m == "uji":
        uji()
    elif m == "pemblokir":
        cetak_pemblokir(pemblokir())
    elif m == "baris":
        baris()
    elif m == "latih" and "--kering" in sys.argv:
        try:
            latih_kering()
        except DataBelumAda as e:
            sys.exit(f"kering ditolak: {e}")
    elif m == "buka" and "--kering" in sys.argv:
        buka_kering()
    elif m in ("latih", "gerbang", "sidik", "buka"):
        tolak_bila_blok()
        try:
            {"latih": lambda: latih_nyata("--ulang" in sys.argv), "gerbang": gerbang_mode, "sidik": sidik,
             "buka": lambda: buka(dt.date.fromisoformat(_arg("--awal")) if _arg("--awal") else None, None, "--lanjut" in sys.argv)}[m]()
        except DataBelumAda as e:
            sys.exit(f"{m} ditolak, data belum ada: {e}")
    else:
        sys.exit(__doc__)


def buka_kering():
    """`buka --kering`: seluruh jalur penilaian (penilai lain, bootstrap dua skema, vonis) pada data MAINAN; tidak menyentuh data nyata dan tidak menulis."""
    ctx = sintetis(sinyal=2.0)
    A = frozenset(LATIH_TAHUN)
    cN = cfg_dari(ctx, "S1", 0.25, None)
    ctx.kec_sel = {ki: [(0.3, 0.4, ctx.sels[ki][0])] for ki in range(ctx.nk)}
    ix = list(range(*ctx.sl[2025]))[::2]
    h = buka_hitung(ctx, ix, ["LH-N"], {"LH-N": cocok_penuh(ctx, A, cN), **model_pembanding(ctx)}, 40, None, 10, kab_aktif_dari(ctx))
    print("buka --kering (data mainan):", h["LH-N"]["vonis"]["vonis"], {k: v["nilai"] for k, v in h["LH-N"]["kontras"].items()}, "lulus P1 (calon):", h["_ringkas"]["lulus_p1_calon"], "-", h["_ringkas"]["p2"])
    print("buka --kering OK: tidak menyentuh data nyata dan tidak menulis apa pun")


if __name__ == "__main__":
    main()
