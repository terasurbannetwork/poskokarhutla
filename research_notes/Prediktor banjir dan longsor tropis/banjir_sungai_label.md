# Prediktor & metode banjir sungai/regional (kab × hari, tenggang 1–3 hari) dan penanganan label bias

Catatan riset subagent, 3 Nov 2026. Anggaran ~16 panggilan alat; banyak angka efek-ukuran yang diminta TIDAK ditemukan dalam bentuk delta AUC/CSI untuk skala kabupaten-harian tropis. Itu sendiri temuan: literatur skala ini tipis. Tanda **[ingatan, belum dicek ulang sesi ini]** = berasal dari pengetahuan model, sitasi kemungkinan besar benar tapi angka harus diverifikasi sebelum dipakai di layar/dokumen.

Legenda kolom "proyek": SUDAH = sudah dipakai proyek; BARU = belum dipakai.

## 1. Prediktor mana yang memberi kenaikan skill terbesar untuk kejadian banjir harian di skala unit administratif? Mana yang dibesar-besarkan?

### Takeaway
Hampir tidak ada studi peer-review yang melaporkan delta AUC/ETS/BSS per prediktor untuk banjir harian tingkat kabupaten di tropis. Bukti terkuat yang ada: (a) curah hujan sendirian adalah prediktor lemah untuk banjir — kondisi basah anteseden mengubah peluang ekstrem-hujan→ekstrem-debit dari 13% ke 62%; (b) debit sungai hasil model (GloFAS/Google) mendeteksi banjir berdampak tingkat distrik dengan POD rendah–sedang (0,33–0,5) tapi FAR rendah; (c) di studi Indonesia berlabel BNPB, curah hujan selalu fitur terpenting tetapi kelas sangat timpang (≈3% hari banjir per kota, 0,077% per rekaman).

