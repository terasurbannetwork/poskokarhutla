"""Klimatologi hujan ekstrem stasiun Indonesia dari NOAA GHCN-Daily -> public/data/iklim_stasiun.json

Sumber : NOAA NCEI GHCN-Daily (https://www.ncei.noaa.gov/pub/data/ghcn/daily/, domain publik, sebut NOAA NCEI). Stasiun berawalan 'ID' (Indonesia),
         elemen PRCP (persepuluh mm), data berbendera mutu (QFLAG) dibuang. Satu berkas per stasiun, jeda 1 dtk. Dijalankan bulanan (statis.yml).
Olahan per stasiun (tahun valid = >= 180 hari berdata; stasiun dengan < 10 tahun valid hanya diberi p95/p99 bila >= 400 hari basah):
  p95, p99      persentil hari basah (>= 1 mm), interpolasi linear (jenis 7)
  rx1day        maksimum tahunan hujan 1 hari
  GEV           L-momen (Hosking 1990) pada maksimum tahunan, bentuk k dibatasi [-0,4; 0,3]; tingkat ulang T = 10 dan 50 tahun
                x_T = xi + alpha/k (1 - (-ln(1 - 1/T))^k); selang 95% bootstrap (300 ulangan) atas tahun
  Sen           kemiringan Theil-Sen (mm/dasawarsa) maksimum tahunan (total tahunan TIDAK dihitung: tahun berlubang membiaskannya); uji Mann-Kendall (normal, tanpa koreksi simpul)
Uji balik GEV (jujur): tiap stasiun dengan >= 10 tahun valid (data Indonesia berlubang: tak ada stasiun >= 30), GEV dilatih pada 70% tahun PERTAMA; tahun uji = 30% terakhir. Frekuensi tahun uji yang
  melewati tingkat-10-tahun dibanding 10% yang diharapkan (selang binomial 95% eksak pada total gabungan). Pembanding naif: kuantil empiris 90% tahun latih.
  Stasiun berkorelasi (musim dan ENSO sama), jadi selang binomial terlalu sempit: vonis LOLOS bila frekuensi GEV dalam selang DAN lebih dekat 10% daripada empiris.
Pakai: python3 scripts/cuaca/iklim_stasiun.py [--unduh] | uji
"""
import datetime as dt, math, os, random, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, baca, simpan

KELUAR = os.path.join(AKAR, "public/data/iklim_stasiun.json")
MENTAH = os.path.join(AKAR, "data/raw/cuaca/ghcnd")
BASIS = "https://www.ncei.noaa.gov/pub/data/ghcn/daily/"
ATRIBUSI = "NOAA NCEI GHCN-Daily (domain publik); olahan GEV, Sen, persentil: Centurisk97"
MIN_HARI = 180   # data PRCP Indonesia di GHCN-D berlubang: dengan 300 hari/tahun nol stasiun lolos 10 tahun (diukur 29 Okt 2026)
MIN_TAHUN = 10
K_MIN, K_MAKS = -0.4, 0.3


# ---------- pengurai ----------
def urai_dly(teks):
    """Berkas .dly -> {tahun: [(bulan, hari, mm)]} untuk PRCP tanpa bendera mutu. Fixed-width: 11 id, 4 tahun, 2 bulan, 4 elemen, 31 x (5 nilai + 3 bendera)."""
    out = {}
    for b in teks.splitlines():
        if len(b) < 269 or b[17:21] != "PRCP":
            continue
        y, m = int(b[11:15]), int(b[15:17])
        for d in range(31):
            o = 21 + d * 8
            v = int(b[o:o + 5])
            if v == -9999 or b[o + 6] != " ":   # hilang atau gagal uji mutu
                continue
            out.setdefault(y, []).append((m, d + 1, v / 10))
    return out


def per_tahun(data):
    """-> {tahun: (rx1day, total, n_hari)} hanya tahun dengan n_hari >= MIN_HARI."""
    return {y: (max(v for _, _, v in r), round(sum(v for _, _, v in r), 1), len(r)) for y, r in data.items() if len(r) >= MIN_HARI}


