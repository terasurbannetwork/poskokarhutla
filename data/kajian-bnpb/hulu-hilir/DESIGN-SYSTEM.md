# DESIGN-SYSTEM: Hulu ke hilir di `/siklus/kaji/:id`

Ikut `data/kajian-bnpb/siklus/DESIGN-SYSTEM.md` §3.6 dan AGENTS 3.5 dan 3.9. Tidak ada token atau warna baru di luar `public/inti/tema.css` (gerbang `gerbang-token-warna`). Kepala kartu berupa nama seksi berikon, tanpa kalimat kesimpulan (AGENTS 3.5, pembaruan 11 Nov 2026). Tabel memakai `.ex-tabel` yang menempel penuh, kepala tabel navy tua bertulisan putih, rata tengah. Tanpa kaki "Sumber" di kartu; definisi kolom masuk atribut `title` kepala tabel. Tanpa titik tengah sebagai pemisah teks. Teks Indonesia ditulis lewat skill `bahasa-indonesia-plain`; kode web klien dirujukkan dulu ke `modern-web-guidance`.

Aturan kartu (AGENTS 3.5, pembaruan 11 Nov 2026): kartu tidak memuat kalimat kesimpulan, baik di kepala maupun di baris pertama; isinya angka, tabel, dan bagan. Kalimat templat (ALGORITMA 9) hanya muncul di lampiran cetak A4 dan di lipatan "Metode dan kalimat" (`<details>`). Karena itu "satu paragraf" dengan hujan di ALGORITMA 12 berarti: di kartu, kelompok angka uji golongan dan kelompok angka hujan DAS berdampingan dalam satu blok yang sama; di lampiran, satu paragraf. `public/siklus/hulu_hilir.js` membangun kartunya lewat `kartu()` dari `public/siklus/inti.js` dan masuk dua daftar di `tests/agen/gerbang-kartu-std.test.mjs` (daftar `LAYAR` dan daftar skrip yang wajib memakai `kartu()`).

## 1. Tata letak

```
kiri 7 kolom                                         | kanan 5 kolom
[ Jam pertama (banjir_jam1) ]                         [ Peta kejadian: DAS, sempadan, zona, sel genangan ]
[ Genangan radar (banjir_gfm) ]                          pemilih lapis: Zona | Lereng | Genangan | Titik hilang
[ Hulu ke hilir ] pil "keadaan, bukan sebab" pil hipotesis
   .sk-ber, enam angka dalam dua baris tiga sel: Luas DAS | Hutan hilang tahun kejadian di lereng > 40 persen | Hutan hilang berlabel sebelum | Puncak hujan | Genangan di zona hilir | Hasil uji bahaya
   segmen: Hutan dan lereng | Sempadan | Zona | Hujan | Genangan | Bekas longsor | Bahaya
   isi segmen aktif (satu tabel atau satu bagan)
[ Metode ] lipat (<details>)
[ Bandingkan dengan petugas dan DIBI ]  (kartu yang sudah ada, tidak diulang)
```

Seluler: satu kolom; peta 220 px di bawah ringkasan; segmen menjadi baris dua kolom yang membungkus.

## 2. Komponen

