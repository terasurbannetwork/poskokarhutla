#!/usr/bin/env python3
"""Penguji efektivitas OMC banjir, Lapis A (provinsi-hari dari omc_bmkg.json). SB-12.

Aturan dikunci di data/kajian-bnpb/semai-banjir/riset/PRAREG-A.md (sidik di PRAREG-A.sidik); jangan disunting.
Regresi, resid, t_kuantil dipakai dari efek.py (karhutla), tidak disalin.

  python3 scripts/omc/efek_banjir.py uji                 # uji luring pada panel sintetis
  python3 scripts/omc/efek_banjir.py lapis-a tarik       # CHIRPS (gdal /vsicurl, jendela Indonesia) + IFS Open-Meteo -> data/raw/omc_banjir (ignored)
  python3 scripts/omc/efek_banjir.py lapis-a analisis    # -> riset/HASIL-A.md dan hasil_a.json (SB-13)

Tafsir yang diambil (PRAREG diam): permutasi blok menolak periode yang beririsan dengan periode OMC apa pun
DI PROVINSI YANG SAMA (bukan seluruh provinsi: dengan 86 periode di 13 provinsi lain terlalu sering memblokir).
"""
import datetime as dt
import hashlib
import json
import math
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import efek  # noqa: E402  resid, ols, t_kuantil

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
PRAREG = os.path.join(AKAR, "data/kajian-bnpb/semai-banjir/riset/PRAREG-A")
SEED = 20261125
MULAI = dt.date(2024, 2, 3)            # awal ecmwf_ifs025 historical-forecast (D11)
IFS_AKHIR = dt.date(2026, 11, 24)      # IFS ditarik sampai sini (CHIRPS prelim terbit lebih lambat; hari CHIRPS terakhir yang menentukan)
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
    pakai = {r["per"] for r in out if r["d"]}   # periode tanpa satu pun hari di panel (mis. 2023) tak ikut dipindah-pindah
    return out, [q for q in perl if q["id"] in pakai], ada


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
            if k in pos:   # d[()] = 1 akan mengisi SELURUH larik: kunci di luar panel harus dilewati
                d[pos[k]] = 1.0
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
    h["sd_perm"] = sd
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
    # 11b regresi SB-13: kunci perlakuan di luar panel (periode tanpa tempat sah) tak boleh mengisi seluruh larik d
    luar = dict(id=999, prov="P00", a=dt.date(2020, 1, 1), b=dt.date(2020, 1, 3))
    pm, _ = permutasi(rows, perl + [luar], ada, 20, np.random.default_rng(4))
    assert pm.std() > 0, "permutasi runtuh: kunci di luar panel mengisi seluruh d"
    # 12 efek.resid/ols dipakai dari efek.py, bukan disalin
    src = open(__file__).read()
    assert "def " + "resid" not in src and "def " + "ols" not in src
    print("uji efek_banjir ok")


# ---------------------------------------------------------------- tarik (data nyata, lokal; bukan pipeline)
MENTAH = os.path.join(AKAR, "data/raw/omc_banjir")
CHC = "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/daily/"
# jendela Indonesia pada grid CHIRPS 0,05 derajat (tepi kiri-atas)
LON0, LAT0, RES, NX, NY = 94.5, 6.5, 0.05, 940, 360


def _json_url(u):
    import urllib.request
    return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "riset-omc-banjir"}), timeout=60).read().decode()


def url_chirps(d):
    """final bila ada (daftar direktori), kalau tidak prelim. v3.0 'sat' (v2.0 prelim yang dipakai efek.py sudah 404)."""
    import re
    for jenis in ("final", "prelim"):
        if jenis not in _ada:
            _ada[jenis] = set(re.findall(r'chirps-v3\.0\.%s\.(\d{4}\.\d\d\.\d\d)\.tif' % ("sat" if jenis == "final" else "prelim"), "".join(
                _json_url(f"{CHC}{jenis}/sat/{y}/") for y in range(2024, dt.date.today().year + 1))))
        k = d.strftime("%Y.%m.%d")
        if k in _ada[jenis]:
            return jenis, f"{CHC}{jenis}/sat/{d.year}/chirps-v3.0.{'sat' if jenis == 'final' else 'prelim'}.{k}.tif"
    return None, None


_ada = {}


