#!/usr/bin/env node
// Generate armada agent dari scripts/agents/roster.json.
// Disalin dari gemah-ripah 15 Okt 2026. Bedanya: stack Cloudflare Worker +
// vanilla JS + pipeline Python stdlib (bukan Next.js), gerbang konteks membaca
// peta modul di AGENTS.md, dan uji pakai node --test / self-check Python.
//
// Tiga keluaran, semuanya dari SATU manifest supaya tidak bisa saling berbohong:
//   .claude/agents/<nama>.md          definisi agent (entri tanpa `tangan`)
//   .claude/ilmu-agent/<nama>.md      kerangka ilmu, cuma kalau BELUM ada
//                                     (isinya milik agent, tidak pernah ditimpa)
//   .claude/ilmu-agent/KATALOG.md     pengetahuan orkestrator: siapa bisa apa
//
// Agent `tangan: true` ditulis tangan dan tidak ditimpa, tapi blok ilmunya
// (di antara penanda ilmu:mulai/ilmu:akhir) tetap disuntik dari sini, supaya
// tak satu pun agent bisa lahir tanpa protokol ilmu & jejak.
//
//   npm run agents:build          tulis berkas
//   npm run agents:build -- --cek keluar 1 kalau ada yang basi atau yatim

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const DIR = path.join(ROOT, '.claude/agents')
const ILMU = path.join(ROOT, '.claude/ilmu-agent')
const roster = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/agents/roster.json'), 'utf8'))

const KELAS = ['pengerja', 'platform', 'pemeriksa', 'lapangan']
const MENULIS = ['pengerja', 'platform']
const MULAI = '<!-- ilmu:mulai -->'
const AKHIR = '<!-- ilmu:akhir -->'

const cekSaja = process.argv.includes('--cek')
const masalah = []
let ditulis = 0

for (const a of roster.agents) {
  for (const k of ['nama', 'kelas', 'model', 'bisa', 'tidak'])
    if (!a[k]) {
      console.error(
        `roster: entri "${a.nama ?? '?'}" tanpa "${k}". Model kosong = mewarisi Opus diam-diam (AGENTS.md §1.3); bisa/tidak kosong = orkestrator buta (§1.5).`,
      )
      process.exit(1)
    }
  if (!KELAS.includes(a.kelas)) {
    console.error(`roster: kelas "${a.kelas}" di "${a.nama}" tidak sah (${KELAS.join('|')})`)
    process.exit(1)
  }
  if (a.kelas === 'pengerja' && !(a.milik ?? []).length) {
    console.error(
      `roster: pengerja "${a.nama}" tanpa "milik" — pengerja tanpa wilayah berkas akan menyunting di mana saja`,
    )
    process.exit(1)
  }
}

function blokIlmu(a) {
  const periksa = !MENULIS.includes(a.kelas)
  // Baris kosong sesudah penanda: bentuk yang sama dengan keluaran prettier.
  // Tanpanya `npx prettier --write` atas berkas agent (yang disuruh blok ini
  // sendiri di langkah 3) menyisipkannya, dan `--cek` menuduh berkas itu basi
  // (vonis ffd503f8, 21 Sep 2026).
  return `${MULAI}

## Ilmu & jejak — kamu TIDAK mulai dari nol

Ingatanmu tinggal di repo, bukan di kepala sesi. Wajib, urut:

1. **Sebelum kerja:** \`node scripts/agents/ilmu.mjs baca ${a.nama}\` — ilmumu
   (peta berkas, aturan, ranjau, kasus lalu) plus jejak kerja terakhirmu.
${
  periksa
    ? `2. **Sebelum memeriksa berkas:** \`node scripts/agents/ilmu.mjs cek ${a.nama} <berkas...>\`.
   \`LEWATI\` = berkas tidak berubah sejak vonismu terakhir DAN aturanmu belum
   berubah: pakai vonis lama, jangan periksa ulang. \`ULANG\`/\`BARU\` = periksa.`
    : `2. **Sebelum menyunting:** \`node scripts/agents/ilmu.mjs pemilik <berkas>\` — berkas di
   luar wilayahmu tidak kamu sunting; laporkan pemiliknya ke orkestrator.`
}
3. **Sesudah kerja, per berkas:**
   \`node scripts/agents/ilmu.mjs catat ${a.nama} <berkas> <bersih|temuan|dikerjakan> "<ringkas>"\`
4. **Pelajaran baru yang layak diingat** (sebab + akibat + cara tahu, bukan
   daftar berkas): \`node scripts/agents/ilmu.mjs kasus ${a.nama} "<pelajaran>"\`

Menulis ke ilmu & jejakmu sendiri SELALU boleh, termasuk untuk agent read-only.
Ilmu yang lebih baru dari kode? Kode yang menang; tulis kasusnya.
${AKHIR}`
}

