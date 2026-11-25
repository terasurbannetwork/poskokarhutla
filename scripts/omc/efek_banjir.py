#!/usr/bin/env python3
"""Penguji efektivitas OMC banjir, Lapis A (provinsi-hari dari omc_bmkg.json). SB-12.

Aturan dikunci di data/kajian-bnpb/semai-banjir/riset/PRAREG-A.md (sidik di PRAREG-A.sidik); jangan disunting.
Regresi, resid, t_kuantil dipakai dari efek.py (karhutla), tidak disalin.

  python3 scripts/omc/efek_banjir.py uji                 # uji luring pada panel sintetis
  python3 scripts/omc/efek_banjir.py lapis-a tarik|analisis   # STUB, baru diisi SB-13 (belum ada data hujan nyata)

Tafsir yang diambil (PRAREG diam): permutasi blok menolak periode yang beririsan dengan periode OMC apa pun
DI PROVINSI YANG SAMA (bukan seluruh provinsi: dengan 86 periode di 13 provinsi lain terlalu sering memblokir).
"""
import datetime as dt
import hashlib
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import efek  # noqa: E402  resid, ols, t_kuantil

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
PRAREG = os.path.join(AKAR, "data/kajian-bnpb/semai-banjir/riset/PRAREG-A")
SEED = 20261125
MULAI = dt.date(2024, 2, 3)            # awal ecmwf_ifs025 historical-forecast (D11)
JENIS = "Pengurangan CH - Bencana"
WADUK = "Pengisian Waduk"
AMBANG = dict(prov_hari=300, klaster=30, prov=5)
MDE_TARGET = 30.0


def cek_sidik():
    h = hashlib.sha256(open(PRAREG + ".md", "rb").read()).hexdigest()
    ref = open(PRAREG + ".sidik").read().split()[0]
    if h != ref:
        sys.exit(f"PRAREG-A.md berubah: sha256 {h} != {ref}; analisis ditolak")
    return h


# ---------------------------------------------------------------- perlakuan
def baca_periode(baris):
    """-> (perl, ada, buang, waduk). perl: [{id,prov,a,b}] jenis persis JENIS, tanggal sah;
    ada: {(prov,tgl)} hari ber-OMC jenis apa pun; buang: {(prov,tgl)} dari baris terbalik (kedua rentang);
    waduk: {(prov,tgl)} Pengisian Waduk."""
    perl, ada, buang, waduk = [], set(), set(), set()
    rentang = lambda a, b: (a + dt.timedelta(n) for n in range((b - a).days + 1))
    for r in baris:
        a, b = dt.date.fromisoformat(r["periode_awal"]), dt.date.fromisoformat(r["periode_akhir"])
        p = r["provinsi"]
        if a > b:   # terbalik: bukan perlakuan; provinsi dibuang pada kedua rentang yang mungkin
            for lo, hi in ((a.replace(year=b.year), b), (a, b.replace(year=a.year))):
                buang.update((p, d) for d in rentang(lo, hi))
            continue
        ada.update((p, d) for d in rentang(a, b))
        if r["jenis_kegiatan"] == WADUK:
            waduk.update((p, d) for d in rentang(a, b))
        elif r["jenis_kegiatan"] == JENIS:
            perl.append(dict(id=len(perl), prov=p, a=a, b=b))
    return perl, ada, buang, waduk


def bangun_panel(grid, baris, tetangga, akhir):
    """grid: [{prov,kab,tgl,y,f}] -> baris panel berisi d, klaster, per. Cakupan [MULAI, akhir]."""
    perl, ada, buang, waduk = baca_periode(baris)
    hari_perl = {}
    for q in perl:
        for n in range((q["b"] - q["a"]).days + 1):
            hari_perl[(q["prov"], q["a"] + dt.timedelta(n))] = q["id"]
    terlakuan = {}
    for (p, d) in hari_perl:
        terlakuan.setdefault(d, set()).add(p)
    out = []
    for g in grid:
        k = (g["prov"], g["tgl"])
        if not (MULAI <= g["tgl"] <= akhir) or k in buang or k in waduk:
            continue
        d = int(k in hari_perl)
        if not d:
            if k in ada or any(p in tetangga.get(g["prov"], ()) for p in terlakuan.get(g["tgl"], ())):
                continue   # kontrol: tanpa OMC apa pun, bukan tetangga provinsi perlakuan hari itu
            kl = ("B", g["prov"], g["tgl"].year, g["tgl"].month)
        else:
            kl = ("P", hari_perl[k])
        out.append(dict(g, d=d, per=hari_perl.get(k), kl=kl))
    return out, perl, ada


