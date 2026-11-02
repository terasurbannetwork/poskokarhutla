# Peta kolaborasi aksi antisipatif desa langganan

Tanggal: 1 November 2026. Rujukan strategi: `docs/superpowers/specs/2026-11-01-logbook-pusdalops-design.md` (tiga lapis: siapkan sebelum musim, mata di desa, satu catatan baku).
Sistem teknisnya Centurisk97. BNPB dan BPBD adalah "kita"; tabel di bawah mendaftar pihak lain yang kita ajak bekerja sama.

Penanda mutu bukti: **[V]** terverifikasi dari sumber yang dikutip, **[T]** belum terverifikasi (pengetahuan umum atau hasil cari yang tidak memuat konfirmasi; cek sebelum dipakai di surat atau deck).
Wahana hukum: MoU = nota kesepahaman (payung, tanpa uang); PKS = perjanjian kerja sama (rinci: data, alat, waktu, hak cipta, keamanan); permintaan data dinas = surat biasa (lihat `PERMINTAAN-DATA.md`).
Prioritas: **Sekarang** (sebelum Desember 2026), **Musim ini** (hingga Maret 2027, musim hujan), **Tahun depan** (musim kemarau 2027 dan seterusnya).

## 1. Ringkasan: komponen ke pihak

| Komponen strategi | Pihak utama (urut prioritas) |
| ----------------- | ---------------------------- |
| Sensor longsor | UGM (GAMA-EWS), PVMBG Badan Geologi, BMKG (hujan), BPBD pilot Jateng |
| Sensor tinggi muka air sungai dan hujan | Kementerian PU (BBWS/BWS, pos telemetri), BMKG, ITB, UGM |
| Sensor gambut dan api | BRGM (SIPALAGA), IPB, KLHK (SiPongi), Dryad (uji coba kecil) |
| Radio mesh dan satelit | Komdigi/BAKTI, Meshtastic (komunitas), Starlink, operator seluler, Polri/TNI |
| Drone | TNI/Polri, Basarnas, BRIN, pembuat lokal (perlu dipetakan), Zipline (rujukan, bukan mitra dekat) |
| Data (cuaca, wilayah, jalan, penduduk) | BMKG, BIG, BPS, Kemendagri, PU, Komdigi |
| Pendanaan antisipatif | Kemenkeu (Pooling Fund Bencana, BPDLH), IFRC/PMI, WFP, UNDP, JICA, Bappenas |
| Riset dan uji | UGM, ITB, IPB, UI, ITS, Unpad, Undip, universitas gambut Sumatra dan Kalimantan |
| Peringatan ke warga | Komdigi (cell broadcast), BMKG, operator seluler, Google (Android Alerts), PMI |

## 2. Perguruan tinggi

