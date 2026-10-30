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

Dipadatkan 30 Okt 2026 (rinci per kasus ada di git log berkas ini). Dikelompokkan per kelas; kasus baru tambahkan lewat `ilmu.mjs kasus`.

### Router & rute
- Router `rute()` hanya mengenal `:id` 16 heks di AKHIR jalur dan hanya GET/POST; kunci tanpa `-`/hanya `[\w/:]` terbaca regex gerbang. Jalur bersarang diakali: aksi sebelum id (`/api/alun/<aksi>/:id`, `/api/sippa/gerak/:id`), POST `/:id` untuk koreksi, atau regex khusus di `rute()` (`/renlap/:id/pdf`, `/api/sippa/data/:nama`, token lacak 36 heks lewat `halamanLacak` + header `x-lacak`).
- Cookie `sesi_instansi` hanya Path=`/instansi` dan `/api/instansi`: rute yang dipanggil klien `/instansi` WAJIB di bawah `/api/instansi` (alias `/api/instansi/laporan/*`, `/api/instansi/korban`).
- `/ubin/` dipasang paling awal di `fetch()`; `head()` dulu lalu `get({range})`; Cache API menolak `put()` 206 (simpan 200 bertanda `x-ubin-status`).
- `assets.run_worker_first` berupa larik ditolak wrangler@3 (3.114.17); hanya 4.x. `terbit.yml` pakai @3: jangan taruh larik.
- Auth `adminOK` PERTAMA sebelum validasi param (tamu tak boleh membedakan 400/404); rute R2 tanpa bucket = 503; rute khusus-login = `adminOK` ATAU `pemirsaSesi` (risiko7).
- Daftar secret akun gerbang satu definisi (`akunGerbang`, worker.js) dipakai `adminOK` DAN `modOK`, kalau tidak `AKUN_SITUS_<NAMA>` lolos sebagai moderator. Gerbang centurisk97.id DEFAULT TERTUTUP (`PUBLIK_TANPA_SESI` daftar putih). Rute lama dibuka untuk staf lewat `modAtauStaf`/`stafNyata` (saring dummy=0, akun gerbang tetap 403; Meja Pantau pakai `modOK`).
- Body dibaca per byte (`bacaBytes`), kelebihan dibuang sampai 8x batas: workerd/undici memutus keep-alive bila tidak. Login: periksa sandi DULU, penguncian per username+IP; sandi CSV wajib diganti (`wajib_ganti`); login terkunci tidak menulis `laju` lagi.
- Gerbang WA: tulis lewat `x-wa-kunci`, baca `adminOK` atau Bearer `WA_MESIN` (banding sha); idempotensi (dari,diterima,teks,nama_berkas) dicek SEBELUM put R2. Tanggal `wa_masuk` = tanggal isi bila dalam [terima-14h, terima+1h]. Daftar objek R2 per tanggal: customMetadata + `list(include)` sekali (50 subrequest Free).
- Aduan 3 suara = sembunyi otomatis wajib Turnstile; jenis bantuan dikecualikan di trigger `suara_tambah` (0069) dan filter `salah>=3`.
- Pemisahan modul impor: worker.js dan modul rute saling impor, uji impor `src/worker.js` SEBELUM modul itu (`RUTE_*` dispread saat evaluasi). Berkas `public/*.js` yang diimpor worker (`pipa/formulir.js`, `pelihara.js`, `pendataan_spek.js`) tidak boleh punya `import("node:...")` literal/dinamis (pemindai Miniflare/wrangler menolak): pakai `process.getBuiltinModule`. Tiap impor baru `src/`->`public/` WAJIB masuk daftar `copyFileSync` di `tests/warga/api.test.mjs` ('registry salinan', ~baris 494); gejala: 6 uji api.test berantai ENOENT.

