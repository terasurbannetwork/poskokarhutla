---
name: ppt-format-bnpb
description: Format baku presentasi BNPB (Badan Nasional Penanggulangan Bencana) untuk laporan karhutla dan kebencanaan. Dipakai setiap kali membuat, menyusun, merapikan, atau mengedit PPT, slide, deck, bahan paparan, laporan harian, laporan penanganan, paparan wilayah, paparan pimpinan, atau deck kajian atas nama BNPB, walaupun templat tidak disebut.
---

# Format PPT BNPB

> Ringkasan selera presentasi yang berlaku untuk semua deck BNPB, disusun dari deck yang sudah dikoreksi pemilik antara 18 dan 25 Okt 2026. Sumber lengkapnya bab "Selera presentasi (PPT)" di Buku Pegangan Pantau Bencana. Bila berkas ini dan Buku Pegangan berbeda, Buku Pegangan yang berlaku.

Semua ukuran ditulis dalam pt. Slide 16:9 berukuran 960 × 540 pt (13,333 × 7,5 inci; 1 inci = 72 pt; 1 pt = 12.700 EMU), jadi render 72 dpi memberi 1 px = 1 pt.

---

## 1. Prinsip

1. **Hanya ada satu gaya rumah: kerangka BNPB.** Deck dari pihak lain (instansi, konsultan, mitra) dipakai sebagai sumber isi, bukan sumber gaya.
2. **Salin deck acuan, bukan generator lama.** Bila ada deck lama yang sudah dikoreksi, deck itu yang ditiru.
3. **Padat tapi bernapas.** Satu slide berisi 3–4 blok (grup angka, 2–3 panel, pita bawah), 180–290 kata, mengisi area y≈101–500. Tidak ada isi yang menempel ke tepi panel.
4. **Satu topik, satu kontainer.** Isi yang setopik tidak dipisah ke kotak lain. Panel gelap di samping tidak dipakai.
5. **Label, bukan kalimat.** Keterangan ditulis sebagai chip pendek. Tiap panel punya kepala, tiap peringkat punya nomor, tiap penanda punya nama, tiap warna dan bulatan punya legenda.
6. **Teks yang tidak membawa informasi dibuang.**
7. **Semua yang bisa disunting dibuat native**: teks, pil, tabel, grafik, penanda dan label peta. Gambar hanya untuk foto, logo, peta dasar, dan ikon.

---

## 2. Kerangka halaman

| Unsur | Ukuran |
| --- | --- |
| Layout | PUTIH `FFFFFF` untuk isi. GELAP `051C2C` untuk penutup, pembatas Lampiran, dan pembatas bab bila dipakai. Tanpa persegi putih full-bleed |
| Margin | Kiri 43,2 pt, tepi kanan isi 916,8 pt, lebar isi 873,6 pt |
| Kotak judul | x 43,2, y 21,6, tinggi 47,5–65 pt, anchor bawah, inset 0. Lebar 823 pt, atau 644 pt bila ada pil CUT OFF |
| Garis | 0,75 pt `1A1A1A` selebar 873,6 pt di y 95 (bawah judul) dan y 507,6 (atas footer) |
| Logo BNPB | 27,4 × 34,6 pt di (889,4; 28,8), tanpa lingkaran |
| Footer | `Badan Nasional Penanggulangan Bencana  \|  Copyright 2026` (dua spasi mengapit garis), 8,5 pt `1A1A1A` di y 512,6. Nomor halaman 8,5 pt bold rata kanan, berakhir di x 916,8 |
| Sampul dan penutup | Tanpa footer dan tanpa nomor halaman |

Nama berkas: `<Judul deck> DDMMYY`, DDMMYY = tanggal paparan.

---

## 3. Jenis deck

