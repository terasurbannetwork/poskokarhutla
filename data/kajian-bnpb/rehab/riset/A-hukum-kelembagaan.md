# Riset A: Hukum dan Kelembagaan Rehabilitasi dan Rekonstruksi

Tanggal: 25 Oktober 2026
Lingkup: dasar hukum rehabilitasi dan rekonstruksi (RR) pascabencana, instrumen pendanaan, dan pembagian peran BNPB, BPBD, Kementerian PU, dan TNI/Polri untuk sistem air dan jembatan.
Cara kerja: tiap kutipan dicek ke teks dokumen (korpus JDIH lokal `data/raw/hukum/teks/`, korpus lembaga `data/kajian-bnpb/data/lembaga/mentah/teks/`, dan PDF PP 21/2008 dari JDIH BPK yang diunduh ke scratchpad sesi dan dibaca dengan `pdftotext`). Status berlaku dari `public/data/bnpb/hukum/katalog.json`. Kutipan pendek di bawah sudah dicocokkan string-nya dengan teks sumber. Dokumen berstatus OCR ditandai; untuk keputusan resmi rujuk PDF di jdih.bnpb.go.id.

## Sumber

| No | Dokumen | Penerbit | Tanggal/tahun | Lokasi teks atau URL | Kutipan atau angka pendek | Label | Catatan |
|---|---|---|---|---|---|---|---|
| 1 | UU 24/2007 tentang Penanggulangan Bencana | Pemerintah RI | 2007 | `data/kajian-bnpb/data/lembaga/mentah/teks/uu-24-2007.json.gz` | Pasal 59 ayat (1): rekonstruksi "dilakukan melalui kegiatan pembangunan yang lebih baik" | resmi | Teks digital, bukan OCR |
| 2 | PP 21/2008 tentang Penyelenggaraan PB | Pemerintah RI | 2008 | https://peraturan.bpk.go.id/Details/4833/pp-no-21-tahun-2008 (PDF /Download/36842) | Pasal 76 ayat (1): rekonstruksi tanggung jawab pemda "kecuali prasarana dan sarana yang merupakan tanggung jawab Pemerintah" | resmi | Status Berlaku menurut laman BPK, dibuka 25 Okt 2026 |
| 3 | Perban BNPB 5/2017 Penyusunan Rencana RR Pascabencana | BNPB | 2017 | `data/raw/hukum/teks/perban-nomor-5-tahun-2017.json` | Pasal 2 ayat (2): penyusunan R3P "paling lama 90 (sembilan puluh) hari" | resmi | BERLAKU; mencabut Perka 17/2010 (lihat butir 15) |
| 4 | Perban BNPB 6/2017 Penyelenggaraan RR Pascabencana | BNPB | 2017 | `data/raw/hukum/teks/perban-nomor-6-tahun-2017.json` | Pasal 12 ayat (1): penanggung jawab pelaksanaan RR adalah BNPB dan/atau BPBD | resmi | BERLAKU |
| 5 | Perban BNPB 4/2024 Penyelenggaraan Hibah RR Pascabencana | BNPB | 2024 | `data/raw/hukum/teks/perban-nomor-4-tahun-2024.json` | Pasal 5 huruf e: hibah RR tidak dapat membiayai "aset rusak milik pemerintah desa" | resmi | BERLAKU; menggantikan Perban 3/2019 (TIDAK BERLAKU) |
| 6 | Perban BNPB 4/2020 Penggunaan Dana Siap Pakai | BNPB | 2020 | `data/raw/hukum/teks/perban-nomor-4-tahun-2020.json` | Pasal 14: pengguna DSP termasuk "Tentara Nasional Indonesia/Kepolisian Negara Republik Indonesia" | resmi | BERLAKU; teks OCR 21 halaman |
| 7 | Perka BNPB 12/2010 Pedoman Mekanisme Pemberian Bantuan Perbaikan Darurat | BNPB | 2010 | `data/raw/hukum/teks/perka-nomor-12-tahun-2010.json` | Jembatan penghubung "berupa bantuan rangka baja dan struktur dari Departemen Pekerjaan Umum" | resmi | BERLAKU; nomenklatur kementerian lama |
| 8 | Perka BNPB 15/2011 Pedoman Pengkajian Kebutuhan Pascabencana | BNPB | 2011 | `data/raw/hukum/teks/perka-nomor-15-tahun-2011.json` | Formulir sektor transportasi memuat baris jumlah unit dan biaya per unit infrastruktur darurat, dengan contoh jembatan bailey (parafrase; tabel OCR terpotong) | resmi | OCR sebagian (hlm. 2, 5, 7, 49); dicek lewat `data/hukum/seed.sql` |
| 9 | Juklak BNPB 1/2023 Bantuan Dana Tunggu Hunian | BNPB | 2023 | `data/raw/hukum/teks/juklak-nomor-1-tahun-2023.json` | DTH "maksimal sebesar Rp600.000" per bulan atau Rp20.000 per hari | resmi | BERLAKU; OCR |
| 10 | Juklak BNPB 15/2025 DTH Aceh, Sumatera Utara, Sumatera Barat | BNPB | 2025 | `data/raw/hukum/teks/juklak-nomor-15-tahun-2025.json` | "Dapat diberikan selama 3 (tiga) bulan"; Rp600.000 per bulan; disalurkan dari BNPB ke rekening penerima | resmi | BERLAKU |
| 11 | Juklak BNPB 3/2023 Bantuan Hunian Sementara | BNPB | 2023 | `data/raw/hukum/teks/juklak-nomor-3-tahun-2023.json` | Lokasi huntara "harus memiliki akses pada layanan kesehatan, air bersih dan sanitasi" | resmi | BERLAKU; OCR |
| 12 | Juklak BNPB 1/2025 Dana Bersama Tahap Pascabencana | BNPB | 2025 | `data/raw/hukum/teks/juklak-nomor-1-tahun-2025.json` | Kegiatan yang dapat dibiayai adalah kegiatan dalam R3P "meliputi 5 (lima) sektor" | resmi | BERLAKU |
| 13 | Juklak BNPB 5/2024 Stimulan Perbaikan/Pembangunan Kembali Rumah (DSP) | BNPB | 2024 | katalog: `juklak-5-2024`, teks tidak ada di korpus | Tidak dikutip | resmi | BERLAKU menurut katalog; berkas tidak tersedia (sama dengan catatan naskah mitigasi Bab 11) |
| 14 | Perka BNPB 7/2008 Tata Cara Pemberian Bantuan Pemenuhan Kebutuhan Dasar | BNPB | 2008 | `data/raw/hukum/teks/perka-nomor-7-tahun-2008.json` | 7 liter per orang per hari tiga hari pertama, lalu 15 liter (dicek di KERANGKA kajian V04) | resmi | BERLAKU. Riset C dan D memberi label berbeda; yang benar resmi (standar peraturan) |
| 15 | Perka BNPB 17/2010 Pedoman Umum Penyelenggaraan RR | BNPB | 2010 | katalog: `perka-17-2010` BERLAKU | Dicabut Perban 5/2017 Pasal 12 menurut naskah mitigasi Bab 11.9 | resmi | Ketidaksesuaian indeks JDIH; masuk lampiran Penyelarasan dokumen BNPB |
| 16 | Perban BNPB 6/2025 jo. 11/2025 Organisasi dan Tata Kerja BNPB | BNPB | 2025 | `data/kajian-bnpb/data/program-terbukti/organisasi_bnpb.csv` (kutipan per unit) | Deputi Bidang RR terdiri atas Direktorat RR Perumahan; RR Infrastruktur; RR Sosial, Ekonomi, dan Lingkungan Hidup | resmi | Perban 11/2025 mengganti tiga direktorat Perban 6/2025 |
| 17 | UU 17/2019 tentang Sumber Daya Air | Pemerintah RI | 2019 | `data/kajian-bnpb/data/lembaga/mentah/teks/uu-17-2019.json.gz` | Pasal 8 ayat (1): hak rakyat atas air "merupakan kebutuhan pokok minimal sehari-hari" | resmi | Teks OCR bermutu sedang (salah eja), dicek per string |
| 18 | UU 23/2014 tentang Pemerintahan Daerah, Lampiran | Pemerintah RI | 2014 | `data/kajian-bnpb/data/lembaga/mentah/teks/uu-23-2014.json.gz` | SPAM dibagi pusat (lintas provinsi, strategis nasional), provinsi (lintas kab/kota), kab/kota (di daerah kab/kota) | resmi | Pembagian air tanah di lampiran ini telah bergeser (lihat Celah) |
| 19 | Inpres 18/2025 Percepatan Penanganan Darurat, RR Pascabencana Alam di Aceh, Sumut, Sumbar | Presiden RI | 29 Des 2025 | Dikutip naskah mitigasi Bab 11.9 dari siaran Kemenko IPK | Menko IPK mengoordinasikan pembangunan infrastruktur | resmi | Teks lengkap belum dibuka; instruksi kepada Kepala BNPB tidak dikutip |
| 21 | Keppres 1/2026 Satgas Percepatan RR Pascabencana Alam di Aceh, Sumut, dan Sumbar | Presiden RI | 8 Jan 2026 | https://jdih.kemenkoinfra.go.id/en/keppres-no-1-tahun-2026 | Satgas diketuai Mendagri menurut media (riset E [23][29]) | resmi | Isi pasal belum dibaca; peran BNPB di Satgas belum dapat dipastikan |
| 20 | Rilis BNPB tentang pembiayaan bailey dan operasional TNI | BNPB | 31 Des 2025 | https://www.bnpb.go.id/berita/pembangunan-jembatan-bailey-dan-operasional-personil-tni-di-kawasan-terdampak-bencana-dibiayai-oleh-negara | Bailey diadakan sebagai barang hibah ke daerah, dibayar setelah audit BPKP | resmi | Dari riset B [33] |

