# Anti-slop dan anti-AI untuk naskah dan deck

> Salinan kata demi kata dari `data/kajian-bnpb/ANTI-SLOP.md` dan `data/kajian-bnpb/TAMBAHAN-ANTI-AI.md`; daftar kata terlarang Inggris di `scripts/banned-ai-words.txt`, diambil 26 Okt 2026 untuk skill deck-bnpb. Jalur repo di dalam teks (mis. `data/kajian-bnpb/...`, `bangun/pptx/...`, `qa/periksa.py`) dipetakan ke skill di `references/peta-jalur.md`. Aturan tidak diringkas; bila ada yang bertentangan, urutan otoritas di `keputusan-pemilik.md` berlaku.

# Aturan anti-slop kajian BNPB

Versi 2, 23 Oktober 2026, sesudah uji adversarial (`qa/sampel_adversarial/`). Berlaku untuk naskah
dan keluaran dua kajian: DOCX Grand Design Ketahanan Air Pulau Jawa (isi ±110 halaman), DOCX Grand
Design Mitigasi Bencana Indonesia (isi ±150 halaman), dan deck PPTX masing-masing. Pemilik menerima
keluaran ini tanpa memeriksanya sendiri, jadi berkas ini dan detektornya adalah pemeriksa terakhir
sebelum Kepala BNPB membaca.

"Slop" di sini berarti teks atau desain yang bentuknya meniru laporan tetapi isinya kosong:
frasa yang bisa ditempel ke laporan apa pun, klaim tanpa angka dan sumber, ritme yang dibuat mesin,
hiasan tanpa fungsi. Ukurannya satu: apakah kalimat atau unsur itu membawa fakta yang bisa diperiksa.

**Urutan otoritas.** KEPUTUSAN.md, Buku Pegangan (bab Angka & copy dan Selera presentasi),
KERANGKA.md, PEDOMAN-DESAIN.md bagian C dan D, NASKAH-SPEK.md, lalu berkas ini. Bila berkas ini
bertentangan dengan yang di atasnya, yang di atas berlaku dan berkas ini dibetulkan.

**Sumber adaptasi.** `riset/anti-slop/miqdad` (antislop.md, skill antislop-copywriting,
antislop-human, antislop-ui), `riset/anti-slop/rand/skills/anti-slop` (text-patterns.md,
design-patterns.md, detect_slop.py), skill lokal `anti-ai-checker` dan `humanizer` (berbasis
"Signs of AI writing" WikiProject AI Cleanup), `docs/multi-bencana/COPYWRITING.md`. Ketiga sumber
pertama ditulis untuk iklan dan antarmuka berbahasa Inggris; yang diambil hanya pola yang juga
muncul di laporan ilmiah berbahasa Indonesia, lalu padanan Indonesianya ditambahkan.

## 1. Cara membaca

- **Kode S-n** diperiksa mesin oleh `qa/slop.py`. **Kode M-n** diperiksa penyunting manusia atau
  subagent pemeriksa (bagian 6). Kode S di berkas ini dan di `slop.py` harus sama;
  `qa/uji_slop.py` gagal bila berbeda.
- **Tingkat dan bobot.** Kritis 20 (satu temuan = gagal), tinggi 5, sedang 3, rendah 1. S-30 dan
  S-38 berbobot 2.
- **Skor** = jumlah bobot temuan per 1.000 kata prosa di satu bab (DOCX), satu berkas naskah, atau
  satu slide. Penyebut paling sedikit 500 kata supaya slide dan bab pendek tidak lolos hanya karena
  pendek. Skor maksimal 100.
- **Yang dicari adalah gugus pola.** Satu "namun" atau satu kalimat pasif bukan slop. Dua pola frasa
  berbeda di satu paragraf dengan bobot 3 atau lebih sudah gugus (S-39, tinggi), berapa pun panjang
  babnya, supaya slop tidak lolos karena diencerkan bab yang panjang. Pola kritis tetap mutlak:
  tidak ada pengecualian untuk em dash, titik tengah, emoji, sisa percakapan chatbot, penanda
  isian, dan pembuka "era".
- **Daftar kata selalu tertinggal.** Slop baru selalu bisa ditulis dengan kata yang belum terdaftar.
  Yang menyapu luas adalah aturan bentuk: S-37 (paragraf tanpa angka dan rujukan), S-39 (gugus),
  dan sumber yang dinilai per kalimat (S-34). Penyunting (Tahap 2) tetap wajib.

## 2. Pola terlarang

Kolom "Benar" adalah ilustrasi bentuk kalimat: nama lembaga, besaran, dan tahun di sana bukan data
dan tidak boleh disalin. Angka ditulis sebagai `{n}`; di naskah, angka ditulis sebagai token
`{{angka:...}}` (NASKAH-SPEK bagian 8) dan rujukan sebagai `[@kunci]` dari `pustaka.json`, bukan
diketik.

### 2.1 Karakter dan tanda baca

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-1 | Em dash (U+2014) dan kerabatnya: garis horizontal U+2015, figure dash U+2012, tanda pisah dua dan tiga em U+2E3A dan U+2E3B, bentuk kecil dan vertikal U+FE31, U+FE32, U+FE58 | "Mitigasi [em dash] bukan respons [em dash] menurunkan korban." | "Mitigasi menurunkan korban skenario lebih banyak daripada respons darurat (analisis kepekaan Bab 6)." | kritis |
| S-2 | Titik tengah U+00B7 dan kerabatnya (U+2219, U+22C5, U+2027, U+30FB), butir putih U+25E6, butir garis U+2043, butir "•" di tengah teks | "IRBI 2024 [titik tengah] 38 provinsi" | "IRBI 2024, 38 provinsi" atau dua label terpisah | kritis |
| S-3 | Emoji dan simbol dekoratif: rentang U+1F000 ke atas, U+2600 sampai U+27BF, U+2B00 sampai U+2BFF; glif teknis yang dirender emoji (jam dan jam pasir U+231A, U+231B, U+23F0 sampai U+23F3, tombol U+23E9 sampai U+23EF dan U+25B6, kotak U+25FB sampai U+25FE, U+2139); penyambung U+200D. Segitiga arah diatur di bagian 3 | "[emoji roket] Peringatan dini aktif" | "Peringatan dini aktif di {n} kabupaten" | kritis |
| S-4 | Tanda pisah tiruan: "--" di antara kata; tanda hubung atau en dash berspasi di antara kata; en dash tanpa spasi di antara dua nama | "Bali – Nusa Tenggara", "Bali–Nusa Tenggara", "latihan rutin - bukan spanduk" | "Bali dan Nusa Tenggara"; en dash hanya rentang: "2015–2025", "Jun–Okt", "ruas Cilegon–Gresik" | sedang |
| S-5 | Tanda seru di prosa | "Evakuasi harus segera dilakukan!" | "Evakuasi perlu selesai sebelum muka air naik {n} cm, menurut ambang BBWS." | sedang |

