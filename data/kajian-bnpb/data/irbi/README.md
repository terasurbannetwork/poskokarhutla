# Paket `irbi`: Indeks Risiko Bencana Indonesia (IRBI) BNPB per kab/kota 2015–2025

Bahan untuk Bab 5 Kajian Mitigasi (profil risiko nasional, per pulau, provinsi, kab/kota) dan Bab 5–6 Kajian Air Jawa
(IRBI banjir, longsor, kekeringan, abrasi untuk 119 kab/kota Jawa).

**Membangun ulang:** `python3 data/kajian-bnpb/bangun/irbi.py` (Python 3 stdlib, kurang dari 1 detik). Skrip menulis semua berkas di
folder ini lalu menjalankan self-check `assert`; keluar non-nol bila satu invarian rusak. Keluaran terakhir: "self-check hijau".

Sumber yang dikutip di naskah: **"Sumber: InaRISK BNPB"** (lisensi InaRISK tidak tertulis; bukan klaim data terbuka).

## 1. Masukan dan tanggal tarik

| Masukan | Isi | Tanggal tarik | Label |
| --- | --- | --- | --- |
| `data/raw/inarisk/irbi.ndjson` (tidak dilacak git) | Dump `https://inarisk.bnpb.go.id/apiv4/data-irbi-full`: 5.654 baris = 514 kab/kota × 2015–2025, kolom 9 bahaya + `total, fix_values, ori_value, status, pembanding, pembanding_label` | 18 Okt 2026 | resmi |
| `data/kajian-bnpb/riset/mentah/irbi.ndjson` | Salinan riset A | 23 Okt 2026 | resmi |
| `scripts/udara/kota.json` | Kode Kemendagri 4 digit (Kepmendagri 300.2.2-2138/2025, via cahyadsn/wilayah) ↔ nama peta | – | resmi |
| `public/geo/kabupaten/*.json` | Nama kab/kota (properti `kab`), dipakai di kolom `nama` | – | resmi |
| `public/banjir/data/meta.json` kunci `provinsi` | Nama 38 provinsi | – | resmi |
| `public/data/penduduk.json` kunci `kec` | WorldPop Global2 R2025A, penduduk 2026 per kecamatan (CC BY 4.0); dijumlah ke kab | – | terverifikasi |
| `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` | RENSTRA BNPB 2025–2029: Tabel 1.1 (indeks dan kelas provinsi 2019–2023, hlm. 6–8), Tabel 1.6 (IRB nasional 2020–2024, hlm. 52) | korpus JDIH lokal | resmi |
| `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` | RENAS PB 2025–2029 hlm. 18–19 (IRB 2023, 13 provinsi Tinggi, 168 kab Tinggi, lima tertinggi/terendah) | korpus JDIH lokal | resmi |

**Selisih kedua salinan IRBI: tidak ada.** SHA-1 keduanya `cd0b506b2fa343aee2adc110a28f93821eb4690f`, 5.655 baris
(1 meta + 5.654 data), 0 baris berbeda. Data API tidak berubah antara tarikan 18 dan 23 Oktober 2026. Skrip membaca
`data/raw/...` dan membandingkan salinan riset tiap kali jalan (`irbi.json → meta.selisih_berkas`).

Kutipan angka resmi tidak diambil dari ingatan: skrip menolak jalan bila teks "baseline tahun 2019 sebesar 144,02",
"terdapat 168 kabupaten/kota yang berada pada risiko bencana tinggi", dst. tidak ditemukan di korpus lokal.

## 2. Berkas keluaran

Semua CSV UTF-8, pemisah koma, titik desimal, sel kosong = tidak ada nilai (null di API). `irbi.json` memuat cermin semua
tabel (`tabel.<nama berkas>` = `{kolom, baris}`) ditambah `meta` (sumber, SHA-1, bukti skala, label).

