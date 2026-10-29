# Kritik dan Keputusan: Grand Design Jaringan Pipa dan Injeksi Gambut (Kalimantan Tengah)

Disusun 24 Oktober 2026 untuk staf ahli BNPB. Bahan: ringkasan empat dokumen grand design dan paket pendampingnya (`baca-A.md`, `baca-B.md`, sekitar 335 klaim), data platform Pantau Bencana di repo ini, dan dua sumber berita resmi untuk biaya pembanding.

Label keyakinan yang dipakai di seluruh berkas:

- **[resmi]**: angka dari instansi pemerintah atau peraturan.
- **[terverifikasi]**: angka dari data terbuka yang dihitung ulang di repo ini, atau dari literatur ilmiah/pabrikan yang dapat dicek.
- **[estimasi-model]**: hasil hitungan rumus dengan asumsi tertulis.
- **[asumsi-kebijakan]**: angka pilihan perencana, termasuk harga yang belum ada RFQ. Selalu diberi rentang.

---

## 1. Ringkasan putusan

**Putusan utama: NO-GO untuk grand design sebagaimana ditulis. GO bersyarat untuk pilot portabel dua musim di Kalimantan Tengah, dengan lima gerbang terukur sebelum satu rupiah pun dipakai untuk skala.**

Gagasan intinya benar: bara gambut harus dibasahi di bawah permukaan, dan water bombing serta OMC tidak melakukan itu. Yang keliru adalah bentuk solusinya. Data Kalteng menunjukkan tiga hal yang membalik logika "jaringan pipa terintegrasi":

1. **Kapan terbakar tidak bisa diandalkan, di mana terbakar bisa.** Di Kalteng selatan, deteksi VIIRS tahun 2015 sebanyak 169.782 titik, tahun 2020-2022 di bawah 1.000 titik per tahun [terverifikasi, VIIRS S-NPP, dihitung ulang di repo]. Aset tetap akan diam di sebagian besar tahun. Tetapi 85% deteksi 2023 jatuh di sel 2,2 km yang sudah terbakar pada 3 tahun atau lebih sebelumnya. Jawabannya aset yang **berpindah ke lokasi yang sudah bisa ditebak**, bukan aset yang **dipasang menetap**.
2. **Air jarang jadi kendala utama; tenaga dan waktu di lokasi yang jadi kendala.** 63% kompleks api Kalteng 2026 berada dalam 2 km dari sungai atau kanal besar (median 1,28 km) [terverifikasi, OSM], dan sumur bor dangkal bisa dibuat di gambut seharga Rp1,5-6 juta per titik [resmi/laporan lapangan, lihat §4]. Kecepatan padam bara ditentukan oleh luas yang bisa dicari, ditusuk, disiram, dan dicek seorang regu per hari (0,5-2,8 ha/regu/hari menurut kasus Manggala Agni 2026), bukan oleh debit trunk.
3. **Bara tidak berada 5-15 m di bawah tanah.** Gambut di bawah muka air tanah jenuh dan tidak bisa membara. Kedalaman bakar terukur di Kalteng rata-rata sekitar 0,3-0,5 m (lihat K-07). Doktrin injeksi 5, 10, 15 m dan sumur resapan 6-10 m tidak punya dasar fisika.

### 1.1 Putusan per komponen

| Komponen | Putusan | Syarat terukur (gerbang) | Alasan singkat |
| --- | --- | --- | --- |
| Lance injeksi dangkal (0-1,5 m) + probe suhu | **GO bersyarat** | G2 bench + G4 A/B | Fisika benar; efektivitas lapangan belum terbukti, hanya lab [1] dan satu uji lapangan [Santoso 2021] |
| Relay layflat portabel DN100/DN65, 0,5-1,5 km | **GO bersyarat** | G1, G2, G3 | Mengisi celah nyata: sumber air 300 m s.d. 2 km dari bara, di luar jangkauan nyaman selang pompa jinjing |
| Trunk 6 inci 2.000 LPM @ 10 bar, 2 km | **NO-GO sebagai standar** | Hanya bila G4 menunjukkan regu bisa menyerap > 10 L/s di satu lokasi | Debit trunk 3-10 kali lebih besar dari yang bisa diserap 8-16 lance (§2, K-01, K-09) |
| HDPE semi-permanen (OD200) "pasang-bongkar TNI" | **NO-GO**, juga sebagai koridor tetap (keputusan 60, 27 Okt 2026) | – | 2 km HDPE OD200 beratnya sekitar 20 ton dan butuh 160-an sambungan fusi; tidak bisa digelar-bongkar cepat di gambut |
| Backbone permanen 5 km | **NO-GO** sampai ada data 3 musim | Tidak dibuka sebelum G5 | Investasi terbenam pada api yang episodik; tanpa bukti utilisasi |
| Injeksi 5-15 m, sumur resapan 6-10 m | **NO-GO** | Tidak ada | Bara tidak berada di kedalaman itu (K-07) |
| Geolistrik + sumur dalam 50-100 m | **NO-GO sebagai default** | Hanya di lokasi tanpa air permukaan dan sumur dangkal gagal | Sumur dangkal Rp1,5-6 juta, sekitar 3 jam per titik, sudah jadi praktik lapangan |
| Surfaktan Class A 0,1-0,3% | **GO bersyarat** sebagai satu lengan A/B | Bebas PFAS, lembar data ekotoksisitas, larangan di dekat intake air minum dan perairan ikan | Bukti penetrasi ada; risiko lingkungan di air gambut belum dinilai |
| Sekat kanal + rewetting di sel berulang | **GO** (sudah terbukti, bukan bagian baru) | Sesuai prosedur BRGM/KLHK | Pencegahan termurah per ha; jadi lengan pembanding wajib |
| Drone termal | **GO** sebagai alat verifikasi permukaan | Tidak dipakai sendirian untuk menyatakan padam | Kamera hanya melihat permukaan |
| Dual-use banjir | **NO-GO sebagai justifikasi** | Hanya berbagi gudang, truk, dan kru | Pompa api (head tinggi, debit kecil) berbeda kelas dari pompa banjir (head rendah, debit besar) |
| Dual-use irigasi | **NO-GO** | Tidak ada | Kebutuhan irigasi dan pemadaman sama-sama di puncak kemarau, berebut air yang sama; air gambut pH 3,5-4,5 |
| YonTP sebagai gudang, logistik, tenaga gelar | **GO bersyarat** | MoU pinjam pakai BMN, operator bersertifikat Manggala Agni, komando tetap di Satgas Karhutla | Tenaga dan gudang tersedia; kewenangan teknis pemadaman bukan di TNI |
| Alokasi ulang 30-40% anggaran heli | **NO-GO sekarang** | Setelah G5 | Belum ada bukti metode pipa menggantikan fungsi heli (menahan front di lokasi tak terjangkau) |

### 1.2 Putusan per skenario dokumen pemilik