### 2.2 Sisa mesin

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-6 | Sisa percakapan chatbot: "Semoga bermanfaat", "Sebagai model bahasa", "Jangan ragu untuk bertanya", "I hope this helps" | "Berikut temuan utama. Semoga bermanfaat." | Hapus. Naskah berdiri sendiri. | kritis |
| S-7 | Penanda isian: "lorem ipsum", TODO, TBD, "[DATA]", "[SUMBER]", "XX%" | "Korban mencapai [DATA] jiwa." | Token angka dari `data/angka.json`, atau hapus kalimatnya. | kritis |

### 2.3 Pembuka klise

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-8 | Pembuka "era": "Di era yang serba cepat", "Di zaman serba digital", "In today's fast-paced world" | "Di era yang serba cepat ini, informasi bencana harus cepat sampai." | "Peringatan dini tsunami BMKG tiba di sirene {n} menit setelah gempa (BMKG, {n})." | kritis |
| S-42 | Pembuka klise di 50 kata pertama tiap bab dan tiap subbab, karena pimpinan membaca subbab terpisah: "Di era", "Dalam lanskap", "Seiring perkembangan zaman", "Tidak dapat dipungkiri", "Pada hakikatnya", "Sebagaimana kita ketahui", "Dalam rangka", "Perlu diketahui", padanan Inggris "In today's", "In the realm of", "When it comes to", dan pola S-8 serta S-9 | "## Profil Risiko" lalu "Dalam rangka menyusun profil, BPBD mencatat {n} kejadian." | "BPBD mencatat {n} kejadian banjir di Demak pada 2024 (DIBI)." | tinggi, dihitung di vonis ambang |
| S-9 | "Tidak dapat dipungkiri", "Seiring berjalannya waktu", "Dewasa ini", "Sudah menjadi rahasia umum", "Di era digital", "Dalam lanskap kebijakan", "Di tengah dinamika", "Sejak dahulu kala", kalimat yang dibuka "Indonesia merupakan negara rawan bencana" atau "Sebagai negara kepulauan/yang/dengan ...", "Indonesia dikenal sebagai negara ..." | "Tidak dapat dipungkiri bahwa Indonesia merupakan negara yang rawan bencana." | "WorldRiskReport 2025 menempatkan Indonesia di peringkat ketiga." | tinggi, sebagian sedang |

"Lanskap" dalam arti harfiah (lanskap gambut, ekologi lanskap) tidak ditandai.

### 2.4 Kata dan frasa kosong

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-10 | Inflasi makna: "memainkan peran penting/krusial/vital/strategis", "berperan penting", "tidak terpisahkan", "bagian integral", "garda terdepan", "tulang punggung", "ujung tombak", "menegaskan pentingnya", "mencerminkan komitmen", "Hal ini menunjukkan", "babak baru", "langkah strategis", "secara holistik", "secara lebih terpadu", "pendekatan komprehensif", "sinergi yang kuat", "seluruh pihak", "para pemangku kepentingan", "kontribusi nyata", "wujud komitmen", "upaya berkelanjutan", "tidak terlepas dari", "motor penggerak", "di atas kertas", "plays a crucial role", "a testament to" | "BPBD memainkan peran yang sangat penting dalam penanganan banjir." | "BPBD Kabupaten Demak mengevakuasi {n} jiwa dalam {n} jam pertama banjir Maret 2024 (laporan BPBD)." | tinggi, sebagian sedang |
| S-11 | Bahasa promosi: "solusi jitu/tepat/komprehensif", "revolusioner", "kelas dunia", "spektakuler", "terobosan", "luar biasa", "dari hulu hingga hilir", "dari Sabang sampai Merauke", "hadir sebagai solusi", "cutting-edge", "seamless" | "Sistem ini hadir sebagai solusi jitu dari hulu hingga hilir." | "Sistem ini mengirim peringatan ke {n} desa di DAS Citarum; uji balik {n} mencatat POD {n}." | tinggi, sebagian sedang |
| S-12 | Kata kosong tunggal: holistik, komprehensif, sinergi, sinergis, transformatif, inovatif, optimal, krusial, esensial, fundamental, masif, integral, paripurna, terintegrasi, kolaboratif, akselerasi, resiliensi, multipihak, pentahelix; delve, tapestry, pivotal, robust, leverage, foster, underscore, vibrant. Bukan "maksimal" dan "berkelanjutan", yang punya pemakaian sah ("maksimal 2 JP", "pembangunan berkelanjutan") | "Diperlukan sinergi yang optimal." | "BNPB dan BBWS Pemali Juana berbagi data muka air tiap {n} menit sejak {n}." | rendah per kata |
| S-43 | Kata terlarang khas AI. Teks Indonesia: padanan daftar pemilik "mulus", "menavigasi", "mendalami", "menyelami", "memulai perjalanan", "memupuk", "mendayagunakan", "kokoh", "permadani". Teks Inggris: seluruh `riset/anti-slop/banned-ai-words.txt` (daftar pemilik, 182 baris). Kata Inggris di teks Indonesia dinilai S-38, sehingga "total" di prosa Indonesia bukan pelanggaran | "Kajian ini mendalami {n} kejadian banjir." | "Kajian ini menghitung {n} kejadian banjir per kabupaten." | sedang, dihitung di vonis ambang |
| S-13 | Kepadatan kata kosong S-12 lebih dari 5 per 1.000 kata dalam satu bab | (bab dengan 30 kata kosong dalam 4.000 kata) | Tulis ulang paragraf yang memuatnya dengan angka dan pelaku. | tinggi |
| S-14 | Penguat kosong: "sangat penting", "sangat menentukan", "sangat dibutuhkan", "sangat serius", "amat sangat", "sangat ... sekali", "benar-benar", "very important". Bukan "sangat kuat" dan "sangat tinggi", yang nama kelas resmi BMKG | "Data ini sangat penting bagi perencanaan." | "Data ini menentukan lokasi {n} tangki air pada kemarau {n}." | sedang, "benar-benar" rendah |
| S-15 | Frasa bertele-tele: "adalah merupakan", "agar supaya", "demi untuk", "sejak dari", "dalam rangka", "yang mana", "in order to", "due to the fact that"; "dalam rangka/upaya mewujudkan (menciptakan, membangun, mendorong, mengoptimalkan)" sedang | "Dalam rangka meningkatkan kesiapsiagaan, latihan adalah merupakan kegiatan rutin." | "Untuk meningkatkan kesiapsiagaan, BPBD menggelar latihan {n} kali setahun." | rendah, sebagian sedang |

