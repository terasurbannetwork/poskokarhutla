# RISET: matriks silang lima bidang inti di sebelas bencana

Sumber: empat inventaris 24 Nov 2026, dibaca langsung dari kode dan berkas data di HEAD `404b51269`. Ada sekitar 330 baris teknik, masing-masing memuat berkas, keadaan tayang, dan vonis uji:

- `riset/R1-karhutla-udara.md`
- `riset/R2-banjir-pesisir.md`
- `riset/R3-longsor-gempa-gunungapi.md`
- `riset/R4-kekeringan-cuaca-bersama.md`

Uji tidak dijalankan ulang, kecuali yang ditandai "dijalankan" di R3. Vonis dibaca dari JSON yang dikomit.

Arti tanda di matriks:

- ✓ ada dan terpasang, atau lolos uji bila teknik itu memang uji.
- ½ sebagian, draf, atau terpasang tanpa uji.
- ✗ belum ada.
- – tidak berlaku, dengan alasan di kolom catatan.

Kolom tiket menunjuk tiket di `TIKET.md` dengan kode bencana di dalam kurung, misalnya `KI-50 (Rob, Kkr)`. Tiket paket lain ditulis dengan kodenya sendiri (PB-, LS-). Tiap sel ✗ harus muncul di kurung salah satu tiket barisnya, atau di tabel "Sel ✗ tanpa tiket" bagian 7 (gerbang KI-70).

Kode kolom: Krh karhutla, Bnj banjir, Rob rob, Lsr longsor, Pss pesisir (gelombang dan abrasi), Cca cuaca ekstrem, Udr kualitas udara, Gmp gempa, Tsn tsunami, Gna gunung api, Kkr kekeringan.

## 1. Temuan utama

1. **Hanya sedikit keluaran yang lolos uji.**
   - Eskalasi titik api karhutla: AUC 0,908, Brier skill 0,364 lawan laju dasar.
   - Risiko 7 hari karhutla (uji saja): AUC 0,915 lawan klimatologi 0,748.
   - Prakiraan titik panas /prediksi `API`: BSS 0,255 lawan klimatologi.
   - Hujan /prediksi `HJN`: BSS 0,262.
   - Susulan gempa M5: BSS tipis 0,0021.
   - Arah abu prospektif: 82% lawan acak 25%.
   - Besaran KK dan rumah banjir: `model_dampak`.
   - Hujan AIFS.
   - MOS PM2,5 di arsip OpenAQ.
   - Bulan rawan cuaca.

   Selebihnya GAGAL, TIDAK LULUS, atau BELUM DIUJI.
2. **Akar kegagalan yang sama di banjir, longsor, kekeringan, dan cuaca:** label "ada laporan DIBI/logbook" menyimpan kebiasaan lapor, sehingga klimatologi kab x bulan atau persistensi menang. Obatnya ada di bencana lain: label bebas pelapor (karhutla FIRMS, udara stasiun, gempa katalog), uji kualitas label (kekeringan), dan klimatologi sebagai offset (banjir CAMPUR, longsor LHASA2).
3. **Disiplin uji tidak merata.**
   - Pra-registrasi bersidik: banjir dan gempa.
   - Gerbang tampil gagal-tertutup: karhutla (`gerbang.py`), gunung api (gerbang skill), dan gempa (terbit per target).
   - Udara tidak punya gerbang sama sekali, dan hindcast METAR-nya tanpa pembanding naif.
   - Cuaca sudah punya pembanding klimatologi dan persistensi (`verifikasi.py`, `uji_logbook.py`).
   - Di karhutla pun semua keluaran masih `boleh_tampil=false`. Model eskalasi kalah bukan karena skill, melainkan karena selang belum ada dan vonis prospektif belum keluar.
4. **Kanal peringatan bolong.**
   - Kekeringan tidak punya satu pun kanal keluar.
   - Rob tidak muncul di layar alarm, CAP, atau push.
   - Pesisir tanpa tangga tindakan, email, dan push.
   - Gempa dan tsunami tanpa push.
   - Gunung api dan udara tanpa email.
   - Tidak ada siaran WA otomatis (sengaja: pemilik menolak router WA bersama).
