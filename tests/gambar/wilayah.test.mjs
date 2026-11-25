/* Uji irisan wilayah, desa, kecamatan, insiden dan penolakan simpul (RENCANA-UJI T10, T12; AG-04, AG-05). Berkas kecil buatan sendiri, bukan produk. */
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const win = {}
new Function('window', readFileSync(new URL('../../public/alat_gambar_geo.js', import.meta.url), 'utf8'))(win)
const G = win.AlatGambarGeo
const kotak = (a, b, c, d) => ({type: 'Polygon', coordinates: [[[a, b], [c, b], [c, d], [a, d], [a, b]]]})
const fitur = (geom, properties) => ({type: 'Feature', properties, geometry: geom})
const fc = (...f) => ({type: 'FeatureCollection', features: f})
const gambar = {bentuk: 'kotak', simpul: [[100.2, 0.2], [100.8, 0.8]]}

function muatDari(berkas, catat = []) { return async u => { catat.push(u); if (!(u in berkas)) throw new Error('404 ' + u); return berkas[u] } }
const dasar = () => ({
  'geo/provinsi.json': fc(fitur(kotak(100, 0, 101, 1), {kode: '13'})),
  'geo/kabupaten/13.json': fc(fitur(kotak(100, 0, 100.5, 1), {kab: 'Agam'}), fitur(kotak(100.5, 0, 101, 1), {kab: 'Kota Solok'}), fitur(kotak(103, 0, 104, 1), {kab: 'Jauh'})),
  'data/desa_cari.json': {kab: {'13.06': 'Agam', '13.72': 'Kota Solok'}, baris: [['13.06.01.2001', 'Desa A', 'Kec A'], ['13.06.01.2002', 'Desa B', 'Kec A'], ['13.72.01.1001', 'Desa C', 'Kec C']]},
  'geo/desa/13.06.json': fc(fitur(kotak(100.1, 0.1, 100.3, 0.3), {kd: '13.06.01.2001'}), fitur(kotak(100.0, 0.9, 100.1, 1.0), {kd: '13.06.01.2002'})),
  'geo/desa/13.72.json': fc(fitur(kotak(100.6, 0.4, 100.9, 0.6), {kd: '13.72.01.1001'})),
  'geo/kecamatan/13.json': fc(fitur(kotak(100, 0, 100.5, 1), {kec: 'Kec A', kab: 'Agam'}), fitur(kotak(100.5, 0, 101, 1), {kec: 'Kec C', kab: 'Kota Solok'})),
  'data/penduduk.json': {kec: {'13|Agam|Kec A': 1000, '13|Kota Solok|Kec C': 2500}},
})

