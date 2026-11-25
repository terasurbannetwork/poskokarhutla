# KEPUTUSAN: Data lanjutan BPBD sesudah laporan awal (Lapor Bencana BNPB tahap 2 dan 3)

Dokumen ini menang atas semua dokumen lain di folder ini. Paket induknya `data/kajian-bnpb/lapor-ai/` (Lapor Bencana BNPB); keputusan di sana tetap berlaku kecuali yang diganti secara tertulis di sini (D18 mengganti D12 induk untuk tahap 2).

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
| K9 | 20 Nov 2026 | Data pribadi pengungsi dan korban dihapus 5 tahun sesudah kejadian selesai (menjawab Q4). |
| K10 | 20 Nov 2026 | Kriteria RB, RS, RR rumah dan prasarana memakai angka modul Siklus: RB lebih dari 70% rusak, RS 30 sampai 70%, RR kurang dari 30% (menjawab Q1). |
| K11 | 24 Nov 2026 | Penutupan lewat WA cukup satu pesan *tutup* dari ketua, tanpa konfirmasi kedua. Salah ketik dibetulkan dengan staf Pusdalops membuka lagi berkasnya (LJ-13). |

## Keputusan rancangan (D, agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Tahap 2 terbuka hanya untuk tiket `LA-` bertingkat `bpbd` (nomor terkonfirmasi, D19 induk) sesudah laporan awal terkirim, **dan** kab dari kode wilayah laporan sama dengan kab di `lapor_izin` pelapor. Pelapor `bpbd_klaim`, `warga`, dan BPBD yang melapor di luar kabnya tidak mendapat tahap 2. | Data pribadi warga terdampak hanya dikumpulkan petugas resmi wilayah itu (pola hak wilayah D95 induk). |
| D2 | Satuan kerja = **berkas** satu kejadian per kab/kota, berinduk nomor `LA-` laporan awal, atau laporan induk kelompok (`lapor_kelompok.induk`, K66) bila sudah dikelompokkan. Satu berkas per (induk, kab). Berkas menyimpan `kejadian_id` (`KJ-yyyy-…` di `sk_kejadian`) dan `kab4` begitu tiket induk ditempelkan `pasang.py` ke Buku Besar; sebelum itu keduanya kosong. | Tidak ada buku kejadian kedua (AGENTS 2.15). Kode kelompok `KJ-ddmmyy-NN` bukan `sk_kejadian.id`. |
| D3 | Tujuh jenis objek: `rumah`, `prasarana`, `titik` (tempat pengungsian), `jiwa` (pengungsi per orang), `korban` (meninggal, hilang, luka per orang), `usaha` (lahan, ternak, kios), `kebutuhan`. Status penanganan (status darurat, SK, posko) adalah isian berkas, bukan objek. | Mengikuti bagian Lampiran I Juklak 7/2023 yang sudah jadi meja `dampak`. |
| D4 | Semua objek satu tabel `lj_objek`. Isian umum di kolom `data`, data pribadi (nama orang, HP, NIK, kontak keluarga, keadaan kesehatan) di kolom `pribadi` yang terpisah. Riwayat append-only `lj_jejak` menyimpan beda `data` utuh, tetapi untuk `pribadi` hanya sidik SHA-256. Objek tidak dihapus keras; salah input = status `batal` dengan alasan. | Satu jalur validasi untuk WA dan web; data pribadi bisa dianonimkan (Q4) tanpa merusak jejak. |
| D5 | Angka rekap **dihitung dari daftar objek**, tidak diketik: rumah RB/RS/RR/terendam, meninggal, hilang, luka, mengungsi beserta rincian kelompok umur dan L/P, kolom prasarana meja `dampak` (`<unit vital>_unit`, `jalan_km`, `jembatan_rb/rs/rr`), dan pelayanan dasar per tingkat (sekolah, faskes, ibadah). Pilihan "tidak ada" per bagian meja diisi hanya bila semua metrik bagian itu ditandai nihil (D15). Rekap ditulis ke **satu catatan meja `dampak` per berkas** (dibuat sistem, berkolom sistem `lapor_berkas`) sebagai kolom bersumber `daftar`. Bila catatan itu sudah berisi angka ketikan lain untuk metrik yang sama, keduanya disimpan, meja menandai `beda_sumber`, dan staf memilih. Bila catatan sudah `diverifikasi` atau `masuk_logbook`, rekap baru tidak menimpa: catatan mendapat penanda `rekap_baru` sampai petugas meja menerimanya. | Pemilik tidak mau ketik ulang; angka antarsumber tidak dijumlah (AGENTS 2.9); status meja tidak berubah diam-diam. |
| D6 | Tempat pengungsian memakai register `titik_pengungsian` (`TP-`, migrasi 0134). Spek `titik` memakai enam sektor kebutuhan meja `pengungsi` apa adanya (nilai `ada/tidak`) ditambah tanggal buka. Rekap harian per titik dihitung dari jiwa aktif pada tanggal itu dan ditulis ke meja `pengungsi` (kunci titik dan tanggal, migrasi 0135); `kejadian` meja diisi jenis bencana tiket induk. | Register dan meja yang sudah ada, tanpa terjemahan nilai. |
| D7 | Fungsi prasarana sampai ke Lifeline **hanya lewat kolom prasarana meja `dampak`** (D5), yang sudah dibaca `src/lifeline_usulan.js` sebagai sumber `meja_dampak`. Tidak ada sumber bukti baru dan tidak ada tulis langsung ke `lf_usulan` atau `lf_status`. Butuh `kejadian_id` (D2). | AGENTS 2.19: mesin tidak menetapkan status resmi; satu jalur bukti. |
| D8 | Rumah dan prasarana menjadi bahan baris Jitupasna (`sk_jitupasna_baris`) hanya lewat tombol Terima staf: rumah `unit_asal = 'rekap_rumah_rusak'`, prasarana `unit_asal = 'isian'` per sektor. Hanya tingkat `rb`, `rs`, `rr` yang masuk; terendam adalah tanda terpisah (bukan tingkat) dan tidak masuk Jitupasna kecuali tingkat rusaknya juga diisi. Bila Jitupasna kejadian itu sudah final, Terima ditolak dengan pesan dan staf membuka revisi Jitupasna. BPBD tidak menaksir rupiah per objek; nilai dihitung Jitupasna dari `sk_harga`. | Satu mesin hitung kerugian; trigger beku Jitupasna dihormati. |
| D9 | Pintu WA: mesin kode memegang urutan isian per jenis objek (pola `lapor_mesin`). Di tahap 2 **AI tidak dipakai sama sekali** (D24): semua jawaban diurai kode. Angka dari digit, kosong tidak pernah jadi nol. Foto yang masuk menempel ke objek yang sedang diisi. | Aturan paket induk (2.30); disesuaikan LJ-05. |
| D10 | Pintu web: `/lapor/data/` dengan daftar objek, peta, dan form per objek. Antrean luring `public/inti/antre.js`; spek form dari `public/inti/spek.js`. | K5, K7; memakai ulang inti. |
| D11 | Tim: ketua berkas (pelapor tahap 1) menambah anggota dengan nomor WA lewat chat (`tim tambah <nomor>`) atau tombol web. Staf Pusdalops dan admin bisa mencabut. Anggota berlabel `bpbd_tim`, berhak hanya atas berkas itu. Nomor anggota aktif di `lj_tim` lolos gerbang daftar izin Lapor **hanya untuk jalur berkas** (tidak mendapat hak laporan `bpbd` di luar berkas). Nama anggota ditanyakan di pesan pertamanya dan disimpan di `lj_tim`. | K6; tanpa akun baru; tidak melonggarkan `lapor_izin` untuk jalur lain. |
| D12 | Pertanyaan harian: tiap berkas terbuka mendapat satu pesan per hari ke ketua (ringkasan jumlah dan "masih berlangsung?"). Pesan masuk antrean `lj_kabar` (bukan `lapor_kabar`, yang CHECK jenisnya tertutup) dan dikirim gateway WA yang sudah ada. Cron menit yang ada hanya memeriksa pada menit jam kirim (Q3), satu kueri berindeks. | K3; Juklak 7/2023 BAB II: data dinamis minimal sehari sekali; kuota baca D1. |
| D13 | Penutupan: jawaban "selesai" membuka isian penutupan (tanggal selesai, SK bila ada, foto kondisi akhir). Kondisi akhir dihitung dari daftar: korban hilang belum ditemukan, jiwa masih di pengungsian, prasarana masih putus. Bila salah satunya lebih dari nol **atau belum didata**, statusnya **selesai dengan catatan**. | Kejadian tidak boleh tampak tuntas padahal masih ada orang hilang atau datanya kosong. |
| D14 | Penutupan membekukan berkas jadi versi `lj_beku`: rekap, kondisi akhir, isian penutupan, daftar id objek, dan sidik SHA-256 tiap objek, **tanpa data pribadi**. Versi tidak pernah ditimpa; perubahan sesudahnya membuat versi baru. Penutupan menjadi usulan fase ke Buku Besar lewat `pasang.py` (sumber `lapor_ai`); fase hanya berubah lewat penerimaan staf (Q2). Tiket `LA-` pindah ke `selesai` saat staf menerima. | Pola versi beku Laporan Berkala (2.12); penutupan hanya dari laporan resmi. |
| D15 | "Nihil" ditandai **per metrik** (misalnya meninggal nihil, hilang nihil, rumah RB nihil), berbeda dari "belum didata". Metrik bernilai jumlah bila ada objeknya, 0 bila ditandai nihil, kosong bila tidak keduanya. | 36,3% baris DIBI tanpa angka dampak (juklak/DATA-DAMPAK.md). |
| D16 | Tidak ada pencocokan orang otomatis, termasuk dalam satu kab dan antarjenis (jiwa dengan korban). Satu-satunya penanda: NIK yang sama di dua objek **sejenis** dalam satu berkas (jiwa dengan jiwa, korban dengan korban), ditampilkan ke pengisi sebagai kemungkinan input ganda, tidak digabung mesin. | K8; AGENTS 2.15. |
| D17 | Tidak ada versi publik; tidak ada angka tahap 2 di alun-alun, Insight, atau PDF ke warga. | K4. |
| D18 | **Mengganti D12 induk untuk tahap 2 saja:** korban, pengungsi, dan pemilik rumah disimpan per orang dengan nama, sesuai K2 dan K4. D12 induk tetap berlaku untuk tahap 1 (laporan warga dan laporan awal BPBD tetap agregat). | K2 pemilik meminta data per orang. |
| D19 | Data pribadi tidak pernah dikirim ke AI. Isian pribadi (nama orang, HP, NIK, kontak keluarga, ciri, keadaan kesehatan) ditanyakan satu per satu dan diurai kode (pola nomor, angka, pilihan bernomor); teks bebas lain disaring `samarkan` sebelum ke AI. | D12 induk; UU 27/2022. |
| D20 | Hak berkas melekat pada orang, bukan berkas: tiap anggota tim mendapat token sendiri yang ditukar menjadi kuki HttpOnly (pola `lapor_perangkat`, 0159). Media disajikan lewat kuki, tidak pernah lewat token di URL. Mencabut anggota hanya mematikan tokennya. | Hak ketua dan anggota berbeda; jejak per pengisi; tidak memutus anggota lain. |
| D21 | Antrean luring: isian non-pribadi dan foto rumah, prasarana, usaha boleh tersimpan di IndexedDB perangkat (`antre.js` biasa). Isian `pribadi` dan foto wajah memakai saluran `rahasia` (memori saja, tidak menyentuh penyimpanan perangkat): bila halaman ditutup sebelum terkirim, bagian itu hilang dan layar memperingatkannya sebelum keluar. | Kompromi K4 dan K5: data pribadi tidak tertinggal di ponsel bersama. |
| D23 | Masa simpan (K9): hitungan 5 tahun mulai saat staf menerima penutupan berkas (status `selesai` atau `selesai_catatan`); berkas yang dibuka lagi mengulang hitungan dari penutupan berikutnya. Saat lewat, kolom `pribadi` semua objek berkas dikosongkan dan media berjenis `wajah` serta foto korban hilang dihapus dari R2. Foto rumah, prasarana, dan usaha, isian `data`, rekap, jejak (yang hanya menyimpan sidik pribadi), dan versi beku tetap ada. Penghapusan dicatat di `lj_jejak` dan berjalan bertahap di cron bersih-bersih menit 17 yang sudah ada. | K9; tujuan dibatasi UU 27/2022; rekap tetap bisa dipakai Jitupasna dan riset. |
| D22 | Tiap buka berkas, tampil data pribadi utuh, dan unduh media oleh siapa pun tercatat di `lj_akses`. | Akuntabilitas akses data spesifik. |
| D24 | Pintu WA tahap 2 tanpa model AI; isian diurai kode (`src/lapor_lanjut_mesin.js`, murni): pilihan bernomor atau nama pilihan, ya atau tidak dari 1 dan 2, angka dari satu deret digit, teks apa adanya sampai batas spek, HP dan NIK lewat validasi spek. Perintah pembuka: `data rumah`, `data prasarana`, `jembatan rusak`, `jalan rusak`; lalu isian wajib berurutan (wajib bersyarat dievaluasi saat itu), tawaran isian opsional dengan `lewati` dan `lewati semua`, foto (`lewati` boleh; kurang foto ditandai), ringkasan, `simpan`, `ubah <butir>`, `batal`, `lagi` (desa dan kecamatan terakhir jadi bawaan), `selesai`. Draf percakapan di `lj_sesi` (migrasi 0165), dibuang saat objek tersimpan atau dibatalkan, saat dibaca lebih dari 24 jam, dan oleh cron menit 17. Foto draf di R2 `lapor/data/<berkas>/draf/` dipindah ke kunci akhir saat simpan. Ringkasan dan balasan tidak pernah memuat NIK atau HP utuh; nama tampil utuh ke pemiliknya sendiri. Anggota tim aktif (D11) yang tidak berizin Lapor hanya lolos untuk jalur ini; mengetik `lapor` mengeluarkannya dari mode data ke alur laporan biasa. | D19 dengan cara paling sederhana (pribadi tidak punya jalan ke AI); K7; tiket LJ-05. |

