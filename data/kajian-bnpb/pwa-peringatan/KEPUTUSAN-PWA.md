# KEPUTUSAN-PWA: Aplikasi terpasang dan peringatan dini Pantau Bencana

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

Paket induk: `data/kajian-bnpb/lapor-ai/` (keputusan K1 sampai K84 tetap berlaku, terutama K65, K67, K75 sampai K82). Aturan prakiraan: `data/kajian-bnpb/prediksi-besok/` dan `data/kajian-bnpb/tangga/` (prakiraan kita dan pernyataan BMKG terpisah, tidak pernah menulis "aman").

## Masalah

Pantau Bencana (`/lapor`) baru bisa dibuka dari peramban. Warga yang tidak membukanya tidak tahu bahwa prakiraan kecamatannya naik. Prakiraan sudah ada (`/prediksi`, ditampilkan di kartu Info dan Prediksi), tetapi warga harus datang sendiri untuk melihatnya, dan sesudah melihat belum ada arahan ke tempat berkumpul terdekat.

## Keputusan pemilik

| No | Tanggal | Keputusan |
| --- | --- | --- |
| K1 | 21 Nov 2026 | Pemilik, disetujui dengan "gas": "Pantau Bencana bisa dipasang di Android dan iPhone dari browser (PWA), sesuai janji di paparan. Warga berlangganan kecamatannya dan menerima notifikasi bila prakiraan banjir, longsor, asap, atau angin naik ke Waspada, beserta arahan ke titik evakuasi terdekat." |
| K2 | 21 Nov 2026 | Konsep disusun lengkap dulu sebelum kode (AGENTS.md 3.7). Folder ini adalah paketnya. |

