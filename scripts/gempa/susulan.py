"""Peluang gempa susulan (Reasenberg & Jones 1989, 1994) dikalibrasi untuk Indonesia dari katalog USGS -> public/gempa/data/
  model_susulan.json       parameter generik, kinerja validasi + uji, pembanding, status terbit
  prospektif_susulan.json  append-only: ramalan tiap gempa utama M >= 5 baru, dinilai 7 hari kemudian

Model. Laju susulan M >= Mmin pada t hari sesudah gempa utama Mu:
    lambda(t, Mmin) = 10^(a + b (Mu - Mmin)) (t + c)^-p
Cacah harapan dalam [t1, t2]: N = 10^a K, K = 10^(b (Mu - Mmin)) * integral (t + c)^-p dt; P(>= 1) = 1 - exp(-N).
Keragaman antarurutan (pola Page et al. 2016): a ~ Normal(mu, sigma), dipecah ke 81 simpul tetap z in [-4, 4]
(bobot densitas normal, dinormalkan). Peluang tampil = rata-rata P atas sebaran a; rentang 10-90% = P pada mu -+ 1,2816 sigma.
Penyesuaian per urutan: posterior a diberi susulan M >= mc yang sudah teramati di [T0, tKini] (likelihood Poisson
di simpul yang sama), diringkas lagi jadi Normal(mu', sigma'); b, p, c tetap generik.

Kalibrasi (katalog USGS FDSN M >= 4,5 sejak 2000, kotak umum.BBOX, cache riwayat.ambil_potongan):
  gempa utama = gempa M >= 5 di Indonesia (umum.provinsi_gempa) yang tidak jatuh di jendela Gardner-Knopoff gempa lebih
  besar sebelumnya (riwayat.deklaster, katalog penuh termasuk tetangga); susulan = gempa apa pun M >= mc dalam
  jarak GK 10^(0,1238 Mu + 0,983) km dan waktu [T0, T_FIT] hari sesudahnya.
  b  = Aki-Utsu atas susulan latih; p, c = MLE gabungan (a diprofilkan); mu, sigma = MLE marginal Poisson-lognormal.
  Latih: gempa utama 2000-2019; validasi 2020-2022; uji 2023-kini (gempa yang jendela 7 harinya sudah lewat), dibuka SEKALI.
  Pembanding: laju klimatologi = proporsi gempa utama latih sekelas M (lebar 0,5) yang diikuti target, (k + 0,5)/(n + 1).
  Model TIDAK terbit bila di validasi kalah dari pembanding (Brier atau log-likelihood) pada salah satu target.
Target: susulan M >= 5 dan susulan M >= Mu - 1 (hanya bila Mu - 1 >= mc), jendela t = 0,04 sampai 7 hari.
Tidak meramal gempa utama.

Pakai:  python3 scripts/gempa/susulan.py latih | prospektif | uji
        validasi  (latih + validasi saja, set uji tidak disentuh, tidak menulis berkas: untuk riset sebelum `latih`)
        latih --buka-ulang-uji  (hanya bila parameter berubah sesudah uji pernah dibuka; dicatat di berkas)
"""
import bisect, datetime as dt, hashlib, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import AKAR, KELUAR, jarak_km, simpan  # noqa: E402

MODEL = os.path.join(KELUAR, "model_susulan.json")
PROSPEKTIF = os.path.join(KELUAR, "prospektif_susulan.json")
T0, T_FIT, H = 0.04, 7.0, 7.0  # hari: mulai jendela (1 jam), ujung jendela latih, horizon ramalan
M_UTAMA = 5.0
TARGET = ("m5", "m6", "m_1")  # susulan M >= 5, M >= 6, M >= Mu - 1
M_REF = 6.0
RENTANG_MAKS_MU = 5.5  # di atas ini rentang 10-90% terlalu lebar untuk ditampilkan (temuan validasi-model)  # magnitudo acuan suku produktivitas alfa
LATIH, VALID, UJI = ("2000-01-01", "2020-01-01"), ("2020-01-01", "2023-01-01"), ("2023-01-01", "2100-01-01")
Z10 = 1.2815515655446004
NZ = 81
SIMPUL = [-4 + 8 * i / (NZ - 1) for i in range(NZ)]
_w = [math.exp(-z * z / 2) for z in SIMPUL]
BOBOT = [x / sum(_w) for x in _w]
BIN_REL = (0, .02, .05, .1, .2, .3, .5, 1.0000001)
SITASI = ["Reasenberg, P. A. & Jones, L. M. 1989, Science 243:1173-1176",
          "Reasenberg, P. A. & Jones, L. M. 1994, Science 265:1251-1252",
          "Page, M. T., van der Elst, N., Hardebeck, J., Felzer, K. & Michael, A. J. 2016, BSSA 106(5):2290-2301",
          "Gardner, J. K. & Knopoff, L. 1974, BSSA 64(5):1363-1367",
          "Aki, K. 1965, Bull. Earthq. Res. Inst. 43:237-239; Utsu, T. 1965",
          "Katalog: USGS ANSS ComCat via FDSN Event Web Service, domain publik"]


# ---------- inti model (kembaran public/gempa/susulan.js) ----------

def _integral(t1, t2, p, c):
    if t2 <= t1:
        return 0.0
    if abs(p - 1) < 1e-9:
        return math.log((t2 + c) / (t1 + c))
    return ((t2 + c) ** (1 - p) - (t1 + c) ** (1 - p)) / (1 - p)


def _produktif(P, m_utama, m_min):
    """10^(b (Mu - Mmin) + (alfa - b)(Mu - m_ref)): RJ murni bila alfa = b; alfa < b = produktivitas naik lebih lambat dari GR."""
    return 10 ** (P["b"] * (m_utama - m_min) + (P["alfa"] - P["b"]) * (m_utama - P["m_ref"]))