| Pihak | Yang dimiliki | Kita minta | Kita beri | Wahana | Prioritas |
| ----- | ------------- | ---------- | --------- | ------ | --------- |
| UGM (Fakultas Teknik, Pusat Studi Bencana, tim Faisal Fathani dan Dwikorita Karnawati) | GAMA-EWS: sistem peringatan dini longsor berisi ekstensometer, tiltmeter, alat hujan, alat muka air, telemetri GSM/radio/satelit, platform data dan alarm masyarakat. Klaim UGM: terpasang di 33 provinsi, mendeteksi longsor Banjarnegara 4 jam sebelum kejadian (2007). Paten bersama pengembang. [V, dari UGM sendiri; angka sebaran berbeda antar halaman] | Data bacaan alat terpasang (hujan, gerakan) dalam format API atau CSV; lokasi dan ambang alat per desa; uji pasang sensor di kluster pilot Jateng; spesifikasi antarmuka ke `POST /api/sensor/baca` | Logbook kejadian terstruktur 2011 sampai sekarang untuk kalibrasi ambang; daftar desa langganan longsor; ko-penulisan hasil uji prospektif; dasbor status alat per kab | PKS (UGM sudah punya kerja sama dengan BNPB untuk peringatan dini longsor [V, ugm.ac.id/en/news/10222]; tinjau perjanjian yang sudah ada dulu) | Sekarang |
| ITB (Teknik Sipil/Sumber Daya Air, Teknik Geodesi, Pusat Mitigasi Bencana) | Kajian proof of concept impact-based forecast banjir di Indonesia [V, tercantum di pengabdian.dpmk.itb.ac.id]; keahlian hidrologi dan penginderaan jauh [T] | Metode ambang banjir berbasis dampak; pendampingan uji balik banjir yang kini kalah dari persisten (ETS 0,006 luar-sampel 2022) | Label dampak per kejadian dari logbook; set uji luar-sampel | MoU lalu PKS riset | Musim ini |
| IPB University (Fakultas Kehutanan, Departemen Silvikultur, Pusat Studi Bencana LPPM) | Riset gambut, muka air tanah, kebakaran lahan: banyak publikasi di repository IPB tentang pemantauan muka air gambut [V ada; unit pemilik spesifik belum dicek] | Dataset muka air dan kelembapan gambut; kalibrasi ambang siaga gambut (acuan 40 cm di bawah permukaan [V, mongabay.co.id/2019/01/28]); lokasi uji lapangan | Titik api dan luas terbakar dari sistem kita; bahan skripsi dan tesis; data kejadian | PKS | Tahun depan (kemarau 2027), mulai bicara sekarang |
| Universitas Indonesia (Pusat studi kebencanaan, Teknik, MIPA/Geografi) | Pusat studi bencana dan geografi spasial [T, belum dicek unit mana] | Analisis spasial desa terisolir; kajian dampak sosial; mahasiswa magang | Data logbook teragregasi; topik riset | MoU | Tahun depan |
| ITS (Teknik Geofisika, Teknik Sipil) | Materi mitigasi gerakan tanah dan geofisika [V ada kuliah tamu; tidak membuktikan sensor] | Survei geofisika untuk desa pilot; sensor murah | Lokasi uji, data | MoU | Tahun depan |
| Universitas Padjadjaran (Fakultas Teknik Geologi) | Keahlian longsor dan geologi Jawa Barat [T] | Pemetaan sesar dan tanah di kluster Jawa Barat | Data kejadian longsor Jabar | MoU | Tahun depan |
| Universitas Diponegoro | Riset rob dan penurunan tanah pesisir Semarang [T] | Data rob dan penurunan tanah | Kejadian rob dari logbook | MoU | Tahun depan |
| Universitas gambut: Universitas Palangka Raya, Sriwijaya, Riau, Lambung Mangkurat, Tanjungpura | Publikasi dan stasiun lapangan gambut [V ada di hasil cari: e-journal UPR, repository Unsri] | Akses lokasi uji, data muka air lokal, tenaga lapangan | Peta kluster langganan karhutla, titik api harian | PKS per kampus | Tahun depan |
| Universitas Syiah Kuala (TDMRC) dan kampus lain di lokasi pilot | Pusat riset tsunami dan bencana Aceh [T] | Tenaga lapangan, validasi laporan | Data | MoU | Sesuai kebutuhan |

Catatan jalur: pintu masuk kampus tersedia di modul `/kemitraan` (pencocokan pakar, belanja masalah BPBD). Peta ini sebaiknya mengisi daftar masalah di sana, bukan jalur terpisah.

## 3. Kementerian dan lembaga