### 2.5 Meta-komentar

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-16 | Teks yang membicarakan dirinya: "Bab ini akan membahas", "Pada bagian ini akan diuraikan", "Uraian berikut memetakan", "Perlu diketahui bahwa", "Penting untuk dicatat", "Penting digarisbawahi", "Hal yang patut dicermati", "Sebagaimana telah disebutkan sebelumnya", "Berdasarkan uraian di atas", "terlihat jelas bahwa", "Menariknya", "Ironisnya", "Seperti yang kita ketahui bersama", "Berikut adalah penjelasan", "Dalam tulisan ini, penulis", "In this chapter, we will", "Let's dive in", "It is important to note" | "Bab ini akan membahas profil risiko. Perlu diketahui bahwa data berasal dari InaRISK." | "Sebanyak 168 kabupaten/kota berada di kelas risiko tinggi pada 2023 (InaRISK BNPB)." | tinggi, sebagian sedang; "Bab ini menguraikan" rendah |

### 2.6 Struktur khas mesin

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-17 | Tiga-serangkai abstrak: tiga sifat atau kata benda abstrak sekaligus, termasuk nominalisasi program ("penguatan kelembagaan, perluasan layanan, serta pendalaman kemitraan") | "Penyaluran bantuan harus cepat, tepat, dan akurat." | "Bantuan air bersih tiba paling lambat {n} jam setelah status siaga darurat ditetapkan." | tinggi |
| S-18 | Tiga-serangkai gaya, per kemunculan; ambangnya nol (Buku Pegangan bab Angka & copy). Di DOCX dan naskah, daftar bertiga yang tiap butirnya memuat nama diri atau angka tidak dihitung, begitu pula set istilah resmi `TIGA_RESMI` di `slop.py` (tahap prabencana, tanggap darurat, pascabencana menurut UU 24/2007 Pasal 33; komponen bahaya, kerentanan, kapasitas IRBI). Di deck hanya set istilah resmi itu yang dikecualikan (subjudul kajian mitigasi, KEPUTUSAN T10). "X, termasuk Y dan Z" bukan tiga-serangkai. Tiga-serangkai abstrak dinilai S-17 | "Kajian mencakup air baku, irigasi, dan bendungan." | "Kajian mencakup lima komponen air; Tabel 1.1 merincinya." | bobot 0 di skor; dihitung di vonis ambang (bagian 6.2) |
| S-40 | Titik dua lebih dari 20 per 1.500 kata paragraf isi (untuk bab di bawah 1.500 kata, 20). Label "Sumber:", "Catatan:", "Keterangan:", keterangan gambar dan tabel, jam, rasio angka, dan URL tidak dihitung | Dua puluh dua kalimat "Desa {n}: {n} rumah terendam." dalam satu bab pendek | Kalimat utuh: "Banjir merendam {n} rumah di {n} desa (BPBD, {n})." | sedang, dihitung di vonis ambang |
| S-19 | Kontras retoris: "bukan sekadar X", "tak sekadar X, tetapi Y", "lebih dari sekadar", "alih-alih sekadar", "bukan soal X, melainkan Y", "bukan X, melainkan Y", "bukan lagi X, melainkan Y", "tidak hanya X, tetapi juga Y", "tidak terletak pada X, tetapi pada Y", kalimat yang dibuka "Tak hanya itu", "not just X, but Y"; di teks slide juga "X, bukan Y" | "Mitigasi bukan sekadar program, melainkan sebuah keniscayaan." | "Bangunan tahan gempa di {n} kabupaten menurunkan korban skenario gempa dari {n} menjadi {n} jiwa (analisis kepekaan Bab 6)." | tinggi, sebagian sedang |
| S-20 | Simpulan moral dan aforisme: "adalah kunci", "memegang kunci", "kunci keberhasilan", "menjadi fondasi", "masa depan yang lebih baik/tangguh", "hari esok yang lebih aman", "generasi berikutnya", "bukan lagi pilihan", "keniscayaan", "harga mati", "tidak bisa ditawar", "tidak bisa lagi ditunda", "tidak lahir dalam semalam", "setapak demi setapak", "investasi bagi keselamatan", "tidak ada X tanpa Y", "is key to", "the future looks bright"; sedang: "pengingat pahit", "pelajaran berharga", "luka mendalam", "lingkaran setan", "kesempatan emas", "berjalan beriringan". Bukan "modal sosial", konsep yang dipakai Renas PB | "Kesiapsiagaan adalah kunci menuju masa depan yang lebih tangguh." | Hapus. Paragraf selesai pada fakta terakhir. | tinggi, sebagian sedang |
| S-21 | Kalimat penutup bergaya di akhir paragraf: dibuka "Pada akhirnya", "Singkatnya", "Intinya", "Sejatinya", "Inilah", "Di sinilah", "Hanya dengan", "Ultimately"; juga "Dengan demikian", "Oleh karena itu", "Karena itu", "Ke depan", "Akhirnya", "Dengan kata lain", "Dengan begitu", "Melalui langkah ini", "Dengan kebersamaan/komitmen/sinergi ..." bila kalimat terakhir itu tanpa angka data dan tanpa sumber | "... Karena itu, persoalan ini perlu menjadi perhatian bersama." | Hapus kalimatnya, atau tutup dengan angka: "Dengan demikian, {n} dari {n} kabupaten/kota defisit air pada kemarau 2023 (BPS, 2020)." | tinggi |
| S-22 | Pertanyaan retoris di prosa, termasuk yang ditutup titik ("Pertanyaannya, sejauh mana ...", "Lantas, bagaimana ...") | "Apakah kita sudah siap menghadapi megathrust?" | "Baru {n} dari {n} kabupaten/kota di pesisir selatan Jawa yang memiliki rencana kontinjensi tsunami (BNPB, {n})." | sedang |
| S-23 | Personifikasi alam, data, dan lembaga: "alam murka", "bencana mengintai", "bencana datang mengetuk", "banjir tidak mengenal batas", "sungai seakan menagih", "angka memberi sinyal", "tanpa permisi", "data berbicara", "angka tidak berbohong", "ibu pertiwi menangis", "the data tells us" | "Alam sedang murka dan bencana mengintai." | "Curah hujan 9 Maret 2024 di Demak mencapai {n} mm/hari, kelas ekstrem BMKG." | tinggi |
| S-24 | Slogan, ajakan, dan sapaan: kalimat dibuka "Mari", "Ayo", "Saatnya", "Sudah saatnya", "Bersama kita"; "Kini saatnya", "Sudah waktunya", "bergandengan tangan", "bahu-membahu", "mulai besok", "mulai sekarang", "demi masa depan", "negara hadir", "kehadiran negara"; sedang: "jangan sampai", "perlu menjadi perhatian bersama", "perhatian serius", sapaan "kita semua", "Anda", "kamu" | "Mari bersama kita wujudkan Indonesia tangguh." | Rekomendasi berlembaga: "BNPB (Deputi Bidang Pencegahan) menetapkan standar latihan desa paling lambat {n}." | tinggi, sebagian sedang |
| S-25 | Kata hubung pembuka beruntun: dua kalimat bersebelahan sama-sama dibuka "Selain itu", "Lebih lanjut", "Di sisi lain", "Oleh karena itu", "Dengan demikian", "Namun", "Tak hanya itu", "Meski begitu", "Hanya saja", "Furthermore", "Moreover"; atau lebih dari 25% kalimat bab dibuka kata hubung | "Selain itu, 12 desa terendam. Lebih lanjut, 5 jembatan putus." | "Banjir merendam 12 desa dan memutus 5 jembatan." | sedang, kepadatan tinggi |
| S-26 | Tiga kalimat isi berturut dibuka kata yang sama, atau tiga paragraf berturut dibuka dua kata yang sama | "Banjir merendam 12 desa. Banjir memutus 5 jembatan. Banjir merusak 30 rumah." | "Banjir merendam 12 desa, memutus 5 jembatan, dan merusak 30 rumah." | sedang |
| S-27 | Butir berkepala tebal di semua tempat: 60% atau lebih butir daftar dibuka "**Label:**" | "- **Air baku:** cakupan perlu ditambah." (berulang) | Kalimat atau tabel. Label tebal hanya di kotak berlabel (bagian 3). | sedang |
| S-28 | Paragraf simetris: enam paragraf isi atau lebih di satu bab dengan koefisien variasi panjang di bawah 0,20, atau lima paragraf isi berturut (masing-masing 25 kata atau lebih) dengan koefisien variasi di bawah 0,10. Ambang 0,10 belum dikalibrasi pada bab nyata bergaya Isi Temuan; kalibrasi ulang di bab pertama yang memakainya | Lima paragraf masing-masing 30 kata dengan pola aspek, angka, "Meski begitu", "sehingga ... tetap menjadi ..." | Panjang paragraf mengikuti isi. | tinggi |
| S-29 | Panjang kalimat seragam: 12 kalimat atau lebih dengan koefisien variasi di bawah 0,25 | Dua belas kalimat sama-sama 9 kata | Selingi kalimat pendek berangka dengan kalimat penjelas. | sedang |
| S-30 | Kalimat lebih dari 45 kata | Satu kalimat memuat lima klausa dan tujuh butir | Pecah menjadi dua atau tiga kalimat. | rendah (2) |