| Jenis | Isi | Sampul / penutup |
| --- | --- | --- |
| Laporan Kejadian Bencana Harian | 4 slide: sampul, ringkasan dan peta, rincian per jenis, penutup. Cut off 12.00 WIB | Ya / ya (GELAP) |
| Laporan Penanganan Pengendalian Karhutla | 2 slide: peta nasional, tabel provinsi. Cut off 17.00 WIB hari laporan, kolom terakhir angka sementara | Tidak / tidak |
| Paparan wilayah | Slide yang makin menyempit: provinsi, kabupaten fokus, kawasan atau cluster api, risiko lanjutan, rencana tindak lanjut 7 hari | Tidak / tidak |
| Paparan pimpinan (Presiden) | Versi Utama: sampul, 4 temuan, Kesimpulan, Terima kasih. Versi Lengkap ditambah pembatas Lampiran dan lampiran A/B | Ya / ya, penutup sebelum lampiran |
| Deck kajian | Sekitar 12 slide isi tanpa slide agenda (lihat bagian 9) | Ya / ya |

**Laporan harian, slide ringkasan**: pita KPI di y 101–174; peta 605 × 227 pt di (40; 184); panel STATUS PENANGANAN 247 × 238 pt di (670; 184); legenda di tengah bawah peta; pita "YANG AKAN DILAKUKAN BNPB" 874 × 65 pt di y 431–496.

**Laporan harian, slide rincian**: satu panel per jenis yang benar-benar menonjol, lebarnya sebanding isi. Panel kosong tidak dipasang. Bencana lain dipisah per jenis, masing-masing dengan kepala, ikon, dan warna sendiri (gempa bumi slate `5B7A99`, kebakaran TPA `A23B2A`, banjir `2F6FB5`). Tabel kekeringan ditutup baris TOTAL berikon (KK, jiwa, liter air).

**Laporan harian, sampul**: foto kanan x 497–960 dengan fade putih ke kiri; logo dalam lingkaran putih 79 pt; judul 34 pt bold 2 baris, patah setelah "Bencana"; nama lembaga 16 pt bold `00499D`; pil PERIODE `FBE7D6` 331 × 30 pt berikon kalender; "DISAMPAIKAN OLEH" 9 pt `D9600B`, nama 14 pt bold, jabatan 12 pt `6B7280`; pil tanggal navy 230 × 30 pt; kredit foto 7 pt.

**Laporan harian, penutup**: foto dengan gradasi navy; "Terima kasih" 54 pt dengan garis `F28C28` 2 × 374 pt; nama lembaga 18 pt bold (bukan nama pejabat); tanpa kartu kontak.

**Penanganan**: langsung ke data, tanpa penutup. Pil CUT OFF di slide tabel dan peta. Versi ringkas dibuat dengan memotong slide, tata letak tidak diubah.

**Paparan wilayah**: slide provinsi, kabupaten, dan kawasan memakai pola judul yang sama, hanya wilayahnya berganti. Slide risiko dan rekomendasi tanpa pil CUT OFF; slide rekomendasi tanpa catatan kaki dan tanpa pita kepala panel.

**Paparan pimpinan**: kode lampiran di depan judul ("A1. ", "B4. "). Tabel panjang dipecah "(lanjutan 2/5)" dengan baris dibagi rata. Kesimpulan berupa 8 kartu dalam grid 4 × 2 ditambah pita ARAHAN `D9600B`.

---

## 4. Judul

| Jenis | Ukuran | Bentuk | Warna sorot |
| --- | --- | --- | --- |
| Templat BNPB (Penanganan) | 26 pt bold, 1 baris | `<Topik> per Tanggal 22 Oktober 2026`, subjudul 12 pt | Angka di subjudul `D9600B`, provinsi `00499D` |
| Laporan harian | 22 pt bold, jarak baris 95% | Kalimat kesimpulan | Tiap angka kunci `D9600B` |
| Paparan wilayah | 20 pt bold | Judul topik deskriptif | Satu frasa `D9600B` (wilayah atau "(7 Hari)") |
| Pimpinan, lampiran | 19–22 pt bold | Kalimat temuan, diawali kode lampiran | Angka `D9600B`, tempat `00499D` |
| Deck kajian | 19–22 pt bold | Slide temuan: kalimat temuan berangka berkode bagian ("A1. "). Sampul, pembatas, navigasi, usulan: deskriptif | Kode dan angka `D9600B`, tempat `00499D` |

