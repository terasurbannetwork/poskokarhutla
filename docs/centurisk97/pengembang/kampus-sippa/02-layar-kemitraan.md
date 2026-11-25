# Layar pendaftaran, direktori, pemetaan

Bagian ini memerinci layar pendaftaran, buku profil, panduan wawancara, direktori akademisi, dan status pemetaan relawan.

## Kemitraan Kampus: pendaftaran dan masuk

Jalur: `/kemitraan/daftar` dan `/kemitraan/masuk`. Keduanya publik.

1. Pendaftar kampus mengisi formulir dan mengunggah surat tugas berformat PDF (maksimum 2 MB). Kampus berstatus menunggu sampai BNPB menyetujui.
2. Pendaftar anggota (dosen, tenaga kependidikan, mahasiswa, alumni) mengisi formulir anggota. Anggota disetujui oleh koordinator kampus.
3. Setelah kampus disetujui, BNPB menerbitkan tautan atur sandi untuk koordinator. Tautan berlaku 72 jam dan sekali pakai.
4. Koordinator masuk di `/kemitraan/masuk`. Lima kali salah sandi mengunci akun 15 menit.

Hal yang sering disalahpahami: jawaban pendaftaran sengaja sama persis untuk kampus baru dan kampus yang sudah terdaftar, supaya orang luar tidak bisa menebak siapa yang sudah terdaftar. Halaman `/kemitraan/saya` dan `/kemitraan/sertifikat/:id` sudah terdaftar sebagai rute, tetapi berkas HTML-nya belum ada di `public/kemitraan/`, sehingga yang tampil hanya cangkang "Masuk untuk melanjutkan" (cangkang `CANGKANG` di `src/kemitraan.js:51`, rute di `:88` dan `:91`).

## Kemitraan Kampus: buku profil daerah

Jalur: `/kemitraan/buku?kab=<kode 4 digit>` untuk kabupaten/kota, atau parameter provinsi untuk buku provinsi. Hak: SA, ST, PM, dan KK (`src/kemitraan.js:88`). Kode BPBD, anggota, dan pakar tidak bisa membuka halaman ini lewat navigasi karena kode dikirim sebagai header oleh skrip.

1. Buka dari lembar profil, atau langsung dengan parameter.
2. Halaman menyusun bab 1 sampai 7 dan 9 dari berkas profil (pemakaian ulang kode layar Daerah). Bab 8 (rekomendasi pakar) hanya muncul bila API pakar menjawab 200. Saat ini rute itu masih menjawab 501 (belum tersedia), sehingga bab 8 tidak tampil.
3. Cetak lewat dialog cetak peramban. Ukuran A4, tiap bab diberi kaki sumber.

## Kemitraan Kampus: panduan wawancara

Jalur: `/kemitraan/panduan?kab=<4 digit>&masalah=<auto_id>&n=<narasumber,...>`. Hak: SA dan ST.

1. Pilih daerah, masalah (opsional), dan narasumber dari delapan pilihan: BPBD, Bappeda, Dinas PU/SDA, Dinas Kesehatan, Dinas Sosial, kepala desa/lurah, warga terdampak, pengusaha.
2. Halaman menyusun pertanyaan berurutan menurut arah: konfirmasi, akar, kapasitas, upaya, kebutuhan, harapan. Slot diisi angka profil (jumlah kejadian, tren, kecamatan teratas, dokumen yang kurang).
3. Pertanyaan akar diberi susulan "Mengapa?" bertingkat (paling banyak tiga).
4. Cetak. Kaki halaman memuat sumber dan tanggal tiap kelompok angka, dan catatan bahwa pertanyaan disusun otomatis dan belum divalidasi.

## Direktori akademisi: `/direktori`

Jalur: `/direktori`. Alamat lama `/akademisi` dialihkan permanen (301) ke `/direktori` (`src/worker.js:818`). Hanya untuk staf BNPB dan admin karena memuat data pribadi akademisi.

Peran staf yang boleh membuka (`src/akademisi.js:12`): `verifikator`, `pusdalops`, `analis_konsesi`, `udara`, `tmc`, `koordalops`, `pimpinan`, `kemitraan`, dan `direktori`. Peran `operator_cc` sengaja tidak termasuk.

Tab yang tersedia (`public/akademisi.js:3523`): Pakar, Lembaga, Wilayah, Inovasi, Sistem data, Pendanaan, Donasi, Pustaka, dan Riset. Beberapa tampilan lain tampil sebagai sub-tab (`public/akademisi.js:3524`): tab Pustaka memuat Buku, Dokumen, Relasi peraturan, dan Berita; tab Riset memuat Riset daerah, Kejadian besar, Pusat studi, dan Aset riset. Alamat lama `?tampil=tokoh` dialihkan ke tab Pakar (`:3525`). Tab Jurnal dan Pengadaan kajian sengaja disembunyikan atas permintaan pemilik (30 Oktober 2026); jurnal tampil di profil kampus dan lembaga penerbit.

Langkah umum:

1. Masuk sebagai staf, lalu buka `/direktori`.
2. Di tab Pakar, saring menurut rumpun bahaya (banjir, longsor, gempa, tsunami, gunung api, karhutla, hidrometeorologi, iklim, pesisir, geologi, manajemen bencana, kesehatan bencana, penginderaan jauh, kekeringan) atau cari nama. Metrik utama adalah h-index dan sitasi.
3. Buka profil pakar untuk melihat karya paling banyak dikutip, riwayat kerja sama dengan BNPB, dan tautan ORCID bila rekaman publiknya ada isinya.
4. Tombol "daftar pendek" menampung pakar terpilih dan bisa diurutkan menurut urutan dipilih, h-index, atau kampus.
5. Staf dapat mengajukan koreksi data lewat tombol koreksi. Koreksi masuk antrean yang hanya dibaca admin.
6. Staf dapat mencatat riwayat dengan BNPB (undangan, narasumber, kontrak, penugasan, lapangan, lainnya) pada pakar, tokoh, atau lembaga. Hanya penulis atau admin yang boleh mengubah atau menghapusnya.

Hal yang sering disalahpahami: nilai "terdekat" menghitung jarak garis lurus dari kampus pakar ke titik yang dipilih, bukan jarak tempuh. Pakar tanpa koordinat kampus tidak ikut urutan jarak dan dihitung terpisah sebagai "kampus tanpa lokasi". Ringkasan riset memakai AI dan hanya memakai isi abstrak, jadi angka dan klaim di luar abstrak tidak muncul.

## Pemetaan relawan (belum punya layar)

Belum ada halaman, belum ada rute Worker, dan belum ada berkas keluaran `public/data/kemitraan/pemetaan_kelengkapan.json` di repositori. Yang sudah ada adalah pipeline bulanan, pembuat paket proyek (dijalankan manual oleh staf), dan skema D1. Alur yang dirancang:

1. Sistem menghitung rasio kelengkapan bangunan OSM per kabupaten/kota setiap bulan.
2. Staf melihat daftar prioritas (paparan tinggi dan kelengkapan rendah) dan menyiapkan paket proyek: batas wilayah (GeoJSON), teks instruksi pemeta, saran citra, dan hashtag.
3. Pemilik menyetujui. Staf mengunggah proyek ke HOT Tasking Manager lewat akun HOT milik pihak yang disetujui, lalu mengisi tautannya. Sistem tidak pernah menulis ke Tasking Manager atau OSM sendiri.
4. Kampus mitra bergabung dan menerima hashtag `#CentuRisk-<kode kampus>`. Sumbangan dibaca balik sebagai agregat per kampus.

Layar ini tidak publik (keputusan rancangan D7).
