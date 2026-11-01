#!/usr/bin/env python3
"""Riwayat level gunung api dari surat/laporan PVMBG (Badan Geologi) yang diarsipkan Pusdalops BNPB.
Pakai: python3 scripts/gunungapi/riwayat_level.py <folder> [...]  (rekursif, *.pdf; bila pdftotext < 200 karakter
dipakai berkas <nama>.pdf.txt di sampingnya, hasil OCR) -> public/gunungapi/data/riwayat_level.json
Daftar penerima, tembusan, dan nama pejabat tidak dibaca (hanya tanggal, level, radius, kegempaan). Self-check: python3 riwayat_level.py"""
import json, re, subprocess, sys
from pathlib import Path

BLN = {b: i + 1 for i, b in enumerate("Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember".split())}
LV = {"I": 1, "II": 2, "III": 3, "IV": 4}
KATA = {"NORMAL": 1, "WASPADA": 2, "SIAGA": 3, "AWAS": 4}
NAMA = {1: "Normal", 2: "Waspada", 3: "Siaga", 4: "Awas"}
B = "|".join(BLN)
TGL = r"(\d{1,2})\s+(%s)(?:\s+(\d{4}))?" % B
LVL = r"(?:Level\s+(I{1,3}|IV)\b(?:\s*\(\w+\))?|(NORMAL|WASPADA|SIAGA|AWAS))"
# nama gunung yang dikenal dari arsip -> pola; tambah di sini bila arsip memuat gunung baru
GUNUNG = {"Anak Krakatau": r"Anak\s+Krakatau", "Lewotobi Laki-laki": r"Lewotobi\s+Laki", "Ili Lewotolok": r"(?:Ili\s+)?Lewotolok",
          "Bur Ni Telong": r"Bur\s+ni\s+Telong", "Semeru": r"Semeru", "Awu": r"\bAwu\b", "Ibu": r"\bG(?:unung\s?api|unungapi|unung|\.)\s*Ibu\b", "Lokon": r"Lokon", "Merapi": r"Merapi"}
GEMPA = {"Letusan/Erupsi": "letusan", "Hembusan": "hembusan", "Low Frequency": "low_frequency", "Harmonik": "harmonik",
         "Hybrid/Fase Banyak": "hybrid", "Tremor Menerus": "tremor_menerus", "Tremor Non-Harmonik": "tremor_non_harmonik",
         "Vulkanik Dangkal": "vulkanik_dangkal", "Vulkanik Dalam": "vulkanik_dalam", "Tektonik Lokal": "tektonik_lokal", "Tektonik Jauh": "tektonik_jauh"}

KALIMAT = re.compile(r"(?<!\bG)\. [A-Z]")  # batas kalimat, bukan singkatan "G."

def lv(a, b):
    return LV[a] if a else KATA[b.upper()]

def tgl(m, tahun):
    return "%s-%02d-%02d" % (m.group(3) or tahun, BLN[m.group(2)], int(m.group(1)))

def gunung(t):
    h = t[:1500]
    best = None
    for n, p in GUNUNG.items():
        m = re.search(p, h, re.I)
        if m and (best is None or m.start() < best[0]):
            best = (m.start(), n)
    return best[1] if best else None

