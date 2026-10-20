// Gerbang templat /paparan: cekTemplat (public/paparan_slide.js) murni, dijalankan nyata di node tanpa DOM.
// Menagih: id bentrok ditolak, gambar_url luar situs ditolak, "<" dibuang, templat sah lolos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const win = {}
vm.runInNewContext(readFileSync(new URL('../../public/paparan_slide.js', import.meta.url), 'utf8'), { window: win, document: {}, Intl, Date, Math })
const { cekTemplat, urlAman, REGISTRI } = win.PaparanSlide
const dasar = () => ({ versi: 1, sampul: {}, slide: [{ id: 'nasional', aktif: true, urutan: 10 }], tambahan: [{ id: 't1', judul: 'Himbauan', isi: ['a'], setelah: 'nasional' }] })
const ubah = f => { const t = dasar(); f(t); return cekTemplat(t) }

test('templat sah lolos dan "<" dibuang', () => {
  const t = ubah(x => { x.tambahan[0].judul = 'A<b>B'; x.tambahan[0].isi = ['<img>x'] })
  assert.ok(t); assert.equal(t.tambahan[0].judul, 'AbB'); assert.equal(t.tambahan[0].isi[0], 'imgx')
  assert.ok(REGISTRI.length >= 5)
})
test('id tambahan bentrok dengan registri, sesama tambahan, atau nama prototipe ditolak', () => {
  assert.equal(ubah(x => { x.tambahan[0].id = 'nasional' }), null)
  assert.equal(ubah(x => { x.tambahan.push({ ...x.tambahan[0] }) }), null)
  for (const id of ['constructor', '__proto__']) assert.equal(ubah(x => { x.tambahan[0].id = id }), null)
  assert.equal(ubah(x => { x.slide.push({ id: 'nasional', urutan: 20 }) }), null)
})
test('gambar_url hanya satu situs', () => {
  for (const u of ['https://evil.example/x.png', '//evil.example/x.png', 'http://a/b', 'javascript:1']) assert.equal(ubah(x => { x.tambahan[0].gambar_url = u }), null, u)
  assert.ok(ubah(x => { x.tambahan[0].gambar_url = '/img/foto-asap.jpg' }))
  assert.equal(urlAman('//x'), false)
})
test('skema rusak ditolak', () => {
  assert.equal(cekTemplat(null), null)
  assert.equal(ubah(x => { x.slide.push({ id: 'tak-dikenal', urutan: 1 }) }), null)
  assert.equal(ubah(x => { x.tambahan[0].judul = 'x'.repeat(161) }), null)
  assert.equal(ubah(x => { x.tambahan[0].bagian = 'lain' }), null)
})
