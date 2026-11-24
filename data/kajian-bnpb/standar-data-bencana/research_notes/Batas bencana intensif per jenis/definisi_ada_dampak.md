# Definisi "ada dampak": standar yang mendukung dan padanan terdekat

Catatan riset 23 Nov 2026. Tanda: [V] = dokumen asli diunduh dan dibaca sendiri; [S] = sekunder (cuplikan mesin pencari, ringkasan pihak lain, atau catatan repo yang tidak saya buka ulang). Kutipan asli paling banyak dua kalimat.

Rumusan yang diuji: ada dampak bila paling sedikit satu isian > 0 pada lima kelompok (manusia, rumah, fasilitas, layanan vital, lahan); orang terancam tidak dihitung; evakuasi sebelum dampak dihitung; isian belum didata = "menunggu data"; semua nihil = tidak ada dampak.

Catatan akses: WebFetch ke undrr.org, preventionweb.net, dan desinventar-api.undrr.org ditolak (403), tetapi curl dengan user-agent peramban berhasil. Halaman `undrr.org/terminology/disaster-damage`, `disaster-impact`, `disaster-loss` tidak ada sebagai halaman sendiri; definisinya berupa anotasi di entri "Disaster". Indikator resmi Cina (指标解释) tidak terbaca utuh.

## 1. DesInventar (LA RED/UNDRR, 2009) dan DesInventar Sendai (UNDRR, 2019)

### Takeaway
DesInventar adalah standar terdekat untuk rumusan kita. Peristiwa hanya dicatat bila menimbulkan efek, efek dikelompokkan (orang, rumah, infrastruktur, ekonomi, ditambah sektor kualitatif), dan evakuasi sementara adalah variabel efek tersendiri. DesInventar tidak menulis aturan "satu isian > 0" secara harfiah; syaratnya "some kind of" efek.

### Cited Findings
- [V] Kriteria pencatatan: DesInventar tidak memuat hujan normal tanpa efek merugikan, gempa kecil, atau banjir di wilayah kosong; "Only events which have generated some kind of affect are included." — DesInventar Methodological Guide v8.1.9 (2009), "Definition of Events", hal. 8/22. https://preparecenter.org/wp-content/uploads/2021/04/DesInventar_MethodologicalGuide_8.1.9.pdf
- [V] Peristiwa lawan bencana: "Remember that in DesInventar, an event is different from a disaster. An event may trigger multiple disasters as well as affecting different geographical units." — sama, hal. 8/22.
- [V] Definisi bencana: "'Disaster' is defined as the set of adverse effects caused by social-natural and natural phenomena on human life, properties and infrastructure (an 'Event') within a specific geographic unit during a given period of time." — UNDRR, DesInventar Methodology, bagian "Basic Definitions". https://desinventar-api.undrr.org/methodology.html
- [V] Kelompok efek: "The effects of disaster have been classified in four groups: Related to people; Related to homes; Related to infrastructure and Economic losses." — UNDRR, Definition of basic effects. https://desinventar-api.undrr.org/effects.html ; juga Guide 2009 hal. 19/22.
- [V] Daftar variabel kartu data (Guide 2009 hal. 19-22; halaman effects UNDRR): Deaths, Missing, Injured/sick, Affected, Victims, Evacuated, Relocated, Houses damaged, Houses destroyed, Crops and woods (ha), Livestock, Educational centres, Hospitals, Loss value, Roads affected (m), Other losses (teks, termasuk jembatan), lalu sektor kualitatif Transport, Communications, Aid organisation installations, Agriculture and fishing, Water supply, Sewerage, Education, Power/Energy, Industry, Health, Other.
- [V] Evakuasi: "The number of persons temporarily evacuated from their homes, work places, schools, hospitals, etc." — effects.html; Guide 2009 hal. 21/22.
- [V] Terdampak (affected) dalam DesInventar klasik = efek tidak langsung: "The number of persons who suffer indirect or secondary effects related to a disaster." — effects.html; Guide 2009 hal. 20/22. (Berbeda dengan "affected" Sendai.)
- [V] Layanan vital sebagai bendera ya/tidak: tiap sektor adalah "Qualitative field in the database. It has two options: Affected or Not Affected." — effects.html; Guide 2009 hal. 21-22/22.
- [V] Rumah rusak: Houses damaged = "minor damage, not structural or architectural, which may continue being lived in"; Houses destroyed = "levelled, buried, collapsed or damaged to the extent that they are no longer habitable." — effects.html.
- [V] DesInventar Sendai mengelompokkan isian kartu menurut Target A-D; evakuasi dan relokasi tetap dicatat di "Other Human and Economic Impacts" walau tidak masuk indikator global. — DesInventar Sendai 10.1.2 User Manual, Data Management (Feb 2019), hal. 25 dan 29. https://desinventar-api.undrr.org/documentation/DISendai_DataManagement_2019-2.pdf
- [V] Kotak centang lawan angka: "The check mark will remain if you change an entry number to 0, so you MUST manually remove the check." — sama, hal. 25. Artinya kartu memisahkan tanda "ada" dari angkanya.
- [V] Kosong bila tidak disebut: "If no reference to 'Injured' is given do not enter data here." — sama, hal. 27.
- [S] DIBI (turunan DesInventar di BNPB) "has no impact thresholds for entering disasters in the database"; semua kejadian yang dilaporkan dan termasuk 18 jenis dihimpun. — BNPB/CRED-SCDRR pubs/450, dikutip di `dibi_desinventar.md` (catatan repo, tidak saya buka ulang).

