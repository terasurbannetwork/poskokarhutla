#!/usr/bin/env python3
"""Misi Udara: flight plan helikopter rute urut tetap untuk semua bencana (paket data/kajian-bnpb/misi-udara/, tiket MU-01 sampai MU-03).

Usulan, bukan perintah terbang: rute, ketinggian, dan izin wilayah udara ditetapkan pilot (PIC) dan komando.
Satu mesin untuk semua bencana (Paritas D1). Zona, belokan, daya tahan, kelayakan, dan pola cari (MU-05 sampai MU-08) belum ada:
keluaran menulis "zona belum diperiksa" dan tidak pernah menulis "aman". Python stdlib saja; berjalan di 3.9 dan 3.12.

  python3 -I scripts/umum/misi_udara.py uji
  python3 -I scripts/umum/misi_udara.py buat --bencana banjir --misi dropping --base "WIMK|Lanud Soewondo|3.5589|98.6719" \\
      --titik "Nama titik|2.7949, 97.8966|darat=30" --titik "Nama lain|1.6921, 98.8426|menyusul" [--akhir BASE] [--tipe AW139] \\
      [--kecepatan 200] [--berangkat 2026-11-16T07:00+07:00] [--keluar DIR] [--buka-tautan] [--tanpa-citra|--citra]

--base dan --akhir: "KODE|Nama|lat|lon" atau kode ICAO/id/IATA dari public/data/udara.json.
--titik: "Nama|titik|opsi;opsi", titik berupa desimal, DMS, tautan Google Maps, atau plus code (lihat baca_titik); opsi: darat=<menit>,
orbit[=<menit>], menyusul. Bawaan --keluar: ~/Documents/Laporan-Harian-BNPB/misi-udara/<tanggal>/ (di luar repo, D7); tidak pernah ke public/.
"""
import argparse
import copy
import html
import importlib.util
import json
import math
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

UMUM = Path(__file__).resolve().parent
AKAR = UMUM.parents[1]
WIB = timedelta(hours=7)
STATUS_ZONA = "zona belum diperiksa"
TIDAK_DIPERIKSA = [("zona", "pemeriksaan zona belum dibangun (MU-05, MU-07)"), ("NOTAM", "NOTAM tidak diperiksa")]
KALIMAT_USULAN = ("Usulan untuk perencanaan, bukan perintah terbang: rute, ketinggian, dan izin wilayah udara ditetapkan pilot (PIC) dan komando.")
KATA_ORANG = {"nama_pilot", "pilot", "kru", "penumpang", "pejabat", "korban", "nama_orang"}


class Galat(ValueError):
    """Masukan tidak sah; pesannya berbahasa Indonesia dan tidak memuat ulang URL penuh."""


# ---------------------------------------------------------------- muat modul tetangga (nama unik, tanpa menyalin kode)
_modul = {}


def _muat(nama, jalur):
    if nama not in _modul:
        spec = importlib.util.spec_from_file_location(nama, str(jalur))
        m = importlib.util.module_from_spec(spec)
        sys.modules[nama] = m
        spec.loader.exec_module(m)
        _modul[nama] = m
    return _modul[nama]


def RP():
    """scripts/operasi/renlap_pdf.py (peta, penanda, CSS, ang); atribut R = scripts/operasi/renlap.py (geometri, dms)."""
    return _muat("operasi_renlap_pdf", AKAR / "scripts/operasi/renlap_pdf.py")


def K():
    """scripts/umum/renlap_keluaran.py (xml, cari_chrome, dokumen, ke_pdf)."""
    return _muat("umum_renlap_keluaran", UMUM / "renlap_keluaran.py")


def ang(x, d=0):
    return RP().ang(x, d)


# ---------------------------------------------------------------- batas terbang dan templat (D5)
KEYAKINAN = ("A", "B", "S")


def periksa_batas(d):
    """Daftar galat pada batas_terbang.json: baris tanpa nilai/satuan/sumber, keyakinan C atau tak dikenal, S tanpa nomor Q, id ganda."""
    g, ada = [], set()
    for kel in ("baris", "tipe"):
        for b in d.get(kel) or []:
            i = b.get("id") if isinstance(b, dict) else None
            if not i:
                g.append("%s: baris tanpa id" % kel)
                continue
            if i in ada:
                g.append("%s: id ganda" % i)
            ada.add(i)
            n = b.get("nilai")
            if isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n):
                g.append("%s: nilai tidak ada atau bukan angka" % i)
            for k in ("label", "satuan", "sumber"):
                if not isinstance(b.get(k), str) or not b[k].strip():
                    g.append("%s: %s kosong" % (i, k))
            ky = b.get("keyakinan")
            if ky not in KEYAKINAN:
                g.append("%s: keyakinan %r ditolak (hanya A, B, S)" % (i, ky))
            if ky == "S" and not re.match(r"^Q\d+$", str(b.get("q") or "")):
                g.append("%s: keyakinan S wajib nomor Q" % i)
            if kel == "tipe" and "daya_tahan_mnt" not in b:
                g.append("%s: tipe tanpa kunci daya_tahan_mnt" % i)
    return g


def periksa_templat(t, batas):
    g = []
    kode_misi = ("dropping", "pantau", "evakuasi", "angkut", "cari", "kunjungan")
    for m in kode_misi:
        x = (t.get("misi") or {}).get(m)
        if not isinstance(x, dict):
            g.append("misi %s tanpa templat" % m)
            continue
        for k in ("label", "bidang", "waktu_di_titik", "daftar_periksa"):
            if not x.get(k):
                g.append("misi %s: %s kosong" % (m, k))
    ids = {b["id"] for b in batas.get("baris", [])}
    for b, daftar in (t.get("bencana") or {}).items():
        if not daftar:
            g.append("bencana %s tanpa daftar periksa" % b)
    teks = list((t.get("lapangan_pendaratan") or {}).get("butir") or [])
    for x in (t.get("misi") or {}).values():
        teks += x.get("daftar_periksa") or []
    for s in teks:
        for tok in re.findall(r"\{(\w+)\}", s):
            if tok not in ids:
                g.append("token {%s} tidak ada di batas_terbang.json" % tok)
    return g


class Batas:
    """Pembaca batas_terbang.json yang mencatat baris mana yang dipakai (untuk label sementara di keluaran)."""

    def __init__(self, d=None):
        self.d = d or json.loads((UMUM / "batas_terbang.json").read_text(encoding="utf-8"))
        g = periksa_batas(self.d)
        if g:
            raise Galat("batas_terbang.json cacat: " + "; ".join(g))
        self.baris = {b["id"]: b for b in self.d["baris"]}
        self.pakai = []

    def nilai(self, i):
        if i not in self.pakai:
            self.pakai.append(i)
        return self.baris[i]["nilai"]

    def tipe(self, i):
        for t in self.d["tipe"]:
            if t["id"].lower() == str(i).lower():
                if t["id"] not in self.pakai:
                    self.pakai.append(t["id"])
                return t
        raise Galat("tipe %s tidak ada; pilihan: %s" % (i, ", ".join(t["id"] for t in self.d["tipe"])))

    def sementara(self):
        """Baris S yang dipakai: [(label, nilai, satuan, q)]."""
        semua = dict(self.baris)
        semua.update({t["id"]: t for t in self.d["tipe"]})
        return [(semua[i]["label"], semua[i]["nilai"], semua[i]["satuan"], semua[i]["q"]) for i in self.pakai if semua[i]["keyakinan"] == "S" or semua[i].get("q")]

    def isi(self, s):
        """Ganti {id} di teks templat dengan angka dan satuan dari batas_terbang.json."""
        def f(m):
            b = self.baris[m.group(1)]
            return ang(b["nilai"], 0 if float(b["nilai"]).is_integer() else (2 if b["nilai"] == 1.05 else 1)) + " " + b["satuan"]
        return re.sub(r"\{(\w+)\}", f, s)


def muat_templat(batas=None):
    t = json.loads((UMUM / "misi_templat.json").read_text(encoding="utf-8"))
    g = periksa_templat(t, batas or json.loads((UMUM / "batas_terbang.json").read_text(encoding="utf-8")))
    if g:
        raise Galat("misi_templat.json cacat: " + "; ".join(g))
    return t


