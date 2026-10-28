# Riset: deteksi, kedalaman, dan prediksi api gambut bawah permukaan

Disusun 28 Okt 2026 dari tiga penelusuran literatur dan kode terbuka. Tanda status:

- **[T]**: abstrak (atau teks lengkap) sudah dibaca. Angkanya dari sana.
- **[B]**: baru judul dan DOI. Angka yang menyertainya dari sumber kedua; jangan dikutip sebelum dicek.

DOI kunci dicek ulang ke Crossref: Sofan 2019, Atwood 2016, Tansey 2008, Stockwell 2016, Johnston 2018, Fisher 2020, Burke 2019, Rahmi 2020.

## Keputusan yang lahir dari riset ini (pemilik, 28 Okt 2026)

1. **Titik keyakinan rendah ikut dihitung di angka titik panas** (`titik_unik.KEYAKINAN_MIN = 0`).
   - Dasar: Tansey 2008, Atwood 2016, Sofan 2019 (di bawah).
   - Luas terbakar, faktor insiden, rasio NOAA-20/S-NPP, pembanding S-NPP, dan cluster tetap memakai keyakinan sedang dan tinggi. Koefisien semuanya diukur dari titik sedang dan tinggi, dan belum dikalibrasi ulang.
2. **Penanda bara gambut** (`gambut_bara.py`): sel 750 m dihitung persisten bila terdeteksi di 2 tanggal atau lebih, dan setidaknya satu deteksinya malam (18.00–06.00 WIB). Titik VIIRS keyakinan rendah di piksel yang sama ikut menambah tanggal dan malam.
   - Dasar: Sofan 2019, Elvidge 2013/2014.
   - Ambang persistensi belum pernah divalidasi di literatur, jadi aturan ini tetap ASUMSI sampai diuji balik dengan arsip kita.
3. **Faktor emisi bara dicatat, belum diubah.**
   - Repo memakai CO2 1.703, CH4 21, CO 210 g/kg (IPCC 2013, satu sampel lab Christian 2003).
   - Pengukuran lapangan Kalteng 2015 (Stockwell 2016): CO2 1.564 ± 77, CH4 9,5 ± 4,7, CO 291 ± 49 g/kg.

## A. Deteksi dari satelit dan udara

