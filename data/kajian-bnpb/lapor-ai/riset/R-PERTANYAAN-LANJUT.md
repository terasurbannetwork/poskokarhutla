# Riset usulan pengembangan pertanyaan Lapor Bencana BNPB

Tanggal 25 Nov 2026. Status: USULAN, belum keputusan pemilik. Tidak ada kode yang diubah. Pemilik meminta: "kembangkan pertanyaan-pertanyaannya lagi, tapi pastikan tetap relevan dan tepat pemilihannya".

Berkas ini tunduk pada `KEPUTUSAN-LAPOR-AI.md` (K1 sampai K92), `PRD.md`, dan `ALGORITMA.md`. Bila ada yang bertentangan, keputusan pemilik menang dan usulan di sini gugur.

## 0. Cara membaca dan batas riset

Yang dibaca langsung: `src/lapor_spek.js` (ISIAN, KELOMPOK, KRONOLOGI per jenis, termasuk `petugas_datang` tertanggal 25 Nov), PRD dan ALGORITMA paket ini, `data/kajian-bnpb/lapor-lanjutan/PRD.md`, dua tabel Lampiran I Juklak Standar Data (`standar-data-bencana/03-juklak-baru/naskah/02-lampiran-1.md`), dan teks lengkap Perka BNPB 9/2008 tentang Prosedur Tetap Tim Reaksi Cepat (salinan Berita Negara 1409/2014, bagian formulir kaji cepat).

Riset web: pencarian dan pembacaan ringkas dilakukan, tetapi teks lengkap daftar pertanyaan MIRA, Sphere, dan formulir PetaBencana.id TIDAK berhasil dibaca (pembaca halaman hanya mengembalikan judul atau ringkasan). Karena itu butir yang bersandar pada tiga sumber itu saya tandai "sumber: gambaran umum, teks belum dibaca langsung" dan perlu dicek ulang sebelum dikutip di layar atau dokumen resmi. Tidak ada angka ambang dari sumber yang tidak saya baca langsung.

## 1. Apa yang sudah ditanya sekarang (ringkas)

| Kelompok | Sudah ada |
| --- | --- |
| Kejadian | jenis, subjenis, waktu, lokasi, kronologi berpandu per jenis (7 sampai 8 langkah, termasuk "bagaimana sekarang" dan "bahaya lanjutan" sebagai frasa kalimat) |
| Korban | meninggal, hilang, luka, dirawat inap |
| Terdampak dan pengungsian | KK dan jiwa terdampak, jiwa dan KK mengungsi, nama titik pengungsian |
| Rumah | rusak berat, sedang, ringan, terendam |
| Fasilitas dan jalan | sekolah, faskes, ibadah, jalan atau jembatan beserta namanya, akses jalan |
| Rentan, layanan, kebutuhan | kelompok rentan, layanan terganggu (listrik, sinyal, air), kebutuhan mendesak (disesuaikan per jenis), petugas di lokasi |
| Khusus per jenis | tinggi air, luas terbakar, guncangan SIG, tebal abu, tinggi rayapan, krisis air, sebaran angin, pantai tergerus, lahan pertanian rusak, jarak kawah |

Yang SENGAJA tidak di sini karena sudah dirancang atau diputuskan: data per objek (rumah per rumah, pengungsi per jiwa, korban per orang, usaha, kebutuhan per titik, tim) ada di tahap 2 milik BPBD (`lapor-lanjutan/PRD.md` F-2 sampai F-9); upaya penanganan, SK, posko, sumber daya, dan kerugian rupiah milik BPBD lewat draf logbook (K56); lapor darurat sekali ketuk dan kabar selamat (K68, K90, K91).

## 2. Celah

Cara menemukan celah: tiap isian standar dibandingkan dengan tiga pembanding (Lampiran I Juklak yang jadi pedoman K25, formulir kaji cepat TRC Perka 9/2008, dan praktik pelaporan warga internasional), lalu disaring dengan lima uji pada bagian 3.

### 2.1 Celah umum, semua jenis bencana

