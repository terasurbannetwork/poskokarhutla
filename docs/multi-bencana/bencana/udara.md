# Kualitas udara & asap

Pengerja: `udara`. Urutan: 4 (riset menilai upaya paling kecil karena CAMS lewat Open-Meteo sudah
dipakai `scripts/data/asap.py`). Keputusan pemilik dibutuhkan: modul sendiri atau tetap bagian
karhutla (ARSITEKTUR "Keputusan" butir 3). Rencana ini mengasumsikan modul sendiri yang mencakup
asap karhutla, polusi kota, dan debu.

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `udara` / `/udara/` |
| `kejadian.awalan` | `U` |
| `cron_worker` | T (data per jam cukup lewat Actions) |
| Workflow | `udara.yml` tiap 3 jam (CAMS 4 hari, stasiun), harian (riwayat, berita, dampak) |

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| ISPU resmi | KLHK (bila endpoint pulih; saat ini [BLOK]) | Didahulukan bila ada |
| Stasiun terukur | OpenAQ, WAQI (dengan atribusi) | Titik stasiun, label "terukur" |
| **ISPU dihitung Pantau Bencana** | PM2,5 dan PM10 CAMS, titik potong Permen LHK P.14/2020 | Label "perkiraan model, bukan ISPU resmi" |

Kategori ISPU: Baik 0–50, Sedang 51–100, Tidak Sehat 101–200, Sangat Tidak Sehat 201–300, Berbahaya > 300.
Titik potong Permen LHK P.14/2020 berlaku untuk **rata-rata 24 jam**: label kategori ISPU hanya
dipakai untuk rata-rata 24 jam bergulir. Nilai per jam disebut "PM2,5 per jam", bukan ISPU.
CAMS global ±40 km meremehkan polusi perkotaan; semua angka model diberi label
"indeks perkiraan model (resolusi ~40 km)" dan stasiun terukur selalu didahulukan.
Tingkat Pantau Bencana: Normal (Baik/Sedang), Waspada (Tidak Sehat), Siaga (Sangat Tidak Sehat), Awas (Berbahaya).

## 3. Kejadian

Episode: kabupaten/kota bersebelahan dengan rata-rata 24 jam bergulir PM2,5 perkiraan di kategori
Tidak Sehat atau lebih buruk, digabung jadi satu kode `U0001`. "Episode" (durasi dalam jam) dipisah
dari "kategori ISPU" (24 jam). Atribut: ISPU maks, polutan dominan, durasi, penduduk, sekolah,
**sumber dugaan** (asap karhutla bila ada kompleks api dalam 300 km arah datang angin 850 hPa;
debu; perkotaan), kompleks karhutla terkait (tautan ke `/k/K0001`).

## 4. Model dan uji balik

- **Model**: CAMS + koreksi bias per stasiun (regresi linear sederhana pada 30 hari terakhir);
  atribusi sumber asap dengan lintasan mundur sederhana memakai angin 850 hPa Open-Meteo.
- **Uji balik**: CAMS PM2,5 vs OpenAQ/WAQI di Jakarta, Palangka Raya, Pekanbaru, Jambi, Pontianak
  musim asap 2019 dan 2023; bias dan RMSE per musim; ketepatan kategori ISPU.
- **Kaitan karhutla**: korelasi titik panas 24 jam di arah datang angin vs PM2,5 (validasi murah;
  data titik sudah dimiliki).

## 5. Layar

- **Lapisan**: PM2,5, PM10, ISPU, CO, AOD, debu (CAMS), stasiun terukur, kompleks api karhutla
  (tautan lintas modul), angin 850 hPa.
- **Laci episode**: ISPU sekarang + 4 hari → stasiun terdekat (terukur) → polutan dominan →
  sumber dugaan + peta lintasan → saran kesehatan per kategori (sumber Kemenkes/KLHK) → sekolah dan
  fasilitas kesehatan → riwayat episode → bagikan.
- **Insight**: hari Tidak Sehat per kota per tahun, musim asap vs titik panas, bias model vs
  stasiun, tabel episode U.
- **Tren**: indeks risiko episode per kab, kalender musim (puncak Agustus–Oktober di Sumatra/Kalimantan).
- **Dampak**: bagian `udara`, `ispa_berita`, `sekolah_berita`, `internasional` di `scripts/data/dampak.py`
  dipakai bersama (diimpor, bukan dipindah; karhutla tidak berubah), ditambah polusi kota.
- **Stasiun WAQI**: hanya nilai terkini bertaut ke sumbernya, tanpa menyimpan atau menerbitkan seri
  (ketentuan WAQI melarang redistribusi massal). Seri stasiun hanya dari OpenAQ.
- **Simulasi**: A "jika angin berbalik": geser arah angin dan lihat kota yang terpapar asap dari
  kompleks aktif.
- **Posko**: T untuk posko lapangan; A untuk "ruang udara bersih" (sekolah/fasilitas dengan
  pemurni udara), bila data tersedia.

## 6. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga | Jenis karhutla `udara`/`sehat`/`ruang` dipindah ke bahaya `udara` (tetap tampil di karhutla) |
| Foto | Langit berasap, jarak pandang, masker, lainnya |
| Pop-up | Kota pengguna Tidak Sehat hari ini/besok |
| Berita | kabut asap, ISPU, polusi udara, ISPA, jarak pandang |

## 7. Daftar periksa (rencana awal)

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R CAMS + stasiun | A14 | R | A27 | A dipakai bersama `dampak.py` |
| A02 | R | A15 | R | A28 | R |
| A03 | T | A16 | R | A29 | R sekolah/RS |
| A04 | R episode U | A17 | R ENSO | A30 | R |
| A05 | R | A18 | R arsip CAMS sejak 2013 | A31 | R angin 850 hPa |
| A06 | R poligon episode | A19 | R | A32 | R AOD/citra asap |
| A07 | R | A20 | A ISPU KLHK bila pulih | A33 | R |
| A08 | R angin | A21 | A ruang udara bersih | A34 | R |
| A09 | R ISPU dihitung | A22 | T | A35 | R penerbangan (jarak pandang) |
| A10 | R prakiraan CAMS 4 hari | A23 | T | A36 | R |
| A11 | T | A24 | A biaya kesehatan | A37 | R |
| A12 | T | A25 | R | A38 | T |
| A13 | R | A26 | T | | |
| B01 | A koreksi bias | B02–B10 | R | | |
| C01–C22 | R | C23 | A simulasi arah angin | C24–C35 | R |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R | E01–E10 | R | F01–F04 | R |
