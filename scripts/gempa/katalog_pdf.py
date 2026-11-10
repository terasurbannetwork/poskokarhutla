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
    if sel["ot"] and re.fullmatch(r"\d{1,2}[:.]\d\d([:.]\d\d)?", sel["ot"]):
        f["jam"] = sel["ot"].replace(".", ":")  # "21.43.24" ditulis dengan titik di sebagian baris
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
KOL_TS = ("no", "thn", "bln", "tgl", "pukul", "mag", "vt", "lok", "lat", "lon", "hm", "kor", "cat", "ref")


def kepala_tsunami(gs):
    """Tepi kiri tiap kolom dari kepala tabel (posisi beda per halaman).
    bentuk 'wilayah': Tanggal gabung; bentuk 'lampiran': Thn/Bln/Tgl terpisah. None bila bukan tabel."""
    kata = [w for _, l in gs for w in l]
    kej = [w for w in kata if w[4] == "KEJADIAN"]
    if not kej:
        return None
    y0 = kej[0][1]
    zona = [w for w in kata if y0 - 8 <= w[1] <= y0 + 48]

    def f(*nama):
        c = sorted(w for w in zona if w[4] in nama)
        return c[0] if c else None
    lamp = f("Thn") is not None
    pukul, mag, lat, lon = f("Pukul"), f("MAG."), f("Lintang", "Lat"), f("Bujur", "Lon", "Long")
    meng, ref = f("MENINGGAL"), f("REFERENSI")
    kor, no = f("KORBAN"), f("No.", "No")
    if not all((pukul, mag, lat, lon, meng, ref, kor)):
        return None
    vt = sorted(w for w in zona if w[4] in ("V", "/", "T", "Vol/", "Tek") and mag[0] < w[0] < lat[0])
    if not vt:
        return None
    hm = f("Hmaks.", "H")
    dasar_kepala = {"(UTC)", "PENGAMATAN", "GEMPA", "Tanggal", "Tangal", "Lintang", "Bujur", "Lat", "Lon", "Long",
                    "Tgl", "Bln", "Thn", "Tek", "Pukul", "MENINGGAL"}
    k = {"top": max(w[3] for w in zona if w[4] in dasar_kepala) + 1, "lamp": lamp, "no": no[0] if no else 0}
    if lamp:
        k["thn"] = f("Thn")[0] - 14
        k["bln"] = f("Thn")[2] + 8
        k["tgl"] = f("Tgl")[0] - 12
    else:
        tg = f("Tanggal", "Tangal")
        k["tgl"] = (tg[0] - 8) if tg else (no[0] + 30 if no else 110)
    k.update({
        "pukul": pukul[0] - 12, "mag": mag[0] - 12, "vt": vt[0][0] - 12, "lok": vt[-1][2] + 8,
        "lat": lat[0] - 12, "lon": lon[0] - 12,
        "hm": (hm[0] - 12) if hm else (lon[0] + kor[0]) / 2,
        "kor": kor[0] - 10, "ref": ref[0] - 14,
    })
    k["cat"] = k["ref"] if lamp else meng[2] + 3
    return k


def kolom_ts(x, k):
    for nm in reversed(KOL_TS):
        if nm in k and x >= k[nm]:
            return nm
    return "no"


def kelompokkan(gt, anc, top, dasar, carry):
    """Bagi kata tabel (sel rata tengah vertikal) ke baris. Tepi bawah baris = 2*y_jangkar - tepi atas.
    Mengembalikan (kata_lanjutan_baris_sebelumnya, [kata per baris], carry_baru)."""
    ys = sorted({round(y, 1) for y, _ in gt})
    tepi = [(a + b) / 2 for a, b in zip(ys, ys[1:])]

    def snap(v, r=7):
        c = [t for t in tepi if abs(t - v) <= r]
        return min(c, key=lambda t: abs(t - v)) if c else v
    lo = snap(top + carry) if carry > 0 else top
    lanjut = [w for y, ws in gt for w in ws if (w[1] + w[3]) / 2 < lo] if carry > 0 else []
    hasil, batas = [], []
    for i, ya in enumerate(anc):
        atas = [y for y in ys if lo < y <= ya + 2]
        t = (min(atas) - 5) if atas else ya - 6
        b = 2 * ya - t
        berikut = anc[i + 1] if i + 1 < len(anc) else None
        if berikut is not None:
            b = snap(min(max(b, ya + 4), berikut - 4))
        elif b > dasar + 10:
            carry, b = b - dasar, 1e9
        else:
            carry, b = 0.0, 1e9
        hasil.append([w for y, ws in gt for w in ws if lo < (w[1] + w[3]) / 2 <= b] if i else
                     [w for y, ws in gt for w in ws if lo <= (w[1] + w[3]) / 2 <= b])
        lo = b
    return lanjut, hasil, carry


