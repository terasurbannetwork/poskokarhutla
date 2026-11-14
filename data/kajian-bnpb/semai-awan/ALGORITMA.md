# ALGORITMA: Peluang Semai Awan dan Prakiraan Asap

Semua ambang adalah nilai awal. Asal tiap nilai ditulis di kolom Dasar: **N** = panduan Nimbus v2.2 (R3), **L** = literatur (R1),
**H** = hipotesis penyusun. Semua nilai ada di satu berkas `scripts/operasi/semai_bobot.json` berlabel HIPOTESIS, bukan tersebar
di kode, dan versi berkas ikut tercatat di tiap putaran beku.

## 1. Wilayah, grid, waktu

- Wilayah 94 sampai 142 BT, 12 LS sampai 7 LU; grid IFS 0,1 derajat apa adanya: 481 x 191 = 91.871 sel.
- Langkah 0, 3, ..., 36 jam dari putaran 00 atau 12 UTC (13 langkah) diunduh. Putaran 0,1 derajat lengkap sekitar 9,5 jam sesudah
  jam awalnya (terverifikasi 14 Nov 2026: putaran 00z langkah 24 terbit 09.34 UTC), jadi layar menampilkan 24 jam mulai langkah
  pertama yang jam sahnya sesudah keluaran dibuat (putaran 12z dipakai pukul 05.00 WIB: langkah 18 sampai 36 memuat jam siang hari
  itu). Nilai antarlangkah tidak diinterpolasi; bilah jam berhenti di langkah model.
- **Langkah = blok 3 jam** yang dimulai pada jam sahnya (langkah 03Z mewakili 03.00 sampai 06.00 UTC). Semua rentang jam di layar
  mengikuti blok ini.
- Jam setempat per sel dari **provinsi** sel (batas provinsi repo; kode BPS ke zona: WIB untuk Sumatera, Jawa, Kalbar, Kalteng;
  WITA untuk Bali, NTB, NTT, Kalsel, Kaltim, Kaltara, Sulawesi; WIT untuk Maluku, Maluku Utara, Papua). Sel laut: provinsi daratan
  terdekat. Nimbus memakai WIB untuk seluruh Indonesia; kita memakai zona setempat karena posko terbang di jam setempat.

## 2. Turunan per sel per langkah

| Turunan | Rumus | Satuan |
| ------- | ----- | ------ |
| Hujan 3 jam | `tp(t+3) - tp(t)` (tp kumulatif sejak awal putaran), dibagi 3: hujan di blok langkah itu | mm/jam |
| Geseran | `|V200 - V850|`, V = (u, v) | m/s |
| Angin pengarah | rerata vektor V850 dan V700 | m/s |
| Tinggi LCL | `125 x (T2m - Td2m)` (rumus Espy) | m di atas permukaan |
| Suhu dasar awan | `T2m - 0,0098 x LCL` (lapse kering sampai LCL) | derajat C |
| Tinggi level beku | interpolasi linear `gh` pada lapisan pertama dari bawah dengan `t` <= 273,15 K | m |
| Kedalaman awan hangat | `level beku - LCL` (permukaan diambil 0 m; `gh` dikurangi geopotensial permukaan bila tersedia, kalau tidak dari `gh` 1000 hPa) | m |
| Updraf lapisan rendah | `w850` dan `w700` Pa/s diubah ke m/s: `-w x R x T / (p x g)`, diambil rerata keduanya | m/s |
| Cairan awan | `tclw` | kg/m2 |

## 3. Gerbang layak semai

Sel "layak semai" bila **semua** terpenuhi pada langkah itu:

| No | Syarat | Ambang awal | Dasar |
| -- | ------ | ----------- | ----- |
| G1 | Tutupan awan rendah `lcc` | >= 0,25 | N |
| G2 | MUCAPE | >= 1.500 J/kg | N (saran peninjau BMKG) |
| G3 | Cairan awan `tclw` | >= 0,05 kg/m2 | N, L mekanisme |
| G4 | Geseran 850 ke 200 hPa | <= 12,5 m/s | N |
| G5 | RH 850 hPa | >= 65% | N |
| G6 | Hujan 3 jam | < 4 mm/jam | N |
| G7 | Suhu dasar awan | >= 10 derajat C | L (awan hangat), H nilai |
| G8 | Kedalaman awan hangat | >= 1.000 m | L (Silverman dan Sukarnjanaset 2000) |
| G9 | Jam setempat | 07.00 sampai 16.00 (Q7) | N |

