# Layar luring, aplikasi, meja, lanjutan

Halaman ini mendokumentasikan layar lapor tanpa sinyal, pemasangan aplikasi, Meja Laporan, dan data lanjutan BPBD tahap 2.

## Lapor tanpa sinyal

- Siapa: perangkat yang sudah pernah melapor sekali saat ada sinyal (nomor tersimpan di perangkat).
- Cara kerja: ketika perangkat tidak punya sinyal dan pengguna mengetuk Lapor darurat atau Lapor kejadian, terbuka formulir "Lapor tanpa sinyal": pilih jenis kejadian, ambil lokasi GPS, pilih ada korban atau tidak, lalu Simpan laporan. Laporan disimpan di HP dan terkirim otomatis begitu ada sinyal dengan halaman terbuka.
- Pita di Beranda menunjukkan jumlah laporan yang menunggu (hanya jenis dan waktu, tanpa lokasi dan nomor). Tombol Kirim sekarang dan Hapus dari HP tersedia.
- Perangkat yang belum pernah melapor melihat nomor 112 dan 117 serta ajakan menyiapkan fitur ini saat ada sinyal.
- Foto belum ikut di jalur luring; foto dan kabar tambahan dikirim lewat Tambah kabar sesudah terkirim.
- Butir yang ditolak server atau perlu identitas tetap di HP dan ditandai agar pengguna membuka obrolan.

## Pasang aplikasi dan peringatan dini

- Alamat: kartu "Peringatan dini untuk kecamatan Anda" di Beranda `/lapor/`.
- Pasang: Android atau Chrome lewat tombol Pasang; iPhone lewat Bagikan lalu Tambah ke Layar Utama (notifikasi push iPhone hanya jalan dari aplikasi yang sudah ditambahkan ke Layar Utama).
- Berlangganan tanpa akun dan tanpa nomor: pilih 1 sampai 3 kecamatan lewat pencarian, centang jenis ancaman (Banjir, Tanah longsor, Asap, Angin kencang), dan pilih ambang (Waspada semua kenaikan, Siaga ke atas, atau Awas saja).
- Notifikasi dikirim saat prakiraan kab/kota kecamatan itu naik tingkat. Teks memuat jenis, tingkat, hari, kecamatan berlangganan, dan kalimat bahwa isinya prakiraan, bukan peringatan resmi. Jenis yang belum teruji diberi tulisan "(belum teruji)".
- Mengetuk notifikasi membuka `/lapor/?dari=peringatan` dengan arahan: tingkat 3 hari dan tiga titik berkumpul terdekat (jarak garis lurus, dari data OpenStreetMap, bukan rute dan belum tentu titik evakuasi resmi).
- Berhenti: tombol Matikan di kartu, atau pengaturan notifikasi peramban. Langganan yang ditolak layanan push (kode 404 atau 410) dihapus otomatis.

## Meja Laporan /lapor/meja

- Alamat: `/lapor/meja.html`. Tidak ada tampilan tanpa masuk. Hak:
  - Admin atau staf Pusdalops atau Koordalops: semua laporan dan semua aksi.
  - Akun instansi pemda (pemkab, pemkot, pemprov) lewat sesi profil PIC (username, sandi, pilih profil, PIN): hanya laporan di wilayahnya (kab untuk akun kab, seluruh provinsi untuk akun provinsi). Aksi terbatas pada lihat, balas, status, bukti, bukti-publik, periksa, tindakan, dan ambil. BPBD tidak bisa meneruskan tiket dan tidak bisa membuka kembali tiket Selesai atau Tidak valid.
  - PIN wajib diganti dulu bila profil menandainya; selama itu meja menolak.
- Menu samping: Peta laporan, Daftar laporan, antrean kerja per status (Semua laporan, Baru belum dibuka, Dilihat, Ditelaah, Diteruskan, Ditindaklanjuti, Selesai, Tidak valid), tautan Form lapor warga dan Poster QR desa, tombol tema, dan label waktu data yang bisa diketuk untuk memuat ulang.
- Baris saring tunggal: cari (tiket, pelapor, nomor WA), pil jenis (bergulir dengan panah geser bila pil tidak muat), periode (24 jam, 7 hari, 30 hari, Semua waktu), saring cepat (Ada korban, Ada foto, Bergugus), dan tombol hapus semua saringan. Semua saringan berlaku serentak untuk peta, ringkasan, dan tabel.
- Peta: titik laporan berwarna menurut status tiket, kotak angka di kepala sebagai saring status, ringkasan di kiri, legenda, dan panel Kab/kota terbanyak. Bila peta tidak bisa dimuat (tanpa WebGL), daftar tetap tersedia.
- Daftar: dikelompokkan per provinsi (bisa dilipat) dan per gugus. Kolom: Waktu lapor, Tiket, Jenis, Lokasi, Korban, Kerusakan, Lengkap, Foto, Status, Aksi; tiap kepala kolom bisa mengurutkan.
- Rincian laporan (dialog): identitas pelapor (nomor WA tampil di sini saja), kronologi, isian per kelompok, foto dan video berlencana, transkrip, log aktivitas, PIC BPBD setempat. Aksi: Balas, ubah Status, Foto penanganan (dan tanda boleh publik), Teruskan ke BPBD (hanya BNPB), Lepas dari kejadian (hanya BNPB), Periksa di lapangan, catat Tindakan, dan Ambil (profil BPBD).
- Pita Darurat: panel di atas peta berbunyi dan menawarkan notifikasi peramban saat laporan darurat baru masuk, untuk BNPB dan BPBD wilayahnya.
- Penanda: Darurat, Sekali ketuk, Belum dikenal, Tertunda (laporan darurat dari jalur tertunda), pil "diterjemahkan AI" untuk teks pelapor berbahasa daerah.
- Hal yang sering disalahpahami: ringkasan menghitung laporan, bukan korban. Angka dampak antarlaporan tidak dijumlah karena warga bisa melapor ganda untuk satu kejadian.