def unduh_chirps(hari, par=4):
    import subprocess
    from concurrent.futures import ThreadPoolExecutor
    os.makedirs(MENTAH + "/chirps", exist_ok=True)
    jenis = {}
    url_chirps(hari[0])   # isi daftar direktori sekali, sebelum utas

    def satu(d):
        f = f"{MENTAH}/chirps/{d.isoformat()}.bin"
        j, u = url_chirps(d)
        jenis[d.isoformat()] = j
        if j is None:
            return
        if os.path.exists(f) and os.path.getsize(f) == NX * NY * 4:
            return
        for coba in range(4):   # satu GET penuh (~12 MB) lalu potong lokal: jauh lebih sedikit permintaan daripada /vsicurl
            r = subprocess.run(["curl", "-sS", "-f", "-m", "300", "-o", f + ".tif", u], capture_output=True)
            if r.returncode == 0:
                r = subprocess.run(["gdal_translate", "-q", "-of", "ENVI", "-ot", "Float32", "-projwin", str(LON0), str(LAT0),
                                    str(LON0 + NX * RES), str(LAT0 - NY * RES), f + ".tif", f + ".tmp"], capture_output=True)
            if r.returncode == 0:
                os.replace(f + ".tmp", f)
                for x in (f + ".tif", f + ".tmp.hdr", f + ".tmp.aux.xml", f + ".hdr", f + ".aux.xml"):
                    if os.path.exists(x):
                        os.remove(x)
                return
            time.sleep(10 * (coba + 1))
        jenis[d.isoformat()] = None
    with ThreadPoolExecutor(par) as ex:
        list(ex.map(satu, hari))
    return jenis


def baca_kab_semua():
    """[{prov (kode), nama, polys}] dari semua public/geo/kabupaten/*.json; urutan berkas lalu fitur."""
    import glob
    out = []
    for f in sorted(glob.glob(os.path.join(AKAR, "public/geo/kabupaten/*.json"))):
        kode = os.path.basename(f)[:-5]
        for ft in json.load(open(f))["features"]:
            g = ft["geometry"]
            out.append(dict(prov=kode, nama=ft["properties"]["kab"],
                            polys=g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]))
    return out


def _dalam_np(px, py, poly):
    """titik-dalam-poligon vektor (ganjil-genap atas semua cincin, sama dengan efek.dalam)."""
    c = np.zeros(len(px), bool)
    for ring in poly:
        a = np.asarray(ring, "f8")[:, :2]
        b = np.roll(a, 1, axis=0)
        for (xi, yi), (xj, yj) in zip(a, b):
            if yi == yj:
                continue
            c ^= ((yi > py) != (yj > py)) & (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
    return c


def sel_kab(k):
    """indeks datar sel (pusat di dalam poligon); kosong -> sel terdekat ke pusat kab."""
    xs = [c[0] for p in k["polys"] for c in p[0]]
    ys = [c[1] for p in k["polys"] for c in p[0]]
    c0, c1 = max(0, int((min(xs) - LON0) / RES)), min(NX - 1, int((max(xs) - LON0) / RES) + 1)
    r0, r1 = max(0, int((LAT0 - max(ys)) / RES)), min(NY - 1, int((LAT0 - min(ys)) / RES) + 1)
    cc, rr = np.meshgrid(np.arange(c0, c1 + 1), np.arange(r0, r1 + 1))
    cc, rr = cc.ravel(), rr.ravel()
    px, py = LON0 + (cc + .5) * RES, LAT0 - (rr + .5) * RES
    m = np.zeros(len(cc), bool)
    for poly in k["polys"]:
        m |= _dalam_np(px, py, poly)
    if m.any():
        return (rr[m] * NX + cc[m]).tolist()
    px0, py0 = efek.pusat(k)
    return [min(NY - 1, max(0, int((LAT0 - py0) / RES))) * NX + min(NX - 1, max(0, int((px0 - LON0) / RES)))]


def ambil_ifs(kabs, a, b, par_jeda=2.0):
    """IFS harian (ecmwf_ifs025, UTC) di sel 0,25 derajat terdekat pusat kab: sel yang sama dengan titik pusat (model 0,25),
    diminta sekali per sel unik. -> {kab_i: {iso: mm}}; cache per sel di MENTAH/ifs_sel.json."""
    import urllib.parse
    import urllib.request
    cache_f = MENTAH + "/ifs_sel.json"
    cache = json.load(open(cache_f)) if os.path.exists(cache_f) else {}
    sel = {}
    for i, k in enumerate(kabs):
        px, py = efek.pusat(k)
        sel[i] = (round(py * 4) / 4, round(px * 4) / 4)
    unik = sorted({v for v in sel.values() if f"{v[0]},{v[1]},{a},{b}" not in cache})
    print("sel IFS unik:", len({*sel.values()}), "belum di cache:", len(unik))
    for s in range(0, len(unik), 10):
        ch = unik[s:s + 10]
        u = "https://historical-forecast-api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(dict(
            latitude=",".join(str(x[0]) for x in ch), longitude=",".join(str(x[1]) for x in ch), start_date=a, end_date=b,
            daily="precipitation_sum", models="ecmwf_ifs025", timezone="UTC"))
        for coba in range(8):
            try:
                d = json.loads(_json_url(u))
                break
            except Exception as e:
                print("IFS ulang", s, coba, str(e)[:80], flush=True)
                time.sleep(30 * (coba + 1))
        else:
            raise SystemExit("IFS gagal; ulangi `lapis-a tarik` (cache sel dipakai ulang)")
        d = d if isinstance(d, list) else [d]
        for v, x in zip(ch, d):
            cache[f"{v[0]},{v[1]},{a},{b}"] = dict(zip(x["daily"]["time"], x["daily"]["precipitation_sum"]))
        json.dump(cache, open(cache_f, "w"))
        print("IFS", s + len(ch), "/", len(unik), flush=True)
        time.sleep(par_jeda)
    return {i: cache[f"{v[0]},{v[1]},{a},{b}"] for i, v in sel.items()}


