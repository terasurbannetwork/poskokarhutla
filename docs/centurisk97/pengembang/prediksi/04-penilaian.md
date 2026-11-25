# Penilaian, kalibrasi, koreksi bulanan

Halaman ini menjelaskan penilaian prospektif, kalibrasi peluang, dan koreksi bulanan banjir.

## Penilaian prospektif (`nilai.py`)

Prakiraan matang dinilai terhadap pengamatan; hasil ke `skor.json` dan `pasangan.json` (90 hari terakhir, untuk kalibrasi).

| Kode | Pengamatan dan kejadian | Keterangan |
| --- | --- | --- |
| HJN | Tahap sementara (sasaran sampai H+5): analisis model Open-Meteo, bukan observasi. Tahap final (H+6 ke atas): ERA5 per jam lewat Open-Meteo Archive. Kejadian = jumlah hujan >= ambang | Dua tahap tidak dicampur dalam satu skor. Kalibrasi hanya memakai tahap final |
| API | Lokasi unik keyakinan sedang atau tinggi di `hotspot.json` (7 hari bergulir), hari sepi dihitung nol; hari lama dari `titik_hari`. Sejak 24 November 2026 tiap hari lengkap disimpan ke `amatan/API.json` | Matang H+1 |
| BNJ, LSR | DIBI (`dibi_kejadian.json`) jenis banjir (Banjir, Banjir Bandang, Banjir Genangan, Banjir dan Tanah Longsor) dan longsor (Tanah Longsor, Gerakan Tanah, Banjir dan Tanah Longsor) | Hanya sasaran <= (DIBI `sampai` dikurangi 14 hari); sebelum itu "menunggu label" karena DIBI terisi susulan |
| ASP, ROB, GEL, CEX | Belum ada pengamatan | Status "menunggu" dengan alasan; tidak dinilai terhadap model sendiri. GEL dan CEX dilewati di pasangan (`TANPA_NILAI`, `nilai.py:49`) |

Pembanding wajib:

- **Persistensi**: kejadian pada hari lengkap terakhir sebelum terbit (`t - 1`).
- **Klimatologi**: frekuensi kejadian pada bulan kalender yang sama sebelum tanggal sasaran dalam arsip pengamatan sistem; per kab bila sedikitnya 10 hari teramati, selain itu nasional (`KLIM_MIN = 10`, `nilai.py:40`).

Ukuran: skor Brier, Brier skill score terhadap tiap pembanding, kurva keandalan (10 kotak), tabel kontingensi pada ambang peluang 0,5 (POD, FAR, CSI), galat absolut rata-rata jam mulai dan lama hujan. Untuk BNJ dan LSR, pasangan tanpa `ps` memakai `p = (level >= 2)` dan diberi asal `lv`, bukan peluang.

Aturan vonis (K17, `nilai.py:38`, `nilai.py:305`):

```
banding = pasangan yang punya model, persistensi, dan klimatologi sekaligus
bila n_banding < 30 atau jumlah HARI sasaran < 30        -> "belum teruji"
selain itu, bila batas bawah selang bootstrap 90% selisih Brier
     (baseline - model) > 0 untuk persistensi DAN klimatologi -> "mengalahkan baseline"
selain itu                                                  -> "belum mengalahkan baseline"
selang: 500 ulangan, bootstrap blok per hari sasaran, biji 1, persentil 5% dan 95%
```

Alasan perubahan 24 November 2026 (audit keandalan, `docs/audit-metode/2026-11-24/HASIL.md`): kab bertetangga dalam sehari saling berkorelasi, sehingga 30 kab-hari kurang dari satu hari data; vonis lama bolak-balik antara 12 dan 23 November. Setelah perubahan, pada data 23 November semua kode menjadi "belum teruji" (hujan 17 hari, banjir dan longsor 9 hari). Audit yang sama mencatat bahwa untuk HJN ambang 50 mm tidak ada peluang yang pernah mencapai 0,5 sehingga 76 kejadian terlewat, dan bahwa banjir (BNJ) pada 9 hari dinilai punya BSS klimatologi negatif.

Label lapangan (`label_regu`): konfirmasi regu BNJ dan LSR hanya mengisi sel yang belum berlabel DIBI (tahap "regu") dan tampil sebagai "tidak dibandingkan" karena hanya ada di lokasi kunjungan (bias seleksi). Laporan warga positif lemah (dihitung, bukan label); groundcheck karhutla hanya audit. Sel DIBI tidak pernah diubah oleh label regu.

## Kalibrasi peluang (`kalibrasi.py`)

Dicoba per (kode, ambang, tenggang) hanya pada tahap final; BNJ dilewati karena dimiliki `koreksi.py`.

- Uji = 14 tanggal sasaran terakhir; fit = sampai 46 tanggal sebelumnya (`kalibrasi.py:19`).
- Syarat dicoba: fit sedikitnya 30 pasangan dan 14 tanggal, uji sedikitnya 30 pasangan. Selain itu "menunggu".
- Metode: regresi isotonik (pool adjacent violators) pada fit; peta diterapkan dengan interpolasi linier.
- "dipakai" hanya bila Brier uji turun; kalau tidak "ditolak" dan layar memakai peluang mentah (fail-closed).
- Jumlah dan lama hujan: rasio bias per provinsi `sum(amatan)/sum(prakiraan)` dibatasi 0,5 sampai 2; dipakai hanya bila galat absolut rata-rata uji turun.

## Koreksi bulanan banjir (`koreksi.py`)

Sebulan sekali, kalibrasi isotonik BNJ dipasang pada jendela 120 hari matang, diuji pada 30 hari terakhir (holdout), dibanding kalibrasi aktif (belum ada berarti peluang mentah). Diganti hanya bila persentil 95% bootstrap blok per hari (1000 ulangan, biji 1) selisih Brier (kandidat dikurangi aktif) di bawah nol. Syarat: fit sedikitnya 30 pasangan, 14 hari, 10 kejadian; holdout sedikitnya 30 pasangan dan 20 kejadian di sedikitnya 5 hari. Label matang: DIBI sampai (DIBI `sampai` dikurangi 45 hari); logbook Pusdalops hanya menambah kejadian pada hari matang yang sama. Pasangan berasal `lv` disaring. Tiap keputusan ditambahkan ke `koreksi_riwayat.jsonl` (append-only, satu keputusan per grup per bulan); jalan ulang di bulan yang sama tidak bekerja. Konstanta di `koreksi.py:26`.
