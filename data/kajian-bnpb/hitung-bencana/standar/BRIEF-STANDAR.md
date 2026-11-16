# Brief penulis Standar Penghitungan dan Klasifikasi Kejadian Bencana

Status: catatan kerja, tidak dicetak.

## Apa yang ditulis

Pemilik membaca kajian lama dan versi IMRaD-nya lalu menilai kesimpulannya "masih menggantung": belum sampai
titik akhir apa definisi satu bencana dan bagaimana menghitungnya. Dokumen baru ini adalah PRODUK: rancangan standar
yang siap diangkat menjadi revisi Juklak 7/2023. Isinya ketentuan tegas, alat kerja untuk pencatat, dan bukti bahwa
ketentuan itu menjawab semua masalah. Bukan kajian, bukan diskusi opsi.

Semua angka, definisi, dan aturan WAJIB diambil dari `standar/LEMBAR-KETETAPAN.md`. Bila sumber lama berbeda,
lembar itu yang menang. Jangan menambah aturan yang tidak ada di lembar; bila menemukan celah, tulis di laporan balik.

## Cara menulis ketentuan

- Ketentuan ditulis tegas dalam kalimat aktif: "Jeda pemisah banjir adalah 7 hari." Jangan "diusulkan", "bawaan
  sementara", "sebaiknya", "dapat dipertimbangkan". Status usulan sudah diurus satu tabel di Pengantar.
- Ketentuan diberi nomor `Ketentuan n.m` (n = bab, m = urut dalam bab) dan dicetak tebal di awal butir, misalnya
  `**Ketentuan 2.4.** Jeda pemisah banjir adalah 7 hari.` Nomor ini dirujuk di matriks Bab 11 dan teks Juklak Bab 13,
  jadi IKUTI daftar ketentuan per bab di bawah persis (boleh menambah ketentuan di akhir bab, jangan mengubah urutan).
- Tiap bab dibuka satu paragraf: apa yang diatur bab ini dan pertanyaan apa yang dijawabnya. Tiap ketentuan boleh
  diikuti satu atau dua kalimat "Alasan:" yang pendek dengan angka bukti bila ada.
- Tabel lebih baik daripada paragraf panjang bila isinya daftar aturan.
- Kode UK-nn TIDAK dicetak di badan bab (hanya di tabel Pengantar). Kode kasus lama P-xx hanya di Bab 11.
- Tanpa singkatan buatan (KJN, CK, RBS, L1, M1, K1, opsi a). Tulis "kejadian nasional", "catatan kabupaten",
  "rumah setara rusak berat", "syarat masuk 1" dan seterusnya.
- Istilah Inggris boleh bila lebih jelas, dicetak miring, dijelaskan sekali: *hotspot*, *threshold*, *database*,
  *double counting*, *cut-off*.
- Frasa dinas yang lazim boleh (dalam rangka, guna, hal ini, adapun, selain itu, oleh karena itu).
- Gaya bahasa: `data/kajian-bnpb/qa/GAYA-BAHASA-KAJIAN.md`. Sebelum menyerahkan jalankan dari
  `D:\Project\Work\BNPB\poskokarhutla`: `py data\kajian-bnpb\qa\periksa_bahasa.py <berkas>` sampai temuan K nol.
- Tanpa em dash, titik tengah, tanda seru. BNPB dan BPBD ditulis "kita" bila perlu kata ganti. Jangan tulis
  "Pantau Bencana". Tanpa data pribadi. Angka antarsumber tidak dijumlah.
- Kutipan teks resmi (Juklak, Perka, UU) diambil dari `riset/REGULASI.md` dan naskah lama, dengan tanda kutip dan
  sumber halaman. Yang belum dicocokkan ke dokumen asli ditandai [BELUM TERVERIFIKASI]. Contoh rekaan ditandai
  [ILUSTRASI].
