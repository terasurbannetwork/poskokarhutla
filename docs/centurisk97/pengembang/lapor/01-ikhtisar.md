# Ikhtisar Lapor Bencana

Modul Lapor Bencana (/lapor) adalah pintu tunggal pelaporan kejadian bencana lewat obrolan web dan WhatsApp, dengan meja monitoring untuk staf dan BPBD.

## Ringkasan

Lapor Bencana adalah pintu tunggal bagi warga dan petugas daerah untuk melaporkan kejadian bencana ke BNPB di situs Centurisk97. Alamatnya `/lapor`. Pelapor bercerita dengan bahasa sehari-hari lewat obrolan di web atau WhatsApp, lalu sistem menuntun isian laporan awal sampai lengkap, meminta lokasi dan foto bertanda lokasi serta waktu, dan menerbitkan nomor laporan berbentuk `LA-DDMMYY-NN`, tiket status, serta dokumen PDF dan Word. Staf BNPB dan akun BPBD membaca, memeriksa, dan menindaklanjuti laporan itu di meja monitoring `/lapor/meja`.

Masalah yang dijawab:

1. Laporan awal kejadian sering datang sebagai cerita bebas yang tidak lengkap dan harus ditanyakan ulang. Modul ini menanyakan isian standar satu per satu dan menolak angka yang tidak punya kutipan dari ucapan pelapor.
2. Sinyal sering putus di tempat yang paling perlu melapor. Tersedia mode lapor tanpa sinyal yang menyimpan laporan di HP lalu mengirimkannya otomatis.
3. Warga tidak selalu membuka layar prakiraan. Tersedia aplikasi terpasang (PWA) dan peringatan dini per kecamatan lewat notifikasi peramban.
4. Sesudah laporan awal, BPBD perlu mendata dampak per rumah, prasarana, pengungsi, dan korban. Tersedia tahap data lanjutan dengan rekap otomatis.

Pengguna:

| Pengguna | Yang dilakukan |
| --- | --- |
| Warga | Melapor, menambah kabar, melacak laporan, membaca info daerah, berlangganan peringatan dini |
| Petugas BPBD | Melapor dengan peran Petugas BPBD, mengisi data lanjutan, memeriksa laporan di wilayahnya lewat meja |
| Staf BNPB (admin, Pusdalops, Koordalops) | Membaca semua laporan, mengubah status tiket, meneruskan ke BPBD, memeriksa, menerima data lanjutan |
| Akun instansi pemda (pemkab, pemkot, pemprov) | Membuka meja terbatas pada wilayahnya lewat sesi profil PIC |
| Akun kampus mitra | Mengunduh data agregat tanpa data pribadi |
| Pimpinan | Membaca rekap lewat staf; tidak ada layar khusus pimpinan di modul ini |

Status pembangunan perlu dibaca bersama bagian "Batasan dan pertanyaan terbuka". Paket dokumen merencanakan jauh lebih banyak fitur (Mode Tanya, kabar balik, ringkasan harian, penugasan, penilaian foto, kabar selamat, halaman publik kejadian hari ini) daripada yang sudah ada di kode. Dokumen ini menulis apa yang ada di kode sebagai fakta dan menandai sisanya sebagai rencana. Seluruh data laporan warga berstatus belum terverifikasi sampai diperiksa BPBD wilayahnya.

![Alur laporan dari pelapor lewat mesin percakapan sampai meja laporan dan data lanjutan BPBD](gambar/lapor-alur.svg)

## Beranda /lapor

- Alamat: `/lapor/` di centurisk97.id. Publik; tanpa akun.
- Menu di bawah atau samping layar: Beranda, Laporan, Alun-alun, Cara melapor, dan Kebijakan privasi (`public/lapor/index.html:368-372`). Layar Bantuan (daftar semua bantuan dan edukasi) dibuka dari kartu Edukasi dan tombol Semua bantuan, bukan dari menu (`public/lapor/lapor.js:58-59`).
- Kartu di Beranda: Lapor darurat, Darurat sekali ketuk, Lapor kejadian, Info dan prediksi daerah, Edukasi siaga bencana, Nomor penting. Pita bawah memuat nomor 112 (darurat terpadu) dan 117 (call center BNPB).
- Di pojok ada pemilih bahasa dan tombol tema terang atau gelap. Tersedia 24 pilihan bahasa (Indonesia, Inggris, dan bahasa daerah). Bahasa daerah diterjemahkan dari kamus statis `public/lapor/tr/<kode>.json`; butir yang tidak ada di kamus diterjemahkan model dan disimpan di cache. Angka pada terjemahan dijaga: terjemahan yang mengubah angka ditolak dan teks Indonesia yang dipakai.
- Tautan khusus: `/lapor/?aksi=darurat`, `?aksi=lapor`, `?aksi=status`, `?aksi=tur`, `?dari=pwa`, dan `?d=<kode desa 10 angka>` dari poster desa.