def _cek(P):
    for k in ("a", "b", "p", "c", "mc", "sa", "alfa", "m_ref"):
        if not isinstance(P.get(k), (int, float)) or isinstance(P.get(k), bool) or not math.isfinite(P[k]):
            raise ValueError(f"param {k} harus angka hingga, dapat {P.get(k)!r}")
    if P["b"] <= 0 or P["c"] <= 0 or P["sa"] < 0 or not 0.3 <= P["p"] <= 3 or not 0 <= P["alfa"] <= 3:
        raise ValueError(f"param di luar rentang fisik: {P}")


def peluang(m_utama, t_mulai, durasi, m_min, P):
    """-> {p, n, lo, hi}: peluang >= 1 susulan M >= m_min dalam [t_mulai, t_mulai + durasi] hari sesudah gempa utama."""
    _cek(P)
    if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in (m_utama, t_mulai, durasi, m_min)):
        raise ValueError("argumen peluang harus angka hingga")
    if t_mulai < 0 or durasi < 0:
        raise ValueError("t_mulai dan durasi tidak boleh negatif")
    K = _produktif(P, m_utama, m_min) * _integral(t_mulai, t_mulai + durasi, P["p"], P["c"])
    pr = n = 0.0
    for z, w in zip(SIMPUL, BOBOT):
        lam = 10 ** (P["a"] + P["sa"] * z) * K
        pr += w * (1 - math.exp(-lam))
        n += w * lam
    lo = 1 - math.exp(-(10 ** (P["a"] - Z10 * P["sa"])) * K)
    hi = 1 - math.exp(-(10 ** (P["a"] + Z10 * P["sa"])) * K)
    return {"p": pr, "n": n, "lo": lo, "hi": hi}


def sesuaikan(m_utama, susulan, t_kini, P, aktif=True):
    """Posterior a untuk satu urutan dari susulan teramati [{t_hari, m}] (M >= mc, T0 <= t <= t_kini) -> param baru.
    aktif=False (model_susulan.json terbit_sesuaikan false): param generik tak berubah, hanya n_amat diisi."""
    _cek(P)
    if not isinstance(t_kini, (int, float)) or not math.isfinite(t_kini) or t_kini < 0:
        raise ValueError("t_kini harus angka >= 0")
    if not isinstance(susulan, list):
        raise ValueError("susulan harus daftar {t_hari, m}")
    n = 0
    for s in susulan:
        t, m = s.get("t_hari"), s.get("m")
        if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in (t, m)):
            raise ValueError(f"susulan tak sah: {s!r}")
        if m >= P["mc"] - 1e-9 and T0 <= t <= t_kini:
            n += 1
    if t_kini <= T0:
        return dict(P, n_amat=0)
    if not aktif:
        return dict(P, n_amat=n)
    K = _produktif(P, m_utama, P["mc"]) * _integral(T0, t_kini, P["p"], P["c"])
    lw = []
    for z, w in zip(SIMPUL, BOBOT):
        lam = 10 ** (P["a"] + P["sa"] * z) * K
        lw.append(math.log(w) + n * math.log(lam) - lam)
    mx = max(lw)
    ws = [math.exp(x - mx) for x in lw]
    s = sum(ws)
    ak = [P["a"] + P["sa"] * z for z in SIMPUL]
    mu = sum(w * a for w, a in zip(ws, ak)) / s
    sd = math.sqrt(max(0.0, sum(w * (a - mu) ** 2 for w, a in zip(ws, ak)) / s))
    return dict(P, a=mu, sa=sd, n_amat=n)


# ---------- katalog ----------

def _hari(w):
    d = dt.datetime.strptime(w[:16], "%Y-%m-%dT%H:%M")
    return d.toordinal() + d.hour / 24 + d.minute / 1440


def katalog(umur_maks_jam=1.0):
    """Semua gempa USGS M >= 4,5 sejak 2000 di kotak: [{w, t, lat, lon, dalam, m, kp, place}] urut waktu; kp None = bukan Indonesia
    (provinsi hanya dicari untuk M >= 5). Disimpan di data/raw/gempa (tak dilacak git) dan dipakai ulang bila umurnya < umur_maks_jam."""
    import csv, io, riwayat, time
    from umum import ambil, usgs_url
    tembolok = os.path.join(riwayat.MENTAH, "susulan_katalog.json")
    if os.path.exists(tembolok) and time.time() - os.path.getmtime(tembolok) < umur_maks_jam * 3600:
        return json.load(open(tembolok))
    sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
    from wilayah import Wilayah
    from umum import provinsi_gempa
    w = Wilayah()
    ev = []
    hari_ini = dt.datetime.now(dt.timezone.utc).date()
    bagian = [riwayat.ambil_potongan(*x)[1] for x in riwayat.potongan(hari_ini) if x[2] == 4.5]
    # potongan riwayat berakhir 00.00 UTC hari ini; hari ini sampai sekarang diambil langsung (tak di-cache)
    teks = ambil(usgs_url("query", hari_ini.isoformat(), dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"), 4.5,
                          format="csv"), mentah=True).decode()
    bagian.append([[r["time"][:16], round(float(r["latitude"]), 3), round(float(r["longitude"]), 3), round(float(r["depth"] or 0), 1),
                    round(float(r["mag"]), 1), r["place"], r["type"]] for r in csv.DictReader(io.StringIO(teks)) if r["mag"] != ""])
    for baris in bagian:
        for wk, la, lo, dalam, m, place, tipe in baris:
            if tipe == "earthquake":
                ev.append({"w": wk, "t": _hari(wk), "lat": la, "lon": lo, "dalam": dalam, "m": m, "place": place,
                           "kp": provinsi_gempa(w, la, lo, place) if m >= M_UTAMA else None})
    ev.sort(key=lambda e: e["t"])
    simpan(tembolok, ev)
    return ev


def jarak_gk(m):
    return 10 ** (0.1238 * m + 0.983)


