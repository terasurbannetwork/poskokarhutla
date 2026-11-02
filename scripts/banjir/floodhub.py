"""Pengambil Google Flood Forecasting API (Peta Jalan 3c). Python stdlib saja.

Kunci HANYA dari env GOOGLE_FLOOD_API_KEY, dikirim lewat header X-Goog-Api-Key (tidak masuk URL/log).
Tanpa kunci: keluar 0 dengan log "dilewati".
  tarik     status sungai terbaru ID + flash flood ID + poligon (mentah) -> data/raw/banjir/floodhub/YYYY-MM-DD/HHMM_*.json.gz
            + ringkas publik public/banjir/data/floodhub.json (gagal = berkas publik lama tidak ditimpa)
  riwayat   --dari 2025-08-01 --langkah 1: status per hari (cutoffTime = hari itu 23:59 UTC) -> floodhub/riwayat/YYYY-MM-DD.json.gz, lanjut yang belum ada
  sidik     tulis floodhub.sidik (sha256 PRAREG + fungsi §7 + tabel kab); jalankan hanya sesudah protokol dibekukan
  uji       luring, respons sintetis
Tiap `tarik` juga: ambang titik (gaugeModels:batchGet) + prakiraan debit (gauges:queryGaugeForecasts) untuk titik >= ABOVE_NORMAL
(MENTAH, bertanda belum_terverifikasi), peta titik/poligon ke kab (public/geo/kabupaten), dan unggah SEMUA berkas mentah ke R2
arsip/floodhub/YYYY/MM/DD/<HHMM UTC>_<jenis>.json.gz lewat arsip_pos.r2 (penanda <berkas>.ok; yang gagal diulang run berikut;
tanpa CLOUDFLARE_API_TOKEN/ACCOUNT_ID dilewati). Respons riwayat: <2359>_riwayat.
Format respons serializedPolygons BELUM terverifikasi: disimpan mentah; koordinat dibaca hanya dari blok KML <coordinates>
yang semua simpulnya di Indonesia, selain itu poligon dicatat "tak terurai" dan tidak dipetakan. Protokol uji: PRAREG-FLOODHUB.md.
"""
import datetime as dt, gzip, hashlib, inspect, json, math, os, re, sys, time, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import arsip_pos as A, wilayah as W

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
BASE = "https://floodforecasting.googleapis.com"
ENV = "GOOGLE_FLOOD_API_KEY"
SUMBER = "Google Flood Forecasting API, CC BY 4.0"
URUT = ["EXTREME", "SEVERE", "ABOVE_NORMAL", "NO_FLOODING", "UNKNOWN"]
MIN_NAIK = 2  # indeks URUT: severity >= ABOVE_NORMAL
MAKS_POS = 20000
MAKS_HAL = 50  # pengaman paging
MAKS_BYTE = 50 * 1024 * 1024
MAKS_POLIGON = 200
MAKS_PERISTIWA = 2000
TIMEOUT = 30
TENGGAT_TARIK = 600  # detik, seluruh `tarik`
_tenggat = None
RE_ID = re.compile(r"^[A-Za-z0-9_.:-]{1,64}$")
RE_WAKTU = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$")
TINGKAT = {"EXTREME": "Ekstrem", "SEVERE": "Bahaya", "ABOVE_NORMAL": "Peringatan", "NO_FLOODING": "normal"}
LABEL = "Google Flood Hub, model, akurasi rendah kecuali titik terverifikasi"
BELUM = ["qualityVerified", "gaugeModels (ambang)", "queryGaugeForecasts (prakiraan)", "serializedPolygons (KML)"]
AWAL_PROSPEKTIF = None  # diisi lewat floodhub.sidik (kunci "awal_prospektif"), bukan dengan menyunting kode
JENDELA_PERISTIWA = dt.timedelta(hours=24)  # hanya peristiwa bandang yang terbit <= 24 jam sebelum snapshot yang dihitung
MAKS_ID, MAKS_URL = 500, 8000  # id per panggilan model/prakiraan; URL GET dijaga pendek
MAKS_UNGGAH = 300
MAKS_SIMPUL = 2000  # per cincin
MIN_P0 = 10  # kab-hari teramati minimum sebelum p0 jatuh ke nasional
RE_BERKAS = re.compile(r"^(\d{4})-(\d{2})-(\d{2})/(\d{4})_([a-z]+)\.json\.gz$|^riwayat/(\d{4})-(\d{2})-(\d{2})\.json\.gz$")
TREND = {"RISE", "FALL", "NO_CHANGE", "FORECAST_TREND_UNSPECIFIED"}


class Galat(Exception):
    pass


