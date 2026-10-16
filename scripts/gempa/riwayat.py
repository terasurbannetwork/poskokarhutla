"""Riwayat gempa USGS Indonesia (G4) -> public/gempa/data/
  riwayat_m5.json    gempa M >= 5 sejak 1900 (tabel {kolom, baris})
  riwayat_prov.json  per provinsi per tahun: jumlah per kelas M, M maks, nilai b (Aki-Utsu, Mc 4,5, 2000-kini)
  riwayat_grid.json  kekerapan M >= 4,5 per sel 0,1 derajat, 2000-kini (skema seperti public/banjir/data/riwayat_grid.json)
  risiko.json        indeks risiko riwayat gempa 0-100 per kabupaten dan kecamatan
  meta.json          sumber, waktu ambil, cacah (mentah USGS / gempa / Indonesia), lisensi

Sumber: USGS FDSN event (https://earthquake.usgs.gov/fdsnws/event/1), domain publik (karya pemerintah AS). Kotak lat -12..7,
lon 94..142; kotak juga menjaring Filipina selatan, Timor Leste, PNG barat, Malaysia: disaring (umum.provinsi_gempa:
titik di darat Indonesia diterima; di laut ditolak bila `place` menyebut negara asing, selain itu provinsi terdekat <= 200 km).
Hanya type=earthquake. Magnitudo apa adanya dari katalog USGS (jenis campur: mww, mb, ml, ...).
M >= 4,5 dianggap lengkap sejak 2000; M >= 5 sebelum 2000 tidak lengkap (kekerapan dihitung hanya 2000-TAHUN_AKHIR).

Indeks risiko (A15, bobot 50:30:20 seperti scripts/banjir/riwayat.py rob), per pusat wilayah, radius R_KM = 100:
  50 kekerapan  fK = tahun (2000-TAHUN_AKHIR) dengan >= 1 gempa M >= 5 dalam radius / jumlah tahun
  30 besaran    fB = (M maks sejak 1900 dalam radius - 5) / (9,2 - 5), dipotong 0-1 (0 bila tak ada)
  20 tren       fT = (log2(rasio / rasio nasional) + 1) / 2, dipotong 0-1; rasio = (rata-rata tahunan 30% tahun terakhir + 1)
                / (rata-rata tahun sebelumnya + 1) atas gempa M >= 5 dalam radius. Dibagi rasio nasional agar kenaikan
                pencatatan global tidak membuat semua wilayah tampak naik.
  Kabupaten dipusatkan di rata-rata pusat kecamatannya (public/banjir/data/pusat_kec.json), provinsi = rata-rata skor
  kabupatennya. Kelas dari posisi se-Indonesia: 10% teratas sangat tinggi, 10-30% tinggi, 30-60% sedang, sisanya rendah.

Pakai:  python3 scripts/gempa/riwayat.py [ambil]  |  riwayat.py periksa (bandingkan dengan count USGS hari ini)  |  riwayat.py uji
"""
import csv, datetime as dt, io, json, math, os, sys, time
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import AKAR, KELUAR, ambil, simpan, usgs_url, provinsi_gempa

MENTAH = os.path.join(AKAR, "data/raw/gempa")
TAHUN0, TAHUN_AKHIR = 2000, 2025  # tahun penuh yang dinilai; tahun berjalan ikut tersimpan tapi tidak dinilai
R_KM = 100
X0, Y1, SEL = 94.0, 7.0, 0.1  # sel = kotak unduhan USGS (lon 94..142, lat -12..7)
W_GRID, H_GRID = 480, 190
ALIAS_KAB = {"75|Pahuwato": "75|Pohuwato"}  # ejaan ganda di pusat_kec.json (milik agent lain, tidak disunting di sana)
PLAFON = {"riwayat_m5.json": 1_200_000, "riwayat_grid.json": 400_000, "riwayat_prov.json": 400_000, "risiko.json": 400_000}
ATRIBUSI = {"usgs": "Katalog gempa: U.S. Geological Survey (USGS), ANSS Comprehensive Catalog via FDSN Event Web Service, earthquake.usgs.gov, domain publik."}
KELAS_M = (4.5, 5.0, 6.0, 7.0)  # batas bawah: 4,5-4,9 | 5-5,9 | 6-6,9 | >= 7


