# Riset unit 6: Sekretariat Utama, Inspektorat Utama, Pusdiklat PB, Pusbin JF Kebencanaan

Disusun 5 Nov 2026 untuk Centurisk97. Pusat Data diurus agen lain, tidak dibahas.
Tanda: **[F]** fakta bersumber, **[D]** dugaan yang perlu dicek pemilik.

## 0. Susunan pasti dan temuan lintas unit

Dasar: Perban 6/2025 (OTK) jo. Perban 11/2025 (ditetapkan 30 Des 2025). Kutipan di bawah sudah dicocokkan ke teks penuh di scratchpad.

| Unit | Pasal | Catatan perubahan 11/2025 |
| --- | --- | --- |
| Sekretariat Utama | Ps 20-23 Perban 6/2025 | tetap: 4 biro |
| Biro Perencanaan | Ps 24-26 | tetap |
| Biro Keuangan | Ps 27-29 | tetap |
| Biro SDM dan Umum | Ps 30-40 | Ps 32-36 diubah, Ps 36A-36C disisipkan: lahir **Bagian Pengadaan Barang dan Jasa**; Bagian Rumah Tangga tinggal rumah tangga, perlengkapan, BMN |
| Biro Hukum, Organisasi, dan Kerja Sama | Ps 41-43 | tetap |
| Inspektorat Utama (Inspektorat I, II, III, Bagian TU) | Ps 101-112 | tetap |
| Pusdiklat PB | Ps 117-120 | tetap |
| Pusat Pembinaan Jabatan Fungsional Kebencanaan | Ps 121-124 Perban 11/2025 | **baru**: Paragraf 12 dan Ps 121-124 yang semula mengatur Pusat Pengendalian Operasi diganti seluruhnya |

Tiga temuan yang menyangkut lebih dari satu unit:

1. **[F] Celah lingkup pengawasan.** Ps 106-107 Perban 6/2025 (lingkup Inspektorat II) masih menyebut Pusat Pengendalian Operasi dan tidak diubah oleh Perban 11/2025; Pusbin JF Kebencanaan tidak masuk lingkup Inspektorat I maupun II. Selain itu, Ps 121-124 yang dulu mengatur Pusdalops kini mengatur Pusbin JF; di mana Pusdalops sekarang diatur perlu dicek oleh agen Pusdalops. Ini bahan untuk Biro Hukum, Organisasi, dan Kerja Sama dan Inspektorat Utama.
2. **[F] Status JDIH salah.** Dari 233 dokumen di `public/data/bnpb/hukum/katalog.json`, mesin relasi `scripts/bnpb/hukum.py` sudah menangkap **15 pasangan** "mencabut/mengganti" yang sasarannya masih tertulis BERLAKU (misalnya Perban 2/2025 mencabut Perka 4/2016, Perban 6/2025 mencabut Perban 4/2019, Perban 5/2025 mencabut Perban 5/2020). Ada pula yang tidak tertangkap mesin: **Ps 60 Perban 4/2025 mencabut Perban 6/2021, 7/2021, 1/2022, dan 2/2022**, dan keempatnya masih BERLAKU di katalog. Sebabnya, jarak kata "dicabut" ke sitasi melebihi jendela 400 karakter di `_konteks()`. Setidaknya 19 dokumen jadi salah status, termasuk juknis JF yang dipakai Pusbin JF.
3. **[F] Angka tata kelola tersedia di repo.** `data/kajian-bnpb/pustaka/5-lakip.md` (catatan LAKIP BNPB 2025) sudah memuat nilai 22 komponen Indeks RB 2024, capaian SS2 per biro dan pusat, serta realisasi anggaran per unit. `public/bnpb/kinerja.*` (`scripts/bnpb/iku.py`) hanya menampilkan SS1 (IRB, kapasitas, kerugian/PDB) dan belum menampilkan SS2. Data untuk sebagian besar usulan di bawah sudah ada, tinggal dihitung.

Fakta sumber daya **[F]** (LAKIP 2025 hal. 5-6): 1.150 pegawai BNPB; Settama 26,09%, Itama 6,00%, Pusdiklat 4,00%; 560 pejabat fungsional (49,21%). Anggaran SS2 2025 Rp309,07 M dengan realisasi 87,37% (Lamp. 10).

---

## 1. Biro Perencanaan

### 1.1 Tugas dan fungsi
"melaksanakan koordinasi penyusunan program dan anggaran yang bersumber dari anggaran pendapatan dan belanja negara dan nonanggaran ... serta pemantauan, evaluasi, dan penyusunan laporan Badan Nasional Penanggulangan Bencana" (Ps 24 Perban 6/2025). Fungsinya: program dan anggaran APBN, program dan anggaran non-APBN luar dan dalam negeri, serta monev dan pelaporan (Ps 25).

### 1.2 Kerja nyata
- **[F]** Menyusun Renstra (Perban 5/2025, 2025-2029). Datanya wajib ada di **KRISNA-RENSTRA** (Ps 3 Perban 5/2025). Renstra memuat 2 sasaran strategis, 7 sasaran program dengan 12 indikator, dan target eselon II.
- **[F]** Target Biro Perencanaan (Renstra Tabel 4.7): Indeks Perencanaan Pembangunan 88 (2025) naik ke 92 (2029); Capaian Layanan Prioritas Nasional 75% naik ke 79%; SAKIP 78,39 naik ke 79,19.
- **[F]** Realisasi 2025 (LAKIP): Indeks Perencanaan 88,44; Capaian PN 90,33%; SAKIP 2025 78,86 (BB). Anggaran biro Rp42,90 M, realisasi 72,34%.
- **[F]** Siklus: Renja dan RKA-K/L tahunan, revisi DIPA, PK awal tahun (PK 2025 diubah 21 Okt 2025), monev triwulan (IKU dan IKP dari laporan triwulan; Renstra hal. 151), LAKIP tahunan, evaluasi RB/AKIP oleh KemenPANRB.
- **[D]** Sehari-hari biro mengejar data capaian dari unit tiap triwulan lewat surat dan spreadsheet.
- Pedoman perencanaan yang tersedia di korpus hanya Perka 16/2011 (Pedoman Perencanaan Kegiatan dan Anggaran, BERLAKU, 3 halaman, sudah tua).

### 1.3 Sistem resmi
| Sistem | URL | Fungsi | Celah |
| --- | --- | --- | --- |
| KRISNA (Bappenas, Kemenkeu, KemenPANRB) | https://krisna.systems | Renja, RKA-K/L, Renstra | tertutup; tidak ada tampilan lintas unit untuk pimpinan BNPB |
| e-Monev Bappenas | https://e-monev.bappenas.go.id (403 dari mesin kita) | monev PP 39/2006 | tidak bisa diakses |
| SIRUP (LKPP) | https://sirup.inaproc.id | rencana umum pengadaan | publik, sudah dipanen di `docs/pendanaan/sirup_tarik.py` |

### 1.4 Usulan
**P1. Rapor Reformasi Birokrasi: di mana poin hilang (S)**
- Masalah: IKSS 2 (Indeks RB) adalah satu dari tiga indikator Kepala BNPB, tetapi tidak tampil di layar kita. **[F]** Dari LAKIP hal. 73-94, beberapa komponen RB 2024 bernilai 0 atau rendah: Indeks Kualitas Kebijakan 0 (0/1,5), Indeks Reformasi Hukum 0 (0/1,5), Tata Kelola Pengadaan 22,02 (0,44/2), Sistem Merit 2,78/4, BerAKHLAK 2,45/4, tindak lanjut LAPOR 0,6/1,5, Capaian IKU 5,5/7.
- Pengguna: Sestama dan Kepala Biro Perencanaan, yang memutuskan komponen mana yang dikejar tahun ini dan unit mana pemiliknya.
- Data: `data/kajian-bnpb/pustaka/5-lakip.md` (22 komponen: nilai, bobot, nilai tertimbang) dan target Renstra Tabel 4.7 (`3-renstra.md`). Dimutakhirkan tahunan saat surat hasil evaluasi KemenPANRB terbit.
- Rumus: `poin_hilang = bobot - nilai_tertimbang`. Prioritas = poin_hilang dikali faktor kemudahan (1 untuk komponen yang cukup dikejar dengan ikut pengukuran, misalnya IKK dan IRH; 0,5 bila butuh perubahan proses; 0,25 bila struktural). Pemilik komponen diambil dari peta unit di Renstra hal. 68 dan 119-139.
- Bangun: tambah blok `rb` di `scripts/bnpb/iku.py` dengan keluaran `public/data/bnpb/iku.json` kunci `rb` (deret 2022-2025 bila ada), lalu satu kartu `.ex-std` baru di `public/bnpb/kinerja.js`: tabel komponen, bobot, nilai, poin hilang, pemilik. Tanpa D1, tanpa rute.
- Ukuran: poin hilang 2025 lebih kecil dari 2024; IKK dan IRH tidak lagi 0.
- Risiko: angka tahunan dan statis; surat KemenPANRB bisa terlambat (LAKIP 2025 mencatat "belum keluar"). Tidak ada data pribadi.

