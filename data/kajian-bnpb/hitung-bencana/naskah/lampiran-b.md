# Lampiran B. Matriks Uji Paradoks terhadap Kerangka

Status: Fase 2, versi 2.1. Uji kerangka Bab 6 (versi 2.1, sesudah uji adversarial dan uji konsistensi) terhadap 65 paradoks Lampiran A dan 26 kasus adversarial. Berkas bantu: `riset/UJI-KONSISTENSI.md` dan `riset/ADVERSARIAL.md`.

## B.1 Cara membaca matriks

Matriks ini menguji kerangka tiga lapis (Bab 6) seperti uji unit: tiap paradoks Lampiran A diberi satu status menurut apakah aturan kerangka memberi jawaban yang dapat diterapkan operator. Rekomendasi sementara pada butir 7 tiap paradoks, yang sudah diselaraskan dengan kerangka versi 2.1, dipakai sebagai jawaban pembanding. Bagian B.6 memuat uji yang sama untuk 26 kasus adversarial.

Singkatan lapisan: L1 unit kejadian, L2 ambang masuk, L3 skala keparahan, D aturan dampak dan kerugian, S aturan penyajian. Rujukan seperti 6.2.2 menunjuk subbab Bab 6, dan 'butir' menunjuk butir bernomor di subbab itu. Kode U-xx dan C-x menunjuk pertentangan dan celah di `riset/UJI-KONSISTENSI.md`; kode A-xx menunjuk kasus uji adversarial di `riset/ADVERSARIAL.md`.

Tabel B.1. Arti status uji

| Status | Arti |
| --- | --- |
| TERJAWAB | Aturan kerangka memberi satu jawaban yang dapat diterapkan operator tanpa tafsir tambahan. Angka bawaan yang tertulis dan dapat diterapkan tidak menurunkan status bila tidak ada bagian aturan yang kosong |
| SEBAGIAN | Arah jawaban ada, tetapi masih bergantung pada angka bawaan yang belum diuji, data yang belum ada, keputusan di luar kerangka, atau bagian aturan yang kosong |
| GAGAL | Kerangka tidak menjawab, atau jawabannya bertentangan dengan rekomendasi paradoks itu |
Sumber: kajian ini.

Penilaian ini dilakukan oleh penulis kerangka sendiri pada naskah yang sama, sehingga kemungkinan bias menguntungkan kerangka. Untuk mengurangi bias itu, status SEBAGIAN diberikan bila ada satu saja bagian aturan yang kosong atau bertentangan dengan KEPUTUSAN.md. Pemeriksa independen tetap diperlukan (Langkah 5).

## B.2 Matriks

Tabel B.2. Status tiap paradoks terhadap kerangka

