"""Pemadaman listrik dan pemulihan pasca-bencana dari lampu malam NASA Black Marble -> public/banjir/data/lampu_malam.json

Rujukan metode: Román dkk. 2019 (PLOS ONE, pemadaman Puerto Rico pasca-Badai Maria): radiansi lampu malam harian VNP46
dibandingkan dengan dasar sebelum kejadian, per wilayah, lalu dilacak hari demi hari sampai pulih.

Data (tanpa token): NASA GIBS WMS, lapisan VIIRS_SNPP_GapFilled_BRDF_Corrected_DayNightBand_Radiance (= VNP46A2 Gap-Filled
DNB BRDF-Corrected NTL; terkoreksi bulan, BRDF, dan atmosfer) sebagai PNG abu-abu 180 tingkat. Warna dikembalikan ke radiansi
lewat colormap GIBS (nilai tengah tiap pita, nW/cm²/sr; pita teratas >= 38,2 jenuh, jadi pusat kota paling terang hanya
terbaca "masih >= 38,2"). "Gap-filled" berarti piksel berawan diisi nilai cerah terakhir: itu akan menyembunyikan pemadaman,
jadi tiap piksel disaring dengan VIIRS_SNPP_Clear_Sky_Confidence_Night (masker awan malam satelit yang sama) dan hanya
piksel yang cerah (keyakinan >= CERAH) yang dipakai. Token Earthdata (EARTHDATA_TOKEN) tidak dibutuhkan jalur ini.

STATUS 21 Okt 2026: BELUM LAYAK TERBIT. Uji balik (public/banjir/data/lampu_malam_validasi.json) menunjukkan lapisan gap-filled
GIBS menutup pemadaman Palu 2018 (retrieval mutu rendah diganti nilai lama), dan lapisan radiansi sensor tanpa koreksi bulan
memberi alarm palsu di Bali 2025. Jalur yang benar: VNP46A2 asli dari LAADS (DNB_BRDF-Corrected_NTL + Mandatory_Quality_Flag +
QF_Cloud_Mask) dengan EARTHDATA_TOKEN. Mesin di bawah (dasar, rasio, gelap, pulih, alarm palsu) tetap dipakai; yang diganti
hanya fungsi `malam()`. Jangan sambungkan ke workflow atau layar sebelum uji balik lulus.

Metode per kejadian:
  1. Hari pertama sesudah kejadian (H0) = tanggal produk yang lintasan ~01.30 waktu setempatnya jatuh SESUDAH waktu kejadian.
  2. Dasar per piksel = median radiansi cerah selama HARI_DASAR hari sebelum H0 (minimal MIN_CERAH_DASAR malam cerah).
     Piksel "terang" = dasar >= TERANG (hipotesis: memisahkan lampu permukiman dari derau latar).
  3. Rasio harian per kecamatan = jumlah radiansi pasca / jumlah dasar, atas piksel terang yang cerah malam itu.
     Dinilai hanya bila >= MIN_PIKSEL piksel dan >= MIN_TUTUP bagian piksel terang kecamatan itu cerah.
  4. Gelap = rasio < AMBANG_GELAP, redup = < AMBANG_REDUP (keduanya HIPOTESIS, belum dikalibrasi ke data PLN).
     Pulih = hari pertama sesudah gelap/redup yang rasionya kembali >= AMBANG_REDUP.
  5. Alarm palsu = bagian kecamatan-hari di masa dasar sendiri yang jatuh ke "gelap" (derau metode tanpa bencana).

Pemicu (kejadian di repo):
  gempa      USGS FDSN, M >= GEMPA_M_MIN, kedalaman <= GEMPA_DALAM_MAKS km, HARI_PEMICU hari terakhir; radius
             r = 30 * 2^(M - 5,5) km (maks 150) di sekitar episentrum (aturan jempol kami, bukan model guncangan).
  banjir     public/banjir/data/kejadian_aktif_awal.json, level_tertinggi >= 3 (Awas); kecamatan dari daftarnya.
  gunungapi  public/banjir/data/kejadian_gunungapi_awal.json, level >= 3 (Siaga/Awas); radius 15 km dari puncak.
  Paling banyak MAKS_KEJADIAN, terbaru dulu.

Pakai:  python3 scripts/umum/lampu_malam.py                      pemicu otomatis -> lampu_malam.json
        python3 scripts/umum/lampu_malam.py validasi             uji balik gempa Palu 2018 -> lampu_malam_validasi.json
        python3 scripts/umum/lampu_malam.py uji                  swa-uji luring (tanpa jaringan)
"""
import array, datetime as dt, importlib.util, json, math, os, re, struct, sys, urllib.parse, urllib.request, zlib
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/banjir/data")
WIB = dt.timezone(dt.timedelta(hours=7))
WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
L_NTL = "VIIRS_SNPP_GapFilled_BRDF_Corrected_DayNightBand_Radiance"
L_AWAN = "VIIRS_SNPP_Clear_Sky_Confidence_Night"
CM_NTL = "https://gibs.earthdata.nasa.gov/colormaps/v1.3/VIIRS_DayNightBand_At_Sensor_Radiance.xml"
CM_AWAN = "https://gibs.earthdata.nasa.gov/colormaps/v1.3/VIIRS_Clear_Sky_Confidence.xml"
LANGKAH = 0.0044921875        # derajat per piksel, matriks "500m" GIBS EPSG:4326 (VNP46 15" ditampilkan ulang di sini)
JENUH = 38.2                  # pita colormap teratas [38,2, ∞)
HARI_DASAR = 60
HARI_PASCA = 30
CERAH = 0.95                  # keyakinan langit cerah VIIRS (>= "probably clear")
MIN_CERAH_DASAR = 3
TERANG = 1.5                  # nW/cm²/sr, hipotesis
MIN_PIKSEL = 5
MIN_TUTUP = 0.25
AMBANG_GELAP = 0.5            # hipotesis
AMBANG_REDUP = 0.8            # hipotesis
GEMPA_M_MIN = 5.0
GEMPA_DALAM_MAKS = 70
HARI_PEMICU = 30
MAKS_KEJADIAN = 6
INDONESIA = (94.0, -11.5, 141.5, 6.5)
UA = {"User-Agent": "PantauBencana/1.0 (+https://centurisk97.id)"}