- **Paling banyak dua baris, di semua deck.** Kalau tidak muat, huruf dikecilkan; jangan turun ke baris ketiga.
- **Judul deskriptif menang atas judul data.** Contoh: "Sebaran Titik Panas dan Kebakaran di **Jawa Timur** per 22 Oktober", "Rekomendasi Rencana Tindak Lanjut Sepekan **(7 Hari)** ke Depan".
- **Pola judul laporan harian**: `Laporan {DD–DD Bulan YYYY}: {N} kejadian menonjol di {P} provinsi, terdiri atas {a} karhutla dan {b} kekeringan; {c} kejadian karhutla masih dalam proses penanganan`.
- **Subjudul 12 pt** satu baris, selesai sebelum x≈690 supaya tidak menabrak pil CUT OFF. Subjudul tidak mencampur angka total dengan angka kohort.

---

## 5. Tipografi

- **Hanya Roboto**, termasuk font tema. Tanpa emoji.
- **Skala ukuran**:
  - nilai kartu 17 pt bold; hitungan panel 16–18 pt; nilai ubin 15 pt;
  - judul panel 11 pt bold; judul grafik 10 pt; judul kolom pita dan judul langkah 9 pt bold;
  - footer 8,5 pt; label kartu dan label bagian 7,5 pt; isi daftar dan isi pita 7,2 pt;
  - kepala kolom 6,5 pt bold `6B7280` spasi huruf 80; pil bagian 6,6 pt bold KAPITAL spasi 100; pil status 6–6,4 pt.
- **Batas bawah 6 pt** untuk teks yang dibaca. 5,2–5,8 pt hanya untuk persen di tabel padat dan chip. Kalau baris tidak muat, kurangi atau kelompokkan baris; jangan ciutkan huruf.
- **KAPITAL berspasi 80–100** hanya untuk pil bagian, kepala kolom, dan label pita. Label KPI dan status ditulis huruf kecil ("laporan kejadian", "selesai").

---

## 6. Palet

| Peran | Warna | Tint |
| --- | --- | --- |
| Teks utama, isi, redup | `1A1A1A`, `2E3440`, `6B7280` | `A9B4C2` untuk "baru" |
| Navy: pil, peringkat, baris total, selesai, nilai netral | `051C2C` | `E6EAF0` chip, `F3F5F8` grup |
| Oranye: angka kunci, api, naik, berjalan | `D9600B` | `FBE7D6` pil, `FDF4EC` pita, `F2D3BA` pemisah, `F4C3A0` batang lama, `FDF1E8` baris sorot |
| Merah: perlu perhatian, bahaya, belum padam (deck wilayah) | `C8102E` | `F8DDE0` pil, `FCF1F2` grup |
| Biru: turun, air, musim hujan | `2F86D1` | `DCEBF8` pita kepala, `B7D3EE` batang lama, `EEF5FC` pita, `C9DDF2` pemisah |
| Slate: luas, BMKG, sekunder | `5B7A99` (pil kolom luas `3F5F80`) | `E3EAF1` |
| Emas kekeringan | `B08A3E`, teks `8A6A2E` | `F4ECDC`, `FBF8F2`, `E2D3B5` |
| Gunung api, gambut | `8A4B2A`, `6B4A2B` | `F1E2D6`, `EFE6DC` |
| Biru lembaga atau tempat | `00499D` | Nama BNPB di sampul, nama wilayah di judul pimpinan |
| Garis | Kartu `BFC5CC` 0,75 pt; hairline `EEF0F3`/`F1F2F4` 0,5 pt; pemisah panel `E5E7EB` | Zebra dan ubin `F7F8FA` |

- **Naik dan turun**: naik ▲ `D9600B`, turun ▼ `2F86D1`, 0% `6B7280`, batang pembanding `DCE1E7`. Di atas latar navy: naik `F2A35E`, turun `8EC5F5`. Merah dan hijau tidak dipakai untuk arah di slide.
- **Merah di laporan harian** hanya untuk perlu perhatian. "Dalam penanganan" berwarna oranye.
- **Satu warna sorot per grafik**: navy untuk dasar, `D9600B` untuk yang disorot, `DCE1E7` pembanding, `A9B4C2` sisanya. Sorot dengan bingkai `D9600B` 0,75 pt, bukan isi warna baru.
- **Satu skema kualitas udara per deck**: `7E1F1F` berbahaya, `C7811B` tidak sehat.