| Berkas | Baris | Isi | Label |
| --- | ---: | --- | --- |
| `irbi_kab_2015_2025.csv` | 5.654 | Semua kolom API per kab per tahun apa adanya (presisi asli), plus `skala`, `basis_resmi` (1 = `fix_values` terisi), `jumlah_kolom_bahaya`, `kelas_total` dan `sumber_kelas` | nilai: resmi; `kelas_total` 2015–2024: asumsi-kebijakan (ambang turunan), 2025: resmi |
| `irbi_kab_2025.csv` | 514 | IRBI 2025 per bahaya, `total`, `status_total_resmi` (Tinggi/Sedang dari API), `penduduk_2026`, `n_bahaya_bernilai` | resmi; penduduk: terverifikasi |
| `irbi_agregat_provinsi.csv` | 418 | 38 provinsi × 11 tahun: rerata sederhana dan rerata berbobot penduduk untuk `total` dan tiap bahaya, `n_kab`, `n_kab_basis`, `n_tinggi`, `n_sedang` | lihat kolom `label_sederhana` / `label_berbobot` |
| `irbi_agregat_pulau.csv` | 88 | 7 pulau + Indonesia (`ID`) × 11 tahun, kolom sama | sama |
| `irbi_tren_2015_2024.csv` | 92 | Seri `total` 2015–2024 nasional, pulau, provinsi; dua metode; selisih dan persen 2019→2024 (baseline Renstra), laju tahunan 2019→2024, selisih 2015→2024, jumlah tahun turun | sederhana nasional/provinsi: resmi; lainnya: asumsi-kebijakan |
| `irbi_bukti_skala_bahaya.csv` | 110 | Per bahaya per tahun: n bernilai, min, median, maks, jumlah nilai unik, porsi bilangan bulat | resmi (statistik deskriptif data resmi) |
| `irbi_bukti_skala_tahunan.csv` | 11 | Per tahun: rerata, perubahan, porsi kab naik, median perubahan kab, Spearman dengan tahun lalu, porsi `total` = jumlah kolom bahaya, maks | resmi (statistik deskriptif) |
| `irbi_hitung_kelas.csv` | 22 | Jumlah kab dan provinsi Tinggi/Sedang/Rendah per tahun | lihat kolom `label` |
| `irbi_rekonsiliasi.csv` | 19 | Pencocokan dengan angka resmi (nasional, kelas, peringkat, provinsi, Bali) | – |
| `irbi_rekonsiliasi_provinsi.csv` | 174 | RENSTRA Tabel 1.1 per sel (38 provinsi, 2019–2023) lawan hitungan ulang, dengan dugaan sebab bila beda | – |
| `irbi.json` | – | Cermin semua tabel + meta | – |

## 3. Metode

**Basis resmi = baris dengan `fix_values` terisi.** 16 kab/kota (DOB, mis. 1612, 1613, 1813, 5321, 6411, 7211, 7212,
7411–7415, 7606, 8208, 9211, 9212) tidak punya `fix_values` pada 2015–2020; tiga di antaranya bernilai `total` 0. Rerata
`total` atas 498 kab ber-`fix_values` menghasilkan **144,02 (2019) dan 141,65 (2020), persis angka resmi RENSTRA**. Rerata
naif 514 kab (143,25 dan 140,96) adalah selisih yang dicatat riset A §1.2; selisih itu hilang dengan basis ini. Semua
agregat memakai basis ini; tabel kab tetap memuat semua baris (`basis_resmi` = 0/1).

**Rerata sederhana** = rata-rata kab/kota (cara BNPB untuk nasional dan provinsi; terbukti mereproduksi angka resmi, lihat §5).
**Rerata berbobot** = bobot penduduk WorldPop 2026 per kab (jumlah kecamatan `public/data/penduduk.json`, total 286.674.532 jiwa
di dalam poligon). Bobot sama untuk semua tahun, jadi perubahan seri hanya berasal dari indeks. Untuk kolom bahaya, kab
bernilai null (bahaya tidak dinilai/tidak ada) **dikeluarkan**, bukan dianggap 0; jumlahnya di kolom `<bahaya>_n_kab`.