| Kel. | Kode | Nama | Lapisan | Status | Aturan kerangka yang menjawab | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| A | P-01 | Menyatu | L1 | SEBAGIAN | 6.2.2 Tabel 6.2 (Karhutla); butir umum 2, 7, dan 9 | Rumus jarak (1,5 kali piksel terbesar, 0,6 sampai 1,5 km), selisih 48 jam, batas durasi 30 hari, dan pembatalan penggabungan palsu tertulis. Sisanya: cara menghitung luas gabungan belum tertulis, dan simulasi 0,28 persen dihitung pada aturan acuan 1 km dan 24 jam (U-07). |
| A | P-02 | Terpecah | L1 | TERJAWAB | 6.2.2 butir umum 1; Tabel 6.2 kolom Selesai | Bentuk tidak memecah kejadian; berakhir hanya bila semua bagian melewati jeda. |
| A | P-03 | Api berpindah (kapal Theseus) | L1 | TERJAWAB | 6.2.2 butir umum 1, 5, dan 7 | Pergeseran api tidak memecah kejadian; batas durasi 30 hari memotongnya menjadi KJN "lanjutan dari"; segmen wilayah tersimpan di daftar wilayah. Batas 30 hari belum diuji pada musim penuh. |
| A | P-04 | Menyala lagi | L1 | SEBAGIAN | 6.2.2 Tabel 6.2 (Karhutla), kolom Kejadian baru; butir umum 7 | Jeda 7 hari berlaku dan hari buta satelit tidak dihitung; pengecualian jeda untuk gambut belum ada. |
| A | P-05 | Lintas batas | L1, S | TERJAWAB | 6.2.1 butir 1 dan 2; 6.6 butir 1 dan 10 | KJN dan CK diberi nama berbeda; provinsi menghitung KJN yang menyentuhnya dan tidak dijumlah menjadi angka nasional (C-3 selesai). Nasib CK tanpa dampak sendiri belum eksplisit (U-02). |
| A | P-06 | Berulang | L1 | SEBAGIAN | 6.2.2 Tabel 6.2 (Banjir); butir umum 7 | Jeda 7 hari dan batas durasi 30 hari berlaku; bawaan Q-09 belum diuji pada laporan BPBD. |
| A | P-07 | Berantai | L1 | TERJAWAB | 6.2.2 butir umum 3; Tabel 6.2 (Tsunami, likuefaksi) | Pohon akar dan anak bertingkat; jumlah kejadian hanya menghitung akar; korban dicatat sekali. "Anak" kini hanya untuk bahaya ikutan, per kabupaten disebut CK (U-19 selesai). |
| A | P-08 | Susulan | L1 | TERJAWAB | 6.2.2 Tabel 6.2 (Gempa bumi); butir umum 9 | 30 hari dengan batas 90 hari; zona adalah kabupaten terdampak gempa utama ditambah yang bersinggungan; gempa sama atau lebih besar dengan dampak terpisah menjadi KJN baru (U-12 selesai). Belum diuji pada katalog gempa. |
| A | P-09 | Majemuk | L1 | TERJAWAB | 6.2.2 butir umum 3 | Tanpa rantai sebab, bahaya berbeda jenis menjadi KJN terpisah (A-05); bila rantai ada tetapi pemicunya tidak jelas, jenis utama akar adalah bahaya dengan dampak terbesar, diukur dengan meninggal dan hilang lalu RBS (C-5 selesai). |
| A | P-10 | Lambat | L1 | TERJAWAB | 6.2.2 Tabel 6.2 (Kekeringan, abrasi; Kabut asap) | Kekeringan per periode kemarau zona musim BMKG, abrasi per tahun kalender, kabut asap anak karhutla (U-06 selesai). Zona musim BMKG masih [BAWAAN SEMENTARA]. |
| A | P-11 | Lintas tahun | L1, D | TERJAWAB | 6.2.2 butir umum 4; 6.5 butir 5 | Tahun tanggal mulai dengan penanda lintas tahun. |
| A | P-12 | Titik lawan wilayah | L1 | TERJAWAB | 6.2.2 butir umum 5; 6.5 butir 6 | Titik perwakilan, daftar kabupaten, poligon atau grid bila ada, sumber luas wajib. |
| A | P-38 | Tulis ulang harian | L1, D | SEBAGIAN | 6.2.2 butir umum 9; 6.5 butir 5 | Identitas dibawa sejak laporan pertama; bergantung pada perubahan praktik Pusdalops. Kalimat kunci data lama belum menyebut penggabungan kabupaten beririsan (U-24). |
| A | P-39 | Tanggal kejadian lawan tanggal laporan | L1, D | TERJAWAB | 6.2.2 butir umum 4; 6.5 butir 5 | Tanggal dampak pertama untuk hitungan, tanggal laporan sebagai metadata. Karhutla tanpa dampak memakai deteksi pertama (lihat bagian c uji konsistensi). |
| A | P-48 | Pecahan kejadian | L1, S | TERJAWAB | 6.2.1; 6.5 butir 8; 6.6 butir 1 dan 11 | Pecahan dilarang sebagai satuan penyajian; DIBI menjadi angka utama setelah satuannya diganti menjadi KJN dan CK tanpa pecahan (U-09 selesai). |
| A | P-50 | Jenis gabungan | L1 | SEBAGIAN | 6.2.2 butir umum 3; Tabel 6.2 | Satu KJN punya satu jenis utama dan daftar jenis termuat (A-14). Daftar tertutup nama kejadian dan penempatan banjir bandang sebagai jenis tersendiri belum tertulis. |
| A | P-56 | Kejadian tanpa wilayah darat | L1 | TERJAWAB | 6.2.2 butir umum 5 | Kabupaten terdampak terdekat, titik laut disimpan. Lingkup kecelakaan pelayaran (Q-17) tidak dimuat kerangka. |
| A | P-64 | Bahaya dari luar negeri | L1 | TERJAWAB | 6.2.2 butir umum 6 | Dicatat bila berdampak di wilayah kita, dengan penanda sumber luar negeri. |
| B | P-13 | Sorites | L1, L2 | TERJAWAB | 6.1 (urutan); 6.3.1 M5 | Urutan L1 lebih dulu sudah menjawab inti paradoks; M5 2 hektare kini selaras dengan bawaan Q-04 (U-15 selesai). |
| B | P-14 | Iris salami | L1, L2 | TERJAWAB | 6.3.1; 6.2.1; 6.6 butir 1 | Ambang diuji pada KJN, dua angka bernama berbeda. |
| B | P-15 | Melingkar | L2 | TERJAWAB | 6.3.1 M6 dan baris Penanda | Permintaan bantuan dan status menjadi penanda; hanya SK tanggap darurat yang cocok dengan kejadian memicu. |
| B | P-16 | Insentif (hukum Goodhart) | L2, D | TERJAWAB | 6.3.2; 6.3.3; 6.5 butir 5; Bab 9.3 | Versi angka, dasar masuk, dan kolom status (bencana, di bawah ambang, terdeteksi belum diverifikasi) tertulis. Penggelembungan tetap tidak dapat dinilai sampai ada data hasil verifikasi (keterbatasan). |
| B | P-17 | Normalisasi | L2, L3 | SEBAGIAN | 6.3.1; 6.4.2 butir 3; 6.6 butir 5 | Ambang absolut untuk masuk, persen penduduk sebagai penaik berlantai, dan angka per 100.000 penduduk berdampingan; Q-20 dan Q-34 diselaraskan (U-10 dan U-17 selesai). Sumber dan tahun penduduk belum ditetapkan. |
| B | P-18 | Bahaya tanpa bencana | L2 | TERJAWAB | 6.3.2 | Disimpan sebagai kejadian di bawah ambang, tidak dijumlah dengan kejadian bencana. |
| B | P-19 | Bencana tanpa bahaya ekstrem | L2, L3 | TERJAWAB | 6.3.1; 6.4.3 | Dampak menjadi dasar masuk; ukuran bahaya hanya atribut. |
| B | P-20 | Kriteria 4 mencampur jenis lahan | L2 | SEBAGIAN | 6.3.1 M5; 6.5 butir 6 | Dua kelompok lahan dengan angka 2 hektare (karhutla) dan 10 hektare (puso); jenis lahan karhutla (gambut, hutan, kebun) belum dibedakan. |
| B | P-40 | Satelit lawan laporan | L2 | SEBAGIAN | 6.3.2 alinea 2 | Tenggang 3 hari, status "tidak terverifikasi, kedaluwarsa", dan jalan pindah bila diverifikasi kemudian tertulis (A-12). Apakah daftar ini mendapat nomor KJN belum tertulis (C-6). |
| B | P-51 | Evakuasi preventif | L2, D | TERJAWAB | 6.3.1 M2; 6.5 butir 1 | Tidak dihitung pada M2, dicatat sebagai penanda. |
| B | P-57 | Penyebab manusia | L2, D | TERJAWAB | 6.4.3 (pemicu dominan) | Atribut pemicu dominan (alam, manusia sengaja, manusia lalai, teknologi) ditetapkan Pusdatinkom saat verifikasi dan tidak mengubah jenis bahaya (Q-23). |
| B | P-58 | Dua ambang dalam satu lembaga | L2 | SEBAGIAN | 6.3.1 M5 dan alinea sesudah Tabel 6.3; Bab 9.1 butir 4 dan 9.4 butir 3 | Satu tangga: M1 sampai M6 untuk masuk, kelas Sedang ke atas untuk menonjol, angka luas M5 sama dengan ambang menonjol Pusdalops (U-18 selesai). Ambang menonjol jenis lain belum dibandingkan dengan M1 sampai M4. |
| B | P-62 | Status payung | L2 | SEBAGIAN | 6.3.1 M6 dan baris Penanda | M6 mensyaratkan jenis, wilayah, dan tanggal mulai yang cocok (A-13). Siapa yang mencocokkan SK yang menyebut beberapa kejadian belum tertulis di M6. |
| B | P-63 | Status mendahului kejadian | L2 | TERJAWAB | 6.3.1 M6 dan baris Penanda | Hanya tanggap darurat yang memicu; siaga darurat menjadi penanda. |
| C | P-21 | Magnitudo lawan dampak | L3 | TERJAWAB | 6.4.3; 6.4.4 | Magnitudo hanya atribut bahaya; kelas dari dampak. |
| C | P-22 | Skala yang dipakai | L3 | TERJAWAB | 6.4.3 (gempa) | Jenis skala dicatat. Nama sumber dan perlakuan data historis belum disebut. |
| C | P-23 | Kematian langsung lawan tak langsung | L2, D | SEBAGIAN | 6.3.1 M1; 6.5 butir 1 | Kolom terpisah ada; jendela atribusi tanpa angka dan tanpa penetapnya (Q-26 tidak dirujuk). |
| C | P-24 | Hilang | L2, L3, D | SEBAGIAN | 6.3.1 M1; 6.4.2 butir 1; 6.5 butir 1 dan 5 | Meninggal dan hilang dihitung sebagai nilai terbesar jumlah keduanya per laporan, jadi double counting selesai (U-04). Peralihan ke "diduga meninggal" ada; siapa menutup pencarian (Q-24) belum tertulis. |
| C | P-25 | Double counting | L2, D | TERJAWAB | 6.5 butir 2; 6.3.1 M2 | Satu orang satu kategori dan M2 menjumlah orang unik (A-10). Penjumlahan pada data lama yang belum mengikuti prinsip itu belum diatur (U-23, keterbatasan). |
| C | P-26 | Tingkat kerusakan | L2, D | TERJAWAB | 6.3.1 M3 dan M4; 6.5 butir 3; Bab 7.3.2 | Bobot RBS (1, 0,5, 0,25) bawaan Q-27 sudah disimulasikan; fasilitas dipisah dari rumah dengan daftar tertutup; rumah belum terpilah berbobot 0,25 (A-26). |
| C | P-27 | Angka bergerak | D, S | TERJAWAB | 6.5 butir 5; 6.6 butir 7; 6.3.1 | Aturan nilai (terakhir lawan terbesar selama masa KJN) plus nomor versi; status "bencana" sementara selama tanggap darurat dan akhir pada rilis statis (C-1 dan U-05 selesai). |
| C | P-41 | Angka kumulatif | D | TERJAWAB | 6.5 butir 5; 6.6 butir 11 | Menjumlah angka antarhari dilarang. |
| C | P-49 | Kosong lawan nol | D | TERJAWAB | 6.5 butir 4 | Tiga keadaan isian: bernilai, nihil, belum didata. |
| C | P-52 | Kematian yang bukan akibat bahaya | L2, D | SEBAGIAN | 6.3.1 M1; 6.5 butir 1 | Akibat langsung didefinisikan; penetap atribusi tidak disebut. |
| C | P-53 | Terancam lawan terdampak | L2 | TERJAWAB | 6.3.1 M2 | "Berpotensi terdampak", "terancam", dan evakuasi preventif tidak dihitung. |
| C | P-54 | Rumah terendam | L2, D | TERJAWAB | 6.3.1 M2 dan M3; 6.5 butir 3 | Rumah terendam tidak dihitung sebagai unit M3; penghuni rumah yang tergenang sampai masuk menjadi terdampak langsung di M2. |
| C | P-60 | Sumber angka luas | L2, D | SEBAGIAN | 6.5 butir 6; 6.3.1 M5 | Dua sumber sah dan angka 2 hektare selaras Q-04; "citra resolusi tinggi" dan pemverifikasi tidak didefinisikan. |
| D | P-28 | Bias kekayaan | L3, D | TERJAWAB | 6.4.2 butir 4; 6.5 butir 7 | Rupiah tidak menentukan ambang atau kelas; dicatat dengan rasio terhadap PDRB atau APBD. |
| D | P-29 | Kerusakan lawan kerugian | D | TERJAWAB | 6.5 butir 7 | Dua kolom terpisah mengikuti Perka BNPB 15/2011, tidak dijumlah. |
| D | P-30 | Inflasi | D, S | SEBAGIAN | 6.5 butir 7; 6.6 butir 11 | Tahun harga wajib; indeks dan tahun dasar belum dipilih. |
| D | P-31 | Banyak penghitung | D, S | TERJAWAB | 6.5 butir 8; 6.6 butir 6 | Satu angka resmi per versi; sumber lain berdampingan, tidak dijumlah. DIBI menjadi angka utama setelah satuannya KJN dan CK (U-09 selesai). |
| E | P-32 | Kecil-kecil jadi bukit | L3 | SEBAGIAN | 6.3.2 alinea 1 | Kerangka hanya menyebut extensive risk; penanda 30 meninggal atau 600 rumah tidak dirumuskan. |
| E | P-33 | Besar menurut siapa | L3, S | SEBAGIAN | 6.4.2 butir 3; 6.6 butir 5 | Kelas absolut dengan penaik relatif 10 persen berlantai, angka mutlak dan persen penduduk berdampingan (U-17 selesai). Sumber dan tahun penduduk serta data anggaran daerah per kejadian belum ada. |
| E | P-34 | Gempa skala berapa itu besar | L3 | TERJAWAB | 6.4.4 | Tidak ada magnitudo yang otomatis berarti bencana besar; kelas B menurut dampak. |
| E | P-42 | Naik kelas di tengah jalan | L3, D | SEBAGIAN | 6.4.2 butir 5; 6.5 butir 5; 6.3.1 | Kelas sementara boleh naik, kelas akhir pada rilis statis, status "bencana" sementara ada (C-1 selesai). Kelas akhir pada rilis pertama sesudah KJN selesai dan koreksi turun belum tertulis (U-20). |
| E | P-65 | Respons sebagai ukuran | L3 | TERJAWAB | 6.4.1 opsi c; 6.4.2 butir 6 | Respons hanya pembanding; ketidakcocokan menjadi bahan evaluasi. Permintaan data SK (Q-35) belum diajukan. |
| F | P-35 | Spurious trend | S | TERJAWAB | 6.6 butir 4 dan 10 | Tren pada deret sebanding, series break 2025, korban meninggal sebagai pendamping; deret yang melintasi tahun mulai berlakunya kerangka diberi tanda series break (C-4 selesai). |
| F | P-36 | Paradoks Simpson | S | TERJAWAB | 6.6 butir 8 | Tren nasional terbit bersama jumlah provinsi berlawanan arah. Penanda pembalikan penuh oleh mesin belum ditulis. |
| F | P-37 | Long tail | S | TERJAWAB | 6.6 butir 2 dan 3 | Rata-rata dilarang berdiri sendiri; median, total, dan porsi 1 persen teratas. |
| F | P-43 | Hotspot lawan lokasi unik | S | SEBAGIAN | 6.6 butir 6 | Definisi kolom wajib; nama definisi hotspot dan daftar satelit tidak disebut. |
| F | P-44 | Pergantian alat ukur | S | SEBAGIAN | 6.6 butir 4 | Series break 1 November 2026 ada; penyimpanan sensor per hari dan deret sambung tidak ditulis. |
| F | P-55 | Pemekaran wilayah | S, D | SEBAGIAN | 6.6 butir 9; 6.2.2 butir umum 8 | Kode wilayah CK diambil pada tanggal dampak pertama dengan tabel padanan kode lama dan baru (A-23); pemelihara tabel (Q-37) belum ditetapkan. |
| F | P-61 | Hari tanpa laporan | S, D | SEBAGIAN | 6.5 butir 4; 6.6 butir 4; 6.2.2 butir umum 7 | Tiga keadaan berlaku untuk angka, bukan untuk hari; hari buta satelit dikeluarkan dari jeda karhutla, tetapi hari kosong logbook sebagai tidak diketahui belum tertulis. |
| G | P-45 | Siapa berwenang menyatakan satu kejadian | L1 | SEBAGIAN | 6.2.1 butir 1; 6.2.2 butir umum 9 | Penerapan aturan tertulis oleh mesin (dengan jejak, dapat dibatalkan) dibedakan dari keputusan Pusdatinkom (U-08 selesai). Batas waktu pengesahan dan jalur keberatan BPBD belum tertulis. |
| G | P-46 | Koreksi setelah terbit | D, S | TERJAWAB | 6.5 butir 5; 6.6 butir 7 | Rilis bulanan berversi, dibekukan per triwulan, tabel angka terbit lawan angka kini; ritme selaras dengan Q-41. |
| G | P-47 | Bencana nonalam dan sosial | L1, L2 | TERJAWAB | 6.2.2 Tabel 6.2 (Epidemi, konflik sosial); 6.3.1 | Epidemi dan konflik sosial masuk lewat penetapan otoritas sektor ditambah M1; M2 sampai M5 tidak berlaku (U-21 selesai). Cara DIBI mencatat COVID-19 (Q-43) tidak diketahui dan tidak dipakai sebagai contoh. |
| G | P-59 | Banyak sistem identitas | L1 | TERJAWAB | 6.2.2 butir umum 9; 6.2.1 butir 1 | Kode kluster harian bukan identitas; nomor induk dari Pusdatinkom; KIB dimiliki tiap CK (U-19 selesai). |
Sumber: Bab 6 dan Lampiran A, kelompok A sampai G.