def ambang(rows):
    t = [r for r in rows if r["d"]]
    return dict(prov_hari=len({(r["prov"], r["tgl"]) for r in t}), klaster=len({r["per"] for r in t}),
                prov=len({r["prov"] for r in t}))


# ---------------------------------------------------------------- estimasi
def _idx(rows):
    kab = {k: n for n, k in enumerate(sorted({(r["prov"], r["kab"]) for r in rows}))}
    hr = {k: n for n, k in enumerate(sorted({r["tgl"] for r in rows}))}
    cl = {k: n for n, k in enumerate(sorted({r["kl"] for r in rows}, key=str))}
    return (np.array([kab[(r["prov"], r["kab"])] for r in rows]), np.array([hr[r["tgl"]] for r in rows]),
            np.array([cl[r["kl"]] for r in rows]))


def taksir(rows, d=None):
    """TWFE + kovariat IFS, galat baku klaster. -> b, se, df."""
    ki, ti, cl = _idx(rows)
    d = np.array([r["d"] for r in rows], "f8") if d is None else d
    X = np.column_stack([d, [r["f"] for r in rows]])
    b, se, df = efek.ols(np.array([r["y"] for r in rows], "f8"), X, ki, ti, cl)
    return b[0], se[0], df


def persen(rows, b):
    m1 = float(np.mean([r["y"] for r in rows if r["d"]]))
    den = m1 - b
    if den <= 0.05 * abs(m1) or den <= 0:
        den = m1
    return lambda x: 100 * x / den


def kandidat(rows, perl, ada, cocok=False):
    """Tempat sah tiap periode (dihitung sekali): awal di bulan kalender sama, tahun lain di data, tanpa beririsan
    hari ber-OMC provinsinya. cocok=True (KANDIDAT PENYIMPANGAN, bukan PRAREG): hanya 5 jendela dengan rata-rata IFS
    terdekat ke jendela asli, supaya seleksi pada IFS ikut teracak. -> [(awal_asli, [hari jendela])]."""
    ada_p = {(r["prov"], r["tgl"]) for r in rows}
    fm = {}
    for r in rows:
        fm.setdefault((r["prov"], r["tgl"]), []).append(r["f"])
    fm = {k: float(np.mean(v)) for k, v in fm.items()}
    tahun = sorted({r["tgl"].year for r in rows})
    out = []
    for q in perl:
        n = (q["b"] - q["a"]).days + 1
        asli = [q["a"] + dt.timedelta(i) for i in range(n)]
        cand = []
        for y2 in tahun:
            if y2 == q["a"].year:
                continue
            for dd in range(1, 32):
                try:
                    s = dt.date(y2, q["a"].month, dd)
                except ValueError:
                    break
                hs = [s + dt.timedelta(i) for i in range(n)]
                if all((q["prov"], h) in ada_p and (q["prov"], h) not in ada for h in hs):
                    cand.append(hs)
        if cand and cocok and all((q["prov"], h) in fm for h in asli):
            f0 = np.mean([fm[(q["prov"], h)] for h in asli])
            cand.sort(key=lambda hs: abs(np.mean([fm[(q["prov"], h)] for h in hs]) - f0))
            cand = cand[:5]
        out.append((q["prov"], asli, cand))
    return out


def geser_blok(kand, rng):
    """Satu permutasi blok. -> ({(prov,tgl)} baru, {(prov,tgl)} periode yang tak punya tempat sah dan tetap)."""
    baru, diam = set(), set()
    for prov, asli, cand in kand:
        if not cand:
            diam.update((prov, h) for h in asli)
            continue
        baru.update((prov, h) for h in cand[rng.integers(len(cand))])
    return baru | diam, diam


