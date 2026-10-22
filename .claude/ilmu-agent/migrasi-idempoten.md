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
