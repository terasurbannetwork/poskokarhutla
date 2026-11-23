# DESAIN-TEKNIS: Kejadian dari Laporan Warga

Tanpa kode di paket ini. Nama berkas dan fungsi adalah rancangan; baris rujukan ke kode yang ada bisa bergeser.

## 1. Prinsip

- Pakai ulang: `hitungGugus` (`src/lapor_gugus.js:19`), `alunBuat` (`src/lapor_ai.js:915-940`), `barisAlun` (`src/lapor_tampil.js:129`), tabel `lapor_periksa` (`migrations/0162_lapor_periksa.sql`), pencocok `scripts/siklus/pasang.py`, antrean `src/siklus_kejadian.js:295`.
- Fungsi murni dulu (uji tanpa D1), baru rute (pola `src/lapor_periksa.js` dan `src/lapor_gugus.js`).
- Tabel hanya `CREATE ... IF NOT EXISTS`, tanpa trigger, tanpa `ALTER`; waktu ms epoch UTC; pemilik menerapkan ke D1 produksi (pola migrasi 0160 dan 0162).

## 2. Berkas dan pemilik (dari `node scripts/agents/ilmu.mjs pemilik <berkas>`, 21 Nov 2026)

| Berkas | Perubahan | Pemilik |
| --- | --- | --- |
| `src/lapor_gugus.js` | aturan satu desa dan batas rantai (A1) | `warga-api` |
| `src/lapor_kejadian.js` (baru) | `terverifikasiBpbd`, `kejadianPublik`, `kartuPublik`, daftar putih kolom, `usulanDari` | `warga-api` |
| `src/lapor_tampil.js` | `barisAlun` dibagi ke pembentuk bersama | `warga-api` |
| `src/lapor_ai.js` | rute `GET /api/lapor/hari-ini`, `POST /api/lapor/meja/usulkan`, `POST /api/lapor/meja/tarik`; `alunBuat` dipecah | `warga-api` |
| `src/hak.js` | SQL dan matriks hak tabel baru | `warga-api` |
| `src/worker.js` | `HTML_RUTE` dan `PUBLIK_TANPA_SESI` untuk `/lapor/hari-ini` | `warga-api` |
| `src/siklus_kejadian.js` | rute ingest modul (bila belum dibuat paket `keterpaduan`) | `warga-api` |
| `migrations/<nomor>_lapor_kejadian.sql` | tabel `lk_tarik`, `lk_usulan` | `warga-api` |
| `scripts/siklus/pasang.py` | sumber `lapor_ai`, `usulan_staf` boleh `baru` | `siklus` |
| `scripts/lapor/lokal.mjs` | server tinjau lokal: rute yang sama | `warga-api` |
| `public/lapor/hari-ini.html`, `hari-ini.js`, `kartu_publik.js` (baru) | halaman dan komponen kartu bersama Alun-alun | `layar-peta` |
| `public/lapor/lapor.js`, `meja.js`, `meja.html` | memakai `kartu_publik.js`; kartu Halaman publik dan Buku Besar di rincian | `layar-peta` |
| `tests/lapor/**`, `tests/siklus/**`, `tests/agen/**` | uji tiket | pemilik berkas uji; `penulis-gerbang` untuk gerbang |

Tidak ada agent baru (D14). Bila `ilmu.mjs pemilik` untuk berkas baru memberi hasil lain, ikuti hasilnya.

## 3. Model data (nomor migrasi diambil saat tiket, sesudah 0162)

```
lk_tarik   (id INTEGER PK, kode TEXT NOT NULL,        -- kode kejadian laporan: GL-... atau nomor tiket LA-...
            aktif INTEGER NOT NULL CHECK (aktif IN (0,1)),
            alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300),
            oleh TEXT NOT NULL, waktu INTEGER NOT NULL)
            INDEX (kode, waktu)

lk_usulan  (kode TEXT PK CHECK (kode GLOB 'LU-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*'),
            kejadian_laporan TEXT NOT NULL,           -- GL-... atau LA-...
            anggota TEXT NOT NULL,                    -- JSON daftar nomor tiket, paling banyak 200
            jenis TEXT NOT NULL, kab4 TEXT NOT NULL,
            oleh TEXT NOT NULL, waktu INTEGER NOT NULL)
            UNIQUE (kejadian_laporan) bila belum ada usulan aktif (indeks unik parsial pada baris belum ditolak)
```

Append-only: tidak ada `UPDATE` atau `DELETE` dari kode aplikasi (matriks hak: hanya `INSERT` dan `SELECT`). Pencabutan tarikan = baris baru `aktif=0`.
Tabel `lapor_periksa`, `lapor_versi`, `lapor_sesi`, `lapor_tiket` TIDAK diubah. Karena `lapor_periksa.oleh` adalah teks bebas, syarat D4 butir 2 dihitung dari akun yang tercatat di `lapor_tiket_riwayat` dan sesi akun saat pengecekan; bila ternyata tidak bisa diturunkan dengan pasti, LK-02 menambahkan kolom penanda lewat tabel samping `lk_periksa_akun (periksa_id, jenis_akun, wilayah_kode)` yang diisi di rute `periksa` yang sudah ada (perubahan kecil di `src/lapor_ai.js`, ditandai di tiket). Keputusan bentuk diambil di LK-02 dengan bukti kode, bukan di sini.

