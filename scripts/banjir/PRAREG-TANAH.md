# Pra-registrasi: kelembapan tanah anteseden ERA5-Land pada model peluang banjir kabupaten-hari

Dibuat 1 Nov 2026, ditulis SEBELUM deret kelembapan tanah ERA5-Land diunduh untuk sampel (satu-satunya nilai yang sudah
dilihat: uji asap jaringan 2 sel x 2 hari, §6). Berkas ini harus ditinjau validasi-model (konteks bersih) sebelum `latih`
dijalankan pada data nyata. Kerangka (sampel, label, pembagian waktu, model, Platt, bootstrap, gerbang `sia`/`buka`, jejak
`.sidik`) DIWARISI dari `PRAREG-HULU.md` termasuk amandemen A1; yang ditulis di sini hanya yang berbeda atau baru. Bila
berkas ini diam tentang sesuatu, aturan PRAREG-HULU yang berlaku.

## 1. Pertanyaan

Satu hipotesis, dua kontras utama:

- **HT (tanah anteseden):** apakah keadaan kelembapan tanah ERA5-Land DUA HARI sebelum hari sasaran, berikut anomalinya terhadap
  klimatologi bulan sel itu, menambah daya pisah peluang banjir kabupaten-hari?
  - **T1: M3T - M3** (di atas model terbaik HULU di validasi, M3 = M0 + CHIRPS + hulu).
  - **T2: M0T - M0** (di atas model ERA5 saja).

M0 sudah memuat `sm` = lengas tanah ERA5 (0,25 derajat, lapisan 7-28 cm) pada hari sasaran e sendiri (kelompok `tanah`
model_kab.py). Jadi HT tidak bertanya "apakah tanah berguna", melainkan apakah keadaan tanah ANTESEDEN (e-2) dari reanalisis
darat beresolusi 0,1 derajat, dinyatakan sebagai anomali, menambah sesuatu di atas `sm` hari e. Lihat §6.

## 2. Data

- **Sampel, label latih, label evaluasi, ERA5, CHIRPS, basin hulu:** sama persis dengan PRAREG-HULU §2, dibaca dari berkas
  HULU tanpa mengubahnya: `data/raw/banjir/model_kab_hulu/sampel.json`, `basin.json`, cache `chirps/`; cache ERA5 `uji_balik`.
- **Label latih dijaga lewat `label_latih.json` HULU:** `latih` membangun ulang tabel tambahan logbook dengan fungsi HULU yang
  sama, lalu MENOLAK bila `sha256` (pasangan kab-hari tambahan), `n`, `sha256_label_bersatu_csv`, atau `sha256_hari_tercakup`
  beda dengan `data/raw/banjir/model_kab_hulu/label_latih.json`, atau bila salinan DIBI <= 2025 beda sha256 dengan
  `dibi_le2025.json` HULU. Logbook mentah (`logbook_kejadian.csv`, `logbook_bersih.py`) TIDAK disidik (pelajaran A1); yang
  disidik `label_latih.json` HULU dan salinannya di folder percobaan ini.
- **Kelembapan tanah:** ERA5-Land lewat Open-Meteo Historical Weather API (`archive-api.open-meteo.com/v1/archive`), tanpa kunci,
  `models=era5_land`, `daily=soil_moisture_0_to_7cm_mean,soil_moisture_7_to_28cm_mean`, `timezone=Asia/Jakarta`,
  `cell_selection=land`, satu permintaan per sel sampel dengan koordinat pusat sel 0,25 derajat (104 sel model_kab). CDS tidak
  dipakai (butuh kunci). Rata-rata harian dihitung Open-Meteo dari nilai per jam pada hari WIB 00.00-24.00.
- **Satu besaran:** theta = (7 x s(0-7 cm) + 21 x s(7-28 cm)) / 28, rata-rata berbobot tebal lapisan 0-28 cm, m3/m3. Tidak ada
  lapisan lain dan tidak ada pilihan lapisan sesudah data dilihat.
- **Titik kisi:** Open-Meteo memilih titik kisi darat ERA5-Land (0,1 derajat) terdekat. Koordinat titik yang dikembalikan
  dicatat. Bila titik itu jatuh di LUAR kotak sel sampel 0,25 derajat (lebih dari 0,125 derajat dari pusat pada lintang atau
  bujur), sel itu dinyatakan nodata permanen untuk tanah.