- Format Markdown mesin: `riset/KONVENSI-NASKAH.md`. Judul berkas `# BAB n Nama`. Subbab `## n.m Nama`.
  `Tabel n.m. Judul` di atas tabel, `Sumber: ...` di bawahnya. Gambar `![Gambar n.m. Judul](gbr/nama.png)` dengan
  json di `mesin/gambar/` berawalan `s-` untuk gambar baru (salin format json yang ada; pohon memakai
  `*.pohon.json`). Kotak `:::kartu`, `:::temuan`, `:::metode` boleh.

## Putaran perbaikan 1 (setelah pemeriksa bersih, 13 Nov)

- Penanda [BELUM TERVERIFIKASI] TIDAK dipasang pada ketentuan (aturan berlaku apa adanya). Penanda hanya pada
  kutipan bunyi teks resmi, dan cukup SATU kalimat catatan sumber per bab ("Kutipan Juklak 7/2023 di bab ini diambil
  dari salinan tidak resmi dan belum dicocokkan ke dokumen JDIH [BELUM TERVERIFIKASI]."), bukan di tiap kutipan.
  Daftar lengkap rujukan yang perlu dicocokkan ada di Lampiran (ditulis induk).
- Standar berlaku penuh sejak disahkan. Uji coba di tiga provinsi adalah tahap penerapan untuk melatih pencatat dan
  mengukur beban kerja, bukan syarat berlakunya aturan. Perubahan nilai hanya lewat revisi standar. Jangan menulis
  "diuji lagi saat uji coba", "angka bawaan", "sementara" untuk aturan. Batas data uji boleh ditulis sebagai fakta.
- Tiga provinsi uji coba: Riau (karhutla), Jawa Barat (banjir, longsor, gempa), Nusa Tenggara Timur (kekeringan).
- Bab 11: tanpa kode P-xx, RQ, A-xx. Pakai "Kasus 1" sampai "Kasus 65" (urut seperti kode lama), "Pertanyaan 1"
  sampai "Pertanyaan 7", "Uji 1" sampai "Uji 26", dengan nama biasa. Kolom "Kode lama" dihapus. Jangan merujuk
  tabel atau lampiran kajian lama.
- Ketentuan baru 7.7 (UK-39): tiap rilis triwulan Pusdatinkom memeriksa sampel 5 persen catatan kabupaten yang masuk
  hitungan terhadap dokumen pendukung (daftar pengungsi, foto, berita acara); selisih lebih dari 10 persen pada satu
  BPBD memicu pemeriksaan seluruh catatan BPBD itu pada triwulan tersebut. Menjawab kasus insentif menggelembungkan
  angka.

## Susunan dan daftar ketentuan

| Berkas | Bab | Subbab dan ketentuan wajib |
|---|---|---|
| `00-pengantar.md` | Pengantar (ditulis induk) | Tentang standar, cara membaca, Tabel Usulan Ketetapan |
| `01-definisi.md` | BAB 1 Definisi dan Peta Istilah | 1.1 Kejadian dan bencana (bahaya, kejadian bahaya, kejadian bencana, kejadian nasional, catatan kabupaten, kejadian berantai: induk dan anak, kejadian majemuk, kejadian di bawah ambang, kejadian terdeteksi belum diverifikasi); 1.2 Orang (meninggal langsung, meninggal tidak langsung, hilang, diduga meninggal, luka atau sakit, mengungsi, terdampak langsung, terancam, evakuasi preventif); 1.3 Bangunan dan lahan (rumah rusak berat, sedang, ringan, terendam, rumah setara rusak berat, fasilitas penting, luas terbakar terverifikasi, puso); 1.4 Waktu, status, dan angka (tanggal mulai, tanggal selesai, hari, status darurat, permintaan bantuan, kelas keparahan, versi angka, tiga keadaan isian); 1.5 Peta istilah (tabel padanan DIBI, Juklak 7/2023, Juklak 3/2022, logbook, Sendai) dan aturan istilah. Tiap definisi: definisi, termasuk, tidak termasuk, contoh. Ketentuan 1.1 sampai 1.5 = aturan istilah UK-01, UK-02, UK-03, satu orang satu kategori, hilang menjadi diduga meninggal |
| `02-satu-kejadian.md` | BAB 2 Menentukan Satu Kejadian | 2.1 Dua tingkat hitungan (Ketentuan 2.1 definisi satu kejadian, 2.2 dua tingkat dan dua angka bernama, 2.3 larangan pecahan dan aturan provinsi); 2.2 Nomor induk kejadian (2.4 format, 2.5 penerbit dan batas pengesahan, 2.6 nomor usulan dibawa tiap pengkinian); 2.3 Aturan umum (2.7 bentuk tidak memecah, 2.8 penggabungan sah tidak dibatalkan dan luas gabungan, 2.9 induk dan anak, 2.10 tanggal dan lintas tahun, 2.11 lokasi, 2.12 bahaya dari luar negeri, 2.13 batas durasi, 2.14 hari dan kode wilayah, 2.15 lingkup: kecelakaan transportasi); 2.4 Aturan per jenis bencana (Ketentuan 2.16, satu tabel 14 jenis: gabung bila, kejadian baru bila, selesai bila, dengan gambut 14 hari, banjir bandang subjenis); 2.5 Data lama (2.17 cara mencocokkan data lama); 2.6 Penerapan oleh mesin (2.18 aturan tertulis boleh dijalankan mesin dengan jejak) |
| `03-syarat-masuk.md` | BAB 3 Syarat Masuk Hitungan Bencana | 3.1 Enam syarat (Ketentuan 3.1 sampai 3.6, satu per syarat, ditambah tabel ringkas); 3.2 Penanda (3.7); 3.3 Urutan pemeriksaan (3.8: satu kejadian dibentuk dulu, angka sah, baru syarat); 3.4 Tiga status kejadian (3.9 status, 3.10 tenggang verifikasi, 3.11 nomor induk untuk deteksi); 3.5 Dasar masuk dan status sementara (3.12, 3.13); 3.6 Bencana nonalam (3.14); 3.7 Pencocokan SK (3.15); 3.8 Risiko menumpuk (3.16); 3.9 Laporan harian dan menonjol (3.17) |
| `04-kelas.md` | BAB 4 Kelas Keparahan | 4.1 Tabel kelas (Ketentuan 4.1); 4.2 Aturan kelas (4.2 kelas tertinggi dan indikator penentu, 4.3 meninggal dan hilang, 4.4 pengungsi saja paling tinggi Sedang dan dihitung di kabupaten asal, 4.5 kenaikan kelas untuk daerah berpenduduk kecil, 4.6 sumber penduduk, 4.7 rupiah tidak menentukan, 4.8 kelas sementara dan kelas akhir, 4.9 status darurat berdampingan); 4.3 Ukuran bahaya sebagai atribut (4.10 tabel atribut per jenis); 4.4 Jawaban: gempa skala berapa itu besar (4.11) |
| `05-angka.md` | BAB 5 Angka Korban, Kerusakan, dan Kerugian | 5.1 Nilai yang dipakai (Ketentuan 5.1 nilai terakhir atau terbesar per variabel dalam tabel, 5.2 larangan menjumlah antarhari); 5.2 Satu orang satu kategori (5.3); 5.3 Rumah dan fasilitas (5.4 tingkat kerusakan Perka 8/2011, 5.5 rumus rumah setara, 5.6 terendam, 5.7 fasilitas dalam satuannya); 5.4 Tiga keadaan isian dan hari tanpa laporan (5.8, 5.9); 5.5 Kerusakan dan kerugian (5.10 dua kolom, 5.11 IHK); 5.6 Sumber dan versi (5.12 satu angka resmi, 5.13 sumber luas, 5.14 rilis bernomor versi dan koreksi) |
| `06-penyajian.md` | BAB 6 Penyajian Data | 6.1 Sebelas aturan (Ketentuan 6.1 sampai 6.11); 6.2 Hotspot dan sensor (6.12, 6.13); 6.3 Tabel baku (contoh tabel bulanan dan tahunan); 6.4 Grafik baku (contoh) ; 6.5 Yang dilarang (6.14) |
| `07-tata-kelola.md` | BAB 7 Tata Kelola dan Alur Kerja | 7.1 Peran (tabel: BPBD, Pusdalops, Pusdatinkom, otoritas sektor, Basarnas/pos komando, dinas kesehatan, dinas pertanian; apa yang dilakukan masing-masing); 7.2 Alur dari laporan pertama sampai rilis (diagram atau tabel langkah dengan batas waktu); Ketentuan 7.1 pengesahan nomor induk 7 hari kerja, 7.2 keberatan BPBD 14 hari dan putusan 14 hari, 7.3 jadwal rilis bulanan dan pembekuan triwulan, 7.4 pemelihara tabel kode wilayah, 7.5 jejak keputusan mesin |
| `08-pohon.md` | BAB 8 Pohon Keputusan dan Lembar Periksa | 8.1 Pohon 1: laporan ini kejadian baru atau pengkinian; 8.2 Pohon 2: masuk hitungan atau tidak; 8.3 Pohon 3: kelas berapa; 8.4 Pohon 4: angka mana yang dipakai; 8.5 Lembar periksa satu halaman (tabel centang 15 sampai 20 butir) |
| `09-formulir.md` | BAB 9 Formulir Kejadian | 9.1 Kolom identitas; 9.2 Kolom bahaya dan lokasi; 9.3 Kolom korban; 9.4 Kolom kerusakan dan kerugian; 9.5 Kolom status dan penanda; 9.6 Kolom yang terisi otomatis. Tiap tabel: nama kolom, isi, jenis isian (angka, pilihan, teks, tanggal), wajib atau tidak, siapa mengisi, otomatis atau tidak. Termasuk 11 kolom baru dan perubahan nama kolom DIBI lama |
| `10-contoh.md` | BAB 10 Contoh Penghitungan | 8 contoh dari laporan pertama sampai kelas akhir: gempa 15 Agustus 2026 (11 kabupaten), dua api menyatu di Kapuas, banjir Aceh Utara 28 November 2025, kekeringan satu musim, banjir berulang di satu kabupaten, gempa dengan susulan merusak, erupsi gunung api, epidemi. Tiap contoh: data awal, langkah 1 sampai 4 dengan ketentuan yang dipakai, hasil (jumlah kejadian, catatan kabupaten, status, dasar masuk, kelas), dan bedanya dengan cara lama. Data nyata dari naskah lama dan json; bagian rekaan [ILUSTRASI] |
| `11-bukti.md` | BAB 11 Jawaban atas Rumusan Masalah dan 65 Kasus Sulit | 11.1 Tabel tujuh pertanyaan lama (satuan hitung, ambang masuk, apa yang diukur, dampak dan kerugian, skala, penyajian, penerapan) dengan jawaban satu kalimat dan nomor ketentuan; 11.2 Tabel 65 kasus per kelompok: kode lama, nama biasa, masalah satu kalimat, jawaban tegas satu kalimat, nomor ketentuan; status semua "terjawab"; 11.3 Ke-23 kasus yang dulu sebagian dan apa yang menutupnya; 11.4 Uji dengan 26 kasus buatan pemeriksa dan statusnya setelah standar |
| `12-uji.md` | BAB 12 Hasil Uji pada Data | 12.1 Data; 12.2 Jumlah kejadian lama dan baru per tahun; 12.3 Kestabilan antar-cara mencocokkan; 12.4 Sebaran kelas; 12.5 Status darurat lawan kelas; 12.6 Karhutla; 12.7 Batas uji (syarat 5 dan 6 belum terukur di DIBI, wawancara belum, ambang perlu dicek saat uji coba) |
| `13-teks-juklak.md` | BAB 13 Teks Pengganti Juklak 7/2023 | ditulis setelah bab lain selesai |
| `pustaka.md` | Daftar Pustaka | salin dari `naskah/pustaka.md`, buang entri yang tidak dirujuk bila mudah |