**Pulau** (pengelompokan penyusun, asumsi-kebijakan): Sumatra = 11–19 dan 21 (termasuk Babel dan Kepri); Jawa = 31–36
(119 kab); Bali–Nusa Tenggara = 51–53; Kalimantan = 61–65; Sulawesi = 71–76; Maluku = 81–82; Papua = 91–96.
Agregat pulau = rerata kab/kota di pulau itu (bukan rerata provinsi).

**Kelas.**
- 2025 kab: kolom `status` API, resmi (Tinggi 169, Sedang 345). Batasnya di data: Sedang tertinggi 175,68, Tinggi terendah
  176,14. Sumber sekunder (skripsi 2026 mengutip BNPB, riset A §1.1) menyebut rendah < 14,67; sedang 14,67–176; tinggi > 176.
  Tidak ada kab di bawah 14,67, jadi Rendah = 0.
- 2015–2024 kab: API tidak memuat kelas. Dipakai **Tinggi bila `total` > 144, selain itu Sedang**. Dasarnya: (a) kelas
  resmi provinsi RENSTRA Tabel 1.1 konsisten dengan ambang > 144 di 174 dari 174 sel (mis. Papua Barat 144,05 Tinggi,
  Sulteng 143,44 Sedang); (b) hitungan > 144 pada 2023 = 168, persis RENAS. Kab 7108 bernilai tepat 144 dihitung Sedang;
  dengan ≥ 144 hasilnya 169, jadi pertidaksamaan ketat. (c) Katadata (sekunder) menyebut kab Bali < 144 = sedang.
  Kelas Rendah tidak dipakai BNPB untuk kab/kota (RENAS 2023: 168 + 346 = 514), jadi `n_rendah` = 0. Label
  asumsi-kebijakan, kecuali 2023 (cocok angka resmi).
- **Kelas per bahaya tidak dibuat.** Tidak ada ambang kelas per bahaya di sumber yang dibuka. Tabel 2025 memuat nilai per
  bahaya dan status total saja. `status` adalah kelas total semua bahaya, bukan kelas per bahaya.
- Kelas provinsi 2015–2024 dan 2025 di `irbi_hitung_kelas.csv` adalah turunan (rerata kab dibanding 144 atau 176). Untuk
  2025, cara BNPB menghitung indeks provinsi belum terdokumentasi; angka provinsi 2025 jangan dikutip sebagai kelas resmi.

## 4. Bukti skala 2025 berubah (ringkas dari `irbi_bukti_skala_*.csv`)

1. Nilai per bahaya 2025 **semuanya bilangan bulat** (paling banyak 34 nilai unik per bahaya); 2021–2024 kontinu (paling sedikit 114 nilai unik per bahaya).
2. Batas atas per bahaya berubah: longsor 36 → 42; kekeringan 36 → 26; cuaca ekstrem 20,4 → 36; gempa 32,4 → 36; tsunami 24 → 35; karhutla 36 → 25; gunung api 20,44 → 31.
3. `total` = jumlah kolom bahaya pada 58% kab 2015, 16% kab 2024, dan **0% kab 2025**.
4. Rerata nasional turun tiap tahun 2016–2024 (−1,76 s.d. −5,85 poin), lalu **naik +19,43** pada 2025.
5. Porsi kab yang totalnya naik: paling tinggi 22,6% per tahun 2016–2024, lalu **63,0%** pada 2025.
6. Spearman peringkat kab dengan tahun sebelumnya: paling rendah 0,88 (2016–2024), lalu **0,589** (2024→2025).
7. Maksimum total 214,8 → 278,51; kolom `status` dan `pembanding` hanya terisi pada 2025.
8. Lompatan 2024→2025 berbeda arah per pulau (Jawa −8,03, Kalimantan −20,91, Papua +75,78), jadi bukan geseran seragam.