class _Lurus(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).hostname != urllib.parse.urlsplit(BASE).hostname:
            raise Galat(f"redirect ke host lain ditolak {urllib.parse.urlsplit(newurl).hostname!r:.80}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _baca(f):
    b = f.read(MAKS_BYTE + 1)
    if len(b) > MAKS_BYTE:
        raise Galat(f"respons lebih dari {MAKS_BYTE} byte")
    return b


def _http(metode, url, kunci, body):
    if _tenggat is not None and time.monotonic() > _tenggat:
        raise Galat("tenggat total terlampaui")
    r = urllib.request.Request(url, method=metode, headers={"X-Goog-Api-Key": kunci, "Content-Type": "application/json"},
                               data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.build_opener(_Lurus).open(r, timeout=TIMEOUT) as f:
            return json.loads(_baca(f))
    except Galat:
        raise
    except urllib.error.HTTPError as e:
        raise Galat(f"HTTP {e.code} {metode} {url.split('?')[0]}")
    except (urllib.error.URLError, OSError, ValueError) as e:
        raise Galat(f"{type(e).__name__} {metode} {url.split('?')[0]}")


def panggil(metode, path, kunci, body=None, params=None):
    return _http(metode, BASE + path + ("?" + urllib.parse.urlencode(params) if params else ""), kunci, body)


def halaman(path, kunci, body, kolom):
    """Paging penuh; kembalikan daftar `kolom` dari semua halaman."""
    out, tok = [], None
    for _ in range(MAKS_HAL):
        b = dict(body, **({"pageToken": tok} if tok else {}))
        d = panggil("POST", path, kunci, b)
        out += d.get(kolom) or []
        tok = d.get("nextPageToken")
        if not tok:
            return out
    raise Galat(f"paging {path} melebihi {MAKS_HAL} halaman")


def status_sungai(kunci, cutoff=None):
    b = {"regionCode": "ID", "pageSize": MAKS_POS}
    if cutoff:
        b["cutoffTime"] = cutoff
    return halaman("/v1/floodStatus:searchLatestFloodStatusByArea", kunci, b, "floodStatuses")


def flash(kunci):
    return halaman("/v1/flashFloods:search", kunci, {"countryCodes": ["ID"], "pageSize": 10000}, "flashFloodEvents")


def simpan_gz(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)


def sev(s):
    v = s.get("severity")
    return v if v in URUT else "UNKNOWN"


def koordinat(s):
    g = s.get("gaugeLocation") or {}
    lat = g.get("latitude", g.get("lat"))
    lon = g.get("longitude", g.get("lng", g.get("lon")))
    return (lat, lon) if isinstance(lat, (int, float)) and isinstance(lon, (int, float)) else (None, None)


def _waktu(v):
    return v if isinstance(v, str) and len(v) <= 40 and RE_WAKTU.match(v) else None


def _num(v, lo, hi):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and lo <= v <= hi else None


def potong(ids):
    """Kelompokkan id: maks MAKS_ID per panggilan dan URL <= MAKS_URL."""
    out, cur, n = [], [], 0
    for i in ids:
        if cur and (len(cur) >= MAKS_ID or n + len(i) + 30 > MAKS_URL):
            out.append(cur)
            cur, n = [], 0
        cur.append(i)
        n += len(i) + 30
    return out + ([cur] if cur else [])


class Kab:
    """Titik -> 'pp|Nama kab' dari poligon kabupaten (helper wilayah._cincin/_di_dalam). fitur: [(kunci, geometry)]."""
    SEL = 0.5

    def __init__(self, fitur):
        self.ix = {}
        for kunci, g in fitur:
            for r in W._cincin(g):
                xs, ys = [c[0] for c in r], [c[1] for c in r]
                kt = (min(xs), min(ys), max(xs), max(ys))
                for gx in range(math.floor(kt[0] / self.SEL), math.floor(kt[2] / self.SEL) + 1):
                    for gy in range(math.floor(kt[1] / self.SEL), math.floor(kt[3] / self.SEL) + 1):
                        self.ix.setdefault((gx, gy), []).append((kt, r, kunci))

    @classmethod
    def repo(cls, akar=AKAR):
        def it():
            for kode in W.PROVINSI:
                f = os.path.join(akar, "public/geo/kabupaten", f"{kode}.json")
                if os.path.exists(f):
                    with open(f) as fh:
                        fitur = json.load(fh)["features"]
                    for ft in fitur:
                        yield f"{kode}|{ft['properties']['kab']}", ft["geometry"]
        return cls(it())

    def cari(self, lon, lat):
        for kt, r, kunci in self.ix.get((math.floor(lon / self.SEL), math.floor(lat / self.SEL)), ()):
            if kt[0] <= lon <= kt[2] and kt[1] <= lat <= kt[3] and W._di_dalam(lon, lat, r):
                return kunci
        return None


def _teks(v, d=0):
    if isinstance(v, str):
        yield v
    elif d < 6 and isinstance(v, dict):
        for x in v.values():
            yield from _teks(x, d + 1)
    elif d < 6 and isinstance(v, list):
        for x in v:
            yield from _teks(x, d + 1)


def cincin_kml(mentah):
    """Respons serializedPolygons MENTAH -> [cincin [(lon,lat)...]]; [] bila bukan KML <coordinates>, ada simpul di luar Indonesia
    atau lebih dari MAKS_SIMPUL simpul. Pencarian tag dengan str.find berurutan (tanpa regex)."""
    out = []
    for t in _teks(mentah):
        t, i = t[:2_000_000], 0
        while True:
            a = t.find("<coordinates>", i)
            if a < 0:
                break
            b = t.find("</coordinates>", a)
            if b < 0:
                return []
            i = b + 14
            try:
                c = []
                for tok in t[a + 13:b].split():
                    xy = tok.split(",")
                    if len(xy) not in (2, 3):  # lon,lat atau lon,lat,alt (KML); selain itu cincin ditolak
                        return []
                    c.append((float(xy[0]), float(xy[1])))
            except ValueError:
                return []
            if len(c) < 3 or len(c) > MAKS_SIMPUL or not all(-12 <= la <= 8 and 94 <= lo <= 142 for lo, la in c):
                return []
            out.append(c)
    return out[:50]


def _cek_tenggat():
    if _tenggat is not None and time.monotonic() > _tenggat:
        raise Galat("tenggat total terlampaui")


def kab_poligon(kab, cincins):
    """Kab yang disentuh poligon: kab dari simpul + kisi titik dalam poligon (langkah >= 0,02 derajat, maks ~2.600 titik per cincin).
    Sentuhan tepi tanpa simpul/kisi tidak tertangkap (under-report)."""
    hit = set()
    for r in cincins:
        _cek_tenggat()
        for lo, la in r:
            hit.add(kab.cari(lo, la))
        xs, ys = [c[0] for c in r], [c[1] for c in r]
        st = max(0.02, max(max(xs) - min(xs), max(ys) - min(ys)) / 50)
        x = min(xs) + st / 2
        while x < max(xs):
            y = min(ys) + st / 2
            _cek_tenggat()
            while y < max(ys):
                if W._di_dalam(x, y, r):
                    hit.add(kab.cari(x, y))
                y += st
            x += st
    hit.discard(None)
    return hit


def terverifikasi(statuses, model_resp):
    """id titik bertanda qualityVerified == True di status atau di respons gaugeModels (nama field BELUM terverifikasi)."""
    t = {s["gaugeId"] for s in statuses if isinstance(s.get("gaugeId"), str) and s.get("qualityVerified") is True}
    for r in model_resp:
        for m in (r.get("gaugeModels") or []) if isinstance(r, dict) else []:
            if isinstance(m, dict) and m.get("qualityVerified") is True:
                i = m.get("gaugeId") or str(m.get("name", "")).rsplit("/", 1)[-1]
                if isinstance(i, str):
                    t.add(i)
    return t


def agregasi(statuses, kab, terv, bandang):
    """Per kab: sungai {tingkat = MAKS severity titik di kab, titik, terverifikasi, tingkat_terverifikasi} dan bandang (bool).
    UNKNOWN dan titik tanpa koordinat sah/di luar kab tidak dihitung."""
    out = {}
    for s in statuses[:MAKS_POS]:
        k, i = sev(s), s.get("gaugeId")
        lat, lon = koordinat(s)
        lat, lon = _num(lat, -12, 8), _num(lon, 94, 142)
        if k == "UNKNOWN" or lat is None or lon is None or not (isinstance(i, str) and RE_ID.match(i)):
            continue
        kk = kab.cari(lon, lat)
        if kk is None:
            continue
        e = out.setdefault(kk, {"_r": 9, "_rv": 9, "titik": 0, "terverifikasi": 0})
        e["titik"] += 1
        e["_r"] = min(e["_r"], URUT.index(k))
        if i in terv:
            e["terverifikasi"] += 1
            e["_rv"] = min(e["_rv"], URUT.index(k))
    res = {}
    for kk in sorted(set(out) | set(bandang)):
        e = out.get(kk)
        res[kk] = {"sungai": None if e is None else {"tingkat": TINGKAT[URUT[e["_r"]]], "titik": e["titik"], "terverifikasi": e["terverifikasi"],
                                                     "tingkat_terverifikasi": TINGKAT[URUT[e["_rv"]]] if e["_rv"] < 9 else None},
                   "bandang": kk in bandang}
    return res


def _dt(w):
    """Waktu ISO dengan Z/offset -> datetime; pecahan detik dipotong atau diisi ke 6 digit (fromisoformat Python 3.9 menuntut 3 atau 6)."""
    w = w.replace("Z", "+00:00")
    return dt.datetime.fromisoformat(re.sub(r"\.(\d+)", lambda m: "." + m.group(1)[:6].ljust(6, "0"), w, count=1))


def peristiwa_sah(flashes, kini):
    """Peristiwa bandang yang dihitung: forecastIssueTime terbaca dan dalam 24 jam sebelum snapshot `kini` (tidak di masa depan)."""
    out = []
    for f in flashes:
        w = _waktu(f.get("forecastIssueTime")) if isinstance(f, dict) else None
        if w and kini - JENDELA_PERISTIWA <= _dt(w) <= kini:
            out.append(f)
    return out


def p0(baris, kab, d):
    """Klimatologi p0(kab, d): frekuensi y=1 (jendela d..d+2) kab-hari pada bulan kalender yang sama di tahun < tahun d;
    nasional (semua kab) bila kab itu < MIN_P0 kab-hari teramati. baris: iterable (kab, tanggal dt.date, y 0/1). None bila tak ada baris."""
    pool = [(k, y) for k, t, y in baris if t.month == d.month and t.year < d.year]
    own = [y for k, y in pool if k == kab]
    if len(own) >= MIN_P0:
        return sum(own) / len(own)
    return sum(y for _, y in pool) / len(pool) if pool else None


def _snapshots(akar):
    """[(waktu mulai UTC, 'YYYY-MM-DD', 'HHMM', lengkap bool)] semua snapshot `tarik` dengan berkas status; lengkap = flash dan poligon juga ada."""
    dasar, out = os.path.join(akar, "data/raw/banjir/floodhub"), []
    for tg in sorted(os.listdir(dasar)) if os.path.isdir(dasar) else []:
        if re.match(r"^\d{4}-\d{2}-\d{2}$", tg):
            for f in os.listdir(os.path.join(dasar, tg)):
                m = re.match(r"^(\d{4})_status\.json\.gz$", f)
                if m:
                    w = dt.datetime.strptime(tg + m.group(1), "%Y-%m-%d%H%M").replace(tzinfo=dt.timezone.utc)
                    out.append((w, tg, m.group(1), all(os.path.exists(os.path.join(dasar, tg, f"{m.group(1)}_{j}.json.gz")) for j in ("flash", "poligon"))))
    return sorted(out)


def pilih_snapshot(akar, d):
    """Sinyal hari d (WIB): snapshot `tarik` TERBESAR dengan waktu mulai dalam (batas-24 jam, batas], batas = d-1 17:00 UTC (= d 00:00 WIB).
    Harus lengkap (status+flash+poligon); tidak ada fallback ke yang lebih tua. -> (tanggal, 'HHMM') atau None (hari bolong).
    Berkas sesudah batas dan riwayat tidak pernah dihitung."""
    batas = dt.datetime(d.year, d.month, d.day, tzinfo=dt.timezone.utc) - dt.timedelta(hours=7)
    dlm = [x for x in _snapshots(akar) if batas - dt.timedelta(hours=24) < x[0] <= batas]
    return (dlm[-1][1], dlm[-1][2]) if dlm and dlm[-1][3] else None


def awal_prospektif(sidik=None):
    """Hari WIB pertama periode prospektif: dari floodhub.sidik (ditulis `sidik` = tanggal sidik + 1), BUKAN dari pemindaian cache;
    AWAL_PROSPEKTIF (None) bila sidik belum ada."""
    sidik = sidik or SIDIK
    if os.path.exists(sidik):
        with open(sidik) as f:
            v = json.load(f).get("awal_prospektif")
        return dt.date.fromisoformat(v) if v else AWAL_PROSPEKTIF
    return AWAL_PROSPEKTIF


def petakan_bandang(sah, poli, kab):
    """Peristiwa sah + poligon mentah -> (kab bandang set, catatan, gagal_tenggat bool, n_poligon, n_terurai). Galat tenggat tidak melempar."""
    bandang, catatan, n, ok = set(), [], 0, 0
    try:
        for f in sah:
            for k in ("likelyAffectedPolygonId", "highlyLikelyAffectedPolygonId"):
                i = f.get(k)
                if i in poli:
                    n += 1
                    c = cincin_kml(poli[i])
                    if c:
                        ok += 1
                        bandang |= kab_poligon(kab, c)
                    else:
                        catatan.append(f"poligon #{n} tak terurai, tidak dipetakan ke kab")
    except Galat as e:
        catatan.append(f"pemetaan poligon dihentikan ({e}): B hari ini tidak terhitung")
        return bandang, catatan, True, n, ok
    return bandang, catatan, False, n, ok


def sinyal_snapshot(akar, tg, hm, kab):
    """Baca berkas mentah satu snapshot -> {"S": {kab: 0..3}, "B": set kab, "B_sah": bool, "n_poligon", "n_terurai"} dengan kode yang sama
    dengan `tarik`. S: 0 normal/tanpa titik, 1 Peringatan, 2 Bahaya, 3 Ekstrem."""
    d = os.path.join(akar, "data/raw/banjir/floodhub", tg)
    def g(j):
        with gzip.open(f"{d}/{hm}_{j}.json.gz", "rt") as f:
            return json.load(f)
    st, ff, poli = g("status"), g("flash"), g("poligon")
    kini = dt.datetime.strptime(tg + hm, "%Y-%m-%d%H%M").replace(tzinfo=dt.timezone.utc)
    rank = {"normal": 0, "Peringatan": 1, "Bahaya": 2, "Ekstrem": 3}
    S = {k: rank[v["sungai"]["tingkat"]] for k, v in agregasi(st, kab, set(), set()).items() if v["sungai"]}
    gagal = poli.pop("_gagal", []) if isinstance(poli, dict) else []
    B, _, tenggat, n, ok = petakan_bandang(peristiwa_sah(ff, kini), poli, kab)
    return {"S": S, "B": B, "B_sah": not gagal and not tenggat, "n_poligon": n, "n_terurai": ok}


def ringkas(statuses, flashes, kini, kab=None, terv=(), bandang=(), catatan=(), bandang_sah=True):
    jml = {k: 0 for k in URUT}
    pos = []
    for s in statuses[:MAKS_POS]:
        k = sev(s)
        jml[k] += 1
        if URUT.index(k) <= MIN_NAIK:
            i = s.get("gaugeId")
            if not (isinstance(i, str) and RE_ID.match(i)):
                continue
            lat, lon = koordinat(s)
            lat, lon = _num(lat, -12, 8), _num(lon, 94, 142)
            if lat is None or lon is None:
                continue
            t, src = s.get("forecastTrend"), s.get("source")
            pos.append({"id": i, "lat": lat, "lon": lon, "severity": k, "trend": t if t in TREND else None,
                        "issuedTime": _waktu(s.get("issuedTime")),
                        "source": re.sub(r"[^A-Za-z0-9 ._()-]", "", src)[:40] if isinstance(src, str) else None})
    pos.sort(key=lambda p: (URUT.index(p["severity"]), str(p["id"])))
    wib = kini + dt.timedelta(hours=7)
    return {"dibuat": kini.strftime("%Y-%m-%dT%H:%M:%SZ"), "terbit_wib": wib.strftime("%Y-%m-%d %H:%M"), "sumber": SUMBER, "label": LABEL,
            "belum_terverifikasi": BELUM, "catatan": list(catatan), "bandang_sah": bandang_sah,
            "kab": agregasi(statuses, kab, set(terv), set(bandang)) if kab else {},
            "jumlah_pos": len(statuses[:MAKS_POS]),
            "per_severity": jml, "pos_siaga": pos,
            "flash_flood": {"jumlah": len(flashes),
                            "peristiwa": [{"terbit": _waktu(f.get("forecastIssueTime")),
                                           "periode_jam": f["forecastPeriodHours"] if isinstance(f.get("forecastPeriodHours"), int)
                                           and not isinstance(f.get("forecastPeriodHours"), bool) else None}
                                          for f in flashes[:MAKS_PERISTIWA] if isinstance(f, dict)]}}


def tarik(kunci, akar=AKAR, kini=None, kab=None):
    global _tenggat
    _tenggat = time.monotonic() + TENGGAT_TARIK
    kini = kini or dt.datetime.now(dt.timezone.utc)
    d = os.path.join(akar, "data/raw/banjir/floodhub", kini.strftime("%Y-%m-%d"))
    h = kini.strftime("%H%M")
    st = status_sungai(kunci)
    ff = flash(kunci)
    poli, gagal, sah = {}, [], peristiwa_sah(ff, kini)
    for f in sah:  # hanya peristiwa <= 24 jam; eventPolygonId TIDAK diunduh (arti belum terverifikasi)
        for k in ("likelyAffectedPolygonId", "highlyLikelyAffectedPolygonId"):
            i = f.get(k)
            if not isinstance(i, str) or not i or len(i) > 200 or i.startswith("_"):
                if i:
                    gagal.append(str(i)[:200])
                    print("peringatan: id poligon ditolak")
                continue
            if i in poli or i in gagal:
                continue
            if len(poli) >= MAKS_POLIGON:  # terpotong kuota
                gagal.append(i)
                continue
            try:
                poli[i] = panggil("GET", "/v1/serializedPolygons/" + urllib.parse.quote(i, safe=""), kunci)
            except Galat as e:
                gagal.append(i)
                print(f"peringatan: satu poligon gagal ({e})")
    siaga = sorted({s["gaugeId"] for s in st if URUT.index(sev(s)) <= MIN_NAIK and isinstance(s.get("gaugeId"), str) and RE_ID.match(s["gaugeId"])})
    mod, pra = [], []
    for g in potong(siaga):  # MENTAH; gagal = peringatan, status/flash tetap diarsipkan
        for hasil, path, nama in ((mod, "/v1/gaugeModels:batchGet", "names"), (pra, "/v1/gauges:queryGaugeForecasts", "gaugeIds")):
            try:
                hasil.append(panggil("GET", path, kunci, params=[(nama, ("gaugeModels/" if nama == "names" else "") + i) for i in g]))
            except Galat as e:
                print(f"peringatan: {path} gagal ({e})")
    kab = kab or Kab.repo(akar)
    bandang, catatan, tenggat, _, _ = petakan_bandang(sah, poli, kab)
    if tenggat:
        gagal.append("tenggat")
    if gagal:
        catatan.insert(0, f"{len(gagal)} poligon gagal diunduh, terpotong, atau dipetakan: B hari ini tidak terhitung")
    simpan_gz(f"{d}/{h}_status.json.gz", st)
    simpan_gz(f"{d}/{h}_flash.json.gz", ff)
    simpan_gz(f"{d}/{h}_poligon.json.gz", dict(poli, _gagal=gagal) if gagal else poli)
    simpan_gz(f"{d}/{h}_ambang.json.gz", {"belum_terverifikasi": True, "titik": len(siaga), "respons": mod})
    simpan_gz(f"{d}/{h}_prakiraan.json.gz", {"belum_terverifikasi": True, "titik": len(siaga), "respons": pra})
    r = ringkas(st, ff, kini, kab, terverifikasi(st, mod), bandang, catatan, not gagal)
    p = os.path.join(akar, "public/banjir/data/floodhub.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, indent=1)
    os.replace(p + ".tmp", p)
    print(f"floodhub: {r['jumlah_pos']} pos, {len(r['pos_siaga'])} >= ABOVE_NORMAL, {len(ff)} flash flood, {len(poli)} poligon, {len(r['kab'])} kab")
    unggah(akar)
    return r


def riwayat(kunci, dari, langkah, akar=AKAR, hingga=None):
    hingga = hingga or dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=1)
    batas = (awal_prospektif() or dt.datetime.now(dt.timezone.utc).date()) - dt.timedelta(days=1)
    if hingga > batas:  # arsip riwayat tidak pernah mengisi hari prospektif (>= awal_prospektif dari floodhub.sidik)
        print(f"riwayat: dipotong sampai {batas} (hari sesudahnya milik snapshot tarik)")
        hingga = batas
    t, n = dari, 0
    while t <= hingga:
        p = os.path.join(akar, "data/raw/banjir/floodhub/riwayat", t.isoformat() + ".json.gz")
        if not os.path.exists(p):
            simpan_gz(p, status_sungai(kunci, t.isoformat() + "T23:59:00Z"))
            n += 1
            print("riwayat", t)
        t += dt.timedelta(days=langkah)
    print(f"riwayat: {n} hari baru")
    unggah(akar)


_r2 = A.r2


def kunci_arsip(rel):
    """Jalur relatif dari floodhub/ -> kunci R2 arsip/floodhub/YYYY/MM/DD/<HHMM UTC>_<jenis>.json.gz; None bila bukan berkas arsip."""
    m = RE_BERKAS.match(rel)
    if not m:
        return None
    g = m.groups()
    y, mo, d, hm, jenis = (g[0], g[1], g[2], g[3], g[4]) if g[0] else (g[5], g[6], g[7], "2359", "riwayat")
    return f"arsip/floodhub/{y}/{mo}/{d}/{hm}_{jenis}.json.gz"


_SUKSES = type("R", (), {"returncode": 0, "stderr": ""})()


def _ada_r2(k, tmp):
    """Objek R2 ada? -> "sama" / "beda" (sudah ada; isi dibandingkan dengan sha256 berkas lokal `tmp[:-3]`), atau None bila tidak ada.
    Galat lain (jaringan, izin) = RuntimeError. Sederhana dan jujur: unduh lalu bandingkan, wrangler tak punya `head`."""
    r = _r2("get", f"{A.BUCKET}/{k}", "--file", tmp)
    try:
        if r.returncode == 0:
            with open(tmp, "rb") as f1, open(tmp[:-3], "rb") as f2:
                return "sama" if _sha(f1.read()) == _sha(f2.read()) else "beda"
        if A.tidak_ada(r):
            return None
        raise RuntimeError("r2 get gagal: " + A.bersih(r.stderr[-200:]))
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def unggah(akar=AKAR):
    """Unggah tiap *.json.gz tanpa penanda .ok ke R2; sukses = tulis <berkas>.ok. Tidak pernah melempar (arsip gagal != tarik gagal)."""
    os.environ.pop(ENV, None)  # subprocess r2 tidak mewarisi kunci Google
    if not (os.environ.get("CLOUDFLARE_API_TOKEN") and os.environ.get("CLOUDFLARE_ACCOUNT_ID")):
        print("arsip floodhub: kredensial Cloudflare tidak ada, unggah dilewati")
        return 0
    dasar, n, gagal = os.path.join(akar, "data/raw/banjir/floodhub"), 0, 0
    for dp, _, fs in sorted(os.walk(dasar)):
        for f in sorted(fs):
            p = os.path.join(dp, f)
            k = kunci_arsip(os.path.relpath(p, dasar).replace(os.sep, "/"))
            if k is None or os.path.exists(p + ".ok"):
                continue
            if n >= MAKS_UNGGAH or gagal >= 3:
                print(f"arsip floodhub: berhenti ({n} terunggah, {gagal} gagal beruntun); sisanya run berikut")
                return n
            try:
                ada = _ada_r2(k, p + ".r2")  # JANGAN menimpa objek yang sudah ada: arsip prospektif harus tak berubah sejak unggah pertama
                if ada is None:
                    r = _r2("put", f"{A.BUCKET}/{k}", "--file", p, "--content-type", "application/gzip")
                else:
                    r = _SUKSES
                    if ada == "beda":
                        print(f"::warning title=Arsip Flood Hub beda::objek R2 {k} sudah ada dengan isi BEDA; tidak ditimpa, periksa sebelum buka")
            except Exception as e:
                r = None
                print(f"peringatan: arsip {k} gagal ({type(e).__name__})")
            if r is not None and r.returncode == 0:
                open(p + ".ok", "w").close()
                n += 1
                gagal = 0
            else:
                gagal += 1
                if r is not None:
                    print("peringatan: arsip", k, "gagal:", A.bersih(r.stderr[-300:]))
    print(f"arsip floodhub: {n} berkas terunggah")
    return n


SIDIK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "floodhub.sidik")
PRAREG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "PRAREG-FLOODHUB.md")
SIDIK_FUNGSI = ["tarik", "riwayat", "unggah", "p0", "pilih_snapshot", "awal_prospektif", "_snapshots", "peristiwa_sah", "_dt", "petakan_bandang",
                "sinyal_snapshot", "agregasi", "Kab", "cincin_kml", "kab_poligon", "terverifikasi", "kunci_arsip", "sev", "koordinat",
                "_waktu", "_num", "_teks", "status_sungai", "flash", "halaman", "potong"]