# ---------------------------------------------------------------- MU-02: pembaca titik (ALGORITMA 1)
LAT_MIN, LAT_MAX, LON_MIN, LON_MAX = -11.5, 6.5, 94.5, 141.5
HOST_OK = ("maps.app.goo.gl", "goo.gl", "www.google.com", "google.com", "maps.google.com")
HOST_PENDEK = ("maps.app.goo.gl", "goo.gl")
BATAS_ALIH = 5
BATAS_WAKTU = 10
ALF = "23456789CFGHJMPQRVWX"
N_ = r"[-+]?\d{1,3}(?:\.\d+)?"
RE_DES = re.compile(r"^\s*(%s)\s*(?:,\s+|;\s*)(%s)\s*$" % (N_, N_))
RE_DES_TITIK = re.compile(r"^\s*([-+]?\d{1,3}\.\d+),([-+]?\d{1,3}\.\d+)\s*$")
RE_DMS_G = re.compile(r"^\s*(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*[\"″]?\s*([NSns])[\s,]+(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*[\"″]?\s*([EWew])\s*$")
RE_PC = r"(?<![A-Z0-9])([%s]{2,8})\+([%s]{2,3})(?![A-Z0-9])" % (ALF, ALF)


def _sah(lat, lon):
    if not (math.isfinite(lat) and math.isfinite(lon)):
        raise Galat("koordinat bukan angka yang sah")
    if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
        raise Galat("titik di luar wilayah Indonesia (lintang %s sampai %s, bujur %s sampai %s)" % (LAT_MIN, LAT_MAX, LON_MIN, LON_MAX))
    return lat, lon


def olc_decode(digit):
    """Titik tengah plus code penuh (10 atau 11 digit tanpa tanda +)."""
    if len(digit) not in (10, 11) or any(c not in ALF for c in digit):
        raise Galat("plus code penuh harus 10 atau 11 karakter sah")
    lat, lon, res = -90.0, -180.0, 20.0
    for i in range(0, 10, 2):
        lat += ALF.index(digit[i]) * res
        lon += ALF.index(digit[i + 1]) * res
        if i < 8:
            res /= 20
    if len(digit) == 10:
        return lat + res / 2, lon + res / 2
    b, k = divmod(ALF.index(digit[10]), 4)
    sl, so = res / 5, res / 4
    return lat + b * sl + sl / 2, lon + k * so + so / 2


