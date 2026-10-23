# Pedoman desain dua kajian BNPB

Pedoman induk (grand design dan design system) untuk dua kajian yang diterbitkan
Badan Nasional Penanggulangan Bencana:

1. **Grand Design Ketahanan Air Pulau Jawa 2026–2030** (selanjutnya "kajian air").
2. **Grand Design Mitigasi Bencana Indonesia 2026–2030** (selanjutnya "kajian mitigasi").

Versi 1.2, 23 Oktober 2026. Berkas ini satu-satunya sumber aturan tampilan, bahasa,
angka, dan QA untuk kedua kajian. Isi bab ada di `KERANGKA.md`; ukuran terukur tata
letak acuan ada di `SPESIFIKASI-GAYA.md`; bahan isi ada di `riset/A`–`D`. Pedoman ini
mengikat atas `SPESIFIKASI-GAYA.md` dan `KERANGKA.md` untuk tampilan dan proses;
`KERANGKA.md` mengikat untuk isi bab. Terhadap Buku Pegangan Pantau Bencana, pedoman ini
hanya boleh berbeda bila perbedaannya dicatat di §0.3 berikut alasannya (§0.1). Jangan
membuat salinan aturan ketiga.

---

## 0. Status, otoritas, keputusan

### 0.1 Urutan otoritas

1. Kata pemilik di percakapan (dicatat di §0.3 Riwayat).
2. Buku Pegangan Pantau Bencana (`docs/buku-pegangan/pantau-bencana.md`): kanon proyek; dan
   `KEPUTUSAN.md`: keputusan pemilik P1–P17 serta keputusan bawaan orkestrator T1–T10 yang
   berlaku sampai pemilik membaliknya. Bila pedoman ini bertentangan dengan `KEPUTUSAN.md`,
   `KEPUTUSAN.md` yang berlaku.
3. Pedoman ini. Pedoman boleh berbeda dari Buku Pegangan hanya bila perbedaannya dicatat
   di §0.3 berikut alasannya; perbedaan yang tidak dicatat batal dan Buku Pegangan yang
   berlaku.
4. `SPESIFIKASI-GAYA.md`: ukuran terukur tata letak JAPFA REPORT sebagai acuan. Kolom
   "Kajian BNPB" di berkas itu digantikan §A–§B pedoman ini.
5. Buku pegangan proyek lain (Utama, MBG, Gemah Ripah, Betutu Sambe, Worth It) hanya
   sebagai prinsip; palet, font, dan istilah proyek lain tidak dibawa.

Bila dua aturan bertabrakan, yang dibandingkan adalah tanggal vonis pemilik (kutipan
bertanggal di §0.3 atau di Riwayat Buku Pegangan), bukan tanggal berkas disunting. Vonis
yang lebih baru menang. Aturan tanpa vonis pemilik tunduk pada urutan di atas. Contoh:
Rencana Multi-Bencana (vonis 15–16 Okt) membolehkan titik tengah sebagai pemisah; vonis
pemilik 20 Okt (dicatat di Buku Pegangan) melarangnya. Yang berlaku: dilarang.

### 0.2 Keputusan pemilik

**Diputus** (tidak dibuka lagi tanpa pemilik):

| No | Keputusan | Tanggal |
| --- | --- | --- |
| K1 | Penerbit BNPB saja; tanpa halaman tim penyusun, tanpa ucapan terima kasih bernama | 23 Okt 2026 |
| K2 | Keluaran utama DOCX A4 tegak, huruf Roboto saja | 23 Okt 2026 |
| K3 | DOCX paling banyak 150 halaman di luar lampiran (bagian depan berangka romawi tidak dihitung) | 23 Okt 2026 |
| K4 | PDF ringkas paling banyak 10 halaman per kajian | 23 Okt 2026 |
| K5 | Foto dari Wikimedia Commons berlisensi bebas beratribusi (CC BY, CC BY-SA, CC0, PD; tanpa NC/ND); ilustrasi buatan AI tidak dipakai | 23 Okt 2026 |
| K6 | Kajian air sampai kab/kota, lima komponen: air baku, irigasi, waduk, air tanah, penurunan muka tanah. Proyek boleh disebut, tanpa angka biaya | 23 Okt 2026 |
| K7 | Skenario terburuk dikelompokkan per jenis bencana, dengan korban jiwa, luas terdampak, kerugian materiil dan imateriil dari simulasi platform | 23 Okt 2026 |
| K8 | IRBI BNPB sebagai indeks utama; indeks platform sebagai pendukung | 23 Okt 2026 |
| K9 | Bencana nonalam: pandemi, kebakaran TPA, kebakaran industri. Kerusuhan sosial dibahas di bab bencana sosial (taksonomi UU 24/2007) | 23 Okt 2026 |
| K10 | Strategi dibagi pra bencana, saat bencana, pascabencana (kata pemilik; ejaan dan nama fase di keluaran mengikuti T10) | 23 Okt 2026 |
| K11 | Rekomendasi untuk internal BNPB dan lintas K/L, dengan lembaga teknis dan tugasnya | 23 Okt 2026 |
| K12 | Peta disimulasikan di web lalu dirender ke dokumen | 23 Okt 2026 |
| K13 | Bahasa formal ilmiah, tanpa kalimat bergaya dan tanpa yang dibuat-buat | 23 Okt 2026 |
| K14 | Kedua kajian tidak harus meniru JAPFA REPORT, tetapi wajib punya grand design dan design system | 23 Okt 2026 |
| K15 | Pola laporan kelas dunia yang divonis cocok di `riset/desain-benchmark/SINTESIS.md` diterapkan di §A–§B dan dicatat di Buku Pegangan bab Selera laporan (DOCX/PDF); aturan pemilik yang tertulis menang bila bentrok (`KEPUTUSAN.md` P16) | 23 Okt 2026 |

**Diputus sebagai keputusan bawaan** (`KEPUTUSAN.md`, 23 Okt 2026; pemilik meminta tidak ada
pertanyaan lagi, jadi bawaan ini berlaku sampai pemilik membaliknya):

| No | Keputusan | Akibat di pedoman |
| --- | --- | --- |
| T1 | Judul bab KAPITAL ("BAB 1 PENDAHULUAN"); subbab ke bawah huruf judul ("1.1 Latar Belakang") | §B2, §C2; D-11 mengecualikan Heading 1 dan judul bagian depan |
| T2 | Oranye naik, biru turun, juga di peta web kajian | §B1.5, §B6 |
| T3 | Peta web di situs Pantau Bencana, `public/kajian/`, dibangun lokal; terbit hanya bila pemilik mendorong | §B6 |
| T4 | Kaki halaman: "Badan Nasional Penanggulangan Bencana, Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120" dan "Call Center 117, www.bnpb.go.id" | §B4. T4 tidak memutus teks pil batas data PDF ringkas; bawaannya di §B4 |
| T5 | Kajian air batas atas ±110 hlm isi; kajian mitigasi ±150 | §A3.2, §A3.3, D-12 |
| T6 | Palet tambal enam keluarga (ΔE CIEDE2000 terkecil 17,6) | §B1.3 |
| T7 | Kata Pengantar ditulis sebagai draf untuk ditandatangani Kepala BNPB, ditandai untuk diperiksa pemilik | §A3.4 |
| T8 | Kelas IRBI memakai skala oranye rumah BNPB (ramp api, kelas 1, 3, 5) dengan nama kelas resmi Rendah, Sedang, Tinggi dan legenda; merah hanya bahaya | §B1.4; ramp keluarga hanya untuk indeks platform |
| T9 | Daftar Pustaka tidak dihitung dalam batas halaman, sama seperti lampiran | §A3.2, §A3.3, §B5.17, D-12 |
| T10 | "prabencana", "tanggap darurat", "pascabencana" sesuai UU 24/2007; subjudul kajian mitigasi "Strategi Prabencana, Tanggap Darurat, dan Pascabencana" | §A4, §B5.12, §B5.14, §B5.22, §C3 |

**Belum diputus** (berbawaan; tiap bawaan bisa dibalik pemilik):

| No | Pertanyaan | Bawaan yang dipakai | Bila dibalik |
| --- | --- | --- | --- |
| T11 | Peta bernomor sendiri ("Peta 4.1") dengan Daftar Peta, pola GAR dan UNICEF (SINTESIS P11)? | Peta tetap seri Gambar, satu seri Caption | SEQ "Peta" dan bidang Daftar Peta ditambah; D-7 menghitung dua seri |
| T12 | Tabel tahap × tahun pola Deltaprogramma (SINTESIS P78) di DOCX, padahal pemilik membuang Gantt dari slide rekomendasi d5? | Kolom WAKTU berpil horizon di matriks rekomendasi (§B5.13) saja, mengikuti satu-satunya sinyal pemilik; tabel §B5.29 tidak dibuat | Tabel §B5.29 dipasang di DOCX bab Peta Jalan saja, sel tahap berupa pil native; tidak di deck dan PDF ringkas |
| T13 | Kelas IRBI banjir, longsor, dan kekeringan di kajian air ikut berwarna oranye (ramp api, T8), padahal kategori basah biru dan kering emas. Dikehendaki? | T8 apa adanya: semua kelas IRBI ramp api, legenda "Kelas IRBI BNPB" | `skala.irbi.ramp` di `tema.json` diganti per keluarga (air, emas, netral); ambang IRBI ΔE ≥ 20 tetap berlaku |
| T14 | Keterangan gambar dan tabel: judul aksi berangka (MGI, WDR; SINTESIS P22) atau deskriptif? Vonis pemilik 23 Okt ("judul memakai bentuk deskriptif", Riwayat Buku Pegangan; "Judul deskriptif menang atas judul data", bab Selera presentasi) lebih baru daripada "judul = fakta + angka + sumber", dan tidak ada kata pemilik yang membatasinya ke deck | Deskriptif stabil berisi besaran, tempat, periode, dan satuan ("Gambar 5.2 Kejadian banjir per kabupaten/kota di Pulau Jawa, 2015–2025 (kejadian)"); kalimat temuan berangka ditulis di kalimat pembuka tebal paragraf yang merujuk gambar (§B2, §C2) | Keterangan berupa kalimat temuan berangka ≤ 2 baris; kutipan pemilik dicatat di §0.3; Daftar Gambar berubah tiap pembaruan data |
| T15 | Judul slide deck kajian: tabel Judul Buku Pegangan bab Selera presentasi belum punya baris untuk deck kajian (§B7) | Kalimat temuan ≤ 2 baris, angka `oranye`, seperti Paparan Presiden lampiran, karena `KERANGKA.md` menyusun deck seperti Paparan Presiden | Judul topik deskriptif seperti deck wilayah |

### 0.3 Riwayat (terbaru di atas; kutipan miring = kata pemilik)

- **23 Okt 2026.** Tinjauan silang v1.2 (bukan vonis pemilik baru). Pedoman direkonsiliasi dengan
  `KEPUTUSAN.md`, yang sudah diikuti `tema.json` dan generator: T1–T10 pindah ke tabel Diputus
  sebagai keputusan bawaan; judul dan horizon 2026–2030 dengan peta jalan 100 hari, 2026–2027,
  2028–2030 (P2, P4); judul bab kapital (T1; D-11 mengecualikan Heading 1); kaki halaman alamat
  BNPB (T4); batas kajian air ±110 dengan alokasi bab mengikuti `KERANGKA.md` dan kajian mitigasi
  ±150 (T5); kelas IRBI ramp api untuk semua bahaya (T8); Daftar Pustaka tidak dihitung (T9); fase
  "tanggap darurat" (T10). Pertanyaan baru berbawaan: T13 (IRBI banjir ikut oranye), T14
  (keterangan gambar deskriptif atau judul aksi; vonis pemilik 23 Okt soal judul deskriptif lebih
  baru), T15 (judul slide deck kajian); bawaan T12 dibalik ke kolom WAKTU berpil horizon. Perbaikan
  lain: kode temuan selalu "Temuan A.1" dan D-27 membaca token itu, karena "A.1" bertabrakan dengan
  "Tabel A.1" di lampiran; PDF ringkas hlm 2 berisi Pesan Kunci dan pita keputusan, kartu angka ke
  hlm 3, kolofon ke kaki hlm 10; Kartu Insight dibatasi ke layar situs (di kertas: kepala grafik
  satu baris, "Catatan:" satu baris); legenda tabel di baris terakhir tabel supaya "Sumber:" tetap
  paragraf pertama sesudah objek; warna mengikuti arah, besaran baik-buruk di kajian air memakai
  `teks-2` berlabel kata; label keyakinan kelima "Penilaian pakar" (`KERANGKA.md` prinsip 4 masih
  menyebut empat; pemilik berkasnya yang menyunting); urgensi = horizon; Sankey hanya untuk aliran
  fisik; gaya Isi Temuan didefinisikan; gerbang D-30 sampai D-32; status gerbang ditulis "dirancang,
  belum dibangun"; label tahap "Perencanaan" dan "Pelaksanaan" ("laksana" berarti "seperti").
- **23 Okt 2026.** Pola laporan kelas dunia diterapkan (K15). Pemilik: *"Tiru style mereka dan
  implementasikan untuk sempurnakan system kita."* Bedah 22 laporan (World Bank, ADB, IMF,
  McKinsey, BCG, Deloitte, IPCC, UNDRR, WMO, OECD, UNICEF, Jepang, Inggris, Belanda, Our World in
  Data, Financial Times) disimpan di `riset/desain-benchmark/SINTESIS.md` (pola P1–P109, pilih
  grafik G1–G25). Yang berubah: §A3.1 dan §A3.4 (halaman Pesan Kunci, temuan bernomor, kalimat
  pembuka tebal), §B2 (kalimat pembuka, teks grafik), §B4 (nomor objek Ringkasan Eksekutif,
  rujukan silang), §B5.5 (kotak dampak bila tidak ditangani, kotak perbandingan), §B5.7 (tabel
  skenario, lama lawan baru, peta panas, preseden, tipologi, kolom proyeksi), §B5.8 (dasbor
  wilayah, katalog program), §B5.9 (koroplet untuk rasio, peta kecil berganda, peta indeks studi
  kasus, inset), §B5.10 (anatomi, seri panjang, ketidakpastian, tabel pilih grafik menurut
  pesan), §B5.11 (matriks mini, efek tindakan), §B5.12 (halaman kerangka), §B5.13 (kode temuan,
  pil urgensi), §B5.23, komponen baru §B5.26–§B5.31, §B7 deck, gerbang D-26–D-29, dan baris SIN
  di §E. Perbedaan dengan bentuk sebelumnya: satu baris cara baca grafik pindah dari bawah judul ke
  baris "Catatan:" di bawah "Sumber:", karena Buku Pegangan melarang baris subjudul dan satuan
  (Kartu Insight). Bentrok pola dunia dengan aturan pemilik (sumbu Y, baris satuan, merah, latar
  gelap, laut biru, biaya proyek, Gantt di deck) dicatat di SINTESIS §12; aturan pemilik yang
  berlaku.
- **23 Okt 2026.** Pedoman v1.1 dari tinjauan silang terhadap Buku Pegangan,
  `SPESIFIKASI-GAYA.md`, dan `KERANGKA.md` (bukan vonis pemilik). Perbedaan dengan Buku
  Pegangan, dicatat sesuai §0.1: (a) judul dua baris dicapai dengan memendekkan judul, bukan
  mengecilkan huruf (kanon: *"Ukuran disesuaikan lah intinya cuma 2 baris"*), karena ukuran
  gaya Heading DOCX harus seragam; (b) data kosong satu notasi "–" beralasan, "NA" templat
  BNPB tidak dipakai; (c) warna per keluarga bencana (enam), bukan per jenis: palet per jenis
  v1 gagal ΔE ≥ 15 di 15 pasangan; banjir memakai biru air kanon `#2F86D1`, gempa memakai
  coklat geologi; jenis dibedakan ikon; (d) arah naik/turun berupa ikon vektor, karena ▲ dan
  ▼ tidak ada di Roboto; (e) lingkaran nomor rekomendasi `navy`, jenis aksi dibedakan ikon
  (kanon mewarnai oranye/navy/biru menurut jenis aksi, tetapi kajian punya lima jenis aksi
  tanpa warna kanon); (f) pil `slate` berteks putih (4,48:1) dibuat bergaris dengan teks
  `teks`; (g) kalimat memakai bulan penuh, karena dokumen formal (K13). Perbedaan dengan
  `KERANGKA.md`: alokasi kajian mitigasi 140 hlm (KERANGKA menjumlah 153, tertulis ±145;
  Bab 2 14→10, Bab 4 12→11, Bab 5 16→15, Bab 6 18→17, Bab 7 20→18, Bab 8 10→9, Bab 10
  10→9, Bab 11 15→14, Bab 12 12→11); glosarium hanya di lampiran, bagian depan memuat
  Daftar Singkatan. `KERANGKA.md` masih menulis "subsiden", "pra bencana", dan "Bali–Nusa
  Tenggara"; pemilik berkasnya yang menyunting.
- **23 Okt 2026.** Pedoman v1 disusun dari 22 artifact pemilik, `SPESIFIKASI-GAYA.md`,
  riset C dan D. Keputusan K1–K14 dicatat. Pemilik: *"Ga harus sama tapi harus punya
  grand design dan design systemnya."*
- **23 Okt 2026.** Titik tengah dilarang di semua teks tampil. *"Gw ga pernah suka
  dipisahin titik gini. Catet."*

Aturan pencatatan: tiap keputusan baru masuk Riwayat dulu, lalu ke bagian aturannya,
lalu gerbang D diperbarui bila aturannya bisa diperiksa mesin. Bagian yang dibuang
pemilik dicatat di sini berikut berkas dan cara memulihkannya; tidak dihapus diam-diam.

---

## A. Grand design

### A1. Tujuan dan pembaca

| Pembaca | Yang dicari | Keluaran yang dibaca | Kepadatan |
| --- | --- | --- | --- |
| Kepala BNPB | Satu pesan, angka kunci, keputusan yang diminta | PDF ringkas (10 hlm), Ringkasan Eksekutif DOCX | Rendah, satu temuan per baris |
| Pejabat eselon I–II BNPB | Dasar tiap rekomendasi, pembagian tugas internal | DOCX Bab Grand Design, Kelembagaan, Lampiran | Sedang |
| K/L teknis (PU, BMKG, Badan Geologi, Kemenkes, KLH, Kemendagri, Bappenas, Kemenkeu, ATR/BPN) | Tugas lembaganya, data yang diminta darinya | Matriks lembaga, lampiran per provinsi | Tinggi |
| Analis BNPB/BPBD | Metode, data per kab/kota, angka untuk disalin | DOCX Metodologi, Lampiran A, peta web, berkas data | Tinggi |

Design read: dokumen kebijakan formal untuk pimpinan lembaga, kepadatan sedang, latar
putih, lapis yang memimpin adalah angka bersumber dan peta. Bukan dashboard, bukan
bahan pemasaran.

### A2. Pesan inti

Tiap kajian berdiri di atas satu kalimat tesis yang muncul di halaman 2 PDF, kalimat
pertama Ringkasan Eksekutif, dan Bab Kesimpulan. Bab lain menurunkan bukti untuknya.
Tesis dikunci setelah Bab 4–6 selesai dan angkanya diisi dari data, bukan diketik.

Sebelum Bab 4–6 selesai, yang ada hanya templat slot berlabel **hipotesis kerja**. Slot
diisi dari JSON; kalimatnya tanpa kata kerja sebab-akibat ("memperbesar", "didorong",
"menyebabkan", "karena") kecuali Bab Metodologi memuat uji sebab-akibatnya (§C8).

**Kajian air (hipotesis kerja):** "{temuan berangka: jumlah kab/kota di Pulau Jawa yang
masuk kelas tinggi kekeringan dan banjir sekaligus, sumber, tahun}; {wilayah: wilayah
sungai atau kab/kota dengan nilai tertinggi}; {tuas kebijakan dari Bab Kesenjangan}." Tiga
pertanyaan pimpinan yang dijawab: (1) Wilayah mana yang paling berisiko kekurangan air saat
kemarau panjang? (2) Wilayah mana yang paling berisiko tergenang saat hujan ekstrem dan rob?
(3) Siapa mengerjakan apa sebelum, saat, dan sesudah kejadian?

**Kajian mitigasi (hipotesis kerja):** "{temuan berangka: angka IRBI atau INFORM
bersumber}; {wilayah: pulau, provinsi, atau kab/kota tempat risiko terkonsentrasi}; {tuas
kebijakan dari Bab Kesenjangan}." Pertanyaan pimpinan: (1) Bencana apa yang paling mungkin
menimbulkan kerugian terbesar, dan berapa skenario terburuknya? (2) Di pulau, provinsi,
kab/kota mana risikonya terkonsentrasi? (3) Kesenjangan apa yang paling menahan, dan
lembaga mana yang membukanya?

Tesis final disimpan di `angka-kunci.json` (kunci `tesis`, satu per kajian); gerbang D-6
memeriksa kalimatnya identik di PDF hlm 2, kalimat pertama Ringkasan Eksekutif, dan Bab
Kesimpulan.

Larangan: tesis tidak memakai kontras "X bukan Y", slogan, tiga-serangkai, atau angka
yang belum bersumber. Bila datanya belum mendukung, tesis ditulis lebih sempit.

### A3. Arsitektur dua tingkat

Dua keluaran per kajian, satu design system, satu set data dan gambar.

| | PDF ringkas | DOCX lengkap |
| --- | --- | --- |
| Pembaca utama | Kepala BNPB | Eselon, K/L, analis |
| Panjang | ≤ 10 hlm | ≤ 150 hlm isi + bagian depan + lampiran |
| Bentuk | Halaman infografis: kartu angka, peta, kartu skenario, matriks | Teks mengalir rata kiri-kanan dengan blok visual |
| Dibuat dari | `ringkas.html` yang membaca `tema.json` dan data yang sama, lalu Chromium headless ke PDF (pola `peta.mjs`) | `lengkap.docx` (python-docx, bidang TOC dan Caption), indeks diperbarui lewat UNO, lalu soffice ke PDF |
| Komponen | Subset §B5, tata letak yang sama | Semua komponen §B5 |
| Nama berkas | tabel nama di bawah | tabel nama di bawah |

PDF ringkas dibuat dengan memotong dan memadatkan, bukan mendesain ulang: angka dan PNG
peta, grafik, serta jejak skenario di PDF adalah berkas yang sama dengan di DOCX. Komponen
PDF (kartu bertint, lingkaran ikon, pil, sudut membulat) dirender dari HTML dengan token dan
ukuran yang sama, karena bentuk itu tidak stabil bila dibuat lewat tabel Word lalu soffice.

| Kajian | Judul resmi (sampul) | Judul pendek (header) | Nama berkas (DDMMYY = tanggal paparan) |
| --- | --- | --- | --- |
| Kajian air | judul nomor 1 di kepala pedoman ini | Kajian Ketahanan Air Pulau Jawa | `Kajian Ketahanan Air Pulau Jawa DDMMYY.docx` dan `.pdf`; `Kajian Ketahanan Air Pulau Jawa Ringkas DDMMYY.pdf` |
| Kajian mitigasi | judul nomor 2 di kepala pedoman ini | Kajian Mitigasi Bencana Indonesia | `Kajian Mitigasi Bencana Indonesia DDMMYY.docx` dan `.pdf`; `Kajian Mitigasi Bencana Indonesia Ringkas DDMMYY.pdf` |

Nama lain ("Kajian Pengelolaan Air Pulau Jawa", "Kajian Air Jawa") tidak dipakai.

#### A3.1 PDF ringkas, isi per halaman

Kajian air:

| Hlm | Isi | Komponen |
| --- | --- | --- |
| 1 | Sampul | B5.1 |
| 2 | Pesan Kunci: kalimat tesis dan temuan bernomor yang sama dengan DOCX, lalu keputusan yang diminta | halaman Pesan Kunci B5.26, pita keputusan B5.25 |
| 3 | 4–6 angka kunci (kartu pertama: hitungan wilayah yang perlu ditindak) dan peta utama: neraca air per wilayah sungai, hanya bila Pola/RPSDA BBWS berhasil diambil. Bila tidak: Indeks Pemakaian Air per pulau dan ketersediaan air per kapita 2010–2035 (BPS 2020), IRBI kekeringan dan banjir per kab/kota | kisi kartu angka B5.4; peta koroplet B5.9 + tabel peringkat 8 baris B5.7, atau grafik B5.10 + peta IRBI B5.9 |
| 4 | Kemarau: sebaran risiko kekeringan kab/kota + kartu skenario ringkas | peta B5.9, kartu skenario mini B5.11 |
| 5 | Hujan: banjir, longsor, rob kab/kota + kartu skenario ringkas | peta B5.9, kartu skenario mini B5.11 |
| 6 | Air tanah, penurunan muka tanah, pesisir | peta titik literatur, panel berpita B5.6, label keyakinan |
| 7 | Kesenjangan (3 risiko teratas, 3 kapasitas yang sudah ada) | panel berpita B5.6 |
| 8 | Grand design: pilar dan strategi prabencana, tanggap darurat, pascabencana | garis waktu tiga fase B5.12 |
| 9 | Matriks lembaga dan peta jalan (100 hari, 2026–2027, 2028–2030) | matriks B5.13 ringkas |
| 10 | Kesimpulan, rekomendasi bernomor berlembaga, sumber utama; kolofon ringkas di kaki | kisi kesimpulan B5.25, baris rekomendasi B5.13, daftar sumber, kolofon 3 baris 8 pt |

Kajian mitigasi:

| Hlm | Isi | Komponen |
| --- | --- | --- |
| 1 | Sampul | B5.1 |
| 2 | Pesan Kunci: kalimat tesis dan temuan bernomor yang sama dengan DOCX, lalu keputusan yang diminta | halaman Pesan Kunci B5.26, pita keputusan B5.25 |
| 3 | Angka kunci (kartu pertama: hitungan wilayah yang perlu ditindak); histori dan tren kejadian per jenis 2015–2026 | kisi kartu angka B5.4, grafik batang B5.10, garis IRB |
| 4 | Risiko per pulau dan provinsi (IRBI) | peta koroplet provinsi + peta kisi 38 provinsi B5.9 |
| 5 | Risiko per kab/kota (IRBI per bahaya utama) | peta koroplet kab/kota B5.9 |
| 6 | Skenario terburuk bencana alam, satu baris per jenis | tabel kerusakan ringkas B5.11 |
| 7 | Nonalam dan sosial | kartu kejadian analog B5.11 varian (b), kartu kualitatif B5.11 varian (c) |
| 8 | Grand design prabencana, tanggap darurat, pascabencana | garis waktu B5.12, matriks fase × jenis B5.22 |
| 9 | Matriks lembaga dan peta jalan (100 hari, 2026–2027, 2028–2030) | B5.13 |
| 10 | Kesimpulan, rekomendasi, sumber; kolofon ringkas di kaki | kisi kesimpulan B5.25, B5.13, daftar sumber, kolofon 3 baris 8 pt |

Halaman 2 kedua PDF memakai halaman Pesan Kunci (§B5.26) yang sama dengan DOCX, ditambah pita
keputusan; kartu angka pindah ke halaman 3, sehingga halaman 2 tetap tiga blok (tesis, temuan, pita;
§B3). Pita keputusan hanya di halaman 2, tidak diulang di halaman 10; kolofon ringkas di kaki halaman
10. Halaman sebaran per bahaya (kajian air hlm 4–5, kajian mitigasi hlm 5) boleh memakai peta mini
berpasangan satu kalimat berangka per bahaya (UNICEF; SINTESIS P20), berlatar putih.

#### A3.2 DOCX kajian air (isi ±104 hlm, cadangan 6, batas ±110, T5)

| Bab | Judul | Hlm | Komponen wajib |
| --- | --- | --- | --- |
| – | Bagian depan (romawi, tidak dihitung) | ±18 | sampul, kolofon, kata pengantar, daftar isi/tabel/gambar/lampiran, singkatan, Ringkasan Eksekutif 6–8 hlm |
| 1 | Pendahuluan | 8 | pembatas bab, kotak ringkasan |
| 2 | Tinjauan Pustaka dan Kerangka Konseptual | 12 | tabel pembanding benchmark (praktik, negara, yang ditiru, penyesuaian) |
| 3 | Metodologi dan Data | 8 | pola metode (§C6.4), tabel sumber data berstatus, tabel rekonsiliasi angka |
| 4 | Kondisi Sumber Daya Air Pulau Jawa | 16 | 5 subbab komponen; diagram alur hulu–hilir B5.23; peta per komponen hanya bila datanya ada, komponen tanpa data (zona air tanah Badan Geologi, indeks kekritisan per wilayah sungai) ditulis sebagai celah dan permintaan data, bukan peta kosong; tabel per provinsi |
| 5 | Profil Risiko Musim Kemarau | 12 | peta kab/kota, kurva musim vs median, kartu skenario terburuk 1 hlm |
| 6 | Profil Risiko Musim Hujan | 14 | peta banjir, longsor, rob; kartu skenario terburuk 1 hlm |
| 7 | Analisis Kesenjangan | 8 | kartu temuan (bukti, dampak, pembuka) |
| 8 | Grand Design dan Strategi | 14 | pilar, garis waktu prabencana, tanggap darurat, pascabencana per musim, tabel per wilayah sungai |
| 9 | Kelembagaan, Pembiayaan, Peta Jalan | 8 | matriks lembaga, lapisan pembiayaan B5.21, instrumen hukum B5.20, peta jalan tiga horizon, indikator B5.19 |
| 10 | Kesimpulan dan Rekomendasi | 4 | kisi kesimpulan dan pita keputusan B5.25, baris rekomendasi bernomor |
| – | Daftar Pustaka | tidak dihitung (T9) | B5.17 |
| Lampiran | A–H sesuai `KERANGKA.md`; glosarium dari `glosarium.json` (B5.18) | bebas | tabel lampiran B5.8, atribusi foto |
| – | Sampul belakang | – | B5.24 |