SIDIK_KONSTAN = ["URUT", "MIN_NAIK", "TINGKAT", "MIN_P0", "MAKS_SIMPUL", "JENDELA_PERISTIWA", "MAKS_POLIGON", "RE_ID", "RE_WAKTU", "MAKS_POS",
                 "MAKS_HAL", "TENGGAT_TARIK", "MAKS_ID", "MAKS_URL"]
# sumber tabel kode kemendagri -> 'pp|Nama' (dasar.kab membaca scripts/udara/kota.json), pencocokan DIBI (peristiwa), dan penilai
SIDIK_BERKAS = ["scripts/banjir/wilayah.py", "scripts/prediksi/aturan.json", "scripts/prediksi/dasar.py", "scripts/udara/kota.json",
                "scripts/banjir/model_kab.py", "scripts/banjir/uji_balik.py", "scripts/banjir/floodhub_nilai.py"]
ARSIP_PREDIKSI = "public/prediksi/data/arsip"


def _sha(b):
    return hashlib.sha256(b).hexdigest()


def _baris_arsip(p):
    with open(p, encoding="utf-8") as f:
        return [b for b in f.read().splitlines() if b.strip()]


def arsip_prefiks(akar=AKAR):
    """Arsip /prediksi append-only: tiap berkas bulanan -> {baris, sha256 seluruh baris saat ini}. Sidik mengunci PREFIKS ini."""
    d = os.path.join(akar, ARSIP_PREDIKSI)
    return {f: {"baris": len(b), "sha": _sha("\n".join(b).encode())}
            for f in sorted(os.listdir(d)) if f.endswith(".jsonl") for b in [_baris_arsip(os.path.join(d, f))]}


