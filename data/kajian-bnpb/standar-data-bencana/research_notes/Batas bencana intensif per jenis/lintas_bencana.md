# Skema keparahan bencana lintas jenis (all-hazard) dengan ambang angka

Catatan riset 19 Nov 2026. Tanda: [V] = dibaca langsung dari teks sumber primer (PDF/halaman resmi diunduh dan diekstrak); [S] = hanya dari ringkasan mesin pencari atau sumber sekunder, belum dibaca di teks asli. Akses langsung ke preventionweb.net, pia.gov.ph, dan wikipedia diblokir (Cloudflare challenge / DNS gagal) selama sesi ini, sehingga beberapa butir GAR tetap [S].

## (a) Definisi intensif/ekstensif GAR: teks, sejarah, satuan, rumah rusak vs hancur, orang hilang

### Takeaway
Ambang yang dipakai pemilik (>=30 tewas ATAU >=600 rumah hancur per laporan kerugian tingkat lokal) terkonfirmasi di GAR 2015 Annex 2 [V]; GAR 2011 memakai 25 tewas ATAU 600 rumah hancur [S]. "Houses destroyed" di DesInventar/GAR berarti rumah tak layak huni (rata, terkubur, roboh, atau rusak sampai tak bisa dihuni), dan "houses damaged" (rusak ringan, masih bisa ditinggali) TIDAK ikut ambang. Nomor "Box 4.1" tidak berhasil diverifikasi.

