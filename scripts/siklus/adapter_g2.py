"""Adapter panen G2 (SK-052): USGS ShakeMap lewat panen.py.

Per gempa M5 ke atas 7 hari terakhir (katalog USGS FDSN, url dari sumber.json `usgs-fdsn`), ambil detail GeoJSON lalu produk
`cont_mmi.json` (31 KB; bukan grid.xml 32,9 MB). Satu berkas mentah per hari: {"gempa":[{id,mag,waktu,lat,lon,dalam,status,cont_mmi}]}.
status: `ok` | `tanpa_shakemap` (USGS belum menerbitkan) | `menunggu_data` (gagal ambil atau bentuk salah). cont_mmi `null`, bukan 0 (KA).
Daftar gagal total = panen mengembalikan `menunggu` dan saji terakhir tetap. Lisensi dan atribusi dari sumber.json (id `usgs-shakemap`).
Pakai: python3 -I scripts/siklus/adapter_g2.py uji
"""
import datetime as dt, importlib.util, json, os, re, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
MAG_MIN, HARI = 5, 7
PRODUK = "download/cont_mmi.json"


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


G1, P = _muat("adapter_g1"), _muat("panen")
Gagal = P.Gagal


def atribusi():
    return G1.atribusi("usgs-shakemap")


def url_daftar(hari, url=None):
    if url:
        return url
    u = re.sub(r"minmagnitude=\d+", f"minmagnitude={MAG_MIN}", G1.sumber("usgs-fdsn")["url"])
    return f"{u}&starttime={(hari - dt.timedelta(days=HARI)).isoformat()}&endtime={(hari + dt.timedelta(days=1)).isoformat()}&orderby=time"


def _json(isi, apa):
    try:
        return json.loads(isi)
    except ValueError:
        raise Gagal(f"{apa}: bukan JSON")


def url_kontur(detail):
    """Detail GeoJSON event -> url cont_mmi.json terbaru, atau None bila tak ada produk ShakeMap."""
    try:
        sm = detail["properties"]["products"]["shakemap"]
        return sm[0]["contents"][PRODUK]["url"]
    except (KeyError, IndexError, TypeError):
        return None


def kontur_sah(d):
    """cont_mmi.json harus FeatureCollection berfitur yang punya properti `value` numerik (MMI)."""
    if not isinstance(d, dict):
        return False
    f = d.get("features")
    return d.get("type") == "FeatureCollection" and isinstance(f, list) and bool(f) and all(
        isinstance(x, dict) and isinstance((x.get("properties") or {}).get("value"), (int, float)) for x in f)


def _gempa(klien, f):
    r = {"id": str(f["id"]), "mag": (f.get("properties") or {}).get("mag"), "waktu": (f.get("properties") or {}).get("time"),
         "status": "menunggu_data", "cont_mmi": None}
    try:
        lon, lat, dalam = (f.get("geometry") or {})["coordinates"][:3]
        r.update({"lat": lat, "lon": lon, "dalam": dalam})   # untuk model guncangan sendiri bila ShakeMap belum terbit
    except (KeyError, TypeError, ValueError):
        pass
    try:
        u = url_kontur(_json(klien.ambil((f.get("properties") or {})["detail"]), r["id"]))
        if u is None:
            r["status"] = "tanpa_shakemap"
            return r
        k = _json(klien.ambil(u), r["id"])
        if kontur_sah(k):
            r["status"], r["cont_mmi"] = "ok", k
    except (Gagal, KeyError):
        pass
    return r


def ambil(klien, url=None, hari=None):
    d = _json(klien.ambil(url_daftar(hari or dt.date.today(), url)), "daftar")
    if not isinstance(d, dict) or not isinstance(d.get("features"), list):
        raise Gagal("daftar USGS bukan FeatureCollection")
    ada = [f for f in d["features"] if isinstance(f, dict) and f.get("id") and (f.get("properties") or {}).get("mag", 0) >= MAG_MIN]
    return json.dumps({"gempa": [_gempa(klien, f) for f in ada]}, separators=(",", ":")).encode(), "json"