| Skenario | CAPEX dokumen | Putusan | Alasan |
| --- | --- | --- | --- |
| Rp1,185 M per jaringan 2 km, 100 set nasional (Rp364 M) | Rp364 M | **NO-GO** | Hidraulika tidak konsisten, utilisasi tidak dihitung, harga tanpa RFQ, belum ada uji lapangan |
| S1 Portable | Rp4,50 M | **GO bersyarat, dirombak** | Bentuk yang benar; dipecah jadi 3 kit di 3 lokasi dengan lengan A/B (§4) |
| S2 Semi-permanen | Rp11,34 M | **NO-GO** | Jaringan pipa tetap ditutup (keputusan 60) |
| S3 Backbone | Rp26,70 M | **NO-GO** | Lihat tabel komponen |

### 1.3 Lima gerbang

| Gerbang | Kapan | Lulus bila | Gagal berarti |
| --- | --- | --- | --- |
| G0 Lokasi | bulan 0-2 | 3 AOI terpilih dari data: sel 2,2 km aktif ≥ 7 dari 14 tahun (2012-2025), gambut, sumber air permanen ≤ 2 km, jalur akses kemarau dan hujan, persetujuan pemegang hak lahan | Ganti AOI |
| G1 Air | bulan 1-4 | Debit kemarau terukur ≥ 1,5 kali debit operasi (mis. ≥ 15 L/s untuk operasi 10 L/s) atau tampungan ≥ 1 shift; penurunan muka air tanah di piezometer 100 m dari intake < 10 cm setelah 24 jam pompa | Lokasi dicoret; jangan beli pompa |
| G2 Bench | bulan 3-5 | Kurva Q-H pompa terukur; head loss layflat 1 km dalam ±15% model; lance 15-40 L/min pada 2-4 bar; tidak bocor pada 1,5 kali tekanan kerja; uji tutup katup tanpa lonjakan melewati rating | Revisi diameter/pompa; hentikan lance bila tersumbat terus |
| G3 Waktu gelar | musim 1 | Tiba-sampai-air-mengalir p50 ≤ 4 jam, p90 ≤ 6 jam untuk relay 1 km di gambut sedang, ≥ 5 ulangan per kelas medan | Kit hanya untuk kebakaran besar berhari-hari |
| G4 Efikasi | akhir musim 1-2 | Lengan pipa+lance memberi ≥ 30% lebih banyak ha "dingin terverifikasi" per regu-hari, atau ≥ 30% lebih sedikit nyala ulang 30 hari, dengan 95% CI tidak memotong nol, n ≥ 8 petak per lengan; biaya per ha terverifikasi ≤ 1,2 kali cara konvensional | NO-GO skala; kit dilebur ke inventaris pompa biasa |
| G5 Skala | setelah musim 2 | G4 lulus, dievaluasi pihak independen, minimal satu musim dengan ≥ 30 hari kebakaran aktif di AOI | Perpanjang pilot satu musim, jangan beli |

---

## 2. Kritik per klaim teknis

Format tiap kritik: klaim, bukti atau hitungan, vonis, perbaikan.

### K-01 Pompa 75 HP, 2.000 LPM @ 10 bar

- **Klaim (A1):** pompa diesel 75 HP di sumber memberi 2.000 L/min pada 10 bar.
- **Bukti:** daya hidrolik 2.000 L/min × 10 bar = 33,3 kW; pada efisiensi 65% butuh 51 kW poros, setara 69 HP [estimasi-model]. Jadi 75 HP cukup di atas kertas **bila 10 bar diukur di mulut pompa**. Pompa nyata kelas ini, Tohatsu VE1500, memberi 1.500 L/min pada 1,0 MPa dan 2.050 L/min pada 0,6 MPa dengan mesin 44 kW [terverifikasi, data pabrikan, dikutip A2]. Titik 2.000 LPM @ 10 bar berada di luar kurva pompa portabel; butuh pompa skid diesel kelas lain.
- **Vonis:** setengah benar. Makna "10 bar" tidak didefinisikan; di ujung 2 km tekanannya jauh lebih rendah.
- **Perbaikan:** spesifikasi ditulis sebagai titik kerja di **ujung** (mis. 2-4 bar di manifold) dan dipilih dari kurva Q-H pabrikan; FAT wajib sebelum bayar.

### K-02 ID HDPE vs OD, dan head loss 2 km

- **Klaim:** "pipa 6 inci (160 mm)" dipakai dengan D = 0,141 m (A1) atau 0,160 m (A3) di rumus.
- **Bukti:** HDPE dinamai menurut diameter **luar**. OD160 SDR11 punya ID 130,8 mm. Pada 2.000 LPM dan 2 km, head loss naik dari sekitar 31-36 m (bila ID dianggap 160 mm) ke sekitar 96 m (ID sebenarnya), TDH sekitar 127 m, tekanan pompa sekitar 12,4 bar [estimasi-model, Hazen-Williams C=130, sesuai tabel A4 hlm 31]. Hitungan saya untuk C=140 per 1 km: OD160 41,7 m, OD200 14,0 m, layflat DN150 20,1 m pada 33,3 L/s [estimasi-model].
- **Vonis:** salah ukur yang mengubah pompa, rating pipa, dan BBM. Dokumen A3/A4 sudah mengoreksinya; draf awal A1 tidak.
- **Perbaikan:** semua tabel memakai ID aktual dari datasheet. Trunk 2.000 LPM hanya masuk akal di OD200 ke atas.

### K-03 TDH, daya, dan BBM

- **Klaim:** BBM seluruh mesin 18-21 L/jam (A1); 10 L/jam untuk duty point (A4 G-2).
- **Bukti:** 10 L/jam itu hanya pompa utama pada titik residu 2 bar. VE1500 pada rating makan sekitar 22 L/jam bensin [terverifikasi, pabrikan]. Dua pompa portabel 24 jam = sekitar 1.056 L, harus diangkut ke rawa.
- **Vonis:** angka A1 terlalu rendah bila booster ikut jalan; logistik BBM menjadi beban utama, bukan catatan kaki.
- **Perbaikan:** neraca BBM per insiden dihitung dari jam pompa nyata (log `inventori_bbm.py` milik paket pemilik sudah tepat bentuknya), cadangan 1,25 kali.

### K-04 Booster "tiap 1 km"

- **Bukti:** layflat DN150 pada 33 L/s kehilangan sekitar 20 m per km; DN100 pada 10 L/s sekitar 17 m per km [estimasi-model]. Booster ditentukan profil tekanan dan elevasi, bukan jarak tetap. A2 sudah menulis ini.
- **Vonis:** salah sebagai aturan.
- **Perbaikan:** booster ditempatkan di titik tekanan turun ke batas minimum hisap pompa berikutnya, dihitung dari profil DEMNAS.

### K-05 Kecepatan pasang 2 km dalam 3-4 jam

- **Klaim (A1):** 2 km siap dalam 3-4 jam, 4 orang per segmen 100 m.
- **Bukti:** 4 orang per 100 m = 80 orang di jalur. Layflat DN150 kosong ringan, tetapi berisi air 1,8 ton per 100 m [estimasi-model]; memindahkannya setelah diisi praktis mustahil. HDPE OD200 SDR11 beratnya sekitar 9,9 kg/m, jadi 2 km sekitar 20 ton, batang 6-12 m, sekitar 167-333 sambungan fusi [estimasi-model]. Matriks pemilik sendiri (A3) memberi 13-133 jam gelar per 2 km dengan regu 8 orang, tergantung medan [asumsi-kebijakan, belum time-motion].
- **Vonis:** 3-4 jam hanya mungkin untuk layflat di medan datar dengan banyak orang. Untuk HDPE di gambut, tidak.
- **Perbaikan:** G3 time-motion ≥ 5 ulangan per kelas medan; target p50 ≤ 4 jam untuk relay layflat 1 km.