# ---------- statistik murni ----------
def persentil(xs, p):
    s = sorted(xs)
    if not s:
        return None
    h = (len(s) - 1) * p
    i = int(h)
    return s[i] if i + 1 >= len(s) else s[i] + (h - i) * (s[i + 1] - s[i])


def lmom(xs):
    """L-momen sampel: (l1, l2, t3) dari momen terbobot probabilitas b0, b1, b2."""
    s, n = sorted(xs), len(xs)
    b0 = sum(s) / n
    b1 = sum((i / (n - 1)) * s[i] for i in range(n)) / n
    b2 = sum((i * (i - 1) / ((n - 1) * (n - 2))) * s[i] for i in range(n)) / n
    l2 = 2 * b1 - b0
    return b0, l2, (6 * b2 - 6 * b1 + b0) / l2 if l2 else 0.0


def gev_fit(xs):
    """-> (xi, alpha, k) konvensi Hosking (k > 0: ekor atas berbatas, k < 0: ekor tebal)."""
    l1, l2, t3 = lmom(xs)
    c = 2 / (3 + t3) - math.log(2) / math.log(3)
    k = max(K_MIN, min(K_MAKS, 7.8590 * c + 2.9554 * c * c))
    if abs(k) < 1e-6:
        a = l2 / math.log(2)
        return l1 - 0.5772156649 * a, a, 0.0
    g = math.gamma(1 + k)
    a = l2 * k / ((1 - 2 ** -k) * g)
    return l1 + a * (g - 1) / k, a, k


def gev_kuantil(par, T):
    xi, a, k = par
    y = -math.log(1 - 1 / T)
    return xi - a * math.log(y) if abs(k) < 1e-6 else xi + a / k * (1 - y ** k)


def sen(ys):
    """ys urut tahun (tahun naik, bisa berlubang) [(t, y)] -> (kemiringan Theil-Sen per tahun, p dua sisi Mann-Kendall)."""
    n = len(ys)
    if n < 8:
        return None, None
    sl = [(ys[j][1] - ys[i][1]) / (ys[j][0] - ys[i][0]) for i in range(n) for j in range(i + 1, n) if ys[j][0] != ys[i][0]]
    S = sum((ys[j][1] > ys[i][1]) - (ys[j][1] < ys[i][1]) for i in range(n) for j in range(i + 1, n))
    sd = math.sqrt(n * (n - 1) * (2 * n + 5) / 18)
    z = (S - 1) / sd if S > 0 else (S + 1) / sd if S < 0 else 0.0
    return persentil(sl, .5), math.erfc(abs(z) / math.sqrt(2))


def ci_bootstrap(xs, T, n=300, benih=5):
    rng = random.Random(benih)
    v = sorted(gev_kuantil(gev_fit([rng.choice(xs) for _ in xs]), T) for _ in range(n))
    return v[int(.025 * n)], v[int(.975 * n) - 1]


def binom_ci(n, p=0.1, a=0.025):
    """Selang eksak (kuantil) jumlah kejadian Binomial(n, p) -> (lo, hi)."""
    pmf, c, lo, hi = math.comb(n, 0) * (1 - p) ** n, 0.0, 0, n
    for k in range(n + 1):
        if k:
            pmf = math.comb(n, k) * p ** k * (1 - p) ** (n - k)
        c += pmf
        if c <= a:
            lo = k + 1
        if c >= 1 - a:
            hi = k
            break
    return lo, hi


def uji_balik(deret_stasiun):
    """deret_stasiun: [[rx1day per tahun urut]] (>= 30 tahun). -> dict ringkas uji GEV 10 tahun vs empiris."""
    n_uji = lewat_gev = lewat_emp = n_st = 0
    for xs in deret_stasiun:
        if len(xs) < MIN_TAHUN:
            continue
        m = int(len(xs) * 0.7)
        latih, uji = xs[:m], xs[m:]
        t10 = gev_kuantil(gev_fit(latih), 10)
        emp = persentil(latih, .9)
        n_st += 1
        n_uji += len(uji)
        lewat_gev += sum(1 for v in uji if v > t10)
        lewat_emp += sum(1 for v in uji if v > emp)
    if not n_uji:
        return None
    lo, hi = binom_ci(n_uji)
    fg, fe = lewat_gev / n_uji, lewat_emp / n_uji
    return {"n_stasiun": n_st, "n_stasiun_tahun_uji": n_uji, "diharapkan": 0.1, "frekuensi_gev": round(fg, 3), "frekuensi_empiris": round(fe, 3),
            "selang_binomial_95": [round(lo / n_uji, 3), round(hi / n_uji, 3)],
            "vonis": "LOLOS" if lo <= lewat_gev <= hi and abs(fg - .1) < abs(fe - .1) else "GAGAL",
            "catatan": "stasiun berkorelasi (musim, ENSO sama) sehingga selang binomial terlalu sempit; pembanding naif = kuantil empiris 90% tahun latih"}