## 1. Rantai norma tiga tahap untuk air dan akses

**Inti.** UU 24/2007 sudah menamai air dan prasarana di ketiga tahap. Tanggap darurat memuat pemenuhan kebutuhan air bersih dan sanitasi (Pasal 53 huruf a) dan "pemulihan dengan segera prasarana dan sarana vital" (Pasal 48 huruf f), yang dilakukan "dengan memperbaiki dan/atau mengganti kerusakan akibat bencana" (Pasal 56). Pascabencana memuat perbaikan prasarana dan sarana umum (Pasal 58 ayat (1) huruf b) dan pembangunan kembali prasarana dan sarana dengan rancang bangun tahan bencana (Pasal 59 ayat (1) huruf a dan d).

**Temuan bersumber.**
- UU 24/2007 Pasal 1 angka 11: rehabilitasi adalah perbaikan dan pemulihan semua aspek pelayanan publik "sampai tingkat yang memadai"; angka 12: rekonstruksi adalah "pembangunan kembali semua prasarana dan sarana" [1].
- PP 21/2008 Pasal 54 ayat (2): pemulihan segera prasarana dan sarana vital "dilakukan oleh instansi/lembaga terkait yang dikoordinasikan oleh Kepala BNPB dan/atau kepala BPBD" [2].
- PP 21/2008 Pasal 64 ayat (3): perbaikan prasarana dan sarana umum mencakup perbaikan infrastruktur dan fasilitas sosial/umum; Pasal 65 ayat (3) huruf b mensyaratkan rencana teknis memenuhi "persyaratan sistem sanitasi" [2].
- PP 21/2008 Pasal 66: perbaikan prasarana dan sarana umum "dilakukan secara gotong royong, dengan bimbingan dan/atau bantuan teknis" pemerintah [2]. Ini dasar tertulis pola padat karya dan pokmas untuk SPAM desa dan jembatan desa.
- Perka BNPB 12/2010: hasil yang diharapkan dari bantuan perbaikan darurat adalah berfungsinya kembali "jalan, jembatan, dermaga, irigasi, utilitas air minum" secara minimal; jembatan penghubung berupa rangka baja dari Kementerian PU (nomenklatur lama "Departemen Pekerjaan Umum") dengan penutup kayu [7].

