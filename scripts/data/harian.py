"""Pembaruan harian: hotspot 7 hari, kompleks kebakaran (DBSCAN), FWI, data BNPB -> public/data/*.json

Pakai:  python3 scripts/data/harian.py
Butuh FIRMS_MAP_KEY (env atau .env). Open-Meteo dan BNPB tidak butuh kunci.
"""
import csv, datetime as dt, io, json, math, os, socket, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
import aturan as A
import fwi as F
import pfvi as P
import gambut_bara as GB
from wilayah import AKAR, BNPB, PRIORITAS, PROVINSI, Poligon, Wilayah
from garis_api import garis as garis_api
from aturan import STATUS

KELUAR = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
BBOX = "94,-11.5,141.5,6.5"
SENSOR = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"]
HARI = 7

# Hitungan utama (keputusan pemilik 25 Okt 2026): LOKASI UNIK ~375 m per hari kalender WIB dari MODIS + S-NPP + NOAA-20 + NOAA-21,
# keyakinan sedang/tinggi saja (definisi di titik_unik.py). Sengaja tidak sama dengan SiPongi/GIS BNPB (titik mentah M+N+N20).
# Titik keyakinan rendah tetap ada di berkas titik dan digambar di peta; kolom "hitung" hotspot.json menandai deteksi yang dihitung.
import titik_unik as TU  # noqa: E402
# Kejadian api (FEDS, Chen dkk. 2022; Indradjad dkk. 2024): VIIRS 3 satelit, keyakinan nominal+tinggi,
# DBSCAN Haversine eps adaptif hingga 1,5 km, minPts 1 (titik tunggal tetap kejadian), jendela 7 hari,
# aktif bila terdeteksi <= 72 jam (168 jam di gambut kering).
EPS_KM, MIN_PTS, JENDELA_HARI, AKTIF_JAM, AKTIF_GAMBUT_JAM = 1.5, 1, 7, 72, 168
R_BUMI = 6371.0088

# Klasifikasi firespot ala Kemenhut SIPANTAU KARHUTLA (paparan pembentukan firespot, 22 Okt 2026): saringan "api nyata?" DI DEPAN
# urutan prioritas level 0-3 kita. Kelas harian per cluster: H bila >= 1 titik keyakinan tinggi (c=2) ATAU >= AMBANG_MEDIUM_PX piksel
# nominal (c=1); selain itu M. Beda sengaja dari Kemenhut: yang dihitung PIKSEL UNIK (pix), bukan titik, supaya satu api yang dilihat
# 3 satelit VIIRS (S-NPP, NOAA-20, NOAA-21) tidak terhitung 3 kali. Persistensi spasial = keanggotaan cluster ST-DBSCAN yang sama
# (eps adaptif 0,6-1,5 km, sambungan 48 jam), BUKAN radius 375 m Kemenhut: posisi VIIRS bergeser +-375 m antarlintasan dan piksel
# melebar ~0,8 km di tepi sapuan, jadi 375 m membuang api asli.
# UJI BALIK (ujibalik_firespot.py -> public/data/ujibalik_firespot.json; S-NPP saja, satu snapshot per hari, Agu-Okt, sev >= 2 TANPA cuaca):
#   api besar (>= 100 piksel) 2019: 142, 2023: 34. Hari pertama sev >= 2 berstatus "mungkin": 28 (19,7%) dan 9 (26,5%);
#   tertunda 1 hari: 22 dan 6, 2 hari: 6 dan 3; tidak pernah "ya": 0; tertunda pada px24 >= 10 atau >= 15 (jalur level 3): 0.
#   Batasan: hanya api besar, satu snapshot per hari, sev tanpa FWI.
# UJI BALIK 3 SATELIT (2019: S-NPP+N20, 2023: +N21; api besar >= 100 piksel unik LINTAS sensor, setara ~60 piksel S-NPP, jadi 207 dan 115
#   bukan "api besar bertambah"): "mungkin" pada hari pertama sev >= 2 25,1% dan 18,3%, tunda <= 2 hari kecuali 2 kasus (3 dan 4 hari, 2019),
#   tak pernah "ya" 0, level 3 tertunda 0. Ambang 3 untuk semua: tunda turun ke 12,6% / 7,0% tetapi cluster "ya" +38-44% (74-77% di antaranya
#   umur 1 hari, <= 4 px; proksi, bukan bukti alarm palsu); ambang 3 hanya hari tanpa lintasan siang: turun 1-2 poin untuk +5% cluster.
#   Ambang 4 dipertahankan. Layak diuji berikutnya: ambang 3 khusus gambut (butuh masker gambut di ujibalik_firespot.py).
# BIAS SIANG-MALAM: keyakinan tinggi ("h") jauh lebih jarang malam: porsi titik "h" di api besar siang 9,9-12,6%, malam 1,4-3,0%
#   (2019, 2023, S-NPP dan gabungan). Api malam lolos "H" nyaris hanya lewat jalur >= AMBANG_MEDIUM_PX piksel unik; dampaknya terukur di atas.
AMBANG_MEDIUM_PX = 4
SUMBER_FIRESPOT = "Kemenhut SIPANTAU KARHUTLA, paparan pembentukan firespot 22 Okt 2026"
# pola -> firespot; "mungkin" dibatasi level <= 1 (cek lapangan dulu)
POLA_YA = {"HH", "H", "MH", "MMM"}

# Tugas otomatis untuk Worker (rancangan api padam 0.4, keputusan pemilik 22 Okt 2026): level 3, ATAU level 2 yang memenuhi
# minimal satu syarat. Ambang di bawah adalah asumsi platform (belum diuji balik), bukan standar baku; ikut ditulis ke JSON.
#   permukiman: desa (osm/desa.json, 9 provinsi karhutla) atau fasilitas (fasilitas.json) dalam 5 km dari pusat/titik api24.
#               5 km = radius tengah dampak.RADIUS (1, 5, 10) untuk kedekatan desa ke kompleks aktif.
#   konsesi   : pusat atau titik api24 di dalam poligon konsesi yang izinnya tidak berakhir (lahan/konsesi.geojson).
#   HIPOTESIS: ambang tumbuh 3 titik / 1,5 kali dan radius 5 km BELUM di-backtest terhadap kejadian nyata; angka dipilih untuk
#   menyaring noise dan menekan jumlah tugas. Ulangi hitungan dampaknya: python3 scripts/data/harian.py hitung-otomatis
#   tumbuh    : api yang SUDAH ada 24 jam lalu (n24s >= 1) dan titik 24 jam terakhir naik: tambah >= 3 titik DAN >= 1,5 kali.
#               Api baru (n24s = 0) bukan "tumbuh" (3 titik baru melonjakkan 1.048 dari 2.065 level 2 pada data 12 Okt; dengan
#               n24s >= 1 tinggal 314); api baru dekat desa tetap tertangkap syarat permukiman. Tanpa n24s (berkas lama) tidak dinilai.
SYARAT = {"permukiman_km": 5.0, "tumbuh_tambah": 3, "tumbuh_kali": 1.5}