# ---------- stasiun ----------
def olah_stasiun(data):
    pt = per_tahun(data)
    if len(pt) < MIN_TAHUN:   # terlalu pendek untuk GEV/tren: hanya persentil hari basah bila cukup
        basah = [v for r in data.values() for _, _, v in r if v >= 1]
        if len(basah) < 400:
            return None
        return {"n_tahun": len(pt), "p95": round(persentil(basah, .95), 1), "p99": round(persentil(basah, .99), 1), "n_hari_basah": len(basah), "catatan": "tanpa GEV/tren: tahun valid < 10"}, None
    th = sorted(pt)
    rx = [pt[t][0] for t in th]
    basah = [v for y in th for _, _, v in data[y] if v >= 1]
    par = gev_fit(rx)
    s_rx, p_rx = sen([(t, pt[t][0]) for t in th])
    r = {"n_tahun": len(th), "catatan": "GEV dari < 20 tahun: selang T50 lebar" if len(th) < 20 else None, "tahun": [th[0], th[-1]], "p95": round(persentil(basah, .95), 1), "p99": round(persentil(basah, .99), 1),
         "rx1day_median": round(persentil(rx, .5), 1), "rx1day_maks": max(rx), "gev": [round(x, 3) for x in par]}
    for T in (10, 50):
        lo, hi = ci_bootstrap(rx, T)
        r[f"t{T}"] = [round(gev_kuantil(par, T), 1), round(lo, 1), round(hi, 1)]
    r["sen_rx1day_mm_dekade"] = None if s_rx is None else round(s_rx * 10, 2)
    r["mk_p_rx1day"] = None if p_rx is None else round(p_rx, 3)
    return r, rx


def daftar_stasiun(teks_stasiun, teks_inv):
    """ghcnd-stations + ghcnd-inventory -> [(id, lat, lon, nama)] stasiun ID dengan PRCP rentang >= MIN_TAHUN tahun."""
    ok = set()
    for b in teks_inv.splitlines():
        p = b.split()
        if len(p) >= 6 and p[0].startswith("ID") and p[3] == "PRCP" and int(p[5]) - int(p[4]) + 1 >= MIN_TAHUN:
            ok.add(p[0])
    out = []
    for b in teks_stasiun.splitlines():
        if b[:2] == "ID" and b[:11] in ok:
            out.append((b[:11], float(b[12:20]), float(b[21:30]), b[41:71].strip().title()))
    return sorted(out)