Hanya K1 dan K2 yang berasal dari pemilik untuk paket ini. Semua yang lain di bawah adalah rancangan agent atau pertanyaan terbuka.

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satu PWA di ruang lingkup `/lapor/`: `manifest.webmanifest`, `sw.js`, dan tombol Pasang, semuanya di `public/lapor/`. Tanpa aplikasi toko, tanpa pembungkus native. | K1 menyebut PWA dari browser. Ruang lingkup `/lapor/` tidak bertabrakan dengan `/instansi` yang sudah punya manifest dan service worker sendiri. |
| D2 | Service worker hanya menangani push, klik notifikasi, dan penggantian langganan. Tanpa penyimpanan cache dan tanpa penangkap `fetch` pada rilis pertama. | Pola `public/sw-instansi.js`. Cache halaman menambah risiko tampilan basi pada layar yang berubah tiap hari. Halaman luring ditunda ke Q5. |
| D3 | Satu tabel langganan baru `pw_langganan`, terpisah dari `push_langganan` milik akun instansi. Kunci VAPID dan rutin enkripsi `src/push.js` dipakai ulang (`enkripsi`, `kirimKe`), tabelnya tidak. | `push_langganan.akun_id` mengacu `instansi_akun` dengan ON DELETE CASCADE; warga tidak punya akun. |
| D4 | Langganan tanpa akun dan tanpa nomor WA: perangkat mendaftarkan endpoint push, kode kecamatan, jenis ancaman, ambang, dan bahasa. Tidak ada GPS yang dikirim, tidak ada nama, tidak ada nomor. | K65 (pelapor web tidak diminta kode), K67, dan prinsip data pribadi tidak di `public/`. |
| D5 | Kecamatan dipilih dengan pencarian wilayah yang sama dengan lapor (K29). Server menyimpan `kec_kode` dan `kab_kode` turunannya. Paling banyak 3 kecamatan per perangkat. | Warga punya rumah, kantor, dan keluarga. Batas 3 menahan penyalahgunaan (Q9). |
| D6 | Tingkat dibaca dari prakiraan per kab/kota (`public/prediksi/data/prediksi.json`, kode BNJ, LSR, ASP, CEX), bukan dari kecamatan, karena prakiraan kita memang per kab/kota. Pesan ditulis "di kabupaten/kota X (kecamatan Y berlangganan)", tidak mengklaim tingkat kecamatan. | Lihat Q1. Mengklaim tingkat kecamatan dari data kab/kota melanggar K4 Tangga (cakupan ditulis apa adanya). |
| D7 | Pemicu "naik": untuk tiap (kab, jenis, tanggal sasaran 1 sampai 3), kirim bila tingkat sekarang minimal ambang pelanggan (bawaan Waspada, nilai 1) dan lebih tinggi daripada tingkat terakhir yang sudah dikirim untuk tiga serangkai itu. Penurunan tingkat tidak mengirim apa pun. | Menahan kelelahan peringatan. Pesan "sudah normal" mudah dibaca sebagai "bahaya sudah lewat" (Q10). |
| D8 | Satu notifikasi per perangkat per kali prakiraan terbit, menggabung semua jenis yang naik; `tag` = kode kab supaya pesan baru menggantikan yang lama. | Satu getaran, bukan empat. |
| D9 | Arahan titik evakuasi dihitung saat notifikasi dibuka, bukan dimuat di isi push. Isi push hanya judul, kalimat singkat, dan tautan `/lapor/?peringatan=<kab>`. | Isi push dibatasi 3993 byte, dan lokasi terbaru warga hanya ada di perangkat. |
| D10 | Titik evakuasi diurut dari (1) register `titik_pengungsian` (migrasi 0134) bila ada baris di kab itu, lalu (2) data OSM lokal (`titik_kumpul`, `sekolah`, `pemerintahan`, rumah ibadah) berlabel "perkiraan dari OpenStreetMap, belum tentu ditetapkan BPBD". Jarak dihitung dari titik tengah kecamatan; bila warga mengizinkan GPS saat membuka kartu, dari GPS itu, tanpa dikirim ke server. | Tidak ada data resmi titik evakuasi per kecamatan di repo (Q8). |
| D11 | Penerbitan notifikasi dijalankan dari cron menit yang sudah ada, bukan jadwal baru: tiap menit memeriksa kolom `dibuat` pada `prediksi.json`; bila berbeda dari yang tercatat, hitung peristiwa; lalu kirim satu potong antrean. | Akun Free hanya boleh 5 jadwal cron (wrangler.jsonc, src/worker.js). |
| D12 | Dibatasi 40 kiriman per menit mengikuti `MAKS_KIRIM` di `src/push.js` (batas subrequest akun Free). Antrean berupa kursor pada `pw_peristiwa`, bukan baris per penerima. | Skala di atas sekitar 2.400 perangkat per jam butuh keputusan lain (Q7). |
| D13 | Data basi tidak dikirim: bila `dibuat` lebih tua dari 36 jam, tidak ada peristiwa baru dan kejadian dicatat sebagai "dilewati, data basi". | Pola `bacaStatusBanjir` (kiriman dari data basi lebih buruk daripada tidak mengirim). |
| D14 | Jenis yang statusnya belum teruji terhadap pengamatan (angin CEX; juga jenis lain yang `vonis`-nya belum "mengalahkan baseline") tetap dikirim bila dipilih, dengan kata "prakiraan belum teruji" di isi pesan. | `data/kajian-bnpb/prediksi-besok/` dan `lapor_info.js` (label teruji). Kejujuran lebih penting daripada jumlah pesan. |
| D15 | Langganan dihapus: oleh pemilik langganan (tombol Matikan, atau dari pengaturan notifikasi sistem), otomatis saat layanan push menjawab 404 atau 410, dan otomatis bila tidak ada kunjungan 180 hari (Q6). | Pola `catatHasil` di `src/push.js` dan minimisasi data. |
| D16 | Pengerja: `warga-api` (rute, tabel, cron), `layar-peta` (halaman, manifest, service worker), pemeriksa `security-reviewer`, `guard-api`, `migrasi-idempoten`, `inp-reviewer`, `selera-angka`. Bagian §2.33 AGENTS.md ditambah di PW-00. | Peta modul AGENTS.md. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| Q1 | Prakiraan kita per kab/kota (514), sedangkan K1 menyebut "kecamatannya". Cukup langganan pilih kecamatan tetapi tingkat per kab/kota? Banjir dan longsor per kecamatan ada di `public/banjir/data/status.json`, tetapi berkas itu terakhir terbit 19 Okt 2026 (hari pertama 13 Okt) dan pembacanya menolak data lebih dari 2 hari. | **[BAWAAN SEMENTARA]** Ya. Tingkat kecamatan dipakai hanya bila berkas itu segar kembali, sebagai tambahan teks, bukan pemicu. |
| Q2 | Siapa yang berwenang atas nama BNPB mengirim peringatan ke publik? Boleh otomatis dari prakiraan sistem, atau staf Pusdalops menyetujui dulu? | **[BAWAAN SEMENTARA]** Otomatis, berlabel "Prakiraan Pantau Bencana, bukan peringatan resmi BMKG atau BNPB", sampai bagian hukum BNPB menjawab (K23 induk berlaku sama). Tombol matikan global ada di PW-07. |
| Q3 | Jenis awal yang menyala bagi pelanggan baru? | **[BAWAAN SEMENTARA]** Banjir, longsor, asap, angin semuanya menyala; angin berlabel belum teruji. |
| Q4 | Jam tenang? | **[BAWAAN SEMENTARA]** Waspada ditahan 22.00 sampai 05.00 WIB dan dikirim pagi; Siaga dan Awas tidak ditahan. |
| Q5 | Halaman luring (nomor penting, 117, laporan darurat tersimpan) dari cache service worker? | **[BAWAAN SEMENTARA]** Tidak pada rilis pertama (D2); antrean luring laporan (K37) sudah memakai penyimpanan peramban sendiri. |
| Q6 | Berapa lama langganan tanpa kunjungan dipertahankan? | **[BAWAAN SEMENTARA]** 180 hari, lalu dihapus dengan satu pemberitahuan terakhir tidak dikirim (langsung dihapus). |
| Q7 | Perkiraan jumlah pelanggan dalam setahun, dan siapa yang membayar bila akun Free tidak cukup (antrean Cloudflare, plan berbayar)? | **[BAWAAN SEMENTARA]** Batas 5.000 langganan aktif sampai pemilik memutuskan; langganan ke-5.001 ditolak dengan pesan sopan. |
| Q8 | Sumber resmi titik evakuasi per kab/kota (BPBD)? Boleh register `titik_pengungsian` yang diisi BPBD ditampilkan ke publik? | **[BAWAAN SEMENTARA]** Hanya titik yang BPBD tandai `publik` (kolom baru PW-01); selain itu OSM berlabel perkiraan. |
| Q9 | Batas kecamatan per perangkat. | **[BAWAAN SEMENTARA]** 3. |
| Q10 | Perlu pesan penurunan tingkat? | **[BAWAAN SEMENTARA]** Tidak ada. Kartu di dalam aplikasi tetap menampilkan tingkat terbaru. |
| Q11 | Pakai ulang pasangan kunci VAPID `push.js` milik instansi atau buat baru untuk warga? Apakah secret `VAPID_PRIVAT` sudah terpasang di produksi? (Tidak dapat dicek dari repo.) | **[BAWAAN SEMENTARA]** Pasangan baru, `VAPID_PUBLIK_WARGA` dan `VAPID_PRIVAT_WARGA`, agar pencabutan satu tidak memutus yang lain. Dibuat pemilik dengan `node scripts/bnpb/vapid.mjs`. |
| Q12 | Perlu Turnstile pada pendaftaran langganan? | **[BAWAAN SEMENTARA]** Tidak; cukup header `x-pb: 1`, batas laju per IP, dan batas per kecamatan. |
| Q13 | Peringatan dini cuaca resmi BMKG diteruskan sebagai jenis terpisah? | **[BAWAAN SEMENTARA]** Tidak pada rilis pertama; BMKG dan prakiraan kita tetap terpisah (K6 Tangga). |
| Q14 | Tur beranda (K82) perlu langkah baru "Pasang di HP dan nyalakan peringatan"? | **[BAWAAN SEMENTARA]** Tidak; kartu Pasang tampil sendiri dan gelembung SIGAP menambah satu pesan bergilir. |
| Q15 | Bahasa isi notifikasi. | **[BAWAAN SEMENTARA]** Indonesia dan Inggris; bahasa daerah (K58) memakai Indonesia sampai kamus pesan peringatan ditinjau. |
| Q16 | Teks "janji di paparan" tidak ada di repo. Mohon kalimat atau slide yang dijanjikan, supaya cakupan tidak kurang dari janji. | **[BAWAAN SEMENTARA]** Mengikuti kalimat K1. |
| Q17 | Uji iPhone: push iOS hanya jalan dari aplikasi yang sudah ditambahkan ke Layar Utama dan lewat HTTPS, jadi tidak bisa diuji penuh di `http://localhost:8800`. Boleh uji terbatas di produksi dengan satu perangkat pemilik? | **[BAWAAN SEMENTARA]** Ya, di balik bendera `PW_UJI` yang membatasi pengiriman ke langganan bertanda uji. |

