"""Koreksi diri bulanan prakiraan banjir (BNJ) -> public/prediksi/data/kalibrasi_aktif.json + koreksi_riwayat.jsonl.

Sebulan sekali: pasang kalibrasi isotonik (PAV, dari kalibrasi.py) pada jendela bergulir hari matang, nilai pada holdout
waktu (HOLDOUT_HARI hari matang terakhir, tak ikut memasang), bandingkan dengan kalibrasi AKTIF (belum ada = peluang mentah).
Ganti HANYA bila selisih Brier holdout (kandidat - aktif) dengan bootstrap blok per hari sasaran (1000 ulangan, biji tetap)
punya persentil 95% < 0, yaitu kandidat lebih baik dengan yakin; selain itu yang lama dipertahankan (fail-closed).
Holdout wajib >= 20 kab-hari kejadian di >= 5 hari sasaran berbeda. Pasangan yang peluangnya fallback `lv` (arsip tanpa ps,
bukan peluang) disaring sebelum belah. Tiap keputusan (dipakai/ditolak/menunggu, dengan jumlah_hari_positif dan batas
bootstrap) ditambahkan ke koreksi_riwayat.jsonl (append-only).
Label matang: HANYA hari matang DIBI (sasaran <= sampai - 45 hari, terisi susulan); logbook Pusdalops
(public/data/logbook_kejadian.json) hanya menambah kejadian pada hari matang yang sama, tidak pernah menentukan hari sendiri.
Arsip tidak disentuh dan skor prospektif (nilai.py) tetap memakai peluang asli: koreksi hanya berlaku ke prakiraan baru
lewat terbit.py. Daftar kab hanya lewat dasar.py (kota.json milik cuaca-udara).

Pakai:  python3 scripts/prediksi/koreksi.py          (satu kali per bulan; jalan ulang di bulan yang sama keluar tanpa kerja)
        python3 scripts/prediksi/koreksi.py uji
"""
import json, os, random, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D
import nilai as N
from kalibrasi import pav, terapkan

KODE = "BNJ"
DIBI_MATANG = 45
HOLDOUT_HARI, FIT_HARI = 30, 120
N_MIN, FIT_HARI_MIN, POS_FIT_MIN, POS_UJI_MIN, HARI_POS_UJI_MIN = 30, 14, 10, 20, 5
BOOT_ULANG, BOOT_BIJI = 1000, 1
JENIS_LOGBOOK = {"banjir", "banjir_bandang", "banjir_longsor"}  # rob tidak masuk: ROB bukan BNJ
RIWAYAT, AKTIF = "koreksi_riwayat.jsonl", "kalibrasi_aktif.json"


def label(akar, cari):
    """-> (am, akhir): am = {tanggal matang DIBI: {"j": "final", "kab": {id: 1}}}; logbook menambah kejadian pada hari itu saja."""
    am, akhir = N.amatan_dibi(akar, cari, KODE, DIBI_MATANG)
    lb = D.baca(os.path.join(akar, "public", "data", "logbook_kejadian.json"))
    for r in (lb or {}).get("kejadian", []):
        t = r.get("mulai") or (r.get("terlihat") or [None])[0]
        if r["jenis"] in JENIS_LOGBOOK and t in am and t >= lb["dari"] and (i := cari(r["prov"], r["kab"])):
            am[t]["kab"][i] = 1
    return am, akhir


def brier(ps, os_):
    return sum((p - o) ** 2 for p, o in zip(ps, os_)) / len(ps)


def boot_p95(uji, skor_a, skor_b):
    """Persentil 95% selisih Brier (kandidat - aktif), bootstrap blok per hari sasaran."""
    per = {}
    for r, a, b in zip(uji, skor_a, skor_b):
        x = per.setdefault(r[4], [0.0, 0])
        x[0] += (b - r[7]) ** 2 - (a - r[7]) ** 2
        x[1] += 1
    blok, rnd = list(per.values()), random.Random(BOOT_BIJI)
    d = []
    for _ in range(BOOT_ULANG):
        b = rnd.choices(blok, k=len(blok))
        d.append(sum(x[0] for x in b) / sum(x[1] for x in b))
    d.sort()
    return d[int(0.95 * BOOT_ULANG) - 1]


def belah(rows):
    tgl = sorted({r[4] for r in rows})
    uji_t = set(tgl[-HOLDOUT_HARI:])
    fit_t = set(tgl[:-HOLDOUT_HARI][-FIT_HARI:])
    return [r for r in rows if r[4] in fit_t], [r for r in rows if r[4] in uji_t], len(fit_t)


