# KEPUTUSAN: Hidromet per jam (dari bedah 6 video bacalangit, 23 Nov 2026)

## Asal

Pemilik meminta bedah 6 video dan caption bacalangit.id (Ciwidey 14 Nov Part 1 dan 2, siklon 92B/96S dan pembaruannya 17 Nov,
Jakarta 377 mm, siklus hujan harian Jawa), lalu menjawab "Gas semua" atas 14 usulan (24 Nov 2026).

## Keputusan yang sudah diambil

| No | Keputusan | Alasan |
| --- | --- | --- |
| K1 | Arah utama: **pengamatan per jam dan faktor fisika baru**, bukan menambah faktor harian ke model kabupaten-hari | Lab: model banjir terbaik AP 0,042, FAR 0,95-0,97; bandang (81 kejadian uji) tidak ada model yang mengalahkan klimatologi (`lab-bencana/adu/banjir/LAPORAN.md`). Kejadian di video berskala jam: awan pertama di radar 10.53, rusak sekitar 14.30 |
| K2 | Lapisan PENGAMATAN (METAR embusan awan badai, pendinginan puncak awan Himawari, kronologi kejadian) boleh tayang sesudah uji integrasi, dengan label "pengamatan, bukan prakiraan" | Tidak meramal, jadi tidak tunduk pada aturan prospektif `PETA-JALAN-MODEL-BANJIR.md` §2. Tetap wajib menyebut sumber, waktu, dan keterbatasan |
| K3 | Semua FAKTOR untuk model (orografi 850 hPa, MJO, bibit siklon, persistensi banjir, fase musim, indeks angin kencang, jeda hulu) masuk lewat `PRAREG-*.md` bersidik sha256 SEBELUM data uji dibuka. Tidak ada klaim "lebih baik" sebelum vonis | Aturan main `docs/banjir/PETA-JALAN-MODEL-BANJIR.md` §2 (satu penggaris, arsip menyaring, prospektif memutus) |
| K4 | Berkas beku tidak disentuh: `status.py`, `model_kab.py`, `uji_balik.py`, PRAREG-DEBIT/PROSPEKTIF/DAMPAK, sidik genangan J4 | idem §2 butir 4. Faktor baru dihitung di berkas BARU dan dibaca model penantang |
| K5 | Jam rawan per kabupaten dihitung dari IMERG per jam yang sudah dipanen lab (R2 `arsip/lab_banjir/imerg/`), bukan panen baru | Data sudah ada; klimatologi deskriptif, bukan model |
| K6 | Angka dari video bacalangit TIDAK dipakai sebagai data latih atau bukti validasi. Kejadian 14-17 Nov dipakai sebagai studi kasus saja | Caption sendiri menyebut "analisis tim bacalangit, bukan rilis resmi BMKG"; angka 16,8 mm berasal dari satu penakar dengan periode tak jelas |
| K7 | Subagent tidak commit, tidak push, tidak deploy | Aturan repo |

## Jawaban pemilik (24 Nov 2026)

| No | Jawaban |
| --- | --- |
| Q1 | Uji akses radar dulu; panen sesudah laporan akses dibaca pemilik |
| Q2 | Indeks badai tetap internal (dihitung dan diarsip) sampai vonis prospektif |
| Q3 | Boleh membaca D1 produksi hanya-baca (SELECT), hasil disamarkan, tanpa data pelapor |
| Q4 | Zona musim dipanen dari situs BMKG; unduh sekali buku PMH 2026/27 (±84 MB) disetujui, PDF tidak masuk repo |
| Q5 | Bibit siklon: bila JTWC menolak akses otomatis, GDACS + TCWC saja; bibit ditulis null (sesi lain sudah memasang pengurai JTWC, commit a39cbdd16) |
| Q6 | Commit lokal dulu; push dan panen ulang IMERG diputuskan pemilik sesudah melihat |

## Pertanyaan untuk pemilik (asli, disimpan sebagai jejak)

| No | Pertanyaan | Menahan tiket |
| --- | --- | --- |
| Q1 | Radar BMKG: boleh menarik citra mosaik CMAX publik dari situs BMKG untuk dihitung per kecamatan? Perlu izin tertulis atau cukup halaman publik? | H30 |
| Q2 | Indeks badai (CAPE, geseran angin) selama ini sengaja tidak ditampilkan (`scripts/cuaca/cuaca.py`). Boleh tayang sebagai "bahan" berlabel uji, atau tetap internal sampai vonis prospektif? | H31 (tampilan saja; perhitungan tetap jalan) |
| Q3 | Audit waktu peringatan perlu membaca D1 produksi (`cuaca_nowcast`, `laporan`) dengan `wrangler d1 execute --remote` hanya-baca. Diizinkan? | H10 bagian D1 |
| Q4 | Data zona musim BMKG (poligon ZOM dan prakiraan awal/puncak musim 2026/27): ada berkas resmi yang dipegang BNPB, atau dipanen dari halaman BMKG? | H24 |
