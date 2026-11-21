# RISET: Lapor tanpa sinyal

Tiga bagian: apa yang sudah ada di repo (diukur 21 Nov 2026), fakta platform dengan sumber, dan opsi rancangan. Fakta yang tidak bisa diperiksa dari sumber dicatat sebagai pertanyaan, bukan dianggap benar.

## 1. Yang sudah ada di repo

| Hal | Temuan | Berkas |
| --- | --- | --- |
| Antrean bersama | IndexedDB `pb-antre`, store `butir` dan `blob`. Terlama dulu per saluran, satu proses sekaligus; 0, 408, 429, dan 5xx berhenti dan mundur 60 detik x 2^(n-1) sampai 30 menit plus minus 20 persen; 401 atau 403 berhenti dan butir tetap; 4xx lain = ditolak dan ditahan. Pemicu: kejadian `online`, tab terlihat, ketukan 30 sampai 60 detik. Menolak data berkunci rahasia. Masa simpan bawaan 14 hari. Jatuh ke localStorage (teks saja, blob hilang) bila IndexedDB gagal. | `public/inti/antre.js` |
| Pita belum terkirim | `PbAntre.pasangPita(el)` menampilkan jumlah, tombol kirim sekarang, dan daftar dengan tombol buang. Kolom "Isi" = tiga nilai teks pertama dari `data` (`ringkas`), jadi urutan kunci `data` menentukan apa yang tampil. | `public/inti/antre.js` |
| Saluran video | `salVideo = PbAntre.saluran("lapor-video", ...)` dengan pengunggah bersambung (`media.unggah`) dan 24 jam umur butir. Satu-satunya pemakai antre.js di `/lapor`. | `public/lapor/lapor.js` baris 881 |
| Kamera dan umur foto | `bukanKamera(f)`: EXIF harus punya Make/Model kamera; waktu EXIF dan `lastModified` paling lama 5 menit; `SEGAR_MS = 5 * 60e3`. Worker menolak foto web yang EXIF-nya `kamera === false`. | `public/lapor/lapor.js` baris 809, `src/lapor_ai.js` baris 463 |
| Pengiriman foto | `POST /api/lapor/foto` hanya diterima bila sesi berstatus `foto` (urutan chat). Peramban mengecilkan foto dan membaca EXIF lebih dulu, lalu mengirim `{gps, exif}` terpisah karena kanvas membuang EXIF. GPS dianggap sah bila umurnya paling lama 10 menit lawan waktu server. | `src/lapor_ai.js` baris 435 sampai 470 |
| Lapor darurat | Alur K68 di mesin: lokasi tanpa RT/RW, jenis, korban (ya, tidak, belum tahu), foto opsional, ringkasan, kirim. | `src/lapor_mesin.js` baris 439 dan 543 |
| Identitas web | Server menerbitkan kuki perangkat (`kukiPerangkat`) dan sesi; tanpa itu `/api/lapor/*` menjawab 401. Nomor WA tersimpan di localStorage `lapor-wa`. | `src/lapor_ai.js` baris 44 sampai 56, `public/lapor/lapor.js` baris 1523 |
| Service worker | Tidak ada untuk `/lapor`. Ada `public/sw-lapangan.js` (cangkang, API network-first, versi, peta luring) dan `public/sw-instansi.js` (hanya push). `public/petugas/sw.js` didaftarkan oleh `public/petugas/app.js`. | `public/` |
| Server lokal | `scripts/lapor/lokal.mjs` menyalin rute Worker untuk tinjau di `http://localhost:8800/lapor/` dan harus tetap sejalan. | `scripts/lapor/lokal.mjs` |
| Ukuran halaman | `lapor.js` 163 KB, `lapor.css` 188 KB, `index.html` 37 KB, `edukasi.json` 46 KB. Cangkang luring harus memuat semuanya. | `public/lapor/` |
| CSP | `worker-src 'self' blob: https://cdnjs.cloudflare.com`; service worker dari asal sendiri diizinkan. | `public/_headers` |

## 2. Fakta platform

