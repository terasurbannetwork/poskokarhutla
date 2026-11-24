# PRD: Prakiraan lawan Kejadian di Dalops

## Masalah
Prakiraan tiga hari ada di `/prediksi`, kejadian nyata ada di `/bnpb/dalops` dan `/lapor/meja`. Staf tidak bisa melihat di satu layar kab mana yang sudah diprakirakan dan benar terjadi, kab mana yang terjadi tanpa diprakirakan, dan banjir punya dua mesin prakiraan.

## Pengguna
Staf Pusdalops, Koordalops, dan pimpinan yang sudah memakai `/bnpb/dalops`.

## Fitur
- F-1 Satu sumber prakiraan: Dalops membaca `prediksi.json` untuk banjir dan longsor (pengganti `status.json`).
- F-2 Prakiraan menyala untuk jenis cuaca ekstrem (angin), gelombang pasang (gelombang dan rob), kualitas udara (asap), karhutla (titik panas).
- F-3 Seksi "Prakiraan dan kejadian" per jenis: pilihan tanggal (hari ini sampai 7 hari lalu), empat ubin angka (Kena, Luput, Belum ada laporan, Tenang), tabel kab yang Kena dan Luput.
- F-4 Peta: warna kab menurut prakiraan tanggal terpilih, titik kejadian Dalops, titik laporan Lapor Bencana (warga dan BPBD dibedakan), legenda di dalam peta.
- F-5 Pop-up kab: level prakiraan, kejadian yang cocok (nomor kejadian, tanggal mulai), laporan yang cocok (nomor tiket, status periksa).
- F-6 Rapor `/prediksi`: skor kedua dengan label logbook Pusdalops untuk banjir, longsor, angin, gelombang, terpisah dari skor DIBI.

## Larangan
- Tanpa kata "aman" dan tanpa "salah alarm".
- Tanpa skor gabungan lintas bencana atau lintas label.
- Tanpa data laporan di `public/` dan di `/prediksi`.
- Tanpa membuat atau menutup kejadian dari laporan warga.
- Tanpa kalimat kesimpulan di kepala kartu; kepala = nama seksi berikon.
- Tanpa tombol pindah sisi panel (K6).
