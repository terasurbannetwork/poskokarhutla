# Jenis slide (daftar tertutup S35) dan tata letaknya

Aturan asal: S35 (variasi tata letak), S36 (tiap slide bervisual), S12 (seri berchip), S26 (profil wilayah) di
`pola-konsultan.md`. Di spek, medan S35 ditulis `jenis_slide`; medan `jenis` adalah tata letak mesin.

## Daftar tertutup

| `jenis_slide` | Isinya | Tata letak mesin (`jenis`) yang lazim | Visual wajib (S36) | Judul (S7) |
| --- | --- | --- | --- | --- |
| `navigasi` | Pesan Kunci (tesis + 4 sampai 6 temuan), Kesimpulan (8 kartu + ARAHAN) | `kartu-angka` (Pesan Kunci), `kesimpulan` | dikecualikan | deskriptif |
| `peta` | peta dasar PNG + label native + legenda | `temuan-peta` | peta | temuan bila bagian A sampai D |
| `grafik` | grafik batang native, rantai tahap (G21), taksonomi cakupan | `temuan-grafik`, `strategi-tiga-fase` | grafik native | temuan (A sampai D) atau deskriptif (usulan) |
| `tabel` | tabel peringkat, tabel peta panas, profil wilayah | `tabel-peringkat` | tabel native | temuan atau deskriptif |
| `matriks` | grid, matriks lembaga x fase, kisi, matriks kelas | `tabel-peringkat` | tabel native | temuan (matriks lembaga x fase termasuk slide temuan) |
| `kartu-skenario` | kartu skenario terburuk satu slide | `skenario` | tabel kerusakan + batang kebijakan | temuan |
| `panel` | panel berpita berisi kartu temuan | `kartu-angka`, `temuan-grafik` dengan panel | harus memuat grafik, tabel, atau peta (kartu saja ditolak laporan S36) | temuan |
| `rekomendasi` | baris LANGKAH, RINCIAN, PENANGGUNG JAWAB | `rekomendasi` | tabel (tercatat otomatis) | deskriptif |
| `lampiran` | tabel native lampiran, dipecah rata | `lampiran-tabel` | tabel native | deskriptif, kode "L1. " atau "A1. " di depan |

Bingkai (`sampul`, `penutup`, `pembatas-lampiran`) di luar daftar: tanpa `pesan`, `jenis_slide`, `judul_bentuk`.

## Pasangan yang dikunci mesin

`deck.py` (`JENIS_S35_TATA`): `kesimpulan` hanya `navigasi`; `lampiran-tabel` hanya `lampiran`; `rekomendasi` hanya
`rekomendasi`; `skenario` hanya `kartu-skenario`; `temuan-peta` hanya `peta`. Tata letak lain bebas memilih `jenis_slide`
yang jujur menggambarkan isinya.

## Variasi

- Dua slide isi berurutan tidak berjenis sama. Pengecualian: `lampiran`, dan slide ber-`seri` sama (seri berchip per
  kelompok bencana atau per provinsi, profil wilayah bertemplat sama, rekomendasi yang dipecah ke beberapa slide).
- Navigasi pertama (Pesan Kunci) dan terakhir (Kesimpulan) tidak berdampingan dengan navigasi lain.
- Contoh urutan lolos (deck kajian mitigasi final): sampul, navigasi, grafik, peta, matriks, kartu-skenario,
  kartu-skenario (seri skenario-terburuk), grafik, panel, grafik, tabel, matriks, rekomendasi x3 (seri), navigasi, penutup.

## Garis besar per kajian

Alur slide kedua kajian (kode bagian, judul templat, jenis, sumber angka) ada di `pedoman-desain-deck.md` B7.4 (air) dan
B7.5 (mitigasi). Untuk kajian baru, tulis tabel serupa dulu (kolom: kode, judul templat dengan slot `{a}`, `jenis_slide`,
`judul_bentuk`, kunci angka) dan baca berurutan sebagai ringkasan (S6) sebelum spek dibuat.