### 2.7 Hedging

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-41 | Hedging lebih dari 2 per 1.500 kata prosa (untuk bab di bawah 1.500 kata, 2): frasa "perlu dicatat bahwa", "patut dicatat", "penting untuk diperhatikan", "dapat dikatakan bahwa" selalu dihitung; kata samar "tampaknya", "sepertinya", "agaknya", "kiranya", "barangkali", "mungkin", "cenderung", "diduga", "ditengarai", "disinyalir", "seolah", "seakan" dihitung bila kalimatnya tanpa angka data dan tanpa rujukan | "Curah hujan tampaknya naik. Banjir cenderung meluas. Longsor mungkin bertambah." | "Curah hujan Desember 2026 diprakirakan {n}% di atas normal (BMKG, prakiraan musim hujan 2026/2027)." | sedang, dihitung di vonis ambang |
| S-31 | Penanda ketidakpastian bertumpuk: dua penanda dalam jarak enam kata ("diperkirakan cenderung", "kemungkinan berpotensi"), atau tiga penanda berbeda atau lebih dalam satu paragraf 30 kata atau lebih ("berpeluang ... mungkin ... ditengarai"); "dapat berpotensi"; kata samar "tampaknya", "sepertinya", "agaknya", "boleh jadi", "ditengarai", "disinyalir", "could potentially", "may or may not". Bukan "relatif", karena "kelembapan relatif" istilah resmi | "Curah hujan diperkirakan cenderung naik dan dapat berpotensi memicu banjir." | "BMKG memprakirakan curah hujan Desember 2026 di atas normal di {n} zona musim (prakiraan musim hujan 2026/2027)." | sedang, kata samar rendah |

### 2.8 Klaim, angka, dan sumber

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-32 | "Signifikan" tanpa uji statistik di kalimat yang sama | "Kejadian banjir naik secara signifikan." | "Kejadian banjir naik dari {n} pada 2015 menjadi {n} pada 2024 (DIBI); uji Mann-Kendall p < 0,05." | sedang |
| S-33 | Kuantor kabur di kalimat tanpa angka data: berbagai, sejumlah, beragam, aneka, beberapa, sebagian besar, puluhan, ratusan, ribuan, jutaan, "banyak faktor/pihak/negara/kajian", various, several. Tahun tidak dihitung sebagai angka data | "Banjir rob melanda berbagai daerah pesisir pada 2024." | "Banjir rob melanda {n} kecamatan di Jakarta Utara, Semarang, dan Pekalongan pada 2024." | rendah |
| S-34 | Atribusi kabur di kalimat yang tidak memuat sumber: "para ahli menyatakan", "banyak kajian sepakat", "studi menunjukkan", "literatur internasional menunjukkan", "pengalaman di banyak negara membuktikan", "diyakini secara luas"; "konon" dan "kabarnya" selalu. Sumber dinilai per kalimat: satu sitasi di kalimat lain tidak membebaskannya | "Para ahli menyatakan megathrust selatan Jawa dapat terjadi kapan saja." | "PuSGeN (2017) memetakan segmen megathrust selatan Jawa dengan magnitudo maksimum M {n}." | tinggi |
| S-35 | Mengisi celah data dengan dugaan: "data terbatas, namun diduga...", "while details are limited" | "Data korban terbatas, namun diduga mencapai ratusan jiwa." | "Data korban kejadian ini tidak tersedia di DIBI; BPBD setempat memegang catatan lapangannya." | tinggi |
| S-36 | Presisi palsu: "500+ desa", "99,9%"; "100%" tanpa sumber | "Program menjangkau 500+ desa." | Angka persis dari sumber atau rentang estimasi berlabel. | sedang, "100%" rendah |
| S-37 | Paragraf isi 25 kata atau lebih tanpa satu pun angka data dan tanpa rujukan. Tahun tidak dihitung ("pada 2026" tidak cukup). Rujukan: `[@kunci]`, catatan kaki, token angka, label "Sumber:", sitasi "(Nama, 2023)" atau "Nama (2023)", nomor regulasi ("UU 24/2007", "Nomor 1 Tahun 2025"), "menurut BMKG". "Sumber daya air" dan "(Maret 2024)" bukan rujukan. Kata Pengantar, Prakata, dan Sambutan dikecualikan | "Pengelolaan sumber daya air di Pulau Jawa menghadapi tekanan yang kian berat dari tahun ke tahun..." | Setiap paragraf isi memuat angka atau rujukan (aturan positif 2). | tinggi |