Kesimpulan: **IRBI 2025 tidak boleh dibandingkan dengan 2015–2024.** Tren hanya 2015–2024; 2025 berdiri sendiri.

## 5. Rekonsiliasi dengan angka resmi

| Butir | Resmi | Hitung | Cocok |
| --- | --- | --- | --- |
| IRB nasional 2019 (baseline) | 144,02 (RENSTRA hlm. 52) | 144,02 | ya |
| IRB nasional 2020–2024 | 141,65; 138,81; 135,56; 132,25; 128,52 (RENSTRA Tabel 1.6) | sama | ya (5/5) |
| Kab Tinggi / Sedang 2023 | 168 / 346 (RENAS hlm. 19) | 168 / 346 | ya (uji konsistensi; ambang disimpulkan) |
| Kab Tinggi / Sedang 2025 | 169 / 345 (kolom status API, riset A) | 169 / 345 | ya |
| Provinsi Tinggi / Sedang 2023 | 13 / 25 (RENAS hlm. 19) | 13 / 25 | ya |
| Lima kab tertinggi dan terendah 2023 | RENAS hlm. 19 | himpunan sama | ya |
| Indeks provinsi 2019–2023 (174 sel) | RENSTRA Tabel 1.1 | 148 cocok (145 persis, 3 beda pembulatan 0,01) | **tidak penuh** |
| 9 kab/kota Bali 2024 | Katadata mengutip BNPB (sekunder) | 9 cocok | ya |

26 sel provinsi yang tidak cocok ada di `irbi_rekonsiliasi_provinsi.csv` dengan dugaan sebab: 17 sel 2019–2020 di provinsi yang
memuat kab DOB tanpa `fix_values` (angka buku memakai versi data lain untuk kab itu); dugaan salah salin di RENSTRA (Sumbar 2020
= nilai Sumut; Sumsel 2020 = nilai Sulsel 2019; Kalbar 2023 = nilai Jabar 2023; Sulsel 2020 sama dengan nilai resmi Sumsel 2020);
dugaan salah ketik satu digit (Papua 2020 112,9 lawan 122,90; Sumsel 2023 131,34 lawan 131,24); tiga sel 2023 tanpa sebab yang
terlihat (Bali 120,10 lawan 120,21; NTB 115,37 lawan 115,31; Malut 148,71 lawan 148,40). Kedua versi disimpan berdampingan.
Kalimat "Kalbar 123,16" di riset A §1.3 ikut tabel RENSTRA; nilai API 138,92.

## 6. Keterbatasan

- `total` bukan jumlah kolom bahaya (lihat §4 butir 3). Kolom bahaya tidak boleh dijumlah ulang untuk mendapat total.
- Bobot penduduk tahun 2026 dipakai untuk semua tahun; pemekaran wilayah memakai batas 2025.
- Banyak kab bernilai sama dan perubahan antartahun sering 0 (median perubahan kab 0 pada 2016–2022). Audit metode
  21 Okt 2026 (`docs/audit-metode/2026-10-21/RINGKASAN-EKSEKUTIF.md`): IRBI layak, tetapi jangan dipakai untuk memeringkat.
- Jawa 2025: 118 Sedang, 1 Tinggi (Sukabumi 3202); status total hampir tidak membedakan. Pakai nilai per bahaya.
- Kolom `pembanding` (label `SEB_60`, hanya 2025) disimpan apa adanya; maknanya tidak terdokumentasi.
  Spearman dengan total 2024 0,54, dengan total 2025 0,93.
- Ambang kelas resmi dari buku IRBI (BNPB) belum dibuka langsung: PDF buku IRBI 2021/2023/2024 di situs BPBD lebih dari
  10 MB dan tidak diunduh. Ambang 144 di sini disimpulkan dari kelas resmi RENSTRA dan RENAS, bukan dikutip dari buku.