def urutan(ev, utama_idx, t_akhir=T_FIT, mc=4.5):
    """Untuk tiap indeks gempa utama -> daftar (t_hari sesudah utama, m) susulan M >= mc di (0, t_akhir], jarak GK."""
    ts = [e["t"] for e in ev]
    out = {}
    for i in utama_idx:
        e, D = ev[i], jarak_gk(ev[i]["m"])
        a, b = bisect.bisect_right(ts, e["t"]), bisect.bisect_right(ts, e["t"] + t_akhir)
        out[i] = [(ev[j]["t"] - e["t"], ev[j]["m"]) for j in range(a, b)
                  if j != i and ev[j]["m"] >= mc - 1e-9 and jarak_km(e["lat"], e["lon"], ev[j]["lat"], ev[j]["lon"]) <= D]
    return out


def gempa_utama(ev):
    import riwayat
    u = riwayat.deklaster([(e["w"], e["lat"], e["lon"], e["m"]) for e in ev])
    return sorted(i for i in u if ev[i]["kp"] and ev[i]["m"] >= M_UTAMA)


# ---------- kalibrasi ----------

def b_aki(mags, mc):
    mags = [m for m in mags if m >= mc - 1e-9]
    return math.log10(math.e) / (sum(mags) / len(mags) - (mc - 0.05)), len(mags)


def mc_maxc(mags):
    """Magnitudo kelengkapan: kurvatur maksimum (bin 0,1) + 0,2 (Woessner & Wiemer 2005), tak kurang dari 4,5."""
    h = {}
    for m in mags:
        h[round(m, 1)] = h.get(round(m, 1), 0) + 1
    return round(max(4.5, max(h, key=lambda k: (h[k], -k)) + 0.2), 1)


def latih_param(seq, mu_m, mc):
    """seq: {i: [(t, m)]}, mu_m: {i: Mu}. -> param dict dan diagnostik.
    1. b Aki-Utsu atas susulan. 2. p, c MLE gabungan; ln L terpisah menjadi bagian (p, c) dan bagian produktivitas, jadi
    p, c dicari di kisi tanpa bergantung alfa. 3. mu, sa, alfa MLE marginal Poisson-lognormal (pencarian pola)."""
    mags = [m for s in seq.values() for t, m in s if T0 <= t <= T_FIT]
    b, nb = b_aki(mags, mc)
    obs = {i: [t for t, m in s if T0 <= t <= T_FIT and m >= mc - 1e-9] for i, s in seq.items()}
    N = sum(len(v) for v in obs.values())
    best = None
    for c in (0.005, 0.01, 0.02, 0.05, 0.1, 0.2):
        Lc = sum(math.log(t + c) for ts in obs.values() for t in ts)
        for k in range(50, 181):
            p = k / 100
            ll = -N * math.log(_integral(T0, T_FIT, p, c)) - p * Lc
            if best is None or ll > best[0]:
                best = (ll, p, c)
    _, p, c = best
    I = _integral(T0, T_FIT, p, c)
    grup = {}
    for i, ts in obs.items():
        grup[(len(ts), mu_m[i])] = grup.get((len(ts), mu_m[i]), 0) + 1

    def ll_marg(mu, sa, al):
        tot = 0.0
        for (n, Mu), cnt in grup.items():
            K = 10 ** (b * (Mu - mc) + (al - b) * (Mu - M_REF)) * I
            lw = [math.log(w) + n * math.log(10 ** (mu + sa * z) * K) - 10 ** (mu + sa * z) * K for z, w in zip(SIMPUL, BOBOT)]
            mx = max(lw)
            tot += cnt * (mx + math.log(sum(math.exp(x - mx) for x in lw)) - math.lgamma(n + 1))
        return tot
    a_gab = math.log10(N / sum(10 ** (b * (mu_m[i] - mc)) * I for i in obs))  # RJ murni (alfa = b), sebagai titik awal
    x, step = [a_gab, 0.5, b], 0.2
    fx = ll_marg(*x)
    while step >= 0.001:  # pencarian pola: coba +-langkah tiap sumbu, pindah bila membaik, selain itu langkah dibagi dua
        maju = False
        for d in range(3):
            for sgn in (1, -1):
                y = list(x)
                y[d] = round(y[d] + sgn * step, 6)
                if d == 1 and y[1] < 0:
                    continue
                fy = ll_marg(*y)
                if fy > fx + 1e-9:
                    x, fx, maju = y, fy, True
        if not maju:
            step /= 2
    mu, sa, al = x
    return ({"a": round(mu, 4), "b": round(b, 4), "p": p, "c": c, "mc": mc, "sa": round(sa, 4), "alfa": round(al, 4), "m_ref": M_REF},
            {"n_urutan": len(seq), "n_susulan": N, "n_b": nb, "a_rj_murni": round(a_gab, 4), "ll_marginal": round(fx, 2),
             "ll_marginal_alfa_sama_b": round(max(ll_marg(a_gab + d / 50, s2 / 20, b) for d in range(-10, 11) for s2 in range(0, 31, 2)), 2)})


# ---------- penilaian ----------

def _kelas(m):
    return min(4, int((m - 5.0) / 0.5 + 1e-9))  # 5-5,4 | 5,5-5,9 | 6-6,4 | 6,5-6,9 | >= 7


def target_m(mu, kode):
    return {"m5": 5.0, "m6": 6.0, "m_1": mu - 1.0}[kode]


def kejadian(mu, sus, kode, mc):
    """(terjadi?, cacah) untuk target; None bila target di bawah mc (tak teramati)."""
    mm = target_m(mu, kode)
    if mm < mc - 1e-9:
        return None
    n = sum(1 for t, m in sus if T0 <= t <= H and m >= mm - 1e-9)
    return n > 0, n


