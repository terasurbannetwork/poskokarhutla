# RISET: PWA dan Web Push untuk peringatan dini

Status sumber: sesi penulisan paket ini tidak punya akses jaringan (semua pengambilan URL gagal dengan ENOTFOUND). Karena itu butir "klaim luar" di bawah belum dibuka ulang dari sumbernya; ditandai **belum diverifikasi** dan diverifikasi di tiket PW-02 sebelum ada baris kode yang bergantung padanya. Butir "bukti repo" dibaca langsung dari kode dan berlaku.

## 1. Yang sudah ada di repo (bukti repo)

| Butir | Temuan | Berkas |
| --- | --- | --- |
| Manifest dan service worker untuk `/lapor` | Tidak ada. `public/lapor/index.html` hanya punya `theme-color` dan `apple-touch-icon` (PNG 160 x 160). | `public/lapor/index.html` |
| Manifest dan service worker lain | Ada untuk `/instansi` (`public/instansi.webmanifest`, `public/sw-instansi.js`, scope `/instansi`, ikon SVG) dan `public/sw-lapangan.js`. Tidak ada pencarian `serviceWorker` atau `manifest` di `public/lapor`. | `public/` |
| Web Push di Worker | Ada, tanpa pustaka: VAPID ES256 (RFC 8292), enkripsi `aes128gcm` (RFC 8291) dengan WebCrypto, daftar host layanan push yang diizinkan (FCM, Mozilla, `*.push.apple.com`, `*.notify.windows.com`), penghapusan langganan saat 404 atau 410, batas 40 kiriman per invokasi. Fitur mati rapi bila kunci tidak terpasang (`siapPush`). | `src/push.js`, `migrations/0040_push.sql` |
| Pembuat kunci VAPID | `scripts/bnpb/vapid.mjs`. | `src/push.js` komentar kepala |
| Cron | Satu jadwal `* * * * *`; tugas lain dipilih dari `scheduledTime` di `scheduled()`. Akun Free dibatasi 5 jadwal cron untuk semua worker. | `wrangler.jsonc`, `src/worker.js` |
| Binding | D1 `DB`, R2 `MEDIA`, Workers AI `AI`, aset statis `ASSETS`. Tidak ada KV dan tidak ada Queues. | `wrangler.jsonc` |
| Prakiraan | `public/prediksi/data/prediksi.json`: `kab` berisi 514 kab/kota dengan kunci `HJN`, `BNJ`, `LSR`, `API`, `ASP`, `CEX` per hari; `kode.<K>.kol` memberi nama kolom; `waspada` 70 baris aturan dampak; `dibuat` bertanggal 21 Nov 2026. Kodenya bukan kecamatan. Tingkat: Normal 0, Waspada 1, Siaga 2, Awas 3. | `public/prediksi/besok_inti.js`, `src/lapor_info.js` |
| Status per kecamatan | `public/banjir/data/status.json` punya 986 kecamatan dengan `b` (banjir) dan `l` (longsor), tetapi hari ke-0 adalah 13 Okt 2026 dan terakhir di-commit 19 Okt 2026, jadi `bacaStatusBanjir` menolaknya. | `src/status_banjir.js` |
| Titik berkumpul | OSM lokal per provinsi: `titik_kumpul`, `sekolah`, `pemerintahan`, `puskesmas`, `rs`, `klinik`, `polisi`, `damkar`; rumah ibadah di `ibadah/<prov>.json`. Banyak `titik_kumpul` bernama kosong. Pengambil "tempat sekitar" sudah ada di `src/lapor_info.js` (`sekitar`, radius 5 km, tambahan Overpass). | `public/data/osm_nasional/`, `src/lapor_info.js` |
| Register titik pengungsian | `titik_pengungsian` (`TP-`, migrasi 0134) dirancang di paket lapor-lanjutan D6; pengisi: BPBD. | `data/kajian-bnpb/lapor-lanjutan/KEPUTUSAN-LANJUTAN.md` |
| Pemicu "data baru" | Pola membuat tugas sekali per versi berkas (`tugasBaruDariBerkas`) dan penjaga data basi (`bacaStatusBanjir`). | `src/worker.js`, `src/status_banjir.js` |