def arsip_beda(akar, lama):
    """Prefiks arsip /prediksi yang terkunci di sidik berubah/menyusut? -> daftar 'arsip_prediksi/<berkas>'."""
    d, beda = os.path.join(akar, ARSIP_PREDIKSI), []
    for f, v in lama.items():
        p = os.path.join(d, f)
        b = _baris_arsip(p) if os.path.exists(p) else []
        if len(b) < v["baris"] or _sha("\n".join(b[:v["baris"]]).encode()) != v["sha"]:
            beda.append("arsip_prediksi/" + f)
    return beda


def hitung_sidik(akar=AKAR, prareg=PRAREG):
    """sha256 PRAREG, sumber fungsi/konstanta PRAREG §7, berkas SIDIK_BERKAS (galat bila hilang), tabel kab, dan prefiks arsip /prediksi.
    Tidak menulis apa pun."""
    g = globals()
    kab = {}
    d = os.path.join(akar, "public/geo/kabupaten")
    for f in sorted(os.listdir(d)):
        with open(os.path.join(d, f), "rb") as fh:
            kab[f] = _sha(fh.read())
    ext = {}
    for p in SIDIK_BERKAS:
        with open(os.path.join(akar, p), "rb") as fh:  # FileNotFoundError bila hilang: sidik tidak boleh diam-diam bolong
            ext[p] = _sha(fh.read())
    with open(prareg, "rb") as fh:
        pr = _sha(fh.read())
    return {"prareg": pr, "fungsi": {n: _sha(inspect.getsource(g[n]).encode()) for n in SIDIK_FUNGSI},
            "konstanta": {n: _sha(repr(g[n]).encode()) for n in SIDIK_KONSTAN}, "berkas": ext, "tabel_kab": kab, "arsip_prediksi": arsip_prefiks(akar)}


