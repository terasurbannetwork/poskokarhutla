# Paket `irbi`: Indeks Risiko Bencana Indonesia (IRBI) BNPB per kab/kota 2015–2025

Bahan untuk Bab 5 Kajian Mitigasi (profil risiko nasional, per pulau, provinsi, kab/kota) dan Bab 5–6 Kajian Air Jawa
(IRBI banjir, longsor, kekeringan, abrasi untuk 119 kab/kota Jawa).

**Membangun ulang:** `python3 data/kajian-bnpb/bangun/irbi.py` (Python 3 stdlib, sekitar 2 detik). Skrip menulis semua berkas
ke direktori sementara, menjalankan self-check `assert`, dan baru memindahkannya ke folder ini bila semuanya lolos. Bila satu
invarian rusak, skrip keluar non-nol dan keluaran lama tidak tersentuh. Keluaran terakhir: "self-check hijau".

Angka di README ini ikut diuji: skrip membangkitkan teks angkanya (`irbi.json → meta.angka_readme`) dan gagal bila teks itu
tidak ada verbatim di sini. Bila data berubah, pesan gagalnya memuat teks pengganti.

Sumber yang dikutip di naskah: **"Sumber: InaRISK BNPB"** (lisensi InaRISK tidak tertulis; bukan klaim data terbuka).

## 1. Masukan dan tanggal tarik

| Masukan | Isi | Tanggal tarik / akses | Label |
| --- | --- | --- | --- |
| `data/raw/inarisk/irbi.ndjson` (gitignored, opsional) | Dump `https://inarisk.bnpb.go.id/apiv4/data-irbi-full`: 5.654 baris = 514 kab/kota × 2015–2025, kolom 9 bahaya + `total, fix_values, ori_value, status, pembanding, pembanding_label` | 18 Okt 2026 | resmi |
| `data/kajian-bnpb/riset/mentah/irbi.ndjson` (dilacak git) | Salinan riset A, identik byte-per-byte. Dipakai sebagai sumber utama bila berkas di atas tidak ada (clone baru) | 23 Okt 2026 | resmi |
| `scripts/udara/kota.json` | Kode Kemendagri 4 digit (Kepmendagri 300.2.2-2138/2025, via cahyadsn/wilayah), nama Kepmendagri, nama peta | – | resmi |
| `public/geo/kabupaten/*.json` | Nama kab/kota di peta (properti `kab`), dipakai di kolom `nama` | – | resmi |
| `public/banjir/data/meta.json` kunci `provinsi` | Nama 38 provinsi | – | resmi |
| `public/data/penduduk.json` kunci `kec` | WorldPop Global2 R2025A, penduduk 2026 per kecamatan (CC BY 4.0); dijumlah ke kab | – | terverifikasi |
| `data/raw/hukum/teks/perban-nomor-5-tahun-2025.json` (gitignored) | RENSTRA BNPB 2025–2029: Tabel 1.1 (indeks dan kelas provinsi 2019–2023, hlm. 6–8), Tabel 1.6 dan teks evaluasi (IRB nasional 2019–2024, penurunan 10,76% / 15,5 poin, hlm. 52) | korpus JDIH lokal | resmi |
| `data/raw/hukum/teks/perban-nomor-1-tahun-2025.json` (gitignored) | RENAS PB 2025–2029 hlm. 18–19 (IRB 2023, 13/25 provinsi, tiga provinsi tertinggi dan terendah, 168/346 kab, lima kab tertinggi dan terendah) | korpus JDIH lokal | resmi |
| Katadata Databoks, "Indeks Risiko Bencana di 38 Provinsi Indonesia Tahun 2024", https://databoks.katadata.co.id/lingkungan/statistik/69410380c2ad1/indeks-risiko-bencana-di-38-provinsi-indonesia-tahun-2024 | 38 indeks provinsi 2024 dan pernyataan "di atas 144 poin" = tinggi (8 tinggi, 30 sedang); media mengutip BNPB, terbit 16 Des 2025. Nilainya ditanam di skrip (`KATADATA_2024`) | diakses 23 Okt 2026 | terverifikasi; sekunder |
| Katadata Databoks, Bali 2024, https://databoks.katadata.co.id/en/environment/statistics/69410dda44ead/disaster-risk-index-in-bali-for-2024 | 9 indeks kab/kota Bali 2024; semua < 144 = sedang | diakses 23 Okt 2026 | terverifikasi; sekunder |
| `data/kajian-bnpb/riset/A-dokumen-bnpb.md` §1.1–1.2 | Selisih rerata naif 514 kab (yang dihilangkan basis ber-`fix_values`); hitungan 169/345 kab 2025 dari kolom `status` (bukan pembanding bebas, lihat §5) | 23 Okt 2026 | – |