### Cited Findings
- **Hujan ekstrem ≠ banjir ekstrem (US, CONUS):** hanya 36% kejadian presipitasi ekstrem menghasilkan debit ekstrem; naik ke 62% bila kelembapan anteseden di atas median, turun ke 13% bila di bawah median. Ivancic & Shaw (2015), *Climatic Change* 133(4):681–693, doi:10.1007/s10584-015-1476-1. Angka dikutip lewat komentar sekunder, belum dari teks asli — [IDEAS record](https://ideas.repec.org/a/spr/climat/v133y2015i4p681-693.html); [komentar yang mereproduksi angka (Univ. Melbourne)](https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/50f8b366-048c-571d-b4dd-12f0752725f5/content). Proyek: hujan 3 hari vs persentil SUDAH, kelembapan tanah ERA5 SUDAH — bukti ini mendukung interaksi hujan×kelembapan, bukan aditif. (Interaksi eksplisit: kemungkinan BARU — cek kode.)
- **Ukuran DAS mengubah pendorong:** pada DAS >1000 km² debit banjir lebih dipengaruhi kelembapan tanah anteseden; pada DAS kecil hujan pendorong utama (studi DAS pegunungan lembap; dirangkum mesin cari, sumber primer tidak dibuka) — [HESS preprint hess-2021-531](https://hess.copernicus.org/preprints/hess-2021-531/hess-2021-531-ATC3.pdf).
- **Ambang hujan turun seiring kelembapan tanah naik di wilayah lembap**, tapi hanya sedikit di wilayah semi-kering (flash flood, DAS pegunungan) — [ResearchGate: Rainfall threshold determination for flash flood warning ... antecedent soil moisture](https://www.researchgate.net/publication/326330474_Rainfall_threshold_determination_for_flash_flood_warning_in_mountainous_catchments_with_consideration_of_antecedent_soil_moisture_and_rainfall_pattern).
- **Norbiato et al. (2008), J. Hydrology:** kondisi saturasi anteseden secara signifikan memengaruhi koefisien limpasan kejadian; mendukung soil moisture dalam peringatan flash flood operasional — [ScienceDirect S0022169408004587](https://www.sciencedirect.com/science/article/abs/pii/S0022169408004587).
- **Analog tropis (longsor, Idukki, India):** ambang probabilistik hujan + kebasahan tanah AUC 0,96, lebih baik dari ambang hujan saja (angka delta tidak tersedia di cuplikan) — [ScienceDirect S0341816221000060](https://www.sciencedirect.com/science/article/abs/pii/S0341816221000060).
- **Indonesia, Jakarta, harian, label DIBI BNPB:** 4.134 hari, 132 hari banjir (≈3,2%); LSTM, RF, hibrida LSTM-RF hanya dengan hujan; penulis menyimpulkan akurasi metrik lemah untuk kejadian langka dan model hujan-saja butuh kalibrasi ambang hati-hati — [INTEC, journal.unm.ac.id](https://journal.unm.ac.id/index.php/INTEC/article/view/13107).
- **Indonesia, 33 provinsi, harian, Random Forest, label BNPB:** prediktor hujan, rasio hutan, debit; hujan fitur terpenting; diuji Juni 2022 — [KSEEG 2023, doi:10.9719/EEG.2023.56.1.65](https://www.kseeg.org/journal/view.html?doi=10.9719%2FEEG.2023.56.1.65).
- **Indonesia, XGBoost vs logistik:** 1.513.505 rekaman cuaca, 1.165 kejadian banjir (0,077%) — [JSAI, jurnal.umb.ac.id](https://jurnal.umb.ac.id/index.php/JSAI/article/view/9867).
- **Logistik Banten/DKI/Jabar:** akurasi 85,05–94,39% dengan variabel terrain + tutupan lahan + hujan (akurasi tidak informatif pada kelas timpang) — [ResearchGate 337179700](https://www.researchgate.net/publication/337179700_Prediction_of_flood_areas_using_the_logistic_regression_method_case_study_of_the_provinces_Banten_DKI_Jakarta_and_West_Java).
- **Debit model vs label dampak tingkat distrik (Uganda, Katakwi):** pemicu GloFAS hazard-only POD 0,33; versi berbasis dampak (GloFAS + kalender tanam) POD 0,42; keduanya tanpa alarm palsu; label DesInventar + EM-DAT 2007–2018 — Weather, Climate, and Society 15(3), 2023, [doi:10.1175/WCAS-D-22-0089.1](https://doi.org/10.1175/WCAS-D-22-0089.1).
- **Mali, tingkat distrik (Kuipers et al. 2026, J. Flood Risk Mgmt):** evaluasi GloFAS v3.0/v4.0 dan Google Flood Hub vs data dampak distrik pakai POD/FAR; Flood Hub POD 0,5 dan FAR 0,0 untuk distrik Djenné (dari ringkasan mesin cari; halaman penerbit 403, angka lain tidak terbaca) — [doi:10.1111/jfr3.70247](https://onlinelibrary.wiley.com/doi/10.1111/jfr3.70247).
- **Protokol Palang Merah Uganda:** GloFAS dipakai sebagai pemicu 5 hari, diaktifkan hanya di lokasi dengan FAR ≤ 0,5 — [ResearchGate: A model for impact-based flood early warning and anticipatory actions in Uganda](https://www.researchgate.net/publication/372345174_A_model_for_impact-based_flood_early_warning_and_anticipatory_actions_in_Uganda).

### Inferences
- Yang kemungkinan **dibesar-besarkan**: hujan-saja (tanpa kondisi anteseden) dan prediktor statis susceptibility (HAND, kemiringan, tutupan) — prediktor statis hanya memindahkan base rate antar-kabupaten, yang sudah ditangkap offset klimatologi kab×bulan proyek; nilai tambahnya untuk *kapan* banjir harian kemungkinan kecil. (Inferensi, belum ada studi yang mengukur ini di skala kab-harian.)
- Yang kemungkinan **berbobot besar**: interaksi hujan × kebasahan anteseden (bukti 13% vs 62%), dan debit hulu terhadap ambang (POD rendah tetapi FAR sangat rendah → baik sebagai "penguat keyakinan", bukan penangkap semua kejadian).
- Debit GloFAS hanya relevan untuk kabupaten di DAS besar; untuk kabupaten DAS kecil/pesisir hujan intensitas tinggi lebih menentukan (inferensi dari temuan ukuran DAS).

### Gaps
- Tidak ditemukan studi tropis yang melaporkan delta AUC/ETS/BSS per penambahan prediktor (ablation) untuk banjir harian tingkat kabupaten. Proyek sendiri kemungkinan sumber bukti terbaik (uji ablation pada uji balik sendiri).
- Efek MJO/ENSO/IOD dan pasang astronomis pada skill harian 1–3 hari: tidak ditemukan angka dalam sesi ini.
- Bukti untuk ESA-CCI / SMAP vs ERA5 soil moisture untuk banjir di Indonesia: tidak ditemukan.

## 2. Indeks kebasahan anteseden (API, SWI, SMAP/ESA-CCI), baseflow tropis, persistensi muka air: mana yang terbaik?

### Takeaway
Bukti kualitatif konsisten bahwa kebasahan anteseden penting (terutama DAS besar dan iklim lembap), tetapi tidak ada perbandingan langsung API vs SWI vs SMAP vs ESA-CCI untuk kejadian banjir tropis yang ditemukan. Persistensi debit/muka air (yang proyek sudah pakai lewat debit GloFAS e-7..e-2) adalah baseline wajib.

### Cited Findings
- Kondisi basah anteseden menaikkan peluang hujan-ekstrem→debit-ekstrem dari 13% (kering) ke 62% (basah) — Ivancic & Shaw 2015, lihat §1 ([IDEAS](https://ideas.repec.org/a/spr/climat/v133y2015i4p681-693.html)).
- DAS >1000 km²: kelembapan anteseden lebih menentukan; DAS kecil: hujan — [HESS hess-2021-531](https://hess.copernicus.org/preprints/hess-2021-531/hess-2021-531-ATC3.pdf).
- Korea, flash flood bendungan: RF membangun deret kelembapan tanah representatif DAS (satelit + darat) dan menetapkan kombinasi ambang kelembapan × indeks hujan per DAS (AUC tidak tersedia di cuplikan) — [MDPI Water 18(8):909](https://www.mdpi.com/2073-4441/18/8/909).
- **[ingatan, belum dicek ulang sesi ini]** Berghuijs et al. (2019), *Geophysical Research Letters*, doi:10.1029/2019GL082383 — di Eropa, kelebihan air tanah/kelembapan (soil moisture excess) lebih sering menjadi mekanisme pembangkit banjir tahunan daripada hujan ekstrem saja.
- **[ingatan, belum dicek ulang sesi ini]** Wasko & Nathan (2019), *J. Hydrology* 575:432–441 — tren debit banjir tidak mengikuti tren hujan ekstrem karena turunnya kelembapan anteseden.

### Inferences
- Bentuk yang disarankan literatur adalah **ambang hujan yang bergeser menurut kebasahan** (threshold conditional on SM), bukan menambah SM sebagai fitur linear terpisah. Proyek punya ambang intensitas-durasi per kabupaten (SUDAH) — membuatnya tergantung kelas kebasahan ERA5 adalah langkah BARU berbiaya kecil.
- API (indeks hujan anteseden berbobot peluruhan) praktis setara dengan "hujan anteseden" yang sudah dipakai; manfaat tambahan SMAP/ESA-CCI di atas ERA5 diduga kecil di tropis lembap karena tanah sering mendekati jenuh di musim hujan (inferensi; tidak terbukti).

### Gaps
- Tidak ada angka perbandingan API vs SWI vs SMAP vs ESA-CCI untuk banjir tropis yang ditemukan.
- Baseflow tropis tanpa salju dan persistensi muka air (data AWLR/PDAM/BBWS) sebagai prediktor: tidak ditemukan studi terkuantifikasi.

## 3. ML vs logistik/ambang di tropis miskin data: kapan kompleksitas membantu?

### Takeaway
Keunggulan ML yang besar terbukti untuk **pemodelan debit** dengan data global masif (Google LSTM: tenggang 5 hari setara/lebih baik dari nowcast GloFAS di DAS tak terukur). Untuk **klasifikasi kejadian harian berlabel dampak** dengan ratusan positif per wilayah, studi yang ada tidak menunjukkan keunggulan ML yang terukur secara jujur; banyak yang melapor akurasi/AUC tinggi yang menyesatkan.

### Cited Findings
- **Nearing et al. (2024), *Nature* 627:559–563, doi:10.1038/s41586-024-07145-1:** model AI (LSTM) mencapai keandalan untuk kejadian sungai ekstrem di DAS tak terukur pada tenggang 5 hari yang setara atau lebih baik dari nowcast (tenggang 0) GloFAS; akurasi pada kejadian periode ulang 5 tahun setara/lebih baik dari akurasi saat ini pada periode ulang 1 tahun; operasional di >80 negara — [IDEAS record](https://ideas.repec.org/a/nat/nature/v627y2024i8004d10.1038_s41586-024-07145-1.html); [Google Research](https://research.google/pubs/ai-increases-global-access-to-reliable-flood-forecasts/).
- **Mali, tingkat distrik:** Google Flood Hub POD 0,5, FAR 0,0 di Djenné vs data dampak; makalah membandingkan GloFAS v3/v4 dan Flood Hub — [Kuipers et al. 2026, doi:10.1111/jfr3.70247](https://onlinelibrary.wiley.com/doi/10.1111/jfr3.70247).
- **AUC menyesatkan pada kejadian langka:** model flash flood dengan akurasi 93% dan AUC >0,98 bisa sekaligus gagal mendeteksi 65% kejadian banjir; peringkat AUC tidak sesuai kinerja deteksi operasional — [Scientific Reports 2026, s41598-026-50358-9](https://www.nature.com/articles/s41598-026-50358-9).
- **Jakarta DIBI (3,2% hari positif):** LSTM/RF/hibrida hanya-hujan; kesimpulan utama penulis adalah kalibrasi ambang, bukan keunggulan arsitektur — [INTEC](https://journal.unm.ac.id/index.php/INTEC/article/view/13107).
- **Hibrida XGBoost-RF vs EFAS (skala DAS, bukan distrik):** FAR 0,13 vs 0,69 EFAS (arXiv, belum peer-review) — [arXiv 2601.09336](https://arxiv.org/pdf/2601.09336).
- **[ingatan, belum dicek ulang sesi ini]** Kratzert et al. (2019), *Water Resources Research* 55, doi:10.1029/2019WR026065 — LSTM regional di DAS tak terukur (CAMPS) mengungguli model konseptual yang dikalibrasi per DAS; kuncinya pelatihan pada ratusan DAS sekaligus.

### Inferences
- Kompleksitas membantu ketika (a) targetnya kontinu (debit) dan (b) data latih berasal dari ribuan unit/tahun. Untuk label kejadian banjir per kabupaten Indonesia (DIBI), jumlah positif per kab terlalu kecil; pendekatan proyek (logistik + partial pooling per pulau + offset klimatologi + Platt) adalah pilihan yang sesuai literatur. ML yang berpotensi menang di sini adalah **mengonsumsi output ML hidrologi pihak ketiga (Google Flood Hub) sebagai prediktor** — BARU.
- Gradient boosting dengan pooling global (semua kab) bisa diuji sebagai pembanding, tetapi wajib dinilai dengan metrik kejadian langka (PR-AUC, BSS, POD/FAR), bukan AUC/akurasi.

### Gaps
- Tidak ditemukan studi head-to-head ML vs logistik berpooling untuk banjir harian tingkat kabupaten di tropis dengan metrik yang tepat.

## 4. Informasi ensemble (probabilitas ECMWF ENS, sebaran) dan blending multi-model

### Takeaway
Probabilitas ensemble GloFAS di Asia Tenggara terbukti **terlalu yakin (overconfident)** saat diverifikasi terhadap observasi (Myanmar), sehingga probabilitas mentah perlu dikalibrasi. Ambang bergantung-tenggang menurunkan FAR dengan harga POD. Angka kenaikan skill dari ENS vs deterministik untuk kejadian banjir tingkat distrik tidak ditemukan sesi ini.

### Cited Findings
- **Myanmar & Filipina:** reforecast GloFAS menunjukkan probabilitas yang terlalu yakin secara signifikan di Myanmar di lokasi berdata debit; verifikasi pakai hit rate & FAR — [Weather and Climate Extremes 2021, S2212094721000232](https://www.sciencedirect.com/science/article/pii/S2212094721000232).
- **Bangladesh (Hossain et al. 2025, JFRM, doi:10.1111/jfr3.12959):** ambang yang bergantung tenggang memperbaiki FAR sambil menurunkan POD — [Wiley](https://onlinelibrary.wiley.com/doi/full/10.1111/jfr3.12959).
- **Harrigan et al. (2023), HESS 27:1–19:** reforecast ensemble debit harian GloFAS; skill bervariasi per lokasi, sebagian DAS tanpa skill atau skill negatif — [PDF CentAUR](https://centaur.reading.ac.uk/106766/9/hess-27-1-2023.pdf).
- **GloFAS-Seasonal v1.0 (Emerton et al. 2018, GMD 11:3327):** di beberapa stasiun Asia Tenggara prakiraan berpotensi berguna sampai 3–4 bulan; korelasi Mekong R 0,6–0,7 di musim kemarau — [GMD](https://gmd.copernicus.org/articles/11/3327/2018/).
- **[ingatan, belum dicek ulang sesi ini]** Coughlan de Perez et al. (2016), *HESS* 20:3549–3560, doi:10.5194/hess-20-3549-2016 — kerangka "action-based forecasting": memilih ambang probabilitas & tenggang dengan menimbang biaya tindakan vs FAR yang dapat diterima.

### Inferences
- Untuk proyek: fitur BARU yang murah = **fraksi anggota ENS di atas ambang** (debit GloFAS > Q2, atau hujan IFS-ENS > persentil lokal), lalu dikalibrasi Platt (SUDAH). Sebaran ensemble mentah sebagai fitur tambahan kemungkinan bernilai kecil setelah fraksi-lewat-ambang dipakai (inferensi).
- Blending GloFAS + Google Flood Hub per kabupaten adalah blending multi-model paling realistis; bukti Mali menunjukkan keduanya punya POD/FAR berbeda (BARU).

### Gaps
- Angka BSS/CSI ENS vs deterministik pada tenggang 1–3 hari di Indonesia/Asia Tenggara: tidak ditemukan.

## 5. Metode untuk label kejadian bias/kurang-terlapor

### Takeaway
Label dari inventaris resmi (DIBI, DesInventar, EM-DAT, DFO) bias terhadap kejadian besar & daerah terjangkau; label satelit (MODIS GFD) jauh lebih tidak lengkap (<30% dari kejadian DFO). Dua sumber baru yang menjanjikan: Google **Groundsource** (2,6 juta kejadian dari berita, terbuka di Zenodo) dan PU-learning. Efek terukur pada skill prakiraan harian belum dipublikasikan secara independen.

### Cited Findings
- **Groundsource (Google Research, 12 Mar 2026):** Gemini mengekstrak 2,6 juta kejadian banjir historis dari berita, >150 negara, 2000–kini, 80 bahasa; validasi manual: 60% kejadian akurat lokasi & waktu, 82% berguna untuk analisis; menangkap 85–100% kejadian banjir parah GDACS 2020–2026; dipakai melatih LSTM prakiraan flash flood perkotaan hingga 24 jam (sel ~20 km²) — [Blog Google Research](https://research.google/blog/introducing-groundsource-turning-news-reports-into-data-with-gemini/); paper [doi:10.31223/X5RR2K](https://doi.org/10.31223/X5RR2K) (EarthArXiv preprint, belum peer-review); dataset [doi:10.5281/zenodo.18647053](https://doi.org/10.5281/zenodo.18647053); paper prakiraan [doi:10.31223/X5177S](https://doi.org/10.31223/X5177S); resolusi & keterbatasan radar dari [TechCrunch](https://techcrunch.com/2026/03/12/google-is-using-old-news-reports-and-ai-to-predict-flash-floods/). Proyek: BARU (label tambahan/silang untuk DIBI).
- **Global Flood Database (Tellman et al. 2021, *Nature* 596:80–86, doi:10.1038/s41586-021-03695-w):** 913 kejadian 2000–2018 dari 12.719 citra MODIS Terra/Aqua; punya band jumlah hari cerah per kejadian (QA state_1km) — [Earth Engine catalog](https://developers.google.com/earth-engine/datasets/catalog/GLOBAL_FLOOD_DB_MODIS_EVENTS_V1). Kejadian MODIS <30% dari >3000 kejadian DFO pada periode sama — [ESSD 15:521, 2023](https://essd.copernicus.org/articles/15/521/2023/). Implikasi: sebagai label harian di Indonesia (awan tebal musim hujan) sangat tidak lengkap.
- **Hossain/Uganda/Mali:** label dampak tingkat distrik dari DesInventar + EM-DAT dipakai untuk menilai pemicu — [doi:10.1175/WCAS-D-22-0089.1](https://doi.org/10.1175/WCAS-D-22-0089.1).
- **PU-learning, banjir perkotaan (Land 2022, 11(11):1971):** inventaris banjir umumnya hanya-positif; negatif yang diambil dari area tanpa catatan rawan salah label; bila set uji juga PU, AUC relatif masih bisa memeringkat model tapi nilai absolutnya lebih kecil dari nilai sebenarnya — [doi:10.3390/land11111971](https://doi.org/10.3390/land11111971).
- **PU-learning, longsor (Chamoli, India, 2024):** PU menaikkan AUC dan recall di semua eksperimen, terbesar pada recall — [Geoenvironmental Disasters, s40677-024-00281-w](https://link.springer.com/article/10.1186/s40677-024-00281-w).
- **[ingatan, belum dicek ulang sesi ini]** de Bruijn et al. (2019), *Scientific Data* 6:311, doi:10.1038/s41597-019-0326-9 — basis data banjir global historis & real-time dari Twitter (Floodtags/VU), deteksi berbasis lonjakan cuitan berlokasi.
- **[ingatan, belum dicek ulang sesi ini]** Bekker & Davis (2020), *Machine Learning* 109:719–760, doi:10.1007/s10994-020-05877-5 — survei PU-learning; asumsi SCAR (label diambil acak dengan peluang konstan c), estimasi c memungkinkan koreksi p(y=1|x)=p(s=1|x)/c.

### Inferences
- **Offset tingkat-pelaporan** (BARU): bila peluang terlapor c bervariasi per kabupaten/tahun (mis. tumbuh seiring digitalisasi DIBI, lebih rendah di kab terpencil), model logistik bisa diberi offset log(c_kab,tahun) atau kovariat pelaporan (kepadatan penduduk, akses berita) yang **hanya dipakai saat pelatihan** dan dinolkan saat prediksi bahaya. Ini analog SCAR per-strata (inferensi dari Bekker & Davis; tidak ada studi banjir yang mengukurnya).
- **Silang-label DIBI × Groundsource** memberi estimasi kasar c per kabupaten: kejadian di Groundsource yang tidak di DIBI → bukti kurang-terlapor (inferensi; Groundsource sendiri 60% akurat lokasi+waktu, jadi perlu toleransi ±1 hari dan buffer kabupaten).
- Karena label bias ke kejadian besar, AUC/Brier yang dihitung pada DIBI meremehkan FAR sebenarnya rendah — "alarm palsu" sebagian adalah kejadian tak terlapor. Laporkan skor dua kali: label DIBI saja dan label gabungan (inferensi).

### Gaps
- Tidak ada studi peer-review yang mengukur kenaikan skill prakiraan harian setelah menambahkan label berita/media sosial (Groundsource masih preprint; klaim belum diverifikasi independen).
- GFM (Copernicus Global Flood Monitoring, Sentinel-1) sebagai label: tidak sempat diteliti; secara prinsip SAR tidak terhalang awan, lebih cocok untuk Indonesia daripada MODIS (inferensi).

## 6. Praktik verifikasi untuk kejadian langka

### Takeaway
Gunakan SEDI (atau EDI) bersama bias frekuensi, POD/FAR per kejadian dengan jendela toleransi waktu, PR-AUC dan BSS terhadap klimatologi; jangan pakai akurasi/AUC sebagai bukti utama.

### Cited Findings
- **Ferro & Stephenson (2011), *Weather and Forecasting* 26:699–713, doi:10.1175/WAF-D-10-05030.1:** ukuran tradisional (ETS, dll.) runtuh ke nilai trivial saat kejadian makin langka; EDI/SEDI menghindarinya. SEDI dihitung dari hit rate H dan false alarm rate F memakai suku logaritma — [Exeter ORE](https://ore.exeter.ac.uk/repository/handle/10871/8521); [PDF](https://ore.exeter.ac.uk/repository/bitstream/10871/8521/2/Extremal%20Dependence%20Indices%20-%20Improved%20Verification%20Measures%20for%20Deterministic%20Forecasts%20of%20Rare%20Binary%20Events.pdf).
- SEDI komplemen-simetris, rentang [-1,1] — [COSMO report](https://www.cosmo-model.org/content/tasks/pastProjects/aware/report2_2.pdf); disarankan dipisah dari bias frekuensi — [COSMO 2016 slides](https://www.cosmo-model.org/content/consortium/generalMeetings/general2016/wg5/WG5parallelSEEPS-Gofa.pdf); dipakai ECMWF untuk verifikasi presipitasi ekstrem — [ECMWF Tech Memo 2014](https://www.ecmwf.int/sites/default/files/elibrary/2014/10909-verification-extreme-weather-events-discrete-predictands.pdf).
- AUC >0,98 bisa disertai 65% kejadian tak terdeteksi — [Sci. Reports 2026](https://www.nature.com/articles/s41598-026-50358-9).
- Pemicu dampak dinilai dengan POD & FAR; Palang Merah Uganda menetapkan FAR ≤ 0,5 sebagai syarat aktivasi — [ResearchGate 372345174](https://www.researchgate.net/publication/372345174_A_model_for_impact-based_flood_early_warning_and_anticipatory_actions_in_Uganda); [doi:10.1175/WCAS-D-22-0089.1](https://doi.org/10.1175/WCAS-D-22-0089.1).
- Dengan label PU, nilai absolut AUC lebih kecil dari sebenarnya; gunakan hanya untuk memeringkat — [doi:10.3390/land11111971](https://doi.org/10.3390/land11111971).

### Inferences
- Untuk proyek: jendela toleransi ±1 hari (tanggal DIBI sering tanggal lapor, bukan tanggal mulai) dan penilaian berbasis kejadian (beberapa hari berturut di satu kab = satu kejadian) kemungkinan mengubah POD/FAR secara material; disarankan dihitung keduanya, ketat dan bertoleransi (inferensi).
- Rapor sebaiknya memuat: BSS vs klimatologi kab×bulan (baseline proyek), PR-AUC, POD/FAR/SEDI pada ambang operasional, dan reliability diagram per pulau.

### Gaps
- Tidak ditemukan pedoman peer-review spesifik untuk jendela toleransi waktu verifikasi banjir berbasis dampak (misalnya ±1 vs ±2 hari); **[ingatan, belum dicek ulang]** Nearing et al. 2024 menilai kejadian dengan jendela toleransi beberapa hari — cek bagian Methods sebelum dikutip.

## Ringkasan BARU (belum dipakai proyek), urut perkiraan manfaat/biaya
1. Ambang hujan bergantung kelas kebasahan (interaksi hujan × SM ERA5) — bukti 13% vs 62%.
2. Fraksi anggota ENS di atas ambang (GloFAS ENS / IFS-ENS) + kalibrasi; perhatikan overconfidence di Asia Tenggara.
3. Google Flood Hub sebagai prediktor/blend kedua di samping GloFAS.
4. Groundsource (Zenodo) sebagai label silang → estimasi tingkat-pelaporan per kab → offset pelaporan saat latih.
5. SEDI + POD/FAR berbasis kejadian dengan toleransi ±1 hari di rapor; PR-AUC menggantikan AUC sebagai metrik ranking.
6. GFM Sentinel-1 sebagai label pelengkap (belum diteliti).