### 2.9 Bahasa Inggris

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-38 | Kata Inggris yang punya padanan baku: stakeholder, framework, roadmap, timeline, output, outcome, impact, monitoring, mapping, assessment, early warning system, best practice, hotspot, worst case, real time, benchmark, resilience, preparedness, dan seterusnya (daftar lengkap di `PADANAN`, `slop.py`) | "Roadmap disusun bersama stakeholder." | "Peta jalan disusun bersama pemangku kepentingan." | rendah (2) |

Naskah berbahasa Inggris (bagian yang kata umum Inggrisnya lebih banyak daripada kata umum
Indonesia) tidak diperiksa S-38, tetapi tetap diperiksa padanan Inggris pola S-6 sampai S-35.

### 2.10 Gugus

| Kode | Pola | Salah | Benar | Tingkat |
| --- | --- | --- | --- | --- |
| S-39 | Gugus dalam satu paragraf: dua kode berbeda atau lebih dari S-5 sampai S-36 (kecuali S-13, S-18, dan S-25 sampai S-30) dengan jumlah bobot 3 atau lebih. Temuan tingkat paragraf, jadi tidak luntur di bab sepanjang apa pun | "Dalam rangka mewujudkan Indonesia tangguh, BNPB menempuh langkah strategis sebagai wujud komitmen pemerintah." (S-15 dan S-10) | Tulis ulang dari fakta: pelaku, angka, tempat, waktu, sumber. | tinggi |

## 3. Yang boleh, supaya tidak salah tangkap

- **Kalimat pasif** bila pelaku tidak relevan atau tidak diketahui, terutama di metodologi: "Data
  kejadian dibekukan per 23 Oktober 2026." Yang dilarang adalah pasif yang menyembunyikan pelaku
  yang diketahui (M-1).
- **"Bab ini" sekali**, di subbab Sistematika, dalam bentuk kini: "Bab ini menguraikan latar dan
  lingkup kajian." Mesin tidak menghitung "sekali": tiap kemunculan bernilai S-16
  rendah, dan penyunting menandai yang lebih dari sekali. Kalimat yang dibuka "Bab 2 ...",
  "Bab 3 ..." berturut-turut tidak dihitung S-26.
- **Istilah teknis tanpa padanan** (megathrust, El Niño, IOD, InaRISK) dipakai apa adanya, ditulis
  miring bila asing. Istilah asing yang punya padanan boleh muncul sekali per bab, miring, di
  dalam kurung sesudah padanannya: "skenario terburuk yang masuk akal (*reasonable worst case*)".
  Mesin memeriksa miring dan sekali per bab; letaknya di dalam kurung sesudah padanan dinilai
  penyunting.
- **Nama diri berbahasa Inggris**: *Sendai Framework for Disaster Risk Reduction*, WorldRiskReport,
  Delta Programme, *National Risk Register*.
- **Daftar bertiga yang faktual**, hanya di DOCX dan naskah (Buku Pegangan bab Angka & copy: daftar tiga
  yang faktual, nama diri atau angka, tidak dihitung): "Jawa Barat, Jawa Tengah, dan Jawa Timur"; "12 desa,
  5 jembatan, dan 30 rumah". Dua set istilah resmi diperlakukan sebagai nama: "bahaya, kerentanan, dan
  kapasitas" (komponen IRBI) dan "prabencana, tanggap darurat, dan pascabencana" (tahap penyelenggaraan
  menurut UU 24/2007 Pasal 33; "saat bencana" bukan nama fase, PEDOMAN C3). Daftar bertiga kata benda umum
  lain ("latar, tujuan, dan lingkup") dihitung S-18.
- **Koreksi definisi dalam satu kalimat datar** dengan dasar, hanya di DOCX: "Jumlah titik panas
  tidak sama dengan jumlah kebakaran." Satu kotak koreksi per bab (PEDOMAN B5.5). "X, bukan Y" tanpa
  "melainkan" tidak ditandai mesin di DOCX; penyunting menilainya (M-10).
- **Di deck tidak ada pengecualian kontras dan tiga-serangkai.** Buku Pegangan bab Angka & copy
  melarang kontras "X bukan Y" dan tiga-serangkai, dan bab Selera presentasi memberlakukannya penuh
  di slide. Mesin menandai ", bukan" di teks slide (S-19).
- **Kalimat pembuka tebal berangka** di Ringkasan Eksekutif (PEDOMAN D-26; gerbangnya masih antre
  di `qa/cakupan.json`) dan **paragraf berlabel** di kotak (`**Temuan:**`, `**Bukti:**`,
  `**Dampak:**`, NASKAH-SPEK bagian 4). S-27 hanya memeriksa butir daftar biasa.
- **Judul berhuruf kapital tiap kata** menurut PUEBI (PEDOMAN C2). Pola "title case" dari skill
  humanizer tidak berlaku.
- **Ikon garis gaya Lucide di dalam lingkaran** dari registri `tema.json` (PEDOMAN B5.14). Pola
  "Lucide Icons" antislop-ui tidak berlaku karena registri ikon adalah keputusan desain tertulis.
- **Pertanyaan bab** di front matter `pertanyaan:` dan pertanyaan di blok `::: keputusan`.
- **En dash** untuk rentang ("2015–2025", "1.200–4.800 jiwa", "Jun–Okt", "Lampiran I–III"), rute
  yang didahului ruas, rute, jalur, segmen, koridor, atau lintas ("ruas Cilegon–Gresik", PUEBI:
  "sampai ke"), dan sel kosong ("–"). Dua nama wilayah yang berarti "dan" ditulis dengan "dan".
- **"sekitar"** pada estimasi model, diisi pembaca token, bukan diketik penulis.
- **Kata hubung tunggal.** "Namun" atau "Selain itu" sesekali wajar; yang ditandai hanya yang
  beruntun atau terlalu sering.
- **Kutipan langsung** yang pendek (empat kata atau kurang: label, istilah, "data tidak cukup") atau
  yang rujukannya menyusul di kalimat yang sama ("..." (BNPB, 2025)) tidak diperiksa frasanya.
  Kutipan yang lebih panjang tanpa rujukan diperiksa seperti prosa, karena tanda petik bukan izin
  menulis slop. Kutipan panjang ditaruh di blok kutipan berujukan. Isi Daftar Pustaka tidak
  diperiksa frasanya. Karakter terlarang tetap diperiksa di semua kutipan.
