"""Pembaruan harian: hotspot 7 hari, kompleks kebakaran (DBSCAN), FWI, data BNPB -> public/data/*.json

Pakai:  python3 scripts/data/harian.py
Butuh FIRMS_MAP_KEY (env atau .env). Open-Meteo dan BNPB tidak butuh kunci.
"""
import csv, datetime as dt, io, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
import aturan as A
import fwi as F
from wilayah import AKAR, BNPB, PRIORITAS, PROVINSI, Poligon, Wilayah
from aturan import STATUS

KELUAR = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
BBOX = "94,-11.5,141.5,6.5"
SENSOR = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"]
HARI = 7

# Hitungan utama setara SiPongi/BNPB: MODIS + VIIRS S-NPP + NOAA-20 (tanpa NOAA-21), semua tingkat keyakinan,
# per hari kalender WIB, tanpa dedup. NOAA-21 tetap ditampilkan di peta.
SENSOR_UTAMA = {"M", "N", "N20"}
# Kejadian api (FEDS, Chen dkk. 2022; Indradjad dkk. 2024): VIIRS 3 satelit, keyakinan nominal+tinggi,
# DBSCAN Haversine eps adaptif hingga 1,5 km, minPts 1 (titik tunggal tetap kejadian), jendela 7 hari,
# aktif bila terdeteksi <= 72 jam (168 jam di gambut kering).
EPS_KM, MIN_PTS, JENDELA_HARI, AKTIF_JAM, AKTIF_GAMBUT_JAM = 1.5, 1, 7, 72, 168
R_BUMI = 6371.0088
PIKSEL_HA = 0.375 * 0.375 * 100  # 14,0625 ha per piksel VIIRS 375 m

# Status taktis per kompleks. "Tanggap darurat" adalah status hukum wilayah (P.9/2018) yang ditetapkan
# bupati/gubernur, jadi tidak diberikan oleh model.


def kunci():
    if os.environ.get("FIRMS_MAP_KEY"):
        return os.environ["FIRMS_MAP_KEY"]
    for b in open(os.path.join(AKAR, ".env")):
        if b.startswith("FIRMS_MAP_KEY="):
            return b.split("=", 1)[1].strip()
    sys.exit("FIRMS_MAP_KEY tidak ada")


def ambil(url, coba=4, json_=False):
    if os.environ.get("CACHE"):  # pengembangan: pakai ulang unduhan terakhir
        import hashlib
        jalur = os.path.join(AKAR, "data/raw/cache", hashlib.md5(url.split("?t=")[0].encode()).hexdigest())
        if os.path.exists(jalur):
            teks = open(jalur).read()
            return json.loads(teks) if json_ else teks
        os.makedirs(os.path.dirname(jalur), exist_ok=True)
        hasil = ambil.__wrapped__(url, coba, json_)
        open(jalur, "w").write(json.dumps(hasil) if json_ else hasil)
        return hasil
    return ambil.__wrapped__(url, coba, json_)


def _ambil(url, coba=4, json_=False):
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                teks = r.read().decode()
            return json.loads(teks) if json_ else teks
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url.split('?')[0]}: {e}")
            # kuota FIRMS (5000/10 menit) atau Open-Meteo habis: tunggu lebih lama
            time.sleep(90 if "429" in str(e) or "400" in str(e) else 10 * (i + 1))


ambil.__wrapped__ = _ambil