## Lapor kejadian (obrolan)

Siapa yang boleh: siapa pun yang mengetik nomor WhatsApp di web (nomor ketikan diikat ke perangkat, tanpa kode verifikasi, dan tidak memakai daftar izin), atau pengguna yang sudah masuk lewat `/masuk`, atau nomor yang menulis ke bot WhatsApp. Sesi `/masuk` dan bot WhatsApp hanya untuk nomor yang ada di daftar izin selama masa uji; nomor di luar daftar ditolak dengan galat 403 "belum diizinkan" (`src/lapor_ai.js:88-91`).

Langkah:

1. Buka `/lapor/`, ketuk Lapor kejadian. Pada pemakaian pertama pelapor diminta menyetujui pemakaian data, lalu mengisi identitas: peran (Warga atau Petugas BPBD), nama, dan untuk BPBD kab/kota serta jabatan. Identitas diingat per nomor; pemakaian berikutnya hanya meminta konfirmasi "Melapor sebagai ...".
2. Bagikan lokasi. Lokasi wajib dan diminta paling awal. Pilihan: GPS perangkat, lokasi yang dibagikan lewat WhatsApp, atau mengetik nama desa lalu memilih dari daftar. Koordinat di luar Indonesia ditolak.
3. Konfirmasi wilayah yang terbaca (desa, kecamatan, kabupaten/kota, provinsi). Bila ada lebih dari satu desa terdekat, pilih desa yang benar.
4. Ceritakan kejadian dengan kalimat sendiri atau pakai templat "Kejadian:" dan "Kronologi:". Pilih jenis dan subjenis dari tombol (sepuluh jenis: banjir, tanah longsor, gelombang pasang dan abrasi, cuaca ekstrem, kekeringan, kebakaran hutan dan lahan, gempa bumi, tsunami, erupsi gunung api, kebakaran gedung dan permukiman).
5. Jawab pertanyaan berikutnya satu per satu: waktu kejadian, korban, warga terdampak, pengungsian, kerusakan rumah, fasilitas dan jalan, kelompok rentan, layanan dasar, data khusus per jenis, dan kebutuhan. Jawaban "belum tahu" dan "tidak ada" dibedakan.
6. Kirim foto atau video kejadian (lihat bagian foto di bawah).
7. Periksa ringkasan, perbaiki dengan kalimat biasa bila perlu, lalu ketik atau ketuk Kirim.
8. Terima nomor laporan `LA-DDMMYY-NN`, tautan lacak, dan unduhan PDF serta Word.

Perintah teks yang dikenali kode tanpa AI: `batal`, `ulang`, `kirim`, `belum tahu`, `tidak ada`, `lapor`, `darurat`, nomor pilihan menu.

Arti label penting:

- Peran "Petugas BPBD": hanya peran `bpbd` (nomor dikonfirmasi admin di daftar izin) yang diperlakukan sebagai sumber BPBD dan membuka tahap data lanjutan. Pelapor yang hanya memilih "Petugas BPBD" tercatat sebagai klaim (`bpbd_klaim`), dan nomor ketikan tidak pernah dinaikkan.
- Persen "Lengkap": bagian isian berlaku yang sudah terjawab. Angka 0 yang terjawab dan jawaban "tidak ada" menghitung sebagai terjawab; isian kosong tidak.
- Kosong bukan nol: isian yang belum diketahui tampil "belum didata" dan tidak pernah ditulis 0.

Batas pemakaian: 20 pesan per menit, 60 per jam, 120 per hari per nomor; paling banyak 5 laporan terkirim per hari per nomor; satu perangkat paling banyak 5 nomor. Lewat batas dibalas sopan dan laporan yang sedang diisi tetap tersimpan.

Hal yang sering disalahpahami:

- Laporan warga tidak otomatis menjadi kejadian resmi dan tidak tampil di halaman publik. Kejadian resmi hanya dibuat staf lewat Buku Besar Kejadian.
- Bot tidak memberi saran keselamatan buatan sistem. Bila pelapor menyebut keadaan darurat jiwa, bot menampilkan nomor 112 dan BPBD setempat dari templat tetap.
