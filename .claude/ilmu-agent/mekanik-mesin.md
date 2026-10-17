# Ilmu mekanik-mesin

> Kelas: platform · Model: sonnet · Definisi: `.claude/agents/mekanik-mesin.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca mekanik-mesin`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus mekanik-mesin "..."`.

## Peta berkas & tabel

Workflow di `.github/workflows/` (semua `concurrency: group: data, cancel-in-progress: false`, jadi diantre bergantian):

| Berkas | Pemicu | Isi | Terbit |
| --- | --- | --- | --- |
| `data.yml` | cron `20 14 * * *` (21.20 WIB), timeout 90 mnt | `harian.py` + puluhan skrip pipa-data | token Cloudflare ada: `versi.py` + `wrangler deploy`; tidak ada: `git commit` `public/data` + `pull --rebase` + `push` |
| `titik.yml` | cron `40 */3 * * *`, timeout 30 | titik panas, kompleks, posko, operasi (FWI dipakai ulang), citra, OG | selalu `wrangler deploy` |
| `banjir.yml` | cron `20 0 * * *` (07.20 WIB), timeout 50 | modul banjir | seperti data.yml (commit `public/banjir/data` + ambang bila tanpa token) |
| `statis.yml` | cron `0 19 2 * *` (tgl 2, 02.00 WIB), timeout 240 | OSM, WorldPop, konsesi | `git commit` berkas statis + push |
| `terbit.yml` | `push` ke `main` untuk `public/**` (kecuali data), `src/**`, `wrangler.jsonc`, `migrations/**`; dispatch | tampilan saja, data dari cache | `wrangler deploy` |

Hanya `data.yml`, `banjir.yml`, `statis.yml` punya `permissions: contents: write`; `titik.yml` dan `terbit.yml` tidak (mereka tidak commit).

Pola yang berulang di workflow: cache `actions/cache` per kelas data (`data-` untuk `public/data`, `banjir-` untuk `public/banjir/data` + `data/raw/banjir`, `citra-`, `berita-`, `berita-gambar-`, `tanah-`, `penerbangan-`, `graf-`, `prospektif-`), dengan kunci `<awalan>-${{ github.run_id }}` dan `restore-keys: <awalan>-`. Langkah "Pakai lapisan statis dari repo" (`git ls-files ... | git checkout HEAD --`) ada di data, titik, banjir, terbit. Langkah akhir "Periksa kesegaran data yang tayang" memanggil `/api/status` tiga kali (variabel `URL_STATUS`).

Secret: `FIRMS_MAP_KEY`, `YOUTUBE_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. `.env.example` memuat nama kuncinya saja. `scripts/pasang-kunci.sh` memasang ke `.env` dan secret GitHub.

`package.json`: `type: module`; skrip `uji:warga` (tujuh berkas `node --test tests/warga/*.test.mjs`), (`dev:warga` dibuang 16 Okt 2026: sama dengan konfigurasi `lokal` di `.claude/launch.json`, `npx wrangler dev --local --port 8788` dari `wrangler.jsonc`), `agents:build`, `agents:check`; devDependencies hanya `miniflare` dan `wrangler` (terpatok versi). Python tanpa dependensi.

Mesin armada `scripts/agents/`: `roster.json` (satu-satunya pintu; entri wajib nama, kelas, model, ringkas, kapan, fokus, larangan, bisa, tidak, dan `milik` untuk pengerja), `build.mjs` (membuat `.claude/agents/<nama>.md`, kerangka ilmu bila belum ada, `KATALOG.md`; agent `tangan: true` tidak ditimpa, blok ilmunya tetap disuntik), `ilmu.mjs` (perintah `baca`, `cek`, `catat`, `kasus`, `pemilik`; jejak di `.claude/ilmu-agent/jejak/<nama>.jsonl` dikunci ke blob git). `.claude/settings.json` memasang `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`.

## Aturan & invarian

- Berkas `.claude/agents/*.md` DI-GENERATE: sunting `roster.json` lalu `npm run agents:build`, jangan sunting hasilnya. Isi ilmu milik agent dan tidak ditimpa build.
- Tiap berkas kode punya tepat SATU pemilik (glob paling spesifik menang, kecuali `public/{data,lambang,geo,img}/`); entri roster baru yang tumpang tindih menggagalkan gerbang.
- Tiap agent khusus menulis `model:` di frontmatter; tanpa itu sub-agent diam-diam ikut Opus.
- Python 3.12 stdlib di Actions, tanpa `pip install`; `npx --yes wrangler@3 deploy` adalah satu-satunya unduhan npm saat terbit.
- Satu grup `concurrency: data` untuk semua yang menyentuh data/terbit, tanpa pembatalan: jangan membuat workflow data baru dengan grup lain.
- Setiap langkah yang bisa gagal tanpa merusak hasil diberi `continue-on-error: true` dan nama "(boleh gagal)"; langkah inti (harian.py, status.py, hujan.py, uji aturan) tidak boleh.
- Jalur cache simpan dan pulihkan harus sama persis (versi cache dihitung dari daftar jalur).
- Jangan menambah secret ke berkas yang di-commit; jangan melemahkan uji supaya lolos; JANGAN commit/push dari agent.
- Berkas lokal yang ditulis pemilik/agent lain di worktree yang sama: `git status --porcelain <berkas>` sebelum menyunting.

## Ranjau yang pernah meledak

- Salinan iCloud "* 2.*" ikut commit `b6f645f`: `data 2.yml` (workflow lama) ikut terjadwal, `0003_moderasi 2.sql` menggagalkan `d1 migrations apply`, dan `.env 2` berisi kunci API ikut ter-commit. Dibersihkan `3b90271`; `.gitignore` kini menolak `* 2`, `* 2.*`, `.env*` (kecuali `.env.example`). Berkas lokalnya masih bisa ada: abaikan, jangan jalankan.
- Cache banjir dipulihkan dengan jalur beda dari simpanan, tiap publish mengirim data banjir lama (`6622f26`); citra satelit tidak ikut publish selain run harian (`ec6fd99`, cache `citra-` sendiri).
- Cache `public/data` lama menimpa berkas yang di-commit (`dd0f47c`); obat: langkah `git checkout HEAD --` (daftar sama di empat workflow).
- Push bentrok antar-workflow: jalur commit memakai `git pull -q --rebase && git push -q`; saat terbit, tampilan diambil `git fetch origin main && git checkout FETCH_HEAD -- . ':!public/data' ':!public/banjir/data'` supaya push di tengah run tidak tertimpa.
- Cron 3 jam sempat dibuang karena paket gratis (`5678cd1`), dikembalikan setelah menit Actions tak terbatas (`75da424`). Jalan dengan cache kosong ± 45 menit untuk FWI ERA5, makanya timeout `data.yml` 90 menit.
- Tanpa token Cloudflare, jalur commit menambah beberapa MB per hari ke riwayat git (catatan `ponytail` di data.yml).
- Overpass 504 (`statis.yml` 240 menit), Open-Meteo JSON rusak (banjir.yml ulang 10 menit), `pdftotext` perlu `apt-get install poppler-utils` di rob.

## Gerbang yang menghakimi

- `npm run agents:check` (sama dengan `node scripts/agents/build.mjs --cek`): keluar 1 bila definisi/katalog basi atau yatim.
- `node --test tests/agen/gerbang-ilmu-agent.test.mjs` (definisi segar terhadap roster, ilmu terisi, protokol ilmu ada, satu pemilik per berkas, jejak melewati berkas tak berubah, AGENTS.md memuat otoritas orkestrator) dan `node --test tests/agen/gerbang-model-agent.test.mjs` (settings menurunkan model, tiap agent menulis `model:`).
- `npm run uji:warga` untuk worker.
- Setelah menyunting workflow: baca ulang YAML (indentasi, jalur cache sama persis), jalankan skrip yang dipanggilnya secara lokal bila ada `uji`, lalu `workflow_dispatch` hanya atas izin pemilik.
- Kesegaran produksi: `/api/status` (503 bila titik > 8 jam, banjir/berita > 30 jam), diperiksa tiap workflow terbit.

## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode: lima workflow di .github/workflows, package.json, scripts/agents (roster.json, build.mjs, ilmu.mjs), .gitignore, git log (b6f645f, 3b90271, 6622f26, ec6fd99, dd0f47c, 75da424).
- 2026-10-16 · Konfigurasi launch.json dengan python http.server menunjuk scratchpad sesi lama/path pengguna lain mati diam-diam; hanya lokal (wrangler dev --local, wrangler.jsonc) layak. wrangler.warga.jsonc adalah usulan ber-database_id placeholder, bukan config dev. D1 lokal perlu 'wrangler d1 migrations apply poskowarga --local' sekali.
- 2026-10-16 · Data live basi 91 jam padahal titik/banjir/data CI hijau (16 Okt 2026): wrangler deploy dari laptop mengirim public/data lokal (commit 13 Okt; data.yml/titik.yml dengan token TIDAK commit, jadi git selalu basi) dan menimpa deploy CI segar. Tanda: deployments list punya entri tanpa run CI padanannya, dan /data/meta.json live sama persis dengan berkas lokal. Obat: terbitkan hanya lewat terbit.yml/titik.yml; sesudah deploy lokal paksa gh workflow run titik.yml.
- 2026-10-16 · Keluaran harian modul baru wajib di public/banjir/data (atau public/data) dan arsip mentah di data/raw/banjir: terbit.yml/banjir.yml/data.yml menimpa SEMUA folder public lain dengan checkout main (':!public/data' ':!public/banjir/data'), jadi public/<modul>/data/*.json hasil CI hilang saat deploy. Rantai lewat scripts/banjir/posko.py (cache banjir- menyimpan kedua folder). magma.py menulis public/data/gunungapi_status.json dari banjir.yml yang tidak menyimpan cache data-, jadi data.yml 21.20 menerbitkan versi lama.
- 2026-10-17 · laporan.py/musim_harian.json (17 Okt 2026): laporan.py TIDAK dipanggil workflow mana pun sampai ditambah di data.yml & titik.yml; berkas bergulir (laporan.json, musim_harian.json) jangan masuk daftar git checkout HEAD (dd0f47c) karena commit jarang di jalur token, tapi berkas statis baru (pabrik_sawit, cari) wajib masuk 4 daftar + git add statis.yml.