function generate(a) {
  const tools = MENULIS.includes(a.kelas)
    ? 'Read, Grep, Glob, Bash, Edit, Write'
    : 'Read, Grep, Glob, Bash'
  const kepala = `---
name: ${a.nama}
description: ${a.ringkas} Panggil saat ${a.kapan}.
tools: ${tools}
model: ${a.model}
---

# ${a.nama}

${a.ringkas}

> Berkas ini DI-GENERATE dari \`scripts/agents/roster.json\` (\`npm run agents:build\`).
> Sunting manifest-nya, bukan berkas ini. Ilmumu di \`.claude/ilmu-agent/${a.nama}.md\`.

${blokIlmu(a)}

## Gerbang konteks — sebelum Read/Grep/Glob

1. Baca baris modulmu di peta modul \`AGENTS.md\` §2 (berkas, JSON, workflow, jadwal).
2. Dokumen riset modulmu kalau ada (\`scripts/sebaran/RISET-SEBARAN.md\`, \`scripts/banjir/RISET-*.md\`, \`WARGA.md\`).
3. Sebelum menyentuh berkas: \`grep -rln "<nama berkas/JSON>" public src scripts .github\` untuk radius ledaknya.
`
  if (MENULIS.includes(a.kelas)) {
    const milik = (a.milik ?? []).length
      ? `Berkas milikmu (glob paling spesifik menang):\n\n${a.milik.map((g) => `- \`${g}\``).join('\n')}`
      : 'Kamu tidak memiliki wilayah berkas tetap: kerjamu menyeberang, jadi tiap berkas yang kamu sentuh tetap milik pengerja domainnya. Beri tahu orkestrator siapa saja yang wilayahnya kamu sentuh.'
    return `${kepala}
## Wilayahmu — SATU bidang saja

Kamu **hanya** mengurus: ${a.ringkas.replace(/\.$/, '')}.

${milik}

Berkas di luar wilayah: jangan sunting. Laporkan siapa pemiliknya
(\`node scripts/agents/ilmu.mjs pemilik <berkas>\`) dan apa yang dibutuhkan.

## Yang wajib kamu pegang

${a.fokus.map((f) => `- ${f}`).join('\n')}

## Batas

${a.larangan}

- Sesi Claude lain bisa hidup di worktree yang sama. Sebelum menyunting:
  \`git status --porcelain <berkas>\`. Kotor oleh orang lain = baca diff-nya, jangan timpa.
- JANGAN commit atau push. Sesi induk yang melakukannya.
- Uji tertarget saja: \`node --test <berkas.test.mjs>\`, \`npm run uji:warga\` untuk worker,
  atau \`python3 <skrip>.py\` untuk self-check \`__main__\`. Tidak ada build step;
  layar dibuktikan di browser preview.
- Batas mati \`AGENTS.md\` §9: tidak auto-deploy, tidak melemahkan anchor mutu.
- Kamu TIDAK memverifikasi kerjamu sendiri (\`AGENTS.md\` §3.2). Sebut pemeriksa
  yang harus dipanggil orkestrator sesudahmu.

## Bentuk laporan

\`\`\`
BERKAS    path:baris — apa yang diubah
BUKTI     perintah yang dijalankan + hasilnya
PEMERIKSA agent yang harus memverifikasi (mis. validasi-model, guard-api, inp-reviewer)
SISA      yang belum selesai / di luar wilayah, berikut pemiliknya
\`\`\`
`
  }
  return `${kepala}
Tugasmu = berkas yang disebut orkestrator. Tanpa daftar, periksa yang berubah sejak \`origin/main\`:

\`\`\`bash
node scripts/agents/ilmu.mjs cek ${a.nama} $(git diff --name-only origin/main)
\`\`\`

## Ruang lingkup — SATU fungsi saja

Kamu **hanya** mengurus: ${a.ringkas.replace(/\.$/, '')}.

Menemukan masalah di luar itu? **Catat dan laporkan, jangan kerjakan.** Agent
lain punya jatahnya sendiri; kamu melebar berarti dua agent menyentuh berkas
yang sama dan hasilnya balapan.

## Yang diperiksa

${a.fokus.map((f) => `- ${f}`).join('\n')}

## Batas

${a.larangan}

Batas mati \`AGENTS.md\` §9 tetap berlaku: tidak auto-deploy produksi, tidak
melemahkan anchor mutu (typecheck / lint / test / build) supaya kerjaanmu lolos.

## Bentuk laporan

Per temuan, empat baris — tanpa basa-basi, tanpa ringkasan pembuka:

\`\`\`
BERKAS  path/ke/berkas.py:123
MASALAH satu kalimat, vonis tegas
BUKTI   potongan kode / hasil perintah yang membuktikan
FIX     langkah konkret, bukan "pertimbangkan untuk"
\`\`\`

Tidak ada temuan → tulis "tidak ada temuan" dan berhenti. **Jangan mengarang
temuan supaya kelihatan bekerja.** Berkas yang dilewati karena \`LEWATI\` disebut
dengan vonis lamanya, bukan diam-diam dihilangkan.
`
}

function suntikTangan(a, lama) {
  const blok = blokIlmu(a)
  const i = lama.indexOf(MULAI)
  const j = lama.indexOf(AKHIR)
  if (i !== -1 && j > i) return lama.slice(0, i) + blok + lama.slice(j + AKHIR.length)
  return lama.replace(/\s*$/, '\n\n') + blok + '\n'
}

