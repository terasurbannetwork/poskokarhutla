# Algoritma

Semua fungsi murni ada di `public/bnpb/inarisk_hitung.js` dan diuji `tests/bnpb/inarisk_hitung.test.mjs`.

## 1. Skor yang dipakai

`skor(baris, kolom)`: kolom `total` dipetakan ke `fix_values ?? total`; kolom bahaya apa adanya.
Nilai null atau 0 = tidak ada nilai (tidak ikut peringkat, tidak dihitung nol di rerata).

## 2. Kelas (salin fungsi `Ie` InaRISK)

```
total, tahun >= 2025: < 14,67 Rendah; <= 176 Sedang; selain itu Tinggi
total, tahun < 2025 : < 13 Rendah; > 144 Tinggi; selain itu Sedang
per bahaya          : < rendah[b] Rendah; > tinggi[b] Tinggi; selain itu Sedang
rendah = {longsor 6,67; gunungapi 4; lainnya 5,33}, tinggi = {longsor 15; gunungapi 9; lainnya 12}
```

Uji: 2025 harus memberi 169 Tinggi dan 345 Sedang, sama dengan kolom `status` API.

## 3. Peringkat

Urutkan kab ber-skor > 0 menurun pada tahun dan kolom terpilih; seri dipecah kode wilayah naik.
Filter provinsi memperingkat ulang dalam provinsi. Peringkat sebelumnya = peringkat tahun - 1 dengan
cara yang sama (InaRISK juga begitu). Perubahan peringkat = sebelumnya - sekarang.

## 4. Kartu ringkas

Indeks nasional = rerata skor > 0 (untuk satu provinsi: rerata kabnya). Tertinggi, terendah, jumlah
Tinggi dari himpunan terfilter. Uji: 2025 nasional 147,95.

## 5. Skor sebelumnya dan perubahan (tabel)

Tahun 2025: `pembanding` (label `SEB_60`); perubahan = skor - pembanding. Tahun lain: skor tahun - 1.

## 6. Tren 5 tahun

Lima tahun terakhir s.d. tahun terpilih; dikelompokkan per dasar (HV 2015: < 2025, HV 2021: >= 2025).
Tahun tanpa skor tampil "belum ada skor", bukan nol.

## 7. Jiwa terpapar

Persen = min(penduduk, terpapar) / penduduk x 100, satu desimal; sisa = tidak terpapar.
Penduduk 0 atau tidak ada = bagian disembunyikan dengan pesan.

## 8. IKD

Tingkat: < 0,40 Rendah, <= 0,80 Sedang, > 0,80 Tinggi (ambang dari `data.ambang` bila ada).
Jarum 0-1 dipetakan ke busur 180 derajat. Radar 7 sumbu, nilai 0-1.

## 9. Warna koroplet

Tiga kelas (Tinggi, Sedang, Rendah) dengan token warna; kab tanpa skor abu.
