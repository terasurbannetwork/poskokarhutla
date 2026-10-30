# Label banjir 20 tahun (intensitas + dampak)

Skrip: `scripts/banjir/label_banjir.py` (`ambil`, `gs`, `susun`, `uji`). Cache mentah dan `label.json` di `data/raw/banjir/label20/` (tidak dilacak git).

Sumber dan jangkauan nyata:
- DIBI BNPB (superset): banjir + bandang + banjir-longsor + genangan, kab-hari dengan dampak. Data mulai **2008** (sebelum itu kosong), 2008-2015 hanya 430-1.060 kejadian/tahun, 2020+ 1.300-3.000.
- Google Groundsource (Zenodo 10.5281/zenodo.18647053, CC BY 4.0; 2,65 jt kejadian global, polygon WKB, tanpa atribut dampak). Indonesia ~25 rb poligon; **tipis sebelum 2013 (<120/tahun), memadai 2016+ (~1.000-4.600/tahun), berhenti 29 Jan 2026**. Titik = rata-rata simpul cincin luar, dipetakan ke kab dengan titik-dalam-poligon (kab-kode dari nama DIBI/logbook). Parquet 667 MB tidak di-commit; dibaca dengan pyarrow di venv sementara, hasil `gs_idn.json` -> `gs_kab.json` (stdlib).
- Logbook Pusdalops 2026 (mulai di data 2025): tinggi air cm, durasi, KK, rumah, jiwa.
- Berita suplemen 2026: Google News RSS per kab prioritas (maks 100 artikel/kueri, 2026 saja), GDELT DOC **diblokir 429** dari IP ini sehingga dilewati. Geoparsing = `Geo` milik `scripts/umum/berita.py`; angka kedalaman/KK/rumah dari regex di judul+cuplikan (RSS hampir hanya judul, jadi miskin).
- Cakupan 20 tahun (2005-2026) praktisnya: label berdampak 2008-2026 (DIBI), label lokasi-tanggal dari berita 2016-Jan 2026 (GS), kedalaman/durasi hanya 2025-2026 (logbook). 2005-2007 nyaris kosong.

Aturan cocok: kab sama dan selisih tanggal <= 2 hari = satu kejadian; gugus berantai dipotong 30 hari. Konflik ditandai: tma logbook vs berita >3x, rumah logbook vs DIBI terendam >5x, rentang >14 hari.

Catatan mutu: Groundsource ~82% presisi (klaim penulis, belum divalidasi di sini); DIBI cuma kab-hari yang dilaporkan; irisan DIBI-GS 2016-2025 rendah (hanya ~31% kejadian DIBI punya padanan GS) sehingga kedua sumber saling melengkapi, bukan saling mengonfirmasi.

<!-- ringkasan:mulai -->
## Ringkasan (dibangkitkan `label_banjir.py susun`)

Kejadian: 26800; konflik antar-sumber: 92.

Rekaman mentah per tahun per sumber (kejadian = gugus tanggal, bukan jumlah ini):

| tahun | dibi | logbook | gs | berita |
| --- | --- | --- | --- | --- |
| 2002 | 0 | 0 | 3 | 0 |
| 2003 | 0 | 0 | 1 | 0 |
| 2005 | 0 | 0 | 3 | 0 |
| 2006 | 0 | 0 | 13 | 0 |
| 2007 | 0 | 0 | 10 | 0 |
| 2008 | 458 | 0 | 9 | 0 |
| 2009 | 495 | 0 | 36 | 0 |
| 2010 | 1075 | 0 | 82 | 0 |
| 2011 | 578 | 0 | 99 | 0 |
| 2012 | 590 | 0 | 121 | 0 |
| 2013 | 758 | 0 | 352 | 0 |
| 2014 | 598 | 0 | 412 | 0 |
| 2015 | 513 | 0 | 357 | 0 |
| 2016 | 822 | 0 | 948 | 0 |
| 2017 | 961 | 0 | 1096 | 0 |
| 2018 | 869 | 0 | 1027 | 0 |
| 2019 | 776 | 0 | 997 | 0 |
| 2020 | 1569 | 0 | 1987 | 0 |
| 2021 | 1797 | 0 | 2286 | 0 |
| 2022 | 1496 | 0 | 2571 | 0 |
| 2023 | 1221 | 0 | 2137 | 0 |
| 2024 | 1490 | 0 | 3387 | 0 |
| 2025 | 2764 | 47 | 4601 | 0 |
| 2026 | 710 | 480 | 700 | 4751 |

Irisan (baris: sumber; kolom: berapa kejadiannya juga dikonfirmasi sumber lain):

```
{
 "dibi": {
  "n": 16759,
  "dibi": 16759,
  "logbook": 355,
  "gs": 4073,
  "berita": 327
 },
 "logbook": {
  "n": 490,
  "dibi": 355,
  "logbook": 490,
  "gs": 81,
  "berita": 229
 },
 "gs": {
  "n": 12851,
  "dibi": 4073,
  "logbook": 81,
  "gs": 12851,
  "berita": 95
 },
 "berita": {
  "n": 1512,
  "dibi": 327,
  "logbook": 229,
  "gs": 95,
  "berita": 1512
 }
}
```

Irisan 2016-2025:

```
{
 "dibi": {
  "n": 11565,
  "dibi": 11565,
  "logbook": 38,
  "gs": 3623,
  "berita": 10
 },
 "logbook": {
  "n": 43,
  "dibi": 38,
  "logbook": 43,
  "gs": 32,
  "berita": 7
 },
 "gs": {
  "n": 11546,
  "dibi": 3623,
  "logbook": 32,
  "gs": 11546,
  "berita": 11
 },
 "berita": {
  "n": 12,
  "dibi": 10,
  "logbook": 7,
  "gs": 11,
  "berita": 12
 }
}
```

Irisan 1 Okt 2025 - 29 Jan 2026 (jendela logbook x gs):

```
{
 "dibi": {
  "n": 619,
  "dibi": 619,
  "logbook": 110,
  "gs": 304,
  "berita": 75
 },
 "logbook": {
  "n": 133,
  "dibi": 110,
  "logbook": 133,
  "gs": 81,
  "berita": 61
 },
 "gs": {
  "n": 1011,
  "dibi": 304,
  "logbook": 81,
  "gs": 1011,
  "berita": 95
 },
 "berita": {
  "n": 201,
  "dibi": 75,
  "logbook": 61,
  "gs": 95,
  "berita": 201
 }
}
```

Kejadian berbekal: {"kedalaman": 247, "durasi_hari_logbook": 196, "rentang_>1hari": 8772, "kk": 500, "rumah": 11383, "meninggal_dibi": 1167, "terdampak_dibi": 9572}
<!-- ringkasan:akhir -->