## B.3 Rekap

Tabel B.3. Jumlah paradoks menurut status dan kelompok, kerangka versi 2.1

| Kelompok | Jumlah | TERJAWAB | SEBAGIAN | GAGAL |
| --- | ---: | ---: | ---: | ---: |
| A Identitas kejadian | 18 | 13 | 5 | 0 |
| B Ambang masuk | 14 | 9 | 5 | 0 |
| C Ukuran dan korban | 13 | 9 | 4 | 0 |
| D Kerugian dan uang | 4 | 3 | 1 | 0 |
| E Klasifikasi besar, sedang, kecil | 5 | 2 | 3 | 0 |
| F Penyajian | 7 | 3 | 4 | 0 |
| G Kelembagaan | 4 | 3 | 1 | 0 |
| Jumlah | 65 | 42 | 23 | 0 |
Sumber: Tabel B.2.

Dari 65 paradoks, 42 terjawab penuh (65 persen), 23 sebagian (35 persen), dan tidak ada yang gagal. Penilaian pertama pada kerangka versi 2 memberi 33 terjawab, 30 sebagian, dan 2 gagal. Di versi 2.1, tujuh paradoks naik dari SEBAGIAN ke TERJAWAB (P-03, P-08, P-09, P-10, P-13, P-16, P-26) dan dua naik dari GAGAL ke TERJAWAB (P-47 dan P-57); tidak ada yang turun. Status SEBAGIAN paling padat di kelompok E (3 dari 5) dan F (4 dari 7); paling sedikit di kelompok D dan G (masing-masing 1 dari 4). Kelompok A dan F memuat jumlah SEBAGIAN terbanyak secara mutlak (5 dari 18 dan 4 dari 7).

