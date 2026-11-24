# Paparan Karhutla Provinsi Papua Selatan 171126

Jendela Senin 9 Nov s.d. Senin 16 Nov 2026, cut-off 16 Nov 24.00 WIB (arahan pemilik 17 Nov). Enam slide, tanpa sampul dan tanpa peta 3D:
provinsi, Kab. Merauke, koridor Naukenjerai–Sota (perbatasan PNG), hasil pemadaman (baru), banjir dan longsor 16–19 Nov.

Disalin dari `../papsel-2026-10-29` dan dipindah ke templat Jatim 231026 (`ref/j.pptx`, salinan `../../paparan-jambi-2026-10-25/ref/j.pptx`).
Perbedaan dengan 29 Okt:

- Semua angka dari data sistem (situs, ditarik 17 Nov 13.47 WIB). Tidak ada bahan lapangan Papua Selatan 9–16 Nov: Laphar Koordalops
  10–17 Nov tidak menyebut Merauke dan WA Satgas hanya enam provinsi prioritas, jadi OMC, Tanggap Darurat, unsur, dan jarak pandang dibuang.
- `hotspot.json` utuh mulai 11 Nov (10 Nov terpotong), jadi angka kecamatan 11–16 Nov.
- Koridor fokus Naukenjerai–Sota: 124 dari 275 ha belum padam provinsi 16 Nov. Pulau Kimaam (Kontuar + Kimaam, 133 ha) tampil di slide Merauke.
- Slide hasil pemadaman: padam dan belum padam harian (`peta_karhutla.json`), kecamatan belum padam (`peta_karhutla_wil.json`), cluster aktif
  per hari (`kluster_hari/2026-11-09..16`).
- Cuaca: WA BMKG harian 10–17 Nov (Siaga hujan lebat Papua Selatan 13–15 Nov, hujan sedang 16–17 Nov).
- Revisi 2 (17 Nov sore): slide 5 Penanganan dari berita BNPB (`penanganan.py`): OMC 22 Okt–9 Nov, kunjungan Kepala BNPB 30–31 Okt,
  status tanggap darurat, 2 unit patroli/OMC di laporan Satgas 9–12 Nov, tanpa armada 13–16 Nov; dua foto BNPB 31 Okt di `foto/` (tidak di-commit).
  Laporan harian BNPB 9–17 Nov tidak memuat karhutla Papua Selatan.
- Revisi 4: tab indikator dan kaki halaman baru (gaya deck.py) lewat `bingkai_baru.py`; catatan kaki lama pindah ke pita Sumber.
- Revisi 5: peta slide 1 baru (label menempel ke titik, `perbaikan.py`), slide 3 dua titik api, slide 4 Pulau Kimaam (generator yang sama dengan
  `KAWASAN=kimaam`, lihat `kawasan.py`), slide 5 Naukenjerai–Sota, peta indeks di tiap peta (`indeks.py`), slide musim hujan dihapus.
- Revisi 6: peta slide 1 kembali ke gaya asli (kab abu, cluster per tingkat, pil label, legenda), dipotong di utara supaya mengisi kotak; pil di dekat penanda.
- Revisi 7: slide 1 peta rata kanan, indeks Indonesia kiri atas, kartu label dua baris (kawasan, belum padam), skala 100 km; indeks peta mini Naukenjerai–Sota slide 3 di kiri bawah.
- Revisi 8: peta slide 1 memuat titik panas per tanggal (merah 15–16 Nov, abu 11–14 Nov), Merauke merah muda, legenda tanggal menggantikan legenda cluster.
- Revisi 9: tab Kecamatan Siaga dua slide (Pulau Kimaam `KAWASAN=pulau`, Naukenjerai–Sota); slide 2 peta kecamatan Kab. Merauke di kiri Tren Harian; panel Kecamatan Siaga slide 1 ditata ulang; kartu water bombing dihapus.
- Revisi 10: panel Kecamatan Siaga slide 1 kembali berikon (api, pohon, peringatan).
- Revisi 11: slide 2 bar komposisi semua ruas bulat; slide 1 blok "Merauke 100%" diganti grafik belum padam harian provinsi.
- Revisi 12: slide Kecamatan Siaga tanpa blok alur api (grafik diregangkan); blok cluster diganti bar susun berpenjelasan Siaga/Patroli/Rutin.
- Revisi 13: kepala Tren Harian slide 2 berjarak baku; slide 1 grafik luas terbakar per bulan 2026 (ganti belum padam harian yang dobel dengan slide 2).
- Revisi 14: slide 2 panel Kronologi dan cluster Kab. Merauke di kanan; Titik per Kecamatan dan Situasi lapangan dipersempit dan digambar ulang; label cluster api besar/sedang/kecil.
- Revisi 15: api kecil "prioritas rendah" (bukan "cukup dipantau").
- Logo KRIS di kiri logo BNPB tiap slide; pil cut-off turun ke baris subjudul. Lolos `aturan_slide.py`.

Bangun ulang (Windows, Python 3.14; peramban lewat `../../generator/pw.mjs`):

    for f in harian30 kluster_awal peta_karhutla peta_karhutla_kab peta_karhutla_wil hotspot; do curl -sf -o web/$f.json https://centurisk97.id/data/$f.json; done
    for d in 09 10 11 12 13 14 15 16; do curl -sf -o web/kluster_hari_2026-11-$d.json https://centurisk97.id/data/kluster_hari/2026-11-$d.json; done
    for f in status riwayat; do curl -sf -o web/banjir/$f.json https://centurisk97.id/banjir/data/$f.json; done
    python angka.py && python data.py && python peta.py && node render.mjs peta-papsel.svg peta-papsel.png peta-kawasan.svg peta-kawasan.png
    python buat.py ref/j.pptx keluar.pptx && python penanganan.py keluar.pptx keluar6.pptx
    KAWASAN=pulau python angka.py && KAWASAN=pulau python peta.py && node render.mjs peta-kawasan-pulau.svg peta-kawasan-pulau.png && KAWASAN=pulau python buat.py ref/j.pptx keluar-pulau.pptx
    python perbaikan.py keluar6.pptx keluar6b.pptx && python bingkai_baru.py keluar6b.pptx keluar7.pptx && python indeks.py keluar7.pptx keluar8.pptx && python ../../generator/pdf.py keluar8.pptx
    python ~/.claude/skills/ppt-konsultan/bnpb/scripts/aturan_slide.py keluar8.pptx
