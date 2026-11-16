# Lampiran C. Tabel Perbandingan Internasional

Status: Fase 1, draf untuk dibaca pemilik. Seluruh isi berasal dari `riset/PUSTAKA.md` (sumber dibuka 12 November 2026) dan, untuk baris Indonesia, dari `riset/REGULASI.md`. Sel yang tidak dapat diverifikasi ditandai [BELUM TERVERIFIKASI]; sel "tidak diriset" berarti sumbernya tidak dibuka, bukan berarti aturannya tidak ada. Angka antarsumber tidak dijumlah.

Singkatan di lampiran ini: EM-DAT (Emergency Events Database, CRED, Universitas Louvain); DesInventar (sistem inventaris kerugian bencana yang dikelola bersama UNDRR); UNDRR (Kantor PBB untuk Pengurangan Risiko Bencana); GAR (Global Assessment Report); GLIDE (nomor pengenal bencana global); PAGER (sistem perkiraan dampak gempa USGS); GDACS (sistem peringatan bencana PBB dan Uni Eropa); GWIS (sistem informasi kebakaran global); MTBS (basis data keparahan kebakaran Amerika Serikat); FEMA (badan penanggulangan keadaan darurat Amerika Serikat); NDRRMC dan NDCC (badan nasional penanggulangan bencana Filipina; NDCC adalah nama dewan koordinasi pada dokumen ADPC 2001); NEMA (badan manajemen darurat nasional Australia); KK (kepala keluarga); MMI (skala intensitas Mercalli); VEI (indeks keeksplosifan letusan); SPI (indeks presipitasi terstandar); ha (hektare).

## C.1 Basis data dan negara

Tabel C.1 membandingkan sembilan basis data dan lima negara dengan Indonesia pada delapan kolom. Kolom "Basis" menyatakan apakah ambang berupa angka mutlak, ukuran relatif terhadap penduduk atau sumber daya, tanpa ambang, atau diskresioner.

Tabel C.1. Perbandingan basis data dan negara

