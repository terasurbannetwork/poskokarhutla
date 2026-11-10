"""Adapter panen G1 (SK-012): GDACS (GeoJSON), GLIDE, USGS FDSN lewat panen.py (jeda 2 detik), DIBI harian dari berkas repo.

ADAPTER = {id_sumber: fungsi(klien, url=None) -> (bytes, ext)}; URL, lisensi, atribusi dari sumber.json (registri.py).
Id luar (eventid GDACS, nomor GLIDE, id USGS) disimpan sebagai TEKS pengenal luar (`pengenal_luar`), tidak pernah angka (PRD F1-07).
Gagal = panen.panen mengembalikan `menunggu` dan saji terakhir dipertahankan. Di luar: ReliefWeb (U6), PetaBencana tanpa lisensi.
RSS GDACS tidak punya id sendiri di registri: belum diambil (butuh entri sumber.json).
Pakai: python3 -I scripts/siklus/adapter_g1.py uji
"""
import datetime as dt, importlib.util, json, os, re, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
DIBI_PUBLIK = os.path.join(AKAR, "public/data/dibi_kejadian.json")


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def sumber(id_):
    return next(x for x in _muat("registri").muat()["sumber"] if x["id"] == id_)


def atribusi(id_):
    """-> {lisensi, atribusi, menunggu}. Lisensi yang 'tidak dinyatakan' = menunggu (tidak dianggap bebas)."""
    s = sumber(id_)
    return {"lisensi": s["lisensi"], "atribusi": s["atribusi"], "menunggu": s["lisensi"].lower().startswith("tidak dinyatakan")}


def _url(id_, url, hari):
    u = url or sumber(id_)["url"]
    if url:
        return u
    if id_ == "gdacs":
        u = re.sub(r"toDate=\d{4}-\d{2}-\d{2}", "toDate=" + hari.isoformat(), u)
    elif id_ == "glide":
        u = re.sub(r"fromyear=\d+", f"fromyear={hari.year - 1}", u)
        u = re.sub(r"toyear=\d+", f"toyear={hari.year}", u)
        u = re.sub(r"maxhit=\d+", "maxhit=500", u)
    return u


def _adapter(id_):
    def ambil(klien, url=None, hari=None):
        return klien.ambil(_url(id_, url, hari or dt.date.today())), "json"
    return ambil


ADAPTER = {i: _adapter(i) for i in ("gdacs", "glide", "usgs-fdsn")}


def pengenal_luar(id_, isi):
    """-> daftar teks pengenal luar dari hasil mentah. Id selalu str."""
    d = json.loads(isi)
    if id_ == "gdacs":
        p = [f.get("properties", {}) for f in d.get("features", [])]
        return [f"{x.get('eventtype')}{x.get('eventid')}" for x in p if x.get("eventid") is not None]
    if id_ == "usgs-fdsn":
        return [str(f["id"]) for f in d.get("features", []) if f.get("id")]
    if id_ == "glide":
        h = d.get("glideset", d) if isinstance(d, dict) else d
        return [str(x.get("glide_number") or x.get("GLIDE_number") or x.get("number")) for x in h if isinstance(x, dict)
                and (x.get("glide_number") or x.get("GLIDE_number") or x.get("number"))]
    raise KeyError(id_)


def salin_dibi_harian(mentah, publik=DIBI_PUBLIK, tanggal=None):
    """DIBI harian yang sudah ada di repo -> mentah/dibi_harian/<YYYY>/<tanggal>.json (hanya tambah)."""
    p = _muat("panen")
    isi = open(publik, "rb").read()
    return p.panen("dibi_harian", lambda: (isi, "json"), mentah, tanggal=tanggal)


def _uji():
    import http.server, threading
    P = _muat("panen")
    assert set(ADAPTER) == {"gdacs", "glide", "usgs-fdsn"}
    for i in ADAPTER:
        a = atribusi(i)
        assert a["lisensi"] and a["atribusi"].startswith("Sumber:"), i
    assert atribusi("glide")["menunggu"] and not atribusi("usgs-fdsn")["menunggu"], "lisensi tak dinyatakan = menunggu"
    h = dt.date(2027, 1, 5)
    assert "toDate=2027-01-05" in _url("gdacs", None, h) and "fromyear=2026" in _url("glide", None, h) and "toyear=2027" in _url("glide", None, h)

    isi = {"/gdacs": {"features": [{"properties": {"eventtype": "EQ", "eventid": 1234567}}, {"properties": {}}]},
           "/usgs": {"features": [{"id": "us6000tkt2"}, {"id": 5}]},
           "/glide": {"glideset": [{"glide_number": "FL-2026-000012-IDN"}, {"x": 1}]}}
    n = {}

    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            n[self.path] = n.get(self.path, 0) + 1
            if self.path in isi:
                b, c = json.dumps(isi[self.path]).encode(), 200
            else:
                b, c = b"", 500
            self.send_response(c)
            self.end_headers()
            self.wfile.write(b)

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    u = f"http://127.0.0.1:{srv.server_port}"
    t = [0.0]
    tidur = []

    def zzz(d):
        tidur.append(d)
        t[0] += d
    k = P.Klien(tidur=zzz, jam=lambda: t[0])
    with tempfile.TemporaryDirectory() as d:
        for i, jalur, harap in (("gdacs", "/gdacs", ["EQ1234567"]), ("usgs-fdsn", "/usgs", ["us6000tkt2", "5"]), ("glide", "/glide", ["FL-2026-000012-IDN"])):
            r = P.panen(i, lambda: ADAPTER[i](k, u + jalur), d, tanggal="2026-11-10")
            assert r["status"] == "ok" and r["berkas"].endswith(f"{i}/2026/2026-11-10.json"), r
            ids = pengenal_luar(i, open(r["berkas"], "rb").read())
            assert ids == harap and all(isinstance(x, str) for x in ids), ids
        assert tidur and min(tidur) >= P.JEDA_MIN, "jeda 2 detik antarpermintaan"
        lama = {"n": 7}
        r = P.panen("gdacs", lambda: ADAPTER["gdacs"](k, u + "/mati"), d, saji_terakhir=lama, tanggal="2026-11-11")
        assert r["status"] == "menunggu" and r["saji"] is lama and not os.path.exists(os.path.join(d, "gdacs/2026/2026-11-11.json")), "gagal = menunggu, saji lama utuh"
        r = salin_dibi_harian(d, tanggal="2026-11-10")
        assert r["status"] == "ok" and r["berkas"].endswith("dibi_harian/2026/2026-11-10.json")
        assert not salin_dibi_harian(d, tanggal="2026-11-10")["baru"]
    srv.shutdown()
    print("adapter_g1: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        _uji()
    else:
        sys.exit("pakai: adapter_g1.py uji (panen lewat panen.py <id_sumber>)")