5. **Dampak teruji hanya di dua tempat:** gempa (rantai fisika) dan banjir (empiris bertingkat). Longsor tidak punya model dampak sama sekali.
6. **Lima informasi salah atau tidak konsisten di kode:**
   - Email longsor dan rob terkirim walau hipotesis.
   - Severity Severe di email cuaca = Awas, padahal di CAP = Siaga.
   - Teks CAP masih menyebut lima jenis lama.
   - `model_guncangan.json` menulis "belum_diuji", padahal pembanding MAGMA tersedia (1.474 pasangan tempat dari 496 kajian).
   - GNSS disebut sebagai fitur `peluang_gempa.py`, padahal tidak dipakai.

   Ambang angin dan gelombang yang berbeda antar modul ternyata disengaja (KEPUTUSAN-BESOK K12).

## 2. Matriks PEMODELAN (disiplin uji)

| Kode | Teknik (asal terbaik) | Krh | Bnj | Rob | Lsr | Pss | Cca | Udr | Gmp | Tsn | Gna | Kkr | Tiket |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | Pembanding wajib persistensi + klimatologi pada jumlah alarm sama (banjir, kekeringan, cuaca) | ✓ | ✓ | ½ | ✓ | ✗ | ✓ | ½ | ✓ | – | ✓ | ✓ | KI-05 (Udr), KI-06 (Rob), KI-25 (Pss) |
| M2 | Pra-registrasi bersidik, buka sekali (banjir `.sidik/.buka`, gempa `sidik_param`) | ½ | ✓ | ✗ | ✓ | ✗ | ✗ | ½ | ✓ | – | ½ | ½ | KI-27 (Krh), KI-06 (Rob), KI-25 (Pss) |
| M3 | Uji prospektif append-only (karhutla, banjir, gempa) | ✓ | ✓ | ½ | ½ | ✗ | ½ | ½ | ✓ | – | ✓ | ½ | KI-06 (Rob), KI-25 (Pss) |
| M4 | Gerbang tampil gagal-tertutup per keluaran (karhutla `gerbang.py`) | ✓ | ½ | ½ | ½ | ✗ | ½ | ✗ | ✓ | – | ✓ | ½ | KI-12 (Udr), KI-25 (Pss) |
| M5 | Keluaran hipotesis tidak dikirim tanpa label (`src/ews.js` penilai) | ✓ | ✓ | ✗ | ½ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | KI-01 (Rob, Lsr) |
| M6 | Kalibrasi berpenjaga, ganti hanya bila Brier holdout turun (/prediksi, karhutla Platt + ECE) | ✓ | ½ | ✗ | ½ | – | ½ | ✗ | – | – | ✗ | ✗ | - |
| M7 | Per wilayah lawan nasional dipilih dengan log-likelihood + pooling (gempa susulan) | ½ | ½ | ✗ | ½ | – | ✗ | ½ | ✓ | – | – | ✗ | KI-24 (Udr) |
| M8 | Selang tervalidasi + gerbang lebar selang (karhutla CQR, gempa `rentang_maks_mu`) | ✓ | ½ | ✗ | ✗ | ✗ | ✗ | ½ | ✓ | – | ½ | ½ | KI-60 (Bnj, Udr) |
| M9 | Kesetaraan Python-JS ber-seed + kontrol negatif (gempa, gunung api) | ½ | ½ | – | – | – | – | ✗ | ✓ | ✓ | ✓ | ✓ | KI-15 (Krh, Bnj, Udr) |
| M10 | Uji invarian fisik simulasi (gempa massa kekal, gunung api LAHARZ) | ✗ | ½ | – | ✗ | – | ½ | ½ | ✓ | ✓ | ✓ | ✓ | KI-44 (Krh, Bnj, Lsr) |
| M11 | Mutu label: cakupan sumber, tak teramati, buang laporan latihan, validasi silang logbook (kekeringan `ujilabel`, banjir label bersatu, karhutla logbook 94%) | ✓ | ✓ | ½ | ½ | ½ | ✗ | ½ | ½ | – | ½ | ✓ | KI-16 (Lsr, Cca) |
| M12 | Label bebas pelapor (satelit, sensor, katalog) | ✓ | ½ | ½ | ½ | ✓ | ½ | ✓ | ✓ | ✓ | ½ | ½ | LS-* (Lsr) |
| M13 | Klimatologi kebiasaan lapor sebagai offset (banjir CAMPUR, kekeringan bayangan) | – | ½ | ✗ | ½ | – | ✗ | – | – | – | – | ✓ | - |
| M14 | Model bayangan dinilai berdampingan (/prediksi, kekeringan) | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | – | ✗ | ✓ | - |
| M15 | Pembanding produk luar (banjir GloFAS/GEOGLOWS/FloodHub/AIFS, kekeringan GDO kappa, gempa MAGMA) | ½ | ✓ | ½ | ½ | ✗ | ½ | ½ | ✓ | ½ | ½ | ✓ | KI-04 (Gmp) |
| M16 | Hindcast atau replay kejadian historis (karhutla 123 kasus, gunung api Merapi 2010, banjir Maret 2025) | ✓ | ✓ | ✗ | ✗ | – | ✗ | ½ | ✓ | ✓ | ✓ | ✓ | - |
| M17 | Koreksi bias/MOS ke pengamatan (udara MOS arsip, rob offset IOC) | – | ½ | ✓ | ✗ | – | ½ | ✓ | ½ | – | – | ✗ | KI-24 (Udr) |
| M18 | Deteksi lonjakan berbasis data (gempa binomial negatif, udara CO MAD) | ½ | ✗ | – | ✗ | – | ✗ | ✓ | ✓ | – | ½ | – | KI-52 (Krh, Udr) |