### Inferences
- "Some kind of affect" setara dengan "paling sedikit satu efek"; aturan ">0 pada salah satu isian" adalah bentuk operasional yang wajar dari kalimat itu, tetapi tidak tertulis harfiah.
- Lima kelompok kita memetakan rapi: manusia = people; rumah = homes; fasilitas = infrastruktur (pendidikan, kesehatan, jalan, jembatan di "Other losses"); layanan vital = sektor kualitatif; lahan = crops and woods + livestock + agriculture and fishing.
- Kotak centang DesInventar Sendai membuktikan praktik "ada tetapi angka belum diketahui" dipisah dari angka nol.

## 2. Terminologi UNDRR 2017 (A/71/644, disahkan A/RES/71/276)

### Takeaway
UNDRR mendefinisikan hazardous event dan disaster secara terpisah, dan disaster berarti gangguan serius yang menimbulkan "satu atau lebih" kerugian dan dampak. Tidak ada ambang angka. Evakuasi didefinisikan mencakup sebelum peristiwa.

### Cited Findings
- [V] Disaster: "A serious disruption of the functioning of a community or a society at any scale due to hazardous events interacting with conditions of exposure, vulnerability and capacity, leading to one or more of the following: human, material, economic and environmental losses and impacts." — https://www.undrr.org/terminology/disaster
- [V] Hazardous event: "The manifestation of a hazard in a particular place during a particular period of time." Anotasi: "Severe hazardous events can lead to a disaster as a result of the combination of hazard occurrence and other risk factors." — https://www.undrr.org/terminology/hazardous-event
- [V] Disaster impact (anotasi entri Disaster): "Disaster impact is the total effect, including negative effects (e.g., economic losses) and positive effects (e.g., economic gains), of a hazardous event or a disaster." — https://www.undrr.org/terminology/disaster
- [V] Disaster damage (anotasi entri Disaster): kerusakan diukur dalam satuan fisik dan "describes the total or partial destruction of physical assets, the disruption of basic services and damages to sources of livelihood in the affected area." — sama.
- [V] Affected: "Directly affected are those who have suffered injury, illness or other health effects; who were evacuated, displaced, relocated or have suffered direct damage to their livelihoods, economic, physical, social, cultural and environmental assets." Anotasi: orang meninggal atau hilang "may be considered as directly affected". — https://www.undrr.org/terminology/affected
- [V] Evacuation: "Moving people and assets temporarily to safer places before, during or after the occurrence of a hazardous event in order to protect them." — https://www.undrr.org/terminology/evacuation
- [V] Kedaruratan dapat terkait "hazardous events that do not result in the serious disruption of the functioning of a community or society". — anotasi entri Disaster.

