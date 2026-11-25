# Ikhtisar Siklus Bencana

Halaman ini memberi gambaran program Siklus Bencana dan pintu tunggal /siklus bagi pengembang.

## Ringkasan

Siklus Bencana adalah program Centurisk97 yang menyatukan pengurangan risiko, kesiapsiagaan, tanggap darurat, dan pascabencana dalam satu pintu. Program ini lahir pada 10 November 2026 dan terdiri atas tujuh fitur utama.

| Kode | Fitur | Isi |
| --- | --- | --- |
| F1 | Buku Besar Kejadian | satu nomor `KJ-` dan satu halaman untuk tiap kejadian, dari terdeteksi sampai selesai |
| F2 | Peta Paparan per Bangunan | bangunan, fasilitas vital, dan jiwa di tiap zona bahaya |
| F3 | Kaji Cepat Otomatis | perkiraan dampak gempa dan banjir dalam hitungan jam |
| F4 | Jitupasna ke R3P Digital | isian lapangan, nilai kerusakan dan kerugian, draf R3P, pemantauan pelaksanaan |
| F5 | Renkon Hidup dan Gladi | rencana kontinjensi yang dipantau kesegarannya, dan latihan dari kejadian arsip |
| F6 | Risiko Masa Depan | sinyal perubahan iklim terhadap dasar 1995 sampai 2014, pertumbuhan bangunan di zona bahaya |
| F7 | Pintu Tunggal | satu pintu per fase dan per peran di atas semua layar di atas |

![Alur data Siklus Bencana: sumber kejadian dipasang menjadi satu nomor KJ, lalu dipakai paparan, kaji cepat, Jitupasna, Lifeline, dan 3W.](gambar/siklus-alur-data.svg)

Sesudah tujuh fitur itu, paket lain ditempelkan pada halaman kejadian yang sama.

- Status Lifeline: status delapan layanan dasar per kabupaten/kota untuk satu kejadian (paket `lifeline`).
- 3W dan tawaran bantuan: siapa mengerjakan apa di mana, serta tawaran dari organisasi luar (paket `tiga-w`).
- Kaji ulang pasca-kejadian: pelajaran dan rekomendasi per kejadian (paket `kaji-ulang`). Baru tersedia sebagai rute API, belum ada layar.
- Keterpaduan: nomor kejadian yang sama dipakai modul lain, antrean luring bersama, titik pengungsian, dan satu orang satu catatan (paket `keterpaduan`).
- Perkiraan kerusakan bangunan dari satelit (paket `kerusakan-satelit`): masih tahap uji, belum menghasilkan angka di layar.
- Rantai Satu Kejadian, Kalender Kewajiban, dan Rapor SPM (paket `rantai`), serta Pembiayaan risiko (paket `pembiayaan-risiko`): baru paket dokumen. Pembiayaan risiko punya migrasi dan uji skema, tetapi belum punya rute atau layar. Rincian ada di bagian Batasan.

Masalah yang dijawab: pimpinan dan petugas selalu bertanya tentang satu kejadian, "sekarang di mana, berapa dampaknya, siapa mengerjakan apa, dan apa yang sudah pulih". Datanya tersebar di DIBI, Logbook Pusdalops, sistem pemantauan Centurisk97, meja kerja, dan LogPal. Siklus Bencana memberi satu nomor kejadian, menampilkan angka antarsumber berdampingan tanpa menjumlahkannya, dan menandai tiap angka dengan label keyakinan.

Pengguna:

- Warga dan umum: hanya ringkasan resmi satu kejadian yang sudah dibuka untuk umum, dan ringkasan risiko masa depan berpil hipotesis.
- BPBD provinsi, kabupaten, dan kota: lewat akun instansi, terbatas pada wilayahnya.
- Staf BNPB dengan peran Pusdalops, Koordalops, dan Pimpinan.
- Organisasi luar (kementerian atau lembaga, NGO, dunia usaha, kampus, PMI): hanya halaman `/bantu` dengan tautan bertoken, tanpa akun.
- Super Admin, yang juga mengelola data contoh (dummy).