**Celah.** Tidak ada standar waktu pulih (hari) untuk air perpipaan atau akses jalan dan jembatan di peraturan BNPB yang terunduh. Perka 12/2010 belum diperbarui sejak 2010.

## 2. Siapa bertanggung jawab: pemda, pusat, dan BNPB

**Inti.** Tanggung jawab rehabilitasi dan rekonstruksi berada pada pemerintah daerah, kecuali prasarana kewenangan pusat; BNPB dan BPBD menjadi lembaga penanggung jawab penyelenggaraan dan koordinator, dengan K/L dan perangkat daerah teknis sebagai pelaksana.

**Temuan bersumber.**
- PP 21/2008 Pasal 57 ayat (1): rehabilitasi tanggung jawab "Pemerintah dan/atau pemerintah daerah yang terkena bencana"; Pasal 76 ayat (1): rekonstruksi tanggung jawab pemda, kecuali prasarana dan sarana tanggung jawab Pemerintah [2].
- PP 21/2008 Pasal 58 ayat (1) dan Pasal 77 ayat (1): pemda "wajib menggunakan dana penanggulangan bencana dari APBD"; bila tidak memadai dapat meminta bantuan lewat provinsi, termasuk berupa "tenaga ahli", "peralatan", dan "pembangunan prasarana" (Pasal 58 ayat (4), Pasal 77 ayat (4)) [2].
- PP 21/2008 Pasal 59 ayat (1) dan Pasal 78 ayat (1): usulan bantuan diverifikasi tim antardepartemen yang dikoordinasikan Kepala BNPB [2].
- PP 21/2008 Pasal 60 dan Pasal 79: rehabilitasi dan rekonstruksi dilaksanakan satuan kerja pemda dan instansi terkait, dikoordinasikan BPBD [2].
- Perban 6/2017 Pasal 12 ayat (1)-(4): BNPB dan/atau BPBD lembaga penanggung jawab; dapat dibentuk kelompok kerja koordinatif sementara dengan keputusan Kepala BNPB atas nama Presiden dan/atau kepala daerah "paling lama 3 (tiga) tahun" [4].
- Perban 6/2017 Pasal 13 ayat (3): BNPB dan/atau BPBD "melibatkan Kementerian/Lembaga dan/atau perangkat daerah teknis terkait sesuai dengan tugas dan fungsinya"; ayat (6): hasil RR menjadi aset pemerintah, pemda, dan/atau masyarakat [4].
- UU 23/2014 Lampiran: SPAM lintas provinsi dan strategis nasional kewenangan pusat; lintas kab/kota kewenangan provinsi; SPAM di daerah kab/kota kewenangan kab/kota [18].
- Inpres 18/2025 menempatkan koordinasi pembangunan infrastruktur Sumatra pada Menko IPK [19]. Ini preseden bahwa pada kejadian besar koordinasi infrastruktur RR keluar dari rantai BNPB; teks belum dibuka.

