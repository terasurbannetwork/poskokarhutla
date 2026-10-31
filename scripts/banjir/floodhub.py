"""Pengambil Google Flood Forecasting API (Peta Jalan 3c). Python stdlib saja.

Kunci HANYA dari env GOOGLE_FLOOD_API_KEY, dikirim lewat header X-Goog-Api-Key (tidak masuk URL/log).
Tanpa kunci: keluar 0 dengan log "dilewati".
  tarik     status sungai terbaru ID + flash flood ID + poligon (mentah) -> data/raw/banjir/floodhub/YYYY-MM-DD/HHMM_*.json.gz
            + ringkas publik public/banjir/data/floodhub.json (gagal = berkas publik lama tidak ditimpa)
  riwayat   --dari 2025-08-01 --langkah 1: status per hari (cutoffTime = hari itu 23:59 UTC) -> floodhub/riwayat/YYYY-MM-DD.json.gz, lanjut yang belum ada
  uji       luring, respons sintetis
Format respons serializedPolygons BELUM terverifikasi: disimpan mentah, tidak ditafsirkan.
"""
import datetime as dt, gzip, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

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


def ringkas(statuses, flashes, kini):
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
    return {"dibuat": kini.strftime("%Y-%m-%dT%H:%M:%SZ"), "sumber": SUMBER, "jumlah_pos": len(statuses[:MAKS_POS]),
            "per_severity": jml, "pos_siaga": pos,
            "flash_flood": {"jumlah": len(flashes),
                            "peristiwa": [{"terbit": _waktu(f.get("forecastIssueTime")),
                                           "periode_jam": f["forecastPeriodHours"] if isinstance(f.get("forecastPeriodHours"), int)
                                           and not isinstance(f.get("forecastPeriodHours"), bool) else None}
                                          for f in flashes[:MAKS_PERISTIWA] if isinstance(f, dict)]}}


def tarik(kunci, akar=AKAR, kini=None):
    global _tenggat
    _tenggat = time.monotonic() + TENGGAT_TARIK
    kini = kini or dt.datetime.now(dt.timezone.utc)
    d = os.path.join(akar, "data/raw/banjir/floodhub", kini.strftime("%Y-%m-%d"))
    h = kini.strftime("%H%M")
    st = status_sungai(kunci)
    ff = flash(kunci)
    poli = {}
    for f in ff:
        for k in ("likelyAffectedPolygonId", "highlyLikelyAffectedPolygonId", "eventPolygonId"):
            i = f.get(k)
            if not isinstance(i, str) or not i or len(i) > 200:
                if i:
                    print(f"peringatan: id poligon ditolak {i!r:.80}")
                continue
            if i not in poli and len(poli) < MAKS_POLIGON:
                try:
                    poli[i] = panggil("GET", "/v1/serializedPolygons/" + urllib.parse.quote(i, safe=""), kunci)
                except Galat as e:
                    print(f"peringatan: poligon {i!r:.80} gagal ({e})")
    simpan_gz(f"{d}/{h}_status.json.gz", st)
    simpan_gz(f"{d}/{h}_flash.json.gz", ff)
    simpan_gz(f"{d}/{h}_poligon.json.gz", poli)
    r = ringkas(st, ff, kini)
    p = os.path.join(akar, "public/banjir/data/floodhub.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, indent=1)
    os.replace(p + ".tmp", p)
    print(f"floodhub: {r['jumlah_pos']} pos, {len(r['pos_siaga'])} >= ABOVE_NORMAL, {len(ff)} flash flood, {len(poli)} poligon")
    return r


def riwayat(kunci, dari, langkah, akar=AKAR, hingga=None):
    hingga = hingga or dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=1)
    t, n = dari, 0
    while t <= hingga:
        p = os.path.join(akar, "data/raw/banjir/floodhub/riwayat", t.isoformat() + ".json.gz")
        if not os.path.exists(p):
            simpan_gz(p, status_sungai(kunci, t.isoformat() + "T23:59:00Z"))
            n += 1
            print("riwayat", t)
        t += dt.timedelta(days=langkah)
    print(f"riwayat: {n} hari baru")