#### A3.3 DOCX kajian mitigasi (isi ±140 hlm, cadangan 10, batas ±150, T5)

| Bab | Judul | Hlm | Komponen wajib |
| --- | --- | --- | --- |
| – | Bagian depan | ±18 | sama dengan kajian air |
| 1 | Pendahuluan | 8 | |
| 2 | Tinjauan Pustaka dan Kerangka Konseptual | 10 | tabel benchmark, tabel target Sendai |
| 3 | Metodologi | 8 | definisi skenario terburuk yang masuk akal, cara kuantifikasi, rekonsiliasi |
| 4 | Histori Bencana Indonesia | 11 | grafik per jenis, tabel kejadian besar dan pelajarannya |
| 5 | Profil Risiko Nasional | 15 | peta provinsi, peta kab/kota, peta kisi, tabel peringkat |
| 6 | Bencana Geologi | 17 | per jenis: histori, sebaran, kartu skenario B5.11 varian (a) 1 hlm, strategi tiga fase |
| 7 | Bencana Hidrometeorologi | 18 | pola sama dengan Bab 6 |
| 8 | Bencana Nonalam | 9 | kartu kejadian analog B5.11 varian (b): pandemi, kebakaran industri, kebakaran TPA |
| 9 | Bencana Sosial | 6 | kartu kualitatif B5.11 varian (c); batas mandat |
| 10 | Analisis Kesenjangan | 9 | kartu temuan |
| 11 | Grand Design Mitigasi 2026–2030 | 14 | matriks fase × jenis bencana B5.22 |
| 12 | Kelembagaan, Pembiayaan, Peta Jalan | 11 | matriks lembaga, lapisan pembiayaan B5.21, instrumen hukum B5.20, indikator B5.19 |
| 13 | Kesimpulan dan Rekomendasi | 4 | kisi kesimpulan dan pita keputusan B5.25 |
| – | Daftar Pustaka | tidak dihitung (T9) | B5.17 |
| Lampiran | A–I sesuai `KERANGKA.md`; glosarium dari `glosarium.json` (B5.18) | bebas | |
| – | Sampul belakang | – | B5.24 |

Kajian air: Bab 1–10 berjumlah 104 hlm mengikuti alokasi `KERANGKA.md`, cadangan 6 hlm sampai
batas ±110 (T5). Kajian mitigasi: Bab 1–13 berjumlah 140 hlm, cadangan 10 hlm sampai batas ±150
(T5). Cadangan menampung pembatas, foto, tabel lanjutan, dan beda paginasi soffice dengan Word
(D-12); Daftar Pustaka tidak dihitung (T9). `KERANGKA.md` menjumlah 153 hlm untuk kajian mitigasi
walau tertulis ±145; pemangkasan per bab dicatat di §0.3.

Bab per jenis bencana (6–9) memakai urutan subbab seragam: (1) bahaya dan histori,
(2) status resmi lembaga lalu indeks pendukung, (3) sebaran per pulau/provinsi/kab-kota,
(4) kartu skenario terburuk, (5) strategi prabencana, tanggap darurat, pascabencana, (6) lembaga
dan tugas.
Tiap sel matriks fase × jenis wajib terisi aksi atau "tidak berlaku" dengan alasan
satu kalimat yang bisa dibantah.

#### A3.4 Bagian depan dan lampiran

Urutan bagian depan: Sampul (tanpa nomor) → Kolofon → Kata Pengantar → Daftar Isi →
Daftar Tabel → Daftar Gambar → Daftar Lampiran → Daftar Singkatan → Ringkasan Eksekutif.
Tanpa halaman tim penyusun (K1). Urutan bagian belakang: bab terakhir → Daftar Pustaka
(B5.17) → Pembatas Lampiran → Lampiran (termasuk Glosarium dan Atribusi Foto) → Sampul
belakang (B5.24).

Kolofon adalah lembar identitas dokumen: judul resmi; penerbit BNPB dan alamat; dasar
penyusunan (UU 24/2007, RIPB Perpres 87/2020, Renas PB 2025–2029 Perban 1/2025); nomor
dokumen dan versi menurut pola tata naskah BNPB; ditujukan kepada (Kepala BNPB); tanggal
terbit dan batas data; status draf/final; cara mengutip; atribusi foto sampul. Tanpa nama
tim (K1).

Ringkasan Eksekutif berbentuk baku: kalimat tesis; 4–6 angka kunci dengan sumber, kartu
pertama berisi hitungan wilayah yang perlu ditindak (B5.4); satu peta; tiga risiko teratas
dan tiga kapasitas yang sudah ada; rekomendasi utama bernomor berlembaga; keputusan yang
diminta dari Kepala BNPB; yang belum diketahui. Halaman pertamanya halaman Pesan Kunci (§B5.26);
tiap paragraf temuan sesudahnya bergaya Isi Temuan, dibuka kalimat Bold berangka (§B2; OECD, CCDR;
SINTESIS P17).

Lampiran berkode huruf di depan judul ("Lampiran A. Tabel indikator 119 kab/kota"),
tabel di dalamnya "Tabel A.1". Lampiran memuat data per kab/kota yang juga diserahkan
sebagai `.xlsx` (angka bertipe number, satu tema, cetak A4).

### A4. Alur argumen

Satu alur untuk kedua kajian, dari luas ke sempit, dari masalah ke tindakan:

1. **Masalah**: pertanyaan pimpinan dan mengapa sekarang (Bab 1).
2. **Kerangka**: konsep, regulasi, praktik negara lain, yang ditiru dan yang tidak
   cocok (Bab 2).
3. **Bukti**: metode dan data berlabel keyakinan, rekonsiliasi angka yang berbeda
   versi (Bab 3), kondisi dan histori (Bab 4), sebaran risiko nasional → pulau →
   provinsi → kab/kota (Bab 5).
4. **Skenario**: skenario terburuk yang masuk akal per jenis bencana atau per musim,
   tabel kerusakan, angka kebijakan (mis. korban bila evakuasi cepat vs lambat).
5. **Kesenjangan**: apa yang menahan, dengan bukti; apa yang sudah berjalan dan tidak
   boleh dikorbankan.
6. **Strategi**: pilar, sasaran terukur, aksi prabencana, tanggap darurat, pascabencana (T10).
7. **Rekomendasi berlembaga**: bernomor, satu daftar berurut prioritas (yang lain
   kategori), tiap butir dengan lembaga pemimpin, pendukung, waktu, indikator selesai,
   dasar; dipisah internal BNPB dan lintas K/L; keputusan yang hanya bisa diambil Kepala
   BNPB disebut terpisah beserta akibat tiap pilihan.
8. **Penutup**: yang sengaja tidak direkomendasikan dan alasannya; yang belum diketahui
   dan data yang diminta dari K/L pemegangnya.

Tiap bab dibuka pertanyaan yang dijawabnya dan kotak ringkasan bab (§B5.2).

### A5. Satu sumber data, satu set gambar

```
sumber resmi + keluaran platform
        │  (skrip tarik, dicatat URL, tanggal tarik, lisensi, status [OK]/[BV])
        ▼
data/kajian-bnpb/data/*.json        ← satu-satunya tempat angka
        │
        ├─► peta web  public/kajian/<kajian>/  (turunan public/bnpb/risiko.html)
        ├─► render PNG  data/kajian-bnpb/gambar/*.png  (pola peta.mjs: GeoJSON → SVG
        │       → Chromium headless, skala 2; satu PNG = satu gambar bernomor)
        ├─► angka naskah  disuntik dari JSON saat build (templat), tidak diketik tangan (D-22)
        │
        ├─► generator python-docx → lengkap.docx → UNO perbarui indeks → soffice → PDF
        └─► ringkas.html (tema.json yang sama) → Chromium headless → PDF ringkas
```

Aturan:

- Angka di judul, kartu angka, tabel, peta, dan teks dibaca dari JSON yang sama. Baris
  Jumlah dihitung dari angka yang tampil. Subtotal menjumlah ke total.
- Satu PNG dipakai di DOCX dan PDF; peta web memakai JSON dan legenda yang sama.
  Prioritas yang disorot dan bernomor di web sama jumlahnya dengan di dokumen.
- Tiap gambar dan tabel punya berkas data di balik layar yang ikut diserahkan (lampiran
  atau `.xlsx`).
- Semua skrip dan perintah build disimpan di `data/kajian-bnpb/` dengan bagian "Cara
  membuat ulang" di README-nya. Hasil disimpan sebagai versi baru, bukan menimpa.
- Skenario dijalankan dengan mesin peramban yang dipanggil dari node (pola
  `scripts/gunungapi/cek_merapi2010.mjs`), hasilnya disimpan sebagai JSON, bukan dihitung
  ulang di tiap keluaran.
- Urutan kerja: data dan gambar → DOCX dan PDF → peta web. Dokumen didahulukan.

### A6. Yang sengaja tidak dibuat

| Tidak dibuat | Alasan |
| --- | --- |
| Halaman tim penyusun, ucapan terima kasih bernama | K1 |
| Angka biaya proyek | K6; pembiayaan ditulis sebagai sumber dan lapisan, bukan nominal proyek |
| Indeks risiko gabungan buatan sendiri sebagai peringkat utama | Uji balik komponen statis gagal (`risiko_ujibalik.json.vonis.lulus` = false); IRBI utama (K8) |
| Angka korban titik dari model gempa platform | Galat LOO ±5,3 kali; hanya pita berlabel |
| Kerugian imateriil rupiah di angka utama | Pilihan kebijakan (VSL); di lampiran metode, angka utama satuan fisik |
| Status kekeringan platform | Bertentangan dengan PDKM BMKG; status BMKG yang dipakai |
| Debit sungai Jawa, air tanah, penurunan muka tanah terukur | Data tidak ada di platform; ditulis sebagai celah dan permintaan data |
| Neraca air dan indeks kekritisan per wilayah sungai, bila Pola/RPSDA BBWS tidak terambil | `riset/B` §1.4 menandainya [TIDAK DITEMUKAN] (§C8); diganti IPA per pulau, ketersediaan per kapita, dan IRBI per kab/kota (§A3.1) |
| Peta zona air tanah | Data Badan Geologi tidak tersedia (`KERANGKA.md` tabel celah); ditulis sebagai celah dan permintaan data |
| Simulasi pandemi, kebakaran industri, kebakaran TPA, dan kerusuhan; tabel kerusakan seragam dan pita peluang untuk nonalam dan sosial | Platform tidak punya simulasinya (`riset/D` §1 hanya bahaya alam, udara, abrasi, penurunan muka tanah). Nonalam memakai kejadian analog, sosial kartu kualitatif tanpa proyeksi korban (B5.11); K7 berlaku penuh hanya untuk bencana alam yang dimodelkan |
| Bencana akibat teror | UU 24/2007 Pasal 1 angka 4 memasukkannya ke bencana sosial; kewenangan BNPT dan Polri |
| Bencana akibat gagal modernisasi | UU 24/2007 Pasal 1 angka 3 memasukkannya ke bencana nonalam; belum ada definisi operasional dan data |
| Logo BNPB versi putih buatan sendiri | Mengubah lambang resmi (§C6.5); logo berwarna di bidang putih (B5.1) |
| Mode gelap di PDF/DOCX | Dokumen cetak; mode gelap hanya untuk peta web |
| Emoji, ilustrasi AI, foto stok | K5, K13 |
| Kotak "Coming soon"/placeholder | Bagian tanpa data ditulis sebagai keterbatasan atau dibuang |

---

## B. Design system

Semua token hidup di satu berkas `data/kajian-bnpb/tema.json` yang dibaca generator DOCX,
perender peta dan grafik, HTML PDF ringkas, dan peta web. Konstanta warna tidak disalin ke
kode.

### B1. Warna

Token warna di `tema.json` dipisah dalam empat peran: `inti` (teks, identitas, garis,
latar), `aksen` (sorot dan arah), `kategori` (keluarga bencana, §B1.3), dan `skala` (kelas
dan koroplet, §B1.4). Satu hex boleh tercatat di lebih dari satu peran, tetapi pada satu
halaman satu hex hanya membawa satu arti (§B1.8, gerbang D-24). Kepala, kaki, dan sampul
adalah bingkai templat dan tidak dihitung sebagai arti data.

#### B1.1 Token inti dan aksen

| Token | Peran | Hex | Dipakai untuk |
| --- | --- | --- | --- |
| `teks` | inti | `#1A1A1A` | teks isi, teks di atas semua tint |
| `teks-2` | inti | `#2E3440` | judul tingkat 3, teks tabel sekunder, "Sumber:" di dalam kotak bertint, ikon arah di halaman berkategori api atau basah |
| `teks-3` | inti | `#6B7280` | "Sumber:" dan keterangan di latar putih, kepala kolom di latar putih, nilai 0% |
| `navy` | inti | `#051C2C` | identitas solid: kepala tabel, baris total, pil data, nomor peringkat, judul bab, label bab, label Tabel dan Gambar, sampul |
| `garis` | inti | `#BFC5CC` | garis panel 0,75 pt, garis baris tabel 0,5 pt |
| `garis-kuat` | inti | `#1A1A1A` | garis header 0,75 pt |
| `pembanding` | inti | `#DCE1E7` | batang pembanding |
| `tanpa-data` | inti | `#F1F3F6` + arsir diagonal `#A9B4C2` | wilayah/sel tanpa data |
| `wilayah` | inti | `#D3DBE5` | daratan bernilai netral di peta simbol; tidak dipakai di peta koroplet (§B1.4) |
| `batas` | inti | `#A9B4C2` | batas provinsi 0,6 pt, garis pantai peta koroplet 0,4 pt |
| `kertas` | inti | `#FFFFFF` | latar semua halaman isi |
| `oranye` | aksen | `#D9600B` | naik; angka kunci di judul ≥ 14 pt Bold; garis tegak header dan garis aksen (bingkai) |
| `biru` | aksen | `#2F86D1` | turun |
| `merah` | aksen | `#C8102E` | hanya bahaya/perlu perhatian: garis sorot wilayah prioritas yang ditetapkan, pil bagian perlu perhatian dan preseden. Tidak untuk fase, koreksi, atau kelas indeks |
| `slate` | aksen | `#5B7A99` | pil Terverifikasi, pil bagian peringatan BMKG, garis kiri kotak Catatan dan Koreksi |
| `biru-abu` | aksen | `#3F5F80` | ukuran kedua (pil kolom luas, seri kedua grafik) |
| `biru-lembaga` | aksen | `#00499D` | nama tempat yang disorot di judul PDF |
| `emas-teks` | aksen | `#8A6A2E` | teks bernada kekeringan |
| `sumber` | aksen | `#4A9BE0` | bilah 3 pt di kiri catatan sumber PDF ringkas; tanda grafis saja, tidak di DOCX |

Kontras: teks di latar putih ≥ 4,5:1. `oranye` (3,73:1), `biru` (3,85:1), kering
`#B08A3E` (3,21:1), dan `sumber` (2,98:1) hanya dipakai untuk tanda grafis (ikon, garis,
batang, simbol peta) atau teks ≥ 14 pt Bold; teks lebih kecil memakai `navy` atau
`emas-teks` (5,02:1). Tanda grafis ≥ 3:1 terhadap latarnya; bilah `sumber` hiasan dan
dikecualikan. `teks-3` di atas `#F3F5F8` hanya 4,43:1, maka teks di dalam kotak bertint
memakai `teks` atau `teks-2` (11,4:1). Pil kecil berteks putih hanya di `navy`, `merah`,
dan `biru-abu`; pil `slate` (4,48:1) dibuat bergaris dengan teks `teks`.

#### B1.2 Tint tema (latar panel, pita kepala, kartu)

| Tema | Pita kepala | Latar muda |
| --- | --- | --- |
| Netral/data, sosial | `#E6EAF0` | `#F3F5F8` |
| Api/aksi | `#FBE7D6` | `#FDF4EC` |
| Bahaya | `#F8DDE0` | `#FCF1F2` |
| Air/musim hujan (keluarga basah) | `#DCEBF8` | `#EEF5FC` |
| Kering/musim kemarau | `#F4ECDC` | `#FBF8F2` |
| Geologi | `#F1E2D6` | – |
| Nonalam | `#E3EDE8` | – |
| Luas/BMKG | `#E3EAF1` | – |
| Wilayah fokus di tabel | `#FDF1E8` | – |

Teks di atas tint selalu `teks` (≥ 13:1). Pita bawah data dan latar peta memakai
`#F3F5F8` atau putih. Warna pekat hanya untuk pita identitas (kepala tabel, baris total),
pil kecil, nilai angka, dan garis tipis. Permukaan berwarna lain memakai tint di atas. Tanpa
gradien. Tanpa latar abu tua di bawah teks. Kartu angka putih; nadanya hanya di angka.

#### B1.3 Kategori bencana: enam keluarga warna

Warna menandai keluarga bencana, bukan jenis; jenis di dalam satu keluarga dibedakan ikon
dan label. Satu halaman menampilkan paling banyak enam warna kategori, ditambah `merah` bila
ada sorot bahaya. Warna tidak pernah satu-satunya pembawa makna: selalu bersama ikon dan
label. Sama di PDF, DOCX, dan web.

| Keluarga | Hex | Asal | Tint pita | Jenis dan ikon |
| --- | --- | --- | --- | --- |
| Geologi | `#8A4B2A` | deck (gunung api) | `#F1E2D6` | gempa bumi `activity` (path `gempa` deck); tsunami: glif khusus gelombang menggulung; gunung api `mountain`; likuefaksi: glif khusus bangunan miring di tanah bergelombang |
| Hidrometeorologi basah | `#2F86D1` | kanon (air, musim hujan) | `#DCEBF8` | banjir dan banjir bandang `waves` (path `banjir` deck); longsor: glif khusus lereng runtuh; cuaca ekstrem `cloud-lightning`; gelombang ekstrem dan abrasi: glif khusus garis pantai tergerus; rob: glif khusus bangunan tergenang air laut |
| Kering | `#B08A3E` | deck (emas kekeringan) | `#F4ECDC` | kekeringan `sun` |
| Api | `#D9600B` | deck (oranye, api) | `#FBE7D6` | kebakaran hutan dan lahan `flame` (path `api` deck) |
| Nonalam | `#3D6B5A` | turunan | `#E3EDE8` | epidemi/pandemi `virus`; kebakaran industri `factory`; kebakaran TPA `trash-2` (path `sampah` deck) |
| Sosial | `#4B4F58` | turunan | `#E6EAF0` | kerusuhan dan konflik sosial: glif khusus dua orang berhadapan (`users` sudah berarti jiwa) |

Validator (T6) berlaku untuk semua pasangan warna bermakna yang tampil bersama di satu
halaman, termasuk warna asal deck, `merah`, dan `navy`: CIEDE2000 ΔE ≥ 15, tanda grafis
≥ 3:1 terhadap putih. Warna bermakna = warna tanpa teks di dalamnya (kategori, kelas skala,
simbol peta, seri grafik); pil berteks dikecualikan. Hasil hitung enam keluarga ditambah
`merah` dan `navy`: ΔE terkecil 17,6 (geologi–`merah`); kontras grafis terendah 3,21:1
(kering).

Pita kepala kartu skenario dan panel memakai tint keluarga dengan teks `teks`. Teks putih di
atas warna keluarga hanya ≥ 14 pt Bold (ambang 3:1 teks besar; keenam keluarga lolos).

Glif khusus digambar sekali bergaya Lucide (viewBox 24, stroke 2, ujung dan sambungan
bulat), disimpan di registri ikon `tema.json` bersama path Lucide, dan diwarnai dari token
saat render (§B5.14).

#### B1.4 Skala kelas dan koroplet

Indeks platform memakai satu ramp per keluarga bahaya; kelas IRBI memakai ramp api untuk semua
bahaya (T8). Lima kelas dari terang ke pekat:

| Ramp | Dipakai untuk | Kelas 1 → 5 |
| --- | --- | --- |
| Api | karhutla; kelas IRBI semua bahaya (T8) | `#FBE7D6`, `#F4C3A0`, `#E8894A`, `#D9600B`, `#8F3F07` |
| Air | indeks platform banjir, longsor, cuaca ekstrem, gelombang, rob | `#DCEBF8`, `#A4CAEE`, `#68A8E0`, `#2F86D1`, `#1B5A93` |
| Emas | indeks platform kekeringan | `#F4ECDC`, `#DCC79C`, `#C4A262`, `#A07A32`, `#6E5424` |
| Netral | indeks platform multi-bahaya, kapasitas, geologi, nonalam | `#DCE3EB`, `#AEBBCB`, `#7F93AA`, `#4F6A88`, `#24384F` |

- **Kelas IRBI (Rendah/Sedang/Tinggi)** memakai kelas 1, 3, dan 5 ramp api (`#FBE7D6` /
  `#E8894A` / `#8F3F07`) untuk semua bahaya, dengan nama kelas resmi dan legenda "Kelas IRBI
  BNPB" (T8; `skala.irbi` di `tema.json`). Ramp keluarga air, emas, dan netral hanya untuk indeks
  platform. Hex kategori (`#D9600B`, `#2F86D1`) tidak pernah menjadi kelas IRBI. Peta IRBI banjir
  di kajian air ikut oranye; apakah pemilik menghendakinya masih terbuka (T13).
- Validator ramp: kelas bersebelahan ΔE ≥ 10 (hasil terkecil 10,5), kelas 1 ΔE ≥ 7
  terhadap putih (terkecil 7,5), kelas IRBI 1–3–5 ΔE ≥ 20 (terkecil 22,0).
- Peta koroplet tidak memakai `wilayah` untuk daratan (kelas 1 ramp netral hanya ΔE 2,0
  darinya); daratan di luar cakupan putih bergaris `batas`, garis pantai `batas` 0,4 pt
  supaya kelas 1 tidak hilang di laut putih.
- Panel di halaman berpeta koroplet memakai tint netral, karena kelas 1 tiap ramp sama
  dengan tint pita keluarganya.
- Simbol di atas koroplet memakai `navy` atau putih bergaris, bukan warna keluarga ramp itu.
- Merah tidak dipakai untuk kelas indeks; merah hanya garis sorot wilayah prioritas
  (1,5 pt `merah`) bila memang ditetapkan prioritas.
- **Tanpa data:** `#F1F3F6` berarsir diagonal, entri legenda "Belum terdata". Tidak
  pernah diwarnai sebagai nilai rendah.
- **Status resmi lembaga** (level PVMBG, peringatan BMKG, PDKM BMKG, intensitas MMI) memakai
  warna dan kata asli lembaganya, tidak dipetakan ulang ke skala di atas.

#### B1.5 Arah perubahan

Arah ditulis sebagai ikon vektor segitiga dari registri ikon (SVG di PNG dan HTML, gambar
sebaris di DOCX), sewarna token, atau sebagai kata "naik"/"turun". Karakter ▲ (U+25B2),
▼ (U+25BC), dan → (U+2192) tidak ada di Roboto, sehingga Word dan LibreOffice mengambilnya
dari font cadangan; karakter itu tidak dipakai di keluaran (D-23). Warna: naik `oranye`,
turun `biru`, 0% `teks-3`, "baru" bila pembandingnya 0. Di atas latar navy: naik
`#F2A35E`, turun `#8EC5F5`. Di halaman yang menampilkan keluarga atau ramp api atau basah,
ikon arah memakai `teks-2` dan kata naik/turun ditulis (§B1.8).

Warna mengikuti arah, bukan baik-buruk: indikator yang naiknya baik (cakupan air minum,
kapasitas) tetap oranye saat naik. Besaran yang dibaca sebagai baik-buruk di kajian air, yaitu
surplus/defisit neraca air (G7) dan membaik/memburuk terhadap skenario dasar (G13), tidak memakai
warna arah: batang `teks-2` lawan pembanding `#DCE1E7`, dengan kata "surplus"/"defisit" atau
"membaik"/"memburuk" tertulis di label. Satu aturan ini berlaku di PEDOMAN, SINTESIS, dan Buku
Pegangan; pasangan valensi "membaik biru, memburuk oranye" tidak dipakai.

#### B1.6 Warna terlarang

`#D9650B`, `#0F1E2D`, `#0B4EA2`, `#A88A3C`, `#FBEBDD`, `#D5D9DE` (palet generator lama);
warna versi 1 pedoman ini yang gagal validator atau kembar (`#2F6FB5`, `#4F6D8C`,
`#2E7D8C`, `#6B4A2B`, `#7A2E1E`, `#A23B2A`, `#F7F8FA`); navy-emas MBG (`#0B2545`,
`#C9A227`), hijau-emas Gemah Ripah, marun Betutu Sambe; ungu, violet, fuchsia, lime, indigo,
cyan (hue 175–200°); gradien ungu. Gerbang D-9 berupa daftar putih: tiap hex di DOCX, SVG,
HTML, CSS, dan JSON gaya keluaran wajib ada di `tema.json`; daftar di atas menjadi fixture
negatif D-9.

#### B1.7 Kode kajian air

Komponen bukan bahaya, jadi tidak diberi warna kategori: lingkaran `navy` berikon putih,
atau ikon `navy` di lingkaran tint netral, dibedakan ikon dan label. Ancaman memakai
keluarga §B1.3. Musim ditandai pita tint dan label, tanpa ikon sendiri.

| Kode | Unsur | Ikon | Warna dan tint |
| --- | --- | --- | --- |
| Komponen | Air baku dan air minum | `droplet` (satu arti dengan tetes air bersih, §B5.14) | `navy` / `#E6EAF0` |
| Komponen | Irigasi | `sprout` | `navy` / `#E6EAF0` |
| Komponen | Waduk dan bendungan | glif khusus tubuh bendungan | `navy` / `#E6EAF0` |
| Komponen | Air tanah | glif khusus sumur | `navy` / `#E6EAF0` |
| Komponen | Penurunan muka tanah | glif khusus patok GNSS dengan tanah turun | `navy` / `#E6EAF0` |
| Ancaman | Kekeringan | `sun` | kering `#B08A3E` / `#F4ECDC` |
| Ancaman | Banjir dan longsor | `waves`, glif lereng runtuh | basah `#2F86D1` / `#DCEBF8` |
| Ancaman | Rob | glif khusus bangunan tergenang air laut | basah `#2F86D1` / `#DCEBF8` |
| Musim | Musim kemarau | – | pita `#F4ECDC`, label "Musim kemarau" |
| Musim | Musim hujan | – | pita `#DCEBF8`, label "Musim hujan" |

Tidak ada warna baru: tiga ancaman memakai dua keluarga yang sudah lolos validator §B1.3.
Banjir dan rob sekeluarga, dibedakan ikon dan bentuk simbol peta.

#### B1.8 Satu hex satu arti per halaman

| Hex | Arti yang sah | Aturan bila berbagi halaman |
| --- | --- | --- |
| `#D9600B` | kategori api; ramp api kelas 4; naik; angka kunci judul | Bila kategori atau ramp api tampil, arah memakai `teks-2` + kata dan angka kunci judul `navy` |
| `#2F86D1` | kategori basah; ramp air kelas 4; turun | Bila kategori atau ramp air tampil, arah memakai `teks-2` + kata |
| `#FBE7D6`, `#DCEBF8`, `#F4ECDC` | tint pita keluarga; ramp kelas 1 | Halaman berpeta koroplet memakai tint netral untuk panel |
| `#B08A3E` | kategori kering | Tidak untuk teks < 14 pt (pakai `emas-teks`) |
| `#C8102E` | bahaya/perlu perhatian | Satu arti di semua halaman |
| `#5B7A99` | pil berteks (Terverifikasi, peringatan BMKG), garis kotak Catatan dan Koreksi | Bukan warna kategori atau seri |
| `#3F5F80` | ukuran kedua | Bukan warna kategori |
| `#051C2C` | identitas | Tidak menjadi kelas skala atau kategori |

Generator menulis `manifest.json` berisi halaman, objek, hex, dan peran tiap objek yang
digambarnya; gerbang D-24 menolak hex yang tercatat dalam dua peran pada satu halaman.

### B2. Tipografi (A4, Roboto saja, termasuk font tema DOCX)