def tarik(hanya_ifs=False):
    os.makedirs(MENTAH, exist_ok=True)
    if hanya_ifs:   # isi cache IFS dulu (server CHIRPS bisa mati berjam-jam)
        return ambil_ifs(baca_kab_semua(), MULAI.isoformat(), IFS_AKHIR.isoformat())
    akhir_min = IFS_AKHIR
    hari, d = [], MULAI
    while d <= akhir_min:
        hari.append(d)
        d += dt.timedelta(1)
    jenis = unduh_chirps(hari)
    ada = [h for h in hari if jenis.get(h.isoformat())]
    hilang = [h.isoformat() for h in hari if not jenis.get(h.isoformat())]
    # hari akhir = hari terakhir yang ada; hilang sesudahnya hanyalah belum terbit
    akhir = ada[-1]
    hari = [h for h in hari if h <= akhir]
    hilang = [h for h in hilang if h <= akhir.isoformat()]
    print("hari CHIRPS:", len(ada), "akhir", akhir, "hilang di tengah:", hilang)
    kabs = baca_kab_semua()
    sels = [sel_kab(k) for k in kabs]
    print("kab:", len(kabs), "sel total:", sum(map(len, sels)))
    pemilik = {}
    for i, s in enumerate(sels):
        for x in s:
            pemilik[x] = kabs[i]["prov"]
    chirps = {str(i): {} for i in range(len(kabs))}
    for h in ada:
        if h > akhir:
            continue
        a = np.fromfile(f"{MENTAH}/chirps/{h.isoformat()}.bin", "<f4")
        for i, s in enumerate(sels):
            v = a[s]
            v = v[v > -9000]
            if len(v):
                chirps[str(i)][h.isoformat()] = float(v.mean())
    ifs = ambil_ifs(kabs, MULAI.isoformat(), akhir_min.isoformat())
    json.dump(dict(hari=[h.isoformat() for h in hari], akhir=akhir.isoformat(), hilang=hilang,
                   produk={h.isoformat(): jenis[h.isoformat()] for h in ada},
                   kab=[dict(prov=k["prov"], nama=k["nama"]) for k in kabs],
                   chirps=chirps, ifs={str(i): v for i, v in ifs.items()},
                   tetangga_prov=_tetangga_prov(pemilik)), open(MENTAH + "/panel_mentah.json", "w"))
    print("panel_mentah.json ditulis")


