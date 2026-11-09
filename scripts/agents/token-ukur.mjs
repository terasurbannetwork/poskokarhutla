#!/usr/bin/env node
// Meteran ongkos token: membaca transkrip Claude Code di ~/.claude/projects
// dan menjawab empat angka yang menentukan apakah kebijakan model AGENTS.md
// §1.3 benar-benar bekerja, atau cuma terbaca.
//
// Kenapa ada: 12 Sep 2026 kebijakannya ditulis dan 35 agent diisi model. Dua
// hari kemudian ternyata cuma 4,4% giliran yang pernah memanggil agent, dan
// 88% pesan subagent masih di Opus/Fable — nol tanda, nol error, dan tak ada
// seorang pun yang bisa tahu tanpa menghitung 1.346 transkrip satu per satu.
// Penghematan tanpa meteran adalah bentuk lain dari aturan tanpa gerbang.
//
//   npm run token:ukur              proyek ini
//   npm run token:ukur -- --semua   semua proyek
//   npm run token:ukur -- --hari=7  batasi N hari terakhir
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const AKAR = join(homedir(), '.claude', 'projects')
const arg = (n, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${n}=`))
  return m ? m.slice(n.length + 3) : d
}
const SEMUA = process.argv.includes('--semua')
const HARI = Number(arg('hari', 0)) || 0
const EKSEK = new Set(['Bash', 'Read', 'Grep', 'Glob'])
const DELEGASI = new Set(['Agent', 'Task'])

// Harga per MTok (input, output, cache-write, cache-read). Daftar resmi,
// dicocokkan 14 Sep 2026. Fable: cache read $0,25 — bukan 0,1x input.
const tarif = (m = '') => {
  const s = m.toLowerCase()
  if (s.includes('fable') || s.includes('mythos')) return [10, 50, 12.5, 0.25]
  const [i, o] = s.includes('opus')
    ? [5, 25]
    : s.includes('haiku')
      ? [1, 5]
      : s.includes('sonnet-5')
        ? [2, 10]
        : s.includes('sonnet')
          ? [3, 15]
          : [5, 25]
  return [i, o, i * 1.25, i * 0.1]
}
const biaya = (m, u) => {
  const [i, o, cw, cr] = tarif(m)
  return (u.in * i + u.out * o + u.cw * cw + u.cr * cr) / 1e6
}
const keluarga = (m = '') => {
  const s = m.toLowerCase()
  if (s.includes('fable') || s.includes('mythos')) return 'fable'
  for (const k of ['opus', 'haiku', 'sonnet']) if (s.includes(k)) return k
  return 'lain'
}
const median = (v) => (v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : 0)
const kuantil = (v, q) => (v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length * q)] : 0)
const rb = (n) => (n / 1000).toFixed(1).replace('.', ',')

// Transkrip TIDAK semuanya satu tingkat di bawah akar: diukur 14 Sep 2026,
// 984 berkas di kedalaman 1, 305 di kedalaman 3, 59 di kedalaman 5 (worktree
// dan sesi bersarang). Versi pertama meteran ini cuma membaca tingkat pertama
// dan melaporkan "pesan subagent 0" dengan yakin, padahal 364 berkas — justru
// yang paling banyak memuat sidechain — tidak pernah dibuka. Meteran yang
// melewatkan sebagian datanya lebih berbahaya daripada tidak ada meteran:
// ia menjawab, dan jawabannya salah ke arah yang menyenangkan.
function berkasTranskrip(dir = AKAR, dalam = 0) {
  if (!existsSync(dir)) return []
  let isi
  try {
    isi = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const out = []
  for (const e of isi) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (dalam === 0 && !SEMUA && !p.endsWith(process.cwd().replace(/\//g, '-'))) continue
      out.push(...berkasTranskrip(p, dalam + 1))
    } else if (e.name.endsWith('.jsonl') && dalam > 0) {
      out.push(p)
    }
  }
  return out
}

const batas = HARI ? new Date(Date.now() - HARI * 864e5).toISOString().slice(0, 10) : ''
const pembuka = []
const puncak = []
const giliran = []
const perModel = new Map()
let nSubagent = 0
let nSubMurah = 0

for (const f of berkasTranskrip()) {
  let isi
  try {
    isi = readFileSync(f, 'utf8')
  } catch {
    continue
  }
  let awal = null
  let akhir = null
  let cur = null
  for (const baris of isi.split('\n')) {
    if (!baris.startsWith('{')) continue
    let d
    try {
      d = JSON.parse(baris)
    } catch {
      continue
    }
    const tgl = (d.timestamp ?? '').slice(0, 10)
    if (batas && tgl && tgl < batas) continue

    if (d.type === 'assistant') {
      const u = d.message?.usage
      const model = d.message?.model ?? ''
      if (u) {
        const pakai = {
          in: u.input_tokens ?? 0,
          out: u.output_tokens ?? 0,
          cw: u.cache_creation_input_tokens ?? 0,
          cr: u.cache_read_input_tokens ?? 0,
        }
        const k = `${keluarga(model)}|${d.isSidechain ? 'sub' : 'utama'}`
        const p = perModel.get(k) ?? { n: 0, biaya: 0 }
        p.n += 1
        p.biaya += biaya(model, pakai)
        perModel.set(k, p)
        if (d.isSidechain) {
          nSubagent += 1
          if (['sonnet', 'haiku'].includes(keluarga(model))) nSubMurah += 1
        } else {
          const konteks = pakai.cr + pakai.cw
          if (konteks) {
            if (awal === null) awal = konteks
            akhir = konteks
          }
        }
      }
      if (!d.isSidechain && cur) {
        for (const b of d.message?.content ?? []) {
          if (b?.type !== 'tool_use') continue
          if (EKSEK.has(b.name)) cur.e += 1
          if (DELEGASI.has(b.name)) cur.a += 1
        }
      }
    } else if (d.type === 'user' && !d.isSidechain) {
      const c = d.message?.content
      const manusia =
        typeof c === 'string' || (Array.isArray(c) && !c.some((b) => b?.type === 'tool_result'))
      if (manusia) {
        if (cur) giliran.push(cur)
        cur = { e: 0, a: 0 }
      }
    }
  }
  if (cur) giliran.push(cur)
  if (awal !== null) {
    pembuka.push(awal)
    puncak.push(akhir)
  }
}

const berat = giliran.filter((g) => g.e > 25)
const beratDelegasi = berat.filter((g) => g.a > 0)
const adaDelegasi = giliran.filter((g) => g.a > 0)
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1).replace('.', ',') : '0,0')

console.log(`cakupan: ${SEMUA ? 'semua proyek' : 'proyek ini'}${HARI ? `, ${HARI} hari terakhir` : ''}`)
console.log(`sesi ${pembuka.length} · giliran ${giliran.length} · pesan subagent ${nSubagent}`)
console.log()
console.log('KONTEKS THREAD UTAMA (yang dibayar tiap pesan)')
console.log(
  `  pembuka  median ${rb(median(pembuka))} rb · p90 ${rb(kuantil(pembuka, 0.9))} rb` +
    `   (overhead tetap: sistem, CLAUDE.md, skill, MCP)`,
)
console.log(`  puncak   median ${rb(median(puncak))} rb · p90 ${rb(kuantil(puncak, 0.9))} rb`)
console.log()
console.log('DELEGASI (AGENTS.md §1.3)')
console.log(
  `  giliran yang memanggil agent      ${adaDelegasi.length}/${giliran.length} (${pct(adaDelegasi.length, giliran.length)}%)`,
)
console.log(
  `  giliran BERAT (>25 eksekusi)      ${berat.length}, yang mendelegasikan ${beratDelegasi.length} (${pct(beratDelegasi.length, berat.length)}%)`,
)
console.log(
  `  pesan subagent di model murah     ${nSubMurah}/${nSubagent} (${pct(nSubMurah, nSubagent)}%)`,
)
console.log()
console.log('ONGKOS setara API (langganan: baca sebagai tekanan rate limit)')
let total = 0
for (const [k, v] of [...perModel].sort((a, b) => b[1].biaya - a[1].biaya)) {
  total += v.biaya
  console.log(`  ${k.padEnd(14)} pesan ${String(v.n).padStart(7)}  $${v.biaya.toFixed(2).padStart(10)}`)
}
console.log(`  ${'TOTAL'.padEnd(14)} ${''.padStart(13)}  $${total.toFixed(2).padStart(10)}`)