def klimatologi(latih):
    """latih: [(Mu, terjadi)] -> 5 peluang per kelas M."""
    k, n = [0] * 5, [0] * 5
    for mu, y in latih:
        n[_kelas(mu)] += 1
        k[_kelas(mu)] += 1 if y else 0
    return [round((k[i] + 0.5) / (n[i] + 1), 4) for i in range(5)], n


def _poisson_cdf(x, lam):
    """P(X <= x) Poisson, ruang log (lam besar aman)."""
    if lam <= 0:
        return 1.0
    lt, s = -lam, 0.0
    tot = []
    for k in range(int(x) + 1):
        tot.append(-lam + k * math.log(lam) - math.lgamma(k + 1))
    mx = max(tot)
    return min(1.0, math.exp(mx) * sum(math.exp(v - mx) for v in tot))


def metrik(baris):
    """baris: [(p_model, p_pembanding, y, n_teramati, n_harapan, n_harapan_median?)] -> ringkasan.
    N-test (Kagan & Jackson): cacah teramati vs harapan Poisson; harapan = rerata atas sebaran a (didominasi ekor lognormal),
    harapan_median = 10^a K (a di median), dilaporkan berdampingan."""
    if not baris:
        return None
    jum = len(baris)
    cl = lambda p: min(1 - 1e-6, max(1e-6, p))
    br = lambda j: sum((r[j] - r[2]) ** 2 for r in baris) / jum
    ll = lambda j: sum(math.log(cl(r[j]) if r[2] else 1 - cl(r[j])) for r in baris) / jum
    obs, har = sum(r[3] for r in baris), sum(r[4] for r in baris)
    rel = []
    for lo, hi in zip(BIN_REL, BIN_REL[1:]):
        x = [r for r in baris if lo <= r[0] < hi]
        if x:
            rel.append({"bin": [lo, round(min(hi, 1), 2)], "n": len(x), "ramal": round(sum(r[0] for r in x) / len(x), 4),
                        "amat": round(sum(1 for r in x if r[2]) / len(x), 4)})
    bm, bp = br(0), br(1)
    return {"n": jum, "n_terjadi": sum(1 for r in baris if r[2]), "frek_amat": round(sum(1 for r in baris if r[2]) / jum, 4),
            "ramal_rata": round(sum(r[0] for r in baris) / jum, 4),
            "brier": round(bm, 5), "brier_pembanding": round(bp, 5), "bss": round(1 - bm / bp, 4) if bp else None,
            "ll": round(ll(0), 5), "ll_pembanding": round(ll(1), 5),
            "n_test": {"amat": obs, "harapan": round(har, 1), "harapan_median": round(sum(r[5] for r in baris), 1) if len(baris[0]) > 5 else None,
                       "p_kurang": round(_poisson_cdf(obs, har), 4),
                       "p_lebih": round(1 - _poisson_cdf(obs - 1, har) if obs > 0 else 1.0, 4)},
            "reliabilitas": rel}


def bootstrap_selisih(baris, n_boot=2000, benih=1):
    """Selisih Brier model - pembanding dan CI95 dari bootstrap gempa utama (negatif = model lebih baik)."""
    import random
    if not baris:
        return None
    rnd, n = random.Random(benih), len(baris)
    d = [(r[0] - r[2]) ** 2 - (r[1] - r[2]) ** 2 for r in baris]
    sb = sorted(sum(d[rnd.randrange(n)] for _ in range(n)) / n for _ in range(n_boot))
    return {"selisih_brier": round(sum(d) / n, 5), "ci95": [round(sb[int(0.025 * n_boot)], 5), round(sb[int(0.975 * n_boot) - 1], 5)],
            "n": n, "n_boot": n_boot, "target": "m5", "arti": "Brier model - Brier pembanding; negatif = model lebih baik"}


def nilai_sesuai(set_idx, ev, seq, P, t1s=(0.5, 1.0, 2.0)):
    """Penyesuaian per urutan: pada t1 hari, param disesuaikan dengan susulan M >= mc di [T0, t1]; ramalan susulan M >= 5
    di jendela sisa (t1, H] dibandingkan dengan param generik pada jendela yang sama."""
    out = {}
    cl = lambda p: min(1 - 1e-6, max(1e-6, p))
    for t1 in t1s:
        rows = []
        for i in set_idx:
            mu, s = ev[i]["m"], seq[i]
            y = any(t1 < t <= H and m >= 5.0 - 1e-9 for t, m in s)
            Pi = sesuaikan(mu, [{"t_hari": t, "m": m} for t, m in s if t <= t1], t1, P)
            rows.append((peluang(mu, t1, H - t1, 5.0, Pi)["p"], peluang(mu, t1, H - t1, 5.0, P)["p"], y))
        n = len(rows)
        if not n:
            out[str(t1)] = None
            continue
        br = lambda j: sum((r[j] - r[2]) ** 2 for r in rows) / n
        ll = lambda j: sum(math.log(cl(r[j]) if r[2] else 1 - cl(r[j])) for r in rows) / n
        out[str(t1)] = {"n": n, "n_terjadi": sum(1 for r in rows if r[2]), "brier_sesuai": round(br(0), 5), "brier_generik": round(br(1), 5),
                        "ll_sesuai": round(ll(0), 5), "ll_generik": round(ll(1), 5)}
    return out


def menang_sesuai(k):
    """Penyesuaian terbit hanya bila di SEMUA t1 Brier dan log-likelihood tidak kalah dari param generik."""
    return bool(k) and all(v and v["brier_sesuai"] <= v["brier_generik"] and v["ll_sesuai"] >= v["ll_generik"] for v in k.values())


def baris_nilai(set_idx, ev, seq, P, klim, kode):
    baris = []
    for i in set_idx:
        mu = ev[i]["m"]
        y = kejadian(mu, seq[i], kode, P["mc"])
        if y is None:
            continue
        r = peluang(mu, T0, H - T0, target_m(mu, kode), P)
        n_med = peluang(mu, T0, H - T0, target_m(mu, kode), dict(P, sa=0.0))["n"]
        baris.append((r["p"], klim[kode][_kelas(mu)], y[0], y[1], r["n"], n_med))
    return baris