function kerangkaIlmu(a) {
  return `# Ilmu ${a.nama}

> Kelas: ${a.kelas} · Model: ${a.model} · Definisi: \`.claude/agents/${a.nama}.md\`
> Dibaca SEBELUM kerja (\`node scripts/agents/ilmu.mjs baca ${a.nama}\`). Kasus baru
> ditambah SESUDAH kerja lewat \`node scripts/agents/ilmu.mjs kasus ${a.nama} "..."\`.

## Peta berkas & tabel

(belum diisi)

## Aturan & invarian

(belum diisi)

## Ranjau yang pernah meledak

(belum diisi)

## Gerbang yang menghakimi

(belum diisi)

## Kasus
`
}

function katalog() {
  const judul = {
    pengerja: 'Pengerja domain — memiliki wilayah berkas, boleh menyunting di wilayahnya',
    platform: 'Pengerja platform — kerja menyeberang domain (layar, uji, gerbang, mesin, migrasi)',
    pemeriksa: 'Pemeriksa — read-only, verifier berkonteks bersih (AGENTS.md §3.2)',
    lapangan: 'Lapangan — membaca produksi dan memanen sumber luar',
  }
  const sel = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
  let out = `# Katalog armada agent — pengetahuan orkestrator

> DI-GENERATE dari \`scripts/agents/roster.json\` (\`npm run agents:build\`). Jangan disunting tangan.
> Armada: **${roster.agents.length} agent**. Aturan memakainya dan otoritas membuat agent baru: \`AGENTS.md\` §1.5.

Cara memakai katalog ini:

1. **Siapa pemilik berkasnya?** \`node scripts/agents/ilmu.mjs pemilik <berkas...>\`. Pengerja pemiliknya
   yang mengerjakan; berkas tanpa pemilik = kerja orkestrator, atau tanda agent baru perlu lahir.
2. **Siapa memverifikasi?** Pemeriksa yang kolom "bisa"-nya cocok, TIDAK PERNAH pengerja yang sama.
3. **Rakitan** = 1 pengerja + 1–3 pemeriksa, maksimal 4–5 jalan bersamaan.
4. Agent baru biasanya langsung terdaftar di tool Agent begitu berkasnya mendarat. Kalau namanya belum
   muncul, panggil \`general-purpose\` dengan prompt "Kamu adalah <nama>: baca \`.claude/agents/<nama>.md\`
   dan jalankan \`node scripts/agents/ilmu.mjs baca <nama>\` dulu".
`
  for (const k of KELAS) {
    const isi = roster.agents.filter((a) => a.kelas === k)
    out += `\n## ${judul[k]} (${isi.length})\n\n| Agent | Model | Bisa | Tidak bisa | Wilayah |\n| --- | --- | --- | --- | --- |\n`
    for (const a of isi) {
      const m = a.milik ?? []
      const wil = m.length
        ? `${m
            .slice(0, 3)
            .map((g) => `\`${g}\``)
            .join(', ')}${m.length > 3 ? ` +${m.length - 3}` : ''}`
        : '—'
      out += `| \`${a.nama}\` | ${a.model} | ${sel(a.bisa)} | ${sel(a.tidak)} | ${wil} |\n`
    }
  }
  return out
}

function tulis(f, isi, label) {
  const lama = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
  if (lama === isi) return
  if (cekSaja) {
    masalah.push(label)
    return
  }
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, isi)
  ditulis++
}

const nama = new Set(roster.agents.map((a) => a.nama))
for (const a of roster.agents) {
  const f = path.join(DIR, `${a.nama}.md`)
  if (a.tangan) {
    if (!fs.existsSync(f)) {
      masalah.push(`${a.nama}: tangan tapi berkasnya tidak ada`)
      continue
    }
    tulis(f, suntikTangan(a, fs.readFileSync(f, 'utf8')), `${a.nama}.md (blok ilmu)`)
  } else tulis(f, generate(a), `${a.nama}.md`)

  const fi = path.join(ILMU, `${a.nama}.md`)
  if (!fs.existsSync(fi)) tulis(fi, kerangkaIlmu(a), `ilmu-agent/${a.nama}.md (belum ada)`)
}
tulis(path.join(ILMU, 'KATALOG.md'), katalog(), 'ilmu-agent/KATALOG.md')

const yatim = fs.readdirSync(DIR).filter((f) => f.endsWith('.md') && !nama.has(f.slice(0, -3)))
if (yatim.length)
  masalah.push(`berkas agent tanpa entri roster (lahir di luar pintu §1.5): ${yatim.join(', ')}`)

if (masalah.length) {
  console.error(
    `agents: ${cekSaja ? 'BASI' : 'MASALAH'} — ${masalah.length}:\n  ${masalah.join('\n  ')}\nJalankan: npm run agents:build`,
  )
  process.exit(1)
}
console.log(
  cekSaja
    ? `agents: segar (${roster.agents.length} agent)`
    : `agents: ${ditulis} berkas ditulis · armada ${roster.agents.length}`,
)