1. **Orang yang masih terjebak atau tertimbun.** Sekarang hanya ada hitungan "hilang". Hilang berarti tidak diketahui keberadaannya; terjebak berarti diketahui ada dan butuh penyelamatan sekarang. Keduanya keputusan berbeda bagi Pusdalops (kirim tim SAR atau cari lewat data). Perka 9/2008 menaruh pencarian, penyelamatan, dan evakuasi sebagai kebutuhan mendesak pertama (Format-7). Jalur Lapor darurat (K68) menanyakannya, tetapi laporan kejadian biasa tidak.
2. **Kejadian sudah berhenti atau masih berlangsung.** Kronologi sudah memuat "bagaimana sekarang", tetapi sebagai frasa kalimat, bukan nilai terstruktur. Meja tidak bisa menyaring "masih berlangsung" dan tidak bisa mengurutkan perhatian dari situ. Perka 9/2008 meminta "potensi bencana susulan" sebagai bagian tetap laporan; kerangka MIRA menempatkan tren dan kesenjangan informasi sebagai satu dari tiga dimensi analisis.
3. **Apakah tim bisa menjangkau lokasi.** `akses_jalan` hanya muncul bila ada jalan atau jembatan rusak, dan hanya soal jalan itu. Akses ke LOKASI kejadian (mobil, motor, jalan kaki, perahu) hanya ditanya di kronologi longsor. Akses adalah hambatan yang paling menentukan jenis dan waktu bantuan; Perka 9/2008 mencatat kendala sebagai bagian tetap laporan awal dan Lampiran I 6.5 sampai 6.6 menilai jalan dan jembatan dari status "terputus, terbatas, normal".
4. **Seberapa dekat pelapor dengan kejadian.** Staf tidak tahu apakah laporan berasal dari saksi di lokasi atau kabar dari orang lain atau media sosial. Ini bukan soal menolak laporan, melainkan memberi bobot dan memutuskan siapa yang perlu dihubungi. Praktik pelaporan warga (Ushahidi di Haiti, PetaBencana.id) sama-sama bergulat dengan verifikasi laporan; Lampiran I 10.1 sudah punya kolom "sumber data" tetapi hanya di tingkat sistem.
5. **Perlu pertolongan medis sekarang.** Ada "luka" dan "dirawat inap" (yang sudah tertangani). Yang belum tertangkap: ada yang luka berat dan belum terjangkau layanan, atau banyak warga sakit mendadak (diare, sesak, gatal) yang tanda awal masalah kesehatan lingkungan. Lampiran I 7.6 (rumah sakit rujukan) dan Perka 9/2008 (kebutuhan dasar kesehatan, Format-8) menunjuk ke arah ini.
6. **Sanitasi dan penerangan di kebutuhan mendesak.** Lampiran I 9.1 mencantumkan sanitasi dan penerangan sebagai pilihan kebutuhan mendesak; Perka 9/2008 Format-9 menyebut MCK. Daftar pilihan `kebutuhan` kita belum memuat toilet atau MCK darurat sama sekali.
7. **Petugas yang datang selain BPBD.** `petugas_datang` baru memisahkan BPBD dan "petugas lain". Untuk kebakaran gedung responden pertama adalah pemadam kebakaran, untuk banjir, longsor, gempa, dan tsunami sering tim SAR. Staf butuh tahu lembaga mana yang sudah di lokasi supaya tidak mengirim dobel atau mengira belum ada yang datang.
8. **Layanan vital di luar listrik, sinyal, air.** Lampiran I mengukur bahan bakar (7.4), transportasi (7.5), dan rumah sakit rujukan (7.6). Status Lifeline per kab/kota (`KEPUTUSAN-LIFELINE`) juga membutuhkan BBM dan pangan. `layanan_terganggu` belum punya pilihannya.
9. **Wilayah terancam dan evakuasi pencegahan.** Lampiran I 4.6 (terancam) dan 5.2 (evakuasi pencegahan) adalah isian laporan awal/rapid assessment yang sengaja dicatat terpisah dan tidak masuk kriteria. Sekarang tidak ada tempat mencatatnya, padahal untuk erupsi, siklon, dan banjir bandang susulan justru di sini keputusan evakuasi dibuat.
10. **Dusun yang terputus total.** Jalan rusak yang disebut pelapor belum tentu menggambarkan dusun lain yang tidak terjangkau dan tidak punya pelapor. Ini kesenjangan informasi klasik MIRA (kelompok yang tidak terlihat).

### 2.2 Celah per jenis bencana

| Jenis | Celah | Dasar |
| --- | --- | --- |
| Banjir | Tidak ada yang kurang berat di ISIAN umum; kedalaman, rumah terendam, lahan, akses sudah ada. Celahnya ada di umum (terjebak, akses, kondisi sekarang) | PetaBencana.id menjadikan kedalaman dan foto sebagai inti; kita sudah punya |
| Longsor | Ukuran longsoran (untuk keputusan alat berat), orang tertimbun, lereng masih bergerak | Kronologi sudah tanya "bagaimana lereng sekarang" tetapi tidak terstruktur |
| Gempa | Gejala di tanah (retakan, ambles, semburan pasir atau air) pembeda gempa merusak dan pemicu bahaya turunan; peringatan atau tanda sebelum tsunami | DYFI menanyakan efek pada orang dan benda, bukan tanah; gejala tanah penting untuk Indonesia (pengalaman Palu 2018) |
| Tsunami, erupsi | Apakah peringatan diterima (untuk evaluasi, bukan untuk respons 1 sampai 24 jam) | Evaluasi sistem peringatan dini |
| Karhutla | Jarak api ke permukiman, sumber air dekat lokasi untuk pemadaman | Perka 9/2008 menuntut keputusan sumber daya; jarak ke permukiman dasar prioritas |
| Kebakaran gedung | Pemadam sudah datang atau belum (butir 7 di atas) | |
| Kekeringan | Jarak tempuh ke sumber air; `krisis_air` hanya menilai kecukupan umum | Sphere menetapkan jarak ke titik air sebagai indikator (angka 500 m perlu dicek di teks Sphere; belum saya baca langsung) |
| Abrasi | Jarak air ke rumah terdekat; `garis_pantai` hanya mengukur seberapa jauh daratan tergerus | |
| Cuaca ekstrem | Tidak ada celah berarti yang lolos uji | |

## 3. Uji penyaringan

Setiap usulan harus lolos kelima uji. Yang gagal ada di bagian 5.

1. **Keputusan.** Ada petugas yang mengubah tindakannya di 1 sampai 24 jam pertama karena jawaban ini (kirim tim, pilih alat, hubungi lembaga, tandai prioritas). Pertanyaan yang hanya "baik untuk diketahui" tidak lolos.
2. **Dijawab warga awam dengan memilih.** Tanpa istilah teknis, tanpa mengukur, tanpa data yang hanya dimiliki petugas. Selalu ada "tidak tahu" (F-7).
3. **Bukan data yang sudah ada atau sudah diputuskan.** Tidak menggandakan tahap 2 BPBD, kronologi, atau jalur darurat.
4. **Tidak melanggar K, larangan PRD, dan privasi.** Tanpa nama korban atau NIK, tanpa saran keselamatan buatan AI, tanpa kata "aman", tanpa tuduhan pada orang.
5. **Muat di anggaran waktu.** Laporan awal tetap selesai dalam 5 menit dan paling banyak 8 balasan (PRD). Karena itu usulan dibagi tiga tingkat (bagian 4.0).

## 4. Usulan pertanyaan

### 4.0 Tingkat prioritas dan tempatnya di alur

| Tingkat | Arti | Di alur |
| --- | --- | --- |
| P1 | Wajib dipertimbangkan sekarang; mengubah keputusan petugas 1 sampai 24 jam | Masuk alur laporan awal, SELALU kondisional (hanya muncul bila berlaku) dan tidak pernah `wajib` |
| P2 | Berguna, mempertajam gambaran | Ditanyakan sesudah laporan terkirim, sebagai "Mau menambah kabar?" (cocok dengan F-28 laporan susulan), atau di langkah kelompok yang memang sudah berjalan |
| P3 | Nanti, nilai terbatas atau menunggu keputusan lain | Disimpan di daftar tunggu |