| Unsur | Ukuran | Bobot | Warna | Catatan |
| --- | --- | --- | --- | --- |
| Judul sampul | 32 pt | Bold | putih di navy | paling banyak 3 baris |
| Subjudul sampul | 14 pt | Regular | putih | |
| Label bab ("BAB 4") | 9 pt kapital, spasi huruf 100 | Bold | `navy` | label pita; diturunkan dari penomoran Heading 1, tidak diketik (§B4); garis aksen `oranye` 2 pt × 12 mm di atasnya |
| Judul bab | 20 pt | Bold | `navy` | frasa deskriptif, KAPITAL ditulis literal ("PENDAHULUAN" di bawah label "BAB 1"; T1, §C2), selalu halaman baru, ≤ 2 baris |
| Subbab 1.1 | 13 pt | Bold | `navy` | nomor menggantung; huruf judul ("1.1 Latar Belakang"; T1) |
| Sub-subbab 1.1.1 | 11,5 pt | Bold | `teks-2` | |
| Tingkat 4 (a., 1)) | 10,5 pt | Bold | `teks` | tidak masuk daftar isi |
| Isi | 10,5 pt, spasi 1,15, 6 pt sesudah paragraf | Regular | `teks` | rata kiri-kanan; istilah asing miring |
| Penekanan | 10,5 pt | Bold | `navy` | hemat; tanpa garis bawah dekoratif |
| Isi Temuan (gaya paragraf) | 10,5 pt, spasi seperti Isi | Regular; run pertama Bold | `teks`; run pertama `navy` | turunan gaya Isi. Run pertama = kalimat pembuka ≤ 2 baris bergaya Penekanan yang memuat angka, tempat, dan tahun (OECD, CCDR; SINTESIS P17; D-26). Wajib untuk paragraf temuan Ringkasan Eksekutif dan semua paragraf isi Bab 4–7 kajian air dan Bab 4–10 kajian mitigasi; paragraf keputusan yang diminta dan yang belum diketahui di Ringkasan Eksekutif memakai gaya Isi |
| Keterangan Tabel/Gambar | 9 pt | label Bold, judul Regular | label `navy`, judul `teks` | judul deskriptif stabil (§C2, T14); di atas objek, rata tengah, ≤ 2 baris; label dan judul dipisah satu spasi ("Tabel 4.2 Judul"), tanpa titik dua atau titik |
| "Sumber:" dan catatan | 8,5 pt | "Sumber:" Bold | `teks-3` di latar putih, `teks-2` di dalam kotak bertint | di bawah objek, rata kiri sejajar objek; "Catatan:" sesudah "Sumber:", paling banyak satu baris dan 120 karakter (§B5.10, D-32) |
| Isi tabel | 9 pt (≥ 8 pt) | Regular, angka tabular | `teks` | |
| Teks grafik dan peta | label nilai 8,5 pt; kategori, legenda, anotasi 8 pt; label panel (a)(b)(c) 9 pt, pada ukuran cetak | nilai dan label panel Bold, lainnya Regular | `teks`; anotasi dan garis kejadian `teks-2` | ≥ 8 pt; label 5,9–7 pt di CCDR, Atlas, dan MGI tidak ditiru (SINTESIS P40) |
| Kepala kolom tabel | 8,5 pt, kata label kapital, satuan huruf asli ("LUAS (ha)"), spasi huruf 80 | Bold | putih di navy; `teks-3` di latar putih (tabel lampiran) | ≤ 3 baris |
| Nilai kartu angka | 18 pt, sama di PDF dan DOCX | Bold | warna makna | |
| Label kartu angka | 8,5 pt | Regular, huruf kecil | `teks-3` | |
| Pil bagian | 8 pt kapital, spasi 80 | Bold | putih di `navy`/`merah`; `teks` pada pil garis `slate` | nama bagian saja (§B5.4) |
| Catatan kaki | 8 pt | Regular | `teks` | bernomor per bab |
| Header | 8 pt | baris 1 Bold, baris 2 Regular | `teks` | |
| Footer | 8 pt; nomor halaman 9 pt Bold | | `teks-3`; nomor `teks` | |
| Daftar Isi tingkat 1 (TOC1) | 10,5 pt | Bold | `navy` | huruf seperti Heading (T1); titik penuntun; nomor halaman rata kanan |
| Daftar Isi tingkat 2 (TOC2) | 10,5 pt | Regular | `teks` | inden 7 mm; titik penuntun; nomor rata kanan |
| Daftar Isi tingkat 3 (TOC3) | 10,5 pt | Regular | `teks-2` | inden 14 mm; titik penuntun; nomor rata kanan |
| Entri Daftar Tabel/Gambar/Lampiran | 10,5 pt | label Bold, judul Regular | `teks` | "Tabel 4.2 Judul", titik penuntun, nomor rata kanan |

Batas bawah huruf yang dibaca: **8 pt** di semua keluaran cetak. Bila tidak muat, baris
dikurangi, dikelompokkan, atau tabel dipindah ke lampiran/halaman lanskap; huruf tidak
diciutkan. Hierarki dibangun dari bobot dan warna, bukan judul raksasa. Kapital berspasi
hanya untuk pil bagian, kepala kolom, dan label pita; singkatan resmi (BNPB, BMKG,
BPBD, PVMBG) tetap kapital karena itu nama. Angka memakai digit tabular Roboto
(`tnum`) di tabel dan kartu.

Kapital pada label ditulis sebagai teks literal pada kata labelnya; `w:caps` tidak dipakai
pada run yang memuat satuan, supaya "ha", "mm", "m³/detik", dan "µg/m³" tetap huruf
aslinya. Butir tingkat 1 memakai "•" (U+2022) berfont Roboto, tingkat 2 bernomor huruf
("a."); butir bawaan Word berfont Symbol atau Wingdings, ◦, ▪, dan ✓ tidak dipakai karena
tidak ada di Roboto (D-23).

### B3. Grid, margin, spasi

- Kertas A4 tegak 210 × 297 mm. Halaman lanskap hanya di lampiran untuk tabel lebar.
- Margin: kiri 25 mm, kanan 20 mm, atas 25 mm, bawah 20 mm; header 12 mm dan footer 10 mm
  dari tepi. Lebar isi 165 mm. Blok header (logo 8 mm, dua baris 8 pt, garis) paling tinggi
  10 mm, sehingga berakhir ≤ 22 mm dari tepi dan menyisakan ≥ 3 mm ke isi; Word tidak
  mendorong isi turun dan paginasi tetap.
- Lebar objek: penuh 165 mm; dua kolom 80,5 mm dengan sela 4 mm; tiga kolom 52,3 mm.
  Gambar dan tabel memenuhi lebar isi atau salah satu lebar kolom, tidak lebar bebas.
- Skala spasi: 3, 6, 12, 18, 24 pt. Sebelum subbab 18 pt, sebelum sub-subbab 12 pt;
  sebelum keterangan objek 12 pt, sesudah "Sumber:" 12 pt.
- Radius kotak satu skala: 2 mm, hanya di PNG, SVG, dan HTML (PDF ringkas, peta, grafik).
  Kotak di DOCX dibuat dari tabel bersudut tegak, karena sel tabel Word tidak bisa membulat
  dan bentuk dirender tidak konsisten di LibreOffice. Garis panel 0,75 pt `garis`. Jarak isi
  ke tepi panel ≥ 3 mm (≥ 7 pt), tidak ada isi menempel ke tepi bawah.
- Daftar lebih dari 5 butir dijadikan tabel atau kisi, bukan butir panjang.
- Halaman PDF ringkas: 3–4 blok per halaman (grup angka, 2–3 panel, pita bawah), semua
  blok berbagi tepi kiri dan kanan yang sama, tanpa ruang menganga.

### B4. Aturan halaman

- **Header** (semua halaman kecuali sampul dan pembatas bab): kiri garis tegak `oranye`
  2 pt × 7 mm, di sampingnya baris 1 judul pendek (tabel nama §A3), baris 2 "BNPB |
  Oktober 2026"; kanan logo BNPB resmi tinggi 8 mm (`public/img/lembaga/sumber-bnpb.png`,
  tanpa lingkaran, tidak digambar ulang); garis 0,75 pt `garis-kuat` selebar isi di
  bawahnya (tinggi blok §B3).
- **Footer**: garis 0,5 pt `garis` selebar isi; alamat BNPB dua baris 8 pt rata tengah (T4):
  "Badan Nasional Penanggulangan Bencana, Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120"
  dan "Call Center 117, www.bnpb.go.id"; kanan nomor halaman 9 pt Bold dari bidang PAGE Word,
  bukan teks tempelan. Kaki dua baris menambah tinggi kaki sekitar 4 mm, masih di dalam margin
  bawah 20 mm.
- **Penomoran**: sampul tanpa nomor; bagian depan romawi kecil (ii, iii, …); Bab 1 mulai
  1 arab; Daftar Pustaka dan lampiran melanjutkan angka arab. Nomor bab berasal dari
  penomoran otomatis gaya Heading 1; label pita "BAB 4" dan nomor tabel/gambar diturunkan
  dari situ (STYLEREF + SEQ), tidak diketik. Nomor tabel dan gambar per bab ("Tabel 4.2",
  "Gambar 6.3"), lampiran per kode ("Tabel A.3"). Kode temuan selalu ditulis lengkap "Temuan A.1"
  supaya tidak tertukar dengan nomor objek lampiran (§B5.26, D-27). Keterangan memakai fitur Caption Word
  sehingga Daftar Tabel/Gambar otomatis; daftar isi bidang TOC sampai tingkat 1.1.1 (gaya
  entri §B2); Daftar Lampiran dari gaya "Judul Lampiran" lewat bidang TOC `\t`.
  Gambar dan tabel di Ringkasan Eksekutif bernomor "Gambar RE.1" dan "Tabel RE.1" (seri Caption
  sendiri); salinan gambar bab menyebut "(sama dengan Gambar 5.2)" di keterangannya (MGI;
  SINTESIS P10). Rujukan di teks memakai cross-reference Word ke Caption, tidak diketik (BCG; P14).
- **Indeks diperbarui sebelum ekspor**: python-docx tidak mengisi hasil bidang TOC, dan
  soffice headless mengekspor daftar kosong bila indeks belum diperbarui. Generator
  memperbarui semua indeks lewat LibreOffice UNO (`XDocumentIndexesSupplier`, `update()`)
  sebelum ekspor PDF, dan menyetel `w:updateFields` di `settings.xml` untuk Word.
- **Bab** selalu mulai halaman baru (halaman ganjil tidak diwajibkan).
- **Sampul depan dan sampul belakang** (B5.1, B5.24) tanpa header, footer, dan nomor.
- **Tabel lintas halaman**: baris kepala diulang (Repeat Header Row), baris tidak pecah
  lintas halaman, sisa di halaman terakhir ≥ 4 baris (bila kurang, baris dibagi rata).
- **Tanggal data**: tiap halaman data PDF punya pil batas data (teksnya belum diputus, karena T4
  hanya memutus kaki; bawaan "CUT OFF DATA" seperti pil yang ditambahkan pemilik di deck); di
  DOCX batas data ditulis di baris "Sumber:" tiap tabel/gambar.

### B5. Komponen

Tiap komponen dibuat sekali di generator dan dipakai ulang; templat yang sudah disetujui
disalin, tidak didesain ulang per halaman. Teks, tabel, pil, dan label dibuat native
(bisa disunting di Word); gambar hanya untuk foto, logo, peta dasar, grafik, ikon.

#### B5.1 Sampul

Atas 55% tinggi: foto Commons selebar halaman (kajian air: Waduk Jatiluhur atau Bengawan
Solo; kajian mitigasi: Merapi atau Palu 2018), dipotong tanpa distorsi. Bawah 45%: blok
`navy` penuh; garis aksen `oranye` 3 pt di batas foto; judul 32 pt putih; subjudul 14 pt;
baris "Badan Nasional Penanggulangan Bencana" + logo BNPB berwarna di bidang putih (jarak
aman ≥ 3 mm) di dalam blok navy; "Oktober 2026". Logo tidak diubah menjadi putih, karena itu
mengubah lambang resmi (§C6.5); versi monokrom dipakai hanya bila berkas resminya diterima
dari BNPB. Atribusi
foto sampul di kolofon dan Lampiran Atribusi. Tanpa header/footer/nomor, tanpa logo lain.

#### B5.2 Pembatas bab

Bukan halaman penuh (hemat batas 150 hlm). Bab mulai halaman baru: label pita "BAB 6"
→ judul bab 20 pt → satu kalimat pertanyaan yang dijawab bab (10,5 pt miring `teks-2`)
→ kotak ringkasan bab (B5.3) → isi. Pembatas Lampiran satu halaman berlatar `navy`
dengan judul putih (satu-satunya halaman gelap selain sampul).

#### B5.3 Kotak ringkasan bab

Panel putih bergaris `garis` 0,75 pt, radius 2 mm, pita kepala tint netral berisi ikon
dan judul "Ringkasan bab". Isi berlabel, satu baris satu gagasan: **Temuan:** (≤ 3
butir, angka di depan) **Angka kunci:** (≤ 3, bersumber) **Rekomendasi:** (nomor
rekomendasi yang diturunkan bab ini). Tanpa paragraf. Ditulis terakhir setelah bab
selesai.

#### B5.4 Kartu angka

Putih, garis `#BFC5CC` 0,75 pt, radius 2 mm (sudut tegak di DOCX, §B3). Kiri atas
lingkaran tint 9 mm berisi ikon garis 5 mm sewarna nilai; nilai 18 pt Bold berwarna makna;
satuan lebih kecil di belakang nilai; label huruf kecil di bawah (≤ 24 huruf), boleh memuat
pembanding singkat ("naik 39% dari 2024"). Kartu tidak memuat baris sumber atau pil
keyakinan sendiri: sumber dan label keyakinan ditulis satu baris kaki per grup kartu
("Sumber: …; Resmi"). Kartu dikelompokkan dalam grup bertint dengan pil bagian, 3–4 kartu
per baris, bukan satu deret datar. Warna pil bagian: `navy` untuk data (mis. "DATA RESMI",
"SIMULASI"), `merah` untuk perlu perhatian dan preseden, pil garis `slate` untuk peringatan
BMKG. Kartu tanpa data dihapus, bukan diisi "–". Di Ringkasan Eksekutif kalimat tesis datang
lebih dulu (halaman Pesan Kunci); di Ringkasan Eksekutif dan PDF hlm 3, kartu pertama berisi
hitungan wilayah yang perlu ditindak, didampingi total singkat.

#### B5.5 Kotak temuan kunci, kotak keputusan, kotak catatan

- **Temuan kunci:** latar `#F3F5F8`, garis kiri 3 pt `navy`, judul berupa kalimat temuan
  berangka; isi: bukti (angka + lokasi + sumber), dampak, pembuka (lembaga/langkah).
  Label "fakta" atau "penilaian" di kanan atas. Bila kotak memuat vonis (tingkat, kelas,
  layak/tidak), satu baris "Mengapa bukan satu tingkat lebih baik atau lebih buruk" membela
  vonis dua arah.
- **Keputusan yang diminta:** latar `#FDF4EC`, garis kiri 3 pt `oranye`; tiap butir
  pertanyaan + akibat tiap pilihan.
- **Koreksi premis:** latar `#F3F5F8`, garis kiri 3 pt `slate`, label Bold "Koreksi" di
  baris pertama; dipakai bila anggapan umum keliru dan harus dikoreksi dengan dasar. Bukan
  merah: merah hanya bahaya/perlu perhatian. Paling banyak satu per bab.
- **Catatan:** latar `#F3F5F8`, garis kiri 3 pt `slate`, label Bold "Catatan".
- **Dampak bila tidak ditangani** (WS45; SINTESIS P58): panel berpita (§B5.6) bertint keluarga
  ancaman (§B1.3), judul "Dampak bila tidak ditangani" dengan horizon, 2–4 butir berangka Bold,
  sumber dan label keyakinan di kaki. Dipasang di awal tiap aksi Bab Grand Design kajian air.
- **Perbandingan dengan kajian sebelumnya** (Deloitte; SINTESIS P71): pola kotak Catatan dengan
  label Bold "Perbandingan"; menyebut angka lama, angka baru, dan sebab bedanya, lalu merujuk tabel
  rekonsiliasi (§B5.7). Tidak berupa panel gelap.

Satu topik satu kotak; tidak ada panel gelap di samping isi. Teks di dalam kotak bertint,
termasuk "Sumber:", memakai `teks` atau `teks-2`.

#### B5.6 Panel berpita

Panel putih bergaris `garis`; pita kepala 9 mm bertint tema (B1.2) berisi lingkaran
ikon, judul Bold, hitungan rata kanan. Isi: daftar status (lingkaran ikon, nama tempat
Bold + ", lokasi" Regular, pil status kanan; diurutkan terbesar dulu; status ≤ 4
kategori), atau 3–4 kolom dipisah garis 0,75 pt (pita bawah aksi; latar `#FDF4EC` aksi,
`#EEF5FC` musim hujan, `#F3F5F8` data; tiap kolom ≤ 2 baris).

#### B5.7 Tabel

**Aturan umum (semua tabel):**
- Keterangan di atas ("**Tabel 5.2** Judul deskriptif", bentuknya §C2 dan T14), sumber
  di bawah ("**Sumber:** …; data per 22 Okt 2026"). Judul tabel ≤ 2 baris.
- Kepala `navy` teks putih Bold 8,5 pt, kata label kapital dan satuan huruf aslinya, rata
  tengah, ≤ 3 baris, diulang tiap halaman. Satuan di kepala dalam kurung ("LUAS (ha)",
  "CURAH HUJAN (mm)"), bintang merujuk catatan sumber. Pengecualian: tabel lampiran (di
  bawah). Kolom label baris (kiri) tanpa isi warna, teks Bold `teks`.
- Kolom No paling kiri, sesempit isinya, rata tengah. Teks rata kiri. Angka rata kanan,
  tabular, desimal seragam per kolom. Persen dan panah rata kiri di kolomnya. Rp rata kiri
  dengan angka rata kanan.
- Garis bawah antarbaris 0,5 pt `garis`; tanpa garis vertikal; tanpa pita selang-seling;
  tanpa progress bar.
- Baris total `navy` teks putih Bold di kaki; subtotal per kelompok `#E6EAF0` Bold hanya
  bila kelompok berisi lebih dari satu baris; baris grup tanpa cacah.
- Satu baris per sel untuk angka, kode, nama wilayah; kolom keterangan bebas boleh
  melipat. Tanpa "…" terpotong. Dua potong informasi = dua kolom (Jumlah | Satuan).
- Nilai yang sama di tiap baris naik ke kalimat pengantar di atas tabel, tidak jadi kolom.
- Paling banyak 8 kolom di A4 tegak; kolom sekunder ke lampiran atau `.xlsx`.
- Wilayah diurutkan barat ke timur (Sumatra, Jawa, Bali dan Nusa Tenggara, Kalimantan,
  Sulawesi, Maluku, Papua) kecuali tabel peringkat; kota dan kabupaten dalam satu urutan
  kode Kemendagri.
- Sel kosong: nilai, atau nilai tingkat lain bila sah (ditandai), atau "–" dengan alasan
  di catatan ("tidak dipublikasikan", "belum ada", "menunggu data K/L", "belum dicari").
  Tidak diisi 0. Kolom yang seluruhnya kosong dibuang. "–" adalah satu-satunya notasi data
  kosong di seluruh dokumen, termasuk lampiran.
- Tabel berisi warna/ikon/pil ditutup legenda di baris terakhir tabel itu sendiri: sel digabung
  selebar tabel, tanpa isi warna, 8 pt. Dengan begitu "Sumber:" tetap paragraf pertama sesudah
  objek (D-7). Legenda grafik dan peta dibakar ke PNG.
- Label keyakinan per tabel di baris sumber, atau per baris bila campuran.
- Sel gabungan rata tengah vertikal.
- Data berperiode (harian, bulanan, tahunan) dalam satu tabel dengan periode sebagai kolom,
  bukan satu tabel per periode; label periode berupa rentang tanggal ("1–7 Okt"), bukan
  nomor minggu.

**Jenis tabel:**
- **Tabel data**: aturan umum.
- **Tabel peringkat**: nomor peringkat dalam bulatan `navy` angka putih; wilayah fokus
  diblok `#FDF1E8` dan tetap memakai nomor aslinya; kolom jumlah absolut (jiwa terpapar)
  selalu ada di samping indeks/persen; dasar urutan disebut di judul. Nilai indeks boleh diikuti
  titik kelas ramp §B1.4 (kelas IRBI: ramp api, T8) (UNICEF; SINTESIS P106).
- **Tabel perbandingan** (benchmark, opsi kebijakan): kolom Praktik | Negara/lembaga |
  Yang ditiru | Yang tidak cocok | Penyesuaian Indonesia; kolom vonis berupa pil dengan
  kosakata tetap.
- **Matriks lembaga**: baris lembaga (BNPB, BPBD, K/L, pemda, BUMD), kolom fase
  prabencana, tanggap darurat, pascabencana; sel berisi tugas ≤ 2 baris; lembaga pemimpin ditandai pil `navy`
  "Pemimpin", pendukung pil garis "Pendukung"; lembaga sebagai chip berikon, bukan logo.
- **Tabel lampiran** (B5.8), pengecualian aturan kepala navy: kepala Bold `teks-3` tanpa
  isi dengan garis bawah 1 pt, baris 0,5 pt `garis`, 8–9 pt; data belum ada "–" dijelaskan
  di catatan.
- **Tabel rekonsiliasi angka**: Besaran | Versi | Nilai | Sumber | Tanggal | Yang dipakai
  dan alasannya. Wajib untuk angka yang berbeda antar sumber.
- **Tabel skenario** (Nankai; SINTESIS P60): kolom = skenario, baris = besaran; sel digabung bila
  nilainya sama di semua skenario, supaya bagian yang tidak bergantung skenario langsung terlihat;
  asumsi tiap skenario ditulis di baris kepala kedua.
- **Tabel perkiraan lama lawan baru** (Nankai; SINTESIS P59): kolom dokumen lama dan kajian ini,
  kolom kajian ini Bold; nilai berupa rentang "sekitar", asumsi ditulis di bawah nilai, stempel
  skenario di baris sumber.
- **Tabel peta panas** (ADB, MGI; SINTESIS G16): sel diwarnai kelas diskret ramp §B1.4 (kelas IRBI:
  ramp api, T8), angka tetap tertulis, legenda kelas di baris terakhir tabel; kepala tidak diputar
  bila muat.
- **Tabel preseden** (White Paper Jepang; SINTESIS P108): kejadian besar sebagai kolom berikon
  jenis, besaran yang sama sebagai baris (waktu, magnitudo atau luas, korban, rumah rusak); kolom
  yang sedang dikaji berlatar `#FDF1E8`.
- **Tabel tipologi wilayah** (MGIA, Nankai; SINTESIS P104): baris dikelompokkan per tipe wilayah
  dengan pita grup `#E6EAF0` berlabel tipe dan cacah; profil tipe 2–3 label pendek; rekomendasi
  merujuk tipe. Tipe tidak diberi warna sendiri; bila perlu di peta, tipe digambar sebagai kelas
  ramp netral berlabel.
- **Kolom proyeksi dan target** (IMF; SINTESIS P67): berlatar `#F3F5F8` di tabel indikator,
  skenario, dan proyeksi; ini pembeda kolom, bukan pita selang-seling. Nilai berketidakpastian
  ditulis "X ± Y" atau rentang "a–b"; baris pembanding (Pulau Jawa, nasional) Bold tanpa isi
  warna di atas baris total (WMO; P66).

#### B5.8 Lampiran

Pembatas Lampiran (B5.2), lalu tiap lampiran "Lampiran A. Judul" di halaman baru.
Tabel per kab/kota dikelompokkan berjenjang pulau → provinsi → kab/kota, angka di baris
label wilayahnya sendiri, dibangun dari katalog wilayah lengkap (514 kab/kota atau 119
kab/kota Jawa), bukan dari data yang kebetulan ada. Lampiran Atribusi Foto memuat judul
berkas, pengarang, lisensi, URL, tanggal akses, pemotongan yang dilakukan.

**Dasbor wilayah** (MGIA; SINTESIS P5): templat identik 1–2 halaman per provinsi Jawa (kajian air)
atau per keluarga bahaya (kajian mitigasi): kartu angka, peta kecil berganda, tabel kecil, batang
tiga periode; hanya nama dan angka yang berganti, judul berpola sama. **Katalog program** (Charting
Our Water Future; SINTESIS P9): satu baris per program dengan status usulan (`KEPUTUSAN.md` P7),
dampak terukur, asumsi, dan sumber tiap angka; tanpa biaya (K6).

#### B5.9 Peta

- Latar putih atau `#F3F5F8`; laut putih, tidak biru. Daratan tanpa nilai `#F1F3F6`
  berarsir, daratan netral `#D3DBE5` (peta simbol saja, §B1.4), batas wilayah putih 0,4 pt,
  batas provinsi `#A9B4C2` 0,6 pt.
- **Koroplet kab/kota** untuk indeks per wilayah (B1.4). Untuk perbandingan antar 38
  provinsi, peta kisi (satu kotak sama besar per provinsi, disusun mengikuti geografi)
  mendampingi koroplet supaya luas wilayah tidak menyesatkan.
- **Simbol**: bulatan luas sebanding nilai, bergaris putih, yang kecil di atas yang besar;
  jenis objek dibedakan bentuk (lingkaran kejadian, segitiga gunung api, persegi
  bendungan), satu warna per jenis.
- Label pil putih bergaris abu, nama provinsi cukup besar (≥ 8 pt pada ukuran cetak);
  nomor prioritas 1–n di sisi bulatan yang kosong. Tidak ada label, bulatan, atau badge
  yang bertumpuk (gerbang D-8).
- **Legenda wajib** di kaki peta, rata tengah, entrinya diturunkan dari yang tergambar:
  arti tiap warna, ukuran bulatan (3 contoh), bentuk, "Belum terdata", sumber dan tanggal.
  Penanda di legenda sebentuk persis dengan yang tercetak; label 2–3 kata.
- Peta dibuat sebesar mungkin dalam lebar isi; skala batang dan arah utara kecil di pojok
  kanan bawah untuk peta pulau/provinsi.
- **Unsur peta resmi**: kaki peta memuat "Sumber batas: BIG/Kemendagri {tahun}; SRGI2013"
  atau sistem referensi dan proyeksi yang dipakai (mis. WGS84 geografis); peta pulau dan
  provinsi memakai inset lokasi; peta nasional mengikuti Peta NKRI BIG, termasuk penamaan
  laut (Laut Natuna Utara) dan pulau terluar lengkap; bila batas yang dipakai bukan rujukan
  resmi, catatan "Batas wilayah bukan rujukan resmi" tertulis di kaki. Perender menulis
  sumber batas, sistem referensi, proyeksi, inset, dan catatan ke manifest; D-8
  memeriksanya.
- **Koroplet hanya untuk rasio dan indeks** (per 100.000 jiwa, per km², kelas indeks); total dan
  jumlah digambar sebagai simbol sebanding (FT; SINTESIS P46). Manifest peta mencatat `besaran`;
  D-28 menolak koroplet untuk total.
- **Peta kecil berganda** untuk tahun, skenario, atau komponen (MGI, OECD, Nankai; SINTESIS P43):
  skala dan batas sama, satu legenda bersama, kelas sama di semua panel (D-29), label panel (a)(b)(c)
  atau nama skenario dalam pil. Pulau Jawa yang memanjang disusun bertumpuk.
- **Peta indeks studi kasus** (MGI; SINTESIS P44): bulatan `navy` bernomor putih di lokasi; tabel
  nomor, lokasi, dan judul temuan tepat di bawah peta; nomor sama di peta dan tabel.
- **Koroplet bersanding tabel peringkat** (White Paper Jepang; SINTESIS P45): warna kelas di tabel
  sama dengan di peta; kurung kelas di samping tabel menyebut cacah wilayah per kelas.
- **Inset perbesaran** bergaris `batas` untuk kawasan padat, mis. Jabodetabek dan Semarang–Demak
  (OECD; SINTESIS P47).
- **Sorot satu kategori** di atas daratan netral memakai warna keluarga yang dibahas (§B1.3), tidak
  `merah` (CCDR; SINTESIS P42). Pengecualian: kelas IRBI memakai ramp api di semua peta (T8); ramp
  keluarga hanya untuk kategori dan indeks platform. Bahaya disandingkan keterpaparan (penduduk, aset) sebagai dua peta
  sama skala (MGIA; P50).
- **Peta strategi per wilayah sungai** (Deltaprogramma; SINTESIS P49, disesuaikan): wilayah sungai
  dibedakan nomor putih dalam bulatan `navy` dan batas 1 pt `teks-2`, tanpa isi warna; legenda
  berupa pil nama 2–3 kata; kalimat arah 2030 pindah ke tabel tepat di bawah peta (No, Wilayah
  sungai, Arah 2030). Tidak ada warna baru per wilayah (§B1.3, §B1.6, D-9).
- Peta di dokumen sama isinya dengan peta web: prioritas yang disorot dan bernomor sama,
  jumlahnya sama.
- Koordinat titik dari sumber luar divalidasi; titik ragu tidak digambar tetapi tetap ada
  di tabel.
- Status resmi lembaga digambar dengan warna dan kata aslinya, berlabel lembaga dan waktu
  terbit.

#### B5.10 Grafik

- **Pesan dulu, grafik kemudian**: jenis grafik dipilih dari tabel pilih grafik di bawah (FT Visual
  Vocabulary dan contoh laporan kelas dunia; SINTESIS §5). Grafik di luar tabel butuh alasan satu
  kalimat di manifest (D-28).
- **Batang**: ujung atas membulat di atas garis dasar `garis`; tanpa sumbu Y; nilai Bold di atas tiap
  batang termasuk nilai kecil; batang pembanding `#DCE1E7`; periode lama tint, periode yang
  ditekankan pekat (ditetapkan di judul, mis. tiga tahun terakhir); garis rata-rata berpil `navy`
  "rata-rata"; kepala grafik pola grafik batang pemilik: nama besaran kiri, perubahan neto kanan
  berwarna arah dengan ikon vektor (§B1.5), satu baris tanpa satuan dan periode (lihat Anatomi). Batang bertumpuk paling banyak 4 kategori ditambah "lainnya", nilai tiap segmen dan
  total di atas batang tertulis.
- **Seri panjang** (lebih dari 24 periode): diringkas menjadi rata-rata per dekade sebagai batang
  (OWID; SINTESIS P29), atau digambar sebagai garis berlabel di ujung dengan paling banyak 3 garis
  acuan nilai berlabel (0,5 pt `garis`); tabel data tahunan ke lampiran. Batang tidak pernah diberi
  sumbu Y.
- **Garis/kurva musim**: seri tahun berjalan pekat di atas pita median historis
  (mis. 2019–2025) berwarna tint; tahun analog (2015) garis putus.