| Basis data atau negara | Lembaga | Satuan kejadian | Aturan gabung atau lintas wilayah | Ambang pencatatan | Ambang deklarasi atau skala | Basis | Sumber (URL) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EM-DAT | CRED, Universitas Louvain | Satu entri per negara, diikat satu nomor DisNo (empat digit tahun, empat digit urut) | Kejadian lintas negara: satu entri per negara dengan DisNo yang sama; bahaya berantai: satu entri dengan kolom jenis terkait | Salah satu: 10 meninggal (termasuk hilang); 100 terdampak (terdampak, luka, tunawisma); seruan bantuan internasional atau deklarasi darurat | Tidak berlaku (basis data) | Absolut | https://doc.emdat.be/docs/protocols/entry-criteria/ ; https://doc.emdat.be/docs/data-structure-and-content/emdat-public-table/ ; https://doc.emdat.be/docs/data-structure-and-content/disaster-classification-system/ |
| DesInventar | UNDRR dan mitra | Kejadian pada unit geografis terendah yang seragam (setara kabupaten/kota untuk inventaris nasional) | Satu kejadian dapat mengenai beberapa unit geografis; pengelompokan kejadian berantai belum didukung perangkat | Tanpa ambang; hanya kejadian yang menimbulkan dampak | Tidak berlaku | Tanpa ambang | https://desinventar.cimafoundation.org/methodology.html ; https://preparecenter.org/wp-content/uploads/2021/04/DesInventar_MethodologicalGuide_8.1.9.pdf |
| UNDRR GAR 2015, Kotak 4.1 | UNDRR | Kerugian bencana nasional | Tidak berlaku | Tidak berlaku | Ekstensif: meninggal kurang dari 30 dan rumah hancur kurang dari 600; intensif: meninggal 30 atau lebih atau rumah hancur 600 atau lebih | Absolut | https://preventionweb.net/english/hyogo/gar/2015/en/home/GAR_2015/GAR_2015_93.html |
| Kerangka Sendai (laporan OIEWG A/71/644 dan Panduan Teknis) | PBB, UNDRR | Agregat tahunan per negara, bukan per kejadian [simpulan peneliti dari struktur indikator] | Meninggal dan hilang saling lepas; double counting pada B-2 sampai B-5 diakui tak terhindarkan | Tidak berlaku; cakupan bencana skala kecil dan besar, mendadak dan lambat | Tidak berlaku | Per 100.000 penduduk untuk indikator gabungan | https://digitallibrary.un.org/record/852089/files/A_71_644-EN.pdf |
| GLIDE | ADRC, bersama OCHA/ReliefWeb, UNDRR, UNDP, WMO, IFRC, FAO, Bank Dunia, Komisi Eropa, CRED | Nomor per kejadian: dua huruf jenis, tahun, enam digit urut, tiga huruf negara | Kode negara di dalam nomor, sehingga kejadian lintas negara cenderung bernomor per negara [inferensi peneliti]; aturan kejadian berantai [BELUM TERVERIFIKASI] | Tidak dinyatakan di halaman yang dibuka | Tidak berlaku | Tidak berlaku | https://www.glidenumber.net/glide/public/about.jsp |
| USGS PAGER | USGS | Gempa | Tidak berlaku | Semua gempa dinilai | Hijau 0 korban dan kerugian di bawah USD 1 juta; kuning 1 sampai 99 dan USD 1 sampai 100 juta; oranye 100 sampai 999 dan USD 100 juta sampai 1 miliar; merah 1.000 atau lebih dan USD 1 miliar atau lebih | Absolut, perkiraan model | https://earthquake.usgs.gov/data/pager/background.php |
| GDACS | Uni Eropa dan PBB (JRC, OCHA, ECHO) | Peristiwa per bahaya, dengan level hijau, oranye, merah | Karhutla: perimeter kebakaran dari GWIS | Gempa: skor 0 (hijau) bila intensitas maksimum di tempat berpenduduk tidak lebih dari MMI VI; karhutla: 5.000 ha atau lebih; banjir: semua banjir hijau | Banjir oranye lebih dari 100 meninggal atau 80.000 mengungsi, merah lebih dari 1.000 atau 800.000; karhutla beranda lebih dari 10.000 ha dan lebih dari 10.000 jiwa dalam radius 5 km | Absolut dan paparan | https://www.gdacs.org/Knowledge/models_eq.aspx ; https://www.gdacs.org/Knowledge/models_fl.aspx ; https://www.gdacs.org/Knowledge/models_wf.aspx |
| Basis data kebakaran (GlobFire, FIRED, Global Fire Atlas) | Peneliti (Artes dkk. 2019; Balch dkk. 2020; Andela dkk. 2019) | Himpunan area terbakar hasil delineasi | Lihat Tabel C.3 | Piksel MODIS terkecil sekitar 21 ha (Global Fire Atlas) | Tidak berlaku | Aturan ruang-waktu | https://www.nature.com/articles/s41597-019-0312-2 ; https://ecoevorxiv.org/repository/object/4332/download/8685 ; https://essd.copernicus.org/articles/11/529/2019/ |
| Munich Re NatCatSERVICE dan Swiss Re Sigma | Perusahaan reasuransi | Kejadian kerugian | Kerugian yang tidak dapat dipisah per sebab (angin dan banjir dalam satu badai) menjadi kesulitan | Tidak tertera di sumber yang dibuka [BELUM TERVERIFIKASI] | Tidak berlaku | Tidak diketahui | https://nhess.copernicus.org/articles/12/535/2012/nhess-12-535-2012.html ; https://www.munichre.com/en/solutions/for-industry-clients/natcatservice.html |
| Jepang | Kantor Kabinet | Kota dan prefektur | Penilaian di tingkat kota, lalu prefektur; hitungan rumah memakai kesetaraan | Tidak diriset | Rumah hilang menurut penduduk kota: 30 KK (kurang dari 5.000 jiwa) sampai 150 KK (300.000 jiwa atau lebih); setengah rusak dihitung 2, terendam lantai atau tertimbun sedimen dihitung 3 (Cabinet Order 225/1947, Pasal 1 dan Lampiran 1) | Absolut berjenjang menurut penduduk | https://laws.e-gov.go.jp/api/1/lawdata/322CO0000000225 |
| Amerika Serikat | FEMA | Bencana yang dideklarasikan, dinilai per negara bagian dan county | Tidak diriset | Tidak berlaku | Indikator USD 1 per penduduk, disesuaikan tahunan; insiden mulai 1 Oktober 2026: USD 2,01 (negara bagian), USD 5,03 (county), minimum USD 1 juta kerusakan bantuan publik; nilai dari dokumen public inspection, perlu dicek ke edisi cetak [BELUM TERVERIFIKASI] | Relatif dan absolut | https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-44?part=206&section=206.48 ; https://public-inspection.federalregister.gov/2026-22694.pdf ; https://public-inspection.federalregister.gov/2026-22691.pdf |
| Filipina | NDRRMC (dahulu NDCC) | Wilayah deklarasi: nasional, daerah, barangay | Tidak diriset | Tidak diriset | Dua kondisi atau lebih dari enam selama sedikitnya empat hari: 20 persen penduduk terdampak atau 20 persen rumah hancur; 40 persen sarana penghidupan hancur; jalan dan jembatan utama tidak dapat dilalui; kerusakan luas pertanian; gangguan jalur vital; epidemi (ADPC 2001, bagian 3.12.2); teks asli NDCC MC 4 s.1998 tidak dibuka | Relatif, dengan komponen kualitatif | https://www.locjkt.or.id/application/docliblcjkt/upload/Philippine%20Disaster%20Management.pdf |
| India | Kementerian Dalam Negeri, NDMA | Bencana pada tingkat negara bagian | Tidak diriset | Tidak diriset | Calamity of severe nature: tanpa kriteria tetap; ditetapkan pusat menurut intensitas dan besar kerugian, umumnya atas rekomendasi tim antarkementerian. Pernyataan bahwa India tidak mengenal deklarasi "bencana nasional" [BELUM TERVERIFIKASI] | Diskresioner | https://ies.gov.in/arthapedia/concept/calamity-severe-nature |
| Australia | NEMA | Kejadian yang dibiayai lewat DRFA 2018 | Tidak diriset | Tidak berlaku | Batas "small disaster criterion" sekitar AUD 240.000 dan kewajiban memberitahu NEMA dalam tiga bulan [BELUM TERVERIFIKASI] | Absolut (biaya) | [BELUM TERVERIFIKASI] (dokumen nema.gov.au tidak terjangkau) |
| Indonesia (Juklak 7/2023 dan UU 24/2007) | BNPB, Pusdatinkom sebagai walidata | Kejadian per kabupaten/kota, tipe utama satu per kejadian, KIB 16 digit | Nasional dihitung satu kejadian, per provinsi dan per kabupaten/kota dihitung per wilayah terdampak; dua lokasi satu hari dalam satu kabupaten/kota dihitung satu | Satu dari: 1 meninggal; 50 terkena dampak, luka, atau mengungsi; 5 unit rumah dan/atau fasilitas publik rusak; 1 ha lahan; permintaan bantuan nasional; penetapan status darurat | Status darurat menurut skala: Presiden (nasional), gubernur, bupati/wali kota (UU 24/2007 Pasal 51); UU Pasal 7 ayat (2) menyebut lima indikator tanpa angka | Absolut | `riset/REGULASI.md`, bagian 1.2, 1.3, dan 3 |