test('irisan: dalam, gambar di dalam bidang, dan ruas berpotongan tanpa simpul di dalam', () => {
  const uji = G.penguji(gambar)
  assert.ok(G.irisan(kotak(100.1, 0.1, 100.3, 0.3), uji))     /* bidang di dalam gambar */
  assert.ok(G.irisan(kotak(99, -1, 102, 2), uji))             /* gambar di dalam bidang */
  assert.ok(G.irisan(kotak(100.4, 0, 100.6, 1.5), uji))       /* hanya ruas berpotongan */
  assert.ok(!G.irisan(kotak(103, 0, 104, 1), uji))
})
test('irisan kapsul: bidang yang dilintasi garis tanpa simpul di dalam kapsul', () => {
  const uji = G.penguji({bentuk: 'buffer', simpul: [[100, 0.5], [101, 0.5]], r_km: 2})
  assert.ok(G.irisan(kotak(100.4, 0.3, 100.6, 0.7), uji))
  assert.ok(!G.irisan(kotak(100.4, 0.8, 100.6, 0.9), uji))
})
test('desa dan kecamatan beririsan lengkap dengan nama dan penduduk kecamatan', async () => {
  const w = await G.wilayah(G.penguji(gambar), muatDari(dasar()))
  assert.equal(w.n_kab, 2)
  assert.deepEqual(w.desa.map(d => d.nama).sort(), ['Desa A', 'Desa C'])
  assert.equal(w.kec.length, 2); assert.equal(w.pend, 3500); assert.ok(w.pend_lengkap)
})
test('penduduk kecamatan tanpa data = null, bukan 0', async () => {
  const b = dasar(); b['data/penduduk.json'] = {kec: {}}
  const w = await G.wilayah(G.penguji(gambar), muatDari(b))
  assert.equal(w.pend, null); assert.ok(w.kec.every(k => k.pend === null))
})
test('T10 13 kab beririsan = terlalu luas, tanpa daftar desa dan tanpa memuat desa', async () => {
  const b = {'geo/provinsi.json': fc(fitur(kotak(100, 0, 101, 1), {kode: '13'})), 'geo/kabupaten/13.json': fc(...Array.from({length: 13}, (_, i) => fitur(kotak(100, 0, 101, 1), {kab: 'K' + i})))}
  const catat = []
  const w = await G.wilayah(G.penguji(gambar), muatDari(b, catat))
  assert.ok(w.terlalu_luas); assert.equal(w.n_kab, 13); assert.ok(!catat.some(u => u.includes('geo/desa')))
})
test('T12 gambar di laut: desa dan penduduk tak terukur (null), bukan 0', async () => {
  const b = dasar(); b['geo/provinsi.json'] = fc(fitur(kotak(120, 0, 121, 1), {kode: '13'}))
  const w = await G.wilayah(G.penguji(gambar), muatDari(b))
  assert.equal(w.n_kab, 0); assert.equal(w.desa, null); assert.equal(w.pend, null)
})
test('berkas desa gagal dimuat = tak terukur, bukan daftar kosong', async () => {
  const b = dasar(); delete b['geo/desa/13.06.json']
  const w = await G.wilayah(G.penguji(gambar), muatDari(b))
  assert.equal(w.desa, null)
})
test('ejaan kab beda (pengecualian Padang Sidempuan) tetap terhubung', async () => {
  const b = dasar()
  b['geo/provinsi.json'] = fc(fitur(kotak(100, 0, 101, 1), {kode: '12'}))
  b['geo/kabupaten/12.json'] = fc(fitur(kotak(100, 0, 101, 1), {kab: 'Kota Padang Sidempuan'}))
  b['data/desa_cari.json'] = {kab: {'12.77': 'Kota Padangsidimpuan'}, baris: [['12.77.01.1001', 'Desa Z', 'Kec Z']]}
  b['geo/desa/12.77.json'] = fc(fitur(kotak(100.4, 0.4, 100.5, 0.5), {kd: '12.77.01.1001'}))
  b['geo/kecamatan/12.json'] = fc()
  const w = await G.wilayah(G.penguji(gambar), muatDari(b))
  assert.equal(w.desa.length, 1)
})
test('AG-04 insiden dalam gambar: hanya yang punya luas, tidak dijumlah, urut terbesar', () => {
  const ins = {insiden: {a: {id: 'a', pusat: [0.5, 100.5], kec: 'K1', kab: 'B'}, b: {id: 'b', pusat: [0.4, 100.4], kec: 'K2', kab: 'B'}, c: {id: 'c', pusat: [0.5, 100.5]}, d: {id: 'd', pusat: [5, 120]}, e: {id: 'e', pusat: [0.6, 100.6]}}}
  const lc = {_catatan: 'x', a: {luas_ha: 12.5, cakupan_pct: 70}, b: {luas_ha: 40}, c: {luas_ha: null}, d: {luas_ha: 9}}
  const r = G.insidenDalam(ins, lc, G.penguji(gambar))
  assert.deepEqual(r.map(x => x.id), ['b', 'a'])        /* c: luas null, d: di luar, e: tanpa luas citra */
  assert.equal(r[1].cakupan_pct, 70); assert.equal(r[0].cakupan_pct, null)
  assert.deepEqual(G.insidenDalam(null, null, G.penguji(gambar)), [])
})
test('silangBaru: simpul baru yang membuat ruas memotong ruas lain ditolak', () => {
  const s = [[0, 0], [2, 0], [2, 2], [0, 2]]
  assert.ok(G.silangBaru(s, [1, -1]))          /* ruas (0,2)->(1,-1) memotong (0,0)-(2,0) */
  assert.ok(!G.silangBaru(s, [-1, 1]))
  assert.ok(!G.silangBaru([[0, 0]], [1, 1]))
  assert.ok(!G.silangBaru(s, null, true))   /* persegi biasa boleh ditutup */
  assert.ok(G.silangBaru([[0, 0], [4, 0], [4, 4], [1, 4], [1, 1]], null, true) === false)
})
