# Riset sistem Indonesia untuk inventori logistik, peralatan bencana, dan aset negara

Disusun 9 November 2026. Pelengkap `data/kajian-bnpb/kedeputian/riset/4-logistik.md` (INALOGPAL dan WMS tidak diulang). Semua klaim punya URL; yang tidak ketemu ditulis "tidak ketemu". Tidak ada halaman login yang dibuka dan tidak ada alamat API yang ditebak. Salinan unduhan kerja ada di folder kerja lokal.

Tanda: **[fakta]** = terbaca di sumbernya; **[dugaan]** = simpulan saya; **[tidak ketemu]**.

## 0. Ringkasan

1. **Juklak standar minimal SUDAH ditetapkan.** Nama dokumennya "Petunjuk Pelaksanaan BNPB Nomor 1 Tahun 2024 tentang Standar Minimal Kebutuhan Logistik dan Peralatan". Bukti: dirujuk Keputusan Bupati Bantul 643/2025 (29 Sep 2025) dan Berita Acara Rakornas 18 Maret 2025. Teks resminya tidak ketemu di web, jadi kami belum bisa mengutip pasalnya. Jawaban Q8 di 4-logistik.md: ada, tapi tekstnya harus diminta ke Dit Pengelolaan. Lihat bagian 4.
2. **Gudang BNPB**: rencana resmi (Renas PB 2025-2029) menyebut 7 gudang regional (Padang, Surabaya, Banjarmasin/IKN, Gorontalo, Kupang, Ambon, Manokwari), gudang nasional di Sentul, dan 10 gudang taktikal (7 lokasi disebut). Alamat jalan tidak ketemu. Lihat bagian 3.
3. **Sumber harga satuan**: tidak ketemu daftar harga barang logistik bencana yang terbuka. E-Katalog (INAPROC) menyimpan harga tetapi hanya sebagai plafon dan tidak ada API publik yang tertulis. Lihat bagian 5.
4. **Tidak ada API resmi yang terdokumentasi** untuk SIMAN v2, SAKTI, SIMDA BMD, e-BMD, InaRISK (hanya layanan ArcGIS REST yang disebut di materi kuliah BNPB), DIBI, Magma. Cara sambung realistis: ekspor berkas dari pengguna yang berhak, bukan integrasi mesin ke mesin. Lihat bagian 6.
5. **Dua kelemahan terdokumentasi di dokumen resmi**, bukan sekadar anggapan: Renas PB 2025-2029 sendiri menulis bahwa regulasi standar logistik daerah "sudah tidak relevan" dan "belum tersedianya sistem informasi logistik dan peralatan yang dimutakhirkan". Lihat bagian 7.

## 1. Sistem aset negara dan daerah

| Sistem | Pemilik | Isi yang terbukti | Ekspor / API | Sumber |
|---|---|---|---|---|
| SIMAN v2 | DJKN, Kemenkeu | Pengelolaan BMN dari perencanaan, penggunaan, pemanfaatan, sampai penghapusan. ID aset unik, peran pengguna, atribut aset ikut saat mutasi antarsatker, asuransi BMN otomatis, dasbor, modul pengawasan. Sejak 1 Agustus 2024 seluruh pengelolaan BMN lewat SIMAN v2. Data tunggal (single entry point, single database) | Interkoneksi dengan SAKTI "realtime dan incremental". API dan format ekspor **tidak disebut** di artikel publik **[tidak ketemu]** | https://www.djkn.kemenkeu.go.id/kpknl-jayapura/baca-artikel/17430/Jaga-Aset-Negara-Aplikasi-SIMAN-Versi-2-sebagai-Pengembangan-Sistem-Pengelolaan-Barang-Milik-Negara.html ; Renstra DJKN: https://www.djkn.kemenkeu.go.id/unit_kerja/openpdf/6946/Rencana-Strategis-Direktorat-Jenderal-Kekayaan-Negara-Tahun-2025-2029.html |
| SAKTI | DJPb, Kemenkeu | Modul Persediaan (penatausahaan, akuntansi, pelaporan barang persediaan) dan Modul Aset Tetap (aset tetap dan tak berwujud, jurnal, penyusutan; keluaran: Laporan BMN, Laporan Kondisi Barang, Laporan Penyusutan). Kode barang wajib benar di modul Komitmen, Bendahara, Persediaan, Aset Tetap | Tidak ada dokumentasi API publik **[tidak ketemu]**. Catatan teknis: kondisi barang di SIMAN mengikuti SAKTI pada H+1; merk/tipe yang diubah belakangan di SAKTI tidak terbawa ke SIMAN | https://djpb.kemenkeu.go.id/kppn/jakarta2/id/sakti/mengenal-sakti/modul-sakti-3.html ; PMK 171/2021 https://jdih.kemenkeu.go.id/download/d394dfe3-23c7-408c-aee0-b3c6ab0542a6/PMK 171 2021.pdf ; https://halodjkn.kemenkeu.go.id/id/kb/articles/pdf/data-siman-dengan-sakti-berbeda-terdapat-perbedaan-data-siman-dengan-sakti |
| SIMDA BMD | BPKP | Aplikasi desktop (versi 2.0.7.11 dalam satu evaluasi) untuk BMD: menu data entry perencanaan, pengadaan, penggunaan dan seterusnya; sebagian input pengadaan manual, pembentukan KIB tidak otomatis. Dipakai pemda luas, ada temuan BPK soal kelemahan penyusunan LK | Desktop, basis data lokal per pemda; ekspor/API tidak terdokumentasi **[tidak ketemu]** | https://ejournal.uncen.ac.id/index.php/KEUDA/article/view/1884 ; temuan BPK: https://berkas.dpr.go.id/pa3kn/referensi-apbn/public-file/ringkasan-telaahan-public-106.pdf |
| e-BMD | Ditjen Bina Keuda, Kemendagri | Aplikasi BMD yang disiapkan untuk terintegrasi dengan SIPD-RI, sesuai Permendagri 47/2021. Februari 2024 akun diserahkan ke lima pemda; Juni 2024 sekitar 33 daerah sedang proses memakai | Fitur, kolom, API **tidak ketemu**. Modul BMD khusus di dalam SIPD-RI juga tidak ketemu; yang ditemukan hanya pernyataan "terintegrasi dengan SIPD RI" | https://news.republika.co.id/berita/s9bw3j430/tata-kelola-bmd-unsur-penting-dukung-penyelenggaraan-pemerintahan ; https://mojokertokab.go.id/detail-berita/tingkatkan-kualitas-pengelolaan-barang-milik-daerah-pemkab-mojokerto-gelar-sosialisasi-penerapan-aplikasi-e-bmd-1718029480 |
| Kartu Inventaris Barang (KIB) | Permendagri 47/2021 | Pembagian KIB A tanah, B mesin dan peralatan, C gedung dan bangunan, D jalan irigasi jaringan, E aset tetap lainnya, F konstruksi dalam pengerjaan. KIB B adalah yang memuat tenda, genset, perahu, kendaraan BPBD. Kolom lazim: kode barang, nama, nomor register, merek/tipe, ukuran, bahan, tahun, asal-usul, harga | Lampiran resmi yang memuat kolom lengkap ada di https://peraturan.go.id/files/bn1076-2021.pdf (belum saya urai) | https://pasal.id/peraturan/permen/permendagri-no-47-tahun-2021 |

