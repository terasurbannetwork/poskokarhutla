"""Laporan Berkala BNPB: panen daftar siaran pers bnpb.go.id untuk Bab 6 dan Lampiran (LB-09, Q8, Q16, ALGORITMA 13).

  python3 -I scripts/berkala/kegiatan.py panen [--dari YYYY-MM-DD] [--sampai YYYY-MM-DD] (--lokal DIR | --wrangler BIN) [--bucket B]
      bawaan --dari = akhir cakupan arsip terakhir (tumpang satu hari), atau tanggal 1 bulan lalu bila arsip belum ada;
      bawaan --sampai = hari ini WIB. Menulis R2 berkala/kegiatan/<YYYY-MM>.json (gabung dengan isi lama, tautan sama = satu butir).
  python3 -I scripts/berkala/kegiatan.py uji      # tanpa jaringan, fixture tests/berkala/fixtures/bnpb_berita.html

Yang disimpan hanya judul, tanggal, jam, tautan, dan tiga usulan mesin dari judul (pelaksana, jenis bencana, lokasi); isi berita tidak
pernah diunduh atau disalin (Q16, KEAMANAN-PRIVASI 6). Usulan bukan isi laporan: baris masuk laporan hanya bila dipilih staf (Q8).
Sopan: robots.txt dibaca dulu, jeda 3 detik antarhalaman lewat scripts/umum/jaring.py, paling banyak MAKS_HALAMAN halaman per panen.
Log hanya mencetak jumlah butir per bulan.
"""
import argparse
import datetime as dt
import html
import importlib.util
import json
import os
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.error
import urllib.request
import urllib.robotparser

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WIB = dt.timezone(dt.timedelta(hours=7))
INDEKS = "https://bnpb.go.id/berita/page/{n}"
AWAL_TAUTAN = "https://bnpb.go.id/berita/"
JEDA = 3.0            # detik antarhalaman; naik bila robots.txt memuat Crawl-delay lebih besar
MAKS_BAIT = 5 * 1024 * 1024
UA = "pantau-bencana"
MAKS_HALAMAN = 400   # sekitar 8.000 butir; panen mundur satu tahun penuh masih muat
KUNCI = "berkala/kegiatan/{bulan}.json"
KUNCI_SAH = re.compile(r"^berkala/kegiatan/\d{4}-(0[1-9]|1[0-2])\.json$")
PELAKSANA = ("Kepala BNPB", "Pusdatinkom", "Satgas operasi")


def _muat(nama, rel):
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    md = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(md)
    return md


J = _muat("umum_jaring", "scripts/umum/jaring.py")
G = _muat("siklus_gudang", "scripts/siklus/gudang.py")
W = _muat("data_wilayah", "scripts/data/wilayah.py")

# ------------------------------------------------------------------ baca halaman indeks
BULAN = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "mei": 5, "may": 5, "jun": 6, "jul": 7, "agu": 8, "ags": 8, "aug": 8,
         "sep": 9, "okt": 10, "oct": 10, "nov": 11, "des": 12, "dec": 12}
_BLOK = re.compile(r'class="block mb-4"')
_ALT = re.compile(r'\balt="([^"]*)"')
_TGL = re.compile(r'class="date[^"]*">(?:\s*<i[^>]*></i>)?\s*(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})\s*\|\s*(\d{2}:\d{2})')
_HREF = re.compile(r'<div class="title">\s*<a\b[^>]*\bhref="([^"]+)"[^>]*>([^<]*)</a>')


def daftar(teks):
    """satu halaman indeks -> [{tanggal, jam, judul, tautan}]. Blok tanpa tanggal sah atau dengan tautan di luar bnpb.go.id/berita dibuang."""
    out = []
    for blok in _BLOK.split(teks)[1:]:
        t, h = _TGL.search(blok), _HREF.search(blok)
        if not (t and h):
            continue
        bl = BULAN.get(t.group(2).lower())
        tautan = html.unescape(h.group(1)).strip()
        if not bl or not tautan.startswith(AWAL_TAUTAN) or not re.fullmatch(r"[a-z0-9-]+", tautan[len(AWAL_TAUTAN):]):
            continue
        try:
            tanggal = dt.date(int(t.group(3)), bl, int(t.group(1))).isoformat()
        except ValueError:
            continue
        a = _ALT.search(blok)   # teks tautan dipotong "...", alt gambar memuat judul utuh
        judul = " ".join(html.unescape(a.group(1) if a and a.group(1).strip() else h.group(2)).split())
        if judul:
            out.append({"tanggal": tanggal, "jam": t.group(4), "judul": judul[:300], "tautan": tautan})
    return out