**P2. Peta belanja lawan peta risiko dari SIRUP (M)**
- Masalah: SS1 menuntut IRB turun 1,2% per tahun dan daerah berkapasitas minimal sedang naik dari 67% ke 90%, tetapi tidak ada alat yang menunjukkan apakah belanja BNPB jatuh di kabupaten berisiko tinggi dan berkapasitas rendah. **[F]** LAKIP: Destana 10 dipangkas jadi 4 desa, distribusi logpal ke 194 daerah, pemulihan 86 dipangkas jadi 48 daerah.
- Pengguna: Biro Perencanaan saat menyusun Renja dan RKA, serta deputi teknis, yang memutuskan lokasi.
- Data: SIRUP BNPB 2024-2026 (penyedia 1.439 dan swakelola 1.214 paket untuk 2025) dengan kolom `lokasi`/`idsLokasi` dan `kegiatan` (swakelola), sudah di `docs/pendanaan/cache/*.json`. Ditarik ulang bulanan. Risiko dan kapasitas dari `public/data/bnpb/terpapar.json`, `ikd.json`, dan indeks risiko kecamatan (`scripts/bnpb/risiko.py`).
- Rumus: per kabupaten, `pangsa_belanja = pagu_kab / pagu_total_berlokasi` dan `pangsa_kebutuhan = (terpapar_kab x (1 - kapasitas_kab)) / jumlah`. Rasio = pangsa_belanja / pangsa_kebutuhan. Rasio di bawah 0,5 pada kabupaten 20% teratas kebutuhan ditandai "kurang dilayani". Paket berlokasi "Jakarta" karena kantor pusat dikeluarkan dan dilaporkan terpisah sebagai porsi "tak berlokasi".
- Bangun: `scripts/bnpb/belanja_risiko.py` (stdlib, memakai ulang `docs/pendanaan/sirup_tarik.py`) dengan keluaran `public/data/bnpb/belanja_risiko.json`. Tab baru di `public/bnpb/perencanaan.js` (sekarang tiga tab Pusdalops) atau halaman `public/bnpb/anggaran.html`. Workflow bulanan di `data.yml`.
- Ukuran: porsi pagu di 20% kabupaten berkebutuhan teratas, diukur per tahun.
- Risiko: RUP adalah rencana, bukan realisasi. Banyak paket berlokasi pusat. DSP (Rp3,73 T) tidak masuk RUP dan harus diberi catatan. Tidak ada data pribadi.

**P3. Kalender monev dan tenggat pelaporan (S)**
- Masalah **[D]**: tenggat (PK, laporan triwulan, LAKIP, evaluasi RB, TLHP 60 hari, laporan pelatihan 7 hari kerja) tersebar di banyak peraturan.
- Bangun: JSON statis tenggat dari korpus JDIH (pasal dikutip otomatis dari `hukum.py`), ditampilkan sebagai kalender di `/bnpb/kinerja`. Pengingat WA lewat `wa_antre` hanya bila pemilik setuju.
- Ukuran: jumlah tenggat yang tercatat beserta pasalnya. Dampak kecil, jadi prioritas terakhir.

---

## 2. Biro Keuangan

### 2.1 Tugas dan fungsi
"melaksanakan koordinasi, pengelolaan, dan pelaksanaan anggaran di lingkungan Badan Nasional Penanggulangan Bencana" (Ps 27). Fungsinya meliputi pengeluaran, perbendaharaan, "penyelesaian kerugian negara", PNBP, dan "pelaksanaan verifikasi dan akuntansi anggaran serta penyusunan laporan keuangan" (Ps 28).

### 2.2 Kerja nyata
- **[F]** Laporan keuangan BNPB: WTP ke-14 berturut-turut (LK 2024). Dalam 16 tahun: 2 disclaimer, 1 WDP, 14 WTP (LAKIP hal. 93).
- **[F]** IKPA Desember 2025 94,30 (Sangat Baik; target Renstra 89). Indeks Kepuasan Layanan Keuangan 86,61.
- **[F]** Pagu 2025 Rp4,91 T, blokir Rp438,87 M, realisasi 99,90% dari pagu efektif dan 90,97% dari pagu total. LAKIP sendiri mencatat beberapa angka tidak konsisten antar-tabel; misalnya persentase Biro Keuangan tertulis 72,34% padahal 137,2/143,4 = 95,69% (`5-lakip.md` baris 199 dan 252-253).
- **[F]** Peraturan yang berlaku di korpus: Perka 3/2015 (layanan operasional keuangan terintegrasi), Perka 10/2014 (verifikasi dokumen pertanggungjawaban), Perka 9/2011 (verifikasi dan akuntansi), Perka 2/2016 (pengelolaan dan pertanggungjawaban keuangan), Perban 3/2024 (penyelesaian kerugian negara terhadap pegawai bukan bendahara), Perka 4/2010 (akuntansi persediaan).
- **[D]** Siklus: SPM harian, rekonsiliasi bulanan dengan KPPN, LK semesteran dan tahunan, serta pemantauan IKPA bulanan.

### 2.3 Sistem resmi
| Sistem | URL | Fungsi | Celah |
| --- | --- | --- | --- |
| SAKTI (Kemenkeu) | https://sakti.kemenkeu.go.id | penganggaran, pelaksanaan, akuntansi | tertutup; data tidak keluar ke pimpinan unit secara otomatis |
| OMSPAN/IKPA (Kemenkeu) | tidak diperiksa | monitoring IKPA | tidak terlacak dari web publik |

### 2.4 Usulan
**K1. Penguji konsistensi angka laporan (S)**
- Masalah: **[F]** catatan LAKIP 2025 di repo memuat 7 selisih angka antar-tabel (`5-lakip.md` bagian "selisih"). Opini WTP dan nilai SAKIP dipertaruhkan oleh angka yang tidak cocok.
- Pengguna: Biro Keuangan dan Biro Perencanaan sebelum LAKIP dan LK terbit, untuk memutuskan apakah dokumen sudah layak dikirim.
- Data: tabel dari draf LAKIP atau LK (unggah satu PDF atau XLSX) dan pustaka `data/kajian-bnpb/pustaka/*.md`.
- Aturan: (a) jumlah baris sama dengan total; (b) persen dihitung ulang dari pagu dan realisasi dengan toleransi 0,01; (c) angka yang sama di dua tabel harus identik; (d) basis persen (pagu total atau pagu efektif) harus disebut. Hasilnya daftar selisih lengkap dengan halaman.
- Bangun: `scripts/bnpb/uji_angka.py` (stdlib, dijalankan lokal; PDF diekstrak dengan pdftotext yang sudah dipakai `hukum.py`). Laporan keluar sebagai markdown. Tanpa D1 dan tanpa layar publik.
- Ukuran: jumlah selisih di draf LAKIP 2026 sebelum terbit menjadi 0.
- Risiko: draf internal tidak boleh ikut ter-commit ke repo publik; jalankan di luar git atau di folder yang di-ignore.

