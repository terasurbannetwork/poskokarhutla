"""Indikasi "lahan dibakar lalu dibuka jadi kebun sawit" langsung dari citra Sentinel-2 (kebakaran 2019 dan 2023).
INTERNAL BNPB, TIDAK TERBIT. Ini indikasi untuk pemeriksaan, BUKAN bukti pelaku. Keluaran hanya di data/raw/sawit/hasil/ (di-ignore git):
    sawit_s2_<tahun>.json   dan   citra_s2/<id>_<tahun>_c<n>_<tahap>_<tgl>.png

Pakai (urut; tiap tahap tahan putus, cache di data/raw/sawit/s2_cache/):
    python3 scripts/data/sawit_s2.py klaster 2019   # titik VIIRS -> klaster -> konsesi -> saring sawit lama -> pilih klaster
    python3 scripts/data/sawit_s2.py citra 2019     # lintasan Sentinel-2 per klaster (jaringan, lama)
    python3 scripts/data/sawit_s2.py hasil 2019     # kalibrasi (2019), kelas, JSON, foto bukti
    python3 scripts/data/sawit_s2.py semua 2019 2023
    python3 scripts/data/sawit_s2.py uji            # swa-uji tanpa jaringan

Metode ringkas:
1. Titik VIIRS S-NPP (type 0, confidence n/h) -> klaster: sel 0,01 derajat bertetangga 8-arah; klaster yang lebih lebar dari 3 sel dipecah
   per petak 2x2 sel (kotak citra 3 km); klaster dipecah lagi di celah waktu > 30 hari. Pusat dihitung dari rata-rata titik.
2. Atribusi ke data/../public/data/lahan/konsesi.geojson (pusat di dalam poligon; urut sawit, hti, hph).
3. "Sawit sebelum api": Descals (YoP>0 dan YoP<tahun api) dan, untuk 2019, Gaveau (F2018 sawit). >= 60% sampel = "sawit terbakar".
4. Sentinel-2 L2A (Earth Search): kotak 3 km, grid 150x150 (20 m). SEBELUM, TERBAKAR, lalu tiap musim kemarau (Jun-Okt) sampai 2026.
   Jejak bakar = piksel dNBR(SEBELUM -> TERBAKAR) > 0,27. Per piksel: NDVI, NBR, indeks "terbuka" (NDVI<0,3 dan SWIR1>NIR*0,8).
   Metrik per tahun: porsi terbuka di jejak, NDVI median, kelurusan tepi (puncak varians profil tepi saat diputar 0-175 derajat).
5. Kelas dan ambang adalah HIPOTESIS; ambang kelurusan/porsi diatur HANYA dari set kalibrasi (30 positif Gaveau F2019=sawit, 30 negatif).
Lisensi citra: Contains modified Copernicus Sentinel data.
"""
import base64, csv, datetime as dt, json, math, os, random, statistics, sys, time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import citra as C  # noqa: E402
import konsesi_citra as K  # noqa: E402

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DIR = os.path.join(AKAR, "data/raw/sawit")
CACHE = os.path.join(DIR, "s2_cache")
HASIL = os.path.join(DIR, "hasil")
FOTO = os.path.join(HASIL, "citra_s2")
SEKARANG = dt.date(2026, 10, 19)

# ---- konstanta metode (semua HIPOTESIS, belum diuji balik kecuali ambang yang diatur kalibrasi)
SEL = .01               # derajat, sel klaster (~1,1 km)
SEL_LEBAR = 3           # sel; komponen lebih lebar dipecah per petak
PETAK = 2               # sel per petak pemecahan
CELAH_HARI = 30         # celah waktu yang memecah klaster
MIN_TITIK = 20          # klaster terkecil yang dianalisis (klaim akhir)
MIN_KAL = 5             # klaster terkecil yang boleh jadi contoh kalibrasi (positif Gaveau jarang di klaster besar)
KAL_BS = .3             # pecahan sampel Gaveau 'bakar lalu sawit' untuk positif kalibrasi
MAKS_KLASTER = 150      # per tahun
SAWIT_LAMA = .60        # >= porsi ini sampel sudah sawit sebelum api -> "sawit terbakar"
SAMPEL_MAKS = 300       # sampel per klaster untuk uji sawit lama
KM = 3                  # sisi kotak citra
N = 150                 # grid (20 m)
AWAN_MAKS = .30         # awan/tanpa-data maksimum di kotak untuk adegan bersih
DNBR_BAKAR = .27        # dNBR jejak bakar (Key & Benson)
NBR_BAKAR = .2
MERAH_MIN = .01         # lantai pantulan red: vegetasi rapat bisa <= 0 setelah offset -0,1; tanpa lantai NDVI jenuh 1,0
GELAP = .03             # pantulan NIR di bawah ini = bayangan/air
TERBUKA_NDVI = .3       # indeks lahan terbuka ala kunci baca Gaveau
TERBUKA_SWIR_NIR = .8
MIN_JEJAK_PX = 100      # jejak bakar < 4 ha = bekas tak terlihat
MIN_CAKUPAN = .5        # bagian jejak yang harus terlihat (tak berawan) agar satu tahun dinilai
PULIH_PORSI = .15
DILASI = 2              # piksel; ROI kelurusan = jejak diperlebar
MIN_TEPI = 60           # piksel tepi minimal untuk skor kelurusan
SUDUT = range(0, 180, 5)
JENDELA_SEBELUM, JENDELA_SESUDAH = 150, 150   # hari mencari adegan SEBELUM/TERBAKAR
AMBANG_AWAL = {"porsi_min": .30, "lurus_min": 2.0}   # hipotesis awal; diganti hasil kalibrasi
FOTO_PX, FOTO_MAKS, FOTO_TOP = 400, 150_000, 40
GAIN_TC, GAMMA_TC = .20, 1.5
GAIN_SEMU = (.5, .4, .25)   # NIR, SWIR1, Red
KELAS = ("dibuka jadi kebun?", "terbuka tak berpola", "pulih alami", "tak tentu", "bekas bakar tak terlihat",
         "terlalu dini/kurang citra", "sawit terbakar")