ADAPTER = {"usgs-shakemap": ambil}


def _uji():
    import http.server, threading
    assert atribusi()["atribusi"].startswith("Sumber:") and not atribusi()["menunggu"]
    assert "minmagnitude=5" in url_daftar(dt.date(2026, 11, 10)) and "starttime=2026-11-03" in url_daftar(dt.date(2026, 11, 10))
    assert url_kontur({}) is None and url_kontur({"properties": {"products": {"shakemap": []}}}) is None
    assert kontur_sah({"type": "FeatureCollection", "features": [{"properties": {"value": 6.5}}]})
    for salah in (None, [], {}, {"type": "FeatureCollection", "features": []}, {"type": "FeatureCollection", "features": [{"properties": {"value": "7"}}]},
                  {"type": "Feature", "features": [{"properties": {"value": 5}}]}):
        assert not kontur_sah(salah), salah

    kont = {"type": "FeatureCollection", "features": [{"properties": {"value": 6}}]}
    cb = {}

    def detail(ada):
        return {"properties": {"products": {"shakemap": [{"contents": {PRODUK: {"url": cb["u"] + "/k/" + ada}}}]}}} if ada else {"properties": {"products": {}}}

    def daftar():
        return {"features": [{"id": i, "properties": {"mag": m, "time": 1, "detail": cb["u"] + "/d/" + i}, "geometry": {"coordinates": [110.5, -7.5, 12]}} for i, m in
                             (("a", 7.1), ("b", 5.2), ("c", 5.5), ("d", 6.0), ("kecil", 4.2))]}
    jalur = {"/daftar": daftar, "/d/a": lambda: detail("a"), "/d/b": lambda: detail(None), "/d/c": lambda: detail("c"), "/d/d": lambda: detail("d"),
             "/k/a": lambda: kont, "/k/c": lambda: {"type": "FeatureCollection", "features": []}}

    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            f = jalur.get(self.path)
            b = json.dumps(f()).encode() if f else b""
            self.send_response(200 if f else 500)
            self.end_headers()
            self.wfile.write(b)

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    cb["u"] = u = f"http://127.0.0.1:{srv.server_port}"
    t = [0.0]

    def zzz(d):
        t[0] += d
    k = P.Klien(tidur=zzz, jam=lambda: t[0])
    with tempfile.TemporaryDirectory() as d:
        r = P.panen("usgs-shakemap", lambda: ADAPTER["usgs-shakemap"](k, u + "/daftar"), d, tanggal="2026-11-10")
        assert r["status"] == "ok" and r["berkas"].endswith("usgs-shakemap/2026/2026-11-10.json"), r
        g = {x["id"]: x for x in json.load(open(r["berkas"]))["gempa"]}
        assert set(g) == {"a", "b", "c", "d"}, "M4,2 di bawah M5 tidak diambil"
        assert g["a"]["status"] == "ok" and g["a"]["cont_mmi"] == kont and (g["a"]["lat"], g["a"]["lon"], g["a"]["dalam"]) == (-7.5, 110.5, 12)
        assert g["b"]["status"] == "tanpa_shakemap" and g["c"]["status"] == "menunggu_data", "kontur kosong ditolak"
        assert g["d"]["status"] == "menunggu_data" and g["d"]["cont_mmi"] is None, "gagal ambil = menunggu_data, bukan 0"
        lama = {"n": 3}
        r = P.panen("usgs-shakemap", lambda: ADAPTER["usgs-shakemap"](k, u + "/mati"), d, saji_terakhir=lama, tanggal="2026-11-11")
        assert r["status"] == "menunggu" and r["saji"] is lama
        jalur["/daftar"] = lambda: {"bukan": 1}
        r = P.panen("usgs-shakemap", lambda: ADAPTER["usgs-shakemap"](k, u + "/daftar"), d, tanggal="2026-11-12")
        assert r["status"] == "menunggu", "daftar berbentuk salah ditolak"
    srv.shutdown()
    print("adapter_g2: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        _uji()
    else:
        sys.exit("pakai: adapter_g2.py uji (panen lewat panen.py usgs-shakemap)")
