INVENTARIS TEKNIK: KEKERINGAN, CUACA, LAPIS BERSAMA (/prediksi + EWS)
Dasar: kode dan berkas data yang dikomit di HEAD, dibaca 24 Nov 2026. Uji TIDAK saya jalankan (mode baca saja). Vonis diambil dari JSON hasil yang dikomit atau dari catatan audit 15 Nov. Format baris: BAHAYA | BIDANG | teknik | berkas | keadaan | vonis | catatan.

== KEKERINGAN ==
KEKERINGAN | PREDIKSI | ansambel musiman 51 anggota (SEAS5) dengan peluang ambang | scripts/kekeringan/prakiraan.py:422 | TAYANG | BELUM DIUJI (hindcast SEAS5 tidak tersedia) | peluang SPI-3 <=-1/-1,5/-2 untuk +1..+3 bulan, HTH>=31/61 dalam 90 hari; tanpa koreksi bias, rasio bias hanya dilaporkan
KEKERINGAN | PREDIKSI | prospek bersyarat fase ENSO (cadangan) | scripts/kekeringan/prakiraan.py:388 | TAYANG (dipakai bila SEAS5 tidak ada) | GAGAL: BSS -0,019 vs klimatologi, tangkapan 0,5%, alarm palsu 96,6% (kekeringan_ujibalik.json prospek.semua) | LOO 1991-2025, prediktor ONI Mar-Mei
KEKERINGAN | PREDIKSI | pembungkus kontrak peluang dengan p_dasar klimatologi | scripts/kekeringan/peluang_kering.py:113 | TAYANG (Insight "peluang", insight.js:271) | TIDAK PERLU (tidak ada angka baru) | layar wajib membaca selisih terhadap p_dasar
KEKERINGAN | PREDIKSI | model bayangan logit (klimatologi kab-bulan + SPI-3) | scripts/kekeringan/bayangan.py:49,79; public/kekeringan/insight.js:251 | TAYANG (kartu Insight, berdampingan) | lab: AUC-PR 0,175 vs klimatologi 0,134 vs aturan lama 0,034, FAR 88%; prospektif n=0; retrospektif 1 bulan skill Brier -0,55 (peluang_bayangan_nilai.json) | tanpa workflow, dibuat tangan; ONI/DMI dibuang karena bocor jeda rilis
KEKERINGAN | PREDIKSI | indeks bahaya SPI-3/6 gamma tulis sendiri | scripts/kekeringan/spi.py:63 | TAYANG | LULUS self-check matematis (bukan terhadap contoh WMO) | baku 1991-2020, koreksi bulan nol hujan
KEKERINGAN | PREDIKSI | hari tanpa hujan (HTH) kelas BMKG | scripts/kekeringan/hth.py:48 | TAYANG | BELUM DIUJI | <1 mm, jendela 92 hari, plafon 93
KEKERINGAN | EWS | aturan status 4 tingkat dengan penguat (tanah, SPI-6) | scripts/kekeringan/status.py:46-60,100 | TAYANG + pil hipotesis | GAGAL: POD 0,10-0,38, FAR 0,95-0,99 vs DIBI (kekeringan_ujibalik.json kejadian.vonis) | Awas butuh penguat; DC hanya lapisan peta
KEKERINGAN | EWS | peringatan resmi BMKG terpisah dari deteksi kita, arsip per dasarian | scripts/kekeringan/peringatan_bmkg.py; public/kekeringan/insight.js:40 | TAYANG | TIDAK PERLU | status BMKG apa adanya, tidak bisa diisi mundur
KEKERINGAN | EWS | SK darurat BNPB sebagai lapis resmi | scripts/kekeringan/resmi.py | TAYANG | TIDAK PERLU | SK hanya ada untuk 2025, jadi daftar aktif hampir selalu kosong
KEKERINGAN | EWS | penilai EWS kekeringan yang ditahan karena hipotesis | src/ews.js:268-274,304-310 | DRAF-TIDAK-TERPASANG (dibuang sebelum ditulis) | LULUS uji "hipotesis tidak keluar" (tests/warga/ews.test.mjs:730) | komentar menyebut "tampil di layar", tetapi saya tidak menemukan layar yang membacanya (PERLU CEK)
KEKERINGAN | PEMODELAN | protokol penyetelan pra-registrasi, 21 kandidat, uji sekali | scripts/kekeringan/ambang.py:149; RISET-AMBANG.md | TERSEMBUNYI (Metode) | GAGAL: E-0,5 POD 0,23, FAR 0,93, batas bawah CSI 0 | kriteria layak POD>=0,5, FAR<=0,8, CSI>=2x acak
KEKERINGAN | PEMODELAN | penyetelan putaran 2: 728 kandidat, 8 rancangan, Bonferroni | scripts/kekeringan/ambang2.py:204,218 | TERSEMBUNYI | GAGAL di kedelapan rancangan | D7 diagnosis, bukan kemampuan prakiraan
KEKERINGAN | PEMODELAN | uji balik tahun kering terkenal vs tahun netral dengan gamma LOO | scripts/kekeringan/ujibalik.py:280 | TAYANG ("Seberapa tepat") | informatif saja, tanpa vonis | 2015/2019/2023 vs netral ONI
KEKERINGAN | PEMODELAN | label kejadian multi-sumber dengan cakupan (bulan tanpa cakupan bukan negatif) | scripts/kekeringan/label.py:58,74 | TERSEMBUNYI (data/raw, git-ignored) | LULUS self-check | 4 sumber digabung; tumpang tindih sumber dicatat; kab yang tidak menerbitkan SK dikeluarkan
KEKERINGAN | PEMODELAN | uji kualitas label (ujilabel): persistensi tanpa bocor, bootstrap blok kab x tahun | scripts/kekeringan/ujilabel.py:74,97,139; RISET-LABEL.md | TERSEMBUNYI | GAGAL: SPI-3<=-1 CSI 0,037 vs klimatologi K1 0,104 vs persistensi 0,191 (uji 2023-26) | ada baris tanpa pelapor berulang; persistensi = pembanding terkuat
KEKERINGAN | PEMODELAN | pembanding luar Copernicus GDO (kappa + ensemble) | scripts/kekeringan/gdo.py:149,219 | TERSEMBUNYI (tab Metode tersembunyi) | GAGAL: kappa 4 kelas 0,224; ensemble CSI 0,031 vs kita 0,037 | konvensi waktu bulan M+1 dipilih di latih
KEKERINGAN | PEMODELAN | prospektif append-only dengan pemeriksa | scripts/kekeringan/prakiraan.py:557-569 | TERSEMBUNYI (berkas data) | BELUM DIUJI: 1 terbit, hasil {} | kekeringan_prospektif.json
KEKERINGAN | PEMODELAN | gerbang tampil "Ambang masih hipotesis" | public/kekeringan/app.js:47,54; peta_kab.js:5; unduh.js:3 | TAYANG | TIDAK PERLU | pil lepas hanya bila vonis.layak; ikut ke berkas unduhan
KEKERINGAN | PEMODELAN | kesetaraan Python dan JS untuk neraca | scripts/kekeringan/neraca.py:53 (uji jalankan node); tests/kekeringan/sim_tanggap.test.mjs | TAYANG | LULUS 9/9 (audit 15 Nov) | jalan di CI, boleh gagal
KEKERINGAN | PEMODELAN | uji rantai tanpa jaringan (invarian lintas keluaran, soket ditutup) | scripts/kekeringan/uji_rantai.py | TIDAK PERLU tampil | LULUS (audit 15 Nov, PERLU CEK) | hth->prakiraan->padi->ujibalik->laporan
KEKERINGAN | PEMODELAN | ketidakpastian ansambel p10/p50/p90 di simulasi | public/kekeringan/simulasi.js:85-88 | TAYANG | BELUM DIUJI | rentang min-maks dampak antar persentil; selang SPI terkalibrasi tidak ada
KEKERINGAN | SIMULASI | neraca air bak FAO-56 180 hari dengan skenario | scripts/kekeringan/neraca.py:395; public/kekeringan/simulasi.js | TAYANG (tab simulasi, index.html:127) | LULUS kesetaraan; BELUM DIUJI terhadap amatan | mulai hari ini atau 1 Juni; skenario ECMWF, El Nino, Normal
KEKERINGAN | SIMULASI | hindcast tahun nyata + kalibrasi satu pengali, LOO dua tahun | scripts/kekeringan/hindcast.py:15; public/kekeringan/simulasi.js:316-332 | TAYANG | uji silang 2 tahun saja (2015, 2023) | 2019 tidak ada di bahan; dibuat tangan
KEKERINGAN | SIMULASI | peringkat perlakuan biaya vs manfaat (truk, sumur bor, pompa, tanam awal, OMC) | public/kekeringan/sim_tanggap.js:7; simulasi.js:93 | TAYANG | LULUS sim_tanggap 9/9 (fungsi murni) | biaya berupa ASUMSI, bukan e-katalog
KEKERINGAN | SIMULASI | tutupan lahan raster dengan faktor sawah tunggal | scripts/kekeringan/tutupan.py:65 | TAYANG (di simulasi) | BELUM DIUJI | sawah bukan amatan
KEKERINGAN | DAMPAK | paparan jiwa Siaga/Awas (WorldPop) | scripts/kekeringan/dampak.py:27 | TAYANG | TIDAK PERLU | 147,9 jt Siaga+ adalah batas atas
KEKERINGAN | DAMPAK | jiwa tanpa air layak (BPS kurasi) | scripts/kekeringan/dampak.py:73 | DRAF-TIDAK-TERPASANG (dibuang bila air_minum.json tidak ada) | TIDAK PERLU | tidak boleh mengarang angka
KEKERINGAN | DAMPAK | sekolah dan faskes di kab Siaga/Awas dengan cakupan | scripts/kekeringan/dampak.py:37 | TAYANG | TIDAK PERLU | hanya 9 provinsi (33 dari 246 kab)
KEKERINGAN | DAMPAK | cekaman padi tadah hujan FAO-56 + FAO-33 (selisih vs Normal) | scripts/kekeringan/padi.py:99,169 | TAYANG | BELUM DIUJI terhadap data puso | bobot penduduk, bukan luas sawah; tidak boleh diperingkat lintas wilayah
KEKERINGAN | DAMPAK | logistik air bersih: posko greedy + rit tangki (Sphere 15 L) | scripts/kekeringan/posko.py:34,63 | TERSEMBUNYI (tab posko) | TIDAK PERLU | tangki 5.000 L adalah asumsi
KEKERINGAN | DAMPAK | indeks risiko riwayat 0-100 (kekerapan/besaran/tren) | scripts/kekeringan/riwayat.py:76 | TAYANG (Tren) | BELUM DIUJI | bobot 0,5/0,3/0,2 sama dengan karhutla
KEKERINGAN | DAMPAK | kab berulang kering (uji binomial) + tampungan per 100 rb jiwa; gambut Siaga | scripts/kekeringan/bukti.py:65,90 | TAYANG | TIDAK PERLU | indikator kasar; TMAT tidak bisa diakses
KEKERINGAN | DAMPAK | inventaris tampungan OSM | scripts/kekeringan/embung.py:43 | TAYANG (lapisan peta) | TIDAK PERLU | batas bawah
KEKERINGAN | DAMPAK | sektor sawah/lahan rusak + IRBI dari BNPB | scripts/kekeringan/resmi.py; dampak.py:89 | TAYANG | TIDAK PERLU | skala IRBI 2025 berbeda
KEKERINGAN | SIMULASI | neraca air Jawa: bak Thornthwaite-Mather + routing sub-DAS + waduk + kebutuhan | scripts/air/neraca/neraca.py:45,103,197 | TERSEMBUNYI (public/data/neraca_air, tidak ada layar yang membaca) | sebagian: tahunan vs BPS +5,9% LOLOS; muara vs GloFAS rasio 1,01 LOLOS; Jun-Okt 1,34 GAGAL (VALIDASI.md) | konservasi massa dicek tiap jalan; N80 kemarau
KEKERINGAN | DAMPAK | kebutuhan air sektoral (domestik SNI, irigasi KP-01, ternak, industri) | scripts/air/neraca/kebutuhan.py:92,126 | TERSEMBUNYI | TIDAK PERLU | aliran balik 30% adalah keputusan pemilik
KEKERINGAN | PEMODELAN | tren GRACE Sen + Mann-Kendall dengan koreksi autokorelasi | scripts/air/neraca/grace.py:61,71 | TERSEMBUNYI | BELUM DIUJI | resolusi asli sekitar 330 km
KEKERINGAN | SIMULASI | proyeksi CMIP6 delta-change, ET0 dihitung ulang per model | scripts/air/neraca/proyeksi_neraca.py:30,49; proyeksi_iklim.py | TERSEMBUNYI | BELUM DIUJI | 5 model, ssp245/585, sebaran p10-p90
KEKERINGAN | PREDIKSI | deret anomali simpanan bulanan sebagai fitur | scripts/air/neraca/deret.py:30 | TERSEMBUNYI (dipakai model banjir, model_kab_campur.py:30) | PERLU CEK | acuan = tahun latih pemanggil