Sumber: `riset/PUSTAKA.md`, butir 1 sampai 10 dan tabel perbandingan negara; `riset/REGULASI.md`. Kolom URL memuat halaman yang dibuka. Sebagian halaman dibuka lewat unduhan langsung dan ekstraksi teks (PDF, XML e-Gov); nomor halaman PDF tidak dicatat.

Catatan pembacaan Tabel C.1.

1. Satuan kejadian berbeda. EM-DAT menghitung per negara, DesInventar per unit geografis terendah, GLIDE per nomor, Jepang per kota dan prefektur, FEMA per negara bagian dan county. Jumlah kejadian dari dua basis data karena itu tidak dapat dibandingkan langsung (P-48, P-55).
2. Di antara sumber yang dibuka, hanya EM-DAT dan Indonesia yang memasukkan kriteria administratif (seruan bantuan atau status darurat) sebagai pintu masuk pencatatan.
3. Dua baris diberi tanda belum terverifikasi pada kolom ambang (NatCatSERVICE dan Sigma) karena halaman sumbernya tidak memuat ambang. Ringkasan pencarian menyebut kriteria Sigma lama (20 meninggal atau hilang, 50 luka, 2.000 tunawisma, dan ambang kerugian yang disesuaikan inflasi), tetapi PDF terkait tidak dibuka [BELUM TERVERIFIKASI].
4. Rujukan ke "15 persen penduduk" dan "Memorandum Circular 4 s.2012" untuk Filipina, yang beredar di bahan awal kajian, tidak ditemukan di sumber yang dibuka dan tidak dipakai [BELUM TERVERIFIKASI].

