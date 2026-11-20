# KEPUTUSAN: Data lanjutan BPBD sesudah laporan awal (Lapor Bencana BNPB tahap 2 dan 3)

Dokumen ini menang atas semua dokumen lain di folder ini. Paket induknya `data/kajian-bnpb/lapor-ai/` (Lapor Bencana BNPB); keputusan di sana tetap berlaku kecuali disebut lain di sini.

## Masalah

Laporan awal Lapor Bencana (tahap 1) hanya memuat angka ringkas dan beberapa foto. Untuk bantuan stimulan rumah, Jitupasna, pengungsian, dan pencarian korban, BPBD perlu data per objek: rumah siapa, rusak seberapa, fotonya bergeotag, jembatan mana yang putus, siapa saja pengungsinya dan nomor yang bisa dihubungi, siapa yang hilang. Sekarang data itu diketik ulang di Excel dan foto tercecer di grup WA tanpa lokasi.

## Keputusan pemilik (K)

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K1 | 20 Nov 2026 | Laporan awal BPBD cukup sama dengan laporan publik (tahap 1 tidak berubah). |
| K2 | 20 Nov 2026 | Sesudah laporan awal selesai, BPBD masuk tahap 2 "data lanjutan": rumah per rumah (milik siapa, foto bergeotag, video, kondisinya), prasarana seperti jembatan rusak beserta fotonya, halaman pendataan pengungsi (nomor HP dan foto), dan korban hilang dengan pola yang sama. |
| K3 | 20 Nov 2026 | Di akhir, BPBD ditanya apakah bencana sudah selesai. |
| K4 | 20 Nov 2026 | Data pribadi (nomor HP, foto wajah, NIK) disimpan di D1 dan R2 di balik sesi, tidak pernah di `public/`. NIK opsional. Foto wajah anak tidak wajib. |
| K5 | 20 Nov 2026 | Foto wajib, video opsional. Isian bisa dikerjakan luring lalu terkirim belakangan. |
| K6 | 20 Nov 2026 | Tim BPBD juga bisa mengisi, bukan hanya pelapor awal. |
| K7 | 20 Nov 2026 | Dua pintu: chat WA dan form web per objek. |
| K8 | 20 Nov 2026 | Tidak ada pencocokan orang antarkab/kota (pengungsi dengan korban hilang). |

