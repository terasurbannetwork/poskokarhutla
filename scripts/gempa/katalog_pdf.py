#!/usr/bin/env python3
"""Katalog PDF resmi BMKG -> data terstruktur (Python 3.12 stdlib + pdftotext).

  Katalog Gempabumi Signifikan & Merusak 1821-2025 -> public/gempa/data/katalog_merusak.json
  Katalog Tsunami Indonesia 416-2025 per wilayah    -> public/gempa/data/katalog_tsunami.json

Perintah:
  uji                     self-check dari potongan halaman nyata (tanpa jaringan)
  bangun [--pdf-dir D]    unduh PDF ke folder sementara (BUKAN repo), urai, tulis dua JSON
  banding                 silang tanggal+magnitudo dengan cdn.bmkg.go.id/katalog_gempa.json

Prinsip: yang tertulis disimpan apa adanya, yang tak terbaca = null. PDF tidak di-commit.
Teks halaman diambil sebagai kotak kata (pdftotext -bbox) lalu kolom ditentukan dari
posisi kepala tabel di TIAP halaman (lebar kolom tabel berbeda per halaman).
"""
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from datetime import date, datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "public", "gempa", "data"))
PDFTOTEXT = "/opt/homebrew/bin/pdftotext" if os.path.exists("/opt/homebrew/bin/pdftotext") else "pdftotext"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
SUMBER = {
    "merusak": "https://content.bmkg.go.id/wp-content/uploads/Katalog-Gempabumi-Signifikan-Merusak-1821-2025_BMKG.pdf",
    "tsunami": "https://content.bmkg.go.id/wp-content/uploads/Katalog-Tsunami-Indonesia-Perwilayah-416-2025.pdf",
}
CDN = "https://cdn.bmkg.go.id/katalog_gempa.json"

BULAN = {}
for _i, _n in enumerate([
    ("januari", "jan"), ("februari", "feb", "pebruari"), ("maret", "mar"), ("april", "apr"),
    ("mei",), ("juni", "jun"), ("juli", "jul"), ("agustus", "agu", "agt", "ags", "aug"),
    ("september", "sep", "sept"), ("oktober", "okt", "oct"), ("november", "nov", "nop"),
    ("desember", "des", "dec")], 1):
    for _k in _n:
        BULAN[_k] = _i


# ---------------------------------------------------------------- dasar: kata, garis
def baca_bbox(path):
    """-> list halaman; halaman = list kata (x0, y0, x1, y1, teks)."""
    halaman, cur = [], None
    rx = re.compile(r'\s*<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*)</word>')
    with open(path, encoding="utf8") as f:
        for l in f:
            if "<page " in l:
                cur = []
                halaman.append(cur)
                continue
            m = rx.match(l)
            if m and cur is not None:
                cur.append((float(m[1]), float(m[2]), float(m[3]), float(m[4]), html.unescape(m[5])))
    return halaman


def garis(kata, tol=3.2):
    """Kelompokkan kata ke baris menurut pusat y -> [(y, [kata urut x])]."""
    out = []
    for w in sorted(kata, key=lambda w: (w[1] + w[3]) / 2):
        yc = (w[1] + w[3]) / 2
        if out and abs(yc - out[-1][0]) < tol:
            out[-1][1].append(w)
        else:
            out.append([yc, [w]])
    return [(y, sorted(l)) for y, l in out]


def angka(s):
    """'7,3' / '7.3' / '-5.0' -> float; '-', '*', '' -> None. Hanya angka bersih."""
    if s is None:
        return None
    s = s.strip().replace(",", ".")
    return float(s) if re.fullmatch(r"-?\d+(\.\d+)?", s) else None


def teks(ws):
    return " ".join(w[4] for w in ws).strip()


def rapi(s):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s or None


def tanggal_iso(hari, bulan, tahun):
    if not tahun:
        return None
    s = "%04d" % tahun
    if bulan:
        s += "-%02d" % bulan
        if hari:
            s += "-%02d" % hari
    return s