**Inferensi penyusun.** Untuk jembatan dan air, BNPB bukan pembangun utama. Perannya menurut teks: koordinasi (PP 21/2008 Pasal 54, 59, 78), penyusun dan penetap R3P (Perban 5/2017), penyalur hibah RR dan DSP, dan pemantau (Perban 6/2017 Pasal 14). Kementerian PU (Bina Marga untuk jalan dan jembatan nasional; Cipta Karya untuk SPAM; SDA untuk air baku dan air tanah untuk air baku) dan pemda adalah pemilik aset.

## 3. R3P: tenggat, isi, dan sektor air serta akses

**Temuan bersumber.**
- Perban 5/2017 Pasal 2 ayat (2)-(3): penyusunan R3P paling lama 90 hari dan "dimulai pada saat tanggap darurat" [3].
- Perban 5/2017 Pasal 8 ayat (2) huruf b: sektor infrastruktur mencakup "transportasi darat", "sumber daya air, air bersih dan sanitasi" [3].
- Perban 5/2017 Pasal 10: R3P disusun untuk jangka waktu paling lama 3 tahun [3].
- Perban 6/2017 Pasal 1 angka 5: definisi membangun kembali lebih baik dan lebih aman; Pasal 7 ayat (4) huruf d-e: RR berpedoman pada SNI bangunan dan infrastruktur dan pada SPM [4].
- Perban 6/2017 Pasal 10: manajemen RR mencakup keluaran (outcome) "manfaat yang dirasakan oleh masyarakat korban bencana" [4]; belum ada indikator outcome baku untuk air atau akses.

**Celah.** Dokumen R3P Lombok dan Sulteng tidak ditemukan (KERANGKA kajian §8 E5); R3P Sumut dan Sumbar 2025 belum diperoleh (naskah mitigasi Bab 11.9). Tidak ada templat R3P yang mewajibkan baris "waktu pulih layanan air" atau "jembatan sementara yang harus diganti permanen".

## 4. Instrumen pendanaan dan batasnya untuk air dan jembatan

