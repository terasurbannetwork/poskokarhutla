# ALGORITMA: Desa Waspada

Semua fungsi murni, stdlib saja. Letak: `scripts/data/desa_waspada.py` (fungsi `A*` sampai `D*` di bawah). Konstanta di kepala berkas, satu tempat.

## Konstanta

| Nama | Nilai | Catatan |
| ---- | ----- | ------- |
| `JENDELA_JAM` | 168 | 7 x 24 jam dari `acuan` (`jam >= -168`) |
| `JAM24` | 24 | |
| `MIN_TAHUN` | 3 | desa daftar B (`tahun_terbakar >= MIN_TAHUN`) |
| `TH0`, `TH1` | 2012, 2025 | dari `riwayat_petak.TH0/TH1` |
| `SENSOR_DAFTAR` | {N, N20, N21} | VIIRS; M (MODIS) tidak dipakai (D5) |
| `YAKIN_MIN` | 1 | kelas `kelas_yakin` 1 (nominal) dan 2 (tinggi); 0 (rendah) dibuang |
| `MAKS_A` | 2000 | baris daftar A |
| `MAKS_B_PER_PROV` | 300 | baris daftar B per provinsi [SEMENTARA, Q5] |
| `UKURAN_MAKS_KB` | 450 | `desa_waspada.json` |
| `MUSIM_HINDCAST` | 2023, bulan 7..10 | seperti pembanding |
| `Z_WILSON` | 1,96 | |
| `PETAK` | 0,0034 | derajat, sama dengan `riwayat_petak.DERAJAT` |
| `JARAK_BATAS_M` | 200 | catatan galat titik dekat batas (DW-03) |
| `UMUR_PREDIKSI_MAKS_JAM` | 36 | di atas ini peluang kab = `null` |

## A. Daftar A: titik panas 7 hari per desa

### A1. Masukan

`hotspot.json`: `baris:[lat, lon, jam, sensor, frp, keyakinan, wilayah, tgl_wib]`, `acuan`. Disaring: `sensor ∈ SENSOR_DAFTAR`, kolom keyakinan ≥ 1 (kelas `firms_sumber.kelas_yakin`: 0 rendah, 1 nominal, 2 tinggi), `jam >= -JENDELA_JAM`. Sumber panas tetap (smelter, tambang, kilang, PLTU) sudah dibuang dari `hotspot.json` oleh `harian.py` lewat `titik_palsu.sel_industri()` (dibaca 24 Nov 2026; tidak ada kolom `hitung`), jadi daftar A tidak menyaring lagi. Titik gunung api (kawah) tetap ada di `hotspot.json` dan ikut terhitung (Q9). Hindcast (D) membaca CSV mentah, jadi di sana `titik_palsu.sel_industri()` dipakai sendiri supaya definisi sama.

### A2. Titik unik

Satu titik = satu petak 375 m (`PETAK`, kunci `riwayat_petak.kunci(lat, lon)`) per hari WIB (`tgl_wib`, berbentuk `MM-DD` tanpa tahun; unik dalam jendela 8 hari sehingga tahun tidak perlu), bukan satu baris. Dua lintasan yang melihat petak yang sama pada hari WIB yang sama dihitung satu. Alasan: sama dengan definisi `titik_unik.py`, dan hindcast hanya butuh "≥ 1 titik".

### A3. Titik ke desa

Kolom `wilayah` tiap baris adalah indeks ke daftar `hotspot.wilayah` berisi teks `"PP|nama kab|nama kec"` (mis. `"11|Aceh Barat|Arongan Lambalek"`). `kode_kab = Desa.kode_kab(PP, nama kab)`; bila tak cocok, titik dicatat di `tanpa_desa` bukan ditebak. Lalu `kd = Desa.cari(lat, lon, kode_kab)`. Titik tanpa desa (di laut, atau di luar poligon yang disederhanakan) ditulis ke `tanpa_desa` (jumlah) dan tidak dibuang diam-diam.

### A4. Agregat per desa

`titik_7h` = jumlah titik unik, `titik_24h` = yang `jam >= -JAM24`, `terakhir` = waktu terbaru (`acuan + jam`, WIB, dibulatkan menit). Desa dengan `titik_7h >= 1` masuk daftar A.

### A5. Urutan dan potong

Urut `titik_7h` turun, lalu `tahun_terbakar` turun, lalu `kd`. Potong `MAKS_A`; yang terpotong dihitung di `terpotong_a`.