Pola yang berulang pada status SEBAGIAN ada empat. Pertama, bagian aturan yang masih kosong (cara menghitung luas gabungan, penutup pencarian, pencocok SK, nomor daftar terdeteksi: P-01, P-09, P-24, P-40, P-62). Kedua, angka bawaan yang belum diuji pada data atau laporan BPBD (P-04, P-06, P-20, P-58). Ketiga, rekomendasi lampiran yang belum ikut ke Bab 6 (P-43, P-44, P-50, P-61, P-32, P-52). Keempat, data atau keputusan di luar kerangka: sumber dan tahun penduduk (P-17, P-33), indeks harga konstan (P-30), tabel konkordansi pemekaran (P-55), praktik Pusdalops (P-38), atribusi kematian (P-23), citra resolusi tinggi (P-60), saat penetapan kelas akhir (P-42), dan wewenang Pusdatinkom (P-45).

## B.4 Paradoks yang belum terjawab penuh: sebab dan usulan

Kolom 'Jenis' membedakan usulan perbaikan kerangka (P), pengakuan sebagai keterbatasan (K), atau keduanya (PK). Tidak ada paradoks berstatus GAGAL; tabel memuat 24 paradoks SEBAGIAN.

Tabel B.4. Sebab dan usulan untuk status SEBAGIAN