Anggaran: P1 rata-rata menambah 2 sampai 3 balasan karena sebagian hanya muncul untuk jenis tertentu atau saat jawaban sebelumnya "ya". Bila itu mendorong laporan ke atas 8 balasan, turunkan `situasi_sekarang` dan `kedekatan_pelapor` menjadi satu kartu dua baris (satu layar).

Kelompok: gunakan kelompok yang sudah ada bila cocok; tambahkan satu kelompok baru bernama `situasi` (Situasi sekarang) dan satu `penyelamatan` (Penyelamatan dan medis) supaya urutan di A2 jelas. Kelompok `kejadian` tetap hanya berisi lima isian wajib.

Format setiap butir: nama isian usulan, tipe, kalimat tanya, pilihan (label, lalu penjelasan awam setelah tanda panah), berlaku untuk, kelompok, kenapa perlu (kegunaan untuk petugas), sumber, prioritas.

---

### P1: masuk alur laporan awal (9 butir, dua di antaranya revisi biaya nol)

**U-01 `butuh_penyelamatan`** (opsi)
- Tanya: umum, "Apakah masih ada orang yang terjebak atau tertimbun dan butuh diselamatkan sekarang?" Kalimat per jenis lewat `tanyaJenis`: longsor "tertimbun tanah atau material", gempa "tertimpa reruntuhan", banjir dan tsunami "terjebak atau terseret air", kebakaran_gedung "terjebak di dalam bangunan", erupsi "terjebak di dekat gunung", karhutla "terkepung api".
- Pilihan:
  - Ya, ada yang terlihat atau terdengar -> Ada orang yang diketahui masih terjebak.
  - Ada kabar tetapi belum dipastikan -> Seseorang bilang ada orang terjebak, belum lihat sendiri.
  - Tidak ada -> Semua orang yang diketahui sudah keluar.
  - Tidak tahu -> Belum bisa memeriksa.
- Berlaku: semua jenis kecuali kekeringan, abrasi.
- Kelompok: `penyelamatan` (urut tepat sesudah `korban`).
- Kenapa: membedakan "perlu tim SAR sekarang" dari "korban hilang yang dicari". Dipakai untuk penanda perhatian di meja (K47) dan menampilkan templat tetap nomor 112 dan Basarnas 115 (kalimat bukan karangan AI, sama seperti Larangan PRD).
- Sumber: Perka 9/2008 Format-7 (pencarian, penyelamatan, evakuasi) dan formulir kebutuhan darurat nomor 1; kategori "emergency" dalam laporan Ushahidi Haiti (gambaran dari ringkasan pencarian, belum dibaca langsung).
- P1.

**U-02 `situasi_sekarang`** (opsi)
- Tanya: "Bagaimana keadaan kejadiannya sekarang?"
- Pilihan:
  - Masih berlangsung atau membesar -> Misalnya air masih naik, api masih menjalar, tanah masih bergerak.
  - Masih ada, tidak bertambah -> Bertahan, belum turun.
  - Mulai mereda -> Berkurang, belum selesai.
  - Sudah berakhir -> Tidak ada lagi tanda kejadian.
  - Tidak tahu -> Tidak melihat langsung.
- Berlaku: semua jenis.
- Kelompok: `situasi`.
- Kenapa: kejadian yang masih berlangsung diurus lebih dulu dan perlu dicek ulang; yang sudah berakhir bergeser ke penilaian dampak. Juga membuat laporan susulan terarah.
- Penting untuk menghindari tanya dobel: tiap jenis sudah punya langkah kronologi "Bagaimana ... sekarang?". Usulan teknis: nilai isian ini DITURUNKAN dari jawaban langkah kronologi itu lewat pemetaan tetap (opsi bertanda `bahaya true` = "masih berlangsung"), dan hanya ditanyakan terpisah bila pelapor melewatkan kronologi. Jadi biaya tambahan balasan mendekati nol.
- Sumber: Perka 9/2008 bagian VI (potensi bencana susulan) dan bagian perkembangan dampak; MIRA 2015 (dimensi tren, gambaran dari ringkasan UNHCR yang dibaca).
- P1.

**U-03 `akses_ke_lokasi`** (opsi)
- Tanya: "Bagaimana kendaraan bisa sampai ke lokasi kejadian dari jalan besar terdekat?"
- Pilihan:
  - Mobil dan truk bisa masuk -> Jalan masih bisa dilewati kendaraan besar.
  - Hanya motor -> Mobil tidak bisa lewat.
  - Hanya jalan kaki -> Kendaraan tidak bisa masuk.
  - Harus lewat air atau udara -> Perahu atau helikopter.
  - Tidak tahu
- Berlaku: semua jenis kecuali kekeringan (tetap boleh ditanya bila lokasi terpencil; bawaan: tidak).
- Kelompok: `situasi`.
- Kenapa: menentukan jenis armada dan alat berat yang dikirim, dan perkiraan waktu tiba. Melengkapi `akses_jalan`: bila `akses_ke_lokasi` sudah dijawab dan `jalan_jembatan` kosong, `akses_jalan` tidak perlu ditanya lagi; bila `jalan_jembatan` ada, `akses_jalan` tetap menyebut ruas yang rusak. Tampilkan hanya salah satu pertanyaan di satu layar agar pelapor tidak merasa ditanya dua kali.
- Sumber: Lampiran I Juklak 6.5 dan 6.6; Perka 9/2008 kendala dan sarana angkutan; akses sebagai tema inti MIRA (dari ringkasan, teks belum dibaca langsung).
- P1.

**U-04 `kedekatan_pelapor`** (opsi)
- Tanya: "Anda sendiri melihat atau mengalami kejadian ini?"
- Pilihan:
  - Saya di lokasi sekarang -> Melihat langsung saat ini.
  - Saya melihat tadi, sudah pergi -> Pernah di lokasi, sekarang tidak.
  - Saya mendapat kabar dari orang di lokasi -> Kabar dari keluarga, tetangga, atau petugas.
  - Saya melihat di media sosial atau berita -> Tidak berhubungan langsung.
