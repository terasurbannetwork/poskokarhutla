"""Penilai prospektif TERPISAH + metrik pendamping CAMPUR (PRAREG-CAMPUR §5.3-5.3d, §5.5, §7). Tidak menyunting model_kab_campur.py.

Pakai:  python3 scripts/banjir/model_kab_campur_nilai.py uji
        python3 scripts/banjir/model_kab_campur_nilai.py l1     bacaan awal >= 2027-05-07 (BUKAN buka: tanpa .mulai, tanpa memutuskan)
        python3 scripts/banjir/model_kab_campur_nilai.py l2     vonis >= 2027-06-29 (menulis penanda buka.mulai atomik SEBELUM metrik pertama)
sha256 berkas ini dikunci di .sidik oleh model_kab_campur.sidik_penuh (BERKAS_SIDIK['wajib']).
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import model_kab_campur as C  # noqa: E402

L1_PALING_CEPAT = dt.date(2027, 5, 7)   # 7 hari sesudah 2027-04-30
ALARM_PERSEN = (0.01, 0.03)


def tabel(alarm, y):
    a = sum(1 for p, o in zip(alarm, y) if p and o)
    b = sum(1 for p, o in zip(alarm, y) if p and not o)
    c = sum(1 for p, o in zip(alarm, y) if not p and o)
    return a, b, c, len(y) - a - b - c


def pod_pofd_bias(alarm, y):
    a, b, c, d = tabel(alarm, y)
    H = a / (a + c) if a + c else None
    F = b / (b + d) if b + d else None
    return H, F, ((a + b) / (a + c) if a + c else None)


def sedi(H, F):
    """Ferro & Stephenson 2011; None bila H atau F di {0,1} (tak terdefinisi)."""
    if H is None or F is None or min(H, F) <= 0 or max(H, F) >= 1:
        return None
    lf, lh, l1f, l1h = math.log(F), math.log(H), math.log(1 - F), math.log(1 - H)
    return (lf - lh - l1f + l1h) / (lf + lh + l1f + l1h)


def fbeta_simetris(alarm, y, kab, e, beta=0.8):
    """Alarm hari e kena bila ada kejadian di e-1..e+1 (presisi); kejadian hari d tertangkap bila ada alarm di d-1..d+1 (recall)."""
    A, Y = {}, {}
    for a_, y_, k, d in zip(alarm, y, kab, e):
        A[(k, d)], Y[(k, d)] = bool(a_), bool(y_)
    near = lambda D, k, d: any(D.get((k, d + s), False) for s in (-1, 0, 1))
    na = sum(1 for (k, d), v in A.items() if v)
    ne = sum(1 for (k, d), v in Y.items() if v)
    pr = sum(1 for (k, d), v in A.items() if v and near(Y, k, d)) / na if na else None
    rc = sum(1 for (k, d), v in Y.items() if v and near(A, k, d)) / ne if ne else None
    if not pr or not rc:
        return {"presisi": pr, "recall": rc, "fbeta": 0.0 if (pr is not None and rc is not None) else None}
    b2 = beta * beta
    return {"presisi": pr, "recall": rc, "fbeta": (1 + b2) * pr * rc / (b2 * pr + rc)}


def auc_pr(skor, y):
    """Presisi rata-rata (area presisi-recall, langkah per positif); seri skor diproses sebagai satu kelompok."""
    n_pos = sum(y)
    if not n_pos:
        return None
    urut = sorted(range(len(skor)), key=lambda i: -skor[i])
    tp = fp = 0
    ap, i = 0.0, 0
    while i < len(urut):
        j = i
        while j < len(urut) and skor[urut[j]] == skor[urut[i]]:
            j += 1
        dtp = sum(y[urut[k]] for k in range(i, j))
        tp, fp = tp + dtp, fp + (j - i - dtp)
        ap += dtp / n_pos * (tp / (tp + fp))
        i = j
    return ap


def recall_at_k(skor, y, kab, e, k=3):
    """Tiap minggu: k kab berskor tertinggi; kena bila salah satu punya y. -> porsi minggu berkejadian yang tertangkap."""
    mg = {}
    for s, o, kb, d in zip(skor, y, kab, e):
        mg.setdefault(d // 7, []).append((s, o, kb))
    ada = kena = 0
    for v in mg.values():
        if any(o for _, o, _ in v):
            ada += 1
            kena += any(o for _, o, _ in sorted(v, key=lambda t: -t[0])[:k])
    return kena / ada if ada else None


def nilai_ekonomi(a, o, H, F):
    """Richardson 2000: V = (min(a,o) - [a(F(1-o)+H o) + o(1-H)]) / (min(a,o) - o a)."""
    if H is None or F is None:
        return None
    pembagi = min(a, o) - o * a
    return None if abs(pembagi) < 1e-15 else (min(a, o) - (a * (F * (1 - o) + H * o) + o * (1 - H))) / pembagi


TINGKAT = {"T1": ("waspada", None), "T2": ("siaga", None), "T3": (None, 0.03), "T4": (None, 0.01)}
RASIO_AL = (0.02, 0.10, 0.30)


def pendamping(B, P, ns, ref="klim"):
    """Metrik pendamping tanpa CI & tanpa gerbang: SEDI/bias di Waspada, Siaga, 1%, 3%; AUC-PR; recall@3; F-beta; V cost-loss untuk model, klim, aturan."""
    import model_kab as MK
    y, n = B["y"], len(B["y"])
    laju = sum(y) / n
    hasil = {"alarm": {}, "auc_pr": {m: auc_pr(P[m], y) for m in P}, "recall_at_3": {m: recall_at_k(P[m], y, B["kab"], B["e"]) for m in P}, "nilai_ekonomi": {}}
    tingkat = {"waspada": ns["waspada"], "siaga": ns["siaga"], "1%": int(0.01 * n), "3%": int(0.03 * n)}
    for nm, na in tingkat.items():
        hasil["alarm"][nm] = {}
        for m in P:
            al = MK.alarm_sebanyak(P[m], na)
            H, F, bias = pod_pofd_bias(al, y)
            hasil["alarm"][nm][m] = {"pod": H, "pofd": F, "bias": bias, "sedi": sedi(H, F), "fbeta": fbeta_simetris(al, y, B["kab"], B["e"])}
    for tg, nm in (("T1", "waspada"), ("T2", "siaga"), ("T3", "3%"), ("T4", "1%")):
        hasil["nilai_ekonomi"][tg] = {m: {str(a): nilai_ekonomi(a, laju, hasil["alarm"][nm][m]["pod"], hasil["alarm"][nm][m]["pofd"]) for a in RASIO_AL} for m in P}
    return hasil


def mde_campur(B, p_model, p_klim, target=200):
    """§5.5: pakai kerangka model_kab_debit.mde (5 biji x 100 ulangan di pemanggil bila perlu). -> dict atau None."""
    return C.MKD.mde(B, p_klim, p_model, target=target)


# ---------------------------------------------------------------- penilai prospektif (L1 baca awal, L2 vonis)
def periksa_sidik(mode, hari_ini=None):
    """Verifikasi kandidat.json terhadap sidik di HEAD dan T dari origin/main. Menolak sebelum tanggal paling cepat. -> (kand, T)."""
    hari_ini = hari_ini or dt.date.today()
    paling = L1_PALING_CEPAT if mode == "l1" else C.BUKA_PALING_CEPAT
    if hari_ini < paling:
        sys.exit(f"{mode} paling cepat {paling}; hari ini {hari_ini}")
    kp = C.J("kandidat.json")
    if not os.path.exists(kp):
        sys.exit("kandidat.json belum ada: `latih` + `sidik` belum dijalankan")
    kand = json.load(open(kp))
    isi = {k: v for k, v in kand.items() if k not in ("sidik",)}
    if kand.get("sidik") != C.sidik_penuh(isi):
        sys.exit("sidik tidak cocok dengan kode/data saat ini: ditolak")
    T = C.tanggal_T()
    C.gerbang_buka(C.awal_efektif(T), T, hari_ini, kering=(mode == "l1"))
    return kand, T


def jalankan(mode):
    kand, T = periksa_sidik(mode)
    if mode == "l2":
        C.tulis_mulai("buka", kand["sidik"])        # atomik, SEBELUM metrik pertama
    ctx = C.konteks_nyata()                         # data nyata dan label susulan (tanggal sasaran >= T+1) dari adaptor model_kab_campur
    raise C.DataBelumAda(f"{mode}: baris prospektif sampai {C.PROSPEKTIF_AKHIR} dibangun adaptor prospektif (arsip P2) yang belum ada")


def uji():
    ya = [1, 0, 0, 1, 0, 0, 0, 0, 1, 0]
    al = [1, 1, 0, 0, 0, 0, 0, 0, 1, 0]
    assert tabel(al, ya) == (2, 1, 1, 6)
    H, F, bias = pod_pofd_bias(al, ya)
    assert abs(H - 2 / 3) < 1e-12 and abs(F - 1 / 7) < 1e-12 and abs(bias - 1.0) < 1e-12
    s = sedi(H, F)
    ref = (math.log(F) - math.log(H) - math.log(1 - F) + math.log(1 - H)) / (math.log(F) + math.log(H) + math.log(1 - F) + math.log(1 - H))
    assert abs(s - ref) < 1e-12 and 0 < s < 1 and sedi(1.0, 0.1) is None and sedi(0.5, 0.0) is None
    assert sedi(0.9, 0.05) > sedi(0.5, 0.05) and abs(sedi(0.5, 0.5)) < 1e-12                                     # tanpa keterampilan -> 0
    kab, e = ["k"] * 10, list(range(10))
    f = fbeta_simetris([0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], kab, e)   # alarm hari 1, kejadian hari 0: kena kedua arah
    assert f["presisi"] == 1.0 and f["recall"] == 1.0 and abs(f["fbeta"] - 1.0) < 1e-12
    f2 = fbeta_simetris([0, 0, 0, 1, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], kab, e)   # jarak 3 hari: tidak kena
    assert f2["presisi"] == 0.0 and f2["recall"] == 0.0 and f2["fbeta"] == 0.0
    f3 = fbeta_simetris([0, 1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0, 0, 0, 0, 0], ["k"] * 10, e)   # selisih 1: presisi kena, recall kena (alarm di d-1)
    assert f3["presisi"] == 1.0 and f3["recall"] == 1.0
    assert abs(auc_pr([0.9, 0.8, 0.1, 0.05], [1, 0, 1, 0]) - (0.5 * 1.0 + 0.5 * (2 / 3))) < 1e-12 and auc_pr([1, 2], [0, 0]) is None
    assert auc_pr([.5, .5, .5, .5], [1, 0, 0, 0]) == 0.25                                                    # seri satu kelompok = laju dasar
    assert recall_at_k([.9, .1, .2, .8], [0, 0, 1, 1], ["a", "b", "c", "d"], [0, 0, 1, 1], k=1) == 0.0       # satu minggu, top-1 (a) tanpa kejadian
    mg = recall_at_k([.9, .1, .8, .2], [0, 1, 1, 0], ["a", "b", "c", "d"], [0, 0, 8, 8], k=1)
    assert mg == 0.5
    # nilai ekonomi: prakiraan sempurna = 1, tanpa keterampilan (H=F) <= 0, klimatologi/selalu-alarm = 0
    o = 0.05
    assert abs(nilai_ekonomi(0.1, o, 1.0, 0.0) - 1.0) < 1e-12 and nilai_ekonomi(0.1, o, 0.4, 0.4) < 0
    assert abs(nilai_ekonomi(0.1, o, 0.0, 0.0)) < 1e-12 and nilai_ekonomi(0.1, o, None, 0.0) is None            # tak pernah alarm = acuan 0 (a > o)
    # penilai menolak sebelum tanggal paling cepat dan tanpa kandidat; L1 bukan buka (tanpa .mulai)
    C._tolak(lambda: periksa_sidik("l2", dt.date(2027, 6, 28)), "paling cepat")
    C._tolak(lambda: periksa_sidik("l1", dt.date(2027, 5, 6)), "paling cepat")
    C._tolak(lambda: periksa_sidik("l2", dt.date(2027, 7, 1)), "kandidat.json belum ada")
    import inspect
    assert "if mode == \"l2\"" in inspect.getsource(jalankan)
    print("ok model_kab_campur_nilai")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m == "uji":
        uji()
    elif m in ("l1", "l2"):
        try:
            jalankan(m)
        except C.DataBelumAda as e:
            sys.exit(f"{m} ditolak, data belum ada: {e}")
    else:
        sys.exit(__doc__)
