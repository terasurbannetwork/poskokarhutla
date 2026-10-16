# Ilmu warga-api

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/warga-api.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca warga-api`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus warga-api "..."`.

## Peta berkas & tabel

**Berkas (semua di `src/`, ESM tanpa bundler, Cloudflare Worker + D1 + R2):**

| Berkas | Isi |
| --- | --- |
| `src/worker.js` (490 baris) | pintu masuk `fetch` (443) + `scheduled` (480); API `/api/warga*`; tabel `RUTE` (364) untuk statistik/admin/pesan/foto; `cacheTepi` (431); `/api/status` (329-352); `bersihkan` (353) |
| `src/foto.js` (333) | foto & video lapangan; `RUTE_FOTO` (320) digabung ke `RUTE`; R2 binding `MEDIA` |
| `src/titik.js` (105) | cron FIRMS: `perbaruiTitik`, `uraiCSV`, `wilayah`/`cariWilayah` (dipakai juga `foto.js`) |
| `src/statistik.js` (313) | `POST /api/jejak`, `GET /api/statistik`, sesi admin (cookie HMAC), kotak pesan, retensi |
| `src/publik.js` (196) | klasifikasi manusia/AI/perayap, `catatHit`, `GET /api/publik`, pil header |
| `src/admin_halaman.js` (84) | kerangka HTML `/admin/*` + halaman publik `/statistik`, `CSP_ADMIN` |
| `src/og_meta.js` (52) | `metaRute` (murni) + `terapkanOg` (HTMLRewriter) dari `public/data/og/meta.json` |

Konfigurasi: `wrangler.jsonc` (PRODUKSI: D1 `DB`, ASSETS `html_handling: "none"`, satu cron `17 * * * *`, TANPA r2_buckets),
`wrangler.warga.jsonc` (USULAN lengkap: + `r2_buckets MEDIA` bucket `poskokarhutla-foto`, cron kedua `15 */3 * * *`).
Dokumen: `WARGA.md` (§Deploy 76, §Moderasi 110, §Statistik 153, §Foto 174). Klien: `public/warga/index.html`,
`public/informasi.js`, `public/foto.js`, `public/admin/{statistik,pesan,foto}.js`.

**Rute (kunci `METODE /jalur`; `:id` = 16 hex). Auth: "-" publik, "laju" batas per hash IP, "admin" = `adminOK`.**

| Rute | Handler | Auth |
| --- | --- | --- |
| `GET /api/warga` | `daftar` (cache tepi 30 dtk) | - |
| `POST /api/warga` | `buat` (178) | Turnstile (bila aktif) + laju `lapor` 10/jam 30/hari + global 600/jam |
| `GET /api/warga/konfig` | sitekey + `BATAS` (cache 300 dtk) | - |
| `GET /api/warga/:id` | `rincian` (404 bila disembunyikan) | - |
| `POST /api/warga/:id/konfirmasi` · `/lapor` | `suara` | laju 60/jam · 20/jam |
| `POST /api/warga/:id/kontak` | `kontak` (WA, 72 jam) | laju 5/jam 15/hari |
| `POST /api/warga/:id/selesai` | `selesai` | token pelapor (hash) + laju 30/jam |
| `GET /api/warga/admin`, `POST /api/warga/:id/admin` | `admin` (292) | admin |
| `GET /api/titik` · `GET /api/status` | `titikTerbaru` (cache 600) · `periksaStatus` (cache 60, 503 bila basi) | - |
| `POST /api/jejak` · `GET /api/statistik` · `GET /api/publik` | St/Pub | batas memori 6/mnt · admin · - |
| `POST /api/pesan` · `GET /api/pesan` · `POST /api/pesan/:id` | `kirimPesan`/`daftarPesan`/`ubahPesan` | Turnstile+laju `pesan` · admin · admin |
| `GET /admin`, `/admin/masuk` (GET+POST), `POST /admin/keluar`, `GET /admin/{statistik,pesan,foto}` | sesi | laju `masuk` 8/15 mnt; halaman admin 303 ke masuk |
| `GET /statistik`, `GET /f/:id` | halaman publik; index.html + OG foto | - |
| `GET/POST /api/foto*` (11 rute, daftar di `RUTE_FOTO`) | foto.js | unggah/komentar/suka/aduan laju `foto_laju`; admin/dummy `adminOK` |
| halaman HTML (`HTML_RUTE` 403) | `layaniHTML` (catat hit + OG + pil) | - |