## C.2 Skala keparahan menurut bahaya

Tabel C.2 mengumpulkan skala keparahan yang sudah dipakai dunia, dikelompokkan menurut bahaya. Skala di sini mengukur bahaya, dampak, atau campuran keduanya; kolom "Mengukur" membedakannya, karena pembedaan itu menjadi dasar Bab 6 (L3).

Tabel C.2. Skala keparahan menurut bahaya

| Bahaya | Skala | Kelas dan ambang | Mengukur | Sumber (URL) |
| --- | --- | --- | --- | --- |
| Gempa bumi | USGS PAGER | Hijau 0 korban, kerugian di bawah USD 1 juta; kuning 1 sampai 99 korban, USD 1 sampai 100 juta; oranye 100 sampai 999, USD 100 juta sampai 1 miliar; merah 1.000 atau lebih, USD 1 miliar atau lebih. Respons yang disarankan: tak perlu, lokal atau regional, nasional, internasional. Dasar persentase PDB dan aturan "skala tertinggi menentukan warna" [BELUM TERVERIFIKASI] | Dampak perkiraan | https://earthquake.usgs.gov/data/pager/background.php |
| Gempa bumi | GDACS | Skor mentah = minus 0,59 ditambah 0,53 kali log10 (penduduk terskala); penduduk terskala = 10 x penduduk MMI IX + penduduk MMI VIII + 0,1 x penduduk MMI VII; dikoreksi kerentanan negara (rentang -1 sampai +1) dan dikalibrasi dengan korban sejak 2006; skor di bawah 1 kira-kira berarti korban kurang dari 10; hijau bila MMI maksimum di tempat berpenduduk tidak lebih dari VI | Bahaya dan paparan (intensitas, penduduk, kapasitas) | https://www.gdacs.org/Knowledge/models_eq.aspx |
| Gempa bumi | MMI | Dipakai GDACS sebagai batas hijau (MMI VI); definisi skala MMI tidak dibuka [BELUM TERVERIFIKASI] | Intensitas guncangan di tempat | https://www.gdacs.org/Knowledge/models_eq.aspx |
| Banjir | GDACS | Merah: lebih dari 1.000 meninggal atau 800.000 mengungsi; oranye: lebih dari 100 meninggal atau 80.000 mengungsi; hijau: lainnya. Parameter keparahan dari Global Flood Detection System tidak memengaruhi level | Dampak | https://www.gdacs.org/Knowledge/models_fl.aspx |
| Banjir | Periode ulang | Tidak diriset [BELUM TERVERIFIKASI] | Bahaya | tidak ada |
| Karhutla | GDACS | Masuk bila 5.000 ha atau lebih (otomatis, hijau); kebakaran lebih kecil dimasukkan manual bila berpotensi berdampak kemanusiaan; beranda bila lebih dari 10.000 ha dan lebih dari 10.000 jiwa dalam radius 5 km; merah bila dampak berat dengan ratusan atau ribuan mengungsi, sering puluhan meninggal, atau aktivasi mekanisme perlindungan sipil Uni Eropa dengan kapasitas penanganan rendah; oranye bila dampak langsung pada orang dan area terbangun, mungkin ada korban jiwa; skor numerik hanya 0,5, 1,5, 2,5 | Luas ditambah dampak | https://www.gdacs.org/Knowledge/models_wf.aspx |
| Karhutla | Ambang MTBS | 404 ha (Amerika Serikat barat) dan 202 ha (timur, di timur bujur 97 derajat barat) sebagai pembanding perimeter dalam FIRED | Luas | https://ecoevorxiv.org/repository/object/4332/download/8685 |
| Karhutla | Kelas ukuran NWCG A sampai G | Kelas A seperempat are atau kurang sampai kelas G 5.000 acre atau lebih menurut ringkasan pencarian; batas kelas tengah dan halaman NWCG tidak dapat dibuka (HTTP 403) [BELUM TERVERIFIKASI] | Luas | tidak ada |
| Karhutla | Ambang Laporan Kejadian Menonjol Pusdalops (Indonesia, draf Juli 2025) | 2 ha | Luas | `scripts/wa/panduan_resmi.json` |
| Letusan gunung api | VEI (Newhall dan Self 1982) | Indeks 0 sampai 8; logaritmik, tiap interval berarti kenaikan sepuluh kali volume material yang dilontarkan (kecuali antara VEI 0, 1, dan 2); VEI 0 untuk erupsi non-eksplosif dengan tefra kurang dari 10.000 m3; VEI 8 sekitar 1 x 10^12 m3 dengan kolom lebih dari 20 km. Artikel asli JGR 87:1231-1238 tidak dibuka; sumber yang dibuka sekunder | Bahaya (volume erupsi) | https://en.wikipedia.org/wiki/Volcanic_explosivity_index |
| Kekeringan | SPI (WMO-No. 1090, dikutip JMA) | 0 sampai -0,99 kering ringan (sekali per 3 tahun); -1,00 sampai -1,49 kering sedang (sekali per 10 tahun); -1,5 sampai -1,99 kering parah (sekali per 20 tahun); kurang dari -2,0 kering ekstrem (sekali per 50 tahun atau lebih jarang). Hanya curah hujan, tanpa penguapan. Tabel sisi basah [BELUM TERVERIFIKASI] | Bahaya (meteorologis) | https://ds.data.jma.go.jp/gmd/cpd/monitor/climatview/spi_commentary.html |
| Semua bahaya | GAR 2015, extensive risk lawan intensive risk | Intensif: meninggal 30 atau lebih atau rumah hancur 600 atau lebih; ekstensif: di bawahnya | Dampak | https://preventionweb.net/english/hyogo/gar/2015/en/home/GAR_2015/GAR_2015_93.html |
| Semua bahaya | Status darurat Indonesia | Kabupaten/kota, provinsi, nasional menurut skala (UU 24/2007 Pasal 51); komando dibedakan menurut cakupan wilayah, bukan angka dampak (Perka BNPB 3/2016 Pasal 3 ayat (2)) | Respons dan cakupan | `riset/REGULASI.md`, bagian 3 dan 5 |

