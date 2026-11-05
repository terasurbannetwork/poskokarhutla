# Kelompok 3: Deputi Bidang Penanganan Darurat (sesudah Perban 11/2025)

Riset 5 Nov 2026. Sumber hukum: teks Perban BNPB 6/2025 dan 11/2025 di scratchpad, korpus JDIH lokal (`data/raw/hukum/teks/`), ringkasan Renstra dan LAKIP di `data/kajian-bnpb/pustaka/`. Kode repo dibaca langsung. Tanda **[fakta]** = ada sumbernya; **[dugaan]** = simpulan saya, belum dikonfirmasi.

## 0. Temuan yang mengubah lingkup brief

1. **Susunan final bukan yang diduga brief.** Pasal 70 Perban 11/2025 (ditetapkan 30 Desember 2025, berlaku sejak diundangkan) menyatakan Deputi terdiri atas empat direktorat:
   a. Direktorat Koordinasi Pengendalian Operasi Darurat (selanjutnya Dit KPOD);
   b. Direktorat Penanganan Darurat Wilayah I;
   c. Direktorat Penanganan Darurat Wilayah II;
   d. Direktorat Penanganan Darurat Wilayah III.
   Tiga direktorat lama dalam Pasal 70 Perban 6/2025 (Dukungan Sumber Daya Darurat, Dukungan Infrastruktur Darurat, Fasilitasi Penanganan Korban dan Pengungsi) **sudah tidak ada**. Susunan baru ini sudah direncanakan di Renstra BNPB 2025-2029 hal. 119-121 (`3-renstra.md` baris 124). **[fakta]**
2. **Pusdalops sebagai Pusat sudah dihapus dari OTK.** Perban 11/2025 angka 31-35 mengganti judul Paragraf 12 dan Pasal 121-124: yang dulu "Pusat Pengendalian Operasi" sekarang "Pusat Pembinaan Jabatan Fungsional Kebencanaan". Bagan lampiran Perban 11/2025 hanya memuat tiga Pusat: Pusdiklat, Pusat Data, Informasi, dan Komunikasi Kebencanaan, dan Pusat Pembinaan JF Kebencanaan. **[fakta]**
   Akibatnya: fungsi lama Pusdalops (Pasal 122 Perban 6/2025: pengolahan data dan diseminasi informasi darurat, rencana operasi, rekomendasi operasi, koordinasi lintas sektor) tidak lagi punya rumah eksplisit di teks. Rumah paling dekat adalah Dit KPOD. Bukti praktiknya: arsip Laporan Harian yang diurai repo ini mencatat penerbitnya "Pusdalops BNPB (Jan-Feb 2026) dan Dit. Koordalops BNPB (Mar 2026-)" (`public/data/laphar_riwayat.json` kunci `sumber`), dan pengurai `public/laporan_urai.js` menyebut "Laporan Harian Dit. Koordalops BNPB". **[fakta untuk penerbit laporan; dugaan bahwa Dit. Koordalops = Dit KPOD, cocok dengan namanya]**
   Jadi "modul Pusdalops" di repo (`public/bnpb/dalops.*`, `logbook.*`, `dokumen_pusdalops.js`, `perencanaan.*`, `src/pusdalops_umum.js`, peran staf `pusdalops`/`koordalops`) sebenarnya melayani Dit KPOD. Saya tidak mengusulkan ulang isinya; batas kerjanya ditulis di bagian 1 dan tiap direktorat.
3. **Fungsi yang hilang dari teks.** Rincian fungsi lama (pengerahan SDM, logistik dan peralatan, pengelolaan bantuan dan dana kedaruratan, pemulihan prasarana vital, penyelamatan dan evakuasi, penyajian data korban dan pengungsi; Pasal 72, 75, 78 Perban 6/2025) tidak disebut lagi. Teks baru hanya memakai rumusan umum "penyelenggaraan penanganan darurat bencana" per provinsi. **[fakta]** Siapa yang kini memegang pengelolaan DSP tidak tertulis: unit lama "Subdirektorat Pengelolaan Bantuan dan Dana Kedaruratan" masih disebut dalam berita OTT KPK Oktober 2026 (Hukumonline, 16 Okt 2026). **[fakta: nama unit di berita; dugaan: struktur di bawah direktorat belum disesuaikan]**

## 1. Deputi dan batas kerja dengan bekas Pusdalops

**Tugas Deputi** (Pasal 68 Perban 6/2025, tidak diubah): "menyelenggarakan perumusan dan pelaksanaan kebijakan di bidang penanganan keadaan darurat, meliputi penyelenggaraan siaga darurat, tanggap darurat dan transisi darurat ke pemulihan."
Fungsi (Pasal 69): kebijakan teknis, pelaksanaannya, "penyusunan norma, standar, prosedur, dan kriteria di bidang penyelenggaraan penanganan darurat", pemantauan-evaluasi-pelaporan.

**Pembagian provinsi** (Pasal 74, 77, 79A Perban 11/2025) **[fakta]**:

| Direktorat | Provinsi | Jumlah |
| --- | --- | --- |
| Wilayah I | Aceh, Riau, Kepulauan Riau, Jawa Tengah, DI Yogyakarta, Bali, Kalimantan Tengah, Kalimantan Utara, Sulawesi Tenggara, Sulawesi Tengah, Maluku Utara, Papua, Papua Selatan | 13 |
| Wilayah II | Sumatera Utara, Jambi, Sumatera Selatan, Lampung, DK Jakarta, Banten, Jawa Barat, NTB, Kalimantan Timur, Daerah Ibu Kota Nusantara, Sulawesi Utara, Gorontalo, Papua Barat, Papua Tengah | 13 + IKN |
| Wilayah III | Bengkulu, Sumatera Barat, Kepulauan Bangka Belitung, Jawa Timur, Kalimantan Barat, Kalimantan Selatan, Sulawesi Selatan, Sulawesi Barat, NTT, Maluku, Papua Barat Daya, Papua Pegunungan | 12 |

