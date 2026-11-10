# DESIGN-SYSTEM: Tangga Peringatan

Tab "Tangga" memakai chrome `/prediksi` yang ada: kepala situs biru tua, token Centurisk97, `public/inti/kartu.css`, `tabel.css`, `tip.js`. Tidak ada palet halaman sendiri.

## Komponen

| Komponen | Bentuk |
| --- | --- |
| Kendali | Baris `.tbar`: pilih provinsi, pilih kabupaten, segmen ancaman (Semua, Kering, Basah). Lebar penuh, terbagi rata. |
| Ringkasan | Kartu `.ex.ex-std`: pil kategori "Ringkasan", judul kalimat temuan dengan angka disorot `.hl` ("N kabupaten di Provinsi X menguat kering, M menguat basah"), isi tabel `.ex-tabel` kepala rata tengah: kabupaten, kering, basah. Baris tabel dapat diklik untuk membuka tangganya. |
| Tangga | Kartu `.ex.ex-std` per kabupaten; isi: satu baris per skala, dari musim ke jam. Tiap baris: kepala skala di kiri (nama, rentang), dua sel (Kering, Basah). |
| Sel ancaman | Daftar pernyataan: pil tingkat (label resmi), kalimat, baris kecil "lembaga, terbit/diambil tanggal, cakupan". Pil cakupan "tingkat provinsi" atau "tingkat nasional" bila bukan kabupaten. |
| Pil sinyal | Di kepala kolom: "menguat" (pil `ok`), "belum selaras" (pil `buruk`), tooltip `data-tip` berisi peringkat tiap skala dan aturannya; tautan "Aturan" membuka `<details>`. |
| Kosong | Teks abu "Belum ada data" atau "Tidak disebut dalam pernyataan ini". Tidak pernah "aman". |
| Grafik | Deret peringkat per skala (batang kecil 0 sampai 3) di bawah tiap kolom, hover menampilkan nama skala, label resmi, lembaga. |
| Label | Pil "analisis" untuk Himawari, "pengamatan" untuk petir, "kita" untuk prediksi Centurisk97 beserta pil vonis rapornya. |

## Selera pemilik yang berlaku

Tanpa titik tengah sebagai pemisah teks (pakai koma, kalimat, label sendiri, atau baris baru). Tanpa kata "Pantau Bencana". Format Indonesia: tanggal "10 Nov 2026", angka dengan koma desimal, jam 24. Kepala tabel rata tengah. Tanpa kaki keterangan di kartu. Judul kartu berupa kalimat temuan. Tooltip pada grafik. Pilihan berderet penuh dan terbagi rata. Teks paragraf rata kiri-kanan.

## INP

Kontrol (pemilih, segmen, baris tabel) mengubah chrome (nilai terpilih, `aria-pressed`) saat itu juga; isi tangga dirender setelah satu frame tercat. Isi tangga satu kabupaten kecil (7 baris), tetapi tabel ringkasan provinsi bisa 60 baris: dibatasi 60 baris dengan "Tampilkan lagi".

## Responsif

1440 px: dua kolom ancaman bersebelahan dengan kepala skala di kiri. 390 px: kepala skala di atas, kolom Kering dan Basah bertumpuk; tidak ada gulir mendatar di luar tabel.