- **Cache:** `data/raw/banjir/model_kab_tanah/era5_land/<lat>_<lon>.json.gz` (s1 dan s2 mentah, titik kisi, tanggal awal),
  hanya-tambah: unduhan berikutnya hanya menyambung ekor, nilai yang sudah ada tidak pernah diunduh ulang atau ditimpa. Titik
  kisi unduhan sambungan harus sama dengan yang tersimpan, kalau tidak ditolak. Tiap unduhan dicatat di `manifest.jsonl`
  (sel, rentang, titik kisi, sha256 JSON terurai yang disusun ulang kanonik, BUKAN byte respons mentah, waktu). Rentang cache
  mulai 2015-12-01; deret yang dipakai model mulai `ub.AWAL` 2015-12-22. `ambil` menolak tanggal akhir sesudah hari ini - 10 hari,
  menolak nilai yang bukan angka atau di luar 0..0,9 m3/m3, dan tidak menyimpan ekor null (hari yang belum terisi) supaya diulang
  pada `ambil` berikutnya; sel yang seluruhnya null (laut) disimpan apa adanya.
- **Hari hilang:** nilai null pada sel-hari membuat sel itu gugur untuk baris itu; fitur kabupaten = maksimum atas sel yang
  tersisa. Baris tanpa satu sel tanah valid DIKELUARKAN DARI KEEMPAT MODEL sekaligus (M0, M3, M0T, M3T), di atas pengecualian
  CHIRPS/hulu HULU. Sel tanpa satu nilai pun pada 2015-12-22..2026-01-03 (`ub.AWAL` s/d akhir latih), atau titik kisinya di luar sel, = nodata permanen.
  Kabupaten tanpa sel tanah valid dikeluarkan dari keempat model dan tidak diganti; daftarnya disidik dan dilaporkan.
  Cache yang belum mencapai akhir jendela, atau sel valid yang deretnya berakhir dengan run null di ekor jendela, menunda
  `sia`/`buka`; tidak ada pengganti (ERA5 atau sumber lain).

## 3. Fitur

Kelompok `tanah_ant` (M0T, M3T), dihitung per sel lalu kabupaten = maksimum atas sel valid kabupaten (sama dengan fitur M0):

- `t2`: theta hari WIB **e-2**. Hari WIB e-2 berakhir pukul 00.00 WIB hari e-1, jadi seluruhnya lebih dari 24 jam sebelum hari
  sasaran WIB e. e-1 sengaja TIDAK dipakai: tanggal DIBI bisa tertinggal sehari dari mulainya banjir, sehingga tanah hari e-1
  bisa sudah dibasahi hujan penyebab kejadian berlabel e.
- `t_anom`: theta(e-2) dikurangi klimatologi sel itu untuk bulan kalender hari e-2. Klimatologi = rerata theta harian sel itu
  atas SEMUA hari 2016-01-01..2023-12-31 (periode latih saja) pada bulan itu, hanya bila ada >= 100 hari bernilai; kurang dari itu
  sel-bulan dianggap tidak punya klimatologi dan sel gugur untuk baris di bulan itu. Klimatologi dibekukan di `kandidat.json`
  dan dipakai apa adanya di validasi, Uji A, Uji B.
- `t_hx`: log1p(`h3`) x `t_anom`, dengan `h3` = hujan ERA5 e-1..e+1 kabupaten (fitur M0 yang sudah ada). HANYA masuk regresi
  logistik (pohon menangkap interaksi sendiri); bila kelompok terpilih GBDT, `t_hx` tidak aktif. Ditetapkan sekarang, bukan
  dipilih sesudah melihat validasi.

Tidak ada log1p untuk `t2`/`t_anom`; regresi logistik menstandardisasi semua fitur dengan rerata dan simpangan baku latih
seperti HULU. Tidak ada lag lain, tidak ada fitur hulu-tanah, tidak ada ablasi sesudah protokol dibekukan.

**Model** (empat, semua dilatih ulang di percobaan ini pada baris yang SAMA):
- M0 = M0 HULU (fitur model_kab.py tanpa `anteseden`).
- M3 = M3 HULU (M0 + `c1`, `c3`, `c_pers`, `hu1`, `hu3`, `hulu_ada`).
- M0T = M0 + `tanah_ant`; M3T = M3 + `tanah_ant`.

M0 dan M3 di sini memakai resep HULU tetapi dilatih ulang pada baris yang tersisa sesudah pengecualian tanah, jadi angkanya
bisa beda tipis dari kandidat HULU dan BUKAN pengganti kandidat HULU. Kontras hanya dihitung di dalam percobaan ini.

