# Bisnis karbon berbasis satelit: kajian dan rencana

Disusun 22 Okt 2026 dari 43 dokumen folder Carbon Trading pemilik, verifikasi regulasi 2025–2026, dan uji coba
data satelit langsung. Angka hasil penyaringan konsesi ada di §5 (diisi dari `data/raw/karbon/saring.json`).

## 1. Jawaban singkat

Bisa, tetapi posisinya harus tepat. Satelit kuat untuk **menemukan, menyaring, dan memantau**; satelit tidak
bisa **mensertifikasi**. Uang terbesar di rantai nilai karbon ada di pengembang proyek (USD 750–2.500 juta/th
pada 2030 untuk Indonesia) dan trading (USD 500–1.700 juta), bukan di jasa validasi/verifikasi (USD 20–55 juta)
(McKinsey untuk Pertamina, 2022). Sistem satelit adalah pintu masuk ke dua kolam besar itu: ia memotong biaya dan
waktu tahap paling mahal (3 tahun pertama sebelum kredit terbit) dan memberi pembeli angka yang bisa mereka uji.

## 2. Apa yang berubah sejak paket Wanatara (Mei 2026)

| Hal | Paket lama | Keadaan 22 Okt 2026 |
| --- | --- | --- |
| Dasar hukum NEK | Perpres 98/2021 | **Perpres 110/2025** (mencabut 98/2021); registri **SRUK** sejak 9 Jul 2026 |
| Aturan sektor hutan | Permen LHK 7/2023, "KLHK" | **Permenhut 6/2026**; Kemenhut terpisah dari KLH |
| Metodologi | VM0007 / VM0048 "compliant" | VM0048 + VMD0055: data aktivitas Indonesia **belum terbit** dari Verra; **gambut > 2% tidak memenuhi syarat** |
| Buffer | 15% contoh | **minimal 12%** (NPRT v4.2), tipikal REDD+ 15–25% |
| Harga | blended USD 16 → 35,8/t | REDD+ BBB+ ±USD 7,75 (Q3 2026); rata-rata global ±USD 3,5; IDXCarbon ±Rp40.000 |
| Baseline konsesi | 12–15 tCO2e/ha/th (pre-FS 2022) | **satelit: jauh lebih rendah** untuk konsesi tebang (lihat §5) |

Rumus model keuangan paket lama tidak cocok dengan narasinya (rumus menghasilkan pendapatan tahun ke-5 USD 194,6 juta,
narasi USD 73 juta), harga campuran memasukkan pembeli removal (Frontier) yang tidak membeli REDD+, dan struktur
saham nominee berisiko batal demi hukum (UU 25/2007 Pasal 33). Catatan lengkap: `docs/karbon/bahan/C-wanatara.md`.

## 3. Temuan inti dari satelit

1. **Konsesi HPH sebagian besar kehilangan tutupannya karena tebang, bukan deforestasi.** Uji coba PT Inhutani I
   Pangean: 96% kehilangan 2001–2025 berpendorong "tebang/kehutanan" (WRI/Google 2025). Deforestasi tak terencana
   yang bisa dicegah hampir nol. Artinya kredit REDD+ (mencegah deforestasi tak terencana) dari konsesi seperti
   ini kecil, dan angka pre-FS 2022 (755.785 tCO2e/th untuk Pangean) tidak didukung data teramati.
2. **Nilai karbon konsesi tebang ada di IFM** ("logged to protected forest"): menghentikan tebang terencana.
   Baseline-nya rencana tebang (RKU/RKT), yang harus diminta dari pemegang izin; satelit memverifikasi tebang
   benar-benar berhenti. Sistem menampilkan "tebang teramati" per konsesi sebagai indikasi besarnya.
3. **Gambut keluar dari jalur Verra saat ini** (VMD0055). Untuk gambut, jalurnya SPE-GRK nasional (Permenhut 6/2026
   + SRUK) dengan faktor FRL Indonesia 2022 (dekomposisi gambut 32–73 tCO2/ha/th tergantung tutupan). Sistem sudah
   menghitung penaksir FRL berdampingan dengan GFW.
