"""MB-3 Pemanen JDIH daerah (ALGORITMA sec 4; DESAIN-TEKNIS sec 4.3; RENCANA-UJI sec 4 baris MB-3; tiket RU-025, RU-026).

Hanya metadata (judul, nomor, tahun, tanggal penetapan, URL); teks penuh tidak dipanen. Tanpa data orang.
Jaringan hanya lewat panen.ambil_html (izin per komponen, robots, pengalihan diperiksa, batas ukuran, jeda per host, UA DT sec 8).

Sumber (RU-025, 26 Nov 2026): JDIHN tidak punya pencarian yang boleh dibaca mesin. /search dirender di peramban
(Next.js) dari /search-api/, dan robots.txt jdihn.go.id melarang /search-api/ dan /api/ untuk semua agen. Sitemap /doc/
berisi 1.396 berkas indeks tanpa judul: membaca 552 pemda dari situ berarti jutaan halaman, jadi tidak dipakai.
Jalur yang dipakai: formulir cari GET situs JDIH provinsi di jdih_situs.json (ditulis tangan, hasil probe di medan probe).
Halaman hasil dibaca generik: tautan berhost sama yang teksnya judul peraturan.

  cari(kata_kunci, kode_prov)   -> {"status": terbaca|tidak_bisa_dicek|diblokir|tanpa_pencarian, "dok": [...], "galat"}
  kenali(judul)                 -> rpbd | renkon | rpkb | rencana_aksi | cabut | None   (ALGORITMA sec 4.2)
  periode(judul, tgl_tetap, tahun) -> {"periode": [m, a] | None, "diduga": bool, "sampai": ISO | None}   (sec 4.3)
  cocok_pemda(nama)             -> kode BPS (2 digit provinsi, 4 digit kab/kota) atau None   (sec 4.4)
  status_rpbd(dok, hari_ini, sumber_ok) -> status sec 4.5
  jalan()                       -> {"jdih_daerah": {...}}   langkah mingguan jalan.py, ke R2 unit/

  python3 -I scripts/bnpb/unit/jdih_daerah.py --cek
  python3 -I scripts/bnpb/unit/jdih_daerah.py --probe [--tulis]   probe 38 situs (jaringan); --tulis mengisi medan probe
"""
import html
import json
import os
import re
import sys
import urllib.parse
from datetime import date

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)  # -I tidak menaruh folder skrip
import panen  # noqa: E402
import aturan  # noqa: E402  _tambah_bulan: satu hitungan tambah bulan, bukan salinan

AKAR = panen.AKAR
SITUS = panen.JDIH_SITUS
WILAYAH = os.path.join(AKAR, "public", "data", "bnpb", "wilayah.json")
FIXTURE = os.path.join(AKAR, "tests", "bnpb", "fixtures", "unit", "jdih")
SUMBER = "jdih"                      # cache data/raw/unit/jdih/<sha1 url>.html
UMUR_CACHE_JAM = 720                 # 30 hari (U5)
JEDA = 1.0                           # detik antarpermintaan per host (U5)
RPBD_MASA_DIDUGA_TAHUN = 5           # asumsi riset/1 PSPB-1, bukan pasal (ALGORITMA sec 4.3 butir 3)
TGL_PERBAN_3_2026 = "2026-10-06"     # tanggal berlaku Perban 3/2026 menurut riset/1 (ALGORITMA sec 4.5)
KATA_KUNCI = ("rencana penanggulangan bencana", "rencana kontinjensi", "rencana penanggulangan kedaruratan bencana",
              "rencana aksi pengurangan risiko bencana")
KOLOM = ("kode", "jenis_dok", "judul", "nomor", "tahun", "tgl_tetap", "periode", "periode_diduga", "berlaku_sampai", "perubahan", "url")

BULAN = {b: i + 1 for i, b in enumerate(("januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus",
                                          "september", "oktober", "november", "desember"))}