## 4. Pembagian waktu

Sama dengan PRAREG-HULU §4: latih 2016-2023, validasi 2024-2025, Uji A 2026-01-01..2026-09-30 (hanya bisa menolak), celah
Oktober 2026, Uji B 2026-11-01..2027-04-30.

- Karena M3 butuh CHIRPS final, tanggal ikut HULU: `sia` paling cepat **2027-02-15**, `buka` paling cepat **2027-09-15**, dan
  keduanya hanya bila manifest CHIRPS (aturan HULU, kecuali 2025-05) DAN cache tanah lengkap sampai akhir jendela (+2 hari).
- Klimatologi tanah dan batas persentil hanya dari latih.
- Sidik TANAH di-commit SEBELUM `sia` DEBIT dibuka (2026-11-15), yaitu sebelum Uji A siapa pun dinilai. Bila `latih` belum
  selesai sebelum itu, hal itu ditulis di §8 sebagai pelemahan yang diakui, dan penulis tidak membaca hasil `sia` DEBIT sampai
  sidik TANAH di-commit.

## 5. Kriteria

Ukuran sama dengan HULU: dETS berpasangan pada jumlah alarm sama dengan aturan `status.py` (>= Waspada, >= Siaga) dan selisih
Brier skill (dBSS) terhadap klimatologi kab-bulan terkalibrasi. Bootstrap blok dua skema (kabupaten x musim-tahun dan pulau x
minggu), blok identik untuk keempat model, batas bawah = yang lebih kecil dari dua skema, batas atas = yang lebih besar.
**10.000 ulangan**, biji 11 (dinaikkan dari 5.000 karena ekor 0,4% hanya memuat 20 ulangan pada 5.000).

**Keluarga uji dan Bonferroni.** Keluarga Uji A/B model kabupaten-hari kini m = **5** kontras: DEBIT M1-M0, HULU M2-M0,
HULU M3-M2, TANAH M3T-M3, TANAH M0T-M0. Bonferroni murni m = 5 pada alfa dua-sisi 5% memberi selang 99% (satu-sisi 0,5%) per
kontras, tetapi DEBIT sudah beku di 95% (satu-sisi 2,5%) dan HULU di 98,33% (2 x 0,83%), sehingga jumlah satu-sisi menjadi
5,17%. Supaya jumlah tetap <= 5%, TANAH memakai sisa anggaran 5 - (2,5 + 0,83 + 0,83) = 0,84% dibagi dua (0,42%), dibulatkan ke
bawah: **satu-sisi 0,4% per kontras, selang 99,2% tengah (persentil 0,4 dan 99,6)**. Angka HULU di sini 0,83% persis seperti
kodenya (`Q_LO` 0,0083). Total keluarga satu-sisi = 2,5 + 0,83 + 0,83 + 0,4 + 0,4 = 4,96%. Percobaan lain yang memakai Uji A/B ini wajib menambah m dan menuliskannya di protokolnya sendiri sebelum sidik.
(PRAREG-FLOODHUB punya keluarga sendiri pada jendela prospektifnya dan tidak dihitung di sini, sama dengan HULU.)

Pemilihan (sama dengan HULU): kelompok GBDT atau regresi logistik dipilih menurut logloss validasi M0 sesudah Platt lintas
tahun (pasang 2024 nilai 2025 dan sebaliknya, dirata-rata); M3, M0T, M3T memakai kelompok yang sama; hiperparameter GBDT
disetel terpisah per model dengan kisi dan anggaran HULU (`HIPER`, `POHON_MAKS` model_kab.py) memakai biji 1; model akhir 5 biji
(1..5), tiap biji Platt sendiri di seluruh validasi, peluang terkalibrasi dirata-rata.

Daya: `latih` mencatat MDE dETS tiap kontras dari bootstrap validasi untuk 200 kejadian (fungsi `mde_h` HULU), z = persentil
99,6% normal (2,652). MDE dicatat, tidak mengubah kriteria.

Pemeriksaan kesia-siaan (Uji A, `sia`, sekali): per kontras, dETS Waspada titik <= 0 -> kontras itu DIHENTIKAN dengan vonis
"tidak terbukti". Hanya bisa menolak. Penghentian satu kontras tidak menghentikan yang lain. Bila keduanya dihentikan, `buka`
ditolak.