def unduh(url, ke):
    if not os.path.exists(ke):
        os.makedirs(os.path.dirname(ke), exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 poskokarhutla-iklim"})
        for i in range(4):   # jaringan putus: 4 percobaan, jeda 15/30/60 dtk
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    isi = r.read()
                break
            except Exception:
                if i == 3:
                    raise
                time.sleep(15 * 2 ** i)
        open(ke + ".tmp", "wb").write(isi)
        os.replace(ke + ".tmp", ke)
        time.sleep(1)
    return open(ke, encoding="latin-1").read()


def main():
    st = daftar_stasiun(unduh(BASIS + "ghcnd-stations.txt", os.path.join(MENTAH, "stasiun.txt")), unduh(BASIS + "ghcnd-inventory.txt", os.path.join(MENTAH, "inventaris.txt")))
    hasil, deret, gagal = [], [], []
    for sid, lat, lon, nama in st:
        try:
            o = olah_stasiun(urai_dly(unduh(BASIS + f"all/{sid}.dly", os.path.join(MENTAH, sid + ".dly"))))
        except Exception as e:
            gagal.append(f"{sid}:{str(e)[:60]}")
            continue
        if o:
            hasil.append({"id": sid, "nama": nama, "lat": lat, "lon": lon, **o[0]})
            if o[1]:
                deret.append(o[1])
    if not hasil:
        print("iklim_stasiun: tidak ada stasiun terolah; berkas lama tidak ditimpa", file=sys.stderr)
        sys.exit(1)
    uji = uji_balik(deret)
    naik = [h for h in hasil if h.get("sen_rx1day_mm_dekade") is not None and h["mk_p_rx1day"] < .05]
    simpan(KELUAR, {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"), "atribusi": ATRIBUSI, "lisensi": "NOAA NCEI, domain publik; sebut sumber",
                    "metode": "P95/P99 hari basah >= 1 mm; GEV L-momen pada maksimum tahunan 1 hari (k dibatasi); Sen + Mann-Kendall", "n_stasiun": len(hasil),
                    "uji_balik_gev": uji, "ringkas": {"tren_rx1day_signifikan_p05": len(naik), "dari": len([h for h in hasil if "gev" in h]), "n_dengan_gev": len(deret)}, "gagal": gagal[:10], "stasiun": hasil})
    print(f"iklim_stasiun: {len(hasil)} stasiun; uji balik GEV {uji and uji['vonis']} ({uji})")


def uji():
    # persentil jenis 7
    assert persentil([1, 2, 3, 4], .5) == 2.5 and persentil([5], .9) == 5 and persentil([], .5) is None
    # GEV: sampel besar dari Gumbel (k=0) harus kembali ke xi, alpha dan kuantil T
    rng = random.Random(3)
    xi, a = 50.0, 12.0
    xs = [xi - a * math.log(-math.log(rng.random())) for _ in range(20000)]
    f = gev_fit(xs)
    assert abs(f[0] - xi) < 1 and abs(f[1] - a) < 1 and abs(f[2]) < .05, f
    assert abs(gev_kuantil(f, 50) - (xi - a * math.log(-math.log(1 - 1 / 50)))) < 3
    # GEV ekor tebal k=-0,2: x = xi + a/k (1 - (-ln F)^k)
    k0 = -0.2
    xs = [xi + a / k0 * (1 - (-math.log(rng.random())) ** k0) for _ in range(40000)]
    f = gev_fit(xs)
    assert abs(f[2] - k0) < .05, f
    # Sen: garis lurus y = 2t + 1 -> kemiringan 2 dan p kecil; acak -> p besar
    s, p = sen([(t, 2 * t + 1) for t in range(20)])
    assert abs(s - 2) < 1e-9 and p < .001
    s, p = sen([(t, rng.random()) for t in range(30)])
    assert p > .05 or abs(s) < .1
    # binomial: n=100, p=.1 -> selang kira-kira 4..17
    lo, hi = binom_ci(100)
    assert 3 <= lo <= 5 and 15 <= hi <= 18, (lo, hi)
    # pengurai dly: satu bulan, hari 1 = 25,4 mm, hari 2 = hilang, hari 3 = berbendera mutu
    hari = [f"{254:5d}   ", f"{-9999:5d}   ", f"{100:5d} GS"] + [f"{-9999:5d}   "] * 28
    baris = "IDM00096749" + "2020" + "01" + "PRCP" + "".join(hari)
    assert len(baris) == 269
    assert urai_dly(baris) == {2020: [(1, 1, 25.4)]}
    # uji balik: stasiun stasioner -> frekuensi mendekati 10%
    deret = [[xi - a * math.log(-math.log(rng.random())) for _ in range(40)] for _ in range(60)]
    r = uji_balik(deret)
    assert 0.04 < r["frekuensi_gev"] < 0.2 and r["n_stasiun"] == 60, r
    # stasiun dengan tren naik kuat: GEV latih awal meremehkan -> frekuensi jauh di atas 10% (uji harus bisa gagal)
    tren = [[xi + 1.5 * t - a * math.log(-math.log(rng.random())) for t in range(40)] for _ in range(60)]
    assert uji_balik(tren)["vonis"] == "GAGAL"
    print("iklim_stasiun uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