def _tetangga_prov(pemilik):
    """provinsi bertetangga = ada sel kedua provinsi bersebelahan (8 arah) pada grid 0,05 derajat."""
    out = {}
    for x, p in pemilik.items():
        r, c = divmod(x, NX)
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                q = pemilik.get((r + dr) * NX + c + dc) if 0 <= c + dc < NX else None
                if q and q != p:
                    out.setdefault(p, set()).add(q)
    return {p: sorted(v) for p, v in out.items()}



# ---------------------------------------------------------------- analisis (data nyata)
RISET = os.path.join(AKAR, "data/kajian-bnpb/semai-banjir/riset")
PULAU_KODE = {"1": "Sumatera", "2": "Sumatera", "3": "Jawa", "5": "Bali-NusaTenggara", "6": "Kalimantan", "7": "Sulawesi",
              "8": "Maluku", "9": "Papua"}   # tafsir: PRAREG diam soal "pulau"; kode BPS digit pertama (21 Kepri -> Sumatera)


def muat():
    m = json.load(open(MENTAH + "/panel_mentah.json"))
    grid, kosong = [], 0
    for i, k in enumerate(m["kab"]):
        c, f = m["chirps"][str(i)], m["ifs"][str(i)]
        for h in m["hari"]:
            y, fv = c.get(h), f.get(h)
            if y is None or fv is None:
                kosong += 1
                continue
            grid.append(dict(prov=k["prov"], kab=i, tgl=dt.date.fromisoformat(h), y=y, f=fv))
    return m, grid, kosong


def baca_baris():
    d = json.load(open(os.path.join(AKAR, "public/udara/data/omc_bmkg.json")))
    baris = [dict(r, provinsi=r["kode_prov"]) for r in d["baris"]]
    ops = [r["operator"] for r in baris
           if r["jenis_kegiatan"] == JENIS and dt.date.fromisoformat(r["periode_awal"]) <= dt.date.fromisoformat(r["periode_akhir"])]
    return baris, ops, d


def ganti_y(rows, fn):
    return [dict(r, y=fn(r)) for r in rows]


def sub_perl(rows, perl, keep):
    return [r for r in rows if not r["d"] or r["per"] in keep], [q for q in perl if q["id"] in keep]


def ringkas(rows, perl, ada, nperm, seed=SEED):
    rng = np.random.default_rng(seed)
    b, se, df = taksir(rows)
    perm, _ = permutasi(rows, perl, ada, nperm, rng)
    return dict(b=float(b), se=float(se), sd_perm=float(perm.std()), p_perm=float(((np.abs(perm) >= abs(b) - 1e-12).sum() + 1) / (nperm + 1)),
                n_perlakuan=sum(r["d"] for r in rows), n_klaster=len({r["per"] for r in rows if r["d"]}),
                rata_y_perlakuan=float(np.mean([r["y"] for r in rows if r["d"]])) if any(r["d"] for r in rows) else None)


def holm(ps):
    o = sorted(range(len(ps)), key=lambda i: ps[i])
    out, mx = [None] * len(ps), 0.0
    for r, i in enumerate(o):
        mx = max(mx, min(1.0, (len(ps) - r) * ps[i]))
        out[i] = mx
    return out


def kepadatan(rows, perl, ada, kand):
    per = {}
    for (p, h) in ada:
        per.setdefault((p, h.year), set()).add(h)
    pp = {}
    for q in perl:
        for n in range((q["b"] - q["a"]).days + 1):
            pp.setdefault((q["prov"], (q["a"] + dt.timedelta(n)).year), set()).add(q["a"] + dt.timedelta(n))
    hari = {}
    for r in rows:
        hari.setdefault((r["prov"], r["tgl"].year), set()).add(r["tgl"])
    tabel = [dict(prov=p, tahun=y, hari_panel=len(hari.get((p, y), ())), hari_perlakuan=len(v),
                  persen_perlakuan=100 * len(v) / max(1, len(hari.get((p, y), ()))))
             for (p, y), v in sorted(pp.items())]
    tanpa = sum(1 for _, _, c in kand if not c)
    return dict(per_prov_tahun=tabel, periode=len(kand), tanpa_tempat_sah=tanpa, median_tempat_sah=float(np.median([len(c) for _, _, c in kand])) if kand else 0)


