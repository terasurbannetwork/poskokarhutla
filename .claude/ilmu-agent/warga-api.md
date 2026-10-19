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
- 2026-10-16 · Peringatan dini: tick cron uji harus kelipatan 5 menit agar gempaterkini ikut ditarik dan kelipatan 10 untuk aturan cuaca; wrangler dev port 8837 dipegang workerd sesi lain, pakai 8952. Karhutla/banjir belum ada aturan: kluster 6 MB+FWI dan normal harian provinsi tidak ada di Worker, kejadian_aktif_awal.json belum ada. Uji balik M5+ 2010-2026: 2,7 alarm/minggu nasional, terburuk 11 (Lombok 2018).
- 2026-10-16 · EWS: token kelola diturunkan dari IP_SALT (id+sha[:32]), bukan acak, karena email peringatan harus memuat tautan berhenti sedangkan D1 hanya simpan sha. Kirim ulang untuk alamat AKTIF hanya mengisi kolom calon (berlaku setelah konfirmasi) supaya orang iseng tak bisa memindah lokasi/menonaktifkan korban. Impor ews.js sendirian di node gagal (siklus dengan worker.js): impor worker.js dulu. Migrasi pakai IF NOT EXISTS: regex gerbang.temukan harus melompati frasa itu. statistik.test (#19 /tentang) dan klien.test gagal oleh perubahan layar-peta (index.html/tentang.html), bukan EWS.
- 2026-10-16 · EWS: jatah laju harus SATU INSERT..SELECT..WHERE count<maks (check-then-insert bisa dilompati serentak); untuk banyak jendela satukan kondisinya agar baris yang baru disisipkan tak menghitung dirinya. Siklus impor ews.js<->worker.js diputus dengan import * as Ews di worker.js (dibaca saat jalan). Guard uji menolak sed pada berkas test: pakai Edit.
- 2026-10-16 · EWS simulasi: sel jejak kumulatif, jadi cakrawala 48/72 hanya mengabari bila tingkatnya LEBIH tinggi dari cakrawala awal untuk kompleks sama (label 24-48 jam jadi jujur). Uji E2E butuh jarak waktu >10 mnt antar cron karena muatData cache 10 mnt per isolat; cek memakai Date.now jadi hanya satu fixture per isolat. Beban mesin tinggi bikin 'fetch failed' acak di uji Turnstile (bukan kode).
- 2026-10-16 · Rute admin tanpa await: 'adminOK(env, req) ? a : gagal(403)' selalu benar karena Promise truthy, jadi GET /api/sosmed/admin terbuka; uji 403 tanpa token menangkapnya. Uji miniflare tak bisa memock globalThis.fetch (handler jalan di workerd): fixture pihak ketiga lewat outboundService. uji:warga di package.json mendaftar tiap berkas uji secara eksplisit: berkas uji baru harus ditambahkan di sana (milik mekanik-mesin).
- 2026-10-16 · Foto per bencana (migrasi 0012): CHECK kategori 0007 beku, jadi kode kategori bencana lain disimpan di kolom kategori_b dan divalidasi trigger foto_kategori_sah dari tabel foto_kategori (seed = foto_kategori registry, dijaga tests/warga/foto_bencana.test.mjs). Worker gagal lunak tanpa 0012 (bencanaAda): karhutla jalan, bencana lain GET kosong / POST 503. Gerbang cakupan menuntut nama uji dibuka dengan uji(...) bukan test(...).
- 2026-10-16 · Nowcast BMKG: RSS lastBuildDate = waktu terbit asli (kirim sebagai terbit; dibuat = tarikan sehat terakhir). id CAP uji harus >= 3 karakter (regex id). wrangler dev 3.x: /__scheduled mengabaikan ?time, pakai waktu nyata, jadi tunggu menit kelipatan 10. Menambah sumber_status 'uji' ke bencana.json mengubah daftar di registry.test.mjs. Chrome headless via wrapper sh karena path berspasi/symlink ditolak sandbox.
- 2026-10-18 · Rute /ubin/ (src/ubin.js) dipasang paling awal di fetch() worker.js; head() dulu untuk ukuran lalu get({range:{offset,length}}) agar 416/Content-Range dihitung sendiri. uji:warga mendaftar berkas eksplisit: ubin.test.mjs belum masuk skrip (package.json milik mekanik-mesin), jalankan manual.
- 2026-10-18 · Cache API menolak put() respons 206: potongan Range disimpan sebagai 200 bertanda x-ubin-status lalu dikembalikan 206 (src/ubin.js). Cache disuntik lewat parameter ke-4 layaniUbin agar teruji tanpa workerd; tidak teruji di workerd sungguhan.
- 2026-10-19 · SIHKA (src/sihka.js, migrasi 0016): SQLite di D1/workerd menolak 'no such column' bila ORDER BY di subquery berkorelasi merujuk kolom luar dari CTE (abs(a.t-(u.lt-5))); node:sqlite 3.51 lolos, jadi uji miniflare yang menangkapnya. Nearest-reading ditulis lewat '= (SELECT min(abs(..)))' di WHERE, bukan ORDER BY. Juga: pecah() migrasi hanya memotong di baris berakhir ';' jadi komentar di belakang ';' menyatukan dua CREATE TABLE. Cap waktu SIHKA nyasar ke masa depan (2026-11) ada di data nyata: SQL_BACA membatasi t <= kini+600. Anggaran tulis D1 ~10 rb insert + ~10 rb hapus (90 hari) per hari; dasar harian memindai seluruh sihka_baca (<= ~860 rb baris) dengan 1 subquery per baris: ukur di D1 remote sebelum percaya.
- 2026-10-19 · SIHKA: sumber luar -> tulisan D1 wajib LIMIT + batas panjang (id/teks dipotong, koordinat dan |nilai| dibatasi, id hanya yang terdaftar); badan dibaca bertahap dan dibatalkan > 2 MB. Dasar persentil tidak boleh memuat jendela yang dinilai (dasar mengecualikan 24 jam terakhir, kalau tidak v > v_max mustahil dan p99 menyerap lonjakan yang sedang dinilai). workerd menolak fetch redirect:'error' (pakai 'manual' + cek status). SQLite menerima literal 1e999 di JSON sebagai Inf: tolak lewat abs(v) < 1e5.
- 2026-10-19 · SIHKA dasar: window RANGE/sortir di SQLite menghitung ~4-6 baris baca per baris per lintasan (rows_read D1), jadi persentil 90 hari penuh = ~20x baris (17 jt untuk 864 rb) dan subquery berkorelasi sama mahalnya. Obatnya bukan SQL lebih pintar tapi frekuensi: tiap pos dihitung ulang sekali per DASAR_SIKLUS=14 hari (bucket dari 2 karakter terakhir id + hari), pos tanpa baris dasar langsung. Ukur dengan meta.rows_read di Miniflare, jangan cuma durasi. Hapus massal wajib 'pos IN (SELECT pos FROM sihka_pos) AND t < ?' (seek PK), bukan 't < ?' (pindai penuh).
- 2026-10-19 · 2026-10-19 · Registry (bencana.generated.js) menambah sumber_status berita_<id> (ambang 30 jam), cuaca_meta 30 dan gunungapi 30: uji /api/status wajib menyuapi fixture berita_* (beritaSegar di api.test). Asersi 'index.html == berkas dengan Centurisk97 diganti' harus meniru HANYA <title> (worker tidak menyentuh komentar skrip). Uji sisip SQL langsung ke foto: durasi harus NULL untuk jenis foto (CHECK 0007) dan unggah wajib membawa sampel GPS >=3 bacaan (gps.js). CHECK stat_hari.hal berupa daftar id: bencana baru TANPA migrasi = INSERT OR IGNORE menelan diam-diam (204 tetap keluar), jadi uji tulis lewat D1 per id registry (statistik.test) + migrasi 0017 membangun ulang tabel; bencana ke-8 butuh 0018. Produksi: berkas berita_*.json bertanggal 16 Okt, cuaca_meta/udara_kualitas tanpa 'dibuat' di 1 KB awal: /api/status bisa 503 live.
- 2026-10-19 · 2026-10-19 · Ruang Posko (0018, src/posko.js): agregat neraca regu harus mengecualikan dummy bila kabupaten punya laporan asli (uji dummy menangkap angka publik berubah). CHECK SQLite tak boleh subquery: isi larik kendala dijaga trigger. 'x in objek' meloloskan kunci prototipe (constructor): pakai Object.hasOwn. Antrean cron di menit 16 (invokasi sendiri) karena parse konsesi2026/<prov>.json 2,5 MB; titik_n = max(lama, jendela 24 jam) karena putaran tumpang. Chrome headless + CDP lewat WebSocket Node, wrangler dev --var ADMIN_TOKEN mengganti secret .dev.vars untuk uji layar.
- 2026-10-19 · 2026-10-19 · Perbaikan Ruang Posko: gerbang centurisk97.id kini DEFAULT TERTUTUP (PUBLIK_TANPA_SESI = daftar putih bernama); body dibaca per byte (bacaBytes) dan kelebihan dibuang sampai 8x batas karena workerd/undici memutus keep-alive (ECONNRESET/EPIPE) bila body belum terbaca; export angka dari worker.js ditolak workerd ('map entry ... not function'), jaga export hanya fungsi/objek. Uji agregat yang mengukur selisih harus mulai dari lembar bersih: baris disisipkan langsung tak teragregasi mengotori baseline.
- 2026-10-19 · 2026-10-19 · assets.run_worker_first berupa LARIK (mis. ["/*.html"]) ditolak wrangler@3 terbaru (3.114.17: 'Expected boolean'); hanya wrangler 4.x menerimanya, sedangkan terbit.yml deploy produksi pakai wrangler@3. Jangan taruh larik di wrangler.jsonc sebelum deploy pindah ke 4.x. Cek: ./node_modules/.bin/wrangler deploy --dry-run. Sisi Worker (halamanTerkunci menolak *.html di host terkunci, /lapangan.html -> /lapangan) sudah ada dan teruji.
- 2026-10-19 · 2026-10-19 · Lapor Warga multi-bahaya (0020): BAHAYA diturunkan dari registry lewat top-level await di public/informasi_jenis.js (node: import src/bencana.generated.js; peramban: fetch /bencana.json; pemisah typeof document). Membangun ulang laporan (CHECK) WAJIB menyalin kontak+suara ke tabel cadangan dulu: DROP TABLE laporan menjalankan DELETE implisit yang MENGALIRKAN ON DELETE CASCADE dan menghapus anak diam-diam; trigger kontak/suara yang menyebut laporan harus dibuang dulu dan dibuat lagi, induk (FK diri) diisi UPDATE sesudah semua baris masuk. Kata 'gempa' kini muncul di migrasi laporan: filter /gempa/ di gempa.test memilih statement migrasi 0009 harus mengecualikan 'laporan'. Tab Informasi di halaman bencana baru sengaja belum ada (disembunyikan pemilik).
- 2026-10-19 · Dummy per bencana (19 Okt 2026): POST /api/foto/dummy menerima {bencana}; gerbang 'sudah ada' per bencana, hapus = semua. Aset di /img/dummy/<id>/NNN.jpg, jumlah di JUMLAH_DUMMY (src/foto.js) dijaga uji terhadap kredit.json. Uji jumlah-baris-semula menangkap foto_aduan yatim (tanpa FK) yang lolos uji lama. Thumbnail Commons 800px ~180KB: 93 foto = 16 MB, dikompres sips lebar 640 q50 jadi 5,2 MB. Impor src/foto.js langsung dari uji = ReferenceError lingkar dengan worker.js: baca JUMLAH_DUMMY lewat regex. public/img/dummy/** tanpa pemilik di ilmu.mjs. Karhutla: 011,014,039,073,082,095.jpg hilang (f011/f014/f092/100-102 salah nama) -> thumbnail 404 untuk index itu.
- 2026-10-19 · 2026-10-19 · Arsip CAP (0021 cuaca_arsip) + MAGMA gunung api (src/gunungapi.js). CAP diarsipkan di DUA titik: saat masuk (batch terpisah dari nowcast aktif supaya migrasi belum jalan tidak menjatuhkan nowcast) dan menyapu baris yang akan dihapus (menutup CAP sebelum 0021). Poligon arsip <=8 cincin x <=12 titik, bbox dari titik asli; /api/cuaca/arsip menolak parameter asing agar kunci cache tepi tak bisa dibengkakkan. MAGMA: tulis hanya baris yang berubah (~48 tulis/hari), kemunculan pertama bukan peristiwa, <40 gunung terurai = dianggap gagal; kenaikan = gunungapi_ubah.naik=1 (kenaikanGunungapi() untuk ews nanti). Uji cron nowcast hanya jalan di menit kelipatan 10 dan CAP fixture dihapus bila scheduledTime > expires+6 jam: tick uji harus di jendela hidup CAP. Stempel sehat MAGMA memakai cuaca_sumber kunci 'gunungapi' (galat: 'gunungapi_galat'). Gerbang cakupan tidak menangkap rute /api/cuaca/arsip otomatis, hanya tabel.
