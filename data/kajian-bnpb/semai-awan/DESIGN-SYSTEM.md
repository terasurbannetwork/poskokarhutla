# DESIGN-SYSTEM: Peluang Semai Awan dan Prakiraan Asap

Seksi ini hidup di dalam Operasi Udara, jadi **seluruh** `data/kajian-bnpb/operasi-udara/DESIGN-SYSTEM.md` berlaku: aturan selera §1,
warna makna §2, komponen §3, panel seksi kiri §7, tingkat wadah §8. Dokumen ini hanya menambah yang baru. Gaya ada di
`public/operasi_semai.css`, semua selektor diawali `#opsLaporan .sm-`.

## 1. Letak

- Panel kiri Operasi Udara, grup **Hari ini**, seksi baru **Peluang semai** (ikon awan bertetes) sesudah Peta, hash `#semai`.
  Angka kecil di kanan = jumlah zona usulan putaran terakhir ("–" bila tanpa prakiraan).
- Ringkasan Operasi Udara mendapat satu baris di Perlu tindakan bila ada peringatan asap merah: "asap ke Timor-Leste sekitar 24 jam",
  klik membuka `#semai`.

## 2. Tata letak seksi (lebar 1440)

```
L1 kepala navy: "Peluang semai"                                [Pos komando | Tinjau BMKG | Mitra]  [Salin ringkasan]
bilah sumber (satu baris kecil, tiap sumber pil sendiri berikon): [FIRMS VIIRS 1.564 piksel, 2 dari 3 satelit, belum masuk NOAA-21] [ECMWF IFS 0,1°, putaran 14 Nov 00z, CC BY 4.0] [umur 3 j]
┌──────────────────────── peta (kolom 1fr) ─────────────────────────┐ ┌──── kolom kanan 380 px ────┐
│ kotak lapisan kiri atas          tombol + − ○ kanan atas           │ │ L2 Rekomendasi              │
│                                                                    │ │ L2 Zona usulan 24 jam       │
│ bilah jam: ▶ Min 15 Nov, 10.00 WIB  +18 j  ECMWF 00z  ━━━━━●━━    │ │ L2 Peringatan asap          │
└────────────────────────────────────────────────────────────────────┘ │ (Tinjau: L2 Bobot, L2 Faktor)│
┌──── L2 Cluster aktif (tabel) ────┐ ┌──── L2 Cara memutuskan (lipat) ┐ └─────────────────────────────┘
L2 Yang tidak terlihat satelit dan model (lipat)
L2 Rapor uji (lipat; "data kurang (n = 3)" sampai n >= 30)
```

Kolom kiri dan kanan berakhir rata (aturan tanpa ruang kosong): tinggi peta mengikuti tinggi kolom kanan minimal 640 px. Di bawah
900 px kolom kanan turun ke bawah peta; bilah jam tetap menempel di bawah peta.

## 3. Peta

Satu peta MapLibre yang sama dengan Peta Operasi Udara (`public/operasi_peta.js`); lapisan semai ditambah, bukan peta kedua.

| Lapisan | Bentuk | Warna |
| ------- | ------ | ----- |
| Titik api | titik 3 px; > 40 MW lebih besar | merah `#d7301f` > 40 MW, oranye `#f28c28` di bawahnya |
| Awan layak semai | raster PNG per langkah, sel 0,1 derajat dihaluskan untuk dibaca | biru `#2b7bd8` 70% |
| Prakiraan asap | raster PNG per jam, tiga tingkat | cokelat `#6e5426` (warna makna asap §2) 25, 45, 65% |
| Angin pengarah | panah tipis tiap 1 derajat, panjang mengikuti kecepatan | abu `#8a94a6` |
| Zona semai | lingkaran 14 px berpinggir merah bata `#a63a26`, label pil "A 0,78"; zona terpilih penuh merah bata, label putih; garis putus ke titik hujan | merah bata |
| Base | segitiga navy `#0b2545`; base dengan armada OMC berpinggir ungu OMC `#5b35a8` | |
| Kota | titik abu kecil + nama | |

Kotak lapisan memakai pola kotak lapisan peta utama (memori "sidebar bisa ditarik": overlay dan legenda tiru `index.html`), dengan
saklar per lapisan dan kotak warna. Teks kotak lapisan: Titik api, Awan layak semai, Prakiraan asap, Angin pengarah (850 sampai
700 hPa), Zona semai, Kota dan base.

Arahkan kursor ke zona: tooltip "Zona B, skor 0,78, terbang 13.00 sampai 16.00 WIB". Klik zona = sama dengan klik baris daftar.

## 4. Bilah jam

Kartu putih menempel di bawah peta di dalam wadah peta: tombol putar bulat navy 40 px (▶ / ❚❚), teks jam setempat tebal
"Min 15 Nov, 10.00 WIB", baris kecil "+18 j, ECMWF 00z", penggeser 9 titik henti. Putar = maju satu langkah tiap 1,2 detik, berhenti
di +24. `prefers-reduced-motion`: putar tetap bisa, tanpa transisi raster.

