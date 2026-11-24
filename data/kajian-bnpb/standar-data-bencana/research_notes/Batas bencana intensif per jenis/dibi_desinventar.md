# DIBI, DesInventar, dan analisis risiko intensif/ekstensif UNDRR

Catatan riset 19 Nov 2026. Tanda: [V] = sumber asli dibuka dan dibaca sendiri; [S] = sekunder (cuplikan mesin pencari, ringkasan pihak lain, atau catatan repo yang tidak saya buka ulang sumber aslinya). Kutipan asli paling banyak dua kalimat.

Catatan akses: domain preventionweb.net, desinventar.net, sustainabledevelopment.un.org, web.archive.org, stat-confluence.escap.un.org, dan infolaras.bpbd.garutkab.go.id gagal diresolusi DNS atau ditolak sertifikat dari mesin ini (dicoba WebFetch dan curl). GAR 2015 Annex 2 terbaca dari salinan PDF yang sudah ada di scratchpad sesi (diunduh peneliti lain, URL asli https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf). Dasbor publik DIBI (dibi.bnpb.go.id, Apache Superset) dapat diakses dan saya kueri langsung.

## 1. Apa itu DIBI: sejarah, platform, cakupan, pengisi, satuan rekaman, kriteria masuk

### Takeaway
DIBI adalah basis data kerugian bencana nasional BNPB yang lahir dari DesInventar (dibawa UNDP sesudah tsunami 2004, diluncurkan sebagai milik BNPB 29 Juli 2008 dengan dukungan program UNDP SCDRR). Model datanya berbasis lokasi (per kabupaten), bukan berbasis kejadian, dan sejak awal tidak punya ambang dampak untuk masuk basis data; platform publik sekarang adalah dasbor Superset dengan data per hari x kabupaten x jenis mulai 2008.

