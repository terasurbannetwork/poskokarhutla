# KEPUTUSAN: Kejadian dari Laporan Warga (kelompok satu desa, halaman publik hari ini, usulan ke Buku Besar)

Paket ini menjabarkan tiga keputusan pemilik 21 Nov 2026 (K85, K86, K87) yang dicatat di
`data/kajian-bnpb/lapor-ai/KEPUTUSAN-LAPOR-AI.md:508-510`. Keputusan di berkas ini menang atas dokumen lain
paket ini; keputusan pemilik menang atas keputusan rancangan. Paket induk `data/kajian-bnpb/lapor-ai/` tetap
berlaku kecuali yang diubah di bagian "Akibat pada keputusan lama" di bawah.

## Keputusan pemilik (21 Nov 2026), satu-satunya keputusan pemilik di paket ini

| No | Kutipan pemilik | Arti singkat |
| --- | --- | --- |
| K85 | "Laporan berulang di satu desa dikelompokkan otomatis jadi satu kejadian, dengan jumlah pelapornya." | Aturan satu desa ditambahkan ke pengelompokan laporan (gugus K33) |
| K86 | "Halaman publik kejadian hari ini berisi laporan terverifikasi tanpa data pribadi, untuk wartawan dan warga." | Satu halaman publik, hanya laporan terverifikasi, tanpa data pribadi |
| K87 | "Dari tiket ke kejadian resmi: laporan warga yang sudah diverifikasi BPBD diusulkan masuk Buku Besar Kejadian, cukup sekali klik staf." | Satu klik staf mengusulkan; keputusan tetap di staf |

Tidak ada keputusan pemilik lain di paket ini. Semua yang tertulis di bawah selain tiga baris di atas adalah
rancangan agent dan bisa dibatalkan pemilik.

## Akibat pada keputusan lama

| Keputusan lama | Letak | Akibat |
| --- | --- | --- |
| D7 "tidak pernah tampil publik", "tidak pernah membuat kejadian resmi" | `lapor-ai/KEPUTUSAN-LAPOR-AI.md:56` | Diubah K86 dan K87 hanya untuk laporan terverifikasi BPBD. Laporan belum terverifikasi tetap tidak publik dan tidak membuat kejadian resmi. Catatan: D7 sudah lebih dulu dilonggarkan Q14 (Alun-alun, `:89`) untuk status ditindaklanjuti dan selesai; paket ini tidak menyentuh Alun-alun (lihat Q10) |
| Q11 "peta dan galeri foto laporan tampil di halaman publik: tidak" | `:87` | Peta (titik pusat desa) boleh tampil di halaman baru untuk laporan terverifikasi. Galeri foto tetap tidak (Q8) |
| D29 "tanpa kandidat, pencocok mencatat tanpa_pasangan, tidak pernah `baru`" | `:128` | Diubah K87: untuk rekaman yang ditandai usulan staf, pencocok boleh mendirikan kejadian baru. Rekaman otomatis tanpa klik staf tetap tidak pernah `baru` |
| K33, D27 sampai D30, Q18, Q19 (gugus) | `:113`, `:126-129`, `:150-151` | Ditambah aturan satu desa (D2 di bawah). Radius, jendela, dan syarat dua nomor berbeda tidak diganti |
| Q60, Q61 (lencana "dicek BPBD" dan tindakan di Alun-alun) | `:489-490` | Q61 terjawab untuk halaman baru: lencana "diverifikasi BPBD" tampil di halaman hari ini. Alun-alun tidak berubah |
| Q47 foto bukti petugas publik | `:377` | Tetap bawaan: tidak (Q8) |

