#!/usr/bin/env python3
"""Riwayat level gunung api dari surat/laporan PVMBG (Badan Geologi) yang diarsipkan Pusdalops BNPB.
Pakai: python3 scripts/gunungapi/riwayat_level.py <folder-pdf> [...]  -> public/gunungapi/data/riwayat_level.json
Daftar penerima, tembusan, dan nama pejabat tidak dibaca (hanya tanggal, level, radius, kegempaan). Self-check: python3 riwayat_level.py"""
import json, re, subprocess, sys
from pathlib import Path

BLN = {b: i + 1 for i, b in enumerate("Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember".split())}
LV = {"I": 1, "II": 2, "III": 3, "IV": 4}
NAMA = {1: "Normal", 2: "Waspada", 3: "Siaga", 4: "Awas"}
TGL = r"(\d{1,2})\s+(%s)\s+(\d{4})" % "|".join(BLN)
GEMPA = {"Letusan/Erupsi": "letusan", "Hembusan": "hembusan", "Low Frequency": "low_frequency", "Harmonik": "harmonik",
         "Hybrid/Fase Banyak": "hybrid", "Tremor Menerus": "tremor_menerus", "Vulkanik Dangkal": "vulkanik_dangkal",
         "Vulkanik Dalam": "vulkanik_dalam", "Tektonik Jauh": "tektonik_jauh"}

def iso(m):
    return "%s-%02d-%02d" % (m.group(3), BLN[m.group(2)], int(m.group(1)))

def gunung(t):
    m = re.search(r"(?:G\.|Gunungapi|Gunung)\s+([A-Z][\w' ]*?)(?:,|\s+Provinsi|\s+dalam|\s+dari|\s+Level|\n)", t[:900])
    return m.group(1).strip() if m else None

def urai(t, berkas):
    """Satu teks surat -> daftar baris riwayat (kosong bila bukan surat level)."""
    t = re.sub(r"[ \t]+", " ", t)
    g = gunung(t)
    if not g:
        return []
    nomor = (re.search(r"Nomor\s*:\s*([\w. /]+?)(?:\s{2,}|\n| \d{1,2} (?:%s))" % "|".join(BLN), t) or re.search(r"Nomor:\s*([\w. /]+)", t))
    nomor = re.sub(r"\s+\.", ".", nomor.group(1).strip()) if nomor else None
    surat = re.search(r"Nomor[^\n]*?" + TGL, t)
    sumber = {"berkas": Path(berkas).name, "nomor": nomor, "penerbit": "Badan Geologi, PVMBG (KESDM)", "arsip": "Pusdalops BNPB"}
    rad = re.search(r"radius\s+(\d+(?:,\d+)?)\s*km", t)
    radius = float(rad.group(1).replace(",", ".")) if rad else None
    out = []
    ch = re.search(r"dari Level (I{1,3}|IV) \((\w+)\) menjadi Level (I{1,3}|IV) \((\w+)\)", t)
    if ch:  # laporan khusus perubahan status
        eff = re.search(r"terhitung mulai tanggal\s+" + TGL, t)
        out.append({"gunung": g, "jenis": "perubahan", "tanggal": iso(eff) if eff else None, "dari": LV[ch.group(1)], "ke": LV[ch.group(3)],
                    "radius_km": radius, "sumber": sumber})
        up = re.search(r"dinaikan menjadi (\w+) \(Level (I{1,3}|IV)\) sejak\s+" + TGL, t)
        if up:  # kalimat latar: kenaikan sebelumnya
            out.append({"gunung": g, "jenis": "perubahan", "tanggal": iso(re.search(TGL, up.group(0))), "dari": None, "ke": LV[up.group(2)],
                        "radius_km": None, "sumber": sumber})
        return out
    ev = re.search(r"tetap pada Level (I{1,3}|IV) \((\w+)\)", t)
    if ev:  # evaluasi berkala
        per = re.search(r"periode tanggal\s+(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(%s)\s+(\d{4})" % "|".join(BLN), t)
        row = {"gunung": g, "jenis": "evaluasi", "tanggal": iso(surat) if surat else None, "dari": LV[ev.group(1)], "ke": LV[ev.group(1)],
               "radius_km": radius, "sumber": sumber}
        if per:
            b, y = BLN[per.group(3)], per.group(4)
            row["periode"] = ["%s-%02d-%02d" % (y, b, int(per.group(1))), "%s-%02d-%02d" % (y, b, int(per.group(2)))]
        gm = {}
        ii = re.search(r"II\.\s*Pengamatan Instrumental(.*?)(?:III\.|$)", t, re.S)
        for k, v in GEMPA.items():
            m = re.search(r"(\d+)\s+kali\s+(?:gempa|gampa)?\s*" + re.escape(k).replace("\\ ", r"\s+"), ii.group(1) if ii else "", re.I)
            if m:
                gm[v] = int(m.group(1))
        if gm:
            row["gempa"] = gm
        out.append(row)
    return out

def main(folders):
    rows = []
    for f in folders:
        for p in sorted(Path(f).glob("*.pdf")):
            t = subprocess.run(["pdftotext", "-layout", str(p), "-"], capture_output=True, text=True).stdout
            rows += urai(t, p)
    rows = [r for r in rows if r["tanggal"]]
    seen, uniq = set(), []
    for r in sorted(rows, key=lambda r: (r["gunung"], r["tanggal"], r["jenis"])):
        k = (r["gunung"], r["tanggal"], r["jenis"], r["ke"])
        if k not in seen:
            seen.add(k); uniq.append(r)
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
Penurunan Tingkat Aktivitas Gunungapi Anak Krakatau Provinsi Lampung dari Level III (Siaga) menjadi Level II (Waspada)
dinaikan menjadi Siaga (Level III) sejak 2 Juli 2026 pukul 16.30 WIB.
dari Level III (Siaga) menjadi Level II (Waspada) terhitung mulai tanggal 21 September 2026 pukul 18.30 radius 2 km""", "y.pdf")
    assert [(r["tanggal"], r["dari"], r["ke"]) for r in b] == [("2026-09-21", 3, 2), ("2026-07-02", None, 3)], b
    print("self-check riwayat_level: ok")

if __name__ == "__main__":
    main(sys.argv[1:]) if len(sys.argv) > 1 else cek()
