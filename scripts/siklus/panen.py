"""Satu klien jaringan Siklus: UA proyek, jeda >= 2 detik antarpermintaan, 3 kali coba jeda 2 detik, 429 Retry-After, tanpa CAPTCHA.

Hasil ke mentah/<sumber>/<YYYY>/<tanggal>.<ext>, hanya ditambah. Gagal total: saji terakhir dipertahankan, hasil `menunggu`, bukan 0.
Adapter per sumber di scripts/siklus/adapter_g*.py, masing-masing mengekspor ADAPTER = {id_sumber: fungsi(klien) -> (bytes, ext)}.
Keluar non-nol hanya bila `uji` gagal. Pakai: python3 -I scripts/siklus/panen.py <id_sumber> [--mentah DIR] | uji
"""
import datetime as dt, glob, importlib.util, os, re, sys, time, urllib.error, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
UA = "Centurisk97-Siklus/1.0 (+https://centurisk97.id; riset kebencanaan BNPB)"
JEDA_MIN = 2
COBA = 3
RETRY_MAKS = 120
CAPTCHA = re.compile(rb"captcha|g-recaptcha|cf-challenge|hcaptcha", re.I)


class Gagal(Exception):
    pass


def _muat(rel):
    s = importlib.util.spec_from_file_location(os.path.basename(rel)[:-3], rel)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def adapter():
    """Gabungan ADAPTER dari semua adapter_g*.py."""
    a = {}
    for f in sorted(glob.glob(os.path.join(AB, "adapter_g*.py"))):
        a.update(getattr(_muat(f), "ADAPTER", {}))
    return a


class Klien:
    def __init__(self, jeda=JEDA_MIN, tidur=time.sleep, jam=time.monotonic):
        self.jeda = max(jeda, JEDA_MIN)
        self.tidur, self.jam, self._akhir = tidur, jam, None

    def _tunggu(self, detik=0):
        if self._akhir is not None:
            detik = max(detik, self.jeda - (self.jam() - self._akhir))
        if detik > 0:
            self.tidur(detik)

    def ambil(self, url, timeout=30):
        galat = None
        for n in range(COBA):
            self._tunggu(JEDA_MIN if n else 0)
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            try:
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    isi = r.read()
                self._akhir = self.jam()
                if CAPTCHA.search(isi[:20000]):
                    raise Gagal(f"{url}: halaman meminta CAPTCHA, tidak dilewati")
                return isi
            except urllib.error.HTTPError as e:
                self._akhir = self.jam()
                galat = f"HTTP {e.code}"
                if e.code == 429:
                    ra = e.headers.get("Retry-After", "")
                    self._tunggu(min(int(ra), RETRY_MAKS) if ra.isdigit() else JEDA_MIN)
                elif 400 <= e.code < 500:
                    break
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                self._akhir = self.jam()
                galat = str(e)
        raise Gagal(f"{url}: gagal setelah {COBA} kali coba ({galat})")


def panen(sumber, ambil, mentah, saji_terakhir=None, tanggal=None):
    """ambil() -> (bytes, ext). Sukses: {'status':'ok','berkas':jalur}. Gagal: {'status':'menunggu','saji':saji_terakhir}."""
    tanggal = tanggal or dt.date.today().isoformat()
    try:
        isi, ext = ambil()
    except Gagal as e:
        return {"status": "menunggu", "alasan": str(e), "saji": saji_terakhir}
    jalur = os.path.join(mentah, sumber, tanggal[:4], f"{tanggal}.{ext}")
    if os.path.exists(jalur):
        return {"status": "ok", "berkas": jalur, "baru": False}
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "wb") as f:
        f.write(isi)
    return {"status": "ok", "berkas": jalur, "baru": True}


