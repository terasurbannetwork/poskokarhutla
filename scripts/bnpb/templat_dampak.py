"""Membangkitkan public/bnpb/templat/data-dampak.xlsx dari kolom meja `dampak` di src/meja_spek.js (JK-20).

Kolom diambil dari spek yang sama dengan Worker (node mencetak spekPublik), supaya templat tidak pernah beda dengan formulir.
Lembar "Data": baris 1 label Indonesia, baris 2 kunci kolom (dibaca public/bnpb/meja_impor.js, jangan diubah), baris 3 dst satu baris per kejadian.
Lembar "Petunjuk": 0 berarti nihil, kosong berarti belum didata. Tanpa data contoh di lembar Data supaya tidak ikut terimpor.
Jalankan: python3 scripts/bnpb/templat_dampak.py   (butuh openpyxl dan node)
"""
import json
import subprocess
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

AKAR = Path(__file__).resolve().parents[2]
KELUAR = AKAR / "public/bnpb/templat/data-dampak.xlsx"
BARIS_ISI = 300   # baris berformat siap isi; impor tetap membaca sampai baris terakhir yang terisi


def ambil_spek():
    js = "import './src/worker.js'; import {spekPublik} from './src/meja_spek.js'; process.stdout.write(JSON.stringify(spekPublik().meja.find(m => m.id === 'dampak')))"
    r = subprocess.run(["node", "--input-type=module", "-e", js], cwd=AKAR, capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def bangun(meja):
    kolom = [k for k in meja["kolom"] if k["tipe"] != "gudang"]
    bagian = meja["bagian"]
    wb = Workbook()
    ws = wb.active
    ws.title = "Data"
    biru = PatternFill("solid", fgColor="0B2545")
    abu = PatternFill("solid", fgColor="E8EEF6")
    for j, k in enumerate(kolom, start=1):
        label = k["label"] + (" *" if k.get("wajib") else "")
        if k.get("nihil"):
            label += " (isi ya bila tidak ada)"
        c = ws.cell(row=1, column=j, value=label)
        c.font, c.fill = Font(bold=True, color="FFFFFF"), biru
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        c.comment = Comment("Bagian: " + bagian.get(k.get("bagian"), "-"), "Templat")
        d = ws.cell(row=2, column=j, value=k["nama"])
        d.font, d.fill = Font(italic=True, color="555555"), abu
        d.alignment = Alignment(horizontal="center")
        ws.column_dimensions[get_column_letter(j)].width = 34 if k["tipe"] == "teks" else 18
        huruf = get_column_letter(j)
        rentang = "%s3:%s%d" % (huruf, huruf, BARIS_ISI + 2)
        if k["tipe"] == "pilih":
            dv = DataValidation(type="list", formula1='"%s"' % ",".join(k["nilai"]), allow_blank=True)
            ws.add_data_validation(dv)
            dv.add(rentang)
        elif k["tipe"] == "ya":
            dv = DataValidation(type="list", formula1='"ya"', allow_blank=True)
            ws.add_data_validation(dv)
            dv.add(rentang)
        elif k["tipe"] in ("tanggal", "teks", "tautan"):
            fmt = "yyyy-mm-dd" if k["tipe"] == "tanggal" else "@"
            for r in range(3, BARIS_ISI + 3):
                ws.cell(row=r, column=j).number_format = fmt
    ws.row_dimensions[1].height = 62
    ws.freeze_panes = "C3"

    p = wb.create_sheet("Petunjuk")
    p.column_dimensions["A"].width = 120
    baris = [
        "Petunjuk pengisian data kejadian dan dampak bencana",
        "",
        "1. Satu baris di lembar Data untuk satu kejadian di kabupaten/kota Anda. Mulai mengisi dari baris 3.",
        "2. Jangan ubah baris 1 (label) dan baris 2 (kunci kolom). Peramban membaca baris 2 untuk mengenali kolom.",
        "3. Angka 0 berarti nihil: memang tidak ada. Kolom kosong berarti belum didata. Keduanya berbeda dan dihitung berbeda.",
        "4. Bagian yang tidak ada sama sekali (misalnya tidak ada kerusakan prasarana) diisi ya pada kolom bertanda 'isi ya bila tidak ada', dan kolom lain di bagian itu dikosongkan.",
        "5. Tanggal ditulis tttt-bb-hh (2026-11-04) atau hh/bb/tttt. Jam ditulis jj:mm WIB (14:30).",
        "6. Kolom jenis bencana dan status darurat punya daftar pilihan; pilih dari daftar.",
        "7. Kolom kecamatan dan desa ditulis dengan nama, bukan kode.",
        "8. Jangan menulis nama korban, NIK, atau nomor telepon di kolom teks.",
        "9. Setelah selesai, buka Meja Kerja, pilih Data kejadian dan dampak, tekan Impor dari Excel. Baris yang sama dengan yang sudah ada tidak masuk dua kali.",
        "10. Data yang masuk berstatus dilaporkan. Lengkapi butir yang masih kurang lalu tekan Ajukan verifikasi.",
        "",
        "Pilihan jenis bencana: " + ", ".join(next(k for k in kolom if k["nama"] == "jenis")["nilai"]),
        "Pilihan status darurat: " + ", ".join(next(k for k in kolom if k["nama"] == "status_darurat")["nilai"]),
    ]
    for i, t in enumerate(baris, start=1):
        c = p.cell(row=i, column=1, value=t)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        if i == 1:
            c.font = Font(bold=True, size=14)
    KELUAR.parent.mkdir(parents=True, exist_ok=True)
    wb.save(KELUAR)
    return kolom


if __name__ == "__main__":
    meja = ambil_spek()
    kolom = bangun(meja)
    # self-check: baca ulang dan pastikan baris kunci sama persis dengan spek
    from openpyxl import load_workbook
    ws = load_workbook(KELUAR)["Data"]
    kunci = [c.value for c in ws[2]]
    assert kunci == [k["nama"] for k in kolom], "baris kunci templat beda dari spek"
    assert len(set(kunci)) == len(kunci), "kunci kolom kembar"
    assert all(c.value for c in ws[1]), "ada label kosong"
    assert ws.max_row >= 2 and all(c.value is None for c in ws[3][:5]), "lembar Data harus kosong mulai baris 3"
    print("templat ok: %d kolom -> %s" % (len(kolom), KELUAR.relative_to(AKAR)))
    sys.exit(0)