def periksa_sidik(akar=AKAR, sidik_path=None, prareg=PRAREG):
    """Bandingkan keadaan sekarang dengan floodhub.sidik -> daftar beda (kosong = utuh). Arsip /prediksi diperiksa sebagai PREFIKS."""
    sidik_path = sidik_path or SIDIK
    with open(sidik_path) as f:
        lama = json.load(f)
    baru, beda = hitung_sidik(akar, prareg), []
    for k in ("prareg", "fungsi", "konstanta", "berkas", "tabel_kab"):
        if lama.get(k) != baru[k]:
            beda.append(k)
    return beda + arsip_beda(akar, lama.get("arsip_prediksi", {}))


def sidik():
    """Tulis floodhub.sidik (sekali). Jalankan HANYA sesudah uji asap `tarik` dan pemilik membekukan protokol. Mengisi awal_prospektif =
    tanggal sidik (WIB) + 1 hari: hari prospektif pertama = hari WIB sesudah commit sidik."""
    if os.path.exists(SIDIK):
        sys.exit("floodhub.sidik sudah ada: protokol sudah dibekukan, tidak ditimpa")
    h = hitung_sidik()
    hari = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=7)).date()
    h["tanggal_sidik"], h["awal_prospektif"] = hari.isoformat(), (hari + dt.timedelta(days=1)).isoformat()
    with open(SIDIK, "w", encoding="utf-8") as f:
        json.dump(h, f, ensure_ascii=False, indent=1, sort_keys=True)
    print("sidik ditulis", SIDIK, "awal prospektif", h["awal_prospektif"])


