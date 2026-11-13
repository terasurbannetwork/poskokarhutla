# Laporan Kejadian Bencana Harian 101126

- `jalan.py` = turunan `harian-2026-11-09/jalan_rev4.py`, kini 5 slide: ringkasan, status siaga, hidrometeorologi, geologi dan vulkanologi, prediksi (`generator/harian_lanjut.py`).
- Sumber: WA Koordalops 9 Nov 07.00 s.d. 10 Nov 07.00 WIB (20 laporan, 15 menonjol), BMKG dan PVMBG 10 Nov 06.00 WIB, laphar PDF 9 Nov (`bahan-laphar.json`, gempa NTT).
- Slide 1 tetap hanya kejadian baru tanpa karhutla (4 kejadian). Karhutla di slide 3 hanya data sistem.
- `dalops_banjir.py --unggah` gagal di Windows (`npx` tidak ditemukan subprocess): Pantau Banjir belum terbarui dari laporan ini.
- Jalankan: `PYTHONUTF8=1 DECK_BNPB="~/.claude/skills/ppt-konsultan/bnpb" /c/Python314/python data/laporan-bnpb/harian/2026-11/2026-11-10/jalan.py`
- Alt 2 (tanpa karhutla di semua slide, `Revisi 2`): jalankan perintah di atas dengan `ALT=2`. Panel karhutla slide 3 diganti infrastruktur terdampak (Kerugian Materiil laphar), panel FWI slide 5 diganti status 3 hari lokasi terdampak.
- Alt 2 rev 2 (`Revisi 3`): `ALT=2 ALT_REV=2`, tabel slide 1 tanpa kolom Kondisi.
- Alt 2 rev 3 (`Revisi 4`): `ALT=2 ALT_REV=3`, slide 1 tanpa "menonjol" dan tanpa kelompok, slide 5 banyak ancaman (`generator/harian_prediksi.py`).
- Versi awal (`Revisi 5`): `VERSI_AWAL=1` tanpa `ALT`, 2 slide dengan desain laporan 9 Nov (`desain_kemarin.py`), data 10 Nov.
- Revisi 5 alt 2 (`Revisi 6`): `VERSI_AWAL=1 ALT=2`, judul slide 1 tanpa "4 kejadian menonjol di 3 provinsi", tabel tanpa Kondisi dengan ikon bencana dan Status Siaga di bawahnya, kartu jadi tiga, peta dengan segitiga gunung Siaga dan legenda tengah.
- Revisi 7: seperti Revisi 6, kartu selebar peta, panel Informasi Bencana dan Status Siaga naik sejajar atas kartu.
- Revisi 8: seperti Revisi 7, pita bawah tiga blok berjudul Perlu ditindaklanjuti, ikon tabel dalam bulatan warna legenda.
- Revisi 9: seperti Revisi 8, Keselamatan warga dan Peringatan dini BMKG jadi satu blok Peringatan dini.
- Revisi 10: seperti Revisi 9, peringatan dini di peta (lingkaran putih bertanda seru), blok Peringatan dini per baris, pita bawah dua kartu, kolom Dampak rata tengah.
- Revisi 11: seperti Revisi 10, label peringatan dini memuat nama daerah, penanda peta berisi ikon bahaya dengan lencana tanda seru.
- Revisi 12: seperti Revisi 11, label peta hanya nama daerah, satu entri legenda peringatan dini, ikon dan lencana solid.
- Revisi 13: seperti Revisi 12, ikon blok Peringatan dini sama dengan penanda peta.
- Revisi 14: seperti Revisi 13, ikon blok Peringatan dini solid tanpa lingkaran dan tanda seru.