## Keputusan rancangan (D, agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Tahap 2 terbuka hanya untuk tiket `LA-` bertingkat `bpbd` (nomor terkonfirmasi, D19 paket induk), sesudah laporan awal terkirim. Pelapor `bpbd_klaim` dan `warga` tidak mendapat tahap 2. | Data pribadi warga terdampak hanya boleh dikumpulkan petugas resmi. |
| D2 | Satuan kerja = **berkas** satu kejadian per kab/kota, berinduk nomor `LA-` laporan awal. Bila laporan sudah dikelompokkan (`lapor_kelompok`, K66 induk), berkas berinduk laporan induk kelompok itu. Satu berkas per (induk, kab). | Tidak ada buku kejadian kedua (AGENTS 2.15); berkas menempel ke tiket yang sudah ada. |
| D3 | Tujuh jenis objek: `rumah`, `prasarana`, `titik` (tempat pengungsian), `jiwa` (pengungsi per orang), `korban` (meninggal, hilang, luka per orang), `usaha` (lahan, ternak, kios), `kebutuhan`. Status penanganan (status darurat, SK, posko) adalah isian berkas, bukan objek. | Mengikuti bagian Lampiran I Juklak 7/2023 yang sudah jadi meja `dampak`. |
| D4 | Semua objek satu tabel `lj_objek` (isian JSON divalidasi spek per jenis), riwayat append-only `lj_jejak`. Objek tidak dihapus keras; salah input = status `batal` dengan alasan. | Pola `meja_catatan` dan `korban_jejak`; satu jalur validasi untuk WA dan web. |
| D5 | Angka rekap (rumah RB/RS/RR/terendam, meninggal, hilang, luka, mengungsi) **dihitung dari daftar objek**, tidak diketik. Rekap didorong ke catatan meja `dampak` kejadian dan kab itu sebagai kolom bersumber daftar. Angka yang sudah diketik berbeda tidak ditimpa: tampil berdampingan dan staf memilih. | Pemilik tidak mau ketik ulang; angka antarsumber tidak dijumlah (AGENTS 2.9). |
| D6 | Tempat pengungsian memakai register `titik_pengungsian` (`TP-`, migrasi 0134). Rekap harian per titik dihitung dari jiwa yang aktif pada tanggal itu dan ditulis ke meja `pengungsi` (kunci titik dan tanggal, migrasi 0135). | Register yang sudah ada; satu catatan per titik per hari. |
| D7 | Fungsi prasarana (putus, terbatas, berfungsi) menjadi isyarat untuk `lf_usulan` Lifeline. Mesin tidak menetapkan `lf_status`; staf yang menetapkan. | AGENTS 2.19: mesin tidak pernah menetapkan status resmi. |
| D8 | Rumah dan prasarana menjadi bahan baris Jitupasna (`sk_jitupasna_baris`, `unit_asal = 'rekap_rumah_rusak'` untuk rumah) hanya lewat tombol Terima staf. BPBD tidak menaksir rupiah per rumah; nilai dihitung Jitupasna dari `sk_harga`. | Satu mesin hitung kerugian; mencegah taksiran per petugas yang berbeda-beda. |
| D9 | Pintu WA: mesin kode memegang urutan isian per jenis objek (pola `lapor_mesin`), AI hanya mengurai jawaban berkutipan. Angka tanpa kutipan dibuang; kosong tidak pernah jadi nol. Foto yang masuk menempel ke objek yang sedang diisi. | Aturan paket induk (2.30). |
| D10 | Pintu web: tautan bertoken dari WA membuka `/lapor/data/` dengan daftar objek, peta, dan form per objek. Antrean luring `public/inti/antre.js`; spek form dari `public/inti/spek.js`. | K5, K7; memakai ulang inti, tanpa salinan. |
| D11 | Tim: ketua berkas (pelapor tahap 1) menambah anggota dengan nomor WA lewat chat (`tim tambah <nomor>`) atau tombol di web. Anggota berlabel `bpbd_tim`, hanya berhak atas berkas itu, dan bisa dicabut ketua atau admin. | K6; tanpa akun baru. Lihat Q5. |
| D12 | Pertanyaan harian: tiap berkas yang belum ditutup mendapat satu pesan ke ketua per hari, berisi ringkasan dan pertanyaan "masih berlangsung?". Pertanyaan sekaligus mengingatkan pemutakhiran data dinamis (Juklak 7/2023 BAB II: minimal sehari sekali). | K3. Pesan proaktif adalah tindakan keluar: selama F0 hanya ke nomor uji (Q3). |
| D13 | Penutupan: jawaban "selesai" membuka isian penutupan (tanggal selesai, SK bila ada, foto kondisi akhir). Mesin menghitung kondisi akhir dari daftar: korban hilang belum ditemukan, jiwa masih di pengungsian, prasarana masih putus. Bila salah satunya lebih dari nol, statusnya **selesai dengan catatan**, bukan selesai. | Kejadian tidak boleh tampak tuntas padahal masih ada orang hilang. |
| D14 | Penutupan membekukan berkas jadi versi (`lj_beku`, isi JSON dan sidik SHA-256), tidak pernah ditimpa. Perubahan sesudahnya membuat versi baru. Penutupan menjadi usulan ke Buku Besar; fase kejadian hanya berubah lewat penerimaan staf (Q2). | Pola versi beku Laporan Berkala (2.12); penutupan hanya dari laporan resmi. |
| D15 | Tiap bagian punya pilihan "nihil" yang berbeda dari "belum didata". | 36,3% baris DIBI tanpa angka dampak (juklak/DATA-DAMPAK.md). |
| D16 | Tidak ada pencocokan orang otomatis sama sekali, termasuk dalam satu kab. Satu-satunya penanda: NIK yang sama muncul dua kali dalam satu berkas (kemungkinan salah input ganda), ditampilkan ke pengisi, tidak digabung mesin. | K8; AGENTS 2.15: orang tidak pernah dicocokkan dari nama. |
| D17 | Tidak ada versi publik, tidak ada angka dari tahap 2 di alun-alun, Insight, atau PDF yang dikirim ke warga. | K4. |