| Pihak | Yang dimiliki | Kita minta | Kita beri | Wahana | Prioritas |
| ----- | ------------- | ---------- | --------- | ------ | --------- |
| BMKG | Prakiraan cuaca terbuka per kelurahan/desa, 3 hari, interval 3 jam, kode adm4 Kemendagri, batas 60 permintaan per menit per IP, wajib mencantumkan BMKG [V, data.bmkg.go.id/prakiraan-cuaca]; peringatan dini cuaca (nowcast) berpoligon [V, wrapper komunitas]; jaringan AWS, ARG dan radar [T, jumlah dan akses belum diverifikasi] | Data AWS/ARG historis dan waktu nyata untuk kluster pilot; radar; kerja sama peringatan ke desa; izin pemakaian di atas batas terbuka | Laporan lapangan terstruktur (dampak aktual) untuk verifikasi prakiraan berbasis dampak; daftar daerah senyap | PKS (BNPB dan BMKG sudah memiliki kerja sama umum; periksa yang masih berlaku [T]) | Sekarang |
| Kementerian PU, Ditjen Sumber Daya Air, BBWS/BWS | Pos hidrologi, pos duga air, sistem informasi hidrologi dan hidrometeorologi (SIH3), SE Dirjen SDA 10/2021 kendali mutu data hidrologi [V]; alat berat dan pompa [T]. Permintaan data antarinstansi lazim lewat PKS [V, dokumen TKPSDA yang dikutip pencarian] | Tinggi muka air telemetri dan ambang siaga sungai; kontrak siaga alat berat; status pos rusak | Peta kejadian banjir per desa; permintaan perbaikan pos berdasarkan kejadian | PKS dengan Ditjen SDA, lalu surat teknis ke tiap BBWS | Sekarang (data), Musim ini (alat berat) |
| BRGM (Badan Restorasi Gambut dan Mangrove) | SIPALAGA: stasiun pemantau muka air gambut, kelembapan tanah dan curah hujan per 10 menit, data ke server tiap jam; 142 pemantau di 7 provinsi sampai 2018 [V, mongabay 2019; jumlah kini belum dicek] | Akses API/unduhan SIPALAGA; titik stasiun; status alat | Titik api dan indikator kekeringan; peta desa langganan karhutla | PKS | Musim ini |
| KLHK (sekarang kementerian kehutanan dan kementerian lingkungan hidup) | SiPongi: pemantauan karhutla nasional, titik panas dan luas terbakar [T, tidak ditemukan di hasil cari; cek nama dan pemilik unit saat ini] | Luas terbakar resmi; data patroli; tim Manggala Agni | Data warga dan logbook kejadian | PKS | Musim ini |
| Komdigi (dan BAKTI) | Data blank spot: 2.121 desa 0% 4G per 10 Des 2025 [V, detik]; angka lain 2.333 desa tanpa internet, 2.017 tanpa 4G [V, bisnis.com 28 Sep 2025]; rencana peringatan dini cell broadcast dan peringatan lewat TV digital [V rencana; status akhir 2026 belum dikonfirmasi]; layanan 112 [V]. Pada banjir Sumatra 2025: 60,7% BTS Aceh padam 8 hari sesudahnya [V, bisnis.com 9 Des 2025] | Daftar desa blank spot beserta koordinat; data BTS padam saat bencana; jalur cell broadcast; frekuensi radio untuk LoRa (cek izin 915-923 MHz di Indonesia [T]) | Daftar desa langganan yang butuh jaringan siaga; hasil uji sinyal putus dari logbook (306 entri) | MoU BNPB-Komdigi; PKS teknis dengan BAKTI | Sekarang |
| BIG (Badan Informasi Geospasial) | Peta dasar, batas wilayah, Ina-Geoportal [T] | Batas desa, jaringan jalan, DEM nasional (DEMNAS), peta sungai | Hasil survei desa terisolir sebagai koreksi atribut | Permintaan data + PKS bila volume besar | Musim ini |
| BPS dan Kemendagri | Kode dan data wilayah: Kepmendagri 300.2.2-2138 Tahun 2025 dan pembaruannya [V]; BMKG sudah memakai kode adm4 ini. Podes, penduduk per desa [T] | Kode desa terbaru, penduduk per desa, Podes (akses jalan, sinyal, listrik, kejadian bencana) | Dua data dipetakan ke satu kunci desa; temuan kode ganda | Permintaan data (Satu Data Indonesia), PKS bila mikro | Sekarang |
| Kementerian Keuangan (DJPPR, PARB, BPDLH, BLU) | Pooling Fund Bencana: Perpres 75/2021, dikelola BPDLH, saldo sekitar Rp7,4 triliun (2023) dan Rp7,5 triliun (Des 2025) [V]; asuransi barang milik negara dengan PFB (PMK 28/2025 dan 43/2025) [V]. Dana Siap Pakai ada di BNPB sendiri | Jalur pencairan untuk tindakan antisipatif (belum ada mekanisme resmi [T]); masukan desain pemicu berbasis prakiraan | Bukti biaya per kejadian dan untung-rugi aksi dini (dari logbook dan uji pilot) | Koordinasi Kemenko PMK, Kemenkeu, BNPB (ada presedennya [V, kemenkopmk.go.id/node/6056]) | Musim ini (naskah), Tahun depan (uji pencairan) |
| ESDM/PVMBG (Badan Geologi) | MAGMA Indonesia (gunung api, gempa, tsunami, gerakan tanah); Portal MBG sejak Desember 2023 untuk unduh KRB dan Zona Kerentanan Gerakan Tanah (4 kelas) vektor dan raster, prakiraan gerakan tanah bulanan; peta dikirim ke pemda [V, esdm.go.id]. Dasar hukum kewenangan peta rawan longsor di Badan Geologi [T, hasil cari menyebut UU Minerba, nomor dan tahunnya tidak konsisten; cek teks aslinya]. Sensor gerakan tanah PVMBG sendiri belum dikonfirmasi | ZKGT vektor lengkap; data kejadian gerakan tanah dan rekomendasi; rekomendasi teknis untuk desa pilot | Kejadian longsor terlapor, daftar desa langganan | Permintaan data + PKS | Sekarang |
| BRIN | Penginderaan jauh, sensor, satelit [T, program spesifik belum diverifikasi] | Citra, algoritma deteksi, laboratorium uji sensor | Data validasi lapangan | MoU | Tahun depan |
| TNI dan Polri | Satelit dan Starlink: Polri memasang 8 terminal di banjir Sumatra 2025 [V, rm.id]; drone, alat berat, helikopter [T] | Jalur logistik dan komunikasi siaga; operator drone | Daftar desa terisolir dan lokasi stok | MoU yang ada; PKS operasional | Musim ini |
| Basarnas | Drone, SAR, jaringan radio [T] | Dukungan pasca peringatan; data korban | Peta akses terputus | MoU | Tahun depan |
| Kemenko PMK dan Bappenas | Koordinasi aksi antisipatif nasional: Kemenko PMK sudah menerima WFP, PMI, OCHA sejak September 2022 [V, kemenkopmk.go.id/node/4115] | Mandat; masuk Renstra | Naskah akademik hasil uji pilot | Rapat koordinasi | Musim ini |

