# Ilmu orkestrator

> Sesi induk (Opus). Dibaca sebelum merakit agent: `node scripts/agents/ilmu.mjs baca orkestrator`.
> Pelajaran merakit ditambah lewat `node scripts/agents/ilmu.mjs kasus orkestrator "..."`.

## Peta berkas & tabel

- Armada: `scripts/agents/roster.json` → `npm run agents:build` → `.claude/agents/*.md`, `.claude/ilmu-agent/KATALOG.md`.
- Router, kebijakan model, peta modul: `AGENTS.md` §1, §1.3, §2.
- Gerbang armada: `npm run uji:agen` (`tests/agen/*.test.mjs`).

## Aturan & invarian

- Rakitan 1 pengerja + 1–3 pemeriksa; pemeriksa tidak pernah pengerja yang sama.
- Perubahan model/indeks risiko selalu diakhiri `validasi-model`.
- Subagent tidak commit/push/deploy; sesi induk yang commit, per path.

## Ranjau yang pernah meledak

- Checkout dipakai bersama beberapa sesi Claude (mis. sesi port PFVI menyunting `scripts/data/pfvi.py`
  dan `scripts/sebaran/pfvi_balik.py` saat armada dipasang 15 Okt 2026). Commit dengan path spesifik.
- Berkas `* 2.*` dari sinkronisasi iCloud/Finder ikut commit b6f645f (termasuk `.env 2` berisi kunci FIRMS),
  dihapus di 3b90271 dan kini ditolak `.gitignore`. Kuncinya masih ada di riwayat git: rotasi kunci FIRMS.

## Gerbang yang menghakimi

- `npm run uji:agen`, `npm run agents:check`, `npm run uji:warga`.

## Kasus

- 2026-10-15 · Armada 14 agent dipasang dari pola gemah-ripah; ilmu awal diisi oleh empat agent Sonnet paralel.
- 2026-10-21 · 2026-10-21 Halaman baru di public/bnpb/ tidak bisa dibuka langsung sebagai aset: worker menjawab 404 untuk /bnpb/*.html yang tak ada di BNPB_BERSIH (src/worker.js). Brief pengerja ruang-bnpb yang melarang src/** membuat halaman tak terjangkau; uji http.server statis meloloskannya. Halaman BNPB baru = rute di RUTE_BNPB (src/bnpb.js) + BNPB_BERSIH + tests/warga/bnpb.test.mjs + cakupan.json + tests/bnpb/layar.test.mjs, diuji lewat wrangler dev, bukan server statis.
- 2026-10-29 · Pemilik 29 Okt 2026: kalau datanya tidak diketahui, ambil dari data publik; kalau data publiknya tak ada, fiturnya tidak dibuat (jangan mengarang angka atau isian contoh).
- 2026-10-30 · hotspot72.json kolom hitung: 0 = deteksi ganda piksel yang sama di hari yang sama (harian.py), BUKAN penanda industri. Titik industri sudah dibuang pipeline sebelum hotspot72; daftar sumber panas tetap ada di public/data/titik_palsu.json (sumber_statis, lewati kawah). Kontrak kunjungan 30 Okt sempat salah dan mengecap hampir semua kompleks Kaltim sebagai dugaan.
