# Kode masuk dan ruang yang boleh dibuka

Halaman ini menjelaskan cara kode masuk sekali pakai dihitung, bagaimana ruang yang boleh dimasuki ditentukan, dan kapan seseorang aktif otomatis sebagai anggota lembaga.


Bagian ini tidak memuat model prediksi, jadi tidak ada uji balik. Yang ada adalah aturan dan hitungan sederhana. Sebagian ambang masih berstatus hipotesis, dan itu dicatat di tiap metode.

## Kode masuk sekali pakai

Data yang dipakai: hanya nomor WhatsApp yang Anda ketik. Tidak ada sumber data luar.

Langkah:

1. Sistem memeriksa pemeriksaan "bukan robot" dan batas permintaan dari alamat jaringan Anda (jaringan WiFi atau paket data yang Anda pakai).
2. Sistem memeriksa jeda 60 detik sejak kode terakhir untuk nomor itu, lalu batas per nomor, lalu batas untuk seluruh sistem.
3. Sistem membuat kode enam angka secara acak. Yang disimpan hanyalah bentuk sandi acak dari nomor dan kode yang tidak bisa dikembalikan menjadi kode asli.
4. Pesan dikirim lewat WhatsApp. Jawaban di layar selalu sama untuk nomor yang terdaftar maupun tidak.
5. Saat Anda mengetik kode, setiap tebakan dihitung dulu sebagai satu percobaan, baru dicek benar atau salah. Kode yang cocok langsung dipakai dan hangus. Kode aktif lain untuk nomor itu juga ikut hangus.
6. Meminta kode baru tidak menghanguskan kode lama. Ini mencegah orang lain mematikan kode yang baru Anda terima.

Batas yang berlaku:

| Besaran | Nilai |
| --- | --- |
| Panjang kode | 6 angka |
| Umur kode | 5 menit |
| Percobaan per kode | 5 kali; percobaan keenam menghanguskan kode |
| Jeda minta ulang per nomor | 60 detik |
| Batas minta per nomor | 3 kali per 15 menit, 8 kali per hari |
| Batas minta per alamat jaringan | 30 kali per jam |
| Batas periksa per alamat jaringan | 60 kali per jam |
| Batas seluruh sistem | 300 per jam, 2.000 per hari |
| Sesi akun umum | 30 hari |
| Syarat atur sandi atau hapus akun | harus baru masuk dengan kode dalam 15 menit terakhir |

Contoh: Anda meminta kode pukul 10.00. Anda salah ketik 5 kali, lalu kode hangus pada percobaan keenam walaupun belum 5 menit. Anda harus menunggu jeda 60 detik sejak permintaan terakhir untuk meminta kode baru.

Seberapa bisa dipercaya: ini mekanisme pengamanan, bukan perkiraan, jadi tidak ada uji balik. Pembatasnya: pengiriman kode memakai satu jalur WhatsApp yang bisa terganggu sewaktu-waktu. Bila nomor pengirim diblokir, kode masuk dan laporan harian ikut berhenti. Cadangannya adalah kode lewat email dan masuk dengan sandi. Kode dapat terlambat 20 detik atau lebih karena ikut antrean pengiriman yang sama dengan pesan lain.

## Menentukan ruang yang boleh dimasuki

Data yang dipakai: nomor yang baru Anda buktikan dengan kode, dicocokkan ke akun yang terikat langsung pada nomor itu.

Langkah:

1. Sistem mencari akun yang nomornya sama dan berstatus aktif, di tiap jenis akun: lembaga selain BPBD, keanggotaan lembaga, pendataan, kampus, staf, pemirsa, serta relawan atau pegawai.
2. Akun contoh tidak pernah dicocokkan. Akun rahasia tidak punya nomor dan tidak pernah dicari.
3. Akun lembaga dan keanggotaan lembaga langsung diberi sesi. Akun staf hanya diberi sesi setelah sandi benar.
4. Untuk relawan atau pegawai, nomor dicocokkan dalam dua bentuk (diawali 62 dan 0). Bila ada lebih dari satu baris untuk satu nomor, tidak ada yang dibuka, supaya tidak salah orang.
5. Akun BPBD dikecualikan dari semua langkah di atas.

## Aktif otomatis sebagai anggota lembaga

Berlaku hanya untuk akun lembaga yang sudah aktif. Aktivasi pertama sebuah akun lembaga tetap lewat verifikasi surat tugas dan kartu pegawai. Permohonan bergabung langsung aktif tanpa peninjau bila salah satu syarat berikut terpenuhi, diperiksa berurutan:

1. Undangan: ada undangan terkirim untuk nomor itu, belum 14 hari, menunjuk akun yang sama, dan pengundangnya masih berhak.
2. Kontak: nomor itu tercatat sebagai kontak pemangku aktif dengan kategori, provinsi, dan kabupaten yang cocok dengan akun.
3. Email dinas terpetakan: Anda menerima kode lewat email yang domainnya sudah dipetakan admin ke lembaga itu. Domain umum seperti go.id atau ac.id, dan surel gratis, tidak pernah dipetakan.

Kategori kontak dipetakan ke jenis akun: pemerintah provinsi, kabupaten, dan kota ke BPBD, kepala daerah, dan pemda; Polda dan Polres ke Polri; Kodam dan Kodim ke TNI. Kontak berkategori BNPB tidak mengaktifkan siapa pun, hanya menjadi tanda "cocok kontak" bagi peninjau. Akun pendataan tidak pernah aktif otomatis. Anggota yang 180 hari tidak masuk diperiksa ulang; bila bukti tidak lagi cocok, statusnya kembali menunggu. Bila tidak ada syarat yang cocok, permohonan masuk antrean tinjau.

Contoh: nomor Anda tercatat sebagai kontak pemangku pemerintah kabupaten X, lalu Anda mengajukan diri ke akun lembaga kabupaten X. Kategori dan wilayahnya cocok, jadi Anda langsung aktif.
