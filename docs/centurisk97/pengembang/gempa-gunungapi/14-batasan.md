# Batasan dan perbedaan dokumen

Halaman ini memuat perbedaan dokumen dan kode, batasan model, dan hal yang sengaja tidak dibahas.

## Perbedaan dokumen dan kode (kode menang)

- Ilmu agent `gempa` (baris Model, 16 Okt) menulis parameter susulan a -1,67, b 0,91, p 1,08. Kode dan `model_susulan.json` memakai a -2,8369, b 1,192, p 0,9 (kasus 24 Nov 2026 sudah mencatatnya). Ilmu yang sama juga menyebut "belum ada kode" dan "tidak ada `gempa.yml`"; kini `gempa.yml` dan seluruh pipa ada.
- `lintas.yml:359` menyebut `beruntun.py` belum dirantai, padahal sudah dipanggil di `lintas.yml:372`.
- Ilmu `gempa` (kasus 19 Okt) menyebut tab `kejadian` belum ada di registri; kini ada di `public/bencana.json`.
- `model_guncangan.json` menulis `kinerja_uji.status = "belum_diuji"` dengan alasan arsip D1 belum ada; sejak PB-51 uji prospektif sudah berjalan di `prospektif_gempa.json` meski cacahnya kecil.
- Paket tsunami-genangan, lereng-bangunan, dan EWS: semua file rencana di `DESAIN-TEKNIS.md` (`tsunami_sumber.py`, `genangan.js`, `src/alat.js`, `pantau_alat.js`, migrasi geofon) belum ada di repo. Yang ada hanya sebagian paket lereng (LT-03, LT-04, LT-06, LT-07, LT-12).
- Ilmu `gunungapi-kering` (15 Nov 2026) mencatat `pop/<id>.json` hanya 30 dari 69 gunung dan uji `sim_tanggap` gagal. Keduanya sudah usang: pada 24 Nov 2026 `node --test tests/gunungapi/sim_tanggap.test.mjs` lulus 15 dari 15 dan `public/gunungapi/data/pop/` berisi 69 berkas, sama dengan 69 gunung.
- Nilai hujan-saja pada uji longsor berbeda antarcatatan (0,704 pada 29 Okt di ilmu longsor lawan 0,6812 pada `uji_balik.json` 3 Nov); angka yang dipakai di sini dari berkas terbaru.

## Batasan model

- Tidak ada ramalan gempa utama, letusan, atau longsor. Peluang susulan, laju 12 bulan, gempa beruntun, dan seluruh status kekeringan adalah hipotesis atau indikator, bukan peringatan.
- Gempa: BMKG dan USGS berbeda magnitudo beberapa persepuluh dan USGS memuat jenis magnitudo campur; susulan M kecil batas bawah; slip seragam, tanpa arah patahan, tanpa efek tapak kecuali proksi lereng; kerusakan dan korban meleset beberapa kali lipat per kejadian; tsunami linear tanpa pecah gelombang dan tanpa genangan darat, resolusi sekitar 5,5 km.
- Gunung api: arah abu belum terbukti di atas acak (n = 4); jejak kosong bukan berarti tidak ada abu; lahar dan awan panas tanpa kalibrasi dan tidak memisahkan lembah di bawah 80 m; paparan penduduk dari WorldPop 1 km; sekolah dan fasilitas kesehatan hanya provinsi yang datanya ada.
- Longsor: model gagal uji tiga kali melawan klimatologi kabupaten kali bulan; keterbatasan label (laju lapor antarkabupaten, DIBI 2024 tidak lengkap) dan hujan 0,5 derajat terlalu kasar. Panen hujan baru 515 dari 948 sel (kuota harian Open-Meteo).
- Kekeringan: ambang gagal uji balik dengan FAR di atas 0,9; DIBI hanya 26 persen kabupaten pernah melapor sehingga FAR adalah batas atas; data sawah tidak ada; sekolah dan fasilitas hanya 9 provinsi prioritas karhutla.
- Pesisir: belum dikoreksi pasang surut; hanya 5 situs pantura; rob tanpa arsip pada 22 dari 66 titik; tanpa zona genangan.

## Hal yang sengaja tidak dibahas

Karhutla dan banjir (modul lain), pelaporan warga dan foto (`warga-api`), tangga peringatan `/prediksi`, silang sumber `/bnpb/silang`, dan operasi lintas bencana (`/operasi`) hanya disinggung lewat rujukan. Rute dan tabel Lapor Warga, Foto, dan peringatan EWS email (`src/ews.js`) tidak diuraikan.