# ------------------------------------------------------------------ usulan dari judul (ALGORITMA 13, BAWAAN SEMENTARA Q8)
_SITUASI = re.compile(r"^(perkembangan situasi|update penanganan|laporan situasi)", re.I)
_SATGAS = re.compile(r"\bsatgas|operasi modifikasi cuaca|\bomc\b|water bombing|bom air|pemadaman|patroli|tanggap darurat|\bposko|distribusi|"
                     r"penyaluran|logistik|evakuasi|pencarian|helikopter|armada|operasi udara|dry ice|\bsemai|kerahkan|pembendung api", re.I)
_PUSDATIN = re.compile(r"perkembangan situasi|update penanganan|laporan situasi|imbau|waspada|jurnalis|literasi|knowledge management|prakiraan|"
                       r"informasi|data bencana|\bdibi\b|inarisk", re.I)
JENIS = (("karhutla", r"karhutla|kebakaran hutan|kebakaran lahan|titik panas|hotspot|kabut asap"), ("banjir", r"banjir|\brob\b"),
         ("longsor", r"longsor|tanah bergerak"), ("cuaca_ekstrem", r"cuaca ekstrem|angin kencang|puting beliung|siklon"),
         ("kekeringan", r"kekeringan|kemarau"), ("gempa", r"gempa"), ("erupsi", r"erupsi|gunung ?api|vulkan"),
         ("gelombang", r"gelombang|tsunami|abrasi"))
_PREFIKS = re.compile(r"\b(?:di|ke)\s+((?:Kabupaten|Kab\.|Kota|Provinsi)\s+[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*){0,2})")
_PROV = sorted(W.PROVINSI.values(), key=len, reverse=True)


def pelaksana(judul):
    """usulan pelaksana, atau None (belum digolongkan; staf memilih). Kepala BNPB menang bila tertulis di judul."""
    if re.search(r"\bkepala bnpb\b", judul, re.I):
        return "Kepala BNPB"
    if _SATGAS.search(judul):
        return "Satgas operasi"
    if _PUSDATIN.search(judul):
        return "Pusdatinkom"
    return None


def jenis(judul):
    return [k for k, p in JENIS if re.search(p, judul, re.I)]


def lokasi(judul):
    """'di Kabupaten Solok' -> 'Kabupaten Solok'; 'di Sumatera Barat' -> 'Sumatera Barat'; selain itu None (tidak ditebak)."""
    m = _PREFIKS.findall(judul)
    if m:
        return m[-1]
    for p in _PROV:
        if re.search(rf"\b(?:di|ke)\s+{re.escape(p)}\b", judul, re.I):
            return p
    return None


def usul(b):
    j = b["judul"]
    return {**b, "pelaksana": pelaksana(j), "jenis": jenis(j), "lokasi": lokasi(j), "situasi": bool(_SITUASI.search(j)), "asal": "bnpb.go.id"}


# ------------------------------------------------------------------ cakupan (rentang tanggal yang sudah dipanen)
def gabung_cakup(xs):
    """[[dari, sampai], ...] -> rentang terurut tanpa tumpang; dua rentang bersambung (selisih satu hari) disatukan."""
    out = []
    for a, b in sorted(map(tuple, xs)):
        if out and dt.date.fromisoformat(a) <= dt.date.fromisoformat(out[-1][1]) + dt.timedelta(days=1):
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def tercakup(cakup, a, b):
    """True bila [a, b] seluruhnya di dalam satu rentang cakupan."""
    return any(x <= a and b <= y for x, y in gabung_cakup(cakup))


# ------------------------------------------------------------------ panen
def boleh(ambil, ua=UA):
    """robots.txt bnpb.go.id -> (izin(url), jeda detik). Tidak ada (404) = boleh dengan JEDA; ada = diikuti, Crawl-delay dihormati."""
    try:
        teks = ambil("https://bnpb.go.id/robots.txt").decode("utf-8", "replace")
    except RuntimeError as e:
        if "HTTP 404" in str(e):
            return (lambda url: True), JEDA
        raise
    if teks.lstrip().lower().startswith("<!doctype") or "<html" in teks[:500].lower():   # halaman galat 200 bukan robots.txt
        return (lambda url: True), JEDA
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(teks.splitlines())
    return (lambda url: rp.can_fetch(ua, url)), max(JEDA, float(rp.crawl_delay(ua) or 0))


