Inventaris teknik BANJIR dan PESISIR, field PREDIKSI / SIMULASI / EWS / PEMODELAN / DAMPAK. Semua baris diperiksa langsung di kode atau berkas data; tebakan diberi tanda PERLU CEK.

**Cara membaca state.** Tab yang disembunyikan di /banjir tercantum di `public/banjir/index.html:211` (TAB_SEMBUNYI): posko, informasi, prakiraan, daftar, provinsi, rob, sungai, keputusan, sarana, replay, tentang. Tab Metode tampil lagi sejak 20 Nov 2026, jadi angka uji di metode.js dihitung TAYANG sebagai hasil uji, bukan sebagai status.

**Ringkasan.**
- Satu-satunya vonis LULUS yang menyangkut wilayah banjir: besaran KK/rumah model_dampak, plus GRRR yang "LULUS (daya rendah), prakiraan sempurna, bukan bukti operasional".
- AIFS LOLOS untuk hujan saja; uji ansambel independennya belum ada.
- Semua model peluang kejadian berakhir di GAGAL, TIDAK LULUS, atau TIDAK MEYAKINKAN terhadap klimatologi atau persistensi.
- Akar yang disepakati audit: label "ada laporan" yang menyimpan kebiasaan lapor (`AUDIT-MODEL-2026-11.md:8-25`).
- Satu-satunya uji bersih tersisa: prospektif 2026-11..2027-04.

## INVENTARIS