== CUACA ==
CUACA | EWS | tingkat 4 per kecamatan = maksimum saluran (hujan, embusan, Hs, peluang ansambel) | scripts/cuaca/dasar.py:9-14,27; prakiraan_kec.py | TAYANG + pil hipotesis | GAGAL (hujan, lihat verifikasi); embusan, Hs, ansambel BELUM DIUJI | hujan 50/100/150 mm; embusan 54/72/90 hipotesis; Hs 2,5/4/6
CUACA | EWS | CAP nowcast BMKG diteruskan dengan kata dan warna asli | src/nowcast.js; public/cuaca/peta.js | TAYANG (cron 600 dtk) | LULUS tests/warga/cuaca_nowcast.test.mjs (4) | tidak dipetakan ke tingkat kita
CUACA | EWS | pemetaan severity CAP ke tingkat alarm | src/peringatan.js:83; src/ews.js:51 | TAYANG | LULUS tests/cuaca/pb42.test.mjs | TIDAK KONSISTEN: layar/CAP Severe=Siaga, Extreme=Awas; email Moderate=2, Severe/Extreme=3
CUACA | EWS | siklon JTWC/GDACS dan TCWC BMKG dipisah | scripts/cuaca/siklon.py; siklon_bmkg.py | TAYANG | TIDAK PERLU | kerucut ketidakpastian null
CUACA | EWS | gelombang resmi BMKG Maritim, hanya kelas Tinggi ke atas | scripts/cuaca/maritim.py; verifikasi.py | TAYANG | BELUM DIUJI | arsip maritim append-only
CUACA | EWS | penanda amatan METAR (embusan >=54, TS) dan petir LD | scripts/cuaca/metar.py; petir.py | TAYANG (lapisan) | TIDAK PERLU | cakupan petir sekitar 1/6 hari
CUACA | PREDIKSI | peluang ansambel IFS 51 anggota per kab/prov 8 hari | scripts/cuaca/peluang_cuaca.py:36 | TAYANG | BELUM DIUJI | p10/p90 sengaja kosong; tidak ada p150
CUACA | PREDIKSI | arsip prakiraan resmi BMKG (kab10, adm4, sepekan, factsheet) dibanding model | scripts/cuaca/bmkg_kab10.py; bmkg_prakiraan.py; sepekan.py; factsheet.py; public/cuaca/resmi.js | TAYANG | BELUM DIUJI | "tanpa menyebut mana yang benar"
CUACA | PEMODELAN | uji balik lead 1-3 hari (Previous Runs) vs DIBI | scripts/cuaca/verifikasi.py:35,83 | TAYANG (buktiKita, cuaca.js:54) | GAGAL: lead1 POD 6,5%, FAR 59%, CSI 6,0% (n 1.577); lead3 POD 5,1% | tanpa pembanding naif di berkas ini
CUACA | PEMODELAN | verifikasi peringatan BMKG vs DIBI | scripts/cuaca/verifikasi.py | TAYANG (buktiBmkg) | BELUM DIUJI: n=0, dinilai_sampai 2026-09-28 | arsip mulai 12 Okt
CUACA | PEMODELAN | uji terhadap logbook Pusdalops (AUC + kontingensi pada jumlah alarm sama) | scripts/cuaca/uji_logbook.py:60,83 | TAYANG (kartu "uji", tambahan.js:130) | GAGAL: AUC hujan 0,603 vs klimatologi kab-bulan 0,865, selisih CI [-0,336; -0,12] | dibekukan, cache ERA5 lokal
CUACA | PEMODELAN | MOS ambang per stasiun vs SYNOP + bootstrap | scripts/cuaca/synop.py:251,286 | TERSEMBUNYI (Metode) | GAGAL: CSI MOS 0,113 vs mentah 0,073 vs naif 0,073, CI [-0,009; 0,087] | koreksi bias suhu per jam juga ada
CUACA | PEMODELAN | GEV L-momen + uji balik tingkat ulang 10 tahun | scripts/cuaca/iklim_stasiun.py:72,124 | TAYANG di Tren karhutla (karhutla_data.js:81), tidak di /cuaca | GAGAL: frekuensi 0,089 vs harapan 0,10 vs empiris 0,098 | selang binomial terlalu sempit karena stasiun berkorelasi
CUACA | PEMODELAN | prospektif append-only (hujan, embusan, hitungan kec) | scripts/cuaca/prospektif_cuaca.py:22,49 | TERSEMBUNYI (berkas bulanan) | BELUM DIUJI: kita.prospektif n=0 | ambang embusan baru bisa diuji sesudah 6-12 bulan arsip
CUACA | PEMODELAN | arsip append-only satelit IMERG | scripts/cuaca/imerg.py | TERSEMBUNYI | BELUM DIUJI | bahan verifikasi nanti
CUACA | PEMODELAN | gerbang tampil hipotesis + kalimat bukti + uji logbook | public/cuaca/cuaca.js:54-59 | TAYANG | TIDAK PERLU | menambah "belum lolos uji logbook"
CUACA | PEMODELAN | laju dasar klimatologi kab x bulan (langganan) | scripts/cuaca/langganan.py:20 | TAYANG (Insight + overlay) | AUC 0,865 dalam sampel untuk laju ini | mencerminkan kebiasaan lapor juga
CUACA | PEMODELAN | kalender musim + ENSO dari DIBI | scripts/cuaca/musim.py | TAYANG (Tren) | TIDAK PERLU | hanya 1 tahun penuh (2025)
CUACA | PEMODELAN | klimatologi siklon IBTrACS | scripts/cuaca/ibtracs.py:124 | TERSEMBUNYI (tidak ada pembaca di public) | TIDAK PERLU | statis.yml bulanan
CUACA | PEMODELAN | uji alur ujung ke ujung dengan fixture | scripts/cuaca/uji_alur.py | TIDAK PERLU tampil | LULUS (audit 15 Nov) | memeriksa skema dan ukuran
CUACA | SIMULASI | medan angin Holland + skenario siklon 72 jam | public/cuaca/sim_data.js:126-142; sim_skenario.js; scripts/cuaca/medan.py | TAYANG (/cuaca/simulasi.html) | BELUM DIUJI terhadap amatan | Holland B tetap 1,5
CUACA | SIMULASI | gelombang badai (barometer terbalik + pembendungan), Atkinson-Holliday, Pierson-Moskowitz | public/cuaca/sim_dampak.js:4,65-67; sim_data.js:145 | TAYANG | LULUS tests/cuaca/sim_dampak.test.mjs (fungsi) | batas atas, bukan prakiraan
CUACA | SIMULASI | genangan pita ansambel di atas DEM, batas operasi kapal, peringkat tindakan | public/cuaca/sim_model.js | TAYANG | BELUM DIUJI | DEM Terrarium z6
CUACA | DAMPAK | paparan penduduk sel hujan >=50 mm, zona kec tingkat 2+ (sekolah/faskes), pesisir Hs>=2,5 | scripts/cuaca/dampak_cuaca.py:32,61 | TAYANG | TIDAK PERLU | prakiraan, bukan jiwa terdampak
CUACA | DAMPAK | sektor pelabuhan/bandara terancam | scripts/cuaca/sarana.py; dampak_cuaca.py | TAYANG | TIDAK PERLU | dibangun tangan
CUACA | DAMPAK | risiko IRBI InaRISK | scripts/cuaca/risiko_bnpb.py:134 | TAYANG (dampak.js:67) | TIDAK PERLU | skala 2025 tidak sebanding
CUACA | DAMPAK | infrastruktur PU di zona gerakan tanah + jaringan peringatan BNPB | scripts/cuaca/gerakan_tanah_pu.py:84; public/cuaca/rawan.js | TAYANG | TIDAK PERLU | prakiraan Badan Geologi bulanan
CUACA | DAMPAK | rupiah dalam simulasi | public/cuaca/sim_model.js:9 | TAYANG di simulasi saja | BELUM DIUJI | tab Dampak sengaja tanpa rupiah (dampak.js:6-7)
CUACA | DAMPAK | posko dari tingkat prakiraan | scripts/cuaca/posko.py:21 | TERSEMBUNYI | TIDAK PERLU | isi kosong hari ini