Catatan: pembagiannya acak secara geografis (Aceh dan Papua Selatan satu direktorat; Sumatera Utara dan Sumatera Barat beda direktorat). Sistem apa pun harus memakai tabel ini sebagai data, bukan menebak dari pulau.

**Indikator yang mengikat Deputi** (Renstra 2025-2029, `3-renstra.md` baris 134, 160, 181) **[fakta]**:
- Program 3: "% daerah yang menetapkan status darurat dan menerima intervensi sesuai standar", target 100% tiap tahun. LAKIP 2025 melaporkan capaian 100% (`5-lakip.md` baris 85), tanpa rincian cara hitung yang terbuka.
- Bekas Pusdalops: "% daerah yang mengaktivasi posko pada saat penetapan status", target 15% (2025) naik ke 35% (2029).
- DSP: 30 paket per tahun, Rp250 miliar per tahun 2026-2029 (`3-renstra.md` baris 241).
- SWOT Renstra menyebut kelemahan "integrasi dan interoperabilitas aplikasi BNPB sangat rendah", "data terpilah sulit", "fase tanggap darurat belum terkoordinasi"; peluang: SIMAMPU (Sistem Informasi Manajemen Pusdalops) dan platform tata kelola DSP sedang dibangun (baris 73).

**Batas kerja yang saya pakai** **[dugaan, dirumuskan dari teks pasal]**:
- Dit KPOD = pusat nasional: kebijakan teknis dan NSPK penanganan darurat untuk seluruh Indonesia, pemantauan 24 jam dan Laporan Harian (bekas Pusdalops), evaluasi dan analisis pelaporan lintas wilayah. Pemilik data nasional.
- Dit Wilayah I-III = pelaksana per provinsi: "pelaksanaan komando penyelenggaraan darurat bencana di Provinsi ..." (huruf b Pasal 75, 78, 79B). Dalam Perka 3/2016 (Sistem Komando, BERLAKU) Pasal 5 ayat (1) huruf e ini wujudnya "Pos Pendamping Nasional PDB" di samping Posko PDB kabupaten/kota. Mereka pengguna data nasional untuk provinsi binaannya, dan penyumbang data lapangan.
- Sistem yang kita bangun untuk Dit KPOD memakai ulang modul Pusdalops yang sudah ada; sistem untuk Dit Wilayah adalah saringan per provinsi atas data yang sama ditambah alat pendampingan.

## 2. Aturan kerja yang relevan (korpus JDIH, semua BERLAKU kecuali disebut)

| Dokumen | Isi yang dipakai untuk rancangan |
| --- | --- |
| Perka 3/2016 Sistem Komando Penanganan Darurat | perangkat: Posko PDB, Pos Lapangan, Pos Pendukung, Pos Pendamping (Pasal 4-5); prinsip "pengutamaan peran aktif pemerintah daerah kabupaten/kota" (Pasal 2) |
| Juklak 10/2023 Sistem Komando pada status kab/kota | teks tidak ada di korpus lokal (halaman 0) |
| Juklak 3/2022 Pengkajian Cepat | TRC bergerak paling lambat 1 x 24 jam setelah perintah; laporan awal "paling lambat 1 x 24 jam setelah tiba di lokasi kejadian" berisi rekomendasi penetapan status; laporan lanjutan paling lambat 3 x 24 jam untuk rencana operasi (hal. 8, 16); standar hitung: air 15 liter/orang/hari, 1 jamban/20 orang, 1 kantong sampah untuk 3 keluarga per 3 hari (hal. 25) |
| Juklak 4/2023 Penilaian Awal | masyarakat, relawan, petugas lokal mengirim informasi awal (Format 1 slow onset, Format 2 sudden onset, Format 3 laporan) ke BPBD kab/kota sebagai bahan kaji cepat |
| Juklak 6/2023 Penilaian Perkembangan Penanganan Darurat | teks tidak ada di korpus lokal (halaman 0); judulnya pas untuk monev Dit KPOD |
| Perban 4/2020 Penggunaan DSP | permohonan kab/kota butuh laporan kejadian ke BNPB "paling lambat 3 (tiga) hari sejak terjadinya ancaman atau kejadian Bencana", SK status, surat permohonan (Pasal 4); tim verifikasi ditunjuk Deputi (Pasal 17); laporan perkembangan "paling lambat setiap tanggal 5 (lima) bulan berikutnya" (Pasal 21 ayat 1); pertanggungjawaban "paling lambat 3 (tiga) bulan setelah masa status keadaan darurat bencana berakhir" (Pasal 21 ayat 2) |
| Perban 3/2018 Penanganan Pengungsi | data diprioritaskan menurut nama dan alamat, usia, status, jenis kelamin, kelompok rentan, kebutuhan dasar, barang bantuan (Pasal 12 huruf d); pendataan boleh lewat aplikasi seluler (Pasal 12 huruf a) |
| Juknis 9/2023 Data Pengungsi Terpilah | standar minimal per tempat pengungsian: nama, wilayah, koordinat, jenis, tanggal buka/tutup, koordinator, jumlah KK, jiwa per jenis kelamin x 6 kelompok umur (0-11 bln, 12-59 bln, 5-12, 13-17, 18-59, 60+), kelompok rentan (hal. 17); Pos Lapangan memperbarui "setiap hari" (hal. 10); "Apabila tersedia aplikasi", disajikan dashboard (hal. 14). Aplikasi bersifat pilihan, artinya belum ada aplikasi baku nasional |
| Perka 7/2008 Bantuan Pemenuhan Kebutuhan Dasar | beras 400 gram/orang/hari, 2.100 kkal; hunian 3 m2/orang; air 7 liter tiga hari pertama lalu 15 liter/orang/hari; sabun mandi 250 gram/orang/bulan (hal. 9-12) |
| Perban 3/2022 Pemulihan dengan Segera Prasarana dan Sarana Vital | kaji cepat PDS oleh TRC sejak kejadian walau status belum ditetapkan (Pasal 5); rencana operasi PDS disusun Posko PDB (Pasal 6) |
| Pedoman Penetapan Status Keadaan Darurat 2016 (non-JDIH, diringkas di `data/kajian-bnpb/pustaka/6-pedoman-status-darurat.md`) | masa status kab/kota 7-14 hari, provinsi 14 hari-1 bulan, nasional 1-3 bulan |

