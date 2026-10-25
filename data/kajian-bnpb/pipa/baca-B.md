# baca-B: ringkasan berkas paket pipa karhutla (hanya baca, tanpa penilaian)

Sumber: ~/Downloads. Hash: salinan "(1)" untuk Paket_Data_Publik_API_RAB_Simulasi (md5 6fe8499d...), Grand_Design_..._Paket_Data_API_Gambar_2026.docx (md5 648d16a8...), Paket_Gambar_Teknik_API_Kode_Karhutla.zip (md5 0ff04c82...) IDENTIK dengan aslinya, diabaikan. ZIP diekstrak ke scratchpad/pipa-zip/{lengkap,gambar}. Status semua berkas: "WORKING DRAFT / NOT FOR CONSTRUCTION", angka ilustratif/asumsi.

## 1. Matriks_Produktivitas_Pemasangan_Pipa_Karhutla.xlsx (5 sheet; 4 sheet pertamanya sama persis dengan 4 sheet awal Paket_Data_Publik)

### Parameter (nilai editable)
Panjang pipa utama 2000 m; panjang per gulung 100 m; regu pemasangan 8 orang; jam efektif 8 jam/hari; upah asumsi Rp250.000/orang/hari; setup awal 2 jam; commissioning awal 2 jam; kontingensi 0,2; personel pendukung 2 orang; panjang total cabang 400 m; lokasi "Belum ditetapkan (AOI GIS)". Peringatan: semua produktivitas dan upah asumsi ilustratif, bukan pengukuran/harga pasar; wajib kalibrasi time-motion study, izin lintasan, faktor keselamatan gambut.

### Matriks Medan (pipa utama 2.000 m; regu 8)
Rumus: jam-orang/m = regu/produktivitas; jam gelar = panjang/produktivitas; setup+uji = 2+2 = 4 jam; total+cadangan = (jam gelar+4)*(1+0,2); hari regu = ROUNDUP(total/8); HOK = regu*total/8; biaya = HOK*250000; gulungan = ROUNDUP(2000/100)=20.

| Medan | m/jam | jam-orang/m | jam gelar | total+cadangan (jam) | hari regu | HOK | biaya regu (Rp) | Rp/m | gulungan |
|---|---|---|---|---|---|---|---|---|---|
| Datar/akses mudah | 150 | 0,0533 | 13,33 | 20,8 | 3 | 20,8 | 5.200.000 | 2.600 | 20 |
| Gambut sedang | 75 | 0,1067 | 26,67 | 36,8 | 5 | 36,8 | 9.200.000 | 4.600 | 20 |
| Gambut berat | 30 | 0,2667 | 66,67 | 84,8 | 11 | 84,8 | 21.200.000 | 10.600 | 20 |
| Medan ekstrem | 15 | 0,5333 | 133,33 | 164,8 | 21 | 164,8 | 41.200.000 | 20.600 | 20 |

### WBS & Upah (tarif/jam-orang Rp31.250 = 250000/8; cadangan 20%)
| Pekerjaan | Volume | Regu | Produktivitas/jam | Jam regu | Jam-orang | Upah dasar (Rp) | Total+cad (Rp) |
|---|---|---|---|---|---|---|---|
| Survei trase/topografi | 2000 m | 3 | 250 | 8 | 24 | 750.000 | 900.000 |
| Persiapan lintasan terbatas | 2000 m | 4 | 90 | 22,22 | 88,89 | 2.777.778 | 3.333.333 |
| Distribusi gulungan ke jalur | 2000 m | 5 | 150 | 13,33 | 66,67 | 2.083.333 | 2.500.000 |
| Gelar pipa utama DN160 | 2000 m | 8 | 75 | 26,67 | 213,33 | 6.666.667 | 8.000.000 |
| Penyambungan 100 m/roll | 19 joint | 3 | 4 | 4,75 | 14,25 | 445.313 | 534.375 |
| Proteksi/penyangga titik rawan | 40 titik | 4 | 8 | 5 | 20 | 625.000 | 750.000 |
| Gelar selang cabang | 400 m | 6 | 70 | 5,71 | 34,29 | 1.071.429 | 1.285.714 |
| Pemasangan manifold | 4 unit | 3 | 1 | 4 | 12 | 375.000 | 450.000 |
| Uji sambungan per seksi | 20 seksi | 4 | 2 | 10 | 40 | 1.250.000 | 1.500.000 |
| Commissioning pompa | 1 sistem | 4 | 0,25 | 4 | 16 | 500.000 | 600.000 |
| Inspeksi HSE lintasan | 2000 m | 2 | 250 | 8 | 16 | 500.000 | 600.000 |
| Demobilisasi pipa utama | 2000 m | 8 | 100 | 20 | 160 | 5.000.000 | 6.000.000 |
| TOTAL | | | | 131,69 | 705,42 | 22.044.519 | 26.453.423 |
Catatan: durasi kalender bukan penjumlahan (sebagian paralel).

### BOQ Sambungan (semua harga satuan = 0 = "BELUM ADA QUOTATION, bukan gratis"; total material terisi Rp0)
Layflat mainline 2000 m (DN nominal ~160 mm; ID aktual dan rating wajib datasheet); coupling antar-gulung 19 buah (=ROUNDUP(2000/100)-1); coupling awal/akhir 2; gasket/seal 21 set; baut/mur/washer 0 set ("JANGAN estimasi baut sebelum detail flensa"); strainer inlet 1; check valve 1; isolation valve 4; pressure gauge/transmitter 4; manifold 6 in -> 4 in 4 unit; proteksi lintasan 40 titik. Catatan: Storz tidak setara flange; baut tidak boleh disamaratakan per meter.

### Panduan (12 butir)
Produktivitas per REGU bukan per orang; HOK = jam-orang/8; kecepatan memasang pipa != kecepatan menyalurkan air; WBS upah belum termasuk pajak, mobilisasi alat, BBM, makan, akomodasi, transport, alat berat, keselamatan, vendor, margin; jenis sambungan (Storz, flange HDPE, mechanical coupling) beda BOM; butuh minimal 3-5 pengukuran time-motion per kondisi medan; rute gambut tidak boleh dibuka/ditimbun tanpa kajian lingkungan, izin, persetujuan keselamatan; status CONCEPT - NOT FOR CONSTRUCTION.