| Fakta | Sumber | Status |
| --- | --- | --- |
| Background Sync (`SyncManager`) tersedia di Chrome Android sejak versi 49 dan tidak ada di Safari iOS (semua versi sampai 26.5 dilaporkan tidak didukung) dan Firefox. Pengembang diminta mendeteksi fitur dan menyiapkan cadangan: kirim ulang saat halaman dibuka. | https://caniuse.com/wf-background-sync ; https://web-platform-dx.github.io/web-features-explorer/features/background-sync ; https://developer.apple.com/forums/thread/694805 | Terverifikasi dari ringkasan pencarian 21 Nov 2026; halaman asli belum dibuka penuh |
| `navigator.onLine === false` dapat dipercaya sebagai tanpa jaringan, tetapi `true` hanya berarti ada sambungan (misalnya Wi-Fi tanpa internet). Pengiriman harus berhasil lewat permintaan sungguhan; antre.js sudah menganggap kegagalan fetch sebagai `s = 0` dan mundur. | https://developer.mozilla.org/docs/Web/API/Navigator/onLine | Terverifikasi |
| WebKit: kuota total penyimpanan mencakup semua asal; bila habis penulisan gagal dengan `QuotaExceededError` dan data bisa dibuang. Aplikasi web layar utama punya kuota asal yang sama dengan Safari. Penyimpanan bertahan (`navigator.storage.persist`) diberikan menurut heuristik, antara lain apakah dibuka sebagai aplikasi layar utama. | https://webkit.org/blog/14403/updates-to-storage-policy/ (lewat hasil pencarian) | Sebagian; kutipan angka kuota belum dibaca langsung |
| Safari membuang seluruh penyimpanan situs yang tidak diinteraksikan setelah tujuh hari pemakaian Safari; aturan itu tidak berlaku untuk web app yang dipasang ke layar utama, yang punya penghitung hari pakai sendiri. | https://web.dev/articles/storage-for-the-web ; https://developer.apple.com/forums/thread/710157 | Sebagian; ada laporan galat di WebKit Bugzilla 237350 tentang kuki layar utama. Uji di perangkat nyata (Q uji) |
| Firefox menghitung kuota per asal dan membuang seluruh asal (LRU) bila disk menipis; batas grup dilaporkan 20 persen dari batas global. | https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | Sebagian, angka dari rujukan sekunder |
| Chrome: angka kuota per asal (sering disebut 60 persen disk). | tidak ditemukan sumber yang bisa dikutip | **Tidak terverifikasi.** Rancangan tidak bergantung pada angka itu: batas sendiri 20 MB (Q9) dan `navigator.storage.estimate()` diperiksa saat menyimpan. |
| GPS perangkat bekerja tanpa paket data (chip GPS), tetapi titik pertama sesudah mati lama bisa lambat tanpa data bantuan. | tidak ada sumber yang diperiksa | **Tidak terverifikasi.** Wajib diuji di perangkat nyata mode pesawat (RENCANA-UJI bagian 6). |
| Jam HP: jam HP bisa salah atau diubah pengguna; server tidak bisa memverifikasi waktu foto yang diambil saat luring. | logika dasar; dihitung di ALGORITMA 3 | Bukan fakta platform; dasar Q1 |
| Daftar kab/kota (514) dan nomor penting dapat disimpan sebagai berkas statis kecil di cangkang. | ukuran berkas diukur saat LR-04 | Belum diukur |

## 3. Pembanding praktik

Aplikasi pelaporan lapangan yang dipakai di daerah bersinyal buruk (ODK Collect, KoboToolbox, dan aplikasi kebencanaan seperti yang dirujuk paket keterpaduan) memakai pola yang sama: formulir diisi tanpa jaringan dari definisi yang sudah diunduh, jawaban disimpan lokal sebagai satu rekaman, dikirim saat tersambung, rekaman terkirim dihapus. Paket keterpaduan sudah memilih pola ini (K4 dan D7) untuk formulir petugas. Tidak ada pembanding yang diperiksa langsung untuk pelaporan oleh warga umum; hal itu tidak diklaim.

## 4. Persoalan inti: chat bergiliran tanpa server

Mesin (`src/lapor_mesin.js`) menerima satu pesan dan menjawab pertanyaan berikutnya yang dipilih server berdasarkan isian sesi, jenis, dan spek (ALGORITMA paket induk A2). Tanpa jaringan:

- Pertanyaan berikutnya tidak diketahui.
- Persetujuan data, pencocokan wilayah dari GPS (K12), dan pencarian nama tempat butuh server.
- Foto hanya diterima server ketika sesi berstatus `foto`.

## 5. Opsi dan rekomendasi

| Opsi | Isi | Untung | Rugi |
| --- | --- | --- | --- |
| A. Salinan spek di klien | Spek langkah dan pertanyaan lengkap (`lapor_spek.js`, 10 jenis, data umum dan khusus) dijalankan di HP oleh mesin klien | Pengalaman sama dengan online, laporan penuh | Dua mesin yang harus selalu sama (melanggar "mesin memegang alur"); ratusan KB spek di cangkang; pertanyaan bercabang bergantung data yang tidak tersedia luring (wilayah, kandidat kejadian); risiko isian rusak diam-diam |
| B. Formulir pendek (cermin Lapor darurat) | Satu kartu: jenis, GPS, waktu, korban, ringkasan, foto; satu butir | Sedikit kode; spek kecil dibagi dua sisi; cocok dengan keadaan darurat; Worker menerbitkan laporan lewat satu fungsi mesin; mudah diuji | Laporan awal tipis; sisanya lewat susulan |
| C. Antre pesan chat | Simpan tiap ketukan dan putar ulang saat tersambung | Tidak ada formulir baru | Tidak masuk akal: jawaban bergantung pertanyaan server; tanpa pertanyaan, jawaban tidak punya arti |
| D. Aplikasi asli atau SMS | Di luar web | Bisa tanpa data seluler | Di luar lingkup (Q10) |

**Rekomendasi: B**, dengan sisa isian lewat susulan sesudah tersambung. B melayani kejadian yang sedang berlangsung, memakai antre.js tanpa perubahan alur, dan tidak menggandakan mesin. Pertukarannya jujur: laporan luring lebih tipis daripada laporan chat, dan dicatat begitu di meja (lencana "dikirim dari luring").

## 6. Aturan foto 5 menit lawan kirim tertunda

K75 meminta foto dari kamera paling lama 5 menit. Foto luring baru terkirim menit atau jam kemudian, jadi pemeriksaan terhadap waktu kirim selalu gagal. Yang bisa dibuktikan: (1) saat memotret, jam HP lawan waktu EXIF dan `lastModified` (sudah ada di `bukanKamera`); (2) Worker, lawan `waktu_klien`; (3) kesesuaian GPS perangkat dan GPS EXIF (5 km, aturan sudah ada). Yang tidak bisa dibuktikan: kejujuran jam HP. Maka itu menjadi pertanyaan Q1, bukan keputusan diam-diam, dan hasilnya diberi lencana lebih lemah.