---

## 7. Komponen

**Pil bagian.** Kotak membulat penuh setinggi 14,4 pt, ikon putih 9 pt, label KAPITAL 6,6 pt bold putih. Navy untuk DATA SATELIT dan KEJADIAN BENCANA, merah untuk PERLU PERHATIAN dan PRESEDEN, slate untuk PERINGATAN BMKG. Labelnya hanya nama bagian, tanpa tempat atau tanggal.

**Grup kartu.** Kontainer tint (`F3F5F8`, `FCF1F2`, `EEF5FC`) setinggi 73 pt di y≈101–104, pil bagian di kiri atas, jarak antargrup 21 pt. KPI tidak dibuat sebagai satu deret datar.

**Kartu angka.** Putih, garis `BFC5CC` 0,75 pt, radius ≈5,8 pt, 132–159 × 40 pt. Lingkaran tint 26 pt di x+8,6 berisi ikon 14 pt sewarna nilai. Nilai 17 pt bold berwarna makna, label 7,5 pt `2E3440` satu baris (contoh "titik panas, naik 39%"). Jarak antarkartu 7,2 pt.

**Panel berpita.** Putih bergaris `BFC5CC`, radius ≈4,3 pt. Pita kepala 36 pt berwarna tint tema (`E6EAF0` netral, `FBE7D6` api, `F8DDE0` bahaya, `DCEBF8` air, `F4ECDC` kekeringan); sudut bawah pita lurus. Isi pita: lingkaran solid 23 pt berikon putih 14 pt, judul 11 pt bold, hitungan 16–18 pt bold rata kanan. Jarak antarpanel 10,8 pt. Panel setinggi isinya; panel berikutnya langsung menyusul.

**Daftar status.** Satu baris: lingkaran ikon, nama tempat bold diikuti ", lokasi" regular, pil status di kanan, chip fakta 5,8 pt di bawah nama. Pil status: belum padam `F8DDE0`/`C8102E`; berjalan atau pendataan `FBE7D6`/`D9600B`; kumulatif `E6EAF0`/`051C2C`. Laporan harian hanya punya 2 status: selesai (navy, centang) dan dalam penanganan (oranye). Urut menurut sisa belum padam, terbesar dulu.

**Tabel peringkat.** Kepala metrik berupa pil berikon 57,6 × 16,6 pt (TITIK navy, LUAS (HA) `3F5F80`, BELUM PADAM `C8102E`). Baris 17,3 pt dengan pemisah `EEF0F3`. Nomor dalam bulatan navy 13,7 pt. Angka rata kanan, panah dan persen rata kiri. Wilayah fokus diblok `FDF1E8` dan tetap memakai nomor aslinya. Baris total berupa kotak navy 21 pt. Judul kolom rata tengah.

**Tabel provinsi templat BNPB.** Chip grup 167,6 × 31,7 pt per kelompok berbintang (FIRESPOT, HOTSPOT, LUAS TERBAKAR, BELUM PADAM, tiga hari masing-masing). Sel berupa batang mini 23,5 pt dengan nilai 8–9 pt di atas dan delta 6,8 pt di bawah. Baris Jumlah kotak navy 862 × 30 pt. Urut menurut hotspot hari terakhir. Data lapangan yang belum ada ditulis "NA" dan dijelaskan di catatan kaki.

**Tabel native lampiran.** Kepala 7,8–8,5 pt bold dengan garis bawah 1 pt; baris 18–21,6 pt bergaris bawah 0,5 pt `BFC5CC`; tanpa garis vertikal; paling banyak 24 baris per slide.