## Pertanyaan terbuka (Q) dengan bawaan sementara

| No | Pertanyaan | Bawaan sementara | Tiket terdampak |
| --- | --- | --- | --- |
| Q1 | Kriteria RB, RS, RR rumah dan prasarana dari pedoman mana? | **[BAWAAN SEMENTARA]** Sama dengan `siklus/GLOSARIUM.md`: RB lebih dari 70% rusak, RS 30 sampai 70%, RR kurang dari 30%; form menampilkan contoh ciri tiap tingkat. Sumber pedoman ditulis di RISET sebelum LJ-04 tayang. | LJ-04 |
| Q2 | Siapa yang menerima penutupan ke Buku Besar? | **[BAWAAN SEMENTARA]** Staf berperan Pusdalops di `/lapor/meja`. | LJ-11 |
| Q3 | Pertanyaan harian dikirim jam berapa dan ke siapa? | **[BAWAAN SEMENTARA]** 16.00 WIB, hanya ke ketua berkas; F0 hanya nomor uji dan PEMILIK. | LJ-10 |
| Q4 | Berapa lama data pribadi pengungsi dan korban disimpan sesudah kejadian selesai? | **[BAWAAN SEMENTARA]** Disimpan tanpa hapus otomatis sampai pemilik memutuskan; akses tetap terbatas. | LJ-13 |
| Q5 | Anggota tim perlu dikonfirmasi admin, atau cukup ditambah ketua? | **[BAWAAN SEMENTARA]** Cukup ditambah ketua yang terkonfirmasi; admin melihat daftar anggota dan bisa mencabut. | LJ-09 |
| Q6 | NIK disimpan utuh atau hanya empat digit akhir? | **[BAWAAN SEMENTARA]** Utuh di D1, terbaca hanya oleh tim berkas dan staf BNPB berperan Pusdalops; layar menampilkan tersamar (`************1234`). | LJ-03 |
| Q7 | Perlu jumlah objek minimal sebelum boleh ditutup? | **[BAWAAN SEMENTARA]** Tidak ada minimum; isian penutupan menampilkan bagian yang masih "belum didata". | LJ-11 |
| Q8 | Korban meninggal perlu foto? | **[BAWAAN SEMENTARA]** Tidak diminta. Korban hilang boleh dilampiri foto semasa hidup dari keluarga, opsional. | LJ-07 |
| Q9 | Rumah sewa: yang dicatat penghuni atau pemilik? | **[BAWAAN SEMENTARA]** Kepala keluarga penghuni wajib; nama pemilik opsional dengan pilihan "sama dengan penghuni". | LJ-04 |
| Q10 | Pengungsi dewasa yang menolak difoto? | **[BAWAAN SEMENTARA]** Pilihan "menolak difoto" tercatat; isian tetap sah. Foto wajah tidak pernah jadi syarat bantuan. | LJ-06 |

## Fase

| Fase | Isi | Syarat lanjut |
| --- | --- | --- |
| F0 Uji | Nomor uji dan PEMILIK; semua jenis objek, WA dan web, penutupan | RENCANA-UJI bagian 3 hijau |
| F1 Rintisan | Beberapa BPBD terpilih dari F1 paket induk | Q2, Q3, Q4 dijawab |