- Berlaku: semua jenis. Dijawab sekali per laporan, bukan per susulan.
- Kelompok: `situasi`.
- Kenapa: pembobot verifikasi dan penentu siapa yang dihubungi balik. Saksi di lokasi bisa ditanya lanjut lewat WA; kabar dari media harus diperiksa dulu ke BPBD (K31 sampai K33). Tidak untuk menolak laporan dan tidak menurunkan skor perhatian.
- Hati-hati: pertanyaan ini bisa terasa menuduh. Beri judul netral "Bagaimana Anda tahu kejadian ini?" dan jelaskan satu kalimat "Semua kabar tetap dicatat".
- Sumber: Lampiran I 10.1 (sumber data) dan 10.3 (status verifikasi); PetaBencana.id memverifikasi laporan warga dengan data lain (pembacaan sekunder, teks belum dibaca langsung).
- P1.

**U-05 `butuh_medis`** (opsi)
- Tanya: "Apakah ada warga yang butuh pertolongan medis sekarang?"
- Pilihan:
  - Ada luka berat yang belum sampai ke fasilitas kesehatan -> Perlu dibawa ke puskesmas atau rumah sakit.
  - Banyak warga mendadak sakit -> Misalnya diare, sesak napas, mata perih, gatal.
  - Ada keduanya
  - Tidak ada, semua sudah tertangani
  - Tidak tahu
- Berlaku: semua jenis. Pertanyaan hanya muncul bila `luka` > 0 atau jenis termasuk erupsi, karhutla, banjir, kekeringan (tanda sakit massal), supaya tidak membebani laporan cuaca ringan.
- Kelompok: `penyelamatan`.
- Kenapa: memisahkan "ada luka" (angka) dari "ada luka yang belum terlayani" (tindakan). Sakit massal di pengungsian atau sesudah asap dan genangan adalah peringatan awal masalah kesehatan lingkungan yang baru diketahui lewat laporan kondisi nyata warga.
- Sumber: Lampiran I 7.6 dan 4.3 sampai 4.4; Perka 9/2008 Format-8 (pelayanan kesehatan sebagai kebutuhan dasar); Sphere Health Assessment Checklist menjadikan penilaian kebutuhan kesehatan sebagai penilaian awal (teks checklist belum dibaca langsung).
- P1.

**U-06 `petugas_datang` (revisi isian yang ada, bukan isian baru)** (opsi)
- Pertahankan empat pilihan sekarang. Tambahkan pilihan berfilter jenis lewat elemen ke-4 `opsi` yang sudah dipakai di `kebutuhan`:
  - "Sudah, pemadam kebakaran" -> kebakaran_gedung dan karhutla ("Manggala Agni atau pemadam").
  - "Sudah, tim SAR" -> banjir, longsor, gempa, tsunami, erupsi, abrasi.
- Kenapa: kebakaran gedung diurus dinas pemadam bukan BPBD; "petugas lain" tanpa rincian memaksa staf menelepon untuk tahu siapa. Pertanyaan yang diminta pemilik tetap fokus pada BPBD dan tidak berubah artinya.
- Sumber: pola `opsiBerlaku` di `lapor_spek.js` sendiri; Lampiran I 9.5 (sumber daya per instansi, dicatat BPBD) menunjukkan kebutuhan membedakan lembaga.
- P1. Biaya nol balasan tambahan.

**U-07 `kebutuhan` (revisi daftar pilihan yang ada)**
- Tambah di kelompok "Logistik": **"Toilet atau MCK darurat"** (penjelasan: "Tempat buang air dan mandi sementara", berlaku untuk jenis yang membuat warga mengungsi, yaitu `UNGSI`), dan **"Lampu atau penerangan"** untuk jenis yang listriknya sering padam (sudah ada "Genset dan lampu penerangan" untuk sebagian jenis; samakan agar karhutla dan kebakaran gedung tidak tertinggal). Pilihan "Tenda atau terpal" diberi penjelasan "Tempat berteduh sementara" supaya cocok dengan istilah "hunian sementara" Lampiran I.
- Kenapa: sanitasi adalah satu dari delapan kategori kebutuhan mendesak Lampiran I 9.1 dan Format-9 Perka 9/2008, tetapi tidak ada di pilihan.
- Sumber: Lampiran I Juklak 9.1; Perka 9/2008 Format-9 (MCK).
- P1. Biaya nol balasan tambahan.

**U-08 `api_ke_permukiman`** (opsi)
- Tanya: "Seberapa dekat api dengan rumah atau permukiman?"
- Pilihan:
  - Sudah mengenai bangunan -> Api atau bara sudah sampai ke rumah atau gedung.
  - Kurang dari 500 meter -> Sekitar sejauh dua kali lapangan bola.
  - 500 meter sampai 2 kilometer -> Terlihat jelas dari kampung.
  - Lebih dari 2 kilometer -> Jauh, belum mengancam langsung.
  - Tidak tahu
- Berlaku: karhutla.
- Kelompok: `khusus`.
- Kenapa: dasar prioritas pemadaman dan evakuasi; menggantikan tebakan staf dari satu frasa kronologi ("Permukiman atau rumah").
- Catatan: ambang 500 m dan 2 km adalah pita kategori pilihan sesi ini, BUKAN ambang resmi. Jangan tampilkan sebagai batas layak atau tidak. Perlu keputusan pemilik soal pita (QP-10).
- Sumber: kronologi karhutla yang sudah ada ("Ke arah mana api mengancam"); Perka 9/2008 (jarak ancaman sebagai dasar prioritas, tafsir saya).
- P1 untuk karhutla.

**U-09 `jarak_ambil_air`** (opsi)
- Tanya: "Seberapa jauh warga harus pergi untuk mendapat air minum?"
- Pilihan:
  - Dekat, kurang dari 500 meter -> Seperti sebelum kekeringan.
  - 500 meter sampai 1 kilometer -> Beberapa menit jalan kaki.
  - 1 sampai 3 kilometer -> Perlu motor atau waktu lama.
  - Lebih dari 3 kilometer -> Hanya bisa dengan kendaraan.
  - Air hanya dari tangki atau bantuan -> Tidak ada sumber dekat.
  - Tidak tahu