### K-06 Radius layanan dan waktu air sampai

- **Klaim:** radius lateral 500-800 m, "radius efektif 1,0-1,6 km" (A1); air tiba sekitar 20 menit.
- **Bukti:** waktu isi pipa 40 m³ pada 2 m³/menit memang sekitar 20 menit [estimasi-model], benar. Radius 1,0-1,6 km adalah diameter koridor, bukan radius. Satu kit 2 km dengan cabang 500 m melayani pita sekitar 200 ha, sedangkan bara aktif di satu kompleks biasanya hanya beberapa hektare di dalam pita itu.
- **Vonis:** waktu tiba benar; cakupan dilebihkan dua kali.
- **Perbaikan:** cakupan dinyatakan dalam ha bara yang bisa dikerjakan per hari oleh regu yang tersedia, bukan luas koridor.

### K-07 Injeksi 5, 10, 15 m dan sumur resapan

- **Klaim (A1):** grid injeksi berlapis sampai > 15 m, sumur resapan 6-10 m.
- **Bukti:** gambut terbakar hanya di atas muka air tanah. Kedalaman bakar Kalteng: rata-rata sekitar 0,5 m pada kebakaran 1997 (Page dkk. 2002, Nature 420) dan sekitar 0,3 m pada 2006 dari LiDAR (Ballhorn dkk. 2009, PNAS) [terverifikasi, literatur; angka perlu dicek ke naskah asli sebelum dikutip di dokumen formal]. PP 57/2016 memakai muka air tanah > 0,4 m sebagai kriteria kerusakan [resmi]. Pada kemarau panjang muka air di gambut berkanal turun sekitar 1-1,5 m, jadi bara di bawah 1,5-2 m adalah kasus langka.
- **Vonis:** **salah secara fisika.** Gambut 15 m tebalnya, bukan 15 m terbakar.
- **Perbaikan:** doktrin injeksi 0-1,5 m dengan probe suhu pada 0,1/0,3/0,5/1,0 m; kasus lebih dalam diperlakukan sebagai temuan yang harus dibuktikan dengan probe, bukan dirancang di depan.

### K-08 Kebutuhan air 600 m³/ha

- **Klaim:** 600 m³/ha dari 5.000 m³ gambut × 120 L/m³.
- **Bukti:** koefisien platform `air_bara` di `public/data/operasi.json`: 72.000 L/ha (uji lapangan Palangka Raya, Santoso dkk. 2021, 7,2 L/m²), 200.000 L/ha tengah, 500.000 L/ha batas atas [terverifikasi untuk 72 m³; sisanya asumsi platform]. Lab UI (A2 [1]): 3,81-4,22 L per kg gambut terbakar; pada berat isi 100-200 kg/m³ itu 380-840 L per m³ **gambut yang membara**, bukan per m³ seluruh lapisan.
- **Vonis:** angka 600 m³/ha berada di ujung atas dan dihitung dari volume yang salah (seluruh lapisan 0,5 m, bukan volume membara). Dokumen A4 sendiri menyebutnya "bukan nilai terverifikasi".
- **Perbaikan:** kebutuhan air dinyatakan per m³ membara hasil probe, dan diukur dengan flowmeter totalizer di tiap petak A/B.

### K-09 Debit trunk vs kemampuan menyerap

- **Bukti:** lance 15-40 L/min, 8-16 aktif = 120-640 L/min, atau 2-11 L/s (desain basis A2) [asumsi-kebijakan pemilik]. Trunk dirancang 20-33 L/s. Satu regu memadamkan 0,5-2,8 ha/hari (koefisien `bara_regu`, kasus Manggala Agni 2026) [terverifikasi untuk kasusnya]. Pada 200 m³/ha, 1 ha/regu/hari butuh rata-rata hanya 2,3 L/s.
- **Vonis:** **ini kritik terpenting.** Trunk 2.000 LPM baru terpakai penuh bila ada 10-30 regu bekerja di satu lokasi. Pada kebanyakan kebakaran, relay DN100 pada 10 L/s (head loss sekitar 17 m/km) sudah cukup.
- **Perbaikan:** ukuran standar diturunkan ke relay DN100/DN65 dengan pompa kelas VE1500 atau lebih kecil; trunk besar hanya untuk koridor dengan bukti konsentrasi regu.

### K-10 Foam dan surfaktan

- **Klaim:** Class A 0,1-0,3%, penyerapan 3-5 kali lebih cepat.
- **Bukti:** gambut kering bersifat hidrofobik, jadi zat pembasah masuk akal. Angka 3-5 kali tidak bersumber. Biaya dokumen: 150 L/ha, Rp22,5 juta/ha [asumsi-kebijakan pemilik]. Air gambut adalah habitat ikan dan sumber air warga.
- **Vonis:** GO bersyarat sebagai lengan uji.
- **Perbaikan:** produk bebas fluor/PFAS, lembar data ekotoksisitas, zona larangan di sekitar intake air minum, sampel air hilir sebelum dan sesudah.

### K-11 Geolistrik dan sumur dalam 50-100 m

- **Bukti:** kebijakan rapat kabinet 12 Okt 2026 sudah meminta "tambah pompa dan titik bor air" [resmi, `operasi_resmi.json`, belum dicek ke dokumen BNPB]. Sumur bor dangkal gambut Rp1,5 juta + pompa Rp4-5 juta (LPDS 2016), paket Rp6 juta (Mongabay 2015), sekitar 3 jam per titik (BRG), melayani 3-12,5 ha [laporan lapangan, dikutip di `operasi.json`]. Akuifer 50-100 m "tidak dijamin" (A3 sendiri).
- **Vonis:** NO-GO sebagai default; mahal, lambat, tidak perlu di gambut yang air tanahnya dangkal.
- **Perbaikan:** sumur dangkal pra-posisi di sel berulang; sumur dalam hanya pengecualian berbasis survei.

### K-12 Rewetting dan sekat kanal

- **Bukti:** A2 [3]: sekat kanal efektif tetapi skenario terbaik hanya menghindari sampai 6,4% area terbakar. Biaya sekat Rp20,6 juta/unit (BRGM 2021, Riau) [resmi/berita]; restorasi hidrologi Rp12 juta/ha untuk 5 tahun (BRG 2016).
- **Vonis:** benar ditempatkan sebagai baseline; jangan diklaim sebagai solusi tunggal.
- **Perbaikan:** jadi lengan A pembanding dan pekerjaan pencegahan di sel inti.

### K-13 Pemakaian untuk banjir