### Inferences
- Rumusan kita (peristiwa ancaman ada dampaknya, lalu diperiksa terhadap kriteria bencana) sejalan dengan pemisahan UNDRR: dampak bisa ada tanpa memenuhi "serious disruption". Jadi "ada dampak" adalah syarat perlu, bukan cukup.
- "Disaster damage" UNDRR eksplisit memuat gangguan layanan dasar dan kerusakan mata pencaharian; ini mendukung kelompok layanan vital dan lahan.

## 3. Sendai Framework Technical Guidance (UNISDR, 2017; edisi baru Mar 2018)

### Takeaway
Sendai menghitung orang dievakuasi sebagai terdampak langsung, tetapi mengeluarkannya dari indikator global Target B untuk menghindari hitung ganda. Evakuasi preventif diukur di Target G-6, terpisah dari "penduduk terpapar atau berisiko". Indikator B, C, D memberi daftar komponen yang cocok dengan lima kelompok kita.

### Cited Findings
- [V] Definisi terdampak langsung dan tidak langsung dikutip dari laporan OIEWG; tidak langsung = "consequences, other than or in addition to direct effects, over time due to disruption or changes in economy, critical infrastructures, basic services, commerce, work". — Technical Guidance, Target B, hal. 19 (PDF hal. 19). https://www.preventionweb.net/files/54970_techguidancefdigitalhr.pdf (unduh dengan `?startDownload=true`)
- [V] Evakuasi dikecualikan dari Target B: "The categories of evacuated, displaced, or relocated should not be included in the indicators of this Target as per the conclusions of the OIEWG." — sama, Target B §4, PDF hal. 21.
- [V] Indikator Target B: B-1 terdampak langsung; B-2 luka atau sakit; B-3 orang dengan rumah rusak; B-4 orang dengan rumah hancur; B-5 orang dengan mata pencaharian terganggu atau hancur. — sama, PDF hal. 20.
- [V] Target D: D-2 fasilitas kesehatan, D-3 fasilitas pendidikan, D-4 infrastruktur kritis lain rusak atau hancur; D-6 gangguan layanan pendidikan, D-7 layanan kesehatan, D-8 layanan dasar lain. Unsur yang dihitung "will be left to the Member States". — sama, Target D, PDF hal. 95.
- [V] Target C: C-2 kerugian pertanian (tanaman C-2C, ternak C-2L, hutan C-2FO, akuakultur C-2A, perikanan C-2FI), C-4 perumahan, C-5 infrastruktur kritis. — sama, Target C.
- [V] Evakuasi sebagai terdampak langsung: "Evacuated people are categorized here as directly affected." — sama, Target G, PDF hal. 158.
- [V] Evakuasi preventif: "As 'evacuated' we refer to people who have been required to move at least temporarily from their places of residence to safer places when threatened by a hazardous event." — Indikator G-6, PDF hal. 168. Penyebutnya "population exposed to or at risk", diperkirakan dari penduduk wilayah sasaran peringatan.
- [V] Kosong bukan nol: B-3 "can be directly measured in situ, estimated using a nationally defined methodology, or left blank and estimated by UNISDR based on B-3a". — sama, PDF hal. 24 (pola serupa untuk B-4, hal. 25).

### Inferences
- Rumusan kita menghitung evakuasi preventif sebagai dampak; Sendai mendukungnya secara definisi (terdampak langsung) tetapi tidak di indikator B. Untuk konsistensi dengan Sendai, laporkan evakuasi sebagai isian tersendiri dan jangan menjumlahkannya ke angka terdampak.
- Sendai memisahkan "terpapar/berisiko" (penyebut G-6) dari "dievakuasi" (pembilang). Ini dukungan langsung untuk "orang terancam tidak dihitung".