# ---------------------------------------------------------------- merusak
def kepala_merusak(garis_h):
    """Cari kepala tabel merusak di satu halaman -> dict kolom x, atau None."""
    for i, (y, ws) in enumerate(garis_h):
        if ws[0][4] in ("NO", "No", "No.") and any(w[4] in ("TANGGAL", "Tanggal/Wilayah") for w in ws):
            blok = [w for yy, l in garis_h if y - 14 <= yy <= y + 26 for w in l]
            def cari(*nama, setelah=-1):
                for w in sorted(blok):
                    if w[4].lower() in nama and w[0] > setelah:
                        return w
                return None
            tgl = cari("tanggal", "tanggal/wilayah")
            ot = cari("waktu", "origin")
            lat = cari("lintang", "lat")
            lon = cari("bujur", "long", "lon")
            dep = cari("kedalaman", "kedalama", "depth", "(km)")
            mag = cari("mag")
            if not (tgl and ot and mag and (lat or lon or dep)):
                return None
            ras = cari("dirasakan", "wilayah", setelah=mag[0])
            kor = cari("dampak", "korban", "korban/kerusakan", setelah=mag[0])
            if not (ras and kor):
                return None
            sumb = cari("sumber", setelah=kor[0])
            c = lambda w: (w[0] + w[2]) / 2
            # kepala yang terpotong (mis. "Lat" hilang): taksir pusat dari tetangganya
            ct = [c(ot), c(lat) if lat else None, c(lon) if lon else None, c(dep) if dep else None, c(mag)]
            for j in (1, 2, 3):
                if ct[j] is None:
                    kiri_c = next(ct[k] for k in range(j - 1, -1, -1) if ct[k] is not None)
                    kanan_c = next(ct[k] for k in range(j + 1, 5) if ct[k] is not None)
                    ct[j] = (kiri_c + kanan_c) / 2
            fa = ras[4].lower() == "dirasakan"
            # kepala tabel rata tengah, isi rata kiri: tepi kiri isi = kanan kolom Mag,
            # tepi kanan = cermin tepi kiri terhadap pusat kepala "Dirasakan"
            kiri = mag[2] + (10 if fa else 5)
            if fa:
                pusat_ras = c(ras)
            else:
                ujung = [w for w in blok if w[4] == "merasakan" and w[0] > ras[0]]
                pusat_ras = (ras[0] + (ujung[0][2] if ujung else ras[2])) / 2
            return {
                "y": y, "tgl": tgl[0], "pusat": ct,
                "ras": kiri, "split": 2 * pusat_ras - kiri, "sumber": (sumb[0] - 6) if sumb else None,
                "format": "A" if fa else "B",
            }
    return None


MARKA_FOTO = re.compile(r"(DAMPAK KERUSAKAN|Keterangan foto|Foto\b|Sumber ?:|Dok\.)")


def pecah_kolom(gs, kep, tinggi_kaki=530):
    """Batas kolom Dirasakan | Dampak = celah x terlebar yang kosong di semua baris tabel halaman
    (baris keterangan foto di bawah tabel tidak dihitung)."""
    kanan = (kep["sumber"] - 2) if kep["sumber"] else 1e9
    iv = []
    for y, ws in gs:
        if y <= kep["y"] + 25 and not anchor_merusak(ws, kep):
            continue
        if y > tinggi_kaki or (all(w[0] < kep["ras"] for w in ws) and MARKA_FOTO.match(teks(ws))):
            break
        iv += [(w[0], w[2]) for w in ws if kep["ras"] <= w[0] < kanan]
    best, lebar, akhir = None, 8.0, kep["ras"]
    for a, b in sorted(iv):
        if a - akhir > lebar and akhir > kep["ras"] + 20:
            best, lebar = (akhir + a) / 2, a - akhir
        akhir = max(akhir, b)
    return best


def hapus_unit(tok):
    return [t for t in tok if t[4].upper() not in ("LS", "LU", "BT", "BB", "KM")]