- **Bukti:** genangan 1 ha × 0,5 m = 5.000 m³; pada 30 L/s butuh sekitar 46 jam [estimasi-model]. Pompa api dirancang head tinggi debit kecil; pompa banjir head rendah debit besar. Paket pemilik sendiri menambah "pompa banjir high flow low head" Rp250 juta sebagai item terpisah.
- **Vonis:** dual-use banjir untuk pipa dan pompa api adalah klaim pemasaran.
- **Perbaikan:** yang dibagi hanya gudang, truk, perahu, kru, dan sistem gudang. Jangan masukkan manfaat banjir ke hitungan kelayakan.

### K-14 Pemakaian untuk irigasi pertanian

- **Bukti:** puncak kebutuhan irigasi dan puncak kebakaran sama-sama terjadi di kemarau, dari sumber air yang sama. Air kanal gambut pH 3,5-4,5 (A1). Paket pemilik sendiri mencantumkan larangan "not dewater for agriculture".
- **Vonis:** NO-GO. Irigasi yang menurunkan muka air gambut justru menambah bahan bakar.
- **Perbaikan:** dihapus dari justifikasi.

### K-15 Pencurian dan vandalisme

- **Bukti:** FMEA pemilik memberi skor 9; pompa Rp190 juta dan kopling logam di lokasi terpencil adalah sasaran. Aset tetap di koridor tanpa penjagaan lebih rentan daripada aset di gudang.
- **Vonis:** argumen tambahan untuk portabel tersimpan.
- **Perbaikan:** penanda QR + geofence, gudang terkunci, kopling dan pompa selalu kembali ke gudang; target kehilangan < 5% komponen per musim; di atas 20% pengamanan kit ditinjau sebelum gelar berikut.

### K-16 Panas pada HDPE dan layflat

- **Bukti:** HDPE melunak jauh di bawah titik leleh sekitar 130 °C; layflat berlapis karet rusak oleh bara. Pipa kosong di zona api akan terbakar.
- **Vonis:** risiko nyata, tidak dibahas di A1.
- **Perbaikan:** HDPE hanya di luar perimeter aktif; di zona api pakai layflat berlapis nitril yang selalu terisi dan mengalir; katup tutup lambat. Lonjakan tekanan tutup cepat di HDPE sekitar 5 bar pada 1,66 m/s [estimasi-model, Joukowsky, a = 300 m/s], jadi tekanan kerja 6-10 bar + lonjakan mendekati batas PN16.

### K-17 YonTP, TNI, dan kewenangan

- **Bukti:** pengendalian karhutla secara teknis ada di Kemenhut (Brigdalkarhutla/Manggala Agni, Permen LHK P.32/2016, regu inti 15 orang) [resmi, dikutip `operasi.json`]. TNI membantu penanggulangan bencana sebagai operasi militer selain perang (UU 34/2004 Pasal 7 ayat (2) huruf b, sebagaimana diubah UU 3/2025) [resmi; pasal belum dicek ke teks di korpus repo, korpus hanya berisi peraturan BNPB]. Di Kalteng 12 Okt 2026 sudah ada 1.403 personel TNI vs 176 Manggala Agni di lapangan [resmi, `operasi.json`, BNPB harian]. TNI jadi tenaga terbesar.
- **Vonis:** YonTP masuk akal sebagai gudang, logistik, dan tenaga gelar. Tidak masuk akal sebagai pemilik aset atau komando teknis. Rotasi personel TNI juga menghapus keterampilan tiap 1-2 tahun.
- **Perbaikan:** pemilik BMN tetap BNPB/BPBD atau Kemenhut, dipinjam-pakaikan lewat MoU; operator pompa dan lance bersertifikat Manggala Agni; komando di Satgas Karhutla provinsi; pelatihan ulang tiap tahun.

### K-18 Biaya per hektare vs metode lain

- **Klaim (A1):** pipa Rp45 juta/ha vs heli Rp350-600 juta/ha vs OMC Rp150-200 juta/ha.
- **Bukti:** Rp45 juta/ha hanya OPEX, tanpa CAPEX, mobilisasi, dan utilisasi. Biaya heli per ha tidak bersumber dan tidak sebanding, karena heli tidak memadamkan bara (`m_per_drop`: satu jatuhan 4.000 L membasahi pita sekitar 50 m). Angka bersumber yang ada: operasional water bombing "lebih dari Rp200 juta per sorti satu jam" (BNPB, Sept 2023) [resmi, pernyataan]; OMC Rp2,3-2,5 M per provinsi untuk 10-12 hari (Kemenhut, rencana 2026) [resmi, berita]. OMC tidak bisa dihitung per ha karena hasilnya hujan, bukan luas padam.
- **Vonis:** perbandingan tidak sahih. Pembanding yang benar untuk bara adalah regu darat dengan pompa jinjing dan sumur dangkal, bukan heli.
- **Perbaikan:** satuan tunggal: **biaya per ha dingin terverifikasi 30 hari**, termasuk CAPEX teramortisasi. Lihat §4.4.

### K-19 Harga dan RAB

- **Bukti:** RAB A1 Rp1,185 M berasal dari marketplace tanpa RFQ; pipa "6 inci PN16 Rp220.000/m" tidak cocok dengan harga pemasok HDPE OD200 PN16 Rp1.162.050/m (7 Apr 2026) yang dikutip A4. Hanya tiga harga di paket pemilik yang bersumber (VE1500W, HDPE OD200/OD110, Matrice 4T).
- **Vonis:** RAB A1 tidak bisa dipakai. RAB A4 lebih jujur tetapi 37 dari 40 item masih asumsi.
- **Perbaikan:** e-katalog LKPP + 3 penawaran tertulis sebelum pengadaan pilot.

---

## 3. Strategi terpilih: "Basahi dulu, kirim kit ke tempat yang sudah ditebak, buktikan dingin"

### 3.1 Bentuknya

Hibrida empat lapis, dipilih karena api Kalteng episodik dalam waktu tetapi berulang dalam ruang:

1. **Pencegahan di sel inti (setiap tahun):** sekat kanal dan rewetting, ditambah sumur dangkal pra-posisi, di sel 2,2 km yang aktif ≥ 7 dari 14 tahun.
2. **Kit relay portabel pra-posisi (hanya tahun kering):** layflat DN100/DN65 0,5-1,5 km, dua pompa kelas VE1500, manifold, 8 lance, flowmeter, probe suhu. Disimpan di gudang YonTP/Daops, dipindah ke depot depan saat prakiraan musim menunjukkan kemarau di atas normal. Dipakai saat sumber air berjarak 300 m s.d. 2 km dari bara.
3. **Protokol perimeter-inti-verifikasi:** probe multi-kedalaman, injeksi dangkal, cek ulang 24 jam, 72 jam, 7 dan 30 hari. Drone termal untuk menyaring permukaan.
4. ~~Koridor semi-permanen paling banyak 2~~ dicabut (keputusan 60, 27 Okt 2026): lokasi kronis dilayani lapis 1 (sekat kanal, sumur dangkal) dan depot kit terdekat, tanpa pipa tetap.

Heli water bombing tetap untuk menahan front di lokasi yang tidak tercapai regu darat dalam 6 jam (aturan `jam_tiba` platform). OMC tetap keputusan BMKG/Kemenhut berdasarkan peluang awan, bukan bagian dari usulan ini.

