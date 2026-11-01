"""Debit Google Runoff Reanalysis (GRRR) pada model peluang banjir kabupaten-hari -> data/raw/banjir/model_kab_grrr/

Protokol: PRAREG-GRRR.md. Kerangka (sampel, label, CHIRPS/hulu, GBDT/LR, Platt silang, bootstrap, gerbang sia/buka, jejak .sidik)
DIIMPOR dari model_kab_hulu.py (HU) tanpa mengubah berkasnya, dengan pola model_kab_tanah.py; di sini hanya fitur GRRR, model
M0G/M3G, pembagian waktu 2016-2021 / 2022-2023 / 2024-2025 (GRRR berakhir 2025-12-30), dan uji sekunder hindcast.
Stdlib saja: npz GRRR dibaca dengan pembaca .npy sendiri (tanpa numpy).

Pakai:  python3 scripts/banjir/model_kab_grrr.py fitur     fitur GRRR per kab-hari + cakupan, TANPA label (sekali, sebelum latih)
        python3 scripts/banjir/model_kab_grrr.py uji       swauji tanpa jaringan
        python3 scripts/banjir/model_kab_grrr.py latih [--ulang "<alasan galat teknis>"]   JANGAN sebelum PRAREG-GRRR ditinjau
        python3 scripts/banjir/model_kab_grrr.py sia | buka   Uji A (2024) / Uji A+B (2024-2025), SEKALI
"""
import ast, datetime as dt, gzip, hashlib, json, math, os, random, struct, sys, time, zipfile
from array import array

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
import model_kab_hulu as HU  # noqa: E402
import grrr as GR  # noqa: E402  (DIR, EPOCH, J_AMBANG, irisan_tahun)
from sungai import gumbel  # noqa: E402

MK, ub, G = HU.MK, HU.ub, HU.G
HULU_DIR = HU.KELUAR                         # dibaca saja: sampel, basin, label_latih, dibi_le2025, cache CHIRPS
DIBI_ASLI = HU.DIBI_TGL
KELUAR = os.path.join(AKAR, "data/raw/banjir/model_kab_grrr")
J_FITUR = os.path.join(KELUAR, "fitur.json.gz")
J_CAKUPAN = os.path.join(KELUAR, "cakupan.json")
PROTOKOL = os.path.join(AKAR, "scripts/banjir/PRAREG-GRRR.md")
SIDIK_JEJAK = os.path.join(AKAR, "scripts/banjir/model_kab_grrr.sidik")
EPOCH, EPOCH_RF = GR.EPOCH["baru"], dt.date(2016, 1, 1)   # time: days since 1980-12-31; issue_time: days since 2016-01-01
AKHIR_GRRR = dt.date(2025, 12, 30)
TAHUN_Q2, PERSENTIL, MIN_HARI = 2021, 25, 300
JENDELA = (-2, 0)                             # hari GRRR UTC e-2..e (prakiraan sempurna, reanalisis)
LEAD = (1, 3, 5, 7, 10)
N_LEAD = 11
LATIH, VALIDASI, UJI = range(2016, 2022), range(2022, 2024), range(2024, 2026)
BATAS_DIBI_LATIH = "2023-12-31"               # pagar: kode latih tidak pernah melihat label 2024-2025
JENDELA_A, JENDELA_B = (dt.date(2024, 1, 1), dt.date(2024, 12, 31)), (dt.date(2025, 1, 1), AKHIR_GRRR)
AKHIR_SIA, AKHIR_BUKA = dt.date(2025, 1, 2), dt.date(2026, 1, 1)   # hari terakhir dinilai = akhir - 2 (MK.hari_tahun)
DARI = dt.date(2026, 11, 2)
GF = ["g_rasio", "g_porsi"]
FITUR = HU.FITUR + GF
NH = len(HU.FITUR)
MODEL = ("M0", "M3", "M0G", "M3G")
KONTRAS = (("M3G", "M3"), ("M0G", "M0"))
ULANG, ULANG_SEKUNDER = 10_000, 2_000
Q_LO, Q_HI = 0.004, 0.996                     # Bonferroni m = 6 pada satu-sisi 2,5% (PRAREG-GRRR §5)

KRITERIA = {
    "pertanyaan": "HG: grrr (g_rasio, g_porsi) debit reanalisis GRRR distributed_model_2026_11; kontras M3G-M3 (G1) dan M0G-M0 (G2)",
    "fitur": "g_rasio = maks outlet maks hari UTC e-2..e Q/Q2; g_porsi = porsi outlet dengan maks jendela >= Q2; prakiraan sempurna (reanalisis)",
    "q2": "Gumbel-momen maksimum tahunan reanalisis 1981-2021 (>= 300 hari bernilai, >= 10 tahun)",
    "outlet": "di dalam poligon kab (grrr_ambang.json), Q2 >= P25 nasional Q2(<=2021) outlet di poligon kab Indonesia; kab tanpa outlet keluar dari keempat model",
    "model": "M0 dan M3 resep HULU dilatih ulang pada baris yang sama dengan M0G dan M3G; LR: log1p(g_rasio), g_porsi apa adanya",
    "label_latih": "sama dengan HULU (diverifikasi terhadap label_latih.json HULU), hanya baris 2016-2021; DIBI latih dipotong <= 2023-12-31",
    "pembagian": "latih 2016-2021, validasi 2022-2023, Uji A 2024 (hanya bisa menolak), Uji B 2025-01-01..2025-12-30; uji pakai-ulang",
    "alarm": "jumlah alarm sama dengan aturan status.py (>= Waspada, >= Siaga); seri dipecah acak biji 11",
    "ci": "bootstrap 10000 ulangan biji 11, dua skema blok identik keempat model, persentil 0,4 dan 99,6 (99,2%); bawah = terkecil, atas = terbesar",
    "keluarga": "m = 6 pada 2024-2025 DIBI kab-hari (uji model_kab, validasi DEBIT M1-M0, validasi HULU M2-M0 dan M3-M2, GRRR G1 dan G2); 2,5%/6 dibulatkan ke bawah -> 0,4% satu-sisi",
    "pemilihan": "kelompok menurut ll silang M0 (2022 <-> 2023); hiperparameter per model; 5 biji; Platt final di seluruh validasi",
    "sia": "per kontras: dETS Waspada titik <= 0 di 2024 -> 'tidak terbukti', dihentikan",
    "lulus": "batas bawah dETS Waspada > 0, dETS Siaga > 0, dBSS > 0, DAN titik dETS Waspada 2025 saja > 0 (veto 2025; gagal -> TIDAK MEYAKINKAN)",
    "teks_vonis": "vonis + '; bukti-konsep prakiraan sempurna (uji pakai-ulang); bukan bukti operasional'; hindcast lead 3 dan 5 di sebelahnya (deskriptif)",
    "daya_rendah": "mde_80 Waspada > 0,25 x ETS Waspada aturan status.py di validasi, dan vonis bukan TIDAK LULUS",
    "selang": "99,2% adalah penalti ad hoc, bukan jaminan FWE 2,5%: p/selang tidak setara alfa nominal; vonis = bukti awal",
    "tidak_lulus": "dETS Waspada titik <= 0 atau batas atasnya < 0",
    "tidak_meyakinkan": "selain keduanya",
    "sekunder": "hindcast reforecast lead 1/3/5/7/10 (issue e-L, hari max(e-2, e-L)..e), model reanalisis dipakai apa adanya; deskriptif, 2000 ulangan",
    "latih_ulang": "hanya untuk galat teknis, alasan tertulis di jejak, amandemen sebelum sia; jumlahnya dilaporkan di buka",
    "tanggal": "sia dan buka sejak 2026-11-02, sesudah jejak di-commit",
}


