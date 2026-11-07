# Prediktor dan metode peringatan dini longsor akibat hujan, skala regional (kab/kec, harian), fokus Indonesia dan Asia tropis

Konteks proyek (dari penugasan, tidak diverifikasi di repo): nowcast gaya LHASA v1 (kerentanan = lereng p75 0,5 + zona PVMBG 0,3 + jarak sesar 0,2; pemicu = hujan ERA5 7 hari vs P95 per sel 0,5°), label DIBI + NASA GLC, AUC 0,705 vs klimatologi kab×bulan 0,777. Rencana: ID per zona, hujan per jam 0,1°, ESA WorldCover.

## 1. Ambang hujan yang sudah terbit untuk Indonesia (ID, ED, anteseden) dan skill validasinya

### Takeaway
Ambang empiris Indonesia yang terbit punya skill rendah sampai sedang: AUC 0,64–0,73 dan TSS sekitar 0,32. Penyebab utamanya FPR tinggi, karena hujan pemicu dan hujan biasa di Jawa sangat tumpang tindih. Yang terbukti menambah skill adalah ambang yang (a) diturunkan per wilayah, tidak satu nasional, (b) memakai jendela kejadian hujan dinamis dari data per jam, dan (c) memilih ambang pada tingkat eksedansi yang memaksimalkan TSS (10–20%), bukan 5%.

