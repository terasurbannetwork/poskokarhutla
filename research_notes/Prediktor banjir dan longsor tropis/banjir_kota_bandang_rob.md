# Prediktor & metode peringatan dini banjir kota (genangan), banjir bandang, dan rob/banjir majemuk — tropis & Indonesia

Lingkup: skala kota/kabupaten, tenggang jam s.d. 3 hari. Tanda **[BARU]** = belum dipakai proyek (proyek sudah memakai: hujan ERA5/IFS, intensitas maks per jam, GSMaP direncanakan, sim 2D di DSM GLO-30/DEMNAS dengan Kd, pompa OSM, nowcast IMERG Early Jakarta, aturan bandang ≥30 mm/jam + InaRISK, ambang rob dari persentil SMOC, pasang astronomis, subsidensi sebagai hipotesis).
Catatan metode: ±19 panggilan alat; sebagian besar angka diambil dari abstrak/ringkasan, bukan teks penuh — ditandai bila begitu.

## 1. Flash Flood Guidance (FFGS / SAOFFG) — input, skill, penerapan di Indonesia

### Takeaway
BMKG adalah Pusat Regional SAOFFG (WMO/HRC/USAID, mulai 2016); satu uji BMKG 2020 menilai akurasinya "baik" tapi cenderung over-prediksi di Indonesia tengah/timur. FFG = curah hujan ambang (threshold runoff + defisit lengas tanah) — konsep lengas tanah dan ambang per DAS kecil **[BARU]** bagi proyek yang kini memakai ambang intensitas tetap 30 mm/jam.

