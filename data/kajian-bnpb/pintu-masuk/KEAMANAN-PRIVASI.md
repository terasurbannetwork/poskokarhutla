# KEAMANAN-PRIVASI: Satu Pintu Masuk

Pintu masuk adalah permukaan serangan paling berharga di situs. Dokumen ini menulis ancaman, penangkalnya, dan sisa risiko yang diterima. Paket ini sudah diperiksa dua pemeriksa bersih pada 15 Nov 2026; temuan mereka sudah masuk di sini.

## 1. Matriks hak

| Tindakan | Tamu | Akun umum | Anggota aktif | Pemilik nomor akun | Staf | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Minta dan periksa kode | ya | ya | ya | ya | ya | ya |
| Melengkapi dan menghapus profil sendiri | tidak | ya | ya | ya | ya | ya |
| Memohon jadi anggota | tidak | ya | ya | ya | ya | ya |
| Mengundang ke akunnya | tidak | tidak | ya | ya | ya, dalam wilayah haknya | ya |
| Menyetujui atau menolak anggota yang menunggu | tidak | tidak | tidak | ya | ya, tiga peran, dalam wilayahnya | ya |
| Mencabut anggota | tidak | tidak | tidak | ya | tidak | ya |
| Mengatur sandi akun instansi | tidak | tidak | tidak | ya | tidak | ya |
| Melihat papan aktivasi | tidak | tidak | tidak | tidak | ya | ya |
| Memetakan domain email | tidak | tidak | tidak | tidak | tidak | ya |
| Memblokir akun umum | tidak | tidak | tidak | tidak | tidak | ya |
| Masuk sebagai staf tanpa sandi | tidak pernah | | | | | |
| Masuk akun rahasia lewat kode | tidak pernah | | | | | |

## 2. Ancaman dan penangkal

