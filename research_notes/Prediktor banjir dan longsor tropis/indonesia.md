# Studi Indonesia: prediktor & metode banjir / longsor, data lokal, dan yang belum dipakai proyek

Catatan riset (3 Nov 2026). Sebagian besar angka diambil dari abstrak/ringkasan mesin cari karena teks penuh MDPI & ScienceDirect menolak fetch (HTTP 403). Angka yang hanya dari abstrak ditandai "[abstrak]". Makalah konferensi (IOP EES, AIP Conf Proc, EGU abstract) ditandai "[konferensi]" — kekakuan metodologinya terbatas.

## 1. Ambang hujan banjir dan longsor di Indonesia — nilai dan validasi

### Takeaway
Untuk longsor ada ambang nasional operasional (Balai Sabo/PUPR, ILEWS) berbasis hujan kumulatif 1 hari dan 3 hari, plus banyak ambang I–D lokal; validasinya kebanyakan ROC pada data Jawa. Untuk banjir, ambang hujan resmi yang dipublikasikan hampir tidak ada — studi Ciliwung menunjukkan ambang regresi stasiun lemah (R² 25–34%), dan IBF BMKG baru mulai menurunkan "impact-based rainfall threshold".

### Cited Findings
**Longsor**
- Sistem peringatan dini longsor nasional (ILEWS, Balai Sabo, 2017) memakai SATU ambang nasional dari hujan kumulatif 1 hari dan 3 hari: 61 mm (1 hari) dan 91 mm (3 hari), diturunkan dari 83 kejadian yang sebagian besar di Jawa [abstrak/ringkasan]. — Hidayat R. dkk. 2019, *Development of a Landslide Early Warning System in Indonesia*, Geosciences 9(10):451, doi:10.3390/geosciences9100451 — [MDPI](https://www.mdpi.com/2076-3263/9/10/451)
- Revisi: 420 kejadian longsor di Jawa, hujan anteseden 1 dan 3 hari dari GPM (satelit), empat metode penurunan ambang dibandingkan dengan ROC; metode ke-4 terbaik dan "akan dipakai sebagai ambang baru Balai Sabo-ILEWS". Alasan revisi: satu ambang nasional menurunkan akurasi. Nilai ambang baru tidak tertangkap di ringkasan — perlu dibaca di teks penuh. — Yuniawan R.A., Rifa'i A., dkk. (termasuk Hidayat R.) 2022, *Revised Rainfall Threshold in the Indonesian Landslide Early Warning System*, Geosciences 12(3):129, doi:10.3390/geosciences12030129 — [MDPI](https://www.mdpi.com/2076-3263/12/3/129); [DOAJ](https://doaj.org/article/60a9d83cd01d405fa847b7b4086ada32)
- Ambang I–D nasional berbasis satelit: 220 kejadian pemicu longsor, hujan TRMM, I = 7,83·D^−0,328 untuk durasi 2–18 hari, divalidasi ROC [abstrak; bab buku/konferensi]. — *Development of Landslide Early Warning System Based on the Satellite-Derived Rainfall Threshold in Indonesia* (Springer, WLF 2020) — [Springer](https://link.springer.com/chapter/10.1007/978-3-030-60311-3_26); [U Twente](https://research.utwente.nl/en/publications/development-of-landslide-early-warning-system-based-on-the-satell/)
- Ambang lokal Banjarmangu (Banjarnegara, Jateng): I = 43,2·D^−0,87, plus ambang kumulatif 3 hari vs 15 hari dan indeks kelembapan tanah anteseden; label dari catatan BPBD [abstrak]. — [Academia](https://www.academia.edu/90148059/Rainfall_threshold_and_soil_moisture_indexes_for_the_initiation_of_landslide_in_Banjarmangu_sub_district_central_Java_Indonesia)
- Ambang per kelas kerentanan (DAS Tinalah, Kulon Progo): zona tinggi I = 54,988·D^−0,77 untuk 2–7 hari hujan anteseden; divalidasi dengan pemodelan numerik satu kejadian (bukan statistik skill). — Journal of Applied Geology 6(2) 2021, hlm. 112–118 — [UGM](https://journal.ugm.ac.id/jag/article/download/59185/32947)
- Karangkobar: intensitas lebih berkorelasi dengan ketidakstabilan lereng daripada durasi; usulan ambang peringatan >8 jam dengan kumulatif 45,6 mm [ringkasan mesin cari; sumber primer tidak diverifikasi].
- Ambang "dinamis" (jendela hujan berbasis kejadian, GSMaP) diusulkan karena ambang durasi tetap terbatas [preprint]. — [Research Square](https://www.researchsquare.com/article/rs-3018950/v1.pdf)
- Abstrak EMS 2021: sistem nasional memakai ambang generik 1 & 3 hari; diusulkan ambang lokal dinamis dari hujan resolusi lebih tinggi [konferensi]. — [EMS2021-339](https://meetingorganizer.copernicus.org/EMS2021/EMS2021-339.html)

**Banjir**
- Ciliwung hulu (IPB, data 1996–2008): ambang hujan dari regresi linear berganda 183 mm (Gunung Mas), 176 mm (Citeko), 149 mm (Katulampa); model lain 125 mm di Katulampa; R² hanya 33,6% dan 24,6%; penulis menyimpulkan MLR "tidak cocok dikembangkan untuk peringatan dini banjir". — [Repositori IPB](https://repository.ipb.ac.id/handle/123456789/57651?show=full)
- Puncak debit di Bendung Katulampa mencapai pusat Jakarta dalam 13–14 jam (jendela tenggang yang dipakai); LSTM dengan data satelit Sadewa diklaim memprediksi TMA Katulampa "akurat" (angka tidak tertangkap). Model terdistribusi lain: NSE 56,81% di Katulampa. Februari 2007: 122 mm/hari di Katulampa. — [ITB Hidrografi](https://hidrografi.gd.itb.ac.id/can-we-predict-jakartas-floods-a-hydrological-model-brings-hope/); [MDPI Water 14(9):1469](https://www.mdpi.com/2073-4441/14/9/1469)
- Jakarta 31 Des 2019–1 Jan 2020: 377 mm/hari di Halim Perdanakusuma, 335 mm di TMII; dicirikan tertinggi sejak pencatatan 1866 (Kompas/PNNL) — BMKG menyebut terburuk sejak 2007 (340 mm). Sumber bertentangan soal kelangkaan. — [Jakarta Post](https://www.thejakartapost.com/news/2020/01/01/not-ordinary-rain-worst-rainfall-in-over-decade-causes-massive-floods-in-jakarta); [PNNL](https://www.pnnl.gov/publications/record-breaking-precipitation-indonesias-capital-jakarta-early-january-2020-linked)
- Kalimantan Selatan Jan 2021: hujan intens 10–19 Jan, total 672,8 mm; 14 Jan 255,3 mm/hari (> periode ulang 100 tahun); pasang purnama puncak 1,21 m pada 15 Jan memperparah. — *Hydro-Meteorological Aspects of the 2021 South Kalimantan Flood: Topography, Tides, and Precipitation* — [ResearchGate](https://www.researchgate.net/publication/354995470_HYDRO-METEOROLOGICAL_ASPECTS_OF_THE_2021_SOUTH_KALIMANTAN_FLOOD_TOPOGRAPHY_TIDES_AND_PRECIPITATION). Studi Banjarmasin berbasis CHIRPS mendapat maksimum harian Januari hanya 83,83 mm — CHIRPS sangat meremehkan puncak stasiun (ringkasan mesin cari).

### Inferences
- [inferensi] Ambang longsor yang direncanakan proyek (intensitas-durasi) punya pembanding resmi: 61/91 mm (1/3 hari) ILEWS dan versi revisi 2022; layak dipakai sebagai baseline yang diuji balik lawan DIBI/NASA GLC.
- [inferensi] Selisih CHIRPS 84 mm vs stasiun 255 mm (Kalsel) memperingatkan: produk grid kasar (ERA5 ~25–31 km, CHIRPS) akan meremehkan puncak harian; ambang persentil per sel (P95/P99 relatif klimatologinya sendiri) lebih tahan daripada ambang mm absolut dari studi stasiun.
- [inferensi] Kombinasi hujan + pasang (Kalsel 2021) mendukung fitur gabungan hujan × rob untuk kab pesisir/dataran banjir yang sudah sebagian ada di proyek.

### Gaps
- Nilai ambang revisi Yuniawan 2022 dan skor ROC/AUC-nya tidak terbaca (403).
- Tidak ditemukan ambang banjir resmi BPBD/BMKG untuk Bandung/Citarum, Semarang, atau Bengawan Solo dengan validasi terbit dalam waktu riset ini.

## 2. BMKG Impact-Based Forecasting, radar/QPE, dan verifikasi peringatan BMKG–BNPB

### Takeaway
IBF BMKG memakai hujan (GPM-IMERG) sebagai bahaya dan indeks kerentanan/kapasitas InaRISK sebagai dampak; verifikasi dikotomis melaporkan 74% dari 172 kejadian terantisipasi, kuat untuk kelas berat/signifikan, lemah untuk kelas minor. Verifikasi peringatan cuaca ekstrem BMKG di Kalsel memberi PSS 0,21–0,31 dengan alarm palsu berlebih. BMKG menargetkan peringatan berbasis dampak operasional mulai 2026.

### Cited Findings
- Model IBF Indonesia diverifikasi dikotomis terhadap 172 kejadian bencana tercatat; 74% berhasil diprediksi, terbaik pada kategori severe & significant. — *On the Development of the Impact-Based Forecast Model in Indonesia*, Springer 2024, doi:10.1007/978-981-97-0740-9_24 — [Springer](https://link.springer.com/chapter/10.1007/978-981-97-0740-9_24); [Edinburgh](https://www.research.ed.ac.uk/en/publications/on-the-development-of-the-impact-based-forecast-model-in-indonesi/)
- Purnama D.R. (BMKG/Edinburgh), Tett S., Doherty R., Pramuwardani I. — EGU25-7271 [konferensi]: Jawa 2014–2023, bahaya = GPM-IMERG, kerentanan & kapasitas = InaRISK; "promising skill" untuk banjir signifikan/berat, perlu perbaikan untuk minor/minimal; tidak ada angka skill di abstrak. Slide: bobot kerentanan InaRISK 40% sosial, 25% fisik, 25% ekonomi, 10% lingkungan; klasifikasi dampak dari FGD BMKG–BPBD–UCL. — [Abstrak](https://meetingorganizer.copernicus.org/EGU25/EGU25-7271.html); [Slide](https://presentations.copernicus.org/EGU25/EGU25-7271_presentation.pdf)
- Febrianti A.S., Hasanuddin, Syahruddin M.H. 2024, *Verification of BMKG early warning related to flood disaster in South Kalimantan*, AIP Conf Proc 2774:050002, doi:10.1063/5.0164647 [konferensi; 29 hari pengamatan, 6 wilayah]: PSS 0,2054 ± 0,1153 (parameter pertama) dan presipitasi PSS 0,3077 ± 0,1223; kesimpulan: terlalu banyak alarm palsu. — [AIP](https://pubs.aip.org/aip/acp/article-abstract/2774/1/050002/3310407/Verification-of-BMKG-early-warning-related-to)
- Studi BMKG (Jakarta, GFS): GFS lebih baik menggambarkan peluang RH, suhu, CAPE, dan kecepatan vertikal daripada hujan pada kejadian banjir. — [Climago BMKG](https://ejournal-pusdiklat.bmkg.go.id/index.php/climago/article/view/25)
- BMKG mengembangkan sistem peringatan dini berbasis dampak untuk diterapkan mulai 2026; hambatan utama = peta kerentanan daerah yang lebih rinci. — [ANTARA](https://en.antaranews.com/news/397474/bmkg-to-launch-impact-based-disaster-warnings-in-2026); [BMKG–UGM](https://www.bmkg.go.id/berita/bmkg-dan-ugm-bahas-kolaborasi-penguatan-peringatan-dini-cuaca-berbasis-dampak)
- Radar: tinjauan 2024 menyebut 42 radar cuaca terintegrasi; makalah 2017 menyebut 41; jaringan belum menutup seluruh wilayah; atenuasi C-band membatasi QPE ke 100–150 km. Sistem integrasi radar BMKG = InaRAISE. — *A Review of Rainfall Estimation in Indonesia: Data Sources, Techniques, and Methods*, Signals 5(3) 2024, doi:10.3390/signals5030030 — [DOI](https://doi.org/10.3390/signals5030030); [InaRAISE](https://www.researchgate.net/publication/334905678_The_Indonesia_In-House_Radar_Integration_System_InaRAISE_of_Indonesian_Agency_for_Meteorology_Climatology_and_Geophysics_BMKG_Development_Constraint_and_Progress)
- Contoh kepadatan lokal: radar C-band Tangerang (radius 50 km) — 32 penakar otomatis (17 ARG + 15 AWS), tinggal 13 setelah kontrol mutu. — [GeoScienceEd 7(3) 2026](https://jpfis.unram.ac.id/index.php/GeoScienceEdu/article/download/2661/1773/17172)
- InaSAFE/forecast-based financing (GFDRR 2020) — prototipe IBF berbasis InaSAFE untuk banjir. — [GFDRR](https://www.gfdrr.org/sites/default/files/Inasafe-ForecastBasedFinancingFinalReportJune2020.pdf)

### Inferences
- [inferensi] Proyek sudah memakai InaRISK + CAP nowcast BMKG, jadi arsitekturnya sejajar dengan IBF BMKG (bahaya hujan × kerentanan InaRISK). Pembeda yang bisa ditawarkan: verifikasi prospektif terbuka (BMKG belum mempublikasikan POD/FAR per kelas).
- [inferensi] PSS 0,2–0,3 dengan alarm palsu tinggi untuk peringatan BMKG Kalsel adalah baseline realistis: model proyek yang mencapai PSS > 0,3 per kab sudah setara/lebih baik daripada peringatan resmi di studi itu (n kecil, 29 hari).

### Gaps
- Tidak ada akses publik ke produk QPE radar BMKG (mosaik CMAX tersedia sebagai gambar di situs, bukan grid numerik) yang terkonfirmasi lewat sumber — perlu dicek manual.
- Jumlah ARG/AWS BMKG terbaru tidak terverifikasi (lihat §5).

## 3. ENSO/IOD/MJO, seruakan dingin, Borneo vortex, CCKW sebagai prediktor

### Takeaway
MJO fase 3–4 menaikkan peluang hujan ekstrem harian >50% di sebagian besar Indonesia, fase 5–6 menurunkannya ~40–70% di Jawa & Kalimantan; seruakan dingin menambah hujan 10–100% (10–50% di Jakarta), hingga ~150% bila bersamaan MJO aktif. La Niña dan IOD negatif meningkatkan frekuensi banjir/longsor; ENSO pengatur lebih kuat daripada IOD.

### Cited Findings
- MJO: fase aktif 3–4 menaikkan peluang hujan ekstrem harian >50% di sebagian besar Indonesia; fase tertekan 5–6 menurunkan ~40–70% di Jawa dan Kalimantan. — *Impacts of the Madden Julian Oscillation on Precipitation Extremes in Indonesia* — [arXiv 2007.10574](https://arxiv.org/pdf/2007.10574)
- Seruakan dingin 2012–2013: anomali hujan positif 10–100% di Indonesia, 10–50% di lintasan Jakarta. — *Role of cold surge and MJO on rainfall enhancement over Indonesia during East Asian winter monsoon* — [ResearchGate](https://www.researchgate.net/publication/325188948_Role_of_cold_surge_and_MJO_on_rainfall_enhancement_over_indonesia_during_east_asian_winter_monsoon)
- Seruakan dingin saat MJO aktif dapat menaikkan hujan hingga 150%. — [ResearchGate](https://www.researchgate.net/publication/313937303_Impacts_of_Boreal_Winter_Monsoon_Cold_Surges_and_the_Interaction_with_MJO_on_Southeast_Asia_Rainfall)
- Jakarta Jan 2020: Lubis S., Hagos S., Hermawan E. dkk. — hujan rekor dikaitkan dengan seruakan utara lintas-ekuator yang kuat dan persisten bersama gelombang ekuatorial dan MJO (fase 2 memberi kenaikan rata-rata dan laju ekstrem terkuat); Borneo vortex TIDAK muncul pada kejadian ini. — [ESS Open Archive](https://essopenarchive.org/users/558363/articles/607605-record-breaking-precipitation-in-indonesia-s-capital-jakarta-in-january-2020-linked-to-the-northerly-surge-equatorial-waves-and-mjo); [PNNL](https://www.pnnl.gov/publications/record-breaking-precipitation-indonesias-capital-jakarta-early-january-2020-linked); [EGU25-14567](https://meetingorganizer.copernicus.org/EGU25/EGU25-14567.html)
- Jakarta Jan 2013 (COSMO): hujan ekstrem dini hari dikaitkan dengan MJO fase basah + seruakan dingin + vorteks barat daya Jawa; MJO menekan seruakan lemah dan mengurangi hari vorteks. — [ResearchGate](https://www.researchgate.net/publication/268219074_EVOLUTION_OF_HEAVY_RAINFALL_IN_JAKARTA_FLOOD_CASE_2013_BASED_ON_COSMO_MODEL)
- Studi frekuensi bencana hidrometeorologi nasional (data manajemen risiko bencana nasional; ScienceDirect IJDRR 2026): indeks ENSO & IOD lebih tinggi ↔ frekuensi banjir & longsor lebih rendah; ENSO lebih berperan daripada IOD [abstrak; koefisien tidak terbaca]. — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2212420926002682)
- GEV 1981–2019: La Niña dan IOD negatif lebih basah; hubungan IOD–hujan ekstrem negatif di Indonesia selatan, positif di utara. — *ENSO and IOD Influence on Extreme Rainfall in Indonesia*, Agromet (IPB) — [IPB](https://journal.ipb.ac.id/index.php/agromet/article/download/59389/29596/)
- Korelasi IOD menjadi tidak signifikan setelah pengaruh ENSO dihapus. — *Independent ENSO and IOD impacts on rainfall extremes over Indonesia* — [ResearchGate](https://www.researchgate.net/publication/349085756_Independent_ENSO_and_IOD_impacts_on_rainfall_extremes_over_Indonesia)
- Tinjauan BMKG: ENSO & IOD mengubah amplitudo, durasi, intensitas, dan frekuensi hujan rata-rata & ekstrem. — [JMG BMKG](https://jmg.bmkg.go.id/jmg/index.php/jmg/article/view/1049/484)
- Prediksi CENS (cross-equatorial northerly surge), MJO, dan hujan ekstrem dengan VECM. — [ResearchGate](https://www.researchgate.net/publication/372062928_Prediction_of_CENS_MJO_and_Extreme_Rainfall_Events_in_Indonesia_Using_the_VECM_Model)

### Inferences
- [inferensi] Prediktor sub-musiman yang paling bernilai untuk proyek: fase/amplitudo MJO (RMM) dan indeks seruakan dingin/CENS (angin meridional 925 hPa di Laut Cina Selatan ~105–115°E), khusus Des–Feb untuk Jawa barat-utara & Kalimantan barat. Indeks seruakan belum ada di daftar "planned" proyek.
- [inferensi] IOD sebaiknya tidak dimasukkan terpisah dari ENSO tanpa ortogonalisasi (atau diberi tanda regional), karena tanda hubungannya berbalik utara/selatan dan sinyal independennya lemah.
- [inferensi] CCKW: tidak ditemukan kuantifikasi Indonesia-spesifik dalam riset ini; hanya disebut sebagai "equatorial waves" pada kasus Jakarta 2020.

### Gaps
- Tidak ditemukan statistik frekuensi Borneo vortex ↔ banjir Indonesia yang dikuantifikasi.
- Koefisien korelasi ENSO/IOD ↔ frekuensi DIBI tidak terbaca (403).

## 4. Gambut, kanal drainase, dan perubahan tutupan lahan terhadap frekuensi banjir

### Takeaway
Bukti kuantitatif langsung "tutupan lahan → frekuensi banjir" di Sumatra/Kalimantan tipis dan banyak dari laporan LSM atau makalah konferensi; mekanisme terkuat adalah subsiden gambut akibat drainase (hingga 2,8 cm/tahun) yang membuat lahan semakin sering tergenang dalam jangka puluhan tahun.

### Cited Findings
- DAS Barito, Kalsel (IOP EES 1109:012017) [konferensi; berbasis literatur + overlay CHIRPS]: banjir awal 2021 dikaitkan dengan degradasi akibat perubahan tutupan lahan; hilangnya hutan mangrove & rawa primer 1990–2019; kerentanan banjir naik dari sedang ke tinggi di 8 dari 10 kab yang terendam. — [IOPscience](https://iopscience.iop.org/article/10.1088/1755-1315/1109/1/012017)
- Pantau Gambut (LSM): 41% lahan HGU sawit dan 27% HTI di KHG berkerentanan banjir tinggi; jaringan kanal ±281.253,51 km di Sumatra, Kalimantan, Papua; Kalimantan paling rentan, lalu Sumatra. — [Pantau Gambut](https://pantaugambut.id/storage/widget_multiple/eng-dari-konsesi-ke-konsekuensi-v-Sc7vM.pdf)
- Drainase sawit di gambut → subsiden hingga 2,8 cm/tahun di lahan baru dikeringkan; skenario 100 tahun sawit: ±67% gambut wilayah studi (Kalteng) tergenang rutin. — *Hydrological and economic effects of oil palm cultivation in Indonesian peatlands* — [ResearchGate](https://www.researchgate.net/publication/304573621_Hydrological_and_economic_effects_of_oil_palm_cultivation_in_Indonesian_peatlands)
- Gambut terdrainase: kerapatan titik panas tahunan hingga 13× lebih tinggi (relevan untuk modul karhutla, bukan banjir). — [ResearchGate](https://www.researchgate.net/publication/390359188_Drainage_density_and_land_cover_interact_to_affect_fire_occurrence_in_Indonesian_peatlands)
- Efektivitas sekat kanal KHU 5 & 6 Kahayan–Sebangau (Kalteng). — [ResearchGate](https://www.researchgate.net/publication/351306008_Effectiveness_Analysis_of_Canal_Blocking_in_Sub-peatland_Hydrological_Unit_5_and_6_Kahayan_Sebangau_Central_Kalimantan_Indonesia)

### Inferences
- [inferensi] Untuk model harian, tutupan lahan berubah lambat sehingga lebih tepat sebagai fitur statis per kab (fraksi gambut, kerapatan kanal, fraksi lahan basah/dataran banjir) yang mengubah ambang hujan, bukan prediktor waktu-nyata. Proyek sudah punya peta gambut/kanal untuk karhutla — bisa dipakai ulang sebagai fitur banjir.

### Gaps
- Tidak ditemukan studi peer-review yang mengkuantifikasi perubahan frekuensi banjir (kejadian/tahun) akibat sawit/deforestasi di Sumatra/Kalimantan dengan desain kausal.

## 5. Ketersediaan data lokal dan bias pelaporan DIBI

### Takeaway
Data terbuka yang nyata: API prakiraan cuaca BMKG per desa (JSON, 3 hari, per 3 jam), DEMNAS (0,27″ ≈ 8 m) dari BIG, dan dataset hujan 460 stasiun + kejadian banjir Jawa Barat 2020–2025 (Mendeley). Data TMA sungai PUPR/BBWS dan grid QPE radar tidak terkonfirmasi terbuka. DIBI hanya cocok 53% terhadap kejadian DFO; katalog lokal Jabar (dibersihkan + silang media) mendapat 4.231 kejadian banjir 2020–2025.

### Cited Findings
- API BMKG: prakiraan 3 hari untuk seluruh kelurahan/desa, 8 data/hari (tiap 3 jam), kunci kode adm4 (mis. 31.71.03.1001) di api.bmkg.go.id; diperbarui 2×/hari; batas 60 permintaan/menit/IP; wajib mencantumkan BMKG. — [data.bmkg.go.id](https://data.bmkg.go.id/prakiraan-cuaca/)
- DEMNAS: resolusi 0,27 arc-second, datum vertikal EGM2008; unduh lewat tides.big.go.id/DEMNAS; dibangun dari IFSAR 5 m, TerraSAR-X 5 m, ALOS PALSAR 11,25 m + masspoint stereo-plotting. — [BIG](https://big.go.id/en/content/produk/demnas); metadata sumber sekunder: [Scribd](https://id.scribd.com/document/755143485/DEMNAS)
- Penakar hujan: ±1.233 penakar otomatis nasional (tinjauan 2024); jaringan dianggap sangat jarang relatif luas wilayah. — [Signals 2024](https://doi.org/10.3390/signals5030030)
- Jawa Barat: 162 stasiun penakar (Jabar + Jakarta) dataset hujan terdistribusi spasial. — [ScienceDirect Data in Brief 2025](https://www.sciencedirect.com/science/article/pii/S2352340925006985)
- Dataset: *Daily Rainfall Observations from 460 Stations and Flood Event Records across West Java, Indonesia (2020–2025)* — kejadian banjir dari DIBI, dideduplikasi dan divalidasi silang dengan media; 4.231 kejadian banjir 2020–2025. — [Mendeley Data](https://data.mendeley.com/datasets/d7j3s64vvr/1)
- DFO vs BNPB: dari 216 kejadian banjir DFO di Indonesia (1985–Jan 2021), 114 (53%) dapat ditautkan ke data BNPB. — *Usability of existing global and national data for flood related vulnerability assessment in Indonesia*, Sci Total Environ 2023 — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0048969723009312)
- Bank Dunia: metode pencatatan jumlah kejadian berbeda antara bahaya geofisik dan hidrologis sehingga frekuensi banjir tampak lebih tinggi. — [World Bank](https://documents1.worldbank.org/curated/en/748581569515561529/pdf/Strengthening-the-Disaster-Resilience-of-Indonesian-Cities-A-Policy-Note.pdf)
- DIBI historis dikumpulkan lewat format kertas dari pemerintah daerah. — [UNESCAP](https://www.unescap.org/sites/default/files/S2-3_Indonesia.pdf)
- Inundasi Kalsel 20 Jan 2021 dipetakan dari Sentinel-1 (label alternatif berbasis SAR). — [EarthArXiv](https://eartharxiv.org/repository/object/2123/download/4413/)

### Inferences
- [inferensi] Label alternatif yang dipakai peneliti Indonesia: catatan BPBD, media (silang), DFO, peta genangan Sentinel-1. Proyek memakai DIBI + logbook Pusdalops; dataset Jabar Mendeley (460 stasiun + 4.231 kejadian) adalah set uji balik independen paling siap pakai, sekaligus sumber ARG untuk koreksi bias ERA5/IFS di Jabar.
- [inferensi] 53% kecocokan DFO–BNPB berarti negatif di DIBI tidak dapat diartikan "tidak banjir"; metrik berbasis presisi/recall harus memperlakukan label negatif sebagai tidak pasti.

### Gaps
- SIHKA/portal TMA PUPR-BBWS: tidak ada sumber yang memastikan akses publik numerik (API/unduhan) dalam riset ini.
- Jumlah AWS/ARG BMKG terkini dan lisensi data stasiun historis (dataonline.bmkg.go.id) tidak terverifikasi.
- Tidak ditemukan studi yang mengukur tingkat under-reporting DIBI per provinsi secara langsung.

## Yang BELUM dipakai proyek (rangkuman)

| Item | Sumber/akses | Catatan |
| ---- | ------------ | ------- |
| Ambang longsor ILEWS 61/91 mm (1/3 hari) + revisi 2022 | Hidayat 2019; Yuniawan 2022 | baseline untuk ambang I–D yang direncanakan |
| API prakiraan BMKG per desa (3 jam, 3 hari) | data.bmkg.go.id | prakiraan deterministik resmi; bisa jadi pembanding/ensemble anggota |
| Indeks seruakan dingin / CENS | ERA5 angin 925 hPa | belum di daftar planned; efek 10–150% |
| GPM-IMERG (dipakai IBF BMKG & ILEWS revisi) | NASA | proyek pakai ERA5/IFS; IMERG lebih dekat ke data penurunan ambang resmi |
| DEMNAS 8 m | BIG | untuk HAND/genangan & kemiringan longsor yang lebih halus |
| Dataset Jabar 460 stasiun + 4.231 kejadian | Mendeley | uji balik independen & koreksi bias |
| Peta gambut/kanal sebagai fitur banjir statis | sudah ada di karhutla | dipakai ulang |
| Sentinel-1 genangan, DFO | Copernicus, DFO | label alternatif |
| QPE radar BMKG, TMA BBWS/SIHKA | belum terkonfirmasi terbuka | perlu MoU/akses |
