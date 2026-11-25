"""TS-04: sumber tsunami untuk genangan. Python 3.12 stdlib saja.

1. Padanan Python public/gempa/tsunami.js: jenis_dasar, ukuran, faktor_dalam, rupture, layak (grid batimetri.bin dibaca stdlib).
   Kesetaraan dengan JS dibuktikan scripts/gempa/uji_js_tsunami.py (fungsi uji_kesetaraan).
2. Okada (1985) deformasi vertikal permukaan (dasar laut) untuk persegi panjang berhingga di setengah ruang elastis, nu = 0,25.
   Rumus uz: Okada 1985 BSSA 75(4) persamaan 25-30 (strike-slip dan dip-slip), notasi Chinnery f||. Hanya komponen vertikal
   (yang menjadi kondisi awal muka air); komponen horizontal tidak dipakai (tanpa efek kemiringan dasar laut, ditulis di Metode).
3. Segmentasi gempa sangat panjang (M >= 8,8): potongan sepanjang strike, slip sama.

Kerangka: x sepanjang strike, y ke arah kemiringan (kanan strike, Aki-Richards), rake 90 = naik (thrust), 0 = geser kiri-lateral per Okada.
Satuan km, slip m. Hasil uz dalam m (+ = naik).
BUKAN peringatan; BUKAN prakiraan. Geometri bawaan (atas bidang) adalah bawaan Q11, belum teruji.

Pakai:  python3 scripts/gempa/tsunami_sumber.py uji
"""
import math, os, struct, sys, json

RB = 6371008.8
RAD = math.pi / 180
MU = 3e10
DIP = {"subduksi": 15, "naik": 35, "turun": 60, "geser": 90}
KJ = {"subduksi": 1, "naik": 1, "turun": 1, "geser": 0.2}
TANDA = {"subduksi": 1, "naik": 1, "turun": -1, "geser": 1}
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../public/gempa/data/")
POISSON_MU_LM = 0.5  # mu/(lambda+mu) untuk padatan Poisson (lambda = mu, nu = 0,25)


# ---------- padanan tsunami.js ----------
def jenis_dasar(j):
    j = str(j if j else "subduksi")
    import re
    if re.search("geser", j):
        return "geser"
    if re.search("turun|normal", j):
        return "turun"
    if re.search("naik|kerak|reverse", j):
        return "naik"
    return "subduksi"


def ukuran(m, jenis):
    """Panjang dan lebar rupture (km): Strasser dkk. 2010 (antarmuka), Wells dan Coppersmith 1994 (kerak)."""
    j = jenis_dasar(jenis)
    p = {"subduksi": (-2.477, 0.585, -0.882, 0.351), "geser": (-2.57, 0.62, -0.76, 0.27),
         "naik": (-2.42, 0.58, -1.61, 0.41), "turun": (-1.88, 0.50, -1.14, 0.35)}[j]
    L, W = 10 ** (p[0] + p[1] * m), 10 ** (p[2] + p[3] * m)
    W = min(W, (50 if j == "subduksi" else 20) / math.sin(DIP[j] * RAD))
    return {"L": L, "W": W}


def faktor_dalam(dalam, jenis):
    b = (30, 50) if jenis_dasar(jenis) == "subduksi" else (20, 40)
    d = 10 if dalam is None else dalam
    return 1 if d <= b[0] else 0 if d >= b[1] else 1 - (d - b[0]) / (b[1] - b[0])


def rupture(e):
    """e = {lat, lon, m, dalam?, jenis?, strike?, dip?} -> dict yang sama dengan Tsunami.rupture."""
    j = jenis_dasar(e.get("jenis"))
    uk = ukuran(e["m"], j)
    dip = e["dip"] if e.get("dip") is not None else DIP[j]
    M0 = 10 ** (1.5 * e["m"] + 9.1)
    D = M0 / (MU * uk["L"] * uk["W"] * 1e6)
    Wh = max(2, uk["W"] * math.cos(dip * RAD))
    L = uk["L"]
    if e.get("strike") is None:
        L = Wh = math.sqrt(uk["L"] * Wh)
    kd = faktor_dalam(e.get("dalam"), j)
    return {"lat": e["lat"], "lon": e["lon"], "m": e["m"], "jenis": j, "dip": dip, "strike": 0 if e.get("strike") is None else e["strike"],
            "L": L, "W": uk["W"], "Wh": Wh, "M0": M0, "slip": D, "kd": kd, "dalam": e.get("dalam"),
            "angkat": TANDA[j] * D * math.sin(dip * RAD) * KJ[j] * kd, "kj": KJ[j]}


