# Cuaca ekstrem (angin kencang, puting beliung, hujan es, petir, siklon, gelombang tinggi)

Pengerja: `cuaca`. Urutan: 3. Gelombang tinggi dilebur ke sini sebagai lapisan dan jenis kejadian
(saran riset: tidak ada kebenaran lapangan resmi yang cukup untuk modul sendiri; keputusan akhir
menunggu pemilik, ARSITEKTUR "Keputusan" butir 2).

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `cuaca` / `/cuaca/` |
| `kejadian.awalan` | `C` |
| `cron_worker` | tiap 5 menit: BMKG nowcast RSS + CAP baru; tiap 30 menit: GDACS TC |
| Workflow | `cuaca.yml` tiap 6 jam (indeks, ansambel, gelombang); harian (riwayat, berita, dampak) |

Banyak bahan sudah ada: `scripts/banjir/peringatan.py` (nowcast CAP + gelombang BMKG Maritim),
`scripts/banjir/hujan.py` (embusan `g`, CAPE, intensitas), partikel angin di peta banjir,
kejadian DIBI jenis `cuaca` dan `gelombang`. Semuanya dipindah atau dipakai dari `scripts/umum/`.

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| Peringatan dini resmi | BMKG nowcast CAP (kata dan warna asli BMKG) | Poligon di peta dan pita di laci, dengan jam berlaku. Didahulukan, tidak ditafsirkan ulang |
| Gelombang resmi | BMKG Maritim kelas Rendah–Luar Biasa | idem untuk wilayah perairan |
| Siklon | GDACS TC + IBTrACS (sejarah) | Lintasan, kategori |
| **Tingkat Pantau Bencana** | Aturan §4 per kecamatan, 72 jam | Normal / Waspada / Siaga / Awas |

## 3. Kejadian

Tiga jenis kejadian dengan awalan bersama `C`:

1. **Peringatan CAP** BMKG: satu CAP = satu kejadian (poligon, jenis, jam berlaku).
2. **Sel ekstrem prakiraan**: kecamatan bersebelahan yang melewati ambang §4 di jam yang sama,
   digabung (pola DBSCAN karhutla di kisi kecamatan).
3. **Siklon tropis**: satu sistem = satu kejadian (lintasan, tekanan pusat, angin maks).

Atribut: jenis, ambang yang dilewati, embusan maks, hujan maks 1 jam/3 jam, CAPE, LI, tinggi
gelombang maks, kecamatan, penduduk, fasilitas, pelabuhan (untuk gelombang), riwayat kejadian
DIBI sejenis di kecamatan itu.

## 4. Aturan tingkat (hipotesis awal; dikunci oleh uji balik)

| Bahaya | Waspada | Siaga | Awas |
| --- | --- | --- | --- |
| Embusan angin | ≥ 15 m/s | ≥ 20 m/s | ≥ 25 m/s |
| Badai guntur (proksi) | CAPE ≥ 1.000 dan LI ≤ −2 | CAPE ≥ 1.500 dan LI ≤ −3 | + hujan ≥ 50 mm/3 jam |
| Hujan lebat | ≥ 50 mm/hari | ≥ 100 mm/hari | ≥ 150 mm/hari (sama dengan kelas BMKG) |
| Gelombang (Hs) | ≥ 2,5 m | ≥ 4 m | ≥ 6 m (kelas BMKG) |

Tingkat = maksimum bahaya di atas. **Peringatan BMKG tidak dipetakan ke tingkat Pantau Bencana**:
CAP memakai skala standar Minor/Moderate/Severe/Extreme dan isi CAP BMKG belum diverifikasi, jadi
pemetaan ke Waspada/Siaga/Awas adalah tafsiran ulang data resmi (melanggar ARSITEKTUR §2 butir 5).
Peringatan BMKG tampil sebagai peringatan BMKG, dengan warna dan kata aslinya, di lapisan resmi.
Pemetaan baru dipertimbangkan setelah contoh CAP nyata diverifikasi, dan hanya boleh menaikkan.

## 5. Model dan uji balik

- **Model**: aturan ambang di atas Open-Meteo per jam + ansambel ECMWF untuk peluang melewati
  ambang (pola A10 karhutla). Tidak ada model ML di rilis pertama.
- **Uji balik**: ERA5 (Open-Meteo archive) pada tanggal kejadian DIBI puting beliung, angin kencang,
  dan gelombang pasang 2010–2026 per kabupaten vs hari acak; POD, FAR, CSI, PSS. Latih 2010–2019,
  validasi 2020–2022, uji 2023–2026.
