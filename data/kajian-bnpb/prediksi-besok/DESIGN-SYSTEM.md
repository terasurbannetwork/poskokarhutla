# DESIGN-SYSTEM

Tiru `/bnpb/dalops`, model A dashboard (panel seksi kiri, kepala halaman navy L1). Token dari `public/inti/tema.css`; tanpa literal warna baru di `public/prediksi/*.css` (gerbang `gerbang-token-warna`).

## Susunan tab Besok
1. Bilah kendali: cari, dropdown provinsi (`PilihCantik`), segmen hari (selebar baris), segmen Tabel/Peta.
2. Pil bencana selebar layar, terbagi rata, berikon, berangka.
3. Kartu `.ex.ex-std` "Perlu tindakan": kepala = nama seksi berikon, tanpa kalimat temuan. Isi: baris `<details>` per aturan.
4. Kartu `.ex.ex-std` "Prediksi per kab/kota" berisi tabel `.ex-tabel` menempel penuh, kepala navy. Kepala kolom: nama + pil kecil "teruji" (hijau) atau "belum teruji" (abu), rincian n di `title`.
5. Tampilan Peta: kartu "Peta prediksi", peta di dalamnya, pil level dan legenda di dalam peta (pola `dl-peta-alat`, `dl-legenda-peta`).

## Sel
Sel berwarna latar lembut dengan teks gelap: level 0 tanpa warna (abu teks), 1 kuning, 2 oranye, 3 merah, memakai token status yang ada. Angka utama tebal, satuan kecil. Kosong = "–".

## Pop-up
Satu kartu dialog per kab: kepala nama kab dan provinsi, baris per bencana (label pil + isi), bagian dampak bila ada aturan terpicu, kaki tanggal terbit per sumber di `title`.

## Larangan
Kartu tidak menempel (jarak 20px); tanpa huruf kapital semua; tanpa "·" pemisah; ikon tanpa garis luar.