**Peta (2D).** Latar putih atau abu sangat muda, tanpa laut biru. Kab/kota bertitik `D3DBE5`, tanpa titik `F1F3F6`. Bulatan `D9600B` bergaris putih, luas sebanding jumlah titik. Nomor peringkat berupa lingkaran putih bergaris oranye; label berupa pil putih bergaris abu ("Jember 19"). Peta zoom: titik diwarnai menurut umur (`B4BDC8` lama, `F2A35E` tengah, `C8102E` terbaru). Tidak boleh ada yang bertumpuk. **Wajib legenda** 7–7,5 pt yang menerangkan arti bulatan dan warna.

**Peta 3D timbul (keputusan pemilik 25 Okt 2026).**
- Tiap wilayah digambar sebagai shape freeform native bernama `Provinsi - <Nama>` atau `Kabupaten - <Nama>`, jadi warnanya bisa diganti di PowerPoint lewat Shape Fill.
- **Wajib dimiringkan**: tinggi dikali 0,8.
- Kesan timbul dari tiga lapis sisi yang digeser turun (tebal sekitar 9 pt, makin ke bawah makin gelap, bertingkat dari slate `5B7A99`) dan bayangan kabur di bawahnya.
- Permukaan dasar `E6EAF0` bergaris tipis `A9B4C2`. Wilayah sorot memakai warna makna (`D9600B` api, `C8102E` perlu perhatian, `2F86D1` air) dan bergaris putih.
- Penanda dan nomor juga native. Nomor yang berdempet digeser dan diberi garis penunjuk ke penandanya.
- Tanpa cincin hiasan; latar tetap putih tanpa laut biru; legenda tetap wajib.
- Dipakai untuk peta sebaran nasional atau provinsi di paparan wilayah dan deck kajian. Laporan Harian dan Penanganan tetap memakai peta deck acuannya kecuali diminta.

**Grafik batang harian.** Batang berujung atas membulat (round2SameRect adj 22000) di atas garis dasar 0,75 pt `BFC5CC`, tanpa sumbu Y. Nilai 7,6 pt bold di atas batang; tanggal 6,5 pt di bawah (hari terakhir ditulis "22 Okt"), lalu persen perubahan 6 pt bold berwarna arah. Batang pertama `DCE1E7` sebagai pembanding; hari lama memakai tint, tiga hari terakhir warna pekat. Kepala grafik: nama metrik 10 pt di kiri, perubahan neto "▼ 67%" di kanan.

**Pita bawah.** Kotak membulat selebar 874 pt, tinggi 61–71 pt, berwarna `FDF4EC` (aksi, indikator), `EEF5FC` (musim hujan), atau `F7F8FA` (data). Label 7,5 pt bold spasi 100. Isi 3–4 kolom dipisah garis 0,75 pt; tiap kolom: lingkaran 26 pt berikon putih, judul 9 pt bold, isi 7,2 pt paling banyak 2 baris.

**Baris rekomendasi.** Kolom LANGKAH, RINCIAN, PENANGGUNG JAWAB, baris 46,8 pt. Lingkaran 26 pt diwarnai menurut jenis aksi (oranye api, navy dukungan, biru musim hujan). Rincian satu kalimat 8 pt rata kiri-kanan, sekitar 110 karakter. Penanggung jawab berupa chip lembaga berikon, bukan logo.

**Pil CUT OFF DATA.** Navy `051C2C` di kanan atas (x≈696, y≈70), lebar 186–220 pt, tinggi 16,6–18 pt. Isi: `CUT OFF DATA` 6–8 pt bold `AFC3DA`/`A9B4C2` spasi 100, lalu `22 Okt 2026, 23.00 WIB` 8–10 pt bold putih. Jam ditulis bertitik. Dipasang di setiap slide data.

**Catatan kaki.** Bilah `4A9BE0` sekitar 3 × 13–17 pt di x 43,2 y≈488–490. Teks baku: `*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).` (7,5 pt di deck wilayah, 9,5 pt miring di templat BNPB). Data hari berjalan ditambah "Angka 22 Okt sementara, data s.d. 16.25 WIB." Slide analisis memakai baris "Sumber: ..." 7,5 pt `6B7280`.

