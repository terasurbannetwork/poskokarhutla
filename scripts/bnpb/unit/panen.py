"""MB-8 Panen sumber resmi terbuka (ALGORITMA sec 9; DESAIN-TEKNIS sec 4.8 dan 8; KEAMANAN-PRIVASI sec 4 dan 8; tiket RU-035).

Pustaka ambil-data untuk sistem Ruang Unit, bukan langkah jalan.py. Satu pintu ke jaringan: ambil_json().
Aturan yang dijaga di sini, sebelum dan sesudah tiap permintaan:
  - DILARANG dicek per komponen URL terurai (host, jalur ternormal, kueri) sebelum permintaan, termasuk ke robots.txt;
    pengalihan diperiksa di _Alih SEBELUM diikuti (diizinkan, host sama, robots), lalu sekali lagi pada URL akhir.
  - hanya https port 443 tanpa userinfo, host di HOST_IZIN; host akhir sesudah pengalihan harus sama dengan host yang diminta.
  - robots.txt dihormati per host; 401, 403, 429 dihormati: berhenti untuk sumber itu (Ditolak), tanpa ulang,
    tanpa ganti User-Agent, tanpa proxy.
  - jeda sopan per host lewat scripts/umum/jaring.py jeda(); coba ulang 3 kali (2, 4, 8 detik) hanya untuk 5xx dan galat jaringan.
  - respons dibatasi BATAS_BYTE dan tenggat baca total BATAS_DETIK x 5 (potongan 1 MB, jam monotonic).
  - cache data/raw/unit/<sumber>/<sha1 url>.json + .meta (data/raw di-gitignore); cache segar tidak memanggil jaringan.
    TEMBOLOK BERISI DATA PRIBADI: jawaban mentah CKAN memuat email, author, maintainer, creator_user_id. Tembolok hanya
    di mesin pengerja dan actions/cache, tidak pernah di-commit, diunggah ke R2, atau disalin ke public/.
  - bentuk sumber berubah: BentukBerubah (keluar bukan 0 lewat jalan.py; berkas R2 kemarin dipertahankan).
Keluaran panen hanya masuk berkas R2 unit/ lewat jalan.py (/tmp/unit), tidak pernah ke public/data.

  ambil_json(url, sumber, umur_jam=20, jeda=1.0)  -> (data, {nama, url, diambil, lisensi})
  ckan_paket(rows=1000)                          -> {"paket": [...], "jumlah": n, "sumber": [...]}  kolom daftar putih, tanpa email dan nama orang
  ckan_organisasi()                              -> {"organisasi": [{id, name, title, package_count}], "sumber": [...]}
  (_ckan mentah privat: satu-satunya pintu keluar CKAN adalah dua fungsi daftar putih di atas)
  diizinkan(url)                                 -> galat bila URL dilarang atau di luar host izin

  python3 -I scripts/bnpb/unit/panen.py --cek
"""
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(AKAR, "scripts", "umum"))  # -I tidak menaruh folder skrip
import jaring  # noqa: E402  jeda per host dan Ditolak dipakai bersama, bukan disalin

UA = "Centurisk97/1.0 (+https://centurisk97.id; kontak: alamat EMAIL_TO di wrangler.jsonc)"  # DT sec 8, tidak pernah diganti
CACHE = os.path.join(AKAR, "data", "raw", "unit")
FIXTURE = os.path.join(AKAR, "tests", "bnpb", "fixtures", "unit", "ckan")
BATAS_BYTE = 32 * 1024 * 1024
BATAS_DETIK = 60
BATAS_BACA = BATAS_DETIK * 5   # tenggat total baca satu respons
POTONGAN = 1024 * 1024
JEDA_ULANG = (2, 4, 8)
CKAN = "https://data.bnpb.go.id/api/3/action/"
CKAN_AKSI = {"organization_list", "package_search"}
CKAN_NAMA = "Portal Satu Data BNPB, data.bnpb.go.id"
HOST_IZIN = {"data.bnpb.go.id", "gis.bnpb.go.id", "inalogpal.bnpb.go.id", "jdihn.go.id", "sirup.inaproc.id", "spse.inaproc.id"}
# KEAMANAN-PRIVASI sec 4 dan DT sec 8. Ditambah pada hari pemilik data menolak (KP sec 8 butir 2), dengan kasus di cek().
# Tiap aturan menerima URL terurai u = {host, jalur (didekode, huruf kecil, // dirapatkan), kueri {kunci kecil: [nilai]}, teks}.