def putuskan(rows, aktif):
    """rows = pasangan matang satu (BNJ, tenggang); aktif = peta kalibrasi aktif atau None. -> keputusan (peta hanya bila dipakai)."""
    n_lv = sum(r[11] != "ps" for r in rows)
    rows = [r for r in rows if r[11] == "ps"]
    fit, uji, hf = belah(rows)
    out = {"n_fit": len(fit), "n_uji": len(uji), "hari_fit": hf, "n_lv_dibuang": n_lv}
    pf, pu = sum(r[7] for r in fit), sum(r[7] for r in uji)
    hp = len({r[4] for r in uji if r[7]})
    out["jumlah_hari_positif"] = hp
    if len(fit) < N_MIN or hf < FIT_HARI_MIN or len(uji) < N_MIN or pf < POS_FIT_MIN or pu < POS_UJI_MIN or hp < HARI_POS_UJI_MIN:
        return {**out, "status": "menunggu", "alasan": f"butuh fit >= {N_MIN} pasangan, {FIT_HARI_MIN} hari, {POS_FIT_MIN} kejadian; holdout >= {N_MIN} pasangan, {POS_UJI_MIN} kejadian di >= {HARI_POS_UJI_MIN} hari"}
    peta = pav([r[6] for r in fit], [r[7] for r in fit])
    o = [r[7] for r in uji]
    s_lama = [terapkan(aktif, r[6]) if aktif else r[6] for r in uji]
    s_baru = [terapkan(peta, r[6]) for r in uji]
    bl, bb = round(brier(s_lama, o), 5), round(brier(s_baru, o), 5)
    p95 = round(boot_p95(uji, s_lama, s_baru), 5)
    ok = p95 < 0
    return {**out, "status": "dipakai" if ok else "ditolak", "brier_aktif": bl, "brier_baru": bb, "boot_p95": p95,
            "alasan": "selisih Brier holdout negatif dengan yakin (bootstrap p95 < 0)" if ok else "holdout tidak lebih baik dengan yakin: kalibrasi aktif dipertahankan",
            "peta": peta if ok else None}


def jalan(kini=None, akar=D.AKAR, folder=None, data=None, am=None):
    """Satu putaran bulanan. -> daftar keputusan, atau None bila bulan ini sudah dijalankan."""
    kini, data = kini or D.hari_ini(), data or D.DATA
    rj = os.path.join(data, RIWAYAT)
    if os.path.exists(rj) and any(json.loads(b)["bulan"] == kini[:7] for b in open(rj) if b.strip()):
        return None
    if am is None:
        am, _ = label(akar, D.pencari(D.kab(akar)))
    entri = [e for e in D.semua_arsip(folder) if e["k"] == KODE]
    pas = N.pasangan(entri, {KODE: am}, kini) if entri and am else []
    st = D.baca(os.path.join(data, AKTIF), {"versi": 0, "setel": None, "grup": {}})
    hasil = []
    for n in (1, 2, 3):
        g = f"{KODE}|1|{n}"
        d = putuskan([x for x in pas if x[2] == n], (st["grup"].get(g) or {}).get("peta"))
        hasil.append({"bulan": kini[:7], "tanggal": kini, "grup": g, **{k: v for k, v in d.items() if k != "peta"}})
        if d["status"] == "dipakai":
            st["grup"][g] = {"peta": d["peta"], "sejak": kini, "versi": st["versi"] + 1}
    if any(h["status"] == "dipakai" for h in hasil):
        st["versi"] += 1
        st["setel"] = kini
    os.makedirs(data, exist_ok=True)
    with open(rj, "a") as f:
        for h in hasil:
            f.write(json.dumps(h, ensure_ascii=False, separators=(",", ":")) + "\n")
    D.simpan(os.path.join(data, AKTIF), {**st, "dicek": kini})
    return hasil


