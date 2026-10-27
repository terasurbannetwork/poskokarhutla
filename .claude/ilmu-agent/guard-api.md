# Ilmu guard-api

> Kelas: pemeriksa · Model: haiku · Definisi: `.claude/agents/guard-api.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca guard-api`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus guard-api "..."`.

## Peta berkas & tabel

Read-only. Periksa gerbang tiap rute di:
- `src/worker.js`: `fetch` (443), `rute()` (384) untuk tabel `RUTE` (364), cabang `/api/warga*` (451-476), `admin()` (292), `adminOK` (284), `cekLaju` (93), `turnstileOK` (121), `bacaBody` (112).
- `src/foto.js`: `RUTE_FOTO` (320), `laju` (25), `adminDaftar` (212), `adminAksi` (224), `dummy` (259).
- `src/statistik.js`: `jejak` (109), `statistik` (159), `masuk` (224), `kirimPesan` (246), `daftarPesan` (281), `ubahPesan` (297).
- `src/publik.js`: `publik` (159).

**Gerbang yang ADA hari ini (urutan eksekusi nyata):**
1. CSRF: tiap `POST` di tabel `RUTE` menolak `Origin` beda host (403), menerima `"null"` (`rute()` 388-391). `POST` tanpa `IP_SALT` -> 503 (kecuali `/api/jejak`).
2. Admin: `adminOK` menerima header `x-admin-token`, `Authorization: Bearer`, atau cookie `sesi_admin` (HMAC, 12 jam, `HttpOnly; Secure; SameSite=Strict`). Perbandingan lewat hash SHA-256, bukan string mentah.
3. Batas laju per hash IP (/64 untuk IPv6) di tabel `jejak` (`BATAS` worker.js:16), `laju` (`masuk`,`pesan`), `foto_laju` (`BATAS_FOTO` foto.js:16).
4. Turnstile aktif hanya bila `TURNSTILE_SECRET` DAN `TURNSTILE_SITEKEY` diset.
5. Ukuran body: 4096 B (`bacaBody`), 8192 B (`kirimPesan`), 4096 B (`jejak`), multipart unggah <= 30 MB + 360 KB.

**Matriks rute -> gerbang:**

| Rute | Admin | Laju | Validasi | Catatan |
| --- | --- | --- | --- | --- |
| `GET /api/warga`, `/konfig`, `/:id` | - | cache tepi | filter `disembunyikan`; kolom tanpa ip_hash/kontak | rincian 404 bila disembunyikan |
| `POST /api/warga` | - | 10/jam, 30/hari + global 600/jam | katalog jenis, bbox, `bersihTeks`, `bersihDetail`, WA | + Turnstile |
| `POST /:id/konfirmasi`, `/lapor` | - | 60/jam, 20/jam | nilai whitelist; id 16 hex | satu suara per IP (PK) |
| `POST /:id/kontak` | - | 5/jam, 15/hari | id hex | laju DIHITUNG sebelum cek keberadaan |
| `POST /:id/selesai` | token pelapor | 30/jam | hash token | 403 bila salah |
| `GET /api/warga/admin`, `POST /:id/admin` | `adminOK` pertama | - | aksi whitelist, `konfirmasi` utk hapus_pengirim | audit dalam batch |
| `GET /api/titik`, `/api/status`, `/api/publik`, `/api/foto`, `/api/foto/konfig`, `/api/foto/:id` | - | cache tepi | - | `?dummy=1` dan foto belum tayang butuh admin |
| `GET /api/foto/media/:id`, `/thumb/:id` | admin bila belum tayang | - | - | 404 bukan 403 |
| `POST /api/foto` | - | 5/jam, 20/hari | magic bytes, ukuran, GPS, EXIF, email | + Turnstile |
| `POST /api/foto/suka/:id`, `/komentar/:id`, `/aduan/:id` | - | 120/jam, 10/jam+50/hari, 20/jam | teks `bersihTeks`, alasan whitelist | komentar + Turnstile; suka/aduan tanpa Turnstile |
| `GET /api/foto/admin`, `POST /api/foto/admin/:id`, `POST /api/foto/dummy` | `adminOK` pertama | - | aksi whitelist | audit_foto |
| `POST /api/jejak` | - | memori 6/mnt per `v` (per isolat) | skema ketat, UA bukan bot, <= 50 peristiwa | tanpa Turnstile, tanpa IP_SALT |
| `GET /api/statistik`, `GET /api/pesan`, `POST /api/pesan/:id` | `adminOK` pertama (401) | - | status/kategori whitelist | |
| `POST /api/pesan` | - | 5/jam, 20/hari | email regex, honeypot `situs`, panjang | + Turnstile |
| `GET/POST /admin/masuk` | - | 8/15 mnt, 40/hari | body <= 2048 | POST salah 401, terlalu sering 429 |
| `GET /admin/{statistik,pesan,foto}` | `halamanAdmin` -> 303 ke masuk | - | - | CSP ketat + `x-frame-options: DENY` |
| `POST /admin/keluar` | - | - | - | hapus cookie |

## Aturan & invarian

- Route admin: `adminOK` (atau `Pub/St.halamanAdmin`) HARUS dipanggil sebelum `bacaBody`/D1. Pola benar: `foto.js:225`, `worker.js:293`, `statistik.js:160`.
- Route publik penulis: validasi + batas laju + (Turnstile bila form terbuka) sebelum INSERT. `cekLaju` mencatat percobaan DAN menolak; jangan dipanggil dua kali.
- Kunci tabel `RUTE` itu `METODE /jalur`; metode lain pada jalur yang sama tidak ada kuncinya, jadi `rute()` mengembalikan `null` dan jatuh ke `layaniHTML`/`ASSETS`/cabang `/api/warga` (404 "rute tidak ada"), BUKAN 405. Aturan roster "405 untuk metode tak dikenal" belum terpenuhi.
- Respons publik tak boleh memuat: `ip_hash`, `token_hash`, `email`, `wa`/kontak, `dummy`. Admin boleh melihat `ip_hash` laporan (`worker.js` admin GET) dan `pengirim` = 8 hex awal hash foto; admin foto membuang `ip_hash` dari baris (`adminDaftar`).
- Kegagalan = `gagal(status, pesan)` dengan JSON `{galat}`; 500 hanya dari `catch` terakhir, jangan membocorkan `e.message`.
- Rute baru: tambah ke `cakupan.json` (gerbang `gerbang.test.mjs` membaca tabel `RUTE`, `p[0] ===`, `p[1] ===`, `url.pathname ===`).

## Ranjau yang pernah meledak

Rute/pola yang KURANG gerbang saat ini (jadikan temuan bila disentuh):
- **`POST /api/jejak` tanpa batas bermakna.** Laju 6/menit dikunci pada `o.v` yang dikirim klien (`statistik.js:99-107`), disimpan di `Map` per isolat; penyerang tinggal mengganti `v` tiap kiriman. Pelindung nyata hanya sampling D1 (`pSampel`) dan cek UA `BOT`. Tidak ada Turnstile, tidak ada hash IP. Ceiling yang sudah disadari (`ponytail:` di berkas).
- **Token admin lewat header tidak dibatasi laju.** `adminOK` (worker.js:284) dipanggil oleh semua rute admin/GET statistik/pesan/foto tanpa `cekLaju`; hanya `/admin/masuk` yang dibatasi (`masuk`). Brute-force `x-admin-token` ke `/api/pesan` dll tak terhitung. Aman bila token acak panjang (`openssl rand -hex 24`), tapi tak ada gerbangnya.
- **Cabang lama `/api/warga` di `fetch` (454-457):** `new URL(origin)` tanpa pengecualian `"null"`, memberi 500. Gerbang CSRF ganda (cabang lama dan `rute()`) rawan menyimpang.
- **`POST /api/foto/suka|aduan` tanpa Turnstile** (hanya laju per IP); `komentar` ber-Turnstile. Aduan palsu terkoordinasi dari 3 hash IP mengembalikan foto ke antrean / menyembunyikan komentar.
- **`POST /:id/kontak` menghitung laju sebelum cek keberadaan,** jadi pemindai id acak menghabiskan jatah 5/jam per IP; 404 tak membocorkan eksistensi. Perilaku dimaksudkan; jangan "perbaiki" menjadi cek dulu.
- **`GET /api/warga/:id` dan `/api/foto/:id` tanpa laju** (hanya baca); `/api/foto/:id` memakai `ipHash` hanya bila `IP_SALT` ada.
- **Tak ada 405** (lihat Aturan). Metode tak terduga pada `/api/foto/...` jatuh ke `ASSETS` (404 statis).
- Riwayat perbaikan gerbang: `dd0f47c` (laju IPv6 per /64), `bb48a42` (audit moderasi, konfirmasi hapus_pengirim, `/api/status`).

## Gerbang yang menghakimi

- `tests/warga/api.test.mjs`: "admin: tanpa token ditolak", "konfirmasi: satu suara per IP", "3 aduan dari 3 IP", "kontak hanya lewat endpoint terpisah", "hapus_pengirim wajib konfirmasi", "origin lain ditolak", "tanpa IP_SALT 503".
- `tests/warga/statistik.test.mjs`: "masuk: percobaan dibatasi", "masuk: token salah ditolak", "pesan: admin wajib masuk", "jejak: masukan salah DITOLAK".
- `tests/warga/foto.test.mjs`: "foto: admin wajib masuk", "foto: batas laju 5 unggahan", "foto: tolak butuh alasan".
- `tests/warga/tepi.test.mjs`: Turnstile diset -> tanpa token DITOLAK.
- `tests/warga/gerbang.test.mjs`: rute baru tanpa uji ditolak. `npm run uji:warga` menjalankan semuanya.
- Perintah cepat: `grep -n "adminOK" src/*.js` (tiap rute admin) dan `grep -n "cekLaju\|laju(" src/*.js` (tiap rute tulis).

## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode (matriks rute -> gerbang dari src/worker.js, foto.js, statistik.js, publik.js). Rute tanpa gerbang penuh: /api/jejak (laju mudah diakali), token admin via header tanpa laju, suka/aduan foto tanpa Turnstile, metode tak dikenal tidak 405.
- 2026-10-18 · Rute /ubin/*.pmtiles (publik, R2 MEDIA) tanpa laju: tiap GET tak ter-cache = HEAD+GET Class B. Gerbang laju D1 (cekLaju) JANGAN dipakai untuk tile (tulis D1 per request). Pakai WAF rate limit di dasbor atau cache.default untuk meta/200. Verifikasi cf-cache-status setelah deploy.
- 2026-10-19 · 2026-10-19 · Ilmu lama basi: rute jalur-ada-metode-lain sudah dijawab 405 oleh rute() (allow header), bukan jatuh ke aset statis. Gerbang centurisk97.id kini default tertutup untuk semua rute GET halaman (kecuali /api, /admin, /ews, /ubin dan PUBLIK_TANPA_SESI=/lapangan). Tebakan token admin lewat header dihitung per IP di laju_posko (300/jam, hanya bila cf-connecting-ip ada).
- 2026-10-19 · Rute GET yang membangun kunci cache dari url.search mentah bisa dibengkakkan (?dari=X&dari=X...). Bangun kunci dari nilai tervalidasi seperti gempa.js:273.
- 2026-10-19 · Peta lookup literal {a:1}[input] menembus Object.prototype (toString, constructor, __proto__) dan lolos cek undefined; pakai Object.hasOwn sebelum indeks.
- 2026-10-20 · Arsip publik yang menyalin masukan endpoint warga (R2, sekali tulis) mengabadikan laporan yang kemudian disembunyikan: takedown tidak merambat. Cek tiap snapshot publik terhadap moderasi sebelum disimpan atau arsipkan hanya agregat.
- 2026-10-21 · Modul baru yang butuh tabel migrasi: rute() menjadikan 'no such table' jadi 500 generik. Gerbang migrasi (503 'fitur belum diaktifkan') harus dibungkus sekali di tabel modul, dan ada uji yang menjalankan kondisi tabel belum ada.
- 2026-10-22 · Halaman admin dan API-nya harus memakai daftar peran yang sama: halamanAdmin dengan bolehStaf=null menolak staf (303) sementara API mengizinkan semua peran. Uji 'staf 200' lulus karena helper api() mengikuti redirect; untuk gerbang halaman pakai redirect manual dan periksa status 303 serta location.
- 2026-10-22 · Darurat regu dan kabar ke akun instansi: tautan harus menuju halaman yang bisa dibuka penerimanya (instansi: /instansi, staf: /admin/pantau), bukan satu tautan untuk semua penerima; dan panggilan dari penugasan dummy jangan mengirim kabar nyata. Cara tahu: halamanAdmin mengalihkan sesi instansi ke /admin/masuk; kabarDarurat tidak memeriksa p.dummy.
- 2026-10-23 · Gerbang cakupan tests/warga/gerbang.test.mjs temukan() (baris 13-38) memindai daftar berkas tetap; modul RUTE_ baru di luar daftar (src/risiko7.js) tak terdeteksi, jadi rute baru di sana lolos tanpa tercatat di cakupan.json. Cara tahu: grep readFileSync di gerbang dibandingkan dengan export RUTE_ di src; tambah tiap RUTE_ baru ke daftar.
- 2026-10-23 · Rute anonim yang membaca cookie sesi_pemirsa (pemirsa.js:20-27) melakukan satu SELECT D1 per permintaan walau sesinya tak sah; token_sha PRIMARY KEY membuat tiap baca murah, tapi tak ada laju. Sesi admin HMAC (statistik.js:219) tidak menyentuh D1, jadi biaya ini baru. Cara tahu: grep pemirsaSesi di src. Pola yang benar: WAF rate limit, bukan cekLaju (itu menulis D1).
- 2026-10-27 · 2026-10-27 · Modul RUTE_ baru yang lahir di luar daftar bn gerbang.test.mjs (uji_banjir) tak terdeteksi temukan(); daftar itu harus ikut setiap modul baru. Cara tahu: grep daftar bn di baris 22 terhadap export RUTE_ di src.
