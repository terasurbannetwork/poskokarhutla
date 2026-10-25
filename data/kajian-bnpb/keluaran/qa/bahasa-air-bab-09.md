# Penyuntingan bahasa: kajian air, Bab 9 (Kelembagaan, Pembiayaan, dan Peta Jalan)

Lapis (c) penyunting bahasa, 24 Oktober 2026. Berkas: `naskah/air/bab-09.md`.

## Vonis

- `qa/slop.py --final`: LOLOS, skor 0, nol pelanggaran (3.519 kata, kata kosong 0,0 per 1.000). Sebelum sunting juga LOLOS skor 0.
- Angka, token `{{angka:...}}`, kutipan, rujukan silang, label keyakinan, dan isi tabel tidak diubah.

## Suntingan

| Baris | Masalah | Tindakan |
| --- | --- | --- |
| 36 | "Pola Pengelolaan Sumber Daya Air (PSDA)" menyamakan PSDA dengan dokumen pola, padahal glosarium dan baris 76 memakai PSDA = Pengelolaan Sumber Daya Air | "pola" ditulis huruf kecil di luar kepanjangan: "pola Pengelolaan Sumber Daya Air (PSDA)" |
| 46 | Kalimat pembuka tebal "Ancaman air bergantung pada norma ..." tidak logis (subjeknya ancaman, bukan peran) | "Peran lembaga untuk ancaman air bergantung pada norma lintas jenis bencana" |
| 78 | "juga" berulang dua kali berturut-turut; aposisi "sebuah tafsiran penyusun" menggantung di ujung kalimat | Label tafsiran dipindah ke awal kalimat; kalimat berikut memakai "pun merupakan tafsiran" |
| 126 | RPJMN muncul pertama di prosa bab tanpa kepanjangan (L66, gerbang T-9) | Dieja "Rencana Pembangunan Jangka Menengah Nasional (RPJMN)" |
| 130 | PFB dipakai di catatan @gbr:pembiayaan tanpa pernah diperkenalkan | "Pooling Fund Bencana (PFB)" |
| 151 | Renstra muncul pertama di prosa bab tanpa kepanjangan (T-9) | Dieja "Rencana Strategis (Renstra)" |
| 16, 76, 89, 124, 199 | "punya" kurang formal untuk register ilmiah | Diganti "memiliki" |
| 179 | "tanggal penetapan Kepala BNPB" taksa (penetapan sang Kepala) | "tanggal penetapan oleh Kepala BNPB" |

## Daftar periksa M-1 sampai M-14

- M-1 pasif penyembunyi pelaku: tidak ditemukan; pasif yang ada menyebut pelaku atau pasalnya.
- M-2 sinonim berputar: istilah "tertulis" dan "pemetaan" (penyusun) konsisten; "tafsiran penyusun" dan "pemetaan penyusun" adalah label keyakinan, sengaja diulang.
- M-3 pembuka mengulang judul: tidak ada.
- M-4, M-8, M-13: tidak ada keberatan fiktif, subbab templat, atau kalimat bijak tanpa isi.
- M-5: semua angka lewat token; tidak ada angka ketik tangan selain nomor pasal, tahun, dan nomor peraturan.
- M-6: tidak ada klaim sebab-akibat dari korelasi.
- M-7: baris 48 memuat kalimat penutup yang merangkum peran BNPB lintas subbab; dibiarkan karena berfungsi sebagai simpulan matriks.
- M-9: rekomendasi di ringkasan dan tabel memuat lembaga, mitra, dan tenggat.
- M-10: kontras "acuan arah, bukan alat ukur" (baris 199) berlandaskan alasan metode belum dibaca; sah.
- M-11, M-12: register formal konsisten; tebal hanya pada kalimat pembuka temuan (L16).
- M-14: tidak berlaku untuk naskah (uji tukar logo untuk halaman keluaran).
- Pengulangan antarsubbab: keadaan tertentu Perban BNPB 5/2018 muncul di §usulan (posisi peran) dan §instrumen (detail perubahan Perpres 46/2026) dengan sudut berbeda; dibiarkan.

## Temuan di luar lapis bahasa (tidak disunting)

- `bangun/kontrak/naskah.py naskah/air/bab-09.md` gagal di baris 15: kunci `lembaga.matriks_air.baris_total` tidak ada di `data/angka.json` (nol kunci `matriks_air`; pembuatnya `bangun/lembaga.py`). Token tidak diubah penyunting; `angka.json` perlu dibangun ulang oleh pemilik data sebelum DOCX.
- Ringkasan bab memakai singkatan (BNPB, BPBD, DSP, RTD, NSPK, PJT, WS) sebelum dieja di prosa. Mengikuti pola bab lain; bila `bab_prosa` T-9 ikut membaca kotak ringkasan, singkatan itu perlu dieja di ringkasan.