def _ambil_web(url, jeda=JEDA):
    """urllib langsung, bukan jaring.ambil: jaring membaca isi tanpa batas dan tidak memberi URL akhir sesudah redirect, padahal dua hal
    itu wajib diperiksa di sini (batas 5 MB, host akhir harus bnpb.go.id). Jeda sopan per host tetap lewat jaring.jeda."""
    for i in range(3):
        J.jeda("bnpb.go.id", jeda)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA + "/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                akhir = urllib.parse.urlsplit(r.geturl()).hostname
                if akhir != "bnpb.go.id":
                    raise RuntimeError(f"bnpb.go.id: dialihkan ke host lain ({akhir})")
                b = r.read(MAKS_BAIT + 1)
            if len(b) > MAKS_BAIT:
                raise RuntimeError(f"bnpb.go.id: jawaban lebih dari {MAKS_BAIT} bait ({url})")
            return b
        except urllib.error.HTTPError as e:
            if e.code < 500:
                raise RuntimeError(f"bnpb.go.id: HTTP {e.code}")
            print(f"  bnpb.go.id HTTP {e.code}, ulang", file=sys.stderr)
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"  bnpb.go.id {type(e).__name__}, ulang", file=sys.stderr)
        time.sleep(5 * 3 ** i)
    raise RuntimeError(f"bnpb.go.id: tidak menjawab sesudah coba ulang ({url})")


def panen(dari, sampai, ambil=_ambil_web, maks=MAKS_HALAMAN):
    """butir siaran pers dengan dari <= tanggal <= sampai. Halaman indeks terbaru dulu; berhenti saat satu halaman seluruhnya lebih tua dari `dari`."""
    izin, jeda = boleh(ambil)
    if ambil is _ambil_web:
        ambil = lambda u: _ambil_web(u, jeda)
    seen, out = set(), []
    for n in range(1, maks + 1):
        url = INDEKS.format(n=n)
        if not izin(url):
            raise RuntimeError(f"robots.txt bnpb.go.id menolak {url}")
        xs = daftar(ambil(url).decode("utf-8", "replace"))
        if not xs:
            break
        for b in xs:
            if dari <= b["tanggal"] <= sampai and b["tautan"] not in seen:
                seen.add(b["tautan"])
                out.append(usul(b))
        if max(b["tanggal"] for b in xs) < dari:
            break
    else:
        raise RuntimeError(f"panen berhenti di batas {maks} halaman sebelum mencapai {dari}")
    return out


# ------------------------------------------------------------------ arsip per bulan di R2
def _bulan(a, b):
    y, m = int(a[:4]), int(a[5:7])
    while f"{y}-{m:02d}" <= b[:7]:
        yield f"{y}-{m:02d}"
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def _akhir_bulan(k):
    y, m = int(k[:4]), int(k[5:7])
    return (dt.date(y + (m == 12), m % 12 + 1, 1) - dt.timedelta(days=1)).isoformat()


_TAK_ADA = re.compile(r"not found|nosuchkey|does not exist|10007", re.I)


def baca_ketat(be, kunci):
    """bytes, None hanya bila objek benar-benar tidak ada; galat lain dilempar. gudang.Wrangler.get membaca galat apa pun sebagai tidak ada,
    sehingga simpan() akan menimpa arsip sebulan dengan isi baru saja; di sini wrangler dijalankan sendiri dan stderr diperiksa."""
    if not hasattr(be, "_r2"):   # Lokal (folder) atau backend uji: get sudah membedakan tidak ada dari galat
        return be.get(kunci)
    with tempfile.TemporaryDirectory() as d:
        j = os.path.join(d, "o")
        r = be._r2("get", kunci, "--file", j)
        if r.returncode == 0 and os.path.exists(j):
            return open(j, "rb").read()
        if _TAK_ADA.search((r.stderr or "") + (r.stdout or "")):
            return None
        raise RuntimeError(f"baca R2 {kunci} gagal: {(r.stderr or '').strip()[:300]}")


def baca_bulan(be, bulan):
    b = baca_ketat(be, KUNCI.format(bulan=bulan))
    return json.loads(b) if b else None