**Ikon.** Gaya garis (Lucide/Tabler), PNG 256 px satu warna, selalu di dalam lingkaran. Ikon putih di atas lingkaran solid, ikon berwarna di atas lingkaran tint warnanya sendiri. Ukuran ikon 55–62% diameter lingkaran. Ikon wajib ada di kepala tabel, kartu angka, dan chip.

**Slot foto (keputusan pemilik 25 Okt 2026).**
- Hanya untuk sisa ruang slide yang isinya tidak penuh. Sisa ruang diisi foto, bukan panel yang direntangkan. "Panel setinggi isinya" tetap berlaku: foto mengisi ruang slide yang tersisa, bukan ruang kosong di dalam kontainer.
- Kotak membulat dengan radius panel (≈4,3 pt). Foto dipotong *cover*, tidak digepengkan. Kredit foto 7 pt di pojok.
- Keterangan (opsional) di pita navy `051C2C` transparan 20% di bawah foto, teks putih 9 pt bold rata tengah. Keterangan menyebut tempat dan tahun sebenarnya.
- Foto harus relevan: lokasi kejadian, operasi, atau dampak. Sumber: foto pemilik, BPBD/BNPB, atau Wikimedia Commons berlisensi bebas.
- Kalau foto belum ada, tanyakan dan sebut slide serta posisinya. Deck tidak dikirim dengan placeholder foto.

---

## 8. Isi, angka, dan bahasa

**Sumber data**
- Semua angka karhutla (hotspot, luas terbakar, belum padam) dari data satelit kita sendiri. Fakta lapangan (status, korban, kekeringan, gempa, operasi) dari laporan BPBD atau Dit. Koordalops.
- Titik panas = lokasi unik ~375 m per hari WIB dari MODIS, VIIRS S-NPP, NOAA-20, NOAA-21, keyakinan sedang/tinggi, tanpa sumber panas industri. Firespot dihitung dalam titik juga, jadi firespot <= hotspot.
- Peta di deck sama dengan peta aplikasi; jumlah cluster sama.
- **Angka harus cocok di seluruh deck**: angka di judul, kartu, daftar, dan ikon peta sama. Selesai + berjalan = kejadian menonjol.
- Data lapangan yang sudah basi ditulis bertanggal atau dibuang, jangan tampil tanpa tanda.

**Format**
- Angka gaya Indonesia: titik ribuan, koma desimal, paling banyak 1 desimal; "–" bila kosong. Persen ribuan juga bertitik (+1.244%).
- Satuan selalu ditulis. "rb"/"jt" hanya di label sempit; kalimat memakai "ribu/juta".
- Pembulatan: laporan harian bulat tanpa desimal ("± 635.296 ha"); templat BNPB dengan data lapangan "±502,08 ha"; hitungan satelit dan deck wilayah bulat tanpa ±.
- Tanggal: di judul bulan ditulis penuh ("22 Oktober"); di isi disingkat ("22 Okt"); rentang memakai en dash ("15–22 Okt"). Periode laporan harian 07.00–07.00 WIB.

**Istilah**
- "Titik panas" untuk data satelit, bukan "titik api". "Hotspot" tetap dipakai di templat BNPB karena label templatnya begitu.
- Luas dari satelit = "hitungan satelit", tidak pernah "perkiraan satelit".
- "Cluster", bukan "kompleks".

**Bahasa**
- Bahasa Indonesia lugas dan faktual, satu baris satu temuan, angka di depan.
- **Em dash dilarang sama sekali. Titik tengah " · " dilarang**: pakai koma, chip sendiri, atau baris baru. En dash hanya untuk rentang.
- Tanpa emoji, slogan, personifikasi, kontras "X bukan Y", tiga-serangkai, dan kalimat penutup bergaya.
- Hindari kata khas AI (komprehensif sebagai hiasan, memanfaatkan bila "memakai" cukup, krusial, esensial, mulus, menavigasi, mendalami, transformatif) dan pembuka klise ("Di era", "Dalam lanskap", "Tidak dapat dipungkiri").
- Angka yang belum lulus uji balik tampil dengan label "belum diuji balik" atau pil "hipotesis".

---

## 9. Pola deck kajian (dari McKinsey, BCG, Bain, Deloitte, KPMG)

