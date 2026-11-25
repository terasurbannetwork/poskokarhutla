# Referensi: berkas dan rute

Halaman ini mendaftar berkas utama dan rute API modul akun dan akses.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `src/masuk.js` | rute `/api/masuk/*` dasar: minta dan periksa kode, sesi akun umum, lengkapi profil, pilih akun, sandi staf, atur sandi, hapus akun, kode email, nomor pemirsa, halaman `/masuk` |
| `src/masuk_undang.js` | anggota, undangan berantai, email dinas terpetakan, peta domain, papan aktivasi, undang ulang akun BPBD |
| `src/masuk_konst.js` | seluruh ambang Pintu Masuk (gerbang G-6 menjaga agar ambang hanya di sini) |
| `src/masuk_sesi.js` | pembaca sesi akun umum tanpa SQL (menghindari impor melingkar) |
| `src/masuk_tanda.js` | tanda "cocok kontak" dan "nomor terbukti" untuk antrean tinjau akun |
| `public/masuk.html`, `public/masuk.js`, `public/masuk.css` | layar `/masuk` (CSP ketat; teks server masuk lewat `textContent`) |
| `public/admin/aktivasi.js` | papan aktivasi per BPBD: baris provinsi dan baris kabupaten atau kota; jumlahnya mengikuti daftar wilayah, tidak dikodekan di berkas ini (belum terdokumentasi di kode) |
| `src/instansi.js` | akun instansi: masuk, sandi, verifikasi, tugas api, konfirmasi, kabar, media, kontak, rute admin |
| `src/profil.js`, `src/profil_konst.js`, `src/profil_sesi.js` | profil PIC, PIN, sesi profil, log, aksi admin |
| `public/instansi.*`, `public/instansi_*.js`, `public/instansi_profil.js`, `public/admin/instansi.js` | layar `/instansi`, tab sisipan, layar profil, admin akun |
| `src/staf.js` | akun staf, peran, sesi staf, wilayah staf, izin pemirsa Pusdalops |
| `src/lapangan.js`, `src/lapangan_konst.js`, `src/lapangan_panel.js`, `src/lapangan_wa.js`, `src/lapangan_jejak.js`, `src/foto_lapangan.js` | modul petugas dan panel, konstanta dan fungsi murni, gerbang WhatsApp, jejak orang, overlay foto |
| `public/petugas/**` | layar `/petugas` (app, kamera, logbook, regu), panel, pustaka wajah dan model di `public/petugas/model/`, service worker |
| `src/logpal.js`, `public/logpal/*`, `scripts/logpal/impor.mjs` | LogPal: rute, layar, impor data asli ke SQL di luar repo |
| `src/hak.js` | satu-satunya pintu SQL untuk modul akun (fungsi `mk*`, `pf*`, matriks staf); bagian Segel belum ada |
| `src/worker.js` | pendaftaran rute (baris 611 sampai 655), `HOST_TERKUNCI` (716), `hostTerkunci` (719), `PUBLIK_TANPA_SESI` (758), `halamanTerkunci` (774), gerbang halaman (sekitar 966), cron dan `bersihSemua` |
| `src/lapor_meja_hak.js`, `src/lapor_ai.js` | hak meja `/lapor/meja` dari sesi profil BPBD |
| `src/bnpb.js` | `pemegangKode` (kode 26 heks, penghitung salah per IP), `laju` |
| `migrations/0171_segel.sql` | satu-satunya artefak segel yang sudah ada |

## Rute API

Hak: Publik = tanpa sesi tetapi berlaju; Sesi = sesi sah modul; Mod = `modOK`; Staf = `modAtauStaf` dengan peran sebutan; Super = `superOK`; Kode = header `x-kode`; Gerbang = header `x-wa-kunci`.

Pintu Masuk (`src/masuk.js:405`, `src/masuk_undang.js:408`):

| Metode dan jalur | Hak |
| --- | --- |
| `GET /masuk` | Publik (halaman) |
| `POST /api/masuk/kode` | Publik, Turnstile, `x-pb`, berlaju |
| `POST /api/masuk/periksa` | Publik, `x-pb`, berlaju |
| `GET /api/masuk/saya` | Sesi akun umum (tanpa sesi: 401, atau `{masuk: false}` bila `?lunak=1`) |
| `GET /api/masuk/saluran` | Publik (status saluran kode, tanpa data pribadi, cache tepi 15 detik) |
| `POST /api/masuk/sandi` | Sesi akun umum, sandi staf |
| `POST /api/masuk/lengkapi` | Sesi akun umum |
| `POST /api/masuk/pilih` | Sesi akun umum |
| `POST /api/masuk/sandi_baru` | Sesi akun umum, baru masuk dengan kode |
| `POST /api/masuk/hapus` | Sesi akun umum, baru masuk dengan kode |
| `POST /api/masuk/kode_email` | Publik, Turnstile, berlaju |
| `POST /api/masuk/pemirsa_wa` | Super |
| `POST /api/masuk/keluar` | Sesi |
| `GET /api/masuk/akun` | Sesi akun umum |
| `POST /api/masuk/mohon` | Sesi akun umum |
| `POST /api/masuk/domain` | Mod |
| `POST /api/masuk/email`, `POST /api/masuk/email/periksa` | Sesi akun umum |
| `GET` dan `POST /api/masuk/undang`, `POST /api/masuk/undang/cabut/:id` | pemilik nomor akun, anggota, staf wilayah, atau Mod |
| `GET /api/masuk/anggota`, `GET /api/masuk/anggota/tinjau`, `POST /api/masuk/anggota/cabut/:id`, `POST /api/masuk/anggota/putus/:id` | pemilik nomor akun, staf wilayah, Mod |
| `GET /api/masuk/aktivasi`, `POST /api/masuk/undang-ulang`, `GET /admin/aktivasi` | Staf (verifikator, pusdalops, koordalops) atau Mod |