def urai(t, berkas):
    """Satu teks surat -> daftar baris riwayat (kosong bila bukan surat level)."""
    t = re.sub(r"\s+", " ", t)
    g = gunung(t)
    if not g:
        return []
    nomor = re.search(r"([\w-]*\d+\s?\.?(?:Lap)?\s?/(?:GL|KM)\.\d+(?:/[\w.]+)*/\d{4})", t[:1800])
    nomor = re.sub(r"\s+", "", nomor.group(1)) if nomor else None
    thn = (re.search(r"/(\d{4})\b", nomor).group(1) if nomor else None) or (re.search(r"\b(20\d\d)\b", t[:1800]) or [0, "0000"])[1]
    ds = re.search(r"Nomor[^A-Za-z]*" + r"[^\n]{0,60}?" + TGL, t[:1800]) or re.search(TGL, t[:1800])
    surat = tgl(ds, thn) if ds else None
    sumber = {"berkas": Path(berkas).name, "nomor": nomor, "penerbit": "Badan Geologi, PVMBG (KESDM)", "arsip": "Pusdalops BNPB"}
    out = []

    def baris(jenis, tanggal, dari, ke, **x):
        out.append({"gunung": g, "jenis": jenis, "tanggal": tanggal, "dari": dari, "ke": ke, "radius_km": None, "sumber": sumber, **x})

    def sekitar(m):  # tanggal berlaku, satu kalimat dengan perubahan: "Pada tanggal X ... dinaikkan", lalu "terhitung/sejak X"; selain itu None
        w = t[max(0, m.start() - 200):m.start()]
        b = list(re.finditer(r"(?:[Pp]ada tanggal|[Tt]anggal)\s+" + TGL, w))
        if b and not KALIMAT.search(w[b[-1].end():]):
            return tgl(b[-1], thn)
        a = re.search(r"(?:terhitung(?: mulai)?|sejak|[Pp]ada(?= tanggal)|Tanggal|tanggal)\s+(?:tanggal\s+)?" + TGL, t[m.end():m.end() + 70])
        return tgl(a, thn) if a and not KALIMAT.search(t[m.end():m.end() + a.start()]) else None

    def rad(m):  # radius rekomendasi yang disebut sesudah kalimat level
        r = re.search(r"radius\s+(\d+(?:[,.]\d+)?)\s*km", t[m.end():m.end() + 1800])
        return float(r.group(1).replace(",", ".")) if r else None

    for m in re.finditer(r"%s\s*(?:menjadi|ke)\s*%s" % (LVL, LVL), t):
        d, k = lv(m.group(1), m.group(2)), lv(m.group(3), m.group(4))
        if d != k:
            baris("perubahan", sekitar(m), d, k, radius_km=rad(m))
    for m in re.finditer(r"%s\s+sejak\s+(?:tanggal\s+)?%s" % (LVL, TGL), t):  # keadaan awal yang disebut surat
        baris("perubahan", tgl(re.search(TGL, m.group(0)[10:]), thn), None, lv(m.group(1), m.group(2)), radius_km=rad(m))
    for m in re.finditer(r"menjadi\s+(\w+)\s+\(Level\s+(I{1,3}|IV)\)\s+(?:sejak|pada)\s+" + TGL, t):
        baris("perubahan", tgl(re.search(TGL, m.group(0)), thn), None, LV[m.group(2)], radius_km=rad(m))
    for m in re.finditer(r"(?:tetap pada|masih ditetapkan (?:pada|di)|ditetapkan masih pada|ditetapkan dalam tingkat)\s*(?:tingkat\s*)?[“\"]?%s" % LVL, t, re.I):
        k = lv(m.group(1), m.group(2))
        per = re.search(r"periode(?: tanggal)?\s+(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(%s)(?:\s+(\d{4}))?" % B, t)
        gm = {}
        for kk, v in GEMPA.items():
            q = re.search(r"(\d+)\s+kali\s+(?:gempa|gampa)?\s*" + re.escape(kk).replace("\\ ", r"\s+").replace("\\-", "[- ]"), t, re.I)
            if q:
                gm[v] = int(q.group(1))
        baris("evaluasi", surat, k, k, radius_km=rad(m), **({"periode": ["%s-%02d-%02d" % (per.group(4) or thn, BLN[per.group(3)], int(per.group(i))) for i in (1, 2)]} if per else {}), **({"gempa": gm} if gm else {}))
        break
    return [r for r in out if r["tanggal"]]

def teks(p):
    t = subprocess.run(["pdftotext", "-layout", str(p), "-"], capture_output=True, text=True).stdout
    s = Path(str(p) + ".txt")
    return s.read_text(errors="replace") if len(t.strip()) < 200 and s.exists() else t

def main(folders):
    rows = []
    for f in folders:
        for p in sorted(Path(f).rglob("*.pdf")):
            r = urai(teks(p), p)
            if not r:
                print("dilewati (bukan surat level):", p.name, file=sys.stderr)
            rows += r
    rows = [r for r in rows if r["tanggal"]]
    seen, uniq = {}, []
    for r in sorted(rows, key=lambda r: (r["gunung"], r["tanggal"], r["jenis"], r["dari"] is None)):
        k = (r["gunung"], r["tanggal"], r["jenis"], r["ke"])
        if k not in seen:
            seen[k] = r; uniq.append(r)
        elif r["jenis"] == "perubahan" and seen[k]["dari"] is None and r["dari"]:  # versi dengan level asal menang
            seen[k].update(dari=r["dari"], sumber=r["sumber"], radius_km=r["radius_km"])
        elif seen[k]["radius_km"] is None:
            seen[k]["radius_km"] = r["radius_km"]
    js = {"sumber": "Surat dan laporan Badan Geologi (PVMBG, KESDM), diarsipkan Pusdalops BNPB", "level": NAMA,
          "gunung": sorted({r["gunung"] for r in uniq}), "baris": uniq}
    out = Path(__file__).resolve().parents[2] / "public/gunungapi/data/riwayat_level.json"
    out.write_text(json.dumps(js, ensure_ascii=False, indent=1) + "\n")
    print(len(uniq), "baris,", len(js["gunung"]), "gunung ->", out)

