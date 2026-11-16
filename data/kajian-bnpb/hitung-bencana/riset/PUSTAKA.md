# PUSTAKA: cara bencana dihitung, ambang masuk pencatatan, dan delineasi kejadian

Disusun 12 November 2026 untuk kajian "hitung bencana" (apa itu satu kejadian, ambang masuk, skala keparahan, penyajian).
Aturan berkas ini: tiap klaim punya URL yang benar-benar dibuka saat riset. Yang hanya muncul di ringkasan mesin pencari, atau situsnya menolak dibuka (HTTP 403 atau tidak terjangkau), ditandai [BELUM TERVERIFIKASI] dan dikumpulkan di bagian akhir. Kutipan angka diambil dari teks sumber; terjemahan dan ringkasan ditulis ulang oleh peneliti.

Catatan metode: sebagian halaman dibuka lewat unduhan langsung dan ekstraksi teks (PDF, XML e-Gov), bukan lewat peramban. Itu tidak mengubah isi, tetapi nomor halaman PDF tidak dicatat.

## Tabel ringkas

| # | Sumber | Ambang atau aturan inti | URL |
| --- | --- | --- | --- |
| 1 | EM-DAT (CRED) | Masuk bila salah satu: 10 meninggal (termasuk hilang), 100 terdampak (terdampak, luka, tunawisma), seruan bantuan internasional atau deklarasi darurat. Tiap negara satu entri, satu DisNo | https://doc.emdat.be/docs/protocols/entry-criteria/ |
| 2 | DesInventar | Tanpa ambang; hanya kejadian yang menimbulkan dampak; resolusi sekecil unit geografis terendah (setara kabupaten/kota ke bawah) | https://desinventar.cimafoundation.org/methodology.html |
| 3 | UNDRR GAR 2015 Box 4.1 | Ekstensif bila meninggal kurang dari 30 DAN rumah hancur kurang dari 600; intensif bila 30 atau lebih meninggal ATAU 600 atau lebih rumah hancur | https://preventionweb.net/english/hyogo/gar/2015/en/home/GAR_2015/GAR_2015_93.html |
| 4 | Sendai (A/71/644, Technical Guidance) | Indikator A-1 sampai D-8; terdampak langsung dan tidak langsung; ganda hitung pada B-2 sampai B-5 diakui tak terhindarkan | https://digitallibrary.un.org/record/852089/files/A_71_644-EN.pdf |
| 5 | GLIDE | Dua huruf jenis, tahun, enam digit urut, tiga huruf ISO negara | https://www.glidenumber.net/glide/public/about.jsp |
| 6 | USGS PAGER | Hijau 0 meninggal dan di bawah USD 1 juta; kuning 1-99 dan USD 1-100 juta; oranye 100-999 dan USD 100 juta-1 miliar; merah 1.000 atau lebih dan USD 1 miliar atau lebih | https://earthquake.usgs.gov/data/pager/background.php |
| 7 | GDACS | Banjir: merah lebih dari 1.000 meninggal atau 800.000 mengungsi; oranye lebih dari 100 atau 80.000. Karhutla: masuk bila 5.000 ha atau lebih | https://www.gdacs.org/Knowledge/models_fl.aspx , https://www.gdacs.org/Knowledge/models_wf.aspx |
| 8 | Delineasi kebakaran | GlobFire: 5 hari (pisah) dan 16 hari (tidak aktif). FIRED: 5 piksel dan 11 hari. Global Fire Atlas: ambang persistensi 4, 6, 8, 10 hari | https://www.nature.com/articles/s41597-019-0312-2 |
| 9 | FEMA 44 CFR 206.48 | Indikator USD 1 per kapita (disesuaikan IHK); mulai 1 Okt 2026: USD 2,01 negara bagian, USD 5,03 county; minimum USD 1 juta | https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-44?part=206&section=206.48 |
| 10 | Jepang, Perintah Pelaksana UU Bantuan Bencana, Pasal 1 | Rumah hilang: 30 KK (kota kurang dari 5.000 jiwa) sampai 150 KK (300.000 jiwa atau lebih); setengah rusak dihitung 2, terendam lantai 3 | https://laws.e-gov.go.jp/api/1/lawdata/322CO0000000225 |
| 11 | Filipina, kriteria state of calamity (NDCC, 1998) | Dua atau lebih dari enam kondisi, antara lain 20 persen penduduk terdampak atau 20 persen rumah hancur, 40 persen sumber penghidupan rusak | https://www.locjkt.or.id/application/docliblcjkt/upload/Philippine%20Disaster%20Management.pdf |
| 12 | India, "calamity of severe nature" | Tanpa kriteria tetap; ditetapkan kasus per kasus oleh pemerintah pusat | https://ies.gov.in/arthapedia/concept/calamity-severe-nature |
| 13 | PDNA 2013 dan DaLA | Damage = nilai kerusakan aset; loss = perubahan aliran ekonomi; agregasi tanpa hitung ganda | https://fpi.ec.europa.eu/system/files/2021-05/pdna_vol._a_en.pdf |

---

## 1. EM-DAT / CRED

**Kriteria masuk.** Halaman protokol "Entry Criteria" menyebut tiga syarat, cukup satu terpenuhi:
- "At least 10 deaths (including dead and missing)."
- "At least 100 affected (people affected, injured, or homeless)."
- "A call for international assistance or an emergency declaration."

Ada kriteria sekunder, terutama untuk kejadian lampau tanpa data kuantitatif, misalnya "the worst disaster in a country or region" dan "an event that resulted in considerable damage". URL: https://doc.emdat.be/docs/protocols/entry-criteria/ (dibuka).

Ringkasan pencarian menyebut kejadian menjadi publik bila kriteria terpenuhi dan dikonfirmasi minimal dua sumber (dari halaman cetak protokol). Halaman entry-criteria yang dibuka tidak memuat aturan dua sumber, jadi aturan itu [BELUM TERVERIFIKASI].

