# Keputusan awal Ruang Unit BNPB (5 Nov 2026)

Versi 1. Sintesis enam riset di `riset/` menjadi satu program: sistem web untuk tiap kedeputian, direktorat, pusat, biro, dan inspektorat BNPB di luar Direktorat Koordinasi Pengendalian Operasi Darurat yang sudah dilayani modul Dalops. Berkas ini mengunci ID, mesin bersama, fase, dan prinsip. Jawaban pemilik atas pertanyaan di §7 akan ditulis di `KEPUTUSAN-UNIT.md` dan menang atas berkas ini.

Urutan otoritas (sama dengan SIPPA, AGENTS.md §2.1): `KEPUTUSAN-UNIT.md` (bila sudah ada) > berkas ini > `PRD.md` > `ALUR.md` > `ALGORITMA.md` > `DESIGN-SYSTEM.md` > `DESAIN-TEKNIS.md` > `KEAMANAN-PRIVASI.md` > `RENCANA-UJI.md` > `TIKET.md`. Pengecualian di §8: nama baku dan rumus (`ALGORITMA.md`). Rincian bukti tiap usulan ada di `riset/1-6`, dan dokumen di atas merujuk ke sana, tidak menyalinnya ulang.

## 1. Dasar dan susunan unit

OTK yang berlaku: Perban BNPB 6/2025 tentang Organisasi dan Tata Kerja BNPB, diubah Perban 11/2025. Teks dibaca dari korpus JDIH lokal (`data/raw/hukum/teks/perban-nomor-6-tahun-2025.json`, `perban-nomor-11-tahun-2025.json`, mutu teks 0,999 dan 1,0).

| Kelompok | Unit (kode di program ini) | Riset |
| --- | --- | --- |
| Deputi Sistem dan Strategi | Dit. Pemetaan dan Evaluasi Risiko Bencana (PERB), Dit. Pengembangan Strategi PB (PSPB), Dit. Sistem PB (SPB) | `riset/1` |
| Pusat | Pusat Data, Informasi, dan Komunikasi Kebencanaan (PUS) | `riset/1` |
| Deputi Pencegahan | Dit. Peringatan Dini (PD), Dit. Kesiapsiagaan (KS), Dit. Mitigasi Bencana (MT) | `riset/2` |
| Deputi Penanganan Darurat | Dit. Koordinasi Pengendalian Operasi Darurat (KPOD), Dit. Penanganan Darurat Wilayah I, II, III (WIL) | `riset/3` |
| Deputi Logistik dan Peralatan | Dit. Pengelolaan Logistik dan Peralatan (PLP), Dit. Optimasi Jaringan Logistik dan Peralatan (OJL) | `riset/4` |
| Deputi Rehabilitasi dan Rekonstruksi | Dit. RR Perumahan (RRP), Dit. RR Infrastruktur (RRI), Dit. RR Sosial, Ekonomi, dan Lingkungan Hidup (RRS), lintas Deputi (RRX) | `riset/5` |
| Sekretariat Utama | Biro Perencanaan (REN), Biro Keuangan (KEU), Biro SDM dan Umum termasuk Bagian Pengadaan (SDU), Biro Hukum, Organisasi, dan Kerja Sama (HUK) | `riset/6` |
| Inspektorat Utama | Inspektorat I, II, III (IRT) | `riset/6` |
| Pusat | Pusdiklat PB (DIK), Pusat Pembinaan Jabatan Fungsional Kebencanaan (JF) | `riset/6` |

Temuan OTK yang mengubah peta kerja:

1. Perban 11/2025 Pasal 70 merombak Deputi Penanganan Darurat menjadi Dit. KPOD dan Dit. Wilayah I, II, III. Tiga direktorat lama (Dukungan Sumber Daya Darurat, Dukungan Infrastruktur Darurat, Fasilitasi Penanganan Korban dan Pengungsi) dihapus.
2. Pasal 121-124 yang dulu mengatur Pusdalops sekarang mengatur Pusbin JF. Laporan harian sejak Maret 2026 diterbitkan "Dit. Koordalops". Modul Dalops di repo dianggap melayani Dit. KPOD.
3. Perban 11/2025 Pasal 82: Deputi RR terdiri atas tiga direktorat sektor. Direktorat Perencanaan RR dihapus, dan fungsi Jitupasna/R3P tersebar ke tiap direktorat.
4. Perban 11/2025 menambah Bagian Pengadaan Barang dan Jasa di Biro SDM dan Umum (Pasal 36A-36C).
5. Pasal 106 (lingkup Inspektorat II) tidak ikut diubah: masih menyebut Pusdalops, dan Pusbin JF tidak tercakup inspektorat mana pun.

## 2. Masalah yang dijawab program ini

1. Unit-unit BNPB bekerja dengan dokumen, juklak, dan tenggat, tetapi sistem resminya sebagian belum jadi (contoh: modul WMS INALOGPAL masih "Segera Hadir"; aplikasi JF yang diwajibkan Perban 4/2025 Pasal 52 tidak ditemukan; tidak ada sistem informasi Destana nasional padahal diwajibkan Perban 7/2025 Pasal 20).
2. Dua IKU BNPB 2025 yang meleset ada di Deputi Sistem dan Strategi: penurunan IRB 1,03% dari target 1,2%, dan daerah berkapasitas minimal sedang 50% dari target 67% (`riset/1` §0).
3. Fakta pemakaian D1 produksi 5 Nov 2026: hampir semua tabel isian manusia di Centurisk97 masih 0 baris. Pengunjung sekitar 20 orang per hari. Karena itu sistem yang mengandalkan form panjang tidak akan terisi.

## 3. Prinsip yang mengikat semua usulan

1. **Terisi sendiri dulu.** Tiap layar harus berguna dengan data yang sudah ada di repo, data publik resmi, atau dokumen dan WA yang memang sudah mengalir. Isian manusia hanya untuk konfirmasi satu ketuk atau koreksi.
2. **Melengkapi sistem resmi, bukan menyaingi.** InaRISK, DIBI, INALOGPAL, Sistala-DSP, E-Pelaporan RR, SIRUP/SPSE, data.bnpb.go.id, dan JDIH tetap pemilik datanya. Kita membaca, menghitung, dan menautkan balik.
3. **Tiap angka membawa sumbernya, tanggalnya, dan labelnya** (resmi, sekunder dari berita, hitungan kita, atau proksi). Angka hitungan kita tidak pernah ditulis seolah angka resmi. Karena kartu `.ex-std` tidak memakai kaki sumber (AGENTS.md §3.5), sumber ditaruh di atribut `data-sumber` dan `title` pada tiap angka, dan labelnya tampil sebagai pil kecil.
4. **Tiap aturan membawa pasalnya.** Ambang, tenggat, dan rumus diambil dari pasal yang berstatus BERLAKU dan dikutip di berkas aturan. Tanpa pasal, ambang ditandai "asumsi" dan tampil begitu.
5. **Staf saja dulu.** Semua layar baru di balik sesi staf BNPB. Pembukaan ke publik adalah keputusan pemilik per layar.
6. **Tanpa data pribadi.** Tidak memanen nama, kontak, atau tanggal lahir orang. Layer Survey123 penilaian awal di gis.bnpb.go.id yang terbuka ke publik dilaporkan ke Pusdatinkom dan tidak dipanen.
7. **Hemat kuota D1.** Hasil hitungan berkala ditulis sebagai JSON di R2 `unit/<nama>.json` dan dibaca lewat rute staf `GET /api/unit/data/:nama` (pola `src/dalops.js`, nama baku di §8). Berkas di `public/data` disajikan sebagai aset statis tanpa Worker, jadi tidak bisa dijaga sesi dan tidak dipakai untuk data staf. D1 hanya untuk isian manusia dan jejak.
8. **Kode terbuka untuk Unit TIK.** Perban 10/2025 Pasal 24 ayat (4) mewajibkan kode sumber sistem buatan pihak eksternal diserahkan ke Unit TIK. Bawaan: tiap modul disertai tautan repo dan dokumentasi teknis.