- **Anatomi** (MGI, Atlas, CCDR; SINTESIS P32–P38): dari atas keterangan (§B2), pil kanan atas paling
  banyak satu (label keyakinan §C6.2, skenario, atau sasaran yang diukur, mis. "Sasaran Sendai B"),
  grafik, "Sumber:", lalu "Catatan:" bila ada. Kartu Insight Buku Pegangan adalah aturan layar
  situs; di kertas berlaku dua hal: (1) kepala grafik pola grafik batang pemilik (nama besaran kiri,
  perubahan neto kanan) menjadi satu-satunya baris di atas grafik, tanpa satuan dan periode; baris
  subjudul indikator, satuan, atau periode tidak dipakai, satuan dan periode dilebur ke akhir
  keterangan dalam kurung atau ke legenda; (2) "Catatan:" paling banyak satu baris dan 120
  karakter, hanya untuk cara baca atau bias data (D-32). Label seri langsung di ujung garis
  atau batang bila seri paling banyak 4, selebihnya legenda di atas grafik. Paling banyak 3 anotasi
  per grafik; kejadian pada deret waktu ditandai garis tegak tipis `teks-2` berlabel (El Niño 2015,
  2019, 2023; UU 17/2019) (IMF, Atlas; P26, P27). Panel berganda berlabel (a), (b), (c), skala sama,
  satu legenda di kaki (P36). Di PDF ringkas (HTML) grafik boleh satu blok dengan kolom 3 butir pesan
  berangka di kanannya (GAR; P72); di DOCX ketiga pesan ditulis sebagai kalimat pembuka tebal
  paragraf di bawah gambar, karena kolom samping di Word rapuh (P12). Teks grafik ≥ 8 pt pada ukuran
  cetak (§B2).
- **Rentang ketidakpastian**: batang galat atau pita (p10–p90, rendah–tinggi) dengan titik
  tengah; angka rentang ditulis di label ("1.200–4.800 jiwa"); judul menyebut sumber
  rentang. Presisi tidak melebihi data. Bentuk yang dipakai (SINTESIS §7): pita persentil dengan
  median tebal dan garis tegak tahun sekarang (ADB; P54); batang rentang mengambang dengan median
  (ADB, MGI; P55); pita melebar untuk proyeksi dengan garis tengah `navy` (FT, IMF; G11); data garis
  solid, proyeksi garis putus, estimasi arsir (Atlas; P56); small multiples selisih dari skenario
  dasar (IMF; P57); bara risiko dan strip kelas per skenario dengan 5 kelas ramp berlabel dan pil
  "Penilaian pakar" (§C6.2) (IPCC, GAR; P63, P64); beberapa sumber sekaligus dengan seri utama pekat dan sumber lain
  garis tipis `teks-3` (WMO; P65). Paling banyak 2 pita per grafik; garis per anggota ansambel tidak
  digambar.
- Palet grafik dari token B1; warna per seri tetap di seluruh dokumen.
- Grafik cetak tidak punya tooltip, jadi semua angka yang dibaca tertulis.
- Legenda wajib untuk tiap seri, warna, dan pita (D-21); grafik yang tidak lazim diberi satu baris
  cara baca dan definisi besarannya di baris "Catatan:" di bawah "Sumber:" (OECD; P37), bukan di bawah
  judul. Seri yang bias pelaporannya mengubah cara baca diberi Catatan satu baris, mis. DIBI sebelum
  dan sesudah BPBD terbentuk 2008 (OWID; P28).

**Pilih grafik menurut pesan** (kode sama dengan SINTESIS §5 dan Buku Pegangan bab Selera laporan):

| Kode | Pesan | Grafik | Asal |
| --- | --- | --- | --- |
| G1 | Perubahan waktu, ≤ 24 periode | Batang tegak sesuai butir Batang | gaya rumah d3/d5; WDR 2024 hanya untuk nilai di atas batang |
| G2 | Perubahan waktu, seri panjang | Rata-rata per dekade sebagai batang, atau garis sesuai butir Seri panjang | OWID, White Paper Jepang, IMF |
| G3 | Musim berjalan lawan normal | Kurva musim di atas pita median | gaya rumah (kurva musim pemilik); ADB 2024 hanya untuk pita persentil |
| G4 | Peringkat | Batang horizontal terurut, nomor dalam bulatan `navy`, kolom jiwa terpapar | gaya rumah d5 (batang, bulatan nomor); Atlas SDG hanya untuk urutan |
| G5 | Peringkat seluruh wilayah | Satu deret batang terurut, nama hanya untuk yang disorot | Charting Our Water Future |
| G6 | Dua titik waktu per wilayah | Dumbbell terurut, titik awal `#DCE1E7`, titik akhir warna makna, selisih ditulis | Atlas SDG |
| G7 | Surplus atau defisit, anomali | Batang divergen dari nol berlabel kata; di kajian air `teks-2` lawan `#DCE1E7`, di luar itu warna arah (§B1.5) | FT |
| G8 | Komposisi | Batang bertumpuk 100%, ≤ 4 kategori + "lainnya"; pangsa tunggal batang 100% satu baris | Atlas SDG, BCG |
| G9 | Komposisi per skenario atau tahun | Batang bertumpuk per skenario, total di atas | GAR 2025, Deloitte |
| G10 | Kesenjangan kebutuhan lawan pasokan | Waterfall atau baji dalam satuan fisik (m³), pil selisih; tidak dalam rupiah (K6) | Charting Our Water Future |
| G11 | Proyeksi dengan rentang | Pita melebar, garis tengah `navy`, angka rentang tertulis, pil keyakinan | FT, IMF |
| G12 | Rentang per wilayah atau skenario | Batang rentang mengambang dengan median | ADB 2024, MGI |
| G13 | Skenario lawan dasar | Small multiples selisih dari skenario dasar; di kajian air `teks-2` lawan `#DCE1E7` berlabel "membaik"/"memburuk" (§B1.5) | IMF |
| G14 | Efek tindakan | Pasangan batang sebelum dan sesudah, label "turun …%" dan ikon arah | Nankai |
| G15 | Rugi bila diam lawan manfaat bertindak | Batang kupu-kupu, 2 skenario, satuan fisik atau rupiah bersumber | WS45 |
| G16 | Wilayah × kategori | Matriks titik (warna kelas, isi titik keyakinan) atau tabel peta panas (§B5.7) | IPCC, ADB 2024, MGI |
| G17 | Kemungkinan × dampak | Matriks risiko §B5.27 | NRR (nomor polos); bulatan `navy` gaya rumah d5 |
| G18 | Prioritas | Kisi prioritas §B5.28 | CCDR |
| G19 | Sebaran rasio atau indeks | Koroplet 5 kelas diskret (§B5.9) | Atlas SDG, FT |
| G20 | Sebaran total | Simbol sebanding berlegenda tiga ukuran | FT, Atlas SDG |
| G21 | Aliran | Aliran fisik bersumber (m³ air per sektor): Sankey ≤ 3 tingkat. Aliran dana dan tanggung jawab: diagram aliran berikon tanpa lebar sebanding (§B5.21, §B5.23); Sankey dana tanpa nominal tidak jujur dan nominal dilarang (K6) | ADB 2024, WS45, MGI |
| G22 | Capaian lawan target | Bullet chart atau tabel indikator §B5.19 | FT, White Paper Jepang |
| G23 | Kapan dan berapa lama | Kolom WAKTU berpil horizon di matriks rekomendasi §B5.13 (tabel tahap × tahun §B5.29 hanya bila pemilik menyetujui, T12); kronologi regulasi §B5.31 | Deltaprogramma, CCDR |
| G24 | Respons antar-kejadian | Garis bersumbu "hari sejak kejadian", label di ujung garis | White Paper Jepang |
| G25 | Dilarang | Pai lebih dari satu pangsa, donat, sumbu ganda, radar, chord, streamgraph, violin, Voronoi, area bertumpuk > 4 kategori, 3D, lingkaran konsentris, ikon dekoratif sebagai grafik, kurva biaya (K6) | – |

Sebar beranotasi (hubungan dua besaran) dan Marimekko (penduduk × indeks) hanya di bab analisis
DOCX, tidak di PDF ringkas, dan tanpa kata kerja sebab-akibat (§C8).

#### B5.11 Kartu skenario terburuk (satu halaman)

Pola UK NRR (satu halaman per risiko) dan tabel kerusakan Nankai. Satu kartu per jenis
bencana (kajian mitigasi) atau per musim/komponen (kajian air). Tiga varian menurut apa
yang benar-benar ada di platform dan sumber; angka yang tidak ada tidak dikarang.

**Varian (a), bencana alam yang dimodelkan** (cakupan `riset/D` §1):

1. **Kepala**: pita tint keluarga (§B1.3) dengan ikon, nama jenis, dan judul skenario
   ("Gempa megathrust selatan Jawa M 8,5"), teks `teks`.
2. **Dasar skenario**: sumber parameter (PuSGeN 2017, PVMBG, BMKG), definisi "skenario
   terburuk yang masuk akal" (ekstrem yang sangat tidak mungkin disisihkan).
3. **Kemungkinan**: pita peluang 5 tahun gaya NRR (1 = < 0,2%; 2 = 0,2–1%; 3 = 1–5%;
   4 = 5–25%; 5 = > 25%) atau periode ulang, bersumber; tidak pernah "100%"; nilai kecil
   "< 1%". Posisi kartu ditandai di matriks mini kemungkinan × dampak dengan garis silang rentang
   keyakinan (NRR; SINTESIS P62, §B5.27).
4. **Tabel kerusakan** (kolom: Besaran | Rendah | Tinggi | Label keyakinan | Sumber):
   korban jiwa per penyebab, luka, pengungsi hari ke-7, bangunan rusak berat/sedang/
   ringan, luas terdampak (ha/km²), kerugian materiil (batas bawah stimulan rumah BNPB +
   pembanding PDNA), kerugian imateriil dalam satuan fisik: DALY dan hari mengungsi
   (`KERANGKA.md` prinsip 5), ditambah sekolah dan faskes terganggu. Rupiah imateriil hanya
   di lampiran metode, tidak dijumlah ke materiil. Baris yang tidak bisa dihitung dari model
   atau sumber ditulis "–" beralasan, tidak diisi perkiraan.
5. **Angka kebijakan**: satu baris pembanding yang mengubah angka jadi keputusan
   (mis. korban bila evakuasi cepat vs lambat), digambar sebagai pasangan batang kondisi sekarang
   lawan bila target tercapai berlabel "turun …%" dengan ikon arah `biru` (Nankai; SINTESIS P61).
6. **Peta kecil** jejak skenario dengan legenda.
7. **Kemampuan respons yang dibutuhkan** dan **kebutuhan pemulihan**, 3–4 butir.
8. **Lembaga** pemimpin dan pendukung (chip berikon).
9. **Kaki**: "Simulasi skenario Pantau Bencana, belum divalidasi" bila dari model, galat
   tercatat (mis. "model korban gempa meleset ±5 kali"), cut-off data.

**Varian (b), bencana nonalam** (pandemi, kebakaran industri, kebakaran TPA). Platform
tidak punya simulasinya, jadi kartu memuat kejadian analog terdokumentasi, bukan pita
model: COVID-19 untuk pandemi, Plumpang 2023 untuk kebakaran industri, Sarimukti 2023 untuk
kebakaran TPA. Kepala, dasar, lembaga, dan kaki sama dengan varian (a); kemungkinan ditulis
sebagai frekuensi kejadian serupa bila sumbernya ada. Tabel kerusakan memakai indikator
sesuai jenis:

| Jenis | Indikator tabel kerusakan |
| --- | --- |
| Pandemi | kasus, kematian, hari layanan kesehatan terganggu |
| Kebakaran TPA | luas terbakar, hari asap, kasus ISPA |
| Kebakaran industri | radius evakuasi, pengungsi, korban jiwa dan luka |

**Varian (c), bencana sosial** (kerusuhan dan konflik sosial). Kartu kualitatif tanpa
proyeksi korban: pemicu dan pola kejadian terdokumentasi, batas mandat (UU 7/2012; peran
BNPB pada dukungan logistik, pengungsian, dan pemulihan), kebutuhan respons dan pemulihan,
lembaga. Butir kemungkinan ditulis "tidak berlaku" beserta alasannya: kejadian sosial tidak
punya model peluang yang bisa diuji balik, dan proyeksi korbannya sensitif serta di luar
kepemimpinan BNPB.

Versi mini untuk PDF: kepala, kemungkinan (varian a), 4 baris kerusakan atau indikator,
angka kebijakan.

#### B5.12 Garis waktu prabencana, tanggap darurat, pascabencana

Tiga kolom sama lebar dipisah garis 0,75 pt, ketiganya bertint netral `#E6EAF0` dan
dibedakan ikon fase dan label (§B5.14): Prabencana, Tanggap darurat, Pascabencana (T10). Fase tidak
diberi warna tema supaya tidak bertabrakan dengan keluarga bencana (§B1.3); merah tetap
hanya untuk bahaya, dan kanon tidak memerahkan yang sedang ditangani. Tiap kolom: ikon fase,
3–5 aksi bernomor (nomor merujuk matriks rekomendasi), lembaga pemimpin. Di bawahnya pita
horizon tiga tingkat dengan legenda tetap: 100 hari, 2026–2027, 2028–2030 (`KEPUTUSAN.md` P4;
`kosakata.horizon` di `tema.json`, divalidasi generator).

Bab Grand Design dibuka satu halaman kerangka (BCG; SINTESIS P2): pilar, sasaran terukur, dan program
berkode dalam satu halaman berlatar putih. Kode program dipakai ulang di §B5.13, §B5.19, §B5.22, dan
§B5.29. Kajian air menurunkan tiap pilar menjadi aksi bernomor yang dibuka kotak "Dampak bila tidak
ditangani" (§B5.5) dan ditutup aksi 100 hari berlembaga (WS45; SINTESIS P3).

#### B5.13 Matriks rekomendasi

Dua baris per butir, supaya sel prosa tidak melipat 4–6 baris pada 9 pt di lebar 165 mm:

- Baris 1: No (lingkaran `navy` angka putih) | LANGKAH (judul tindakan ≤ 8 kata, ikon jenis
  aksi di depannya; D-31) | LEMBAGA (pemimpin pil `navy`, pendukung pil garis, chip berikon) |
  WAKTU (pil horizon: 100 hari, 2026–2027, 2028–2030).
- Baris 2, digabung selebar tabel: RINCIAN (satu kalimat rata kiri-kanan ±110 karakter:
  keadaan sekarang, yang kurang, mengapa penting), lalu INDIKATOR SELESAI (terukur) dan
  DASAR (data/regulasi) sebagai label Bold sebaris.

Jenis aksi (regulasi, data, infrastruktur, kapasitas, pembiayaan) dibedakan ikon (§B5.14),
bukan warna baru. Relasi antar butir ditulis "Butuh 03", "Membuka 05, 07". Dua kelompok:
internal BNPB dan lintas K/L. Satu daftar berurut prioritas; yang lain kategori dan disebut
begitu. Tiga rekomendasi teratas diberi sketsa langkah dan satu paragraf "Risiko
pelaksanaan".

Kolom DASAR memuat kode temuan lengkap dari halaman Pesan Kunci (§B5.26, mis. "Temuan B.2", selalu
dengan kata "Temuan") dan regulasi (D-27). Urgensi = horizon peta jalan: dibaca dari pil horizon di
kolom WAKTU (100 hari paling mendesak), tidak ditulis sebagai pil terpisah dan bukan kotak penilaian
bergambar (CCDR; SINTESIS P75). Matriks tegak, tidak diputar lanskap (WS45;
P76). Bila rekomendasi lebih dari 9, matriks didahului kisi prioritas §B5.28. Rincian per aktor
memakai chip aktor berikon diikuti 1–2 butir, bukan paragraf (NRR; P79). Rekomendasi berupa prosa
atau daftar pertanyaan tanpa penanggung jawab tidak dipakai (ADB, Deloitte, MGI; P87).

#### B5.14 Ikon

Satu sumber: SVG garis gaya Lucide (stroke 2, viewBox 24, ujung bulat) di registri ikon
`tema.json`, diwarnai ulang dari token saat render; PNG, gambar DOCX, dan HTML dibangkitkan
dari registri itu. Path set deck (`data/laporan-bnpb/harian-2026-10-23/ikon.mjs`: gempa,
api, banjir, tenda, rumah, orang, hati, kalender, sampah) dipakai ulang sebagai sumber SVG.
PNG `ik/*.png` deck tidak dipakai langsung: hanya lima warna (tanpa emas dan coklat) dan
tanpa glif gunung api, tsunami, longsor, kekeringan, virus, pabrik, atau tetes.

Ikon selalu di dalam lingkaran: ikon putih di lingkaran solid atau ikon berwarna di
lingkaran tint; ukuran ikon 55–62% diameter. Wajib di kepala panel, kartu angka, chip
lembaga, kepala tabel ringkasan.

Satu registri konsep → ikon, satu ikon satu arti (gerbang D-25):
- Jenis bencana §B1.3; komponen kajian air §B1.7.
- Orang/jiwa `users` (path `orang` deck); rumah/KK `house` (path `rumah` deck); tetes untuk
  air bersih dan air minum saja `droplet`; pengungsi path `tenda` deck.
- Fase: prabencana `shield-check`, tanggap darurat `siren`, pascabencana `hammer` (T10).
- Jenis aksi: regulasi `scale`, data `database`, infrastruktur `construction`, kapasitas
  `graduation-cap`, pembiayaan `banknote`.
- Arah naik/turun: segitiga vektor (§B1.5).

Ikon harfiah (air, api, gunung) sah karena itu domainnya; kiasan (tangga kolam renang,
kerang), gestur tangan, makhluk imut, emoji dilarang. `triangle-alert` hanya berarti
peringatan, tidak dipakai untuk jenis bencana. Lembaga ditampilkan dengan ikon, bukan logo;
logo hanya BNPB di header dan sampul. Baris total dampak kekeringan berikon rumah (KK),
orang (jiwa), tetes (liter dan tangki).

#### B5.15 Foto Commons beratribusi

Hanya foto nyata dari Wikimedia Commons (kandidat di `kandidat-foto-commons.csv`: lebar
≥ 1.000 px, CC/PD, tanpa NC/ND). Tanpa nomor urut di foto; keterangan foto berupa label
kategori dan waktu ("Banjir Demak, Maret 2024"). Atribusi di bawah foto: "Sumber:
Wikimedia Commons, <Pengarang>, <Lisensi>". Pemotongan dicatat di Lampiran Atribusi. Foto
hanya dipakai bila membawa informasi (lokasi, jenis kerusakan), paling banyak satu per
subbab. Foto tidak memuat korban yang wajahnya dapat dikenali, anak, jenazah, atau orang
terluka (etika kemanusiaan; UU 27/2022 tentang Pelindungan Data Pribadi); yang diutamakan
lanskap, infrastruktur, dan kegiatan.

#### B5.16 Catatan kaki

Bernomor per bab, 8 pt, untuk sumber angka di prosa yang tidak punya tabel/gambar, dan
untuk penjelasan "–". Sumber visual memakai baris "Sumber:", bukan catatan kaki.

#### B5.17 Pustaka (APA 7)

