// PB-62 (F-30 CI): tiap scripts/umum/*.py yang punya subperintah `uji` dijalankan `python3 -I <skrip> uji` dan wajib lulus.
// Daftar skrip dibaca dari direktori, bukan ditulis tangan; skrip lama yang belum patuh ditampung ratchet
// tests/agen/fixtures/uji-skrip-sisa.json (hanya boleh menyusut). Ikut CI lewat `npm run uji:agen` (terbit.yml);
// dijalankan sendiri: `npm run uji:umum`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { AKAR, muatDaftar } from './fixtures/ratchet.mjs'

const DIR = 'scripts/umum'
const BATAS_MS = 60_000 /* per skrip; uji sekarang semuanya < 3 detik */
const daftar = muatDaftar('uji-skrip-sisa.json')
const skrip = fs.readdirSync(path.join(AKAR, DIR)).filter((n) => n.endsWith('.py') && !/ 2\./.test(n)).sort()
/* Hanya skrip yang menulis literal 'uji'/"uji" yang dijalankan: skrip tanpa cabang uji biasanya menjalankan kerja
   sungguhan (unduh, tulis public/data) saat diberi argumen asing. */
const punyaUji = (n) => /["']uji["']/.test(fs.readFileSync(path.join(AKAR, DIR, n), 'utf8'))
const jalan = (n) => {
  const r = spawnSync('python3', ['-I', path.join(DIR, n), 'uji'], { cwd: AKAR, encoding: 'utf8', timeout: BATAS_MS, killSignal: 'SIGKILL' })
  const ekor = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-3).join(' | ')
  return { ok: r.status === 0, sebab: r.error ? `${r.error.code === 'ETIMEDOUT' ? `lewat ${BATAS_MS / 1000} detik` : r.error.message}` : `keluar ${r.status ?? r.signal}: ${ekor}` }
}

test('skrip scripts/umum tanpa subperintah uji hanya yang tercatat di ratchet', () => {
  const m = []
  for (const n of skrip) if (!punyaUji(n) && !(n in daftar['tanpa-uji'])) m.push(`BARU ${n}: tanpa subperintah \`uji\`. Akibat: rumusnya tidak pernah diuji di CI. Perbaiki: tambahkan cabang \`if sys.argv[1:] == ["uji"]: uji()\` berisi assert (jangan masukkan ke daftar)`)
  for (const n of Object.keys(daftar['tanpa-uji'])) {
    if (!skrip.includes(n)) m.push(`BASI ${n}: berkasnya sudah tidak ada; hapus entri tanpa-uji ini`)
    else if (punyaUji(n)) m.push(`BASI ${n}: sudah punya subperintah uji; hapus entri tanpa-uji ini supaya ujinya ikut dijalankan`)
  }
  assert.deepEqual(m, [], `\n${m.join('\n')}\n(daftar: tests/agen/fixtures/uji-skrip-sisa.json; hanya boleh menyusut, jangan dilonggarkan)`)
})

test('tiap `python3 -I scripts/umum/<skrip>.py uji` lulus', { timeout: skrip.length * BATAS_MS }, () => {
  const m = []
  for (const n of skrip.filter(punyaUji)) {
    const r = jalan(n)
    if (n in daftar.gagal) { if (r.ok) m.push(`BASI ${n}: uji sudah lulus; hapus entri gagal ini dari daftar`) }
    else if (!r.ok) m.push(`GAGAL ${n}: ${r.sebab}. Akibat: rumus skrip ini rusak atau ujinya basi, dan CI meloloskannya. Perbaiki skripnya (pemilik pipa-umum), jangan masukkan ke daftar`)
  }
  for (const n of Object.keys(daftar.gagal)) if (!skrip.includes(n) || !punyaUji(n)) m.push(`BASI ${n}: berkasnya hilang atau tidak lagi punya uji; hapus entri gagal ini`)
  assert.deepEqual(m, [], `\n${m.join('\n')}\n(daftar: tests/agen/fixtures/uji-skrip-sisa.json; hanya boleh menyusut, jangan dilonggarkan)`)
})