def norm_judul(s):
    s = html.unescape(s or "").lower().replace("–", "-").replace("—", "-")
    return " ".join(re.sub(r"[\"'“”‘’]", "", s).split())


def kenali(judul):
    j = norm_judul(judul)
    if re.search(r"\bpencabutan\b|\bdicabut\b", j):
        return "cabut"
    if "rencana penanggulangan kedaruratan bencana" in j or re.search(r"\brpkb\b", j):
        return "rpkb"
    if re.search(r"rencana kontin[jg]ensi", j):
        return "renkon"
    if re.search(r"rencana aksi\b.{0,60}(pengurangan risiko bencana|kesiapsiagaan|penanggulangan bencana|\bprb\b)", j):
        return "rencana_aksi"
    if re.search(r"rencana penanggulangan bencana\b(?! kedaruratan)", j) or re.search(r"\brpbd?\b", j):
        return "rpbd"
    return None


def perubahan(judul):
    return "perubahan atas" in norm_judul(judul)


def _periode_judul(j):
    m = re.search(r"tahun\s+(\d{4})\s*(?:-|s\.?\s?d\.?|sampai dengan)\s*(\d{4})", j) or re.search(r"\b(20\d{2})\s*-\s*(20\d{2})\b", j)
    if not m:
        return None
    a, b = int(m[1]), int(m[2])
    return [a, b] if 2000 <= a <= 2040 and a < b and b - a <= 10 else None


def periode(judul, tgl_tetap=None, tahun=None):
    p = _periode_judul(norm_judul(judul))
    if p:
        return {"periode": p, "diduga": False, "sampai": None}
    if tgl_tetap:
        t = date.fromisoformat(tgl_tetap)
        return {"periode": None, "diduga": True, "sampai": aturan._tambah_bulan(t, 12 * RPBD_MASA_DIDUGA_TAHUN).isoformat()}
    if tahun:
        # ponytail: hanya tahun penetapan: akhir = 1 Januari tahun+5 (paling awal yang mungkin), jadi tidak pernah melebih-lebihkan berlaku
        return {"periode": None, "diduga": True, "sampai": f"{int(tahun) + RPBD_MASA_DIDUGA_TAHUN}-01-01"}
    return {"periode": None, "diduga": True, "sampai": None}


def status_rpbd(dok, hari_ini, sumber_ok=True):
    """dok: baris keluaran satu pemda (semua jenis). -> sesuai_3_2026 | berlaku | habis | belum_mulai | tidak_ditemukan | tidak_bisa_dicek."""
    if not sumber_ok:
        return "tidak_bisa_dicek"
    r = [d for d in dok if d["jenis_dok"] == "rpbd" and (not d["perubahan"] or not d["periode_diduga"])]
    if not r:
        return "tidak_ditemukan"
    d = max(r, key=lambda d: (d["tgl_tetap"] or f"{d['tahun'] or 0}-00-00", d["url"]))
    hi = date.fromisoformat(hari_ini)
    if d["periode"]:
        if d["periode"][0] > hi.year:
            return "belum_mulai"  # tidak ada di daftar ALGORITMA sec 4.5; tidak disamakan dengan berlaku atau habis
        ada = hi.year <= d["periode"][1]
    else:
        ada = bool(d["berlaku_sampai"]) and hari_ini < d["berlaku_sampai"]
    if not ada:
        return "habis"
    baru = (d["tgl_tetap"] or "") >= TGL_PERBAN_3_2026 or (d["tahun"] or 0) > int(TGL_PERBAN_3_2026[:4])
    return "sesuai_3_2026" if baru else "berlaku"


# ---------- pemda ----------

def _norm_nama(s):
    s = re.sub(r"[^a-z0-9 ]", " ", (s or "").lower())
    s = re.sub(r"\b(daerah khusus ibukota|daerah khusus ibu kota|daerah istimewa|dki|diy|di)\b", " ", s)
    return "".join(s.split())


_PEMDA = None


