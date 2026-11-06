# Riset unit 5: Deputi Bidang Rehabilitasi dan Rekonstruksi

Tanggal: 5 November 2026. Penyusun: subagent riset (tanpa sunting repo). Bahan: Perban BNPB 6/2025 dan 11/2025 (teks di scratchpad), korpus JDIH lokal `data/raw/hukum/teks/`, kajian `data/kajian-bnpb/rehab/` (KEPUTUSAN-AWAL, KERANGKA, riset A-F), kode repo, layanan ArcGIS publik `gis.bnpb.go.id`, dan pencarian web.

Kajian rehab yang sudah ada (Grand Design air dan akses, kini digabung ke buku SIPPA per KEPUTUSAN-AWAL §6) membahas kebijakan pipa, akuifer, jembatan. Berkas ini tidak mengulangnya: fokusnya kerja rutin direktorat dan sistem web untuk kerja itu.

## 0. Susunan final (dicek ke teks)

Perban 11/2025 mengganti Pasal 82-91 Perban 6/2025. Susunan yang berlaku:

> Pasal 82 (Perban 11/2025): "Deputi Bidang Rehabilitasi dan Rekonstruksi terdiri atas: a. Direktorat Rehabilitasi dan Rekonstruksi Perumahan; b. Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur; dan c. Direktorat Rehabilitasi dan Rekonstruksi Sosial, Ekonomi, dan Lingkungan Hidup."

Akibat penting:

- **Direktorat Perencanaan Rehabilitasi dan Rekonstruksi tidak ada lagi.** Di Perban 6/2025 Pasal 84 direktorat itu memegang "inventarisasi dan analisis kebutuhan rehabilitasi dan rekonstruksi" dan "perencanaan pendanaan rehabilitasi dan rekonstruksi" (huruf c dan d). Di Perban 11/2025 fungsi perencanaan dipecah ke tiap direktorat sektor (huruf a tiap pasal fungsi: "penyiapan penyusunan kebijakan teknis di bidang perencanaan rehabilitasi dan rekonstruksi ..."). Artinya Jitupasna dan R3P kini dikerjakan per sektor, tanpa satu pemilik lintas sektor di tingkat direktorat. Ini celah koordinasi yang nyata dan menjadi dasar usulan lintas (D1) di bawah.
- Nama lama "Pemulihan dan Peningkatan Fisik" dan "Pemulihan dan Peningkatan Sosial, Ekonomi, dan Sumber Daya Alam" diganti. Perumahan dipisah dari infrastruktur.
- Tugas Deputi tidak diubah Perban 11/2025: Pasal 80 Perban 6/2025, "menyelenggarakan perumusan dan pelaksanaan kebijakan teknis di bidang rehabilitasi dan rekonstruksi".

Catatan lapangan: layanan `gis.bnpb.go.id/server/rest/services/Data_Jalan_Jembatan_Putus_Akses_PU` (Nov-Des 2025) masih memberi label sumber "Kompilasi Direktorat PERB BNPB" untuk 227 dari 341 titik. Dugaan: PERB = Direktorat Perencanaan RR lama; unit itu masih menghasilkan data sampai akhir 2025.

## 1. Peraturan kerja yang dipakai (status dari katalog JDIH)

| Dokumen | Status | Isi yang dipakai |
|---|---|---|
| Perban 5/2017 Penyusunan R3P | BERLAKU | Pasal 2 ayat (2): R3P "paling lama 90 (sembilan puluh) hari", ayat (3) "dimulai pada saat tanggap darurat"; Pasal 8 ayat (2): lima sektor (permukiman, infrastruktur, ekonomi, sosial, lintas sektor); Pasal 9 ayat (2): Jitupasna = kerusakan, kerugian, gangguan akses, gangguan fungsi, peningkatan risiko |
| Perka 15/2011 Pedoman Pengkajian Kebutuhan Pascabencana | BERLAKU (OCR sebagian) | hlm 40: "Nilai Kerusakan = Jumlah Unit Fisik Rusak Menurut Tingkat Kerusakan X harga (biaya) satuan"; hlm 47: kebutuhan = "Jumlah Unit X Satuan Biaya X Indeks Biaya"; hlm 41: pemeriksaan penghitungan ganda |
| Perban 6/2017 Penyelenggaraan RR | BERLAKU | Pasal 14: monev mengacu dokumen R3P yang ditetapkan |
| Perban 4/2024 Hibah RR | BERLAKU | Pasal 7: sembilan tahap (pengusulan s.d. penyetoran sisa dana); Pasal 9: daftar dokumen usulan; Pasal 13: usulan "melalui sistem informasi dan secara nonelektronik"; Pasal 14-16: praverifikasi, verifikasi lapangan (penyebab kerusakan, volume kebutuhan, desain dan nilai, kesiapan pemda), reviu APIP; Pasal 5 huruf e: tidak membiayai "aset rusak milik pemerintah desa" |
| Juklak 9/2024 Mekanisme Pelaksanaan, Pelaporan, Pemantauan (hibah RR) | BERLAKU | Mendefinisikan **Aplikasi E-Pelaporan** dan **Aplikasi Mapping Aset**; laporan berkala tiap 3 bulan, paling lambat 15 hari setelah tahap; foto geotag 0%, 50%, 100%; Format 15 hasil cetak "Sistem Informasi Pemetaan Aset" (nama aset, jenis, kecamatan, kelurahan, volume, nilai, lat, lon, 2 foto) |
| Juklak 1/2025 Dana Bersama Tahap Pascabencana | BERLAKU | Kegiatan yang dibiayai adalah kegiatan R3P lima sektor |
| Juklak 5/2024 Stimulan Perbaikan/Pembangunan Kembali Rumah (DSP) | BERLAKU | **Teks tidak ada di korpus lokal.** Besaran dari berita: Rp60 juta RB, Rp30 juta RS, Rp15 juta RR (Kemenko PMK, lihat sumber) |
| Juklak 1/2023 dan 15/2025 Dana Tunggu Hunian | BERLAKU | Rp600.000 per bulan, 3 bulan (15/2025, Aceh-Sumut-Sumbar) |
| Juklak 3/2023 Huntara | BERLAKU | Lokasi huntara wajib berakses kesehatan, air bersih, sanitasi |
| Juknis 1/2024 Stimulan Petani Puso (DSP) | BERLAKU | Dasar usulan sektor ekonomi (unit SEL-LH) |
| Perka 5/2012 Pedoman Monev RR | BERLAKU | Teks tidak ada di korpus |
| Perka 17/2010 Pedoman Umum RR | BERLAKU di katalog | Dicabut Perban 5/2017 menurut kajian Bab 11.9; ketidaksesuaian indeks JDIH (riset A no. 15) |

