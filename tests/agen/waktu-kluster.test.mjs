// Gerbang waktu deteksi cluster (public/waktu_kluster.js): cluster level rendah kehilangan awal/akhir/frp di kluster_awal.json
// (harian.py INTI), dulu laci menulis "Invalid Date WIB · – jam lalu". Invarian: tidak pernah ada tanggal tidak sah, dan pengabelannya ada.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const akar = new URL('../../', import.meta.url)
const baca = p => readFileSync(new URL(p, akar), 'utf8')
const win = {}
new Function('window', baca('public/waktu_kluster.js'))(win)
const W = win.WaktuKluster
const dibuat = '2026-10-26T07:36:00+00:00', kini = Date.parse('2026-10-26T09:36:00+00:00')

test('cluster ringkas tanpa awal/akhir: akhir dipulihkan dari jam_sejak, awal null (bukan Invalid Date)', () => {
  const d = W.deteksi({ jam_sejak: 100.2, n: 3 }, dibuat, kini)
  assert.equal(d.awal, null)
  assert.equal(d.akhir.toISOString(), '2026-10-22T03:24:00.000Z', `akhir ${d.akhir}`)
  assert.equal(d.lalu, 102.2)
})
test('cluster lengkap memakai awal/akhir apa adanya', () => {
  const d = W.deteksi({ awal: '2026-10-24T01:00:00+00:00', akhir: '2026-10-26T05:36:00+00:00', jam_sejak: 99 }, dibuat, kini)
  assert.equal(d.awal.toISOString(), '2026-10-24T01:00:00.000Z'); assert.equal(d.akhir.toISOString(), '2026-10-26T05:36:00.000Z'); assert.equal(d.lalu, 4)
})
test('tanpa apa pun: semuanya null, tak ada NaN; string sampah ditolak', () => {
  for (const p of [{}, { awal: 'x', akhir: 'bukan tanggal' }]) {
    const d = W.deteksi(p, dibuat, kini); assert.deepEqual([d.awal, d.akhir, d.lalu], [null, null, null])
  }
})
test('gabungan: abaikan yang tak punya data, ambil terawal dan terakhir', () => {
  const g = W.gabung([{ jam_sejak: 50 }, { awal: '2026-10-20T00:00:00Z', akhir: '2026-10-25T00:00:00Z' }, {}], dibuat, kini)
  assert.equal(g.awal.toISOString(), '2026-10-20T00:00:00.000Z')
  assert.equal(g.akhir.toISOString(), '2026-10-25T00:00:00.000Z')   // jam_sejak 50 = 24 Okt 05:36, lebih awal
  assert.equal(W.gabung([{}], dibuat, kini).akhir, null)
})
test('pengabelan: index.html memuat skrip dan laci/cari memakainya, tak ada jamWIB(p.awal) mentah', () => {
  const h = baca('public/index.html'), c = baca('public/cari.js')
  assert.match(h, /<script src="waktu_kluster\.js/)
  assert.ok(h.includes('WaktuKluster.deteksi'), 'laci belum memakai WaktuKluster.deteksi')
  assert.ok(c.includes('WaktuKluster.gabung'), 'cari.js belum memakai WaktuKluster.gabung')
  assert.ok(!h.includes('jamWIB(p.awal)') && !c.includes('jamWIB(awal)'), 'masih ada jamWIB atas awal mentah')
})