def _uji():
    import http.server, tempfile, threading

    catat = []

    class H(http.server.BaseHTTPRequestHandler):
        hitung = {}

        def log_message(self, *a):
            pass

        def do_GET(self):
            p = self.path
            H.hitung[p] = H.hitung.get(p, 0) + 1
            catat.append((p, self.headers.get("User-Agent")))
            if p == "/ok":
                code, body, h = 200, b'{"a":1}', {}
            elif p == "/limit" and H.hitung[p] == 1:
                code, body, h = 429, b"", {"Retry-After": "7"}
            elif p == "/limit":
                code, body, h = 200, b"sudah", {}
            elif p == "/captcha":
                code, body, h = 200, b"<div class='g-recaptcha'></div>", {}
            elif p == "/pulih" and H.hitung[p] < 3:
                code, body, h = 503, b"", {}
            elif p == "/pulih":
                code, body, h = 200, b"pulih", {}
            else:
                code, body, h = 500, b"", {}
            self.send_response(code)
            for k, v in h.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body)

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    u = f"http://127.0.0.1:{srv.server_port}"

    def baru(**k):
        t = [0.0]
        tidur = []

        def zzz(d):
            tidur.append(d)
            t[0] += d
        return Klien(tidur=zzz, jam=lambda: t[0], **k), tidur

    k, tidur = baru(jeda=0.1)
    assert k.jeda == JEDA_MIN, "jeda di bawah 2 detik dinaikkan"
    assert k.ambil(u + "/ok") == b'{"a":1}' and catat[-1][1] == UA
    k.ambil(u + "/ok")
    assert tidur and min(tidur) >= JEDA_MIN, tidur

    k, tidur = baru()
    assert k.ambil(u + "/limit") == b"sudah" and max(tidur) == 7, tidur

    k, tidur = baru()
    assert k.ambil(u + "/pulih") == b"pulih" and H.hitung["/pulih"] == 3

    n0 = H.hitung.get("/mati", 0)
    k, _ = baru()
    try:
        k.ambil(u + "/mati")
        raise AssertionError("tiga kegagalan beruntun harus Gagal")
    except Gagal:
        assert H.hitung["/mati"] - n0 == COBA

    k, _ = baru()
    try:
        k.ambil(u + "/captcha")
        raise AssertionError("CAPTCHA harus ditolak")
    except Gagal as e:
        assert "CAPTCHA" in str(e)

    with tempfile.TemporaryDirectory() as d:
        k, _ = baru()
        lama = {"v": 1, "n": 42}
        r = panen("contoh", lambda: (k.ambil(u + "/mati"), "json"), d, saji_terakhir=lama, tanggal="2026-11-10")
        assert r["status"] == "menunggu" and r["saji"] is lama and r["saji"]["n"] != 0
        assert not os.path.exists(os.path.join(d, "contoh")), "gagal tidak menulis mentah"
        r = panen("contoh", lambda: (k.ambil(u + "/ok"), "json"), d, tanggal="2026-11-10")
        assert r["baru"] and r["berkas"].endswith("contoh/2026/2026-11-10.json")
        isi = open(r["berkas"], "rb").read()
        r2 = panen("contoh", lambda: (b"lain", "json"), d, tanggal="2026-11-10")
        assert not r2["baru"] and open(r["berkas"], "rb").read() == isi, "mentah hanya tambah"
    srv.shutdown()
    print("panen: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a and not a[0].startswith("-"):
        d = _muat(os.path.join(AB, "registri.py")).muat()
        s = next((x for x in d["sumber"] if x["id"] == a[0]), None)
        if s is None:
            sys.exit(f"{a[0]}: tidak ada di sumber.json")
        fn = adapter().get(a[0])
        if s["status"] == "gagal" or fn is None:
            sys.exit(print(f"{a[0]}: dilewati (status gagal atau adapter belum ada)") or 0)
        k = Klien(s["jeda"])
        mentah = a[a.index("--mentah") + 1] if "--mentah" in a else os.path.join(AB, "mentah")
        print(panen(a[0], lambda: fn(k), mentah))
    else:
        sys.exit("pakai: panen.py <id_sumber> [--mentah DIR] | uji")
