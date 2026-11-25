# KEPUTUSAN-KAJI-ULANG: Kaji ulang pasca-kejadian (after-action review) per kejadian

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Sesudah kejadian besar selesai, pertanyaan pimpinan adalah "apa yang kita pelajari dan apakah sudah diperbaiki?". Bahannya sudah ada tetapi tersebar: tahap waktu per tugas api (`src/sla.js:29`, `waktuTahap` baris 76), catatan pelajaran per tugas karhutla (`ops_pelajaran`, `src/operasi_lapangan.js:595` dan `:623-634`), fase dan jejak kejadian di Buku Besar (`sk_kejadian`, `sk_jejak`), status layanan dasar (`lf_riwayat`, migrasi 0141), dan 3W dengan tawaran bantuan (`tw_baris`, `tw_tawaran`, migrasi 0143). Tidak ada satu tempat yang merangkainya menjadi laporan kaji ulang per kejadian, dan tidak ada pelacakan apakah rekomendasinya benar-benar dikerjakan. `km_pelajaran` (migrasi 0083) hanya skema dan tidak dipakai kode mana pun (dicek 15 Nov 2026: tidak ada di `src/` maupun `public/`). Tabel `ops_pelajaran` hanya mencakup karhutla dan hanya per tugas, bukan per kejadian.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 15 Nov 2026: F6 disetujui, "Kaji ulang pasca-kejadian: tiap kejadian besar otomatis dapat draf; rekomendasi dilacak sampai tertutup lewat dalops_tindak". |
| K2 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

