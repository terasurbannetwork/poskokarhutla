Inventaris teknik untuk LONGSOR, GEMPA, dan GUNUNGAPI. Dicek di kode dan data checkout per 24 Nov 2026.

**Yang saya jalankan ulang:**
- `node --test` untuk inatews, kerusakan, kerusakan_nyata, nama_wilayah, pager, silang_beruntun, dan sim_tanggap: 44/44 lulus.
- sim_tanggap kini 15/15. Kegagalan ENOENT pop yang dicatat audit 15 Nov sudah hilang, karena `pop/` sekarang berisi 69 berkas dan `pop_grid.py` jalan di statis.yml:155.
- `node scripts/gunungapi/uji_lahar.mjs`: 21 uji hijau.
- `node scripts/gunungapi/uji_setara.mjs`: ok, selisih posisi maksimum 1,42e-14 derajat.

**Yang tidak saya jalankan:** `uji_js_*.py`, prospektif.test, pb44, silang_tsunami, dan self-check Python. Semuanya menulis berkas sementara atau memanggil Python. Untuk butir itu vonis diambil dari audit 15 Nov dan ditandai demikian.

Format: HAZARD | FIELD | teknik | berkas | state | vonis uji | catatan

## LONGSOR
LONGSOR | PREDIKSI | aturan status 4 tingkat dari hujan kumulatif x kejenuhan x bahaya | scripts/banjir/status.py:88 (level_longsor), :80 (jenuh) | TAYANG (choropleth dan tab Longsor /banjir) | LULUS lemah: ETS Waspada 0,010 CI95 [0,006; 0,014], PSS 0,225, uji 2022-2025, 44 kab (public/banjir/data/validasi.json) | Pembandingnya acak/ETS, bukan klimatologi. Aturan k=0,6 geser -1 dipilih lewat kisi.
LONGSOR | PREDIKSI | penilaian prospektif +1..+3 hari terhadap DIBI | scripts/prediksi/catat.py:16,355; public/prediksi/data/prediksi.json (kode LSR) | TAYANG (/prediksi) | GAGAL: "belum mengalahkan baseline" ps|1 n 4626 skor -4,333; ps|2 -3,143; ps|3 -4,333 | Model bayangan LSR_B dibekukan (catat.py:463,587).
LONGSOR | PREDIKSI | peluang Siaga dari ansambel hujan ECMWF 51 anggota | scripts/banjir/ansambel_hujan.py:1-14; status.py:247 (pl/hl) | TAYANG (prakiraan72) | BELUM DIUJI khusus longsor | Kolom ps di LSR adalah peluang ini.
LONGSOR | PREDIKSI | nowcast gaya LHASA: kerentanan statis x R7/P95 sel | scripts/longsor/model.py:275 (nowcast_dari), rumus.py (S = 0,6 lereng + 0,2 tanah + 0,2 sesar; v2 0,5/0,3/0,2 zona PVMBG) | TAYANG dengan vonis GAGAL tertulis (public/banjir/longsor.js:37-44) | GAGAL: AUC 0,7047 lawan klimatologi kab x bulan 0,7773; selisih CI95 [-0,104; -0,050]; POD sedang+ 0,168, FAR 0,987 | 4.120 dari 7.270 kecamatan tanpa nilai (P95 baru 515 dari 948 sel).
LONGSOR | PREDIKSI | resep LHASA v2: lantai klimatologi sebagai offset, partial pooling, Platt per wilayah | scripts/longsor/model_lhasa2.py; model_lhasa2.sidik | DRAF-TIDAK-TERPASANG (keluaran ke data/raw, bukan public) | BELUM DIUJI: latih 6 Nov, sidik 214565615a1ae705, kandidat hidup LH-N/LH-W, gerbang/buka belum tercatat | Fitur lengas sm "BELUM ditulis".
LONGSOR | PREDIKSI | ambang hujan per kab dengan penyusutan empirical Bayes ke ambang regional | scripts/longsor/ambang_kab.py:113 (fit), :230 (uji2026); ambang_kab_hasil.json | DRAF-TIDAK-TERPASANG ("jangan pasang", RISET-AMBANG-KAB.md:50) | GAGAL: AUC logbook 2026 eb 0,689 / pooled 0,693 lawan aturan berlaku 0,829; d_ets negatif | Uji di label logbook 2026 yang tidak dipakai fit.
LONGSOR | PREDIKSI | kalender musim risiko bulanan | scripts/prediksi/kalender.py:9; public/banjir/longsor.js:54 | TAYANG | BELUM DIUJI | Klimatologi deskriptif.
LONGSOR | SIMULASI | lereng tak-hingga (SINMAP/LISA) + ember kejenuhan dengan rentang asumsi c', phi | public/banjir/sim_longsor.js:1-10 (SimLongsor), dimuat banjir/index.html:293 | TAYANG (tab Simulasi banjir) | BELUM DIUJI ke longsor nyata | Peluang = bagian kombinasi asumsi dengan FS<1.
LONGSOR | EWS | email langganan dari status kecamatan | src/ews.js:196-199 (nilaiTitik), :370 (filter pilihan pelanggan) | TAYANG (cron tiap jam) | BELUM DIUJI vonis | PERLU CEK: bertentangan dengan penilaiLongsor yang menyebut hipotesis "tidak dikirim".
LONGSOR | EWS | penilai peringatan_x berlabel hipotesis, tidak dikirim keluar | src/ews.js:293-302 (sumber_jenis "hipotesis") | TERSEMBUNYI (hanya /api/ews/cek) | TIDAK PERLU | Tunduk ke uji balik yang gagal (PB-49).
LONGSOR | EWS | tangga tindakan warga 3 tingkat | public/ews_tindakan.js:41-50 | TAYANG | TIDAK PERLU | Tanpa `rujukan` bersumber, beda dengan gempa dan gunung api.
LONGSOR | EWS | saran status darurat (Siaga/Awas -> Siaga Darurat; DIBI 7 hari -> Tanggap Darurat) | scripts/umum/saran_status.py:13,40 | TAYANG (saran_status.json) | BELUM DIUJI | Saran rakor, bukan penetapan.
LONGSOR | EWS | butir CAP 1.2 (kategori Geo, kepastian Possible) | src/peringatan.js:194-196 | PERLU CEK (lewat peringatan_x) | BELUM DIUJI | -
LONGSOR | PEMODELAN | uji balik pisah waktu tanpa parameter dilatih pada label (P95 dari 2017-2021 saja) | scripts/longsor/model.py:99 (uji_balik), :28-34 | TAYANG (vonis) | GAGAL (lihat nowcast) | Uji 2022, 2023, 2025; 2024 dibuang.
LONGSOR | PEMODELAN | bootstrap blok tahun-bulan untuk CI AUC | scripts/longsor/model.py:200 (boot_auc, B=300, 36 blok) | TAYANG | dipakai di vonis | -
LONGSOR | PEMODELAN | pembanding berlapis (hujan saja, kerentanan saja, klimatologi kab x bulan, zona PVMBG) + aturan lolos (AUC >= terbaik + 0,02, AUC >= 0,60, POD > hujan pada laju sama) | uji_balik.json "aturan"; model.py:82 | TAYANG | GAGAL | Klimatologi jadi pembanding terkuat.
LONGSOR | PEMODELAN | kisi alternatif dipilih di latih, diterima hanya bila CI berpasangan selisih ETS > 0 | scripts/banjir/uji_balik.py:19-22,49-51 | TAYANG (aturan berlaku) | LULUS untuk aturan berlaku (validasi.json) | Pembanding: aturan SEBELUM uji balik.
LONGSOR | PEMODELAN | pra-registrasi + amandemen sebelum latih + sidik hash berkas | scripts/longsor/PRAREG-LHASA2.md, PRAREG-LHASA2-AMANDEMEN.md (A-1..A-21), model_lhasa2.sidik | DRAF-TIDAK-TERPASANG | BELUM DIUJI | Vonis hanya prospektif; jenjang tenggang +1/+2/+3 tetap.
LONGSOR | PEMODELAN | pembersihan label (g=1 keluar dari negatif, 2024 berlubang dibuang, LABEL_AKHIR dipotong di kode) | tests/longsor/longsor.test.mjs:43; model_lhasa2.py docstring | TAYANG | LULUS (audit 15 Nov, tidak dijalankan ulang) | Tiga sumber label tidak dijumlahkan (kejadian.py).
LONGSOR | PEMODELAN | gerbang JSON vonis tegas dan konsisten dengan angkanya | tests/longsor/longsor.test.mjs:17,27 | TAYANG | LULUS (audit 15 Nov) | -
LONGSOR | PEMODELAN | pemetaan bekas longsor satelit: sidik kriteria, dua penafsir buta (kappa >= 0,6), akurasi per luas Olofsson, plasebo musim sama | data/kajian-bnpb/longsor-satelit/ALGORITMA.md §1-5 | DRAF-TIDAK-TERPASANG (bekas_kriteria.json tidak ada di repo) | BELUM DIUJI | Desain saja.
LONGSOR | DAMPAK | (tidak ada model dampak longsor sendiri) | public/banjir/keputusan.js:10,175 (kerugian sengaja tidak dihitung) | - | - | Paparan zona longsor belum ada; dampak menumpang banjir.

