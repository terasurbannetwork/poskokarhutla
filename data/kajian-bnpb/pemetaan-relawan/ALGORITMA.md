# ALGORITMA: Kelengkapan dan prioritas

Semua ambang adalah **HIPOTESIS** (Q6, Q7) dan hidup di satu tempat, `scripts/pemetaan/konst.py` = `public/pemetaan/konst.js` (uji identik, sama seperti konvensi kemitraan).

## 1. Cakupan

Hanya kab yang punya paparan bahaya di profil Kemitraan (kunci kab4 lewat `public/data/kemitraan/kode.json`). Zona bahaya: poligon yang sama dengan Peta Paparan (`scripts/siklus/paparan.py`), bukan seluruh kab.

## 2. Kelengkapan (rasio)

Untuk tiap kab dan zona bahayanya:

- N_osm = jumlah bangunan OSM (`building=*`, poligon) dari ohsome pada tanggal data terbaru yang tersedia.
- N_pembanding = jumlah bangunan Google Open Buildings dengan keyakinan >= 0,70 pada zona yang sama (hitungan yang sudah ada di `scripts/umum/bangunan.py`).
- rasio = N_osm / N_pembanding. Bila N_pembanding kurang dari 100 maka rasio = null.

Peringatan metode yang selalu tampil: rasio membandingkan dua sumber yang sama-sama tidak sempurna. Open Buildings punya komisi dan omisi (`paparan.py:32`); rasio di atas 1 bisa berarti OSM lebih lengkap atau pembanding kurang, dan tidak ditampilkan sebagai 100 persen. Rasio dipotong 1,0 hanya untuk skor, tidak untuk tampilan.

Pembanding alternatif: Overture (OSM 80,5 persen di Jakarta) tidak dipakai sebagai pembanding karena sudah memuat OSM; memakainya menggembungkan rasio. Dicatat sebagai ranjau.

### Faktor pengganggu rasio

| Faktor | Efek |
| --- | --- |
| Open Buildings v3 positif palsu di perdesaan pada ambang 0,70 (`paparan.py:32`, `bangunan.py:34`) | N_pembanding membesar, rasio tampak rendah |
| Bangunan majemuk (satu poligon) lawan terpisah per rumah, kota lawan desa | Hitungan beda tanpa beda kelengkapan nyata |
| N_osm hanya poligon; titik (node) dan multipolygon tidak dihitung | Rasio terlalu rendah di area yang dipetakan sebagai titik |
| Cakupan Open Buildings beda antar wilayah | Pembanding tak setara antar kab |

Karena itu rasio dibaca per kelas, bukan angka tunggal antar kab kota dan desa.

## 3. Kelas

Rasio < 0,6 tipis; 0,6 sampai 0,85 sedang; > 0,85 memadai (HIPOTESIS Q6).

## 4. Prioritas

skor = paparan_norm x (1 - min(rasio, 1)), paparan_norm = jumlah bangunan pembanding dalam zona bahaya dibagi nilai tertinggi di antara kab terdaftar (0..1). Urut menurun; kab null di bawah. Tampil dengan pil "Belum diuji".

Uji kejujuran: ambil 10 kab berstrata (minimal 3 perkotaan dan 3 perdesaan), hitung rasio, lalu periksa manual 1 km persegi tiap kab terhadap citra; bila kelas mesin sesuai pada kurang dari 7 dari 10 maka pil tetap dan ambang direvisi.

## 5. Sumbangan per kampus

Per proyek dan hashtag: jumlah bangunan dibuat (diff elemen bangunan antara awal dan akhir menurut changeset berhashtag) dan jumlah hari aktif. Hanya agregat; jalur kueri ditentukan di HR-03. Selisih rasio kab (F-7) dihitung dari dua kali pencacahan N_osm dan tidak diklaim sepenuhnya akibat kampus.

## 6. Kesegaran

Data dianggap basi bila ujung rentang ohsome (`toTimestamp` dari metadata) lebih tua dari 180 hari terhadap hari ini. Saat ini ketertinggalan sekitar 110 hari (27 Jul 2026 per 15 Nov 2026), jadi belum basi; ambang dikalibrasi ulang di HR-03 dan tanggal data selalu tampil.