## Keputusan rancangan (agent)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Istilah baku. **Kejadian laporan** = gugus A9 (kode `GL-`) atau satu laporan tunggal. **Kejadian resmi** = baris Buku Besar Kejadian (`KJ-`). Layar dan dokumen tidak mencampur keduanya. | Kode `KJ-ddmmyy-NN` milik K66 dan `KJ-` Buku Besar sama awalan (lihat Q14) |
| D2 | K85 diwujudkan sebagai satu aturan tambahan di A9 ("aturan satu desa", `ALGORITMA.md` A1): jenis induk sama, kode desa sama, waktu kejadian berantai dalam jendela desa. Aturan ini ATAU aturan radius lama yang menyambungkan dua laporan. Ambang radius dan jendela lama tidak diubah. Ambang baru (jendela desa) tertulis sebagai HIPOTESIS dengan bawaan di Q1. | Instruksi: tidak mengganti ambang diam-diam |
| D3 | Jumlah pelapor = jumlah nomor pelapor berbeda. Satu nomor yang melapor tiga kali di desa yang sama dihitung satu pelapor dan, sendirian, tidak mendirikan kejadian laporan beranggota (D27 tetap). Angka tampil bila 2 atau lebih (D85 tetap). | "dengan jumlah pelapornya" dan privasi pelapor |
| D4 | "Terverifikasi BPBD" didefinisikan tepat lima syarat (`ALGORITMA.md` A3): pengecekan terakhir berhasil Valid, dilakukan akun lembaga BPBD yang wilayahnya mencakup laporan, tiket bukan Tidak valid, tidak ada versi laporan lebih baru dari pengecekan, dan tidak ditarik staf. | Satu kata, satu arti, bisa diuji |
| D5 | Halaman publik baru `/lapor/hari-ini` dengan rute `GET /api/lapor/hari-ini`, dibangun dari pembentuk kartu publik yang sama dengan Alun-alun (`alunBuat`), bukan salinan. Alun-alun tidak berubah. | Pakai ulang, jangan gandakan |
| D6 | Kolom publik hanya dari daftar putih (`DESAIN-TEKNIS.md` bagian 5); semua kolom lain tidak keluar dari Worker. | Privasi dan UU PDP |
| D7 | Halaman publik tidak menulis apa pun ke D1 selain batas laju; hasil di-cache tepi 60 detik. | Kuota baca D1 Free 5 juta baris per hari |
| D8 | Staf BNPB dan BPBD wilayahnya bisa menarik satu kejadian laporan dari halaman publik; penarikan append-only dan berlaku paling lama 60 detik. | Koreksi cepat bila ada kebocoran atau salah verifikasi |
| D9 | Tombol "Usulkan ke Buku Besar" menulis baris `lk_usulan` (append-only). Pemasangan ke Buku Besar tetap lewat satu pencocok `scripts/siklus/pasang.py`; Worker tidak mendirikan kejadian resmi sendiri. | AGENTS 2.15 dan `keterpaduan/KEPUTUSAN-KETERPADUAN.md:19-33` |
| D10 | Rekaman usulan ke Buku Besar membawa dampak kosong, kode usulan, dan label keyakinan "laporan warga, diverifikasi BPBD"; fase kejadian yang didirikan `terdeteksi`; naik ke terverifikasi tetap hanya staf. | `siklus/KEPUTUSAN-AWAL.md:112` (U16), D29 |
| D11 | Status usulan di meja dibaca dari `sk_kejadian_sumber` (sumber `lapor_ai`, kode usulan), bukan disalin. | Satu tempat kebenaran |
| D12 | Halaman publik dan usulan masing-masing dinyalakan oleh saklar lingkungan sampai pemilik menjawab pertanyaan penahannya (Bagian Fase). | Rilis bertahap |
| D13 | Nomor migrasi diambil saat tiket dikerjakan, sesudah 0162. Dokumen menyebut tabel dengan nama. | Pola `keterpaduan` D13 |
| D14 | Tidak ada agent baru. Pengerja: `warga-api` (`src/**`, migrasi), `layar-peta` (`public/lapor/**`), `siklus` (`scripts/siklus/pasang.py`). | `ilmu.mjs pemilik` per berkas, lihat `DESAIN-TEKNIS.md` bagian 2 |

