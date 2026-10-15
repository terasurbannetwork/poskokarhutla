#!/usr/bin/env node
// Ilmu & jejak tiap agent: supaya agent tidak mulai dari nol tiap dipanggil.
// Disalin dari gemah-ripah 15 Okt 2026; bedanya cuma stempel WIB.
//
// Vonis pemilik 19 Sep 2026: "setiap mengerjakan tugasnya dia tidak mulai dari
// awal ... reviewer ya dia tidak perlu ulang-ulang review." Dua ingatan, dua
// berkas per agent, keduanya di repo supaya ikut ke mesin mana pun:
//
//   .claude/ilmu-agent/<nama>.md           ilmu: peta, aturan, ranjau, kasus
//   .claude/ilmu-agent/jejak/<nama>.jsonl  jejak: berkas apa yang sudah
//                                          diperiksa/dikerjakan, di blob mana
//
// Jejak dikunci ke blob git berkasnya DAN ke hash berkas definisi agent.
// Berkas yang tidak berubah sejak review terakhir dilewati; berkas yang berubah,
// atau agent yang aturannya berubah, diperiksa ulang. Itu satu-satunya cara
// "jangan ulang review" yang tidak pernah menelan perubahan.
//
//   node scripts/agents/ilmu.mjs baca <nama>
//   node scripts/agents/ilmu.mjs cek <nama> <berkas...>
//   node scripts/agents/ilmu.mjs catat <nama> <berkas> <vonis> "<ringkas>"
//   node scripts/agents/ilmu.mjs kasus <nama> "<pelajaran>"
//   node scripts/agents/ilmu.mjs pemilik <berkas...>
//
// ILMU_DIR menimpa folder ilmu (dipakai gerbang uji supaya tidak mengotori repo).

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

// Stempel WIB (UTC+7): zona yang dipakai layar Pantau Bencana.
const stempelWib = () => new Date(Date.now() + 7 * 3600_000).toISOString().replace('Z', '+07:00')
const hariIniWib = () => stempelWib().slice(0, 10)

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const DIR = process.env.ILMU_DIR
  ? path.resolve(process.env.ILMU_DIR)
  : path.join(ROOT, '.claude/ilmu-agent')
const AGEN = path.join(ROOT, '.claude/agents')
const ROSTER = path.join(ROOT, 'scripts/agents/roster.json')

export const VONIS = ['bersih', 'temuan', 'dikerjakan']
// ponytail: plafon 40 KB per berkas ilmu, pemicu: agent yang Kasus-nya
// menembus ini wajib meringkas, bukan menumpuk; kalau ringkasan pun tak muat,
// wilayahnya terlalu lebar dan agent-nya harus dipecah (AGENTS.md §1.5).
export const PLAFON_ILMU = 40_000

const ORKESTRATOR = 'orkestrator'

function mati(pesan) {
  console.error(pesan)
  process.exit(1)
}

function pastikanAgent(nama) {
  if (!nama) mati('nama agent wajib diisi')
  if (nama !== ORKESTRATOR && !fs.existsSync(path.join(AGEN, `${nama}.md`)))
    mati(`agent "${nama}" tidak ada di .claude/agents/ — lihat .claude/ilmu-agent/KATALOG.md`)
}

const berkasIlmu = (nama) => path.join(DIR, `${nama}.md`)
const berkasJejak = (nama) => path.join(DIR, 'jejak', `${nama}.jsonl`)

// Hash definisi agent: aturan berubah = semua vonis lamanya basi.
function hashAturan(nama) {
  const f = path.join(AGEN, `${nama}.md`)
  if (!fs.existsSync(f)) return 'orkestrator'
  return crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 12)
}

function blob(berkas) {
  const abs = path.resolve(ROOT, berkas)
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return null
  return execFileSync('git', ['hash-object', abs], { cwd: ROOT, encoding: 'utf8' }).trim()
}

function relatif(berkas) {
  return path.relative(ROOT, path.resolve(ROOT, berkas)).split(path.sep).join('/')
}