def cek():
    a = urai("""Nomor : 1403.Lap/GL.03/BGL/2026   18 Agustus 2026
Hal : evaluasi aktivitas G. Anak Krakatau, Lampung dalam Level III
periode tanggal 8 - 15 Agustus 2026
II. Pengamatan Instrumental terekam 2 kali gempa Letusan/Erupsi, 16 kali gempa Hembusan, 7 kali Gempa Tektonik Jauh. III. Evaluasi
tetap pada Level III (Siaga) radius 3 km""", "x.pdf")
    assert len(a) == 1 and a[0]["gunung"] == "Anak Krakatau" and a[0]["tanggal"] == "2026-08-18", a
    assert a[0]["gempa"] == {"letusan": 2, "hembusan": 16, "tektonik_jauh": 7} and a[0]["radius_km"] == 3.0, a
    assert a[0]["periode"] == ["2026-08-08", "2026-08-15"], a
    b = urai("""LAPORAN KHUSUS Nomor: 1604 .Lap/GL.03/BGL/2026
Penurunan Tingkat Aktivitas Gunungapi Anak Krakatau Provinsi Lampung dari Level III (Siaga) menjadi Level II (Waspada) Tanggal 21 September 2026 Pukul 18.30 WIB
dinaikan menjadi Siaga (Level III) sejak 2 Juli 2026 pukul 16.30 WIB.
dari Level III (Siaga) menjadi Level II (Waspada) terhitung mulai tanggal 21 September 2026 pukul 18.30 radius 2 km""", "y.pdf")
    assert {(r["tanggal"], r["dari"], r["ke"]) for r in b} == {("2026-09-21", 3, 2), ("2026-07-02", None, 3)}, b
    # teks nyata siaran pers 2025: tahun tidak ditulis di kalimat, tanggal di judul
    c = urai("SIARAN PERS Nomor : 27 /KM.05/BGL/2025 Kenaikan Tingkat Aktivitas dari Level III (Siaga) ke Level IV (AWAS) Gunung Lewotobi Laki-laki, Nusa Tenggara Timur Tanggal 13 Februari Pukul 03.00 WITA", "z.pdf")
    assert [(r["tanggal"], r["dari"], r["ke"]) for r in c] == [("2025-02-13", 3, 4)], c
    # tanggal sebelum kalimat (Bur Ni Telong) dan sesudah kata "terhitung" (Lewotobi 724)
    d = urai("LAPORAN KHUSUS Nomor: 172 /GL.03/BGL/2025 PENINGKATAN KEGEMPAAN G. BUR NI TELONG, ACEH TANGGAL 5 DESEMBER 2025 Pada tanggal 25 November 2025 tingkat aktivitas G. Bur Ni Telong dinaikan dari Level I (Normal) menjadi Level II (Waspada).", "d.pdf")
    assert [(r["gunung"], r["tanggal"], r["dari"], r["ke"]) for r in d] == [("Bur Ni Telong", "2025-11-25", 1, 2)], d
    e = urai("Nomor : 724.Lap/GL.03/BGL/2025 19 Mei 2025 Hal : Penyampaian Kenaikan G. Lewotobi Laki-laki dari Level III (SIAGA) ke Level IV (AWAS) dinaikkan dari Level III (SIAGA) menjadi Level IV (AWAS), terhitung mulai tanggal 18 Mei 2025 pukul 18", "e.pdf")
    assert {(r["tanggal"], r["dari"], r["ke"]) for r in e} >= {("2025-05-18", 3, 4)}, e
    f = urai("Nomor : B-97/GL.03/BGV.KG1/2025 21 Februari 2025 Laporan Aktivitas Gunung Merapi Status aktivitas ditetapkan dalam tingkat “SIAGA”", "f.pdf")
    assert [(r["jenis"], r["ke"]) for r in f] == [("evaluasi", 3)], f
    print("self-check riwayat_level: ok")

if __name__ == "__main__":
    main(sys.argv[1:]) if len(sys.argv) > 1 else cek()