### Cited Findings
- [V] GAR 2015 Annex 2, bagian analisis risiko ekstensif: "mortality and destruction of houses were used to define the thresholds, which were set at 30 people killed and 600 houses destroyed." Konteks kalimat sebelumnya: empat latihan pada basis data kerugian nasional (merujuk GAR 2011 Annex II) mencari batas di mana sejumlah kecil bencana mengakumulasi mortalitas dan kerusakan maksimum; karena valuasi ekonomi tidak konsisten, dipakai mortalitas dan rumah hancur. — [UNISDR GAR 2015 Annex 2 Loss Data and Extensive Risk Analysis (PDF)](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf)
- [V] Dampak ambang: dengan ambang ini 0,86% catatan bencana (intensif) mengakumulasi sekitar 87% total kematian dan 84% rumah hancur; kerusakan rumah, aset pertanian, layanan publik, dan kerugian ekonomi terdistribusi sangat berbeda (lebih banyak di ekstensif). — [GAR 2015 Annex 2 (PDF)](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf)
- [V] Definisi variabel dataset konsolidasi GAR (82 negara, basis DesInventar): "Houses Destroyed: The number of homes submerged, levelled, buried, collapsed or damaged to the extent that they are no longer habitable." "Houses Damaged: The number of homes with minor damage, not structural or architectural, which may continue being lived in, although they may require some repair or cleaning." Indikator manusia mencakup "fatalities, injured, missing, evacuated, relocated, affected". — [GAR 2015 Annex 2 (PDF)](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf)
- [V] Catatan kaki definisi risiko ekstensif (UNISDR Terminology 2009): risiko meluas dari paparan populasi tersebar terhadap kondisi bahaya berulang/menetap berintensitas rendah atau sedang, sering sangat lokal, yang dapat menimbulkan dampak kumulatif yang melemahkan; rujukan "See GAR 2009, GAR 2011, GAR 2013". — [GAR 2015 Annex 2 (PDF)](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/Annex2-Loss_Data_and_Extensive_Risk_Analysis.pdf)
- [S] GAR 2011: ambang "25 deaths or 600 houses destroyed in any one local level loss report" (satuan = satu laporan kerugian tingkat lokal, umumnya kotamadya/kabupaten di DesInventar). — [GAR 2011 Extensive disaster risk trends](https://www.preventionweb.net/english/hyogo/gar/2011/en/what/extensive.html) (halaman diblokir Cloudflare saat diunduh; kutipan dari ringkasan pencarian)
- [S] Tabel ringkas GAR 2015 (Pocket GAR/data platform): "Less than 30 people killed" = ekstensif, "30+ people killed" = intensif; analog untuk 600 rumah hancur. — [Pocket GAR 2015 (PDF)](https://www.preventionweb.net/english/hyogo/gar/2015/en/gar-pdf/GAR15_Pocket_EN.pdf); [PreventionWeb: Intensive and extensive risk](https://preventionweb.net/risk/intensive-extensive-risk)
- [S] GAR sendiri menyatakan ambang arbitrer: "There is no agreed measured distinction between intensive and extensive risk and any quantified threshold between these is arbitrary." — [PreventionWeb: Understanding disaster risk, intensive and extensive risk](https://preventionweb.net/risk/intensive-extensive-risk)

### Inferences
- Karena ambang dihitung per "local loss report", penerapannya per kab/kota per kejadian sejalan dengan maksud GAR (satu kejadian yang mengenai beberapa kab/kota bisa intensif di satu kab dan ekstensif di kab lain).
- Untuk data BNPB (DIBI: rumah rusak berat/sedang/ringan), padanan paling dekat "houses destroyed" adalah rusak berat (tak layak huni); rusak sedang/ringan setara "houses damaged". Ini inferensi, bukan aturan GAR tertulis; GAR tidak menyebut "heavily damaged" secara eksplisit, tetapi frasa "damaged to the extent that they are no longer habitable" mengarah ke rusak berat.
- Orang hilang ("missing") adalah variabel terpisah di GAR/DesInventar; teks ambang hanya menyebut "people killed", jadi secara harfiah orang hilang tidak dijumlahkan. Bila BNPB menjumlahkan meninggal+hilang, itu penyimpangan yang perlu ditulis eksplisit.
- Perubahan 25 -> 30 tewas (2011 -> 2015) kemungkinan hasil kalibrasi ulang pada dataset yang lebih besar (82 negara); belum diverifikasi teks Serje 2010.

### Gaps
- Teks persis "Box 4.1" GAR 2015 bab 4 belum terbaca; nomor box tidak terkonfirmasi (ambang terkonfirmasi di Annex 2).
- Background paper Serje (2010) dan metode GAR 2009 (penentuan ambang awal) tidak berhasil diakses.
- GAR 2019/2022/2025: tidak ditemukan bukti bahwa ambang diubah atau dipakai ulang; belum diperiksa langsung.

## (b) Skema keparahan lintas bencana lain

### Takeaway
Skema yang paling bisa diadopsi sebagai indikator tak tergantung skala adalah Jepang (rumah hancur relatif terhadap jumlah penduduk kotamadya; kerugian fasilitas publik relatif terhadap pendapatan pajak standar daerah), Korea (kerugian relatif terhadap kapasitas fiskal, 2,5x ambang bantuan nasional), dan Filipina (persentase penduduk butuh bantuan/mata pencaharian terdampak). Ambang asuransi/basis data global (EM-DAT, Swiss Re) adalah ambang masuk catatan, bukan keparahan.

### Cited Findings

**Jepang: 激甚災害 (Gekijin, bencana dahsyat) — ukuran dampak fiskal relatif, untuk tingkat bantuan keuangan**
- [V] Honge­ki (nasional), fasilitas publik, Kriteria A: estimasi biaya pemulihan fasilitas publik > pendapatan pajak standar nasional × 0,5%. Kriteria B: > × 0,2% DAN (satu prefektur dengan estimasi > 25% pendapatan pajak standar prefektur itu, ATAU total estimasi kotamadya dalam prefektur > 5% total pendapatan pajak standar kotamadya). — [内閣府 防災: 激甚災害制度について (PDF)](https://www.bousai.go.jp/taisaku/gekijinhukko/pdf/index_01.pdf)
- [V] Honge­ki, lahan pertanian: A: biaya pemulihan lahan pertanian > estimasi pendapatan pertanian nasional × 0,5%; B: > × 0,15% DAN (satu prefektur > 4% pendapatan pertanian prefektur ATAU > 1 miliar yen). — [内閣府 激甚災害制度 (PDF)](https://www.bousai.go.jp/taisaku/gekijinhukko/pdf/index_01.pdf)
- [V] Kyokugeki (lokal, per kotamadya): "当該市町村が負担する公共施設災害復旧事業費等の査定事業額 ＞ 当該市町村の標準税収入×50%" (biaya pemulihan fasilitas publik yang ditanggung kotamadya > 50% pendapatan pajak standarnya; kecuali < 10 juta yen); untuk kotamadya berpajak standar <= 5 miliar yen dengan biaya > 250 juta yen ambangnya 20%; total kotamadya yang memenuhi < ~100 juta yen dikecualikan. Lahan pertanian: biaya pemulihan > estimasi pendapatan pertanian kotamadya × 10%. Kehutanan: kerugian > 1,5 × pendapatan kehutanan produktif kotamadya, dan untuk kebakaran besar luas pemulihan > 300 ha. — [内閣府 激甚災害制度 (PDF)](https://www.bousai.go.jp/taisaku/gekijinhukko/pdf/index_01.pdf)
- [V] Bila estimasi jelas > 2x ambang, kyokugeki ditetapkan segera ("早期局激"); selainnya di akhir tahun fiskal. — [内閣府 激甚災害制度 (PDF)](https://www.bousai.go.jp/taisaku/gekijinhukko/pdf/index_01.pdf)

**Jepang: 災害救助法 (UU Bantuan Bencana) 施行令 第1条 — ambang rumah relatif populasi, tingkat respons**
- [V] Tabel 令別表第1 (kotamadya): penduduk <5.000 -> 30 rumah tangga dengan rumah hilang/hancur; 5.000–15.000 -> 40; 15.000–30.000 -> 50; 30.000–50.000 -> 60; 50.000–100.000 -> 80; 100.000–300.000 -> 100; >=300.000 -> 150. — [内閣府 災害救助法の概要 (PDF)](https://www.bousai.go.jp/oyakudachi/pdf/kyuujo_b5.pdf)
- [V] Konversi: "半壊又は半焼した世帯は、２世帯をもって滅失した一の世帯とする。床上浸水した世帯は、３世帯をもって滅失した一の世帯とする。" (setengah hancur/terbakar = 1/2; banjir di atas lantai = 1/3 rumah hancur). — [内閣府 (PDF)](https://www.bousai.go.jp/oyakudachi/pdf/kyuujo_b5.pdf)
- [V] Jalur kedua (第2号): prefektur penduduk <1 juta >=1.000 rumah hancur (1–2 juta: 1.500; 2–3 juta: 2.000; >=3 juta: 2.500) DAN kotamadya mencapai setengah tabel pertama (15/20/25/30/40/50/75). Jalur ketiga (第3号): prefektur <1 juta >=5.000; 1–2 juta 7.000; 2–3 juta 9.000; >=3 juta 12.000, dan kotamadya "banyak". Jalur keempat: keadaan khusus (mis. bantuan sulit, terisolasi) dengan banyak rumah hancur. — [内閣府 (PDF)](https://www.bousai.go.jp/oyakudachi/pdf/kyuujo_b5.pdf)

**Korea Selatan: 특별재난지역 (Kawasan Bencana Khusus) — dampak relatif kapasitas fiskal**
- [V] Tabel Kementerian Dalam Negeri dan Keselamatan (MOIS): ambang bantuan nasional (국고지원기준) per indeks kapasitas fiskal 시군구: <0,1 -> 2,6 miliar won; 0,1–0,2 -> 3,3; 0,2–0,4 -> 4,1; 0,4–0,6 -> 4,9; >=0,6 -> 5,7 miliar won. Ambang penetapan (선포기준) 시군구 = 6,5 / 8,25 / 10,25 / 12,25 / 14,25 miliar won (2,5x ambang bantuan); 읍면동 = 0,65 / 0,825 / 1,025 / 1,225 / 1,425 miliar won. — [MOIS 재난복구 개요](https://mois.go.kr/frt/sub/a06/b11/recoveryOverview/screen.do)
- [S] Rumus umum: bencana alam ditetapkan bila kerugian > 2,5x ambang bantuan nasional per daerah; bencana sosial bila daerah tak mampu menangani secara administratif/fiskal; dasar hukum UU 재난안전법 제60조; nilai dinaikkan ~2024 (sebelumnya 시군구 45–105 miliar won). — [Newsis 2024](https://www.newsis.com/view/NISX20240719_0002818050); [Newsis 2022](https://mobile.newsis.com/view/NISX20220901_0001999045)

**Filipina: State of Calamity, NDRRMC Memorandum Order No. 60 s. 2019 — persentase, tingkat deklarasi**
- [S] Kriteria (cukup satu terpenuhi menurut penjelasan PIA): >=15% populasi terdampak (terprakirakan) membutuhkan bantuan darurat; >=30% mata pencaharian (pertanian, usaha, industri) terdampak; kerusakan infrastruktur kritis; degradasi lingkungan/wabah. Deklarasi membuka akses Quick Response Fund (30% dana DRRM). — [PIA: What happens when a local gov't declares a state of calamity](https://pia.gov.ph/news/what-happens-when-a-local-govt-declares-a-state-of-calamity/); [PIA Pampanga](https://pia.gov.ph/news/pampanga-placed-under-state-of-calamity-due-to-damage-from-destructive-cyclones/)
- [S] Kriteria lama (sebelum 2019, dipakai 2018 untuk Ompong): minimal 2 dari 5 kondisi, termasuk >=20% populasi terdampak. — [Philstar 2018](https://www.philstar.com/nation/2018/09/22/1853500/declare-state-calamity-4-regions-duterte-asked)

**China — tingkat respons nasional (bukan klasifikasi dampak per kab)**
- [S] UU Tanggap Darurat: empat tingkat 特别重大(I)/重大(II)/较大(III)/一般(IV). Standar uji coba 国家特别重大、重大突发公共事件分级标准 (2006): gempa 特别重大 = >=300 tewas atau kerugian ekonomi langsung >1% PDRB provinsi tahun lalu; 重大 = 50–300 tewas; cuaca 特别重大 = >=30 tewas atau >50 juta yuan. — [safehoo: 国家特别重大、重大突发公共事件分级标准(试行)](https://www.safehoo.com/Emergency/mem/202110/5653923.shtml)
- [S] 自然灾害调查评估暂行办法 (Dewan Negara): banjir bandang, aliran debris, longsor, kebakaran hutan dengan >=30 meninggal+hilang termasuk yang dikaji pusat. — [MOFCOM: 自然灾害调查评估暂行办法](https://policy.mofcom.gov.cn/claw/clawContent.shtml?id=103656)

**Basis data/asuransi internasional — ambang masuk catatan**
- [S] EM-DAT: minimal satu dari: >=10 tewas, >=100 terdampak, deklarasi keadaan darurat, permintaan bantuan internasional; "affected" = orang yang butuh bantuan segera saat darurat. — [IFRC WDR 2022 Methodology (PDF)](https://www.ifrc.org/sites/default/files/2023-03/20230130_2022_WDR_Methodology.pdf); [Delforge dkk. EM-DAT (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2212420925003334)
- [S] Swiss Re sigma: >=20 tewas atau hilang, >=50 luka, >=2.000 kehilangan tempat tinggal, atau kerugian di atas ambang (2021: ekonomi 111,7 juta USD; diasuransikan lain 55,8 juta USD; disesuaikan inflasi tiap tahun). — [Swiss Re sigma 1/2022 (PDF)](https://www.swissre.com/dam/jcr:8a467970-b803-4783-8b92-63f62685d93b/swiss-re-institute-natcat-sigma-2022.pdf)

### Inferences
- Skema relatif yang paling mudah dipindah ke kab/kota Indonesia: (1) rumah hancur setara (berat + 1/2 sedang? + 1/3 terendam) dibagi kelas penduduk ala Jepang; (2) biaya pemulihan / PAD atau pendapatan daerah ala Jepang-Korea; (3) persen penduduk mengungsi/butuh bantuan >=15% ala Filipina.
- Jepang dan Korea mengukur dampak relatif kapasitas (impact severity untuk bantuan fiskal), Filipina dan Saigai Kyujo Ho memicu respons; China 4 tingkat adalah tingkat respons absolut nasional; EM-DAT/Swiss Re adalah ambang pencatatan absolut. GAR adalah ambang absolut per laporan lokal.
- Ambang Swiss Re (20 tewas/hilang) menjumlahkan hilang, berbeda dari GAR yang hanya tewas.

### Gaps
- Teks asli NDRRMC MO 60 s.2019 tidak berhasil diakses (PIA diblokir Cloudflare).
- Standar China 《自然灾害分级》 (GB/T) dan ambang 2024 国家自然灾害救助应急预案 (mis. "200 tewas+hilang", "2 juta mengungsi") tidak terverifikasi; angka di prompt tidak dikonfirmasi.
- IFRC Emergency Response Framework (kuning/oranye/merah), Munich Re NatCatSERVICE kelas 0–5 per kelompok pendapatan, INFORM Severity, PDNA Bank Dunia, Taiwan, Italia, Meksiko (FONDEN), Kolombia, Peru: tidak sempat/berhasil ditemukan sumber primernya dalam batas sesi.
- Indikator durasi pengungsian, putusnya lifeline (listrik/air/telekomunikasi), dan desa terisolasi dengan angka resmi: tidak ditemukan selain klausul "keadaan khusus/terisolasi" di Saigai Kyujo Ho jalur keempat (tanpa angka) dan "kerusakan infrastruktur kritis" di Filipina (tanpa angka [S]).