- **Label kapital di deck** (pil bagian, kepala kolom, label pita).
- **Arah naik dan turun** digambar sebagai segitiga vektor sewarna Buku Pegangan (naik oranye
  D9600B, turun biru 2F86D1) atau ditulis "naik"/"turun", bukan karakter segitiga atau panah,
  karena glif itu tidak ada di Roboto (PEDOMAN B1.5, `tema.json`, gerbang D-23).
- **Satu kalimat pendek** untuk menegaskan temuan. Yang dilarang adalah deretan kalimat pendek
  dramatis (M-13).
- **Tidak menyapa pembaca.** Kajian tidak memakai "kamu" atau "Anda" (PEDOMAN C1); aturan sapaan
  "kamu" di Buku Pegangan berlaku untuk situs. Mesin menandai "Anda", "kamu", dan "kita semua"
  (S-24).

## 4. Aturan positif

1. **Kalimat pertama paragraf adalah temuan**: angka, satuan, kata kerja, tempat, waktu, sumber.
   "Kekeringan 2023 melanda {n} desa di 6 provinsi Pulau Jawa (DIBI)." bukan "Kekeringan merupakan
   ancaman serius."
2. **Satu paragraf, satu gagasan**, dengan paling sedikit satu angka data atau satu rujukan (S-37).
3. **Subjek konkret**: lembaga, unit, wilayah, tahun, alat ukur. "BBWS Pemali Juana", "Kabupaten
   Demak, Maret 2024", bukan "berbagai pihak" atau "hal ini".
4. **Kata kerja yang bisa diamati**: mencatat, menyalurkan, merendam, menurunkan, menetapkan,
   mengevakuasi. Bukan "memainkan peran", "berkontribusi", "mendorong".
5. **Panjang kalimat bervariasi**: kalimat temuan 8 sampai 15 kata diselingi kalimat penjelas 20
   sampai 35 kata. Batas keras 45 kata.
6. **Satu konsep, satu istilah** di seluruh dokumen (PEDOMAN C3). Kata yang paling jelas diulang;
   sinonim tidak diputar. Istilah baku, singkatan, dan varian terlarang ada di `data/glosarium.json`
   (PEDOMAN B5.18), diperiksa gerbang T-9; ejaan diperiksa gerbang T-10.
7. **Ketidakpastian ditulis sekali, dengan besarnya dan sebabnya**: "260–590 jiwa (estimasi
   model, belum diuji balik)".
8. **Paragraf berakhir pada fakta terakhir** atau akibat yang punya pelaku, bukan nasihat.
9. **Rekomendasi menyebut siapa, apa, kapan, indikator, dan dasar temuan** (PEDOMAN B5.13).
10. **Bila data tidak ada, tulis bahwa data tidak ada** dan siapa pemegangnya.
11. **Padanan Indonesia lebih dulu** (KBBI, PUEBI); istilah asing sekali, miring.

Contoh satu paragraf sebelum dan sesudah:

> Salah: Tidak dapat dipungkiri bahwa Pulau Jawa memainkan peran yang sangat penting dalam
> perekonomian nasional. Namun demikian, ketersediaan air menjadi tantangan yang krusial. Oleh
> karena itu, diperlukan pendekatan yang holistik, komprehensif, dan berkelanjutan dari hulu
> hingga hilir.

> Benar: Pulau Jawa dihuni {n}% penduduk Indonesia menurut Sensus Penduduk 2020, tetapi hanya
> memiliki {n}% air permukaan nasional (BPS, 2020, mengutip Radhika dkk., 2017). Pada kemarau 2023,
> DIBI mencatat {n} kejadian kekeringan di Pulau Jawa. Tampungan waduk dan air tanah menahan sebagian
> kekurangan itu, ditambah pengiriman air bersih oleh BPBD; Bab 4 menghitung porsi masing-masing.

Rujukan di contoh "Benar" mengikuti `riset/B-air-jawa.md`: 6,3% dari BPS (2020) yang mengutip
Radhika dkk. (2017), dan 56,10% dari Sensus Penduduk 2020 (di riset masih bertanda sekunder, jadi
diverifikasi ke rilis BPS sebelum dipakai). Di naskah kedua angka ditulis sebagai token
`{{angka:...}}` dan rujukannya sebagai `[@kunci]` di `pustaka.json`.

## 5. Desain anti-slop untuk DOCX dan PPTX

Gerbang mesin yang sudah memeriksa bagian ini: D-3 (emoji), D-4 (font Roboto), D-5 (huruf
terkecil), D-9 (hex hanya dari `tema.json`), D-15 (atribusi foto), D-17 (judul paling banyak dua
baris), dan D-23 (glif di luar Roboto). Butir lain belum bergerbang; penyunting memeriksanya lewat
M-15 sampai gerbangnya dipasang dan dicatat di `qa/cakupan.json`.

1. **Tanpa gradien dekoratif.** Warna hanya dari `tema.json`. Gradien boleh bila menyandikan data
   (skala koroplet berlegenda) dan pada foto sampul dan penutup deck menurut Buku Pegangan (fade
   putih di foto sampul, gradasi navy di foto penutup). Tidak di kartu, panel, atau latar slide isi.
2. **Tanpa kartu untuk segala hal.** Kartu dipakai untuk angka kunci (PEDOMAN B5.4) dan pola kartu
   Buku Pegangan (grup kartu angka, panel berpita, Kesimpulan deck Presiden berupa 8 kartu dalam
   grid 4×2). Analisis tetap paragraf. Satu topik, satu kontainer; tidak ada kartu di dalam kartu.
3. **Hierarki lahir dari isi.** Judul bab dan subbab DOCX deskriptif dan stabil (PEDOMAN C2), dengan
   kalimat temuan berangka sebagai kalimat pertama. Judul slide temuan adalah kalimat temuan
   berangka berawalan kode bagian; sampul, pembatas, dan slide rekomendasi memakai judul deskriptif
   (Buku Pegangan bab Selera presentasi, Judul). Urutan bagian mengikuti alur argumen (PEDOMAN A4),
   bukan templat. Jumlah butir, langkah, dan kolom mengikuti isi, tidak dipaksa tiga. Bagian yang
   hanya ada karena laporan lain punya ("Tantangan dan Peluang" generik) tidak dibuat.
4. **Ikon hanya bila membawa makna**: satu konsep satu ikon dari registri (PEDOMAN D-25; gerbangnya
   masih antre), harfiah untuk domainnya. Tanpa ikon generik (bintang, kilat, berlian, roket, otak,
   robot), tanpa ikon kiasan, tanpa emoji.
