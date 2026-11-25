# R5: model terbaik per bencana (riset 25 Nov 2026)

Pemilik, 25 Nov 2026: "Lakukan riset untuk bisa memberikan model terbaik. Riset mendalam. Be ambitious. Kemudian jika ada yang menuh-menuhin modelnya menurut lu ga guna lagi ya pensiunkan aja." Ditambah: laporan harian Dirdalops boleh dipakai, dan bencana lain yang teramati satelit.

Sumber: enam diagnosa baca-saja atas kode dan berkas hasil repo (pemeriksa `validasi-model`) dan lima riset literatur dan sistem operasional dunia. Angka di bawah dari berkas hasil repo kecuali ditandai sumber luar. Tidak ada angka yang dihitung ulang untuk dokumen ini, kecuali yang ditandai "eksplorasi".

## 1. Kenapa model kita kalah dari pembanding

| Bencana | Hasil sekarang | Sebab akar (berkas) | Kelas sebab |
| --- | --- | --- | --- |
| Karhutla status | ETS 0,157/0,241/0,032 lawan persistensi 0,355 (`public/data/ujibalik_status.json`, n 571.016 kab-hari) | `aturan.py` mengukur keparahan kluster yang sudah ada, bukan peluang api besok; Waspada menyala sampai 72 jam sesudah deteksi terakhir (FAR 0,81); FWI hanya menaikkan level dengan kelas absolut 0/2/7/14 | target salah |
| Udara PM2,5 | MAE koreksi 12,43 lawan persistensi 10,55, CAMS mentah 13,68 (n 3.430, 27 stasiun) | `koreksi_bmkg.py:98` `pred = f_stasiun * CAMS`: tanpa pengamatan kemarin, jadi tidak punya jalan mengalahkan persistensi | bentuk model salah |
| Longsor dampak | Brier 0,0304 = klimatologi; besaran MAE 0,688 lawan median 0,653 | hanya 17 kab lolos `label_mutu`; rumah rusak 0 di DIBI sering berarti tidak tercatat; satu fitur hujan 7 hari dirata-rata atas kab | label |
| Longsor nowcast | AUC 0,7047 lawan klimatologi 0,7773, kalah signifikan (`public/longsor/data/uji_balik.json`) | pemicu "hujan 7 hari > P95" mencampur hujan hari ini dan anteseden | pemicu salah takar |
| Banjir eskalasi | Brier 0,2255 lawan 0,2300, selang [-0,009; +0,019] | label dari kebiasaan pencatatan logbook, bukan kejadian fisik; hujan satu sel per provinsi; tanpa debit sungai; bobot terbesar `lknown` (proksi aktivitas lapor) | label + fitur fisik |
| Banjir BNJ `/prediksi` | BSS lawan persistensi +0,32/+0,50/+0,55, lawan klimatologi -0,37/-0,26/-0,28 (`public/prediksi/data/skor.json`) | peristiwa jarang (0,3 sampai 0,5 persen), hujan mm mentah | kalah klimatologi |
| Abu gunung api | arah 78% (n 18) lawan persistensi VONA 93% (n 15) | arah diukur dari pusat massa semua partikel, VONA melaporkan puncak awan; jam skenario tidak sinkron dengan jam VONA. n terlalu kecil untuk vonis | metrik + n kecil |

Pola bersama: tiga kegagalan karena **label** (longsor, banjir eskalasi, longsor dampak), dua karena **bentuk model yang membuang persistensi** (karhutla, udara). Tidak satu pun karena model kurang canggih. Riset luar sepakat: GBDT atau jaringan saraf tidak menolong selama label dan persistensi belum benar.

## 2. Simulasi: mana yang pernah dicek ke kejadian nyata