## 3. Sistem resmi yang sudah ada (hanya yang ketemu URL-nya)

| Sistem | URL | Fungsi | Celah |
| --- | --- | --- | --- |
| Sistala-DSP (Sistem Informasi Tata Kelola DSP) | manual pemohon: https://bit.ly/Pemohon_Sistala-DSP; disebut dalam SoW INVEST DM 2.0, 22 Jan 2025 (https://prosperglobal.or.id/sites/default/files/attachments/SOW%20Pengembangan%20MOOC%20Tata%20Kelola%20DSP_250108_final.pdf) | pengajuan, persetujuan, pelaporan, pengawasan DSP | SoW sendiri menulis masih ada "kesenjangan dalam kapasitas pengelola DSP baik di tingkat nasional maupun daerah". Alamat aplikasinya tidak saya temukan; tidak ada data DSP publik per kejadian |
| eTangguh / e-learning BNPB | https://elearning.bnpb.go.id/ | MOOC tata kelola DSP | pelatihan, bukan operasi |
| Kompilasi status keadaan darurat (CKAN) | data.bnpb.go.id, paket `kompilasi-data-status-keadaan-darurat-bencana-seluruh-indonesia-tahun-YYYY` (dipanen `scripts/umum/status_darurat.py`) | daftar SK status per tahun | data tahun berjalan tertinggal (sk_cakupan_sampai di `saran_status.json` = 2025-12-31); SK 2026 di repo diambil dari folder Drive Pusdalops |
| DIBI | dibi.bnpb.go.id (dipanen `public/data/bnpb/dibi_kab_tahun.json`) | kejadian dan dampak | per kejadian, tidak memuat status, DSP, pendampingan, pengungsi per lokasi |
| SIMAMPU | disebut Renstra hal. 74-78 sebagai "sedang dibangun"; URL tidak ketemu | sistem manajemen Pusdalops | status tidak diketahui |

Tidak saya temukan aplikasi resmi pendataan pengungsi terpilah; Juknis 9/2023 menulis aplikasi "apabila tersedia" dan menyebut CAPI di ponsel petugas (hal. 13). **[fakta: teks juknis; pencarian web tanpa hasil]**