### 3.2 Logika pemilihan lokasi dari data repo

Saringan berurutan, semuanya bisa dihitung dari data yang sudah ada:

| Langkah | Data repo | Hasil untuk Kalteng |
| --- | --- | --- |
| 1. Kompleks api 2026 | `public/data/operasi.json`, `kendala.json` | 865 kompleks, 644 di gambut [terverifikasi] |
| 2. Jarak ke sungai/kanal besar ≤ 2 km | `kendala.json` (`air_km`, OSM) | 544 kompleks (63%); kompleks gambut median 1,06 km [terverifikasi] |
| 3. Berulang di sel 0,1° (≥ 12 dari 24 tahun MODIS) | `riwayat_grid.json` | 253 kompleks gambut dekat air [terverifikasi] |
| 4. Berulang di sel 2,2 km (≥ 7 dari 14 tahun VIIRS) | `data/raw/firms/viirs*.csv`, dihitung ulang | 825 sel (7,5% sel) memuat 18,4% deteksi 2012-2025 [terverifikasi] |
| 5. Akses darat ≤ 6 jam | `akses.json` | Waktu tempuh baru terhitung untuk 71 kompleks Kalteng; data harus dilengkapi |
| 6. Status lahan | `kompleks_konsesi.json`, `kaw` di `operasi.json` | 670 kompleks "lain", 123 konsesi, 72 konservasi; konsesi butuh persetujuan perusahaan |

Hitungan langkah 4 di Kalteng selatan (bbox lon 111,0-114,6, lat -3,6 s.d. -1,5; sedikit tepi Kalsel ikut masuk) [terverifikasi]:

| Aktif ≥ n dari 14 tahun | Sel 2,2 km | Porsi sel | Porsi deteksi |
| --- | --- | --- | --- |
| ≥ 3 | 6.212 | 56,8% | 81,9% |
| ≥ 5 | 2.756 | 25,2% | 51,9% |
| ≥ 7 | 825 | 7,5% | 18,4% |
| ≥ 10 | 61 | 0,6% | 0,7% |

Keterpredikian: 72% deteksi 2019 dan 85% deteksi 2023 jatuh di sel yang sudah aktif ≥ 3 tahun sebelumnya [terverifikasi]. Ini dasar pra-posisi. Sebaliknya, hanya 61 sel yang aktif ≥ 10 tahun. Koridor "terbakar hampir tiap tahun" yang membenarkan aset tetap **sangat jarang**.

Calon AOI pilot (sel 0,1° dengan kompleks 2026 terbanyak yang lolos langkah 2-3) [terverifikasi untuk saringan; belum survei]:

| Kab/Kota | Kecamatan | Kekerapan sel (dari 24 th) | Median jarak air (km) | Catatan |
| --- | --- | --- | --- | --- |
| Kapuas | Mantangai | 14-16 | 0,6-1,3 | Eks-PLG; 9 kompleks 2026 di satu sel; sebagian konservasi |
| Pulang Pisau | Pandih Batu, Kahayan Kuala | 16-18 | 1,1-1,3 | Kekerapan tertinggi Kalteng |
| Kota Palangka Raya | Bukit Batu, Jekan Raya | 12 | 0,8-1,0 | Dekat Daops Palangkaraya dan jalan; cocok untuk uji waktu gelar |
| Pulang Pisau | Sebangau Kuala, Jabiren | 13-16 | 0,9-1,1 | Berbatasan TN Sebangau |
| Seruyan | Seruyan Hilir | 12-14 | 0,9-1,1 | Banyak konsesi; akses sulit |

Rekomendasi: satu AOI mudah (Palangka Raya, untuk G3 dan latihan), satu AOI menengah (Pulang Pisau), satu AOI sulit (Mantangai). Ini sejalan dengan usulan pemilik (Pulang Pisau, Kapuas, Palangka Raya), sekarang dengan alasan berangka.

### 3.3 Yang TIDAK direkomendasikan

- Jaringan pipa nasional 100 set atau 50 kluster sebelum ada satu hasil A/B.
- Pipa HDPE yang "dipasang-bongkar" TNI tiap musim.
- Backbone permanen 5 km dan koridor HDPE semi-permanen (keputusan 60).
- Injeksi lebih dalam dari 2 m sebagai doktrin; sumur resapan 6-10 m.
- Sumur dalam 50-100 m sebagai standar.
- Menghitung manfaat banjir atau irigasi dalam kelayakan.
- Menyalakan gambut untuk latihan atau uji (paket pemilik sendiri melarangnya).
- Memindahkan anggaran heli sebelum G5.
- Menyatakan padam berdasarkan drone termal saja.

---

## 4. Biaya total rinci

Semua angka dalam Rupiah 2026, PPN tidak ditambah terpisah (harga listing sudah termasuk). Hanya empat harga bersumber; sisanya rentang [asumsi-kebijakan] yang wajib diganti RFQ. Kontingensi 25% (lebih tinggi dari 20% pemilik karena 37 dari 40 item belum RFQ).

### 4.1 Pilot dua musim (Nov 2026 s.d. Des 2028): 3 lokasi, 3 kit, 4 lengan A/B

**Fase 0 (bulan 0-6), studi dan bench:**

| Item | Rentang (Rp juta) | Label |
| --- | --- | --- |
| Survei tapak 3 AOI: GNSS/drone, bor gambut, debit kemarau, piezometer | 450-750 | asumsi-kebijakan |
| Bench test pompa-layflat-lance (lapangan uji, sewa alat, instrumen) | 300-600 | asumsi-kebijakan |
| Kajian lingkungan dan izin (satu payung) | 100-250 | asumsi-kebijakan |
| Time-motion pada operasi Manggala Agni yang sedang berjalan | 150-300 | asumsi-kebijakan |
| Penyusunan protokol A/B pra-registrasi + evaluator independen | 100-200 | asumsi-kebijakan |
| **Subtotal Fase 0** | **1.100-2.100** | |

**CAPEX per kit relay portabel:**

| Item | Jumlah | Harga satuan (Rp juta) | Total (Rp juta) | Label |
| --- | --- | --- | --- | --- |
| Pompa portabel Tohatsu VE1500W | 2 | 190,78 | 381,6 | terverifikasi (listing mbizmarket, incl PPN) |
| Layflat DN100 bersertifikat | 1.000 m | 0,275 | 275,0 | asumsi |
| Layflat DN65 | 500 m | 0,165 | 82,5 | asumsi |
| Lance injeksi SS + filter | 8 | 4,2 | 33,6 | asumsi |
| Nozzle variabel | 6 | 6,5 | 39,0 | asumsi |
| Manifold 4 outlet | 2 | 25 | 50,0 | asumsi |
| Adaptor/kopling Storz | 20 | 2,4 | 48,0 | asumsi |
| Selang hisap + foot valve + strainer | 2 | 28 | 56,0 | asumsi |
| Filter servis + bypass | 2 | 19 | 38,0 | asumsi |
| Katup isolasi/cek/pelepas udara | 2 | 13,5 | 27,0 | asumsi |
| Flowmeter totalizer | 2 | 18 | 36,0 | asumsi |
| Sensor tekanan | 4 | 8,5 | 34,0 | asumsi |
| Node suhu gambut multi-kedalaman + TMA | 8 | 12 | 96,0 | asumsi |
| **Per kit** | | | **1.196,7** | |

