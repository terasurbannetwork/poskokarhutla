// Gerbang status banjir wilayah di kotak cari (AngkaKawasan.statusWilayah / kejadianTerdekat): tingkat = tertinggi kecamatan, nama desa dicocokkan ke status.json nyata.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const akar = new URL('../../', import.meta.url)
const win = {}
new Function('window', readFileSync(new URL('public/angka_kawasan.js', akar), 'utf8'))(win)
const { statusWilayah, kejadianTerdekat } = win.AngkaKawasan
const kec = {
  '11|Aceh Barat|A': { b: [0, 1, 3, 0] }, '11|Aceh Barat|B': { b: [0, 2, 0, 0] },
  '11|Pidie|C': { b: [0, 0, 0, 0] }, '12|Aceh Barat|D': { b: [3, 3, 3, 3] },
}
test('tingkat wilayah = tertinggi kecamatan; nama Kab./Kota diabaikan; provinsi tidak tercampur', () => {
  assert.equal(statusWilayah(kec, { p: '11', kab: 'Kab. Aceh Barat' }, 2).lv, 3)
  assert.equal(statusWilayah(kec, { p: '11', kab: 'ACEH BARAT' }, 1).lv, 2)
  assert.equal(statusWilayah(kec, { p: '11', kab: 'Aceh Barat', kec: 'a' }, 0).lv, 0)
  assert.deepEqual(statusWilayah(kec, { p: '11' }, 1).n, [1, 1, 1, 0])
  assert.equal(statusWilayah(kec, { p: '11' }, 2).total, 3)
  assert.equal(statusWilayah(kec, { p: '99' }, 0).total, 0)
})
test('kejadian: yang memuat kecamatan menang; kalau tidak, terdekat dalam batas', () => {
  const kej = [{ kode: 'B1', skor: 10, kec: ['11|Pidie|C'], pusat: [5, 96] }, { kode: 'B2', skor: 90, kec: ['x'], pusat: [4, 96] }]
  assert.equal(kejadianTerdekat(kej, ['11|Pidie|C'], null).kode, 'B1')
  assert.equal(kejadianTerdekat(kej, ['z'], [4.2, 96]).kode, 'B2')
  assert.equal(kejadianTerdekat(kej, ['z'], [-5, 110]), null)
})
test('data nyata: tiap desa contoh bisa dipetakan ke kecamatan berstatus lewat nama kab dan kec', () => {
  const st = JSON.parse(readFileSync(new URL('public/banjir/data/status.json', akar), 'utf8')).kec
  const d = JSON.parse(readFileSync(new URL('public/data/desa_cari.json', akar), 'utf8'))
  let ada = 0, cocok = 0
  const prov = new Set(Object.keys(st).map(k => k.split('|')[0]))
  for (const [kd, , kc] of d.baris) {
    if (!prov.has(kd.slice(0, 2))) continue
    ada++
    if (statusWilayah(st, { p: kd.slice(0, 2), kab: d.kab[kd.slice(0, 5)], kec: kc }, 0).total) cocok++
    if (ada >= 3000) break
  }
  assert.ok(ada > 100)
  console.log(`desa di provinsi berstatus: ${ada}, kecamatan cocok: ${cocok}`)
  assert.ok(cocok / ada > 0.3, 'pencocokan nama terlalu rendah')
})