def potongan(hari_ini):
    """[(mulai, akhir, m_min)]: 1900-1999 M >= 5 per dasawarsa; 2000-kini M >= 4,5 per tahun (di bawah batas 20.000 baris)."""
    p = [(f"{a}-01-01", f"{a + 10}-01-01", 5.0) for a in range(1900, 2000, 10)]
    for th in range(TAHUN0, hari_ini.year + 1):
        akhir = f"{th + 1}-01-01" if th < hari_ini.year else hari_ini.isoformat()
        p.append((f"{th}-01-01", akhir, 4.5))
    return p


def ambil_potongan(mulai, akhir, m_min):
    """-> (jumlah_count_usgs, baris[[waktu, lat, lon, dalam, mag, place, type]]). Di-cache bila periode sudah lampau."""
    nama = os.path.join(MENTAH, f"{mulai}_{akhir}_{m_min}.json")
    lampau = akhir < dt.date.today().isoformat()
    if lampau and os.path.exists(nama):
        return json.load(open(nama))
    n = int(ambil(usgs_url("count", mulai, akhir, m_min), mentah=True))
    teks = ambil(usgs_url("query", mulai, akhir, m_min, format="csv"), mentah=True).decode()
    baris = []
    for r in csv.DictReader(io.StringIO(teks)):
        if r["mag"] == "":
            continue
        baris.append([r["time"][:16], round(float(r["latitude"]), 3), round(float(r["longitude"]), 3),
                      round(float(r["depth"] or 0), 1), round(float(r["mag"]), 1), r["place"], r["type"]])
    if len(baris) != n:
        raise RuntimeError(f"{mulai}..{akhir} M>={m_min}: count USGS {n} != baris diunduh {len(baris)}")
    hasil = [n, baris]
    if lampau:
        simpan(nama, hasil)
    return hasil


def b_aki(mags, mc=4.5, lebar=0.1):
    """Nilai b maksimum-likelihood Aki-Utsu dengan koreksi pembulatan: b = log10(e) / (rata-rata M - (mc - lebar/2))."""
    mags = [m for m in mags if m >= mc - 1e-9]
    if len(mags) < 50:
        return None
    return round(math.log10(math.e) / (sum(mags) / len(mags) - (mc - lebar / 2)), 2)


def kelas_m(m):
    k = 0
    for i, b in enumerate(KELAS_M):
        if m >= b - 1e-9:
            k = i
    return k


def per_provinsi(gempa):
    """gempa: [(tahun, kode_prov, mag)] -> {kode: {"th": {tahun: [n4.5, n5, n6, n7, mmaks]}, "b", "n_b"}} dan "ID" nasional."""
    th = defaultdict(lambda: defaultdict(lambda: [0, 0, 0, 0, 0.0]))
    mag_prov = defaultdict(list)
    for t, kp, m in gempa:
        for kode in (kp, "ID"):
            c = th[kode][t]
            c[kelas_m(m)] += 1
            c[4] = max(c[4], m)
            if TAHUN0 <= t <= TAHUN_AKHIR:  # tahun berjalan belum penuh: tidak ikut nilai b
                mag_prov[kode].append(m)
    out = {}
    for kode in sorted(th):
        b = b_aki(mag_prov[kode])
        out[kode] = {"th": {str(t): v for t, v in sorted(th[kode].items())}, "b": b, "n_b": len(mag_prov[kode])}
    return out


def grid(gempa_2000):
    """gempa_2000: [(tahun, lat, lon)] M >= 4,5 2000-TAHUN_AKHIR -> sel_data [[ix, iy, f, r]]: f = tahun berkejadian, r = kejadian per tahun."""
    hit = defaultdict(set)
    n = defaultdict(int)
    for t, la, lo in gempa_2000:
        ix, iy = int((lo - X0) / SEL), int((Y1 - la) / SEL)
        hit[(ix, iy)].add(t)
        n[(ix, iy)] += 1
    th = TAHUN_AKHIR - TAHUN0 + 1
    return [[ix, iy, len(hit[(ix, iy)]), round(n[(ix, iy)] / th, 2)] for ix, iy in sorted(hit, key=lambda k: (k[1], k[0]))], th