Harga satuan asumsi mengikuti paket CAPEX pemilik (A4 Bagian Q) supaya bisa dibandingkan; rentang ketidakpastiannya ±30% sampai ada RFQ.

**CAPEX bersama pilot:**

| Item | Total (Rp juta) | Label |
| --- | --- | --- |
| 3 kit × 1.196,7 | 3.590 | campuran |
| Drone termal Matrice 4T + baterai/charger | 153 | 111,2 terverifikasi (halorobotics) + 42 asumsi |
| Kontainer gudang terkunci, 2 tangki BBM berdinding ganda, 2 radio/satelit | 276 | asumsi |
| APD tambahan 20 orang, alat dan suku cadang awal | 260 | asumsi |
| Instrumentasi A/B, 12 piezometer/logger, commissioning dan latihan | 431 | asumsi |
| Lengan pencegahan: 6 sekat kanal | 124-390 | Rp20,6 juta/unit BRGM 2021 (resmi/berita) s.d. Rp65 juta asumsi 2026 |
| Lengan sumur dangkal: 30 titik | 45-180 | Rp1,5-6 juta/titik (LPDS 2016, Mongabay 2015) |
| **Subtotal CAPEX** | **4.879-5.280** | |
| **CAPEX + kontingensi 25%** | **6.099-6.600** | |

**OPEX per musim pilot (Jul-Okt, 3 kit):**

| Item | Rentang (Rp juta) | Dasar |
| --- | --- | --- |
| BBM: 6 pompa × 240 jam × 22 L = 31.680 L × Rp12.500-15.500 | 396-491 | 22 L/jam pabrikan; jam dan harga asumsi |
| Insentif regu tambahan: 3 regu × 15 orang × 60 hari × Rp150-250 ribu | 405-675 | regu 15 orang P.32/2016; tarif asumsi |
| Mobilisasi ke depot depan dan lokasi | 210-630 | asumsi (Rp70-210 juta per kit) |
| Evaluator independen dan analisis data | 400-800 | asumsi |
| Pemeliharaan 5-8% CAPEX | 244-422 | asumsi |
| **OPEX per musim** | **1.655-3.018** | |

**Total pilot dua musim:** Fase 0 Rp1,1-2,1 M + CAPEX Rp6,1-6,6 M + OPEX 2 musim Rp3,3-6,0 M = **Rp10,5-14,7 M**. Fitur platform (§5) dikerjakan di repo ini; bila dikontrakkan tambah Rp0,2-0,5 M [asumsi]. Personel inti (Manggala Agni, BPBD, YonTP) memakai gaji yang sudah ada.

Pembanding dokumen pemilik: S1 Portable Rp4,50 M CAPEX untuk satu lokasi tanpa lengan kontrol. Pilot di atas lebih mahal karena tiga lokasi, lengan A/B, dan studi tapak, yang semuanya diperlukan untuk menjawab GO/NO-GO.

### 4.2 Fase skala Kalteng (hanya bila G5 lulus, 2029-2033)

| Item | Rentang (Rp M) | Dasar |
| --- | --- | --- |
| 14 kit portabel (2 per kabupaten prioritas: Kapuas, Pulang Pisau, Palangka Raya, Katingan, Seruyan, Kotim, Kobar) | 16,75 | per kit di atas |
| 6 kit portabel tambahan dari dana koridor (keputusan 60), penempatan menurut pemakaian musim pilot dan Pemicu | 7,18 | Rp1,196 M per kit (16,75 / 14) |
| 7 depot (kontainer, tangki BBM, radio, alat, drone) | 3,84 | Rp549 juta/depot, asumsi |
| 60 sekat kanal di sel inti | 1,24-3,90 | Rp20,6-65 juta/unit |
| 300 sumur dangkal | 0,45-1,80 | Rp1,5-6 juta/titik |
| Pelatihan dan sertifikasi 300 personel (YonTP, Manggala Agni, MPA) | 0,50-1,00 | asumsi |
| **Subtotal CAPEX** | **29,9-34,4** | |
| **CAPEX + kontingensi 25%** | **37,4-43,1** | |

| OPEX per tahun | Tahun kering (Rp M) | Tahun basah (Rp M) |
| --- | --- | --- |
| BBM 40 pompa × 240 jam × 22 L | 2,64-3,27 | sekitar 20% |
| Pemeliharaan 5-8% perangkat | 1,40-2,20 | sama |
| Insentif 20 regu × 60 hari | 2,70-4,50 | latihan saja |
| Mobilisasi 20 kit | 1,40-4,20 | sebagian |
| Data dan evaluasi | 0,30-0,60 | sama |
| **Total** | **8,4-14,8** | **3,4-5,9** [asumsi 40% tahun kering] |

**TCO 5 tahun Kalteng** (2 tahun kering + 3 tahun basah, tanpa diskonto, tanpa nilai sisa, tanpa penggantian layflat): Rp37,4-43,1 M + Rp27,0-47,3 M = **Rp64-90 M**. BBM, insentif, dan mobilisasi diskala linear dari 14 ke 20 kit (keputusan 60); pemeliharaan dan data tetap.

Pembanding dokumen pemilik: TCO 5 tahun S3 Backbone saja Rp33,7 M untuk satu koridor 5 km; rencana nasional A1 Rp364 M.

### 4.3 Biaya metode lain yang bersumber

| Metode | Angka | Sumber/label |
| --- | --- | --- |
| Water bombing heli | > Rp200 juta per sorti satu jam | BNPB (Abdul Muhari), Sept 2023 [resmi, pernyataan, bukan kontrak] |
| Satu heli × 6 jam terbang/hari | sekitar Rp1,2 M per heli-hari | turunan; 6 jam/hari = asumsi platform `heli_jam_hari` |
| Armada water bombing 2026 | 33 heli nasional | rekap BNPB 12 Okt 2026 [resmi, belum dicek ke dokumen] |
| OMC | Rp2,3-2,5 M per provinsi per 10-12 hari | Kemenhut, rencana 2026 [resmi, berita] |
| Sekat kanal | Rp20,6 juta/unit | BRGM 2021 [resmi, berita] |
| Restorasi hidrologi | Rp12 juta/ha per 5 tahun | BRG 2016 [berita] |
| Sumur bor dangkal | Rp1,5-6 juta/titik | LPDS 2016, Mongabay 2015 |
| Regu darat konvensional | Rp2,25-3,75 juta per regu-hari; 0,5-2,8 ha/regu/hari | 15 orang × Rp150-250 ribu [asumsi tarif]; kasus Manggala Agni 2026 |

Cara membaca: TCO 5 tahun jaringan kit Kalteng (Rp64-90 M, 20 kit) setara sekitar 53-75 heli-hari, atau kurang dari dua hari operasi seluruh armada water bombing nasional. Ini **bukan** bukti kit lebih murah per ha, karena heli dan kit mengerjakan tugas berbeda. Ini hanya menunjukkan bahwa harga pilot kecil dibanding pengeluaran yang sudah terjadi, sehingga menguji dengan benar lebih murah daripada membeli besar lalu salah.