def uji():
    import io, contextlib, tempfile
    rahasia = "RAHASIA-KUNCI-123"
    st = [{"gaugeId": "hybas_1", "severity": "SEVERE", "forecastTrend": "RISE", "issuedTime": "2026-11-01T00:00:00Z",
           "source": "x", "gaugeLocation": {"latitude": -6.2, "longitude": 106.8}},
          {"gaugeId": "hybas_2", "severity": "EXTREME", "gaugeLocation": {"lat": -7.0, "lng": 110.0}},
          {"gaugeId": "hybas_3", "severity": "NO_FLOODING"}, {"gaugeId": "hybas_4", "severity": "UNKNOWN"},
          {"gaugeId": "hybas_5"}, {"gaugeId": "hybas_6", "severity": "ABOVE_NORMAL"}]
    st += [{"gaugeId": "../x", "severity": "SEVERE", "gaugeLocation": {"latitude": 0, "longitude": 100}},
           {"gaugeId": "<script>", "severity": "SEVERE", "gaugeLocation": {"latitude": 0, "longitude": 100}},
           {"gaugeId": "luar", "severity": "SEVERE", "gaugeLocation": {"latitude": 50, "longitude": 100}},
           {"gaugeId": "kotor", "severity": "SEVERE", "forecastTrend": "<b>", "source": "<i>ok</i>" + "x" * 80,
            "issuedTime": "<script>", "gaugeLocation": {"latitude": 0, "longitude": 100}}]
    # kab A (31|A): hybas_1 SEVERE, hybas_7 ABOVE_NORMAL terverifikasi (lewat model), hybas_8 normal; kab B (32|B): hybas_2 EXTREME
    st += [{"gaugeId": "hybas_7", "severity": "ABOVE_NORMAL", "gaugeLocation": {"latitude": -6.5, "longitude": 106.5}},
           {"gaugeId": "hybas_8", "severity": "NO_FLOODING", "gaugeLocation": {"latitude": -6.4, "longitude": 106.4}}]
    sq = lambda x0, y0, x1, y1: {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}
    kab = Kab([("31|A", sq(106, -7, 107, -6)), ("32|B", sq(109.5, -7.5, 110.5, -6.5))])
    kml = lambda *c: {"kml": "<Polygon><coordinates>" + " ".join(f"{x},{y},0" for x, y in c) + "</coordinates></Polygon>"}
    ff = [{"forecastIssueTime": "2026-11-01T00:00:00Z", "forecastPeriodHours": 24, "likelyAffectedPolygonId": "p/1"}, {},
          {"forecastIssueTime": "x", "forecastPeriodHours": "24", "eventPolygonId": "A" * 201},
          {"forecastIssueTime": "2026-11-01T01:00:00Z", "highlyLikelyAffectedPolygonId": "p/2", "eventPolygonId": "p/3"},
          {"forecastIssueTime": "2026-10-30T00:00:00Z", "likelyAffectedPolygonId": "p/old"}]  # p/old > 24 jam: tak dihitung, tak diunduh
    poli_palsu = {"p/2": kml((109.6, -7.4), (110.4, -7.4), (110.4, -6.6), (109.6, -6.6), (109.6, -7.4)),  # di dalam B
                  "p/3": kml((106.2, -6.8), (106.8, -6.8), (106.8, -6.2), (106.2, -6.2), (106.2, -6.8))}  # di dalam A, tapi eventPolygon
    log, put, tersimpan = [], [], {}
    global _http, _r2, SIDIK
    sidik0, ok_r2 = SIDIK, [False]

    class R:
        def __init__(s, c, e=""): s.returncode, s.stderr, s.stdout = c, e, ""

    def r2_palsu(*a):
        assert rahasia not in " ".join(a) and ENV not in os.environ, "env yang diteruskan ke r2 memuat kunci Google"
        put.append(a)
        if not ok_r2[0]:
            return R(1, "boom")
        k_ = a[1].split("/", 1)[1]
        if a[0] == "get":  # tiruan R2: objek ada -> tulis ke --file; tak ada -> galat 10007
            if k_ not in tersimpan:
                return R(1, "The specified key does not exist. [code: 10007]")
            open(a[3], "wb").write(tersimpan[k_])
            return R(0)
        assert a[0] == "put"
        tersimpan[k_] = open(a[3], "rb").read()
        return R(0)

    def palsu(metode, url, kunci, body):
        log.append(url)
        assert kunci == rahasia and rahasia not in url
        if "floodStatus" in url:
            return {"floodStatuses": st[:3], "nextPageToken": "t2"} if "pageToken" not in (body or {}) else {"floodStatuses": st[3:]}
        if "flashFloods" in url:
            return {"flashFloodEvents": ff}
        if "serializedPolygons" in url:
            return poli_palsu.get(urllib.parse.unquote(url.rsplit("/", 1)[-1]), {"mentah": "apa adanya"})
        if "gaugeModels" in url:
            return {"gaugeModels": [{"name": "gaugeModels/hybas_7", "qualityVerified": True}, {"gaugeId": "hybas_1", "qualityVerified": False}]}
        if "queryGaugeForecasts" in url:
            return {"forecasts": {}}
        raise Galat("tak dikenal")
    asli, _http, asli_r2, _r2 = _http, palsu, _r2, r2_palsu
    env0 = {k: os.environ.pop(k, None) for k in ("CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", ENV)}
    keluar = io.StringIO()
    try:
        with contextlib.redirect_stdout(keluar):
            a = tempfile.mkdtemp()
            kini = dt.datetime(2026, 11, 1, 3, 5, tzinfo=dt.timezone.utc)
            r = tarik(rahasia, a, kini, kab)
            assert not put, "tanpa kredensial Cloudflare: tidak ada unggah"
        assert "dilewati" in keluar.getvalue()
        assert r["jumlah_pos"] == 12 and r["per_severity"] == {"EXTREME": 1, "SEVERE": 5, "ABOVE_NORMAL": 2, "NO_FLOODING": 2, "UNKNOWN": 2}, r
        ids = [p["id"] for p in r["pos_siaga"]]
        assert ids == ["hybas_2", "hybas_1", "kotor", "hybas_7"], ids
        k = [p for p in r["pos_siaga"] if p["id"] == "kotor"][0]
        assert k["trend"] is None and k["issuedTime"] is None and k["source"] == re.sub(r"[^A-Za-z0-9 ._()-]", "", "<i>ok</i>" + "x" * 80)[:40], k
        assert r["pos_siaga"][0]["lat"] == -7.0 and r["pos_siaga"][0]["lon"] == 110.0
        assert "hybas_6" not in ids, "tanpa koordinat dibuang"
        assert r["flash_flood"]["jumlah"] == 5 and r["flash_flood"]["peristiwa"][1] == {"terbit": None, "periode_jam": None} and r["flash_flood"]["peristiwa"][0]["periode_jam"] == 24
        g = json.load(gzip.open(f"{a}/data/raw/banjir/floodhub/2026-11-01/0305_poligon.json.gz", "rt"))
        assert g["p/1"] == {"mentah": "apa adanya"} and set(g) == {"p/1", "p/2"}, set(g)  # K8: eventPolygonId (p/3) dan peristiwa > 24 jam (p/old) tak diunduh
        assert not any("p%2F3" in u or "p%2Fold" in u for u in log)
        assert not any("AAAA" in u for u in log), "id poligon kepanjangan tak dipanggil"
        # peta ke kab + agregasi MAKS + pemisahan terverifikasi
        K = r["kab"]
        assert set(K) == {"31|A", "32|B"}, K  # titik 'kotor' (0,100) dan 'luar' jatuh di luar kab
        assert K["31|A"]["sungai"] == {"tingkat": "Bahaya", "titik": 3, "terverifikasi": 1, "tingkat_terverifikasi": "Peringatan"}, K["31|A"]
        assert K["32|B"]["sungai"] == {"tingkat": "Ekstrem", "titik": 1, "terverifikasi": 0, "tingkat_terverifikasi": None}, K["32|B"]
        assert K["32|B"]["bandang"] is True and K["31|A"]["bandang"] is False, "p/3 = eventPolygonId tidak dihitung; p/1 tak terurai"
        assert r["catatan"] == ["poligon #1 tak terurai, tidak dipetakan ke kab"] and r["bandang_sah"] is True, r["catatan"]  # S3: tanpa id respons
        assert r["label"] == LABEL and r["terbit_wib"] == "2026-11-01 10:05"
        # ambang/prakiraan hanya untuk titik >= ABOVE_NORMAL, mentah dan bertanda belum terverifikasi
        mu = [u for u in log if "gaugeModels" in u or "queryGaugeForecasts" in u]
        assert len(mu) == 2 and all("hybas_7" in u and "hybas_3" not in u and "hybas_8" not in u for u in mu), mu
        for jn in ("ambang", "prakiraan"):
            b = json.load(gzip.open(f"{a}/data/raw/banjir/floodhub/2026-11-01/0305_{jn}.json.gz", "rt"))
            assert b["belum_terverifikasi"] is True and b["titik"] == 6 and len(b["respons"]) == 1, b
        pt = potong(["a" * 10] * 1200)
        assert sum(map(len, pt)) == 1200 and len(pt) == 6 and all(len(x) * 40 <= MAKS_URL and len(x) <= MAKS_ID for x in pt), "URL dijaga pendek, maks 500 id"
        # kml: simpul di luar Indonesia / bukan KML -> tak terurai
        assert cincin_kml({"kml": "<coordinates>1,2 3,4 5,6</coordinates>"}) == [] and cincin_kml({"x": 1}) == [] and cincin_kml("<coordinates>a,b</coordinates>") == []
        assert kab_poligon(kab, cincin_kml(kml((106.2, -6.8), (109.8, -6.8), (109.8, -6.8)))) >= {"31|A", "32|B"}, "kisi/simpul menangkap dua kab"
        # arsip R2: kunci, penanda .ok, ulang yang gagal
        assert kunci_arsip("2026-11-01/0305_status.json.gz") == "arsip/floodhub/2026/11/01/0305_status.json.gz"
        assert kunci_arsip("riwayat/2025-08-01.json.gz") == "arsip/floodhub/2025/08/01/2359_riwayat.json.gz"
        assert kunci_arsip("../x.json.gz") is None and kunci_arsip("2026-11-01/0305_status.json.gz.ok") is None
        os.environ["CLOUDFLARE_API_TOKEN"], os.environ["CLOUDFLARE_ACCOUNT_ID"] = "t", "a"
        d0 = f"{a}/data/raw/banjir/floodhub/2026-11-01"
        with contextlib.redirect_stdout(keluar):
            assert unggah(a) == 0 and len(put) == 3, put  # gagal beruntun 3x -> berhenti, tak ada .ok
            assert not [f for f in os.listdir(d0) if f.endswith(".ok")]
            ok_r2[0] = True
            put.clear()
            assert unggah(a) == 5 and [x[0] for x in put] == ["get", "put"] * 5, put
            assert all(os.path.exists(f"{d0}/0305_{j}.json.gz.ok") for j in ("status", "flash", "poligon", "ambang", "prakiraan"))
            assert ("put", f"{A.BUCKET}/arsip/floodhub/2026/11/01/0305_status.json.gz", "--file", f"{d0}/0305_status.json.gz",
                    "--content-type", "application/gzip") in put
            put.clear()
            assert unggah(a) == 0 and not put, "sudah .ok: tidak diunggah ulang"
        os.environ[ENV] = rahasia  # S2: unggah membuang kunci dari env sebelum memanggil r2 (assert di r2_palsu)
        d1 = f"{a}/data/raw/banjir/floodhub/2026-11-01"
        open(f"{d1}/0305_status2.json.gz", "wb").close()  # bukan berkas arsip: diabaikan
        # objek R2 yang sudah ada TIDAK ditimpa: isi sama -> .ok saja; isi beda -> .ok + peringatan, objek tetap
        kf = "arsip/floodhub/2026/11/01/0305_flash.json.gz"
        kp = "arsip/floodhub/2026/11/01/0305_poligon.json.gz"
        tersimpan[kf] = b"isi lain di R2"
        os.remove(f"{d1}/0305_flash.json.gz.ok")
        os.remove(f"{d1}/0305_poligon.json.gz.ok")
        put.clear()
        with contextlib.redirect_stdout(keluar):
            assert unggah(a) == 2 and ENV not in os.environ
        assert not [x for x in put if x[0] == "put"] and tersimpan[kf] == b"isi lain di R2", "tidak boleh menimpa"
        assert tersimpan[kp] == open(f"{d1}/0305_poligon.json.gz", "rb").read() and "BEDA" in keluar.getvalue()
        assert os.path.exists(f"{d1}/0305_flash.json.gz.ok") and not os.path.exists(f"{d1}/0305_flash.json.gz.r2")
        # respons kebesaran, redirect ke host lain
        class F:
            def read(self, n):
                return b"x" * n
        try:
            _baca(F())
            assert 0
        except Galat:
            pass
        try:
            _Lurus().redirect_request(urllib.request.Request(BASE + "/a"), None, 302, "", {}, "https://evil.example/x")
            assert 0
        except Galat:
            pass
        _Lurus().redirect_request(urllib.request.Request(BASE + "/a"), None, 302, "", {}, BASE + "/b")
        # riwayat: lanjut dari yang ada
        with contextlib.redirect_stdout(keluar):
            riwayat(rahasia, dt.date(2025, 8, 1), 1, a, dt.date(2025, 8, 3))
            n = len(log)
            put.clear()
            riwayat(rahasia, dt.date(2025, 8, 1), 1, a, dt.date(2025, 8, 4))
        assert len(log) - n == 2, "hanya 1 hari baru (2 halaman)"
        assert [x[1] for x in put if x[0] == "put"] == [f"{A.BUCKET}/arsip/floodhub/2025/08/04/2359_riwayat.json.gz"], put
        # K1: riwayat tidak pernah mengisi hari >= awal_prospektif (dari floodhub.sidik, bukan pemindaian cache)
        SIDIK = os.path.join(tempfile.mkdtemp(), "x.sidik")
        json.dump({"awal_prospektif": "2026-10-29"}, open(SIDIK, "w"))
        assert awal_prospektif() == dt.date(2026, 10, 29) and awal_prospektif(os.path.join(a, "tak_ada")) is None
        with contextlib.redirect_stdout(keluar):
            riwayat(rahasia, dt.date(2026, 10, 27), 1, a, dt.date(2026, 11, 5))
        rw = os.listdir(f"{a}/data/raw/banjir/floodhub/riwayat")
        assert "2026-10-28.json.gz" in rw and not {"2026-10-29.json.gz", "2026-10-30.json.gz", "2026-11-01.json.gz"} & set(rw), rw
        # K8: poligon gagal diunduh -> _gagal di berkas poligon, B hari itu tak sah, catatan tanpa id
        ff.append({"forecastIssueTime": "2026-11-01T04:00:00Z", "likelyAffectedPolygonId": "p/bad"})
        galat_poli = [True]
        asal_palsu = palsu
        def palsu2(m, u, k, b):
            if galat_poli[0] and "p%2Fbad" in u:
                raise Galat("HTTP 500")
            return asal_palsu(m, u, k, b)
        _http = palsu2
        with contextlib.redirect_stdout(keluar):
            r2_ = tarik(rahasia, a, dt.datetime(2026, 11, 1, 4, 10, tzinfo=dt.timezone.utc), kab)
        pg = json.load(gzip.open(f"{a}/data/raw/banjir/floodhub/2026-11-01/0410_poligon.json.gz", "rt"))
        assert pg["_gagal"] == ["p/bad"] and r2_["bandang_sah"] is False and not any("p/bad" in c for c in r2_["catatan"]), (pg, r2_["catatan"])
        global MAKS_POLIGON
        MAKS_POLIGON, galat_poli[0] = 1, False  # terpotong kuota = gagal juga
        try:
            with contextlib.redirect_stdout(keluar):
                r3 = tarik(rahasia, a, dt.datetime(2026, 11, 1, 4, 20, tzinfo=dt.timezone.utc), kab)
        finally:
            MAKS_POLIGON = 200
        pg = json.load(gzip.open(f"{a}/data/raw/banjir/floodhub/2026-11-01/0420_poligon.json.gz", "rt"))
        assert len(pg) == 2 and len(pg["_gagal"]) == 2 and r3["bandang_sah"] is False, pg
        # K2 + SEDANG-4: sinyal d = snapshot TERBESAR dalam (batas-24 jam, batas], batas = d-1 17:00 UTC; harus lengkap; tanpa fallback
        b = tempfile.mkdtemp()
        for tg, hm, jn in [("2026-10-31", "0020", "status flash poligon"), ("2026-10-31", "1700", "status flash poligon"),
                           ("2026-10-31", "1701", "status flash poligon"), ("2026-10-30", "1600", "status flash poligon"),
                           ("2026-11-01", "0020", "status flash poligon"), ("2026-10-31", "1659", "status flash"),
                           ("2026-11-01", "1200", "status")]:
            for j in jn.split():
                simpan_gz(f"{b}/data/raw/banjir/floodhub/{tg}/{hm}_{j}.json.gz", {})
        simpan_gz(f"{b}/data/raw/banjir/floodhub/riwayat/2026-10-31.json.gz", {})
        assert pilih_snapshot(b, dt.date(2026, 11, 1)) == ("2026-10-31", "1700")
        assert pilih_snapshot(b, dt.date(2026, 10, 31)) == ("2026-10-30", "1600") and pilih_snapshot(b, dt.date(2026, 10, 30)) is None
        assert pilih_snapshot(b, dt.date(2026, 11, 2)) is None, "terbesar dalam jendela (11-01 12:00) tak lengkap: bolong, bukan fallback ke 00:20"
        assert pilih_snapshot(b, dt.date(2026, 11, 3)) is None, "11-01 00:20 di luar jendela 24 jam"
        # sinyal_snapshot membaca berkas mentah dengan kode yang sama dengan tarik
        ss = sinyal_snapshot(a, "2026-11-01", "0305", kab)
        assert ss["S"] == {"31|A": 2, "32|B": 3} and ss["B"] == {"32|B"} and ss["B_sah"] is True and ss["n_poligon"] == 2 and ss["n_terurai"] == 1, ss
        # RINGAN-4: pecahan detik 6+ digit atau 1-2 digit tidak membuat fromisoformat (3.9) galat
        assert _dt("2026-11-01T01:00:00.1234567891Z") == _dt("2026-11-01T01:00:00.123456+00:00") and _dt("2026-11-01T01:00:00.5Z").microsecond == 500000
        assert len(peristiwa_sah([{"forecastIssueTime": "2026-11-01T01:00:00.1234567891Z"}], dt.datetime(2026, 11, 1, 3, tzinfo=dt.timezone.utc))) == 1
        # RINGAN-3: tenggat pemetaan -> "tenggat" di _gagal arsip poligon dan B hari itu tak sah
        kp0 = globals()["kab_poligon"]
        def lewat(*x):
            raise Galat("tenggat total terlampaui")
        globals()["kab_poligon"] = lewat
        _http = asal_palsu
        try:
            with contextlib.redirect_stdout(keluar):
                r4 = tarik(rahasia, a, dt.datetime(2026, 11, 1, 4, 30, tzinfo=dt.timezone.utc), kab)
        finally:
            globals()["kab_poligon"] = kp0
        pg4 = json.load(gzip.open(f"{a}/data/raw/banjir/floodhub/2026-11-01/0430_poligon.json.gz", "rt"))
        assert "tenggat" in pg4["_gagal"] and r4["bandang_sah"] is False
        # K7: p0 kab-bulan tahun sebelumnya; nasional bila < 10 kab-hari
        D = dt.date
        rows = [("X", D(2024, 11, i + 1), 1 if i < 3 else 0) for i in range(10)] + [("X", D(2026, 11, 1), 1), ("X", D(2025, 12, 1), 1)]
        rows += [("Y", D(2025, 11, i + 1), 1) for i in range(3)]
        assert p0(rows, "X", D(2026, 11, 20)) == 0.3, "10 kab-hari X, tahun < 2026, bulan 11 saja"
        assert p0(rows, "Y", D(2026, 11, 20)) == 6 / 13, "Y 3 kab-hari -> nasional 6 dari 13"
        assert p0(rows, "X", D(2024, 11, 20)) is None
        # S1: simpul > 2000 ditolak, tag tak tertutup ditolak, tenggat dicek di kab_poligon
        besar = " ".join(f"{106 + i * 1e-5},{-6}" for i in range(2001))  # batas protokol 2000
        assert cincin_kml(f"<coordinates>{besar}</coordinates>") == [] and cincin_kml("<coordinates>106,-6 106,-7 107,-7") == []
        assert cincin_kml("<coordinates>106,-6 106,-7 107</coordinates>") == [] and cincin_kml("<coordinates>1,2,3,4 5,6</coordinates>") == [], "token satu angka/empat angka ditolak"
        assert len(cincin_kml("<coordinates>106,-6,0 106,-7,0 107,-7,0</coordinates>")[0]) == 3
        global _tenggat
        _tenggat = time.monotonic() - 1
        try:
            kab_poligon(kab, [[(106.2, -6.8), (106.8, -6.8), (106.8, -6.2)]])
            assert 0, "tenggat harus dicek"
        except Galat:
            pass
        finally:
            _tenggat = None
        # sidik: deterministik, memuat semua fungsi §7, berubah bila PRAREG berubah; tidak menulis berkas
        h1, pr = hitung_sidik(), os.path.join(tempfile.mkdtemp(), "p.md")
        open(pr, "w").write("x")
        assert h1 == hitung_sidik() and set(h1["fungsi"]) == set(SIDIK_FUNGSI) and h1["tabel_kab"] and hitung_sidik(AKAR, pr)["prareg"] != h1["prareg"]
        assert set(h1["berkas"]) == set(SIDIK_BERKAS) and "scripts/prediksi/dasar.py" in h1["berkas"] and "scripts/banjir/floodhub_nilai.py" in h1["berkas"]
        assert {"_waktu", "_num", "_teks", "status_sungai", "flash", "halaman"} <= set(h1["fungsi"]) and {"RE_ID", "MAKS_POS", "TENGGAT_TARIK"} <= set(h1["konstanta"])
        assert h1["arsip_prediksi"] and all(v["baris"] > 0 for v in h1["arsip_prediksi"].values())
        try:
            hitung_sidik(tempfile.mkdtemp(), pr)
            assert 0, "berkas sidik hilang harus galat"
        except (FileNotFoundError, OSError):
            pass
        # arsip append-only dikunci sebagai PREFIKS: tambah baris boleh, ubah/hapus tidak
        z = tempfile.mkdtemp()
        os.makedirs(f"{z}/{ARSIP_PREDIKSI}")
        open(f"{z}/{ARSIP_PREDIKSI}/2026-11.jsonl", "w").write('{"a":1}\n{"a":2}\n')
        lama = arsip_prefiks(z)
        open(f"{z}/{ARSIP_PREDIKSI}/2026-11.jsonl", "a").write('{"a":3}\n')
        assert arsip_beda(z, lama) == []
        open(f"{z}/{ARSIP_PREDIKSI}/2026-11.jsonl", "w").write('{"a":1}\n{"a":9}\n{"a":3}\n')
        assert arsip_beda(z, lama) == ["arsip_prediksi/2026-11.jsonl"]
        open(f"{z}/{ARSIP_PREDIKSI}/2026-11.jsonl", "w").write('{"a":1}\n')
        assert arsip_beda(z, lama) == ["arsip_prediksi/2026-11.jsonl"]
        # sidik(): sekali, awal_prospektif = hari WIB sesudah sidik; periksa_sidik utuh lalu berubah bila PRAREG berubah
        SIDIK = os.path.join(tempfile.mkdtemp(), "f.sidik")
        with contextlib.redirect_stdout(keluar):
            sidik()
        besok = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=7)).date() + dt.timedelta(days=1)
        assert awal_prospektif() == besok and periksa_sidik(AKAR, SIDIK) == [] and periksa_sidik(AKAR, SIDIK, pr) == ["prareg"]
        try:
            sidik()
            assert 0, "sidik hanya sekali"
        except SystemExit:
            pass
        # galat jaringan tidak menimpa berkas publik
        def gagal(*x):
            raise Galat("HTTP 403")
        _http = gagal
        p = os.path.join(a, "public/banjir/data/floodhub.json")
        sebelum = open(p).read()
        try:
            tarik(rahasia, a, kini, kab)
            assert 0
        except Galat:
            pass
        assert open(p).read() == sebelum
        # kunci tak tertulis di berkas mana pun maupun di log
        assert rahasia not in keluar.getvalue()
        for dp, _, fs in os.walk(a):
            for f in fs:
                b = open(os.path.join(dp, f), "rb").read()
                b = gzip.decompress(b) if f.endswith(".gz") else b
                assert rahasia.encode() not in b, f
    finally:
        _http, _r2, SIDIK = asli, asli_r2, sidik0
        for k_, v in env0.items():
            os.environ.pop(k_, None)
            if v is not None:
                os.environ[k_] = v
    print("uji floodhub: ok")


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else ""
    if c == "uji":
        uji()
    elif c == "sidik":
        sidik()
    elif c in ("tarik", "riwayat"):
        k = os.environ.get(ENV, "").strip()
        if not k:
            print(f"{ENV} tidak ada, dilewati")
            sys.exit(0)
        try:
            if c == "tarik":
                tarik(k)
            else:
                a = sys.argv[2:]
                g = lambda n, d: a[a.index(n) + 1] if n in a else d
                riwayat(k, dt.date.fromisoformat(g("--dari", "2025-08-01")), int(g("--langkah", "1")))
        except Galat as e:
            print(f"floodhub gagal: {e}; berkas publik lama dibiarkan")
            sys.exit(1)
    else:
        print(__doc__)
        sys.exit(2)
