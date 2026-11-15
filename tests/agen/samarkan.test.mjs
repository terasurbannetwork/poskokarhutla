// Penyamaran prompt (repo publik): sandi yang disebut SEBELUM kata kuncinya, dan garam hex di SQL akun.
import test from 'node:test'
import assert from 'node:assert/strict'
import { samarkan } from '../../scripts/agents/ilmu.mjs'

const S = ['kuda', 'biru', 'lampu'].join('') // sandi karangan, dirangkai saat jalan
const GARAM = 'a1b2c3d4'.repeat(4) // 32 hex karangan

test('sandi sebelum kata kuncinya tersamar', () => {
  const kasus = [
    `ganti jadi ${S} ya password dan usernya`,
    `sandinya ${S}`,
    `pakai ${S} buat password`,
    `passwordnya jadi ${S}`,
    `${S} itu sandinya`,
  ]
  for (const k of kasus) assert.ok(!samarkan(k).includes(S), `lolos: "${k}" -> "${samarkan(k)}"`)
})

test('garam hex 32+ di SQL akun tersamar', () => {
  const k = `INSERT INTO pemirsa (a,b) VALUES ('x','${GARAM}','y'); INSERT INTO staf VALUES ('${GARAM}${GARAM}')`
  assert.ok(!samarkan(k).includes(GARAM), `lolos: "${samarkan(k)}"`)
})

test('kalimat biasa dan hash commit tetap utuh', () => {
  const utuh = [
    'ganti jadi biru ya warnanya',
    'tolong ganti password',
    'pakai peta ini buat laporan',
    'lihat commit 4958c7322 dan a89bbf863',
    'itu tombolnya, bukan yang lain',
  ]
  for (const k of utuh) assert.equal(samarkan(k), k, `rusak: "${k}" -> "${samarkan(k)}"`)
})
