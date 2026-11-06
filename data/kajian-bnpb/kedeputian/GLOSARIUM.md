# GLOSARIUM: Ruang Unit BNPB

Versi 1, 5 November 2026. Istilah, singkatan unit, nama sistem resmi, dokumen, dan istilah teknis repo yang dipakai di `KEPUTUSAN-AWAL.md` (KA), `PRD.md`, `DESIGN-SYSTEM.md` (DS), `DESAIN-TEKNIS.md` (DT), `RENCANA-UJI.md` (RU), dan `ALUR.md`. Rujukan pasal diambil dari dokumen itu dan `riset/1-6`; istilah tanpa pasal di korpus ditandai "tanpa pasal di korpus". Urut abjad dalam tiap tabel.

## 1. Kode unit

Kode dipakai di jalur `/bnpb/unit/<kode>` dan di ID sistem (KA §1, DT §4.9 `KODE_UNIT`). Dasar OTK: Perban 6/2025 jo. Perban 11/2025.

| Kode | Unit | Kelompok |
| --- | --- | --- |
| DIK | Pusat Pendidikan dan Pelatihan PB (Pusdiklat PB) | Pusat |
| HUK | Biro Hukum, Organisasi, dan Kerja Sama | Sekretariat Utama |
| IRT | Inspektorat I, II, III | Inspektorat Utama |
| JF | Pusat Pembinaan Jabatan Fungsional Kebencanaan (Pusbin JF); Pasal 121-124 Perban 6/2025 jo. 11/2025, dulu pasal Pusdalops | Pusat |
| KEU | Biro Keuangan | Sekretariat Utama |
| KPOD | Dit. Koordinasi Pengendalian Operasi Darurat; penerbit Laporan Harian sejak Maret 2026 dengan nama "Dit. Koordalops"; dilayani modul Dalops di repo | Deputi Penanganan Darurat |
| KS | Dit. Kesiapsiagaan | Deputi Pencegahan |
| MT | Dit. Mitigasi Bencana | Deputi Pencegahan |
| OJL | Dit. Optimasi Jaringan Logistik dan Peralatan | Deputi Logistik dan Peralatan |
| PD | Dit. Peringatan Dini | Deputi Pencegahan |
| PERB | Dit. Pemetaan dan Evaluasi Risiko Bencana | Deputi Sistem dan Strategi |
| PLP | Dit. Pengelolaan Logistik dan Peralatan | Deputi Logistik dan Peralatan |
| PSPB | Dit. Pengembangan Strategi PB | Deputi Sistem dan Strategi |
| PUS | Pusat Data, Informasi, dan Komunikasi Kebencanaan (Pusdatinkom); walidata dan Unit TIK | Pusat |
| REN | Biro Perencanaan | Sekretariat Utama |
| RRI | Dit. RR Infrastruktur | Deputi RR |
| RRP | Dit. RR Perumahan | Deputi RR |
| RRS | Dit. RR Sosial, Ekonomi, dan Lingkungan Hidup | Deputi RR |
| RRX | Deputi RR lintas direktorat (bukan unit OTK; kode program untuk sistem bersama tiga direktorat RR, Perban 11/2025 Pasal 82) | Deputi RR |
| SDU | Biro SDM dan Umum, termasuk Bagian Pengadaan Barang dan Jasa (Perban 11/2025 Pasal 36A-36C) | Sekretariat Utama |
| SPB | Dit. Sistem PB | Deputi Sistem dan Strategi |
| WIL | Dit. Penanganan Darurat Wilayah I, II, III; pembagian provinsi Perban 11/2025 Pasal 74, 77, 79A (`public/data/bnpb/dit_wilayah.json`) | Deputi Penanganan Darurat |

## 2. Istilah, singkatan, sistem, dan dokumen

Kolom "Jenis": **D** dokumen atau aturan, **I** indikator atau ukuran, **S** sistem atau sumber resmi di luar repo, **U** istilah umum PB, **R** istilah teknis repo dan paket ini.