def nilai(set_idx, ev, seq, P, klim):
    out = {}
    for kode in TARGET:
        out[kode] = metrik(baris_nilai(set_idx, ev, seq, P, klim, kode))
    return out


def menang(k):
    """Per target: terbit hanya bila Brier DAN log-likelihood model tidak kalah dari pembanding."""
    return {t: bool(k[t] and k[t]["brier"] <= k[t]["brier_pembanding"] and k[t]["ll"] >= k[t]["ll_pembanding"]) for t in TARGET}


def _sidik(P):
    return hashlib.sha1(json.dumps({k: P[k] for k in sorted(P)}, sort_keys=True).encode()).hexdigest()[:12]


def latih(buka_ulang=False, hanya_validasi=False):
    ev = katalog()
    kini = dt.datetime.now(dt.timezone.utc)
    t_kini = _hari(kini.strftime("%Y-%m-%dT%H:%M"))
    utama = gempa_utama(ev)
    bag = lambda r: [i for i in utama if r[0] <= ev[i]["w"] < r[1] and ev[i]["t"] + H <= t_kini]
    i_l, i_v, i_u = bag(LATIH), bag(VALID), bag(UJI)
    mc = mc_maxc([e["m"] for e in ev if LATIH[0] <= e["w"] < LATIH[1]])
    seq = urutan(ev, utama, T_FIT, mc)
    P, diag = latih_param({i: seq[i] for i in i_l}, {i: ev[i]["m"] for i in i_l}, mc)
    klim, n_kelas = {}, {}
    for kode in TARGET:
        dat = [(ev[i]["m"], kejadian(ev[i]["m"], seq[i], kode, mc)) for i in i_l]
        klim[kode], n_kelas[kode] = klimatologi([(m, y[0]) for m, y in dat if y is not None])
    k_latih = nilai(i_l, ev, seq, P, klim)
    k_val = nilai(i_v, ev, seq, P, klim)
    lolos = menang(k_val)
    k_sesuai = nilai_sesuai(i_v, ev, seq, P)
    lolos_sesuai = menang_sesuai(k_sesuai)
    boot_val = bootstrap_selisih(baris_nilai(i_v, ev, seq, P, klim, "m5"))
    sidik = _sidik(P)
    if hanya_validasi:  # tanpa menyentuh set uji dan tanpa menulis berkas
        print(json.dumps({"param": P, "diag": diag, "mc": mc, "n": [len(i_l), len(i_v), len(i_u)], "klim": klim, "lolos_validasi": lolos,
                          "latih": k_latih, "validasi": k_val, "sesuaikan": k_sesuai, "terbit_sesuaikan": lolos_sesuai,
                          "bootstrap_validasi": boot_val}, ensure_ascii=False, indent=1))
        return None, ev
    lama = json.load(open(MODEL)) if os.path.exists(MODEL) else {}
    ku_lama = lama.get("kinerja_uji") or {}
    buka = ku_lama.get("dibuka_kali", 0)
    if ku_lama.get("dibuka") and ku_lama.get("sidik_param") == sidik:
        k_uji = ku_lama  # uji sudah dibuka untuk parameter ini: metrik tidak dihitung ulang
        if "bootstrap_selisih_brier" not in k_uji:  # statistik tambahan atas hasil uji yang sama; param tidak berubah
            k_uji["bootstrap_selisih_brier"] = bootstrap_selisih(baris_nilai(i_u, ev, seq, P, klim, "m5"))
    elif ku_lama.get("dibuka") and not buka_ulang:
        raise SystemExit(f"parameter berubah ({ku_lama.get('sidik_param')} -> {sidik}) padahal uji sudah dibuka; "
                         "jalankan `latih --buka-ulang-uji` dengan sadar (dicatat di berkas)")
    else:
        k_uji = {"dibuka": kini.strftime("%Y-%m-%dT%H:%MZ"), "dibuka_kali": buka + 1, "sidik_param": sidik,
                 "rentang": [UJI[0], ev[i_u[-1]]["w"][:10] if i_u else None], **nilai(i_u, ev, seq, P, klim),
                 "bootstrap_selisih_brier": bootstrap_selisih(baris_nilai(i_u, ev, seq, P, klim, "m5"))}
    model = {
        "versi": 1, "dibuat": kini.strftime("%Y-%m-%dT%H:%MZ"), "jenis": "susulan_reasenberg_jones",
        "terbit": lolos["m5"], "terbit_target": lolos, "target": {"m5": "susulan M >= 5", "m6": "susulan M >= 6", "m_1": "susulan M >= M utama - 1"},
        "terbit_sesuaikan": lolos_sesuai, "kinerja_sesuaikan": {"set": "validasi", "target": "m5", "jendela": "(t1, 7] hari", "per_t1": k_sesuai},
        "rentang_maks_mu": RENTANG_MAKS_MU,
        "param": P, "sidik_param": sidik, "jendela_hari": [T0, H], "m_utama_min": M_UTAMA,
        "simpul_z": [-4, 4, NZ], "z10": Z10,
        "kinerja_uji": k_uji, "kinerja_validasi": dict(k_val, bootstrap_selisih_brier=boot_val), "kinerja_latih": k_latih,
        "pembanding": {"nama": "klimatologi: proporsi gempa utama latih sekelas M (lebar 0,5; >= 7 satu kelas) yang diikuti target, (k + 0,5)/(n + 1)",
                       "kelas_m": ["5-5,4", "5,5-5,9", "6-6,4", "6,5-6,9", ">= 7"], "peluang": klim, "n_latih": n_kelas},
        "pembagian": {"latih": [LATIH[0], LATIH[1]], "validasi": [VALID[0], VALID[1]], "uji": [UJI[0], "kini - 7 hari"],
                      "n_utama": {"latih": len(i_l), "validasi": len(i_v), "uji": len(i_u)}},
        "diagnostik": diag, "prospektif": "prospektif_susulan.json", "sitasi": SITASI,
        "catatan": [
            "Katalog USGS M >= 4,5 sejak 2000 (kotak lat -12..7, lon 94..142); gempa utama hanya di Indonesia (umum.provinsi_gempa), susulan dihitung dari katalog penuh.",
            f"Gempa utama = M >= 5 di luar jendela Gardner-Knopoff gempa lebih besar sebelumnya; susulan = M >= mc ({mc}) dalam jarak GK dan {T0}-{T_FIT} hari.",
            f"mc = kurvatur maksimum + 0,2 pada katalog latih. Target M >= Mu - 1 hanya dinilai bila Mu - 1 >= mc (Mu >= {mc + 1:.1f}).",
            "Jam pertama (t < 0,04 hari) tidak dimodelkan: katalog tak lengkap sesudah gempa besar.",
            "Keragaman antarurutan lewat a ~ Normal(a, sa); rentang 10-90% hanya dari keragaman a, b/p/c dianggap pasti.",
            "Penyesuaian per urutan hanya memperbarui a (Bayes, likelihood Poisson); p dan c tetap generik. Dinilai di validasi pada t1 = 0,5/1/2 hari "
            "untuk jendela sisa (t1, 7]; " + ("terbit." if lolos_sesuai else "TIDAK terbit (kalah dari param generik), jadi sesuaikan() mengembalikan param generik; "
            "layar dan laporan memakai prakiraan polos (generik) sampai penyesuaian lolos validasi 2020-2022.")
            + " Brier sesuai vs generik: " + "; ".join(f"t1 {t} hari {v['brier_sesuai']} vs {v['brier_generik']}" for t, v in k_sesuai.items() if v) + ".",
            f"Rentang 10-90% hanya layak ditampilkan untuk M utama <= {RENTANG_MAKS_MU} (rentang_maks_mu); di atasnya tampilkan angka tengah saja.",
            "Magnitudo campur jenis (mb, mww, ...) apa adanya dari USGS; tanpa koreksi jenis magnitudo.",
            "Jarak susulan memakai jendela GK, terlalu sempit untuk gempa megathrust M >= 8 (zona susulan ratusan km): cacah bisa kurang.",
            "Bukan prakiraan gempa utama: tidak ada yang bisa meramal gempa utama, termasuk situs ini.",
            "Terbit per target (terbit_target): target terbit hanya bila Brier DAN log-likelihood validasi tidak kalah dari pembanding; "
            "`terbit` = status target utama M >= 5. Target yang tidak terbit tidak boleh ditampilkan di layar: "
            + ", ".join(f"{k} {'terbit' if v else 'TIDAK terbit'}" for k, v in lolos.items()) + ".",
        ],
    }
    if k_uji is not ku_lama and buka:
        model["catatan"].append(f"Uji dibuka ulang (ke-{buka + 1}) karena parameter berubah; angka uji tidak lagi sepenuhnya buta.")
    simpan(MODEL, model)
    print(json.dumps({"param": P, "diag": diag, "terbit": lolos,
                      "val": {k: (v and {x: v[x] for x in ("n", "n_terjadi", "brier", "brier_pembanding", "ll", "ll_pembanding")}) for k, v in k_val.items()},
                      "uji": {k: (k_uji.get(k) and {x: k_uji[k][x] for x in ("n", "n_terjadi", "brier", "brier_pembanding", "ll", "ll_pembanding")}) for k in TARGET}},
                     ensure_ascii=False, indent=1))
    return model, ev