# ---------------------------------------------------------------- pembaca .npy stdlib
def baca_npz(p):
    """npz (zip berisi .npy) -> {nama: (shape, descr, byte data)}. Hanya C-order little-endian."""
    out = {}
    with zipfile.ZipFile(p) as z:
        for n in z.namelist():
            b = z.read(n)
            if b[:6] != b"\x93NUMPY":
                raise ValueError(f"{p}:{n} bukan .npy")
            hl, o = (struct.unpack("<H", b[8:10])[0], 10) if b[6] == 1 else (struct.unpack("<I", b[8:12])[0], 12)
            h = ast.literal_eval(b[o:o + hl].decode("latin1"))
            if h["fortran_order"]:
                raise ValueError(f"{p}:{n} fortran_order")
            out[n[:-4]] = (tuple(h["shape"]), h["descr"], b[o + hl:])
    return out


def teks(v):
    shp, d, raw = v
    k = int(d[2:]) * 4
    assert d.startswith("<U"), d
    return [raw[i * k:(i + 1) * k].decode("utf-32-le").rstrip("\x00") for i in range(shp[0])]


def f4(v):
    shp, d, raw = v
    assert d == "<f4" and sys.byteorder == "little", d
    a = array("f")
    a.frombytes(raw)
    return a


def baris_f2(v, r):
    """baris r array float16 [gauge, ...] -> array('f') datar."""
    shp, d, raw = v
    assert d == "<f2", d
    n = math.prod(shp[1:])
    return array("f", struct.unpack(f"<{n}e", raw[r * n * 2:(r + 1) * n * 2]))


# ---------------------------------------------------------------- murni: Q2, jendela, agregat (diuji luring)
def q2_deret(x, epoch=EPOCH, irisan=None):
    """Q2 Gumbel-momen dari maksimum tahunan s/d TAHUN_Q2 (tahun >= MIN_HARI hari bernilai). -> float atau None."""
    mx, tahun_maks = [], TAHUN_Q2
    for y, (a, b) in (irisan or GR.irisan_tahun(len(x), epoch)).items():
        if y > tahun_maks:
            continue
        s = x[a:b]
        t = sum(s)
        if t == t:
            m, n = max(s), len(s)
        else:                                   # ada NaN: jalur lambat, jarang (0,43%)
            v = [q for q in s if q == q]
            m, n = (max(v) if v else None), len(v)
        if n >= MIN_HARI:
            mx.append(m)
    g = gumbel(mx)
    return g[2] if g and g[2] > 0 else None


def persentil(v, p):
    v = sorted(v)
    return v[int(p / 100 * (len(v) - 1))]


def agregat(jendela, q2s):
    """[nilai jendela per outlet], [Q2] -> (g_rasio, g_porsi) atau None. Outlet dengan None/NaN di jendela gugur."""
    rs = [max(w) / q for w, q in zip(jendela, q2s) if w and all(v is not None and v == v for v in w)]
    return None if not rs else (max(rs), sum(1 for x in rs if x >= 1) / len(rs))


def jendela_re(s, i0, e):
    """deret reanalisis (indeks GRRR) -> nilai hari e-2..e; i0 = indeks GRRR untuk e = 0 (ub.AWAL). [] bila di luar deret."""
    a, b = i0 + e + JENDELA[0], i0 + e + JENDELA[1] + 1
    return list(s[a:b]) if a >= 0 and b <= len(s) else []


def jendela_rf(rf, j0, e, L, n_issue):
    """reforecast satu outlet (array datar [issue, lead]) -> nilai hari max(e-2, e-L)..e dari issue e-L, lead = hari - issue."""
    j = j0 + e - L
    if not 0 <= j < n_issue or L > N_LEAD - 1:
        return []
    return [rf[j * N_LEAD + (d - (e - L))] for d in range(max(e + JENDELA[0], e - L), e + JENDELA[1] + 1)]


# ---------------------------------------------------------------- fitur (tanpa label)
def J(n):
    return os.path.join(KELUAR, n)


def cek_panjang(nt, f=""):
    """Deret reanalisis wajib tepat sampai AKHIR_GRRR; bukan assert supaya tetap jalan di python -O."""
    if nt != (AKHIR_GRRR - EPOCH).days + 1:
        sys.exit(f"tolak: {f}: {nt} hari, bukan s/d {AKHIR_GRRR}")


def fitur():
    if os.path.exists(J("kandidat.json")):
        sys.exit("kandidat.json sudah ada: fitur dibekukan oleh latih, tidak ditimpa")
    t0 = time.time()
    amb = json.load(open(GR.J_AMBANG))
    ki = {k: amb["kolom"].index(k) for k in ("id", "prov", "kab")}
    kab_o = {r[ki["id"]]: f"{r[ki['prov']]}|{r[ki['kab']]}" for r in amb["baris"] if r[ki["prov"]] and r[ki["kab"]]}
    kabs = json.load(open(HU.SAMPEL))["kab"]
    ks = set(kabs)
    i0, n = (ub.AWAL - EPOCH).days, HU.hari_ke(AKHIR_GRRR) + 1
    ix = json.load(open(os.path.join(GR.DIR, "indeks_reanalisis.json")))
    q2, seri, man, iris = {}, {}, {"reanalisis": [], "reforecast": []}, None
    for f in sorted({ix[g] for g in kab_o if g in ix}):
        p = os.path.join(GR.DIR, "reanalisis", f)
        man["reanalisis"].append([f, HU.sha_berkas_j(p)])
        z = baca_npz(p)
        ids, x, nt = teks(z["id"]), f4(z["x"]), z["x"][0][1]
        cek_panjang(nt, f)
        iris = iris or GR.irisan_tahun(nt, EPOCH)
        for r, g in enumerate(ids):
            if g in kab_o:
                s = x[r * nt:(r + 1) * nt]
                q = q2_deret(s, irisan=iris)
                if q:
                    q2[g] = q
                if kab_o[g] in ks:
                    seri[g] = s
    p25 = persentil(q2.values(), PERSENTIL)
    outlet = {k: sorted([g, q2[g]] for g in seri if kab_o[g] == k and q2.get(g, 0) >= p25) for k in kabs}
    F = {"r": {}, "p": {}}
    for k, os_ in outlet.items():
        ss, qs = [seri[g] for g, _ in os_], [q for _, q in os_]
        v = [agregat([jendela_re(s, i0, e) for s in ss], qs) if ss else None for e in range(n)]
        F["r"][k] = [None if a is None else round(a[0], 5) for a in v]
        F["p"][k] = [None if a is None else round(a[1], 5) for a in v]
    # hindcast: hanya hari uji (sekunder)
    ixr = json.load(open(os.path.join(GR.DIR, "indeks_reforecast.json")))
    perlu = {g for os_ in outlet.values() for g, _ in os_}
    rf, n_issue = {}, None
    for f in sorted({ixr[g] for g in perlu if g in ixr}):
        p = os.path.join(GR.DIR, "reforecast", f)
        man["reforecast"].append([f, HU.sha_berkas_j(p)])
        z = baca_npz(p)
        n_issue = z["x"][0][1]
        assert z["x"][0][2] == N_LEAD, z["x"][0]
        for r, g in enumerate(teks(z["id"])):
            if g in perlu:
                rf[g] = baris_f2(z["x"], r)
    j0, eu = (ub.AWAL - EPOCH_RF).days, HU.hari_ke(JENDELA_A[0])
    hind = {}
    for L in LEAD:
        hr, hp = {}, {}
        for k, os_ in outlet.items():
            qs = [q for _, q in os_]
            v = [None] * eu + [agregat([jendela_rf(rf[g], j0, e, L, n_issue) if g in rf else [] for g, _ in os_], qs) if os_ else None for e in range(eu, n)]
            hr[k] = [None if a is None else round(a[0], 5) for a in v]
            hp[k] = [None if a is None else round(a[1], 5) for a in v]
        hind[str(L)] = {"r": hr, "p": hp}
    # cakupan tanpa label
    hari = range(HU.hari_ke(dt.date(2016, 1, 1)), n)
    bag = {"latih": LATIH, "validasi": VALIDASI, "uji": UJI}
    th = lambda e: (ub.AWAL + dt.timedelta(e)).year
    cak = {"kab_sampel": len(kabs), "kab_dengan_outlet_grrr": sum(1 for k in kabs if any(v == k for v in kab_o.values())),
           "kab_dengan_outlet_memenuhi": sum(1 for v in outlet.values() if v), "kab_tanpa_outlet_memenuhi": sorted(k for k, v in outlet.items() if not v),
           "outlet_nasional_q2": len(q2), "q2_p25_m3s": round(p25, 3), "outlet_memenuhi_sampel": sum(len(v) for v in outlet.values()),
           "outlet_per_kab": {k: len(v) for k, v in outlet.items()},
           "porsi_kab_hari_bernilai": {b: round(sum(1 for k in kabs for e in hari if th(e) in ys and F["r"][k][e] is not None)
                                                / (len(kabs) * sum(1 for e in hari if th(e) in ys)), 4) for b, ys in bag.items()},
           "porsi_kab_hari_uji_hindcast_5_lead": round(sum(1 for k in kabs for e in range(eu, n) if all(hind[str(L)]["r"][k][e] is not None for L in LEAD))
                                                       / (len(kabs) * (n - eu)), 4),
           "catatan": "tanpa label; kab-hari 2016-01-01..2025-12-30 dari 39 kab sampel HULU (sebelum pengecualian CHIRPS/hari hilang)"}
    os.makedirs(KELUAR, exist_ok=True)
    out = {"dibuat": dt.datetime.now().isoformat(timespec="seconds"), "sumber": GR.SUMBER, "model": "distributed_model_2026_11",
           "awal_ub": str(ub.AWAL), "akhir": str(AKHIR_GRRR), "n": n, "q2_p25": p25, "persentil": PERSENTIL, "tahun_q2_maks": TAHUN_Q2,
           "sha256_ambang": HU.sha_berkas_j(GR.J_AMBANG), "outlet": outlet, "r": F["r"], "p": F["p"], "hind": hind, "manifest": man, "cakupan": cak}
    with gzip.open(J_FITUR + ".tmp", "wt") as f:
        json.dump(out, f, separators=(",", ":"))
    os.replace(J_FITUR + ".tmp", J_FITUR)
    json.dump(cak, open(J_CAKUPAN, "w"), indent=1, ensure_ascii=False)
    print(json.dumps(cak, indent=1, ensure_ascii=False))
    print(f"fitur ditulis {J_FITUR} ({time.time() - t0:.0f} dtk); TIDAK ada label yang dibaca")


