"""Prediksi sebaran abu gunung api 72 jam (model Lagrangian sederhana) -> public/banjir/data/abu_gunungapi.json.

SKENARIO, bukan peramalan letusan: tiap gunung level >= II diandaikan meletus SEKARANG dengan kolom setinggi
yang dipakai di bawah, lalu partikel abu dibawa angin ECMWF IFS 0,25 (Open-Meteo, lapisan tekanan 850..200 hPa).
Jejak yang tampil di layar harus diberi label "skenario", bukan "awan abu saat ini". Tidak menggantikan
advisory VAAC Darwin (BoM) / VONA PVMBG; hanya untuk gambaran arah dan jangkauan kasar.

Tinggi kolom (m di atas puncak):
  1. letusan MAGMA terbaru gunung itu yang menuliskan tinggi kolom abu, bila terjadi <= 48 jam lalu;
  2. selain itu asumsi per level: II = 1000, III = 2000, IV = 5000. Alasan: kolom teramati harian pada status
     Waspada/Siaga umumnya 300-1500 m (Semeru, Ibu, Lewotobi, Ili Lewotolok), erupsi besar level Awas
     (Sinabung 2018, Merapi 2010) 5-10 km; nilai ini perkiraan kasar, dicatat di `kolom_sumber`.
Durasi pelepasan 3 jam (asumsi).

Model (dt 15 menit, RNG mulberry32 seed tetap; port JS setara: public/gunungapi/abu_model.js):
  - n partikel dilepas rata sepanjang durasi, ketinggian menurut sebaran vertikal Suzuki (Suzuki 1983; Pfeiffer dkk. 2005):
    massa(z) ~ [(1 - z/H) exp(A (z/H - 1))]^k, A=4, k=5 (puncak di 0,75 H).
  - adveksi Euler: angin dari profil 8 lapisan, interpolasi linear terhadap waktu (jam) lalu terhadap ketinggian
    (tinggi geopotensial tiap lapisan ikut bervariasi); di luar lapisan paling bawah/atas dipegang nilai tepi.
  - difusi horizontal acak (random walk): langkah = sqrt(2 K_h dt) * N(0,1) per sumbu, K_h = KH_M2S = 1000 m2/s.
    K_h ASUMSI (rentang tipikal 1e2..1e4 m2/s untuk dispersi tefra skala regional), tidak dikalibrasi.
  - pengendapan: 4 kelas butir dengan kecepatan jatuh tetap (Stokes dibulatkan, butir besar dikurangi hambatan
    non-Stokes secara kasar): 10 um 0,008 m/s (40%), 30 um 0,07 (30%), 100 um 0,5 (20%), 250 um 1,5 (10%).
    Pecahan massa kelas ASUMSI. Mendarat bila z <= 0 (muka laut; ponytail: tanpa DEM, tanah dianggap 0 m).
  - tanpa gerak vertikal angin, tanpa hujan/pencucian, tanpa agregasi abu. Hasil = bentuk kasar, bukan konsentrasi.
Ambang beban kolom (menjawab: "seberapa pekat sampai berbahaya bagi penerbangan"):
  - massa terlepas M = MER x durasi; MER = 2500 x (H_km/2)^(1/0,241) kg/s (Mastin dkk. 2009: H = 2,00 V^0,241, H km di atas
    kawah, V laju volume DRE m3/s, 2500 kg/m3). Contoh: H 1 km = 141 kg/s, 2 km = 2.500, 5 km ~ 1,1e5, 10 km ~ 1,5e6.
    Asumsi: MER tetap selama durasi 3 jam, seluruh massa dianggap abu halus terbawa (tanpa agregasi/pencucian).
  - tiap partikel melayang membawa M/n. Per jam, massa dijumlah per sel kisi 0,1 derajat. Sel LOLOS bila massa sel >=
    2 mg/m3 x 2000 m x luas sel (2 mg/m3 = batas bawah "kontaminasi sedang" pedoman ICAO/CAA; tebal awan 2 km ASUMSI).
  - konsekuensi jujur: letusan kecil (kolom <~ 1 km, M ~ 1e6 kg) hampir tidak pernah punya sel lolos -> jejak kosong. Itu
    artinya "tidak mencapai ambang penerbangan", BUKAN "tidak ada abu". Resolusi: n=1500 partikel, sehingga ambang diukur
    dalam kelipatan massa M/n; derau sampling besar di dekat ambang, karena itu jejak sah hanya bila >= 5 sel lolos
    (uji 8 seed n=1500: 1-4 sel menggeser jangkauan 185-351 km). n produksi = 5000.
Jejak per jam 6/12/24/48/72 (`jejak`, berambang): poligon = selubung cembung sudut-sudut sel lolos; arah_deg = arah titik tengah
sel lolos (berbobot jumlah partikel) dari kawah (0 = utara, searah jarum jam); jangkau_km = jarak terjauh pusat sel lolos.
`jejak_tipis` = sebaran mentah tanpa ambang (partikel melayang, persentil 90 jarak): hanya untuk simulasi/animasi.
Bandara: jam_tiba = jam pertama (cuplikan per jam) ada sel lolos (partikel <= FL350 = 10.668 m saja) yang pusatnya dalam 25 km
  bandara. Batas: awan yang melintas < 1 jam di antara dua cuplikan bisa terlewat.

Pakai:  python3 scripts/gunungapi/abu.py          (jalan sungguhan; butuh jaringan)
        python3 scripts/gunungapi/abu.py ulang    (hitung ulang dari angin tersimpan, tanpa jaringan)
        python3 scripts/gunungapi/abu.py uji      (self-check murni)
        python3 scripts/gunungapi/abu.py bandara  (bangun public/gunungapi/data/bandara.json dari OurAirports)
"""
import csv, datetime as dt, io, json, math, os, sys, time, urllib.error, urllib.parse, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KELUAR = os.path.join(AKAR, "public/banjir/data/abu_gunungapi.json")
STATUS = os.path.join(AKAR, "public/banjir/data/gunungapi_status.json")
BANDARA = os.path.join(AKAR, "public/gunungapi/data/bandara.json")
METAR = os.path.join(AKAR, "public/data/metar.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
WIB = dt.timezone(dt.timedelta(hours=7))
M32 = 0xFFFFFFFF
R_BUMI = 6371000.0
HPA = (850, 700, 600, 500, 400, 300, 250, 200)
KH_M2S = 1000.0
SUZUKI_A, SUZUKI_K, SUZUKI_BIN = 4.0, 5.0, 100
KELAS = ((0.40, 0.008), (0.30, 0.07), (0.20, 0.5), (0.10, 1.5))  # (pecahan massa, kecepatan jatuh m/s)
KOLOM_LEVEL = {2: 1000, 3: 2000, 4: 5000}
DURASI_LEPAS_JAM = 3
FL350_M = 10668.0
RADIUS_BANDARA_KM = 25.0
JAM_JEJAK = (6, 12, 24, 48, 72)
SEL_DEG = 0.1            # kisi beban kolom
AMBANG_MGM3 = 2.0        # mg/m3: ambang abu penerbangan (batas bawah "kontaminasi sedang" ICAO/CAA; ASUMSI pilihan)
TEBAL_AWAN_M = 2000.0    # ketebalan efektif awan untuk mengubah massa per luas menjadi konsentrasi (ASUMSI)
MIN_SEL = 5              # jejak berambang sah hanya bila >= MIN_SEL sel lolos (derau sampling di dekat ambang: 1-4 sel tak stabil antar seed)
N_PRODUKSI = 5000        # partikel per gunung pada jalan sungguhan
RHO_DRE = 2500.0         # kg/m3, massa jenis batuan padat (DRE) pada Mastin dkk. 2009
OPENMETEO = "https://api.open-meteo.com/v1/forecast"
SUMBER = [
    {"nama": "Open-Meteo (ECMWF IFS 0,25) angin lapisan tekanan 850-200 hPa", "url": "https://open-meteo.com/en/docs/ecmwf-api"},
    {"nama": "MAGMA Indonesia, PVMBG (status dan letusan)", "url": "https://magma.esdm.go.id"},
    {"nama": "OurAirports (bandara)", "url": "https://ourairports.com/data/"},
]


# ---------- RNG (kembar dengan abu_model.js) ----------
def mulberry32(seed):
    s = [seed & M32]

    def f():
        s[0] = (s[0] + 0x6D2B79F5) & M32
        a = s[0]
        t = ((a ^ (a >> 15)) * (a | 1)) & M32
        t = (((t + (((t ^ (t >> 7)) * (t | 61)) & M32)) & M32) ^ t) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296.0
    return f


# ---------- fungsi murni ----------
def uv(kec, arah_deg):
    """Kecepatan + arah ASAL angin (derajat, konvensi meteorologi) -> u (ke timur), v (ke utara)."""
    r = math.radians(arah_deg)
    return -kec * math.sin(r), -kec * math.cos(r)


def profil(angin, t_s):
    """Profil angin pada detik t_s sejak angin.mulai: [(z, u, v)] urut z naik; waktu diinterpolasi linear, ujung dipegang."""
    lapis = angin["lapis"]
    n = len(lapis[0]["u"])
    h = t_s / 3600.0
    if h >= n - 1:
        i, f = n - 1, 0.0
    else:
        i = int(h)
        f = h - i
    j = min(i + 1, n - 1)
    out = []
    for L in lapis:
        out.append((L["z_m"][i] * (1 - f) + L["z_m"][j] * f, L["u"][i] * (1 - f) + L["u"][j] * f, L["v"][i] * (1 - f) + L["v"][j] * f))
    out.sort(key=lambda x: x[0])
    return out


def angin_di(p, z):
    """Interpolasi linear terhadap ketinggian; di luar rentang dipegang nilai lapisan tepi."""
    if z <= p[0][0]:
        return p[0][1], p[0][2]
    if z >= p[-1][0]:
        return p[-1][1], p[-1][2]
    for k in range(len(p) - 1):
        z0, z1 = p[k][0], p[k + 1][0]
        if z < z1:
            w = (z - z0) / (z1 - z0)
            return p[k][1] * (1 - w) + p[k + 1][1] * w, p[k][2] * (1 - w) + p[k + 1][2] * w
    return p[-1][1], p[-1][2]


def tabel_suzuki():
    d = [((1 - (i + .5) / SUZUKI_BIN) * math.exp(SUZUKI_A * ((i + .5) / SUZUKI_BIN - 1))) ** SUZUKI_K for i in range(SUZUKI_BIN)]
    c, a = [], 0.0
    for x in d:
        a += x
        c.append(a)
    return d, c


def suzuki_s(u, d, c):
    """Invers CDF tabel Suzuki -> s = z/H dalam [0,1]."""
    tgt = u * c[-1]
    for j in range(len(c)):
        if c[j] >= tgt:
            prev = c[j - 1] if j else 0.0
            return (j + (tgt - prev) / d[j]) / SUZUKI_BIN
    return 1.0


def mer_kg_s(kolom_m):
    """Laju lepas massa (kg/s) dari tinggi kolom di atas kawah: Mastin dkk. 2009, H = 2,00 V^0,241 (H km, V m3/s DRE)
    -> V = (H/2)^(1/0,241); MER = V * 2500. H = 1 km ~ 141 kg/s; 2 km = 2.500; 5 km ~ 1,1e5; 10 km ~ 1,5e6 kg/s."""
    return RHO_DRE * (max(kolom_m, 0.0) / 1000.0 / 2.0) ** (1.0 / 0.241)


def jalankan(lat, lon, puncak_m, kolom_m, angin, durasi_jam=DURASI_LEPAS_JAM, jam=72, n=2000, seed=1, dt_menit=15, kh=KH_M2S):
    """Kembaran abu_model.js jalankan(). Mengembalikan {jam, snap[{jam, lon, lat, z, aktif, darat}], lepas, vent}."""
    assert 60 % dt_menit == 0, "dt_menit harus pembagi 60"
    dt_s = dt_menit * 60.0
    spj = 60 // dt_menit
    rng = mulberry32(seed)
    d, c = tabel_suzuki()
    k_rel = max(1, int(round(durasi_jam * 3600 / dt_s)))
    rel = [i * k_rel // n for i in range(n)]
    z = [0.0] * n
    vt = [0.0] * n
    for i in range(n):
        z[i] = puncak_m + suzuki_s(rng(), d, c) * kolom_m
        u, acc = rng(), 0.0
        vt[i] = KELAS[-1][1]
        for frac, v in KELAS:
            acc += frac
            if u < acc:
                vt[i] = v
                break
    px, py = [lon] * n, [lat] * n
    st = [0] * n  # 0 belum dilepas, 1 melayang, 2 mendarat
    sig = math.sqrt(2.0 * kh * dt_s)
    snaps, nxt = [], 0
    for step in range(jam * spj + 1):
        while nxt < n and rel[nxt] == step:
            st[nxt] = 1
            nxt += 1
        if step % spj == 0:
            snaps.append({"jam": step // spj, "lon": list(px), "lat": list(py), "z": list(z),
                          "aktif": [1 if s == 1 else 0 for s in st], "darat": [1 if s == 2 else 0 for s in st]})
        if step == jam * spj:
            break
        p = profil(angin, step * dt_s + dt_s / 2)
        for i in range(n):
            if st[i] != 1:
                continue
            u, v = angin_di(p, z[i])
            r = math.sqrt(-2.0 * math.log(1.0 - rng()))
            a = 2.0 * math.pi * rng()
            dx = u * dt_s + sig * r * math.cos(a)
            dy = v * dt_s + sig * r * math.sin(a)
            py0 = py[i]
            py[i] = py0 + math.degrees(dy / R_BUMI)
            px[i] += math.degrees(dx / (R_BUMI * math.cos(math.radians(py0))))
            z[i] -= vt[i] * dt_s
            if z[i] <= 0:
                z[i], st[i] = 0.0, 2
    return {"jam": list(range(jam + 1)), "snap": snaps, "lepas": [r * dt_s / 3600.0 for r in rel], "vent": {"lat": lat, "lon": lon},
            "massa_kg": mer_kg_s(kolom_m) * durasi_jam * 3600.0, "n": n}


def _proyeksi(vent):
    ky = math.radians(1) * R_BUMI / 1000.0
    return ky * math.cos(math.radians(vent["lat"])), ky


def selubung(pts):
    """Selubung cembung (monotone chain) dari [(x,y)]; urut berlawanan jarum jam."""
    p = sorted(set(pts))
    if len(p) < 3:
        return p

    def silang(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    bwh, ats = [], []
    for q in p:
        while len(bwh) >= 2 and silang(bwh[-2], bwh[-1], q) <= 0:
            bwh.pop()
        bwh.append(q)
    for q in reversed(p):
        while len(ats) >= 2 and silang(ats[-2], ats[-1], q) <= 0:
            ats.pop()
        ats.append(q)
    return bwh[:-1] + ats[:-1]


def sel_berambang(hasil, jam, maks_z=None):
    """Sel kisi SEL_DEG yang beban kolomnya melampaui ambang AMBANG_MGM3 pada jam itu: [(i, j, jumlah partikel)].
    Tiap partikel melayang membawa massa_kg/n (massa total lepas = MER Mastin x durasi). Ambang massa sel =
    AMBANG_MGM3 mg/m3 x TEBAL_AWAN_M x luas sel (luas memakai lintang pusat sel). Dinormalkan terhadap massa terlepas:
    sel lolos bila jumlah_partikel x massa_kg/n >= ambang massa sel. maks_z: hanya partikel setinggi itu ke bawah (bandara)."""
    s = next(x for x in hasil["snap"] if x["jam"] == jam)
    w = hasil["massa_kg"] / hasil["n"]
    cnt = {}
    for i in range(len(s["lon"])):
        if s["aktif"][i] and (maks_z is None or s["z"][i] <= maks_z):
            k = (math.floor(s["lon"][i] / SEL_DEG), math.floor(s["lat"][i] / SEL_DEG))
            cnt[k] = cnt.get(k, 0) + 1
    sisi = math.radians(SEL_DEG) * R_BUMI
    out = []
    for (ci, cj), c in cnt.items():
        luas = sisi * sisi * math.cos(math.radians((cj + .5) * SEL_DEG))
        if c * w >= AMBANG_MGM3 * 1e-6 * TEBAL_AWAN_M * luas:
            out.append((ci, cj, c))
    return out


def jejak(hasil, jam):
    """Jejak BERAMBANG: {poligon [[lon,lat]], arah_deg, jangkau_km, sel_n}. Poligon = selubung cembung sudut-sudut sel di atas
    ambang; arah_deg = arah titik tengah sel (berbobot jumlah partikel) dari kawah; jangkau_km = jarak terjauh pusat sel dari kawah.
    Sah hanya bila sel lolos >= MIN_SEL (5; 1-4 sel tidak stabil antar seed). Selain itu poligon [], arah None, jangkau 0,
    di_bawah_ambang True (awan bisa ada tetapi terlalu encer/terlalu sedikit sel untuk dianggap bahaya penerbangan); sel_n tetap jumlah sel mentah."""
    sel = sel_berambang(hasil, jam)
    v = hasil["vent"]
    if len(sel) < MIN_SEL:
        return {"poligon": [], "arah_deg": None, "jangkau_km": 0.0, "sel_n": len(sel), "di_bawah_ambang": True}
    kx, ky = _proyeksi(v)
    pts, tot, mx, my, jmax = [], 0, 0.0, 0.0, 0.0
    for ci, cj, c in sel:
        for a in (0, 1):
            for b in (0, 1):
                pts.append((((ci + a) * SEL_DEG - v["lon"]) * kx, ((cj + b) * SEL_DEG - v["lat"]) * ky))
        x, y = ((ci + .5) * SEL_DEG - v["lon"]) * kx, ((cj + .5) * SEL_DEG - v["lat"]) * ky
        tot += c
        mx += c * x
        my += c * y
        jmax = max(jmax, math.hypot(x, y))
    arah = (math.degrees(math.atan2(mx / tot, my / tot)) + 360.0) % 360.0
    return {"poligon": [[v["lon"] + x / kx, v["lat"] + y / ky] for x, y in selubung(pts)], "arah_deg": arah, "jangkau_km": jmax, "sel_n": len(sel), "di_bawah_ambang": False}


def jejak_tipis(hasil, jam):
    """Sebaran MENTAH tanpa ambang konsentrasi (versi awal): {poligon, arah_deg, jangkau_km} partikel melayang pada jam itu,
    dipangkas ke persentil 90 jarak dari kawah. Hanya untuk simulasi/animasi; BUKAN area dampak."""
    s = next(x for x in hasil["snap"] if x["jam"] == jam)
    v = hasil["vent"]
    kx, ky = _proyeksi(v)
    xy = [((s["lon"][i] - v["lon"]) * kx, (s["lat"][i] - v["lat"]) * ky) for i in range(len(s["lon"])) if s["aktif"][i]]
    if not xy:
        return {"poligon": [], "arah_deg": None, "jangkau_km": 0.0}
    dist = sorted(math.hypot(x, y) for x, y in xy)
    thr = dist[int(math.floor(0.9 * (len(dist) - 1)))]
    kept = [(x, y) for x, y in xy if math.hypot(x, y) <= thr]
    mx = sum(x for x, _ in kept) / len(kept)
    my = sum(y for _, y in kept) / len(kept)
    arah = (math.degrees(math.atan2(mx, my)) + 360.0) % 360.0
    hull = selubung(kept)
    return {"poligon": [[v["lon"] + x / kx, v["lat"] + y / ky] for x, y in hull], "arah_deg": arah, "jangkau_km": thr}


def endapan(hasil, titik, radius_km=2.0):
    """Massa relatif (0..1, dinormalkan ke titik terbanyak) partikel yang mendarat dalam radius_km tiap titik."""
    s = hasil["snap"][-1]
    kx, ky = _proyeksi(hasil["vent"])
    jml = []
    for t in titik:
        cx = (t["lon"]) * kx
        cy = (t["lat"]) * ky
        k = 0
        for i in range(len(s["lon"])):
            if s["darat"][i] and math.hypot(s["lon"][i] * kx - cx, s["lat"][i] * ky - cy) <= radius_km:
                k += 1
        jml.append(k)
    m = max(jml) if jml else 0
    return [x / m if m else 0.0 for x in jml]


def jarak_arah(lat0, lon0, lat1, lon1):
    ky = math.radians(1) * R_BUMI / 1000.0
    dx, dy = (lon1 - lon0) * ky * math.cos(math.radians((lat0 + lat1) / 2)), (lat1 - lat0) * ky
    return math.hypot(dx, dy), (math.degrees(math.atan2(dx, dy)) + 360.0) % 360.0


def dampak_bandara(hasil, bandara, maks_dekat_km=150.0):
    """[{icao, iata, nama, jarak_km, jam_tiba|None, arah_deg}] bandara <= maks_dekat_km dari kawah atau yang terjangkau awan."""
    v = hasil["vent"]
    kx, ky = _proyeksi(v)
    cand = []
    for b in bandara:
        jr, ar = jarak_arah(v["lat"], v["lon"], b["lat"], b["lon"])
        if jr <= 2500:
            cand.append({"b": b, "jr": jr, "ar": ar, "tiba": None})
    for s in hasil["snap"]:  # ambang SAMA dengan jejak, tetapi hanya partikel <= FL350; pusat sel dalam 25 km bandara
        sel = sel_berambang(hasil, s["jam"], FL350_M)
        if len(sel) < MIN_SEL:  # aturan keabsahan sama dengan jejak
            continue
        pusat = [((ci + .5) * SEL_DEG * kx, (cj + .5) * SEL_DEG * ky) for ci, cj, _ in sel]
        for cd in cand:
            b = cd["b"]
            if cd["tiba"] is None:
                bx, by = b["lon"] * kx, b["lat"] * ky
                if any(math.hypot(px - bx, py - by) <= RADIUS_BANDARA_KM for px, py in pusat):
                    cd["tiba"] = s["jam"]
    out = []
    for cd in sorted(cand, key=lambda c: c["jr"]):
        if cd["jr"] <= maks_dekat_km or cd["tiba"] is not None:
            b = cd["b"]
            out.append({"icao": b["icao"], "iata": b.get("iata") or None, "nama": b["nama"], "jarak_km": round(cd["jr"], 1), "jam_tiba": cd["tiba"], "arah_deg": round(cd["ar"])})
    return out


# ---------- masukan ----------
def ambil_json(url, coba=3):
    gal = None
    for k in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:  # batas per jam Open-Meteo: mengulang hanya memperpanjang blokir
                raise RuntimeError(f"HTTP 429 {url[:60]}")
            gal = e
            time.sleep(3 * (k + 1))
        except Exception as e:  # jaringan: ulang dengan jeda
            gal = e
            time.sleep(3 * (k + 1))
    raise RuntimeError(f"gagal {url[:90]}: {gal}")


def url_angin(titik, base=OPENMETEO, ekstra=None):
    h = ",".join(f"{v}_{p}hPa" for p in HPA for v in ("wind_speed", "wind_direction", "geopotential_height"))
    q = {"latitude": ",".join(f"{t[0]:.3f}" for t in titik), "longitude": ",".join(f"{t[1]:.3f}" for t in titik), "hourly": h,
         "models": "ecmwf_ifs025", "wind_speed_unit": "ms", "timezone": "UTC", **(ekstra or {"forecast_days": 4})}
    return base + "?" + urllib.parse.urlencode(q, safe=",")


def angin_dari_respon(r, i0, jam):
    """Respons Open-Meteo satu lokasi -> objek `angin` kontrak (slice jam mulai i0, panjang jam). None bila ada nilai kosong."""
    hr = r["hourly"]
    lapis = []
    for p in HPA:
        sp, di, zz = (hr[f"{k}_{p}hPa"][i0:i0 + jam] for k in ("wind_speed", "wind_direction", "geopotential_height"))
        if len(sp) < jam or any(x is None for x in sp + di + zz):
            return None
        u, v = zip(*(uv(a, b) for a, b in zip(sp, di)))
        lapis.append({"hpa": p, "z_m": [round(x) for x in zz], "u": [round(x, 1) for x in u], "v": [round(x, 1) for x in v]})
    return {"mulai": hr["time"][i0] + ":00Z", "langkah_jam": 1, "jam": jam, "lapis": lapis}


def id_gunung(nama):
    return "-".join("".join(ch for ch in nama.lower() if ch.isalnum() or ch in " -").split())


def kolom_untuk(g, letusan, sekarang):
    """(kolom_m, kolom_sumber): letusan MAGMA <= 48 jam yang menulis tinggi kolom, selain itu asumsi per level."""
    for e in letusan:  # terbaru dulu
        if e.get("gunung", "").lower() == g["nama"].lower() and e.get("tinggi_m"):
            w = dt.datetime.fromisoformat(e["waktu"])
            if sekarang - w <= dt.timedelta(hours=48):
                return int(e["tinggi_m"]), f"letusan MAGMA {w.astimezone(WIB).strftime('%d-%m-%Y %H.%M')} WIB"
            break
    return KOLOM_LEVEL.get(g["level"], 1000), f"asumsi level {g['level']}"


def tren_dari(status):
    out = []
    for p in status.get("perubahan", []):
        out.append({"id": id_gunung(p["nama"]), "nama": p["nama"], "dari": p["dari"], "ke": p["ke"], "waktu": f"{p['tgl']}T00:00:00+07:00"})
    return sorted(out, key=lambda x: x["waktu"], reverse=True)


def simpan(jalur, obj):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def baca(jalur, ganti):
    try:
        with open(jalur) as f:
            return json.load(f)
    except (OSError, ValueError):
        return ganti


def bulat_jejak(j, jam):
    return {"jam": jam, "poligon": [[round(a, 3), round(b, 3)] for a, b in j["poligon"]],
            "arah_deg": None if j["arah_deg"] is None else round(j["arah_deg"]), "jangkau_km": round(j["jangkau_km"], 1),
            **({"sel_n": j["sel_n"], "di_bawah_ambang": j["di_bawah_ambang"]} if "sel_n" in j else {})}


def jalan(n=N_PRODUKSI):
    status = baca(STATUS, None)
    if not status or not status.get("gunung"):
        raise RuntimeError("gunungapi_status.json kosong; abu dilewati")
    sekarang = dt.datetime.now(dt.timezone.utc)
    daftar = [g for g in status["gunung"] if g["level"] >= 2 and g.get("lat") is not None]
    bandara = baca(BANDARA, [])
    if not bandara:
        print("  bandara.json tidak ada: dampak bandara dilewati", file=sys.stderr)
    angin = {}
    for k in range(0, len(daftar), 9):
        blok = daftar[k:k + 9]
        try:
            res = ambil_json(url_angin([(g["lat"], g["lon"]) for g in blok]))
        except RuntimeError as e:
            print(f"  angin blok {k} gagal: {e}", file=sys.stderr)
            continue
        res = res if isinstance(res, list) else [res]
        for g, r in zip(blok, res):
            tm = r["hourly"]["time"]
            kini = sekarang.strftime("%Y-%m-%dT%H:00")
            if kini not in tm:
                continue
            a = angin_dari_respon(r, tm.index(kini), 72)
            if a:
                angin[g["nama"]] = a
            else:
                print(f"  angin {g['nama']} berlubang: dibuang", file=sys.stderr)
        time.sleep(1.5)
    if not angin:
        raise RuntimeError("tidak ada angin yang terambil; berkas lama dibiarkan")
    rek = []
    for g in daftar:
        if g["nama"] in angin:
            kol, kol_s = kolom_untuk(g, status.get("letusan", []), sekarang)
            rek.append(({"nama": g["nama"], "level": g["level"], "lat": g["lat"], "lon": g["lon"], "puncak_m": g.get("tinggi") or 0}, angin[g["nama"]], kol, kol_s))
    tulis(rek, bandara, n, tren_dari(status))


def hitung_gunung(r, a, kol, kol_s, bandara, n):
    """Satu gunung -> (rekaman keluaran, [bandara terdampak])."""
    h = jalankan(r["lat"], r["lon"], r["puncak_m"], kol, a, n=n)
    gid = id_gunung(r["nama"])
    bd = dampak_bandara(h, bandara) if bandara else []
    ter = [{"icao": b["icao"], "iata": b["iata"], "nama": b["nama"], "gunung": gid, "jam_tiba": b["jam_tiba"]} for b in bd if b["jam_tiba"] is not None]
    rec = {"id": gid, "nama": r["nama"], "level": r["level"], "lat": r["lat"], "lon": r["lon"], "puncak_m": r["puncak_m"],
           "kolom_m": kol, "kolom_sumber": kol_s, "massa_lepas_kg": round(h["massa_kg"], -3), "angin": a,
           "jejak": [bulat_jejak(jejak(h, j), j) for j in JAM_JEJAK],
           "jejak_tipis": [bulat_jejak(jejak_tipis(h, j), j) for j in JAM_JEJAK], "bandara": bd}
    return rec, ter


def tulis(rek, bandara, n, tren, dibuat=None):
    """rek = [(rekaman gunung {nama, level, lat, lon, puncak_m}, angin, kolom_m, kolom_sumber)] -> tulis abu_gunungapi.json."""
    out_g, terdampak = [], []
    for r, a, kol, kol_s in rek:
        rec, ter = hitung_gunung(r, a, kol, kol_s, bandara, n)
        out_g.append(rec)
        terdampak += ter
        j = rec["jejak"]
        print(f"  {r['nama']}: kolom {kol} m ({kol_s}); jangkau 24 jam {j[2]['jangkau_km']} km, 72 jam {j[4]['jangkau_km']} km arah {j[4]['arah_deg']}", file=sys.stderr)
    terdampak.sort(key=lambda x: (x["jam_tiba"], x["icao"]))
    lama = baca(KELUAR, {})
    out = {"v": 1, "dibuat": dibuat or dt.datetime.now(WIB).isoformat(timespec="seconds"), "model": "lagrangian-v1",
           "skenario": "Gunung level II ke atas diandaikan meletus sekarang dengan tinggi kolom di kolom_m; bukan peramalan letusan dan bukan advisory VAAC. "
                       "jejak = hanya area yang bebannya melampaui ambang penerbangan (lihat parameter.ambang); jejak_tipis = sebaran partikel mentah tanpa ambang, untuk simulasi, bukan area dampak.",
           "parameter": {"n_partikel": n, "seed": 1, "dt_menit": 15, "kh_m2s": KH_M2S, "durasi_lepas_jam": DURASI_LEPAS_JAM,
                         "suzuki": {"A": SUZUKI_A, "k": SUZUKI_K}, "kelas_butir": [{"massa": f, "kec_jatuh_ms": v} for f, v in KELAS], "ambang_bandara_m": FL350_M, "radius_bandara_km": RADIUS_BANDARA_KM,
                         "ambang": {"min_sel": MIN_SEL, "konsentrasi_mg_m3": AMBANG_MGM3, "tebal_awan_m": TEBAL_AWAN_M, "sel_deg": SEL_DEG,
                                    "rumus": "sel lolos bila (jumlah partikel x massa_lepas_kg / n) >= konsentrasi x tebal x luas sel; massa_lepas_kg = MER x durasi; MER = 2500 x (H_km/2)^(1/0,241) kg/s (Mastin dkk. 2009)",
                                    "asumsi": "2 mg/m3 = batas bawah kontaminasi sedang ICAO/CAA; tebal awan 2 km; MER tetap selama durasi; semua massa dianggap abu halus yang terbawa (tidak ada agregasi)"}},
           "sumber": SUMBER, "gunung": out_g, "bandara_terdampak": terdampak, "tren": tren,
           "uji_balik": lama.get("uji_balik"), **{k: lama[k] for k in ("uji_balik_catatan", "uji_balik_tipis") if lama.get(k)}}
    err = validasi(out)
    if err:
        raise RuntimeError("keluaran tidak valid: " + err)
    simpan(KELUAR, out)
    print(f"{len(out_g)} gunung; bandara terdampak {len(terdampak)}; {os.path.getsize(KELUAR) // 1024} KB", file=sys.stderr)


def ulang(n=N_PRODUKSI):
    """Hitung ulang model dari angin, kolom, dan bandara yang SUDAH tersimpan (tanpa jaringan; dipakai bila Open-Meteo 429 atau ambang diubah)."""
    lama = baca(KELUAR, None)
    if not lama:
        raise RuntimeError("abu_gunungapi.json belum ada")
    rek = [({k: g[k] for k in ("nama", "level", "lat", "lon", "puncak_m")}, g["angin"], g["kolom_m"], g["kolom_sumber"]) for g in lama["gunung"]]
    tulis(rek, baca(BANDARA, []), n, lama.get("tren", []), dibuat=lama["dibuat"])  # waktu `dibuat` = waktu angin, tidak berubah


def validasi(o):
    """'' bila skema kontrak terpenuhi dan ukuran < 400 KB, selain itu alasannya."""
    for k in ("v", "dibuat", "model", "sumber", "gunung", "bandara_terdampak", "tren"):
        if k not in o:
            return f"kunci {k} hilang"
    for g in o["gunung"]:
        for k in ("id", "nama", "level", "lat", "lon", "puncak_m", "kolom_m", "kolom_sumber", "angin", "jejak", "bandara"):
            if k not in g:
                return f"{g.get('id')}: kunci {k} hilang"
        a = g["angin"]
        if len(a["lapis"]) != len(HPA) or any(not (len(L["u"]) == len(L["v"]) == len(L["z_m"]) == a["jam"]) for L in a["lapis"]):
            return f"{g['id']}: panjang angin salah"
        if [j["jam"] for j in g["jejak"]] != list(JAM_JEJAK):
            return f"{g['id']}: jam jejak salah"
        for j in g["jejak"]:
            if not all(-180 <= p[0] <= 180 and -90 <= p[1] <= 90 for p in j["poligon"]):
                return f"{g['id']}: koordinat poligon di luar rentang"
    ukuran = len(json.dumps(o, separators=(",", ":")))
    return f"ukuran {ukuran // 1024} KB >= 400 KB" if ukuran >= 400 * 1024 else ""


# ---------- bandara.json ----------
def bangun_bandara(berkas=None):
    """berkas = salinan lokal airports.csv (server OurAirports lambat, ~60 KB/dtk); tanpa itu diunduh langsung."""
    if berkas:
        teks = open(berkas, encoding="utf-8").read()
    else:
        with urllib.request.urlopen(urllib.request.Request("https://davidmegginson.github.io/ourairports-data/airports.csv", headers={"User-Agent": UA}), timeout=600) as r:
            teks = r.read().decode("utf-8")
    metar = {m["icao"]: m for m in baca(METAR, [])}
    out = {}
    for row in csv.DictReader(io.StringIO(teks)):
        if row["iso_country"] != "ID":
            continue
        icao = (row.get("icao_code") or row.get("gps_code") or row["ident"]).strip()
        if len(icao) != 4 or not icao.isalpha():
            continue
        if row["type"] in ("large_airport", "medium_airport") or icao in metar or (row["type"] == "small_airport" and row["scheduled_service"] == "yes"):  # bandara kecil hanya yang berpenerbangan terjadwal
            out[icao] = {"icao": icao, "iata": row["iata_code"] or None, "nama": row["name"], "lat": round(float(row["latitude_deg"]), 4),
                         "lon": round(float(row["longitude_deg"]), 4), "prov": row["iso_region"]}
    for ic, m in metar.items():  # bandara METAR yang tak ada di CSV: pakai data METAR
        out.setdefault(ic, {"icao": ic, "iata": None, "nama": m["nama"], "lat": m["lat"], "lon": m["lon"], "prov": m.get("prov")})
    lst = sorted(out.values(), key=lambda b: b["icao"])
    simpan(BANDARA, lst)
    print(f"{len(lst)} bandara -> {BANDARA}", file=sys.stderr)


# ---------- uji ----------
def angin_contoh(u=10.0, v=0.0, jam=72):
    """Angin seragam sintetis (semua lapisan sama) untuk uji."""
    return {"mulai": "2026-01-01T00:00:00Z", "langkah_jam": 1, "jam": jam,
            "lapis": [{"hpa": p, "z_m": [round(1500 * (850 / p) ** 1.5 - 1500 + 1500)] * jam, "u": [u] * jam, "v": [v] * jam} for p in HPA]}


def angin_geser(jam=72):
    """Angin sintetis dengan geseran (barat bawah, timur-laut atas) untuk uji setara Python-JS."""
    zs = [1500, 3100, 4200, 5800, 7600, 9700, 10800, 12300]
    lapis = []
    for k, p in enumerate(HPA):
        lapis.append({"hpa": p, "z_m": [zs[k] + (h % 6) * 10 for h in range(jam)],
                      "u": [round(-8 + 3.2 * k + 0.1 * (h % 7), 1) for h in range(jam)], "v": [round(-1 + 0.9 * k - 0.05 * (h % 5), 1) for h in range(jam)]})
    return {"mulai": "2026-01-01T00:00:00Z", "langkah_jam": 1, "jam": jam, "lapis": lapis}


def dekat_ambang():
    """Kasus dekat ambang (sel lolos 0-14 per jam) untuk uji_setara: seluruh jam 0..72, sel mentah dan keabsahannya.
    Menangkap pembalikan sel akibat pembulatan Float32 dan selisih keputusan MIN_SEL."""
    out = []
    for kol, seed in ((2000, 11), (2500, 12)):
        m = {"lat": -8.108, "lon": 112.92, "puncak_m": 3676, "kolom_m": kol, "angin": angin_geser(), "durasi_jam": 3, "jam": 72, "n": 3000, "seed": seed, "dt_menit": 15}
        h = jalankan(m["lat"], m["lon"], m["puncak_m"], m["kolom_m"], m["angin"], m["durasi_jam"], m["jam"], m["n"], m["seed"], m["dt_menit"])
        out.append({"masukan": m, "sel": {str(j): sorted([list(c) for c in sel_berambang(h, j)]) for j in range(73)},
                    "sah": {str(j): not jejak(h, j)["di_bawah_ambang"] for j in range(73)}})
    return out


def setara():
    """Keluaran JSON untuk uji_setara.mjs: masukan tetap + hasil Python."""
    m = {"lat": -8.108, "lon": 112.92, "puncak_m": 3676, "kolom_m": 6000, "angin": angin_geser(), "durasi_jam": 3, "jam": 72, "n": 800, "seed": 7, "dt_menit": 15}
    h = jalankan(m["lat"], m["lon"], m["puncak_m"], m["kolom_m"], m["angin"], m["durasi_jam"], m["jam"], m["n"], m["seed"], m["dt_menit"])
    titik = [{"lat": -8.2, "lon": 113.1}, {"lat": -8.3, "lon": 113.3}, {"lat": -8.108, "lon": 112.92}]
    s24 = h["snap"][24]
    print(json.dumps({"masukan": m, "titik": titik, "mulberry_seed1": (lambda g: [g() for _ in range(3)])(mulberry32(1)),
                      "jejak": {str(j): jejak(h, j) for j in JAM_JEJAK}, "jejak_tipis": {str(j): jejak_tipis(h, j) for j in JAM_JEJAK}, "massa_kg": h["massa_kg"], "endapan": endapan(h, titik, 10.0),
                      "pos24": {"lon": s24["lon"][:40], "lat": s24["lat"][:40], "z": s24["z"][:40]}, "dekat": dekat_ambang()}))


# nilai acuan dari implementasi JS kanonik mulberry32 (node: lihat uji_setara.mjs yang membandingkan ulang)
ACUAN_MULBERRY_SEED1 = None


def uji():
    # konversi u/v: dari barat 10 m/s -> u=+10; dari utara -> v=-10
    u, v = uv(10, 270)
    assert abs(u - 10) < 1e-9 and abs(v) < 1e-9, (u, v)
    u, v = uv(10, 0)
    assert abs(u) < 1e-9 and abs(v + 10) < 1e-9, (u, v)
    # mulberry32: deterministik, dalam [0,1), seed beda -> urutan beda; nilai acuan dari JS dibandingkan di uji_setara.mjs
    a, b = mulberry32(1), mulberry32(1)
    sa = [a() for _ in range(5)]
    assert sa == [b() for _ in range(5)] and all(0 <= x < 1 for x in sa) and sa != [mulberry32(2)() for _ in range(5)]
    assert abs(mulberry32(1)() - 0.6270739405881613) < 1e-15, mulberry32(1)()  # acuan: mulberry32(1)() di Node.js
    # interpolasi: profil dua lapisan, titik tengah
    ang = {"lapis": [{"hpa": 850, "z_m": [1000, 1000], "u": [0.0, 10.0], "v": [0.0, 0.0]}, {"hpa": 700, "z_m": [3000, 3000], "u": [10.0, 10.0], "v": [0.0, 20.0]}]}
    p = profil(ang, 1800)  # setengah jam: lapis bawah u=5, atas u=10 v=10
    assert [round(x, 6) for x in angin_di(p, 2000)] == [7.5, 5.0], angin_di(p, 2000)
    assert angin_di(p, 0) == (p[0][1], p[0][2]) and angin_di(p, 99999) == (p[-1][1], p[-1][2])
    # tanpa angin dan tanpa difusi: partikel tetap di kawah (tinggi kolom nol -> z tetap di puncak sampai turun, tidak bergeser)
    h = jalankan(-7.5, 110.4, 2900, 2000, angin_contoh(0, 0), jam=6, n=50, kh=0)
    s = h["snap"][6]
    assert all(abs(s["lon"][i] - 110.4) < 1e-12 and abs(s["lat"][i] + 7.5) < 1e-12 for i in range(50)), "partikel bergeser tanpa angin"
    # angin 10 m/s ke timur, 1 jam, tanpa difusi: ~36 km, arah 90
    h = jalankan(0.0, 100.0, 2000, 1000, angin_contoh(10, 0), durasi_jam=1, jam=2, n=100, kh=0)
    s = h["snap"][1]
    i = next(i for i in range(100) if h["lepas"][i] == 0)  # dilepas di awal: bergerak penuh 1 jam
    jr, ar = jarak_arah(0.0, 100.0, s["lat"][i], s["lon"][i])
    assert abs(jr - 36.0) < 0.05 and abs(ar - 90) < 0.01, (jr, ar)
    # jejak: angin dari barat -> awan ke timur; dari selatan -> ke utara; jangkau > 0 dan poligon tertutup oleh >= 3 titik
    for (uu, vv, tgt) in ((10, 0, 90), (0, 10, 0), (-10, 0, 270)):
        h = jalankan(-7.5, 110.4, 2900, 3000, angin_contoh(uu, vv), jam=12, n=400, seed=3)
        j = jejak_tipis(h, 12)
        d = abs((j["arah_deg"] - tgt + 180) % 360 - 180)
        assert d < 5 and j["jangkau_km"] > 100 and len(j["poligon"]) >= 3, (uu, vv, j["arah_deg"], j["jangkau_km"])
    # ambang: MER Mastin (H=2 km -> V=1 m3/s -> 2500 kg/s), kolom kecil -> tak ada sel lolos, kolom besar -> ada, dan tidak melewati jarak tempuh angin
    assert abs(mer_kg_s(2000) - 2500.0) < 1e-6 and 100 < mer_kg_s(1000) < 200 and mer_kg_s(0) == 0
    kecil = jalankan(-7.5, 110.4, 2900, 500, angin_contoh(10, 0), jam=12, n=400, seed=3)
    assert jejak(kecil, 12) == {"poligon": [], "arah_deg": None, "jangkau_km": 0.0, "sel_n": 0, "di_bawah_ambang": True} and jejak_tipis(kecil, 12)["jangkau_km"] > 100
    besar = jalankan(-7.5, 110.4, 2900, 9000, angin_contoh(10, 0), jam=12, n=400, seed=3)
    jb, jt = jejak(besar, 12), jejak_tipis(besar, 12)
    assert jb["sel_n"] >= MIN_SEL and not jb["di_bawah_ambang"] and abs(jb["arah_deg"] - 90) < 5 and 0 < jb["jangkau_km"] < 12 * 36 + 30 and len(jb["poligon"]) >= 3, (jb["arah_deg"], jb["jangkau_km"], jt["jangkau_km"])
    # ambang bergantung massa: per sel, c partikel x massa/n >= 2 mg/m3 x 2 km x luas sel; menaikkan massa 10x tidak boleh mengurangi sel lolos
    assert len(sel_berambang(besar, 12)) >= len(sel_berambang(jalankan(-7.5, 110.4, 2900, 6000, angin_contoh(10, 0), jam=12, n=400, seed=3), 12))
    # keabsahan: 4 sel lolos -> kosong + di_bawah_ambang; 5 sel -> sah
    def sintetis(k):
        return {"vent": {"lat": 0.0, "lon": 100.0}, "massa_kg": 1e12, "n": 10,
                "snap": [{"jam": 6, "lon": [100.05 + .1 * i for i in range(k)], "lat": [0.05] * k, "z": [3000.0] * k, "aktif": [1] * k, "darat": [0] * k}]}
    j4, j5 = jejak(sintetis(4), 6), jejak(sintetis(5), 6)
    assert j4["di_bawah_ambang"] and j4["sel_n"] == 4 and j4["poligon"] == [] and j4["arah_deg"] is None, j4
    assert not j5["di_bawah_ambang"] and j5["sel_n"] == 5 and abs(j5["arah_deg"] - 90) < 15 and len(j5["poligon"]) >= 4, j5
    # endapan: titik di bawah awan yang mendarat > 0; titik jauh = 0
    h = jalankan(0.0, 100.0, 0, 1000, angin_contoh(5, 0), durasi_jam=1, jam=72, n=300, seed=2)
    e = endapan(h, [{"lat": 0.0, "lon": 100.0 + 0.0001}, {"lat": 40.0, "lon": 10.0}], 2000.0)
    assert e[1] == 0 and max(e) <= 1, e
    # bandara: awan ke timur 10 m/s dari kawah, bandara 50 km di timur kena sebelum jam 6 (dilepas 1 jam, ketinggian < FL350)
    h = jalankan(0.0, 100.0, 2000, 8000, angin_contoh(10, 0), durasi_jam=3, jam=24, n=300, kh=0)
    bd = dampak_bandara(h, [{"icao": "XXXA", "iata": None, "nama": "Dekat", "lat": 0.0, "lon": 100.45}, {"icao": "XXXB", "iata": None, "nama": "Barat", "lat": 0.0, "lon": 99.0}])
    assert bd[0]["icao"] == "XXXA" and bd[0]["jam_tiba"] in (2, 3), bd
    kecil = jalankan(0.0, 100.0, 2000, 800, angin_contoh(10, 0), durasi_jam=1, jam=24, n=300, kh=0)  # kolom kecil: awan ada tetapi di bawah ambang -> tak ada bandara terdampak
    assert all(b["jam_tiba"] is None for b in dampak_bandara(kecil, [{"icao": "XXXA", "iata": None, "nama": "Dekat", "lat": 0.0, "lon": 100.45}]))
    assert all(b["icao"] != "XXXB" or b["jam_tiba"] is None for b in bd), bd
    # kolom: letusan baru dipakai, lama jatuh ke asumsi level
    sk = dt.datetime(2026, 10, 18, 12, 0, tzinfo=dt.timezone.utc)
    g = {"nama": "Ibu", "level": 2}
    assert kolom_untuk(g, [{"gunung": "Ibu", "waktu": "2026-10-18T10:00+07:00", "tinggi_m": 700}], sk)[0] == 700
    assert kolom_untuk(g, [{"gunung": "Ibu", "waktu": "2026-10-10T10:00+07:00", "tinggi_m": 700}], sk) == (1000, "asumsi level 2")
    assert id_gunung("Lewotobi Laki-laki") == "lewotobi-laki-laki" and id_gunung("Anak Krakatau") == "anak-krakatau"
    # skema + ukuran: satu gunung sintetis penuh; peringatan bila berkas nyata ada
    hh = jalankan(-8.108, 112.92, 3676, 2000, angin_geser(), jam=72, n=200)
    gg = {"id": "semeru", "nama": "Semeru", "level": 3, "lat": -8.108, "lon": 112.92, "puncak_m": 3676, "kolom_m": 2000, "kolom_sumber": "asumsi level 3",
          "angin": angin_geser(), "jejak": [bulat_jejak(jejak(hh, j), j) for j in JAM_JEJAK], "jejak_tipis": [bulat_jejak(jejak_tipis(hh, j), j) for j in JAM_JEJAK], "bandara": []}
    o = {"v": 1, "dibuat": "x", "model": "lagrangian-v1", "sumber": SUMBER, "gunung": [gg], "bandara_terdampak": [], "tren": []}
    assert validasi(o) == "", validasi(o)
    o["gunung"][0]["jejak"].pop()
    assert validasi(o) != ""
    nyata = baca(KELUAR, None)
    if nyata:
        assert validasi(nyata) == "", validasi(nyata)
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["ulang"]:
        ulang()
    elif a == ["setara"]:
        setara()
    elif a[:1] == ["bandara"]:
        bangun_bandara(a[1] if len(a) > 1 else None)
    else:
        try:
            jalan()
        except RuntimeError as e:
            print(f"abu: {e}", file=sys.stderr)
            sys.exit(1)