Vonis final per kontras (Uji A + Uji B, `buka`, sekali), selang 99,2%:
- LULUS bila SEMUA: batas bawah dETS Waspada > 0; batas bawah dETS Siaga > 0; batas bawah dBSS > 0.
- TIDAK LULUS bila dETS Waspada titik <= 0 atau batas atasnya < 0.
- TIDAK MEYAKINKAN selain itu.

Kontrol DIBI-saja (kelompok dan hiperparameter terpilih, dilatih ulang dengan y DIBI): "LULUS, PEKA LABEL" bila model gabungan
LULUS tetapi kontrol memberi dETS Waspada titik <= 0 atau batas atas < 0; kontrol tidak pernah menyelamatkan TIDAK LULUS.
"(daya rendah)" bila `mde_80` Waspada > 0,02 dan vonis bukan TIDAK LULUS. Semua aturan ini fungsi HULU yang sama.

Dilaporkan tanpa menjadi gerbang: AUC, logloss, Brier keempat model dan klimatologi; ETS tiap model dan aturan; dETS per pulau;
jumlah baris yang dikeluarkan oleh aturan tanah; sebaran `t_anom` validasi lawan Uji A (kuantil 10/50/90).
Lulus berarti `tanah_ant` boleh dipasang sebagai pelengkap berlabel. Status resmi `status.py` tidak ditimpa.

## 6. Kejujuran dan batas

- **Yang sudah dilihat penulis sebelum menulis ini.** (a) Angka validasi HULU 2024-2025 (`latih.log` sidik 12ff6a89c8e01921):
  27.156 baris, 351 kejadian; AUC M0 0,8068, M2 0,8171, M3 0,8226, klimatologi 0,7115; logloss M0 0,06057, M3 0,05934; M3-M2
  dBSS +0,00209 [-0,00031, +0,00451], dETS Waspada +0,0005 [-0,0009, +0,0021], Siaga +0,0012 [-0,0054, +0,0084]; M2-M0 dBSS
  +0,00369 [+0,00010, +0,00742], dETS Waspada -0,0003, Siaga +0,0062; GBDT terpilih; MDE_80 Waspada 0,0024-0,0032. Pilihan
  "di atas M3" dibuat sesudah melihat bahwa M3 punya logloss validasi terbaik. (b) Ablasi model_kab 2022-2023
  (RISET-MODEL-KAB §8) MEMBUANG kelompok anteseden hujan (`a7`, `a30`, `api*`) dan mempertahankan `sm` ERA5 hari e. Jadi bukti
  awal sudah mengarah ke "anteseden lemah"; harapan penulis untuk HT kecil. (c) Nilai ERA5-Land hanya dari dua uji asap
  2 sel x 2 hari (2020-01-01 dan 02): curl manual sel -6,125/106,875 dan -0,375/109,125 (lapisan 0,43-0,45 m3/m3), lalu mode
  `asap` sel sampel -0,375/100,125 dan -0,375/117,125 (theta 0,40-0,42); tidak ada statistik lain, tidak ada label disilangkan.
- **Validasi 2024-2025 bukan uji**: periode itu sudah dilihat model_kab, ambang_wilayah, uji balik aturan, dan HULU.
- **Kontras bias melawan tanah:** M0 (dan M3) memuat `sm` ERA5 hari e, yang bersamaan dengan hujan hari e dan ikut prakiraan
  sempurna, sedangkan `tanah_ant` hanya boleh melihat e-2; jadi sebagian informasi tanah sudah diberikan ke pembanding dengan
  keuntungan waktu, dan kontras T condong MELAWAN tanah. Vonis yang paling mungkin "TIDAK MEYAKINKAN"; itu bukan bukti bahwa
  tanah tidak berguna.
- **Tumpang tindih dengan M0:** `sm` ERA5 hari e dan theta ERA5-Land e-2 sama-sama digerakkan hujan ERA5 (ERA5-Land adalah
  jalan ulang model darat dengan paksaan ERA5, tanpa asimilasi). Kontras mengukur informasi tambahan resolusi 0,1 derajat,
  lapisan 0-28 cm, lag dua hari, dan normalisasi anomali; TIDAK LULUS tidak berarti tanah tidak penting bagi banjir.
- **Bukan prakiraan operasional:** ERA5-Land terbit ~5 hari terlambat. Lag e-2 memastikan tidak ada informasi hari sasaran,
  tetapi produksi butuh analisis tanah cepat (misalnya IFS) dan uji prospektif sendiri. Fitur hujan M0/M3 tetap prakiraan
  sempurna, jadi keuntungan apa pun adalah batas atas.