def _ratio(arr, n_baru):
    lama, baru = arr[:-n_baru], arr[-n_baru:]
    return (sum(baru) / len(baru) + 1) / ((sum(lama) / len(lama) if lama else 0) + 1)


def deklaster(ev):
    """Declustering Gardner-Knopoff (1974) sederhana. ev: [(waktu 'YYYY-MM-DDTHH:MM', lat, lon, m)] -> set indeks gempa UTAMA.
    Gempa yang jatuh dalam jendela waktu (hari, setelah) dan jarak (km) gempa lebih besar dibuang sebagai susulan.
    Jendela: jarak = 10^(0,1238 M + 0,983) km; waktu = 10^(0,032 M + 2,7389) hari bila M >= 6,5, selain itu 10^(0,5409 M - 0,547).
    Tanpa jendela foreshock (hanya setelah): batas yang diterima untuk komponen tren."""
    import bisect
    hari = [dt.datetime.strptime(e[0], "%Y-%m-%dT%H:%M").toordinal() + int(e[0][11:13]) / 24 + int(e[0][14:16]) / 1440 for e in ev]
    urut = sorted(range(len(ev)), key=lambda i: hari[i])
    th_urut = [hari[i] for i in urut]
    buang = set()
    for i in sorted(range(len(ev)), key=lambda i: -ev[i][3]):
        if i in buang:
            continue
        m = ev[i][3]
        T = 10 ** (0.032 * m + 2.7389) if m >= 6.5 else 10 ** (0.5409 * m - 0.547)
        D = 10 ** (0.1238 * m + 0.983)
        a = bisect.bisect_right(th_urut, hari[i])
        b = bisect.bisect_right(th_urut, hari[i] + T)
        for j in (urut[k] for k in range(a, b)):
            if j != i and ev[j][3] <= m and _jarak(ev[i][1], ev[i][2], ev[j][1], ev[j][2]) <= D:
                buang.add(j)
    return set(range(len(ev))) - buang


def skor_pusat(pusat, bin_ev, rasio_nas, th):
    """pusat: {kunci: (lat, lon)}; bin_ev[(lat, lon sel 1 derajat)] = [(tahun, lat, lon, m, utama)]
    -> {kunci: [skor, fK, fB, fT, mmaks, n_utama_2000]}. M maks dari semua gempa; kekerapan/tren hanya dari gempa utama (declustered)."""
    n_baru = max(1, round(.3 * len(th)))
    out = {}
    for kunci, (la, lo) in pusat.items():
        thn, mmaks, tahun_hit = defaultdict(int), 0.0, set()
        cy, cx = math.floor(la), math.floor(lo)
        for gy in (cy - 1, cy, cy + 1):
            for gx in (cx - 1, cx, cx + 1):
                for t, ela, elo, m, utama in bin_ev.get((gy, gx), ()):
                    if _jarak(la, lo, ela, elo) <= R_KM:
                        mmaks = max(mmaks, m)
                        if utama and TAHUN0 <= t <= TAHUN_AKHIR:  # kekerapan dan tren dari katalog tanpa susulan
                            thn[t] += 1
        arr = [thn.get(t, 0) for t in th]
        fK = sum(1 for v in arr if v) / len(th)
        fB = min(1, max(0, (mmaks - 5) / 4.2)) if mmaks else 0
        fT = min(1, max(0, (math.log2(_ratio(arr, n_baru) / rasio_nas) + 1) / 2))
        out[kunci] = [round(50 * fK + 30 * fB + 20 * fT), round(fK, 2), round(fB, 2), round(fT, 2), round(mmaks, 1), sum(arr)]
    return out


