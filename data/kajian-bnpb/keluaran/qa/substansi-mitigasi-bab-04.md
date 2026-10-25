# QA lapis (b) penyunting substansi: kajian mitigasi Bab 4

Berkas: `naskah/mitigasi/bab-04.md`. Pembanding: `naskah/mitigasi/bukti/bab-04.md`, `bab-04.angka.json`,
`bab-04.pustaka.json`, `data/angka.json`, `data/dibi/rekap_nasional_tahunan.csv`, `data/dibi/README.md`, KERANGKA §2
butir 9 dan 17 serta §5 Bab 4, `naskah/mitigasi/bab-07.md` dan `bukti/bab-07.md` (Koplitz), `naskah/mitigasi/bab-13.md`
(register rekomendasi). Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- Seluruh token angka unik (sekitar 160 pasangan kunci dan opsi) dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` dan pustaka gabungan: semua kunci ada, label sah, nilai cocok dengan berkas
  bukti dan CSV DIBI (dihitung ulang: seri alam per tahun, lima kejadian 6.950 = 60,6%, rasio hidrometeorologi 3,2 dan
  2,2 kali, rasio COVID-19 13,6 kali, lantai 1.506 + 186 = 1.692). `baca()` + `nomori()` atas Bab 4 bersama Bab 6, 7,
  dan 13 lulus setelah suntingan (rujukan `@rek:r-m08`, `@rek:r-m17`, `@rek:r-m20`, `@bab:geologi`,
  `@bab:hidrometeorologi`, `@bab:kesimpulan` terurai). Tidak ada kunci `bab-04.angka.json` yang bertabrakan dengan
  `data/angka.json`.
- `qa/slop.py --final`: LOLOS, skor 0 (dua catatan rendah S-18 atas daftar yang memang berisi butir nyata). Em dash dan
  titik tengah nol; "terbukti" hanya dalam "sebab beda tidak terbukti" di Tabel rekonsiliasi.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Akhir bab: `matriks-rekomendasi` tiga `rek` (r-m-dibi-revisi, -klasifikasi, -arsip) | KERANGKA §2 butir 17: rekomendasi hanya di bab kesimpulan; ketiga ID tidak ada di register Bab 13, dan klasifikasi tumpang tindih dengan `r-m08` | Diganti paragraf temuan berangka + `tabel {#tbl:celah-histori}` tujuh baris (yang belum tersedia, pemegang, tindak lanjut), pola sama dengan `tbl:celah-air`. Tiga baris tertaut `@rek:r-m08`, `@rek:r-m17`, `@rek:r-m20`; empat baris tetap permintaan data. Ringkasan dan dua rujukan dalam teks (4.4, 4.5) dialihkan |
| 2 | 4.1, empat paragraf | Kejadian 2024 dan 2025 tampil berdesimal ("5.440,45 kejadian", "3.471,5") tanpa penjelasan; pecahan berasal dari DIBI yang membagi kejadian lintas kab/kota (`dibi/README.md` baris 133) | Token diberi `fmt=0` (3.472, 5.077, 3.551, 8.359, 9.305, 5.440) dan satu kalimat penjelas pecahan. CKAN 3.472 tetap "sama setelah dibulatkan" |
| 3 | Ringkasan butir 3 | Batas atas model La Niña tanpa label; frasa lantai tsunami tergantung | "model La Niña yang belum diuji balik"; lantai tsunami disebut per kejadian (Aceh, Pangandaran, Mentawai, Selat Sunda) |
| 4 | 4.2 Aceh | "BRR dibentuk untuk melaksanakan Perpres 30/2005, keputusan yang dapat dibalik" tidak tepat (BRR pelaksana Rencana Induk) dan bernada catatan internal | Ditulis sebagai alasan label: BRR badan pemerintah pelaksana Rencana Induk dalam Perpres 30/2005, Buku Utama tidak ditemukan |
| 5 | 4.2 Yogyakarta | Kalimat meta "Angka itu terverifikasi dari halaman kejadian USGS" | Diganti konsekuensi lantai (skenario sesar darat Jawa di bawah 5.749 melanggar lantai), sesuai tabel analog bukti P2 |
| 6 | 4.2 hidrometeorologi | "musim tercatat terberat" tanpa jendela; model tanpa label "estimasi model" | "terberat dalam seri DIBI sejak 2008/2009"; model diberi label estimasi model belum diuji balik |
| 7 | 4.2 karhutla | Koplitz ditulis "kematian berlebih ... pada tahun itu"; bukti Bab 7 sudah mengoreksi: paparan Juli–Oktober 2015, kematian dewasa saja | Diselaraskan dengan Bab 7: kematian dewasa berlebih, Juli–Oktober 2015, bukan beban total |
| 8 | 4.2 nonalam | Kalimat enam jenis tanpa lantai salah tempat dan tidak menyebut jenisnya | Keenam jenis disebut (bukti P2 Celah) dan alasan likuefaksi |
| 9 | Studi kasus Merapi, Masalah | Sepertiga juta pengungsi (Surono) tanpa angka DIBI 447.982 di sampingnya | Ditulis berdampingan |
| 10 | 4.3 lima kejadian | "pelaporan capaian yang jujur"; "rinciannya di Bab 12" padahal Bab 12 tidak memuatnya | "perlu memuat"; rujukan dibuang |
| 11 | Rujukan Bab 6 dan Bab 7 | Teks polos | `@bab:geologi`, `@bab:hidrometeorologi` |

## Diperiksa dan tidak diubah

- Lantai skenario: hidrometeorologi 1.692 di atas batas atas model 1.200; tsunami per wilayah; model tidak dipakai
  sebagai skenario terburuk. Tidak ada skenario di bawah lantai.
- Klaim "terbukti": InaTEWS (bukti sedang, satu kejadian, wajib evaluasi dampak), PVMBG Merapi (belum berdampak terukur),
  BRR, Rekompak, Lombok (lemah, laporan sendiri) ditulis sesuai kompendium. Klaim `riset/C` "BRR sudah terbukti" tidak
  masuk naskah.
- Angka model berlabel dan bersanding angka tercatat: La Niña, Koplitz, kematian berlebih WHO (rentang), jiwa
  terselamatkan Surono (rentang, estimasi model).
- Angka bertentangan berdampingan: BRR 127.720 lawan 126.741; Sulteng DIBI lawan USGS; Seroja DIBI lawan Renstra;
  Cianjur meninggal dan tiga versi rumah rusak; Merapi 386 lawan 367; Jabodetabek; Sumatra Aceh saja; empat versi
  kejadian 2024 dan versi 2025. Versi sekunder (BNPB 21 Okt 2018, Plumpang 29, Antara 5.593) tidak masuk badan teks.
- Kewenangan: BNPB tidak disebut regulator industri; kebakaran permukiman dan unjuk rasa ditandai di luar lingkup
  (KERANGKA prinsip 3, R22, M01); permintaan data ditujukan ke unit pemegang.
- Pertanyaan kunci 1 (patahan seri, seri alam, semua laporan), 2 (analog per jenis, lantai per wilayah), dan 3 (lima
  pelajaran L1 sampai L4 dan L6, L5 di 4.4) terjawab. Komponen KERANGKA ada: Gambar 4.1 (G9, patahan 2024), Gambar 4.2
  (G1), Tabel 4.1 kejadian besar dan pelajaran, Tabel 4.2 rekonsiliasi, studi kasus Merapi 2010 dengan kotak Palu dan
  InaTEWS.

## Sisa untuk orkestrator (di luar berkas ini)

1. Register Bab 13 belum memuat tiga permintaan data Bab 4: catatan revisi angka dinamis ke statis per kejadian besar
   (termasuk Sulteng), aturan klasifikasi unjuk rasa dan pembersihan entri ganda konflik sosial (r-m08 hanya epidemi),
   dan rekap DIBI sebelum 2008; juga evaluasi independen pemulihan. Bila pemilik register ingin menautkannya, tambah ke
   indikator r-m08 atau ID baru, lalu baris `tbl:celah-histori` diperbarui. Ketiganya juga perlu masuk
   `tbl:belum-diketahui` Bab 13.
2. Paragraf 4.1 dan koreksi Renstra memakai kunci `dibi.nasional.kejadian.*` dan `dibi.nasional.meninggal.*` (semua
   klasifikasi) untuk 2015–2023 sambil menyebut "bencana alam". Nilainya identik dengan seri alam di tahun itu (CSV
   dihitung ulang), jadi angka benar; kunci `kejadian_alam.2015/2021/2023` dan `meninggal_alam.2019–2024` belum ada di
   registri. Tambahkan bila registri disatukan.
3. Kerugian Cianjur Rp4,55 triliun (bukti, KERANGKA) tampil "Rp4,6 triliun" karena opsi `rupiah` membulatkan ke satu
   desimal; samakan dengan bab dan deck lain.
4. Pustaka gabungan mitigasi memuat entri author tanpa `family`/`literal` sehingga `_akhiran_tahun` galat ("string index
   out of range"); periksa sebelum pustaka disatukan.
5. `bab-11.md:319` mengutip `undrr-2020-bhola` yang bersumber sekunder; `baca()` menolaknya. Bukan lingkup berkas ini.