### Migrasi & skema D1
- ALTER ADD COLUMN tidak idempoten: pakai tabel samping (`tugas_kartu` 0041, `tugas_bencana` 0047, `lkb_*` 0048 kembar `lk_*`) atau simpan di JSON kartu. CHECK tak bisa diubah (`pemirsa.tab` json_array_length<=7: TAB 8 tetapi `cekTab` max 7; laju baru lewat `laju_bnpb`, `laju_posko.aksi` CHECK 3 nilai beku).
- Membangun ulang tabel: tabel sementara + INSERT OR IGNORE + DROP + RENAME + trigger IF NOT EXISTS (0054); `ALTER ... RENAME` memeriksa SELURUH skema, jadi bangun ulang lewat `CREATE TABLE AS` cadangan (0070). Uji 'tanpa migrasi X' harus ikut membuang migrasi yang bergantung (0043 butuh 0029; DROP `penugasan` butuh buang anak ber-FK 0041/0042 dulu).
- `pecah()` memotong di baris berakhir `;`: komentar `--` taruh di baris sendiri. CHECK tak boleh subquery (isi larik dijaga trigger). Cakupan.json memindai SEMUA `CREATE TABLE`; 'diuji' harus AWALAN nama uji persis. Nomor migrasi baru: `ls migrations` tepat sebelum menulis (sesi lain mengambil 0067); hash di `migrasi_beku.json`.
- FK: `gudang.akun_id ON DELETE CASCADE` (🧹 dummy instansi menghapus akun); `alat_jejak` sengaja tanpa FK; sumber polimorfik (`foto_label` 0071) tanpa FK -> statistik JOIN CTE sumber.
- Jalur tulis lama yang bergantung tabel baru: jangan sisipkan statement tabel baru bila fitur tak dipakai; kerjakan SESUDAH batch dengan try/catch 'no such table'. Fallback CREATE TABLE harus ada di jalur tulis PERTAMA (kasus `sungai_meta` 0066: `simpan()` gagal tertelan di `cuaca_sumber`; uji `sungai_tanpa_migrasi.test.mjs`).
- Alur status dijaga trigger BEFORE UPDATE (riset PT 0025, Meja Kerja 0026) dan diuji semua pasangan terhadap spek JS; jejak `INSERT..SELECT..WHERE changes()>0` dalam batch supaya UPDATE kalah balapan tak menulis jejak palsu. Balapan deterministik: TRIGGER AFTER INSERT di `laju_bnpb` mengubah baris sumber (409 pasti). Balapan dua staf tidak bisa dipaksa di workerd; uji invarian rantai `dari_status`.
- Kunci idempoten luring: (oleh, klien_id) meja_catatan, (catatan_id, klien_id) meja_jejak, `relawan_jam.klien_masuk/keluar`; `meja_stok` belum punya klien_id (tambah UNIQUE (gudang_id, klien_id) sebelum diantrekan). Dedupe laporan sensitif lewat klien_id + indeks unik pelapor+klien_id. `waktu_klien` dipakai hanya bila <=5 mnt ke depan, <=14 hari.
- Dummy: modul A tidak boleh menulis baris dummy=1 ke tabel modul B (gerbang 'dummy sudah ada'; alun->meja 409): tautkan ke dummy yang sudah ada. Dummy tanpa kolom dummy diberi awalan (`sumber_id` 'dummy|', `dummy_`, kab 'Contoh SLA A/B/C'); tabel tanpa FK dihapus manual. Dummy per bencana: `POST /api/foto/dummy {bencana}`, `JUMLAH_DUMMY` dijaga uji terhadap kredit.json. Agregat neraca regu mengecualikan dummy bila ada laporan asli.
- CHECK `kedaluwarsa > dibuat AND <= dibuat+7 hari`: uji yang menggeser `dibuat` geser juga kedaluwarsa. `meja_id` CHECK length=16 (penanda klaim 'klaim-diteruskan'). Keadaan `prioritas_dampak` = kelas saja, bukan tanggal (bikin baris tiap hari); antrean BPBD pakai jenis itu, keadaan `j<level>`.
- D1/workerd menolak 'no such column' untuk ORDER BY subquery berkorelasi ke kolom luar CTE (node:sqlite lolos): nearest-reading lewat `= (SELECT min(abs(..)))`. FTS5 unicode61 tanpa stemming: uji cari pakai kata persis.