**Temuan bersumber.**
- DSP (Perban 4/2020): hanya atas status keadaan darurat, keadaan tertentu, atau risiko berdampak luas yang ditetapkan Kepala BNPB (Pasal 2 ayat (1)); kegiatan yang dapat dibiayai "akan ditetapkan oleh Kepala BNPB" (Pasal 11); pengguna DSP termasuk K/L, TNI/Polri, pemda, dan lembaga kemanusiaan (Pasal 14) [6]. Teks OCR.
- Bailey untuk Sumatra 2025 diadakan dengan DSP sebagai barang yang dihibahkan ke daerah dan dibayar setelah audit BPKP [20].
- Hibah RR (Perban 4/2024): membiayai kegiatan konstruksi dan nonkonstruksi (Pasal 2); konstruksi boleh menambah volume paling banyak 10% dan mengubah konstruksi karena "perubahan struktur tanah, pola aliran sungai" (Pasal 3 huruf a dan c) [5].
- Hibah RR tidak dapat membiayai biaya perencanaan, pengawasan, operasional, dan pemeliharaan; normalisasi sungai dan pekerjaan penanganan darurat; pembelian lahan; "aset rusak milik pemerintah desa"; dan kegiatan yang sudah didanai sumber lain (Pasal 5 huruf b-g) [5].
- Penerima hibah RR harus sudah punya BPBD berdasarkan perda, kebutuhan R3P melebihi anggaran PB APBD, dan sudah menyusun R3P (Pasal 6 ayat (1)) [5]; perubahan RKA tidak boleh mengubah jenis atau lokasi kegiatan (Pasal 26 ayat (2)); kegiatan yang tidak selesai menjadi tanggung jawab APBD (Pasal 27) [5].
- Dana Bersama tahap pascabencana (Juklak 1/2025): penerima K/L dan BNPB dengan program pascabencana yang tercantum di R3P yang masih berlaku, pemda, dan kelompok masyarakat; kegiatan harus ada di R3P, lima sektor [12].
- PP 21/2008 Pasal 67: bantuan perbaikan rumah adalah stimulan berupa bahan, komponen, atau uang, "dengan pola pemberdayaan masyarakat" [2].
- DTH Rp600.000 per bulan (Juklak 1/2023, Juklak 15/2025), tiga bulan untuk Sumatra 2025 dan disalurkan langsung oleh BNPB [9][10].

**Inferensi penyusun.** Tiga celah pendanaan yang langsung mengenai topik Grand Design ini: (1) jembatan desa dan SPAM desa (aset pemerintah desa) berada di luar hibah RR; (2) biaya operasi dan pemeliharaan sistem pipa dan sumur bor yang dibangun saat RR tidak dapat dibiayai hibah RR, sehingga keberlanjutan bergantung pada APBD, PDAM, atau pengelola desa; (3) pembelian lahan untuk relokasi dan untuk lokasi sumur atau reservoir tidak dapat dibiayai hibah RR.

**Celah.** Juklak 5/2024 (stimulan rumah DSP) tidak ada di korpus. Keputusan Kepala BNPB yang merinci kegiatan hibah RR (Perban 4/2024 Pasal 2 ayat (2)) dan kegiatan DSP (Perban 4/2020 Pasal 11) tidak ditemukan di korpus.

## 5. Hunian, air, dan relokasi

**Temuan bersumber.**
- Juklak 3/2023: lokasi huntara wajib berakses air bersih, sanitasi, dan pengelolaan sampah [11].
- Hibah RR boleh membangun sarana dan prasarana lain pada relokasi perumahan berdasar telaah tim teknis pemda (Perban 4/2024 Pasal 3 huruf d) [5], tetapi tidak membeli lahan (Pasal 5 huruf d).
- UU 17/2019 Pasal 6 dan 8 menjamin air untuk kebutuhan pokok minimal sehari-hari; pemda kab/kota bertugas memenuhinya bagi masyarakatnya [17].

**Celah.** Tidak ditemukan ketentuan BNPB yang mewajibkan sumber air huntap ditetapkan sebelum lokasi huntap disahkan.

## 6. Air tanah dalam keadaan darurat

**Temuan bersumber.**
- UU 23/2014 Lampiran (sektor energi, sub-urusan geologi) menempatkan penetapan CAT di pusat dan zona konservasi air tanah dalam provinsi di provinsi [18]. Pembagian ini telah diubah rezim perizinan sesudahnya; rinciannya di riset C §1.
- Riset C menemukan ambang persetujuan penggunaan air tanah untuk kebutuhan pokok dan tidak menemukan ketentuan perizinan khusus keadaan darurat (riset C §1 dan Celah).

