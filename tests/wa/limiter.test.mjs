// BL-09 Q1: batas percakapan 40 per tujuan per hari untuk balasan ke orang yang menulis dalam 10 menit terakhir; lainnya tetap 8, global tidak berubah.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const JALUR = require.resolve('../../scripts/wa/gateway/limiter.js')
const KUNCI = ['WA_MAX_PER_MINUTE', 'WA_MAX_PER_HOUR', 'WA_MAX_PER_DAY', 'WA_MAX_PER_TARGET_DAY', 'WA_MAX_PER_TARGET_PERCAKAPAN', 'WA_PERCAKAPAN_MS', 'WA_WARMUP_PER_DAY', 'WA_WARMUP_DAYS']

function muat({ pemanasan = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bl-limit-'))
  if (!pemanasan) fs.writeFileSync(path.join(dir, 'limit-state.json'), JSON.stringify({ warmupUntil: 0 }))
  process.env.WA_STATE_DIR = dir
  for (const k of KUNCI) delete process.env[k]
  delete require.cache[JALUR]
  return require(JALUR)
}
const A = '6281234567890@s.whatsapp.net', B = '6281299990001@s.whatsapp.net'

// Kirim satu (tanpa slot: jeda 15-20 dtk tidak diuji di sini), lalu majukan jam 61 dtk supaya batas per menit tidak ikut.
function kirim(L, t, tujuan, opsi) {
  const g = L.check(tujuan, opsi)
  if (g.ok) L.commit(tujuan, g.percakapan)
  t.mock.timers.tick(61000)
  return g
}

test('batas global dan per tujuan bawaan tidak berubah', (t) => {
  const L = muat()
  assert.deepEqual(L.stats().caps, { minute: 3, hour: 60, day: 300, target_day: 8, target_day_percakapan: 40 })
  assert.equal(L.stats().gap_ms[0], 15000)
  assert.equal(L.stats().gap_ms[1], 20000)
  const P = muat({ pemanasan: true })
  assert.equal(P.stats().warmup, true)
  assert.equal(P.stats().daily_cap, 40)
  void t
})

test('balasan percakapan: 40 per tujuan, terpisah dari 8 kiriman biasa', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-18T01:00:00Z') })
  const L = muat()
  for (let i = 0; i < 8; i++) assert.equal(kirim(L, t, A).ok, true, 'biasa ' + i)
  assert.equal(kirim(L, t, A).error, 'batas per tujuan/hari')
  for (let i = 0; i < 40; i++) { L.noteMasuk(A); const g = kirim(L, t, A, { balasan: true }); assert.equal(g.ok, true, 'percakapan ' + i); assert.equal(g.percakapan, true) }
  L.noteMasuk(A)
  assert.equal(kirim(L, t, A, { balasan: true }).error, 'batas percakapan per tujuan/hari')
  assert.equal(kirim(L, t, A).error, 'batas per tujuan/hari', 'kiriman biasa tetap 8')
  assert.equal(L.stats().sent_today, 48, 'semua tetap dihitung batas harian global')
})

test('balasan tanpa pesan masuk 10 menit terakhir memakai batas biasa 8', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-18T01:00:00Z') })
  const L = muat()
  L.noteMasuk(A)
  t.mock.timers.tick(10 * 60000)
  const g = L.check(A, { balasan: true })
  assert.equal(g.ok, true)
  assert.equal(g.percakapan, false)
  L.noteMasuk(B)
  assert.equal(L.check(B).percakapan, false, 'bukan balasan (mis. kiriman PENERIMA) tetap biasa')
  assert.equal(L.check(B, { balasan: true }).percakapan, true)
})

test('batas per menit global tetap berlaku untuk percakapan', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-18T01:00:00Z') })
  const L = muat()
  L.noteMasuk(A)
  for (let i = 0; i < 3; i++) { const g = L.check(A, { balasan: true }); assert.equal(g.ok, true); L.commit(A, g.percakapan) }
  assert.equal(L.check(A, { balasan: true }).error, 'batas per menit')
  assert.equal(L.check(B).error, 'batas per menit')
})

test('pemanasan: percakapan paling banyak separuh batas harian, kiriman terjadwal tetap dapat jatah', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-18T01:00:00Z') })
  const L = muat({ pemanasan: true })
  for (let i = 0; i < 20; i++) { L.noteMasuk(i % 2 ? A : B); assert.equal(kirim(L, t, i % 2 ? A : B, { balasan: true }).ok, true) }
  L.noteMasuk(A)
  assert.equal(kirim(L, t, A, { balasan: true }).error, 'batas percakapan (pemanasan)')
  const C = (n) => '62812000000' + String(n).padStart(2, '0') + '@s.whatsapp.net'
  for (let i = 0; i < 20; i++) assert.equal(kirim(L, t, C(i)).ok, true, 'terjadwal ' + i)
  assert.equal(kirim(L, t, C(99)).error, 'batas harian (pemanasan)')
})

test('pembangunan lama: balasan dihitung dari jam pesan masuk, tetap percakapan', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-18T01:00:00Z') })
  const L = muat()
  L.noteMasuk(A)
  const masuk = Date.now()
  t.mock.timers.tick(25 * 60000) // bangun 25 menit
  assert.equal(L.check(A, { balasan: true }).percakapan, false, 'tanpa jam masuk: jendela 10 menit sudah lewat')
  assert.equal(L.check(A, { balasan: true, masuk }).percakapan, true)
  t.mock.timers.tick(2 * 3600000)
  assert.equal(L.check(A, { balasan: true, masuk }).percakapan, false, 'lebih dari 2 jam sesudah pesan masuk: batas biasa')
  assert.equal(L.check(B, { balasan: true, masuk: Date.now() }).percakapan, false, 'tanpa pesan masuk dari tujuan itu: batas biasa')
})