**Tabel D1 per migrasi (waktu = ms epoch UTC):**
- `0001_warga`: `laporan` (CHECK katalog `jenis:sub` HARUS sama dengan `public/informasi_jenis.js`; lat/lon bbox Indonesia; kedaluwarsa maks +7 hari), `kontak` (trigger `kontak_hanya_bantuan`), `suara` (+3 trigger hitung, 3 aduan = disembunyikan), `jejak` (laju; CHECK `aksi` beku).
- `0002_titik`: `titik_terbaru` (8 putaran terakhir, `isi` JSON <= 2 MB).
- `0003_moderasi`: `audit_moderasi` (trigger tolak UPDATE/DELETE).
- `0004_statistik`: `stat_hari` (PK tgl+hal, WITHOUT ROWID), `laju` (aksi `masuk`/`pesan`), `stat_tamu`, `stat_garam`, `stat_ip`.
- `0005_pesan`: `pesan`. `0006`: `stat_hari` dibangun ulang (CHECK `hal` diperlebar).
- `0007_foto`: `foto`, `foto_suka`, `foto_komentar`, `foto_aduan`, `audit_foto`, `foto_laju` + 8 trigger.

**Cron** (`scheduled` 480): `15 */3 * * *` (= `CRON_TITIK`) -> `perbaruiTitik`; selain itu (`17 * * * *`) -> `bersihkan` (kontak 72 jam, laporan kedaluwarsa > 7 hari / disembunyikan > 30 hari, jejak 2 hari, retensi statistik) + `bersihkanFoto` + `catatGangguan` + `musnahkanGaram` + `perbaruiRentang` (sehari sekali).

**Secret/var (hanya nama):** `IP_SALT` (wajib untuk POST), `ADMIN_TOKEN` (boleh banyak, koma), `SESI_KUNCI`, `TURNSTILE_SECRET` + var `TURNSTILE_SITEKEY`, `FIRMS_MAP_KEY`, `EMAIL_API_KEY`, `EMAIL_TO`, `EMAIL_FROM` (Resend). Lokal: `.dev.vars` (di-gitignore; contoh `.dev.vars.example`).

**R2/foto:** kunci `foto/<id>` (media) dan `foto/<id>_t` (thumbnail), dilayani `media()` (82) dengan Range/ETag; dummy menunjuk `/img/foto-*.jpg` di aset. Tanpa `MEDIA` -> 503 `tanpaMedia()`.

**Uji spin-up miniflare:** `new Miniflare({modules:true, scriptPath:src/worker.js, modulesRoot:AKAR, d1Databases:{DB}, bindings:{IP_SALT,ADMIN_TOKEN,...}, serviceBindings:{ASSETS: fungsi baca public/}, outboundService: fixture FIRMS/Resend/Turnstile, cache:false})`, lalu migrasi dijalankan lewat `migrasi()` + `pecah()` dari `tests/warga/_bantu.mjs` (trigger BEGIN..END utuh). `foto.test.mjs` menambah `r2Buckets`. `tepi.test.mjs` menyalakan cache.

## Aturan & invarian

