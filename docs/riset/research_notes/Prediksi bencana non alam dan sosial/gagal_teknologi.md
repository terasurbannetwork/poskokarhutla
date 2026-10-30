# Prediksi dan pemetaan risiko gagal teknologi dan gagal modernisasi (termasuk Natech) sebagai patokan untuk Centurisk97

Catatan riset, 29 Okt 2026. Cakupan: kegagalan teknologi atau modernisasi mana yang bisa DIPRAKIRAKAN (ada waktu tenggang dan sinyal pemicu) dan mana yang cuma bisa DIPETAKAN RISIKONYA (paparan statis). Hampir semua temuan bersumber dari hasil penelusuran web. Klaim yang hanya terlihat lewat ringkasan sekunder ditandai.

## 1. Natech (kecelakaan industri yang dipicu bahaya alam): RAPID-N, eNATECH, dan cara memetakan lokasi industri terhadap jejak bahaya

### Takeaway
Natech di tingkat gempa bisa dipetakan cukup baik kalau ada PGA di tiap lokasi industri dan kurva kerapuhan per jenis unit; itu inti RAPID-N. Model banjir RAPID-N baru sebatas prototipe. Untuk Indonesia belum ditemukan basis data Natech nasional, dan Palu 2018 hanya tercatat sebagai fasilitas yang berhenti beroperasi, tanpa catatan lepasan bahan kimia.

