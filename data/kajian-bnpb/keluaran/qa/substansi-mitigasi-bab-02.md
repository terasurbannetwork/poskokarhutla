# QA lapis (b) penyunting substansi: kajian mitigasi Bab 2

Berkas: `naskah/mitigasi/bab-02.md`. Pembanding: `naskah/mitigasi/bukti/bab-02.md` (T1.1 sampai T5.7, C1 sampai C5, §6,
§7, §9), `bab-02.angka.json`, `bab-0N.angka.json` mitigasi, `data/angka.json`, `bab-0N.pustaka.json` mitigasi, blok rek
`bab-05.md`, `bab-06.md`, `bab-13.md`; KERANGKA §2 dan §5 Bab 2; Buku Pegangan L16, L60. Diperiksa 25 Oktober 2026.

## Pemeriksaan mekanis

- `bangun/kontrak/naskah.py` `baca()` atas bab utuh dengan registri gabungan `data/angka.json` +
  `naskah/mitigasi/bukti/bab-*.angka.json` dan pustaka gabungan: lulus tanpa galat sebelum dan sesudah suntingan.
  166 token, 127 kunci unik, semuanya ada; nilai tampil cocok dengan §7 berkas bukti; label keyakinan sah.
- 71 kunci pustaka dikutip, semuanya ada, tidak satu pun berverifikasi sekunder. Angka sekunder berkas bukti (Bhola
  300.000 dan 1 juta, Palu 5 menit dan 200 km, penjelasan media selisih korban Cianjur) tidak ada di naskah.
- `qa/slop.py --final`: LOLOS, skor 1 (S-11 "luar biasa" di baris 113 adalah istilah hukum "kejadian luar biasa (KLB)",
  positif palsu). Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Ringkasan bab, angka kunci butir 2 | 38,0% KRB "dibanding" baseline RPJMN 62%; registri memberi `krb.nasional.kapasitas_minimal_sedang_persen` label asumsi-kebijakan karena kesetaraan alat ukur belum terbukti | "berdampingan dengan baseline 62% ... yang memakai alat ukur berbeda" |
| 2 | 2.2 paragraf kapasitas | "Dua angka resmi lain" menyiratkan 38,0% resmi; label registri asumsi-kebijakan tidak disebut | Ditambah kalimat label dan alasannya; "Dua angka resmi berikut memakai alat ukur yang berbeda" |
| 3 | Tabel 2.1 (`tbl:kajian-bnpb`) catatan | Baris KRB berkeyakinan resmi memuat persentase kapasitas berlabel asumsi-kebijakan | Catatan menyebut label persentase itu |
| 4 | 2.2 paragraf KRB | Kelas risiko per provinsi dari Renas Tabel 2.7 memakai 34 provinsi lama (T1.4 a), tidak disebut | "menurut susunan 34 provinsi lama" |
| 5 | Tabel 2.2 (`tbl:regulasi`) baris COVID-19 | Status "dicabut Perpres 48/2023 dan Keppres 17/2023" salah untuk Keppres 7/2020, yang dicabut Perpres 82/2020 (T2.11) | Status per peraturan ditulis terpisah, diawali "Tidak Berlaku" seperti baris UU 6/2018 |
| 6 | 2.4 paragraf rantai peringatan dini | "melintasi tiga kementerian koordinator", padahal teks dan T5.7 hanya menyebut dua (Kemenko IPK, Kemenko PMK) | "tidak berada di bawah satu kementerian koordinator" |
| 7 | 2.5 paragraf FEMA | Kalimat pembuka tebal tanpa angka (L16) | Rasio 6 dolar per dolar dipindah ke kalimat tebal; kalimat kedua menyebut asal analisis (NIBS, T3.7) |
| 8 | 2.5 paragraf Filipina | Paragraf hanya bertumpu pada laporan pelaksana dan WorldRiskIndex; batas bukti T3.8 tidak disebut | Ditambah: perbandingan antartopan tidak mengendalikan kekuatan topan maupun keterpaparan |
| 9 | Tabel 2.4 (`tbl:sendai-renas`) catatan | "kolom pemadanan berlabel asumsi kebijakan", padahal tabel tidak punya kolom pemadanan | Pemadanan baris disebut berlabel asumsi kebijakan, nilai indikator resmi |

