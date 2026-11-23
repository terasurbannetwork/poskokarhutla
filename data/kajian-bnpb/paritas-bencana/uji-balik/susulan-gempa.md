# Uji balik aturan tautan susulan gempa di bawah M 5 (PB-68.8)

Dijalankan 16 Nov 2026. Perintah ulang: `node --test tests/warga/gempa_susulan.test.mjs` (angka di bawah dari skrip yang sama, tanpa jaringan).

## Aturan

Gempa M < 5 tertaut ke kejadian G (gempa utama M >= 5) bila jatuh di jendela jarak dan waktu gempa utama, kejadian terdekat menang:

- jarak R = exp(-1,024 + 0,804 M) km, waktu T = exp(-2,87 + 1,235 M) hari, M = magnitudo gempa utama;
- sumber: Uhrhammer, R. A. 1986, "Characteristics of northern and central California seismicity", Earthquake Notes 57(1):21 (jendela deklaster; dikutip van Stiphout dkk. 2012, CORSSA);
- satu-satunya angka kita sendiri: T dipotong 35 hari, anggaran baca D1 (hanya kejadian yang mulai dalam 35 hari terakhir dipindai tiap putaran cron). Itu pilihan operasional, bukan klaim ilmiah;
- tidak ada parameter yang dikalibrasi dari data ini, jadi tidak ada pemisahan latih dan uji.

Aturan lama (`jendelaKm` Gardner-Knopoff 1974 untuk jarak, masa aktif kejadian 3 atau 7 hari untuk waktu) memakai angka masa aktif tanpa sumber pustaka dan tetap dipakai hanya untuk mengelompokkan gempa M >= 5.

## Data

`public/gempa/data/inatews_katalog.json`: katalog BMKG InaTEWS (`cdn.bmkg.go.id/3mgempaQL.json`, dibaca append-only), 12 Agt sampai 16 Nov 2026 (96 hari), 1.078 gempa, 686 di kotak Indonesia (lat -12..7, bujur 94..142), 596 di antaranya M < 5. Satu-satunya arsip repo yang memuat gempa kecil dengan kelengkapan wajar. `emsc_arsip.json` hanya gempa dengan laporan dirasakan (bukan katalog lengkap), `riwayat_m5.json` hanya M >= 5; keduanya tidak cocok. Tidak ada data baru yang diunduh.

## Cara uji

1. Gempa utama = gempa M >= 5 di kotak itu yang tidak jatuh di jendela gempa M >= 5 lebih besar sebelumnya (dideklaster dengan jendela yang sama): 54 gempa utama.
2. Tertaut = gempa M < 5 setelah gempa utama dalam jendela (aturan di `src/gempa.js`, fungsi `tautSusulan`).
3. Kontrol (jumlah tautan palsu yang diharapkan): gempa M < 5 pada jendela waktu yang sama di cincin berluas sama dengan lingkaran jendela (jarak R kali akar 2 sampai R kali akar 3 dari pusat). Presisi = 1 - kontrol / tertaut.

Kriteria lulus (ditetapkan sebelum uji dijalankan): presisi >= 0,80 secara keseluruhan; urutan gempa besar yang dikenal (Flores M 7,7, 14 Agt 2026) menarik >= 50 susulan dengan kontrol di bawah 10% dari tautannya. Uji otomatis di repo memakai batas longgar (presisi >= 0,75, Flores >= 50) karena katalog tumbuh tiap hari.

## Hasil

| Ukuran | Nilai |
| --- | --- |
| Gempa utama | 54 |
| Susulan kecil tertaut | 167 |
| Kontrol cincin | 27 |
| Presisi | 0,84 (lulus) |
| Gempa utama tanpa susulan tertaut | 37 dari 54 (median 0, persentil 90 = 3, maksimum 104) |
| Flores M 7,7, 14 Agt 2026 | 104 tertaut, kontrol 0, 45 di antaranya dalam 24 jam pertama (lulus) |
| Seram M 5,4, 9 Nov 2026 | 13 tertaut, kontrol 0, 9 dalam 24 jam |

Per kelas magnitudo gempa utama:

| Kelas | Gempa utama | Berpasangan susulan | Tertaut | Kontrol |
| --- | --- | --- | --- | --- |
| M 5,0 sampai 5,4 | 39 | 12 | 53 | 25 |
| M 5,5 sampai 5,9 | 8 | 3 | 9 | 1 |
| M 6 ke atas | 7 | 2 | 105 | 1 |

Pembanding pada data yang sama: aturan lama (jarak GK 1974, masa aktif 3/7 hari) menautkan 152 dengan presisi 0,88 tetapi hanya 45 untuk Flores M 7,7; Gardner-Knopoff jarak dan waktu penuh menautkan 437 dengan presisi 0,81 tetapi menuntut jendela ratusan hari. Uhrhammer 1986 dipotong 35 hari dipilih karena berpustaka lengkap (jarak dan waktu dari satu sumber) dan menangkap urutan besar paling baik pada presisi setara.

## Batasan yang dicatat

- Hanya 96 hari dan 54 gempa utama; satu urutan besar (Flores) menyumbang 62% tautan. Lulus, tetapi belum uji prospektif.
- Kelas M 5,0 sampai 5,4 lemah (presisi 0,53): satu kejadian, Flores M 5,1 18 Okt 2026, menyumbang 23 tautan dengan kontrol 15 karena berada di zona yang masih aktif sesudah gempa M 7,7. Tanpa kejadian itu kelas ini 30 tautan lawan kontrol 10. Kejadian kecil yang berada di daerah sibuk akan menarik latar belakang.
- Kotak uji memuat bagian Filipina dan Laut Maluku; aplikasi sendiri menyaring Indonesia lewat `diIndonesia`.
- Jumlah susulan di tab Kejadian adalah BATAS BAWAH. D1 produksi hanya menerima BMKG M >= 5 (`gempaterkini`), `autogempa` (satu gempa terbaru), gempa dirasakan, dan USGS M >= 4,5. Gempa M < 4,5 yang tidak dirasakan tidak pernah masuk D1, jadi susulan kecil itu tak bisa dihitung berapa pun aturannya. Menambah sumber (katalog BMKG semua magnitudo, `live30event.xml`/`3mgempaQL.json` seperti `scripts/gempa/inatews.py`) berarti mengubah cron Worker dan kuota D1; ditunda ke keputusan pemilik.
- Aturan tidak meramal susulan, hanya mengelompokkan yang sudah tercatat.