BATAS = [
    "Indikasi untuk pemeriksaan, bukan bukti pelaku, bukan putusan hukum; atribusi ke konsesi hanya dari titik pusat klaster dalam poligon peta KLHK/GFW (data ~2014-2019, batas bisa bergeser).",
    "Kelas, ambang, indeks 'terbuka' dan skor kelurusan adalah hipotesis; hanya ambang porsi dan kelurusan yang diatur dari set kalibrasi kecil (2019, 30 positif + 30 negatif), dalam-sampel, tanpa uji luar-sampel.",
    "Kalibrasi memakai Gaveau F2019 sebagai kebenaran, yang punya galat sendiri; 'negatif' hanya berarti bukan sawit di Gaveau dan Descals (<=2021) pada 2019-2021, bukan jaminan bukan kebun lain (akasia, karet).",
    "Sawit yang ditanam 2022 tidak terlihat di Descals; untuk 2023 hanya pola citra sebelum api (kolom sebelum) yang mengisyaratkan kebun muda.",
    "Titik VIIRS 375 m menunjuk piksel, bukan luas bakar; ha_jejak dari titik adalah perkiraan kasar (sel 375 m unik x 14 ha). Luas jejak Sentinel-2 hanya untuk klaster yang dianalisis.",
    "Kotak 3 km di pusat klaster; klaster lebih lebar dipecah, kebakaran besar bisa terpotong. Awan, asap tebal 2019/2023, dan bayangan bisa menutup jejak; Sentinel-2 Indonesia tersedia sejak 2017.",
    "Kebun muda (1-3 tahun) memiliki kanopi renggang sehingga indeks 'terbuka' bertahan paling lama 1-2 tahun; kebun lama tak terdeteksi sebagai 'terbuka'.",
]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# ================================================================ 1. titik -> klaster
def baca_titik(tahun):
    """[(lat, lon, waktu WIB)] titik VIIRS type 0, confidence n/h"""
    hasil = []
    for r in csv.DictReader(open(os.path.join(DIR, f"viirs_{tahun}.csv"))):
        if r["type"] != "0" or r["confidence"] not in ("n", "h"):
            continue
        t = dt.datetime.strptime(r["acq_date"] + r["acq_time"].zfill(4), "%Y-%m-%d%H%M") + dt.timedelta(hours=7)
        hasil.append((float(r["latitude"]), float(r["longitude"]), t))
    return hasil