Letaknya sesudah bab terakhir dan sebelum Pembatas Lampiran (hitungan halaman: T9). Urut
abjad, inden gantung 1,25 cm, 10 pt. Lembaga sebagai pengarang ("Badan Nasional
Penanggulangan Bencana. (2025). *Judul*. URL"), tanggal akses untuk halaman yang berubah.
Data pihak ketiga mencantumkan lisensi (mis. "CC BY-NC 4.0") bila ada. Tanpa path internal
repo. Hanya sumber yang benar-benar dikutip.

#### B5.18 Daftar singkatan dan glosarium

Bagian depan memuat Daftar Singkatan saja (dua kolom, urut abjad). Definisi istilah ada di
lampiran Glosarium (Lampiran G kajian air, Lampiran H kajian mitigasi). Keduanya dibangkitkan
dari satu `data/kajian-bnpb/data/glosarium.json` (istilah baku, padanan terlarang,
singkatan, definisi, sumber), yang juga dibaca D-10.

#### B5.19 Tabel indikator

Kolom: Indikator | Baseline (nilai, tahun) | Target per horizon peta jalan (satu kolom per
horizon: 100 hari, 2026–2027, 2028–2030; §B5.12) | Sumber data | Lembaga. Indikator tanpa baseline ditulis "–" beralasan dan
masuk daftar permintaan data. Satu baris satu indikator terukur.

#### B5.20 Tabel instrumen hukum yang diusulkan

Kolom: Instrumen | Jenis (UU/PP/Perpres/Perban/Perkada) | Isi pokok | Pemrakarsa | Horizon.
Instrumen yang sudah ada dan perlu diubah diberi status (`KERANGKA.md` prinsip 8). Nomor
regulasi dicek ke korpus JDIH lokal sebelum ditulis.

#### B5.21 Diagram lapisan pembiayaan

Lapisan: DSP APBN, dana bersama (pooling fund), asuransi BMN, DAK, APBD; urutan tumpukan
mengikuti Bab Pembiayaan. Tiap lapisan: nama sumber, dasar hukum, pemicu pencairan, lembaga
pengelola. Tanpa nominal proyek (K6). Digambar sebagai diagram vektor B5.23.

#### B5.22 Matriks fase × jenis bencana

Baris jenis bencana berikon (§B1.3), kolom Prabencana | Tanggap darurat | Pascabencana bertint
netral (§B5.12). Tiap sel berisi aksi ≤ 2 baris dengan nomor rekomendasi, atau "tidak
berlaku: {alasan satu kalimat yang bisa dibantah}". Sel kosong dilarang.

#### B5.23 Diagram vektor

Kotak bergaris 0,75 pt `garis`, garis penghubung 0,75 pt `teks-2`, panah sebagai kepala
garis vektor (bukan karakter →), label 9 pt Roboto. Dibuat sebagai SVG lalu dirender ke PNG
skala 2 lewat Chromium headless seperti `peta.mjs`; teks SVG-nya ikut diperiksa gerbang
(§D). Dipakai untuk alur hulu–hilir kajian air (Bab 4), lapisan pembiayaan, dan alur
komando, ditambah
struktur indeks dan pohon indikator (UNICEF; SINTESIS P105), bagan kelembagaan dan aliran tanggung
jawab (WS45, MGI; P86), dan diagram konsep bertahap dengan fase bergaris putus (WDR; P107).

#### B5.24 Sampul belakang

Halaman terakhir, latar `navy` penuh: logo BNPB berwarna di bidang putih, "Badan Nasional
Penanggulangan Bencana", alamat Graha BNPB (Jl. Pramuka Kav. 38, Jakarta Timur 13120), Call
Center 117, www.bnpb.go.id, persuratan@bnpb.go.id. Tanpa header, footer, dan nomor.

#### B5.25 Kisi kesimpulan dan pita keputusan

Mengikuti pola kesimpulan dan pita arahan Paparan Presiden. Kisi 4 × 2 kotak putih bergaris, tiap
kotak satu kesimpulan berangka berikon, dipakai di PDF hlm 10 dan Bab Kesimpulan. Pita keputusan
selebar isi bertint api/aksi berlabel "KEPUTUSAN YANG DIMINTA", berisi 2–3 keputusan Kepala BNPB
beserta akibat tiap pilihan, dipakai di PDF hlm 2 (§A3.1) dan di Bab Kesimpulan di bawah kisi.

#### B5.26 Halaman Pesan Kunci

Halaman pertama Ringkasan Eksekutif DOCX dan halaman 2 PDF ringkas (WMO untuk ikon dalam lingkaran,
IPCC untuk kode bertingkat; SINTESIS P16, P18, P97). Isi: kalimat tesis (§A2) 12 pt Bold `navy`, lalu
6–8 temuan bernomor (D-30). Tiap temuan: lingkaran `navy` 9 mm berikon putih dari registri (§B5.14),
kode temuan Bold, satu temuan berangka paling banyak 3 baris dengan angka di depan, ditutup rujukan
"(Bab 5.2)" dan label keyakinan (§C6.2). Kode huruf = pertanyaan pimpinan §A2 (A, B, C), nomor urut
di dalamnya, selalu ditulis lengkap "Temuan A.1", "Temuan A.2"; bentuk telanjang "A.1" tidak dipakai
karena sama dengan nomor "Tabel A.1" di lampiran. Kode yang sama dipakai di kotak ringkasan bab,
kolom DASAR §B5.13, dan subbab yang dirujuk (D-27). Di DOCX disusun sebagai tabel tak bergaris dua kolom,
bersudut tegak (§B3).

#### B5.27 Matriks risiko kemungkinan × dampak

Pola NRR (SINTESIS P62, G17), untuk profil ancaman kajian mitigasi. Kisi 5×5: kolom kemungkinan memakai
pita peluang 5 tahun §B5.11 (< 0,2%, 0,2–1%, 1–5%, 5–25%, > 25%), baris dampak 1–5 berlabel kata
(Ringan, Terbatas, Sedang, Berat, Sangat berat) dengan definisi di Metodologi. Semua sel bertint
`#E6EAF0` seragam, tanpa gradasi hijau-kuning-merah, supaya merah tetap hanya bahaya. Isi sel: nomor
ancaman dalam bulatan `navy` angka putih (gaya rumah d5), atau angka Bold polos dipisah koma bila
sel memuat lebih dari 3 nomor (NRR menulis nomor polos, sampai 11 per sel); daftar bernomor di samping dikelompokkan per keluarga
bencana berikon (§B1.3). Versi mini di tiap kartu skenario: satu titik posisi dengan garis silang
rentang kemungkinan dan dampak (rendah–tinggi). Posisi dibaca dari rumus Metodologi; posisi dari
penilaian pakar berpil "Penilaian pakar" (§C6.2).

#### B5.28 Kisi prioritas rekomendasi

Pola CCDR (SINTESIS P77, G18), dipakai bila rekomendasi lebih dari 9 (§B5.13). Kisi 3×3: kolom
horizon peta jalan (100 hari, 2026–2027, 2028–2030; urgensi = horizon), baris dampak (sedang, tinggi,
sangat tinggi). Sel berisi kode rekomendasi saja dalam pil `navy`, tanpa tint bertingkat; nama
rekomendasi di daftar samping urut kode; kunci penilaian di baris terakhir kisi (§B5.7). Tanpa gelembung berukuran dan tanpa
label bertumpuk (D-8).

#### B5.29 Tabel peta jalan tahap × tahun (hanya bila disetujui, T12)

Pola Deltaprogramma (SINTESIS P78, G23). Bawaan T12: tabel ini tidak dibuat; waktu ditulis sebagai
kolom WAKTU berpil horizon di matriks rekomendasi (§B5.13), mengikuti satu-satunya sinyal pemilik
(Gantt dibuang dari slide rekomendasi d5). Bila pemilik menyetujuinya, tabel dipasang hanya di DOCX
bab Peta Jalan. Kolom: Kode | Program | Pemimpin | satu kolom per tahun 2026–2030. Sel tahun berisi
pil tahap native: Kajian (pil garis `teks-3`), Perencanaan (pil garis `navy`), Pelaksanaan (pil `navy`
teks putih), Evaluasi (pil `#E6EAF0` teks `teks`); legenda tahap di baris terakhir tabel (§B5.7).
Tanpa batang Gantt bergambar. Tidak dipakai di deck dan PDF ringkas.

#### B5.30 Halaman studi kasus

Pola Deltaprogramma dan BCG (SINTESIS P69, P24, P70). Satu studi kasus satu halaman: pil "STUDI KASUS"
`navy`; judul berupa hasil berangka (fakta, angka, tempat, tahun); foto Commons beratribusi bila
membawa informasi (§B5.15); tabel dua kolom tak bergaris berlatar `#F3F5F8` dengan label Bold tetap
Masalah, Pelaksana, Cara, Hasil (D-30), isi paling banyak 3 baris per label; satu grafik kecil bila datanya
ada; "Sumber:" dan label keyakinan di kaki. Kalimat bergaya slogan di judul tidak dipakai (WMO, BCG;
P25).

#### B5.31 Kronologi regulasi

Pola CCDR (SINTESIS P85, G23). Tabel native tiga kolom: kartu regulasi kiri, tahun Bold di tengah,
kartu regulasi kanan, bergantian. Tiap kartu: kode jenis Bold (UU, PP, Perpres, Perban), nomor dan
tahun, satu baris isi pokok. Peristiwa kelembagaan (pembentukan BNPB, BPBD) ditulis sebagai label
pita kapital. Nomor regulasi dicek ke korpus JDIH lokal sebelum ditulis (§B5.20).

### B6. Peta web kajian

Halaman `public/kajian/<air|mitigasi>/` (T3) mengambil kerangka SVG sendiri dan muatan
bertingkat dari `public/bnpb/risiko.html`, tetapi tidak mewarisi tiga hal darinya: font
Google Fonts CDN (Inter, Plus Jakarta Sans), titik tengah di `<title>`, dan data
`risiko_kecamatan.json` (indeks komposit kecamatan yang dikeluarkan §A6). Peta web kajian
memakai Roboto yang disajikan sendiri dari repo, judul dan UI tanpa titik tengah, dan lapis
data IRBI per kab/kota dari `data/kajian-bnpb/data/`. Memakai token B1 dan legenda yang sama dengan PNG; tombol "unduh
PNG" yang memanggil perender yang sama. Lebar penuh dalam kontainer dan kartu, tanpa latar
abu tua; terang dan gelap; nama provinsi dalam pil yang cukup besar; legenda panjang
bergulir; panel pencarian jadi lembar bawah di HP; uji di 1440 dan 390 px. Muatan
bertingkat (ringkas dulu, geometri belakangan); klik tidak membekukan layar, simulasi berat
di Web Worker; satu lapis gagal tidak menghapus peta. Tooltip: pita judul + kolom label/
nilai, tanpa tanggal ISO mentah. Rincian wilayah dibuka di laci samping (Esc menutup),
tautan sumber tampil sebagai nama domain dan langsung terbuka. Tingkat peta: nasional →
pulau → provinsi → kab/kota. Basemap tidak dipakai (vektor batas wilayah saja); bila
perlu, OpenStreetMap. Gerbang D-1, D-2, D-3, D-4, D-9, D-10, dan D-16 juga dijalankan pada
HTML, CSS, dan JSON peta web.

### B7. Deck kajian

Deck PPTX per kajian (`KEPUTUSAN.md` P13–P14) memakai gaya rumah BNPB di Buku Pegangan bab Selera
presentasi (PPT): kerangka halaman, judul per jenis deck, palet, komponen, dan larangannya. Dari pola
laporan kelas dunia (SINTESIS), yang dibawa ke deck:

- Satu slide satu pesan; grafik dipilih dari tabel pilih grafik §B5.10 dan memakai PNG yang sama
  dengan DOCX (§A5).
- Halaman Pesan Kunci (§B5.26) menjadi slide pembuka sesudah sampul, dengan kode temuan yang sama.
- Matriks risiko (§B5.27), kisi prioritas (§B5.28), dan kartu skenario versi mini (§B5.11) boleh
  tampil sebagai slide utuh.
- Pil CUT OFF DATA di slide data menggantikan batas data di baris "Sumber:".

Yang tidak dibawa ke deck, karena keputusan pemilik untuk slide: baris sumber di bawah grafik
(dibuang di d5, "Keterangan jadi label"), Gantt dan tabel tahap × tahun §B5.29 (dibuang dari slide
rekomendasi d5), dan batas huruf 8 pt (slide memakai batas 6 pt Buku Pegangan).

Tabel Judul per jenis deck di Buku Pegangan belum punya baris untuk deck kajian (empat jenisnya:
Templat BNPB, Harian, Wilayah, Presiden). Bawaan T15: kalimat temuan ≤ 2 baris dengan angka `oranye`,
seperti Paparan Presiden lampiran, karena `KERANGKA.md` menyusun deck seperti Paparan Presiden.
Pola deck kelas dunia (McKinsey, BCG, Bain, Big Four) yang diminta `KEPUTUSAN.md` P16 belum dibedah:
folder `riset/desain-benchmark/deck/` sudah diunduh tetapi di luar cakupan SINTESIS (§15 berkas itu).
Sampai ada sintesis deck tersendiri, deck kajian mengikuti Buku Pegangan bab Selera presentasi.

---

## C. Bahasa, angka, integritas data

### C1. Suara dan register

- Bahasa Indonesia baku formal ilmiah, satu register per dokumen. Tidak menyapa pembaca
  (tanpa "kamu", "Anda"); kalimat tanpa kata ganti bila tidak perlu.
- Lugas: satu kalimat satu gagasan, angka kunci di depan. Paragraf analisis di DOCX boleh
  panjang, tetapi kalimat kunci tiap subbab tetap berangka di depan.
- Dilarang: personifikasi, slogan, kontras retoris "X bukan Y", "mulai besok",
  tiga-serangkai, kalimat penutup bergaya, kata pengisi (padanan "elevate", "seamless",
  "transformatif", "holistik", "sinergi" tanpa isi), kalimat yang terdengar seperti model
  berusaha bijak, basa-basi "ini peluang, bukan kepastian".
- Dampak ditulis sebagai skenario konkret: siapa, di mana, kapan, apa yang gagal.
- PDF ringkas dan kotak ringkasan ditulis berkerangka label (Temuan, Rekomendasi, Aksi),
  bukan blok paragraf.
- Data K/L lain diposisikan sebagai data lembaga itu, bukan posisi BNPB. Rincian teknis
  yang menjadi kewenangan K/L lain dirujuk, tidak diambil alih.
- Bila anggapan umum keliru, koreksi di awal bagian dengan dasar (kotak B5.5).
- Kalimat templat yang bertentangan dengan data dihapus.
- Tanpa emoji; tanpa em dash; tanpa titik tengah.

### C2. Judul dan kapitalisasi

| Unsur | Bentuk | Huruf |
| --- | --- | --- |
| Judul bab | frasa deskriptif yang stabil, tanpa angka yang berubah tiap pembaruan data, supaya Daftar Isi stabil ("PROFIL RISIKO MUSIM KEMARAU") | KAPITAL (T1) |
| Subbab, sub-subbab | frasa deskriptif yang stabil ("5.1 Sebaran Risiko Kekeringan") | kapital tiap kata menurut PUEBI (T1) |
| Keterangan tabel dan gambar | bawaan T14: frasa deskriptif yang stabil berisi besaran, tempat, periode, dan satuan dalam kurung ("Kejadian banjir per kabupaten/kota di Pulau Jawa, 2015–2025 (kejadian)"), tanpa angka hasil yang berubah tiap pembaruan data, supaya Daftar Tabel dan Daftar Gambar stabil; memuat tahun atau periode (D-31) | huruf kalimat |
| Kalimat pertama subbab dan paragraf yang merujuk objek | kalimat temuan berangka dari objek itu (angka, satuan, tempat, waktu), sebagai kalimat pembuka tebal bergaya Isi Temuan (§B2) | huruf kalimat |
| Label, pil, kolom, legenda | kata benda polos | huruf kalimat; kapital berspasi hanya pil bagian, kepala kolom, label pita (§B2); singkatan resmi tetap kapital |

- Angka kunci di judul PDF ≥ 14 pt boleh disorot `oranye` dan nama tempat `biru-lembaga`;
  di DOCX dan di teks < 14 pt cukup Bold.
- Judul deskriptif menang atas judul data mentah. Judul blok/kotak = nama bloknya
  (≤ 32 karakter), tanpa titik dua lalu keterangan.
- Judul paling banyak dua baris; bila tidak muat, perpendek, bukan turun baris ketiga dan
  bukan mengecilkan huruf, karena ukuran gaya Heading seragam (perbedaan dengan kanon
  dicatat di §0.3).
- Tanpa tanggal tempelan di judul blok bila periode sudah ditulis sekali di atas.

### C3. Istilah baku

Satu konsep satu istilah di seluruh teks (judul, kolom, legenda, isi, label peta). Istilah,
padanan terlarang, dan definisi hidup di `glosarium.json` (§B5.18).

| Pakai | Jangan |
| --- | --- |
| titik panas (deteksi satelit) | titik api; jumlah titik panas tidak sama dengan jumlah kebakaran |
| hitungan satelit (luas dari satelit), diberi catatan "Bukan luas resmi." | perkiraan satelit |
| provinsi yang sering mengalami {bencana} | N provinsi prioritas (kecuali status resmi BNPB yang memang bernama demikian, dikutip dengan sumbernya) |
| titik panas berada di dalam areal konsesi | tuduhan pembakar; nomor izin, kasus sanksi tidak ditulis; WALHI tidak dipakai sebagai kolom, angka, atau sumber |
| musim hujan | hujan pertama |
| prabencana, tanggap darurat, pascabencana (T10, UU 24/2007) | pra bencana, pra-bencana, "saat bencana" sebagai nama fase, campuran tanpa aturan |
| terpapar (penduduk di zona bahaya tanpa evakuasi) | korban (untuk angka paparan) |
| bahaya, keterpaparan, kerentanan, kapasitas, risiko | dipertukarkan |
| penurunan muka tanah | amblesan, subsiden, dicampur (istilah asing miring sekali di glosarium) |
| skenario terburuk yang masuk akal | skenario kiamat, worst case tanpa definisi |
| kab/kota (tabel), kabupaten/kota (kalimat) | campuran |
| Bali dan Nusa Tenggara | Bali–Nusa Tenggara (en dash hanya untuk rentang) |
| nama provinsi dan kab/kota menurut Kepmendagri kode wilayah terbaru (Sumatera Utara); nama pulau satu ejaan (Sumatra) | ejaan pulau dan provinsi dicampur |

Kosakata padanan per bencana (satuan deteksi, indeks bahaya, tingkat resmi, lembaga
lapangan, dampak, musim) mengikuti tabel padanan `docs/multi-bencana/COPYWRITING.md` §5
(salinan di repo dari Rencana Multi-Bencana, terbaca generator dan QA); pola kalimat
tetap, kolom padanannya yang diganti. Istilah dan ambang resmi (kelas HTH, SPI, level
gunung api, status peringatan) dicocokkan ke halaman lembaga sebelum dipakai. Besaran
berbeda definisi (sumber daya vs cadangan, bahaya vs risiko vs kejadian) tidak dijumlah
atau dibandingkan; dasar hitung selalu ditulis.

### C4. Angka dan satuan

- Format id-ID lewat satu fungsi: titik ribuan, koma desimal, paling banyak 1 desimal
  (koordinat dan kinerja model boleh lebih bila sumbernya begitu; data resmi lembaga apa
  adanya sesuai presisi sumber); persen ribuan bertitik (+1.244%); persen paling banyak
  1 desimal, desimal seragam per kolom tabel; kolom persen yang harus berjumlah 100
  dibulatkan metode sisa terbesar; penyebut nol = sel kosong, bukan "0%"; tidak pernah "-0".
- Satuan selalu tertulis (jiwa, KK, ha, km², m³, m³/detik, liter/orang/hari, mm, mm/hari,
  hari tanpa hujan, °C, µg/m³, magnitudo "M 8,5" (atau Mw bila sumbernya begitu), MMI,
  cm/tahun). Satuan seragam naik ke kepala kolom;
  satuan campur jadi kolom Satuan.
- Kalimat memakai "ribu/juta/miliar/triliun"; "rb/jt" hanya di label sempit, dipisah
  spasi ("2,6 jt"); angka di tabel dan kartu ditulis penuh. Miliar dan triliun selalu
  ditulis kata, termasuk di label; bentuk ringkas "M" dan "T" dilarang karena "M" berarti
  magnitudo. Rupiah besar dalam miliar atau
  triliun lewat satu fungsi format. Cacah kecil di awal kalimat dieja.
- Simbol: arah dengan ikon vektor atau kata (§B1.5), ± ketidakpastian, ≤/≥ ambang, "<"
  berspasi, × rasio; tiap simbol harus ada di cmap Roboto (D-23). En dash hanya
  untuk rentang ("2015–2025", "1.200–4.800 jiwa") dan sel kosong ("–").
- Pembulatan sekali, setengah ke atas, di akhir hitungan. Satu aturan pembulatan per
  jenis sumber, ditulis di Bab Metodologi:

| Jenis angka | Aturan |
| --- | --- |
| Data resmi lembaga | apa adanya, sesuai presisi sumber |
| Hitungan titik panas, kejadian | persis, tanpa ± |
| Luas dari satelit | dibulatkan sesuai resolusi piksel, tanpa ± |
| Estimasi model/simulasi | rentang rendah–tinggi, dibulatkan 2 angka bermakna, diawali "sekitar" bila satu angka |
| Peluang | kelas atau dibulatkan kasar; nilai kecil "< 1%"; tidak pernah "100%" |
| Kinerja model (POD, FAR, CSI) | dibaca dari JSON uji, tidak diketik tangan |

- Perbandingan antar wilayah dinormalkan (per 100.000 penduduk atau per km²) dengan angka
  mutlak di kurung; pembaginya satu untuk seluruh dokumen.
- Skor gabungan tidak tampil telanjang: komponen dan bobotnya ada di tabel yang sama atau
  lampiran yang dirujuk. Bahaya ekstrem tunggal (zona megathrust, KRB III) menentukan
  kelas minimum dan tidak boleh tertutup rata-rata.
- Selain yang terburuk, sorot yang paling cepat memburuk dan yang paling membaik.
- Ketidakpastian dinyatakan eksplisit dengan besarnya dan sebabnya (di metode dan catatan
  tabel, bukan di kartu angka).

### C5. Tanggal dan waktu

- Judul dan kalimat: bulan penuh ("22 Oktober 2026"), karena dokumen formal (K13). Bentuk
  singkat ("22 Okt 2026") hanya di tabel, grafik, label, dan pil; tahun dua digit hanya di
  tabel lampiran yang sangat padat. Rentang dengan en dash ("15–22 Oktober", "15–22 Okt").
- Jam dengan titik dan zona: "23.00 WIB"; jam kejadian lokal di luar WIB boleh memakai
  zonanya (WITA, WIT). Agregasi harian nasional memakai hari kalender WIB penuh
  (00.00–23.59 WIB), tidak dijumlah lintas hari; cut-off ditulis apa adanya.
- Tanpa tanggal ISO mentah. Tanggal di sampul = tanggal terbit; tanggal di kolom/sumber =
  tanggal data. Tiap dataset menyebut cut-off sendiri; dua cap waktu bila sumbernya berbeda.
- Data hari berjalan diberi tanda "sementara" beserta jam tarik. Data basi diberi label
  umurnya, tidak ditampilkan seolah segar. Tahun berbeda tidak dicampur dalam satu
  indikator.

### C6. Integritas sumber

#### C6.1 Hierarki bukti

1. Status dan angka resmi lembaga (IRBI/InaRISK, DIBI, BMKG, PVMBG, PuSGeN, Badan
   Geologi, Kementerian PU, BPS, dokumen PDNA/R3P) ditampilkan lebih dulu, apa adanya,
   berlabel lembaga dan waktu terbit.
2. Sumber primer non-resmi terverifikasi (jurnal, data terbuka internasional).
3. Keluaran platform Pantau Bencana: pendukung, selalu berlabel, tidak pernah menimpa
   status resmi, diberi nama berbeda dari indeks resmi.
4. Sumber sekunder (media, ringkasan): hanya di draf dengan catatan "perlu verifikasi";
   tidak masuk naskah final sebelum dicocokkan ke dokumen primernya (aturan riset C).

Pengecualian karhutla (vonis pemilik 23 Okt: *"Karhutla udah pasti pakai data kita"*):
titik panas dan luas hitungan satelit dari Pantau Bencana (FIRMS) menjadi sumber utama,
berdampingan dengan luas resmi Kemenhut (SiPongi) berlabel Resmi; luas platform selalu
diberi catatan "Bukan luas resmi.". Fakta lapangan (status, korban, operasi) dari laporan
BPBD atau Koordalops.

#### C6.2 Label tingkat keyakinan

Wajib di tiap tabel (baris sumber atau per baris), kartu angka, dan kartu skenario.

| Label | Arti | Tampilan |
| --- | --- | --- |
| Resmi | Diterbitkan lembaga pemerintah berwenang | pil `navy` teks putih |
| Terverifikasi | Sumber primer non-resmi, dibaca langsung | pil garis `slate`, teks `teks` |
| Estimasi model | Keluaran model/simulasi; ditambah "belum diuji balik" atau "uji balik gagal" bila begitu | pil garis `oranye`, teks `teks` |
| Asumsi kebijakan | Nilai pilihan (VSL, biaya pengungsi per hari, stimulan sebagai batas bawah) | pil garis `teks-3` |
| Penilaian pakar | Posisi atau kelas hasil penilaian analis atau pakar, bukan rumus atau model (posisi matriks risiko §B5.27, bara risiko §B5.10) | pil garis `teks-3`, dibedakan dari Asumsi kebijakan oleh teksnya |

`KERANGKA.md` prinsip 4 masih menyebut empat label; label kelima ditambahkan di sini karena posisi
hasil penilaian tidak masuk satu pun dari empat label itu (§0.3). `kosakata.keyakinan` di `tema.json`
perlu entri `penilaian-pakar` sebelum generator menerimanya.

Tambahan di teks: kalimat bertanda "fakta" (diverifikasi langsung) atau "penilaian"
(pendapat analis yang bisa dibantah) di kotak temuan. Angka ilustrasi/contoh berlabel
"contoh" dan tidak dicampur dengan data observasi.

#### C6.3 Aturan model dan simulasi

- Vonis model wajib mengalahkan semua pembanding bermakna (acak, persistensi, peta bahaya
  statis, jumlah penduduk/bangunan) pada seri yang dipecah netral per waktu. Kalah = label
  "belum lulus", bukan disembunyikan.
- Kinerja tercatat dikutip apa adanya termasuk yang gagal, dibaca dari berkas ujinya saat
  build dan tidak diketik, baik di naskah maupun di pedoman ini:
  `public/data/kekeringan_ujibalik.json` (uji ambang SPI dan uji kejadian DIBI),
  `public/banjir/data/validasi.json` (banjir dan longsor),
  `public/banjir/data/risiko_ujibalik.json`, berkas uji gempa yang dirujuk `riset/D`, dan
  tabel Kinerja yang tercatat di Buku Pegangan (replay banjir, indeks kebakaran permukiman
  DKI, peluang "akan membesar" yang disembunyikan).
- Kekeringan punya dua uji dengan angka berbeda. Tabel rekonsiliasi Bab Metodologi wajib
  memuat baris "kinerja kekeringan: uji ambang SPI vs uji kejadian" dengan kedua angka,
  periode, dan pembandingnya.
- Udara: "perkiraan model CAMS, belum dikoreksi". Kekeringan Awas butuh dua bukti. OMC
  dievaluasi dengan kontrol dan plasebo, bukan klaim sebab-akibat. Peringatan dari berita
  "dari berita, belum diverifikasi"; peringatan ke depan wajib sumber resmi.
- Klasifikasi risiko hanya dari rumus tertulis di Metodologi; tidak ada tingkat yang tidak
  bisa dijelaskan rumusnya.
- Wilayah dengan kelengkapan data di bawah ambang tertulis tidak diberi skor; ditandai
  "data tidak cukup" (arsir), tidak dibaca sebagai risiko rendah.
- Angka model bahasa: model AI hanya menulis narasi; semua angka dari skrip deterministik
  yang bisa diulang.

#### C6.4 Pola bab/lampiran metode

Singkatnya (tanpa jargon, diakhiri catatan jujur) → Alurnya (Langkah 1…n) → Contoh dengan
data nyata → Rincian teknis → Batasan. Batasan model hanya di sini, tidak di kartu angka.

#### C6.5 Sumber dan lisensi

- Tiap sumber data dicatat sebelum dipakai: URL, format, frekuensi, lisensi/izin tayang
  ulang, status [OK]/[AUTH]/[BLOK]/[BV]. Yang [BV] tidak dibangun sebelum diambil sekali.
- Lisensi pihak ketiga tampil bila dipakai; lapisan berlisensi tertutup tidak tayang.
  InaRISK: "Sumber: InaRISK BNPB".
- Baris "Sumber:" menyebut lembaga/sistem dan periode, tanpa path internal
  (contoh: "Sumber: Pengolahan data Pantau Bencana dari IRBI BNPB 2025").
- Lambang dan logo resmi tidak digambar ulang.
- Konflik angka antar sumber ditampilkan berdampingan di tabel rekonsiliasi, bukan dipilih
  diam-diam.
- Klaim penyusunan yang terbantah selama kerja dicatat di Lampiran Metode (catatan revisi),
  tidak dihapus.

### C7. Konsistensi angka

Angka yang sama tampil sama di judul, kartu, tabel, peta, teks, PDF, DOCX, dan web, karena
dibaca dari satu JSON. Hitungan di judul = jumlah baris daftar = jumlah penanda di peta.
Kohort tidak dicampur dengan total. Gerbang D-6 memeriksa.

### C8. Larangan klaim

- Tidak ada angka tanpa sumber dan tahun. Baris tanpa sumber tidak tampil.
- Tidak ada klaim yang sumber primernya [TIDAK DITEMUKAN] (mis. "US$1 pencegahan hemat
  US$15").
- Tidak ada presisi palsu: estimasi model ditulis rentang.
- Tidak ada angka kerugian penuh per kab bila PDRB/aset per kab belum ada; yang ada ditulis
  sebagai batas bawah.
- Tidak menurunkan angka per kab dari kutipan per kota (penurunan muka tanah).
- Tidak menyebut biaya proyek (K6).
- Tidak menyatakan sebab-akibat dari korelasi.

---

## D. Gerbang QA sebelum kirim

Aturan tanpa gerbang mekanis dianggap belum jadi. Gerbang dibangun sebelum naskah ditulis
(`data/kajian-bnpb/qa/periksa.py`; pemiliknya `pipa-data` menurut `ilmu.mjs pemilik`,
atau `penulis-gerbang` bila ujinya ditaruh di `tests/agen/`), dijalankan pada tiap build,
dan berhenti pada temuan pertama. Satu butir gagal = belum selesai.

Status 23 Okt 2026: D-1 sampai D-32 baru dirancang, belum dibangun. `qa/periksa.py`,
`qa/fixtures/`, dan `qa/cakupan.json` belum ada. Sampai ada, tiap aturan bergerbang di pedoman ini
berstatus belum jadi menurut standar uji pemilik; langkah pertama pembangunannya adalah
`qa/cakupan.json` dengan D-1 sampai D-32 di `antre`.

Standar uji pemilik berlaku:
- **Fixture negatif per gerbang**: `qa/fixtures/` berisi satu berkas gagal per kode (DOCX,
  SVG, atau HTML kecil yang sengaja melanggar). Gerbang yang tidak menolak fixture-nya
  dianggap rusak. Pola yang punya pengecualian (D-16) membawa fixture positif dan negatif.
- **Registri cakupan** `qa/cakupan.json` dengan tiga daftar: `diuji`, `dikecualikan`
  (berikut alasan), `antre`. Aturan baru di pedoman masuk salah satu dari dua yang pertama;
  `antre` hanya boleh menyusut.
- **Pesan gagal** menyebut kode, berkas, lokasi (halaman, paragraf, atau objek), nilai yang
  ditemukan, ambang, dan sebab teknisnya, mis. `D-5 lengkap.docx p.412: w:sz=14 (7 pt) < 16
  (8 pt), gaya "Catatan tabel"`.
- **Cakupan berkas**: D-1, D-2, D-3, D-10, dan D-16 dijalankan pada `word/document.xml`,
  footnotes, headers, `pdftotext`, SVG sumber tiap PNG (label, legenda, judul), serta HTML
  dan JSON PDF ringkas dan peta web.

### D1. Gerbang mekanis

| Kode | Pemeriksaan | Cara |
| --- | --- | --- |
| D-1 | Em dash nol | hitung U+2014 = 0 pada semua berkas cakupan |
| D-2 | Titik tengah nol | idem untuk U+00B7 (dengan atau tanpa spasi), termasuk `<title>` HTML |
| D-3 | Emoji nol | regex rentang emoji Unicode = 0 |
| D-4 | Font hanya Roboto | `w:rFonts`, `theme1.xml`, `numbering.xml` (font butir), `pdffonts`, dan `font-family`/`@font-face` CSS: hanya keluarga Roboto; tanpa URL font CDN |
| D-5 | Huruf terkecil ≥ 8 pt | semua `w:sz` ≥ 16 (half-point); ukuran teks di PNG dicek dari SVG sumber |
| D-6 | Angka silang | angka kunci dan kalimat `tesis` di `angka-kunci.json` dicari di teks DOCX, PDF, dan JSON web; semua sama; tesis identik di PDF hlm 2, kalimat pertama Ringkasan Eksekutif, dan Bab Kesimpulan; baris Jumlah = jumlah baris tampil; subtotal = total; hitungan judul = jumlah baris |
| D-7 | Tiap Gambar dan Tabel bernomor, berurutan, tanpa nomor ganda atau loncat, punya baris "Sumber:" sebagai paragraf pertama sesudah objek, masuk Daftar Tabel/Gambar; legenda tabel berada di baris terakhir tabel (§B5.7) | parse Caption + paragraf sesudah objek; fixture tabel berlegenda di baris terakhir (lolos) dan tabel dengan paragraf legenda di antara tabel dan "Sumber:" (gagal) |
| D-8 | Peta: legenda ada (manifest render `legenda: true`), tidak ada irisan kotak label/bulatan/badge, nama provinsi ≥ 8 pt, unsur peta resmi tercatat (sumber batas, sistem referensi, proyeksi, inset untuk peta pulau/provinsi, catatan batas tidak resmi bila berlaku) | perender peta menulis bounding box dan unsur peta ke manifest; uji irisan dan kelengkapan |
| D-9 | Hex di luar `tema.json` nol | daftar putih: tiap hex di DOCX, SVG, HTML, CSS, dan JSON gaya ada di `tema.json`; §B1.6 jadi fixture negatif |
| D-10 | Istilah terlarang nol | daftar dari `glosarium.json`: "titik api", "perkiraan satelit", "provinsi prioritas" (kecuali kutipan resmi bertanda), "hujan pertama", "kamu", "Anda", "100%" pada peluang, "pra bencana", "pra-bencana", "subsiden", "amblesan", "Bali–Nusa Tenggara", "[SEKUNDER]", "TIDAK DITEMUKAN" |
| D-11 | Kapital penuh | paragraf bergaya Heading 2 ke bawah dan isi tanpa kapital penuh, kecuali daftar singkatan resmi dan gaya yang dikecualikan (kepala kolom, pil, label pita, Heading 1, judul bagian depan; T1) |
| D-12 | Panjang | halaman isi DOCX hasil soffice dari Bab 1 sampai sebelum judul Daftar Pustaka (T9): kajian air ≤ 104 (110 dikurangi 5% untuk beda paginasi Word), kajian mitigasi ≤ 142 (150 dikurangi 5%); PDF ringkas ≤ 10 |
| D-13 | Penomoran | sampul tanpa nomor; romawi di bagian depan; Bab 1 = 1; bidang TOC, Daftar Tabel/Gambar/Lampiran, dan Caption ada dan hasilnya terisi (indeks diperbarui lewat UNO, §B4); `w:updateFields` aktif |
| D-14 | Label keyakinan | tiap tabel dan kartu skenario punya salah satu dari lima label §C6.2 (Resmi, Terverifikasi, Estimasi model, Asumsi kebijakan, Penilaian pakar); pil di luar daftar itu ditolak |
| D-15 | Atribusi foto | tiap gambar foto punya baris "Wikimedia Commons, pengarang, lisensi" dan entri di Lampiran Atribusi; lisensi bukan NC/ND |
| D-16 | Format angka | tolak `\d,\d{3}\b`, `\d\.\d{1,2}\b`, tanggal ISO, dan jam bertitik dua. Dikecualikan: gaya Heading, Caption, dan TOC; pola `(Tabel\|Gambar\|Bab\|Lampiran) \d+(\.\d+)*`; nomor subbab di awal paragraf; jam `\b\d{2}\.\d{2} (WIB\|WITA\|WIT)\b`; angka kinerja model yang tercatat di manifest injeksi. Tiap pola dan pengecualian punya fixture |
| D-17 | Judul ≤ 2 baris, tanpa "…" terpotong | ukur dari render PDF (pdfplumber) |
| D-18 | Invarian wilayah | jumlah kab per provinsi sesuai katalog; dua digit pertama kode kab = kode provinsi; 38 provinsi, 514 kab/kota, 119 kab/kota Jawa lengkap di lampiran |
| D-19 | Pustaka | tiap entri dikutip di teks dan sebaliknya; tanpa path internal |
| D-20 | Standar tabel | tiap tabel data: `w:tblHeader` di baris kepala, isi kepala `navy` (tabel lampiran: tanpa isi, garis bawah 1 pt), angka rata kanan, tanpa garis vertikal, tanpa pita selang-seling; parse `w:tbl` |
| D-21 | Legenda grafik | tiap PNG grafik punya manifest `legenda: true` dan entri legenda = seri dan warna yang tergambar |
| D-22 | Angka ketikan nol | tiap angka di `document.xml` ada di manifest injeksi, kecuali tahun, nomor bab/tabel/gambar/lampiran, nomor halaman, dan nomor regulasi |
| D-23 | Glif di luar Roboto nol | tiap karakter di `document.xml`, footnotes, headers, SVG, dan HTML ada di cmap berkas Roboto yang dipakai (▲ U+25B2, ▼ U+25BC, → U+2192, ◦, ▪, ✓ tidak ada) |
| D-24 | Satu hex satu arti per halaman | tidak ada hex yang tercatat dalam dua peran (kategori, skala, aksen, permukaan) pada satu halaman; dibaca dari `manifest.json` generator (§B1.8) |
| D-25 | Satu ikon satu arti | tiap konsep di registri ikon `tema.json` punya glif unik; tiap ikon di keluaran berasal dari registri |
| D-26 | Kalimat pembuka tebal | tiap paragraf bergaya "Isi Temuan" (§B2) dibuka run Bold yang memuat angka; kalimat Bold itu ≤ 2 baris pada render; semua paragraf isi Bab 4–7 kajian air dan Bab 4–10 kajian mitigasi bergaya Isi Temuan, sehingga gerbang tidak bisa dihindari dengan memakai gaya Isi | parse `w:p` per bagian; panjang baris dari pdfplumber |
| D-27 | Temuan dan rekomendasi bertaut | token `Temuan [A-C]\.\d+` dibaca dari semua paragraf kecuali gaya Caption dan Judul Lampiran; tiap kode di halaman Pesan Kunci muncul lagi di paragraf Ringkasan Eksekutif sesudah halaman Pesan Kunci dan di subbab yang dirujuknya ("Bab x.y"); tiap baris rekomendasi §B5.13 memuat "Dasar:" dengan ≥ 1 kode temuan yang ada; tidak ada kode temuan yatim; fixture berisi "Tabel A.1" dan "Gambar B.2" di lampiran harus lolos tanpa dihitung sebagai temuan | parse teks DOCX dan HTML PDF ringkas |
| D-28 | Pilih grafik | manifest tiap PNG grafik mencatat `pesan` (G1–G24) dan `jenis`, atau alasan bila di luar tabel; pasangan `pesan` dan `jenis` dicocokkan ke kolom Grafik tabel pilih grafik §B5.10 (G1 batang tegak, G2 batang per dekade atau garis, G4 dan G5 batang horizontal, G6 dumbbell, G19 koroplet, G20 simbol sebanding, dan seterusnya) dan pasangan lain ditolak; manifest peta mencatat `besaran` (rasio, indeks, total) dan koroplet untuk total ditolak; `anotasi` ≤ 3; jenis G25 ditolak; batang lebih dari 24 tanpa diringkas ditolak; batang bertumpuk lebih dari 5 segmen ditolak; sumbu Y pada batang ditolak; pil kanan atas ≤ 1 | manifest render grafik |
| D-29 | Peta kecil berganda | panel dalam satu kelompok berbagi `kelas`, `skala`, dan satu `legenda` yang identik | manifest render peta |
| D-30 | Pesan Kunci dan studi kasus | halaman Pesan Kunci memuat 6–8 temuan, tiap temuan ≤ 3 baris pada render; tiap halaman studi kasus memuat tepat empat label Masalah, Pelaksana, Cara, Hasil | parse DOCX dan HTML PDF ringkas; panjang baris dari pdfplumber |
| D-31 | Rekomendasi dan keterangan | kolom LANGKAH matriks rekomendasi ≤ 8 kata; tiap keterangan Gambar dan Tabel memuat tahun atau periode (`\d{4}`) | parse tabel §B5.13 dan paragraf Caption |
| D-32 | Catatan grafik | paragraf "Catatan:" sesudah "Sumber:" paling banyak satu baris pada render dan 120 karakter | parse paragraf sesudah objek; panjang baris dari pdfplumber |

### D2. Gerbang visual (manusia/agent membaca)

1. Render: DOCX dengan `soffice --headless --convert-to pdf` sesudah indeks diperbarui,
   PDF ringkas dengan Chromium headless, lalu `pdftoppm -r 110 -png`.
2. Baca setiap PNG halaman, bukan sampel. Laporan "sudah rapi" tanpa melihat PNG tidak
   dihitung sebagai bukti.
3. Daftar periksa per halaman: tidak ada teks turun baris tak sengaja, tumpang tindih,
   isi menempel ke tepi panel, garis footer pendek, ruang putih menganga, tabel lanjutan
   yang hanya berisi sisa sedikit baris, penunjuk halaman lampiran salah, data basi tanpa
   tanda, setiap warna berlegenda.
4. Per bab, kalimat Bold pembuka paragraf dibaca berurutan tanpa isi lainnya; bila alur bab tidak
   terbaca dari kalimat itu saja, kalimat pembukanya ditulis ulang (SINTESIS P17).
5. Peta web dibuka di 1440 dan 390 px dan dibandingkan dengan PNG.

### D3. Proses kerja

- Grand design dan halaman contoh (satu halaman per komponen B5) disetujui pemilik dulu,
  lalu produksi mengikuti contoh itu.
- Opus merencanakan dan memegang kontrak (pedoman ini, kerangka, tesis); Sonnet menulis bab
  dan membangun generator; Haiku menjalankan pemeriksaan pola. Pemeriksa adalah subagent
  baru berkonteks bersih, bukan penulis babnya; hasil agent dibaca sendiri, laporan agent
  bukan bukti.
- Perubahan pada satu kembaran (PDF/DOCX/web, atau kajian air/mitigasi) ikut ke semua
  kembarannya.
- Pedoman ini bila diterbitkan sebagai artifact diterbitkan ulang ke URL yang sama.
- Subagent tidak commit, push, atau deploy; pengiriman ke Kepala BNPB diputuskan pemilik.
- Definisi selesai: semua D1 lolos, D2 dibaca seluruhnya, angka kunci diverifikasi oleh
  pemeriksa terpisah, dan laporan akhir menyebut apa yang belum.

---

## E. Tabel keterlacakan kriteria artifact

Setiap kriteria hasil sisir 22 artifact pemilik dipetakan ke bagian pedoman yang
menampungnya, atau alasan tidak dipakai. Status: **L** = langsung, **A** = adaptasi,
**T** = tidak dipakai. Bila status di sini berbeda dari hasil sisir, alasannya di kolom
Catatan.

Kode asal:

| Kode | Judul artifact |
| --- | --- |
| BPB | Buku Pegangan Pantau Bencana (poskokarhutla), disegarkan 23 Okt 2026, commit 2ce5dc44 |
| PDK | Pedoman Deck Karhutla BNPB (Claude Docs 3f1d0527, rev 10) |
| RMB | Rencana Multi-Bencana (artifact 3874ecce) |
| PP38 | Papan Pantau 38 Provinsi (artifact 2c3708ce) |
| BPU | Buku Pegangan Utama |
| BWI | Buku Pegangan Worth It |
| BBS | Buku Pegangan Betutu Sambe |
| BGR | Buku Pegangan Gemah Ripah |
| MB26 | Buku Pegangan Tim MBG Bangka (versi 26 Sep 2026, b659bf9e) |
| MB09 | Buku Pegangan Tim MBG Bangka (versi 9 Sep 2026, 49177831) dan salinannya (a59ca27a) |
| KKM | Kesiapan Komersial MBG Bangka (audit 27 Agustus 2026) |
| J29 | Jalan ke 29.658 Dapur (Rantai Pasok SPPG × KDMP) |
| PBK | Peta Bangun KDMP Babel |
| KJK | Kesiapan Jalan KDMP Babel |
| PDP | Panduan Deploy KDMP |
| AMP | Audit Maksimal Pra-Deploy |
| ATM | Audit Teknis MBG KDMP |
| KNG | Keynote Speech Norman Ginting (METI) (Claude Docs 9085644b) |
| NPA | Neraca Papua (artifact 2cd95d36) |
| MKL | Mesin Klip (artifact 20182ebd) |
| SPG | Slip Gaji Nol PPh 21 (artifact 73907b23) |
| SIN | Sintesis 22 laporan kelas dunia (`riset/desain-benchmark/SINTESIS.md`, 23 Okt 2026) |

Jumlah: 506 kriteria dari 21 kode asal (22 artifact; MB09 mewakili dua salinan
identik). Langsung 242, adaptasi 235, tidak dipakai 29. Delapan status diubah dari hasil
sisir karena bertabrakan dengan kanon proyek atau keputusan yang lebih baru (No 116, 199,
214, 233, 258, 280, 301, 302). Lima lagi diubah dari L ke A di v1.1 karena pedoman kini
menyimpang dari bentuk aslinya dengan alasan yang dicatat di §0.3 (No 42, 47, 55, 89,
114).
Ditambah 110 kriteria dari SIN (No 507–616): langsung 35, adaptasi 54, tidak dipakai 21 (dihitung
ulang sesudah tinjauan 23 Okt: No 512, 522, 555, 610 dari L ke A; No 557 dari A ke T).

| No | Asal | Kriteria | St | Bagian | Catatan |
| --- | --- | --- | --- | --- | --- |
| 1 | BPB | Buku tunggal: riwayat bertanggal, tabel Diputus/Belum diputus, lalu bab aturan | A | §0.2, §0.3 | Dipakai untuk pedoman ini, bukan isi kajian |
| 2 | BPB | Artifact pedoman diterbitkan ulang ke URL yang sama | L | §D3 | Juga peta web kajian |
| 3 | BPB | Judul = fakta + angka + sumber; tanpa personifikasi, slogan, kontras "X bukan Y", tiga-serangkai | L | §C1, §C2, §A2 | |
| 4 | BPB | Suara polos faktual, satu baris satu temuan, angka di depan, tanpa emoji | L | §C1 | |
| 5 | BPB | Titik tengah dilarang di semua teks tampil, grep = 0 | L | §C1, D-2 | |
| 6 | BPB | Em dash dilarang; en dash hanya rentang dan angka kosong | L | §C4, D-1 | |
| 7 | BPB | Sapaan pembaca "kamu" | T | §C1 | Kajian formal tidak menyapa; D-10 menolak "kamu" |
| 8 | BPB | "Titik panas", "hitungan satelit", larangan "perkiraan satelit", catatan "Bukan luas resmi." | L | §C3, D-10 | |
| 9 | BPB | "Provinsi yang sering mengalami karhutla", bukan "9 provinsi prioritas" | L | §C3, D-10 | |
| 10 | BPB | Bahasa konsesi netral; tanpa nomor izin, sanksi, WALHI | L | §C3 | |
| 11 | BPB | Format id-ID, paling banyak 1 desimal, "–" bila kosong, persen ribuan bertitik | L | §C4, D-16 | |
| 12 | BPB | Satuan selalu tertulis; rb/jt hanya label sempit; rupiah besar dalam miliar | L | §C4 | |
| 13 | BPB | Tiap angka punya sumber dan waktu; tanpa path internal | L | §C6.5, §B5.7 | |
| 14 | BPB | Pembulatan jujur: probabilitas kasar, luas sesuai piksel, model "sekitar", kinerja dari JSON | L | §C4 tabel pembulatan | |
| 15 | BPB | Peluang kecil "<1%", tidak pernah "100%"; batasan di bab Metode | A | §C4, §C6.4, §B5.11 | Kartu peluang situs tidak dipakai |
| 16 | BPB | Angka belum lulus uji balik berlabel "hipotesis"/"belum diuji balik" | L | §C6.2 | Label "Estimasi model, belum diuji balik" |
| 17 | BPB | Model wajib mengalahkan semua pembanding; kalah = "belum lulus" | L | §C6.3 | |
| 18 | BPB | Status resmi lembaga didahulukan, indeks sendiri tidak menimpa | L | §C6.1, K8 | |
| 19 | BPB | Kinerja model tercatat dikutip apa adanya termasuk yang gagal | L | §C6.3 | Dibaca dari berkas uji, tidak diketik; dua uji kekeringan direkonsiliasi |
| 20 | BPB | Udara "perkiraan model CAMS", kekeringan Awas dua bukti, OMC kontrol dan plasebo, berita belum diverifikasi | L | §C6.3 | |
| 21 | BPB | Angka sama di judul, KPI, daftar, ikon, peta; subtotal ke total; kohort tidak dicampur | L | §C7, §A5, D-6 | |
| 22 | BPB | Data karhutla dari website sendiri, fakta lapangan dari BPBD/Koordalops | A | §C6.1 pengecualian karhutla, §A5 | Berdampingan dengan luas resmi SiPongi; kajian air menambah sumber PU/BBWS, BMKG |
| 23 | BPB | Tanggal: bulan penuh di judul, singkat di isi, rentang en dash, jam titik WIB, tanpa ISO | L | §C5, D-16 | |
| 24 | BPB | Pembulatan berbeda per jenis sumber | A | §C4 tabel pembulatan | Tabel sendiri per sumber |
| 25 | BPB | Hanya Roboto termasuk font tema; tanpa emoji | L | §B2, D-4, D-3 | |
| 26 | BPB | Batas bawah huruf 6 pt slide; kurangi baris, jangan ciutkan font | A | §B2, D-5 | Ambang A4 8 pt |
| 27 | BPB | Kapital berspasi hanya pil bagian, kepala kolom, label pita | L | §B2 | Dasar keputusan T1; spasi 80–100 |
| 28 | BPB | Skala ukuran slide (nilai 17 pt, panel 11 pt, label 7,5 pt) | A | §B2 | Rasio dipakai, ukuran A4 |
| 29 | BPB | Palet rumah BNPB berikut tint | L | §B1.1, §B1.2 | |
| 30 | BPB | Palet generator lama dilarang | L | §B1.6, D-9 | |
| 31 | BPB | Naik oranye, turun biru, 0% abu; di atas navy F2A35E/8EC5F5 | A | §B1.5, T2 | Peta web ikut oranye/biru (T2) |
| 32 | BPB | Merah hanya untuk perlu perhatian; satu skema per kategori per dokumen | L | §B1.1, §B1.4 | |
| 33 | BPB | Bencana berbeda ikon dan warna berbeda | A | §B1.3, T6 | Ikon berbeda per jenis; warna per keluarga (enam), karena warna per jenis gagal ΔE; dicatat §0.3 |
| 34 | BPB | Satu gaya rumah: kerangka BNPB (logo, garis 0,75 pt, footer, nomor bold kanan) | A | §B4 | Diterjemahkan ke header/footer A4 |
| 35 | BPB | Sampul dan penutup tanpa footer dan nomor | L | §B4, §B5.1, D-13 | |
| 36 | BPB | Padat tapi bernapas: 3–4 blok, jarak ≥ 7 pt ke tepi panel | A | §B3 | Untuk PDF ringkas dan kotak DOCX |
| 37 | BPB | Satu topik satu kontainer, tanpa panel gelap samping, tanpa ruang kosong | L | §B5.5, §B3 | |
| 38 | BPB | Paparan wilayah menyempit bertahap | A | §A4 butir 3 | Nasional, pulau, provinsi, kab/kota |
| 39 | BPB | Paparan Presiden: versi Utama dan Lengkap, pembatas Lampiran gelap, kode "A1." | A | §A3, §B5.2, §A3.4, §B5.25 | PDF ringkas vs DOCX; kode lampiran; kisi kesimpulan dan pita keputusan |
| 40 | BPB | Versi ringkas dibuat dengan memotong, tata letak tidak diubah | A | §A3 | |
| 41 | BPB | Tabel panjang "(lanjutan)", halaman sisa sedikit baris = cacat, ≤ 24 baris/slide | A | §B4 tabel lintas halaman | Kepala diulang; sisa ≥ 4 baris |
| 42 | BPB | Judul paling banyak dua baris | A | §C2, D-17 | Judul diperpendek, ukuran gaya Heading tetap (kanon: huruf dikecilkan); dicatat §0.3 |
| 43 | BPB | Judul kalimat deskriptif; angka oranye, tempat 00499D | L | §C2 | |
| 44 | BPB | Pakai label bukan kalimat; tiap panel berkepala, tiap warna berlegenda | L | §C1, §B5.9 | |
| 45 | BPB | "Musim hujan", bukan "hujan pertama" | L | §C3, D-10 | |
| 46 | BPB | Kartu angka putih bergaris, lingkaran ikon, dikelompokkan bertint dengan pil | L | §B5.4 | |
| 47 | BPB | Pil bagian kapital putih, nama bagian saja; navy/merah/slate | A | §B5.4, §B2 | Warna pil ditulis di §B5.4; pil slate bergaris karena putih di slate 4,48:1; dicatat §0.3 |
| 48 | BPB | Panel berpita tint tema dengan ikon, judul, hitungan | L | §B5.6 | |
| 49 | BPB | Pita bawah aksi 3–4 kolom, latar sesuai tema | L | §B5.6, §B5.12 | |
| 50 | BPB | Baris rekomendasi LANGKAH/RINCIAN/PENANGGUNG JAWAB, chip lembaga berikon | L | §B5.13 | |
| 51 | BPB | Daftar status: ikon, nama bold, pil status, urut terbesar | A | §B5.6 | Kategori status disesuaikan |
| 52 | BPB | Pil CUT OFF DATA tiap halaman data | A | §B4, §C5 | PDF pil; DOCX di baris sumber |
| 53 | BPB | Catatan sumber berbilah biru, "sementara" untuk hari berjalan, "Sumber:" abu | L | §B5.7, §C5, §B1.1 | Bilah `sumber` hanya di PDF ringkas, tanda grafis |
| 54 | BPB | Tabel peringkat: nomor bulatan navy, wilayah fokus FDF1E8, total navy | L | §B5.7 | |
| 55 | BPB | Tabel lampiran native: garis bawah 1 pt, baris 0,5 pt, tanpa vertikal, "NA" dijelaskan | A | §B5.7 | Data kosong "–" beralasan, satu notasi; dicatat §0.3 |
| 56 | BPB | Tabel situs: kepala gelap, nol sel dua baris, kolom teks rata kiri | A | §B5.7, §B6 | Urut/paginasi hanya web |
| 57 | BPB | Grafik batang: ujung bulat, tanpa sumbu Y, nilai di atas, pembanding abu, tint vs pekat | A | §B5.10 | Periode tekanan ditetapkan di judul |
| 58 | BPB | Total di atas batang, garis rata-rata berpil, nilai kecil tertulis | L | §B5.10 | |
| 59 | BPB | Kurva musim dengan latar median historis | A | §B5.10 | Untuk hujan, SPI, debit |
| 60 | BPB | Peta latar putih tanpa laut biru, D3DBE5/F1F3F6, bulatan bergaris putih | L | §B5.9 | |
| 61 | BPB | Tidak ada label/bulatan/badge bertumpuk; cek irisan mekanis | L | §B5.9, D-8 | |
| 62 | BPB | Legenda wajib untuk setiap bulatan dan warna | L | §B5.9, D-8 | |
| 63 | BPB | Peta dokumen sama dengan peta app | L | §A5, §B5.9 | |
| 64 | BPB | Peta web: nama provinsi besar, legenda bergulir, lembar bawah di HP | A | §B6 | Hanya web |
| 65 | BPB | Elemen yang bisa disunting dibuat native | A | §B5 pembuka | Peta kompleks boleh PNG dari SVG |
| 66 | BPB | Ikon garis Lucide/Tabler di dalam lingkaran, 55–62%, wajib di kepala dan kartu | L | §B5.14 | |
| 67 | BPB | Baris TOTAL kekeringan berikon rumah, orang, tetes | L | §B5.14 | |
| 68 | BPB | Foto: label kategori dan waktu, tanpa nomor urut, kredit kecil | A | §B5.15 | Label di keterangan, bukan tumpang di foto |
| 69 | BPB | Kartu Insight: pil, satu temuan berangka, legenda, "Sumber:" | A | §B5.5 temuan kunci, §B5.4 | Kontrol segmen hanya web |
| 70 | BPB | Tooltip web pita judul + kolom, tanpa ISO | A | §B6 | Hanya web |
| 71 | BPB | Klik tidak membekukan layar; simulasi di Web Worker | A | §B6 | Hanya web |
| 72 | BPB | Web lebar penuh dalam kontainer, tanpa abu gelap, uji 1440 dan 390 | A | §B6, D2 | Hanya web |
| 73 | BPB | Render sendiri lalu baca tiap halaman PNG | L | D2 | |
| 74 | BPB | Cek mekanis: judul 2 baris, irisan, "…", grep, huruf terkecil, legenda, angka antarhalaman | A | D1 | Target word/document.xml dan teks PDF |
| 75 | BPB | Cacat yang tidak boleh terulang (terpotong, footer pendek, bertumpuk, data basi) | L | D2 butir 3 | |
| 76 | BPB | Kendali mutu: hasil agent dibaca sendiri, verifier konteks bersih | L | D3 | |
| 77 | BPB | Disembunyikan bukan dihapus, dicatat cara memulihkan | A | §0.3 | |
| 78 | BPB | Mulai dari acuan; yang disalin dokumen yang ditunjuk pemilik | A | D3 butir 1 | Halaman contoh disetujui dulu |
| 79 | BPB | Lisensi data pihak ketiga tampil; lapisan tertutup disembunyikan | L | §C6.5, §B5.17 | |
| 80 | BPB | Nama berkas `<Judul> DDMMYY`, dua format | A | §A3 tabel | PDF dan DOCX |
| 81 | BPB | Mode Matador dan PPT harian | T | – | Khusus konpers dan deck harian |
| 82 | BPB | Aturan situs, domain, cron, gerbang repo, migrasi | T | §B6, T3 | Operasional repo; berlaku bila peta di situs |
| 83 | BPB | Artifact pedoman monokrom satu aksen, kolom baca, daftar isi lengket | A | §B1 (satu aksen) | Font pedoman tidak dibawa ke kajian |
| 84 | PDK | Pedoman dokumen hidup: keputusan bertanggal berkutipan, yang diganti ditandai | L | §0.3 | |
| 85 | PDK | Urutan bagian tetap; bagian yang dihapus tidak muncul lagi | A | §A3, §0.3 | Kerangka bab dikunci |
| 86 | PDK | Huruf hanya Roboto | L | §B2, D-4 | |
| 87 | PDK | Templat BNPB: logo kanan atas, kaki, nomor, cut-off; salin kepala/kaki templat | A | §B4 | A4 tegak |
| 88 | PDK | Palet tetap; satu ukuran satu warna di semua halaman | L | §B1.1 | |
| 89 | PDK | ▲ oranye, ▼ biru, 0% abu, "baru" bila pembanding 0 | A | §B1.5 | Warna sama; arah berupa ikon vektor karena ▲▼ tidak ada di Roboto |
| 90 | PDK | Tabel peringkat garis tipis, tanpa pita selang-seling, angka kanan, persen kiri | L | §B5.7 | |
| 91 | PDK | Judul kolom satu baris dengan ikon, LABEL*, (satuan) | A | §B5.7 | Ikon hanya di tabel ringkasan |
| 92 | PDK | Baris Jumlah = jumlah angka yang tampil | L | §A5, §B5.7, D-6 | |
| 93 | PDK | Peta sebesar mungkin; nomor tidak menabrak; label tidak navy di atas navy | L | §B5.9 | |
| 94 | PDK | Bulatan sebanding per provinsi, pil label, nomor 1–7, legenda di bawah panel | A | §B5.9 | Besaran sesuai topik |
| 95 | PDK | Ikon putih bermakna per ukuran di judul kolom | A | §B5.14, §B1.3 | Set ikon per jenis bencana |
| 96 | PDK | KPI kecil berikon, tanpa ± dan keterangan kecil | A | §B5.4, §C4 | Ketidakpastian di metode |
| 97 | PDK | Kalimat bawah judul berpola: wilayah terbanyak dulu, lalu total | A | §C2 | |
| 98 | PDK | Kalimat bertentangan dengan data dihapus | L | §C1 | |
| 99 | PDK | Istilah konsisten, tidak meminjam istilah lembaga untuk angka sendiri | A | §C3 | |
| 100 | PDK | Catatan sumber menyebut sistem dan satelit | A | §B5.7, §C6.5 | |
| 101 | PDK | Angka yang bisa dihitung sendiri dari data primer; data operasional lembaga apa adanya | A | §C6.1 | |
| 102 | PDK | Pembulatan sekali, setengah ke atas, titik ribuan | A | §C4 | Desimal per besaran, maks 1 |
| 103 | PDK | Hari kalender WIB penuh; cut-off ditulis apa adanya | L | §C5 | |
| 104 | PDK | Tanggal judul = tanggal laporan, kolom = tanggal data | L | §C5 | |
| 105 | PDK | Ketidakpastian eksplisit, sel NA terisi atau dijelaskan | A | §C4, §B5.7 | Di metode dan catatan |
| 106 | PDK | Hasil benar, valid, mendekati kebenaran | L | §C6, §C8 | |
| 107 | PDK | Daftar periksa sebelum kirim (tarik ulang, cut-off, cek angka, render) | L | D1, D2 | |
| 108 | PDK | Hasil dan skrip pembuat ulang disimpan di repo, bagian "Cara membuat ulang" | L | §A5 | |
| 109 | PDK | Ekspor dari fungsi yang sama dengan pratinjau | A | §A5 | Satu generator, tiga keluaran |
| 110 | PDK | Perubahan langsung dikerjakan; dokumen didahulukan dari website | A | §A5 urutan kerja | |
| 111 | PDK | Judul satu baris, tidak menabrak kotak cut-off | A | §C2, D-17 | Dua baris di A4 |
| 112 | PDK | Definisi operasional karhutla (padam 48 jam, rumus luas) | T | §C4, §C6.4 | Khusus FIRMS; definisi kajian ditulis sendiri dengan pola sama |
| 113 | PDK | Detail Koordalops (pil PM2.5, TIDAK SEHAT) | T | – | Khusus deck harian |
| 114 | RMB | Suara redaktur berita, satu baris satu temuan, huruf kalimat, tanpa emoji | A | §C1, §C2 | Huruf kalimat untuk keterangan dan label; judul bab/subbab kapital tiap kata (PUEBI) |
| 115 | RMB | Judul temuan: angka + satuan + kata kerja + tempat + waktu | A | §C2 | |
| 116 | RMB | Em dash dilarang, pemisah titik dua atau titik tengah, en dash rentang | A | §C1, §0.1 | Sisir: L. Titik tengah dilarang sejak 23 Okt |
| 117 | RMB | Sapaan "kamu" bila perlu menyapa | A | §C1 | Kajian tanpa kata ganti |
| 118 | RMB | Frasa "N provinsi prioritas" haram; konsesi netral | A | §C3 | Status resmi BNPB dikutip bertanda |
| 119 | RMB | Format id-ID 1 desimal; rb/jt label sempit; cacah kecil dieja | L | §C4 | |
| 120 | RMB | Satuan dan simbol baku | L | §C4 | Titik tengah tidak dipakai |
| 121 | RMB | Waktu "14 Okt 21.20 WIB"; tiap angka menyebut sumber dan waktu | L | §C5 | |
| 122 | RMB | Status resmi lembaga lebih dulu, indeks sendiri bernama beda | L | §C6.1 | |
| 123 | RMB | Angka tanpa sumber tidak tayang; "Sumber:" di kaki | L | §C8, §B5.7 | |
| 124 | RMB | Status hanya dari aturan yang diuji balik dan rumus di Metode | A | §C6.3 | |
| 125 | RMB | Kinerja ditulis apa adanya; model kalah pembanding tidak terbit | A | §C6.3 | |
| 126 | RMB | Sumber dicatat URL, format, frekuensi, lisensi, status [OK]/[BV] | L | §C6.5 | |
| 127 | RMB | Istilah dan ambang resmi diadu ke halaman lembaga | L | §C3 | |
| 128 | RMB | Kosakata padanan per bencana | L | §C3 | Tabel di `docs/multi-bencana/COPYWRITING.md` §5 |
| 129 | RMB | Bab metode: Singkatnya, Alurnya, Contoh, Rincian, Batasan | L | §C6.4 | |
| 130 | RMB | Tiap baris komponen terisi dibuat/diadaptasi/tidak berlaku dengan alasan | A | §A3.3 matriks fase × jenis | |
| 131 | RMB | Spesifikasi per bencana berstruktur tetap | A | §A3.3 urutan subbab | |
| 132 | RMB | Buku web: daftar isi lengket + kotak cari | A | §A3.4 (TOC Word) | |
| 133 | RMB | Kartu Insight: pil, temuan, grafik, legenda, sumber | A | §B5.5, §B5.4 | |
| 134 | RMB | Buang teks penjelas | A | §C1, §B5 | Penuh di PDF; DOCX berprosa |
| 135 | RMB | Label, nama, angka sebaris; yang tidak muat jadi kolom | L | §B5.7 | |
| 136 | RMB | Label berbentuk pil berwarna, tiap item berikon | A | §B5.7, §B5.14 | Ikon hemat di DOCX |
| 137 | RMB | Lebar sampai ujung, kolom menurut isi | A | §B3 | Lebar isi A4 |
| 138 | RMB | Kecil dan subtle, judul ≤ 3 baris | L | §B2, §C2 | Judul objek ≤ 2 baris |
| 139 | RMB | Angka tertulis di grafik, nilai kecil tetap | L | §B5.10 | |
| 140 | RMB | Tabel standar kepala gelap putih, sudut atas membulat | A | §B5.7 | Urut/paginasi hanya web |
| 141 | RMB | Tanpa latar abu tua, latar putih | L | §B1.2 | |
| 142 | RMB | Rata tengah untuk legenda, label foto, angka indikator | L | §B5.9, §B5.4 | Angka tabel tetap kanan |
| 143 | RMB | Jujur soal peluang, angka langsung tanpa basa-basi | L | §C1, §B5.11 | |
| 144 | RMB | Data tidak ada dibuang, angka kosong "–" | A | §B5.7 | Kolom kosong dibuang; sel "–" beralasan |
| 145 | RMB | Ikon SVG garis seragam, bukan emoji | L | §B5.14 | |
| 146 | RMB | Peta sebaran nasional; jenis dibedakan bentuk; legenda dari yang tampil | L | §B5.9 | |
| 147 | RMB | Status resmi di peta memakai warna dan kata asli lembaga | L | §B1.4, §B5.9 | |
| 148 | RMB | Peta web muatan bertingkat, INP, satu lapis gagal tidak menghapus | A | §B6 | Hanya web |
| 149 | RMB | Tiap tahap ditutup bukti; pemeriksa konteks bersih; angka layar = JSON | L | D3, §A5 | |
| 150 | RMB | Gagal terlihat: data basi berlabel umur | L | §C5 | |
| 151 | RMB | Keputusan dicatat, terbit ulang URL sama; subagent tidak push | L | §0.3, D3 | |
| 152 | RMB | Arah mengurangi dan menyeragamkan; tanpa "Coming Soon" | A | §A6 | |
| 153 | RMB | Monokrom satu aksen per proyek, stabilo | A | §B1.1 | Aksen BNPB navy 051C2C |
| 154 | RMB | Plus Jakarta Sans dan IBM Plex Mono | T | §B2 | Kajian Roboto saja |
| 155 | RMB | Detail registry, D1, worker, cron, lapor warga | T | – | Arsitektur situs |
| 156 | PP38 | Kelengkapan data kelas satu; di bawah ambang tidak diberi skor | A | §C6.3 | Ambang ditetapkan di Metodologi |
| 157 | PP38 | Warna khusus "tidak cukup data" berarsir | A | §B1.1, §B1.4 | Abu BNPB + arsir |
| 158 | PP38 | Perbandingan dinormalkan, angka mutlak di kurung, pembagi seragam | A | §C4 | Per 100.000 penduduk atau per km² |
| 159 | PP38 | Atas berisi hitungan wilayah perlu tindakan, bukan total | A | §B5.4 | Total singkat + hitungan wilayah |
| 160 | PP38 | Skor gabungan selalu bisa dibongkar ke komponen dan bobot | L | §C4 | |
| 161 | PP38 | Sakelar mati: satu kejadian kritis mengalahkan rata-rata | A | §C4 | Bahaya ekstrem = kelas minimum |
| 162 | PP38 | Diam tidak dihitung bagus; baris dari katalog | L | §B5.8, D-18 | |
| 163 | PP38 | Tiap bagian = satu pertanyaan pimpinan + kriteria merah | A | §A2, §B5.2 | |
| 164 | PP38 | Tampilkan yang paling cepat memburuk dan yang membaik | A | §C4 | |
| 165 | PP38 | Peta kisi sebagai pendamping, koroplet bukan satu-satunya | A | §B5.9, §A3.1 | Peta geografis tetap untuk bahaya spasial |
| 166 | PP38 | Tabel terurut menurut jumlah yang bisa ditindak | A | §B5.7 tabel peringkat | |
| 167 | PP38 | Dua cap waktu bila sumber berbeda | A | §C5 | Cut-off per dataset |
| 168 | PP38 | Rancangan diadu ke data nyata, vonis per bagian | A | §A3, D3 | Kecukupan data per bab |
| 169 | PP38 | Asersi invarian, uji yang salah ditolak, perbaikan berpasangan gerbang | L | D-18, D | |
| 170 | PP38 | Kode wilayah diperiksa ke katalog dan dirinya | L | D-18 | |
| 171 | PP38 | Bagian "Yang sengaja tidak dibuat" | L | §A6, §A4 butir 8 | |
| 172 | PP38 | Masthead, kisi fakta, bagian bernomor, kicker | A | §A3.1 hlm 2, §B5.2 | Roboto |
| 173 | PP38 | Kisi fakta: label kecil, angka tabular, garis 1px | A | §B5.4 | Keterangan dipakai hemat |
| 174 | PP38 | Angka contoh dibedakan dan diberi catatan | L | §C6.2 | |
| 175 | PP38 | Model risiko baru masuk akal setelah data cukup merata | A | §C6.3 | Kelengkapan data disebut |
| 176 | PP38 | Archivo + Source Serif + Plex Mono | T | §B2 | Roboto saja; prinsip angka tabular dipakai |
| 177 | PP38 | Em dash sebagai pemisah | T | §C1 | Bertentangan aturan 16 Okt |
| 178 | PP38 | Detail lensa MBG, skor, dummy | T | – | Khusus MBG |
| 179 | BPU | Tiap aturan membawa "Sebab:" berisi insiden, tanggal, angka | A | §C6.5, §B5.13 kolom Dasar | Klaim diikat ke data bertanggal |
| 180 | BPU | Urutan otoritas; ringkasan kalah dari sumbernya | A | §0.1, §C6.1 | PDF diturunkan dari data, bukan diketik ulang |
| 181 | BPU | Diputus tidak dibuka lagi, Belum diputus ditanyakan | L | §0.2 | |
| 182 | BPU | Aturan tanpa gerbang mekanis belum jadi | L | §D pembuka | |
| 183 | BPU | Satu baris Design Read sebelum mulai | A | §A1 | |
| 184 | BPU | Fitur besar dirancang dulu sampai pemilik setuju | L | D3 butir 1 | |
| 185 | BPU | Satu bahasa desain: templat disalin | L | §B5 pembuka | |
| 186 | BPU | Ekspor replika kertas kerja | A | §B4, SPESIFIKASI-GAYA | Konvensi dokumen resmi |
| 187 | BPU | Sumber warna dari logo/materi merek | A | §B1 | Palet dari deck BNPB |
| 188 | BPU | Satu warna identitas solid, nol gradien | L | §B1.1, §B1.2 | |
| 189 | BPU | Aksen hanya tipis; tanpa garis emas di bawah kepala tabel | L | §B1.2, §B5.7 | |
| 190 | BPU | Latar netral terang, teks panjang di atas putih | L | §B1.2 | |
| 191 | BPU | Warna pekat hanya untuk pita identitas, pil, aksen tipis | L | §B1.2 | |
| 192 | BPU | Kartu KPI putih, nada hanya di angka | L | §B5.4 | |
| 193 | BPU | Status empat warna baku; warna di luar palet dilarang | A | §B1.4, §B1.6 | Skala kelas IRBI |
| 194 | BPU | Satu kelompok data satu peta warna di satu berkas | L | §B1 pembuka, tema.json | |
| 195 | BPU | Grafik pastel terang | A | §B5.10, §B1.4 | Token BNPB |
| 196 | BPU | Terang dan gelap sejak awal, kontras 4,5:1 | A | §B6, §B1.1, §B1.3 | Gelap hanya web; kontras teks kecil §B1.1 |
| 197 | BPU | Dua font terkunci per proyek | A | §B2 | Kunci Roboto |
| 198 | BPU | Hierarki dari bobot ekstrem | A | §B2 | |
| 199 | BPU | Nol kapital penuh termasuk kop | A | §B2, T1, D-11 | Sisir: L. Kanon proyek membolehkan kapital berspasi untuk pil/kepala/pita |
| 200 | BPU | Em dash penghubung dilarang | L | §C1, D-1 | |
| 201 | BPU | Teks berkerangka label, satu baris satu gagasan | A | §C1, §B5.3 | DOCX tetap berprosa |
| 202 | BPU | Judul kartu = nama blok ≤ 32 karakter | A | §C2 | |
| 203 | BPU | Satu konsep satu istilah | L | §C3 | |
| 204 | BPU | Kalimat panjang dan keterangan kecil dilarang di UI | A | §C1, §B6 | Penuh di PDF/web |
| 205 | BPU | Angka id-ID lewat satu fungsi | L | §C4 | |
| 206 | BPU | Persen satu desimal, sisa terbesar, penyebut nol kosong | L | §C4 | |
| 207 | BPU | Satuan ringkas berspasi, hanya di prosa | L | §C4 | |
| 208 | BPU | Kuantitas tidak telanjang; satuan ke kepala kolom | L | §C4, §B5.7 | |
| 209 | BPU | Jam 24 jam berzona; zona per wilayah | A | §C5 | Pemisah titik (kanon proyek) |
| 210 | BPU | Angka palsu wajib berlabel contoh | L | §C6.2 | |
| 211 | BPU | Angka dari satu sumber, satu penghitung | L | §A5, §C7 | |
| 212 | BPU | Angka mesin tidak disalin tangan | A | §A5 | Disuntik dari JSON |
| 213 | BPU | Ikon formal, satu ikon satu arti | A | §B5.14 | Ikon cuaca/air harfiah sah |
| 214 | BPU | Ikon polos tanpa kotak, cincin, latar; satu library, stroke seragam | A | §B5.14 | Sisir: L. Kanon proyek mewajibkan lingkaran; yang dipakai satu library dan stroke seragam |
| 215 | BPU | Legenda di kaki, penanda sebentuk, label 2–3 kata, tidak terpotong | L | §B5.9, §B5.7 | |
| 216 | BPU | Standar tabel (No, kepala tengah, angka kanan, total, tanpa "…") | L | §B5.7 | |
| 217 | BPU | Kepala tabel diulang tiap halaman, ≤ 3 baris | L | §B4, §B5.7 | |
| 218 | BPU | Keterangan sama naik ke atas tabel; subtotal bila > 1 baris | L | §B5.7 | |
| 219 | BPU | Tabel berjenjang wilayah, angka di baris label | A | §B5.8 | Pulau, provinsi, kab/kota |
| 220 | BPU | Tabel kosong tetap tergambar dengan "Belum ada" | A | §B5.7, §B5.8 | "Belum terdata" |
| 221 | BPU | Teks tidak tumpang tindih atau meluber | L | D2, D-8 | |
| 222 | BPU | Nol ruang menganga, satu skala radius, satu tepi | A | §B3 | |
| 223 | BPU | Judul zona berupa wadah berbingkai | A | §B5.2, §B5.3 | |
| 224 | BPU | Blok lima unsur: grafik, rata-rata, total, perbandingan, rincian | A | §B5.4, §B5.10 | Rincian di lampiran |
| 225 | BPU | Sebut yang belum, kabar baik diringkas | A | §A4 butir 5 | |
| 226 | BPU | Semua cetak A4, nomor halaman dari mesin cetak | L | §B3, §B4 | |
| 227 | BPU | Format menurut nasib berkas (Excel/PDF/Word) | A | §A3, §A3.4 | Lampiran juga .xlsx |
| 228 | BPU | Kop satu komponen, bentuk dokumen satu tema, pratinjau = cetak | L | §B pembuka, §B4 | |
| 229 | BPU | Paritas dua perender | L | §A5, D-6 | |
| 230 | BPU | Peta/grafik diekspor sebagai data | A | §A5 | Gambar tetap, data menyertai |
| 231 | BPU | Jenis entitas dibedakan bentuk | L | §B5.9 | |
| 232 | BPU | Legenda peta di kaki, diturunkan dari daftar | L | §B5.9 | |
| 233 | BPU | Tingkat peta nasional sampai titik; OSM; tanpa clustering | A | §B6 | Sisir: L. Peta kajian sampai kab/kota, vektor tanpa basemap |
| 234 | BPU | Peta sebaran nasional; koordinat luar tidak dipercaya | L | §B5.9 | |
| 235 | BPU | Siklus state lengkap di web | A | §B6 | Hanya web |
| 236 | BPU | Anti-slop visual dan kata pengisi; satu register | L | §C1, §A6 | |
| 237 | BPU | Preflight sebelum selesai; yang dilewati disebut | L | D3 definisi selesai | |
| 238 | BPU | "Catat" = berkas berubah | L | §0.3 | |
| 239 | BPU | Tema dokumen: pilihan ditunjukkan dulu, 4 warna bernama | A | D3 butir 1 | Identitas BNPB mengikat |
| 240 | BWI | Buku dibuka Keputusan Diputus/Belum diputus berekomendasi | L | §0.2 | |
| 241 | BWI | Riwayat bertanggal terbaru di atas | L | §0.3 | |
| 242 | BWI | Satu rumus per besaran; model AI tidak membuat angka | L | §C6.3 | |
| 243 | BWI | Angka berlabel jenisnya dan ambang data minimal | A | §C6.2, §C6.3 | |
| 244 | BWI | Hanya sumber publik | A | §C6.5 | |
| 245 | BWI | Emas aksen tipis, gradien navy WI | T | §B1.6 | Palet proyek lain |
| 246 | BWI | Warna vonis empat tingkat + ikon peringatan, legenda tabel | A | §B1.4, §B5.7 | |
| 247 | BWI | Terang dan gelap sejak awal | A | §B6 | Hanya web |
| 248 | BWI | Nol em dash | L | §C1, D-1 | |
| 249 | BWI | Nol kartu angka berlatar blok pekat | L | §B5.4 | |
| 250 | BWI | Format Rupiah lewat komponen | L | §C4 | |
| 251 | BWI | Landing boleh punya hero | T | §A6 | Bukan produk konsumen |
| 252 | BWI | Klik tidak membekukan layar | A | §B6 | Hanya web |
| 253 | BWI | Gerbang dibuat sebelum fitur pertama | L | §D pembuka | |
| 254 | BWI | Opus merencanakan, Sonnet mengerjakan, Haiku memeriksa | L | D3 | |
| 255 | BWI | Audit klaim terhadap kenyataan | A | §C8, D3 | |
| 256 | BBS | Tiap bagian membawa label berkas sumber | A | §B5.7 baris Sumber | |
| 257 | BBS | Riwayat dengan kutipan pemilik dimiringkan | L | §0.3 | |
| 258 | BBS | Nol kapital penuh di layar dan kertas | A | §B2, T1 | Sisir: L. Kanon proyek membolehkan kapital berspasi untuk pil/kepala/pita |
| 259 | BBS | Satu nama per konsep | A | §C3 | Nama wilayah, DAS, bencana |
| 260 | BBS | Warna logo menyala tidak dipakai di layar padat | A | §B1.1 | Navy 051C2C untuk kepala tabel |
| 261 | BBS | Warna solid, nol gradien, latar netral | L | §B1.2 | |
| 262 | BBS | Palet proyek lain tidak berlaku | L | §B1.6 | |
| 263 | BBS | Registri konsep ke ikon, ikon formal, legenda | L | §B5.14 | |
| 264 | BBS | Standar tabel 14 butir | A | §B5.7 | Butir interaktif hanya web |
| 265 | BBS | Satu tabel per tampilan; label rentang tanggal, bukan nomor minggu | A | §B5.7 | Data berperiode satu tabel, label rentang tanggal |
| 266 | BBS | Ringkasan putih; tile tanpa data dihapus | L | §B5.4 | |
| 267 | BBS | Dashboard padat dengan pembanding periode | A | §B5.4 | Klik/lipat hanya web |
| 268 | BBS | Angka dari satu sumber | L | §A5 | |
| 269 | BBS | Jumlah barang dua kolom Jumlah dan Satuan | L | §B5.7 | |
| 270 | BBS | Zona waktu mengikuti usaha | A | §C5 | Zona per wilayah |
| 271 | BBS | Paritas dengan berkas acuan pemilik | A | D3 butir 1, SPESIFIKASI-GAYA | |
| 272 | BBS | Keputusan data dicatat dengan alasan | A | §C6.5 tabel rekonsiliasi, §0.3 | |
| 273 | BBS | Pedoman diperbarui dan terbit ulang ke alamat sama | A | §0.3, D3 | |
| 274 | BBS | Fitur yang ditolak dicatat dan tidak dibangun | L | §A6 | |
| 275 | BBS | Pesan WA ramah berikon | T | – | Komunikasi pelanggan F&B |
| 276 | BGR | Semua tabel disamakan ke satu tabel acuan, dijaga gerbang | L | §B5.7, D-20 | |
| 277 | BGR | Muat satu tampilan, maks 12 kolom | A | §B5.7 | Maks 8 kolom A4 tegak |
| 278 | BGR | Minus di slot tetap, tanpa "-0", persen 1 desimal | L | §C4 | |
| 279 | BGR | Rp kiri angka kanan juga di kertas | L | §B5.7 | |
| 280 | BGR | Dokumen cetak: kepala tengah, sudut bulat, Jumlah/Satuan, nomor halaman kanan bawah | A | §B5.7, §B4 | Sisir: L. Kontak lembaga berikon, tanpa logo WA |
| 281 | BGR | Nol label tulisan, chip berikon | A | §B5.7, §B5.14 | Di prosa tetap kata |
| 282 | BGR | Ikon formal; status kotak warna bukan kiasan | A | §B5.14 | |
| 283 | BGR | Legenda tidak mengulang, tanpa cara pakai, tidak terpotong | L | §B5.9 | |
| 284 | BGR | Urutan blok: Ringkasan, Periode, isi | A | §B5.2, §B5.3 | |
| 285 | BGR | Ringkasan tile ikon + label, pembanding dua kolom | A | §B5.4 | |
| 286 | BGR | Warna solid bukan gradien | L | §B1.2 | |
| 287 | BGR | Latar netral, nol krem di atas krem | L | §B1.2 | |
| 288 | BGR | Grafik pastel terang | A | §B5.10 | |
| 289 | BGR | Satu istilah baku menggantikan sinonim | A | §C3 | |
| 290 | BGR | Nol tab "Semua"; urutan tab = urutan proses | A | §A4, §B5.12 | Urutan fase |
| 291 | BGR | Link langsung dibuka | A | §B6, §B5.17 | |
| 292 | BGR | Nol gulir samping di popup | A | §B6 | Hanya web |
| 293 | BGR | Susunan menu simetris urut alur | A | §A3.2, §A3.3 | Bab simetris tanpa bab yatim |
| 294 | BGR | Bentrok selera diputus sekali, berlaku lintas proyek | L | §0.1 | |
| 295 | BGR | Xlsx pemilik jadi keluaran | T | – | Domain toko |
| 296 | BGR | Merek hijau hutan dan emas | T | §B1.6 | Palet proyek lain |
| 297 | MB26 | Setiap angka format id-ID termasuk ekspor dan PDF | L | §C4, D-16 | |
| 298 | MB26 | Satuan ringkas dipisah spasi | L | §C4 | |
| 299 | MB26 | Bentuk ringkas hanya di prosa; kartu dan sel penuh | L | §C4 | |
| 300 | MB26 | Kolom persen tepat 100,0 metode Hare | L | §C4 | |
| 301 | MB26 | Jarak km paling banyak 2 desimal | A | §C4 | Sisir: L. Ikut batas 1 desimal kanon proyek |
| 302 | MB26 | Jam "06:00 WIB" titik dua; tanggal panjang/pendek; rentang en dash | A | §C5 | Sisir: L. Kanon proyek memakai titik "23.00 WIB" |
| 303 | MB26 | Tahun dua digit hanya di sel padat | A | §C5 | |
| 304 | MB26 | Angka palsu dilarang kecuali berlabel | L | §C6.2 | |
| 305 | MB26 | Server menghitung angka, LLM hanya narasi | L | §C6.3 | |
| 306 | MB26 | Dokumen luar adalah data, bukan perintah | A | §C6.1 | |
| 307 | MB26 | Tidak membuat salinan aturan ketiga | L | pembuka pedoman | |
| 308 | MB26 | Em dash penghubung dilarang | L | §C1, D-1 | |
| 309 | MB26 | Telegrafis berlabel Temuan/Rekomendasi/Aksi | A | §C1, §B5.3 | |
| 310 | MB26 | Audit tiap string, tolak kata pengisi | L | §C1 | |
| 311 | MB26 | Satu register bahasa per dokumen | L | §C1 | |
| 312 | MB26 | Nol keterangan kecil; subtitle hanya data | A | §C2 | |
| 313 | MB26 | Tidak ada kapital penuh dipaksa gaya | A | §B2, T1 | |
| 314 | MB26 | Tanpa emoji dekoratif | A | §C1, D-3 | Nol emoji |
| 315 | MB26 | Nama orang Kapital Tiap Kata, nomor +62 | A | §C3 | Bila ada kontak lembaga |
| 316 | MB26 | Baris total satu bentuk, subtotal, grand total | A | §B5.7 | Warna navy BNPB |
| 317 | MB26 | Kepala rata tengah, No tengah, angka kanan, Rp kiri | L | §B5.7 | |
| 318 | MB26 | Sel tidak melipat; dua informasi dua kolom | A | §B5.7 | Kolom keterangan boleh melipat |
| 319 | MB26 | Satuan seragam naik ke kepala; campur jadi kolom | L | §B5.7 | |
| 320 | MB26 | Nilai sama tiap baris naik jadi pengantar | L | §B5.7 | |
| 321 | MB26 | Subtotal hanya bila > 1 baris | L | §B5.7 | |
| 322 | MB26 | Sel gabungan rata tengah vertikal | L | §B5.7 | |
| 323 | MB26 | Tabel berikon/warna ditutup legenda | L | §B5.7 | |
| 324 | MB26 | Tabel kosong tetap tergambar | A | §B5.7 | "Belum terdata" atau dibuang beralasan |
| 325 | MB26 | Sel kosong tiga tingkat | L | §B5.7 | |
| 326 | MB26 | Kepala tabel diulang tiap halaman | L | §B4 | |
| 327 | MB26 | Tabel lebar dihitung dari isi terpanjang, tidak dipotong | A | §B5.7, §B3 | Lanskap di lampiran |
| 328 | MB26 | Urut barat ke timur | L | §B5.7 | |
| 329 | MB26 | Semua cetak A4 | L | §B3 | |
| 330 | MB26 | Format menurut pemakaian | L | §A3, §A3.4 | |
| 331 | MB26 | Excel angka number, satu tema | L | §A3.4 | |
| 332 | MB26 | Paritas antar perender | L | §A5, D3 | |
| 333 | MB26 | Nomor halaman dari mesin cetak | L | §B4 | |
| 334 | MB26 | Dokumen resmi pihak lain diisi dari templat asli | A | §B4 | Templat sendiri dibuat sekali |
| 335 | MB26 | Warna dan ukuran di satu tema | A | §B pembuka | tema.json |
| 336 | MB26 | Kop satu komponen, logo hanya penerbit | A | §B4, §B5.14 | Logo BNPB saja |
| 337 | MB26 | Satu pintu ekspor | A | §B6 | Satu tombol unduh |
| 338 | MB26 | Ringkasan eksekutif baku | A | §A3.4 | |
| 339 | MB26 | KPI satu lapis berpembanding, 4–8 angka | L | §B5.4 | |
| 340 | MB26 | Anatomi: cakupan dan periode dulu, sebut yang belum | A | §A4, §B5.4 | |
| 341 | MB26 | Judul blok hanya nama, tanpa emoji dan tanggal | L | §C2 | |
| 342 | MB26 | Data berperiode satu tabel, tanggal jadi kolom | L | §B5.7 | |
| 343 | MB26 | Blok satu tepi; daftar > 5 butir pakai komponen lain | L | §B3 | |
| 344 | MB26 | Satu aksen, satu tema, satu skala radius; tanpa gradien AI | L | §B1, §B3 | |
| 345 | MB26 | Status empat warna pastel, pekat hanya pita | A | §B1.2, §B1.4 | |
| 346 | MB26 | Warna bukan satu-satunya pembawa makna | L | §B1.3 | |
| 347 | MB26 | Hierarki dari bobot ekstrem | A | §B2 | Roboto |
| 348 | MB26 | Serif dihindari | L | §B2 | |
| 349 | MB26 | Peta: jenis dibedakan bentuk, gelembung skala | L | §B5.9 | |
| 350 | MB26 | Legenda peta di kaki, tidak menumpuk | L | §B5.9 | |
| 351 | MB26 | Basemap OSM, fadeAnimation false | A | §B6 | Hanya web |
| 352 | MB26 | Peta menjawab sebaran nasional | L | §B5.9 | |
| 353 | MB26 | Popup peta grid dua kolom, "Belum terdata" | A | §B6 | Hanya web |
| 354 | MB26 | Satu keluarga ikon stroke seragam | L | §B5.14 | |
| 355 | MB26 | Wajib gambar nyata, bukan ilustrasi | A | §B5.15, K5 | |
| 356 | MB26 | Aturan tanpa gerbang belum jadi | L | §D pembuka | |
| 357 | MB26 | Definisi selesai; sebut yang belum | L | D3 | |
| 358 | MB26 | Templat disetujui disalin | L | §B5 pembuka | |
| 359 | MB26 | Kembaran wajib ikut berubah | L | D3 | |
| 360 | MB26 | Otomasi menyiapkan, manusia memutuskan kirim | L | D3 | |
| 361 | MB26 | Identitas MBG (Dapur, emoji nav, navy-emas) | T | §B1.6 | Bukan aturan universal |
| 362 | MB26 | Aturan UI interaktif popup, sort, grup lipat | A | §B6 | Hanya web |
| 363 | MB09 | Bila dua versi bertabrakan pakai keputusan terbaru | L | §0.1 | Arsip, tanpa kriteria baru |
| 364 | KKM | Kop: judul, dek berisi pertanyaan, baris meta, papan 4 angka | L | §A3.1 hlm 2, §A3.4 | |
| 365 | KKM | Temuan dikelompokkan per prioritas, hitungan di judul seksi | A | §B5.6, §A3.3 | Per tingkat risiko |
| 366 | KKM | Seksi yang sudah baik agar tidak dibangun ulang | A | §A3.1 hlm 7, §A4 butir 5 | Kapasitas yang sudah ada |
| 367 | KKM | Temuan berpola status, judul, bukti, dampak, perbaikan | L | §B5.5 temuan kunci | |
| 368 | KKM | Ditutup urutan pengerjaan berdampak, tiap butir beralasan | L | §B5.13, §A4 butir 7 | |
| 369 | KKM | Status tindakan; keputusan manusia disebut terang | A | §B5.5 kotak keputusan | |
| 370 | KKM | Pernyataan metode: tiap angka dari kueri yang bisa diulang | L | §C6.3, §A5 | |
| 371 | KKM | Tiap temuan disertai bukti spesifik | L | §B5.5, §C8 | |
| 372 | KKM | Dampak sebagai skenario konkret | L | §C1 | |
| 373 | KKM | Yang sengaja tidak dikerjakan ditulis beralasan | L | §A6 | |
| 374 | KKM | Tabel biaya Kebutuhan, Status, Pilihan, Biaya | A | §B5.13 | Tanpa angka biaya proyek (K6) |
| 375 | KKM | Chip status semantik berlatar pastel | A | §B5.7, §C6.2 | Tanpa uppercase di isi |
| 376 | KKM | Satu kolom baca, judul seksi bergaris, kisi angka | A | §B3, §B5.4 | Ukuran cetak |
| 377 | KKM | Tiga peran huruf display/badan/mono | A | §B2 | Peran lewat bobot Roboto |
| 378 | KKM | Palet kalem satu aksen, status redup | A | §B1 | Hex BNPB |
| 379 | KKM | Em dash sebagai penghubung | T | §C1 | Melanggar aturan |
| 380 | KKM | Eyebrow uppercase bertracking lebar | T | §B2 | Dicabut buku pegangan |
| 381 | KKM | Isi temuan teknis aplikasi | T | – | Khusus MBG |
| 382 | J29 | Satu tesis kalimat di pembuka menurunkan isi | L | §A2 | |
| 383 | J29 | Hanya satu daftar berurut prioritas, sisanya kategori | L | §A4 butir 7, §B5.13 | |
| 384 | J29 | Horizon waktu skala tetap tiga tingkat dengan legenda | A | §B5.12 | 100 hari, 2026–2027, 2028–2030 |
| 385 | J29 | Hanya menulis yang belum ada | A | §A4 butir 5 | Kondisi eksisting diringkas |
| 386 | J29 | Dikelompokkan menurut pemangku | L | §B5.13 | Internal BNPB dan lintas K/L |
| 387 | J29 | Seksi berhitungan butir dan kalimat pertanyaan | L | §B5.2 | |
| 388 | J29 | Butir: judul tindakan + paragraf keadaan, kurang, penting | L | §B5.13 kolom Rincian | |
| 389 | J29 | Gradasi risiko dalam kata (menggagalkan vs memperlambat) | A | §B5.5 | Register formal |
| 390 | J29 | Papan angka kondisi sekarang vs skala sasaran | L | §B5.4 | |
| 391 | J29 | Kaki menyebut sumber penyusunan dan cakupan | L | §A3.4 kolofon | |
| 392 | J29 | Peta jadi papan keputusan: lapis waktu, radius, mode presentasi | A | §B6 | Hanya web |
| 393 | J29 | Judul Instrument Serif | T | §B2 | Serif dilarang, Roboto saja |
| 394 | J29 | Palet hijau-abu aksen emas | A | §B1 | Prinsip saja, hex BNPB |
| 395 | J29 | Em dash penghubung | T | §C1 | Melanggar aturan |
| 396 | J29 | Substansi rantai pasok | T | – | Khusus MBG |
| 397 | PBK | Urutan butir mengikuti ketergantungan, prinsip ditulis | A | §B5.13 | |
| 398 | PBK | Butir bernomor dua digit, status tetap berlegenda | A | §B5.13 | Status kesiapan program |
| 399 | PBK | Dependensi ditulis eksplisit "Butuh 02" | L | §B5.13 | |
| 400 | PBK | Tiap butir punya satu kalimat bukti keadaan nyata | L | §B5.13 kolom Rincian dan Dasar | |
| 401 | PBK | Fase berjudul dengan rentang waktu | A | §B5.12 | |
| 402 | PBK | Baris KPI ringkas hitungan status dan total | L | §B5.4 | |
| 403 | PBK | Penutup "Yang menahan sekarang" dengan pembukanya | A | §B5.5 kotak keputusan, §A4 | |
| 404 | PBK | Lambang resmi tidak dikarang | L | §C6.5, §B4 | |
| 405 | PBK | Uraian menjelaskan akibat, bahasa Indonesia tanpa jargon | L | §C1 | |
| 406 | PBK | Palet navy-biru emas, pasangan status | A | §B1 | Hex BNPB |
| 407 | KJK | Langkah kerja dan dokumen dipisah | A | §A3.3 Bab 12 | Rencana aksi vs instrumen hukum |
| 408 | KJK | Relasi tetap "Membuka:", "Menahan:", "Butuh" | L | §B5.13 | |
| 409 | KJK | Ringkasan status menjumlah ke total | L | D-6 | |
| 410 | KJK | Tiap butir menyebut akibat bila tidak dikerjakan | L | §B5.13, §B5.11 | |
| 411 | KJK | Persempit cakupan dan sebut yang dikeluarkan beralasan | A | §B5.7 tabel peringkat | |
| 412 | KJK | Tunjuk sumber bukti dan sebut celah data jujur | L | §C6.5, §A4 butir 8 | |
| 413 | KJK | Tandai angka tidak konsisten antar dokumen | L | §C7, D-6 | |
| 414 | KJK | Penutup 2–3 penahan utama berikut dampak hilir | A | §B5.5 kotak keputusan | |
| 415 | KJK | Yang selesai ditandai agar sisa tampak pendek | A | §B5.13 | Kapasitas eksisting dibedakan |
| 416 | KJK | Tiga status tiga pasangan warna | A | §B1.4, §C6.2 | Tetap berlabel teks |
| 417 | PDP | Diagram alur ujung ke ujung di awal | A | §A3.2 Bab 4, §B5.23 | Diagram hulu ke hilir vektor |
| 418 | PDP | Langkah berurut bertag tempat dikerjakan | A | §B5.12 | Tag lembaga |
| 419 | PDP | Tabel Gejala / Yang dicek | A | §B5.7 | Tabel tanda peringatan dan tindakan di lampiran |
| 420 | PDP | Bagian "Batas yang sengaja dipasang" | A | §A6, §A3.2 Bab 3 | |
| 421 | PDP | Ditutup rujukan sumber lengkap | A | §B5.17 | |
| 422 | PDP | Aturan ditegakkan disebut beserta penegaknya | A | §B5.13 kolom Dasar | Dasar hukum |
| 423 | PDP | Emoji penanda alur | T | §C1, D-3 | Nol emoji |
| 424 | PDP | Tiga keluarga font | A | §B2 | Roboto berbobot |
| 425 | PDP | Konten khusus aplikasi | T | – | Khusus KDMP |
| 426 | AMP | Vonis tunggal + 3 angka + syarat berlakunya | A | §A2, §B5.4 | Tingkat risiko/kesiapan |
| 427 | AMP | Temuan berkode, judul klaim, keparahan, bukti, mekanisme, perbaikan termurah | A | §B5.5, §B5.11 | |
| 428 | AMP | Tiap klaim menyebut sumber spesifik, dicek silang | A | §C6.5 | |
| 429 | AMP | Tabel vonis tindak lanjut temuan sebelumnya | A | §B5.7 tabel perbandingan | Evaluasi rekomendasi lama |
| 430 | AMP | Bagian "Yang diperiksa dan ternyata benar" | L | §A4 butir 5 | |
| 431 | AMP | Rencana: # / Tugas / Tempat / Bukti selesai | A | §B5.13 | |
| 432 | AMP | Definisi selesai terukur | L | §B5.13 Indikator, D3 | |
| 433 | AMP | Keputusan pemilik dipisah dari rekomendasi teknis | L | §B5.5 kotak keputusan | |
| 434 | AMP | Temuan dirangkum jadi tema strategis | L | §A3.2 Bab 8, §A3.3 Bab 11 | |
| 435 | AMP | Metode di akhir | A | §C6.4 | |
| 436 | AMP | Skala keparahan empat tingkat pasangan warna | A | §B1.4 | Tetap berlabel |
| 437 | AMP | Konten teknis software | T | – | Khusus repo |
| 438 | ATM | Judul utama tesis, diikuti standfirst | A | §A2, §B5.2 | Sampul tetap judul resmi |
| 439 | ATM | Vonis dibela dua arah (mengapa bukan lebih baik, bukan lebih buruk) | L | §B5.5 temuan kunci | |
| 440 | ATM | Ringkasan eksekutif tiga risiko dan tiga peluang teratas | L | §A3.4, §A3.1 hlm 7 | |
| 441 | ATM | Fakta pembingkai: kapasitas terpasang vs pemakaian nyata | A | §B5.5 | |
| 442 | ATM | Label "fakta" atau "penilaian" per temuan | L | §C6.2 | |
| 443 | ATM | Kartu temuan: klaim, keparahan, lokasi, mekanisme, konsekuensi, ongkos | A | §B5.5, §B5.11 | Tanpa angka biaya proyek |
| 444 | ATM | Klaim sendiri yang terbantah dilaporkan | A | §C6.5 | Catatan revisi di lampiran metode |
| 445 | ATM | Kekuatan yang tidak boleh dikorbankan | L | §A4 butir 5 | |
| 446 | ATM | Tabel "Yang sengaja tidak direkomendasikan / Alasan" | L | §A4 butir 8 | |
| 447 | ATM | Strategi per tema dengan keadaan target | L | §A3.2 Bab 8, §A3.3 Bab 11 | |
| 448 | ATM | Rencana bertahap: tugas, terdampak, kriteria, upaya, risiko | A | §B5.13 | |
| 449 | ATM | Tiga tugas teratas: sketsa langkah + "Jebakan" | A | §B5.13 | "Risiko pelaksanaan" |
| 450 | ATM | Pertanyaan terbuka berakibat | L | §B5.5 kotak keputusan, §0.2 | |
| 451 | ATM | Kolofon metode; yang tak terverifikasi ditandai | L | §A3.4, §C6.4 | |
| 452 | ATM | Asersi invarian, cakupan pemindai lengkap | A | D-18 | |
| 453 | ATM | Hierarki editorial serif/sans/mono | A | §B2 | Roboto |
| 454 | ATM | Bab bernomor dua digit dengan em dash, navigasi lengket | A | §B4, §B6 | Tanpa em dash; nomor bab Word |
| 455 | ATM | Kotak vonis nilai besar + kotak fakta pembingkai | L | §B5.5, §B5.4 | |
| 456 | ATM | Palet netral satu aksen, keparahan, mode gelap | A | §B1, §B6 | Gelap hanya web |
| 457 | ATM | Isi temuan teknis repo | T | – | Khusus repo |
| 458 | KNG | Tabel konteks sesi di awal | A | §A3.4 kolofon | Lembar identitas dokumen |
| 459 | KNG | Satu argumen tunggal di awal | L | §A2 | |
| 460 | KNG | Kalimat pendek tegas, vonis lugas | L | §C1 | |
| 461 | KNG | Klaim skala berangka bersatuan dan berpembanding | L | §C4, §B5.4 | |
| 462 | KNG | Angka beda versi ditandai, kedua versi dan asal disebut | L | §B5.7 tabel rekonsiliasi, §C6.5 | |
| 463 | KNG | Kapasitas penerbit jelas; contoh pihak lain sebagai bukti | A | §C1 | Data K/L sebagai data lembaga |
| 464 | KNG | Versi singkat menjelaskan bagian yang diringkas | A | §A3 | PDF ringkas dari DOCX |
| 465 | KNG | Batas peran antarbagian, rujukan silang | A | §C1 | |
| 466 | KNG | Penutup tiga syarat bernomor, kalimat pertama = syarat | L | §B5.13, §A4 butir 7 | |
| 467 | KNG | Bahasa sesuai audiens; istilah asing miring | A | §C1, §B2 | Seluruhnya bahasa Indonesia |
| 468 | NPA | Baris tanpa sumber tidak tampil, gerbang build menolak | L | §C8, D-7 | |
| 469 | NPA | Tingkat bukti berjenjang, yang lemah berlabel | A | §C6.2 | Empat label pedoman |
| 470 | NPA | Nilai kosong "–" beralasan, empat alasan, tidak dinolkan | L | §B5.7 | |
| 471 | NPA | Tiap fakta membawa periode; tahun tidak dicampur | L | §C5 | |
| 472 | NPA | Kosakata dijaga; dasar hitung ditulis; definisi berbeda tidak dijumlah | L | §C3 | |
| 473 | NPA | Temuan dimulai kesimpulan, lalu bukti, lalu sumber | L | §C2, §B5.5 | |
| 474 | NPA | Warna hanya di data, arti tetap per kategori | A | §B1.3 | Kategori jenis bencana |
| 475 | NPA | Satu keluarga huruf, angka tabular, skala berjenjang | A | §B2 | |
| 476 | NPA | Satu sistem desain bertoken untuk semua keluaran | L | §B pembuka, tema.json | |
| 477 | NPA | Kuadran indikator, heatmap kab, small multiples, kartu wilayah | A | §B5.9, §B5.8 | Statis di DOCX, interaktif di web |
| 478 | NPA | Grafik membawa keterangan cara baca dan definisi | L | §B5.10, §B5.9, D-21 | |
| 479 | NPA | Rincian di laci samping, tautan sebagai domain | A | §B6 | Hanya web |
| 480 | NPA | Rekomendasi quick win: pemilik, tenggat, dasar, dampak | L | §B5.13 | Horizon 100 hari |
| 481 | NPA | Lubang data disebut berikut K/L pemegangnya | L | §A4 butir 8 | |
| 482 | NPA | Status draf, cara kutip, estimasi berlabel, usulan ditandai | L | §A3.4 kolofon, §C6.2 | |
| 483 | NPA | Emoji sebagai ikon navigasi | T | §C1, D-3 | Nol emoji |
| 484 | NPA | Cangkang aplikasi sidebar 256px | A | §B6 | Hanya web |
| 485 | MKL | Seksi pertama "Vonis" | L | §A3.4, §A2 | Ringkasan dibuka kesimpulan |
| 486 | MKL | Seksi bernomor, judul pernyataan, urutan vonis ke sumber | A | §A4, §B4 | Nomor bab Word |
| 487 | MKL | Kolom vonis pil kosakata tetap | A | §B5.7 tabel perbandingan | |
| 488 | MKL | Fase bertanggal bertarget terukur | A | §B5.12, §B5.13 | |
| 489 | MKL | Tabel risiko: Risiko, Level, Mitigasi | L | §B5.7, §B5.11 | |
| 490 | MKL | Angka tidak pasti sebagai rentang bersatuan | L | §C4, §B5.10 | |
| 491 | MKL | Daftar sumber, kolofon tanggal dan metode | L | §B5.17, §A3.4 | |
| 492 | MKL | Rentang dengan "sampai", penegasan kapital | A | §C4 | En dash di angka; tanpa kapital penegas |
| 493 | MKL | Tiga keluarga huruf, kolom 780px | T | §B2 | Roboto; prinsip lebar baca saja |
| 494 | MKL | Kotak vonis bergaris kiri aksen, daftar bernomor | A | §B5.5 | |
| 495 | SPG | Kop: lingkup, judul, tujuan, Berlaku, Dasar hukum, Revisi | L | §A3.4 kolofon | |
| 496 | SPG | Koreksi premis di awal | L | §B5.5, §C1 | |
| 497 | SPG | Kotak "vonis" bahaya dan "catat" lembaga | A | §B5.5 | |
| 498 | SPG | Tabel resmi: kepala kapital kecil, angka tabular, total, legenda, sumber + tanggal | L | §B5.7 | |
| 499 | SPG | Nomor dokumen dan blok pengesahan berjenjang | A | §A3.4 kolofon | Tata naskah BNPB; tanpa nama tim (K1) |
| 500 | SPG | Contoh angka disertai uji ambang dan selisih | A | §B5.11, §B5.7 | Ambang siaga, kebutuhan air |
| 501 | SPG | Judul "X dari Y" + rincian + total + vonis per baris | L | §C2, §B5.7 | |
| 502 | SPG | Prosedur bernomor ditutup batas yang tidak boleh dilewati | A | §B5.12 | |
| 503 | SPG | Serif judul, mono nilai | T | §B2 | Roboto saja |
| 504 | SPG | Satu warna lembaga, tiga warna status | A | §B1 | Navy BNPB |
| 505 | SPG | Mode gelap, responsif | A | §B6 | Hanya web |
| 506 | SPG | Contoh disajikan sebagai baku dengan dasar hukum dan revisi; yang belum dicakup disebut | L | §A3.4, §A6 | |
| 507 | SIN | P1. Ringkasan bertingkat: pesan kunci 1 hlm, infografik sekilas 1 hlm, ringkasan eksekutif, lalu bab | A | §A3.4, §B5.26 | Pesan Kunci di halaman pertama Ringkasan Eksekutif; PDF ringkas = lapis sekilas |
| 508 | SIN | P2. Halaman kerangka satu halaman: pilar, sasaran, program bernomor; nomor program dipakai ulang di bab, matriks, dan daftar isi | A | §B5.12 | Latar putih |
| 509 | SIN | P3. Pilar, lalu aksi bernomor, lalu kotak "dampak bila tidak ditangani" berangka, lalu aksi cepat dengan instansi penanggung jawab | L | §B5.12, §B5.5 | |
| 510 | SIN | P4. Satu ancaman satu templat halaman dengan kepala tetap (skenario, asumsi, variasi, kebutuhan kapasitas per aktor, pemulihan, kelompok rentan) | L | §B5.11 | |
| 511 | SIN | P5. Dasbor wilayah bertemplat identik 1–2 hlm, hanya nama wilayah dan angka yang berganti | L | §B5.8 | Di lampiran |
| 512 | SIN | P6. Pembuka bab berisi kotak pesan kunci bab 3–5 butir berangka | A | §B5.3 | ≤ 3 butir |
| 513 | SIN | P7. Pembuka bab halaman penuh berwarna atau foto | T | §B5.2 | Batas halaman; halaman gelap hanya sampul dan pembatas Lampiran |
| 514 | SIN | P8. Daftar isi berubin bergambar, atau tanpa titik penuntun | A | §B2 | Titik penuntun tetap |
| 515 | SIN | P9. Lampiran katalog langkah dengan asumsi dan sumber tiap angka; lampiran per wilayah; lampiran rujukan kerangka | L | §B5.8 | Tanpa biaya (K6) |
| 516 | SIN | P10. Nomor objek per bagian: ringkasan, bab, lampiran | A | §B4 | Gambar RE.1, Tabel A.1 |
| 517 | SIN | P11. Peta bernomor sendiri ("Map 12") dengan Daftar Peta | A | §0.2 T11 | Bawaan: seri Gambar |
| 518 | SIN | P12. Grid asimetris dengan kolom samping untuk catatan kaki, kartu angka, dan keterangan | A | §B3 | Prinsip lebar penuh saja; satu kolom |
| 519 | SIN | P13. Isi dua kolom atau halaman A4 lanskap | T | §B3 | K2 |
| 520 | SIN | P14. Rujukan silang berwarna yang bisa diklik "(See Exhibit 2.)" | A | §B4 | Cross-reference Word |
| 521 | SIN | P15. Kata pengantar bertanda tangan pimpinan | A | §A3.4 | Draf untuk Kepala BNPB |
| 522 | SIN | P16. Halaman pesan kunci: 6–10 temuan, tiap temuan ikon putih dalam lingkaran solid dan satu temuan berangka 2–4 baris | A | §B5.26 | 6–8 temuan, ≤ 3 baris, lingkaran `navy`, angka di depan |
| 523 | SIN | P17. Tiap paragraf dibuka satu kalimat temuan tebal, lalu bukti berangka; pembaca bisa membaca kalimat tebal saja | L | §B2, D-26 | |
| 524 | SIN | P18. Temuan bernomor berkelompok (A.1, B.2.3) ditutup tingkat keyakinan dan rujukan bab | A | §B5.26, §B5.13, D-27 | Huruf kelompok = pertanyaan §A2 |
| 525 | SIN | P19. Ringkasan berbentuk pertanyaan lalu jawaban per bagian | A | §B5.26 | Kepala kelompok temuan |
| 526 | SIN | P20. Infografik sekilas: angka sekarang, proyeksi, pendorong, kontribusi per bahaya, peta per wilayah; peta mini per bahaya berpasangan dengan satu kalimat berangka | A | §A3.1 | Latar putih |
| 527 | SIN | P21. Ringkasan prosa tanpa angka sorotan, atau paragraf meta "Bab 1 membahas" | T | §A3.4 | Angka kunci di halaman pertama |
| 528 | SIN | P22. Judul gambar = satu kalimat temuan, sering berangka ("judul aksi") | A | §C2, §0.2 T14 | Bawaan: keterangan deskriptif stabil; temuan berangka di kalimat pembuka tebal |
| 529 | SIN | P23. Judul berantai antarpanel ("…so its concentration is also growing") | A | §C2 | Tiap judul bermakna sendiri |
| 530 | SIN | P24. Judul studi kasus berupa hasil berangka | L | §B5.30 | |
| 531 | SIN | P25. Judul atau halaman bergaya slogan ("pays off", "There is no time to waste", kutipan besar) | T | §C1, §B5.30 | Larangan slogan |
| 532 | SIN | P26. Anotasi langsung di grafik: label seri di ujung garis, panah lengkung ke titik yang dijelaskan | L | §B5.10 | |
| 533 | SIN | P27. Garis tegak tipis berlabel kejadian di deret waktu | L | §B5.10 | |
| 534 | SIN | P28. Catatan bias pelaporan di bawah grafik jumlah kejadian | L | §B5.10 | |
| 535 | SIN | P29. Normalisasi per 100.000 penduduk dan per PDB di samping angka mutlak; rata-rata per dekade | L | §C4, §B5.10 | |
| 536 | SIN | P30. Kutipan tarik yang mengulang kalimat isi; kotak teks di atas foto | T | §C1 | Teks tanpa informasi baru dibuang |
| 537 | SIN | P31. Bahasa keyakinan terkalibrasi di tiap kalimat dan rujukan bab di akhir paragraf | A | §C6.2 | Label keyakinan dan rujukan bab |
| 538 | SIN | P32. Urutan tetap: label nomor, judul temuan, pil kanan atas (skenario, sasaran), grafik, lalu catatan dan sumber | A | §B5.10 | Sumber sebelum Catatan (D-7) |
| 539 | SIN | P33. Baris subjudul berisi nama indikator, satuan, dan periode di bawah judul | T | §B5.10 | Kartu Insight melarang subjudul dan satuan |
| 540 | SIN | P34. Legenda di atas grafik, atau label seri langsung di area grafik | L | §B5.10 | |
| 541 | SIN | P35. Sumbu Y dan garis kisi di semua grafik | T | §B5.10 | Batang tanpa sumbu Y |
| 542 | SIN | P36. Panel berganda berlabel (a)(b)(c) dengan satu legenda dan skala sama | L | §B5.10 | |
| 543 | SIN | P37. Paragraf "cara membaca gambar" untuk grafik yang tidak lazim | A | §B5.10 | Di baris Catatan |
| 544 | SIN | P38. Pil sasaran di pojok grafik yang menunjuk target yang diukur ("SDG 4.2") | A | §B5.10 | Sasaran Sendai, kode program |
| 545 | SIN | P39. Grafik dan peta pihak ketiga ditempel apa adanya | T | §A5 | Digambar ulang dari data |
| 546 | SIN | P40. Teks grafik 5,9–7 pt, sumber 6 pt abu sangat terang | T | §B2 | ≥ 8 pt |
| 547 | SIN | P41. Tiga jenis label objek (Figure, Chart, Table) | T | §B4 | Gambar dan Tabel saja |
| 548 | SIN | P42. Daratan abu, satu warna sorot untuk kategori yang dibahas, laut putih, legenda, skala dan utara | L | §B5.9 | Tidak merah; kelas IRBI tetap ramp api (T8) |
| 549 | SIN | P43. Peta kecil berganda per tahun atau skenario, satu legenda, kelas sama di semua panel | L | §B5.9, D-29 | |
| 550 | SIN | P44. Peta indeks studi kasus: bulatan bernomor di peta, tabel nomor dan judul di bawahnya | L | §B5.9 | |
| 551 | SIN | P45. Koroplet dan tabel peringkat berdampingan; kurung kelas di samping tabel sekaligus menjadi legenda dan hitungan | L | §B5.9 | |
| 552 | SIN | P46. Koroplet hanya untuk rasio atau laju; simbol proporsional untuk total | L | §B5.9 | |
| 553 | SIN | P47. Inset perbesaran bergaris abu untuk kawasan padat | L | §B5.9 | |
| 554 | SIN | P48. Label wilayah dengan angka dan garis penunjuk ("22% of GDP WS Ciliwung-Cisadane"); hanya wilayah terbesar yang diwarnai dan dilabel | A | §B5.9 | Pil putih, angka tegak |
| 555 | SIN | P49. Legenda berupa pil warna per wilayah dengan satu kalimat arah strategi | A | §B5.9 | Nomor dalam bulatan `navy`, tanpa warna per wilayah; kalimat arah ke tabel |
| 556 | SIN | P50. Peta bahaya disandingkan peta keterpaparan; elips tipis menandai kawasan padat dengan angka besar | A | §B5.9 | Anotasi pil putih |
| 557 | SIN | P51. Peta pesan utama: peta pucat dengan 4–5 lokasi berketerangan pendek | T | §B5.9 | Gaya kampanye; strukturnya sudah tercakup P44 |
| 558 | SIN | P52. Laut biru, bayangan relief, skala pelangi atau ungu, pai di atas peta, legenda 30 warna | T | §B5.9, §B1.6 | Laut putih, tanpa ungu |
| 559 | SIN | P53. Legenda gradien kontinu | T | §B1.4 | Kelas diskret |
| 560 | SIN | P54. Pita persentil 25–75 dengan median tebal dan garis tegak tahun sekarang | A | §B5.10 | Tanpa garis per model |
| 561 | SIN | P55. Batang rentang rendah–tinggi dengan median; batang gelap nilai tinggi, muda nilai rendah | L | §B5.10 | |
| 562 | SIN | P56. Garis solid untuk data, titik-titik untuk proyeksi, arsir untuk estimasi atau data tidak lengkap | A | §B5.10 | Pil belum diuji balik |
| 563 | SIN | P57. Kotak skenario: asumsi tiap skenario dan small multiples deviasi dari dasar | A | §B5.10 | Warna arah §B1.5; di kajian air `teks-2` berlabel kata |
| 564 | SIN | P58. Kotak "dampak bila tidak ditangani" berisi butir dengan angka tebal | A | §B5.5 | Panel berpita |
| 565 | SIN | P59. Tabel perkiraan lama lawan baru: rentang "sekitar", asumsi tertulis, stempel skenario | L | §B5.7 | |
| 566 | SIN | P60. Tabel skenario: kolom = skenario, sel digabung bila nilainya sama di semua skenario | L | §B5.7 | |
| 567 | SIN | P61. Efek tindakan: pasangan batang kondisi sekarang lawan bila target tercapai | A | §B5.11 | Turun biru |
| 568 | SIN | P62. Matriks kemungkinan × dampak satu warna dan kartu mini per ancaman dengan garis silang rentang keyakinan | L | §B5.27, §B5.11 | |
| 569 | SIN | P63. Bara risiko per skenario respons dengan titik keyakinan tiap transisi | A | §B5.10 | 5 kelas ramp, pil Penilaian pakar |
| 570 | SIN | P64. Strip kelas per skenario × tahun dengan penanda tahun sekarang | A | §B5.10 | Kelas diskret |
| 571 | SIN | P65. Banyak sumber digambar bersama sebagai tampilan ketidakpastian | A | §B5.10 | Sumber lain garis tipis |
| 572 | SIN | P66. Tabel nilai "± ketidakpastian" dengan baris pembanding bertint | A | §B5.7 | Baris pembanding Bold |
| 573 | SIN | P67. Kolom proyeksi berlatar tint dibedakan dari kolom aktual | A | §B5.7 | |
| 574 | SIN | P68. Kotak temuan bernomor dengan kalimat temuan di baris pertama | A | §B5.5 | Label Kotak lewat Caption |
| 575 | SIN | P69. Studi kasus satu halaman bertint dengan empat pertanyaan tetap: masalah apa, siapa yang mengerjakan, bagaimana, apa hasilnya | L | §B5.30 | |
| 576 | SIN | P70. Kotak studi kasus berisi grafik dan sumber di dalam kotak | A | §B5.30 | Tint netral |
| 577 | SIN | P71. Kotak perbandingan dengan kajian sebelumnya | A | §B5.5 | Kotak Catatan, bukan panel gelap |
| 578 | SIN | P72. Grafik di kiri dan kolom pesan kunci 3–4 butir di kanan dalam satu blok | A | §B5.10 | PDF ringkas saja, ≤ 3 butir; di DOCX kalimat pembuka tebal |
| 579 | SIN | P73. Kotak metode bergaris tipis; daftar pertanyaan pemangku kepentingan sebagai pengganti rekomendasi | A | §B5.5, §B5.13 | Metode jadi kotak Catatan; pertanyaan pengganti rekomendasi tidak dipakai |
| 580 | SIN | P74. Foto pimpinan dan kotak kata pimpinan di halaman pesan kunci; kolom testimoni dan sidebar kisah personal (JWP hlm 40 dan 48, UNICEF "Youth perspectives", tanpa PNG bukti) | T | §B5.15, §C1 | Register formal |
| 581 | SIN | P75. Kartu rekomendasi berkode: masalah singkat di kiri, kalimat aksi tebal dan rincian abu di kanan, penilaian urgensi dan dampak | A | §B5.13 | Ditambah pemimpin, pendukung, tahun; urgensi = pil horizon |
| 582 | SIN | P76. Matriks rekomendasi dengan penanggung jawab, tenggat, dan target per pilar | A | §B5.13 | Tegak |
| 583 | SIN | P77. Matriks prioritas urgensi × dampak satu halaman, didahului kunci penilaian | A | §B5.28 | Kisi kode, tanpa gelembung |
| 584 | SIN | P78. Tabel pemrograman: kode, pengelola, proyek, lalu kolom tahun dengan sel huruf tahap berwarna dan legenda | A | §B5.29, §0.2 T12 | Hanya bila pemilik setuju, DOCX saja |
| 585 | SIN | P79. Rekomendasi per aktor: paragraf diawali nama aktor | A | §B5.13 | Chip aktor berikon |
| 586 | SIN | P80. Matriks strategi tahap × pilar berisi butir aksi; dial jarum untuk prioritas | A | §B5.13 | Pil native, tanpa dial |
| 587 | SIN | P81. Matriks langkah × jenis bahaya, sel skala 4 tingkat, huruf merujuk studi kasus | A | §B5.22 | Kode program, tint rumah |
| 588 | SIN | P82. Halaman daftar aksi bernomor sebagai pembuka bab rekomendasi | A | §B5.13 | Ikon garis |
| 589 | SIN | P83. Tabel status sekarang lawan target bertenggat | L | §B5.19 | |
| 590 | SIN | P84. Matriks kelayakan opsi: opsi × dimensi kelayakan, ukuran titik dan keyakinan | A | §B5.7 tabel perbandingan | Tanpa biaya, tegak |
| 591 | SIN | P85. Kronologi kebijakan dua sisi dengan tahun tebal dan kode jenis regulasi | L | §B5.31 | |
| 592 | SIN | P86. Bagan kelembagaan bertingkat; diagram siapa menanggung risiko | A | §B5.23 | Chip berikon |
| 593 | SIN | P87. Rekomendasi berupa prosa tanpa kode, penanggung jawab, atau tahun | T | §B5.13 | Tidak bisa ditindaklanjuti |
| 594 | SIN | P88. Kurva biaya langkah (lebar = volume, tinggi = biaya per satuan) dan neraca dana kebutuhan lawan anggaran dalam rupiah | T | §A6, K6 | Tanpa biaya proyek; strukturnya untuk neraca air |
| 595 | SIN | P89. Satu keluarga huruf sans di seluruh laporan; GAR terutama Roboto, WDR memakai Roboto di grafik | L | §B2 | Bold, tanpa Black |
| 596 | SIN | P90. Hierarki dari bobot dan warna; huruf terbesar halaman isi 12–13 pt | L | §B2 | |
| 597 | SIN | P91. Navy + satu aksen + abu pembanding; navy McKinsey `#051C2C` identik dengan navy rumah BNPB | L | §B1.1 | Aksen oranye atau biru |
| 598 | SIN | P92. Isi satu kolom 10–10,5 pt rata kiri-kanan, penomoran bertingkat polos | L | §B2 | |
| 599 | SIN | P93. Kapital berspasi untuk kepala kolom, legenda, dan kaki berjalan; judul bagian kapital | A | §B2 | Hanya pil, kepala kolom, label pita |
| 600 | SIN | P94. Kode warna per bab yang mengalir ke subjudul, grafik, dan kotak | T | §B1.8 | Warna = makna |
| 601 | SIN | P95. Palet banyak warna, pita climate stripes, hijau ADB, merah murni dan biru bawaan Office | T | §B1.6 | Palet BNPB final |
| 602 | SIN | P96. Huruf Light tipis untuk isi; serif untuk judul | T | §B2 | Regular dan Bold |
| 603 | SIN | P97. Ikon putih dalam lingkaran solid sebagai penanda temuan | L | §B5.26, §B5.14 | |
| 604 | SIN | P98. Daftar berikon bernomor: lingkaran ikon, lencana nomor, judul pendek, contoh berangka | L | §B5.6 | |
| 605 | SIN | P99. Kepala kolom atau kepala grup baris berupa ikon di ubin atau lingkaran | L | §B5.14 | |
| 606 | SIN | P100. Ilustrasi stok, ikon isometrik, kiasan, tulisan melengkung, ilustrasi lanskap | T | §B5.14 | Ikon garis datar |
| 607 | SIN | P101. Foto beratribusi dengan keterangan tempat dan waktu, satu foto membawa informasi | A | §B5.15 | Commons |
| 608 | SIN | P102. Foto anak atau korban, potret pejabat di halaman isi | T | §B5.15 | Etika kemanusiaan, UU 27/2022 |
| 609 | SIN | P103. Sampul foto di atas dan blok warna berisi judul di bawah | L | §B5.1 | |
| 610 | SIN | P104. Tipologi wilayah: wilayah dikelompokkan per tipe dengan pita grup, lalu profil dan rekomendasi per tipe | A | §B5.7 | Pita grup, tanpa warna per tipe |
| 611 | SIN | P105. Diagram struktur indeks dan pohon indikator | A | §B5.23 | Native, ≥ 8 pt |
| 612 | SIN | P106. Tabel peringkat dengan nilai dan titik warna kelas, kepala kolom berpita kelas | A | §B5.7 | Kolom jiwa terpapar |
| 613 | SIN | P107. Diagram konsep bertahap: dua kurva dengan fase bertanda garis putus dan label fase | L | §B5.23 | Dua warna rumah |
| 614 | SIN | P108. Tabel preseden: kejadian besar sebagai kolom, besaran yang sama sebagai baris, kolom yang sedang dikaji diberi tint | L | §B5.7 | |
| 615 | SIN | P109. Kartu angka: nilai besar berwarna makna, label pendek, kadang pangsa terhadap total | A | §B5.4 | Climate stripes dibuang |
| 616 | SIN | G1–G25. Pilih grafik menurut pesan: 24 pesan dan daftar terlarang (FT Visual Vocabulary dan contoh laporan) | A | §B5.10, D-28 | Disaring dengan selera grafik pemilik |