def uji():
    from datetime import date, timedelta
    t0 = date(2026, 1, 1)
    kab = [f"11{k:02d}" for k in range(5)]
    tg = lambda d: (t0 + timedelta(days=d)).isoformat()

    def sintetis(ps_ada=True):
        """arsip BNJ 100 hari terbit + label: kab 0,1 selalu banjir (frekuensi 0,4); model terlalu yakin (0,8)."""
        arsip, am = [], {}
        for d in range(100):
            t = tg(d)
            arsip.append({"t": t, "k": KODE, "kol": ["lv", "ps"], "hari": [D.geser(t, i) for i in (1, 2, 3)],
                          "kab": {k: [[1, 0.8 if ps_ada else None]] * 3 for k in kab}})
            for n in (1, 2, 3):
                am[D.geser(t, n)] = {"j": "final", "kab": {k: 1 for k in kab[:2]}}
        return arsip, am
    with tempfile.TemporaryDirectory() as tmp:
        folder, data = os.path.join(tmp, "arsip"), os.path.join(tmp, "data")
        os.makedirs(folder)
        arsip, am = sintetis()
        with open(os.path.join(folder, "2026-01.jsonl"), "w") as f:
            f.writelines(json.dumps(e) + "\n" for e in arsip)
        sebelum = open(os.path.join(folder, "2026-01.jsonl")).read()
        kini = "2026-04-30"
        # hari belum matang tidak dipakai: label hanya sampai 1 Maret -> sasaran sesudahnya tak membentuk pasangan
        pas = N.pasangan(arsip, {KODE: {s: v for s, v in am.items() if s <= "2026-03-01"}}, kini)
        assert pas and max(x[4] for x in pas) <= "2026-03-01" and all(x[11] == "ps" for x in pas), "hari belum matang dipakai"
        # arsip tanpa ps (fallback lv) tidak jadi bahan koreksi: ditandai "lv", disaring, hasil menunggu
        lv = N.pasangan(sintetis(False)[0], {KODE: am}, kini)
        assert lv and all(x[11] == "lv" for x in lv)
        r = putuskan(lv, None)
        assert r["status"] == "menunggu" and r["n_fit"] == 0 and r["n_lv_dibuang"] == len(lv), r
        # model terlalu yakin: kalibrasi pertama dipakai (lawan mentah), versi 1
        h = jalan(kini, folder=folder, data=data, am=am)
        assert [x["status"] for x in h] == ["dipakai"] * 3 and h[0]["boot_p95"] < 0 and h[0]["brier_baru"] < h[0]["brier_aktif"], h
        assert open(os.path.join(folder, "2026-01.jsonl")).read() == sebelum, "arsip berubah"
        n_baris = len(open(os.path.join(data, RIWAYAT)).readlines())
        assert jalan("2026-04-30", folder=folder, data=data, am=am) is None and len(open(os.path.join(data, RIWAYAT)).readlines()) == n_baris
        aktif1 = json.load(open(os.path.join(data, AKTIF)))
        assert aktif1["versi"] == 1 and aktif1["setel"] == kini
        # bulan berikut: kalibrasi aktif sudah pas, kandidat identik -> selisih 0, bukan < 0: ditolak, yang lama bertahan
        h2 = jalan("2026-05-30", folder=folder, data=data, am=am)
        assert all(x["status"] == "ditolak" and "jumlah_hari_positif" in x for x in h2), h2
        aktif2 = json.load(open(os.path.join(data, AKTIF)))
        assert aktif2["grup"] == aktif1["grup"] and aktif2["versi"] == 1 and aktif2["setel"] == kini, "yang lama harus bertahan"
        assert len(open(os.path.join(data, RIWAYAT)).readlines()) == n_baris + 3, "tiap keputusan tercatat"
        assert open(os.path.join(folder, "2026-01.jsonl")).read() == sebelum
    # fit: 60 hari, 20 kab, p 0,5, kejadian 0,2 -> kandidat memetakan 0,5 ke 0,2; aktif = mentah (0,5)
    def baris(d, n_pos):
        return [["BNJ", 1, 1, "final", tg(d), f"{k:04d}", 0.5, int(k < n_pos), 0, 0, None, "ps"] for k in range(20)]
    fit = [x for d in range(60) for x in baris(d, 4)]
    # kandidat lebih baik hanya karena derau: kejadian terkumpul, untung besar di 3 hari, rugi besar di 2 hari, nol di 25 hari
    # (7 dari 20 kejadian = selisih 0): rata-rata selisih < 0 tetapi tak yakin
    pola = [0] * 3 + [14] * 2 + [7] * 25
    uji_derau = [x for d, n in enumerate(pola) for x in baris(60 + d, n)]
    r = putuskan(fit + uji_derau, None)
    assert r["brier_baru"] < r["brier_aktif"] and r["status"] == "ditolak" and r["peta"] is None and r["boot_p95"] >= 0, r
    # pembeda: kejadian merata 0,2 di tiap hari uji -> kandidat lebih baik dengan yakin -> dipakai
    r = putuskan(fit + [x for d in range(30) for x in baris(60 + d, 4)], None)
    assert r["status"] == "dipakai" and r["boot_p95"] < 0 and r["jumlah_hari_positif"] == 30, r
    # kalibrasi yang lebih buruk ditolak: kandidat (dari fit) lawan aktif hati-hati yang lebih cocok dengan holdout
    r = putuskan(fit + [x for d in range(30) for x in baris(60 + d, 14)], None)
    assert r["status"] == "ditolak" and r["brier_baru"] > r["brier_aktif"], r
    # holdout dengan kejadian di < 5 hari = menunggu
    r = putuskan(fit + [x for d in range(30) for x in baris(60 + d, 20 if d < 2 else 0)], None)
    assert r["status"] == "menunggu" and r["jumlah_hari_positif"] == 2, r
    assert putuskan((fit + uji_derau)[:20], None)["status"] == "menunggu"
    print("koreksi.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif len(sys.argv) == 1:
        h = jalan()
        print("koreksi: sudah dijalankan bulan ini" if h is None else "koreksi: " + ", ".join(f"{x['grup']} {x['status']}" for x in h))
    else:
        print(__doc__)