Prinsip yang berlaku di seluruh modul:

1. Angka dari sumber berbeda tidak dijumlah atau dirata-rata. Tiap sumber tampil di kolomnya sendiri dengan selisih tertulis.
2. Setiap angka punya label keyakinan: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan`, `hipotesis`, atau `menunggu`.
3. Kosong bukan nol. Data yang tidak ada ditulis "tidak ada", "belum ada laporan", atau "menunggu". Angka 0 hanya dipakai bila sumber memang melaporkan 0.
4. Titik panas, firespot, luas, belum padam, dan terdampak karhutla hanya dari sistem Centurisk97, bukan dari Koordalops.
5. Tidak ada NIK, tidak ada registri pengungsi per orang. Perkiraan hanya berupa jumlah jiwa.

## Panduan pengguna

Semua halaman staf berada di bawah `/siklus` pada centurisk97.id. Tanpa sesi, halaman staf mengalihkan ke `/admin/masuk`. Satu-satunya halaman yang terbuka untuk umum adalah `/siklus/kejadian/<nomor KJ>` yang sudah dipublikasikan. Peran yang disebut di bawah memakai sebutan sistem: Pusdalops (PD), Koordalops (KO), Pimpinan (PM), akun BPBD (BP), dan Super Admin (SA). "Staf" berarti Super Admin, moderator, atau sesi staf dengan salah satu peran Pusdalops, Koordalops, dan Pimpinan.

## Pintu tunggal, `/siklus`

Siapa: halaman `/siklus` hanya untuk sesi berhak, yaitu staf dan akun BPBD (BPBD provinsi, kabupaten, dan kota) yang melihat kartu sesuai perannya. Tamu yang membuka halaman ini dialihkan ke `/admin/masuk`. Kartu publik (paling banyak 5 kejadian yang sudah dipublikasikan) hanya tersedia sebagai jawaban API opsional `GET /api/siklus/pintu` untuk tamu, bukan sebagai halaman (`src/siklus.js:109-116`, `src/siklus_pintu.js:61-63`).

Langkah pakai:

1. Buka `/siklus`. Judul kartu menghitung kejadian aktif, kejadian yang sedang tanggap, dan kejadian yang menunggu PDNA.
2. Pilih salah satu dari empat fase pada segmen: Sebelum, Siaga, Tanggap, Pulih. Fase awal otomatis Tanggap bila ada kejadian aktif atau pengingat PDNA, selain itu Sebelum.
3. Klik kartu tujuan untuk membuka layar yang bersangkutan. Kartu ke layar yang belum hidup tidak ditampilkan.
4. Kartu "Kejadian aktif" menampilkan paling banyak 8 kejadian dalam 90 hari terakhir. Tombol Profil membuka profil wilayah bila modul profil termuat.
5. Kartu "Pengingat" menampilkan batas PDNA dan renkon yang mendekati batas atau sudah lewat.

Arti isian layar:

- Fase Sebelum memuat paparan dan masa depan. Siaga memuat renkon dan gladi. Tanggap memuat kejadian dan kaji cepat. Pulih memuat Jitupasna dan R3P.
- Kartu diurutkan menurut kelas, lalu urgensi, lalu nama. Kelas 1 kejadian tanggap atau transisi, kelas 2 tenggat berjalan (sisa 90 hari, PDNA, renkon segera habis atau kedaluwarsa, rehabilitasi macet), kelas 3 pemulihan berjalan, kelas 4 kesiapsiagaan, kelas 5 pengurangan risiko. Urutan kelas adalah asumsi kebijakan, bukan peraturan.
- Pil pada kartu menunjukkan label keyakinan kartu itu.

Yang sering disalahpahami: halaman ini tidak muncul di menu utama publik. Satu kartu Siklus disediakan di pintu `/bnpb`. Peran yang dibaca dari sesi tampil di pojok judul kartu.
