# Ilmu penulis-gerbang

> Kelas: platform · Model: sonnet · Definisi: `.claude/agents/penulis-gerbang.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca penulis-gerbang`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus penulis-gerbang "..."`.

## Peta berkas & tabel

**Wilayahmu (roster `milik`):** `tests/agen/**` dan `tests/beban/**`. Uji domain di `tests/warga/**` dimiliki `warga-api`; kalau gerbang barumu perlu menyunting kode domain, laporkan ke pengerjanya.

**Gerbang agen (`npm run uji:agen` = `node --test tests/agen/`), ditulis dengan `import { test } from 'node:test'` + `node:assert/strict`:**
- `tests/agen/gerbang-ilmu-agent.test.mjs` (6 uji): definisi agent + `KATALOG.md` segar terhadap roster; tiap agent punya `.claude/ilmu-agent/<nama>.md` berisi 5 bagian (`## Peta berkas & tabel`, `## Aturan & invarian`, `## Ranjau yang pernah meledak`, `## Gerbang yang menghakimi`, `## Kasus`), TANPA penanda kerangka kosong bawaan dan >= 2000 karakter; definisi memuat protokol ilmu & jejak; tiap berkas kode punya TEPAT SATU pemilik; jejak melewati berkas tak berubah dan memeriksa ulang yang berubah; `AGENTS.md` menulis pengetahuan & otoritas orkestrator.
- `tests/agen/gerbang-model-agent.test.mjs` (2 uji): `env.CLAUDE_CODE_SUBAGENT_MODEL` di `.claude/settings.json` bukan Opus; tiap agent di `.claude/agents/` menulis `model:` di frontmatter (pengerja sonnet, pemeriksa pola haiku).
- Mesinnya: `scripts/agents/build.mjs` (`npm run agents:build` / `agents:check`), `scripts/agents/ilmu.mjs` (`baca`, `pemilik`, `catat`, `kasus`, `cek`), sumber kebenaran `scripts/agents/roster.json`.

**Uji repo (`npm run uji:warga`) sebagai teladan pola:**

| Berkas | Lapisan | Mesin |
| --- | --- | --- |
| `tests/warga/gerbang.test.mjs` | registri cakupan (tanpa DB) | membaca kode sumber dengan regex |
| `tests/warga/skema.test.mjs` | constraint + trigger | `node:sqlite` `:memory:`, SQL migrasi apa adanya |
| `tests/warga/api.test.mjs`, `statistik.test.mjs`, `foto.test.mjs`, `tepi.test.mjs` | rute Worker | `Miniflare` (workerd) + D1 lokal (+ R2 di foto) |
| `tests/warga/klien.test.mjs` | JS klien murni | `node:vm` dengan DOM tiruan minimal |
| `tests/warga/og.test.mjs` | `metaRute` murni | fungsi murni (tidak ada di skrip `uji:warga`) |
| `tests/warga/_bantu.mjs` | `AKAR`, `migrasi()`, `pecah()` | dipakai semua |
| `tests/warga/cakupan.json` | registri | `diuji` / `dikecualikan` / `antre` |

`tests/beban/beban.mjs` + `ukur_muat.mjs`: uji beban 100k kunjungan/hari (lonjakan 50x) tanpa dependensi; menghitung pemanggilan Worker dari log `wrangler dev` berpembungkus. Bukan `node:test`; dijalankan manual (`node tests/beban/beban.mjs http://localhost:8799 --dasar 20 --lonjakan 15 --burst 50 --log log.txt`).

**Teladan self-check Python (stdlib, tanpa pytest):** `scripts/data/fwi.py` baris 142 `if __name__ == "__main__":` dengan `assert` terhadap nilai baku Van Wagner & Pickett 1985 dan rantai 48 hari cffdrs; `scripts/geo/batas.py uji`, `scripts/data/{aturan.py,harian.py uji,posko.py uji}`. CI memanggilnya di `data.yml` langkah "Uji aturan" (`python3 scripts/data/fwi.py` dst.). Banyak skrip lain di `scripts/` punya blok `__main__` (cek `grep -rl "__main__" scripts`).

## Aturan & invarian

- **Aturan pemilik:** perilaku yang tinggal di LUAR TypeScript/JS (skema D1, constraint, trigger, RLS, fungsi SQL, route handler, alur lintas-tabel, rumus Python) wajib punya uji integrasi yang BENAR-BENAR MENJALANKANNYA. Mock meloloskan persis kelas bug yang paling mahal. Uji bermock tidak boleh dijadikan bukti.
- Uji JS: `node --test`, TANPA vitest/jest. Uji Python: self-check `__main__` berbasis `assert`, tanpa pytest, stdlib saja (Actions tak ada `pip install`).
- Uji integrasi memakai sistem sungguhan: Miniflare + D1 lokal yang diberi migrasi apa adanya (`migrasi()`+`pecah()`), R2 lokal untuk foto, `node:sqlite` untuk constraint. Dunia luar (FIRMS, Resend, Turnstile, daftar IP operator) dijawab fixture lewat `outboundService`; ASSETS lewat `serviceBindings` yang membaca `public/`. Tidak ada mock klien DB.
- Pola uji berurutan "gagal pertama menghentikan sisanya" (`rusak` + fungsi `uji` di api/foto/klien): uji berikutnya bergantung keadaan sebelumnya; nama uji dipakai registri.
- Registri: tiap rute di `src/worker.js`/`src/foto.js`, tiap `CREATE TABLE|TRIGGER`, tiap cron wajib ada di `tests/warga/cakupan.json` `diuji` (nilai = potongan nama `uji("...` yang ADA) atau `dikecualikan` (alasan >= 15 karakter). `antre` hanya boleh menyusut (`BATAS_ANTRE = 2`, sekarang 1 entri: batas global 600 laporan/jam).
- Pesan gagal gerbang menyebut SEBAB, AKIBAT, dan CARA MEMPERBAIKI (lihat `assert.deepEqual(..., [], "...tambahkan ke tests/warga/cakupan.json")`). Gerbang tak boleh dilonggarkan supaya pekerjaan lolos.
- Gerbang yang menjalankan `node`/`git` memakai `execFileSync`/`spawnSync` dengan argumen larik, direktori sementara `mkdtempSync` untuk keadaan palsu; jalur dihitung dari `import.meta.url` (`ROOT`), bukan `cwd`. Catatan: `gerbang-model-agent.test.mjs` memakai jalur relatif `.claude/...` jadi harus dijalankan dari akar repo.
- Aturan tanpa gerbang mekanis dianggap belum jadi: tiap aturan tertulis baru (AGENTS.md, ilmu) harus diikuti satu gerbang atau diberi label "belum digerbangi".
- Gerbang mencerminkan aturan, bukan implementasi: jangan membaca ulang logika yang sama dengan kode (menguji dirinya sendiri).

## Ranjau yang pernah meledak

- **Migrasi kembar lolos tak terdeteksi sampai deploy:** `0003_moderasi 2.sql` (salinan Finder) ada di tracked tree dan menggagalkan `d1 migrations apply`; gerbang `gerbang.test.mjs` membaca semua `*.sql` jadi duplikasi isi memang terlihat, tetapi tidak ada gerbang yang menolak NAMA berkas berakhiran ` 2`. Dicabut manual di `3b90271`. Kandidat gerbang: gagalkan bila `git ls-files` memuat `/ 2(\.|$)/` atau nomor migrasi ganda.
- **Tes bergantung pada urutan dan pada satu uji sebelumnya** (`rusak`): menambah uji di tengah file membuat urutan bergeser; selalu tambahkan di akhir atau pahami ketergantungannya.
- **`uji:warga` tidak ada di workflow Actions** (tak ada `tests/warga` di `.github/workflows/*.yml`): gerbang hanya jalan lokal. Hanya `fwi.py`, `aturan.py`, dst. yang digerbangi CI. Usulan: langkah `npm ci && npm run uji:warga && npm run uji:agen` di `terbit.yml`.
- **`og.test.mjs` tidak masuk skrip `uji:warga`** sehingga tidak ikut `npm run uji:warga`.
- **Pemetaan registri berbasis regex** (`gerbang.test.mjs` `temukan()`): rute yang ditulis dengan pola lain (mis. `p[0] === 'x'` bertanda kutip tunggal, atau handler di berkas baru yang tidak dibaca) lolos tanpa dicatat. Setelah menambah berkas `src/*.js` yang berisi rute, tambahkan berkasnya ke `temukan()`.
- **Uji bermock lolos sementara perilaku nyata rusak** (alasan aturan pemilik); contoh ketat: CHECK SQLite dengan `NULL` lolos diam-diam (`coalesce` di 0004/0007) hanya terlihat saat SQL sungguhan dijalankan (`skema.test.mjs`).
- **Cache tepi menyembunyikan perubahan** di uji alur: `api.test.mjs` memakai `cache: false`, `tepi.test.mjs` menyalakannya; mencampur keduanya menghasilkan uji yang membaca daftar basi.
- **Gerbang agen**: ilmu yang masih kerangka (penanda kosong bawaan) atau < 2000 karakter menggagalkan `uji:agen`; agent tanpa `model:` diam-diam ikut Opus (alasan `gerbang-model-agent`).
- **Skrip `uji:warga` memakai `&&` berantai**: satu berkas gagal menyembunyikan hasil berkas sesudahnya; jalankan berkas yang dicurigai sendiri.

## Gerbang yang menghakimi

- Pekerjaanmu dinilai oleh: `npm run uji:agen` (semua hijau), `npm run agents:check` (definisi & katalog segar), dan untuk gerbang baru atas domain warga `npm run uji:warga`.
- Gerbang baru yang kamu tulis harus: (1) GAGAL pada keadaan salah yang kamu buktikan (jalankan sekali dengan pelanggaran sengaja lalu pulihkan), (2) lulus pada repo bersih, (3) menyebut sebab, akibat, dan perbaikan di pesan, (4) terdaftar di tempat yang benar (`tests/agen/` untuk armada; `tests/warga/cakupan.json` bila domain warga).
- Self-check Python baru: blok `if __name__ == "__main__":` berisi `assert` terhadap nilai acuan dari sumber luar (bukan hasil kode itu sendiri), lalu tambahkan baris `python3 <berkas>` ke langkah "Uji aturan" di workflow terkait.
- Verifikasi akhir: `node --test tests/agen/` dan, bila menyentuh domain, `node --test tests/warga/gerbang.test.mjs`.

## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode (tests/agen, tests/warga, tests/beban, package.json, scripts/data/fwi.py). Temuan: uji:warga tidak dipanggil CI, og.test.mjs tidak di skrip uji:warga, belum ada gerbang yang menolak berkas ber-akhiran " 2".
- 2026-10-19 · uji yang membaca public/**/data/*.json hidup (ditulis ulang pipeline) kadang gagal karena literal; kunci ke fixture beku tests/agen/fixtures/ (peluang-inti.test.mjs). Gerbang tab-registry membaca TABS/TAB_SEMBUNYI dari kode tiap modul (daftar BERKAS di uji): modul baru wajib ditambahkan, parser kosong = merah.