## 4. IRDR DATA Publication No. 2 (2015)

### Takeaway
IRDR memisahkan "exposed" (penduduk di wilayah bahaya) dari "affected" (yang benar-benar terkena), dan mendefinisikan evakuasi sebagai tindakan berjaga-jaga sebelum, selama, dan sesudah peristiwa. Tidak ada aturan "satu indikator > 0".

### Cited Findings
- [V] Indikator primer: "The five primary human indicators are: deaths, missing, injured, exposed, and economic loss"; homeless, relocated, evacuated, dan affected adalah sekunder. — IRDR (2015), Guidelines on Measuring Losses from Disasters, DATA Project Report No. 2, v1.0, §3, hal. 6. https://climate-adapt.eea.europa.eu/en/metadata/guidances/guidelines-on-measuring-losses-from-disasters-human-and-economic-impact-indicators/11303324/@@download/file
- [V] Exposed: "Number of people who permanently or temporarily reside in the hazard area before or during the event." — §4.4, hal. 12.
- [V] Evacuated: "People who mobilise or are mobilised as a precautionary measure before, during and after the event." — §5.2, hal. 14.
- [V] Affected: "The number of people who were injured or suffered a direct economic loss in the exposed area." Catatan: "Not everyone in the exposed/impact area experiences an impact or suffers a loss." — §5.4, hal. 15.
- [V] Evacuated, homeless, relocated "are not mutually exclusive, and they may involve double counting". — §5, hal. 14.
- [V] Disarankan menyertakan "a quality score or uncertainty level" per angka. — §3, hal. 6.

### Inferences
- IRDR adalah sumber terkuat untuk "terancam/terpapar tidak sama dengan terdampak".
- IRDR mendukung evakuasi berjaga-jaga sebagai indikator dampak manusia (sekunder), tetapi memperingatkan hitung ganda.

## 5. EM-DAT (CRED), pembanding

### Cited Findings
- [V] Ambang masuk: paling sedikit satu dari "At least 10 deaths (including dead and missing). At least 100 affected (people affected, injured, or homeless). A call for international assistance or an emergency declaration." — EM-DAT Documentation, Entry Criteria. https://doc.emdat.be/docs/protocols/entry-criteria/
- [V] Total Affected = jumlah No. Injured, No. Affected, No. Homeless; bila hanya rumah rusak dilaporkan, dikalikan rata-rata ukuran keluarga. Definisi affected "varies across sources and lacks a universal standard". — EM-DAT, Human Impact Variables. https://doc.emdat.be/docs/data-structure-and-content/impact-variables/human/

### Inferences
- EM-DAT adalah ambang bencana skala besar, bukan ambang "ada dampak". Jangan dijadikan padanan; berguna untuk menunjukkan beda tingkat.

## 6. Praktik nasional