RX_TAHUN = re.compile(r"1[89]\d\d|20\d\d")
RX_DMY = re.compile(r"(\d{1,2})-([A-Za-z]{3,})-(\d{2})")


def parse_kiri(kiri, kep, bawah=()):
    """Kata di zona kiri (nomor, tanggal, jam, lintang, bujur, kedalaman, mag) -> dict kolom."""
    f = {"no": None, "hari": None, "bulan": None, "tahun": None, "jam": None, "tgl_awal": False,
         "lat": None, "bujur": None, "kedalaman_km": None, "mag": None, "mag_teks": None}
    toks = list(kiri)
    if toks and re.fullmatch(r"\d{1,3}\.?", toks[0][4]) and toks[0][0] < kep["tgl"] - 8:
        f["no"] = int(toks[0][4].rstrip("."))
        toks = toks[1:]
    nama = ["ot", "lat", "lon", "dep", "mag"]
    sel = {n: None for n in nama}
    neg = any(t[4].upper() == "LS" for t in toks + list(bawah))
    i = 0
    while i < len(toks):
        t = toks[i]
        s = t[4]
        mf = re.fullmatch(r"([A-Za-z]+)(1[89]\d\d|20\d\d)", s)  # "November2013" menempel
        if mf and mf[1].lower() in BULAN:
            f["bulan"], f["tahun"] = BULAN[mf[1].lower()], int(mf[2])
            i += 1
            continue
        m = RX_DMY.fullmatch(s)
        if m and m[2].lower() in BULAN:
            f["hari"], f["bulan"] = int(m[1]), BULAN[m[2].lower()]
            yy = int(m[3])
            f["tahun"] = (2000 if yy < 30 else 1900) + yy
            f["tgl_awal"] = f["tgl_awal"] or i == 0
        elif re.fullmatch(r"\d{1,2}", s) and i + 1 < len(toks) \
                and (toks[i + 1][4].lower().rstrip(".") in BULAN or re.fullmatch(r"(?i)[a-z]+(1[89]\d\d|20\d\d)", toks[i + 1][4])) \
                and (t[0] + t[2]) / 2 < kep["pusat"][0] - 15:
            f["hari"] = int(s)
            f["tgl_awal"] = f["tgl_awal"] or i == 0
        elif s.lower().rstrip(".") in BULAN and (t[0] + t[2]) / 2 < kep["pusat"][0] - 15:
            f["bulan"] = BULAN[s.lower().rstrip(".")]
            f["tgl_awal"] = f["tgl_awal"] or (i == 0 and False)
        elif RX_TAHUN.fullmatch(s) and (t[0] + t[2]) / 2 < kep["pusat"][0] - 15:
            f["tahun"] = int(s)
        elif s.upper() in ("LS", "LU", "BT", "BB", "KM"):
            pass
        else:
            xc = (t[0] + t[2]) / 2
            j = min(range(5), key=lambda k: abs(kep["pusat"][k] - xc))
            sel[nama[j]] = s if sel[nama[j]] is None else sel[nama[j]] + " " + s
        i += 1
    lat = angka(sel["lat"])
    if lat is not None and neg and lat > 0:
        lat = -lat
    f["lat"], f["bujur"], f["kedalaman_km"] = lat, angka(sel["lon"]), angka(sel["dep"])
    f["mag"], f["mag_teks"] = angka(sel["mag"]), sel["mag"]
    if sel["ot"] and re.fullmatch(r"\d{1,2}:\d\d(:\d\d)?", sel["ot"]):
        f["jam"] = sel["ot"]
    return f


def anchor_merusak(ws, kep, bawah=()):
    """-> ('nomor', f) baris berawalan nomor; ('tanggal', f) baris tanggal-dulu (tanggal di baris
    atas nomor, sel tabel rata tengah); atau None."""
    kiri = [w for w in ws if w[0] < kep["ras"]]
    if not kiri:
        return None
    f = parse_kiri(kiri, kep, bawah)
    if f["no"] is not None:
        return "nomor", f
    if f["bulan"] and kiri[0][0] >= kep["tgl"] - 3 and f["tgl_awal"]:
        return "tanggal", f
    return None