def uji():
    import tempfile
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
    ff = [{"forecastIssueTime": "2026-11-01T00:00:00Z", "forecastPeriodHours": 24, "likelyAffectedPolygonId": "p/1"}, {},
          {"forecastIssueTime": "x", "forecastPeriodHours": "24", "eventPolygonId": "A" * 201}]
    log = []
    global _http

    def palsu(metode, url, kunci, body):
        log.append(url)
        assert kunci == rahasia and rahasia not in url
        if "floodStatus" in url:
            return {"floodStatuses": st[:3], "nextPageToken": "t2"} if "pageToken" not in (body or {}) else {"floodStatuses": st[3:]}
        if "flashFloods" in url:
            return {"flashFloodEvents": ff}
        if "serializedPolygons" in url:
            return {"mentah": "apa adanya"}
        raise Galat("tak dikenal")
    asli, _http = _http, palsu
    try:
        a = tempfile.mkdtemp()
        kini = dt.datetime(2026, 11, 1, 3, 5, tzinfo=dt.timezone.utc)
        r = tarik(rahasia, a, kini)
        assert r["jumlah_pos"] == 10 and r["per_severity"] == {"EXTREME": 1, "SEVERE": 5, "ABOVE_NORMAL": 1, "NO_FLOODING": 1, "UNKNOWN": 2}, r
        ids = [p["id"] for p in r["pos_siaga"]]
        assert ids == ["hybas_2", "hybas_1", "kotor", "hybas_6"] or ids == ["hybas_2", "hybas_1", "kotor"], ids
        k = [p for p in r["pos_siaga"] if p["id"] == "kotor"][0]
        assert k["trend"] is None and k["issuedTime"] is None and k["source"] == "iokxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"[:40] or k["source"] == re.sub(r"[^A-Za-z0-9 ._()-]", "", "<i>ok</i>" + "x" * 80)[:40], k
        assert r["pos_siaga"][0]["lat"] == -7.0 and r["pos_siaga"][0]["lon"] == 110.0
        assert "hybas_6" not in ids, "tanpa koordinat dibuang"
        assert r["flash_flood"]["jumlah"] == 3 and r["flash_flood"]["peristiwa"][1] == {"terbit": None, "periode_jam": None} and r["flash_flood"]["peristiwa"][0]["periode_jam"] == 24
        assert json.load(gzip.open(f"{a}/data/raw/banjir/floodhub/2026-11-01/0305_poligon.json.gz", "rt")) == {"p/1": {"mentah": "apa adanya"}}
        assert not any("AAAA" in u for u in log), "id poligon kepanjangan tak dipanggil"
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
        riwayat(rahasia, dt.date(2025, 8, 1), 1, a, dt.date(2025, 8, 3))
        n = len(log)
        riwayat(rahasia, dt.date(2025, 8, 1), 1, a, dt.date(2025, 8, 4))
        assert len(log) - n == 2, "hanya 1 hari baru (2 halaman)"
        # galat jaringan tidak menimpa berkas publik
        def gagal(*x):
            raise Galat("HTTP 403")
        _http = gagal
        p = os.path.join(a, "public/banjir/data/floodhub.json")
        sebelum = open(p).read()
        try:
            tarik(rahasia, a, kini)
            assert 0
        except Galat:
            pass
        assert open(p).read() == sebelum
        # kunci tak tertulis di berkas mana pun
        for dp, _, fs in os.walk(a):
            for f in fs:
                b = open(os.path.join(dp, f), "rb").read()
                b = gzip.decompress(b) if f.endswith(".gz") else b
                assert rahasia.encode() not in b, f
    finally:
        _http = asli
    print("uji floodhub: ok")


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else ""
    if c == "uji":
        uji()
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