def analisis(nperm=2000, nruang=300):
    cek_sidik()
    t0 = time.time()
    m, grid, kosong = muat()
    baris, ops, sumber = baca_baris()
    tet = {p: set(v) for p, v in m["tetangga_prov"].items()}
    pulau = {p: PULAU_KODE.get(p[0]) for p in {k["prov"] for k in m["kab"]}}
    akhir = dt.date.fromisoformat(m["akhir"])
    rows, perl, ada = bangun_panel(grid, baris, tet, akhir)
    amb = ambang(rows)
    print("panel", len(rows), "ambang", amb, "kosong", kosong, flush=True)
    kand = kandidat(rows, perl, ada)
    pad = kepadatan(rows, perl, ada, kand)
    out = dict(dibuat=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), sidik=cek_sidik(), akhir=m["akhir"],
               n_baris_panel=len(rows), n_sel_kosong=kosong, hilang_chirps=m["hilang"], n_hari_chirps=len(m["hari"]) - len(m["hilang"]),
               produk=dict(final=sum(1 for v in m["produk"].values() if v == "final"), prelim=sum(1 for v in m["produk"].values() if v == "prelim")),
               ambang=amb, ambang_min=AMBANG, kepadatan=pad, nperm=nperm, nruang=nruang, seed=SEED)
    # primer (+ plasebo)
    P = out["primer"] = analisis_a(rows, perl, ada, pulau, nperm=nperm, nruang=nruang)
    out["primer_analitik"] = dict(se=P["se"], sd_perm=P["sd_perm"], rasio_sd_perm_per_se=P["sd_perm"] / P["se"],
                                  mde_analitik=abs(100 * 2.8 * P["se"] / (np.mean([r["y"] for r in rows if r["d"]]) - P["b"])))
    print("primer", P["vonis"], round(P["persen"], 1), P["p_perm"], "mde", round(P["mde"]), "t", round(time.time() - t0), flush=True)
    # sekunder
    sek = out["sekunder"] = {}
    for nama, fn in (("ln(1+mm)", lambda r: math.log1p(r["y"])), ("hujan>=50mm", lambda r: float(r["y"] >= 50)),
                     ("CHIRPS-IFS (mm)", lambda r: r["y"] - r["f"])):
        z = ringkas(ganti_y(rows, fn), perl, ada, nperm)
        sek[nama] = z
        print("sek", nama, z["b"], z["p_perm"], flush=True)
    # rincian eksploratori
    rin = out["rincian"] = {}
    ketentuan = {f"prov {k}": {q["id"] for q in perl if q["prov"] == k} for k in ("31", "32", "36")}
    for op in sorted(set(ops)):
        ketentuan[f"operator {op}"] = {q["id"] for q, o in zip(perl, ops) if o == op}
    for nama, keep in ketentuan.items():
        r2, p2 = sub_perl(rows, perl, keep)
        if len(p2) < 2:
            rin[nama] = dict(catatan=f"data_kurang ({len(p2)} periode)")
            continue
        try:
            z = ringkas(r2, p2, ada, nperm)
        except np.linalg.LinAlgError:
            rin[nama] = dict(catatan="tidak dapat ditaksir (matriks singular: perlakuan terserap efek tetap)")
            continue
        z["persen"] = 100 * z["b"] / (z["rata_y_perlakuan"] - z["b"]) if z["rata_y_perlakuan"] - z["b"] > 0 else None
        z["ambang"] = ambang(r2)
        rin[nama] = z
        print("rincian", nama, z["p_perm"], flush=True)
    ok = [k for k, v in rin.items() if "p_perm" in v]
    for k, ph in zip(ok, holm([rin[k]["p_perm"] for k in ok])):
        rin[k]["p_holm"] = ph
    out["detik"] = round(time.time() - t0)
    json.dump(out, open(RISET + "/hasil_a.json", "w"), indent=1, default=float)
    tulis_hasil(out, sumber)
    print("HASIL-A ditulis;", out["detik"], "detik")


def _f(x, n=1):
    return "tidak ada" if x is None else f"{x:.{n}f}".replace(".", ",")