## 4. BUMN dan swasta

| Pihak | Yang dimiliki | Kita minta | Kita beri | Wahana | Prioritas |
| ----- | ------------- | ---------- | --------- | ------ | --------- |
| Telkomsel, Indosat, XL Smart (melalui ATSI atau Komdigi) | Peta cakupan, data BTS padam, genset siaga [T, belum diverifikasi per operator]; cell broadcast butuh dukungan operator [V, investortrust] | Peta cakupan per desa; status BTS saat bencana; uji cell broadcast di pilot | Daftar desa langganan terisolir untuk prioritas pemulihan dan BTS portabel | MoU BNPB-operator; PKS | Musim ini |
| Starlink (SpaceX) | Terminal satelit: BNPB mengirim 17 unit ke Sumut, tambahan 280 unit dari pemerintah, layanan gratis untuk korban [V, kompas.tv, bcasekuritas, teknologi.id] | Penempatan terminal siaga di pos BPBD desa langganan; tarif lembaga | Daftar lokasi prioritas | Pengadaan atau hibah bersyarat | Musim ini |
| PLN | Data padam listrik per gardu, genset [T] | Data padam waktu nyata; titik panel surya untuk sensor | Peta desa langganan | PKS | Tahun depan |
| Pembuat drone lokal (belum dipetakan) | [T] Perlu survei: komunitas drone BPBD, vendor dalam negeri | Uji drone ke desa terisolir; pemetaan pasca banjir | Lokasi uji, data | Uji coba lewat BPBD | Tahun depan |
| Perangkat sensor dan LoRa (vendor lokal, komunitas Meshtastic) | Komunitas Meshtastic dunia; uji coba lapangan terbatas: medan jadi pembatas utama, 8,5 km hasil uji informal dari tempat tinggi [V, xebia, wellington] | Panduan pasang, perangkat murah untuk 5 desa pilot | Hasil uji jangkauan di medan Jateng | PKS kecil atau pengadaan | Sekarang |

