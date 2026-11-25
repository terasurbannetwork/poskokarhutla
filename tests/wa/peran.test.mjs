// Dua bot, dua nomor (pemilik 24 Nov 2026): satu gateway, saklar WA_PERAN. Uji saklar murni, rumah dan jatah limiter per peran,
// dan pagar teks di gateway (Baileys tidak bisa dijalankan di uji): tiap fitur dijaga peran yang benar.
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { bacaPeran, PERAN } = require('../../scripts/wa/peran.cjs')

test('saklar: kosong = semua, lapor dan laporan saling meniadakan, nilai lain ditolak', () => {
  assert.deepEqual(bacaPeran({}), { peran: 'semua', lapor: true, laporan: true })
  assert.deepEqual(bacaPeran({ WA_PERAN: ' ' }), { peran: 'semua', lapor: true, laporan: true })
  assert.deepEqual(bacaPeran({ WA_PERAN: 'lapor' }), { peran: 'lapor', lapor: true, laporan: false })
  assert.deepEqual(bacaPeran({ WA_PERAN: 'LAPORAN' }), { peran: 'laporan', lapor: false, laporan: true })
  for (const x of ['lapor,laporan', 'bot', 'keduanya']) assert.throws(() => bacaPeran({ WA_PERAN: x }), /WA_PERAN tidak dikenal/)
  assert.deepEqual(PERAN, ['semua', 'lapor', 'laporan'])
})

// Proses anak supaya RUMAH (dihitung saat umum.cjs dimuat) dan limiter benar-benar membaca env baru.
const jalan = (env, kode) => execFileSync(process.execPath, ['-e', kode], { cwd: AKAR, env: { ...process.env, WA_STATE_DIR: '', ...env }, encoding: 'utf8' }).trim()

test('rumah per peran: WA_RUMAH menggeser rumah dan berkas jatah limiter; kosong = ~/.wa-bot', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-peran-'))
  const r = path.join(dir, 'lapor')
  assert.equal(jalan({ WA_RUMAH: r }, "process.stdout.write(require('./scripts/wa/umum.cjs').RUMAH)"), r)
  assert.equal(jalan({ WA_RUMAH: '' }, "process.stdout.write(require('./scripts/wa/umum.cjs').RUMAH)"), path.join(os.homedir(), '.wa-bot'))
  // limiter menulis limit-state.json di rumah peran: kiriman satu bot tidak memakan jatah bot lain
  jalan({ WA_RUMAH: r }, "const L=require('./scripts/wa/gateway/limiter.js'); const g=L.check('6281234567890@s.whatsapp.net'); if(g.ok) L.commit('6281234567890@s.whatsapp.net', g.percakapan)")
  assert.ok(fs.existsSync(path.join(r, 'limit-state.json')))
})

test('gateway: tiap fitur dijaga peran yang benar', () => {
  const s = fs.readFileSync(path.join(AKAR, 'scripts/wa/gateway/index.js'), 'utf8').replace(/\r\n/g, '\n') // checkout Windows bisa CRLF
  assert.match(s, /const PERAN = require\('\.\.\/peran\.cjs'\)\.bacaPeran\(process\.env\)/)
  // Bot Laporan BNPB: proyek, pendaftaran, logbook, Drive, OCR hanya di peran laporan
  assert.match(s, /const BL = PERAN\.laporan && process\.env\.BL_PROYEK === '1'/)
  assert.match(s, /if \(PERAN\.laporan\) DF\.mulai\(\)/)
  assert.match(s, /PERAN\.laporan && !susulan && await logbookCegat\(m\)/)
  assert.match(s, /const putusan = PERAN\.laporan && /)
  assert.match(s, /if \(PERAN\.laporan\) \{ setInterval\(tickDrive/)
  assert.match(s, /if \(PERAN\.laporan\) OCR\.bacaStempel/)
  assert.match(s, /if \(PERAN\.laporan\) app\.post\('\/riwayat'/)
  // Lapor Bencana dan antrean Worker (/masuk, /petugas) hanya di peran lapor
  assert.match(s, /const LAPOR = !PERAN\.lapor \? Promise\.resolve\(null\)/)
  assert.match(s, /if \(lapanganJalan \|\| !KUNCI \|\| !PERAN\.lapor\) return/)
  // sesudah blok lapor, peran lapor berhenti: jalur bahan tidak pernah jalan di nomor lama
  const i = s.indexOf('// <<< lapor-ai\n      // Peran lapor'), j = s.indexOf('if (!PERAN.laporan) continue', i)
  assert.ok(i > 0 && j > i && j < s.indexOf('const izin = IZIN.has(dari)', i), 'blok lapor harus diikuti "if (!PERAN.laporan) continue" sebelum jalur bahan')
})

test('plist dua peran: rumah, sesi, dan PORT berbeda; laporan tetap 3101 dan ~/.wa-bot', () => {
  const baca = (n) => fs.readFileSync(path.join(AKAR, 'scripts/wa/launchd', `id.centurisk97.wa-gateway-${n}.plist`), 'utf8')
  const nilai = (s, k) => (s.match(new RegExp(`<key>${k}</key>\\s*<string>([^<]*)</string>`)) || [])[1]
  const a = baca('lapor'), b = baca('laporan')
  assert.equal(nilai(a, 'WA_PERAN'), 'lapor'); assert.equal(nilai(b, 'WA_PERAN'), 'laporan')
  assert.equal(nilai(b, 'PORT'), '3101'); assert.equal(nilai(b, 'WA_RUMAH'), '__HOME__/.wa-bot')
  for (const k of ['PORT', 'WA_RUMAH', 'WA_AUTH_DIR', 'Label']) assert.notEqual(nilai(a, k), nilai(b, k), k)
  assert.ok(nilai(a, 'WA_AUTH_DIR').startsWith(nilai(a, 'WA_RUMAH')) && nilai(b, 'WA_AUTH_DIR').startsWith(nilai(b, 'WA_RUMAH')))
})