def urai_merusak(halaman):
    baris, cur, kep, bagian, berhenti = [], None, None, None, False
    gagal = []
    for nh, kata in enumerate(halaman, 1):
        gs = garis(kata)
        k = kepala_merusak(gs)
        if k is None:
            # halaman lanjutan tanpa kepala tabel: pakai kolom halaman sebelumnya bila ada baris jangkar
            if kep is None or not any(anchor_merusak(ws, kep) and anchor_merusak(ws, kep)[0] == "nomor" for _, ws in gs):
                continue  # foto, peta, pengantar
            k = dict(kep)
            k["y"] = 0
        kep, berhenti = k, False
        celah = pecah_kolom(gs, kep)
        if celah:
            kep["split"] = celah
        for gi, (y, ws) in enumerate(gs):
            if y <= kep["y"] + 24 and y >= kep["y"] - 14 and not anchor_merusak(ws, kep):
                continue  # baris kepala tabel
            tk = teks(ws)
            if "K a t a l o g" in tk or re.search(r"\| Katalog|Katalog Gempabumi Merusak", tk):
                continue
            m = re.fullmatch(r"TAHUN (\d{4})", tk)
            if m:
                bagian, cur = int(m[1]), None
                continue
            if tk.startswith("GEMPABUMI SIGNIFIKAN"):
                cur = None
                continue
            bawah = [w for _, w2 in gs[gi + 1:gi + 3] for w in w2 if abs((w[0] + w[2]) / 2 - kep["pusat"][1]) < 35]
            ak = anchor_merusak(ws, kep, bawah)
            if ak:
                jenis_a, a = ak
                if jenis_a == "tanggal" and cur is not None and cur["no_tabel"] is None:
                    # tanggal bertingkat/rentang ("02 November s.d. / 05 Desember 2015"): hanya lengkapi yang kosong
                    cur["_d"] = [x if x is not None else y for x, y in zip(cur["_d"], (a["hari"], a["bulan"], a["tahun"]))]
                    ws_isi, lok_pakai, berhenti = ws, False, False
                    jenis_a = None
                lanjut = jenis_a == "nomor" and cur is not None and cur["no_tabel"] is None and a["bulan"] is None
                if a["tahun"] is None and a["bulan"] is None or (a["tahun"] is None and jenis_a == "nomor"):
                    for _, w2 in gs[gi + 1:gi + 4]:  # tahun di baris bawah, kolom tanggal
                        c = [t for t in w2 if RX_TAHUN.fullmatch(t[4]) and t[0] < kep["pusat"][0] - 10]
                        if c:
                            a["tahun"] = int(c[0][4])
                            break
                if lanjut:  # nomor menyusul baris tanggal-dulu: lengkapi baris yang sudah dibuka
                    cur["no_tabel"] = a["no"]
                    for kk, kj in (("lat", "lintang"), ("bujur", "bujur"), ("kedalaman_km", "kedalaman_km"),
                                   ("mag", "magnitudo"), ("mag_teks", "magnitudo_teks"), ("jam", "jam")):
                        if cur[kj] is None and a[kk] is not None:
                            cur[kj] = a[kk]
                    t = cur.pop("_d")
                    t = [t[0] if t[0] is not None else a["hari"], t[1] if t[1] is not None else a["bulan"],
                         t[2] if t[2] is not None else a["tahun"]]
                    cur["tanggal"] = tanggal_iso(*t)
                    ws_isi, lok_pakai = ws, False
                elif jenis_a is not None:
                    cur = {
                        "tanggal": tanggal_iso(a["hari"], a["bulan"], a["tahun"]), "jam": a["jam"],
                        "lintang": a["lat"], "bujur": a["bujur"], "kedalaman_km": a["kedalaman_km"],
                        "magnitudo": a["mag"], "magnitudo_teks": a["mag_teks"],
                        "_lok": [], "_ras": [], "_dam": [], "_sum": [],
                        "halaman": nh, "no_tabel": a["no"], "bagian_tahun": bagian, "tsunami": None,
                    }
                    if jenis_a == "tanggal":
                        cur["_d"] = [a["hari"], a["bulan"], a["tahun"]]
                    elif a["tahun"] is None:
                        gagal.append({"halaman": nh, "alasan": "tahun tak terbaca", "teks": tk[:120]})
                    baris.append(cur)
                    ws_isi, lok_pakai = ws, False
                berhenti = False
            else:
                if cur is None or berhenti:
                    continue
                ws_isi = ws
                lok_pakai = True
                kiri = [w for w in ws if w[0] < kep["ras"]]
                if kiri and len(kiri) == len(ws) and re.match(r"(DAMPAK KERUSAKAN|Keterangan foto|Foto\b|Sumber ?:)", teks(ws)):
                    berhenti = True
                    continue
            if cur is None:
                continue
            for w in ws_isi:
                if w[0] < kep["ras"]:
                    if lok_pakai and w[0] < kep["pusat"][1] - 15 and not re.fullmatch(r"(?i)km|WIB|WITA|WIT", w[4]):
                        cur["_lok"].append(w)
                elif kep["sumber"] and w[0] >= kep["sumber"]:
                    cur["_sum"].append(w)
                elif w[0] < kep["split"]:
                    cur["_ras"].append(w)
                else:
                    cur["_dam"].append(w)
    for b in baris:
        if "_d" in b:
            b["tanggal"] = tanggal_iso(*b.pop("_d"))
            gagal.append({"halaman": b["halaman"], "alasan": "nomor baris tak ditemukan", "teks": b["tanggal"]})
        lok = [w for w in b.pop("_lok")]
        lt = teks(lok)
        if re.search(r"\bTidak\s+Tsunami\b", lt, re.I):
            b["tsunami"] = False
        elif re.search(r"\bTsunami\b", lt, re.I):
            b["tsunami"] = True
        lt = re.sub(r"\bTidak\s+Tsunami\b|\bTsunami\b", " ", lt, flags=re.I)
        lt = re.sub(r"\b(WIB|WITA|WIT)\b|(?<![\w.])(1[89]\d\d|20\d\d)(?![\w.])", " ", lt)
        b["lokasi"] = rapi(lt)
        b["dirasakan"] = rapi(teks(b.pop("_ras")))
        b["korban_kerusakan"] = rapi(teks(b.pop("_dam")))
        b["sumber_data"] = rapi(teks(b.pop("_sum")))
    return baris, gagal


