# Uji balik status banjir dan longsor terhadap kejadian DIBI

Tanggal: 13 Oktober 2026. Skrip: `scripts/banjir/uji_balik.py`. Ringkasan mesin untuk UI:
`public/banjir/data/validasi.json`. Swauji luring: `python3 scripts/banjir/uji_balik.py uji` (ikut di loop uji
`.github/workflows/banjir.yml`).

## Kesimpulan

1. Aturan sebelum uji balik punya skill **nyata tapi kecil**. Contohnya Siaga banjir hanya mengenai 6% hari banjir
   tercatat, dan 94% hari Siaga tidak punya kejadian tercatat.
2. Dua perubahan lolos uji di periode yang ditahan (2022–2025), dengan selisih di atas derau bootstrap. Keduanya sudah
   diterapkan di `status.py`:
   - **Jendela H3 digeser sehari ke belakang**: hari d = hujan d−1, d, d+1 (dulu d, d+1, d+2). Ini perubahan yang paling
     kokoh: sendirian sudah lolos untuk banjir dan longsor (tabel ablasi). Tanggal DIBI adalah tanggal kejadian/laporan,
     jadi hujan kemarin ikut menentukan.
   - **Ambang H3 diturunkan**: banjir 40/80/120 mm (×0,8), longsor 30/60/90 mm (×0,6). Syarat hujan 7 hari yang menyertai
     sm ≥ 0,45 turun dari 50 ke 25 mm. Ambang sm 0,45 sendiri justru terkonfirmasi: ia terbaik dari 0,40/0,45/0,50.
3. Hasilnya di 2022–2025: ETS rata-rata tiga level naik **+0,0063 (CI95 +0,0033…+0,0095)** untuk banjir dan
   **+0,0105 (+0,0053…+0,0155)** untuk longsor. POD Siaga naik 6%→13% (banjir) dan 4%→15% (longsor). FAR praktis
   tidak berubah. Harganya: status lebih sering muncul. Waspada banjir muncul di 27% kabupaten-hari (dulu 18%),
   Siaga di 3,8% (dulu 1,9%).
4. Skill tetap rendah dalam ukuran mutlak (CSI 0,02–0,04). Status ini penanda "perlu waspada", bukan ramalan
   kejadian, dan UI harus menyebutnya begitu.

## Metode

**Satuan: kabupaten-hari.** DIBI mencatat kejadian per kabupaten per tanggal. Level kabupaten = level kecamatan
tertinggi di kabupaten itu, persis yang dilihat orang di peta. Level tidak turun bila bahaya InaRISK naik, jadi per sel
hujan cukup dinilai kecamatan dengan bahaya tertinggi. Hasilnya identik dengan menilai semua kecamatan.

**Kejadian.** Ada baris DIBI dengan jumlah kejadian ≥ 1 di kabupaten itu pada tanggal itu
(`data/raw/banjir/dibi_tanggal.json`). Banjir = jenis banjir, banjir dan longsor, atau bandang. Longsor = jenis longsor,
gerakan tanah, atau banjir dan longsor. **Semua hari dihitung**, tidak memakai hari tanpa kejadian yang dicocokkan:
pencocokan mengubah laju dasar sehingga FAR dan PSS kehilangan makna. Laju dasar di periode uji: banjir 1,7%
kabupaten-hari, longsor 1,4%.

**Hujan sebagai prakiraan sempurna.** Dipakai ERA5 dari Open-Meteo archive (`models=era5`, 0,25°, kisi yang sama
dengan `hujan.json`), sel terdekat tiap kecamatan seperti `status.py`, dengan variabel berikut:
- `precipitation_sum` harian (zona Asia/Jakarta), untuk H3 dan A7;
- `precipitation` per jam, yang maksimum hariannya menjadi I;
- `soil_moisture_7_to_28cm_mean` sebagai pengganti sm 3–27 cm. ERA5 dan IFS memakai model tanah yang sama
  (HTESSEL).

Level hari e = aturan `status.py` untuk d = 0. Jalur sungai (GloFAS) dan ansambel (P3) **tidak diuji**: hanya 14 dari
192 titik sungai yang punya ambang, semuanya di Papua, dan ansambel historis tidak tersedia. Jalur CAPE tidak menambah
apa pun di atas H3.