## GEMPA
GEMPA | PREDIKSI | peluang susulan Reasenberg-Jones dengan keragaman a (Page 2016), 81 simpul | scripts/gempa/susulan.py:78 (peluang); public/gempa/susulan.js; kata.js:77-78 | TAYANG (laci, Insight) | LULUS tipis: target m5 uji n 406, BSS 0,0021 lawan klimatologi (Brier 0,07795 lawan 0,07812; bootstrap selisih CI95 [-0,0029; 0,0025]) | m6 dan m_1 TIDAK terbit (kalah di validasi).
GEMPA | PREDIKSI | prospektif susulan append-only | susulan.py:496 (prospektif), :486 (gabung_prospektif); prospektif_susulan.json | TAYANG (Metode) | BELUM CUKUP: 24 dicatat, 18 dinilai, 0 terjadi; Brier m5 0,005 | gempa.yml:40.
GEMPA | PREDIKSI | laju Poisson 12 bulan sesudah declustering Gardner-Knopoff | scripts/gempa/peluang_gempa.py:51,83,90; peluang.json, laju.json | TAYANG (Insight exPeluang, insight.js:109) | CAMPUR: latih 1990-2015 lawan uji 2016-2025 di selang Poisson 90%; M6+ dan M7+ di dalam, M5+ (1120 lawan [1144; 1258]) dan M7+ dangkal di luar; provinsi M6 29/30 | n<3 -> null.
GEMPA | PREDIKSI | prakiraan harian peluang >= 1 susulan M5 per hari, 7 hari | scripts/gempa/laporan_gempa.py:19-22 | TAYANG (laporan.html) | ikut susulan | Hanya bila m5 terbit.
GEMPA | PREDIKSI | deteksi gempa beruntun di lingkaran gunung api, binomial negatif lawan laju historis USGS M4,5+ | scripts/gempa/beruntun.py:85 (nb_ekor), :134 (uji_mundur), :266; public/gempa/beruntun.js | TAYANG (Insight) | BELUM DIUJI ("teruji": false), ambang hipotesis; tingkat menyala backtest 0,00011 (Poisson 0,00026) | Koreksi p x jumlah sasaran < 0,01, N >= 3; lintas.yml:345.
GEMPA | PREDIKSI | indeks regangan GNSS per provinsi + bendera transien | scripts/gempa/gnss.py:153,180 | TAYANG (lapisan peta gnss, peta.js:156) | BELUM DIUJI | Disebut "fitur kasar untuk peluang_gempa.py", tetapi tidak dipakai di sana (dicek dengan grep).
GEMPA | SIMULASI | GMPE per kelas tektonik (BSSA14 kerak / Zhao06 antarmuka & slab) -> PGA -> MMI Worden 2012 | scripts/gempa/guncangan.py:103,113,125,150; public/gempa/guncangan.js | TAYANG (laci, isoseismal, Sim) | BELUM DIUJI resmi (model_guncangan.json kinerja_uji "belum_diuji"); prospektif n 2: bias +1,57, 0% dalam ±1; pembanding MAGMA lihat di bawah | Koefisien dicocokkan ke OpenQuake 16 Okt.
GEMPA | SIMULASI | tebak jenis sumber dekat palung (megathrust tidak pernah diam-diam BSSA14) | guncangan.py:56-60 | TAYANG | LULUS (uji_js_guncangan menolak tebakan salah) | -
GEMPA | SIMULASI | Vs30 dari proksi kemiringan Wald & Allen 2007 | scripts/gempa/vs30.py:640; vs30.bin | TAYANG (Sim) | LULUS invarian (kerusakan.test) | Tabel ditranskripsi dari ingatan: PERLU CEK ke makalah.
GEMPA | SIMULASI | 8 skenario sesar/megathrust + titik bebas + replay gempa nyata dari laci | public/gempa/sim.js:19-28 (DIKENAL), :9-11 (URL0), :73 (nyata) | TAYANG (/gempa/sim) | BELUM DIUJI | "Simulasi, bukan prakiraan".
GEMPA | SIMULASI | tsunami: waktu tiba Dijkstra c=sqrt(gh) + tinggi indikatif Abe/Green + stepper SWE linear | public/gempa/tsunami.js:95 (layak), :179 (waktuTiba), :233 (swe) | TAYANG (Sim) | LULUS invarian (audit 15 Nov): massa kekal 1e-5, c 4 km ~198 m/s | uji_js_tsunami tidak ada di workflow.
GEMPA | SIMULASI | faktor sisi aman evakuasi 0,61 terpisah dari faktor tampilan 0,85 | tsunami.js:11,186-187; sim.js:196 | TAYANG | LULUS: waktu mentah x 0,61 tidak pernah lebih lambat dari SWE +0,5 menit di 13 pantai / 6 skenario | 0,85 sendiri hanya kalibrasi pantai Jawa.
GEMPA | SIMULASI | jalur evakuasi tsunami ke tanah >= 20 m | sim.js:186 | TAYANG | LULUS ("jalur tak pernah memotong laut", uji_js_tsunami butir 8) | -
GEMPA | SIMULASI | banding waktu tiba tsunami.js lawan tsunameter DART (detide 7 konstituen) | scripts/gempa/dart.py:105,191,252; dart.json | TAYANG (lapisan DART realtime) | TIDAK MEYAKINKAN: 2 terdeteksi dari 170 pasangan | Ambang <= 1% jendela 8 jam.
GEMPA | SIMULASI | pemutar ulang buletin tsunami arsip, berlabel latihan | public/gempa/tsunami_zona.js:3-5,88 | TAYANG (tab Katalog) | LULUS (silang_tsunami, audit 15 Nov) | 5 kejadian.
GEMPA | SIMULASI | ilustrasi peringatan dini selisih gelombang P (6,5 km/s) dan S (3,7 km/s) | sim.js:11,282-286 | TAYANG | TIDAK PERLU | "belum termasuk waktu deteksi dan siaran".
GEMPA | EWS | email gempa/tsunami waktu nyata dari autogempa per radius terasa (M7 500 km ... M4 50 km; Awas bila M>=6 dan jarak <= r/3) | src/ews.js:50-52,337,394-421; src/ews_email.js:82 | TAYANG (cron) | LULUS ews.test (audit) | Basi 2 jam (GEMPA_UMUR_MAKS).
GEMPA | EWS | aturan Waspada/Siaga kejadian (M>=5 atau MMI>=IV / M>=6 dangkal), tidak pernah Awas | src/peringatan.js:47,52-72 | TAYANG | LULUS (pb44.test:20, audit) | -
GEMPA | EWS | tsunami: kode Potensi BMKG 1-3 -> Awas berlabel InaTEWS; diam bukan aman | peringatan.js:59-60; src/gempa.js:26 (uraiPotensi); inatews.test:37 | TAYANG | LULUS (dijalankan) | Status resmi tidak ditafsir ulang.
GEMPA | EWS | umpan CAP 1.2 (Geo; gempa Observed, tsunami Likely) | peringatan.js:189-231 | TAYANG | LULUS fixture CAP BMKG (inatews.test:17) | -
GEMPA | EWS | tangga tindakan bersumber (BMKG/JICA, Buku Saku BNPB); tsunami tanpa tingkat 1 | public/ews_tindakan.js:74-121 | TAYANG | LULUS (pb44.test:15,40) | Registri menyalakan tangga hanya bila tiap butir punya rujukan.
GEMPA | EWS | saran status darurat: gempa/tsunami tidak pernah disarankan Siaga | scripts/umum/saran_status.py:8 | TAYANG | LULUS (pb44.test:26) | -
GEMPA | EWS | arsip InaTEWS append-only + pemasangan dua id buletin menurut waktu dan jarak + peringatan aktif | scripts/gempa/inatews.py:218; public/gempa/inatews.js | TAYANG (Katalog) | LULUS 12 uji (dijalankan) | BMKG hanya menyimpan 30 buletin.
GEMPA | EWS | tsunami per zona BMKG -> kabupaten, tingkat tertinggi per kab, eksposur | scripts/gempa/tsunami_zona.py:103,145,161,187 | TAYANG | LULUS (silang_tsunami, audit) | Kamus belum ditinjau manusia (ditinjau: false).
GEMPA | EWS | lapisan sensor seismik InaTEWS, DART realtime, GNSS | public/gempa/peta.js:118-167 | TAYANG | TIDAK PERLU | Pembanding sensor, bukan peringatan kita.
GEMPA | PEMODELAN | pilih param generik lawan disesuaikan per urutan dengan Brier DAN log-likelihood di semua t1 | susulan.py:96 (sesuaikan), :335,358 (menang_sesuai); model_susulan.json kinerja_sesuaikan | TAYANG (keputusan: generik) | GAGAL untuk versi disesuaikan: t1=0,5 ll -0,2016 lawan generik -0,1834; Brier 0,0518 lawan 0,0445 | terbit_sesuaikan false; JS ikut (kata.js:78).
GEMPA | PEMODELAN | terbit per target hanya bila tidak kalah dari klimatologi (k+0,5)/(n+1) | susulan.py:274,383-384 | TAYANG | m5 terbit; m6, m_1 tidak | Kartu target yang kalah dibuang (A18).
GEMPA | PEMODELAN | latih/validasi/uji pisah waktu, uji dibuka SEKALI, dijaga sidik_param (tolak bila param berubah) | susulan.py:388,420-429; model_susulan.json kinerja_uji (dibuka_kali 1, sidik da2fc635eca1) | TAYANG | LULUS proses | `--buka-ulang-uji` tercatat.
GEMPA | PEMODELAN | gerbang tampil rentang 10-90% hanya bila Mu <= rentang_maks_mu (5,5) | susulan.js:4; model_susulan.json rentang_maks_mu | TAYANG | TIDAK PERLU | -
GEMPA | PEMODELAN | reliabilitas per bin + N-test + bootstrap selisih Brier | susulan.py:295,323 | TAYANG (Metode) | N-test gagal: harapan 365,8 lawan amat 177 (uji m5) | Jumlah susulan ditaksir terlalu tinggi.
GEMPA | PEMODELAN | prospektif guncangan + PAGER dicatat <= 48 jam, tanpa retrospektif menyamar; append-only dicek ke git HEAD (keluar 3) | scripts/gempa/prospektif.py:52,93,183,230 | TAYANG (Metode) | BELUM CUKUP: n 2, bias 1,57, MAE 1,57 | gempa.yml:67-75; prospektif.test tidak dijalankan (menulis tmp).
GEMPA | PEMODELAN | arsip prospektif PAGER per gempa M>=5 | scripts/gempa/pager.py:70,89 | TAYANG | BELUM DIUJI (3 butir, 0 dinilai) | -
GEMPA | PEMODELAN | kesetaraan Python-JS dengan kasus LCG tetap | scripts/gempa/uji_js_susulan.py (80 kasus), uji_js_guncangan.py (60 kasus + 7.274 kec), uji_js_pager.py (200 + Cianjur), uji_js_tsunami.py | TAYANG | LULUS (audit 15 Nov) | Hanya susulan dan guncangan di gempa.yml:34-35.
GEMPA | PEMODELAN | koreksi residu dari laporan dirasakan EMSC: 5 kandidat, penyusutan K=15, pisah 60/20/20, koreksi dibekukan dengan sidik | scripts/gempa/emsc.py:167,231,304; emsc_residu.json, emsc_prospektif.json | TERSEMBUNYI (koreksi tidak dipasang) | GAGAL: RMSE uji wilayah+jarak 1,598 lawan raw 1,556, selang 90% selisih [0,027; 0,057] | Terbekukan "raw", sidik 515867f67152789d.
GEMPA | PEMODELAN | pembanding MMI laporan Kajian MAGMA lawan model (pembanding, bukan kalibrasi; bias seleksi tercatat) | scripts/gempa/kajian_magma.py; insight.js:128-131 | TAYANG (Insight) | n 1474: bias +0,25, MAE 0,73, 75,4% dalam ±1; slab dalam bias -1,61 | Satu-satunya angka kinerja GMPE yang besar.
GEMPA | PEMODELAN | indeks risiko riwayat 0-100 (50:30:20; tren dibagi rasio nasional; declustering) | scripts/gempa/riwayat.py:124,148,177; risiko.json | TAYANG (Tren, laci) | TIDAK PERLU (riwayat) | 7.268 kec, 514 kab.
GEMPA | PEMODELAN | nilai-b Aki-Utsu dan Mc kurvatur maksimum + 0,2 | riwayat.py:73; susulan.py:190-195 | TAYANG | TIDAK PERLU | -
GEMPA | PEMODELAN | penjaga data beku | scripts/agents/cek_basi.py gempa (gempa.yml:99) | TAYANG (CI) | LULUS (pb44.test:34, audit) | -
GEMPA | DAMPAK | paparan penduduk per kelas MMI (GMPE x WorldPop per kecamatan) | public/gempa/guncangan.js:124 (paparan) | TAYANG (laci, Sim) | ikut GMPE | -
GEMPA | DAMPAK | korban jiwa empiris PAGER (koefisien ID Jaiswal & Wald 2010, pita x/÷4, kelas warna) | scripts/gempa/pager.py:32; public/gempa/pager.js; laci.js:57-58 | TAYANG (laci) | LULUS paritas (tes Cianjur dijalankan); vonis prospektif BELUM | Tanpa tsunami dan likuefaksi.
GEMPA | DAMPAK | rantai PGA -> kerapuhan HAZUS lognormal -> rusak/runtuh -> korban, dengan okupansi jam dan pita tau/phi | public/gempa/kerusakan.js:27-103; sim.js:85,154,267 | TAYANG (Sim) | LULUS 7 uji (dijalankan) | -
GEMPA | DAMPAK | kalibrasi satu pengali median kerapuhan ke 8 gempa kerak + galat leave-one-out | scripts/gempa/kalibrasi_kerusakan.mjs:34-46; kalibrasi_kerusakan.json | TAYANG (angka di Sim) | kal 3,06; faktor LOO 5,34x; di luar sampel Padang 2009: model 3063 lawan 1115 | Korban ditulis dari ingatan: PERLU CEK ke sumber.
GEMPA | DAMPAK | bukti fasilitas rawan (atas sesar <= 1 km, MMI>=VII skenario Wells-Coppersmith, genangan <= 10 m & <= 2 km pantai, tanpa tanah tinggi 2 km, genangan BNPB Mw9) | scripts/gempa/bukti.py:78-82,253,299; public/gempa/bukti.js; bukti.json | TAYANG (Insight, Dampak, laci) | TIDAK PERLU (skenario) | OSM di luar provinsi Dapodik.
GEMPA | DAMPAK | paparan bahaya jangka panjang InaRISK x WorldPop, 3 kelas | scripts/gempa/dampak.py:142-153; public/gempa/dampak.js | TAYANG (Dampak) | TIDAK PERLU | Kelas sepertiga sama lebar adalah pilihan sendiri.
GEMPA | DAMPAK | bandara di zona MMI >= VI | public/gempa/kata.js:102-105; laci.js:65 | TAYANG | TIDAK PERLU | Memakai bandara.json milik gunung api.
GEMPA | DAMPAK | eksposur tsunami per kab dari zona buletin | tsunami_zona.py:187 | TAYANG | TIDAK PERLU | Seluruh kab, bukan zona rendah.
GEMPA | DAMPAK | citra Sentinel-2 sebelum/sesudah gempa darat M>=6,5 | scripts/gempa/citra.py; kata.js:106-109 | TAYANG (laci bila cocok) | TIDAK PERLU | 6 kejadian.