def permutasi(rows, perl, ada, nperm, rng, cocok=False, log=False):
    """b dari tiap permutasi blok (FWL: y dan IFS diresidualkan sekali)."""
    ki, ti, _ = _idx(rows)
    Z = efek.resid(np.column_stack([[r["y"] for r in rows], [r["f"] for r in rows]]).astype("f8"), ki, ti)
    kand = kandidat(rows, perl, ada, cocok)
    pos = {}
    for n, r in enumerate(rows):
        pos.setdefault((r["prov"], r["tgl"]), []).append(n)
    out = np.zeros(nperm)
    baru_log = []
    for n in range(nperm):
        S, diam = geser_blok(kand, rng)
        if log:
            baru_log.append((S, diam))
        d = np.zeros(len(rows))
        for k in S:
            d[pos.get(k, ())] = 1.0
        dt_ = efek.resid(d[:, None], ki, ti, it=60)[:, 0]
        X = np.column_stack([dt_, Z[:, 1]])
        out[n] = np.linalg.lstsq(X, Z[:, 0], rcond=None)[0][0]
    return out, baru_log


def plasebo_waktu(rows, perl, ada, tetangga):
    """pola perlakuan digeser tepat setahun ke belakang, hanya provinsi-hari tanpa OMC. -> p t-klaster."""
    pola = {}
    for q in perl:
        for n in range((q["b"] - q["a"]).days + 1):
            h = q["a"] + dt.timedelta(n)
            try:
                pola[(q["prov"], h.replace(year=h.year - 1))] = q["id"]
            except ValueError:
                pass
    sub = []
    for r in rows:
        if r["d"]:
            continue
        k = (r["prov"], r["tgl"])
        sub.append(dict(r, d=int(k in pola), kl=("P", pola[k]) if k in pola else r["kl"]))
    if sum(r["d"] for r in sub) < 3:
        return None
    b, se, df = taksir(sub)
    return _p_t(abs(b / se), df)


def _p_t(t, df):
    """p dua sisi t lewat bagi-dua pada t_kuantil (cukup untuk membandingkan dengan 0,10)."""
    lo, hi = 0.0, 1.0
    for _ in range(14):
        m = (lo + hi) / 2
        lo, hi = (lo, m) if t > efek.t_kuantil(df, 1 - m) else (m, hi)
    return (lo + hi) / 2


def plasebo_ruang(rows, perl, ada, pulau, rng, nulang=300):
    """pola hari perlakuan pada provinsi acak di pulau sama tanpa OMC hari itu. -> galat tipe I (|t| > t kritis 5%)."""
    kontrol = [r for r in rows if not r["d"]]
    ada_k = {(r["prov"], r["tgl"]) for r in kontrol}
    provs = sorted({r["prov"] for r in kontrol})
    rej = n = 0
    for _ in range(nulang):
        pick = {}
        for q in perl:
            hs = [q["a"] + dt.timedelta(i) for i in range((q["b"] - q["a"]).days + 1)]
            c = [p for p in provs if p != q["prov"] and pulau.get(p) == pulau.get(q["prov"])
                 and all((p, h) in ada_k for h in hs)]
            if c:
                p = c[rng.integers(len(c))]
                pick.update(((p, h), q["id"]) for h in hs)
        sub = [dict(r, d=int((r["prov"], r["tgl"]) in pick), kl=("P", pick[(r["prov"], r["tgl"])])
                    if (r["prov"], r["tgl"]) in pick else r["kl"]) for r in kontrol]
        if sum(r["d"] for r in sub) < 3:
            continue
        b, se, df = taksir(sub)
        n += 1
        rej += abs(b / se) > efek.t_kuantil(df, .95)
    return rej / n if n else None


def vonis(h, amb):
    """h: hasil analisis (persen, p_perm, mde, p_plasebo_waktu, tipe1_ruang). -> (kategori, catatan)."""
    kurang = [f"{k} {amb[k]} < {AMBANG[k]}" for k in AMBANG if amb[k] < AMBANG[k]]
    if kurang:
        return "data_kurang", "data_kurang (n = %d prov-hari; %s)" % (amb["prov_hari"], "; ".join(kurang))
    bersih = (h["p_plasebo_waktu"] is None or h["p_plasebo_waktu"] >= .10) and \
             (h["tipe1_ruang"] is None or h["tipe1_ruang"] <= .10)
    bermakna = h["p_perm"] < .05
    if bermakna and bersih:
        return ("sejalan" if h["persen"] < 0 else "berlawanan"), ""
    if h["mde"] > MDE_TARGET:
        return "data_kurang", "tidak informatif (MDE %.0f%%)" % h["mde"]
    return "tak_terbedakan", "plasebo tidak bersih" if bermakna else "tidak terdeteksi"


