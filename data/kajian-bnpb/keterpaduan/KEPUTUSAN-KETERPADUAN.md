# KEPUTUSAN-KETERPADUAN: Sistem yang terpadu dan input lapangan yang satu

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Repo menyimpan satu hal yang sama dalam banyak salinan (ukur 15 Nov 2026, rinci di `RISET.md`):

- Buku Besar Kejadian (`sk_kejadian`, nomor `KJ-`) sudah ada, tetapi selain `/siklus` hanya `src/hak.js` yang menyentuhnya. `tugas_api`, `logbook_kejadian`, `sippa_tugas`, `lp_tugas`, `gempa_kejadian`, `lapsus_kejadian`, `op_isian_kejadian`, `pantau_tugas`, dan `dl_tindak` tidak punya tautan ke kejadian mana pun.
- Enam antrean luring IndexedDB terpisah dengan aturan coba ulang, kunci ganda, dan perlakuan foto yang berbeda.
- Spek formulir ditulis per modul dengan nama tipe dan kunci pilihan yang berbeda (`meja_spek`, `pipa/formulir.js`, `uji_pilot_spek`, `pendataan_spek`), dan sebagian validasi hanya ada di satu sisi.
- Titik pengungsian tidak punya kode tetap: dikenali dari teks `nama_tempat` per hari, tanpa koordinat, tanpa tautan kejadian.
- Orang yang sama bisa tercatat di `staf`, `instansi_akun`, `pdt_akun`, `km_akun`, dan `orang` tanpa penghubung. Nomor WA dinormalkan oleh tiga fungsi berbeda.