| Simulasi | Diuji? | Angka | Kelemahan terbesar |
| --- | --- | --- | --- |
| Sebaran karhutla | uji balik ya, prospektif 0 | F1 24 jam 0,38 (n 604); IoU 0,58 lawan persistensi gugus 0,67 (n 123) | kalah persistensi; uji pakai cuaca sempurna |
| Genangan banjir | lemah | replay Maret 2025 POD sel 0,043 (n 47); HAND CSI 0,446 lawan sel terendah 0,459 (n 30) | CN 80, Manning 0,06 konstan (`sim_genangan.js:13-22`, beku J4) |
| Guncangan gempa | ya | MAE MMI 0,73, ±1 benar 75% (n 1.474, MAGMA); bias +1,28 di < 25 km, -1,61 di > 300 km | Vs30 seragam 400 m/s (`guncangan.py:15`), tanpa sigma |
| Kerusakan gempa | ya, lemah | faktor LOO 5,3x (n 8) | korban jiwa pengamatan belum dicocokkan ke sumber |
| Tsunami | belum | `KALIBRASI=0.85` disetel ke 3 titik (`tsunami.js:11`) | satu faktor global, batimetri 5,5 km |
| Lahar, awan panas | belum | - | `sim_lahar.js:13,15` tertulis "ilustrasi tanpa kalibrasi" |
| Runout longsor | belum | - | H/L 0,3 tanpa sumber (`sim_longsor.js:66`) |

## 3. Resep terbaik per bencana (dari riset luar, disaring ke stdlib)

### Karhutla: peluang api per kab +1..+3 hari
- Regresi logistik L2 (IRLS) per tenggang, kalibrasi isotonik (PAV). Fitur: log1p titik hari t, t-1..t-2, 7 hari; hari sejak titik terakhir; DC (bukan FWI komposit); defisit hujan 30 hari; hujan prakiraan; fraksi gambut dan gambut × DC; densitas kanal OSM; sin/cos hari-tahun; klimatologi kab × bulan.
- Laporkan terpisah lapisan **awal** (kemarin 0) dan **lanjutan**: hampir semua tambahan skill di atas persistensi datang dari lapisan awal.
- Sumber luar: Mortelmans dkk. 2025 (DC terbaik di gambut, IJWF WF24057); Salmayenti 2025 (gambut terdrainase sampai 13x densitas titik, ERL 20 054036); Field dkk. 2016 PNAS (ambang hujan kemarau 4 mm/hari); Nikonovas dkk. 2022 NHESS ProbFire (prior musiman).
- Data latih 2019-2022 sudah dipanen (`data/raw/ujibalik_status/2019..2022.json`); uji bersih 2026-01-01..2026-10-12 (FIRMS ada, panen dan cuaca perlu diperluas). Mesin LR sudah ada (`scripts/sebaran/gbdt.py` `latih_lr`).

### Udara PM2,5: MOS ridge per stasiun
- `z = ln(PM+1)`; `z_obs[t+h] = a + b1 z_cams[t+h] + b2 z_obs[t] + b3 (z_cams[t+h] - z_cams[t]) + b4 musim + b5 F_api_hulu`, ridge λ ≈ 1, jendela bergulir; stasiun < 120 hari pakai koefisien gabungan.
- `F_api_hulu = Σ FRP exp(-jarak/150 km)` dalam sektor ±45° dari arah datang angin 850 hPa, jendela 24-48 jam (FIRMS sudah ada).
- Eksplorasi di data lama yang terbuka (bukan vonis): bentuk lag-1 + CAMS memberi MAE 16,60 lawan persistensi 18,09 (n 2.493), sekitar 8 persen lebih baik; blend delta CAMS kalah (18,25 sampai 20,29).
- Pembanding wajib tambahan: persistensi teredam `μ + ρ(z_obs[t] - μ)`.
- Sumber luar: Air Check (CAMS, 27 kota Eropa, menang lawan persistensi di 27 dari 27; proyek pribadi, belum ditelaah sejawat); KFAN NOAA (MAE CMAQ turun 44-52 persen lawan model mentah).

