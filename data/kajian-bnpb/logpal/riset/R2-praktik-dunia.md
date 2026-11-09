# Riset praktik terbaik sistem informasi logistik kemanusiaan dunia, untuk inventori logistik dan peralatan BNPB/BPBD

Tanggal riset: 9 Nov 2026. Hanya riset web; tidak ada berkas repo diubah.
Aturan baca: tiap klaim ada URL. "TIDAK KETEMU" berarti saya cari dan tidak menemukan sumbernya. "(sekunder)" berarti hanya dari ringkasan hasil pencarian atau halaman pihak ketiga, bukan dokumen resmi yang saya buka utuh. Saya tidak membaca kode sistem BNPB; pembanding "sudah/belum" memakai daftar fitur yang diberikan pemesan (stok per gudang, standar minimal vs stok, analisa kebutuhan, jaringan rute darat laut udara, input stok, mutasi, stok opname, QR, form permintaan bertahap, pembuat laporan).

---

## 0. Peringatan keandalan

- Angka Sphere dibaca langsung dari PDF Sphere Handbook 2018 yang saya unduh dan ekstrak teksnya: https://globalprotectioncluster.org/sites/default/files/2022-11/sphere-handbook-2018-en.pdf
- Angka KPI dibaca dari dokumen USAID/ISCG "National Supply Chain Assessment, Key Performance Indicators": https://www.ghsupplychain.org/sites/default/files/2019-07/5-Key%20Performance%20Indicators-2018.pdf
- Angka standar Indonesia dibaca dari Perka BNPB 7/2008 dan Perka BNPB 18/2009 (PDF salinan pihak ketiga, lihat bagian 3). Status berlaku/dicabutnya belum saya verifikasi; ada tanda tumpang tindih dua peraturan (https://www.hukumonline.com/berita/a/dua-peraturan-tentang-bencana-tumpang-tindih-lt540d1b83f0616, hanya judul hasil pencarian, isinya tidak saya buka).
- Halaman UNHRD stock taskforce (https://unhrd.org/unhrd-stock-taskforce) menolak fetch (HTTP 403); isinya hanya dari ringkasan hasil pencarian.
- Banyak sumber sistem (WFP LESS, FEMA LSCMS) tidak mempublikasikan dokumen produk; yang ada laporan audit, jadi fitur dipetakan dari audit dan lowongan kerja, ditandai (sekunder).

---

## 1. Peta sistem: apa yang dipunya, apa yang belum kita punya

### 1.1 WFP LESS (Logistics Execution Support System)
- Sistem korporat WFP untuk pelacakan komoditas "real time" dari penerimaan sampai titik serah akhir, termasuk yang dikelola mitra: https://www.wfp.org/audit-reports/internal-audit-less-functionalities-and-application-controls-february-2021
- Dibangun di atas SAP, menggantikan COMPAS, diluncurkan bertahap per kantor negara (sekunder, ringkasan hasil pencarian atas audit implementasi): https://wfp.org/audit-reports/internal-audit-logistics-execution-support-system-less-implementation-wfp-december
- Fitur gudang yang tampak dari uraian tugas staf: stok per toko/gudang/tanggal, tanggal "best before" untuk stok masuk dan dalam perjalanan, penandaan stok mendekati kedaluwarsa (sekunder): https://untalent.org/jobs/logistics-officer-p3-commodity-tracking-and-accounting-rbc-yemen-sanaa
- Temuan audit 2021 menyarankan lebih banyak laporan pengecualian (exception report) dan tampilan pelacakan yang lebih ramah (sekunder): https://www.wfp.org/audit-reports/internal-audit-less-functionalities-and-application-controls-february-2021
- TIDAK KETEMU: daftar modul dan laporan LESS terperinci (laporan penuh AR/21/02 tidak saya buka).
- Belum kita punya: komoditas dilacak per batch + tanggal kedaluwarsa dalam perjalanan, laporan pengecualian otomatis, akuntansi inventori terintegrasi keuangan.

### 1.2 Logistics Cluster: LCA, RITA, layanan bersama
- LCA (Logistics Capacity Assessment): alat kesiapsiagaan yang memetakan infrastruktur dan layanan logistik per negara dalam format standar: profil negara, infrastruktur (pelabuhan, bandara, jalan, kereta, perairan, gudang), layanan (BBM, transporter, pasar lokal), bea cukai, lampiran peta GIS. https://dlca.logcluster.org/about
- Rapid LCA (RLCA): templat penilaian cepat saat darurat: bandara, bea cukai, BBM, pelabuhan laut, jalan, rel, gudang. https://dlca.logcluster.org/rlca
- RITA (Relief Item Tracking Application): pelacakan konsainmen online. Satu Consignment ID seumur hidup + nomor pelacakan online; status contoh In transit, Received, Dispatched, Delivered; lacak dari titik masuk lewat titik konsolidasi dan pemuatan sampai titik serah akhir; isi konsainmen dicatat untuk bea cukai; perutean multi-stop; "basic warehouse management"; statistik operasi. https://rita-manual.logcluster.org/en/node/297
- Layanan bersama diminta lewat Service Request Form (SRF) standar; dapat nomor konsainmen dan pelacakan; pembatasan tanggung jawab dan asuransi ada di syarat layanan. https://rita-manual.logcluster.org/en/online-service-request-form-srf-user-instructions?lang=en dan https://logcluster.org/en/conditions-of-service
- Panduan operasional Logistics Cluster memuat bagian pemantauan: lead time pengiriman, biaya inventori, biaya limbah (waste), KPI logistik: https://log.logcluster.org/print-preview-entire-book/209
- "Service Marketplace": satu-satunya sumber yang ketemu adalah dokumen WFP (kemungkinan 2019) yang menyebutnya "one-stop shop" layanan WFP dengan penawaran biaya otomatis, manajemen pelanggan, dan pengiriman layanan, masih tahap rintisan (pilot): https://docs.wfp.org/api/documents/WFP-0000110735/download (sekunder; saya tidak membuka PDF-nya). Status hidup/matinya TIDAK KETEMU. Pencarian di logcluster.org tidak menemukan halaman bernama itu; yang ada katalog layanan dan SRF.
- Belum kita punya: lembar penilaian kapasitas (LCA) terstruktur untuk pelabuhan/bandara/jalan/gudang/transporter yang bisa diperbarui; nomor konsainmen satu-ID yang dilacak sepanjang rantai; formulir permintaan layanan standar dengan prioritisasi; pelacakan di titik konsolidasi.

### 1.3 UNHRD (United Nations Humanitarian Response Depot)
- Jaringan hub yang membeli, menyimpan, dan mengirim cepat barang darurat untuk komunitas kemanusiaan; dijalankan WFP. https://www.wfp.org/unhrd
- Layanan standar hanya untuk pihak yang menandatangani Technical Agreement; penyimpanan prapenempatan gratis di beberapa hub (sekunder, hasil pencarian): https://www.wfp.org/unhrd dan https://unhrd.org/hub/dubai
- Plafon stok ditetapkan satuan tugas agar jaringan mendukung sampai 250.000 penerima manfaat pada fase awal (sekunder, halaman tidak bisa dibuka): https://unhrd.org/unhrd-stock-taskforce
- SOP UNHRD 2022 (tidak saya buka): https://Unhrd.org/sites/default/files/media-document/UNHRD_Standard_Operating_Procedures_2022.pdf
- Belum kita punya: plafon stok yang diturunkan dari jumlah penerima manfaat sasaran per hub; perjanjian teknis/akses layanan berlapis (pemilik stok vs pengguna).

### 1.4 HELIOS / Fritz Institute (Humanitarian Logistics Software, HLS)
- Modul: Mobilisasi (kebutuhan penerima manfaat dan seruan dana, direkonsiliasi dengan donasi), Pengadaan (PO, analisis penawaran, rekonsiliasi barang diterima dengan faktur), Transportasi dan Pelacakan (konsolidasi dan pelacakan tonggak otomatis), Laporan (donor dan manajemen). https://www.fmreview.org/?p=35213
- Data yang didukung: kinerja pemasok/penyedia logistik/donor, harga pasar dan historis per wilayah, rekonsiliasi kebutuhan vs terpasok, biaya operasi vs donasi masuk, stok dalam perjalanan dan di gudang, waktu dari seruan sampai pengiriman, kehilangan dan kerusakan untuk klaim. https://www.fmreview.org/?p=35213
- Rilis dan pelisensian: gratis dari Fritz Institute pada 2007, kemudian dialihkan ke HELIOS Foundation sebagai sumber terbuka sekitar 2010 (sekunder, deck): https://www.mhlnews.com/technology-automation/article/22039865/humanitarian-logistics-software-now-released dan https://www.sambuz.com/doc/helios-helios-ppt-presentation-606032. Status proyek saat ini TIDAK KETEMU. Halaman yang saya buka tidak menyebut kata "HELIOS", jadi pemetaan HLS = HELIOS bersumber dari hasil pencarian tersebut, bukan dari fmreview.
- Belum kita punya: pelacakan donor dan donasi in-kind terhubung ke permintaan; kinerja pemasok/transporter; waktu seruan-ke-pengiriman; rekonsiliasi kebutuhan vs terpasok.

### 1.5 SUMA / LSS (PAHO)
- SUMA (Humanitarian Supply Management System) sejak 1992; kini inti perangkat lunaknya LSS: mencatat donasi, pengiriman, permintaan, dan pipeline; berbagi data antarlokasi; menggabungkan data stok mitra via Excel; klasifikasi barang bersama PAHO/UNICEF/WHO; ada versi desktop dan web; laporan dan BI. https://www.paho.org/en/topics/health-emergencies-and-disaster-response/lss-system
- Sejarah dan modul SUMA (sekunder): https://www.rhsupplies.org/activities-resources/publications/paho-suma-supply-management-system-6429 dan https://medbox.org/document/humanitarian-supply-management-system-suma
- Batas yang disebut satu presentasi: LSS sistem inventori dan pergerakan, bukan pelacakan penuh (sekunder): https://fmsinc.com/Consulting/portfolio/logistics-support-system.aspx
- Belum kita punya: klasifikasi barang bersama lintas lembaga (kode barang terstandar), pencatatan donasi masuk di titik tiba (bandara/pelabuhan), triase barang sumbangan (klasifikasi cepat saat bantuan membanjir), impor data stok mitra lewat Excel.

### 1.6 Humanitarian Logistics Association (HLA)
- Fungsi: sertifikasi dan profesionalisasi, bukan sistem informasi. Program sertifikasi 2006 dengan Fritz Institute dan CILT UK; sertifikat tingkat operasional dan strategis. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4304298/
- Kerangka kompetensi (makalah 2019): 9 domain, 29 kompetensi, 4 tingkat; keterkaitan resmi dengan HLA TIDAK KETEMU. https://research.hanken.fi/en/publications/supply-chain-and-logistics-competencies-in-humanitarian-aid/
- Tidak ada fitur sistem untuk disalin. Relevan untuk kompetensi petugas gudang BPBD, bukan untuk fitur aplikasi.

### 1.7 IFRC Logistics dan RC Warehouse
- IFRC mengelola gudang prapenempatan di semua wilayah lewat Regional Logistics Unit (RLU); stok milik Federasi atau milik Perhimpunan Nasional mitra, dalam gudang yang dikelola IFRC; campuran barang menurut konteks wilayah dan target stok, jumlah disepakati tahunan; biaya simpan bulanan per gudang; perjanjian kerangka dua tahun (sekunder: Manual Logistik Palang Merah Inggris): https://logistics-manual.redcross.org.uk/manual/rlu-stocks-erus/brcs-global-stocks-pre-positioning dan https://logistics-manual.redcross.org.uk/manual/tag/rlus
- Katalog Barang Standar (Standard Products Catalogue, IFRC/ICRC): lebih dari 2.000 komoditas standar dengan spesifikasi dan kode barang, boleh disalin bebas asal tidak dimodifikasi. https://itemscatalogue.redcross.int/legal.aspx dan https://itemscatalogue.redcross.int/introduction-acknowledgements.aspx
- Kit di katalog dipasok sebagai kit utuh; isi kit tidak bisa dipesan terpisah; kit non-standar dirakit di gudang dari stok lepas (sekunder): https://logistics-manual.redcross.org.uk/manual/rlu-stocks-erus/brcs-global-stocks-pre-positioning
- Prinsip pengelolaan stok dan strategi stok ada di manual yang sama (PDF "Building a stock strategy", "Stock management principles"); PDF tidak bisa saya unduh, isinya TIDAK ketemu: https://logistics-manual.redcross.org.uk/wp-content/uploads/sites/5/2021/07/Building-a-stock-strategy.pdf
- Belum kita punya: katalog barang standar dengan kode tetap dan spesifikasi; kit dengan BOM; stok bertingkat dengan pemilik berbeda (BNPB pusat, BPBD, mitra); biaya penyimpanan per gudang.

### 1.8 AHA Centre DELSA (ASEAN)
- Sistem logistik darurat ASEAN diluncurkan 7 Des 2012; stok regional diprapenempatkan di gudang WFP-UNHRD Subang, Malaysia. https://ahacentre.org/wp-content/uploads/2018/01/DIGITAL-Version-FACTSHEETS-DELSA.pdf
- Katalog DELSA (Maret 2016) menggambarkan stok; spesifikasi mengikuti standar internasional; paket barang berbeda per jenis bahaya berdasar kebutuhan tersering tiap bencana. Sumber yang sama.
- Lead time yang dijanjikan: siaga kuning (bahaya akan terjadi) logistik menyiapkan dan men-standby-kan barang; dalam 6 jam sejak peringatan merah (respons aktif) AHA Centre menawarkan mobilisasi barang DELSA; dalam 48 jam tim lapangan/JOCCA mulai mengoordinasi pengiriman setelah negara terdampak menerima tawaran. Sumber yang sama (faktanya dari lembar fakta 2018; berlaku tidaknya kini TIDAK KETEMU).
- Jaringan: gudang Subang plus satelit di Filipina dan Thailand, mampu mendukung 50.000 rumah tangga (laporan tahunan 2019, sekunder): https://jaif.asean.org/en/news/network-of-delsa-stockpile-to-increase-the-speed-and-scale-of-disaster-response-across-the-asean-region ; gudang satelit Chainat: https://thecolumn.ahacentre.org/?p=11710
- Snapshot Subang 2018: 45 jenis barang, nilai USD 1.777.460 (sekunder): https://jaif.asean.org/jp/news/delsa-in-the-aha-centre-annual-report-2019 . Inventori terkini TIDAK KETEMU.
- Belum kita punya: pemicu berbasis status siaga (kuning/merah) yang otomatis menyiapkan stok; paket barang per jenis bahaya; SLA waktu mobilisasi 6 jam/48 jam diukur sebagai KPI; katalog publik.

### 1.9 FEMA LSCMS dan Commodity Tracking
- LSCMS: sistem catatan FEMA untuk permintaan komoditas ke vendor dan mitra federal, transportasi, inventori di lokasi FEMA, pengiriman dan penerimaan oleh negara bagian; lacak pesanan sampai distribusi akhir. https://www.hstoday.us/?p=173406 dan https://www.everycrsreport.com/reports/IF12239.html
- Alur pesanan: markas atau regional memesan sebelum kebutuhan; Logistics Management Center menyetujui; Supply Chain Integration Branch mencari sumber; Transportation Management Branch mengangkut. https://www.everycrsreport.com/reports/IF12239.html
- Kontrak di muka (advance contract) pra-bencana: 101 kontrak pada TA 2022 (air kemasan, makanan, genset). Sumber yang sama.
- Pelajaran audit: 2017 FEMA kehilangan jejak 38% pengiriman komoditas ke Puerto Rico ($257 juta), transponder GPS tidak dipakai, segel dibuka, bukti serah terima tak lengkap; pelacakan memakai spreadsheet di luar LSCMS (OIG-20-76). https://www.oversight.gov/reports/audit/fema-mismanaged-commodity-distribution-process-response-hurricanes-irma-and-maria dan https://www.oversight.gov/sites/default/files/oig-reports/OIG-20-76-Sep20.pdf
- Audit lain: sekitar 30% sumber daya medis COVID-19 tidak dilacak di LSCMS: https://www.oversight.gov/reports/audit/fema-did-not-effectively-manage-distribution-covid-19-medical-supplies-and-equipment
- Dokumen CRS tidak menjelaskan strategi prapenempatan; strategi stok FEMA TIDAK KETEMU di sumber yang saya buka.
- Belum kita punya: pelacakan pengiriman sampai tanda terima di penerima (bukti serah-terima), alarm "hilang visibilitas", kontrak payung pra-bencana tercatat sebagai kapasitas siaga, tahap persetujuan pesanan.

### 1.10 Filipina: DSWD, NROC, DROMIC
- DSWD memprapenempatkan Family Food Pack (FFP: paket makanan untuk keluarga 5 orang selama 3 hari) di gudang pusat dan kantor lapangan; Quick Response Fund; laporan DROMIC memuat inventori stok dengan cap waktu "as of": https://fo10.dswd.gov.ph/programs/disaster-response-and-management-division-drmd/relief-augmentation/ dan contoh laporan https://dromic.dswd.gov.ph/wp-content/uploads/2023/05/DSWD-DROMIC-Preparedness-for-Response-Report-1-on-STY-Mawar-as-of-25-May-2023-6PM.pdf
- NROC Pasay adalah pusat produksi FFP; rekor 9,85 juta paket pada 2024 (sekunder): https://journal.com.ph/dswd-produces-record-3-million-food-packs-in-agency-warehouses-nationwide/ dan https://alpha.pna.gov.ph/articles/1235311
- Prapenempatan menjelang bencana mengikuti prakiraan: contoh 2,6 juta FFP sebelum Nando (Sep 2025) https://mb.com.ph/2025/09/19/26m-food-packs-prepositioned-ahead-of-nandodswd dan lonjakan prapenempatan di wilayah jalur topan https://mb.com.ph/2024/5/24/dswd-prepares-food-packs-for-areas-in-path-of-td-aghon
- Aturan penyangga minimum nasional/per wilayah: TIDAK KETEMU (hanya laporan operasional). Teks Disaster Response Operations Guidelines tidak diambil.
- Belum kita punya: laporan prapenempatan bercap waktu per kantor wilayah yang dirilis rutin sebelum badai; FFP sebagai satuan paket baku (komposisi dan hari tercakup); dana respons cepat berdampingan dengan stok.

### 1.11 Jepang: prapenempatan dan "push-type support"
- Dukungan "dorong" (push-type): pemerintah pusat mengirim barang ke tempat pengungsian tanpa menunggu permintaan daerah, berdasar prediksi; klausul ditambahkan ke Undang-Undang Dasar Penanggulangan Bencana Juni 2012 setelah kekacauan bantuan 2011 (sekunder). https://www.bousai.go.jp/en/documentation/white_paper/pdf/2023/Part1-1.pdf , https://www.bousai.go.jp/taisaku/hisaisyagyousei/push.html , https://www.inkl.com/news/push-type-support-has-mixed-results-after-typhoon-no-19
- "Relief Goods Procurement and Transport Coordination Support System" beroperasi sejak April 2020 untuk koordinasi pengadaan dan angkutan barang: https://www.bousai.go.jp/en/documentation/white_paper/pdf/2021/R3_hakusho_english.pdf
- Pemda diharapkan menyimpan stok minimum di tempat pengungsian dan pusat suplai sambil menunggu dukungan push: https://www.bousai.go.jp/en/documentation/white_paper/pdf/2025/02_chap_01.pdf
- Masalah: kelebihan barang tak dibutuhkan menyumbat simpul angkut (Kumamoto 2016, banjir Jepang barat 2018) (sekunder): https://www.inkl.com/news/push-type-support-has-mixed-results-after-typhoon-no-19
- TIDAK KETEMU: angka stok nasional Jepang dan daftar item resmi (halaman Jepang tidak muncul di hasil).
- Belum kita punya: pergeseran dari model "tarik" (permintaan) ke "dorong" (prakiraan) dengan paket default; koordinasi muatan angkutan antar simpul.

---

## 2. Fitur berulang lintas sistem yang belum ada di daftar kita

Frekuensi = berapa sistem yang saya verifikasi punya fiturnya (dari 1.1 sampai 1.11, tidak dari klaim di luar sumber).

| # | Fitur | Muncul di | Sumber utama |
|---|---|---|---|
| 1 | Pelacakan konsainmen/pengiriman dengan ID tunggal, status, dan tonggak | RITA, LESS, HLS, FEMA LSCMS, SUMA (inventori dan pergerakan) | https://rita-manual.logcluster.org/en/node/297 ; https://www.fmreview.org/?p=35213 |
| 2 | Batch/lot dan tanggal kedaluwarsa, FEFO, karantina barang rusak | LESS, LSS, Logistics Cluster, Palang Merah | https://log.logcluster.org/en/node/133 ; https://log.logcluster.org/en/general-storage-guidelines |
| 3 | Penilaian kapasitas logistik terstruktur (LCA/RLCA): gudang, jalan, bandara, pelabuhan, transporter | Logistics Cluster | https://dlca.logcluster.org/about ; https://dlca.logcluster.org/rlca |
| 4 | Prapenempatan terjadwal dengan plafon/target stok dan prinsip kepemilikan | UNHRD, IFRC RLU, DELSA, DSWD | bagian 1.3, 1.7, 1.8, 1.10 |
| 5 | Lead time terukur (pesan sampai terima; peringatan sampai mobilisasi) | DELSA (6 jam/48 jam), Logistics Cluster, HLS, WFP GCMF | https://ahacentre.org/wp-content/uploads/2018/01/DIGITAL-Version-FACTSHEETS-DELSA.pdf ; https://log.logcluster.org/print-preview-entire-book/209 |
| 6 | Katalog barang dan kit standar dengan kode dan BOM | IFRC katalog, DELSA katalog, SUMA/LSS klasifikasi bersama | https://itemscatalogue.redcross.int/introduction-acknowledgements.aspx |
| 7 | Pelacakan donor dan donasi (in-kind) terhubung kebutuhan/seruan | HLS, LSS (catat donasi) | https://www.fmreview.org/?p=35213 ; https://www.paho.org/en/topics/health-emergencies-and-disaster-response/lss-system |
| 8 | Formulir permintaan layanan standar (SRF) dengan nomor pelacakan | Logistics Cluster | https://rita-manual.logcluster.org/en/online-service-request-form-srf-user-instructions?lang=en |
| 9 | Kinerja pemasok dan transporter terakumulasi | HLS | https://www.fmreview.org/?p=35213 |
| 10 | Pemantauan rantai dingin (suhu harian, lonjakan suhu, datalogger) untuk barang medis | Logistics Cluster, Palang Merah | https://log.logcluster.org/en/node/133 ; https://logistics-manual.redcross.org.uk/wp-content/uploads/sites/5/2021/07/Managing-the-warehouse.pdf |
| 11 | Laporan pengecualian dan visibilitas (stok hilang jejak, stok mendekati kedaluwarsa) | LESS (rekomendasi audit), FEMA OIG | bagian 1.1 dan 1.9 |
| 12 | Pemicu prapenempatan berbasis ramalan | IFRC DREF Anticipatory, Jepang (push), DSWD | https://www.ifrc.org/anticipatory-pillar-dref ; bagian 1.10 dan 1.11 |
| 13 | Mekanisme dana siap pakai berdampingan dengan stok (QRF, IRA, GCMF) | DSWD QRF, WFP IRA/GCMF | https://mb.com.ph/2020/10/03/dswd-reports-p1-25-b-in-stockpiles-available-funds ; https://www.wfp.org/stories/how-world-food-programme-has-cut-its-delivery-times-more-60-percent |
| 14 | Kapasitas transport (armada, moda, tarif kontrak) sebagai data | RITA (kendaraan, jadwal, multi-stop), LCA (transporter) | https://rita-manual.logcluster.org/en/node/297 ; https://dlca.logcluster.org/about |

Catatan "kit dan BOM": Palang Merah mensyaratkan kit dipesan utuh dan kit non-standar dirakit di gudang dari stok lepas (https://logistics-manual.redcross.org.uk/manual/rlu-stocks-erus/brcs-global-stocks-pre-positioning). Artinya sistem perlu dua level: SKU kit (BOM) dan SKU komponen, dengan stok kit ketersediaan yang dihitung dari komponen.

Catatan "pelacakan di lapangan": audit FEMA menunjukkan fitur ada tapi dilewati petugas; kepatuhan input (aturan sistem sebagai catatan resmi) sama pentingnya dengan fiturnya (https://www.oversight.gov/reports/audit/fema-did-not-effectively-manage-distribution-covid-19-medical-supplies-and-equipment).

---

## 3. Standar jumlah per orang/keluarga: Sphere 2018 vs IFRC vs Indonesia

Sumber utama: Sphere 2018 (PDF di atas), Perka BNPB 7/2008 (https://www.gitews.org/tsunami-kit/id/E6/sumber_lainnya/produk_hukum_nasional/peraturan_kepala_BNPB/Perka%20BNPB%207-2008_Tata%20Cara%20Pemberian%20Bantuan%20Pemenuhan%20Kebutuhan%20Dasar.pdf) dan Perka BNPB 18/2009 (https://www.bencana-kesehatan.net/images/stories/2012/1/file/PP/PP%20Kepala%20BNPB%20RI_No.18%20Tahun%202009_Pedoman%20Standarisasi%20Logistik.pdf).

| Kebutuhan | Sphere 2018 | Indonesia (Perka 7/2008, 18/2009) | Selisih |
|---|---|---|---|
| Ruang tutup per orang | minimal 3,5 m2 (4,5 m2 di iklim dingin) | 3 m2 per orang (Perka 7/2008 bab IV.A) | Indonesia lebih kecil 0,5 m2 |
| Selimut/alas tidur | minimal 1 selimut dan alas tidur (tikar, kasur, lembar) per orang; tambahan di iklim dingin; kelambu berinsektisida jika perlu | Hanya bayi/anak di bawah 2 tahun wajib selimut 100x70 cm; setiap orang "alas tidur memadai" (angka tidak ditetapkan) | Indonesia tidak menetapkan 1 selimut per orang |
| Pakaian | minimal 2 stel lengkap per orang | 1 stel; perempuan dan anak minimal 2 stel; pakaian ibadah, alas kaki | Sphere 2018 menaikkan |
| Air untuk minum, masak, higiene | minimal 15 L/orang/hari; maks 250 orang per keran | 7 L/orang/hari tiga hari pertama lalu 15 L; air minum 2,5 L/orang/hari | Selaras setelah hari ke-3; Indonesia punya tahap awal 7 L |
| Wadah air | 2 wadah per rumah tangga (10-20 L) | ember tertutup 40 L, ember terbuka 20 L, jeriken 20 L per rumah tangga | Berbeda isi |
| Sabun | 250 g mandi dan 200 g cuci per orang per bulan | sama: 250 g dan 200 g | Sama |
| Pembalut, popok | Sphere 2018: pembalut (lihat standar higiene); Sphere 2011: 12 popok cuci per anak di bawah 2 tahun | pembalut untuk perempuan menstruasi; 12 popok cuci untuk anak di bawah 2 tahun; sikat dan pasta gigi | Selaras |
| Peralatan masak | per 4-5 orang: 2 panci keluarga bertutup, 1 baskom, 1 pisau, 2 sendok sayur; per orang: piring, alat makan, gelas | per rumah tangga: 1 panci besar, 1 sedang, 1 baskom, 1 pisau, 2 centong; per orang: piring, sendok, cangkir | Hampir sama; Sphere hitung per 4-5 jiwa |
| Energi/penerangan | indikator akses energi aman untuk masak, panas, penerangan | kompor, bahan bakar, penerangan (tanpa angka) | Sphere memberi indikator hasil |
| Pangan | 2.100 kkal per orang per hari (bab Pangan) | beras 400 g per orang per hari atau setara, 2.100 kkal; Perka 18/2009 paket pangan satu jiwa sehari: beras 0,4 kg, mi instan 3 bungkus, kecap 150 ml, air minum 4 L | Selaras 2.100 kkal |

Nomor halaman Sphere 2018 PDF: ruang tutup (hal. 255, catatan panduan), barang rumah tangga (hal. 258-259), higiene (bab WASH), air (hal. kunci indikator Water Supply Standard 2.1).

Tarpaulin/terpal dan tenda per keluarga:
- IFRC: "kit tempat berlindung" terdiri alat dan pengikat plus dua terpal plastik; satu sumber ringkasan hasil pencarian (sekunder): https://www.engineeringforchange.org/solutions/product/ifrc-shelter-kit/ . Angka baku IFRC per keluarga langsung dari Katalog TIDAK KETEMU.
- Minimum yang ditulis CARE: dua lembar plastik sekitar 6x4 m atau 7x4 m plus tali polipropilen 6 mm x 40 m (sekunder): https://careemergencytoolkit.org/core-sectors/4-shelter/4-what-to-do-response-options/4-1-tarps-tents-kits
- IOM South Sudan menyebut spesifikasi plastic sheeting 4 x 6 m mengacu katalog IFRC/ICRC: https://iom.int/sites/default/files/31052016_SouthSudan_Shelter_NFI_procurement_standard_final.pdf
- Tenda keluarga UNHCR cocok untuk 5 orang dengan 3,5 m2/orang (sekunder): https://www.sheltercluster.org/sites/default/files/docs/UNHCR%20Core%20Relief%20Items%20Catalogue.pdf
- Sphere 2018 tidak (dalam teks yang saya cek) menetapkan jumlah terpal atau tenda per keluarga sebagai indikator; yang ada: luas ruang tutup per orang. Jumlah terpal per keluarga harus diturunkan: kebutuhan m2 = jumlah jiwa x 3,5, dibagi luas efektif terpal (turunan saya, bukan angka resmi).
- Indonesia: Perka 18/2009 menetapkan "paket logistik lain" (obat habis pakai, tenda gulung, tikar, matras) per Kepala Keluarga (empat jiwa). Terpal tidak disebut.

Standar penyangga (buffer stock) Indonesia, Perka 18/2009 bab II.C.1: stok kesiapsiagaan tingkat provinsi: paket pangan = 1% penduduk x 3 hari; paket sandang dan logistik lain per 1 KK; paket kematian = 1% dari jumlah paket sandang. Tabel 1 memberi contoh: NAD 3.970.612 jiwa: 119.118 paket pangan, 993 sandang, 993 logistik lain, 99 kematian. Turunan hitung saya: 119.118 sama dengan 3% penduduk; 993 sama dengan 1 per sekitar 4.000 penduduk. Cara pembulatan dasar 993 tidak dijelaskan di bagian yang saya baca. Sumber: PDF di atas.

Perka BNPB 13/2008 "Pedoman Manajemen Logistik dan Peralatan PB" ada judulnya di hasil pencarian (https://www.gitews.org/tsunami-kit/id/E6/sumber_lainnya/produk_hukum_nasional/peraturan_kepala_BNPB/Perka%20BNPB%2013-2008_Pedoman%20Manajemen%20Logistik%20dan%20Peralatan%20PB.pdf) tetapi PDF-nya tidak terbaca di alat saya; isinya TIDAK ketemu. Sama untuk artikel SCI tentang Peraturan BNPB 4/2018 (https://supplychainindonesia.com/download/SCI_-_Artikel_Sistem_Logistik_Kemanusiaan_dari_Perspektif_Peraturan_BNPB_No._4_Tahun_2018.pdf): 404 saat diambil.

Satuan paket Filipina sebagai pembanding: FFP untuk keluarga 5 orang, 3 hari: https://fo10.dswd.gov.ph/programs/disaster-response-and-management-division-drmd/relief-augmentation/

---

## 4. Indikator kinerja rantai pasok kemanusiaan baku dan rumusnya

Sumber rumus: dokumen USAID/ISCG (harmonisasi KPI WHO, UNICEF, USAID, Gates): https://www.ghsupplychain.org/sites/default/files/2019-07/5-Key%20Performance%20Indicators-2018.pdf (rumus dikutip dari teks yang saya ekstrak; bagian kesehatan, tapi bentuknya berlaku untuk logistik bantuan).

| Indikator | Rumus (dari sumber) | Target acuan dalam sumber |
|---|---|---|
| Stock accuracy (3.3) | (jumlah di kartu stok atau sistem / jumlah hasil hitung fisik) x 100. Bandingkan satuan dengan satuan; jangan dirata-rata antar produk, laporkan rentang (mis. -5% sampai +15%) | 100% (rekomendasi WHO) |
| Order fill rate (3.4) | (total kuantitas yang diterbitkan atau diterima / total kuantitas pesanan yang diterima gudang) x 100; pesanan yang "diterima" = yang disepakati gudang; lebih dari 100% bila kelebihan kirim; catat jumlah pesanan yang diubah dan alasannya | 90% pesanan terpenuhi penuh; kurang dari 10% pesanan perlu diubah |
| On-time delivery to facility (4.1) | (jumlah pesanan yang tiba dalam jendela waktu pada rencana distribusi / total pengiriman) x 100; hitung per entitas lalu rata-rata; perhatikan akhir pekan dan libur | 95% |
| Stockout rate (3.2) | (jumlah pengamatan stok komoditas tracer yang kosong pada hari kunjungan / total pengamatan komoditas tracer) x 100 | tidak ada angka di bagian yang saya baca |
| Wastage dari kerusakan, pencurian, kedaluwarsa (3.5) | kuantitas: (kuantitas tak terpakai karena hilang, rusak, kedaluwarsa / kuantitas tersedia dalam periode) x 100; versi nilai analog; data wajib nomor batch dan tanggal kedaluwarsa | total kerugian <2% perputaran; pencurian 0%; kedaluwarsa <1,5%; kerusakan 0,5% |
| Persentase pesanan darurat (4.2) | (jumlah pesanan darurat dalam periode / total pesanan dalam periode) x 100 | <10% |
| Forecast accuracy (1.1) | 1 - (|konsumsi prakiraan - konsumsi aktual| / aktual), bentuk persis terpotong di ekstraksi saya | tidak diambil |
| Vendor on-time and in-full (2.1) | adherensi pengiriman vendor ke kontrak (rumus lengkap tidak saya ekstrak) | tidak diambil |
| Inventory turnover / stock turn (3.6) | disebut ada di sumber; rumus resmi tidak saya ekstrak | tidak diambil |

Kerangka Logistics Cluster:
- DIFOT (Delivered In Full, On Time, Error-free): persentase pesanan yang diterima pada atau sebelum tanggal diminta, lengkap kuantitasnya, lengkap dokumen dan label, tanpa kerusakan kemasan. https://log.logcluster.org/print-preview-entire-book/209
- Delivery lead time: waktu antara memesan dan menerima barang atau layanan. Sumber yang sama.
- Contoh KPI lain: % barang rusak dalam angkut, % barang hilang dalam angkut, biaya rata-rata per kg atau m3, biaya per km, jumlah stock-out, jumlah baris backorder, rata-rata waktu backorder, % donasi in-kind yang punya referensi donasi. Sumber yang sama.

Appeal coverage dan donation-to-delivery lead time:
- Sumber baku dengan rumus tertulis: TIDAK KETEMU. Yang ada:
  - Pelaporan pendanaan global: porsi kebutuhan seruan yang terpenuhi, mis. 61% pada 2018: https://devinit.org/798a8d . Rumus tersirat: dana diterima / kebutuhan seruan.
  - HLS menyebut kemampuan menghasilkan "waktu dari seruan sampai pengiriman" dan rekonsiliasi kebutuhan vs terpasok, tanpa rumus: https://www.fmreview.org/?p=35213
  - Kajian literatur menyatakan pengukuran kinerja rantai pasok kemanusiaan masih bidang terbuka dengan 94 indikator terklasifikasi: https://www.doi.org/10.1108/SCM-09-2013-0349 ; kerangka Beamon dan Balcik (sumber daya, keluaran, fleksibilitas): https://www.emerald.com/insight/content/doi/10.1108/09513550810846087/full/html
- Definisi kerja yang saya usulkan (BUKAN baku, ditandai sebagai usulan): 
  - Appeal/request coverage = jumlah kebutuhan yang dipenuhi (nilai atau kuantitas) / jumlah kebutuhan yang diminta, per permintaan bantuan, per jenis barang.
  - Donation-to-delivery lead time = waktu penerimaan donasi (tercatat di gudang) sampai tanda terima penerima akhir; median dan persentil 90 per kategori.
  - Keduanya diturunkan dari data yang sudah ada di form permintaan bertahap dan mutasi.

---

## 5. Metode perencanaan stok dan kaitan dengan peramalan bencana

Model riset yang dipakai nyata:
1. CARE International (Duran, Gutierrez, Keskinocak, Interfaces 2011): program integer campuran (MIP, CPLEX) untuk memilih lokasi gudang dan membagi stok antar gudang; dari 12 calon lokasi dipilih 3 (Dubai, Panama, Kamboja); manfaat tambahan berkurang setelah 3-4 gudang; waktu respons diproyeksikan turun dari minggu ke 48-72 jam. https://econpapers.repec.org/RePEc:inm:orinte:v:41:y:2011:i:3:p:223-237 dan https://www.informs.org/News-Room/INFORMS-Releases/News-Releases/CARE-Int-l-Pre-Positions-Disaster-Relief-Using-Promising-Discipline-of-Humanitarian-Logistics
2. Rawls dan Turnquist (2010): program stokastik dua tahap untuk lokasi, kapasitas, dan alokasi stok sebelum badai, memperhitungkan ketidakpastian permintaan dan ketersediaan jaringan jalan setelah kejadian; heuristik Lagrangian L-shaped. https://ideas.repec.org/a/eee/transb/v44y2010i4p521-534.html
3. Plafon stok berbasis penerima manfaat sasaran (UNHRD: 250.000 penerima manfaat tahap awal, sekunder): https://unhrd.org/unhrd-stock-taskforce
4. Pembelian di muka dan fasilitas komoditas (WFP GCMF): pengadaan antisipatif berdasar kebutuhan agregat dan proyeksi dana; WFP melaporkan pengurangan lead time 73% (angka laporan WFP sendiri, belum diverifikasi independen); Immediate Response Account untuk pinjaman darurat. https://www.wfp.org/stories/how-world-food-programme-has-cut-its-delivery-times-more-60-percent dan https://executiveboard.wfp.org/document_download/WFP-0000115590
5. Kontrak payung pra-bencana sebagai stok virtual (FEMA, 101 kontrak TA 2022). https://www.everycrsreport.com/reports/IF12239.html
6. Standar kepadatan penduduk (Indonesia, 1% penduduk x 3 hari). Perka 18/2009 (bagian 3).
7. Eskalasi berjenjang kesiagaan: DELSA siaga kuning menyiapkan barang, merah menawarkan mobilisasi dalam 6 jam. https://ahacentre.org/wp-content/uploads/2018/01/DIGITAL-Version-FACTSHEETS-DELSA.pdf

Kaitan dengan ramalan:
- IFRC Anticipatory Pillar of the DREF: Early Action Protocol (EAP) menetapkan pemicu ramalan, tindakan dini, dan dana pra-setuju hingga lima tahun, termasuk prapenempatan stok; pemicu biasanya gabungan indikator (mis. ramalan hujan plus tinggi muka sungai). https://www.ifrc.org/anticipatory-pillar-dref
- Ambang pemicu spesifik per EAP untuk stok: TIDAK KETEMU (ada di dokumen tiap negara).
- DSWD menaikkan stok sebelum badai dan memindah ke jalur topan (bagian 1.10).
- Jepang: push-type berdasarkan perkiraan (bagian 1.11).
- Risiko berlebih: barang tak dibutuhkan menyumbat angkutan (Jepang, sekunder).

Prapenempatan musiman: tidak ketemu sumber yang menyebut istilah itu secara khusus; praktik yang tampak: DSWD mengerahkan stok menjelang musim topan lewat laporan "Preparedness for Response" berulang (bagian 1.10). Ini inferensi saya, bukan kebijakan yang tertulis.

---

## 6. Usulan 15 fitur teratas, urut manfaat

Penilaian manfaat adalah pertimbangan saya (dampak pada kecepatan respons dan akurasi data, biaya implementasi relatif, dukungan bukti dari bagian 1-5); bukan hasil pengukuran.

1. Pelacakan pengiriman (shipment) dengan ID tunggal, status, dan bukti serah-terima di penerima; alarm bila tidak ada pembaruan melebihi batas. Data: tabel mutasi/pengiriman dengan status, jadwal, penerima, tanda terima/foto. https://rita-manual.logcluster.org/en/node/297 ; https://www.oversight.gov/reports/audit/fema-mismanaged-commodity-distribution-process-response-hurricanes-irma-and-maria
2. Batch/lot dan kedaluwarsa dengan FEFO, peringatan mendekati kedaluwarsa, karantina rusak. Data: nomor batch, tanggal kedaluwarsa per baris stok dan mutasi. https://log.logcluster.org/en/node/133 ; https://untalent.org/jobs/logistics-officer-p3-commodity-tracking-and-accounting-rbc-yemen-sanaa
3. Dasbor KPI baku: stock accuracy, order fill rate, on-time delivery, stockout, wastage, % pesanan darurat (rumus bagian 4). Data: hasil stok opname (sistem vs fisik), permintaan vs terpenuhi, tanggal jadwal vs tiba. https://www.ghsupplychain.org/sites/default/files/2019-07/5-Key%20Performance%20Indicators-2018.pdf
4. Katalog barang standar dengan kode tetap, spesifikasi, dan kit/BOM (komponen dan stok kit dihitung dari komponen). Data: master barang, hierarki kit-komponen, spesifikasi. https://itemscatalogue.redcross.int/introduction-acknowledgements.aspx ; https://logistics-manual.redcross.org.uk/manual/rlu-stocks-erus/brcs-global-stocks-pre-positioning
5. Target stok penyangga otomatis dari standar (Perka 18/2009: 1% penduduk x 3 hari, per KK) dan Sphere, dibandingkan stok nyata per provinsi/kabupaten. Data: penduduk BPS per wilayah, daftar paket baku, stok. Perka 18/2009 (bagian 3); Sphere 2018.
6. Lead time terukur per rute dan moda (pesan sampai terima; kirim sampai tiba) dari data mutasi, dipakai di analisa kebutuhan dan rute. Data: cap waktu tiap status pengiriman. https://log.logcluster.org/print-preview-entire-book/209
7. Pemicu prapenempatan berbasis ramalan (siaga kuning/merah, ramalan cuaca, status gunung api) yang menghasilkan daftar tindakan mutasi stok. Data: status siaga per wilayah, ramalan, aturan pemicu per bahaya. https://ahacentre.org/wp-content/uploads/2018/01/DIGITAL-Version-FACTSHEETS-DELSA.pdf ; https://www.ifrc.org/anticipatory-pillar-dref
8. Paket barang default per jenis bahaya (banjir, gempa, erupsi, karhutla) untuk permintaan pertama dan dorong (push) barang. Data: komposisi paket per bahaya dari kejadian lalu. https://ahacentre.org/wp-content/uploads/2018/01/DIGITAL-Version-FACTSHEETS-DELSA.pdf ; https://www.bousai.go.jp/taisaku/hisaisyagyousei/push.html
9. Penilaian kapasitas gudang dan simpul (luas, rak, bongkar muat, daya, akses, kondisi) sebagai LCA mini, diperbarui berkala. Data: formulir penilaian per gudang/pelabuhan/bandara. https://dlca.logcluster.org/rlca ; https://dlca.logcluster.org/about
10. Kapasitas transport sebagai data (armada, kapasitas kg/m3, moda, tarif, ketersediaan) dan perutean multi-stop. Data: daftar penyedia angkut dan kendaraan. https://rita-manual.logcluster.org/en/node/297 ; https://dlca.logcluster.org/about
11. Pelacakan donasi/donor dan donasi in-kind: asal, jenis, status triase, terkait ke permintaan; metrik donation-to-delivery. Data: tabel donasi masuk, donor, tujuan. https://www.fmreview.org/?p=35213 ; https://www.paho.org/en/topics/health-emergencies-and-disaster-response/lss-system
12. Laporan pengecualian otomatis: selisih opname di atas ambang, stok tanpa batch, pengiriman macet, stok di bawah standar minimal, kedaluwarsa dalam 90 hari. Data: ambang per barang. https://www.wfp.org/audit-reports/internal-audit-less-functionalities-and-application-controls-february-2021 ; https://www.oversight.gov/reports/audit/fema-did-not-effectively-manage-distribution-covid-19-medical-supplies-and-equipment
13. Peringkat kinerja pemasok dan penyedia angkut (ketepatan waktu, kelengkapan, kerusakan) dari data pengiriman. Data: pengiriman per vendor dengan hasil. https://www.fmreview.org/?p=35213
14. Rantai dingin untuk barang medis/vaksin: log suhu, lonjakan suhu, status alarm. Data: pembacaan suhu (manual atau datalogger) per unit pendingin. https://log.logcluster.org/en/node/133 ; https://logistics-manual.redcross.org.uk/wp-content/uploads/sites/5/2021/07/Managing-the-warehouse.pdf
15. Model alokasi stok: pemilihan gudang terbaik melayani tiap kabupaten berdasar jarak/waktu tempuh dan skenario bahaya (sekarang sebagai peringkat sederhana, optimasi lanjut belakangan). Data: matriks waktu tempuh dari jaringan rute yang sudah ada, skenario bahaya. https://econpapers.repec.org/RePEc:inm:orinte:v:41:y:2011:i:3:p:223-237 ; https://ideas.repec.org/a/eee/transb/v44y2010i4p521-534.html

---

## 7. Daftar URL tidak ketemu / perlu tindak lanjut pemilik
- Teks Perka BNPB 13/2008 dan Peraturan BNPB 4/2018: tidak terbaca di alat; ambil dari JDIH BNPB.
- Status berlaku Perka 18/2009 dan 7/2008: verifikasi di JDIH BNPB.
- Katalog IFRC: isi kit keluarga langsung dari https://itemscatalogue.redcross.int/ (angka tidak saya dapat dari sumber primer).
- Plafon stok UNHRD dan SOP UNHRD 2022.
- Dokumen strategi stok IFRC "Building a stock strategy" (PDF tidak terunduh).
- Aturan penyangga DSWD resmi (Disaster Response Operations Guidelines).
- Daftar stok nasional Jepang.
- Rumus resmi appeal coverage dan donation-to-delivery lead time.
