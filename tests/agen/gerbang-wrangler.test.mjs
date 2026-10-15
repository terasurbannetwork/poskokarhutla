// Gerbang config produksi worker (15 Okt 2026).
//
// CI men-deploy dengan `wrangler@3 deploy` tanpa -c, jadi yang terbit selalu
// wrangler.jsonc. Cron FIRMS (`15 */3 * * *`) dan R2 `MEDIA` sempat hanya ada
// di wrangler.warga.jsonc: titik panas D1 berhenti diperbarui dan unggah foto
// menjawab 503, tanpa satu pun uji merah. Gerbang ini menurunkan kebutuhan dari
// kode (`env.X` dan konstanta `CRON_*` di src/) lalu menagihnya ke wrangler.jsonc.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

// jsonc repo ini: komentar hanya sebaris penuh, tanpa koma gantung
const jsonc = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^\s*\/\/.*$/gm, ''))
const prod = jsonc('wrangler.jsonc')
const usulan = jsonc('wrangler.warga.jsonc')
const src = readdirSync('src').filter((f) => f.endsWith('.js')).map((f) => readFileSync(`src/${f}`, 'utf8')).join('\n')

const binding = (c) => new Set([
  ...(c.d1_databases ?? []).map((d) => d.binding),
  ...(c.r2_buckets ?? []).map((r) => r.binding),
  ...(c.kv_namespaces ?? []).map((k) => k.binding),
  c.assets?.binding,
].filter(Boolean))
const dipakai = new Set([...src.matchAll(/env\.([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]))
const cronKode = [...src.matchAll(/CRON_[A-Z0-9_]+\s*=\s*"([^"]+)"/g)].map((m) => m[1])

test('kode memang memakai DB, MEDIA, dan CRON_TITIK (regex gerbang masih menangkap)', () => {
  for (const b of ['DB', 'MEDIA']) assert.ok(dipakai.has(b), `env.${b} tidak lagi terbaca dari src/`)
  assert.ok(cronKode.includes('15 */3 * * *'), 'CRON_TITIK tidak terbaca dari src/')
})

test('wrangler.jsonc punya tiap binding yang dipakai src/', () => {
  const dikenal = new Set([...binding(prod), ...binding(usulan)])
  const kurang = [...dipakai].filter((b) => dikenal.has(b) && !binding(prod).has(b))
  assert.deepEqual(kurang, [], `wrangler.jsonc (produksi) tanpa binding: ${kurang.join(', ')}`)
})

test('wrangler.jsonc punya tiap cron yang ditunggu scheduled()', () => {
  const ada = new Set(prod.triggers?.crons ?? [])
  const kurang = [...new Set([...cronKode, ...(usulan.triggers?.crons ?? [])])].filter((c) => !ada.has(c))
  assert.deepEqual(kurang, [], `wrangler.jsonc (produksi) tanpa cron: ${kurang.join(', ')}`)
})