- Berlaku: kekeringan.
- Kelompok: `khusus` (urut sesudah `krisis_air`).
- Kenapa: `krisis_air` hanya menilai "cukup, sulit, tidak ada"; jarak membedakan kampung yang antre 10 menit dari kampung yang harus mengirim tangki. Menentukan jumlah dan titik tangki.
- Sumber: Sphere memakai jarak ke titik air sebagai indikator layanan (gambaran umum; teks belum dibaca langsung, jadi pita 500 m saya anggap pilihan, bukan kutipan ambang); Lampiran I 4.5 mengaitkan terdampak kekeringan dengan kebutuhan air bersih.
- P1 untuk kekeringan.

---

### P2: ditanyakan sesudah kirim atau di langkah yang sudah berjalan (12 butir)

**U-10 `wilayah_terisolasi`** (opsi)
- Tanya: "Apakah ada dusun atau kampung lain yang tidak bisa dihubungi atau didatangi sama sekali?"
- Pilihan: Ya, ada yang terputus total -> Tidak bisa dihubungi dan tidak bisa didatangi; Ya, hanya terputus lewat jalan -> Masih ada sinyal atau kabar; Tidak ada; Tidak tahu.
- Berlaku: banjir, longsor, gempa, erupsi, tsunami, cuaca, abrasi.
- Kelompok: `situasi`.
- Kenapa: kelompok yang tidak punya pelapor adalah kesenjangan informasi terbesar; daftar ini mengarahkan pengecekan lewat desa tetangga.
- Sumber: kerangka MIRA tentang kesenjangan informasi (dari ringkasan UNHCR yang dibaca); Lampiran I 6.5 sampai 6.6.
- P2.

**U-11 `evakuasi_pencegahan`** (opsi)
- Tanya: "Apakah ada warga yang sudah diminta pindah sebelum bahaya datang (karena peringatan atau perintah petugas)?"
- Pilihan: Ya, sudah banyak yang pindah; Ya, sebagian; Belum ada perintah pindah; Tidak tahu.
- Berlaku: erupsi, banjir, tsunami, cuaca (siklon), karhutla.
- Kelompok: `pengungsian`.
- Kenapa: Lampiran I 5.2 mencatat evakuasi pencegahan terpisah dari pengungsi dan tidak masuk kriteria. Tanpa pilihan ini warga yang pindah karena peringatan tercampur dengan pengungsi akibat dampak, atau tidak tercatat.
- Sumber: Lampiran I Juklak 5.2.
- P2.

**U-12 `warga_terancam`** (opsi, bukan angka)
- Tanya: "Kira-kira seberapa banyak warga di sekitar yang terancam tetapi belum terkena dampak?"
- Pilihan: Beberapa rumah -> Sekitar belasan orang; Satu kampung atau dusun -> Puluhan sampai ratusan orang; Beberapa desa -> Ribuan orang; Tidak tahu.
- Berlaku: longsor (lereng retak), banjir (air masih naik), erupsi, karhutla, tsunami, cuaca (siklon).
- Kelompok: `situasi`.
- Kenapa: Lampiran I 4.6 "terancam" dicatat terpisah. Memakai pita bukan angka karena warga tidak bisa menghitung orang yang belum kena dampak. Perkiraan kasar cukup untuk menentukan skala siaga.
- Sumber: Lampiran I Juklak 4.6 dan pola `lintasan_angin` di spek kita.
- P2.

**U-13 `layanan_terganggu` (revisi, tambah pilihan)**
- Tambahkan: "BBM atau gas sulit didapat" -> SPBU tutup atau antre; "Pasar atau toko tutup, makanan sulit dibeli"; "Pelabuhan, bandara, atau terminal tutup".
- Kenapa: Lampiran I 7.4 dan 7.5 dan kebutuhan Lifeline (BBM, pangan). Faskes TIDAK ditambahkan di sini karena ditanya lewat U-14.
- Aliran ke Lifeline: sesuai Q41 bawaan sementara, belum mengalir ke Lifeline; hanya tampil di rincian dan draf logbook.
- Sumber: Lampiran I 7.4, 7.5; `KEPUTUSAN-LIFELINE` (disebut di spek kita).
- P2.

**U-14 `kondisi_tempat_mengungsi`** (opsi)
- Tanya: "Warga yang mengungsi malam ini tidur di mana?"
- Pilihan: Di posko atau gedung yang disediakan; Di rumah saudara atau tetangga; Di tenda atau terpal buatan sendiri; Di tempat terbuka tanpa atap; Tidak tahu.
- Berlaku: semua jenis yang punya `mengungsi_jiwa` > 0 (`bila: "mengungsi_jiwa"` seperti `titik_pengungsian`).
- Kelompok: `pengungsian`.
- Kenapa: "tempat terbuka tanpa atap" adalah sinyal paling keras bahwa tenda, terpal, dan selimut harus diprioritaskan; tidak terlihat dari nama tempat saja. Menambah arah ke kebutuhan perlindungan dasar.
- Tumpang tindih tahap 2: tahap 2 (F-4) mendata kapasitas, air, MCK, dapur umum tiap titik, tetapi baru setelah BPBD terkonfirmasi dan membuka berkas. Pertanyaan ini berguna di jam-jam awal dari warga. Setelah berkas tahap 2 aktif, isian ini tidak ditampilkan lagi (QP-12).
- Sumber: Perka 9/2008 Format-9 (penampungan sementara); Lampiran I 5.3 (jenis tempat: tenda, gedung publik, rumah kerabat).
- P2.