Catatan penomoran: di `data/kajian-bnpb/siklus/KEPUTUSAN-AWAL.md` kode F6 sudah dipakai untuk Risiko Masa Depan. Nomor F6 pemilik 15 Nov di sini berasal dari daftar usulan lain; dokumen ini memakai nama "Kaji ulang" dan kode tiket `KU-*` supaya tidak bertabrakan (Q12).

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satuan kaji ulang = satu kejadian `KJ-` dari Buku Besar. Tidak ada buku kejadian kedua. | Paket Keterpaduan dan keputusan pemilik 10 Nov 2026. |
| D2 | Draf linimasa dan angka tahap DIHITUNG saat dibuka dari data yang ada, tidak disalin ke tabel. Hanya isian staf (pelajaran, rekomendasi, pengesahan) yang disimpan. Saat disahkan, linimasa dibekukan sebagai potret di tabel. | Tidak ada pindai cron baru (ranjau kuota baca D1); angka tidak pernah punya dua sumber. |
| D3 | Rekomendasi dilacak dengan tabel `dl_tindak` dan `dl_tindak_log` yang sudah ada (migrasi 0128), memakai kunci berawalan `kaji\|`. Tidak ada tabel status kedua. Atribut yang tidak ada di `dl_tindak` (penanggung jawab, tenggat, teks) disimpan di tabel kecil `ku_rekomendasi`. | Perintah pemilik: lacak lewat dalops_tindak. Satu mekanisme status dan riwayat. |
| D4 | `ops_pelajaran` tetap catatan lapangan per tugas. Kaji ulang MEMBACANYA (read-only) untuk semua tugas yang terhubung ke kejadian lewat `sk_kejadian_sumber`, dan staf boleh "mengangkat" satu catatan menjadi pelajaran kejadian dengan menyalin teksnya. Tidak ada tulisan balik ke `ops_pelajaran`. | Tugas bisa terhapus; salinan menjaga kaji ulang utuh. Pelaku lapangan tidak perlu mengubah kebiasaan. |
| D5 | `km_pelajaran` (kajian akademik per aktivasi kampus) tidak dipakai di fase ini. Bila kelak aktivasi kampus bertaut ke kejadian, kaji ulang hanya menampilkan tautannya. | Skemanya per `aktivasi_id` dengan satu baris UNIQUE, status draf/terbit; arti dan penulisnya berbeda (akademisi). |
| D6 | Mesin tidak menulis pelajaran atau rekomendasi. Mesin hanya menyusun fakta (linimasa, durasi tahap, celah) dan menandai celah sebagai "tidak ada data", bukan nol. | Sama dengan prinsip Lifeline D3: mesin menyusun, manusia menetapkan. |
| D7 | Rekomendasi tertutup hanya bila status `selesai` DAN catatan penutup 20 sampai 300 karakter. Status lain tidak dihitung tertutup. | Aturan bukti seperti Lifeline D4; HSEEP menuntut rekomendasi diselesaikan dan diverifikasi, bukan sekadar dicentang. |
| D8 | Pengesahan membekukan teks pelajaran dan potret linimasa. Sesudah itu pelajaran dan rekomendasi hanya bisa ditambah (baris baru), tidak diubah. Riwayat status rekomendasi tetap append-only lewat `dl_tindak_log`. | Dokumen yang dibawa ke pimpinan tidak boleh berubah diam-diam. |
| D9 | Tabel baru membawa `kejadian_id` FK ke `sk_kejadian`. | Gerbang keterpaduan (aturan D2 Keterpaduan). |
| D10 | Rute di bawah `/api/siklus/kejadian/:id/kaji-ulang` (ikut pola hak Siklus); BPBD lewat `/api/instansi/siklus/...`. | Pola Lifeline dan 3W. |
| D11 | Tanpa nama personel lapangan di draf, potret, dan ekspor; hanya peran dan hitungan. | Lihat KEAMANAN-PRIVASI. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Apa itu "kejadian besar" yang otomatis dapat draf? | **[BAWAAN SEMENTARA, HIPOTESIS]** kejadian berfase transisi, pemulihan, atau selesai (draf boleh dilihat sejak transisi untuk kaji intra-aksi; pengesahan hanya sesudah selesai) yang memenuhi salah satu: menyentuh 3 kab atau lebih; pernah ada sel Lifeline merah; masa tanggap lebih dari 7 hari; atau ditandai staf. Kejadian lain boleh dimulai manual oleh staf. Ambang dikalibrasi sesudah 10 kejadian pertama. | KU-04 |
| Q2 | Siapa yang menulis pelajaran dan rekomendasi? | **[BAWAAN SEMENTARA]** Pusdalops dan Koordalops pusat; tidak ada penulisan oleh BPBD di fase ini (akun instansi BP baca-saja di `src/hak.js` MATRIKS_SK; tabel `ku_*` tanpa kab4). Pimpinan membaca. | KU-05 |
| Q3 | Siapa yang mengesahkan? | **[BAWAAN SEMENTARA]** Koordalops (atau Super Admin); penulis tidak boleh mengesahkan kaji ulang yang seluruhnya ia tulis sendiri bila ada Koordalops lain (dua pasang mata). | KU-06 |
| Q4 | Tenggat menyelesaikan kaji ulang dan tenggat rekomendasi? | **[BAWAAN SEMENTARA]** draf disahkan paling lambat 30 hari sejak fase selesai; tiap rekomendasi wajib bertenggat, bawaan 60 hari sejak pengesahan, boleh diisi staf antara 7 dan 365 hari. Lewat tenggat tampil "lewat tenggat", status tidak berubah sendiri. | KU-05 |
| Q5 | Penanggung jawab rekomendasi? | **[BAWAAN SEMENTARA]** satu unit atau instansi berupa teks 2 sampai 80 karakter (mis. "Direktorat ..."), bukan akun orang. Daftar unit baku menunggu paket Ruang Unit. | KU-05 |
| Q6 | Siapa boleh melihat? | **[BAWAAN SEMENTARA]** staf Pusdalops, Koordalops, Pimpinan; BPBD hanya kejadian di kab wilayahnya dan hanya yang sudah disahkan. Tidak publik, tidak masuk `public/`. | KU-08 |
| Q7 | Format keluaran untuk pimpinan? | **[BAWAAN SEMENTARA]** cetak A4 dari layar (gaya cetak CSS) dengan potret beku dan nomor versi; tanpa PDF dari server dan tanpa PPTX di fase ini. | KU-09 |
| Q8 | Status rekomendasi di luar tiga status `dl_tindak` (belum, proses, selesai): perlu "ditolak" atau "dialihkan"? | **[BAWAAN SEMENTARA]** tidak. Rekomendasi yang tidak jadi dikerjakan ditutup `selesai` dengan catatan alasan 20 sampai 300 karakter dan ditandai di `ku_rekomendasi.tidak_dilanjutkan`. Mengubah CHECK `dl_tindak` butuh migrasi tabel, ditolak. | KU-05 |
| Q9 | Masuk Laporan Berkala ke Presiden? | **[BAWAAN SEMENTARA]** belum; menunggu paket Laporan Berkala. Hanya ringkasan hitungan (rekomendasi terbuka, lewat tenggat). | tidak menahan |
| Q10 | Jendela waktu tinjau Dalops `GET /api/dalops/tindak` (60 hari) tidak cukup untuk rekomendasi 365 hari. | **[BAWAAN SEMENTARA]** kaji ulang memakai rute baca sendiri berawalan kunci, tanpa batas 60 hari; rute Dalops mengecualikan awalan `kaji\|`. | KU-05 |
| Q11 | Kejadian jenis apa yang ikut? | **[BAWAAN SEMENTARA]** semua jenis di Buku Besar. `tugas_api` membawa tugas multi-bencana (migrasi 0047, `tugas_bencana`), jadi bagian per tugas muncul untuk jenis yang punya tugas terhubung (karhutla dan banjir), dengan kata mengikuti jenisnya; jenis tanpa tugas hanya memakai linimasa kejadian, Lifeline, dan 3W. | tidak menahan |
| Q12 | Bentrok nomor F6 dengan Risiko Masa Depan di paket Siklus. | **[BAWAAN SEMENTARA]** dipakai nama "Kaji ulang", kode tiket `KU-*`; pemilik atau orkestrator menentukan nomor fase resminya. | tidak menahan |
| Q13 | Boleh BPBD menulis pelajaran kab wilayahnya? | **[BAWAAN SEMENTARA]** tidak di fase ini. Bila ya: tambah `kab4` di `ku_pelajaran`, entri baca-tulis akun instansi di MATRIKS_SK, dan uji hak (tiket tambahan). | tidak menahan |


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