def isi_tsunami(r, w, k):
    kol = {}
    for t in sorted(w, key=lambda t: (round((t[1] + t[3]) / 2 / 3), t[0])):
        kol.setdefault(kolom_ts(t[0], k), []).append(t)
    T = lambda nm: rapi(teks(kol.get(nm, [])))
    if k["lamp"]:
        thn, bln, tgl = T("thn"), T("bln"), T("tgl")
        tahun = int(thn) if thn and re.fullmatch(r"\d{1,4}", thn) else None
        bulan = BULAN.get((bln or "").lower().rstrip("."))
        hari = int(tgl) if tgl and re.fullmatch(r"\d{1,2}", tgl) else None
        r["tanggal_teks"] = " ".join(x for x in (tgl, bln, thn) if x) or None
    else:
        hari = bulan = tahun = None
        for t in sorted(kol.get("tgl", []), key=lambda t: ((t[1] + t[3]) / 2, t[0])):
            sv = t[4]
            if re.fullmatch(r"\d{1,2}", sv) and hari is None and bulan is None:
                hari = int(sv)
            elif sv.lower().rstrip(".") in BULAN and bulan is None:
                bulan = BULAN[sv.lower().rstrip(".")]
            elif re.fullmatch(r"\d{3,4}", sv) and tahun is None:
                tahun = int(sv)
        r["tanggal_teks"] = T("tgl")
    r["tanggal"] = tanggal_iso(hari, bulan, tahun)
    r["pukul_utc"] = T("pukul")
    mg = T("mag")
    r["magnitudo_gempa"], r["magnitudo_gempa_teks"] = angka(mg), mg
    r["jenis_sumber"] = T("vt")  # kepala PDF "V/T" (Vulkanik/Tektonik); "*" = tak diketahui
    r["sumber_tsunami"] = T("lok")
    r["lintang"], r["bujur"] = angka(T("lat")), angka(T("lon"))
    hm = T("hm")
    r["tinggi_maks_m"], r["tinggi_maks_teks"] = angka(hm), hm
    kb = T("kor")
    r["korban_meninggal_teks"] = kb
    r["korban_meninggal"] = int(kb.replace(".", "")) if kb and re.fullmatch(r"\d{1,3}(\.\d{3})+|\d+", kb) else None
    r["catatan"] = T("cat")
    r["referensi"] = T("ref")
    return r


