# PRD: Potensi Bencana Hidromet `/potensi`

## Pengguna

Warga, pemda, dan media (publik): status kab/kota per bahaya per hari, analisis, lapisan, ringkasan, sumber, prakiraan BMKG per desa, iklim. Staf BNPB (Pusdalops, Koordalops, pimpinan, admin): ditambah tabel per desa terpapar, fasilitas bernama, CSV, dan tab Rekomendasi.

## Fitur

| No | Fitur | Kriteria terima | Asal |
| --- | --- | --- | --- |
| F-1 | Cangkang halaman: pil tab, satu peta bersama, panel lipat, lembar bawah HP, slot bawah | ganti tab peta tidak memuat ulang peta; panel bisa dilipat; di 375 px lembar bawah bisa ditarik | D1 |
| F-2 | Tab Status: warna kab, angka ringkas, pil bahaya, daftar prioritas, garis waktu hari | angka = hitungan `status.json`; belum terukur terpisah | D3 |
| F-3 | Kartu fakta kab | status per bahaya per hari, pemicu, BMKG desa, debit, paparan kab, kelas desa | D3 |
| F-4 | Tab Dampak | poligon CAP aktif, keterpaparan per peringatan; staf: per desa dan CSV | D4 |
| F-5 | Tab Iklim | ONI, IOD dengan umur; hari tanpa hujan; debit kab berpil hipotesis | D5, D6, D19 |
| F-6 | Status banjir bandang BDG | ada di `status.json`, berpil hipotesis | D9, D12 |
| F-7 | Kelas bahaya desa dan kab dari berkas BNPB | 83 ribu desa; kosong = belum terukur | D7, D8 |
| F-8 | Prakiraan BMKG per desa | 3 hari per desa saat kab dipilih; galat ditulis jelas | D10 |
| F-9 | Tab Analisis | enam blok dari `analisis.json` | D13 |
| F-10 | Tab Lapisan | enam lapis, jejak, tabel per lapis | D14 |
| F-11 | Tab Ringkasan | bab bernomor dari templat, chip fakta | D15, D16 |
| F-12 | Tab Sumber | arti chip, tanggal data, metode, atribusi | D17 |
| F-13 | Tab Rekomendasi (staf) | tidak ada tab, rute, atau teks rekomendasi bagi publik | D11, K1 |
| F-14 | Tautan dari Alun-alun mode Peringatan | satu tautan | D18 |
| F-15 | Entri registri peta situs | `/potensi` di `src/peta_situs.js` | peta-situs |

## Larangan

- Tidak ada rekomendasi per pihak di respons publik, HTML publik, atau `public/`.
- Debit dan nowcast bandang tidak menaikkan status.
- Tidak ada angka penduduk InaRISKPOP, status satu titik, atau angka pengisi InaRISK.
- Tidak ada kotak tanya atau obrolan.
- Tidak ada "aman", huruf kapital semua, "·", atau 0 untuk kosong.

## Di luar cakupan

Prediksi hujan bulanan BMKG (Q4), animasi angin, umpan laporan InaRISK, notifikasi WA, unggah data petugas, status gempa dan gunung api, versi bahasa Inggris.