## Fase

| Fase | Isi | Syarat |
| --- | --- | --- |
| F0 | Dokumen ini, agent, tiket PW-00 | pemilik menerima paket |
| F1 | Pasang (manifest, service worker, tombol, panduan iPhone) tanpa notifikasi | PW-03 sampai PW-05 |
| F2 | Langganan dan kirim ke perangkat uji saja | PW-01, PW-02, PW-06 sampai PW-09, Q11, Q17 |
| F3 | Terbuka untuk publik | jawaban Q2, Q7, Q8 dan tinjauan hukum BNPB |

## Jawaban pemilik 21 Nov 2026

Pemilik: "Gas semua". Semua bawaan sementara pada pertanyaan terbuka di berkas ini diterima sebagai keputusan pemilik per 21 Nov 2026, kecuali butir yang menurut TIKET memerlukan berkas atau tindakan dari pemilik sendiri (lambang BNPB resolusi tinggi, kunci VAPID sebagai secret Worker, penerapan migrasi D1 produksi, tinjauan hukum kebijakan privasi); butir itu tetap menunggu pemilik.

Satu service worker dan satu manifest untuk `/lapor`: paket `pwa-peringatan` (PW-03, PW-04) dan `lapor-luring` (LR-03) memakai satu berkas service worker dan satu `manifest.webmanifest` bersama, dibangun sekali di PW-03 dan PW-04 lalu diperluas oleh LR-03. Tidak ada service worker kedua untuk lingkup yang sama.