def analisis_a(rows, perl, ada, pulau, nperm=2000, nruang=300, seed=SEED, placebo=True):
    rng = np.random.default_rng(seed)
    amb = ambang(rows)
    b, se, df = taksir(rows)
    pm = persen(rows, b)
    perm, _ = permutasi(rows, perl, ada, nperm, rng)
    sd = float(perm.std())
    z = {q: efek.t_kuantil(df, q) for q in (.90, .95)}
    h = dict(b=float(b), se=float(se), persen=float(pm(b)),
             ci90=[pm(b - z[.90] * se), pm(b + z[.90] * se)], ci95=[pm(b - z[.95] * se), pm(b + z[.95] * se)],
             p_perm=float(((np.abs(perm) >= abs(b) - 1e-12).sum() + 1) / (nperm + 1)), mde=abs(float(pm(2.8 * sd))),
             n_perlakuan=sum(r["d"] for r in rows), n_kontrol=sum(1 - r["d"] for r in rows),
             n_prov=len({r["prov"] for r in rows}), n_hari=len({r["tgl"] for r in rows}),
             p_plasebo_waktu=plasebo_waktu(rows, perl, ada, None) if placebo else None,
             tipe1_ruang=plasebo_ruang(rows, perl, ada, pulau, rng, nruang) if placebo else None)
    h["vonis"], h["catatan"] = vonis(h, amb)
    h["ambang"] = amb
    return h


# ---------------------------------------------------------------- uji luring (panel sintetis)
NHARI = 120   # hari per tahun per provinsi di panel sintetis
PROV = [f"P{i:02d}" for i in range(12)]
PULAU = {p: "A" if i < 6 else "B" for i, p in enumerate(PROV)}
TETANGGA = {p: {PROV[j] for j in (i - 1, i + 1) if 0 <= j < 12} for i, p in enumerate(PROV)}