## 3. Matriks PREDIKSI

| Kode | Teknik (asal terbaik) | Krh | Bnj | Rob | Lsr | Pss | Cca | Udr | Gmp | Tsn | Gna | Kkr | Tiket |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Ansambel 51 anggota, peluang melewati ambang | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | – | – | – | ✓ | ✓ | - |
| P2 | Prakiraan +1..+3 per kab dibekukan dan dinilai di /prediksi | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | – | ✗ | ✗ | PB-51 (Gna, Kkr) |
| P3 | Model eskalasi kejadian berjalan + ramal ulang sesudah pengamatan kedua (karhutla `lolos`) | ✓ | ✗ | – | – | – | – | ✗ | ✓ | – | ✗ | – | KI-30 (Bnj) |
| P4 | Peluang tahunan sesudah declustering + backtest selang Poisson (gempa) | ½ | ✗ | – | ✗ | – | ✗ | – | ✓ | – | ✗ | – | - |
| P5 | Musiman: bulan rawan pra-registrasi + ENSO (cuaca LULUS) | ✓ | ½ | ½ | ½ | – | ✓ | ½ | – | – | – | ½ | PB-53 (Bnj, Rob, Lsr, Udr, Kkr) |
| P6 | Risiko 7 hari GBDT sel (karhutla `risiko_mingguan` LULUS) | ✓ | ✗ | – | ✗ | – | – | – | – | – | – | – | - |
| P7 | Nowcast jam-an | ✓ | ½ | – | ✗ | – | ✓ | ½ | – | ✓ | – | – | - |

## 4. Matriks SIMULASI

| Kode | Teknik (asal terbaik) | Krh | Bnj | Rob | Lsr | Pss | Cca | Udr | Gmp | Tsn | Gna | Kkr | Tiket |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Mesin fisik ruang (longsor hanya SINMAP tanpa run-out, rob tanpa genangan rob) | ✓ | ✓ | ½ | ½ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | KI-46 (Lsr) |
| S2 | Peringkat perlakuan biaya-manfaat + bilangan acak bersama + front Pareto + kestabilan (gunung api, udara, karhutla) | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | KI-40 (Gmp) |
| S3 | Evakuasi berkapasitas / waktu tempuh Dijkstra (gunung api, tsunami) | ½ | ✓ | ✗ | ✗ | ✗ | ✗ | – | ½ | ✓ | ✓ | – | - |
| S4 | Faktor sisi aman terpisah dari faktor tampilan (tsunami 0,61 lawan 0,85) | – | ✗ | – | ✗ | – | – | – | – | ✓ | ✗ | – | KI-43 (Bnj, Gna) |
| S5 | Kalibrasi satu pengali + galat leave-one-out ditampilkan (gempa kerusakan, kekeringan hindcast) | ½ | ½ | – | ✗ | – | ✗ | ½ | ✓ | – | ✗ | ✓ | - |
| S6 | Persistensi sebagai pembanding simulasi ruang (karhutla IoU sel) | ✓ | ✗ | – | – | – | – | ✗ | – | – | ✗ | – | KI-41 (Gna) |