## 4. Mesin bersama

Sebagian besar usulan memakai delapan mesin yang sama. Mesin ini dibangun sekali, lalu tiap unit memakai ulang.

| Kode | Mesin | Isi | Dipakai oleh |
| --- | --- | --- | --- |
| MB-1 | Status peraturan | Membaca ulang klausul pencabutan dan perubahan di seluruh korpus JDIH, membetulkan status di katalog, menandai konflik "menurut teks" lawan "menurut JDIH", dan mencatat amanat pengaturan turunan yang belum terbit | HUK-1, HUK-2, SPB-1 |
| MB-2 | Jam Aturan | Satu berkas tenggat dan ambang bersitasi pasal (contoh: kaji cepat 24 jam dan 72 jam, laporan DSP tiap tanggal 5, SPJ DSP 3 bulan sesudah status berakhir, R3P 90 hari, renkon berlaku 3 tahun dan direviu tiap 6 bulan, Destana dinilai ulang paling lama 3 tahun, evaluasi peringatan dini tiap 4 bulan) yang dibaca semua meja dan pengingat | KPOD-2, RRX-1, REN-3, KS-4, PLP-3, PD-1 |
| MB-3 | Pemanen JDIH daerah | Membaca JDIH pemda lewat JDIHN, mengenali dokumen RPBD, renkon, RPKB, dan rencana aksi, lalu mencatat status per pemda | PSPB-1, KS-1 |
| MB-4 | Skor prioritas daerah | Satu fungsi skor risiko x celah kapasitas x celah layanan per kab/kota dengan bobot yang tampil, dipakai untuk memilih daerah dampingan, sasaran diklat, penerima hibah, dan prioritas mitigasi | PERB-1, MT-2, DIK-1, PLP-2, OJL-2 |
| MB-5 | Neraca kebutuhan | Kebutuhan dihitung dari standar (Perka 7/2008, Perka 23/2014, Juknis 9/2023) lawan ketersediaan atau realisasi, per kab/kota | PLP-1, WIL-2, RRP-1, RRS-1, OJL-1 |
| MB-6 | Rapor dari data | Kartu rapor `.ex-std` yang menghitung indikator dari data, bukan diisi tangan, dengan jejak rumus | KPOD-1, PD-1, PUS-1, REN-1, KEU-1, SDU-1, IRT-1, OJL-3, PSPB-3 |
| MB-7 | Penerima dokumen | Dokumen dari WA, PDF, atau rilis resmi diurai menjadi baris berlabel (resmi atau sekunder), lalu staf mengetuk setuju | KPOD-3, RRP-2, WIL-2, RRI-1 |
| MB-8 | Panen sumber resmi terbuka | Satu pustaka ambil-data dengan atribusi, cache, dan jeda untuk API CKAN data.bnpb.go.id, layer ArcGIS gis.bnpb.go.id (agregat kab saja), API publik INALOGPAL, dan SIRUP | PUS-1, RRP-1, RRI-1, OJL-3, SDU-1 |

## 5. Katalog sistem per unit dan fasenya

Fase: **F0** = perbaikan yang sudah terbukti salah di repo, dikerjakan pertama. **F1** = ukuran S, datanya sudah ada. **F2** = ukuran M, atau menunggu MB-3/MB-7. **F3** = ukuran L, atau menunggu izin data atau keputusan pemilik. **T** = ditunda atau tidak dibangun.

### 5.0 Perbaikan F0 (tanpa layar baru)

