# GLOSARIUM: Laporan Berkala

| Istilah | Arti di modul ini |
| --- | --- |
| Laporan berkala | Laporan Bencana untuk satu periode: harian, mingguan, bulanan, atau tahunan (K7). |
| Periode, kode periode | Jenis rentang dan kodenya: harian `YYYY-MM-DD`, mingguan `YYYY-Www` (Senin sampai Minggu), bulanan `YYYY-MM`, tahunan `YYYY`. |
| Potongan harian | Salinan data hari itu (karhutla per provinsi, status surut, status gunung api) yang disimpan tiap hari dan menjadi bahan semua periode. |
| Non-alam dan sosial | Kejadian DIBI yang bukan bencana alam: kebakaran gedung dan permukiman, konflik sosial, gagal teknologi, kecelakaan industri, epidemi, lainnya (K5). |
| Laporan bulanan | Laporan Bencana satu bulan kalender dari Kepala BNPB kepada Presiden, PDF A4, acuan bentuk contoh Oktober 2026. |
| Bulan laporan | Bulan kalender yang dilaporkan, 1 sampai hari terakhir, waktu WIB. Bukan bulan penyusunan. |
| Berkas angka | Satu JSON per bulan laporan hasil perakit (`scripts/berkala/rakit.py`), berisi semua angka, tabel, dan deret grafik, beserta tanggal tarik tiap sumber. |
| Tanggal tarik | Tanggal dan jam sumber dibaca. Untuk DIBI menentukan seberapa lengkap laporan susulan daerah. |
| Laporan susulan | Laporan kejadian dari daerah yang masuk DIBI sesudah bulan laporan berakhir. Penyebab angka bulan berjalan naik. |
| Bekukan | Tindakan staf yang menyimpan berkas angka dan isian staf sebagai versi tetap. |
| Versi beku (`vN`) | Salinan tetap satu bulan laporan; tidak pernah ditimpa. `v1` adalah versi pertama yang dibekukan. |
| Kolom staf | Bagian yang hanya diisi manusia: kalimat pembuka, action plan, dukungan yang dimohon, arahan, temuan terpilih, foto, kegiatan. |
| Bencana alam | Kejadian DIBI di luar kebakaran gedung dan permukiman. Hanya ini yang dihitung di Bab 1. |
| Kelompok kering | Kebakaran hutan dan lahan, kekeringan. |
| Kelompok basah | Banjir, tanah longsor, cuaca ekstrem (dan gelombang pasang bila ada). |
| Kelompok geologi | Gempa bumi, erupsi gunung api, tsunami. |
| Hotspot | Titik panas satelit MODIS dan VIIRS dari NASA FIRMS, dihitung sebagai lokasi unik per hari, semua tingkat keyakinan, tanpa sumber panas tetap. Angka sistem kita, bukan SiPongi. |
| Luas terbakar (perkiraan) | Perhitungan sistem dari hotspot VIIRS dikali luas rata-rata per titik dari data resmi BNPB tahun sebelumnya; menunggu verifikasi lapangan. |
| Belum padam | Luas perkiraan yang masih aktif pada hari terakhir bulan laporan menurut sistem. |
| Status surut | Sudah surut, belum surut, atau belum dilaporkan, per kab/kota banjir, dari laporan harian Dit. Koordalops. |
| Peluang tinggi | Kab/kota yang pernah mengalami kejadian jenis itu pada bulan yang sama di paling sedikit separuh tahun pengamatan (definisi di catatan metode; sumber D8, Q12). |
| Action plan | Tiga kolom per bab: sudah dilakukan, sedang berjalan, akan dilakukan. Kolom staf. |
| Dukungan yang dimohon | Langkah yang dimintakan kepada Presiden: langkah, rincian, penanggung jawab, waktu. Kolom staf. |
| Temuan utama | Pernyataan singkat berangka untuk pimpinan. Mesin mengusulkan, staf memilih. |