Implikasi untuk sistem kami **[dugaan]**:
- Peralatan BPBD adalah BMD (KIB B) yang dicatat di SIMDA BMD/e-BMD, dan peralatan BNPB adalah BMN yang dicatat di SAKTI/SIMAN. Persediaan habis pakai (selimut, paket makanan) masuk Modul Persediaan SAKTI untuk BNPB dan akun persediaan pemda untuk BPBD. Artinya angka "berapa tenda dan genset" sudah ada di buku aset resmi, hanya tidak terbuka. Kami tidak perlu membuat buku aset baru; cukup tabel "stok dan kondisi siap-pakai" yang merujuk kode barang aset.
- Pakai kode barang BMN/BMD sebagai kunci (bukan nama bebas) agar angka kami bisa dicocokkan ke SAKTI/SIMAN/e-BMD. Kode barang yang salah adalah sumber masalah yang diakui DJPb (https://djpb.kemenkeu.go.id/kppn/gunungsitoli/id/data-publikasi/artikel/2964-catat-bmn-dengan-sakti,-namun-masih-ada-ketidaksesuaian-kode-bmn-persediaan.html).

## 2. Sistem kebencanaan lain

| Sistem | Pemilik | Yang terbukti | Akses data | Status |
|---|---|---|---|---|
| SIMOLEK | tidak jelas | Tidak ada sumber yang menyebut SIMOLEK sebagai sistem BNPB | - | **[tidak ketemu]** |
| InaRISK | BNPB | Portal hasil kajian risiko di atas ArcGIS Server; layanan "GIS Service" untuk analisis lanjut; layer berawalan INDEKS untuk analisis. Contoh jalur (dari materi kuliah tamu BNPB, bukan dokumentasi API): `https://inarisk.bnpb.go.id:6443/arcgis/rest/services/inaRISK/INDEKS_BAHAYA_BANJIR/ImageServer` | Data dapat diunduh menurut materi; syarat pakai dan batas laju **tidak ketemu**. Jangan ditebak, minta konfirmasi BNPB | https://www.its.ac.id/tgeofisika/wp-content/uploads/sites/33/2024/03/Materi-Kuliah-Tamu-Teknik-Geofisika-ITS_Pengenalan-inaRISK_23Maret2024.pdf ; https://www.its.ac.id/tgeofisika/wp-content/uploads/sites/33/2022/09/Materi-Guest-Lecture-Teknik-Geofisika-ITS_Pengenalan-inaRISK_30-September2022.pdf |
| DIBI / Satu Data Bencana Indonesia | BNPB (walidata) dengan BPS | Data kejadian dan dampak; standar data kejadian dan dampak diatur Juklak BNPB. Antarmuka lewat gis.bnpb.go.id/dibi | Tidak ada API atau kolom unduh yang terdokumentasi **[tidak ketemu]**; repo kami sudah memegang `dibi_kab_tahun.json` | https://indonesia.unfpa.org/sites/default/files/pub-pdf/juklak_standar_data_kejadian_dan_dampak_bencana.pdf |
| MAGMA Indonesia | PVMBG, Badan Geologi | Status gunung api level I-IV, rekomendasi, KRB, VONA, gempa M>5 | API tidak ketemu | https://nu.or.id/nasional/cek-gunung-api-dan-kebencanaan-download-aplikasi-magma-indonesia-TXCYW |
| SIKS-NG | Pusdatin Kemensos | Basis data kesejahteraan sosial untuk DTSEN dan bansos; bukan sistem stok logistik | Tidak terbuka. Tidak ada kaitan terbukti dengan stok gudang | https://www.menpan.go.id/site/berita-terkini/inovasi-siks-ng-sajikan-data-bansos-terintegrasi |
| "SIBAGANA" | - | Nama itu tidak ketemu di sumber mana pun | - | **[tidak ketemu]** |
| Dasbor GIS manajemen bencana Kemensos | Kemensos | Diluncurkan 2017: logistik, personel Tagana, kendaraan, prakiraan cuaca, peta risiko, pelacakan relawan di satu dasbor. Nama aplikasi dan URL tidak disebut; apakah masih dipakai tidak diketahui | Tidak terbuka | https://www.suarasurabaya.net/?p=302436 |
| Lumbung Sosial | Kemensos | Gudang cadangan di titik rawan. Angka berbeda per sumber dan tahun: 532 lumbung di 28 provinsi dan 159 kab/kota (2023), 664 lumbung di 31 provinsi (Metro TV, tanpa tanggal jelas), dokumen Pusdatin lama menyebut 581 lumbung KSB. Renas PB menargetkan 1.091 unit pada 2029 dari 668 pada 2024 | Tidak ada daftar terbuka dengan koordinat **[tidak ketemu]** | https://wartaekonomi.co.id/read513341/penuhi-kebutuhan-warga-terdampak-bencana-kemensos-targetkan-bangun-110-lumbung-sosial-tahun-ini ; https://www.metrotvnews.com/read/NxGCP2wZ-kemensos-siapkan-cadangan-logistik-rp19-miliar-untuk-bencana-sumatra |
| Gudang logistik Kemensos | Kemensos | Gudang pusat Bekasi, gudang regional Palembang dan Makassar, Sentra Efata Kupang, Gudang Dinsos Prov NTT sebagai cadangan | Daftar lengkap dan stok **tidak ketemu** | https://kemensos.go.id/en/observation-of-the-east-regional-logistics-warehouse-in-makassar ; https://rmol.id/nusantara/read/2025/12/06/689254/kemensos-kebut-distribusi-bantuan-di-sumbar |
| Tagana | Kemensos | Sekitar 26.000 personel, insentif Rp250.000 per bulan (April 2026). Sistem pendataan nasional tidak ketemu | Tidak terbuka | https://jogja.antaranews.com/berita/823415/kemensos-kaji-peningkatan-insentif-26000-personel-tagana |
| e-Katalog / Katalog Elektronik INAPROC | LKPP | Katalog produk dan harga penyedia; e-Katalog v6 efektif 1 Januari 2025. Halaman utama publik memuat kategori produk (UMKK, TKDN, konsolidasi, OAP). Dasbor data terbuka di data.inaproc.id hanya RUP (rencana dan realisasi pengadaan) | Tidak ada API publik tertulis. Dasbor data tidak memuat harga barang | https://katalog.inaproc.id ; https://data.inaproc.id |

## 3. Dokumen perencanaan dan lokasi gudang

### 3.1 Renas PB 2025-2029 (Peraturan BNPB 1/2025) mengikat rencana gudang
Sumber: https://peraturan.bpk.go.id/Download/372749/peraturan-bnpb-no-1-tahun-2025.pdf (126 halaman, dibaca penuh bagian matriks). Ini dokumen yang paling kuat untuk logistik. **[fakta]**

| Program | Indikator dan target 2029 | Lokasi disebut | Pagu indikatif |
|---|---|---|---|
| 1.3.1 Pemenuhan logistik dan peralatan kesiapsiagaan (sasaran: cadangan logistik prioritas 72 jam pertama) | Pemenuhan logistik 75%, peralatan 75%, sumber daya distribusi 75% | Daerah lokus prioritas Renas yang punya gudang logistik daerah dan belum pernah menerima bantuan logistik dan peralatan | logistik Rp18.614,66 miliar; peralatan Rp6.387,69 miliar; distribusi Rp3.350,64 miliar |
| 1.3.1.e Logistik bantuan sosial (Kemensos) | 776.256 orang pada baseline, target 100% | Nasional | Rp16.480,77 miliar |
| 1.3.2.a Gudang taktikal | 10 gudang taktikal, pemenuhan sarana 5% | Kab. Kepulauan Mentawai, Simeulue, Natuna, Kepulauan Sangihe, Kepulauan Aru, Puncak, Rote Ndao (7 disebut dari 10) | Rp9.950 miliar |
| 1.3.2.b Gudang regional | 7 gudang regional, pemenuhan 5% | **Padang, Surabaya, Banjarmasin/IKN, Gorontalo, Kupang, Ambon, Manokwari** | Rp13.850 miliar |
| 1.3.2.c Gudang nasional | Sarana dan prasarana 100%, logistik dan peralatan 1% | **Pusat/Nasional (Sentul)** | Rp221,55 miliar |
| 1.3.2.d Lumbung sosial (Kemensos) | 668 (2024) menjadi 1.091 unit | Daerah lokus prioritas | Rp105,75 miliar |
| 1.3.3.a Klaster logistik | 29 menjadi 44 klaster nasional/provinsi/khusus | Daerah lokus yang belum punya klaster | Rp1,95 miliar |
| 1.3.3.b Sistem informasi logistik untuk kolaborasi multi-aktor | 1 sistem/modul | Nasional | Rp5 miliar |
| 1.3.3.c Sistem informasi pergudangan dan manajemen logistik peralatan | 1 sistem/modul | Nasional | Rp5 miliar |

Dua temuan kunci Renas: (a) 1.3.3.b dan 1.3.3.c adalah **sasaran resmi** untuk sistem informasi logistik dan sistem pergudangan, dengan pagu kecil (Rp5 miliar masing-masing). Sistem baru kami cocok sebagai isi sasaran itu atau pelengkap, dan itu argumen anggaran. (b) Diagnosa dokumen: "regulasi manajemen standar logistik dan peralatan penanggulangan bencana untuk pemerintah daerah sudah tidak relevan" dan "belum tersedianya sistem informasi logistik dan peralatannya yang dimutakhirkan untuk semua tahapan" (Bab permasalahan, hal. 26-27).

Catatan: lokasi gudang regional di Renas (Padang, Surabaya, Banjarmasin/IKN, Gorontalo, Kupang, Ambon, Manokwari) hampir sama dengan rencana 2021, bedanya Kalimantan Selatan sekarang "Banjarmasin/IKN". Berita 2021: https://ambon.antaranews.com/berita/109213/bnpb-bangun-gudang-logistik-di-tujuh-daerah-begini-penjelasannya (Padang sudah terbangun sebagai satu balai besar; BNPB tidak bisa membeli tanah, pemprov diminta menghibahkan lahan). Republika 9 Sep 2021 menyebut UPT Padang dialihkan menjadi Balai Besar Logistik dan Peralatan BNPB: https://news.republika.co.id/berita/qz5szu430/balai-besar-logistik-dan-peralatan-bnpb-untungkan-sumbar .

### 3.2 Daftar lokasi gudang yang ditemukan

| Gudang | Status | Alamat | Sumber |
|---|---|---|---|
| Balai Besar Logistik dan Peralatan BNPB, Padang (Sumbar) | Ada, melayani Sumatra. Dashboard stok terbuka di INALOGPAL (gudang_bnpb_sumbar) | **[tidak ketemu alamat jalan]** | Republika di atas; https://inalogpal.bnpb.go.id/gudang_bnpb_sumbar |
| Gudang Logistik BNPB Jatiasih, Bekasi | Ada. Dipakai menampung 600 jiwa saat banjir Maret 2025 | Hanya "Jatiasih, Bekasi", alamat lengkap **[tidak ketemu]**. Satu media menyebutnya kantor logistik BPBD Kota Bekasi, perlu dikonfirmasi | https://www.idxchannel.com/news/bekasi-diterjang-banjir-600-warga-mengungsi-ke-gudang-logistik-bnpb/all |
| Gudang nasional Sentul (Bogor) | Rencana Renas (1.3.2.c) | **[tidak ketemu]** | Renas PB di atas |
| Gudang regional x7 (Surabaya, Banjarmasin/IKN, Gorontalo, Kupang, Ambon, Manokwari; Padang sudah) | Rencana | belum ada lahan/alamat | Renas PB |
| Gudang taktikal x10 (7 lokasi disebut: Mentawai, Simeulue, Natuna, Sangihe, Aru, Puncak, Rote Ndao) | Rencana | - | Renas PB |
| Usulan penyangga Jabar dari kajian akademik (bukan resmi): Bekasi, Cimahi, Cirebon, Bogor, Tasikmalaya, Sukabumi | Kajian | - | https://openlibrarypublications.telkomuniversity.ac.id/index.php/engineering/article/download/24046/23042 (tersimpan lokal, PDF terkompresi, isi tidak terbaca saya; hanya judul bahasan dikutip dari mesin pencari) |

Daftar UPT BNPB beserta alamat **tidak ketemu**. Yang ada hanya dasar hukum UPT (Perban 6/2025 Pasal 128, sudah di 4-logistik.md) dan dasbor Sumbar.

Arahan Presiden dan Kepala BNPB (26 Agustus 2026, Nagekeo NTT): usulan gudang logistik di tiap kab/kota, Presiden meminta konsep dihitung skala nasional. Gudang BPBD yang kosong menjadi kendala gempa NTT. Sumber: https://rri.co.id/en/national/2681326/regional-disaster-logistics-warehouses-seen-as-key-to-faster-community-aid . (Nama pejabat sesuai berita; saya tidak memverifikasinya.)

Anggaran: efisiensi Februari 2025 memangkas bantuan peralatan dan sarana BNPB ke daerah dari Rp370 miliar menjadi sekitar Rp45 miliar (laporan Metro TV): https://www.metrotvnews.com/read/bD2CMoqZ-efisiensi-anggaran-bnpb-kurangi-alokasi-pengadaan-alat-di-daerah

### 3.3 RPJMN 2025-2029
Perpres 12/2025 (10 Februari 2025) ada. Target gudang atau logistik di lampiran matriks K/L tidak sempat saya baca; nilai tertinggi ada di Renas dan Renstra. Sumber: https://peraturan.bpk.go.id/Details/314638 ; matriks: https://jdih.kemenkoinfra.go.id/cfind/source/files/perpres/2025/perpres-nomor-12-tahun-2025/lampiran-i-perpres-nomor-12-tahun-2025.pdf . Renstra BNPB (Perban 5/2025): https://peraturan.go.id/filespengundangan/peraturan-bnpb-no-5-tahun-2025.pdf ; isi logistiknya sudah diringkas di 4-logistik.md.

## 4. SPM Sub Urusan Bencana dan status Juklak

### 4.1 Status Juklak standar minimal kebutuhan logistik dan peralatan
- **Ada dan sudah dipakai daerah.** "Petunjuk Pelaksanaan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2024 tentang Standar Minimal Kebutuhan Logistik dan Peralatan". Dirujuk sebagai "Memperhatikan" di Keputusan Bupati Bantul 643/2025: https://jdih.bantulkab.go.id/resource/doc/public/produk_hukum/2025/keputusan-bupati-2025-643.pdf . Dirujuk di Berita Acara Kesepakatan Bersama Sidang Komisi Tata Kelola, 18 Maret 2025: https://ppid.kukarkab.go.id/download/berkala/3557 , butir 6.a: "Mengimplementasikan Petunjuk Pelaksanaan Nomor 1 Tahun 2024 ... dengan didukung Surat Edaran dari Kementerian Dalam Negeri". Kota Yogyakarta juga menetapkan Keputusan Wali Kota 405/2025 (berkas terpindai, isi tidak terbaca): https://bpbd.jogjakota.go.id/download/hit/24076/keputusan-walikota-no-405-24076.pdf . **[fakta]**
- **Dasar hukum induk**: Perban 4/2018 Pasal 5 ayat (1) dan (4): perencanaan menghasilkan standar minimal kebutuhan dan "diatur dengan Petunjuk Pelaksanaan" (https://peraturan.go.id/files/bn828-2018.pdf). Status Perban 4/2018: masih dijadikan dasar oleh Bantul pada September 2025, jadi masih berlaku **[fakta]**.
- **Teks resmi Juklak 1/2024 tidak ketemu** di JDIH BNPB lewat pencarian. Jangan tertukar: JDIH BNPB memuat "Juknis Nomor 1 Tahun 2024" yang berisi hal lain (bantuan petani gagal panen akibat banjir) dan "Peraturan BNPB 1/2024" tentang dana bersama. Nomor dan tanggal penetapan Juklak 1/2024 belum bisa dipastikan **[tidak ketemu]**.
- **Metode yang bisa dibaca dari lampiran Bantul** (model penerapan Juklak) **[fakta lampiran, tafsir metode dugaan]**: jumlah minimal = service level x rata-rata jumlah kejadian 5 tahun terakhir x faktor. Service level 10% untuk Bantul. Logistik dihitung per paket, contoh: paket makanan siap saji = SL x rerata kejadian x 3 hari x 4 orang per KK = 1.951 paket; selimut dan matras = SL x rerata kejadian x 4 = 650; paket sembako, terpal, sandang, kebersihan = SL x rerata kejadian = 163; paket balita dan sekolah memakai persentase penduduk usia 0-4 dan 5-14 terhadap KK. Peralatan umum: tenda = SL x rerata kejadian / 24 = 7 unit; kendaraan = SL x jumlah kapanewon (kecamatan) = 2 unit; velbed = jumlah tenda pengungsi x 24; genset dan light tower = jumlah tenda / 6. Peralatan spesifik dihitung per jenis bencana. Pemenuhan: logistik dalam 1 tahun, peralatan dalam 5 tahun, hitung ulang tiap 1 dan 5 tahun, anggaran dari APBD.
- Pernyataan pejabat BNPB November 2024: standar harus dipenuhi dan diperbarui tiap lima tahun, kepala daerah menandatangani kesepakatan service level (dari ringkasan mesin pencari; halaman Kalteng tidak bisa saya buka karena sertifikat). Tautan: https://bpbpk.kalteng.go.id/home/single/BPBPK-Prov.-Kalteng-Ikuti-Rapat-Standar-Minimal-Kebutuhan-Logistik-dan-Peralatan-Secara-Virtual

**Dampak ke usulan P1 di 4-logistik.md**: rumus JP x PR x H (Perka 23/2014) tetap berlaku sebagai persediaan 72 jam, tetapi standar minimal terbaru yang dipakai daerah berbasis **rata-rata kejadian 5 tahun x service level**. Itu cocok dengan data DIBI kami. P1 sebaiknya menghitung kedua cara dan menunjukkan selisihnya. Perka 23/2014 sudah dikonfirmasi bunyinya (judul "Standarisasi Logistik Penanggulangan Bencana", BN 2014 No. 2080: https://peraturan.go.id/files/bn2080-2014.pdf). Catatan: situs pasal.id memberi label berkas yang sama sebagai "Perban 18/2014", itu salah label.

Catatan lanjutan: Renas PB menyebut "regulasi manajemen standar logistik dan peralatan ... untuk pemerintah daerah sudah tidak relevan", jadi Juklak 1/2024 mungkin belum ditegakkan secara luas; BNPB sendiri masih mendorong implementasinya lewat Surat Edaran Kemendagri yang **belum ketemu** (nomor dan tanggal tidak disebut).

### 4.2 SPM Permendagri 101/2018 dan 59/2021
- Permendagri 101/2018 (BN 2018 No. 1541) memuat standar teknis SPM sub urusan bencana kab/kota. Pasal 3: tiga jenis pelayanan dasar: informasi rawan bencana; pencegahan dan kesiapsiagaan; penyelamatan dan evakuasi korban. Pasal 4 ayat (2) huruf f: "penyediaan peralatan perlindungan dan kesiapsiagaan terhadap bencana". Pasal 4 ayat (3) huruf e: "pemenuhan kebutuhan dasar korban bencana", dilaksanakan menurut peraturan lain (artinya logistik darurat tidak diatur angka di sini). Indikator peralatan: persentase warga negara di kawasan rawan yang mendapat peralatan perlindungan, target 100% selama satu tahun; komponen biaya a*b, penanggung jawab BPBD atau perangkat daerah. Sumber: https://peraturan.go.id/files/bn1541-2018.pdf . **[fakta]**
- Permendagri 59/2021 mengganti Permendagri 100/2018 (penerapan SPM), dan Lampiran B memuat sub urusan bencana: https://pasal.id/peraturan/permen/permendagri-no-59-tahun-2021 ; https://spm.bangda.kemendagri.go.id/2021/uploads/PMDN59.pdf (portal Bangda gagal verifikasi sertifikat, tidak dibuka). Status 101/2018 setelah 59/2021: dalam sumber, 101/2018 berjalan berdampingan **[dugaan]**.
- Permendagri 18/2025 mengatur ulang kelembagaan BPBD (Kepala BPBD sebagai kepala perangkat daerah): https://peraturan.bpk.go.id/Download/403881/Permendagri%20No.%2018%20Tahun%202025.pdf (disebut saja, tidak dibaca).
- Advokasi memasukkan bidang rehabilitasi-rekonstruksi ke SPM disebut di Berita Acara 18 Maret 2025: https://ppid.kukarkab.go.id/download/berkala/3557 .
- Contoh Perbup SPM yang menerapkan: Kutai Kartanegara Perbup 22/2025 (mutu pelayanan SPM bencana): https://ppid.kukarkab.go.id/uploads/setiapsaat/1748414407.pdf

## 5. Sumber harga satuan (jawaban ringkas: tidak ada yang sudah jadi)

| Sumber | Yang terbukti | Cocok sebagai harga satuan? |
|---|---|---|
| E-Katalog / Katalog Elektronik INAPROC | Harga di katalog adalah plafon (harga tertinggi) yang bisa dinegosiasi; hasil negosiasi jadi harga final. Katalog boleh jadi dasar penganggaran. Kategori tenda, terpal, selimut, paket pangan: **tidak ketemu terindeks**; harus dicari manual lewat "Temukan Produk". Tidak ada API publik tertulis | Ya sebagai acuan batas atas, dengan catatan harga plafon. Pengambilan massal otomatis jangan dilakukan sebelum ada izin. https://katalog.inaproc.id ; keterangan plafon: https://biropbj.kaltimprov.go.id/storage/file/Panduan Praktis Katalog Elektronik V6 - Penyedia.pdf |
| Dasbor INAPROC data (RUP) | Rencana dan realisasi pengadaan per instansi; BNPB atau BPBD bisa dilihat rencana pengadaannya. Tidak memuat harga per barang | Tidak (hanya nilai paket). https://data.inaproc.id |
| PMK SBM (32/2025 untuk TA 2026; 54/2026 untuk TA 2027) | Standar biaya perjalanan, honor, rapat dan sejenisnya. Tidak tampak memuat barang logistik bencana | Tidak. https://jdih.kemenkoinfra.go.id/pmk-322025-standar-biaya-masukan-tahun-anggaran-2026 |
| Standar Harga Satuan Regional (Perpres 72/2025) | Honorarium, perjalanan dinas, rapat, kendaraan dinas, pemeliharaan; tidak tampak barang logistik bencana | Tidak |
| Lampiran Keputusan Bupati Bantul 643/2025 | Jumlah barang, tanpa harga | Hanya untuk kuantitas |
| Renas PB 2025-2029 | Pagu per program (mis. logistik Rp18.614,66 miliar), bukan per barang | Hanya untuk skala |
| Data kasus Kemensos | Nilai agregat: Palembang Rp2.048.621.600 untuk satu paket cadangan; Rp19,09 miliar cadangan logistik Sumatra | Tidak bisa dipecah ke harga satuan |
| Harga satuan tersendiri BNPB (paket logistik DSP, family kit, kidsware) | Pencarian tidak menemukan | **[tidak ketemu]** |

Jalan keluar yang aman: (1) minta ke Dit Pengelolaan tabel HPS pengadaan 2 tahun terakhir (data internal BNPB yang sah dipakai); (2) isi kolom harga dengan "plafon e-katalog" yang ditandai sumber dan tanggal ambil, dimasukkan sekali oleh orang, bukan scraping; (3) rujuk KIB B pemda yang mencatat harga perolehan aset per kode barang.

## 6. Sistem yang harus disambung, dan caranya

| Sistem | Alasan | Cara sambung yang realistis | Syarat |
|---|---|---|---|
| INALOGPAL (sudah di 4-logistik.md) | Sistem resmi BNPB; WMS belum aktif | Baca Api yang terbuka sekali sehari dengan atribusi, setelah izin pemilik (Q1) | Izin tertulis Dit Optimasi Jaringan |
| SAKTI dan SIMAN v2 | Sumber kebenaran BMN dan persediaan BNPB | **Ekspor laporan oleh operator yang berhak** (Laporan BMN, Laporan Kondisi Barang, Laporan Persediaan) lalu impor berkas ke sistem kami dengan pencocokan kode barang. Tidak ada API terdokumentasi | Satker BNPB yang menarik laporan; bukan integrasi langsung |
| SIMDA BMD / e-BMD / SIPD-RI | Sumber kebenaran peralatan dan persediaan BPBD | BPBD mengekspor KIB B (peralatan) dan daftar persediaan; impor berkas. Tidak ada API terdokumentasi. Format KIB mengikuti lampiran Permendagri 47/2021 | Persetujuan BPBD; kode barang BMD |
| Katalog Elektronik INAPROC | Plafon harga satuan | Input manual terkurasi per item; tautan ke halaman produk | Jangan bulk-scrape |
| InaRISK / DIBI | Risiko dan kejadian | Repo sudah punya turunannya (`terpapar.json`, `dibi_kab_tahun.json`); pakai yang ada, konfirmasi syarat pakai layanan ArcGIS | Izin untuk layanan mesin |
| Kemensos (gudang, Lumbung Sosial, Tagana) | Stok pasangan di lapangan; Klaster Logistik melibatkan Kemensos | Lewat forum Klaster Logistik; tidak ada sistem terbuka | Kesepakatan kerja sama; sumber daftar gudang saat ini hanya berita |
| Klaster Logistik daerah | Juklak 16/2025 mewajibkan pemutakhiran data tiap 3 bulan | Format laporan Format-5 sampai 8 sebagai bentuk impor | - |

Prinsip: **impor berkas berbasis kode barang** adalah satu-satunya cara yang tidak menunggu pihak lain membuka API. Sistem kami harus menerima ekspor Excel/CSV dari SAKTI, SIMAN, SIMDA BMD, e-BMD, dan INALOGPAL (Excel SADD sudah ada).

## 7. Temuan kajian dan pemeriksaan tentang kelemahan logistik

| Temuan | Rincian | Sumber |
|---|---|---|
| BPK atas LKPD Provinsi Sulawesi Tengah 2018 (Temuan SPI No. 5, LHP 06.A/LHP/XIX.PLU/05/2019 hal. 18) | Persediaan bantuan bencana (gempa dan likuifaksi 28 September 2018) pada BPBD tidak berdasarkan pemeriksaan fisik per 31 Desember 2018; saldo tercatat Rp0,00 padahal bantuan donatur sekitar Rp7.320.205.037,75. BPK merekomendasikan penatausahaan tertib oleh penanggung jawab gudang MSU BPBD. Temuan BMD terkait: pencatatan banyak barang belum dilakukan, kelemahan SIMDA BMD dalam penyusunan LK | https://berkas.dpr.go.id/pa3kn/referensi-apbn/public-file/ringkasan-telaahan-public-106.pdf (halaman 17-19) |
| Renas PB 2025-2029 | Regulasi standar logistik daerah tidak relevan; belum ada sistem informasi logistik dan peralatan yang dimutakhirkan; perbedaan standar bantuan kemanusiaan antar lembaga | https://peraturan.bpk.go.id/Download/372749/peraturan-bnpb-no-1-tahun-2025.pdf |
| Renstra BNPB (dari 4-logistik.md) | NSPK manajemen logistik belum tersusun sistematis | Perban 5/2025 |
| Audit kinerja pengelolaan peralatan 2015-semester I 2019 oleh Inspektorat BNPB dan BPKP (tim 127 orang di kab/kota, dimulai 10 Desember 2019) | Penilaian peralatan tepat sasaran dan sesuai kebutuhan; hasil temuan tidak dipublikasikan di artikel | https://bnpb.go.id/index.php/berita/inspektorat-bnpb-mengevaluasi-pengelolaan-peralatan-penanggulangan-bencana |
| BPK memeriksa laporan keuangan BNPB 2024 (Februari 2025), mencakup perencanaan dan pemenuhan logistik dan peralatan | Temuan tidak diumumkan di rilis | https://www.bpk.go.id/news/bpk-tekankan-akuntabilitas-pengelolaan-keuangan-di-bnpb-untuk-penanggulangan-bencana-yang-efektif |
| BPK Jawa Tengah 2024 | Selisih stock opname Cadangan Pangan Provinsi di gudang Magelang (bukan BPBD) | https://jateng.bpk.go.id/wp-content/uploads/2024/11/20241117-O-JT1-Provinsi-Jawa-Tengah-tribunnews-Komisi-B-DPRD-Jateng-Minta-Sel__.pdf |
| Studi BPBD Kabupaten Pati | Pencatatan lambat dan manual, selisih stok sistem dan fisik, ada tabel barang kedaluwarsa | https://eprints2.undip.ac.id/id/eprint/25257/3/S_Aan%20Ardiansyah%20BAB%20I.pdf |
| Studi BPBD Jawa Timur | Fungsi dan koordinasi gudang logistik lemah | https://ejournal.unitomo.ac.id/index.php/sar/article/view/4825/2307 |
| Kasus BPBD Payakumbuh (April 2026) | Pemeriksaan gudang: penghapusan peralatan rusak berat dan logistik kedaluwarsa | https://www.sudutpayakumbuh.com/bpbd-payakumbuh-cek-kesiapan-peralatan-dan-logistik-bencana-pastikan-siap-digunakan/ |
| Gudang BPBD kosong saat gempa NTT (Agustus 2026) | Kepala BNPB: gudang daerah perlu buffer stock sendiri | https://rri.co.id/en/national/2681326/regional-disaster-logistics-warehouses-seen-as-key-to-faster-community-aid |

Yang **tidak ketemu**: LHP BPK tentang BNPB sendiri yang menyebut logistik kedaluwarsa atau gudang tidak layak; daftar temuan BPK lintas BPBD secara nasional. Cara menemukannya: portal IHPS BPK dengan kata kunci "BPBD persediaan" dan "BNPB persediaan" tahun 2019-2025. Pencarian web biasa tidak menghasilkan.

## 8. Sepuluh usulan teratas

Urut dari dampak dan kecocokan ke bukti di atas. Setiap usulan menyebut URL buktinya.

1. **Neraca stok minimal dua metode per kab/kota**: (a) JP x PR x H (Perka 23/2014) dan (b) service level x rerata kejadian 5 tahun (pola Juklak 1/2024 menurut lampiran Bantul), keduanya dari data kami, dengan kolom "stok belum dilaporkan". Bukti: https://jdih.bantulkab.go.id/resource/doc/public/produk_hukum/2025/keputusan-bupati-2025-643.pdf ; https://peraturan.go.id/files/bn2080-2014.pdf
2. **Impor berkas berbasis kode barang** untuk KIB B, Laporan BMN, Laporan Persediaan, dan ekspor INALOGPAL, lalu satukan sebagai "stok dan kondisi siap-pakai". Bukti: https://www.djkn.kemenkeu.go.id/kpknl-jayapura/baca-artikel/17430/Jaga-Aset-Negara-Aplikasi-SIMAN-Versi-2-sebagai-Pengembangan-Sistem-Pengelolaan-Barang-Milik-Negara.html ; https://pasal.id/peraturan/permen/permendagri-no-47-tahun-2021
3. **Peta kesenjangan gudang regional**: jam tempuh dari 7 gudang rencana Renas ke 514 kab/kota, dibanding target 72 jam dan 2x24 jam, memakai graf jalan yang sudah ada. Bukti: https://peraturan.bpk.go.id/Download/372749/peraturan-bnpb-no-1-tahun-2025.pdf (program 1.3.2.b)
4. **Penentuan 10 lokasi gudang taktikal** (3 lokasi belum disebut Renas) dengan kriteria risiko, keterisolasian, dan akses antarpulau. Bukti: Renas 1.3.2.a di atas.
5. **Dasbor kemajuan Renas program 1.3.x**: tiap indikator (gudang regional x7, taktikal x10, klaster 29 ke 44, lumbung sosial 668 ke 1.091, pemenuhan 75%) dengan nilai awal dan tonggak. Bukti: Renas PB di atas. Ini langsung menjawab akuntabilitas BNPB.
6. **Modul "Standar minimal daerah"**: tiap BPBD memasukkan service level dan rerata kejadian, sistem menghasilkan lampiran Keputusan Kepala Daerah mirip Bantul (logistik 1 tahun, peralatan 5 tahun, pembaruan otomatis). Bukti: https://jdih.bantulkab.go.id/resource/doc/public/produk_hukum/2025/keputusan-bupati-2025-643.pdf ; Berita Acara 18 Maret 2025 https://ppid.kukarkab.go.id/download/berkala/3557
7. **Pelacak kedaluwarsa dan stok fisik (FEFO) dengan stock opname terjadwal** untuk mengatasi temuan BPK (saldo Rp0 padahal bantuan Rp7,3 miliar). Bukti: https://berkas.dpr.go.id/pa3kn/referensi-apbn/public-file/ringkasan-telaahan-public-106.pdf ; https://eprints2.undip.ac.id/id/eprint/25257/3/S_Aan%20Ardiansyah%20BAB%20I.pdf
8. **Tabel harga satuan terkurasi dengan sumber dan tanggal**: kolom plafon e-katalog, kolom HPS BNPB, kolom harga perolehan KIB B; ditandai bila usang. Bukti: https://katalog.inaproc.id ; https://biropbj.kaltimprov.go.id/storage/file/Panduan Praktis Katalog Elektronik V6 - Penyedia.pdf
9. **Peta gudang lintas lembaga** (BNPB, BPBD, Kemensos Bekasi/Palembang/Makassar/Kupang, Lumbung Sosial, mitra Klaster) sebagai satu lapisan untuk Pusdalops, hanya data yang sudah dipublikasikan. Bukti: https://kemensos.go.id/en/observation-of-the-east-regional-logistics-warehouse-in-makassar ; https://rmol.id/nusantara/read/2025/12/06/689254/kemensos-kebut-distribusi-bantuan-di-sumbar ; https://wartaekonomi.co.id/read513341/penuhi-kebutuhan-warga-terdampak-bencana-kemensos-targetkan-bangun-110-lumbung-sosial-tahun-ini
10. **Lembar usulan anggaran sistem informasi logistik** yang menautkan produk kami ke sasaran Renas 1.3.3.b dan 1.3.3.c (pagu Rp5 miliar masing-masing) dan ke diagnosa Renas bahwa sistem informasi logistik belum ada. Bukti: https://peraturan.bpk.go.id/Download/372749/peraturan-bnpb-no-1-tahun-2025.pdf

## 9. Yang tidak ketemu atau tidak diverifikasi

- Teks resmi, nomor registrasi, dan tanggal penetapan Juklak 1/2024 standar minimal (JDIH BNPB tidak menampilkan). Jalur: minta ke Dit Pengelolaan, atau Keputusan Wali Kota Yogyakarta 405/2025 (terpindai).
- Surat Edaran Kemendagri yang mendukung Juklak 1/2024 (disebut tanpa nomor).
- Alamat jalan semua gudang BNPB dan UPT; daftar UPT.
- SIMOLEK dan SIBAGANA tidak teridentifikasi.
- API atau ekspor SIMAN v2, SAKTI, SIMDA BMD, e-BMD, DIBI, Magma, dan syarat pakai layanan InaRISK.
- Harga satuan barang logistik bencana dari e-Katalog.
- LHP BPK atas BNPB yang spesifik soal kedaluwarsa dan gudang tidak layak.
- Lampiran RPJMN Perpres 12/2025 tidak dibaca; Renas PB dan Renstra dipakai sebagai gantinya.
- Beberapa halaman gagal verifikasi sertifikat (spm.bangda.kemendagri.go.id, bpbpk.kalteng.go.id) dan tidak dibuka. Beberapa PDF terpindai (LAKIP Deputi Logpal 2023, Keputusan Wali Kota Yogyakarta 405/2025) tanpa lapisan teks.
- Ringkasan hasil pencarian web bukan kutipan primer; angka yang saya andalkan (Renas PB, Bantul, Perban 4/2018, Permendagri 101/2018, DPR ringkasan BPK) saya baca langsung dari PDF.