### Kuota & CPU Free
- Subrequest 50, CPU 10 ms, tulis D1 100 rb/hari, baca 5 jt/hari. Push cron dibatasi 40 kiriman + satu batch tulis, sisa lanjut lewat `push_akun.putaran`. Agregat dari tabel besar JANGAN dihitung per permintaan: hitung di cron, simpan satu baris, layani teks JSON apa adanya (`satelit_ringkas`, menit 19 invokasi sendiri; telemetri SIPPA sekali sehari jam 20 UTC, alarm diam tiap jam). Perakitan JSON tanpa parse; `json_extract` untuk isi besar (1,8 MB). 503 publik tanpa nama migrasi (galat umum).
- Hujan 5 menit (`src/hujan.js`, 0068): feed SIHKA hanya bacaan TERAKHIR; curah per interval. `sihka_dasar`: dasar.hari<14 dihitung ulang tiap hari (`DASAR_MUDA_HARI`). DSDA DKI: TINGGI_AIR/SIAGA dalam MILIMETER (bagi 10). Sumber JSON kecil `tarikTeks(url, periksa, 256e3)`; validasi batas kepercayaan: kotak koordinat per sumber, pola id `^[A-Za-z0-9-]{1,37}$`, ambang<1e5, nama dipotong 80 code point. Uji `sungai_resmi_unit.test.mjs`.
- Kabar seketika (`src/kabar.js`): at-most-once = kirim DULU lalu tulis `kabar_terkirim`; gagal masuk `kabar_ulang` (0045). Langganan push milik `instansi_akun`. Push banjir pakai garis dasar `push_banjir` (0064); `status.json` basi >2 hari dilewati.

### FIRMS, status, satelit
- `periksaStatus` (diekspor) membuang kunci basi per sumber: pencatat riwayat baca `hasil.basi`. Registry (`bencana.generated.js`) menambah `sumber_status` berita_<id> (30 jam), cuaca_meta, gunungapi: uji `/api/status` wajib fixture berita_*. `jeda_sensor`: putaran menulis `isi.terakhir_sensor` (semua titik CSV sah SEBELUM masker); sensor tanpa deteksi 24 jam {terakhir:null}; N sejak `SNPP_BERHENTI` (1 Nov 2026 13:00 UTC) {berhenti:true}; `status_riwayat` `jeda_sensor_<kode>` dalam menit. Uji dengan jam buatan, `siapkan()` di luar `test()`. `node --test tests/warga/jeda_sensor.test.mjs`.
- Riwayat granul (0075 `satelit_granul`, `src/satelit.js`): INSERT OR IGNORE via json_each per 800 baris, batch TERPISAH dari `titik_terbaru`, try/catch; `mulai_catat` dari akuisisi TERTUA (1 baris berindeks); jeda terpotong `JENDELA_URAI_JAM=24`; lintasan = gugus celah >45 menit per kelompok; CHECK terlihat>=akuisisi membuang diam-diam. Harian (`hitungJeda`): kunci tanggal WIB, `JENDELA_HARI` 30; respons wajib memuat 'harian' di akhir `Object.keys`. `node --test tests/warga/satelit_granul.test.mjs`.
- Alarm titik panas SIPPA `src/sippa_titik.js` dipanggil dari `perbaruiTitik` (galat ditelan, 0067). Jejak SIPPA tanpa prov: obyek baru butuh saringan wilayah -> tambah ke `SQL_PROV_JEJAK`. Staf wilayah: kit tanpa prov TIDAK terlihat; GET sah tanpa `x-pb`. Log lapangan butuh `jam_pompa` dari klien. Tautan butir Meja Pantau ke `/pipa/<x>` harus anggota `LAYAR_SIPPA`.
- Cron: `/__scheduled` wrangler 3.x pakai waktu nyata; roster salah soal cron (sudah ditulis di Ranjau).