def muat_fitur():
    if not os.path.exists(J_FITUR):
        sys.exit("fitur.json.gz belum ada: jalankan `fitur`")
    with gzip.open(J_FITUR, "rt") as f:
        return json.load(f)


def nilai(F, kab, e):
    r = F["r"].get(kab)
    return None if r is None or e >= len(r) or r[e] is None else (r[e], F["p"][kab][e])


def tambah_grrr(B, F):
    """Menambah kolom GF ke B["X"] dan MEMBUANG baris tanpa nilai GRRR (dari keempat model). -> (B baru, statistik)."""
    st, ada, ekstra = {"masuk": len(B["y"]), "kab_dibuang": 0, "tanpa_grrr": 0}, [], []
    for i, (kab, e) in enumerate(zip(B["kab"], B["e"])):
        if not F["outlet"].get(kab):
            st["kab_dibuang"] += 1
            continue
        v = nilai(F, kab, e)
        if v is None:
            st["tanpa_grrr"] += 1
            continue
        ada.append(i)
        ekstra.append(list(v))
    out = {k: [B[k][i] for i in ada] for k in B if k != "X"}
    out["X"] = [B["X"][i] + x for i, x in zip(ada, ekstra)]
    st["keluar"] = len(ada)
    return out, st


# ---------------------------------------------------------------- pemasangan kerangka HULU
def aktif(nama):
    return list(HU.AKTIF["M3" if nama.startswith("M3") else "M0"]) + ([NH, NH + 1] if nama.endswith("G") else [])


_X_LR_HULU, _CEK_HULU = HU.x_lr_h, HU.cek_kelengkapan


def x_lr_g(x):
    return _X_LR_HULU(x) + [math.log1p(x[NH]), x[NH + 1]]