# Status taktis per kompleks. "Tanggap darurat" adalah status hukum wilayah (P.9/2018) yang ditetapkan
# bupati/gubernur, jadi tidak diberikan oleh model.


def pix(p):  # sel kisi ~375 m tempat titik jatuh
    return TU.sel(p["lat"], p["lon"])


def tgl(t):  # hari kalender WIB
    return t.astimezone(WIB).date()


def firespot(pts):
    """Titik cluster (p["c"] 1 nominal, 2 tinggi; p["t"] waktu) -> (pola, "ya"|"mungkin"). Hari acuan Hd = hari WIB deteksi terakhir."""
    per = {}
    for p in pts:
        per.setdefault(tgl(p["t"]), []).append(p)
    def kelas(h):
        if h not in per:
            return None
        ps = per[h]
        return "H" if any(p["c"] == 2 for p in ps) or len({pix(p) for p in ps if p["c"] == 1}) >= AMBANG_MEDIUM_PX else "M"
    hd = max(per)
    k0, k1, k2 = (kelas(hd - dt.timedelta(days=i)) for i in range(3))
    pola = "HH" if k0 == "H" and k1 == "H" else "H" if k0 == "H" else "MH" if k1 == "H" else "MMM" if k1 == k2 == "M" else "MM" if k1 == "M" else "M"
    return pola, "ya" if pola in POLA_YA else "mungkin"


def gerbang_firespot(q):
    """"mungkin" dibatasi level 1 (STATUS[1], cek lapangan dulu). Hanya yang teramati (<= 24 jam): cluster tanpa deteksi baru
    (mis. gambut kering dipertahankan 168 jam untuk bara) tetap level lamanya. `turun` = diturunkan gerbang, kandidat jalur verifikasi."""
    if q["firespot"] == "mungkin" and q["level"] > 1 and q["teramati"]:
        q["level"], q["status"], q["turun"] = 1, STATUS[1], True


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


# AAAA firms.modaps.eosdis.nasa.gov = fd00:aa:bb:2080::c676:c222 (alamat IPv6 privat, tak terjangkau dari internet). Runner GitHub
# kadang gagal "[Errno 101] Network is unreachable" (data.yml 20 dan 22 Okt 2026). Urutkan alamat IPv4 lebih dulu; IPv6 tetap cadangan.
_getaddrinfo_asli = socket.getaddrinfo


def _ipv4_dulu(*a, **k):
    return sorted(_getaddrinfo_asli(*a, **k), key=lambda r: r[0] != socket.AF_INET)


socket.getaddrinfo = _ipv4_dulu


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
            # kuota FIRMS (5000/10 menit) atau Open-Meteo habis: tunggu lebih lama; jaringan putus: 30/60/90 dtk (dulu 10/20/30, terlalu pendek)
            jaringan = isinstance(e, OSError) and not isinstance(e, urllib.error.HTTPError)
            time.sleep(90 if "429" in str(e) or "400" in str(e) else 30 * (i + 1) if jaringan else 10 * (i + 1))


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
                "scan": float(r.get("scan") or 0), "track": float(r.get("track") or 0),  # jejak piksel untuk garis luar kompleks
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


VAR = "hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,et0_fao_evapotranspiration&timezone=auto"


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
    # PFVI hanya di sel gambut; keadaannya (x, muka air proxy, hujan kemarin) di pfvi_state.json, disimpan pada H-2 juga
    jalur_pf = os.path.join(KELUAR, "pfvi_state.json")
    keadaan_pf = json.load(open(jalur_pf)) if os.path.exists(jalur_pf) else {}
    gambut = Poligon(os.path.join(KELUAR, "lahan/gambut.geojson"))
    sel_pf = P.sel_gambut(grid, gambut.cari) if gambut.indeks else set()
    pf_lama = lambda k: k not in keadaan_pf or keadaan_pf[k]["tgl"] < batas_lama

    # 1. panaskan sel yang belum punya keadaan (atau keadaannya terlalu lama); sel gambut tanpa keadaan PFVI ikut
    baru = [g for g in grid if kunci_(g) not in keadaan or keadaan[kunci_(g)]["tgl"] < batas_lama]
    hangat = [g for g in grid if g in baru or (kunci_(g) in sel_pf and pf_lama(kunci_(g)))]
    akhir_arsip = hari_ini - dt.timedelta(days=8)
    for a in range(0, len(hangat), 25):
        bagian = hangat[a:a + 25]
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
            if seri and g in baru:
                keadaan[kunci_(g)] = {"tgl": hari[-1][0], "kode": [seri[-1]["ffmc"], seri[-1]["dmc"], seri[-1]["dc"]], "sumber": "ERA5"}
            if kunci_(g) in sel_pf and pf_lama(kunci_(g)):
                _, kb = P.lanjut(P.hari_dari_jam(d["hourly"]), None, hari[-1][0] if hari else "")
                if kb:
                    kb["sumber"] = "ERA5"
                    keadaan_pf[kunci_(g)] = kb
        time.sleep(2)

    # 2. lanjutkan dengan data 8 hari terakhir + prakiraan
    hasil = []
    for a in range(0, len(grid), 80):
        bagian = grid[a:a + 80]
        url = ("https://api.open-meteo.com/v1/forecast?latitude=" + ",".join(str(g[0]) for g in bagian)
               + "&longitude=" + ",".join(str(g[1]) for g in bagian)
               + f"&past_days={8 if all(kunci_(g) in keadaan and (kunci_(g) not in sel_pf or kunci_(g) in keadaan_pf) for g in bagian) else 92}&forecast_days=4&" + VAR)
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
            if kunci_(g) in sel_pf:  # tambah pfvi & pg (peluang gabungan) di hari yang punya keduanya
                pf, keadaan_pf[kunci_(g)] = P.lanjut(P.hari_dari_jam(d["hourly"]), keadaan_pf.get(kunci_(g)), tgl_simpan)
                for h_ in hasil[-1]["hari"]:
                    if h_["tgl"] in pf:
                        h_["pfvi"] = round(pf[h_["tgl"]], 1)
                        h_["pg"] = round(P.peluang(h_["fwi"], pf[h_["tgl"]]), 2)
                if keadaan_pf.get(kunci_(g)):  # muka air proxy (cm, negatif = di bawah permukaan) untuk estimasi bara
                    hasil[-1]["wt"] = round(keadaan_pf[kunci_(g)]["wt"], 1)
        time.sleep(1)
    for j, isi in ((jalur, keadaan), (jalur_pf, keadaan_pf)):
        with open(j, "w") as f:
            json.dump(isi, f, separators=(",", ":"))
    return hasil