## 5. Matriks PERINGATAN DINI

Kanal per bencana diambil dari `riset/R4` bagian CAKUPAN EWS, dikoreksi pemeriksa (`riset/PERIKSA-1.md` butir 8).

| Kode | Teknik (asal terbaik) | Krh | Bnj | Rob | Lsr | Pss | Cca | Udr | Gmp | Tsn | Gna | Kkr | Tiket |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | Layar alarm | ✓ | ✓ | ✗ | ½ | ½ | ✓ | ½ | ✓ | ✓ | ½ | ✗ | KI-50 (Rob, Kkr), PB-36a, PB-38a, PB-46a |
| E2 | Tangga tindakan bersumber per butir (`rujukan`) | ½ | ½ | ½ | ½ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | KI-56 (Krh, Bnj, Rob, Lsr), PB-36a (Pss), PB-40 (Kkr) |
| E3 | Email langganan | ✓ | ✓ | ✓ | ½ | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | KI-50 (Pss, Udr, Gna, Kkr), KI-01 (Lsr) |
| E4 | Web push warga dari sumber resmi (push model `LSR`, `CEX`, `ASP` dihitung ½) | ✓ | ✓ | ✗ | ½ | ✗ | ½ | ½ | ✗ | ✗ | ✗ | ✗ | - |
| E5 | CAP 1.2 | ✓ | ✓ | ✗ | ½ | ½ | ✓ | ½ | ✓ | ✓ | ½ | ✗ | KI-50 (Rob, Kkr), KI-07 (Krh) |
| E6 | Resmi dan deteksi kita dipisah, label lembaga utuh | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| E7 | Peringatan berantai berbasis lift empiris berselang (banjir ke longsor) | ✗ | ✓ | ✗ | ✓ | – | ✗ | – | ✗ | – | ✗ | – | KI-51 (Gmp, Gna) |
| E8 | Daerah senyap: sinyal kuat tanpa laporan (karhutla `senyap.py`) | ✓ | ✗ | ✗ | ✗ | – | ✗ | – | – | – | – | ✗ | KI-53 (Bnj, Lsr, Kkr) |
| E9 | Pemetaan tingkat konsisten antar kanal | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | KI-02 (Cca), KI-03 (Cca) |
| E10 | Saran status darurat (bukan penetapan) | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | KI-55 (Rob, Pss, Udr) |

## 6. Matriks DAMPAK

| Kode | Teknik (asal terbaik) | Krh | Bnj | Rob | Lsr | Pss | Cca | Udr | Gmp | Tsn | Gna | Kkr | Tiket |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Paparan penduduk, sekolah, faskes di area bahaya (longsor di `scripts/prediksi/terbit.py`) | ✓ | ✓ | ✓ | ✓ | ½ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| D2 | Rantai fisika: bahaya, kerapuhan, kerusakan, korban, dikalibrasi + LOO (gempa) | – | ✗ | ✗ | ✗ | – | ✗ | – | ✓ | ½ | ✗ | – | KI-60 (Bnj) |
| D3 | Model empiris bertingkat hujan, kejadian, besaran KK/rumah (banjir `model_dampak` LULUS) | – | ✓ | ✗ | ✗ | – | ✗ | – | – | – | – | – | KI-62 (Lsr, Cca) |
| D4 | Kesehatan dan kelompok rentan (RR ISPA balita/lansia) | ✓ | – | – | – | – | – | ✓ | – | – | ✗ | – | KI-63 (Gna) |
| D5 | Jalan putus dan desa terisolir (graf jembatan Tarjan, `scripts/prediksi/jalan.py`) | ✗ | ✓ | ✗ | ✓ | – | ✗ | – | ✗ | ✗ | ✗ | – | KI-64 (Rob, Cca, Gmp, Gna) |
| D6 | Paparan tanpa hitung ganda antar-bahaya (gunung api awan panas + lahar) | – | ✗ | ✗ | ✗ | – | – | – | – | – | ✓ | – | KI-65 (Bnj, Lsr) |
| D7 | Kebutuhan logistik Sphere per jiwa (`scripts/prediksi/aturan.json`) | ½ | ✓ | ✗ | ✓ | – | ✗ | ½ | ✗ | ✗ | ½ | ✓ | KI-66 (Cca, Gmp) |
| D8 | Sektor (bandara, pelabuhan) | ✓ | ✗ | ✗ | – | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | – | KI-67 (Rob, Pss, Tsn) |
| D9 | Ekonomi rupiah dengan parameter bersumber | ✓ | ½ | ✗ | ✗ | ✗ | ½ | ½ | ✗ | ✗ | ½ | ½ | PB-55 (Rob, Lsr, Pss, Gmp, Tsn) |

