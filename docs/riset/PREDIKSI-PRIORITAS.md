# Riset: model prediksi dan prioritas sumber daya karhutla yang bisa dipertanggungjawabkan

Disusun 23 Okt 2026. Riset saja, tidak ada berkas repo yang diubah.
Tanda **[belum terverifikasi]** = saya tidak berhasil membaca sumber aslinya; angkanya dari ringkasan pihak kedua.

Konteks repo (dibaca sekilas, tidak diaudit):
- `scripts/data/aturan.py`: level Rutin/Patroli/Siaga/Prioritas dari luas front 24 jam × FWI. Skor peringkatnya = bahaya × (1 + celah respons dari jarak Daops). Paparan (permukiman searah angin, gambut, kawasan lindung) disebut di docstring sebagai "ditambahkan saat data tersedia".
- `scripts/sebaran/RISET-SEBARAN.md`: model "lolos" per titik api baru dengan **base rate 3,1%** (11.622 dari 370.112). AUC uji 0,89–0,90. Di ambang WASPADA (recall 70%) presisinya 19%. Recall per tahun 45–74%, per lahan: gambut 76%, mineral 52%, sabana 47%. Sudah ada evaluasi prospektif `prospektif.json`.
- Angka "AUC 0,70" di repo untuk target yang lain: peluang lolos dari model sel Monte Carlo (Brier 0,062 vs iklim 0,077). Dua angka AUC ini jangan dicampur di depan pengguna.

---

## A. Kondisi terkini secara umum