| Komponen | Pakai | Catatan |
| --- | --- | --- |
| Kartu | `.ex.ex-std` dari `public/inti/kartu.css` | pil kategori `.ex-ey` berikon; satu kartu satu seksi |
| Angka ringkas | `.sk-ber` (Siklus) | enam sel dalam dua baris tiga, penuh lebar, dibagi rata; kosong ditulis alasannya, bukan nol |
| Rentang | `.sk-rentang` | dipakai bila angka berupa rentang (mis. penduduk di area genangan dari kartu Genangan, tidak diulang) |
| Segmen | deretan pilihan ujung ke ujung, penuh lebar, dibagi rata, beribu | tidak memakai warna status; label bahasa Indonesia |
| Tabel | `.ex-tabel` | urut menurut nilai yang relevan; baris "tak terdata" selalu ada di bawah dan berteks |
| Bagan tumpuk per tahun | SVG satu berkas milik layar, batang tumpuk per tahun, tiap batang terbagi kelas lereng atau label waktu | tooltip saat hover dan fokus papan ketik (aturan pemilik: tiap grafik interaktif); batang tahun kejadian diberi bingkai tegas dan keterangan "tahun kejadian, tidak dapat dipisah" |
| Bagan hujan | garis laju per slot (IMERG) dan batang harian (CHIRPS), dua sumbu terpisah | penanda puncak dan jam mulai naik; sumber ditulis di legenda, tidak dirata-rata |
| Pil status | pil perkiraan radar, pil hipotesis, pil produk resmi | warna dari token yang ada; pil hipotesis dicabut hanya oleh vonis (HH-11) |
| Penggeser | `public/inti/geser.*` (GS-10) | hanya bila citra tersedia; dipakai di segmen Genangan |
| Peta | MapLibre seperti `public/siklus/kaji.js` | lapis garis DAS, garis sempadan tipis, zona tiga warna kelas, titik sel genangan, kotak 5 km titik hutan hilang; tanpa koordinat bangunan |

Segmen Bekas longsor: ringkasan (jumlah, luas, persen di hutan utuh, persen di lahan terbuka, luas tak teramati), tabel per kelas lereng dan zona dengan laju, angka uji golongan (rasio dan selang) berdampingan dalam satu blok dengan angka hujan DAS dari segmen Hujan (diulang di sini); kalimat templatnya hanya di lipatan Metode dan lampiran cetak, daftar sampai 6 lokasi dengan penggeser `public/inti/geser.*` (tombol Sebelum, Sesudah, Semu SWIR), dan peta lapis "Bekas longsor" berupa titik pusat per objek. Pil "perkiraan dari citra" dan "hipotesis" wajib; jendela tanggal citra tertulis di kepala tabel.

## 3. Warna dan kelas

Kelas lereng, zona, dan kelas sempadan memakai deret warna berurutan dari token `tema.css` yang sudah ada untuk kategori terurut (muda ke tua); tidak ada palet lokal. Bila token yang cocok tidak ada, ditambahkan satu kali di `tema.css` lewat tiket HH-10 dan dicatat di ratchet, bukan di CSS layar.

## 4. Teks dan angka

- Format Indonesia: titik ribuan, koma desimal; hektare tanpa desimal; persen satu desimal; milimeter satu desimal.
- Angka di bawah 10 ha diberi "~" (aturan cuplikan).
- Setiap angka hutan hilang menampilkan label waktunya (sebelum, tahun kejadian, sesudah, belum tercakup) dengan cara yang sama di tabel, bagan, dan lampiran cetak.
- Semua angka lereng tampil berdampingan dengan porsi hutan awal kelas itu. Kartu tidak pernah menampilkan "52 persen" sendirian.
- Kata yang dilarang: satu-satunya daftar ada di ALGORITMA 9. Yang dipakai: berada di, teramati, di area genangan, tercatat.
- Kosong: "tidak ada area di zona ini", "tidak terdata DEM", "belum tercakup", "belum dihitung", "produk resmi belum tersedia sebagai data". Tidak pernah "0" untuk yang tidak terukur.

## 5. Cetak A4

Satu lembar, gaya cetak CSS dari layar (tanpa PDF server, kaji ulang Q7), kepala berisi nomor kejadian, versi, tanggal data per sumber, dan pil hipotesis. Empat blok: ringkasan enam angka, tabel Hutan dan lereng (satu baris per tahun yang relevan dengan label waktu), tabel Zona, kotak Hujan, kalimat metode dua baris. Peta statis PNG bila tersedia. Memenuhi `gerbang-kertas-a4`.

## 6. Interaksi dan INP

Pilihan segmen dan lapis peta membekukan layar bila seluruh `setState` dibungkus transition; chrome kontrol urgent, subtree berat (bagan, tabel panjang) deferred (aturan pemilik). Baris tabel dengan lebih dari 40 baris dirender bertahap. `inp-reviewer` memeriksa handler segmen dan lapis peta (HH-10, HH-11).