## Pertanyaan terbuka (tidak dijawab dengan karangan; bawaan sementara ditandai)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Jendela aturan satu desa: berapa jam antarlaporan di desa yang sama masih satu kejadian laporan? Kode sekarang sudah menyambung laporan satu desa tetapi hanya dalam jendela jenis (6 atau 12 jam), `src/lapor_gugus.js:26`. | **[BAWAAN SEMENTARA]** 24 jam berantai untuk jenis lokal (banjir, longsor, kebakaran gedung, cuaca, karhutla); HIPOTESIS menunggu data F0 | LK-01 |
| Q2 | Batas panjang rantai satu kejadian laporan (single linkage bisa menyambung berhari-hari)? | **[BAWAAN SEMENTARA]** 72 jam sejak laporan pertama, sama dengan `JEDA_GABUNG` meja (D119); sesudahnya kejadian laporan baru | LK-01 |
| Q3 | Kekeringan dan abrasi (tidak dihitung di A9) ikut aturan satu desa? | **[BAWAAN SEMENTARA]** Tidak; berlangsung berhari, jendela jam tidak bermakna | LK-01 |
| Q4 | Apa yang dihitung "terverifikasi" bagi halaman publik: hanya Valid oleh BPBD wilayah, atau juga Sebagian benar, atau pengecekan oleh staf BNPB? | **[BAWAAN SEMENTARA]** Hanya Valid oleh akun BPBD wilayah. Sebagian benar dan cek BNPB tampil di meja saja | LK-02, LK-05 |
| Q5 | Laporan yang memenuhi D4 tayang otomatis atau staf menekan "tayangkan"? | **[BAWAAN SEMENTARA]** Otomatis, dengan tarikan staf (D8) | LK-05 |
| Q6 | Angka dampak tampil di halaman publik? | **[BAWAAN SEMENTARA]** Tampil sebagai rentang terkecil sampai terbesar antarlaporan terverifikasi, berlabel laporan warga; tidak dijumlah, tidak ada total hari ini | LK-04 |
| Q7 | Titik peta: pusat desa, pusat kecamatan, atau tanpa peta? | **[BAWAAN SEMENTARA]** Pusat desa dibulatkan 4 desimal (cara yang sudah dipakai Alun-alun, D84) | LK-06 |
| Q8 | Foto bukti tampil publik? | **[BAWAAN SEMENTARA]** Tidak (Q47 tetap); wajah dan pelat tidak bisa disaring mesin | LK-04 |
| Q9 | Arti "hari ini": hari kalender WIB atau 24 jam terakhir? Diukur dari waktu kejadian atau waktu verifikasi? | **[BAWAAN SEMENTARA]** 24 jam terakhir bergulir, diukur dari waktu verifikasi Valid terakhir; kejadian laporan yang diverifikasi tadi malam tidak hilang tepat tengah malam | LK-05 |
| Q10 | Alun-alun K30 (status ditindaklanjuti atau selesai, tanpa syarat verifikasi) ikut syarat terverifikasi supaya dua halaman publik tidak memberi sinyal berbeda? | **[BAWAAN SEMENTARA]** Tidak diubah; keputusan Q14 pemilik 19 Nov tetap sampai pemilik menyatakan lain | LK-05 |
| Q11 | Siapa yang boleh mengeklik "Usulkan"? | **[BAWAAN SEMENTARA]** Akun staf meja yang juga memegang peran siklus yang boleh memutus antrean (`izin: PDKO`, `src/siklus_kejadian.js:469-470`); akun BPBD tidak | LK-09 |
| Q12 | Seberapa cepat usulan dipasang? | **[BAWAAN SEMENTARA]** Pada jalan terjadwal `siklus.yml` berikutnya (tiap 3 jam, `.github/workflows/siklus.yml:16`); meja menulis "Diusulkan, menunggu pencocokan" | LK-10 |
| Q13 | Usulan dengan lebih dari satu kandidat kejadian resmi? | **[BAWAAN SEMENTARA]** Masuk antrean tinjau Siklus (`ambigu`); staf memilih di sana. Tidak ada tebakan | LK-10 |
| Q14 | Tabrakan awalan: kode kejadian laporan K66 `KJ-ddmmyy-NN` (`migrations/0160_lapor_kelompok.sql`) lawan ID Buku Besar `KJ-ddmm-XXXXXXXX` (`scripts/siklus/pasang.py:39-47`). Diganti awalan? | **[BAWAAN SEMENTARA]** Tidak diganti (CHECK migrasi 0160 mengunci); layar selalu menulis "Kejadian laporan KJ-..." atau "Kejadian resmi KJ-..." dan gerbang uji memeriksa tidak ada kode tercampur di satu kolom | LK-08 |
| Q15 | Kartu publik menautkan ke ringkasan publik kejadian resmi (`/siklus/kejadian/KJ-...`, U3) bila ada? | **[BAWAAN SEMENTARA]** Tidak pada rilis pertama; angka kedua sumber tidak boleh tampak setara | LK-06 |
| Q16 | Bahasa halaman publik? | **[BAWAAN SEMENTARA]** Indonesia saja; terjemahan menyusul seperti `/lapor` bila diminta | LK-06 |
| Q17 | Ada unduhan, JSON, atau RSS untuk wartawan? | **[BAWAAN SEMENTARA]** Tidak; hanya halaman, tombol bagikan, dan cetak | LK-06 |
| Q18 | Siapa boleh menarik dari halaman publik? | **[BAWAAN SEMENTARA]** Staf BNPB dan akun BPBD wilayah laporan | LK-07 |
| Q19 | Waktu kejadian tampil sampai menit atau dibulatkan? | **[BAWAAN SEMENTARA]** Dibulatkan ke jam terdekat bila kejadian laporan hanya punya satu pelapor (menyulitkan penebakan pelapor di desa kecil) | LK-04 |
| Q20 | Laporan yang sudah tayang lalu diubah menjadi Tidak valid atau mendapat versi baru: turun otomatis? | **[BAWAAN SEMENTARA]** Ya, turun pada muat berikut (D4 butir 3 dan 4) | LK-05 |

## Fase

| Fase | Isi | Menunggu |
| --- | --- | --- |
| F0 | Aturan satu desa dihitung kode dan tampil di meja (LK-01, LK-08). Tanpa halaman publik dan tanpa usulan | Q1, Q2 hanya mengubah angka bawaan |
| F1 | Halaman publik `/lapor/hari-ini` di balik saklar; dinyalakan sesudah pemilik meninjau di lokal dan menjawab Q4, Q5, Q6, Q10 | Pemilik |
| F2 | Usulan ke Buku Besar (LK-09 sampai LK-11), butuh `lapor_ai` terpasang di `pasang.py` (belum ada per `pasang.py:17`, tiket LA-25) | Q11, Q12, Q13 |


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