# ---------------------------------------------------------------- tsunami
def kepala_tsunami(gs):
    """Posisi kolom dari kepala tabel halaman tsunami; None bila bukan halaman tabel."""
    kata = [w for _, l in gs for w in l]
    if not any(w[4] == "KEJADIAN" for w in kata):
        return None
    def f(t, ke=None):
        c = [w for w in kata if w[4] == t and w[1] < 160]
        return c[0] if c else None
    need = {n: f(n) for n in ("Tanggal", "Pukul", "MAG.", "SUMBER", "Lintang", "Bujur", "Hmaks.", "KORBAN", "MENINGGAL", "REFERENSI")}
    if not all(need.values()):
        return None
    n = need
    utc = f("(UTC)")
    return {
        "top": (utc[3] if utc else n["Tanggal"][3]) + 1,
        "tgl": n["Tanggal"][0] - 8, "pukul": n["Pukul"][0] - 12, "mag": n["MAG."][0] - 12,
        "vt": f("V")[0] - 12 if f("V") else n["MAG."][0] + 40,
        "lok": n["SUMBER"][0] - 14, "lat": n["Lintang"][0] - 8, "lon": n["Bujur"][0] - 8,
        "hm": n["Hmaks."][0] - 8, "kor": n["KORBAN"][0] - 8, "cat": n["MENINGGAL"][2] + 3,
        "ref": n["REFERENSI"][0] - 14,
    }