def terdekat(grid, lat, lon):
    return min(grid, key=lambda g: (g["lat"] - lat) ** 2 + (g["lon"] - lon) ** 2)


def wt_dekat(grid, g, lat, lon, radius=1.0):
    """Muka air proxy sel terdekat; bila sel itu tak punya, sel terdekat yang punya dalam radius derajat; selain itu None."""
    if g.get("wt") is not None:
        return g["wt"]
    ada = [c for c in grid if c.get("wt") is not None and abs(c["lat"] - lat) <= radius and abs(c["lon"] - lon) <= radius]
    return min(ada, key=lambda c: (c["lat"] - lat) ** 2 + (c["lon"] - lon) ** 2)["wt"] if ada else None


# ---------------------------------------------------------------- utama
def main():
    os.makedirs(KELUAR, exist_ok=True)
    GB.pasang_kalibrasi()  # kedalaman bara dari isian lapangan bila kalibrasi.json ada dan n >= 10
    w = Wilayah()
    sekarang = dt.datetime.now(WIB)
    hari_ini = sekarang.date().isoformat()

    print("hotspot...", file=sys.stderr)
    titik = hotspot(kunci(), w)
    # Titik di sel sumber panas statis (smelter, tambang, kilang, PLTU; titik_palsu.json) bukan kebakaran: tidak dihitung untuk
    # jumlah titik, kompleks, status, dan harian30. Gunung api (kawah) tetap dihitung. Matikan: TITIK_PALSU=0.
    industri = {"aktif": False, "titik": 0, "jenis": {}}
    if os.environ.get("TITIK_PALSU", "1") != "0":
        import titik_palsu as TP, harian30
        sel_ind, jenis_ind = TP.sel_industri()
        if not sel_ind:
            print("::warning title=Filter titik palsu mati::public/data/titik_palsu.json tidak ada; titik industri ikut dihitung", file=sys.stderr)
        if sel_ind:
            sebelum = titik
            titik = [p for p in titik if not TP.palsu(p["lat"], p["lon"], sel_ind)]
            from collections import Counter as _C
            industri = {"aktif": True, "titik": len(sebelum) - len(titik),
                        "jenis": dict(_C(jenis_ind[TP.sel(p["lat"], p["lon"])] for p in sebelum if TP.palsu(p["lat"], p["lon"], sel_ind)))}
            harian30.SARING = lambda la, lo: TP.palsu(la, lo, sel_ind)
            print(f"titik palsu: {industri['titik']} dari {len(sebelum)} titik dibuang", file=sys.stderr)
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
    hari_akhir = tgl(kini)
    # gunung api aktif (aturan.GUNUNG_API) tidak dijadikan kompleks karhutla; titiknya tetap ada di hotspot.json
    viirs = [p for p in titik if p["s"] != "M" and p["c"] >= 1 and p["t"] >= kini - dt.timedelta(days=JENDELA_HARI)
             and not A.gunung_api(p["lat"], p["lon"])]
    label, inti = dbscan(viirs)
    kluster = {}
    for p, l in zip(viirs, label):
        kluster.setdefault(l, []).append(p)

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

    PJ_KONSESI = {"sawit": ("Pemegang izin konsesi sawit (perusahaan perkebunan)", "Areal konsesi sawit"),
                  "hph": ("Pemegang izin konsesi HPH (PBPH hutan alam)", "Areal konsesi HPH (hutan alam)"),
                  "hti": ("Pemegang izin konsesi HTI (PBPH hutan tanaman)", "Areal konsesi HTI (kayu pulp)"),
                  "tambang": ("Pemegang izin tambang (PPKH)", "Areal izin tambang")}

    def penanggung(lon, lat):
        """Rute penerusan titik panas menurut status lahan (P.32/2016 dan praktik KLHK)."""
        k = KONSESI.cari(lon, lat)
        if k and k.get("aktif") is not False:  # izin berakhir: bukan penanggung jawab lagi
            # generik, tanpa nama pemegang (keputusan pemilik 14 Okt 2026); konsesi.geojson publik memang tak bernama
            return PJ_KONSESI.get(k.get("jenis"), ("Pemegang izin konsesi", "Areal konsesi"))
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
        n24s = sum(1 for p in pts if t24 - dt.timedelta(hours=24) <= p["t"] < t24)  # 24 jam sebelum jendela p24: dasar syarat "tumbuh"
        px24 = len({pix(p) for p in p24})
        pola, fs = firespot(pts)
        sev = A.keparahan(len(pts), len(hari), n_ini, n_kmrn, px24)
        fdrs = A.kelas_fwi(h["fwi"]) if h else None
        lv = A.status(fdrs, sev)
        if len(pts) < 3 and lv == 0 and jam_sejak <= 24:
            s1 += 1  # titik tunggal/ganda, cuaca tidak berbahaya: dihitung, belum dinilai, tidak digambar
            continue
        d0 = min(daops, key=lambda d: km(lat0, lon0, d["lat"], d["lon"])) if daops else None
        jd = round(km(lat0, lon0, d0["lat"], d0["lon"])) if d0 else None
        # garis luar organik (raster jejak piksel 375 m, closing, kontur, Chaikin; lihat garis_api.py), bukan lambung cembung.
        # luas = luas garis luar itu (dulu: jumlah sel pusat deteksi x 14,06 ha); bisa Polygon atau MultiPolygon.
        bentuk, luas_ha = garis_api(pts)
        bara = None  # gambut bawah permukaan (gambut_bara.py): hanya jejak piksel yang jatuh di peta gambut
        if lv >= 2 and di_gambut:
            bara = GB.hitung([(pix(p), tgl(p["t"]).isoformat(), p["frp"]) for p in pts if GAMBUT.cari(p["lon"], p["lat"])],
                             luas_ha, wt_dekat(grid, g, lat0, lon0))
        adm = w.cari(lon0, lat0) or max((p["adm"] for p in pts), key=[p["adm"] for p in pts].count)
        fitur.append({
            "type": "Feature",
            "geometry": bentuk if bentuk and lv >= 2 and len({(p["lon"], p["lat"]) for p in pts}) >= 3
            else {"type": "Point", "coordinates": [round(lon0, 4), round(lat0, 4)]},
            "properties": {
                "id": "", "lat": round(lat0, 4), "lon": round(lon0, 4), "n": len(pts), "n24": len(p24), "n24s": n24s,
                "hari": len(hari), "px24": px24, "ini": n_ini, "kmrn": n_kmrn, "sev": sev, "fdrs": fdrs,
                "frp": round(sum(p["frp"] for p in pts), 1), "frp24": round(sum(p["frp"] for p in p24), 1),
                "awal": min(p["t"] for p in pts).isoformat(), "akhir": terakhir.isoformat(), "jam_sejak": round(jam_sejak, 1),
                "teramati": jam_sejak <= 24,  # False = tidak terdeteksi 24 jam: bisa padam, bisa tertutup awan/asap
                "luas": luas_ha,
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
                "level": lv, "status": STATUS[lv], "firespot": fs, "pola": pola,
                **({"bara": bara} if bara else {}),
            }})

    # Prioritas = ambang hasil uji balik (lihat aturan.py); skor hanya untuk urutan di dalam wilayah kerja Daops
    for f in fitur:
        q = f["properties"]
        if q["level"] == 2 and q["teramati"] and A.prioritas(q["px24"], q["fwi"]):
            q["level"], q["status"] = 3, STATUS[3]
    for f in fitur:  # gerbang firespot: "mungkin" = cek lapangan dulu (STATUS[1]), tidak jadi tugas pemadaman
        q = f["properties"]
        # hanya yang teramati (<= 24 jam): cluster tanpa deteksi baru (mis. gambut kering dipertahankan 168 jam untuk bara) tetap level lamanya.
        # api24/bara/poligon dibuang nanti oleh pemangkasan INTI, SESUDAH tugas_kompleks menilai syarat jalur verifikasi.
        gerbang_firespot(q)
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
    def baca_json(nama, awal):
        try:
            return json.load(open(os.path.join(KELUAR, nama)))
        except (OSError, ValueError):
            return awal
    desa, fasilitas = baca_json("osm/desa.json", {}), baca_json("fasilitas.json", [])
    dekat_permukiman = indeks_permukiman(desa, fasilitas) if desa or fasilitas else None
    di_konsesi = (lambda lon, lat: (lambda k: bool(k) and k.get("aktif") is not False)(KONSESI.cari(lon, lat))) if KONSESI.indeks else None
    tugas = tugas_kompleks(fitur, kini, dekat_permukiman, di_konsesi)  # sebelum pemangkasan INTI: butuh api24 dan level asal
    # berkas ringan: kompleks rendah (level 0-1) cukup atribut inti; teks status diambil dari level di peramban
    INTI = {"id", "lat", "lon", "n", "px24", "hari", "level", "prov", "kab", "kec", "teramati", "jam_sejak", "fwi", "dc", "gambut", "risiko", "luas", "sev", "firespot", "pola"}
    for f in fitur:
        q = f["properties"]
        q.pop("status", None)
        if q["level"] < 2:
            if f["geometry"]["type"] != "Point":
                f["geometry"] = {"type": "Point", "coordinates": [q["lon"], q["lat"]]}
            for k in [k for k in q if k not in INTI]:
                q.pop(k)

    # ringkasan per provinsi: hitungan utama = lokasi unik per hari WIB (titik_unik.py) + FWI
    rek = {}
    dihitung = {id(p) for p in TU.unik(titik, lambda p: tgl(p["t"]))}
    for p in titik:
        if id(p) not in dihitung:
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
    def titik_json(pilih, **tambah):
        return {"kolom": ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib", "hitung"],
                "acuan": akhir.isoformat(), "wilayah": tabel, "sensor_utama": list(TU.SENSOR), "keyakinan_min": TU.KEYAKINAN_MIN,
                "satuan": "lokasi unik ~375 m per hari WIB (titik_unik.py)", **tambah,
                "baris": [[p["lat"], p["lon"], round((p["t"] - akhir).total_seconds() / 3600, 2), p["s"], p["frp"], p["c"],
                           idx["|".join(p["adm"])], tgl(p["t"]).isoformat()[5:], int(id(p) in dihitung)] for p in titik if pilih(p)]}
    simpan("hotspot.json", titik_json(lambda p: True))
    simpan("hotspot72.json", titik_json(lambda p: p["t"] >= akhir - dt.timedelta(hours=72), jam_maks=72))
    # muatan awal (rentang bawaan "hari ini", juga "kemarin", dan jendela 48 jam Ringkasan): tanggal WIB hari ini & kemarin
    # ditambah 48 jam terakhir dari acuan. jam_maks=48 -> peramban memuat hotspot72/hotspot.json hanya bila rentang lebih panjang.
    simpan("hotspot24.json", titik_json(lambda p: tgl(p["t"]) >= hari_akhir - dt.timedelta(days=1) or p["t"] >= akhir - dt.timedelta(hours=48), jam_maks=48))
    simpan("tugas_kompleks.json", tugas)
    simpan("kluster.json", {"type": "FeatureCollection", "features": fitur})
    awal, geo = pecah_kluster(fitur)
    simpan("kluster_awal.json", awal)
    simpan("kluster_geo.json", geo)
    arsip_kluster(fitur, hari_akhir, os.path.join(KELUAR, "kluster_hari"))
    simpan("kejadian_karhutla_awal.json", kejadian_awal(fitur, sekarang))
    simpan("fwi.json", {"sel": 0.5, "hari_ini": hari_ini, "pfvi": {"ambang": P.AMBANG_PG, "catatan": "Muka air tanah = perkiraan (proxy) dari hujan dan ET0, bukan pengukuran. Uji balik 2019+2023: scripts/sebaran/RISET-PFVI.md"}, "grid": [
        {"lat": g["lat"], "lon": g["lon"], "prov": g["prov"], "hari": g["hari"][-8:], **({"wt": g["wt"]} if "wt" in g else {})} for g in grid]})
    simpan("wilayah.json", rek)
    simpan("bnpb.json", bnpb)
    simpan("meta.json", {
        "dibuat": sekarang.isoformat(timespec="minutes"), "data_terakhir": akhir.isoformat(), "hari_wib": hari_akhir.isoformat(),
        "jumlah_titik": len(titik), "titik_industri": industri, "jumlah_kluster": len(fitur), "titik_tunggal_belum_dinilai": s1,
        "provinsi": PROVINSI, "prioritas": PRIORITAS, "bnpb": BNPB, "status": STATUS,
        "dbscan": {"eps_km": EPS_KM, "min_pts": MIN_PTS, "jendela_hari": JENDELA_HARI, "aktif_jam": AKTIF_JAM, "aktif_gambut_jam": AKTIF_GAMBUT_JAM, "jam_st": 48,
                   "firespot": {"ambang_medium_px": AMBANG_MEDIUM_PX, "sumber": SUMBER_FIRESPOT, "unit": "piksel unik, bukan titik"}},
        "bara": GB.CATATAN})
    from collections import Counter
    print(f"{len(titik)} titik, {len(fitur)} cluster (+{s1} titik tunggal belum dinilai), {len(grid)} sel FWI;",
          "level", dict(Counter(f["properties"]["level"] for f in fitur)), file=sys.stderr)


