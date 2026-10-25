# QA lapis (b) penyunting substansi: kajian mitigasi Bab 8

Berkas: `naskah/mitigasi/bab-08.md`. Pembanding: `naskah/mitigasi/bukti/bab-08.md`, `bab-08.angka.json`,
`bab-08.pustaka.json`, `data/angka.json`, `data/nonalam-sosial/peristiwa.csv`, KERANGKA §2 dan §5 Bab 8, register
rekomendasi di `bab-13.md`. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- 93 pasangan token unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` (bab-08 menang) dan pustaka gabungan: semua kunci ada, nilai cocok dengan
  berkas bukti (termasuk baris Tabel 8.2: Kopi Luhur, Putri Cempo, Rawa Kucing, Jalupang, Jatibarang), label sah.
  `baca()` atas bab utuh dengan `status: final` lulus setelah suntingan, sehingga tidak ada pustaka sekunder yang dikutip.
- `qa/slop.py --final`: LOLOS, skor 0 (hanya S-18 rendah atas daftar faktual). Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab butir 2 | "padahal" menyiratkan pertentangan yang tidak ada antara ketiadaan pengait daerah dan jeda 13 hari | Dipecah: jeda 13 hari terjadi sebelum norma nasional ada |
| 2 | Ringkasan bab butir 3 | "BNPB mencatat ... 4 TPA pada 2026": angka 2026 olahan dari rilis BNPB dan KLH/BPLH (Galuga dari KLH; bukti P2 temuan 20) | Atribusi dibetulkan |
| 3 | 8.1.1 paragraf 1 | Kalimat meta "istilah ... hanya dipakai bab ini" | Ditulis sebagai fakta hukum: status tidak lagi berlaku setelah UU 6/2018 dicabut |
| 4 | 8.1.2 paragraf kematian berlebih | "Batas atas hampir dua kali batas bawah": rasionya 1,67 (bukti P2 Inferensi: 1,7 kali) | "dua pertiga lebih tinggi" |
| 5 | 8.1.2 paragraf KRB | Tafsiran bahaya mengikuti kepadatan dan risiko mengikuti kapasitas ditulis sebagai fakta (bukti: Inferensi tim) | Ditandai sebagai bacaan kajian |
| 6 | 8.2.1 paragraf DIBI | Rekap 2018–2026 memuat 2026 sementara tanpa keterangan (bukti P2 temuan 14) | Ditambah "(2026 sementara)" |
| 7 | 8.3.1 paragraf 1 | "Hitungan kementerian lain" keliru: pembanding mencakup daftar Pusdatinkom BNPB sendiri (14 TPA) dan KLHK (35 TPA), keduanya sekunder (bukti P2 temuan 17) | Kedua hitungan disebut berdampingan tanpa angka, dengan alasan: periode berbeda dan hanya terbaca dari pemberitaan (naskah final menolak pustaka sekunder) |
| 8 | Tabel 8.2 catatan | Kolom "terbakar 2023 dan 2026" bertanda "–" untuk Jatiwaringin dan Jatibarang tanpa penjelasan, padahal bukti mencatat keduanya terbakar 2023 (sekunder) | Catatan: kolom hanya dari rilis resmi; 2023 kedua TPA itu hanya dari pemberitaan |
| 9 | 8.3.2 paragraf 1 | Target penghentian pembuangan terbuka 2026 dan percepatan Agustus 2026 dikutip ke `klh-2026-sanksi-tpa`; sumbernya `klh-2026-open-dumping` (bukti P4 temuan 5) | Kutipan dipisah |
| 10 | Tabel 8.3 baris KLH/BPLH | Mandat prabencana tanpa dasar pasal | NSPK pengelolaan sampah bersandar UU 23/2014 Lampiran (bukti P4 temuan 9, `peran.csv` R120) |
| 11 | 8.4 paragraf 1 | Token "0 program dari 25" terbaca "memuat 0 program dari 25 yang menyasar", ambigu | Kalimat disusun ulang: program nonalam dalam kompendium berjumlah 0 dari 25 |

## Diperiksa dan tidak diubah

- Lantai: Kartu 8.1 sama dengan angka tercatat (161.870); Kartu 8.2 memakai 29 per 18 Maret 2023 (resmi Pemprov DKI),
  bukan 17, dan lingkupnya dibatasi pada kebakaran dan ledakan industri dengan alasan penyisihan Al Khoziny, Bekasi
  Timur, Gunungkidul; lantai 63 (Al Khoziny) tampil sebagai baris kepekaan. Kartu 8.3 korban "–" beralasan.
- Angka model berlabel dan bersanding tercatat: kematian berlebih WHO selalu rentang, berpil estimasi model, lawan
  144.094 terlapor; tidak di judul.
- Angka bertentangan berdampingan: Plumpang 17/18 hilang (5 Maret) lawan 29 (18 Maret); WHO 162.059 sebagai
  pemutakhiran; DIBI epidemi 2025 14 setelah entri ganda dibuang; porsi pembuangan terbuka sekitar 70–76% dengan tafsiran
  ditulis di catatan kaki.
- "Terbukti": satu-satunya pemakaian menyatakan tidak ada program nonalam yang dapat disebut terbukti.
- Kewenangan: KLB dan Daerah Terjangkit Wabah pada kepala daerah dan Menteri (UU 17/2023 Pasal 353–354, 368); pengait
  nasional Pasal 369–370; BNPB ditulis bukan regulator keselamatan industri; mandat ESDM, Perindustrian, Ketenagakerjaan
  berpasal; lini pertama TPA pada kab/kota (UU 18/2008 Pasal 9 ayat (1) huruf f); BNPB masuk setelah status ditetapkan.
- Rujukan rabies Kupang ke `bnpb-2024-tpa-suwung` benar (rilis yang sama, `peristiwa.csv` rabiesntt2024).
- Ringkasan rekomendasi r-m03, r-m07, r-m08, r-m11, r-m15 cocok dengan blok `rek` di `bab-13.md`; r-a09 ada.
- Pertanyaan kunci 1–4 KERANGKA terjawab; Kartu 8.1–8.3, Gambar 8.1–8.2, Tabel 8.1–8.3 ada di naskah.

## Sisa untuk orkestrator (di luar berkas ini)

1. Direktori `gambar/mitigasi/` belum ada: berkas Gambar 8.1 (`bab08-g11-kematian-covid19-pekan.png`) dan Gambar 8.2
   (`bab08-g23-garis-waktu-status-epidemi.png`) belum dibuat.
2. `bab-13.md` r-m15 menulis 16 TPA "terbakar serentak" pada 2023 sebagai fakta; bukti P4 membolehkan "bersamaan" hanya
   sebagai kutipan Kepala BNPB karena kejadian tersebar Agustus–Oktober.
3. `data/angka.json` `nonalam.plumpang2023.meninggal_akhir` (29) masih berlabel resmi dengan sumber sekunder; Bab 8
   memakai `nonalam.plumpang2023.meninggal_pemprov_18mar`. Pemilik registri memutus.
4. `lembaga/celah.csv` C09 dan C14 masih memuat simpulan lama (tidak ada pengait; penanggung jawab belum ditemukan);
   `peristiwa.csv` dan `skenario_terburuk.csv` masih menulis "hari ke-2" untuk Plumpang (pemilik paket `nonalam-sosial`
   dan `lembaga`).
5. Sebelum terbit, kutipan UU 17/2023 Pasal 353, 368–370, 454 dicocokkan ke salinan JDIH BPK (catatan kaki `ocr`); PP
   28/2024 dan salinan final Permenkes 1/2026 belum dibaca, sehingga simpulan pengait daerah tetap bersyarat.