**U-15 `faskes_berfungsi`** (opsi, pertanyaan lanjutan K15)
- Muncul bila `fasilitas_kesehatan` > 0. Tanya: "Apakah fasilitas kesehatan yang rusak itu masih bisa melayani pasien?" Pilihan: Masih melayani seperti biasa; Melayani sebagian; Tutup, tidak bisa melayani; Tidak tahu.
- Kenapa: Lampiran I 6.3 menilai "masih berfungsi atau tidak"; bedakan puskesmas rusak ringan yang buka dari yang tutup untuk memilih rumah sakit rujukan.
- Sumber: Lampiran I 6.3 dan 7.6.
- P2.

**U-16 `rumah_tak_layak_huni`** (angka)
- Tanya: "Berapa rumah yang tidak bisa ditempati untuk sementara waktu, walaupun tidak roboh?" Penjelasan: "Misalnya penuh lumpur, miring, atau retak parah dan berbahaya ditinggali."
- Berlaku: semua jenis kecuali kekeringan. Kelompok: `rumah`.
- Kenapa: Lampiran I 6.1 memakai lima tingkat rumah: rusak berat, rusak sedang, tidak dapat dihuni sementara, rusak ringan, terendam. Isian kita hanya empat. Angka ini menentukan berapa warga butuh tempat tinggal sementara.
- Catatan: warga awam bukan penilai teknis; angka berstatus perkiraan dan diperiksa tahap 2. Tidak dijumlahkan dengan rumah rusak berat (satu rumah hanya satu tingkat, aturan Lampiran I 6.1).
- Sumber: Lampiran I Juklak 6.1.
- P2.

**U-17 `sudah_dilapor_ke`** (opsi_banyak)
- Tanya: "Kejadian ini sudah dikabarkan ke siapa saja?" Pilihan: Kepala desa atau RT; BPBD; Polisi, TNI, atau pemadam; Nomor darurat 112; Belum ke siapa pun; Tidak tahu.
- Berlaku: semua jenis. Kelompok: `situasi`.
- Kenapa: bila sudah sampai ke BPBD, staf cukup menyamakan dengan laporan BPBD; bila belum ke siapa pun, laporan ini mungkin satu-satunya sumber dan verifikasi jadi mendesak. Juga membantu menghindari kejadian ganda (K73).
- Sumber: Lampiran I 10.1 (sumber data) dan praktik de-duplikasi laporan warga; K66 dan K88 paket ini.
- P2.

**U-18 `tanda_tanah`** (opsi_banyak)
- Tanya: "Apakah ada perubahan di tanah setelah gempa?"
- Pilihan: Tanah retak atau terbelah; Tanah ambles atau turun; Keluar air atau pasir dari tanah -> Menyembur atau menggenang tanpa hujan; Longsor kecil; Tidak ada; Tidak tahu.
- Berlaku: gempa. Kelompok: `khusus`.
- Kenapa: DYFI dan formulir intensitas kita menilai efek pada orang dan benda; efek pada tanah menunjukkan bahaya turunan (likuefaksi, longsor susulan) yang mengubah rute evakuasi dan lokasi pengungsian. Bukti dari kejadian Palu 2018 (pengetahuan umum; sumber tertaut perlu ditambahkan oleh pengerja saat tiket dibuka).
- Sumber: kerangka DYFI (Quitoriano dan Wald 2020, Frontiers in Earth Science), https://www.frontiersin.org/articles/10.3389/feart.2020.00120 (bagian yang dibaca tidak merinci efek tanah; usulan ini penambahan kita).
- P2.

**U-19 `sumber_air_dekat`** (opsi)
- Tanya: "Apakah ada sungai, embung, sumur, atau kolam besar tidak jauh dari lokasi api?"
- Pilihan: Ada, kurang dari 1 kilometer; Ada, tetapi lebih jauh; Tidak ada; Tidak tahu.
- Berlaku: karhutla. Kelompok: `khusus`.
- Kenapa: mengarahkan jenis pemadaman (selang dan pompa dekat air atau bom air dan sekat bakar). Praktis bagi petugas karhutla.
- Sumber: Perka 9/2008 (sumber daya dan kendala sebagai bagian laporan); prosedur pemadaman karhutla milik modul karhutla (tidak saya baca di sesi ini).
- P2.

**U-20 `ukuran_longsor`** (opsi)
- Tanya: "Seberapa besar bagian yang longsor?"
- Pilihan: Selebar satu rumah -> Beberapa meter; Selebar beberapa rumah atau satu lapangan voli -> Puluhan meter; Selebar lapangan sepak bola -> Ratusan meter; Satu sisi bukit -> Lebih dari satu lapangan.
- Berlaku: longsor. Kelompok: `khusus`.
- Kenapa: menentukan perlu alat berat besar dan lama pembersihan.
- Sumber: tafsir saya atas praktik laporan gerakan tanah PVMBG (dimensi longsoran); BELUM saya verifikasi ke dokumen PVMBG, jadi tandai sebagai usulan murni.
- P2.

**U-21 `jarak_air_ke_rumah`** (opsi)
- Tanya: "Seberapa dekat air laut dengan rumah terdekat sekarang?"
- Pilihan: Sudah menyentuh rumah; Kurang dari 10 meter; 10 sampai 50 meter; Lebih dari 50 meter; Tidak tahu.
- Berlaku: abrasi. Kelompok: `khusus`.
- Kenapa: `garis_pantai` menilai seberapa jauh tergerus; jarak ke rumah menilai ancaman. Dua hal berbeda, hanya yang kedua menentukan relokasi sementara.
- Sumber: tafsir atas pola `garis_pantai` kita; tidak ada sumber eksternal untuk pita.
- P2.

---

### P3: nanti (3 butir)

**U-22 `urgensi_bantuan`** (opsi)
- Tanya: "Menurut Anda, apakah warga butuh bantuan dari luar desa?" Pilihan: Tidak, warga bisa mengatasi sendiri; Ya, dalam beberapa jam; Ya, sekarang juga; Tidak tahu.
- Mengapa P3: penilaian subjektif; pengalaman pelaporan warga menunjukkan laporan paling nyaring belum tentu paling parah (bias sumber). Bila dipakai, jangan masuk skor perhatian otomatis (QP-4). Menunggu keputusan pemilik.
- Sumber: Perka 9/2008 (kemampuan daerah, kendala), kerangka MIRA tentang prioritas (dari ringkasan).