- IP mentah tidak pernah disimpan: `ipHash` = SHA-256(`IP_SALT|kunciIP`); IPv6 dikunci ke prefiks /64 (`kunciIP` 105). Kolom `ip_hash` tidak pernah keluar di respons publik (`KOLOM` 131, `KOLOM_PUBLIK` foto.js:55).
- Kontak WA hanya lewat `POST /:id/kontak`, tidak pernah di daftar/rincian; dihapus saat selesai/disembunyikan/72 jam.
- Respons sukses lewat `json()` (`cache-control: no-store`, nosniff); hanya GET publik tanpa data per pengguna yang boleh lewat `cacheTepi`. Admin/POST/bercookie TIDAK PERNAH.
- Urutan gerbang di rute tulis: CSRF origin (di `rute()` 388) -> `IP_SALT` ada (503) -> `bacaBody` (maks 4096 B) -> validasi -> Turnstile -> `cekLaju` -> tulis. Aksi admin: `adminOK` PERTAMA, sebelum body/D1.
- Aksi admin selalu dalam satu `DB.batch` bersama baris audit (`audit_moderasi` / `audit_foto`); hapus laporan = soft delete.
- `hapus_pengirim` wajib `konfirmasi` = jumlah laporan terdampak (CGNAT: satu hash IP bisa banyak warga).
- Teks publik lewat `bersihTeks` (buang URL & nomor HP, tolak kata kasar, maks 280); detail lewat `bersihDetail`; lokasi satwa dibulatkan 0,01 derajat.
- Foto: lokasi = GPS perangkat (akurasi <= 1000 m, umur <= 10 mnt), EXIF GPS <= 5 km dan waktu <= 48 jam; tipe dari byte awal (`jenisBerkas`), bukan Content-Type; foto 3 MB, video 30 MB / 60 dtk, thumb 300 KB; berkas R2 dibuang bila INSERT gagal.
- Foto baru `menunggu`; hanya `tayang` yang terlihat publik; 3 aduan IP berbeda mengembalikan foto ke antrean.
- Migrasi: berkas bernomor, baru = berkas baru, yang sudah jalan tidak disunting (lihat ilmu `migrasi-idempoten`). Daftar `jenis:sub` di `0001` dan `public/informasi_jenis.js` harus sinkron.
- Rute/tabel/trigger baru WAJIB masuk `tests/warga/cakupan.json` (diuji dengan nama uji nyata, atau dikecualikan dengan alasan >= 15 karakter).

## Ranjau yang pernah meledak

- **Deploy produksi tidak membawa R2 dan cron FIRMS.** `wrangler.jsonc` (yang dipakai `terbit.yml`/`data.yml`/`titik.yml` lewat `wrangler@3 deploy`) hanya punya cron `17 * * * *` dan tanpa `r2_buckets`; keduanya baru ada di `wrangler.warga.jsonc`. Akibatnya `scheduled` tidak pernah menerima `15 */3 * * *` (titik FIRMS D1 tidak diperbarui) dan unggah foto dijawab 503. WARGA.md §Foto menyuruh menambah `r2_buckets` ke `wrangler.jsonc` manual. Cek: `grep -c r2_buckets wrangler.jsonc`.
- **Catatan roster salah:** `roster.json` menulis cron `17 * * * *` menarik FIRMS. Sebenarnya `17 * * * *` = bersih-bersih; FIRMS = `15 */3 * * *`. Kode menang.
- **Migrasi kembar `0003_moderasi 2.sql`** (salinan Finder, ikut commit b6f645f) menggagalkan `d1 migrations apply`; dicabut di `3b90271`. `.gitignore` kini menolak `* 2`, `* 2.*`.
- **Cabang lama `/api/warga` di `fetch`** (454-457) memeriksa origin tanpa pengecualian `"null"`: `new URL("null")` melempar -> 500 "galat server". `rute()` (388) sudah benar. Rute baru taruh di tabel `RUTE`, jangan di cabang lama.
- **CHECK SQLite tidak bisa di-ALTER:** `jejak.aksi` beku, jadi laju baru memakai tabel `laju` (0004) dan `foto_laju` (0007). Memperlebar CHECK = bangun ulang tabel (contoh `0006`).
- **CHECK dengan NULL lolos diam-diam:** `durasi` video di 0007 memakai `coalesce(durasi, 0)`; `0004` memakai `coalesce(json_type(...), '')`.
- **Batas CPU Workers Free 10 ms:** `dibuatAset` hanya membaca 1 KB awal berkas (jangan urai `berita.json` 5 MB); cron FIRMS parse ~20 rb baris + poligon di-cache `WIL` per isolat (WARGA.md §Batas).
- **Anggaran tulis D1 100 rb baris/hari:** statistik memakai satu UPDATE per kiriman + sampel (`pSampel`/`pHit` statistik.js:36-37). Jangan menambah tulis per kunjungan.
- **CGNAT seluler:** batas laju per hash IP bisa menghukum banyak warga (komentar `ponytail` worker.js:104).
- **`wilayah()` di-cache di variabel modul** (`WIL`); uji yang mengganti aset harus memakai isolat baru.