== LAPIS BERSAMA /prediksi ==
BERSAMA | PREDIKSI | pembekuan prakiraan harian per kab +1..+3, append-only, menolak arsip menyusut | scripts/prediksi/catat.py:486; dasar.py:9-14 | TAYANG | LULUS tests/prediksi/prediksi.test.mjs (18) | kode HJN API BNJ LSR ASP ROB GEL CEX; TANPA kode kekeringan
BERSAMA | PEMODELAN | skor prospektif vs persistensi + klimatologi, n<30 = belum teruji, diagram keandalan | scripts/prediksi/nilai.py:240,381 | TAYANG (Rapor) | HJN mengalahkan baseline (BSS klim 0,262, n 9.252); CEX dan GEL "menunggu" (tidak ada amatan per kab) | cuaca.md G06 menulis CEX "dinilai"; skor.json membantahnya
BERSAMA | PEMODELAN | uji balik retrospektif n hari | scripts/prediksi/nilai.py (ujibalik) | TAYANG (prediksi.js:352) | PERLU CEK | terpisah dari prospektif
BERSAMA | PEMODELAN | kalibrasi berpenjaga isotonik PAV, 14 hari uji tahan, gagal-tertutup | scripts/prediksi/kalibrasi.py:23,98 | TAYANG (mekanisme) | BELUM DIUJI: semua grup "menunggu" | rasio bias jumlah hujan per provinsi 0,5..2
BERSAMA | PEMODELAN | koreksi diri bulanan, ganti hanya bila p95 bootstrap blok selisih Brier <0 | scripts/prediksi/koreksi.py:49,72; data/koreksi_riwayat.jsonl | TAYANG (mekanisme), hanya BNJ | BELUM DIUJI: menunggu, kalibrasi_aktif versi 0 | tiap keputusan dicatat append-only
BERSAMA | PEMODELAN | model bayangan (BNJ_B, LSR_B, CEX_B, KRH_B) dinilai berdampingan | scripts/prediksi/bayangan/model.py; nilai.py:330; public/prediksi/prediksi.js:334 | TAYANG di Rapor, TIDAK di Besok | BELUM DIUJI: semua "menunggu" | selisih sumber latih dan operasi ditulis (CHIRPS vs Open-Meteo)
BERSAMA | PEMODELAN | ekspor tabel lab ke JSON + fixture kesetaraan | scripts/prediksi/bayangan/ekspor/ekspor_*.py; tests/prediksi/fixture/*.json | TIDAK PERLU tampil | PERLU CEK | lab dengan numpy, operasi stdlib
BERSAMA | PEMODELAN | bulan rawan dengan aturan pra-registrasi L1-L4, tanpa bocor | scripts/prediksi/musim_rawan.py:98,109 | TAYANG (lewat Tangga, berlabel hipotesis bila gagal) | cuaca LULUS (BSS klim 0,05, menang 7/7 tahun); kekeringan GAGAL (BSS -0,007, L1 dan L3 gagal) | lulus hanya berarti pola berulang
BERSAMA | PEMODELAN | kalender risiko logbook (referensi kedua) | scripts/prediksi/kalender.py:17 | TAYANG (/prediksi, Tren cuaca, longsor) | TIDAK PERLU | jenis tanpa kekeringan
BERSAMA | PEMODELAN | konfirmasi lapangan (regu = label, warga = positif lemah, groundcheck = audit) | scripts/prediksi/konfirmasi.py:59; tab konfirmasi | TAYANG | LULUS tests/warga/prediksi_konfirmasi.test.mjs (PERLU CEK); data konfirmasi kosong | hanya 0 ke 1, positif menang
BERSAMA | EWS | Tangga Peringatan multi-skala (musim sampai jam), resmi vs kita, sinyal menguat/belum selaras, tidak pernah "aman" | scripts/prediksi/tangga.py:581; public/prediksi/tangga_inti.js | TAYANG | LULUS tests/prediksi/tangga.test.mjs (8) | kekeringan: BMKG + HTH kita + peluang_bayangan; cuaca: nowcast, h10; peringkat hanya dari BMKG
BERSAMA | DAMPAK | jiwa terpapar, mengungsi (laju DIBI), kebutuhan Sphere | scripts/prediksi/terbit.py:170 | TAYANG | TIDAK PERLU | hanya banjir dan longsor; cuaca dan kekeringan tidak ada
BERSAMA | DAMPAK | paparan statis (gempa, genangan, desa terisolir) | scripts/prediksi/dampak.py:69 | TAYANG (Paparan dampak) | TIDAK PERLU | bukan prakiraan
BERSAMA | DAMPAK | ruas rawan putus jalan (jembatan graf Tarjan) | scripts/prediksi/jalan.py:51 | TAYANG (prediksi.js:408-433) | LULUS self-check (PERLU CEK) | batas atas karena kotak memotong jaringan
BERSAMA | PEMODELAN | gerbang tampil: peluang dibulatkan 5%, pil vonis | public/prediksi/prediksi.js:10,27-31 | TAYANG | TIDAK PERLU | "terkalibrasi" hanya bila dipakai

== LAPIS BERSAMA EWS ==
BERSAMA | EWS | alarm idempoten dengan kunci jenis:kode:jendela | src/peringatan.js:1-13,38 | TAYANG | LULUS tests/warga/peringatan.test.mjs (3) | gempa, tsunami, cuaca, karhutla, banjir; jenis baru ke peringatan_x
BERSAMA | EWS | registri penilai jenis baru, sumber resmi dikunci, hipotesis dibuang | src/ews.js:228,304-310 | DRAF-TIDAK-TERPASANG sebagian (butuh migrasi 0137; status produksi PERLU CEK) | LULUS ews.test.mjs:695,730,735 | pesisir, udara, gunungapi keluar; longsor dan kekeringan dibuang
BERSAMA | EWS | tangga tindakan per tingkat untuk warga | public/ews_tindakan.js:10-14,20-150 | TAYANG | LULUS tests/layar/ews_tindakan.test.mjs (PERLU CEK) | cuaca bersumber Buku Saku BNPB 2012 (PB-42); kekeringan dan pesisir tidak ada
BERSAMA | EWS | email langganan GPS, double opt-in, HMAC, jeda 6 jam | src/ews.js:1-10,148-220 | TAYANG (mati bila domain belum diverifikasi) | LULUS tests/warga/ews.test.mjs (Miniflare) | jenis: karhutla, banjir, longsor, cuaca, rob, gempa, tsunami
BERSAMA | EWS | CAP 1.2 + GeoJSON, senderName membedakan resmi dan deteksi | src/peringatan.js:189-230 | TAYANG | PERLU CEK | note CAP masih menyebut 5 jenis lama
BERSAMA | EWS | pop-up alarm, jajak 60 dtk, bunyi hanya alarm baru, pil per jenis | public/inti/alarm.js:13-20 | TAYANG | LULUS tests/warga/alarm.test.mjs, tests/layar/pb_alarm_pil.test.mjs | hanya banjir yang berbunyi; ada tombol bagikan wa.me
BERSAMA | EWS | web push warga dari /prediksi (BNJ, LSR, ASP, CEX) | src/pw_peringatan.js; src/pw_inti.js:10 | TAYANG bila VAPID warga diset (PERLU CEK) | LULUS tests/lapor/peringatan.test.mjs (7) | CEX = model kita yang belum teruji
BERSAMA | EWS | web push instansi VAPID/aes128gcm tanpa pustaka, status banjir naik | src/push.js:1-8,151 | TAYANG bila kunci ada | LULUS tests/warga/push.test.mjs | karhutla, banjir, tugas bencana
BERSAMA | EWS | sensor HMAC kunci turunan, ambang -> pengingat internal, bukan alarm publik | src/sensor.js:1-9; sensor/ambang.json; sensor/gateway/* | TAYANG (internal) | LULUS tests/sensor/* (6 berkas), jeda_sensor, logbook_sensor (PERLU CEK) | ambang hujan mm10 5/10/20, mm60 10/20/40; tidak ada sensor kekeringan
BERSAMA | EWS | konsep panel EWS (pos SIHKA, MAGMA) | public/inti/konsep_alat.js | DRAF (konsep) | BELUM DIUJI | src/alat.js dan public/inti/pantau_alat.* TIDAK ADA di repo

== CAKUPAN EWS ==
Kanal (berkas bukti): layar alarm (src/peringatan.js, ews.js:304, inti/alarm.js), tangga tindakan (ews_tindakan.js), email (ews.js nilaiTitik + gempa), web push (pw_inti.js:10 warga, push.js instansi), CAP (peringatan.js:189), WA (hanya tombol wa.me di alarm.js:42,181; tidak ada siaran otomatis, src/wa.js hanya kotak masuk).

| Bahaya | Layar alarm | Tangga tindakan | Email | Web push | CAP | WA |
| karhutla | ada (tugas api lv3) | ada | ada (FWI, FIRMS, Himawari, simulasi) | ada (instansi); warga sebagian (ASP asap) | ada (Fire) | sebagian (bagikan manual) |
| banjir | ada (kejadian lv2/3, berbunyi) | ada | ada | ada (BNJ warga + instansi) | ada | sebagian |
| rob | belum (ada di JENIS_PERINGATAN_X, penilai tidak ada) | ada | ada (ews.js:216) | belum | belum | belum |
| longsor | belum (hipotesis dibuang) | ada | ada | ada (LSR) | belum | belum |
| pesisir (gelombang) | sebagian (penilaiPesisir BMKG, migrasi 0137) | belum | belum | belum | sebagian | sebagian |
| cuaca | ada (nowcast Severe/Extreme) | ada | ada (poligon nowcast) | ada (CEX, model kita) | ada (Met) | sebagian |
| udara | sebagian (penilaiUdara, 0137) | ada | belum (tindakan ada, tidak dinilai) | ada (ASP) | sebagian | sebagian |
| gempa | ada | ada | ada (radius terasa) | belum | ada | sebagian |
| tsunami | ada (Awas, InaTEWS) | ada | ada | belum | ada | sebagian |
| gunungapi | sebagian (penilaiGunungapi, 0137) | ada | belum | belum | sebagian | sebagian |
| kekeringan | belum (penilai ada, hipotesis dibuang) | belum | belum | belum | belum (kategori Met/Possible sudah disiapkan) | belum |

Celah yang terbukti dari kode:
1. Ambang angin dan gelombang tidak sama antara modul. Angin: /prediksi CEX memakai 46/63/89 km/jam (catat.py), cuaca dasar.py 54/72/90. Gelombang: GEL memakai 1,25/2,5/4 m, dasar.py 2,5/4/6 m.
2. Pemetaan severity cuaca beda: layar dan CAP memakai Severe=Siaga; email memakai Severe=Awas dan Moderate=Siaga.
3. Kekeringan tidak punya kanal EWS yang mengirim keluar, dan tidak ada kode kekeringan di /prediksi.

== TEKNIK UNIK ==
1. Uji kualitas label multi-sumber (label.py, ujilabel.py). Isinya: bulan tanpa cakupan sumber tidak dihitung negatif, persistensi tanpa bocor memakai pertama_dicatat, irisan sumber diukur, ada baris tanpa pelapor berulang. Bisa dipindah ke banjir, longsor, dan cuaca yang juga memakai logbook/DIBI yang terisi susulan dan bias pelapor.
2. Persistensi tercatat dan klimatologi kab x bulan sebagai pembanding wajib. Di kekeringan dan cuaca keduanya mengalahkan indeks fisik (CSI 0,191; AUC 0,865). Setiap bahaya berbasis laporan sebaiknya diuji terhadap keduanya sebelum mengklaim kemampuan.
3. Pembanding produk luar dengan kappa dan uji ensemble "apakah menaikkan skill" (gdo.py). Bisa dipindah ke banjir (GloFAS), udara (CAMS vs stasiun), dan karhutla (GWIS).
4. Penyetelan pra-registrasi dengan koreksi Bonferroni lintas rancangan dan kriteria layak yang tidak dilonggarkan (ambang2.py). Berguna untuk ambang hipotesis cuaca (embusan, ansambel) dan longsor.
5. Hindcast tahun nyata untuk kalibrasi satu pengali dampak, dengan LOO (simulasi.js:316). Bisa dipindah ke simulasi cuaca/siklon (IBTrACS + DIBI) dan banjir.
6. Peringkat perlakuan biaya vs manfaat dalam simulasi (sim_tanggap.js, sim_model.js). Bisa dipindah ke banjir (pompa, tanggul darurat) dan karhutla.
7. MOS ambang per stasiun dengan vonis bootstrap (synop.py), dan GEV L-momen dengan uji balik tingkat ulang (iklim_stasiun.py). Bisa dipakai untuk koreksi bias hujan HJN /prediksi dan untuk ambang persentil banjir per wilayah.
8. Kalibrasi berpenjaga dan koreksi diri gagal-tertutup dengan jejak keputusan append-only (kalibrasi.py, koreksi.py). Saat ini hanya HJN/API/LSR/BNJ; bisa diperluas ke CEX dan GEL begitu ada amatan, dan ke prakiraan musiman kekeringan.
9. Tangga multi-skala resmi vs kita dengan sinyal "menguat/belum selaras" dan larangan kata "aman" (tangga.py). Bisa dipakai di gunungapi (level PVMBG vs deteksi) dan udara.
10. Neraca air berrouting dengan uji konservasi massa dan validasi berambang terhadap BPS dan GloFAS (air/neraca). Bisa dipakai banjir (fitur anomali simpanan sudah dipakai) dan menjadi dasar dampak pasokan air kekeringan di luar Jawa.
11. Penilai EWS yang menahan keluaran berstatus hipotesis (ews.js:304-310). Bisa dipakai di semua bahaya: deteksi baru boleh keluar hanya setelah lolos uji balik.

Batas laporan: semua vonis dibaca dari JSON yang dikomit, bukan dari menjalankan uji. Status produksi migrasi 0137 dan VAPID warga PERLU CEK.