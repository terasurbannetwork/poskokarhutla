/* Gerbang tanpa kapital (ratchet), aturan pemilik: teks KAPITAL SEMUA tidak boleh di mana pun.
   Dihitung: `text-transform: uppercase` di tiap .css di bawah public/ (tanpa vendor/, salinan " 2.", komentar).
   public/inti/*.css wajib nol dan tanpa entri daftar. Daftar sisa: fixtures/kapital-sisa.json ({berkas: jumlah}, hanya
   boleh menyusut; entri yang jadi nol harus dihapus; perintis: ISI_DAFTAR=1). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, buangKomentarCss } from './fixtures/ratchet.mjs'

const KAPITAL = /text-transform\s*:\s*uppercase/gi
export const hitung = (css) => (buangKomentarCss(css).match(KAPITAL) || []).length

const PESAN = 'perbaiki: hapus text-transform:uppercase (tulis teks dengan huruf biasa); sisa lama hanya boleh menyusut'

test('text-transform uppercase di CSS tidak bertambah (ratchet)', () => {
  const ukur = {}
  for (const f of berkas('public', /\.css$/)) { const n = hitung(baca(f)); if (n) ukur[f] = n }
  const daftar = muatDaftar('kapital-sisa.json', ukur)
  const inti = Object.keys(daftar).filter((k) => k.startsWith('public/inti/'))
  assert.deepEqual(inti, [], `public/inti wajib nol kapital, hapus dari daftar: ${inti.join(', ')}`)
  const m = banding(ukur, daftar).map((x) => `${x} | ${PESAN}`)
  assert.deepEqual(m, [], `\n${m.join('\n')}\n(daftar: tests/agen/fixtures/kapital-sisa.json)`)
})

test('pemeriksa: jahat tertangkap, sah lolos', () => {
  for (const k of ['a{text-transform:uppercase}', 'a{text-transform : UPPERCASE}']) assert.ok(hitung(k) > 0, k)
  for (const s of ['/* text-transform:uppercase */a{color:red}', 'a{text-transform:none}', 'a{text-transform:capitalize}']) assert.equal(hitung(s), 0, s)
})

test('banding: berkas baru, naik, entri bersih = merah', () => {
  assert.equal(banding({ 'a.css': 1 }, {}).length, 1)
  assert.equal(banding({ 'a.css': 3 }, { 'a.css': 2 }).length, 1)
  assert.equal(banding({}, { 'a.css': 2 }).length, 1)
  assert.deepEqual(banding({ 'a.css': 2 }, { 'a.css': 2 }), [])
})