**Cara menarik ulang.**
- IRBI: penariknya `scripts/cuaca/risiko_bnpb.py` (fungsi `ambil`, header User-Agent peramban). Untuk IRBI saja tanpa ~1.030
  panggilan infrastruktur: `python3 -c "import sys,os; sys.path.insert(0,'scripts/cuaca'); import risiko_bnpb as r; os.makedirs(r.CACHE,exist_ok=True); open(os.path.join(r.CACHE,'irbi.ndjson'),'w').write(r.ambil(r.BASE+'data-irbi-full'))"`.
  `python3 scripts/cuaca/risiko_bnpb.py --bangun` juga menulis berkas yang sama bila belum ada.
- Korpus JDIH (RENSTRA, RENAS) di-gitignore (`data/raw/hukum/*`): `python3 scripts/bnpb/hukum.py semua` (tarik ulang JDIH,
  bisa dilanjutkan). Tanpa korpus, skrip berhenti dengan pesan yang menyebut perintah ini.

**Baris meta API disimpan utuh** di `irbi.json → meta.meta_api`: `message` "legacy rows", `meta.source` "database_export",
`success`, dan `data.pagination`. Artinya API menyajikan ekspor basis data lama, bukan hitungan langsung. Tanggal ekspor tidak
tertulis di respons.

**Selisih kedua salinan IRBI: tidak ada.** SHA-1 keduanya `cd0b506b2fa343aee2adc110a28f93821eb4690f`, 5.655 baris
(1 meta + 5.654 data), 0 baris berbeda. Data API tidak berubah antara tarikan 18 dan 23 Oktober 2026. Hasil perbandingan
tiap jalan ada di `irbi.json → meta.selisih_berkas`.

Kutipan angka resmi tidak diambil dari ingatan: skrip menolak jalan bila teks seperti "baseline tahun 2019 sebesar 144,02"
atau "2024 129,62 128,52" (pasangan target dan capaian Tabel 1.6) tidak ditemukan di **halaman** korpus yang dirujuk.

## 2. Berkas keluaran

Semua CSV UTF-8, pemisah koma, titik desimal, sel kosong = tidak ada nilai (null di API). `irbi.json` memuat cermin semua
tabel (`tabel.<nama berkas>` = `{kolom, baris}`) ditambah `meta` (sumber, baris meta API, SHA-1, definisi label, nilai
sekunder Katadata, bukti skala, angka README).

