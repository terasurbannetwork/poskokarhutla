# ALGORITMA: Paritas Bencana

Tunduk pada `KEPUTUSAN-PARITAS.md`. Alur di `ALUR.md`. Dokumen ini memuat rumus dan aturan yang dipakai tiket PB-*. Prinsip: pakai ambang dan rumus yang sudah ada di kode; rumus baru hanya bila kode belum punya, dan tiap angka menyebut asalnya. Angka dari ingatan atau naskah yang belum dibaca bertanda [perlu cek] dan tidak ditayangkan (Q9). Label sumber: [kode] = ada di repo, [dok] = dokumen repo, [perlu cek] = belum dicek ke penerbit.

## 1. Pola bersama

### 1.1 Tingkat

Semua bencana memakai tiga tingkat yang sama dengan `TINGKAT` di `public/ews_tindakan.js`: 1 Waspada, 2 Siaga, 3 Awas. Tingkat 0 berarti tidak ada peringatan. Bencana yang sumbernya punya tangga sendiri dipetakan, tidak diubah labelnya: label resmi sumber tetap tampil di samping label tingkat (pola `tangga.py`: label resmi tidak diubah).

### 1.2 Satu entri tertinggi per bencana per hari

Aturan dari `src/ews.js` (bagian pemadatan, `peta`): per kunci (bencana, hari) yang tersisa hanya tingkat tertinggi; seri dimenangkan entri bersumber model (`sumber_jenis`). Aturan ini dipertahankan untuk jenis baru.

### 1.3 Kunci dedupe

Format `jenis:wilayah_atau_objek:tingkat` (pola `gempa:${kode}:${tingkat}` di `src/peringatan.js`). Peringatan terkirim sekali per kunci; kenaikan tingkat membuat kunci baru. Turun tingkat tidak mengirim apa pun, hanya menurunkan tampilan. Contoh jenis baru: `gunungapi:<id gunung>:siaga`, `udara:<kab>:<tanggal>:siaga`, `kekeringan:<kab>:<dasarian>:waspada`.

### 1.4 Kesegaran

Tiap sumber punya umur maksimum. Sumber melewati batas dinyatakan basi; layar menulis "data belum diperbarui" dan tidak pernah menulis "aman". Ambang yang sudah ada [kode]:

| Sumber | Batas basi | Asal |
| --- | --- | --- |
| titik panas FIRMS | 9 jam | `sumberBasi` di `src/ews.js` |
| nowcast cuaca BMKG | 24 jam | `sumberBasi` |
| status banjir dan rob | tidak memuat hari ini | `sumberBasi` |
| FWI | tidak memuat kemarin atau hari ini | `sumberBasi` |
| simulasi jejak api | 36 jam | `SIM_UMUR` |
| gempa untuk email | 2 jam | `GEMPA_UMUR_MAKS` |
| pernyataan jam | 4 jam; harian 48 jam; iklim 14 hari; musim 240 hari; SPI 45 hari | `BASI_JAM`, `BASI_SPI_HARI` di `scripts/prediksi/tangga.py` |

Batas baru untuk jenis baru ada di bagian 7.

## 2. Tangga tindakan per tingkat peringatan per bencana (F-14, F-15, F-17)

### 2.1 Struktur satu butir tangga

Satu butir = (bencana, tingkat, tindakan, pelaksana, batas_waktu, dasar). `tindakan` memakai kalimat yang sudah ada di `public/ews_tindakan.js` untuk warga; butir untuk petugas ditulis di berkas baru `public/inti/tangga_tugas.js` (usulan nama), terpisah dari kalimat warga karena pembaca berbeda. `pelaksana` salah satu dari warga, bpbd, pusdalops, pimpinan. `dasar` menunjuk sumber resmi atau berkas repo; butir tanpa dasar tidak dibuat.

Fungsi pilih: `tindakanUntuk(bencana, t)` yang sudah ada dipakai ulang (tingkat tertinggi yang ada dan kurang dari atau sama dengan t, selain itu yang terendah). Fungsi sejenis `tugasUntuk(bencana, t, peran)` baru, mengembalikan butir untuk peran itu.

### 2.2 Batas waktu

Batas waktu adalah target tindak lanjut sistem (kapan checklist dianggap telat), bukan ketentuan hukum. Angka resmi dari naskah penerbit [perlu cek] belum dipakai (Q9).