| Rujukan | Temuan kunci | Status |
|---|---|---|
| Giglio dkk. 2016, RSE, doi:10.1016/j.rse.2016.02.054 | MOD14 C6: commission siang 1,2%; FRP berbasis radians | [T] |
| Tansey dkk. 2008, JGR 113, doi:10.1029/2008JD010717 | Gambut terdegradasi Kalteng: 15–16 ha per hotspot, omission ~60%, commission ~8%; memasukkan keyakinan rendah memperbaiki hasil | [T] |
| Sofan dkk. 2019, Remote Sens. 11:465, doi:10.3390/rs11040465 | ToPeCAl (Landsat-8 SWIR + TIRS): akurasi 82%, 93% setelah masker urban; VNP14IMG hanya 71% dari kebenaran lapangan; VIIRS malam lebih cocok dengan Landsat | [T] |
| Atwood dkk. 2016, PLOS ONE, doi:10.1371/journal.pone.0159410 | TET-1 FireBird 160 m: 88.704 piksel api vs MODIS 1.090 (24 Sep–23 Okt 2015); api gambut bersuhu rendah; front > 500 m/hari di gambut > 2 m | [T] |
| Johnston dkk. 2018, Fire 1:28, doi:10.3390/fire1020028 | Boreal: piksel 1 km gagal menangkap bara < 0,2 ha pada 45–70% kasus; VIIRS 375 m berpotensi menangkap semua | [T] |
| Vetrita dkk. 2021, ERL, doi:10.1088/1748-9326/abd3d1 | Produk luas terbakar MODIS hanya menangkap 38–48% luas; R² 0,6–0,8 di gambut | [T] |
| Elvidge dkk. 2013, Remote Sens. 5:4423, doi:10.3390/rs5094423 | VIIRS Nightfire: Planck fit memberi suhu sub-piksel, ukuran sumber, dan panas radian; membedakan bara dan nyala | [T] |
| Elvidge dkk. 2014, ACRS (prosiding) | Landsat-8 Sumatra: nyala ~800 K vs bara ~400 K; persistensi LWIR sebagai penanda bara | [B] |
| Schroeder dkk. 2016, RSE, doi:10.1016/j.rse.2015.08.032 | Api aktif Landsat-8 OLI: commission < 0,2% | [T] |
| Kumar & Roy 2018, IJDE, doi:10.1080/17538947.2017.1391341 | Algoritma Landsat-8 global berbasis reflektans, hanya siang | [T] |
| Wooster dkk. 2021, RSE 267, doi:10.1016/j.rse.2021.112694 | Ulasan LEO/GEO; satelit GEO > 100 pengamatan per hari | [T] |
| Hall dkk. 2023, IJRS, doi:10.1080/01431161.2023.2217983 | Validasi GEO termasuk Himawari: alarm palsu 2–6% pada keyakinan tinggi | [T] |
| Rahmi dkk. 2020, IJReSES 16, doi:10.30536/j.ijreses.2019.v16.a3293 | Himawari-8 di Kalteng: akurasi 51,3% (AFP) dan 27,6% (PFP); Himawari = peringatan, bukan konfirmasi | [T] |
| Nakazono dkk. 2022, JSPRS 61:66, doi:10.4287/jsprs.61.66 | Band 7 AHI melacak mulai dan padamnya api gambut 2015 | [T] |
| Engel dkk. 2022, Remote Sens. 14:2540, doi:10.3390/rs14112540 | Cara menghitung FRP hotspot Himawari 2 km tiap 10 menit | [T] |
| Vetrita & Cochrane 2020, Remote Sens. 12:5, doi:10.3390/rs12010005 | Gambut 13% luas Sumatra+Kalimantan, tetapi porsi terbakarnya per tahun ~5× non-gambut (2,8% vs 0,6%) | [T] |
| Lohberger dkk. 2018, GCB, doi:10.1111/gcb.13841 | Sentinel-1: 4,6 juta ha terbakar 2015, akurasi 84% | [T] |
| Burke dkk. 2019, Drones 3:23, doi:10.3390/drones3010023 | Drone termal mendeteksi api bawah tanah; ambang suhu sederhana cukup | [T] |
| Sam-Odusina dkk. 2025, Drones 9:459, doi:10.3390/drones9070459 | ResNet-50 + U-Net: IoU 87,6% (uji), 90% (api nyata), presisi 94,2%; api uji = briket arang dalam silinder | [T] |
| Scholten dkk. 2021, Nature, doi:10.1038/s41586-021-03437-y | Api boreal bertahan lewat musim dingin di tanah organik, lalu muncul lagi di lokasi yang sama | [B] |
| Waigl dkk. 2017, RSE, doi:10.1016/j.rse.2017.07.003 | VIFDAHL: 30–90% lebih banyak piksel api intensitas rendah | [B] |

## B. Emisi, FRE, dan neraca massa