def _lokal(r, lat, lon):
    x = (lon - r["lon"]) * RAD * RB / 1000 * math.cos(r["lat"] * RAD)
    y = (lat - r["lat"]) * RAD * RB / 1000
    s = r["strike"] * RAD
    return x * math.sin(s) + y * math.cos(s), x * math.cos(s) - y * math.sin(s)


def jarak_rupture(r, lat, lon):
    u, v = _lokal(r, lat, lon)
    return math.hypot(max(0, abs(u) - r["L"] / 2), max(0, abs(v) - r["Wh"] / 2))


def muat_grid(dasar=DATA):
    meta = json.load(open(dasar + "batimetri.json"))
    raw = open(dasar + "batimetri.bin", "rb").read()
    n = meta["nx"] * meta["ny"]
    assert len(raw) == 2 * n, f"batimetri.bin {len(raw)} byte, harap {2 * n}"
    return {"lon0": meta["lon0"], "lat0": meta["lat0"], "d": meta["d"], "nx": meta["nx"], "ny": meta["ny"], "z": struct.unpack("<%dh" % n, raw)}


def layak(e, G=None):
    """Setara Tsunami.layak: M >= 6,5; dalam < 100 km; faktor kedalaman > 0; jejak <= 20 km dari sel laut (bila grid ada)."""
    if not e or not (e["m"] >= 6.5) or not (e.get("dalam") is None or e["dalam"] < 100) or faktor_dalam(e.get("dalam"), e.get("jenis")) <= 0:
        return False
    if G is None:
        return True
    r = rupture(e)
    rad = (math.hypot(r["L"], r["Wh"]) / 2 + 20) / 111.19
    kc = max(0.2, math.cos(r["lat"] * RAD))
    d, nx, ny = G["d"], G["nx"], G["ny"]
    j0, j1 = max(0, math.floor((r["lat"] - rad - G["lat0"]) / d)), min(ny - 1, math.ceil((r["lat"] + rad - G["lat0"]) / d))
    i0, i1 = max(0, math.floor((r["lon"] - rad / kc - G["lon0"]) / d)), min(nx - 1, math.ceil((r["lon"] + rad / kc - G["lon0"]) / d))
    for j in range(j0, j1 + 1):
        for i in range(i0, i1 + 1):
            if G["z"][j * nx + i] < 0 and jarak_rupture(r, G["lat0"] + j * d, G["lon0"] + i * d) <= 20:
                return True
    return False


# ---------- Okada 1985, uz permukaan ----------
def _f_uz(xi, eta, q, dip, jenis):
    """Integran uz (tanpa faktor -U/2pi) pada satu sudut Chinnery. jenis 'strike' | 'dip'."""
    s, c = math.sin(dip), math.cos(dip)
    R = math.sqrt(xi * xi + eta * eta + q * q)
    X = math.sqrt(xi * xi + q * q)
    dt = eta * s - q * c
    if R == 0:
        return 0.0
    # ln(R+eta) singular bila R+eta = 0 (xi = q = 0, eta < 0): pakai -ln(R-eta) (Okada 1985)
    ln_Reta = math.log(R + eta) if (R + eta) > 1e-12 * max(R, 1e-30) else -math.log(R - eta)
    sudut = math.atan(xi * eta / (q * R)) if abs(q) > 1e-12 * R else 0.0
    I4 = POISSON_MU_LM / c * (math.log(R + dt) - s * ln_Reta)
    if jenis == "strike":
        suku = dt * q / (R * (R + eta)) + q * s / (R + eta) if (R + eta) > 1e-12 * R else 0.0  # q = 0 bila R + eta = 0
        return suku + I4 * s
    I5 = 0.0 if abs(xi) < 1e-12 * R else POISSON_MU_LM * 2 / c * math.atan((eta * (X + q * c) + X * (R + X) * s) / (xi * (R + X) * c))
    return dt * q / (R * (R + xi)) + s * sudut - I5 * s * c