def tulis_hasil(o, sumber):
    P, A = o["primer"], o["primer_analitik"]
    label = {"sejalan": "kesesuaian: hujan sasaran lebih rendah dari pembanding setara; bukan bukti sebab",
             "berlawanan": "kesesuaian berlawanan arah: hujan sasaran lebih tinggi dari pembanding setara; bukan bukti sebab",
             "tak_terbedakan": "tidak terdeteksi", "data_kurang": P["catatan"] or "data_kurang"}[P["vonis"]]
    pad = o["kepadatan"]
    pt = sorted(pad["per_prov_tahun"], key=lambda r: -r["persen_perlakuan"])[:6]
    L = [f"# HASIL-A: penguji efektivitas OMC banjir, Lapis A (SB-13)", "",
         f"Dihitung {o['dibuat']} oleh `python3 scripts/omc/efek_banjir.py lapis-a analisis`; angka mentah di `hasil_a.json`. Aturan: `PRAREG-A.md` (sidik `{o['sidik'][:12]}`, cocok). "
         "Tidak tampil di layar mana pun sebelum pemilik membaca. Ini kesesuaian pola data, bukan sebab-akibat.", "",
         "## Vonis", "", f"**{P['vonis']}**: {label}.", "",
         f"- Efek: {_f(P['persen'])}% ({_f(P['b'], 2)} mm per kab-hari) terhadap rata-rata kontrafaktual kelompok perlakuan; "
         f"selang 90%: {_f(P['ci90'][0])}% sampai {_f(P['ci90'][1])}%; selang 95%: {_f(P['ci95'][0])}% sampai {_f(P['ci95'][1])}%.",
         f"- p permutasi blok ({o['nperm']} ulangan): {_f(P['p_perm'], 3)}. MDE (2,8 x sd permutasi): {_f(P['mde'], 0)}% (target 30%).",
         f"- Plasebo waktu (digeser setahun): p = {_f(P['p_plasebo_waktu'], 3)} (syarat >= 0,10). Plasebo ruang ({o['nruang']} ulangan): galat tipe I = {_f(P['tipe1_ruang'], 3)} (syarat <= 0,10).",
         f"- n perlakuan {P['n_perlakuan']} kab-hari, kontrol {P['n_kontrol']}; {P['n_hari']} hari; {P['n_prov']} provinsi.",
         f"- Ambang n: {o['ambang']['prov_hari']} provinsi-hari (min {AMBANG['prov_hari']}), {o['ambang']['klaster']} provinsi-periode (min {AMBANG['klaster']}), {o['ambang']['prov']} provinsi (min {AMBANG['prov']}). Perkiraan PRAREG: 795, 86, 13.", "",
         "## Sebaran permutasi lawan galat baku analitik", "",
         f"Galat baku klaster {_f(A['se'], 3)} mm; sd sebaran permutasi {_f(A['sd_perm'], 3)} mm; rasio sd/SE = {_f(A['rasio_sd_perm_per_se'], 2)}. "
         f"MDE bila memakai SE analitik: {_f(A['mde_analitik'], 0)}% (MDE vonis memakai sd permutasi sesuai PRAREG). "
         + ("Permutasi lebih sempit dari galat analitik: perlakuan rapat membuat tempat pindah sedikit, jadi MDE permutasi bisa terlalu optimis." if A["rasio_sd_perm_per_se"] < 0.7 else "Keduanya sebanding."), "",
         f"Kerapatan perlakuan: {pad['periode']} periode, {pad['tanpa_tempat_sah']} di antaranya tanpa tempat pindah sah (tetap di tempat asli di tiap permutasi), median {_f(pad['median_tempat_sah'], 0)} tempat sah per periode. "
         "Provinsi-tahun terpadat (persen hari panel yang berperlakuan):", ""]
    L += ["| Provinsi (kode) | Tahun | Hari panel | Hari perlakuan | Persen |", "| --- | --- | --- | --- | --- |"]
    L += [f"| {r['prov']} | {r['tahun']} | {r['hari_panel']} | {r['hari_perlakuan']} | {_f(r['persen_perlakuan'])} |" for r in pt]
    L += ["", "## Spesifikasi sekunder (semua dilaporkan)", "", "| Hasil | Efek | Galat baku | sd permutasi | p permutasi |", "| --- | --- | --- | --- | --- |"]
    for k, v in o["sekunder"].items():
        L.append(f"| {k} | {_f(v['b'], 3)} | {_f(v['se'], 3)} | {_f(v['sd_perm'], 3)} | {_f(v['p_perm'], 3)} |")
    L += ["", "Satuan efek: mm; ln(1+mm) dalam log; hujan >= 50 mm dalam selisih peluang (0 sampai 1).", "",
          "## Rincian eksploratori (koreksi Holm)", "", "| Bagian | Periode | Efek (%) | p permutasi | p Holm |", "| --- | --- | --- | --- | --- |"]
    for k, v in o["rincian"].items():
        if "p_perm" not in v:
            L.append(f"| {k} | - | - | - | {v['catatan']} |")
        else:
            L.append(f"| {k} | {v['n_klaster']} | {_f(v.get('persen'))} | {_f(v['p_perm'], 3)} | {_f(v['p_holm'], 3)} |")
    L += ["", "## Data", "",
          f"- Hujan: CHIRPS v3.0 'sat' harian 0,05 derajat, {o['n_hari_chirps']} hari dari 3 Feb 2024 sampai {o['akhir']} ({o['produk']['final']} hari final, {o['produk']['prelim']} hari prelim); "
          f"hari tanpa berkas: {len(o['hilang_chirps'])}" + (f" ({', '.join(o['hilang_chirps'][:10])})" if o["hilang_chirps"] else "") + ".",
          f"- Panel {o['n_baris_panel']} baris kab-hari sesudah pembuangan; {o['n_sel_kosong']} sel kab-hari tanpa CHIRPS atau IFS dibuang.",
          f"- Perlakuan: `omc_bmkg.json` (diambil {sumber['diambil']}), jenis persis `Pengurangan CH - Bencana`; baris Jawa Timur bertanggal terbalik tidak dipakai.", "",
          "## Penyimpangan dari PRAREG-A", "",
          "Tidak ada yang mengubah aturan vonis atau ambang. Yang berbeda dari yang dibayangkan, dan tafsir pada hal yang PRAREG diam:", "",
          "1. Produk hujan CHIRPS v3.0 'sat', bukan v2.0: berkas v2.0 prelim yang dipakai `efek.py` sudah tidak ada di server (404). Hari sampai 31 Okt 2026 dari `final`, sesudahnya `prelim`; keduanya satu keluarga v3.0 tetapi prelim bisa direvisi saat final terbit.",
          "2. CHIRPS dibaca dengan `gdal_translate` lewat HTTP (jendela 94,5 sampai 141,5 BT, 6,5 LU sampai 11,5 LS), bukan unduh global; rata-rata sel yang pusatnya di dalam poligon kab (kab tanpa pusat sel: sel terdekat ke pusat), nilai -9999 dibuang.",
          "3. IFS diminta per sel 0,25 derajat terdekat dari pusat kab (resolusi model 0,25; sel sama dengan titik pusat), bukan titik pusat persis.",
          "4. Provinsi bertetangga dihitung dari sel CHIRPS yang bersebelahan (8 arah) milik dua provinsi; provinsi seberang selat tidak bertetangga. 'Pulau' = digit pertama kode provinsi (21 Kepri masuk Sumatera; Bali dan Nusa Tenggara satu kelompok).",
          "5. Permutasi blok: periode yang beririsan dengan periode OMC apa pun di provinsi yang sama ditolak (tafsir SB-12), bukan di seluruh provinsi.",
          "6. Hari terakhir ditentukan hari CHIRPS terakhir yang terbit saat tarik (PRAREG §6.2).", "",
          "## Batas", "",
          "Hanya kesesuaian pola pada data publik. Tidak menilai sortie, jam semai, koordinat semai, kg bahan, genangan, atau kejadian banjir; tidak menyimpulkan sebab-akibat. "
          "Perlakuan BMKG dipilih saat prakiraan hujan tinggi: kovariat IFS menahan sebagian, bukan seluruh seleksi itu."]
    open(RISET + "/HASIL-A.md", "w").write("\n".join(L) + "\n")


if __name__ == "__main__":
    c = sys.argv[1:] or ["uji"]
    if c[0] == "uji":
        uji()
    elif c[0] == "lapis-a" and len(c) > 1 and c[1] in ("tarik", "analisis"):
        cek_sidik()
        tarik(len(c) > 2 and c[2] == "ifs") if c[1] == "tarik" else analisis()
    else:
        sys.exit(__doc__)