### 4.4 Ambang impas yang harus dibuktikan pilot

Biaya per ha dingin terverifikasi 30 hari = (CAPEX teramortisasi + OPEX + regu) / ha terverifikasi. Untuk regu konvensional: Rp0,8-7,5 juta/ha tenaga (Rp2,25-3,75 juta dibagi 0,5-2,8 ha) ditambah sumur [estimasi-model]. Kit layak bila penghematannya datang dari salah satu dari dua jalur ini, dan pilot harus mengukur keduanya:

1. **Produktivitas:** ha terverifikasi per regu-hari naik ≥ 30% (lebih sedikit hari regu, lebih cepat api besar selesai, lebih sedikit hari heli).
2. **Nyala ulang:** nyala ulang 30 hari turun ≥ 30% (lebih sedikit operasi ulang dan asap).

Tanpa salah satunya, kit hanyalah pompa dan selang tambahan, dan cukup dibeli lewat pengadaan rutin.

---

## 5. Integrasi dengan repo Pantau Bencana

### 5.1 Data yang sudah ada dan dipakai

| Kebutuhan kajian | Berkas repo | Status |
| --- | --- | --- |
| Riwayat api 24 tahun, sel 11 km | `public/data/riwayat_grid.json` (MODIS 2002-2025) | siap |
| Riwayat api VIIRS sel 5,5 km | `public/data/riwayat_sel/*.json` (2012-2026) | siap |
| Riwayat titik mentah untuk sel 2,2 km | `data/raw/firms/viirs*.csv` | siap, belum jadi lapisan |
| Kompleks aktif + koefisien operasi | `public/data/operasi.json` (`air_bara`, `bara_regu`, `biaya_bor`, `ha_per_bor`, `jam_tiba`, `m_per_drop`) | siap |
| Jarak ke sungai/kanal, akses rawa | `public/data/kendala.json`, `kanal.json` | siap (OSM, belum survei) |
| Waktu tempuh dari posko | `public/data/akses.json` | sebagian (185 kompleks nasional) |
| KHG dan prioritas | `public/data/khg_prioritas.json` | siap |
| Konsesi dan status lahan | `public/data/kompleks_konsesi.json`, `konsesi2026/` | siap |
| Posko dan Daops | `public/data/posko.json`, `daops.json` | siap |
| Pemicu kemarau | `fwi.json`, `fwi_ansambel.json`, `iklim_outlook.json`, `musim.json` | siap |
| Eskalasi api | `model_sebaran.json` | siap |
| Rekap resmi operasi | `operasi_resmi.json`, `luas_resmi.json` | siap, sebagian belum dicek ke dokumen BNPB |
| Indeks risiko karhutla | `data/kajian-bnpb/data/irbi/` | siap |
| Program terbukti, lembaga | `data/kajian-bnpb/data/program-terbukti/`, `lembaga/` | siap |

### 5.2 Data yang harus ditambah

- Profil elevasi DEMNAS per calon trase (sampling 5-20 m).
- Debit kemarau sungai dan kanal (BWS Kalimantan II), terutama Agustus-Oktober 2015, 2019, 2023, 2026.
- Ketebalan gambut dan muka air tanah (walidata KHG; data pemantauan TMA BRGM).
- Log operasi Manggala Agni/BPBD: personel, pompa, jam, volume air, luas padam, nyala ulang. Ini data paling berharga dan belum ada di mana pun secara terbuka.
- Harga e-katalog LKPP dan 3 penawaran per item utama.
- Waktu tempuh `akses.json` untuk semua kompleks Kalteng, bukan hanya 71.

### 5.3 Fitur platform yang diusulkan

| Fitur | Isi | Pengerja menurut AGENTS.md | Uji wajib (TEST.md) |
| --- | --- | --- | --- |
| Lapisan "kelayakan kit" per sel 2,2 km | kekerapan VIIRS, jarak air, akses, gambut, konsesi; skor transparan tanpa bobot rahasia | `pipa-data` (skrip) + `layar-peta` (lapisan) | self-check Python pada skrip agregasi; uji invarian (porsi sel ≤ 100%, kekerapan ≤ 14) |
| Kalkulator hidraulika di pop-up kompleks | pilih layflat DN65/100/150 atau HDPE OD, panjang, debit, elevasi dari DEMNAS; keluar head loss, tekanan ujung, BBM; peringatan bila tekanan ujung < 2 bar atau melewati rating | `layar-peta` | unit test fungsi murni (Hazen-Williams, ID dari OD-SDR) dengan nilai acuan tabel A4 |
| Saran sarana per kompleks | "selang + sumur dangkal" / "kit relay" / "butuh heli" berdasar `air_km`, `jam_tiba`, luas bara | `layar-peta` | unit test aturan; `selera-angka` untuk tampilan |
| Pemicu pra-posisi | bila `iklim_outlook`/`fwi_ansambel` melewati ambang kemarau, daftar depot dan sel yang perlu kit | `pipa-data` | uji invarian di skrip |
| Dashboard A/B | unggah CSV petak (lengan, probe suhu per kedalaman, volume air, regu-hari, nyala ulang); hitung selisih rata-rata dan 95% CI; tampilkan biaya per ha terverifikasi | `layar-peta` (statis, tanpa D1 dulu) | unit test statistik; bila nanti lewat worker/D1, uji integrasi route oleh `warga-api` |
| Log time-motion | form sederhana tiba, mulai gelar, air mengalir, per kelas medan; p50/p90 | mulai sebagai CSV di repo | self-check p50/p90 |

Yang sengaja tidak dibuat: model 3D Three.js (pemilik sudah punya, nilainya presentasi, bukan keputusan) dan telemetri real-time pipa (belum ada pipa).

---

## 6. Daftar yang harus dibuat bila GO

Urutan dan perkiraan waktu (mulai November 2026):