## Keputusan pemilik (15 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Satu Nomor Kejadian untuk semua modul (benchmark IRWIN dan GLIDE): **"Gas"**. |
| K2 | Satu pintu WA masuk: **"jangan"**. Penerima WA tiap modul tetap seperti sekarang. Paket ini tidak membuat router WA bersama. |
| K3 | Satu antrean luring bersama: **"gas"**. |
| K4 | Formulir lapangan dari satu definisi (benchmark ODK/KoboToolbox): **"gas"**. |
| K5 | Kaji titik pengungsian per putaran (benchmark IOM DTM): **"gas"**. |
| K6 | Satu orang, satu catatan: **"gas"**. Bukan soal login; soal jejak per orang. |
| K7 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Tautan modul lama ke kejadian disimpan di `sk_kejadian_sumber` (`sumber` = nama modul, `kode` = id baris modul), bukan kolom baru di tiap tabel lama. | Satu tempat kebenaran seperti IRWIN; pencocok, antrean tinjau ambigu, dan penggabungan alias yang sudah ada langsung terpakai; tidak perlu delapan migrasi tabel produksi. |
| D2 | Tabel BARU yang lahir sesudah paket ini membawa kolom `kejadian_id` langsung (FK ke `sk_kejadian`). | Lahir terpadu; tidak menambah utang. |
| D3 | Pencocokan tetap di `scripts/siklus/pasang.py` (aturan sama: jenis, kab4, jendela 3 hari). Worker menyajikan baris modul lewat rute ingest baru `GET /api/siklus/ingest/modul` dengan kontrak yang sama dengan rute ingest lama (`dari`, `sampai`, `lanjut`, Bearer `PIPA_TOKEN`), dan menerima keputusan lewat `POST /api/siklus/ingest/kejadian` yang sudah ada. | Satu mesin pencocok, tidak ada salinan aturan di JS. |
| D4 | Nomor GLIDE disimpan sebagai `sk_kejadian_sumber` dengan `sumber = 'glide'`. | Pola ini sudah dipakai data contoh; tanpa migrasi. |
| D5 | Satu antrean `public/inti/antre.js` (skrip klasik dengan global `window.Antre` seperti `public/bnpb/antre.js`, supaya halaman klasik dan modul ES sama-sama bisa memakainya), satu basis data `pb-antre` dengan satu saluran per modul. Aturan gabungan: `klien_id` wajib, mundur eksponensial 60 detik sampai 30 menit dengan jitter 20 persen, unggah foto dua tahap, butir ditolak ditahan sampai dibuang pengguna, satu penanda "belum terkirim" per halaman. | Mengambil perilaku terbaik dari enam antrean yang ada (rinci di `ALGORITMA.md`). |
| D6 | Antrean lama dipindah satu per satu; tiap halaman menguras basis data lamanya dulu sebelum basis data lama dihapus. Urutan: siklus, bnpb, pipa, lacak, instansi, petugas. | Tidak ada butir petugas yang hilang saat pindah; yang paling sederhana duluan. |
| D7 | Satu format spek `public/inti/spek.js` yang dimuat Worker dan peramban (pola `pipa/formulir.js` yang sudah diimpor `src/sippa.js`). Spek lama diubah lewat adapter, lalu dipindah satu per satu. | Validasi sama di dua sisi; form web, form luring, templat Excel, dan ekspor dari satu definisi. |
| D8 | Tidak membuat alur tanya-jawab WA dari spek. | K2. |
| D9 | Register `titik_pengungsian` baru dengan kode tetap `TP-` dan koordinat; isian meja pengungsi menyimpan `titik_id`; `pendataan_ke` yang sudah ada menjadi nomor putaran. | Kaji per titik per putaran bisa dibandingkan; rekap kab tetap jalan. |
| D10 | `orang` menjadi register orang. Pasangan akun ke orang disimpan di tabel samping `orang_akun (tabel, akun_id, orang_id)`; tabel akun produksi tidak diubah (pola tabel samping 1:1 migrasi 0041 dan 0047). Pencocokan otomatis hanya NIP baku 18 digit sama persis lalu WA sama persis; tidak pernah dari nama. Bentrok dan NIP tidak baku masuk daftar tinjau admin. | Menggabung dua orang berbeda lebih mahal daripada membiarkan dua catatan; ALTER pada tabel akun tidak idempoten. |
| D11 | Satu fungsi normal nomor WA (`normalWA` di `src/worker.js`) menggantikan `normalWa` (`src/kontak.js`) dan `normalNo` (`src/wa.js`). | Pencocokan D10 butuh satu bentuk nomor. |
| D12 | Cara masuk (login) tiap peran tidak diubah oleh paket ini. | K6. |
| D13 | Nomor migrasi diambil saat tiket dikerjakan, sesudah paket `paritas-bencana` yang sudah memesan 0130 dan 0131. Dokumen ini menyebut migrasi dengan nama, bukan nomor. | Menghindari bentrok nomor antarpaket. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Siapa yang meminta nomor GLIDE ke ADRC untuk kejadian besar? | **[BAWAAN SEMENTARA]** sistem hanya mencatat GLIDE yang diisi staf; tidak meminta sendiri. | tidak menahan |
| Q2 | Jejak kerja per orang (absen, laporan, isian meja) boleh dilihat siapa? | **[BAWAAN SEMENTARA]** orangnya sendiri dan admin; pimpinan hanya angka agregat. | KP-24 |
| Q3 | Akun pemirsa ikut dipetakan ke `orang`? | **[BAWAAN SEMENTARA]** tidak; pemirsa tidak menyimpan WA atau NIP. | tidak menahan |
| Q4 | Siapa yang boleh membuat titik pengungsian baru? | **[BAWAAN SEMENTARA]** petugas kab lewat meja kerja dan staf pusat; titik ganda dalam radius 200 m ditanyakan dulu. | KP-19 |
| Q5 | Putaran kaji pengungsian wajib tiap berapa hari? | **[BAWAAN SEMENTARA]** tidak dipaksa; layar menandai titik yang putaran terakhirnya lebih dari 3 hari, dan putaran pertama ditargetkan 72 jam sesudah kejadian (IOM DTM). | tidak menahan |
| Q6 | Berapa lama butir antrean luring ditahan di ponsel? | **[BAWAAN SEMENTARA]** 14 hari, kecuali absen wajah 36 jam (umur nonce yang sudah ada). | tidak menahan |
| Q7 | Modul tanpa wilayah (`op_isian_kejadian`, `pantau_tugas`, `tugas_bencana`) ikut ditautkan? | **[BAWAAN SEMENTARA]** `tugas_bencana` ikut lewat `tugas_api`; dua lainnya ditunda sampai ada wilayah. | tidak menahan |

Migrasi baru di paket ini (`titik_pengungsian`, `meja_pengungsi_titik`, `orang_akun`, `orang_tinjau`, `indeks_kursor_modul`) harus diterapkan pemilik di D1 produksi; tanpa migrasi, rute menjawab 503 dan layar tetap tampil tanpa nomor kejadian.