| ID | Perbaikan | Bukti |
| --- | --- | --- |
| F0-1 | Status katalog JDIH: 13 peraturan tertulis BERLAKU padahal dicabut menurut teks pencabutnya (dihitung ulang di `RENCANA-UJI.md`; riset awal menyebut sedikitnya 19), antara lain `perka-1-2012`, `perka-7-2015`, `perka-4-2008`, juknis JF lama Perban 6/2021 dan 7/2021, dan Perka 4/2016. Penyebab: `_konteks()` di `scripts/bnpb/hukum.py` memotong kalimat pencabutan di tanda `;` dan di sitasi berikutnya, sehingga dokumen kedua dan seterusnya dalam satu daftar pencabutan tidak tercatat (DESAIN-TEKNIS §F0-1) | `riset/6` §4, `riset/2` temuan 6, `riset/1` SPB-1 |
| F0-2 | Ambang meja yang tidak berdasar pasal: `renkon_uji_hari: 365` (seharusnya berlaku 3 tahun, reviu 6 bulan, Perban 2/2023 Pasal 21), enam `INDIKATOR_DESTANA` karangan (Perban 7/2025 Pasal 13-14), `dsp` 30 hari (Perban 4/2020: laporan tiap tanggal 5, SPJ 3 bulan), `kaji_cepat` 72 jam (Juklak 3/2022: 24 jam dan 72 jam) | `riset/2` temuan 5, `riset/3` A2 |
| F0-3 | Meja `rehab` dilepas dari syarat wajib tertaut kaji cepat (`src/meja.js` dan pemicu di `migrations/0026_meja.sql`) supaya bisa terisi dari neraca rumah rusak | `riset/5` temuan 9 |

### 5.1 Katalog

