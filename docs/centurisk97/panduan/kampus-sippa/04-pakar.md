# Pencocokan pakar dan alur kunjungan

Bagian ini menjelaskan cara pakar dicocokkan dengan masalah dan bagaimana status masalah serta kunjungan bergerak.

## Pencocokan masalah dengan pakar

Gambaran sederhana: sistem membaca judul dan abstrak karya tulis tiap pakar, lalu mencari yang paling banyak memuat kata kunci masalah daerah, dengan tambahan nilai untuk kecocokan bidang, pengalaman di daerah itu, mutu pakar, kedekatan kampus, dan rekam jejak bersama BNPB. Fitur ini belum dibuka untuk pengguna.

Data: karya tulis pakar (judul, abstrak, tahun, jumlah kutipan) dari OpenAlex (katalog karya ilmiah terbuka), daftar kata kunci bahaya, dan data kampus. Data pakar tidak pernah dipublikasikan.

1. Untuk tiap pakar diambil sampai 25 karya: 15 yang paling banyak dikutip dan 10 yang terbaru sejak 2018.
2. Kata di judul dan uraian masalah dibersihkan dari kata umum, lalu dicocokkan dengan karya pakar memakai mesin pencari teks yang menghitung seberapa sering dan seberapa khas kata kunci muncul. Judul karya dihitung dua kali. Nilai teks pakar adalah rata-rata tiga karya terbaiknya.
3. Skor akhir menggabungkan enam hal:

| Bahan | Bobot |
| --- | --- |
| Kecocokan teks | 45 persen |
| Kecocokan kelompok bahaya | 15 persen |
| Bukti pernah meneliti daerah itu | 10 persen |
| Mutu pakar (h-index dan karya terbaru) | 12 persen |
| Kedekatan kampus | 10 persen |
| Rekam jejak bersama BNPB | 8 persen |

4. Kedekatan menurun cepat menurut jarak: jarak 300 km memberi nilai sekitar sepertiga dari nilai maksimum. Kampus tanpa titik diberi 0,3.
5. Sepuluh pakar teratas ditampilkan, dengan paling banyak dua pakar dari satu kampus.
6. Untuk tiga karya teratas, sistem mengutip satu sampai dua kalimat dari abstrak yang tampak menyebut solusi, lengkap dengan tautan. Kutipan ditampilkan apa adanya, tidak ditulis ulang oleh AI, dan berlabel "Kutipan dari abstrak, bukan rekomendasi BNPB".

Contoh: pakar dengan kecocokan teks 0,8, kelompok bahaya cocok (1), bukti lokal 0,6, mutu 0,5, kedekatan 0,5, dan rekam jejak 0 mendapat skor 0,36 + 0,15 + 0,06 + 0,06 + 0,05 + 0 = 0,68. Tiap suku adalah nilai dikali bobotnya, misalnya 0,8 x 0,45 = 0,36.

Kepercayaan: hipotesis, berlabel "Belum diuji". Uji balik belum dijalankan. Sebelum skor ini dipercaya, sekelompok staf akan menilai 60 contoh masalah tanpa tahu sistem mana yang memberi saran, lalu hasilnya dibandingkan dengan dua cara sederhana. Penilaian staf belum ada, jadi hasilnya belum ada.

## Kecocokan donor, keaktifan kampus, dan urutan panggil satgas

Ketiganya masih rancangan dan layarnya belum dibangun, jadi belum ada angka yang tampil untuk pengguna. Rancangannya masih hipotesis dan dicatat di dokumen pengembang.

## Alur status masalah dan kunjungan

Masalah bergerak lewat tahap berikut. Siapa yang memindahkan tiap tahap (staf BNPB, BPBD, atau koordinator kampus) belum dirinci di panduan ini.

1. Diajukan.
2. Ditelaah.
3. Tervalidasi.
4. Dicocokkan.
5. Diambil.
6. Berjalan.
7. Selesai.

Dari tahap awal, masalah juga bisa ditolak atau digabung. Yang ditolak boleh ditelaah lagi. Kunjungan bergerak dari rencana, berjalan, lalu selesai, atau batal. Jawaban "ya" atau "sebagian" pada pertanyaan konfirmasi memajukan masalah ke tervalidasi saat kunjungan selesai.

Bila HP tidak ada sinyal, jawaban kunjungan disimpan di HP dan dikirim sekaligus. Bila satu isian tidak valid, semuanya dikembalikan agar Anda memperbaikinya; tidak ada yang tersimpan setengah.

## Kelengkapan peta bangunan relawan (rancangan)

Gambaran sederhana: sistem membandingkan jumlah bangunan di peta relawan dengan jumlah bangunan yang terdeteksi dari citra satelit. Bila rasionya kecil, peta relawan masih tipis dan perlu dilengkapi. Rancangan ini belum berjalan sebagai layar.

1. Rasio = bangunan di peta relawan dibagi bangunan pembanding dari citra satelit. Bila pembanding kurang dari 100 atau data peta relawan tidak diketahui, rasio dikosongkan.
2. Kelas: tipis bila rasio di bawah 0,6, memadai bila di atas 0,85, selain itu sedang.
3. Rasio di atas 1 ditampilkan apa adanya, karena bisa berarti peta relawan lebih lengkap atau pembanding kurang lengkap.
4. Data dianggap basi bila lebih tua dari 180 hari.

Contoh: daerah dengan 4.000 bangunan di peta relawan dan 10.000 bangunan di pembanding punya rasio 0,4, kelas tipis. Rumus untuk menentukan daerah mana yang diprioritaskan belum dibuat.

Kepercayaan: ambang masih hipotesis dan belum diperiksa. Pembanding juga punya kelemahan: di perdesaan citra bisa salah mengira objek sebagai bangunan, sehingga rasio tampak rendah. Karena itu bacalah per kelas, bukan sebagai angka tunggal.