## B. Daftar B: berulang tanpa titik minggu ini

### B1. Tahun terbakar per desa (bulanan)

Untuk tiap petak di `riwayat_petak.bin` dengan `popcount(mask) >= MIN_TAHUN` (131 ribu petak, jauh lebih sedikit dari 1,5 juta): pusat petak `((ix + 0,5) * PETAK, (iy + 0,5) * PETAK)` → kab (poligon kab) → desa (`Desa.cari`). `tahun_terbakar[kd] = max(popcount)` atas petak desa itu; `tahun_terakhir[kd] = max(bit tertinggi) + TH0`. Petak tanpa desa dibuang dan dihitung di `petak_tanpa_desa`. Desa yang tidak punya petak ≥ 3 tahun tidak masuk `desa_statik.json` (artinya `tahun_terbakar < 3`, bukan 0).

Penyaring riwayat tidak sama dengan penyaring titik hari ini: riwayat memakai `type = 0` (membuang gunung api dan sumber tetap), `hotspot.json` membuang sumber tetap tetapi menyimpan kawah (RISET §4 butir 7).

Catatan: petak 2012 sampai 2025 VIIRS S-NPP dengan geser geolokasi antartahun membuat "petak sama" ukuran ketat; tahun terbakar adalah batas bawah (`riwayat_petak.py` kepala).

### B2. Anggota

`desa ∈ B` bila `kd ∈ desa_statik` dan `titik_7h == 0`. Urut: `tahun_terbakar` turun, lalu `gambut` turun (null terakhir), lalu `kd`. Potong `MAKS_B_PER_PROV` per provinsi (`kd[:2]`); jumlah penuh di `total_b`.

Bila Q3 dijawab "tahun berbeda di mana pun di desa", B1 diganti: tahun terbakar = jumlah bit atas OR semua petak desa. Fungsi dibuat dengan parameter `metode` supaya DW-03 mencatat keduanya.

## C. Gambut dan peluang kab/kota

### C1. Porsi gambut (bulanan)

Dihitung bulanan untuk **semua** desa di kab yang kotak batasnya beririsan dengan sedikitnya satu fitur `gambut.geojson` (bukan hanya kandidat A atau B: daftar A berubah tiap 3 jam, sedangkan hitungan ini bulanan, jadi desa bertitik baru tidak boleh kehilangan nilainya); desa di kab tanpa irisan: `null`. Per desa: ambil `n` titik uji di dalam poligon desa, kisi seragam 0,002 derajat (maks 200 titik per desa, deterministik); `gambut = round(titik uji di dalam poligon gambut.geojson / n, 2)`. Poligon gambut diindeks sel 0,05 derajat seperti `Desa.muat`. Provinsi tanpa fitur gambut: `null`. Desa tanpa titik uji (lebih kecil dari kisi): titik tengah kotak batas yang digeser ke dalam poligon, `n = 1`.

### C2. Peluang kab/kota

`kab4 = kd[:2] + kd[3:5]` ("11.01..." → "1101"). `API[h][0]` untuk `h = 0..2` dari `prediksi.json` (pecahan 0 sampai 1; disimpan `round(p * 100)`, bilangan bulat persen), `null` bila kab tidak ada, atau umur berkas (`now - dibuat`) lebih dari `UMUR_PREDIKSI_MAKS_JAM`, atau `API[h]` tidak ada. `prediksi.json` dibaca dari repo (ditulis `prediksi.yml` harian); hari ke-1 adalah tenggang +1 dari `dibuat` prediksi, bukan dari `acuan` titik. Status: `skor.json["kode"]["API"]["status"]` (nilai yang ada `dinilai` atau `menunggu`; selain `dinilai` = pil hipotesis) disalin ke `peluang.status` tingkat berkas, bukan per desa. Tampilan persen ditulis di layar sebagai "peluang kab/kota". Definisi peluangnya milik `scripts/prediksi/catat.py`: peluang sedikitnya 1 titik panas (lokasi unik, keyakinan sedang atau tinggi) di kab itu; tidak identik dengan definisi titik daftar (VIIRS saja), dan layar tidak membandingkannya dengan titik desa.

## D. Laju hindcast (lokal, DW-03)

### D1. Data