def _olc_awal(lat, lon, pasang):
    la, lo, res, s = lat + 90, lon + 180, 20.0, ""
    for _ in range(pasang):
        i, j = int(la // res), int(lo // res)
        la, lo, res = la - i * res, lo - j * res, res / 20
        s += ALF[min(i, 19)] + ALF[min(j, 19)]
    return s


def _dari_pluscode(depan, belakang, acuan, maks_km, catat=None):
    if len(depan) == 8:
        lat, lon = olc_decode(depan + belakang)
        return _sah(lat, lon)
    if len(depan) % 2 or len(depan) > 6:
        raise Galat("plus code tidak sah")
    if acuan is None:
        raise Galat("plus code pendek perlu titik acuan (base atau titik sebelumnya) dalam %s km" % maks_km)
    if catat:
        catat()  # acuan dipakai: baris sementara dicatat
    pad = 8 - len(depan)
    lat, lon = olc_decode(_olc_awal(acuan[0], acuan[1], 4)[:pad] + depan + belakang)
    res = 20.0 ** (2 - pad / 2)
    if acuan[0] + res / 2 < lat and lat - res >= -90:
        lat -= res
    elif acuan[0] - res / 2 > lat and lat + res <= 90:
        lat += res
    if acuan[1] + res / 2 < lon and lon - res >= -180:
        lon -= res
    elif acuan[1] - res / 2 > lon and lon + res <= 180:
        lon += res
    if RP().km(acuan, (lat, lon)) > maks_km:
        raise Galat("plus code pendek jatuh lebih dari %s km dari titik acuan; tulis plus code penuh atau koordinat" % maks_km)
    return _sah(lat, lon)


class _TanpaAlih(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def _pembuka_net(u):
    """Satu lompatan tanpa mengikuti pengalihan otomatis: (kode, header Location). Hanya stdlib."""
    try:
        r = urllib.request.build_opener(_TanpaAlih).open(urllib.request.Request(u, headers={"User-Agent": "centurisk97-misi-udara/1"}), timeout=BATAS_WAKTU)
        kode = r.status
        r.close()
        return kode, None
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location")
    except (urllib.error.URLError, OSError):
        raise Galat("tautan pendek tidak bisa dibuka; tempel koordinat saja")


def _cek_host(u):
    p = urllib.parse.urlsplit(u)
    h = (p.hostname or "").lower()
    if p.scheme != "https":
        raise Galat("tautan harus https")
    try:
        port = p.port
    except ValueError:
        raise Galat("port tautan tidak sah")
    if port not in (None, 443):
        raise Galat("port tautan tidak diizinkan")
    if h not in HOST_OK:
        raise Galat("host tautan tidak diizinkan: %s" % h[:60])
    if h in ("www.google.com", "google.com") and not p.path.startswith("/maps"):
        raise Galat("tautan google.com hanya diterima untuk jalur /maps")
    return h


def _ikuti(u, pembuka):
    for _ in range(BATAS_ALIH + 1):
        kode, lok = pembuka(u)
        if kode in (301, 302, 303, 307, 308) and lok:
            u = urllib.parse.urljoin(u, lok)
            _cek_host(u)  # host tiap lompatan diperiksa sebelum dibuka
            continue
        if kode != 200:
            raise Galat("tautan pendek tidak terbuka (kode %s)" % kode)
        return u
    raise Galat("terlalu banyak pengalihan tautan (maks %d)" % BATAS_ALIH)


def _dari_url(u, acuan, buka, pembuka, maks_km, catat=None):
    h = _cek_host(u)
    if h in HOST_PENDEK:
        if not buka:
            raise Galat("tautan pendek perlu --buka-tautan (alamat titik terkirim ke Google), atau tempel koordinat")
        u = _ikuti(u, pembuka or _pembuka_net)
    x = urllib.parse.unquote(u)
    m = (re.search(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", x) or re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", x)
         or re.search(r"[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)", x))
    if m:
        return _sah(float(m.group(1)), float(m.group(2)))
    m = re.search(RE_PC, x)
    if m:
        return _dari_pluscode(m.group(1), m.group(2), acuan, maks_km, catat)
    raise Galat("tautan tidak memuat koordinat maupun plus code")


def baca_titik(teks, acuan=None, buka_tautan=False, pembuka=None, maks_km=50, catat=None):
    """(lat, lon) dari desimal, DMS, tautan Google Maps (panjang; pendek hanya bila buka_tautan), atau plus code. Nama tempat ditolak.
    acuan = (lat, lon) untuk plus code pendek (maks_km dari acuan); pembuka(url) -> (kode, Location) untuk uji tanpa jaringan."""
    t = (teks or "").strip()
    if not t or len(t) > 2000:
        raise Galat("masukan titik kosong atau terlalu panjang")
    m = re.search(r"https?://\S+", t)
    if m:
        return _dari_url(m.group(0).rstrip(".,;)"), acuan, buka_tautan, pembuka, maks_km, catat)
    m = RE_DES.match(t) or RE_DES_TITIK.match(t)
    if m:
        return _sah(float(m.group(1)), float(m.group(2)))
    m = RE_DMS_G.match(t)
    if m:
        g = m.groups()
        lat = int(g[0]) + int(g[1]) / 60 + float(g[2]) / 3600
        lon = int(g[4]) + int(g[5]) / 60 + float(g[6]) / 3600
        return _sah(-lat if g[3] in "Ss" else lat, -lon if g[7] in "Ww" else lon)
    if re.match(r"^\s*[NSns]\s*\d+\s*°", t):
        try:
            return _sah(*RP().R.dari_dms(t))
        except ValueError:
            raise Galat("DMS tidak terbaca")
    m = re.match(r"^\s*" + RE_PC.replace("(?<![A-Z0-9])", "") + r"(?=\s|,|$)", t.upper())
    if m:
        return _dari_pluscode(m.group(1), m.group(2), acuan, maks_km, catat)
    raise Galat("titik tidak terbaca: pakai koordinat desimal, DMS, tautan Google Maps, atau plus code (nama tempat saja ditolak)")


# ---------------------------------------------------------------- MU-03: rute urut tetap (ALGORITMA 2, 5)
def muat_base(s, batas):
    s = s.strip()
    if "|" in s:
        p = [x.strip() for x in s.split("|")]
        if len(p) != 4 or not p[0] or not p[1]:
            raise Galat('base harus "KODE|Nama|lat|lon"')
        try:
            lat, lon = _sah(float(p[2]), float(p[3]))
        except ValueError:
            raise Galat("lat/lon base bukan angka")
        return {"kode": p[0], "nama": p[1], "lat": lat, "lon": lon}
    for b in json.loads((AKAR / "public/data/udara.json").read_text(encoding="utf-8")):
        if s.lower() in (str(b.get("id")).lower(), str(b.get("icao")).lower(), str(b.get("iata")).lower()):
            return {"kode": b.get("icao") or b["id"], "nama": b["nama"], "lat": b["lat"], "lon": b["lon"]}
    raise Galat("base %s tidak ada di public/data/udara.json" % s[:30])


def muat_titik(spek, i, acuan, misi, templat, batas, buka, pembuka):
    p = [x.strip() for x in spek.split("|")]
    if len(p) < 2 or not p[0]:
        raise Galat('titik harus "Nama|titik|opsi" (nama dan titik wajib)')
    lat, lon = baca_titik(p[1], acuan, buka, pembuka, batas.baris["acuan_pluscode_km"]["nilai"], lambda: batas.nilai("acuan_pluscode_km"))
    opsi = {}
    for o in [y.strip() for x in p[2:] for y in x.split(";") if y.strip()]:
        k, _, v = o.partition("=")
        if k not in ("darat", "orbit", "menyusul"):
            raise Galat("opsi titik %s tidak dikenal (darat=, orbit=, menyusul)" % k[:20])
        if k == "menyusul":
            opsi[k] = True
        elif v == "":
            if k == "darat":
                raise Galat("darat= wajib diisi menit")
            opsi[k] = None
        else:
            try:
                opsi[k] = float(v.replace(",", "."))
            except ValueError:
                raise Galat("%s= harus angka menit" % k)
            if not 0 <= opsi[k] <= 600:
                raise Galat("%s= di luar 0 sampai 600 menit" % k)
    w = templat["misi"][misi]["waktu_di_titik"]
    menyusul = bool(opsi.get("menyusul"))
    if "darat" in opsi:
        peran, mnt = "darat", opsi["darat"]
    elif "orbit" in opsi:
        peran = "orbit"
        mnt = opsi["orbit"] if opsi["orbit"] is not None else (batas.nilai(w["orbit"]) if w.get("orbit") else None)
        if mnt is None:
            raise Galat("misi %s tidak memakai orbit" % misi)
    elif w["darat"] == "wajib":
        peran, mnt = "darat", None
        if not menyusul:
            raise Galat("titik %d (%s): waktu di titik wajib diketik (darat=<menit>)" % (i, p[0][:40]))
    elif w.get("bawaan") == "orbit":
        peran, mnt = "orbit", batas.nilai(w["orbit"])
    else:
        peran, mnt = "darat", 0.0 if w["darat"] == "tidak" else None
    return {"urut": i, "kode": "T%d" % i, "nama": p[0], "lat": lat, "lon": lon, "peran": peran, "menyusul": menyusul, "di_titik_mnt": mnt}


def hitung(titik, v, base_awal, base_akhir):
    """Leg base -> titik -> base akhir: haversine, haluan sejati, menit terbang pada v km/jam. Urutan titik tidak diubah (K1)."""
    rp = RP()
    rute = [dict(base_awal, kode=base_awal["kode"])] + titik + [dict(base_akhir, kode=base_akhir["kode"])]
    leg, kum_km, kum_mnt = [], 0.0, 0.0
    rute[0].update(kum_km=0.0, kum_mnt=0.0)
    for i in range(1, len(rute)):
        a, c = rute[i - 1], rute[i]
        j = rp.km((a["lat"], a["lon"]), (c["lat"], c["lon"]))
        mnt = j / v * 60
        kum_km += j
        kum_mnt += mnt
        c.update(kum_km=kum_km, kum_mnt=kum_mnt)
        leg.append({"no": i, "dari": a["kode"], "ke": c["kode"], "lat": c["lat"], "lon": c["lon"], "haluan": rp.R.baringan(a["lat"], a["lon"], c["lat"], c["lon"]) if j >= 0.05 else None,
                    "km": j, "nm": j / rp.R.NM_KM, "mnt": mnt, "belokan": None})
    return rute, leg


def susun(bencana, misi, base, titik_spek, akhir, tipe, kecepatan, berangkat, buka, pembuka=None, batas=None, templat=None, kini=None):
    """Rencana lengkap (dict siap JSON): kunci "dibuat" paling pertama, tanpa nama orang."""
    B = batas or Batas()
    T = templat or muat_templat(B.d)
    if misi not in T["misi"]:
        raise Galat("misi %s tidak dikenal; pilihan: %s" % (misi, ", ".join(T["misi"])))
    if bencana not in T["bencana"]:
        raise Galat("bencana %s tidak dikenal; pilihan: %s" % (bencana, ", ".join(T["bencana"])))
    ok = T["misi"][misi]["bencana"]
    if ok != "semua" and bencana not in ok:
        raise Galat("misi %s hanya untuk bencana: %s" % (misi, ", ".join(ok)))
    if not titik_spek:
        raise Galat("minimal satu --titik")
    if len(titik_spek) > 30:
        raise Galat("titik terlalu banyak (maks 30)")
    t_tipe = B.tipe(tipe) if tipe else None
    if kecepatan is not None:
        v = float(kecepatan)
    elif t_tipe:
        v = float(t_tipe["nilai"])
    else:
        v = float(B.nilai("kecepatan_bawaan_kmj"))
    if not 20 <= v <= 600:
        raise Galat("kecepatan di luar 20 sampai 600 km/jam")
    akhir = akhir or base
    titik, acuan = [], (base["lat"], base["lon"])
    for i, s in enumerate(titik_spek, 1):
        t = muat_titik(s, i, acuan, misi, T, B, buka, pembuka)
        titik.append(t)
        acuan = (t["lat"], t["lon"])
    rute, leg = hitung(titik, v, base, akhir)
    tot_km = sum(x["km"] for x in leg)
    di_titik = sum(t["di_titik_mnt"] or 0 for t in titik)
    tot = {"km": tot_km, "nm": tot_km / RP().R.NM_KM, "terbang_mnt": tot_km / v * 60, "di_titik_mnt": di_titik}
    perhatian, q15 = [], False
    if berangkat:
        try:
            b = datetime.fromisoformat(berangkat.replace("Z", "+00:00"))
        except ValueError:
            raise Galat("--berangkat harus ISO, contoh 2026-11-16T07:00+07:00")
        if not 6 <= b.hour < 18:
            perhatian.append("terbang di luar jam terang (06.00 sampai 18.00 waktu setempat)")
            q15 = True
    kini = kini or datetime.now(timezone.utc)
    sem = B.sementara()
    qs = sorted({q for _, _, _, q in sem} | ({"Q15"} if q15 else set()), key=lambda q: int(q[1:]))
    r = {"dibuat": (kini.astimezone(timezone(WIB))).isoformat(timespec="seconds"), "versi": 1, "bencana": bencana, "misi": misi,
         "status": STATUS_ZONA,
         "base": base, "base_akhir": akhir if akhir is not base else None, "tipe": t_tipe["id"] if t_tipe else None, "kecepatan_kmj": v,
         "berangkat": berangkat or None,
         "titik": [{k: t[k] for k in ("urut", "nama", "lat", "lon", "peran", "menyusul", "di_titik_mnt")} for t in titik],
         "leg": [{"no": x["no"], "dari": x["dari"], "ke": x["ke"], "haluan": None if x["haluan"] is None else (round(x["haluan"]) % 360 or 360), "km": round(x["km"], 1),
                  "nm": round(x["nm"], 1), "mnt": round(x["mnt"], 1), "belokan": None} for x in leg],
         "total": {"km": round(tot_km, 1), "nm": round(tot_km / RP().R.NM_KM, 1), "terbang_mnt": round(tot_km / v * 60, 1), "di_titik_mnt": round(di_titik, 1)},
         "zona": [], "tidak_diperiksa": [{"sumber": s, "alasan": a} for s, a in TIDAK_DIPERIKSA], "perhatian": perhatian,
         "daya_tahan": {"hasil": "daya tahan tipe belum ada datanya" if t_tipe else "tipe tidak dipilih, daya tahan tidak dihitung"},
         "sementara": qs,
         "sementara_dipakai": [{"label": i, "nilai": n, "satuan": s, "q": q} for i, n, s, q in sem],
         "_rute": rute, "_leg": leg, "_tot": tot}
    return r


def hapus_dalam(r):
    """Salinan tanpa bidang kerja (_rute, _leg) untuk JSON."""
    return {k: v for k, v in r.items() if not k.startswith("_")}


# ---------------------------------------------------------------- keluaran: teks WA, KML, GPX, HTML/PDF
def judul(r):
    b = r["base"]["nama"]
    return " - ".join([b] + [t["nama"] for t in r["titik"]] + [(r["base_akhir"] or r["base"])["nama"]])


def nama_titik(t):
    return t["nama"] + (" (titik menyusul)" if t["menyusul"] else "")


def hal(x):
    """Haluan tiga angka; leg berjarak nol (None) dicetak tanda strip."""
    return "–" if x is None else "%03d" % (round(x) % 360 or 360)


def teks_wa(r, tanggal):
    rp = RP()
    L = ["*Flight plan %s, %s %s: %s* (usulan, bukan perintah terbang)" % (tanggal, r["misi"], r["bencana"], judul(r))]
    nama = {t["kode"]: t for t in r["_rute"]}
    for x in r["_leg"]:  # nilai mentah yang sama dengan PDF; pembulatan hanya di JSON
        c = nama[x["ke"]]
        L.append("Leg %d %s ke %s %s: haluan %s%s, %s km (%s NM), %s mnt, %.4f, %.4f %s" % (
            x["no"], x["dari"], x["ke"], c.get("nama") or c["kode"], hal(x["haluan"]), "" if x["haluan"] is None else "°", ang(x["km"]), ang(x["nm"]), ang(x["mnt"]), c["lat"], c["lon"], rp.gmaps(c["lat"], c["lon"])))
    T = r["_tot"]
    L.append("Total %s km (%s NM), %s mnt terbang pada %s km/jam; waktu di titik %s mnt." % (ang(T["km"]), ang(T["nm"]), ang(T["terbang_mnt"]), ang(r["kecepatan_kmj"]), ang(T["di_titik_mnt"])))
    L.append("Status: %s. %s." % (r["status"], "; ".join(x["alasan"] for x in r["tidak_diperiksa"])))
    for p in r["perhatian"]:
        L.append("Perhatian: " + p)
    if r["sementara_dipakai"]:
        L.append("Angka sementara: " + ", ".join("%s %s %s (%s)" % (s["label"], ang(s["nilai"], 0 if float(s["nilai"]).is_integer() else 2), s["satuan"], s["q"]) for s in r["sementara_dipakai"]))
    return "\n".join(L)


def kml(r, nama):
    x = K().xml
    pm = ["<Placemark><name>Base %s</name><Point><coordinates>%r,%r,0</coordinates></Point></Placemark>" % (x(r["base"]["nama"]), r["base"]["lon"], r["base"]["lat"])]
    for t in r["titik"]:
        pm.append("<Placemark><name>%s</name><description>%s</description><Point><coordinates>%r,%r,0</coordinates></Point></Placemark>" % (
            x("T%d %s" % (t["urut"], t["nama"])), x("titik menyusul" if t["menyusul"] else t["peran"]), t["lon"], t["lat"]))
    jalur = " ".join("%r,%r,0" % (p["lon"], p["lat"]) for p in r["_rute"])
    pm.append("<Placemark><name>Rute</name><LineString><coordinates>%s</coordinates></LineString></Placemark>" % jalur)
    return ('<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>%s</name><description>%s</description>%s</Document></kml>'
            % (x(nama), x("Usulan flight plan, bukan perintah terbang."), "".join(pm)))


def gpx(r, nama):
    x = K().xml
    w = ['<wpt lat="%r" lon="%r"><name>%s</name></wpt>' % (r["base"]["lat"], r["base"]["lon"], x(r["base"]["kode"]))]
    for t in r["titik"]:
        w.append('<wpt lat="%r" lon="%r"><name>T%d</name><desc>%s</desc></wpt>' % (t["lat"], t["lon"], t["urut"], x(nama_titik(t))))
    rte = "".join('<rtept lat="%r" lon="%r"><name>%s</name></rtept>' % (p["lat"], p["lon"], x(p["kode"])) for p in r["_rute"])
    return ('<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Centurisk97" xmlns="http://www.topografix.com/GPX/1/1">'
            "<metadata><name>%s</name><desc>%s</desc></metadata>%s<rte><name>Flight plan</name>%s</rte></gpx>"
            % (x(nama), x("Usulan flight plan, bukan perintah terbang."), "".join(w), rte))


CSS_TAMBAH = ".kartu h3{text-transform:none}th{text-align:center}.kartu ul,.kartu ol{margin-right:3mm}.kartu{margin-bottom:3mm}"


def kelompok_dekat(P, titik, px=60):
    """Titik tujuan yang di peta utama berjarak kurang dari px piksel dari titik lain: label dan nomornya bertumpuk, perlu peta perbesaran."""
    return [t for t in titik if any(u is not t and math.dist(P(t["lat"], t["lon"]), P(u["lat"], u["lon"])) < px for u in titik)]


def kartu_besar(rp, b, rute):
    """Kartu peta perbesaran untuk titik berdempetan: rute yang lewat, penanda bernomor, label penuh, skala."""
    P, W, H = b["P"], b["W"], b["H"]
    s = rp.svg_rute(P, rute, W, H)
    for t in b["titik"]:
        s += rp.penanda(P, t, 15, label=nama_titik(t), ukuran=22)
    s += rp.skala(W, H, b["mpp"], next(k for k in (0.5, 1, 2, 5, 10, 20, 50) if k * 1000 / b["mpp"] >= W * .15)) + rp.utara(W) + ["</svg>"]
    nama = " dan ".join(nama_titik(t) for t in b["titik"])
    return ('<div class="kartu"><h3>Perbesaran: %s</h3><div class="peta" style="height:%.0fmm">%s%s</div></div>'
            % (html.escape(nama), b["tinggi_mm"], ('<img src="%s">' % html.escape(b["gambar"])) if b["gambar"] else "", "".join(s)))


def halaman(r, P, W, H, mpp, gambar, tanggal, templat, batas, besar=None):
    """HTML tiga halaman: (1) peta, urutan titik, empat angka; (2) tabel leg; (3) pemeriksaan, daftar periksa, yang diputuskan, kaki."""
    rp = RP()
    e = html.escape
    base, akhir, rute, leg, T = r["base"], r["base_akhir"] or r["base"], r["_rute"], r["_leg"], r["_tot"]
    d = date.fromisoformat(tanggal)
    meta = {"per": "%d %s %d" % (d.day, rp.BULAN[d.month - 1], d.year)}
    kanan = "Tanggal<b>%s</b>" % meta["per"]
    tm = templat["misi"][r["misi"]]
    ey = "BNPB, flight plan helikopter %s, %s" % (tm["label"].lower(), r["bencana"])
    s = rp.svg_rute(P, rute, W, H)
    s += rp.penanda(P, rute[0], 15, base=True, label=base["nama"])
    if (akhir["lat"], akhir["lon"]) != (base["lat"], base["lon"]):
        s += rp.penanda(P, rute[-1], 15, base=True, label=akhir["nama"])
    dekat = {t["urut"] for t in (besar or {}).get("titik", [])}
    for t in r["titik"]:
        if t["urut"] in dekat:   # titik berdempetan: satu label gabungan, rinciannya di peta perbesaran
            lbl = " dan ".join(nama_titik(x).split(",")[0] for x in besar["titik"]) if t["urut"] == min(dekat) else None
            s += rp.penanda(P, t, 13, label=lbl, ukuran=18)
            continue
        s += rp.penanda(P, t, 13, label=nama_titik(t).split(",")[0], ukuran=18)   # label peta pendek supaya tidak terpotong tepi; nama lengkap ada di tabel
    s += rp.skala(W, H, mpp, next(k for k in (5, 10, 20, 25, 50, 100, 200) if k * 1000 / mpp >= W * .12)) + rp.utara(W) + ["</svg>"]
    pil = ' <span class="pil abu">titik menyusul</span>'
    baris = ""
    for t in rute:
        awal = t is rute[0] or t is rute[-1]
        di = "–" if awal or t.get("di_titik_mnt") is None else ang(t["di_titik_mnt"]) + " mnt"
        baris += ('<tr><td><span class="bul%s">%s</span></td><td><b>%s</b> %s%s</td><td class="n"><a href="%s">%.4f, %.4f</a></td><td class="n">%s</td>'
                  '<td class="n">%s km</td><td class="n">+%s mnt</td></tr>') % (
            " b" if awal else "", "B" if awal else t["urut"], e(t["kode"]), e(t.get("nama") or ""), pil if t.get("menyusul") else "",
            rp.gmaps(t["lat"], t["lon"]), t["lat"], t["lon"], di, ang(t["kum_km"]), ang(t["kum_mnt"]))
    n_sm = sum(1 for t in r["titik"] if t["menyusul"])
    kpi = ('<div class="kpi"><div class="o"><b>%s titik tujuan</b><span>%s</span></div>'
           '<div><b>%s leg</b><span>berangkat dari %s, kembali ke %s</span></div>'
           '<div><b>± %s km</b><span>garis lurus (%s NM)</span></div>'
           '<div class="o"><b>± %s menit terbang</b><span>pada %s km/jam, di titik %s menit</span></div></div>') % (
        ang(len(r["titik"])), ("%s di antaranya masih menyusul, koordinat sementara" % ang(n_sm)) if n_sm else "semua koordinat sudah pasti", ang(len(leg)), e(base["nama"]), e(akhir["nama"]), ang(T["km"]), ang(T["nm"]), ang(T["terbang_mnt"]), ang(r["kecepatan_kmj"]), ang(T["di_titik_mnt"]))
    sem = "; ".join("%s %s %s (%s)" % (s_["label"], ang(s_["nilai"], 0 if float(s_["nilai"]).is_integer() else 2), s_["satuan"], s_["q"]) for s_ in r["sementara_dipakai"]) or "tidak ada"
    kaki = ('<div class="kaki">%s Jarak garis lurus (lingkaran besar), haluan sejati, kecepatan jelajah %s km/jam tanpa angin. %s '
            'Status pemeriksaan: %s. Bawaan sementara yang dipakai: %s.</div>') % (e(KALIMAT_USULAN), ang(r["kecepatan_kmj"]), "Citra Esri World Imagery." if gambar else "Peta tanpa citra satelit.", e(r["status"]), e(sem))
    h1 = ('<section class="hal">%s%s<div class="dua"><div><div class="peta" style="height:118mm">%s%s</div>'
          '<div class="leg"><span><i style="background:#e8590c"></i>Titik tujuan</span><span><i style="background:#0b2545"></i>Base</span>'
          '<span style="color:#0284c7">Rute dan arah terbang</span></div></div>'
          '<div><div class="kartu"><h3>Urutan titik, klik koordinat untuk Google Maps</h3><table><thead><tr><th></th><th>Titik</th><th>Koordinat</th><th>Di titik</th>'
          '<th>Jarak tempuh</th><th>Waktu terbang</th></tr></thead><tbody>%s</tbody></table>'
          '<p class="fnd">Jarak dan waktu kumulatif sejak lepas landas, waktu di titik tidak termasuk.</p></div>%s</div></div>%s</section>') % (
        rp.kepala(ey, judul(r), meta, kanan), kpi, ('<img src="%s">' % e(gambar)) if gambar else "", "".join(s), baris,
        kartu_besar(rp, besar, rute) if besar else "", kaki)
    lb = "".join('<tr><td>%d</td><td style="white-space:nowrap"><b>%s</b> ke <b>%s</b></td><td class="mono">%s</td><td class="n"><a href="%s">%.4f, %.4f</a></td>'
                 '<td class="n"><b>%s%s</b></td><td class="n">%s km</td><td class="n">%s NM</td><td class="n">%s mnt</td></tr>' % (
        x["no"], e(x["dari"]), e(x["ke"]), rp.R.dms(x["lat"], x["lon"]), rp.gmaps(x["lat"], x["lon"]), x["lat"], x["lon"],
        hal(x["haluan"]), "" if x["haluan"] is None else "°", ang(x["km"], 1), ang(x["nm"], 1), ang(x["mnt"])) for x in leg)
    lb += ('<tr><td></td><td><b>Total</b></td><td></td><td></td><td></td><td class="n"><b>%s km</b></td><td class="n"><b>%s NM</b></td><td class="n"><b>%s mnt</b></td></tr>'
           % (ang(T["km"]), ang(T["nm"]), ang(T["terbang_mnt"])))
    h2 = ('<section class="hal">%s<div class="kartu"><h3>Tabel leg untuk pilot</h3><table><thead><tr><th>Leg</th><th>Dari ke</th><th>Koordinat tujuan (DMS)</th>'
          '<th>Google Maps</th><th>Haluan sejati</th><th>Jarak</th><th>NM</th><th>Waktu</th></tr></thead><tbody>%s</tbody></table>'
          '<p class="fnd">Waktu leg pada %s km/jam tanpa angin, belum termasuk waktu di titik. Haluan sejati, belum dikoreksi variasi magnet.</p></div>%s</section>') % (
        rp.kepala(ey, "Tabel leg untuk pilot: haluan, jarak, dan waktu", meta, kanan), lb, ang(r["kecepatan_kmj"]), kaki)
    periksa = "".join("<tr><td>%s</td><td>%s</td></tr>" % (e(s_), e(a)) for s_, a in [(x["sumber"], x["alasan"]) for x in r["tidak_diperiksa"]])
    periksa += "<tr><td>daya tahan</td><td>%s</td></tr>" % e(r["daya_tahan"]["hasil"])
    periksa += "".join("<tr><td>perhatian</td><td>%s</td></tr>" % e(p) for p in r["perhatian"])
    ls = lambda xs: "".join("<li>%s</li>" % e(batas.isi(x)) for x in xs)
    lap = templat["lapangan_pendaratan"]
    kartu_lap = ('<div class="kartu"><h3>%s</h3><ul>%s</ul><p class="fnd">%s</p></div>' % (e(lap["judul"]), ls(lap["butir"]), e(lap["catatan"]))) if tm["lapangan_pendaratan"] else ""
    putus = "".join("<li>Koordinat pasti titik %d, %s (sekarang titik sementara).</li>" % (t["urut"], e(t["nama"])) for t in r["titik"] if t["menyusul"])
    putus += "".join("<li>Lama di titik %d, %s, belum diketik.</li>" % (t["urut"], e(t["nama"])) for t in r["titik"] if t["menyusul"] and t["di_titik_mnt"] is None)
    putus += ("<li>Jenis helikopter, kecepatan jelajah, muatan, dan kebutuhan isi ulang bahan bakar; hitungan memakai %s km/jam.</li>"
              "<li>Cuaca di base dan titik, NOTAM, dan zona terlarang diperiksa pilot dan Baseops sebelum terbang.</li>" % ang(r["kecepatan_kmj"]))
    h3 = ('<section class="hal">%s<div class="dua" style="grid-template-columns:1fr 1fr"><div>'
          '<div class="kartu"><h3>Pemeriksaan: %s</h3><table><thead><tr><th>Sumber</th><th>Keterangan</th></tr></thead><tbody>%s</tbody></table></div>'
          '<div class="kartu"><h3>Yang perlu diputuskan</h3><ol>%s</ol></div></div>'
          '<div><div class="kartu"><h3>Daftar periksa misi: %s</h3><ul>%s</ul></div>'
          '<div class="kartu"><h3>Daftar periksa bencana: %s</h3><ul>%s</ul></div>%s</div></div>%s</section>') % (
        rp.kepala(ey, "Pemeriksaan dan daftar periksa", meta, kanan), e(r["status"]), periksa, putus, e(tm["label"].lower()), ls(tm["daftar_periksa"]),
        e(r["bencana"]), ls(templat["bencana"][r["bencana"]]), kartu_lap, kaki)
    return h1 + h2 + h3


def periksa_keluar(misi, keluar):
    """D7: tidak pernah ke public/; jenis kunjungan juga tidak ke mana pun di dalam repo (repo ini publik)."""
    p, akar = Path(keluar).expanduser().resolve(), AKAR.resolve()
    pc = str(p).casefold()  # APFS tak peka huruf: PUBLIC/x sama dengan public/x
    di = lambda d: pc == str(d).casefold() or pc.startswith(str(d).casefold().rstrip("/") + "/")
    if di(akar / "public"):
        raise Galat("--keluar tidak boleh di dalam public/")
    if misi == "kunjungan" and di(akar):
        raise Galat("misi kunjungan tidak boleh disimpan di dalam repo (repo publik); pilih --keluar di luar repo")
    return p


def pakai_citra(misi, citra, tanpa):
    """kunjungan tidak mengirim areanya ke server ubin kecuali --citra."""
    return bool(citra or (not tanpa and misi != "kunjungan"))


def periksa_kerja(misi, kerja):
    """Folder kerja tidak boleh symlink, dan hasil resolve-nya tunduk pada aturan --keluar yang sama (public/, repo untuk kunjungan)."""
    if Path(kerja).is_symlink():
        raise Galat("folder kerja tidak boleh symlink")
    return periksa_keluar(misi, kerja)


def peta(rp, clat, clon, z, W, H, cache, jpg, citra, bingkai=None):
    """(proyeksi, ada_citra). Tanpa citra: latar polos, tidak ada unduhan ubin sama sekali."""
    if citra:
        try:
            cache.mkdir(parents=True, exist_ok=True)
            return (bingkai or rp.bingkai)(clat, clon, z, W, H, cache, jpg), True
        except Exception as ex:  # citra tak terunduh: peta tetap digambar di latar polos
            print("peringatan: citra satelit tidak terunduh (%s)" % type(ex).__name__, file=sys.stderr)
    cx, cy = rp.gpx(clat, clon, z)
    return (lambda la_, lo_: tuple(v - o for v, o in zip(rp.gpx(la_, lo_, z), (cx - W / 2, cy - H / 2)))), False


def aman_nama(s):
    return re.sub(r"\s+", " ", re.sub(r'[\\/:*?"<>|]', "", s)).strip()[:110]


def buat(a):
    rp, k = RP(), K()
    B = Batas()
    T = muat_templat(B.d)
    base = muat_base(a.base, B)
    akhir = muat_base(a.akhir, B) if a.akhir else None
    r = susun(a.bencana, a.misi, base, a.titik, akhir, a.tipe, a.kecepatan, a.berangkat, a.buka_tautan, batas=B, templat=T)
    if r["base_akhir"] is None:
        r["_rute"][-1]["nama"] = base["nama"]
    tanggal = (datetime.fromisoformat(a.berangkat.replace("Z", "+00:00")).date().isoformat() if a.berangkat else (datetime.now(timezone.utc) + WIB).date().isoformat())
    keluar = periksa_keluar(a.misi, a.keluar or (Path.home() / "Documents/Laporan-Harian-BNPB/misi-udara" / tanggal))
    kerja = keluar / "kerja"
    kerja.mkdir(parents=True, exist_ok=True)
    periksa_kerja(a.misi, kerja)
    cache = rp.KERJA / "ubin"
    W, H = 1100, 1060
    la, lo = [t["lat"] for t in r["_rute"]], [t["lon"] for t in r["_rute"]]
    z = 12
    while z > 4:
        (ax, ay), (bx, by) = rp.gpx(max(la), min(lo), z), rp.gpx(min(la), max(lo), z)
        if (bx - ax) * 1.3 <= W and (by - ay) * 1.3 <= H:
            break
        z -= 1
    clat, clon = (min(la) + max(la)) / 2, (min(lo) + max(lo)) / 2
    # kunjungan: area tidak dikirim ke server ubin kecuali --citra
    P, ada = peta(rp, clat, clon, z, W, H, cache, kerja / "rute.jpg", pakai_citra(a.misi, a.citra, a.tanpa_citra))
    besar = None
    dekat = kelompok_dekat(P, r["titik"])
    if dekat:   # titik berdempetan di peta utama: tambah peta perbesaran di halaman 1
        W2, H2, la2, lo2 = 1100, 520, [t["lat"] for t in dekat], [t["lon"] for t in dekat]
        z2 = 16
        while z2 > z:
            (ax, ay), (bx, by) = rp.gpx(max(la2), min(lo2), z2), rp.gpx(min(la2), max(lo2), z2)
            if (bx - ax) * 2.5 <= W2 and (by - ay) * 2.5 <= H2:
                break
            z2 -= 1
        c2 = ((min(la2) + max(la2)) / 2, (min(lo2) + max(lo2)) / 2)
        P2, ada2 = peta(rp, c2[0], c2[1], z2, W2, H2, cache, kerja / "perbesaran.jpg", pakai_citra(a.misi, a.citra, a.tanpa_citra))
        besar = {"P": P2, "W": W2, "H": H2, "mpp": rp.m_per_px(c2[0], z2), "gambar": "perbesaran.jpg" if ada2 else "", "titik": dekat, "tinggi_mm": 150 * H2 / W2}
    nama = "Flight Plan %s %s" % (aman_nama(judul(r)), date.fromisoformat(tanggal).strftime("%d%m%y"))
    isi = halaman(r, P, W, H, rp.m_per_px(clat, z), "rute.jpg" if ada else "", tanggal, T, B, besar)
    hf = kerja / "flight_plan.html"
    hf.write_text(k.dokumen(html.escape("Flight plan"), isi, rp.CSS + CSS_TAMBAH), encoding="utf-8")
    pdf = keluar / (nama + ".pdf")
    k.ke_pdf(k.cari_chrome(), hf, pdf)
    teks = teks_wa(r, tanggal)
    (keluar / (nama + ".kml")).write_text(kml(r, nama), encoding="utf-8")
    (keluar / (nama + ".gpx")).write_text(gpx(r, nama), encoding="utf-8")
    (keluar / (nama + ".txt")).write_text(teks, encoding="utf-8")
    (keluar / (nama + ".json")).write_text(json.dumps(hapus_dalam(r), ensure_ascii=False, indent=1), encoding="utf-8")
    print(teks)
    for ext in ("pdf", "kml", "gpx", "txt", "json"):
        print(keluar / (nama + "." + ext))


# ---------------------------------------------------------------- uji
def _bentuk_olc(lat, lon, n=11):
    """Encoder uji untuk roundtrip decoder (hanya di uji)."""
    s = _olc_awal(lat, lon, 5)
    if n == 11:
        la, lo = (lat + 90) % 0.000125, (lon + 180) % 0.000125
        s += ALF[int(la // (0.000125 / 5)) * 4 + int(lo // (0.000125 / 4))]
    return s[:8] + "+" + s[8:]


def _tolak(f, *a, **k):
    try:
        f(*a, **k)
    except Galat as e:
        return str(e)
    raise AssertionError("seharusnya ditolak: %r" % (a,))


def _hampir(p, q, d=0.0006):
    return abs(p[0] - q[0]) < d and abs(p[1] - q[1]) < d


def uji():
    # MU-01: berkas nyata sah
    bd = json.loads((UMUM / "batas_terbang.json").read_text(encoding="utf-8"))
    tm = json.loads((UMUM / "misi_templat.json").read_text(encoding="utf-8"))
    assert periksa_batas(bd) == [] and periksa_templat(tm, bd) == []
    assert len(tm["misi"]) == 6 and any(b["keyakinan"] == "A" for b in bd["baris"]) and all(t["daya_tahan_mnt"] is None for t in bd["tipe"])
    # MU-01: mode gagal (suntik cacat ke salinan di memori, pemeriksa harus menolak)
    for kunci in ("sumber", "satuan", "nilai"):
        c = copy.deepcopy(bd)
        del c["baris"][0][kunci]
        assert periksa_batas(c), kunci
    c = copy.deepcopy(bd); c["baris"][0]["sumber"] = "  "; assert periksa_batas(c)
    c = copy.deepcopy(bd); c["baris"][0]["keyakinan"] = "C"; assert periksa_batas(c)
    c = copy.deepcopy(bd); c["baris"][0]["keyakinan"] = "S"; del c["baris"][0]["q"]; assert periksa_batas(c)
    c = copy.deepcopy(bd); c["tipe"][0]["keyakinan"] = "C"; assert periksa_batas(c)
    c = copy.deepcopy(bd); c["baris"].append(dict(c["baris"][0])); assert periksa_batas(c)
    c = copy.deepcopy(tm); del c["misi"]["cari"]; assert periksa_templat(c, bd)
    c = copy.deepcopy(tm); c["misi"]["pantau"]["daftar_periksa"] = []; assert periksa_templat(c, bd)
    c = copy.deepcopy(tm); c["misi"]["pantau"]["daftar_periksa"] = ["angka {tidak_ada}"]; assert periksa_templat(c, bd)
    c = copy.deepcopy(bd); c["baris"][0]["keyakinan"] = "C"
    _tolak(Batas, c)
    # MU-02: delapan bentuk sah
    ac = (2.7949, 97.8966)
    sah = [("2.7949, 97.8966", (2.7949, 97.8966)), ("-2.5; 110.25", (-2.5, 110.25)), ("2.7949,97.8966", (2.7949, 97.8966)),
           ("N 02° 47' 03\"  E 097° 53' 37\"", (2.7842, 97.8936)), ("2°47'03.0\"N 97°53'37.0\"E", (2.7842, 97.8936)),
           ("https://www.google.com/maps/place/X/@2.7000,97.8000,17z/data=!3m1!4b1!4d1!3d2.7843!4d97.8936", (2.7843, 97.8936)),
           ("https://www.google.com/maps/@3.5589,98.6719,15z", (3.5589, 98.6719)),
           ("QVMV+H84 Smpn 2 Sultan Daulat", (2.7839, 97.8933))]
    for teks, mau in sah:
        got = baca_titik(teks, acuan=ac)
        assert _hampir(got, mau, 0.001), (teks, got)
    # plus code penuh 10 dan 11 karakter (roundtrip encoder uji), dan tautan place tanpa koordinat lewat plus code pendek
    for n in (10, 11):
        kode = _bentuk_olc(2.7843, 97.8936, n)
        assert _hampir(baca_titik(kode), (2.7843, 97.8936), 0.0002), kode
    assert _hampir(olc_decode("8FVC9G8F6W"), (47.3656, 8.5249), 0.0003)
    g = baca_titik("https://www.google.com/maps/place/QVMV%2BH84+Smpn+2+Sultan+Daulat/data=!4m1", acuan=ac)
    assert _hampir(g, (2.7839, 97.8933), 0.001), g
    # tautan pendek dengan pembuka tiruan
    jejak = []
    peta_url = {"https://maps.app.goo.gl/abc": (302, "https://goo.gl/lompat"),
            "https://goo.gl/lompat": (302, "https://www.google.com/maps/place/Nama/@2.7000,97.8000,17z/data=!3d2.7843!4d97.8936"),
            "https://www.google.com/maps/place/Nama/@2.7000,97.8000,17z/data=!3d2.7843!4d97.8936": (200, None),
            "https://maps.app.goo.gl/jahat": (302, "https://evil.example.com/maps/@2.7,97.8,17z"),
            "https://maps.app.goo.gl/lembek": (302, "http://www.google.com/maps/@2.7,97.8,17z"),
            "https://maps.app.goo.gl/pc": (302, "https://www.google.com/maps/place/QVMV+H84+Smpn+2"),
            "https://www.google.com/maps/place/QVMV+H84+Smpn+2": (200, None),
            "https://maps.app.goo.gl/siklus": (302, "https://maps.app.goo.gl/siklus")}
    def pb(u):
        jejak.append(u)
        return peta_url[u]
    assert _hampir(baca_titik("lihat https://maps.app.goo.gl/abc ok", buka_tautan=True, pembuka=pb), (2.7843, 97.8936), 0.00001)
    assert _hampir(baca_titik("https://maps.app.goo.gl/pc", acuan=ac, buka_tautan=True, pembuka=pb), (2.7839, 97.8933), 0.001)
    # enam ditolak (tanpa jaringan) ditambah kasus pengalihan
    n_awal = len(jejak)
    m1 = _tolak(baca_titik, "https://maps.app.goo.gl/abc", None, False, pb)
    assert len(jejak) == n_awal and "maps.app.goo.gl/abc" not in m1  # tanpa buka_tautan: tidak ada permintaan, pesan tak memuat URL
    _tolak(baca_titik, "Lapangan SMP 2 Sultan Daulat")
    tolakan = [("10.0, 106.8", "luar"), ("2.7, 150.0", "luar"), ("nan, 97.0", "nan"), ("https://www.example.com/maps/@2.7,97.8,17z", "host"),
                    ("http://www.google.com/maps/@2.7,97.8,17z", "http"), ("QVMV+H84 Smpn", "tanpa acuan"), ("https://www.google.com/search?q=sultan+daulat", "tanpa koordinat")]
    sudah = 0
    for teks, ket in tolakan:
        try:
            baca_titik(teks)
        except Galat:
            sudah += 1
    assert sudah == len(tolakan), sudah
    _tolak(baca_titik, "QVMV+H84", (2.9, 97.9), False, None, 5)  # acuan lebih jauh dari batas km
    for u in ("https://maps.app.goo.gl/jahat", "https://maps.app.goo.gl/lembek"):
        _tolak(baca_titik, u, None, True, pb)
        assert "evil.example.com" not in jejak and "http://www.google.com/maps/@2.7,97.8,17z" not in jejak
    _tolak(baca_titik, "https://maps.app.goo.gl/siklus", None, True, pb)
    # MU-03: kasus emas 15 Nov 2026 tanpa jaringan dan tanpa cetak PDF
    base = {"kode": "WIMK", "nama": "Lanud Soewondo", "lat": 3.5589, "lon": 98.6719}
    T = muat_templat(bd)
    r = susun("banjir", "dropping", base, ["Lapangan Bola Jambi, Kec. Sultan Daulat|2.7949, 97.8966|darat=30", "Pandan, Tapanuli Tengah|1.6921, 98.8426|menyusul"],
              None, None, None, None, False, batas=Batas(), templat=T, kini=datetime(2026, 11, 15, 10, 40, tzinfo=timezone.utc))
    assert [x["haluan"] for x in r["leg"]] == [225, 139, 355], r["leg"]
    assert [round(x["km"]) for x in r["leg"]] == [121, 162, 208], r["leg"]
    assert round(r["total"]["km"]) == 491 and round(r["total"]["nm"]) == 265 and round(r["total"]["terbang_mnt"]) == 147 and r["total"]["di_titik_mnt"] == 30
    assert next(iter(r)) == "dibuat" and r["status"] == STATUS_ZONA and r["zona"] == [] and r["titik"][1]["menyusul"] and r["sementara"] == ["Q2"]
    assert any("belum dibangun" in x["alasan"] for x in r["tidak_diperiksa"]) and any(x["alasan"] == "NOTAM tidak diperiksa" for x in r["tidak_diperiksa"])
    # waktu di titik wajib untuk titik pasti; orbit bawaan pantau; cari hanya untuk bencana tertentu; titik tak sah ditolak
    _tolak(susun, "banjir", "dropping", base, ["A|2.7949, 97.8966"], None, None, None, None, False, batas=Batas(), templat=T)
    p = susun("banjir", "pantau", base, ["A|2.7949, 97.8966"], None, "AW139", None, None, False, batas=Batas(), templat=T)
    assert p["titik"][0]["peran"] == "orbit" and p["titik"][0]["di_titik_mnt"] == 2 and p["kecepatan_kmj"] == 306
    _tolak(susun, "karhutla", "cari", base, ["A|2.7949, 97.8966"], None, None, None, None, False, batas=Batas(), templat=T)
    _tolak(susun, "banjir", "pantau", base, ["A|nama tempat saja"], None, None, None, None, False, batas=Batas(), templat=T)
    _tolak(susun, "banjir", "pantau", base, ["A|2.7949, 97.8966"], None, "TIDAKADA", None, None, False, batas=Batas(), templat=T)
    mal = susun("banjir", "pantau", base, ["A|2.7949, 97.8966"], None, None, None, "2026-11-16T22:00+07:00", False, batas=Batas(), templat=T)
    assert mal["perhatian"] and "Q15" in mal["sementara"]
    # D7: kunjungan menolak --keluar di dalam repo; public/ ditolak untuk semua; di luar repo diterima
    _tolak(periksa_keluar, "kunjungan", AKAR / "data/laporan-bnpb/paparan/x")
    _tolak(periksa_keluar, "dropping", AKAR / "public/data")
    periksa_keluar("dropping", AKAR / "data/laporan-bnpb/paparan/x")
    periksa_keluar("kunjungan", Path("/tmp/misi-uji"))
    _tolak(periksa_keluar, "dropping", AKAR / "PUBLIC/x")  # APFS tak peka huruf
    _tolak(periksa_keluar, "kunjungan", AKAR / "DATA/x")
    # kecepatan 0 ditolak (bukan diam-diam 200)
    _tolak(susun, "banjir", "pantau", base, ["A|2.7949, 97.8966"], None, None, 0, None, False, batas=Batas(), templat=T)
    # leg berjarak nol: haluan None di JSON, strip di teks WA dan HTML
    nol = susun("banjir", "pantau", base, ["A|3.5589, 98.6719"], None, None, None, None, False, batas=Batas(), templat=T)
    assert nol["leg"][0]["haluan"] is None and nol["leg"][1]["haluan"] is None
    assert "haluan –," in teks_wa(nol, "2026-11-15") and "–°" not in teks_wa(nol, "2026-11-15")
    assert "<b>–</b>" in halaman(nol, lambda la_, lo_: (0, 0), 1100, 1060, 400.0, "", "2026-11-15", T, Batas())
    # plus code dengan acuan (juga lewat tautan ter-encode %2B) tercatat sementara Q17; tanpa acuan tidak
    sb = {"kode": "X", "nama": "X", "lat": 2.7949, "lon": 97.8966}
    for spek in ("A|QVMV+H84 Smpn|darat=5", "A|https://www.google.com/maps/place/QVMV%2BH84+Smpn+2|darat=5"):
        rr = susun("banjir", "dropping", sb, [spek], None, None, None, None, False, batas=Batas(), templat=T)
        assert "Q17" in rr["sementara"] and any(x["q"] == "Q17" for x in rr["sementara_dipakai"]), spek
    assert "Q17" not in susun("banjir", "dropping", sb, ["A|2.79, 97.89|darat=5"], None, None, None, None, False, batas=Batas(), templat=T)["sementara"]
    # port tautan: hanya kosong atau 443
    for u in ("https://maps.app.goo.gl:8443/x", "https://maps.app.goo.gl:evil/x", "https://maps.app.goo.gl:99999/x"):
        _tolak(baca_titik, u, None, True, pb)
    # folder kerja symlink ke public/ atau ke dalam repo (kunjungan) ditolak
    import os, tempfile
    tmp = Path(tempfile.mkdtemp(prefix="misi-uji-"))
    os.symlink(str(AKAR / "public"), str(tmp / "kerja"))
    _tolak(periksa_kerja, "dropping", tmp / "kerja")
    os.symlink(str(AKAR / "data"), str(tmp / "kerja2"))
    _tolak(periksa_kerja, "kunjungan", tmp / "kerja2")
    (tmp / "biasa").mkdir()
    periksa_kerja("kunjungan", tmp / "biasa")
    # kunjungan tidak memanggil pengunduh ubin tanpa --citra
    assert not pakai_citra("kunjungan", False, False) and pakai_citra("kunjungan", True, False) and pakai_citra("dropping", False, False) and not pakai_citra("dropping", False, True)
    panggil = []
    def palsu(*a_):
        panggil.append(a_)
        return lambda la_, lo_: (0, 0)
    Pk, ada = peta(RP(), 2.0, 98.0, 8, 1100, 1060, tmp / "ubin", tmp / "r.jpg", pakai_citra("kunjungan", False, False), bingkai=palsu)
    assert panggil == [] and ada is False and Pk(2.0, 98.0)[0] == 550
    Pk, ada = peta(RP(), 2.0, 98.0, 8, 1100, 1060, tmp / "ubin", tmp / "r.jpg", pakai_citra("kunjungan", True, False), bingkai=palsu)
    assert len(panggil) == 1 and ada is True
    # label wajib di batas_terbang.json
    c = copy.deepcopy(bd); del c["baris"][0]["label"]; assert periksa_batas(c)
    # keluaran: JSON tanpa bidang nama orang, tanpa kata "aman" di teks, KML/GPX terurai
    def kunci(o):
        if isinstance(o, dict):
            for k_, v in o.items():
                yield k_
                for x in kunci(v):
                    yield x
        elif isinstance(o, list):
            for v in o:
                for x in kunci(v):
                    yield x
    js = json.dumps(hapus_dalam(r), ensure_ascii=False)
    assert not (set(kunci(hapus_dalam(r))) & KATA_ORANG) and not any(k_.startswith("_") for k_ in kunci(hapus_dalam(r)))
    wa = teks_wa(r, "2026-11-15")
    from xml.etree import ElementTree as ET
    kk, gg = ET.fromstring(kml(r, "n]]>&")), ET.fromstring(gpx(r, "n]]>&"))
    assert len(kk.findall(".//{*}Placemark")) == 4 and len(gg.findall(".//{*}rtept")) == 4
    rp = RP()
    P = lambda la_, lo_: ((lo_ - 97) * 300, (4 - la_) * 300)
    hp = halaman(r, P, 1100, 1060, 400.0, "rute.jpg", "2026-11-15", T, Batas())
    for nama_, teks in (("json", js), ("wa", wa), ("kml", kml(r, "x")), ("gpx", gpx(r, "x")), ("html", hp), ("templat", json.dumps(tm, ensure_ascii=False)),
                        ("batas", json.dumps(bd, ensure_ascii=False))):
        assert not re.search(r"\baman\b", teks, re.I), nama_
        assert "·" not in teks, nama_
    assert "zona belum diperiksa" in wa and "NOTAM tidak diperiksa" in wa and "lingkaran bebas halangan" in hp.lower() and "bukan perintah terbang" in hp
    assert "zona belum diperiksa" in hp and "tidak memotong zona" not in js + wa + hp
    # satu nilai mentah untuk semua keluaran: leg 3 = 62,53 mnt dicetak 63 di WA dan HTML
    assert "63 mnt" in [l for l in wa.splitlines() if l.startswith("Leg 3")][0], wa
    for x in r["_leg"]:
        assert ("%s mnt" % ang(x["mnt"])) in wa and ("%s mnt" % ang(x["mnt"])) in hp
    assert "kecepatan jelajah bawaan 200 km/jam (Q2)" in wa and "kecepatan_bawaan_kmj" not in wa + hp
    print("lulus")


def utama(argv=None):
    ap = argparse.ArgumentParser(description="Misi Udara: flight plan rute tetap (usulan, bukan perintah terbang)")
    sp = ap.add_subparsers(dest="perintah", required=True)
    sp.add_parser("uji")
    b = sp.add_parser("buat")
    b.add_argument("--bencana", required=True)
    b.add_argument("--misi", required=True)
    b.add_argument("--base", required=True)
    b.add_argument("--titik", action="append", default=[])
    b.add_argument("--akhir")
    b.add_argument("--tipe")
    b.add_argument("--kecepatan", type=float)
    b.add_argument("--berangkat")
    b.add_argument("--keluar")
    b.add_argument("--buka-tautan", action="store_true", dest="buka_tautan")
    g = b.add_mutually_exclusive_group()
    g.add_argument("--tanpa-citra", action="store_true", dest="tanpa_citra", help="peta di latar polos, tanpa unduh ubin Esri (bawaan untuk misi kunjungan)")
    g.add_argument("--citra", action="store_true", help="paksa memakai citra satelit (juga untuk misi kunjungan)")
    a = ap.parse_args(argv)
    try:
        if a.perintah == "uji":
            uji()
        else:
            buat(a)
    except Galat as e:
        print("galat: %s" % e, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(utama())