def pecah_kluster(fitur):
    """kluster.json (lengkap, dibaca skrip Python) dipecah untuk muatan pertama halaman: kluster_awal.json = semua kompleks
    dengan semua properti KECUALI api24, geometri diganti titik pusat; kluster_geo.json = {id: [poligon atau null, api24]}
    dimuat halaman saat dibutuhkan (keluar dari tab Ringkasan, buka kompleks). Poligon + api24 ± 40 % ukuran gzip."""
    awal, geo = [], {}
    for f in fitur:
        p = f["properties"]
        q = {k: v for k, v in p.items() if k != "api24"}
        awal.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [p["lon"], p["lat"]]}, "properties": q})
        poli = f["geometry"] if f["geometry"]["type"] != "Point" else None
        if poli or p.get("api24"):
            geo[p["id"]] = [poli, p.get("api24") or []]
    return {"type": "FeatureCollection", "features": awal}, geo


def ringkas_kluster(fitur):
    """Cluster per wilayah untuk tabel wilayah layar: {kunci: [jumlah, firespot "ya", level maks]}; kunci = prov, prov|kab, prov|kab|kec
    (sama dengan klusterDi di index.html)."""
    w = {}
    for f in fitur:
        p = f["properties"]
        adm = [p.get("prov") or "", p.get("kab") or "", p.get("kec") or ""]
        for i in (1, 2, 3):
            r = w.setdefault("|".join(adm[:i]), [0, 0, -1])
            r[0] += 1
            r[1] += p.get("firespot") == "ya"
            r[2] = max(r[2], p.get("level", 0))
    return w


