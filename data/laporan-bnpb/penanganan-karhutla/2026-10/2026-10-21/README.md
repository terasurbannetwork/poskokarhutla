# Deck BNPB 21 Okt 2026, slide 1–2 dari data satelit sendiri

Deck "Laporan Penanganan Pengendalian Karhutla 211026" (cut-off 21 Okt 2026 07.00 WIB).
Slide 1–2 diisi ulang dengan hitungan kita atas permintaan pemilik. Slide 3 (operasi) tetap
angka BNPB. Data mentah: NASA FIRMS NRT 15–21 Okt (UTC), diunduh 21 Okt siang WIB.

## Isi folder

| Berkas | Isi |
| --- | --- |
| `sumber-asli-BNPB-211026.pptx` | deck asli dari BNPB (templat) |
| `Laporan ... data satelit.pptx/.pdf` | deck hasil, versi final |
| `firms-raw-15-21okt.tar.gz` | CSV FIRMS per sumber per tanggal UTC (VIIRS S-NPP, NOAA-20, NOAA-21, MODIS) |
| `hitung3.py` | menghitung angka per provinsi → `angka.json` |
| `ganti.py` | menulis angka ke slide 1–2 (teks, batang, panah, jumlah, subjudul) |
| `cek_tampil.py` | memeriksa angka di PPTX cocok dengan `angka.json` |
| `verifikasi/` | dua putaran verifikasi independen (hasil JSON + skrip pemeriksa) |

## Metode (versi final)

- **Provinsi**: `scripts/data/wilayah.py` (poligon kecamatan BIG milik platform).
- **Hari**: hari kalender WIB; deteksi pada atau sesudah 21 Okt 07.00 WIB dibuang.
- **Hotspot**: titik MODIS + VIIRS S-NPP + NOAA-20, semua tingkat keyakinan. Ini standar
  platform dan setara SiPongi. Papua Selatan 2.619 / 2.632 / 2.766, sedangkan GIS BNPB
  2.618 / 2.632 / 2.766.
- **Luas terbakar**: titik NOAA-20 + NOAA-21 (keyakinan sedang/tinggi) × porsi × 4,3 ha.
  - Porsi 0,534 = median nasional (titik S-NPP n/h ÷ titik NOAA-20+21 n/h) 16–19 Okt.
  - S-NPP tidak dipakai langsung karena lintasan siangnya 20 Okt (barat 131° BT) hilang di FIRMS.
- **Belum padam**: luas × porsi titik NOAA-20/21 yang lokasinya (3×3 sel, sekitar 375 m)
  sudah terdeteksi 12–36 jam sebelumnya. Ini definisi "bertahan ≥1 hari".
- **Telah padam (subjudul slide 1)**: luas api 18 Okt × porsi titik 18 Okt yang lokasinya
  tidak terdeteksi lagi sepanjang 19–20 Okt. Ini aturan pemilik: 48 jam tanpa titik = padam.
- **Fire spot**: jumlah kluster sel NOAA-20/21 yang bertahan. Sel yang berjarak ≤4 sel
  (sekitar 1,5 km) digabung jadi satu kluster.
- **Tampilan**: angka dibulatkan sekali (setengah ke atas). Panah persen dihitung dari angka
  yang tampil. Baris jumlah = jumlah angka baris yang tampil.

## Catatan untuk paparan

- Hotspot 20 Okt terlalu rendah sekitar 36–62% di Kalimantan, Sumatra, dan Sulawesi,
  karena lintasan siang S-NPP hilang. Celah yang sama ada di GIS BNPB. Angka hotspot
  sengaja tidak dikoreksi.
- Angka harian per provinsi adalah perkiraan, ketidakpastiannya sekitar ±15–40%.
- Aturan padam 48 jam berbeda dengan platform. `scripts/data/harian.py` memakai 72 jam,
  dan 168 jam untuk gambut kering.
- Fungsi `isi_celah()` di `scripts/data/laporan.py` hanya menangkap celah S-NPP nasional
  (ambang 15%). Celah regional seperti 20 Okt lolos, jadi laporan harian platform ikut
  terlalu rendah.

## Yang dibuktikan paritas dan yang tidak

`python3 scripts/data/peta_karhutla.py --uji` (tanpa jaringan; butuh `firms-raw-15-21okt.tar.gz` dan `angka_nasional.json` di folder
ini, jadi keduanya harus ikut di-commit) membuktikan bahwa `scripts/data/peta_karhutla.py` menghitung **angka yang sama persis**
dengan `hitung_nasional.py` untuk 18–20 Okt (38 provinsi × 4 metrik) dan bahwa konstanta `PORSI` = median 16–19 Okt. Itu **paritas
implementasi**, bukan validasi metode: kedua skrip memakai definisi yang sama, jadi uji ini tidak menilai apakah 4,3 ha per titik,
porsi, atau aturan 48 jam benar di lapangan. Kesesuaian hotspot dengan GIS BNPB baru terbukti untuk Papua Selatan.

Fikstur hanya memuat hari UTC 15–21 Okt. Hari WIB 15 Okt butuh hari UTC 14 Okt (17.00–24.00 UTC = 00.00–07.00 WIB, termasuk lintasan
malam NOAA-20/21), yang tidak ada di sini. Karena itu luas 15 Okt dari fikstur saja 13.756 ha (tarikan lengkap: 38.227 ha) dan `padam`
17 Okt (luas 15 Okt × bagian titik yang padam) ≈ 7.760 ha, sedangkan `public/data/peta_karhutla.json` memuat 17.763 ha. Selisih itu
artefak fikstur (diukur 21 Okt 2026), bukan galat berkas terbit; deck hanya melaporkan 18–20 Okt, yang hari UTC-nya lengkap.

## Mengulang

```bash
mkdir -p /tmp/deck211026 && tar -xzf firms-raw-15-21okt.tar.gz -C /tmp/deck211026
```

Langkah berikutnya:

1. Jalankan `hitung3.py` dari `/tmp/deck211026`. Skrip ini membaca `raw/*.csv` relatif
   terhadap folder kerja.
2. `ganti.py <folder> <keluaran.pptx>` mengharapkan `<folder>/angka.json`,
   `<folder>/deck/src.pptx`, dan isi unzip-nya di `<folder>/deck/x/`. Isi `src.pptx`
   sama dengan `sumber-asli-BNPB-211026.pptx`.
