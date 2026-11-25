# Referensi: kemitraan dan direktori

Bagian ini memuat referensi teknis Kemitraan Kampus, pemetaan relawan, dan direktori akademisi.

## Kemitraan Kampus

| Berkas | Peran |
| --- | --- |
| `src/kemitraan.js` | sub-router, gerbang hak `hakKm` (baris 21), tabel rute `RUTE_KEMITRAAN` (baris 84), `layaniKm` (baris 117), halaman dan CSP |
| `src/kemitraan_akun.js` | pendaftaran, masuk, sandi, kampus, anggota, perjanjian, kode BPBD |
| `src/kemitraan_masalah.js` | bank masalah, kunjungan, jawaban, koreksi |
| `src/kemitraan_hitung.js` | fungsi murni: status perjanjian, skor BPBD, token, Jaccard |
| `public/kemitraan.html`, `public/kemitraan.css`, `public/kemitraan/*.js` | layar utama, tampilan, buku, panduan, daftar, masuk |
| `public/kemitraan/konst.js` dan `scripts/kemitraan/konst.py` | konstanta bersama (harus identik) |
| `public/kemitraan/hitung.js` dan `scripts/kemitraan/pertanyaan.py` | penyusun pertanyaan (kembar, paritas diuji) |
| `public/kemitraan/peta.js`, `tests/kemitraan/peta.test.mjs` | komponen peta SVG `KM.peta` tanpa MapLibre (`public/kemitraan/peta.js:1-3`), dipakai bab Wilayah untuk peta letak kabupaten/kota (`public/kemitraan/daerah.js:248`) |
| `scripts/kemitraan/` | `kode.py`, `geo.py`, `profil_daerah.py`, `masalah.py`, `ikd.py`, `pertanyaan.py`, `korpus.py`, `teks.py`, `indeks_bm25.py`, `cocok_pakar.py`, `uji_cocok.py`, `kamus.json`, `pertanyaan.json` |

Rute API (`src/kemitraan.js:84`, `src/kemitraan_akun.js:478`, `src/kemitraan_masalah.js:401`). Pola yang dikenali hanya `:id` dan `:rid` (16 heks), `:aid` (id OpenAlex), dan `:kab4` (4 digit); selain itu 404. Pada POST, Origin diperiksa (CSRF), dan permintaan tanpa `IP_SALT` dijawab 503.

| Metode dan jalur | Hak |
| --- | --- |
| `GET /kemitraan`, `/kemitraan/masuk`, `/kemitraan/daftar`, `/kemitraan/saya`, `/kemitraan/sertifikat/:id` | halaman, terbuka |
| `GET /kemitraan/buku` | SA, ST, PM, KK (selain itu 303 ke `/kemitraan/masuk`) |
| `GET /kemitraan/panduan` | SA, ST |
| `GET /api/kemitraan/saya` | peran apa pun yang dikenali, selain itu 401 |
| `GET /api/kemitraan/publik/kampus` | publik, cache tepi 300 detik |
| `POST /api/kemitraan/daftar/kampus`, `/daftar/anggota` | publik, laju 10 per jam per IP, Turnstile bila sitekey aktif |
| `POST /api/kemitraan/masuk`, `/atur-sandi`, `/keluar` | publik atau sesi |
| `GET /api/kemitraan/kampus`, `GET /kampus/:id`, `GET /perjanjian`, `GET /perjanjian/:id` | SA, ST, PM, KK (KK hanya kampusnya sendiri) |
| `POST /api/kemitraan/kampus/:id`, `POST /kampus/:id/anggota/:rid`, `POST /perjanjian` | SA, ST, KK (KK hanya kampusnya sendiri; MoU payung hanya staf) |
| `GET /api/kemitraan/kampus/:id/surat`, `POST /bpbd-kode` | SA, ST |
| `GET /api/kemitraan/masalah`, `/masalah/:id/saran-gabung` | daftar: SA, ST, PM, dan KK (`src/kemitraan_masalah.js:65`); BP tidak boleh membaca daftar dan dijawab 403, hanya boleh mengajukan masalah kabnya lewat POST. Tampilan Masalah untuk BP di klien (`public/kemitraan/inti.js:131`) karena itu tidak akan mendapat data dari API. Saran gabung: SA dan ST (`:198`) |
| `POST /api/kemitraan/masalah` | ST, BP jenis `bpbd` untuk kabupaten/kotanya |
| `POST /api/kemitraan/masalah/ambil`, `/masalah/:id/status` | ST |
| `GET`/`POST /api/kemitraan/kunjungan`, `POST /kunjungan/:id/status` | GET: SA, ST, PM, BP (`src/kemitraan_masalah.js:243`; BP hanya kunjungan yang timnya memuat kodenya); POST kunjungan dan status: SA dan ST (`:213`, `:259`) |
| `POST /api/kemitraan/kunjungan/:id/jawaban` | ST atau BP anggota tim kunjungan itu |
| `GET`/`POST /api/kemitraan/koreksi` | GET: SA, ST, PM, BP (`src/kemitraan_masalah.js:384`); POST mengajukan: SA, ST, BP lewat kunjungan timnya (`:342`); `POST /koreksi/:id` memutuskan: SA dan ST (`:373`) |
| `GET /api/kemitraan/daerah/:kab4/pakar`, `POST /api/kemitraan/masalah/:id/pakar/:aid` | belum tersedia (501 bagi yang punya hak, 401 bagi tamu) |