Tanda bahaya (bukan gerbang, tampil di alasan dan menurunkan zona ke daftar "hati-hati"): MUCAPE > 3.500 J/kg (H, keselamatan
penerbangan di awan konvektif kuat). Mode "seperti Nimbus" mematikan G7, G8, dan tanda bahaya.

## 4. Sel kandidat

Hanya sel dalam 60 km dari pusat cluster api besar yang dinilai (N). Daya api cluster = `frp24` di `public/data/kluster.json`
(FRP 24 jam; `frp` adalah jumlah sepanjang umur cluster dan tidak dipakai). Cluster besar: `frp24` >= ambang, ambang = maksimum
(40 MW, 2% `frp24` cluster terbesar) (N). Nama provinsi dari kode `prov` (kode BPS, mis. "62") lewat tabel provinsi repo. Cluster di luar wilayah daratan Indonesia tidak dipakai (S2). Bila tidak ada cluster besar,
keluaran `zona = []` dengan `alasan_kosong = "tidak_ada_api_besar"`.

## 5. Tiga faktor

**Q, kualitas awan** (0 sampai 1), rerata lima komponen yang tiap komponennya dipotong ke 0 sampai 1:

| Komponen | Rumus | Dasar |
| -------- | ----- | ----- |
| q_cape | `(MUCAPE - 1500) / (3000 - 1500)` | N (CAPE di atas minimum), H rentang |
| q_air | `(tclw - 0,05) / (0,30 - 0,05)` | N, H rentang |
| q_rh | `(RH850 - 65) / (95 - 65)` | N, H rentang |
| q_geser | `(12,5 - geseran) / 12,5` | N |
| q_naik | `w / 1,0` (w dalam m/s, 1 m/s penuh) | L (updraf dasar > 1 m/s), H penaksir NWP |

Mode "seperti Nimbus" memakai empat komponen pertama saja.

**D, hanyut ke api.** Titik hujan = titik sel digeser angin pengarah selama τ = 30 menit (N; sensitivitas 20, 45, 60 menit di Tinjau
BMKG). `F` = jumlah `frp24` cluster yang pusatnya dalam 25 km dari titik hujan (N; pusat cluster, bukan titik `api24`, karena titik tidak
membawa FRP sendiri), dengan pengali gambut 1,5 untuk cluster `gambut = true` (Q9).
`D = 1 - exp(-F / F0)`, `F0 = 200 MW` (H; 200 MW di bawah titik hujan memberi D sekitar 0,63). D = 0 bila tidak ada api dalam
25 km titik hujan (N: sel bernilai nol tanpa api di bawah titik hujannya).

**T, jarak kota.** Jarak titik hujan ke titik kota terdekat (`scripts/udara/kota.json`) atau bandara (`scripts/cuaca/data/bandara.json`):
`T = 0` di <= 10 km, naik linear, `T = 1` di >= 50 km (N).

## 6. Skor

Bawaan (D4): `skor = gerbang x Q^wQ x D^wD x T^wT`, bobot dinormalkan `wQ + wD + wT = 1`, bawaan 0,45 / 0,40 / 0,15 (N).
Rerata geometris berbobot ini bernilai 0 bila salah satu faktor 0, dan bobot tetap bisa digeser di Tinjau BMKG.

Mode "seperti Nimbus": `skor = gerbang x (wQ x Q + wD x D + wT x T)`, dengan D = 0 memaksa skor 0.

Contoh hitung (dipakai di RENCANA-UJI §1): komponen cape 0,53, air 0,36, rh 1, geser 0,54, naik 0,40 memberi Q = 0,566 (mode
Nimbus, empat komponen: 0,608); F = 442 MW memberi D = 1 - exp(-2,21) = 0,890; T = 1. Bawaan: 0,566^0,45 x 0,890^0,40 x 1 = 0,74.
Seperti Nimbus: 0,45 x 0,608 + 0,40 x 0,890 + 0,15 x 1 = 0,78.

Skor dibulatkan 2 desimal di layar. Selisih < 0,02 tidak boleh disebut "lebih baik" di ringkasan.

## 7. Zona, jendela terbang, base

