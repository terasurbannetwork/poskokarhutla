# Skala Intensitas Gempabumi BMKG (SIG-BMKG), studi awal 2016

Muzli, Masturyono, Jaya Murjaya, Mochammad Riyadi (BMKG). *Studi Awal Penyusunan Skala Intensitas Gempabumi Badan Meteorologi
Klimatologi dan Geofisika*. Jurnal Meteorologi dan Geofisika Vol. 17 No. 2 Tahun 2016, hal. 89-100. DOI 10.31172/jmg.v17i2.440.
Naskah diterima 20 Desember 2016. Halaman artikel: https://jmg.bmkg.go.id/jmg/index.php/jmg/article/view/440,
PDF: https://jmg.bmkg.go.id/jmg/index.php/jmg/article/download/440/215/1004 (pindaian 11 halaman tanpa lapisan teks,
dibaca penuh 23 Nov 2026). Pengembangan dari artikel yang sama di Majalah Swara Geofisika edisi khusus April 2016 (hal. 98-99).

## Tabel SIG-BMKG (Tabel 1, hal. 91)

| SIG | Warna | Deskripsi sederhana | Deskripsi rinci | MMI | PGV (cm/s) | PGA (gal) |
|---|---|---|---|---|---|---|
| I | Putih | Tidak dirasakan (*not felt*) | Tidak dirasakan, atau dirasakan hanya oleh beberapa orang tetapi terekam alat | I-II | < 0,1 | < 2,9 |
| II | Hijau | Dirasakan (*felt*) | Dirasakan banyak orang tetapi tidak menimbulkan kerusakan; benda ringan yang digantung bergoyang, jendela kaca bergetar | III-V | 0,1-7,2 | 2,9-88 |
| III | Kuning | Kerusakan ringan (*slight damage*) | Bagian nonstruktur bangunan rusak ringan, seperti retak rambut pada dinding, atap bergeser ke bawah dan sebagian berjatuhan | VI | 7,3-14,8 | 89-167 |
| IV | Jingga | Kerusakan sedang (*moderate damage*) | Banyak retakan pada dinding bangunan sederhana, sebagian roboh, kaca pecah; sebagian plester dinding lepas; hampir sebagian besar atap bergeser ke bawah atau jatuh; struktur rusak ringan sampai sedang | VII-VIII | 14,9-63,5 | 168-564 |
| V | Merah | Kerusakan berat (*heavy damage*) | Sebagian besar dinding bangunan permanen roboh; struktur rusak berat; rel kereta api melengkung | IX-XII | > 63,5 | > 564 |

## Dasar penyusunan (hal. 89-91, 98)
- Alasan: MMI dinilai rumit (12 tingkat), subjektif, dibuat dari kondisi bangunan Amerika dan Eropa (istilah cerobong asap,
  pemanas ruangan, gerabah tidak sesuai bangunan Indonesia). SIG-BMKG ditujukan untuk bangunan tipikal Indonesia (hal. 89-90, 92).
- SIG-BMKG adalah **modifikasi atau penyederhanaan MMI**: 12 tingkat MMI dikelompokkan jadi 5 (hal. 91, kesimpulan hal. 98).
- Batas PGA per tingkat **tidak dikalibrasi dari data Indonesia**: diambil dari pengelompokan PGA terhadap MMI menurut GMICE
  (*Ground Motion to Intensity Conversion Equation*) Wald dkk. 1999 dan Worden dkk. 2012, keduanya dari data California (hal. 91, pustaka hal. 99).
  Peta *shakemap* BMKG (berjalan sejak 2011, skala warna berbasis MMI) dimodifikasi ke warna SIG (hal. 91).
- Penulis menyebut studi ini *preliminary*. Data PGA dan kerusakan lapangan terus dikumpulkan untuk merevisi kelompok PGA dan PGV
  supaya sesuai bangunan tipikal Indonesia (hal. 91, 98).
- PGV berkorelasi lebih baik dengan kerusakan daripada PGA (Worden dkk. memberi bobot PGV lebih besar), tetapi PGV otomatis
  belum operasional di BMKG; rumus empiris jarak, magnitudo, PGA/PGV ke SIG-BMKG masih harus dipelajari (hal. 98).

## Uji pada tiga gempa (hal. 91-97)
| Gempa | Survei lapangan | PGA stasiun terdekat | Hasil SIG |
|---|---|---|---|
| Sorong, 24 Sep 2015, M6,8, kedalaman 10 km | MMI VI di kota Sorong (survei BBMKG Wil. V Jayapura) | SWI Sorong 226,74 gal, jarak hiposenter 31,9 km; GMICE = MMI VII | IV (kerusakan sedang) |
| Sumbawa Barat, 12 Feb 2016, M6,6, kedalaman 60 km | MMI VI di Waikabubak | WBSI Waikabubak 87,92 gal, 61,9 km; GMICE = MMI VI | II-III (di batas II dan III) |
| Painan (Sumbar), 2 Jun 2016, M6,6, kedalaman 72 km | rusak ringan 1.431 rumah di Kab. Pesisir Selatan (BPBD Pessel) | MKBI Muko-Muko 177,77 gal maks (teks: 165 gal), 113,9 km; konversi MMI VI-VII | III (kuning) di *shakemap* |

Catatan: kepala Tabel 4 menulis "02 Mei 2016", teks menulis 2 Juni 2016; Gambar 1 menulis 25 September 2015 untuk Sorong.

## Kesimpulan penulis (hal. 98)
SIG-BMKG lebih mudah dan "lebih objektif dan akurat" karena tingkatnya sedikit dan universal; PGA dan PGV parameter objektif
untuk konfirmasi tingkat dampak.

## Pemakaian di repo
- Laporan Khusus Gempa (`data/laporan-bnpb/insidental/gempa_khusus.py`) memakai MMI dari model guncangan. Bila SIG ditampilkan,
  tulis "setara SIG-BMKG" dan tetap cantumkan MMI: ambang SIG adalah pengelompokan MMI, jadi tidak menambah ketelitian model.
