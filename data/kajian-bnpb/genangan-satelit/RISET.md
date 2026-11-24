# RISET: Genangan satelit per kejadian

## 1. Pembanding: GeoAI Peduli `/banjir` (dilihat 24 Nov 2026 dari tangkapan layar pemilik)

| Bagian di halaman mereka | Isi | Sikap kita |
| --- | --- | --- |
| Ringkasan dampak | luas genangan 35 rb ha (349 km2), 38 dari 76 kab, penduduk di area genangan 86 rb (WorldPop), sawah tergenang 5.888 ha (WorldCover), saring per provinsi | Ditiru bentuknya; sumber genangan kita GFM (D1). Angka mereka untuk Sumatera 2025 jauh di bawah skala kejadian; kita tidak mengutipnya. |
| Genangan per kabupaten | batang per kab berwarna provinsi, klik untuk zoom | Ditiru: tabel per kab dengan cakupan. |
| Penduduk terdampak | batang per kab, satuan jiwa | Ditiru dengan nama jujur "penduduk di area genangan" dan rentang bawah sampai atas, bukan "terdampak". |
| Lahan yang tergenang | bilah tumpuk per kelas WorldCover: pertanian, hutan, badan air, rumput, lahan basah, permukiman, mangrove, semak | Ditiru (D5). |
| Lapisan: Genangan, Perubahan (komposit RGB), Radar VV, Optik | empat kartu lapisan, opasitas, tumpuk genangan | Genangan dan geser radar/optik ditiru (D10); komposit perubahan RGB tidak (satu gambar baru tanpa uji). |
| Geser Kering lawan Banjir | penggeser di peta | Ditiru dengan komponen geser yang sudah ada. |
| Optik warna asli lawan semu SWIR | dua pilihan | Ditiru (K1 butir 4). |
| Ambang deteksi | penggeser ambang dB | Tidak (K2). |
| Hitung di area tampilan | hitung ulang luas di peladen | Tidak (K2). |
| Metode singkat | Sentinel-1 kering Jul-Agu 2025 lawan banjir, turun >= 3,0 dB, dataran < 200 m, di luar air tetap; WorldPop 2020; WorldCover | Metode ambang tidak ditiru; kotak "metode singkat" ditiru di kartu Metode. |

## 2. Kode repo yang dipakai ulang

| Berkas | Yang dipakai | Catatan |
| --- | --- | --- |
| `scripts/banjir/genangan_nasional.py` | katalog STAC GFM, baca Range `ensemble_flood_extent`, `exclusion_mask`, `reference_water_mask`, Equi7 OC dan AS, titik sampel per kecamatan, `pilih_pra`, `lemah`, `cakupan` | Pemilik `banjir`. Belum ada di workflow mana pun; keluaran terakhir 27 Okt 2026 (34 pasangan ok). |
| `scripts/banjir/genangan/tiff_mini.py` | baca COG deflate, zstd, LZW (lewat `genangan_nasional.lzw`) | WorldCover v200: deflate, ubin 1024, uint8, 36.000 x 36.000 per ubin 3 derajat (header N03E096). |
| `scripts/siklus/paparan.py` | `hitung_kab` (bobot bangunan per kec dan desa), `rinci`, `tulis_saji` | Zona = fungsi `fn(lon, lat)`; cukup tambah pembuat zona dari sel, `hitung_kab` tidak berubah (DESAIN-TEKNIS 2). |
| `scripts/siklus/kaji_banjir.py` | `banjir_jam1`, `tulis`, `rencana`, `_kirim_cli` | Tambah `banjir_gfm`. |
| `scripts/banjir/citra_banjir.py` | Sentinel-1 RTC Planetary Computer, Sentinel-2 Earth Search, PNG <= 120 KB | Mode per kab kejadian. |
| `public/banjir/bukti.js` `geserCitra`, `public/banjir/bukti.css` `.bk-geser` | penggeser sebelum dan sesudah | Dipindah ke `public/inti/` supaya satu komponen. |
| `src/siklus_kaji.js` | `MODEL = ["gempa", "banjir_jam1"]`, batas R2 100 KB, `hasil_r2` satu kunci per kejadian | Tambah `banjir_gfm`, kunci per model, rute berkas. |
| `migrations/0122_sk_kaji.sql` | CHECK `model IN ('gempa','banjir_jam1')` | Perlu migrasi bangun ulang. |

## 3. Bukti yang sudah ada di repo

- Lab radar ambang sendiri di DKI gagal: 0 dari 3 kejadian lolos, CSI median 0 (`public/banjir/data/lab/genangan_radar_ringkas.md`). Dasar K2.
- GFM Demak 14 Mar 2024: tergenang baru 10.358 ha, cakupan 79,5 persen, bangunan 2.730 sampai 5.988 lawan 131.703 jiwa terdampak DIBI; bangunan dari GFM tidak layak tampil (`genangan_nasional.json`, `boleh_tampil.bangunan` false).
- Kejadian aktif Aceh Tenggara Okt 2026: cakupan 2,7 persen, mask 10.439 ha dari 10.729 ha diamati. Contoh "tidak teramati" yang wajib tidak menjadi 0.
- Katalog GFM: 142.545 item 2015 sampai 2026, 18.206 item pada 2025.

## 4. Sumber luar

| Sumber | Lisensi | Akses |
| --- | --- | --- |
| Copernicus EMS GFM | syarat CEMS, atribusi wajib (`genangan_nasional.ATRIBUSI`) | STAC `https://stac.eodc.eu/api/v1`, tanpa kunci |
| ESA WorldCover 10 m v200 2021 | CC BY 4.0 | `esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/`, tanpa kunci |
| Sentinel-1 RTC | Planetary Computer, token SAS anonim | pola `citra_banjir.py` |
| Sentinel-2 L2A | Copernicus, terbuka | Earth Search Element84 |
| WorldPop, Dukcapil, GHSL | sesuai F2 Siklus | sudah ada di paparan |

## 5. Yang belum diketahui (diukur di tiket, tidak ditebak)

- Ukuran baca Range GFM dan WorldCover untuk kejadian sebesar Sumatera 2025 (Q7, GS-03).
- Apakah GFM punya lintasan 0 sampai 12 hari untuk tiap kab Sumatera 26 Nov 2025 (GS-03 mencatat per kab).
- Cakupan teramati di kab perkotaan Sumatera (Medan, Banda Aceh): mask diduga besar.