| Kode | Status | Sebab | Usulan | Jenis |
| --- | --- | --- | --- | --- |
| P-01 Menyatu | SEBAGIAN | Rumus jarak (1,5 kali ukuran piksel terbesar pasangan, paling kecil 0,6 km dan paling besar 1,5 km) dan selisih 48 jam sudah tertulis di Tabel 6.2 (U-14 selesai). Yang masih kosong: cara menghitung luas gabungan (gabungan poligon, bukan jumlah). Beban pencatatan 0,28 persen dihitung pada aturan acuan 1 km dan 24 jam, bukan pada aturan tabel (U-07). | Tulis cara menghitung luas gabungan; jalankan ulang simulasi Bab 5.3 dengan aturan final. | P |
| P-04 Menyala lagi | SEBAGIAN | Jeda 7 hari adalah bawaan Q-09, dan hari buta satelit tidak dihitung (A-03). Rekomendasi P-04 menyebut jeda lebih panjang untuk gambut yang belum ditetapkan, dan tabel tidak memuat pengecualian itu. | Tambahkan baris gambut di Tabel 6.2 setelah uji; sampai itu, akui sebagai keterbatasan. | PK |
| P-06 Berulang | SEBAGIAN | Jeda 7 hari adalah bawaan Q-09 dan kini dibatasi durasi 30 hari. Jeda banjir di DIBI tersebar dari 1 sampai 30 hari, sehingga pilihan jeda menggeser hitungan (logbook: 3.860 kejadian dengan kunci berbasis tanggal, 2.809 dengan kunci tanpa tanggal dan jeda 7 hari, selisih 27,2 persen). Jeda 1 atau 2 hari mungkin hanya keterlambatan lapor. | Tampilkan analisis sensitivitas jeda (3, 7, dan 14 hari) dan akui sebagai keterbatasan sampai ada laporan BPBD yang menyebut air surut. | K |
| P-09 Majemuk | TERJAWAB | Bab 6.2.2 aturan 3: bahaya berbeda jenis tanpa rantai sebab menjadi KJN terpisah; bila rantai dinyatakan ada tetapi pemicunya tidak jelas, jenis utama akar adalah bahaya dengan dampak terbesar, diukur dengan meninggal dan hilang lalu RBS (C-5 selesai). | Tidak perlu. | P |
| P-38 Tulis ulang harian | SEBAGIAN | KIB sejak laporan pertama baru berjalan bila Pusdalops mengubah praktik pelaporan (Q-19), keputusan di luar penulis kerangka. Kalimat kunci data lama di butir umum 9 belum menyebut penggabungan kabupaten beririsan seperti Q-19 (U-24). | Tulis kunci data lama secara lengkap (kunci V1g beserta penggabungannya); akui ketergantungan pada Pusdalops sebagai keterbatasan. | PK |
| P-50 Jenis gabungan | SEBAGIAN | Kerangka memuat satu jenis utama dan daftar jenis termuat (A-14), tetapi tidak memuat daftar tertutup nama kejadian yang diminta rekomendasi P-50. Banjir bandang tidak ditempatkan; Tabel 6.2 menggabungkan banjir, banjir bandang, dan rob dalam satu baris tanpa menjelaskan apakah itu satu "jenis". | Tambahkan butir L1: nama kejadian dari daftar tertutup, dan tempat banjir bandang terhadap 13 kode baku. | P |
| P-17 Normalisasi | SEBAGIAN | Q-20 dan Q-34 sudah diselaraskan: ambang absolut untuk masuk, persen penduduk sebagai penaik berlantai, per 100.000 penduduk berdampingan (U-10 dan U-17 selesai). Sumber dan tahun penduduk belum ditetapkan (KEPUTUSAN.md: "penduduk BPS bila tersedia"). Pada data DIBI di Lampiran A (P-33), hanya 5,2 persen baris mencapai 5 persen penduduk, sehingga penaik 10 persen jarang berlaku. | Tetapkan sumber dan tahun penduduk (proyeksi BPS tahun kejadian); uji penaik pada tabel penduduk setelah terhubung. | PK |
| P-20 Kriteria 4 mencampur jenis lahan | SEBAGIAN | M5 membedakan karhutla (2 hektare) dan sawah atau kebun puso (10 hektare), selaras Q-04 (U-15 selesai). Rekomendasi P-20 meminta ambang per jenis lahan dan bahaya; jenis lahan karhutla (gambut, hutan, kebun) tidak dipisah. | Setelah simulasi Q-04, tambahkan jenis lahan karhutla ke M5; sampai itu, akui sebagai keterbatasan. | PK |
| P-40 Satelit lawan laporan | SEBAGIAN | Daftar "terdeteksi, belum diverifikasi" dengan tenggang 3 hari, status "tidak terverifikasi, kedaluwarsa", dan jalan pindah bila diverifikasi kemudian sudah tertulis (A-12). Apakah daftar ini mendapat nomor KJN belum tertulis (C-6). | Sebut identitas daftar: nomor tersendiri, bukan KJN, dan tidak dijumlah dengan kejadian bencana. | P |
| P-58 Dua ambang dalam satu lembaga | SEBAGIAN | Satu tangga sudah tertulis (M1 sampai M6 untuk masuk, kelas Sedang ke atas untuk menonjol, angka luas M5 sama dengan ambang menonjol). Ambang menonjol jenis lain (misalnya banjir 50 KK atau 200 orang) belum dibandingkan dengan M1 sampai M4. | Bandingkan ambang menonjol per jenis dengan kelas Sedang sebelum Juklak direvisi. | P |
| P-62 Status payung | SEBAGIAN | M6 mensyaratkan SK yang menyebut jenis, wilayah, dan tanggal mulai yang cocok dengan KJN (A-13). Siapa yang mencocokkan SK yang menyebut beberapa kejadian tidak tertulis di M6. | Tambahkan: pencocokan oleh Pusdatinkom (Q-08), dengan rujukan SK per KJN. | P |
| P-23 Kematian langsung lawan tak langsung | SEBAGIAN | Kerangka memisahkan kematian tak langsung dan menyebut "jendela atribusi per jenis", tetapi tanpa angka dan tanpa menyebut siapa yang menetapkan atribusi (Q-26 tidak dirujuk). | Akui sebagai keterbatasan sampai Q-26 dan data atribusi ada; tulis rujukan Q-26 di 6.5 butir 1. | PK |
| P-24 Hilang | SEBAGIAN | Double counting hilang yang kemudian ditemukan meninggal sudah selesai: meninggal dan hilang dihitung sebagai nilai terbesar jumlah keduanya per laporan (U-04). Siapa menutup pencarian (Q-24) tidak disebut. | Sebut penutup pencarian (BPBD mengusulkan, Pusdatinkom memutuskan). | P |
| P-52 Kematian yang bukan akibat bahaya | SEBAGIAN | "Tewas akibat langsung bahaya" didefinisikan, tetapi siapa memutuskan atribusi (BPBD mengusulkan, Pusdatinkom memutuskan menurut Q-26) tidak tertulis. | Tambahkan satu kalimat di 6.5 butir 1 tentang pembagian wewenang atribusi. | P |
| P-60 Sumber angka luas | SEBAGIAN | Sumber yang boleh memicu M5 sudah jelas dan angka 2 hektare selaras Q-04, tetapi "citra resolusi tinggi" tidak punya batas (resolusi, tanggal) dan pihak pemverifikasi tidak disebut. | Definisikan citra resolusi tinggi dan pihak pemverifikasi (BPBD mengusulkan, Pusdatinkom mengesahkan). | P |
| P-30 Inflasi | SEBAGIAN | Kerangka mewajibkan tahun harga dan melarang rupiah lintas tahun tanpa harga konstan, tetapi indeks dan tahun dasar (Q-32) belum dipilih pemilik. | Keterbatasan sampai pemilik memilih indeks BPS. | K |
| P-32 Kecil-kecil jadi bukit | SEBAGIAN | Rekomendasi P-32 meminta penanda turunan di L3 pada unit KJN dengan ambang 30 meninggal atau 600 rumah rusak berat (Q-36). Kerangka hanya menyebut "dapat dianalisis sebagai extensive risk" tanpa merumuskan penanda atau ambang. | Tambahkan di 6.4.3 penanda ekstensif dan intensif pada unit KJN, ambang 30 meninggal atau 600 rumah rusak berat sebagai label analisis [BAWAAN SEMENTARA]. | P |
| P-33 Besar menurut siapa | SEBAGIAN | Kelas absolut dengan penaik relatif dan angka mutlak berdampingan dengan persen penduduk sudah tertulis (U-17 selesai). Sumber dan tahun penduduk belum ditetapkan, dan data anggaran daerah per kejadian tidak tersedia. | Sama dengan P-17; akui keterbatasan data anggaran. | PK |
| P-42 Naik kelas di tengah jalan | SEBAGIAN | Kelas sementara boleh naik, kelas akhir pada rilis statis, dan status "bencana" sementara sudah tertulis (C-1 selesai). Opsi D P-42 membekukan kelas saat kejadian ditutup, sedangkan kerangka menetapkannya pada rilis statis; koreksi turun kelas tidak diatur (U-20). | Tetapkan: kelas akhir = kelas pada rilis pertama sesudah KJN selesai; izinkan koreksi turun; simpan tanggal penetapan. | P |
| P-43 Hotspot lawan lokasi unik | SEBAGIAN | Butir 6 mewajibkan sumber, periode, dan definisi kolom secara umum. Kewajiban khusus rekomendasi P-43 (nama definisi hotspot dan daftar satelit aktif hari itu) dan definisi baku Q-39 tidak tertulis. | Tambahkan butir S: setiap angka hotspot menyebut nama definisi dan daftar satelit aktif. | P |
| P-44 Pergantian alat ukur | SEBAGIAN | Series break pada 1 November 2026 sudah ada. Rekomendasi P-44 juga meminta sensor aktif per hari disimpan dan deret sambung diterbitkan; keduanya tidak ada di kerangka. | Tambahkan dua kalimat di 6.6 butir 4. | P |
| P-55 Pemekaran wilayah | SEBAGIAN | Kode wilayah CK diambil pada tanggal dampak pertama (A-23), tetapi operator tidak dapat menerapkannya tanpa tabel konkordansi pemekaran, dan pemeliharanya (Q-37) belum ditetapkan. | Keterbatasan sampai tabel konkordansi ada; tunjuk pemeliharanya. | K |
| P-61 Hari tanpa laporan | SEBAGIAN | Aturan 6.5 butir 4 membedakan nilai, nihil, dan belum didata pada tingkat angka; hari buta satelit sudah dikeluarkan dari jeda karhutla. Rekomendasi P-61 (hari kosong logbook adalah tidak diketahui, bukan nol) tidak tertulis. Penyebab hari kosong menunggu Pusdalops (Q-38). | Tulis aturan hari kosong dan pengaruhnya pada jeda L1; keterbatasan sampai Q-38 dijawab. | PK |
| P-45 Siapa berwenang menyatakan satu kejadian | SEBAGIAN | Penerapan aturan tertulis (mesin, otomatis, dengan jejak, dapat dibatalkan) kini dibedakan dari keputusan Pusdatinkom (U-08 selesai). Batas waktu pengesahan dan jalur keberatan BPBD belum tertulis. Wewenang Pusdatinkom bergantung penetapan internal BNPB. | Tambah batas waktu pengesahan dan jalur keberatan; wewenang tetap diakui sebagai keterbatasan. | PK |
Sumber: Tabel B.2 dan `riset/UJI-KONSISTENSI.md`.

