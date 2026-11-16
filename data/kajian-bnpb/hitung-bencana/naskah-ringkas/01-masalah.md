# BAB 1 Masalahnya: Satu Api atau Dua?

Pertanyaan yang paling sering diajukan pimpinan adalah berapa jumlah kejadian bencana. Angka itu tampak sederhana, padahal belum ada aturan tertulis tentang apa yang dihitung sebagai satu kejadian. Juklak 7/2023 menetapkan enam kriteria ambang batas, yaitu kapan sesuatu masuk hitungan. Juklak tidak menyebut apa yang dihitung, dan tidak mengukur besar-kecilnya.

## 1.1 Dua api yang menyatu

Pada 17 sampai 26 Oktober 2026, dua kelompok api di Kapuas, Kalimantan Tengah, berjarak 8,9 km pada hari pertama. Satu kelompok terdiri dari 116 piksel titik panas dan satu lagi 19 piksel. Dalam beberapa hari keduanya menyatu menjadi satu kebakaran berukuran 690 piksel. Apakah itu satu kejadian atau dua, dan sejak kapan, tidak dijawab oleh aturan mana pun.

Kasus seperti ini ada 105 kandidat dalam 28 hari data. Namun penggabungan yang bermakna hanya 0,28 persen dari semua kejadian. Yang jauh lebih besar pengaruhnya adalah pilihan aturan gabung itu sendiri.

## 1.2 Aturan gabung menentukan jumlah

Kami menghitung kejadian karhutla dari 295.488 deteksi titik panas satelit VIIRS (hotspot) selama 28 hari. Dua deteksi dianggap satu kejadian bila cukup dekat dalam jarak dan waktu. Kami mencoba jarak 0,5, 1, dan 2 km, serta jendela waktu 24 dan 72 jam.

Tabel 1.1. Jumlah kejadian karhutla menurut aturan gabung

| Jarak gabung | Jendela 24 jam | Jendela 72 jam |
| --- | ---: | ---: |
| 0,5 km | 61.138 | 50.039 |
| 1 km (aturan acuan) | 49.088 | 37.953 |
| 2 km | 38.963 | 27.322 |

Sumber: titik panas VIIRS, 15 Oktober sampai 11 November 2026; olahan kajian.

![Gambar 1.1. Jumlah kejadian karhutla menurut aturan gabung](gbr/r-gabung-karhutla.png)
Sumber: titik panas VIIRS, 15 Oktober sampai 11 November 2026; olahan kajian.

Data yang sama menghasilkan 27.322 sampai 61.138 kejadian, selisih 2,2 kali lipat. Tidak ada angka yang benar sendiri. Angka hanya bisa dibandingkan bila aturan gabungnya sama.

## 1.3 Masalah yang sama di tempat lain

Pola ini bukan khusus karhutla.

- **DIBI.** Satu gempa pada 15 Agustus 2026 melanda 11 kabupaten. DIBI mencatatnya 0,091 kejadian di tiap kabupaten, sehingga jumlahnya pecahan. Ada 643 baris DIBI berpecahan semacam itu.
- **Logbook Pusdalops.** Laporan harian yang sama menghasilkan 2.809 kejadian dengan satu cara pencocokan, 3.860 dengan cara lain, dan 8.715 bila tidak dicocokkan sama sekali. Pencocokan ini disebut deduplication key.
- **Angka kumulatif.** Logbook menulis angka yang terus bertambah. Bila dijumlah lintas hari, korban meninggal menjadi 12.523, padahal nilai terbesar per kejadian hanya 609.

:::metode
Kajian memakai tiga bahan: 15.974 baris DIBI (1 Januari 2024 sampai 12 November 2026), logbook harian Pusdalops 2026, dan 295.488 deteksi titik panas VIIRS. Satu baris DIBI adalah gabungan hari, kabupaten, dan jenis bencana.
:::