| ID | Unit | Sistem | Ukuran | Fase | Mesin | Rujukan riset |
| --- | --- | --- | --- | --- | --- | --- |
| PERB-1 | PERB | Pemilih daerah pendampingan IKD berdasarkan dampaknya ke IRB | S | F1 | MB-4 | 1 §1.5 |
| PERB-2 | PERB | Perkiraan berjalan kerugian ekonomi langsung per kab/kota | M | F2 | MB-5 | 1 §1.5 |
| PERB-3 | PERB | Pemeriksa bukti IKD praisi | M | F3 | - | 1 §1.5 |
| PSPB-1 | PSPB | Register status RPBD 552 pemda dari JDIH daerah | M | F2 | MB-3 | 1 §2.4 |
| PSPB-2 | PSPB | Kotak masuk laporan monev RPBD | M | T | - | 1 §2.4 |
| PSPB-3 | PSPB | Rapor indikator Sendai dan SDGs 11.b | M | F2 | MB-6 | 1 §2.4 |
| SPB-1 | SPB | Peta NSPK per fase dan jenis bencana, dengan status dan tenggat Renstra | M | F2 | MB-1 | 1 §3.4 |
| SPB-2 | SPB | Peta keterpaduan sistem PB (aplikasi, data, aliran) | M | F3 | - | 1 §3.4 |
| SPB-3 | SPB | Lapisan "kejadian di hari ini" untuk literasi sejarah | S | T | - | 1 §3.4 |
| PUS-1 | PUS | Rapor walidata Satu Data Bencana dari API CKAN | S | F1 | MB-6, MB-8 | 1 §4.4 |
| PUS-2 | PUS | Usulan KIB 16 digit dan pencocok logbook ke DIBI | M | F2 | - | 1 §4.4 |
| PUS-3 | PUS | Katalog dan pemantau ketersediaan layanan TIK publik BNPB | S | F3 | - | 1 §4.4 |
| PUS-4 | PUS | Jam rilis informasi kejadian (kurang dari 2 jam) | S | T | MB-2 | 1 §4.4 |
| PD-1 | PD | Rapor peringatan dini dan umpan balik BPBD, laporan 4-bulanan | M | F2 | MB-2, MB-6 | 2 §1.4 |
| PD-2 | PD | Peta cakupan layanan peringatan dini lawan penduduk terpapar | M | F2 | - | 2 §1.4 |
| PD-3 | PD | Penyusun pesan peringatan berstandar Perban 2/2024 Pasal 20 | S | F1 | - | 2 §1.4 |
| PD-4 | PD | Papan konektivitas data K/L | M | F3 | - | 2 §1.4 |
| KS-1 | KS | Pemantau dokumen kesiapsiagaan daerah (RPKB, renkon, rencana aksi) | M | F2 | MB-3 | 2 §2.4 |
| KS-2 | KS | Registri dan sasaran Destana sesuai Perban 7/2025 | M | F3 | - | 2 §2.4 |
| KS-3 | KS | Kesenjangan lokasi evakuasi | M | F2 | - | 2 §2.4 |
| KS-4 | KS | Kalender gladi pra-musim | S | F1 | MB-2 | 2 §2.4 |
| MT-1 | MT | Penyusun dan pra-telaah usulan Dana Bersama prabencana | L | F2* | - | 2 §3.4 |
| MT-2 | MT | Daftar daerah prioritas mitigasi dan paket kegiatan yang cocok | M | F2 | MB-4 | 2 §3.4 |
| MT-3 | MT | Kalender kampanye dan sasaran edukasi per kab | S | F2 | MB-2 | 2 §3.4 |
| MT-4 | MT | Registri rambu dan papan informasi | M | F3 | - | 2 §3.4 |
| KPOD-1 | KPOD | Rapor intervensi status darurat (IKU Program 3) dari data | M | F2 | MB-6 | 3 A1 |
| KPOD-2 | KPOD | Jam Aturan (berkas tenggat juklak untuk semua meja) | S | F1 | MB-2 | 3 A2 |
| KPOD-3 | KPOD | Laporan harian terurai otomatis dari PDF di WA | S-M | F1 | MB-7 | 3 A3 |
| WIL-1 | WIL | Meja Wilayah: siapa yang harus diurus hari ini, per direktorat | M | F2 | MB-2 | 3 W1 |
| WIL-2 | WIL | Pengungsi per tempat pengungsian, kebutuhan dasar terhitung, selisih pusat-daerah | L | F2* | MB-5, MB-7 | 3 W2 |
| WIL-3 | WIL | Kaji cepat dua tahap yang drafnya terisi sendiri | M | F2 | MB-2 | 3 W3 |
| WIL-4 | WIL | Jejak DSP per kejadian (internal) | M | F3 | - | 3 W4 |
| PLP-1 | PLP | Neraca stok penyangga 514 kab/kota (Perka 23/2014) | S-M | F1 | MB-5 | 4 P1 |
| PLP-2 | PLP | Daftar pendek penerima hibah logpal (7 kriteria Juklak 3/2024) | M | F2 | MB-4 | 4 P2 |
| PLP-3 | PLP | Pengingat kewajiban pasca-hibah dan kedaluwarsa lewat WA | S | F2 | MB-2 | 4 P3 |
| OJL-1 | OJL | Optimasi lokasi gudang dan penempatan stok di muka (p-median waktu tempuh) | L | F3 | MB-5 | 4 O1 |
| OJL-2 | OJL | Penempatan stok musiman dan menjelang kejadian dari `/prediksi` | M | F2 | MB-4 | 4 O2 |
| OJL-3 | OJL | Rapor Klaster Logistik dari API INALOGPAL | S-M | F2 | MB-6, MB-8 | 4 O3 |
| OJL-4 | OJL | Standar peralatan lintas bencana di inventaris `/instansi` | M | F3 | - | 4 O4 |
| RRX-1 | Deputi RR | Jam pascabencana per kab (R3P 90 hari dan tahapan hibah) | S-M | F1 | MB-2 | 5 D1 |
| RRP-1 | RRP | Neraca rumah rusak per kab: lapor, verifikasi, tersalur | M | F2 | MB-5, MB-8 | 5 P1 |
| RRP-2 | RRP | Panen angka pemulihan dari rilis resmi | S-M | F2 | MB-7 | 5 P2 |
| RRP-3 | RRP | Kalkulator Jitupasna permukiman (Perka 15/2011) | S | F1 | - | 5 P3 |
| RRI-1 | RRI | Daftar akses putus sampai pulih | M | F2 | MB-7, MB-8 | 5 I1 |
| RRI-2 | RRI | Prapemeriksaan usulan hibah RR | M-L | F3 | - | 5 I2 |
| RRI-3 | RRI | Aset hasil hibah di atas peta bahaya | S | F3 | - | 5 I3 |
| RRS-1 | RRS | Taksiran cepat kerugian pertanian per kab | S-M | F2 | MB-5 | 5 S1 |
| RRS-2 | RRS | Kurva pulih ekonomi dari lampu malam (lab) | L | F3 | - | 5 S2 |
| RRS-3 | RRS | Daftar fasilitas sosial rusak untuk bab sosial R3P | S | F1 | - | 5 S3 |
| REN-1 | REN | Rapor Reformasi Birokrasi: di mana poin hilang | S | F1 | MB-6 | 6 P1 |
| REN-2 | REN | Peta belanja lawan peta risiko dari SIRUP | M | F2 | MB-8 | 6 P2 |
| REN-3 | REN | Kalender monev dan tenggat pelaporan | S | F1 | MB-2 | 6 P3 |
| KEU-1 | KEU | Penguji konsistensi angka LAKIP dan LK | S | F1 | MB-6 | 6 K1 |
| KEU-2 | KEU | Pantau deviasi rencana penarikan dana per unit | M | F3 | - | 6 K2 |
| SDU-1 | SDU | Rapor tata kelola pengadaan dari SIRUP dan SPSE | M | F2 | MB-6, MB-8 | 6 S1 |
| SDU-2 | SDU | Rekap kehadiran tugas lapangan untuk pelengkap tukin | S | F3 | - | 6 S2 |
| SDU-3 | SDU | BMN lawan bahaya | S | F3 | - | 6 S3 |
| HUK-1 | HUK | Pemeriksa status peraturan | S | F1 | MB-1 | 6 H1 |
| HUK-2 | HUK | Pelacak amanat pengaturan turunan dan bahan Indeks Reformasi Hukum | M | F2 | MB-1 | 6 H2 |
| HUK-3 | HUK | Register kerja sama | M | T | - | 6 H3 |
| IRT-1 | IRT | Papan umur rekomendasi TLHP per unit | M | F2 | MB-6 | 6 I1 |
| IRT-2 | IRT | Sinyal risiko pengadaan untuk pengawasan tujuan tertentu | M | F3 | MB-8 | 6 I2 |
| IRT-3 | IRT | Register risiko yang terisi sendiri dari capaian | M | F3 | - | 6 I3 |
| DIK-1 | DIK | Peta sasaran diklat berbasis risiko | M | F2 | MB-4 | 6 D1 |
| DIK-2 | DIK | STTP elektronik terverifikasi dan registri alumni | S | F3 | - | 6 D2 |
| DIK-3 | DIK | Survei retensi dan kemanfaatan lewat WA | M | F3 | - | 6 D3 |
| DIK-4 | DIK | Bank tenaga pengajar dari direktori pakar | S | F2 | - | 6 D4 |
| JF-1 | JF | Kamus kompetensi PB.01-PB.58 terstruktur dan jalur pengembangan | S | F1 | - | 6 J1 |
| JF-2 | JF | Hitung kebutuhan formasi JF per instansi | M | F2 | - | 6 J2 |
| JF-3 | JF | Registri pejabat JF dan pemantau kepatuhan | M-L | F3 | - | 6 J3 |

