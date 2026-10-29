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
//   node scripts/agents/ilmu.mjs prompt [regex]      prompt pemilik yang tercatat
//   node scripts/agents/ilmu.mjs prompt-catat        hook UserPromptSubmit (stdin)
//
// ILMU_DIR menimpa folder ilmu (dipakai gerbang uji supaya tidak mengotori repo).

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

// Stempel WIB (UTC+7): zona yang dipakai layar Centurisk97.
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

function cetakPromptAgent(nama) {
  const semua = bacaPrompt()
  const milik = nama === ORKESTRATOR ? semua : semua.filter((p) => p.label.includes(nama))
  console.log(`\n## Prompt pemilik terkait (${milik.length}; cari lagi: ilmu.mjs prompt <regex>)\n`)
  for (const p of milik.slice(-10)) cetakPrompt(p)
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

// ── prompt: tiap prompt pemilik tercatat, disamarkan, diberi label agent ─────
//
// Pemilik 29 Okt 2026: "setiap prompt ... dicatat, konteksnya diperbanyak".
// Hook UserPromptSubmit (.claude/settings.json) memanggil `prompt-catat`; agent
// membacanya lagi lewat `baca <nama>` (prompt berlabel dia) dan `prompt <regex>`.
// Repo ini PUBLIK dan pemilik memilih prompt tetap di-commit, jadi penyamaran
// di bawah adalah satu-satunya penjaga: kunci, email, nomor HP, NIK, tempelan.

const berkasPrompt = (bulan) => path.join(DIR, 'prompt', `${bulan}.jsonl`)
const PROMPT_MAKS = 4000

const SAMAR = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[kunci-privat]'],
  [/<pasted_content[^>]*>([\s\S]*?)<\/pasted_content[^>]*>/g, (_, isi) => `[tempelan ${isi.length} karakter]`],
  [/\b(?:sk-[\w-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|AKIA[0-9A-Z]{16}|xox[abpr]-[\w-]{10,}|AIza[\w-]{30,})/g, '[kunci]'],
  [/\b(Bearer\s+)[\w.~+/-]{16,}=*/gi, '$1[kunci]'],
  [/\b((?:api[_-]?key|token|secret|password|passwd|pwd|sandi|kata sandi)\s*[:=]\s*)\S+/gi, '$1[rahasia]'],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]'],
  [/(?<![\w])(?:\+?62|0)\s?8\d{1,2}[\s.-]?\d{3,4}[\s.-]?\d{3,5}(?!\d)/g, '[telp]'],
  [/(?<!\d)\d{16}(?!\d)/g, '[nik]'],
  // Token panjang tanpa titik/garis miring (jalur berkas lolos): wajib ada angka.
  [/\b(?=[A-Za-z_-]*\d)[A-Za-z0-9_-]{40,}\b/g, '[token]'],
]

export function samarkan(teks) {
  let t = String(teks)
  for (const [re, ganti] of SAMAR) t = t.replace(re, ganti)
  return t.length > PROMPT_MAKS ? t.slice(0, PROMPT_MAKS) + ` …[+${t.length - PROMPT_MAKS} karakter]` : t
}

// Kata yang cuma punya satu arti modul. Kata lintas modul (bnpb, peta, laporan)
// sengaja tidak ada: label yang salah lebih buruk daripada tanpa label.
const KATA = {
  banjir: 'banjir', rob: 'banjir', gempa: 'gempa', tsunami: 'gempa', longsor: 'longsor',
  abrasi: 'pesisir', pesisir: 'pesisir', sippa: 'sippa', 'gunung api': 'gunungapi-kering',
  gunungapi: 'gunungapi-kering', kekeringan: 'gunungapi-kering', ispu: 'cuaca-udara',
  'kualitas udara': 'cuaca-udara', 'neraca air': 'neraca-air', sebaran: 'model-sebaran',
  firms: 'pipa-data', hotspot: 'pipa-data', 'titik panas': 'pipa-data', d1: 'warga-api',
  migrasi: 'warga-api', workflow: 'mekanik-mesin', whatsapp: 'wa-bot', 'bot wa': 'wa-bot',
}

const RE_BERKAS = /(?:[\w.-]+\/)+[\w.-]+\.\w{1,5}\b|\b[\w-]+\.(?:mjs|js|py|md|json|jsonc|html|css|yml|sql)\b/g

export function labelPrompt(teks, roster = muatRoster()) {
  const berkas = [...new Set(String(teks).match(RE_BERKAS) ?? [])].slice(0, 20)
  const label = new Set(berkas.flatMap((b) => pemilik(b, roster)))
  const kecil = String(teks).toLowerCase()
  for (const [k, a] of Object.entries(KATA)) if (new RegExp(`\\b${k}\\b`).test(kecil)) label.add(a)
  const ada = new Set(roster.map((a) => a.nama))
  return { label: [...label].filter((a) => ada.has(a)).sort(), berkas }
}

// Pesan otomatis harness, bukan suara pemilik.
const OTOMATIS = /^\s*<(task-notification|side-sessions-event|ci-monitor-event|system-reminder)/

function cmdPromptCatat() {
  // Hook: tidak boleh pernah menahan prompt, apa pun yang terjadi.
  try {
    const m = JSON.parse(fs.readFileSync(0, 'utf8'))
    const asli = String(m.prompt ?? '').trim()
    if (asli.length < 4 || OTOMATIS.test(asli)) return
    const prompt = samarkan(asli)
    const t = stempelWib()
    const baris = { t, sesi: String(m.session_id ?? '').slice(0, 8), prompt, ...labelPrompt(prompt) }
    const f = berkasPrompt(t.slice(0, 7))
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.appendFileSync(f, JSON.stringify(baris) + '\n')
  } catch {}
}

export function bacaPrompt() {
  const dir = path.join(DIR, 'prompt')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n'))
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

const cetakPrompt = (p) =>
  console.log(`- ${p.t.slice(0, 16).replace('T', ' ')} [${p.label.join(', ') || '-'}] ${p.prompt.replace(/\s+/g, ' ').slice(0, 400)}`)

function cmdPrompt(pola) {
  const semua = bacaPrompt()
  const re = pola ? new RegExp(pola, 'i') : null
  const cocok = re ? semua.filter((p) => re.test(p.prompt) || p.label.some((l) => re.test(l))) : semua
  for (const p of cocok.slice(-30)) cetakPrompt(p)
  console.log(`\n${cocok.length} dari ${semua.length} prompt${cocok.length > 30 ? ' (30 terakhir tampil)' : ''}`)
}

const [cmd, ...arg] = process.argv.slice(2)
const langsung =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
if (langsung) {
  if (cmd === 'baca') {
    cmdBaca(arg[0])
    cetakPromptAgent(arg[0])
  } else if (cmd === 'prompt-catat') cmdPromptCatat()
  else if (cmd === 'prompt') cmdPrompt(arg[0])
  else if (cmd === 'cek') cmdCek(arg[0], arg.slice(1))
  else if (cmd === 'catat') cmdCatat(arg[0], arg[1], arg[2], arg.slice(3).join(' '))
  else if (cmd === 'kasus') cmdKasus(arg[0], arg.slice(1).join(' '))
  else if (cmd === 'pemilik') cmdPemilik(arg)
  else mati('pakai: baca | cek | catat | kasus | pemilik | prompt | prompt-catat — lihat kepala berkas ini')
}