| Berkas | Baris | Isi | Label |
| --- | ---: | --- | --- |
| `irbi_kab_2015_2025.csv` | 5.654 | Semua kolom API per kab per tahun apa adanya (presisi asli), plus `skala`, `ber_fix_values` (1 = `fix_values` terisi), `jumlah_kolom_bahaya`, `kelas_total` dan `sumber_kelas` | nilai: resmi; `kelas_total` 2015–2024: asumsi-kebijakan (ambang turunan; jumlah Tinggi 2023 cocok RENAS, kelas per kab tidak diterbitkan), 2025: resmi |
| `irbi_kab_2025.csv` | 514 | IRBI 2025 per bahaya, `total`, `status_total_resmi` (Tinggi/Sedang dari API), `penduduk_2026`, `n_bahaya_bernilai` | resmi; penduduk: terverifikasi |
| `irbi_agregat_provinsi.csv` | 418 | 38 provinsi × 11 tahun: rerata sederhana dan rerata berbobot penduduk untuk `total` dan tiap bahaya, `n_kab`, `n_kab_basis`, `n_tinggi`, `n_sedang` | **per sel**: `label_total_sederhana` + `catatan_total_sederhana`; `label_total_berbobot`; `label_bahaya` (semua kolom per bahaya) |
| `irbi_agregat_pulau.csv` | 88 | 7 pulau + Indonesia (`ID`) × 11 tahun, kolom sama | sama |
| `irbi_tren_2015_2024.csv` | 92 | Seri `total` 2015–2024 nasional, pulau, provinsi; dua metode; selisih dan persen 2019→2024 (baseline Renstra), laju tahunan 2019→2024, selisih 2015→2024, jumlah tahun turun | kolom `label` (angka turunan baris itu), `tahun_cocok_resmi`, `tahun_cocok_sekunder`, `catatan` |
| `irbi_bukti_skala_bahaya.csv` | 110 | Per bahaya per tahun: n bernilai, min, median, maks, jumlah nilai unik, porsi bilangan bulat | asumsi-kebijakan; analisis penyusun atas data resmi |
| `irbi_bukti_skala_tahunan.csv` | 11 | Per tahun: rerata, perubahan, porsi kab naik, median perubahan kab, Spearman dengan tahun lalu, porsi `total` = jumlah kolom bahaya, maks | asumsi-kebijakan; analisis penyusun atas data resmi |
| `irbi_hitung_kelas.csv` | 22 | Jumlah kab dan provinsi Tinggi/Sedang/Rendah per tahun | kolom `label` |
| `irbi_rekonsiliasi.csv` | 24 | Pencocokan dengan angka terbit (nasional, kelas, peringkat, provinsi, Katadata, Bali) | kolom `label_sumber` |
| `irbi_rekonsiliasi_provinsi.csv` | 174 | RENSTRA Tabel 1.1 per sel (38 provinsi, 2019–2023) lawan hitungan ulang dua basis, dengan dugaan sebab bila beda | – |
| `irbi.json` | – | Cermin semua tabel + meta | – |

**Nama wilayah.** `nama_kepmendagri` (Kepmendagri 300.2.2-2138/2025, mis. "Kab. Mukomuko", "Kota Parepare", "Kab. Toli-Toli")
adalah nama untuk naskah Kepala BNPB. `nama` memakai ejaan peta (mis. "Muko Muko", "Kota Pare Pare", "Toli Toli") dan hanya
untuk join ke `public/geo/kabupaten/*.json`.

**Label** (definisi lengkap di `irbi.json → meta.label`). Empat label baku kajian, dengan tambahan setelah titik koma
(konvensi `data/kajian-bnpb/data/angka.json`):

| Label | Arti |
| --- | --- |
| `resmi` | Nilai API InaRISK / dokumen BNPB, atau hitungan ulang yang cocok (selisih ≤ 0,01) dengan angka terbit BNPB **untuk sel itu** |
| `terverifikasi` | Sumber primer non-pemerintah yang dibuka (WorldPop) |
| `terverifikasi; sekunder` | Cocok dengan media yang mengutip BNPB (Katadata); dokumen BNPB-nya tidak dibuka |
| `asumsi-kebijakan` | Pilihan penyusun: bobot penduduk, pengelompokan pulau, rerata per bahaya, ambang kelas turunan |
| `asumsi-kebijakan; turunan` | Dihitung dari data resmi dengan metode yang mereproduksi angka BNPB di sel lain, tetapi sel ini tidak punya (atau tidak cocok dengan) angka terbit |
| `asumsi-kebijakan; turunan, batas 2025 bukan angka terbit` | Papua (91) dan Papua Barat (92) 2015–2022, serta Papua Selatan, Papua Tengah, Papua Pegunungan, Papua Barat Daya (93–96) 2015–2022 |
| `asumsi-kebijakan; analisis penyusun atas data resmi` | Statistik deskriptif data resmi; kesimpulannya (skala 2025 berubah) tafsiran penyusun, tidak dikonfirmasi dokumen BNPB |