Pengecekan lapangan (aksi Periksa): petugas BPBD wilayah atau staf memilih hasil Valid, Sebagian benar, atau Tidak valid, menulis catatan paling sedikit 5 huruf, dan untuk Sebagian benar boleh merevisi angka tertentu (meninggal, hilang, luka, mengungsi, rumah rusak berat, sedang, ringan, terendam, fasilitas sekolah, kesehatan, ibadah, jalan atau jembatan). Revisi tidak menimpa isian pelapor; ia menjadi versi baru berasal "petugas" dengan kutipan catatan. Pengecekan Valid oleh BPBD wilayah menentukan status terverifikasi (lihat Metode). Efek ke tiket: hasil Tidak valid memindahkan tiket ke Tidak valid bila peralihan itu sah dari status saat ini; hasil lain tidak mengubah status tiket (hanya menambah baris riwayat). Tiket yang sudah Selesai atau Tidak valid tidak dapat diperiksa lagi (galat 409) (`src/lapor_ai.js:895-897`, `src/lapor_periksa.js:71`).

Aksi Tindakan hanya diterima saat tiket Ditindaklanjuti (galat 409 bila tidak). Kode tindakan harus berasal dari katalog tindakan registri jenis bencana (`public/bencana.json`), ditambah teks "lain" bebas (`sahkanTindakan`, `src/lapor_periksa.js:26`; `src/lapor_ai.js:926-928`).

## Data lanjutan BPBD (tahap 2)

- Siapa: ketua berkas (pelapor tahap 1 dengan peran `bpbd` terkonfirmasi), anggota tim yang ditambah ketua, dan staf BNPB Pusdalops untuk membaca dan menerima.
- Pembukaan: begitu laporan awal BPBD terkirim, sistem membuka satu berkas per pasangan (laporan induk, kab). Ketua menerima tautan sekali pakai lewat WhatsApp (halamannya belum ada, lihat di bawah); tautan ditukar dengan kuki per orang (berlaku 30 hari) di jalur `/api/lapor/data`.
- Yang didata: tujuh jenis objek, yaitu rumah (per rumah), prasarana (jembatan, jalan, sekolah, fasilitas kesehatan, ibadah, kantor, pasar, listrik, air, sinyal, irigasi, transportasi, SPBU, lainnya), tempat pengungsian, pengungsi per jiwa berinduk KK, korban per orang (meninggal, hilang, luka), usaha (sawah, kebun, tambak, ternak, kios), dan kebutuhan. Berkas juga memuat isian status penanganan (status darurat, nomor dan tanggal SK, posko, upaya, personel).
- Foto wajib: rumah dan prasarana 2 foto, tempat pengungsian dan usaha 1 foto; pengungsi dewasa wajib foto wajah kecuali menolak difoto; anak di bawah 18 tahun tidak diminta.
- Tim: ketua dapat menambah anggota (paling banyak 20 aktif), memberi tautan baru, dan mencabut; staf BNPB dapat mencabut dan memindahkan ketua.
- Pertanyaan harian "masih berlangsung?" dikirim ke ketua lewat WhatsApp pukul 16.00 WIB.
- Penutupan: ketua menutup berkas dengan kondisi akhir (lihat Metode). Penerimaan oleh staf BNPB (aksi `jitupasna`, `tutup`, `buka`) hanya tersedia sebagai API `POST /api/lapor/data/terima` (`src/lapor_lanjut.js:464-470`); tidak ada tombol Terima di layar mana pun, karena tidak ada berkas di `public/` yang memanggil rute `/api/lapor/data/*`.
- Tautan di pesan WhatsApp mengarah ke `/lapor/data/?t=...` (`src/lapor_lanjut.js:54`), halaman yang belum dibangun (`public/lapor/data/` tidak ada). Selama itu pendataan berjalan lewat API dan percakapan WhatsApp tahap 2.
- Penanda yang menyala pada objek: tanpa titik, foto jauh, foto lama, dobel titik, NIK ganda, di luar kab.
- Data pribadi (nomor HP, foto wajah, NIK): tim melihat utuh, staf melihat tersamar sampai menekan Tampilkan (tercatat), akun lembaga kab melihat tersamar, akun provinsi hanya rekap.
- Tidak ada angka tahap 2 di layar warga atau di halaman publik.