**Sampel.** Ada 42 kabupaten dan 104 sel, dipilih per kelompok pulau dengan anggaran sel. Urutannya menurut jumlah hari
kejadian 2016–2025, dan kabupaten yang mencakup lebih dari 8 sel dilewati (`pilih()`).

| Kelompok | Kabupaten |
| --- | --- |
| Jawa | 17 |
| Sumatra | 7 |
| Kalimantan | 6 |
| Bali-Nusa Tenggara | 5 |
| Sulawesi | 4 |
| Maluku-Papua | 3 |

Sampel condong ke kota dan kabupaten kecil yang sering mencatat kejadian.

**Skor per level** (≥ Waspada, ≥ Siaga, Awas), masing-masing sebagai ramalan ya/tidak:
- POD = a/(a+c)
- FAR = b/(a+b)
- CSI = a/(a+b+c)
- PSS (Peirce) = POD − b/(b+d)
- ETS = (a−aᵣ)/(a+b+c−aᵣ), dengan aᵣ = (a+b)(a+c)/n

**CI 95%** dari bootstrap blok (kabupaten × tahun), 1.000 ulangan, karena kejadian bergerombol per musim.

**Latih/uji.** Kisi alternatifnya: k ∈ {0,6; 0,8; 1,0; 1,2} × geser ∈ {0, −1, −2}. Untuk longsor ditambah
sm_jenuh ∈ {0,40; 0,45; 0,50} × a7_basah ∈ {25, 50, 100}, jadi 12 kombinasi banjir dan 108 longsor. Pemilihan memakai
rata-rata ETS tiga level di **2016–2021** saja. Kombinasi terbaik lalu dinilai di **2022–2025** dan baru diterima bila
CI95 selisih ETS berpasangan (blok yang sama untuk kedua aturan) seluruhnya di atas 0. Longsor 2024 dibuang karena DIBI
2024 hanya mencatat 219 longsor, sedangkan tahun lain 600–1.300.

## Hasil, periode uji 2022–2025 (42 kabupaten; 61.362 kabupaten-hari banjir, 45.990 longsor)

Angka di kolom skor adalah nilai dengan CI95 dalam kurung. Kolom "laju" = porsi kabupaten-hari yang berstatus
setinggi itu.

| Bahaya | Aturan | Level | POD | FAR | CSI | PSS | ETS | Laju |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| banjir | sebelum | ≥ waspada | 0.389 (0.335–0.442) | 0.962 (0.955–0.969) | 0.036 (0.030–0.042) | 0.214 (0.169–0.259) | 0.020 (0.015–0.024) | 17.9% |
| banjir | sebelum | ≥ siaga | 0.061 (0.043–0.080) | 0.943 (0.929–0.956) | 0.030 (0.023–0.038) | 0.043 (0.027–0.060) | 0.021 (0.014–0.029) | 1.9% |
| banjir | sebelum | awas | 0.018 (0.010–0.027) | 0.932 (0.906–0.959) | 0.014 (0.008–0.021) | 0.014 (0.006–0.022) | 0.011 (0.005–0.017) | 0.5% |
| banjir | **berlaku** | ≥ waspada | 0.565 (0.510–0.619) | 0.964 (0.957–0.969) | 0.035 (0.030–0.042) | 0.301 (0.251–0.345) | 0.019 (0.015–0.023) | 27.0% |
| banjir | **berlaku** | ≥ siaga | 0.132 (0.102–0.166) | 0.939 (0.927–0.952) | 0.043 (0.034–0.052) | 0.096 (0.068–0.126) | 0.031 (0.023–0.039) | 3.8% |
| banjir | **berlaku** | awas | 0.038 (0.026–0.054) | 0.924 (0.900–0.944) | 0.026 (0.018–0.034) | 0.030 (0.018–0.043) | 0.020 (0.013–0.028) | 0.9% |
| longsor | sebelum | ≥ waspada | 0.257 (0.198–0.332) | 0.976 (0.967–0.984) | 0.022 (0.016–0.030) | 0.106 (0.052–0.174) | 0.009 (0.004–0.015) | 15.2% |
| longsor | sebelum | ≥ siaga | 0.038 (0.020–0.062) | 0.945 (0.916–0.969) | 0.023 (0.013–0.035) | 0.029 (0.012–0.052) | 0.017 (0.007–0.029) | 1.0% |
| longsor | sebelum | awas | 0.003 (0.000–0.011) | 0.955 (0.846–1.000) | 0.003 (0.000–0.010) | 0.002 (−0.001–0.010) | 0.002 (−0.001–0.009) | 0.1% |
| longsor | **berlaku** | ≥ waspada | 0.543 (0.464–0.622) | 0.976 (0.967–0.984) | 0.024 (0.016–0.032) | 0.224 (0.151–0.297) | 0.010 (0.006–0.015) | 32.2% |
| longsor | **berlaku** | ≥ siaga | 0.151 (0.103–0.212) | 0.954 (0.937–0.970) | 0.037 (0.024–0.049) | 0.107 (0.064–0.164) | 0.026 (0.015–0.036) | 4.6% |
| longsor | **berlaku** | awas | 0.046 (0.025–0.073) | 0.923 (0.890–0.954) | 0.030 (0.017–0.043) | 0.038 (0.020–0.063) | 0.024 (0.013–0.037) | 0.8% |