### Longsor
- Pemicu ala LHASA 2.0: `r1` = hujan hari ini / P99 sel, `a2` = hujan 2 hari sebelumnya, `a7` = 7 hari, ditambah kelembapan tanah ERA5-Land; logistik dengan koefisien hujan ≥ 0. Stanley dkk. 2021: tangkap 93 persen lawan 45 persen v1 pada laju alarm sama (Frontiers 10.3389/feart.2021.640043).
- Pooling empirical Bayes per provinsi atau pulau untuk kab tanpa label. Ambang Jawa (Banjarnegara, Wonosobo, Balai Sabo 2022) hanya prior atau pembanding.
- `scripts/longsor/model_lhasa2.py` beku: diteruskan apa adanya; kandidat baru di berkas baru bila prareg LHASA2 tidak memuat `r1`.

### Banjir
- Kejadian per kab: indeks hujan anteseden `API_k = k·API_(k-1) + P_t` (k 0,85-0,90), hujan prakiraan dibagi persentil lokal kab, kelembapan tanah, **debit GloFAS dari Open-Meteo flood API** (gratis, tanpa kunci, ensemble, sejak 1984) untuk kab dengan sungai besar.
- Eskalasi: fase hidrograf (debit naik atau sudah lewat puncak), pertumbuhan laporan 24-48 jam pertama, perubahan luas GFM. Label fisik (GFM per kab, laporan Dalops), bukan kebiasaan pencatatan.
- Genangan: HAND ditambah kurva debit sintetis, atau FwDET di atas luas GFM (Cohen 2018).
- Sumber luar: belum ada angka skill per kab untuk Indonesia dari GloFAS, Flood Hub, atau IBF BMKG; semua harus diukur sendiri.

### Gunung api
- Arah abu: arah VONA terakhir sebagai dasar; ganti ke arah model hanya bila angin di ketinggian kolom berputar > 45° sejak VONA terakhir dan > 5 m/s. Arah diukur di 0,5H-1H (bagian atas kolom), jam skenario sama dengan jam penilaian.
- Lahar: LAHARZ diuji balik ke Merapi 2010 dan Semeru 2021 sebelum tampil sebagai jarak.
- Sumber luar: MetEd COMET; Crawford 2022 ACP (ensemble HYSPLIT terlalu yakin); Darwin VAAC Zidikheri-Lucas.

### Gempa dan tsunami
- Guncangan: logic tree GEM Indonesia (kerak BSSA14/CB14/CY14; interface dan intraslab AG20/Zhao2006/Kuehn2020), Vs30 dari `vs30.bin` yang sudah ada, koreksi bias jarak dekat dari MAGMA (dilatih di separuh waktu, diuji di separuh lain).
- Sesudah laporan masuk: kondisikan ke MMI teramati (residual antar-kejadian, lalu kriging residual dalam-kejadian, panjang korelasi 10-20 km; Worden 2018).
- Tsunami: uji waktu tiba lawan kejadian nyata (Pangandaran 2006, Palu 2018) dan tide gauge sebelum grid bersarang; basis Green's function unit source untuk tahap pertama (pola InaTEWS/TOAST).

## 4. Laporan harian Dirdalops sebagai label bersama

Diagnosa menemukan kelemahan terbesar banjir, longsor, dan eskalasi ada di label (DIBI terlambat, bolong, nol berarti tidak tercatat). Laporan harian Pusdalops/Dirdalops sudah dipakai sebagian (`scripts/kekeringan/label.py`, `scripts/cuaca/uji_logbook.py`, `scripts/pesisir/rob_label.py`, `scripts/bnpb/rekonsiliasi_dalops_dibi.py`). Usulan: satu pembaca label Dalops bersama di `scripts/umum/`, lewat `label_mutu` supaya kab yang jarang lapor tidak dihitung nol, dipakai semua model sebagai label utama dan DIBI sebagai label kedua. Toleransi ±1 hari dilaporkan bersama skor tanpa toleransi.

