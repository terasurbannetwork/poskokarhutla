# baca-C: dashboard Karhutla Decision Studio dan percakapan ChatGPT pemilik

Dibaca 24 Oktober 2026. Dua sumber: (1) `/Users/alfatehanseptianta/Downloads/Karhutla_Decision_Dashboard.html` (1.363 baris, dibaca habis, mesin hitungnya juga dijalankan ulang dengan Node untuk memeriksa angka); (2) tautan bagikan ChatGPT "Riset Grand Design Karhutla" (27 pesan, dibaca habis lewat panel Browser). Dibandingkan dengan `KRITIK-DAN-KEPUTUSAN.md` (disingkat KD), `baca-A.md`, `baca-B.md`.

Catatan keterbatasan, jujur:

- Percakapan: halaman awalnya hanya memuat kerangka ("Skip to content"); setelah dimuat, 27 simpul pesan terbaca penuh lewat JavaScript. Pesan assistant bernomor 1, 3, 5, 7, 9, 11, 15, 17 kosong (isinya panel Deep Research yang tidak ikut dibagikan). **Hasil Deep Research itu sendiri tidak ada di tautan.** Tiga gambar yang diunggah pemilik (pesan 13, 14, 23) dan dua berkas unggahan (pesan 0, 19) tidak terlihat; "Grand Design" yang dijadikan inspirasi di pesan 19 tidak diketahui isinya.
- Dashboard: hanya berkas HTML. ZIP berisi dokumentasi dan "pengujian otomatis" yang disebut di chat tidak ada, jadi klaim "lolos uji otomatis" tidak bisa diperiksa.
- Angka bertanda [jalan-ulang] saya hitung dengan menjalankan `KarhutlaEngine` bawaan berkas itu pada keadaan awal (`defaultState`). Semua angka dalam mesin itu adalah asumsi pemilik, bukan data lapangan.

---

## C1. Dashboard "Karhutla Decision Studio v1.0"

### C1.1 Bentuk

Satu berkas HTML, tanpa server, tanpa jaringan, data disimpan di `localStorage`. Sidebar kiri berisi pilihan, panel kanan menghitung ulang seketika. Label "Mode studi pra-FEED": parameter lokasi adalah asumsi skenario, bukan survei; tidak boleh jadi DED, dokumen pengadaan, izin operasi, atau pengganti uji pompa.

- **32 dimensi kategorikal dengan 100 pilihan** [jalan-ulang]. Teks di layar masih menulis "30 dimensi dan 93 pilihan" (basi); nama CSV "Matriks 100 opsi".
- **36 parameter numerik** (debit sumber, luas, air/ha, panjang jaringan/cabang, OD, elevasi, ΣK, tekanan sisa, suhu pipa, debit sistem, jumlah pompa, efisiensi, regu, produktivitas, jam shift, upah, hari/tahun, jam pompa, sekat kanal, manfaat/tahun, ha terbukti padam, diskonto, jam heli, 5 bobot, horizon, kontingensi, pengali harga, harga solar/bensin/listrik).
- **8 grup sidebar:** Wilayah & kelayakan, Sumber air & hidrologi, Arsitektur, Pompa & tenaga, Pemantauan & respon, Multi-guna & ekologi, Logistik & pemeliharaan, Anggaran & horizon.
- **9 tab:** Ringkasan keputusan, Bandingkan pilihan, A vs B langsung, Hidraulika & formula, Biaya & BOQ, Risiko & gates, Simulasi & sensitivitas, Matriks 93 [sic, 100] pilihan, Data & panduan.
- **Aksi:** Simpan JSON, Impor, Simpan konfigurasi A, Cetak PDF, BOQ CSV, Matriks 100 opsi CSV, Reset. Tiga preset arsitektur: Portable (S1), Semi-permanen (S2), Backbone permanen (S3).

Dimensi pilihan (ringkas): tipologi lokasi (kanal/jalan/kubah/terpencil), akses (jalan 4x4/darat+sungai/perahu/portage), ketebalan gambut, muka air, banjir, paparan panas trase, tipe ancaman (permukaan/bara/campuran), status hak air, hak lahan, persetujuan lingkungan, sumber air (kanal/sungai/embung/sumur dalam), taktik (permukaan/injeksi/hibrida/rewetting saja), dukungan udara, arsitektur, bahan (HDPE PE100/layflat/baja berlapis/hibrida), SDR (11/17), penempatan pipa (atas tanah/proteksi lokal/ditanam/dudukan), ujung panas (spool logam/HDPE/jauh dari panas), pompa (diesel/bensin/listrik/hibrida), redundansi, booster, drone (tanpa/RGB/termal), kepadatan sensor, telemetri (offline/LoRa/satelit), rantai deteksi, rewetting, pertanian (tanpa/pilot/jaringan), fungsi banjir (tanpa/sensor/pompa terpisah), gudang (pusat/hub+staging/forward), risiko kehilangan aset, maintenance (reaktif/preventif/prediktif), latihan (dasar/tahunan/triwulan).

### C1.2 Rumus dan konstanta mesin (`assess`)