export function bacaJejak(nama) {
  const f = berkasJejak(nama)
  if (!fs.existsSync(f)) return []
  return fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function terakhirPerBerkas(jejak) {
  const m = new Map()
  for (const j of jejak) m.set(j.berkas, j)
  return m
}

export function vonisCek(nama, daftar) {
  const akhir = terakhirPerBerkas(bacaJejak(nama))
  const aturan = hashAturan(nama)
  return daftar.map((b) => {
    const rel = relatif(b)
    const kini = blob(rel)
    const lalu = akhir.get(rel)
    if (!kini) return { berkas: rel, status: 'HILANG', lalu }
    if (!lalu) return { berkas: rel, status: 'BARU' }
    if (lalu.blob === kini && lalu.aturan === aturan) return { berkas: rel, status: 'LEWATI', lalu }
    return {
      berkas: rel,
      status: 'ULANG',
      sebab: lalu.blob !== kini ? 'berkas berubah' : 'aturan agent berubah',
      lalu,
    }
  })
}

function cmdCek(nama, daftar) {
  pastikanAgent(nama)
  if (!daftar.length) mati('sebutkan berkas yang akan diperiksa')
  const hasil = vonisCek(nama, daftar)
  for (const h of hasil) {
    const l = h.lalu
    if (h.status === 'LEWATI')
      console.log(`LEWATI  ${h.berkas}  (${l.t.slice(0, 10)} ${l.vonis}: ${l.ringkas})`)
    else if (h.status === 'ULANG')
      console.log(
        `ULANG   ${h.berkas}  (${h.sebab} sejak ${l.t.slice(0, 10)}; vonis lama ${l.vonis}: ${l.ringkas})`,
      )
    else if (h.status === 'HILANG') console.log(`HILANG  ${h.berkas}`)
    else console.log(`BARU    ${h.berkas}`)
  }
  const n = (s) => hasil.filter((h) => h.status === s).length
  console.log(
    `\n${n('LEWATI')} dilewati (vonis lama berlaku) · ${n('ULANG') + n('BARU')} wajib diperiksa · ${n('HILANG')} hilang`,
  )
}

function cmdCatat(nama, berkas, vonis, ringkas) {
  pastikanAgent(nama)
  if (!berkas || !vonis || !ringkas)
    mati('pakai: catat <nama> <berkas> <bersih|temuan|dikerjakan> "<ringkas>"')
  if (!VONIS.includes(vonis)) mati(`vonis "${vonis}" tidak sah; pilih ${VONIS.join(' | ')}`)
  const rel = relatif(berkas)
  const b = blob(rel)
  if (!b) mati(`berkas ${rel} tidak ada — jejak cuma untuk berkas yang benar-benar ada`)
  let sha = ''
  try {
    sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim()
  } catch {}
  fs.mkdirSync(path.dirname(berkasJejak(nama)), { recursive: true })
  const baris = {
    t: stempelWib(),
    berkas: rel,
    blob: b,
    aturan: hashAturan(nama),
    vonis,
    ringkas: ringkas.slice(0, 300),
    sha,
  }
  fs.appendFileSync(berkasJejak(nama), JSON.stringify(baris) + '\n')
  console.log(`tercatat: ${nama} · ${rel} · ${vonis}`)
}

function cmdKasus(nama, teks) {
  pastikanAgent(nama)
  if (!teks || teks.trim().length < 15)
    mati('pelajaran terlalu pendek: tulis sebab + akibat + cara tahu, satu kalimat utuh')
  const f = berkasIlmu(nama)
  if (!fs.existsSync(f))
    mati(`berkas ilmu ${path.relative(ROOT, f)} belum ada — jalankan npm run agents:build`)
  const isi = fs.readFileSync(f, 'utf8')
  if (isi.length > PLAFON_ILMU)
    mati(
      `ilmu ${nama} sudah ${isi.length} byte (plafon ${PLAFON_ILMU}). Ringkas bagian "## Kasus" dulu: gabungkan kasus sekelas jadi satu aturan di bagian atasnya, lalu tambah lagi.`,
    )
  const bersih = teks.trim().replace(/\s+/g, ' ')
  if (isi.includes(bersih)) {
    console.log('sudah tercatat, dilewati')
    return
  }
  const baris = `- ${hariIniWib()} · ${bersih}\n`
  const tambah = isi.includes('\n## Kasus')
    ? (isi.endsWith('\n') ? isi : isi + '\n') + baris
    : isi + `\n## Kasus\n\n${baris}`
  fs.writeFileSync(f, tambah)
  console.log(`kasus ditambahkan ke ${path.relative(ROOT, f)}`)
}

function cmdBaca(nama) {
  pastikanAgent(nama)
  const f = berkasIlmu(nama)
  if (fs.existsSync(f)) console.log(fs.readFileSync(f, 'utf8'))
  else console.log(`(ilmu ${nama} belum ada)`)
  const jejak = bacaJejak(nama)
  const akhir = [...terakhirPerBerkas(jejak).values()]
  console.log(`\n## Jejak (${jejak.length} catatan, ${akhir.length} berkas unik)\n`)
  if (!akhir.length) {
    console.log(
      'Belum ada. Sesudah kerja: node scripts/agents/ilmu.mjs catat ' +
        nama +
        ' <berkas> <vonis> "<ringkas>"',
    )
    return
  }
  for (const j of akhir.slice(-25))
    console.log(`- ${j.t.slice(0, 10)} ${j.vonis.padEnd(10)} ${j.berkas}: ${j.ringkas}`)
  if (akhir.length > 25)
    console.log(`… ${akhir.length - 25} berkas lebih lama; cek per berkas dengan perintah "cek"`)
}

// ── pemilik: berkas ini wilayah pengerja siapa ───────────────────────────────

const cacheGlob = new Map()
function globKeRegex(g) {
  if (!cacheGlob.has(g)) cacheGlob.set(g, susunRegex(g))
  return cacheGlob.get(g)
}

function susunRegex(g) {
  let r = ''
  for (let i = 0; i < g.length; i++) {
    const c = g[i]
    if (c === '*' && g[i + 1] === '*') {
      r += '.*'
      i++
      if (g[i + 1] === '/') i++
    } else if (c === '*') r += '[^/]*'
    else r += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${r}$`)
}

// Glob paling spesifik menang: prefiks literal terpanjang sebelum wildcard.
const spesifik = (g) => (g.search(/\*/) === -1 ? g.length + 1000 : g.search(/\*/))

export function muatRoster() {
  return JSON.parse(fs.readFileSync(ROSTER, 'utf8')).agents
}

export function pemilik(berkas, roster = muatRoster()) {
  const rel = relatif(berkas)
  const cocok = []
  for (const a of roster)
    for (const g of a.milik ?? [])
      if (globKeRegex(g).test(rel)) cocok.push({ nama: a.nama, glob: g, skor: spesifik(g) })
  if (!cocok.length) return []
  const puncak = Math.max(...cocok.map((c) => c.skor))
  return [...new Set(cocok.filter((c) => c.skor === puncak).map((c) => c.nama))]
}

function cmdPemilik(daftar) {
  if (!daftar.length) mati('sebutkan berkas')
  const roster = muatRoster()
  for (const b of daftar) {
    const p = pemilik(b, roster)
    if (p.length) {
      console.log(`${relatif(b)}  →  ${p.join(' + ')}`)
      continue
    }
    console.log(
      `${relatif(b)}  →  (tanpa pemilik: kerja orkestrator, atau tanda agent baru perlu lahir)`,
    )
  }
}

const [cmd, ...arg] = process.argv.slice(2)
const langsung =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
if (langsung) {
  if (cmd === 'baca') cmdBaca(arg[0])
  else if (cmd === 'cek') cmdCek(arg[0], arg.slice(1))
  else if (cmd === 'catat') cmdCatat(arg[0], arg[1], arg[2], arg.slice(3).join(' '))
  else if (cmd === 'kasus') cmdKasus(arg[0], arg.slice(1).join(' '))
  else if (cmd === 'pemilik') cmdPemilik(arg)
  else mati('pakai: baca | cek | catat | kasus | pemilik — lihat kepala berkas ini')
}