4. **Risiko api adalah risiko bisnis utama** (pembalikan, buffer). Platform pantau karhutla yang sudah ada adalah
   keunggulan nyata: deteksi titik api 3 jam, Himawari 10 menit, riwayat api per poligon.

## 4. Model bisnis yang disarankan (bertahap)

**Tahap 1, bulan 0–6: jasa data (modal kecil, kas cepat).**
- *Pra-studi kelayakan satelit* per konsesi untuk pemegang PBPH yang ingin masuk PB-PJL karbon (Permenhut 6/2026):
  luas hutan, laju hilang per pendorong, emisi, stok, gambut, api, dua penaksir, NPV. Hari ini dikerjakan
  konsultan dengan "hitung cepat" yang didiskon 60%.
- *Pemantauan berlangganan* untuk proyek yang sudah berjalan (empat proyek hutan SRUK, proyek REDD+ lama):
  peringatan deforestasi harian + titik api, laporan pemantauan per periode.
- Pembeli: pemegang izin, pengembang, pembeli kredit yang melakukan due diligence, pemda (lihat §6).

**Tahap 2, bulan 6–24: co-development.** Dengan pemegang izin yang lolos saringan (ancaman nyata, bukan tebang
saja; atau IFM dengan RKU), bagi hasil. Modal studi + validasi ±USD 600.000 per proyek; kredit pertama ±3 tahun.

**Tahap 3: origination/trading** ke Pertamina (butuh offset, PNRE sebagai agregator), pembeli JCM/GX-ETS Jepang
(offset ≤10%, hanya J-Credit/JCM), dan pembeli sukarela berkualitas (CCP).

## 5. Hasil penyaringan konsesi

_(diisi setelah penyaringan massal selesai)_

## 6. Pemda dan pemerintah

Dokumen Panduan Pembangunan Daerah Prabowo-Gibran tidak menyebut NEK, gambut, atau karhutla. Pintu masuknya PAD
dan data: inventaris lahan terdegradasi, data tutupan untuk PBB-P3, dasbor iklim/hutan di SPBE, peringatan dini
kebakaran sebagai ketahanan pangan. Catatan: `docs/karbon/bahan/D-kebijakan-daerah.md`.

## 7. Data yang perlu diminta dari Kemenhut

1. Poligon PBPH (HA, HT, RE, PB-PJL karbon) dengan nomor SK, tanggal, luas, pemegang — sumber resmi menggantikan
   data 2014 yang dipakai sekarang. Format apa pun (SHP/GeoJSON/KML/GDB) masuk lewat `scripts/karbon/impor.py`.
2. RKU/RKT pemegang izin incaran (baseline IFM).
3. Penutupan lahan 1990–2023 (geoportal publik hanya PL2024–2025).
4. Kawasan hutan terbaru (layanan publik hanya peta, tanpa kueri), PIAPS, hutan adat, PIPPIB.
5. Daftar proyek karbon terdaftar SRUK dan persetujuan unit non-SPE.

## 8. Risiko utama

| Risiko | Mitigasi di sistem |
| --- | --- |
| Baseline terlalu tinggi (additionality) | Hanya deforestasi tak terencana; uji balik; masa baseline 7 tahun |
| Pembalikan karena api | Pemantauan harian, buffer dari riwayat api, laporan kejadian |
| Aturan berubah | Kerangka aturan dicatat per tanggal di RANCANGAN §0.1 |
| Harga jatuh | Harga impas per konsesi; sensitivitas harga × volume |
| Klaim berlebihan ke pembeli | Label "estimasi satelit, belum diverifikasi" di layar dan laporan |

## 9. Langkah 30 hari

1. Pemilik mengirim data konsesi Kemenhut → impor → penyaringan ulang dengan poligon resmi.
2. Daftar kunci GFW atas nama perusahaan (gratis).
3. Pilih 3 konsesi dari hasil saringan; minta RKU/RKT dan data plot (bila ada).
4. Uji lapangan kecil: 20 titik peringatan deforestasi dicek tim (akurasi peringatan untuk laporan).
5. Satu klien pemantauan berbayar (proyek yang sudah berjalan) sebagai bukti produk.