### Cited Findings
- [V] Asal-usul: "In Indonesia, in 2005, the DesInventar was housed within UNDP Indonesia" lalu "DIBI was finally launched as a nationally-owned database in 29 July 2008, and is housed within the newly established National Disaster Management Agency (BNPB)." — [BNPB/UNDP, Lessons Learned: Data dan Informasi Bencana Indonesia (pubs/442)](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/442.pdf)
- [V] Definisi nama: "'DIBI' is the Indonesian acronym for the Indonesian Disaster Data and Information Management Database developed using the DesInventar and DesConsultar software and methodology." — [BNPB pubs/442](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/442.pdf)
- [V] Penyerahan sempat gagal karena status hukum dan validitas data: BAKORNAS PB tidak punya mandat mengambil alih data historis DesInventar, "further compounded by the absence of the government's recognition of the validity of the data"; penerimaan baru terjadi setelah UU 24/2007 menetapkan BNPB. — [BNPB pubs/442](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/442.pdf)
- [V] Peran SCDRR: program UNDP SC-DRR (bersama BAPPENAS, BAKORNAS PB, Kemendagri, DFID) mendukung penerapan metodologi DesInventar; pada 2008 BNPB dan SCDRR memilih DIY, Jawa Tengah, dan Sumatera Barat untuk menghimpun data lokal mulai 1972 sebagai DIBI provinsi pertama. — [BNPB pubs/442](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/442.pdf)
- [V] Pengisi data awal: sumber data DIBI adalah Satkorlak PB (provinsi) dan Satlak PB (kabupaten), yang beralih menjadi BPBD; pada 2009 "the provinces submit hardcopies to BNPB and the district administrations submit their hardcopies of disaster event data to the provincial administrations." — [BNPB pubs/442](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/442.pdf)
- [V] Cakupan saat itu: "available through the BNPB Dibi website for the years 1997 to 2008 and the Desinventar website for the years 2002 to 2006"; jumlah rekaman 6.110; data historis "nearly complete for 1997-2009". — [BNPB/CRED-SCDRR, Strengthening National Disaster Databases in Asia: Study in Indonesia (pubs/450)](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf); [BNPB pubs/442](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/442.pdf)
- [V] Kriteria masuk: "The database has no impact thresholds for entering disasters in the database, the so-called 'entry criteria'. All disasters that are reported by the data sources and that are included in the list of 18 disaster types (including 13 natural disaster types) covered by the database are compiled." — [BNPB pubs/450](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf)
- [V] Satuan rekaman: "The Desinventar database structure is a location-based data entry model, as opposed to an event-based data entry model like EM-DAT." Kejadian lintas kabupaten terhitung ganda, sehingga DIBI memberi bobot kabupaten menurut jumlah kabupaten terdampak; tidak ada nomor identitas per kejadian ("events are searched by type and date"). — [BNPB pubs/450](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf)
- [V] Jumlah rekaman per tahun sekitar 100 sampai 1.300 (kondisi 2009); data dimasukkan tahunan. — [BNPB pubs/450](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf)
- [S] Presentasi Indonesia di ESCAP menyebut periode data DIBI 1815 sampai 2021, sumber "government validated data", dikumpulkan dengan format kertas. — [ESCAP, Disaster Loss Database and Risk Assessment Indonesia (cuplikan pencarian; PDF tidak dapat dibuka)](https://stat-confluence.escap.un.org/download/attachments/27854984/03.%20Disaster%20Loss%20Database%20and%20Risk%20Assessment_Indonesia.pdf?api=v2)
- [V] Platform sekarang: dasbor publik Apache Superset di dibi.bnpb.go.id; repo mengaksesnya lewat `POST /api/v1/chart/data` dengan konteks dasbor publik 1 tanpa login, dan menulis bahwa ini tidak resmi serta berisi baris per kabupaten bertanggal "2008-sekarang". — `scripts/banjir/kejadian.py` baris 12 sampai 14 dan 144 sampai 151 (repo)
- [V] Kueri saya pada dasbor itu (19 Nov 2026): 63.160 baris, kolom `tahun` 2008 sampai 2026, `SUM(jumlah_kejadian)` 60.503,45 (berpecahan, sesuai pembobotan kabupaten). Total meninggal 17.592, jadi data pra-2008 (termasuk tsunami 2004) tidak ada di dataset dasbor ini. — kueri ke https://dibi.bnpb.go.id/api/v1/chart/data, skrip di scratchpad `kode/dibi_gar.py`
- [S] Dasar regulasi: Perka BNPB 7/2012 tentang Pengelolaan Data dan Informasi Bencana menempatkan DIBI sebagai alat analisis kejadian dan dampak (teks tidak terbuka dari mesin ini). — [Perka BNPB 7/2012, salinan BPBD Garut](https://infolaras.bpbd.garutkab.go.id/wp-content/uploads/2022/03/perka-no-7-tahun-2012-tentang-pengelolaan-data-dan-informasi-2109.pdf)

### Inferences
- Satu baris DIBI adalah rekaman lokal (kabupaten) sesuai cara DesInventar, sama dengan satuan yang dipakai GAR untuk ambang intensif/ekstensif ("per local record"). Ambang 30/600 bisa diterapkan langsung per baris DIBI tanpa perlu nomor kejadian.
- Karena tidak ada nomor kejadian, satu gempa besar yang melanda beberapa kabupaten bisa menjadi beberapa baris ekstensif. Klasifikasi per baris akan menggeser porsi ke ekstensif dibanding klasifikasi per kejadian.

### Gaps
- Tanggal peralihan platform DesInventar ke Superset dan nasib data 1815 sampai 2007 di platform baru tidak ditemukan.
- Teks Perka 7/2012 tidak terbaca (DNS gagal), jadi kriteria pencatatan resmi di sana belum dikutip.

## 2. Variabel DIBI dan jenis bencana; apakah "rumah rusak berat" tersedia untuk ambang GAR

### Takeaway
DIBI mencatat meninggal, hilang, luka/sakit, menderita (terdampak), mengungsi, rumah rusak berat/sedang/ringan, rumah terendam, dan fasilitas rusak. "Rumah rusak berat" ada di setiap baris, dan di ekspor DesInventar lama dipetakan ke kolom "Houses Destroyed". Ambang GAR karena itu bisa dihitung, dengan catatan bahwa "rusak berat" tidak persis sama dengan "hancur".

### Cited Findings
- [V] Kolom dampak di dasbor Superset (diperiksa repo Okt 2026): meninggal, hilang, luka_sakit, menderita, mengungsi, rumah_rusak_berat, rumah_rusak_sedang, rumah_rusak_ringan, rumah_terendam, pendidikan_rusak, kantor_rusak, jembatan_rusak, fasum_rusak, plus jumlah_kejadian, provinsi, kabupaten, id_kab_bps, jenis_bencana, dt, tahun. — `scripts/umum/dibi_kejadian.py` baris 1 sampai 30 (repo)
- [V] Koreksi internal repo: uji 12 Nov 2026 menemukan DIBI juga punya kolom `rumah_ibadat_rusak` dan `fasyankes_rusak` (bertentangan dengan catatan `dibi_kejadian.py`), tidak punya kolom luas lahan, dan punya kolom `is_bencana` yang sejak 2025 menandai sekitar 41% baris sebagai "bukan bencana". — `data/kajian-bnpb/hitung-bencana/riset/SIM-KRITERIA.md` bagian 0 dan 1.4 (repo)
- [V] Variabel pada era DesInventar (2009): "killed, injured, missing, affected and evacuated"; kerusakan rumah, fasilitas kesehatan dan pendidikan, sawah, jalan, kadang ibadah, kantor, kios, kebun, tambak; "Individual sector impact indicators are not defined" dan "No definition exists for economic losses caused by disasters." — [BNPB pubs/450](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf)
- [V] Pemetaan ke istilah DesInventar dalam studi UNEP/GRID untuk GAR 2011: kolom ekspor DIBI meliputi "Houses Destroyed as recorded in DIBI database", "Houses Damaged", "Victims", "Affected", "Relocated", "Evacuated", "Losses $USD", "Losses $Local", "Education centers", "Hospitals", "Damages in crops Ha", "Lost Cattle". — [Herold & Peduzzi, Testing the GAR risk methodology at the national level: the case of earthquakes in Indonesia, UNEP/GRID 2010](https://unepgrid.ch/storage/app/media/legacy/35/GAR_Indonesia_2011.pdf)
- [V] Jenis bencana di dasbor Superset sekarang (jumlah baris 2008 sampai 2026): Banjir 19.279; Tanah Longsor 11.290; Kebakaran Hutan dan Lahan 9.171; Cuaca Ekstrem 8.756; Puting Beliung 6.889; Angin Kencang 1.713; Kekeringan 1.685; Kebakaran Gedung dan Permukiman 1.160; Gempabumi 822; Gelombang Pasang/Abrasi 596; Banjir dan Tanah Longsor 570; Banjir Bandang 303; Banjir Rob 257; Erupsi Gunung Api 201; Gerakan Tanah 165; ditambah sekitar 20 label kecil yang tidak seragam (mis. "Gempa Bumi dan Tsunami" 6, "Gempabumi Reruntuhan" 1, "Kebakaran Lahan Gambut" 3, "Epidemi dan Wabah Penyakit" 6, "Konflik Sosial" 22). — kueri dasbor DIBI 19 Nov 2026
- [V] Era 2009: 18 jenis bencana (13 alam), klasifikasi setara (tidak berjenjang), bencana ikutan dicatat sebagai jenis gabungan seperti "earthquakes and tsunami"; definisi jenis mengikuti UU 24/2007. — [BNPB pubs/450](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf)
- [S] Definisi rusak berat di tingkat daerah (bukan DIBI): runtuh total, sebagian besar struktur utama rusak, kerusakan fisik di atas 65%. — [Portal data Kab. Purbalingga, Jumlah Rumah Korban Bencana Rusak Berat 2018-2022](https://data.purbalinggakab.go.id/tr/dataset/jumlah-rumah-korban-bencana-rusak-berat-tahun-2018-2022)

### Inferences
- `rumah_rusak_berat` adalah padanan terdekat "houses destroyed" GAR/DesInventar. Rusak berat menurut kriteria Indonesia (lebih dari sekitar 65 sampai 70% rusak) mencakup rumah yang masih berdiri, jadi ambang 600 pada rusak berat sedikit lebih longgar daripada 600 rumah hancur. Kajian sebaiknya menyebut ini sebagai asumsi padanan.
- Label jenis yang tidak seragam (Gempabumi lawan "Gempa Bumi dan Tsunami", Banjir lawan "Banjir dan Tanah Longsor") harus dipetakan dulu sebelum ambang per jenis dihitung.

### Gaps
- Kamus data resmi DIBI versi Superset (definisi tiap kolom, termasuk apakah `menderita` sudah mencakup mengungsi) tidak ditemukan di sumber publik.

## 3. Apakah DIBI atau BNPB menerbitkan kelas keparahan atau definisi "bencana besar"

### Takeaway
Tidak ditemukan kelas keparahan, kelas ukuran, atau label intensif/ekstensif di DIBI maupun publikasi statistik BNPB. Yang ada hanyalah indikator status/tingkat bencana tanpa angka ambang di UU 24/2007, halaman "bencana besar" di portal BNPB yang kriterianya tidak terlihat, dan kolom `is_bencana` baru di DIBI yang berupa saringan masuk (ya/tidak), bukan kelas keparahan.

### Cited Findings
- [S] Pasal 7 ayat (2) UU 24/2007 memuat indikator penetapan status dan tingkat bencana (jumlah korban, kerugian harta benda, kerusakan prasarana dan sarana, cakupan luas wilayah, dampak sosial ekonomi) tanpa angka ambang. — [Hukumonline, Ini Ketentuan Status Bencana Nasional](https://www.hukumonline.com/berita/a/ini-ketentuan-status-bencana-nasional--otoritas-penetapan-dan-indikatornya-lt692fa9e6a59b6)
- [S] Portal GIS BNPB punya halaman berjudul "bencana besar" per tahun (2021, 2022, 2025), tetapi kriterianya tidak terlihat dalam hasil pencarian. — hasil pencarian web 19 Nov 2026 (tanpa URL halaman yang dapat diverifikasi)
- [V] Keluaran analitis DIBI era 2009: laporan tahunan/dua tahunan, peta, dan "hazard prone indices (weighted scores based on the number of events, number of people killed, and injured, damaged infrastructure and population density)", yaitu indeks rawan wilayah, bukan kelas kejadian. — [BNPB pubs/450](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf)
- [V] Kolom `is_bencana` di DIBI: 2024 true 3.659 dan false 93; 2025 true 5.241 dan false 3.705; kesesuaian dengan kriteria pencatatan Juklak 7/2023 (K1 sampai K3) 93,7% pada 2025, jadi ini kemungkinan besar penerapan ambang masuk sejak 2025. — `data/kajian-bnpb/hitung-bencana/riset/SIM-KRITERIA.md` bagian 1.4 (repo)
- [S] Dokumen IRBI menganalisis kejadian berdasarkan data DIBI 1815 sampai 2010 dan menggabungkannya dengan PODES BPS. — ringkasan hasil pencarian tentang [Indeks Rawan Bencana Indonesia, BNPB](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/446.pdf) (PDF tidak saya buka)

### Inferences
- Kelas "bencana intensif" dan "bencana ekstensif" akan menjadi klasifikasi keparahan pertama yang eksplisit di BNPB, bukan penggantian kelas lama. Yang perlu dijaga hanyalah agar tidak tercampur dengan status keadaan darurat atau tingkat bencana menurut UU 24/2007.

### Gaps
- Kriteria halaman "bencana besar" di portal GIS BNPB dan isi buku "Data Bencana Indonesia" tahunan tidak berhasil dibuka; perlu dicek langsung bila akses tersedia.

## 4. Apakah data DIBI dicerminkan di DesInventar (desinventar.net / DesInventar Sendai), dan tahun berapa

### Takeaway
Indonesia tidak muncul sebagai basis data di server UNDRR DesInventar. Indeks DesInventar (CIMA/UNISDR) menautkan ke server BNPB sendiri ("DIBI (Indonesia)" di dibi.bnpb.go.id/DesInventar). Pada 2009 desinventar.net hanya memuat Indonesia 2002 sampai 2006. GAR 2009 sampai 2015 memakai ekstrak DIBI.

### Cited Findings
- [V] Indeks DesInventar menautkan "Explore other country database servers: DesInventar.org (Americas) DIBI (Indonesia)" ke `http://dibi.bnpb.go.id/DesInventar/dashboard.jsp?countrycode=id`, dan mencantumkan BNPB sebagai pemangku kepentingan pengembangan. — [DesInventar index, CIMA Foundation](https://desinventar.cimafoundation.org/index_www.html)
- [V] Pada 2009 basis data tersedia "through the BNPB Dibi website for the years 1997 to 2008 and the Desinventar website for the years 2002 to 2006." — [BNPB pubs/450](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf)
- [V] Studi UNEP/GRID memakai DIBI resmi dan mencatat sumber `http://dibi.bnpb.go.id/DesInventar/main...`; disebut juga adanya "unofficial" DIBI yang lebih lengkap dan lebih jauh ke belakang, tetapi yang dipakai versi resmi. — [Herold & Peduzzi 2010](https://unepgrid.ch/storage/app/media/legacy/35/GAR_Indonesia_2011.pdf)
- [V] GAR 2015 Annex 2 Tabel 1 memuat Indonesia dalam dataset konsolidasi: 15.558 rekaman, 193.590 meninggal, 331.088 luka, 17.461 hilang, 1.074.973 rumah hancur, 1.106.057 rumah rusak, 21.915.862 terdampak, 29.879 sekolah, 3.523 fasilitas kesehatan, 3.503.504 ha tanaman, 108.544 m jalan. — [UNISDR, GAR 2015 Annex 2: Loss Data and Extensive Risk Analysis, Tabel 1 hlm. 13](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf) (dibaca dari salinan PDF; kolom diambil berdasarkan posisi x kata karena teks PDF berantakan)
- [S] GAR 2013 Annex 2: Indonesia 11.396 rekaman, 192.929 meninggal, 1.078.124 rumah hancur, 1.111.843 rumah rusak. — [GAR 2013 Annex 2 (cuplikan pencarian)](https://www.preventionweb.net/english/hyogo/gar/2013/en/gar-pdf/Annex_2.pdf)
- [V] GAR 2015 memuji BNPB: "in Indonesia the BNBP ... has proven to be extremely successful not only setting up and keeping up to date the national database, but also in federalizing its use and creating province level databases that are regularly consolidated in the national one." — [GAR 2015 Annex 2 hlm. 8](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf)
- [S] Bagian risiko ekstensif GAR 2011 menyebut DIBI berbasis data resmi pemerintah 1815 sampai 2009. — ringkasan hasil pencarian atas [GAR 2011 extensive risk](https://preventionweb.net/english/hyogo/gar/2011/en/what/extensive.html)

### Inferences
- Angka 193.590 meninggal di GAR 2015 jauh di atas total dasbor Superset sekarang (17.592, 2008 sampai 2026). Selisih itu sebagian besar tsunami Aceh 2004 dan data pra-2008 yang ada di DIBI era DesInventar tetapi tidak ada di dataset dasbor publik saat ini.
- Status Indonesia di platform "DesInventar Sendai" baru (desinventar.net/UNDRR, sesudah 2015) belum terverifikasi. Bukti yang ada mengarah ke server nasional terpisah, bukan cermin di UNDRR.

### Gaps
- desinventar.net dan desinventar-api.undrr.org tidak dapat diresolusi dari mesin ini, jadi daftar negara DesInventar Sendai dan tahun cakupan Indonesia di sana tidak terverifikasi.
- Periode persis ekstrak DIBI di GAR 2013 dan 2015 tidak tertulis untuk Indonesia; GAR 2015 hanya menyatakan 67 dari 80 negara punya data 1991 sampai 2013.

## 5. Porsi intensif lawan ekstensif untuk Indonesia (GAR dan studi lain), serta hitungan ulang dari DIBI sekarang

### Takeaway
GAR 2015 memakai basis data nasional Indonesia sebagai ilustrasi (Gambar 4.1 laporan utama, 1990 sampai 2013), tetapi angka porsi Indonesia tidak berhasil diambil dari laporan utama. Annex 2 hanya memberi porsi global (0,86% rekaman intensif memikul sekitar 87% kematian dan 84% rumah hancur). Hitungan ulang saya atas DIBI 2008 sampai 2026 dengan ambang GAR per baris memberi pola yang sama: 138 dari 63.160 baris (0,22%) intensif, memikul 62,4% kematian dan 77,8% rumah rusak berat. Porsi ini sangat bergantung pada jenis bencana dan tahun.

### Cited Findings
- [S] Ambang GAR 2015 Box 4.1: "The variables used to define the threshold between intensive and extensive disaster losses are mortality and housing destruction." Rinciannya: ekstensif bila kurang dari 30 meninggal dan kurang dari 600 rumah hancur; intensif bila 30 atau lebih meninggal atau 600 atau lebih rumah hancur. — [GAR 2015, Box 4.1](https://preventionweb.net/english/hyogo/gar/2015/en/home/GAR_2015/GAR_2015_93.html) (dikutip dari `data/kajian-bnpb/hitung-bencana/riset/PUSTAKA.md` baris 79 dan cuplikan pencarian; laman tidak dapat dibuka dari mesin ini)
- [V] Asal ambang: empat latihan pada basis data nasional mencari batas yang mengumpulkan kematian dan kerugian maksimum pada jumlah bencana minimum; "As no consistent economic valuation of damages was available in those datasets, mortality and destruction of houses were used to define the thresholds, which were set at 30 people killed and 600 houses destroyed." — [GAR 2015 Annex 2 hlm. 24-25](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf)
- [V] Hasil global: "As per design, these thresholds accumulate in a very small number of disasters (0.86%) approximately 87% of total mortality and 84% of all houses destroyed are the consequence of intensive risk disasters." Ekstensif memikul 47,3% kerugian ekonomi dan lebih dari separuh (55,6%) kerusakan perumahan. — [GAR 2015 Annex 2 hlm. 25-26](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf)
- [S] Laporan utama GAR 2015: 99,1% rekaman lokal dari 85 negara/negara bagian adalah manifestasi risiko ekstensif, dan bencana ekstensif hanya 14% dari total kematian. Gambar 4.1 membandingkan bencana ekstensif dan intensif di Indonesia 1990 sampai 2013 dengan data dari basis data kerugian nasional Indonesia (UNISDR). — cuplikan pencarian atas [GAR 2015 hlm. 93](https://preventionweb.net/english/hyogo/gar/2015/en/home/GAR_2015/GAR_2015_93.html)
- [V] GAR 2015 Annex 2 Tabel 6 (kerugian langsung terestimasi, juta USD 2013), Indonesia: 15.448 rekaman nasional, kerugian langsung 30.171; 759 rekaman cocok dengan EM-DAT (19.803); 14.689 rekaman tidak cocok (10.368); EM-DAT 32.113; konsolidasi 42.480. Jadi sekitar 34% kerugian langsung terestimasi Indonesia berasal dari rekaman yang tidak masuk EM-DAT. — [GAR 2015 Annex 2 Tabel 6 hlm. 49](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf)
- [V] Distribusi kematian gempa di DIBI (1998 sampai 2008, 224 rekaman kabupaten): "55% of the records report 0 killed." — [Herold & Peduzzi 2010](https://unepgrid.ch/storage/app/media/legacy/35/GAR_Indonesia_2011.pdf)
- [V] Hitungan ulang saya, dasbor DIBI (Superset, ditarik 19 Nov 2026, 2008 sampai 2026, satuan baris = rekaman kabupaten). Intensif = meninggal >= 30 ATAU rumah_rusak_berat >= 600 per baris:
  - Total: 63.160 baris; 138 intensif (0,22%); 54 baris lewat kematian, 115 lewat rumah (sebagian lewat keduanya). Porsi intensif: meninggal 62,4% (10.969 dari 17.592), rusak berat 77,8% (496.902 dari 638.330), rusak sedang 63,6%, rusak ringan 52,7%, mengungsi 34,4%.
  - Per jenis (baris intensif / porsi meninggal / porsi rusak berat): Gempabumi 58 dari 822 (7,1%) / 96,5% / 96,1%; Banjir 47 dari 19.279 (0,24%) / 44,4% / 67,5%; Tanah Longsor 10 dari 11.290 / 13,4% / 19,1%; Erupsi Gunung Api 8 dari 201 / 86,0% / 98,9%; Tsunami 3 dari 22 / 96,1% / 94,6%; Gempa Bumi dan Tsunami 3 dari 6 / 99,6% / 98,8%; Cuaca Ekstrem 2 dari 8.756 / 0% / 4,7%; Karhutla, Puting Beliung, Angin Kencang, Kekeringan, Kebakaran Permukiman, Gelombang Pasang: 0 baris intensif.
  - Per tahun, porsi kematian intensif berayun keras: 2009 86,5% (gempa Sumbar), 2012 0%, 2015 0%, 2018 93,2% (Lombok, Palu), 2023 15,6%, 2025 58,1% (banjir Sumatra).
  - Skrip: scratchpad `kode/dibi_gar.py`, hasil `hasil_dibi_gar.json`. Kueri ke https://dibi.bnpb.go.id/api/v1/chart/data
- [V] Konsentrasi serupa di repo (12 bulan DIBI): 85,5% meninggal berasal dari 1% baris teratas (41 baris); median dampak hampir selalu nol. — `data/kajian-bnpb/hitung-bencana/riset/SIM-KRITERIA.md` bagian 3 (repo)
- [V] Keputusan repo sebelumnya: Q-36 "Apakah ambang ekstensif dan intensif GAR 2015 (30 meninggal atau 600 rumah hancur) dipakai untuk Indonesia?" dijawab "Dipakai sebagai label analisis, bukan kelas resmi". — `data/kajian-bnpb/hitung-bencana/KEPUTUSAN.md` baris 97 (repo)

### Inferences
- Pola Indonesia sesuai pola global GAR: kurang dari 1% rekaman memikul mayoritas kematian dan rumah hancur. Porsi kematian intensif DIBI 2008 sampai 2026 (62%) lebih rendah dari global (87%) karena jendelanya tidak memuat tsunami 2004 dan karena satuan baris kabupaten memecah kejadian besar lintas kabupaten.
- Untuk banyak jenis hidrometeorologi (puting beliung, cuaca ekstrem, karhutla, kekeringan), ambang tunggal 30/600 hampir tidak pernah tercapai per baris kabupaten. Ini mendukung gagasan batas intensif per jenis, atau setidaknya pelaporan per jenis.
- Bila kajian menghitung kelas per kejadian (bukan per baris kabupaten), porsi intensif akan naik untuk gempa dan banjir besar lintas kabupaten. Ini perlu dinyatakan sebagai pilihan metode.

### Gaps
- Angka porsi intensif/ekstensif Indonesia di Gambar 4.1 GAR 2015 dan di profil negara GAR 2011 tidak berhasil diambil (preventionweb.net tidak dapat diakses).
- Tidak ditemukan makalah akademik khusus yang menghitung risiko ekstensif Indonesia dari DIBI.

## 6. Masalah mutu data DIBI yang relevan untuk penerapan ambang

### Takeaway
Masalah utama: kelengkapan berubah antartahun, jumlah kejadian berpecahan, tidak ada nomor kejadian, kerugian besar pernah ditumpuk di satu kabupaten, koreksi susulan, aturan masuk berubah pada 2025 (`is_bencana`), dan akses publik tidak resmi.

### Cited Findings
- [V] Bias kelengkapan waktu: "the distribution of recorded earthquakes events in DIBI is exponential, i.e. there are more records in recent years than in the past. This is more likely due to be driven by a lack of access to past information, rather than a change in the hazard pattern." — [Herold & Peduzzi 2010](https://unepgrid.ch/storage/app/media/legacy/35/GAR_Indonesia_2011.pdf)
- [V] Penumpukan lokasi: "in the official version of DIBI, all the losses from the 26.12.2004 tsunami / earthquake event were placed in one district (Banda Aceh)." — [Herold & Peduzzi 2010](https://unepgrid.ch/storage/app/media/legacy/35/GAR_Indonesia_2011.pdf)
- [V] Rekomendasi: "The DIBI records need further corrections and, if possible, to complete the period 1970 to 2000." Pemekaran kabupaten (290 pada 1993 menjadi lebih banyak pada 2006) menyulitkan pencocokan. — [Herold & Peduzzi 2010](https://unepgrid.ch/storage/app/media/legacy/35/GAR_Indonesia_2011.pdf); jumlah provinsi naik dari 27 (1999) ke 33 (2008) dan kabupaten dari sekitar 340 ke 492 — [BNPB pubs/442](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/442.pdf)
- [V] Tanpa nomor kejadian dan pencatatan ganda lintas kabupaten yang diatasi dengan pembobotan. — [BNPB pubs/450](https://bnpb.go.id/storage/app/media/uploads/migration/pubs/450.pdf)
- [V] Temuan repo: DIBI 2024 tidak lengkap (3.752 baris lawan 8.946 pada 2025, naik 138% karena kelengkapan, bukan kejadian); 4,0% baris berpecahan `jumlah_kejadian`; 643 baris pecahan; "Banjir dan tanah longsor" jadi jenis tersendiri; karhutla 98,7% berdampak nol dan tidak punya kolom luas; DIBI sering dikoreksi susulan. — `data/kajian-bnpb/hitung-bencana/riset/SIM-KRITERIA.md` bagian 0, 1.4, dan keterbatasan; `riset/DAFTAR-PARADOKS.md` P-48 dan P-50 (repo)
- [V] Patahan seri: angka "kejadian" DIBI sebelum dan sesudah 2025 tidak sebanding karena `is_bencana` baru diterapkan penuh sejak 2025. — `data/kajian-bnpb/hitung-bencana/riset/SIM-KRITERIA.md` bagian 1.4 (repo)
- [V] Akses: dasbor Superset diakses lewat konteks tamu dasbor publik, "Tidak resmi: bila Superset diubah, akses bisa hilang". — `scripts/banjir/kejadian.py` baris 12 sampai 14 (repo)
- [S] Kajian Satu Data Bencana (2023) menyebut data kejadian dan dampak belum terpadu dalam satu platform. — [Jurnal Nusantara UM Tapsel](https://jurnal.um-tapsel.ac.id/index.php/nusantara/article/download/10510/6483)

### Inferences
- Untuk ambang 30/600, risiko terbesar adalah penumpukan (kejadian besar tercatat di satu kabupaten sehingga terlalu intensif) dan pemecahan (satu kejadian besar dibagi ke banyak kabupaten sehingga menjadi ekstensif). Keduanya bergantung pada aturan satuan kejadian yang sedang disusun kajian, bukan pada angka ambang.

### Gaps
- Tidak ada audit mutu DIBI pasca-2015 yang terbit dan dapat diverifikasi.

## 7. Pengetahuan lokal repo tentang DIBI, dan aturan "tidak dikaitkan dengan DIBI"

### Takeaway
Repo memakai DIBI luas (tarikan Superset untuk banjir, longsor, rekonsiliasi Dalops-DIBI, profil daerah) dan kajian `hitung-bencana` sudah mengujinya mendalam. Untuk kajian standar-data-bencana, pemilik secara eksplisit melarang mengaitkan naskah dengan DIBI dan logbook Pusdalops karena menurutnya data itu usang, tanpa standardisasi, dan tidak andal; aturan ini digerbangi mesin.

### Cited Findings
- [V] Aturan naskah: "Naskah tidak dikaitkan dengan DIBI, logbook Pusdalops, atau kajian klasifikasi sebelumnya." — `data/kajian-bnpb/standar-data-bencana/README.md` baris 48 (repo)
- [V] Gerbang mesin: pola `\bDIBI\b|\blogbook\b|Data dan Informasi Bencana Indonesia` adalah GALAT dengan pesan "pemilik: kajian ini tidak dikaitkan dengan DIBI atau logbook Pusdalops"; frasa "Kajian Penghitungan dan Klasifikasi" juga GALAT. — `data/kajian-bnpb/standar-data-bencana/alat/cek_bahasa.py` baris 47 sampai 48 (repo)
- [V] Alasan pemilik (log prompt yang sudah disamarkan): 17 Nov 2026, "jangan kaitkan dengan DIBI dan logbook pusdalops ... saya rasa itu outdated dan tanpa standardisasi ... ga reliable juga itu sebenernya datanya"; 12 Nov 2026, "jangan ambil data dari DIBI ya, itu keos banget, banyak data yang bolong". — `.claude/ilmu-agent/prompt/2026-11.jsonl` (repo)
- [V] Pemakai DIBI lain di repo: `scripts/umum/dibi_kejadian.py` (365 hari, semua jenis, ke `public/data/dibi_kejadian.json`), `scripts/bnpb/rekonsiliasi_dalops_dibi.py` (DIBI 2011 sampai sekarang lawan logbook; menegaskan "selisih adalah selisih, bukan galat"), `scripts/banjir/kejadian.py`, `scripts/longsor/kejadian.py`, `scripts/kemitraan/profil_daerah.py`, `scripts/siklus/sumber.json`. — repo
- [V] Kajian `hitung-bencana` sudah memuat DesInventar (tanpa ambang, unit geografis terendah) dan GAR 2015 Box 4.1 di kerangka konsep, serta keputusan Q-36 (label analisis, bukan kelas resmi). — `data/kajian-bnpb/hitung-bencana/naskah/02-kerangka-konsep.md` baris 31 sampai 65; `KEPUTUSAN.md` baris 97 (repo)

### Inferences
- Karena larangan itu digerbangi `cek_bahasa.py`, temuan catatan ini (termasuk hitungan ulang DIBI) hanya boleh dipakai sebagai latar internal atau untuk memilih angka ambang. Naskah tidak boleh menyebut DIBI. Bila contoh porsi Indonesia dibutuhkan, rujuk GAR 2015 (UNISDR) sebagai sumber dan sebut "basis data kerugian nasional Indonesia" tanpa nama DIBI. Perlu dicek dulu ke pemilik apakah itu pun termasuk larangan.
- Larangan juga mencakup "kajian klasifikasi sebelumnya", sehingga keputusan Q-36 di `hitung-bencana` tidak bisa dikutip sebagai dasar; ambang GAR harus dirujuk langsung ke UNDRR.

### Gaps
- Tidak ada catatan apakah pemilik mengizinkan angka GAR yang bersumber dari DIBI (mis. Tabel 1 Annex 2) dikutip sebagai angka UNDRR.