# ---------------------------------------------------------------- hotspot
def hotspot(k, w):
    hari_ini = dt.datetime.now(dt.timezone.utc).date()
    tugas = []
    for s in SENSOR:  # DATE = tanggal AWAL jendela, rentang maks 5 hari: dua jendela = 10 hari UTC, lalu dipotong 7 x 24 jam
        for mulai in (4, 9):
            tugas.append((s, f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{k}/{s}/{BBOX}/5/{hari_ini - dt.timedelta(days=mulai)}"))
    with ThreadPoolExecutor(4) as ex:
        teks = list(ex.map(lambda t: (t[0], ambil(t[1])), tugas))
    batas = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=HARI)
    titik, lihat = [], set()
    for sensor, isi in teks:
        for r in csv.DictReader(io.StringIO(isi)):
            conf = r.get("confidence", "")
            if sensor.startswith("MODIS"):  # BRIN: rendah 0-29, sedang 30-79, tinggi 80-100
                kc = 0 if not conf.isdigit() or int(conf) < 30 else 1 if int(conf) < 80 else 2
            else:  # VIIRS l / n / h
                kc = {"l": 0, "n": 1, "h": 2}.get(conf, 1)
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00")
            if t < batas:
                continue
            lat, lon = round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)
            if (lat, lon, t, sensor) in lihat:
                continue
            lihat.add((lat, lon, t, sensor))
            adm = w.cari(lon, lat)
            if not adm:
                continue  # laut atau negara tetangga
            titik.append({
                "lat": lat, "lon": lon, "t": t, "s": {"VIIRS_SNPP_NRT": "N", "VIIRS_NOAA20_NRT": "N20",
                                                      "VIIRS_NOAA21_NRT": "N21", "MODIS_NRT": "M"}[sensor],
                "frp": round(float(r.get("frp") or 0), 1), "c": kc, "adm": adm,
                "px": max(float(r.get("scan") or .4), float(r.get("track") or .4)),  # ukuran piksel sebenarnya (km)
            })
    titik.sort(key=lambda p: p["t"])
    return titik


# ---------------------------------------------------------------- DBSCAN Haversine
def haversine(a, b):
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lon"] - a["lon"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R_BUMI * math.asin(math.sqrt(h))


def dbscan(pts, eps=EPS_KM, min_pts=MIN_PTS, jam=48):
    """ST-DBSCAN. Dua titik bertetangga bila jaraknya <= eps_ij dan selisih waktunya <= jam.
    eps_ij = 1,5 x ukuran piksel terbesar keduanya (piksel VIIRS melebar ke tepi sapuan), dibatasi 0,6-eps km.
    Sel indeks dihitung dari eps dalam derajat bujur pada lintang 12 derajat (Indonesia ada di |lintang| < 11)."""
    sel = eps / (111.195 * math.cos(math.radians(12)))
    grid = {}
    for i, p in enumerate(pts):
        grid.setdefault((math.floor(p["lon"] / sel), math.floor(p["lat"] / sel)), []).append(i)
    batas_t = dt.timedelta(hours=jam)

    def tetangga(i):
        p = pts[i]
        gx, gy = math.floor(p["lon"] / sel), math.floor(p["lat"] / sel)
        out = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for j in grid.get((gx + dx, gy + dy), ()):
                    q = pts[j]
                    e = min(eps, max(0.6, 1.5 * max(p.get("px", .4), q.get("px", .4))))
                    if abs(p["t"] - q["t"]) <= batas_t and haversine(p, q) <= e:
                        out.append(j)
        return out

    label, inti, k = [None] * len(pts), [False] * len(pts), -1
    for i in range(len(pts)):
        if label[i] is not None:
            continue
        nb = tetangga(i)
        if len(nb) < min_pts:
            label[i] = -1
            continue
        k += 1
        label[i], inti[i] = k, True
        antre = [j for j in nb if j != i]
        while antre:
            j = antre.pop()
            if label[j] == -1:
                label[j] = k  # titik tepi
            if label[j] is not None:
                continue
            label[j] = k
            nb2 = tetangga(j)
            if len(nb2) >= min_pts:
                inti[j] = True
                antre.extend(nb2)
    return label, inti