_s = importlib.util.spec_from_file_location("umum_lampu_wilayah", os.path.join(AKAR, "scripts/data/wilayah.py"))
_W = importlib.util.module_from_spec(_s)
_s.loader.exec_module(_W)


def baca(jalur, bawaan=None):
    try:
        return json.load(open(jalur, encoding="utf-8"))
    except (OSError, ValueError):
        return bawaan


def simpan(jalur, o):
    """`dibuat` kunci pertama (syarat /api/status); tulis atomik."""
    o = {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M%z")[:-2] + ":00", **{k: v for k, v in o.items() if k != "dibuat"}}
    t = jalur + ".tmp"
    with open(t, "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(t, jalur)


def ambil(url, coba=3):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read()
        except Exception:
            if i == coba - 1:
                raise


def km(a, b):
    la = math.radians((a[0] + b[0]) / 2)
    return 111.2 * math.hypot(a[0] - b[0], (a[1] - b[1]) * math.cos(la))


# ---------- PNG (stdlib) ----------

def png(b):
    """PNG 8-bit (abu, RGB, RGBA, palet) -> (lebar, tinggi, piksel RGBA sebagai bytearray)."""
    if b[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("bukan PNG")
    i, idat, plte, trns = 8, [], None, b""
    while i < len(b):
        n, t = struct.unpack(">I4s", b[i:i + 8])
        d = b[i + 8:i + 8 + n]
        i += 12 + n
        if t == b"IHDR":
            w, h, bd, ct, _, _, il = struct.unpack(">IIBBBBB", d)
            if bd != 8 or il:
                raise ValueError("PNG harus 8-bit tanpa interlace")
        elif t == b"PLTE":
            plte = d
        elif t == b"tRNS":
            trns = d
        elif t == b"IDAT":
            idat.append(d)
    bpp = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    raw, s = zlib.decompress(b"".join(idat)), w * bpp
    out, prev, p = bytearray(h * s), bytearray(s), 0
    for y in range(h):
        f, ln = raw[p], bytearray(raw[p + 1:p + 1 + s])
        p += 1 + s
        if f == 1:
            for x in range(bpp, s):
                ln[x] = (ln[x] + ln[x - bpp]) & 255
        elif f == 2:
            ln = bytearray((a + c) & 255 for a, c in zip(ln, prev))
        elif f == 3:
            for x in range(s):
                ln[x] = (ln[x] + (((ln[x - bpp] if x >= bpp else 0) + prev[x]) >> 1)) & 255
        elif f == 4:
            for x in range(s):
                a = ln[x - bpp] if x >= bpp else 0
                c = prev[x - bpp] if x >= bpp else 0
                bq = prev[x]
                pa, pb, pc = abs(bq - c), abs(a - c), abs(a + bq - 2 * c)
                ln[x] = (ln[x] + (a if pa <= pb and pa <= pc else bq if pb <= pc else c)) & 255
        out[y * s:(y + 1) * s] = ln
        prev = ln
    if ct == 6:
        return w, h, out
    rgba = bytearray(w * h * 4)
    for k in range(w * h):
        if ct == 3:
            j = out[k]
            rgba[4 * k:4 * k + 3] = plte[3 * j:3 * j + 3]
            rgba[4 * k + 3] = trns[j] if j < len(trns) else 255
        elif ct == 2:
            rgba[4 * k:4 * k + 4] = out[3 * k:3 * k + 3] + b"\xff"
        elif ct == 0:
            rgba[4 * k:4 * k + 4] = bytes((out[k],) * 3) + b"\xff"
        else:
            rgba[4 * k:4 * k + 4] = bytes((out[2 * k],) * 3) + out[2 * k + 1:2 * k + 2]
    return w, h, rgba


# ---------- colormap ----------

def colormap(xml):
    """[(r,g,b,nilai_tengah)] dari ColorMapEntry non-nodata; pita terbuka atas memakai batas bawahnya."""
    out = []
    for tag in re.findall(r"<ColorMapEntry [^>]*>", xml):
        m = re.search(r'rgb="(\d+),(\d+),(\d+)".*? value="\[([-\d.]+),([-\d.]+)[)\]]"', tag)
        if not m or 'nodata="true"' in tag:
            continue
        a, b = float(m.group(4)), float(m.group(5))
        out.append((int(m.group(1)), int(m.group(2)), int(m.group(3)), a if b > 1e5 else (a + b) / 2))
    return out


class Pemeta:
    """RGB -> nilai, warna yang tak persis (WMS meratakan) dipetakan ke entri terdekat; di-cache."""

    def __init__(self, cm):
        self.cm, self.c = cm, {}

    def __call__(self, r, g, b):
        k = (r << 16) | (g << 8) | b
        v = self.c.get(k)
        if v is None:
            v = self.c[k] = min(self.cm, key=lambda e: (e[0] - r) ** 2 + (e[1] - g) ** 2 + (e[2] - b) ** 2)[3]
        return v


# ---------- grid & kecamatan ----------

def kotak(lon0, lat0, lon1, lat1):
    """Kotak dirapatkan ke grid GIBS -> (x0, y1, lebar, tinggi)."""
    x0, x1 = math.floor((lon0 + 180) / LANGKAH), math.ceil((lon1 + 180) / LANGKAH)
    y0, y1 = math.floor((90 - lat1) / LANGKAH), math.ceil((90 - lat0) / LANGKAH)
    return x0 * LANGKAH - 180, 90 - y0 * LANGKAH, x1 - x0, y1 - y0


def peta_piksel(k, target, wil):
    """Indeks piksel -> kunci kecamatan (hanya kecamatan target)."""
    lon0, lat1, w, h = k
    idx, kec = array.array("i"), []
    for j in range(h):
        lat = lat1 - (j + .5) * LANGKAH
        for i in range(w):
            r = wil.cari(lon0 + (i + .5) * LANGKAH, lat)
            if r:
                kk = "|".join(r)
                if kk in target:
                    idx.append(j * w + i)
                    kec.append(kk)
    return idx, kec


def url_wms(lapis, k, hari):
    lon0, lat1, w, h = k
    q = {"SERVICE": "WMS", "REQUEST": "GetMap", "VERSION": "1.1.1", "LAYERS": lapis, "SRS": "EPSG:4326", "FORMAT": "image/png",
         "BBOX": f"{lon0:.7f},{lat1 - h * LANGKAH:.7f},{lon0 + w * LANGKAH:.7f},{lat1:.7f}", "WIDTH": w, "HEIGHT": h, "TIME": hari}
    return WMS + "?" + urllib.parse.urlencode(q)


def malam(k, hari, idx, p_ntl, p_awan):
    """Radiansi cerah per piksel target (NaN = berawan/kosong); None = tak ada piksel cerah; "gagal" = unduhan gagal."""
    try:
        w, h, a = png(ambil(url_wms(L_NTL, k, hari)))
        _, _, c = png(ambil(url_wms(L_AWAN, k, hari)))
    except Exception as e:
        print(f"  {hari}: {e}", file=sys.stderr)
        return "gagal"
    out, ada = array.array("f"), False
    for q in idx:
        o = 4 * q
        if a[o + 3] == 0 or c[o + 3] == 0 or p_awan(c[o], c[o + 1], c[o + 2]) < CERAH:
            out.append(math.nan)
        else:
            out.append(p_ntl(a[o], a[o + 1], a[o + 2]))
            ada = True
    return out if ada else None


# ---------- hitung ----------

def hari_pertama(waktu_utc, lon):
    """Tanggal produk pertama yang lintasan ~01.30 waktu matahari setempatnya sesudah kejadian."""
    jam = 1.5 - lon / 15
    d = waktu_utc.date() - dt.timedelta(days=1)
    while True:
        lintas = dt.datetime.combine(d, dt.time(0), dt.timezone.utc) + dt.timedelta(hours=jam % 24)
        if lintas > waktu_utc:
            return d
        d += dt.timedelta(days=1)


def median(xs):
    xs = sorted(xs)
    n = len(xs)
    return None if not n else xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def rasio_hari(nilai, dasar, kec, terang_per_kec):
    """nilai/dasar: array per piksel; -> {kec: rasio} untuk kecamatan yang cukup cerah malam itu."""
    jum = {}
    for v, b, kk in zip(nilai, dasar, kec):
        if b is None or v != v:
            continue
        s = jum.setdefault(kk, [0.0, 0.0, 0])
        s[0] += v
        s[1] += b
        s[2] += 1
    return {kk: s[0] / s[1] for kk, s in jum.items() if s[2] >= MIN_PIKSEL and s[2] >= MIN_TUTUP * terang_per_kec[kk] and s[1] > 0}


def nilai_kejadian(hari_dasar, hari_pasca, seri, kec, jiwa):
    """seri {hari: array radiansi cerah per piksel}. Murni (tanpa jaringan) supaya bisa diuji."""
    n = len(kec)
    dasar = []
    for i in range(n):
        xs = [seri[h][i] for h in hari_dasar if h in seri and seri[h][i] == seri[h][i]]
        m = median(xs) if len(xs) >= MIN_CERAH_DASAR else None
        dasar.append(m if m is not None and m >= TERANG else None)
    terang = {}
    for b, kk in zip(dasar, kec):
        if b is not None:
            terang[kk] = terang.get(kk, 0) + 1
    terang = {kk: v for kk, v in terang.items() if v >= MIN_PIKSEL}
    dasar = [b if kk in terang else None for b, kk in zip(dasar, kec)]
    # alarm palsu: kecamatan-hari di masa dasar yang jatuh ke "gelap"
    uji_d = [r for h in hari_dasar if h in seri for r in rasio_hari(seri[h], dasar, kec, terang).values()]
    pasca = {h: rasio_hari(seri[h], dasar, kec, terang) for h in hari_pasca if h in seri}
    baris = []
    for kk in sorted(terang):
        r = [round(pasca[h][kk], 2) if h in pasca and kk in pasca[h] else None for h in hari_pasca]
        nyata = [(h, v) for h, v in zip(hari_pasca, r) if v is not None]
        jatuh = next((i for i, (_, v) in enumerate(nyata) if v < AMBANG_REDUP), None)
        pulih = None
        if jatuh is not None:
            pulih = next((h for h, v in nyata[jatuh + 1:] if v >= AMBANG_REDUP), None)
        kini = nyata[-1][1] if nyata else None
        status = "tak_terbaca" if kini is None else "gelap" if kini < AMBANG_GELAP else "redup" if kini < AMBANG_REDUP else "normal"
        terendah = min((v for _, v in nyata), default=None)
        baris.append({"k": kk, "jiwa": jiwa.get(kk), "piksel": terang[kk],
                      "dasar": round(sum(b for b, k2 in zip(dasar, kec) if k2 == kk and b is not None) / terang[kk], 1),
                      "r": r, "terendah": terendah, "status": status, "pernah_gelap": terendah is not None and terendah < AMBANG_GELAP,
                      "pulih": pulih})
    hari_ada = [h for h in hari_pasca if h in seri]

    def hitung(syarat):
        ks = [b for b in baris if syarat(b)]
        return {"kec": len(ks), "jiwa": sum(b["jiwa"] or 0 for b in ks)}
    ringkas = {
        "kec_dinilai": len(baris), "hari_dasar_cerah": sum(1 for h in hari_dasar if h in seri), "hari_pasca": len(hari_ada),
        "pernah_gelap": hitung(lambda b: b["pernah_gelap"]),
        "masih_gelap": hitung(lambda b: b["status"] == "gelap"),
        "masih_redup": hitung(lambda b: b["status"] == "redup"),
        "pulih": hitung(lambda b: b["pulih"] is not None and b["status"] == "normal"),
        "alarm_palsu_dasar": round(sum(1 for r in uji_d if r < AMBANG_GELAP) / len(uji_d), 3) if uji_d else None,
        "kec_hari_dasar": len(uji_d),
    }
    lama = [hari_pasca.index(b["pulih"]) for b in baris if b["pulih"] and b["pernah_gelap"]]
    ringkas["pulih_median_hari"] = median(lama)
    return ringkas, baris


def olah(kej, wil, p_ntl, p_awan, jiwa, akhir):
    """kej {id, jenis, nama, waktu(UTC datetime), pusat[lat,lon], target{kec}, kotak(lon0,lat0,lon1,lat1)}."""
    h0 = hari_pertama(kej["waktu"], kej["pusat"][1])
    hd = [(h0 - dt.timedelta(days=HARI_DASAR - i)).isoformat() for i in range(HARI_DASAR)]
    hp = [(h0 + dt.timedelta(days=i)).isoformat() for i in range(HARI_PASCA) if h0 + dt.timedelta(days=i) <= akhir]
    k = kotak(*kej["kotak"])
    idx, kec = peta_piksel(k, kej["target"], wil)
    if not idx:
        return None
    with ThreadPoolExecutor(4) as ex:
        hasil = list(ex.map(lambda h: (h, malam(k, h, idx, p_ntl, p_awan)), hd + hp))
    seri = {h: v for h, v in hasil if v is not None and v != "gagal"}
    ringkas, baris = nilai_kejadian(hd, hp, seri, kec, jiwa)
    ringkas["hari_gagal_unduh"] = sum(1 for _, v in hasil if v == "gagal")
    if not baris:
        return None
    return {"id": kej["id"], "jenis": kej["jenis"], "nama": kej["nama"], "waktu": kej["waktu"].strftime("%Y-%m-%dT%H:%MZ"),
            "pusat": kej["pusat"], "besaran": kej.get("besaran"), "hari_pertama": hp[0] if hp else None,
            "dasar": [hd[0], hd[-1]], "hari": hp, "ringkas": ringkas,
            "kec": sorted(baris, key=lambda b: (b["terendah"] if b["terendah"] is not None else 9, b["k"]))}


# ---------- pemicu ----------

def di_radius(pusat_kec, p, r_km):
    return {k for k, c in pusat_kec.items() if km(c, p) <= r_km}


def kotak_radius(p, r_km):
    dl = r_km / 111.2
    dn = dl / max(.2, math.cos(math.radians(p[0])))
    return (p[1] - dn, p[0] - dl, p[1] + dn, p[0] + dl)


def r_gempa(m):
    return min(150.0, 30 * 2 ** (m - 5.5))


def pemicu_gempa(kini, pusat_kec):
    q = {"format": "geojson", "starttime": (kini - dt.timedelta(days=HARI_PEMICU)).strftime("%Y-%m-%d"), "minmagnitude": GEMPA_M_MIN,
         "minlongitude": INDONESIA[0], "minlatitude": INDONESIA[1], "maxlongitude": INDONESIA[2], "maxlatitude": INDONESIA[3],
         "maxdepth": GEMPA_DALAM_MAKS}
    out = []
    for f in json.loads(ambil("https://earthquake.usgs.gov/fdsnws/event/1/query?" + urllib.parse.urlencode(q)))["features"]:
        lon, lat, _ = f["geometry"]["coordinates"]
        m, p = f["properties"]["mag"], [lat, lon]
        t = di_radius(pusat_kec, p, r_gempa(m))
        if t:
            out.append({"id": "usgs:" + f["id"], "jenis": "gempa", "nama": f["properties"]["place"],
                        "waktu": dt.datetime.fromtimestamp(f["properties"]["time"] / 1000, dt.timezone.utc), "pusat": [round(lat, 3), round(lon, 3)],
                        "besaran": f"M {m:.1f}".replace(".", ","), "target": t, "kotak": kotak_radius(p, r_gempa(m))})
    return out


def pemicu_banjir(pusat_kec):
    d = baca(os.path.join(KELUAR, "kejadian_aktif_awal.json"), {}) or {}
    out = []
    for e in d.get("kejadian", []):
        if (e.get("level_tertinggi") or 0) < 3 or not e.get("kec"):
            continue
        b = e["bbox"]
        out.append({"id": e["kode"], "jenis": "banjir", "nama": e["kec"][0].split("|")[1], "besaran": "Awas",
                    "waktu": dt.datetime.fromisoformat(e["sejak"]).replace(tzinfo=WIB).astimezone(dt.timezone.utc),
                    "pusat": e["pusat"], "target": set(e["kec"]), "kotak": (b[0] - .02, b[1] - .02, b[2] + .02, b[3] + .02)})
    return out


def pemicu_gunungapi(pusat_kec):
    d = baca(os.path.join(KELUAR, "kejadian_gunungapi_awal.json"), {}) or {}
    out = []
    for e in d.get("kejadian", []):
        if (e.get("besaran") or {}).get("nilai", 0) < 3 or not e.get("aktif"):
            continue
        t = di_radius(pusat_kec, e["pusat"], 15)
        if t:
            out.append({"id": e["kode"], "jenis": "gunungapi", "nama": e["nama"], "besaran": e["besaran"]["ket"],
                        "waktu": dt.datetime.fromisoformat(e["mulai"]).replace(tzinfo=WIB).astimezone(dt.timezone.utc),
                        "pusat": e["pusat"], "target": t, "kotak": kotak_radius(e["pusat"], 15)})
    return out


def siapkan():
    p_ntl = Pemeta(colormap(ambil(CM_NTL).decode()))
    p_awan = Pemeta(colormap(ambil(CM_AWAN).decode()))
    pusat_kec = baca(os.path.join(KELUAR, "pusat_kec.json"), {})
    jiwa = (baca(os.path.join(AKAR, "public/data/penduduk.json"), {}) or {}).get("kec", {})
    return _W.Wilayah(), p_ntl, p_awan, pusat_kec, jiwa


SUMBER = [{"nama": "NASA Black Marble VNP46A2 (Gap-Filled DNB BRDF-Corrected NTL) via GIBS", "url": "https://www.earthdata.nasa.gov/data/projects/black-marble"},
          {"nama": "VIIRS Clear Sky Confidence (malam) via GIBS", "url": "https://gibs.earthdata.nasa.gov/"},
          {"nama": "Penduduk per kecamatan: WorldPop", "url": "https://www.worldpop.org/"}]
METODE = {"ambang_gelap": AMBANG_GELAP, "ambang_redup": AMBANG_REDUP, "terang_nw": TERANG, "cerah_min": CERAH, "hari_dasar": HARI_DASAR,
          "hipotesis": True, "jenuh_nw": JENUH,
          "catatan": "Rasio = radiansi malam pasca-kejadian dibagi median 60 malam cerah sebelumnya, hanya piksel permukiman yang cerah malam itu. "
                     "Ambang gelap dan redup masih hipotesis. Lampu yang padam bisa juga karena warga mengungsi atau bangunan runtuh, bukan hanya jaringan PLN. "
                     "Malam berawan tidak terbaca; pusat kota yang jenuh hanya terbaca bila radiansinya turun di bawah 38,2 nW/cm²/sr."}


def jalan(kini=None):
    kini = kini or dt.datetime.now(dt.timezone.utc)
    wil, p_ntl, p_awan, pusat_kec, jiwa = siapkan()
    calon = []
    for f in (lambda: pemicu_gempa(kini, pusat_kec), lambda: pemicu_banjir(pusat_kec), lambda: pemicu_gunungapi(pusat_kec)):
        try:
            calon += f()
        except Exception as e:
            print("pemicu gagal:", e, file=sys.stderr)
    calon = sorted(calon, key=lambda c: c["waktu"], reverse=True)[:MAKS_KEJADIAN]
    akhir = (kini - dt.timedelta(days=1)).date()
    kej = [x for x in (olah(c, wil, p_ntl, p_awan, jiwa, akhir) for c in calon) if x]
    simpan(os.path.join(KELUAR, "lampu_malam.json"), {"sumber": SUMBER, "metode": METODE, "kejadian": kej})
    print(f"lampu_malam: {len(calon)} pemicu, {len(kej)} kejadian terbaca")


# Uji balik: gempa Palu-Donggala M 7,5, 28 Sep 2018 10.02 UTC (USGS us1000h3p4). Pembanding dari laporan PLN di media,
# dikutip di lampu_malam_validasi.json; semuanya angka tingkat kota/provinsi, bukan kecamatan.
PALU = {"id": "usgs:us1000h3p4", "jenis": "gempa", "nama": "Palu-Donggala, Sulawesi Tengah", "besaran": "M 7,5",
        "waktu": dt.datetime(2018, 9, 28, 10, 2, 43, tzinfo=dt.timezone.utc), "pusat": [-0.256, 119.846]}


def validasi():
    wil, p_ntl, p_awan, pusat_kec, jiwa = siapkan()
    r = 60  # Palu, Sigi, Donggala selatan: wilayah yang diberitakan padam
    kej = dict(PALU, target=di_radius(pusat_kec, [-0.9, 119.87], r), kotak=kotak_radius([-0.9, 119.87], r))
    x = olah(kej, wil, p_ntl, p_awan, jiwa, kej["waktu"].date() + dt.timedelta(days=HARI_PASCA))
    jalur = os.path.join(KELUAR, "lampu_malam_validasi.json")
    lama = baca(jalur, {}) or {}
    simpan(jalur, {"sumber": SUMBER, "metode": METODE, "kejadian": [x], "pembanding": lama.get("pembanding", [])})
    print(json.dumps(x["ringkas"], ensure_ascii=False))


# ---------- swa-uji ----------

def _png_buat(w, h, rgba, filt):
    """PNG RGBA 8-bit dengan satu jenis filter per baris (untuk menguji pengurai)."""
    def kepala(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    s, raw, prev = w * 4, bytearray(), bytearray(w * 4)
    for y in range(h):
        ln, f = rgba[y * s:(y + 1) * s], filt[y % len(filt)]
        e = bytearray(s)
        for x in range(s):
            a = ln[x - 4] if x >= 4 else 0
            c = prev[x - 4] if x >= 4 else 0
            b = prev[x]
            pr = 0 if f == 0 else a if f == 1 else b if f == 2 else (a + b) >> 1 if f == 3 else \
                (a if abs(b - c) <= abs(a - c) and abs(b - c) <= abs(a + b - 2 * c) else b if abs(a - c) <= abs(a + b - 2 * c) else c)
            e[x] = (ln[x] - pr) & 255
        raw += bytes([f]) + e
        prev = ln
    return b"\x89PNG\r\n\x1a\n" + kepala(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + kepala(b"IDAT", zlib.compress(bytes(raw))) + kepala(b"IEND", b"")


def uji():
    import random
    rnd = random.Random(7)
    # 1. pengurai PNG: kelima filter, bolak-balik
    w, h = 13, 10
    px = bytearray(rnd.randrange(256) for _ in range(w * h * 4))
    assert png(_png_buat(w, h, px, [0, 1, 2, 3, 4]))[2] == px, "PNG filter"
    # 2. colormap: nilai tengah pita, pita terbuka atas, nodata dibuang, warna dekat dipetakan ke terdekat
    xml = ('<ColorMapEntry rgb="0,0,160" transparent="true" sourceValue="[-999.9,-999.9]" value="[-999.9,-999.9]" nodata="true" ref="0"/>'
           '<ColorMapEntry rgb="7,7,7" transparent="false" sourceValue="[0,0.1)" value="[0,0.1)" ref="1"/>'
           '<ColorMapEntry rgb="194,194,194" transparent="false" sourceValue="[15.2,15.4)" value="[15.2,15.4)" ref="119"/>'
           '<ColorMapEntry rgb="255,255,255" transparent="false" sourceValue="[38.2,999999.0)" value="[38.2,999999.0)" ref="180"/>')
    cm = colormap(xml)
    assert [round(e[3], 2) for e in cm] == [0.05, 15.3, 38.2], cm
    p = Pemeta(cm)
    assert round(p(193, 193, 193), 1) == 15.3 and p(250, 250, 250) == 38.2 and round(p(9, 9, 9), 2) == 0.05
    # 3. hari pertama: Palu 28 Sep 2018 10.02 UTC; lintasan 01.30 setempat (lon 119,8) = 17.31 UTC hari yang sama
    assert hari_pertama(PALU["waktu"], 119.846) == dt.date(2018, 9, 28)
    assert hari_pertama(dt.datetime(2018, 9, 28, 18, 0, tzinfo=dt.timezone.utc), 119.846) == dt.date(2018, 9, 29)
    assert hari_pertama(dt.datetime(2026, 10, 18, 8, 0, tzinfo=dt.timezone.utc), 120.27) == dt.date(2026, 10, 18)
    # 4. kotak grid: lebar = rentang / LANGKAH, sudut menempel grid
    lon0, lat1, kw, kh = kotak(119.0, -1.0, 120.0, 0.0)
    assert abs((lon0 + 180) / LANGKAH - round((lon0 + 180) / LANGKAH)) < 1e-6 and lon0 <= 119.0 and lat1 >= 0.0 and kw in (223, 224) and kh in (223, 224)
    # 5. inti metode, sintetis: A padam total 3 hari lalu pulih, B tetap terang, C gelap (tak terang di dasar), D berawan pasca
    hd = [f"d{i:02d}" for i in range(20)]
    hp = [f"p{i:02d}" for i in range(6)]
    kec = ["A"] * 8 + ["B"] * 8 + ["C"] * 8 + ["D"] * 8
    nan = math.nan

    def malam_(h):
        out = []
        pasca = h.startswith("p")
        i = int(h[1:])
        for j, k in enumerate(kec):
            dasar = 10.0 + (j % 3)
            if k == "C":
                out.append(0.3)
            elif k == "D":
                out.append(nan if pasca else dasar)
            elif k == "A" and pasca:
                out.append(0.5 if i < 3 else dasar * 0.95)
            else:
                out.append(dasar * (0.97 + 0.06 * rnd.random()))
        return array.array("f", out)
    seri = {h: malam_(h) for h in hd + hp}
    seri["d03"] = array.array("f", [nan] * len(kec))  # malam berawan penuh di masa dasar
    jiwa = {"A": 1000, "B": 2000, "D": 500}
    ringkas, baris = nilai_kejadian(hd, hp, seri, kec, jiwa)
    b = {x["k"]: x for x in baris}
    assert set(b) == {"A", "B", "D"}, b.keys()       # C tak pernah terang -> tak dinilai
    assert b["A"]["pernah_gelap"] and b["A"]["pulih"] == "p03" and b["A"]["status"] == "normal", b["A"]
    assert b["A"]["r"][0] < AMBANG_GELAP and b["A"]["r"][3] >= AMBANG_REDUP
    assert not b["B"]["pernah_gelap"] and b["B"]["status"] == "normal" and b["B"]["pulih"] is None
    assert b["D"]["status"] == "tak_terbaca" and all(v is None for v in b["D"]["r"])
    assert ringkas["pernah_gelap"] == {"kec": 1, "jiwa": 1000} and ringkas["pulih"]["kec"] == 1 and ringkas["pulih_median_hari"] == 3
    assert ringkas["alarm_palsu_dasar"] == 0 and ringkas["hari_dasar_cerah"] == 20
    # 6. kecamatan dengan sedikit piksel cerah malam itu tidak dinilai (MIN_TUTUP / MIN_PIKSEL)
    sebagian = array.array("f", list(seri["p00"]))
    for j in range(8, 12):
        sebagian[j] = nan                              # B: tinggal 4 piksel cerah < MIN_PIKSEL
    dasar = [10.0 + (j % 3) for j in range(len(kec))]
    r = rasio_hari(sebagian, dasar, kec, {"A": 8, "B": 8, "C": 8, "D": 8})
    assert "B" not in r and "A" in r
    # 7. radius gempa
    assert r_gempa(5.5) == 30 and r_gempa(7.5) == 120 and r_gempa(9) == 150
    print("lampu_malam uji: hijau")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else ""
    uji() if a == "uji" else validasi() if a == "validasi" else jalan()
