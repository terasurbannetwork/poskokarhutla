/* Gerbang pilihan ujung ke ujung (ratchet, aturan pemilik 7 Nov 2026): deretan tab/segmen selalu penuh lebar dan rata tengah.
   Selektor tab/segmen dengan justify-content:flex-start|start di CSS public/** dilarang. Sasaran yang sudah ada ada di
   fixtures/pilihan-ujung-sisa.json (kunci "berkas :: selektor"). Pelengkap tests/agen... penegak global inti/jm.css. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, tegas, buangKomentarCss } from './fixtures/ratchet.mjs'

export function rataKiri(css) {
  const hasil = []
  for (const m of buangKomentarCss(css).matchAll(/([^{}]*(?:-tab\b|tablist|-seg\b|-segmen\b|\.tabs\b)[^{}]*)\{([^}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ')
    if (/justify-content\s*:\s*(flex-)?start/.test(m[2]) && !/\b(a|button|li|span)$/.test(sel)) hasil.push(sel.slice(0, 90))
  }
  return hasil
}

test('tidak ada deretan tab/segmen rata kiri baru (ratchet)', () => {
  const ukur = {}
  for (const f of berkas('public', /\.css$/)) for (const s of rataKiri(baca(f))) ukur[`${f} :: ${s}`] = (ukur[`${f} :: ${s}`] || 0) + 1
  tegas(assert, banding(ukur, muatDaftar('pilihan-ujung-sisa.json', ukur)), 'pilihan-ujung-sisa.json')
})

test('fixture jahat tertangkap, sah lolos', () => {
  assert.equal(rataKiri('.x-tab{display:flex;justify-content:flex-start}').length, 1)
  assert.equal(rataKiri('.jm-seg{justify-content:start}').length, 1)
  assert.equal(rataKiri('[role="tablist"]{justify-content:flex-start}').length, 1)
  assert.deepEqual(rataKiri('.x-tab{justify-content:center}'), [])
  assert.deepEqual(rataKiri('.x-tab button{justify-content:flex-start}'), [])
  assert.deepEqual(rataKiri('/* .x-tab{justify-content:start} */ .kartu{justify-content:start}'), [])
})