| Hitungan | Rumus / nilai | Catatan |
| --- | --- | --- |
| ID pipa | HDPE: OD x (1 - 2/SDR); layflat 0,96 OD; baja 0,91 OD | OD200 SDR11 -> ID 163,6 mm |
| Koefisien C | HDPE 135; layflat dan baja 120; hibrida: 78% HDPE (135) + 22% layflat (120) | KD K-02 memakai C=130/140 |
| Derating suhu HDPE | 1 - 0,014 x (T - 20), batas 0,58 sampai 1 | pada 35 C = 0,79 |
| Head friksi | Hazen-Williams SI: 10,67 L Q^1,852 / (C^1,852 D^4,871) | satu trunk ekuivalen |
| Head minor | ΣK v^2 / 2g (K awal 5) | |
| TDH | Δz + hf + hm + tekanan sisa (bar -> m) + 3,5 m (hisap/filter) | |
| Daya poros | ρ g Q TDH / η (η awal 0,65, batas 0,35-0,9) | HP = kW / 0,7457 |
| Air per operasi | luas (ha) x m3/ha (awal 5 ha x 600) | 3.000 m3 -> 25 jam pada 2.000 LPM |
| Air bersih | Q andal - Q ekologi (awal 70 - 10 L/s) -> LPM; NO-GO bila < debit pompa | tidak ada faktor 1,5x |
| Solar | L/jam = kW poros x 0,27 / 0,84 | bensin: 22 L/jam per pompa (contoh Tohatsu) |
| Listrik | kW poros / 0,91 | |
| CO2 BBM saja | solar 2,68 kg/L; bensin 2,31 kg/L | tanpa gambut, tanpa siklus hidup |
| Produktivitas gelar | crewSpeed (75 m/jam) x pipeMult / logistikMult / gambutMult x (regu/8)^0,45 | pipeMult: baja 0,30, HDPE 0,72, hibrida 0,80, layflat 1,15, x0,48 bila ditanam, x0,40 bila dudukan; logistik: jalan 1, campur 1,5, perahu 1,9, terpencil 2,8; gambut dalam 1,65, menengah 1,25 |
| Jam instalasi | L / m-per-jam + 8 + cabang / max(10, 0,8 x m-per-jam) | hari = jam / jam shift |
| Waktu siap | jam gelar insiden + jam dispatch (jalan 3, campur 6, perahu 9, terpencil 16; x0,72 forward, x0,90 split) | portable: gelar penuh; semi: 3 jam + cabang; backbone: 1 jam + cabang |
| Pompa cukup? | HP poros <= unit x HP placeholder (bensin 75, listrik 100, hibrida 85, diesel 110) x 0,85 | bukan kurva Q-H |
| CAPEX | Σ(qty x harga) x pengali harga x (1 + kontingensi, awal 20%) | 40+ item BOQ |
| OPEX | energi + upah (regu x upah x hari) + servis (2,5% / 4,2% / 5,5% dari direct) + patroli drone + telemetri + keamanan + logistik + latihan + udara | awal: upah Rp250 rb x 10 orang x 35 hari |
| TCO | CAPEX + horizon x OPEX | nominal, tanpa diskonto |
| NPV / BCR | NPV = (manfaat - OPEX) x faktor anuitas - CAPEX; BCR = PV manfaat / (CAPEX + PV OPEX); impas = OPEX + CAPEX / faktor anuitas | diskonto awal 8%, horizon 5 th, **manfaat awal = 0** |
| Biaya per ha terbukti | OPEX / ha terbukti padam per tahun | **hanya OPEX, tanpa CAPEX** |
| Kesiapan (reliab) | 0,97 - (maintenance: 0,12 / 0,055 / 0,02) - (redundansi: 0,08 / 0,035 / 0,005) - 0,06 terpencil - 0,045 banjir tinggi | heuristik, diakui bukan statistik |
| Skor preferensi | rata-rata berbobot: biaya 25, keselamatan 30, efektivitas 25, akses 10, lingkungan 10; modal = 100/(1+CAPEX/6 M) | **tidak bisa meluluskan NO-GO** |
| Risiko screening | 20 x keras + 6 x bersyarat + 2 x catatan + 8 (terpencil) + 6 (keamanan tinggi), maks 100 | |
| Monte Carlo | 800 sampel, pengali seragam: CAPEX 0,78-1,28; BBM 0,65-1,40; upah 0,70-1,45; operasi lain 0,75-1,35 | P10/P50/P90 TCO |
| Sensitivitas | OD +-40, debit +-500, elevasi +-10, debit sumber +-20, panjang +-500, air/ha +-200 | |

### C1.3 Logika keputusan (keras / bersyarat / catatan)

Keputusan hanya tiga: **NO-GO** (ada satu hambatan keras), **HOLD / VALIDASI** (tidak ada keras, ada syarat belum terpenuhi), **KONDISIONAL** (tidak ada keduanya; teks layar "dapat dilanjutkan ke verifikasi FEED"). Tidak ada status "GO". Skor tidak menggantikan gerbang.

Hambatan keras: air bersih < debit pompa; izin air "tidak berizin"; hak lahan sengketa; persetujuan lingkungan ditolak; panas ekstrem + pipa termoplastik terbuka (bukan baja); rewetting saja padahal ada api aktif; ujung HDPE pada bara; daya poros melebihi rating pompa placeholder; **tekanan hitung > 88% x PN x derating suhu** (PN16 untuk SDR11, PN10 untuk SDR17).

Syarat bersyarat (contoh): izin air/hak lahan/lingkungan "sedang diperiksa"; sumur dalam butuh uji debit dan izin; pompa banjir perlu analisis pelepasan air; booster butuh NPSH, relief, transien; pompa bensin = rating placeholder; kecepatan > 3 m/s (water hammer); WTD kering -> prioritas rewetting; pipa ditanam di gambut dalam (subsiden); backbone terbuka di rawan pencurian; banjir tinggi + pipa ditanam (flotasi); helikopter = kontrak terpisah; tekanan sisa < 1 bar; backbone di puncak kubah gambut; pertanian tidak boleh menambah drainase; kanal pada WTD kering harus diukur kemarau.

Catatan lunak: drone termal tidak mengonfirmasi padam di kedalaman; backbone untuk api kecil berpindah = overinvestment; HDPE terbuka sensitif panas; maintenance reaktif = downtime.