def urai_tsunami(halaman):
    baris, gagal, wilayah, carry, prev, prev_k = [], [], None, 0.0, None, None
    lampiran = []
    for nh, kata in enumerate(halaman, 1):
        gs = garis(kata)
        for y, ws in gs:  # judul bagian bisa di halaman terpisah dari tabelnya
            tj = teks(ws)
            if ws[0][0] < 100 and len(ws) < 6 and "...." not in tj and y < 300 and (
                    ws[0][4] == "WILAYAH" or (y < 90 and tj.isupper() and "LAMPIRAN" not in tj and "DAFTAR" not in tj
                                               and not any(w[4] in ("WAKTU", "KEJADIAN", "No.") for w in ws))):
                wilayah = tj.replace("WILAYAH", "").strip().title()
        k = kepala_tsunami(gs)
        if k is None:
            continue
        dasar = max([w[3] for w in kata if w[4] == "Katalog"] or [560]) - 12
        gt = [(y, ws) for y, ws in garis([w for w in kata if w[1] >= k["top"] - 0.5 and w[3] < dasar + 11])
              if not any(w[4] == "Katalog" for w in ws)]
        notes, isi, mode = [], [], False
        for y, ws in gt:
            kiri = ws[0][0] < k["no"] + 3 and not re.fullmatch(r"\d+\.?", ws[0][4])
            if (ws[0][4] == "Catatan" and len(ws) > 1 and ws[1][4].startswith("Pengamatan")) or (mode and kiri):
                mode = True
                notes.append((y, ws))
            else:
                mode = False
                isi.append((y, ws))
        if not k["lamp"]:  # kepala "REFERENSI" rata tengah: batas Catatan | Referensi = celah kosong terlebar
            iv = sorted((w[0], w[2]) for _, ws in isi for w in ws if w[0] >= k["cat"] + 40)
            akhir, lebar = k["cat"] + 40, 8.0
            for a0, b0 in iv:
                if a0 - akhir > lebar:
                    k["ref"], lebar = (akhir + a0) / 2, a0 - akhir
                akhir = max(akhir, b0)
        anc = [(y, w) for y, ws in isi for w in ws if w[0] < (k["thn"] if k["lamp"] else k["tgl"]) - (0 if k["lamp"] else 0)
               and re.fullmatch(r"\d+\.?" if not k["lamp"] else r"\d{1,3}", w[4]) and w[0] >= k["no"] - 12
               and (k["lamp"] or w[4].endswith("."))]
        if not anc:
            continue
        # catatan pengamatan menyela: pisahkan dari sel baris (milik baris di atasnya)
        lanjut, kel, carry = kelompokkan(isi, [y for y, _ in anc], k["top"], dasar, carry)
        if prev is not None and lanjut:
            prev["_w"].extend(lanjut)
        hal = []
        for (ya, wa), wsr in zip(anc, kel):
            r = {"no_tabel": int(wa[4].rstrip(".")), "halaman": nh, "_w": wsr, "_k": k, "_y": ya, "_catn": []}
            if not k["lamp"]:
                r["wilayah"] = wilayah
            hal.append(r)
        for y, ws in notes:
            atas = [r for r in hal if r["_y"] <= y]
            tgt = atas[-1] if atas else prev
            if tgt is not None:
                tgt["_catn"].append(teks(ws))
        (lampiran if k["lamp"] else baris).extend(hal)
        prev = hal[-1]
    out = []
    for lst in (baris, lampiran):
        for r in lst:
            w, k = r.pop("_w"), r.pop("_k")
            r.pop("_y")
            isi_tsunami(r, w, k)
            extra = rapi(re.sub(r"Catatan Pengamatan\s*:\s*", "", " ".join(r.pop("_catn"))))
            if extra:
                r["catatan_pengamatan"] = extra
            if r["tanggal"] is None:
                gagal.append({"halaman": r["halaman"], "no_tabel": r["no_tabel"], "alasan": "tanggal tak terbaca",
                              "teks": r["tanggal_teks"]})
        out.append(lst)
    return out[0], out[1], gagal


# ---------------------------------------------------------------- jalankan
def unduh(url, ke):
    # curl, bukan urllib: Python sistem lama (LibreSSL) ditolak TLS oleh cdn.bmkg.go.id
    subprocess.run(["curl", "-sfL", "-A", UA, "-o", ke, url], check=True)


def bbox(pdf, ke):
    subprocess.run([PDFTOTEXT, "-bbox", pdf, ke], check=True)
    return baca_bbox(ke)


def kolom_kosong(baris, skip=()):
    if not baris:
        return {}
    ks = [k for k in baris[0] if k not in skip]
    return {k: round(100 * sum(1 for b in baris if b.get(k) in (None, "")) / len(baris), 1) for k in ks}


def bungkus(jenis, baris, gagal, **lain):
    for i, b in enumerate(baris, 1):
        b["id"] = ("KM" if jenis == "merusak" else "KT") + "%04d" % i
    d = {
        "judul": {"merusak": "Katalog Gempabumi Signifikan & Merusak Indonesia 1821-2025 (BMKG)",
                  "tsunami": "Katalog Tsunami Indonesia 416-2025 (BMKG)"}[jenis],
        "sumber": SUMBER[jenis],
        "diambil": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "jumlah_baris": len(baris),
        "gagal_urai": gagal,
        "catatan": "Disalin apa adanya dari tabel PDF resmi BMKG; nilai yang tak terbaca = null. "
                   "Kolom *_teks menyimpan tulisan asli; halaman = halaman PDF (1 = sampul).",
    }
    d.update(lain)
    d["baris"] = baris
    return d


def tulis(nama, d):
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, nama), "w", encoding="utf8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write("\n")


