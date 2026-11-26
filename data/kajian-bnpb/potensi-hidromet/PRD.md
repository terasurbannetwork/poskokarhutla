# PRD: mode Peringatan lengkap di Alun-alun

## Pengguna

Warga dan pemda (publik): status kab/kota, analisis, prakiraan per desa, ONI dan IOD. Staf BNPB (Pusdalops, Koordalops, pimpinan, admin): ditambah tabel per desa, CSV, rekomendasi per pihak.

## Fitur

| No | Fitur | Kriteria terima | Asal |
| --- | --- | --- | --- |
| F-1 | Baris ringkas jumlah kab per status | jumlah = hitungan `status.json`; belum terukur terpisah, tidak masuk Normal | D2 |
| F-2 | Kartu ONI dan IOD | nilai, bulan data, label status; abu "basi" bila melewati batas D5 | D5 |
| F-3 | Pil bahaya dengan jumlah Waspada ke atas, termasuk Banjir bandang | pil menyaring daftar dan warna peta | D2, D9 |
| F-4 | Daftar kab/kota urut prioritas, turun provinsi lalu kab | urutan ALGORITMA 2 | D3 |
| F-5 | Kartu rincian kab | status per bahaya per hari, pemicu, BMKG desa, debit, paparan kab | D3 |
| F-6 | Sub-tab Peringatan BMKG | daftar CAP aktif dari `/api/cuaca/nowcast`, tautan ke dokumen CAP | D2 |
| F-7 | Sub-tab Analisis | enam blok D4 dari `analisis.json` | D4 |
| F-8 | Prakiraan BMKG per desa | 3 hari per desa saat kab dipilih; galat ditulis jelas, tidak kosong diam | D10 |
| F-9 | Debit GloFAS per kab | puncak 3 hari dan rasio Q2, pil hipotesis | D6 |
| F-10 | Status banjir bandang BDG | ada di `status.json`, pil hipotesis | D9, D12 |
| F-11 | Kelas bahaya per desa dan tabel desa bahaya tinggi terbanyak | belum terukur bila sampel kurang dari Q1 | D7 |
| F-12 | Peta status per kab, pilihan hari, menu lapisan, legenda | D13 sampai D15 | D13 |
| F-13 | Rekomendasi per pihak (staf) | tiap butir berujukan; publik menerima 401 atau 403 | D11, K1 |
| F-14 | Hari tanpa hujan segar | dijadwalkan harian | D16 |
| F-15 | Halaman `/docs` definisi dan sumber | memuat semua sumber layar ini | D15 |

## Larangan

- Tidak ada rekomendasi per pihak di respons publik, HTML publik, atau `public/`.
- Debit dan nowcast bandang tidak menaikkan status.
- Tidak ada angka InaRISKPOP atau angka pengisi InaRISK.
- Tidak ada "aman", huruf kapital semua, "·", atau 0 untuk kosong.
- Mode Kejadian tidak berubah.

## Di luar cakupan

Prediksi hujan bulanan BMKG (Q4), animasi angin, umpan Lapor Kejadian InaRISK, status gempa dan gunung api.
