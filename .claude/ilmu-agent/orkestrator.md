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
