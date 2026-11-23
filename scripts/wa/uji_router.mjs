// Uji jalur API bot sebelum dipakai sungguhan (pemilik 19 Nov 2026: ganti kunci Anthropic ke 9router, $400 kredit dua akun).
// node scripts/wa/uji_router.mjs
// Memeriksa tiga hal persis seperti bot memakainya: (1) Haiku + structured output (tebak maksud), (2) Opus + structured output
// (tanya draf), (3) agen Claude Code lewat Agent SDK (V2). Tiap uji satu panggilan kecil; total biaya di bawah $0,05.
// Tidak memanggil Worker, WhatsApp, atau Drive. Kunci tidak pernah dicetak.
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buatKlien } from './claude.mjs'

const DI = path.dirname(fileURLToPath(import.meta.url))
createRequire(import.meta.url)('./umum.cjs').muatEnv()
const env = process.env
const tujuan = env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com (langsung)'
console.log(`Tujuan API: ${tujuan}`)
console.log(`Kunci: ${env.ANTHROPIC_API_KEY ? 'ada (' + env.ANTHROPIC_API_KEY.length + ' huruf)' : 'TIDAK ADA'}${env.BL_AGEN_KUNCI ? ', kunci agen khusus ada' : ''}`)

let mikro = 0
const klien = buatKlien({ env, dep: { bacaBiaya: async () => 0, tambahBiaya: async (_t, u) => { mikro += u } } })
const hasil = []
async function uji(nama, fn) {
  const t = Date.now()
  try { const r = await fn(); hasil.push({ uji: nama, ok: true, detik: Math.round((Date.now() - t) / 100) / 10, ...r }) } catch (e) {
    hasil.push({ uji: nama, ok: false, galat: String(e?.kode || e?.status || '') + ' ' + String(e?.message || e).slice(0, 300) })
  }
}

await uji('1. Haiku, tebak maksud (structured output)', async () => {
  const r = await klien.maksud('tolong bikinin laporan harian kemarin ya', { hari_ini: '2026-11-19', proyek: [] })
  if (r.maksud !== 'buat') throw new Error(`maksud tidak sesuai: ${JSON.stringify(r)}`)
  return { maksud: r.maksud, jenis: r.jenis }
})
await uji('2. Opus, tanya draf (structured output)', async () => {
  const r = await klien.jawabDraf([{ slide: 1, shape: 'judul', teks: 'Banjir Aceh Tamiang: 2.756 KK terdampak' }], ['v1: buat'], 'berapa KK terdampak di Aceh Tamiang?')
  if (!/2\.?756/.test(r.jawaban)) throw new Error(`jawaban tidak memuat angka deck: ${r.jawaban}`)
  return { jawaban: r.jawaban.slice(0, 80) }
})
await uji('3. Agen Claude Code (Agent SDK)', async () => {
  let query
  for (const p of [pathToFileURL(path.join(DI, 'gateway', 'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'sdk.mjs')).href, '@anthropic-ai/claude-agent-sdk']) {
    try { query = (await import(p)).query; break } catch {}
  }
  if (!query) throw new Error('SDK agen belum terpasang')
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'uji-router-'))
  const envAgen = { PATH: env.PATH, HOME: env.HOME, ANTHROPIC_API_KEY: env.BL_AGEN_KUNCI || env.ANTHROPIC_API_KEY, ...(env.ANTHROPIC_BASE_URL ? { ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL } : {}) }
  let akhir = null
  for await (const m of query({ prompt: 'Balas hanya dengan kata: SIAP', options: { cwd, model: 'claude-opus-5-5', maxTurns: 1, tools: [], settingSources: [], maxBudgetUsd: 0.5, env: envAgen } })) {
    if (m?.type === 'result') akhir = m
  }
  fs.rmSync(cwd, { recursive: true, force: true })
  if (!akhir || akhir.is_error || !/SIAP/i.test(String(akhir.result || ''))) throw new Error(`agen: ${akhir?.subtype || 'tanpa hasil'} ${String(akhir?.result || '').slice(0, 120)}`)
  mikro += Math.round(Number(akhir.total_cost_usd || 0) * 1e6)
  return { balasan: String(akhir.result).trim().slice(0, 20) }
})

for (const h of hasil) console.log(`${h.ok ? 'LOLOS' : 'GAGAL'}  ${h.uji}${h.ok ? `  (${h.detik} dtk)` : `\n       ${h.galat}`}`)
console.log(`Perkiraan biaya uji: $${(mikro / 1e6).toFixed(4)}`)
process.exit(hasil.every((h) => h.ok) ? 0 : 1)