Gerbang tahap (tab Risiko): G0 hukum dan masyarakat; G1 sumber air (Q90/Q95, neraca ekologi, kualitas); G2 topografi (DEMNAS + RTK); G3 kebenaran lapangan gambut (auger, WTD multi-sumur, suhu multi-kedalaman); G4 peralatan (Q-H/NPSH vendor, surge, uji tekanan); G5 efektivitas lapangan (A/B berpasangan, nyala ulang 7/30/90 hari, air per ha, biaya per ha terverifikasi); G6 kesiapsiagaan (latihan tahunan TNI/YonTP-BPBD-Manggala Agni, log BBM dan maintenance).

### C1.4 Skenario dan hasil [jalan-ulang]

| | Portable (S1) | Semi (S2) | Backbone (S3) |
| --- | --- | --- | --- |
| Konfigurasi preset | 800 m + 400 m cabang; layflat; 2 pompa bensin; di atas tanah | 1.500 m + 500 m; hibrida; 1 diesel; proteksi lokal | 5.000 m + 900 m; HDPE; 2 diesel; ditanam |
| CAPEX (kontingensi 20%) | **Rp5,23 M** | **Rp9,69 M** | **Rp19,77 M** |
| OPEX per tahun | Rp745 jt | Rp768 jt | Rp1,152 M |
| TCO 5 tahun | Rp8,96 M | Rp13,53 M | Rp25,54 M |
| Tekanan / daya | 4,03 bar / 27,7 HP | 5,39 bar / 37,0 HP | 10,75 bar / 73,9 HP |
| Jam gelar penuh | 41,7 jam | 87,3 jam (kit tetap sudah ada) | 529,8 jam (sudah ada) |
| Waktu siap | 47,1 jam | 19,6 jam | 10,1 jam |
| Status awal | HOLD | HOLD | HOLD |

Keadaan awal (semi): status HOLD, 0 hambatan keras, 5 bersyarat; TDH 54,9 m; kecepatan 1,58 m/s; ID 163,6 mm; skor 69,6; risiko 38; kesiapan 88%; manfaat impas Rp3,19 M per tahun; NPV -Rp12,76 M (karena manfaat 0); Monte Carlo TCO P10/P50/P90 = Rp12,06 / 14,10 / 16,07 M (deterministik Rp13,53 M). Teks chat: CAPEX Rp9,69 M, OPEX Rp768,5 jt, TCO Rp13,53 M, tekanan 5,39 bar, impas Rp3,19 M: cocok dengan jalan-ulang.

Uji cocok-silang dengan KD K-02 [jalan-ulang]: HDPE OD160 SDR11, 2.000 LPM, 2 km, naik 10 m, sisa 2 bar, K=5: ID 130,9 mm, hf 89,0 m, TDH 124,5 m, 12,2 bar, 84 HP, dan **mesin memberi NO-GO tekanan** (melewati 88% x PN16 x 0,79). KD memberi hf 96 m dan 12,4 bar (C=130). Jadi mesin pemilik sudah sejalan dengan kritik kami soal OD vs ID. OD200: ID 163,6 mm, hf 30,0 m, 6,33 bar, 43,5 HP, lolos.

### C1.5 BOQ dan harga satuan (COST dan QBASE)

Hanya tiga harga bertanda "publik terdahulu": pompa VE1500W Rp190.781.250, HDPE OD200 Rp1.162.050/m dan OD110 Rp351.350/m, drone Matrice 4T Rp111.217.000. Sisanya "asumsi engineering". Item yang tidak ada di kit KD: pickup 4x4 Rp440 jt; perahu Rp230 jt; pos pemadam + gudang Rp600 jt/unit; rumah pompa elevasi Rp400 jt/unit; paket keamanan (pagar, CCTV, tag) Rp110 jt; forward base Rp320 jt; hub Rp150 jt; koordinasi udara Rp55 jt; pompa cadangan; spool logam ujung panas Rp9 jt x (5 x regu/2); sumur dalam Rp950 jt; embung Rp540 jt; intake sungai Rp160 jt; spillway Rp125 jt/unit; sekat kanal Rp65 jt/unit; pilot pertanian Rp140 jt; pompa banjir Rp250 jt; survei Rp180 jt; izin Rp160 jt; pilot A/B Rp250 jt; pelatihan Rp85 jt; APD Rp140 jt/paket; baja berlapis Rp3,1 jt/m (OD160); ditanam Rp225 rb/m; dudukan Rp880 rb/m; armor lokal 10% panjang.

### C1.6 Sumber data yang disebut (tab "Data & panduan")

BIG DEMNAS (geoservices.big.go.id), BWS Kalimantan II / PU (sda.pu.go.id), KLH/Kemenhut/DLH (geoportal.menlhk.go.id), NASA FIRMS, BMKG (data.bmkg.go.id), InaRISK BNPB, tanahair.indonesia.go.id, koordinasi YonTP/TNI lewat permohonan resmi. Rujukan HDPE: PE100+ (umur layanan, derating suhu); ITPC (hidrologi gambut). Enam model yang harus dikalibrasi berikutnya: EPANET/WaterGEMS, MODFLOW + KHG, transien surge, analitik drone, simulasi kejadian diskret logistik, BACI/A-B berpasangan. Enam langkah pemakaian: lokasi -> saring syarat wajib -> pilih arsitektur -> audit TCO dan risiko -> sensitivitas -> simpan keputusan.

### C1.7 Yang dashboard NYATAKAN tidak dilakukannya

Tidak membuktikan efektivitas pemadaman; tidak mengarang manfaat (default 0); tidak mengkalibrasi kurva Q-H, EPANET multi-node, panas gambut, debit ekologi kemarau, fondasi, reliabilitas statistik; "A vs B" hanya perbandingan skenario rekayasa, bukan eksperimen lapangan; tiga angka kesiapan/skor/risiko "bukan probabilitas empiris".

---

## C2. Percakapan ChatGPT (27 pesan), urut waktu