**K2. Pantau deviasi rencana penarikan dana per unit (M)**
- Masalah: **[F]** realisasi unit 2025 timpang: Logpal 38,48%, Deputi RR 50,87%, Itama 55,46%, Pusdiklat 63,44%, Biro Hukum 45,07%. Deviasi RPD dan penyerapan ikut menentukan IKPA.
- Pengguna: Kepala Biro Keuangan dan Sestama dalam rapat pimpinan bulanan, untuk memutuskan unit mana yang ditegur dan pagu mana yang direvisi.
- Data: satu ekspor bulanan dari SAKTI (realisasi per satker, kegiatan, akun, bulan) yang diunggah satu file oleh Biro Keuangan. RPD bulanan dari DIPA (sekali setahun ditambah revisi).
- Rumus: `deviasi_bulan = |realisasi_kumulatif - RPD_kumulatif| / RPD_kumulatif`, ditambah proyeksi akhir tahun dengan laju linear 3 bulan terakhir. Unit dengan deviasi di atas 5% atau proyeksi di bawah 90% ditandai.
- Bangun: D1 `anggaran_bulan (unit, kegiatan, akun, bulan, pagu, rpd, realisasi, diunggah)`; `POST /api/admin/anggaran/unggah` (khusus admin, ukuran dibatasi); layar `public/bnpb/anggaran.html` khusus staf. Pengurai CSV ditulis murni dan diuji.
- Ukuran: jumlah unit dengan deviasi di atas 5% pada triwulan IV turun.
- Risiko: data internal, jadi halaman harus di balik login staf. Format ekspor SAKTI belum kita lihat. Bebannya kecil (sekitar 2.000 baris per bulan, jauh di bawah kuota D1).

Penyaluran DSP (Rp3,73 T) adalah wilayah Direktorat Dukungan SD Darurat dan tidak diusulkan di sini.

---

## 3. Biro Sumber Daya Manusia dan Umum (termasuk Bagian Pengadaan Barang dan Jasa)

### 3.1 Tugas dan fungsi
"melaksanakan koordinasi urusan sumber daya manusia, rumah tangga, tata usaha, keprotokolan, barang milik/kekayaan negara, dan layanan pengadaan barang/jasa" (Ps 30 Perban 6/2025). Bagian Pengadaan Barang dan Jasa "melaksanakan penyiapan koordinasi urusan pengadaan barang/jasa" (Ps 36A Perban 11/2025), dengan fungsi pengelolaan PBJ, layanan pengadaan elektronik, dan pembinaan SDM PBJ (Ps 36B).

### 3.2 Kerja nyata
- **[F]** Target Renstra: Skor ANRI 91,11; Indeks Sistem Merit 285,5; Indeks Pengelolaan Aset 3,45; Indeks Tata Kelola Pengadaan 70; BerAKHLAK 62.
- **[F]** Nilai RB 2024: Sistem Merit 284,5; BerAKHLAK 61,33; Aset 3,29; **Tata Kelola Pengadaan 22,02** (jauh di bawah target 70); Digitalisasi Arsip 93. Penghargaan ANRI 2025 dan Anugerah Reksa Bandha DJKN 2025 untuk BMN berbasis profil risiko bencana.
- **[F]** Peraturan berlaku: Pedoman 2/2024 (pembayaran tukin; format rekap potongan tidak hadir, terlambat, pulang cepat); Perka 18/2014 (hari dan jam kerja); Pedoman 1/2024 (arsip elektronik); Perban 7/2020 (tata naskah dinas); Perban 1/2021 (klasifikasi arsip); Perka 9/2014 (ULP); Pedoman 1/2026 (coaching, mentoring, belajar mandiri ASN).
- **[F]** SIRUP BNPB 2025, jalur penyedia: 1.439 paket senilai Rp690,1 M. Menurut jumlah: 960 Pengadaan Langsung, 331 Penunjukan Langsung (Rp30,7 M), 89 e-Purchasing (43,2% pagu), dan 5 tender (23,4% pagu). 706 paket diumumkan untuk pemilihan Januari. 74 nama paket PL/PenL muncul 3 kali atau lebih (misalnya "penginapan" 105 kali, "belanja bahan" 107 kali, "paket meeting" 74 kali). Hitungan Centurisk97 dari `docs/pendanaan/cache/penyedia-BNPB-2025.json`.

### 3.3 Sistem resmi
| Sistem | URL | Fungsi |
| --- | --- | --- |
| SIMPEG BNPB | https://simpeg.bnpb.go.id (halaman login) | data kepegawaian internal |
| ASN Digital / SIASN (BKN) | https://asndigital.bkn.go.id | data ASN nasional |
| e-Kinerja BKN | https://kinerja.bkn.go.id | SKP dan predikat kinerja |
| SRIKANDI (ANRI) | https://srikandi.arsip.go.id | naskah dinas dan arsip elektronik |
| LPSE BNPB (SPSE) | https://spse.inaproc.id/bnpb | tender dan seleksi elektronik |
| SIRUP | https://sirup.inaproc.id | RUP |

Celah: semua sistem kepegawaian tertutup dan sudah resmi, jadi kita tidak menyaingi. Celah yang bisa diisi ada di pengadaan, karena datanya publik dan nilainya rendah.