## 7. Sel ✗ tanpa tiket (alasan per sel)

| Baris | Bencana | Alasan |
| --- | --- | --- |
| M2 | Cca | Uji cuaca yang baru tidak direncanakan. `CEX_B` sudah dibekukan dan dinilai lewat /prediksi. |
| M6 | Rob, Udr, Gna, Kkr | Kalibrasi berpenjaga /prediksi menyala per kode begitu ada amatan dan model. Udr menunggu KI-21, Gna dan Kkr menunggu PB-51, Rob menunggu KI-06. |
| M7 | Rob, Cca, Kkr | Kejadian per wilayah terlalu sedikit. Audit banjir bagian 5: per kab kalah karena n kecil. |
| M8 | Rob, Lsr, Pss, Cca | Selang dipasang di keluaran yang punya pasangan kalibrasi. Mesinnya lahir di KI-60. Keempat jenis ini belum punya keluaran besaran yang dinilai. |
| M13 | Rob, Cca | Cca: `CEX_B` sudah memakai koefisien kab. Rob: label 565 kejadian baru dipakai di KI-06, dan offset baru masuk akal sesudah vonis itu. |
| M14 | Rob, Pss, Udr, Gmp, Gna | Udr: KI-21 DITUTUP, koreksi MOS kalah dari persistensi 24 jam (KI-24). Rob dan Pss belum punya model calon. Gmp: pemilihan generik lawan disesuaikan sudah setara dengan bayangan. Gna: peluang letusan GAGAL. |
| M15 | Pss | Tidak ada produk luar abrasi tahunan selain metode DEA Coastlines yang sudah dipakai. |
| M16 | Rob, Lsr, Cca | Satu kejadian per replay tidak memberi vonis (KI-45 DITUTUP). Replay Tapanuli ada di paket LS. |
| M17 | Lsr, Kkr | Tidak ada pengamatan stasiun tanah terjangkau yang bisa dipakai untuk koreksi. |
| M18 | Bnj, Lsr, Cca | Tidak ada deret harian bebas pelapor yang bisa dipakai untuk lonjakan. |
| P1 | Rob, Pss | KI-31 DITUTUP: ensambel gelombang WAM ECMWF kosong untuk perairan Indonesia lewat Open-Meteo; GRIB ECMWF butuh eccodes di luar stdlib. |
| P2 | Gmp | KI-32 DITUTUP: BSS susulan 0,0021. |
| P3 | Udr, Gna | Udr: episode asap mengikuti titik api, dan eskalasi karhutla sudah meliputinya. Gna: peluang letusan GAGAL. |
| P4 | Bnj, Lsr, Cca, Gna | Laju dari DIBI mencerminkan kebiasaan lapor. Gunung api n kecil (KI-33 DITUTUP). |
| P6 | Bnj, Lsr | Pola yang sama GAGAL di banjir (GBDT = regresi logistik). Menunggu label bebas pelapor. |
| P7 | Lsr | Lihat bagian 8. |
| S1 | Pss | Lihat bagian 8. |
| S2 | Rob, Lsr, Pss, Tsn | Lsr: run-out dulu (KI-46). Rob dan Pss: tidak ada mesin genangan rob. Tsn: evakuasi sudah ada, tetapi biaya per perlakuan belum bersumber. |
| S3 | Rob, Lsr, Pss, Cca | Tidak ada mesin jangkauan (rob, pesisir) atau waktu tiba (longsor mendadak, siklon) yang tervalidasi. |
| S4 | Lsr | Longsor mendadak, tanpa waktu tiba yang bisa dihitung. |
| S5 | Lsr, Cca, Gna | Hanya satu atau dua kejadian berlabel besaran. Gunung api hanya Merapi 2010. |
| S6 | Bnj, Udr | Bnj: J4 sudah dibanding heuristik elevasi, dan berkasnya beku. Udr: pengamatan sebaran asap harian tidak cukup (TROPOMI 93 pasangan). |
| E4 | Rob, Pss, Gmp, Tsn, Gna, Kkr | Push sumber resmi menunggu keputusan pemilik di PWA Q13. |
| E7 | Krh, Rob, Cca | Rantainya sudah ditangkap oleh status bencana tujuan sendiri: hujan ke banjir lewat status banjir, api ke asap lewat lintasan. |
| E8 | Rob, Cca | Tidak ada sinyal kuat bebas pelapor. |
| E10 | Cca | Sengaja dilewati (`scripts/umum/saran_status.py:16,44`). |
| D2 | Rob, Lsr, Cca, Gna | Rob: kedalaman rob tidak dimodelkan. Lsr: volume dan jangkauan belum tervalidasi. Cca: kerapuhan angin terhadap atap rumah Indonesia tidak bersumber. Gna: hanya Merapi 2010 untuk kalibrasi. |
| D3 | Rob | Label besaran rob di DIBI sedikit. |
| D5 | Krh, Tsn | Krh: api jarang memutus jalan, dan tidak ada label. Tsn: zona buletin per kab tidak cukup rinci untuk ruas jalan. |
| D6 | Rob | Rob dan banjir jarang beririsan di satu kecamatan. Dicek ulang sesudah KI-65. |
| D7 | Rob, Tsn | Jumlah pengungsi rob dan tsunami tidak diprakirakan. |
| D8 | Bnj | Genangan bandara tanpa sumber. |