Yang dimaksud:
- **sebelum** = ambang 50/100/150 mm, jendela d..d+2, A7 ≥ 50 mm bersama sm.
- **berlaku** = banjir k 0,8 (40/80/120 mm) dengan geser −1; longsor k 0,6 (30/60/90 mm) dengan geser −1, sm 0,45, dan
  A7 ≥ 25 mm.

ETS rata-rata di periode latih 2016–2021:

| Bahaya | Sebelum | Berlaku |
| --- | --- | --- |
| Banjir | 0,0162 | 0,0230 |
| Longsor | 0,0173 | 0,0311 |

### Ablasi di periode uji (selisih ETS rata-rata terhadap aturan sebelum, CI95)

| Perubahan | Banjir | Longsor |
| --- | --- | --- |
| geser −1 saja | +0,0054 (+0,0024…+0,0092) | +0,0029 (+0,0006…+0,0052) |
| ambang ×k saja (k 0,8 / 0,6) | +0,0010 (−0,0008…+0,0029), **tidak lolos** | +0,0052 (+0,0016…+0,0088) |
| geser −1 + ambang | +0,0063 (+0,0033…+0,0095) | +0,0100 (+0,0049…+0,0149) |
| + A7 ≥ 25 (longsor) | – | +0,0105 (+0,0053…+0,0155) |

Untuk banjir, gain hampir seluruhnya berasal dari pergeseran jendela; penurunan ambang ke 40/80/120 sendirian berada di
dalam derau. Paket tetap diterapkan utuh karena itulah yang dipilih di periode latih (aturan main ditetapkan sebelum
melihat periode uji), tetapi bila status Waspada banjir dinilai terlalu sering muncul, mengembalikan k banjir ke 1,0
dengan tetap memakai geser −1 juga didukung data (+0,0054). A7 25 vs 50 mm untuk longsor praktis seri (latih 0,0311 vs
0,0308; uji +0,0105 vs +0,0100), sehingga perubahan ini tidak berdasar kuat.

### Per kelompok pulau (aturan berlaku, periode uji)

| Kelompok | Banjir ≥ Waspada POD / FAR / PSS (CI) | Banjir ≥ Siaga POD / FAR / PSS (CI) | Longsor ≥ Waspada PSS (CI) | Longsor ≥ Siaga PSS (CI) |
| --- | --- | --- | --- | --- |
| Jawa (17) | 0,50 / 0,96 / 0,30 (0,22–0,38) | 0,14 / 0,92 / 0,11 (0,07–0,17) | 0,32 (0,24–0,40) | 0,13 (0,07–0,19) |
| Sumatra (7) | 0,56 / 0,97 / 0,24 (0,18–0,33) | 0,15 / 0,96 / 0,09 (0,03–0,19) | 0,32 (0,20–0,59) | 0,01 (−0,05–0,23) |
| Sulawesi (4) | 0,77 / 0,97 / 0,25 (0,16–0,34) | 0,23 / 0,93 / 0,16 (0,08–0,22) | 0,26 (0,15–0,37) | 0,50 (0,18–0,89) |
| Kalimantan (6) | 0,43 / 0,97 / 0,23 (0,12–0,35) | 0,04 / 0,95 / 0,03 (−0,01–0,06) | 0,11 (−0,05–0,25) | 0,00 (−0,02–0,05) |
| Bali-Nusa Tenggara (5) | 0,71 / 0,96 / 0,46 (0,36–0,58) | 0,06 / 0,97 / 0,03 (−0,01–0,09) | 0,19 (0,06–0,38) | −0,01 (−0,02–−0,01) |
| Maluku-Papua (3) | 0,63 / 0,97 / 0,35 (0,22–0,46) | 0,14 / 0,94 / 0,11 (0,03–0,21) | 0,26 (−0,11–0,54) | 0,07 (−0,04–0,23) |