**Pesan 0 (pemilik, mengunggah "Grand Design Sistem Pipa Karhutla.docx").** Ia minta analisis dan "apa lagi yang perlu dibuat dan diriset", target **buku grand design 200 halaman dengan gambar teknik**, semua ide diuji "untuk menemukan teknis yang terbaik, optimal efisiensi dan biaya, efektivitas berhasil", memakai Deep Research. Latar: water bombing, dry ice, OMC "terlalu mahal dan tidak efektif" karena gambut hanya basah di permukaan, bara tetap berasap; harus tim darat menyemprot/memasukkan selang ke bawah; masalahnya sumber air. Idenya: jaringan pipa terintegrasi dari sumber air terdekat ke titik api, air dimasukkan ke tanah untuk membanjiri gambut. Pipa tahan lama (galvanis/stainless); setelah kemarau dipakai **menarik banjir** agar cepat reda dan **irigasi pertanian**. Penyimpanan pipa di **YonTP/Batalion Tenaga Pembangunan**; SDM **TNI** memindah-mindahkan pipa (bongkar-pasang antar daerah). Daftar sekitar 39 pertanyaan: kelayakan; pipa/ukuran/pompa/jumlah/HP/jarak pompa; bentuk T atau lurus; nozzle (ukuran, bercabang?), tekanan bar; genset dan BBM; anggaran total dan per komponen termasuk gudang; "daerah langganan 25 tahun di Kalteng"; ukuran rumah penyimpanan; jarak terjauh gambut terbakar ke sumber air; proses kerja detail; perbandingan biaya dengan metode lain; regu (jumlah, APD); teknik padam gambut; filter (jenis, interval bersih); pressure gauge dan valve; SDM per hektare; radius satu sistem; ukuran selang; penentuan wilayah prioritas; cara mengukur jarak air ke titik api; geolistrik bila tak ada air (gambut bisa 15 m ke bawah); penanganan gambut 5/10/15 m; foam agentic (viskositas?); laju air di pipa 2 km; syarat sumber air; debit pompa; lama padam 1 ha; pasang-bongkar; prioritas titik api; **anggaran total semua wilayah karhutla (bongkar pasang, tak semua titik dipasang sekaligus)**; pencegahan pascapadam; mitigasi/pembasahan; benchmark negara lain; relevansi dan kekurangan ide; biaya operasional per hektare; **hazard contingency plan** (api dengan FRP dan luas tertentu butuh berapa regu, berapa lama, sarana apa).

**Pesan 2.** Assistant: Deep Research dimulai, mengaudit 39 pertanyaan, menuju buku 200 hlm (simulasi hidraulika, spesifikasi, gambar rekayasa, SDM, pemetaan Kalteng, biaya, pilot). Memisahkan "didukung bukti / estimasi rekayasa / wajib uji lapangan".

**Pesan 4, 6, 8, 10, 12.** Assistant menambahkan ke Deep Research: 20 poin strategis (ketahanan pasokan air, dampak hidrologi gambut, keandalan, optimasi lokasi, keselamatan personel, validasi efektivitas, kelayakan skala nasional); kajian kewilayahan dan alternatif (geospasial, hidrologi, riwayat api, citra, FWI, FRP, angin, sumber air, akses; menguji apakah **jaringan modular 2 km** benar-benar paling efektif dan ekonomis atau kombinasi lain lebih unggul); SOP, rencana pelatihan, topografi, pencegahan kebakaran berulang, skenario banjir, pelibatan YonTP di pertanian dan air; enam kelompok kajian (persyaratan kelayakan, perbandingan alternatif, kebutuhan air dan BBM, dampak positif-negatif, risiko dan mitigasi, simulasi dan uji lapangan). Teks butirnya sendiri tidak terlihat.

**Pesan 13-18.** Pemilik mengirim dua tangkapan layar ("Baru cuma ini", "Ini masih gini deh"): Deep Research tampak belum jalan. Assistant memulai ulang dari awal dengan semua kebutuhan digabung dan dokumen awal terlampir, lalu "menyetujui rencana". Hasilnya tidak muncul di tautan.

**Pesan 19 (pemilik, unggah berkas).** "Masukkan semua ke dalam. Kira-kira apa lagi yang bisa lu kaji? Coba tiru Grand Design ini untuk inspirasi juga."

**Pesan 20 (pemilik).** Minta: semua matriks masuk kajian; **sumber data publik/open API yang dibutuhkan untuk mendesain, ambil nilainya langsung bila API terbuka, jelaskan caranya**; gambar teknik masing-masing; spesifikasi tiap komponen "sampai baut"; RAB; formula simulasi dan cara hitung; peta topografi; rancangan rumah simpan pompa dan rumah pemadam (isi peralatan); gambar nozzle, pompa, dll.; jenis sensor, koding, output; cara deteksi dini; pipa tertanam atau di atas tanah, risiko pencurian ("mungkin tak boleh bongkar-pasang"); pemodelan topografi (naik 10 m butuh berapa tekanan), "bikin smart", sistem koding; indikator lahan (kedalaman gambut dll.) dan cara datanya; kajian perbandingan metode: rewetting/canal blocking unggul jangka panjang, pemadaman darat murah dan cepat untuk api permukaan kecil, water bombing untuk lokasi tak terjangkau (BNPB sendiri menyebut tak bisa bergantung pada heli: biaya dan jangkauan), drone termal memperbesar akurasi deteksi dan "directing attack" tetapi bukan pengganti air berdebit tinggi; cara dan formula drone termal.

**Pesan 21 (assistant).** Mengunci scope jadi 10 paket: matriks teknis/produktivitas, data publik dan API, gambar teknik, spesifikasi komponen, RAB/BOQ, formula simulasi, sensor/IoT/kode/dashboard, deteksi dini + drone termal, kajian desain lapangan (tanam vs atas tanah, pencurian, permanen vs modular, proteksi api dan banjir), perbandingan metode (injeksi+pipa, rewetting, water bombing, darat, drone, sumur bor, hibrida).