## Pertanyaan terbuka (Q) dengan bawaan sementara

| No | Pertanyaan | Bawaan sementara | Tiket terdampak |
| --- | --- | --- | --- |
| Q1 | Kriteria RB, RS, RR rumah dan prasarana dari pedoman mana? | **Dijawab pemilik 20 Nov 2026 (K10):** angka modul Siklus (`siklus/GLOSARIUM.md`, `siklus/ALGORITMA.md`); form menampilkan contoh ciri tiap tingkat. | LJ-04 |
| Q2 | Siapa yang menerima penutupan ke Buku Besar? | **[BAWAAN SEMENTARA]** Staf berperan Pusdalops di `/lapor/meja`. | LJ-13 |
| Q3 | Pertanyaan harian dikirim jam berapa dan ke siapa? | **[BAWAAN SEMENTARA]** 16.00 WIB, hanya ke ketua berkas; F0 hanya nomor uji dan PEMILIK. | LJ-10 |
| Q4 | Berapa lama data pribadi disimpan sesudah kejadian selesai? | **Dijawab pemilik 20 Nov 2026 (K9):** 5 tahun, lalu dihapus. Rinciannya D23. | LJ-17 |
| Q5 | Anggota tim perlu dikonfirmasi admin, atau cukup ditambah ketua? | **[BAWAAN SEMENTARA]** Cukup ditambah ketua yang terkonfirmasi; admin dan staf Pusdalops melihat daftar anggota dan bisa mencabut. | LJ-09 |
| Q6 | NIK disimpan utuh atau hanya empat digit akhir? | **[BAWAAN SEMENTARA]** Utuh di kolom `pribadi`, terbaca oleh tim berkas; staf melihat tersamar (`************1234`) sampai menekan Tampilkan (tercatat). | LJ-03 |
| Q7 | Perlu jumlah objek minimal sebelum boleh ditutup? | **[BAWAAN SEMENTARA]** Tidak ada minimum; metrik "belum didata" membuat status selesai dengan catatan (D13). | LJ-13 |
| Q8 | Korban meninggal perlu foto? | **[BAWAAN SEMENTARA]** Tidak diminta. Korban hilang boleh dilampiri foto semasa hidup dari keluarga, opsional. | LJ-07 |
| Q9 | Rumah sewa: yang dicatat penghuni atau pemilik? | **[BAWAAN SEMENTARA]** Kepala keluarga penghuni wajib; nama pemilik opsional dengan pilihan "sama dengan penghuni". | LJ-04 |
| Q10 | Pengungsi dewasa yang menolak difoto? | **[BAWAAN SEMENTARA]** Pilihan "menolak difoto" tercatat; isian tetap sah. Foto wajah tidak pernah jadi syarat bantuan. | LJ-06 |
| Q11 | Token web berlaku berapa lama? | **[BAWAAN SEMENTARA]** 30 hari sejak terbit, diperpanjang saat dipakai; ketua bisa meminta token baru. | LJ-03 |
| Q12 | Berapa foto wajib per objek? | **[BAWAAN SEMENTARA]** Rumah dan prasarana 2, titik dan usaha 1. | LJ-04 |
| Q13 | Batas umur foto wajah? | **[BAWAAN SEMENTARA]** Diminta untuk umur 18 tahun ke atas (batas anak UU 35/2014); di bawah itu tidak diminta. | LJ-06 |
| Q14 | Ketua berganti (cuti, rotasi)? | **[BAWAAN SEMENTARA]** Admin atau staf Pusdalops memindahkan peran ketua ke anggota aktif; tercatat di jejak. | LJ-09 |
| Q15 | Akun lembaga BPBD kab/prov (D95, D97 induk) dan staf BNPB selain Pusdalops boleh melihat berkas? | **[BAWAAN SEMENTARA]** Akun lembaga kab: berkas di kabnya, data pribadi tersamar. Akun provinsi: rekap saja. Staf BNPB selain Pusdalops: tidak ada akses. | LJ-03, LJ-16 |

## Fase

| Fase | Isi | Syarat lanjut |
| --- | --- | --- |
| F0 Uji | Nomor uji dan PEMILIK; semua jenis objek, WA dan web, penutupan | RENCANA-UJI bagian 3 hijau |
| F1 Rintisan | Beberapa BPBD terpilih dari F1 paket induk | Q2, Q3 dijawab; LJ-17 selesai |


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