def arsip_kluster(fitur, hari, folder, simpan_hari=8):
    """kluster_hari/<hari WIB>.json = ringkas_kluster jalan terakhir hari itu (jalan 3-jam menimpa, jadi yang tersisa = keadaan akhir hari).
    Dibaca tabel wilayah saat hari lampau dipilih. Berkas lebih tua dari simpan_hari dihapus (pemilih hari layar maks 7 hari)."""
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, f"{hari.isoformat()}.json"), "w") as f:
        # k = pusat cluster level >= 1 (yang digambar peta) supaya peta ikut hari terpilih; poligon tidak diarsip
        k = [[p["id"], round(p["lon"], 4), round(p["lat"], 4), p["level"], p.get("n", 0), p.get("px24", 0)]
             for p in (x["properties"] for x in fitur) if p.get("level", 0) >= 1 and "lon" in p]
        json.dump({"hari": hari.isoformat(), "w": ringkas_kluster(fitur), "k": k}, f, ensure_ascii=False, separators=(",", ":"))
    batas = (hari - dt.timedelta(days=simpan_hari)).isoformat()
    for n in os.listdir(folder):
        if n.endswith(".json") and n[:10] < batas:
            os.remove(os.path.join(folder, n))


def kejadian_awal(fitur, kini):
    """Ringkasan lintas bencana (/semua), bentuk sama dengan public/banjir/data/kejadian_<id>_awal.json: kompleks K#### level 3
    (Prioritas, sama dengan layar karhutla), tanpa geometri. Semua kompleks di `fitur` sudah dalam jendela aktif (72/168 jam)."""
    wib = lambda iso: dt.datetime.fromisoformat(iso).astimezone(WIB).date().isoformat()
    rows = []
    for f in fitur:
        p = f["properties"]
        if p["level"] != 3:
            continue
        rows.append({"kode": p["id"], "nama": f"{p['kab']}, {p['kec']}",
                     "prov": [p["prov"]], "kab": [f"{p['prov']}|{p['kab']}"], "mulai": wib(p["awal"]), "terakhir": wib(p["akhir"]),
                     "aktif": True, "besaran": {"nilai": 3, "satuan": "level", "ket": "Prioritas"},
                     "pusat": [round(p["lat"], 3), round(p["lon"], 3)]})
    return {"dibuat": kini.strftime("%Y-%m-%dT%H:%M%z")[:-2] + ":00", "hari": kini.astimezone(WIB).date().isoformat(), "bencana": "karhutla",
            "awalan": "K", "kejadian": rows}


def indeks_permukiman(desa, fasilitas, maks_km=SYARAT["permukiman_km"]):
    """desa {prov: [[lat, lon, kode, nama]]} + fasilitas [{lat, lon}] -> fungsi dekat(lat, lon) True bila ada titik <= maks_km.
    Kisi 0,1 derajat (~11 km) cukup untuk radius 5 km; bujur diskalakan cos(lintang)."""
    kisi = {}
    for la, lo in [(r[0], r[1]) for rows in (desa or {}).values() for r in rows] + [(x["lat"], x["lon"]) for x in (fasilitas or [])]:
        kisi.setdefault((math.floor(la * 10), math.floor(lo * 10)), []).append((la, lo))

    def dekat(lat, lon):
        gy, gx = math.floor(lat * 10), math.floor(lon * 10)
        c = math.cos(math.radians(lat))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                for la, lo in kisi.get((gy + dy, gx + dx), ()):
                    if math.hypot((la - lat) * 111.19, (lo - lon) * 111.19 * c) <= maks_km:
                        return True
        return False
    return dekat


def syarat_level2(q, permukiman=None, konsesi=None):
    """Alasan kompleks level 2 ikut tugas otomatis, urut tetap: permukiman, konsesi, tumbuh. permukiman(lat, lon) dan
    konsesi(lon, lat) -> bool; None = datanya tidak ada, syarat tidak dinilai (bukan dianggap terpenuhi)."""
    titik = [(q["lat"], q["lon"])] + [(la, lo) for lo, la in (q.get("api24") or [])]
    out = []
    if permukiman and any(permukiman(la, lo) for la, lo in titik):
        out.append("permukiman")
    if konsesi and any(konsesi(lo, la) for la, lo in titik):
        out.append("konsesi")
    s = q.get("n24s")
    if s and q["n24"] - s >= SYARAT["tumbuh_tambah"] and q["n24"] >= SYARAT["tumbuh_kali"] * s:
        out.append("tumbuh")
    return out


