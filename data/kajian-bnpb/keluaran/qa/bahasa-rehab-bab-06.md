# Laporan penyuntingan bahasa: Rehab Bab 6 (Air: Sistem Perpipaan Pascabencana)

Berkas: `data/kajian-bnpb/naskah/rehab/bab-06.md`. Lapis (c), 25 Oktober 2026.

## Vonis akhir

`qa/slop.py --final`: LOLOS, skor 0, nol pelanggaran, 4.341 kata, kata kosong 0,0 per 1.000. Sebelum suntingan skor juga 0, dengan dua temuan rendah (S-30 dan S-18) yang kini hilang.

## Suntingan

| No | Lokasi | Perubahan | Alasan |
| --- | --- | --- | --- |
| 1 | Tabel kerusakan-air, baris sarana darurat | JIAT dan PDAM dieja di sel tabel (Jaringan Irigasi Air Tanah; Perusahaan Daerah Air Minum) | Tabel muncul sebelum prosa yang mengeja keduanya; singkatan dieja pada kemunculan pertama |
| 2 | Subbab Lapis Darurat, paragraf Lombok dan Cianjur | Ejaan JIAT dan PDAM di prosa diganti singkatan | Hapus ejaan ganda |
| 3 | Subbab Lapis Darurat, paragraf WHO | WHO dieja sekali dengan padanan Inggris | Glosarium |
| 4 | Subbab Lapis Sementara, paragraf kuantitas peralihan | "Organisasi Kesehatan Dunia (WHO)" diganti "WHO" | Ejaan ganda |
| 5 | Catatan tabel kesenjangan | K/L dieja (Kementerian/Lembaga) | Singkatan belum dieja |
| 6 | Subbab Bukti Program | SCIRT dieja (Stronger Christchurch Infrastructure Rebuild Team) pada kemunculan pertama | Singkatan belum dieja |
| 7 | Subbab Lapis Permanen, paragraf PP 122/2015 | Kalimat 48 kata dipecah menjadi empat kalimat | S-30, satu kalimat satu gagasan |
| 8 | Subbab Waktu Pulih, paragraf kekuatan bukti | Tiga-serangkai sumber diganti "satu paparan konferensi dan dua dokumen pendukung (laporan pelaksana dan abstrak)" | S-18 |

Angka, token, kutipan, rujukan, dan makna tidak diubah.

## Catatan untuk pemilik bab

- Glosarium mendefinisikan IPA sebagai Indeks Pemakaian Air. Bab ini memakai IPA untuk Instalasi Pengolahan Air dan mengejanya di tempat pemakaian pertama di prosa. Heading subbab Lapis Darurat memuat "IPA Mobile" sebelum ejaan itu; belum diubah karena anchor dan daftar isi bergantung pada judul. Usul: tambah entri IPA kedua di glosarium atau ganti judulnya.
- `rehab.pipa.cianjur.r3p_transmisi_paket2_rp` dipakai untuk paket kedua dan ketiga; ini disengaja, catatan di `bukti/bab-06.angka.json` menyebut kedua paket bernilai sama.
- Kalimat "menurut skema sertifikasi lembaga penguji ... SNI 4829:2015 ... SNI 06-0084-2002" di akhir paragraf standar tanpa rujukan `[@...]`; tidak disentuh karena penambahan rujukan adalah wewenang penulis.