### Cited Findings
- **Ambang ID nasional dari TRMM (Muntohar, Mavrouli, Jetten, van Westen, Hidayat 2021).** Datanya 220 kejadian hujan pemicu longsor dari TRMM untuk wilayah Indonesia, dan validasinya memakai 5.468 kejadian hujan. Persamaannya **I = 7,83·D^−0,328** untuk durasi 2–18 hari. Skill: TPR 0,92, FPR 0,60, TNR 0,40, FNR 0,08, PPP (presisi) 0,37, NPP 0,93, **TSS 0,32**, **AUC 0,66**. Penulis sendiri menyebut model ini "fairly high" dalam alarm palsu, dan TSS 0,32 berarti daya prediksinya rendah. Model ini dipakai otoritas pemerintah untuk prototipe Indonesia LEWS. Grid TRMM 0,25° dinilai kasar. — [Muntohar et al. 2021, *Understanding and Reducing Landslide Disaster Risk* (WLF5), Springer, doi:10.1007/978-3-030-60311-3_26](https://ris.utwente.nl/ws/files/278795294/Muntohar2021development.pdf)
- **ILEWS Balai Sabo (Hidayat et al. 2019).** Ambangnya kumulatif 1 hari **61 mm** dan 3 hari **91 mm**, dipilih dari median 83 longsor akibat hujan plus kejadian besar, dengan data TRMM. Median dipakai untuk menekan alarm palsu dan kejadian minor. — [Hidayat, Sutanto, Hidayah, Ridwan, Mulyana 2019, *Geosciences* 9(10):451, doi:10.3390/geosciences9100451](https://doi.org/10.3390/geosciences9100451) (angka diambil dari ringkasan hasil pencarian; teks penuh tidak bisa diambil karena HTTP 403)
- **Revisi ambang ILEWS (Yuniawan et al. 2022).** Studi ini memakai 420 longsor di Jawa, hujan GPM, dan hujan anteseden efektif 1 hari dan 3 hari. Ada empat metode yang dibandingkan: (1) ambang ILEWS lama, (2) rata-rata hujan pemicu, (3) minimum hujan pemicu, (4) minimum hujan pemicu longsor *besar*. Metode 4 terbaik menurut ROC dan kemudian dipasang di Balai Sabo-ILEWS. Latarnya: ambang tunggal nasional 2017 dinilai tidak akurat. — [Yuniawan et al. 2022, *Geosciences* 12(3):129](https://doaj.org/article/60a9d83cd01d405fa847b7b4086ada32); [abstrak UGM](https://acadstaff.ugm.ac.id/karya_files/revised-rainfall-threshold-in-the-indonesian-landslide-early-warning-system-dcfcd07e645d245babe887e5e2daa016) (nilai ambang dan metriknya tidak terambil, lihat Gaps)
- **Ambang ED dinamis di DAS Progo, Jawa Tengah/DIY (Satyaningsih, Jetten, Ettema, Sopaheluwakan, Lombardo, Nuryanto 2023).** Data: 214 longsor 2012–2021 (BNPB/BPBD), 213 di antaranya berkelompok tanggal, dan 110 (51,6%) diketahui jamnya. Kejadian hujan dipisah oleh ≥24 jam tanpa hujan sehingga jendelanya dinamis. Bentuk ambangnya E–D (kumulatif–durasi), metode frekuentis, dengan 70/30 split dan 100 sampel. **AUC: stasiun otomatis 0,72, GSMaP-GNRT 0,73, CMORPH-CRT 0,64.** TSS maksimum dicapai pada eksedansi **10% (stasiun)**, **20% (GSMaP-GNRT)**, dan **15% (CMORPH-CRT)**, lebih tinggi dari 5% yang lazim. Kedua produk satelit melebih-lebihkan hujan ringan dan meremehkan intensitas tinggi: hujan ≥10 mm/jam yang terdeteksi benar di bawah 16%. Durasi kejadian pemicu dari stasiun mencapai 387 jam (sekitar 16 hari). — [Satyaningsih et al. 2023, *Natural Hazards*, doi:10.1007/s11069-023-06208-2](https://link.springer.com/article/10.1007/s11069-023-06208-2); [preprint doi:10.21203/rs.3.rs-3018950/v1](https://www.researchsquare.com/article/rs-3018950/v1.pdf)
- **Banjarnegara/Banjarmangu, Jawa Tengah.** Ambang ID-nya **I = 43,2·D^−0,87**, ditambah ambang kumulatif 3 hari dan 15 hari, dari data longsor 2011–2017. — [Journal of Applied Geology 6(2) 2021:112–118](https://journal.ugm.ac.id/jag/article/download/59185/32947) (ringkasan hasil pencarian; metrik skill tidak terambil)
- **DAS Tinalah, Kulon Progo.** Ambangnya dibuat per zona kerentanan; untuk zona tinggi **I = 54,988·D^−0,77**. Validasinya memakai pemodelan numerik, bukan ROC. — (ringkasan hasil pencarian; sumber primer tidak terbuka, lihat Gaps)

### Inferences
- Ambang anteseden 7 hari vs P95 yang dipakai proyek setara dengan "ambang kumulatif tunggal". Bukti Indonesia menunjukkan bentuk ini sendirian berada di AUC 0,64–0,73, jadi AUC 0,705 proyek wajar dan tidak menandakan bug. Kelemahannya struktural.
- GSMaP-GNRT (AUC 0,73) setara dengan stasiun dan lebih baik dari CMORPH. Untuk rencana "hujan per jam 0,1°", GSMaP-NRT/GNRT adalah kandidat yang sudah teruji di Jawa, sedangkan IMERG belum diuji di studi ini.
- Pada skala kab×hari, tingkat eksedansi 10–20% lebih cocok daripada 5%, karena itu yang memaksimalkan TSS di Progo.

### Gaps
- Nilai ambang, peluruhan hujan efektif, dan POD/FAR untuk keempat metode Yuniawan et al. 2022 tidak terambil (MDPI dan ResearchGate menolak dengan 403).
- Tidak ditemukan ambang terbit dengan skill untuk Sumatra, Sulawesi, atau NTT. Yang ada hanya studi kerentanan Sulawesi (bagian 4).
- Studi Banjarmangu dan Tinalah: penulis dan skill belum diverifikasi dari teks penuh.

## 2. Ukuran anteseden mana yang paling prediktif (API, 3/7/14/30 hari, kelembapan tanah SMAP/ESA-CCI/ERA5-Land, SWI)

### Takeaway
Bukti terkuat yang terkuantifikasi datang dari luar tropis. Kelembapan tanah ERA5-Land menaikkan TSS dari 0,59 (hujan saja) ke 0,68, bahkan dengan lag 5 hari, dan soil-saturation satu lapis mencapai TSS 0,76–0,78 dibanding 0,50 untuk ambang power-law. Di tropis Indonesia, bukti langsung untuk kelembapan tanah belum ditemukan. LHASA v2 global memberi bobot kecil pada soil wetness SMAP (gain 0,02) dibanding hujan hari ini (gain 0,74).

### Cited Findings
- **ERA5-Land tertunda (Sisilia, NHESS 2025).** Model dengan kelembapan tanah tertunda konsisten mengungguli model hujan saja: **TSS 0,68 vs 0,59**. TSS hanya turun sedikit dengan lag: **0,78 tanpa lag, 0,72 dengan lag 5 hari, 0,67 dengan lag 15 hari**. ERA5-Land biasanya rilis dengan latensi sekitar 5 hari. — [NHESS 25:4907 (2025)](https://nhess.copernicus.org/articles/25/4907/2025/)
- **Soil saturation degree dari ERA5-Land (Sisilia dan Bergen, 2023).** TSS maksimum **0,76 (Sisilia)** dan **0,78 (Bergen)** dengan kelembapan tanah satu lapis, sedangkan ambang power-law hujan maksimum **0,50**. — [ringkasan hasil pencarian; ResearchGate 373073633](https://www.researchgate.net/publication/373073633_Temporal_prediction_of_shallow_landslides_exploiting_soil_saturation_degree_derived_by_ERA5-Land_products); PCA multi-lapisan: [NHESS 23:279 (2023)](https://nhess.copernicus.org/articles/23/279/2023/nhess-23-279-2023.pdf)
- **Nanping, Tiongkok (abstrak EGU26).** Kelembapan tanah anteseden 7 hari menangkap sebagian besar memori hidrologis yang relevan untuk keruntuhan lereng. Studi ini membandingkan ERA5-Land, SMAP-L4, dan SMCI1.0. — [EGU26-3068, doi:10.5194/egusphere-egu26-3068](https://meetingorganizer.copernicus.org/EGU26/EGU26-3068.html?pdf=) (abstrak konferensi, belum peer-review)
- **LHASA v2: kontribusi kelembapan tanah kecil secara global.** Gain XGBoost: hujan harian saat ini 0,74, hujan anteseden 2 hari 0,05, soil wetness total profil SMAP L4 0,02. — [Stanley et al. 2021, *Front. Earth Sci.* 9:640043](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- **API dengan konstanta peluruhan, Himalaya Timur Laut (preprint NHESS 2024).** K = 0,9 dipilih karena korelasinya dengan kelembapan tanah GLEAM paling baik dibanding K = 0,8 dan 0,84. Reviewer mempertanyakan validasinya. Tidak ada AUC/ROC per K. — [nhess-2024-152](https://nhess.copernicus.org/preprints/nhess-2024-152/)
- **Banjarnegara.** Ambang kumulatif 3 hari dan 15 hari dipakai sebagai pelengkap ambang ID (lihat bagian 1). Hidayat et al. 2019 dan Yuniawan et al. 2022 memakai jendela 1 hari dan 3 hari. — sumber di bagian 1
- **Antesenden relevan bila longsor tidak didominasi intensitas-durasi.** — [Peres & Cancelliere 2014, *HESS* 18:4913, doi:10.5194/hess-18-4913-2014](https://hess.copernicus.org/articles/18/4913/2014/)

### Inferences
- Di Indonesia, sistem yang beroperasi (ILEWS) memakai jendela 1 hari dan 3 hari, bukan 7 hari. Jendela 7 hari proyek mungkin mengaburkan hujan pemicu hari-H, yang di LHASA v2 adalah prediktor dominan. Pemisahan "hujan hari ini" dan "anteseden" sebagai dua fitur adalah perubahan murah yang paling didukung bukti.
- ERA5-Land swvl1/swvl2 sudah satu keluarga dengan ERA5 yang dipakai proyek. Menambahkannya sebagai prediktor dengan lag 5 hari punya bukti kenaikan TSS sekitar 0,09 (Sisilia). Transfer ke tropis belum terbukti.

### Gaps
- Tidak ditemukan studi tropis atau Indonesia yang menguji SMAP, ESA-CCI, atau SWI untuk peringatan longsor dengan TSS/AUC.
- Tidak ditemukan perbandingan langsung 3/7/14/30 hari dengan skill di Indonesia.

## 3. LHASA v2: prediktor, skill, kalibrasi global vs regional, kerentanan dinamis

### Takeaway
LHASA v2 mengganti peta kerentanan tetap dan pohon keputusan v1 dengan XGBoost atas variabel mentah (lereng maksimum, jarak sesar, kekuatan litologi, hujan hari ini yang dinormalisasi ke P99, hujan anteseden 2 hari, soil wetness SMAP, salju). Pada FPR yang sama dengan v1, TPR validasi 2019–2020 naik dari 45% ke 93%. Namun Indonesia termasuk hotspot dengan alarm palsu di atas 10%.

### Cited Findings
- **Prediktor.** Statis: lereng maksimum (DEM 90 m, diagregasi ke sel 30″), jarak ke sesar aktif (GEM), dan kekuatan litologi (GLiM). Dinamis: hujan harian IMERG Early v06B (hanya fase cair), hujan anteseden 2 hari, soil wetness total profil SMAP L4 (0–1), dan massa salju. Hujan hari ini dinormalisasi oleh P99 harian per sel dari distribusi log-normal 2000–2018. — [Stanley, Kirschbaum, Benz, Emberson, Amatya, Medwedeff, Clark 2021, *Front. Earth Sci.* 9:640043, doi:10.3389/feart.2021.640043](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- **Pentingnya fitur (gain/coverage/frequency).** Hujan hari ini 0,74/0,54/0,42; jarak sesar 0,10/0,09/0,12; lereng maksimum 0,08/0,10/0,12; anteseden 0,05/0,13/0,14; soil wetness 0,02/0,06/0,08; litologi 0,00/0,04/0,06; salju 0,00/0,04/0,06. — idem
- **Skill.** Ambang probabilitas 0,12 dipilih agar FPR sama dengan v1. TPR training 2015–2018 (95.957 longsor): v1.1 38%, v2 98%. TPR validasi 2019–2020 (3.555 longsor): **v1.1 45%, v2 93%**. Per inventaris: Cyclone Idai 0% → 100%, Burundi 12% → 46%, Rio de Janeiro 0% → 0%. Makalah tidak melaporkan AUC atau presisi. — idem
- **Indonesia sebagai hotspot alarm palsu.** Sebagian besar wilayah pegunungan punya laju alarm palsu di bawah 1%, tetapi Kolombia, Indonesia, dan Papua Nugini melampaui 10%. Model juga lemah di medan yang diubah manusia. — idem
- **Desain anti-overfit.** Kendala monotonisitas dan interaksi, kedalaman pohon maksimum 2, sel acak 80/20, dan validasi pada tahun terpisah. Negatif diambil dari lebih dari 1 juta sel acak dalam ruang dan waktu, dibanding 9.700 sel longsor. — idem
- **Konfirmasi ringkas.** Nowcast v2 dua kali lebih mungkin memprediksi longsor historis pada FPR global yang sama. — [EGU21-5620](https://meetingorganizer.copernicus.org/EGU21/EGU21-5620.html); [NTRS 20210015014](https://ntrs.nasa.gov/citations/20210015014)

### Inferences
- Proyek memakai arsitektur v1 (skor kerentanan berbobot tetap × pemicu biner). Bukti v2 menunjukkan kenaikan terbesar datang dari tiga hal: (a) melatih bobot dari data, bukan menetapkan 0,5/0,3/0,2; (b) hujan hari-H yang dinormalisasi per sel (P99) sebagai fitur kontinu, bukan biner; (c) GBDT dangkal monoton. Repo sudah punya GBDT tulisan tangan (modul `model-sebaran`) yang bisa dipakai ulang.
- Karena Indonesia adalah hotspot FPR LHASA global, kalibrasi regional dengan label DIBI lebih masuk akal daripada memakai keluaran LHASA v2 mentah. Meski begitu, probabilitas LHASA v2 bisa diuji sebagai satu fitur atau baseline.
- Klimatologi kab×bulan (AUC 0,777) praktis berperan sebagai "kerentanan dinamis musiman". Memasukkan frekuensi historis kab×bulan sebagai fitur (prior) adalah cara jujur untuk menyerap bias pelaporan dan musim sekaligus. Ini inferensi; belum ada sumber yang menguji ini.

### Gaps
- AUC LHASA v2 khusus Indonesia tidak dilaporkan.
- Evaluasi independen LHASA v2 di Asia Tenggara tidak ditemukan dalam penelusuran ini.

## 4. Faktor kerentanan yang penting di Indonesia: ukuran efek

### Takeaway
Studi Indonesia (sebagian besar frequency ratio atau LR skala DAS/kabupaten) konsisten menempatkan lereng, litologi, tutupan lahan, dan curah hujan sebagai faktor dominan. Jarak jalan, jarak sungai, dan NDVI berpengaruh kecil di Sulawesi Selatan. AUC berkisar 0,74–0,99, tetapi angka tertinggi berasal dari tesis atau validasi acak di dalam area yang sama sehingga kemungkinan terlalu optimistis.

### Cited Findings
- **DAS Rongkong, Sulawesi Selatan (2025, frequency ratio).** AUC **0,81**. Faktor dominan: curah hujan, lereng, tutupan lahan, elevasi, dan litologi. Jarak sungai, jarak jalan, dan NDVI berpengaruh lebih kecil. — [Unhas Discover](https://discover.unhas.ac.id/publications/land-use-direction-based-on-landslide-susceptibility-levels-in-the-rongkong-wate)
- **Sub-DAS Malino, Jeneberang (2025, FR + fuzzy gamma).** AUC success rate **0,743**, prediction rate **0,747**. — [Unhas Discover](https://discover.unhas.ac.id/publications/landslide-susceptibility-mapping-using-a-combination-of-frequency-ratio-and-fuzz/llms.txt)
- **Gunung Lompobattang, Sulawesi Selatan (2016).** Akurasi LR **6,34%** lebih tinggi dari FR. Faktornya termasuk litologi dan jarak jalan. — [Unhas Discover (Scopus 85044958162)](https://discover.unhas.ac.id/publications/pub_scopus_85044958162)
- **Kabupaten Bogor (2025).** Model hujan, lereng, litologi, tutupan lahan, dan NDVI menghasilkan AUC **0,86**. Tutupan lahan berpengaruh positif terkuat. Penulis mengakui kemungkinan bias inventaris. — (ringkasan hasil pencarian; sumber primer tidak terbuka, lihat Gaps)
- **Karanganyar, Jawa Tengah (tesis).** ANN AUC **0,988** vs LR **0,959**. Litologi dan penggunaan lahan paling berpengaruh. — (ringkasan hasil pencarian; tesis, bukan peer-review)
- **LHASA v2 global.** Litologi (GLiM) hampir nol kontribusinya (gain 0,00); jarak sesar 0,10 dan lereng 0,08. — [Stanley et al. 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)

### Inferences
- Tutupan lahan konsisten muncul di Jawa dan Sulawesi, sehingga rencana ESA WorldCover didukung. Perubahan tutupan lahan (misalnya kehilangan hutan) tidak dikuantifikasi di studi yang ditemukan.
- Proyek sudah mendapati CN dari SoilGrids nyaris konstan (95% HSG D). Litologi global (GLiM) juga lemah secara global. Peta geologi Badan Geologi 1:250.000 atau zona PVMBG (sudah dipakai) kemungkinan lebih informatif daripada tekstur tanah.
- AUC kerentanan tingkat piksel dari studi lokal tidak bisa dibandingkan langsung dengan AUC kab×hari proyek, karena skala dan validasinya berbeda.

### Gaps
- Ukuran efek (odds ratio atau gain) untuk TWI, plan curvature, tanah vulkanik lapuk, dan potongan jalan di Indonesia tidak ditemukan dalam bentuk kuantitatif yang terverifikasi.
- Tidak ada studi kerentanan Sumatra dengan ML dan AUC yang muncul di penelusuran.
- Penulis dan DOI untuk studi Rongkong, Malino, Bogor, dan Karanganyar belum diverifikasi.

## 5. Model hidrologi fisik (TRIGRS, SHALSTAB) vs ambang statistik di skala regional

### Takeaway
Tidak ditemukan perbandingan kepala-ke-kepala dengan ROC/TSS di tropis pada skala regional. Bukti yang ada bersifat studi kasus satu DAS. Untuk skala kab×hari di seluruh Indonesia, model fisik tidak sebanding dengan kebutuhan parameter geoteknisnya; ambang empiris dan statistik tetap pilihan realistis.

### Cited Findings
- **Andes Kolombia (tropis, data langka).** Dua metode ambang berbasis fisik dinilai berpotensi berguna untuk LEWS dan bisa melengkapi ambang empiris. — [Catena 2021 (ScienceDirect S0341816221004215)](https://www.sciencedirect.com/science/article/abs/pii/S0341816221004215); [TRIGRS Andes Kolombia](https://www.researchgate.net/publication/345978787_Assessing_the_Effectiveness_of_TRIGRS_for_Predicting_Unstable_Areas_in_a_Tropical_Mountain_Basin_Colombian_Andes)
- **TRIGRS tidak menghasilkan ambang langsung.** Keluarannya grid faktor keamanan, sehingga ambang harus diturunkan dari hubungan keluaran dengan hujan masukan. — [Frontiers Earth Sci 2022, doi:10.3389/feart.2022.971655](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2022.971655/xml)
- **Kebutuhan sampel ambang empiris.** Sekitar 200 kejadian longsor diperlukan untuk estimasi parameter ambang yang cukup presisi. Hujan non-pemicu bisa dipakai bila data longsor langka. — [Landslides 2021, doi:10.1007/s10346-021-01704-7](https://link.springer.com/article/10.1007/s10346-021-01704-7)
- **Tinalah, Kulon Progo.** Ambang empiris divalidasi dengan pemodelan numerik. — (lihat bagian 1)

### Inferences
- Jumlah kejadian DIBI per zona kemungkinan di atas sekitar 200 untuk Jawa, tetapi di bawahnya untuk banyak provinsi luar Jawa. Ambang ID per zona (rencana proyek) sebaiknya digabung (pooled) dengan efek zona, bukan dipasang terpisah per zona. Ini inferensi.
- Model fisik layak hanya untuk DAS prioritas dengan data tanah lapangan, bukan untuk nowcast nasional.

### Gaps
- Tidak ada perbandingan kuantitatif TRIGRS/SHALSTAB vs ambang empiris di Indonesia atau Asia tropis.

## 6. Menangani inventaris longsor yang kurang lapor (bias sampling/pelaporan, inventaris satelit)

### Takeaway
Pendekatan yang terbukti adalah memodelkan bias secara eksplisit: proksi aksesibilitas seperti jarak atau kepadatan jalan dimasukkan sebagai efek acak dalam regresi logistik efek campuran (Steger et al.). Pendekatan ini paling baik mereproduksi data referensi dibanding model yang dilatih langsung pada inventaris tidak lengkap. LHASA v2 juga mengakui bias linguistik dan ekonomi pada NASA GLC.

### Cited Findings
- **Efek campuran (Steger et al. 2017).** Variabel kategoris yang menggambarkan ketidaklengkapan inventaris dimasukkan sebagai efek acak. Dari semua model yang dilatih pada inventaris yang sangat tidak lengkap, pendekatan efek campuran paling baik mereproduksi data referensi. — [Steger, Brenning, Bell, Glade 2017, *Landslides* 14:1767–1781, doi:10.1007/s10346-017-0820-0](https://link.springer.com/content/pdf/10.1007/s10346-017-0820-0.pdf)
- **Skala nasional (Austria 2021).** Pendekatan yang sama diterapkan secara nasional; setelah bias diperhitungkan, porsi piksel dengan prediksi <0,5 bergeser ke 53%. — [Landslides 2021, doi:10.1007/s10346-021-01693-7](https://link.springer.com/article/10.1007/s10346-021-01693-7) (angka dari ringkasan hasil pencarian)
- **Kerentanan global dari GLC.** Kepadatan jalan dipakai sebagai efek acak untuk menyerap bias pelaporan di daerah yang sering diakses. — [NHESS preprint nhess-2021-360](https://nhess.copernicus.org/preprints/nhess-2021-360/nhess-2021-360.pdf)
- **Bias inventaris NASA.** Laporan NASA tentang efek bias inventaris pada perhitungan kerentanan. — [NTRS 20170011349](https://ntrs.nasa.gov/api/citations/20170011349/downloads/20170011349.pdf?attachment=true)
- **LHASA v2.** Mengakui bias linguistik dan ekonomi pada Global Landslide Catalog. Longsor dengan ketidakpastian spasial >1 km dan pemicu non-hujan dibuang. — [Stanley et al. 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- **Progo.** Hanya 51,6% kejadian BNPB/BPBD yang diketahui jamnya, sehingga ambang jam-an terbatas pada subset ini. — [Satyaningsih et al. 2023](https://link.springer.com/article/10.1007/s11069-023-06208-2)

### Inferences
- Klimatologi kab×bulan mengalahkan model proyek mungkin sebagian karena klimatologi menangkap "di mana BPBD melapor", bukan hanya "di mana longsor terjadi". Menambahkan kepadatan jalan atau populasi kab (efek acak atau offset) dan membandingkan skill pada subset kab yang "pelapor aktif" akan memisahkan dua efek ini. Ini inferensi.
- Label DIBI tingkat kab per tanggal cocok dengan desain kab×hari. Ketidakpastian lokasi di bawah kab membuat fitur piksel halus (TWI, curvature) kurang bermanfaat sampai labelnya lebih presisi.

### Gaps
- Tidak ditemukan studi terbit yang mengukur kelengkapan DIBI terhadap inventaris satelit.
- Inventaris satelit Sentinel-2 change detection (misalnya hasil pemetaan cepat pasca-kejadian) untuk Indonesia, beserta tingkat recall-nya, tidak tercakup penelusuran ini (anggaran pencarian habis).
- Kandidat dari pengetahuan sebelumnya yang **belum diverifikasi sesi ini**, dan perlu dicek sebelum dikutip: Guzzetti et al. 2020 *Earth-Science Reviews* 200 (review ambang dan LEWS, doi:10.1016/j.earscirev.2019.102973); Segoni, Piciullo & Gariano 2018 *Landslides* (review ambang); Kirschbaum & Stanley 2018 *Earth's Future* 6(3):505–523 (LHASA v1, doi:10.1002/2017EF000715, dikutip dalam Muntohar et al. 2021); Brunetti et al. 2018 (produk hujan satelit untuk ambang di Italia, dikutip Satyaningsih et al. 2023).