| Rujukan | Temuan kunci | Status |
|---|---|---|
| Wooster dkk. 2005, JGR 110 D24311, doi:10.1029/2005jd006318 | FRE linear terhadap massa terbakar (r² 0,98). Koefisien 0,368 kg/MJ dari api **rumput savana**, bukan gambut | [T] abstrak; koefisien lewat Li 2018 |
| Li dkk. 2018, JGR Biogeosci. (NOAA repo 48652) | Rentang FBCC 0,368–0,453 kg/MJ (lapangan/lab); 0,266–0,374 untuk 445 api AS | [T] teks lengkap |
| Kaiser dkk. 2012, Biogeosci. 9:527, doi:10.5194/bg-9-527-2012 | GFAS: emisi dari FRP per tutupan lahan | [T] |
| Wooster dkk. 2018, Remote Sens. 10:495, doi:10.3390/rs10040495 | EF PM2.5 gambut murni 17,8–22,3 g/kg; EF CO2 1.779 ± 55 g/kg; PM2.5 2015 9,1 ± 3,5 Tg | [T] |
| Fisher dkk. 2020, Sensors 20:7075, doi:10.3390/s20247075 | Koefisien PM api gambut paling radian 16,8 g/MJ, bukan 52,4: FRP tinggi ≠ asap tinggi | [T] |
| Stockwell dkk. 2016, ACP 16:11711, doi:10.5194/acp-16-11711-2016 | Lapangan Kalteng 2015: MCE 0,772 (bara murni); CO2 1.564, CO 291, CH4 9,5 g/kg | [T] |
| Akagi dkk. 2011, ACP 11:4039, doi:10.5194/acp-11-4039-2011 | EF CO2 gambut 1.563 g/kg | [T] teks lengkap |
| Hu dkk. 2018, IJWF, doi:10.1071/wf17084 | Ulasan emisi bara; MCE dari lapangan sering disalahpahami | [T] |
| Huijnen dkk. 2016, Sci. Rep., doi:10.1038/srep26886 | 11,3 Tg CO2/hari Sep–Okt 2015 | [T] |
| Nechita-Banda dkk. 2018, Phil. Trans. B, doi:10.1098/rstb.2017.0307 | Inversi CO (MOPITT, IASI): 0,35–0,60 Pg C | [T] |
| Kiely dkk. 2019, ACPD, doi:10.5194/acp-2019-323 | PM2.5 2015 sebesar 7,33 Tg; kelembapan tanah satelit sebagai proksi kedalaman bakar menaikkan korelasi | [T] |
| Christian dkk. 2003, JGR 108, doi:10.1029/2003JD003704 | Satu sampel lab gambut Indonesia; sumber EF IPCC | [T] keberadaan |

## C. Kedalaman terbakar

| Rujukan | Temuan kunci | Status |
|---|---|---|
| Ballhorn dkk. 2009, PNAS, doi:10.1073/pnas.0906457106 | LiDAR Kalteng: 0,33 ± 0,18 m | [T] |
| Page dkk. 2002, Nature, doi:10.1038/nature01131 | 0,19–0,23 Gt C dari gambut 1997. Angka 51 cm di repo **belum terbaca** | [T] abstrak |
| Simpson dkk. 2016, Remote Sens. 8:1000, doi:10.3390/rs8121000 | Drone fotogrametri + LiDAR Jambi: 0,23 ± 0,19 m, maks ~1,3 m | [T] |
| Konecny dkk. 2016, GCB, doi:10.1111/gcb.13186 | Massa terbakar 206 → 115 → 69 → 23 t/ha untuk kebakaran ke-1 sampai ke-4+ | [T] |
| Hooijer dkk. 2012, Biogeosci. 9:1053, doi:10.5194/bg-9-1053-2012 | Turunnya permukaan karena drainase: 142 cm dalam 5 tahun. InSAR tak bisa memisahkan api dari drainase | [T] |
| Tarigan dkk. 2023, Front. Environ. Sci., doi:10.3389/fenvs.2023.1088923 | D-InSAR: penurunan 28–80 cm/tahun, lapangan 4–50 cm/tahun | [T] |
| Huang & Rein 2017, IJWF, doi:10.1071/wf16198 | Bara turun ~1 cm/jam | [T] |
| Prat-Guitart dkk. 2016, IJWF, doi:10.1071/wf15103 | Bara bertahan pada kadar air < 150% (densitas < 75 kg/m³) atau < 115% (150 kg/m³) | [T] |
| Benscoter dkk. 2011, IJWF, doi:10.1071/wf08183 | Kedalaman bakar ditentukan interaksi kadar air dan densitas | [T] |
| Page dkk. 2011, GCB, doi:10.1111/j.1365-2486.2010.02279.x | Densitas gambut tropis permukaan ~0,09 g/cm³ | [T] |

## D. Prediksi dan muka air