Sumber: `riset/PUSTAKA.md`, butir 6, 7, 8, 12 dan tabel; `riset/REGULASI.md`, bagian 3 dan 5; `scripts/wa/panduan_resmi.json`.

Catatan pembacaan Tabel C.2.

1. Skala bahaya (VEI, SPI, MMI, luas kebakaran) tidak menyatakan besar bencana. Gempa dengan MMI tinggi di daerah tanpa penduduk tidak berdampak, dan hanya PAGER, GDACS, dan batas GAR yang menimbang dampak atau paparan (P-21, P-34).
2. Ambang karhutla dunia dan Indonesia berselisih lebih dari tiga orde besaran: 5.000 ha di GDACS, 404 dan 202 ha di MTBS, 2 ha di Laporan Kejadian Menonjol Pusdalops, dan 1 ha di Juklak 7/2023. Satu piksel VIIRS sudah mewakili 14,06 ha (Bab 4.7), jadi dua ambang terakhir berada di bawah resolusi satelit.
3. Hanya PAGER dan GDACS banjir yang menghubungkan kelas dengan tingkat respons atau korban jiwa secara eksplisit. Penyusunan skala L3 untuk Indonesia perlu daftar surat keputusan status darurat dan dana siap pakai per kejadian untuk kalibrasi (Q-35).

## C.3 Aturan delineasi kebakaran

Tabel C.3 merinci aturan yang menentukan apakah dua area terbakar menjadi satu kebakaran. Tabel ini menjadi bahan simulasi aturan gabung karhutla pada Bab 5 (P-01 sampai P-04).

Tabel C.3. Aturan delineasi kebakaran pada tiga basis data