## 8. Tidak dibawa (D1)

| Teknik | Kenapa tidak dibawa sekarang |
| --- | --- |
| Nowcast jam-an ke banjir non-Jakarta dan longsor | Nowcast Jakarta GAGAL (Brier sama dengan persistensi). Tanpa data jam-an teruji, hasilnya hanya alarm palsu. |
| GBDT sel 7 hari ke banjir dan longsor | Pola yang sama GAGAL di banjir. Dibawa sesudah label bebas pelapor ada (KI-16, LS-*). |
| Siaran WA otomatis | Pemilik menolak router WA bersama (AGENTS 2.15). Tombol bagikan wa.me tetap ada. |
| Simulasi fisik pesisir harian | Abrasi diukur tahunan dari Landsat. Mesin harian tidak punya data validasi. |
| Ansambel atmosfer udara | CAMS deterministik. 729 varian sensitivitas sudah berlabel "bukan ansambel". |
| Rantai kerusakan karhutla dan kekeringan | Dampak utamanya asap, kesehatan, dan pangan, dan itu sudah di D4 dan D7. |
| Peluang letusan 7 hari | GAGAL (skill 0,059). Gerbang sudah menyembunyikannya. |
| Koreksi residu EMSC gempa | Ditolak jujur oleh ujinya sendiri. |
| Pos air tidak diturunkan prakiraan (KI-54) | `level_banjir` beku di sidik `siaga_persentil`, dan perubahan ini mengubah status publik. Ditimbang lagi sesudah vonis siaga persentil (paling cepat Des 2027). |
| Gerbang lisensi model (KI-17) | Tidak bisa diperiksa mesin secara bermakna. Satu-satunya kasus (MIROVA) sudah dijaga. |
| Koreksi Bonferroni lintas rancangan (kekeringan `ambang2.py`) | Dipakai bila ada penyetelan banyak rancangan. Tidak ada tiket paket ini yang menyetel lebih dari satu rancangan. |
| GEV L-momen dan MOS stasiun untuk ambang banjir | Ambang persentil banjir sudah TIDAK MEYAKINKAN dan dikunci. Ditimbang lagi bersama hasil PRAREG-CAMPUR. |
| Tangga multi-skala untuk gunung api dan udara | Wilayah paket Tangga (`data/kajian-bnpb/tangga/`). Ditambah lewat keputusan di sana, bukan di paket ini. |