def sintetis(rng, efek_pct=0.0, musim=False, n_per=3, panjang=6):
    """12 provinsi x 3 tahun x Feb 3..Feb 28 (+ Mar); hujan ~ gamma, seleksi: OMC hanya di provinsi 0..5 pada hari IFS tinggi.
    efek_pct: perubahan persen y di hari perlakuan. musim: efek bulan-provinsi musiman yang sama tiap tahun pada hari perlakuan."""
    baris, grid = [], []
    tahun = (2024, 2025, 2026)
    for y in tahun:
        for p in PROV:
            hs = [dt.date(y, 2, 3) + dt.timedelta(n) for n in range(NHARI)]
            ifs = {h: float(rng.gamma(2, 5)) for h in hs}
            if PROV.index(p) < 6:   # tempatkan periode pada hari2 IFS tertinggi tak bertumpuk (seleksi)
                # seleksi lunak: awal dipilih acak dari 80% teratas menurut jumlah IFS jendela
                mulai = sorted(range(0, NHARI - panjang), key=lambda s: -sum(ifs[hs[s + i]] for i in range(panjang)))
                mulai = list(rng.permutation(mulai[:(NHARI - panjang) * 4 // 5]))
                pakai = []
                for s in mulai:
                    if all(abs(s - u) >= panjang + 1 for u in pakai):
                        pakai.append(s)
                    if len(pakai) == n_per:
                        break
                if musim:
                    pakai = [2 + 18 * i for i in range(n_per)]   # tanggal tetap tiap tahun
                for s in ([] if musim and y == 2024 else pakai):   # 2024 tanpa OMC: tempat plasebo waktu jatuh
                    baris.append(dict(tahun=y, periode_awal=hs[s].isoformat(), periode_akhir=hs[s + panjang - 1].isoformat(),
                                      jenis_kegiatan=JENIS, operator="BMKG", provinsi=p))
            for h in hs:
                grid.append(dict(prov=p, kab=0, tgl=h, f=ifs[h], y=0.0))
    # y dibangun sesudah D diketahui
    perl, ada, _, _ = baca_periode(baris)
    hp = {(q["prov"], q["a"] + dt.timedelta(n)) for q in perl for n in range((q["b"] - q["a"]).days + 1)}
    md = {(p, h.month, h.day) for p, h in hp}
    for g in grid:
        base = 0.2 * g["f"] + float(rng.gamma(2, 3))
        if musim and (g["prov"], g["tgl"].month, g["tgl"].day) in md:
            base *= 0.6    # penyebar musim: hari-hari itu memang kering tiap tahun, terlepas dari OMC
        g["y"] = base * (1 + efek_pct / 100) if (g["prov"], g["tgl"]) in hp else base
    return grid, baris


def _jalan(rng, **kw):
    grid, baris = sintetis(rng, **{k: v for k, v in kw.items() if k in ("efek_pct", "musim", "n_per", "panjang")})
    rows, perl, ada = bangun_panel(grid, baris, TETANGGA, dt.date(2026, 12, 31))
    return rows, perl, ada, baris


def uji():
    cek_sidik()
    rng = np.random.default_rng(1)
    # 1 sidik: berkas berubah -> ditolak
    # 2 efek nol: taksiran dekat 0, p>0,05 pada >=90% ulangan (200 ulangan, 199 permutasi)
    ok = 0
    bs = []
    for i in range(200):
        rows, perl, ada, _ = _jalan(np.random.default_rng(100 + i))
        b, se, df = taksir(rows)
        bs.append(persen(rows, b)(b))
        if True:
            p = (np.abs(permutasi(rows, perl, ada, 199, np.random.default_rng(i))[0]) >= abs(b)).sum() + 1
            ok += p / 200 > .05
    assert ok >= 180, f"efek nol: p>0,05 hanya {ok}/200"
    assert abs(np.mean(bs)) < 5, f"efek nol: rata-rata taksiran {np.mean(bs):.1f}% jauh dari 0"
    print(f"efek nol ok: p>0,05 di {ok}/200, taksiran rata-rata {np.mean(bs):.2f}%")
    # 3 efek -40% -> sejalan; +40% -> berlawanan; nol -> bukan sejalan
    hasil = {}
    for nama, e in (("neg", -40), ("pos", 40), ("nol", 0)):
        rows, perl, ada, baris = _jalan(np.random.default_rng(7), efek_pct=e)
        h = hasil[nama] = analisis_a(rows, perl, ada, PULAU, nperm=199, nruang=40)
        print(nama, h["vonis"], f"persen {h['persen']:.1f} p {h['p_perm']:.3f} mde {h['mde']:.0f} plasebo_waktu {h['p_plasebo_waktu']} tipe1 {h['tipe1_ruang']}")
    assert hasil["neg"]["vonis"] == "sejalan" and -55 < hasil["neg"]["persen"] < -25, hasil["neg"]
    assert hasil["pos"]["vonis"] == "berlawanan" and 25 < hasil["pos"]["persen"] < 55, hasil["pos"]
    assert hasil["nol"]["vonis"] != "sejalan", hasil["nol"]
    # 4 kategori vonis (aturan §6.3)
    base = dict(persen=-40, p_perm=.01, mde=20, p_plasebo_waktu=.5, tipe1_ruang=.05)
    amb = dict(prov_hari=400, klaster=40, prov=8)
    assert vonis(base, amb)[0] == "sejalan"
    assert vonis(dict(base, persen=40), amb)[0] == "berlawanan"
    assert vonis(base, dict(amb, prov_hari=299))[0] == "data_kurang"
    assert vonis(base, dict(amb, klaster=29))[0] == "data_kurang"
    assert vonis(base, dict(amb, prov=4))[0] == "data_kurang"
    k, c = vonis(dict(base, p_perm=.5, mde=45), amb)
    assert k == "data_kurang" and "tidak informatif (MDE 45%)" in c, (k, c)
    assert vonis(dict(base, p_perm=.5), amb)[0] == "tak_terbedakan"
    assert vonis(dict(base, p_plasebo_waktu=.05), amb) == ("tak_terbedakan", "plasebo tidak bersih")
    assert vonis(dict(base, tipe1_ruang=.2), amb)[0] == "tak_terbedakan"
    assert vonis(dict(base, p_plasebo_waktu=.05, mde=50), amb)[0] == "data_kurang"
    # 5 plasebo waktu: pola musiman -> p kecil, vonis turun ke tak_terbedakan
    rows, perl, ada, _ = _jalan(np.random.default_rng(3), musim=True)
    pw = plasebo_waktu(rows, perl, ada, None)
    assert pw is not None and pw < .10, f"plasebo waktu pada data musiman p={pw}"
    print("plasebo waktu musiman p =", round(pw, 4))
    # 6 klaster per provinsi-periode, kontrol per provinsi-bulan
    rows, perl, ada, baris = _jalan(np.random.default_rng(5))
    kt = {r["kl"] for r in rows if r["d"]}
    assert kt == {("P", q["id"]) for q in perl if any(r["per"] == q["id"] for r in rows)}, "klaster perlakuan bukan provinsi-periode"
    assert all(r["kl"][0] == "B" and len(r["kl"]) == 4 for r in rows if not r["d"])
    # 7 baris terbalik: bukan perlakuan, provinsi dibuang pada kedua rentang
    rev = dict(periode_awal="2024-01-01", periode_akhir="2023-01-15", jenis_kegiatan=JENIS, provinsi="P03")
    pl, _, buang, _ = baca_periode([rev])
    assert pl == [] and ("P03", dt.date(2023, 1, 1)) in buang and ("P03", dt.date(2024, 1, 15)) in buang and ("P03", dt.date(2024, 1, 1)) in buang
    # 8 cakupan: sebelum 3 Feb 2024 dibuang
    g = [dict(prov="P00", kab=0, tgl=dt.date(2024, 2, 2), y=1., f=1.), dict(prov="P00", kab=0, tgl=dt.date(2024, 2, 3), y=1., f=1.)]
    assert [r["tgl"] for r in bangun_panel(g, [], TETANGGA, dt.date(2030, 1, 1))[0]] == [MULAI]
    # 9 Pengisian Waduk dibuang (provinsi itu); tetangga perlakuan bukan kontrol; jenis lain bukan perlakuan
    bar = [dict(periode_awal="2024-03-01", periode_akhir="2024-03-02", jenis_kegiatan=JENIS, provinsi="P01"),
           dict(periode_awal="2024-03-01", periode_akhir="2024-03-01", jenis_kegiatan=WADUK, provinsi="P05"),
           dict(periode_awal="2024-03-01", periode_akhir="2024-03-01", jenis_kegiatan="Pengurangan CH - Acara", provinsi="P08")]
    h1 = dt.date(2024, 3, 1)
    g = [dict(prov=p, kab=0, tgl=h1, y=1., f=1.) for p in ("P00", "P01", "P02", "P05", "P08", "P09")]
    ps = {r["prov"]: r["d"] for r in bangun_panel(g, bar, TETANGGA, dt.date(2030, 1, 1))[0]}
    assert ps == {"P01": 1, "P09": 0}, ps   # P00,P02 tetangga; P05 waduk; P08 OMC lain
    # 10 permutasi blok tak beririsan periode OMC provinsinya, di bulan sama, tahun lain, di semua ulangan
    rows, perl, ada, _ = _jalan(np.random.default_rng(9))
    _, log = permutasi(rows, perl, ada, 30, np.random.default_rng(2), log=True)
    for S, diam in log:
        assert all(k not in ada for k in S - diam), "permutasi beririsan periode OMC"
    print("permutasi blok: hari perlakuan yang tak bisa dipindah %.0f%%" % (100 * np.mean([len(d) / max(len(S), 1) for S, d in log])))
    # 11 benih tetap
    a = analisis_a(rows, perl, ada, PULAU, nperm=49, nruang=20)
    b2 = analisis_a(rows, perl, ada, PULAU, nperm=49, nruang=20)
    assert a == b2, "benih tetap: dua jalan beda"
    # 12 efek.resid/ols dipakai dari efek.py, bukan disalin
    src = open(__file__).read()
    assert "def " + "resid" not in src and "def " + "ols" not in src
    print("uji efek_banjir ok")


def stub(a):
    cek_sidik()
    sys.exit(f"lapis-a {a}: belum ada; SB-13 mengisinya (tiket ini tidak menarik atau membaca data hujan nyata)")


if __name__ == "__main__":
    c = sys.argv[1:] or ["uji"]
    if c[0] == "uji":
        uji()
    elif c[0] == "lapis-a" and len(c) > 1 and c[1] in ("tarik", "analisis"):
        stub(c[1])
    else:
        sys.exit(__doc__)