def sidik_kriteria():
    return hashlib.sha256(json.dumps(KRITERIA, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def terpasang():
    if not getattr(HU, "_GRRR_DIPASANG", False) or HU.x_lr_h is not x_lr_g or MK.LATIH != LATIH:
        sys.exit("pasang() belum dipanggil: model_kab_grrr hanya boleh dijalankan sebagai skrip (__main__), ditolak")


def cuaca_penuh(sel, akhir):
    """Deret ERA5 utuh (ub.AKHIR asli) walau HU.data_uji menambal ub.AKHIR ke akhir jendela; cache selalu 2015-12-22..AKHIR_LATIH (amandemen A1)."""
    with HU.tambal_ub(HU.AKHIR_LATIH):
        return MK.muat_cuaca(sel)


def pasang(keluar=KELUAR):
    """HANYA dari __main__ (atau swauji). Menunjuk variabel modul HU/MK ke percobaan ini di proses ini saja (berkas tidak disentuh)."""
    HU.KELUAR, HU.SIDIK_JEJAK = keluar, SIDIK_JEJAK
    HU._GRRR_DIPASANG = True
    HU.Q_LO, HU.Q_HI, HU.KONTRAS = Q_LO, Q_HI, KONTRAS
    HU.x_lr_h = x_lr_g
    HU.sidik_kriteria, HU.sidik_penuh, HU.cek_kelengkapan = sidik_kriteria, sidik_penuh, cek_kelengkapan
    HU.SIA_DARI = HU.BUKA_DARI = DARI
    HU.AKHIR_SIA, HU.AKHIR_BUKA = AKHIR_SIA, AKHIR_BUKA
    HU.cuaca_sampai = cuaca_penuh
    MK.LATIH, MK.VALIDASI, MK.UJI = LATIH, VALIDASI, UJI


# ---------------------------------------------------------------- model dan penilaian
def cocok(TR, VA, log=None, grid=None, pohon_maks=None):
    """Kelompok menurut ll silang M0; model lain kelompok sama, hiperparameter per model. -> (jenis, mod, ll kelompok, ll terpilih)."""
    h0, l_g0 = HU.tala_gbdt(TR, VA, aktif("M0"), grid, pohon_maks, log)
    m_lr0, l_l0 = HU.latih_lr_h(TR, VA, aktif("M0"))
    jenis = "gbdt" if l_g0 <= l_l0 else "lr"
    mod, lls = {}, {}
    for n in MODEL:
        if jenis == "gbdt":
            h, l = (h0, l_g0) if n == "M0" else HU.tala_gbdt(TR, VA, aktif(n), grid, pohon_maks, log)
            mod[n], lls[n] = HU.latih_anggota(TR, VA, aktif(n), h), l
        else:
            mod[n], lls[n] = (m_lr0, l_l0) if n == "M0" else HU.latih_lr_h(TR, VA, aktif(n))
    return jenis, mod, {"gbdt": l_g0, "lr": l_l0}, lls


def sub(B, ix):
    return {k: [v[i] for i in ix] for k, v in B.items()}


def rangkum(B, P, ref, ulang=ULANG, penuh=True):
    y = B["y"]
    out = {"n": len(y), "kej": sum(y), "laju": round(sum(y) / max(1, len(y)), 4), "kab": len(set(B["kab"]))}
    out["probabilitas"] = {m: {"auc": G.auc(p, y), "brier": G.brier(p, y), "logloss": G.logloss(p, y)} for m, p in list(P.items()) + [("klimatologi", ref)]}
    out["kontras"] = HU.boot_kontras(B, P, ref, kontras=KONTRAS, ulang=ulang)
    if penuh:
        ns, sem = HU.n_alarm(B), range(len(y))
        for lv, L in MK.LEVEL_ALARM.items():
            tot = lambda al: HU.ets_t(MK.kontingensi(al, y, sem))
            out["ets_" + lv] = {**{m: round(tot(MK.alarm_sebanyak(p, ns[lv])), 4) for m, p in P.items()}, "aturan": round(tot([l >= L for l in B["level"]]), 4)}
        out["per_pulau"] = HU.per_pulau(B, P, kontras=KONTRAS)
        out["per_tahun_deskriptif"] = {}
        for t in sorted(set(B["tahun"])):
            ix = [i for i, v in enumerate(B["tahun"]) if v == t]
            if sum(y[i] for i in ix):
                out["per_tahun_deskriptif"][str(t)] = HU.boot_kontras(sub(B, ix), {m: [p[i] for i in ix] for m, p in P.items()}, [ref[i] for i in ix],
                                                                      kontras=KONTRAS, ulang=ULANG_SEKUNDER)
    return out


def sekunder(kand, B, F, ref):
    """Hindcast lead L (deskriptif): model reanalisis dipakai apa adanya dengan kolom GF diganti hindcast; baris dengan kelima lead."""
    H = {L: F["hind"][str(L)] for L in LEAD}
    ix = [i for i, (k, e) in enumerate(zip(B["kab"], B["e"])) if all(nilai(H[L], k, e) for L in LEAD)]
    Bs = sub(B, ix)
    if not sum(Bs["y"]):
        return {"n": len(ix), "catatan": "tanpa kejadian"}
    P = {n: HU.prediksi_h(kand[n], Bs["X"]) for n in MODEL}
    kn = list(KONTRAS)
    auc = {"reanalisis": G.auc([x[NH] for x in Bs["X"]], Bs["y"])}
    for L in LEAD:
        Xh = [x[:NH] + list(nilai(H[L], k, e)) for x, k, e in zip(Bs["X"], Bs["kab"], Bs["e"])]
        auc[f"hindcast_{L}"] = G.auc([x[NH] for x in Xh], Bs["y"])
        for m in ("M3G", "M0G"):
            P[f"{m}_h{L}"] = HU.prediksi_h(kand[m], Xh)
            kn.append((f"{m}_h{L}", m[:2]))
    return {"n": len(ix), "kej": sum(Bs["y"]), "label": "hindcast (deskriptif, bukan vonis)", "auc_g_rasio": auc,
            "kontras": HU.boot_kontras(Bs, P, [ref[i] for i in ix], kontras=kn, ulang=ULANG_SEKUNDER)}


EKOR = "; bukti-konsep prakiraan sempurna (uji pakai-ulang); bukan bukti operasional"


def vonis_grrr(r, r_kontrol, dets_2025, mde80, ets_aturan):
    """Vonis HULU (selang 99,2%, kontrol DIBI-saja) + veto 2025 (titik dETS Waspada 2025 harus > 0, kalau tidak LULUS -> TIDAK
    MEYAKINKAN) + '(daya rendah)' relatif: mde_80 > 0,25 x ETS Waspada aturan validasi."""
    v = HU.vonis_akhir(r, r_kontrol, None)
    g = v["vonis_gabungan"]
    veto = g == "LULUS" and not (dets_2025 is not None and dets_2025 > 0)
    if veto:
        g = "TIDAK MEYAKINKAN"
    peka = g == "LULUS" and v["peka_label"]
    rendah = mde80 is not None and bool(ets_aturan) and mde80 > 0.25 * ets_aturan and g != "TIDAK LULUS"
    teks = g + (", PEKA LABEL" if peka else "") + (" (daya rendah)" if rendah else "") + EKOR
    return {**v, "vonis": teks, "vonis_gabungan": g, "veto_2025": veto, "dets_waspada_2025": dets_2025, "peka_label": peka, "daya_rendah": rendah,
            "mde_80": mde80, "ambang_daya": None if not ets_aturan else round(0.25 * ets_aturan, 5)}


def hindcast_samping(sk, kn):
    """dETS Waspada dan dBSS titik hindcast lead 3 dan 5 untuk kontras kn (deskriptif, di sebelah vonis)."""
    m, b = kn.split("-")
    k = sk.get("kontras") or {}
    return {f"lead_{L}": {"dets_waspada": k[f"{m}_h{L}-{b}"]["waspada"]["nilai"], "dbss": k[f"{m}_h{L}-{b}"]["bss"]["nilai"]}
            for L in (3, 5) if f"{m}_h{L}-{b}" in k}


def cetak(pen):
    print(f"  n={pen['n']} kej={pen['kej']} laju={pen['laju']} kab={pen['kab']}")
    for m, v in pen["probabilitas"].items():
        print(f"    {m:12s} AUC {v['auc']:.4f}  Brier {v['brier']:.5f}  logloss {v['logloss']:.5f}")
    for kn, r in pen["kontras"].items():
        b = r["bss"]
        print(f"  GRRR {kn}: dBSS {b['nilai']:+.5f} CI99,2 [{b['ci'][0]:+.5f}, {b['ci'][1]:+.5f}]")
        for lv in MK.LEVEL_ALARM:
            x = r[lv]
            print(f"    >= {lv} (alarm {x['alarm']}): dETS {x['nilai']:+.4f} CI99,2 [{x['ci'][0]:+.4f}, {x['ci'][1]:+.4f}]")


# ---------------------------------------------------------------- sidik
ISI_KAND = ("fitur", "jenis", *MODEL, "kontrol", "mde", "ll_silang", "klim", "frek", "frek_awal", "sel", "kab", "kab_dibuang", "kab_dibuang_g",
            "platt_klim", "outlet", "q2_p25", "ets_aturan_validasi")


def tambal():
    return {**HU.tambal(), "FITUR_G": FITUR, "JENDELA": JENDELA, "LEAD": LEAD, "TAHUN_Q2": TAHUN_Q2, "PERSENTIL": PERSENTIL, "MIN_HARI": MIN_HARI,
            "AKTIF_G": {n: aktif(n) for n in MODEL}, "ULANG_G": [ULANG, ULANG_SEKUNDER], "Q_G": [Q_LO, Q_HI], "KONTRAS_G": KONTRAS,
            "BATAS_DIBI_LATIH": BATAS_DIBI_LATIH, "JENDELA_UJI": [[str(a), str(b)] for a, b in (JENDELA_A, JENDELA_B)], "DARI": str(DARI)}


def sidik_penuh(kand):
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "kand": {k: kand[k] for k in ISI_KAND}, "tambal": tambal()}, sort_keys=True).encode())
    kode = [os.path.abspath(__file__)] + [os.path.join(AKAR, "scripts/banjir", n) for n in (
        "model_kab_hulu.py", "model_kab.py", "uji_balik.py", "status.py", "label_bersatu.py", "umum.py", "model_kab_debit.py", "grrr.py", "sungai.py",
        "PRAREG-HULU.md")]
    kode += [os.path.join(AKAR, "scripts/sebaran/gbdt.py"), PROTOKOL, HU.SAMPEL, HU.BASIN, os.path.join(HULU_DIR, "label_latih.json"),
             HU.J("label_latih.json"), HU.J("dibi_le2023.json"), J_FITUR, GR.J_AMBANG]
    h.update(json.dumps(HU.hash_berkas(*kode)).encode())
    h.update(json.dumps(MK.manifest_era5(kand["sel"])).encode())
    h.update(json.dumps(HU.manifest_chirps(HU.AKHIR_LATIH)).encode())
    return h.hexdigest()[:16]


def dibi_latih(baris):
    """Pagar label: hanya baris DIBI <= BATAS_DIBI_LATIH yang boleh dilihat kode latih."""
    return [r for r in baris if r[3] <= BATAS_DIBI_LATIH]