| Ancaman | Penangkal | Sisa risiko |
| --- | --- | --- |
| Menebak kode enam angka | lima percobaan per kode, lima menit, paling banyak tiga kode aktif per nomor, batas per IP | peluang kecil per kode; diterima |
| Membanjiri nomor orang dengan kode | tiga per 15 menit dan delapan per hari per nomor, Turnstile | orang masih bisa menerima delapan pesan sehari dari pihak iseng, dan bisa dikunci dari masuk lewat kode hari itu; pintu sandi tetap ada |
| Pihak lain mematikan kode korban atau menguncinya | kode lama tidak hangus saat ada permintaan baru (D18), jadi kode yang sudah diterima korban tetap bisa dipakai | pihak lain masih bisa menghabiskan jatah tiga kode per 15 menit nomor korban; korban memakai kode yang sudah diterima, email, atau sandi |
| Membuat nomor gerbang diblokir WhatsApp | batas global 300 per jam dan 2.000 per hari, Turnstile wajib, pesan undangan bertemplat tetap | pustaka tidak resmi tetap bisa diblokir kapan saja; cadangan email dan pintu sandi |
| Penolakan layanan lewat batas global | batas per IP dan per nomor di depan batas global | serangan tersebar bisa menghabiskan 300 kode per jam; orang lain memakai sandi atau email |
| Mencacah nomor yang terdaftar | jawaban minta kode sama untuk semua nomor; tawaran email diberikan ke semua orang dan emailnya diketik; pesan galat periksa sama | pemilih ruang baru tampil sesudah kode sah |
| Ganti kartu atau nomor daur ulang operator | staf wajib sandi; akun rahasia di luar pintu ini; relawan dan petugas lewat sesi hanya hak terbatas; bukti ulang 180 hari | pemegang baru nomor lama bisa masuk ke akun instansi pemilik lama sebagai anggota biasa sampai dicabut |
| Mac mini gerbang disusupi (kode terbaca) | kode berumur lima menit; staf wajib sandi; baris kode dihapus saat terkirim | penyerang di gerbang bisa masuk sebagai akun non-staf selama menguasainya; pemantauan denyut dan log gerbang |
| Basis data bocor | kode sebagai HMAC berahasia, sesi sebagai sha256 | nomor WA terang ada di `mk_akun` dan tabel akun lama |
| Kode terbaca di antrean | baris `otp` dihapus saat terkirim atau saat kode dipakai; yang tidak terkirim tidak ditarik lagi sesudah 5 menit dan dihapus pembersihan sejam sekali | isi pesan yang tidak pernah terkirim tinggal sampai sekitar satu jam; kodenya sudah hangus |
| Nomor pemirsa diambil alih | pemirsa hanya membaca tab yang ditentukan; nomor diisi Super Admin; Super Admin bisa memutus akun | pemegang nomor bisa membaca tab pemirsa itu sampai diputus (K12, D17) |
| Mengaku lembaga lain lewat email dinas | hanya domain yang dipetakan admin ke satu akun; akhiran dicocokkan berbatas titik; akhiran umum ditolak | mutu bergantung pada ketelitian admin memetakan domain |
| Akun pendataan dibajak lewat nomor orang lain | pintu ini tidak pernah mengubah status akun pendataan (D19); bukti nomor hanya tanda di antrean tinjau | Super Admin yang menyetujui akun bernomor salah tetap membuka akun itu ke pemegang sandinya; tanda "nomor terbukti" membantu menilainya |
| Anggota dicabut masih memegang sesi instansi | sesi instansi tidak mencatat orang; pemilik akun ditawari "Putuskan semua sesi" yang menghapus seluruh sesi akun itu | tanpa memutus semua sesi, cookie lama anggota itu berlaku sampai 30 hari |
| Undangan dipakai menaikkan hak | undangan hanya ke akun pengundang sendiri, tidak pernah ke staf, tidak membuat akun lembaga, batas 20 per hari | anggota nakal bisa memasukkan orang luar ke lembaganya; jejak "diundang oleh", daftar anggota, dan pencabutan oleh pemilik akun |
| Undangan dipakai mengirim pesan liar | templat tetap; nama lembaga dari basis data; ketikan pengundang tidak masuk pesan | - |
| Kontak pemangku palsu memicu aktif otomatis | hanya kontak `status = 'aktif'` (dibuat atau disetujui admin); pendaftaran kontak sendiri berstatus menunggu; nomor ajudan tidak mengaktifkan | mutu bergantung pada pemeriksaan kontak oleh admin |
| Nomor di form pendaftaran lama tidak pernah dibuktikan | pendaftar tidak mendapat hak apa pun dari nomor yang diketiknya, karena kode hanya sampai ke pemegang nomor; akun menunggu tidak bisa dimasuki; pendaftaran lewat pintu ini memakai nomor yang sudah terbukti; layar persetujuan menandai nomor yang belum dibuktikan (PM-09) | bila admin menyetujui akun bernomor salah, pemegang nomor itu bisa masuk ke akun tersebut. Per 15 Nov 2026 produksi berisi 0 akun instansi, pendataan, dan kampus |
| Mengambil alih akun lewat nomor yang diketik sendiri | hanya akun dan anggota berstatus aktif yang dicocokkan; nomor akun instansi masuk lewat verifikasi yang disetujui admin | admin yang menyetujui nomor salah membuka akun itu ke pemegang nomor |
| Membuka data wajah dan kesehatan relawan lewat satu faktor | sesi bernomor sama tidak membuka wajah, absen, golongan darah, kontak darurat; butuh tautan kode pribadi | profil ringkas, penugasan, dan teks logbook terbuka lewat nomor; unggah foto tetap butuh tautan kode |
| Pengalihan terbuka lewat `?ke=` | `tujuan()` yang ada (`src/statistik.js:251`) | - |
| Pemalsuan permintaan lintas situs, termasuk login ke akun penyerang | semua `POST /api/masuk/*` wajib header `x-pb: 1` dan `Origin` sama situs; `sesi_masuk` masuk regex `tolakOrigin` (`src/worker.js:659-662`) | - |
| Turnstile lolos saat konfigurasi kosong | rute minta kode menolak bila `TURNSTILE_SECRET` atau `TURNSTILE_SITEKEY` kosong | - |
| Sesi dicuri atau tertinggal di perangkat bersama | `HttpOnly`, `Secure`, token acak 32 byte, sesi akun umum 30 hari, keluar mencabut di server dan menghapus cookie instansi di kedua Path | orang yang lupa keluar di perangkat bersama tetap terbuka sampai 30 hari |
| Dua permintaan periksa serentak | `UPDATE ... WHERE dipakai IS NULL` satu baris | - |
| Kuota baca atau tulis D1 dihabiskan | batas laju dicek sebelum kueri lain; pencarian berindeks; denyut gerbang paling banyak 1.440 tulis per hari | serangan tersebar tetap membebani; Turnstile |