def bangun(pdf_dir=None):
    tmp = pdf_dir or tempfile.mkdtemp(prefix="katalog_pdf_")
    for jenis in ("merusak", "tsunami"):
        pdf = os.path.join(tmp, jenis + ".pdf")
        if not os.path.exists(pdf):
            unduh(SUMBER[jenis], pdf)
    h = bbox(os.path.join(tmp, "merusak.pdf"), os.path.join(tmp, "merusak.bbox.html"))
    baris, gagal = urai_merusak(h)
    tulis("katalog_merusak.json", bungkus("merusak", baris, gagal))
    print("merusak baris", len(baris), "gagal", len(gagal), "\n  kosong%:", kolom_kosong(baris, skip=("id",)))
    h = bbox(os.path.join(tmp, "tsunami.pdf"), os.path.join(tmp, "tsunami.bbox.html"))
    wil, utama, gagal = urai_tsunami(h)
    for i, b in enumerate(wil, 1):
        b["id"] = "KW%04d" % i
    tulis("katalog_tsunami.json", bungkus(
        "tsunami", utama, gagal, jumlah_baris_wilayah=len(wil), baris_wilayah=wil,
        catatan_jumlah="Dokumen menyatakan 181 kejadian (Pendahuluan) tetapi Tabel Lampiran memuat %d baris; "
                       "baris_wilayah mengulang kejadian yang menyentuh beberapa wilayah, dengan Catatan Pengamatan." % len(utama)))
    print("tsunami baris(lampiran)", len(utama), "wilayah", len(wil), "gagal", len(gagal))
    print("  kosong% lampiran:", kolom_kosong(utama, skip=("id",)))
    print("  kosong% wilayah:", kolom_kosong(wil, skip=("id",)))


def banding():
    f_cdn = os.path.join(tempfile.mkdtemp(prefix="katalog_cdn_"), "katalog_gempa.json")
    unduh(CDN, f_cdn)
    cdn = json.load(open(f_cdn, encoding="utf8"))["features"]
    ref = []
    for f in cdn:
        p = f["properties"]
        try:
            d = datetime.strptime(p["date"], "%d-%m-%Y").strftime("%Y-%m-%d")
        except Exception:
            continue
        ref.append((d, angka(p.get("mag"))))
    km = json.load(open(os.path.join(DATA, "katalog_merusak.json"), encoding="utf8"))["baris"]
    pdf = [(date.fromisoformat(b["tanggal"]), b["magnitudo"]) for b in km if b["tanggal"] and len(b["tanggal"]) == 10]
    n = len(ref)
    hit_tgl = hit_tgl1 = hit_mag = hit_mag1 = 0
    tak = []
    for d, m in ref:
        d = date.fromisoformat(d)
        c0 = [x for x in pdf if x[0] == d]
        c1 = [x for x in pdf if abs((x[0] - d).days) <= 1]  # PDF dalam WIB, CDN dalam UTC
        hit_tgl += bool(c0)
        hit_tgl1 += bool(c1)
        ok0 = m is not None and any(x[1] is not None and abs(x[1] - m) <= 0.15 for x in c0)
        ok1 = m is not None and any(x[1] is not None and abs(x[1] - m) <= 0.15 for x in c1)
        hit_mag += ok0
        hit_mag1 += ok1
        if not ok1:
            tak.append((d.isoformat(), m, [(x[0].isoformat(), x[1]) for x in c1]))
    pct = lambda v: "%d (%.1f%%)" % (v, 100 * v / n)
    print("CDN merusak (%d baris) vs katalog PDF (%d baris bertanggal lengkap)" % (n, len(pdf)))
    print("  tanggal sama persis      :", pct(hit_tgl))
    print("  tanggal +-1 hari         :", pct(hit_tgl1))
    print("  tanggal sama + mag +-0,15:", pct(hit_mag))
    print("  tanggal +-1 + mag +-0,15 :", pct(hit_mag1))
    print("  contoh tak cocok:", tak[:8])
    return n, hit_tgl, hit_tgl1, hit_mag, hit_mag1, tak