**Pesan 22 (assistant, hasil).** Sumber data: DEMNAS BIG (0,27 arc-detik ~8 m, EGM2008), NASA FIRMS (CSV, MAP_KEY gratis), BMKG Open Data (kode desa), BMKG Data Online/PTSP, layanan peta KHG, InaRISK BNPB, Open-Meteo historis. Temuan: ketebalan gambut aktual, muka air tanah lokal, debit puncak kemarau, dan daya dukung tanah tidak bisa diketahui dari peta nasional. Paket: DOCX 28 hlm, Excel 16 sheet (36 kebutuhan data, 14 jalur permintaan lembaga, kalkulator), ZIP 6 gambar + kode Python. Contoh hitung: pipa 2 km, ID 160 mm, 2.000 LPM, C=130, naik 10 m: +0,981 bar, hf 35,91 m, tekanan 6,57 bar, 45,2 HP (sisa 2 bar, K=5, η 65%). Jalur data: BWS Kalimantan II (debit), instansi LH (gambut, TMA), BIG (elevasi). Pengakuan: elevasi/debit lokasi pilot belum bisa diisi, harga belum final tanpa RFQ, "tidak mengarang angka".

**Pesan 23 (pemilik, unggah gambar).** Minta: parameter water dan access feasibility; rekomendasi portable vs semi vs backbone; sistem transportasi dan logistik rinci; **simulasi-simulasi penting untuk pengambilan keputusan**; maintenance; jenis BBM; **SOP hulu ke hilir** (pra, saat, pascakebakaran); perimeter-core-verify rinci; isi modul; anggaran masing-masing; prioritas teratas drone termal; maintenance drone, ketahanan terhadap asap, sensor dan kode; **dari A/B testing "kira-kira mana yang keluar sebagai solusinya"**; model simulasi; "**kenapa banjir, pertanian, dan peran YonTP sedikit banget bagiannya**"; **CAPEX skenario angka final, bukan sebagian**; **model Three.js untuk semua**; gambar tiap peralatan; cara rewetting ("tetap harus ada akses ke sumber air") lengkap; material tiap bagian; tutorial pemasangan pipa; pengisian BBM, inventori dan logistik semua sarana; pompa listrik/diesel/jet pump; perpipaan pabrik; **simulasi pemadaman tahunan** dan simulasi oleh TNI.

**Pesan 24 (assistant).** Tiga koreksi teknis: (1) VE1500W bensin RON >= 91, 22 L/jam, 2.050 LPM @ 6 bar, 1.800 @ 8, 1.500 @ 10 -> 2.000 LPM @ 10 bar tidak tercapai satu unit; (2) HDPE OD160 SDR11 tebal 14,6 mm, ID 130,8 mm; (3) rewetting bukan sekadar memompa; PP 57/2016. CAPEX pra-FEED: **Portable Rp4,50 M / OPEX Rp453,68 jt / TCO 5 th Rp6,77 M; Semi Rp11,34 M / Rp663,60 jt / Rp14,66 M; Backbone Rp26,70 M / Rp1,40 M / Rp33,68 M** (kontingensi 20%, tanpa diskonto, eskalasi, nilai sisa). Naskah Word 43 hlm (belum 200), Excel, 9 gambar konsep, model Three.js (3 skenario, ubah debit/diameter/elevasi; layer rumah pompa, pos, pipa, sensor, kanal, sekat, drone, gambut, pertanian), kode Python. Rekomendasi hipotesis: api kecil berpindah -> pompa dan selang portable; berulang + air terverifikasi -> semi dengan cabang portable; koridor risiko tinggi berulang -> backbone setelah studi; pencegahan -> rewetting; deteksi -> drone termal + sensor kedalaman + regu. Menegaskan ini hipotesis, bukan pemenang A/B. Latihan gabungan minimal 1x/tahun (BPBD, Manggala Agni, TNI/YonTP, pengelola air, masyarakat), tanpa membakar.

**Pesan 25 (pemilik).** Minta **dashboard keputusan**: pilih A, lihat dampak ke operasional dan biaya; "aspek apa lagi"; **exhaustive**: jika A maka B C D E, plus/minus; matriks atau, lebih baik, **kode sistem**; hasil **real time**: pilihan di kiri, hasil di kanan. Pertanyaan: "cocoknya pakai HDPE ya? tahan lama? pertimbangkan lokasinya", dan "kalau menurut lu oke dari segi cost benefit analysis ya gas".

**Pesan 26 (assistant).** Rekomendasi: **jangan satu jenis pipa untuk semua lokasi; hibrida.** HDPE PE100/PE100-RC backbone di koridor tetap dengan perlindungan; layflat untuk titik api berpindah; segmen fleksibel + penjangkaran di banjir; segmen logam terlindung dekat bara; backbone terlindung + sambungan terkunci + pemantauan tekanan di rawan pencurian. HDPE umur desain lazim 50 tahun pada kondisi standar, tidak otomatis berlaku di gambut terbakar. Sekat kanal Kalteng terbukti memperbaiki muka air. Aturan dashboard: **pilihan termurah tidak otomatis rekomendasi tertinggi; gagal air/keselamatan/lingkungan/hidraulika = tidak layak.** Menghasilkan Decision Studio: 32 dimensi, 100 alternatif, 9 halaman analisis, simpan A lalu bandingkan B, NO-GO bila debit sumber tidak cukup, HDPE/layflat/baja/hibrida, BOQ, energi, logistik, risiko, topografi, sensitivitas, Monte Carlo, NPV/BCR/impas. Nilai manfaat sengaja 0 sampai ada bukti pilot. Contoh: semi Rp9,69 M, OPEX Rp768,5 jt, TCO Rp13,53 M, 5,39 bar, impas Rp3,19 M/th, status HOLD. Pengakuan: prototipe, belum diuji di antarmuka browser secara menyeluruh, belum divalidasi data pilot.