def _gis_kueri(u):
    """Kueri fitur ArcGIS gis.bnpb.go.id wajib returnGeometry=false dan outFields daftar putih (tanpa *). Kosong = bawaan ArcGIS, ditolak."""
    if u["host"] != "gis.bnpb.go.id" or not u["jalur"].rstrip("/").endswith("/query"):
        return False
    geo, kolom = u["kueri"].get("returngeometry", []), u["kueri"].get("outfields", [])
    if not geo or any(v.strip().lower() != "false" for v in geo):
        return True
    return not kolom or any(not t.strip() or "*" in t for v in kolom for t in v.split(","))


DILARANG = [
    (lambda u: "survey123" in u["teks"], "Survey123 membuka nama, kontak, tanggal lahir responden (KP sec 4 butir 1)"),
    (lambda u: "perangkat_penilaian_awal" in u["teks"], "layer penilaian awal Survey123 (KP sec 4 butir 1)"),
    (lambda u: u["host"] == "inalogpal.bnpb.go.id" and "get_instansi_survey" in u["jalur"], "nama dan nomor PIC anggota klaster (KP sec 4 butir 5)"),
    (lambda u: u["host"].endswith("bnpb.go.id") and "/berita" in u["jalur"], "403 ke pengambil otomatis, dihormati (KP sec 4 butir 13)"),
    (lambda u: "dapodik" in u["teks"], "belum ada izin (KP sec 4 butir 14)"),
    (_gis_kueri, "ArcGIS hanya agregat: returnGeometry=false dan outFields daftar putih (KP sec 4 butir 2)"),
]
# PUS-1 butuh: ada atau tidaknya notes dan maintainer, bukan isinya. Email, nama orang, id pembuat tidak pernah keluar dari sini.
PAKET_KOLOM = ("id", "name", "title", "metadata_created", "metadata_modified", "license_id", "num_resources")

_tidur = time.sleep
_jam = time.monotonic
_robots = {}


class Dilarang(ValueError):
    """URL masuk daftar DILARANG atau di luar host izin: tidak pernah diminta."""


class BentukBerubah(RuntimeError):
    """Sumber menjawab dengan bentuk lain dari yang diharapkan: berkas lama dipertahankan."""


class GagalAmbil(RuntimeError):
    """5xx atau galat jaringan sesudah semua coba ulang; pesan memuat URL dan kode."""


def _kini():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _dekode(t):
    for _ in range(5):  # %252A dan sejenisnya: dekode sampai tetap
        u = urllib.parse.unquote(t)
        if u == t:
            return t
        t = u
    raise Dilarang("URL dikodekan berlapis")


def diizinkan(url):
    try:
        p = urllib.parse.urlsplit(url)
        port = p.port
    except ValueError:
        raise Dilarang(f"{url}: URL atau port tidak sah") from None
    if p.scheme != "https" or not p.hostname:
        raise Dilarang(f"{url}: hanya https")
    if "@" in p.netloc or p.username is not None or p.password is not None:
        raise Dilarang(f"{url}: userinfo di URL ditolak")
    if port not in (None, 443):
        raise Dilarang(f"{url}: port {port} ditolak, hanya 443")
    if p.hostname not in HOST_IZIN:
        raise Dilarang(f"{url}: host {p.hostname} di luar HOST_IZIN")
    jalur = re.sub(r"/+", "/", _dekode(p.path).lower())
    kueri = {}
    for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True):
        kueri.setdefault(_dekode(k).lower(), []).append(_dekode(v))
    u = {"host": p.hostname, "jalur": jalur, "kueri": kueri, "teks": _dekode(url).lower()}
    for aturan, alasan in DILARANG:
        if aturan(u):
            raise Dilarang(f"{url}: dilarang dipanen, {alasan}")
    return p.hostname