**U-23 `ternak_mati`** (opsi)
- Tanya: "Apakah ada ternak yang mati?" Pilihan: Tidak ada; Beberapa ekor; Puluhan ekor; Ratusan ekor atau lebih; Tidak tahu.
- Berlaku: banjir, longsor, kekeringan, erupsi, cuaca, tsunami. Kelompok: `khusus`.
- Mengapa P3: Lampiran I 8.3 memintanya, tetapi tahap rapid assessment dan lebih relevan untuk pemulihan penghidupan daripada keputusan 24 jam.
- Sumber: Lampiran I Juklak 8.3.

**U-24 `peringatan_diterima`** (opsi)
- Tanya: "Sebelum kejadian, apakah ada peringatan yang sampai ke Anda?" Pilihan: Ya, sirene atau pengumuman; Ya, pesan di ponsel; Ya, dari tetangga atau petugas; Tidak ada; Tidak tahu.
- Berlaku: tsunami, erupsi, banjir bandang, cuaca (siklon). Kelompok: `khusus`.
- Mengapa P3: mengevaluasi sistem peringatan dini (BMKG, PVMBG), bukan menggerakkan respons 1 sampai 24 jam. Cocok sebagai bahan kaji ulang pasca-kejadian (`data/kajian-bnpb/kaji-ulang/`).
- Sumber: tidak ada pembanding yang saya baca langsung.

## 5. Yang sengaja TIDAK diusulkan

| Gagasan | Alasan |
| --- | --- |
| Nama korban, NIK, kontak keluarga, ciri orang hilang | Larangan PRD (tanpa nama korban dan NIK); sudah di tahap 2 dan K91 |
| Pemilahan jenis kelamin, umur, disabilitas (pertanyaan singkat Washington Group, Lampiran I 4.7) | Ranah tahap 2 BPBD per jiwa (F-5, K2); warga tidak bisa mendata pihak lain, dan pertanyaan disabilitas butuh pelatihan |
| Kerugian rupiah (8.5), status darurat dan SK (9.2), permintaan bantuan (9.3), posko (9.4), sumber daya (9.5) | Ranah BPBD lewat draf logbook (K56, D8); warga tidak tahu |
| Kematian tidak langsung (4.8) | Tahap penutupan, bukan laporan awal |
| Kapasitas, jumlah MCK, dapur umum per titik pengungsian | Duplikat tahap 2 (F-4) |
| Tingkat kerusakan teknis (retak diagonal, kolom, pondasi) | Terlalu teknis. DYFI sendiri menyimpulkan penilai awam tidak bisa menilai kerusakan berat; kita sudah memakai fenomena SIG, bukan kerusakan struktur |
| Skala MMI penuh atau magnitudo, kedalaman, episentrum | Data BMKG, bukan penglihatan warga |
| Debit sungai, tinggi muka air numerik, curah hujan angka | Hanya dari sensor dan stasiun; warga hanya diberi pilihan tubuh (selutut, sepinggang) |
| Penyebab, dugaan pelaku, siapa yang salah (di luar frasa kronologi yang sudah ada) | Risiko tuduhan pada orang; tidak mengubah tindakan 24 jam |
| Penjarahan, konflik, keamanan | Spekulatif, stigma, tidak bisa diverifikasi lewat chat |
| Anak terpisah dari orang tua, kebutuhan psikososial | Penting, tetapi butuh petugas terlatih dan peka trauma, bukan kuesioner pilihan; arahkan ke klaster perlindungan lewat BPBD |
| Harga pangan dan pasar | Penilaian lapangan petugas, bukan laporan warga (MIRA mengamatinya lewat observasi petugas) |
| Kecukupan air per orang dalam liter | Duplikat `krisis_air`, dan warga tidak mengukur liter |
| "Apakah sudah ada bantuan masuk?" | Duplikat `petugas_datang` dan `kebutuhan`; jawabannya berubah tiap jam sehingga cepat usang |
| Pertanyaan "apakah aman?" atau saran keselamatan buatan AI | Larangan PRD; yang boleh hanya templat tetap pada kronologi dan nomor 112, 115 |
| Kontak kepala desa atau RT sebagai isian | Data pribadi pihak ketiga; cukup nomor pelapor sendiri yang terlihat staf (D12) |

## 6. Dampak pada berkas dan gerbang bila nanti disetujui (catatan teknis, tidak dikerjakan)

- Semua usulan memakai bentuk ISIAN yang ada (`opsi`, `opsi_banyak`, `angka`) dan mekanisme `jenis`, `kecuali`, `bila`, `tanyaJenis`, `opsi[3]` filter jenis. Tidak butuh tipe baru.
- Kelompok baru `situasi` dan `penyelamatan` di `KELOMPOK`, dengan `tanya` kelompok bila perlu.
- Urutan A2: `korban` -> `penyelamatan` -> `situasi` -> pengungsian dan seterusnya. Perlu disesuaikan di `ALGORITMA` A2 dan di gerbang spek.
- `situasi_sekarang` memerlukan pemetaan tetap dari langkah kronologi (opsi `bahaya true`) ke nilai isian; uji di `tests/lapor`.
- Terjemahan Inggris dan bahasa daerah (K58) untuk kalimat dan pilihan baru harus ditambah; sebelum itu tampil dalam bahasa Indonesia.
- Semua teks baru melewati skill `bahasa-indonesia-plain`; pilihan berpenjelasan awam seperti isian lain.
- Tiap butir baru perlu entri di sumber dan keterangan Lampiran I bila ada (kolom "kode").
- Tidak ada tabel D1 baru bila `nilai` isian sudah JSON; cek ke warga-api sebelum tiket.

## 7. Pertanyaan terbuka untuk pemilik

Nomor memakai awalan QP agar tidak bentrok dengan Q di `KEPUTUSAN-LAPOR-AI.md`. Bawaan sementara BELUM keputusan; tandai **[BAWAAN SEMENTARA]**.