## Gerbang yang menghakimi

- `npm run uji:warga` = tujuh `node --test` BERURUTAN dan berhenti di galat pertama: `gerbang` (tanpa DB: tiap rute/tabel/trigger ada di `cakupan.json`, nama uji nyata, antre <= 2 dan hanya menyusut), `skema` (SQLite `node:sqlite`, migrasi apa adanya), `api` (miniflare+D1), `tepi` (cache+Turnstile), `statistik`, `klien` (node:vm), `foto` (D1+R2). `og.test.mjs` ada tapi TIDAK ada di skrip `uji:warga` (jalankan manual).
- `uji:warga` tidak dipanggil di `.github/workflows/*` (grep tidak menemukan); gerbangnya lokal sebelum commit.
- `npm run uji:agen` (`tests/agen/`): ilmu terisi + model agent tertulis.
- Verifikasi tambahan: `npx wrangler@3 deploy --dry-run` dan `node --test tests/warga/gerbang.test.mjs` setelah menambah rute.
- `/api/status` (503 bila sumber kunci basi) dipakai langkah akhir CI dan monitor uptime.

## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode (src/*.js, migrations/0001-0007, wrangler*.jsonc, WARGA.md, tests/warga). Temuan kunci: wrangler.jsonc produksi tanpa R2 dan tanpa cron FIRMS; roster salah soal cron 17.
- 2026-10-16 · Asersi spanduk memakai includes('pv-kartu') akan cocok dengan CSS yang selalu disisipkan ke head; pakai penanda elemen '<section class="pv pv-kartu"'. /tentang kini tab index.html (HALAMAN); tentang.html ada di /tentang-halaman. Uji klien.test.mjs berhenti-pada-gagal-pertama, jadi satu asersi basi menjatuhkan 11 uji.
- 2026-10-16 · Rute dari registry: bencana warisan non-akar (banjir) hanya halaman utama (tabRute kosong) supaya /banjir/<x> tetap 404 seperti sebelumnya; TAB_LAMA (keputusan, prioritas, sarana, operasi) dipertahankan di akar karena tidak ada di tab registry. Port 8799 sering dipegang workerd lain: pakai --port lain untuk wrangler dev.
- 2026-10-16 · data.bmkg.go.id menjawab 403 untuk UA curl pendek (dicek 16 Okt 2026 dari Mac ini), 200 dengan UA Chrome penuh: selalu kirim UA penuh. Gempa gabung: gempadirasakan (M4.9) bisa menggabung USGS (M5.1), jadi fixture 'USGS-saja' harus dipilih dari kejadian tanpa pasangan BMKG; freshness /api/status gempa = gempa_sumber.dibuat (200/304), BUKAN max(gempa.t) karena gempa bisa sepi berjam-jam. Gerbang cakupan regex 'CREATE TABLE (\w+)' menangkap 'IF' dari IF NOT EXISTS: sudah diperbaiki.