# ---------- prospektif (append-only) ----------

def muat_model():
    if not os.path.exists(MODEL):
        raise SystemExit("model_susulan.json belum ada: jalankan `susulan.py latih` dulu")
    return json.load(open(MODEL))


def _kunci(e):
    return f"{e['w']}|{e['lat']}|{e['lon']}"


def gabung_prospektif(lama, baru):
    """Tolak bila entri lama hilang atau ramalannya berubah (append-only)."""
    bk = {x["id"]: x for x in baru["entri"]}
    for x in lama.get("entri", []):
        y = bk.get(x["id"])
        if y is None or y["ramalan"] != x["ramalan"] or y["param"] != x["param"] or (x.get("dinilai") and y.get("dinilai") != x["dinilai"]):
            raise ValueError(f"prospektif bukan append-only: entri {x['id']} hilang atau diubah")
    return baru


def prospektif(ev=None, kini=None):
    mdl = muat_model()
    ev = ev if ev is not None else katalog()
    kini = kini or dt.datetime.now(dt.timezone.utc)
    t_kini = _hari(kini.strftime("%Y-%m-%dT%H:%M"))
    lama = json.load(open(PROSPEKTIF)) if os.path.exists(PROSPEKTIF) else {"entri": []}
    entri = [dict(x) for x in lama["entri"]]
    ada = {x["id"] for x in entri}
    t_beku = _hari(mdl["dibuat"][:16])
    utama = gempa_utama(ev)
    seq = urutan(ev, utama, H, mdl["param"]["mc"])
    idx = {_kunci(ev[i]): i for i in utama}
    for i in utama:  # gempa utama sesudah parameter dibekukan: ramalan hanya fungsi (M, param), tanpa bocoran hasil
        e = ev[i]
        if e["t"] <= t_beku or _kunci(e) in ada:
            continue
        P = mdl["param"]
        r = {k: (None if target_m(e["m"], k) < P["mc"] - 1e-9 else
                 {x: round(v, 5) for x, v in peluang(e["m"], T0, H - T0, target_m(e["m"], k), P).items()}) for k in TARGET}
        entri.append({"id": _kunci(e), "waktu": e["w"], "lat": e["lat"], "lon": e["lon"], "m": e["m"], "dalam": e["dalam"], "prov": e["kp"],
                      "dicatat": kini.strftime("%Y-%m-%dT%H:%MZ"), "param": P, "ramalan": r, "dinilai": None})
    for x in entri:
        if x["dinilai"] is None and _hari(x["waktu"]) + H <= t_kini and x["id"] in idx:
            i = idx[x["id"]]
            x["dinilai"] = {"pada": kini.strftime("%Y-%m-%dT%H:%MZ"),
                            **{k: (lambda y: None if y is None else {"terjadi": y[0], "cacah": y[1]})(kejadian(x["m"], seq[i], k, x["param"]["mc"]))
                               for k in TARGET}}
    ring = {}
    for k in TARGET:
        b = [(x["ramalan"][k]["p"], x["ramalan"][k]["p"], x["dinilai"][k]["terjadi"], x["dinilai"][k]["cacah"], x["ramalan"][k]["n"])
             for x in entri if x["dinilai"] and x["ramalan"][k] and x["dinilai"][k]]
        m = metrik(b)
        ring[k] = m and {y: m[y] for y in ("n", "n_terjadi", "brier", "ll", "n_test", "reliabilitas")}
    baru = {"diperbarui": kini.strftime("%Y-%m-%dT%H:%MZ"), "dicatat": len(entri), "dinilai": sum(1 for x in entri if x["dinilai"]),
            "metrik": ring, "jendela_hari": [T0, H],
            "catatan": "Append-only. Tiap gempa utama M >= 5 di Indonesia sesudah parameter dibekukan dicatat dengan parameter saat itu; "
                       "dinilai sekali sesudah 7 hari terhadap katalog USGS. Entri lama tidak pernah diubah atau dihapus.",
            "entri": entri}
    simpan(PROSPEKTIF, gabung_prospektif(lama, baru))
    print("prospektif:", baru["dicatat"], "dicatat,", baru["dinilai"], "dinilai")
    return baru


