# Nomor kejadian dan penautan laporan

Halaman ini menjelaskan cara nomor kejadian dibuat dan cara laporan dari banyak sumber disatukan ke satu kejadian.

## Nomor kejadian KJ

Setiap kejadian mendapat nomor berbentuk KJ, tahun, lalu delapan karakter, misalnya KJ-2026-9A2WGN3G. Nomor ini tidak pernah berubah dan tidak pernah dipakai ulang, bahkan untuk kejadian yang dibatalkan atau digabung.

1. Sistem menyusun sebuah kunci dari tiga hal: jenis bencana, kabupaten utama, dan tanggal mulai.
2. Dari kunci itu dibuat kode delapan karakter. Kunci yang sama selalu menghasilkan kode yang sama, jadi kejadian yang sama tidak mendapat nomor ganda.
3. Nomor dibentuk dari tahun mulai ditambah kode itu.
4. Bila kebetulan kode sudah dipakai kejadian lain, sistem mencoba lagi dengan tambahan penanda sampai ketemu nomor yang kosong.

Kabupaten dikenali lewat kode wilayah Kementerian Dalam Negeri. Untuk karhutla, lokasi dipakai dalam kotak sekitar 2 km karena nomor kelompok titik panas diberi ulang setiap hari. Titik panas adalah lokasi yang dideteksi satelit lebih panas dari sekitarnya.

## Mengaitkan laporan dari banyak sumber ke satu kejadian

Setiap laporan baru diperiksa berurutan.

1. Bila laporan itu sudah pernah dikaitkan, kejadiannya diperbarui.
2. Bila belum, sistem mencari kejadian aktif yang jenisnya sama, kabupatennya sama, selisih tanggalnya paling banyak 3 hari, dan belum punya laporan dari sumber yang sama.
3. Tepat satu kandidat: laporan ditambahkan ke kejadian itu. Tidak ada kandidat: dibuat kejadian baru berstatus terdeteksi. Lebih dari satu kandidat: masuk antrean untuk diputuskan staf. Sistem tidak pernah menebak.

Untuk arsip lama, DIBI dan Logbook dipasangkan satu lawan satu menurut selisih tanggal terkecil. Pada data 10 November 2026, sekitar 59,8 persen kejadian DIBI dan 60,4 persen kejadian Logbook berhasil dipasangkan, sisanya berdiri sendiri. Selisih tanggal 3 hari dipakai untuk semua jenis bencana.

## Membersihkan Logbook

Logbook Pusdalops (sekitar 56.685 baris) dibersihkan dengan aturan berurutan:

1. Baris tanpa tanggal mulai yang terbaca dibuang.
2. Baris sebelum 2011 atau bertanggal di masa depan dibuang. Batas 2011 adalah batas rentang data, bukan peraturan.
3. Baris yang sama persis dibuang, yang pertama disimpan.
4. Kabupaten yang tidak dikenal ditandai dan masuk antrean.
5. Jenis kejadian yang tidak bisa dibandingkan ditandai dan tidak dipasangkan.
6. Nilai dampak negatif atau bukan angka dikosongkan.

## Titik perkiraan dari nama desa

Logbook hanya mencatat nama desa, kecamatan, dan kabupaten. Sistem mencocokkan nama desa itu hanya di dalam kabupaten kejadian. Bila tepat satu desa cocok, titik kejadian diletakkan di pusat desa itu dan diberi label perkiraan model. Kejadian yang menyebut lebih dari satu desa tidak ditebak. Pusat kabupaten atau kecamatan tidak pernah dipakai sebagai pengganti. Hasil ukur 24 November 2026: dari 56.685 kejadian, 19.248 (34,0 persen) cocok ke satu desa. Sisanya tidak cocok terutama karena catatan menyebut banyak desa (17.878 kejadian), tidak menyebut desa (7.537), atau nama desanya tidak ada di kabupaten itu (5.821).

## Angka berdampingan dan selisih

Untuk setiap jenis angka (misalnya korban meninggal) pada satu kejadian, sistem mengumpulkan nilai dari tiap sumber yang melapor.

1. Hitung berapa sumber yang punya nilai.
2. Bila ada dua sumber atau lebih, selisih adalah nilai terbesar dikurangi nilai terkecil.
3. Persentase selisih adalah selisih dibagi nilai terbesar, dikali 100, bila nilai terbesar lebih dari nol.

Contoh: korban meninggal menurut DIBI 12 dan menurut Logbook 15. Selisihnya 3, atau 20 persen. Tidak ada angka total. Nilai 0 yang dilaporkan adalah angka sungguhan, sedangkan kosong berarti "belum ada laporan". Untuk karhutla, angka terdampak dari sumber selain sistem Centurisk97 tidak pernah tampil.