## 5. Bencana yang teramati satelit

| Bencana | Satelit | Status di repo |
| --- | --- | --- |
| Karhutla | FIRMS VIIRS/MODIS, Himawari | jalan |
| Banjir | Sentinel-1 (Copernicus GFM), MODIS | mesin ada (`genangan_nasional.py`, `gfm_label.py`), belum dirakit pola karhutla (deteksi harian per kab, insiden, perkembangan) |
| Longsor | Sentinel-2 rdNDVI sebelum-sesudah | paket `longsor-satelit` (dokumen) |
| Gunung api | panas kawah VIIRS/MIROVA, SO2 TROPOMI, abu Himawari | belum, selain VONA |
| Kekeringan | NDVI/VHI, SMAP, CHIRPS/GSMaP | sebagian (SPI, HTH) |
| Asap | AOD Himawari/MODIS, CAMS | CAMS |
| Pesisir | Landsat | jalan |
| Penurunan tanah | InSAR Sentinel-1 | paket dokumen |
| Kerusakan bangunan | radar/optik pasca-kejadian | paket dokumen |
| Cuaca ekstrem | Himawari puncak awan, GSMaP | GSMaP di banjir |

Dua yang paling cepat berguna: banjir harian dari GFM dengan pola karhutla (mesinnya ada), dan panas kawah plus SO2 untuk gunung api (sinyal sebelum VONA). Keduanya fitur besar, jadi lahir lewat paket dokumen dulu (AGENTS 3.7).

## 6. Prioritas penanganan (pertanyaan pemilik soal AHP)

`scripts/bnpb/prioritas.py` sudah memberi prioritas per kecamatan lintas bencana dari skor risiko berbobot tangan, belum diuji balik. AHP penuh akan mengulang kesalahan aturan status karhutla: bobot pendapat untuk pertanyaan peluang. Usulan: prioritas = peluang kejadian dari model teruji × paparan (jiwa, bangunan, gambut, fasilitas) ÷ kapasitas; AHP hanya untuk bobot paparan, diisi pemilik atau pakar dengan rasio konsistensi < 0,1. Menunggu jawaban pemilik (Q9).

## 7. Dipensiunkan

| Komponen | Alasan | Cara pensiun |
| --- | --- | --- |
| Aturan status 4 tingkat sebagai prakiraan | bukan alat prakiraan; kalah persistensi di uji pra-registrasi | tetap dihitung sebagai label keparahan kluster saat ini; tidak disebut prakiraan di layar; prakiraan pindah ke peluang KI-72 bila lulus |
| Faktor stasiun `koreksi_bmkg` | strukturnya tidak bisa mengalahkan persistensi | berkas tetap (beku sidik, catatan vonis); tidak dipakai keluaran mana pun |
| Blend persistensi + delta CAMS | lebih buruk dari persistensi di data terbuka | tidak dibangun |
| Tahap besaran (rumah rusak) `model_dampak.py` longsor | kalah median; label nol bising | DITUTUP; pengganti "perkiraan kasar" = peluang × median rumah per kejadian per provinsi, berlabel belum teruji |
| Model dampak cuaca | label layak 10 kab | sudah DITUTUP (KI-62) |
| Koreksi diurnal PM2,5 | 31 hari data, sel jam × stasiun terlalu tipis | tidak dibangun |
| FFMC, ISI, BUI, FWI komposit sebagai prediktor kejadian harian | 86 persen titik Asia Tenggara terjadi pada FFMC ≥ 78 (de Groot 2005), daya pembeda rendah; FWI kalah dari DC di gambut | tidak masuk model KI-72; tetap tampil sebagai indeks cuaca |
| ENSO/IOD sebagai fitur harian | konstan berminggu-minggu | hanya lewat prior musiman |
| FBP untuk api gambut | dikalibrasi untuk bahan bakar boreal | sebaran gambut = persistensi gugus + laju empiris; FBP hanya api permukaan berlabel hipotesis |