| No | Keluaran | Jenis | Kapan | Pemilik usulan |
| --- | --- | --- | --- | --- |
| 1 | Nota putusan pimpinan: setuju studi + pilot, tolak pembelian massal | dokumen | Nov 2026 | Staf ahli BNPB |
| 2 | Surat permintaan data ke BIG, BWS Kalimantan II, walidata KHG/BRGM, BMKG, BPBD Kalteng, Manggala Agni (template sudah ada di paket pemilik) | dokumen | Nov 2026 | BNPB |
| 3 | Lapisan kelayakan kit + pemilihan 3 AOI (G0) | platform + kajian | Nov-Des 2026 | repo ini |
| 4 | Survei tapak dan uji debit kemarau, piezometer (G1) | kajian lapangan | Des 2026-Apr 2027 | konsultan + BPBD |
| 5 | Kerangka Acuan Kerja pilot + protokol A/B pra-registrasi (4 lengan: konvensional, kit relay + lance, kit + surfaktan, sekat kanal/rewetting) | dokumen | Jan 2027 | BNPB + evaluator independen |
| 6 | Bench test pompa-layflat-lance (G2) | kajian uji | Feb-Apr 2027 | konsultan + Manggala Agni |
| 7 | FEED ringan kit relay: P&ID, daftar material, gambar kit, spesifikasi titik kerja | dokumen teknis | Mar-Apr 2027 | konsultan |
| 8 | RAB dengan e-katalog + 3 penawaran | dokumen | Apr 2027 | BNPB |
| 9 | SOP: gelar-bongkar relay, injeksi dangkal, probe dan kriteria dingin, BBM, K3 asap/CO, tutup katup lambat | dokumen | Apr-Mei 2027 | Manggala Agni + BNPB |
| 10 | MoU pinjam pakai BMN dengan YonTP/Kodam dan Daops; pelatihan operator | dokumen + latihan | Mei-Jun 2027 | BNPB + TNI + Kemenhut |
| 11 | Pengadaan 3 kit, kalkulator hidraulika dan log time-motion di platform | pengadaan + platform | Mei-Jun 2027 | BNPB + repo ini |
| 12 | Musim pilot 1: time-motion (G3), A/B, cek ulang 24 jam s.d. 30 hari | kajian lapangan | Jul-Nov 2027 | Satgas Karhutla Kalteng |
| 13 | Laporan antara + penempatan kit tambahan | dokumen | Des 2027-Jan 2028 | evaluator |
| 14 | Musim pilot 2 | kajian lapangan | Jul-Nov 2028 | Satgas |
| 15 | Evaluasi independen (G4/G5) dan grand design formal versi keputusan | dokumen | Des 2028-Mar 2029 | evaluator + BNPB |
| 16 | Bila lulus: rencana skala Kalteng 2029-2033, baru kemudian provinsi lain | dokumen | 2029 | BNPB |

Grand design formal ditulis **setelah** hasil pilot, bukan sebelumnya. Yang dibutuhkan sekarang adalah nota putusan, KAK pilot, dan protokol A/B.

---

## 7. Yang belum diketahui dan risiko utama

### 7.1 Belum diketahui

- Apakah injeksi dangkal dengan lance benar-benar lebih cepat atau lebih tuntas daripada semprot + tusuk biasa di lapangan. Bukti saat ini: satu uji lab (UI) dan satu uji lapangan (Palangka Raya 2021).
- Debit kemarau nyata di calon intake; tidak ada satu pun angka lokasi di dokumen pemilik.
- Volume bara per ha di kebakaran nyata (menentukan kebutuhan air).
- Waktu gelar nyata di gambut basah, kering, dan ambles.
- Data operasi Manggala Agni per insiden; tanpa ini lengan konvensional tidak punya garis dasar.
- Harga riil hampir semua item.
- Apakah pengambilan air dari kanal saat kemarau menurunkan muka air gambut di sekitarnya.

### 7.2 Risiko utama

| Risiko | Dampak | Penangkal |
| --- | --- | --- |
| Musim pilot basah (La Niña), terlalu sedikit api untuk A/B | G4 tidak bisa diputus | Kit portabel boleh dipakai di kebakaran mana pun di Kalteng; siapkan musim ke-3; jangan menyalakan gambut |
| Hasil A/B nol atau kecil | Kit tidak lebih baik dari pompa biasa | Itu hasil yang sah; berhenti dan hemat Rp30-40 M skala |
| Tekanan politik membeli besar sebelum hasil | Investasi terbenam | Nota putusan pimpinan dengan gerbang tertulis |
| Sumber air gagal di puncak kemarau | Kit kering di lokasi | G1 diukur di kemarau; sumur dangkal sebagai cadangan |
| Kecelakaan: ambles di gambut, CO, pipa pecah | Korban regu | SOP K3, monitor gas, uji tekanan, katup lambat, larangan masuk gambut tak tertopang |
| Pencurian | Kit tidak lengkap saat dibutuhkan | Gudang terkunci, QR, aset kembali ke gudang tiap selesai |
| Rotasi personel TNI | Keterampilan hilang | Operator inti dari Manggala Agni; TNI sebagai tenaga gelar; latihan tahunan |
| Konflik izin lahan konsesi/adat | Trase tidak bisa dipakai | Pilih AOI non-konsesi dulu; persetujuan tertulis sebelum survei |
| Surfaktan mencemari air gambut | Dampak ikan dan air warga | Produk bebas PFAS, zona larangan, sampel air hilir |
| Angka biaya pembanding (heli, OMC) diperdebatkan | Perbandingan dipersoalkan | Pakai hanya angka bersumber di §4.3; minta data kontrak BNPB untuk versi formal |

---

## Lampiran: angka repo yang dihitung ulang untuk berkas ini

- Kompleks Kalteng 2026 (`operasi.json`/`kendala.json`, per 12 Okt 2026): 865; gambut 644; jarak air ≤ 0,5 / 1 / 2 / 3 / 5 km = 11% / 36% / 63% / 74% / 86%; median 1,28 km; label "Jalan utama > 2 km" 733, "Sungai/kanal besar > 2 km" 322, "Akses sulit di rawa" 63.
- Kekerapan MODIS 0,1° (`riwayat_grid.json`) untuk kompleks Kalteng: ≥ 12 dari 24 tahun 410 kompleks; + gambut 313; + air ≤ 2 km 253.
- VIIRS S-NPP Kalteng selatan per tahun (keyakinan nominal/tinggi, api vegetasi): 2012 30.246; 2013 12.793; 2014 68.569; 2015 169.782; 2016 1.754; 2017 1.025; 2018 12.070; 2019 76.211; 2020 750; 2021 716; 2022 527; 2023 26.771; 2024 1.551; 2025 1.283.
- Luas terbakar resmi Kalteng (SiPongi, `luas_resmi.json`): 2019 317.749 ha; 2020 7.681 ha; 2021 3.653 ha; 2022 1.554 ha; 2023 165.896 ha; 2026 s.d. Juli 7.634 ha [resmi].
- Personel Kalteng 12 Okt 2026: 4.686 (TNI 1.403, Polri 762, BPBD 1.182, Manggala Agni 176); 4 Daops, 14 regu, 210 anggota [resmi, `operasi.json`].

Sumber web yang dipakai untuk biaya pembanding:

- [Medcom: BNPB menilai denda pelaku karhutla Bromo masih kurang (biaya water bombing > Rp200 juta per sorti satu jam)](https://www.medcom.id/nasional/peristiwa/0kpMpBLK-bnpb-menilai-denda-pelaku-karhutla-bromo-masih-kurang)
- [Katadata: Kemenhut siapkan 35 operasi modifikasi cuaca (Rp2,3-2,5 M per provinsi, 10-12 hari)](https://katadata.co.id/amp/ekonomi-hijau/investasi-hijau/69b79ca9203da/antisipasi-kemarau-panjang-kemenhut-siapkan-35-operasi-modifikasi-cuaca/)
- [Katadata: BNPB, water bombing tak efektif jika karhutla sudah membesar](https://katadata.co.id/berita/nasional/6aa2c51ec90dc/bnpb-water-bombing-tak-efektif-jika-karhutla-sudah-membesar)