### Cited Findings
- RAPID-N adalah alat web JRC untuk penilaian cepat risiko Natech. Metodenya: perkirakan parameter bahaya di lokasi, pakai kurva kerapuhan untuk peluang rusak tiap unit pabrik, lalu hitung luas, keparahan, dan peluang kejadian Natech — [EGU2013-1246](https://meetingorganizer.copernicus.org/EGU2013/EGU2013-1246.pdf); [EGU2015-1410](https://meetingorganizer.copernicus.org/EGU2015/EGU2015-1410.pdf)
- Dokumen UBA (Jerman) 2019: RAPID-N beroperasi sejak 2012 dan tersedia publik. Bahaya yang matang baru gempa; banjir masih prototipe. Isinya: lebih dari 22.000 gempa, 5.500 pabrik (kilang, pembangkit), dan 64.000 tangki timbun dari sumber publik — [UBA, Methods for Natech risk assessment – RAPID-N (2019)](https://www.umweltbundesamt.de/sites/default/files/medien/376/dokumente/03-02_methods_for_natech_risk_assessment_-_rapid-n_20190914.pdf)
- Fase pertama prototipe banjir selesai 2015–2016, dan interoperabilitas EFAS/RAPID-N sedang dikerjakan (JRC105055). Kajian JRC tentang dispersi polutan di air banjir menjaring model tumpahan minyak untuk diintegrasikan, tetapi tidak ada model tumpahan bahan kimia yang layak — [IFRC PrepareCenter, RAPID-N introduction (2021)](https://preparecenter.org/wp-content/uploads/2021/04/Day-1-RAPID-N-Introduction.pdf); [JRC publications](https://publications.jrc.ec.europa.eu/repository/handle/JRC127375)
- Studi kasus RAPID-N: pelabuhan bebas Giurgiulesti (Moldova) dan fasilitas di Teluk Izmit (Turki) dengan skenario gempa Istanbul — [Univ. Twente](https://research.utwente.nl/en/publications/natech-risk-assessment-with-rapid-n-giurgiulesti-international-fr/)
- eNATECH adalah basis data JRC berisi kecelakaan dan nyaris-celaka Natech, terbuka dan gratis untuk dijelajahi; pengguna terdaftar bisa menambah catatan. Kolomnya: bahaya alam, fasilitas dan unit, faktor penyumbang, bahan, konsekuensi — [eNATECH](https://enatech.jrc.ec.europa.eu/view/site/6); [JRC Data Catalogue](https://data.jrc.ec.europa.eu/dataset/fb46d3f0-691a-4bd8-a611-be9eb5052cef). JRC tidak menjamin akurasi dan kelengkapan catatannya — [eNATECH](https://enatech.jrc.ec.europa.eu/view/site/39)
- Krausmann et al. (2011, Natural Hazards): untuk gempa, banjir, dan petir, unit paling rentan adalah pipa dan tangki timbun. Banjir menambah skenario pencemaran air dan pembentukan uap beracun. Natech berkisar 2–5% dari kecelakaan yang tercatat di basis data yang dianalisis — [cris.unibo.it](https://cris.unibo.it/handle/11585/66652); [presentasi Krausmann, JRC](https://minerva.jrc.ec.europa.eu/en/shorturl/european_neighbour_countries/trainingintroductionnatech_concept_and_raekrausmannpdf). JRC sendiri menyebut angka 5% itu kemungkinan terlalu rendah — (presentasi yang sama)
- WHO punya lembar panduan tentang lepasan bahan kimia akibat gempa — [WHO-CED-PHE-EPE-18.01](https://www.who.int/publications-detail-redirect/WHO-CED-PHE-EPE-18.01)
- Palu 2018 (M7,4–7,5 dengan tsunami): PLTU batu bara 66 MW dan depo BBM Pertamina dipastikan berhenti karena rusak; pembangkit lain dan dua tambang juga berhenti. Lepasan bahan berbahaya tidak disebut — [Industrial Info](https://www.industrialinfo.com/news/article/indonesia-industrial-facilities-offline-after-earthquake-tsunami-an-industrial-info-market-brief--266226)
- Analog terdokumentasi terbaik adalah Jepang 2011: banyak kilang, petrokimia, dan industri kimia rusak atau hancur — [Krausmann, IChemE](https://www.icheme.org/media/15301/krausmannnew.pdf)
- Global Energy Monitor (GEM) dan CREA (Jan 2026): captive coal Indonesia 31 GW (19,3 GW beroperasi, 3,6 GW konstruksi, 8,16 GW rencana). Ada 130 PLTU captive berkapasitas ≥30 MW yang beroperasi — [GEM press release](https://globalenergymonitor.org/press-release/31-gw-of-captive-coal-puts-indonesias-economy-emissions-targets-at-high-risk/); [CREA/GEM PDF](https://energyandcleanair.org/wp/wp-content/uploads/2026/02/EN-CREA_GEM_Indonesia-captive-coal-in-2025_REV.pdf). HEESI 2025 milik pemerintah mencatat lebih dari 28,5 GW kapasitas captive terpasang — [Ember](https://ember-energy.org/?p=26811)
- Global Coal Plant Tracker menyediakan data per pembangkit (koordinat dan status) — [GEM tracker](https://globalenergymonitor.org/projects/global-coal-plant-tracker/)

### Inferences
- Centurisk97 sudah punya GMPE+MMI. Langkah termurah ala RAPID-N adalah menghitung PGA di tiap titik OSM `landuse=industrial`, `man_made=storage_tank`, `power=plant`, dan `industrial=*`, ditambah lokasi GEM, lalu memberi flag dengan ambang kerapuhan tangki dari literatur. Itu bisa dikerjakan dengan Python stdlib (point-in-grid, interpolasi) di Actions. Hasilnya adalah pemetaan paparan pasca-gempa dalam hitungan menit setelah shakemap jadi, bukan prakiraan.
- Banjir × industri: tumpangkan jejak genangan atau status banjir dengan poligon industri, dengan perhatian khusus pada tangki dan gudang B3. Karena RAPID-N untuk banjir pun masih prototipe, keluarannya sebaiknya dibingkai sebagai "fasilitas terpapar", bukan "peluang lepasan".
- Kawasan nikel Morowali (IMIP) dan Weda Bay (IWIP) duduk di zona seismik aktif (lihat bagian 2) dan bisa menjadi kasus pertama "Natech per kawasan".

### Gaps
- Tidak ditemukan basis data Natech Indonesia, maupun entri eNATECH untuk Indonesia.
- Status RAPID-N 2026, termasuk apakah modul banjir sudah publik, tidak terkonfirmasi.
- Lisensi unduhan data GEM (apakah CC BY) tidak terkonfirmasi dari halaman yang ditemukan.
- Climate TRACE (data aset per fasilitas) tidak sempat diverifikasi.

## 2. Kegagalan bendungan dan tailing: risiko bendung dari hujan ekstrem, tailing nikel Sulawesi dan Maluku

### Takeaway
Kegagalan tailing nikel di IMIP Morowali kini berulang: 2025 setidaknya dua longsor (satu menewaskan 3 pekerja), Februari 2026 satu kematian lagi. Pemicu yang dikutip adalah desain dan kadar air, bukan semata hujan. Yang realistis bagi platform adalah memetakan risiko (lokasi TSF × hujan ekstrem × gempa) dan mendeteksi perubahan dari citra, bukan memprakirakan keruntuhan.

### Cited Findings
- 2025 di IMIP: fasilitas tailing PT Huayue Nickel Cobalt (HNC) jebol 16 Maret 2025, dan tailing mengalir ke Sungai Bahodopi. Fasilitas PT QMB runtuh 21/22 Maret 2025 dan menewaskan 3 pekerja; menurut pekerja, fasilitas itu dibangun di atas kolam yang diuruk — [Earthworks](https://earthworks.org/blog/multiple-dams-fail-at-indonesian-nickel-mining-facilities/); [Mongabay, Apr 2026](https://news.mongabay.com/2026/04/repeated-failures-expose-gaps-in-indonesias-nickel-waste-management/)
- 18 Feb 2026: area tailing PT QMB (tenant IMIP) runtuh dan seorang operator ekskavator tewas. Hidrogeolog Steven Emerman, yang meninjau video, menyebut likuifaksi akibat kontrol kadar air, pemadatan, dan drainase internal yang buruk. QMB menyalahkan "hujan sekali dalam 50 tahun" untuk kejadian 2025, dan Emerman membantahnya sebagai kegagalan desain — [Mongabay, Apr 2026](https://news.mongabay.com/2026/04/repeated-failures-expose-gaps-in-indonesias-nickel-waste-management/)
- Citra Google Earth 3 Jan 2025 sudah menunjukkan longsor lebih awal di fasilitas HNC yang sama — [Mongabay, Apr 2026](https://news.mongabay.com/2026/04/repeated-failures-expose-gaps-in-indonesias-nickel-waste-management/)
- HPAL menghasilkan sekitar 133 ton tailing per ton nikel. Produksi nikel naik dari 130 ribu ton (2015) ke 2,2 juta ton (2024). Kadar air tailing Indonesia bisa sekitar 35%, padahal tipikal di tempat lain sekitar 15%. Tercatat paling sedikit 435 gempa dangkal di Sulawesi Tengah 1961–2019 — [Mongabay, Apr 2026](https://news.mongabay.com/2026/04/repeated-failures-expose-gaps-in-indonesias-nickel-waste-management/)
- Laporan Earthworks (Maret 2026): bendungan tailing di Indonesia dibangun lebih tinggi dan berisi lebih banyak limbah dari yang aman, sementara gempa dan hujan lebat yang sering memperbesar risiko. Laporan itu menyerukan moratorium. Catatan: ini sumber advokasi — [Earthworks, Filtered tailings in Indonesia](https://earthworks.org/resources/filtered-tailings-in-indonesia-the-catastrophic-failure-of-a-disruptive-technology/)
- Harita (Pulau Obi): tinjauan SRK 2022 memperingatkan "uncontrolled risk", tetapi belum ada laporan kegagalan — [Mongabay, Apr 2026](https://news.mongabay.com/2026/04/repeated-failures-expose-gaps-in-indonesias-nickel-waste-management/)
- Ketua FINI: Indonesia hanya mengizinkan dry-stack untuk HPAL. Tekanan tailing pada kawasan industri bisa memuncak dalam 2–3 tahun — [Petromindo](https://www.petromindo.com/news/article/fini-warns-hpal-tailings-could-strain-indonesian-nickel-parks-within-three-years)
- Bendungan air: dokumen Bappenas mencatat 229 bendungan besar (197 dikelola PUPR), dengan 43 berusia di atas 50 tahun dan 119 berusia 20–50 tahun — [Bappenas](https://bappenas.go.id/files/25892e58-a71b-4174-ae8f-0811bdf7c07f/download). Per Mei 2023 PUPR mencatat 235 bendungan — [ANTARA](https://ambon.antaranews.com/berita/184431/bnpb-sebut-sebolnya-bendungan-raksasa-libya-dapat-dijadikan-alarm-indonesia). Balai Teknik Bendungan mencatat 244 bendungan teregistrasi per Agustus 2021 — [Unesa journal](https://journal.unesa.ac.id/index.php/proteksi/article/view/24140/9646). Angka-angka ini berbeda karena tahun dan definisinya berbeda.
- PP tentang Bendungan mendefinisikan pengamanan bendungan sebagai kegiatan sistematis untuk mencegah kegagalan bendungan — [PP Bendungan, DPR JDIH](https://berkas.dpr.go.id/jdih/document/pp/1649.pdf)
- BNPB menyebut jebolnya bendungan di Libya (Derna 2023) sebagai alarm bagi Indonesia — [ANTARA](https://ambon.antaranews.com/berita/184431/bnpb-sebut-sebolnya-bendungan-raksasa-libya-dapat-dijadikan-alarm-indonesia)

### Inferences
- Yang bisa dibangun dari data yang sudah ada: (a) poligon TSF digambar manual dari citra di kawasan IMIP, IWIP, Obi, dan Pomalaa; (b) hujan ensemble 72 jam dan akumulasi 3–7 hari di atas TSF tersebut; (c) PGA dari GMPE saat ada gempa. Keluarannya flag "TSF terpapar hujan ekstrem atau guncangan", dengan label pemetaan risiko, bukan prakiraan keruntuhan. Kegagalan 2025–2026 tetap terjadi walau penyebab utamanya desain, jadi hujan hanyalah pemicu yang mungkin.
- Bendungan air: tumpangkan titik bendungan (OSM `waterway=dam` atau daftar PUPR) dengan hujan ekstrem di DAS hulu. Tanpa data muka air waduk real-time, ini hanya pemetaan paparan.

### Gaps
- Isi Global Tailings Portal untuk Indonesia tidak ditemukan; HPAL Morowali dan Obi kemungkinan besar tidak ada di portal (dugaan, belum diverifikasi).
- Portal SIBENDUNGAN/PUPR dan ketersediaan data muka air waduk terbuka tidak terkonfirmasi.
- Tidak ada studi yang mengukur ambang hujan pemicu kegagalan TSF di Indonesia.

## 3. Pemadaman listrik: deteksi dengan Black Marble dan prediksi pemadaman akibat badai

### Takeaway
Pemadaman pasca-bencana bisa DIDETEKSI (bukan diprakirakan) dari VNP46A2 harian sekitar 500 m, dengan masalah utama awan. Prediksi pemadaman ala Guikema (random forest dari angin badai + data jaringan) matang di AS, tetapi bergantung pada data utilitas yang tidak dibuka PLN. Pemadaman Jawa–Bali 2019 adalah kegagalan sistem transmisi, bukan Natech.

### Cited Findings
- VNP46A2 adalah produk lampu malam harian sekitar 500 m (15 arc-detik). Salah satu metode deteksi: radiansi hari ini dibandingkan dengan baseline rata-rata tiga komposit bulanan VNP46A3 terakhir — [arXiv 2410.00017](https://arxiv.org/pdf/2410.00017)
- Studi pemadaman Florida memakai lapisan "Gap Filled DNB BRDF-Corrected NTL" dari VNP46A2 yang diunduh dengan BlackMarblePy — [Remote Sensing 15:4257](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-15-04257/article_deploy/remotesensing-15-04257.pdf)
- Wang et al. (2018, ISPRS) membingkai tujuannya sebagai memantau besar, luas, waktu, dan durasi kehilangan daya bersih untuk respons dan pemulihan — [ISPRS Archives XLII-3/1853/2018](https://isprs-archives.copernicus.org/articles/XLII-3/1853/2018/)
- Kendala utamanya awan: sulit membedakan pemadaman dari awan tebal, sehingga mitra NASA membuat komposit biru/kuning untuk menandai awan. Visualisasi Black Marble HD hanya untuk tampilan, bukan analisis kuantitatif — [NASA Disasters](https://disasters.nasa.gov/our-impact/news/new-black-marble-product-allows-quicker-detection-power-outages-wake-disasters); [NASA Black Marble product page](https://viirsland.gsfc.nasa.gov/Products/NASA/BlackMarble.html)
- BlackMarblePy (worldbank/blackmarblepy, MPL-2.0) mengunduh tile dari LAADS DAAC, mengubah HDF5 menjadi raster bergeoreferensi, dan menghitung statistik zonal. Repo ini sekitar 58 bintang dan terakhir di-push Mei 2026 menurut ecosyste.ms (angka pihak ketiga) — [PyPI](https://pypi.org/project/blackmarblepy); [docs](https://worldbank.github.io/blackmarblepy/api/blackmarble.data.html); [ecosyste.ms](https://ost.ecosyste.ms/projects/165621)
- Nateghi, Guikema & Quiring: model random forest memprakirakan pemadaman akibat siklon tropis sebelum pendaratan, dengan sedikit variabel. Versi yang hanya memakai data publik tetap "cukup akurat". Model tingkat tract sensus (SGHOPM) memakai data publik saja — [IDIES JHU](https://www.idies.jhu.edu/new-model-proposed-to-predict-power-outages-following-severe-storms/); [AMS 96th Annual, paper 288969](https://ams.confex.com/ams/96Annual/webprogram/Paper288969.html); [Insurance Journal 2009](https://amp.insurancejournal.com/news/national/2009/10/22/104733.htm). Tinjauan NHESS 2023 meringkas evolusi dari pohon keputusan dan GAM ke random forest — [NHESS 23:1665](https://nhess.copernicus.org/articles/23/1665/2023/nhess-23-1665-2023.pdf)
- Pemadaman Jawa–Bali 4 Agustus 2019: menurut PLN, gangguan sirkuit transmisi Ungaran–Pemalang terjadi saat satu jalur selatan sedang dipelihara, sehingga sistem terguncang. PLN menyangkal sabotase maupun gempa. Pemulihan di sebagian besar ibu kota memakan sekitar 9–12 jam; ada laporan sampai 24–36 jam — [Tempo](https://en.tempo.co/amp/1232132/pln-discloses-chronology-of-massive-blackout-in-jakarta-banten); [Republika](https://en.republika.co.id/berita/pvrafh382/pln-states-earthquake-and-sabotage-not-behind-the-blackout); [Al Jazeera](https://www.aljazeera.com/news/2019/8/4/power-restored-to-most-of-indonesia-capital-after-9-hour-blackout). Bareskrim menyelidiki kemungkinan serangan siber, dan hasilnya tidak ditemukan — [Bisnis](https://kabar24.bisnis.com/read/20190814/16/1136622/kabareskrim-polri-selidiki-kemungkinan-blackout-terjadi-akibat-serangan-siber)

### Inferences
- Untuk Centurisk97, deteksi pemadaman pasca-gempa, banjir, atau badai per kab/kota cukup dengan rasio radiansi hari-H terhadap baseline, dengan masker awan dari flag QA produk dan bobot pada area bangunan Open Buildings. Ini bisa ditulis dengan stdlib, tetapi pembacaan HDF5 butuh h5py (atau GeoTIFF dari LAADS). Pilihan termurah: workflow terpisah yang mengizinkan h5py, atau ekstraksi di tempat lain lalu commit JSON.
- Prakiraan pemadaman ala Guikema untuk Indonesia hampir mustahil tanpa data gangguan PLN per gardu. Yang realistis adalah proksi paparan: angin ekstrem 72 jam × kepadatan jaringan OSM `power=line` × bangunan.
- Indonesia jarang dilanda siklon tropis, jadi pemicu pemadaman yang relevan adalah gempa, banjir, petir, dan angin puting beliung. Literatur model badai AS tidak bisa ditransfer langsung.

### Gaps
- Latensi VNP46A2 (berapa hari setelah akuisisi) dan kinerjanya di tropis yang sering berawan tidak terkonfirmasi dari sumber.
- Tidak ada studi Black Marble untuk pemadaman 2019 atau untuk bencana di Indonesia yang ditemukan.
- Angka "21 juta pelanggan" untuk 2019 tidak terkonfirmasi.
- Metrik akurasi kuantitatif model Guikema tidak diambil dari makalah primer.

## 4. Kebakaran permukiman (kampung padat): data Jakarta dan kelayakan model risiko berbasis cuaca

### Takeaway
Penyebab dominan kebakaran permukiman di Jakarta adalah korsleting listrik (sekitar 61–66%), bukan cuaca. Prakiraan berbasis cuaca karenanya hanya memberi sinyal sekunder (musim kemarau, angin kencang yang memperluas api). Yang paling bisa dikerjakan adalah peta kerentanan statis (kepadatan bangunan Open Buildings, akses jalan) yang digabung dengan indeks kekeringan/angin harian.

### Cited Findings
- Gulkarmat DKI mencatat 144 kebakaran selama Ramadan 2024 (turun dari 150), terbanyak di Jakarta Timur (41). Sebanyak 90 disebabkan korsleting dan 46 terjadi di bangunan hunian — [merahputih.com](https://www.merahputih.com/post/read/144-kebakaran-terjadi-di-jakarta-selama-ramadan-paling-banyak-di-jaktim); [medcom.id](https://www.medcom.id/nasional/metro/Wb7R9ABN-terjadi-144-kebakaran-di-jakarta-selama-ramadan-2024-terbanyak-di-jaktim)
- Jan–Agu 2024: 61,12% kebakaran di Jakarta akibat korsleting — [Metro TV News](https://www.metrotvnews.com/read/NgxCVz8m-61-2-kebakaran-di-jakarta-akibat-korsleting-listrik). Laporan lain menyebut 490 kebakaran (322 korsleting), 750 rumah terbakar, dan 18 korban jiwa (data BPBD). Angka-angka ini tidak sepenuhnya cocok satu sama lain — [Metro TV](https://www.metrotvnews.com/play/kj2CnOoV-jakarta-waspada-kebakaran)
- Makalah berbasis BPS menyebut 65,82% akibat kelalaian listrik, tanpa tahun — [UTA'45 journal](https://journal.uta45jakarta.ac.id/index.php/km/article/download/7168/2861)
- Contoh kejadian: Kelurahan Tangki, Jakarta Barat, Sep 2025, ratusan rumah terbakar dengan dugaan penyebab korsleting — [RM.id](https://rm.id/baca-berita/megapolitan/283221/ratusan-rumah-di-kelurahan-tangki-terbakar-penyebab-diduga-korsleting-listrik)

### Inferences
- Sinyal satelit: VIIRS/FIRMS kadang menangkap kebakaran permukiman besar. Repo ini menyaring hotspot industri; hotspot di poligon permukiman padat bisa dipertahankan sebagai lapisan "kebakaran permukiman terdeteksi" (deteksi, bukan prakiraan).
- Model risiko yang jujur: kerentanan statis (kepadatan bangunan per sel dari Open Buildings, ukuran rata-rata bangunan kecil) × modulasi cuaca (hari kering berturut-turut, RH rendah, angin). Tanpa data kejadian per kelurahan untuk uji balik, angka peluang tidak bisa diklaim.

### Gaps
- Tidak ditemukan dataset terbuka kejadian kebakaran Jakarta per kelurahan dengan koordinat (Satu Data Jakarta belum dicek).
- Tidak ditemukan studi peer-reviewed tentang model kebakaran kota berbasis cuaca untuk Indonesia.

## 5. Polusi udara industri (smelter, SO2/NO2 Sentinel-5P) dan lumpur Lapindo

### Takeaway
Hotspot NOx industri dan smelter nikel di Indonesia sudah dipetakan CREA dari satelit (Agustus 2026: 29 hotspot NOx, 6 di kawasan nikel Sulawesi dan Malut). Studi SO2 satelit khusus Morowali tidak ditemukan. Lapindo (Lusi) adalah kasus pemantauan deformasi InSAR jangka panjang; tidak ditemukan sistem prakiraan jebol tanggul.

### Cited Findings
- CREA (Agustus 2026): analisis satelit memetakan 29 sumber titik NOx di Indonesia, yaitu kompleks PLTU dan gas, klaster industri sekitar Jakarta dan Jawa, serta pusat pengolahan nikel. Enam hotspot terkait nikel ada di Sulawesi dan Maluku Utara, dengan total NOx sekitar 43,5 kt. Kapasitas captive coal di provinsi penghasil nikel naik dari sekitar 3 GW (2019) ke 16 GW (2025) — [CREA press release PDF](https://energyandcleanair.org/wp/wp-content/uploads/2026/08/EN-CREA_Press-release_First-of-its-kind-satellite-based-analysis-reveals-29-hazardous-NOx-hotspots-across-Indonesia.docx.pdf); [tanahair.net](https://tanahair.net/?p=14450)
- CREA/CELIOS 2024: sampai 55.600 kematian dan USD 38,2 miliar kerugian bisa dihindari hingga 2060 bila standar udara ketat ditegakkan di pusat pengolahan Sulteng, Sultra, dan Malut — [BHRRC](https://www.business-humanrights.org/ru/свежие-новости/indonesia-new-study-challenges-economic-benefits-of-nickel-processing-highlights-health-and-environmental-costs/)
- TuK Indonesia dan Universitas Tadulako (2024) mengukur PM10, PM2.5, dan SO2 di darat pada 2023. Rata-ratanya di atas baku mutu di tiga desa dekat IMIP — [Mongabay ID](https://mongabay.co.id/2024/10/02/dampak-polusi-di-kawasan-industri-nikel-morowali/)
- IMIP memiliki 11 smelter dan disebut kawasan nikel terbesar di Indonesia — [BHRRC](https://www.business-humanrights.org/de/neuste-meldungen/indonesia-morowali-industrial-park-imip/). Juni 2025: Menteri LH menyoroti aktivitas di lahan seluas 1.800 ha di luar zona AMDAL IMIP — [Mysteel](https://www.mysteel.net/news/5090274-flash-morowali-industrial-park-pledges-reforms-after-environmental-warning)
- Data Puskesmas Wosu (dari pelaporan terkait WALHI): ISPA naik dari 735 kasus (2021) ke lebih dari 1.100 (2022, 2023). Ini klaim lokal, bukan atribusi peer-reviewed. GNI membantah — [tanahair.net/WALHI Sulteng](https://tanahair.net/walhi-central-sulawesi-launches-report-on-environmental-damage-from-nickel-industrys-captive-power-plants/); [BHRRC](https://www.bhrrc.org/ko/최신-뉴스/indonesia-four-chinese-invested-nickel-smelters-alleged-of-pollution-problems-from-captive-coal-power-plants-cos-did-not-respond/)
- Lapindo/Lusi: GPS dan InSAR 2006–2007 (Abidin dkk.) mengaitkan subsidensi dengan beban lumpur dan tanggul serta runtuhnya lapisan penutup; pengangkatan muncul 3–4 bulan setelah erupsi, terkait sesar Watukosek — [Plymouth research portal](https://researchportal.plymouth.ac.uk/en/publications/subsidence-and-uplift-of-sidoarjo-east-java-due-to-the-eruption-o/). ALOS PALSAR 2007–2009 mencatat subsidensi 5 sampai 16 cm dalam 17 bulan; DInSAR 2008–2011 mencatat 0 sampai −20 cm/tahun — [ITS Geoid](https://iptek.its.ac.id/index.php/geoid/article/download/1100/891). PS-InSAR Sentinel-1 2015–2019 mencatat pengangkatan rata-rata 5,46 mm/tahun di area gunung lumpur — [ITS scholar](https://scholar.its.ac.id/en/publications/surface-deformation-detection-due-to-mud-volcanoes-manifestation-/). Satu makalah menyebut subsidensi Porong bisa mencapai 0,5 m/tahun (sebagian terkait dua lapangan gas) dan memperingatkan banjir musim hujan — [JGEET](https://distantreader.org/stacks/journals/jgeet/jgeet-5149.pdf)
- LiCSBAS pada Sidoarjo 2017–2021 mencatat subsidensi sampai −200 mm/tahun, divalidasi GPS — [ITS scholar](https://scholar.its.ac.id/en/publications/small-baselines-techniques-of-time-series-insar-to-monitor-and-pr/)

### Inferences
- Lapisan "titik panas emisi industri" bisa diambil dari daftar sumber CREA atau GEM (statis) dan diperbarui dengan rata-rata bulanan TROPOMI NO2/SO2. Episode polusi harian dari smelter lebih tepat ditangani lewat model PM2.5 dan arah angin yang sudah ada (modul udara), dengan sumber titik industri sebagai input tambahan.
- Lapindo: pemetaan risiko melalui InSAR (laju subsidensi di sekitar tanggul) × hujan ekstrem 72 jam di kolam lumpur. Ambang jebol tidak ditemukan, jadi keluarannya flag paparan.

### Gaps
- Tidak ditemukan studi Sentinel-5P SO2 yang khusus untuk Morowali atau Weda.
- Tidak ditemukan dataset kejadian tanggul Lapindo jebol atau limpas dan kaitannya dengan hujan.
- Lisensi dan format unduhan data hotspot CREA belum dicek.

## 6. Gagal modernisasi: subsidensi tanah (Jakarta, Semarang, Pekalongan, pantura Jawa) dan TPA longsor

### Takeaway
Subsidensi adalah risiko gagal modernisasi yang paling terukur dan paling terpetakan di Indonesia (Sentinel-1/ALOS InSAR), tetapi angka antarstudi berbeda sampai beberapa kali lipat karena metode, periode, dan statistiknya berlainan. Subsidensi tidak "diprakirakan" harian; perannya adalah pengganda rob dan banjir (sudah ada modul rob). Longsor TPA Leuwigajah 2005 menunjukkan kombinasi hujan lebat dan ledakan biogas, kasus yang "bisa diduga" dari lereng curam dan pengelolaan buruk.

### Cited Findings
- Jakarta, rentang laju antarstudi: DInSAR 2019–2020 mencatat 1,8 sampai −10,7 cm/tahun — [BRIN karya](https://karya.brin.go.id/id/eprint/55449/); 2017–2019 mencatat rata-rata 3,4 cm/tahun di Jakarta Utara — [EGU21-14347](https://meetingorganizer.copernicus.org/EGU21/EGU21-14347.html?EGUsphere); DInSAR 2021 mencatat −0,7 sampai −2,3 cm di pesisir — [JEAP UNP](https://jeap.ppj.unp.ac.id/index.php/jeap/article/view/14); poster U-Tokyo mencatat maksimum 10–20 mm/tahun — [U-Tokyo poster](https://wtlab.iis.u-tokyo.ac.jp/images/research_poster/Arbad_poster_2024.pdf). Angka tambahan (sampai 15 cm/tahun pada Sidiq dkk. 2025; maksimum 5,64 cm/tahun pada Ohenhen dkk. 2026; Pluit −3,99 cm/tahun) hanya terlihat lewat situs sekunder tak dikenal — [demolab-id (sekunder, belum diverifikasi)](https://demolab-id.duckdns.org/jakarta/article). Angka-angka itu harus dicek ke makalah asli sebelum dipakai.
- ITB (studi seluruh Jawa, Sentinel-1 2017–2023): "Java is sinking". Studi MT-InSAR 2025 melaporkan subsidensi kumulatif Karawang −1.795 mm, Cilacap −902 mm, dan Madiun −742 mm, melebihi pesisir Jakarta — [ITB FITB](https://multisite.itb.ac.id/fitb/java-is-sinking-a-silent-crisis-beneath-our-feet/); [ringkasan studi Jawa](https://ojs.srce.hr/rgn/article/view/32883)
- Pekalongan: PS-InSAR ALOS-2 2014–2022 mencatat 10–19 cm/tahun dengan kesesuaian 83% terhadap data lapangan — [Urban Science, Des 2024](https://www.mdpi.com/2413-8851/8/4/234/htm). CORS 2015–2019 mencatat −122,54 mm/tahun, tetapi tidak signifikan secara statistik — [J. Applied Geodesy 2025](https://www.degruyterbrill.com/document/doi/10.1515/jag-2025-0014/html)
- Semarang dan Demak: maksimum 100–120 mm/tahun — [IJAEOG, Des 2023](https://doaj.org/article/bc659cefcb624b38a679829477d8e2d1). Sentinel-1 2020–2024 di Semarang Utara mencatat sampai −0,23 m/tahun di zona pesisir (angka sangat tinggi, perlu verifikasi silang), dengan pemicu pengambilan air tanah, aluvium lunak, dan pembangunan — [UGM](https://ir.lib.ugm.ac.id/id/eprint/24662/)
- Keterbatasan: keluaran LiCSBAS adalah perpindahan LOS, bukan vertikal; pemisahan butuh lintasan ascending + descending — [ITS scholar](https://scholar.its.ac.id/en/publications/small-baselines-techniques-of-time-series-insar-to-monitor-and-pr/); [UGM ETD](https://etd.repository.ugm.ac.id/penelitian/detail/248943)
- Leuwigajah, 21 Feb 2005: longsor sampah sekitar 2,7 juta m³ meluncur sekitar 1.000 m, menimbun 71 rumah, dan menewaskan 143 orang (sumber lain menyebut 150–157). Penyebabnya hujan lebat + ledakan biogas beruntun. Penulis menilai bencana itu dapat diduga dari lereng curam, pengelolaan buruk, dan pemulung di bawahnya — [Lavigne dkk. 2014, Geoenvironmental Disasters](https://geoenvironmental-disasters.springeropen.com/track/pdf/10.1186/s40677-014-0010-5); [HAL](https://hal.archives-ouvertes.fr/hal-01262274); [ANTARA (157 jiwa)](https://en.antaranews.com/news/274617/how-indonesia-fighting-waste-crisis)

### Inferences
- Lapisan subsidensi sebaiknya statis dan diperbarui tahunan dari produk jadi (velocity LiCSAR/COMET), bukan diproses sendiri. Gunanya untuk mengoreksi elevasi efektif pada modul rob/banjir dan untuk peringkat kab/kota pantura.
- TPA: titik OSM `landuse=landfill` × hujan ekstrem 72 jam × kemiringan (DEM) memberi flag paparan. Untuk TPA besar (Bantargebang, Sarimukti, Suwung, dan lain-lain) ini bisa dipantau, tetapi tanpa data tinggi timbunan tidak ada ambang yang tervalidasi.

### Gaps
- Tidak ada produk subsidensi nasional resmi setara EGMS untuk Indonesia yang ditemukan.
- Ketersediaan frame LiCSAR (cakupan Indonesia, pembaruan) tidak terkonfirmasi.
- Tidak ditemukan data runtuhnya gedung (building collapse) yang terstruktur, juga kegagalan tanggul laut atau giant sea wall.

## 7. Kecelakaan transportasi terkait cuaca (kapal penyeberangan, penerbangan, kereta)

### Takeaway
Kecelakaan kapal yang dipicu gelombang adalah kelas gagal teknologi yang paling bisa dikaitkan dengan prakiraan, karena BMKG sudah memakai ambang per jenis kapal (feri: angin >21 knot, gelombang >2,5 m). Ini prakiraan bahaya untuk operasi, bukan prakiraan kecelakaan. Penerbangan dan kereta tidak sempat diteliti.

### Cited Findings
- Ambang risiko BMKG untuk kapal feri: kecepatan angin >21 knot dan tinggi gelombang >2,5 m (contoh Jatim 2024) — [ANTARA Jatim](https://jatim.antaranews.com/berita/832798/pelayaran-laut-di-jatim-waspada-gelombang-tinggi-hingga-4-meter); [Medcom](https://www.medcom.id/english/national/GNGmOlLk-high-waves-likely-to-occur-in-indonesian-waters-on-december-14-15-bmkg)
- Ilyas dkk. (2025, Australian Journal of Maritime and Ocean Affairs; salah satu penulisnya pejabat BMKG) menganalisis dua kecelakaan kapal 2022 dengan WAVEWATCH III + altimeter + ASCAT. Satelit konsisten dengan model: gelombang saat kejadian sangat tinggi — [T&F](https://www.informahealthcare.com/doi/full/10.1080/18366503.2024.2343190); [Unhas](https://discover.unhas.ac.id/publications/an-investigation-of-sea-state-conditions-at-the-time-of-ship-accidents-in-indone)
- KMP Tunu Pratama Jaya (Selat Bali): BMKG menyebut bibit siklon 91S menaikkan angin dan gelombang; tinggi gelombang terukur tidak disebut — [Jakarta Post](https://www.thejakartapost.com/tag/boat-accident/page/2)
- Senopati Nusantara (2006–2007, Laut Jawa): gelombang sampai sekitar 12 kaki (sekitar 3,7 m). Penyidik menduga air masuk ke dek mobil — [CBS](https://www.cbsnews.com/news/waves-bad-design-sunk-indonesia-ferry); [NBC](https://www.nbcnews.com/id/wbna16477168)

### Inferences
- Modul cuaca ekstrem 72 jam bisa ditambah lapisan "lintasan feri × gelombang/angin di atas ambang BMKG" (rute dari OSM `route=ferry`), dengan sumber gelombang dari Open-Meteo Marine atau BMKG. Itu peringatan operasi, dan kejujurannya terletak pada label "ambang BMKG", bukan "peluang kecelakaan".

### Gaps
- Tidak ditemukan kajian yang mengaitkan skill prakiraan Ina-WIS BMKG dengan kecelakaan tertentu.
- Penerbangan (turbulensi/CB) dan kereta (longsor/banjir di rel) tidak diteliti karena keterbatasan anggaran pencarian.

## 8. Alat open-source dan portabilitasnya ke Python stdlib + GitHub Actions

### Takeaway
Alat yang ada (BlackMarblePy, LiCSBAS, MintPy) semuanya butuh numpy/GDAL/h5py, jadi tidak cocok dengan pipeline stdlib. Polanya: konsumsi produk jadi (velocity LiCSAR, keluaran VNP46 yang sudah diekstrak, daftar aset GEM/CREA), atau jalankan alat berat di workflow terpisah yang hanya meng-commit JSON ringkas.

### Cited Findings
- BlackMarblePy: Python, MPL-2.0, PyPI `blackmarblepy`, sekitar 58 bintang (ecosyste.ms), unduh paralel dengan retry, keluaran xarray, statistik zonal. Padanan R-nya `blackmarbler` — [PyPI](https://pypi.org/project/blackmarblepy); [ecosyste.ms](https://ost.ecosyste.ms/projects/165621)
- LiCSBAS: Python3 + bash, time series InSAR dari interferogram LiCSAR yang tersedia gratis di portal COMET-LiCS. Repo asli (yumorishita/LiCSBAS) tidak diperbarui sejak 2022 dan mengarahkan pengguna ke LiCSBAS2 atau versi COMET — [GitHub redirect](https://redirect.github.com/yumorishita/LiCSBAS); [Morishita dkk. 2020, Remote Sensing](https://doaj.org/article/f38d357bad6b4155ba31f6166c4ccb59)
- COMET menyediakan aplikasi web velocity time series dan detail struktur produk LiCSAR — [COMET LiCS velocities](https://comet.nerc.ac.uk/comet-lics-portal-velocities); [LiCSAR product details](https://comet.nerc.ac.uk/comet-lics-portal-product-details/)
- Studi Indonesia yang memakai LiCSBAS/COMET-LiCS: Sidoarjo, Bandar Lampung 2015–2023, Bandara YIA, pesisir Tegal — [ITS](https://scholar.its.ac.id/en/publications/small-baselines-techniques-of-time-series-insar-to-monitor-and-pr/); [UPI GEA](https://ejournal.upi.edu/index.php/gea/article/download/71315/29168); [UGM ETD](https://etd.repository.ugm.ac.id/penelitian/detail/279177)

### Inferences
- Peringkat portabilitas, dari termudah: (1) daftar aset statis (GEM, CREA, OSM) → stdlib, langsung jalan; (2) velocity LiCSAR GeoTIFF → butuh pembaca TIFF (tidak ada di stdlib), jadi lakukan sekali secara lokal dan simpan JSON per kab/kota; (3) VNP46A2 harian → h5py, sehingga butuh workflow sendiri; (4) pemrosesan InSAR penuh (MintPy/LiCSBAS) → tidak layak di Actions gratis, cukup konsumsi produk.
- Ringkasan kemampuan prediksi yang jujur:
  - Bisa diprakirakan (berjam-jam sampai 3 hari): paparan feri terhadap gelombang/angin; paparan TSF, bendungan, dan TPA terhadap hujan ekstrem; polusi industri × arah angin.
  - Bisa dideteksi cepat pasca-kejadian: pemadaman (Black Marble), fasilitas industri terguncang (PGA × kerapuhan ala RAPID-N), kebakaran permukiman besar (FIRMS).
  - Hanya bisa dipetakan risikonya (statis/tahunan): subsidensi, kerentanan kebakaran kampung, sebaran captive coal/smelter, kondisi bendungan tua.
  - Tidak bisa diprakirakan dari data terbuka: keruntuhan TSF tertentu, pemadaman sistemik ala 2019, runtuhnya gedung.

### Gaps
- Jumlah bintang dan status MintPy, serta jumlah bintang LiCSBAS utama, tidak terkonfirmasi.
- Tidak ditemukan repo open-source khusus Natech (implementasi kurva kerapuhan tangki) yang siap pakai.
- Sistem Indonesia yang sudah ada untuk gagal teknologi (misalnya modul BNPB InaRISK untuk kegagalan teknologi, atau sistem KLHK untuk B3) tidak sempat diverifikasi.