### 3.4 Usulan
**S1. Rapor tata kelola pengadaan dari SIRUP dan SPSE (M), dampak terbesar**
- Masalah: **[F]** Tata Kelola Pengadaan 22,02 (0,44 dari bobot 2) adalah komponen RB terlemah setelah IKK dan IRH. Unit pengadaan baru (Bagian PBJ, Ps 36A) belum punya alat ukur.
- Pengguna: Kepala Bagian PBJ dan Kepala Biro SDM dan Umum, yang memutuskan paket mana dikonsolidasikan, dipindah ke e-Purchasing, atau dimajukan jadwalnya.
- Data: SIRUP penyedia dan swakelola BNPB (`docs/pendanaan/sirup_tarik.py`, ditarik bulanan) dan daftar tender publik SPSE BNPB (https://spse.inaproc.id/bnpb, untuk realisasi tender).
- Rumus (per tahun anggaran):
  - `porsi_triwulan1 = paket diumumkan untuk pemilihan Jan-Mar / total`
  - `porsi_epurchasing = pagu e-Purchasing / pagu penyedia`
  - `porsi_PDN` dan `porsi_UMK` dari flag `isPDN` dan `isUMK`
  - **sinyal konsolidasi**: kelompok nama paket hasil normalisasi (huruf kecil, tanpa angka, lokasi, dan bulan) dengan 3 paket PL atau PenL atau lebih dalam satu tahun dan jumlah pagu di atas ambang PL. Ambang menurut Perpres PBJ yang berlaku, dicek dulu. Hasilnya bahan untuk dikonsolidasikan, bukan tuduhan pemecahan paket.
  - `porsi_PenL = pagu PenL / pagu penyedia`
- Bangun: `scripts/bnpb/pengadaan.py` dengan keluaran `public/data/bnpb/pengadaan.json` (agregat saja, tanpa nama penyedia). Kartu di `/bnpb/kinerja` atau halaman `public/bnpb/pengadaan.html`; tabel kelompok konsolidasi dengan tautan ke paket SIRUP (`tautan_sirup` sudah ada di CSV). Tanpa D1.
- Ukuran: porsi e-Purchasing dan porsi triwulan I naik; jumlah kelompok konsolidasi turun pada RUP 2027.
- Ketergantungan: endpoint SIRUP bisa berubah (sudah punya cache dan retry); Inspektorat III memakai pipeline yang sama (I2).
- Risiko: data publik; nama paket generik bisa menimbulkan positif palsu, jadi bahasanya "kandidat konsolidasi".

**S2. Rekap kehadiran tugas lapangan untuk pelengkap tukin (S)**
- Masalah **[D]**: Pedoman 2/2024 memotong tukin untuk tidak hadir, terlambat, dan pulang cepat. Pegawai yang bertugas di lapangan butuh bukti hadir di lokasi tugas.
- Data: `/petugas` sudah punya absen pindai wajah, GPS, dan logbook (D1 `orang`, `lp_tugas`, `lp_absen`, `lp_logbook`; migrasi 0095-0097). **[F]** Tabel `orang` di produksi masih 0 baris.
- Bangun: ekspor bulanan CSV dengan kolom sesuai format rekap Pedoman 2/2024 (nama, NIP, unit, jumlah hari hadir di lokasi tugas, rujukan surat tugas) lewat `GET /api/admin/lapangan/rekap?bulan=`. Ditempelkan ke `src/lapangan_panel.js`. Tanpa tabel baru.
- Ukuran: jumlah pegawai lapangan yang rekapnya diterima Biro SDM.
- Risiko: data biometrik dan lokasi (PDP), jadi hanya agregat hari yang keluar. Ini tidak menggantikan presensi resmi. Bernilai hanya bila `/petugas` benar-benar dipakai.

**S3. BMN lawan bahaya (S)**
- Masalah: **[F]** BNPB mendapat penghargaan DJKN 2025 untuk BMN berbasis profil risiko bencana, jadi praktik ini sudah ada. Usulan ini hanya membantu memutakhirkannya.
- Data: daftar lokasi BMN (gudang, kantor, sarpras Pusdalops daerah 64 lokasi) dari ekspor SIMAK-BMN, ditambah lapisan bahaya yang sudah ada (banjir, longsor, gempa, gunungapi, pesisir).
- Bangun: skrip lokal yang menempelkan skor bahaya per titik, lalu tabel di halaman staf.
- Risiko: lokasi aset bisa sensitif. Kerjakan bila pemilik menginginkan.

---

## 4. Biro Hukum, Organisasi, dan Kerja Sama

### 4.1 Tugas dan fungsi
"melaksanakan koordinasi penyusunan peraturan perundang-undangan, advokasi hukum, organisasi dan tata laksana, dan kerja sama di bidang penanggulangan bencana" (Ps 41). Fungsi ditambah pemantauan, evaluasi, dan pelaporan bidang hukum, organisasi, dan kerja sama (Ps 42).

### 4.2 Kerja nyata
- **[F]** Mengelola JDIH BNPB (https://jdih.bnpb.go.id, aktif). Menyusun Perban, juklak, juknis, dan pedoman: korpus berisi 233 dokumen, dan sepanjang 2025-2026 terbit banyak sekali (Perban 2, 4, 5, 6, 11/2025; juklak 3, 5, 17/2025; pedoman 1/2025 dan 1/2026).
- **[F]** Target Renstra yang dipegang biro: Renaksi RB General, Penyederhanaan Struktur, Sistem Kerja, Indeks Kualitas Kebijakan (65 naik ke 80), Indeks Reformasi Hukum (70 naik ke 85), Indeks Pelayanan Publik, SPI, dan SKM.
- **[F]** Nilai RB 2024: **IKK 0 dan IRH 0** karena BNPB belum ikut pengukuran (Renstra hal. 119; LAKIP). Anggaran biro 2025 Rp8,14 M, realisasi 45,07%.
- **[F]** Perka 2/2017 (pedoman penyusunan SOP) masih berlaku.

### 4.3 Sistem resmi dan yang sudah ada di repo
- JDIH BNPB: https://jdih.bnpb.go.id
- Di repo: `public/bnpb/hukum.*` (wiki JDIH dengan cari, saring status, tanya jawab berkutipan) dan `scripts/bnpb/hukum.py` (panen, OCR, relasi mencabut, mengubah, merujuk).
- Celahnya: status dokumen diambil apa adanya dari JDIH, padahal relasi "mencabut" sudah dideteksi dan keduanya tidak disandingkan.

### 4.4 Usulan
**H1. Pemeriksa status peraturan (S), dampak terbesar dan termurah**
- Masalah: **[F]** sedikitnya 19 dokumen tertulis BERLAKU padahal sudah dicabut (bagian 0 poin 2). Siapa pun yang membaca JDIH, termasuk BPBD dan asisten `/ai`, bisa memakai juknis yang sudah mati.
- Pengguna: pengelola JDIH di Biro Hukum, yang memutuskan status mana dikoreksi di situs resmi.
- Data: `public/data/bnpb/hukum/katalog.json` (`dok` dan `relasi`), dibangun ulang setiap panen.
- Aturan: (a) bila ada relasi `mencabut` atau `mengganti` dari dokumen BERLAKU ke dokumen BERLAKU, tandai konflik; (b) perlebar jendela `_konteks()` khusus untuk pasal "Pada saat Peraturan ... mulai berlaku" sampai kata "dicabut", supaya daftar berbutir seperti Ps 60 Perban 4/2025 tertangkap; (c) dokumen yang diubah tetap BERLAKU, cukup ditautkan ke pengubahnya.
- Bangun: fungsi `konflik_status()` di `hukum.py` dengan keluaran kunci `konflik` di katalog. Di `hukum.js`, pil "Dicabut oleh X (menurut teks), JDIH masih BERLAKU". Satu gerbang uji di `tests/bnpb/` yang memastikan Perban 6/2021 tercatat dicabut oleh Perban 4/2025.
- Ukuran: jumlah konflik turun ke 0 di JDIH resmi setelah dilaporkan.
- Risiko: tidak ada. Pemiliknya agen `ruang-bnpb`.

**H2. Pelacak amanat pengaturan turunan dan bahan Indeks Reformasi Hukum (M)**
- Masalah: IRH dan IKK bernilai 0. IRH menilai antara lain penataan regulasi. **[F]** Peraturan BNPB sering mendelegasikan aturan yang belum terlihat terbit. Contoh dari Perban 4/2025: tata cara Uji Kompetensi "ditetapkan oleh Kepala BNPB" (Ps 38), kurikulum pelatihan fungsional (Ps 41 ayat 2), tata cara sistem informasi JF (Ps 52 ayat 2), dan tata cara penghitungan kebutuhan JF (Ps 53 ayat 3). Tidak satu pun ada di korpus 233 dokumen.
- Pengguna: Biro Hukum (menyusun program legislasi tahunan) dan unit teknis pemilik amanat.
- Data: korpus `data/raw/hukum/teks/*.json`.
- Aturan: regex kalimat delegasi (`ditetapkan oleh Kepala`, `diatur dengan Peraturan Badan`, `diatur lebih lanjut`, `tercantum dalam ... Keputusan`) per pasal. Amanat dianggap terpenuhi bila ada dokumen yang lebih baru yang merujuk pasal tersebut atau judulnya cocok dengan topik amanat (BM25 sederhana pada judul). Usia amanat dihitung sejak tanggal penetapan dokumen induk. Turunannya: peta regulasi (jumlah dokumen per subjek, umur, yang tumpang tindih karena subjek sama dan keduanya BERLAKU).
- Bangun: `scripts/bnpb/amanat.py` dengan keluaran `public/data/bnpb/hukum/amanat.json`, lalu tab "Amanat" di `public/bnpb/hukum.js`. Tanpa D1.
- Ukuran: jumlah amanat terbuka per tahun turun; BNPB mendaftar pengukuran IKK dan IRH.
- Risiko: deteksi "terpenuhi" akan meleset sebagian, jadi biro perlu menandai manual. Tanda itu cukup disimpan sebagai JSON di repo, tanpa form.

**H3. Register kerja sama (M) [D]**
- Masalah: fungsi kerja sama (Ps 42 huruf c) tidak punya register publik; MoU dan PKS tidak masuk JDIH.
- Data: berita bnpb.go.id (sudah ada pemanen berita lintas modul di `scripts/umum`) dan `public/bnpb/mitra`, `/kemitraan`, `/direktori`.
- Bangun: ekstraksi "penandatanganan nota kesepahaman/perjanjian kerja sama" dari berita, lalu rekaman mitra, tanggal, dan topik di `public/data/bnpb/kerja_sama.json`, ditautkan ke profil lembaga di `/direktori`.
- Risiko: masa berlaku PKS tidak tercantum di berita. Bergantung pada keputusan pemilik (pertanyaan 4).

---

## 5. Inspektorat Utama (Inspektorat I, II, III)

### 5.1 Tugas dan fungsi
"menyelenggarakan tugas pengawasan intern di lingkungan Badan Nasional Penanggulangan Bencana" (Ps 101), "terhadap kinerja dan keuangan melalui audit, reviu, evaluasi, dan pemantauan" (Ps 102 huruf b). Pembagian lingkupnya:
- Inspektorat I: Deputi Sistem dan Strategi, Pencegahan, RR, dan Pusdatinkom (Ps 104).
- Inspektorat II: Settama, Deputi Penanganan Darurat, Logpal, Pusdiklat, dan Pusdalops (Ps 106).
- Inspektorat III: pengawasan dengan tujuan tertentu dan "penanganan pengaduan yang berasal dari internal dan eksternal" (Ps 109 huruf b).

### 5.2 Kerja nyata
- **[F] TLHP** (Pedoman 1/2025, BERLAKU): auditi wajib menindaklanjuti rekomendasi BPK dan APIP paling lambat 60 hari. Rekonsiliasi saldo rekomendasi dilakukan setiap triwulan. Data TLHP BPK dimasukkan ke **SIPTL**, data APIP ke **SIMHPNAS**. Laporan semesteran disampaikan ke Kepala, dan ikhtisarnya ke KemenPANRB. Ada pula mekanisme TPTD dengan 8 kriteria rekomendasi cacat.
- **[F] Pengaduan** (Juklak 5/2025): kanal https://dumas.bnpb.go.id (ULP BNPB), telepon, surat, surel, dan WA. Batas penanganan 20 hari kerja (berkadar pengawasan) dan 15 hari kerja (tidak berkadar pengawasan). Ada pula **WBS** di https://wbs.bnpb.go.id.
- **[F] Manajemen risiko** (Perban 6/2024, Juklak 17/2025): register risiko per pemilik risiko eselon II, I, dan entitas; laporan triwulan dan tahunan; dan Juklak meminta sebuah "Sistem Informasi Manajemen Risiko" yang mencatat risiko, pengendalian, respons, dan kejadian. LAKIP 2025 menyebut "manajemen risiko belum optimal".
- **[F]** Gratifikasi (Perka 4/2017). Audit kinerja dan keuangan diatur Perka 9/2010 dan 10/2010 (BERLAKU di katalog, tetapi teksnya belum ada di korpus).
- **[F]** Kinerja 2025: kapabilitas APIP 3,93 (target 3,05); TL BPK 81,64% (target 75%); TL pengaduan 100%; TL hasil pengawasan APIP 46%. Maturitas SPIP 3,187 (level 3). Anggaran Rp12,0 M, realisasi 55,46%.

### 5.3 Sistem resmi
| Sistem | URL | Celah |
| --- | --- | --- |
| SIPTL BPK | disebut Pedoman 1/2025; siptl.bpk.go.id tidak bisa dihubungi dari mesin kita | milik BPK; tidak ada tampilan umur rekomendasi per unit untuk pimpinan BNPB |
| SIMHPNAS BPKP | disebut Pedoman 1/2025; simhpnas.bpkp.go.id 404 dari luar | sama |
| ULP BNPB | https://dumas.bnpb.go.id | statistik tidak publik |
| WBS BNPB | https://wbs.bnpb.go.id | |
| SIM Manajemen Risiko | disyaratkan Juklak 17/2025; tidak ditemukan URL-nya | belum jelas apakah sudah ada |

### 5.4 Usulan
**I1. Papan umur rekomendasi TLHP per unit (M), dampak terbesar**
- Masalah: **[F]** TL hasil pengawasan APIP baru 46% (target naik ke 70% pada 2029). Pedoman 1/2025 memakai surat dan nota dinas triwulanan dengan tembusan Kepala, sehingga pimpinan unit tidak melihat sisa rekomendasinya setiap hari.
- Pengguna: Inspektur I, II, dan III, Sestama, dan pimpinan eselon I. Keputusannya: rekomendasi mana dikejar, mana diusulkan TPTD.
- Data: ekspor SIPTL dan SIMHPNAS (atau rekap Excel Bagian TU Itama) diunggah satu file per triwulan, sesuai siklus rekonsiliasi di Pedoman 1/2025. Tidak ada form isian.
- Rumus: `umur = hari sejak LHP diterima`. Status mengikuti klasifikasi Pedoman 1/2025 (sesuai, belum sesuai, belum ditindaklanjuti, tidak dapat ditindaklanjuti). Bendera merah bila umur lebih dari 60 hari dan status bukan "sesuai". Calon TPTD bila umur lebih dari 2 tahun ditambah kata kunci kriteria TPTD (unit sudah tidak ada, pihak ketiga pailit, penanggung jawab meninggal); ini hanya saran, bukan penetapan. `%TL unit = sesuai / (total - TPTD)` dibandingkan target Renstra (75% BPK, 46% sampai 70% APIP).
- Bangun: D1 `tlhp_rek (id, sumber BPK/APIP/BPKP, no_lhp, tgl_lhp, unit, ringkas, nilai_rp, status, tgl_status, diunggah)`; `POST /api/admin/tlhp/unggah` dan `GET /api/admin/tlhp/ringkas` (khusus staf Itama, lewat gerbang `guard-api`); layar `public/bnpb/pengawasan.html` berupa kartu `.ex-std` per unit. Pengurai Excel atau CSV di sisi skrip lokal (`scripts/bnpb/tlhp.py`), lalu satu `wrangler d1 execute` yang dijalankan pemilik. Tanpa rute publik.
- Ukuran: %TL APIP pada triwulan berikutnya; median umur rekomendasi terbuka.
- Risiko: temuan audit adalah data rahasia dan nama pejabat termasuk data pribadi. Jadi jangan di repo publik, tanpa R2 publik, dan simpan ringkas teks saja. Volume kecil (ratusan baris). Butuh izin Inspektur Utama (pertanyaan 2).

**I2. Sinyal risiko pengadaan untuk pengawasan tujuan tertentu (M)**
- Masalah: Inspektorat III memegang pengawasan dengan tujuan tertentu; Inspektorat II mengawasi Settama, termasuk Bagian PBJ. **[F]** RUP 2025 memuat 331 paket Penunjukan Langsung senilai Rp30,7 M dan 74 kelompok nama paket PL/PenL yang berulang.
- Data: pipeline S1 (SIRUP dan SPSE) dipakai bersama; tidak ada pemanenan kedua.
- Rumus: skor per kelompok paket = jumlah bobot sinyal. Sinyal: PenL di luar kategori darurat (+2); paket berulang dengan total di atas ambang PL (+2); paket diumumkan setelah Oktober untuk kontrak tahun berjalan (+1); swakelola dengan pagu besar untuk "narasumber" atau "honor" (+1); paket yang diubah berulang kali pada versi SIRUP berikutnya (+1, butuh perbandingan cache antarbulan).
- Bangun: tab staf di layar S1 (`?mode=pengawasan`) yang hanya tampil bagi admin. Data agregat publik sama dengan S1, dan skornya dihitung di klien dari JSON yang sama, sehingga tidak ada data rahasia.
- Ukuran: jumlah kelompok skor 4 atau lebih yang ditelaah Itama per semester.
- Risiko: memberi kesan "tuduhan"; label wajib "sinyal telaah". Pengadaan darurat bencana sah memakai PenL, jadi pengecualian berdasarkan kode kegiatan darurat harus ada.

**I3. Register risiko yang terisi sendiri dari capaian (M) [D]**
- Masalah: Juklak 17/2025 mewajibkan register risiko triwulanan per pemilik risiko, dan LAKIP mengakui manajemen risiko belum optimal.
- Data: target dan realisasi per indikator dan unit (Renstra Tabel 4.7, LAKIP Lamp. 10, dan triwulanan bila ada), ditambah realisasi anggaran (K2).
- Rumus: KRI otomatis per sasaran kegiatan. `celah = 1 - capaian_kumulatif / target_proporsional_triwulan`. Level kemungkinan 1-5 dari celah (di bawah 5%: 1; 5-15%: 2; 15-30%: 3; 30-50%: 4; di atas 50%: 5). Level dampak 1-5 dari bobot indikator di PK (IKSS 5, IKP 4, IKK 3). Hasilnya mengisi kolom "risiko tidak tercapainya sasaran" di register; pemilik risiko tinggal menambah penyebab dan RTP. Matriks 5x5 dipakai bila juklak memakai skala yang sama (perlu dicek; teks yang terbaca tidak menyebut ukurannya).
- Bangun: `scripts/bnpb/register_risiko.py` dengan keluaran JSON, ditampilkan di `/bnpb/kinerja` mode staf. Diekspor ke format lampiran Juklak 17/2025.
- Risiko: bisa tumpang tindih dengan SIM Manajemen Risiko resmi bila sudah ada (pertanyaan 3).

Pengaduan masyarakat sudah punya ULP dan WBS; kami tidak mengusulkan sistem tandingan.

---

## 6. Pusat Pendidikan dan Pelatihan Penanggulangan Bencana (Pusdiklat PB)

### 6.1 Tugas dan fungsi
"pengoordinasian dan penyelenggaraan pengembangan kapasitas sumber daya manusia di bidang penanggulangan bencana" (Ps 117). Fungsinya mencakup diklat teknis dan simulasi, "pengembangan program dan akreditasi pendidikan dan pelatihan penanggulangan bencana", NSPK, diklat dasar, struktural, dan fungsional, "penyelenggaraan sertifikasi dan uji kompetensi profesi", serta monev (Ps 118).

### 6.2 Kerja nyata
- **[F] Perban 2/2025** (Pelatihan PB, mencabut Perka 4/2016):
  - Jenis pelatihan: teknis (dasar, lanjutan, kepemimpinan) dan fungsional.
  - Peserta: ASN, TNI, Polri, dan masyarakat.
  - Tahapan: rencana, persiapan, pelaksanaan, evaluasi, laporan.
  - Evaluasi mencakup peserta, tenaga pelatihan, pelaksanaan, serta "retensi pengetahuan dan kemanfaatan" (Ps 13).
  - Laporan wajib paling lambat 7 hari kerja setelah pelatihan (Ps 14).
  - STTP elektronik dan/atau nonelektronik (Ps 23); brevet untuk pelatihan kepemimpinan (Ps 24).
  - Uji kompetensi lewat LSP BNPB (Ps 20).
  - Sistem Manajemen Pembelajaran daring "sesuai prinsip satu data", dibangun oleh unit data (Ps 25).
- **[F]** Akreditasi lembaga penyelenggara diklat (Perban 1/2020): nilai minimal 71,00 dengan minimal 35,50 per unsur; kategori A 91-100, B 81-90.
- **[F]** LSP BNPB dibentuk lewat Perka 7/2014 jo. Perban 1/2018, dan berlisensi BNSP. SKKNI PB diberlakukan dengan Perban 1/2019.
- **[F]** Kinerja 2025: SDM daerah rawan bencana yang difasilitasi diklat 64% (sesuai target; target Renstra naik ke 78% 2026 dan 96% 2029). **Sertifikasi profesi 74 dari target 232 orang (31,90%)**. Akreditasi lembaga 4 dari 5. Output diklat teknis prioritas 240/240, fasilitator klasikal 280/280, fasilitator daring 1.040/1.040, simulasi 160/200. Anggaran Rp12,30 M, realisasi 63,44%. Penghargaan LAN Awards 2025 (5 besar lembaga pengakreditasi).
- **[F]** RUP swakelola 2025 kegiatan "Pendidikan dan Pelatihan Penanggulangan Bencana": 128 paket (SIRUP cache).

### 6.3 Sistem resmi
| Sistem | URL | Status dari mesin kita |
| --- | --- | --- |
| e-Tangguh (portal Pusdiklat, dokumen kurikulum dan modul) | https://etangguh.bnpb.go.id (contoh berkas: https://etangguh.bnpb.go.id/wp-content/uploads/2024/03/REV_KURIKLULUM-RENKON_2023-1-2.pdf) | DNS tidak menjawab saat dicek |
| e-Learning Open edX Pusdiklat | https://elearning.bnpb.go.id (DNS ada, HTTP gagal) | disebut di dokumen Mercy Corps/INVEST-DM: https://mercycorps.or.id/peluang/consultant-enhancing-lms-and-elearning-pusdiklat-bnpb |
| SIDIKLAT | disebut di dokumen INVEST-DM 2020 sebagai salah satu dari lima sistem Pusdiklat; URL tidak ditemukan | tidak bisa diverifikasi |
| LSP BNPB | lsp.bnpb.go.id tidak terselesaikan DNS-nya | skema: 17 skema dan 52 unit menurut SoW Mercy Corps yang tidak bertanggal |

Celah: tidak ada data publik alumni per daerah, padahal indikator Renstra Pusdiklat dihitung per "SDM daerah rawan bencana". Retensi dan kemanfaatan (Ps 13) tidak terlihat diukur. Sertifikasi jauh di bawah target.

### 6.4 Usulan
**D1. Peta sasaran diklat berbasis risiko (M), dampak terbesar**
- Masalah: target naik dari 64% ke 78% pada 2026 dengan anggaran yang terpotong. Pusdiklat perlu memilih daerah dan peserta yang paling menggeser indikator dan paling dibutuhkan.
- Pengguna: Kepala Pusdiklat dan perancang program (perencanaan tahunan, Ps 9 Perban 2/2025: identifikasi kebutuhan).
- Data:
  - Risiko dan kapasitas: `public/data/bnpb/terpapar.json`, `ikd.json` (raster kapasitas: 310 kabupaten rendah menurut hitungan kita), dan indeks risiko kecamatan.
  - Kejadian: `public/data/bnpb/dibi_kab_tahun.json`.
  - Alumni per kabupaten: daftar peserta dari laporan penyelenggaraan (Lampiran I Perban 2/2025 memuat jumlah peserta), diunggah satu CSV per pelatihan (nama tidak perlu; cukup kab, instansi, jenis pelatihan, tanggal), atau ekspor Open edX bila tersedia.
- Rumus: `kebutuhan_kab = terpapar_norm x (1 - kapasitas) x (1 + kejadian_5thn_norm)`. `cakupan_kab = alumni_aktif_5thn / perkiraan SDM PB kab` (perkiraan SDM PB kab default 30 orang per BPBD, dapat diubah; lihat pertanyaan 6). `prioritas = kebutuhan x (1 - min(cakupan, 1))`. Kabupaten diurutkan, lalu dipilih sampai jumlah kab terlayani mencapai target persen; Pusdiklat juga mendapat perkiraan jumlah angkatan.
- Bangun: `scripts/bnpb/diklat_sasaran.py` dengan keluaran `public/data/bnpb/diklat_sasaran.json` (hanya agregat kab). D1 `diklat_angkatan (id, program, jenis, tgl_mulai, tgl_selesai, kab, n_peserta, n_lulus, penyelenggara)` diisi lewat `POST /api/admin/diklat/unggah` (CSV), tanpa nama orang. Layar `public/bnpb/diklat.html` berisi kartu peta dan tabel prioritas.
- Ukuran: % kab rawan yang terlayani (definisi Renstra) dan selisih antara daftar sasaran kita dan realisasi Pusdiklat.
- Risiko: definisi penyebut indikator Renstra belum kita ketahui (pertanyaan 6). Kalau unggahan tidak terjadi, peta hanya menampilkan kebutuhan; itu tetap berguna, tetapi tanpa cakupan.

**D2. STTP elektronik terverifikasi dan registri alumni (S)**
- Masalah: Ps 23 membolehkan STTP elektronik; tanpa verifikasi, STTP mudah dipalsukan dan tidak tersambung ke sertifikasi LSP (74 dari 232).
- Bangun: nomor STTP dan hash SHA-256 (nama, program, tanggal) disimpan di D1 `sttp (nomor, hash, program, tgl, penerbit)` tanpa nama terang. Halaman publik `public/sttp/cek.html?n=` memasukkan nama dan mencocokkan hash di klien. Kode QR dicetak pada STTP. Bagi relawan, sambungkan ke `relawan_pelatihan` (migrasi 0023) lewat `relawan_id`.
- Ukuran: jumlah STTP terbit dengan QR; jumlah verifikasi per bulan.
- Risiko: PDP minimal karena hanya hash. Butuh keputusan Pusdiklat bahwa nomor STTP keluar dari sistem kita atau dari sistem mereka (pertanyaan 5).

**D3. Survei retensi dan kemanfaatan lewat WA (M)**
- Masalah: Ps 13 ayat (2) huruf d mewajibkan evaluasi retensi dan kemanfaatan. Ini mustahil dilakukan manual untuk ribuan alumni (fasilitator daring saja 1.040).
- Bangun: gateway WA yang sudah ada (`scripts/wa/**`, tabel `wa_antre`) mengirim 3 pertanyaan pada +3 dan +6 bulan: dipakai atau tidak, untuk apa (pilihan), dan satu angka 1-5. Jawaban disimpan di D1 `diklat_retensi (angkatan_id, bulan_ke, jawab1, jawab2, skor)` tanpa nomor (nomor di-hash). Rekap tampil di layar D1.
- Ukuran: tingkat jawab di atas 30% dan skor kemanfaatan per program.
- Risiko: nomor WA alumni adalah data pribadi, jadi butuh persetujuan di formulir pendaftaran. Ada risiko blokir nomor bila volume besar; kirim bertahap.

**D4. Bank tenaga pengajar dari direktori pakar (S)**
- Ps 18 ayat (6): tenaga pengajar boleh berasal dari praktisi dan dosen ber-ToT.
- Cocokkan mata pelatihan di kurikulum (berkas e-Tangguh) dengan pakar di `/akademisi` dan `/direktori` memakai pencocok BM25 di `scripts/kemitraan/**`. Keluarannya daftar calon per mata pelatihan untuk staf.
- Murah karena memakai ulang mesin yang ada.

---

## 7. Pusat Pembinaan Jabatan Fungsional Kebencanaan (baru, Perban 11/2025)

### 7.1 Tugas dan fungsi
"melaksanakan penyusunan dan pelaksanaan kebijakan teknis, pemantauan, evaluasi, dan analisis pelaporan bidang pembinaan jabatan fungsional kebencanaan" (Ps 121 Perban 11/2025). Delapan fungsinya (Ps 122) antara lain "penyiapan pelaksanaan pengembangan sistem informasi dan layanan informasi jabatan fungsional kebencanaan" (huruf c), "penyiapan penyusunan pemberian rekomendasi formasi jabatan fungsional kebencanaan" (huruf d), rencana pengembangan kompetensi (huruf e), standar kompetensi (huruf f), dan "pelaksanaan pemantauan dan evaluasi kinerja jabatan fungsional kebencanaan" (huruf g).

### 7.2 Kerja nyata
- **[F] Perban 4/2025** (Juklak dan Juknis JF, mencabut Perban 6/2021, 7/2021, 1/2022, 2/2022):
  - Dua JF: **Analis Kebencanaan** (keahlian: Ahli Pertama sampai Utama) dan **Pranata Kebencanaan** (keterampilan: Pemula sampai Penyelia). Instansi pengguna mencakup K/L dan pemda (BPBD).
  - Kenaikan pangkat butuh angka kredit kumulatif (misalnya 50 untuk Ahli Pertama, 100 untuk Ahli Muda, 150 untuk Ahli Madya; Ps 36).
  - Pelatihan paling sedikit **20 JP per tahun** (Ps 40). Analisis kebutuhan pelatihan dari hasil uji kompetensi atau survei (Ps 43).
  - Sistem informasi JF berbentuk aplikasi; tata caranya ditetapkan Kepala (Ps 52).
  - Kebutuhan JF disusun untuk 5 tahun dan dirinci tahunan; tata cara hitungnya ditetapkan Kepala (Ps 53).
  - **Penyesuaian nomenklatur Penata PB menjadi Analis Kebencanaan sampai 6 Agustus 2026** (Ps 54 ayat 2). Tenggat ini sudah lewat per hari ini.
  - Organisasi profesi menyusun kode etik dengan persetujuan instansi pembina (Ps 49-51).
- **[F]** Kamus Kompetensi Teknis PB (Perban 5/2024): kompetensi umum dan khusus berkode PB.01 sampai PB.58 (58 kode terbaca di teks), masing-masing 5 level dengan indikator perilaku.
- **[F]** Renstra hal. 119: sesuai PermenPANRB 1/2023 ada **19 tugas instansi pembina** dalam pengelolaan JF. Dasar JF: PermenPANRB 7/2024.
- **[D]** Sebagai pusat baru (Jan 2026), Pusbin JF kemungkinan belum punya aplikasi. Pekerjaan pertamanya kemungkinan inventarisasi pejabat JF di BNPB dan BPBD, penyesuaian nomenklatur, dan formasi.

### 7.3 Sistem resmi
Tidak ditemukan aplikasi JF Kebencanaan di web (pencarian "jabatan fungsional analis kebencanaan aplikasi"). Data ASN nasional ada di SIASN/ASN Digital (https://asndigital.bkn.go.id) dan predikat kinerja di e-Kinerja BKN (https://kinerja.bkn.go.id); keduanya tertutup. Ps 52 Perban 4/2025 sendiri mengamanatkan aplikasi. Ini celah yang paling jelas di kelompok ini.

### 7.4 Usulan
**J1. Kamus kompetensi terstruktur dan jalur pengembangan (S), paling cepat jadi**
- Masalah: Kamus Kompetensi (Perban 5/2024, 116 halaman) hanya tersedia sebagai PDF. Analisis kebutuhan pelatihan (Ps 43) dan rencana pengembangan kompetensi (Ps 122 huruf e) butuh data terstruktur.
- Data: teks korpus `data/raw/hukum/teks/perban-nomor-5-tahun-2024.json` (mutu 0,999), ditambah SKKNI PB (Perban 1/2019) dan kurikulum Pusdiklat bila ada.
- Aturan: pengurai kode `PB.\d\d` menghasilkan nama, definisi, jenis, dan level 1-5 dengan indikator. Pemetaan jenjang JF ke level minimum diambil dari Standar Kompetensi PermenPANRB (Ps 37 ayat 3). Bila belum tersedia, pakai bawaan: Pertama 2, Muda 3, Madya 4, Utama 5, dan untuk Pranata: Pemula 1 sampai Penyelia 4.
- Bangun: `scripts/bnpb/kamus_kompetensi.py` dengan keluaran `public/data/bnpb/kompetensi.json`. Layar `public/bnpb/jf.html` tab "Kompetensi" untuk mencari kompetensi, melihat level, dan memetakan ke pelatihan Pusdiklat yang ada. Uji: jumlah kode yang terurai sama dengan 58 dan tiap kode punya 5 level.
- Ukuran: dipakai Pusdiklat dan Pusbin untuk menyusun program 2027.
- Risiko: tidak ada data pribadi. Pengurai bisa meleset di tabel lampiran, jadi perlu uji jumlah.

**J2. Hitung kebutuhan formasi JF per instansi (M), dampak terbesar jangka menengah**
- Masalah: Ps 122 huruf d (rekomendasi formasi) dan Ps 53 (kebutuhan 5 tahunan) membutuhkan tata cara hitung yang ditetapkan Kepala, dan aturan itu belum ada di korpus. BPBD akan meminta rekomendasi formasi.
- Pengguna: Pusbin JF (memberi rekomendasi ke KemenPANRB) dan BPBD dan pemda (mengusulkan formasi).
- Data: beban kerja proksi per kab dan prov, semuanya sudah di repo:
  - kejadian bencana: `dibi_kab_tahun.json`
  - penduduk terpapar: `terpapar.json`
  - jumlah desa rawan: `public/data/bnpb/desa`
  - status dan aktivasi posko: data Pusdalops
  - kelas BPBD: perlu sumber (pertanyaan 7)
  Ditambah norma waktu per kegiatan dari Lampiran Perban 4/2025 (cakupan kegiatan per jenjang, Ps 12 ayat 3).
- Rumus (pola Analisis Beban Kerja KemenPANRB): `kebutuhan_jenjang = sum(volume_kegiatan_tahunan x norma_waktu_jam) / 1.250 jam kerja efektif per tahun`. Volume diturunkan dari proksi: misalnya kajian dan rencana kontinjensi per ancaman dominan, kaji cepat per kejadian, penyuluhan per desa rawan, dan pendampingan posko per aktivasi. Norma waktu awalnya diisi bawaan yang tertulis di JSON dan bisa diubah Pusbin; tidak ada angka karangan yang tampil tanpa label "bawaan".
- Bangun: `scripts/bnpb/formasi_jf.py` dengan keluaran `public/data/bnpb/formasi_jf.json` (per prov dan kab, per jenjang). Layar tab "Formasi" di `public/bnpb/jf.html` dengan pengubah norma waktu di klien (tanpa D1). Ekspor CSV untuk lampiran surat rekomendasi.
- Ukuran: dipakai sebagai lampiran rekomendasi formasi; selisih dengan formasi yang ditetapkan KemenPANRB.
- Risiko: tanpa tata cara resmi, angka ini hanya usulan metode. Bisa ditawarkan sebagai bahan rancangan Keputusan Kepala (bersama H2).

**J3. Registri pejabat JF dan pemantau kepatuhan (M-L)**
- Masalah: Ps 52 mengamanatkan aplikasi. Ada tenggat nomenklatur 6 Agustus 2026, kewajiban 20 JP per tahun, uji kompetensi, dan pemantauan kinerja JF (Ps 122 huruf g).
- Data: daftar pejabat JF dari instansi pengguna (rekap Excel Pusbin atau tarikan SIASN bila BKN memberi akses), ditambah alumni pelatihan (D1 dan D2) dan sertifikat LSP.
- Aturan: per pejabat: jenjang, status penyesuaian (selesai atau belum), dan JP tahun berjalan (kurang dari 20 ditandai). Per instansi: jumlah per jenjang lawan kebutuhan (J2).
- Bangun: D1 `jf_pejabat (id, instansi, prov, kab, jenis, jenjang, status_penyesuaian, jp_tahun, diperbarui)` tanpa NIP terang (hash NIP untuk pencocokan). Unggah CSV lewat `POST /api/admin/jf/unggah`. Layar staf `public/bnpb/jf.html` tab "Registri". Tampilan publik hanya agregat per prov.
- Ukuran: % pejabat yang sudah disesuaikan dan % pejabat dengan JP di atas 20.
- Risiko: data ASN (PDP); harus di balik login. Bisa tumpang tindih dengan aplikasi yang mungkin sedang dibangun Pusbin atau Pusdatinkom (pertanyaan 1). Ukuran L bila harus tersambung ke SIASN.

---

## 8. Urutan kerja yang disarankan (lintas unit)

| No | Usulan | Unit | Ukuran | Butuh data manusia? |
| --- | --- | --- | --- | --- |
| 1 | H1 pemeriksa status peraturan | Biro Hukum | S | tidak |
| 2 | P1 rapor RB | Biro Perencanaan | S | tidak (LAKIP sudah di repo) |
| 3 | J1 kamus kompetensi terstruktur | Pusbin JF, Pusdiklat | S | tidak |
| 4 | S1 dan I2 rapor dan sinyal pengadaan (satu pipeline) | Bagian PBJ, Itama | M | tidak (SIRUP sudah dipanen) |
| 5 | H2 amanat pengaturan turunan | Biro Hukum | M | tidak |
| 6 | D1 peta sasaran diklat | Pusdiklat | M | ya (CSV per angkatan) untuk cakupan |
| 7 | J2 formasi JF | Pusbin JF | M | tidak (norma waktu bawaan) |
| 8 | P2 belanja lawan risiko | Biro Perencanaan | M | tidak |
| 9 | I1 TLHP, K2 deviasi RPD, J3 registri JF | Itama, Keuangan, Pusbin | M-L | ya (unggah file internal) |

Butir 1-5 dan 7-8 terisi otomatis dari data yang sudah mengalir, sesuai syarat brief bahwa D1 produksi hampir kosong. Butir 9 hanya layak dikerjakan bila unitnya bersedia mengunggah satu file per bulan atau triwulan.

## 9. Pertanyaan untuk pemilik (dengan bawaan bila tidak dijawab)

1. **Apakah Pusbin JF atau Pusdatinkom sudah membangun aplikasi JF (Ps 52 Perban 4/2025)?** Bawaan: kita hanya membangun J1 dan J2 (publik, tanpa data pribadi) dan menunda J3.
2. **Bolehkah data TLHP dan ekspor SAKTI masuk D1 produksi kita di balik login staf?** Bawaan: tidak. I1 dan K2 dijalankan sebagai skrip lokal yang menghasilkan laporan untuk pemilik, tanpa tabel D1.
3. **Apakah BNPB sudah punya SIM Manajemen Risiko sesuai Juklak 17/2025?** Bawaan: I3 dibuat hanya sebagai ekspor register (format lampiran juklak), bukan aplikasi.
4. **Register kerja sama (H3): perlu atau cukup lewat `/kemitraan` dan `/direktori`?** Bawaan: tidak dibuat.
5. **STTP elektronik (D2): nomor diterbitkan oleh sistem Pusdiklat atau oleh kita?** Bawaan: kita hanya menyediakan halaman verifikasi hash; nomor tetap dari Pusdiklat.
6. **Definisi penyebut indikator Pusdiklat "SDM daerah rawan bencana yang difasilitasi diklat"?** Bawaan: kab dengan kebutuhan di 50% teratas dihitung terlayani bila ada setidaknya 1 angkatan dalam 5 tahun; perkiraan SDM PB 30 orang per BPBD.
7. **Sumber kelas BPBD dan jumlah pegawai BPBD untuk J2?** Bawaan: kelas BPBD tidak dipakai; proksi beban kerja saja.
8. **Laporkan konflik status JDIH (H1) ke Biro Hukum secara resmi?** Bawaan: kita koreksi tampilan di wiki kita dengan label "menurut teks", lalu pemilik meneruskan daftar ke pengelola JDIH.
9. **Celah lingkup Inspektorat II (Ps 106 masih menyebut Pusdalops, Pusbin JF tidak tercakup) dibawa ke Biro Hukum?** Bawaan: dicatat sebagai temuan di kartu H2, tidak dibawa keluar.

## 10. Sumber

Korpus lokal JDIH (semua BERLAKU kecuali disebut): Perban 6/2025; Perban 11/2025; Perban 4/2025; Perban 5/2024; Perban 2/2025; Perban 1/2020; Perban 5/2025 (Renstra 2025-2029); Perban 6/2024 dan Juklak 17/2025 (manajemen risiko); Pedoman 1/2025 (TLHP); Juklak 5/2025 (pengaduan); Pedoman 2/2024 (tukin); Pedoman 1/2026 (coaching); Perka 16/2011; Perka 9/2014; Perka 7/2014; Perban 1/2019. Ada beberapa yang statusnya di katalog BERLAKU padahal sudah dicabut menurut teks: Perka 4/2016 (dicabut Perban 2/2025), Perban 6/2021 dan 7/2021 (dicabut Perban 4/2025). Isinya hanya dipakai sebagai sejarah. Perka 9/2010 dan 10/2010 (audit) tidak ada teksnya di korpus.

Repo: `data/kajian-bnpb/pustaka/5-lakip.md` (LAKIP BNPB 2025), `3-renstra.md`, `docs/pendanaan/cache/*-BNPB-*.json` (SIRUP), `public/data/bnpb/hukum/katalog.json`, `scripts/bnpb/hukum.py`, `scripts/bnpb/iku.py`, migrasi 0023 dan 0095-0097.

Web:
- https://jdih.bnpb.go.id
- https://dumas.bnpb.go.id
- https://wbs.bnpb.go.id
- https://simpeg.bnpb.go.id
- https://spse.inaproc.id/bnpb
- https://sirup.inaproc.id
- https://krisna.systems
- https://sakti.kemenkeu.go.id
- https://srikandi.arsip.go.id
- https://asndigital.bkn.go.id
- https://kinerja.bkn.go.id
- https://etangguh.bnpb.go.id/wp-content/uploads/2024/03/REV_KURIKLULUM-RENKON_2023-1-2.pdf
- https://etangguh.bnpb.go.id/wp-content/uploads/2021/03/LAKIP-PUSDIKLAT-PB-2020-FINAL.pdf
- https://mercycorps.or.id/peluang/consultant-enhancing-lms-and-elearning-pusdiklat-bnpb
- https://mercycorps.or.id/sites/default/files/attachments/SoW%20Develop%20E-Learning%20TA-KRB_15%20nov.pdf
- https://mercycorps.or.id/sites/default/files/attachments/JAK%200177%20SOW%20Konsultan%20Peta%20Okupasi%20LSP%20BNPB.pdf
- https://bpbd.jogjaprov.go.id/berita/tolak-ukur-penggiat-pb-melalui-uji-kompetensi

Tidak bisa diakses dari mesin ini:
- etangguh.bnpb.go.id, pusdiklat.bnpb.go.id, lsp.bnpb.go.id, sidiklat.bnpb.go.id (DNS tidak menjawab)
- elearning.bnpb.go.id (HTTP gagal)
- siptl.bpk.go.id dan lapor.go.id (gagal sambung)
- simhpnas.bpkp.go.id (404)
- e-monev.bappenas.go.id dan esakip.menpan.go.id (diblokir Cloudflare atau 403)
- LAKIP BNPB versi web dan LAKIP Pusdiklat terbaru tidak ditemukan; dipakai catatan LAKIP 2025 di repo.