def _pemda():
    """-> [(tingkat, nama_norm, kode)]; tingkat prov | kab | kota."""
    global _PEMDA
    if _PEMDA is None:
        with open(SITUS, encoding="utf-8") as f:
            daftar = [("prov", _norm_nama(s["nama"]), s["kode"]) for s in json.load(f)]
        with open(WILAYAH, encoding="utf-8") as f:
            for k in json.load(f)["kab"]:
                kota = k["nama"].startswith("Kota ")
                daftar.append(("kota" if kota else "kab", _norm_nama(k["nama"][5:] if kota else k["nama"]), k["kode"]))
        _PEMDA = daftar
    return _PEMDA


def cocok_pemda(nama):
    """'Provinsi Jawa Tengah', 'Kabupaten Cilacap', 'Kota Sorong', atau nama polos. Diterima hanya bila tepat satu kode cocok."""
    s = (nama or "").strip().lower()
    m = re.match(r"(provinsi|gubernur|kabupaten|kab\.?|bupati|kota|wali ?kota)\s+(.*)$", s)
    tingkat = None
    if m:
        tingkat = {"provinsi": "prov", "gubernur": "prov", "kota": "kota", "walikota": "kota", "wali kota": "kota"}.get(m[1], "kab")
        s = m[2]
    n = _norm_nama(s)
    kode = {k for t, x, k in _pemda() if x == n and (tingkat is None or t == tingkat)}
    return kode.pop() if len(kode) == 1 else None


_RE_PEMDA = re.compile(r"(?:peraturan|keputusan|instruksi)\s+(?:daerah\s+)?(provinsi|kabupaten|kota|gubernur|bupati|wali ?kota)\s+([a-z][a-z .()-]*?)\s+nomor\b")  # nama tanpa angka


def nama_pemda(judul, prov_situs):
    """Pemda dari judul ('Peraturan Bupati Cilacap Nomor ...'); tanpa nama di judul = provinsi pemilik situs."""
    m = _RE_PEMDA.search(norm_judul(judul))
    return f"{m[1]} {m[2]}" if m else f"provinsi {prov_situs}"


# ---------- halaman hasil ----------

_RE_A = re.compile(r"<a\b[^>]*?href\s*=\s*([\"'])(.*?)\1[^>]*>(.*?)</a>", re.S | re.I)
# judul dokumen: bentuk peraturan, atau "rencana ..." bertahun; gema kata kunci ("Kata kunci: rencana ...") tidak lolos
_RE_JENIS = re.compile(r"\b(peraturan|keputusan|instruksi|surat edaran)\b|\brencana\b.*\b(19|20)\d{2}\b")
_RE_TGL = re.compile(r"(?:ditetapkan|penetapan)[^0-9]{0,25}(\d{4}-\d{2}-\d{2}|\d{1,2}\s+[a-z]+\s+\d{4})")


def _tanggal(s):
    try:
        if "-" in s:
            return date.fromisoformat(s).isoformat()
        d, b, y = s.split()
        return date(int(y), BULAN[b], int(d)).isoformat()
    except (ValueError, KeyError):
        return None


def urai_hasil(teks, url_halaman):
    """HTML hasil cari -> [{judul, url, nomor, tahun, tgl_tetap}] untuk tautan https berhost sama yang teksnya judul dokumen."""
    host = urllib.parse.urlsplit(url_halaman).hostname
    keluar, lihat = [], set()
    for m in _RE_A.finditer(teks):
        u = urllib.parse.urljoin(url_halaman, html.unescape(m[2]).strip())
        p = urllib.parse.urlsplit(u)
        judul = " ".join(re.sub(r"<[^>]*>", " ", html.unescape(re.sub(r"<[^>]+>", " ", m[3]))).split())  # markup terenkode juga dibuang
        j = norm_judul(judul)
        try:
            panen.diizinkan(u)  # port, userinfo, skema, host izin, DILARANG: aturan yang sama dengan permintaan
        except panen.Dilarang:
            continue
        if p.hostname != host or u in lihat or len(j) < 15 or not _RE_JENIS.search(j):
            continue
        lihat.add(u)
        no = re.search(r"nomor\s+([0-9a-z./-]+)\s+tahun\s+(\d{4})", j)
        ekor = norm_judul(re.sub(r"<[^>]+>", " ", teks[m.end():m.end() + 600]))
        t = _RE_TGL.search(ekor)
        keluar.append({"judul": judul, "url": u, "nomor": no[1] if no else None, "tahun": int(no[2]) if no else None,
                       "tgl_tetap": _tanggal(t[1]) if t else None})
    return keluar


