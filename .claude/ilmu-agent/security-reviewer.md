# Ilmu security-reviewer

> Kelas: pemeriksa · Model: sonnet · Definisi: `.claude/agents/security-reviewer.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca security-reviewer`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus security-reviewer "..."`.

## Peta berkas & tabel

Read-only. JANGAN PERNAH mencetak nilai secret (hanya nama dan keberadaan). Wilayah pemeriksaan:

**Secret & konfigurasi**
- Secret Worker (wrangler secret / `.dev.vars` lokal, di-gitignore): `IP_SALT`, `ADMIN_TOKEN` (koma = banyak moderator), `SESI_KUNCI`, `TURNSTILE_SECRET`, `FIRMS_MAP_KEY`, `EMAIL_API_KEY`. Var publik di `wrangler.jsonc`: `TURNSTILE_SITEKEY`, `EMAIL_TO`, `EMAIL_FROM`.
- Secret Actions (`.github/workflows/*.yml`): `FIRMS_MAP_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `YOUTUBE_API_KEY`.
- `.gitignore`: `.env*` (kecuali `.env.example`), `.dev.vars`, `* 2`, `* 2.*`. `.dev.vars.example` hanya berisi placeholder.
- Header statis: `public/_headers` (X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy strict-origin-when-cross-origin, `Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=()`, **CSP masih Report-Only** dengan `'unsafe-inline'` di script/style). Berlaku untuk aset statis; respons `/api/*` TIDAK lewat berkas ini. Admin: `CSP_ADMIN` di `src/admin_halaman.js:59` (script `'self'` saja, `frame-ancestors 'none'`) + `x-frame-options: DENY`, `referrer-policy: no-referrer` di `statistik.js` `html()`.

**Permukaan input publik:** `src/worker.js` (laporan warga `buat` 178, `bersihTeks` 36, `bersihDetail` 47, `normalWA` 62, `bacaBody` 112, Turnstile 121), `src/foto.js` (unggah 108, `jenisBerkas` 35, `durasiMP4` 44, `media` 82), `src/statistik.js` (`jejak` 109, `kirimPesan` 246, sesi 204-235), `src/publik.js` (UA/CF dari header).

**Sisi layar (innerHTML dengan data luar):** konvensi `esc()` (ada di `public/index.html:1537`, `bagi.js:170`, `informasi.js:13`, `statistik_publik.js:6`, `admin/{pesan,foto,statistik}.js`) dan `escUrl` (`index.html:1539`, hanya `http(s)://`, selain itu `#`). Sumber data luar: berita (`data/berita.json`, judul/URL dari RSS), laporan warga (`teks`, `detail`), foto (`keterangan`, `nama`, `kredit`, `kab`, `kec`), pesan (`nama`, `instansi`, `isi`, `tautan`), dimensi statistik (referrer, UA -> kunci). Per 2026-10-15: `grep -c innerHTML` per berkas, mis. `informasi.js` 9 (esc 22), `admin/pesan.js` (semua nilai `esc(...)`, tautan `esc(p.tautan)` + `rel="noopener noreferrer"`), `admin/foto.js` 2, `statistik_publik.js` 2; total ratusan baris `innerHTML` di `public/*.js` dan `index.html`, jadi periksa PER DIFF, bukan semua.

**Unggah foto/video:** batas `MAKS` foto 3 MB, video 30 MB, thumb 300 KB, durasi 60 dtk, `Content-Length` > 30 MB + 360 KB ditolak 413 sebelum `formData()`; tipe dari byte awal (JPEG/WebP/MP4/MOV/WebM), bukan nama/Content-Type; wilayah dihitung server; media disajikan `content-disposition: inline`, `x-content-type-options: nosniff`, `cache-control: private, no-store` bila belum tayang. Tabel `foto` menyimpan `email` dan `ip_hash` (tidak pernah keluar dari `KOLOM_PUBLIK`).

## Aturan & invarian

- Secret HANYA lewat `wrangler secret put` / `.dev.vars` / secrets Actions. Tidak ada di berkas tracked (`git grep -I -l -E "(API_KEY|SECRET|TOKEN|MAP_KEY)\s*[:=]\s*['\"]?[A-Za-z0-9_-]{16,}"` hanya boleh menemukan `.dev.vars.example`; dicek 2026-10-15: hanya itu).
- IP mentah tidak pernah disimpan; hanya SHA-256 bergaram `IP_SALT`. Statistik publik memakai garam HARIAN yang dimusnahkan cron (hash kemarin tak bisa dicocokkan). Tanpa `IP_SALT` semua POST 503 (tak pernah hash tanpa garam).
- Respons publik tanpa `ip_hash`, `token_hash`, `email`, `wa`, `dummy`. Kontak WA hanya lewat endpoint terpisah berbatas laju, hilang 72 jam. Lokasi satwa dibulatkan ~1 km. Lokasi foto: GPS perangkat, bukan pilihan pengguna.
- Teks warga: `bersihTeks` membuang URL dan nomor HP, tolak kata kasar, buang karakter kontrol/bidi (U+200B-200F, 202A-202E), maks 280; di layar tetap di-`esc()` (pertahanan berlapis).
- Admin: token dibandingkan lewat hash SHA-256; cookie `sesi_admin` HMAC-SHA256 (`SESI_KUNCI`), `HttpOnly; Secure; SameSite=Strict`, 12 jam, ikut gugur bila token moderator dicabut dari `ADMIN_TOKEN`; verifikasi lewat `crypto.subtle.verify` (waktu-tetap). Halaman `/admin/*` dilayani Worker (bukan aset), `noindex`.
- CSRF: POST ber-`Origin` beda host ditolak; cookie SameSite=Strict.
- Link luar `target="_blank"` wajib `rel="noopener noreferrer"`; URL dari data luar lewat `escUrl`/protokol http(s) saja (`kirimPesan` membuang protokol selain http/https).
- `innerHTML` dengan data luar tanpa `esc`/`escUrl` = temuan. `textContent`/`setAttribute` aman. `style="--k:${...}"` dan atribut `data-*` dari data luar tetap harus di-`esc`.
- Pesan galat tidak membocorkan `e.message` internal ke klien (500 -> "galat server"), detail ke `console.error`.
- Dummy (`dummy=1`) tidak pernah publik; `?dummy=1` butuh admin.

## Ranjau yang pernah meledak

- **`.env 2` di-commit (b6f645f "gas") dan SUDAH terdorong ke `origin/main`** (`git branch -a --contains b6f645f` menunjuk `origin/main`). Berkas itu berisi `FIRMS_MAP_KEY` (terisi) dan `EARTHDATA_TOKEN` (kosong). Sumber: salinan otomatis Finder/iCloud dari `.env`. Sudah dicabut dari tip di `3b90271` dan `.gitignore` menolak `.env*`, TAPI nilainya tetap hidup di riwayat git. Tindakan wajib pemilik: (1) putar/rotasi `FIRMS_MAP_KEY` di NASA FIRMS lalu perbarui secret Actions dan `wrangler secret put FIRMS_MAP_KEY`, (2) anggap kunci lama bocor walau berkas sudah dihapus, (3) pertimbangkan pembersihan riwayat (`git filter-repo`) hanya atas keputusan pemilik. Berkas lokal `.env 2` masih ada di disk (diabaikan git). JANGAN cetak isinya.
- **CSP masih `Report-Only`** dan `'unsafe-inline'` di `script-src`: XSS tersimpan tetap dieksekusi bila lolos `esc`. Rencana di komentar `_headers`: ganti nama header setelah seminggu konsol bersih. Kerasnya CSP admin (`script-src 'self'`) tidak berlaku untuk halaman publik.
- **Unggahan disimpan apa adanya di R2.** Klien mengompres (kanvas membuang EXIF) tapi server tidak memverifikasi: `POST /api/foto` langsung dengan JPEG ber-EXIF/GPS/serial perangkat, atau MP4 dengan atom lokasi, tersimpan utuh dan disajikan publik setelah disetujui. Server hanya memeriksa magic byte, ukuran, dan menyaring JPEG vs `exif_lat/lon` kiriman klien (angka itu dari klien, tidak diverifikasi dari berkas). Admin menyaring manual. Belum ada penghapusan metadata di sisi server.
- **`exif_*` dan `kamera` dikirim klien** dan dipercaya untuk lencana "terverifikasi" (`foto.js:56-58`); GPS peramban bisa dipalsukan (`ponytail` di kepala `foto.js`).
- **Token admin via header tak berbatas laju** (hanya `/admin/masuk` berbatas). Aman jika token acak panjang; WARGA.md menyarankan `openssl rand -hex 24`.
- **`POST /api/jejak` tanpa autentikasi dan tanpa hash IP;** batas 6/menit dikunci `o.v` dari klien (mudah diakali), hanya pelindung sampling.
- **Dimensi statistik dari header luar** (referrer, `cf.*`, UA): dibersihkan `bersih()` (statistik.js) dan `replace(/["\\<>]/g,"")` di `d()` pada `catatHit` (publik.js); tampilan admin tetap `esc`. Menambah dimensi baru tanpa pembersihan = celah XSS tersimpan di dasbor admin.
- **Cabang lama `/api/warga` memeriksa Origin tanpa pengecualian `"null"`** -> 500, bukan celah, tapi gerbang CSRF ganda mudah menyimpang.
- **`Permissions-Policy: camera=()`** di `_headers`: unggah kamera memakai `<input capture>` (tidak butuh izin policy). Jika diganti `getUserMedia`, header ini memblokirnya.
- Riwayat: `bb48a42` (CSP report-only, link eksternal aman, UU PDP), `dd0f47c` (laju IPv6 /64).

## Gerbang yang menghakimi

- `tests/warga/api.test.mjs`: "laporan sah tersimpan ... tanpa kontak, hash, atau token", "tautan dan nomor HP dibuang", "POST dari origin lain ditolak", "tanpa IP_SALT semua penulisan ditolak 503".
- `tests/warga/statistik.test.mjs`: "masuk: token salah ditolak, cookie HttpOnly Secure SameSite=Strict 12 jam", "masuk: sesi kedaluwarsa, dipalsukan, atau token dicabut ditolak", "pesan: tersimpan tanpa HTML", "hit HTML: IP tidak pernah tersimpan".
- `tests/warga/foto.test.mjs`: "foto: masukan salah DITOLAK dan tidak menulis apa pun", "foto: admin setujui lalu tayang ... tanpa email/hash", "foto: admin wajib masuk".
- `tests/warga/tepi.test.mjs`: Turnstile. `tests/warga/klien.test.mjs`: persetujuan DNT/GPC.
- BELUM ADA gerbang mekanis: pemindai secret di tracked tree, pemeriksa `innerHTML` tanpa `esc`, uji metadata EXIF di server, CSP enforce. Kandidat untuk `penulis-gerbang`.
- Perintah bantu: `git ls-files | grep -E " 2(\.|$)|^\.env"`, `git grep -n "innerHTML" -- 'public/*.js'`, `git log --oneline -- public/_headers`.

## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode (worker.js, foto.js, statistik.js, _headers, public/*.js). Temuan terbesar: `.env 2` berisi FIRMS_MAP_KEY terdorong ke origin/main (b6f645f), dicabut dari tip di 3b90271 tapi kunci harus dirotasi; CSP masih Report-Only; server tidak membuang EXIF unggahan.
- 2026-10-16 · 2026-10-16 · diff modul cuaca/udara/gunungapi/gempa: tooltip data-tip di-esc() sebagai atribut tapi dirender sebagai HTML (bagikan.js, tampilTip), jadi isi tip dari data luar wajib esc() DI DALAM string tip. Temuan: cuaca/insight.js:54 a.event mentah. magma.py ambil() mengikuti URL http apa pun dari halaman scrape.