def tugas_kompleks(fitur, kini, permukiman=None, konsesi=None):
    """Berkas kecil untuk Worker (kluster.json terlalu besar diurai di CPU 10 ms): kompleks level >= 2 yang teramati <= 24 jam.
    `otomatis` = level 3, atau level 2 dengan >= 1 `syarat` (syarat_level2); selain itu Worker tidak membuat tugas baru.
    `konsesi` diisi konsesi_kompleks.py sesudahnya (nama per kompleks lewat lokasi titik, bukan dari sini)."""
    ks = []
    for f in fitur:
        q = f["properties"]
        verif = bool(q.get("turun")) and q["jam_sejak"] <= 24  # level >= 2 diturunkan gerbang firespot: jalur verifikasi, bukan pemadaman
        if (q["level"] >= 2 or verif) and q["jam_sejak"] <= 24:
            sy = syarat_level2(q, permukiman, konsesi) if q["level"] == 2 else []
            if verif:  # cek lapangan/kontak desa: hanya bila dekat permukiman atau di konsesi; "tumbuh" tidak berlaku
                sy = [x for x in syarat_level2(q, permukiman, konsesi) if x != "tumbuh"]
                if not sy:
                    continue
            ks.append({"id": q["id"], "lat": round(q["lat"], 4), "lon": round(q["lon"], 4), "prov": q["prov"], "kab": q["kab"], "kec": q["kec"],
                       "level": q["level"], "n24": q["n24"], "jam_sejak": round(q["jam_sejak"], 1), "luas": round(q["luas"]), "konsesi": [],
                       "jenis": "verifikasi" if verif else "pemadaman", "otomatis": q["level"] == 3 or bool(sy), "syarat": sy, "firespot": q.get("firespot"), "pola": q.get("pola"),
                       # data syarat tersedia? False = syarat itu tidak bisa dinilai (bukan "tidak terpenuhi")
                       "syarat_dinilai": {"permukiman": permukiman is not None, "konsesi": konsesi is not None, "tumbuh": q.get("n24s") is not None}})
    return {"dibuat": kini.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "syarat_ambang": SYARAT, "firespot_ambang": {"ambang_medium_px": AMBANG_MEDIUM_PX, "sumber": SUMBER_FIRESPOT}, "kompleks": ks}


def hitung_otomatis():
    """Ulangi hitungan dampak syarat atas public/data lokal (tanpa menulis apa pun): berapa kompleks level >= 2 teramati <= 24 jam,
    berapa otomatis, dan sumbangan tiap syarat. n24s DIPERKIRAKAN dari hotspot.json (titik VIIRS dipasang ke kompleks lewat
    konsesi_kompleks.pasang_kompleks), jadi angka tumbuh hanya pendekatan; di CI n24s asli dari harian.main."""
    import collections
    import konsesi_kompleks as KK
    D = lambda n: os.path.join(KELUAR, n)
    kl = json.load(open(D("kluster.json")))["features"]
    hs = json.load(open(D("hotspot.json")))
    c = {k: i for i, k in enumerate(hs["kolom"])}
    rows = [r for r in hs["baris"] if r[c["sensor"]] != "M" and r[c["keyakinan"]] >= 1]
    sblm = collections.Counter(i for r, i in zip(rows, KK.pasang_kompleks(kl, [(r[c["lat"]], r[c["lon"]]) for r in rows])) if i is not None and -48 <= r[c["jam"]] < -24)
    for i, f in enumerate(kl):
        f["properties"]["n24s"] = sblm[i]
    # firespot: titik VIIRS per cluster dari hotspot.json (hari WIB dari tgl_wib; tahun diambil dari meta). Pendekatan: pemasangan titik ke
    # cluster lewat lambung/3 km, bukan keanggotaan ST-DBSCAN asli, dan hotspot.json hanya memuat 7 hari.
    th = dt.datetime.fromisoformat(json.load(open(D("meta.json")))["dibuat"]).year
    per = collections.defaultdict(list)
    for r, i in zip(rows, KK.pasang_kompleks(kl, [(r[c["lat"]], r[c["lon"]]) for r in rows])):
        if i is not None:
            m_, d_ = map(int, r[c["tgl_wib"]].split("-"))
            per[i].append({"lat": r[c["lat"]], "lon": r[c["lon"]], "c": r[c["keyakinan"]], "t": dt.datetime(th, m_, d_, 5, tzinfo=dt.timezone.utc)})
    hitung = lambda tk: (len(tk), sum(k["level"] == 3 for k in tk), sum(k["otomatis"] for k in tk))
    kini_ = dt.datetime.fromisoformat(json.load(open(D("meta.json")))["dibuat"])
    KON = Poligon(D("lahan/konsesi.geojson"))
    perm = indeks_permukiman(json.load(open(D("osm/desa.json"))), json.load(open(D("fasilitas.json"))))
    kons = lambda lon, lat: (lambda k: bool(k) and k.get("aktif") is not False)(KON.cari(lon, lat))
    tk0 = tugas_kompleks(kl, kini_, perm, kons)["kompleks"]
    lv0 = collections.Counter(f["properties"]["level"] for f in kl)
    pola, tanpa = collections.Counter(), 0
    for i, f in enumerate(kl):
        q = f["properties"]
        if i not in per:
            tanpa += 1
            continue
        q["pola"], q["firespot"] = firespot(per[i])
        pola[q["pola"]] += 1
        gerbang_firespot(q)
    lv1 = collections.Counter(f["properties"]["level"] for f in kl)
    tk1 = tugas_kompleks(kl, kini_, perm, kons)["kompleks"]
    print(f"firespot: cluster per level sebelum {dict(sorted(lv0.items()))}, sesudah {dict(sorted(lv1.items()))}; pola {dict(pola)}; tanpa titik terpasang {tanpa}")
    print(f"tugas (level>=2 teramati<=24j, level 3, otomatis): sebelum {hitung(tk0)}, sesudah {hitung(tk1)}")
    jn = collections.Counter(k["jenis"] for k in tk1)
    ver = [k for k in tk1 if k["jenis"] == "verifikasi"]
    print(f"sesudah per jenis: {dict(jn)}, total {len(tk1)}; verifikasi dekat permukiman {sum('permukiman' in k['syarat'] for k in ver)}, di konsesi {sum('konsesi' in k['syarat'] for k in ver)}; "
          f"otomatis pemadaman {sum(k['otomatis'] for k in tk1 if k['jenis'] == 'pemadaman')}, otomatis verifikasi {sum(k['otomatis'] for k in ver)}")