## 4. Rute

| Rute | Hak | Isi | Catatan |
| --- | --- | --- | --- |
| `GET /api/lapor/hari-ini` | publik | `{baris:[kartu], jumlah, dibuat, jendela_jam}` dengan `?prov=` dan `?jenis=` (saring seperti `alunBuat`) | cache tepi 60 detik (`cacheTepi`), batas laju per IP 120 per jam (pola `lapor.alun`), `Cache-Control: public, max-age=60`; nonaktif bila saklar mati: menjawab 404 JSON |
| `POST /api/lapor/meja/tarik` | staf BNPB dan BPBD wilayah (D95, Q18) | `{kode, aktif, alasan?}` | menulis `lk_tarik`; catat di log akses; batas laju |
| `POST /api/lapor/meja/usulkan` | staf berhak (Q11) | `{kejadian_laporan}` | memeriksa syarat A6; menulis `lk_usulan`; 409 bila sudah ada; 422 bila jenis tak terpetakan atau kab lintas |
| `GET /api/siklus/ingest/modul` (Bearer `PIPA_TOKEN`) | sistem | rekaman modul termasuk `lapor_ai` dengan `usulan_staf` | kontrak dari `keterpaduan` D3; dibuat di sini hanya bila belum ada |
| `GET /api/lapor/meja` dan rincian | sudah ada | tambah status halaman publik dan status usulan | tidak membuka kolom baru bagi publik |

Pendaftaran halaman: `/lapor/hari-ini` masuk `HTML_RUTE` dan `PUBLIK_TANPA_SESI` (`src/worker.js:751`, deretan baris `/lapor`), dengan alasan: halaman tidak memuat data, data dari `/api/lapor/hari-ini` yang berdaftar putih kolom; mengikuti pola `/lapor` (KEPUTUSAN-MASUK K14, `data/kajian-bnpb/pintu-masuk/`). Halaman `.html` langsung tetap terkunci kecuali `index` dan `lacak` (`halamanTerkunci`); `hari-ini.html` akan ditambah ke pengecualian yang sama atau dilayani lewat rute.

## 5. Daftar putih kolom publik

Satu fungsi `kartuPublik(kejadianLaporan)` membangun objek dari NOL (bukan dari baris D1 dikurangi kolom), sehingga kolom baru di tabel tidak otomatis bocor.

| Kolom publik | Sumber |
| --- | --- |
| `id` | hash 10 karakter dari id laporan paling awal kejadian (pola `alunBuat`), bukan nomor tiket |
| `jenis`, `subjenis` | ringkasan |
| `waktu` | waktu kejadian, dibulatkan ke jam bila satu pelapor (Q19) |
| `lokasi.desa`, `kec`, `kab`, `prov` | nama wilayah dari ringkasan |
| `titik.lat`, `titik.lon` | pusat desa dari register wilayah, 4 desimal (`wilayahDari(env).pusat`) |
| `nWarga` | nomor pelapor berbeda anggota terverifikasi, hanya bila 2 atau lebih |
| `verifikasi.oleh`, `verifikasi.waktu` | nama lembaga ("BPBD Kab. X") dan waktu, bukan nama petugas |
| `dampak` | rentang per isian dari anggota terverifikasi (Q6) |

Tidak keluar: nomor tiket, nomor kejadian laporan, nomor WA, nama, peran pelapor, koordinat pelapor, ketelitian, foto, video, lencana foto, teks percakapan, kronologi bebas, `catatan` pengecekan, `perubahan` revisi, nama petugas, `tempat` yang disebut pelapor, bahasa, perangkat, IP, versi, status tiket internal.

## 6. Beban dan kuota

Satu kueri berindeks (`lapor_periksa (nomor, waktu)`, indeks tiket terkirim) membatasi 24 jam. Data dasar gugus memakai kueri 30 hari yang sama dengan `alunBuat`; hindari menjalankan keduanya per permintaan: cache tepi 60 detik menjadikan paling banyak satu perhitungan per menit per colo. D1 Free 5 juta baris baca per hari (`memori d1-kuota-baca`): LK-05 menulis angka baris terbaca per permintaan di uji beban `tests/beban/` sebelum rilis.

## 7. Saklar

Variabel lingkungan `LAPOR_HARI_INI=1` (halaman publik) dan `LAPOR_USUL=1` (tombol dan rute usulan). Mati: rute 404, tombol tidak tampil, halaman tidak ditautkan. Dibaca di rute, tidak di klien.

## 8. Rilis

Tidak ada `wrangler deploy` dari subagent. Pemilik menerapkan migrasi, menyalakan saklar, dan meninjau di `http://localhost:8800/lapor/hari-ini` sebelum menyalakan produksi. Sesudah rilis: periksa `terbit.yml` hijau dan aset hidup (memori terbit-gagal).