F2* = ukuran L yang tetap di F2 karena dibutuhkan sebelum puncak musim hujan 2026/2027 (WIL-2) atau sebelum siklus usulan Dana Bersama 2027 (MT-1).

Jumlah: 3 perbaikan F0, 8 mesin bersama, 70 usulan (F1: 15, F2: 31, F3: 20, T: 4).

## 6. Bentuk produk

1. Pintu staf `/bnpb/unit` berisi kartu per kedeputian dan pusat. Tiap unit punya halaman `/bnpb/unit/<kode>` (contoh `/bnpb/unit/plp`), yang memuat kartu `.ex-std` (AGENTS.md §3.5) untuk tiap sistem yang sudah jadi.
2. Satu sistem = satu kartu atau satu sub-layar. Layar yang sudah ada (Meja Kerja, Dalops, risiko, pendataan, kinerja, hukum) dipakai ulang lewat tautan, tidak disalin.
3. Pemilik pengerja: layar di `public/bnpb/unit/**` dipegang `ruang-bnpb`; rute dan migrasi di `src/**` dan `migrations/**` dipegang `warga-api`; pipeline di `scripts/bnpb/unit/**` dipegang `ruang-bnpb`; perbaikan katalog hukum di `scripts/bnpb/hukum.py` dipegang `ruang-bnpb`. Pemeriksa mengikuti AGENTS.md §6.