**Celah.** Status PP 43/2008 dan penerbit izin air tanah masih ditulis "belum dapat dipastikan" sesuai KERANGKA kajian celah 32; tidak ditemukan norma yang membebaskan atau mempercepat izin sumur bor darurat.

## 7. Kelembagaan BNPB yang relevan (OTK berlaku)

| Unit | Dasar | Relevansi |
|---|---|---|
| Deputi Bidang Rehabilitasi dan Rekonstruksi | Perban 6/2025 | Pemimpin Grand Design |
| Direktorat RR Infrastruktur | Perban 11/2025 | Jembatan, sistem air, hibah RR infrastruktur |
| Direktorat RR Perumahan | Perban 11/2025 | Huntap, stimulan, air permukiman |
| Direktorat RR Sosial, Ekonomi, dan Lingkungan Hidup | Perban 11/2025 | Pemulihan mata pencaharian, lingkungan, akuifer sebagai aspek lingkungan |
| Deputi Bidang Penanganan Darurat (Direktorat PD Wilayah I-III, Direktorat Koordinasi Pengendalian Operasi Darurat) | Perban 11/2025 | Bailey dan air darurat; Direktorat Dukungan Infrastruktur Darurat Perban 6/2025 sudah diganti |
| Deputi Bidang Logistik dan Peralatan | Perban 6/2025 | Stok bailey, kit pipa, pompa, IPA mobile |
| Deputi Bidang Sistem dan Strategi (Direktorat Pemetaan dan Evaluasi Risiko Bencana) | Perban 6/2025 | Peta risiko untuk lokasi sumur, trase pipa, jembatan |
| Pusdatinkom | Perban 6/2025 | Kolom DIBI untuk SPAM rusak dan waktu pulih |
| Biro Hukum, Organisasi, dan Kerja Sama | Perban 6/2025 | Perubahan Perban 4/2024, Perka 12/2010 |

Sumber: `organisasi_bnpb.csv` [16]. Pembagian tugas internal Direktorat RR Infrastruktur per pasal belum dibaca; pemetaan relevansi adalah pemetaan penyusun.

## 8. Temuan untuk lampiran Penyelarasan dokumen BNPB

1. Perban 6/2017 Pasal 9 ayat (1), di bawah judul "Bagian Kedua Rekonstruksi", berbunyi "Penyelenggaraan Rehabilitasi Pascabencana" dan ayat (2) juga merujuk rehabilitasi, padahal isinya kegiatan rekonstruksi [4]. BNPB menyelaraskan rumusan pada perubahan berikutnya.
2. Katalog JDIH masih menandai Perka 17/2010 berlaku, sedangkan naskah mitigasi mencatat pencabutannya oleh Perban 5/2017 [15].
3. Perka 12/2010 masih memakai "Departemen Pekerjaan Umum" [7].

## Angka calon registri

| kunci | nilai | satuan | label | sumber |
|---|---|---|---|---|
| rehab.hukum.r3p_hari_maks | 90 | hari | resmi | [3] Pasal 2 ayat (2) |
| rehab.hukum.r3p_tahun_maks | 3 | tahun | resmi | [3] Pasal 10 |
| rehab.hukum.pokja_rr_tahun_maks | 3 | tahun | resmi | [4] Pasal 12 ayat (4) |
| rehab.hukum.hibah_rr_tambah_volume_maks | 10 | persen | resmi | [5] Pasal 3 huruf a |
| rehab.hukum.hibah_rr_ubah_rka_bulan_maks | 6 | bulan | resmi | [5] Pasal 26 ayat (3) |
| rehab.hukum.hibah_rr_lapor_berkala_bulan | 3 | bulan | resmi | [5] Pasal 28 ayat (2) |
| rehab.hukum.dth_rp_bulan | 600.000 | rupiah per bulan | resmi | [9][10] |
| rehab.hukum.dth_rp_hari | 20.000 | rupiah per hari | resmi | [9] |
| rehab.hukum.dth_sumatra_bulan | 3 | bulan | resmi | [10] |
| rehab.hukum.dana_bersama_sektor_r3p | 5 | sektor | resmi | [12] |
| rehab.hukum.air_darurat_3hari | 7 | liter per orang per hari | resmi | [14] |
| rehab.hukum.air_darurat_lanjut | 15 | liter per orang per hari | resmi | [14] |
