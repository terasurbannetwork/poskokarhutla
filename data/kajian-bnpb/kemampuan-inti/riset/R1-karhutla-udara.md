INVENTARIS TEKNIK KARHUTLA DAN UDARA (diverifikasi di berkas, HEAD lokal 24 Nov 2026, hanya baca)

Catatan cara baca:
- State: TAYANG = tab atau lapisan publik ada dan memakainya. TERSEMBUNYI = dihitung tetapi tab sembunyi, hanya untuk login, atau gerbang menutupnya. DRAF-TIDAK-TERPASANG = lab atau skrip saja, tidak masuk layar atau produksi.
- Tab karhutla yang tersembunyi menurut public/bencana.json: ringkasan, posko, informasi, kompleks, satelit, tentang, foto. Tab udara yang tersembunyi: informasi.
- "PERLU CEK" = belum saya pastikan di berkas.

=== KARHUTLA ===
KARHUTLA | PREDIKSI | model peluang eskalasi titik api baru (GBDT, >=10 sel/72 jam) | scripts/sebaran/lolos.py; public/data/model_sebaran.json (lolos) | TAYANG (berlabel eksperimental, gerbang tertutup) | LULUS historis: AUC uji 2024-26 0,9076, recall 0,678, presisi 0,209; per lahan: gambut AUC 0,867, mineral 0,905, sabana 0,905 | metrik ini tanpa pembanding sederhana; pembandingnya ada di baris BSS historis di bawah
KARHUTLA | PREDIKSI | ramal ulang sesudah lintasan satelit kedua (<=14 jam) | model_sebaran.json lolos_ulang (Platt, ambang 0,0971); prospektif.py mode "ulang" | TAYANG eksperimental | BELUM DIUJI prospektif (0 dinilai) | fitur sesudah deteksi pertama ditambahkan
KARHUTLA | PREDIKSI | peta peluang sel terbakar 24/48/72 jam (GBDT sel 375 m + Monte Carlo) | scripts/sebaran/latih.py, latih_jalan.py, fitur.py; public/sebaran_model.js; public/sim_data.js:75 | TAYANG eksperimental (opsi "Model data" di Simulasi) | GAGAL: IoU 24 jam 0,584 vs persistensi 0,673 (selisih -0,088, CI [-0,130;-0,049]); 48/72 jam juga kalah | gerbang_model.json model_sel boleh_tampil=false
KARHUTLA | PREDIKSI | luas 72 jam dari model sel | gerbang_model.json model_sel.rincian.galat_luas | TAYANG eksperimental | LULUS: galat log 0,841 vs persistensi 1,009 (selisih 0,167, CI [0,107;0,229]) | satu-satunya keluaran model sel yang menang
KARHUTLA | PREDIKSI | jejak api operasional per kompleks (+24/48/72 jam, MC) | scripts/sebaran/jejak.py; public/data/jejak_api.json | TERSEMBUNYI (gerbang menutup EWS) | GAGAL (bukti tidak langsung): IoU 72 jam 0,549 vs persistensi 0,608 | belum ada uji balik khusus jejak
KARHUTLA | PREDIKSI | peluang api 7 hari per sel 0,05° (GBDT, pra-registrasi d8ae2180) | scripts/sebaran/risiko_mingguan.py; public/data/risiko_mingguan_uji.json | DRAF (uji saja) | LULUS: BSS 0,126 [0,111;0,141] vs logistik; AUC 0,915 vs logistik 0,759, klimatologi 0,748, persistensi 0,654; 4 syarat lolos | tidak ditulis ke produksi
KARHUTLA | PREDIKSI | model produksi P1 risiko 7 hari (artefak dikunci sha256) | scripts/sebaran/risiko_produksi.py:107,348,599; public/risiko7.js | TERSEMBUNYI (hanya akun login) | BELUM DIUJI prospektif (vonis null sampai >=6 minggu dan >=2.000 sel) | publik baru sesudah lolos prospektif
KARHUTLA | PREDIKSI | peluang titik panas per kab +1..+3 hari (skor mentah dari hari bertitik + P(FWI)) | scripts/prediksi/catat.py (kode API); public/prediksi/data/skor.json | TAYANG (/prediksi) | LULUS: BSS 0,333 vs persistensi, 0,255 vs klimatologi (n=3.084, baru 6 hari); POD 0,558, FAR 0,353 | n hari masih kecil
KARHUTLA | PREDIKSI | model bayangan karhutla KRH_B (logit ramping) | scripts/prediksi/bayangan/krh.json, model.py, ekspor/ekspor_krh.py | TERSEMBUNYI (bayangan) | BELUM DIUJI ("belum ada prakiraan yang matang") | sumber hujan berbeda dari data latih
KARHUTLA | PREDIKSI | ansambel FWI 7 hari (ECMWF 51 anggota, P(FWI>=7/14), P10/P90) | scripts/data/ansambel.py; peluang_karhutla.py; public/data/fwi_ansambel.json, peluang.json | TAYANG | BELUM DIUJI | peluang wilayah = rerata peluang sel
KARHUTLA | PREDIKSI | indeks cuaca kebakaran FWI Kanada (khatulistiwa) | scripts/data/fwi.py; public/data/fwi.json; FFMC per jam di public/index.html:6717 | TAYANG | TIDAK PERLU (indeks baku) | dipakai juga untuk status dan EWS
KARHUTLA | PREDIKSI | ambang FWI persentil lokal per provinsi | scripts/data/persentil_fwi.py; aturan.py:61 | DRAF (info pembanding, belum dipakai status()) | BELUM DIUJI | pola bcgov/wps
KARHUTLA | PREDIKSI | indeks bahaya api gambut PFVI (KBDI + muka air) | scripts/data/pfvi.py; scripts/sebaran/pfvi_balik.py; public/index.html:1579 | TAYANG kondisional (lapisan "model eksperimental", muncul hanya bila data ada) | GAGAL: tidak menambah informasi; AUC +0,007 (CI -0,008..+0,019) di peta baru | RISET-PFVI.md:48,155
KARHUTLA | PREDIKSI | persentil kelembapan tanah per dasarian | scripts/data/tanah.py; public/data/tanah.json | TAYANG (dirujuk index.html) | BELUM DIUJI | memadukan ERA5-Land dan IFS
KARHUTLA | PREDIKSI | durasi episode dan musim per lokasi dengan pooling bertingkat | scripts/data/riwayat_sel.py; public/riwayat_sel.js; public/data/riwayat_sel_uji.json | TAYANG (laci cluster) | LULUS: lama 3 hari MAE 4,91 vs nasional 4,97 (CI [-0,07;-0,04]); musim MAE 22,8 vs 29,2 | analog El Nino lebih buruk (MAE 5,8 vs 5,1), jadi tidak dipakai
KARHUTLA | PREDIKSI | kalender bahaya dasarian, El Nino vs biasa | scripts/data/musim.py; public/data/musim.json | TAYANG | TIDAK PERLU (klimatologi) | MODIS 2002-2025
KARHUTLA | PREDIKSI | awal, puncak, akhir musim dan tren (Theil-Sen + Mann-Kendall) | scripts/sebaran/musim_awal.py; public/data/musim_awal.json, tren_karhutla.json | TAYANG (Insight sebMusim) | TIDAK PERLU (deskriptif) | definisi onset dari pemilik
KARHUTLA | PREDIKSI | prakiraan hujan musiman dari ENSO/IOD (regresi, LOO) | public/data/iklim_outlook.json | PERLU CEK state | LULUS sebagian: skill LOO median 0,389; 106/120 positif vs rerata tahun lain | Kalbar DJF -0,52
KARHUTLA | PREDIKSI | uji tambahan fitur bahan bakar dari tinggi kanopi | scripts/sebaran/bahan_bakar.py; public/data/bahan_bakar_uji.json | DRAF | GAGAL: d_AUC uji -0,001 | produksi tidak diganti
KARHUTLA | PREDIKSI | uji tambahan fitur perubahan tutupan lahan | scripts/sebaran/lab_tutupan.py; RISET-SEBARAN.md:395 | DRAF | GAGAL kriteria 2 | didaftarkan sebelum uji
KARHUTLA | PREDIKSI | alert deforestasi sebagai prediktor api 90 hari | scripts/data/alert_tebang_model.py; public/data/alert_tebang.json model | DRAF (blok model) | GAGAL: AUC 0,702 vs dasar 0,685, selisih CI [-0,058;0,085] | bootstrap blok per kotak
KARHUTLA | PREDIKSI | deteksi dini api Himawari-9 (10 menit) | scripts/data/himawari.py; src/himawari.js | TAYANG (peta dan EWS) | BELUM DIUJI | reliability >=3 saja
KARHUTLA | SIMULASI | mesin sebaran fisika FBP + elips Van Wagner + Dijkstra jam-tiba | public/index.html:6731 (tabelLaju), :6753 (sebar), :6697 (BAHAN) | TAYANG (tab Simulasi) | BELUM DIUJI versi layar (yang dikalibrasi); port tanpa kalibrasi GAGAL: galat log luas 3,50 vs persistensi 1,01 | gerbang mesin_fisika boleh_tampil=false
KARHUTLA | SIMULASI | port Python mesin fisika sebagai pembanding | scripts/sebaran/simfisika.py | DRAF | GAGAL (lihat baris atas) | memperbaiki bug efek BUI
KARHUTLA | SIMULASI | kalibrasi laju ke pertumbuhan teramati 7 hari | public/index.html:6972-6995 | TAYANG (kotak centang) | BELUM DIUJI | pengali m pada laju
KARHUTLA | SIMULASI | skenario what-if: kemarau ekstrem, angin kencang, hujan, serangan awal, sekat | public/index.html:6706 (SKEN) | TAYANG | TIDAK PERLU (skenario) | garis kendali dalam m/jam
KARHUTLA | SIMULASI | peringkat perlakuan menurut luas terselamatkan 72 jam | public/sim_perlakuan.js | TAYANG | BELUM DIUJI | calon dari posko, Daops, MPA, heli, sekat, OMC
KARHUTLA | SIMULASI | armada drone, sumber daya, forensik 3D | public/sim_3d.js, sim_armada.js, sim_adegan.js, sim_panel.js | TAYANG | TIDAK PERLU (visual) | asumsi dikumpulkan di objek A
KARHUTLA | SIMULASI | keputusan ekonomi Monte Carlo (sebaran segitiga, bilangan acak bersama) | public/index.html:3564 (Kp); scripts/data/keputusan.py; public/data/keputusan.json | PERLU CEK (kemungkinan di tab Posko yang tersembunyi) | BELUM DIUJI | aturan setujui bila P(manfaat>0)>=70%
KARHUTLA | SIMULASI | evaluasi efek intervensi OMC (TWFE + permutasi + MDE, pra-registrasi sha256) | scripts/omc/efek.py; data/laporan-bnpb/omc/riset/PRAREG-EFEK-OMC.md, HASIL-EFEK-OMC.md | DRAF (riset) | BELUM TERDETEKSI: -24% (CI95 -121..+73), p=0,54, MDE 106% | data tidak informatif
KARHUTLA | EWS | status taktis 4 tingkat (keparahan satelit x kelas FWI; cuaca hanya boleh menaikkan) | scripts/data/aturan.py:17,75,86; registry tingkat | TAYANG | BELUM DIUJI langsung; ujibalik_firespot hanya mengukur jeda tingkat | Prioritas = front >=15 px dan FWI>=7
KARHUTLA | EWS | email warga per titik GPS: FWI 3 hari, radius titik panas 5/15 km, Himawari | src/ews.js:34-36,153-172 | TAYANG (email hanya aktif bila domain pengirim terverifikasi) | TIDAK PERLU | jeda 6 jam per pelanggan
KARHUTLA | EWS | peringatan dari simulasi sebaran, gagal-tertutup | src/ews.js:38-42,99-100,175-195 | TERSEMBUNYI (boleh_tampil=false) | GAGAL (jejak_api) | ambang konservatif 2 km/p0,5 dan 5 km/p0,2
KARHUTLA | EWS | alarm Himawari ke Posko pusat (siaga ±2 km, terkunci oleh tugas VIIRS) | src/alarm_himawari.js:1 | TAYANG (internal) | BELUM DIUJI | hilang sesudah 6 jam tanpa pindaian
KARHUTLA | EWS | umpan peringatan dari tugas api level 3 + CAP 1.2 | src/peringatan.js:124-138,189-196 | TAYANG | TIDAK PERLU | kategori CAP "Fire", kepastian "Likely"; id tugas di-hash
KARHUTLA | EWS | Web Push ringkasan tiap 3 jam untuk akun instansi | src/push.js:1 | TAYANG (tanpa kunci VAPID fitur mati) | TIDAK PERLU | VAPID tanpa pustaka
KARHUTLA | EWS | tangga tindakan warga per tingkat | public/ews_tindakan.js:20 | TAYANG | TIDAK PERLU | disarikan dari BNPB dan Manggala Agni
KARHUTLA | EWS | aturan jika-maka "Waspada karhutla" (P(FWI>=14)>=0,6 dan hujan 3 hari <3 mm) | scripts/prediksi/aturan.json:33-40 | TAYANG (/prediksi) | BELUM DIUJI ("belum diuji balik") | syarat gambut belum dipasang
KARHUTLA | EWS | tangga resmi vs kita (label lembaga tidak diubah) | scripts/prediksi/tangga.py | TAYANG (/prediksi) | TIDAK PERLU | pemisahan resmi dan buatan kita
KARHUTLA | EWS | saran status darurat (bukan penetapan) | public/data/saran_status.json | PERLU CEK state | TIDAK PERLU | naik ke Tanggap Darurat bila DIBI mencatat
KARHUTLA | EWS | daerah senyap: sinyal kuat tanpa laporan | scripts/data/senyap.py; belum_lapor.py | PERLU CEK (untuk Pusdalops) | dasar: ~85% kab-minggu >=30 titik tanpa logbook | daftar "layak ditanyakan", bukan vonis
KARHUTLA | EWS | ambang masuk/keluar prioritas provinsi (histeresis 60/30 selama 3 hari) | scripts/data/uji_ambang_prioritas.py; public/prioritas.js | TAYANG | PERLU CEK angka | dinilai tiap Senin Jul-Nov
KARHUTLA | EWS | kalender ancaman dan pengingat bulan rawan | scripts/prediksi/musim_rawan.py, kalender.py; public/data/kalender_ancaman/ | TAYANG | BELUM DIUJI (aturan puncak ditetapkan sebelum uji balik) | dari DIBI dan logbook
KARHUTLA | PEMODELAN | belah waktu latih 2015-22 / validasi 2023 / uji 2024-26 dibuka sekali | scripts/sebaran/latih.py; latih_jalan.py | DRAF (disiplin) | TIDAK PERLU | uji tidak disentuh galat.py
KARHUTLA | PEMODELAN | pustaka hindcast 123 kasus tanpa bocoran (model lipat) | scripts/sebaran/kasus.py; public/data/sebaran_kasus.json | TAYANG (Insight sebUji) | dipakai gerbang | cuaca reanalisis = prakiraan sempurna, optimistis
KARHUTLA | PEMODELAN | gerbang tampil gagal-tertutup (harus mengalahkan persistensi dan batas bawah CI >0) | scripts/sebaran/gerbang.py; public/data/gerbang_model.json; sebaran_model.js:301 | TAYANG (dibaca layar dan EWS) | 4 keluaran, semua boleh_tampil=false | berkas hilang = sembunyikan
KARHUTLA | PEMODELAN | uji prospektif append-only + pra-registrasi dikunci hash | scripts/sebaran/prospektif.py:19,552-570 (KRITERIA_SHA256); public/data/prospektif.json | TAYANG (Metode) | BELUM DIUJI: belum_cukup_data, 0 dinilai (syarat n>=200, AUC bawah >=0,80, BSS>0) | CI tiap 3 jam
KARHUTLA | PEMODELAN | uji balik historis dengan protokol prospektif (latih <=Y-2, Platt Y-1) | scripts/sebaran/prospektif_historis.py; prospektif_historis.json | TAYANG (dibaca gerbang) | LULUS: BSS 0,364 vs laju dasar, ECE 0,0011, AUC 0,908 | 123 kasus api besar: BSS -0,129 karena populasinya tidak sesuai
KARHUTLA | PEMODELAN | kalibrasi Platt + ambang recall 70% | lolos.py; model_sebaran.json lolos.platt | TAYANG | lihat di atas | ambang 0,0492
KARHUTLA | PEMODELAN | penjaga kalibrasi prospektif: ECE p90 bootstrap <=0,08 dan rasio laju <=2x | prospektif.py:54,59,61,145-156 | TAYANG | BELUM DIUJI | rekalibrasi hanya pada data prospektif
KARHUTLA | PEMODELAN | Platt bertingkat per wilayah (susut provinsi/kab, k dipilih LOYO) | scripts/sebaran/kalibrasi_wilayah.py; kalibrasi_wilayah.json | DRAF | GAGAL: ECE turun di 6/9 provinsi tetapi skill turun di 5 | pendaftaran 8eb3cf7e
KARHUTLA | PEMODELAN | selang konformal CQR untuk P10/P90 luas, per lahan dan status | model_sebaran.json selang (target 0,8, dikalibrasi 2015-2023) | TAYANG (sebaran luas di Simulasi data) | PERLU CEK cakupan uji | q nyaris nol untuk mineral dan sabana
KARHUTLA | PEMODELAN | analisis galat per strata + diagnosis kasus terburuk (lompat/celah/hujan) | scripts/sebaran/galat.py; public/data/sebaran_galat.json | PERLU CEK state | TIDAK PERLU | bias uji -0,024
KARHUTLA | PEMODELAN | analisis pendorong (laju per kelas, logistik Wald, permutasi) | scripts/sebaran/pendorong.py; sebaran_pendorong.json; insight_sebaran.js | TAYANG (sebDorong) | TIDAK PERLU (deskriptif) | gambut rasio 3,6x
KARHUTLA | PEMODELAN | uji paritas Python-JS model sebaran | scripts/sebaran/uji_js.py | DRAF (uji) | PERLU CEK hasil terakhir | juga menguji penolakan masukan di luar jangkauan
KARHUTLA | PEMODELAN | paritas rumus operasi Python-JS lewat node | scripts/data/operasi.py (uji) | uji | PERLU CEK | kebutuhan() harus sama dengan operasi.js
KARHUTLA | PEMODELAN | rumus watak cluster kembar Python dan JS | scripts/data/watak_kluster.py; public/riwayat_sel.js | TAYANG | TIDAK ADA uji silang otomatis (PERLU CEK) | "ubah keduanya bersamaan"
KARHUTLA | PEMODELAN | peralihan sensor terkunci (S-NPP ke NOAA-20) + rasio penyetara | prospektif.py:210; scripts/data/rasio_n20_n.py; risiko_mingguan_uji.json setara | TAYANG | rasio N20/N lokal 0,89 (IQR 0,72-1,07); rasio sel-minggu 1,031 | vonis per sensor tidak dicampur
KARHUTLA | PEMODELAN | kriteria lab dikunci sha256 sebelum hasil | scripts/data/lab_kriteria/{lab_dnbr,lab_luas,lab_padam}.json | DRAF | TIDAK PERLU | tidak ada .sidik untuk karhutla (hanya banjir)
KARHUTLA | PEMODELAN | kualitas label: titik satelit vs logbook BNPB | scripts/data/uji_logbook_karhutla.py; validasi_logbook_karhutla.json | DRAF (laporan) | terdeteksi 94,2% dari 607 kejadian; kelas <5 ha 90,1% | logbook hanya merekam yang dilaporkan
KARHUTLA | PEMODELAN | uji banding aturan hotspot-ke-firespot terhadap citra (Gaveau) | scripts/data/ujibanding_firespot.py; ujibanding_firespot.json | DRAF | R0 presisi 0,773 (Wilson [0,768;0,779]), recall 0,612; putusan "pertahankan R0" (N20+N21: ganti ke R4) | presisi gambut 0,930
KARHUTLA | PEMODELAN | uji balik klasifikasi firespot dan jeda level | scripts/data/ujibalik_firespot.py | DRAF | PERLU CEK (laporan, tanpa vonis) | api besar >=100 px
KARHUTLA | PEMODELAN | saring titik palsu (kawah, industri, lepas pantai) dari arsip type | scripts/data/titik_palsu.py | TAYANG (dipakai harian.py) | TIDAK PERLU | 92 sumber panas tetap
KARHUTLA | PEMODELAN | satu definisi hitung titik (lokasi unik per hari WIB, semua keyakinan) | scripts/data/titik_unik.py | TAYANG | TIDAK PERLU | memakai rujukan Tansey 2008 dan Atwood 2016
KARHUTLA | PEMODELAN | model luas terbakar terintegrasi (LOYO/LOPO vs Gaveau dan GFED5) | scripts/data/lab_luas.py; public/data/lab/luas_ringkas.md | DRAF | GAGAL: 16 kandidat, tidak ada yang lolos K1-K3 | M0 galat log 0,607
KARHUTLA | PEMODELAN | luas dNBR Sentinel-2 vs Gaveau | scripts/data/lab_dnbr.py; lab/dnbr_ringkas.md | DRAF | GAGAL: dNBR LOPO 0,881 vs M0 0,868 | gambut membara tidak terlihat
KARHUTLA | PEMODELAN | uji kewajaran luas berbasis titik vs dNBR (memutus lingkaran SiPongi) | scripts/data/ujiluas_dnbr.py, ujiluas_kab.py | DRAF | rasio dNBR/piksel median 0,587 (n=33); dNBR/a median 2,25 (n=38) | 87 dari 120 sampel dibuang
KARHUTLA | PEMODELAN | aturan "belum padam" (k lintasan bersih) | scripts/data/lab_padam.py; lab/padam_ringkas.md | DRAF | GAGAL: tidak ada aturan yang lolos | A0 batas atas 0,334/0,287
KARHUTLA | PEMODELAN | sampling acak berlapis + penandaan citra (Olofsson) | scripts/data/sampling_luas.py | DRAF | PERLU CEK | pembanding luas resmi
KARHUTLA | PEMODELAN | kalibrasi isotonik berpenjaga + ganti hanya bila Brier holdout turun | scripts/prediksi/kalibrasi.py; kalibrasi.json (API) | TAYANG (/prediksi) | API "menunggu" (fit 0 pasangan) | layar memakai peluang mentah sampai lolos
KARHUTLA | PEMODELAN | skor prioritas sumber daya (tangkap@K vs orakel) | scripts/sebaran/prioritas.py; prioritas_uji.json | DRAF | GAGAL v2: selisih tangkap10 0,080 < 10 poin | S0 aturan lama tetap
KARHUTLA | PEMODELAN | label prospektif dari FIRMS NRT, sensor sama dengan saat dicatat | prospektif.py | TAYANG | lihat di atas | kesehatan "macet" dipantau
KARHUTLA | DAMPAK | paparan asap karhutla: jiwa per kelas ISPU dan tambahan ISPA (RR) | scripts/data/dampak.py:112,264-300; public/data/dampak.json udara | TAYANG (tab Dampak) | BELUM DIUJI (rentang lo/mid/hi) | hanya sel yang terkena asap api
KARHUTLA | DAMPAK | kejadian ISPA, sekolah, penerbangan, dan dampak lintas batas dari berita | dampak.py ispa_berita, sekolah_berita, internasional; scripts/data/penerbangan.py | TAYANG | TIDAK PERLU (batas bawah) | penerbangan memadukan RSS dan METAR
KARHUTLA | DAMPAK | fasilitas dan desa dekat api | dampak.py "dekat" | TAYANG | TIDAK PERLU | jarak ke kompleks level >=2
KARHUTLA | DAMPAK | emisi gambut bawah permukaan E=AxDxBDxCCxEF | scripts/data/gambut_bara.py | TAYANG (kluster dan taktik) | BELUM DIUJI ("belum divalidasi lapangan") | skenario ujung-ke-ujung, bukan selang
KARHUTLA | DAMPAK | emisi, ekonomi, dan kerugian per ha (Bank Dunia, Hein 2022) | dampak.py emisi/ekonomi/kerugian; keputusan.json param | TAYANG | BELUM DIUJI | parameter rendah/tengah/tinggi bersumber
KARHUTLA | DAMPAK | luas dari titik (regresi log-log per provinsi, SiPongi) | scripts/data/keputusan.py; insiden.py:205 faktor_luas | TAYANG | lihat ujiluas (faktor ~18% diduga melingkar) | sigma_log dipakai di Monte Carlo
KARHUTLA | DAMPAK | rencana pencegahan per kecamatan langganan + biaya | scripts/data/preventif.py; public/preventif.js | PERLU CEK state | TIDAK PERLU | biaya satuan bersumber
KARHUTLA | DAMPAK | prioritas pembasahan per KHG | scripts/data/khg_prioritas.py | PERLU CEK state | TIDAK PERLU | poligon BRGM tidak diubah
KARHUTLA | DAMPAK | TMAT stasiun gambut | scripts/data/tmat.py; tmat.json | DRAF | TAK TERUJI (0 stasiun, sumber diblokir Cloudflare) | tidak ditembus
KARHUTLA | DAMPAK | kebutuhan regu, bor, heli per kompleks (beban kerja/target hari) | scripts/data/operasi.py; public/operasi.js | TAYANG (tab Operasi) | BELUM DIUJI; kalibrasi.py dari isian lapangan PERLU CEK | koefisien lo/mid/hi
KARHUTLA | DAMPAK | rekomendasi cara pemadaman per kompleks | scripts/data/taktik.py; kendala.py | PERLU CEK state | TIDAK PERLU | arahan, bukan perintah
KARHUTLA | DAMPAK | lokasi posko cakupan maksimum (greedy) dan pangkalan heli/OMC | scripts/data/posko.py; udara_rekom.py | TERSEMBUNYI (tab posko); udara_rekom dipakai sim_perlakuan | TIDAK PERLU | radius heli 100 km

