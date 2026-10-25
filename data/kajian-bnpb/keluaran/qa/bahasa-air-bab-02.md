# Lapis (c) penyunting bahasa: naskah/air/bab-02.md

Tanggal: 24 Okt 2026. Berkas: `naskah/air/bab-02.md` (Tinjauan Pustaka dan Kerangka Konseptual).

## Vonis slop.py --final

- Sebelum sunting: LOLOS, skor 0 (3.956 kata).
- Sesudah sunting: LOLOS, skor 0 (3.974 kata), nol pelanggaran, kata kosong 0,0 per 1.000.
- Putaran antara sempat memunculkan S-30 (kalimat 52 kata di ringkasan bab, akibat singkatan PAMSIMAS dieja); kalimat itu dipecah dan vonis kembali skor 0.

## Integritas

Token `{{angka:...}}`, kutipan `[@...]`, rujukan silang (`@rek`, `@sub`, `@tbl`, `@gbr`), dan seluruh digit dibandingkan dengan salinan sebelum sunting: identik (hitungan multiset sama). Makna tidak diubah.

## Suntingan

| Baris (kira-kira) | Masalah | Perbaikan |
| --- | --- | --- |
| 17 (ringkasan) | Singkatan PAMSIMAS muncul pertama tanpa kepanjangan (L66/T-9) | Dieja "Penyediaan Air Minum dan Sanitasi Berbasis Masyarakat (PAMSIMAS)"; kalimat dipecah dua (S-30) |
| 154 | Kepanjangan PAMSIMAS berulang setelah dieja di ringkasan | Cukup singkatan |
| 150 | BPS pertama tanpa kepanjangan (L66/T-9) | "Badan Pusat Statistik (BPS)" |
| 40 | Ragam tidak baku "tidak punya pembanding ukur" | "tidak memiliki pembanding hasil ukur" |
| 94 | Pasif menyembunyikan pelaku yang diketahui (M-1) | "penyusun mencatat pencabutan ini dari metadata BPK" |
| 98 | Pasif "dikaitkan" dengan label tafsiran di ekor kalimat (M-1) | Label tafsiran penyusun dipindah ke depan, pelaku jelas |
| 144 | "karena itu" berulang di tiga paragraf (ritme) | "Oleh sebab itu, ..." |
| 156 | Rumus "tidak dibaca sebagai sebab" berulang dengan baris 65 (pengulangan antarsubbab) | "Korelasi itu belum membuktikan hubungan sebab-akibat." |
| 164 | Pasif "diposisikan" tanpa pelaku (M-1) | "Kajian ini karena itu memosisikan praktik tersebut ..." |
| 166 | Paragraf temuan tanpa kalimat pembuka tebal (L16); kalimat kedua mengulang ringkasan hampir kata demi kata | Kalimat pembuka ditebalkan dan dirumuskan ulang; kalimat kedua diganti agar tidak mengulang ringkasan |

## Pemeriksaan lain

- Glosarium (`data/glosarium.json`): setelah sunting, semua singkatan terperiksa dieja pada kemunculan pertama di bab; varian berkonteks terlarang nol.
- Daftar M-1 sampai M-14 diperiksa manual. M-6: semua korelasi (IRBI-DIBI, air tanah-deformasi Semarang) diberi pernyataan bukan sebab. M-10: kontras "X, bukan Y" yang tersisa (artefak definisi lapisan bahaya; intensitas pelaporan; "belum terbukti" bukan "tidak bermanfaat") dilandasi definisi. M-14 tidak berlaku untuk naskah Markdown.
- Tidak disunting: angka, token, kutipan, isi tabel, isi blok program dan gambar.

## Catatan untuk pengerja (tidak disunting karena menyentuh isi)

- Butir peta regulasi kedua (baris 113) dan paragraf peran BNPB (baris 160) sama-sama memuat rumusan "menagih agar NSPK memuat kebutuhan KRB banjir dan rob serta rencana kontinjensi"; fakta Dewan Pengarah BOP Pantura Jawa juga sudah ada di baris 104. Pertimbangkan untuk memadatkan salah satunya.