Aturan sebelum, ETS ≥ Waspada / ≥ Siaga per pulau untuk pembanding:

| Kelompok | Banjir | Longsor |
| --- | --- | --- |
| Jawa | 0,028 / 0,032 | 0,029 / 0,022 |
| Sumatra | 0,008 / 0,013 | 0,002 / 0,007 |
| Sulawesi | 0,016 / 0,021 | 0,004 / 0,022 |
| Kalimantan | 0,011 / −0,003 | 0,002 / −0,001 |
| Bali-NT | 0,024 / 0,006 | 0,006 / −0,001 |
| Maluku-Papua | 0,017 / 0,028 | 0,009 / −0,003 |

Lima catatan per wilayah:
- Siaga banjir tidak punya skill yang terbukti di Kalimantan dan Bali-NT, karena CI PSS memuat 0. Banjir Kalimantan
  lebih banyak didorong sungai besar dan pasang daripada hujan lokal 3 hari, dan jalur sungai GloFAS di sana belum
  punya ambang.
- Siaga longsor hanya terbukti di Jawa dan Sulawesi. Di Bali-NT ia sedikit **negatif** (75 hari Siaga, 0 kena).
- Jawa membawa sebagian besar bukti, karena paling banyak kejadian dan kabupatennya paling banyak.
- Kelompok dengan 3–5 kabupaten punya CI lebar. Jangan membuat ambang per pulau dari data ini.
- Sel pesisir (mis. −8,875/115,125 di Badung) punya sm ERA5 dan IFS ~0,05 sepanjang tahun, karena sebagian besar
  selnya laut. Jalur JENUH tidak pernah aktif di sana. Ini juga terjadi di status harian.

## Keterbatasan

- **Prakiraan sempurna.** ERA5 adalah analisis ulang, bukan prakiraan 0–3 hari. Skill operasional lebih rendah, dan
  makin rendah untuk d = 2–3. Ambang dipilih pada skala hujan ERA5. Bila prakiraan IFS lebih basah daripada ERA5,
  status akan muncul lebih sering daripada laju di tabel ini. Langkah berikut: arsipkan `hujan.json` harian lalu uji
  ulang dengan prakiraan asli.
- **DIBI kurang mencatat** kejadian kecil, dan tanggalnya bisa tanggal laporan. FAR 0,92–0,98 sebagian adalah
  artefak pencatatan, jadi angka mutlaknya pesimistis. Perbandingan antaraturan tetap sah karena keduanya dinilai
  terhadap catatan yang sama. Pencatatan DIBI naik dari tahun ke tahun (2025: 2.938 hari banjir, 2016: 823),
  sehingga laju dasar periode uji lebih tinggi daripada periode latih.
- **Satuan kabupaten.** Level kabupaten = kecamatan tertinggi, sehingga kabupaten besar lebih sering berstatus. Ini
  memang yang ditampilkan peta, tetapi skor per kecamatan tidak bisa diukur karena DIBI tidak mencatat kecamatan.
- **Jalur yang tidak diuji:** sungai GloFAS (hanya 14 titik berambang), P3 ansambel, dan rob.
- **Batas kisi.** Untuk longsor, k terbaik (0,6) ada di tepi kisi. Uji di luar kisi pada periode latih saja memberi
  ETS 0,0319 untuk k 0,5 dan 0,0318 untuk k 0,4, sedangkan k 0,6 memberi 0,0311. Itu belum dipakai, karena kisinya
  ditetapkan sebelum melihat hasil dan selisihnya kecil. Jalankan ulang dengan kisi yang diperluas bila ingin
  menurunkan lagi.
- **Sampel 42 kabupaten**, condong ke kota. Tidak ada kabupaten Papua daratan karena sedikit kejadian tercatat.
- **sm 7–28 cm ERA5** dipakai untuk menggantikan sm 3–27 cm IFS. Lapisan 0–7 cm tidak diambil supaya bobot kuota
  tetap 3 variabel.