Aturan label per sel `total_sederhana` provinsi: `resmi` hanya bila sel itu cocok dengan RENSTRA Tabel 1.1 (2019–2023);
2024 `terverifikasi; sekunder` bila cocok dengan Katadata (38 dari 38 provinsi); 2015–2018, sel 2019–2023 yang tidak cocok,
dan 2025 `asumsi-kebijakan; turunan`. Untuk nasional (`ID`): 2019–2024 `resmi` (cocok RENSTRA), 2015–2018 dan 2025
`asumsi-kebijakan; turunan` (tidak ada angka terbit pembanding; rerata nasional 2025 147,95 belum pernah diterbitkan).
Rerata per bahaya dan rerata berbobot tidak pernah diterbitkan BNPB dan bergantung pada pilihan penyusun (null dikeluarkan,
bobot penduduk), jadi selalu `asumsi-kebijakan`. `n_tinggi`/`n_sedang` mengikuti label `kelas_total` kab.

## 3. Metode

**Basis ber-`fix_values` = baris dengan `fix_values` terisi.** 16 kab/kota (DOB, mis. 1612, 1613, 1813, 5321, 6411, 7211,
7212, 7411–7415, 7606, 8208, 9211, 9212) tidak punya `fix_values` pada 2015–2020; tiga di antaranya bernilai `total` 0.
Rerata `total` atas 498 kab ber-`fix_values` menghasilkan **144,02 (2019) dan 141,65 (2020), sama dengan IRB nasional RENSTRA**.
Rerata naif 514 kab (143,25 dan 140,96) adalah selisih yang dicatat riset A §1.2; selisih itu hilang dengan basis ini.

Basis ini bukan aturan BNPB yang seragam. Angka provinsi Kalimantan Timur 2019 dan 2020 di RENSTRA Tabel 1.1 (154,79; 154,02)
justru tereproduksi persis bila DOB 6411 ikut dirata-rata (semua kab), bukan dengan basis ber-`fix_values` (154,61; 153,75).
Jadi BNPB tampaknya tidak memakai satu metode untuk semua angka. Ini **disimpulkan dari angka, bukan dikutip** dari dokumen
metode. Semua agregat paket ini tetap memakai basis ber-`fix_values` (yang mereproduksi angka nasional); sel Kaltim 2019–2020
karena itu berlabel `asumsi-kebijakan; turunan`. Tabel kab memuat semua baris (`ber_fix_values` = 0/1).

**Rerata sederhana** = rata-rata kab/kota. Cara ini mereproduksi IRB nasional 2019–2024 dan 150 dari 174 sel provinsi
RENSTRA (§5). **Rerata berbobot** = bobot penduduk WorldPop 2026 per kab (jumlah kecamatan `public/data/penduduk.json`,
total 286.674.532 jiwa di dalam poligon). Bobot sama untuk semua tahun, jadi perubahan seri hanya berasal dari indeks. Untuk
kolom bahaya, kab bernilai null (bahaya tidak dinilai/tidak ada) **dikeluarkan**, bukan dianggap 0; jumlahnya di kolom
`<bahaya>_n_kab`.

**Pulau** (pengelompokan penyusun, asumsi-kebijakan): Sumatra = 11–19 dan 21 (termasuk Babel dan Kepri); Jawa = 31–36
(119 kab); Bali–Nusa Tenggara = 51–53; Kalimantan = 61–65; Sulawesi = 71–76; Maluku = 81–82; Papua = 91–96.
Agregat pulau = rerata kab/kota di pulau itu (bukan rerata provinsi).