---

## C3. Daftar GAP terhadap KD, baca-A, baca-B

Skala "KD menutup": tidak ada / sebagian / berbeda. Penanda: **[PUTUSAN]** = mengubah atau menggeser vonis GO/NO-GO atau gerbang; **[BIAYA]** = mengubah angka biaya.

| No | Isi sumber (letak) | KD menutup? | Saran satu baris |
| --- | --- | --- | --- |
| G01 | **Studi pemilik punya mesin keputusan yang berjalan** (Decision Studio: gerbang keras otomatis, BOQ, NPV, Monte Carlo). baca-B 3d hanya menyebut "dashboard keputusan" dari docx dan menulis "tidak ada NO-GO terprogram" (benar untuk Three.js, salah untuk Studio). C1 | tidak ada | Koreksi baca-B 3d; perlakukan Studio sebagai alat skenario pemilik yang sudah sejalan dengan K-02. |
| G02 | **Dua set CAPEX berbeda dari pemilik.** Excel/chat: S1 Rp4,50 M, S2 Rp11,34 M, S3 Rp26,70 M (TCO 6,77/14,66/33,68). Studio [jalan-ulang]: S1 Rp5,23 M, S2 Rp9,69 M, S3 Rp19,77 M (TCO 8,96/13,53/25,54). Pesan 24 vs 26, C1.4 | berbeda (KD §1.2 hanya memuat set Excel) | Tambah catatan di §1.2: dua versi model, selisih S3 sampai Rp6,9 M; jangan mengutip satu angka tanpa menyebut versinya. **[BIAYA]** |
| G03 | **Mesin pemilik sendiri memberi waktu gelar jauh lebih lama dari klaim 3-4 jam dan dari target G3.** Relay layflat 1 km, regu 8-15, [jalan-ulang]: jalan+gambut dangkal 22-27 jam gelar; campur+gambut dalam 43-55 jam; terpencil 74 jam. Waktu siap (dengan dispatch) 25-88 jam. C1.2, C1.4 | berbeda: G3 kami p50 <= 4 jam, p90 <= 6 jam | Kalibrasi G3 per kelas medan (jalan/dangkal vs campur/dalam) dengan angka ini sebagai hipotesis; bila target 4 jam tidak masuk akal, kit hanya cocok untuk kebakaran multi-hari. Menguatkan K-05. **[PUTUSAN]** **[BIAYA]** (hari regu) |
| G04 | **Gerbang keras otomatis** yang belum ada di KD: tekanan > 88% x PN x derating suhu; panas ekstrem + termoplastik terbuka; ujung HDPE di bara; daya poros > rating; kecepatan > 3 m/s; tekanan sisa < 1 bar. C1.3 | sebagian (K-16, K-02, §5.3 kalkulator hidraulika) | Jadikan daftar ini aturan di kalkulator hidraulika §5.3 dan uji invarian (OD160 SDR11 2.000 LPM 2 km harus NO-GO). |
| G05 | **Derating suhu HDPE** linear: 1 - 0,014 x (T - 20), batas 0,58-1; 35 C = 0,79 -> batas kerja PN16 = 11,1 bar. C1.2 | sebagian (K-16 menyebut panas, tanpa angka derating) | Tambah ke K-16 dan kalkulator; catat bahwa ini penyaringan, bukan datasheet pabrikan. |
| G06 | **Aset pendukung yang dibiayai Studio, tidak ada di kit KD:** pickup 4x4 Rp440 jt, perahu Rp230 jt, pos pemadam+gudang Rp600 jt/unit, rumah pompa Rp400 jt/unit, keamanan Rp110 jt, hub Rp150 jt, forward base Rp320 jt, pompa cadangan. C1.5 | sebagian (KD memakai gudang YonTP, kontainer Rp100 jt, depot Rp549 jt) | Tulis eksplisit asumsi "kendaraan dan perahu dipinjam dari BPBD/Daops". Bila harus dibeli: +Rp0,67 M per lokasi, sekitar Rp2,0 M untuk 3 lokasi. **[BIAYA]** |
| G07 | **OPEX berulang yang tidak ada di OPEX KD:** patroli drone Rp85 jt/th, telemetri Rp34 jt, keamanan Rp65 jt, logistik Rp40-160 jt, servis 4,2% dari direct, latihan Rp52 jt (tahunan) atau Rp95 jt (triwulan) per tahun; upah dasar 10 orang x 35 hari. C1.2 | sebagian (KD: BBM, insentif regu 60 hari, mobilisasi, evaluator, pemeliharaan 5-8%) | Cocokkan dua struktur OPEX; tambah baris drone/telemetri/keamanan/latihan jika drone dan sensor dipakai terus. **[BIAYA]** |
| G08 | **Latihan gabungan tahunan** sebagai syarat tetap, plus gerbang G6 kesiapsiagaan (pesan 23, 24; C1.3). | sebagian (KD hanya pelatihan 300 personel sekali dan "latihan ulang tiap tahun" di K-17) | Tambah G6 ringan (wet drill tahunan tanpa membakar, after-action review) dan Rp52-95 jt/th per lokasi (3 lokasi: Rp156-285 jt/th). **[BIAYA]** |
| G09 | **NPV/BCR/impas manfaat:** diskonto 8%, horizon 5 th, manfaat default 0, impas semi Rp3,19 M/th; biaya per ha terbukti = OPEX saja. C1.2, C1.4 | sebagian (KD §4.4 memakai CAPEX teramortisasi, tanpa diskonto; lebih ketat) | Tambah baris TCO terdiskonto 8% dan "manfaat impas per tahun"; pertahankan definisi KD (CAPEX masuk) dan catat bahwa Studio menghitung OPEX saja. |
| G10 | **Monte Carlo dan sensitivitas enam variabel.** C1.2 | tidak ada (KD memakai rentang +-30% dan kontingensi 25%) | Opsional: lampirkan P10/P50/P90 pilot sebagai pelengkap rentang §4.1; rentang Studio P10-P90 hanya -11% dan +19% dari deterministik, lebih sempit dari rentang KD. |
| G11 | **Skor berbobot** (biaya 25, keselamatan 30, efektivitas 25, akses 10, lingkungan 10) dan satu lagi di baca-A (35/30/20/15). Tiga set bobot beredar. C1.2; baca-A | berbeda (KD §5.3 menolak bobot rahasia) | Pertahankan gerbang-dulu; sebut bahwa bobot pemilik tidak boleh meluluskan NO-GO (sudah begitu di Studio). |
| G12 | **Opsi bahan dan trase yang tidak dibahas KD:** baja berlapis (Rp3,1 jt/m, sekitar 2,7x HDPE OD200), SDR17/PN10, PE100-RC, ditanam (Rp225 rb/m), dudukan (Rp880 rb/m), armor lokal. C1.5; pesan 26 | tidak ada (KD tidak menyebut baja) | Tambah satu baris di §1.1: baja dan ditanam NO-GO untuk kit portabel (mahal, merusak hidrologi gambut), berlaku hanya di spool ujung panas. |
| G13 | **Biaya heli di Studio Rp130 jt/jam** (placeholder) vs KD >Rp200 jt per sorti satu jam (BNPB 2023). C1.2 | berbeda | Ingatkan pemilik: Studio meremehkan heli sekitar 35%; pakai angka bersumber KD §4.3 bila membandingkan metode. **[BIAYA]** |
| G14 | **Pemilik minta bobot lebih besar untuk banjir, pertanian, YonTP** (pesan 23: "dikit banget bagiannya"); Studio menyediakan opsi pertanian (pilot/jaringan) dan pompa banjir terpisah. KD: K-13 dan K-14 NO-GO. | berbeda (konflik niat) | Sampaikan bahwa Studio sendiri sudah menandai pompa banjir "de-watering berbahaya bagi gambut" dan pertanian "tidak boleh menambah drainase"; KD K-13/14 konsisten dengan alat pemilik. **[PUTUSAN]** (komunikasi, bukan angka) |
| G15 | **Bentuk keluaran yang diminta:** buku 200 hlm + gambar teknik + RAB sampai baut + model Three.js + dashboard (pesan 0, 20, 23). KD §6: grand design formal ditulis SETELAH pilot; tidak membuat Three.js dan telemetri. | berbeda (konflik niat) | Tawarkan jalan tengah: "buku keputusan" pendek + Decision Studio sebagai alat pilot + gambar kit (bukan jaringan); gambar rinci menunggu G2. **[PUTUSAN]** |
| G16 | **Cakupan nasional:** "anggaran total semua wilayah karhutla, bongkar-pasang" (pesan 0). KD §4.2 hanya Kalteng (Rp37,6-43,3 M CAPEX; TCO 5 th Rp58-79 M). | sebagian | Bila diminta, tambah tabel ekstrapolasi bersyarat (provinsi lain hanya setelah G5) memakai per-kit KD; jangan mengulang Rp364 M pemilik. **[BIAYA]** |
| G17 | **Hazard contingency plan berbasis FRP dan luas** (pesan 0). baca-A baris 41 memuat tingkat 1-2 dengan angka OCR rusak. KD: kata FRP tidak muncul. | tidak ada | Buat matriks respons dari koefisien `bara_regu` dan `jam_tiba` repo (luas bara -> regu -> hari); catat FRP hanya penanda api menyala, bukan kedalaman bara gambut. |
| G18 | **Benchmark negara lain** (pesan 0; "Benchmarking Internasional" di dokumen baca-A). | tidak ada | Tambah bagian pendek dengan sumber yang bisa dicek (relay layflat CIFFC dsb.) dan beri label belum diverifikasi sampai dikutip dari aslinya. |
| G19 | **Pertanyaan rinci yang jawabannya belum eksplisit di KD:** SDM per ha, APD satu regu, bentuk T/lurus, nozzle bercabang, ukuran selang, jenis filter + interval bersih, jenis valve/pressure gauge, ukuran rumah penyimpanan (pesan 0, 20). | sebagian (KD hanya daftar kit dan harga) | Tambah satu lampiran spesifikasi kit: jenis valve/filter/interval dari baca-B BOM, ukuran gudang dari G-01. |
| G20 | **Izin pengambilan air (alokasi SDA)** sebagai hambatan keras terpisah, bersama hak lahan dan izin lingkungan. C1.3 | sebagian (KD G1 mengukur debit; izin lingkungan masuk fase 0; izin air tidak jadi gerbang) | Tambah "izin pengambilan air dari BWS" di G0/G1 sebagai syarat tertulis. |
| G21 | **Sensor, IoT, kode, prioritas drone, deteksi dini** diminta pemilik (pesan 20, 23). Studio memodelkan sensor/telemetri sebagai biaya saja. | sebagian (KD sengaja tidak membuat telemetri real-time) | Pertahankan keputusan KD; sebut probe suhu multi-kedalaman tetap wajib untuk G4 dan skrip skrining drone baca-B sudah ada. |
| G22 | **Hal yang Studio TIDAK modelkan tapi kritik KD anggap kunci:** kapasitas serap lance vs debit trunk (K-09; `flowLPM` bebas), frekuensi/utilisasi api (jam pompa 240 dan 35 hari regu dianggap tiap tahun; KD memakai tahun kering 40%), kedalaman injeksi (tak ada parameter; K-07), air per ha default 600 m3/ha (K-08). C1.2 | tidak ada | Jangan memakai CAPEX/TCO Studio untuk menyimpulkan kelayakan jaringan; tambahkan cek "debit pompa <= serap lance" bila Studio dipakai. **[PUTUSAN]** (batas pemakaian alat) |
| G23 | **Cacat kecil Studio:** teks "30 dimensi/93 pilihan" padahal 32/100; item `ELEC` dan `GEN` tak punya nama di daftar (tampil sebagai ID); pompa dinilai dengan HP placeholder, bukan kurva Q-H; tak pernah mencapai "GO" (maks KONDISIONAL); uji otomatis tak terlihat. C1.1, C1.3 | tidak ada | Catat sebagai batas bila Studio diteruskan ke BNPB; usulkan perbaikan ke pemilik. |
| G24 | **Gerbang G0-G6 pemilik** (G4 peralatan: Q-H/NPSH/surge/uji tekanan/kompatibilitas kimia; G5 nyala ulang 7/30/90 hari; G6 latihan) vs G0-G5 KD (nyala ulang 30 hari). C1.3 | berbeda | Selaraskan: tambah titik 90 hari pada G4 dan fold G4-peralatan pemilik ke G2 KD (sudah mirip). |
| G25 | **CO2 BBM saja** per skenario (solar 2,68; bensin 2,31 kg/L). C1.2 | tidak ada | Tambah satu baris emisi BBM pilot: 31.680 L bensin x 2,31 = sekitar 73 ton CO2 per musim; konteks argumen lingkungan. |
| G26 | **Portal data yang disebut Studio:** sda.pu.go.id (debit andalan), geoportal.menlhk.go.id, inarisk.bnpb.go.id, tanahair.indonesia.go.id. C1.6 | sebagian (KD §5.2 menyebut BWS, KHG, BMKG, tanpa portal; InaRISK tidak muncul) | Masukkan portal ke daftar §5.2. |
| G27 | **Hasil Deep Research tidak ada di tautan**; 20 poin strategis dan 6 kelompok hanya terlihat sebagai ringkasan (pesan 4-12). | tidak dapat dinilai | Minta pemilik mengirim keluaran Deep Research bila ada; jangan menganggap sudah diaudit. |
| G28 | **Rekomendasi pipa hibrida** (HDPE koridor tetap, layflat untuk api berpindah, logam dekat bara) dan klaim umur 50 tahun untuk HDPE (pesan 26). | sebagian (K-16: HDPE hanya di luar perimeter aktif; KD tidak membahas umur) | Catat bahwa 50 tahun adalah umur desain kondisi standar, tidak berlaku di gambut terbakar; selaras dengan K-16. |

