#!/usr/bin/env node
// Ukur latensi jalur API bot (pemilik 20 Nov 2026: "emang jadi lebih lambat ya? kita bisa tau latencynya gitu ga?").
//
//   node scripts/wa/ukur_latensi.mjs            # Opus 5.5 (model agen), 3 kali
//   node scripts/wa/ukur_latensi.mjs --haiku 5  # Haiku 5.5, 5 kali
//
// Tiap panggilan streaming meminta jawaban sekitar 400 token, sama seperti bot memanggil lewat ANTHROPIC_BASE_URL (9router, header x-app: cli).
// Diukur: waktu sampai token pertama (TTFT), lama total, token keluar, dan laju tulis (token per detik sesudah token pertama).
// Bila ANTHROPIC_API_KEY_LANGSUNG ada di .env, jalur langsung api.anthropic.com ikut diukur sebagai pembanding.
// Hasil ditambahkan ke ~/.wa-bot/agen/latensi.log supaya bisa dibandingkan antarhari. Biaya Opus sekitar $0,03 per panggilan. Kunci tidak dicetak.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

createRequire(import.meta.url)('./umum.cjs').muatEnv()
const env = process.env
const arg = process.argv.slice(2)
const model = arg.includes('--haiku') ? 'claude-haiku-5-5' : 'claude-opus-5-5'
const n = Math.min(10, Math.max(1, Number(arg.find((a) => /^\d+$/.test(a))) || 3))
const SDK = createRequire(new URL('./gateway/package.json', import.meta.url))('@anthropic-ai/sdk')
const Kelas = SDK.default || SDK.Anthropic || SDK
const PROMPT = 'Tulis 12 kalimat bernomor tentang kesiapsiagaan banjir di permukiman tepi sungai. Bahasa Indonesia, tiap kalimat 20 sampai 30 kata. Tanpa pembuka atau penutup.'

const jalur = []
if (env.ANTHROPIC_BASE_URL) jalur.push({ nama: `router (${new URL(env.ANTHROPIC_BASE_URL).host})`, klien: new Kelas({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL, defaultHeaders: { 'x-app': 'cli' }, maxRetries: 0 }) })
else if (env.ANTHROPIC_API_KEY) jalur.push({ nama: 'langsung (api.anthropic.com)', klien: new Kelas({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 0 }) })
if (env.ANTHROPIC_API_KEY_LANGSUNG) jalur.push({ nama: 'langsung (api.anthropic.com)', klien: new Kelas({ apiKey: env.ANTHROPIC_API_KEY_LANGSUNG, maxRetries: 0 }) })
if (!jalur.length) { console.error('ANTHROPIC_API_KEY tidak ada di .env'); process.exit(2) }

async function sekali(klien) {
  const t0 = Date.now()
  let pertama = null
  const s = klien.messages.stream({ model, max_tokens: 700, messages: [{ role: 'user', content: PROMPT }] })
  s.on('text', () => { if (pertama == null) pertama = Date.now() })
  const m = await s.finalMessage()
  const akhir = Date.now(), keluar = m.usage?.output_tokens || 0
  return { ttft: (pertama ?? akhir) - t0, total: akhir - t0, keluar, laju: keluar / Math.max(0.001, (akhir - (pertama ?? t0)) / 1000) }
}

const median = (xs) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : 0 }
const catat = []
console.log(`Model ${model}, ${n} kali per jalur\n`)
for (const j of jalur) {
  const hasil = []
  for (let i = 0; i < n; i++) {
    try {
      const r = await sekali(j.klien)
      hasil.push(r)
      console.log(`  ${j.nama} #${i + 1}: token pertama ${(r.ttft / 1000).toFixed(1)} dtk, total ${(r.total / 1000).toFixed(1)} dtk, ${r.keluar} token, ${r.laju.toFixed(0)} token/dtk`)
    } catch (e) {
      console.log(`  ${j.nama} #${i + 1}: GAGAL ${String(e?.status || '')} ${String(e?.message || e).slice(0, 160)}`)
    }
  }
  if (!hasil.length) continue
  const ring = { waktu: new Date().toISOString(), jalur: j.nama, model, n: hasil.length, ttft_dtk: +(median(hasil.map((r) => r.ttft)) / 1000).toFixed(1),
    total_dtk: +(median(hasil.map((r) => r.total)) / 1000).toFixed(1), token_per_dtk: Math.round(median(hasil.map((r) => r.laju))) }
  catat.push(ring)
  console.log(`  => median: token pertama ${ring.ttft_dtk} dtk, laju ${ring.token_per_dtk} token/dtk\n`)
}
try {
  const f = path.join(env.WA_RUMAH || path.join(os.homedir(), '.wa-bot'), 'agen', 'latensi.log')
  fs.mkdirSync(path.dirname(f), { recursive: true })
  for (const c of catat) fs.appendFileSync(f, JSON.stringify(c) + '\n')
  const lama = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).slice(-10)
  console.log('Riwayat (10 terakhir, latensi.log):'); for (const l of lama) console.log('  ' + l)
} catch {}