def _jarak(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def beri_kelas(daftar):
    """daftar [(kunci, skor)] -> {kunci: lv}: dari posisi skor se-Indonesia (skor sama = kelas sama)."""
    urut = sorted(daftar, key=lambda x: -x[1])
    pertama = {}
    for i, (_, s) in enumerate(urut):
        pertama.setdefault(s, i)
    return {k: (3 if pertama[s] / len(urut) < .1 else 2 if pertama[s] / len(urut) < .3 else 1 if pertama[s] / len(urut) < .6 else 0)
            for k, s in urut}


def ambil_semua():
    from wilayah import Wilayah, PROVINSI
    w = Wilayah()
    hari_ini = dt.date.today()
    mentah_total = n_gempa = 0
    gempa = []  # (waktu, lat, lon, dalam, mag, kp)
    n_2000_mentah = 0
    for mulai, akhir, m_min in potongan(hari_ini):
        n, baris = ambil_potongan(mulai, akhir, m_min)
        mentah_total += n
        if m_min == 4.5:
            n_2000_mentah += n
        print(f"  {mulai}..{akhir} M>={m_min}: {n}", file=sys.stderr)
        for wk, la, lo, dalam, m, place, tipe in baris:
            if tipe != "earthquake":
                continue
            n_gempa += 1
            kp = provinsi_gempa(w, la, lo, place)
            if kp:
                gempa.append((wk, la, lo, dalam, m, kp))
    gempa.sort()
    print(f"mentah {mentah_total}, earthquake {n_gempa}, Indonesia {len(gempa)}", file=sys.stderr)

    m5 = [g for g in gempa if g[4] >= 5.0]
    simpan(os.path.join(KELUAR, "riwayat_m5.json"), {
        "sumber": "USGS FDSN event catalog, domain publik", "kolom": ["waktu_utc", "lat", "lon", "dalam_km", "m", "prov"],
        "baris": [[g[0], g[1], g[2], g[3], g[4], g[5]] for g in m5]})

    tahun = lambda g: int(g[0][:4])
    prov = per_provinsi([(tahun(g), g[5], g[4]) for g in gempa if g[4] >= 5.0 or tahun(g) >= TAHUN0])
    simpan(os.path.join(KELUAR, "riwayat_prov.json"), {
        "sumber": "USGS FDSN; M >= 5 sejak 1900, M >= 4,5 sejak 2000", "kelas_m": ["4,5-4,9", "5,0-5,9", "6,0-6,9", ">= 7,0"],
        "kolom": "[n 4,5-4,9 (hanya 2000+), n 5-5,9, n 6-6,9, n >= 7, M maks]", "nilai_b": "Aki-Utsu, Mc 4,5, 2000-kini",
        "tahun_penuh_terakhir": TAHUN_AKHIR, "nama": {**PROVINSI, "ID": "Indonesia"}, "prov": prov})

    sel, th_n = grid([(tahun(g), g[1], g[2]) for g in gempa if TAHUN0 <= tahun(g) <= TAHUN_AKHIR and g[4] >= 4.5])
    simpan(os.path.join(KELUAR, "riwayat_grid.json"), {
        "sumber": f"USGS FDSN M >= 4,5 {TAHUN0}-{TAHUN_AKHIR}; f = tahun berkejadian, r = kejadian per tahun",
        "x0": X0, "y1": Y1, "sel": SEL, "w": W_GRID, "h": H_GRID, "tahun": th_n, "sel_data": sel})

    pusat_kec = {k: v for k, v in json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json"))).items()
                 if k.split("|")[1] != "None"}  # kecamatan tanpa kabupaten (mis. 13|None|None) tidak dinilai
    kab_xy = defaultdict(list)
    for k, (la, lo) in pusat_kec.items():
        kab_xy[ALIAS_KAB.get(k.rsplit("|", 1)[0], k.rsplit("|", 1)[0])].append((la, lo))
    pusat_kab = {k: (sum(a for a, _ in v) / len(v), sum(b for _, b in v) / len(v)) for k, v in kab_xy.items()}
    bin_ev = defaultdict(list)
    utama = deklaster([(g[0], g[1], g[2], g[4]) for g in m5])
    for i, g in enumerate(m5):
        bin_ev[(math.floor(g[1]), math.floor(g[2]))].append((tahun(g), g[1], g[2], g[4], i in utama))
    th = list(range(TAHUN0, TAHUN_AKHIR + 1))
    # rasio nasional: gempa utama M >= 5 se-Indonesia per tahun
    nas = [sum(1 for i, g in enumerate(m5) if i in utama and tahun(g) == t) for t in th]
    rasio_nas = _ratio(nas, max(1, round(.3 * len(th))))
    s_kab = skor_pusat(pusat_kab, bin_ev, rasio_nas, th)
    s_kec = skor_pusat(pusat_kec, bin_ev, rasio_nas, th)
    lv_kab, lv_kec = beri_kelas([(k, v[0]) for k, v in s_kab.items()]), beri_kelas([(k, v[0]) for k, v in s_kec.items()])
    per_prov = defaultdict(list)
    for k, v in s_kab.items():
        per_prov[k.split("|", 1)[0]].append(v[0])
    s_prov = {k: round(sum(v) / len(v)) for k, v in per_prov.items()}
    tertinggi = {}
    for k, v in s_kab.items():
        kp = k.split("|", 1)[0]
        if kp not in tertinggi or v[0] > tertinggi[kp][1]:
            tertinggi[kp] = [k, v[0]]
    lv_prov = beri_kelas(list(s_prov.items()))
    simpan(os.path.join(KELUAR, "risiko.json"), {
        "sumber": f"USGS FDSN, gempa M >= 5 dalam radius {R_KM} km dari pusat wilayah; bobot 50 kekerapan : 30 besaran : 20 tren",
        "kolom": ["skor", "kekerapan", "besaran", "tren", "m_maks", "n_2000_" + str(TAHUN_AKHIR)], "kelas": ["Rendah", "Sedang", "Tinggi", "Sangat tinggi"],
        "tahun": [TAHUN0, TAHUN_AKHIR], "radius_km": R_KM,
        "metode_provinsi": "rata-rata kabupaten tak berbobot", "kab_tertinggi": dict(sorted(tertinggi.items())),
        "metode_tren": f"kekerapan dan tren dari katalog tanpa susulan (declustering Gardner-Knopoff 1974, jendela setelah gempa utama); {len(utama)} utama dari {len(m5)} gempa M >= 5; M maks dari semua gempa",
        "atribusi": ATRIBUSI["usgs"],
        "prov": {k: [s, lv_prov[k]] for k, s in sorted(s_prov.items())},
        "kab": {k: [*v, lv_kab[k]] for k, v in sorted(s_kab.items())},
        "kec": {k: [v[0], v[4], lv_kec[k]] for k, v in sorted(s_kec.items())},
        "kec_kolom": ["skor", "m_maks", "lv"], "kab_kolom_akhir": "lv"})

    simpan(os.path.join(KELUAR, "meta.json"), {
        "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "akhir": hari_ini.isoformat(),
        "sumber": "USGS FDSN event catalog (earthquake.usgs.gov/fdsnws/event/1), domain publik",
        "kotak": "lat -12..7, lon 94..142", "jumlah_mentah_usgs": mentah_total, "jumlah_mentah_m45_sejak_2000": n_2000_mentah,
        "jumlah_earthquake": n_gempa, "jumlah_indonesia": len(gempa), "jumlah_m5_indonesia": len(m5),
        "catatan": "Disaring ke Indonesia (tolak Filipina, Timor Leste, PNG, Malaysia); M >= 4,5 lengkap sejak 2000",
        "catatan_magnitudo": "campur jenis magnitudo (mb, mww, ml, dst.) apa adanya dari katalog USGS",
        "atribusi": ATRIBUSI["usgs"], "lisensi": "Domain publik (karya pemerintah AS)"})


def periksa():
    """Bandingkan jumlah mentah tersimpan dengan count USGS hari ini."""
    meta = json.load(open(os.path.join(KELUAR, "meta.json")))
    n = int(ambil(usgs_url("count", f"{TAHUN0}-01-01", meta["akhir"], 4.5), mentah=True))
    assert n == meta["jumlah_mentah_m45_sejak_2000"], (n, meta["jumlah_mentah_m45_sejak_2000"])
    print(f"cocok: M>=4,5 sejak {TAHUN0} sampai {meta['akhir']} = {n} (USGS count) = unduhan")


def uji():
    assert kelas_m(4.7) == 0 and kelas_m(5.0) == 1 and kelas_m(6.9) == 2 and kelas_m(7.0) == 3
    import random
    random.seed(1)  # magnitudo Gutenberg-Richter b=1 dibulatkan 0,1 -> b hasil dekat 1
    ms = [round(4.45 - math.log10(1 - random.random()) / 1.0 + 0, 1) for _ in range(20000)]
    assert abs(b_aki(ms) - 1.0) < .07, b_aki(ms)
    assert b_aki([5.0] * 10) is None  # data terlalu sedikit
    p = per_provinsi([(2000, "11", 4.6), (2000, "11", 5.2), (1950, "11", 7.1), (2001, "12", 6.0), (2026, "11", 5.0)])
    assert p["11"]["n_b"] == 2, p["11"]  # 2026 belum penuh, tidak ikut
    assert p["11"]["th"]["2000"][:2] == [1, 1] and p["11"]["th"]["1950"][3] == 1 and p["ID"]["th"]["2000"][4] == 5.2
    s, th = grid([(2000, 6.95, 94.02), (2001, 6.97, 94.05), (2001, 6.95, 94.02)])
    assert s == [[0, 0, 2, round(3 / th, 2)]] and th == 26, s
    assert 94.0 + W_GRID * SEL >= 142 and 7.0 - H_GRID * SEL <= -12  # kisi menutup seluruh kotak unduhan
    u = deklaster([('2000-01-01T00:00', 0.0, 100.0, 7.0), ('2000-01-05T00:00', 0.1, 100.1, 5.0), ('2000-01-05T00:00', 30.0, 100.1, 5.0), ('2005-01-01T00:00', 0.0, 100.0, 5.2)])
    assert u == {0, 2, 3}, u  # susulan dekat dibuang; jauh dan lama sesudahnya tetap
    assert _ratio([0, 0, 0, 3], 1) == 4.0 and abs(_jarak(0, 100, 1, 100) - 111.2) < .5
    th = list(range(TAHUN0, TAHUN_AKHIR + 1))
    ev = {(0, 100): [(t, 0.1, 100.1, 7.0, True) for t in th]}  # tiap tahun ada gempa M7 dekat (0,100)
    sk = skor_pusat({"dekat": (0.0, 100.0), "jauh": (-8.0, 120.0)}, ev, 1.0, th)
    assert sk["dekat"][0] > sk["jauh"][0] and sk["dekat"][1] == 1 and sk["jauh"][4] == 0 and sk["jauh"][0] == 10, sk
    lv = beri_kelas([("a", 90), ("b", 50), ("c", 50), ("d", 10)])
    assert lv["a"] == 3 and lv["b"] == lv["c"] and lv["d"] == 0, lv
    assert potongan(dt.date(2026, 10, 16))[-1] == ("2026-01-01", "2026-10-16", 4.5)
    for nama, batas in PLAFON.items():  # berkas keluaran (bila sudah ada) di bawah plafon
        j = os.path.join(KELUAR, nama)
        if os.path.exists(j):
            assert os.path.getsize(j) <= batas, (nama, os.path.getsize(j), batas)
            json.load(open(j))
    m5 = os.path.join(KELUAR, "riwayat_m5.json")
    if os.path.exists(m5):
        d = json.load(open(m5))
        meta = json.load(open(os.path.join(KELUAR, "meta.json")))
        assert len(d["baris"]) == meta["jumlah_m5_indonesia"] and all(r[4] >= 5.0 and -12 <= r[1] <= 7 for r in d["baris"])
    print("ok")


if __name__ == "__main__":
    {"uji": uji, "periksa": periksa}.get(sys.argv[1] if len(sys.argv) > 1 else "", ambil_semua)()