Akun instansi (`src/instansi.js:1749`):

| Metode dan jalur | Hak |
| --- | --- |
| `GET /instansi`, `GET /instansi/data-bencana`, `GET /admin/instansi` | halaman: publik, menjaga diri, Staf verifikator atau pusdalops |
| `POST /api/instansi/masuk`, `POST /api/instansi/keluar`, `GET /api/instansi/saya`, `POST /api/instansi/gantisandi` | sesi akun instansi (masuk: publik, berlaju) |
| `POST /api/instansi/verifikasi`, `POST /api/instansi/surat`, `POST /api/instansi/kartu` | sesi akun instansi bukan BPBD, status belum_klaim, ditolak, atau menunggu |
| `GET /api/instansi/tugas`, `GET /api/instansi/tugas/:id`, `POST .../konfirmasi/:id`, `.../kabar/:id`, `.../cekulang/:id` | akun aktif, wilayah tugas dicek |
| `POST /api/instansi/media`, `GET .../media/:id`, `GET .../thumb/:id` | akun aktif |
| `GET` dan `POST /api/instansi/kontak` | akun aktif |
| `POST /api/instansi/admin/buat` | Mod (membuat akun BPBD saja, 1 sampai 200 per panggilan) |
| `GET /api/instansi/admin/akun`, `.../akun/:id`, `.../antrean`, `.../pantau`, `.../surat/:id`, `.../kartu/:id`, `.../tugas/:id`, `.../media/:id`, `.../thumb/:id`, `.../usulan` | Mod atau Staf (verifikator, pusdalops) sesuai rute; konsesi untuk `analis_konsesi` |
| `POST /api/instansi/admin/akun/:id` | Staf verifikator atau pusdalops (setuju dan tolak di wilayahnya); cabut dan reset sandi Mod |
| `POST /api/instansi/admin/selesai/:id`, `.../usulan/:id` | Mod atau Staf |
| `POST /api/instansi/admin/dummy` | Super |

Profil BPBD (`src/profil.js:307`): `GET` dan `POST /api/instansi/profil`, `POST .../profil/:id`, `.../profil/foto/:id` (POST dan GET), `.../profil/pin/:id`, `.../profil/gantipin/:id`, `.../profil/ajukan/:id`, `.../profil/keluar`, `POST /api/instansi/kirim`, `GET .../profil/log` (sesi akun pemda; log butuh sesi profil), serta `GET` dan `POST /api/instansi/admin/profil/:id`, `GET .../admin/profil/foto/:id`, `GET .../admin/log` (Staf verifikator atau pusdalops, kecuali log: Mod).

Lapangan (`src/lapangan.js:575`, `src/lapangan_panel.js:448`, `src/lapangan_wa.js:274`):

| Metode dan jalur | Hak |
| --- | --- |
| `GET /api/petugas/konst` | publik, cache 3600 detik, hanya konstanta layar |
| `GET /api/petugas/saya`, `POST .../setuju`, `POST` dan `DELETE .../wajah`, `POST .../nonce`, `POST .../absen`, `POST .../logbook`, `GET .../riwayat`, `GET .../foto/:id` | Kode (atau sesi nomor dengan hak terbatas, atau kode regu untuk logbook) |
| `POST` dan `DELETE /api/petugas/dummy` | Super |
| `GET /api/orang/:id/jejak` | Staf atau Mod |
| `POST .../panel/impor` | Super |
| `GET .../panel/orang`, `.../panel/ekspor.csv`, `.../panel/tinjau`, `.../panel/ringkas`, `.../panel/label`, `.../panel/tugas`, `.../panel/panggil`, `.../panel/acuan/:id`; `POST .../panel/label/:id`, `.../panel/tinjau/:id`, `.../panel/tugas`, `.../panel/panggil`, `.../panel/keahlian`, `DELETE .../panel/keahlian`, `POST .../panel/tautan/:id` | Staf pimpinan atau koordalops, atau Mod; ketua regu (Kode) untuk baca tinjau dan ringkas tugasnya |
| `GET .../label.json` | Staf atau Mod |
| `GET /api/petugas/wa/antre`, `POST .../wa/hasil` | Gerbang |
| `GET /api/foto/lapangan`, `GET /api/foto/lapangan/media/{logbook\|uji_pilot}/:id` | Mod atau staf nyata; tidak pernah publik |

LogPal (`src/logpal.js:429`): `GET /instansi/logpal`, `GET /logpal/index.html`, aset `/logpal/logpal.js` dan `.css`, `GET /api/instansi/logpal/statis`, `.../data`, `.../bantuan` (sesi sah), `POST .../gudang`, `.../barang/:id`, `.../ubah/:id`, `.../mutasi/:id`, `.../diterima/:id`, `.../opname/:id`, `.../permintaan` (BPBD atau Staf sesuai `aktor`), `POST .../tahap/:id` (hanya Staf pusdalops, koordalops, pimpinan atau Mod), `POST .../dummy` (Super). Peran staf lain mendapat 403.

Segel dokumen: tidak ada rute di kode. Rancangan: `GET /verifikasi` dan `/verifikasi/<kode>` (publik), `GET /api/verifikasi/<kode>` (publik, berlaju), `GET /api/segel` dan `POST /api/segel/cabut` (moderator dan pimpinan).