# ---------------------------------------------------------------- uji
# Potongan halaman NYATA dari kedua PDF (kata per baris: "x0-x1:teks"), bukan tiruan.
# Tiap baris: "y|x0-x1:teks ...". Dipotong di y tertentu supaya ringkas.
_P_MERUSAK_A = """
85.7|50-147:TAHUN 155-218:2025
119.5|62-76:NO 94-138:TANGGAL 173-207:WAKTU 209-243:GEMPA 256-296:LINTANG 318-349:BUJUR 391-449:KEDALAMAN 467-488:MAG 503-557:DIRASAKAN 658-697:DAMPAK 700-757:KERUSAKAN
142.4|66-72:1 100-113:08 117-156:Januari 185-232:00:52:23 258-282:8.21 285-300:LS 319-355:119.27 359-374:BT 416-429:11 471-488:4.9 503-531:Bima 534-545:IV 549-572:MMI 658-700:Korban 703-771:meninggal:-
156.2|115-142:2025 197-220:WIB 413-431:Km 658-700:Korban 703-735:Luka: 738-742:-
165.3|501-532:Pusat 535-572:gempa 575-613:berada 616-625:di
170.0|658-723:Kerusakan:
179.1|114-142:Bima 501-521:laut 524-537:64 541-557:km 560-587:timur 590-609:laut 613-637:Kota
183.8|658-664:1 668-702:rumah 705-734:rusak 738-777:sedang 780-823:(dinding
192.9|501-532:Bima, 535-563:NTB.
197.6|658-692:roboh) 696-705:di 708-743:Dusun 746-774:Ringi 777-805:Desa
203.1|114-142:Nusa
211.4|658-695:Pandai 698-759:Kecamatan 762-797:Woha,
218.0|102-154:Tenggara
225.2|658-716:Kabupaten 719-750:Bima, 753-777:NTB
232.9|114-143:Barat
"""
_P_MERUSAK_B = """
84.1|261-303:Koordinat 306-309:( 309-312:0 312-315:)
92.7|336-361:Depth
99.0|61-73:No 95-166:Tanggal/Wilayah 189-215:Origin 218-239:Time 377-397:Mag 441-476:Wilayah 478-499:yang 502-549:merasakan 680-711:Korban 714-716:/ 719-765:Kerusakan 865-899:Sumber
105.3|339-358:(km)
119.3|258-272:Lat 295-317:Long
133.2|410-439:(Pusat 441-472:gempa 474-505:berada 508-516:di 519-536:laut 538-549:90 552-566:km
146.7|410-457:BaratDaya 459-475:kab 478-539:Pangandaran. 542-564:Jawa
160.1|410-438:Barat)
174.1|93-104:28 106-143:Oktober 146-168:2020 194-233:02:43:53 410-414:- 416-454:Mamuju 456-489:Tengah 492-510:IV-V 513-534:MMI
187.4|63-74:10 94-132:Mamuju 134-167:Tengah 204-223:WIB 254-277:-2.24 291-321:119.22 343-354:10 380-394:5.4 410-414:- 416-437:Kota 439-477:Mamuju 479-500:III-IV 503-524:MMI 590-623:Korban 626-674:Meninggal 677-680:: 685-690:1 693-718:orang 723-763:(terjatuh 765-796:karena 798-826:panik) 869-897:BMKG
200.8|590-623:Korban 626-668:luka-luka 670-673:: 678-684:1 686-712:orang 715-723:di 726-747:Desa 750-770:Kuo. 773-794:Desa 797-817:Polo 819-849:Lereng
214.2|410-414:- 421-460:Mamasa 462-479:II-III 482-503:MMI 590-607:dan 610-632:Desa 634-683:Barakkang. 686-734:Kabupaten 737-775:Mamuju 777-810:Tengah
"""
_P_TSUNAMI_LAMP = """
73.6|85-233:LAMPIRAN
124.0|204-242:WAKTU 244-295:KEJADIAN 370-396:MAG. 419-437:Vol/ 590-627:LOKASI
132.6|483-526:SUMBER 670-677:H 700-744:KORBAN
138.3|118-134:No. 784-841:REFERENSI
144.0|482-527:TSUNAMI 666-681:(m) 696-757:MENINGGAL
147.8|155-174:Thn 210-227:Bln 263-278:Tgl 311-338:Pukul 364-401:GEMPA 419-436:Tek 576-591:Lat 622-640:Lon
169.9|124-129:1 156-173:416 419-437:Vol. 479-501:Selat 503-531:Sunda 569-598:-6.102 613-649:105.423 672-675:- 725-729:- 799-826:NOAA
182.1|455-507:Gamalama. 510-554:P.Makian.
187.8|124-129:2 153-176:1608 211-226:Juli 268-273:1 323-326:- 381-384:- 425-431:T 574-593:0.80 616-646:127.33 671-676:0 725-729:- 798-827:NOAA
193.6|487-522:Ternate
206.6|124-129:3 153-176:1657 196-242:Desember 265-276:10 323-326:- 381-384:- 425-431:T 456-465:P. 468-499:Banda. 502-522:Laut 525-553:Banda 572-595:-3.00 616-646:128.00 724-730:0 772-797:Latief 799-808:et 810-821:al. 824-853:(2000)
220.5|323-326:- 381-384:- 419-436:Vol. 456-465:P. 468-499:Banda. 502-522:Laut 525-553:Banda 572-595:-6.92 616-646:129.13 666-680:1.5 798-827:NOAA
"""
_P_TSUNAMI_WIL = """
73.6|85-216:WILAYAH 223-303:ACEH
116.0|125-162:WAKTU 165-216:KEJADIAN 240-266:MAG. 424-462:LOKASI 692-740:CATATAN
122.0|338-381:SUMBER 499-535:Hmaks. 566-610:KORBAN
127.7|92-108:No. 289-296:V 299-301:/ 304-310:T 815-872:REFERENSI
131.4|189-216:Pukul 337-382:TSUNAMI 509-525:(m) 558-619:MENINGGAL
137.2|125-163:Tanggal 235-271:GEMPA 402-438:Lintang 453-479:Bujur 680-752:PENGAMATAN
142.8|189-216:(UTC)
154.8|139-150:29
166.4|96-104:1. 120-169:September 246-260:7,3 296-303:V 332-361:Banda 364-387:Aceh 413-427:5,5 461-472:96 515-519:- 586-589:- 636-657:Lihat 660-710:keterangan 713-721:di 723-753:bawah 830-858:NOAA
177.9|133-155:1837
197.1|91-126:Catatan 128-188:Pengamatan:
215.8|91-114:Pada 117-138:akhir 141-190:September 193-218:1837, 220-275:serangkaian 278-316:bencana 319-341:alam 343-378:dahsyat 381-419:melanda 422-448:Pulau 451-485:Penang 488-504:dan 507-534:pantai 537-560:barat 563-579:laut 582-622:Sumatra. 625-658:Gempa 661-682:bumi 685-705:kuat 707-729:yang 732-795:mengguncang 798-832:Penang 835-881:dilaporkan
228.2|91-109:juga 112-156:dirasakan 158-197:serentak 199-207:di 210-233:Aceh 235-252:dan 255-301:sepanjang 304-333:pesisir 336-360:Pidie. 363-404:Informasi 407-428:lebih 431-455:lanjut 458-493:diterima 496-519:pada 521-527:4 530-565:Oktober 568-590:1837 593-610:dari 612-649:seorang 651-690:nakhoda 693-714:yang 717-737:baru 740-759:tiba. 761-770:Ia 773-825:melaporkan 827-860:adanya
240.7|91-133:beberapa 136-168:letusan 170-206:Gunung 209-257:Peuetsagu 259-282:serta 284-315:gempa 318-339:bumi 342-350:di 353-417:Lhokseumawe 420-437:dan 439-473:wilayah 475-494:lain. 497-533:Menurut 536-581:kesaksian 583-622:tersebut, 625-660:dampak 663-701:terparah 704-731:terjadi 734-742:di 745-773:Banda 776-802:Aceh, 804-812:di 815-840:mana 843-873:gempa
253.0|91-137:dilaporkan 139-194:berlangsung 197-229:selama 232-254:tujuh 257-273:hari 276-293:dan 296-358:menyebabkan 361-407:kerusakan 410-432:yang 434-461:cukup 464-492:besar. 494-542:Rangkaian 545-583:bencana 586-596:ini 599-618:juga 620-654:tercatat 657-691:memicu 694-744:gelombang 747-780:pasang 783-804:yang 807-826:kuat 829-859:hingga
265.5|91-134:mencapai 137-185:Singapura.
286.4|139-150:14
298.7|96-104:2. 121-167:Desember 201-204:- 251-255:* 298-301:- 332-361:Banda 364-387:Aceh 413-427:5,5 461-472:96 514-520:0 586-589:- 636-660:Tidak 663-679:ada 682-732:keterangan 830-858:NOAA
311.2|133-155:1885
"""