BANJIR | PREDIKSI | aturan ambang hujan 3 hari × indeks bahaya (Waspada/Siaga/Awas, hari 0..+3) | scripts/banjir/status.py:13-21,63-65 | TAYANG | LULUS terbatas: ETS rata-rata tiga level naik +0,0063 (CI95 +0,0033..+0,0095) melawan aturan lama di 2022-2025 (validasi.json); ETS mutlak kecil, FAR 0,96-0,98 | ambang dipilih dengan ERA5, tetapi operasi memakai IFS
BANJIR | PREDIKSI | jalur debit sungai GloFAS vs periode ulang Q2/Q5/Q20 | scripts/banjir/sungai.py; status.py:7 | TAYANG | BELUM DIUJI: hanya 14 dari 192 titik punya ambang (RISET-UJI-BALIK.md) | memicu RK=1..3 di status
BANJIR | PREDIKSI | jalur intensitas jam (imax ≥30 untuk bandang) dan CAPE | status.py:17-19 | TAYANG | TIDAK PERLU untuk CAPE (tidak menambah apa pun di atas H3); bandang BELUM DIUJI | sel 0,25° konservatif
BANJIR | PREDIKSI | ansambel ECMWF IFS 51 anggota: P(≥50 mm), P(≥100 mm), P(3 hari ≥100 mm) | scripts/banjir/ansambel_hujan.py; peluang_banjir.py | TAYANG (dini.js); layer eksperimen "Peluang hujan lebat" tersembunyi di index.html:125 | BELUM DIUJI | peluang kab = maksimum titik 1°
BANJIR | PREDIKSI | peluang status per kecamatan dari anggota ansambel | status.py → prakiraan72.json | TERSEMBUNYI (tab prakiraan disembunyikan) | BELUM DIUJI: catatan berkas menyebut "kalibrasinya belum diketahui" | per 24 Nov `kec` kosong ("belum ada jalan ensemble")
BANJIR | PEMODELAN | perbandingan model NWP eksternal (AIFS vs IFS vs GFS) | scripts/banjir/uji_aifs.py; public/banjir/data/uji_aifs.json | TAYANG (metode.js) | LULUS (LOLOS): ETS ≥20 mm lead-1 AIFS 0,2315 vs IFS 0,1556 vs GFS 0,1253; CI selisih [0,059; 0,0957]; vonis_independen=null | kebenaran ERA5 menguntungkan AIFS; AIFS masih bayangan
BANJIR | PEMODELAN | koreksi bias quantile mapping IFS→ERA5 per wilayah × tenggang × musim | scripts/banjir/koreksi_bias.py; koreksi_bias.json | DRAF-TIDAK-TERPASANG (hanya diimpor model_kab_campur) | BELUM DIUJI | menyamakan sebaran ke ERA5, bukan ke kebenaran
BANJIR | PEMODELAN | uji balik aturan dengan prakiraan sempurna ERA5, latih/uji 2016-2021 / 2022-2025, bootstrap blok | scripts/banjir/uji_balik.py; RISET-UJI-BALIK.md | TAYANG (validasi.json di Metode/peta) | LULUS terhadap aturan lama: +0,0063 ETS; POD Siaga 6%→13% | sampel 42 kab yang paling sering lapor
BANJIR | PEMODELAN | uji luar-sampel 2026 dengan label logbook Pusdalops | scripts/banjir/uji_logbook.py; RISET-LOGBOOK.md:37 | TERSEMBUNYI (validasi_logbook_banjir.json tidak dibaca layar mana pun) | TIDAK LULUS: ETS tertinggi 0,060 (CI bawah 0,048 < 0,1); klimatologi FAR 0,983 | 5 varian label
BANJIR | PEMODELAN | ambang per wilayah (pengali k per kab/pulau) dengan partial pooling | scripts/banjir/ambang_wilayah.py; RISET-AMBANG-WILAYAH.md:118-133 | TERSEMBUNYI (pakai=false) | TIDAK MEYAKINKAN, uji tidak dibuka: alarm validasi persis sama dengan aturan nasional (selisih ETS 0) | "ambang per kab = alarm sama"
BANJIR | PEMODELAN | ambang persentil hujan lokal per kab (Ps 78,4/96,6/99,2) | scripts/banjir/ambang_persentil.py; ambang_persentil.sidik | TERSEMBUNYI (pakai=false, angka di Metode) | TIDAK MEYAKINKAN (dikunci di .sidik); jalur Siaga dETS +0,0104 | Waspada tidak cukup membaik
BANJIR | PEMODELAN | uji bayangan prospektif ambang Siaga persentil | scripts/banjir/siaga_persentil.py; siaga_persentil.sidik; siaga_persentil_log.json | TERSEMBUNYI (log di Metode) | BELUM DIUJI: vonis paling cepat Des 2027 | segel sha256 2 Nov 2026
BANJIR | PEMODELAN | catatan prospektif append-only + skor ETS vs persistensi dan klimatologi, kriteria bersidik + jangkar commit | scripts/banjir/prospektif.py; PRAREG-PROSPEKTIF.md; prospektif_skor.json | TAYANG (dini.js, metode.js) | BELUM DIUJI ("belum cukup data", 21 hari): lead-1 model 0,0383 vs klimatologi 0,0464 vs persistensi 0,0456 | n_hari_min 60, kejadian_min 100
BANJIR | PREDIKSI | GBDT pohon dangkal kab-hari + kalibrasi Platt | scripts/banjir/model_kab.py; RISET-MODEL-KAB.md:160-162 | DRAF-TIDAK-TERPASANG (data/raw) | TIDAK LULUS: AUC 0,767 = LR 0,770; BSS vs klimatologi 0,0115; dETS vs LR +0,0005 (CI −0,0016..+0,0028) | menang dari klimatologi, tidak dari LR atau aturan
BANJIR | PEMODELAN | ablasi tutupan lahan tahunan (IO LULC) | scripts/banjir/lab_tutupan.py; RISET-MODEL-KAB.md §11 | DRAF-TIDAK-TERPASANG | TIDAK LULUS ("TIDAK DIUSULKAN") | lab
BANJIR | PREDIKSI | debit GloFAS sebagai fitur (M1 vs M0) | scripts/banjir/model_kab_debit.py; model_kab_debit.sidik | DRAF | BELUM DIUJI: sia/buka belum dibuka; di validasi M1−M0 dETS Waspada −0,0006 [−0,0020; +0,0008] | jejak .sidik hanya berisi baris latih
BANJIR | PREDIKSI | hujan hulu DAS + CHIRPS | scripts/banjir/model_kab_hulu.py; PRAREG-HULU.md | DRAF | BELUM DIUJI: sia paling cepat 2027-02-15 | 22 dari 39 kab punya hulu
BANJIR | PREDIKSI | kelembapan tanah anteseden ERA5-Land | scripts/banjir/model_kab_tanah.py; PRAREG-TANAH.md:85,146 | DRAF | BELUM DIUJI: perkiraan sendiri "paling mungkin TIDAK MEYAKINKAN" | latih saja
BANJIR | PREDIKSI | limpasan reanalisis Google GRRR sebagai fitur | scripts/banjir/model_kab_grrr.py; RISET-GRRR.md:124-160 | DRAF | LULUS (daya rendah): G1 dETS Waspada +0,00314 [+0,00042; +0,00638]; AUC M3G 0,804 vs klimatologi 0,654 | "prakiraan sempurna, uji pakai-ulang, bukan operasional"
BANJIR | PREDIKSI | model operasional KAB2 / KAB2-OPS, label berbobot keyakinan, Platt leave-one-year-out | scripts/banjir/model_kab2.py, model_kab2_ops.py, prediksi_kab2.py | TERSEMBUNYI (arsip append-only data/banjir/arsip_kab2, "TIDAK TAYANG") | uji26: TIDAK MEYAKINKAN (54 kejadian, daya rendah); prospektif dinilai paling cepat 2027-06-01 | nilai_kab2_ops.py menulis O_EXCL
BANJIR | PEMODELAN | model campuran bertingkat, klimatologi sebagai offset, pooling per wilayah | scripts/banjir/model_kab_campur.py (2134 baris), model_kab_campur_nilai.py; PRAREG-CAMPUR.md | DRAF (sidik 6 Nov, prospektif mulai 2026-11-07) | BELUM DIUJI: L2 vonis ≥2027-06-29 | label ≥2026-10-19 tidak pernah dibaca
BANJIR | PREDIKSI | P(banjir MODIS besok) dengan logistik hujan + dq GloFAS | scripts/banjir/mcdwd_model.py; mcdwd_model.json | TAYANG sebagai hasil uji (bahan.js, metode.js) | GAGAL: AUC 0,567 vs persistensi 0,708 vs klimatologi 0,791; BSS −0,066 | aturan status vs MCDWD juga GAGAL (dETS −0,27)
BANJIR | PREDIKSI | nowcast genangan Jakarta 1-6 jam dari IMERG Early 30 menit (jalur A) | scripts/banjir/nowcast_jkt.py; nowcast_jkt_vonis.json; docs/banjir/NOWCAST-JKT.md:81-100 | DRAF (tidak ada layar) | TIDAK LULUS di semua lead: BSS vs klimatologi +0,0016 (lead 3 jam); p vs persistensi 0,60; andal_sampai = 0 jam | Brier = persistensi sampai 6 desimal
BANJIR | EWS | waktu tempuh hulu→hilir dari korelasi silang kenaikan pos (jalur B) | nowcast_jkt.py `tempuh`; public/banjir/data/hulu_hilir.json; pos_air.js | TAYANG (hitung mundur banjir kiriman) | BELUM DIUJI: hipotesis=true, diuji di satu kejadian (Mar 2025) | jalur B dinilai prospektif 2026/27
BANJIR | PREDIKSI | nowcast bandang 0-6 jam dari GSMaP NRT per kecamatan zona bandang | scripts/banjir/nowcast_bandang.py, arsip_nowcast.py; PRAREG-BANDANG.md | DRAF (arsip R2 tetap berjalan, .sidik belum ada) | BELUM DIUJI: vonis 2027-09..2028-06 | "deteksi, bukan peringatan dini"
BANJIR | PEMODELAN | pembanding eksternal GEOGloWS ≥T2 (periode ulang Gumbel) | scripts/banjir/geoglows.py, uji_geoglows.py; uji_geoglows.buka | TAYANG sebagai indeks (sungai_induk.js) | TIDAK LULUS: ETS 0,0144 vs klimatologi 0,0248 vs persistensi 0,0351 | deret retrospektif, bukan ramalan terarsip
BANJIR | PEMODELAN | pembanding eksternal Google Flood Hub | scripts/banjir/floodhub.py, floodhub_nilai.py; PRAREG-FLOODHUB.md | DRAF (tanpa kunci = dilewati; floodhub.sidik tidak ada) | BELUM DIUJI: buka ≥2027-06-15 | —
BANJIR | PEMODELAN | pembanding peta bahaya InaRISK vs kejadian | scripts/banjir/uji_inarisk.py; RISET-INARISK.md:22-35 | TAYANG (metode, peta) | GAGAL sebagian: V1 lolos, V2-V4 gagal; rho sesudah penduduk 0,042 (CI −0,048..0,129); penduduk sendiri 0,590 | —
BANJIR | PEMODELAN | model bahaya kecamatan yang dapat dijelaskan (logistik L2, 9 faktor) | scripts/banjir/model_bahaya.py, faktor_kec.py; RISET-INARISK.md:80-95 | DRAF (tidak tampil) | GAGAL: AUC 0,728 vs InaRISK 0,688, selisih +0,040 (CI −0,003..+0,091) | riwayat kejadian sendiri AUC 0,909
BANJIR | DAMPAK | indeks risiko statis kab (bahaya, penduduk, riwayat) | public/banjir/data/risiko_ujibalik.json | TAYANG (/bnpb/risiko) | GAGAL: tidak lebih baik dari peringkat penduduk atau riwayat paruh A | PERLU CEK skrip pembuatnya (di luar scripts/banjir)
BANJIR | PEMODELAN | label satelit radar Copernicus GFM (penguat positif) | scripts/banjir/gfm_label.py, genangan_nasional.py | DRAF (panen) | BELUM DIUJI | hanya di luar kota dan hutan
BANJIR | PEMODELAN | label radar OPERA DSWx-S1, ambang ditetapkan sebelum ada data (≥100 ha, ≥2%, buang kab kronis) | scripts/banjir/opera_dswx.py, label_bersatu_v3.py; PRAREG-LABEL-V3.md | TAYANG sebagai indeks katalog (sungai_induk.js); label v3 DRAF | BELUM DIUJI: 741/1426 granul | konsumen tetap di v2
BANJIR | PEMODELAN | label bersatu multi-sumber dengan dedup, tingkat keyakinan, dan penanda "tak teramati" | scripts/banjir/label_bersatu.py, label_bersatu_v2.py, susun_label_v2.py, label_banjir.py | TAYANG ringkas (label_bersatu_*_ringkas.json) | TIDAK PERLU: catatan mutu menyebut hanya ~31% kejadian DIBI punya padanan Groundsource | v1 dikunci sha256
BANJIR | PEMODELAN | label kejadian berita Groundsource per kecamatan | scripts/banjir/label_kec.py; RISET-LABEL-KEC.md:29,36 | TAYANG ringkas (metode.js) | LULUS kecocokan: Spearman 0,71 vs DIBI per kab (n=516) | presisi ~82% (klaim penulis)
BANJIR | PEMODELAN | label deteksi radar S1 per kab (air tak biasa per orbit, buang air permanen JRC) | scripts/banjir/s1_genangan.py (panen-s1-banjir.yml) | DRAF | BELUM DIUJI | —
BANJIR | PEMODELAN | lab genangan radar S1 vs laporan warga, kriteria ditulis sebelum hasil | scripts/banjir/lab_genangan_radar.py; lab_kriteria/; genangan_radar_ringkas.md | DRAF (lab) | GAGAL: 0 dari 3 kejadian lolos; CSI median 0 vs semua-positif 0,341 | genangan kota surut sebelum satelit lewat
BANJIR | PEMODELAN | pembersihan label laporan latihan/simulasi | scripts/banjir/genangan/petabencana.py; DIAGNOSIS-J3.md H4 | TIDAK PERLU (saringan) | terbukti: 99,6% laporan uji 2024-08 adalah latihan | penyebab utama J3 gagal
BANJIR | PREDIKSI | kurva hujan pemicu genangan per kecamatan (M0 DKI) | scripts/banjir/genangan/pemicu.py; kecamatan_pemicu.json; KRITERIA-M0.md | TAYANG berlabel "Hipotesis" (public/pipa/logistik.js) | GAGAL: ETS 0,174 vs klimatologi bulanan 0,180 (selisih −0,006, CI −0,027..0,016) | AUC hujan uji 0,51-0,54
BANJIR | PREDIKSI | model tangki per kecamatan (SCS-CN, Kd, penahan pasang) | scripts/banjir/genangan/tangki.py, m1_kumpul.py, m1_nilai.py; m1_prospektif.yml | TAYANG berlabel "Hipotesis" (bahan.js) | BELUM DIUJI: prospektif "berjalan" sampai 2027-04-30 (24 baris hujan) | CV blok-tahun 2017-2023
BANJIR | SIMULASI | mesin genangan 2D DEM (Priority-Flood, D8, SCS-CN, inersia) | public/banjir/sim_genangan.js; scripts/banjir/genangan/mesin.mjs | TAYANG (tab Simulasi) | BELUM DIUJI sebagai validasi fisik; tes unit tests/banjir/sim_genangan.test.mjs | satu mesin dipakai peramban, Worker, Node
BANJIR | SIMULASI | kalibrasi genangan J3 (skala hujan, Kd seragam vs per kec vs per kab) | scripts/banjir/genangan/kalibrasi_j3.py, kunci_j3.py, vonis_j3.py, j3_vonis.json | DRAF | GAGAL atau tidak sah: POD 2024-08 0,0009 vs acak 0,11; Kd per kec kalah dari seragam di 3/3 LOEO | label uji rusak; Kd mentok di tepi grid
BANJIR | SIMULASI | uji prospektif J4 genangan (AUC laporan vs titik acak, null berklaster) | scripts/banjir/genangan/j4_operasi.py, kalibrasi_j4.py, skor_j4.py, kunci_j4.py; genangan_j4.yml | DRAF (jangkar ceddfc49, belum ada j4_prediksi) | BELUM DIUJI; kalibrasi AUC 0,602 vs heuristik elevasi 0,646 | "keterampilan relatif terhadap bias lokasi pelapor"
BANJIR | SIMULASI | replay kejadian historis (Maret 2025, Kali Bekasi/Ciliwung) dengan kalibrasi DAS ke puncak | scripts/banjir/replay.mjs:187,525; public/banjir/replay.html; replay/maret2025.json | TERSEMBUNYI (tab replay disembunyikan, halaman tetap ada) | TIDAK MEYAKINKAN: POD ≥10 cm 0,043 per sel, 0,261 jendela 3x3 (n=36 laporan) | puncak dikalibrasi ke laporan, bukan prediksi
BANJIR | SIMULASI | skenario muka sungai berbasis HAND | public/banjir/sim_hand.js | TAYANG (Genangan 3D) | BELUM DIUJI (tes unit saja) | gagasan dari RainFlow Lab
BANJIR | SIMULASI | tutupan lahan nyata per sel (WorldCover) ke CN | public/banjir/sim_lahan.js | TAYANG | BELUM DIUJI | —
BANJIR | SIMULASI | perlakuan tanggul/pompa/pintu air, banding tanpa vs dengan | public/banjir/sim_tampak.js | TAYANG | BELUM DIUJI | —
BANJIR | SIMULASI | waktu tempuh tanggap Dijkstra kisi + peringkat perlakuan | public/banjir/sim_tanggap.js | TAYANG | BELUM DIUJI | kecepatan per sel per jam
BANJIR | SIMULASI | skenario status (aturan status.py ditulis ulang di JS) | public/banjir/sim.js:24,86 | TAYANG | TIDAK PERLU | lihat paritas di bawah
BANJIR | PEMODELAN | paritas Python-JS aturan status | public/banjir/metode.js:5,855; docs/multi-bencana/bencana/banjir.md:78 (B07) | TAYANG | BELUM DIUJI di CI: hanya cek runtime peramban | SEBAGIAN
BANJIR | SIMULASI | model keputusan satu musim per provinsi: bootstrap tahun historis + parameter segitiga, opsi B/C/D (sirene/AWLR, pompa, SAR) | public/banjir/keputusan.js:3-18; param_banjir.json | TERSEMBUNYI (tab keputusan) | BELUM DIUJI | nilai nyawa statistik = pilihan kebijakan
BANJIR | PREDIKSI | outlook 12 bulan dengan analog ENSO/IOD, dipakai hanya bila skill LOO > 0,02 | outlook12.json (skrip luar scripts/banjir, PERLU CEK) | TAYANG (metode) | BELUM DIUJI untuk banjir (memakai klimatologi riwayat.json) | uji balik hanya ada untuk karhutla
BANJIR | EWS | peringatan berantai: logbook banjir membuka peringatan longsor dan banjir susulan 3 hari | src/berantai.js:1,11-16 | TAYANG | LULUS deskriptif: lift banjir>longsor 2,12 (CI 1,97-2,27), banjir>banjir 1,98 | angka disalin dan diuji tests/warga
BANJIR | EWS | gugus kejadian aktif (kecamatan bersebelahan ≥Siaga, kode B#### stabil) | scripts/banjir/kejadian_aktif.py | TAYANG | TIDAK PERLU | menjadi umpan peringatan
BANJIR | EWS | peringatan D1 kejadian aktif berlabel Deteksi, berlaku 30 jam | src/peringatan.js:98-119 | TAYANG | TIDAK PERLU | "bukan status resmi BPBD"
BANJIR | EWS | email EWS per koordinat (double opt-in, Resend) termasuk banjir, longsor, rob | src/ews.js:1-6,196-216 | TAYANG (tanpa kunci: email_aktif=false) | TIDAK PERLU | rob: titik pesisir ≤10 km
BANJIR | EWS | Web Push saat status banjir kab naik | src/push.js:151-202 | TAYANG (butuh tabel 0064) | TIDAK PERLU | garis dasar dulu, kirim saat naik
BANJIR | EWS | WA otomatis hujan lebat H+1..H+3 (P(≥50 mm) ≥10%) | scripts/wa/peringatan_banjir.mjs | TERSEMBUNYI (mati sampai PENERIMA_PERINGATAN_BANJIR diisi) | TIDAK PERLU | tanpa LLM
BANJIR | EWS | pemisahan resmi vs milik kita (BMKG CAP nowcast, PDCHT dasarian, CAP digandakan) | scripts/banjir/peringatan.py; public/banjir/resmi_bmkg.js; hujan_kini.js; docs/multi-bencana/PERINGATAN-DINI.md:8-10 | TAYANG | TIDAK PERLU | label "Deteksi Pantau Bencana"
BANJIR | EWS | pos duga air SIHKA/DSDA (kelas naik/tertinggi, ruas sungai berwarna, pos macet) + arsip permanen TMA | public/banjir/pos_air.js; scripts/banjir/arsip_pos.py, sungai_pos.py, pos_sungai.py | TAYANG | BELUM DIUJI: arsip sejak 19 Okt 2026 masih terlalu pendek untuk latih | calon label bebas pelapor
BANJIR | EWS | pop-up situasi harian + laporan harian + seri status | public/banjir/sapa_banjir.js; scripts/banjir/laporan_banjir.py, seri_status.py, wilayah_hari.py | TAYANG | TIDAK PERLU | —
BANJIR | EWS | rekomendasi posko 3 tingkat (permanen pra-musim, siaga) | scripts/banjir/posko.py | TERSEMBUNYI (layer posko dan tab disembunyikan) | TIDAK PERLU | Perka BNPB 3/2016
BANJIR | EWS | jaga kesegaran: tolak terbit bila data basi | scripts/banjir/jaga_banjir.py | TAYANG (gerbang CI) | TIDAK PERLU | PAKSA_TERBIT darurat
BANJIR | PEMODELAN | gerbang tayang berlabel "Hipotesis, belum lolos uji" + `pakai:false` | kecamatan_pemicu.json, kecamatan_genangan.json, ambang_*.json; PRAREG-CAMPUR.md:802-806 | TAYANG | TIDAK PERLU | —
BANJIR | PEMODELAN | pra-registrasi bersidik sha256 + penanda buka sekali (O_EXCL) + jangkar commit di origin | scripts/banjir/*.sidik, *.buka; genangan/kunci_j3.py, kunci_j4.py | TIDAK PERLU (infrastruktur) | — | 9 berkas .sidik, 3 .buka
BANJIR | PEMODELAN | arsip prakiraan append-only untuk uji prospektif (BMKG desa, debit, petabencana) | scripts/banjir/arsip_bmkg_desa.py, arsip_debit.py, arsip_petabencana.py | TERSEMBUNYI | TIDAK PERLU | BMKG tidak menyimpan prakiraan lama
BANJIR | PEMODELAN | metrik pada jumlah alarm sama + bootstrap blok pulau×minggu + MDE/daya + veto per tahun | model_kab_hulu.py (kerangka yang dipakai bersama); RISET-GRRR.md:150-156 | TIDAK PERLU | — | "daya rendah" ditulis di vonis
BANJIR | PREDIKSI | pasang astronomi harian (Bulan + Matahari) | scripts/banjir/pasang_astro.py; kalender_rob.js | TAYANG | TIDAK PERLU | "bukan tinggi muka air"
BANJIR | PREDIKSI | rob: muka laut SMOC vs persentil iklim model sendiri p95/p99/amax + penanda gabungan ombak ≥1,25 m | scripts/banjir/rob.py:82-95,645 | TAYANG | TIDAK MEYAKINKAN: PSS p95 0,67 (POD 0,731, FAR 0,981) pada 26 kejadian di 16 kab | persentil dipilih pada data yang sama dengan uji
BANJIR | PEMODELAN | offset model–gauge IOC + validasi prediksi pasut BMKG vs UHSLC | scripts/banjir/rob.py; pasut.py; pasut_validasi.py:15-19 | TAYANG (pasut_30h) | LULUS untuk urutan hari: Spearman 0,76 mentah / 0,91 bandpass; hit10 0,58 vs kebetulan 0,10 | bukan klaim tinggi muka air
BANJIR | PREDIKSI | ringkasan rob 14 hari untuk Panel Presiden | scripts/banjir/rob_presiden.py | TAYANG | TIDAK PERLU | —
BANJIR | PREDIKSI | penurunan tanah InSAR LiCSBAS (dekomposisi vertikal) + proyeksi 10/20 tahun | scripts/banjir/subsiden.py, proyeksi_tanah.py; data/kajian-bnpb/penurunan-tanah/ | DRAF-TIDAK-TERPASANG (subsiden.json tidak ada) | BELUM DIUJI | laju diasumsikan tetap
BANJIR | DAMPAK | lapis penurunan tanah dari literatur | public/banjir/data/subsiden_literatur.json; lapis_ekstra.js | TAYANG | TIDAK PERLU | hipotesis berkutip
BANJIR | DAMPAK | keterpaparan harian kecamatan Siaga/Awas: penduduk, sekolah/siswa, faskes | scripts/banjir/dampak.py; public/banjir/dampak.js | TAYANG | TIDAK PERLU | penduduk satu kecamatan, bukan area tergenang
BANJIR | DAMPAK | penduduk di zona bahaya × porsi luas InaRISK, rumah setara = jiwa/3,5 | scripts/banjir/dampak_kab.py; paparan_kab.json | TAYANG (metode, pesisir dampak) | TIDAK PERLU | "BUKAN perkiraan korban"
BANJIR | DAMPAK | model bertingkat hujan→kejadian→besaran KK/rumah, selang p10/p50/p90 | scripts/banjir/model_dampak.py; model_dampak.sidik/.buka; RISET-DAMPAK.md:61-86 | DRAF (hanya public/pipa/layar_studio.js, PERLU CEK) | KK LULUS (skill 0,037 [0,024; 0,051] vs B0; cakupan 80% 0,805); rumah LULUS; peluang 2026 TIDAK LULUS (dETS 0,005 [−0,002; 0,012]) | bila gagal, yang tayang hanya sebaran empiris
BANJIR | DAMPAK | sensitivitas dan skenario dampak (berkas terpisah agar sidik utuh) | scripts/banjir/dampak_sensitivitas.py | DRAF | TIDAK PERLU | —
BANJIR | DAMPAK | kedalaman genangan gaya FwDET di atas GFM + bangunan terendam | scripts/banjir/kedalaman_genangan.py; RANCANGAN-MODEL-NASIONAL.md:32-38 | DRAF | GAGAL / belum teruji: galat log10 1,66→1,34, tetap ~22× di bawah DIBI, Spearman −0,1 | DSM GLO-30
BANJIR | DAMPAK | luas tergenang GFM per kecamatan per lintasan | scripts/banjir/genangan_nasional.py | TAYANG luas di /prediksi; bangunan tidak (boleh_tampil=false) | TIDAK PERLU | Demak 2024 bangunan 5-12× terlalu rendah
BANJIR | DAMPAK | warga terdampak listrik padam (Black Marble) | lampu_malam_validasi.json; lapis_ekstra.js | TAYANG sebagai overlay hipotesis | GAGAL ("jalur GIBS tidak layak terbit") | butuh VNP46A2 asli
BANJIR | DAMPAK | kejadian yang SUDAH terjadi per kab (tanpa angka korban) | scripts/banjir/terdampak.py | TAYANG | TIDAK PERLU | daftar kunci publik dijaga tes
BANJIR | DAMPAK | unit respons (Basarnas, BPBD, pos SAR) | scripts/banjir/unit_respons.py | TAYANG | TIDAK PERLU | masukan sim_tanggap
BANJIR | PEMODELAN | indeks risiko historis + kalender musim + permukaan kekerapan | scripts/banjir/riwayat.py | TAYANG | BELUM DIUJI | setara skorRiwayat karhutla
BANJIR | PEMODELAN | bukti DAS hulu: hutan hilang vs kejadian, r ditahan di bawah r_kritis(n) | scripts/banjir/bukti_das.py:464; citra_banjir.py; laporan-das.html | TAYANG | TIDAK PERLU (korelasi deskriptif) | ditahan bila kejadian < 30
BANJIR | PEMODELAN | atribusi hujan hulu per sub-DAS untuk daerah Siaga | scripts/banjir/hulu.py | TAYANG | TIDAK PERLU | —
BANJIR | PEMODELAN | riwayat genangan GLAD (Google) per kecamatan | scripts/banjir/genangan_historis.py | TAYANG (layer, mati bawaan) | TIDAK PERLU | —
BANJIR | PEMODELAN | aktivasi Charter dan EMS sebagai indeks | scripts/banjir/charter.py, ems.py | TAYANG (bahan.js) | TIDAK PERLU | —
BANJIR | PEMODELAN | HAND MERIT dan kedap air WorldCover per kab | scripts/banjir/hand_kab.py, kedap_kab.py, fitur_banjir.py | DRAF (HAND menunggu kunci) | BELUM DIUJI | —
PESISIR | PREDIKSI | kelas gelombang BMKG Maritim (Rendah..Ekstrem) | public/pesisir/hitung.js:6-8 | TAYANG | TIDAK PERLU | resmi
PESISIR | EWS | gelombang BMKG diteruskan apa adanya ke EWS (tinggi/sangat tinggi/ekstrem → W/S/A) | src/ews.js:233-246 | SEBAGIAN (migrasi 0137 belum di produksi) | TIDAK PERLU | abrasi tidak memicu
PESISIR | PEMODELAN | garis pantai DEA Coastlines: MNDWI median tahunan, ambang Otsu dijepit, regresi + CI dilebarkan AR(1), saringan bolak-balik | scripts/pesisir/abrasi.py:20,302,369-416 | TAYANG | TIDAK MEYAKINKAN: arah cocok di Sayung, Blanakan, Legonkulon; besaran per desa Sayung 2-3× lebih kecil dari rujukan | belum koreksi pasut
PESISIR | PEMODELAN | validasi terhadap angka literatur (arah, orde, pola waktu) | abrasi.py `validasi`; docs/multi-bencana/bencana/abrasi.md:47-80 | TAYANG (metode) | lihat baris di atas | —
PESISIR | PEMODELAN | label rob dari 3 sumber (rekap Pusdalops, logbook, DIBI) | scripts/pesisir/rob_label.py; rob_kejadian.json | TAYANG (tren, metode) | BELUM DIUJI: POD/FAR rob terhadap label ini belum dihitung (pesisir.md B02) | 565 kejadian, 179 kab
PESISIR | DAMPAK | kab rob ≥Waspada × penduduk kab + dampak rob DIBI + transek abrasi | public/pesisir/dampak.js | TAYANG | TIDAK PERLU | status rob = hipotesis

## TEKNIK UNIK (kemungkinan belum ada di bahaya lain)

1. **Diagnosis label: buang laporan latihan/simulasi** (DIAGNOSIS-J3 H4). Saringan untuk laporan warga palsu atau latihan juga berguna di karhutla (laporan titik api), gempa (laporan "dirasakan"), dan udara.
2. **Label bersatu berkeyakinan + penanda "tak teramati"** (label_bersatu_v2/v3). Ini memisahkan "tidak dilapor" dari "tidak terjadi"; cocok untuk longsor dan kekeringan yang sama-sama kurang lapor.
3. **Klimatologi kebiasaan lapor sebagai offset** (PRAREG-CAMPUR). Model wajib mengalahkan pola pelaporan, bukan sekadar ikut memakainya; berlaku di semua bahaya berlabel DIBI.
4. **Ambang label satelit beku sebelum data ada + buang kab kronis** (PRAREG-LABEL-V3). Bisa dipakai untuk luas terbakar satelit dan longsor InSAR.
5. **Null berklaster luas-sama + AUC laporan vs titik acak** (skor_j4). Ini jujur untuk label yang hanya berisi positif; cocok untuk sebaran asap, abu vulkanik, dan intensitas gempa yang dirasakan.
6. **Persistensi sebagai pembanding wajib nowcast**, dengan temuan "Brier = persistensi sampai 6 desimal". Berlaku untuk nowcast cuaca dan udara.
7. **Paritas satu mesin Python/JS/Node lewat vm** (sim_genangan.js dimuat mesin.mjs dan replay.mjs). Satu kode untuk peramban, Worker, dan uji; bisa ditiru model asap, abu, dan longsor.
8. **Replay kejadian historis dengan kalibrasi ke puncak dilaporkan + POD per kelas geokode lokasi laporan.** Cocok untuk replay erupsi, asap, dan gempa.
9. **Paritas pasut prediksi vs gauge dengan metrik bandpass dan hit10** (pasut_validasi). Ini cara menguji urutan hari ekstrem tanpa klaim besaran; berguna untuk PM2.5 dan angin.
10. **Persentil iklim model sendiri** (rob p95/p99 dari arsip SMOC) supaya bias datum saling hapus. Bisa dipakai untuk debit, gelombang, dan suhu ekstrem.
11. **Waktu tempuh hulu→hilir antar pos untuk hitung mundur kiriman** (hulu_hilir.json). Analognya lahar dan aliran abu sepanjang lembah.
12. **Peringatan berantai berbasis lift empiris berselang** (berantai.js). Bisa diperluas ke gempa→longsor dan erupsi→lahar.
13. **CI regresi tren dilebarkan untuk autokorelasi AR(1) + saringan lompatan bolak-balik** (abrasi.py). Cocok untuk tren luas terbakar dan deformasi vulkanik.
14. **Model keputusan musim: bootstrap tahun historis + parameter segitiga + opsi intervensi beranuitas** (keputusan.js). Ini sudah meniru karhutla dan bisa ditiru untuk kekeringan.
15. **Kasus "LULUS (daya rendah)" ditulis apa adanya + kontrol "PEKA LABEL"** (PRAREG-HULU dan PRAREG-GRRR). Template vonis yang bisa dipakai semua bahaya.

Berkas inti untuk dibaca ulang:
- scripts/banjir/AUDIT-MODEL-2026-11.md
- scripts/banjir/status.py
- scripts/banjir/RISET-MODEL-KAB.md
- scripts/banjir/RISET-DAMPAK.md
- scripts/banjir/RISET-GRRR.md
- docs/banjir/NOWCAST-JKT.md
- scripts/banjir/genangan/DIAGNOSIS-J3.md
- docs/multi-bencana/bencana/abrasi.md
- src/ews.js
- public/banjir/index.html (baris 211)