def cek_label_hulu(milik, hulu, dibi_milik, dibi_hulu):
    """Label latih HARUS sama dengan HULU (isi, bukan tanggal dibuat); salinan DIBI = DIBI HULU dipotong <= 2023."""
    a, b = json.load(open(milik)), json.load(open(hulu))
    for k in ("sha256", "n", "sha256_label_bersatu_csv", "sha256_hari_tercakup"):
        if a.get(k) != b.get(k):
            sys.exit(f"label latih beda dengan label_latih.json HULU ({k}): ditolak")
    if HU.hash_baris(json.load(open(dibi_milik))) != HU.hash_baris(dibi_latih(json.load(open(dibi_hulu)))):
        sys.exit("salinan DIBI <= 2023 beda dengan dibi_le2025.json HULU dipotong ke <= 2023: ditolak")


def cek_kelengkapan(kand, akhir):
    _CEK_HULU(kand, akhir)                # sampel, CHIRPS, ERA5 (aturan HULU)
    F = muat_fitur()
    if F["outlet"] != kand["outlet"] or len(next(iter(F["r"].values()))) < HU.hari_ke(min(akhir - dt.timedelta(2), AKHIR_GRRR)) + 1:
        sys.exit("fitur.json.gz beda dengan kandidat atau belum sampai akhir jendela: ditolak")


# ---------------------------------------------------------------- data dan latih
def data_latih():
    os.makedirs(HU.KELUAR, exist_ok=True)
    j = HU.J("dibi_le2023.json")
    json.dump(dibi_latih(json.load(open(DIBI_ASLI))), open(j, "w"), separators=(",", ":"))
    HU.DIBI_TGL = j
    try:
        D = HU.data_latih()               # menulis label_latih.json + dibi_le2025.json (isi <= 2023) ke folder ini (pasang)
    finally:
        HU.DIBI_TGL = DIBI_ASLI
    assert max(r[3] for r in D["baris"]) <= BATAS_DIBI_LATIH, "pagar label latih jebol"
    cek_label_hulu(HU.J("label_latih.json"), os.path.join(HULU_DIR, "label_latih.json"), j, os.path.join(HULU_DIR, "dibi_le2025.json"))
    D["F"] = muat_fitur()
    return D


def bangun_g(D, tahun, ev):
    B, st_h = HU.bangun_h(D, tahun, ev)
    B, st_g = tambah_grrr(B, D["F"])
    return B, {"hulu": st_h, "grrr": st_g}


def latih(ulang=False, alasan=None):
    terpasang()
    if ulang and not (alasan and alasan.strip()):
        sys.exit("latih --ulang butuh alasan teks (galat teknis saja, PRAREG-GRRR §8): latih --ulang \"<alasan>\"")
    for n in ("sia.mulai", "buka.mulai", "sia.json", "buka.json"):
        if os.path.exists(HU.J(n)):
            sys.exit(f"{n} ada: sia/buka sudah dimulai; latih ulang = eksperimen baru")
    if os.path.exists(HU.J("kandidat.json")) and not ulang:
        sys.exit("kandidat.json sudah ada: latih ulang butuh flag --ulang (menambah baris latih baru di jejak)")
    t0 = time.time()
    D = data_latih()
    TR, st_tr = bangun_g(D, MK.LATIH, D["ev_l"])
    TRd, _ = bangun_g(D, MK.LATIH, D["ev"])
    VA, st_va = bangun_g(D, MK.VALIDASI, D["ev"])
    assert TR["e"] == TRd["e"] and TR["kab"] == TRd["kab"]
    kab_g = sorted(k for k in D["info"] if not D["F"]["outlet"].get(k))
    print(f"latih {len(TR['y'])} baris ({sum(TR['y'])} kej gabungan, {sum(TRd['y'])} DIBI), validasi {len(VA['y'])} ({sum(VA['y'])} kej); "
          f"kab dibuang GRRR {kab_g}; pengecualian latih {st_tr} validasi {st_va}", flush=True)
    jenis, mod, ll, lls = cocok(TR, VA, log=lambda s: print(s, flush=True))
    print(f"  kelompok {jenis} (ll silang M0: {ll}); terpilih {lls}")
    pk_mentah = [D["klim"][f"{k}|{m}"] for k, m in zip(VA["kab"], VA["bulan"])]
    pl_k = MK.platt([MK.logit(p) for p in pk_mentah], VA["y"])
    pk = MK.pakai_platt(pl_k, [MK.logit(p) for p in pk_mentah])
    P = {n: HU.prediksi_h(m, VA["X"]) for n, m in mod.items()}
    pen = rangkum(VA, P, pk)
    modd = HU.latih_ulang_hiper(TRd, VA, jenis, mod)
    kontrol = rangkum(VA, {n: HU.prediksi_h(m, VA["X"]) for n, m in modd.items()}, pk, penuh=False)
    daya = HU.mde_h(VA, P)
    kand = {"versi": "model-kab-grrr-1", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
            "status": "KANDIDAT: uji 2024-2025 belum dibuka", "fitur": FITUR, "jenis": jenis, **mod, "ll_silang": lls, "klim": D["klim"], "frek": D["penuh"],
            "frek_awal": D["awal"], "kontrol": modd, "mde": daya, "sel": [list(s) for s in D["sel"]], "kab": D["kabs"], "kab_dibuang": D["kab_dibuang"],
            "kab_dibuang_g": kab_g, "platt_klim": pl_k, "ets_aturan_validasi": pen["ets_waspada"]["aturan"], "outlet": D["F"]["outlet"], "q2_p25": D["F"]["q2_p25"], "sidik_kriteria": sidik_kriteria()}
    kand["sidik"] = sidik_penuh(kand)
    json.dump(kand, open(HU.J("kandidat.json"), "w"), separators=(",", ":"))
    HU.tambah_jejak({"jenis": "latih", "waktu": kand["dibuat"], "sidik": kand["sidik"], "sidik_kriteria": kand["sidik_kriteria"],
                     **({"ulang": True, "alasan": alasan.strip()} if ulang else {})})
    json.dump({"dibuat": kand["dibuat"], "jenis": jenis, "ll_silang_kelompok_m0": ll, "ll_silang_terpilih": lls, "validasi": pen, "kontrol_dibi_saja": kontrol,
               "mde": daya, "pengecualian": {"latih": st_tr, "validasi": st_va}, "kab_dibuang": D["kab_dibuang"], "kab_dibuang_g": kab_g,
               "hari_kejadian": {"latih_gabungan": sum(TR["y"]), "latih_dibi": sum(TRd["y"]), "validasi": sum(VA["y"])}},
              open(HU.J("latih.json"), "w"), separators=(",", ":"))
    cetak(pen)
    print("kontrol DIBI saja:")
    cetak(kontrol)
    print(f"MDE: {daya}")
    print(f"sidik {kand['sidik']} sidik_kriteria {kand['sidik_kriteria']}; uji 2024-2025 BELUM DIBUKA ({time.time() - t0:.0f} dtk)")
    print("INGAT: commit scripts/banjir/model_kab_grrr.sidik dan model_kab_grrr.py sebelum sia")


# ---------------------------------------------------------------- sia dan buka
def label_asli():
    return json.load(open(DIBI_ASLI))


def data_uji(kand, jendela, akhir, label):
    B, D = HU.data_uji(kand, jendela, akhir, label)
    F = muat_fitur()
    B, st = tambah_grrr(B, F)
    D["F"], D["pengecualian"] = F, {"hulu": D["pengecualian"], "grrr": st}
    return B, D


def prediksi_uji(kand, B):
    P = {n: HU.prediksi_h(kand[n], B["X"]) for n in MODEL}
    Pk = {n: HU.prediksi_h(kand["kontrol"][n], B["X"]) for n in MODEL}
    return P, HU.p_klim_dari(B, kand["klim"], kand["platt_klim"]), Pk


def hash_jendela(D, awal, akhir):
    return HU.hash_jendela(D, awal, akhir)        # GRRR terkunci lewat sidik (fitur.json.gz)