5. **Foto nyata beratribusi** dari Wikimedia Commons yang membawa informasi (lokasi, jenis
   kerusakan), paling banyak satu per subbab (PEDOMAN B5.15). Tanpa ilustrasi generik, tanpa
   gambar buatan AI (KEPUTUSAN P12), tanpa foto stok orang menunjuk layar, tanpa korban yang dapat
   dikenali.
6. **Tanpa hiasan tanpa fungsi**: tanpa bayangan dan cahaya di semua komponen, tanpa garis warna
   di tepi kiri yang tidak menandai status, tanpa titik status yang tidak menandai keadaan, tanpa
   latar kisi atau pola.
7. **Grafik menjawab satu pertanyaan** yang tertulis di judulnya. Tanpa grafik pengisi ruang,
   tanpa angka dan delta yang tidak bersumber.
8. **Warna tidak bekerja sendirian.** Setiap warna dan bulatan punya legenda dan label. Kontras
   teks memenuhi WCAG AA: 4,5:1 untuk teks biasa, 3:1 untuk teks besar dan unsur non-teks,
   dihitung dengan rumus, bukan dikira-kira. Teks di atas foto memakai blok warna padat. Kontras
   baru diuji pada token `tema.json` (`bangun/kontrak/tema.py`), belum pada keluaran.
9. **Tipografi**: Roboto saja; huruf terkecil 8 pt di DOCX; di deck 6 pt untuk teks yang dibaca dan
   5,2 sampai 5,8 pt hanya untuk persen di tabel padat dan chip (Buku Pegangan, gerbang D-5);
   kapital berspasi hanya untuk pil bagian, kepala kolom, dan label pita.
10. **Deck**: satu fokus per slide, judul paling banyak dua baris, tanpa slide yang isinya hanya
    butir, tanpa transisi dan animasi, tanpa foto stok sebagai latar.
11. **Uji tukar logo**: bila logo BNPB diganti logo lembaga lain dan halaman terasa sama saja,
    halaman itu templat dan harus disusun ulang dari isinya.

## 6. Protokol penyuntingan

### 6.1 Tiga tahap

| Tahap | Pelaku | Yang dilakukan | Syarat lanjut |
| --- | --- | --- | --- |
| 1 | Penulis bab | Menulis, lalu `python3 qa/slop.py naskah/<kajian>/bab-NN.md`; memperbaiki semua temuan kritis dan tinggi; memeriksa sendiri M-1 sampai M-15 | Nol kritis, nol tinggi, skor bab paling tinggi 20; perintah itu GAGAL bila salah satunya dilanggar |
| 2 | Penyunting independen: subagent berkonteks bersih, bukan penulis bab (AGENTS.md 3.2) | Membaca bab utuh dari awal sampai akhir dengan daftar M; lalu bertanya dua hal (skill humanizer): "Apa yang masih terdengar dibuat mesin?" dan "Apakah suntingan menambah atau menghapus fakta, angka, nama, atau rujukan?"; mengembalikan temuan bernomor dengan lokasi; penulis memperbaiki; penyunting menulis tanda terima `qa/keluaran/sunting-<bab>.json` (penyunting, tanggal, blob git bab yang dibaca, temuan dan penutupnya) | Semua temuan penyunting ditutup atau dijawab dengan alasan tertulis di tanda terima. Gerbang keberadaan tanda terima belum ada di `periksa.py`; sampai dipasang, sesi induk memeriksanya sebelum Tahap 3 |
| 3 | Detektor mekanis pada keluaran | `qa/periksa.py` (gerbang T-4) atau `python3 qa/slop.py --final` pada DOCX dan PPTX akhir | Nol kritis, nol tinggi, skor paling tinggi 10 di setiap bab dan setiap slide |

Penyunting tidak menambah fakta. Suntingan yang membutuhkan angka baru dikembalikan ke penulis
untuk diambil dari registri `data/angka.json`.

### 6.2 Ambang

| Mode | Perintah | GAGAL bila | TINJAU bila |
| --- | --- | --- | --- |
| Draf | `python3 qa/slop.py <berkas>` | ada temuan kritis atau tinggi, atau skor bab lebih dari 20 | skor bab 11 sampai 20 |
| Final | `python3 qa/slop.py --final <berkas>` | ada temuan kritis atau tinggi, atau skor bab lebih dari 10 | tidak ada; final hanya LOLOS atau GAGAL |

**Vonis ambang anti-AI per bab** (Buku Pegangan bab Angka & copy; PEDOMAN D4). Pelanggaran dihitung per bab
DOCX, per berkas naskah, atau per slide dari kode `AMBANG_KODE` di `slop.py`: em dash (S-1), tiga-serangkai
abstrak dan gaya (S-17, S-18), titik dua (S-40), hedging (S-41), pembuka klise (S-42), dan kata terlarang
khas AI (S-43).

| Pelanggaran per bab | Vonis | Tindakan |
| --- | --- | --- |
| 0 | LULUS | lanjut ke render |
| 1–2 | GAGAL RINGAN | ditulis ulang penyunting; tidak diserahkan apa adanya |
| 3 atau lebih | GAGAL BERAT | bab dikembalikan ke penulis, ditulis ulang, dipindai ulang |

Semua bab wajib LULUS sebelum serah. Gerbang `qa/periksa.py` T-8 menolak bab atau slide yang tidak LULUS;
laporan per bab ditulis dengan `python3 qa/slop.py --ambang --laporan keluaran/qa/slop-<kajian>.md <berkas>`.

Skor 10 per 1.000 kata setara dengan kira-kira satu temuan sedang per halaman isi DOCX (±450 kata).
Satu slide dinilai seolah 500 kata, jadi slide final paling banyak memuat satu temuan sedang dan dua
temuan rendah.

Kalibrasi 23 Oktober 2026 pada teks lampiran Perban BNPB 1/2025 (Renas PB, ditulis manusia):
37.985 kata, skor 31, gagal draf, terutama karena 201 kalimat lebih dari 45 kata, 48 temuan
tiga-serangkai beruntun, 33 tiga-serangkai abstrak, 20 gugus S-39, dan 14 paragraf tanpa angka dan
rujukan. Tulisan birokrasi yang lazim memang tidak lolos; kajian ini ditulis lebih lugas daripada
itu. Reproduksi dari `data/kajian-bnpb`:

```sh
python3 -I -c "import json,re,sys; sys.path.insert(0,'qa'); import slop; d=json.load(open('../raw/hukum/teks/perban-nomor-1-tahun-2025.json')); t=re.sub(r'-\n\s*','','\n'.join(h['t'] for h in d['halaman'])); h=slop.periksa_teks(t,'renas.txt'); print(h['kata'], h['skor'], h['status'])"
```

### 6.3 Daftar periksa penyunting

