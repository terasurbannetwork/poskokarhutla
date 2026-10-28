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

- 2026-10-15..18 (diringkas, rinci di git log) Cron: wrangler.jsonc produksi tanpa R2/cron FIRMS; uji cron tick 5/10 mnt, /__scheduled wrangler 3.x pakai waktu nyata. Asersi spanduk pakai penanda elemen, bukan includes('pv-kartu'). Port wra … (rinci di git log)
- 2026-10-18 (diringkas) /ubin/ dipasang paling awal di fetch(); head() dulu untuk ukuran lalu get({range}); Cache API menolak put() 206: simpan 200 bertanda x-ubin-status.
- 2026-10-19 (diringkas) SIHKA (src/sihka.js, 0016): D1/workerd menolak 'no such column' bila ORDER BY subquery berkorelasi merujuk kolom luar CTE (node:sqlite lolos, miniflare yang menangkap): nearest-reading lewat '= (SELECT min(abs(..))) … (rinci di git log)
- 2026-10-19 · Registry (bencana.generated.js) menambah sumber_status berita_<id> (ambang 30 jam), cuaca_meta 30 dan gunungapi 30: uji /api/status wajib menyuapi fixture berita_* (beritaSegar di api.test). Asersi 'index.html == berkas denga … (rinci di git log)
- 2026-10-19 · Ruang Posko (0018, src/posko.js): agregat neraca regu harus mengecualikan dummy bila kabupaten punya laporan asli (uji dummy menangkap angka publik berubah). CHECK SQLite tak boleh subquery: isi larik kendala dijaga trigger. … (rinci di git log)
- 2026-10-19 · Perbaikan Ruang Posko: gerbang centurisk97.id kini DEFAULT TERTUTUP (PUBLIK_TANPA_SESI = daftar putih bernama); body dibaca per byte (bacaBytes) dan kelebihan dibuang sampai 8x batas karena workerd/undici memutus keep-alive ( … (rinci di git log)
- 2026-10-19 · assets.run_worker_first berupa LARIK (mis. ["/*.html"]) ditolak wrangler@3 terbaru (3.114.17: 'Expected boolean'); hanya wrangler 4.x menerimanya, sedangkan terbit.yml deploy produksi pakai wrangler@3. Jangan taruh larik di w … (rinci di git log)
- 2026-10-19 · Lapor Warga multi-bahaya (0020): BAHAYA diturunkan dari registry lewat top-level await di public/informasi_jenis.js (node: import src/bencana.generated.js; peramban: fetch /bencana.json; pemisah typeof document). Membangun ul … (rinci di git log)
- 2026-10-19 · Dummy per bencana (19 Okt 2026): POST /api/foto/dummy menerima {bencana}; gerbang 'sudah ada' per bencana, hapus = semua. Aset di /img/dummy/<id>/NNN.jpg, jumlah di JUMLAH_DUMMY (src/foto.js) dijaga uji terhadap kredit.json. … (rinci di git log)
- 2026-10-19 · Arsip CAP (0021 cuaca_arsip) + MAGMA gunung api (src/gunungapi.js). CAP diarsipkan di DUA titik: saat masuk (batch terpisah dari nowcast aktif supaya migrasi belum jalan tidak menjatuhkan nowcast) dan menyapu baris yang akan … (rinci di git log)
- 2026-10-19 · Statistik 'tak bertambah' BUKAN bug worker: hal=publik (hit HTML server-side) terus naik, tapi karhutla/banjir dll. hanya ditulis POST /api/jejak yang butuh persetujuan Analitik, dan public/persetujuan.js punya SPANDUK=false … (rinci di git log)
- 2026-10-19 · Rute RUTE dikunci lewat id 16-hex di AKHIR jalur (worker.js rute()): sub-aksi seperti balas/upvote/lapor ditulis /api/alun/<aksi>/:id, bukan /api/alun/:id/<aksi>. Teks utas >280 harus lewat bersihTeks per potongan (alun.js be … (rinci di git log)
- 2026-10-19 · Riset PT (0025): alur status dijaga trigger BEFORE UPDATE OF status dan diuji dengan 8x8 pasangan terhadap ALUR di JS; jejak ditulis 'INSERT..SELECT..WHERE changes() > 0' dalam batch supaya UPDATE yang kalah balapan tidak men … (rinci di git log)
- 2026-10-19 · Meja Kerja (0026): satu CHECK gabungan (meja,status) + satu trigger BEFORE UPDATE berisi daftar pasangan 'meja:dari>ke' menjaga transisi di D1; uji membandingkan SEMUA pasangan meja x status dan dari x ke terhadap spek (src/m … (rinci di git log)
- 2026-10-19 · Relawan (0023): halaman pendaftaran butuh CSP longgar untuk Turnstile (challenges.cloudflare.com) karena CSP bersama bnpb.js melarangnya; dilonggarkan hanya di /relawan bila TURNSTILE_SITEKEY diset. UPDATE anonimkan harus lol … (rinci di git log)
- 2026-10-20 · Meja Kerja C8: tanda berbasis waktu membuat agregat tulis-saja salah (baris diam tak pernah ditandai >24 jam), jadi meja_ringkas dibangun ulang per kelompok tiap tulis + penuh tiap jam/lewat 2 jam; uji yang mengubah dibuat le … (rinci di git log)
- 2026-10-20 · C7 institusi tunggal: institusi + institusi_perjanjian di 0023, mitra_riset.institusi_id FK di 0025. Dummy dibagi: dummy relawan dan riset memakai institusi dummy bernama sama (institusiDummy) dan hapus modul terakhir menghap … (rinci di git log)
- 2026-10-20 · Arsip sitrep: perakitan JSON tanpa parse (sambung teks mentah) menghemat CPU Free; cakupan.json 'diuji' harus AWALAN nama uji persis; tanggal kalender tak sah (2026-02-30) harus dicek isNaN sebelum toISOString atau rute 500
- 2026-10-20 · F6 luring: kunci idempoten meja = (oleh, klien_id) di meja_catatan dan (catatan_id, klien_id) di meja_jejak; relawan_jam punya klien_masuk/klien_keluar. waktu_klien dipakai hanya bila <=5 mnt ke depan dan <=14 hari (meja)/24 … (rinci di git log)
- 2026-10-20 · Dummy modul A tidak boleh menulis baris dummy=1 ke tabel modul B: gerbang 'dummy sudah ada' dan 🧹 modul B ikut terkena (alun->meja 409). Tautkan ke tujuan dummy yang SUDAH ada. Cara tahu: urutan isi bebas di tests/warga/alun.test.mjs.
- 2026-10-20 · Aksi stok Meja (gudang) tidak lewat antrean luring: meja_stok belum punya klien_id unik; bila kelak ya, tambah kolom klien_id + UNIQUE (gudang_id, klien_id) sebelum mengantrekan. stok_awal gudang kini hanya admin; ubahnya jad … (rinci di git log)
- 2026-10-20 · Arsip sitrep (R2 sitrep/) hanya menyimpan /api/warga sebagai jenis/benar/salah tanpa geometri; retensi 400 hari via bersihkanArsipSitrep di bersihSemua; hapus per tanggal lewat POST /api/sitrep/arsip/hapus. Cache tepi ada di … (rinci di git log)
- 2026-10-20 · Rumah rusak (0024): router worker.js hanya GET/POST dan kunci rute tanpa '-' tak terbaca regex gerbang; koreksi = POST /:id. Pakai reguDari (kini export) + adminOK, laju_bnpb untuk batas. Uji modul baru sebelum dikabel: wrapp … (rinci di git log)
- 2026-10-20 · Bangunan (src/bangunan.js): auth adminOK HARUS sebelum validasi prov, kalau tidak tamu bisa membedakan 400/404 dan menebak keberadaan berkas; diuji dengan prov=zz tanpa token = 403. Rute di R2 tanpa bucket = 503. Gerbang caku … (rinci di git log)
- 2026-10-21 · Akun Instansi (0029, src/instansi.js): kunci tugas = LOKASI (gabung <= 2 km di kab sama) karena id K0001 berganti tiap hari; batas laju memakai laju_bnpb (laju_posko.aksi CHECK beku); cookie sesi dipasang DUA kali (Path=/inst … (rinci di git log)
- 2026-10-21 · Hasil 5 pemeriksa Akun Instansi: login memeriksa sandi DULU (penguncian per username+IP, bukan per username: penyerang tak bisa mengunci pemilik); sandi CSV wajib diganti (wajib_ganti) lewat gantisandi yang mengembalikan sand … (rinci di git log)
- 2026-10-21 · Staf BNPB = tabel staf terpisah (0030), bukan jenis di instansi_akun (CHECK 0029 mengunci jenis/dokumen). Rute lama berbasis modOK dibuka lewat modAtauStaf (jalur tambahan, akun gerbang tetap ditolak); bolehTagih untuk admin … (rinci di git log)
- 2026-10-21 · Inventaris alat (0031): gudang.akun_id ON DELETE CASCADE wajib, karena 🧹 dummy instansi menghapus akun dummy dan FK tanpa cascade menggagalkannya; alat_jejak sengaja TANPA FK supaya jejak alat terhapus tetap ada. Dummy invent … (rinci di git log)
- 2026-10-21 · Pengait pada jalur tulis lama (kabar tindakan) yang bergantung tabel baru: JANGAN masukkan statement tabel baru ke batch bila fitur tak dipakai, dan lepas-alat saat padam dijalankan SESUDAH batch dengan try/catch no such tabl … (rinci di git log)
- 2026-10-21 · Rute lama yang dibuka untuk staf (staf.js stafNyata): saring dummy=0 untuk staf nyata; login yang sudah terkunci tidak menulis baris laju lagi; Meja Pantau pakai modOK bukan adminOK (akun gerbang 403). Cara tahu: tests/warga/ … (rinci di git log)
- 2026-10-21 · Cookie sesi_instansi hanya Path=/instansi dan /api/instansi: rute yang dipanggil klien /instansi WAJIB di bawah /api/instansi (Laporan Karhutla 0032: alias /api/instansi/laporan/*; korban: /api/instansi/korban dan /api/instan … (rinci di git log)
- 2026-10-21 · pecah() migrasi memotong di baris berakhir ';': komentar '-- ...' di belakang CREATE INDEX ...; menyatukan dua statement (D1_ERROR incomplete input saat siapkan()). Taruh komentar di baris sendiri. Snapshot beku: uji yang men … (rinci di git log)
- 2026-10-21 · Uji balapan deterministik tanpa hook: pasang TRIGGER AFTER INSERT pada laju_bnpb (laju() ditulis antara BACA baris dan TULIS batch) yang mengubah baris sumber, sehingga kunci optimistis dan hapus atomik teruji pasti 409; Prom … (rinci di git log)
- 2026-10-21 · OMC (0033): ubahan sortie yang mengirim sasaran_kab baru tidak boleh menggabung prov lama, kalau tidak staf berwilayah bisa memindahkan sortie keluar wilayahnya lewat gabungan prov; prov dihitung ulang dari kab baru (uji 'wil … (rinci di git log)
- 2026-10-21 · Gerbang-inti hanya melihat git ls-files: berkas baru lolos sampai di-add. Simulasikan dengan git add -N lalu git reset. Helper admin bersama taruh di Admin (public/admin/bersama.js), naikkan ?v= di admin_halaman.js.
- 2026-10-21 · append/replaceChildren(null) menulis teks 'null': bersama.js menyaring di prototipe. Halaman admin yang dibuka staf wajib lewat kerangka() di statistik.js (bukan halaman statis), supaya lencana, menu, dan Keluar benar. Rincia … (rinci di git log)
- 2026-10-21 · Perubahan pekerja lain di src/instansi.js (padam wajib media) mematahkan KABAR padam di inventaris.test.mjs; helper media() menyisipkan baris instansi_media langsung. Privasi nama korban dijaga uji: hanya src/korban.js yang b … (rinci di git log)
- 2026-10-21 · Dedupe laporan sensitif harus lewat klien_id dari klien (+ indeks unik pelapor+klien_id), bukan kecocokan isi: dua kejadian berbeda berangka sama tidak boleh melebur. Snapshot laporan karhutla: dampak korban hanya ditambahkan … (rinci di git log)
- 2026-10-21 · Penugasan/pelacak GPS (0035): token 36 hex tidak cocok regex id 16 hex router, jadi /lacak/<token> ditangani di rute() lewat halamanLacak dan API membawa token di header x-lacak. Kolom baru tugas_api/instansi_media masuk 0029 … (rinci di git log)
- 2026-10-22 · Pengingat F2: keadaan prioritas_dampak = kelas saja (bukan tanggal data, itu bikin baris baru tiap hari); sumber_id dummy diberi awalan 'dummy|' karena UNIQUE (jenis,sumber,keadaan) tidak membedakan dummy dan INSERT OR IGNORE … (rinci di git log)
- 2026-10-22 · DROP TABLE penugasan di uji 'tanpa 0035' gagal 500 'no such table: main.penugasan' bila ada tabel anak ber-FK (penugasan_darurat 0041, ops_* 0042): jatuhkan semua tabel dengan 'REFERENCES penugasan (' dulu. Regex 'no such tab … (rinci di git log)
- 2026-10-22 · API v1/MCP: laju_posko punya CHECK aksi tetap (tak bisa 'kunci_gagal'), pakai laju_bnpb (aksi bebas). worker.js dan modul rute saling impor: uji harus mengimpor src/worker.js SEBELUM modul itu (RUTE_* dispread saat evaluasi). … (rinci di git log)
- 2026-10-22 · Audit bisnis 22 Okt: meja_id CHECK length=16 sehingga penanda klaim atomik harus 16 karakter ('klaim-diteruskan'); status ops_permintaan yang sudah diteruskan disalin ke meja_catatan+meja_jejak dalam batch yang sama. Pengunci … (rinci di git log)
- 2026-10-22 · Web Push di Worker tanpa pustaka: subrequest akun Free 50, jadi cron push dibatasi 40 kiriman + satu batch tulis, sisa dilanjut menit berikutnya lewat penanda push_akun.putaran. Uji dekripsi RFC 8291 dengan HMAC manual node:c … (rinci di git log)
- 2026-10-22 · ALTER TABLE ADD COLUMN tidak idempoten: insiden/kartu di tabel samping tugas_kartu (0041, pola 0027). Versi berkas dicek dengan mengintip awal berkas (dibuat ditulis pertama) tanpa r.json(); uji lama yang memakai dibuat sama … (rinci di git log)
- 2026-10-22 · Layar kinerja memakai SATU fetch /api/sla per filter (hari, prov); pindah tab hanya menggambar ulang dari DATA lewat nanti(), jadi tab tidak mengulang jaringan. Rasio null harus tampil 'belum ada data', bukan 0 atau tanda hub … (rinci di git log)
- 2026-10-22 · periksaStatus membuang kunci basi per sumber (const {basi, ...o}); pencatat riwayat harus membaca hasil.basi (daftar nama), bukan sumber[x].basi, atau semua sumber tercatat segar. Tahu dari: tests/warga/sla.test.mjs, cron men … (rinci di git log)
- 2026-10-22 · Migrasi yang ALTER tugas_api (0043) tidak bisa diterapkan tanpa 0029; uji 'tanpa migrasi 0029' di instansi.test.mjs harus ikut membuang 0043. Kode yang menyebut kolom 0043 (terdeteksi_awal dst) wajib dipisah dari INSERT/UPDAT … (rinci di git log)
- 2026-10-22 · Kabar seketika (src/kabar.js): kunci kabar_terkirim diklaim (INSERT OR IGNORE) SEBELUM kirim, hanya untuk penerima bersaluran hidup (push berlangganan atau emailAktif). Langganan push milik instansi_akun saja, jadi Posko pusa … (rinci di git log)
- 2026-10-22 · Dummy /api/sla tanpa kolom dummy: status_riwayat sumber berawalan dummy_, alarm_himawari id berawalan 'dummy', tugas di kab 'Contoh SLA A/B/C' dummy=1 (isian/foto/penugasan/garis CASCADE); tugas_muncul (tanpa FK) dihapus manu … (rinci di git log)
- 2026-10-22 · Koreksi review gel.1 + gel.2: kabar at-most-once = kirim DULU, kabar_terkirim ditulis SESUDAH sukses; saluran gagal masuk kabar_ulang (0045), diulang cron menit per saluran. laju_posko.aksi dikunci CHECK 3 nilai, jadi 'pipa_g … (rinci di git log)
- 2026-10-22 · · W3 hash media = sha256 byte yang DISIMPAN (sesudah EXIF dibuang, bisa dicocokkan dengan unduhan), ditulis lewat UPDATE terpisah yang menelan 'no such column' supaya unggah jalan sebelum 0044 (instansi_media.sha256, lapangan … (rinci di git log)
- 2026-10-22 · Tugas jenis verifikasi disimpan di tugas_kartu.kartu.jenis (bukan kolom baru: ALTER ADD COLUMN tidak idempoten). Penggabungan: verifikasi tidak menurunkan pemadaman, api_ada menaikkan. Bentuk /api/lapangan/tugas dipatok dafta … (rinci di git log)
- 2026-10-22 · Tugas multi-bahaya: jenis bencana di tabel samping tugas_bencana (0047), baris tak ada = karhutla. Semua query yang menyentuh tugas karhutla (verifikasiPadam, butirCekUlang, butirApiMunculLagi) memakai hanyaKarhutla() agar tu … (rinci di git log)
- 2026-10-22 · FTS5 unicode61 tanpa stemming: 'prioritas' tidak cocok 'diprioritaskan'; kolom judul ikut terindeks jadi kueri kata judul memunculkan SEMUA segmen dokumen itu. Uji pencarian harus memakai kata persis. Kutipan model diverifika … (rinci di git log)
- 2026-10-22 · Instansi multi-bahaya: jangan import() ES module /inti/kepala.js dari instansi.js, server statis tests/bnpb menjawab MIME kosong dan 3 uji operasi lapangan gagal; chip memakai titik warna dari /bencana.json. Chip aktif diubah … (rinci di git log)
- 2026-10-22 · Laporan multi-bahaya: sumbu bencana lewat ?bencana= di rute /api/laporan-karhutla/* dan alias /api/instansi/laporan/* (tanpa rute baru di worker.js), tabel kembar lkb_* (0048) karena PK lk_* tak bisa ditambah kolom; handler b … (rinci di git log)
- 2026-10-22 · Gempa tak punya sinyal reda: ditutup lewat umurMaksJam (72 jam, angka KEBIJAKAN UMUR_KAJI_CEPAT_JAM di tugas_bencana.js) oleh tutupKedaluwarsa tiap jam di bersihkanInstansi; Tanpa dampak (bukan_api konfirmasi, tidak_ditemukan … (rinci di git log)
- 2026-10-23 · Migrasi yang membangun ulang tabel (CHECK tak bisa diubah) memakai tabel sementara kunci_api_baru + INSERT OR IGNORE + DROP + RENAME + trigger IF NOT EXISTS (idempoten, 0054). Gerbang cakupan.json memindai SEMUA 'CREATE TABLE … (rinci di git log)
- 2026-10-23 · 2026-10-23 · /api/risiko7 (src/risiko7.js, R2 risiko/*.json): rute R2 khusus-login = adminOK ATAU pemirsaSesi (gerbang yang sama dengan dokumentasi /api), auth PERTAMA agar tamu selalu 401, bukan 503 belum_ada yang membocorka … (rinci di git log)
- 2026-10-26 · Worker yang mengimpor berkas public/ (public/pipa/formulir.js, ADR-03) memecah harness yang menyalin src/ ke direktori sementara: api.test.mjs 'registry salinan' hanya menyalin daftar public/ tetap dan 6 uji berantai jatuh ENOENT. Impor baru dari public/ wajib ditambah ke daftar salin di tests/warga/api.test.mjs (sekitar baris 494). Tahu dari: npm run uji:warga merah di api.test.mjs setelah src/sippa.js masuk.
- 2026-10-26 · Gerbang router worker.js: jalur bersarang dengan id di tengah tidak bisa dicocokkan (:id = 16 heks hanya di ujung), jadi SIPPA memakai aksi sebelum id (/api/sippa/gerak/:id). Uji balapan dua staf serentak tidak bisa dipaksa di workerd + D1 lokal (permintaan berjalan berurutan); yang diuji adalah invarian rantai dari_status tak putus, 409 dibuktikan lewat gerak terencana terbuka dan trigger sippa_gerak_cek di jalur kirim lapangan.
- 2026-10-26 · api.test.mjs 'daftar admin pun tidak memuat nomor WA' (assert !teks.includes('6281')) merah acak ketika epoch ms detik itu memuat 1792976281xxx: bukan regresi, jalankan ulang beberapa menit kemudian. pemegangKode (src/bnpb.js) menurunkan huruf kecil kode, jadi kode huruf besar sama dengan kode sah; uji kode salah pakai karakter non-heks.
- 2026-10-26 · src/ yang mengimpor ../public/*.js (mis. pendataan_spek.js) memecahkan uji 'registry salinan' di tests/warga/api.test.mjs, yang menyalin src/ ke tmp dengan daftar berkas public/ tulisan tangan. Tiap impor baru dari src/ ke public/ wajib ditambah ke daftar copyFileSync itu; gejalanya 6 uji api.test berantai gagal ENOENT.
- 2026-10-26 · Response.text() membuang BOM UTF-8; uji ekspor CSV harus membaca arrayBuffer dan memeriksa byte EF BB BF. Berkas yang ditulis lewat alat Write bisa memuat karakter tak terlihat (BOM, ZWSP) literal: tulis sebagai escape \uFEFF di sumber.
- 2026-10-26 · Rute /api/sippa/data/:nama: router worker.js hanya mengenal :id 16 heks, jadi nama berkas butuh regex sendiri di rute() (kunci tabel ':nama'). Staf wilayah: kit tanpa prov TIDAK terlihat (dalamWilayahStaf(req,[]) false untuk berwilayah). GET staf sah tanpa x-pb (hanya tulis wajib). Cek: npm run uji:warga, tests/warga/sippa.test.mjs
- 2026-10-26 · Miniflare menggantung tanpa error di mesin ini: membaca berkas node_modules checkout induk (semver/internal/debug.js) memblokir read() (berkas dataless atau tak termaterialisasi), jadi uji tests/warga berbasis siapkan() timeout tanpa pesan. Cek: cat berkas itu tergantung. Pengganti: D1 node:sqlite + worker.fetch langsung. Jangan pkill -f node --test: itu mematikan uji sesi lain.
- 2026-10-26 · Ringkas telemetri harian memindai seluruh sippa_telemetri (t_akhir tanpa indeks sendiri); dijalankan sekali sehari jam 20 UTC lewat bersihkanSippa(env, sekarang), bukan tiap jam, supaya kuota baca D1 gratis (5 jt/hari) aman sampai ~30 kit. Alarm diam tetap tiap jam (berindeks). Uji memakai scheduledTime jam 20 UTC atau {paksa:true}.
- 2026-10-26 · Berkas public/pipa/*.js yang diimpor worker (formulir.js, pelihara.js) tidak boleh punya import("node:...") literal maupun specifier dinamis: pemindai modul Miniflare (ERR_MODULE_RULE / ERR_MODULE_DYNAMIC_SPEC) dan bundler wrangler menolak; pakai process.getBuiltinModule di blok CLI. Tahu dari: node --test tests/warga/sippa.test.mjs mati di startup.
- 2026-10-26 · Uji sippa.test.mjs berantai: satu uji merah menyembunyikan semua sesudahnya. Blok uji baru taruh di bawah rantai berantai() sendiri (blok { const uji = berantai() }) supaya hasilnya terbaca. Di node_modules main banyak berkas macOS 'dataless' (iCloud): import miniflare menggantung tanpa error; jalan keluarnya npm ci di worktree.
- 2026-10-27 · Log lapangan butuh jam_pompa dari klien (formulir.js), bukan dihitung server: fixture log tanpa jam_pompa membuat jam_sejak_servis = 0 dan uji alur pemeliharaan merah di prasyarat. Dummy aset: umur inspeksi dihitung dari c.kini karena jadwal() dibandingkan dengan hari ini, bukan periode layar.
- 2026-10-27 · Banjir 27 Okt: push 'status banjir naik' pakai garis dasar per akun di push_banjir (0064): akun tanpa baris hanya mencatat, kenaikan dicatat hanya bila ada perangkat 2xx, status.json basi (>2 hari) = lewati.
- 2026-10-27 · Antrean BPBD kejadian aktif memakai jenis prioritas_dampak (CHECK tak bisa diubah), keadaan j<level>, muatan.teks; berkas kejadian hilang/basi mempertahankan baris lama via flag kejadianHilang; asetDengan di pengingat.test.mjs 404-kan kejadian_aktif_awal.json.
- 2026-10-27 · Uji banjir (0065): route petugas harus /api/instansi/* (cookie Path), status peta dibaca server; halaman /uji-lapangan hanya admin/pemirsa jadi petugas instansi murni tak bisa membukanya (keputusan pemilik).
- 2026-10-27 · Jejak SIPPA (pantau_jejak) tak punya kolom prov; GET /api/sippa/jejak menurunkan prov lewat CASE per awalan obyek. Obyek baru yang butuh saringan wilayah harus ditambah ke SQL_PROV_JEJAK. Alarm titik panas SIPPA hidup di src/sippa_titik.js, dipanggil dari perbaruiTitik (galat ditelan, tabel 0067).
- 2026-10-27 · 2026-10-27 · riwayat_kurang 351/423 pos: baris sihka_dasar lahir hari pertama (hari~0), baru dihitung ulang di bucket 14 harinya, dasar mengecualikan 24 jam terakhir. Perbaikan: dasar.hari<14 dihitung ulang tiap hari (DASAR_MUDA_HARI), syarat tak diubah; uji 10 hari gagal di kode lama. Feed SIHKA hanya bacaan TERAKHIR per pos; CURAH HUJAN per interval (4,5 lalu 0), jadi ditarik tiap 5 menit (src/hujan.js, 0068). DSDA+SIPANTAU: src/sungai_resmi.js + sungai_meta (0066), status SQL menggabung pos < 300 m. Migrasi baru: ls migrations tepat sebelum menulis (0067 diambil sesi lain); catat hash di migrasi_beku.json.
- 2026-10-27 · Daftar secret akun gerbang harus satu definisi (akunGerbang di worker.js) dipakai adminOK DAN modOK; modOK yang hanya menolak env.AKUN_SITUS meloloskan AKUN_SITUS_<NAMA> sebagai moderator. Aduan (3 suara = sembunyi otomatis) wajib Turnstile; jenis bantuan (minta/tawar/sehat/padam/evakuasi) dikecualikan di trigger suara_tambah (0069) dan filter salah>=3 di daftar(). Uji dengan cache tepi aktif: pakai URL unik per GET.
- 2026-10-27 · Uji yang memundurkan/memajukan laporan.dibuat via UPDATE harus menggeser kedaluwarsa juga: CHECK kedaluwarsa > dibuat AND <= dibuat+7 hari.
- 2026-10-27 · Prod tanpa migrasi 0066: simpan() di sungai_resmi.js gagal 'no such table: sungai_meta' dan galat tertelan di cuaca_sumber (sungai_dsda/sungai_tng); fallback CREATE TABLE ada di bangunStatus yang jalan SESUDAH perbaruiResmi. Fallback harus ada di jalur tulis pertama. Uji: tests/warga/sungai_tanpa_migrasi.test.mjs (semua migrasi kecuali 0066/0068).
- 2026-10-27 · 2026-10-27 DSDA DKI (datatmalaststatus.json): TINGGI_AIR dan SIAGA1..3 dalam MILIMETER (Katulampa 2000/1500/800 mm = 200/150/80 cm), bagi 10 ke cm; bukan cm seperti dugaan lama. Akumulasi hujan DSDA bukan tinggi air: jangan dicampur ke sihka_baca. Sumber JSON kecil (24-34 KB) memakai tarikTeks(url, periksa, 256e3); validasi di batas kepercayaan: kotak koordinat per sumber (DALAM_INDONESIA lama meloloskan Malaysia), pola id SIPANTAU ^[A-Za-z0-9-]{1,37}$, ambang/v < 1e5, nama dipotong 80 per code point, satu() memotong 500. Uji: tests/warga/sungai_resmi_unit.test.mjs.
- 2026-10-27 · 2026-10-27 jeda_sensor (/api/status): jeda_satelit memakai deteksi terbaru semua sensor sehingga S-NPP telat 4,9-8,3 jam tersembunyi; kini putaran titik_terbaru menulis isi.terakhir_sensor (dari semua titik CSV sah SEBELUM masker/wilayah, titik laut ikut) dan periksaStatus membacanya lewat json_extract (isi sampai 1,8 MB, jangan JSON.parse). umur_jam = dibuat putaran - deteksi, jadi sudah mencampur jarak antar lintasan (bukan murni telat FIRMS). Putaran lama tanpa medan = tanpa jeda_sensor; sensor tanpa deteksi 24 jam = {terakhir:null,umur_jam:null}; N sejak SNPP_BERHENTI (1 Nov 2026 13:00 UTC) = {berhenti:true}. status_riwayat: nama jeda_sensor_<kode>, umur_menit dari umur_jam yang sudah dibulatkan 0,1 jam (2,1 jam = 126 mnt), sensor tanpa umur tidak ditulis. kinerja.js menggambar d.sumber generik: cukup label di NAMA sla.js. Uji dengan jam buatan: periksaStatus kini diekspor; siapkan() harus dipanggil di luar test() (after(dispose) di dalam test mematikan stub: 'poisoned stub'). Cek: node --test tests/warga/jeda_sensor.test.mjs
- 2026-10-28 · 2026-10-28 SIPPA fase 2 (0070): ALTER TABLE ... RENAME memeriksa SELURUH skema, jadi migrasi yang membangun ulang tabel gagal di uji 'tanpa 0029' (trigger gudang_prov_sah merujuk instansi_akun yang sengaja dijatuhkan): bangun ulang lewat CREATE TABLE AS cadangan, DROP, CREATE ulang, INSERT, DROP cadangan. Jejak 'kembali' pinjam harus INSERT..SELECT..WHERE changes()>0 (jejakStmt biasa menulis jejak palsu pada 409). Tautan butir Meja Pantau ke /pipa/<x> harus anggota LAYAR_SIPPA (uji pantau.test). posko.test.mjs gagal juga di HEAD (tanggal), bukan akibat perubahan.
- 2026-10-28 · SIPPA fase 3 (0073): router worker.js hanya mengenal id 16 heks di AKHIR jalur, jadi rute /renlap/:id/pdf dan /selesai butuh regex khusus (rl) di rute(); butir Meja Pantau berkala dihitung saat dibaca (mingguSiap, nol baris di luar Jumat-Senin), bukan cron; token HP 36 heks hanya sha256 di D1, token sah tidak dihitung di penghitung gagal per IP
- 2026-10-28 · 2026-10-28 Label kerusakan foto (0071 foto_label, src/foto_label.js): sumber foto polimorfik tanpa FK (foto, uji_pilot_lapor, instansi_media), jadi statistik/ekspor selalu JOIN ke CTE sumber supaya label foto yang dihapus atau ditolak sesudah dilabel tak ikut dihitung; kunci rute /api/labelfoto tanpa tanda hubung (regex gerbang cakupan hanya baca [\w/:]); modul baru harus ditambah ke daftar bn di gerbang.test.mjs. 'timeout' tidak ada di macOS: perintah 'timeout N node --test | grep' diam-diam tak jalan (salah mengira uji hang). Kegagalan instansi/L1 di uji:warga berasal dari migrasi 0070 sesi lain (DROP TABLE tugas_api terhalang FK), bukan dari 0071.
- 2026-10-28 · titik_live.js: pil #upd ditulis ulang HANYA lewat innerHTML berspan .pjg (textContent merusak label pendek <1500 px). S.titikDiambil (ms, dari live.dibuat) adalah antarmuka ke popover satelit_lintas.js dan harus terisi walau tambah kosong; ambil() melewati fetch bila data statis segar, jadi nilainya bisa undefined (popover jatuh ke meta.dibuat). Uji: vm + inti/format.js asli + stub S/peta/Peta, jalankan lewat callback setInterval 2000/5000.