## 5. Kolom kanan (L2)

| Kartu | Isi |
| ----- | --- |
| Rekomendasi | label kecil "Rekomendasi"; judul besar "Zona A"; provinsi; skor besar monospasi + pil hijau "terbang 10.00 sampai 13.00 WITA"; kotak koordinat dua kolom (DMS kiri, desimal kanan, klik menyalin); garis tipis; "Alasan" dengan empat baris berikon kotak berhuruf C (biru), F (merah bata), T (abu tua), B (navy); tombol penuh navy "Jadikan target renlap" (Pos komando, peran Q3) |
| Zona usulan 24 jam | daftar kartu L4: lingkaran huruf, provinsi tebal, "terbang 13.00 sampai 16.00, dekat Palangkaraya", skor monospasi kanan; terpilih bergaris navy; pil "sudah target" ungu bila sudah renlap; pil "hati-hati" merah bata bila tanda bahaya MUCAPE; pil "di luar jelajah" oranye |
| Peringatan asap | hijau lembut bila aman lintas batas ("Asap belum menyeberang ke negara lain 24 jam ke depan"); merah lembut bila menyeberang: label "Peringatan asap", judul "Asap menyeberang ke Timor-Leste sekitar 24 jam lagi", baris kecil jam, kota, cluster asal; daftar kota: nama, negara kecil, "tiba +3 j" monospasi, pil tingkat (tinggi merah, sedang oranye, rendah abu garis); kaki kecil "beban asap relatif dari model lintasan, bukan PM2.5 terukur" |
| Bobot (Tinjau) | tiga penggeser 0 sampai 1 dengan angka monospasi kanan; saklar "seperti Nimbus"; pilihan jeda 20, 30, 45, 60 menit; tombol garis "Setel ulang bobot" |
| Faktor 10 sel terbaik (Tinjau) | tabel: lintang bujur, Q, D, T, skor tebal; kepala tabel navy (DS Operasi Udara §8); tombol "Salin CSV" |

Kartu kosong Rekomendasi: judul berupa kalimat ALGORITMA §7 tanpa huruf besar, paragraf kecil penjelasan, tombol tetap ada
("Salin ringkasan").

## 6. Tampilan peran

Pemilih tiga segmen ujung ke ujung berikon (memori "deretan pilihan ujung ke ujung"): Pos komando (ikon menara), Tinjau BMKG (ikon
timbangan), Mitra (ikon jabat tangan). Tampilan non-Pos komando memunculkan pita keterangan biru sangat muda di atas kolom kanan:

- Tinjau: "Mode tinjau: tiap skor menampilkan masukan dan bobotnya."
- Mitra: "Tampilan mitra: cluster teragregasi dan asap; titik api per piksel tetap di BNPB."

Mitra: lapisan titik api diganti lingkaran cluster bertepi oranye (jari-jari mengikuti FRP), kotak koordinat menulis
"-4,5, 122,0 (±0,5°)", alasan dan garis titik hujan disembunyikan, tombol renlap disembunyikan.

## 7. Tabel Cluster aktif

Kolom: Cluster ("#1 dekat Kendari"), Provinsi, Piksel, Daya api (MW), Terakhir terlihat (jam setempat), Zona terbaik (pil huruf).
Angka rata kanan monospasi, format Indonesia. Klik baris = peta terbang ke cluster. Paling banyak 12 baris, sisanya "+35 cluster lain"
yang bisa dibuka.

## 8. Dialog Jadikan target renlap

`<dialog>` pola `.ops-dlg`: judul "Jadikan Zona B target renlap OMC"; baris: base (pilihan, bawaan terdekat berarmada OMC), tanggal
renlap, jendela terbang, koordinat, alasan otomatis (tidak bisa disunting, bisa ditambah catatan); tombol "Simpan target" navy dan
"Batal" garis. Sesudah simpan: pil "sudah target" di zona, toast kecil "Target ditambahkan ke renlap <base> <tanggal>".

## 9. Ikon baru

Awan bertetes (seksi), menara (Pos komando), timbangan (Tinjau), jabat tangan (Mitra), papan klip (salin ringkasan), segitiga base.
Garis 1,5 px, tanpa latar dan tanpa garis luar pada tombol ikon (memori "ikon tanpa garis luar").

## 10. Gerak dan INP

- Ganti langkah jam: penggeser dan teks jam dicat dulu; raster awan dan asap diganti dengan `setPaintProperty`/`updateImage` di frame
  berikutnya; daftar tidak dirender ulang.
- Geser bobot: angka bobot dicat langsung; hitung ulang 400 sel dan zona di `requestIdleCallback` dengan pembatalan saat geser lagi.
- Pilih zona: garis terpilih dicat dulu; peta `easeTo` dan kartu Rekomendasi menyusul.
- Ganti tampilan peran: hanya `hidden` dan kelas; tanpa ambil data ulang.
- Raster 9 langkah dimuat malas: langkah terpilih dulu, sisanya sesudah idle.