class _Alih(urllib.request.HTTPRedirectHandler):
    """Pengalihan diperiksa sebelum diikuti: URL baru wajib lolos diizinkan, host sama dengan asal, dan robots."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        newurl = urllib.parse.urljoin(req.full_url, newurl)
        asal = urllib.parse.urlsplit(req.full_url).hostname
        if diizinkan(newurl) != asal:
            raise Dilarang(f"{req.full_url}: dialihkan ke host lain {newurl}")
        if urllib.parse.urlsplit(newurl).path != "/robots.txt" and not _robots_boleh(newurl, 0):
            raise jaring.Ditolak(f"{req.full_url}: pengalihan ke {newurl} dilarang robots.txt")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_ALIH = _Alih()
_buka = urllib.request.build_opener(urllib.request.ProxyHandler({}), _ALIH).open  # tanpa proxy lingkungan; diganti tiruan di cek()


def _baca(r, url):
    """Baca berpotongan dengan batas byte dan tenggat total monotonic."""
    mulai, isi = _jam(), bytearray()
    while True:
        if _jam() - mulai > BATAS_BACA:
            raise GagalAmbil(f"{url}: baca melewati tenggat {BATAS_BACA} detik")
        b = r.read(POTONGAN)
        if not b:
            return bytes(isi)
        isi += b
        if len(isi) > BATAS_BYTE:
            raise GagalAmbil(f"{url}: respons melewati batas {BATAS_BYTE} byte")


def _minta(url, jeda):
    """Satu permintaan mentah dengan batas ukuran dan pemeriksaan host akhir. -> (kode, bytes)."""
    host = diizinkan(url)
    jaring.jeda(host, jeda)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with _buka(req, timeout=BATAS_DETIK) as r:
        akhir = r.geturl()
        if urllib.parse.urlsplit(akhir).hostname != host:
            raise Dilarang(f"{url}: dialihkan ke host lain {akhir}")
        diizinkan(akhir)
        panjang = r.headers.get("Content-Length")
        if panjang and panjang.isdigit() and int(panjang) > BATAS_BYTE:
            raise GagalAmbil(f"{url}: respons {panjang} byte melewati batas {BATAS_BYTE}")
        return getattr(r, "status", 200), _baca(r, url)


def _robots_boleh(url, jeda):
    p = urllib.parse.urlsplit(url)
    rp = _robots.get(p.hostname)
    if rp is None:
        rp = urllib.robotparser.RobotFileParser()
        try:
            _, isi = _minta(f"https://{p.hostname}/robots.txt", jeda)
            rp.parse(isi.decode("utf-8", "replace").splitlines())
        except urllib.error.HTTPError as e:
            if e.code in (401, 403) or e.code >= 500:
                rp.disallow_all = True   # RFC 9309: tak terjangkau atau ditolak = jangan ambil
            else:
                rp.allow_all = True      # 404 dan 4xx lain: tanpa aturan
        except (OSError, GagalAmbil):
            rp.disallow_all = True
        _robots[p.hostname] = rp
    return rp.can_fetch(UA, url)


def _jalur(sumber, url):
    if not re.match(r"^[a-z0-9_]+$", sumber):
        raise ValueError(f"nama sumber {sumber!r} tidak sah")
    h = hashlib.sha1(url.encode()).hexdigest()
    d = os.path.join(CACHE, sumber)
    return os.path.join(d, h + ".json"), os.path.join(d, h + ".meta")


def _tulis(path, isi):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(isi)
    os.replace(tmp, path)


def ambil_json(url, sumber, umur_jam=20, jeda=1.0, nama=None, lisensi="tidak tertulis"):
    """-> (data JSON, atribusi). Cache segar dikembalikan tanpa jaringan."""
    diizinkan(url)
    jd, jm = _jalur(sumber, url)
    atr = lambda diambil: {"nama": nama or sumber, "url": url, "diambil": diambil, "lisensi": lisensi}  # noqa: E731
    try:
        with open(jm, encoding="utf-8") as f:
            meta = json.load(f)
        umur = (datetime.now(timezone.utc) - datetime.strptime(meta["diambil"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).total_seconds()
        if meta.get("url") == url and 0 <= umur < umur_jam * 3600:
            with open(jd, encoding="utf-8") as f:
                return json.load(f), atr(meta["diambil"])
    except (OSError, ValueError, KeyError):
        pass
    if not _robots_boleh(url, jeda):
        raise jaring.Ditolak(f"{url}: robots.txt melarang, dihormati")
    galat = None
    for i in range(len(JEDA_ULANG) + 1):
        try:
            kode, isi = _minta(url, jeda)
            break
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 429):
                raise jaring.Ditolak(f"{url}: HTTP {e.code}, dihormati tanpa ulang")
            if e.code < 500:
                raise GagalAmbil(f"{url}: HTTP {e.code}")
            galat = f"HTTP {e.code}"
        except (Dilarang, GagalAmbil):
            raise
        except OSError as e:
            galat = f"{type(e).__name__}: {e}"
        if i < len(JEDA_ULANG):
            print(f"  {url}: {galat}, ulang dalam {JEDA_ULANG[i]} detik", file=sys.stderr)
            _tidur(JEDA_ULANG[i])
    else:
        raise GagalAmbil(f"{url}: gagal sesudah {len(JEDA_ULANG)} kali ulang, terakhir {galat}")
    try:
        data = json.loads(isi)
    except ValueError as e:
        raise BentukBerubah(f"{url}: bukan JSON ({e})") from None
    diambil = _kini()
    _tulis(jd, isi)
    _tulis(jm, json.dumps({"url": url, "diambil": diambil, "status": kode}).encode())
    return data, atr(diambil)


def _ckan(aksi, **param):
    """Jawaban CKAN mentah (memuat email dan nama orang). Privat: hanya ckan_paket dan ckan_organisasi yang memanggil."""
    if aksi not in CKAN_AKSI:
        raise Dilarang(f"aksi CKAN {aksi!r} di luar {sorted(CKAN_AKSI)}")
    liar = sorted(k for k in param if k.lower().startswith("include_"))
    if liar:
        raise Dilarang(f"parameter CKAN {liar} ditolak (membuka pengguna atau extras)")
    url = CKAN + aksi + ("?" + urllib.parse.urlencode(sorted(param.items())) if param else "")
    data, atr = ambil_json(url, "ckan", nama=CKAN_NAMA, lisensi="per paket (license_id)")
    if not isinstance(data, dict) or data.get("success") is not True or "result" not in data:
        raise BentukBerubah(f"{url}: jawaban CKAN tanpa success/result")
    r = data["result"]
    if aksi == "organization_list" and not (isinstance(r, list) and all(isinstance(o, dict) and isinstance(o.get("name"), str) for o in r)):
        raise BentukBerubah(f"{url}: organization_list bukan daftar organisasi bernama")
    if aksi == "package_search" and not (isinstance(r, dict) and isinstance(r.get("count"), int) and isinstance(r.get("results"), list)):
        raise BentukBerubah(f"{url}: package_search tanpa count/results")
    return {"result": r, "sumber": [atr]}


def _frekuensi(p):
    f = p.get("frequency")
    if not f:
        f = next((e.get("value") for e in p.get("extras") or [] if isinstance(e, dict) and e.get("key") == "frequency"), None)
    return f or None


def _paket(p):
    if not isinstance(p, dict) or not isinstance(p.get("name"), str) or not isinstance(p.get("metadata_modified"), str):
        raise BentukBerubah("paket CKAN tanpa name/metadata_modified")
    o = p.get("organization") or {}
    keluar = {k: p.get(k) for k in PAKET_KOLOM}
    keluar.update({"organisasi": o.get("name") if isinstance(o, dict) else None, "frequency": _frekuensi(p),
                   "notes_ada": bool((p.get("notes") or "").strip()), "maintainer_ada": bool((p.get("maintainer") or "").strip())})
    return keluar


def ckan_paket(rows=1000, maks_halaman=20):
    """Semua paket lewat package_search berhalaman; kolom daftar putih PAKET_KOLOM + organisasi, frequency, *_ada."""
    paket, sumber, n = [], [], None
    for hal in range(maks_halaman):
        r = _ckan("package_search", rows=rows, start=hal * rows)
        sumber += r["sumber"]
        n = r["result"]["count"] if n is None else n
        isi = r["result"]["results"]
        paket += [_paket(p) for p in isi]
        if not isi or len(paket) >= n:
            break
    else:
        raise BentukBerubah(f"package_search melebihi {maks_halaman} halaman ({n} paket)")
    if len(paket) != n:
        raise BentukBerubah(f"package_search: count {n}, terbaca {len(paket)}")
    return {"paket": paket, "jumlah": n, "sumber": sumber}


ORG_KOLOM = ("id", "name", "title", "package_count")


def ckan_organisasi():
    """Daftar organisasi CKAN, kolom daftar putih ORG_KOLOM saja (tanpa users, extras, gambar, deskripsi)."""
    r = _ckan("organization_list", all_fields="true")
    return {"organisasi": [{k: o.get(k) for k in ORG_KOLOM} for o in r["result"]], "sumber": r["sumber"]}


# ---------- cek tanpa jaringan ----------

class _Jawab:
    def __init__(self, isi, url, kode=200, panjang=None):
        self._b, self._u, self.status = io.BytesIO(isi), url, kode
        self.headers = {"Content-Length": str(panjang if panjang is not None else len(isi))}

    def geturl(self):
        return self._u

    def read(self, n=-1):
        return self._b.read(n)

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def _galat(url, kode):
    return urllib.error.HTTPError(url, kode, "x", {}, None)


def cek():
    import tempfile
    global CACHE, _buka, _tidur, _jam
    asli = (CACHE, _buka, _tidur, jaring.jeda, _jam)
    with open(os.path.join(FIXTURE, "organization_list.json"), "rb") as f:
        ol = f.read()
    with open(os.path.join(FIXTURE, "package_search.json"), "rb") as f:
        ps = f.read()
    panggil, tidur = [], []
    skenario = {}
    G = "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query"

    def buka(req, timeout=None):
        url = req.full_url
        panggil.append(url)
        assert req.get_header("User-agent") == UA, "User-Agent harus tetap UA"
        f = skenario.get(url)
        if f is None:
            if url.endswith("/robots.txt"):
                return _Jawab(b"User-agent: *\nDisallow: /dilarang/\n", url)
            raise AssertionError(f"permintaan tak terduga {url}")
        return f(url)

    try:
        with tempfile.TemporaryDirectory() as d:
            CACHE, _buka, _tidur = d, buka, tidur.append
            jaring.jeda = lambda host, detik: None
            _robots.clear()
            # 1. DILARANG ditolak sebelum permintaan apa pun (termasuk robots)
            for u in ("https://gis.bnpb.go.id/server/rest/services/survey123/perangkat_penilaian_awal_final/FeatureServer/10/query?f=json",
                      "https://inalogpal.bnpb.go.id/Api/get_instansi_survey",
                      "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=%2A&returnGeometry=false",
                      "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=kab&returnGeometry=true",
                      "http://data.bnpb.go.id/api/3/action/package_search", "https://contoh.org/a.json",
                      # tembus regex URL mentah: port, jalur berlapis, index.php, kode berlapis, token *, geometri bawaan
                      "https://inalogpal.bnpb.go.id:443/Api/get_instansi_survey", "https://inalogpal.bnpb.go.id//Api//get_instansi_survey",
                      "https://inalogpal.bnpb.go.id/index.php/Api/GET_INSTANSI_SURVEY", "https://inalogpal.bnpb.go.id/Api/%67et_instansi_survey",
                      "https://gis.bnpb.go.id/server/rest/services/%2573urvey123/x?f=json",
                      "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=kab,*&returnGeometry=false", "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=kab,%2A&returnGeometry=false",
                      "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=kab%2C%252A&returnGeometry=false", "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=kab", "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=kab&returnGeometry=TRUE",
                      "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=kab&returnGeometry=false&returnGeometry=true", "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query/?outFields=kab&returngeometry=",
                      "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?returnGeometry=false", "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query?outFields=&returnGeometry=false",
                      # port selain 443, userinfo, host palsu lewat @
                      "https://data.bnpb.go.id:8443/api/3/action/package_search", "https://data.bnpb.go.id:99999/x",
                      "https://u:p@data.bnpb.go.id/api/3/action/package_search", "https://data.bnpb.go.id@contoh.org/x",
                      "https://bnpb.go.id/berita/x"):
                try:
                    ambil_json(u, "uji")
                    raise AssertionError(f"tidak ditolak: {u}")
                except Dilarang:
                    pass
            assert panggil == [], f"URL dilarang sempat diminta: {panggil}"
            for u in (f"{G}?where=1%3D1&outFields=kab,jumlah&returnGeometry=false&f=json", "https://data.bnpb.go.id:443/api/3/action/package_search",
                      "https://gis.bnpb.go.id/server/rest/services?f=json"):
                assert diizinkan(u), u  # URL sah tetap lolos
            # 2. CKAN dari tangkapan; cache segar tidak memanggil jaringan
            u_ol = CKAN + "organization_list?all_fields=true"
            skenario[u_ol] = lambda u: _Jawab(ol, u)
            r = ckan_organisasi()
            assert r["organisasi"] and all(set(o) == set(ORG_KOLOM) for o in r["organisasi"]), r
            s = r["sumber"][0]
            assert set(s) == {"nama", "url", "diambil", "lisensi"} and s["url"] == u_ol and s["nama"] == CKAN_NAMA, s
            n = len(panggil)
            assert ckan_organisasi()["organisasi"] == r["organisasi"]
            assert len(panggil) == n, "cache segar memanggil jaringan"
            assert os.path.exists(_jalur("ckan", u_ol)[1]), "meta cache tidak tertulis"
            # 3. ckan_paket: kolom daftar putih, tanpa email dan nama orang
            jumlah = json.loads(ps)["result"]["count"]
            u_ps = CKAN + "package_search?" + urllib.parse.urlencode([("rows", 1000), ("start", 0)])
            skenario[u_ps] = lambda u: _Jawab(ps, u)
            hasil = ckan_paket()
            assert hasil["jumlah"] == jumlah == len(hasil["paket"]), hasil["jumlah"]
            teks = json.dumps(hasil)
            for k in ("maintainer_email", "author_email", "creator_user_id", '"author"', '"maintainer"', "Penulis A", "Pengelola", "disamarkan"):
                assert k not in teks, f"{k} bocor dari ckan_paket"
            p0 = hasil["paket"][0]
            assert set(p0) == set(PAKET_KOLOM) | {"organisasi", "frequency", "notes_ada", "maintainer_ada"}, sorted(p0)
            assert any(p["frequency"] for p in hasil["paket"]) and any(p["frequency"] is None for p in hasil["paket"]), "frequency extras"
            # 4. coba ulang 2, 4, 8 detik untuk 5xx, lalu gagal keras menyebut URL dan kode
            u = CKAN + "package_search?rows=1"
            skenario[u] = lambda u: (_ for _ in ()).throw(_galat(u, 503))
            tidur.clear()
            try:
                ambil_json(u, "uji")
                raise AssertionError("5xx tidak gagal keras")
            except GagalAmbil as e:
                assert u in str(e) and "503" in str(e), e
            assert tidur == [2, 4, 8], tidur
            # 5xx lalu pulih
            hit = []
            def pulih(u):
                hit.append(1)
                if len(hit) < 3:
                    raise _galat(u, 502)
                return _Jawab(b'{"success": true, "result": {"count": 0, "results": []}}', u)
            u = CKAN + "package_search?rows=2"
            skenario[u] = pulih
            tidur.clear()
            assert ambil_json(u, "uji")[0]["result"]["count"] == 0 and tidur == [2, 4]
            # 5. 401, 403, 429 dihormati: tanpa ulang
            for kode in (401, 403, 429):
                u = CKAN + f"package_search?rows={kode}"
                skenario[u] = lambda u, k=kode: (_ for _ in ()).throw(_galat(u, k))
                tidur.clear()
                try:
                    ambil_json(u, "uji")
                    raise AssertionError(f"HTTP {kode} tidak ditolak")
                except jaring.Ditolak as e:
                    assert str(kode) in str(e) and u in str(e)
                assert tidur == [], f"HTTP {kode} diulang"
            # 4xx lain gagal keras tanpa ulang
            u = CKAN + "package_search?rows=404"
            skenario[u] = lambda u: (_ for _ in ()).throw(_galat(u, 404))
            tidur.clear()
            try:
                ambil_json(u, "uji")
                raise AssertionError("404 tidak gagal")
            except GagalAmbil as e:
                assert "404" in str(e) and tidur == []
            # 6. robots.txt melarang: tidak diminta
            n = len(panggil)
            try:
                ambil_json("https://data.bnpb.go.id/dilarang/x.json", "uji")
                raise AssertionError("robots diabaikan")
            except jaring.Ditolak:
                pass
            assert len(panggil) == n, "URL terlarang robots sempat diminta"
            # robots 403 = jangan ambil apa pun di host itu
            skenario["https://gis.bnpb.go.id/robots.txt"] = lambda u: (_ for _ in ()).throw(_galat(u, 403))
            try:
                ambil_json("https://gis.bnpb.go.id/server/rest/services?f=json", "uji")
                raise AssertionError("robots 403 diabaikan")
            except jaring.Ditolak:
                pass
            # 7. host akhir: pengalihan ke host lain atau ke pola dilarang ditolak, tidak di-cache
            u = CKAN + "package_search?rows=3"
            skenario[u] = lambda u: _Jawab(b"{}", "https://contoh.org/ambil")
            try:
                ambil_json(u, "uji")
                raise AssertionError("pengalihan ke host lain lolos")
            except Dilarang:
                pass
            u = CKAN + "package_search?rows=4"
            skenario[u] = lambda u: _Jawab(b"{}", "https://data.bnpb.go.id/survey123/x")
            try:
                ambil_json(u, "uji")
                raise AssertionError("pengalihan ke pola dilarang lolos")
            except Dilarang:
                pass
            assert not os.path.exists(_jalur("uji", u)[0])
            # 8. batas ukuran: Content-Length besar ditolak, isi lebih besar dari batas ditolak walau tanpa kepala jujur
            u = CKAN + "package_search?rows=5"
            skenario[u] = lambda u: _Jawab(b"{}", u, panjang=BATAS_BYTE + 1)
            for kasus in ("kepala", "isi"):
                if kasus == "isi":
                    skenario[u] = lambda u: _Jawab(b" " * (BATAS_BYTE + 1), u, panjang=0)
                try:
                    ambil_json(u, "uji")
                    raise AssertionError(f"batas ukuran ({kasus}) lolos")
                except GagalAmbil as e:
                    assert "batas" in str(e)
            # 9. bentuk berubah: keluar bukan 0 lewat galat, tidak pernah 0 diam-diam
            for isi in (b'{"success": false}', b'{"success": true, "result": {"hitung": 1}}', b"<html>bukan json</html>"):
                u = CKAN + "package_search?q=" + hashlib.sha1(isi).hexdigest()[:6]
                skenario[u] = lambda u, b=isi: _Jawab(b, u)
                try:
                    _ckan("package_search", q=hashlib.sha1(isi).hexdigest()[:6])
                    raise AssertionError(f"bentuk berubah lolos: {isi!r}")
                except BentukBerubah:
                    pass
            for aksi, param in (("package_show", {"id": "x"}), ("organization_list", {"include_users": "true"}),
                                ("package_search", {"include_extras": "true"}), ("organization_list", {"Include_Users": "1"})):
                try:
                    _ckan(aksi, **param)
                    raise AssertionError(f"CKAN {aksi} {param} lolos")
                except Dilarang:
                    pass
            assert "ckan" not in globals(), "ckan() mentah harus privat (_ckan)"
            # 10. pengalihan diperiksa SEBELUM diikuti (handler sungguhan, bukan geturl sesudahnya)
            asal = urllib.request.Request(CKAN + "package_search?rows=1")
            for baru, galat in (("https://contoh.org/x", Dilarang), ("http://data.bnpb.go.id/x", Dilarang),
                                ("https://gis.bnpb.go.id/server/rest/services?f=json", Dilarang),
                                ("/survey123/x", Dilarang), ("https://data.bnpb.go.id:8443/x", Dilarang),
                                ("https://data.bnpb.go.id/dilarang/x", jaring.Ditolak)):
                n = len(panggil)
                try:
                    _ALIH.redirect_request(asal, None, 302, "Found", {}, baru)
                    raise AssertionError(f"pengalihan ke {baru} lolos")
                except galat:
                    pass
                assert len(panggil) == n, f"pengalihan ke {baru} sempat diminta"
            ok = _ALIH.redirect_request(asal, None, 302, "Found", {}, "/api/3/action/package_search?rows=9")
            assert ok is not None and ok.full_url == CKAN + "package_search?rows=9", ok
            assert any(isinstance(h, _Alih) for h in urllib.request.build_opener(urllib.request.ProxyHandler({}), _ALIH).handlers)
            # 11. tenggat baca total: jam monotonic melompat melewati BATAS_BACA
            u = CKAN + "package_search?rows=6"
            skenario[u] = lambda u: _Jawab(b"{}", u)
            t = iter([0, 0, BATAS_BACA + 1] + [10 ** 9] * 10)
            _jam = lambda: next(t)  # noqa: E731
            try:
                ambil_json(u, "uji")
                raise AssertionError("tenggat baca lolos")
            except GagalAmbil as e:
                assert "tenggat" in str(e), e
            _jam = asli[4]
        # 12. cache hanya di data/raw (di-gitignore), bukan public/
        assert asli[0].startswith(os.path.join(AKAR, "data", "raw") + os.sep), asli[0]
        assert "public" not in os.path.relpath(asli[0], AKAR).split(os.sep)
    finally:
        CACHE, _buka, _tidur, jaring.jeda, _jam = asli
        _robots.clear()
    print("panen.py --cek: lulus")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