def lambung(xy):
    """Convex hull monotone chain."""
    xy = sorted(set(xy))
    if len(xy) < 3:
        return xy

    def silang(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    bawah, atas = [], []
    for p in xy:
        while len(bawah) >= 2 and silang(bawah[-2], bawah[-1], p) <= 0:
            bawah.pop()
        bawah.append(p)
    for p in reversed(xy):
        while len(atas) >= 2 and silang(atas[-2], atas[-1], p) <= 0:
            atas.pop()
        atas.append(p)
    return bawah[:-1] + atas[:-1]


def luas_km2(ring, lat0):
    kx, ky = 111.32 * math.cos(math.radians(lat0)), 110.57
    s = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        s += (x1 * kx) * (y2 * ky) - (x2 * kx) * (y1 * ky)
    return abs(s) / 2


# ---------------------------------------------------------------- FWI grid
def grid_darat(w, sel=0.5):
    titik = []
    lat = -11.25
    while lat <= 6.25:
        lon = 94.75
        while lon <= 141.25:
            adm = w.cari(lon, lat)
            if adm:
                titik.append((round(lat, 2), round(lon, 2), adm[0]))
            lon += sel
        lat += sel
    return titik


def siang(h):
    """Nilai jam 12 waktu setempat + hujan 24 jam (13.00 kemarin s.d. 12.00). Hari kosong tetap ada (None)."""
    out = []
    for i, waktu in enumerate(h["time"]):
        if not waktu.endswith("T12:00") or i < 23:
            continue
        hj = h["precipitation"][i - 23:i + 1]
        hujan = None if any(x is None for x in hj) else sum(hj)
        out.append((waktu[:10], h["temperature_2m"][i], h["relative_humidity_2m"][i], h["wind_speed_10m"][i], hujan, h["wind_direction_10m"][i]))
    return out


VAR = "hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&timezone=auto"


def cuaca_fwi(grid):
    """FWI harian per sel dengan keadaan bersambung (peer review M1).
    - Keadaan FFMC/DMC/DC per sel disimpan di fwi_state.json dan dilanjutkan tiap hari, bukan dimulai ulang.
    - Sel tanpa keadaan dipanaskan dari reanalisis ERA5 (Open-Meteo archive) 300 hari ke belakang,
      sampai 8 hari lalu; sisanya dari forecast API (past_days 8) + prakiraan 3 hari.
    - Keadaan disimpan pada H-2 supaya revisi data beberapa hari terakhir ikut terbawa besok."""
    jalur = os.path.join(KELUAR, "fwi_state.json")
    keadaan = json.load(open(jalur)) if os.path.exists(jalur) else {}
    hari_ini = dt.datetime.now(WIB).date()
    tgl_simpan = (hari_ini - dt.timedelta(days=2)).isoformat()
    batas_lama = (hari_ini - dt.timedelta(days=8)).isoformat()
    kunci_ = lambda g: f"{g[0]},{g[1]}"

    # 1. panaskan sel yang belum punya keadaan (atau keadaannya terlalu lama)
    baru = [g for g in grid if kunci_(g) not in keadaan or keadaan[kunci_(g)]["tgl"] < batas_lama]
    akhir_arsip = hari_ini - dt.timedelta(days=8)
    for a in range(0, len(baru), 25):
        bagian = baru[a:a + 25]
        url = ("https://archive-api.open-meteo.com/v1/archive?latitude=" + ",".join(str(g[0]) for g in bagian)
               + "&longitude=" + ",".join(str(g[1]) for g in bagian)
               + f"&start_date={hari_ini - dt.timedelta(days=300)}&end_date={akhir_arsip}&" + VAR)
        try:
            data = ambil(url, json_=True, coba=2)
        except Exception as e:  # kuota Open-Meteo habis: sel ini dipanaskan dari 92 hari forecast (lihat langkah 2)
            print("ERA5 dilewati:", e, file=sys.stderr)
            break
        for g, d in zip(bagian, data if isinstance(data, list) else [data]):
            hari = siang(d["hourly"])
            seri = F.deret([x[1:5] for x in hari])
            if seri:
                keadaan[kunci_(g)] = {"tgl": hari[-1][0], "kode": [seri[-1]["ffmc"], seri[-1]["dmc"], seri[-1]["dc"]], "sumber": "ERA5"}
        time.sleep(2)

    # 2. lanjutkan dengan data 8 hari terakhir + prakiraan
    hasil = []
    for a in range(0, len(grid), 80):
        bagian = grid[a:a + 80]
        url = ("https://api.open-meteo.com/v1/forecast?latitude=" + ",".join(str(g[0]) for g in bagian)
               + "&longitude=" + ",".join(str(g[1]) for g in bagian)
               + f"&past_days={8 if all(kunci_(g) in keadaan for g in bagian) else 92}&forecast_days=4&" + VAR)
        data = ambil(url, json_=True)
        for g, d in zip(bagian, data if isinstance(data, list) else [data]):
            k = keadaan.get(kunci_(g), {"tgl": "0000", "kode": list(F.AWAL), "sumber": "awal standar"})
            hari = [x for x in siang(d["hourly"]) if x[0] > k["tgl"]]
            seri = F.deret([x[1:5] for x in hari], awal=tuple(k["kode"]))
            for x, sr in zip(hari, seri):
                if x[0] == tgl_simpan:
                    keadaan[kunci_(g)] = {"tgl": x[0], "kode": [sr["ffmc"], sr["dmc"], sr["dc"]], "sumber": k.get("sumber", "")}
            hasil.append({"lat": g[0], "lon": g[1], "prov": g[2], "hari": [
                {"tgl": x[0], "t": x[1], "rh": x[2], "ws": x[3], "wd": x[5], "hujan": None if x[4] is None else round(x[4], 1),
                 **{kk: round(v, 1) for kk, v in sr.items()}}
                for x, sr in zip(hari, seri)]})
        time.sleep(1)
    with open(jalur, "w") as f:
        json.dump(keadaan, f, separators=(",", ":"))
    return hasil


def terdekat(grid, lat, lon):
    return min(grid, key=lambda g: (g["lat"] - lat) ** 2 + (g["lon"] - lon) ** 2)


# ---------------------------------------------------------------- utama
def main():
    os.makedirs(KELUAR, exist_ok=True)
    w = Wilayah()
    sekarang = dt.datetime.now(WIB)
    hari_ini = sekarang.date().isoformat()

    print("hotspot...", file=sys.stderr)
    titik = hotspot(kunci(), w)
    try:  # riwayat harian 35 hari per provinsi & kab/kota (tren 7/30 hari); gagal di sini tidak menghentikan pembaruan
        import harian30
        harian30.perbarui(KELUAR, titik, kunci(), w, ambil, BBOX, hari_ini, dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=HARI))
    except Exception as e:
        print("harian30 gagal:", e, file=sys.stderr)

    lama = os.path.join(KELUAR, "fwi.json")
    if os.environ.get("FWI") == "0" and os.path.exists(lama) and json.load(open(lama)).get("hari_ini") == hari_ini:
        print("FWI: pakai hitungan hari ini yang sudah ada", file=sys.stderr)  # FWI berbasis cuaca jam 12, cukup dihitung sekali sehari
        grid = json.load(open(lama))["grid"]
    else:
        print("FWI...", file=sys.stderr)
        try:
            grid = cuaca_fwi(grid_darat(w))
        except Exception as e:
            if not os.path.exists(lama):
                raise
            print("FWI gagal, pakai hitungan terakhir:", e, file=sys.stderr)
            grid = json.load(open(lama))["grid"]

    def fwi_hari(g, tgl):  # tidak ada data hari ini = None (bukan prakiraan hari lain)
        return next((h for h in g["hari"] if h["tgl"] == tgl), None)

    print("kejadian api...", file=sys.stderr)
    kini = dt.datetime.now(dt.timezone.utc)
    akhir = max((p["t"] for p in titik), default=kini)
    tgl = lambda t: t.astimezone(WIB).date()
    hari_akhir = tgl(kini)
    # gunung api aktif (aturan.GUNUNG_API) tidak dijadikan kompleks karhutla; titiknya tetap ada di hotspot.json (setara SiPongi)
    viirs = [p for p in titik if p["s"] != "M" and p["c"] >= 1 and p["t"] >= kini - dt.timedelta(days=JENDELA_HARI)
             and not A.gunung_api(p["lat"], p["lon"])]
    label, inti = dbscan(viirs)
    kluster = {}
    for p, l in zip(viirs, label):
        kluster.setdefault(l, []).append(p)

    def pix(p):  # sel kisi ~375 m tempat titik jatuh
        return (round(p["lat"] / 0.003375), round(p["lon"] * math.cos(math.radians(p["lat"])) / 0.003375))

    daops = json.load(open(os.path.join(KELUAR, "daops.json"))) if os.path.exists(os.path.join(KELUAR, "daops.json")) else []

    def km(a1, o1, a2, o2):
        return haversine({"lat": a1, "lon": o1}, {"lat": a2, "lon": o2})

    # riwayat 2015-sekarang per kecamatan (public/data/sejarah.json) -> indeks risiko untuk peringkat prioritas
    RISIKO = {}
    jalur_sj = os.path.join(KELUAR, "sejarah.json")
    if os.path.exists(jalur_sj):
        sj = json.load(open(jalur_sj))
        maks = max((sum(v) for v in sj["kec"].values()), default=1)
        RISIKO = {k: A.risiko_riwayat(v, sj["tahun"], maks) for k, v in sj["kec"].items()}

    # lahan: gambut (peta, bukan tebakan DC), fungsi kawasan hutan, konsesi -> penanggung jawab lahan
    GAMBUT = Poligon(os.path.join(KELUAR, "lahan/gambut.geojson"))
    KAWASAN = Poligon(os.path.join(KELUAR, "lahan/kawasan.geojson"))
    KONSESI = Poligon(os.path.join(KELUAR, "lahan/konsesi.geojson"))
    ada_gambut = bool(GAMBUT.indeks)

    def penanggung(lon, lat):
        """Rute penerusan titik panas menurut status lahan (P.32/2016 dan praktik KLHK)."""
        k = KONSESI.cari(lon, lat)
        if k:
            return {"sawit": "Perusahaan perkebunan", "hph": "Pemegang PBPH (hutan alam)"}.get(k.get("jenis"), "Pemegang konsesi"), k.get("pemegang") or k.get("nama")
        kw = KAWASAN.cari(lon, lat)
        if kw:
            f = kw.get("fungsi")
            if f in ("HK",):
                return "BKSDA / Balai Taman Nasional", kw.get("nama") or "Kawasan konservasi"
            if f in ("HL", "THR"):
                return "Pemerintah daerah (KPH/dinas kehutanan)", "Hutan lindung" if f == "HL" else "Tahura"
            return "KPH / pemegang PBPH", {"HP": "Hutan produksi", "HPT": "Hutan produksi terbatas", "HPK": "Hutan produksi dapat dikonversi"}.get(f, f)
        return "Desa / camat / bupati", "Area penggunaan lain (lahan masyarakat)"

    fitur, s1 = [], 0
    t24 = kini - dt.timedelta(hours=24)
    for l, pts in kluster.items():
        terakhir = max(p["t"] for p in pts)
        lat0 = sum(p["lat"] for p in pts) / len(pts)
        lon0 = sum(p["lon"] for p in pts) / len(pts)
        g = terdekat(grid, lat0, lon0)
        h = fwi_hari(g, hari_ini)
        di_gambut = GAMBUT.cari(lon0, lat0) is not None or any(GAMBUT.cari(p["lon"], p["lat"]) for p in pts[:20])
        # bara gambut: dipertahankan 7 hari bila di gambut DAN kering (DC > 350); tanpa peta gambut pakai DC saja
        kering = bool(h and h["dc"] > 350) and (di_gambut or not ada_gambut)
        # umur diukur dari jam sekarang; gambut sangat kering (DC > 350) dipertahankan 7 hari karena bara
        # bisa tak terdeteksi di bawah awan/asap (peer review C4)
        if terakhir < kini - dt.timedelta(hours=AKTIF_GAMBUT_JAM if kering else AKTIF_JAM):
            continue
        jam_sejak = (kini - terakhir).total_seconds() / 3600
        hari = {tgl(p["t"]) for p in pts}
        n_ini = sum(1 for p in pts if tgl(p["t"]) == hari_akhir)
        n_kmrn = sum(1 for p in pts if tgl(p["t"]) == hari_akhir - dt.timedelta(days=1))
        p24 = [p for p in pts if p["t"] >= t24]
        px24 = len({pix(p) for p in p24})
        sev = A.keparahan(len(pts), len(hari), n_ini, n_kmrn, px24)
        fdrs = A.kelas_fwi(h["fwi"]) if h else None
        lv = A.status(fdrs, sev)
        if len(pts) < 3 and lv == 0 and jam_sejak <= 24:
            s1 += 1  # titik tunggal/ganda, cuaca tidak berbahaya: dihitung, belum dinilai, tidak digambar
            continue
        d0 = min(daops, key=lambda d: km(lat0, lon0, d["lat"], d["lon"])) if daops else None
        jd = round(km(lat0, lon0, d0["lat"], d0["lon"])) if d0 else None
        ring = lambung([(p["lon"], p["lat"]) for p in pts])
        piksel = {pix(p) for p in pts}
        adm = w.cari(lon0, lat0) or max((p["adm"] for p in pts), key=[p["adm"] for p in pts].count)
        fitur.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [[[round(v, 3) for v in x] for x in ring + ring[:1]]]}
            if len(ring) >= 3 and lv >= 2 else {"type": "Point", "coordinates": [round(lon0, 4), round(lat0, 4)]},
            "properties": {
                "id": "", "lat": round(lat0, 4), "lon": round(lon0, 4), "n": len(pts), "n24": len(p24),
                "hari": len(hari), "px24": px24, "ini": n_ini, "kmrn": n_kmrn, "sev": sev, "fdrs": fdrs,
                "frp": round(sum(p["frp"] for p in pts), 1), "frp24": round(sum(p["frp"] for p in p24), 1),
                "awal": min(p["t"] for p in pts).isoformat(), "akhir": terakhir.isoformat(), "jam_sejak": round(jam_sejak, 1),
                "teramati": jam_sejak <= 24,  # False = tidak terdeteksi 24 jam: bisa padam, bisa tertutup awan/asap
                "luas": round(len(piksel) * PIKSEL_HA, 1),
                "prov": adm[0], "kab": adm[1], "kec": adm[2],
                "cuaca": bool(h),
                **{k: (h or {}).get(k) for k in ("fwi", "ffmc", "dmc", "dc", "isi", "bui", "ws", "wd", "rh", "t")},
                "daops": d0 and d0["kode"], "jarak_daops": jd,
                # benih simulasi: titik 24 jam terakhir (maks 80), bukan lambung 7 hari
                "api24": [[round(p["lon"], 4), round(p["lat"], 4)] for p in sorted(p24, key=lambda p: -p["frp"])[:80]] if lv >= 2 else [],
                "risiko": RISIKO.get("|".join(adm), 0),  # indeks risiko riwayat kecamatan 0-100
                "gambut": di_gambut, "tanggung": penanggung(lon0, lat0),
                "skor": A.skor_dengan_riwayat(A.skor(px24, sum(p["frp"] for p in p24), len(hari), (h or {}).get("isi"),
                                                     (h or {}).get("dc") if (di_gambut or not ada_gambut) else 0, jd), RISIKO.get("|".join(adm), 0)),
                "level": lv, "status": STATUS[lv],
            }})

    # Prioritas = ambang hasil uji balik (lihat aturan.py); skor hanya untuk urutan di dalam wilayah kerja Daops
    for f in fitur:
        q = f["properties"]
        if q["level"] == 2 and q["teramati"] and A.prioritas(q["px24"], q["fwi"]):
            q["level"], q["status"] = 3, STATUS[3]
    kelompok = {}
    for f in fitur:
        q = f["properties"]
        if q["level"] == 3:
            g = q["daops"] if q["jarak_daops"] is not None and q["jarak_daops"] <= 150 else f"{q['prov']}|{q['kab']}"
            kelompok.setdefault(g, []).append(q)
    for qs in kelompok.values():
        for i, q in enumerate(sorted(qs, key=lambda q: -q["skor"])):
            q["peringkat"] = i + 1
    fitur.sort(key=lambda f: (-f["properties"]["level"], -f["properties"]["skor"]))
    for i, f in enumerate(fitur):
        f["properties"]["id"] = f"K{i + 1:04d}"
    # berkas ringan: kompleks rendah (level 0-1) cukup atribut inti; teks status diambil dari level di peramban
    INTI = {"id", "lat", "lon", "n", "px24", "hari", "level", "prov", "kab", "kec", "teramati", "jam_sejak", "fwi", "dc", "gambut", "risiko", "luas", "sev"}
    for f in fitur:
        q = f["properties"]
        q.pop("status", None)
        if q["level"] < 2:
            for k in [k for k in q if k not in INTI]:
                q.pop(k)

    # ringkasan per provinsi: hitungan utama per hari WIB (setara SiPongi/BNPB) + FWI
    rek = {}
    for p in titik:
        if p["s"] not in SENSOR_UTAMA:
            continue
        r = rek.setdefault(p["adm"][0], {"harian": {}, "tinggi": {}})
        d = tgl(p["t"]).isoformat()
        r["harian"][d] = r["harian"].get(d, 0) + 1
        if p["c"] == 2:
            r["tinggi"][d] = r["tinggi"].get(d, 0) + 1
    for f in fitur:
        q = f["properties"]
        r = rek.setdefault(q["prov"], {"harian": {}, "tinggi": {}})
        r["kluster"] = r.get("kluster", 0) + 1
        r["level"] = max(r.get("level", 0), q["level"])
    for kode in PROVINSI:
        hh = [h for h in (fwi_hari(g, hari_ini) for g in grid if g["prov"] == kode) if h]
        r = rek.setdefault(kode, {"harian": {}, "tinggi": {}})
        if hh:
            r["fwi_maks"] = max(h["fwi"] for h in hh)
            r["fwi_rata"] = round(sum(h["fwi"] for h in hh) / len(hh), 1)
            r["dc_maks"] = max(h["dc"] for h in hh)
            r["ffmc_maks"] = max(h["ffmc"] for h in hh)

    # BNPB
    try:
        bnpb = ambil(f"https://gis.bnpb.go.id/karhutla2026/karhutla-api.php?t={int(time.time())}", json_=True)
    except Exception as e:
        print("BNPB gagal:", e, file=sys.stderr)
        lama = os.path.join(KELUAR, "bnpb.json")
        bnpb = json.load(open(lama)) if os.path.exists(lama) else {"rows": [], "gagal": str(e)}

    # tulis; nama wilayah titik disimpan sebagai indeks ke tabel supaya berkas kecil
    def simpan(nama, isi):
        with open(os.path.join(KELUAR, nama), "w") as f:
            json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))

    tabel = sorted({"|".join(p["adm"]) for p in titik})
    idx = {k: i for i, k in enumerate(tabel)}
    simpan("hotspot.json", {
        "kolom": ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib"],
        "acuan": akhir.isoformat(), "wilayah": tabel, "sensor_utama": sorted(SENSOR_UTAMA),
        "baris": [[p["lat"], p["lon"], round((p["t"] - akhir).total_seconds() / 3600, 2), p["s"], p["frp"], p["c"],
                   idx["|".join(p["adm"])], tgl(p["t"]).isoformat()[5:]] for p in titik]})
    simpan("hotspot72.json", {
        "kolom": ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib"],
        "acuan": akhir.isoformat(), "wilayah": tabel, "sensor_utama": sorted(SENSOR_UTAMA), "jam_maks": 72,
        "baris": [[p["lat"], p["lon"], round((p["t"] - akhir).total_seconds() / 3600, 2), p["s"], p["frp"], p["c"],
                   idx["|".join(p["adm"])], tgl(p["t"]).isoformat()[5:]] for p in titik if p["t"] >= akhir - dt.timedelta(hours=72)]})
    simpan("kluster.json", {"type": "FeatureCollection", "features": fitur})
    simpan("fwi.json", {"sel": 0.5, "hari_ini": hari_ini, "grid": [
        {"lat": g["lat"], "lon": g["lon"], "prov": g["prov"], "hari": g["hari"][-8:]} for g in grid]})
    simpan("wilayah.json", rek)
    simpan("bnpb.json", bnpb)
    simpan("meta.json", {
        "dibuat": sekarang.isoformat(timespec="minutes"), "data_terakhir": akhir.isoformat(), "hari_wib": hari_akhir.isoformat(),
        "jumlah_titik": len(titik), "jumlah_kluster": len(fitur), "titik_tunggal_belum_dinilai": s1,
        "provinsi": PROVINSI, "prioritas": PRIORITAS, "bnpb": BNPB, "status": STATUS,
        "dbscan": {"eps_km": EPS_KM, "min_pts": MIN_PTS, "jendela_hari": JENDELA_HARI, "aktif_jam": AKTIF_JAM, "aktif_gambut_jam": AKTIF_GAMBUT_JAM, "jam_st": 48}})
    from collections import Counter
    print(f"{len(titik)} titik, {len(fitur)} kompleks (+{s1} titik tunggal belum dinilai), {len(grid)} sel FWI;",
          "level", dict(Counter(f["properties"]["level"] for f in fitur)), file=sys.stderr)


if __name__ == "__main__":
    main()