`data/raw/firms/viirs_2023.csv` (lokal, kolom `satellite`, `acq_date`, `confidence`, `type`): VIIRS S-NPP, `type = 0`, keyakinan n atau h, bulan 7 sampai 10, bukan sumber tetap (`titik_palsu.sel_industri()`). Ulangan Q4: `data/raw/firms/viirs_n20_2023.csv` (ada). CSV tidak punya kolom `wilayah`, jadi titik ke desa memakai indeks poligon semua desa (36 MB poligon di `public/geo/desa`) atau poligon kab `public/geo/kabupaten/<PP>.json` dulu lalu desa; DW-03 mengukur waktu dan memori. Karena baris `type`, `satellite`, dan `confidence` sudah ada, tidak perlu `kelas_yakin` (VIIRS saja: n=1, h=2). Tiap titik ke desa lewat A3. Minggu `w = (tanggal - 1 Juli 2023).hari // 7`.

### D2. Matriks desa-minggu

`W[desa][w] = 1` bila ada ≥ 1 titik pada minggu itu. Pasangan (w, w+1) dipakai bila keduanya ada di rentang. Riwayat desa dihitung dari 2012 sampai 2022 saja: tiap petak di `riwayat_petak.bin` dimasker `mask & ((1 << 11) - 1)` (bit 0 sampai 10), lalu B1 (tahun terbakar maksimum per desa). Berbeda dengan produksi, laju membaca **semua** 1,5 juta petak (bukan hanya yang ≥ 3 tahun), supaya "tak pernah terbakar" (tidak ada petak berbit di 2012 sampai 2022) dan "tahun 1 atau 2" terbedakan; hasil ini hanya jalan lokal.

### D3. Kelompok dan laju

| Kelompok | Syarat pada minggu w | Laju |
| -------- | -------------------- | ---- |
| A | `W[desa][w] = 1` | rasio `W[w+1] = 1` |
| B | `W[w] = 0` dan `tahun_terbakar_2012_2022 >= 3` | rasio `W[w+1] = 1` |
| semua lainnya | `W[w] = 0` dan bukan B (termasuk "tak pernah"; dua kelompok ini bertumpuk dan tidak dijumlah) | rasio `W[w+1] = 1` |
| tak pernah | `W[w] = 0` dan `tahun_terbakar_2012_2022 == 0` | rasio `W[w+1] = 1` |

Tiap kelompok: `n_desa_minggu`, `n_ya`, `laju = n_ya / n`, selang Wilson 95%. Penyebut ≥ 1 atau `laju = null`. Catatan batas: desa-minggu beruntun berkorelasi, selang Wilson terlalu sempit (seperti `peluang_karhutla.py`); ditulis di berkas.

### D4. Vonis

`lulus` bila (Q2 [SEMENTARA]): `laju_A >= 3 * laju_lain`, `laju_B >= 2 * laju_lain`, `n_A >= 200`, `n_B >= 200`, dan `wilson_bawah_A > laju_lain`, `wilson_bawah_B > laju_lain`. `gagal` bila ukuran dihitung tetapi tidak terpenuhi, `belum` bila berkas belum ada. Ambang dikunci di RENCANA-UJI §2 sebelum angka dihitung. Angka ambang masih bawaan sementara (Q2): `lulus` dari ambang sementara ditulis `lulus_sementara` di berkas, dan layar tetap memakai pil hipotesis sampai pemilik menjawab Q2; `laju.status` yang diterbitkan: `belum`, `lulus_sementara`, `lulus` (hanya sesudah Q2), atau `gagal`.

### D5. Periksa kepekaan

Ulangi D1 sampai D4 dengan NOAA-20 2023 (Q4) dan dengan `metode` alternatif B1 (Q3); tiga hasil ditulis di `desa_waspada_laju.json` berdampingan. Vonis akhir `lulus` hanya bila ketiganya lulus.

### D6. Galat penempatan desa

Persen titik dalam `JARAK_BATAS_M` dari batas poligon desa yang ditempatinya (galat batas); dicatat, tidak mengubah angka.

## E. Keluaran

`public/data/desa_waspada.json` (kontrak di DESAIN-TEKNIS §3). Urut kunci tetap, tanpa `lat`/`lon` per titik, koordinat desa dibulatkan 0,001 derajat.

## F. Jangan campur

- Titik daftar (VIIRS n/h, unik per petak per hari) tidak dijumlah dengan angka utama atau MODIS.
- Tahun terbakar petak (B1) tidak dijumlah dengan tahun dari `riwayat_sel.py` atau `preventif.py` (definisi petak dan sel lain).
- Peluang kab/kota tidak dinaikkan menjadi peluang desa.