| Kode | Periksa |
| --- | --- |
| M-1 | Kalimat pasif yang menyembunyikan pelaku yang diketahui ("Keputusan diambil untuk ...") |
| M-2 | Sinonim yang berputar untuk satu konsep; istilah di luar tabel PEDOMAN C3 |
| M-3 | Kalimat pertama yang hanya mengulang judul subbab |
| M-4 | Menjawab keberatan yang tidak pernah diajukan; alternatif palsu yang disebut lalu ditolak |
| M-5 | Angka yang diketik tangan, angka di teks yang berbeda dari tabel, angka tanpa tahun |
| M-6 | Sebab-akibat yang disimpulkan dari korelasi (PEDOMAN C8) |
| M-7 | Paragraf tanpa gagasan, atau yang memuat dua gagasan |
| M-8 | Subbab templat: "Tantangan dan Peluang", "Prospek ke Depan" tanpa fakta baru |
| M-9 | Rekomendasi tanpa lembaga, tenggat, indikator, atau dasar temuan |
| M-10 | Kontras "X, bukan Y" yang tidak dilandasi definisi atau data |
| M-11 | Register yang berganti di tengah bab; sapaan kepada pembaca yang lolos S-24 |
| M-12 | Kapital penuh atau tebal sebagai penekanan di prosa; tanda petik untuk menyindir |
| M-13 | Kalimat yang terdengar bijak tanpa isi; deretan kalimat pendek dramatis |
| M-14 | Halaman atau slide yang gagal uji tukar logo (bagian 5 butir 11) |
| M-15 | Butir bagian 5 yang belum bergerbang: gradien di luar koroplet dan foto sampul/penutup, kartu di dalam kartu, bayangan, garis tepi kiri, latar kisi, satu ikon satu arti, foto per subbab, kontras WCAG di keluaran, transisi dan animasi |

### 6.4 Integrasi mesin

`qa/periksa.py` memanggil detektor sebagai gerbang T-4 dengan ambang final, tanpa melewatkan kode
apa pun:

```python
from slop import temuan_gerbang   # qa/slop.py
temuan = temuan_gerbang([docx, pptx], final=True)
# [(berkas, lokasi, pesan)], kosong = lolos
```

S-1 sampai S-3 tidak boleh dilewati di T-4. D-1 dan D-2 hanya mencari U+2014 dan U+00B7, sedangkan
S-1 dan S-2 juga menangkap kerabatnya (U+2012, U+2015, U+2E3A, butir U+2022 di tengah teks), dan
sebagian kerabat itu ada di cmap Roboto sehingga D-23 juga diam. Laporan ganda untuk U+2014 tidak
berbahaya.

Pemanggil lain memakai `gerbang(jalur_list, final=True)`, yang mengembalikan `(lolos, pesan)`,
atau `periksa_berkas(jalur, final)` untuk hasil lengkap per bab. Pesan gagal menyebut kode,
lokasi (baris naskah, paragraf DOCX `p.N`, atau `slide N par.M`), cuplikan, tingkat, skor bab,
ambang, dan saran.

Aturan baru ditambahkan di tiga tempat sekaligus: baris tabel di berkas ini, pola di `slop.py`,
dan satu contoh slop di `CONTOH` pada `qa/uji_slop.py`. Uji gagal bila salah satunya tertinggal.
Slop yang lolos detektor ditambahkan ke `qa/sampel_adversarial/sampel.json`: entri `slop` wajib
GAGAL final dengan temuan tinggi, entri `baik` wajib LOLOS, dan jumlah keduanya hanya boleh
bertambah. Uji: `python3 -I qa/uji_slop.py`.


---

## Tambahan dari skill anti-ai-checker untuk naskah kajian

Dinilai 23 Okt 2026. Dilebur ke ANTI-SLOP.md dan `qa/slop.py` setelah workflow anti-slop
selesai. Daftar `banned-ai-words.txt` milik pemilik (182 baris) ditemukan di
knowledge-hub dan disalin ke `riset/anti-slop/banned-ai-words.txt`; dipakai untuk teks
Inggris dan dibuatkan padanan Indonesianya di ANTI-SLOP.md.

## Ambang terukur yang dipakai

| Cek | Ambang skill | Ambang kajian BNPB | Alasan penyesuaian |
| --- | --- | --- | --- |
| Em dash | ≤ 3 per 1.000 kata | 0 di teks tampil | Aturan pemilik lebih ketat |
| Titik dua | ≤ 20 per 1.500 kata | ≤ 20 per 1.500 kata di paragraf isi; label tabel, keterangan gambar ("Gambar 3.1 :"), dan "Sumber:" tidak dihitung | Pola "Label: penjelasan" khas teks mesin; komponen baku laporan dikecualikan |
| Pembuka klise | dipindai di 50 kata pertama | dipindai di 50 kata pertama tiap bab DAN tiap subbab; padanan Indonesia: "Di era", "Dalam lanskap", "Seiring perkembangan zaman", "Tidak dapat dipungkiri", "Pada hakikatnya", "Sebagaimana kita ketahui", "Dalam rangka", "Perlu diketahui" | Tiap subbab dibaca terpisah oleh pimpinan |
| Hedging | > 2 per < 1.500 kata gagal | sama; padanan: "perlu dicatat bahwa", "patut dicatat", "penting untuk diperhatikan", "dapat dikatakan bahwa", "tampaknya", "cenderung" tanpa data | |
| Tiga-serangkai | > 5 per 1.000 kata gagal | > 3 per 1.000 kata gagal; daftar tiga yang faktual (tiga provinsi, tiga skenario bernama) tetap boleh dan tidak dihitung bila berisi nama diri atau angka | Larangan total akan menolak daftar faktual; yang dicegah adalah ritme tiga sebagai gaya |

## Vonis tiga tingkat

| Pelanggaran per bab | Vonis | Tindakan |
| --- | --- | --- |
| 0 | LULUS | lanjut ke render |
| 1–2 | GAGAL RINGAN | ditulis ulang oleh penyunting; tidak boleh diserahkan apa adanya karena pemilik tidak memeriksa |
| ≥ 3 | GAGAL BERAT | bab dikembalikan ke penulis, ditulis ulang, dipindai ulang |

Karena pemilik menerima hasil tanpa memeriksa, GAGAL RINGAN tidak bisa "diterima
pemilik" seperti di skill: semua bab wajib LULUS sebelum diserahkan.

## Format laporan

Laporan pindaian per bab mengikuti format skill (berkas, jumlah kata, status, jumlah
pelanggaran, kata terlarang beserta lokasi paragraf, struktur: rasio em dash dan titik
dua, pembuka, usulan tulis ulang, vonis), ditulis ke `keluaran/qa/slop-<kajian>.md`.