**Definisi "affected".** Halaman variabel dampak manusia (https://doc.emdat.be/docs/data-structure-and-content/impact-variables/human/, dibuka):
- Total Deaths: korban tewas terkonfirmasi ditambah orang hilang yang dianggap tewas berdasarkan angka resmi.
- No. Injured: diisi bila sumber memakai kata "injured"; kata terkait seperti "hospitalized" dianggap luka.
- No. Affected: bila hanya keluarga atau rumah yang dilaporkan, angka dikali ukuran keluarga rata-rata: 5 untuk negara berkembang, 3 untuk negara industri. Rentang memakai rata-rata.
- No. Homeless: aturan konversi sama.
- Total Affected: jumlah luka, terdampak, dan tunawisma ("the total of injured, affected, and homeless people").
- Aturan hitung ganda eksplisit: tidak ada. Halaman hanya menyatakan CRED memeriksa pembagian antarkategori, dan bahwa "The definition of 'affected persons' varies across sources and lacks a universal standard."

**Struktur tabel publik** (https://doc.emdat.be/docs/data-structure-and-content/emdat-public-table/, dibuka):
- DisNo: pengenal 8 digit, tahun (4 digit) dan urutan (4 digit), contoh 2004-0659; di tabel publik kode negara ISO ditambahkan.
- Kejadian lintas negara: "If multiple countries are affected, each will have an entry linked to the same DisNo." Jadi unit entri adalah negara, kejadian diikat DisNo.
- Tanggal: Start Year, End Year; hari dan bulan mulai terdefinisi baik untuk kejadian mendadak; hari dan bulan akhir boleh kosong untuk kejadian bertahap tanpa akhir pasti.
- Associated Types: "List of secondary disaster types cascading from or co-occurring with the main type, e.g., a landslide following a flood".
- Total Deaths: "Total fatalities (deceased and missing combined...)".

**Rantai bencana / associated types** (https://doc.emdat.be/docs/data-structure-and-content/disaster-classification-system/, dibuka):
- Associated disasters adalah "subsequent or co-occurring hazards that may have contributed to the disaster impact", dicatat di kolom Associated Types di luar pohon hierarki utama.
- Sekitar 15 persen entri punya satu tipe asosiasi dan sekitar 3,5 persen punya dua atau lebih. Pasangan tersering: banjir dengan longsor, badai dengan banjir, badai dengan longsor.
- Pohon klasifikasi diperbarui September 2023: empat tingkat (group, subgroup, type, subtype), menggantikan tiga tingkat ditambah dua opsional; grup "Complex" dihapus (14 entri). Untuk memetakan jenis lama ke baru, gabungkan lewat kolom DisNo.
- Dalam pohon, tsunami adalah subtipe dari gempa bumi (kode nat-geo-ear-tsu, 56 entri; gerakan tanah nat-geo-ear-gro, 1.563 entri). Kebakaran: forest fire, land fire, wildfire (umum). Artinya satu kejadian gempa yang memicu tsunami dicatat satu entri dengan subtipe, bukan dua kejadian.
- Sejarah: sistem klasifikasi awal 20 jenis; 1992 hierarki alam/teknologi; 2014 IRDR Peril Classification menjadi rujukan utama; HIPs 2021, edisi 2025 memuat 281 bahaya dalam delapan tipe; CRED menyiapkan peta jalan agar interoperabel dengan HIPs.

**Tahun asal kriteria.** EM-DAT didirikan 1988 oleh UCLouvain (Jones, Guha-Sapir, Tubeuf 2022, https://www.nature.com/articles/s41597-022-01667-x, dibuka). Dokumentasi bias menyebut: OFDA mulai mengompilasi data bencana 1973, CRED dibentuk, dan 1988 CRED mengambil alih basis data dan membuat EM-DAT (https://doc.emdat.be/docs/known-issues-and-limitations/specific-biases/, dibuka). Tahun pasti perumusan tiga kriteria masuk: [BELUM TERVERIFIKASI].

**Perubahan 2023.** Terverifikasi: pembaruan pohon klasifikasi September 2023 (di atas) dan, mulai September 2023, data sebelum tahun 2000 disebut "Historic data" di tabel publik, dengan rekomendasi kuat tidak memakai data sebelum 2000 untuk analisis tren (halaman specific-biases). Perubahan ambang pada 2023: tidak ditemukan; halaman entry-criteria tidak memuat catatan perubahan. Halaman tabel publik tidak menyebut perubahan 2023.

**Relevansi paradoks.** (a) Satu kejadian lintas negara menjadi beberapa entri; ambang dinilai per entri negara, bukan per peristiwa fisik. (b) Rantai (banjir lalu longsor) dicatat sebagai satu kejadian utama dengan tipe asosiasi, sehingga tidak dihitung ganda sebagai dua bencana. (c) Gempa lalu tsunami: satu entri, subtipe tsunami. (d) Ambang 10/100 menimbulkan bias ambang; dokumentasi mencatat kematian kumulatif dari kejadian bermortalitas rendah melebihi kumulatif kejadian bermortalitas tinggi (periode 2000-2024).

## 2. DesInventar dan Sendai

**Tanpa ambang.** Panduan Metodologi DesInventar (versi 8.1.9, https://preparecenter.org/wp-content/uploads/2021/04/DesInventar_MethodologicalGuide_8.1.9.pdf, dibuka dan diekstrak):
- Metode ini "deals with disasters of all magnitudes", mencakup efek sporadis pada komunitas rentan di skala lokal, bukan hanya dampak tinggi di tingkat wilayah atau negara.
- Yang masuk hanya kejadian yang menimbulkan sedikit dampak: hujan normal tanpa efek, gempa kecil, atau banjir di wilayah tak berpenghuni tidak dimasukkan ("Only events which have generated some kind of affect are included").
- Definisi kejadian: fenomena alam, sosio-alam, atau teknologi yang menjadi pemicu dampak buruk pada jiwa, kesehatan, dan infrastruktur. Daftar kejadian baku tidak boleh digandakan.
- "In DesInventar, an event is different from a disaster. An event may trigger multiple disasters as well as affecting different geographical units." Angka registrasi berbeda dari statistik definisi bencana tradisional, tetapi hanya dalam jumlah registrasi, bukan dalam efek dan kerusakan.
- Rantai: pemicu lokal dapat dipicu kejadian lain berskala lebih luas (epidemi akibat banjir, longsor akibat badai). Perangkat saat ini "still unable to facilitate the grouping of these multiple disasters".
- Resolusi: tradisionalnya bencana dicatat dengan total kerugian yang melibatkan satu atau lebih unit administratif berukuran beragam; DesInventar memilih resolusi seragam (zonasi bertingkat, tingkat terendah menjadi resolusi inventori).
- Halaman metodologi daring (https://desinventar.cimafoundation.org/methodology.html, dibuka): data harus terdisagregasi spasial; untuk inventori nasional disarankan minimal setara municipality (kabupaten/kota); tidak ada ambang minimum ukuran atau keparahan; yang dianjurkan justru pengumpulan data bencana kecil dan menengah.
- Istilah "datacard" sebagai unit pencatatan per unit administratif: [BELUM TERVERIFIKASI] (hanya muncul dalam daftar isi manual UNDRR yang tidak terjangkau). Panduan metodologi yang dibuka tidak memakai istilah itu.

**Risiko ekstensif lawan intensif, GAR 2015 Box 4.1** (dibuka): "The variables used to define the threshold between intensive and extensive disaster losses are mortality and housing destruction. Statistically, the threshold is fixed at: Mortality: less than 30 people killed (extensive); 30 or more killed (intensive); or Housing destruction: less than 600 houses destroyed (extensive); 600 or more houses destroyed (intensive). This threshold has proved robust even as the universe of national disaster databases continues to grow." Contoh kasus dalam kotak itu adalah basis data kerugian nasional Indonesia 1990-2013 (Gambar 4.1), jadi langsung relevan untuk BNPB. Kata penghubung pada teks di atas "or": pembacaan harfiah adalah intensif bila salah satu terpenuhi. Angka ambang pada GAR 2011 dan 2013: tidak terbuka (peladen menolak); [BELUM TERVERIFIKASI]. Ringkasan pencarian GAR 2011 menyebut dua metode statistik untuk ambang, tanpa angka; [BELUM TERVERIFIKASI].

## 3. Kerangka Sendai

Sumber: laporan OIEWG A/71/644 (https://digitallibrary.un.org/record/852089/files/A_71_644-EN.pdf, dibuka) dan Technical Guidance UNDRR (https://globalplatform.undrr.org/2022/sites/default/files/2022-02/Technical%20Guidance%20for%20Monitoring%20and%20Reporting%20on%20Progress%20in%20Achieving%20the%20Global%20Targets%20of%20the%20Sendai%20Framework%20for%20Disaster%20Risk%20Reduction.pdf, dibuka).

Indikator (A/71/644):
- Target A: A-1 (gabungan) meninggal dan hilang per 100.000 penduduk; A-2 meninggal; A-3 hilang.
- Target B: B-1 (gabungan) terdampak langsung per 100.000; B-2 luka atau sakit; B-3 orang dengan rumah rusak; B-4 orang dengan rumah hancur; B-5 orang dengan mata pencaharian terganggu atau hancur.
- Target C: C-1 (gabungan) kerugian ekonomi langsung terhadap PDB; C-2 pertanian; C-3 aset produktif lain; C-4 perumahan; C-5 infrastruktur kritis; C-6 warisan budaya.
- Target D: D-1 (gabungan) kerusakan infrastruktur kritis; D-2 fasilitas kesehatan; D-3 fasilitas pendidikan; D-4 infrastruktur kritis lain; D-5 sampai D-8 gangguan layanan dasar.
- Cakupan "bencana": skala kecil dan besar, sering dan jarang, mendadak dan lambat, akibat bahaya alam maupun buatan manusia.

Definisi (A/71/644, bagian V):
- Affected: "People who are affected, either directly or indirectly, by a hazardous event." Terdampak langsung: mengalami luka, sakit, atau efek kesehatan lain; dievakuasi, mengungsi, direlokasi; atau mengalami kerusakan langsung pada penghidupan dan aset. Terdampak tidak langsung: mengalami konsekuensi lanjutan akibat gangguan ekonomi, infrastruktur kritis, layanan dasar, perdagangan atau pekerjaan, atau konsekuensi sosial, kesehatan, psikologis. Anotasi: orang hilang atau meninggal dapat dianggap terdampak langsung.
- Hazardous event: "The manifestation of a hazard in a particular place during a particular period of time."
- Disaster: gangguan serius terhadap fungsi komunitas atau masyarakat pada skala apa pun akibat kejadian berbahaya yang berinteraksi dengan keterpaparan, kerentanan, dan kapasitas, yang menghasilkan satu atau lebih kerugian manusia, material, ekonomi, atau lingkungan. Jadi "hazard event" (fenomena) dibedakan dari "disaster" (dampak).
- Laporan menyatakan negara boleh memakai metodologi nasional dan dianjurkan menjaga metadata konsisten bila metodologi berubah.

Aturan hitung ganda (Technical Guidance):
- Meninggal dan hilang saling lepas: "no-one should be double counted".
- B-2 sampai B-5: "double counting of affected people is unavoidable (for example, injured and living in a destroyed or damaged house)"; jumlah indikator mungkin lebih besar dari jumlah orang sebenarnya, tetapi dipandang proksi yang sah untuk mengukur kemajuan; hitung ganda dapat sebagian mengimbangi orang terdampak tidak langsung yang tidak tertangkap.
- Kriteria harus tetap sepanjang rentang pengumpulan data 2005-2030; perubahan kriteria menimbulkan bias dan galat ukur.
- Tenggat atribusi kesehatan: untuk kekeringan potong tahunan dan 6 bulan setelah keadaan darurat berakhir; gelombang panas 4 minggu setelah kejadian (tabel rekomendasi). Ini aturan batas waktu yang relevan bagi "kapan satu kejadian selesai".
- Tugas data per kejadian: indikator dilaporkan sebagai agregat tahunan per negara; unit kejadian tunggal tidak diwajibkan. [Simpulan peneliti dari struktur indikator, bukan kutipan.]

## 4. Nomor GLIDE

Halaman resmi (https://www.glidenumber.net/glide/public/about.jsp, dibuka): "two letters to identify the disaster type (e.g. EQ - earthquake); the year of the disaster; a six-digit, sequential disaster number; and the three-letter ISO code for country of occurrence." Contoh: EQ-2001-000033-IND. Nomor diproduksi sejak awal 2004 untuk semua kejadian baru yang dilaporkan lembaga mitra atau ditemukan ADRC. Inisiatif diusulkan ADRC, bersama OCHA/ReliefWeb, UNDRR, UNDP, WMO, IFRC, FAO, Bank Dunia, Komisi Eropa, dan CRED.

Aturan untuk kejadian lintas negara dan berantai: halaman ini tidak menyatakannya. Konsekuensi struktural: kode negara tiga huruf ada di dalam nomor, sehingga kejadian lintas negara cenderung mendapat satu nomor per negara. Itu inferensi, bukan kutipan. Aturan eksplisit rantai: [BELUM TERVERIFIKASI].

## 5. IRDR Peril Classification dan HIPs

Naskah asli (Peril Classification and Hazard Glossary, IRDR DATA Publication No. 1, 2014) tidak dapat dibuka: council.science menolak (HTTP 403), tautan irdrinternational dan preventionweb tidak terjangkau. Yang terverifikasi hanya lewat dokumen turunan:
- Makalah UNSD untuk Expert Group (https://unstats.un.org/unsd/classifications/ExpertGroup/egm2017/ac340-Bk4.PDF, dibuka): tingkat agregat "family" dipakai untuk kompilasi uji lintas negara; tingkat "main event" lebih rinci (banjir, siklon) dan terminologinya beragam antarnegara, sehingga banyak negara menyusun klasifikasi sendiri yang menyerupai main event.
- Pada makalah yang sama, butir 4: pembedaan bahaya tunggal lawan bahaya berantai ("cascading multiple hazards") dibahas untuk menghindari hitung ganda bencana. "National agencies report cascading multiple-hazards as single occurrences, usually classified according to the initial trigger event (e.g. the cyclone). In some cases, (e.g. in Indonesia) special classes of multi-hazard events (e.g. earthquake-tsunami) are incorporated into the national classification." Pelaporan pada tingkat family umumnya menghilangkan masalah ini karena sebagian besar kaskade berada dalam family yang sama.
- EM-DAT menyatakan IRDR 2014 sebagai rujukan utama klasifikasi bahaya alam dan membaginya menjadi enam grup: Geophysical, Hydrological, Meteorological, Climatological, Biological, Extra-terrestrial (halaman disaster-classification-system, dibuka).
- HIPs UNDRR-ISC: EM-DAT menyatakan edisi 2025 memuat 281 bahaya dalam delapan tipe, rilis 2021 (halaman yang sama). Angka 302 bahaya, 8 grup, 48 klaster untuk laporan 2020 hanya dari ringkasan pencarian: [BELUM TERVERIFIKASI].
- Hierarki "family, main event, peril" dan definisi "associated hazards" di naskah IRDR: hierarki family dan main event terkonfirmasi lewat UNSD; "peril" dan "associated hazards" [BELUM TERVERIFIKASI].

## 6. USGS PAGER

Halaman latar PAGER (https://earthquake.usgs.gov/data/pager/background.php, dibuka):
- Merah: 1.000 atau lebih perkiraan korban jiwa; kerugian USD 1 miliar atau lebih.
- Oranye: 100 sampai 999 korban; USD 100 juta sampai 1 miliar.
- Kuning: 1 sampai 99 korban; USD 1 juta sampai 100 juta.
- Hijau: 0 korban; di bawah USD 1 juta.
- Respons yang disarankan: tak perlu (hijau), lokal/regional (kuning), nasional (oranye), internasional (merah).
- Peringatan dahulu dikirim hanya berdasarkan magnitudo dan lokasi, kini juga berdasarkan perkiraan korban dan kerugian. Magnitudo yang sama menghasilkan dampak amat berbeda menurut kondisi lokal; di tempat dengan banyak korban, dampak itulah yang memicu respons internasional, sedangkan di tempat bangunan lebih tahan gempa, kerugian finansial dan sosial yang memicu respons.
- Pemakaian "% PDB" sebagai dasar: tidak ada di halaman yang dibuka; [BELUM TERVERIFIKASI].
- Peringkat gabungan "yang lebih tinggi dari dua skala menentukan warna" berasal dari ringkasan pencarian; [BELUM TERVERIFIKASI] pada halaman ini.
- MMI: GDACS memakai MMI (lihat butir 7); definisi skala MMI itu sendiri tidak dibuka.

## 7. GDACS

Sumber: https://www.gdacs.org/Knowledge/overview.aspx , models_eq.aspx , models_fl.aspx , models_wf.aspx (semua dibuka).
- Prinsip: pemilihan dan level bahaya alam GDACS berbasis model dampak otomatis; potensi akibat dinilai dari populasi dalam area terdampak dan kerentanannya.
- Gempa: faktor yang dipakai: intensitas (shakemap USGS), magnitudo, kedalaman, sebaran penduduk dalam 100 km dari episentrum, kerentanan, dan kapasitas penanggulangan negara (indeks INFORM). Model shakemap dipakai bila ada (biasanya Mw di atas 5,5); bila tidak, model parameter gempa. Jika intensitas maksimum di tempat berpenduduk tidak lebih dari MMI VI, level hijau dan skor 0. Skor mentah = -0,59 + 0,53 x log10(Scaled Population), dengan Scaled Population = 10 x Pop(MMI IX) + Pop(MMI VIII) + 0,1 x Pop(MMI VII); dikoreksi dengan kerentanan negara (rentang -1 sampai +1) dan dikalibrasi memakai korban sejak 2006 (DG ECHO, EM-DAT). Skor di bawah 1 kira-kira berarti korban kurang dari 10. Level GDACS mencoba memilah gempa menurut kemungkinan masyarakat tak lagi mampu menanggulangi di tingkat nasional.
- Banjir: sumber utama lembaga berwenang, media, organisasi ilmiah, bukan otomasi. Merah bila lebih dari 1.000 meninggal atau 800.000 mengungsi; oranye bila lebih dari 100 meninggal atau 80.000 mengungsi; hijau untuk lainnya. Parameter keparahan dari Global Flood Detection System tidak memengaruhi level.
- Karhutla: peristiwa diidentifikasi otomatis oleh GWIS (JRC). Filter pertama: luas terbakar minimal 5.000 ha; kebakaran lebih kecil dimasukkan manual atas penilaian pakar bila berpotensi berdampak kemanusiaan. Filter kedua untuk beranda: lebih dari 10.000 ha dan penduduk dalam 5 km lebih dari 10.000. Kebakaran kota dan kecelakaan industri tidak termasuk. Level: merah (dampak berat, ratusan atau ribuan mengungsi, sering puluhan meninggal, atau aktivasi UCPM dengan kapasitas penanganan rendah); oranye (dampak langsung pada orang dan area terbangun, mungkin ada korban jiwa); hijau (5.000 ha atau lebih otomatis, walau tanpa dampak). Skor numerik hanya tiga nilai: 0,5, 1,5, 2,5. Luas terbakar dihitung dari produk Near-Real-Time GWIS berbasis anomali termal MODIS (piksel 1 km) dan VIIRS (375 m) dari NASA FIRMS; indikator "mendefinisikan perimeter kebakaran individual".
- Relevansi paradoks: ambang GDACS adalah pada tingkat perimeter kebakaran hasil delineasi, jadi dua api yang menyatu atau satu api yang terpecah mengubah apakah luas melewati 5.000 ha.

## 8. Delineasi kebakaran (dasar paradoks api menyatu dan terpecah)

**GlobFire (Artes dkk. 2019, Scientific Data)**, https://www.nature.com/articles/s41597-019-0312-2 (dibuka lewat unduhan):
- Basis: produk area terbakar MODIS MCD64A1 Collection 6. Algoritma menyandikan hubungan ruang-waktu antar tambalan area terbakar dalam struktur graf; memungkinkan kebakaran dengan beberapa titik nyala dan menggabungkannya walau area terbakar tidak bersebelahan secara spasial, misalnya api loncat (spotting).
- Aturan: "a fire event is considered as a set of burnt areas that are connected by touching or intersecting. Touching burnt areas are considered as different fires if there is a time distance between them of more than 5 days. Finally, the fire is flagged as not active if no burnt areas have been added to it for 16 days and it is archived."
- Ambang 5 dan 16 hari dapat diubah menurut lokasi bila otoritas lokal punya ambang sendiri.
- Data GWIS/GlobFire digunakan oleh GDACS (butir 7); tautan GDACS ke GWIS tertera di halaman wildfire GDACS.

**FIRED (Balch dkk. 2020, Remote Sensing 12(21):3498)**: naskah pra-cetak dibuka di https://ecoevorxiv.org/repository/object/4332/download/8685 (berkas Word); versi terbit di https://www.mdpi.com/2072-4292/12/21/3498 menolak akses (403), sehingga angka berasal dari pra-cetak dan cocok dengan ringkasan pencarian atas versi terbit.
- Data: MODIS MCD64 area terbakar, AS kontigu, Januari 2001 sampai Mei 2019, N = 51.871 kejadian.
- Aturan: jendela bergerak tiga dimensi; variabel spasial (jumlah piksel) dan temporal (jumlah hari) untuk mengelompokkan deteksi terbakar. Bila beberapa ID kejadian berada dalam satu topeng, dua perimeter dianggap telah tumbuh bersama dan digabung ke ID pertama; kejadian di tepi petak (tile) yang bertumpang tindih digabung.
- Optimasi: semua kombinasi 1-15 hari dan 1-15 piksel (225 kombinasi) diuji terhadap perimeter MTBS; hasil optimal "an 11-day window and a 5-pixel distance". Validasi hubungan luas FIRED lawan MTBS: R kuadrat = 0,92. Ambang MTBS yang dipakai sebagai pembanding: kebakaran 404 ha di barat dan 202 ha di timur 97 derajat bujur barat.
- Temuan penting: ambang optimal jauh lebih besar daripada kebanyakan studi sebelumnya sehingga mengurangi pemecahan semu. Kebakaran Rim 2013 (lebih dari 100.000 ha, lebih dari satu bulan) dipecah menjadi 14 kejadian oleh Global Fire Atlas, tetapi satu kejadian oleh FIRED, sesuai MTBS (naskah, Gambar 4). Naskah juga mencatat bahwa beberapa tambalan api dapat menyala bebas berdekatan lalu menyatu menjadi satu kompleks kebakaran (fire complex) dan bahwa penentuan perimeter dengan delineasi lapangan sendiri punya kesulitan.

**Global Fire Atlas (Andela dkk. 2019, ESSD 11:529)**, https://essd.copernicus.org/articles/11/529/2019/ (dibuka):
- Basis: MCD64A1 Collection 6 harian, 500 m, mulai 2003; kebakaran terdeteksi terkecil satu piksel MODIS (sekitar 21 ha).
- Piksel terbakar bersebelahan dikelompokkan dalam tiap musim api (12 bulan berpusat pada bulan area terbakar maksimum) dan tiap tile 10 x 10 derajat. Titik nyala kandidat adalah minimum lokal tanggal terbakar.
- Ambang persistensi: "a 4 d fire persistence threshold" untuk sel 500 m yang terbakar lebih dari tiga kali pada 2003-2016; sel yang terbakar tiga, dua, atau sekali memakai 6, 8, atau 10 hari.
- Penyebaran harian: api tumbuh ke piksel tetangga yang selisih tanggal terbakarnya tidak melebihi ambang piksel asal; kecepatan = panjang lintasan per hari; arah satu dari delapan.
- Penggabungan: bila dua api aktif bertemu, piksel pada hari penggabungan dibagi menurut jarak ke perimeter hari sebelumnya; api bersebelahan dengan selisih waktu di atas ambang tetap terpisah. Filter titik pemadaman: gugus tepi satu sampai empat sel (0,21-0,9 km kuadrat) dipindah ke api tetangga bila api itu sekurang-kurangnya 10 kali lebih besar dan selisih tanggal melebihi ambang.
- Catatan: tidak ada ambang "5 hari" di Global Fire Atlas; angka 5 hari milik GlobFire.

Tabel perbandingan ambang delineasi:

| Metode | Spasial | Temporal | Catatan |
| --- | --- | --- | --- |
| GlobFire | menyentuh atau bersinggungan, graf | pisah bila selisih lebih dari 5 hari; nonaktif setelah 16 hari tanpa tambahan | boleh gabung tak bersebelahan |
| FIRED | 5 piksel | 11 hari | dioptimalkan lawan MTBS, AS |
| Global Fire Atlas | piksel bersebelahan (8 arah) | 4, 6, 8, 10 hari menurut frekuensi bakar sel | kebakaran Rim terpecah 14 |

Saran bagi kajian: tiga metode mengembalikan jumlah kejadian berbeda untuk api yang sama; "satu kebakaran" adalah konstruksi analitik, bukan fakta alam. MCD64 hanya mendeteksi area terbakar sehari ke belakang; hubungannya dengan titik panas aktif (VIIRS, MODIS) tidak diuji di sini.

## 9. Bias pencatatan dan definisi

- Gall, Borden, Cutter 2009, "When Do Losses Count? Six Fallacies of Natural Hazards Loss Data", BAMS 90(6):799-810, https://journals.ametsoc.org/view/journals/bams/90/6/2008bams2721_1.xml (abstrak dibuka). Empat basis data diperiksa (EM-DAT, NATHAN, SHELDUS, Storm Events NWS); enam bias: hazard, temporal, threshold, accounting, geographic, systemic. Teks lengkap tidak dibuka, jadi rincian tiap bias dalam artikel itu [BELUM TERVERIFIKASI]; tetapi dokumentasi EM-DAT (https://doc.emdat.be/docs/known-issues-and-limitations/specific-biases/, dibuka) menguraikan keenam bias itu dengan merujuk Gall dkk.:
  - Time bias: kenaikan pencatatan sejak 1960-an bertepatan dengan berdirinya OFDA (kompilasi data 1973), CRED, dan 1988 EM-DAT, serta kemajuan komunikasi; rekomendasi tegas mengeluarkan data sebelum 2000 dari analisis tren.
  - Hazard-related: biologis (epidemi) dan suhu ekstrem kurang tercakup.
  - Threshold: ambang masuk EM-DAT menimbulkan bias ambang; kematian kumulatif kejadian bermortalitas rendah melebihi kumulatif kejadian bermortalitas tinggi (2000-2024).
  - Accounting: kerugian ekonomi lebih jarang dilaporkan daripada dampak manusia; kerugian terasuransi lebih sering dilaporkan; kematian kekeringan terlewat karena dianggap dampak tak langsung; kematian tak langsung kadang melebihi langsung.
  - Geographic: cakupan lebih buruk untuk Afrika sub-Sahara; 32 persen dari 275 gelombang panas 2000-2024 terjadi di tujuh negara.
- Jones, Guha-Sapir, Tubeuf 2022, "Human and economic impacts of natural disasters: can we trust the global data?", Scientific Data 9:572, https://www.nature.com/articles/s41597-022-01667-x (dibuka). Fokus data hilang (missingness) pada EM-DAT 1990-2020: proporsi data hilang besar, terutama kerugian ekonomi; tahun kejadian, klasifikasi pendapatan negara, dan jenis bencana memprediksi kehilangan data; data tidak hilang acak. Makalah menyebut enam basis data global: EM-DAT, NatCatSERVICE, Sigma, GLIDE, GFDRR, BD CATNAT Global. Catatan: ini kajian data hilang, bukan kajian bias pelaporan dalam arti sempit; klaim "1,3 persen kejadian tanpa taksiran kematian" berasal dari artikel media dan [BELUM TERVERIFIKASI].
- Kron, Steuer, Low, Wirtz 2012, NHESS 12:535-550, https://nhess.copernicus.org/articles/12/535/2012/nhess-12-535-2012.html (abstrak dibuka): NatCatSERVICE Munich Re berisi lebih dari 30.000 rekaman; kesulitan: tidak diketahuinya besar kerugian pasti, pelaporan bias oleh kelompok kepentingan, perubahan temuan dari waktu ke waktu, kerugian yang tak dapat dipisah per sebab (angin dan banjir dalam satu badai); perbandingan antarkejadian hanya dengan data ternormalisasi (inflasi, pertumbuhan penduduk dan nilai).
- Wirtz, Kron, Low, Steuer 2014, "The need for data: natural disasters and the challenges of database management", Natural Hazards 70:135-157: hanya catatan bibliografi dan abstrak dari mesin pencari; rincian [BELUM TERVERIFIKASI].
- Guha-Sapir dan Below (CRED working paper, "Quality and accuracy of disaster data: A comparative analyse of 3 global data sets"): hanya terlihat sebagai referensi dalam Jones dkk.; isi [BELUM TERVERIFIKASI].
- Ambang NatCatSERVICE: halaman Munich Re (https://www.munichre.com/en/solutions/for-industry-clients/natcatservice.html, dibuka) hanya menyebut basis data kerugian bencana alam sejak 1980 yang bersifat milik sendiri; ambang masuk tidak tertera. [BELUM TERVERIFIKASI].
- Ambang Swiss Re Sigma: halaman sigma 1/2024 (dibuka) tidak memuat tabel ambang. Ringkasan pencarian menyebut kriteria lama (20 meninggal atau hilang, 50 luka, 2.000 tunawisma, dan ambang kerugian terasuransi atau ekonomi yang disesuaikan inflasi tahunan). [BELUM TERVERIFIKASI] karena PDF terkait tidak dibuka.
- Tren semu: dokumentasi EM-DAT secara eksplisit menyatakan sulit menarik simpulan tentang pendorong sebenarnya (iklim, penduduk, manajemen risiko) dari tren, karena teknologi dan inisiatif pencatatan dominan (halaman specific-biases).

## 10. Negara pembanding

**Filipina.** Dasar hukum RA 10121: NDRRMC merekomendasikan deklarasi state of calamity berdasarkan kriteria yang ditetapkan NDRRMC (https://en.wikipedia.org/wiki/State_of_calamity_(Philippines), dibuka). Kriteria yang terverifikasi dari dokumen ADPC 2001, "The Philippine Disaster Management Story" (bagian 3.12.2, https://www.locjkt.or.id/application/docliblcjkt/upload/Philippine%20Disaster%20Management.pdf, dibuka): dua atau lebih kondisi harus ada dan berlangsung sedikitnya empat hari: (1) 20 persen penduduk terdampak dan memerlukan bantuan, atau 20 persen unit hunian hancur; (2) sedikitnya 40 persen sarana penghidupan (perahu, kendaraan) hancur; (3) jalan dan jembatan utama hancur dan tak dapat dilalui; (4) kerusakan luas tambak, tanaman, ternak, hasil pertanian; (5) gangguan jalur vital (listrik, air bersih, transportasi, komunikasi); (6) epidemi. FAQ pemerintah daerah (https://sanjosedebuenavista.blogspot.com/2012/08/faqs-state-of-calamity.html, dibuka; sumber sekunder) menyebut kriteria identik dengan enam kondisi dan menambahkan bahwa penilaian kerusakan diharapkan selesai dalam 24 jam; deklarasi oleh Presiden atas rekomendasi NDCC, atau oleh LGU lewat Sanggunian setempat atas rekomendasi DCC lokal, termasuk barangay. Koreksi terhadap rujukan di permintaan: angka "15 persen penduduk" dan "Memorandum Circular 4 s.2012" TIDAK terverifikasi. Ringkasan pencarian menunjukkan NDRRMC MC No. 04 s.2012 adalah panduan Incident Command System, bukan kriteria deklarasi; rujukan yang lebih tepat adalah NDCC Memorandum Circular/Order 4 s.1998 (teks aslinya tidak dibuka). Basis kriteria: relatif (persentase), dengan komponen kualitatif.

**Amerika Serikat.** 44 CFR 206.48 (https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-44?part=206&section=206.48, dibuka): untuk Public Assistance, FEMA menilai perkiraan biaya terhadap populasi negara bagian: "We use a figure of $1 per capita as an indicator that the disaster is of such size that it might warrant Federal assistance, and adjust this figure annually based on the Consumer Price Index for All Urban Consumers." Ambang minimum absolut USD 1 juta kerusakan Public Assistance per bencana. Angka berlaku (pemberitahuan Federal Register, dibuka): indikator per kapita tingkat negara bagian USD 2,01 untuk bencana dengan tanggal mulai insiden 1 Oktober 2026 atau sesudahnya (https://public-inspection.federalregister.gov/2026-22694.pdf) dan tingkat county USD 5,03 (https://public-inspection.federalregister.gov/2026-22691.pdf), berdasarkan kenaikan IHK 3,4 persen untuk 12 bulan sampai Agustus 2026. Catatan: kedua dokumen itu tahap public inspection (bukan edisi cetak final); nilai USD 4,86 (county, FY2026) dan USD 189 (indikator penyesuaian pembagian biaya, 44 CFR 206.47) berasal dari ringkasan pencarian dan [BELUM TERVERIFIKASI]. Halaman FEMA "how declared" menolak akses (403). Basis: kombinasi relatif (per kapita) dan absolut (minimum USD 1 juta); deklarasi tetap keputusan Presiden atas permintaan Gubernur.

**India.** Panduan SDRF/NDRF: "No specific criterion is given" untuk menyatakan bencana alam sebagai "calamity of severe nature"; pemerintah pusat menetapkannya berdasar intensitas dan besar kerugian jiwa, harta, infrastruktur, atau bila situasi tak terduga dan di luar kemampuan negara bagian, umumnya atas rekomendasi Inter Ministerial Central Team (IMCT). Kutipan Para 3.1 pedoman: bencana siklon, kekeringan, gempa, kebakaran, banjir, tsunami, hujan es, longsor, longsoran salju, cloud burst, dan serangan hama yang dianggap parah oleh Pemerintah India dan memerlukan belanja negara bagian melebihi saldo SDRF-nya memenuhi syarat bantuan NDRF (https://ies.gov.in/arthapedia/concept/calamity-severe-nature, dibuka). Pernyataan bahwa India tidak mengenal deklarasi "national disaster" secara formal dan jawaban Lok Sabha 2024: hanya dari ringkasan pencarian (PDF eparlib tidak terjangkau); [BELUM TERVERIFIKASI]. Basis: kebijakan diskresioner, bukan ambang numerik.

**Jepang.** Perintah Pelaksana UU Bantuan Bencana (Cabinet Order No. 225 Tahun 1947), Pasal 1 dan Lampiran 1 sampai 4 (teks Jepang resmi, API e-Gov, dibuka: https://laws.e-gov.go.jp/api/1/lawdata/322CO0000000225; diterjemahkan peneliti). Bencana yang menjadi sasaran UU adalah yang memenuhi salah satu dari:
1. Jumlah rumah hilang di wilayah kota/kabupaten setara atau melebihi angka Lampiran 1 menurut penduduk kota: kurang dari 5.000 jiwa, 30 KK; 5.000 sampai kurang dari 15.000, 40; 15.000 sampai kurang dari 30.000, 50; 30.000 sampai kurang dari 50.000, 60; 50.000 sampai kurang dari 100.000, 80; 100.000 sampai kurang dari 300.000, 100; 300.000 atau lebih, 150.
2. Di tingkat prefektur, rumah hilang melebihi angka Lampiran 2 menurut penduduk prefektur (kurang dari 1 juta jiwa: 1.000 KK; 1 juta sampai kurang dari 2 juta: 1.500; 2 juta sampai kurang dari 3 juta: 2.000; 3 juta atau lebih: 2.500), dan sekaligus kota bersangkutan mencapai angka Lampiran 3 (misalnya kurang dari 5.000 jiwa: 15 KK; 5.000 sampai kurang dari 15.000: 20 KK; baris selanjutnya tidak dikutip).
3. Prefektur mencapai angka Lampiran 4 (tidak dikutip), atau kondisi khusus wilayah terpencil yang menyulitkan penyelamatan dan banyak rumah hilang.
4. Banyak orang terancam jiwa atau raganya dan memenuhi standar peraturan kantor kabinet.
Ayat 2: dalam menghitung rumah hilang, satu rumah setengah rusak atau setengah terbakar dihitung dua rumah yang dianggap hilang satu, dan rumah yang terendam lantai atau tertimbun sedimen sehingga sementara tak dapat dihuni dihitung tiga. Aturan setara ini adalah contoh langsung bagaimana kerusakan parsial dikonversi ke satuan "hilang". Nama "gekijin saigai" (penetapan bencana luar biasa): dasar hukumnya bukan UU Bantuan Bencana, tetapi UU Tindakan Khusus untuk Bencana Parah; [BELUM TERVERIFIKASI] (tidak dibuka). Ringkasan hibah dukungan korban (https://www.japaneselawtranslation.go.jp/outline/199/905R767.pdf, dibuka sebagian, teks rusak): hibah berlaku untuk kota dengan 10 atau lebih rumah hancur total, prefektur dengan 100 atau lebih, dan seterusnya; angka dan syarat rinci [BELUM TERVERIFIKASI] karena ekstraksi teks tidak terbaca baik. Basis: absolut berjenjang menurut penduduk (efektif relatif terhadap ukuran kota).

**Australia.** Kerangka Disaster Recovery Funding Arrangements (DRFA) 2018. Dari ringkasan pencarian: bencana layak bila berupa bencana alam atau serangan teror, perlu respons multi-instansi terkoordinasi, dan belanja negara bagian melebihi "small disaster criterion" USD/AUD 240.000 atau angka yang diterbitkan departemen; negara bagian harus memberitahu NEMA dalam tiga bulan. Dokumen DRFA 2018 di nema.gov.au tidak terjangkau dari peladen riset (gagal dibuka dua kali), maka seluruh angka [BELUM TERVERIFIKASI]. Basis: absolut (biaya).

**Opsional (Tiongkok, Vietnam):** tidak diriset.

### Tabel perbandingan negara

| Negara | Lembaga | Ambang pencatatan | Ambang deklarasi | Basis | URL |
| --- | --- | --- | --- | --- | --- |
| Global (EM-DAT) | CRED/UCLouvain | 10 meninggal atau hilang, 100 terdampak, seruan bantuan internasional atau deklarasi darurat | tidak berlaku (basis data) | absolut | https://doc.emdat.be/docs/protocols/entry-criteria/ |
| Global (DesInventar) | UNDRR | tanpa ambang; kejadian yang berdampak | tidak berlaku | tanpa ambang | https://desinventar.cimafoundation.org/methodology.html |
| Global (GAR) | UNDRR | pembeda ekstensif/intensif: 30 meninggal atau 600 rumah hancur | tidak berlaku | absolut | GAR 2015 Box 4.1 (butir 2) |
| Global (GDACS banjir) | UE/PBB | semua banjir hijau | oranye lebih dari 100 meninggal atau 80.000 mengungsi; merah lebih dari 1.000 atau 800.000 | absolut | https://www.gdacs.org/Knowledge/models_fl.aspx |
| Global (GDACS karhutla) | UE/PBB (GWIS) | 5.000 ha | beranda: 10.000 ha dan 10.000 jiwa dalam 5 km | absolut + paparan | https://www.gdacs.org/Knowledge/models_wf.aspx |
| Indonesia | BNPB | Juklak 7/2023 (dari permintaan kajian, tidak diriset ulang) | status darurat | absolut | (di luar berkas ini) |
| Filipina | NDRRMC/NDCC | tidak diriset | dua atau lebih kondisi: 20% penduduk terdampak atau 20% rumah hancur, 40% penghidupan, jalan/jembatan, pertanian, lifeline, epidemi (selama 4 hari) | relatif | https://www.locjkt.or.id/application/docliblcjkt/upload/Philippine%20Disaster%20Management.pdf |
| Amerika Serikat | FEMA | tidak berlaku | USD 2,01 per kapita (negara bagian) dan USD 5,03 (county) untuk insiden mulai 1 Okt 2026, minimum USD 1 juta | relatif + absolut | https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-44?part=206&section=206.48 |
| India | Kemendagri/NDMA | tidak diriset | "severe nature" diskresioner; tanpa kriteria tetap | diskresioner | https://ies.gov.in/arthapedia/concept/calamity-severe-nature |
| Jepang | Kantor Kabinet | tidak diriset | 30 sampai 150 KK rumah hilang menurut penduduk kota; setara hitung 2 untuk setengah rusak, 3 untuk terendam | absolut berjenjang | https://laws.e-gov.go.jp/api/1/lawdata/322CO0000000225 |
| Australia | NEMA | tidak berlaku | small disaster criterion 240.000 (belum terverifikasi) | absolut (biaya) | [BELUM TERVERIFIKASI] |

## 11. PDNA dan DaLA

PDNA Guidelines Volume A (2013), https://fpi.ec.europa.eu/system/files/2021-05/pdna_vol._a_en.pdf (dibuka):
- Damage: nilai kerusakan total atau sebagian pada infrastruktur dan aset; dinilai lebih dahulu dalam satuan fisik lalu nilai uang berupa biaya penggantian menurut harga pasar sebelum dan sesudah bencana.
- Loss: nilai perubahan produksi barang dan jasa, penyampaian dan akses layanan, tata kelola, dan risiko. "Economic Losses refer to changes in economic flows arising from the disaster which continue until the achievement of full economic recovery and reconstruction", kadang bertahun-tahun.
- Hitung ganda pada tahap kebutuhan: biaya keluaran per sektor dibandingkan "to ensure comprehensive coverage without double counting, as some interventions can address needs in more than one sector", dikoordinasikan lewat pertemuan rutin tim sektor.

DaLA (Bank Dunia, GFDRR) Guidance Notes Vol. 1, https://documents1.worldbank.org/curated/en/617521468335985769/pdf/880860v10WP0Bo0PUBLIC00TTL0Vol10WEB.pdf (dibuka): agregasi kerusakan dan kerugian dilakukan menurut sektor dalam sistem neraca nasional, "ensuring that no double accounting or gaps are incurred". Asal DaLA di ECLAC 1972: dari ringkasan pencarian, [BELUM TERVERIFIKASI].

## 12. Skala per bahaya

- VEI (Newhall dan Self 1982): indeks 0 sampai 8; logaritmik, tiap interval berarti kenaikan sepuluh kali volume material yang dilontarkan, kecuali antara VEI 0, 1, dan 2; VEI 0 untuk erupsi non-eksplosif dengan tefra kurang dari 10.000 m3; VEI 8 untuk erupsi super sekitar 1 x 10^12 m3 dengan tinggi kolom di atas 20 km. Sumber sekunder (Wikipedia), https://en.wikipedia.org/wiki/Volcanic_explosivity_index (dibuka); artikel asli JGR 87:1231-1238 hanya sebagai sitasi dari pencarian, tidak dibuka.
- SPI (kekeringan): halaman JMA mengutip WMO (2012), WMO-No. 1090 (https://ds.data.jma.go.jp/gmd/cpd/monitor/climatview/spi_commentary.html, dibuka): 0 sampai -0,99 kering ringan (sekali per 3 tahun); -1,00 sampai -1,49 kering sedang (sekali per 10 tahun); -1,5 sampai -1,99 kering parah (sekali per 20 tahun); kurang dari -2,0 kering ekstrem (sekali per 50 tahun atau lebih jarang). Nilai negatif sekitar -1 atau lebih rendah yang berlanjut menandai kekeringan (McKee dkk. 1993). SPI hanya menghitung curah hujan, tidak menghitung penguapan. Tabel kelas sisi basah: [BELUM TERVERIFIKASI].
- Kelas ukuran kebakaran NWCG A sampai G: halaman NWCG dan InciWeb menolak akses (403); ringkasan pencarian hanya menyebut Kelas A seperempat are atau kurang hingga Kelas G 5.000 acre atau lebih. Batas kelas tengah: [BELUM TERVERIFIKASI].
- Periode ulang banjir: tidak diriset. [BELUM TERVERIFIKASI].
- MMI: lihat butir 6 dan 7 (dipakai GDACS, ambang MMI VI sebagai batas hijau); skala itu sendiri tidak dibuka.
- Skala karhutla di tingkat luas: ambang GDACS 5.000 ha (butir 7) dan ambang MTBS 404 ha di barat AS dan 202 ha di timur AS (butir 8).

---

## Belum terverifikasi (rangkuman)

1. Aturan dua sumber untuk entri EM-DAT; tahun perumusan tiga kriteria masuk EM-DAT.
2. "Datacard" sebagai unit pencatatan DesInventar.
3. Ambang ekstensif/intensif pada GAR 2011 dan 2013 (hanya GAR 2015 yang terbuka).
4. Aturan GLIDE untuk kejadian lintas negara dan berantai.
5. Naskah IRDR 2014 (peril, associated hazards); jumlah 302 bahaya HIPs 2020.
6. PAGER: dasar % PDB; aturan "skala tertinggi menentukan warna".
7. Isi lengkap Gall dkk. 2009, Wirtz dkk. 2014, Guha-Sapir dan Below; angka 1,3 persen tanpa taksiran kematian (Jones dkk. 2022 versi media).
8. Ambang masuk NatCatSERVICE dan Sigma (terkini).
9. Kriteria asli NDCC MC 4 s.1998 dan teks resmi Filipina terkini; klaim 15 persen dan MC 4 s.2012 di permintaan tampaknya keliru.
10. Pernyataan India tentang tidak adanya deklarasi nasional (jawaban Lok Sabha 2024).
11. Jepang: Lampiran 3 dan 4 selengkapnya, status "gekijin saigai", rincian hibah dukungan korban.
12. Australia DRFA: seluruh angka (240.000) dan definisi eligible disaster.
13. Kelas ukuran kebakaran NWCG A sampai G; periode ulang banjir; sisi basah SPI; MMI.
14. Nilai FEMA FY2026 (USD 4,86 county) dan USD 189; angka USD 2,01 dan USD 5,03 berasal dari dokumen public inspection, perlu dicek ke edisi cetak.
15. Versi terbit FIRED (MDPI) diverifikasi lewat pra-cetak; angka 11 hari dan 5 piksel konsisten dengan abstrak yang terlihat di pencarian.