- **Ekspektasi jujur**: sel badai dan puting beliung jauh lebih kecil dari sel ERA5 0,25°, jadi POD
  untuk puting beliung diperkirakan rendah. Ini ditulis di Batasan dan ditampilkan apa adanya;
  ambang tidak disetel supaya angkanya kelihatan bagus.
- **Prospektif**: tiap run 6 jam mencatat kecamatan Siaga/Awas; dinilai terhadap CAP BMKG dan DIBI.

## 6. Layar

- **Lapisan**: poligon CAP, embusan angin (partikel, sudah ada di banjir), CAPE, hujan per jam,
  gelombang (Open-Meteo Marine), lintasan siklon, petir (bila ada sumber terbuka; jika tidak, T).
- **Laci**: status resmi (CAP/gelombang) → kondisi sekarang → prakiraan 72 jam per jam (grafik
  embusan, hujan, gelombang) → penjelasan tingkat → tindakan (pedoman BMKG) → respons terdekat →
  pelabuhan dan penerbangan terdampak → riwayat kejadian sejenis → bagikan.
- **Insight**: peringatan BMKG per provinsi 30 hari, kejadian DIBI puting beliung per bulan dan
  tren, siklon yang memengaruhi Indonesia sejak 1980 (IBTrACS), kinerja aturan, tabel kejadian C.
- **Tren**: indeks risiko riwayat puting beliung/angin; **kalender musim** per dasarian (A16 berlaku:
  puting beliung memuncak di peralihan musim).
- **Dampak**: penduduk dalam poligon, sekolah, pelabuhan dan penyeberangan (gelombang), penerbangan,
  rumah rusak historis per kejadian.
- **Simulasi**: T (tidak ada model fisik yang jujur untuk sel badai di stdlib). Ganti dengan
  "Prakiraan per jam di titik mana pun" (klik peta → grafik 72 jam).
- **Posko/sarana**: titik kumpul dan kebutuhan atap darurat (terpal, seng) per rumah rusak, dengan
  koefisien bersumber.

## 7. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga | `angin` (pohon tumbang, atap terbang, puting beliung terlihat), `hujan_es`, `gelombang` (sub: tinggi, masuk darat). Lencana "cocok dengan peringatan BMKG" bila di dalam poligon CAP aktif |
| Foto | angin & pohon tumbang, puting beliung, hujan es, gelombang, kerusakan, lainnya |
| Pop-up situasi | Peringatan BMKG aktif di provinsi, gelombang ≥ 2,5 m, siklon aktif |
| Berita | puting beliung, angin kencang, cuaca ekstrem, hujan es, gelombang tinggi, siklon |
| OG | `/cuaca/`, per CAP, per provinsi |

## 8. Daftar periksa PAKET-FITUR (rencana awal)

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R CAP + Open-Meteo | A14 | R | A27 | R |
| A02 | R peringatan 24/72/7 hari | A15 | R | A28 | R |
| A03 | R cron 5 menit | A16 | R musim peralihan | A29 | R |
| A04 | R 3 jenis kejadian | A17 | R ENSO/MJO memengaruhi | A30 | R |
| A05 | R | A18 | R DIBI + IBTrACS | A31 | R grafik per jam |
| A06 | R poligon CAP / sel | A19 | R | A32 | T awan menutup citra optik |
| A07 | R | A20 | R CAP + Maritim | A33 | R |
| A08 | R | A21 | A titik kumpul | A34 | R |
| A09 | A indeks ambang gabungan | A22 | A terpal/atap | A35 | R pelayaran + penerbangan |
| A10 | R ansambel | A23 | T | A36 | R `factsheet_cuaca.json` |
| A11 | T | A24 | R | A37 | R |
| A12 | T | A25 | A pemangkasan pohon, atap | A38 | T |
| A13 | R §4 | A26 | T | | |
| B01 | A aturan ambang | B05 | R | B09 | R |
| B02 | R §5 | B06 | R | B10 | R `RISET-AMBANG.md` |
| B03 | R | B07 | R grafik per jam | | |
| B04 | R kejadian besar | B08 | R dari ansambel | | |
| C01–C22 | R | C23 | T (diganti prakiraan per titik) | C24–C35 | R |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R | E01–E10 | R | F01–F04 | R |