=== UDARA ===
UDARA | PREDIKSI | PM2,5/PM10 per jam 72 jam per kab/kota dari CAMS | scripts/udara/prakiraan.py; public/udara/data/prakiraan.json | TAYANG | lihat baris METAR | 514 kota, titik berbobot penduduk
UDARA | PREDIKSI | koreksi faktor stasiun disusutkan (f*=(nf+K)/(n+K), 1/d²) | scripts/udara/prakiraan.py (Koreksi) | DRAF (status "belum", n_stasiun 0) | BELUM DIUJI | butuh WAQI_TOKEN
UDARA | PREDIKSI | koreksi MOS ke sensor (b0+b1·CAMS+angin+log hujan) | scripts/udara/openaq_mos.py, pm25_mos.py; openaq_mos.json | TERSEMBUNYI (kartu rapor saja) | GAGAL: MAE 10,75 vs CAMS mentah 14,22, tetapi kalah dari klimatologi stasiun 9,75 (CI [0,05;1,96]) | BMKG menggantikan OpenAQ
UDARA | PREDIKSI | MOS diuji ulang pada arsip OpenAQ multi-tahun | scripts/udara/uji_panen.py; uji_panen_pm25.json | TERSEMBUNYI (rapor) | LULUS: 17,32 vs mentah 24,23 vs klimatologi 19,21; tetapi persistensi 24 jam 15,15 lebih baik (tidak dipakai untuk vonis) | sensor murah dominan
UDARA | PREDIKSI | ensambel CAMS+GEOS-CF bobot 1/MSE terkoreksi bias | scripts/udara/geoscf.py; geoscf.json; uji_panen ensambel | TERSEMBUNYI | GAGAL: 13,87 vs anggota terbaik 14,22 (CI [-0,90;0,09]); arsip: 39,22 vs 22,46 | bobot PM2,5 dipinjam untuk CO tanpa uji
UDARA | PREDIKSI | PM2,5 1 km dari AOD MAIAC (efek provinsi, LOSO) | scripts/udara/pm25_1km.py | DRAF-TIDAK-TERPASANG | BELUM DIUJI (masukan AOD belum terambil) | hambatan HDF4 dan token
UDARA | PREDIKSI | peluang melewati ambang dari 729 varian asumsi (sensitivitas, bukan ansambel atmosfer) | scripts/udara/peluang_udara.py; peluang.json | TAYANG | BELUM DIUJI (galat CAMS tidak masuk) | P10/P50/P90
UDARA | PREDIKSI | anomali CO TROPOMI (robust MAD) + model anomali besok | scripts/udara/tropomi.py; tropomi_seri.json | TAYANG (lapisan dan kartu) | TAK TERUJI: 93 pasangan uji < 100 | vs persistensi RMSE
UDARA | PREDIKSI | PM2,5 +1..+3 hari dinilai di /prediksi (ASP) | scripts/prediksi/catat.py (ASP) | TAYANG | BELUM DIUJI ("CAMS tidak dinilai dengan CAMS") | menunggu stasiun
UDARA | PREDIKSI | kalender musim asap dari titik panas + ENSO | scripts/udara/musim_asap.py | TAYANG (Tren) | TIDAK PERLU | penanda musim, bukan ukuran asap
UDARA | SIMULASI | lintasan maju asap 72 jam (Heun, 3 lapis angin) + deteksi lintas batas | scripts/udara/lintasan.py; lintasan.json | TAYANG | BELUM DIUJI | juga memasok prakiraan asap untuk semai (mode :252)
UDARA | SIMULASI | lintasan mundur asal asap per kota (15 jalur) | scripts/udara/asal.py | TAYANG | BELUM DIUJI | pola emisi.app
UDARA | SIMULASI | atribusi sumber plume Gauss + sigma Briggs (api/PLTU/latar) | scripts/udara/atribusi.py | TAYANG | BELUM DIUJI; ditandai tak terpercaya bila model >1,5x CAMS (kini 0 dari 311) | 15 asumsi bersumber
UDARA | SIMULASI | dispersi partikel Lagrangian di peramban + 6 skenario | public/udara/sim/model.js:350-355 | TAYANG (tab Simulasi) | BELUM DIUJI terhadap pengamatan; 15 uji unit (tests/udara/sim.test.mjs) | seed tetap
UDARA | SIMULASI | kalibrasi skala K ke atribusi CAMS ("bukan validasi") | public/udara/sim/model.js:195-215 | TAYANG | TIDAK PERLU | K dibekukan per skenario
UDARA | SIMULASI | ensembel gangguan + kestabilan peringkat perlakuan | public/udara/sim/ensemble.js | TAYANG | BELUM DIUJI | di Web Worker
UDARA | SIMULASI | peringkat tanggap (ruang udara bersih, N95, beban faskes; orang-hari terhindar per Rp) | public/udara/sim/tanggap.js | TAYANG | BELUM DIUJI | biaya = asumsi
UDARA | SIMULASI | evaluasi sortie OMC (DiD + pita diurnal + plasebo) | scripts/omc/nilai.py; public/udara/data/omc_hasil.json | PERLU CEK state | BELUM DIUJI: 0 episode berdata cukup, laju plasebo null | hanya "kesesuaian"
UDARA | EWS | status kota 4 tingkat dari r24 CAMS (55,4/150,4/250,4) | public/udara/murni.js:5; scripts/udara/alat.py:18 | TAYANG (berpil "model, belum dikoreksi") | lihat METAR | bukan ISPU resmi
UDARA | EWS | entitas kejadian U: gugus kab bersebelahan >55,4, masa aktif 2 hari | scripts/umum/kejadian.py:244 | TAYANG | BELUM DIUJI | laporan per kasus di udara/data/kejadian
UDARA | EWS | penilai peringatan dari stasiun BMKG + sumber resmi yang dikunci | src/ews.js:228,250-264 | DRAF-TIDAK-TERPASANG (migrasi 0137 belum diterapkan di produksi menurut udara.md G09) | TIDAK PERLU | label "Deteksi Centurisk97", bukan BMKG
UDARA | EWS | CAP kategori Health untuk udara | src/peringatan.js:194-196 | ikut status peringatan_x (PERLU CEK) | TIDAK PERLU | certainty Likely
UDARA | EWS | tangga tindakan warga udara | public/ews_tindakan.js:136 | TAYANG | TIDAK PERLU | saran kesehatan resmi sengaja tidak ditulis
UDARA | EWS | aturan "imbauan masker, kurangi kegiatan luar sekolah" (ASP.kat>=1) | scripts/prediksi/aturan.json:42-47 | TAYANG (/prediksi) | BELUM DIUJI | paparan murid dari Dapodik
UDARA | EWS | WA jarak pandang tiap jam (BMKG saja, NOAA cadangan) | scripts/wa/jarak_pandang_jam.mjs | TERSEMBUNYI (mati bawaan, JARAK_PANDANG=1) | TIDAK PERLU | galat hanya dikabarkan ke pemilik
UDARA | PEMODELAN | hindcast analisis CAMS vs METAR HZ/FU (hari-bandara) | prakiraan.py; prakiraan.json galat.metar | TAYANG (kartu Galat model) | TANPA PEMBANDING: hit 0,406, FAR 0,422, CSI 0,313 (n=837, CI bootstrap per bandara) | label proksi, bukan stasiun ukur
UDARA | PEMODELAN | prakiraan h+1 dinilai prospektif dari arsip jalan | prakiraan.json galat.metar_prakiraan | TAYANG | TANPA PEMBANDING: hit 0,368, FAR 0,462, CSI 0,279 | arsip_jalan maks 90 hari
UDARA | PEMODELAN | belah waktu 60/40 + bootstrap per tanggal; lolos hanya bila batas atas selisih <0 | scripts/udara/pm25_mos.py | DRAF (disiplin) | lihat MOS/ensambel | aturan dinyatakan di muka
UDARA | PEMODELAN | uji paritas Python-JS titik potong | alat.py:18 vs murni.js:5 | TAYANG | TIDAK ADA uji silang (tiap sisi diuji sendiri) | udara.md B07
UDARA | PEMODELAN | arsip append-only data lembaga bulanan | scripts/udara/kualitas_bmkg.py | TAYANG | TIDAK PERLU | jujur soal "tertinggal_bulan"
UDARA | DAMPAK | balita/lansia terpapar + tambahan ISPA (RR, CI) + sekolah berisiko | scripts/udara/rentan.py; public/udara/dampak.js | TAYANG | BELUM DIUJI | tanpa rupiah
UDARA | DAMPAK | jarak pandang dari PM2,5 (Koschmieder, f(RH)) untuk bandara | rentan.py | TAYANG | BELUM DIUJI | dijepit 10 km
UDARA | DAMPAK | paparan kecamatan >55,4: penduduk, sekolah, siswa, faskes, RS | scripts/udara/dampak_udara.py; public/data/udara_dampak.json | TAYANG | BELUM DIUJI | hitung() sama dengan banjir
UDARA | DAMPAK | jiwa per kategori ISPU per provinsi/kab + riwayat | scripts/udara/kualitas.py, riwayat.py, laporan_udara.py | TAYANG | TIDAK PERLU | perkiraan model
UDARA | DAMPAK | penghubung konsesi dan PLTU ke asap ("lokasi di areal izin, bukan pembakar") | lintasan.py, asal.py | TAYANG | TIDAK PERLU | WRI GPPD

