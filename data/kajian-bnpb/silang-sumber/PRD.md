# PRD: Silang Sumber

## Tujuan

Staf kita (BNPB dan BPBD) tahu sumber prakiraan mana yang terbukti cocok dengan kejadian, di mana dua sumber berbeda, dan apa yang perlu dicek, tanpa sistem memutuskan mana yang benar.

## Pengguna

Staf pusdalops, staf kedeputian, analis. Alat bantu staf, bukan peringatan publik.

## Fitur

| ID | Fitur | Pemilik | Kriteria terima |
| --- | --- | --- | --- |
| F1 | Rapor Sumber: skor tiap sumber per bahaya, daerah, dan tenggang (POD, FAR, CSI, ETS, a, b, c, d, n) lawan DIBI, Logbook Pusdalops, dan SYNOP untuk hujan. Layar `/bnpb/rapor-sumber`. Realisasi DB-09. | ruang-bnpb | Arsip kurang dari 30 hari tertulis "data belum cukup". Tidak ada persen bila a + c < 30. |
| F2 | Tsunami per zona: tingkat resmi tiap zona BMKG dipetakan ke kabupaten/kota dan pesisir, digabung penduduk, sekolah, faskes, titik evakuasi, pengukuran muka air, urutan buletin, dan pemutaran ulang 5 kejadian arsip. Tab di `/gempa`. | gempa | Nama zona yang tak cocok tetap tampil. Peta waktu tiba tetap gambar BMKG. |
| F3 | Alarm beda sumber: per kabupaten atau perairan per hari, resmi lawan model, tanda "perlu dicek". Keluaran `public/data/bnpb/beda_sumber.json`, tampil di `/bnpb/silang`. | ruang-bnpb | Tidak ada kalimat yang menyebut sumber mana yang benar. |
| F4 | Jendela kirim bantuan. Sama dengan LG-14 di `data/kajian-bnpb/logpal/TIKET.md`. | warga-api (LG-14) | Mengikuti LG-14; paket ini tidak menulis ulang spesifikasinya. |
| F5 | Deteksi gempa beruntun: laju gempa kecil dekat gunung api dan sesar lawan baseline, dengan Mc dan statistik kejutan. Berlabel "Deteksi Centurisk97". | gempa | Bukan prediksi gempa; tidak tampil sebagai peringatan sebelum uji balik. |
| F6 | Kalender ancaman daerah: per kabupaten dan bulan, laju kejadian DIBI dan logbook disandingkan dengan prediksi bulanan dan dasarian BMKG. Dipakai profil daerah dan laporan. | pipa-umum, kampus | Dua kolom berdampingan, tanpa skor gabungan. |

## Batas dengan modul Tangga Peringatan

| Hal | Tangga (`data/kajian-bnpb/tangga/`) | Silang |
| --- | --- | --- |
| Pertanyaan | Apa yang dinyatakan sekarang pada tiap skala waktu? | Seberapa cocok tiap sumber dengan kejadian, dan di mana dua sumber berbeda? |
| Berkas | `public/prediksi/**`, `scripts/prediksi/**` | `scripts/bnpb/silang/**`, `public/bnpb/**`, `public/data/bnpb/**`, `scripts/gempa/**`, `public/gempa/**`, `scripts/umum/**` |
| Uji balik sinyal Tangga (TG-11) | Tetap di Tangga | Tidak dihitung ulang di sini |
| Sambungan | Boleh membaca `beda_sumber.json` bila pemilik Tangga memutuskan (Q5) | Tidak mengubah `tangga.json` |

## Larangan

Menulis "aman". Persen untuk a + c < 30. Mengisi arsip mundur. Menjadikan warna peta angka. Skor gabungan resmi dan model. Menyebut sumber mana yang benar pada F3. Memakai "Pantau Bencana". Menyentuh worker, D1, workflow (usulan workflow ke mekanik-mesin). Menyentuh `public/prediksi` dan `scripts/prediksi`. Memakai API `tropicalcyclone` ber-token. Menulis ulang spesifikasi LG-14.

## Di luar lingkup

Peta waktu tiba tsunami digital (tetap gambar BMKG). Prediksi gempa. Peringatan ke warga. Notifikasi.
