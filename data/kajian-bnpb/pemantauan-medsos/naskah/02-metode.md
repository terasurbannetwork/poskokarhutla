# BAB 2 Metode

## 2.1 Telaah dokumen platform

Kajian ini membaca dokumentasi resmi pengembang tiap platform yang dapat dibuka per 20 November 2026: Instagram Graph API (pencarian tagar), Threads API (pencarian kata kunci), X API (daftar harga), TikTok Research Tools (syarat kelayakan), dan Meta Content Library (akses peneliti). Bila dokumen resmi tidak memuat angka, kajian ini memakai ulasan pihak ketiga dan menandai angka itu sebagai perlu diperiksa ulang.

## 2.2 Telaah pustaka

Pustaka yang ditelaah mencakup penelitian deteksi gempa dari Twitter, survei pengolahan unggahan media sosial saat darurat, alat klasifikasi kabar darurat yang dipakai lembaga kemanusiaan, dan pengalaman PetaBencana.id di Indonesia. Telaah ini dipakai untuk menentukan langkah pengolahan dan alasan verifikasi oleh manusia.

## 2.3 Telaah sistem yang sudah berjalan

Kajian ini membaca kode dan keluaran pipeline yang sudah ada di repositori sistem Centurisk97:

- pipeline berita karhutla, yang menarik Google News RSS dan menulis berkas berita publik;
- penarik TikTok per tagar lewat browser lokal tanpa login;
- pengolah post media sosial kurasi admin untuk Instagram, X, dan Threads;
- pembuat peringatan dari berita untuk semua bencana.

Ukuran keluaran per 20 November 2026 dihitung langsung dari berkas datanya: 3.987 artikel karhutla dari 1.108 sumber dalam jendela 120 hari, dan 29 video TikTok dari 4 tagar dalam 7 hari.

## 2.4 Perhitungan biaya

Biaya dihitung dari perkiraan volume per hari dikali harga satuan. Asumsi yang dipakai:

- kurs Rp16.500 per dolar Amerika Serikat;
- klasifikasi satu kabar memakai sekitar 800 token masukan dan 150 token keluaran pada Claude Haiku 5.5 (US$0,10 per juta token masukan dan US$0,50 per juta token keluaran);
- ringkasan untuk piket memakai Claude Sonnet 5.5 (US$2 dan US$10 per juta token), sekitar 20.000 token masukan dan 1.500 token keluaran per ringkasan;
- biaya baca X US$0,005 per post menurut skema bayar per pemakaian;
- layanan penarik pihak ketiga sekitar US$2 per 1.000 hasil;
- honor tenaga pendukung Rp6.000.000 per orang per bulan, angka perkiraan yang perlu disesuaikan dengan Standar Biaya Masukan tahun anggaran berjalan;
- cadangan 10 persen untuk perubahan harga dan volume.

Dua paket disusun: Paket Mulai, yang memakai jalur gratis sebanyak mungkin dan tenaga yang sudah ada, dan Paket Lengkap, yang memperluas cakupan dan menambah verifikator.