| Metode | Dasar data | Aturan ruang | Aturan waktu | Keterangan | Sumber (URL) |
| --- | --- | --- | --- | --- | --- |
| GlobFire (Artes dkk. 2019) | MODIS MCD64A1 Collection 6 | Area terbakar yang bersentuhan atau berpotongan dihubungkan dalam graf; area tak bersebelahan dapat digabung (misalnya api loncat) | Pisah bila selisih lebih dari 5 hari; tidak aktif bila 16 hari tanpa tambahan area, lalu diarsipkan | Ambang dapat diubah menurut lokasi bila otoritas lokal punya ambang sendiri; datanya dipakai GDACS | https://www.nature.com/articles/s41597-019-0312-2 |
| FIRED (Balch dkk. 2020) | MODIS MCD64, Amerika Serikat kontigu, 2001 sampai Mei 2019, 51.871 kejadian | Jendela bergerak: 5 piksel; ID yang berada dalam satu topeng digabung ke ID pertama | 11 hari | Dioptimalkan dari 225 kombinasi (1 sampai 15 hari, 1 sampai 15 piksel) terhadap perimeter MTBS; R kuadrat 0,92; kebakaran Rim 2013 (lebih dari 100.000 ha) tetap satu kejadian | https://ecoevorxiv.org/repository/object/4332/download/8685 (pra-cetak); versi terbit https://www.mdpi.com/2072-4292/12/21/3498 tidak dapat dibuka (403) |
| Global Fire Atlas (Andela dkk. 2019) | MODIS MCD64A1 Collection 6 harian, 500 m, mulai 2003 | Piksel terbakar bersebelahan (8 arah); dua api aktif yang bertemu digabung, piksel hari penggabungan dibagi menurut jarak ke perimeter hari sebelumnya | Ambang persistensi 4 hari untuk sel yang terbakar lebih dari tiga kali pada 2003 sampai 2016; 6, 8, atau 10 hari untuk sel yang terbakar tiga, dua, atau sekali | Kebakaran Rim 2013 terpecah menjadi 14 kejadian; gugus tepi 1 sampai 4 sel dipindah ke api tetangga bila api itu sedikitnya 10 kali lebih besar; angka 5 hari milik GlobFire, bukan Global Fire Atlas | https://essd.copernicus.org/articles/11/529/2019/ |

Sumber: `riset/PUSTAKA.md`, butir 8. Hubungan antara area terbakar MODIS dan hotspot aktif (VIIRS, MODIS) tidak diuji di sumber ini.

## C.4 Daftar periksa lampiran ini

Butir [BELUM TERVERIFIKASI] di Lampiran C, sama dengan rangkuman `riset/PUSTAKA.md`.

1. Aturan dua sumber untuk entri EM-DAT; tahun perumusan tiga kriteria masuk EM-DAT.
2. Istilah "datacard" sebagai unit pencatatan DesInventar.
3. Ambang ekstensif dan intensif pada GAR 2011 dan 2013 (hanya GAR 2015 yang dibuka).
4. Aturan GLIDE untuk kejadian lintas negara dan berantai.
5. Naskah IRDR 2014 (peril, associated hazards); jumlah 302 bahaya pada HIPs 2020 (edisi 2025 dengan 281 bahaya, terverifikasi lewat EM-DAT).
6. PAGER: dasar persentase PDB dan aturan skala tertinggi menentukan warna.
7. Ambang masuk NatCatSERVICE dan Sigma terkini; isi lengkap Gall dkk. 2009, Wirtz dkk. 2014, dan Guha-Sapir dan Below.
8. Kriteria asli NDCC MC 4 s.1998 dan teks resmi Filipina terkini; klaim 15 persen dan MC 4 s.2012.
9. Pernyataan India tentang tidak adanya deklarasi bencana nasional (jawaban Lok Sabha 2024).
10. Jepang: Lampiran 3 dan 4 selengkapnya, status penetapan bencana parah (*gekijin saigai*), rincian hibah dukungan korban.
11. Australia DRFA: seluruh angka (AUD 240.000) dan definisi bencana yang memenuhi syarat.
12. Kelas ukuran kebakaran NWCG A sampai G; periode ulang banjir; sisi basah SPI; skala MMI.
13. Nilai FEMA USD 2,01 dan USD 5,03 berasal dari dokumen public inspection; nilai USD 4,86 (county, tahun anggaran 2026) dan USD 189 (44 CFR 206.47) hanya dari ringkasan pencarian dan tidak dipakai.
14. Versi terbit FIRED (MDPI) diverifikasi lewat pra-cetak.