def kolom_ts(x, k):
    for nm in ("ref", "cat", "kor", "hm", "lon", "lat", "lok", "vt", "mag", "pukul", "tgl"):
        if x >= k[nm]:
            return nm
    return "no"


def urai_tsunami(halaman):
    baris, gagal, wilayah, sisa_lewat = [], [], None, 0.0
    cur_prev = None
    for nh, kata in enumerate(halaman, 1):
        gs = garis(kata)
        k = kepala_tsunami(gs)
        if k is None:
            continue
        for y, ws in gs:
            if ws[0][4] == "WILAYAH" and y < k["top"] and ws[0][0] < 100:
                wilayah = teks(ws).replace("WILAYAH", "").strip().title()
        tabel = [w for w in kata if w[1] >= k["top"] - 0.5 and w[4] != "" and w[1] < 545]
        # buang kaki halaman
        gt = garis(tabel)
        gt = [(y, ws) for y, ws in gt if "Katalog" not in teks(ws) or "Tsunami" not in teks(ws)]
        # Catatan Pengamatan (paragraf lebar di bawah baris) -> milik baris sebelumnya
        notes, rows_ws, mode = [], [], False
        for y, ws in gt:
            kiri = ws[0][0] < 93 and not re.fullmatch(r"\d+\.", ws[0][4])
            if (ws[0][4] == "Catatan" and len(ws) > 1 and ws[1][4].startswith("Pengamatan")) or (mode and kiri):
                mode = True
                notes.append((y, ws))
            else:
                mode = False
                rows_ws.append((y, ws))
        anc = [(y, w) for y, ws in rows_ws for w in ws if w[0] < k["tgl"] and re.fullmatch(r"\d+\.", w[4])]
        ys = sorted({round(y, 1) for y, _ in rows_ws})
        # batas dasar halaman: kaki
        dasar = max([w[3] for w in kata if "Katalog" in w[4]] or [560]) - 12
        gap = lambda y1, y2: (y1 + y2) / 2
        tepi = []  # titik-titik gap antar baris-teks
        for a, b in zip(ys, ys[1:]):
            tepi.append((a + b) / 2)

        def snap(v):
            c = [t for t in tepi if abs(t - v) <= 7]
            return min(c, key=lambda t: abs(t - v)) if c else v

        if not anc:
            continue
        b_awal = k["top"] + max(0.0, sisa_lewat)
        b_awal = snap(b_awal) if sisa_lewat > 0 else k["top"]
        # lanjutan baris sebelumnya: kata di atas b_awal
        batas = [b_awal]
        for i, (ya, _) in enumerate(anc):
            b = 2 * ya - batas[-1]
            if i + 1 < len(anc):
                if not (ya < b < anc[i + 1][0]):
                    b = (ya + anc[i + 1][0]) / 2
                else:
                    b = snap(b)
            else:
                if b > dasar:
                    sisa_lewat = b - dasar
                    b = 1e9
                else:
                    sisa_lewat = 0.0
                    b = snap(b)
            batas.append(b)
        # lanjutan di puncak halaman -> baris terakhir halaman sebelumnya
        if cur_prev is not None and b_awal > k["top"]:
            cur_prev["_w"].extend(w for y, ws in rows_ws for w in ws if y < b_awal)
        elif cur_prev is not None:
            pass
        halaman_baris = []
        for i, (ya, wa) in enumerate(anc):
            lo, hi = batas[i], batas[i + 1]
            wsr = [w for y, ws in rows_ws for w in ws if lo < (w[1] + w[3]) / 2 <= hi] if i else \
                  [w for y, ws in rows_ws for w in ws if lo <= (w[1] + w[3]) / 2 <= hi]
            r = {"no_tabel": int(wa[4][:-1]), "halaman": nh, "wilayah_katalog": wilayah, "_w": wsr, "_y": ya, "_catn": []}
            baris.append(r)
            halaman_baris.append(r)
        for y, ws in notes:  # milik jangkar terdekat di atasnya
            atas = [r for r in halaman_baris if r["_y"] <= y]
            tgt = atas[-1] if atas else (cur_prev if cur_prev else None)
            if tgt is not None:
                tgt["_catn"].append(teks(ws))
        cur_prev = halaman_baris[-1]
    for r in baris:
        w = r.pop("_w")
        r.pop("_y")
        kol = {}
        for t in sorted(w, key=lambda t: ((t[1] + t[3]) / 2, t[0])):
            pass
        # kolom per halaman: ambil ulang kepala halaman baris ini
        kh = kepala_tsunami(garis(halaman[r["halaman"] - 1]))
        for t in sorted(w, key=lambda t: (round((t[1] + t[3]) / 2 / 3), t[0])):
            kol.setdefault(kolom_ts(t[0], kh), []).append(t)
        tg = teks(kol.get("tgl", []))
        m = re.match(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{3,4})", tg) or re.match(r"()([A-Za-z]+)\s+(\d{3,4})", tg) or re.match(r"()()(\d{3,4})$", tg)
        # tanggal tersusun bertingkat: hari / bulan / tahun (urut y)
        hari, bulan, tahun = None, None, None
        for t in sorted(kol.get("tgl", []), key=lambda t: ((t[1] + t[3]) / 2, t[0])):
            s = t[4]
            if re.fullmatch(r"\d{1,2}", s) and hari is None and bulan is None:
                hari = int(s)
            elif s.lower().rstrip(".") in BULAN and bulan is None:
                bulan = BULAN[s.lower().rstrip(".")]
            elif re.fullmatch(r"\d{3,4}", s) and tahun is None:
                tahun = int(s)
        del m
        r["tanggal"] = tanggal_iso(hari, bulan, tahun)
        r["tanggal_teks"] = rapi(tg)
        r["pukul_utc"] = rapi(teks(kol.get("pukul", [])))
        mg = rapi(teks(kol.get("mag", [])))
        r["magnitudo_gempa"] = angka(mg)
        r["magnitudo_gempa_teks"] = mg
        r["jenis"] = rapi(teks(kol.get("vt", [])))  # V = vulkanik, T = tektonik, * = lain, sesuai kepala "V/T"
        r["sumber_tsunami"] = rapi(teks(kol.get("lok", [])))
        r["lintang"] = angka(teks(kol.get("lat", [])))
        r["bujur"] = angka(teks(kol.get("lon", [])))
        hm = rapi(teks(kol.get("hm", [])))
        r["tinggi_maks_m"] = angka(hm)
        r["tinggi_maks_teks"] = hm
        kb = rapi(teks(kol.get("kor", [])))
        r["korban_meninggal_teks"] = kb
        r["korban_meninggal"] = int(kb.replace(".", "")) if kb and re.fullmatch(r"\d{1,3}(\.\d{3})*|\d+", kb) else None
        r["catatan"] = rapi(teks(kol.get("cat", [])))
        extra = rapi(" ".join(r.pop("_catn")))
        r["catatan_pengamatan"] = extra
        r["referensi"] = rapi(teks(kol.get("ref", [])))
        if r["tanggal"] is None:
            gagal.append({"halaman": r["halaman"], "no_tabel": r["no_tabel"], "alasan": "tanggal tak terbaca", "teks": tg})
        r["tsunami"] = True
    return baris, gagal


