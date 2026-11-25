# Gerbang akses, autentikasi, privasi

Halaman ini menjelaskan gerbang akses halaman, autentikasi dan batas laju API, serta perlindungan privasi.

## Gerbang akses halaman

- Host terkunci: `centurisk97.id`, `www.centurisk97.id`, dan alamat `workers.dev` produksi (`src/worker.js:716-719`). Di host ini default-nya TERTUTUP: semua halaman HTML (termasuk berkas `.html` yang dibuka langsung) wajib masuk lebih dulu, dan halaman baru otomatis ikut terkunci (`halamanTerkunci`, baris 774).
- Pengecualian harus tercatat di `PUBLIK_TANPA_SESI` (baris 758) dengan alasannya. Contoh: `/lapangan`, `/petugas`, `/meja`, `/renlap`, `/bantu` (masuk dengan kode atau token tanpa akun situs), `/instansi` (akun instansi sendiri), `/lapor` dan `/masuk` (warga), `/presiden` (panel publik agregat), `/pendataan`. Halaman yang dikecualikan tidak memuat data; kode atau sesi dicek di tiap panggilan API.
- Gerbang hanya menutup cangkang HTML. `/data/*.json`, JS, CSS, dan gambar tetap aset statis publik tanpa Worker.
- Modul yang menjaga dirinya sendiri dipanggil sebelum gerbang host: Kemitraan Kampus (`/kemitraan*`, `src/kemitraan.js`) dan Siklus Bencana (`/siklus*`, `src/siklus.js`).
- Perlindungan penulisan: permintaan `POST`, `PUT`, `PATCH`, `DELETE` dari origin lain ditolak 403. Bila permintaan membawa cookie sesi, Origin kosong atau `null` ditolak kecuali `Sec-Fetch-Site: same-origin` (`tolakOrigin`, baris 686). Penulisan tanpa `IP_SALT` dijawab 503 (kecuali `/api/jejak`).
- Pengecekan peran memakai `adminOK` (token admin atau akun gerbang), `stafOK` per peran (`verifikator`, `pusdalops`, `analis_konsesi`, `udara`, `tmc`, `koordalops`, `pimpinan`, `kemitraan`, `operator_cc`, `direktori`, `irtama`, `unit`, `src/staf.js:23`), dan `modOK`/`superOK` untuk moderator dan Super Admin (`src/posko.js:46-50`). Penulis memakai sesi staf dengan header `x-pb: 1`.

## Autentikasi dan batas laju API v1 dan MCP

Urutan pemeriksaan kunci (`kunciSah`, `src/api_v1.js:58-77`):

1. Header `X-API-Key` harus ada, dan `IP_SALT` harus terpasang (kalau tidak, 503).
2. Hitung kegagalan dari hash IP dalam satu jam di tabel `laju_bnpb` (aksi `api.kunci_gagal`). Mencapai 300, jawabannya 429.
3. Cocokkan `sha256(kunci)` dengan `kunci_api.kunci_sha` hanya bila format `^pb_[0-9a-f]{64}$`. Tidak ada, dicabut, atau umur lebih dari 365 hari: catat kegagalan dan jawab 401.
4. Batas per kunci 1.000 permintaan per jam (aksi `api.v1`); lewat, 429.
5. Kolom `terakhir` diperbarui paling sering sekali per jam.
6. Cakupan diperiksa terakhir: kunci tanpa cakupan endpoint dijawab 403.

![Urutan lima pemeriksaan kunci API beserta kode jawaban bila gagal. Sumber: kunciSah di src/api_v1.js.](gambar/arsitektur-urutan-kunci.svg)

Cakupan yang ada: `rumah_rusak`, `bangunan`, `laporan_bnpb`, `konsesi` (`src/api_v1.js:16`). Jawaban endpoint berkunci selalu `private, no-store`.

## Perlindungan privasi pada batas laju dan statistik

- IP mentah tidak pernah disimpan. Kunci laju adalah `sha256(IP_SALT | alamat)`, dan untuk IPv6 dipakai prefiks /64 karena satu pelanggan biasanya memegang satu /64 utuh (`src/worker.js:197-205`).
- Statistik pengunjung unik memakai 16 heksadesimal dari hash garam harian, IP, dan agen pengguna. Garam diganti tiap hari WIB dan garam lama dimusnahkan cron, sehingga hash kemarin tidak bisa dicocokkan lagi. Tidak ada penyimpanan di perangkat pengunjung (`src/publik.js:1-9`).
- Pengunjung diklasifikasikan menjadi manusia, asisten AI (jawab dan perayap), mesin pencari, dan tidak dihitung. Perayap diverifikasi terhadap rentang IP resmi operatornya, dan jaringan hosting atau cloud tidak dihitung sebagai manusia (`src/publik.js:20-52`).
- Batas laju warga (`BATAS`, `src/worker.js:113`): laporan 10 per jam dan 30 per hari, konfirmasi 60 per jam, aduan 20 per jam, kontak 5 per jam dan 15 per hari, selesai 30 per jam, masuk 8 per 15 menit dan 40 per hari, pesan 5 per jam dan 20 per hari; ditambah batas global 600 laporan baru per jam.