## 3. Data pribadi

| Data | Disimpan di | Guna | Disimpan sampai |
| --- | --- | --- | --- |
| Nomor WA | `mk_akun.wa`, `mk_undang.wa` | identitas masuk, undangan | akun dihapus; undangan 90 hari sesudah kedaluwarsa |
| Nama, provinsi, kabupaten | `mk_akun` | label kiriman | akun dihapus |
| Kode | hanya HMAC di `mk_kode` | pembuktian | 1 hari |
| Isi pesan kode | `wa_antre.pesan` | pengiriman | dihapus saat terkirim atau dipakai; paling lama sekitar satu jam |
| Riwayat masuk | `mk_masuk_log` | papan aktivasi, penelusuran | 400 hari |
| Alamat IP | tidak disimpan; hanya hash bergaram untuk batas laju | batas laju | 2 hari (pembersihan `laju_bnpb`) |
| Email dinas | tidak disimpan; domain dicatat sebagai rujukan anggota | bukti lembaga | selama keanggotaan |

Dasar pemrosesan: persetujuan saat melengkapi profil (ALUR A4), dengan teks yang menyebut guna nomor (masuk, undangan, pemberitahuan tugas) dan hak menghapus.

Hak orang:

- Melihat data akun umumnya di halaman akun.
- Menghapus akun umum sendiri: `mk_akun`, `mk_sesi`, `mk_anggota`, dan `alun_penulis` miliknya dihapus; kiriman alun-alun tetap tampil tanpa nama. Akun lembaga tidak ikut terhapus.
- Nomor tidak pernah tampil ke publik. Di layar undangan, daftar anggota, dan papan aktivasi nomor tampil tersamar kecuali empat angka terakhir.

## 4. Yang tidak boleh ada di repo dan log

- Nilai `MASUK_KUNCI`, `WA_KUNCI`, `TURNSTILE_SECRET`.
- Kode dalam bentuk terbaca di log Worker, log gerbang, atau galat.
- Nomor WA nyata di berkas uji; uji memakai nomor rekaan berawalan `62800`.
- Repo ini publik: log prompt dan dokumen tidak memuat nomor orang.

## 5. Keterkaitan dengan keputusan lain

- KEPUTUSAN-KETERPADUAN K9: jejak kerja per orang hanya untuk orangnya dan admin. Papan aktivasi menampilkan angka per kabupaten dan nama kontak yang memang sudah dipegang staf; riwayat masuk per orang hanya untuk admin dan pemilik akun.
- KEPUTUSAN-KETERPADUAN K2: tidak ada pembacaan WA masuk.
- Aturan vektor wajah modul lapangan tidak tersentuh; sesi dari pintu ini tidak pernah membuka rute wajah.
- `src/staf.js:2`: staf hanya dibuat Super Admin; paket ini tidak mengubahnya.

## 6. Pemeriksa wajib sebelum tayang

`guard-api` dan `security-reviewer` untuk tiap rute `/api/masuk/*`; `migrasi-idempoten` untuk migrasi; pemeriksa tidak pernah pengerja yang sama (AGENTS 3.2).
