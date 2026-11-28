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
  ambil_html(url, sumber, umur_jam=20, jeda=1.0)  -> (teks, {nama, url, diambil, lisensi})  halaman hasil cari JDIH (MB-3)
  ckan_paket(rows=1000)                          -> {"paket": [...], "jumlah": n, "sumber": [...]}  kolom daftar putih, tanpa email dan nama orang
  ckan_organisasi()                              -> {"organisasi": [{id, name, title, package_count}], "sumber": [...]}
  (_ckan mentah privat: satu-satunya pintu keluar CKAN adalah dua fungsi daftar putih di atas)
  arcgis_daftar(folder=None)                     -> {"folder": [...], "layanan": [{nama, tipe}], "sumber": [...]}  daftar layanan gis.bnpb.go.id, tanpa isi layer
  arcgis_agregat(layanan, lapis, kolom, statistik=None) -> {"baris": [atribut], "sumber": [...]}  returnGeometry=false, outFields daftar putih (tanpa *), geometri tak pernah dibawa
  inalogpal(api)                                 -> (data, atribusi)  hanya endpoint di INALOGPAL_API; get_instansi_survey ditolak (nama dan nomor PIC)
  sirup(tahun, jalur)                            -> {"paket": [...], "jumlah": n, "sumber": [...]}  membaca cache docs/pendanaan/sirup_tarik.py; kolom daftar putih SIRUP_KOLOM, tanpa nama penyedia, paket, kegiatan
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
JDIH_SITUS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jdih_situs.json")


def _host_jdih(path=JDIH_SITUS):
    """Host situs JDIH provinsi dari daftar tulis tangan (RU-025); hanya *.go.id, selain itu galat (bukan diam-diam lolos)."""
    try:
        with open(path, encoding="utf-8") as f:
            daftar = json.load(f)
    except FileNotFoundError:
        return set()
    host = {urllib.parse.urlsplit(s["url"]).hostname for s in daftar if s.get("url")}
    liar = sorted(h for h in host if not h or not h.endswith(".go.id"))
    if liar:
        raise ValueError(f"jdih_situs.json: host di luar .go.id {liar}")
    return host


HOST_IZIN |= _host_jdih()
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
_sekarang = lambda: datetime.now(timezone.utc)  # noqa: E731  diganti jam palsu di cek (umur cache)
_robots = {}


class Dilarang(ValueError):
    """URL masuk daftar DILARANG atau di luar host izin: tidak pernah diminta."""


class BentukBerubah(RuntimeError):
    """Sumber menjawab dengan bentuk lain dari yang diharapkan: berkas lama dipertahankan."""


class GagalAmbil(RuntimeError):
    """5xx atau galat jaringan sesudah semua coba ulang; pesan memuat URL dan kode."""


def _kini():
    return _sekarang().strftime("%Y-%m-%dT%H:%M:%SZ")


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
        robots = "/robots.txt" in (urllib.parse.urlsplit(req.full_url).path, urllib.parse.urlsplit(newurl).path)
        if not robots and not _robots_boleh(newurl, 0):  # pengalihan robots.txt sendiri tidak memicu robots lagi (rekursi)
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


def _minta(url, jeda, terima="application/json"):
    """Satu permintaan mentah dengan batas ukuran dan pemeriksaan host akhir. -> (kode, bytes)."""
    host = diizinkan(url)
    jaring.jeda(host, jeda)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": terima})
    with _buka(req, timeout=BATAS_DETIK) as r:
        akhir = r.geturl()
        if urllib.parse.urlsplit(akhir).hostname != host:
            raise Dilarang(f"{url}: dialihkan ke host lain {akhir}")
        diizinkan(akhir)
        panjang = r.headers.get("Content-Length")
        if panjang and panjang.isdigit() and int(panjang) > BATAS_BYTE:
            raise GagalAmbil(f"{url}: respons {panjang} byte melewati batas {BATAS_BYTE}")
        return getattr(r, "status", 200), _baca(r, url)


def _wildcard(rp):
    """robotparser stdlib tidak mengenal * dan $ (RFC 9309 2.2.3) dan memakai aturan pertama yang cocok, bukan yang terpanjang:
    'Allow: /' lalu 'Disallow: /cari?q=*' akan lolos. Aturan diurut terpanjang dulu (seri: Allow menang) dan diberi pencocok pola."""
    for e in rp.entries + ([rp.default_entry] if rp.default_entry else []):
        e.rulelines.sort(key=lambda r: (-len(urllib.parse.unquote(r.path)), not r.allowance))
        for r in e.rulelines:
            pola = urllib.parse.unquote(r.path)
            if "*" in pola or pola.endswith("$"):
                r.applies_to = lambda f, pola=pola: _glob(pola, urllib.parse.unquote(f))


