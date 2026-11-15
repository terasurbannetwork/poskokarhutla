# GLOSARIUM: Satu Pintu Masuk

| Istilah | Arti di paket ini |
| --- | --- |
| Pintu masuk | Halaman `/masuk` dan rute `/api/masuk/*`: satu tempat semua peran membuktikan dirinya |
| Kode sekali pakai (OTP) | Enam angka yang dikirim ke WhatsApp atau email, berlaku lima menit, paling banyak lima kali coba, hangus sesudah dipakai |
| Gerbang WA | Program di Mac mini yang menarik antrean `wa_antre` dan mengirim pesan WhatsApp. Hanya mengirim keluar untuk paket ini |
| Denyut gerbang | Waktu terakhir gerbang menarik antrean; lebih dari lima menit berarti saluran WA dianggap terganggu |
| Akun umum | Baris `mk_akun`: identitas siapa pun yang nomornya sudah terbukti, tanpa hak atas data lembaga |
| Akun peran | Akun di tabel lama (`staf`, `instansi_akun`, `pdt_akun`, `km_akun`) yang membawa hak kerja |
| Akun berkode | Relawan, petugas lapangan, dan sejenisnya yang selama ini masuk dengan tautan berkode, bukan cookie |
| Akun rahasia | Pasangan email dan sandi yang disimpan sebagai rahasia Worker (`ADMIN_TOKEN`, `AKUN_SITUS_*`), termasuk Super Admin. Tidak pernah lewat pintu ini |
| Sesi lama | Cookie sesi yang sudah dipakai tiap modul (`sesi_staf`, `sesi_instansi`, `sesi_pendataan`, `sesi_kemitraan`) |
| Sesi akun umum | Cookie `sesi_masuk` yang diterbitkan pintu ini |
| Ruang | Halaman kerja satu peran, misalnya `/instansi`, `/admin/pantau`, `/kemitraan` |
| Pemilih ruang | Layar yang muncul bila satu nomor punya lebih dari satu akun peran |
| Anggota | Baris `mk_anggota`: orang (akun umum) yang boleh masuk ke satu akun lembaga yang sudah aktif |
| Pemilik nomor akun | Orang yang nomornya tercatat di kolom `wa` akun lembaga itu sendiri; boleh mencabut anggota dan mengatur sandi akun |
| Aktif otomatis | Anggota yang langsung aktif tanpa peninjau karena lolos salah satu dari tiga jalur bukti |
| Jalur bukti | Undangan, kontak pemangku aktif, atau email yang domainnya dipetakan admin ke akun itu |
| Peta domain | Tabel `mk_domain`: domain email yang oleh admin dinyatakan milik satu akun lembaga |
| Undangan berantai | Anggota aktif mengundang nomor lain ke akun lembaganya sendiri |
| Aktivasi pertama | Saat sebuah akun instansi pertama kali diaktifkan lewat verifikasi surat tugas dan kartu; tidak diubah paket ini |
| Antrean tinjau | Daftar permohonan yang tidak lolos jalur bukti dan diperiksa manusia seperti sekarang |
| Kontak pemangku | Baris `kontak_pemangku`: kepala daerah, BPBD, TNI, Polri, dan lain-lain yang dicatat staf |
| Papan aktivasi | Tabel 514 kabupaten dan kota yang menunjukkan siapa sudah punya akun, kapan terakhir masuk, dan tombol undang |
| Bukti ulang | Pemeriksaan ulang jalur bukti untuk anggota yang 180 hari tidak masuk |
| Denyut gerbang, tabel | Satu baris `mk_denyut` yang diperbarui paling sering semenit sekali |
| HMAC | Sidik berahasia; kode dan nomor untuk batas laju disimpan dalam bentuk ini supaya tidak bisa ditebak balik dari basis data |
| Batas laju | Jumlah paling banyak permintaan per nomor, per alamat, dan untuk seluruh situs dalam satu rentang waktu |
| Pencacahan akun | Upaya mencari tahu nomor mana yang terdaftar dari perbedaan jawaban; ditangkal dengan jawaban yang sama |
| Turnstile | Pelindung bot Cloudflare yang dipakai sebelum kode dikirim |
| Bawaan sementara | Nilai yang dipakai agent selama pemilik belum menjawab; ditandai di KEPUTUSAN dan bisa diganti kapan saja |