## 2. Paket_Data_Publik_API_RAB_Simulasi_Karhutla_2026.xlsx (18 sheet)
Sheet: Parameter, Matriks Medan, WBS & Upah, BOQ Sambungan, Panduan (= berkas Matriks di atas); lalu DATA - Sumber & PPID, INSTANSI - Permintaan, HIDRAULIK - Formula, BOM - Detail RFQ, SENSOR - Telemetri, REGISTER - Gambar, MODEL - Simulasi, FORM - Permintaan Data, NILAI PUBLIK - Metadata, ENERGI - Keperluan, BACA DULU.

### DATA - Sumber & PPID (D01-D36; kolom: bidang, data, satuan, prioritas, akses, lembaga, URL, format, kegunaan, ground-truth, status)
- D01 DEMNAS elevasi orthometrik (m EGM2008), P0, ArcGIS ImageServer BIG https://geoservices.big.go.id/raster/rest/services/DEMNAS/DEM_Indonesia/ImageServer; TERVERIFIKASI layanan publik; 0,27 arc-second, bukan pengganti micro-topography.
- D02 RBI jalan/jembatan/sungai (vektor) P0, BIG/PUPR/pemda, tanahair.indonesia.go.id; PERLU UNDUH / CEK LISENSI.
- D03 LiDAR mikrorelief/kanal/peat dome (m, DTM) P0; PERLU PERMINTAAN; "LiDAR tidak selalu tersedia".
- D04 KHG (poligon) P0, ArcGIS MapServer geoportal.menlhk.go.id/.../Kesatuan_Hidrologis_Gambut/MapServer; "KHG tidak otomatis memuat kedalaman gambut".
- D05 Ketebalan gambut (m) P0, PPID + bor gambut; D06 Muka air tanah harian GWT (m) P0, data logger/sumur pantau; D07 Konduktivitas hidraulik gambut anisotropik (m/s) P0, WAJIB UJI LOKASI (slug test/infiltrometer), "nilai literatur tidak cukup untuk sizing"; D08 porositas efektif/kadar air/bulk density P0 WAJIB UJI LOKASI.
- D09 Penampang & debit sungai/kanal musim kering (m3/s) P0, BWS Kalimantan II (PUPR) https://sda.pu.go.id/balai/bwskalimantan2/informasi-kantor; D10 batas izin intake/abstraksi (m3/hari) P0; D11 kualitas sumber air (pH, TSS, Fe, organik) P0.
- D12 CAT/akuifer (Badan Geologi ESDM) P1, "Jangan asumsikan akuifer 50-100 m".
- D13 Prakiraan cuaca 3 hari BMKG, API JSON kode desa ADM4 https://data.bmkg.go.id/prakiraan-cuaca/ (t, hu, ws, wd), P0, TERVERIFIKASI API; D14 curah hujan/RH/angin historis BMKG Data Online/PTSP, CSV min 20 tahun, P0; D15 ERA5-Land via Open-Meteo, P1, "reanalisis BUKAN pengukuran setempat"; D16 CHIRPS 0,05 deg via GEE P1; D17 indeks FFMC DMC DC ISI BUI FWI P1 "kesiapsiagaan, bukan konfirmasi bara".
- D18 VIIRS NRT (bright_ti4, FRP, confidence) NASA FIRMS API area dengan MAP_KEY gratis https://firms.modaps.eosdis.nasa.gov/api/area/ P0 TERVERIFIKASI API, "jangan perlakukan hotspot sebagai luas kebakaran"; D19 MODIS histori P1.
- D20 Sentinel-2 L2A (10/20/60 m) P0 Copernicus Data Space; D21 Sentinel-1 SAR P1; D22 Landsat P1 (USGS EarthExplorer/GEE); D23 JRC GSW 1984-2021 (30 m) P1 "bukan data debit atau kedalaman".
- D24 jalan/jembatan/akses + kapasitas P0 (OSM "bisa tidak lengkap"); D25 jaringan kanal/sekat/embung P0; D26 permukiman/sarana kesehatan/jiwa (InaRISK/BPS) P0; D27 batas bidang tanah/hak ulayat/konsesi (ATR/BPN) P0; D28 kawasan lindung/biodiversitas P0; D29 risiko karhutla IRBI/KRB (InaRISK GIS Services https://inarisk.bnpb.go.id/webgis/) P0 "InaRISK disclaimers: bukan rekayasa sipil"; D30 harga satuan lokal material/BBM/ongkos (e-katalog LKPP, 3 penawaran) P0 "Tidak invent angka harga"; D31 pompa Q-H/efisiensi/NPSHr/BSFC (verifikasi baseline 75HP/2000LPM/10bar, FAT) P0; D32 material pipa ID aktual/PN/burst P0; D33 CO/PM2.5 P0; D34 suhu gambut multi-depth P0 WAJIB SURVEI; D35 waktu pasang & personel time-motion P0 "Matriks Excel lama = asumsi awal"; D36 kajian perizinan kehutanan/lingkungan P0.

### INSTANSI - Permintaan (P01-P14)
P01 BIG (DEMNAS, RBI, ortofoto; geoportal TanahAir/PPID BIG; big.go.id/content/produk/demnas); P02 walidata KHG/DLH (KHG, ketebalan gambut, TMA); P03 BWS Kalimantan II (debit, AWLR, izin intake); P04 BMKG PTSP https://ptsp.bmkg.go.id/ (cuaca historis 20 tahun, FWI); P05 BNPB Direktorat Pemetaan dan Evaluasi Risiko Bencana (InaRISK, https://inarisk.bnpb.go.id/perb/faq.html); P06 BPBD Kalimantan Tengah dan kabupaten pilot (kejadian karhutla: titik, waktu, personel, pompa, biaya, luas padam); P07 Badan Geologi ESDM; P08 ATR/BPN, pemda, pemegang izin, adat (batas hak, izin lintas); P09 BKSDA/Kemenhut/DLH; P10 LKPP/OEM/distributor (e-katalog + RFQ tertulis 3 vendor); P11 NASA FIRMS/USGS/ESA; P12 Manggala Agni/BPBD (log time-motion metode padam, SOP, fuel, volume air); P13 Open-Meteo/ECMWF/UCSB (P1); P14 BPS/Bappeda (P1). Semua P0 kecuali P13, P14.

### HIDRAULIK - Formula (input -> hasil, nilai tersimpan di sel)
Input: panjang 2000 m; diameter dalam aktual 0,16 m; debit 2000 L/min; Hazen-Williams C=130; elevasi naik 10 m; residual target 2 bar; K total fitting 5; efisiensi pompa 0,65; rho air 1000; g 9,81; BSFC 0,25 kg/kWh; rho solar 0,84 kg/L; area kebakaran 1 ha; air per ha 600 m3/ha (hipotesis, WAJIB VALIDASI); jam efektif 8; cadangan air intake 0,15.
Rumus dan hasil:
- Q = L/min/60000 = 0,033333 m3/s
- A = pi D^2/4 = 0,020106 m2
- v = Q/A = 1,65786 m/s
- Head friksi = 10,67*L*Q^1,852/(C^1,852*D^4,871) = 35,9149 m
- Head minor = K v^2/(2g) = 0,70044 m
- Head residu nozzle = bar*1e5/(rho g) = 20,3874 m
- Total head = dz + friksi + minor + residu = 67,0027 m
- Setara tekanan discharge = 6,57296 bar
- Daya hidrolik = rho g Q H/1000 = 21,9099 kW
- Daya poros = P hidrolik/eta = 33,7075 kW = 45,2025 HP (bandingkan 75 HP awal)
- Solar = Pshaft*BSFC/rho solar = 10,032 L/jam
- Volume pemadaman = 1 ha*600 = 600 m3; durasi pompa saja = 600/(Q*3600) = 5 jam; cadangan air total = 600*1,15 = 690 m3
- Tekanan tambahan naik 10 m = 0,981 bar
- Volume dalam pipa = 40,2124 m3; waktu tiba air (konveksi) = 20,106 menit
KRITIS: daya poros perkiraan pada head target, bukan performa aktual tanpa kurva Q-H. GO/NO-GO: jika 75 HP < kebutuhan poros, turunkan debit/perbesar diameter/ubah pompa atau distribusi.

### BOM - Detail RFQ (harga satuan kosong, subtotal Rp0, status "BELUM ADA RFQ"; total hanya yang sudah di-quote = 0)
P-101 pompa utama fire-duty 1; E-101 prime mover diesel 1; H-101 selang DN160 2000 m; C-101 end-coupling DN160 20 set; G-101 gasket 20 pcs; V-101 isolation valve DN160 2; NRV-101 non-return valve 1 (butuh water hammer analysis); ST-101 foot valve+coarse strainer 1; SF-101 filter fine/backwash 1; FT-101 flow meter 1; PT-101/102/201 pressure transmitter suction/discharge/distal 1 tiap; LT-101 level intake 1; T-101 probe suhu gambut multi-depth 8 set; GWT-101 piezometer 4 set; M-101 manifold DN160 ke DN110 1; H-201 selang cabang DN110 400 m; H-301 selang serang+lance 4 set; I-101 peat injector lance 8; U-101 panel PLC/RTU+UPS 1; U-102 gateway+antena 1; U-103 weather station 1; U-104 drone RGB+thermal 1; S-101 rumah pompa/kanopi tahan banjir 1 lot; S-102 pos pemadam & HSE 1 lot; B-101/N-101/W-101 baut/mur/washer qty 0; A-101 penyangga/anchor 0; Q-101 APD/P3K 10 set; P-102 suku cadang 1 lot.

### SENSOR - Telemetri (perangkat, sampling usulan)
PT suction/discharge/distal 0,5-5 s (4-20mA/Modbus); FT 1-5 s; GW well logger 10-30 menit (LoRa/SD); thermistor gambut 0,1/0,3/0,5/1 m, 1-10 menit; moisture/TDR 10-30 menit; intake level 1-5 menit; weather 5-10 menit; thermal UAV radiometrik per-flight; PM2.5/CO/H2S 1-30 s; fuel level+RPM/engine temp 5-30 s (CAN/Modbus). Logika alert tiap perangkat tertulis (mis. P suction < minimum, Q < min saat pompa jalan, dry-run interlock, temperature excursion terhadap baseline lokal).

### REGISTER - Gambar (G-01..G-16)
Status Konsep: G-01 denah kanopi pompa dan pos pemadam, G-02 P&ID sensor dan pompa, G-04 potongan peat injection lance, G-05 alur smart detection, G-06 API data pipeline; Ilustrasi: G-03 longitudinal profile trase. Belum: G-07 situasi blok 2 km trase GIS, G-08 GA booster, G-09 detail elbow/manifold/flange, G-10 isometri & support, G-11 rumah pompa civil, G-12 listrik/UPS/earthing, G-13 piezometer & thermal well, G-14 bill of bolts, G-15 fire station storage/PPE/decon, G-16 peta rute serangan & fire zones.

### MODEL - Simulasi (M01-M12)
M01 network hydraulic/EPANET (Hazen-Williams/Darcy-Weisbach); M02 transient water hammer (Joukowsky dP=rho a dV; MoC); M03 peat groundwater (Darcy q=-K grad h); M04 thermal peat conduction/advection; M05 water balance dry season (dS=(P-ET+Qin-Qout-Qtake)dt); M06 trase GIS optimization (min sum labor+cost+terrain penalty+land risk); M07 FWI (FFMC,DMC,DC,ISI,BUI); M08 UAV thermal anomaly (dT = T_pixel - median lokal, robust z median/MAD); M09 reliability/FMEA (R(t)=exp(-lambda t), MTBF/MTTR); M10 CAPEX OPEX scenarios (NPV=sum Ct/(1+r)^t; cost/verified ha); M11 mobilization discrete-event (P50/P90 dispatch-to-first-water); M12 A/B pilot (ATE=mean(Yt)-mean(Yc)). Prioritas P0 kecuali M07, M09 (P1).

### FORM - Permintaan Data
Template surat: instansi tujuan, perihal (permohonan data dasar penyusunan desain dan studi kelayakan sistem pemadaman karhutla gambut), AOI WGS84, waktu kajian (sejarah 10-20 tahun), ID D01-D36, format CSV/GeoTIFF/GPKG/GeoJSON/shapefile + metadata, CRS EPSG 4326 + proyeksi meter + datum vertikal eksplisit, lisensi, kontak. Status "Belum dikirim".

### NILAI PUBLIK - Metadata (bukan nilai lokasi pilot)
DEMNAS 0,27 arc-second, datum EGM2008, pixel size X 0,0000749850029994 derajat; FIRMS area API maks 5 hari/request, batas kunci 5000 transaksi/10 menit; BMKG prakiraan tiap 3 jam, horizon 3 hari, update 2 kali/hari, limit 60 request/menit/IP; ERA5-Land 0,1 deg (~11 km); CHIRPS 0,05 deg; JRC GSW 30 m, 1984-2021.

### ENERGI - Keperluan
Debit target 120 m3/h (=Q*3600); durasi pompa efektif 20 jam; BBM 10,032 L/jam; 1 pompa; 8 orang/pompa; 3 hari; volume air duty = 120*20*1 = 2400 m3; solar duty = 10,032*20*1 = 200,64 L; upah Rp250.000/orang/hari; total tenaga operasi = 8*3*250000 = Rp6.000.000.

### BACA DULU
Status WORKING DRAFT / NOT FOR CONSTRUCTION; belum ada elevasi karena belum ada polygon/titik pilot; harga BOM sengaja kosong, total Rp0 tidak berarti gratis; baut tidak dihitung tanpa gambar OEM; Hazen-Williams untuk air; setiap data portal disimpan dengan URL, tanggal, CRS, metadata, lisensi, QA/QC; thermal drone hanya permukaan, tidak menggantikan detektor multi-depth.


## 3. Grand_Design_Karhutla_Paket_Lengkap_2026.zip (diekstrak ke scratchpad/pipa-zip/lengkap)
Isi: 3D/GrandDesign_Karhutla_3D_ThreeJS.html (17 KB); CAPEX_OPEX_Matriks_Operasional_Karhutla_2026.xlsx (36 sheet); Grand_Design_Karhutla_Operasional_2026_Terintegrasi.docx dan .pdf (~43 hal, README); README_PAKET.txt; assets/G01_skenario_jaringan, G02_pid_pompa, G03_topografi, G04_rewetting, G05_pcv, G06_logistik, G07_drone, G08_pos, G09_peralatan (PNG); hasil_simulasi/diameter_vs_hidraulika.csv dan hasil_simulasi_ilustratif.json; kode/akses_api_data.py, inventori_bbm.py, simulasi_decision.py; __pycache__ (pyc, tidak dibaca).
README: "PRA-FEED, concept study, NOT FOR CONSTRUCTION"; 24 Oktober 2026; PPN adjustment default 0 agar tidak menggandakan pajak; TCO 5 th tanpa diskonto; lokasi belum berupa titik GPS/poligon; harga publik: Tohatsu VE1500W Rp190.781.250 (listing incl PPN), HDPE OD200 PN16 Rp1.162.050/m (daftar pemasok Apr 2026, PPN/logistik belum diperiksa), DJI Matrice 4T Rp111.217.000 (tanpa IP rating standar); semua item lain asumsi.

### 3a. CAPEX_OPEX workbook = 16 sheet Paket_Data (identik, diff 0 baris) + 20 sheet baru
**Tiga skenario CAPEX (40 baris item; kolom: uraian, unit, jumlah, harga satuan, total, dasar, sumber)**; kontingensi 20%; PPN penyesuaian 0.
Harga satuan (sama di S1/S2/S3), "Dasar" = ASUMSI kecuali ditandai sumber:
| No | Item | Harga satuan (Rp) | Qty S1 / S2 / S3 |
|---|---|---|---|
| 1 | Pompa pemadam portable bensin (Tohatsu VE1500W; harga penawaran publik incl PPN, mbizmarket.co.id) | 190.781.250 | 2 / 1 / 2 |
| 2 | Pompa utama diesel skid + panel | 450.000.000 | 0 / 1 / 2 |
| 3 | Pompa banjir portabel high flow low head | 250.000.000 | 0 / 1 / 2 |
| 4 | HDPE OD200 PN16 SDR11 per m (daftar harga pemasok 7 Apr 2026, assets.zyrosite.com ... pipa-hdpe-7-april-2026) | 1.162.050 | 0 / 1500 / 5000 |
| 5 | HDPE OD110 PN16 SDR11 per m (sumber sama) | 351.350 | 0 / 500 / 2000 |
| 6 | Layflat DN100 + sertifikasi per m | 275.000 | 800 / 400 / 500 |
| 7 | Layflat DN65 + sertifikasi per m | 165.000 | 400 / 500 / 900 |
| 8 | Manifold DN200/4-outlet | 25.000.000 | 2 / 4 / 10 |
| 9 | Adaptor coupling Storz/HDPE | 2.400.000 | 20 / 25 / 45 |
| 10 | Lance injeksi gambut stainless + filter | 4.200.000 | 6 / 12 / 24 |
| 11 | Nozzle variabel & pistol grip | 6.500.000 | 6 / 12 / 24 |
| 12 | Suction hose + foot valve + strainer | 28.000.000 | 2 / 2 / 4 |
| 13 | Filter serviceable + bypass | 19.000.000 | 2 / 2 / 4 |
| 14 | Check/isolation/air-release valves | 13.500.000 | 2 / 8 / 20 |
| 15 | Flowmeter totalizer | 18.000.000 | 2 / 4 / 10 |
| 16 | Pressure & suction sensor | 8.500.000 | 4 / 8 / 20 |
| 17 | Peat temperature depth + WTD node | 12.000.000 | 8 / 20 / 50 |
| 18 | Gateway/LoRaWAN + edge logger | 25.000.000 | 1 / 2 / 4 |
| 19 | Drone thermal 640x512 (Matrice 4T; halorobotics.com; tidak smoke-proof) | 111.217.000 | 1 / 1 / 2 |
| 20 | Paket baterai+charger+transport drone | 42.000.000 | 1 / 1 / 2 |
| 21 | Panel PV + baterai monitoring | 30.000.000 | 1 / 3 / 7 |
| 22 | Rumah pompa elevated & ventilasi | 400.000.000 | 0 / 1 / 2 |
| 23 | Pos pemadam & gudang perlengkapan | 600.000.000 | 0 / 1 / 2 |
| 24 | Kontainer/gudang mobile terkunci | 100.000.000 | 1 / 1 / 1 |
| 25 | Tangki BBM double containment | 50.000.000 | 1 / 2 / 3 |
| 26 | Komunikasi satelit/radio | 38.000.000 | 1 / 2 / 3 |
| 27 | Sekat kanal pilot disetujui | 65.000.000 | 2 / 6 / 12 |
| 28 | Bangunan air terkendali/spillway | 125.000.000 | 0 / 2 / 6 |
| 29 | Sensor tinggi air banjir + staff gauge | 18.000.000 | 2 / 5 / 10 |
| 30 | Pilot irigasi pertanian tanpa bakar | 140.000.000 | 0 / 1 / 3 |
| 31 | Survei GIS GNSS LiDAR lokal & sampel | 180.000.000 | 1 / 1 / 2 |
| 32 | Kajian lingkungan dan izin | 160.000.000 | 1 / 1 / 2 |
| 33 | Pemasangan pipa & pengujian (paket) | 260.000.000 | 1 / 2 / 6 |
| 34 | Mobilisasi logistik ke lokasi | 210.000.000 | 1 / 2 / 5 |
| 35 | Perahu serbaguna keselamatan | 230.000.000 | 1 / 1 / 2 |
| 36 | Pickup 4x4 support | 440.000.000 | 1 / 1 / 2 |
| 37 | PPE 20 orang + P3K | 140.000.000 | 1 / 2 / 3 |
| 38 | Tools maintenance & spare parts awal | 120.000.000 | 1 / 2 / 4 |
| 39 | Pilot uji A/B dan instrumentasi | 250.000.000 | 1 / 2 / 3 |
| 40 | Commissioning + latihan perdana | 85.000.000 | 1 / 2 / 3 |
Subtotal / kontingensi 20% / total (Rp): S1 Portable 3.753.979.500 / 750.795.900 / 4.504.775.400; S2 Semi-permanen 9.451.648.250 / 1.890.329.650 / 11.341.977.900; S3 Backbone tetap 22.248.746.500 / 4.449.749.300 / 26.698.495.800.
Contoh total baris: S2 HDPE OD200 1500 m = 1.743.075.000; S3 HDPE OD200 5000 m = 5.810.250.000.

**RINGKASAN CAPEX**: Portable 4.504.775.400, pipa utama 800 m, 2 portable bensin, fleksibilitas sangat tinggi, prasyarat akses regu/suplai air, cocok hotspot tersebar/akses sementara; Semi-permanen 11.341.977.900, 1500 m, 1 diesel + 1 portable, fleksibilitas sedang, prasyarat izin trase/debit kemarau, cocok lokasi berulang akses terbatas; Backbone permanen 26.698.495.800, 5000 m, 2 diesel + 2 portable, fleksibilitas rendah, prasyarat hak lahan dan demand stabil, cocok koridor risiko persisten multi-tahun. Kunci keputusan tertulis: biaya total tidak cukup untuk memilih; uji efektivitas, ketersediaan air kemarau, keandalan, dampak gambut, risiko izin, mobilisasi; tidak boleh disebut harga final tender.

**OPEX & 5Y TCO** (jam pompa/tahun 240 semua skenario; bensin 22 L/jam OEM; diesel 12 L/jam asumsi; bensin Rp15.500/L; solar Rp14.500/L):
| Skenario | Bensin unit | Diesel unit | Maintenance/th | Crew+drone+logistik/th | BBM/th | OPEX/th | TCO 5 th (disc 0) |
|---|---|---|---|---|---|---|---|
| S1 Portable | 2 | 0 | 110.000.000 | 180.000.000 | 163.680.000 | 453.680.000 | 6.773.175.400 |
| S2 Semi | 1 | 1 | 220.000.000 | 320.000.000 | 123.600.000 | 663.600.000 | 14.659.977.900 |
| S3 Backbone | 2 | 2 | 450.000.000 | 700.000.000 | 247.200.000 | 1.397.200.000 | 33.684.495.800 |
Rumus: BBM = jam*(unit bensin*L/jam*Rp/L + unit diesel*L/jam*Rp/L); OPEX = maintenance + crew + BBM; TCO = CAPEX total + 5*OPEX. Catatan: volume air tidak dipastikan dari jam mesin; pompa paralel semua fuel dihitung.

**WATER FEASIBILITY** (12 parameter; kolom uji minimum, instansi, status, go/no-go): debit puncak kemarau (>= Q operasi + ekologi; BWS Kalimantan II; "NO-GO jika sumber gagal di puncak kemarau"); volume air andal (stok + recovery 24/48/72h; "NO-GO jika pengambilan menurunkan fungsi gambut"); durasi pasokan (min 1 shift + cadangan, asumsi); jarak hidraulik dari sumber; elevasi intake ke titik kritis ("1 m kenaikan ~0,0981 bar statis"); perbedaan elevasi banjir (pompa dan BBM di atas level aman); NPSHA > NPSHR + margin ("stop bila dry run"); kualitas air TSS/pH/EC; daya dukung tepi intake kPa ("NO-GO jika risiko longsor/sinking"); koneksi ke zona bara ("tidak melintasi gambut membara"); energi/hari kWh, L; efek pada muka air gambut ("NO-GO bila sebabkan pengeringan"). Status: sebagian besar "TAK ADA DATA LOKASI"; jarak/elevasi "TERSEDIA DEM PUBLIK"; energi "MODEL TERSEDIA".
**ACCESS FEASIBILITY** (11 parameter): jalan darat musim kemarau (ton/gandar; gagal jika tak ada jalur aman); akses musim hujan + banjir (wajib jalur kedua); kanal & draft perahu ("jangan buat kanal baru"); portage manual gulungan kg/orang (mekanisasi bila melebihi batas K3); jarak tempuh regu (uji wet drill); jembatan & lintasan pipa ("NO-GO bila overload"); kepemilikan & izin lahan ("NO-GO tanpa consent/perizinan"); keamanan aset & pencurian; komunikasi & SOS ("stop jika tidak ada contact"); medis & evakuasi (evac gate); topografi mikro gambut.
**SIMULASI DECISION** M01-M14: hidraulika steady (EPANET/Hazen-Williams); transient (Joukowsky dP=rho a dv); air kemarau (dS/dt=P+Qin-Qout-ET-I; NO-GO jika shortage); rewetting gambut (Darcy/Sy); banjir & backwater (1D/2D Saint-Venant); topografi rute (cost-distance); dispatch & logistik (DES, p50/p90 arrival); drone thermal (Pdet/fusion score); suhu gambut berlapis (rho cp dT/dt); A/B teknologi (matched/RCT); biaya TCO Monte Carlo (p10/p50/p90 LCC); reliabilitas (fault tree/MTBF); pertanian tanpa bakar (soil-water crop balance); latihan tahunan gabungan. 
**A B TESTING** (prediksi hipotesis, bukan hasil): lengan 0 persiapan pilot berpasangan; A pencegahan (rewetting/canal control vs monitoring biasa; outcome WTD, hotspot, cost/ha); B respons api kecil (portable+ground manual vs konvensional; response time, liters/ha verified); C sumber air jauh (semi+portable vs relay hose; TCO, mobility, pressure at node); D koridor risiko tetap (fixed backbone vs semi mobile; reliability, TCO, stolen parts); E drone (thermal+ground vs ground only); F core verification (multi-depth probes vs visual only; reignition 7d/30d/90d); analisis: matching, preregistered outcomes, effect size + 95% CI, "tidak boleh klaim pemenang sebelum uji".
**BBM & ENERGI**: diesel stationary = solar sesuai manual, BSFC*shaft kW/densitas, 2 wadah sekunder + spill kit, buffer stok 20% asumsi; portable Tohatsu VE1500W bensin RON >= 91, 22 L/jam pada rating, 2-stroke auto mixing; generator diesel; drone baterai Li-ion di kabinet charge tahan api.
**MAINTENANCE**: tiap shift (tekanan/debit, saringan, oli, bocor, BBM, coupling); mingguan (start test pompa 30 menit, kalibrasi nol); bulanan (wet drill terbatas, 2% sampel pipa, p95 alert latency); triwulan (rotasi genset/pompa, MTBF, baterai); semi-tahunan; tahunan (simulasi gabungan TNI/YonTP + BPBD + Manggala Agni + warga); pascabanjir; pasca-kebakaran (thermal depth 24/72h 7/30/90d).
**LOGISTIK & WMS**: receiving (PO-RFQ, DO, GRN), storage (bin QR, FIFO/FEFO), dispatch (request ID, prioritas 1-3), transport 4x4->boat->portage (ETA p50/p90), field, refuel (engine off/cool, spill kit), reverse, stock planning ROP = demand lead time + safety stock.
**SOP LIFECYCLE**: PRA-01..04, DUR-01..05, PAS-01..03 dengan stop-work gate (mis. "No-Go jika izin/air tidak aman", "No-Go jika keringkan peat dome", "No flight in smoke/plume", "Stop if CO/exposure risk", "No dry run/overpressure", "never enter unsupported peat", "do not declare extinguished prematurely").
**PERIMETER CORE VERIFY**: perimeter mapping (RGB/drone), ring buffer ("jangan asumsikan buffer 5m universal"), core grid probe suhu multi-depth, cold comparison, probe safety (gas monitor, stop-work), apply water (totalizer, L/m2 atau m3/ha), core recheck 24/72h, 7/30/90d.
**REWETTING DESAIN**, **BANJIR TEKNIS**, **PERTANIAN & YonTP**, **LATIHAN TAHUNAN** (S1 tabletop 1x/th, S2 wet drill 1x/th, S3 drone mock 2x/th, S4 banjir/evakuasi, S5 rewetting, S6 logistik fuel spill, S7 pertanian tanpa bakar, S8 AAR): tabel tahap/lead/gate; larangan di antaranya "not dewater for agriculture", "no lowering WTD as standard solution", "ONLY if drainage does not harm peat", "no floating platform without naval calc", "no open burning".
**BOM MATERIAL DETAIL**: HDPE OD200 PE100 SDR11 wall 18,2 mm ID 163,6 mm (burst 20-60 bar tidak diasumsikan); flange adaptor stub end + backing ring PN16; baut A4-70/ASTM M16/M20 TBD ("jangan tetapkan M16 generik"); gasket EPDM; coupling Storz/Machino (baut bisa nol); sensor tekanan 0-16 atau 0-25 bar +-0,5% FS; flowmeter +-1-2%; filter (jangan paksa 200 mesh tanpa clog test); pompa bensin Tohatsu VE1500W 22 L/h, tangki 24 L, "Output @10bar 1500LPM not 2000"; drone class Matrice 4T 640x512, IP none published.
**SUMBER TERVERIFIKASI** (URL): PP 57/2016 (peraturan.bpk.go.id/Details/5778), Tohatsu VE1500W OEM, daftar harga HDPE 2026, DJI Matrice 4 specs, harga halorobotics, FIRMS, DEMNAS, BMKG, BWS (sda.pu.go.id/profil/bws), Kemhan Yonif TP 929 (19 Okt 2026), Permenhub 37/2020 + UU ruang udara 21/2025.

### 3b. Dokumen Terintegrasi (docx ~97 KB teks): struktur
Bab 1-19 (mandat, basis data, hidrologi, desain, rumus, gambar, neraca, RAB, metode, risiko, SOP, training, simulasi/A-B, banjir/YonTP, 32 kajian, roadmap, tidak direkomendasikan, belum diketahui, pustaka), Lampiran A-L, lalu bagian A-U. Poin angka: Q 2.000 LPM = 33,33 L/s = 120 m3/jam; 5 jam = 600 m3; contoh neraca sungai 15 L/s selama 5 jam = 270 m3, defisit minimum 330 m3 (15 L/s "contoh, bukan debit lokasi"). Tabel diameter (OD/SDR11, C=130, +10 m, residu 2 bar, minor 1 m, 2000 LPM, 2 km): OD160 ID 130,8 hf ~95,8 m TDH ~127 m daya ~63,9 kW; OD200 ID 163,6 hf ~32,2 m TDH ~63,6 m ~32,0 kW; OD250 ID 204,6 hf ~10,8 m TDH ~42,2 m ~21,3 kW. Gate P0-A..F (air, bara gambut, pompa+mainline, akses/legal, uji pembanding, SDM & HSE) dengan keputusan bila belum terbukti (mis. "Jangan beli pompa permanen"; "Dilarang commissioning"). Sistem pipa: portable layflat permukaan vs semi-terproteksi vs HDPE tetap atas tanah vs buried lokal vs backbone tetap (risiko dan kontrol per baris). Bagian U: register data kosong "NO-GO bila kritis" (polygon AOI, lokasi intake, debit kemarau, peta fungsi ekosistem/kedalaman gambut, profil elevasi survei, hak lintasan, kurva pompa, head loss fitting, daya dukung pondasi, kualitas air, akses musim basah, bukti ketebalan bara, biaya logistik aktual, jadwal kerja).

### 3c. Kode Python (hanya dibaca)
**simulasi_decision.py** (stdlib; semua data FIKTIF): fungsi friksi_hw(q_lpm,L,d_mm,C=130)=10.67*L*(q/60000)^1.852/(C^1.852*(d/1000)^4.871); id_hdpe(OD,SDR=11)=OD*(1-2/SDR); pumping(q=2000,L=2000,OD=200,SDR=11,elev=10,resbar=2,eta=.65,minor=1) -> H=elev+hf+minor+resbar*1e5/(1000*9.81), daya poros = rho g Q H/(eta*1000), tekanan ekuivalen = H/10,197; source_water_balance(stock0,Q95 L/s,fire Q L/s,evap,eco reserve,days) tiap hari stok += max(0,Q95-eco)*86,4 - fire*86,4 - evap; rop(demand/hari,lead,std,1,65)=demand*lead+1,65*std*sqrt(lead); monte_carlo_dispatch(n=2000,seed=123): dispatch triangular(8,35,13) + road max(25,gauss(58,18)) + boat max(0,gauss(24,12)) + site max(25,gauss(65,17)) + outage expovariate(1/15) dengan peluang 0,20; priority(row) = 100*(0,29 thermal_anomaly + 0,16 thermal_persistence + 0,15 satellite_confidence + 0,16 human_exposure + 0,12 field_accessibility + 0,12 water_reliability)*sensor_quality, None bila flight_risk > 0,6; ab_analysis (cost per verified ha = cost/max(verified,1), selalu requires_statistical_review).
Keluaran contoh (hasil_simulasi_ilustratif.json): pipe OD160/200/250: ID 130,9/163,6/204,5; friction 95,5/32,2/10,9 m; TDH 126,8/63,6/42,2 m; shaft 63,8/32,0/21,3 kW; tekanan 12,44/6,24/4,14 bar. Water (stok awal 600 m3, Q95 15 L/s, fire 33,333 L/s, evap 2, eco 3, 3 hari): sisa -1245,17 / -3090,34 / -4935,51 m3, shortage true. Dispatch sintetis: p50 168,9 menit, p90 207,5, p99 240,5, max 333,9 (label: tidak dapat dipakai sebagai SLA). Drone priority: FIKTIF-A 72,7 (aman terbang), FIKTIF-B 48,4 (aman), FIKTIF-C null (tidak aman, flight_risk 0,85). A/B placeholder: Portable n=8, verified_cold_30d 4, Rp45.000.000/ha; Semi n=8, 6, Rp63.333.333/ha. ROP inventori = 20,165.
**akses_api_data.py**: mode bmkg (https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=...), firms (https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/{bbox}/1; env FIRMS_MAP_KEY), dem (DEMNAS ImageServer getSamples, returnFirstValueOnly, wkid 4326). Cetak URL dengan key disamarkan.
**inventori_bbm.py**: log CSV append-only (time_utc, incident_id, asset_serial, fuel DIESEL/GASOLINE, action RECEIVE/ISSUE/RETURN/ADJUST, liters >0, operator, ticket); input manual manusia, "DO NOT automate fuel dispense".

### 3d. Model Three.js (GrandDesign_Karhutla_3D_ThreeJS.html) dan "dashboard keputusan"
Three.js 0.160.1 dari cdn.jsdelivr.net (butuh internet); orbit kamera buatan sendiri (drag putar, scroll zoom, klik aset untuk info); medan sintetis elevation(x,z)=1,2+1,6 sin(0,065x)+1,1 cos(0,083z)+0,07x. Kontrol: skenario (portable/semi terpilih default/fixed), debit slider 500-3000 L/menit step 100 (default 2000), beda elevasi -10..35 m (default 10), diameter luar HDPE (OD160/200/250), checkbox pipa dikubur; 7 layer (pipe, sensor, building, wet, farm, drone, flood). Panjang jaringan: portable 800, semi 1500, fixed 5000 m; tebal dinding 160:14,6, 200:18,2, 250:22,7 mm. Kalkulasi: head friksi H-W C=130, head total = max(0,dz)+hf+1+20,4; daya poros eta 0,65; ditampilkan head statis, friksi, TDH minimal contoh, daya poros, tekanan debit keluar, panjang jaringan. Aset klik: kanal, sekat kanal+spillway, piezometer, rumah pompa elevated, pos pemadam & gudang, tangki BBM bund, akses logistik, drone thermal, hotspot tersimulasi, blok pertanian tanpa bakar, pipa utama/cabang, sensor, pompa utama. Tidak ada aturan NO-GO terprogram di HTML; catatan di UI: model ilustratif, bukan DEM asli, tidak menggantikan EPANET/kurva OEM. Kriteria GO/NO-GO yang tertulis ada di sheet WATER/ACCESS FEASIBILITY, gate P0-A..F, Lampiran A (checklist 8 butir: Air, Teknik, Wilayah, Lingkungan, Operasi, Evaluasi, Ekonomi, Sosial), dan Bagian U. Dashboard output yang dideskripsikan di docx (Lampiran I-1, bukan kode): P suction/discharge/distal, Q per manifold, L/hari solar, m3/hari abstraksi, suhu per kedalaman, GWT time series, heat map, posisi regu/drone, geofence aset, risiko cuaca, histori alarm; contoh JSON telemetri {site_id, utc_time, PT102_bar, FT101_m3h, GWT01_m, T03_50cm_C, sensor_quality, source}.

## 4. Grand_Design_Karhutla_Konsolidasi_Paket_Data_API_Gambar_2026.docx (1017 KB, 10 gambar PNG, ~1214 paragraf)
Judul "Grand Design Sistem Pipa Modular dan Injeksi Gambut"; v0.2, 24 Okt 2026; CONCEPT DESIGN / NOT FOR CONSTRUCTION; wilayah pilot Kalimantan Tengah; kode bukti [S][P][A][M][U]; terinspirasi sistematika "Grand Design Ketahanan Air Pulau Jawa 2026-2030" (dokumen referensi pengguna, bukan penyalinan). Isi: keputusan KD-1 (setujui studi kelayakan/survei tapak, bukan pembelian massal), KD-2 (bench test pompa-pipa-lance), KD-3 (pilih konfigurasi pilot via A/B); katalog lapisan data (DEMNAS, LiDAR, ketebalan gambut, TMA, BMKG, FWI, FIRMS VIIRS ~375 m, Sentinel, dst); rekonsiliasi klaim dokumen awal [D1]: 75 HP, 2.000 LPM @10 bar, DN160 2.000 m, booster 2x25 HP, 600 m3/ha, Rp1,185 miliar per jaringan, sumur 50-100 m. Rumus bab 5 (C=140 di docx): hf ~31,3 m untuk D 0,160 m; ID 150 mm menaikkan hf 31,3 -> 42,8 m; v ~1,66 m/s; P_h pada H=100 m ~32,7 kW; volume pipa ~40,2 m3. (Lampiran G docx memakai C=130: hf ~35,91 m, TDH ~67,00 m, 6,57 bar, daya hidrolik ~21,91 kW, poros ~33,71 kW = 45,2 HP, solar ~10,0 L/jam, pengisian ~20,1 menit, 600 m3 = 5 jam.)
**RAB baseline klaim [D1]** (Rp1.185.000.000, belum terverifikasi): pipa utama DN160 2000 m x 220.000 = 440.000.000; pipa cabang DN110 1000 m x 140.000 = 140.000.000; selang distribusi 65 mm 600 m x 85.000 = 51.000.000; selang serang 38 mm 400 m x 60.000 = 24.000.000; pompa diesel utama 1 x 180.000.000; booster 25 HP 2 x 95.000.000 = 190.000.000; lance injeksi 8 x 7.500.000 = 60.000.000; manifold/valve set 4 x 15.000.000 = 60.000.000; filter set 2 x 12.500.000 = 25.000.000; gauge/instrument set 1 x 15.000.000.
Tabel personel/waktu (sama dengan Matriks): 150/75/30/15 m/jam; 13,3/26,7/66,7/133,3 jam gelar; 20,8/36,8/84,8/164,8 jam total; biaya regu Rp5,2 jt; 9,2 jt; 21,2 jt; 41,2 jt.
Risk register R01-R12 (debit sungai kering, tekanan melebihi rating selang, terperosok/ambles, reignition, sebaran air tidak efektif, pencemaran air asam, kebakaran menyebar karena angin, air tanah turun, biaya undervalued, kegagalan pompa/BBM, data satelit salah baca, benturan hak/izin/adat; tingkat awal Kritis/Tinggi/Sedang-tinggi dengan mitigasi dan pemilik); SOP S-01..S-11; training (komandan insiden 12h+8h drill, operator pompa 8h+16h, teknisi pipa 8h+16h, tim injeksi 8h+16h, GIS/drone 12h+20h, hidrologi 12h+12h, HSE 12h+16h, YonTP 8h+12h, relawan 6h+6h; jam ilustrasi); simulasi S1-S10; A/B perlakuan A portabel permukaan, B injeksi pipa modular, C rewetting+pemadaman, D hybrid drone+injeksi, outcome primer verified heat-free + reignition 30/90 hari; agenda 32 kajian (P0/P1/P2); gate G0-G5 (G0 AOI/izin data; G1 water balance/topografi/hak jalur/Q-H; G2 bench test; G3 pilot A/B monitoring 30-90 hari; G4 evaluasi independen; G5 IFC/pendanaan/tender skala); agenda 100 hari (0-14, 15-35, 36-55, 56-75, 76-100 -> GO/HOLD/NO-GO); daftar tidak direkomendasikan (9 butir); lampiran A checklist GO/NO-GO 8 butir, B form survei satu segmen, C form uji pemadaman; suplemen: lampiran E-I (katalog data, tabel instansi + template surat, API F-1..F-3 dengan contoh DEMNAS identify, FIRMS area csv day_range 1-5, BMKG, Open-Meteo archive, G-1 persamaan dan G-2 contoh numerik, H gambar konsep + H-1 pipa tanam vs atas tanah (rekomendasi konsep: hibrida trunk permanen terlindung + cabang portabel) + H-2 fastener, I sensor). Catatan docx: suplemen menyebut "36 elemen data, 14 pemilik/kanal data", "Daftar lengkap 32 item pada sheet BOM" (sheet BOM berisi 32 baris P-101..P-102 pada Paket_Data).
Sumber R1-R6: BIG DEMNAS, NASA FIRMS, Copernicus Data Space, NRCan FWI, EPA EPANET 2.2, Permen LHK P.15/2017 (pengukuran muka air tanah gambut).

## 5. Paket_Gambar_Teknik_API_Kode_Karhutla.zip (karhutla_paket_teknis/)
File: G01_denah_pos_pompa, G02_pid_instrumen, G03_profil_topografi, G04_injection_lance, G05_smart_monitoring, G06_data_pipeline (masing-masing .png + .svg); README_PAKET.txt; build_figures.py (98 baris, matplotlib); ambil_data_dan_simulasi.py (96); thermal_drone_analisis.py (31).
Judul gambar (dari build_figures.py): G-01 Tata letak konsep fasilitas (rumah simpan/kanopi pompa: pompa utama + tray tumpahan, meja servis & suku cadang; pos pemadam/komando: ruang komando GIS/radio, istirahat regu, dekontaminasi & sanitasi, pengisian baterai terisolasi; catatan ventilasi 2 arah + knalpot ke luar, ruang istirahat tidak berbagi udara dengan ruang pompa); G-02 P&ID skematik (tekanan, debit, alarm, isolasi); G-03 profil trase dan head statis (sumber P-101 z=2 m, zona target z=12 m, dz=+10 m ~0,98 bar, trase +1 m dari terrain, panjang 0-2200 m); G-04 peat injection lance (selang+ball valve+relief, sensor T/kadar air/GWT, "jangan menetapkan diameter lubang tanpa uji"); G-05 sistem cerdas deteksi multi-sensor (aturan: drone melihat radiasi permukaan, tidak sendirian untuk klaim bara bawah tanah padam); G-06 pipeline data GIS (layanan publik -> model desain; tiap input simpan URL, lisensi, cakupan, tanggal, koordinat, resolusi, kualitas, status validasi).
README: AOI contoh lat -2.75 lon 114.15, bbox 114.0 -3.0 114.3 -2.5, hanya demo sintaks, bukan lokasi pilot; kolom CSV thermal x_m,y_m,temp_c,quality_flag.
**ambil_data_dan_simulasi.py** (butuh requests): endpoint DEMNAS /identify, FIRMS /api/area/csv/{key}/VIIRS_NOAA20_NRT/{w,s,e,n}/{day_range=2}, BMKG api.bmkg.go.id/publik/prakiraan-cuaca?adm4=, Open-Meteo archive-api (daily precipitation_sum, temperature_2m_max, wind_speed_10m_max, wind_gusts_10m_max, et0_fao_evapotranspiration; models era5_land; default 2024-07-01..2024-10-31); menyimpan raw + manifest_provenance.json; calculations(Q=2000 LPM,L=2000,D=0,16,dz=10,P_end=2 bar,C=130,K=5,eta=0,65) = rumus yang sama dengan sheet HIDRAULIK (BSFC 0,25; solar 0,84).
**thermal_drone_analisis.py**: screen(rows, z_threshold=4,0, delta_min_c=5,0): median dan MAD suhu piksel valid, denominator = max(1,4826*MAD, 1,0), delta = T-median, robust_z = delta/denominator, flag bila robust_z >= 4 dan delta >= 5; minimal 6 piksel valid; ambang ilustratif, bukan ambang keselamatan.

## Catatan
- Tidak ada angka yang merupakan hasil ukur lokasi; semua dokumen menyatakan AOI/polygon belum ditetapkan.
- Berkas pdf/docx Terintegrasi dan docx Konsolidasi_Kajian_Teknis_2026 tidak dibaca penuh di luar yang tercatat (Konsolidasi_Kajian_Teknis bukan bagian tugas).
- Salinan "(1)" diverifikasi identik lewat md5.