def _halaman(spec):
    out = []
    for ln in spec.strip().splitlines():
        y, isi = ln.split("|", 1)
        y = float(y)
        for tok in isi.split(" "):
            if re.match(r"^\d+-\d+:", tok):
                xs, t = tok.split(":", 1)
                x0, x1 = xs.split("-")
                out.append((float(x0), y - 4, float(x1), y + 4, t))
            elif out:  # kata berspasi "Tanggal/Wilayah" tak ada; sambungan token tanpa posisi
                out[-1] = out[-1][:4] + (out[-1][4] + " " + tok,)
    return out


def uji():
    assert angka("7,3") == 7.3 and angka("-5.0") == -5.0 and angka("-") is None and angka("*") is None
    assert tanggal_iso(29, 9, 1837) == "1837-09-29" and tanggal_iso(None, 5, 1920) == "1920-05"
    assert tanggal_iso(None, None, 416) == "0416" and tanggal_iso(1, 1, None) is None
    # merusak, bentuk A (2025): lintang bertanda lewat LS, caption foto bukan bagian baris
    b, g = urai_merusak([_halaman(_P_MERUSAK_A)])
    assert len(b) == 1 and not g, (b, g)
    r = b[0]
    assert (r["tanggal"], r["jam"], r["lintang"], r["bujur"], r["kedalaman_km"], r["magnitudo"]) == \
        ("2025-01-08", "00:52:23", -8.21, 119.27, 11.0, 4.9), r
    assert r["lokasi"] == "Bima Nusa Tenggara Barat", r["lokasi"]
    assert r["dirasakan"].startswith("Bima IV MMI Pusat gempa berada di laut 64 km"), r["dirasakan"]
    assert r["korban_kerusakan"].startswith("Korban meninggal:- Korban Luka: - Kerusakan: 1 rumah rusak sedang"), r
    assert "Pusat" not in r["korban_kerusakan"] and r["tsunami"] is None
    # merusak, bentuk B: tanggal di baris ATAS nomor (sel rata tengah) + tahun 2020
    b, g = urai_merusak([_halaman(_P_MERUSAK_B)])
    assert len(b) == 1 and b[0]["no_tabel"] == 10, b
    r = b[0]
    assert (r["tanggal"], r["jam"], r["lintang"], r["bujur"], r["kedalaman_km"], r["magnitudo"]) == \
        ("2020-10-28", "02:43:53", -2.24, 119.22, 10.0, 5.4), r
    assert r["dirasakan"].startswith("- Mamuju Tengah IV-V MMI - Kota Mamuju III-IV MMI"), r["dirasakan"]
    # tsunami, tabel lampiran (satu baris per kejadian)
    _, utama, g = urai_tsunami([_halaman(_P_TSUNAMI_LAMP)])
    assert [x["no_tabel"] for x in utama[:3]] == [1, 2, 3] and not g, (utama, g)
    assert utama[0]["tanggal"] == "0416" and utama[0]["lintang"] == -6.102 and utama[0]["jenis_sumber"] == "Vol."
    assert utama[1]["tanggal"] == "1608-07-01" and utama[1]["sumber_tsunami"] == "Gamalama. P.Makian. Ternate"
    assert utama[2]["tanggal"] == "1657-12-10" and utama[2]["korban_meninggal"] == 0 and utama[2]["referensi"].startswith("Latief")
    # tsunami, tabel per wilayah: sel rata tengah + Catatan Pengamatan di bawah baris
    wil, _, g = urai_tsunami([_halaman(_P_TSUNAMI_WIL)])
    assert [x["no_tabel"] for x in wil] == [1, 2] and wil[0]["wilayah"] == "Aceh", wil
    assert wil[0]["tanggal"] == "1837-09-29" and wil[0]["magnitudo_gempa"] == 7.3 and wil[0]["bujur"] == 96.0
    assert wil[0]["sumber_tsunami"] == "Banda Aceh" and wil[0]["referensi"] == "NOAA"
    assert wil[0]["catatan_pengamatan"].startswith("Pada akhir September 1837"), wil[0]
    assert wil[1]["tanggal"] == "1885-12-14" and wil[1]["magnitudo_gempa"] is None and wil[1]["magnitudo_gempa_teks"] == "*"
    print("uji katalog_pdf: OK")


if __name__ == "__main__":
    perintah = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if perintah == "bangun":
        d = sys.argv[sys.argv.index("--pdf-dir") + 1] if "--pdf-dir" in sys.argv else None
        bangun(d)
    elif perintah == "banding":
        banding()
    elif perintah == "uji":
        uji()
    else:
        sys.exit("pakai: uji | bangun [--pdf-dir D] | banding")
