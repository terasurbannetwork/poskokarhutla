# DESIGN-SYSTEM: Bangunan di lereng terjal

Layar baru `public/longsor/lereng.html` (nama akhir menunggu Q13) mengikuti sistem yang sudah ada, tidak membuat gaya baru. Urutan kerja (AGENTS.md 3.9): token di `public/inti/tema.css`, elemen dengan semua keadaannya, blok, baru layar. Literal warna di luar `tema.css` tidak ditambah (gerbang `gerbang-token-warna`). Kode peramban dirujukkan dulu ke skill `modern-web-guidance` sebelum ditulis (LT-17 sampai LT-19).

## 1. Aturan yang berlaku dari repo

- Bagian layar adalah kartu `.ex.ex-std` dari `public/inti/kartu.css` (AGENTS.md 3.5). Kepala kartu berisi nama seksi dengan ikon, bukan kalimat temuan. Tidak ada kalimat kesimpulan di kepala atau baris pertama kartu. Tidak ada kaki "Sumber"; definisi kolom di `title` kepala tabel.
- Kartu tidak menempel satu sama lain: jarak 20 px.
- Kepala tabel biru tua, tulisan putih, rata tengah. Tabel `.ex-tabel` menempel penuh.
- Tanpa huruf kapital semua dan tanpa titik tengah sebagai pemisah teks.
- Paragraf rata kanan-kiri. Grafik dan peta interaktif dengan tooltip saat diarahkan.
- Deretan pilihan (kab/kota, ukuran jumlah atau kerapatan) selebar penuh, terbagi rata, berikon.
- Sidebar terang, tanpa tombol tukar sisi. Layar laporan baru masuk daftar `LAYAR` gerbang `gerbang-kartu-std`.
- Layar tinggal di `public/longsor/` dan hanya membaca JSON dari `public/longsor/data/lereng/`.

## 2. Wireframe

```
+------------------------------------------------------------------+
| kepala situs bersama (navy, token Centurisk97)                    |
+------------------------------------------------------------------+
| pilih kab/kota: [Bandung Raya] [Kab Bandung Barat] [Kab Bandung]  |
|                 [Kota Bandung] [Kota Cimahi]    (ujung ke ujung)  |
+------------------+-----------------------------------------------+
| sidebar terang   | kartu Ringkasan paparan                       |
| filter:          |  jumlah S, rentang, bangunan total, cakupan   |
| ukuran: jumlah/  |  pil: hipotesis | belum ada DEMNAS            |
| kerapatan        +-----------------------------------------------+
| ambang: 40%      | kartu Peta kolom per kecamatan (MapLibre 3D)  |
| (tertera)        +-----------------------------------------------+
|                  | kartu Peringkat (dua tabel berdampingan)      |
|                  +-----------------------------------------------+
|                  | kartu Desa (tabel, saring, urut, ekspor)      |
|                  +-----------------------------------------------+
|                  | kartu Kejadian (citra sebelum/sesudah,         |
|                  |   potongan melintang)                          |
|                  +-----------------------------------------------+
|                  | kartu Uji desa longsor (label awal)           |
+------------------+-----------------------------------------------+
| tab Metode: sumber, ambang, dua peta sepakat, risiko DSM, batas   |
+------------------------------------------------------------------+
```

Dua kolom bersisian berakhir sejajar (tidak ada ruang kosong besar di bawah kolom pendek).

## 3. Elemen

| Elemen | Keadaan | Catatan |
| --- | --- | --- |
| Pil status | hipotesis, belum ada DEMNAS, belum dihitung, kelengkapan tidak diketahui, paling sedikit | Warna dari token status yang sudah ada; label berbahasa Indonesia; tidak ada warna selain abu untuk "belum dihitung". |
| Angka utama | ada, rentang, tak ada | Rentang ditulis "5.120 sampai 7.480"; tak ada ditulis "belum ada DEMNAS", tidak pernah 0. |
| Kolom 3D | ada, abu arsir (belum ada DEMNAS), terpilih | Tinggi linear; skala di legenda. |
| Tabel desa | urut, saring, ekspor | Kolom cakupan dan kelengkapan selalu tampil. |
| Pembanding citra | geser sebelum/sesudah | Tanggal kedua citra tertulis di bawah tiap citra. |
| Potongan melintang | dua garis (DEMNAS dan GLO-30), ruas di atas ambang diberi tanda | Pengganda vertikal tertulis di gambar. |
| Tombol ekspor | siap, menyiapkan, gagal | Tanpa koordinat bangunan. |

## 4. Teks layar (bahasa polos, EYD)

Skill `bahasa-indonesia-plain` dipakai untuk semua teks. Kata yang dipakai: "bangunan di lereng terjal pada dua peta", "paparan lereng", "belum ada DEMNAS", "paling sedikit". Kata yang tidak dipakai: aman, rawan (untuk label wilayah), rumah warga, prediksi, risiko tinggi tanpa dasar. Contoh label: "Hipotesis: kecocokan dengan 21 desa longsor 2025 sampai 2026 baru uji awal".

Tiap kartu menyebut ambang, sumber DEM, dan rilis bangunan di pil atau tooltip, tanpa kaki "Sumber".

## 5. Keadaan layar

| Keadaan | Tampilan |
| --- | --- |
| Memuat | rangka kartu dengan tinggi tetap, tanpa lompatan layout |
| Wilayah belum dihitung | kartu abu "belum dihitung" dengan nama wilayah |
| Berkas indeks hilang | pesan "data lereng tidak tersedia", bukan angka 0 |
| Indeks lebih tua dari rilis terkunci | pil "data lama" bersama tanggalnya |
| Tanpa hak (Q14) | halaman meminta masuk; tidak ada angka di sumber halaman |

## 6. Interaksi dan INP

Klik pilihan kab/kota memuat satu berkas JSON kecil per kotak dan menggambar kartu ringkas lebih dulu (urgent) sebelum peta dan tabel (deferred). Sorotan 3D dan tabel besar tidak digambar di handler klik yang sama. Daftar desa besar di-virtualisasi. Pemeriksa: `inp-reviewer` dan `selera-angka`.