Dari 24 paradoks itu, 13 cukup diperbaiki dengan perubahan teks kerangka, 3 hanya dapat diakui sebagai keterbatasan, dan 8 memerlukan keduanya. Perbaikan teks kerangka tidak mengubah arah kerangka; yang diubah adalah penyelarasan angka, definisi, dan butir yang kosong.

## B.5 Keterbatasan yang diakui

Hal berikut tidak dapat diselesaikan oleh kerangka dan dinyatakan sebagai keterbatasan di badan kajian:

1. Jeda gambut dan jeda banjir (Q-09) serta zona musim kekeringan (Q-16) bergantung pada laporan BPBD dan catatan musim yang belum ada.
2. Atribusi kematian tak langsung dan penutupan pencarian korban (Q-24, Q-26) bergantung pada penetapan BPBD dan Pusdatinkom.
3. Tabel konkordansi pemekaran, indeks harga konstan, sumber dan tahun penduduk, dan arti hari kosong logbook (Q-37, Q-32, Q-34, Q-38) bergantung pada pemilik data.
4. Perubahan praktik Pusdalops agar membawa KIB sejak laporan pertama (Q-19) berada di luar penulis kerangka.
5. Semua angka bawaan pada Tabel 6.2, 6.3, dan 6.5 belum ditinjau pemilik; bagian "Sudah diputuskan" di KEPUTUSAN.md masih kosong, dan hanya Bab 7 yang menguji sebagian angka itu pada data DIBI dan logbook.
6. Ambang menonjol Pusdalops untuk jenis selain karhutla belum dibandingkan dengan M1 sampai M4 (P-58).