def simpan(be, butir, dari, sampai, tarik, tutup=None):
    """gabung hasil panen [dari, sampai] ke arsip tiap bulan yang disentuh; -> {bulan: jumlah butir}.
    tutup = hari terakhir yang sudah lengkap (bawaan sampai); hari sesudahnya ikut tersimpan butirnya tapi belum masuk cakupan."""
    hasil, tutup = {}, min(sampai, tutup or sampai)
    for k in _bulan(dari, sampai):
        a, b = max(dari, f"{k}-01"), min(sampai, _akhir_bulan(k))
        c = min(b, tutup)
        lama = baca_bulan(be, k) or {"v": 1, "bulan": k, "asal": "bnpb.go.id", "cakup": [], "butir": []}
        per = {x["tautan"]: x for x in lama["butir"]}
        per |= {x["tautan"]: x for x in butir if a <= x["tanggal"] <= b}
        isi = {**lama, "tarik": tarik, "cakup": gabung_cakup(lama["cakup"] + ([[a, c]] if a <= c else [])),
               "butir": sorted(per.values(), key=lambda x: (x["tanggal"], x["jam"], x["tautan"]))}
        kunci = KUNCI.format(bulan=k)
        assert KUNCI_SAH.match(kunci), kunci
        with tempfile.TemporaryDirectory() as d:
            j = os.path.join(d, "o.json")
            with open(j, "w", encoding="utf-8") as f:
                json.dump(isi, f, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            be.put(kunci, j)
        hasil[k] = len(isi["butir"])
    return hasil


def arsip(be, a, b):
    """masukan hitung.py untuk rentang [a, b] (ISO): {tarik, cakup, butir} dari arsip bulan; None bila tidak ada satu pun arsip."""
    xs = [x for x in (baca_bulan(be, k) for k in _bulan(a, b)) if x]
    if not xs:
        return None
    return {"tarik": max(x.get("tarik") or "" for x in xs) or None, "cakup": gabung_cakup([c for x in xs for c in x["cakup"]]),
            "butir": [y for x in xs for y in x["butir"] if a <= y["tanggal"] <= b]}


def dari_bawaan(be, hari_ini):
    """akhir cakupan arsip bulan ini atau bulan lalu (tumpang satu hari supaya siaran pers sore tidak lolos), atau tanggal 1 bulan lalu."""
    awal = (hari_ini.replace(day=1) - dt.timedelta(days=1)).replace(day=1).isoformat()
    akhir = [c[1] for k in _bulan(awal, hari_ini.isoformat()) if (x := baca_bulan(be, k)) for c in x["cakup"]]
    return max(akhir) if akhir else awal


# ------------------------------------------------------------------ uji (tanpa jaringan)
FIX = os.path.join(AKAR, "tests/berkala/fixtures/bnpb_berita.html")


def uji():
    n = 0

    def ok(c, pesan):
        nonlocal n
        assert c, pesan
        n += 1

    teks = open(FIX, encoding="utf-8").read()
    xs = daftar(teks)
    ok([x["tanggal"] for x in xs] == ["2030-10-31", "2030-10-30", "2030-10-30", "2030-10-29", "2030-10-02", "2030-09-30"], f"tanggal {[x['tanggal'] for x in xs]}")
    ok(xs[0]["judul"] == "Kepala BNPB Tinjau Posko Contoh di Kabupaten Contoh Raya & Sekitarnya" and xs[0]["jam"] == "16:08", "judul utuh dari alt, entitas diurai")
    ok(all(x["tautan"].startswith(AWAL_TAUTAN) for x in xs) and not any("javascript" in x["tautan"] or "contoh.example" in x["tautan"] for x in xs),
       "tautan javascript: dan domain lain dibuang")
    ok(xs[4]["judul"] == "Teks Tautan Saja Tanpa Gambar", "tanpa alt: teks tautan")
    ok(xs[3]["judul"] == "<img src=x onerror=alert(1)>Judul Jahat <script>alert(2)</script> Contoh", "markup di judul disimpan sebagai teks apa adanya; layar meng-escape")
    del xs[3]
    u = [usul(x) for x in xs]
    ok([x["pelaksana"] for x in u] == ["Kepala BNPB", "Pusdatinkom", "Satgas operasi", None, "Pusdatinkom"], f"pelaksana {[x['pelaksana'] for x in u]}")
    ok(u[1]["situasi"] and not u[0]["situasi"] and u[2]["jenis"] == ["karhutla"] and u[4]["jenis"] == ["banjir", "longsor"], "situasi dan jenis")
    ok(u[0]["lokasi"] == "Kabupaten Contoh Raya" and u[2]["lokasi"] == "Riau" and u[1]["lokasi"] is None, f"lokasi {[x['lokasi'] for x in u]}")
    ok(pelaksana("Kepala BNPB Pimpin Rakor Satgas Karhutla") == "Kepala BNPB", "Kepala BNPB menang atas kata satgas")
    ok(gabung_cakup([["2030-10-05", "2030-10-31"], ["2030-10-01", "2030-10-04"], ["2030-11-03", "2030-11-04"]])
       == [["2030-10-01", "2030-10-31"], ["2030-11-03", "2030-11-04"]], "cakupan bersambung disatukan, celah tetap celah")
    ok(tercakup([["2030-10-01", "2030-10-20"], ["2030-10-21", "2030-10-31"]], "2030-10-01", "2030-10-31")
       and not tercakup([["2030-10-01", "2030-10-20"], ["2030-10-22", "2030-10-31"]], "2030-10-01", "2030-10-31"), "tercakup")

    # panen: halaman 1 fixture, halaman 2 lebih tua dari `dari` -> berhenti; robots 404 = boleh; robots melarang = gagal keras
    dipanggil = []

    def palsu(robots=None):
        def ambil(url):
            dipanggil.append(url)
            if url.endswith("robots.txt"):
                if robots is None:
                    raise RuntimeError("bnpb.go.id: HTTP 404")
                return robots.encode()
            if url.endswith("/page/1"):
                return teks.encode()
            return teks.replace("2030", "2029").encode()   # halaman 2: semua setahun lebih tua
        return ambil

    hasil = panen("2030-10-01", "2030-10-31", palsu())
    ok(len(hasil) == 5 and dipanggil[-1].endswith("/page/2") and len(dipanggil) == 3, f"panen berhenti di halaman lebih tua: {dipanggil}")
    try:
        panen("2030-10-01", "2030-10-31", palsu("User-agent: *\nDisallow: /berita/"))
        ok(False, "robots.txt melarang harus gagal")
    except RuntimeError as e:
        ok("robots.txt" in str(e), "robots.txt melarang = gagal keras")
    ok(len(panen("2030-10-01", "2030-10-31", palsu("<!DOCTYPE html><html>tidak ditemukan</html>"))) == 5, "halaman galat 200 bukan robots")
    ok(boleh(palsu("User-agent: *\nCrawl-delay: 10\n"))[1] == 10.0 and boleh(palsu("User-agent: *\nCrawl-delay: 1\n"))[1] == JEDA
       and boleh(palsu())[1] == JEDA, "Crawl-delay dihormati, tidak pernah di bawah JEDA")

    # _ambil_web: host akhir sesudah redirect dan batas 5 MB (urlopen palsu, tanpa jaringan)
    class Jawab:
        def __init__(s, url, isi): s.url, s.isi = url, isi
        def __enter__(s): return s
        def __exit__(s, *a): return False
        def geturl(s): return s.url
        def read(s, n=-1): return s.isi[:n] if n >= 0 else s.isi
    asli = urllib.request.urlopen
    try:
        for akhir, isi, harap in (("https://contoh.example/berita", b"x", "host lain"), ("https://bnpb.go.id/berita/page/1", b"x" * (MAKS_BAIT + 2), "lebih dari"),
                                  ("https://bnpb.go.id/berita/page/1", b"ok", None)):
            urllib.request.urlopen = lambda req, timeout=None, a=akhir, i=isi: Jawab(a, i)
            try:
                r = _ambil_web("https://bnpb.go.id/berita/page/1", 0)
                ok(harap is None and r == b"ok", f"_ambil_web {akhir}")
            except RuntimeError as e:
                ok(harap is not None and harap in str(e), f"_ambil_web menolak: {e}")
    finally:
        urllib.request.urlopen = asli

    with tempfile.TemporaryDirectory() as d:
        be = G.Lokal(d)
        ok(dari_bawaan(be, dt.date(2030, 11, 5)) == "2030-10-01", "tanpa arsip: tanggal 1 bulan lalu")
        r = simpan(be, hasil, "2030-10-01", "2030-10-31", "2030-11-01")
        ok(r == {"2030-10": 5}, f"simpan {r}")
        r = simpan(be, [usul(xs[0]) | {"judul": "judul diperbarui"}], "2030-10-31", "2030-11-02", "2030-11-02")
        ok(r == {"2030-10": 5, "2030-11": 0}, f"gabung tanpa ganda {r}")
        x = baca_bulan(be, "2030-10")
        ok(x["cakup"] == [["2030-10-01", "2030-10-31"]] and x["tarik"] == "2030-11-02" and x["butir"][-1]["judul"] == "judul diperbarui", "arsip bulan")
        ok(baca_bulan(be, "2030-11")["cakup"] == [["2030-11-01", "2030-11-02"]] and baca_bulan(be, "2030-11")["butir"] == [], "bulan tanpa siaran pers: cakup ada, butir kosong")
        ok(dari_bawaan(be, dt.date(2030, 11, 5)) == "2030-11-02", "dari bawaan = akhir cakupan")
        simpan(be, [], "2030-11-03", "2030-11-03", "2030-11-03", tutup="2030-11-02")
        ok(baca_bulan(be, "2030-11")["cakup"] == [["2030-11-01", "2030-11-02"]], "hari berjalan belum masuk cakupan")
        m = arsip(be, "2030-10-27", "2030-11-02")
        ok(len(m["butir"]) == 4 and tercakup(m["cakup"], "2030-10-27", "2030-11-02") and m["tarik"] == "2030-11-03", f"arsip mingguan {len(m['butir'])} {m['tarik']}")
        ok(arsip(be, "2031-01-01", "2031-01-31") is None, "tanpa arsip: None")

        # baca arsip lama gagal (bukan tidak ada) = berhenti tanpa put; arsip sebulan tidak pernah ditimpa isi baru saja
        class Galat:
            put_n = 0
            def get(s, k): raise OSError("jaringan putus")
            def put(s, k, j): Galat.put_n += 1
        class R2Palsu:   # bentuk gudang.Wrangler: _r2 mengembalikan hasil subprocess
            def __init__(s, err, rc=1): s.err, s.rc, s.put_n = err, rc, 0
            def _r2(s, aksi, kunci, *x): return type("P", (), {"returncode": s.rc, "stderr": s.err, "stdout": ""})()
            def put(s, k, j): s.put_n += 1
        for bk, nama in ((Galat(), "get melempar"), (R2Palsu("Authentication error [code: 10000]"), "wrangler galat lain")):
            try:
                simpan(bk, hasil, "2030-10-01", "2030-10-31", "2030-11-01")
                ok(False, f"{nama}: harus gagal")
            except (OSError, RuntimeError):
                ok((Galat.put_n if isinstance(bk, Galat) else bk.put_n) == 0, f"{nama}: tanpa put")
        rp = R2Palsu("The specified key does not exist. [code: 10007]")
        ok(simpan(rp, hasil, "2030-10-01", "2030-10-31", "2030-11-01") == {"2030-10": 5} and rp.put_n == 1, "objek benar-benar tidak ada: arsip baru ditulis")
        try:
            be2 = type("B", (), {"get": lambda s, k: None, "put": lambda s, k, j: None})()
            simpan(be2, [], "2030-13-01", "2030-13-02", "x")
            ok(False, "bulan 13 harus ditolak")
        except (AssertionError, ValueError):
            ok(True, "kunci di luar pola ditolak")
    print(f"kegiatan.py uji: {n} pemeriksaan lulus")


def main(a):
    if a[:1] == ["uji"] or a[:1] == ["--uji"]:
        return uji()
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("aksi", choices=["panen"])
    ap.add_argument("--dari")
    ap.add_argument("--sampai")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--lokal")
    g.add_argument("--wrangler")
    ap.add_argument("--bucket", default=G.BUCKET)
    x = ap.parse_args(a)
    be = G.Lokal(x.lokal) if x.lokal else G.Wrangler(x.wrangler, x.bucket)
    kini = dt.datetime.now(WIB).date()
    dari, sampai = x.dari or dari_bawaan(be, kini), x.sampai or kini.isoformat()
    dari, sampai = dt.date.fromisoformat(dari).isoformat(), dt.date.fromisoformat(sampai).isoformat()
    if dari > sampai:
        ap.error("--dari sesudah --sampai")
    butir = panen(dari, sampai)
    print(json.dumps({"dari": dari, "sampai": sampai, "butir": len(butir), "bulan": simpan(be, butir, dari, sampai, kini.isoformat(),
                                                                                     tutup=(kini - dt.timedelta(days=1)).isoformat())}))


if __name__ == "__main__":
    main(sys.argv[1:])