def uji():
    # IPv4 didahulukan, IPv6 tetap ada sebagai cadangan
    palsu = [(socket.AF_INET6, 1, 6, "", ("fd00::1", 443, 0, 0)), (socket.AF_INET, 1, 6, "", ("198.118.194.34", 443))]
    asli, socket.getaddrinfo = _getaddrinfo_asli, None
    try:
        globals()["_getaddrinfo_asli"] = lambda *a, **k: palsu
        assert [r[0] for r in _ipv4_dulu("firms", 443)] == [socket.AF_INET, socket.AF_INET6]
    finally:
        globals()["_getaddrinfo_asli"] = asli
        socket.getaddrinfo = _ipv4_dulu
    sq = {"type": "Polygon", "coordinates": [[[1, 1], [2, 1], [2, 2], [1, 1]]]}
    F = [{"type": "Feature", "geometry": sq, "properties": {"id": "K1", "lat": 1.5, "lon": 1.6, "level": 3, "api24": [[1.5, 1.5]]}},
         {"type": "Feature", "geometry": {"type": "Point", "coordinates": [3, 3]}, "properties": {"id": "K2", "lat": 3, "lon": 3, "level": 0}}]
    awal, geo = pecah_kluster(F)
    assert [f["properties"]["id"] for f in awal["features"]] == ["K1", "K2"], "urutan kompleks harus sama dengan kluster.json"
    assert all(f["geometry"]["type"] == "Point" and "api24" not in f["properties"] for f in awal["features"])
    assert awal["features"][0]["geometry"]["coordinates"] == [1.6, 1.5] and awal["features"][0]["properties"]["level"] == 3
    assert geo == {"K1": [sq, [[1.5, 1.5]]]}, f"geo hanya untuk kompleks berpoligon/api24: {geo}"
    assert F[0]["properties"]["api24"] == [[1.5, 1.5]], "kluster.json lengkap tidak boleh ikut berubah"
    P3 = {"id": "K7", "lat": -3.1, "lon": 112.1, "level": 3, "px24": 40, "prov": "62", "kab": "Seruyan", "kec": "Seruyan Hilir",
          "awal": "2026-10-17T20:00:00+00:00", "akhir": "2026-10-19T03:00:00+00:00"}
    K = kejadian_awal([{"properties": P3}, {"properties": {**P3, "id": "K8", "level": 2}}], dt.datetime(2026, 10, 19, 12, 0, tzinfo=WIB))
    assert list(K)[0] == "dibuat" and K["bencana"] == "karhutla" and [r["kode"] for r in K["kejadian"]] == ["K7"], "hanya level 3, dibuat pertama"
    r = K["kejadian"][0]
    assert r["mulai"] == "2026-10-18" and r["terakhir"] == "2026-10-19" and r["aktif"] and r["kab"] == ["62|Seruyan"], r
    T = tugas_kompleks([{"properties": {**P3, "n24": 9, "jam_sejak": 3.04, "luas": 120.6}},
                        {"properties": {**P3, "id": "K8", "level": 1, "n24": 1, "jam_sejak": 3, "luas": 1}},
                        {"properties": {**P3, "id": "K9", "level": 2, "n24": 1, "jam_sejak": 30, "luas": 1}}], dt.datetime(2026, 10, 19, 12, 0, tzinfo=WIB))
    assert list(T)[0] == "dibuat" and T["dibuat"] == "2026-10-19T05:00:00Z", T["dibuat"]
    assert [k["id"] for k in T["kompleks"]] == ["K7"] and all(k["level"] >= 2 and len(k["prov"]) == 2 and k["kab"] for k in T["kompleks"]), T
    # 0.4 otomatis + syarat: level 3 selalu; level 2 hanya bila ada syarat; urut tetap permukiman, konsesi, tumbuh
    dekat = indeks_permukiman({"62": [[-3.1, 112.1, "k", "Desa"]]}, [{"lat": -2.0, "lon": 111.0}])
    assert dekat(-3.1, 112.12) and dekat(-2.0, 111.04) and not dekat(-3.1, 112.2) and not dekat(0, 100), "permukiman: 5 km"
    L2 = {**P3, "level": 2, "n24": 4, "n24s": 3, "jam_sejak": 3, "luas": 10, "lat": -3.5, "lon": 112.5, "api24": []}
    mk = lambda **k: tugas_kompleks([{"properties": {**L2, **k}}], dt.datetime(2026, 10, 19, 12, 0, tzinfo=WIB), dekat, lambda lon, lat: lon > 113)["kompleks"][0]
    t = mk()
    assert t["otomatis"] is False and t["syarat"] == [] and t["konsesi"] == [], f"level 2 tanpa syarat: tidak otomatis {t}"
    assert mk(id="K3", level=3)["otomatis"] is True and mk(level=3)["syarat"] == []
    assert mk()["syarat_dinilai"] == {"permukiman": True, "konsesi": True, "tumbuh": True}
    assert mk(n24s=None)["syarat_dinilai"]["tumbuh"] is False
    t = mk(lat=-3.1, lon=112.1)
    assert t["otomatis"] and t["syarat"] == ["permukiman"], t
    t = mk(api24=[[112.52, -3.5], [112.1, -3.12]])   # titik api tepi dekat desa walau pusat jauh
    assert t["syarat"] == ["permukiman"], t
    t = mk(lon=113.5)
    assert t["syarat"] == ["konsesi"] and t["otomatis"], t
    t = mk(n24=9, n24s=3)
    assert t["syarat"] == ["tumbuh"] and t["otomatis"], t
    assert mk(n24=9, n24s=0)["syarat"] == [] and mk(n24=9, n24s=0)["otomatis"] is False, "api baru (24 jam lalu belum ada) bukan tumbuh"
    assert mk(n24=2, n24s=1)["syarat"] == [] and mk(n24=7, n24s=6)["syarat"] == [], "naik kecil atau < 1,5 kali: bukan tumbuh"
    assert mk(n24=5, n24s=None)["syarat"] == [], "berkas lama tanpa n24s: tidak dinilai tumbuh"
    t = mk(lat=-3.1, lon=112.1, api24=[[113.5, -3.1]], n24=9, n24s=1)
    assert t["syarat"] == ["permukiman", "konsesi", "tumbuh"], t
    t = tugas_kompleks([{"properties": {**L2, "lat": -3.1, "lon": 112.1}}], dt.datetime(2026, 10, 19, 12, 0, tzinfo=WIB))["kompleks"][0]
    assert t["otomatis"] is False and t["syarat_dinilai"]["permukiman"] is False and t["syarat_dinilai"]["konsesi"] is False, "tanpa data permukiman/konsesi: syarat tidak dinilai, bukan dianggap terpenuhi"
    print("harian uji: pecah_kluster OK")
    R = ringkas_kluster([{"properties": {**P3, "firespot": "ya"}}, {"properties": {**P3, "id": "K8", "level": 1, "kec": "Danau Sembuluh"}}])
    assert R["62"] == [2, 1, 3] and R["62|Seruyan"] == [2, 1, 3] and R["62|Seruyan|Danau Sembuluh"] == [1, 0, 1], R
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        open(os.path.join(d, "2026-10-10.json"), "w").write("{}")
        open(os.path.join(d, "2026-10-12.json"), "w").write("{}")
        arsip_kluster([{"properties": P3}], dt.date(2026, 10, 19), d)
        assert sorted(os.listdir(d)) == ["2026-10-12.json", "2026-10-19.json"], os.listdir(d)
        assert json.load(open(os.path.join(d, "2026-10-19.json")))["w"]["62"] == [1, 0, 3]
        assert [r[3] for r in json.load(open(os.path.join(d, "2026-10-19.json")))["k"]] == [3], "arsip k: pusat cluster level>=1"
    print("harian uji: arsip kluster OK")
    # firespot: enam pola, piksel unik, gerbang
    def tt(hari, c, n=1, lat=-3.0, lon=112.0, geser=0.0):  # n titik di piksel berbeda, hari ke-`hari` Okt 2026 siang WIB
        return [{"t": dt.datetime(2026, 10, hari, 5, 0, tzinfo=dt.timezone.utc), "c": c, "lat": lat + i * 0.01 + geser, "lon": lon} for i in range(n)]
    ok = lambda pts, pola, fs: firespot(pts) == (pola, fs) or (_ for _ in ()).throw(AssertionError((firespot(pts), pola)))
    ok(tt(10, 2) + tt(11, 2), "HH", "ya")
    ok(tt(10, 1, 2) + tt(11, 2), "H", "ya")            # H hari terakhir, kemarin M
    ok(tt(11, 2) + tt(12, 1, 2), "MH", "ya")
    ok(tt(10, 1, 3) + tt(11, 1, 3) + tt(12, 1, 3), "MMM", "ya")
    ok(tt(11, 1, 3) + tt(12, 1, 3), "MM", "mungkin")
    ok(tt(12, 1, 3), "M", "mungkin")
    ok(tt(10, 2) + tt(12, 1, 2), "M", "mungkin")        # kemarin kosong: bukan MH
    ok(tt(12, 1, AMBANG_MEDIUM_PX), "H", "ya")           # tepat ambang piksel
    ok(tt(12, 1, AMBANG_MEDIUM_PX - 1), "M", "mungkin")
    tiga = [dict(p, s=s) for s in ("N", "N20", "N21") for p in tt(12, 1, AMBANG_MEDIUM_PX - 1)]  # 3 satelit, piksel sama: 3 piksel, bukan 9 titik
    ok(tiga, "M", "mungkin")
    # gerbang: level 3 butuh px24 >= 15 dalam 24 jam, yang melintasi paling banyak 2 hari WIB (Hd dan Hd-1). Dua hari itu menampung >= 15
    # piksel, jadi salah satunya >= 8 >= AMBANG_MEDIUM_PX = H; H di Hd atau Hd-1 selalu "ya" (H/HH/MH). Dibuktikan lewat semua pembagian:
    assert 2 * AMBANG_MEDIUM_PX <= A.PRIOR_PX, "bukti 'level 3 selalu ya' bergantung pada ambang ini"
    for a in range(A.PRIOR_PX + 1):
        assert firespot(tt(11, 1, a) + tt(12, 1, A.PRIOR_PX - a, geser=0.5) if a < A.PRIOR_PX else tt(11, 1, a) + tt(12, 1, 1, geser=0.5))[1] == "ya", a
    print("harian uji: firespot OK")
    # jalur verifikasi: level 1 hasil gerbang ("turun") ikut tugas_kompleks sebagai "verifikasi" bila dekat permukiman/konsesi (tanpa "tumbuh")
    V = {**L2, "level": 1, "turun": True, "n24": 9, "n24s": 3, "lat": -3.1, "lon": 112.1, "api24": []}   # tumbuh + permukiman
    mv = lambda **k: tugas_kompleks([{"properties": {**V, **k}}], dt.datetime(2026, 10, 19, 12, 0, tzinfo=WIB), dekat, lambda lon, lat: lon > 113)["kompleks"]
    t = mv()[0]
    assert t["jenis"] == "verifikasi" and t["otomatis"] and t["syarat"] == ["permukiman"] and t["level"] == 1, t
    assert mv(lat=-3.5, lon=112.5) == [], "verifikasi tanpa permukiman/konsesi: bukan tugas, 'tumbuh' tidak berlaku"
    assert mv(lat=-3.5, lon=113.5)[0]["syarat"] == ["konsesi"]
    assert mv(jam_sejak=30) == [] and mv(turun=False) == [], "tidak teramati atau level 1 asli: bukan verifikasi"
    assert mk()["jenis"] == "pemadaman" and mk(level=3)["jenis"] == "pemadaman"
    G = lambda **k: (lambda q: (gerbang_firespot(q), q)[1])({"firespot": "mungkin", "level": 2, "teramati": True, **k})
    assert G()["level"] == 1 and G()["turun"] and G(level=3)["level"] == 1
    assert G(teramati=False)["level"] == 2 and "turun" not in G(teramati=False), "tidak teramati: level lama dipertahankan"
    assert G(firespot="ya")["level"] == 2 and G(level=0)["level"] == 0
    print("harian uji: verifikasi OK")
    import garis_api
    garis_api.uji()  # garis luar kompleks: kontur sah, memuat deteksi, luas wajar, cepat
    GB.uji()  # estimasi bara gambut: rumus tangan, urutan rentang, pemotongan muka air


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif sys.argv[1:] == ["hitung-otomatis"]:
        hitung_otomatis()
    elif sys.argv[1:] == ["pecah"]:   # buat ulang kluster_awal/geo dari kluster.json yang ada (tanpa FIRMS)
        a, g = pecah_kluster(json.load(open(os.path.join(KELUAR, "kluster.json")))["features"])
        for n, isi in (("kluster_awal.json", a), ("kluster_geo.json", g)):
            with open(os.path.join(KELUAR, n), "w") as f:
                json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    else:
        main()