| Tingkat | Konfirmasi oleh Pusdalops | Tindakan awal selesai | Sumber angka |
| --- | --- | --- | --- |
| 3 Awas | 30 menit | 2 jam | BAWAAN SEMENTARA, usulan Q20 |
| 2 Siaga | 3 jam | 12 jam | BAWAAN SEMENTARA, usulan Q20 |
| 1 Waspada | 24 jam | 48 jam | BAWAAN SEMENTARA, usulan Q20 |

Butir yang lewat batas ditandai "telat" di meja Pusdalops dan ikut ke ubin ringkasan dashboard. Telat tidak menghentikan apa pun; ia hanya terlihat. Kegagalan sumber dibedakan dari keterlambatan: bila sumber basi, hitung mundur dihentikan dan butir ditandai "menunggu data".

### 2.3 Pemicu per bencana

Tingkat yang diberikan sumber dipetakan tanpa mengubah angkanya. Kolom "status" menyatakan apakah aturannya sudah ada di kode.

| Bencana | Pemicu dari sumber resmi atau model | Pemetaan ke tingkat | Pelaksana utama | Status |
| --- | --- | --- | --- | --- |
| Karhutla (acuan) | FWI sel terdekat: FWI di atas atau sama dengan 7 (Tinggi) dan di bawah 14; 14 ke atas (Sangat Tinggi); titik panas FIRMS 24 jam terakhir; api baru Himawari; simulasi jejak | FWI tinggi = 1, sangat tinggi = 2; titik panas dalam 5 km = 3, dalam 15 km = 2; simulasi: sel dalam 2 km dengan p 0,50 ke atas = 3, dalam 5 km dengan p 0,20 ke atas = 2 | warga, Manggala Agni, BPBD | ada [kode] `src/ews.js` |
| Banjir | status kecamatan hari d dari `scripts/banjir/status.py`: kelas sungai terhadap Q2, Q5, Q23; peluang ansambel jumlah 3 hari 100 mm ke atas; tanah jenuh (kelembapan 0,45 m3/m3 ke atas dan hujan 7 hari 25 mm ke atas) | Normal 0, Waspada 1, Siaga 2, Awas 3 sama dengan `STATUS` | warga, BPBD | ada [kode] |
| Rob | titik pesisir terdekat dalam 10 km, level prakiraan pasang harian | level dipotong ke 1 sampai 3 | warga, BPBD | ada [kode] |
| Longsor | status longsor kecamatan (kunci `l` di `status.json`), dasar hujan kumulatif dan kerentanan lereng | langsung 1 sampai 3 | warga, BPBD | ada [kode]; berpil hipotesis sampai uji balik lolos (D6, bagian 2.5) |
| Cuaca ekstrem | poligon nowcast BMKG yang memuat titik, aktif sekarang atau mulai dalam 24 jam | CAP severity: Moderate = 2, Severe dan Extreme = 3, lainnya = 1 | warga, BPBD | ada [kode] |
| Gempa | magnitudo dan jarak: radius terasa per magnitudo (M 7 ke atas 500 km, M 6 300 km, M 5 150 km, M 4 50 km); M 6 ke atas dan jarak kurang dari atau sama dengan radius dibagi 3 = Awas | tingkat 2 di dalam radius, 3 bila dekat dan M 6 ke atas; di sisi peringatan terpadu: M 6 ke atas dan kedalaman dangkal = Siaga, M 5 ke atas atau MMI 4 ke atas = Waspada | warga, BPBD, SAR | ada [kode] `radiusGempa`, `nilaiGempa`, `tingkatGempa` |
| Tsunami | kolom `potensi` InaTEWS berpotensi tsunami dan jarak kurang dari atau sama dengan 500 km | tingkat 3; tsunami tidak punya tingkat 1 | warga, BPBD, SAR | ada [kode] |
| Gunung api | level PVMBG per gunung dari `scripts/gunungapi/riwayat_level.py`: Normal, Waspada, Siaga, Awas | Waspada 1, Siaga 2, Awas 3 (sama dengan level PVMBG); Normal tidak memicu; **[BAWAAN SEMENTARA, Q37]** hanya kenaikan level yang membuat peringatan baru | warga, BPBD, PVMBG | baru: aturan EWS dan CAP, jenis `gunungapi` |
| Kualitas udara | PM2,5 rata-rata 24 jam kategori ISPU: batas atas Baik 15,5; Sedang 55,4; Tidak sehat 150,4; Sangat tidak sehat 250,4 µg/m3 | **[BAWAAN SEMENTARA, Q37]** Tidak sehat = 1, Sangat tidak sehat = 2, Berbahaya = 3 | warga, BPBD, dinas kesehatan | baru: aturan EWS dan CAP, jenis `udara`; batas ada di `scripts/udara/kualitas.py` `BATAS` |
| Kekeringan | `lv` kabupaten dari `kekeringan_wilayah.json` (SPI-3 dan kelembapan tanah) | langsung 1 sampai 3 | warga, BPBD | baru; berpil hipotesis sampai uji balik lolos |
| Pesisir | gelombang tinggi per perairan BMKG diteruskan dengan label BMKG; abrasi dari transek kritis `scripts/pesisir/abrasi.py` hanya tampil sebagai kartu, tidak sebagai peringatan | tingkat mengikuti label BMKG; ambang angka gelombang [perlu cek], tidak dipakai (Q9) | warga, BPBD, nelayan | baru; hanya diteruskan, tanpa hitungan sendiri |