## B.6 Kasus uji adversarial

Selain 65 paradoks, kerangka diuji dengan 26 kasus baru yang disusun pemeriksa yang tidak ikut menulis kajian (`riset/ADVERSARIAL.md`, A-01 sampai A-26). Kasus ditulis terhadap kerangka versi 1 dan bunyi kriteria lama. Tabel B.5 menilai ulang tiap kasus terhadap kerangka versi 2.1 dengan arti status yang sama seperti Tabel B.1. Tingkat BERAT berarti kasus itu mengubah jumlah atau kelas secara berarti. Kasus berlabel [ILUSTRASI] di berkas asal dirancang untuk menguji aturan, bukan kejadian nyata.

Tabel B.5. Status 26 kasus adversarial terhadap kerangka versi 2.1

| Kode | Nama singkat | Tingkat | Aturan 2.1 yang menjawab | Status | Alasan bila belum terjawab penuh |
| --- | --- | --- | --- | --- | --- |
| A-01 | Rantai jeda banjir berbulan | BERAT | 6.2.2 butir umum 7 (batas durasi 30 hari, lanjutan menjadi KJN baru bertaut) | TERJAWAB | |
| A-02 | Rantai karhutla menyapu satu musim | BERAT | 6.2.2 butir umum 7; Tabel 6.2 (Karhutla) | TERJAWAB | Batas diameter atau kabupaten tidak diambil; durasi 30 hari saja yang memotong |
| A-03 | Jeda 7 hari semu akibat awan dan asap | BERAT | 6.2.2 butir umum 7 (hari tanpa pengamatan layak tidak dihitung) | SEBAGIAN | Kriteria pengamatan "layak" (tutupan awan, kualitas) dan kolom hari tanpa pengamatan belum didefinisikan; operator belum bisa menandai hari buta |
| A-04 | Jembatan palsu dan pembatalan penggabungan | SEDANG | 6.2.2 butir umum 2 | TERJAWAB | |
| A-05 | Dua bahaya independen bersamaan | SEDANG | 6.2.2 butir umum 3 (tanpa rantai sebab terdokumentasi, KJN terpisah) | SEBAGIAN | Pertentangan dalam butir 3 sudah dihapus (dampak terbesar hanya untuk rantai yang pemicunya tidak jelas); orang yang terkena dua KJN terpisah belum ditandai |
| A-06 | Induk-anak lebih dari dua tingkat | BERAT | 6.2.2 butir umum 3 (pohon; hanya akar dihitung; ambang dan kelas pada akar) | TERJAWAB | |
| A-07 | Anak lahir setelah induk selesai | SEDANG | 6.2.2 butir umum 3 (anak ditautkan ke induk selesai dalam jeda jenis induk) | SEBAGIAN | Lahar dingin berbulan setelah erupsi jatuh di luar jeda 14 hari, sehingga menjadi KJN mandiri tanpa tautan sebab; jendela atribusi per jenis induk tidak ditulis |
| A-08 | Induk di bawah ambang, anak lolos | SEDANG | 6.2.2 butir umum 3 (ambang dan kelas dinilai pada angka yang dijumlah ke akar) | TERJAWAB | |
| A-09 | Rumah terendam lolos lewat orang | BERAT | 6.3.1 M2 dan M3; 6.5 butir 3 | TERJAWAB | M2 kini menulis tiga bentuk terdampak terpisah; genangan yang masuk rumah dihitung berapa pun lamanya, sehingga 13 rumah tergenang (sekitar 52 orang) lolos lewat M2 secara sengaja, setara kriteria lama |
| A-10 | Satu orang satu kategori menyembunyikan ambang | BERAT | 6.3.1 M2 (orang unik dijumlah) | TERJAWAB | |
| A-11 | M4 satu fasilitas | BERAT | 6.3.1 M4 (daftar tertutup, rusak berat atau sedang, satuan lembaga atau ruas) | SEBAGIAN | Ambang satu unit tetap lolos oleh kejadian harian seperti angin kencang; "rusak sedang" belum diikat pada fungsi terhenti paling sedikit 7 hari |
| A-12 | M5 butuh verifikasi, verifikasi tidak ada | BERAT | 6.3.2 (tenggang 3 hari, status "tidak terverifikasi, kedaluwarsa", dapat berpindah) | SEBAGIAN | Nasib kejadian terjawab, tetapi pelapor yang tidak mengukur luas tetap membuat kejadian besar tidak masuk, dan sumber ketiga (citra Sentinel-2 pascakebakaran) tidak diambil |
| A-13 | M6 dari SK yang menyebut beberapa kejadian | SEDANG | 6.3.1 M6 (jenis, wilayah, dan tanggal mulai yang cocok) | TERJAWAB | |
| A-14 | KJN memuat CK berjenis berbeda | SEDANG | 6.2.2 butir umum 3 (satu jenis utama dan daftar jenis termuat) | SEBAGIAN | Hubungan jenis termuat dengan simpul anak dan larangan menjumlah antarjenis belum tertulis |
| A-15 | Kelas B dari pengungsian saja | BERAT | 6.4.2 butir 2 (pengungsi sendiri paling tinggi S) | TERJAWAB | Syarat 3 hari tidak diambil; batas evakuasi preventif tetap dari M2 |
| A-16 | Penaik relatif di kabupaten kecil | BERAT | 6.4.2 butir 3 (lantai absolut 100 dan 1.000 orang) | SEBAGIAN | Sumber dan tahun penduduk belum ditetapkan |
| A-17 | Penaik di kabupaten penampung | SEDANG | 6.4.2 butir 2 (pengungsi dihitung di kabupaten asal) | TERJAWAB | |
| A-18 | Gempa beruntun dan batas 30 hari | BERAT | Tabel 6.2 (Gempa bumi: KJN baru bila magnitudo sama atau lebih besar dengan dampak terpisah; batas 90 hari) | TERJAWAB | Selisih magnitudo tertulis "sama atau lebih besar", bukan induk dikurangi ambang |
| A-19 | Erupsi saat Waspada dengan korban | BERAT | Tabel 6.2 (Erupsi: periode dimulai pada erupsi berdampak pertama atau Siaga) | TERJAWAB | |
| A-20 | Status gunung api naik turun | SEDANG | Tabel 6.2 (Erupsi: selesai setelah 14 hari di Waspada atau Normal) | TERJAWAB | |
| A-21 | Kekeringan per musim | BERAT | Tabel 6.2 (Kekeringan: periode kemarau zona musim BMKG) | SEBAGIAN | Unit kini satu zona musim BMKG dengan kabupaten sebagai CK; penerapannya belum diuji karena peta zona musim belum dipasang ke data |
| A-22 | Kabut asap dan karhutla jadi dua KJN | SEDANG | Tabel 6.2 (Kabut asap: anak karhutla) | TERJAWAB | |
| A-23 | Pemekaran di tengah kejadian | SEDANG | 6.2.2 butir umum 8 (kode wilayah CK pada tanggal dampak pertama) | TERJAWAB | Tabel padanan kode dan pemeliharanya masih terbuka (P-55, Q-37) |
| A-24 | Kejadian lintas negara dan korban asing | SEDANG | 6.2.2 butir umum 6 dan 8 (dampak menurut tempat kejadian) | SEBAGIAN | Kewarganegaraan korban terjawab; dampak di luar wilayah dari bahaya yang bersumber di wilayah kita tidak diatur |
| A-25 | Hari kalender dan zona waktu | RINGAN | 6.2.2 butir umum 8 (24 jam sejak dampak pertama dalam zona waktu lokasi) | TERJAWAB | |
| A-26 | RBS butuh rincian yang belum ada | SEDANG | 6.3.1 M3 (rumah rusak belum terpilah berbobot 0,25) | TERJAWAB | |
Sumber: `riset/ADVERSARIAL.md` dan Bab 6 versi 2.1.