# ---------- uji ----------

def uji():
    P = {"a": -1.67, "b": 0.91, "p": 1.08, "c": 0.05, "mc": 4.5, "sa": 0.0, "alfa": 0.91, "m_ref": 6.0}  # alfa = b: RJ 1989 generik
    # sa = 0: rumus RJ tertutup
    K = 10 ** (0.91 * (7 - 5)) * ((7 + .05) ** (-.08) - (.04 + .05) ** (-.08)) / (-.08)
    r = peluang(7.0, T0, H - T0, 5.0, P)
    assert abs(r["n"] - 10 ** -1.67 * K) < 1e-9 and abs(r["p"] - (1 - math.exp(-r["n"]))) < 1e-12 and abs(r["lo"] - r["p"]) < 1e-12 and r["lo"] == r["hi"], r
    Ps = dict(P, sa=0.5)
    a, b = peluang(6.0, T0, 7, 5.0, Ps), peluang(7.0, T0, 7, 5.0, Ps)
    assert a["lo"] < a["p"] < a["hi"] and a["p"] < b["p"], (a, b)
    assert peluang(6.0, 1, 1, 5.0, Ps)["p"] > peluang(6.0, 5, 1, 5.0, Ps)["p"]  # Omori: makin lama makin jarang
    assert peluang(6.0, 0, 0, 5.0, Ps)["p"] == 0
    assert abs(_integral(0, 1, 1.0, 0.05) - math.log(1.05 / 0.05)) < 1e-12
    for salah in (dict(P, a=float("nan")), dict(P, b=-1), dict(P, p=9), {k: v for k, v in P.items() if k != "sa"}, dict(P, c=True)):
        try:
            peluang(6, T0, 7, 5, salah)
            raise SystemExit(f"param salah diterima: {salah}")
        except ValueError:
            pass
    for arg in ((6, -1, 7, 5), (6, T0, -1, 5), ("6", T0, 7, 5)):
        try:
            peluang(*arg, Ps)
            raise SystemExit(f"argumen salah diterima: {arg}")
        except (ValueError, TypeError):
            pass
    # sesuaikan: banyak susulan menaikkan a, nol susulan menurunkan, sa menyempit
    ramai = sesuaikan(6.0, [{"t_hari": 0.1 * k + 0.05, "m": 4.6} for k in range(30)], 3.0, Ps)
    sepi = sesuaikan(6.0, [], 3.0, Ps)
    assert ramai["a"] > Ps["a"] > sepi["a"] and ramai["sa"] < Ps["sa"] and ramai["n_amat"] == 30, (ramai, sepi)
    assert sesuaikan(6.0, [{"t_hari": 0.5, "m": 4.0}, {"t_hari": 5, "m": 5}], 3.0, Ps)["n_amat"] == 0  # di bawah mc / sesudah t_kini
    assert sesuaikan(6.0, [], 0.01, Ps)["a"] == Ps["a"]
    mati = sesuaikan(6.0, [{"t_hari": 0.1 * k + 0.05, "m": 4.6} for k in range(30)], 3.0, Ps, aktif=False)
    assert mati == dict(Ps, n_amat=30), mati  # penyesuaian tidak terbit: param generik
    assert menang_sesuai({"1.0": {"brier_sesuai": .04, "brier_generik": .03, "ll_sesuai": -.1, "ll_generik": -.2}}) is False
    assert menang_sesuai({"1.0": {"brier_sesuai": .03, "brier_generik": .04, "ll_sesuai": -.1, "ll_generik": -.2}}) is True and not menang_sesuai({})
    bs = bootstrap_selisih([(0.9, 0.5, True), (0.1, 0.5, False)] * 20)
    assert bs["selisih_brier"] < 0 and bs["ci95"][0] <= bs["selisih_brier"] <= bs["ci95"][1] < 0, bs
    for s in ([{"t_hari": "x", "m": 5}], "bukan daftar"):
        try:
            sesuaikan(6.0, s, 2.0, Ps)
            raise SystemExit("susulan salah diterima")
        except ValueError:
            pass
    # kalibrasi pada katalog sintetis: parameter pulih
    import random
    rnd = random.Random(7)
    seq, mu_m = {}, {}
    for i in range(800):
        mu = round(5 + min(3.0, -math.log10(1 - rnd.random())), 1)
        a_s = rnd.gauss(-1.9, 0.4)
        # sampel waktu Omori p=1,1 c=0,05 pada [T0, T_FIT] dengan inversi, magnitudo GR b=1
        lam = 10 ** (a_s + 1.0 * (mu - 4.5) + (0.8 - 1.0) * (mu - M_REF)) * _integral(T0, T_FIT, 1.1, 0.05)
        n, L, pk = 0, math.exp(-lam), 1.0
        while True:
            pk *= rnd.random()
            if pk <= L:
                break
            n += 1
        F = lambda t: ((t + .05) ** -.1 - (T0 + .05) ** -.1) / ((T_FIT + .05) ** -.1 - (T0 + .05) ** -.1)
        ts = []
        for _ in range(n):
            u, lo, hi = rnd.random(), T0, T_FIT
            for _ in range(50):
                md = (lo + hi) / 2
                lo, hi = (md, hi) if F(md) < u else (lo, md)
            ts.append((lo, round(4.45 - math.log10(1 - rnd.random()), 1)))
        seq[i], mu_m[i] = ts, mu
    Pf, d = latih_param(seq, mu_m, 4.5)
    assert abs(Pf["p"] - 1.1) < 0.08 and abs(Pf["b"] - 1.0) < 0.1 and abs(Pf["a"] + 1.9) < 0.2 and 0.2 < Pf["sa"] < 0.6, (Pf, d)
    assert abs(Pf["alfa"] - 0.8) < 0.15, Pf
    print("pulih:", Pf)
    # pembanding, metrik, deklaster+urutan
    kl, n = klimatologi([(5.2, True), (5.1, False), (7.5, True)])
    assert kl[0] == round(1.5 / 3, 4) and kl[4] == round(1.5 / 2, 4) and n == [2, 0, 0, 0, 1]
    m = metrik([(0.9, 0.5, True, 3, 2.0), (0.1, 0.5, False, 0, 0.1)])
    kalah = {t: {"brier": .2, "brier_pembanding": .1, "ll": -.3, "ll_pembanding": -.4} for t in TARGET}
    assert menang(kalah) == {t: False for t in TARGET} and menang(dict(kalah, m5=m))["m5"] is True
    assert m["brier"] < m["brier_pembanding"] and m["ll"] > m["ll_pembanding"] and m["n_test"]["amat"] == 3
    assert abs(_poisson_cdf(0, 2.0) - math.exp(-2)) < 1e-12 and abs(_poisson_cdf(400, 400) - 0.5133) < 0.01
    assert kejadian(5.2, [(1.0, 5.0), (8, 6)], "m5", 4.5) == (True, 1) and kejadian(5.2, [(1, 4.4)], "m_1", 4.5) is None
    ev = [{"w": w, "t": _hari(w), "lat": la, "lon": lo, "dalam": 10, "m": mg, "place": "", "kp": "72"} for w, la, lo, mg in
          [("2001-01-01T00:00", 0, 120, 6.0), ("2001-01-01T03:00", 0.1, 120, 4.8), ("2001-01-03T00:00", 5, 120, 4.9), ("2001-01-20T00:00", 0, 120, 4.7)]]
    s = urutan(ev, [0], 7, 4.5)
    assert len(s[0]) == 1 and abs(s[0][0][0] - 0.125) < 1e-9, s  # jauh dan lewat 7 hari dibuang
    assert gempa_utama(ev) == [0]
    # append-only ditolak bila entri lama diubah/hilang
    e0 = {"id": "x", "ramalan": {"m5": {"p": .1}}, "param": P, "dinilai": None}
    gabung_prospektif({"entri": [e0]}, {"entri": [e0, dict(e0, id="y")]})
    for rusak in ({"entri": []}, {"entri": [dict(e0, ramalan={"m5": {"p": .2}})]}):
        try:
            gabung_prospektif({"entri": [e0]}, rusak)
            raise SystemExit("prospektif yang tidak append-only diterima")
        except ValueError:
            pass
    # berkas keluaran (bila ada) sesuai kontrak
    if os.path.exists(MODEL):
        mdl = json.load(open(MODEL))
        for k in ("dibuat", "catatan", "kinerja_uji", "pembanding", "prospektif", "param", "sitasi"):
            assert mdl.get(k) is not None, k
        _cek(mdl["param"])
        assert mdl["terbit_target"] == menang(mdl["kinerja_validasi"]) and mdl["terbit"] == mdl["terbit_target"]["m5"], "status terbit tidak cocok dengan validasi"
        assert mdl["kinerja_uji"]["dibuka"] and mdl["kinerja_uji"]["sidik_param"] == _sidik(mdl["param"])
        assert mdl["terbit_sesuaikan"] == menang_sesuai(mdl["kinerja_sesuaikan"]["per_t1"]) and mdl["rentang_maks_mu"] == RENTANG_MAKS_MU
        assert mdl["kinerja_uji"]["bootstrap_selisih_brier"] and mdl["kinerja_validasi"]["bootstrap_selisih_brier"]
        assert os.path.exists(os.path.join(KELUAR, mdl["prospektif"]))
    if os.path.exists(PROSPEKTIF):
        pr = json.load(open(PROSPEKTIF))
        assert pr["dicatat"] == len(pr["entri"]) and all(x["ramalan"] for x in pr["entri"])
    print("susulan uji OK")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if a == "latih":
        latih("--buka-ulang-uji" in sys.argv)
    elif a == "validasi":
        latih(hanya_validasi=True)
    elif a == "prospektif":
        prospektif()
    elif a == "uji":
        uji()
    else:
        raise SystemExit(__doc__)