| Istilah | Jenis | Arti | Rujukan |
| --- | --- | --- | --- |
| `akses_status` | R | Tabel D1 status titik akses putus (putus, darurat, pulih) per tanggal; hanya ditambah | DT §2.2, ALUR §3.2 |
| Amanat pengaturan turunan | U | Kalimat di sebuah peraturan yang mendelegasikan pengaturan lebih lanjut ("ditetapkan oleh Kepala", "diatur dengan Peraturan Badan"); dilacak HUK-2 | DT §6.27; contoh Perban 4/2025 Pasal 38, 52 ayat (2), 53 ayat (3) |
| APIP | U | Aparat Pengawasan Intern Pemerintah; di BNPB Inspektorat Utama. Tindak lanjut rekomendasinya dipantau di SIMHPNAS | Pedoman 1/2025 (riset/6 §5) |
| ArcGIS BNPB | S | Layanan peta `gis.bnpb.go.id`; dipanen agregat kab saja dengan `returnGeometry=false` dan `outFields` daftar putih | DT §8 |
| Asumsi (label) | R | Angka atau ambang tanpa pasal BERLAKU di korpus; wajib tampil berlabel "asumsi" (contoh masa status, ambang IKD 0,40/0,80, laporan hibah logpal 12 bulan) | KA §3 butir 4, DT §4.2 |
| BAST | D | Berita Acara Serah Terima; di PLP-3 dasar tenggat laporan penggunaan barang hibah logpal | Juklak 3/2024; DT §6.18 |
| Basi | R | Berkas R2 yang umurnya melewati `basi_jam`; angka tetap tampil dengan pil "basi sejak ‹tanggal›" | DT §9.4, DS §8.4 |
| `basi_jam` | R | Batas umur berkas R2 dalam jam: harian 48, mingguan 240, bulanan 1.080 (45 hari), statis kosong | DT §9.4, KA §8 |
| BPBD | U | Badan Penanggulangan Bencana Daerah; bagian dari "kita", penerima turunan sistem lewat unit BNPB | KA §3 |
| BPDLH | U | Badan Pengelola Dana Lingkungan Hidup (Kemenkeu), pengelola Dana Bersama | riset/2 §3 |
| BPK | U | Badan Pemeriksa Keuangan; tindak lanjut rekomendasinya dicatat di SIPTL | Pedoman 1/2025 |
| BPS WebAPI | S | API Badan Pusat Statistik berkunci `BPS_KEY` untuk IKK konstruksi, PDRB, GKP | DT §8; kunci di Keychain pemilik, belum jadi GitHub secret |
| CKAN | S | Perangkat lunak portal data di balik `data.bnpb.go.id`; API `organization_list`, `package_search` dipakai PUS-1 | DT §5.2, §8 |
| D1 | R | Basis data SQLite Cloudflare (`poskowarga`); di Ruang Unit hanya untuk isian manusia dan jejak | KA §3 butir 7, DT §1.3 |
| Dana Bersama | U | Dana penanggulangan bencana bersama (pooling fund) yang dikelola BPDLH; usulan prabencana ditelaah tim bidang pencegahan | Perban 1/2026 Pasal 27, 33; Juklak 4/2025 |
| Dana Tunggu Hunian (DTH) | U | Bantuan sewa sementara bagi warga yang rumahnya rusak sambil menunggu hunian; contoh Rp600.000 per bulan selama 3 bulan | Juklak 1/2023, 15/2025 (riset/5) |
| `DATA_UNIT` | R | Daftar tetap nama berkas R2 yang boleh dibaca lewat `GET /api/unit/data/:nama`; nama lain 404 tanpa menyentuh R2 | DT §4.9 |
| `DATA_UNIT_TERBATAS` | R | Bagian `DATA_UNIT` berkelas T; dibaca lewat `modAtauStaf`, sehingga akun gerbang `AKUN_SITUS*` ditolak | KA §8, KEAMANAN-PRIVASI §2.3 |
| data.bnpb.go.id | S | Portal Satu Data Bencana BNPB (CKAN); halaman web 403 ke mesin, API terbuka | DT §8 |
| Destana | U | Desa/Kelurahan Tangguh Bencana; tingkat pratama, madya, utama; dinilai mandiri paling sedikit 3 tahun sekali; indikatornya SNI | Perban 7/2025 Pasal 13, 14 ayat (5) dan (6), 20 |
| DIBI | S | Data dan Informasi Bencana Indonesia, basis data kejadian dan dampak BNPB; di repo `public/data/dibi_kejadian.json`, `dibi_kab_tahun.json` | KA §3 butir 2 |
| `DILARANG` | R | Daftar pola URL di `scripts/bnpb/unit/panen.py` yang tidak pernah diminta (Survey123, layer bertitik per rumah, `get_instansi_survey`, berita BNPB otomatis) | DT §8 |
| DSP | U | Dana Siap Pakai; laporan kejadian paling lambat 3 hari, laporan perkembangan tiap tanggal 5 bulan berikutnya, SPJ paling lambat 3 bulan setelah status berakhir | Perban 4/2020 Pasal 4, 21 ayat (1) dan (2) |
| `dummy` | R | Kolom penanda baris uji di tabel D1; baris `dummy = 1` boleh dihapus dan tidak dibaca pipeline | DT §2.2 |
| E-Pelaporan RR | S | Sistem resmi pelaporan rehabilitasi dan rekonstruksi; ekspornya belum tersedia untuk kita (U10) | KA §3 butir 2, §7 U10 |
| e-Purchasing | U | Pembelian lewat katalog elektronik; porsinya diukur SDU-1 | DT §6.26 |
| EPSS | I | Evaluasi Penyelenggaraan Statistik Sektoral (Indeks Pembangunan Statistik); BNPB 2,59 lawan target 2,6 pada 2025 | Renstra hal. 135-141 (riset/1 §4) |
| ESMS | U | Environmental and Social Management System; kelas risiko lingkungan dan sosial per kode kegiatan Dana Bersama | Juklak 4/2025 Lampiran I; DT §6.10 |
| F0, F1, F2, F2*, F3, T | R | Fase program: F0 perbaikan yang terbukti salah; F1 ukuran S datanya ada; F2 ukuran M atau menunggu MB-3/MB-7; F2* ukuran L yang tetap F2 (MT-1, WIL-2); F3 ukuran L atau menunggu izin; T ditunda | KA §5 |
| FAR | I | False Alarm Ratio = peringatan palsu / (hit + palsu); dipakai PD-1 | DT §6.6 |
| FEFO, FIFO | U | First Expired First Out (yang kedaluwarsa duluan keluar duluan) dan First In First Out; aturan keluar logistik di gudang | Perban 4/2018 Pasal 7 ayat (3) huruf c |
| `gabung()` | R | Fungsi MB-7 yang menggabungkan usulan di R2 dengan keputusan terbaru di `unit_ketuk` | DT §4.7 |
| Gerbang | R | Uji tanpa DB di `tests/agen/**` yang menolak pelanggaran aturan secara mekanis (contoh `gerbang-jam-aturan`, `gerbang-kartu-std`) | AGENTS.md §3.4, RU §6 |
| Gerbang jujur | R | Pembanding wajib sebelum angka hitungan tampil; bila gagal, kartu menulis kalimat pengganti (PERB-2, KPOD-1, RRS-1) | DT §6.1, §6.13, §6.24 |
| Gladi Ruang, Gladi Lapang | U | Latihan kesiapsiagaan di ruang (meja) dan di lapangan; diselenggarakan BPBD kab/kota | Juklak 4/2026 |
| GKP | U | Gabah Kering Panen; harga dari BPS dipakai RRS-1 | DT §6.24 |
| `hibah_bast` | R | Tabel D1 BAST hibah logistik dan peralatan; diisi impor skrip, hanya tanggal laporan dan beberapa medan pelengkap yang boleh berubah | DT §2.2, ALUR §3.3 |
| Hibah logpal | U | Bantuan logistik dan peralatan dari BNPB ke daerah, dipilih dengan tujuh kriteria | Juklak 3/2024; DT §6.17 |
| Hibah RR | U | Hibah rehabilitasi dan rekonstruksi ke pemda; laporan berkala tiap 3 bulan, paling lambat 15 hari setelah tahap; aset desa tidak bisa dihibahkan | Juklak 9/2024; Perban 4/2024 Pasal 5 huruf e |
| Hit, palsu, terlewat | I | Kelas penilaian peringatan PD-1: ada kejadian dalam jendela, tidak ada kejadian, kejadian tanpa peringatan dalam 72 jam sebelumnya | DT §6.6 |
| Hitungan kita (label) | R | Angka yang dihitung Centurisk97, tidak pernah ditulis seolah angka resmi | KA §3 butir 3 |
| Huntara, huntap | U | Hunian sementara dan hunian tetap pascabencana; angkanya dipanen RRP-2 dari rilis | DT §6.22 |
| IKD | I | Indeks Ketahanan Daerah; IKU Deputi Sistem dan Strategi (daerah berkapasitas minimal sedang 50% lawan target 67% pada 2025). Di repo `ikd.json` adalah proksi raster, bukan IKD resmi | KA §2 butir 2; DT §5.1 |
| IKK (tiga arti) | I | (1) Indikator Kinerja Kegiatan Renstra (contoh IKK renkon 4,27%); (2) Indeks Kualitas Kebijakan, komponen nilai RB (2024 bernilai 0); (3) Indeks Kemahalan Konstruksi BPS untuk RRP-3. Selalu tulis kepanjangannya bila konteksnya tidak jelas | riset/2, riset/6 P1, riset/5 P3 |
| IKSS, IKU | I | Indikator Kinerja Sasaran Strategis dan Indikator Kinerja Utama; IKU Program 3 = intervensi status darurat (KPOD-1) | LAKIP; DT §6.13 |
| INALOGPAL | S | Sistem informasi logistik dan peralatan BNPB `inalogpal.bnpb.go.id`; API publik tanpa login dipakai PLP-1, OJL-3; modul WMS masih "Segera Hadir" | KA §2 butir 1, DT §8 |
| InaRISK | S | Portal kajian risiko BNPB; pemilik data kelas bahaya | KA §3 butir 2 |
| `indeks.json` | R | Berkas R2 yang mencatat tiap keluaran Ruang Unit: nama, sistem, `dibuat`, `basi_jam`, `ok`, galat | DT §9.4 |
| IRB | I | Indeks Risiko Bencana; rumus R = (H x V x (1 - C))^(1/3); IKU penurunan 1,03% lawan target 1,2% pada 2025 | Perka 2/2012; KA §2 butir 2; DT §5.1 |
| IRBI | I | Indeks Risiko Bencana Indonesia, publikasi resmi IRB; angka kita selalu berlabel "bukan IRBI resmi" | riset/2 MT-1 |
| IRH | I | Indeks Reformasi Hukum, komponen nilai RB (2024 bernilai 0); bahan HUK-2 | riset/6 H2 |
| Jam Aturan | R | MB-2: satu berkas tenggat dan ambang bersitasi pasal (data `public/inti/jam_aturan.json`, fungsi `public/inti/jam_aturan.js`; pengerja `inti-layar`) | KA §8, ALGORITMA §3 |
| JDIH, JDIHN | S | Jaringan Dokumentasi dan Informasi Hukum BNPB (`jdih.bnpb.go.id`) dan nasional (`jdihn.go.id`); JDIH BNPB pemilik status resmi peraturan | DT §8; Biro Hukum (riset/6 §4) |
| Jitupasna | D | Pengkajian Kebutuhan Pascabencana; formulir permukiman lampiran 7 | Perka 15/2011; DT §5.9 |
| JP (dua arti) | U | (1) Jam Pelajaran pengembangan kompetensi JF, 20 JP per tahun (Perban 4/2025 Pasal 40); (2) jumlah penduduk dalam rumus PLP-1 (DT §5.7) | DT §5.7, §5.15 |
| Juklak, Juknis, Pedoman | D | Petunjuk pelaksanaan, petunjuk teknis, dan pedoman yang diterbitkan BNPB; berstatus di katalog JDIH | `public/data/bnpb/hukum/katalog.json` |
| Kaji cepat | U | Pengkajian cepat TRC: bergerak paling lambat 24 jam setelah perintah, laporan awal 24 jam dan lanjutan 72 jam setelah tiba | Juklak 3/2022 hal. 8, 16 |
| Kartu `.ex-std` | R | Kartu laporan standar: pil kategori, judul kalimat temuan dengan angka `.hl`, tabel penuh, tanpa kaki sumber | AGENTS.md §3.5, `public/inti/kartu.css` |
| `kejadian_ref` | R | Rujukan kejadian (nomor SK status pertama atau id episode) di catatan meja `rehab` tanpa kaji cepat induk | DT §3.3, §5.8 |
| Keyakinan (`pola_tetap`, `pola_longgar`) | R | Mutu pengurai usulan MB-7: deterministik (Laphar) atau regex berita | DT §4.7 |
| KIB | D | Kode Identitas Bencana 16 digit: provinsi 2, kab 2, jenis 3, tanggal 8, indeks 1. Di repo selalu "KIB usulan" | Juknis 7/2023 hal. 7-8; Perban 1/2023 Pasal 8 huruf c |
| Klaster Logistik | U | Koordinasi logistik per provinsi ber-SK; data dimutakhirkan tiap 3 bulan | Juklak 16/2025 |
| `KODE_UNIT` | R | 22 kode unit yang sah di jalur `/bnpb/unit/:kode` | DT §4.9 |
| Konflik status | R | Dokumen yang JDIH tulis BERLAKU padahal dicabut atau diganti dokumen BERLAKU lain menurut teksnya; kunci `konflik` di katalog | DT §3.1, §4.1 |
| LAKIP | D | Laporan Akuntabilitas Kinerja Instansi Pemerintah BNPB; ringkasan di `data/kajian-bnpb/pustaka/5-lakip.md` | DT §5.11, §5.13 |
| Laphar | D | Laporan Harian Dit. Koordalops (PDF di WA, jenis `laphar_pdf`); arsip agregat `public/data/laphar_riwayat.json` | `src/wa_jenis.js`; DT §5.6 |
| LHP | D | Laporan Hasil Pemeriksaan; tindak lanjut paling lambat 60 hari sejak diterima | Pedoman 1/2025 |
| LK | D | Laporan Keuangan BNPB; diuji konsistensinya oleh KEU-1 | DT §5.13 |
| Logpal | U | Logistik dan peralatan | Perban 4/2018 |
| MB-1 sampai MB-8 | R | Delapan mesin bersama: status peraturan, Jam Aturan, pemanen JDIH daerah, skor prioritas, neraca kebutuhan, rapor dari data, penerima dokumen, panen sumber resmi | KA §4, DT §4 |
| Meja Kerja | R | Layar dan tabel `meja_catatan` untuk tujuh meja (kaji cepat, logistik, DSP, renkon, Destana, rehab, gudang) | `src/meja.js`, `migrations/0026_meja.sql` |
| Miniflare | R | Peniru Worker dan D1 lokal untuk uji rute dan skema | RU §1, `tests/warga/_bnpb.mjs` |
| Neraca kebutuhan | R | MB-5: kebutuhan dari standar lawan ketersediaan; ketersediaan kosong = `belum_dilaporkan`, tidak pernah 0 | DT §4.5 |
| NSPK | D | Norma, Standar, Prosedur, dan Kriteria; dipetakan SPB-1 per fase dan jenis bencana | DT §6.4 |
| Open Buildings | S | Jejak bangunan global; jumlah bangunan per kec di R2 `bangunan/kec.json` untuk uji masuk akal RRP-1 | DT §6.21 |
| OSM | S | OpenStreetMap (ODbL); fasilitas di `public/data/osm_nasional/<prov>.json`; selalu "batas bawah" | DT §8 |
| OTK | D | Organisasi dan Tata Kerja BNPB | Perban 6/2025 jo. Perban 11/2025 |
| `P_UNIT_BACA`, `P_UNIT_TULIS`, `P_WIL_TULIS` | R | Daftar peran yang boleh membaca, menulis, dan menulis pengungsian (ditambah akun instansi BPBD) di rute Ruang Unit | DT §1.4 |
| PDN, UMK | I | Produk Dalam Negeri dan Usaha Mikro dan Kecil; porsi pengadaan dari medan `isPDN`, `isUMK` SIRUP | DT §6.26 |
| PDP | U | Pelindungan Data Pribadi; alasan larangan memanen nama, kontak, tanggal lahir | KA §3 butir 6, DT §9.2 |
| PDRB | I | Produk Domestik Regional Bruto (BPS); pembanding kerugian PERB-2 | DT §6.1 |
| PenL, PL | U | Penunjukan Langsung dan Pengadaan Langsung; ambang PL menurut Perpres PBJ belum dicek (kolom `asumsi`) | DT §6.26 |
| Perban, Perka | D | Peraturan Badan (sejak 2019) dan Peraturan Kepala BNPB (sebelumnya) | katalog JDIH |
| Peran `unit` | R | Peran staf baru "Ruang Unit" (migrasi 0111); juga peran unggah CSV DIK-1 | KA §8, DT §1.4 |
| POD | I | Probability of Detection = hit / (hit + terlewat); dipakai PD-1 | DT §6.6 |
| PR | R | Faktor persentase dalam rumus stok penyangga Perka 23/2014: 1% (Pasal 12), 4% (Pasal 14), dan PR risiko berlabel asumsi | DT §5.7 |
| Proksi (label) | R | Angka pengganti saat data resmi tidak ada (contoh kapasitas raster untuk IKD) | KA §3 butir 3 |
| R2 | R | Penyimpanan objek Cloudflare (bucket `poskokarhutla-foto`); keluaran Ruang Unit di kunci `unit/` | DT §1.1 |
| R3P | D | Rencana Rehabilitasi dan Rekonstruksi Pascabencana; disusun paling lama 90 hari, dimulai saat tanggap darurat | Perban 5/2017 Pasal 2 ayat (2) dan (3) |
| RAB | D | Rencana Anggaran Biaya; di MT-1 dihitung dari standar biaya | Juklak 2/2026 |
| RB (dua arti) | U | (1) Reformasi Birokrasi, nilai komponen dari KemenPANRB (REN-1); (2) rusak berat, kelas kerusakan rumah bersama RS (rusak sedang) dan RR (rusak ringan) | DT §5.11, §5.8 |
| Renkon | D | Rencana kontinjensi; berlaku 3 tahun, reviu paling sedikit 6 bulan sekali, diuji lewat latihan | Perban 2/2023 Pasal 17, 19, 21 |
| Renstra | D | Rencana Strategis BNPB 2025-2029; Lampiran III memuat target NSPK | DT §6.4 |
| Resmi (label) | R | Angka dari sumber resmi pemiliknya | KA §3 butir 3 |
| RKPD | D | Rencana Kerja Pemerintah Daerah; syarat kesesuaian usulan Dana Bersama | riset/2 MT-1 |
| RPBD | D | Rencana Penanggulangan Bencana Daerah; pedoman baru Perban 3/2026 (ditetapkan 6 Okt 2026, mencabut Perka 4/2008), monev tahunan | Perban 3/2026 Pasal 47, 50 |
| RPD | D | Rencana Penarikan Dana; deviasinya diukur KEU-2 | DT §7.1 |
| RPKB | D | Rencana Penanggulangan Kedaruratan Bencana Daerah; induk renkon, ditetapkan perkada | Perban 9/2025 Pasal 3, 26 |
| RR (dua arti) | U | (1) Rehabilitasi dan Rekonstruksi; (2) rusak ringan | lihat RB |
| Ruang Unit | R | Program sistem web staf `/bnpb/unit` untuk kedeputian, direktorat, pusat, biro, dan inspektorat di luar layanan Dalops | KA judul, §6 |
| RUP | D | Rencana Umum Pengadaan di SIRUP; rencana, bukan realisasi | DT §6.25 |
| SAKTI | S | Sistem Aplikasi Keuangan Tingkat Instansi (Kemenkeu); ekspor bulanan untuk KEU-2, tidak masuk D1 (U9) | DT §7.1 |
| Sekunder (label) | R | Angka dari pihak kedua (berita, JDIH daerah); masuk hitungan hanya sesudah diterima staf | KA §3 butir 3, DT §4.7 |
| Sendai, SDGs 11.b | I | Indikator Kerangka Sendai (A-1, B-1, C-1, E-1, E-2) dan Tujuan Pembangunan Berkelanjutan 11.b; definisi UNDRR | DT §6.3 |
| SIMAK-BMN | S | Sistem akuntansi Barang Milik Negara; sumber SDU-3 | DT §7.1 |
| SIMHPNAS | S | Sistem Informasi Manajemen Hasil Pengawasan Nasional (BPKP) untuk tindak lanjut APIP | Pedoman 1/2025 |
| SIPTL | S | Sistem Informasi Pemantauan Tindak Lanjut BPK | Pedoman 1/2025 |
| SIRUP | S | Sistem Informasi Rencana Umum Pengadaan (LKPP); ditarik lewat `docs/pendanaan/sirup_tarik.py` | DT §8 |
| Sistala-DSP | S | Sistem Informasi Tata Kelola DSP; aplikasi pengajuan DSP; URL belum terverifikasi | riset/3 §3 |
| SK status | D | Surat keputusan penetapan status siaga, tanggap darurat, atau transisi; di repo `public/data/status_darurat.json` | DT §5.8 |
| SNI 8357:2017 | D | Standar nasional desa tangguh bencana; indikator Destana menurut Perban 7/2025 Pasal 13; teksnya belum ada di tangan | riset/2 §5 |
| SPBE | I | Sistem Pemerintahan Berbasis Elektronik; indeks Renstra Pusdatinkom | riset/1 §4 |
| SPJ | D | Surat Pertanggungjawaban; untuk DSP paling lambat 3 bulan setelah status berakhir | Perban 4/2020 Pasal 21 ayat (2) |
| SPM | D | Standar Pelayanan Minimal sub-urusan bencana (gladi, KIE, peralatan) | Juklak 4/2026, 5/2026, 7/2026 |
| SPSE | S | Sistem Pengadaan Secara Elektronik; daftar tender publik BNPB `spse.inaproc.id/bnpb` | DT §8 |
| `stafOK` | R | Fungsi di `src/staf.js` yang meloloskan admin atau sesi staf berperan; dipanggil sebelum menyentuh R2 atau D1 | DT §1.4 |
| Status menurut teks, menurut JDIH | R | Dua status peraturan yang tampil berdampingan; status JDIH tidak ditimpa (U7) | DT §3.1, PRD MB-1 |
| STTP | D | Surat Tanda Tamat Pelatihan, elektronik atau nonelektronik; bahan DIK-2 | Perban 2/2025 Pasal 23 |
| Survey123 | S | Layer formulir di `gis.bnpb.go.id`; layer penilaian awal membuka data pribadi responden, tidak dipanen dan dilaporkan ke Pusdatinkom (U6) | DT §8 |
| TLHP | D | Tindak Lanjut Hasil Pemeriksaan; paling lambat 60 hari; status sesuai, belum sesuai, belum ditindaklanjuti, tidak dapat ditindaklanjuti | Pedoman 1/2025 |
| TPTD | U | Tidak dapat ditindaklanjuti, status rekomendasi pemeriksaan yang tidak dihitung dalam persen TL; IRT-1 hanya menyarankan calonnya | Pedoman 1/2025; DT §6.28 |
| TRC | U | Tim Reaksi Cepat yang menjalankan kaji cepat | Juklak 3/2022 |
| Unit TIK | U | Unit pengelola teknologi informasi BNPB (Pusdatinkom) penerima kode sumber sistem buatan pihak eksternal (U1) | Perban 10/2025 Pasal 24 ayat (4) |
| `unit_ketuk` | R | Tabel D1 keputusan staf (terima, tolak, koreksi) atas usulan baris MB-7; hanya ditambah | DT §2.2, ALUR §3.1 |
| Usulan | R | Baris dari dokumen atau sumber sekunder yang menunggu ketukan staf, di R2 `unit/usulan_<berkas>.json` | DT §4.7 |
| Walidata | U | Unit yang mengelola Satu Data Bencana dan menyiapkan nomor induk kejadian; di BNPB Pusdatinkom | Perban 1/2023 Pasal 7, 8 |
| `wrangler` | R | Perkakas baris perintah Cloudflare (versi `4.42.0`) untuk unggah R2 dan kueri D1 dari Actions | DT §2.3 |
| `x-pb: 1` | R | Kepala wajib pada kiriman lewat sesi staf; ditegakkan `stafSesiSemua` | DT §1.4 |

## 3. Catatan untuk sesi induk

1. Tiga arti IKK (Indikator Kinerja Kegiatan, Indeks Kualitas Kebijakan, Indeks Kemahalan Konstruksi) dan dua arti RB, RR, JP dipakai di dokumen saudara tanpa pembeda. Usul: layar dan dokumen selalu menulis kepanjangan pada sebutan pertama, dan RRP-3 menulis "IKK konstruksi".
2. Kepanjangan "PR" di rumus Perka 23/2014 tidak ditulis di DT §5.7 maupun riset/4; glosarium hanya menjelaskan perannya.
3. ESMS, FEFO, STTP, KIB, IKD, Jitupasna, R3P, BAST, TLHP, RPKB dicocokkan kepanjangannya dengan `data/hukum/seed.sql`. EPSS, SPBE, SIMAK-BMN, SAKTI, SIPTL, SIMHPNAS, BPDLH memakai kepanjangan umum; tidak ada pasal korpus yang mendefinisikannya.
4. Sistala-DSP, SIM Manajemen Risiko (Juklak 17/2025), dan sistem informasi Destana (Perban 7/2025 Pasal 20) disebut di riset tanpa URL terverifikasi.