def sia():
    terpasang()
    kand = HU.gerbang("sia")
    label = HU.bekukan_label("A", JENDELA_A, baris=label_asli())
    B, D = data_uji(kand, [JENDELA_A], AKHIR_SIA, label)
    P, pk, Pk = prediksi_uji(kand, B)
    pen = rangkum(B, P, pk)
    kontrol = rangkum(B, Pk, pk, penuh=False)["kontras"]
    v = {kn: HU.vonis_sia_kontras(r) for kn, r in pen["kontras"].items()}
    cetak(pen)
    print("SIA", v)
    json.dump({"tanggal": str(dt.date.today()), "sidik": kand["sidik"], "sha256_label": json.load(open(HU.J("label_A.json")))["sha256"],
               "hash_jendela_A": hash_jendela(D, *JENDELA_A), "pengecualian": D["pengecualian"], "uji_A": pen, "kontrol_dibi_saja": kontrol, "vonis": v},
              open(HU.J("sia.json"), "w"), separators=(",", ":"))
    HU.tambah_jejak({"jenis": "sia", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sha256_sia": HU.sha_berkas_j(HU.J("sia.json")),
                     "sha256_label_A": HU.sha_berkas_j(HU.J("label_A.json"))})
    print("jejak model_kab_grrr.sidik ditambah baris `sia`: COMMIT berkas itu sebelum `buka`")


def buka():
    terpasang()
    kand = HU.gerbang("buka")
    ulang = [b for b in HU.jejak_head() if b.get("jenis") == "latih" and b.get("ulang")]
    s = json.load(open(HU.J("sia.json")))
    asli = label_asli()
    labA = HU.bekukan_label("A", JENDELA_A, baris=asli)
    if HU.hash_baris(labA) != s["sha256_label"]:
        sys.exit("label Uji A berubah sejak `sia`")
    labB = HU.bekukan_label("B", JENDELA_B, baris=asli)
    B, D = data_uji(kand, [JENDELA_A, JENDELA_B], AKHIR_BUKA, labA + labB)
    if hash_jendela(D, *JENDELA_A) != s["hash_jendela_A"]:
        sys.exit("deret ERA5/CHIRPS jendela Uji A berubah sejak `sia`: ditolak")
    P, pk, Pk = prediksi_uji(kand, B)
    pen = rangkum(B, P, pk)
    kontrol = rangkum(B, Pk, pk, penuh=False)["kontras"]
    v = {}
    sk = sekunder(kand, B, D["F"], pk)
    for kn in pen["kontras"]:
        if s["vonis"][kn]["vonis"] == "lanjut":
            r25 = pen.get("per_tahun_deskriptif", {}).get("2025", {}).get(kn, {}).get("waspada", {}).get("nilai")
            v[kn] = vonis_grrr(pen["kontras"][kn], kontrol[kn], r25, HU.mde80_kontras(kand, kn), kand.get("ets_aturan_validasi"))
        else:
            v[kn] = {"vonis": "tidak terbukti" + EKOR, "rincian": "dihentikan di Uji A"}
        v[kn]["hindcast_deskriptif"] = hindcast_samping(sk, kn)
    cetak(pen)
    print("VONIS", {k: x["vonis"] for k, x in v.items()}, f"; latih --ulang sebelum sia: {len(ulang)}")
    json.dump({"tanggal": str(dt.date.today()), "sidik": kand["sidik"],
               "sha256_label": {"A": json.load(open(HU.J("label_A.json")))["sha256"], "B": json.load(open(HU.J("label_B.json")))["sha256"]},
               "latih_ulang": {"n": len(ulang), "alasan": [b.get("alasan") for b in ulang]}, "pengecualian": D["pengecualian"],
               "uji_final": pen, "kontrol_dibi_saja": kontrol, "vonis": v, "sekunder_hindcast": sk}, open(HU.J("buka.json"), "w"), separators=(",", ":"))
    HU.tambah_jejak({"jenis": "buka", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sha256_buka": HU.sha_berkas_j(HU.J("buka.json")),
                     "sha256_label_A": HU.sha_berkas_j(HU.J("label_A.json")), "sha256_label_B": HU.sha_berkas_j(HU.J("label_B.json"))})


# ---------------------------------------------------------------- uji (tanpa jaringan)
def _npy(descr, shape, data):
    h = repr({"descr": descr, "fortran_order": False, "shape": shape}).encode()
    h += b" " * (63 - (10 + len(h)) % 64) + b"\n"
    return b"\x93NUMPY\x01\x00" + struct.pack("<H", len(h)) + h + data