**Bukti masalah dari lapangan** **[fakta]**:
- Data pengungsi pusat dan daerah tidak sinkron: NU Online 27 Mar 2026 (https://www.nu.or.id/daerah/data-pengungsi-banjir-aceh-tak-sinkron-klaim-pemulihan-hampir-100-persen-dipertanyakan-qhVzM): BNPB mencatat 6.187 jiwa masih di tenda di Aceh; Aceh Utara 4.385 (BNPB) lawan 18.908 (BPBD), selisih 14.523; Aceh Timur 113 lawan 2.326; Aceh Tamiang 992 lawan 1.396.
- DSP: OTT KPK Oktober 2026 atas pengadaan berbasis DSP lewat penunjukan langsung dengan alasan status tanggap darurat; klaster konflik kepentingan sekitar Rp148 miliar (2024-2026) dan klaster suap pengadaan DSP 2026 (Hukumonline 16 Okt 2026, https://www.hukumonline.com/berita/a/dua-klaster-dugaan-korupsi-di-bnpb-lt6ad25c9140f23/). BNPB mengajukan tambahan DSP Rp5,67 triliun pada September 2026 (Katadata, https://katadata.co.id/berita/nasional/6a9ffcfd1ec62/bnpb-ajukan-tambahan-dana-siap-pakai-rp-5-67-triliun-untuk-tangani-bencana).
- Masa status: dari 2.277 SK kab/kota 2018-2026 di `public/data/status_darurat.json`, 1.369 berlaku lebih lama dari batas 14 hari (`ringkas.kab_lewat_batas`). Sebagian karena SK perpanjangan tercatat sebagai satu baris, jadi angka ini batas atas, bukan bukti pelanggaran.

## 4. Yang sudah ada di repo dan menyentuh kelompok ini

| Berkas | Isi | Catatan untuk kelompok ini |
| --- | --- | --- |
| `scripts/umum/status_darurat.py` -> `public/data/status_darurat.json` | 2.481 SK 2018-2026, masa berlaku, lewat batas, jeda kejadian ke SK | dasar semua usulan; tampil di `public/semua/darurat.js` |
| `scripts/umum/saran_status.py` -> `public/data/saran_status.json` | saran Siaga/Tanggap per kab dari sinyal model; bukan penetapan | 324 kab bersaran; 245 di antaranya kekeringan berstatus hipotesis |
| `scripts/umum/laphar_arsip.{mjs,py}` -> `public/data/laphar_riwayat.json` | 1.836 episode kejadian 1 Jan-28 Okt 2026 dari Laporan Harian, puncak md, mengungsi_jiwa, rumah rusak, status_penetapan | jalan lokal saja (arsip 1,5 GB di luar repo); medan "Pendampingan BNPB" tidak diambil |
| `public/laporan_urai.js` | pengurai Rekap WA dan Laphar Dit. Koordalops (5 medan: Dampak, Penetapan status, Pendampingan BNPB, Kondisi mutakhir, Detail) | sumber medan pendampingan |
| `src/meja_spek.js` meja `kaji_cepat`, `dsp`, `logistik` | alur status + tanda bahaya | ambang tidak sesuai juklak (lihat A2) |
| `src/korban.js` (0034), `src/rumah_rusak.js` (0024) | korban jiwa dan rumah rusak per rumah | tidak ada pengungsi per tempat pengungsian |
| `src/pemulihan.js` (0096) | huntara, huntap, DTH, jembatan gantung, sumur bor | tidak ada perbaikan darurat prasarana vital |
| `src/wa.js`, `src/wa_jenis.js`, tabel `wa_masuk` (0076) | WA masuk; `laphar_pdf` dan `rekap_koordalops_24` sudah wajib tiba tiap hari | saluran bahan yang sudah mengalir |
| `public/bnpb/kinerja.*` + `scripts/bnpb/iku.py` | IKU BNPB dari LAKIP/Renstra | belum ada IKU Program 3 yang dihitung ulang |

## 5. Direktorat Koordinasi Pengendalian Operasi Darurat

**Tugas** (Pasal 71 Perban 11/2025): "melaksanakan penyusunan dan pelaksanaan kebijakan teknis, pemantauan, evaluasi, dan analisis pelaporan di bidang koordinasi pengendalian operasi darurat."
**Fungsi** (Pasal 72): kebijakan teknis dan pelaksanaannya; "penyiapan penyusunan norma, standar, prosedur dan kriteria di bidang penanganan darurat bencana"; pemantauan, evaluasi, analisis pelaporan.

**Kerja nyata**:
- Laporan Harian Dit. Koordalops (PDF, periode 07.00-07.00 WIB) dan Rekap WA 24 jam dan 12 jam: tiap hari, dibaca pimpinan BNPB dan K/L. **[fakta: `laphar_riwayat.json`, `src/wa_jenis.js`]**
- Rekapitulasi SK status darurat per daerah (bagian I Laphar). **[fakta: `laporan_urai.js`]**
- NSPK penanganan darurat (juklak/juknis seperti 3/2022, 4/2023, 6/2023, 9/2023, 10/2023 diterbitkan di bawah Deputi). **[fakta: korpus; dugaan: kini disusun Dit KPOD]**
- Bahan IKU Program 3 dan LAKIP tahunan. **[dugaan dari Pasal 72 huruf d]**
- Pengguna: Kepala BNPB, Deputi, Dit Wilayah, K/L, BPBD.

**Batas dengan "Pusdalops"**: Dit KPOD adalah penerus fungsinya (lihat 0.2). Modul repo yang sudah melayani pekerjaan harian ini (logbook, dalops, dokumen laphar, perencanaan, sitrep, laporan-bnpb) tidak diusulkan ulang. Usulan di bawah hanya bagian evaluasi, NSPK, dan sambungan datanya.

### A1. Rapor Intervensi Status Darurat (IKU Program 3 dihitung dari data, bukan diisi)

- **Masalah**: IKU "% daerah yang menetapkan status darurat dan menerima intervensi sesuai standar" dilaporkan 100% tanpa cara hitung terbuka. "Sesuai standar" tidak terukur di mana pun. Indikator bekas Pusdalops (aktivasi posko) targetnya hanya 15-35%, jadi angka 100% di indikator pertama sulit diuji.
- **Pengguna dan keputusan**: Direktur KPOD dan Deputi; daerah mana yang berstatus tapi belum disentuh, direktorat wilayah mana yang tertinggal, bahan LAKIP.
- **Masukan** (semua sudah ada, tanpa form):
  - `public/data/status_darurat.json` (SK, mulai, berakhir, kab), harian.
  - `public/data/laphar_riwayat.json` episode + medan baru `pendampingan` (perluasan `scripts/umum/laphar_arsip.py` agar menyimpan teks medan "Pendampingan BNPB" dari `laporan_urai.js`), harian.
  - Meja `dsp` dan `logistik` (`meja_catatan`, D1) bila terisi; kosong = komponen dilewati, bukan nol.
  - `operasi_*` (armada) per kab bila ada.
- **Aturan inti**: untuk tiap SK s (kab k, mulai t0):
  - `terpantau` = ada episode laphar di k dengan |mulai - t0| <= 3 hari.
  - `didampingi` = teks pendampingan episode itu tidak kosong dan tidak berbunyi "belum" (daftar kata tolak tertulis di skrip); kelas pendampingan dari kata kunci: `dsp` (/dana siap pakai|DSP|Rp/), `logistik` (/logistik|sembako|tenda|selimut/), `personel` (/tim|TRC|personel|pendampingan/), `udara` (/OMC|heli|water bombing/).
  - `tepat_waktu` = intervensi pertama <= 3 hari sesudah t0 (selaras tenggat 3 hari laporan DSP Perban 4/2020 Pasal 4).
  - IKU = jumlah SK `didampingi` / jumlah SK, per bulan, per direktorat wilayah, per jenis bencana; disajikan bersama angka resmi LAKIP sebagai pembanding, bukan pengganti.
- **Pembuatan**: `scripts/bnpb/rapor_darurat.py` (stdlib, self-check `uji`) -> `public/data/bnpb/rapor_darurat.json` (agregat saja, tanpa nama). Tab baru di `public/bnpb/kinerja.*` memakai kartu `.ex.ex-std` (`public/inti/kartu.css`). Dijalankan di workflow harian yang sudah memanggil status_darurat. Tidak ada tabel D1 baru, tidak ada rute.
- **Ukuran berhasil**: rapor terbit harian; persentase SK yang punya pasangan episode laphar >= 80% (kalau di bawahnya, masalahnya penjodohan nama wilayah, diperbaiki dulu); Direktur KPOD memakai angka ini di satu rapat bulanan.
- **Ukuran kerja**: M. Ketergantungan: laphar_arsip harus jalan otomatis (A3).
- **Risiko**: kata kunci pendampingan meleset (uji pada 50 entri berlabel tangan sebelum tampil); SK 2026 hanya dari Drive Pusdalops lokal sehingga CI tidak punya; angka bisa memalukan bila jauh dari 100%, maka tampil internal dulu.

### A2. Jam Aturan: satu berkas tenggat dari juklak, dipakai semua meja

- **Masalah**: ambang di `src/meja_spek.js` tidak sesuai aturan. `dsp_spj_hari: 30` (Perban 4/2020 Pasal 21: laporan perkembangan tiap tanggal 5 bulan berikutnya, SPJ paling lambat 3 bulan setelah status berakhir); `kaji_verifikasi_jam: 72` (Juklak 3/2022: laporan awal 1 x 24 jam setelah tiba, lanjutan 3 x 24 jam). Tanda bahaya yang salah lebih buruk daripada tidak ada.
- **Pengguna**: Dit KPOD (pemilik NSPK), semua meja.
- **Masukan**: pasal di korpus JDIH (`public/data/bnpb/hukum/katalog.json`) yang ditulis tangan sekali ke `src/aturan_darurat.js`: `{kunci, nilai, satuan, acuan: "perban-4-2020 Pasal 21 ayat (2)", kutipan}`.
- **Aturan**: tenggat = fungsi dari peristiwa: `dsp_laporan_perkembangan(cair) = tanggal 5 bulan sesudah cair`, `dsp_spj(berakhir_status) = berakhir + 3 bulan`, `kaji_awal(tiba) = tiba + 24 jam`, `kaji_lanjutan(tiba) = tiba + 72 jam`, `trc_bergerak(perintah) = +24 jam`, `masa_status(skala)` 14/31/92 hari, `pengungsi_mutakhir = 1 hari`.
- **Pembuatan**: berkas baru `src/aturan_darurat.js` diimpor `src/meja_spek.js` (ganti AMBANG yang bertabrakan), `public/inti/status_pedoman.js` (ganti angka 14/31/92 yang kini tertanam), dan A1. Kolom meja `dsp` ditambah `tgl_status_berakhir`. Gerbang `tests/agen/gerbang-aturan-darurat.test.mjs`: tiap kunci punya `acuan` yang ada di katalog JDIH berstatus BERLAKU dan `kutipan` yang ditemukan di teks dokumennya.
- **Ukuran berhasil**: nol angka tenggat tertanam di luar `aturan_darurat.js` (diperiksa gerbang dengan grep).
- **Ukuran kerja**: S. Ketergantungan: tidak ada.
- **Risiko**: juklak berubah; gerbang menolak acuan yang berstatus TIDAK BERLAKU, jadi perubahan katalog JDIH memicu merah.

### A3. Laphar otomatis dari WA

- **Masalah**: `laphar_riwayat.json` hanya diperbarui saat pemilik menjalankan skrip lokal atas arsip 1,5 GB (kunci `cakupan.tanpa_pdf` mencatat 8 hari bolong). Semua usulan kelompok ini bergantung padanya.
- **Masukan**: PDF Laphar sudah tiba lewat WA tiap hari (`wa_jenis.js` kunci `laphar_pdf`, wajib), tersimpan di R2 `wa/...`.
- **Pembuatan**: `scripts/wa/otomatis.mjs` (Mac mini, sudah menjalankan generator lain begitu bahan lengkap) menambah langkah: unduh PDF hari itu, `pdftotext -layout`, `laphar_arsip.mjs` tahap 1 untuk satu hari, simpan `data/raw/laphar/hari/YYYY-MM-DD.json`, lalu `laphar_arsip.py` menulis ulang JSON. Commit lewat jalur yang sudah dipakai pipeline lain. Medan `pendampingan` ditambahkan di tahap 1.
- **Ukuran berhasil**: `cakupan.sampai` tidak pernah tertinggal lebih dari 1 hari selama 30 hari.
- **Ukuran kerja**: S-M. Ketergantungan: Mac mini hidup.
- **Risiko**: PDF memuat nama petugas; yang di-commit tetap agregat seperti sekarang.

## 6. Direktorat Penanganan Darurat Wilayah I, II, III

Ketiganya punya rumusan tugas yang sama, beda provinsi. Contoh Pasal 74 (Wilayah I): "melaksanakan penyusunan kebijakan teknis, pelaksanaan, pemantauan, evaluasi, dan analisis pelaporan penanganan darurat di Provinsi Aceh, ...". Fungsi kuncinya huruf b Pasal 75, 78, 79B: "pelaksanaan komando penyelenggaraan darurat bencana di Provinsi ...". (Catatan teks: Pasal 74 memakai koma "pelaksanaan, pemantauan", Pasal 77 dan 79A tanpa koma "pelaksanaan pemantauan"; mungkin salah ketik, tidak mengubah fungsi huruf b.)

**Kerja nyata**:
- Pendampingan dan "Pos Pendamping Nasional PDB" saat status kab/kota atau provinsi ditetapkan (Perka 3/2016 Pasal 5). **[fakta: aturan]**
- Menerima laporan kejadian dan permohonan DSP dari BPBD provinsinya, menyiapkan verifikasi (tim verifikasi ditunjuk Deputi, Perban 4/2020 Pasal 17). **[dugaan: pengajuan per wilayah jatuh ke direktorat wilayah]**
- Mengerahkan TRC untuk kaji cepat, termasuk kaji cepat pemulihan segera prasarana vital (Perban 3/2022 Pasal 5). **[fakta: aturan; dugaan: unit pelaksana]**
- Memastikan pendataan pengungsi dan pemenuhan kebutuhan dasar di posko (Perban 3/2018, Juknis 9/2023). **[fakta: aturan]**
- Siklus: per kejadian (hari ke 0 sampai status berakhir + 3 bulan SPJ DSP), dengan puncak musim hujan November-Maret dan musim karhutla Juli-Oktober. Beban 2026 berat: Sumatera (Aceh di Wilayah I, Sumatera Utara di Wilayah II, Sumatera Barat di Wilayah III) masih transisi dari banjir akhir 2025.

**Batas dengan Dit KPOD**: Dit Wilayah tidak membuat laporan nasional; mereka memakai Laphar dan menyumbang isi medan "Pendampingan BNPB". Satu sistem untuk tiga direktorat, saringannya tabel provinsi di bagian 1.

### W1. Meja Wilayah: siapa yang harus diurus hari ini, per direktorat

- **Masalah**: data yang dibutuhkan direktur wilayah tersebar di lima berkas (SK, saran status, episode laphar, korban, prakiraan) dan tidak ada yang menyaring per direktorat baru. Struktur baru berumur 10 bulan; belum ada alat yang tahu provinsi mana milik siapa.
- **Pengguna dan keputusan**: Direktur dan staf Dit Wilayah I/II/III; kabupaten mana yang ditelepon, SK mana yang hampir habis dan perlu ditanya perpanjangan atau transisi, kejadian mana yang belum didampingi, provinsi mana yang besok berisiko.
- **Masukan** (tanpa isian):
  - `public/data/status_darurat.json`: SK berlaku, sisa hari = berakhir - hari ini, `lewat_batas`.
  - `public/data/saran_status.json`: kab bersaran tanpa SK (calon status).
  - `public/data/laphar_riwayat.json`: episode `status: berjalan`, puncak dampak, pendampingan (A3).
  - `/prediksi` (`scripts/prediksi/**`, prakiraan +1..+3 hari per kab).
  - D1 `korban` (status terverifikasi, agregat) lewat rute yang sudah ada bila staf masuk.
- **Aturan inti** (urutan antrean, tertinggi dulu):
  1. episode berjalan dengan md > 0 atau mengungsi_jiwa >= 1.000 tanpa pendampingan;
  2. SK berakhir dalam <= 2 hari dan episode masih berjalan (tanya perpanjangan atau transisi);
  3. saran Tanggap Darurat tanpa SK lebih dari 3 hari (tenggat laporan DSP Perban 4/2020 Pasal 4);
  4. SK berakhir, DSP cair, SPJ belum, sisa tenggat dari A2;
  5. prakiraan +1..+3 level tinggi di kab berstatus siaga.
  Tiap butir membawa alasan dalam kalimat dan sumbernya.
- **Pembuatan**: `scripts/bnpb/meja_wilayah.py` -> `public/data/bnpb/meja_wilayah.json` (agregat publik; antrean per direktorat). Data tabel provinsi di `public/data/bnpb/dit_wilayah.json` dengan gerbang `tests/bnpb/dit_wilayah.test.mjs`: 38 provinsi + IKN, masing-masing tepat di satu direktorat, cocok dengan teks Pasal 74/77/79A. Layar `public/bnpb/wilayah.{html,js,css}` meniru pola `public/bnpb/dalops.*` (fungsi murni di `wilayah_hitung.js`, uji node), pemilih direktorat sebagai deretan pil penuh lebar. Komponen `public/semua/darurat.js` dan `public/inti/status_pedoman.js` dipakai ulang untuk teks masa SK. Tanpa D1 kecuali panel korban.
- **Ukuran berhasil**: tiap hari tiga antrean terbit; dalam 2 minggu, satu direktur memakainya di briefing pagi (pemilik yang memastikan); butir tipe 1 turun.
- **Ukuran kerja**: M. Ketergantungan: A3 untuk pendampingan; tanpa A3 butir tipe 1 tidak bisa dihitung, sisanya jalan.
- **Risiko**: penjodohan nama kab antara Laphar, SK, dan Kemendagri (sudah ada `nama_wilayah.nk`); SK tahun berjalan hanya dari Drive lokal.

### W2. Pengungsi terpilah per tempat pengungsian, kebutuhan dasar terhitung, dan panel selisih

- **Masalah**: Juknis 9/2023 mewajibkan data per tempat pengungsian diperbarui setiap hari, tapi aplikasinya hanya "apabila tersedia". Akibatnya angka pusat dan daerah berselisih besar (Aceh Utara 4.385 lawan 18.908, Maret 2026). Kebutuhan dasar dihitung tangan.
- **Pengguna dan keputusan**: Dit Wilayah (pendamping), Posko PDB kab/kota, Deputi Logistik; berapa beras, air, jamban, tenda untuk besok; angka mana yang dipakai pimpinan.
- **Masukan**:
  - Otomatis: `mengungsi_jiwa` per kab per hari dari `laphar_riwayat.json` (angka pusat).
  - WA dari Pos Lapangan atau BPBD ke nomor Fonnte yang sudah dipakai `src/wa.js`: satu pesan per tempat per hari dengan pola tetap, contoh `#pengungsian <nama tempat> KK 120 L 0-11bln 3 ...`. Pengurai deterministik (pola sama dengan `laporan_urai.js`), tanpa model. Pesan yang tidak cocok pola masuk antrean periksa, tidak ditebak.
  - Isian pendek (11 angka) di `/instansi` untuk akun BPBD bila WA tidak dipakai.
  - Angka resmi pemda dari berita: sudah ada pemanen berita per bencana (`scripts/berita/*.py`); hanya dipakai sebagai pembanding berlabel.
- **Aturan inti**:
  - Kebutuhan per tempat per hari (Perka 7/2008, Juklak 3/2022): beras = 0,4 kg x jiwa; air = 7 liter x jiwa pada hari 1-3 sejak buka, lalu 15 liter; jamban = ceil(jiwa / 20); luas hunian = 3 m2 x jiwa; kantong sampah = ceil(KK / 3) per 3 hari; sabun mandi = 0,25 kg x jiwa per bulan; susu dan popok dari jumlah bayi dan balita.
  - Rekap kab = jumlah tempat dengan data <= 2 hari; tempat lebih tua ditandai basi dan tidak dijumlah.
  - Panel selisih: `selisih = |pusat - daerah| / max(pusat, daerah)`; > 25% = merah, tampil berdampingan dengan sumber dan tanggal masing-masing. Sistem tidak memilih angka yang benar.
- **Pembuatan**: migrasi `migrations/01xx_pengungsian.sql`:
  - `pengungsian_tempat(id, prov, kab, kec, desa, nama, jenis CHECK(massal|keluarga|mandiri), lat, lon, buka, tutup, kejadian_ref, dibuat, dummy)`;
  - `pengungsian_harian(tempat_id, tanggal, kk, l_0_11b, p_0_11b, l_12_59b, p_12_59b, l_5_12, p_5_12, l_13_17, p_13_17, l_18_59, p_18_59, l_60, p_60, hamil, menyusui, disabilitas, terpisah_ortu, sumber CHECK(wa|isian|laphar), oleh, PRIMARY KEY(tempat_id, tanggal))`.
  Tanpa nama pengungsi dan tanpa nomor koordinator (Juknis meminta kontak koordinator; disimpan sebagai hash atau tidak sama sekali, lihat pertanyaan pemilik). Rute `/api/pengungsian/*` di `src/pengungsian.js` mengikuti pola `src/korban.js` (auth akun instansi aktif atau staf, validasi, laju tulis, idempoten per `tempat_id+tanggal`). Pengurai WA di `src/wa.js` (jenis baru `pengungsian`). Rekap publik agregat per kab di-cache tepi. Layar: tab di `public/bnpb/wilayah.*` (W1) dan isian di `public/instansi_*`. Fungsi kebutuhan murni di `public/inti/kebutuhan_dasar.js`, diuji node; standar angkanya diambil dari `src/aturan_darurat.js` (A2).
- **Ukuran berhasil**: pada kejadian besar berikutnya, >= 1 kab mengirim data per tempat >= 5 hari berturut; panel selisih menampilkan angka pusat dan daerah untuk kab itu; kebutuhan beras dan air terhitung tanpa spreadsheet.
- **Ukuran kerja**: L. Ketergantungan: A2 (angka standar), nomor WA dan daftar pengirim terdaftar per BPBD, uji integrasi D1 sesuai `~/.claude/TEST.md` (trigger dan CHECK diuji SQL langsung).
- **Risiko**: PDP rendah karena agregat per tempat, tapi tempat pengungsian kecil (1-3 keluarga) bisa mengenali orang: rekap publik hanya per kab dan menyembunyikan tempat < 10 jiwa. Kuota D1: 1 baris per tempat per hari, ratusan baris per kejadian, baca rekap dari cache; aman. Risiko terbesar adalah tidak ada yang mengirim; karena itu angka laphar tetap tampil walau WA kosong.

### W3. Kaji cepat dua tahap yang terisi sendiri dari penilaian awal

- **Masalah**: meja `kaji_cepat` satu tahap dengan ambang 72 jam, sedangkan Juklak 3/2022 mengenal laporan awal (24 jam, untuk rekomendasi status) dan lanjutan (72 jam, untuk rencana operasi). Meja kosong (0 baris) karena menuntut ketik dari nol.
- **Pengguna dan keputusan**: TRC BNPB yang dikirim Dit Wilayah dan TRC BPBD; status apa yang direkomendasikan, berapa lama.
- **Masukan**: laporan warga (`/warga`, `src/laporan_bencana.js`) dan WA sebagai penilaian awal Format 1-3 Juklak 4/2023; sinyal model (`saran_status.json`, `/prediksi`); dampak dari episode laphar; peta keterpaparan (`public/data/bnpb/terpapar.json`).
- **Aturan**: draf laporan awal terisi otomatis: cakupan wilayah (kec dari laporan + sinyal), penduduk terpapar dari `terpapar.json`, rekomendasi status dari aturan `saran_status.py` (Siaga bila hanya sinyal, Tanggap bila ada dampak terverifikasi; gempa tidak pernah Siaga), perkiraan masa dari median masa SK sejenis di provinsi itu (`status_darurat.json`). TRC hanya mengoreksi dan menyetujui. Laporan lanjutan menambah kebutuhan dari W2.
- **Pembuatan**: ubah spesifikasi meja `kaji_cepat` di `src/meja_spek.js` dan `migrations/0026_meja.sql` lewat migrasi baru (status `awal_terkirim`, `lanjutan_terkirim`; CHECK disesuaikan, dijaga `tests/warga/meja.test.mjs`). Rute pra-isi `GET /api/meja/kaji_cepat/draf?kab=` membaca JSON statis saja (tanpa D1). Ekspor PDF Format-4 meniru gaya ekspor yang sudah ada.
- **Ukuran berhasil**: median waktu dari laporan warga pertama sampai laporan awal tersimpan; draf yang disetujui tanpa koreksi besar >= 50%.
- **Ukuran kerja**: M. Ketergantungan: A2, W2 untuk lanjutan.
- **Risiko**: rekomendasi otomatis dibaca sebagai penetapan; label tetap "saran" seperti `saran_status.py`, dan yang menetapkan tetap kepala daerah.

### W4. Jejak DSP per kejadian (melengkapi Sistala-DSP, bukan menyaingi)

- **Masalah**: DSP Rp250 miliar per tahun dan tambahan Rp5,67 triliun diajukan 2026; kasus KPK 2026 berawal dari pengadaan DSP dengan alasan status tanggap darurat. Tidak ada tampilan yang menyandingkan DSP dengan SK yang mendasarinya dan dampak yang ditanganinya. Sistala-DSP mengurus berkas pengajuan; yang belum ada adalah pemeriksaan silang.
- **Pengguna dan keputusan**: Deputi, Dit KPOD (monev), Dit Wilayah (tenggat SPJ daerah binaan), Inspektorat II (pengawas Deputi PD menurut Pasal 106 Perban 6/2025). Keputusan: DSP mana yang tanpa SK berlaku, nilai mana yang tidak wajar, SPJ mana yang lewat.
- **Masukan**: medan pendampingan laphar (nilai "DSP Rp...", A3); siaran pers bnpb.go.id yang menyebut DSP (pemanen berita yang ada); `status_darurat.json`; meja `dsp` bila diisi.
- **Aturan**: tiap DSP dijodohkan ke SK (kab, tanggal); bendera: (a) DSP tanpa SK atau status keadaan tertentu dalam jendela +/-7 hari (Perban 4/2020 Pasal 2 ayat 1); (b) nilai per jiwa mengungsi-hari dan per rumah rusak berat jauh di atas median kejadian sejenis (di atas persentil 90 = tanda periksa, bukan tuduhan); (c) tenggat laporan tanggal 5 dan SPJ 3 bulan dari A2.
- **Pembuatan**: `scripts/bnpb/jejak_dsp.py` -> `data/raw/bnpb/jejak_dsp.json` dan unggah R2 internal (pola `dalops/<jenis>.json` di `src/dalops.js`, rute staf saja), karena bendera nilai tidak pantas publik sebelum diperiksa. Layar tab di `public/bnpb/wilayah.*`.
- **Ukuran berhasil**: >= 80% DSP yang disebut di laphar 2026 berhasil dijodohkan ke SK; daftar bendera dibaca pemilik sekali sebulan.
- **Ukuran kerja**: M. Ketergantungan: A2, A3.
- **Risiko**: politis tinggi saat kasus KPK berjalan; aturan pemilik untuk `/direktori` (tanpa orang terkait kasus KPK) dipakai juga di sini: tidak ada nama orang, hanya kejadian dan nilai. Angka DSP dari teks laphar bisa tak lengkap; bendera (b) hanya tampil bila n kejadian sejenis >= 10.

## 7. Tidak saya usulkan (dan alasannya)

- Sistem komando/posko digital penuh: sudah ada `src/operasi_lapangan.js`, `src/command_center.js`, `/petugas`; untuk bencana non-karhutla cukup diperluas setelah W1 terpakai.
- Tracker pemulihan segera prasarana vital terpisah: cukup tambah jenis `perbaikan_darurat` (jalan, jembatan, listrik, air bersih) di `JENIS_PEMULIHAN` `src/pemulihan.js`; ukuran S, tunggu ada permintaan.
- Aplikasi pengajuan DSP: itu Sistala-DSP.

## 8. Pertanyaan untuk pemilik (dengan bawaan bila tidak dijawab)

1. **Pusdalops dihapus di Perban 11/2025; apakah peran staf `pusdalops` di repo diganti nama jadi `koordalops`/Dit KPOD?** Bawaan: nama peran tidak diubah (menghindari migrasi peran), label layar ditulis "Dit. Koordalops".
2. **Siapa pemegang DSP sesudah 11/2025 (Dit KPOD, tiap Dit Wilayah, atau masih subdit lama)?** Bawaan: monev di Dit KPOD, tenggat per daerah di Dit Wilayah.
3. **W4 (jejak DSP) dibangun sekarang di tengah kasus KPK, atau ditunda?** Bawaan: dibangun internal saja (rute staf, R2), tanpa nama orang, tidak tampil publik.
4. **Kontak koordinator tempat pengungsian (diminta Juknis 9/2023) disimpan?** Bawaan: tidak disimpan; hanya nama tempat dan wilayah.
5. **Nomor WA untuk W2: pakai nomor Fonnte laporan harian yang sama atau nomor terpisah?** Bawaan: nomor yang sama, jenis pesan dibedakan tagar `#pengungsian`.
6. **Rapor A1 tampil di `/bnpb/kinerja` publik atau internal?** Bawaan: internal dulu sampai satu siklus bulanan dicek pemilik.
7. **Urutan kerja.** Bawaan: A2 (S) dan A3 (S-M) dulu karena semua bergantung padanya, lalu W1, A1, W2, W3, W4.

## 9. Sumber yang tidak bisa diakses

- Teks Juklak 10/2023 (Sistem Komando kab/kota), Juklak 6/2023 (Penilaian Perkembangan Penanganan Darurat), Perka 15/2012 (Pedoman Pusdalops): halaman 0 di korpus lokal.
- Alamat aplikasi Sistala-DSP dan SIMAMPU: tidak ditemukan; isi manual bit.ly tidak dibuka.
- Berita Bisnis.com soal sisa DSP Rp1,51 triliun (30 Des 2025): 403.
- Beberapa berkas korpus di iCloud sempat tertahan (Juklak 3/2022, 4/2023) lalu terbaca setelah diunduh; repo di iCloud Documents bisa mengulang masalah ini untuk pipeline lokal.