Batas dan parameter yang tertulis di kode: sesi koordinator 12 jam, kunci 15 menit sesudah 5 kali salah, tautan atur sandi 72 jam, surat tugas paling besar 2 MB, berkas perjanjian paling besar 5 MB, tim kunjungan berlaku 14 hari, paling banyak 2000 baris per daftar. Tebakan kode salah dihitung per IP di `pemegangKode`.

Tabel D1 (migrasi `0080_km_dasar.sql` sampai `0084_km_talenta.sql`, dan `0085_staf_peran_kemitraan.sql` untuk peran staf):

- `0080`: `km_kampus`, `km_akun`, `km_sesi`, `km_anggota`, `km_perjanjian`, `km_bpbd_kode`, `km_jejak`, `km_pl_kode`, `km_pengingat`.
- `0081`: `km_masalah`, `km_masalah_pakar`, `km_kunjungan`, `km_jawaban`, `km_koreksi`.
- `0082`: `km_donor`, `km_panggilan_donor`, `km_proposal`, `km_konsorsium`, `km_hibah_panggilan`, `km_hibah_proposal`, `km_telaah`, `km_inovasi`, `km_agenda_sumber`.
- `0083`: `km_satgas`, `km_satgas_anggota`, `km_piket`, `km_aktivasi`, `km_panggilan`, `km_aktivasi_laporan`, `km_aktivasi_meja`, `km_sertifikat`, `km_pelajaran`.
- `0084`: `km_magang`, `km_magang_lamar`, `km_mentor`, `km_desa`, `km_desa_catatan`, `km_dampingan`, `km_bumn`, `km_modul`.

Tabel `0082` sampai `0084` sudah ada di skema tetapi rutenya belum dibangun. Tiap perubahan menulis baris `km_jejak`. Sesuai catatan di berkas, migrasi D1 produksi diterapkan oleh pemilik.

Penyimpanan R2 (bucket media): `kemitraan/korpus/<id%64>.json`, `kemitraan/indeks_bm25/<bahaya>.json`, `kemitraan/cocok/<kode4>.json`, serta surat tugas dan berkas perjanjian dengan nama yang dibangkitkan server.

Berkas keluaran di `public/data/kemitraan/`: `kode.json`, `kode_gagal.json`, `daerah/<kode4>.json` (514), `prov/<NN>.json`, `ringkas.json`, `pertanyaan.json`, `masalah_ikd.json`, `uji_cocok.json`. Gerbang privasi memindai folder ini untuk email, nomor telepon, dan id OpenAlex.

Workflow:

- `.github/workflows/kemitraan.yml`: harian pukul 02.30 UTC (09.30 WIB), grup concurrency `data`. Langkah: kode wilayah, uji mandiri geo dan masalah, profil daerah, bank pertanyaan, jaga keutuhan keluaran, commit ke `main`. Pemanggilan `cocok_baru.py` masih tercatat sebagai TODO di berkas.
- `.github/workflows/kemitraan-pakar.yml`: bulanan tanggal 2 pukul 03.00 UTC, memuat direktori pakar dan kampus dari R2, menjalankan korpus OpenAlex, indeks BM25, pencocokan pakar, dan `uji_cocok.py --bila-ada-label`. Tersedia opsi `dry_run`.

Uji dan gerbang:

```
npm run uji:kemitraan
node --test --test-concurrency=1 tests/kemitraan/*.test.mjs tests/warga/kemitraan_*.test.mjs
python3 -I scripts/kemitraan/<skrip>.py --cek
npm run uji:layar          # termasuk tests/bnpb/kemitraan_layar.test.mjs, lebar 1440 dan 390
npm run uji:agen           # gerbang struktur, termasuk paket modul dan token warna
```

Gerbang yang menjaga kejujuran: `konst.test.mjs` (konstanta identik Python dan JS), `paritas.test.mjs` (hasil Python sama dengan JS), `gerbang-kemitraan.test.mjs` (gerbang teks dan keamanan), `gerbang-cakupan.test.mjs` dan `cakupan.json` (tiap skrip dan modul terdaftar).

## Pemetaan relawan

