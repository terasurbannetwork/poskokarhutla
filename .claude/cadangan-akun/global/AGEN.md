# Armada agent: wajib dipasang di tiap proyek sejak awal

Vonis pemilik 28 Sep 2026: "ke depannya jika ada GitHub baru atau project baru,
ini yang harus disetting awal." Pemicunya: di Gemah Ripah semua tugas latar
jatuh ke `general-purpose` dan jalan di Opus (empat agent Opus sekaligus di
panel Background tasks), padahal Pangantara sudah lama jalan di Sonnet/Haiku
karena tiap agentnya menulis `model:` sendiri.

## Kenapa agent bisa diam-diam jalan di Opus

Urutan penentu model sebuah sub-agent:

1. parameter `model` di panggilan Agent;
2. frontmatter `model:` di `.claude/agents/<nama>.md`;
3. `CLAUDE_CODE_SUBAGENT_MODEL` (env);
4. kalau ketiganya kosong: **ikut model sesi induk**.

Agent bawaan (`general-purpose`, `Explore`, `Plan`) tidak punya berkas, jadi
cuma bisa diturunkan lewat nomor 1 atau 3.

## Yang dipasang di hari pertama proyek baru (urut)

1. **Env model.** `~/.claude/settings.json` sudah memasang
   `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` (alias, selalu Sonnet terbaru; ID berversi seperti `claude-sonnet-5` membeku di versi itu) untuk semua proyek. Proyek
   yang dipakai di mesin lain juga menulisnya di `.claude/settings.json` repo.
2. **Mesin armada**, disalin dari rujukan (jangan ditulis ulang):
   - `scripts/agents/build.mjs`: roster → `.claude/agents/*.md` + kerangka ilmu + `KATALOG.md`
   - `scripts/agents/ilmu.mjs`: `baca | cek | catat | kasus | pemilik`
   - `scripts/agents/roster.json`: satu entri per agent (nama, kelas, model, ringkas, kapan, fokus, larangan, bisa, tidak, `milik` untuk pengerja)
   - `package.json`: `agents:build`, `agents:check`
3. **Roster awal**: pengerja per modul (Sonnet, `milik` = glob wilayahnya,
   tiap halaman/route/komponen tepat satu pemilik), platform (`tukang-layar`,
   `db-migrator`, `penulis-e2e`, `penulis-gerbang`, `pelunas`, `mekanik-mesin`),
   pemeriksa pola (Haiku: `guard-api`, `rls-auditor`, `migrasi-idempoten`,
   `higiene-repo`, `selera-tabel`, `selera-angka`) dan pemeriksa nalar (Sonnet:
   `security-reviewer`, `perf-reviewer`, `inp-reviewer`, `selera-guard`, …).
4. **Ilmu tiap agent** di `.claude/ilmu-agent/<nama>.md`, diisi dari kode nyata
   (peta berkas & tabel, aturan, ranjau, gerbang, kasus), ≥ 2000 karakter.
   Kerja ini diturunkan ke agent Sonnet paralel, bukan dikerjakan di Opus.
5. **`AGENTS.md`** ramping: router, kebijakan model §1.3, orkestrator §1.5,
   verifier konteks bersih, review, batas mati. `CLAUDE.md` menunjuk ke sana.
6. **Gerbang**: `tests/unit/gerbang-model-agent.test.ts` (env ada, tiap agent
   bermodel) + `tests/unit/gerbang-ilmu-agent.test.ts` (katalog segar, ilmu
   terisi, satu pemilik per berkas, jejak melewati yang tak berubah).

## Rujukan

| Repo | Pakai untuk |
| ---- | ----------- |
| `~/Documents/GitHub/pangantara` | versi penuh (69 agent, knowledge graph, backlog audit) |
| `~/Documents/GitHub/gemah-ripah` | versi ramping tanpa knowledge graph: titik mulai proyek baru |

Bedanya versi ramping: gerbang konteks membaca `docs/ARSITEKTUR.md`, bukan
`npm run kg`; pemeriksa mengambil tugas dari `git diff`, bukan backlog audit;
stempel ilmu memakai zona usahanya (Gemah Ripah WITA).

## Gerbang lintas proyek

Hook `~/.claude/hooks/armada-agent-proyek.mjs` (SessionStart) memeriksa repo
yang dibuka: repo ber-`package.json` tanpa `scripts/agents/roster.json` atau
tanpa `.claude/agents/` mendapat pengingat untuk memasang armada ini dulu.
