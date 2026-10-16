# Kekeringan

Pengerja: `kekeringan`. Urutan: 6. Data lambat, tidak butuh jalur cepat. Banyak bahan sudah ada:
`tanah.json` (kelembapan tanah vs iklim), DC FWI, InaRISK kekeringan, kejadian DIBI `kering`,
`iklim.json` (ONI/DMI), arsip titik panas (validasi murah).

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `kekeringan` / `/kekeringan/` |
| `kejadian.awalan` | `D` |
| `cron_worker` | T |
| Workflow | `kekeringan.yml` harian (HTH, SPI, kelembapan tanah); mingguan (prospek musiman) |

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| Peringatan dini kekeringan BMKG | Buletin dasarian (endpoint lama 404, [BV]) | Didahulukan bila bisa dipanen |
| **HTH dihitung** | Hujan harian ERA5 | Kelas BMKG: Sangat Pendek 1–5, Pendek 6–10, Menengah 11–20, Panjang 21–30, Sangat Panjang 31–60, Kekeringan Ekstrem > 60 hari [BV: cocokkan dengan buletin BMKG sebelum tayang]. Definisi "hari tanpa hujan" (ambang mm/hari) ditulis di Metode |
| **SPI-1/3/6** | idem | ≤ −2 ekstrem, ≤ −1,5 parah, ≤ −1 sedang |
| Tingkat Pantau Bencana | Waspada (HTH > 30 atau SPI-3 ≤ −1), Siaga (HTH > 45 atau SPI-3 ≤ −1,5), Awas (HTH > 60 atau SPI-3 ≤ −2) | Hipotesis, dikunci uji balik |

## 3. Kejadian

Kompleks kekeringan: kabupaten bersebelahan dengan tingkat ≥ Waspada, digabung (pola DBSCAN
karhutla). Kode `D`. Atribut: luas, durasi, HTH maks, SPI, kelembapan tanah persentil, penduduk,
luas sawah/kebun (bila data terbuka), sumber air (waduk, bila ada), titik panas di dalamnya
(tautan karhutla), kejadian DIBI kering sebelumnya.

## 4. Model dan uji balik

- **SPI**: sebaran gamma dengan estimasi MLE (pendekatan Thom), CDF lewat **fungsi gamma tidak
  lengkap yang ditulis sendiri** (deret untuk x kecil, pecahan berlanjut untuk x besar; stdlib tidak
  menyediakannya, `math.erf` saja tidak cukup), lalu transformasi ke normal baku. `uji` mencocokkan
  dengan nilai tabel terbitan. Per kabupaten dulu, per sel 0,25° belakangan.
- **Sumber hujan: ERA5 (Open-Meteo) saja.** CHIRPS `.tif.gz` 0,05° global per hari terlalu berat
  diurai dengan stdlib. Klimatologi 1991–2020 diunduh **bertahap beberapa hari** dan dicache, karena
  panggilan rentang panjang dihitung berbobot dan bisa melewati 10.000 panggilan/hari.
- **Prospek musiman**: tabel anomali hujan bersyarat fase ENSO/IOD per provinsi per bulan dari
  1981–2020; keluaran peluang tiga kategori (di bawah/normal/di atas normal).
- **Uji balik**: SPI dan tingkat vs tahun kering terkenal (1997, 2015, 2019, 2023), vs kejadian DIBI
  `kering`, dan vs titik panas karhutla (korelasi musim kering parah ↔ titik panas tinggi);
  prospek musiman diuji dengan skor Brier per tahun 2001–2025 (validasi silang tinggal-satu-tahun).

## 5. Layar

- **Lapisan**: HTH, SPI-1/3/6, kelembapan tanah persentil, prospek musiman, InaRISK kekeringan,
  titik panas (lintas modul), waduk/bendungan.
- **Laci kompleks**: tingkat + angka → peta HTH/SPI → kelembapan tanah → prospek 1–3 bulan →
  penduduk dan lahan pertanian → sumber air → titik panas di dalamnya → riwayat kekeringan →
  saran (pedoman BNPB/Kementan) → bagikan.
- **Insight**: luas wilayah per kelas SPI dari waktu ke waktu, kekeringan vs ENSO sejak 1981,
  kekeringan vs titik panas, kinerja prospek, tabel kompleks D.
- **Tren**: indeks risiko riwayat, kalender musim kemarau per dasarian.
- **Dampak**: penduduk terdampak, sawah puso (bila data Kementan terbuka), air bersih, kaitan
  karhutla, kerugian.
- **Simulasi**: A "jika hujan X mm dalam 30 hari": hitung ulang HTH/SPI.
- **Posko**: titik distribusi air bersih (greedy coverage desa tingkat ≥ Siaga), kebutuhan tangki
  air per 1.000 jiwa (Sphere: 15 liter/orang/hari).

## 6. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga | `air` (sumur kering, PDAM mati, butuh air), `panen` (gagal panen) |
| Foto | sawah kering, sumur/sungai kering, distribusi air, lainnya |
| Pop-up | Kabupaten pengguna naik tingkat, HTH terpanjang |
| Berita | kekeringan, krisis air bersih, gagal panen, kemarau panjang |

## 7. Daftar periksa (rencana awal)

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R ERA5 (CHIRPS ditunda) | A14 | R | A27 | R |
| A02 | A 30/90/180 hari | A15 | R | A28 | R |
| A03 | T | A16 | R | A29 | R |
| A04 | R kompleks D | A17 | R ENSO/IOD inti | A30 | R |
| A05 | R | A18 | R ERA5 sejak 1981 | A31 | T |
| A06 | R poligon kabupaten | A19 | R | A32 | A NDVI bila memungkinkan, jika tidak T |
| A07 | R | A20 | A buletin BMKG | A33 | R |
| A08 | R | A21 | A titik air bersih | A34 | R |
| A09 | R HTH + SPI | A22 | R tangki air | A35 | A pertanian |
| A10 | A prospek musiman | A23 | T | A36 | R |
| A11 | R kelembapan tanah | A24 | R | A37 | R |
| A12 | T | A25 | R embung/sumur bor | A38 | R waduk |
| A13 | R | A26 | T | | |
| B01 | R SPI + prospek | B02–B10 | R | | |
| C01–C22 | R | C23 | A simulasi hujan | C24–C35 | R |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R | E01–E10 | R | F01–F04 | R |