# ---------------------------------------------------------------- jalankan
def unduh(url, ke):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=300) as r, open(ke, "wb") as f:
        f.write(r.read())


def bbox(pdf, ke):
    subprocess.run([PDFTOTEXT, "-bbox", pdf, ke], check=True)
    return baca_bbox(ke)


def kolom_kosong(baris, skip=()):
    if not baris:
        return {}
    ks = [k for k in baris[0] if k not in skip]
    return {k: round(100 * sum(1 for b in baris if b.get(k) in (None, "")) / len(baris), 1) for k in ks}


def bungkus(jenis, baris, gagal, pdf_url):
    for i, b in enumerate(baris, 1):
        b["id"] = ("KM" if jenis == "merusak" else "KT") + "%04d" % i
    return {
        "judul": {"merusak": "Katalog Gempabumi Signifikan & Merusak Indonesia 1821-2025 (BMKG)",
                  "tsunami": "Katalog Tsunami Indonesia per Wilayah 416-2025 (BMKG)"}[jenis],
        "sumber": pdf_url,
        "diambil": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "jumlah_baris": len(baris),
        "gagal_urai": gagal,
        "catatan": "Disalin apa adanya dari tabel PDF; nilai yang tak terbaca = null. Kolom *_teks menyimpan tulisan asli.",
        "baris": baris,
    }