## 2. Sistem resmi yang sudah ada (ditemukan, dengan URL)

| Sistem | Pemilik | Fungsi | Sumber | Celah |
|---|---|---|---|---|
| E-Proposal (usulan bantuan RR) | BNPB, Deputi RR | Pemda mengajukan usulan bantuan RR; diluncurkan Desember 2019 | berita VOI News (tautan mati 404 saat dicek; tercatat di hasil pencarian) dan Perban 4/2024 Pasal 13 "melalui sistem informasi" | Status 2026 tidak terverifikasi; tertutup |
| Aplikasi E-Pelaporan hibah RR | BNPB | Laporan berkala dan akhir penerima hibah RR, basis data pemantauan | Juklak 9/2024 butir 9 (https://jdih.bnpb.go.id/dokumen/Peraturan/juklak-nomor-9-tahun-2024) | Tertutup; isinya tidak bisa dibaca dari luar |
| Aplikasi Mapping Aset (Sistem Informasi Pemetaan Aset) | BNPB | Peta aset hasil hibah RR (Format 15) | Juklak 9/2024 butir 10 dan Format 15 | Tertutup; tidak terhubung ke peta bahaya |
| Layer dampak gempa NTT 2026 | BNPB (ArcGIS) | Per kab: rumah rusak lapor RB/RS/RR **dan kolom verifikasi `verif_rb`, `verif_rs`, `verif_rr`, `verif_tmk`, `total_rumah_verif`** | https://gis.bnpb.go.id/server/rest/services/2026_gempabumi_ntt/mv_gempa_ntt_2026_v2/FeatureServer/40 (publik, dicek 5 Nov 2026, diperbarui 3 Nov 2026) | Hanya satu kejadian; bentuk berbeda tiap kejadian |
| Foto geotag terdampak NTT | BNPB (ArcGIS) | Titik foto + jenis | .../2026_gempabumi_ntt/Foto_Geotag_Terdampak/FeatureServer | Publik |
| Survei rumah rusak Cianjur 2022 | BNPB (ArcGIS) | 24.427 titik rumah rusak (InaRisk + Rutena, per 1 Des 2022) | .../rumah_rusak_cianjur/MapServer/0 (dipakai `scripts/umum/lab_kerusakan.py`) | Historis |
| Data jalan dan jembatan putus akses | BNPB (ArcGIS) | 341 titik Aceh-Sumut-Sumbar-Riau, 24 Nov-2 Des 2025; sumber: Kompilasi Direktorat PERB BNPB 227, SITABA PU 62, Pusdalops 52 | .../Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13 | Berhenti diperbarui 2 Des 2025; tanpa status pulih |
| Survey123 "perangkat penilaian awal" | BNPB (ArcGIS) | Formulir penilaian bangunan (struktur, SNI, kerusakan); 8 rekaman | .../survey123/perangkat_penilaian_awal_final/FeatureServer/10 | Berisi nama, kontak, tanggal lahir responden dan **terbuka publik**. Risiko PDP; laporkan ke Pusdatinkom, jangan dipanen |
| SITABA (Sistem Tanggap Bencana) | Kementerian PU | Kanal lapor bencana, data penanganan infrastruktur PU (3.574 kegiatan 2019-2025) | https://sitaba.pu.go.id (infopublik.id) | Tanpa API publik yang ditemukan |
| Rutena (pendahulunya Sirumba) | Kementerian PU (kini PKP), Ditjen Perumahan | Pendataan rumah terdampak bencana, foto 360, penilaian kerusakan | suarapemerintah.id (2021), bisnis.com (2020) | Status 2026 tidak pasti; pemiliknya kini Kementerian PKP |
| DIBI | BNPB, Pusdatinkom | Kejadian dan dampak per kab | dipanen repo lewat Superset publik (`scripts/umum/dibi_kejadian.py`) | Rumah rusak = angka lapor awal, bukan hasil verifikasi |
| Data status keadaan darurat | BNPB, data.bnpb.go.id (CKAN) | SK status per kab | dipanen repo (`scripts/umum/status_darurat.py`, 2.481 SK 2018-2026) | - |

Tidak ditemukan aplikasi Jitupasna atau R3P daring resmi BNPB. Pencarian hanya memberi bimtek Jitupasna/R3P di daerah (RRI Padang Panjang, Antara Ambon). Dugaan: Jitupasna masih dikerjakan dengan formulir Perka 15/2011 di lembar kerja.

## 3. Modul repo yang sudah ada dan relevan

| Modul | Berkas | Apa yang sudah ada | Keadaan |
|---|---|---|---|
| Meja `kaji_cepat` | `src/meja_spek.js` baris 33-34, `src/meja.js` | Alur dilaporkan, diverifikasi, `masuk_jitupasna` | 0 baris produksi (semua tabel isian manusia kosong) |
| Meja `rehab` | `src/meja_spek.js` baris 99-126, `src/meja.js` baris 114-119, `public/bnpb/meja.js`, `public/admin/meja.js` | Rumah RB/RS/RR diusulkan, nilai usulan/disetujui/cair, rumah dibangun; tahap jitupasna, usulan, disetujui, cair, dibangun, selesai, ditolak; tanda `macet` | 0 baris; wajib tertaut catatan kaji cepat, jadi tidak pernah terisi bila kaji cepat kosong |
| Rumah rusak per rumah | `migrations/0024_rumah_rusak.sql`, `src/rumah_rusak.js`, `public/rumah_rusak.*` | Titik per rumah, tingkat, foto, koreksi berjejak | Butuh akun/regu; 0 baris |
| Tracker pemulihan | `migrations/0096_pusdalops_operasi.sql`, `src/pemulihan.js` (`/api/pusdalops/pemulihan*`) | huntara, huntap, DTH, jembatan gantung, sumur bor; target, realisasi, riwayat progres | Milik Pusdalops; staf saja |
| DIBI kejadian 365 hari | `scripts/umum/dibi_kejadian.py` -> `public/data/dibi_kejadian.json` (harian, `data.yml`) | 4.404 baris kejadian 28 Okt 2025-28 Okt 2026: RB 98.257, RS 93.414, RR 214.265, jembatan 911, fasum 6.415, pendidikan 4.187 | Hidup, otomatis |
| DIBI kab-tahun | `public/data/bnpb/dibi_kab_tahun.json` | 2015-2025, RB per kab per jenis | Hidup |
| Status darurat | `public/data/status_darurat.json`, `saran_status.json` | SK per kab, mulai, berakhir, status (siaga, tanggap, transisi) | Hidup, harian |
| Open Buildings | `scripts/umum/bangunan.py`, `paparan_bangunan.py`, `.github/workflows/bangunan.yml`, `src/bangunan.js` (`/api/bangunan/*`, login) | Grid bangunan 0,01 derajat per provinsi, paparan per bahaya | Hidup, di R2 |
| Lab kerusakan SAR | `scripts/umum/lab_kerusakan.py` -> `public/data/lab/kerusakan.json` | Uji Sentinel-1 amplitudo vs survei Cianjur | **Gagal** (tidak mengalahkan pembanding MMI saja maupun plasebo). Jangan diusulkan sebagai produksi |
| Puso | `scripts/bnpb/puso.py` -> `public/data/bnpb/puso.json` | Luas puso padi per kab dari BPS | Cakupan bolong per provinsi |
| Mesin berita | `scripts/umum/berita.py` + leksikon `scripts/berita/*.py` | Panen RSS per tema | Bisa ditambah leksikon baru |

Kesimpulan: kerangka layar (meja rehab, tracker pemulihan) sudah ada, tetapi pintunya form manusia dan 0 baris. Usulan di bawah membalik arah: isi otomatis dari sumber yang sudah mengalir, form hanya untuk koreksi.

## 4. Usulan lintas Deputi

### D1. Jam pascabencana per kab (R3P 90 hari dan tahapan hibah), dampak terbesar, ukuran S-M

- **Masalah.** Perban 5/2017 mewajibkan R3P mulai saat tanggap darurat dan selesai paling lama 90 hari, dan hibah RR mensyaratkan R3P (Perban 4/2024 Pasal 9 huruf c). Fungsi perencanaan kini tersebar di tiga direktorat (Perban 11/2025), jadi tidak ada satu daftar kab yang "jamnya sedang berjalan". Bukti: kasus Maluku 2019 belum punya R3P sampai 2023 (Antara Ambon); KERANGKA rehab §10 mencatat R3P Lombok, Sulteng, Sumut, Sumbar tidak ditemukan.
- **Pengguna dan keputusan.** Deputi RR dan tiga direktur: kab mana harus didampingi Jitupasna minggu ini; kab mana melewati 90 hari tanpa R3P; kab mana layak diundang mengusulkan hibah.
- **Masukan.** `public/data/status_darurat.json` (mulai tanggap darurat, transisi), `public/data/dibi_kejadian.json` (besaran dampak), `public/data/bnpb/dibi_kab_tahun.json` (riwayat). Frekuensi harian, sudah dipanen. Status R3P dan hibah per kab: satu centang staf (lihat risiko).
- **Aturan inti.**
  - Hari-0 = `mulai` SK pertama berstatus tanggap darurat untuk (kab, kejadian); kejadian digabung bila SK berurutan berjarak <= 14 hari (pola `perpanjangan` yang sudah ada).
  - Sisa = 90 - (hari ini - hari-0). Kelas: hijau > 30, kuning 1-30, merah <= 0 tanpa R3P tercatat.
  - Layak didampingi bila RB + RS kab dari DIBI dalam rentang SK >= ambang (bawaan 100 rumah) atau jembatan >= 1.
  - Urutan prioritas = (RB x 60 + RS x 30 + RR x 15) juta sebagai ukuran beban stimulan kasar, dibagi kapasitas fiskal tidak dipakai dulu (data APBD PB belum ada).
- **Pembuatan.** Pipeline `scripts/bnpb/jam_pascabencana.py` (stdlib, dirantai di `data.yml` sesudah `saran_status.py`) -> `public/data/bnpb/jam_pascabencana.json`. Tanpa tabel D1 baru: status "R3P ditetapkan" dan "hibah diusulkan" disimpan sebagai kolom di meja `rehab` yang sudah ada (tambah tahap `r3p` di depan `jitupasna`, dan lepaskan syarat wajib tertaut kaji cepat; `src/meja.js` baris 114-119). Layar: satu kartu `.ex.ex-std` di `public/bnpb/meja.js` tab Rehab, atau tampilan baru `public/bnpb/pascabencana.html` (masuk daftar `LAYAR` gerbang kartu standar).
- **Ukuran berhasil.** Jumlah kab berstatus merah turun; median hari dari tanggap darurat ke R3P tercatat (baseline dihitung dari SK + catatan staf).
- **Ketergantungan.** Tidak ada sumber publik status R3P. Tanpa centang staf, layar tetap menunjukkan jam berjalan (berguna) tetapi tidak tahu mana yang sudah selesai.
- **Risiko.** Kuota D1 nihil (JSON statis). Salah gabung kejadian bila SK tumpang tindih lintas jenis bencana; tampilkan nomor SK sumbernya.

## 5. Direktorat Rehabilitasi dan Rekonstruksi Perumahan

### 5.1 Tugas dan fungsi

Pasal 83 Perban 11/2025: "melaksanakan koordinasi penyusunan dan pelaksanaan kebijakan teknis, pemantauan, evaluasi, dan analisis pelaporan di bidang rehabilitasi dan rekonstruksi perumahan."
Pasal 84 Perban 11/2025: a. kebijakan teknis "perencanaan rehabilitasi dan rekonstruksi perumahan"; b. pelaksanaan kebijakan teknis; c. NSPK; d. "pemantauan, evaluasi, dan analisis pelaporan".

### 5.2 Kerja nyata

| Keluaran | Pengguna | Siklus | Dasar |
|---|---|---|---|
| Verifikasi rumah rusak by name by address (RB 0-30-70 persen kerusakan ke atas), lewat tim gabungan dan mahasiswa teknik sipil/arsitektur, lalu SK kepala daerah dan padan Dukcapil | BPBD kab, Dukcapil | Per kejadian, 2-8 minggu | Fakta: Aceh Timur 220 mahasiswa, bimtek Deputi RR 16 Jan 2026 (goodnewsfromindonesia.id); Sumbar 400 mahasiswa Unand (Republika 6 Jan 2026); NTT verifikasi 70 persen per 10 Sep 2026 (Antara Jogja) |
| Penyaluran stimulan rumah DSP Rp60/30/15 juta | Rumah tangga lewat pemda | Per kejadian | Juklak 5/2024 (teks tak tersedia); besaran: Kemenko PMK |
| DTH Rp600.000 per bulan, rekening Himbara | Rumah tangga | Bulanan, 3 bulan | Juklak 15/2025; Republika 6 Jan 2026 |
| Huntara, huntap | Pemda, K/L | Per kejadian | Juklak 3/2023; Republika: Sumatra usulan huntara 28.720, huntap 4.315 |
| Hibah RR sektor permukiman (stimulan masyarakat) | Pemda | Tahunan, laporan 3 bulanan di E-Pelaporan | Perban 4/2024, Juklak 9/2024 |
| Jitupasna sektor permukiman | BPBD, Bappeda | Per kejadian, dalam 90 hari | Perban 5/2017, Perka 15/2011 |

Bukti selisih lapor-verifikasi (hitungan sesi ini dari layer NTT, 10 kab, data 3 Nov 2026): lapor RB 25.833, RS 22.110, RR 47.807 (95.750 rumah); hasil verifikasi RB 6.348, RS 15.815, RR 32.062, tidak memenuhi kriteria (`verif_tmk`) 66.349, total diverifikasi 120.574. Contoh Nagekeo: RB lapor 4.079, RB terverifikasi 314. Dengan tarif 60/30/15 juta, beban stimulan versi lapor sekitar Rp2,93 triliun dan versi verifikasi sekitar Rp1,34 triliun (estimasi kita, bukan angka resmi). Arti kolom `rumah_rusak_independen` (119.040) belum diketahui.

### 5.3 Celah sistem resmi

Tidak ada sistem publik atau internal yang ditemukan yang menyandingkan angka lapor (DIBI), angka verifikasi, angka SK, dan angka tersalur per kab per kejadian. Angka Sumatra 2025 punya tiga versi (DIBI 228.006, BNPB sekitar 147.000, Kementerian PKP 189.308; riset F §4). Layer NTT menunjukkan BNPB sudah punya angka verifikasi digital, tetapi per kejadian dan tanpa riwayat.

### 5.4 Usulan

#### P1. Neraca rumah rusak per kab: lapor, verifikasi, tersalur, M

- **Masalah.** Tiga sampai empat versi angka rumah rusak per kejadian; keputusan anggaran DSP dibuat di atas angka yang bisa turun lebih dari separuh setelah verifikasi (NTT: RB turun dari 25.833 ke 6.348).
- **Pengguna dan keputusan.** Direktur Perumahan dan Deputi: berapa DSP stimulan yang realistis diajukan sekarang; kab mana verifikasinya tertinggal; kab mana angka lapornya tidak masuk akal.
- **Masukan.**
  - DIBI per kab per kejadian: `public/data/dibi_kejadian.json` (harian, ada).
  - Layer verifikasi BNPB per kejadian: `gis.bnpb.go.id/server/rest/services/<folder kejadian>/.../query?outFields=*&returnGeometry=false&f=json`; folder kejadian dicari otomatis dari daftar `?f=json` (pola nama `20xx_<jenis>_<wilayah>`), kolom `verif_*` bila ada. Harian.
  - Jumlah bangunan per kab/kec: grid Open Buildings (`bangunan.yml`, R2 `bangunan/kec.json`).
  - Tersalur: angka rilis BNPB lewat leksikon berita baru (lihat P2) dan baris staf di meja `rehab`.
- **Aturan inti.**
  - Per (kejadian, kab): L = lapor (RB, RS, RR), V = verifikasi (RB, RS, RR, TMK), S = SK/tersalur.
  - Kemajuan verifikasi = total_verif / L_total (bisa > 1: verifikasi menemukan rumah yang tidak dilaporkan).
  - Rasio susut RB = V_RB / L_RB. Pembanding kab lain di kejadian yang sama; bila belum ada V, pakai median rasio susut kejadian sejenis yang sudah punya V (estimasi berlabel, minimal 3 kab pembanding, kalau kurang tampilkan "belum ada pembanding").
  - Uji masuk akal: L_total kec > 0,8 x jumlah bangunan Open Buildings kec ditandai "periksa" (ambang dari kalibrasi Cianjur: survei 24.427 titik terhadap grid yang sama).
  - Beban stimulan = RB x 60 + RS x 30 + RR x 15 juta, dua kolom (lapor, verifikasi). Tarif disimpan satu tempat (`ATURAN` dalam skrip) karena BNPB mengusulkan RB naik ke Rp70-80 juta (Antara, 2026).
- **Pembuatan.** `scripts/bnpb/neraca_rumah.py` (stdlib, `urllib`) -> `public/data/bnpb/neraca_rumah.json` (agregat kab, sumber publik, jadi boleh publik). Dirantai di `data.yml` sesudah `dibi_kejadian.py`. Self-check `--uji` dengan tangkapan layer NTT tersimpan (`tests/bnpb/` atau berkas uji di samping skrip). Layar: kartu tabel di tab Rehab `public/bnpb/meja.js` atau `public/bnpb/pascabencana.html` (bersama D1). Tanpa D1.
- **Ukuran berhasil.** Untuk tiap kejadian dengan layer verifikasi, angka L, V, S tampil <= 24 jam setelah layer berubah; selisih estimasi beban stimulan terhadap SK akhir (diukur saat SK terbit).
- **Ketergantungan.** Bentuk layer ArcGIS berbeda tiap kejadian (Cianjur titik, NTT poligon kab). Pemetaan kolom per kejadian perlu satu kamus kecil di skrip; kejadian tanpa layer hanya menampilkan L.
- **Risiko.** Layer bisa ditutup BNPB; hanya ambil agregat kab, jangan titik per rumah (PDP). Kuota D1 nihil.

#### P2. Panen angka pemulihan dari rilis resmi ke tracker pemulihan, S-M

- **Masalah.** `pemulihan` dan meja `rehab` 0 baris karena menunggu ketikan staf. Angka huntara, huntap, DTH, rekening tersalur sudah terbit di rilis BNPB dan berita (contoh Republika 6 Jan 2026: huntara usulan 28.720, berjalan 1.840, selesai 80; DTH rekening 4.800 siap, 756 diterima).
- **Pengguna.** Direktur Perumahan, Pusdalops (pemilik tracker), pimpinan: realisasi vs target per kab tanpa rapat rekap.
- **Masukan.** RSS dan laman berita `bnpb.go.id/berita` + media nasional lewat `scripts/umum/berita.py`; harian.
- **Aturan.** Leksikon `scripts/berita/pemulihan.py`: kueri (huntara, huntap, dana tunggu hunian, stimulan rumah, rekening DTH). Ekstraksi pola "<angka> unit <huntara|huntap>" dan "<angka> (KK|rekening)" dengan nama kab dari `wilayah` yang sama dengan `dibi_kejadian`. Tiap angka menjadi **usulan baris** berlabel sumber URL dan tanggal; masuk tabel hanya setelah satu klik staf "benar" (bukan otomatis, karena berita memuat angka usulan dan realisasi bercampur).
- **Pembuatan.** Pipeline menulis `public/data/bnpb/usulan_pemulihan.json` (tanpa PDP). Rute baru `POST /api/pusdalops/pemulihan/terima` di `src/pemulihan.js` yang memanggil `buat`/`progres` yang sudah ada dengan `catatan` = URL sumber. Layar: daftar usulan di panel tracker yang sudah ada.
- **Ukuran berhasil.** Baris `pemulihan` > 0 untuk tiap kejadian besar dalam 7 hari; persentase usulan yang diterima staf (menunjukkan presisi ekstraksi).
- **Risiko.** Label R3 kajian rehab: angka media berstatus sekunder; layar wajib menampilkan sumber dan tanggal. Presisi ekstraksi belum teruji; mulai dengan uji 30 artikel berlabel tangan.

#### P3. Kalkulator Jitupasna permukiman berbasis Perka 15/2011, S

- **Masalah.** Formulir Perka 15/2011 dihitung manual; kebutuhan = unit x satuan biaya x indeks biaya, tetapi indeks biaya antarwilayah tidak tersedia di satu tempat.
- **Pengguna.** BPBD dan tim Jitupasna; Direktorat Perumahan saat praverifikasi.
- **Masukan.** Unit dari P1 (otomatis); satuan biaya = tarif stimulan atau harga satuan pemda (isian opsional); indeks biaya = Indeks Kemahalan Konstruksi (IKK) BPS per kab, lewat BPS WebAPI (kunci sudah di Keychain `bps-webapi`, pola `scripts/bnpb/puso.py`); tahunan.
- **Aturan.** Kerusakan = sum(unit_t x harga_t) untuk t di {RB, RS, RR}; kebutuhan = sum(unit_t x satuan_t x IKK_kab/100). Pemeriksaan ganda (Perka 15/2011 hlm 41): rumah yang masuk huntap tidak boleh juga menerima stimulan RB; tandai bila jumlah huntap + stimulan RB > RB terverifikasi.
- **Pembuatan.** Fungsi murni JS di `public/bnpb/jitupasna.js` (tanpa server), IKK dipanen ke `public/data/bnpb/ikk.json` oleh `scripts/bnpb/ikk.py`. Unit test fungsi murni di `tests/bnpb/`. Unduhan CSV sesuai kolom formulir lampiran 7 Perka 15/2011.
- **Ukuran.** Waktu dari data verifikasi ke angka kebutuhan sektor permukiman; dipakai di minimal satu R3P.
- **Risiko.** IKK BPS tidak tersedia untuk semua kab tiap tahun; isi kosong dengan IKK provinsi berlabel.

## 6. Direktorat Rehabilitasi dan Rekonstruksi Infrastruktur

### 6.1 Tugas dan fungsi

Pasal 86 Perban 11/2025: "melaksanakan koordinasi penyusunan dan pelaksanaan kebijakan teknis, pemantauan, evaluasi, dan analisis pelaporan di bidang rehabilitasi dan rekonstruksi infrastruktur."
Pasal 87 Perban 11/2025: a. kebijakan teknis "perencanaan rehabilitasi dan rekonstruksi infrastruktur"; b. pelaksanaan; c. NSPK; d. pemantauan, evaluasi, dan analisis pelaporan.

### 6.2 Kerja nyata

| Keluaran | Pengguna | Siklus | Dasar |
|---|---|---|---|
| Penilaian usulan hibah RR konstruksi: praverifikasi dokumen, verifikasi lapangan (penyebab kerusakan, volume, desain dan nilai, kesiapan pemda), reviu APIP, berita acara | Pemda pengusul, Kemenkeu, APIP | Tahunan, per usulan | Perban 4/2024 Pasal 14-20 |
| Pemantauan pelaksanaan hibah: laporan berkala 3 bulanan, perubahan RKA (volume <= 10 persen), laporan akhir, foto geotag 0/50/100 persen, peta aset | Pemda penerima | Triwulan | Juklak 9/2024 |
| Kompilasi jalan dan jembatan putus pada kejadian besar | Deputi, K/L, Satgas | Per kejadian | Layer `Data_Jalan_Jembatan_Putus_Akses_PU` (227 titik "Direktorat PERB") |
| Koordinasi jembatan bailey DSP, jembatan gantung PU, Jembatan Garuda TNI AD | K/L, TNI, pemda | Per kejadian | Riset B kajian rehab; rilis BNPB 31 Des 2025 |
| Jitupasna sektor infrastruktur (transportasi, SDA, air bersih, sanitasi, energi) | BPBD, Bappeda | Per kejadian | Perban 5/2017 Pasal 8 ayat (2) huruf b |

Bukti: DIBI 2018-2025 mencatat 3.833 jembatan rusak, 2025 tertinggi 1.088 (riset F); 365 hari terakhir 911 jembatan (`dibi_kejadian.json`). Hibah RR yang disalurkan Rp9,71 triliun (medcom.id, tahun tidak dicek).

### 6.3 Celah

E-Pelaporan dan Mapping Aset tertutup dan tidak disandingkan dengan peta bahaya; layer jalan-jembatan putus berhenti 2 Des 2025 dan tidak punya status "pulih"; Perban 4/2024 Pasal 5 huruf e melarang membiayai aset desa, tetapi tidak ada alat yang mendeteksinya di tahap usulan.

### 6.4 Usulan

#### I1. Daftar akses putus sampai pulih, M

- **Masalah.** Titik putus dikompilasi saat darurat lalu berhenti (layer berhenti 2 Des 2025), padahal keputusan RR (bailey jadi permanen, siapa membangun) baru dimulai sesudahnya.
- **Pengguna.** Direktur Infrastruktur, Satgas, Pusdalops: titik mana masih putus setelah N hari; mana ditangani bailey dan perlu permanen; pemilik aset (nasional, provinsi, kab, desa).
- **Masukan.** Layer ArcGIS di atas (341 titik, publik); DIBI jembatan per kab; OSM jalan dan jembatan (`bridge=yes`, `highway=*`) untuk kelas jalan dan pemilik (ref jalan nasional); Overpass, mingguan. Status pulih: SITABA bila nanti ada akses, sementara laporan WA lewat bot yang sudah ada (`scripts/wa/**`) dengan kata kunci "jembatan <nama> dibuka".
- **Aturan.** Satukan titik dari beberapa sumber bila berjarak <= 200 m dan nama desa sama. Kelas pemilik dari tag OSM terdekat <= 50 m: `ref` berawalan nasional atau `highway=trunk/primary` -> nasional (PU Bina Marga); `secondary` -> provinsi; lain -> kab/desa. Umur putus = hari ini - `dt`. Tanda "aset desa: tidak bisa hibah RR (Perban 4/2024 Pasal 5 huruf e)" untuk kelas desa.
- **Pembuatan.** `scripts/bnpb/akses_putus.py` -> `public/data/bnpb/akses_putus.json` (titik prasarana publik, bukan PDP). Status pulih dari WA ke tabel D1 kecil `akses_status (titik_id TEXT, tgl TEXT, status TEXT CHECK IN ('putus','darurat','pulih'), sumber TEXT, oleh TEXT)` lewat migrasi baru (nomor berikut). Layar: lapisan di peta `/bnpb/operasi` atau kartu di halaman pascabencana D1.
- **Ukuran.** Median umur putus per kejadian; jumlah titik berstatus "darurat" (bailey) yang belum punya pemilik permanen.
- **Risiko.** Pembagian kelas jalan dari OSM kasar; tulis sebagai estimasi. Kuota D1 kecil (ratusan baris).

#### I2. Prapemeriksaan usulan hibah RR (praverifikasi berbantuan), M-L

- **Masalah.** Praverifikasi Perban 4/2024 Pasal 15 menelaah dokumen administrasi; verifikasi lapangan Pasal 16 memeriksa penyebab kerusakan dan volume. Pemeriksaan "apakah lokasi kegiatan memang kena bencana itu" dan "apakah ini aset desa" bisa dikerjakan mesin sebelum tim berangkat.
- **Pengguna.** Tim penilai Direktorat Infrastruktur (dan Perumahan untuk stimulan); APIP.
- **Masukan.** Lembar kegiatan usulan (Excel/CSV rincian kegiatan yang memang sudah dibuat pemda untuk usulan: nama kegiatan, desa, koordinat, volume, nilai) diunggah staf; jejak bahaya dari repo: poligon banjir (`public/banjir/data/kejadian_aktif_geo.json` dan arsipnya), MMI gempa (`scripts/gempa/guncangan.py`), longsor (`public/longsor/data`), KRB; DIBI kejadian; status darurat.
- **Aturan.** Per baris kegiatan: (1) ada SK status darurat untuk kab itu dengan jenis bencana cocok dalam 3 tahun (masa R3P, Pasal 10); (2) titik di dalam jejak bahaya kejadian atau <= 2 km darinya, kalau tidak "periksa lapangan"; (3) kata kunci aset desa ("jalan desa", "jembatan desa", "milik desa") -> tandai Pasal 5 huruf e; (4) nilai per satuan dibanding median kegiatan sejenis dalam usulan yang sama dan riwayat (mulai dari isian staf), > 2x median -> tanda; (5) kegiatan normalisasi sungai atau pembelian lahan -> tanda Pasal 5. Keluaran daftar tanda, bukan putusan.
- **Pembuatan.** Fungsi murni di `public/bnpb/praverifikasi.js` (berjalan di peramban, berkas tidak keluar dari komputer staf), jejak bahaya dibaca dari JSON publik yang sudah ada. Tanpa D1 di tahap awal.
- **Ukuran.** Proporsi tanda yang terbukti benar saat verifikasi lapangan (dicatat staf); waktu praverifikasi per usulan.
- **Ketergantungan.** Pemilik harus memastikan staf mau mengunggah lembar usulan; jejak bahaya historis lebih dari 1 tahun belum diarsip untuk semua jenis.
- **Risiko.** Dokumen usulan bisa memuat data pribadi penerima stimulan; olah di peramban saja.

#### I3. Aset hasil hibah di atas peta bahaya terkini, S (bila ekspor Mapping Aset bisa didapat)

- **Masalah.** Aset hasil RR (Format 15 Juklak 9/2024: lat, lon, jenis, nilai) dibangun ulang di lokasi yang sama; tidak ada pemantauan apakah aset itu terkena bencana lagi.
- **Aturan.** Silangkan titik aset dengan paparan harian yang sudah ada (`scripts/umum/paparan_bangunan.py` memakai logika yang sama untuk bangunan). Keluaran: aset hibah terpapar per kejadian baru, dan statistik "aset RR rusak lagi dalam 5 tahun".
- **Pembuatan.** Satu fungsi tambahan di `paparan_bangunan.py` yang membaca `data/terkunci/rehab/aset_hibah.json` (R2, login), keluaran di `/api/bangunan/terpapar` yang sudah ada.
- **Ketergantungan.** Ekspor dari Aplikasi Mapping Aset BNPB (tertutup); tanpa itu usulan ini tidak jalan.

## 7. Direktorat Rehabilitasi dan Rekonstruksi Sosial, Ekonomi, dan Lingkungan Hidup

### 7.1 Tugas dan fungsi

Pasal 89 Perban 11/2025: "melaksanakan koordinasi penyusunan dan pelaksanaan kebijakan teknis, pemantauan, evaluasi, dan analisis pelaporan di bidang rehabilitasi dan rekonstruksi sosial, ekonomi, dan lingkungan hidup."
Pasal 90 Perban 11/2025: a. kebijakan teknis "perencanaan rehabilitasi dan rekonstruksi sosial, ekonomi, dan lingkungan hidup"; b. pelaksanaan; c. NSPK; d. pemantauan, evaluasi, dan analisis pelaporan.

### 7.2 Kerja nyata

| Keluaran | Pengguna | Siklus | Dasar |
|---|---|---|---|
| Stimulan petani puso akibat banjir (DSP) | Petani lewat pemda | Per kejadian | Juknis 1/2024 (BERLAKU) |
| Jitupasna sektor ekonomi (pertanian, UMKM, pasar, pariwisata), sosial (kesehatan, pendidikan, agama, psikososial), lintas sektor (lingkungan, PRB) | BPBD, Bappeda | Per kejadian | Perban 5/2017 Pasal 8 ayat (2) huruf c-e |
| Hibah RR nonkonstruksi (kajian kebutuhan dari perangkat daerah teknis) | Pemda | Tahunan | Perban 4/2024 Pasal 9 huruf g |
| Bantuan berpola hibah penghidupan (contoh rumput laut) | Kelompok masyarakat | Per program | Perka 8/2012 (BERLAKU, lama) |

Dugaan (belum bersumber): sebagian besar kerja direktorat ini berupa rapat koordinasi K/L dan penyusunan bab sektor R3P, karena pelaksana sektoral adalah kementerian teknis.

### 7.3 Celah

Tidak ditemukan sistem resmi untuk sektor ekonomi dan lingkungan pascabencana. Data dampak sektor ekonomi tidak ada di DIBI (DIBI hanya korban, rumah, fasilitas). Fasilitas pendidikan rusak ada di DIBI (4.187 dalam 365 hari), fasilitas kesehatan dan ibadah tidak (`scripts/umum/dibi_kejadian.py` docstring).

### 7.4 Usulan

#### S1. Taksiran cepat kerugian pertanian per kab, S-M

- **Masalah.** Bab ekonomi Jitupasna butuh angka kerugian pertanian, sementara data puso resmi baru keluar tahunan dan bolong (`puso.json`: banyak provinsi tanpa tabel kab).
- **Pengguna.** Direktorat SEL-LH, Bappeda, Dinas Pertanian: besaran usulan stimulan puso (Juknis 1/2024) dan bab ekonomi R3P.
- **Masukan.** Luas genangan dari modul banjir (poligon kejadian, `public/banjir/data/`); sawah dari peta lahan baku sawah (ATR/BPN) atau ESA WorldCover kelas cropland bila LBS tidak bisa diunduh; produktivitas padi kab dan harga GKP dari BPS WebAPI (kunci ada); fase tanam dari kalender tanam Kementan (Katam) bila terbuka.
- **Aturan.** Kerugian = luas sawah tergenang (ha) x P(puso | genangan >= 7 hari) x produktivitas (ton/ha) x harga GKP. P(puso) dikalibrasi dari `puso.json` historis terhadap luas genangan tahun yang sama (regresi per kab-tahun); bila kalibrasi gagal mengalahkan pembanding rata-rata kab, tampilkan hanya luas tergenang, bukan rupiah (pola jujur lab di repo).
- **Pembuatan.** `scripts/bnpb/rugi_tani.py` -> `public/data/bnpb/rugi_tani.json`; kriteria uji dikunci dulu seperti `scripts/data/lab_kriteria/`. Kartu di halaman pascabencana D1.
- **Ukuran.** Galat taksiran terhadap puso BPS tahun berikut (prospektif).
- **Risiko.** Data sawah dan fase tanam mungkin tidak tersedia terbuka; kalibrasi bisa gagal. Ukuran L bila LBS harus dipanen dari layanan tertutup.

#### S2. Kurva pulih kegiatan ekonomi dari lampu malam, L, mulai sebagai lab

- **Masalah.** Perban 6/2017 Pasal 10 meminta keluaran berupa manfaat bagi korban, tetapi tidak ada indikator pulih yang terukur dan murah. Pemantauan sekarang = laporan berkala administrasi.
- **Pengguna.** Deputi RR, Bappenas: kab mana belum pulih 6, 12, 24 bulan setelah kejadian.
- **Masukan.** NASA Black Marble VNP46A3 bulanan (publik, LAADS DAAC, butuh token Earthdata gratis), grid Open Buildings untuk memisah kawasan permukiman; kejadian besar dari `dibi/kejadian_besar.csv` paket kajian.
- **Aturan.** Per kecamatan permukiman: indeks = radiansi bulan t / median 12 bulan sebelum kejadian (bulan yang sama musimnya); pulih bila >= 0,95 tiga bulan berturut. Uji balik pada Palu 2018, Lombok 2018, Cianjur 2022 dengan plasebo (kecamatan tak terdampak sekitar), kriteria lolos dikunci sebelum hasil dilihat (pola `lab_kerusakan.py`).
- **Pembuatan.** `scripts/umum/lab_pulih_malam.py` -> `public/data/lab/pulih_malam.json`, tanpa layar sampai lolos.
- **Risiko.** Pelajaran dari lab SAR: sinyal satelit gagal mengalahkan pembanding sederhana. Lab ini bisa gagal juga; jangan dijanjikan ke pimpinan sebelum vonis.

#### S3. Daftar fasilitas sosial rusak untuk bab sosial R3P, S

- **Masalah.** Fasilitas pendidikan rusak tercatat di DIBI per kab, tetapi bab sosial R3P perlu nama sekolah; data ada di Dapodik (Kemendikdasmen, publik per sekolah dengan koordinat) dan fasilitas kesehatan di data Kemenkes.
- **Aturan.** Untuk kejadian dengan jejak bahaya (banjir poligon, MMI >= VII, longsor), daftar sekolah dan puskesmas di dalam jejak, urut jumlah murid. Bandingkan jumlah dengan `f_pendidikan` DIBI kab; selisih besar = tanda pendataan belum lengkap.
- **Pembuatan.** Panen referensi sekolah (`scripts/bnpb/sekolah.py`, bulanan) ke R2; silang di `paparan_bangunan.py` (fungsi yang sama dengan I3). Keluaran login.
- **Risiko.** Dapodik mungkin menolak panen massal; sumber alternatif OSM `amenity=school` (cakupan lebih rendah).

## 8. Urutan kerja yang disarankan

1. D1 jam pascabencana dan P1 neraca rumah (sumber publik sudah mengalir, tanpa form, tanpa D1). Ukuran S + M.
2. Ubah meja `rehab` agar tidak wajib tertaut kaji cepat (tanpa itu meja tidak akan pernah terisi). Ukuran S.
3. P2 panen angka pemulihan, I1 akses putus.
4. P3, I2, S1, S3.
5. I3 dan S2 menunggu data (ekspor Mapping Aset, token Earthdata) atau vonis lab.

Pengerja menurut AGENTS.md: pipeline `scripts/bnpb/**` dan layar `public/bnpb/**` = `ruang-bnpb`; perubahan `src/meja.js`, `src/pemulihan.js`, migrasi = `warga-api` lalu `migrasi-idempoten`; angka di layar diperiksa `selera-angka`; S1/S2 diperiksa `validasi-model`.

## 9. Pertanyaan untuk pemilik

| No | Pertanyaan | Bawaan bila tidak dijawab |
|---|---|---|
| 1 | Bolehkah kita memanen layer ArcGIS publik `gis.bnpb.go.id` (agregat kab saja) dan menampilkannya di layar login? | Ya, agregat kab, layar login dulu; titik per rumah tidak dipanen |
| 2 | Layer `survey123/perangkat_penilaian_awal_final` membuka nama, kontak, tanggal lahir responden ke publik. Mau dilaporkan ke Pusdatinkom? | Ya, pemilik menyampaikan; kita tidak memanen layer itu |
| 3 | Siapa pemilik Jitupasna/R3P lintas sektor setelah Direktorat Perencanaan RR dihapus? (penentu siapa pengguna D1) | D1 ditujukan ke Deputi RR langsung, dengan tiga direktur sebagai pembaca |
| 4 | Tarif stimulan yang dipakai di estimasi: 60/30/15 juta atau usulan baru 70-80 juta RB? | 60/30/15 juta, satu konstanta, label "tarif berlaku menurut rilis 2023-2024" |
| 5 | Meja `rehab` boleh dilepas dari syarat tertaut kaji cepat (diisi dari P1 dan centang staf)? | Ya |
| 6 | Bisakah pemilik meminta ekspor E-Pelaporan dan Mapping Aset (CSV) dari Deputi RR? | Tidak dianggap tersedia; I3 ditunda |
| 7 | Angka dari berita (P2) boleh masuk tracker setelah klik staf, berlabel sekunder? | Ya, dengan URL sumber wajib tampil |
| 8 | Teks Juklak 5/2024 (stimulan rumah DSP) bisa dimintakan? Korpus tidak memuatnya | Pakai besaran dari rilis; sebut juklak tanpa kutipan pasal |
| 9 | Halaman pascabencana untuk publik atau login? | Login (staf BNPB/BPBD), karena memuat angka beda versi yang belum direkonsiliasi |
| 10 | S2 lab lampu malam layak dijalankan (perlu token Earthdata gratis atas nama pemilik)? | Ditunda sampai pemilik setuju |

## 10. Sumber

Korpus lokal: `perban-nomor-11-tahun-2025.txt` dan `perban-nomor-6-tahun-2025.txt` (scratchpad); `data/raw/hukum/teks/perban-nomor-5-tahun-2017.json`, `perban-nomor-6-tahun-2017.json`, `perban-nomor-4-tahun-2024.json`, `juklak-nomor-9-tahun-2024.json`, `perka-nomor-15-tahun-2011.json`; `data/kajian-bnpb/rehab/` (KEPUTUSAN-AWAL, riset A dan F).

Web (dibuka atau dikueri 5 Nov 2026):
- [Juklak 9/2024 JDIH BNPB](https://jdih.bnpb.go.id/download-lampiran/juklak-nomor-9-tahun-2024)
- [Perban BNPB 4/2024 di BPK](https://peraturan.bpk.go.id/Download/360552/peraturan-bnpb-no-4-tahun-2024.pdf)
- [Layanan ArcGIS BNPB](https://gis.bnpb.go.id/server/rest/services) (layer NTT 2026, jalan-jembatan putus, Survey123, rumah rusak Cianjur)
- [Kemenko PMK: standar biaya bantuan rumah rusak](https://kemenkopmk.go.id/node/4634)
- [Antara: BNPB minta tambah biaya rumah penyintas Sumatera](https://www.antaranews.com/berita/5632767/bnpb-minta-tambah-biaya-bangun-rumah-penyintas-banjir-sumatera)
- [Republika 6 Jan 2026: validasi data rumah rusak Sumatera](https://news.republika.co.id/berita/t8fxoa416/bnpb-percepat-validasi-data-rumah-rusak-di-sumatera)
- [Antara Jogja: verifikasi rumah gempa NTT 70 persen](https://jogja.antaranews.com/berita/853243/bnpb-korban-gempa-ntt-capai-136-jiwa-70-persen-rumah-terverifikasi)
- [GNFI: 220 mahasiswa nilai kerusakan Aceh Timur](https://www.goodnewsfromindonesia.id/short/bnpb-terjunkan-220-mahasiswa-untuk-nilai-kerusakan-bencana-aceh-timur)
- [Infopublik: SITABA Kementerian PU](https://infopublik.id/kategori/nasional-ekonomi-bisnis/991461/kementerian-pu-sediakan-sitaba-sebagai-kanal-pelaporan-darurat-bencana); [sitaba.pu.go.id](https://sitaba.pu.go.id)
- [Suara Pemerintah: Rutena](https://suarapemerintah.id/2021/05/kempupera-luncurkan-sistem-informasi-pendataan-rutena/); [Bisnis: Sirumba](https://ekonomi.bisnis.com/read/20200901/47/1285740/tim-reaksi-cepat-perumahan-dibentuk-sirumba-pun-disiapkan)
- [Medcom: hibah RR Rp9,71 triliun](https://www.medcom.id/ekonomi/bisnis/GbmaDpyb-pemerintah-salurkan-rp9-71-triliun-hibah-rehabilitasi-dan-rekonstruksi-pascabencana)
- [Antara Ambon: pendampingan Jitupasna dan R3P Maluku](https://ambon.antaranews.com/berita/177795/bnpb-maluku-gelar-pelatihan-petugas-rehabilitasi-rekonstruksi-pascabencana)

Tidak bisa diakses: berita peluncuran E-Proposal (voinews.id, 404), voi.id (403), RFQ Palladium transformasi digital Deputi RR (404), teks Juklak 5/2024 dan Perka 5/2012 (tidak ada di korpus), LAKIP/Renstra BNPB 2025-2029 untuk IKU Deputi RR (tidak ditemukan lewat pencarian).
