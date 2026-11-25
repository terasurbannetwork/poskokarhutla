# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas utama, rute API, tabel D1 beserta migrasi, dan jalur R2 milik modul Lapor Bencana.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `public/lapor/index.html`, `lapor.js` (1.719 baris), `lapor.css`, `maskot.js`, `ilustrasi.js` | Aplikasi `/lapor`: Beranda, obrolan, tab Laporan dan Alun-alun, panduan, terjemahan |
| `public/lapor/lacak.html`, `lacak.js`, `lacak.css` | Halaman lacak laporan bertoken |
| `public/lapor/meja.html`, `meja.js`, `meja.css` | Meja monitoring staf dan BPBD |
| `public/lapor/poster.html`, `poster.js`, `poster.css`, `kontak.js` | Pembuat poster QR desa dan pemilih nomor BPBD |
| `public/lapor/luring.js`, `public/inti/antre.js` | Lapor tanpa sinyal dan antrean luring bersama |
| `public/lapor/peringatan.js`, `public/sw-lapor.js`, `public/lapor/manifest.webmanifest`, `public/lapor/ikon/` | Pasang aplikasi, langganan peringatan, service worker, manifest |
| `public/lapor/edukasi.json`, `public/lapor/tr/*.json` | Butir edukasi dan kamus terjemahan |
| `src/lapor_ai.js` (1.241 baris) | Seluruh rute `/api/lapor/*`, batas laju, identitas dan ikatan perangkat, gugus untuk Alun-alun, rute meja |
| `src/lapor_mesin.js`, `src/lapor_spek.js`, `src/lapor_model.js`, `src/samarkan.js` | Mesin percakapan, spek isian, gerbang model, penyamaran teks |
| `src/lapor_wilayah.js`, `src/lapor_info.js`, `src/lapor_kontak.js`, `src/lapor_jalan.js`, `src/lapor_besok.js` | Wilayah dari titik, info daerah, nomor BPBD, ruas jalan rusak untuk peta meja, pembaca tingkat prakiraan |
| `src/lapor_tampil.js`, `src/lapor_gugus.js`, `src/lapor_kejadian.js`, `src/lapor_periksa.js`, `src/lapor_meja_hak.js`, `src/lapor_agregat.js`, `src/lapor_bahasa.js` | Format tampilan dan status, gugus, verifikasi dan kartu publik, pengecekan lapangan, hak meja, agregat, terjemahan |
| `src/lapor_lanjut.js`, `src/lapor_lanjut_spek.js`, `src/lapor_lanjut_mesin.js`, `src/lapor_lanjut_meja.js` | Data lanjutan BPBD |
| `src/pw_inti.js`, `src/pw_peringatan.js`, `src/push.js` | Peringatan dini PWA dan Web Push |
| `src/hak.js` | Semua SQL dan matriks hak tabel (bagian peran akses `lp_*`, `lj_*`, `pw_*`) |
| `scripts/lapor/lokal.mjs` | Server lokal pengganti Worker untuk tinjauan (`/api/lapor/*` dijawab mesin lokal, data di luar repo) |
| `scripts/lapor/dokumen.py`, `scripts/wa/lapor_pdf.mjs` | Perakit dokumen Word dan PDF dan penarik antreannya |
| `scripts/wa/lapor_wa.mjs` | Jembatan WhatsApp: daftar izin, teks, lokasi, foto ke Worker, balasan, tarikan kabar |
| `scripts/lapor/tr_kumpul.mjs`, `tr_buat.mjs` | Pembuat kamus terjemahan |

## Rute API

Seluruh rute `/api/lapor/*` didaftarkan di `src/lapor_ai.js:1200` dan dibungkus penjaga yang menolak (503) bila rahasia sesi server belum terpasang. Header `x-pb: 1` wajib pada permintaan tulis dari web.