### Cited Findings
- [V] AS, SHELDUS: versi 10.0 menghapus ambang US$50.000 dan memuat "all events added that caused any property/crop damage, injuries, or fatalities"; SHELDUS 10.0 "contained every loss causing event between 1960 and 1989 and from 1995 onward". — ASU CEMHS, SHELDUS Metadata. https://cemhs.asu.edu/sheldus/metadata
- [V] AS, NOAA Storm Data: mencatat peristiwa "having sufficient intensity to cause loss of life, injuries, significant property damage, and/or disruption to commerce", ditambah fenomena langka dan rekor. — NWSI 10-1605 (26 Jul 2021), §1, hal. 2. https://www.weather.gov/media/directives/010_pdfs/pd01016005curr.pdf
- [V] AS, NOAA kosong bukan nol: "If the dollar amount of damage is unknown, or not available, check the 'no information available' box." — sama, §2.7, hal. 11.
- [V] Cina, 自然灾害情况统计调查制度 (2020): laporan awal 2 jam memuat 受灾人口, 因灾死亡失踪人口, 紧急转移安置人口, 需紧急生活救助人口; selama bencana berlangsung berlaku "24 小时零报告制度", yaitu lapor tiap 24 jam "即使数据没有变化也须上报". — Biro Statistik Nasional. https://www.stats.gov.cn/fw/bmdcxmsp/bmzd/202302/t20230215_1907019.html
- [V] Cina, 紧急转移安置人口 dalam rencana bantuan daerah: orang yang "不能在现有住房中居住，需由政府进行转移安置" dan diberi bantuan hidup sementara. — Rencana bantuan bencana Yinchuan (2024). https://www.yinchuan.gov.cn/xxgk/bmxxgkml/szfbgt/xxgkml_1841/zfwj/yzbf/202411/P020241119353357981236.pdf
- [S] Cina, draf GB/T 24438.1 memisahkan 紧急避险转移人口 (evakuasi menghindar bahaya) dari 紧急转移安置人口. — Shaanxi, cuplikan pencarian. https://yjt.shaanxi.gov.cn/hd/yjzj/202506/P020250609521555589002.pdf
- [S] Filipina, sitrep NDRRMC melaporkan "pre-emptively evacuated" di bagian tersendiri, terpisah dari "affected population". — contoh sitrep Ulysses 2020. https://archive.org/download/ndrrmc-sitrep-20/NDRRMC_20-25W_Ulysses_SitRep%2302.pdf

### Inferences
- SHELDUS adalah contoh basis data nasional yang memakai aturan "kerugian > 0 atau korban" secara eksplisit.
- Cina dan Filipina sama-sama mencatat evakuasi preventif sebagai isian terpisah.

## 7. Kosong lawan nol

### Takeaway
Tidak ada pedoman internasional yang menulis kalimat "kosong bukan nol" secara umum. Praktiknya konsisten: Sendai TG (biarkan kosong, diperkirakan), DesInventar Sendai (jangan isi bila tidak disebut; kotak centang terpisah dari angka), NOAA (kotak "no information available"), IRDR (skor mutu per angka).

## Ringkasan dukungan per bagian rumusan

| Bagian | Dukungan | Sumber terbaik |
| --- | --- | --- |
| Lima kelompok | Kuat (padanan) | DesInventar 4 kelompok + sektor kualitatif; Sendai B, C-2, D |
| Ambang > 0 pada satu isian | Sedang: tersirat, tidak harfiah | DesInventar "some kind of affect"; UNDRR "one or more"; SHELDUS "any" |
| Terancam tidak dihitung | Kuat | IRDR exposed lawan affected; Sendai G-6 |
| Evakuasi preventif dihitung | Sedang: dihitung sebagai terdampak langsung, dikeluarkan dari B-1 | UNDRR affected/evacuation; Sendai TG G hal. 158 dan B hal. 21; IRDR §5.2 |
| Kosong bukan nol, "menunggu data" | Sedang: praktik | Sendai TG hal. 24; DesInventar Sendai hal. 25, 27; NWSI 10-1605 §2.7 |

## Gaps
- Tidak ditemukan standar yang menulis aturan "≥1 isian > 0" atau status antara "menunggu data" dengan nama itu.
- Lahan terbakar (ha) sebagai efek tidak tertulis khusus; DesInventar "Crops and woods" mencakup hutan "destroyed or affected", Sendai C-2FO kehutanan.
- "Rumah terendam" tidak ada di DesInventar atau Sendai sebagai kategori sendiri.
- Definisi indikator resmi Cina (附录 指标解释) dan teks NDRRMC Memorandum Circular tidak terbaca.
- Aturan nilai -1 ("ada, angka tidak diketahui") di DesInventar klasik tidak ditemukan di dokumen yang dibuka.