## 2. Klaim luar (belum diverifikasi di sesi ini)

| No | Klaim | Sumber untuk diperiksa | Status |
| --- | --- | --- | --- |
| R1 | Web Push di iPhone dan iPad ada sejak iOS dan iPadOS 16.4 dan hanya untuk web app yang sudah ditambahkan ke Layar Utama; izin notifikasi diminta lewat ketukan pengguna dari web app itu. Notifikasi harus terlihat pengguna (tanpa push senyap). | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ | belum diverifikasi |
| R2 | Push API butuh secure context (HTTPS atau localhost), service worker, dan `userVisibleOnly: true` pada `pushManager.subscribe`. | https://developer.mozilla.org/en-US/docs/Web/API/Push_API | belum diverifikasi |
| R3 | Protokol Web Push (RFC 8030), enkripsi isi (RFC 8291), dan identifikasi server aplikasi VAPID (RFC 8292: klaim `aud`, `exp` paling lama 24 jam, `sub`). Kode di `src/push.js` memakai `exp` 12 jam, selaras. | https://www.rfc-editor.org/rfc/rfc8030, rfc8291, rfc8292 | belum diverifikasi (kodenya sudah berjalan untuk akun instansi, tetapi pengiriman ke Apple belum dibuktikan di repo) |
| R4 | Chrome di Android menembakkan `beforeinstallprompt` bila manifest memenuhi syarat pasang (nama, ikon 192 dan 512, `start_url`, `display` standalone); iOS Safari tidak punya peristiwa itu, pemasangan lewat menu Bagikan, Tambah ke Layar Utama. | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable | belum diverifikasi |
| R5 | Batas Workers akun Free (subrequest per invokasi, waktu CPU, jumlah cron). Repo mencatat 5 jadwal cron (`wrangler.jsonc`) dan memakai 40 kiriman per invokasi (`push.js`); angka resmi perlu dicocokkan. | https://developers.cloudflare.com/workers/platform/limits/ | belum diverifikasi |
| R6 | Iklan pemasangan iOS di dalam peramban lain (Chrome iOS, aplikasi bawaan media sosial) dan di Eropa dapat berbeda. | dokumentasi Apple Safari dan WebKit | belum diverifikasi; tidak dijadikan asumsi |

Pengiriman ke Apple, Google, dan Mozilla dari Worker adalah satu `fetch` POST berisi isi terenkripsi dan header `Authorization: vapid ...`; bukti bahwa Worker bisa melakukannya adalah `kirimKe` di `src/push.js`. Bahwa Apple menerima format yang sama diverifikasi di PW-02 dengan satu iPhone uji (Q17).

## 3. Praktik yang dipakai

1. Minta izin notifikasi hanya sesudah ketukan pengguna pada tombol yang menjelaskan manfaatnya; jangan memintanya saat halaman dibuka.
2. Satu notifikasi menggabung semua kabar yang terbit bersamaan, dengan `tag` supaya menggantikan yang lama.
3. Beri jalan keluar yang jelas: tombol Matikan di aplikasi, dan hapus otomatis langganan yang mati.
4. Jangan menaruh data pribadi atau lokasi presisi di isi push; push melewati server pihak ketiga (Apple, Google, Mozilla), meski terenkripsi.
5. Peringatan resmi dan prakiraan model dibedakan jelas di teks (aturan Tangga K6, K8).

## 4. Pertanyaan riset yang belum terjawab

| No | Pertanyaan | Ke mana |
| --- | --- | --- |
| P1 | Apakah ada data titik evakuasi per kecamatan dari BNPB/BPBD yang bisa dipakai (Satu Data Bencana, InaRISK, sistem BPBD)? Tidak ditemukan di repo. | Q8 |
| P2 | Apakah ada pembatas hukum menerbitkan peringatan otomatis atas nama BNPB (UU 24/2007 dan turunannya)? Tidak diteliti di sesi ini. | Q2 |
| P3 | Berapa pelanggan wajar? Tidak ada data di repo. | Q7 |