=== TEKNIK UNIK (kemungkinan tidak ada di bencana lain) ===
1. Gerbang tampil gagal-tertutup per keluaran terhadap persistensi (gerbang.py dan pembacanya di layar dan EWS). Bisa dipindah ke banjir dan longsor: setiap peta atau peringatan model wajib mengalahkan "kemarin = hari ini" dengan CI berpasangan.
2. Persistensi sel sebagai pembanding simulasi ruang (IoU sel dan galat log luas). Cocok untuk genangan banjir, sebaran abu vulkan, dan lahar.
3. Uji prospektif dengan peralihan sensor yang terkunci dan vonis per sensor (S-NPP ke NOAA-20). Cocok untuk modul yang bergantung satelit (GPM/IMERG, Sentinel-1) bila sensornya pensiun.
4. Penjaga kalibrasi prospektif: ECE p90 bootstrap ditambah rasio laju dasar <=2x. Cocok untuk peluang banjir atau longsor saat iklimnya bergeser (El Nino/La Nina).
5. Uji balik historis yang meniru protokol prospektif (latih <=Y-2, kalibrasi Y-1, nilai Y). Cocok untuk semua model tahunan.
6. Cuaca hanya boleh menaikkan status, tidak boleh menurunkan pengamatan (aturan.py). Cocok untuk banjir: data pos air teramati tidak boleh diturunkan oleh prakiraan hujan.
7. Ramal ulang sesudah pengamatan kedua (lolos_ulang 14 jam). Cocok untuk gempa susulan, kenaikan level gunung api, dan banjir sesudah pembacaan pos kedua.
8. Peringkat perlakuan dengan bilangan acak bersama (sim_perlakuan, keputusan Kp, tanggap.js) dan kestabilan urutan lewat ensembel. Cocok untuk memilih intervensi kekeringan (air bersih) dan banjir (pompa, tanggul darurat).
9. Atribusi sumber plus lintasan maju/mundur dengan penghubung penanggung jawab lahan. Cocok untuk abu vulkan, tumpahan minyak di pesisir, dan sumber sedimen banjir bandang.
10. Saring titik palsu dari arsip sumber statis (titik_palsu.py). Cocok untuk deteksi genangan radar (piksel permanen basah) dan deformasi InSAR.
11. Validasi label silang dengan logbook BNPB (laju deteksi per kelas ukuran) dan "daerah senyap" (sinyal kuat tanpa laporan). Cocok untuk banjir dan longsor (sudah ada validasi_logbook_banjir/longsor; senyap baru sebagian).
12. Evaluasi efek intervensi dengan pra-registrasi ber-sha256, TWFE, permutasi, dan MDE (OMC). Cocok untuk menilai sekat kanal dan normalisasi sungai.
13. Kalibrasi skala yang secara tegas "bukan validasi" (model.js K ke atribusi CAMS) dan varian sensitivitas yang dilabeli bukan ansambel (729 varian). Pola kejujuran ini bisa dipindah ke banjir dan kekeringan.
14. Selang konformal CQR per strata lahan pada luas Monte Carlo. Cocok untuk luas genangan dan volume longsor.
15. Hindcast pakai label proksi independen (METAR HZ/FU untuk asap). Cocok untuk cuaca (laporan METAR TS/RA) dan banjir (laporan bandara atau jalan tergenang) bila stasiun ukur tidak ada.
16. Model bayangan berdampingan yang dinilai prospektif dan baru mengganti model lama bila menang (KRH_B). Pola ini sudah dibagi lintas bencana lewat /prediksi.

Catatan celah:
- Karhutla tidak punya berkas .sidik. Kuncinya KRITERIA_SHA256 di prospektif.py dan sha di lab_kriteria.
- Dari udara tidak ada satu pun keluaran yang punya gerbang tampil seperti gerbang_model.json.
- Hindcast METAR udara tidak punya pembanding persistensi atau klimatologi.