## GUNUNGAPI
GUNUNGAPI | PREDIKSI | ansambel peluang abu di bandara/kota (3 model angin x 0,5/1/2 kolom x 3/6 jam = 18 anggota + 51 ENS IFS) dengan 3 ambang mg/m3 | scripts/gunungapi/peluang_abu.py:214-295; abu_peluang.json; insight.js:268-274 | TAYANG (Insight) | Brier BELUM DIUJI; hanya uji arah (lihat bawah) | Skenario "jika meletus sekarang".
GUNUNGAPI | PREDIKSI | peluang letusan 7 hari (regresi logistik lawan persistensi) | scripts/gunungapi/arsip_magma.py:123; rezim_letusan.json uji_peluang; metode.js:30-31 | TERSEMBUNYI (kartu sengaja tidak dibuat) | GAGAL: skill 0,059, CI90 [-0,014; 0,13]; kolom >= 1.500 m skill -0,02 | Gerbang tampil berbasis skill.
GUNUNGAPI | PREDIKSI | daftar pantau anomali kegempaan vulkanik (>= 10, >= 1,5x rata-rata sendiri, > persentil 90) | public/gunungapi/insight.js:226-250; arsip_magma.py uji_kegempaan | TAYANG berlabel hipotesis | Lemah: 7/107 hari alarm (6,5%) diikuti letusan lawan 36/783 hari tenang (4,6%); 2 dari 19 episode | arsip_magma.py tanpa workflow.
GUNUNGAPI | PREDIKSI | daya radiatif termal MIROVA (VRP) | scripts/gunungapi/mirova.py; lintas.yml:241-250 | TAYANG (atribusi saja) | BELUM DIUJI | izin_olah "belum": dilarang jadi masukan model.
GUNUNGAPI | SIMULASI | dispersi abu Lagrangian 5000 partikel, sebaran vertikal Suzuki, MER Mastin, angin IFS 8 lapisan, mulberry32 | scripts/gunungapi/abu.py:90,150,160,166; public/gunungapi/abu_model.js | TAYANG (peta abu 72 jam, Sim 3D) | uji arah: berambang GAGAL n 4, 25%, p 0,684; sebaran mentah n 29, 72% dalam 45° lawan acak 25% dan klimatologi 55% | -
GUNUNGAPI | SIMULASI | lahar LAHARZ (A = 0,05 V^2/3, B = 200 V^2/3) + kecepatan Manning | public/gunungapi/sim_lahar.js:28 (isiSink), :98, :149 | TAYANG (Sim) | LULUS 21 uji invarian (dijalankan) | Belum divalidasi ke kejadian.
GUNUNGAPI | SIMULASI | awan panas kerucut energi H/L + kecepatan garis energi (3-50 m/s) | sim_lahar.js:123 | TAYANG | LULUS (sim_tanggap:93) | -
GUNUNGAPI | SIMULASI | replay skenario setara Merapi 2010 (V 10 jt m3, H/L 0,15) | scripts/gunungapi/cek_merapi2010.mjs; dikutip sim.js:355 | TAYANG (angka di teks Sim; skrip lab manual) | awan panas 17,6 km lawan nyata ±15-17 km; terpapar ~90.000 tanpa evakuasi (±245x korban) | Butuh jaringan dan sharp.
GUNUNGAPI | SIMULASI | evakuasi berkapasitas (antrean titik kumpul, armada, ruas terpotong) | public/gunungapi/sim_tanggap.js:94; paparan.py:136,337 (Dijkstra OSM) | TAYANG | LULUS 15/15 (dijalankan) | Angka satuan ASUMSI.
GUNUNGAPI | SIMULASI | peringkat perlakuan radius x mulai x armada, front Pareto menurut biaya | sim_tanggap.js:129; sim.js:458 | TAYANG | LULUS (pareto diverifikasi lawan semua paket) | -
GUNUNGAPI | SIMULASI | ketidakpastian rentang: kolom x0,7/x1,4, volume ÷3/x3 | sim.js:357 | TAYANG | TIDAK PERLU | -
GUNUNGAPI | EWS | hanya KENAIKAN level resmi PVMBG memicu (segar <= 2 hari) | src/ews.js:278-290 (penilaiGunungapi) | DRAF-TIDAK-TERPASANG (migrasi 0137 peringatan_x belum di produksi menurut audit 15 Nov; PERLU CEK) | BELUM DIUJI vonis | Tanpa tingkat buatan.
GUNUNGAPI | EWS | tangga tindakan per KRB dari Permen ESDM 15/2011 (pedoman_krb.json) | public/ews_tindakan.js:148-160 | TAYANG | LULUS (ews_tindakan.test, audit) | Tiap butir menunjuk baris pedoman_krb.json.
GUNUNGAPI | EWS | arahan per KRB untuk level saat ini | insight.js:112 | TAYANG | TIDAK PERLU | -
GUNUNGAPI | EWS | saran status darurat (III -> Siaga Darurat, IV -> Tanggap Darurat) | scripts/umum/saran_status.py:43,156 | TAYANG | BELUM DIUJI | -
GUNUNGAPI | EWS | kode warna penerbangan VONA terpisah dari Level I-IV | public/gunungapi/app.js:15 | TAYANG | TIDAK PERLU | -
GUNUNGAPI | EWS | silang kegempaan MAGMA di kolom terpisah dari deteksi beruntun | scripts/gempa/beruntun.py:294 (silang_magma) | TAYANG | TIDAK PERLU | Tidak dilebur jadi satu angka.
GUNUNGAPI | PEMODELAN | kesetaraan Python-JS model abu (RNG, jejak, endapan, kasus dekat ambang, kontrol negatif Float32) | scripts/gunungapi/uji_setara.mjs | TAYANG (CI lintas.yml:100, boleh gagal) | LULUS (dijalankan): posisi 1,42e-14°, 0 beda | -
GUNUNGAPI | PEMODELAN | jam penilaian ditetapkan di muka + dua versi (berambang / sebaran mentah) + pembanding acak 25% dan klimatologi leave-one-out | scripts/gunungapi/uji_abu.py | TAYANG (Insight kinerja insight.js:136, Metode) | lihat SIMULASI abu | p binomial ditandai optimistis.
GUNUNGAPI | PEMODELAN | prospektif arah abu jam ke-6 lawan VONA 12 jam, append-only, dipecah menurut sumber tinggi kolom | scripts/gunungapi/prospektif.py; prospektif_abu.json; metode.js:36-37,67 | TAYANG (Metode) | LULUS awal: kolom teramati 9/11 (82%) p 0,000126; kolom asumsi 5/7 (71%) p 0,013 lawan acak 25% | 840 dicatat, 813 dinilai, hanya 18 ber-VONA.
GUNUNGAPI | PEMODELAN | tinggi kolom hanya dari data 0-48 jam SEBELUM awal skenario (anti-bocor ke target prospektif) | abu.py:419 (kolom_untuk) | TAYANG | TIDAK PERLU | -
GUNUNGAPI | PEMODELAN | uji tren Mann-Kendall + Theil-Sen | scripts/gunungapi/tren.py; dampak_gunungapi.json tren | TAYANG (Insight) | semua "tidak bermakna" (mis. mengungsi p 0,235) | n 15.
GUNUNGAPI | PEMODELAN | indeks risiko riwayat GVP 0-100 (50:30:20, tren dibagi rasio nasional) | scripts/gunungapi/risiko.py | TAYANG | TIDAK PERLU (tidak diuji balik) | Tanpa workflow.
GUNUNGAPI | PEMODELAN | tren 2018-2023 lawan 2024+ sengaja tidak dihitung (artefak pencatatan) | arsip_magma.py:47 | TAYANG | TIDAK PERLU | -
GUNUNGAPI | PEMODELAN | gerbang lisensi (data nonkomersial tidak jadi masukan model) | mirova.py:297-298 | TAYANG | TIDAK PERLU | -
GUNUNGAPI | DAMPAK | paparan WorldPop 1 km per cincin 3/5/10/15 km dan per zona KRB, desa, sekolah, faskes, titik kumpul | scripts/gunungapi/paparan.py:289,294,388; dampak.js | TAYANG (Dampak, dialog) | TIDAK PERLU | 69 gunung.
GUNUNGAPI | DAMPAK | jiwa dalam radius rekomendasi dengan interpolasi r^2 + seri tahunan BNPB 2010-2024 | scripts/gunungapi/dampak.py | TAYANG | TIDAK PERLU | Tanpa rupiah.
GUNUNGAPI | DAMPAK | paparan per piksel berbobot luas, tanpa hitung ganda awan panas + lahar | sim_tanggap.js:67,78; pop_grid.py | TAYANG (Sim) | LULUS (sim_tanggap:60,68,122) | -
GUNUNGAPI | DAMPAK | sektor penerbangan: bandara di jalur abu 72 jam, jam tiba, bandara tertutup | abu.py:341 (dampak_bandara); sim_tanggap.js:158; insight.js:88-97; dampak.js:80-84 | TAYANG | TIDAK PERLU | Ambang 2 mg/m3, 25 km.
GUNUNGAPI | DAMPAK | logistik masker berbiaya (2 per orang per hari, Rp 3.500) | sim_tanggap.js:149; sim.js:354,473 | TAYANG | LULUS (sim_tanggap:83) | Asumsi.
GUNUNGAPI | DAMPAK | izin tambang WIUP di dalam zona | paparan.py:310,503 | TAYANG (lapisan Tambang) | TIDAK PERLU | Badan usaha saja.
GUNUNGAPI | DAMPAK | citra Sentinel-2 sebelum/sesudah 5 peristiwa | scripts/gunungapi/citra.py | TAYANG | TIDAK PERLU | -

