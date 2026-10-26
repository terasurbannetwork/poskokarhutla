# Selera presentasi BNPB (PPT)

> Salinan kata demi kata dari `docs/buku-pegangan/pantau-bencana.md` bab "Selera presentasi (PPT)", diambil 26 Okt 2026 untuk skill deck-bnpb. Jalur repo di dalam teks (mis. `data/kajian-bnpb/...`, `bangun/pptx/...`, `qa/periksa.py`) dipetakan ke skill di `references/peta-jalur.md`. Aturan tidak diringkas; bila ada yang bertentangan, urutan otoritas di `keputusan-pemilik.md` berlaku.

## Selera presentasi (PPT)

Dari 9 deck tanggal 18 sampai 23 Okt dan koreksi pemilik saat deck itu dibuat. Ukuran diambil dari XML pptx dalam pt (slide 960×540 pt, 1 in = 72 pt, 1 pt = 12.700 EMU), jadi render 72 dpi memberi 1 px = 1 pt. Aturan yang sudah ada di [Angka & copy](#angka--copy) berlaku penuh di slide dan tidak diulang di sini: tanpa titik tengah (U+00B7), tanpa em dash, bahasa lugas, "hitungan satelit", format angka id-ID, dan "titik panas" untuk data satelit. Aturan rinci deck Penanganan varian satelit (urutan kolom, metode 48 jam, kalimat bawah judul) ada di `docs/audit-metode/2026-10-21/pedoman-deck-gabung.md`.

### Deck acuan

| Kode | Deck | Perannya |
| --- | --- | --- |
| d3 | Laporan Kejadian Bencana Harian 221026 (periode 21–22 Okt) | **Format terakhir laporan harian.** *"Ini format terakhirnya yang kemarin"* |
| d1 | Laporan Kejadian Bencana Harian 18–19 Okt | Contoh data lapangan yang boleh masuk, dan acuan panel Bencana lainnya per jenis. Tata letak lainnya sudah diganti d3 |
| d2, d4 | Laporan Kejadian Bencana Harian 20–21 Okt dan draf pertama 231026 | Hasil generator `/laporan-bnpb` dengan gaya lama. Contoh cacat, jangan ditiru. Versi akhir 231026 dibangun ulang dari d3 |
| d5 | Paparan Karhutla Jawa Timur, Malang, Arjuno 221026 | **Acuan paparan wilayah**, sudah dikoreksi pemilik berkali-kali |
| d6, d8, d7 | Laporan Penanganan Pengendalian Karhutla 221026 (satelit), 211026, 211026 Lengkap | Templat BNPB. d8 sama persis dengan d7 slide 1–3 |
| d9 | Paparan Kepala BNPB kepada Presiden 20 Okt, Lengkap | Satu-satunya acuan deck Presiden |

Nama berkas memakai pola `<Judul deck> DDMMYY`, dengan DDMMYY = tanggal paparan.

### Prinsip

- **Hanya ada satu gaya rumah.** Kerangka BNPB berlaku untuk semua deck. Deck dari pihak lain dipakai sebagai sumber isi saja: *"Gayanya tetap pakai gini cuma yang Kalteng itu untuk referensi tambahan informasi"*.
- **Deck lama yang ditunjuk pemilik yang disalin, bukan generator.** d4 dibuat dengan generator `/laporan-bnpb` (`public/laporan_bnpb_slide.js`, palet `C` di baris 9), sehingga hasilnya gaya d2. Selama generator itu belum disesuaikan, laporan harian dibangun mengikuti d3 dengan pembangun di `data/laporan-bnpb/harian-2026-10-23/` (langkahnya di README).
- **Padat tapi tetap bernapas.** Satu slide berisi 3–4 blok (grup angka, 2–3 panel, pita bawah), 180–290 kata, dan mengisi y≈101–500. Tidak ada isi yang menempel ke tepi panel: *"Jangan ada yang nempel ke bawah gitu"*.
- **Satu topik, satu kontainer**: *"JANGAN DIPISAHIN DONG CONTAINERNYA KAN SAMA"*. Panel gelap di samping tidak dipakai; isinya digabung ke panel putih.
- **Pakai label, bukan kalimat.** Keterangan ditulis sebagai chip pendek (*"Ini keterangan dibuat label aja"*). Setiap panel punya kepala (*"Kasih header"*), setiap peringkat punya nomor, setiap penanda punya nama, setiap warna dan bulatan punya legenda.
- **Teks yang tidak membawa informasi dibuang.** Daftar yang sudah dihapus ada di bawah.
- **Semua yang bisa disunting dibuat native**: teks, pil, tabel, penanda dan label peta. Gambar hanya untuk foto, logo, peta dasar, dan ikon.

### Kerangka halaman (semua slide isi)

| Unsur | Ukuran |
| --- | --- |
| Layout | PUTIH (FFFFFF) untuk isi, GELAP (051C2C) untuk penutup, pembatas Lampiran, dan pembatas bab deck kajian bila dipakai (`KEPUTUSAN.md` T13). Tanpa persegi putih full-bleed |
| Margin | Kiri 43,2 pt, tepi kanan isi 916,8 pt, lebar isi 873,6 pt |
| Kotak judul | x43,2 y21,6, tinggi 47,5–65 pt, anchor bawah, inset 0. Lebar 823 pt, atau 644 pt bila ada pil CUT OFF |
| Garis | 0,75 pt 1A1A1A selebar 873,6 pt, di y95 (bawah judul) dan y507,6 (atas footer) |
| Logo BNPB | 27,4×34,6 pt di (889,4; 28,8), tanpa lingkaran |
| Footer | `Badan Nasional Penanggulangan Bencana  \|  Copyright 2026` (dua spasi mengapit garis), 8,5 pt 1A1A1A di y512,6. Nomor halaman 8,5 pt bold rata kanan, berakhir di x916,8 |
| Sampul dan penutup | Tanpa footer dan tanpa nomor halaman (d2 dan d4 memasang footer di sampul, salah) |

### Struktur per jenis deck

| Jenis | Isi | Sampul / penutup |
| --- | --- | --- |
| Laporan Kejadian Bencana Harian | 4 slide: sampul, ringkasan dan peta, rincian per jenis, penutup. Sempat 2 slide pada 23 Okt, sampul dan penutup dipasang kembali 24 Okt. Cut off 12.00 WIB | Ya / ya (GELAP) |
| Laporan Penanganan Pengendalian Karhutla | 3 slide, cut off 15.00 WIB hari laporan (kolom terakhir sementara): peta nasional, tabel provinsi, operasi. Versi Lengkap ditambah konsesi, pembatas, A1–A11, dan B1–B5 | Tidak / tidak |
| Paparan wilayah | 5 slide yang makin menyempit: provinsi, kabupaten fokus, kompleks api, risiko lanjutan, RTL 7 hari | Tidak / tidak |
| Paparan Presiden | Versi Utama 7 slide: sampul, 4 temuan, Kesimpulan, Terima kasih. Versi Lengkap ditambah pembatas Lampiran dan lampiran A/B | Ya / ya, penutup ditaruh sebelum lampiran |

- **Harian, slide 2 (d3).**
  - Pita KPI di y101–174.
  - Peta 605×227 di (40; 184).
  - Panel STATUS PENANGANAN 247×238 di (670; 184).
  - Legenda di tengah bawah peta (x225–476, y408–423).
  - Pita "YANG AKAN DILAKUKAN BNPB" 874×65 di y431–496.
- **Harian, slide 3.**
  - Satu panel untuk setiap jenis yang benar-benar menonjol. Lebarnya sebanding isi (d3: karhutla 529 pt, kekeringan 334 pt, jarak 11 pt).
  - Panel kosong tidak dipasang (d2 menampilkan "0").
  - **Bencana lainnya dipisah per jenis**, seperti d1, setiap kali ada kejadiannya: *"Dipisahin dong ... jadi orang tau mana gempa bumi mana bla bla bla"*. Setiap jenis punya kepala sendiri dengan ikon dan warna berbeda (gempa bumi slate 5B7A99, kebakaran TPA A23B2A, banjir 2F6FB5), pil fakta, dan angka korban, pengungsi, atau rumah rusak berikon. Penanda peta slide 2 memakai warna jenisnya dan legendanya per jenis.
  - **Tabel kekeringan ditutup baris TOTAL berikon** (rumah untuk KK, orang untuk jiwa, tetes untuk air) berisi jumlah liter dan tangki: *"Buat icon"*.
- **Harian, sampul.**
  - Foto kanan x497–960 dengan fade putih ke kiri.
  - Logo dalam lingkaran putih 79 pt.
  - Judul 34 pt bold, 2 baris, patah setelah "Bencana".
  - Nama lembaga 16 pt bold 00499D.
  - Pil PERIODE FBE7D6 331×30 dengan ikon kalender, berisi `21 Okt 2026, 07.00  –  22 Okt 2026, 07.00 WIB`.
  - "DISAMPAIKAN OLEH" 9 pt D9600B spc100, nama dan gelar 14 pt bold, jabatan 12 pt 6B7280.
  - Pil tanggal navy 230×30 berisi `Kamis, 22 Oktober 2026`.
  - Kredit foto 7 pt.
- **Harian, penutup.**
  - Foto dengan gradasi navy.
  - "Terima kasih" 54 pt, garis F28C28 2×374 pt.
  - Nama lembaga 18 pt bold (bukan nama pejabat), baris laporan 13 pt C9D1E3.
  - Tanpa kartu kontak.
  - Penunjuk lampiran tidak dipasang di laporan harian 4 slide (*"Hilangkan"*). Di deck yang memang berlampiran, penunjuk 11 pt F6B26B boleh asal nomor halamannya benar.
- **Penanganan (d6, d8).**
  - Langsung ke data dan tanpa slide penutup.
  - Pil CUT OFF dipasang di slide tabel dan peta. Slide operasi tidak memakainya, jadi tanggal datanya harus tertulis di judul.
  - Versi ringkas dibuat dengan memotong slide; tata letaknya tidak diubah.
- **Paparan wilayah (d5).**
  - Slide 1–3 memakai pola judul yang sama, hanya wilayahnya yang berganti.
  - Slide risiko dan slide rekomendasi tanpa pil CUT OFF.
  - Slide rekomendasi tanpa catatan kaki dan tanpa pita kepala panel.
- **Presiden (d9).**
  - Kode lampiran ditulis di depan judul ("A1. ", "B4. ").
  - Tabel panjang dipecah ke slide "(lanjutan 2/5)" dengan baris yang dibagi rata. d7/d9 B5 5/5 hanya berisi 3 baris, dan itu cacat.
  - Kesimpulan berupa 8 kartu dalam grid 4×2 ditambah pita ARAHAN D9600B.

### Judul

| Jenis | Ukuran | Bentuk | Warna sorot |
| --- | --- | --- | --- |
| Templat BNPB | 26 pt bold, 1 baris | `<Topik> per Tanggal 22 Oktober 2026`, dengan subjudul 12 pt | Angka di subjudul D9600B, provinsi 00499D |
| Harian | 22 pt bold, jarak baris 95% | Kalimat kesimpulan | Setiap angka kunci D9600B, juga di slide 3 (d4 lupa) |
| Wilayah | 20 pt bold | Judul topik deskriptif | Satu frasa saja D9600B (wilayah atau "(7 Hari)"). Biru tidak dipakai |
| Presiden, lampiran | 19–22 pt bold | Kalimat temuan, diawali kode lampiran | Angka D9600B, tempat 00499D |
| Kajian (bawaan `KEPUTUSAN.md` T11, menyimpang dari vonis di bawah, menunggu pemilik; lihat [Belum diputus](#belum-diputus)) | 19–22 pt bold | Slide temuan (definisinya di [S7](#pola-deck-konsultan-kelas-dunia-mckinsey-bcg-big-four)): kalimat temuan berangka, diawali kode bagian ("A1. "). Sampul, pembatas, slide navigasi, dan slide usulan: deskriptif | Kode bagian dan angka D9600B, tempat 00499D |

- **Paling banyak dua baris, di semua deck.** Kalau tidak muat, huruf dikecilkan (pernah sampai 21,84 pt), jangan dibiarkan turun ke baris ketiga: *"Ukuran disesuaikan lah intinya cuma 2 baris"*. Judul d7 A1 setinggi 3 baris terpotong di atas slide, dan d9 s3 juga 3 baris.
- **Judul deskriptif menang atas judul data.** Contoh judul akhir dari pemilik: "Sebaran Titik Panas dan Kebakaran di **Jawa Timur** per 22 Oktober", "Rekomendasi Rencana Tindak Lanjut Sepekan **(7 Hari)** ke Depan", "Waspada saat peralihan musim: **9** kawasan …". Yang dipakai "musim hujan", bukan "hujan pertama".
- **Pola judul harian.**
  - Slide 2: `Laporan {DD–DD Bulan YYYY}: {N} kejadian menonjol di {P} provinsi, terdiri atas {a} karhutla dan {b} kekeringan; {c} kejadian karhutla masih dalam proses penanganan`.
  - Slide 3: `Rincian {N} kejadian menonjol: {a} karhutla ({c} di antaranya masih dalam proses penanganan) dan {b} kekeringan di {Provinsi}`.
  - Frasa "belum selesai" dan awalan "Rincian per jenis:" tidak dipakai lagi.
- **Subjudul 12 pt** ditulis satu baris dan harus selesai sebelum x≈690 pt supaya tidak menabrak pil CUT OFF. Subjudul tidak boleh mencampur kohort dengan total: d6 menyandingkan "belum padam 22.251 ha" (total) dengan kohort api 20 Okt.

### Tipografi dan warna

- **Hanya Roboto**, termasuk font tema. Tanpa emoji.
- **Skala ukuran:**
  - Nilai kartu 17 pt bold. Hitungan panel 16–18 pt. Nilai ubin 15 pt.
  - Judul panel 11 pt bold. Judul grafik 10 pt. Judul kolom pita dan judul langkah 9 pt bold.
  - Footer 8,5 pt. Label kartu dan label bagian 7,5 pt. Isi daftar dan isi pita 7,2 pt.
  - Kepala kolom 6,5 pt bold 6B7280 spc80. Pil bagian 6,6 pt bold KAPITAL spc100. Pil status 6–6,4 pt.
- **Batas bawah huruf 6 pt untuk teks yang dibaca.** Ukuran 5,2–5,8 pt hanya untuk persen di tabel padat dan chip. Kalau baris tidak muat, jumlah baris dikurangi atau baris dikelompokkan; font tidak diciutkan (d4 turun ke 6,08 pt untuk 21 baris).
- **Kapital dengan spasi huruf 80–100** hanya untuk pil bagian, kepala kolom, dan label pita. Label KPI dan status ditulis huruf kecil ("laporan kejadian", "selesai").

| Peran | Warna | Tint |
| --- | --- | --- |
| Teks: utama, isi, redup | 1A1A1A, 2E3440, 6B7280 | A9B4C2 untuk "baru" |
| Navy: pil, peringkat, baris total, selesai, nilai netral | 051C2C | E6EAF0 chip, F3F5F8 grup |
| Oranye: angka kunci, api, naik, berjalan | D9600B | FBE7D6 pil, FDF4EC pita, F2D3BA pemisah, F4C3A0 batang lama, FDF1E8 baris sorot |
| Merah: perlu perhatian, bahaya, belum padam (deck wilayah) | C8102E | F8DDE0 pil, FCF1F2 grup |
| Biru: turun, air, musim hujan | 2F86D1 | DCEBF8 pita kepala, B7D3EE batang lama, EEF5FC pita, C9DDF2 pemisah |
| Slate: luas, BMKG, sekunder | 5B7A99 (pil kolom luas 3F5F80) | E3EAF1 |
| Emas kekeringan (harian) | B08A3E, teks 8A6A2E | F4ECDC, FBF8F2, E2D3B5 |
| Gunung api, gambut | 8A4B2A, 6B4A2B | F1E2D6, EFE6DC |
| Biru lembaga atau tempat | 00499D | Nama BNPB di sampul, nama wilayah di judul Presiden |
| Garis | Kartu BFC5CC 0,75 pt, hairline EEF0F3/F1F2F4 0,5 pt, pemisah panel E5E7EB | Zebra dan ubin F7F8FA |

- **Arah naik dan turun.**
  - Naik ▲ D9600B, turun ▼ 2F86D1, 0% 6B7280, batang pembanding DCE1E7.
  - Di atas latar navy: naik F2A35E, turun 8EC5F5.
  - Pasangan ini khusus slide. Tooltip situs tetap merah dan hijau.
  - Pasangan lama turun = navy (d9, d7 A5) sudah diganti.
- **Merah di laporan harian** dipakai hanya untuk perlu perhatian. "Dalam penanganan" berwarna oranye.
- **Grup BELUM PADAM** di templat BNPB tetap oranye. Di deck wilayah, belum padam ditulis merah.
- **Palet generator lama dilarang**: D9650B, 0F1E2D, 0B4EA2, A88A3C, FBEBDD, D5D9DE.
- **Satu skema kualitas udara per deck.** Slide inti memakai 7E1F1F untuk berbahaya dan C7811B untuk tidak sehat. Lampiran A7 masih memakai C8102E dan D9600B.

### Komponen

- **Pil bagian.**
  - Kotak membulat penuh setinggi 14,4 pt, ikon putih 9 pt, label KAPITAL 6,6 pt bold putih.
  - Warna isi: navy untuk DATA SATELIT dan KEJADIAN BENCANA, merah untuk PERLU PERHATIAN dan PRESEDEN, slate untuk PERINGATAN BMKG.
  - Labelnya hanya nama bagian, tanpa tempat atau tanggal (*"DATA SATELIT"*).
- **Grup kartu.**
  - Kontainer tint (F3F5F8, FCF1F2, EEF5FC) setinggi 73 pt di y≈101–104, dengan pil bagian di kiri atas.
  - Jarak antargrup 21 pt.
  - KPI tidak dibuat sebagai satu deret datar (d1, d2, d4).
- **Kartu angka.**
  - Putih, garis BFC5CC 0,75 pt, radius ≈5,8 pt, ukuran 132–159×40 pt.
  - Lingkaran tint 26 pt di x+8,6 berisi ikon 14 pt sewarna nilai.
  - Nilai 17 pt bold berwarna makna, label 7,5 pt 2E3440 (contoh "titik panas, naik 39%").
  - Jarak antarkartu 7,2 pt. Tanpa ± di deck wilayah dan di kotak angka slide peta.
- **Panel berpita.**
  - Putih bergaris BFC5CC, radius ≈4,3 pt.
  - Pita kepala 36 pt berwarna tint tema: E6EAF0 netral, FBE7D6 api, F8DDE0 bahaya, DCEBF8 air, F4ECDC kekeringan. Sudut bawah pita ditutup rect supaya lurus.
  - Isi pita: lingkaran solid 23 pt dengan ikon putih 14 pt, judul 11 pt bold, hitungan 16–18 pt bold rata kanan.
  - Jarak antarpanel 10,8 pt.
- **Daftar status.**
  - Satu baris berisi lingkaran ikon, nama tempat bold diikuti ", lokasi" regular, dan pil status di kanan.
  - Pil status: belum padam F8DDE0/C8102E, berjalan atau pendataan FBE7D6/D9600B, kumulatif E6EAF0/051C2C.
  - Chip fakta 5,8 pt ditaruh di bawah nama. Jarak antarbaris rata.
  - Laporan harian hanya punya 2 status: selesai (navy dengan centang) dan dalam penanganan (oranye dengan titik tiga). Daftar diurutkan menurut sisa ha, terbesar dulu.
  - **Status karhutla mengikuti sisa belum padam website, bukan laporan BPBD** (*"Ini kalo dibilang data sisa ya pakai punya kita aja bro"*, *"yakin kan yang lainnya beneran selesai?"*): sisa 0 ha = selesai; sisa 10 ha atau lebih = dalam penanganan walau BPBD melapor padam (Kaltim, Luwu Timur, Arjuno 24 Okt); di bawah 10 ha = selesai kecuali BPBD melapor api belum padam (*"Ini dua gausah deh kan dikit aja"*). Semua angka sisa, termasuk di pita YANG AKAN DILAKUKAN, memakai website. Aturannya satu tempat di `data.py`.
  - **Perlu perhatian mencakup semua jenis, bukan hanya karhutla** (*"jangan hanya karhutla tulisannya tapi semua yang butuh perhatian"*): karhutla yang masih ditangani dengan sisa 100 ha atau lebih atau dilapor BPBD belum padam, ditambah kejadian lain yang dilapor BPBD belum tertangani (contoh TPA Supit Urang). Kartu berlabel "kejadian perlu perhatian"; daftar di panel status hanya berisi yang perlu perhatian (*"masukin yang perlu perhatian aja"*), tiap baris berikon jenisnya, jumlahnya sama dengan kartu.
  - **Tally harus sama di seluruh deck** (*"kalo 15 yang masih dalam penanganan ya 15"*): batang status dipecah per jenis, `selesai | karhutla ditangani | lainnya`, sehingga angka karhutla di batang = judul = ikon oranye di tabel slide 2.
  - **Provinsi berstatus Prioritas di website wajib masuk** (*"pedoman ya yang dimasukin yang prioritas"*): provinsi dengan cluster level 3 yang tidak ada di laporan Koordalops ditambahkan sebagai baris provinsi.
  - **Ruang kosong di dalam kontainer dipadatkan** (*"Gw ga suka white space banyak gini"*): panel setinggi isinya, panel berikutnya langsung menyusul; tabel satu baris tanpa baris TOTAL.
- **Tabel peringkat (d5 s1).**
  - Kepala metrik berupa pil berikon 57,6×16,6 pt: TITIK navy, LUAS (HA) 3F5F80, BELUM PADAM C8102E.
  - Baris 17,3 pt dengan pemisah EEF0F3.
  - Nomor peringkat dalam bulatan navy 13,7 pt berangka putih.
  - Angka rata kanan, panah dan persen rata kiri.
  - Wilayah fokus diblok FDF1E8 dan tetap memakai nomor aslinya.
  - Baris total berupa kotak navy 21 pt.
- **Tabel provinsi templat BNPB (d6, d8).**
  - Tiga chip grup 167,6×31,7 pt.
  - Sel berupa batang mini 23,5 pt dengan nilai 8–9 pt di atas dan delta 6,8 pt di bawah.
  - Baris Jumlah berupa kotak navy 862×30 pt.
  - Diurutkan menurut hotspot hari terakhir. Data lapangan yang belum ada ditulis "NA" dan dijelaskan di catatan kaki.
- **Tabel native lampiran.**
  - Kepala 7,8–8,5 pt bold dengan garis bawah 1 pt. Baris 18–21,6 pt dengan garis bawah 0,5 pt BFC5CC.
  - Tanpa garis vertikal, paling banyak 24 baris per slide.
- **Peta.**
  - Latar putih atau abu sangat muda, tanpa laut biru: *"petanya belakangnya jangan biru"*.
  - Peta wilayah: kab/kota bertitik D3DBE5, tanpa titik F1F3F6. Bulatan D9600B bergaris putih dengan luas sebanding jumlah titik.
  - Nomor peringkat berupa lingkaran putih bergaris oranye. Label berupa pil putih bergaris abu, misalnya "Jember 19".
  - Peta zoom kompleks: titik diwarnai menurut umur (B4BDC8 lama, F2A35E tengah, C8102E terbaru), dengan segitiga di puncak gunung.
  - Peta harian: penanda shape 17/22/24 pt (untuk 1/2/≥3 kejadian) bergaris putih 1,25 pt, ditambah badge "!" merah 11 pt di provinsi yang punya karhutla perlu perhatian. Provinsi itu juga bergaris merah di peta dasar, dan aturannya satu sumber dengan kartu PERLU PERHATIAN. Badge jumlah dan badge ! duduk di pinggir lingkaran (0,42 diameter dari pusat), jangan sampai menutupi angka.
  - **Tidak boleh ada yang bertumpuk**: *"Ini situbondo tumpang tindih"*.
  - **Wajib ada legenda** yang menerangkan arti bulatan dan warna: *"Ya apa itu lingkaran dan warnanya isinya apa legendanya"*. Teks legenda 7–7,5 pt.
  - **Peta 3D timbul boleh dipakai** (keputusan pemilik 25 Okt 2026, diambil dari skill `ppt-format-meti`, `scripts/peta.js`). Tiap provinsi digambar sebagai shape freeform native bernama `Provinsi - <Nama>`, jadi warnanya bisa diganti di PowerPoint lewat Shape Fill. Kesan timbul dibuat dari tiga lapis sisi yang digeser turun (tebal sekitar 9 pt, makin ke bawah makin gelap) dan bayangan kabur di bawahnya. Proyeksinya **wajib dimiringkan** (tinggi dikali 0,8, seperti `tilt: 0.8` METI; dikonfirmasi pemilik: *"betul dimiringin"*). Warnanya tetap palet rumah: permukaan dasar E6EAF0 bergaris tipis A9B4C2, sisi bertingkat dari slate 5B7A99, provinsi sorot memakai warna makna (D9600B api, C8102E perlu perhatian, 2F86D1 air), dan provinsi berwarna bergaris putih. Label berupa pil putih bergaris abu dengan pin. Provinsi di Jawa sampai Nusa Tenggara diberi label di laut selatan supaya tidak bertumpuk. Cincin hiasan METI tidak dipakai karena tidak membawa informasi. Latar tetap putih, tanpa laut biru. Peta 3D dipakai untuk peta sebaran nasional atau provinsi di paparan dan deck kajian. Laporan Harian dan Penanganan tetap memakai peta deck acuannya (d3, d6) sampai pemilik memintanya. Aturan legenda dan larangan bertumpuk tetap berlaku.
- **Grafik batang harian.**
  - Pola: *"Tiru model selama ini di laporan bencana harian dan laporan harian karhutla"*.
  - Batang berujung atas membulat (round2SameRect adj 22000) di atas garis dasar 0,75 pt BFC5CC, tanpa sumbu Y.
  - Nilai 7,6 pt bold di atas batang. Tanggal 6,5 pt di bawah (hari terakhir ditulis "22 Okt"), lalu % perubahan 6 pt bold berwarna arah.
  - Batang pertama DCE1E7 sebagai pembanding. Hari lama memakai tint, tiga hari terakhir memakai warna pekat.
  - Kepala grafik: nama metrik 10 pt di kiri, perubahan neto "▼ 67%" di kanan.
- **Pita bawah.**
  - Kotak membulat selebar 874 pt, tinggi 61–71 pt, berwarna FDF4EC (aksi, indikator), EEF5FC (musim hujan), atau F7F8FA (data). Labelnya 7,5 pt bold spc100.
  - Isinya 3–4 kolom dipisah garis 0,75 pt. Tiap kolom: lingkaran 26 pt berikon putih, judul 9 pt bold, isi 7,2 pt paling banyak 2 baris.
  - Pita grafik harian di slide 1 tetap dipasang: *"Eh ini tetap ada aja"*.
- **Baris rekomendasi.**
  - Kolom LANGKAH, RINCIAN, PENANGGUNG JAWAB. Baris 46,8 pt.
  - Lingkaran 26 pt diwarnai menurut jenis aksi: oranye untuk api, navy untuk dukungan, biru untuk musim hujan.
  - Rincian satu kalimat 8 pt rata kiri-kanan (*"Justify"*), sekitar 110 karakter.
  - Penanggung jawab ditulis sebagai chip lembaga berikon, bukan logo: *"Pakai ikon saja"*.
- **Pil CUT OFF DATA.**
  - Navy 051C2C di kanan atas (x≈696, y≈70), lebar 186–220 pt, tinggi 16,6–18 pt.
  - Isi: label `CUT OFF DATA` 6–8 pt bold AFC3DA/A9B4C2 spc100, lalu `22 Okt 2026, 23.00 WIB` 8–10 pt bold putih. Jam ditulis dengan titik. Deck wilayah menambah ikon jam.
  - Dipasang di setiap slide data: *"Tambahkan data cut off"*.
- **Catatan kaki.**
  - Bilah 4A9BE0 sekitar 3×13–17 pt di x43,2 y≈488–490.
  - Teksnya `*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).` dengan ukuran 7,5 pt di deck wilayah dan 9,5 pt miring di templat BNPB.
  - Data hari berjalan ditambah "Angka 22 Okt sementara, data s.d. 16.25 WIB."
  - Slide analisis memakai baris "Sumber: …" 7,5 pt 6B7280.
- **Ikon.**
  - Gaya garis Lucide/Tabler, PNG 256 px, satu warna, selalu di dalam lingkaran.
  - Ikon putih di atas lingkaran solid, ikon berwarna di atas lingkaran tint warnanya sendiri.
  - Ukuran ikon 55–62% diameter lingkaran (14/26, 14/23, 7/12).
  - Ikon wajib ada di kepala tabel, kartu angka, dan chip: *"Kasih icon"*.
- **Slot foto** (keputusan pemilik 25 Okt 2026, diambil dari skill `ppt-format-meti`, `photo` dan `sectionDivider`).
  - Dipakai bila isi slide tidak mengisi area y≈101–500. Sisa ruangnya diisi foto, bukan panel yang direntangkan. Aturan "panel setinggi isinya" tetap berlaku: foto mengisi ruang slide yang tersisa, bukan ruang kosong di dalam kontainer.
  - Bentuknya kotak membulat dengan radius yang sama dengan panel (≈4,3 pt). Foto dipotong *cover*, tidak digepengkan. Kredit foto 7 pt di pojok, sama dengan sampul harian.
  - Keterangan foto (opsional) berupa pita navy 051C2C transparan 20% di bawah foto, berisi teks putih 9 pt bold rata tengah.
  - Fotonya harus relevan dengan isi slide: lokasi kejadian, operasi, atau dampak. Sumbernya foto dari pemilik, BPBD/BNPB, atau Wikimedia Commons berlisensi bebas.
  - Kalau foto belum ada, tanyakan ke pemilik dan sebut slide serta posisinya. Deck tidak dikirim dengan placeholder foto.

### Isi dan sumber data

- **Semua angka karhutla diambil dari data website.** Hotspot dari tabel Real Time; luas terbakar dan belum padam dari lapisan peta website. *"intinya semua data hotspot luas terbakar titik panas titik puncak belum padam ambil data kita"*, dan untuk laporan harian *"Karhutla udah pasti pakai data kita"*.
- **Fakta lapangan diambil dari laporan BPBD atau Koordalops**: status, korban, kekeringan, gempa, operasi. *"laporan lapangan BPBD aja"*. Isi yang boleh masuk laporan harian bisa dilihat di d1: KK dan jiwa, liter air beserta sarananya, rumah rusak, pengungsi, pendaki, sortie WB.
- **Peta di deck sama dengan peta app.** Kompleks prioritas disorot dan bernomor, kompleks kecil masuk legenda, dan jumlahnya sama dengan app.
- **Angka harus cocok di seluruh deck.** Di d3, angka 9 "dalam penanganan" sama di judul, KPI, "(9)", 9 baris daftar, dan 9 ikon oranye di slide 3. Selesai + berjalan = kejadian menonjol. Kartu PERLU PERHATIAN = jumlah tanda ! di daftar dalam penanganan. Jumlah penanda = jumlah provinsi di judul.
- **Pembulatan berbeda per jenis.**
  - Harian: bulat tanpa desimal, "± 635.296 ha", "sisa ± 7.938 ha".
  - Templat BNPB dengan data lapangan: "±502,08 ha".
  - Hitungan satelit dan deck wilayah: bulat tanpa ±.
- **Format tanggal.** Di judul bulan ditulis penuh ("22 Oktober"). Di isi bulan disingkat ("22 Okt"). Rentang memakai en dash ("15–22 Okt"). Periode laporan harian 07.00–07.00 WIB.
- **Istilah.** "Hotspot" tetap dipakai di templat BNPB (d3, d6, d8) karena memang label templat itu. Deck wilayah memakai "titik panas". "Titik api" tidak dipakai untuk data satelit; d9 s3 dan s6 masih memakainya.

> Subbab "Pola deck konsultan kelas dunia (McKinsey, BCG, Big Four)" (S1 sampai S39) ada di `pola-konsultan.md`.

### Yang dilarang atau sudah dihapus

- **Penghapusan pemilik di d5** (*"Hilangkan"*, *"Gausah ada ini"*):
  - baris sumber di bawah grafik dan catatan kaki tentang luas;
  - "H+1" dan baris "Hasil";
  - Gantt, dan pita kepala di slide rekomendasi;
  - "(BPBD Jatim)", "Siaga Darurat" di subjudul, dan "29 Oktober" di kepala indikator;
  - kalimat ringkasan di pita grafik;
  - kolom dan kartu fire spot, serta kartu "Manual";
  - satu slide utuh (*"Slide 5 buang"*).
- **Panel gelap di samping**: *"Gausah ada yang gini di samping... Informasinya digabung aja sama yang lain di bagian yang putih"*.
- **Dihapus dari laporan harian, d1 ke d3:**
  - kartu KPI datar, dan pil jenis di bawah label peta;
  - status ketiga "belum selesai" yang merah;
  - kalimat deskripsi di daftar perlu perhatian;
  - kartu aksi keempat. Panel Bencana lainnya dan baris TOTAL kekeringan sempat hilang di d3, lalu dipasang kembali oleh pemilik pada 23 Okt;
  - desimal dan keterangan periode di tiap sel;
  - nama pejabat dan kartu kontak di penutup.
- **Cacat yang tidak boleh terulang:**
  - teks terpotong "…" (d4: 5 dari 6 baris);
  - penanda peta yang dibakar ke PNG (d4);
  - garis footer yang hanya 266 pt (d2, d4);
  - label bertumpuk (d7 A1: "389,39" di bawah "14%");
  - data operasi basi tanpa tanda (d6 s3 masih 21 Okt);
  - penunjuk "Lampiran mulai halaman 13" di deck 4 slide (d3 s4).
- **Titik tengah yang masih tersisa di d5**: strip komposisi s2 ("216 titik [titik tengah] 55%"), callout peta s3, dan pil preseden s4 ("2021 [titik tengah] Kota Batu"). Ini dibetulkan di deck berikutnya, termasuk teks yang dibakar ke PNG peta.

### Alur kerja

1. **Tentukan jenis deck dan buka render deck acuannya** sebelum menulis kode. Kalau pemilik menunjuk deck lama, yang disalin deck itu.
2. **Kumpulkan angka.** Data karhutla dari website, catat jam tarikannya untuk pil CUT OFF. Fakta lapangan dari laporan BPBD atau Koordalops.
3. **Render sendiri sebelum dikirim**: `soffice --headless --convert-to pdf`, lalu `pdftoppm -png -r 72`. Setiap halaman dibaca dengan Read. Laporan "sudah rapi" tanpa melihat PNG tidak dihitung sebagai bukti.
4. **Cek mekanis dari XML dan PNG:**
   - judul paling banyak 2 baris;
   - kotak teks, label, dan bulatan peta tidak beririsan;
   - tidak ada "…";
   - `grep` untuk titik tengah (U+00B7) dan em dash (U+2014) di `ppt/slides/*.xml` hasilnya nol;
   - huruf terkecil 6 pt atau lebih, kecuali persen tabel;
   - isi berjarak 7 pt atau lebih dari tepi bawah panel;
   - setiap warna dan bulatan punya legenda;
   - angka sama antarslide;
   - nomor halaman lampiran benar.
5. **Kirim berkasnya langsung.** PPT didahulukan dari pekerjaan website (pedoman 21 Okt). Setiap koreksi pemilik masuk ke Riwayat buku ini lalu ke bab ini.

### Belum pasti

- Pengungsi gempa yang sudah masuk masa transisi tidak tercantum sebagai kejadian menonjol di d3. Ini masih inferensi.
- Penutup Presiden (d9 s7) masih memuat nama penyaji dan kartu kontak, padahal d3 menghapusnya dari laporan harian.
- Generator `/laporan-bnpb` disesuaikan ke d3 atau tidak.
- Belum padam: merah (deck wilayah) atau oranye (templat BNPB) disatukan atau tidak.


## Lampiran: dua subbab bab Selera laporan yang dirujuk aturan deck

Kode G1 sampai G25 dan L1 sampai L72 di bab ini merujuk ke subbab berikut.

### (Selera laporan) Pilih grafik menurut pesan

Pesan ditetapkan dulu, grafik mengikutinya. Grafik di luar daftar ini butuh alasan tertulis.

| No | Pesan | Grafik | Bukti |
| --- | --- | --- | --- |
| G1 | Perubahan waktu, paling banyak 24 periode | Batang tegak ujung membulat, nilai di atas, tanpa sumbu Y | Gaya rumah d3/d5; WDR hanya untuk nilai di atas batang |
| G2 | Perubahan waktu, seri panjang | Rata-rata per dekade sebagai batang, atau garis berlabel ujung dengan anotasi kejadian dan paling banyak 3 garis acuan | OWID, White Paper Jepang, IMF |
| G3 | Musim berjalan lawan normal | Kurva tahun berjalan di atas pita median historis | Gaya rumah; ADB hanya untuk pita persentil |
| G4 | Peringkat | Batang horizontal terurut, nomor dalam bulatan navy, kolom jiwa terpapar | Gaya rumah d5; Atlas hanya untuk urutan |
| G5 | Peringkat seluruh wilayah | Satu deret batang terurut, nama hanya untuk yang disorot | Charting Our Water Future |
| G6 | Dua titik waktu per wilayah | Dumbbell terurut, titik awal DCE1E7, selisih ditulis | Atlas |
| G7 | Surplus atau defisit, anomali | Batang divergen dari nol berlabel kata; di kajian air 2E3440 lawan DCE1E7, bukan warna arah, supaya surplus tidak terbaca oranye | FT |
| G8 | Komposisi | Batang bertumpuk 100%, paling banyak 4 kategori ditambah "lainnya" | Atlas, BCG |
| G9 | Komposisi per skenario atau tahun | Batang bertumpuk per skenario, total di atas | GAR, Deloitte |
| G10 | Kesenjangan kebutuhan lawan pasokan | Waterfall atau baji dalam m³, pil selisih | Charting Our Water Future |
| G11 | Proyeksi dengan rentang | Pita melebar, garis tengah navy, angka rentang tertulis | FT, IMF |
| G12 | Rentang per wilayah atau skenario | Batang rentang mengambang dengan median | ADB, MGI |
| G13 | Skenario lawan dasar | Small multiples selisih dari skenario dasar; di kajian air 2E3440 lawan DCE1E7 berlabel "membaik"/"memburuk" | IMF |
| G14 | Efek tindakan | Pasangan batang sebelum dan sesudah, label "turun …%" | Nankai |
| G15 | Rugi bila diam lawan manfaat bertindak | Batang kupu-kupu, dua skenario | WS45 |
| G16 | Wilayah × kategori | Matriks titik atau tabel peta panas kelas diskret dengan angka tertulis | IPCC, ADB, MGI |
| G17 | Kemungkinan × dampak | Matriks 5×5 tint netral, nomor dalam bulatan | NRR (nomor polos); bulatan dari gaya rumah d5 |
| G18 | Prioritas | Kisi 3×3 horizon × dampak berisi kode, bila rekomendasi lebih dari 9 | CCDR |
| G19 | Sebaran rasio atau indeks | Koroplet 5 kelas diskret; kelas IRBI skala oranye (T8) | Atlas, FT |
| G20 | Sebaran total | Bulatan sebanding berlegenda | FT, Atlas |
| G21 | Aliran | Aliran fisik bersumber (m³ air per sektor): Sankey paling banyak 3 tingkat. Aliran dana dan tanggung jawab: diagram aliran berikon tanpa lebar sebanding, karena lebar Sankey adalah besaran dan nominal proyek dilarang | ADB, WS45, MGI |
| G22 | Capaian lawan target | Bullet chart atau tabel status lawan target | FT, White Paper Jepang |
| G23 | Kapan dan berapa lama | Kolom WAKTU berpil horizon di matriks rekomendasi (tabel tahap × tahun hanya bila pemilik setuju, lihat Belum pasti), kronologi dua sisi | Deltaprogramma, CCDR |
| G24 | Respons antar-kejadian | Garis bersumbu "hari sejak kejadian" | White Paper Jepang |
| G25 | Dilarang | Pai lebih dari satu pangsa, donat, sumbu ganda, radar, chord, streamgraph, violin, Voronoi, area bertumpuk lebih dari 4 kategori, 3D, lingkaran konsentris, ikon dekoratif sebagai grafik, kurva biaya | White Paper Jepang, UNICEF, WS45, Deltaprogramma, Charting Our Water Future |


### (Selera laporan) Anatomi gambar dan tabel

**Gambar**

- **L37.** Urutan dari atas: keterangan, pil kanan atas bila ada, grafik atau peta, baris "Sumber:", lalu "Catatan:" bila ada (MGI; P32).
- **L38.** Keterangan 9 pt rata tengah: label "Gambar 5.2" Bold 051C2C, satu spasi, lalu judul deskriptif yang stabil berisi besaran, tempat, dan periode: "Gambar 5.2 Kejadian banjir per kabupaten/kota di Pulau Jawa, 2015–2025 (kejadian)". Paling banyak 2 baris, tanpa titik dua, tanpa angka hasil yang berubah tiap pembaruan data, supaya Daftar Gambar stabil. Satuan ditulis dalam kurung di akhir bila tidak ada di legenda. Kalimat temuan berangka dari gambar itu ditulis sebagai kalimat pembuka tebal paragraf yang merujuknya (L16). Ini bawaan; judul aksi berangka ada di Belum pasti.
- **L39.** Kartu Insight adalah aturan layar situs. Di kertas, kepala grafik pola grafik batang pemilik (nama metrik kiri, perubahan neto kanan, lihat Komponen di bab Selera presentasi) boleh menjadi satu-satunya baris di atas grafik, tanpa satuan dan periode; baris subjudul indikator, satuan, atau periode tidak dipakai. Cara membaca grafik yang tidak lazim ditulis di baris "Catatan:" paling banyak satu baris dan 120 karakter.
- **L40.** Pil kanan atas paling banyak satu: label keyakinan ("Estimasi model, belum diuji balik"), skenario ("Skenario El Niño kuat"), atau sasaran ("Sasaran Sendai B") (MGI, Atlas; P38).
- **L41.** Label seri ditulis langsung di ujung garis atau batang bila seri paling banyak 4; lebih dari itu, legenda di atas grafik. Paling banyak 3 anotasi per grafik; kejadian di deret waktu ditandai garis tegak tipis berlabel (Atlas, IMF; P26, P27).
- **L42.** Batang mengikuti grafik batang pemilik: kepala grafik satu baris (L39), ujung atas membulat, tanpa sumbu Y, nilai Bold di atas tiap batang termasuk yang kecil, total di atas batang bertumpuk, pembanding DCE1E7. Lebih dari 24 batang diringkas per dekade atau diganti garis.
- **L43.** Teks di dalam grafik dan peta paling kecil 8 pt pada ukuran cetak. Arah ditulis dengan ikon vektor atau kata; karakter ▲, ▼, dan → tidak dipakai karena tidak ada di Roboto.
- **L44.** Panel berganda diberi label (a), (b), (c) 9 pt Bold, skalanya sama, legendanya satu di kaki (WMO, OECD; P36).
- **L45.** "Sumber:" Bold 8,5 pt 6B7280 rata kiri sejajar objek, tepat di bawah objek: lembaga atau sistem, periode, dan batas data, tanpa path internal. Seri yang bias pelaporannya mengubah cara baca, seperti DIBI sebelum dan sesudah 2008, diberi "Catatan:" satu baris (OWID; P28).
- **L46.** Lebar objek penuh 165 mm atau satu lebar kolom grid.
- **L47.** Grafik dan peta pihak ketiga tidak ditempel apa adanya, tetapi digambar ulang dari data dengan token rumah (P39).

**Tabel**

- **L48.** Keterangan di atas dengan bentuk yang sama ("Tabel 5.2" lalu judul deskriptif, L38); "Sumber:" dan label keyakinan tepat di bawah tabel. Tabel berwarna, berikon, atau berpil ditutup legenda di baris terakhir tabel itu sendiri (sel digabung selebar tabel, tanpa isi warna, 8 pt), supaya "Sumber:" tetap paragraf pertama sesudah tabel.
- **L49.** Kepala navy teks putih Bold 8,5 pt, kata label kapital, satuan huruf asli dalam kurung ("LUAS (ha)"), diulang di tiap halaman. Kolom label baris tanpa isi warna. Kepala oranye dan kolom hijau JAPFA tidak ditiru.
- **L50.** Angka rata kanan dengan digit tabular dan titik ribuan, teks rata kiri, garis bawah 0,5 pt BFC5CC, tanpa garis vertikal, tanpa pita selang-seling, baris total navy.
- **L51.** Paling banyak 8 kolom di A4 tegak; kolom sekunder pindah ke lampiran atau .xlsx.
- **L52.** Kolom target dan proyeksi berlatar F3F5F8, terpisah dari kolom aktual (IMF; P67).
- **L53.** Tabel peta panas: sel diwarnai kelas diskret (kelas IRBI skala oranye, T8), angka tetap tertulis, legenda kelas di baris terakhir tabel (ADB, MGI; G16).
- **L54.** Tabel peringkat: nomor dalam bulatan navy, kolom jiwa terpapar di samping indeks, dasar urutan disebut di keterangan, wilayah fokus diblok FDF1E8 (gaya rumah d5). Yang diambil dari UNICEF hanya titik kelas di samping nilai; UNICEF sendiri memakai angka peringkat polos (P106).
- **L55.** Tabel preseden: kejadian besar sebagai kolom, besaran yang sama sebagai baris, kolom yang sedang dikaji berlatar FDF1E8 (White Paper Jepang; P108).