Aturan tegas: sumber resmi dipakai langsung dan label sumbernya tampil; hitungan sendiri berlabel "Deteksi Centurisk97" (`DETEKSI` di `src/peringatan.js`) dan tidak diberi nama BMKG atau PVMBG.

### 2.4 Isi tangga tindakan per bencana yang baru

Rujukan isi untuk kamus baru di `public/ews_tindakan.js` (`gunungapi`, `udara`, `kekeringan`, `pesisir`). Kalimat final ditulis oleh pengerja dari rekomendasi resmi; yang di bawah hanya kerangka, bukan teks tayang.

| Bencana | Tingkat 1 | Tingkat 2 | Tingkat 3 | Dasar isi |
| --- | --- | --- | --- | --- |
| Gunung api | kenali jalur evakuasi dan barak; pantau MAGMA | siapkan tas siaga; patuhi radius yang direkomendasikan PVMBG untuk level itu | evakuasi ke barak; jangan masuk radius | rekomendasi PVMBG per level, rincian radius per gunung dibaca dari `scripts/gunungapi/risiko.py` dan MAGMA, bukan diketik tangan |
| Udara | kurangi kegiatan luar ruang bagi rentan, masker | sekolah kurangi kegiatan luar ruang, masker N95 atau KN95, ruang udara bersih | tetap di dalam ruangan, hindari kegiatan fisik di luar, cari layanan kesehatan bila sesak | `aturan.json` id `asap`, kategori ISPU P.14/2020 |
| Kekeringan | hemat air, periksa sumber air | tentukan titik distribusi air, jadwal tangki | air bersih darurat, pangan, peringatan puso | status penetapan kepala daerah menjadi dasar resmi |
| Pesisir | tambatkan perahu, pantau gelombang | nelayan kecil tunda melaut | jauhi pantai, evakuasi permukiman tepi laut | label BMKG per perairan |

### 2.5 Aturan hipotesis

1. Peringatan bersumber model yang belum lolos uji balik membawa `sumber_jenis = "hipotesis"` dan pil "hipotesis" di layar.
2. Peringatan hipotesis tampil di layar dan Pantau Dalops, tidak masuk email, push, atau CAP (Q17 bawaan).
3. Uji balik lolos berarti: model mengalahkan baseline persistensi dan klimatologi pada skor Brier atau setara dengan n tidak kurang dari 30 (`N_MIN` di `scripts/prediksi/nilai.py`); vonis "mengalahkan baseline" di sana dipakai apa adanya.
4. Hipotesis dilepas oleh pengerja pemilik model setelah `validasi-model` memeriksa, tidak oleh tiket layar.

## 3. Kebutuhan logistik per bencana (Q6)

### 3.1 Rumus dasar

Dipakai ulang dari `scripts/prediksi/terbit.py` fungsi `kebutuhan` dan `scripts/prediksi/aturan.json` bagian `sphere` [kode]:

