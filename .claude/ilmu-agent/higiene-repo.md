# Ilmu higiene-repo

> Kelas: pemeriksa · Model: haiku · Definisi: `.claude/agents/higiene-repo.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca higiene-repo`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus higiene-repo "..."`.

## Peta berkas & tabel

Kamu read-only: hanya melaporkan. Yang diperiksa:

- **Salinan nyasar `* 2.*` / `* 2`.** Salinan otomatis iCloud/Finder (sinkronisasi folder `Documents`) setiap kali dua versi berkas bentrok; bukan hasil kerja siapa pun. Bukti di sejarah: commit `b6f645f` ("gas", 14 Okt 2026) memasukkan 39 salinan (mis. `public/bagikan 2.js`, `public/ringkasan 2.js`, `public/_headers 2`, `public/data/hotspot 2.json`, `public/data/kluster 2.json`, `public/img/foto-heli 2.jpg`, `scripts/splice_ops 2.py`, `scripts/data/berita 2.py`, `migrations/0003_moderasi 2.sql`, `.github/workflows/data 2.yml`, `.env 2`). Dicabut dari git di `3b90271` (15 Okt 2026, `git ls-files | grep ' 2'` kini 0). Berkasnya masih ada di disk (`find . -name '* 2*'` menemukan `./.env 2`), tidak dilacak.
- **Mengapa berbahaya:** `public/` diterbitkan utuh (`wrangler.jsonc`: `assets.directory ./public`; `public/.assetsignore` tidak memuat pola " 2"), jadi salinan basi tersaji ke publik. `data 2.yml` ikut terjadwal di Actions. `0003_moderasi 2.sql` kembar menggagalkan `d1 migrations apply`. Salinan data (`hotspot 2.json` ~10,7 MB) menggandakan ukuran repo.
- **Secret.** `.env` berisi `FIRMS_MAP_KEY` dan `EARTHDATA_TOKEN` (nama variabel saja; jangan pernah cetak nilai). Templat resmi: `.env.example` (nilai kosong) dan `.dev.vars.example`. `.env 2` PERNAH dilacak dan berisi `FIRMS_MAP_KEY` TIDAK kosong (32 karakter) plus `EARTHDATA_TOKEN`. Sudah dicabut dari HEAD tetapi masih ada di riwayat git (`b6f645f`), jadi kunci dianggap bocor: **harus dirotasi** (kunci FIRMS MAP_KEY di NASA FIRMS; token Earthdata). Menghapus dari git saja tidak cukup.
- **Berkas besar.** `du -sk public/data`: ~100 MB total (`citra/` 26 MB dan `lahan/` 12,5 MB; `citra/` dan `citra.json` di-.gitignore, dibuat ulang di Actions). Berkas terlacak terbesar: `hotspot.json` ~10,7 MB (7 hari, ditulis ulang tiap 3 jam), `sekolah.json` ~7,2 MB, `kluster.json` ~6,6 MB, `kluster_awal.json` ~5,7 MB, `berita.json` ~5,2 MB, `hotspot72.json` ~4,2 MB, `hotspot24.json` ~3,3 MB. `public/geo` ~22 MB, `public/img` ~5,6 MB.
- **`.gitignore` (inti):** `.env`, `.env*` (kecuali `!.env.example`), `* 2`, `* 2.*`, `.dev.vars`, `node_modules/`, `.wrangler/`, `__pycache__/`, `.DS_Store`, `scripts/data/.cache/`, `public/data/citra/`, `public/data/citra.json`, `public/data/cuaca/`, `public/data/og/`, `data/raw/*` dengan pengecualian terdaftar (banjir titik/ambang, berita label, konsesi sanksi & grup, sebaran `*.json`/`*.log`/prospektif), `data/graf_jalan.json.gz`.
- **Berkas tanpa pemilik:** pemilik tiap jalur ada di `scripts/agents/roster.json` (`milik`). Cek dengan `node scripts/agents/ilmu.mjs pemilik <berkas>`; hasil kosong = berkas tanpa pemilik, laporkan.


## Aturan & invarian

1. Read-only mutlak. Tidak menghapus, tidak `git rm`, tidak `git filter-repo`, tidak mengubah `.gitignore`: laporkan daftar ke orkestrator, pemilik repo yang memutuskan.
2. **Jangan pernah mencetak nilai secret** (laporan, log, kutipan diff). Untuk mengecek isi `.env`-sejenis, cukup laporkan nama variabel dan apakah nilainya kosong atau panjangnya (mis. `awk -F= '/^NAMA/{print length($2)}'`).
3. Berkas " 2" tidak pernah diedit, dibaca sebagai sumber kebenaran, atau dilayani. Yang benar = berkas tanpa " 2". Jika salinan berbeda isinya dari aslinya (`cmp`), tetap jangan digabung; laporkan saja.
4. `.env.example` dan `.dev.vars.example` boleh dilacak asal nilainya kosong. Berkas lain berpola `.env*`, `*.pem`, `*.key`, `.dev.vars` terlacak = temuan.
5. Berkas terlacak yang membengkak: bandingkan ukuran sekarang dengan ukuran terakhir yang tercatat (`ilmu.mjs cek`). `hotspot*.json` memang besar dan berubah tiap 3 jam; yang mencurigakan adalah berkas baru > 1 MB di luar `public/data`, `public/geo`, `data/raw` terdaftar, atau lonjakan > 2x pada berkas JSON yang sama.
6. Tinjauan sebelum commit besar: `git status --porcelain` (cari `??` berpola " 2" atau `.env`), lalu `git diff --cached --name-only`.


## Ranjau yang pernah meledak

- **39 salinan " 2" ikut commit `b6f645f`** karena `git add -A` dijalankan di folder yang disinkronkan iCloud. Akibat: salinan tersaji publik, workflow kembar terjadwal, migrasi kembar. `.gitignore` baru mencegahnya mulai `3b90271`, tetapi `git add -f` atau berkas yang sudah terlacak tidak dicegah oleh `.gitignore`.
- **`.env 2` terlacak berisi kunci API.** Pola `.env` saja di `.gitignore` lama tidak menangkap `.env 2`. Sekarang `.env*`, `* 2`, `* 2.*` menangkapnya. Kunci tetap ada di riwayat; sampai dirotasi, anggap bocor.
- **Pola `grep ' 2'` menangkap terlalu banyak** (mis. `public/data/...` yang berisi " 2" di nama folder lain tidak ada, tetapi isi berkas bisa). Pakai `git ls-files | grep -E ' 2(\.|$)'` untuk nama, bukan isi.
- **Berkas besar di `data/raw`**: dikecualikan lewat daftar putih di `.gitignore` (`!data/raw/...`). Menambah berkas baru di sana tanpa memperbarui daftar putih = tidak terlacak diam-diam; sebaliknya cache latih model sebaran (`*.pkl`, `*.jsonl`, `cuaca/`) tidak boleh terlacak.


## Gerbang yang menghakimi

Perintah pemeriksaan (semua read-only):

```
git ls-files | grep -E ' 2(\.|$)'                 # salinan terlacak (harus kosong)
find . -name '* 2*' -not -path './node_modules/*' -not -path './.git/*'   # salinan di disk
git ls-files | grep -E '(^|/)\.env|\.dev\.vars|\.pem$|\.key$'      # secret terlacak (hanya *.example boleh)
git ls-files -z | xargs -0 du -k | sort -rn | head   # berkas terbesar
git ls-files public | xargs -I{} sh -c 'echo {}' | head   # tidak ada pemilik: ilmu.mjs pemilik <berkas>
```

Vonis: `bersih` bila ketiga pertama kosong dan tidak ada lonjakan ukuran; `temuan` bila ada. Catat per berkas lewat `node scripts/agents/ilmu.mjs catat higiene-repo <berkas> <bersih|temuan> "<ringkas>"`. Gerbang lain: `npm run agents:check`. Tidak ada hook pre-commit di repo ini, jadi pemeriksaanmu adalah gerbangnya.


## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode dan riwayat git (`b6f645f`, `3b90271`), `.gitignore`, `du`, `public/.assetsignore`. Dicatat: `.env 2` pernah terlacak dengan `FIRMS_MAP_KEY` tidak kosong (nilai tidak dicetak) dan masih di riwayat sehingga kunci harus dirotasi; `.gitignore` kini menolak `* 2`, `* 2.*`, `.env*`.