1. Untuk tiap sel kandidat ambil skor tertinggi di antara langkah siang; catat langkahnya.
2. Urutkan; pilih serakah: sel terbaik jadi zona, buang sel lain dalam 40 km darinya; ulang sampai 5 zona atau skor < 0,35 (N, Q6).
3. **Jendela terbang** zona = langkah siang berurutan di sekitar langkah terbaik dengan skor sel >= 85% puncaknya (N), ditulis
   dari awal blok pertama sampai akhir blok terakhir dalam jam setempat, dipotong ke 07.00 sampai 16.00, misalnya putaran 00z di WIB:
   blok 03Z dan 06Z = "10.00 sampai 16.00 WIB"; di WITA blok 03Z saja = "11.00 sampai 14.00 WITA".
4. **Provinsi** dari titik zona (batas provinsi repo); di laut: kota terdekat ("lepas pantai dekat Kendari").
5. **Base**: base terdekat dari himpunan Q2 (hari ini `op_base` berisi 9 base Sumatera dan Kalimantan saja; base OMC di Sulawesi,
   Nusa Tenggara, dan Papua menunggu Q13) dengan jarak garis lurus; menit terbang = jarak / 300 km/jam x 60 (Q8), dibulatkan ke
   5 menit dan berlabel perkiraan. Zona di luar jelajah base (120 nm, `bobot_renlap.json`) diberi tanda "di luar jelajah".
6. **Kota terdekat** dan **cluster yang dituju** (cluster dengan FRP terbesar dalam 25 km titik hujan) dicatat untuk alasan F dan T.
7. **Tanda awan teramati** (F-22): kabupaten zona punya puncak awan dingin Himawari B13 pada jam terbaru `awan_himawari.json`.

Keadaan kosong:

| Keadaan | `alasan_kosong` | Kalimat layar |
| ------- | --------------- | ------------- |
| Tidak ada cluster besar | `tidak_ada_api_besar` | "Tidak ada cluster api di atas <ambang> MW, belum perlu semai." (ambang §4 putaran itu) |
| Ada api, tidak ada sel lolos gerbang dan hanyut ke api | `tidak_ada_awan` | "Tidak ada awan layak semai yang hanyut ke api dalam 24 jam ke depan." |
| Putaran IFS tidak ada atau gagal | `tanpa_prakiraan` | "Prakiraan belum tersedia. Putaran terakhir: <jam>." |

## 7b. Mulai dari target, ketinggian, bahan

**Mulai dari target (F-23).** Masukan: satu target berupa titik (cluster), poligon kabupaten, atau poligon KHG. Sel kandidat = sel
dalam 60 km dari target (bukan dari cluster besar). Faktor D diganti `D_target`: 1 bila titik hujan sel berada di dalam poligon target
atau dalam 25 km titik target, 0 bila tidak; untuk target berapi, D biasa (§5) tetap dipakai sebagai pengali. Gerbang, Q, T, zona,
dan jendela sama dengan §3 sampai §7. Dihitung di peramban dari `kandidat_target` bila target dipilih dari daftar yang sudah dihitung
pipeline (semua kab dengan cluster aktif dan KHG prioritas), supaya tidak memanggil server; target lain menunggu putaran berikutnya.

**Ketinggian semai (F-24).** Semai higroskopis dilakukan di dasar awan, dekat arus naik (R1 §2.1). Ketinggian = LCL sel zona pada
langkah terbaik (§2) + tinggi permukaan, dalam kaki (x 3,281), dibulatkan ke 500 kaki, ditulis "sekitar 4.500 kaki (dasar awan
perkiraan)". Bila LCL < 300 m atau > 3.000 m: ditulis "dasar awan tidak terbaca model" tanpa angka.

**Bahan (F-25).** Aturan pilihan, berurutan:

1. **Inversi berasap**: ada lapisan dengan suhu naik terhadap tinggi antara permukaan dan 700 hPa (dari profil `t`/`gh` 1000, 925,
   850, 700 hPa) DAN titik zona di bawah beban asap tingkat sedang atau tinggi (§9) pada langkah yang sama -> "dry ice dulu untuk
   memecah inversi, lalu NaCl" (praktik BMKG menurut pemberitaan, R1 §3; dasar ambangnya H).
2. Selain itu -> "NaCl" (bahan bawaan semai higroskopis TMC Indonesia).

CaO dan flare higroskopis tidak diusulkan sampai pemilik atau BMKG menetapkan kapan dipakai (Q14).

