// Gerbang REKOMENDASI-100 no. 21 dan 13: tiap lapisan risiko punya tahun_data; risiko_hvc punya catatan_rumus yang menolak sebutan IRB.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const akar = fileURLToPath(new URL('../../', import.meta.url))
const baca = n => JSON.parse(readFileSync(`${akar}public/data/bnpb/${n}.json`, 'utf8'))

for (const n of ['ikd', 'risiko_hvc', 'kerentanan', 'terpapar', 'dibi_kab_tahun', 'puso', 'rs_kapasitas', 'iku']) {
  test(`${n}.json punya tahun_data tak kosong`, () => {
    const t = baca(n).tahun_data
    assert.equal(typeof t, 'string')
    assert.ok(t.trim().length > 0)
  })
}

test('risiko_hvc.json: catatan_rumus membedakan dari RBI dan IRB resmi', () => {
  const c = baca('risiko_hvc').catatan_rumus
  assert.match(c, /Buku RBI/)
  assert.match(c, /147,95/)
  assert.match(c, /tidak boleh disebut IRB/)
})