| Rujukan | Temuan kunci | Status |
|---|---|---|
| Taufik dkk. 2022, AgForMet 312:108738, doi:10.1016/j.agrformet.2021.108738 | PFVI (indeks yang dipakai `pfvi.py`). Bahaya tinggi di bawah −40 cm; area terbakar baru muncul di bawah −60 cm | [B] |
| Khakim dkk. 2022, GES, doi:10.24057/2071-9388-2021-137 | Sentinel-1 + ECMWF: bara terpicu sekitar muka air −0,5 m | [T] |
| Field & Shen 2008, JGR Biogeosci., doi:10.1029/2008jg000694 | Hujan 3 bulan menjelaskan 79% varians emisi. Ambang 4 bulan: 350 mm Sumsel selatan, 650 mm Kalsel | [T] |
| Field dkk. 2016, PNAS, doi:10.1073/pnas.1524888113 | Kepekaan tak linear terhadap kekeringan El Niño | [T] |
| Nikonovas dkk. 2022, NHESS 22:303, doi:10.5194/nhess-22-303-2022 | ProbFire: unggul pada lead 2–4 bulan di Kalsel, Sumsel, Papua selatan; tak unggul di Kalbar | [T] |
| Horton dkk. 2021, ESS, doi:10.1029/2021ea001873 | ML eks-PLG: tutupan lahan, kekeringan, ONI, kedalaman gambut, jarak infrastruktur | [T] |
| Hooijer dkk. 2026, Sci. Rep., doi:10.1038/s41598-026-64641-2 | Muka air harian dari IMERG di gambut tak terdrainase | [T] |
| Putra dkk. 2008, JDR, doi:10.20965/jdr.2008.p0334 | Hotspot berkorelasi kuat dengan anomali SST | [T] |
| Vernimmen dkk. 2020, CBM, doi:10.1186/s13021-020-00139-2 | Ketebalan gambut dari DTM LiDAR, R² 0,83–0,88 (Sumatra timur) | [T] |
| de Groot dkk. 2007, MASGC, doi:10.1007/s11027-006-9043-8 | FDRS Indonesia. Ambang DC 350 dan 261 di `drone.py` **belum** ditemukan di sumber mana pun | [B] |

## E. Kode terbuka

Belum ada kode terbuka untuk mendeteksi bara gambut dari satelit. Kode drone termal dari Drones 9:459 juga tidak terbuka.

| Repo | Nilai | Catatan |
|---|---|---|
| github.com/mellygsln/peatfr | sudah di-port ke `pfvi.py` | R, MIT di DESCRIPTION. ARIMA, LSTM, dan GRU sengaja tidak di-port |
| github.com/agustinohalim/peatfire-eval | tiru desain evaluasi | PeatFireBench, 498 kabupaten 2012–2025, MIT, belum terbit |
| github.com/davidhaes/peatfire-nino-2023-2025 | pembanding AUC jujur | ROC-AUC leave-one-year-out 0,61–0,75, MIT |
| github.com/cffdrs/cffdrs_py | uji silang rumus DC/FWI | GPL-2.0: cocokkan angka, jangan salin kode |
| github.com/gagreene/cffdrs | uji silang rumus FWI | MIT |
| github.com/PedroVenancio/mtg-frp-fire-progression | pola poligon progres dari FRP geostasioner | MIT, untuk Himawari |
| github.com/kiranaw/PeatFire | ide | ABM NetLogo api gambut tropis |
| github.com/lautenberger/gpyro | ide | model pirolisis yang dipakai studi bara Rein, GPL |
| github.com/pereira-gha/activefire | ide | CNN api aktif Landsat-8 |
| github.com/splionar/sipalaga-crawler | jangan | 2019. SiPALAGA kini menolak (403) |

## Celah yang belum dijawab literatur

- Belum ada ambang persistensi hotspot yang tervalidasi untuk bara gambut tropis.
- Belum ada pengukuran yang menghubungkan suhu permukaan (dari drone) dengan kedalaman bara.
- Validasi Himawari untuk api gambut lemah (akurasi 28–51%).
- Belum ada koefisien FRE-ke-massa khusus gambut.
- Ambang DC 350/261 belum bersumber.
