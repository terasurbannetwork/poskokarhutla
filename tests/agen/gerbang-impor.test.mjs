/* Gerbang impor (FITUR.md §7.5, WEBSITE.md §6d, pemilik 21 Nov 2026): pengurai CSV hanya satu, uraiCsv/csvObjek di public/inti/impor.js.
   Tanda pengurai tulisan tangan: perbandingan satu karakter dengan tanda kutip ganda (c === '"'), inti tiap tokenizer CSV.
   Sisa lama (SIPPA dan bot WA, punya aturan dokumen sendiri) ada di fixtures/impor-sisa.json; hanya boleh menyusut. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, tegas, buangKomentarJs } from './fixtures/ratchet.mjs'

const POLA = /===\s*(?:'"'|"\\"")/g
const hitung = (k) => (buangKomentarJs(k).match(POLA) || []).length
const RUMAH = 'public/inti/impor.js'

test('pengurai CSV tulisan tangan tidak bertambah di luar public/inti/impor.js (ratchet)', () => {
  const ukur = {}
  for (const d of ['src', 'public', 'scripts']) for (const f of berkas(d, /\.m?js$/)) {
    if (f === RUMAH || /\/vendor\//.test(f)) continue
    const n = hitung(baca(f)); if (n) ukur[f] = n
  }
  tegas(assert, banding(ukur, muatDaftar('impor-sisa.json', ukur)), 'impor-sisa.json')
})

test('rumah impor memuat pengurai (pemindai tidak buta)', () => assert.ok(hitung(baca(RUMAH)) > 0))

test('pola menangkap tokenizer, mengabaikan penulis CSV', () => {
  assert.ok(hitung(`if (c === '"') q = true`) > 0); assert.ok(hitung('if (h === "\\"") q = 1') > 0)
  assert.equal(hitung('s.replace(/"/g, \'""\')'), 0); assert.equal(hitung("// c === '\"'"), 0)
})