**Papua dan Papua Barat.** Agregat 2015–2022 dihitung dengan batas 2025 (setelah pemekaran 2022). RENSTRA 2019–2022 memakai
susunan 34 provinsi, jadi seri ini **tidak bisa dibandingkan dengan RENSTRA**. Papua 2019 di sini 140,13, terbit (34 provinsi) 122,90; persen 2019–2024 di sini −1,93%, seri terbit +11,82%
(RENSTRA 2019 ke Katadata 2024): arahnya berlawanan. Papua Barat 2019 di sini 137,63, terbit (34 provinsi) 144,05; persen 2019–2024 di sini +5,91%, seri terbit +1,19%.
Empat provinsi DOB 2022 (93–96) belum ada sebelum 2023; nilai 2015–2022-nya rerata kab yang kini masuk provinsi itu (Papua
Pegunungan datar 102,05 dan Papua Selatan datar 138,2 selama 2015–2024).

**Kelas.**
- 2025 kab: kolom `status` API, resmi (Tinggi 169, Sedang 345). Batasnya di data: Sedang tertinggi 175,68, Tinggi terendah 176,14.
  Ambang ~176 untuk kelas provinsi 2025 (turunan) disimpulkan dari batas teramati itu. Skripsi 2026 yang dikutip riset A
  §1.1 (rendah < 14,67; tinggi > 176) tidak dipakai karena tidak bisa dilacak (tanpa judul, penulis, atau URL).
- 2015–2024 kab: API tidak memuat kelas. Dipakai **Tinggi bila `total` > 144, selain itu Sedang**. Dasarnya: (a) kelas
  resmi provinsi RENSTRA Tabel 1.1 konsisten dengan ambang > 144 di 174 dari 174 sel (mis. Papua Barat 144,05 Tinggi,
  Sulteng 143,44 Sedang); (b) hitungan > 144 pada 2023 = 168, persis RENAS. Kab 7108 bernilai tepat 144 dihitung Sedang;
  dengan ≥ 144 hasilnya 169, jadi pertidaksamaan ketat. (c) Bukti bebas (sekunder): Katadata menyatakan provinsi "di atas 144
  poin" = tinggi, dan hitungan provinsi 2024 memberi 8 Tinggi / 30 Sedang, sama dengan Katadata; kab Bali < 144 = sedang.
  Kelas Rendah tidak dipakai BNPB untuk kab/kota (RENAS 2023: 168 + 346 = 514), jadi `n_rendah` = 0. Label
  asumsi-kebijakan, kecuali 2023 (cocok RENAS).
- **Kelas per bahaya tidak dibuat.** Tidak ada ambang kelas per bahaya di sumber yang dibuka. Tabel 2025 memuat nilai per
  bahaya dan status total saja. `status` adalah kelas total semua bahaya, bukan kelas per bahaya.
- Kelas provinsi di `irbi_hitung_kelas.csv` adalah turunan (rerata kab dibanding 144 atau 176); 2023 cocok RENAS (resmi),
  2024 cocok Katadata (sekunder). Untuk 2025, cara BNPB menghitung indeks provinsi belum terdokumentasi; angka provinsi 2025
  jangan dikutip sebagai kelas resmi.

## 4. Bukti skala 2025 berubah (ringkas dari `irbi_bukti_skala_*.csv`)

Label: asumsi-kebijakan; analisis penyusun atas data resmi. Statistiknya dihitung dari data resmi; kesimpulan "skala
berubah" adalah tafsiran penyusun dan belum dikonfirmasi dokumen BNPB.

