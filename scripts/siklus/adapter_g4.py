"""Adapter panen G4 (SK-093): CHIRPS v3 (pembanding bias), PSMSL (stasiun muka laut), AR6 Zenodo lewat panen.py (jeda 2 detik).

ADAPTER = {id_sumber: fungsi(klien, url=None) -> (bytes, ext)}; URL, lisensi, atribusi dari sumber.json (registri.py), tidak ditulis ulang di sini.
Bawaan: CHIRPS = indeks direktori monthly/global/tifs/ (kecil; satu tif 24 MB diminta lewat url=...), PSMSL = zip RLR bulanan, AR6 = rekaman Zenodo (JSON metadata;
berkas besarnya 0,9 sampai 9 GB dibaca di tempat oleh iklim_lab, tidak diunduh di sini, KA 29). Salinan NEX-GDDP dan CMEMS di luar adapter ini.
Gagal = panen.panen mengembalikan `menunggu`, saji terakhir dipertahankan, tidak pernah 0.
Pakai: python3 -I scripts/siklus/adapter_g4.py uji
"""
import importlib.util, json, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
SUMBER = {"chirps-v3": "monthly/global/tifs/", "psmsl": "", "ar6-slr-zenodo": ""}
EXT = {"chirps-v3": "html", "psmsl": "zip", "ar6-slr-zenodo": "json"}


def _muat(nama):
    s = importlib.util.spec_from_file_location("sk4_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def sumber(id_):
    return next(x for x in _muat("registri").muat()["sumber"] if x["id"] == id_)


def atribusi(id_):
    """-> {lisensi, atribusi, menunggu}. Lisensi 'tidak dinyatakan' = menunggu."""
    s = sumber(id_)
    return {"lisensi": s["lisensi"], "atribusi": s["atribusi"], "menunggu": s["lisensi"].lower().startswith("tidak dinyatakan")}


def _adapter(id_):
    def ambil(klien, url=None):
        u = url or sumber(id_)["url"].rstrip("/") + ("/" + SUMBER[id_] if SUMBER[id_] else "")
        return klien.ambil(u, timeout=120), ("tif" if u.endswith(".tif") else EXT[id_])
    return ambil


ADAPTER = {i: _adapter(i) for i in SUMBER}


def berkas_ar6(isi):
    """Rekaman Zenodo (bytes) -> [(nama, byte)]. Bentuk salah = ValueError."""
    d = json.loads(isi)
    f = d.get("files") if isinstance(d, dict) else None
    if not isinstance(f, list) or not f or not all(isinstance(x, dict) and "key" in x and isinstance(x.get("size"), int) for x in f):
        raise ValueError("rekaman Zenodo tanpa daftar berkas sah")
    return [(x["key"], x["size"]) for x in f]


def _uji():
    import http.server, threading
    P = _muat("panen")
    assert set(ADAPTER) == {"chirps-v3", "psmsl", "ar6-slr-zenodo"}
    for i in ADAPTER:
        a = atribusi(i)
        assert a["lisensi"] and a["atribusi"].startswith("Sumber:") and not a["menunggu"], i
    isi = {"/chirps/": b"<html>chirps-v3.0.2026.09.tif</html>", "/psmsl.zip": b"PK\x03\x04", "/zen": json.dumps({"files": [{"key": "ar6.zip", "size": 890}]}).encode(),
           "/c.tif": b"II*\x00"}

    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            b = isi.get(self.path)
            self.send_response(200 if b is not None else 500)
            self.end_headers()
            self.wfile.write(b or b"")

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
        for i, jalur, ext in (("chirps-v3", "/chirps/", "html"), ("psmsl", "/psmsl.zip", "zip"), ("ar6-slr-zenodo", "/zen", "json"), ("chirps-v3", "/c.tif", "tif")):
            r = P.panen(i + ("-tif" if ext == "tif" else ""), lambda: ADAPTER[i](k, u + jalur), d, tanggal="2026-11-10")
            assert r["status"] == "ok" and r["berkas"].endswith("2026-11-10." + ext), r
        assert berkas_ar6(open(os.path.join(d, "ar6-slr-zenodo/2026/2026-11-10.json"), "rb").read()) == [("ar6.zip", 890)]
        for salah in (b"{}", b"x", b'{"files":[{"key":"a"}]}'):
            try:
                berkas_ar6(salah)
                raise AssertionError("harus ditolak")
            except ValueError:
                pass
        assert min(tidur) >= P.JEDA_MIN, "jeda 2 detik"
        lama = {"n": 3}
        r = P.panen("psmsl", lambda: ADAPTER["psmsl"](k, u + "/mati"), d, saji_terakhir=lama, tanggal="2026-11-11")
        assert r["status"] == "menunggu" and r["saji"] is lama and not os.path.exists(os.path.join(d, "psmsl/2026/2026-11-11.zip")), "gagal = menunggu"
    srv.shutdown()
    print("adapter_g4: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        _uji()
    else:
        sys.exit("pakai: adapter_g4.py uji (panen lewat panen.py <id_sumber>)")