def _glob(pola, s):
    """Pencocok pola robots (* = apa saja, $ di akhir = jangkar) dengan dua penunjuk dan titik balik di * terakhir.
    Tanpa regex: pola dari situs luar tidak bisa memicu backtracking eksponensial (ReDoS). Paling buruk O(len(pola) x len(s))."""
    if pola.endswith("$"):
        pola = pola[:-1]
    else:
        pola += "*"  # tanpa $ cocok sebagai awalan
    i = j = 0
    bintang, balik = -1, 0
    while j < len(s):
        if i < len(pola) and pola[i] != "*" and pola[i] == s[j]:
            i, j = i + 1, j + 1
        elif i < len(pola) and pola[i] == "*":
            bintang, balik, i = i, j, i + 1
        elif bintang >= 0:
            balik += 1
            i, j = bintang + 1, balik
        else:
            return False
    while i < len(pola) and pola[i] == "*":
        i += 1
    return i == len(pola)


def _robots_boleh(url, jeda):
    p = urllib.parse.urlsplit(url)
    rp = _robots.get(p.hostname)
    if rp is None:
        tunggu = urllib.robotparser.RobotFileParser()
        tunggu.disallow_all, tunggu.sebab = True, "robots.txt sedang diambil"
        _robots[p.hostname] = tunggu  # tempat diisi dulu: pengalihan berlapis dari robots.txt tidak memanggil ulang tanpa akhir
        rp = urllib.robotparser.RobotFileParser()
        rp.sebab = None
        try:
            _, isi = _minta(f"https://{p.hostname}/robots.txt", jeda, "text/plain, */*")
            rp.parse(isi.decode("utf-8", "replace").splitlines())
            _wildcard(rp)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403) or e.code >= 500:
                rp.disallow_all = True   # RFC 9309: tak terjangkau atau ditolak = jangan ambil
                rp.sebab = f"robots.txt HTTP {e.code}"
            else:
                rp.allow_all = True      # 404 dan 4xx lain: tanpa aturan
        except (OSError, GagalAmbil) as e:
            rp.disallow_all = True
            rp.sebab = f"robots.txt tak terjangkau ({type(e).__name__})"
        except jaring.Ditolak:
            rp.disallow_all = True  # robots.txt dialihkan berlapis ke halaman yang diperiksa robots-nya sendiri: jangan ambil
            rp.sebab = "robots.txt dialihkan berlapis"
        _robots[p.hostname] = rp
    return rp.can_fetch(UA, url)


def _robots_tolak(url):
    """Galat saat robots melarang: robots tak terjangkau = GagalAmbil (sumber gagal), selain itu Ditolak (penolakan dihormati)."""
    sebab = getattr(_robots.get(urllib.parse.urlsplit(url).hostname), "sebab", None)
    if sebab and "tak terjangkau" in sebab:
        return GagalAmbil(f"{url}: {sebab}, tidak diambil")
    return jaring.Ditolak(f"{url}: {sebab or 'robots.txt melarang'}, dihormati")


def _jalur(sumber, url, akhiran=".json"):
    if not re.match(r"^[a-z0-9_]+$", sumber):
        raise ValueError(f"nama sumber {sumber!r} tidak sah")
    h = hashlib.sha1(url.encode()).hexdigest()
    d = os.path.join(CACHE, sumber)
    return os.path.join(d, h + akhiran), os.path.join(d, h + ".meta")


def _tulis(path, isi):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(isi)
    os.replace(tmp, path)


