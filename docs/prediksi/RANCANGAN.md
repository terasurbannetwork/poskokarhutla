# Rancangan /prediksi

Kontrak kerja halaman `centurisk97.id/prediksi`. Pengerja: `prediksi` (roster).
Riset pendukung: `docs/riset/reports/Prediksi bencana non alam dan sosial.md`.

## Keputusan pemilik (29 Okt 2026)

1. Halaman di balik login dulu (tidak masuk `PUBLIK_TANPA_SESI`). Dibuka per
   jenis prediksi setelah rapor skill-nya cukup panjang (±60 hari) dan lolos.
2. Self-loop: kalibrasi otomatis harian **berpenjaga**. Koreksi hanya dipakai
   bila lebih baik pada 14 hari uji tahan; kalau tidak, kembali ke mentah.
   Kriteria model yang sudah dikunci (PRAREG-PROSPEKTIF, `KRITERIA_SHA256`)
   tidak disentuh.
3. Konfirmasi lapangan lewat (a) form web staf/regu pola `/lapangan` dan
   (b) laporan warga yang sudah ada, dicocokkan otomatis sebagai konfirmasi
   lemah. Tanpa bot WA.
4. Urutan: fase 1 prediksi yang bisa dicek sendiri esok hari; fase 2
   konfirmasi lapangan; fase 3 dampak lanjutan (IBF).
5. Yang data publiknya tidak bisa diambil, tidak dibuat.

## Prinsip

- Satuan wilayah: kab/kota (514), tenggang +1, +2, +3 hari. Tanggal WIB.
- Prediksi dibekukan sebelum kejadian, append-only. Arsip yang menyusut =
  keluar kode 3 (pola `scripts/banjir/prospektif.py`).
- Tiap angka di layar punya skor. Baseline wajib: persistensi ("besok sama
  dengan hari ini") dan klimatologi (frekuensi bulan yang sama). Prediksi yang
  kalah dari baseline ditampilkan berlabel "belum mengalahkan baseline".
- Python 3.12 stdlib, tiap skrip punya `uji`. Satu workflow harian.

## Fase 1: prediksi yang diverifikasi sendiri

| Kode | Prediksi per kab, besok s.d. +3 | Sumber prakiraan (sudah ada) | Pengamatan untuk menilai | Matang |
|---|---|---|---|---|
| HJN | Peluang hujan ≥1 / ≥20 / ≥50 mm; **jam mulai**, **lama hujan (jam)**, total mm | Open-Meteo per jam di titik pusat kab; peluang ensemble dari `public/banjir/data/hujan_ansambel.json` | Sementara H+1: Open-Meteo analisis hari 0 (bukan observasi, berlabel). Final H+6: ERA5 per jam lewat Open-Meteo Archive | H+1 / H+6 |
| API | Peluang ≥1 hotspot (lokasi unik, sedang/tinggi) di kab | `public/data/fwi_ansambel.json` (pt/ps) + hotspot 3 hari terakhir | FIRMS hari berikutnya | H+1 |
| BNJ | Level banjir maks kab (Normal–Awas), P(Siaga+) | `public/banjir/data/status.json`, `prospektif.json` | DIBI (telat beberapa hari) + konfirmasi fase 2 | H+14 |
| LSR | Level longsor maks kab | `status.json` (`ll`) | DIBI longsor + konfirmasi fase 2 | H+14 |
| ASP | Kategori ISPU PM2,5 besok | `public/udara/data/prakiraan.json` | Stasiun yang dipanen modul udara | H+1 |
| ROB | Muka laut melewati ambang p95 titik | `public/banjir/data/rob.json` | Pasut IOC yang dipanen `rob.py` | H+1 |

"Kapan & berapa lama hujan": dari prakiraan per jam, `mulai` = jam pertama
≥0,5 mm, `lama` = jumlah jam ≥0,5 mm, `puncak` = jam dengan hujan terbesar.
Dinilai dengan galat absolut jam mulai, galat lama (jam), dan Brier ambang.

## Self-loop

```
catat.py      (tiap pagi) bekukan prediksi hari ini → public/prediksi/data/arsip/YYYY-MM.jsonl
nilai.py      (tiap pagi) prediksi yang matang → pasangkan pengamatan → skor.json
kalibrasi.py  per (kode, ambang, tenggang): fit 46 hari, uji 14 hari terakhir;
              pakai bila Brier uji turun dan n ≥30; kalau tidak "ditolak", pakai mentah
terbit.py     gabung → public/prediksi/data/prediksi.json (yang tampil)
```

Kalibrasi peluang: regresi isotonik (PAV, stdlib). Kalibrasi jumlah/lama
hujan: rasio bias bergulir per provinsi (dibatasi 0,5–2). `kalibrasi.json`
mencatat tiap keputusan (dipakai/ditolak, Brier sebelum/sesudah, n).

## Aturan "jika ini maka ini" (`scripts/prediksi/aturan.json`)

Aturan deterministik, tiap baris punya sumber ambang: banjir (hujan ≥50 mm +
tanah jenuh + bahaya InaRISK tinggi), longsor (hujan ≥100 mm/24 j atau
3 hari ≥150 mm di kec bahaya longsor tinggi), karhutla (FWI P(≥14) ≥0,6 +
tanpa hujan + gambut), asap (ISPU "Tidak sehat"), hari tidak melaut
(gelombang ≥1,25 m / angin ≥15 kn).

Kebutuhan untuk jiwa yang diperkirakan mengungsi (jiwa terpapar × laju
pengungsian historis DIBI), standar Sphere 2018: air 15 L/orang/hari, hunian
3,5 m²/orang, 1 jamban per 20 orang, pangan 2.100 kkal/orang/hari. Label:
"perkiraan, belum diuji balik".

## Fase 2: konfirmasi lapangan

- D1 `prediksi_konfirmasi` (`migrations/0079_prediksi_konfirmasi.sql`).
- `POST /api/prediksi/konfirmasi` (header `x-kode-regu` atau sesi staf, batas
  laju 120/jam/IP), `GET` untuk pipeline dengan `PIPA_TOKEN` (`src/prediksi.js`).
- Laporan warga dicocokkan per kab-tanggal sebagai konfirmasi positif lemah;
  tidak pernah dipakai sebagai bukti "tidak terjadi".

## Fase 3: dampak lanjutan (IBF), belum dibangun

| Usulan | Data terbuka | Catatan |
|---|---|---|
| Kerusakan bangunan gempa (kurva fragilitas HAZUS) | GMPE yang ada + Open Buildings | Uji ulang Palu 2018, Cianjur 2022 |
| Titik rawan putus jalan/jembatan per kec | OSM, algoritma graf klasik | Peta paparan, bukan peluang putus |
| Kedalaman genangan nasional | Model tangki M1 baru Jakarta | Perluas setelah M1 lolos |
| Run-up tsunami & waktu evakuasi | Skenario statis literatur/InaRISK | Bukan prakiraan |

Dicoret karena data tidak terbuka (keputusan 5): kekurangan tempat tidur RS,
peluang jembatan putus per jam, kerugian ekonomi PDRB/lahan produktif.

## Layar

`public/prediksi/index.html` (rute `/prediksi` di `HTML_RUTE`, butuh login),
tautan di menu lewat `public/inti/kepala.js`. Tab **Besok**, **Rapor**,
**Konfirmasi**. Pakai `public/inti/*`; tidak menyalin CSS/JS antarmodul.