## 7. Pertanyaan untuk pemilik (dengan bawaan)

Pertanyaan yang paling menentukan. Pertanyaan teknis per unit ada di bagian pertanyaan tiap berkas `riset/`, dan bawaannya berlaku bila tidak dijawab.

| No | Pertanyaan | Bawaan bila tidak dijawab |
| --- | --- | --- |
| U1 | Apakah Centurisk97 berstatus sistem pihak eksternal yang wajib menyerahkan kode sumber ke Unit TIK (Perban 10/2025 Pasal 24 ayat 4)? | Ya; tiap modul disertai tautan repo dan dokumentasi teknis |
| U2 | Semua layar Ruang Unit hanya untuk staf, atau ada yang boleh publik? | Staf saja; pembukaan ke publik diputuskan per layar |
| U3 | Peran staf `pusdalops` di repo diganti nama menjadi Dit. KPOD/Koordalops? | Nama peran tetap; label layar "Dit. Koordalops" |
| U4 | Bolehkah memanen sumber resmi terbuka (API CKAN data.bnpb.go.id, layer ArcGIS gis.bnpb.go.id agregat kab, API publik INALOGPAL, SIRUP) sekali sehari dengan atribusi? | Ya, hanya agregat, tampil di layar staf saja sampai ada izin tertulis unit pemilik data |
| U5 | Bolehkah memanen JDIH pemda lewat JDIHN secara berkala (jeda 1 detik, cache 30 hari)? | Ya, dengan atribusi |
| U6 | Layer Survey123 penilaian awal yang membuka data pribadi responden dilaporkan ke Pusdatinkom? | Ya, pemilik yang menyampaikan; layer itu tidak dipanen |
| U7 | Daftar status katalog JDIH yang salah dilaporkan resmi ke Biro Hukum atau pengelola JDIH? | Kita koreksi tampilan dengan label "menurut teks", pemilik meneruskan daftarnya |
| U8 | WIL-4 (jejak DSP per kejadian) dibangun sekarang di tengah kasus KPK DSP 2026, atau ditunda? | Ditunda ke F3; bila dibangun, internal saja tanpa nama orang |
| U9 | IRT-2 (sinyal risiko pengadaan) dan IRT-1/KEU-2 (data TLHP dan SAKTI) boleh masuk D1 produksi di balik login? | Tidak; dijalankan sebagai skrip lokal yang menghasilkan laporan untuk pemilik |
| U10 | Data yang bisa dimintakan ke direktorat: daftar Destana (KS-2), penerima paket sirine (PD-2), penerima hibah logpal 3 tahun (PLP-2), ekspor E-Pelaporan dan Mapping Aset RR (RRI-3), nilai IKD 2025 per kab (PERB-1) | Tidak dianggap tersedia; sistem yang bergantung padanya memakai proksi berlabel atau ditunda |
| U11 | Gateway WA boleh mengirim pertanyaan satu ketuk ke kontak BPBD (umpan balik peringatan PD-1, kewajiban pasca-hibah PLP-3, pengungsian WIL-2)? | Belum; menunggu akun WA OTP (OUTSTANDING E1) dan gateway hidup lagi |
| U12 | Urutan mulai | F0 dulu, lalu F1 dimulai dari mesin MB-1, MB-2, MB-6, dan sistem yang memakainya: HUK-1, KPOD-2, RRX-1, PLP-1, PERB-1, PUS-1 |