def _ambil(url, sumber, umur_jam, jeda, akhiran, terima, urai):
    """Pintu bersama ambil_json/ambil_html: cache, robots, coba ulang, tulis cache. -> (urai(bytes), diambil)."""
    diizinkan(url)
    jd, jm = _jalur(sumber, url, akhiran)
    try:
        with open(jm, encoding="utf-8") as f:
            meta = json.load(f)
        umur = (_sekarang() - datetime.strptime(meta["diambil"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).total_seconds()
        if meta.get("url") == url and 0 <= umur < umur_jam * 3600:
            with open(jd, "rb") as f:
                return urai(f.read()), meta["diambil"]
    except (OSError, ValueError, KeyError):
        pass
    if not _robots_boleh(url, jeda):
        raise _robots_tolak(url)
    galat = None
    for i in range(len(JEDA_ULANG) + 1):
        try:
            kode, isi = _minta(url, jeda, terima)
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
    data = urai(isi)
    diambil = _kini()
    _tulis(jd, isi)
    _tulis(jm, json.dumps({"url": url, "diambil": diambil, "status": kode}).encode())
    return data, diambil


def _json(isi, url):
    try:
        return json.loads(isi)
    except ValueError as e:
        raise BentukBerubah(f"{url}: bukan JSON ({e})") from None


def ambil_json(url, sumber, umur_jam=20, jeda=1.0, nama=None, lisensi="tidak tertulis"):
    """-> (data JSON, atribusi). Cache segar dikembalikan tanpa jaringan."""
    data, diambil = _ambil(url, sumber, umur_jam, jeda, ".json", "application/json", lambda b: _json(b, url))
    return data, {"nama": nama or sumber, "url": url, "diambil": diambil, "lisensi": lisensi}


def _html(isi, url):
    if isi.lstrip()[:1] in (b"{", b"["):
        raise BentukBerubah(f"{url}: diharapkan HTML, terima JSON")
    return isi.decode("utf-8", "replace")


def ambil_html(url, sumber, umur_jam=20, jeda=1.0, nama=None, lisensi="tidak tertulis"):
    """-> (teks HTML, atribusi). Aturan sama dengan ambil_json (izin, robots, pengalihan, batas, cache); Accept text/html."""
    teks, diambil = _ambil(url, sumber, umur_jam, jeda, ".html", "text/html", lambda b: _html(b, url))
    return teks, {"nama": nama or sumber, "url": url, "diambil": diambil, "lisensi": lisensi}


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


# ---------- ArcGIS BNPB, INALOGPAL, SIRUP (RU-036; DT sec 4.8 dan 8) ----------

ARCGIS = "https://gis.bnpb.go.id/server/rest/services"
ARCGIS_NAMA = "Layanan GIS BNPB, gis.bnpb.go.id"
ARCGIS_LISENSI = "lisensi tidak tertulis; layar staf saja (U4)"
_POLA_LAYANAN = re.compile(r"^[\w-]+(/[\w-]+)*/(FeatureServer|MapServer)$")
_POLA_KOLOM = re.compile(r"^\w+$")
_PRIBADI = re.compile(r"nama|telp|hp|nik|email|alamat|foto|lahir|pic", re.I)  # kolom data pribadi (KP sec 4), ditolak di arcgis_agregat
_STATISTIK = {"sum", "count", "min", "max", "avg"}
INALOGPAL = "https://inalogpal.bnpb.go.id/Api/"
INALOGPAL_API = ("get_progress", "get_count_cluster_all", "get_count_cluster_sk_all", "gudang_sumbar")
SIRUP_NAMA = "SIRUP LKPP, sirup.inaproc.id"
# Daftar putih kolom RUP, tanpa nama paket dan kegiatan (teks bebas; belum ada pemanggil yang butuh: sdu1.py dan ren2.py membaca sirup.paket langsung); yang lain (termasuk bila suatu hari ada nama penyedia/pemenang) dibuang di sini, tidak keluar modul.
SIRUP_KOLOM = ("id", "tahun", "jalur", "pagu", "metode", "jenisPengadaan", "lokasi", "idBulan", "pemilihan",
               "isPDN", "isUMK", "sumberDana", "satuanKerja", "tipe")


def arcgis_daftar(folder=None):
    """Daftar folder dan layanan (nama, tipe) di gis.bnpb.go.id; isi layer tidak diminta."""
    if folder is not None and not _POLA_KOLOM.fullmatch(folder.replace("-", "_")):
        raise Dilarang(f"nama folder ArcGIS {folder!r} tidak sah")
    url = ARCGIS + (f"/{folder}" if folder else "") + "?f=json"
    d, atr = ambil_json(url, "arcgis_daftar", nama=ARCGIS_NAMA, lisensi=ARCGIS_LISENSI)
    if not isinstance(d, dict) or "error" in d or not isinstance(d.get("services"), list) or not isinstance(d.get("folders", []), list):
        raise BentukBerubah(f"{url}: bukan daftar layanan ArcGIS")
    return {"folder": [str(x) for x in d.get("folders", [])],
            "layanan": [{"nama": str(x.get("name")), "tipe": str(x.get("type"))} for x in d["services"] if isinstance(x, dict)], "sumber": [atr]}


def arcgis_agregat(layanan, lapis, kolom, statistik=None):
    """Kueri atribut satu layer. layanan 'folder/nama/FeatureServer'; kolom = daftar putih nama kolom (tanpa *, wajib tidak kosong).
    statistik = [(jenis, kolom, alias)] -> outStatistics, kolom jadi groupBy. returnGeometry selalu false; hanya atribut yang dikembalikan."""
    if not _POLA_LAYANAN.fullmatch(layanan or ""):
        raise Dilarang(f"layanan ArcGIS {layanan!r} tidak sah")
    if not isinstance(lapis, int) or isinstance(lapis, bool) or lapis < 0:
        raise Dilarang(f"lapis ArcGIS {lapis!r} tidak sah")
    if not kolom or any(not isinstance(k, str) or not _POLA_KOLOM.fullmatch(k) for k in kolom):
        raise Dilarang(f"outFields {kolom!r}: wajib daftar putih nama kolom, tanpa * atau kosong")
    if any(_PRIBADI.search(k) for k in kolom):
        raise Dilarang(f"outFields {kolom!r}: kolom data pribadi ditolak")
    q = {"where": "1=1", "outFields": ",".join(kolom), "returnGeometry": "false", "f": "json"}
    if statistik:
        if any(j not in _STATISTIK or not _POLA_KOLOM.fullmatch(c) or not _POLA_KOLOM.fullmatch(a) for j, c, a in statistik):
            raise Dilarang(f"statistik {statistik!r} tidak sah")
        q["outStatistics"] = json.dumps([{"statisticType": j, "onStatisticField": c, "outStatisticFieldName": a} for j, c, a in statistik], separators=(",", ":"))
        q["groupByFieldsForStatistics"] = ",".join(kolom)
    url = f"{ARCGIS}/{layanan}/{lapis}/query?" + urllib.parse.urlencode(sorted(q.items()), safe=",")
    d, atr = ambil_json(url, "arcgis_" + layanan.split("/")[0], nama=ARCGIS_NAMA + "/" + layanan, lisensi=ARCGIS_LISENSI)
    if not isinstance(d, dict) or "error" in d or not isinstance(d.get("features"), list):
        raise BentukBerubah(f"{url}: bukan jawaban query ArcGIS")
    if d.get("exceededTransferLimit"):
        raise BentukBerubah(f"{url}: jawaban terpotong batas ArcGIS (exceededTransferLimit)")
    baris = []
    for f in d["features"]:
        if not isinstance(f, dict) or not isinstance(f.get("attributes"), dict):
            raise BentukBerubah(f"{url}: fitur tanpa attributes")
        baris.append(f["attributes"])  # geometry, bila ada, tidak pernah dibawa
    return {"baris": baris, "sumber": [atr]}


def inalogpal(api):
    """-> (data, atribusi) untuk satu endpoint INALOGPAL di INALOGPAL_API; selain itu Dilarang (get_instansi_survey memuat nama dan nomor PIC)."""
    if api not in INALOGPAL_API:
        raise Dilarang(f"endpoint INALOGPAL {api!r} di luar {list(INALOGPAL_API)}")
    return ambil_json(INALOGPAL + api, "inalogpal_" + api, umur_jam=20, nama="INALOGPAL BNPB, Api/" + api, lisensi="syarat pakai tidak tertulis; layar staf saja (U4)")


def sirup(tahun, jalur, cache=None):
    """RUP BNPB dari cache docs/pendanaan/cache (hasil docs/pendanaan/sirup_tarik.py, tidak diubah; dijalankan manual karena di luar pagar ambil_json).
    Hanya kolom SIRUP_KOLOM yang keluar; nama paket dan kegiatan tidak dibawa."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import sirup as _s
    if not isinstance(tahun, int) or isinstance(tahun, bool):
        raise ValueError(f"tahun {tahun!r} bukan bilangan bulat")
    cache = cache or _s.CACHE
    try:
        baris = _s.paket(tahun, jalur, cache)
    except FileNotFoundError:
        raise GagalAmbil(f"cache SIRUP {jalur}-BNPB-{tahun}.json tidak ada; tarik manual: python3 docs/pendanaan/sirup_tarik.py") from None
    f = os.path.join(cache, f"{jalur}-BNPB-{tahun}.json")
    diambil = datetime.fromtimestamp(os.path.getmtime(f), timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"paket": [{k: b[k] for k in SIRUP_KOLOM if k in b} for b in baris], "jumlah": len(baris),
            "sumber": [{"nama": SIRUP_NAMA, "url": "https://sirup.inaproc.id/sirup/caripaketctr/index", "diambil": diambil, "lisensi": "tidak tertulis; layar staf saja (U4)"}]}


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
    global CACHE, _buka, _tidur, _jam, _sekarang
    asli = (CACHE, _buka, _tidur, jaring.jeda, _jam, _sekarang)
    with open(os.path.join(FIXTURE, "organization_list.json"), "rb") as f:
        ol = f.read()
    with open(os.path.join(FIXTURE, "package_search.json"), "rb") as f:
        ps = f.read()
    panggil, tidur, terima = [], [], []
    skenario = {}
    G = "https://gis.bnpb.go.id/server/rest/services/x/FeatureServer/0/query"

    def buka(req, timeout=None):
        url = req.full_url
        panggil.append(url)
        terima.append(req.get_header("Accept"))
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
            # 6b. pola * dan $ di robots dihormati (stdlib tidak); robots.txt yang dialihkan tidak berulang tanpa akhir
            skenario["https://jdihn.go.id/robots.txt"] = lambda u: _Jawab(b"User-agent: *\nAllow: /\nDisallow: /dokumen/cari%3Fq%3D%2A\nDisallow: /*.pdf$\nAllow: /a/izin.pdf\n", u)
            for u, boleh in (("https://jdihn.go.id/dokumen/cari?q=rencana", False), ("https://jdihn.go.id/a/b.pdf", False),
                             ("https://jdihn.go.id/dokumen/lihat/1", True), ("https://jdihn.go.id/a/b.pdf?x=1", True),
                             ("https://jdihn.go.id/a/izin.pdf", True)):
                assert _robots_boleh(u, 0) is boleh, (u, boleh)
            try:
                ambil_json("https://jdihn.go.id/dokumen/cari?q=rencana", "uji")
                raise AssertionError("robots wildcard diabaikan")
            except jaring.Ditolak:
                pass
            # robots.txt dialihkan dua langkah (/robots.txt -> /a -> /b): berhenti, tidak rekursi, host dianggap melarang
            G2 = "https://sirup.inaproc.id"

            class _Lapis:
                def __init__(self, url):
                    self.url = url

                def __enter__(self):
                    if self.url.endswith("/robots.txt"):
                        _ALIH.redirect_request(urllib.request.Request(self.url), None, 302, "Found", {}, "/a")
                    _ALIH.redirect_request(urllib.request.Request(G2 + "/a"), None, 302, "Found", {}, "/b")
                    raise AssertionError("pengalihan kedua lolos")

                def __exit__(self, *a):
                    return False
            skenario[G2 + "/robots.txt"] = _Lapis
            assert _robots_boleh(G2 + "/x", 0) is False and _robots[urllib.parse.urlsplit(G2).hostname].sebab == "robots.txt dialihkan berlapis"
            # ReDoS: pola penuh * dari situs luar selesai cepat (regex .* butuh > 20 detik pada n=40)
            jahat = "/" + "*a" * 40 + "*Z"
            t0 = time.monotonic()
            assert _glob(jahat, "/" + "a" * 4000) is False and time.monotonic() - t0 < 2, "pencocok robots tidak linear"
            for pola, teks, harap in (("/a*b$", "/axxb", True), ("/a*b$", "/axxbc", False), ("/a*b", "/axxbc", True), ("/a", "/b", False),
                                      ("/*.pdf$", "/x/y.pdf", True), ("*", "", True), ("/a$", "/a", True), ("/a$", "/ab", False)):
                assert _glob(pola, teks) is harap, (pola, teks)
            asal_r = urllib.request.Request("https://jdihn.go.id/robots.txt")
            ok = _ALIH.redirect_request(asal_r, None, 302, "Found", {}, "/beranda")
            assert ok is not None and ok.full_url == "https://jdihn.go.id/beranda", ok
            # robots tak terjangkau = GagalAmbil (tidak_bisa_dicek), bukan Ditolak
            skenario["https://inalogpal.bnpb.go.id/robots.txt"] = lambda u: (_ for _ in ()).throw(OSError("dns"))
            try:
                ambil_json("https://inalogpal.bnpb.go.id/Api/x", "uji")
                raise AssertionError("robots tak terjangkau lolos")
            except GagalAmbil as e:
                assert "tak terjangkau" in str(e), e
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
            # 13. ambil_html: Accept text/html, cache segar tanpa jaringan, JSON ditolak, aturan izin/robots sama
            h = sorted(HOST_IZIN - {"data.bnpb.go.id", "gis.bnpb.go.id", "inalogpal.bnpb.go.id", "jdihn.go.id", "sirup.inaproc.id", "spse.inaproc.id"})
            assert h and all(x.endswith(".go.id") for x in h), "host JDIH dari jdih_situs.json tidak masuk HOST_IZIN"
            u = f"https://{h[0]}/cari?q=rencana"
            skenario[u] = lambda u: _Jawab(b"<html><a href='/d/1'>Judul</a></html>", u)
            n = len(panggil)
            teks, atr = ambil_html(u, "uji_html", nama="JDIH uji")
            assert "Judul" in teks and atr["url"] == u and atr["nama"] == "JDIH uji", atr
            assert terima[-1] == "text/html", terima[-1]
            assert ambil_html(u, "uji_html")[0] == teks and len(panggil) == n + 2, "cache html segar memanggil jaringan"  # +robots +halaman
            assert os.path.exists(_jalur("uji_html", u, ".html")[0])
            # jam palsu: cache 30 hari lewat -> minta ulang
            kini = _sekarang()
            _sekarang = lambda: kini + __import__("datetime").timedelta(hours=721)  # noqa: E731
            ambil_html(u, "uji_html", umur_jam=720)
            assert len(panggil) == n + 3, "cache basi tidak memanggil jaringan"
            _sekarang = asli[5]
            u2 = f"https://{h[0]}/cari?q=json"
            skenario[u2] = lambda u: _Jawab(b'{"a": 1}', u)
            try:
                ambil_html(u2, "uji_html")
                raise AssertionError("JSON diterima sebagai HTML")
            except BentukBerubah:
                pass
            for liar in ('[{"url": "https://jdih.contoh.com/"}]', '[{"url": "https://evil.org/"}]'):
                f = os.path.join(d, "situs.json")
                with open(f, "w") as g:
                    g.write(liar)
                try:
                    _host_jdih(f)
                    raise AssertionError(f"host liar diterima: {liar}")
                except ValueError:
                    pass
            # 14. RU-036: arcgis_daftar, arcgis_agregat, inalogpal, sirup
            for h in ("gis", "inalogpal"):
                skenario.pop(f"https://{h}.bnpb.go.id/robots.txt", None)  # robots palsu uji lain
            _robots.clear()
            fx = os.path.join(AKAR, "tests", "bnpb", "fixtures", "unit")
            with open(os.path.join(fx, "arcgis", "daftar.json"), "rb") as f:
                ag_daftar = f.read()
            with open(os.path.join(fx, "arcgis", "query.json"), "rb") as f:
                ag_q = f.read()
            with open(os.path.join(fx, "inalogpal", "get_progress.json"), "rb") as f:
                il_p = f.read()
            skenario[ARCGIS + "?f=json"] = lambda u: _Jawab(ag_daftar, u)
            r = arcgis_daftar()
            assert r["folder"] == ["2026_gempabumi_ntt"] and r["layanan"] == [{"nama": "Contoh/Layanan", "tipe": "FeatureServer"}], r
            assert set(r["sumber"][0]) == {"nama", "url", "diambil", "lisensi"}
            lay = "2026_gempabumi_ntt/mv_x/FeatureServer"
            uq = f"{ARCGIS}/{lay}/40/query?" + urllib.parse.urlencode(sorted({"where": "1=1", "outFields": "id_kab,verif_rb", "returnGeometry": "false", "f": "json"}.items()), safe=",")
            skenario[uq] = lambda u: _Jawab(ag_q, u)
            r = arcgis_agregat(lay, 40, ["id_kab", "verif_rb"])
            assert r["baris"] == [{"id_kab": "5301", "verif_rb": 3}, {"id_kab": "5302", "verif_rb": 5}], r
            assert "geometry" not in json.dumps(r) and "5399" not in json.dumps(r), "geometri atau koordinat bocor"
            assert all("returnGeometry=false" in u for u in panggil if "/query" in u), "kueri tanpa returnGeometry=false"
            for salah in (dict(kolom=["*"]), dict(kolom=["Nama_Korban"]), dict(kolom=["id_kab", "NO_HP"]), dict(kolom=["tgl_lahir"]), dict(kolom=[]), dict(kolom=["a", "*"]), dict(kolom=["a b"]), dict(kolom=None), dict(kolom=["a"], lapis=-1),
                          dict(kolom=["a"], layanan="x/../y/FeatureServer"), dict(kolom=["a"], layanan="survey123/x/FeatureServer"),
                          dict(kolom=["a"], statistik=[("drop", "a", "b")])):
                n = len(panggil)
                try:
                    arcgis_agregat(**{"layanan": lay, "lapis": 40, **salah})
                    raise AssertionError(f"arcgis_agregat menerima {salah}")
                except Dilarang:
                    pass
                assert len(panggil) == n, "kueri ditolak tapi sempat diminta"
            us = f"{ARCGIS}/{lay}/40/query?" + urllib.parse.urlencode(sorted({"where": "1=1", "outFields": "id_kab", "returnGeometry": "false", "f": "json",
                 "outStatistics": '[{"statisticType":"sum","onStatisticField":"verif_rb","outStatisticFieldName":"rb"}]', "groupByFieldsForStatistics": "id_kab"}.items()), safe=",")
            skenario[us] = lambda u: _Jawab(ag_q, u)
            assert arcgis_agregat(lay, 40, ["id_kab"], statistik=[("sum", "verif_rb", "rb")])["baris"], "statistik"
            for i, isi in enumerate((b'{"error": {"code": 400}}', b'{"features": [{"geometry": {}}]}', b'{"features": [], "exceededTransferLimit": true}'), 50):
                uj = f"{ARCGIS}/{lay}/{i}/query?" + urllib.parse.urlencode(sorted({"where": "1=1", "outFields": "a", "returnGeometry": "false", "f": "json"}.items()), safe=",")
                skenario[uj] = lambda u, x=isi: _Jawab(x, u)
                try:
                    arcgis_agregat(lay, i, ["a"])
                    raise AssertionError(f"jawaban rusak lolos: {isi}")
                except BentukBerubah:
                    pass
            skenario[INALOGPAL + "get_progress"] = lambda u: _Jawab(il_p, u)
            dt, atr = inalogpal("get_progress")
            assert dt["response"] == "success" and atr["nama"] == "INALOGPAL BNPB, Api/get_progress" and atr["url"] == INALOGPAL + "get_progress", atr
            n = len(panggil)
            for salah in ("get_instansi_survey", "GET_INSTANSI_SURVEY", "../Api/get_instansi_survey", "", "get_progress?x=1", "gudang_sumbar/"):
                try:
                    inalogpal(salah)
                    raise AssertionError(f"inalogpal menerima {salah!r}")
                except Dilarang:
                    pass
            assert len(panggil) == n, "endpoint terlarang sempat diminta"
            sf = os.path.join(fx, "sirup")
            rs = sirup(2099, "penyedia", cache=sf)
            assert rs["jumlah"] == 2 and all(set(b) <= set(SIRUP_KOLOM) for b in rs["paket"]), rs
            tk = json.dumps(rs)
            for bocor in ("PT Rahasia", "namaPenyedia", "pemenang", "CV Contoh", "npwp", "Genset", "Tenda"):
                assert bocor not in tk, f"{bocor} keluar dari sirup()"
            assert rs["sumber"][0]["nama"] == SIRUP_NAMA
            for salah, galat in ((dict(tahun=2098, jalur="penyedia"), GagalAmbil), (dict(tahun=2099, jalur="tender"), ValueError), (dict(tahun="2099", jalur="penyedia"), ValueError), (dict(tahun=True, jalur="penyedia"), ValueError)):
                try:
                    sirup(cache=sf, **salah)
                    raise AssertionError(f"sirup menerima {salah}")
                except galat:
                    pass
        # 12. cache hanya di data/raw (di-gitignore), bukan public/
        assert asli[0].startswith(os.path.join(AKAR, "data", "raw") + os.sep), asli[0]
        assert "public" not in os.path.relpath(asli[0], AKAR).split(os.sep)
    finally:
        CACHE, _buka, _tidur, jaring.jeda, _jam, _sekarang = asli
        _robots.clear()
    print("panen.py --cek: lulus")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