def _situs(kode_prov):
    with open(SITUS, encoding="utf-8") as f:
        return next(s for s in json.load(f) if s["kode"] == kode_prov)


def cari(kata_kunci, kode_prov):
    s = _situs(kode_prov)
    if not s.get("cari"):
        return {"status": "tanpa_pencarian", "dok": [], "galat": s.get("catatan")}
    url = s["cari"].replace("{q}", urllib.parse.quote_plus(kata_kunci))
    try:
        teks, atr = panen.ambil_html(url, SUMBER, umur_jam=UMUR_CACHE_JAM, jeda=JEDA, nama=f"JDIH Provinsi {s['nama']}")
    except (panen.jaring.Ditolak, panen.Dilarang) as e:
        return {"status": "diblokir", "dok": [], "galat": str(e)[:200]}
    except (panen.GagalAmbil, panen.BentukBerubah, OSError) as e:
        return {"status": "tidak_bisa_dicek", "dok": [], "galat": str(e)[:200]}
    return {"status": "terbaca", "dok": urai_hasil(teks, url), "galat": None, "sumber": atr}


def baris(d, prov):
    """Hasil urai -> baris keluaran berkolom KOLOM, atau (None, alasan)."""
    jenis = kenali(d["judul"])
    if jenis is None:
        return None, "tidak_dikenali"
    kode = cocok_pemda(nama_pemda(d["judul"], prov["nama"]))
    if kode is None:
        return None, "kode_gagal"
    p = periode(d["judul"], d["tgl_tetap"], d["tahun"])
    r = {"kode": kode, "jenis_dok": jenis, "judul": d["judul"], "nomor": d["nomor"], "tahun": d["tahun"], "tgl_tetap": d["tgl_tetap"],
         "periode": p["periode"], "periode_diduga": p["diduga"],
         "berlaku_sampai": p["sampai"] if jenis == "rpbd" else None,  # masa 5 tahun diduga hanya asumsi RPBD; renkon dkk. ikut sec 3.3
         "perubahan": perubahan(d["judul"]), "url": d["url"]}
    return r, None


def jalan():
    with open(SITUS, encoding="utf-8") as f:
        daftar = json.load(f)
    dok, situs, gagal, sumber, lihat = [], [], [], [], set()
    for s in daftar:
        st, galat = "tanpa_pencarian", s.get("catatan")
        for q in KATA_KUNCI:
            r = cari(q, s["kode"])
            st, galat = r["status"], r["galat"]
            if st != "terbaca":
                break  # satu tolak atau gagal: berhenti untuk situs itu di putaran ini (KP sec 8)
            sumber.append(r["sumber"])
            for d in r["dok"]:
                b, alasan = baris(d, s)
                if alasan == "kode_gagal":
                    gagal.append({"judul": d["judul"], "url": d["url"]})
                if b and b["url"] not in lihat:
                    lihat.add(b["url"])
                    dok.append(b)
        situs.append({"kode": s["kode"], "status": st, "galat": galat})
    n = lambda x: sum(1 for s in situs if s["status"] == x)  # noqa: E731
    return {"jdih_daerah": {"label": "sekunder", "sumber": sumber,
                            "cakupan": {"pemda": 552, "situs": len(situs), "diperiksa": n("terbaca"), "diblokir": n("diblokir"),
                                        "tidak_bisa_dicek": n("tidak_bisa_dicek"), "tanpa_pencarian": n("tanpa_pencarian")},
                            "situs": situs, "dok": dok, "kode_gagal": gagal}}