## Diperiksa dan tidak diubah

- "Terbukti": hanya paket Bangladesh berbukti kuat, ditulis "konsisten dengan" dan "atribusi belum dievaluasi dengan
  pembanding" (T3.2); Destana dan SPAB "belum terbukti" dengan arti bukti tidak ditemukan; InaTEWS hulu sedang. Sebaran
  1/6/6/2 cocok dengan T3.1.
- Lantai skenario: bab ini tidak memuat angka skenario; paragraf "lima hal" menyatakan skenario berlantai kejadian
  tercatat terburuk (KERANGKA §2). Nankai disebut keluaran model tanpa angka.
- Angka model dan tercatat: potensi kerugian KRB disebut nilai aset terpapar hasil pemodelan dan dipasangkan dengan
  indikator kerugian ekonomi langsung terhadap PDB (T1.13); rasio FEMA berlabel estimasi-model tanpa pasangan tercatat
  dan karena itu hanya rujukan tata kelola.
- Angka bertentangan berdampingan: paparan 271,1 juta lawan 258,1 juta; kapasitas 38,0/62/67%; baseline penurunan IRB
  1,54% lawan 2,44%; selisih Rp199.999 juta RBI 2023; Phailin 44 lawan 38; klaim Asuransi BMN Rp1,14 miliar lawan Rp114
  miliar; Cianjur 334 lawan 602; JEE bagian rinci lawan tabel ringkasan.
- Kewenangan: BNPB tidak disebut regulator keselamatan industri (UU 1/1970, UU 3/2014, PP 11/1979, Permen ESDM 32/2021);
  KLB pada kepala daerah atau Menteri (UU 17/2023); konflik pada Polri dan kepala daerah (UU 7/2012); Dana Bersama pada
  Menteri Keuangan dengan rekomendasi Kepala BNPB (Perpres 75/2021 Pasal 8).
- Rekomendasi ringkasan bab (r-m04, r-m06, r-m18, r-m19) cocok dengan unit, mitra, status, dan horizon blok rek Bab 13.
- Pertanyaan kunci PK1 sampai PK4 terjawab di 2.2, 2.3, 2.5, 2.6; bahan 2.1 dan 2.4 ada. Komponen §6: Tabel 2.1, 2.2,
  2.3 (10 baris kompendium), 2.4 ada; kartu angka opsional tidak dipakai. Koreksi Jitupasna (T4.1) tertulis di blok
  koreksi.

## Sisa untuk orkestrator (di luar berkas ini)

1. Id rek ganda: `rek:r-m04` didefinisikan di `bab-05.md` baris 279 dan `bab-13.md` baris 567; `rek:r-m19` di
   `bab-06.md` baris 548 dan `bab-13.md` baris 637, dengan isi berbeda (program r-m04, jenis r-m19). Penomoran lintas
   berkas akan bentrok; pilih satu definisi.
2. `renas.krb.kerugian_jumlah_per_bahaya` (`bab-03.angka.json`) berlabel "asumsi-kebijakan; turunan", sedangkan T1.3
   berkas bukti memberi olah(resmi); `rasio_jumlah_per_bahaya_multibahaya` berlabel resmi. Pemilik kunci perlu
   menyeragamkan.
3. `krb.nasional.kapasitas_minimal_sedang_persen` ada ganda di `bab-02.angka.json` dan `bab-03.angka.json` (isi sama).
4. C3.4: `bukti.bangladesh_siklon.kematian_1970` di `data/angka.json` 500.000, Haque Tabel 1 500.300; Bab 2 memakai
   `bukti.p19.kematian_1970` (500.300). Bab lain yang memakai kunci lama akan tampil beda.
5. `Konteks._akhiran_tahun()` gagal (`string index out of range`) bila pustaka gabungan mitigasi dimuat (BNPB punya 11 sampai 14
   entri per tahun 2023 sampai 2026, melampaui 10 huruf akhiran `abcdefghij`); tidak memengaruhi `baca()`, tetapi akan memengaruhi kutipan
   saat bangun DOCX.