| QP | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| QP-1 | Boleh menambah P1 ke alur laporan awal asal selalu kondisional dan tidak wajib? | **[BAWAAN SEMENTARA]** Ya. P2 hanya sesudah kirim, P3 disimpan. |
| QP-2 | Bila pelapor memilih "Ya, ada yang terjebak" (U-01), apakah laporan otomatis memicu pita merah di meja seperti Lapor darurat (K68)? | **[BAWAAN SEMENTARA]** Ya di meja BNPB dan BPBD kab/kota (tanpa WA keluar), ditambah templat 112 dan Basarnas 115 ke pelapor. Tidak ada pesan otomatis ke Basarnas. |
| QP-3 | `situasi_sekarang` diturunkan dari kronologi atau ditanya terpisah? | **[BAWAAN SEMENTARA]** Diturunkan; hanya ditanya bila kronologi dilewati. |
| QP-4 | Apakah `kedekatan_pelapor` (U-04) dan `urgensi_bantuan` (U-22) boleh memengaruhi skor perhatian (K47)? | **[BAWAAN SEMENTARA]** Tidak. Hanya label untuk staf. |
| QP-5 | Pilihan pemadam dan SAR di `petugas_datang` (U-06) disetujui? | **[BAWAAN SEMENTARA]** Ya. |
| QP-6 | Mau menambah kabar sesudah kirim ditawarkan sebagai satu layar P2 (maksimum 5 pertanyaan sesuai jenis) atau lewat Laporan susulan (F-28) saja? | **[BAWAAN SEMENTARA]** Satu layar opsional "Mau menambah kabar?" sesudah ringkasan terkirim, memakai mekanisme susulan yang sama. |
| QP-7 | Jawaban baru `layanan_terganggu` (BBM, pangan, transportasi) mengalir ke Lifeline? Terkait Q41. | **[BAWAAN SEMENTARA]** Belum, ikut Q41 (hanya rincian dan draf logbook). |
| QP-8 | Jawaban `butuh_medis` "banyak warga mendadak sakit" diteruskan ke dinas kesehatan? | **[BAWAAN SEMENTARA]** Tidak; hanya tampil di rincian dan penanda meja. Penerusan ke dinas kesehatan menunggu keputusan dan nomor kontak. |
| QP-9 | Terjemahan bahasa daerah untuk butir baru, kapan? | **[BAWAAN SEMENTARA]** Indonesia dan Inggris dulu; bahasa daerah menyusul. |
| QP-10 | Pita jarak (500 meter, 2 km pada U-08, U-09) memakai angka bawaan sesi ini atau menunggu rujukan resmi (SOP Manggala Agni, Sphere)? | **[BAWAAN SEMENTARA]** Pakai sebagai kategori pilihan tanpa kata layak atau tidak layak, tinjau ulang setelah teks sumber dibaca. |
| QP-11 | Butir P3 (U-22 sampai U-24) disimpan atau dibuang? | **[BAWAAN SEMENTARA]** Disimpan sebagai daftar tunggu. |
| QP-12 | U-14 (kondisi tempat mengungsi) disembunyikan setelah tahap 2 untuk kab itu aktif? | **[BAWAAN SEMENTARA]** Ya, disembunyikan; datanya tetap tersimpan di laporan awal. |

## 8. Rekap

- Total 24 butir: P1 sembilan (U-01 sampai U-09), P2 dua belas (U-10 sampai U-21), P3 tiga (U-22 sampai U-24).
- Isian baru 21 butir; revisi isian lama 3 butir (U-06 petugas_datang, U-07 kebutuhan, U-13 layanan_terganggu).
- Lima teratas: U-01 butuh_penyelamatan, U-02 situasi_sekarang (turunan kronologi), U-03 akses_ke_lokasi, U-05 butuh_medis, U-04 kedekatan_pelapor. Disusul U-06 dan U-07 sebagai perbaikan biaya nol.

## 9. Sumber

Dibaca langsung:
- Perka BNPB 9/2008 tentang Prosedur Tetap Tim Reaksi Cepat, salinan Berita Negara 1409/2014: https://peraturan.go.id/files/BN+1409-2014.pdf (formulir kaji cepat: kronologi, korban, kerusakan, upaya, sumber daya, kendala, kebutuhan darurat, potensi bencana susulan; Format-7 sampai Format-11).
- Rancangan Juklak Standar Data Kejadian dan Dampak Bencana, Lampiran I, di repo: `data/kajian-bnpb/standar-data-bencana/03-juklak-baru/naskah/02-lampiran-1.md` (isian 4.x sampai 10.x).
- Quitoriano dan Wald, USGS "Did You Feel It?" (2020), Frontiers in Earth Science: https://www.frontiersin.org/articles/10.3389/feart.2020.00120 (desain kuesioner, keterbatasan awam menilai kerusakan berat, bias respons).
- UNHCR Emergency Handbook, MIRA: https://emergency.unhcr.org/node/629 (data primer dan sekunder, analisis situasi dalam 72 jam, prioritas wilayah dan kelompok).

Hanya hasil pencarian, teks belum dibaca langsung (perlu dicek ulang sebelum dikutip):
- IASC MIRA Guidance 2015: https://interagencystandingcommittee.org/node/2841 dan https://resourcecentre.savethechildren.net/pdf/mira_revised_2015_en_1.pdf/
- Sphere Handbook, Health Assessment Checklist: https://emergency.unhcr.org/sites/default/files/The Sphere Project, Handbook, Health Assessment Checklist, pp 338-340.pdf
- mPING (NOAA): https://mping.nssl.noaa.gov/types.php (jenis cuaca dipilih, banjir, longsor, kerusakan angin bertingkat keparahan)
- Ushahidi Haiti: https://www.usip.org/publications/2010/09/crowdsourcing-crisis-information-disaster-affected-haiti
- PetaBencana.id: https://restofworld.org/2021/hi-im-disaster-bot/
- Perka BNPB 7/2008 (kebutuhan dasar): https://pasal.id/peraturan/perban/peraturan-bnpb-no-7-tahun-2008 (tidak dibaca isinya; tidak dipakai sebagai dasar butir mana pun)