# ---------- probe RU-025 (jaringan) ----------

def _aplikasi(t):
    g = re.search(r'<meta name="generator" content="([^"]+)"', t, re.I)
    if g:
        return g[1][:60]
    for pola, nama in (("_next/static", "Next.js"), ("livewire", "Laravel Livewire"), ("wp-content", "WordPress"),
                       ("csrfmiddlewaretoken", "Django"), ("yii", "Yii"), ("csrf-token", "Laravel")):
        if pola in t.lower():
            return nama
    return None


def probe(tulis=False):
    panen.JEDA_ULANG, panen.BATAS_DETIK = (2,), 20  # probe sekali: satu ulang, tenggat pendek
    with open(SITUS, encoding="utf-8") as f:
        daftar = json.load(f)
    kini = panen._kini()[:10]
    for s in daftar:
        h = {"tanggal": kini, "beranda": None, "aplikasi": None, "cari": None, "judul_terbaca": 0}
        try:
            t, _ = panen.ambil_html(s["url"], SUMBER, umur_jam=UMUR_CACHE_JAM, jeda=JEDA)
            h["beranda"], h["aplikasi"] = "terbaca", _aplikasi(t)
        except (panen.jaring.Ditolak, panen.Dilarang) as e:
            h["beranda"] = "diblokir: " + " ".join(str(e).split())[-90:]
        except Exception as e:  # noqa: BLE001  probe mencatat apa adanya
            h["beranda"] = "tidak_bisa_dicek: " + " ".join(str(e).split())[-90:]
        if s.get("cari") and h["beranda"] == "terbaca":
            r = cari(KATA_KUNCI[0], s["kode"])
            h["cari"] = r["status"] + (": " + " ".join(r["galat"].split())[-90:] if r["galat"] else "")
            h["judul_terbaca"] = len(r["dok"])
            h["dikenali"] = sum(1 for d in r["dok"] if kenali(d["judul"]) not in (None, "cabut"))
        s["probe"] = h
        print(f"{s['kode']} {s['nama']:<26} beranda={h['beranda']} cari={h['cari']} judul={h['judul_terbaca']}", flush=True)
    if tulis:
        with open(SITUS, "w", encoding="utf-8") as f:
            json.dump(daftar, f, ensure_ascii=False, indent=1)
            f.write("\n")
    return daftar


# ---------- cek tanpa jaringan ----------