def okada_uz(x, y, L, W, atas, dip_deg, rake_deg, slip):
    """uz (m) di (x, y) km. Bidang: x dari -L/2 sampai L/2 sepanjang strike; tepi atas pada kedalaman `atas` km,
    miring ke +y (kanan strike) dengan sudut dip_deg; proyeksi horizontal Wh = W cos(dip) berpusat di y = 0. Slip m, rake 90 = naik."""
    dip = min(dip_deg, 89.9) * RAD  # cos(dip) = 0 singular di rumus I4 dan I5 (dip 90 tegak murni)
    s, c = math.sin(dip), math.cos(dip)
    Wh = W * c
    d = atas + W * s  # kedalaman sudut bawah (titik acuan Okada)
    # Okada: x sepanjang strike, y ke KIRI strike, bidang miring ke kanan (-y), titik acuan = sudut bawah (kedalaman d) di y_o = -Wh/2.
    # Kerangka kita y ke KANAN (sisi miring), jadi y_o = -y.
    xs, ys = x + L / 2, -y + Wh / 2
    p, q = ys * c + d * s, ys * s - d * c
    total = 0.0
    for jenis, u in (("strike", slip * math.cos(rake_deg * RAD)), ("dip", slip * math.sin(rake_deg * RAD))):
        if abs(u) < 1e-12:
            continue
        f = _f_uz
        v = (f(xs, p, q, dip, jenis) - f(xs, p - W, q, dip, jenis) - f(xs - L, p, q, dip, jenis) + f(xs - L, p - W, q, dip, jenis))
        total += -u / (2 * math.pi) * v
    return total


def deformasi(r, lat, lon, atas=None, rake=None, slip=None):
    """uz (m) di (lat, lon) untuk rupture r (hasil rupture()). Tanpa pengali faktor_dalam (ALGORITMA 2): kedalaman atas bidang yang menentukan.
    atas bawaan (Q11, bawaan sementara): pusat bidang pada kedalaman dalam-hiposenter (10 km bila kosong) -> atas = max(0,5; dalam - W sin(dip)/2)."""
    j = r["jenis"]
    dip = r["dip"]
    if atas is None:
        atas = max(0.5, (10 if r.get("dalam") is None else r["dalam"]) - r["W"] * math.sin(dip * RAD) / 2)
    if rake is None:
        if j == "geser":  # suku strike-slip I4 belum divalidasi (TS-04): tolak sampai diperiksa ke Okada 1985
            raise ValueError("deformasi geser belum teruji; berikan rake eksplisit hanya untuk riset")
        rake = {"subduksi": 90, "naik": 90, "turun": -90}[j]
    u, v = _lokal(r, lat, lon)
    return okada_uz(u, v, r["L"], r["W"], atas, dip, rake, r["slip"] if slip is None else slip)


def segmentasi(r, panjang_seg_km=100.0, atas=None):
    """Pecah rupture panjang sepanjang strike menjadi segmen sama panjang (<= panjang_seg_km, bawaan sementara 100 km), slip sama.
    Garis lurus (tanpa lengkung palung), batas tertulis di Metode. Mengembalikan daftar dict rupture dengan pusat baru dan L = panjang segmen."""
    n = max(1, math.ceil(r["L"] / panjang_seg_km))
    L = r["L"] / n
    s = r["strike"] * RAD
    out = []
    for k in range(n):
        o = (k + 0.5) * L - r["L"] / 2  # km sepanjang strike dari pusat
        dlat = o * math.cos(s) / 111.19
        dlon = o * math.sin(s) / (111.19 * max(0.2, math.cos(r["lat"] * RAD)))
        seg = dict(r)
        seg.update({"lat": r["lat"] + dlat, "lon": r["lon"] + dlon, "L": L})
        out.append(seg)
    return out


def deformasi_segmen(segs, lat, lon, **kw):
    return sum(deformasi(s, lat, lon, **kw) for s in segs)


# ---------- uji ----------
def _uz_titik(x, y, dip, d, jenis):
    """uz permukaan akibat sumber titik Okada 1985 (per satuan U*dS), kerangka Okada (y kiri strike, miring ke -y). Dipakai SEBAGAI PEMBANDING
    INDEPENDEN integrasi numerik atas bidang; tidak dipakai di jalur produksi. Bentuk sama dengan _strike_pt_slip/_dip_pt_slip GeoClaw (BSD)."""
    s, c = math.sin(dip), math.cos(dip)
    p, q = y * c + d * s, y * s - d * c
    R = math.sqrt(x * x + y * y + d * d)
    a = POISSON_MU_LM
    if jenis == "dip":
        I5 = a * (1 / (R * (R + d)) - x * x * (2 * R + d) / (R ** 3 * (R + d) ** 2))
        return -(3 * d * p * q / R ** 5 - I5 * s * c) / (2 * math.pi)
    I4 = a * (x / R ** 3 - x * y * (2 * R + d) / (R ** 3 * (R + d) ** 2))
    return -(3 * x * d * q / R ** 5 + I4 * s) / (2 * math.pi)