```
mengungsi  = round(jiwa_terpapar x laju_ungsi)
air_l      = mengungsi x 15            (liter per hari)
hunian_m2  = round(mengungsi x 3,5)
jamban     = ceil(mengungsi / 20)
kkal       = mengungsi x 2100          (kkal per hari)
```

`laju_ungsi` = jumlah mengungsi dibagi jumlah terdampak pada kejadian DIBI berjenis sama (fungsi `laju_ungsi`); jenis DIBI per aturan ada di `aturan.json` `mengungsi.jenis_dibi`. Nilai Sphere: Sphere Handbook 2018 sebagaimana tertulis di `aturan.json`. Uji: `kebutuhan(41, sp) == {"mengungsi": 41, "air_l": 615, "hunian_m2": 144, "jamban": 3, "kkal": 86100}` sudah ada di `terbit.py`.

### 3.2 Koefisien menurut jenis

Hanya koefisien yang bersumber yang dipakai. Sisanya tampil tanpa angka dengan teks "koefisien belum bersumber" (Q6 bawaan).

| Bencana | Jiwa terpapar | Laju mengungsi | Koefisien rupiah | Status |
| --- | --- | --- | --- | --- |
| Banjir | jiwa di zona bahaya banjir tinggi InaRISK (`paparan_kab.json`) | DIBI: Banjir, Banjir Bandang, Banjir Genangan, Banjir dan Tanah Longsor | harga pangan dari `scripts/umum/harga_pangan.py` (PIHPS); bangunan dari IHPB atau IKK BPS bila sumbernya dipasang | rumus ada; rupiah menunggu sumber |
| Longsor | seluruh penduduk kecamatan berindeks bahaya longsor tinggi (batas atas, tertulis demikian) | DIBI: Tanah Longsor, Gerakan Tanah, Banjir dan Tanah Longsor | sama | sama |
| Karhutla | `kebutuhan.py`: terdampak = penduduk kecamatan berkompleks tingkat 2 ke atas dikali proporsi | tidak memakai laju mengungsi | tabel `TARIF` dan `KOEF` di `scripts/bnpb/kebutuhan.py` (heli per jam, uang harian SBM 2026, masker 2 per orang), sebagian bertanda asumsi kerja | ada, label "perkiraan, belum diuji balik" |
| Udara | penduduk kab pada hari PM2,5 di atas 55,4 (`dampak_udara.py`) | tidak ada (tidak mengungsi) | masker 2 per orang dari `KOEF.masker_per_orang` (asumsi platform); harga masker `TARIF.harga_masker` | pakai koefisien karhutla; ditandai asumsi |
| Gempa | tidak ada paparan statis per kab; skenario guncangan di `public/gempa/` | belum ada laju dari DIBI untuk gempa di `aturan.json` | tidak ada | tanpa angka sampai laju DIBI dipasang dan diuji |
| Cuaca, gunung api, kekeringan, pesisir | belum ada aturan di `aturan.json` | tidak ada | tidak ada | tanpa angka; kolom kebutuhan menampilkan "belum bersumber" |

Aturan penambahan: koefisien baru masuk hanya dengan tiga isian (nilai, satuan, sumber) di berkas tarif, seperti pola `TARIF` di `kebutuhan.py`. Nilai tanpa sumber ditolak oleh uji yang membaca berkas tarif. Rentang rendah dan tinggi dipakai bila sumbernya berupa rentang (pola `jam_heli_per_api`).

Rupiah total hanya dijumlah dalam satu jenis dan satu sumber koefisien; angka antarsumber tidak dijumlah. Komponen tanpa data bernilai null, bukan 0 (pola `MIN_KOMPLEKS` di `kebutuhan.py`).

## 4. Prioritas wilayah (F-23)

Padanan A14 gunung api (`scripts/gunungapi/risiko.py`). Aturan satu rumus dengan komponen yang selalu ada di data repo.

```
skor_prioritas(wilayah, jenis) = 0,4 x bahaya + 0,3 x paparan + 0,2 x kerentanan + 0,1 x tren_peringatan
```

Semua komponen dinormalkan ke 0 sampai 1 dengan peringkat persentil di antara wilayah yang dinilai pada jenis itu (bukan min-max, agar pencilan tidak menekan sisanya). Bobot adalah HIPOTESIS dan hidup di satu berkas bobot (pola `scripts/operasi/bobot_renlap.json`), diberi label di layar, dan diubah hanya setelah uji.