## 5. Internasional dan nirlaba

| Pihak | Yang dimiliki | Kita minta | Kita beri | Wahana | Prioritas |
| ----- | ------------- | ---------- | --------- | ------ | --------- |
| IFRC dan PMI | Early Action Protocol banjir Indonesia (EAP2024ID01, nomor operasi MDRID027): alokasi CHF 517.485 [V, reliefweb dan go-api.ifrc.org], pemicu dari prakiraan BMKG atau dasbor pencegahan BNPB, ambang curah 100 mm per 24 jam; PMI melaporkan akses data prakiraan terinci terbatas (update 10 April 2026) [V] | Penyatuan pemicu EAP dengan desa langganan kita; paket aksi dini (kit martabat 1.500 unit sudah dibeli [V]); sukarelawan desa | Data prakiraan terinci dan daftar desa langganan; hasil uji pilot | MoU tiga pihak BNPB-PMI-IFRC | Sekarang |
| WFP | Kajian integrasi aksi antisipatif di Indonesia [V, wfp.org/publications/integrating-anticipatory-action-indonesia]; bersama PMI dan OCHA mengajukan ke Kemenko PMK sejak 2022 [V] | Pendanaan uji pilot, analitik, bantuan tunai | Hasil, dasbor | MoU | Musim ini |
| UNDP, OCHA | Pembiayaan risiko bencana; OCHA punya kerangka tiga unsur: model prakiraan, dana yang disepakati sebelumnya, rencana aksi [V] | Pendanaan dan penyelarasan | Data uji | MoU | Tahun depan |
| JICA | Kerja sama Kemenkominfo-JICA tentang prediksi gempa dan tsunami (2019) [V]; proyek longsor atau aksi antisipatif 2024 sampai 2025 tidak ditemukan [belum ada bukti] | Hibah teknik; pelatihan; bandingkan dengan SIP4D Jepang | Bahan | Permintaan proyek via Bappenas | Tahun depan |
| Google (Flood Hub, Crisis Response, Android Earthquake Alerts) | Flood Hub: prakiraan banjir sungai sampai 7 hari, 80 negara (Nature 2024), kemudian lebih dari 100 negara [V, blog.google]; cakupan Indonesia belum diverifikasi; Android Earthquake Alerts aktif di 98 negara [V, Science 2025] | Akses prakiraan banjir sungai untuk Indonesia; kemitraan tautan peringatan | Data lapangan sebagai verifikasi | MoU atau perjanjian data | Musim ini |
| Dryad Networks | Silvanet: sensor gas bertenaga surya dan jaringan mesh; menang XPRIZE Wildfire (klaim perusahaan: deteksi di bawah 12 menit) [V, hanya rilis perusahaan] | Uji coba kecil di 1 kluster gambut atau hutan; harga | Hasil uji lapangan | Uji coba bersama kampus (IPB) | Tahun depan |
| PetaBencana.id (Yayasan Peta Bencana) | Laporan warga berbasis chatbot; terintegrasi dengan InAWARE BNPB dan Pantau Banjir BPBD DKI [V, ITU dan blog sendiri] | Umpan laporan warga ke daftar daerah senyap | Verifikasi dari logbook | Perjanjian data | Musim ini |