## Kuota dan jalan ulang

- **Bobot kuota.** Bobot archive Open-Meteo = var/10 × hari/14 per lokasi, yaitu 3 variabel × 3.666 hari ≈ 79 per sel
  dan ~8.200 untuk seluruh sampel. Batas 5.000 per jam tercapai sekali di sel ke-60. Skrip menunggu 20 menit lalu
  melanjutkan.
- **Lama jalan pertama** ~2,5 jam, dengan 5 sel per panggilan dan jeda 330 detik.
- **Cache.** Respons mentah per sel disimpan gzip di `data/raw/banjir/uji_balik/` (≈ 28 MB, tidak di-commit). Jalan
  ulang tanpa unduhan selesai < 1 menit.
- **Sampel baru.** Bila sampel berubah (dibi_tanggal.json baru), hanya sel baru yang diunduh.
- **Pembanding otomatis.** `BERLAKU` di uji_balik.py dibaca dari konstanta `status.py`, dan `SEBELUM` menyimpan aturan
  lama. Tiap jalan ulang selalu membandingkan keduanya dan melaporkan bila ada usul baru yang melampaui derau.

## Waktu-tunda (d0 vs d1..d3) dan catatan prospektif (18 Okt 2026)

- **Uji balik per waktu-tunda tidak bisa dihitung dari data mentah yang ada.** Hujan ERA5 adalah "prakiraan sempurna":
  status hari d memakai hujan d-1..d+1 yang sama di semua waktu-tunda, jadi d0, d1, d2, d3 identik menurut
  konstruksi. Skill nyata menurun untuk d1..d3 (galat prakiraan membesar), dan angka di `validasi.json` adalah batas atas
  untuk semuanya. Layar menulis ini di baris "Sumber" kartu "Seberapa tepat status ini".
- **Cara mengukurnya:** `prospektif.py` mencatat tiap hari level kabupaten-hari (dan peluang Siaga) untuk hari ke-0..3
  (`prospektif.json`, append-only). Saat DIBI terbit untuk tanggal sasaran, `python3 scripts/banjir/prospektif.py nilai`
  menghitung POD/FAR/CSI >= Siaga per waktu-tunda dari prakiraan yang benar-benar terbit. Alternatif tanpa menunggu:
  Open-Meteo previous-runs API (panggilan besar; belum dijalankan, kuota dibagi).
- **Peluang (prakiraan72.json) belum diuji balik, dan dari `prospektif.json` pun BELUM bisa dikalibrasi.** Peluang jalur
  hujan dari 51 anggota ECMWF memakai ambang H3 yang sama dengan `status.py` (disapu pada uji), tetapi `prospektif.json`
  hanya mencatat kabupaten berstatus atau berpeluang Siaga >= 10%; tanpa peluang kabupaten lain (batas bawah 10%) kurva
  kalibrasi (apakah 30% berarti 30%) tidak bisa dihitung. Yang bisa dinilai hanya status deterministik per waktu-tunda.
  Kalibrasi baru mungkin bila pencatatan diubah memuat peluang semua kabupaten (berkas jauh lebih besar). Titik ansambel
  mewakili kotak 1 derajat, bukan sel kecamatan; ansambel cenderung meratakan ekstrem lokal.
- **Jendela peluang adalah hari status, bukan jam.** "Hari pertama / sampai hari kedua / sampai hari ketiga": H3 hari ke-0
  memuat hujan kemarin dan hari status mengikuti tanggal WIB `hujan.json`, jadi bukan 24/48/72 jam sejak waktu terbit.
- **Penilaian prospektif** memakai tanggal sasaran sampai (tanggal DIBI terakhir - 14 hari): kejadian DIBI dilaporkan
  menyusul, jadi tanggal terakhirnya belum lengkap dan akan membuat FAR tampak lebih buruk.
- **Rob** memiliki validasinya sendiri (rob.json `validasi`, p95: 19 dari 26 kejadian DIBI tertangkap dengan selisih sampai
  1 hari, 17 dari 26 pada hari yang sama, FAR 0,98; sampel kecil, ambang dari data yang sama = dalam sampel) dan ditampilkan
  terpisah dari status banjir.
- **Desa** tidak ada: repo hanya memuat batas sampai kecamatan (`public/geo/kecamatan`), jadi prakiraan berhenti di kecamatan.
