# Ilmu migrasi-idempoten

> Kelas: pemeriksa · Model: haiku · Definisi: `.claude/agents/migrasi-idempoten.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca migrasi-idempoten`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus migrasi-idempoten "..."`.

## Peta berkas & tabel

Read-only. Folder `migrations/` (diatur `migrations_dir` di `wrangler.jsonc` dan `wrangler.warga.jsonc`, D1 `poskowarga`, binding `DB`).

| Berkas | Isi | Catatan |
| --- | --- | --- |
| `0001_warga.sql` | `laporan`, `kontak`, `suara`, `jejak` + 4 indeks + 4 trigger | CHECK `jenis:sub` HARUS sama dengan `public/informasi_jenis.js` |
| `0002_titik.sql` | `titik_terbaru` | satu baris per putaran cron FIRMS |
| `0003_moderasi.sql` | `audit_moderasi` + 2 trigger tolak ubah/hapus | nomor 0003 |
| `0004_statistik.sql` | `stat_hari` (WITHOUT ROWID), `laju`, `stat_tamu`, `stat_garam`, `stat_ip` | |
| `0005_pesan.sql` | `pesan` | |
| `0006_statistik_halaman.sql` | bangun ulang `stat_hari` (tabel baru -> salin -> DROP -> RENAME) | CHECK `hal` diperlebar |
| `0007_foto.sql` | `foto`, `foto_suka`, `foto_komentar`, `foto_aduan`, `audit_foto`, `foto_laju` + 8 trigger | sudah tracked sejak `f0a878a` |

Penomoran sekarang `0001`..`0007`, tanpa celah dan tanpa ganda (periksa: `ls migrations | cut -c1-4 | sort | uniq -d` harus kosong). TIDAK ADA satu pun `IF NOT EXISTS` di tujuh berkas (`grep -c "IF NOT EXISTS" migrations/*.sql` = 0 semua); jumlah `CREATE`: 15/1/4/6/2/1/20.

Cara jalan: `npx wrangler@3 d1 migrations apply poskowarga --remote` (produksi) atau `... --local -c wrangler.warga.jsonc` (lokal), dijalankan MANUAL oleh pemilik (WARGA.md baris 48, 83, 156, 193). Tidak ada langkah `d1 migrations apply` di `.github/workflows/*` (`terbit.yml` hanya terpicu oleh perubahan `migrations/**` lalu `wrangler deploy`, tidak menerapkannya).

Uji yang membaca migrasi: `tests/warga/_bantu.mjs` `migrasi()` menggabungkan SEMUA `*.sql` terurut nama, `pecah()` memecah per pernyataan (trigger `BEGIN..END;` utuh). `skema.test.mjs` memasangnya ke SQLite `:memory:`, `gerbang.test.mjs` memetakan setiap `CREATE TABLE|TRIGGER` ke `cakupan.json`.

## Aturan & invarian

- **Idempoten di sini = terjaga tabel `d1_migrations` milik wrangler,** bukan `IF NOT EXISTS`. Wrangler menjalankan tiap berkas SEKALI, berurutan nama, dalam satu transaksi (gagal di tengah = tidak ada yang berubah; komentar 0006). Karena itu: berkas yang sudah diterapkan tidak boleh diubah isinya ataupun namanya; perubahan = berkas baru bernomor berikutnya (`0008_...`).
- Roster/agen menuntut `CREATE ... IF NOT EXISTS`; kenyataannya repo tidak memakainya. Jangan melaporkan 7 berkas ini sebagai pelanggaran massal; laporkan hanya berkas BARU yang menyalahi gaya yang disepakati (konfirmasi dulu ke orkestrator: tambahkan `IF NOT EXISTS` di migrasi baru tidak merusak, tapi menyembunyikan salinan ganda).
- Nomor urut: awalan 4 digit, tanpa celah, tanpa ganda, nama `NNNN_topik.sql`. Berkas dengan akhiran ` 2` / `* 2.sql` adalah salinan nyasar Finder/iCloud, BUKAN migrasi.
- SQLite tidak bisa mengubah CHECK lewat `ALTER`: jalur resmi = `CREATE TABLE baru` -> `INSERT ... SELECT` -> `DROP TABLE lama` -> `ALTER TABLE ... RENAME` (pola `0006`). Pastikan tabel lama tanpa trigger/FK/indeks yang ikut hilang (0006 memeriksanya di komentar), dan definisi kolom lain SAMA PERSIS.
- CHECK yang melibatkan kolom bisa-NULL memakai `coalesce(...)` (0004 `dim`, 0007 `durasi`); CHECK dengan NULL lolos diam-diam.
- Tabel yang CHECK enum-nya beku (`jejak.aksi`) tidak diperluas; buat tabel laju baru (`laju` 0004, `foto_laju` 0007).
- Trigger audit (`audit_tetap_*`, `audit_foto_*`) tidak boleh dilemahkan: jejak audit hanya boleh ditambah.
- Waktu = ms epoch UTC `INTEGER`; id publik `TEXT` hex; tidak menyimpan IP mentah (kolom `ip_hash` panjang 64).
- Migrasi baru wajib punya uji yang menjalankannya (SQLite sungguhan), dan tiap tabel/trigger barunya masuk `tests/warga/cakupan.json`.
- Berkas migrasi tidak boleh berakhir tanpa `;` (`pecah()` melempar galat).

## Ranjau yang pernah meledak

- **`0003_moderasi 2.sql`** (isi identik dengan `0003_moderasi.sql`, hasil salinan Finder yang ikut commit `b6f645f` "gas"): `d1 migrations apply` mencoba `CREATE TABLE audit_moderasi` dua kali dan gagal. Dicabut di `3b90271` ("hapus 39 berkas salinan ' 2'"); `.gitignore` kini punya `* 2` dan `* 2.*`. Yang tersisa di tracked tree: hanya `0003_moderasi.sql`. Periksa ulang dengan `git ls-files migrations | grep " 2"` (harus kosong). Ingat: `.gitignore` tidak melepas berkas yang SUDAH tracked.
- **`0007_foto.sql`** tracked sejak `f0a878a` (tidak untracked per 2026-10-15). Jaga: berkas migrasi baru yang belum di-`git add` tidak ikut CI/terbit; `git status --short migrations` harus kosong sebelum deploy.
- **Deploy tanpa migrasi:** kode `foto.js` baru jalan di produksi tetapi `0007` belum diterapkan -> `bersihkanFoto` meledak. Worker menjaganya (`scheduled` membungkus `bersihkanFoto` dengan try/catch, komentar "migrasi 0007 belum jalan = cron lain tetap jalan"), tapi rute `/api/foto*` tetap 500. Urutan benar: terapkan migrasi dulu, baru deploy (WARGA.md §Foto).
- **`stat_hari` dibangun ulang (0006)** karena CHECK `hal` tak bisa di-ALTER; uji `migrasi 0006: stat_hari dibangun ulang, data utuh, CHECK halaman diperlebar` menjaganya. Memperlebar `hal` lagi (mis. halaman baru di `HAL` statistik.js:17) berarti migrasi `0008` dengan pola yang sama, bukan menyunting 0006.
- **CHECK `kedaluwarsa <= dibuat + 604800000`** di `laporan`: `J.umur` (jam) di `public/informasi_jenis.js` dipakai `buat()` untuk `kedaluwarsa`; umur di atas 168 jam membuat INSERT gagal (500) kecuali tabel dibangun ulang.
- **Katalog `jenis:sub` ganda sumber** (`0001` + `public/informasi_jenis.js`): menambah sub-jenis tanpa migrasi baru -> ditolak DB. Uji `tiap pasangan jenis:sub di katalog diterima CHECK` menangkapnya, tapi memperbaikinya butuh tabel dibangun ulang (CHECK tabel `laporan`, bukan ALTER).

## Gerbang yang menghakimi

- `node --test tests/warga/skema.test.mjs` (13 uji; menjalankan seluruh migrasi apa adanya di `node:sqlite`; migrasi kembar akan gagal di sini karena `CREATE TABLE` ganda).
- `node --test tests/warga/gerbang.test.mjs`: tiap `CREATE TABLE|TRIGGER` baru wajib di `cakupan.json`.
- `npm run uji:warga` (semua lapisan, termasuk D1 miniflare yang memakai `migrasi()` yang sama).
- Pemeriksaan manual cepat: `ls migrations`, `git ls-files migrations`, `git status --short migrations`, `grep -n "IF NOT EXISTS\|DROP\|ALTER" migrations/*.sql`, `git diff --stat origin/main -- migrations` (yang sudah ada di `origin/main` tak boleh berubah).

## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode (migrations/0001-0007, tests/warga/_bantu.mjs, WARGA.md). Temuan: tidak ada IF NOT EXISTS di 7 berkas (idempotensi dijaga d1_migrations); duplikat `0003_moderasi 2.sql` sudah dicabut di 3b90271; 0007_foto.sql tracked.
- 2026-10-16 · Berkas migrasi baru tanpa nomor 0009 (0008 lalu 0010) lolos wrangler tapi melanggar aturan tanpa celah; rename sebelum pertama kali diterapkan aman karena belum ada baris d1_migrations.
- 2026-10-19 · Migrasi baru + kode pemakainya belum di-git add (2026-10-19, 0016_sihka.sql dan src/sihka.js ?? ). Sebab: sesi kerja tidak commit. Akibat: CI/terbit tidak melihat keduanya; deploy tanpa migrasi membuat cron sihka gagal. Cara tahu: git status --short migrations src/sihka.js.
- 2026-10-19 · Cek status produksi migrasi D1 tanpa menerapkan: 'npx --no-install wrangler d1 migrations list poskowarga --remote -c wrangler.jsonc' (read-only). Per 19 Okt 2026 produksi berhenti di 0021; 0022-0026 pending.
- 2026-10-21 · Prefiks nomor ganda 0023 dan 0024 sudah tracked dan pending di produksi (wrangler d1 migrations list --remote, read-only). Wrangler menerapkan per nama lengkap jadi jalan, tapi melanggar aturan tanpa-ganda. Cara tahu: ls migrations | cut -c1-4 | sort | uniq -d.
- 2026-10-22 · Kontrak docs/bnpb/RENCANA-LANJUT.md §1.1 harus disamakan dengan isi migrasi setiap kali berkas baru menambah tabel: 0043 menambah kabar_terkirim yang tidak tercatat di §1.1. Cara tahu: bandingkan tabel CREATE di berkas dengan baris §1.1 yang bernomor sama.
- 2026-10-22 · 2026-10-22 · Diminta cek 'kontrak §1.1 hanya sampai 0044' ternyata salah: §1.1 sudah memuat 0044-0046 (RENCANA-LANJUT.md:46-49). Cara tahu: grep -n '004[3-6]' docs/bnpb/RENCANA-LANJUT.md sebelum melapor drift. Premis pengguna perlu diperiksa dulu.
- 2026-10-22 · Migrasi baru tanpa git add tidak masuk CI/terbit: cek git status --short migrations sebelum deploy. Duplikat prefiks 0023/0024 (tracked, pending prod) melanggar aturan tanpa-ganda walau wrangler menerapkan per nama lengkap.
- 2026-10-22 · Staged edit pada migrasi yang sudah terapkan di prod: 0037 dan 0039 (git status M di index, HEAD 5397efc1) menambah kolom ke CREATE TABLE IF NOT EXISTS. Prod (wrangler d1 migrations list --remote, read-only) tidak lagi menampilkan 0037/0039 sebagai pending, jadi kolom baru tidak pernah jalan di prod. Cara tahu: git diff --cached -- migrations, lalu cek daftar pending remote.
- 2026-10-22 · Trigger UPDATE OF <kolom> hanya terpicu bila kolom itu ada di SET: ralat+hash lewat di lkb_hari dikunci, status/prioritas tidak. Tabel tanpa trigger DELETE (lkb_hari) bisa kehilangan baris dikunci; cara tahu: uji node:sqlite DELETE pada status dikunci dummy=0.
- 2026-10-22 · Gerbang beku (tests/warga/migrasi_beku.json) memakai JSON di repo yang sama: edit berkas + hash di json dalam satu commit lolos. Sebab: baseline tidak dijangkarkan ke git/d1_migrations. Cara tahu: git show HEAD:migrations/0029 hash != beku. Hash 0001-0049 selain 0029 cocok HEAD.
- 2026-10-27 · 2026-10-27 · Migrasi yang menulis penanda waktu lewat strftime('now') tidak deterministik antar DB: nilai = saat diterapkan (lokal, uji, produksi beda). OR IGNORE menjaga replay tidak menggeser, tapi tanggal 'sejak' bisa mendahului deploy kode pemakainya. Cara tahu: grep "'now'" migrations/*.sql, lalu baca komentar berkasnya dan pemakai di src/instansi.js tahanSejak.
- 2026-10-27 · 2026-10-27 · Ilmu menulis 'tanpa celah dan tanpa ganda' tapi repo berisi ganda 0023, 0024, 0040 (0040_kunci_api dan 0040_push) dan celah 0051, 0058. Cara tahu: ls migrations | cut -c1-4 | sort | uniq -d, lalu bandingkan daftar nomor. Pemeriksaan 0062 sendiri tidak terpengaruh: urutannya 0061 ke 0062 bersih.
- 2026-10-27 · Batas panjang teks: JS isian()/tx() mengukur s.length (UTF-16), CHECK length() SQLite menghitung karakter. Karakter astral (emoji) = 2 di JS, 1 di SQLite: lolos guard min-2 JS, ditolak CHECK, batch gagal lalu jadi 500 (bukan 400). Cara tahu: node:sqlite INSERT desa='🔥' kena CHECK; JS tx('🔥').length = 2. Pola CHECK sama ada di 0029:114 pic_nama (belum ditelusuri JS-nya).
- 2026-10-27 · 2026-10-27 · Tabel baru dengan FK ke instansi_akun tanpa ON DELETE memblokir penghapusan akun (D1 menegakkan FK). Sebab: 0065 uji_banjir tidak punya CASCADE sementara 0029 dan 0064 punya. Akibat: DELETE dummy di instansi.js:1610 gagal begitu ada baris uji_banjir. Cara tahu: grep 'REFERENCES instansi_akun' migrations/*.sql, lalu bandingkan dengan DELETE FROM instansi_akun di src/.
- 2026-10-28 · 0070 (rebuild tabel): DROP TABLE IF EXISTS <tabel>_cad di awal membuat ulang skrip menghapus satu-satunya salinan bila putus setelah DROP tabel asli. Uji node:sqlite: putus setelah DROP asli lalu ulang = 6 baris hilang dan tabel utama tidak ada; putus setelah CREATE baru kosong lalu ulang = 6 baris hilang tanpa galat. Cara tahu: uji putus-di-tiap-pernyataan (scratchpad m0070/uji3.mjs). Tanpa IF EXISTS pada DROP cadangan, ulang gagal keras dan cadangan utuh.
- 2026-10-28 · Trigger status yang hanya mengunci status terminal (siap/gagal) tidak menjaga graf transisi: antre->siap tanpa pdf_kunci dan INSERT langsung status=siap diterima node:sqlite. Cara tahu: uji node:sqlite UPDATE/INSERT status pada tabel renlap sebelum migrasi dikunci.
- 2026-10-28 · 2026-10-28 · ilmu.mjs menyelesaikan berkas relatif ke repo utama (ROOT), bukan cwd. Dari worktree, cek 0075 (belum di-track) memberi HILANG dan migrasi_beku.json (diubah di worktree) memberi BARU dengan blob salinan root; catat tidak bisa mencatat berkas yang hanya ada di worktree. Cara tahu: git hash-object worktree vs root pada berkas yang sama; beda = vonis worktree belum bisa dikunci ke blob.
- 2026-10-28 · 2026-10-28 · INSERT OR IGNORE juga membuang diam-diam baris yang melanggar CHECK, tanpa galat (SQLite menerapkan OR IGNORE ke CHECK). Akibat di 0075: uraiCSV menerima t sampai kini+1 jam (titik.js:56), CHECK terlihat>=akuisisi belum ada, jadi granul masa depan tersimpan dengan terlihat<akuisisi lalu jedaSatelit mengklem ke 0 (satelit.js:89) dan menurunkan median. Cara tahu: node:sqlite INSERT OR IGNORE sensor 'X' tanpa galat, count 0; baris masa depan selisih -30 mnt, median 0.
- 2026-10-28 · 2026-10-28 · wrangler d1 migrations list poskowarga --remote dari repo ini gagal: 'account is not valid or is not authorized' (code 7403). Status produksi tidak bisa dibaca; jangan anggap daftar pending dari ledger lama masih berlaku. Cara tahu: CI=1 node_modules/.bin/wrangler d1 migrations list poskowarga --remote -c wrangler.jsonc; log di ~/Library/Preferences/.wrangler/logs.
- 2026-11-01 · Pola rebuild (0070, 0091, 0092 jika ikut): DROP TABLE IF EXISTS <tabel>_cad di awal membuat ulangan setelah putus menghapus salinan satu-satunya; uji: putus setelah DROP tabel asli lalu ulang = baris hilang. Cara tahu: node:sqlite, sisipkan N pernyataan lalu jalankan ulang seluruh berkas dan hitung baris. Perbaikan: DROP _cad tanpa IF EXISTS (ulangan gagal keras, salinan utuh).
- 2026-11-01 · Rebuild tabel (pola 0020) yang memakai 0020 sebagai basis menimpa trigger yang sudah diperbaiki 0069 (suara_tambah). Cara tahu: grep -n 'CREATE TRIGGER' migrations/*.sql per nama trigger, pakai versi TERAKHIR, bukan berkas pembangun tabel. Uji: tests/warga/suara_sybil.test.mjs gagal di 'evakuasi'.
- 2026-11-01 · Pola rebuild yang sudah diperbaiki di satu migrasi (0090, 6adfa442) harus ikut ditiru di migrasi rebuild berikutnya: 0093 sempat menyalin DROP TABLE IF EXISTS <tabel>_cad di awal. Cara tahu: grep -n 'DROP TABLE IF EXISTS .*_cad' migrations/*.sql, lalu uji node:sqlite putus-di-tiap-pernyataan (salinan kedua hilang diam-diam saat tak atomik; D1 menjalankan berkas dalam transaksi, jadi ini laten).
- 2026-11-01 · SQLite dengan foreign_keys=ON: DROP TABLE induk melakukan DELETE implisit sehingga ON DELETE CASCADE pada anak ikut menghapus anak (uji node:sqlite 0094: DROP logbook_kejadian -> logbook_kib dan logbook_sk 0 baris, salinan _cad 1). Rebuild induk harus mencadangkan anak dulu atau tidak memakai DROP langsung di tabel yang punya anak CASCADE. Cara tahu: uji node:sqlite sisipkan anak lalu DROP induk, hitung anak.
- 2026-11-01 · INSERT OR REPLACE dengan id eksplisit yang sudah ada menghapus baris lama lewat jalur REPLACE tanpa memicu trigger DELETE (recursive_triggers mati di SQLite default), jadi trigger append-only wajib juga menutup BEFORE INSERT WHEN EXISTS (SELECT 1 FROM tabel WHERE id = NEW.id). Cara tahu: node:sqlite INSERT OR REPLACE id=1 pada cc_jejak diterima dan baris lama tergantikan; dengan trigger BEFORE INSERT ber-RAISE(ABORT) ditolak.
- 2026-11-01 · Uji Miniflare (pantau.test.mjs, pemirsa.test.mjs, staf_halaman.test.mjs) dalam SATU perintah node --test sempat gagal massal sekitar 0,1 dtk per uji, padahal tiap berkas sendiri hijau (pantau 22/22, pemirsa 7/7). Cara tahu: jalankan per berkas; S1 Chrome juga lulus sendiri sesudah sekali ECONNRESET. Kegagalan gabungan bukan bukti migrasi rusak; ulangi per berkas sebelum melapor.
- 2026-11-02 · Pindah nomor migrasi: tests/warga/migrasi_beku.json dan berkas SQL-nya harus satu commit. Json tanpa berkas gagal gerbang beku 'tercatat tetapi berkasnya hilang' di clone bersih; berkas tanpa json gagal 'belum tercatat'. Cara tahu: git diff --cached -- tests/warga/migrasi_beku.json lalu git status --short migrations; 0097 berstatus ?? sementara json staged = temuan.
- 2026-11-02 · Ilmu lama 0090 (suara_tambah membatalkan 0069) dan 0093 (L5 DROP korban_cadang) sudah tidak berlaku di blob sekarang: 0090 memuat klausa bantuan 0069; 0093 tidak punya DROP cadang di awal. Cara tahu: grep -n bantuan migrations/0090_pesisir.sql dan grep -n DROP migrations/0093_korban_pesisir.sql sebelum melapor; vonis lama dibuang, bukan diulang.
- 2026-11-02 · 2026-11-02 · Nomor migrasi juga dicadangkan di dokumen modul lain, bukan hanya di ls migrations: AGENTS.md §2 dan data/kajian-bnpb/lapangan (DESAIN-TEKNIS.md:16-17, TIKET.md LP-012/LP-020) memesan 0097_lapangan_absen dan 0098_lapangan_panggil, sedangkan 0098 sudah dipakai 0098_pusdalops_gelombang3 (hulu) dan 0097 kosong. Akibat: celah 0097 dan nomor 0098 bentrok saat Lapangan menulis migrasinya. Cara tahu: grep -rnw '0097\|0098' data/kajian-bnpb/lapangan AGENTS.md lalu ls migrations, sebelum mengambil nomor baru.
- 2026-11-02 · Tabel label tanpa FK ke induknya (lapangan_label.sumber_id) tidak ikut terhapus saat orang dicabut: uji node:sqlite DELETE orang menyisakan 1 label yatim. Cara tahu: sisipkan orang, tugas, anggota, absen, logbook, label lalu DELETE FROM orang, hitung lapangan_label.
- 2026-11-02 · Tabel dengan UNIQUE yang memuat kolom nullable (mis. kode_regu) tidak menolak duplikat saat NULL, dan UNIQUE case-sensitive menerima 'Kapuas' vs 'kapuas'. Cara tahu: node:sqlite INSERT dua baris identik dengan kode_regu NULL keduanya DITERIMA (0079). Perbaikan memerlukan rebuild tabel (pola 0006), bukan ALTER, jadi putuskan NOT NULL/COLLATE NOCASE sebelum tabel terisi.
- 2026-11-09 · Peta berkas di ilmu (Penomoran 0001..0007) sudah usang; sumber kebenaran nomor = ls migrations (0112 terakhir). Duplikat nomor pra-ada di main: 0023, 0024, 0040, 0062; celah 0051. Jangan dianggap temuan 0112.