| Metode dan jalur | Hak | Fungsi |
| --- | --- | --- |
| `POST /api/lapor/pesan` | pelapor (nomor ketikan terikat perangkat, sesi `/masuk`, atau kunci mesin WA) | Satu putaran percakapan |
| `POST /api/lapor/foto` | pelapor | Unggah foto (JPEG, metadata dibuang) |
| `POST/PUT/GET /api/lapor/unggah/...` | pelapor | Unggah video bersambung (mulai, bagian, selesai, status) |
| `GET /api/lapor/foto/:id` | token laporan atau staf | Berkas foto atau video |
| `POST /api/lapor/susulan` | pelapor | Mulai Tambah kabar |
| `POST /api/lapor/darurat/cepat` | pelapor | Darurat sekali ketuk |
| `GET /api/lapor/sesi`, `/cari`, `/sekitar`, `/kotak` | pelapor | Sesi aktif, cari wilayah, tempat sekitar, kabar untuk web |
| `GET /api/lapor/penting`, `/daerah`, `/rapor` | publik | Nomor penting, prakiraan daerah, rapor |
| `POST /api/lapor/nilai` | pelapor | Nilai 1 sampai 5 atas laporan |
| `POST /api/lapor/terjemah`, `GET /api/lapor/bahasa` | publik, batas laju | Terjemahan antarmuka, daftar bahasa |
| `GET /api/lapor/lacak`, `GET /api/lapor/unduh/:berkas` | token lacak | Status dan dokumen laporan |
| `GET /api/lapor/alun` | publik, cache 60 detik | Alun-alun |
| `GET /api/lapor/hari-ini` | publik bila `LAPOR_HARI_INI=1` | Kartu kejadian terverifikasi |
| `GET /api/lapor/bukti/:id` | token atau tanda publik per foto | Foto penanganan petugas |
| `GET /api/lapor/agregat` | akun kampus mitra, staf, admin | Data agregat (JSON atau CSV) |
| `GET/POST /api/lapor/izin` | kunci mesin, atau admin (POST) | Daftar izin nomor dan peran |
| `GET /api/lapor/pdf/antre`, `POST /api/lapor/pdf/:x` | kunci mesin | Antrean dan unggahan dokumen |
| `GET /api/lapor/kabar`, `POST /api/lapor/kabar/:x` | kunci mesin | Antrean kabar WhatsApp (status, BPBD, tahap 2) |
| `GET /api/lapor/meja`, `GET /api/lapor/meja/:x` | staf atau sesi profil BPBD | Daftar, rekon, rincian, PIC, ruas jalan |
| `POST /api/lapor/meja/<nomor>/pic` | hanya staf BNPB; 120 per jam | Membuka nomor PIC BPBD utuh; tiap pembukaan tercatat di `lapor_akses` (`src/lapor_ai.js:1015-1022`, `1057`) |
| `POST /api/lapor/meja/<nomor>/(balas, status, lihat, bukti, bukti-publik, teruskan, lepas, periksa, tindakan, ambil)` | staf atau sesi profil BPBD menurut `bolehAksi` | Aksi atas satu laporan |
| `GET /api/lapor/respons` | staf BNPB | Waktu respons per BPBD |
| `GET /api/lapor/peringatan/(cari, kunci, arah)`, `POST .../(langganan, ubah, status, berhenti)` | publik, `x-pb: 1`, batas laju per IP | Peringatan dini |
| `POST /api/lapor/data/(masuk, objek, batal, isian, nihil, tim, tutup, foto)`, `GET .../(berkas, media)` | tim berkas (kuki `lapor_data`); `isian` hanya ketua | Data lanjutan BPBD |
| `GET /api/lapor/data/daftar`, `POST .../tampil`, `POST .../terima` | staf atau akun lembaga; `tampil` dan `terima` staf BNPB | Daftar berkas, tampil data pribadi, terima penutupan |

Batas laju yang tertulis di kode: pesan 20 per menit, 60 per jam, 120 per hari per nomor; 300 per jam per IP (web); 120 per jam per perangkat; 5 laporan terkirim per hari; nomor ketikan 240 per jam per IP; ikatan perangkat baru 20 per jam per IP; Alun-alun dan halaman hari ini 120 per jam per IP; meja 600 baca per jam per profil; langganan peringatan 10 per jam per IP.

## Tabel D1 dan migrasi

| Migrasi | Tabel |
| --- | --- |
| `0155_lapor_ai.sql` | `lapor_pelapor`, `lapor_izin`, `lapor_sesi`, `lapor_pesan`, `lapor_foto`, `lapor_tiket`, `lapor_tiket_riwayat`, `lapor_balasan`, `lapor_kabar`, `lapor_urut`, `lapor_pdf` |
| `0156_lapor_versi.sql` | `lapor_versi` |
| `0157_lapor_lanjut.sql` | `lapor_bukti`, `lapor_akses`, `lapor_unduh`, `lapor_kabar_bpbd` |
| `0158_lapor_unggah.sql` | `lapor_unggah` |
| `0159_lapor_perangkat.sql` | `lapor_perangkat`, `lapor_milik` |
| `0160_lapor_kelompok.sql` | `lapor_kelompok`, `lapor_kelompok_urut` |
| `0161_lapor_data.sql`, `0165_lj_sesi.sql` | `lj_berkas`, `lj_tim`, `lj_objek`, `lj_jejak`, `lj_media`, `lj_tanya`, `lj_kabar`, `lj_beku`, `lj_akses`, sesi percakapan tahap 2 |
| `0162_lapor_periksa.sql` | `lapor_periksa`, `lapor_tindakan` (append-only) |
| `0163_pw_peringatan.sql` | `pw_langganan`, `pw_status`, `pw_peristiwa`, `pw_kendali` |
| `0167_lapor_ambil.sql` | `lapor_ambil` (penanganan oleh profil BPBD) |
| `0169_lk_periksa_akun.sql` | `lk_periksa_akun` (jenis dan wilayah akun pemeriksa) |
| `0170_lk_tarik_usulan.sql` | `lk_tarik`, `lk_usulan` (belum ada rute pemakainya) |

Tabel lama yang masih dipakai bersama: `laporan` dan turunannya (laporan warga di peta publik, migrasi 0001 dan seterusnya), `push_langganan` (instansi, terpisah dari `pw_langganan`). Matriks hak tiap tabel ada di `src/hak.js` (contoh `lapor_periksa` di baris 1776).

## R2 (binding `MEDIA`)

- `lapor/foto/<id>.jpg` dan `.vid` (foto dan video laporan)
- `lapor/dok/<nomor>.<versi>.<pdf|docx>` (dokumen)
- `lapor/bukti/<id>.jpg` (foto penanganan petugas)
- `lapor/data/<berkas>/<objek>/<id>.jpg`, `lapor/data/<berkas>/wajah/<id>.jpg`, `lapor/data/<berkas>/draf/<id>.jpg` (data lanjutan, data pribadi di balik sesi)