**Jumlah (F-25).** Tidak ada dosis per awan. Jumlah = muatan bahan per sortie armada OMC base itu x jumlah sortie dalam jendela
terbang zona:

- Muatan per jenis armada dari tabel `semai_bobot.json` `muatan_kg` yang diisi dari jawaban Q15; sampai dijawab, isinya kosong dan
  layar menulis "muatan armada belum diisi" tanpa angka (tidak ada data dummy). Satu-satunya angka acuan yang ditemukan, sekitar
  800 kg NaCl per sortie (Riau 2023, hitungan dari rekap 14 sortie 11.200 kg, R1 §3), hanya ditulis di kartu "Cara memutuskan" sebagai
  acuan berlabel, tidak dipakai menghitung.
- Sortie per zona = `floor(panjang jendela / (2 x menit terbang + menit semai))`, menit semai bawaan dari Q16, paling sedikit 1,
  paling banyak jumlah armada OMC siap di base itu (gelar armada hari itu).
- Dry ice: jumlah per sortie dari Q15 juga; tanpa jawaban, "jumlah dry ice belum diisi".
- Total harian per base = jumlah semua zona yang sudah dijadikan target renlap base itu (bukan semua zona usulan).

## 8. Sel kandidat untuk Tinjau BMKG

`semai.json` membawa sampai 400 sel kandidat terbaik (lintang, bujur, langkah, Q, D, T, lima komponen Q) supaya peramban bisa
menghitung ulang skor dan zona saat bobot digeser tanpa memanggil server. Algoritma zona di peramban sama persis dengan §7 dan diuji
silang lawan keluaran Python (RENCANA-UJI §3).

## 9. Prakiraan asap

Memakai `scripts/udara/lintasan.py` (D6), dengan perubahan:

1. **Angin**: bila putaran IFS 0,1 derajat ada, angin 10 m dan 850 hPa diambil dari `data/raw/semai/<putaran>`; bila tidak, kembali
   ke `angin.json` 1 derajat. Sumber angin ditulis di keluaran.
2. **Pelepasan**: tiap cluster besar (§4) melepas partikel tiga kali per jam (N), langkah 15 menit (N), digerakkan campuran 60% angin
   10 m dan 40% angin 850 hPa (N). Pelepasan dimulai 12 jam sebelum jam pertama yang ditampilkan (pemanasan, dengan langkah awal
   putaran yang sama) dan berlanjut sampai jam terakhir, supaya jam pertama di layar sudah berasap dan pelepasan akhir tidak kosong. Tiap partikel membawa bobot `FRP cluster / jumlah partikel cluster`.
3. **Beban relatif per jam**: jumlah bobot partikel per sel 0,1 derajat, dihaluskan kernel 20 km, dinormalkan ke persentil 99 putaran
   itu. Tingkat: tinggi >= 0,5, sedang 0,2 sampai 0,5, rendah 0,05 sampai 0,2 (H). Bukan PM2.5 (prinsip 4).
4. **Kota di bawah asap**: kota (`kota.json`) dengan beban >= 0,05 dalam 20 km (N; mode semai saja, lapisan udara tetap memakai
   `R_KOTA = 25`), jam tiba = jam pertama, tingkat = maksimum 24 jam. Tiap kota juga membawa:
   - **status**: "sudah berasap" bila beban >= 0,05 sudah ada di jam pertama yang ditampilkan (bukan "tiba +3 jam" seperti Nimbus,
     yang membuat kota dekat api tampak seolah asap baru datang); selain itu "tiba +N jam";
   - **asal**: cluster penyumbang bobot partikel terbesar di kota itu pada jam tingkat maksimum, dengan kabupaten dan jaraknya (km);
   - **arah datang**: arah mata angin dari kota ke cluster asal (8 arah, mis. "dari tenggara"), dan angin 10 m di kota pada jam tiba
     (arah dan km/jam);
   - **lama**: jumlah jam dalam 24 jam dengan beban >= 0,05.
   Urutan daftar: tiba +N jam lebih dulu (berurutan jam tiba), lalu sudah berasap (berurutan tingkat); paling banyak 8 baris, sisanya
   "+N kota lain".
5. **Arah angin di layar**: lapisan angin asap (campuran 60% 10 m dan 40% 850 hPa, sama dengan penggerak partikel) sebagai panah tiap
   1 derajat pada jam terpilih, terpisah dari angin pengarah awan 850 sampai 700 hPa; kotak lapisan memuat keduanya.