def uji():
    import contextlib, io, subprocess, tempfile
    global data_uji, prediksi_uji, hash_jendela, sekunder, DIBI_ASLI
    nan = float("nan")
    # 1. pembaca .npy stdlib: <U19, <f4, <f2
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "a.npz")
        with zipfile.ZipFile(p, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("id.npy", _npy("<U19", (2,), "".join(s.ljust(19, "\x00") for s in ("subhybas_1", "subhybas_22")).encode("utf-32-le")))
            z.writestr("x.npy", _npy("<f4", (2, 3), array("f", [1, 2, 3, 4, 5, nan]).tobytes()))
            z.writestr("rf.npy", _npy("<f2", (2, 2, 2), struct.pack("<8e", *range(8))))
        zz = baca_npz(p)
        assert teks(zz["id"]) == ["subhybas_1", "subhybas_22"] and list(f4(zz["x"]))[:5] == [1, 2, 3, 4, 5] and math.isnan(f4(zz["x"])[5])
        assert list(baris_f2(zz["rf"], 1)) == [4, 5, 6, 7]
    # 2. Q2 hanya dari tahun <= 2021 (assert pembeda), sama dengan acuan murni grrr.maks_per_tahun
    n = (AKHIR_GRRR - EPOCH).days + 1
    r = random.Random(5)
    x = array("f", [r.random() * 10 for _ in range(n)])
    for y in range(1981, 2026):
        x[(dt.date(y, 3, 1) - EPOCH).days] = 50 + (y * 7919) % 41
    for i in range((dt.date(2000, 2, 1) - EPOCH).days, (dt.date(2000, 3, 15) - EPOCH).days):
        x[i] = nan                                              # NaN sebagian: tahun 2000 tetap >= 300 hari
    acuan = gumbel([v for y, v in GR.maks_per_tahun(list(x), EPOCH).items() if y <= 2021])[2]
    q = q2_deret(x)
    assert abs(q - acuan) < 1e-6 * acuan, (q, acuan)
    x2 = array("f", x)
    x2[(dt.date(2022, 7, 1) - EPOCH).days] = 1e6               # 2022 ekstrem TIDAK mengubah Q2
    x2[(dt.date(2025, 7, 1) - EPOCH).days] = 1e6
    assert q2_deret(x2) == q
    x2[(dt.date(2021, 7, 1) - EPOCH).days] = 1e3               # 2021 mengubahnya
    assert q2_deret(x2) > q
    x3 = array("f", x)
    for i in range((dt.date(2001, 1, 1) - EPOCH).days, (dt.date(2001, 3, 10) - EPOCH).days):
        x3[i] = nan                                             # 2001 tinggal 297 hari bernilai -> tahun gugur
    x3[(dt.date(2001, 7, 1) - EPOCH).days] = 1e5
    a3 = gumbel([v for y, v in GR.maks_per_tahun(list(x3), EPOCH).items() if y <= 2021])[2]
    assert abs(q2_deret(x3) - a3) < 1e-6 * a3 and a3 < 1e4, (q2_deret(x3), a3)
    xn = array("f", [1.0] * n)                                  # >= 10 tahun, satu pencilan ekstrem -> Gumbel Q2 <= 0 -> None
    xn[(dt.date(1990, 7, 1) - EPOCH).days] = 1e6
    assert gumbel([v for y, v in GR.maks_per_tahun(list(xn), EPOCH).items() if y <= 2021])[2] <= 0 and q2_deret(xn) is None
    assert q2_deret(array("f", [1.0] * 3000)) is None and persentil([4, 1, 3, 2, 5], 25) == 2
    cek_panjang((AKHIR_GRRR - EPOCH).days + 1)
    HU._tolak(lambda: cek_panjang((AKHIR_GRRR - EPOCH).days), "bukan s/d")
    # 3. jendela hari: e-3 dan e+1 tidak mengubah fitur; e-2, e-1, e mengubahnya (assert pembeda)
    i0, e = 10, 20
    s1, s2 = [1.0] * 60, [2.0] * 60
    base = agregat([jendela_re(s1, i0, e), jendela_re(s2, i0, e)], [2.0, 4.0])
    assert base == (0.5, 0.0)
    for k in (-3, 1):
        t = list(s1)
        t[i0 + e + k] = 99.0
        assert agregat([jendela_re(t, i0, e), jendela_re(s2, i0, e)], [2.0, 4.0]) == base, k
    for k in (-2, -1, 0):
        t = list(s1)
        t[i0 + e + k] = 3.0
        assert agregat([jendela_re(t, i0, e), jendela_re(s2, i0, e)], [2.0, 4.0]) == (1.5, 0.5), k
    t = list(s1)
    t[i0 + e - 1] = nan                                         # outlet ber-NaN gugur, outlet lain dipakai
    assert agregat([jendela_re(t, i0, e), jendela_re(s2, i0, e)], [2.0, 4.0]) == (0.5, 0.0)
    assert agregat([jendela_re(t, i0, e)], [2.0]) is None and jendela_re(s1, i0, 49) != [] and jendela_re(s1, i0, 50) == [] and agregat([], []) is None
    # 4. hindcast: issue e-L, lead = hari - issue, hari max(e-2, e-L)..e
    rf = array("f", [j * 100 + l for j in range(40) for l in range(N_LEAD)])
    assert jendela_rf(rf, 5, 20, 3, 40) == [(22) * 100 + 1, 2200 + 2, 2200 + 3]          # issue j=5+17=22, hari e-2..e = lead 1..3
    assert jendela_rf(rf, 5, 20, 1, 40) == [2400 + 0, 2400 + 1]                           # issue e-1: hanya e-1..e
    assert jendela_rf(rf, 5, 20, 10, 40) == [1500 + 8, 1500 + 9, 1500 + 10]
    assert jendela_rf(rf, 5, 2, 10, 40) == [] and jendela_rf(rf, 5, 20, 11, 40) == []
    # 5. tambah_grrr: kab tanpa outlet keluar, hari tanpa nilai keluar
    F = {"outlet": {"K": [["a", 2.0]], "Z": []}, "r": {"K": [None, 1.5, 0.7]}, "p": {"K": [None, 1.0, 0.0]}}
    Bm = {"kab": ["K", "K", "Z", "K"], "tahun": [2020] * 4, "bulan": [1] * 4, "e": [0, 1, 1, 9], "X": [[0.0] * NH for _ in range(4)], "y": [0] * 4, "level": [0] * 4}
    Bo, st = tambah_grrr(Bm, F)
    assert Bo["e"] == [1] and Bo["X"][0][NH:] == [1.5, 1.0] and st == {"masuk": 4, "kab_dibuang": 1, "tanpa_grrr": 2, "keluar": 1}
    # 6. pagar label: 2024 tidak lolos ke latih
    bl = [[["banjir"], "11", "k", "2023-12-31", 1], [["banjir"], "11", "k", "2024-01-01", 1], [["banjir"], "11", "k", "2025-06-01", 1]]
    assert [r[3] for r in dibi_latih(bl)] == ["2023-12-31"]
    # 7. pemasangan, fitur aktif, LR
    terpasang()
    assert MK.LATIH == range(2016, 2022) and MK.VALIDASI == range(2022, 2024) and HU.AKHIR_BUKA == AKHIR_BUKA and HU.Q_LO == Q_LO
    assert MK.hari_tahun(MK.LATIH)[-1] == HU.hari_ke(dt.date(2021, 12, 31))
    assert aktif("M0G") == HU.AKTIF["M0"] + [NH, NH + 1] and aktif("M3") == HU.AKTIF["M3"] and FITUR[NH:] == GF
    xx = [1.0] * len(FITUR)
    assert len(x_lr_g(xx)) == len(FITUR) and x_lr_g(xx)[NH:] == [math.log1p(1.0), 1.0] and HU.x_lr_h is x_lr_g
    # 7b. A1: ub.AKHIR ditambal ke tanggal lebih awal tetap memberi deret utuh lewat cuaca_penuh; tanpa cuaca_penuh gagal (assert pembeda)
    import tempfile
    a0, a1, jl, al = ub.AWAL, ub.AKHIR, ub.jalur, HU.AKHIR_LATIH
    with tempfile.TemporaryDirectory() as td:
        try:
            ub.AWAL, ub.AKHIR = dt.date(2020, 1, 1), dt.date(2020, 1, 20)
            HU.AKHIR_LATIH = ub.AKHIR
            hr = [(dt.date(2020, 1, 1) - dt.date(1970, 1, 1)).days * 86400 + 86400 * i for i in range(20)]
            resp = {"utc_offset_seconds": 0, "daily": {"time": hr, "precipitation_sum": [1.0] * 20, "soil_moisture_7_to_28cm_mean": [0.3] * 20},
                    "hourly": {"time": hr, "precipitation": [0.5] * 20}}
            ub.jalur = lambda la, lo: os.path.join(td, f"{la}_{lo}.json.gz")
            with gzip.open(ub.jalur(1, 2), "wt") as f:
                json.dump(resp, f)
            with HU.tambal_ub(dt.date(2020, 1, 10)):
                try:
                    MK.muat_cuaca([(1, 2)])
                    raise AssertionError("tanpa cuaca_penuh seharusnya gagal")
                except ValueError as ex:
                    assert "deret harian tidak utuh" in str(ex)
                assert len(cuaca_penuh([(1, 2)], dt.date(2020, 1, 10))[(1, 2)]["p"]) == 20 and ub.AKHIR == dt.date(2020, 1, 10)
        finally:
            ub.AWAL, ub.AKHIR, ub.jalur, HU.AKHIR_LATIH = a0, a1, jl, al
    HU._GRRR_DIPASANG = False
    HU._tolak(terpasang, "pasang() belum dipanggil")
    HU._tolak(lambda: latih(), "pasang() belum dipanggil")
    HU._GRRR_DIPASANG = True
    HU._tolak(lambda: latih(True, " "), "butuh alasan")
    assert int(Q_LO * (ULANG - 1)) == 39 and int(Q_HI * (ULANG - 1)) == 9959 and 2.5 / 6 >= 0.4
    # 8. model: sinyal hanya di g_rasio -> M0G dan M3G lebih baik
    rr = random.Random(7)
    Xs, ys, th = [], [], []
    for i in range(1500):
        v = [rr.random() for _ in FITUR]
        Xs.append(v); ys.append(1 if rr.random() < 0.03 + 0.4 * (v[NH] > 0.8) else 0); th.append(2022 + i % 2)
    TR_, VA_ = {"X": Xs[:1000], "y": ys[:1000]}, {"X": Xs[1000:], "y": ys[1000:], "tahun": th[1000:]}
    jenis, mod, _, lls = cocok(TR_, VA_, grid=[(2, 0.1)], pohon_maks=20)
    assert set(mod) == set(MODEL) and lls["M0G"] < lls["M0"] and lls["M3G"] < lls["M3"], lls
    assert mod["M3G"]["aktif"] == aktif("M3G")
    Bs = HU._toy_B()
    Bs["X"] = [[0.0] * len(FITUR) for _ in Bs["y"]]
    sempurna = [0.9 if v else 0.03 for v in Bs["y"]]
    klimk = [sum(Bs["y"]) / len(Bs["y"])] * len(Bs["y"])
    Pm = {"M0": klimk, "M3": klimk, "M0G": sempurna, "M3G": klimk}
    pen = rangkum(Bs, Pm, klimk, ulang=200)
    assert set(pen["kontras"]) == {"M3G-M3", "M0G-M0"} and HU.vonis_kontras(pen["kontras"]["M0G-M0"])["vonis"] == "LULUS"
    assert HU.vonis_kontras(pen["kontras"]["M3G-M3"])["vonis"] == "TIDAK LULUS" and set(pen["per_tahun_deskriptif"]) == {"2026", "2027"}
    rk, rkk = pen["kontras"]["M0G-M0"], {"waspada": {"nilai": 0.05, "ci": [0.01, 0.09]}}
    assert vonis_grrr(rk, rkk, 0.01, None, None)["vonis"] == "LULUS" + EKOR                  # veto 2025 lolos
    for d25 in (0.0, -0.02, None):                                                             # veto 2025: LULUS turun
        x = vonis_grrr(rk, rkk, d25, None, None)
        assert x["vonis_gabungan"] == "TIDAK MEYAKINKAN" and x["veto_2025"], d25
    assert vonis_grrr(pen["kontras"]["M3G-M3"], rkk, -0.1, None, None)["vonis_gabungan"] == "TIDAK LULUS"   # veto tidak menyentuh TIDAK LULUS
    assert vonis_grrr(rk, rkk, 0.01, 0.011, 0.04)["daya_rendah"] and not vonis_grrr(rk, rkk, 0.01, 0.009, 0.04)["daya_rendah"]
    assert ", PEKA LABEL" in vonis_grrr(rk, {"waspada": {"nilai": -0.01, "ci": [-0.05, 0.02]}}, 0.01, None, None)["vonis"]
    dm = HU.mde_h(Bs, Pm, target=30, ulang=30, ulangan=4)
    assert set(dm) >= {"M3G-M3", "M0G-M0"} and abs(dm["z"] - 2.652) < 0.01
    # 9. sekunder hindcast pada data mainan: kontras hindcast ada, baris tanpa lead dibuang
    Fh = {"hind": {str(L): {"r": {k: [0.5] * 800 for k in set(Bs["kab"])}, "p": {k: [0.0] * 800 for k in set(Bs["kab"])}} for L in LEAD}}
    Fh["hind"]["7"]["r"][Bs["kab"][0]] = [None] * 800
    kd = {m: mod[m] for m in MODEL}
    s2_ = sekunder(kd, Bs, Fh, klimk)
    assert s2_["n"] == sum(1 for k in Bs["kab"] if k != Bs["kab"][0]) and "M0G_h10-M0" in s2_["kontras"] and "hindcast_1" in s2_["auc_g_rasio"], s2_.get("n")
    # 10. gerbang/sia/buka pada data mainan (repo git sementara), label asli dibekukan per jendela
    simpan = (data_uji, prediksi_uji, hash_jendela, sekunder, DIBI_ASLI, HU.KELUAR, HU.SIDIK_JEJAK, HU.JEJAK_REPO, HU.sidik_penuh, HU.cek_kelengkapan,
              HU.SIA_DARI, HU.BUKA_DARI)
    with tempfile.TemporaryDirectory() as tmp:
        try:
            repo = os.path.join(tmp, "repo")
            os.makedirs(repo)
            git = lambda *a: subprocess.run(["git", "-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True)
            git("init", "-q")
            open(os.path.join(repo, "x.txt"), "w").write("x"); git("add", "x.txt"); git("commit", "-q", "-m", "awal")
            HU.KELUAR, HU.SIDIK_JEJAK, HU.JEJAK_REPO = tmp, os.path.join(repo, "model_kab_grrr.sidik"), repo
            HU.sidik_penuh, HU.cek_kelengkapan = (lambda k: "x"), (lambda k, a: None)
            DIBI_ASLI = os.path.join(tmp, "dibi.json")
            json.dump(bl, open(DIBI_ASLI, "w"))
            HU._tolak(lambda: HU.gerbang("sia", dt.date(2026, 11, 1)), "baru boleh")
            kd = {"sidik": "x", "sidik_kriteria": sidik_kriteria(), "mde": None}
            json.dump(kd, open(HU.J("kandidat.json"), "w"))
            HU._tolak(lambda: HU.gerbang("sia", DARI), "tidak terlacak")
            HU.tambah_jejak({"jenis": "latih", "sidik": "x", "sidik_kriteria": kd["sidik_kriteria"]})
            git("add", "model_kab_grrr.sidik"); git("commit", "-q", "-m", "latih")
            data_uji = lambda kand, jendela, akhir, label: (Bs, {"pengecualian": {}, "F": {}})
            prediksi_uji = lambda kand, B: (Pm, klimk, Pm)
            hash_jendela = lambda D, a, b: {"x": 1}
            sekunder = lambda kand, B, F, ref: {"n": 0, "kontras": {"M0G_h3-M0": {"waspada": {"nilai": 0.01}, "bss": {"nilai": 0.002}}}}
            HU.SIA_DARI = HU.BUKA_DARI = dt.date(2020, 1, 1)
            with contextlib.redirect_stdout(io.StringIO()):
                sia()
            sv = json.load(open(HU.J("sia.json")))["vonis"]
            assert sv["M0G-M0"]["vonis"] == "lanjut" and sv["M3G-M3"]["vonis"] == "tidak terbukti"
            assert [r[3] for r in json.load(open(HU.J("label_A.json")))["baris"]] == ["2024-01-01"]   # hanya jendela A
            HU._tolak(lambda: HU.gerbang("sia", DARI), "sudah dimulai")
            HU._tolak(lambda: HU.gerbang("buka", DARI), "beda dari HEAD")
            git("add", "model_kab_grrr.sidik"); git("commit", "-q", "-m", "sia")
            with contextlib.redirect_stdout(io.StringIO()):
                buka()
            v = json.load(open(HU.J("buka.json")))["vonis"]
            assert v["M0G-M0"]["vonis"] == "TIDAK MEYAKINKAN" + EKOR and v["M0G-M0"]["veto_2025"], v   # mainan tanpa 2025: veto
            assert v["M3G-M3"]["vonis"] == "tidak terbukti" + EKOR and v["M0G-M0"]["hindcast_deskriptif"] == {"lead_3": {"dets_waspada": 0.01, "dbss": 0.002}}
            assert [r[3] for r in json.load(open(HU.J("label_B.json")))["baris"]] == ["2025-06-01"]
            HU._tolak(lambda: HU.gerbang("buka", DARI), "sudah dimulai")
            HU._tolak(lambda: latih(), "sia/buka sudah dimulai")
        finally:
            (data_uji, prediksi_uji, hash_jendela, sekunder, DIBI_ASLI, HU.KELUAR, HU.SIDIK_JEJAK, HU.JEJAK_REPO, HU.sidik_penuh, HU.cek_kelengkapan,
             HU.SIA_DARI, HU.BUKA_DARI) = simpan
    assert HU.SIA_DARI == HU.BUKA_DARI == DARI and HU.KELUAR == KELUAR and HU.SAMPEL.startswith(HULU_DIR) and HU.J("x") == os.path.join(KELUAR, "x") and HU.DIBI_TGL == DIBI_ASLI
    print("uji grrr: OK")


if __name__ == "__main__":
    pasang()
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m == "uji":
        uji()
    elif m == "fitur":
        fitur()
    elif m in ("latih", "sia", "buka"):
        ul = "--ulang" in sys.argv
        alasan = sys.argv[sys.argv.index("--ulang") + 1] if ul and len(sys.argv) > sys.argv.index("--ulang") + 1 else None
        {"latih": lambda: latih(ul, alasan), "sia": sia, "buka": buka}[m]()
    else:
        sys.exit(__doc__)