Tabel B.6. Rekap status kasus adversarial menurut kelompok dan tingkat

| Kelompok atau tingkat | Jumlah | TERJAWAB | SEBAGIAN | GAGAL |
| --- | ---: | ---: | ---: | ---: |
| 1 Rantai, jeda, dan batas kejadian (A-01 sampai A-08) | 8 | 5 | 3 | 0 |
| 2 Ambang masuk (A-09 sampai A-17) | 9 | 5 | 4 | 0 |
| 3 Jenis bahaya khusus (A-18 sampai A-22) | 5 | 4 | 1 | 0 |
| 4 Waktu, wilayah, dan operasional (A-23 sampai A-26) | 4 | 3 | 1 | 0 |
| Jumlah | 26 | 17 | 9 | 0 |
| Tingkat BERAT | 13 | 8 | 5 | 0 |
| Tingkat SEDANG | 12 | 8 | 4 | 0 |
| Tingkat RINGAN | 1 | 1 | 0 | 0 |
Sumber: Tabel B.5.

Dari 26 kasus, 17 terjawab penuh (65 persen) dan 9 sebagian (35 persen); tidak ada yang gagal. Lima dari sembilan kasus SEBAGIAN berat (A-03, A-11, A-12, A-16, A-21). Penyebabnya tiga macam. Pertama, perbaikan yang diambil lebih kecil daripada usulan penguji (A-07, A-11, A-12): batas diameter dan sumber luas ketiga tidak masuk kerangka. Kedua, kata kunci yang masih tanpa definisi: pengamatan "layak" (A-03), simpul anak lawan jenis termuat (A-14). Ketiga, data yang belum ada atau belum dipasang: peta zona musim BMKG (A-21), sumber dan tahun penduduk (A-16), dampak di luar wilayah (A-24), dan penanda orang yang terkena dua kejadian terpisah (A-05).

Bab 7.4 menyebut sebagian kasus ini sudah diperbaiki di kerangka. Penilaian di sini lebih ketat: sebuah kasus disebut TERJAWAB hanya bila operator dapat menerapkan aturan tanpa tafsir tambahan, sehingga kasus yang perbaikannya hanya sebagian ditandai SEBAGIAN.