## 6. Tiga langkah pertama (Sekarang)

1. Surat ke BMKG, PU (Ditjen SDA), BPS/Kemendagri, PVMBG untuk data pada `PERMINTAAN-DATA.md`; paralel dengan UGM untuk sensor longsor.
2. Rapat dengan PMI dan IFRC: samakan pemicu EAP banjir dengan daftar desa langganan.
3. Pembicaraan Komdigi: daftar blank spot dan jalur cell broadcast.

## 7. Sumber

- UGM GAMA-EWS: https://gama-inatek.ugm.ac.id/gama-ews/ ; https://ugm.ac.id/en/news/10222-ugm-bnpb-cooperate-to-mitigate-landslides/
- SIPALAGA/BRGM: https://mongabay.co.id/2019/01/28/brg-kembangkan-sistem-pemantauan-muka-air-gambut/
- BMKG prakiraan terbuka: https://data.bmkg.go.id/prakiraan-cuaca/
- PU SIH3 dan SE 10/2021: https://sda.pu.go.id/assets/uploads/files/SE%2010%20Tahun%202021%20Kendali%20Mutu%20Data%20Hidrologi_1778643214_164349536e6fed83a965.pdf
- PVMBG Portal MBG: https://www.esdm.go.id/id/media-center/arsip-berita/sediakan-informasi-kebencanaan-geologi-pvmbg-luncurkan-portal-mbg
- Blank spot: https://finance.detik.com/berita-ekonomi-bisnis/d-8252690/duh-komdigi-ungkap-2-121-desa-blankspot-belum-teraliri-internet ; https://teknologi.bisnis.com/read/20250928/101/1915341/2233-desa-tak-tersentuh-4g-pengusaha-usul-komdigi-petakan-wilayah-prioritas
- BTS padam Aceh: https://teknologi.bisnis.com/read/20251209/101/1935349/8-hari-pascabanjir-aceh-sumatra-komdigi-607-bts-di-aceh-masih-padam
- Starlink Sumatra: https://www.kompas.tv/regional/634250/bnpb-sebut-prabowo-kirim-17-starlink-hingga-15-perahu-karet-ke-sumut ; https://bcasekuritas.co.id/en/latest-news/news/pemerintah-tambahkan-280-unit-starlink-pulihkan-komunikasi-di-sumatera
- Pooling Fund Bencana: https://fiskal.kemenkeu.go.id/fiskalpedia/2022/11/10/20-pooling-fund-bencana ; https://ekonomi.bisnis.com/read/20230302/9/1633394/pemerintah-bentuk-dana-abadi-penanggulangan-bencana-tersedia-rp74-triliun
- EAP banjir PMI: https://reliefweb.int/report/indonesia/indonesia-floods-early-action-protocol-annual-report-31-march-2026-eap-no-eap2024id01-operation-no-mdrid027
- WFP/Kemenko PMK: https://www.wfp.org/publications/integrating-anticipatory-action-indonesia ; https://kemenkopmk.go.id/node/4115
- Kode wilayah: https://github.com/cahyadsn/wilayah (turunan, bukan resmi; cek Kepmendagri 300.2.2-2138/2025)
- Cell broadcast: https://investortrust.id/national/41825/tiru-jepang-indonesia-siapkan-notifikasi-peringatan-bencana-yang-muncul-otomatis-di-ponsel
- Dryad: https://www.businesswire.com/news/home/20251030436236/en/Dryad-Demonstrates-Wildfire-Detection-and-Suppression-System-Sensing-Locating-and-Extinguishing-Fire-in-Under-12-Minutes-With-No-Human-Involved
- Google Flood Hub: https://blog.google/technology/ai/expanding-flood-forecasting-coverage-helping-partners/
- PetaBencana: https://www.itu.int/hub/2022/08/crowdsourcing-helps-mitigate-disasters/