| Komponen | Sumber | Aturan kosong |
| --- | --- | --- |
| bahaya | indeks bahaya InaRISK per kecamatan dari `paparan_kab.json`, ambang tinggi 0,666 yang sama dengan `aturan.json` | tidak dinilai, wilayah keluar dari peringkat |
| paparan | jiwa terpapar dari bagian 3.2 | tidak dinilai |
| kerentanan | proporsi kelompok rentan WorldPop bila datanya dipasang (data publik No 14) | komponen dilewati dan bobot dibagi ulang ke tiga yang lain |
| tren_peringatan | jumlah hari berstatus Waspada ke atas dalam 30 hari terakhir dibagi 30 | 0 bila sumber basi, dan dicatat basi |

Wilayah dengan dua komponen atau lebih kosong tidak diberi skor; layar menulis "belum cukup data". Keluaran: peringkat dengan skor, komponen, dan label hipotesis. Peringkat tidak dipakai untuk membagi anggaran; ia hanya urutan tinjauan.

## 5. Prospektif dan kasus historis (W6)

### 5.1 Penilaian prospektif (F-25, B03)

Dipakai ulang [kode] dari `scripts/prediksi/`:

1. Prakiraan +1 sampai +3 hari dibekukan append-only sebelum kejadian (`catat.py`).
2. Pengamatan menyusul: HJN sementara dari analisis model sampai H+5 dan final dari ERA5 sejak H+6 (`FINAL_HARI = 6`); label banjir dan longsor dari DIBI hanya untuk sasaran paling lambat tanggal DIBI dikurangi 14 hari (`MARGIN_DIBI`), karena DIBI terisi susulan.
3. Baseline wajib: persistensi (kejadian pada t-1) dan klimatologi (frekuensi bulan kalender yang sama, per kab bila sedikitnya 10 hari teramati, selain itu nasional; `KLIM_MIN = 10`).
4. Vonis: n di bawah 30 = "belum teruji"; Brier model lebih kecil dari kedua baseline = "mengalahkan baseline"; selain itu "belum mengalahkan baseline".

Perluasan di paket ini:

| Jenis | Kode | Kondisi sekarang | Aturan |
| --- | --- | --- | --- |
| Gunung api | belum ada di `prediksi.json` | tanpa prakiraan harian | kejadian label = kenaikan level PVMBG; baseline persistensi = level kemarin; dinilai dengan aturan yang sama |
| Kekeringan | `kekeringan_prospektif.json` kosong dan bukan +1..+3 hari | kosong | skala dasarian, bukan +1..+3; ditulis jelas sebagai skala berbeda |
| Gempa | tanpa prakiraan harian | tidak ada | tidak diprakirakan; yang dinilai hanya model guncangan terhadap laporan dirasakan, di modul gempa |
| ASP dan ROB | "menunggu" di `nilai.py` | menunggu data | tetap menunggu sampai stasiun PM2,5 terukur dan seri pasut harian ada |

Kartu prospektif di layar memuat vonis tersebut, n, dan tanggal penilaian terakhir; tanpa angka performa jika vonis "belum teruji".

### 5.2 Kasus historis (F-26, B04)

Aturan pemilihan kasus per bencana dari arsip kejadian Buku Besar Kejadian dan `public/data/dibi_kejadian.json`:

1. Kandidat: kejadian jenis itu pada 10 tahun terakhir yang memenuhi ambang aktivasi Pusdalops yang sudah ada di logbook (Q23 di KEPUTUSAN; tanpa ambang baru), ditambah semua kejadian bertanda "kejadian besar" oleh staf.
2. Urutkan menurut dampak (terdampak lalu mengungsi lalu korban); ambil sepuluh teratas per jenis.
3. Tiap kasus menampilkan: tanggal, wilayah, dampak dari DIBI, sinyal yang ada saat itu (bila arsipnya ada) dan peringatan yang terbit; kolom sinyal kosong ditulis "tidak ada arsip", bukan diisi dugaan.
4. Angka antarsumber tidak dijumlah; sumber tiap angka ditulis.
5. Kasus tidak dipakai untuk memperbaiki ambang tanpa melalui uji balik (kebocoran data: kasus yang membentuk ambang dikecualikan dari penilaian ambang itu).