def cek():
    import datetime as dt
    import tempfile
    # kenali (ALGORITMA sec 4.2, urutan menang)
    for j, harap in (("Peraturan Gubernur X Nomor 1 Tahun 2024 tentang Rencana Penanggulangan Bencana Daerah Tahun 2025–2029", "rpbd"),
                     ("Peraturan Bupati Y tentang Rencana Penanggulangan Kedaruratan Bencana Banjir", "rpkb"),
                     ("Rencana Penanggulangan Bencana Kedaruratan", None), ("Dokumen RPKB Kota Z", "rpkb"),
                     ("Keputusan Bupati tentang Rencana Kontingensi Erupsi", "renkon"), ("RENCANA KONTINJENSI BANJIR", "renkon"),
                     ("Rencana Aksi Daerah Pengurangan Risiko Bencana 2024-2026", "rencana_aksi"), ("Rencana Aksi Daerah Pangan dan Gizi", None),
                     ("Pencabutan Peraturan Gubernur tentang Rencana Penanggulangan Bencana", "cabut"), ("Dokumen RPB Kabupaten X", "rpbd"),
                     ("Peraturan Daerah tentang Retribusi Pasar", None), ("Perubahan atas Rencana Kontinjensi Tsunami", "renkon")):
        assert kenali(j) == harap, (j, kenali(j), harap)
    assert perubahan("Perubahan Atas Peraturan Gubernur Nomor 2") and not perubahan("Rencana Kontinjensi")
    # periode (sec 4.3 dan RU sec 4 MB-3)
    assert periode("Rencana Penanggulangan Bencana Daerah Tahun 2025-2029") == {"periode": [2025, 2029], "diduga": False, "sampai": None}
    assert periode("RPBD Tahun 2023 s.d. 2027")["periode"] == [2023, 2027]
    assert periode("RPBD Tahun 2023 sampai dengan 2027")["periode"] == [2023, 2027]
    assert periode("RPB Kabupaten X", "2022-05-10") == {"periode": None, "diduga": True, "sampai": "2027-05-10"}
    assert periode("RPB X", "2024-02-29")["sampai"] == "2029-02-28"
    assert periode("RPBD Tahun 2020-2035", "2020-01-02")["diduga"] is True  # lebih dari 10 tahun: tidak sah
    assert periode("RPBD Tahun 2029-2025")["periode"] is None
    assert periode("RPB X", None, 2022)["sampai"] == "2027-01-01" and periode("RPB X")["sampai"] is None
    # cocok_pemda (sec 4.4): tepat satu kode
    assert cocok_pemda("Provinsi Jawa Tengah") == "33" and cocok_pemda("Kabupaten Cilacap") == "3301"
    assert cocok_pemda("Kota Sorong") == "9671" and cocok_pemda("bupati sorong") == "9601"
    assert cocok_pemda("Gorontalo") is None and cocok_pemda("provinsi gorontalo") == "75"  # provinsi dan kabupaten sama nama
    assert cocok_pemda("Provinsi DKI Jakarta") == "31" and cocok_pemda("Kabupaten Antah") is None
    assert nama_pemda("Peraturan Bupati Cilacap Nomor 3 Tahun 2022", "Jawa Tengah") == "bupati cilacap"
    assert nama_pemda("Peraturan Gubernur Nomor 1 Tahun 2024 tentang RPBD", "DKI Jakarta") == "provinsi DKI Jakarta"
    # fixture: 5 halaman hasil cari buatan sendiri (tanpa data orang), dibaca lewat panen.ambil_html dengan _buka tiruan
    berkas = sorted(f for f in os.listdir(FIXTURE) if f.endswith(".html"))
    assert len(berkas) == 5, berkas
    situs = [{"kode": "33", "nama": "Jawa Tengah", "url": "https://jdih.jatengprov.go.id/", "cari": "https://jdih.jatengprov.go.id/c?q={q}"},
             {"kode": "31", "nama": "DKI Jakarta", "url": "https://jdih.jakarta.go.id/", "cari": "https://jdih.jakarta.go.id/c?q={q}"},
             {"kode": "73", "nama": "Sulawesi Selatan", "url": "https://jdih.sulselprov.go.id/", "cari": "https://jdih.sulselprov.go.id/c?q={q}"},
             {"kode": "21", "nama": "Kepulauan Riau", "url": "https://jdih.kepriprov.go.id/", "cari": "https://jdih.kepriprov.go.id/c?q={q}"},
             {"kode": "65", "nama": "Kalimantan Utara", "url": "https://jdih.kaltaraprov.go.id/", "cari": "https://jdih.kaltaraprov.go.id/c?q={q}"},
             {"kode": "81", "nama": "Maluku", "url": "https://jdih.malukuprov.go.id/", "cari": "https://jdih.malukuprov.go.id/c?q={q}"},
             {"kode": "13", "nama": "Sumatera Barat", "url": "https://jdih.sumbarprov.go.id/", "cari": None, "catatan": "uji"}]
    halaman = {"jdih.jatengprov.go.id": "1_jateng.html", "jdih.jakarta.go.id": "2_jakarta.html", "jdih.sulselprov.go.id": "3_sulsel.html",
               "jdih.kepriprov.go.id": "4_kepri.html", "jdih.kaltaraprov.go.id": "5_kosong.html"}
    assert sorted(halaman.values()) == berkas
    asli = (panen.CACHE, panen._buka, panen._tidur, panen._sekarang, panen.jaring.time, panen.HOST_IZIN, globals()["SITUS"], globals()["_PEMDA"])
    panggil, tidur = [], []

    class Jam:  # jam palsu untuk jaring.jeda: time() maju hanya lewat sleep()
        t = 1_000_000.0

        @classmethod
        def time(cls):
            return cls.t

        @classmethod
        def sleep(cls, d):
            tidur.append(round(d, 3))
            cls.t += d

    def buka(req, timeout=None):
        u = req.full_url
        p = urllib.parse.urlsplit(u)
        panggil.append((u, Jam.t))
        assert req.get_header("User-agent") == panen.UA
        if p.path == "/robots.txt":
            return panen._Jawab(b"User-agent: *\nDisallow: /admin\n", u)
        if p.hostname == "jdih.malukuprov.go.id":
            raise panen.urllib.error.HTTPError(u, 503, "x", {}, None)
        with open(os.path.join(FIXTURE, halaman[p.hostname]), "rb") as f:
            return panen._Jawab(f.read(), u)

    try:
        with tempfile.TemporaryDirectory() as d:
            f_situs = os.path.join(d, "situs.json")
            with open(f_situs, "w", encoding="utf-8") as f:
                json.dump(situs, f)
            _pemda()  # nama 38 provinsi untuk cocok_pemda tetap dari daftar nyata (dimuat sebelum SITUS diganti)
            globals()["SITUS"] = f_situs
            panen.CACHE, panen._buka, panen._tidur, panen.jaring.time = d, buka, tidur.append, Jam
            panen.HOST_IZIN = asli[5] | {urllib.parse.urlsplit(s["url"]).hostname for s in situs}
            panen._robots.clear()
            panen.jaring._TERAKHIR.clear()
            mulai = dt.datetime(2026, 11, 26, tzinfo=dt.timezone.utc)
            panen._sekarang = lambda: mulai  # noqa: E731
            out = jalan()["jdih_daerah"]
            st = {s["kode"]: s["status"] for s in out["situs"]}
            assert st == {"33": "terbaca", "31": "terbaca", "73": "terbaca", "21": "terbaca", "65": "terbaca",
                          "81": "tidak_bisa_dicek", "13": "tanpa_pencarian"}, st
            c = out["cakupan"]
            assert (c["diperiksa"], c["tidak_bisa_dicek"], c["tanpa_pencarian"], c["diblokir"]) == (5, 1, 1, 0), c
            # jeda >= 1 detik antarpermintaan ke host yang sama (jam palsu)
            per_host = {}
            for u, t in panggil:
                per_host.setdefault(urllib.parse.urlsplit(u).hostname, []).append(t)
            for h, ts in per_host.items():
                assert all(b - a >= JEDA - 1e-9 for a, b in zip(ts, ts[1:])), (h, ts)
            assert any(len(ts) > 2 for ts in per_host.values()) and tidur, "jeda tidak teruji"
            # 5xx: tidak_bisa_dicek, bukan tidak_ditemukan; status_rpbd mengikuti
            assert status_rpbd([], "2026-11-26", sumber_ok=st["81"] == "terbaca") == "tidak_bisa_dicek"
            per = {}
            for b in out["dok"]:
                assert set(b) == set(KOLOM), sorted(b)
                assert b["url"].startswith("https://") and urllib.parse.urlsplit(b["url"]).hostname in halaman, b["url"]
                per.setdefault(b["kode"], []).append(b)
            # 2025-2029 berlaku; tanpa periode = penetapan + 5 tahun diduga; habis; sesuai Perban 3/2026
            assert status_rpbd(per["33"], "2026-11-26") == "berlaku", per["33"]
            r33 = next(b for b in per["33"] if b["jenis_dok"] == "rpbd" and not b["perubahan"])
            assert r33["periode"] == [2025, 2029] and r33["periode_diduga"] is False, r33
            r3301 = next(b for b in per["3301"] if b["jenis_dok"] == "rpbd")
            assert r3301["periode_diduga"] and r3301["tgl_tetap"] == "2022-05-10" and r3301["berlaku_sampai"] == "2027-05-10", r3301
            assert status_rpbd(per["3301"], "2026-11-26") == "berlaku" and status_rpbd(per["3301"], "2027-05-10") == "habis"
            assert status_rpbd(per["31"], "2026-11-26") == "berlaku"  # 2023-2027; dokumen 2014-2019 lebih tua tidak menang
            assert status_rpbd(per["73"], "2026-11-26") == "habis"     # 2021-2025
            assert status_rpbd(per["21"], "2026-11-26") == "sesuai_3_2026", per["21"]
            assert status_rpbd(per.get("65", []), "2026-11-26") == "tidak_ditemukan"
            assert {b["jenis_dok"] for b in out["dok"]} >= {"rpbd", "renkon", "rpkb", "rencana_aksi", "cabut"}
            renkon = [b for b in out["dok"] if b["jenis_dok"] == "renkon"]
            assert any(b["kode"] == "3302" for b in renkon), renkon  # Peraturan Bupati Banyumas di situs provinsi
            assert any(g["judul"].startswith("Peraturan Bupati Antah") for g in out["kode_gagal"]), out["kode_gagal"]
            assert not any("contoh.org" in b["url"] or b["url"].startswith("javascript") for b in out["dok"])
            assert not any(":8443" in b["url"] or "@" in b["url"] for b in out["dok"]), "port atau userinfo lolos"
            assert any(b["url"].endswith("/dok/8") for b in out["dok"]) and not any("<" in b["judul"] for b in out["dok"]), "markup terenkode tersimpan"
            teks = json.dumps(out, ensure_ascii=False)
            assert not re.search(r"[\w.+-]+@[\w-]+\.[a-z]", teks) and not re.search(r"(?:\+62|\b0)8\d{7,11}", teks), "data orang bocor"
            # cache 30 hari (jam palsu): hari ke-29 tanpa jaringan, hari ke-31 minta ulang
            n = len(panggil)
            panen._sekarang = lambda: mulai + dt.timedelta(days=29)  # noqa: E731
            assert jalan()["jdih_daerah"]["dok"] == out["dok"]
            assert [u for u, _ in panggil[n:] if "malukuprov" not in u] == [], "cache segar memanggil jaringan"
            panen._sekarang = lambda: mulai + dt.timedelta(days=31)  # noqa: E731
            jalan()
            assert sum(1 for u, _ in panggil[n:] if "jatengprov" in u) == len(KATA_KUNCI), "cache basi tidak diambil ulang"
            # cache ada di data/raw (diabaikan git), bukan public/
            assert asli[0].startswith(os.path.join(AKAR, "data", "raw") + os.sep)
    finally:
        panen.CACHE, panen._buka, panen._tidur, panen._sekarang, panen.jaring.time, panen.HOST_IZIN = asli[:6]
        globals()["SITUS"], globals()["_PEMDA"] = asli[6], asli[7]
        panen._robots.clear()
    # daftar situs: 38 provinsi, host .go.id, cari memuat {q}
    with open(SITUS, encoding="utf-8") as f:
        daftar = json.load(f)
    assert len(daftar) == 38 and len({s["kode"] for s in daftar}) == 38
    assert all(urllib.parse.urlsplit(s["url"]).hostname.endswith(".go.id") for s in daftar)
    assert all(s["cari"] is None or ("{q}" in s["cari"] and s["cari"].startswith(s["url"])) for s in daftar)
    print("jdih_daerah.py --cek: lulus")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    elif "--probe" in sys.argv:
        probe("--tulis" in sys.argv)
    else:
        print(__doc__)