1. Nilai per bahaya 2025 **semuanya bilangan bulat** (paling banyak 34 nilai unik per bahaya); 2021–2024 kontinu (paling sedikit 114 nilai unik per bahaya, kecuali gunung api).
2. Batas atas per bahaya: banjir 36 → 36 (tetap); longsor 36 → 42; kekeringan 36 → 26; cuaca ekstrem 20,4 → 36; abrasi 36 → 33; gempabumi 32,4 → 36; tsunami 24 → 35; karlahut 36 → 25; gunungapi 20,44 → 31.
3. `total` = jumlah kolom bahaya pada 58% kab 2015, 16% kab 2024, dan **0% kab 2025**.
4. Rerata nasional turun tiap tahun 2016–2024 (−5,85 s.d. −1,76 poin), lalu **naik +19,43** pada 2025.
5. Porsi kab yang totalnya naik: paling tinggi 22,6% per tahun 2016–2024, lalu **63,0%** pada 2025.
6. Spearman peringkat kab dengan tahun sebelumnya: paling rendah 0,88 (2016–2024), lalu **0,589** (2024→2025).
7. Maksimum total 214,8 → 278,51; kolom `status` dan `pembanding` hanya terisi pada 2025.
8. Lompatan 2024→2025 berbeda arah per pulau (Sumatra +17,02, Jawa −8,03, Bali–Nusa Tenggara +48,18, Kalimantan −20,91, Sulawesi +38,44, Maluku +58,06, Papua +75,78);
   karena skala berubah (butir 1–6), selisih ini tidak boleh dibaca sebagai perubahan risiko.

Kesimpulan: **IRBI 2025 tidak boleh dibandingkan dengan 2015–2024.** Tren hanya 2015–2024; 2025 berdiri sendiri.

## 5. Rekonsiliasi dengan angka terbit

| Butir | Terbit | Hitung | Cocok |
| --- | --- | --- | --- |
| IRB nasional 2019 (baseline) | 144,02 (RENSTRA hlm. 52) | 144,02 | ya |
| IRB nasional 2020–2024 | 141,65; 138,81; 135,56; 132,25; 128,52 (RENSTRA Tabel 1.6) | sama | ya (5/5) |
| Penurunan IRB nasional 2019–2024 | 10,76% / 15,5 poin (RENSTRA hlm. 52) | sama | ya |
| Kab Tinggi / Sedang 2023 | 168 / 346 (RENAS hlm. 19) | 168 / 346 | ya (uji konsistensi; ambang disimpulkan) |
| Kab Tinggi / Sedang 2025 | 169 / 345 | dibaca dari kolom `status` API | bukan uji (riset A §1.2 menghitung dari kolom yang sama) |
| Provinsi Tinggi / Sedang 2023 | 13 / 25 (RENAS hlm. 19) | 13 / 25 | ya |
| Tiga provinsi tertinggi 2023 | Sulbar, Maluku, Babel (RENAS hlm. 19) | himpunan sama | ya |
| Tiga provinsi terendah 2023 | DKI, Papua Pegunungan, DIY (RENAS hlm. 19) | DKI, Papua Pegunungan, Kepri | **tidak: konflik antardokumen resmi** |
| Lima kab tertinggi dan terendah 2023 | RENAS hlm. 19 | himpunan sama | ya |
| Indeks provinsi 2019–2023 (174 sel) | RENSTRA Tabel 1.1 | 150 dari 174 sel cocok (147 persis, 3 beda pembulatan 0,01) | **tidak penuh** |
| Indeks 38 provinsi 2024 | Katadata mengutip BNPB (sekunder) | 38 dari 38 provinsi | ya |
| Kelas provinsi 2024 (ambang > 144) | 8 Tinggi / 30 Sedang (Katadata, sekunder) | sama | ya |
| 9 kab/kota Bali 2024 | Katadata mengutip BNPB (sekunder) | 9 dari 9 kab/kota | ya |

**Tiga provinsi terendah 2023.** Teks RENAS menyebut DKI Jakarta, Papua Pegunungan, dan DIY. RENSTRA Tabel 1.1 dan API
sama-sama menempatkan Kepulauan Riau (107,79) di bawah DIY (108,15). Kedua dokumen resmi bertentangan; kedua versi disimpan.