def bangun(pdf_dir=None):
    tmp = pdf_dir or tempfile.mkdtemp(prefix="katalog_pdf_")
    os.makedirs(DATA, exist_ok=True)
    ringkas = {}
    for jenis in ("merusak", "tsunami"):
        pdf = os.path.join(tmp, jenis + ".pdf")
        if not os.path.exists(pdf):
            unduh(SUMBER[jenis], pdf)
        h = bbox(pdf, os.path.join(tmp, jenis + ".bbox.html"))
        baris, gagal = (urai_merusak if jenis == "merusak" else urai_tsunami)(h)
        d = bungkus(jenis, baris, gagal, SUMBER[jenis])
        with open(os.path.join(DATA, "katalog_%s.json" % jenis), "w", encoding="utf8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
            f.write("\n")
        ringkas[jenis] = (len(baris), len(gagal), kolom_kosong(baris, skip=("id",)))
        print(jenis, "baris", len(baris), "gagal", len(gagal))
        print("  kosong%:", ringkas[jenis][2])
    return ringkas


def banding():
    with urllib.request.urlopen(urllib.request.Request(CDN, headers={"User-Agent": UA}), timeout=120) as r:
        cdn = json.load(r)["features"]
    ref = []
    for f in cdn:
        p = f["properties"]
        try:
            d = datetime.strptime(p["date"], "%d-%m-%Y").strftime("%Y-%m-%d")
        except Exception:
            continue
        ref.append((d, angka(p.get("mag"))))
    km = json.load(open(os.path.join(DATA, "katalog_merusak.json"), encoding="utf8"))["baris"]
    kunci = {}
    for b in km:
        kunci.setdefault(b["tanggal"], []).append(b["magnitudo"])
    ada_tgl = ada_mag = 0
    tak = []
    for d, m in ref:
        c = kunci.get(d)
        if c:
            ada_tgl += 1
            if m is not None and any(x is not None and abs(x - m) <= 0.15 for x in c):
                ada_mag += 1
            else:
                tak.append((d, m, c))
    n = len(ref)
    print("cdn merusak:", n, "| tanggal ada di katalog PDF: %d (%.1f%%) | tanggal+magnitudo cocok (+-0,15): %d (%.1f%%)" % (
        ada_tgl, 100 * ada_tgl / n, ada_mag, 100 * ada_mag / n))
    return n, ada_tgl, ada_mag, tak


# ---------------------------------------------------------------- uji
def _halaman(spec):
    """spec: list (x0, y, teks) -> halaman kata dengan lebar kata dari panjang teks."""
    return [(x, y - 4, x + 5 * len(t), y + 4, t) for x, y, t in spec]


def uji():
    from katalog_pdf_uji import SNIP_MERUSAK_A, SNIP_MERUSAK_B, SNIP_TSUNAMI  # noqa
    raise SystemExit("tak dipakai")


if __name__ == "__main__":
    perintah = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if perintah == "bangun":
        d = sys.argv[sys.argv.index("--pdf-dir") + 1] if "--pdf-dir" in sys.argv else None
        bangun(d)
    elif perintah == "banding":
        banding()
    else:
        sys.exit("pakai: uji | bangun [--pdf-dir D] | banding")