- **Titik kisi tunggal per sel 0,25 derajat** (titik darat terdekat ke pusat) tidak mewakili seluruh sel; sel pesisir bisa
  terwakili titik darat tepi.
- **Nilai ekor Uji A/B** diunduh dari Open-Meteo saat tersedia (ERA5-Land awal); revisi sesudahnya tidak diambil (cache
  hanya-tambah). Hash deret jendela Uji A dikunci di `sia.json` dan dicek ulang di `buka`.
- Batas HULU tetap berlaku: label DIBI kurang lapor, label logbook menggembungkan keterampilan mutlak, sampel 39 kabupaten
  dipilih dari yang sering banjir.

## 6a. Tafsir pelaksanaan (ditetapkan sebelum `latih`)

1. Klimatologi dihitung atas hari kalender 2016-01-01..2023-12-31, bukan atas hari sasaran e; bulan = bulan hari e-2.
2. Daftar sel tanah valid per kabupaten dan titik kisinya dibekukan di `kandidat.json`; Uji memakai daftar itu, sel yang null
   pada hari tertentu gugur untuk baris itu saja.
3. `kab_dibuang` HULU (CHIRPS) dan `kab_dibuang_t` (tanah) dicatat terpisah.
4. Kerangka HULU dipakai dengan menunjuk ulang variabel modulnya di proses ini saja (folder keluaran, jejak `.sidik`, selang,
   daftar kontras, transformasi regresi logistik, sidik, kelengkapan); `model_kab_hulu.py` tidak diubah. Penunjukan ulang
   (`pasang()`) hanya dijalankan dari `__main__`; `latih`/`sia`/`buka` menolak jalan bila modul diimpor tanpa itu.
5. Swa-uji `uji` wajib memuat assert pembeda: mengubah theta e-1, e, atau e+1 tidak mengubah fitur; mengubah theta e-2
   mengubahnya; mengubah theta 2024 tidak mengubah klimatologi; mengubah theta 2023 mengubahnya.

## 7. Kode dan sidik

- Berkas `scripts/banjir/model_kab_tanah.py` MENGIMPOR `model_kab_hulu.py` (dan lewat itu `model_kab.py`, `uji_balik.py`) tanpa
  mengubahnya. Mode: `asap` (uji asap jaringan 2 sel x 2 hari, tidak menyentuh cache), `ambil [akhir]` (lanjut dari cache),
  `uji`, `latih [--ulang]`, `sia`, `buka`. Keluaran di `data/raw/banjir/model_kab_tanah/`, bukan public/.
- `latih` membekukan (sidik 16 hex): kriteria, isi kandidat (empat model, kontrol, MDE, klimatologi kab-bulan, klimatologi
  tanah, titik kisi, sel tanah per kabupaten), konstanta, sha256 berkas ini, `model_kab_hulu.py`, `model_kab.py`,
  `uji_balik.py`, `status.py`, `label_bersatu.py`, `umum.py`, `model_kab_debit.py`, `gbdt.py`, `PRAREG-HULU.md`,
  `PRAREG-TANAH.md`, sampel dan basin HULU, `label_latih.json` HULU dan salinannya, salinan DIBI <= 2025, manifest ERA5,
  manifest CHIRPS s/d 2026-01-03, dan manifest tanah (sha256 isi deret s/d 2026-01-03 per sel, jadi tambahan ekor tidak
  mengubahnya). Logbook mentah tidak disidik.
- Jejak `scripts/banjir/model_kab_tanah.sidik` (JSONL hanya-tambah, di-commit). `sia` dan `buka` menolak bila sidik berubah,
  bila baris `latih` terakhir di HEAD tidak cocok, dan masing-masing hanya bisa jalan sekali (penanda `.mulai` ditulis sebelum
  menilai).

## 8. Amandemen

Aturan `latih --ulang`: hanya untuk galat teknis (kode/data rusak), tidak pernah karena angka validasi. Kode mewajibkan argumen
alasan teks (`latih --ulang "<alasan>"`) yang ditulis ke baris `latih` di `model_kab_tanah.sidik`. Tiap ulang dicatat sebagai
amandemen bernomor di bagian ini sebelum `sia`, dengan alasan dan sidik lama/baru. `buka` melaporkan jumlah dan alasan semua
`latih --ulang` dari jejak HEAD di `buka.json`.

Belum ada amandemen.