6. **Lintas batas**: jam pertama ketika >= 5% bobot partikel satu cluster berada di poligon negara lain (`negara()` di `lintasan.py`
   memuat poligon MY, SG, BN, TL; poligon daratan PNG ditambah di SA-05 karena wilayah 94..142 BT memotong batas PNG di 141 BT)
   (H untuk "bagian berarti"); dicatat negara, kota terdekat di sana (GeoNames cities15000, CC BY 4.0, hanya negara tetangga), cluster
   asal.

## 10. Satelit hilang

Dari pipeline FIRMS: jumlah titik 24 jam per sumber (`VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`). Satelit dianggap
hilang bila jumlahnya < 20% rerata 7 hari sumber itu (H) atau unduhannya gagal. Bilah sumber: "2 dari 3 satelit (belum masuk: NOAA-21)".
Data FIRMS basi bila lebih tua dari 6 jam (N). Prakiraan basi bila putaran terpakai bukan putaran terbaru yang sudah terbit
(lewat satu putaran, sekitar 12 jam).

## 11. Ringkasan teks

Pos komando (Indonesia), contoh susunan:

```
Peluang semai, Sab 14 Nov, 16.00 WIB (ECMWF 00z)
Api: 47 cluster besar, 6.231 MW
Asap: menyeberang ke Timor-Leste sekitar 24 jam lagi; tiba +3 jam di Parepare, Merauke, Semarang
Zona usulan:
- A Kalimantan Tengah, -1,400 115,300, 13.00 sampai 16.00 WIB, skor 0,74, dari Tjilik Riwut (PKY) sekitar 35 menit
- B ...
Usulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG.
```

Mitra (Inggris): sama dengan "shared brief" Nimbus, koordinat dibulatkan 0,5 derajat dan ditulis `~-1.5, 115.5`, tanpa skor, alasan,
dan base.

## 12. Uji prospektif (D7, pra-registrasi)

Ditulis sebelum data pertama dinilai dan tidak diubah tanpa catatan penyimpangan bertanggal.

- **Unit**: zona (bukan sel) dari putaran beku. Satu zona dinilai sekali.
- **Kejadian**: hujan satelit >= 1 mm/jam (GSMaP NRT, cadangan IMERG Early) di mana pun dalam 25 km titik hujan, pada 30 sampai
  90 menit sesudah jam terbaik zona.
- **Pembanding**: untuk tiap zona, 5 sel acak pada langkah yang sama, lolos gerbang G1 sampai G9, berjarak >= 40 km dari semua zona,
  dengan benih acak tetap `20261114`. Kejadian dihitung dengan cara sama.
- **Ukuran**: laju kejadian zona lawan pembanding, selisih dan selang Wilson 95%; juga laju per desil skor (keandalan).
- **Ambang tampil**: rapor menampilkan angka hanya bila n zona >= 30; sebelumnya "data kurang (n = x)".
- **Yang tidak diklaim**: efek semai. Penilaian ini hanya menguji apakah mesin memilih awan yang memang menjadi hujan alami.
- **Sortie lawan zona** (F-21): `omc_sortie` (`migrations/0033_omc.sql`) tidak punya titik, hanya `sasaran_kab`, `sasaran_poligon`
  opsional, `tanggal`, `mulai` dan `selesai` epoch opsional, dan kolom `dummy`. Aturan: hanya `dummy = 0` dan `mulai` terisi;
  "di dalam zona" bila jam `mulai` sampai `selesai` beririsan jendela terbang zona DAN (poligon sasaran beririsan lingkaran 25 km
  titik hujan, atau tanpa poligon: titik hujan berada di kabupaten `sasaran_kab`). Baris tanpa `mulai` dihitung terpisah sebagai
  "tanpa jam". Ditampilkan sebagai persen sortie di dalam zona, tanpa menilai hasil hujannya.

## 13. Batas yang ditampilkan (kartu "Yang tidak terlihat satelit dan model")

Isi mengikuti Nimbus (lintasan satelit dua kali sehari, asap dan awan menutupi api, gambut membara lemah, tidak semua titik panas
kebakaran hutan, grid model 11 km dan konveksi diparameterisasi, semai bukan jaminan hujan) ditambah: penaksir updraf w dari model
kasar; pengaruh aerosol asap pada awan tidak dihitung; beban asap relatif, bukan PM2.5.
