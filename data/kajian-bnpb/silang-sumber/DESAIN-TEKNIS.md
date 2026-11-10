# DESAIN-TEKNIS: Silang Sumber

Python 3 stdlib, berkas keluaran JSON statis, layar vanilla JS tanpa build step. Tidak menyentuh worker, D1, migrasi, dan workflow. Langkah jadwal diusulkan ke `mekanik-mesin` (tiket SS-07).

## Berkas

| Fitur | Berkas | Isi | Pemilik |
| --- | --- | --- | --- |
| F1 | `scripts/bnpb/silang/rapor_sumber.py` | Pasangan, tabel a b c d, skor, arsip. `python3 -I ... uji` self-check tanpa jaringan. | ruang-bnpb |
| F1 | `public/data/bnpb/rapor_sumber.json` | Keluaran tampilan. | ruang-bnpb |
| F1 | `public/data/bnpb/rapor_sumber_arsip/YYYY-MM.jsonl` | Baris skor harian, append-only. | ruang-bnpb |
| F1 | `public/bnpb/rapor-sumber.html`, `.js`, `.css` | Layar. | ruang-bnpb |
| F3 | `scripts/bnpb/silang/beda_sumber.py`, `beda_sumber_peta.json` | Perbandingan dan pemetaan peringkat. | ruang-bnpb |
| F3 | `public/data/bnpb/beda_sumber.json`, `beda_sumber_arsip/YYYY-MM.jsonl` | Keluaran dan arsip. | ruang-bnpb |
| F3 | `public/bnpb/silang.js`, `.css` | Kartu tambahan. | ruang-bnpb |
| F2 | `scripts/gempa/tsunami_zona.py` | Kamus, tingkat per kabupaten, eksposur, ukur, garis waktu. | gempa |
| F2 | `public/gempa/data/zona_tsunami_kamus.json`, `tsunami_zona.json` | Kamus dan keluaran. | gempa |
| F2 | `public/gempa/tsunami_zona.js`, bagian `index.html` | Tab. Fungsi murni dipisah agar bisa diuji di Node. | gempa |
| F5 | `scripts/gempa/beruntun.py`, `beruntun_sasaran.json` | Mc, laju, kejutan, konfigurasi sasaran. | gempa |
| F5 | `public/gempa/data/beruntun.json`, `beruntun_arsip/YYYY-MM.jsonl` | Keluaran dan arsip. | gempa |
| F6 | `scripts/umum/kalender_ancaman.py` | Gabung laju dan narasi BMKG per kabupaten dan bulan. | pipa-umum |
| F6 | `public/data/kalender_ancaman.json` | Keluaran. | pipa-umum |
| F6 | `scripts/umum/profil_wilayah.py` (baca saja keluaran), kartu di `public/kemitraan/**` | Konsumsi. | kampus |
| Semua | `tests/bnpb/silang_*.test.mjs`, `tests/gempa/silang_*.test.mjs`, `tests/agen/gerbang-silang.test.mjs` | Uji. | penulis-gerbang |

Pemilik yang belum jelas di `ilmu.mjs pemilik` untuk `scripts/bnpb/silang/**` dan `tests/gempa/silang_*`: ditentukan saat SS-02 (daftarkan di `scripts/agents/roster.json` lewat mekanik-mesin).

## Skema `rapor_sumber.json`

```
{ versi: 1, dibuat: ISO WIB, hari_arsip: {<sumber>: n_hari},
  n_min: 30, dinilai_sampai: "YYYY-MM-DD",
  sel: [ { sumber, lembaga, bahaya, daerah: {tingkat: "nas"|"prov"|"kab", kode}, tenggang,
           kejadian: "DIBI"|"Logbook"|"SYNOP", a, b, c, d, n_kejadian,
           pod|null, far|null, csi|null, ets|null, status: "angka"|"n_kurang"|"belum_cukup",
           pembanding: {persistensi: {...}|null, klimatologi: {...}|null} } ],
  dilewati: [ {sumber, alasan} ], dibuang: n, catatan: [str] }
```

## Skema `beda_sumber.json`

```
{ versi: 1, dibuat, hari, ambang: {peringkat: 2, rasio: 2, lantai_m: 0.1},
  baris: [ { bahaya, tempat: {jenis: "kab"|"perairan", kode|nama}, hari,
             a: {sumber, lembaga, nilai, peringkat|null, diambil},
             b: {sumber, lembaga, nilai, peringkat|null, diambil},
             status: "perlu_dicek"|"selaras"|"tidak_dibandingkan", alasan } ],
  ringkas: {n_dibandingkan, n_perlu_dicek, per_bahaya: {}}, catatan: [] }
```

Tidak ada field "benar".

## Skema `tsunami_zona.json`

```
{ versi: 1, dibuat, kejadian: { <id>: { t, lat, lon, m, area, buletin: [ {id, terbit, subjek, m, n_zona} ],
    zona: [ {nama, provinsi, tingkat, epoch, kab: [{id, nama, sebagian: bool}] | [], dipetakan: bool} ],
    kab: { <id Kepmendagri>: {tingkat_tertinggi, zona: [nama], eksposur: {penduduk, sekolah, faskes, evakuasi}} },
    ukur: [ {stasiun, jam, tinggi_m|null, teks} ] } }, belum_dipetakan: [nama], catatan }
```

## Skema `beruntun.json`

```
{ versi: 1, dibuat, label: "Deteksi Centurisk97", bukan_prediksi: true, baseline: "relatif"|"historis:<sumber>",
  jendela: {mc_hari, deteksi_hari}, sasaran: [ {id, nama, jenis: "gunung_api"|"sesar", pusat, R_km,
     mc, n_di_atas_mc, N, harapan, p_koreksi|null, status: "perlu_dicek"|"biasa"|"data_kurang", magma: {...}|null} ] }
```

## Skema `kalender_ancaman.json`

```
{ versi: 1, dibuat, kab: { <id>: { <bahaya>: { bulan: [12 x { p, n, kecil, bmkg: {label, lembaga, periode, diambil}|null }] } } }, catatan }
```

## Aturan teknis

1. Pencocokan nama kabupaten lewat `scripts/umum/nama_wilayah.py`, bukan kode di berkas iklim (kode itu indeks internal). Kode Kepmendagri bertitik seperti "11.01" dicocokkan lewat id dengan pemeriksaan nama.
2. Penulisan atomik (tulis berkas sementara, ganti nama). Arsip dibuka mode tambah; baris hari yang sama tidak ditulis dua kali.
3. Sumber hilang atau basi tidak menggagalkan jalan: dicatat di `dilewati` atau `catatan`.
4. Tidak mengimpor dari `scripts/prediksi/**`.
5. Jalan ulang hari yang sama menghasilkan keluaran yang sama (deterministik).
