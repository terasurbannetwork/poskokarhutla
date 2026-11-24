# DESIGN-SYSTEM: Data lanjutan BPBD

Tidak ada gaya baru. Layar web `/lapor/data/` memakai token `public/inti/tema.css` dan komponen yang sudah ada di `public/lapor/lapor.css`; rincian staf memakai kartu `/lapor/meja`. Urutan bangun mengikuti AGENTS 3.9: token, element, blocks, layar.

## Aturan pemilik yang berlaku

- Kepala kartu = nama seksi berikon, tanpa kalimat kesimpulan (AGENTS 3.5, 11 Nov).
- Tanpa teks kapital semua, tanpa titik tengah sebagai pemisah.
- Kartu tidak menempel, jarak 20 px.
- Deretan pilihan ujung ke ujung, terbagi rata, berikon.
- Sidebar terang dan bisa dipindah kiri atau kanan seperti `/lapor/meja`.
- Ikon tombol polos tanpa garis luar.
- Klik tidak membekukan layar: chrome tab urgent, daftar objek dan peta deferred.

## Layar `/lapor/data/` (ponsel dulu)

```
+--------------------------------------+
| Kepala situs navy (bersama)          |
| Berkas LA-201126-03, Kab X, terbuka  |
+--------------------------------------+
| [Rumah][Prasarana][Ungsi][Korban]... |  <- deretan pilihan, ujung ke ujung, ikon + jumlah
+--------------------------------------+
| Peta titik objek tab ini (lipat)     |
+--------------------------------------+
| Kartu objek: foto kecil, nama,       |
| desa, pil tingkat, pil penanda       |
| ...                                  |
+--------------------------------------+
| [+ Tambah rumah]  (tombol lekat bawah)|
+--------------------------------------+
```

## Element

| Element | Keadaan |
| --- | --- |
| Pil tingkat rusak RB/RS/RR/Tidak rusak, pil Terendam terpisah | warna status dari token, label Indonesia |
| Pil fungsi Putus/Terbatas/Berfungsi | warna status dari token |
| Pil penanda (tanpa titik, foto jauh, dobel, NIK ganda) | kuning peringatan, `title` menjelaskan aturannya |
| Pita "Belum terkirim" | antrean luring; hilang sesudah terkirim |
| Isian "belum didata" vs "nihil" | tombol Nihil per metrik (meninggal, hilang, RB, dst.); metrik nihil tampil 0, belum didata tampil kosong |
| Peringatan luring data pribadi | bila ada isian pribadi atau foto wajah yang belum terkirim, keluar halaman meminta konfirmasi |
| Foto wajib | kotak kamera bergaris putus dengan hitungan "1 dari 2" |

## Blocks

- Form objek: satu kolom, isian wajib dulu, opsional di bawah `<details>` "Tambahan".
- Ringkasan berkas: tabel `.ex-tabel` kepala navy, baris per bagian, kolom jumlah dan "belum didata".
- Kondisi akhir penutupan: tabel tiga baris (hilang, mengungsi, putus) dan pil status.

## Rincian staf di `/lapor/meja`

Tab baru "Data lanjutan" di rincian tiket: deretan jenis objek, tabel objek, peta, riwayat, versi beku. Data pribadi (HP, NIK) tersamar sampai staf menekan Tampilkan; tiap tampilkan tercatat di `lapor_akses`.