| Berkas | Peran |
| --- | --- |
| `scripts/pemetaan/konst.py`, `public/pemetaan/konst.js` | ambang (harus identik) |
| `scripts/pemetaan/pembanding.py` | N_pembanding, rasio, kelas |
| `scripts/pemetaan/kelengkapan.py` | klien ohsome dan keluaran agregat per kabupaten/kota |
| `scripts/pemetaan/paket.py` | paket proyek (privat) |
| `migrations/0149_pemetaan_relawan.sql` | skema `pm_proyek`, `pm_gabung`, `pm_riwayat` |
| `.github/workflows/pemetaan.yml` | bulanan tanggal 4 pukul 05.30 UTC, menulis `public/data/kemitraan/pemetaan_kelengkapan.json` lalu commit |
| `tests/kemitraan/pemetaan_*.test.mjs` | uji konstanta, pembanding, kelengkapan, paket |

Rute (`src/pemetaan.js`) dan layar (`public/kemitraan/pemetaan.js`) hanya ada di rancangan `DESAIN-TEKNIS.md` dan belum ada kodenya. Rute yang dirancang: `GET /api/kemitraan/pemetaan/prioritas` (staf), `POST .../proyek` (staf menyiapkan), `POST .../proyek/<id>/setuju` (pemilik), `POST .../proyek/<id>/tautan` (staf), `POST .../proyek/<id>/gabung` (akun kampus), `GET .../sumbangan` (staf, agregat).

Skema D1 (migrasi `0149`): `pm_proyek` (status disiapkan, disetujui, ditolak, dikirim, berjalan, selesai, ditutup; tiga kolom centang daftar penyuntingan terorganisir; tautan Tasking Manager harus berawalan `https://`), `pm_gabung` (hashtag berawalan `CentuRisk-`), dan `pm_riwayat` (append-only). Penjaga di tingkat trigger: satu kabupaten/kota hanya boleh punya satu proyek aktif (indeks unik sebagian), alur status tertentu saja, status `dikirim` ditolak bila tautan, persetujuan pemilik, dan tiga centang belum lengkap, proyek baru selalu dimulai polos pada status `disiapkan`, proyek dan riwayat tidak boleh dihapus, tautan dan centang tidak boleh dicabut sesudah dikirim. Tidak ada kolom nama atau nama pengguna OSM.

Uji: `node --test tests/kemitraan/pemetaan_*.test.mjs` dan `python3 -I scripts/pemetaan/{konst,pembanding,kelengkapan,paket}.py --cek`.

## Direktori akademisi

| Berkas | Peran |
| --- | --- |
| `public/akademisi.html`, `public/akademisi.js`, `public/akademisi.css`, `public/akademisi_tema.js` | layar |
| `src/akademisi.js` | rute dan penjaga hak (`P_AKADEMISI`, baris 12; `RUTE_AKADEMISI`, baris 393) |
| `migrations/0087_akademisi_riwayat.sql` | tabel `akademisi_riwayat` |
| `scripts/akademisi/` dan `.github/workflows/akademisi.yml`, `direktori-bulanan.yml` | panen data direktori (belum dibaca rinci untuk dokumen ini) |

Rute (`src/akademisi.js:393`), semuanya mensyaratkan staf berperan di `P_AKADEMISI` atau admin:

- `GET /api/akademisi` (berkas induk pakar), `/kampus`, `/kontak`, `/data/<nama>` (daftar `DATA_AKADEMISI`, 50 nama), `/lembaga/terdekat`, `/terdekat`, `/saya` (peran dan status Super Admin).
- `GET /api/akademisi/karya/:id` (id OpenAlex `A` + 4 sampai 12 angka), `/riset/:id` (id karya `W...`), `/sinta/:id` (rincian SINTA per id numerik, 64 pecahan R2 `akademisi/sinta/<id%64>.json`), `/gambar/:id` (gambar logo dan sampul dari R2 dengan CSP ketat untuk SVG).
- `POST /api/akademisi/ringkasan` (laju 10 per jam), `GET`/`POST /api/akademisi/koreksi` (GET hanya admin, POST laju 20 per jam, jenis `pakar`, `lembaga`, `inovasi`, `sistem_data`, `tokoh`, `dokumen`), `GET`/`POST /api/akademisi/riwayat` (laju 60 per jam), `PATCH`/`DELETE /api/akademisi/riwayat/:id` (penulis atau admin).

Kategori lembaga yang dikenali: pemerintah, kerelawanan, tanggap-ormas, donasi, jejaring, internasional, mitra-internasional, keagamaan, dunia-usaha, komunikasi, profesi, kesehatan, riset, inovasi, lsm.

Penyimpanan: R2 `akademisi/*` (induk pakar, kampus, kontak, lembaga, riset, ringkasan, koreksi, gambar, sinta). Data ini tidak ada di repositori.

Uji: `tests/warga/akademisi_peran.test.mjs` menjaga daftar peran.