### Cited Findings
- SAOFFG adalah proyek WMO bersama HRC dan USAID; perencanaan mulai awal 2016; BMKG dipilih sebagai Regional Center dan focal point negara peserta (Brunei, Indonesia, Malaysia, PNG, Filipina, Singapura, Timor-Leste menurut halaman WMO; artikel BMKG tidak menyebut Singapura) — [WMO SAOFFG](https://community.wmo.int/ar/node/36128); [WMO Final Report SAOFFG Feb 2016](https://old.wmo.int/extranet/pages/prog/hwrp/flood/ffgs/saoffg/documents/Final_Report_SAOFFG_Feb2016.pdf); [BMKG berita](https://www.bmkg.go.id/berita/utama/kawasan-asia-tenggara-pasifik-bangun-sistem-banjir-bandang)
- Produk SAOFFG memakai prakiraan WRF dan diperbarui tiap 6 jam; uji coba operasional mulai 23 Juli 2020 — [Climago BMKG (unduh 21)](https://ejournal-pusdiklat.bmkg.go.id/index.php/climago/article/view/21)
- Verifikasi dikotomis (4 indeks) terhadap kejadian banjir bandang 23–30 Juli 2020: tingkat akurasi "kategori baik"; abstrak lain menyebut sistem memprediksi potensi banjir terlalu tinggi dibanding kejadian teramati, terutama di beberapa provinsi Indonesia tengah dan timur (angka POD/FAR tidak terbaca di abstrak) — [Climago BMKG art. 21](https://ejournal-pusdiklat.bmkg.go.id/index.php/climago/article/download/21/16/61); [Climago BMKG art. 59](https://ejournal-pusdiklat.bmkg.go.id/index.php/climago/article/download/59/37/246)
- Dasar teori: Georgakakos (2006) "Analytical results for operational flash flood guidance", J. Hydrology 317:81–103 (DOI 10.1016/j.jhydrol.2005.05.009 — DOI dari ingatan, belum dicek sesi ini) — [WMO ETRP](https://etrp.wmo.int/mod/resource/view.php?id=14342)
- Threshold runoff = limpasan dari hujan berdurasi tertentu yang membuat sungai kecil sedikit melampaui bankfull; FFG ≈ TR + faktor lengas tanah (SM) — [NWS TM44](https://www.weather.gov/media/owp/oh/hdsc/docs/TM44.pdf); [NWS/NOAA 291](https://www.weather.gov/media/owp/oh/hrl/docs/291_comp.pdf)
- Fiji FFGS (DAS Ba): FFG probabilistik "frequentist" POD 93% vs FFGS eksisting 67% pada 17 kejadian — [IAHR library](https://www.iahr.org/library/info?pid=29900)
- Turki: POD 70% (2014) dan 55% (2015); turun karena lebih banyak sistem konvektif dibanding frontal — [WMO FFI-AG3 2017 presentasi](https://old.wmo.int/extranet/pages/prog/hwrp/flood/documents/FFI-AG3-2017/presentations/12_Report_Main_FF_activities_FFGS.pdf) (asal tabel hit rate 0,95 / FAR 0,25 di dek yang sama tidak jelas regionnya — jangan diatribusikan)
- EFAS (Eropa): notifikasi banjir bandang banyak false alarm; f(β) optimum pada peluang lampau 30–40% dari ambang periode ulang 2 tahun dengan β=0,7 — [ECMWF EFAS v5.0 flash flood skill](https://confluence.ecmwf.int/spaces/CEMS/pages/340784798/EFAS+v5.0+-+Flash+Flood+Skill+Assessment+-+Results)

### Inferences
- Ambang tetap 30 mm/jam mengabaikan kondisi awal; FFG menunjukkan ambang harus turun saat tanah jenuh. Proksi murah: hujan anteseden 3–7 hari atau lengas tanah ERA5-Land/SMAP per DAS kecil **[BARU]**.
- Skill FFG turun untuk konveksi (Turki) — relevan langsung untuk Indonesia; ambang probabilistik/ensemble (Fiji, EFAS) lebih baik daripada biner **[BARU]**.
- Mungkin produk SAOFFG bisa diminta ke BMKG sebagai lapisan pembanding (inferensi; akses publik tidak terkonfirmasi).

### Gaps
- Angka POD/FAR/CSI SAOFFG Indonesia tidak ditemukan di abstrak; status operasional pasca-2020 tidak terkonfirmasi.
- Verifikasi Mekong (MRCFFG) dan SARFFG tidak ditemukan.

## 2. Nowcasting radar/QPE vs satelit (<6 jam)

### Takeaway
Bukti Indonesia: pysteps pada radar C-band Tangerang punya diskriminasi tinggi (AUC >0,90) hanya s.d. ~+24 menit dan turun ke ~0,6 setelah +56 menit; nowcast optical-flow dari satelit di Benua Maritim punya skill s.d. 4 jam pada skala ≥10 km. Radar **[BARU]**; IMERG Early (latensi 4–5 jam) jauh lebih lambat dari keduanya.

### Cited Findings
- Ali (2025), "Assessing the performance of deterministic precipitation nowcasting algorithms with weather radar data and multimetric verification", Int. J. Remote Sensing and Earth Sciences 21(2): LINDA, SPROG, ANVIL, ekstrapolasi (pysteps), radar C-band Tangerang, verifikasi s.d. +96 menit; AUC >0,90 untuk semua pada +8 s.d. +24 menit (SPROG 0,96, LINDA 0,95); setelah +56 menit LINDA tertinggi AUC 0,64, SPROG & ekstrapolasi <0,60; korelasi LINDA ≥0,80 jarak pendek, ~0,65 pada +80 menit; bias <±0,1. CSI tidak dilaporkan — [BRIN IJReSES](https://ejournal.brin.go.id/ijreses/article/view/11217)
- Nowcast optical-flow pySTEPS dari citra satelit di Benua Maritim: skill s.d. 4 jam pada skala ≥10 km, mengungguli persistensi di semua tenggang; skill terendah di pegunungan siang hari, tertinggi malam di laut; cakupan radar BM tidak lengkap dan terhalang pegunungan — [EGUsphere 2023-1404](https://egusphere.copernicus.org/preprints/2023/egusphere-2023-1404/egusphere-2023-1404.pdf)
- Belanda, 1.533 kejadian: tenggang skillful bertambah dengan durasi kejadian; nowcast radar kehilangan skill setelah ~2 jam, lebih cepat untuk konveksi atau domain radar kecil — [TU Delft](https://research.tudelft.nl/en/publications/spatial-and-temporal-evaluation-of-radar-rainfall-nowcasting-tech); [KNMI](https://www.knmi.nl/research/publications/spatial-and-temporal-evaluation-of-radar-rainfall-nowcasting-techniques-on-1-533-events)

### Inferences
- Untuk genangan Jakarta (respon 0,5–3 jam), satelit geostasioner (Himawari-9) + pySTEPS memberi tenggang lebih panjang daripada radar dan latensi jauh lebih kecil daripada IMERG Early **[BARU]**. Radar BMKG berguna untuk 0–1 jam bila datanya bisa diakses.
- ERA5 dilaporkan over-estimasi hujan topan Usagi di HCMC (>500 mm) — lihat §4; jangan pakai ERA5 sebagai "kebenaran" intensitas.

### Gaps
- Tidak ditemukan CSI per tenggang untuk pySTEPS di tropis; tidak ditemukan perbandingan langsung radar BMKG vs IMERG/GSMaP untuk genangan Jakarta; status akses data radar BMKG publik tidak dicek.

## 3. ML/surrogate banjir kota dan prediktor yang penting (DEM tanpa bangunan, impervious, drainase)

### Takeaway
FABDEM (bangunan & hutan dihapus) konsisten lebih akurat daripada Copernicus GLO-30 di area kota (MAE kota 1,12 m vs 1,61 m) — langsung menjawab kelemahan "DSM berisi bangunan" **[BARU]**. Prediktor susceptibilitas yang berulang: elevasi/lereng, built-up/impervious, kedekatan/kerapatan drainase, tata guna lahan; peringkatnya beda per kota. Surrogate CNN meniru model fisika (r=0,983) 600× lebih cepat.

### Cited Findings
- Validasi FABDEM: MAE di area urban 1,12 m (FABDEM) vs 1,61 m (COPDEM30) vs 3,59 m (MERIT) terhadap LiDAR/ICESat (ringkasan dari pengembang — Fathom; paper asli Hawker et al. 2022 Environ. Res. Lett., DOI 10.1088/1748-9326/ac4d4f dari ingatan) — [Fathom](https://www.fathom.global/academic-papers/a-30-m-global-map-of-elevation-with-forests-and-buildings-removed/)
- Meadows et al. (2024), 65 survei LiDAR di lingkungan rawan banjir: FABDEM konsisten peringkat pertama, mengungguli Copernicus DEM dengan mengurangi galat positif besar dari hutan dan bangunan; tutupan lahan faktor utama galat vertikal — [Int. J. Digital Earth / T&F](https://www.tandfonline.com/doi/full/10.1080/17538947.2024.2308734); [BNHCRC PDF](https://www.bnhcrc.com.au/sites/default/files/2024-02/Vertical%20accuracy%20assessment%20of%20freely%20available%20global%20DEMs%20%20FABDEM%20%20Copernicus%20DEM%20%20NASADEM%20%20AW3D30%20and%20SRTM%20%20in%20flood%20prone%20environments%20%281%29_0.pdf)
- Lianyungang (China), inundasi berbasis HAND: FABDEM RMSE 1,24 m, NMAD 0,49 m; GLO-30 RMSE 1,56 m, NMAD 0,65 m; beda terbesar pada ambang HAND rendah — [DOAJ IJDE Des 2024](https://doaj.org/article/87fa65b8ab4b4f3a888fbe40764fd41a)
- Kontra: studi Thailand (abstrak konferensi) — uji t Welch tidak menemukan beda signifikan elevasi FABDEM vs Copernicus — [bu.edu.eg](https://bu.edu.eg/staff/mohamedfarsheh3-publications/57143)
- New York (311 laporan, RF regresi): efek bangunan, total importance 11,7%, lebih penting daripada % tutupan kedap air atau elevasi — [NOAA repository](https://repository.library.noaa.gov/view/noaa/57721/noaa_57721_DS1.pdf)
- Cincinnati (2026): RF & SVM akurasi tertinggi dari 4 algoritma; SHAP: elevasi, lereng, luas built-up, kedekatan drainase — [IJGI 15:173](https://mdpi-res.com/d_attachment/ijgi/ijgi-15-00173/article_deploy/ijgi-15-00173.pdf)
- Berlin: inventaris 4.333 lokasi banjir, 11 faktor, CNN/ANN/RF/SVM — [Uni Potsdam](https://publishup.uni-potsdam.de/56381)
- Seoul (2025): sistem drainase sebagai faktor pengkondisi kunci; LR/RF/SVM — [IJGI 14:57](https://mdpi-res.com/d_attachment/ijgi/ijgi-14-00057/article_deploy/ijgi-14-00057.pdf)
- Surrogate CNN (Liao et al. 2024): PCC 0,983, MAE 0,020 m, RMSE 0,086 m kedalaman pada hujan uji; 600× lebih cepat dari model fisika; mengungguli XGBoost/RF/KNN — [Water 17:1239](https://mdpi-res.com/d_attachment/water/water-17-01239/article_deploy/water-17-01239.pdf)
- CNN-LSTM Norfolk (hujan + pasut sebagai deret waktu): 4–6 jam simulasi → ~3,2 menit per kejadian, resolusi 2,5 m, langkah 15 menit, prakiraan 1 jam ke depan — [ODU](https://digitalcommons.odu.edu/datascience-pubs/14)

### Inferences
- Ganti/sandingkan GLO-30 DSM dengan FABDEM untuk sim 2D **[BARU]**; efek pada luas genangan belum terbukti, jadi perlu uji balik lawan label.
- Prediktor statis yang layak ditambah ke model genangan **[BARU]**: fraksi kedap air (mis. GHSL/ESA WorldCover built-up), kerapatan/kedekatan saluran (OSM waterway=drain/canal), kedalaman cekungan (fill-sink depth dari FABDEM), HAND, footprint bangunan.
- Temuan NYC (bangunan > impervious) menandakan laporan warga juga mencerminkan kepadatan pelapor — lihat §6.

### Gaps
- Tidak ditemukan studi yang langsung menguji metrik cekungan (depression depth) sebagai prediktor; tidak ditemukan ML genangan Jakarta yang ber-angka skill di sesi ini.

## 4. Banjir majemuk (pasang × sungai × surge) dan surge laut Indonesia; koreksi datum lokal

### Takeaway
Di Jakarta utara banjir pesisir terutama terjadi karena muka laut tinggi (wind + wave setup + surge) MENGHAMBAT aliran muara sehingga sungai meluap — bukan limpasan ombak di tanggul. Di HCMC pasang astronomis adalah penggerak dominan bahkan saat hujan >300 mm/24 jam. Prediktor kunci **[BARU]**: interaksi waktu (fase) antara puncak pasang dan puncak debit/hujan, wave/wind setup, debit sungai.

### Cited Findings
- Bennett, Karunarathna, Xuan et al. (2023), "Modelling compound flooding: a case study from Jakarta, Indonesia", Natural Hazards 118:277–305, DOI 10.1007/s11069-023-06001-1: model pesisir + sungai berbasis proses; muka laut tinggi akibat wind setup, wave setup dan surge menghambat drainase muara (Muara Angke) sehingga air meluap dari tebing muara; area rendah sekitar muara banjir bahkan pada badai intensitas rendah rutin; keparahan bergantung pada beda fase dan kekuatan surge dan debit sungai; SLR + subsidensi diproyeksi melampaui tanggul — [Springer](https://link.springer.com/article/10.1007/s11069-023-06001-1); [Swansea Cronfa](https://cronfa.swan.ac.uk/Record/cronfa63955); [Huddersfield](https://pure.hud.ac.uk/en/publications/modelling-compound-flooding-a-case-study-from-jakarta-indonesia/)
- Rodrigues do Amaral, Gratiot, Pellarin & Tu (2023), NHESS 23:3379–3405, DOI 10.5194/nhess-23-3379-2023 (HCMC, Topan Usagi 25 Nov 2018, >300 mm/24 jam): residu muka laut 19 cm, skew surge 14 cm (setara musim kering); "the coastal tidal forcing is the predominant compound flood driver"; puncak residu debit tertinggal ~16 jam dari puncak hujan; residu debit hulu ≈1,5% air hujan tersedia; genangan jalan s.d. 0,8 m karena pasang tinggi + jalan kedap air; MSWEP paling baik menangkap puncak hujan, ERA5 over-estimasi (>500 mm) — [NHESS](https://nhess.copernicus.org/articles/23/3379/2023/)
- HCMC probabilistik (10.000 tahun sintetis hujan + muka laut): kota bisa banjir sub-tahunan oleh pasang, hujan, surge atau kombinasinya; kejadian sering-sedang menyumbang paling besar pada kerugian tahunan harapan — [IRD](https://www.documentation.ird.fr/hor/fdi:010089601)
- Copula hujan–pasang (HESS preprint 2024, lokasi tidak terkonfirmasi): kedua periode ulang 10 th → periode ulang Kendall 36,35 th vs "Or" 5,40 th — [HESS 2024-100](https://hess.copernicus.org/preprints/hess-2024-100)
- Pengukur pasut Indonesia (InaTEWS) dengan kontrol vertikal GPS dan meteorologi — dasar koreksi datum lokal — [NHESS 11:731 (2011)](https://nhess.copernicus.org/articles/11/731/2011/)
- Model storm tide Jawa–Nusa Tenggara (DHI finite volume; batas pasut, angin, tekanan, lintasan badai) — [Undip IJMS](https://ejournal.undip.ac.id/index.php/ijms/article/download/1717/1592)

### Inferences
- Ambang rob dari persentil SMOC dengan datum global tidak menangkap mekanisme "muara terbendung"; tambahkan fitur: muka laut (pasut + residu) pada jam puncak hujan/debit, dan debit sungai (GloFAS sudah diarsip proyek) **[BARU]**.
- Datum: ganti ofset global dengan bias lokal dari stasiun pasut BIG/InaTEWS (mean difference SMOC vs stasiun per lokasi) **[BARU]**.
- Wave setup (dari prakiraan gelombang, mis. CMEMS/BMKG) layak jadi prediktor rob Jakarta **[BARU]** (inferensi dari Bennett et al.).

### Gaps
- Tidak ditemukan skill (hit rate) prakiraan rob operasional BMKG atau studi copula spesifik Jakarta; tidak ditemukan model surge operasional Indonesia yang terdokumentasi peer-review dalam sesi ini.

## 5. Subsidensi (Jakarta, Semarang, Pekalongan, Demak) dan pengaruhnya

### Takeaway
Laju tipikal 3–10 cm/th (Jakarta), puncak lokal 10–20 cm/th di Pekalongan, Semarang utara/timur, Demak. Subsidensi memperparah rob (wilayah subsidensi tinggi = wilayah rob), luapan sungai, dan merusak drainase — tapi hubungan dengan banjir di literatur Jakarta masih kualitatif. Peta laju InSAR sebagai prediktor **[BARU]** (kini hanya hipotesis).

### Cited Findings
- Jakarta (leveling, GPS, InSAR 1982–2014): laju tipikal ~3–10 cm/th, bervariasi ruang & waktu; banjir pesisir umumnya terjadi di area subsidensi besar; subsidensi di sepanjang sungai memperbesar dampak banjir sungai dan merusak sistem drainase; korelasi spasial dengan banjir "still in qualitative manner" — [PIAHS 370:15 (2015)](https://piahs.copernicus.org/articles/370/15/2015/)
- Penyebab utama: ekstraksi air tanah berlebih, beban bangunan, konsolidasi alami aluvium; InSAR cocok dengan leveling dan GPS — [PIAHS 372:115](https://piahs.copernicus.org/articles/372/115/2015/); [ITB LPPM](https://lppm.itb.ac.id/2-s2-0-84964076481)
- Abidin et al. (2011) Natural Hazards 59:1753–1771 "Land subsidence of Jakarta and its relation with urban development" — [KAKEN](https://kaken.nii.ac.jp/grant/KAKENHI-PROJECT-20403007)
- BRIN (2015–2020): Jakarta 0,1–8,0 cm/th; Semarang 0,9–6,0 cm/th; pesisir Pekalongan 2,1–11,0 cm/th (laporan berita, bukan paper) — [Tempo](https://en.tempo.co/amp/1597858/brin-java-panturas-land-subsidence-up-to-20cm-per-year)
- Sentinel-1 seluruh Jawa (ITB): puncak Bekasi 150 mm/th, Jakarta 110 mm/th, Semarang Raya s.d. 160 mm/th — [ITB FITB](https://multisite.itb.ac.id/fitb/java-is-sinking-a-silent-crisis-beneath-our-feet/); [EGU22-1721](https://presentations.copernicus.org/EGU22/EGU22-1721_presentation-h962332.pdf)
- SBAS-InSAR 2015–2022: maksimum 100–120 mm/th di Semarang utara/timur dan Demak — [Urban Science 8(4):234](https://www.mdpi.com/2413-8851/8/4/234/htm)
- Pekalongan PS-InSAR 2014–2022: 10–19 cm/th — [IJAEOG Des 2023 (DOAJ)](https://doaj.org/article/bc659cefcb624b38a679829477d8e2d1)
- HCMC: rata-rata 2–5 cm/th, 7–8 cm/th di area banyak gedung tinggi (laporan berita, studi terkait JICA) — [NST](https://nst.com.my/amp/world/region/2022/08/826529/ho-chi-minh-sinking-average-two-five-cm-year)

### Inferences
- Laju subsidensi lebih besar dari SLR (~mm/th) sepuluh kali lipat; DEM (GLO-30 epoch ~2011–2015) di Pantura sudah turun puluhan cm — koreksi DEM = laju InSAR × (tahun kini − epoch DEM) **[BARU]**, layak diuji lawan label rob.
- Sumber laju yang bisa diambil: produk InSAR publik (mis. EGMS tidak meliput Indonesia; perlu LiCSBAS/COMET-LiCS atau hasil ITB/BRIN) — ketersediaan grid publik belum dicek.

### Gaps
- Tidak ditemukan studi kuantitatif yang mengukur kenaikan frekuensi rob per cm subsidensi di Jakarta/Semarang; tidak dicek ketersediaan raster laju InSAR terbuka untuk Indonesia.

## 6. Label crowd/social sensing (PetaBencana, Twitter, CCTV) dan biasnya

### Takeaway
Laporan PetaJakarta/PetaBencana dipakai BPBD DKI untuk validasi silang, tetapi akurasi lokasi turun dengan unit pemetaan dan pengambilan berbasis geotag mengabaikan mayoritas pesan tanpa lokasi; rasio terkonfirmasi sangat kecil (1.119 vs 25.584). CCTV + deep learning bisa memberi kedalaman genangan (MAE ~8–9 cm di set foto) sebagai label lebih objektif **[BARU]**.

### Cited Findings
- Satu musim hujan: 1.119 laporan banjir terkonfirmasi vs 25.584 tidak terkonfirmasi; verifikasi manual via silang laporan satu kecamatan dan berita TV/internet; BPBD DKI memakai data untuk validasi silang laporan formal — [iRevolutions](https://irevolutions.org/tag/jakarta/); [UoW SMART](https://ro.uow.edu.au/smartpapers/239)
- Ogie & Forehead (2017): akurasi peta banjir dari tweet bergeoreferensi PetaJakarta turun saat minimum mapping unit membesar — [UoW SMART papers](https://ro.uow.edu.au/smartpapers/239)
- Crawling berbasis lokasi menimbulkan bias karena mengabaikan fraksi jauh lebih besar informasi tanpa geolokasi — [ITB Sostek](https://journals.itb.ac.id/index.php/sostek/article/view/23371/7100)
- PetaBencana memakai chatbot berbantuan AI untuk konfirmasi kejadian — [Interaksyon 2019](https://interaksyon.philstar.com/politics-issues/2019/12/13/158884/saving-indonesians-from-climate-disasters-one-social-media-post-at-a-time/amp/)
- CCTV + CNN mendeteksi banjir; indeks SOFI berkorelasi longgar dengan kedalaman, berguna untuk kalibrasi model — [HESS preprint 2018-570](https://hess.copernicus.org/preprints/hess-2018-570/hess-2018-570-RR1.pdf); [Eawag](https://www.eawag.ch/fileadmin/Domain1/Abteilungen/eng/projekte/spike/Publications/KV_C068.pdf)
- FloodVision (VLM): 654 foto crowdsourced, MAE kedalaman 15,62 → 8,75 cm vs baseline VLM; dapat dipakai pada CCTV — [arXiv 2509.04772](https://arxiv.org/pdf/2509.04772)
- Shin et al. (EMS 2025): CCTV + video medsos, YOLO + U-Net untuk kedalaman, dipakai memverifikasi ambang hujan — [EMS2025-121](https://meetingorganizer.copernicus.org/EMS2025/EMS2025-121.html)

### Inferences
- Label warga = P(banjir) × P(dilapor | kepadatan penduduk/pengguna medsos, jam, akses) — uji balik harus mengoreksi dengan bobot kepadatan atau memakai label negatif hanya di sel yang punya pelapor aktif **[BARU]**.
- CCTV Bali Tower/Dishub DKI sebagai sumber label kedalaman objektif (ketersediaan & izin tidak dicek).

### Gaps
- Tidak ditemukan studi kuantitatif bias spasial label PetaBencana; tidak ditemukan uji CCTV-flood di Jakarta.

## Ringkasan prediktor [BARU] berurut perkiraan nilai (inferensi)
1. FABDEM menggantikan DSM GLO-30 (§3). 2. Kondisi awal: hujan anteseden / lengas tanah dalam ambang bandang ala FFG (§1). 3. Nowcast satelit Himawari + pySTEPS (0–4 jam) dan radar BMKG (0–1 jam) (§2). 4. Interaksi fase pasang × debit/hujan + wave/wind setup + bias datum lokal stasiun pasut (§4). 5. Koreksi DEM dengan laju InSAR (§5). 6. Fitur statis: impervious, kerapatan drainase, kedalaman cekungan, HAND (§3). 7. Label CCTV dan koreksi bias pelapor (§6). 8. Ambang probabilistik/ensemble, bukan biner (§1).