## TEKNIK UNIK
Teknik yang ada di sini dan kemungkinan belum ada di karhutla, banjir, udara, kekeringan, cuaca, pesisir. Ketiadaan di bencana lain tidak saya cek dengan grep menyeluruh: PERLU CEK.

1. **Pilih param generik lawan disesuaikan dengan Brier DAN log-likelihood, plus "terbit per target"** (susulan.py:358,383). Bisa dipakai di banjir/karhutla: kalibrasi per wilayah hanya dipasang bila mengalahkan param nasional di validasi.
2. **Uji dibuka sekali yang dijaga sidik_param** (skrip menolak jalan bila param berubah sesudah uji dibuka; susulan.py:420-426). Bisa jadi standar semua model yang punya set uji.
3. **Gerbang lebar selang** (rentang_maks_mu): pita ketidakpastian hanya tampil di rentang yang tervalidasi. Cocok untuk ansambel hujan dan asap.
4. **Declustering Gardner-Knopoff sebelum Poisson, lalu backtest selang Poisson 90%** (peluang_gempa.py). Polanya bisa dipakai untuk peluang tahunan banjir/kebakaran per kab sesudah kejadian beruntun digabung.
5. **Deteksi lonjakan binomial negatif dengan overdispersi dari data, koreksi jumlah sasaran, dan tingkat menyala backtest** (beruntun.py). Bisa untuk lonjakan titik panas, PM2.5, atau laporan warga.
6. **Prospektif "dicatat <= 48 jam, tanpa catatan retrospektif yang menyamar" + `felt_sudah_ada` dipisah di metrik** (prospektif.py). Bisa untuk cuaca/udara yang pembandingnya terbit belakangan.
7. **PAGER empiris (Phi lognormal per kelas intensitas x penduduk)**. Polanya pindah ke kurva mortalitas banjir per kedalaman.
8. **Kalibrasi satu pengali + faktor galat leave-one-out yang ditampilkan ke pengguna** (kalibrasi_kerusakan.mjs). Bisa untuk kurva rusak-kedalaman banjir dan dampak kesehatan asap.
9. **Faktor sisi aman evakuasi terpisah dari faktor tampilan** (0,61 lawan 0,85). Bisa untuk waktu tiba banjir bandang/genangan.
10. **Uji invarian fisik di samping paritas** (massa kekal, c=sqrt(gh), jalur tak memotong laut). Bisa untuk SWE genangan banjir dan dispersi asap.
11. **RNG ber-seed (mulberry32) + kontrol negatif Float32 dalam uji paritas** (uji_setara.mjs). Bisa untuk semua simulasi peramban stokastik.
12. **Koreksi residu dari laporan warga dengan penyusutan K, pisah waktu, dibekukan, lalu ditolak jujur** (emsc.py). Bisa untuk laporan kedalaman banjir dari warga.
13. **Pembanding laporan lembaga yang dinyatakan "pembanding bukan kalibrasi" dan bias seleksi ditulis** (kajian_magma.py). Bisa untuk laporan BPBD lawan model banjir.
14. **Kamus zona buletin -> kabupaten, tingkat tertinggi, zona tak cocok tetap tampil dengan nama asli** (tsunami_zona.py). Bisa untuk poligon peringatan cuaca/gelombang BMKG ke kabupaten.
15. **Pemutar ulang buletin resmi berlabel latihan** (tsunami_zona.js). Bisa untuk replay peringatan banjir/cuaca.
16. **Detide harmonik + ambang kuantil false alarm per jendela** (dart.py). Bisa untuk pasang surut/rob dan pos duga air.
17. **Bendera transien robust z (MAD) pada deret sensor** (gnss.py). Bisa untuk anomali sensor udara dan muka air.
18. **Ansambel multi-model angin x parameter sumber dengan bobot sama + verifikasi arah sudut lawan pengamatan (klimatologi LOO)** (peluang_abu.py, uji_abu.py). Bisa untuk arah asap karhutla lawan citra satelit.
19. **Larangan bocor input: hanya observasi sebelum awal skenario** (abu.py:419). Berlaku umum untuk model yang memakai observasi terkini.
20. **Front Pareto perlakuan evakuasi berbiaya** (sim_tanggap.js:129). Bisa untuk evakuasi banjir dan karhutla.
21. **Paparan per piksel berbobot luas tanpa hitung ganda antar-bahaya** (sim_tanggap.js:78,122). Bisa untuk banjir + longsor gabungan.
22. **Gerbang tampil berbasis skill: kartu peluang tidak dibuat bila CI skill melewati 0, alasannya ditulis di Metode** (metode.js:31). Bisa untuk semua jenis.
23. **Gerbang lisensi: data nonkomersial tampil dengan atribusi tetapi dilarang jadi masukan model** (mirova.py). Berlaku untuk sumber pihak ketiga mana pun.
24. **Protokol pemetaan satelit: sidik kriteria, dua penafsir buta dengan kappa, akurasi per luas Olofsson, plasebo musim sama** (longsor-satelit/ALGORITMA.md). Bisa untuk area terbakar dan luas genangan.
25. **LAHARZ + H/L + Manning untuk aliran massa ber-DEM**. Bisa untuk banjir bandang/debris flow.
26. **"Saran status" yang mengecualikan bahaya mendadak dari Siaga** (saran_status.py:8). Prinsipnya pindah ke bahaya tanpa tenggang peringatan.

Ada lima hal yang kode dan dokumen audit tidak sepakat; perlu dicek sebelum dikutip:
- **Email longsor.** Email langganan longsor terkirim lewat nilaiTitik (ews.js:198,370). Padahal penilaiLongsor (ews.js:293) menyatakan hipotesis "tidak dikirim keluar".
- **lintas.yml:332 basi.** Komentarnya bilang beruntun.py "belum dirantai", tetapi baris 345 menjalankannya.
- **gempa.md basi.** Tab metode/sim gempa dan metode gunung api kini tampil; registri hanya menyembunyikan "informasi".
- **GNSS tidak terpakai.** Disebut sebagai fitur untuk peluang_gempa.py, tetapi tidak dipakai di sana.
- **Kinerja GMPE.** model_guncangan.json menulis "belum_diuji", padahal kajian_magma.json sudah memuat pembanding MMI n 1474.