**Jumlah butir gap: 28.** Penanda: [PUTUSAN] pada G03, G14, G15, G22; [BIAYA] pada G02, G03, G06, G07, G08, G13, G16.

Tidak ada butir yang membalik vonis utama KD (NO-GO jaringan permanen, GO bersyarat pilot portabel). G03 dapat melemahkan gerbang G3 sebagaimana tertulis; G22 membatasi cara Studio boleh dipakai.

---

## C4. Niat pemilik

Tujuan akhir, dengan kata pemilik: menyelesaikan "masalah karhutla di Indonesia" dengan **jaringan pipa terintegrasi** yang "mengalirkan air dari sumber terdekat ke sumber api gambut kemudian dimasukin ke dalam tanahnya untuk membasahi atau membanjiri gambut biar api padam" (pesan 0). Alasannya: water bombing, dry ice, dan OMC "terlalu mahal dan tidak efektif" karena hanya membasahi permukaan.

Yang ia kejar, berurutan:

1. **Buku grand design 200 halaman** dengan gambar teknik, RAB sampai baut, model 3D ("gw mau buat model three js nya tolong buatkan untuk semua"). Audiensnya tidak disebut; konteks repo menunjukkan staf ahli BNPB dan pemangku keputusan.
2. **Pengujian semua ide** untuk "teknis yang terbaik. Optimal secara efisiensi dan biaya. Efektivitas berhasil".
3. **Alat keputusan interaktif**: "pilihan di kiri gitu hasil di kanan... biaya berapa dll", "exhaustive... jika A maka BCDE itu apa plusnya apa minusnya", "kalau menurut lu oke dari segi cost benefit analysis ya gas" (pesan 25). Syarat tersirat: ia siap jalan bila biaya-manfaat masuk akal.
4. **Multiguna**: pipa dipakai menarik banjir dan irigasi pertanian, YonTP dan TNI sebagai penyimpan dan penggelar; ia keberatan porsi banjir/pertanian/YonTP "dikit banget" (pesan 23).
5. **Cakupan luas**: anggaran "untuk cover semua wilayah karhutla", bongkar-pasang, dimulai dari daerah langganan 25 tahun di Kalimantan Tengah.
6. **Kepastian angka**: "angka final jangan hanya sebagian" (CAPEX), "cari spesifikasi tiap komponen bahkan sampai baut", "ambil langsung nilainya kalo open to API".
7. **Kesiapsiagaan berulang**: simulasi pemadaman tahunan, TNI ikut.

Batas yang ia terima sendiri: hasil harus membedakan terverifikasi, estimasi rekayasa, dan wajib uji lapangan (pesan 2); dan dashboardnya memang menandai dirinya pra-FEED dengan manfaat default nol.

Selisih dengan KD: pemilik menginginkan **satu dokumen dan satu alat lengkap sekarang** dengan skala nasional dan multiguna; KD menyarankan **studi dan pilot portabel dulu, grand design formal sesudah hasil**, dan menolak justifikasi banjir/irigasi. Alat pemilik sendiri (Studio) sudah memuat banyak penjaga yang sejalan dengan KD (gerbang keras, manfaat 0, larangan de-watering), sehingga jalur persuasi yang paling dekat adalah memakai Studio sebagai wadah gerbang G0-G5, bukan menggantinya.