**Provinsi 2019–2023.** Tiap sel diuji dengan dua basis: ber-`fix_values` dan semua kab. Kaltim 2019–2020 hanya cocok dengan
basis semua kab (§3). Ada 24 sel provinsi yang tidak cocok; semuanya ada di `irbi_rekonsiliasi_provinsi.csv` dengan dugaan sebab:
- 16 sel 2019–2020 di provinsi yang memuat kab DOB tanpa `fix_values`, yang tidak cocok dengan basis mana pun (dugaan versi
  data lain untuk kab itu);
- dugaan salah salin di RENSTRA, yaitu nilai terbit sama dengan sel lain yang cocok dengan hitungannya: Sumbar 2020 = nilai
  Sumut 2019–2020; Sumsel 2020 = nilai Sulsel 2019; Kalbar 2023 = nilai Jabar 2023;
- dugaan baris tertukar: nilai HITUNG Sulsel 2020 (159,49) sama dengan nilai terbit Sumsel 2020, dan sel Sumsel 2020 juga
  meleset dari hitungannya sendiri (tidak saling silang). Heuristik ini hanya menyebut "tertukar" bila sel pasangannya ikut
  meleset; Maluku Utara 2019–2020 (hitung 144,81 = nilai terbit Kalsel 2020, padahal Kalsel 2020 cocok) tidak lagi diberi sebab itu;
- dugaan salah ketik satu digit: Papua 2020 112,9 lawan 122,90; Sumsel 2023 131,34 lawan 131,24;
- tiga sel 2023 tanpa sebab yang terlihat: Bali 120,10 lawan 120,21; NTB 115,37 lawan 115,31; Malut 148,71 lawan 148,40.

Kalimat "Kalbar 123,16" di riset A §1.3 ikut tabel RENSTRA; nilai API 138,92.

## 6. Keterbatasan

- `total` bukan jumlah kolom bahaya (lihat §4 butir 3). Kolom bahaya tidak boleh dijumlah ulang untuk mendapat total.
- Bobot penduduk tahun 2026 dipakai untuk semua tahun; pemekaran wilayah memakai batas 2025. Tren Papua dan Papua Barat
  2015–2022 tidak sebanding dengan RENSTRA (§3).
- Banyak kab bernilai sama dan perubahan antartahun sering 0 (median perubahan kab 0 pada 2016–2022). Audit metode
  21 Okt 2026 (`docs/audit-metode/2026-10-21/RINGKASAN-EKSEKUTIF.md`): IRBI layak, tetapi jangan dipakai untuk memeringkat.
- Jawa 2025: 118 Sedang, 1 Tinggi (Sukabumi 3202); status total hampir tidak membedakan. Pakai nilai per bahaya.
- Kolom `pembanding` (label `SEB_60`, hanya 2025) disimpan apa adanya; maknanya tidak terdokumentasi.
  Spearman dengan total 2024 0,54, dengan total 2025 0,93.
- Ambang kelas resmi dari buku IRBI (BNPB) belum dibuka langsung: PDF buku IRBI 2021/2023/2024 di situs BPBD lebih dari
  10 MB dan tidak diunduh. Ambang 144 di sini disimpulkan dari kelas resmi RENSTRA dan RENAS (didukung Katadata, sekunder),
  bukan dikutip dari buku.
- Pembanding 2024 (provinsi dan Bali) hanya media sekunder; dokumen BNPB 2024 per provinsi belum dibuka.
- `data/kajian-bnpb/data/angka.json` (di luar paket ini) masih memberi `irbi.nasional.2015` dan
  `irbi.nasional.persen_2015_2024` keyakinan `resmi`. Menurut label paket ini keduanya `asumsi-kebijakan; turunan`
  (2015 tidak punya angka terbit pembanding).