def _uz_bidang_numerik(x, y, L, W, atas, dip_deg, jenis, n=120):
    """Integral titik-sumber atas bidang (titik tengah n x n) di kerangka kita (y kanan)."""
    dip = dip_deg * RAD
    s, c = math.sin(dip), math.cos(dip)
    Wh = W * c
    d_bawah = atas + W * s
    yo = -y  # kerangka Okada
    tot = 0.0
    for i in range(n):
        xs = -L / 2 + (i + 0.5) * L / n
        for j in range(n):
            eta = (j + 0.5) * W / n  # jarak naik-kemiringan dari sudut bawah
            yf = -Wh / 2 + eta * c  # posisi y Okada bidang: sudut bawah di y_o = -Wh/2, naik ke +y_o
            tot += _uz_titik(x - xs, yo - yf, dip, d_bawah - eta * s, jenis)
    return tot * (L / n) * (W / n)


def uji():
    assert globals()["POISSON_MU_LM"] == 0.5  # literal terpisah: nu = 0,25
    try:
        deformasi({"jenis": "geser", "dip": 90, "W": 10, "L": 20, "slip": 1, "dalam": 10}, 0, 0)
        raise AssertionError("geser harus ditolak")
    except ValueError:
        pass
    # 1. Okada dip-slip lawan integrasi numerik sumber titik Okada 1985 atas bidang (pembanding independen: rumus titik tidak berbagi
    #    penjumlahan Chinnery maupun suku I4/I5 versi hingga). Cocok dalam 0,5 persen dari puncaknya.
    kasus = ((0, -10, 60, 40, 5, 15), (10, 20, 60, 40, 5, 15), (0, 0, 30, 20, 2, 35), (-25, 8, 40, 15, 3, 60), (5, -3, 40, 15, 3, 80))
    for x, y, L, W, atas, dip in kasus:
        a_ = okada_uz(x, y, L, W, atas, dip, 90, 1.0)
        b_ = _uz_bidang_numerik(x, y, L, W, atas, dip, "dip", n=80)
        assert abs(a_ - b_) < 0.005 * max(abs(a_), abs(b_), 0.05), (x, y, dip, a_, b_)
    # tanda: thrust naik di atas bagian dangkal, sesar turun kebalikannya
    for dip, atas, L, W in ((15, 5.0, 60.0, 40.0), (35, 2.0, 40.0, 20.0), (60, 1.0, 30.0, 15.0)):
        assert okada_uz(0, -W * math.cos(dip * RAD) / 4, L, W, atas, dip, 90, 3) > 0
        assert okada_uz(0, -W * math.cos(dip * RAD) / 4, L, W, atas, dip, -90, 3) < 0
    # 2. geser murni: suku inti (tanpa I4, mu/(lambda+mu) = 0) cocok dengan sumber titik; suku I4 BELUM divalidasi independen
    #    (GeoClaw _strike_pt_slip tidak cocok dengan versi hingga; sumber salah belum dipastikan), jadi uz geser dengan I4 hanya
    #    diperiksa simetri dan linearitas. Jalur tsunami memakai dip-slip.
    global POISSON_MU_LM
    simpan, POISSON_MU_LM = POISSON_MU_LM, 0.0
    try:
        for x, y, L, W, atas, dip in kasus[1:4]:
            a_, b_ = okada_uz(x, y, L, W, atas, dip, 0, 1.0), _uz_bidang_numerik(x, y, L, W, atas, dip, "strike", n=80)
            assert abs(a_ - b_) < 0.005 * max(abs(a_), abs(b_), 0.05), (x, y, dip, a_, b_)
    finally:
        POISSON_MU_LM = simpan
    L, W, atas, dip = 40.0, 15.0, 3.0, 80
    assert abs(okada_uz(7, 11, L, W, atas, dip, 0, 1.0) + okada_uz(-7, 11, L, W, atas, dip, 0, 1.0)) < 1e-9
    assert abs(okada_uz(3, 5, 20, 10, 2, 30, 90, 4.0) - 4 * okada_uz(3, 5, 20, 10, 2, 30, 90, 1.0)) < 1e-12
    # 3. dip-slip simetris terhadap x -> -x (bidang terpusat) dan nol jauh dari bidang
    assert abs(okada_uz(9, -4, 50, 30, 4, 25, 90, 2) - okada_uz(-9, -4, 50, 30, 4, 25, 90, 2)) < 1e-9
    assert abs(okada_uz(3000, 3000, 50, 30, 4, 25, 90, 2)) < 1e-5 and abs(okada_uz(-5000, 0, 50, 30, 4, 25, 90, 2)) < 1e-5
    # 4. ganda: rotasi strike tidak mengubah volume, dan deformasi() memakai pusat rupture; pusat naik di sekitar jejak, turun di sisi darat
    e = {"lat": -9.75, "lon": 110.6, "m": 8.5, "dalam": 25, "jenis": "subduksi", "strike": 276}
    r = rupture(e)
    assert 100 < r["L"] < 400 and r["slip"] > 3 and abs(r["angkat"] - r["slip"] * math.sin(15 * RAD)) < 1e-9
    assert deformasi(r, r["lat"] - 0.3, r["lon"]) > 0.5, "bidang terlalu jauh dari titik di atas jejak"
    # 4b. volume angkatan positif Okada vs hitungan peramban (angkat x L x Wh): ukuran 24 Nov 2026: M8,0 0,95; M8,5 0,80; M8,8 0,72 (subduksi),
    #     naik M7,0-7,5 0,66-0,68. Batas TS-04 (bawaan sementara): 0,5 sampai 1,2. Di luar itu harus dijelaskan, bukan disembunyikan.
    rv = rupture({"lat": 0, "lon": 100, "m": 8.0, "dalam": 25, "jenis": "subduksi", "strike": 0})
    h = 5.0
    atas = max(0.5, 25 - rv["W"] * math.sin(rv["dip"] * RAD) / 2)
    pos = sum(max(0.0, okada_uz(i * h, k * h, rv["L"], rv["W"], atas, rv["dip"], 90, rv["slip"])) * h * h
              for i in range(-int(rv["L"] / 2 / h) - 12, int(rv["L"] / 2 / h) + 12) for k in range(-int(rv["W"] / h) - 12, int(rv["W"] / h) + 12))
    rasio = pos / (rv["angkat"] * rv["L"] * rv["Wh"])
    assert 0.5 < rasio < 1.2, ("volume angkatan Okada lawan Tsunami.rupture", rasio)
    # 5. segmentasi: potensi total (L x segmen) sama; jumlah segmen M9,1
    r91 = rupture({"lat": 3.3, "lon": 95.9, "m": 9.1, "dalam": 25, "jenis": "subduksi", "strike": 335})
    sg = segmentasi(r91)
    assert abs(sum(s["L"] for s in sg) - r91["L"]) < 1e-9 and len(sg) == math.ceil(r91["L"] / 100) >= 7, len(sg)
    assert len(segmentasi(r)) >= 2
    # 6. padanan layak: gempa darat, dalam, kecil; tanpa grid cukup M dan dalam
    assert layak({"lat": -9.75, "lon": 110.6, "m": 8.5, "dalam": 25, "jenis": "subduksi"}) and not layak({"lat": 0, "lon": 0, "m": 6.2, "dalam": 10})
    assert not layak({"lat": 0, "lon": 0, "m": 8, "dalam": 150}) and not layak({"lat": 0, "lon": 0, "m": 7.5, "dalam": 45, "jenis": "naik"})
    if os.path.exists(DATA + "batimetri.bin"):
        G = muat_grid()
        assert layak(e, G) and not layak({"lat": -6.83, "lon": 107.62, "m": 6.8, "dalam": 10, "jenis": "geser"}, G)
        assert not layak({"lat": 0.5, "lon": 114.0, "m": 7.5, "dalam": 15, "jenis": "naik"}, G)
    print("tsunami_sumber uji OK; rasio volume positif Okada/JS M8,0 =", round(rasio, 2), "; segmen M9,1 =", len(sg), "; slip M8,5 =", round(r["slip"], 2), "m")


if __name__ == "__main__":
    uji() if len(sys.argv) < 2 or sys.argv[1] == "uji" else sys.exit("pakai: uji")