### 5.3 Uji balik longsor dan cuaca (F-24, D6)

Kondisi: longsor AUC 0,70 lawan klimatologi 0,78; cuaca hujan 50 mm ke atas POD 6,5% dan FAR 59% (KEPUTUSAN Masalah, RISET bagian 4). Aturan:

1. Pembagian waktu kronologis (tanpa acak), pelatihan dan penilaian tidak berbagi periode.
2. Ambang apa pun dipilih pada periode latih, dilaporkan pada periode uji.
3. Syarat dipakai untuk keputusan: AUC di atas klimatologi pada periode uji dan POD tidak di bawah baseline persistensi; bila tidak, pil hipotesis tetap.
4. Hasil ditulis ke laporan uji balik per modul, dibaca `validasi-model`.

## 6. Tren jangka panjang (F-27)

Deret per bulan jumlah kejadian DIBI dan indikator sumber per jenis (hujan, PM2,5, gempa M 5 ke atas, hari tanpa hujan), dengan regresi garis lurus dan selang kepercayaan 95 persen. Tren dilaporkan hanya bila deret memuat sedikitnya 60 bulan; selain itu "belum cukup tahun". Pengamat berubah (cakupan DIBI naik) ditandai di grafik, tidak ditafsirkan sebagai kenaikan bencana. Tooltip interaktif wajib (aturan pemilik: grafik interaktif).

## 7. Deteksi data basi dan kesegaran (F-30)

### 7.1 Aturan umum

Tiap berkas keluaran pipeline memuat `dibuat` atau `acuan` waktu ISO. Perakit kesegaran membandingkan dengan batas per berkas.

```
umur = kini - waktu_berkas
status = "segar"        bila umur <= batas
         "basi"         bila batas < umur <= 3 x batas
         "mati"         bila umur > 3 x batas
```

Layar menampilkan status terburuk dari sumber yang dipakai kartu itu. "mati" menyembunyikan angka dan menampilkan "data tidak tersedia sejak <tanggal>", tidak menampilkan angka lama sebagai terkini.

### 7.2 Batas per sumber yang baru atau diperbaiki

Batas ditandai BAWAAN SEMENTARA; tiap batas diturunkan dari jadwal workflow sumbernya dikali 2 (satu putaran terlewat tidak dianggap basi, dua putaran dianggap basi). Dua pengecualian tertulis: sumber berjadwal menit memakai batas yang sudah ada di kode (gempa 2 jam, `GEMPA_UMUR_MAKS`), dan sumber per jam memakai lantai 6 jam karena umpan hulu per jam (BMKG, OpenAQ) sering tertunda beberapa jam tanpa berarti rusak; tanpa lantai itu layar akan menandai basi tiap kali umpan telat sebentar.

| Sumber | Jadwal | Batas basi | Catatan |
| --- | --- | --- | --- |
| level gunung api (MAGMA) | harian | 48 jam | `riwayat_level.py` |
| PM2,5 dan ISPU | tiap jam bila sumber terjangkau | 6 jam (lantai per jam; aturan dikali 2 memberi 2 jam) | ISPU KLHK tidak terjangkau dari CI; jalur pengganti mengikuti Q24 (bawaan: PM2,5 BMKG dan OpenAQ) |
| status kekeringan | harian | 48 jam | `kekeringan_wilayah.json` |
| gempa BMKG dan USGS | tiap menit | 2 jam | `GEMPA_UMUR_MAKS` |
| abrasi tahunan | tahunan | 400 hari | `abrasi.py` harus terjadwal dan terverifikasi jalan |
| grid penduduk gunung api | statis | tidak basi; dicek ada | `pop_grid.py` harus ada dan diuji `tests/gunungapi/sim_tanggap.test.mjs` |
| berita cuaca dan udara | harian | 48 jam | teks basi berita sudah hilang per 15 Nov (F-33 tidak perlu mengerjakannya) |

### 7.3 Gagal lunak

Skrip panen yang gagal tidak menghapus berkas lama dan keluar 0 (pola `tangga.py`: gagal-lunak). Kegagalan dicatat di berkas status per sumber dan terlihat di panel kesegaran. Tiga kegagalan berturut-turut membuat sumber berstatus "mati" meski berkasnya lama masih ada.

