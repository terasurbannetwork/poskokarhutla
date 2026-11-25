# Hujan, ansambel, debit, dan bahaya

Halaman ini menjelaskan metode prakiraan hujan, ansambel, debit sungai, dan indeks bahaya.

Konvensi: "uji balik" memakai data lampau (retrospektif). "Uji prospektif" mencatat prakiraan sebelum kejadian dan menilainya sesudahnya. Catatan prospektif bersifat tambah-saja dan tidak pernah diubah.

![Alur data banjir: lima sumber masuk ke skrip di scripts/banjir lalu menjadi berkas di public/banjir/data; jalur penurunan tanah belum tayang](gambar/banjir-alur-data.svg)

## 1. Prakiraan hujan harian (`scripts/banjir/hujan.py`)

- Sumber: Open-Meteo forecast, kisi darat 0,25 derajat (sekitar 2.930 sel), tujuh hari lalu dan tujuh hari ke depan, zona Asia/Jakarta.
- Per sel: hujan harian `h`, peluang hujan `p`, lama hujan `jam`, hembusan angin `g`, jumlah 3 hari bergeser terbesar `h3`, hujan anteseden `a7` (jumlah 7 hari teramati terakhir), intensitas per jam terbesar `imax`, CAPE maksimum `cape`, kelembapan tanah 3 sampai 27 cm `sm` (m3/m3), angin 12.00 waktu setempat `ws`, `wd`.
- Kuota: 10 variabel kali 14 hari memberi bobot tepat 1 per lokasi, sehingga variabel ke-11 tidak diambil (lapisan 0 sampai 3 cm tidak dipakai). Kuota gratis Open-Meteo 600 per menit, 5.000 per jam, 10.000 per hari dibagi antara hujan, ansambel, sungai, dan rob.
- Ulangan: bila JSON rusak, workflow mengulang satu kali setelah 10 menit (`.github/workflows/banjir.yml:107-109`).
- Keluaran: `public/banjir/data/hujan.json`. Batas: hujan sel 0,25 derajat lebih kecil dari hujan stasiun, dan prakiraan lebih basah dari ERA5 sehingga status lebih sering naik dibanding uji balik.

## 2. Peluang hujan lebat dari ansambel (`ansambel_hujan.py`, `peluang_banjir.py`)

- Sumber: ECMWF IFS ENS 51 anggota lewat Open-Meteo, satu titik per kotak 1 derajat (349 titik, sekitar 1.780 panggilan per hari).
- Per titik per hari (hari ini sampai +7): `p50` peluang hujan harian 50 mm atau lebih, `p100` peluang 100 mm atau lebih, `p3` peluang jumlah 3 hari mulai hari itu 100 mm atau lebih, persentil 10, 50, 90 hujan harian, serta sebaran per anggota untuk peluang status (`m2`, `m3`) dan cakrawala 7 hari `h7`.
- Peluang = pecahan anggota yang melewati ambang. Agregasi wilayah memakai MAKSIMUM titik 1 derajat terdekat (kabupaten), maksimum kabupaten (provinsi), maksimum semua titik (nasional). Peluang sebenarnya "minimal satu titik" lebih besar atau sama dengan nilai ini.
- Kabupaten tanpa sinyal sama sekali dicatat di `tanpa_sinyal` supaya berkas muat di bawah 400 KB. Tidak adanya baris bukan berarti tidak ada risiko.
- Kalibrasi peluang (apakah 30 persen benar-benar 30 persen) belum bisa dinilai.

AIFS (`ecmwf_aifs025`, 51 anggota) diambil tiap hari bersama IFS ke berkas bayangan. Ia masuk ke ansambel hanya bila `uji_aifs.json["vonis_independen"] == "LOLOS"` (`scripts/banjir/ansambel_hujan.py:22-23`). Uji `uji_aifs.py` (periode 1 Maret 2025 sampai 7 November 2026, 30 titik, ambang 20 mm): ETS waktu-tunda 1 AIFS 0,2315, IFS 0,1556, GFS 0,1253; vonis tertulis LOLOS. Catatan jujur di berkas: kebenaran ERA5 menguntungkan AIFS karena AIFS dilatih meniru ERA5, dan prakiraan yang diuji deterministik karena ansambel historis tidak tersedia.

## 3. Debit sungai besar GloFAS (`scripts/banjir/sungai.py`)

- Langkah A (sekali): sel kisi darat dikirim ke Open-Meteo Flood API (GloFAS 0,05 derajat). Sel dipertahankan bila median debit harian 14 hari terakhir lebih dari 30 m3/s. Ini sampel sungai besar, bukan semua sungai.
- Langkah B (bertahap): debit harian 1997 sampai 2025 per titik menjadi maksimum tahunan (tahun dengan 300 hari data atau lebih), lalu periode ulang Gumbel metode momen:

```
alpha = s * sqrt(6) / pi
u     = rata2 - 0,5772 * alpha
Q_T   = u - alpha * ln(-ln(1 - 1/T))     Q2 = u + 0,3665 alpha, Q5 = u + 1,5 alpha, Q20 = u + 2,9702 alpha
```

  Satu titik 29 tahun memakan sekitar 760 panggilan kuota, sehingga `SUNGAI_B_TITIK` membatasi 6 titik per hari (192 titik butuh sekitar lima minggu).
- Langkah C (harian): debit kendali dan maksimum ansambel tiga hari lalu dan tujuh hari ke depan. Kelas sungai RK: 0 di bawah Q2, 1 mulai Q2 (Waspada), 2 mulai Q5 (Siaga), 3 mulai Q20 (Awas). Titik tanpa ambang berkelas kosong.
- Ambang dan prakiraan berasal dari model yang sama, sehingga bias model saling meniadakan. Jalur sungai belum diuji balik.

## 4. Indeks bahaya InaRISK (`scripts/banjir/bahaya.py`)

Nilai tertinggi dari 10 titik per kecamatan, skala 0 sampai 1. Ambang kelas yang dipakai aturan status: 0,33 dan 0,66. `bahaya.json` dan `kejadian.json` hanya dibuat bila berkas belum ada, jadi data basi tidak diperbarui otomatis.