### Modul bisnis (ringkas)
- Instansi (0029): kunci tugas = LOKASI (gabung <=2 km di kab sama); Staf BNPB = tabel `staf` (0030), bukan jenis di `instansi_akun`. Tugas verifikasi di `tugas_kartu.kartu.jenis`; verifikasi tak menurunkan pemadaman, api_ada menaikkan; query karhutla pakai `hanyaKarhutla()`. Gempa ditutup `umurMaksJam` 72 jam (`UMUR_KAJI_CEPAT_JAM`, `tutupKedaluwarsa`). W3 hash media = sha256 byte yang disimpan, UPDATE terpisah menelan 'no such column' (0044). Jangan import() ES module `/inti/kepala.js` dari instansi.js (MIME kosong di server statis tests/bnpb).
- OMC (0033): sasaran_kab baru menghitung ulang prov dari kab baru (bukan gabungan lama). Relawan (0023): CSP longgar Turnstile hanya di `/relawan`. Institusi tunggal (0023/0025): dummy relawan+riset pakai `institusiDummy`. Multi-bahaya `BAHAYA` dari registry lewat top-level await `informasi_jenis.js`.
- SIPPA: fase 3 (0073) butir Meja Pantau berkala dihitung saat dibaca (`mingguSiap`), token HP hanya sha256 di D1. `pemegangKode` (bnpb.js) menurunkan huruf kecil kode. Pemeliharaan: umur inspeksi dari `c.kini`.
- Arsip sitrep (R2 `sitrep/`): /api/warga disimpan jenis/benar/salah tanpa geometri; retensi 400 hari (`bersihkanArsipSitrep`); tanggal tak sah (2026-02-30) cek isNaN sebelum toISOString. Arsip CAP (0021) diarsipkan di dua titik, batch terpisah dari nowcast. Layar kinerja satu fetch `/api/sla` per filter; rasio null = 'belum ada data'. `/api/status` 503 hanya untuk sumber kunci basi.
- Label foto: kunci rute `/api/labelfoto`. Statistik 'tak bertambah' bukan bug: `/api/jejak` butuh persetujuan Analitik (`persetujuan.js` SPANDUK=false). `titik_live.js`: pil `#upd` ditulis lewat innerHTML berspan `.pjg`; `S.titikDiambil` antarmuka ke `satelit_lintas.js`.

### Uji & lingkungan
- `gerbang-inti` hanya melihat `git ls-files`: simulasikan berkas baru dengan `git add -N` lalu `git reset`. Helper admin bersama di `public/admin/bersama.js` (naikkan `?v=` di `admin_halaman.js`; `append(null)` menulis 'null'); halaman admin staf lewat `kerangka()` di statistik.js.
- Miniflare tak punya `env.AI` (uji lewat `bacaDokumen` + AI palsu); tak bisa FormData di helper `api()` (pakai `U.mf.dispatchFetch`). `Response.text()` membuang BOM: baca arrayBuffer (EF BB BF); tulis BOM/ZWSP sebagai escape `﻿`.
- Berantai: satu uji merah menyembunyikan sesudahnya; blok baru di bawah `berantai()` sendiri. Uji dengan cache tepi aktif: URL unik per GET. Gerbang bersama: `tests/warga/api.test.mjs` 'daftar admin tak memuat 6281' merah acak karena epoch (bukan regresi, ulang). ECONNRESET workerd di meja.test.mjs flake mesin. `posko.test.mjs` gagal di HEAD (tanggal). 6 gagal konsesi/mcp di worktree sparse (public/data/konsesi2026 tak ada) bukan regresi.
- macOS: `timeout` tidak ada (perintah diam-diam tak jalan); `node_modules` checkout induk berisi berkas iCloud 'dataless' -> miniflare menggantung tanpa error (cek `cat` berkas; jalan keluar `npm ci` di worktree, atau D1 node:sqlite + `worker.fetch`). Jangan `pkill -f node --test`.
- Kasus lama lain (wrangler.jsonc tanpa R2/cron, uji cron 5/10 mnt) sudah tercakup bagian Ranjau.
- 2026-10-30 · Peran staf baru butuh LIMA ubahan sekaligus: migrasi DROP/CREATE trigger staf_larik_sah/ubah (preseden 0085), PERAN di src/staf.js, SEMUA_PERAN di src/admin_halaman.js (kecuali peran yang tak boleh membuka /admin/kinerja, mis. kemitraan), PERAN klien di public/admin/pantau.js, dan pantau.test membaca trigger TERAKHIR. Satu terlewat = peran ditolak diam-diam.
- 2026-10-30 · tests/warga/gerbang.test.mjs hanya memindai rute modul yang terdaftar di daftar bn: modul baru WAJIB ditambah ke sana. Sub-router modul yang harus lolos gerbang situs centurisk97.id dipasang di layani() SEBELUM gerbang, bukan di rute().
- 2026-10-30 · pemegangKode(env, req, modul, kini, maks=300) di src/bnpb.js: batas tebakan kode per modul lewat param maks (kemitraan 60). Pesan 503 publik tanpa nomor migrasi; nomor ke console.error lewat param ketiga lindungi().