Berlaku untuk deck kajian. Deck harian, penanganan, wilayah, dan pimpinan tetap mengikuti bagian 3 kecuali diminta. Teknik konsultan masuk ke dalam kerangka BNPB, tidak menggantikannya.

**Alur cerita**
- Jawaban di depan: slide isi pertama adalah Pesan Kunci (kalimat tesis lalu 4–6 temuan, satu per bagian).
- Urutan bagian dari masalah ke tindakan: kondisi, risiko, skenario, kesenjangan, grand design.
- Satu kerangka dipakai ulang sebagai kolom matriks, label peta, dan chip; namanya memakai istilah undang-undang (prabencana, tanggap darurat, pascabencana), bukan slogan.
- Slide isi membawa temuan, lampiran membawa rincian. Judul slide dibaca berurutan harus menjadi ringkasan.

**Judul dan penanda**
- Angka di judul dibuktikan di slide yang sama.
- Judul grafik 10 pt memuat topik, satuan, dan periode dalam satu baris.
- Posisi ditandai kode bagian `D9600B` di depan judul ("A1. ", "B2. "), tanpa slide agenda. Lampiran berkode "L1. ".
- Seri slide sejenis memakai deret chip 6,6 pt di bawah garis judul; chip aktif navy.

**Anatomi slide**
- Satu slide satu pesan dalam 3–4 blok: satu bukti utama (grafik, peta, atau matriks), 2–3 kartu angka, pita bawah bila ada aksi.
- Zona catatan kaki y≈485 sampai 507,6: satu baris Sumber 7,5 pt plus paling banyak 2 baris catatan 6 pt.
- Label keyakinan berupa pil 6–6,4 pt di pojok kanan atas panel: Resmi, Terverifikasi, Estimasi model, atau Asumsi kebijakan.
- Paling banyak 6 butir per daftar (ideal 3–4), 2 tingkat.
- Dua slide berurutan tidak memakai jenis tata letak yang sama, kecuali lampiran tabel dan seri bertemplat sama.
- Tiap slide isi punya grafik native, tabel native, atau peta. Tidak ada slide teks saja.

**Pilih bentuk menurut pesan**

| Pesan | Bentuk |
| --- | --- |
| Lonjakan antara dua titik waktu | Dua batang dengan kurung kelipatan atau persen ("2,5×", "turun 40%") |
| Kondisi kini ke sasaran lewat beberapa tuas | Waterfall bertuas A–D, satuan fisik (jiwa, m³, rumah), bukan rupiah |
| Wilayah dibandingkan | Grafik atau peta kecil berganda bersumbu sama, satu sorot |
| Bahaya × wilayah | Peta panas kelas diskret, legenda di atas |
| Peringkat | Batang horizontal terurut, nilai di ujung, nomor dalam bulatan navy |
| Kemungkinan × dampak | Matriks 5 × 5 tint `E6EAF0`, nomor dalam bulatan navy |
| Pilihan × kriteria | Tabel bersel kelas teks bertint (Tinggi, Sedang, Terbatas) dengan legenda |
| Rantai tahap | Kolom tahap berikon dihubungkan chevron |
| Seri panjang dengan periode khusus | Garis dengan pita periode dan garis rata-rata berpil navy |

**Matriks, rekomendasi, penutup**
- Matriks lembaga × fase: sel berisi chip kode peran; sel kosong "–" berlegenda.
- Tabel penanggung jawab: kepala kolom ikon dan singkatan lembaga (bukan logo), sel chip huruf peran (K koordinator, P pelaksana, R penetap, I informasi).
- Kondisi kini ke target: kolom "Kondisi <tahun>" dan "Target 2029".
- Rekomendasi bernomor dalam lingkaran navy, chip jenis aksi, pil status (Sudah ada; Sudah ada, perlu dikembangkan; Usulan baru).
- Peta jalan tanpa Gantt: pita grup per horizon (100 hari, 2026–2027, 2028–2030).
- Pembiayaan berupa arsitektur sumber (APBN, APBD, Dana Siap Pakai, dana bersama, KPBU) tanpa nominal.
- Kesimpulan 8 kartu grid 4 × 2 dan pita ARAHAN `D9600B`. Penutup tanpa nama penyaji dan kartu kontak.

