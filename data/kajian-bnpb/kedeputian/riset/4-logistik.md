# Riset unit 4: Deputi Bidang Logistik dan Peralatan

Disusun 5 November 2026 untuk pemilik. Dasar OTK: Perban BNPB 6/2025 jo. Perban 11/2025 (teks lengkap di scratchpad). Korpus hukum: `public/data/bnpb/hukum/katalog.json` + `data/raw/hukum/teks/`. Tanda **[fakta]** = ada sumbernya (pasal, URL, berkas repo); **[dugaan]** = simpulan kerja yang belum dicek ke orang di unit itu.

## 0. Ringkasan

- Kedeputian ini punya dua direktorat. **Direktorat Pengelolaan Logistik dan Peralatan** mengurus perencanaan kebutuhan, pemenuhan (pengadaan dan hibah ke BPBD), penyimpanan dan pemeliharaan, distribusi, serta monev. **Direktorat Optimasi Jaringan Logistik dan Peralatan** mengurus kemitraan dan jejaring (Klaster Logistik) serta layanan digital.
- Sistem resminya sudah ada dan cukup lengkap di atas kertas: **INALOGPAL** (https://inalogpal.bnpb.go.id, juga lewat https://logistik.bnpb.go.id) dengan lima modul (Penguatan Kelembagaan, WMS, Klaster Logistik, E-Prologpal, Donasi) ditambah Kalkulator Layanan Kebutuhan Dasar. Celah yang terlihat dari luar: modul WMS (stok gudang BPBD) masih bertuliskan "Halaman ini akan Segera Hadir", capaian e-monev klaster provinsi 2026 paling tinggi 11,87%, dan belum ada alat yang **membandingkan kebutuhan minimal dengan stok** atau **memilih lokasi gudang** berbasis risiko dan rute.
- Rumus resmi untuk stok penyangga sudah tertulis dan bisa langsung dijalankan mesin: **Jumlah Penduduk x Prosentase x Hari** (Perka 23/2014 Pasal 11), dengan 1% (umum) atau 4% (khusus, daerah rawan) dan horizon 72 jam pertama. Repo kita sudah punya semua masukannya untuk 514 kab/kota (`public/data/bnpb/terpapar.json`, `public/data/bnpb/dibi_kab_tahun.json`).
- Usulan teratas: **Neraca Stok Penyangga 514 kab/kota** (Dit Pengelolaan) dan **Optimasi Lokasi Gudang dan Prepositioning berbasis risiko dan waktu tempuh** (Dit Optimasi Jaringan). Keduanya bisa terisi otomatis dari data publik, tanpa form panjang, dan melengkapi INALOGPAL alih-alih menyainginya.

## 1. Susunan dan dasar hukum

### 1.1 OTK (Perban 6/2025 jo. 11/2025)

| Unit | Tugas (kutipan verbatim pendek) | Pasal |
|---|---|---|
| Deputi Bidang Logistik dan Peralatan | "menyelenggarakan perumusan dan pelaksanaan kebijakan di bidang logistik dan peralatan penanggulangan bencana" | Pasal 92 Perban 6/2025; fungsi Pasal 93 (kebijakan teknis, NSPK, pemantauan-evaluasi-analisis pelaporan) |
| Direktorat Pengelolaan Logistik dan Peralatan | "melaksanakan koordinasi penyusunan dan pelaksanaan kebijakan teknis, pemantauan, evaluasi, dan analisis pelaporan di bidang pengelolaan logistik dan peralatan" | Pasal 95 Perban 6/2025 |
| | Fungsi (diubah): "penyiapan koordinasi perencanaan dan pelaksanaan pemenuhan kebutuhan"; "penyiapan koordinasi dan pelaksanaan penyimpanan dan pemeliharaan"; "penyiapan koordinasi dan pelaksanaan distribusi dan pengendalian"; plus NSPK dan monev | Pasal 96 sebagaimana diubah Perban 11/2025 angka 28 (huruf a-f) |
| Direktorat Optimasi Jaringan Logistik dan Peralatan | Tugas (diubah): "koordinasi dalam pengelolaan dan optimasi jaringan logistik dan peralatan melalui kemitraan dan pemanfaatan layanan digital" | Pasal 98 sebagaimana diubah Perban 11/2025 angka 29 |
| | Fungsi (diubah): "penyiapan pelaksanaan kemitraan dan layanan digitalisasi di bidang optimasi jaringan logistik dan peralatan"; "peningkatan jaringan kemitraan di bidang optimasi jaringan logistik dan peralatan"; plus kebijakan teknis, NSPK, monev | Pasal 99 sebagaimana diubah Perban 11/2025 angka 30 (huruf a-f) |

Catatan susunan:
- Kedua direktorat "terdiri atas jabatan fungsional dan jabatan pelaksana" (Pasal 97 dan 100 Perban 6/2025); tidak ada subdirektorat. Tata usaha di Subbagian Tata Usaha Deputi (Pasal 40 ayat (6)).
- Perubahan penting oleh Perban 11/2025: distribusi dan pengendalian **pindah** dari Dit Optimasi Jaringan (Pasal 99 huruf c lama) ke Dit Pengelolaan (Pasal 96 huruf d baru). Dit Optimasi Jaringan sekarang murni kemitraan + layanan digital. **[fakta]**
- Pengawasan internal kedeputian ini oleh Inspektorat II (Pasal 106 Perban 6/2025).
- UPT boleh dibentuk (Pasal 128 Perban 6/2025). Laman INALOGPAL menampilkan "Dashboard Stok Gudang UPT BNPB Sumbar" (https://inalogpal.bnpb.go.id/gudang_bnpb_sumbar). Status hukum UPT itu tidak ada di korpus. **[fakta laman; dasar hukum tidak terverifikasi]**
- Kontak di laman INALOGPAL memakai alamat `direktoratojlp@...`, jadi INALOGPAL dikelola Dit Optimasi Jaringan (OJLP). **[dugaan kuat]**

### 1.2 Juklak, juknis, dan peraturan teknis di korpus (semua BERLAKU kecuali disebut)

| Dokumen | Isi yang dipakai di riset ini |
|---|---|
| Perban 4/2018 Sistem Manajemen Logistik dan Peralatan | Lima tahap: perencanaan, pengadaan, pergudangan, pendistribusian, penghapusan (Pasal 4). Perencanaan menghasilkan "standar minimal kebutuhan" (Pasal 5). Penetapan gudang menimbang "lokasi, kemudahan akses, jenis gudang, kapasitas dan fasilitas penyimpanan" (Pasal 7 ayat (2)). FIFO dan FEFO (Pasal 7 ayat (3) huruf c). Moda dipilih menurut kecepatan, ketersediaan angkutan dan infrastruktur, efisiensi (Pasal 8 ayat (4)) |
| Perka 23/2014 Standarisasi Logistik | Persediaan Logistik Minimal = 72 jam pertama (Pasal 1 angka 15). Rumus JP x PR x H, sandang dan papan dibagi 4 jiwa (Pasal 11). PR = 1% umum (Pasal 12), 4% khusus memakai Peta Indeks Rawan Bencana (Pasal 14). JP = data BPS terakhir |
| Perka 7/2008 Bantuan Pemenuhan Kebutuhan Dasar | Standar per orang: beras 400 g/hari atau setara 2.100 kkal; air bersih 7 l/hari tiga hari pertama lalu 15 l; air minum 2,5 l/hari; hunian 3 m2; 1 jamban per 20 orang; sabun 250 g/bulan dsb. |
| Perka 17/2009 Standarisasi Peralatan | Daftar standar minimal jenis peralatan per jenis bencana (A-N), jumlah minimal tingkat nasional, dan **jumlah minimal per provinsi** (contoh Aceh: 42 perahu karet, 21 perahu karet bermesin, 5 mobil rescue). Tabel ini bisa dijadikan JSON |
| Juklak 3/2024 Bantuan Pemerintah Logistik dan Peralatan untuk Kesiapsiagaan | Penerima: BPBD, K/L, lembaga nonkomersial, negara lain. Prioritas dinilai dari 7 kriteria: kelembagaan BPBD, **Indeks Risiko Bencana**, karakteristik wilayah, jenis ancaman, program prioritas nasional, anggaran dan SDM penerima, analisis strategis. "buffer stock minimal sepuluh persen" dari pengadaan. Penetapan lewat Keputusan Deputi (jenis, jumlah, lokasi). Hibah BMN lewat Surat Persetujuan Hibah + Naskah Perjanjian + BAST. Penerima wajib mencatat dan membuat **laporan penggunaan barang** ke Deputi. Sanksi: tidak dapat bantuan tahun berikut. Mutu OCR halaman: 19 dari 19 OCR, mutu 0,985 |
| Juklak 16/2025 Penyelenggaraan Klaster Logistik | Koordinator Klaster Logistik Nasional = Deputi Logpal; sekretariat = eselon 2 bertugas kemitraan logistik dan peralatan (yaitu Dit Optimasi Jaringan **[dugaan kuat]**). Bidang: Perencanaan dan Pemenuhan Kebutuhan, Penyimpanan, Pendistribusian. Klaster daerah wajib "pemutakhiran data setiap tiga (3) bulan sekali" (SDM, logistik, peralatan). Laporan triwulan (Format-5), tahunan (Format-6), darurat lewat Posko PDB (Format-7), anggota lapor "melalui sistem informasi logistik yang berlaku" (Format-8) |
| Perban 6/2022 Klaster Logistik | Induk Juklak 16/2025 |
| Juklak 5/2026 SPM Sub-Urusan Bencana: Penyediaan Peralatan Perlindungan dan Kesiapsiagaan | BPBD kab/kota mendata daerah rawan, warga sasaran terpilah (Dukcapil, BPS), dan peralatan milik OPD (PU, Dinsos, Dinkes, Damkar, PMI, ORARI, dsb.). Kebutuhan dihitung dengan "petunjuk pelaksanaan mengenai standar minimal kebutuhan logistik dan peralatan" (juklak itu **tidak ada di korpus**) |
| Perka 6/2009 Pedoman Pergudangan | "Lokasi Pergudangan diupayakan secara historis aman dari bencana"; FEFO; lampiran spesifikasi gudang pusat/provinsi/kab (mutu OCR 0,939) |
| Perka 3/2014 Operasional Gudang Peralatan | 10 kriteria gudang: lokasi aman, area terbuka, mudah dicapai kendaraan besar, dsb. |
| Perka 18/2010 Distribusi | Prioritas daerah darurat; buffer stock kesiapsiagaan; titik distribusi ditetapkan BNPB |
| Perka 19/2010 Penghapusan; Perka 10/2011 dan 11/2011 Inventarisasi (laporan bulanan, triwulan, semester, tahunan); Perka 25/2014 Pertanggungjawaban; Perka 26/2014 Pemanfaatan; Perka 10/2012 Logistik saat Darurat; Perka 16/2012 Gudang saat Darurat; Perka 5/2015 dan 6/2015 Penyimpanan kendaraan dan peralatan dasar (jemur tenda tiap 3 bulan); Perka 7/2013 Pemeliharaan peralatan (mutu OCR 0,811, 110 dari 116 halaman OCR) | Rujukan pendukung |
| Perban 5/2025 Renstra BNPB 2025-2029 | Analisis SWOT menyebut "Sistem database logistik INALOGPAL" sebagai kekuatan (hal. 73) dan "Regulasi (NSPK) mengenai manajemen logistik belum tersusun dengan sistematis" sebagai kelemahan; arahan "Pengembangan pusat logistik dan jaringan kebencanaan melalui konektivitas antar pulau" (D5/Pusdalops, hal. 68); strategi TOWS: kapasitas, kemitraan, inovasi teknologi logpal (hal. 77) |

Tidak dipakai karena TIDAK BERLAKU: Perka 13/2008 (Manajemen Logpal, dicabut Perban 4/2018).
Ada di katalog tapi teksnya tidak ada di `data/raw/hukum/teks/`: Perka 20/2014 (monev manajemen logistik), Juknis 2/2023 (pembentukan klaster logistik daerah).

## 2. Kerja nyata sehari-hari

| Siklus | Keluaran | Pengguna | Unit | Sumber |
|---|---|---|---|---|
| Tahunan | Rekap permohonan BPBD lewat E-Prologpal, analisis kebutuhan vs ketersediaan, rapat koordinasi, skala prioritas, Keputusan Deputi penerima hibah (jenis, jumlah, lokasi) | BPBD prov/kab, K/L | Pengelolaan | Juklak 3/2024 **[fakta]**; berita BPBD Mukomuko dan Rejang Lebong mengajukan lewat e-proposal, diverifikasi Dit Pengelolaan (antaranews Bengkulu) **[fakta]** |
| Tahunan | Pengadaan logistik (matras, selimut, makanan siap saji, sandang, family kit) dan peralatan (tenda, perahu, genset, mobil), 10% dijadikan buffer stock | Gudang BNPB, BPBD | Pengelolaan | Juklak 3/2024 **[fakta]** |
| Per penyaluran | Surat Persetujuan Hibah, Naskah Perjanjian Hibah BMN, BAST ditandatangani Kalak BPBD, pencatatan bukti serah terima | BPBD | Pengelolaan + Sestama (KPB) | Juklak 3/2024 lampiran I-III **[fakta]** |
| Harian/mingguan | Mutasi stok gudang BNPB dan UPT (masuk, keluar, saldo, berat) | internal | Pengelolaan | Dasbor UPT Sumbar: 62 jenis barang, 41.910 unit stok, 138.481 kg (Api publik, disinkron 5 Nov 2026 18.04 WIB) **[fakta]** |
| Saat darurat | Kaji cepat logistik, penentuan pintu masuk bantuan, pengiriman ke titik distribusi, laporan via Posko PDB; target sampai dalam 2x24 jam | Posko PDB, BPBD terdampak | Pengelolaan (distribusi) + Klaster | Juklak 16/2025, Perka 18/2010 **[fakta]**; target 2x24 jam dari pernyataan BNPB di voi.id **[fakta berita]** |
| Triwulan | Laporan kegiatan Klaster Logistik Nasional dan daerah (Format-5), pemutakhiran data sumber daya anggota tiap 3 bulan | Deputi Penanganan Darurat (koordinator antarklaster) | Optimasi Jaringan | Juklak 16/2025 **[fakta]** |
| Tahunan | Rencana kerja klaster (Format-2), lembar komitmen anggota (Format-3), pelatihan dan simulasi (TTX/CPX/FTX) minimal 1 kali | anggota klaster: K/L, TNI, Polri, lembaga usaha, ormas | Optimasi Jaringan | Juklak 16/2025 **[fakta]** |
| Berkala | Pemantauan laporan penggunaan barang hibah, pemeliharaan, penghapusan | BPBD | Pengelolaan | Juklak 3/2024, Perka 19/2010 **[fakta]**; seberapa rutin ditagih **[dugaan: lemah]** |
| Tahunan | Penyusunan NSPK (juklak/juknis) logistik dan peralatan; pembinaan SPM peralatan ke kab/kota | BPBD kab/kota | kedua direktorat | Pasal 96 huruf e, 99 huruf c; Juklak 5/2026 **[fakta]** |

## 3. Sistem resmi yang sudah ada

| Sistem | URL | Fungsi | Celah yang terlihat dari luar |
|---|---|---|---|
| INALOGPAL | https://inalogpal.bnpb.go.id (https://logistik.bnpb.go.id dialihkan ke sini) | Portal lima modul: Penguatan Kelembagaan (bantuan BNPB ke daerah), WMS (gudang BPBD), Klaster Logistik (sumber daya anggota klaster: pemda, lembaga usaha, BUMN, BUMD, NGO, media, masyarakat), E-Prologpal, Donasi. Menu tambahan: Gudang BNPB, Gudang UPT BNPB Sumbar, Infografik, FAQ | **WMS: "Halaman ini akan Segera Hadir"** (https://inalogpal.bnpb.go.id/wms, diperiksa 5 Nov 2026). Jadi stok gudang BPBD belum terlihat secara nasional |
| Dashboard Klaster Logistik | https://inalogpal.bnpb.go.id/dashboard_klaster | Peta capaian e-monev klaster per provinsi (pra, darurat, pasca), profil instansi anggota per bidang | Api publik `Api/get_progress`: 28 wilayah, capaian 2026 tertinggi 11,87% (Aceh), beberapa 0% (Banten, DIY, Jambi). `Api/get_count_cluster_all`: 322 anggota tingkat provinsi, 77 tingkat kab. `Api/get_count_cluster_sk_all`: 16 provinsi dan 12 kab yang tercatat ber-SK. Data darurat (Format-7) tidak tampak tersambung ke kejadian |
| E-Prologpal | http://eprologpal.bnpb.go.id | Proposal digital hibah logpal dari BPBD ke Deputi; akun disetujui BNPB; manual BPBD di `/documents/Manual Guide BPBD - Tata Cara.pdf` | **Tidak bisa diakses** saat riset (HTTP 522 dan waktu habis). Penilaian prioritas tujuh kriteria Juklak 3/2024 tidak terlihat terotomasi **[dugaan]** |
| Kalkulator Layanan Kebutuhan Dasar PB | https://inalogpal.bnpb.go.id/sadd/ | Pilih provinsi sampai desa, jenis bencana, isi jumlah penduduk terdampak, keluar profil kebutuhan terpilah dari demografi SIAK Dukcapil 2024, ekspor Excel | Butuh jumlah terdampak diisi manual; tidak memperkirakan terdampak dari bahaya; tidak dibandingkan dengan stok |
| Dashboard stok Gudang UPT BNPB Sumbar | https://inalogpal.bnpb.go.id/gudang_bnpb_sumbar (`Api/gudang_sumbar`) | KPI masuk, keluar, saldo, berat per barang | Hanya satu gudang yang terbuka begini; tidak ada kedaluwarsa per batch di Api |

Api INALOGPAL yang kita temukan menjawab tanpa login (JSON): `get_progress`, `get_count_cluster_all`, `get_count_cluster_sk_all`, `gudang_sumbar`, `get_kabupaten`, `get_instansi_survey`. Syarat pakainya tidak tertulis. Usulan di bawah memakainya **hanya untuk baca, sekali sehari, dengan atribusi**, dan menunggu izin pemilik (lihat pertanyaan Q1).

Yang sudah ada di repo kita (jangan dibangun ulang):

| Berkas | Isi | Kaitannya |
|---|---|---|
| `migrations/0026_meja.sql`, `src/meja.js`, `src/meja_spek.js`, `public/bnpb/meja.*` | Meja `logistik` (diminta, disetujui, dikirim, diterima; selisih kirim-terima) dan `gudang` (saldo per gudang-barang, ambang minimum, status cukup/menipis) untuk petugas BPBD berkode | Alur permintaan-kirim BPBD. Produksi: `meja_catatan` 0 baris |
| `migrations/0031_inventaris.sql`, `src/inventaris.js`, `public/instansi_alat.js` | Tabel `gudang` (jenis gudang/posko/markas/pos_daops/kendaraan_siaga, lat/lon, PIC), `alat` (kategori **karhutla**: pompa, selang, nozzle, mobil tangki, dsb.; kondisi; status siap/dikerahkan/servis), `alat_jejak` (append-only) | Inventaris peralatan per akun instansi. Kategori belum mencakup daftar Perka 17/2009 untuk banjir, gempa, dsb. |
| `migrations/0034_korban_p3k.sql` | P3K dan medis per gudang dengan kedaluwarsa dan ambang | Pola FEFO sudah ada |
| `scripts/bnpb/kebutuhan.py`, `public/bnpb/kebutuhan.*` | Perkiraan kebutuhan musim **karhutla** (jam heli, regu-hari, masker, rupiah) per provinsi 30/60/90 hari | Bukan logistik kebutuhan dasar pengungsi |
| `scripts/bnpb/perencanaan.py`, `public/data/bnpb/stok_prapemusim.json`, `public/bnpb/perencanaan.js` | Frekuensi kejadian yang membutuhkan kategori barang (makanan, tenda/terpal, pakaian, dst.) per provinsi per bulan dari logbook Pusdalops; bulan puncak | Kapan stok harus siap; bukan berapa |
| `public/data/bnpb/terpapar.json` | Per kab/kota: penduduk (`n`), balita (`b`), lansia (`l`), dan jiwa terpapar bahaya sedang+ dan tinggi untuk banjir, longsor, karhutla, kekeringan, gempa (Dukcapil x InaRISK) | Masukan JP dan PR |
| `public/data/bnpb/dibi_kab_tahun.json` | DIBI 2015-2025 per kab x tahun x jenis: kejadian, terdampak, mengungsi, rumah rusak berat | Uji balik asumsi 1%/4% |
| `public/data/logistik.json` (`scripts/umum/logistik.py`) | Indeks akses logistik per kecamatan dari Overture (jarak ke SPBU, gudang, pasar) | Kandidat lokasi dan kapasitas pasar lokal |
| `scripts/scrape/akses.py`, `data/graf_jalan.json.gz` | Graf jalan + sungai OSM berbobot laju per kelas, Dijkstra, batas 18 jam. **Hanya 9 provinsi prioritas karhutla** (`PRIORITAS` di `scripts/data/wilayah.py`) | Mesin waktu tempuh yang tinggal diperluas |
| `public/prediksi/data/jalan.json` | Ruas tunggal per kab (jembatan atau ruas yang bila putus mengisolasi bagian jaringan) | Penalti rute rapuh |
| `public/data/osm_nasional/<prov>.json` | Fasilitas OSM nasional per provinsi (RS, damkar, pemerintahan, jembatan, dst.) | Kandidat titik |
| `public/pipa/logistik.js` | SIPPA: beli ulang suku cadang pipa, servis pompa | Di luar lingkup kedeputian ini |

## 4. Usulan per unit

Prinsip yang dipakai untuk semua usulan: dihitung di pipeline Python stdlib menjadi JSON statis di `public/data/bnpb/` (nol baca D1 untuk pengunjung), D1 hanya untuk keputusan manusia yang sedikit, dan masukan diambil dari data publik atau dari INALOGPAL, bukan dari form baru.

### 4.A Direktorat Pengelolaan Logistik dan Peralatan

#### P1. Neraca Stok Penyangga 514 kab/kota (dampak terbesar)

- **Masalah**: Perka 23/2014 mewajibkan tiap BPBD memenuhi persediaan logistik minimal 72 jam dengan rumus JP x PR x H, tetapi tidak ada tempat yang menghitungnya untuk semua kab/kota dan menaruhnya di samping stok. Kalkulator SADD di INALOGPAL baru menghitung setelah jumlah terdampak diisi tangan, dan WMS belum jalan. Bukti: WMS "Segera Hadir"; Renstra hal. 73 menulis NSPK manajemen logistik "belum tersusun dengan sistematis".
- **Pengguna dan keputusan**: Dit Pengelolaan (alokasi buffer stock 10% dan prioritas hibah tahunan), BPBD (berapa yang harus disiapkan sendiri lewat APBD sesuai SPM Juklak 5/2026), Kalak BPBD saat rakor.
- **Masukan**:
  - JP: `terpapar.json` kunci `n` (Dukcapil, 514 kab). Pembanding BPS bila Pasal 12 dibaca harfiah (`scripts/bnpb/bps.py` sudah ada).
  - PR: 1% (umum) dan 4% (khusus) sesuai Pasal 12 dan 14; versi berbasis risiko memakai porsi penduduk terpapar bahaya tinggi dari `terpapar.json` kolom `h`.
  - H: 3 hari (72 jam). Komposisi paket dari Perka 7/2008 (beras 400 g, air minum 2,5 l, air bersih 7 l, dst.) dan Perka 23/2014 Pasal 9 (paket pangan, sandang keluarga 4 jiwa, papan).
  - Kelompok rentan: `b` (balita) dan `l` (lansia) untuk paket tambahan gizi dan sandang balita.
  - Stok: (1) `Api/gudang_sumbar` dan Api WMS bila nanti terbuka; (2) `meja_catatan` meja `gudang` bila BPBD mengisi; (3) bila kosong, baris tampil "stok belum dilaporkan", bukan nol.
  - Uji balik: `dibi_kab_tahun.json` kolom `mengungsi`.
  - Frekuensi: bulanan (penduduk dan bahaya jarang berubah), stok harian bila Api tersedia.
- **Rumus inti**:
  - `paket_pangan_orang_hari(kab) = JP x PR x H`; `paket_sandang = paket_papan = JP x PR x H / 4` (Pasal 11 dan 13, dibaca harfiah termasuk faktor H untuk sandang dan papan, ditandai "bacaan harfiah Pasal 11").
  - Turunan ke barang: beras kg = paket_pangan x 0,4; air minum liter = paket_pangan x 2,5; matras/tikar = paket_papan; tambahan balita = PR x b x H.
  - `PR_risiko(kab) = clamp(jiwa_terpapar_tinggi_maks_bahaya / n, 1%, 4%)` sebagai skenario ketiga, berlabel asumsi platform.
  - `kesenjangan = max(0, kebutuhan - stok)`; status: cukup (stok ≥ kebutuhan), kurang, belum dilaporkan.
  - Uji balik asumsi (dijalankan saat riset ini atas DIBI 2015-2025 dan penduduk Dukcapil): dari 5.654 kab-tahun, **209 kab-tahun (3,7%) mencatat pengungsi di atas 1% penduduk** dan 85 di atas 4%; persentil 95 rasio pengungsi/penduduk = 0,58%, persentil 99 = 7,1%. 137 kab pernah melewati 1% dalam setidaknya satu tahun. Nilai maksimum 258,5% menunjukkan angka pengungsi DIBI bisa terhitung berulang antarlaporan, jadi uji balik memakai pemangkasan di persentil 99 dan menyebut keterbatasannya. Kesimpulan kerja: 1% cukup untuk tahun biasa di sebagian besar kab, tetapi sekitar seperempat kab pernah mengalami tahun yang melampauinya, dan itulah calon PR 4%.
- **Cara pembuatan**:
  - Pipeline `scripts/bnpb/stok_penyangga.py` (stdlib) → `public/data/bnpb/stok_penyangga.json` (per kab: JP, tiga skenario PR, kebutuhan per barang, stok bila ada, kesenjangan, hasil uji balik DIBI per kab). Self-check `--cek` dengan assert pada satu kab yang dihitung tangan.
  - Pembaca INALOGPAL `scripts/bnpb/inalogpal.py` (baca Api publik, simpan mentah di `data/raw/inalogpal/`, tanpa data pribadi) dijalankan harian dari workflow yang sudah ada (`data.yml`).
  - Layar: tab baru "Stok penyangga" di `public/bnpb/perencanaan.html` (sudah memuat `stok_prapemusim.json` dan kalender), kartu `.ex.ex-std` sesuai AGENTS §3.5: judul temuan seperti "N kab/kota belum punya data stok untuk 72 jam pertama".
  - Tidak ada tabel D1 baru. Bila BPBD mengisi stok, pakai meja `gudang` yang sudah ada.
- **Ukuran keberhasilan**: 514 kab terhitung tanpa isian; pembaruan otomatis tiap bulan; dalam satu musim hujan, porsi kab yang punya angka stok (dari INALOGPAL atau meja) naik dari 0; uji balik PR dipublikasikan dan dipakai sebagai lampiran usulan revisi Perka 23/2014.
- **Ukuran kerja**: S untuk kebutuhan dan uji balik (semua masukan sudah di repo); M bila termasuk pembaca INALOGPAL dan tampilan stok.
- **Risiko**: angka DIBI pengungsi kumulatif (dipangkas, disebut di layar); rumus sandang/papan ambigu (ditanyakan, Q3); Api INALOGPAL tanpa syarat pakai tertulis (Q1); kuota D1 tidak tersentuh.

#### P2. Daftar Pendek Penerima Hibah Logpal berbasis tujuh kriteria Juklak 3/2024

- **Masalah**: Juklak 3/2024 meminta prioritas dinilai dari tujuh kriteria (kelembagaan BPBD, Indeks Risiko Bencana, karakteristik wilayah, jenis ancaman, program prioritas nasional, anggaran dan SDM penerima, analisis strategis), lalu ditetapkan lewat Keputusan Deputi. Sebagian besar kriteria itu sudah ada sebagai data, tetapi penilaiannya dikerjakan di rapat. **[dugaan: tidak ada skor tertulis yang terbuka]**
- **Pengguna dan keputusan**: Dit Pengelolaan saat menyusun Keputusan Deputi; pimpinan saat menjawab pertanyaan "kenapa kab A dapat dan B tidak".
- **Masukan**: risiko kecamatan (`public/banjir/data/risiko_kecamatan.json`, agregat ke kab), riwayat DIBI (`dibi_kab_tahun.json`), frekuensi kejadian logbook (`public/data/bnpb/kab_prioritas.json`), standar peralatan per provinsi Perka 17/2009 (dijadikan `data/kajian-bnpb/logistik/standar_peralatan_2009.json` sekali, tangan + cek), riwayat hibah dari modul Penguatan Kelembagaan INALOGPAL bila Api-nya terbuka, IKD (`public/data/bnpb/ikd.json`) untuk kelembagaan, kesenjangan stok dari P1.
- **Rumus**: skor = jumlah berbobot persentil tiap kriteria terukur (risiko, kejadian 5 tahun, kesenjangan stok P1, kesenjangan peralatan vs Perka 17/2009, kelembagaan IKD, sudah/belum menerima 3 tahun terakhir). Kriteria "program prioritas nasional" dan "analisis strategis" tidak diskor mesin; tampil sebagai kolom kosong untuk diisi rapat. Bobot bawaan sama rata, dapat diubah di satu tempat dan dicatat. Keluaran: daftar urut dengan alasan per kriteria, bukan keputusan.
- **Cara pembuatan**: `scripts/bnpb/hibah_prioritas.py` → `public/data/bnpb/hibah_prioritas.json`; layar di halaman yang sama dengan P1 (tab "Prioritas hibah") dengan tabel `.ex-tabel`. Tidak ada D1. Bila kelak dipakai sungguhan, catatan "dipilih rapat" disimpan di meja `logistik` yang sudah ada.
- **Ukuran keberhasilan**: tiap baris Keputusan Deputi tahun berikutnya bisa ditunjuk alasannya di daftar ini; selisih urutan mesin dan keputusan akhir dicatat dan dibahas.
- **Ukuran kerja**: M. Ketergantungan: P1; data hibah historis (Q2).
- **Risiko**: dibaca sebagai penentu, bukan alat bantu (label wajib "daftar pendek, keputusan tetap di rapat"); Perka 17/2009 sudah tua dan belum diganti juklak standar minimal yang baru (tidak ada di korpus).

#### P3. Pengingat kewajiban pasca-hibah dan kedaluwarsa (FEFO) lewat WA

- **Masalah**: penerima hibah wajib mencatat dan membuat laporan penggunaan barang (Juklak 3/2024), dan logistik habis pakai harus keluar FEFO (Perban 4/2018 Pasal 7). Tidak ada tanda bahwa tagihan laporan dan peringatan kedaluwarsa berjalan otomatis. **[dugaan]**
- **Pengguna**: Dit Pengelolaan (daftar penerima yang belum lapor), Kalak BPBD (pengingat).
- **Masukan**: daftar BAST per tahun (dari Penguatan Kelembagaan INALOGPAL atau lampiran Keputusan Deputi yang diunggah sebagai PDF/Excel ke `/bnpb/dokumen` yang sudah ada), tanggal kedaluwarsa per batch dari stok (`0034` sudah punya kolom kedaluwarsa untuk P3K).
- **Aturan**: laporan penggunaan jatuh tempo 12 bulan setelah BAST (bawaan, Q4); peringatan 90/30 hari sebelum kedaluwarsa; status hijau/kuning/merah.
- **Cara pembuatan**: tabel D1 kecil `hibah_bast (id, tahun, kab, barang, jumlah, tgl_bast, tgl_lapor, sumber)`; rute `GET /api/bnpb/hibah` (staf) dan `POST /api/bnpb/hibah/lapor`; pengiriman pengingat lewat bot WA yang sudah ada (`scripts/wa/**`). Impor awal dari Excel lampiran Keputusan Deputi lewat skrip, bukan form.
- **Ukuran keberhasilan**: porsi penerima yang mengirim laporan penggunaan dalam 12 bulan; jumlah barang yang kedaluwarsa di gudang turun.
- **Ukuran kerja**: M. Ketergantungan: akses ke daftar BAST (Q2).
- **Risiko**: nomor WA Kalak adalah data pribadi (PDP): simpan hanya nomor kantor/PIC yang diberi persetujuan; D1 baca kecil (ratusan baris per tahun).

### 4.B Direktorat Optimasi Jaringan Logistik dan Peralatan

#### O1. Optimasi Lokasi Gudang dan Prepositioning berbasis risiko dan waktu tempuh (dampak terbesar)

- **Masalah**: Renstra 2025-2029 mengarahkan "Pengembangan pusat logistik dan jaringan kebencanaan melalui konektivitas antar pulau" (hal. 68). BNPB berencana membangun gudang atau balai besar logistik di tujuh daerah (antaranews Ambon) dan Presiden meminta tiap daerah punya gudang logistik (investortrust). Perban 4/2018 Pasal 7 ayat (2) menyebut lokasi dan kemudahan akses sebagai syarat penetapan gudang, Perka 6/2009 meminta lokasi yang historis aman. Tidak ada alat yang menghitung **di mana** gudang regional sebaiknya berdiri dan **berapa jam** tiap kab dari gudang terdekat.
- **Pengguna dan keputusan**: Deputi Logpal dan Dit Optimasi Jaringan (lokasi gudang regional dan UPT, pembagian stok penyangga antargudang), Klaster Logistik (gudang mitra mana yang diaktifkan), Pusdalops (saat darurat: dari gudang mana kirim).
- **Masukan**:
  - Permintaan per kab: pengungsi tahunan harapan = rata-rata terpangkas DIBI `mengungsi` 2015-2025 (`dibi_kab_tahun.json`), dicampur kebutuhan P1 (bobot di Q5), dikalikan paket per orang-hari.
  - Kandidat lokasi: gudang yang sudah ada (gudang BNPB dan UPT dari INALOGPAL; `gudang` D1 bila terisi), ibu kota provinsi, bandara dan pelabuhan (OSM `aeroway=aerodrome`, `harbour`/`ferry_terminal`, ditambahkan ke `scripts/scrape/tarik_osm.py fasilitas`), gudang/logistik komersial dari `public/data/logistik.json` (kelas `gudang`).
  - Waktu tempuh: graf jalan OSM dari `scripts/scrape/akses.py` (laju per kelas jalan, sungai 15 km/jam). Graf sekarang hanya 9 provinsi; perluas ke 38 provinsi dengan `tarik_osm.py jalan <kode>` (sudah per provinsi). Antarpulau: ruas `route=ferry` OSM dengan laju 15 km/jam + tunggu 12 jam (asumsi), udara sebagai cadangan (waktu terbang + 6 jam bongkar, asumsi).
  - Kerapuhan: ruas tunggal per kab (`public/prediksi/data/jalan.json`) dan bahaya di lokasi kandidat (`risiko_kecamatan.json`, KRB gunung api, banjir tinggi InaRISK).
  - Frekuensi: perhitungan ulang tiap triwulan (selaras pemutakhiran klaster 3 bulan), atau saat gudang baru ditambahkan.
- **Algoritma inti**:
  1. Matriks waktu `t[i][j]` (jam) dari tiap kandidat j ke ibu kota kab i: Dijkstra multi-sumber dari tiap kandidat di graf nasional yang dipadatkan (pola `akses.py`), dibatasi 72 jam.
  2. Biaya rapuh: `t'[i][j] = t[i][j] x (1 + 0,5 x porsi_rute_lewat_ruas_tunggal)`; kandidat dengan bahaya tinggi di lokasinya dibuang (aturan Perka 6/2009).
  3. Model **p-median berkapasitas + cakupan maksimal**: pilih p lokasi (p diatur, bawaan 7 sesuai rencana BNPB, lalu 10, 14, 20 untuk kurva) yang meminimalkan `Σ_i w_i x min_j t'[i][j]` dengan syarat porsi permintaan yang terjangkau ≤ 48 jam (target 2x24 jam) dimaksimalkan. Penyelesaian: greedy tambah lalu tukar (Teitz-Bart), stdlib, deterministik, dicatat skor tiap iterasi. Gudang yang sudah ada dipaksa terpilih (pilihan "ada + tambahan").
  4. Ukuran stok per gudang terpilih: jumlah kebutuhan P1 kab yang dilayaninya x faktor serentak (porsi kab yang mengalami kejadian besar pada bulan yang sama, dari DIBI/logbook per bulan, `stok_prapemusim.json`).
  5. Uji balik: putar ulang kejadian besar DIBI 2015-2025; untuk tiap kejadian hitung waktu tempuh dari gudang terdekat dalam konfigurasi sekarang vs konfigurasi usulan; laporkan median dan porsi ≤ 48 jam. Ini pembanding, bukan klaim waktu nyata (tanpa macet, tanpa jalan putus kejadian).
- **Cara pembuatan**:
  - `scripts/scrape/tarik_osm.py` diperluas ke 38 provinsi (jalan + bandara/pelabuhan/ferry); `scripts/scrape/akses.py graf` dijalankan untuk graf nasional ke `data/graf_jalan_nasional.json.gz` (di luar `public/`, besar).
  - `scripts/bnpb/lokasi_gudang.py` → `public/data/bnpb/lokasi_gudang.json` (per p: lokasi terpilih, kab terlayani, waktu median, porsi ≤ 48 jam, stok per gudang, hasil uji balik) dan `public/data/bnpb/waktu_gudang_kab.json` (514 baris: gudang terdekat, jam, rute rapuh atau tidak).
  - Layar `public/bnpb/gudang.html` + `gudang.js`: peta kab berwarna jam tempuh dari gudang terdekat, penggeser p, daftar lokasi usulan, kartu temuan. Pakai ulang `public/inti` (peta, format, tabel) dan pola kartu `.ex-std`.
  - Self-check Python dengan graf mainan 6 simpul (hasil p-median diketahui).
  - Tidak ada D1.
- **Ukuran keberhasilan**: porsi pengungsi historis yang terjangkau ≤ 48 jam dari gudang terdekat, konfigurasi sekarang vs usulan; jumlah kab "lebih dari 72 jam lewat darat" yang harus mengandalkan udara; dipakainya peta ini dalam kajian penetapan lokasi balai besar logistik.
- **Ukuran kerja**: L (graf nasional dan antarpulau adalah bagian terberat). Versi awal M: hanya Jawa-Bali-Sumatra lewat darat, sisanya ditandai "butuh moda laut/udara".
- **Ketergantungan**: daftar gudang BNPB, UPT, dan BPBD dengan koordinat (Q6); P1 untuk ukuran stok.
- **Risiko**: OSM kurang lengkap di Papua dan Maluku (ditandai per kab sebagai "graf tipis"); waktu tempuh model, bukan navigasi; lokasi gudang adalah data aset negara, tampilkan hanya yang sudah dipublikasikan BNPB (Q6); ukuran berkas graf nasional (simpan di luar `public/`).

#### O2. Prepositioning musiman dan jelang kejadian

- **Masalah**: juklak klaster meminta "Pemetaan sumberdaya dan pemanfaatan sistem peringatan dini" pada prabencana (Juklak 16/2025 BAB III A.1 huruf e). Repo sudah punya kapan dan di mana kejadian cenderung datang (`kalender_operasi.json`, `stok_prapemusim.json`, `/prediksi` +1..+3 hari per kab), tetapi belum diterjemahkan menjadi "geser berapa barang dari gudang mana ke mana, minggu ini".
- **Pengguna**: Dit Pengelolaan (distribusi dan pengendalian, Pasal 96 huruf d) dan Klaster Logistik daerah.
- **Masukan**: hasil O1 (gudang terdekat per kab), P1 (kebutuhan 72 jam), `public/data/bnpb/kalender_operasi.json` (bulan musim per kab), `stok_prapemusim.json` (bulan puncak per kategori), prediksi harian `/prediksi` (tingkat dampak per kab +1..+3).
- **Aturan**:
  - Musiman (bulanan): untuk tiap gudang, `target_stok(bulan) = Σ kab terlayani kebutuhan_72jam x indikator(bulan ∈ musim kab)`; saran pindah = selisih antargudang, diurutkan menurut jam tempuh terpendek dari gudang surplus.
  - Jelang kejadian (harian): bila `/prediksi` memberi tingkat tinggi untuk kab dengan jam tempuh dari gudang terdekat > 24 jam, keluarkan saran "kirim paket 72 jam untuk N jiwa ke titik X sekarang" (N = PR 1% x JP kab, atau terpapar tinggi bila lebih kecil).
  - Saran, bukan perintah; tiap saran mencatat masukan yang memicunya.
- **Cara pembuatan**: `scripts/bnpb/prepositioning.py` dijalankan di `data.yml` setelah prediksi → `public/data/bnpb/prepositioning.json`; kartu di `public/bnpb/siaga.html` (sudah ada untuk siaga) dan pesan ringkas lewat bot WA ke kelompok staf yang sudah ada. Tidak ada D1.
- **Ukuran keberhasilan**: jumlah saran per musim yang diikuti (dicatat lewat meja `logistik` saat barang dikirim); waktu dari status siaga sampai barang tiba di kab berisiko tinggi.
- **Ukuran kerja**: M. Ketergantungan: O1 dan P1.
- **Risiko**: prediksi /prediksi masih dinilai prospektif (label wajib); saran tanpa stok nyata hanya bermakna relatif.

#### O3. Rapor Klaster Logistik otomatis dan pengingat pemutakhiran triwulan

- **Masalah**: juklak klaster mewajibkan laporan triwulan (Format-5) dan pemutakhiran data tiap 3 bulan. Dasbor resmi menunjukkan capaian e-monev 2026 tertinggi 11,87% dan hanya 16 provinsi plus 12 kab tercatat punya SK klaster (Api INALOGPAL, 5 Nov 2026).
- **Pengguna**: sekretariat Klaster Logistik Nasional (Dit Optimasi Jaringan), koordinator klaster daerah (Kalak BPBD), Deputi Penanganan Darurat sebagai koordinator antarklaster.
- **Masukan**: `Api/get_progress`, `get_count_cluster_all`, `get_count_cluster_sk_all` (harian); kejadian DIBI dan logbook per provinsi (untuk menimbang provinsi mana yang paling butuh klaster aktif); daftar mitra lembaga usaha yang sudah ada di `public/bnpb/mitra.*` (cek isinya sebelum membangun).
- **Aturan**: per provinsi: punya SK atau belum, capaian pra/darurat/pasca, hari sejak pembaruan terakhir, beban kejadian 5 tahun. Status merah bila beban kejadian di sepertiga teratas dan capaian < 25% atau tanpa SK. Draf Format-5 triwulan disusun otomatis dari angka itu (teks templat, bukan AI generatif), diunduh sebagai DOCX/PDF lewat pembuat dokumen yang sudah ada.
- **Cara pembuatan**: `scripts/bnpb/inalogpal.py` (sama dengan P1) → `public/data/bnpb/klaster_logistik.json`; layar tab di `public/bnpb/mitra.html` atau halaman baru `public/bnpb/klaster.html`; pengingat triwulan lewat bot WA ke koordinator yang setuju dikirimi.
- **Ukuran keberhasilan**: jumlah provinsi ber-SK dan capaian e-monev rata-rata naik antar triwulan; Format-5 triwulan terkirim tepat waktu.
- **Ukuran kerja**: S (rapor dan draf) sampai M (pengingat WA).
- **Risiko**: bergantung Api tanpa syarat pakai tertulis (Q1); jangan tampilkan nama dan nomor PIC anggota klaster ke publik (PDP); bila Api berubah, pipeline gagal keras dan memakai berkas terakhir dengan tanggal yang terlihat.

#### O4. Standar peralatan lintas bencana di inventaris /instansi (pelengkap, kecil)

- **Masalah**: inventaris kita (`alat.kategori` di `migrations/0031_inventaris.sql`) hanya mengenal alat pemadaman karhutla, sementara SPM Juklak 5/2026 meminta BPBD mendata alat milik PU, Dinsos, Dinkes, Damkar, PMI dan lainnya untuk semua ancaman, dengan daftar mengacu standar minimal (Perka 17/2009 sampai juklak standar baru terbit).
- **Usulan**: tambah kategori multi-bencana sesuai Perka 17/2009 (perahu karet bermesin, tenda pengungsi, mobil dapur umum, water treatment, genset, dsb.) lewat migrasi baru yang mengganti CHECK kategori, dan tampilkan "lengkap terhadap standar provinsi Perka 17/2009" per provinsi di `public/instansi_alat.js`. Dikerjakan hanya bila pemilik memutuskan /instansi dibuka ke BPBD non-karhutla (Q7); jika tidak, cukup jadikan tabel standar sebagai JSON untuk P2.
- **Ukuran kerja**: S (JSON) atau M (migrasi + layar + uji `tests/warga/inventaris.test.mjs`).
- **Risiko**: menyentuh tabel yang sudah dijaga uji; migrasi wajib lewat `migrasi-idempoten`.

### 4.C Tingkat Deputi

Tidak perlu sistem tersendiri. Keluaran P1, O1, dan O3 cukup diringkas menjadi satu kartu di `/bnpb/kinerja` (yang sudah ada): porsi kab dengan stok 72 jam terhitung, porsi pengungsi historis ≤ 48 jam dari gudang, provinsi ber-SK klaster. Ini juga bahan laporan pemantauan, evaluasi, dan analisis pelaporan Pasal 93 huruf d.

## 5. Urutan kerja yang disarankan

1. P1 versi S (kebutuhan + uji balik DIBI), tanpa stok. Satu sampai dua hari kerja pengerja `ruang-bnpb`.
2. `inalogpal.py` pembaca Api (setelah Q1) → P1 stok + O3 rapor.
3. O1 versi M (Jawa-Bali-Sumatra) → kurva p gudang dan peta jam tempuh.
4. O2, lalu P2, lalu P3 dan O4 sesuai jawaban pemilik.

Pengerja sesuai peta modul: `ruang-bnpb` (scripts/bnpb, public/bnpb), `pipa-data` (perluasan `tarik_osm.py`/`akses.py`), `warga-api` (P3 D1 dan rute), `wa-bot` (pengingat), pemeriksa `validasi-model` (uji balik P1 dan O1) dan `selera-angka` (layar).

## 6. Pertanyaan untuk pemilik

| # | Pertanyaan | Bawaan bila tidak dijawab |
|---|---|---|
| Q1 | Bolehkah kita membaca Api publik INALOGPAL (`Api/get_progress`, `gudang_sumbar`, dsb.) sekali sehari dan menampilkan angkanya dengan atribusi, atau perlu izin tertulis Dit Optimasi Jaringan dulu? | Baca dan simpan di repo hanya untuk staf (tidak di halaman publik) sampai ada izin |
| Q2 | Bisakah gw dapat daftar penerima hibah logpal 3 tahun terakhir (lampiran Keputusan Deputi atau ekspor modul Penguatan Kelembagaan)? | P2 berjalan tanpa kriteria "sudah menerima"; P3 ditunda |
| Q3 | Rumus Perka 23/2014 Pasal 11 untuk sandang dan papan: H ikut dikalikan (bacaan harfiah) atau satu paket per keluarga tanpa hari? | Tampilkan keduanya, bacaan harfiah sebagai utama, dengan catatan |
| Q4 | Batas waktu laporan penggunaan barang hibah oleh BPBD berapa lama setelah BAST? Juklak 3/2024 tidak menyebut angka | 12 bulan |
| Q5 | Untuk O1, permintaan per kab ditimbang dari riwayat pengungsi DIBI, dari kebutuhan rumus 1%/4%, atau campuran? | Campuran 50:50, dengan dua varian ditampilkan |
| Q6 | Daftar dan koordinat gudang BNPB, UPT, dan BPBD: boleh tampil di halaman publik atau hanya staf? Ada sumber resminya selain INALOGPAL? | Hanya staf; sumber awal INALOGPAL + gudang D1 + OSM |
| Q7 | Apakah /instansi dibuka ke BPBD untuk inventaris peralatan semua bencana (O4), atau tetap karhutla? | Tetap karhutla; standar Perka 17/2009 hanya jadi JSON untuk P2 |
| Q8 | Juklak "standar minimal kebutuhan logistik dan peralatan" yang dirujuk Juklak 5/2026 tidak ada di korpus JDIH lokal. Ada salinannya? | Pakai Perka 7/2008, 23/2014, dan 17/2009 sebagai standar, ditandai "standar lama, menunggu juklak terbaru" |

## 7. Sumber yang tidak bisa diakses atau tidak lengkap

- E-Prologpal (http://eprologpal.bnpb.go.id) dan manualnya (`/documents/Manual Guide BPBD - Tata Cara.pdf`): HTTP 522 dan waktu habis saat riset 5 Nov 2026.
- INALOGPAL WMS: halaman "Segera Hadir"; tidak ada data stok BPBD yang terbuka.
- Juklak standar minimal kebutuhan logistik dan peralatan: dirujuk Juklak 5/2026, tidak ada di katalog lokal (233 dokumen). Hasil pencarian web menyebut "BNPB No. 1/2024 standar minimal" tanpa tautan resmi; tidak diverifikasi.
- Perka 20/2014 dan Juknis 2/2023: ada di katalog, teksnya tidak ada di `data/raw/hukum/teks/`.
- Perka 7/2013 (pemeliharaan peralatan): mutu teks 0,811, sebagian besar OCR; tidak dikutip.
- Format-1 sampai Format-8 Juklak 16/2025: lampiran sebagian OCR; isi kolom formulir tidak diperiksa rinci.
- LAKIP dan Renja Kedeputian Logpal: tidak dicari lebih jauh; Renstra Perban 5/2025 dipakai sebagai gantinya.

Sumber web yang dipakai:
- INALOGPAL: https://inalogpal.bnpb.go.id, https://inalogpal.bnpb.go.id/dashboard_klaster, https://inalogpal.bnpb.go.id/sadd/, https://inalogpal.bnpb.go.id/wms, https://inalogpal.bnpb.go.id/gudang_bnpb_sumbar, Api `https://inalogpal.bnpb.go.id/Api/{get_progress,get_count_cluster_all,get_count_cluster_sk_all,gudang_sumbar}`
- E-Prologpal (tidak terjangkau): https://eprologpal.bnpb.go.id/documents/Manual%20Guide%20BPBD%20-%20Tata%20Cara.pdf
- Verifikasi usulan lewat E-Prologpal: https://bengkulu.antaranews.com/berita/353172/bnpb-verifikasi-usulan-penanggulangan-bencana-di-mukomuko dan https://bengkulu.antaranews.com/berita/395033/bpbd-rejang-lebong-usulkan-bantuan-pengadaan-logistik-ke-bnpb
- Rencana gudang tujuh daerah: https://ambon.antaranews.com/berita/109213/bnpb-bangun-gudang-logistik-di-tujuh-daerah-begini-penjelasannya
- Arahan Presiden gudang tiap daerah: https://www.investortrust.id/national/114154/rapat-penanganan-gempa-ntt-prabowo-minta-tiap-daerah-punya-gudang-logistik
- Gudang regional dan buffer stock daerah: https://rri.co.id/en/national/2681326/regional-disaster-logistics-warehouses-seen-as-key-to-faster-community-aid dan https://jatim.antaranews.com/berita/1093565/bnpb-calls-for-well-stocked-disaster-relief-warehouses-nationwide
- Target distribusi 2x24 jam: https://voi.id/en/amp/547301