## 8. Nama baku teknis (keputusan sesi induk, 5 Nov 2026)

Dokumen saudara sempat memakai nama berbeda untuk hal yang sama. Yang berlaku hanya yang di bawah ini. Dokumen lain yang menyimpang dibetulkan mengikuti tabel ini.

| Hal | Nama baku | Yang tidak dipakai |
| --- | --- | --- |
| Penyimpanan keluaran | R2 `unit/<nama>.json` | `unit/<kode>/<berkas>` |
| Rute baca data | `GET /api/unit/data/:nama` (sesudah `stafOK`; berkas kelas terbatas memakai `modAtauStaf` dengan daftar `DATA_UNIT_TERBATAS`) | `/api/unit/<kode>/<berkas>`, `/api/bnpb/unit/...` |
| Peran tulis staf | `unit` | `analis_unit` |
| Jam Aturan (MB-2) | `public/inti/jam_aturan.json` dan `public/inti/jam_aturan.js` (isinya aturan publik, bukan data staf) | `public/data/bnpb/jam_aturan.json` |
| Halaman masuk untuk tamu | `/admin/masuk?ke=<jalur>` | `/admin/pantau` |
| Ukuran basi | `basi_jam` per berkas; berkas bulanan 1.080 jam (45 hari) | `periode_hari` |
| Jadwal MB-3 | mingguan untuk semua jenis dokumen daerah | bulanan |
| Migrasi meja | 0110 hanya untuk F0-3 (bangun ulang `meja_catatan`); RPBD, RPKB, tahap R3P, dan kaji cepat dua tahap lewat `unit_ketuk` atau hitungan, tanpa bangun ulang kedua | satu bangun ulang gabungan |
| Unggah CSV DIK-1 | peran `unit` | sesi admin |
| Nama berkas uji dan gerbang | mengikuti `RENCANA-UJI.md` | nama lain di PRD/DT |
| Nomor migrasi | 0110-0113 per DT, diperiksa ulang saat tiket dikerjakan karena sesi lain bisa mengambil nomor duluan | - |
| Rumus, nama kunci Jam Aturan, dan kasus acuan | `ALGORITMA.md` menang atas PRD, DT, dan RU untuk isi rumus. MB-4 = rata-rata geometrik berbobot dari persentil (ALGORITMA §5.2), komponen risiko bawaan = penduduk terpapar bahaya tinggi, bukan `R_total` | rumus MB-4 lain di PRD/RU |
| Fase MB-4 | F1, karena PERB-1 (F1) memakainya | Januari 2027 |
| Pengerja `public/inti/jam_aturan.*` | `inti-layar` (pemilik `public/inti/**` menurut `ilmu.mjs`) | `ruang-bnpb` |

Bagian §8 ini menang atas `PRD.md` dan dokumen lain untuk hal yang tercantum di tabel, walaupun PRD lebih tinggi di urutan otoritas umum.
