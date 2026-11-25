/* Uji murni penetral CSV Desa Waspada (RENCANA-UJI §5 butir 10): sel teks berawalan = + - @ tab CR diberi apostrof sebelum dikutip. */
import test from 'node:test'
import assert from 'node:assert/strict'
import {muatCsv} from './_muat.mjs'

test('penetral menetralkan = + - @ tab CR; teks biasa dan angka tak berubah', () => {
  const {netral, sel} = muatCsv()
  for (const awal of ['=', '+', '-', '@', '\t', '\r']) assert.equal(netral(awal + 'HYPERLINK("x")'), "'" + awal + 'HYPERLINK("x")', `awalan ${JSON.stringify(awal)} lolos`)
  assert.equal(netral('Pematang Limau'), 'Pematang Limau')
  assert.equal(sel('=1+1'), "'=1+1")
  assert.equal(sel('-3 Desa'), "'-3 Desa")
  assert.equal(sel(-3.26), '-3.26', 'angka negatif (lintang) tak boleh diberi apostrof')
  assert.equal(sel(null), '', 'null = sel kosong, bukan 0')
  assert.equal(sel('a,b'), '"a,b"')
  assert.equal(sel('@x,"y"'), '"\'@x,""y"""', 'netral dulu, kutip kemudian')
})