## 8. Hitung ulang paritas otomatis (Q12, PB-01)

Tujuan: hitungan ADA, SEBAGIAN, BELUM di `docs/multi-bencana/PARITAS-2026-11-15.md` menjadi keluaran skrip, bukan penilaian tangan.

### 8.1 Masukan

`docs/multi-bencana/bencana/<id>.md`: tabel baris komponen dengan kolom kode (G, A, B, C, E, F), status (ADA, SEBAGIAN, BELUM, TIDAK BERLAKU), dan bukti berkas. Skrip baru `scripts/agents/paritas.mjs` (usulan nama; pemilik `mekanik-mesin`).

### 8.2 Aturan hitung

1. Hitung per bencana: ADA, SEBAGIAN, BELUM, jumlah berlaku = ADA + SEBAGIAN + BELUM; TIDAK BERLAKU tidak masuk jumlah.
2. K5 diterapkan: baris G02, G03, G10 di gempa, cuaca, udara berstatus berlaku (BELUM sampai dibangun); skrip menolak baris yang masih TIDAK BERLAKU untuk tiga jenis itu.
3. Bukti: tiap status ADA wajib menyebut sedikitnya satu berkas yang ada di repo; skrip memeriksa keberadaan berkas (`fs.existsSync`). Bukti yang menunjuk berkas tidak ada menurunkan status ke SEBAGIAN dan dilaporkan.
4. Keluaran: JSON `public/data/paritas.json` (bukan berkas besar) dan ringkasan tabel markdown untuk dokumen.
5. Tidak ada hitungan karhutla dan banjir yang turun: skrip membandingkan dengan hitungan acuan terakhir yang dibekukan dan gagal bila ADA karhutla atau banjir turun (ukuran keberhasilan PRD bagian 8).

### 8.3 Penjadwalan

Dijalankan di CI tiap kali berkas `docs/multi-bencana/bencana/*.md` atau `public/bencana.json` berubah, dan mingguan. Pemilik berkas: `mekanik-mesin`. Gerbang uji: `tests/agen/` memeriksa bahwa hitungan di dokumen audit sama dengan keluaran skrip.

## 9. Tinjauan model dan peringatan

Tiap rumus dan ambang baru di dokumen ini diperiksa pemeriksa bersih (bukan penulisnya): `validasi-model` untuk bagian 4, 5, 6; `guard-api` dan `security-reviewer` untuk rute; `migrasi-idempoten` untuk migrasi jenis baru; `selera-angka` untuk angka di layar; `inp-reviewer` untuk handler checklist.

## Uji yang wajib

| Aturan | Uji |
| --- | --- |
| tangga tindakan per tingkat dan bencana | uji yang mengiterasi `BENCANA` dan memastikan tiap tingkat 1 sampai 3 menghasilkan tindakan tidak kosong, tsunami tanpa tingkat 1 dikecualikan |
| aturan EWS jenis baru sampai CAP | uji integrasi pola `tests/warga/ews.test.mjs` yang menjalankan jalur dari data sampai baris `peringatan` dan keluaran CAP, dengan migrasi jenis diterapkan di D1 lokal uji (bukan mock) |
| dedupe kunci | dua putaran dengan data sama menulis satu baris; kenaikan tingkat menulis baris kedua |
| kesegaran | berkas bertanggal basi membuat `status = basi` dan `mati` sesuai bagian 7.1 |
| kebutuhan | `kebutuhan(41, sp)` tetap sama; koefisien tanpa sumber ditolak |
| prioritas | wilayah dengan dua komponen kosong tidak diberi skor |
| paritas | bukti berkas tidak ada menurunkan status; ADA karhutla dan banjir tidak turun |

## Pertanyaan untuk KEPUTUSAN

> Catatan orkestrator 15 Nov 2026: pertanyaan di bagian ini sudah dipindah ke KEPUTUSAN-PARITAS.md (Q1 sampai Q37) dan dinomori ulang di sana. Bila isi atau bawaan berbeda, KEPUTUSAN yang berlaku. Untuk rute layar baru berlaku Q13 (papan status darurat dilebur ke `siaga.html`, pembuat dokumen di `/bnpb/sitrep`, dashboard pimpinan `/bnpb/pimpinan`); panel kiri berlaku D12.
