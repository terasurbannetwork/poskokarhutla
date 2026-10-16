# Ilmu inti-layar

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/inti-layar.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca inti-layar`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus inti-layar "..."`.

## Peta berkas & tabel

Wilayah: `public/inti/**` dan `public/bencana.json`. Per 16 Okt 2026 KEDUANYA BELUM ADA: lahir di FASE-0 tahap A (registry) dan tahap D (modul inti). Pendaftaran agent mendahului berkas supaya tidak ada berkas yatim tanpa pemilik.

Rencana ada di `docs/multi-bencana/` (bacaan wajib sebelum menulis apa pun):
- `ARSITEKTUR.md` §3 registry, §7.1 daftar modul `public/inti/` (`format, tema, kepala, tab, peta, lapis, panel, rentang, laci, insight, tabel, tren, posko, metode, sapa, muat`), §7.2 halaman bencana `public/<id>/index.html` (kerangka DOM saja, ≤ 400 baris, `<script type="module">`), §7.3 gerbang duplikasi.
- `PETA.md` §2: `public/inti/peta/{dasar,wilayah,kartu,gelembung,lapis,legenda,waktu,kisi,angin,laci,klik,foto,sim}.js`, dipecah dari `public/index.html` karhutla dengan pola strangler; §3 tabel perbedaan per bencana.
- `MODUL-PLUG-AND-PLAY.md`: kelas modul A (colok), B (satu langkah), C (mesin bersama, isi per bencana), D (karhutla saja, tidak dipindah); §2 medan registry tambahan (`bagikan, og, kata, lapisan, berita, prioritas, posko`).
- `FASE-0.md`: A1-A8 (registry, `kepala.js`, sitemap, `bencana.generated.js`), D1-D7 (urutan pemindahan: `format` > `muat` > `tema` > `tab` > `peta/lapis/panel/rentang` > `insight/tabel` > `laci/tren/posko/metode/sapa`).

Batas dengan pemilik lain (glob paling spesifik menang):
- `src/bencana.generated.js` milik `warga-api` (`src/**`); dibangkitkan `scripts/umum/bencana.py js` (`pipa-umum`). Registry-nya milikmu.
- `public/index.html`, `public/banjir/index.html`, `public/*.js` (`informasi.js`, `bagikan.js`, `sapa.js`, `lapisan5.js`...) tetap milik `layar-peta`/`banjir`; kamu memasok modul inti, mereka mengganti definisi kembarnya. Serah-terima lewat orkestrator.
- `public/<id>/` bencana baru milik pengerja bencana itu.

## Aturan & invarian

- Vanilla ES module, tanpa build step. Satu tanggung jawab per berkas.
- `public/bencana.json` sumber tunggal; hanya bencana berstatus `aktif` tampil di menu, `uji` mendapat `noindex`, `mati` tidak dirender.
- Karhutla dan banjir harus tampil identik sesudah tiap pemindahan (tangkapan layar sebelum/sesudah, uji balik). Nol definisi tingkat atas kembar baru.
- Peta: `style.load` bukan `load`; `setStyle(..., {diff:false})`; `fitBounds` dengan padding terukur + maxZoom; `setData`/`updateImage` bukan buang-pasang; warna tema dipanggang saat `addLayer`.
- Klik tidak membekukan layar: chrome kontrol urgent, kerja berat lewat `nanti()` (cek `inp-reviewer`).
- Kartu Insight bergaya label pil, tanpa subjudul/kotak KPI; fitur yang disembunyikan pemilik dicatat, bukan dihapus.
- Peta menjawab sebaran nasional, bukan saringan cakupan kursi.
- Teks lewat `i18n.js`; kata baru masuk `scripts/i18n/GLOSARIUM.md`.

## Ranjau yang pernah meledak

- `public/banjir/index.html` menyalin ~60% inti peta karhutla dengan tangan dan sudah menyimpang (padding tetap 430, tanpa kartu hover, tanpa muat malas lapisan). Itulah alasan inti ada.
- Impor JSON langsung dari `src/worker.js` merusak uji Node dan `wrangler@3`; makanya `bencana.generated.js`.

## Gerbang yang menghakimi

Rencana (belum ada): `tests/agen/gerbang-inti.test.mjs` (nama ekspor inti tidak didefinisikan ulang di `public/<id>/`), `gerbang-inti-peta.test.mjs`, `gerbang-bencana.test.mjs` (kesamaan registry dengan generated). Milik `penulis-gerbang`; ajukan lewat orkestrator. Sekarang: `npm run uji:agen`, `inp-reviewer`, `selera-angka`.

## Kasus
- 2026-10-16 · kepala.js: /tentang lokal wrangler jatuh ke index (pakai /tentang.html untuk uji); rata() buang .html. Menu index lama menandai Banjir 'Coming Soon' padahal registry aktif: kini tautan. Nama registry 'Gempa Bumi & Tsunami' beda dari menu lama 'Gempa & Tsunami'.