def komponen(pts):
    """kelompok indeks titik: sel SEL derajat yang bertetangga 8-arah; yang lebih lebar dari SEL_LEBAR sel dipecah per petak PETAK x PETAK"""
    sel = defaultdict(list)
    for i, (la, lo, _) in enumerate(pts):
        sel[(math.floor(lo / SEL), math.floor(la / SEL))].append(i)
    lihat, hasil = set(), []
    for awal in sel:
        if awal in lihat:
            continue
        lihat.add(awal)
        tumpuk, sels = [awal], []
        while tumpuk:
            c = tumpuk.pop()
            sels.append(c)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    d = (c[0] + dx, c[1] + dy)
                    if d in sel and d not in lihat:
                        lihat.add(d)
                        tumpuk.append(d)
        xs, ys = [c[0] for c in sels], [c[1] for c in sels]
        if max(xs) - min(xs) + 1 <= SEL_LEBAR and max(ys) - min(ys) + 1 <= SEL_LEBAR:
            hasil.append([i for c in sels for i in sel[c]])
        else:
            petak = defaultdict(list)
            for c in sels:
                petak[(c[0] // PETAK, c[1] // PETAK)].extend(sel[c])
            hasil.extend(petak.values())
    return hasil


def pecah_waktu(idx, pts):
    """pecah satu kelompok di celah waktu > CELAH_HARI"""
    idx = sorted(idx, key=lambda i: pts[i][2])
    hasil, cur = [], [idx[0]]
    for a, b in zip(idx, idx[1:]):
        if (pts[b][2] - pts[a][2]).days > CELAH_HARI:
            hasil.append(cur)
            cur = []
        cur.append(b)
    hasil.append(cur)
    return hasil


def klaster(pts):
    """[{idx, n, pusat, bbox, api:{pertama,puncak,terakhir,titik}}] untuk seluruh titik"""
    hasil = []
    for kel in komponen(pts):
        for k in pecah_waktu(kel, pts):
            la, lo = [pts[i][0] for i in k], [pts[i][1] for i in k]
            tgl = Counter(pts[i][2].date().isoformat() for i in k)
            hasil.append({"idx": k, "n": len(k), "pusat": [round(sum(la) / len(la), 5), round(sum(lo) / len(lo), 5)],
                          "bbox": [min(lo), min(la), max(lo), max(la)],
                          "api": {"pertama": min(tgl), "puncak": max(sorted(tgl), key=tgl.get), "terakhir": max(tgl), "titik": len(k)}})
    return hasil


# ================================================================ 2. konsesi
def pip(x, y, bagian):
    """titik di dalam MultiPolygon (genap-ganjil, cincin luar + lubang)"""
    for poly in bagian:
        ada = False
        for ring in poly:
            ada ^= C.di_dalam(x, y, ring)
        if ada:
            return True
    return False


def indeks_konsesi(daftar):
    out = []
    for k in daftar:
        xs = [c[0] for poly in k["bagian"] for c in poly[0]]
        ys = [c[1] for poly in k["bagian"] for c in poly[0]]
        out.append((min(xs), min(ys), max(xs), max(ys), k))
    return out


def konsesi_di(lon, lat, idx):
    for x0, y0, x1, y1, k in idx:
        if x0 <= lon <= x1 and y0 <= lat <= y1 and pip(lon, lat, k["bagian"]):
            return k
    return None


# ================================================================ 3. sawit sebelum api
def kunci_sampel(pts, idx):
    """kunci sel kisi 125 m (sawit_retro) di sekitar tiap titik VIIRS (3x3 di dalam piksel 375 m), maksimal SAMPEL_MAKS"""
    import sawit_retro as R
    ks = set()
    for i in idx:
        la, lo, _ = pts[i]
        kx = 111.32 * math.cos(math.radians(la))
        for j in (-1, 0, 1):
            for a in (-1, 0, 1):
                ks.add(R.kunci(lo + a * .375 / 3 / kx, la + j * .375 / 3 / 110.574))
    ks = sorted(ks)
    return ks[::max(1, len(ks) // SAMPEL_MAKS)]


def ha_viirs(pts, idx):
    """perkiraan luas jejak dari sel 375 m unik x 14,06 ha"""
    s = {(round(pts[i][0] / .003375), round(pts[i][1] / .003375)) for i in idx}
    return round(len(s) * 14.06)


def pecahan(ks, tahun, gav, S):
    """-> dict pecahan sampel: lama (sawit sebelum api), bs (Gaveau bakar lalu sawit), tak (tak ada sawit di kedua peta s.d. 2021)"""
    import sawit_retro as R
    kand_cache = {}
    lama = bs = tak = tot = 0
    for k in ks:
        lon, lat = R.pusat(k)
        kd = kand_cache.setdefault((round(lon), round(lat)), None)
        if kd is None:
            kd = [(i, v) for i, v in S.indeks().items()
                  if v[0] < round(lon) + 1 and v[0] + v[2] * S.Ubin.PIX > round(lon) - 1 and v[1] > round(lat) - 1 and v[1] - v[3] * S.Ubin.PIX < round(lat) + 1]
            kand_cache[(round(lon), round(lat))] = kd
        v = S.nilai_di(lon, lat, kd)
        g = gav.get(k)
        kode = g[0] if g else None
        tot += 1
        if (v and v < tahun) or kode == "st":
            lama += 1
        if kode == "bs":
            bs += 1
        if not v and kode in (None, "lain"):
            tak += 1
    return {"lama": round(lama / max(1, tot), 3), "bs": round(bs / max(1, tot), 3), "tak": round(tak / max(1, tot), 3), "sampel": tot}


def tahap_klaster(tahun):
    """tahap A: klaster -> konsesi -> saring sawit lama -> pilih; simpan s2_cache/klaster_<tahun>.json"""
    import sawit_retro as R
    import sawit_peta as S
    t0 = time.time()
    os.makedirs(CACHE, exist_ok=True)
    pts = baca_titik(tahun)
    kl = [k for k in klaster(pts) if k["n"] >= (MIN_KAL if tahun == 2019 else MIN_TITIK)]
    log(f"{tahun}: {len(pts)} titik, {len(kl)} klaster ({time.time() - t0:.0f} dtk)")
    ik = indeks_konsesi(R.baca_konsesi())
    for k in kl:
        la, lo = k["pusat"]
        c = konsesi_di(lo, la, ik)
        k["pid"] = c["id"] if c else None
        k["konsesi"] = {x: c[x] for x in ("id", "nama", "grup", "jenis", "prov", "kab")} if c else None
    log(f"  atribusi: {sum(1 for k in kl if k['pid'])} klaster di konsesi ({time.time() - t0:.0f} dtk)")
    ks = {id(k): kunci_sampel(pts, k["idx"]) for k in kl}
    gav = {}
    if tahun == 2019:
        rows = R.baris({x for v in ks.values() for x in v})
        gav, _ = R.gaveau(rows, 2019)
    for k in kl:
        k["sawit"] = pecahan(ks[id(k)], tahun, gav, S)
        k["viirs_ha"] = ha_viirs(pts, k["idx"])
    # kabupaten klaster di luar konsesi
    kec = [(p, kab, b) for p, kab, b in R.baca_kecamatan()]
    kecb = []
    for p, kab, b in kec:
        xs = [c[0] for poly in b for c in poly[0]]
        ys = [c[1] for poly in b for c in poly[0]]
        kecb.append((min(xs), min(ys), max(xs), max(ys), p, kab, b))
    luar = Counter()
    for k in kl:
        if k["pid"] or k["n"] < MIN_TITIK:
            continue
        la, lo = k["pusat"]
        nama = next(((p, kab) for x0, y0, x1, y1, p, kab, b in kecb if x0 <= lo <= x1 and y0 <= la <= y1 and pip(lo, la, b)), ("?", "?"))
        k["kab"] = nama[1]
        luar[nama] += 1
    # id, pilihan
    per = defaultdict(list)
    for k in sorted(kl, key=lambda k: -k["n"]):
        per[k["pid"] or "luar"].append(k)
    for pid, lst in per.items():
        for i, k in enumerate(lst):
            k["kid"] = f"{pid}_{tahun}_c{i}"
    for k in kl:
        k["kelas_awal"] = "sawit terbakar" if k["sawit"]["lama"] >= SAWIT_LAMA else None
    calon = [k for k in kl if k["pid"] and not k["kelas_awal"] and k["n"] >= MIN_TITIK]
    pilih = sorted(calon, key=lambda k: -k["n"])[:MAKS_KLASTER]
    pil_id = {k["kid"] for k in pilih}
    rnd = random.Random(2019)
    sisa = [k for k in kl if k["kid"] not in pil_id and not k["kelas_awal"]]
    kal_pos = [k for k in sisa if k["sawit"]["bs"] >= KAL_BS and k["sawit"]["lama"] < .2]
    kal_neg = [k for k in sisa if k["sawit"]["tak"] >= .9 and k["sawit"]["lama"] == 0]
    if tahun == 2019:
        rnd.shuffle(kal_pos), rnd.shuffle(kal_neg)
    else:
        kal_pos, kal_neg = [], []
    for k in kl:
        k.pop("idx", None)
    out = {"tahun": tahun, "titik": len(pts), "pool": kl, "pilih": [k["kid"] for k in pilih],
           "kal_pos": [k["kid"] for k in kal_pos[:45]], "kal_neg": [k["kid"] for k in kal_neg[:45]],
           "kal_kandidat": {"pos": len(kal_pos), "neg": len(kal_neg)},
           "luar_kab": [{"prov": p, "kab": kb, "klaster_n": n} for (p, kb), n in luar.most_common(30)]}
    json.dump(out, open(os.path.join(CACHE, f"klaster_{tahun}.json"), "w"), separators=(",", ":"))
    log(f"  pilih {len(pilih)} (dari {len(calon)}), sawit terbakar {sum(1 for k in kl if k['kelas_awal'])}, kalibrasi kandidat pos {len(kal_pos)} neg {len(kal_neg)}, total {time.time() - t0:.0f} dtk")


# ================================================================ 4. Sentinel-2
def stac(lat, lon, d1, d2, urut, awan_lt=70, limit=40):
    f, arah = ("properties.datetime", urut) if urut in ("asc", "desc") else ("properties.eo:cloud_cover", "asc")
    q = {"collections": ["sentinel-2-l2a"], "bbox": C.kotak(lat, lon, 2), "limit": limit, "datetime": f"{d1}T00:00:00Z/{d2}T23:59:59Z",
         "query": {"eo:cloud_cover": {"lt": awan_lt}}, "sortby": [{"field": f, "direction": arah}]}
    hasil, lihat = [], set()
    for it in json.loads(C.ambil(C.STAC, data=json.dumps(q).encode())).get("features", []):
        tgl = it["properties"]["datetime"][:10]
        if tgl not in lihat:
            lihat.add(tgl)
            hasil.append(it)
    return hasil


def mini(it):
    """sebagian kecil item STAC yang cukup untuk membaca ulang pita (foto)"""
    p = it["properties"]
    return {"id": it["id"], "properties": {k: p[k] for k in ("proj:epsg", "proj:code", "platform") if k in p},
            "assets": {k: {x: it["assets"][k][x] for x in ("href", "proj:transform", "raster:bands") if x in it["assets"][k]}
                       for k in ("scl", "red", "green", "blue", "nir", "nir08", "swir16", "swir22") if k in it["assets"]}}


def pita(it, k, lat, lon, n=N, res=None):
    A = it["assets"][k]
    c = C.COG(A["href"])
    x0, y0, r0, kiri, atas = K.jendela(it, k, lat, lon, KM)
    rb = (A.get("raster:bands") or [{}])[0]
    sk, of = rb.get("scale", 1e-4), rb.get("offset", 0)
    v = c.contoh(C.level_untuk(c, r0, res or KM * 1000 / n), x0, y0, r0, kiri, atas, KM * 1000, n)[0]
    return v, sk, of


def baca_scl(it, lat, lon):
    """-> (scl, awan, kosong) pecahan; scl list int"""
    s = pita(it, "scl", lat, lon)[0]
    kosong = sum(1 for x in s if x == 0) / len(s)
    awan = sum(1 for x in s if x in (1, 3, 8, 9, 10)) / max(1, len(s) - sum(1 for x in s if x == 0))
    return s, awan, kosong


def sah_dari_scl(s):
    """piksel sah: bukan tanpa-data, air, awan/bayangan/sirus (awan diperlebar 1 piksel)"""
    buruk = [x in (0, 1, 3, 6, 8, 9, 10) for x in s]
    awan = [i for i, x in enumerate(s) if x in (1, 3, 8, 9, 10)]
    for i in awan:
        y, x = divmod(i, N)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if 0 <= y + dy < N and 0 <= x + dx < N:
                    buruk[(y + dy) * N + x + dx] = True
    return [not b for b in buruk]


def indeks_piksel(sah, red, nir, sw1, sw2):
    """-> (ndvi, nbr, buka) per piksel; None / None / False bila tak sah"""
    ndvi, nbr, buka = [], [], []
    for ok, a, b, c, d in zip(sah, red, nir, sw1, sw2):
        if not ok or a is None or b is None or c is None or d is None or b < GELAP:   # hanya NIR: red vegetasi rapat bisa <= 0,03 (offset -0,1)
            ndvi.append(None), nbr.append(None), buka.append(False)
            continue
        a, c, d = max(a, MERAH_MIN), max(c, 0.), max(d, 0.)
        if a + b <= 0 or b + d <= 0:
            ndvi.append(None), nbr.append(None), buka.append(False)
            continue
        v = (b - a) / (b + a)
        ndvi.append(v)
        nbr.append((b - d) / (b + d))
        buka.append(v < TERBUKA_NDVI and c > b * TERBUKA_SWIR_NIR)
    return ndvi, nbr, buka


def muat_adegan(it, lat, lon, s):
    """baca red, NIR(B8A), SWIR1, SWIR2 untuk adegan yang lolos; -> dict peta piksel"""
    def b(k):
        v, sk, of = pita(it, k, lat, lon)
        return [None if d == 0 else d * sk + of for d in v]
    with ThreadPoolExecutor(4) as ex:
        red, nir, sw1, sw2 = ex.map(b, ("red", "nir08", "swir16", "swir22"))
    sah = sah_dari_scl(s)
    ndvi, nbr, buka = indeks_piksel(sah, red, nir, sw1, sw2)
    return {"sah": [v is not None for v in ndvi], "ndvi": ndvi, "nbr": nbr, "buka": buka}


def adegan_bersih(lat, lon, d1, d2, urut, maks=6, awan_lt=70):
    """urut 'asc'/'desc': adegan bersih pertama menurut waktu; 'awan': yang paling bersih dari maks calon. -> (item, scl, awan, kosong) | None"""
    cal = stac(lat, lon, d1, d2, urut, awan_lt)[:maks if urut == "awan" else 12]

    def scl(it):
        try:
            return (it,) + baca_scl(it, lat, lon)
        except Exception as e:
            log("   scl gagal", it["id"], repr(e)[:60])
            return None
    if urut != "awan":   # menurut waktu: yang pertama bersih menang
        for it in cal:
            r = scl(it)
            if r and r[2] <= AWAN_MAKS and r[3] <= AWAN_MAKS:
                return r[0], r[1], r[2], r[3]
        return None
    with ThreadPoolExecutor(4) as ex:
        hs = [r for r in ex.map(scl, cal) if r and r[2] <= AWAN_MAKS and r[3] <= AWAN_MAKS]
    if not hs:
        return None
    b = min(hs, key=lambda r: r[2] + r[3])
    return b[0], b[1], b[2], b[3]


def gabung(bits):
    return format(int("".join("1" if v else "0" for v in bits) or "0", 2), "x")


def urai(h, n=N * N):
    return [c == "1" for c in format(int(h, 16), "b").zfill(n)]


def med(v):
    v = [x for x in v if x is not None]
    return round(statistics.median(v), 3) if v else None


def analisis_klaster(k):
    """tahap citra satu klaster -> dict simpan (cache). Gagal bagian = status tercatat, bukan dilempar."""
    lat, lon = k["pusat"]
    api = k["api"]
    d0, d1 = dt.date.fromisoformat(api["pertama"]), dt.date.fromisoformat(api["terakhir"])
    out = {"kid": k["kid"], "pusat": k["pusat"], "tahun": int(k["kid"].split("_")[-2]), "waktu": [], "status": "ok"}
    sb = adegan_bersih(lat, lon, (d0 - dt.timedelta(days=JENDELA_SEBELUM)).isoformat(), (d0 - dt.timedelta(days=1)).isoformat(), "desc")
    tb = adegan_bersih(lat, lon, (d1 + dt.timedelta(days=1)).isoformat(), min(SEKARANG, d1 + dt.timedelta(days=JENDELA_SESUDAH)).isoformat(), "asc")
    if not sb or not tb:
        out["status"] = "tanpa_" + ("sebelum" if not sb else "terbakar")
        return out
    grid = {"sebelum": muat_adegan(sb[0], lat, lon, sb[1]), "terbakar": muat_adegan(tb[0], lat, lon, tb[1]), }
    fp = [a is not None and b is not None and a - b > DNBR_BAKAR and b < NBR_BAKAR
          for a, b in zip(grid["sebelum"]["nbr"], grid["terbakar"]["nbr"])]
    out["fp"] = gabung(fp)
    out["fp_px"] = sum(fp)
    waktu = []
    for tahap, (it, s, aw, ks) in (("sebelum", sb), ("terbakar", tb)):
        g = grid[tahap]
        waktu.append({"tahap": tahap, "tahun": int(it["properties"]["datetime"][:4]), "tgl": it["properties"]["datetime"][:10], "adegan": it["id"],
                      "awan": round(100 * aw), "item": mini(it), "sah": gabung(g["sah"]), "buka": gabung(g["buka"]),
                      "ndvi_fp": med([v for v, f in zip(g["ndvi"], fp) if f]),
                      "porsi_box": round(sum(g["buka"]) / max(1, sum(g["sah"])), 3)})
    def tahun_(y):
        r = adegan_bersih(lat, lon, f"{y}-06-01", min(SEKARANG, dt.date(y, 10, 31)).isoformat(), "awan", maks=4, awan_lt=60) or \
            adegan_bersih(lat, lon, f"{y}-01-01", min(SEKARANG, dt.date(y, 12, 31)).isoformat(), "awan", maks=4, awan_lt=60)   # tahun basah: setahun penuh
        if not r:
            return None
        try:
            g = muat_adegan(r[0], lat, lon, r[1])
        except Exception as e:
            log("   muat gagal", r[0]["id"], repr(e)[:60])
            return None
        return {"tahap": "tahun", "tahun": y, "tgl": r[0]["properties"]["datetime"][:10], "adegan": r[0]["id"], "awan": round(100 * r[2]),
                "item": mini(r[0]), "sah": gabung(g["sah"]), "buka": gabung(g["buka"]),
                "ndvi_fp": med([v for v, f in zip(g["ndvi"], fp) if f]), "porsi_box": round(sum(g["buka"]) / max(1, sum(g["sah"])), 3)}
    if out["fp_px"] >= MIN_JEJAK_PX:   # tanpa jejak yang terlihat, lintasan tahunan percuma
        with ThreadPoolExecutor(3) as ex:
            waktu += [w for w in ex.map(tahun_, range(out["tahun"] + 1, SEKARANG.year + 1)) if w]
    out["waktu"] = waktu
    return out


def tahap_citra(tahun):
    kl = json.load(open(os.path.join(CACHE, f"klaster_{tahun}.json")))
    peta = {k["kid"]: k for k in kl["pool"]}
    ids = kl["kal_pos"] + kl["kal_neg"] + kl["pilih"]
    kerja = [peta[i] for i in ids if not os.path.exists(os.path.join(CACHE, f"s2_{i}.json"))]
    log(f"{tahun}: {len(ids)} klaster, {len(kerja)} belum di-cache")
    t0 = time.time()

    def jalan(k):
        try:
            h = analisis_klaster(k)
        except Exception as e:
            log("  GAGAL", k["kid"], repr(e)[:100])
            return k["kid"], None
        json.dump(h, open(os.path.join(CACHE, f"s2_{k['kid']}.json"), "w"), separators=(",", ":"))
        return k["kid"], h
    with ThreadPoolExecutor(int(os.environ.get("S2_UTAS", 5))) as ex:
        for i, (kid, h) in enumerate(ex.map(jalan, kerja)):
            log(f"  [{i + 1}/{len(kerja)}] {kid}: {h['status'] if h else 'gagal'} {len(h['waktu']) if h else 0} waktu, fp {h.get('fp_px') if h else '-'} px, {time.time() - t0:.0f} dtk")


# ================================================================ 5. metrik
def skor_lurus(titik):
    """kelurusan tepi: titik = [(x, y)] piksel tepi. Profil jumlah tepi per bin proyeksi pada sudut 0-175 derajat (tiap 5);
    skor = varians profil tertinggi / varians median antar sudut. Tepi lurus (blok kebun, jalan) menumpuk di satu bin saat
    sudutnya sejajar -> puncak tajam (skor jauh > 1); bercak/gumpalan acak ~ 1."""
    if len(titik) < MIN_TEPI:
        return 0.0
    var = []
    for a in SUDUT:
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        cnt = Counter(round(x * c + y * s) for x, y in titik)
        nb = max(cnt) - min(cnt) + 1
        mean = len(titik) / nb
        var.append((sum((v - mean) ** 2 for v in cnt.values()) + (nb - len(cnt)) * mean ** 2) / nb)
    return round(max(var) / max(statistics.median(var), 1e-9), 3)


def dilasi(m, r=DILASI):
    out = [False] * (N * N)
    for i, v in enumerate(m):
        if v:
            y, x = divmod(i, N)
            for yy in range(max(0, y - r), min(N, y + r + 1)):
                for xx in range(max(0, x - r), min(N, x + r + 1)):
                    out[yy * N + xx] = True
    return out


def tepi_buka(buka, roi):
    """piksel terbuka di ROI yang bertetangga (4-arah) dengan piksel tak-terbuka di ROI -> [(x, y)]"""
    t = []
    for i, v in enumerate(buka):
        if not (v and roi[i]):
            continue
        y, x = divmod(i, N)
        for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= yy < N and 0 <= xx < N and roi[yy * N + xx] and not buka[yy * N + xx]:
                t.append((x, y))
                break
    return t


def metrik_waktu(w, fp, roi):
    """porsi terbuka di jejak, cakupan jejak yang terlihat, kelurusan tepi"""
    sah, buka = urai(w["sah"]), urai(w["buka"])
    nfp = sum(fp)
    ok = sum(1 for f, s in zip(fp, sah) if f and s)
    bk = sum(1 for f, s, b in zip(fp, sah, buka) if f and s and b)
    roi_s = [r and s for r, s in zip(roi, sah)]
    return {"tahun": w["tahun"], "tgl": w["tgl"], "tahap": w["tahap"], "awan": w["awan"],
            "cakupan": round(ok / max(1, nfp), 2), "porsi_buka": round(bk / ok, 3) if ok else None,
            "ndvi_med": w["ndvi_fp"], "lurus": skor_lurus(tepi_buka(buka, roi_s)) if bk else 0.0}


def hitung(h):
    """cache s2_* -> {fp_px, sebelum, terbakar, tahunan:[...]} (metrik dihitung ulang dari peta bit)"""
    if h["status"] != "ok":
        return {"status": h["status"], "fp_px": 0, "tahunan": []}
    fp = urai(h["fp"])
    roi = dilasi(fp)
    ms = [metrik_waktu(w, fp, roi) for w in h["waktu"]]
    sebelum = next(m for m in ms if m["tahap"] == "sebelum")
    box = next(w["porsi_box"] for w in h["waktu"] if w["tahap"] == "sebelum")
    sw = next(w for w in h["waktu"] if w["tahap"] == "sebelum")
    kotak = [True] * (N * N)
    return {"status": "ok", "fp_px": h["fp_px"], "tahun": h["tahun"], "sebelum": sebelum,
            "sebelum_box": {"porsi_buka": box, "lurus": skor_lurus(tepi_buka(urai(sw["buka"]), urai(sw["sah"])))},
            "terbakar": next(m for m in ms if m["tahap"] == "terbakar"),
            "tahunan": [m for m in ms if m["tahap"] == "tahun"]}


def kelas_klaster(m, amb):
    """-> (kelas, tahun_kebun | None). amb = {porsi_min, lurus_min}. HIPOTESIS."""
    if m["status"] != "ok":
        return "terlalu dini/kurang citra", None
    if m["fp_px"] < MIN_JEJAK_PX:
        return "bekas bakar tak terlihat", None
    th = [t for t in m["tahunan"] if t["cakupan"] >= MIN_CAKUPAN and t["porsi_buka"] is not None]
    if not th:
        return "terlalu dini/kurang citra", None
    buka = [t for t in th if t["porsi_buka"] >= amb["porsi_min"]]
    if buka:
        lur = [t for t in buka if t["lurus"] >= amb["lurus_min"]]
        if lur:
            return "dibuka jadi kebun?", max(lur, key=lambda t: (t["porsi_buka"], t["lurus"]))["tahun"]
        return "terbuka tak berpola", None
    p1 = th[0]
    nd0 = m["terbakar"]["ndvi_med"]
    if p1["porsi_buka"] < PULIH_PORSI and p1["ndvi_med"] is not None and nd0 is not None and p1["ndvi_med"] > nd0:
        return "pulih alami", None
    return "tak tentu", None


def matriks(pos, neg, amb):
    tp = sum(1 for m in pos if kelas_klaster(m, amb)[0] == "dibuka jadi kebun?")
    fp = sum(1 for m in neg if kelas_klaster(m, amb)[0] == "dibuka jadi kebun?")
    return {"tp": tp, "fn": len(pos) - tp, "fp": fp, "tn": len(neg) - fp}


def stat_mat(c):
    tp, fp, tn, fn = c["tp"], c["fp"], c["tn"], c["fn"]
    c["sensitivitas"] = round(tp / (tp + fn), 3) if tp + fn else None
    c["spesifisitas"] = round(tn / (tn + fp), 3) if tn + fp else None
    c["presisi"] = round(tp / (tp + fp), 3) if tp + fp else None
    c["J"] = round((c["sensitivitas"] or 0) + (c["spesifisitas"] or 0) - 1, 3)
    return c


def kalibrasi(pos, neg):
    """atur ambang dari set kalibrasi: maksimalkan J = sens + spes - 1 (selisih ke hipotesis awal memecah seri)"""
    terbaik = None
    for pm in (.2, .3, .4, .5, .6):
        for lm in [round(1 + .1 * i, 1) for i in range(0, 40)]:
            amb = {"porsi_min": pm, "lurus_min": lm}
            c = stat_mat(matriks(pos, neg, amb))
            kunci = (c["J"], -abs(pm - AMBANG_AWAL["porsi_min"]) - abs(lm - AMBANG_AWAL["lurus_min"]) / 10)
            if terbaik is None or kunci > terbaik[0]:
                terbaik = (kunci, amb, c)
    awal = stat_mat(matriks(pos, neg, AMBANG_AWAL))
    _, amb, c = terbaik
    if c["J"] <= 0:
        amb, c = dict(AMBANG_AWAL), awal
    return amb, c, awal


# ================================================================ 6. foto
def stretch_tc(v, sk, of):
    return bytes(0 if d == 0 else int(255 * min(1., max(0., (d * sk + of) / GAIN_TC)) ** (1 / GAMMA_TC)) for d in v)


def stretch_lin(v, sk, of, gain):
    return bytes(0 if d == 0 else int(255 * min(1., max(0., (d * sk + of) / gain))) for d in v)


def simpan_png(rgb, n, berkas):
    """PNG <= FOTO_MAKS; bila perlu turunkan resolusi (nearest) sampai muat"""
    from array import array
    for m in (n, n * 9 // 10, n * 4 // 5, n * 7 // 10):
        a = rgb if m == n else [array("B", (c[int(i * n / m) * n + int(j * n / m)] for i in range(m) for j in range(m))) for c in rgb]
        b = C.png([array("B", x) for x in a] if m == n else a, m, FOTO_MAKS)
        if len(b) <= FOTO_MAKS:
            break
    open(berkas, "wb").write(b)
    return m, len(b)


def foto_klaster(h, kid, tahap_tahun, semu_tahun):
    """tahap_tahun = {'sebelum': w, 'terbakar': w, 'kebun1': w, 'kebun2': w|None}; -> {nama_tahap: berkas}"""
    lat, lon = h["pusat"]
    os.makedirs(FOTO, exist_ok=True)
    hasil = {}
    for tahap, w in tahap_tahun.items():
        if not w:
            continue
        it = w["item"]
        ch = []
        for k in ("red", "green", "blue"):
            v, sk, of = pita(it, k, lat, lon, FOTO_PX)
            ch.append(stretch_tc(v, sk, of))
        nama = f"{kid}_{tahap}_{w['tgl'].replace('-', '')}.png"
        simpan_png(ch, FOTO_PX, os.path.join(FOTO, nama))
        hasil[tahap] = {"f": "citra_s2/" + nama, "tgl": w["tgl"], "adegan": w["adegan"]}
        if tahap == "kebun1":
            sm = []
            for k, g in zip(("nir", "swir16", "red"), GAIN_SEMU):
                v, sk, of = pita(it, k, lat, lon, FOTO_PX)
                sm.append(stretch_lin(v, sk, of, g))
            nama = f"{kid}_semu_{w['tgl'].replace('-', '')}.png"
            simpan_png(sm, FOTO_PX, os.path.join(FOTO, nama))
            hasil["semu"] = {"f": "citra_s2/" + nama, "tgl": w["tgl"], "adegan": w["adegan"], "kanal": "R=NIR(B08) G=SWIR1(B11) B=Red(B04)"}
    return hasil


# ================================================================ 7. hasil
def muat_cache(kid):
    p = os.path.join(CACHE, f"s2_{kid}.json")
    return json.load(open(p)) if os.path.exists(p) else None


def tahap_hasil(tahun):
    kl = json.load(open(os.path.join(CACHE, f"klaster_{tahun}.json")))
    peta = {k["kid"]: k for k in kl["pool"]}
    t0 = time.time()
    amb_p = os.path.join(CACHE, "kalibrasi.json")
    kal = None
    if tahun == 2019:
        def ambil(ids):
            out = []
            for i in ids:
                h = muat_cache(i)
                m = hitung(h) if h else None
                if m and m["status"] == "ok" and m["fp_px"] >= MIN_JEJAK_PX and any(t["cakupan"] >= MIN_CAKUPAN for t in m["tahunan"]):
                    out.append(m)
                if len(out) == 30:
                    break
            return out
        pos, neg = ambil(kl["kal_pos"]), ambil(kl["kal_neg"])
        if len(pos) < 5 or len(neg) < 5:
            sys.exit(f"kalibrasi kurang data: pos {len(pos)} neg {len(neg)}")
        amb, c, awal = kalibrasi(pos, neg)
        kal = {"n_positif": len(pos), "n_negatif": len(neg), **{x: c[x] for x in ("tp", "fp", "tn", "fn", "sensitivitas", "spesifisitas", "presisi", "J")},
               "ambang_dipakai": amb, "dengan_ambang_awal": {"ambang": AMBANG_AWAL, **awal},
               "kandidat_tersedia": kl["kal_kandidat"],
               "sebaran": {"positif": [{"porsi_max": max((t["porsi_buka"] for t in m["tahunan"] if t["porsi_buka"] is not None), default=None),
                                        "lurus_max": max((t["lurus"] for t in m["tahunan"]), default=None)} for m in pos],
                           "negatif": [{"porsi_max": max((t["porsi_buka"] for t in m["tahunan"] if t["porsi_buka"] is not None), default=None),
                                        "lurus_max": max((t["lurus"] for t in m["tahunan"]), default=None)} for m in neg]},
               "catatan": "dalam-sampel (ambang dipilih dari set yang sama dilaporkan); kebenaran = Gaveau F2019; hasil klaim akhir TIDAK memakai klaster kalibrasi"}
        json.dump({"kalibrasi": kal, "ambang": amb}, open(amb_p, "w"))
    else:
        d = json.load(open(amb_p))
        amb, kal = d["ambang"], d["kalibrasi"]
    # kelas semua klaster terpilih
    kls = []
    for kid in kl["pilih"]:
        k = peta[kid]
        h = muat_cache(kid)
        m = hitung(h) if h else {"status": "belum_diproses", "fp_px": 0, "tahunan": []}
        kelas, ky = kelas_klaster(m, amb)
        kls.append({"k": k, "h": h, "m": m, "kelas": kelas, "ky": ky})
    for k in kl["pool"]:
        if k["kelas_awal"] and k["pid"] and k["n"] >= MIN_TITIK:
            kls.append({"k": k, "h": None, "m": None, "kelas": "sawit terbakar", "ky": None})
    # foto: kebun teratas
    os.makedirs(FOTO, exist_ok=True)
    kebun = sorted([x for x in kls if x["kelas"] == "dibuka jadi kebun?"],
                   key=lambda x: -(x["m"]["fp_px"] * .04 * next(t["porsi_buka"] for t in x["m"]["tahunan"] if t["tahun"] == x["ky"])))[:FOTO_TOP]
    for x in kebun:
        h, m = x["h"], x["m"]
        w = {(v["tahap"], v["tahun"]): v for v in h["waktu"]}
        k1 = w[("tahun", x["ky"])]
        sesudah = [v for v in h["waktu"] if v["tahap"] == "tahun" and v["tahun"] > x["ky"]]
        k2 = sesudah[0] if sesudah else None
        try:
            x["citra"] = foto_klaster(h, x["k"]["kid"], {"sebelum": next(v for v in h["waktu"] if v["tahap"] == "sebelum"),
                                                         "terbakar": next(v for v in h["waktu"] if v["tahap"] == "terbakar"), "kebun1": k1, "kebun2": k2}, x["ky"])
        except Exception as e:
            log("  foto gagal", x["k"]["kid"], repr(e)[:80])
    # susun JSON
    def ringkas(x):
        k, m = x["k"], x["m"]
        d = {"id": k["kid"], "pusat": k["pusat"], "bbox": k["bbox"], "api": k["api"], "n_titik": k["n"], "kelas": x["kelas"], "sawit_lama": k["sawit"]["lama"],
             "viirs_ha": k["viirs_ha"]}
        if m and m["status"] == "ok":
            d["jejak_ha"] = round(m["fp_px"] * .04, 1)
            d["sebelum"] = {"tgl": m["sebelum"]["tgl"], **m["sebelum_box"]}
            d["metrik_per_tahun"] = [{"tahun": t["tahun"], "tgl": t["tgl"], "porsi_buka": t["porsi_buka"], "ndvi": t["ndvi_med"], "lurus": t["lurus"], "cakupan": t["cakupan"]}
                                     for t in [m["terbakar"]] + m["tahunan"]]
            if x["ky"]:
                d["tahun_kebun"] = x["ky"]
        elif m:
            d["status"] = m["status"]
        if x.get("citra"):
            d["citra"] = x["citra"]
        return d
    perusahaan = {}
    grup = {}
    for f in os.listdir(os.path.join(AKAR, "public/data/konsesi2026")):
        if f.endswith(".json") and f[:-5].isdigit():
            for p in json.load(open(os.path.join(AKAR, "public/data/konsesi2026", f)))["perusahaan"]:
                if p.get("grup"):
                    grup[p["id"]] = p["grup"]
    for x in kls:
        c = x["k"]["konsesi"]
        if not c:
            continue
        p = perusahaan.setdefault(c["id"], {"id": c["id"], "nama": c["nama"], "grup": grup.get(c["id"]) or c.get("grup") or "", "jenis": c["jenis"],
                                            "prov": c["prov"], "kab": c["kab"], "klaster_n": 0, "klaster_dianalisis": 0, "ha_jejak": 0, "ha_jejak_s2": 0,
                                            "ha_dibuka_kebun": 0, "ha_sawit_terbakar": 0, "ha_pulih": 0, "contoh": []})
        p["klaster_n"] += 1
        p["ha_jejak"] += x["k"]["viirs_ha"]
        if x["m"] and x["m"]["status"] == "ok":
            p["klaster_dianalisis"] += 1
            ha = x["m"]["fp_px"] * .04
            p["ha_jejak_s2"] += ha
            if x["kelas"] == "dibuka jadi kebun?":
                p["ha_dibuka_kebun"] += ha * next(t["porsi_buka"] for t in x["m"]["tahunan"] if t["tahun"] == x["ky"])
            elif x["kelas"] == "pulih alami":
                p["ha_pulih"] += ha
        if x["kelas"] == "sawit terbakar":
            p["ha_sawit_terbakar"] += x["k"]["viirs_ha"] * x["k"]["sawit"]["lama"]
        p["contoh"].append(x)
    daftar = []
    for p in perusahaan.values():
        ex = sorted(p["contoh"], key=lambda x: (x["kelas"] != "dibuka jadi kebun?", -x["k"]["n"]))
        p["contoh"] = [ringkas(x) for x in ex[:3]]
        for kk in ("ha_jejak", "ha_jejak_s2", "ha_dibuka_kebun", "ha_sawit_terbakar", "ha_pulih"):
            p[kk] = round(p[kk])
        daftar.append(p)
    daftar.sort(key=lambda p: -p["ha_dibuka_kebun"])
    cnt = Counter(x["kelas"] for x in kls)
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "internal": "BNPB, tidak terbit; indikasi untuk pemeriksaan, bukan bukti pelaku",
           "tahun": tahun, "metode": __doc__.split("Metode ringkas:")[1].split("Lisensi")[0].strip(),
           "ambang": amb, "kalibrasi": kal,
           "konstanta_hipotesis": {"terbuka_ndvi": TERBUKA_NDVI, "terbuka_swir_nir": TERBUKA_SWIR_NIR, "dnbr_bakar": DNBR_BAKAR, "min_jejak_px": MIN_JEJAK_PX,
                                   "pulih_porsi": PULIH_PORSI, "sawit_lama": SAWIT_LAMA, "min_titik": MIN_TITIK},
           "batas": BATAS + ([f"Sawit tanam 2022 tidak terlihat di Descals; {cnt['sawit terbakar']} klaster 'sawit terbakar' hanya berdasar sawit <= 2021."] if tahun == 2023 else []),
           "ringkasan": {"titik_viirs": kl["titik"], "klaster_ge20": sum(1 for k in kl["pool"] if k["n"] >= MIN_TITIK), "klaster_di_konsesi": sum(1 for k in kl["pool"] if k["pid"]),
                         "klaster_dipilih": len(kl["pilih"]), "per_kelas": dict(cnt)},
           "klaster": [ringkas(x) for x in kls],
           "luar_konsesi_kab": kl["luar_kab"], "perusahaan": daftar}
    json.dump(out, open(os.path.join(HASIL, f"sawit_s2_{tahun}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    log(f"{tahun}: sawit_s2_{tahun}.json, kelas {dict(cnt)}, foto {sum(len(x.get('citra', {})) for x in kls)} ({time.time() - t0:.0f} dtk)")
    if kal:
        log(f"  kalibrasi: tp {kal['tp']} fn {kal['fn']} fp {kal['fp']} tn {kal['tn']} J {kal['J']} ambang {amb}")


# ================================================================ uji
def uji():
    # klaster 8-arah: diagonal bergabung, 2 sel jarak terpisah
    t = dt.datetime(2019, 8, 1)
    pts = [(.005, .005, t), (.015, .015, t), (.025, .025, t), (.505, .505, t), (.305, .305, t)]
    ks = sorted(sorted(k) for k in komponen(pts))
    assert ks == [[0, 1, 2], [3], [4]], ks
    # komponen lebar dipecah per petak; celah waktu memecah
    lebar = [(.005 + .01 * i, .005, t) for i in range(8)]
    assert len(komponen(lebar)) == 4, len(komponen(lebar))
    p2 = [(0.005, 0.005, t), (0.005, 0.005, t + dt.timedelta(days=5)), (0.005, 0.005, t + dt.timedelta(days=60))]
    assert [len(k) for k in pecah_waktu([0, 1, 2], p2)] == [2, 1]
    kk = klaster(pts[:3])
    assert len(kk) == 1 and kk[0]["n"] == 3 and kk[0]["api"]["pertama"] == "2019-08-01"
    # kelurusan: petak lurus (termasuk berputar) > bercak acak
    def petak(sudut=0):
        buka = [False] * (N * N)
        c, s = math.cos(math.radians(sudut)), math.sin(math.radians(sudut))
        for y in range(N):
            for x in range(N):
                u, v = (x - 75) * c + (y - 75) * s, -(x - 75) * s + (y - 75) * c
                buka[y * N + x] = abs(u) < 60 and abs(v) < 60 and (int(u + 60) % 30) < 24 and (int(v + 60) % 40) < 33
        return buka
    r = random.Random(3)
    acak = [r.random() < .4 for _ in range(N * N)]
    for _ in range(3):   # haluskan: bercak, bukan garam-lada
        acak = [sum(acak[(y + dy) * N + x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if 0 <= y + dy < N and 0 <= x + dx < N) >= 5
                for y in range(N) for x in range(N)]
    roi = [True] * (N * N)
    s_lurus, s_rot, s_acak = (skor_lurus(tepi_buka(b, roi)) for b in (petak(0), petak(27), acak))
    assert s_lurus > 2 * s_acak and s_rot > 1.5 * s_acak and s_acak < 2, (s_lurus, s_rot, s_acak)
    # bulat vs persegi
    bulat = [(x - 75) ** 2 + (y - 75) ** 2 < 50 ** 2 for y in range(N) for x in range(N)]
    kotak_ = [abs(x - 75) < 45 and abs(y - 75) < 45 for y in range(N) for x in range(N)]
    assert skor_lurus(tepi_buka(kotak_, roi)) > 1.5 * skor_lurus(tepi_buka(bulat, roi))
    # klasifikasi
    def mm(tahunan, fp=500, nd0=.1):
        return {"status": "ok", "fp_px": fp, "terbakar": {"ndvi_med": nd0}, "tahunan": tahunan}
    th = lambda y, p, l, nd=.5, cak=1: {"tahun": y, "porsi_buka": p, "lurus": l, "ndvi_med": nd, "cakupan": cak}
    a = {"porsi_min": .3, "lurus_min": 2}
    assert kelas_klaster(mm([th(2020, .6, 5), th(2021, .5, 4)]), a) == ("dibuka jadi kebun?", 2020)
    assert kelas_klaster(mm([th(2020, .6, 1.2)]), a)[0] == "terbuka tak berpola"
    assert kelas_klaster(mm([th(2020, .05, 1.2, .7)]), a)[0] == "pulih alami"
    assert kelas_klaster(mm([th(2020, .05, 1.2), th(2021, .5, 4)]), a) == ("dibuka jadi kebun?", 2021)   # muncul lagi
    assert kelas_klaster(mm([th(2020, .2, 1.2)]), a)[0] == "tak tentu"
    assert kelas_klaster(mm([th(2020, .9, 9, cak=.2)]), a)[0] == "terlalu dini/kurang citra"
    assert kelas_klaster(mm([th(2020, .9, 9)], fp=10), a)[0] == "bekas bakar tak terlihat"
    assert kelas_klaster({"status": "tanpa_sebelum"}, a)[0] == "terlalu dini/kurang citra"
    # kalibrasi memisahkan dua kelompok sintetis
    pos = [mm([th(2020, .7, 4 + i / 10)]) for i in range(10)]
    neg = [mm([th(2020, .7, 1.1 + i / 20)]) for i in range(10)]
    amb, c, _ = kalibrasi(pos, neg)
    assert c["tp"] == 10 and c["tn"] == 10 and 1.5 <= amb["lurus_min"] <= 4, (amb, c)
    # indeks piksel + peta bit pulang-pergi
    nd, nb, bk = indeks_piksel([True, True, False], [.1, .15, .1], [.5, .2, .5], [.2, .4, .3], [.1, .3, .1])
    assert bk == [False, True, False] and nd[2] is None and abs(nb[0] - (.5 - .1) / .6) < 1e-9
    v = [True, False, False, True, False] + [False] * (N * N - 5)
    assert urai(gabung(v)) == v
    print("uji sawit_s2 ok", s_lurus, s_rot, s_acak)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a and a[0] in ("klaster", "citra", "hasil", "semua") and len(a) > 1:
        for y in map(int, a[1:]):
            if a[0] in ("klaster", "semua"):
                tahap_klaster(y)
            if a[0] in ("citra", "semua"):
                tahap_citra(y)
            if a[0] in ("hasil", "semua"):
                tahap_hasil(y)
    else:
        print(__doc__)