### A1. Memprediksi eskalasi atau kebakaran besar dari deteksi satelit
- Saya tidak menemukan karya peer-review yang mapan dan khusus memprediksi "api kecil jadi besar" dari deteksi VIIRS. Karya yang dekat:
  - Peramalan FRP per jam dengan XGBoost + HRRR (NOAA/CIRES; abstrak konferensi, https://insidecires.colorado.edu/rendezvous/uploads/Rendezvous_2023_7671_1683827753.pdf).
  - Rekonstruksi progresi api dari VIIRS dengan GAN (arXiv 2506.10404, https://arxiv.org/html/2506.10404v1).
  - Jadi model "lolos" di repo ini termasuk wilayah yang belum banyak digarap. Itu peluang, tapi juga artinya tidak ada patokan publik untuk dibandingkan.
- Produk VIIRS 375 m: komisi < 1,2% untuk piksel *nominal*. Dibanding VIIRS 750 m, ia mendeteksi ~3× lebih banyak piksel siang dan ~25× malam (Schroeder dkk., 2014, *Remote Sensing of Environment* 143:85–96, https://earthdata.nasa.gov/s3fs-public/imported/Schroeder_et_al_2014b_RSE.pdf).
- Chen dkk. (2020, *IEEE TGRS*) meramal aktivitas api 1–5 hari dari jumlah titik MODIS + ERA-Interim. Model dipisah jadi "penyalaan baru" dan "dinamika api yang sudah ada". Model persistensi terlalu banyak menghitung karena mengabaikan padamnya api, dan VPD jadi prediktor cuaca terbaik (ringkasan NASA: https://modis.gsfc.nasa.gov/sci_team/pubs/abstract_new.php?id=38924) **[belum terverifikasi: angka dari ringkasan]**. Pemisahan ini cocok dengan struktur repo (lolos vs sebaran sel).

### A2. Durasi dan persistensi
- Literaturnya tipis dan kebanyakan preprint: regresi durasi (Xiao, 2023, arXiv 2308.08936, https://arxiv.org/abs/2308.08936v1) dan waktu pengendalian api California (Bhardwaj, 2025, arXiv 2512.09835) **[belum terverifikasi: belum peer-review]**.
- Kesimpulan praktis: persistensi lebih aman dimodelkan sebagai klasifikasi sederhana ("masih aktif ≥ 3 hari?") atau analisis survival. Regresi jumlah hari kurang cocok.

### A3. Kerangka prioritas operasional
- **AS, WFDSS**: dua komponen, peluang sebaran api (FSPro) dan *Rapid Assessment of Values at Risk* (RAVAR). Risiko = irisan ancaman (peluang api sampai) dengan nilai yang terancam. Dipakai untuk memutuskan di mana pemadaman agresif layak (Calkin, Thompson, Finney & Hyde, 2011, *Journal of Forestry* 109(5):274–280, https://research.fs.usda.gov/treesearch/41565).
  - *Relative Risk Assessment* di WFDSS menggabungkan rating Nilai, Bahaya, dan Peluang, tapi ratingnya diputuskan **secara subjektif** oleh tim lokal (https://www.nrfirescience.org/resource/12727).
  - Pelajarannya: bahkan sistem AS menggabungkan model dengan pertimbangan manusia, bukan bobot otomatis.
- **Kanada**: model spasial penggunaan pesawat harian untuk serangan awal di British Columbia memakai kovariat FWI. Risiko dasar, kepadatan penduduk, dan kepadatan jalan paling berpengaruh (*Int. J. Wildland Fire*, 2022, https://publish.csiro.au/WF/fulltext/WF21090) **[belum terverifikasi: penulis tidak terbaca]**.
  - Optimasi alokasi serangan awal dengan program integer (Rideout dkk., 2011, *Int. J. Safety & Security Eng.* 1(3):312–325, https://iieta.org/download/file/fid/47738).
  - Simulasi Ontario (Martell dkk., 1984, *Interfaces* 14(5):20–32, https://ideas.repec.org/a/inm/orinte/v14y1984i5p20-32.html).
- **Australia, AFDRS**: prototipe riset diuji **live** pada musim Okt 2017–Mar 2018 terhadap 336 kebakaran, dinilai pakar. Hasilnya benar 56% vs 43% untuk sistem lama (FFDI/GFDI), dengan kecenderungan melebih-lebihkan (*Int. J. Wildland Fire* WF23143, https://publish.csiro.au/WF/WF23143) **[belum terverifikasi: angka dari ringkasan; teks penuh gagal dibuka]**.
  - Uji NSW RFS memakai campuran uji live dan uji retrospektif karena musim 2021–22 sepi (AJEM Okt 2022, https://knowledge.aidr.org.au/resources/ajem-october-2022-lessons-from-nsw-rfs-trial-of-the-australian-fire-danger-rating-system/).
- **EFFIS/GWIS (Eropa)**: FWI dari ECMWF HRES/ENS (51 anggota, sampai 10 hari) diverifikasi terhadap area terbakar GFED4 memakai *Extremal Dependence Index*. Kejadian "hit" = FWI di atas persentil ke-75 lokal (Di Giuseppe dkk., 2020, *NHESS* 20:2365, https://nhess.copernicus.org/articles/20/2365/2020/). Ada perangkat kalibrasi dan verifikasi terbuka, CaliVer (Vitolo, Di Giuseppe & D'Andrea, 2018, *PLOS ONE*).

### A4. Cara mereka memvalidasi
Polanya sama: kategori bahaya relatif terhadap iklim lokal (persentil), dan verifikasi terhadap kejadian nyata (area terbakar atau deteksi). Sistem baru diuji secara **live atau prospektif** sebelum resmi dipakai (AFDRS). Metrik probabilistik dan nilai ekonomi dipakai untuk model peluang (lihat ProbFire di B4).

---

## B. Spesifik Indonesia dan gambut

### B1. Pendorong dan ambang
- **Muka air tanah gambut**: kelas bahaya tinggi kebanyakan muncul saat muka air turun di bawah 40 cm, dan lahan terbakar hanya terjadi bila di bawah 60 cm (Kubu Raya & Batanghari, 2018–2019). Studi yang sama mengusulkan *Peat Fire Vulnerability Index* (Taufik dkk., 2022, *Agricultural and Forest Meteorology* 312:108738, https://www.tropicalpeatlands.org/knowledge/publication/11463_23298). Ini dasar `RISET-PFVI.md` di repo.
  - Wösten dkk. (2008) menyarankan muka air dijaga antara 40 cm di bawah dan 100 cm di atas permukaan (https://peatlands.org/document/peat-water-inter-relationships-in-a-tropical-peatland-ecosystem-in-south-east-asia/).
  - Ambang optimal tidak berlaku umum karena bergantung sifat fisik gambut (catatan studi SWAP di hasil yang sama) **[belum terverifikasi]**.
- **Hujan dan Drought Code**:
  - Lingkungan api tetap sangat peka secara nonlinear saat hujan musim kemarau < 4 mm/hari (Field dkk., 2016, *PNAS*, https://pmc.ncbi.nlm.nih.gov/articles/PMC4995960).
  - Kabut asap parah mungkin terjadi di atas DC ≈ 388 (Field dkk., 2004, https://adinet.ahacentre.org/repository/detail/a_drought_based_predictor_of_recent_haze_events_in_western_indonesia_20040401).
  - Kabut asap parah naik tajam saat DC > 400. Ambang FFMC 82 untuk penyalaan rumput dan ISI ≥ 6 untuk intensitas sangat tinggi (makalah pengembangan FDRS Indonesia–Malaysia 2007, https://hazeportal.asean.org/?p=10687).
  - BMKG menyebut DC > 350 "sangat kering" (https://www.bmkg.go.id/cuaca/karhutla/dc). Ambang di `aturan.py` (DC > 350) sejalan dengan BMKG.
  - Ambang FWI dan DC berbeda per tutupan lahan (EGU2019-8082, https://meetingorganizer.copernicus.org/EGU2019/EGU2019-8082.pdf).
- **ENSO dan IOD**:
  - Prakiraan musiman ECMWF System 4 menjelaskan ≥ 70% varians area terbakar beberapa bulan sebelumnya, terutama di Kalimantan bagian selatan. Hasilnya bias positif di tahun El Niño (Fernandes dkk., 2015, *NHESS* 15:429, https://nhess.copernicus.org/articles/15/429/2015/). Catatan: ini Fernandes 2015, bukan 2011.
  - Kemarau di Sumatra utara-tengah cenderung terkait IOD positif.
- **Kanal, permukiman, konsesi**:
  - Di eks-PLG Kalimantan Tengah, jarak ke permukiman dan jarak ke kanal konsisten jadi faktor terpenting. Akurasi > 75% dan presisi > 67,5%, tapi **recall hanya > 25%** (Horton, Virkki, Lounela, Miettinen, Alibakhshi & Kummu, 2021, *Earth and Space Science*, doi 10.1029/2021EA001873, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9286596/). Ini contoh nyata model yang "akurat" tapi melewatkan sebagian besar api.
  - Di Borneo 1982–2010, random forest 0,04° menjelaskan 56% variasi bulanan. Luas sawit menaikkan frekuensi api sampai menutup 20% sel (Sloan, Locatelli, Wooster & Gaveau, 2017, *Global Environmental Change* 47:95–109, https://researchonline.jcu.edu.au/51951/).
- **Restorasi (BRG/BRGM)**:
  - Studi kontrafaktual 2017–2022 di Kalbar dan Kalteng: sekat kanal dengan area basah yang saling tumpang paling efektif. Bila semua sekat efektif, maksimal 6,4% area terbakar bisa dihindari (Castro dkk., 2026, *iScience* 29(6), https://www.conservationgateway.org/collections/land/effective-restoration-avoid-peatland-fires-kalimantan-indonesia/).
  - Tinjauan teknik restorasi menilai efektivitasnya jarang dievaluasi ketat (Dohong, Aziz & Dargusch, 2018, *Wetlands*, https://research.monash.edu/en/publications/a-review-of-techniques-for-effective-tropical-peatland-restoratio/).
  - Laporan bahwa sumur bor lebih efektif daripada sekat kanal, penurunan titik api sampai 22%, dan 70% unit sekat kanal rusak (2015–2024): **[belum terverifikasi: dari ringkasan, sumber primer tidak terbaca]**.
  - Implikasinya: status "sudah direstorasi" jangan dipakai sebagai pengurang risiko tanpa data kondisi sekat atau muka air.

### B2. Batas data deteksi di Indonesia
- MODIS di hutan rawa gambut terdegradasi Kalimantan: omisi area terbakar sekitar 60%, komisi titik panas sekitar 8%, sekitar 15–16 ha per titik (Tansey dkk., 2008, *JGR-Atmospheres* 113:D23112, doi 10.1029/2008JD010717, https://modarch.gsfc.nasa.gov/sci_team/pubs/abstract_new.php?id=01368).
- Membara (*smouldering*) sulit dideteksi dari ruang angkasa karena suhunya rendah dan sebarannya kecil (Sofan dkk., 2019, *Remote Sensing* 11(4):465).
- Pada 2019, peta area terbakar Gaveau dkk. masih punya omisi 24,4%, sedangkan omisi angka pemerintah 50,5%. Awan disebut sebagai kendala (via Mongabay, https://news.mongabay.com/2021/12/2019-fires-in-indonesia-were-twice-as-bad-as-the-government-claimed-study-shows/) **[belum terverifikasi: sumber primer tidak dibuka]**.
- Konsekuensinya: "luas terbakar" KLHK dan BNPB adalah label yang bising dan cenderung terlalu rendah, terutama di gambut.

### B3. Sistem resmi
- **FDRS/SPBK BMKG** diadaptasi dari FWI Kanada dan beroperasi nasional sejak Feb 2002 (https://jmg.bmkg.go.id/jmg/index.php/jmg/article/view/181). Batas kelas FFMC/DC/FWI resmi SPBK tidak saya temukan. Ambil langsung dari BMKG.
- **SiPongi KLHK** memakai tiga tingkat kepercayaan: rendah 0–29, sedang 30–79, tinggi 80–100. Titik panas bukan jumlah kejadian kebakaran (via Databoks, https://databoks.katadata.co.id/en/demographics/statistics/7d5973919e6ea75/) **[belum terverifikasi: Databoks menyebut artikelnya terjemahan AI]**.
- **Permen LHK P.32/2016** mengatur organisasi, SDM, sarpras, operasional, pelaporan, dan evaluasi dalkarhutla (https://peraturan.bpk.go.id/Details/298069). Saya **tidak** berhasil membaca pasal yang mengatur urutan prioritas pemadaman. Jangan klaim model ini "sesuai P.32" sebelum pasal operasionalnya dibaca.
- **Inpres 3/2020** menggantikan Inpres 11/2015 dan mencakup pencegahan, pemadaman, dan pasca-kebakaran. Penerimanya antara lain menteri, Kepala BNPB, Kepala BMKG, Panglima TNI, Kapolri, gubernur, dan bupati/wali kota (https://setkab.go.id/presiden-teken-inpres-nomor-3-tahun-2020-tentang-penanggulangan-karhutla/). Inpres ini tidak mewajibkan pelaporan publik (kajian hukum via hukumonline, https://www.hukumonline.com/berita/a/sejumlah-pekerjaan-rumah-pemerintah-untuk-atasi-persoalan-karhutla-lt603e10791fa7d/) **[belum terverifikasi: teks Inpres tidak terbuka, server 500]**.

### B4. Model prediksi Indonesia yang paling layak ditiru metodenya
**ProbFire** (Nikonovas, Spessa, Doerr, Clay & Mezbahuddin, 2022, *NHESS* 22:303–322, https://nhess.copernicus.org/articles/22/303/2022/):
- Model: MLP kecil yang memprediksi peluang jumlah titik api bulanan per sel melewati ambang.
- Masukan: iklim, fraksi gambut, riwayat api, hutan primer, dan kehilangan hutan.
- Validasi: **tinggalkan-satu-tahun** 2002–2019, dengan reliability diagram, AUC, POD/FAR, Brier, dan **nilai ekonomi relatif (cost-loss)**.
- Hasil: unggul dari model iklim-saja pada lead 2–4 bulan di Kalsel, Sumsel, dan Papua selatan. **Tidak ada manfaat di Kalbar.**
- Pelajarannya: laporkan skill per wilayah dan akui wilayah di mana model tidak berguna.

---

## C. Validasi dan akuntabilitas

### C1. Yang membuat model bisa dipertanggungjawabkan
1. **Kartu model**: dokumen pendek berisi tujuan pakai, pemakaian yang tidak dianjurkan, data, prosedur evaluasi, dan kinerja per kelompok (Mitchell dkk., 2019, FAT*, https://arxiv.org/abs/1810.03993). Untuk kasus ini, "kelompok" = provinsi, jenis lahan (gambut, mineral, sabana), tahun El Niño vs normal, dan sensor.
2. **Kalibrasi**:
   - Reliability diagram: titik di garis x = y artinya terkalibrasi. Kalibrasi sempurna saja tidak cukup, model juga harus punya resolusi (https://arxiv.org/pdf/1608.06319).
   - Brier Skill Score relatif terhadap iklim, terurai jadi reliabilitas dan resolusi (https://arxiv.org/pdf/2012.00679).
   - Repo sudah melaporkan Brier 0,062 vs iklim 0,077, artinya BSS ≈ 0,19 (hitungan saya).
3. **Metrik yang sesuai keputusan**, bukan AUC. Komandan punya anggaran tetap (misalnya 5 regu, 2 heli per provinsi per hari). Metrik utamanya **recall pada anggaran K**: dari api yang akhirnya membesar, berapa yang ada di K teratas daftar hari itu. Tambahkan nilai ekonomi relatif ala ProbFire.
4. **Evaluasi prospektif/live** sebelum dipakai resmi, seperti AFDRS. Repo sudah punya pondasinya (`prospektif.json`).
5. **Ketidakpastian ditampilkan**: rentang P10–P90 (repo sudah memakai konformal 80%) dan label "keyakinan rendah" untuk strata yang skill-nya buruk.

### C2. Jebakan umum
- **Kebocoran spasial dan temporal**:
  - k-fold acak pada data berstruktur ruang dan waktu meremehkan galat prediksi secara serius (Roberts dkk., 2017, *Ecography* 40(8):913–929). Angka "> 50%" sering dikutip **[belum terverifikasi]**.
  - Pakai blok tahun (repo sudah) **dan** blok spasial (misalnya kabupaten atau sel 50 km ditahan). Jangan biarkan titik api dari kompleks yang sama masuk ke latih dan uji sekaligus.
- **Melupakan base rate**: base rate 3,1% berarti presisi 19% pada recall 70%, yaitu kira-kira 4 alarm palsu untuk tiap 1 api yang benar-benar membesar. Ini harus tertulis di layar dalam kalimat biasa, bukan disembunyikan di AUC 0,9.
- **Perubahan sensor MODIS → VIIRS**: VIIRS menemukan jauh lebih banyak api kecil (Schroeder dkk., 2014). Perbandingan MODIS–VIIRS dari NOAA/UMD menyebut 45% piksel VIIRS siang dan 80% malam tidak punya padanan di Aqua/MODIS (presentasi GOFC 2017, https://gofcgold.umd.edu/sites/default/files/fireit_meetings/GOFC_Fire_IT_2017/day1/Schroeder.pdf) **[belum terverifikasi]**.
  - NOAA-20 masuk 2018 dan NOAA-21 masuk 2023. Fitur "riwayat titik" dan label "membesar" yang dihitung dari jumlah piksel otomatis bergeser saat jumlah satelit berubah.
  - Normalkan per lintasan dan per satelit, atau latih dari satu satelit (S-NPP), seperti `lacak.py panjang`.
- **Omisi karena awan dan asap**: hari tanpa deteksi ≠ api padam. Label "padam" atau "tidak membesar" harus mensyaratkan lintasan cerah (cek tutupan awan).
- **Label luas terbakar** dari KLHK/BNPB terlambat dan terlalu rendah (B2). Pakai sebagai validasi sekunder, bukan label latih utama.
- **Umpan balik intervensi**: api yang diprioritaskan lalu dipadamkan akan tampak "tidak membesar". Setelah model dipakai, data baru jadi bias. Catat tindakan apa yang diambil per kompleks sejak mode bayangan.

---

## D. Rancangan skor prioritas yang direkomendasikan

### D1. Bentuk skor
Ikuti logika WFDSS: risiko = peluang × konsekuensi, lalu dibagi biaya respons. Usulannya:

```
Prioritas = P(eskalasi 72 j) × Paparan_tertimbang × (1 + w_p·P(bertahan ≥ 3 hari)) × Faktor_jangkau
```

| Komponen | Isi | Sumber data di repo | Catatan |
| --- | --- | --- | --- |
| P(eskalasi) | Peluang terkalibrasi (Platt/isotonic) dari model `lolos`/sebaran | `model_sebaran.json` | Harus berupa peluang, bukan skor mentah, supaya bisa dikalikan |
| Paparan | Ha harapan terbakar × (1 + gambut + kawasan lindung) + jiwa/desa dalam jangkauan 72 j + infrastruktur (jalan) | `ramal().kena`: `ha_harapan`, `gambut_ha`, `lindung_ha`, `desa`, `jiwa` | Sudah dihitung evaluator, tinggal dipakai di peringkat |
| Persistensi | P(masih aktif ≥ 3 hari), memakai DC/PFVI/muka air sebagai fitur | `hari_aktif`, DC, PFVI | Gambut dalam + DC > 350 → membara lama (Taufik dkk. 2022) |
| Jangkauan | Waktu tempuh dari Daops/posko ke kompleks; menentukan **jenis** sumber daya, bukan hanya urutan | `jarak_daops_km` | Jauh + akses darat buruk → kandidat heli; dekat → regu darat |
| Biaya | Dipakai saat memilih, bukan di skor: heli dan OMC mahal, jadi hanya dipakai di atas ambang | — | OMC hanya bermakna untuk wilayah luas dan butuh awan; pisahkan dari peringkat kompleks |

Prinsip desain:
- **Pisahkan peluang dari konsekuensi** di layar. Komandan perlu tahu apakah "api ini nomor 1 karena kemungkinan besar meledak" atau "karena dekat desa". Itu inti WFDSS/RAVAR.
- **Bobot paparan jangan dipelajari dari data.** Itu pilihan nilai (jiwa vs gambut vs lindung) yang harus diputuskan pengguna (BNPB/KLHK), lalu dicatat versinya di kartu model. Di WFDSS pun rating nilai ditetapkan tim lokal.
- **Pertahankan skor `aturan.py` sebagai pembanding.** Model baru hanya boleh menggantikannya bila mengalahkannya secara terukur.

### D2. Label hasil untuk validasi historis
1. **Eskalasi (utama)**: kompleks mencapai ≥ N sel 375 m baru dalam 72 jam (definisi `lolos` yang sudah ada).
2. **Persistensi**: masih terdeteksi pada hari ke-3 dan ke-7, hanya dihitung bila ada lintasan cerah.
3. **Dampak (sekunder)**: luas terbakar KLHK per kabupaten per bulan dan laporan harian BNPB (desa terdampak, pengungsi, ISPU). Dipakai untuk menguji apakah skor paparan berkorelasi dengan dampak nyata. Ini uji peringkat (Spearman per kabupaten-musim), bukan label latih.

### D3. Metrik dan ambang penerimaan
Ambang di bawah ini **usulan saya**, bukan standar literatur. Tetapkan sebelum melihat data uji, lalu bekukan.

| Metrik | Cara hitung | Ambang terima |
| --- | --- | --- |
| Recall@K | Per provinsi per hari, K = kapasitas nyata (misal 5 dan 10); porsi api yang membesar dan masuk K teratas | ≥ 10 poin persen di atas skor `aturan.py` pada uji tahun-ditahan, dan tidak lebih buruk di provinsi mana pun lebih dari 5 poin |
| BSS vs iklim | Per strata lahan dan provinsi | > 0 di semua strata dengan n eskalasi ≥ 30; strata yang gagal diberi label "keyakinan rendah" |
| Kalibrasi | Reliability diagram 10 bin; slope kalibrasi | Slope 0,8–1,2; ECE < 0,02 (base rate 3%) |
| Stabilitas tahun | Tinggalkan-satu-tahun 2015–2025 | Recall@K minimum per tahun dilaporkan; tahun El Niño (2015, 2019, 2023) dan tahun sepi terpisah |
| Blok spasial | Tahan satu provinsi | Penurunan recall@K ≤ 10 poin dari uji tahun |
| Alarm palsu | Per api yang benar membesar, pada ambang operasional | Ditampilkan dalam kalimat biasa ("± 4 alarm untuk 1 api nyata") |
| Paparan vs dampak | Spearman skor paparan agregat vs luas terbakar/dampak BNPB per kabupaten-musim | ρ > 0 dengan selang 95% tidak memotong 0 |

### D4. Peluncuran bertahap
1. **Tahap 0, arsip (sekarang)**: uji balik 2015–2025 dengan blok tahun + spasial, dibandingkan dengan `aturan.py` dan dengan "ukuran saja" (px24). Tulis kartu model.
2. **Tahap 1, mode bayangan (satu musim penuh, Jul–Nov)**:
   - Skor dihitung dan **dibekukan** tiap jam 07.00 WIB, tapi tidak tampil ke komandan.
   - Hasilnya dinilai terhadap FIRMS NRT 72 jam kemudian (memperluas `prospektif.json`).
   - Catat juga daftar prioritas yang benar-benar dipilih posko, misalnya dari sitrep BNPB, supaya bisa dibandingkan dengan pilihan manusia.
3. **Tahap 2, berdampingan**: tampil sebagai "saran" di samping level resmi, dengan alasan per komponen dan rentang ketidakpastian. Kumpulkan umpan balik dan catat tindakan yang diambil (perlu untuk koreksi bias intervensi).
4. **Tahap 3, operasional**: hanya bila tahap 1 lolos ambang D3. Evaluasi ulang tiap akhir musim. Bila recall@K prospektif turun di bawah pembanding dua bulan berturut-turut, model otomatis turun kembali ke mode bayangan.

---

## Rekomendasi berurutan
1. **Ganti metrik utama dari AUC ke recall@K per provinsi-hari**, dibandingkan dengan skor `aturan.py` yang sekarang. Paling murah dan paling menjawab pertanyaan komandan.
2. **Jalankan satu musim mode bayangan dengan skor dibekukan** sebelum tampil sebagai prioritas. Pondasinya (`prospektif.json`, `nilai.jsonl`) sudah ada.
3. **Masukkan paparan yang sudah dihitung `SebaranModel.ramal().kena` ke `aturan.skor`**. Docstring-nya sudah menjanjikan ini. Bobotnya ditetapkan pengguna, bukan dipelajari.
4. **Tambahkan blok spasial (tahan provinsi) ke validasi silang** di samping blok tahun, dan laporkan per provinsi seperti ProbFire. Akui terbuka wilayah tanpa skill (sabana/mineral: recall 47–52%).
5. **Tulis kartu model** (tujuan, larangan pakai, data, base rate 3,1%, alarm palsu per api nyata, kinerja per strata, versi bobot).
6. **Kendalikan perubahan sensor**: normalkan fitur dan label per satelit/lintasan, atau latih dari satu satelit. Uji ulang kinerja sebelum dan sesudah NOAA-21.
7. **Syaratkan lintasan cerah untuk label "padam" atau "tidak membesar"**. Tanpa ini, persistensi dan eskalasi di gambut berasap terlalu rendah.
8. **Pakai luas terbakar KLHK dan laporan BNPB hanya sebagai validasi sekunder** (korelasi peringkat), karena omisinya 25–60% (B2).
9. **Pisahkan keputusan OMC dari peringkat kompleks**. OMC bekerja di skala wilayah dan butuh awan, jadi lebih cocok dipicu oleh DC/PFVI/prakiraan musiman (ambang ala Field 2016, Fernandes 2015, ProbFire) daripada oleh skor per api.
10. **Baca langsung pasal operasional P.32/2016 dan teks Inpres 3/2020** sebelum mengklaim kesesuaian regulasi. Saya tidak berhasil memverifikasi isi prioritas pemadaman di keduanya.

Yang tidak bisa saya verifikasi: angka AFDRS dan Chen 2020 (dari ringkasan), teks Inpres 3/2020, batas kelas SPBK, angka sumur bor vs sekat kanal, dan angka "> 50%" Roberts 2017.