---

## 10. Yang dilarang

- Palet atau font lembaga lain (Poppins, Arial, serif, huruf Light), stabilo kuning, kotak keypoint, watermark, stempel diagonal.
- Panel gelap atau berfoto di samping; kotak takeaway terpisah dari grafiknya; judul di pita abu selebar slide; judul 3 baris atau lebih.
- Huruf di bawah 6 pt untuk teks yang dibaca.
- Peta berlatar navy, citra satelit, atau laut biru; penanda dan label yang dibakar ke PNG.
- Batang bertumpuk banyak warna, donat banyak irisan, Venn, ilustrasi, objek 3D dekoratif, foto stok. (Peta 3D dan slot foto di bagian 7 bukan hiasan dan diizinkan.)
- Gantt mingguan; tabel proyek beranggaran; nama strategi bergaya slogan; pita "Stop / Start".
- Merah sebagai penekanan teks (merah hanya untuk bahaya dan perlu perhatian).
- Pemisah "|" di dalam baris isi (kecuali footer baku); label vertikal di tepi kiri.
- Teks terpotong "..."; label bertumpuk; garis footer yang tidak selebar isi; data operasi basi tanpa tanda; penunjuk lampiran di deck tanpa lampiran.
- Baris sumber di bawah tiap grafik (pakai zona catatan kaki slide); kalimat ringkasan di pita grafik; status ketiga "belum selesai" merah; nama pejabat dan kartu kontak di penutup.

---

## 11. Alur kerja dan QA

1. **Tentukan jenis deck dan buka render deck acuannya** sebelum menulis kode.
2. **Kumpulkan angka.** Data satelit dari sistem sendiri, catat jam tarikannya untuk pil CUT OFF. Fakta lapangan dari BPBD atau Koordalops.
3. **Render sendiri sebelum dikirim**: `soffice --headless --convert-to pdf deck.pptx`, lalu `pdftoppm -png -r 72 deck.pdf slide`. Lihat setiap halaman. Laporan "sudah rapi" tanpa melihat render tidak dihitung bukti.
4. **Cek mekanis dari XML dan PNG**:
   - judul paling banyak 2 baris;
   - kotak teks, label, dan bulatan peta tidak beririsan;
   - tidak ada "...";
   - `grep` untuk `·` dan `—` di `ppt/slides/*.xml` hasilnya nol;
   - huruf terkecil 6 pt atau lebih, kecuali persen tabel;
   - isi berjarak 7 pt atau lebih dari tepi bawah panel;
   - setiap warna dan bulatan punya legenda;
   - angka sama antarslide;
   - nomor halaman benar;
   - tidak ada placeholder foto, dan tiap foto punya kredit.
5. **Kirim PPTX dan PDF-nya langsung.** Setiap koreksi pemilik dicatat ke Buku Pegangan.

---

## Lampiran: pembangun di repo poskokarhutla

| Berkas | Fungsi |
| --- | --- |
| `data/laporan-bnpb/generator/harian.py` | Laporan Kejadian Bencana Harian (4 slide, cut off 12.00 WIB) |
| `data/laporan-bnpb/generator/penanganan.py` | Laporan Penanganan Pengendalian Karhutla (2 slide, cut off 17.00 WIB) |
| `data/laporan-bnpb/generator/satelit.py` | Angka satelit per provinsi/kabupaten/kecamatan pada jam cut off |
| `data/laporan-bnpb/generator/peta3d.py` | Peta 3D miring: freeform native per wilayah, sisi slate, bayangan |
| `data/laporan-bnpb/generator/foto.py` | Slot foto: potong cover, kredit, pita keterangan |
| `data/laporan-bnpb/paparan-*/buat.py` | Paparan wilayah per provinsi dari templat deck pemilik |
| `data/kajian-bnpb/bangun/pptx/` | Deck kajian dari templat `templat-bnpb.pptx` |

Pembangun memakai templat XML deck pemilik (bukan pptxgenjs) supaya slide master identik dengan deck BNPB.
