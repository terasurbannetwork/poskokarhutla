// Gerbang kartu "Alert pembukaan tajuk" (public/tebang.js): kartu dirender dari JSON nyata, label jujur (bukan prediksi), format angka id-ID,
// pengabelan index.html (dimuat malas: tak ada fetch di muat awal). Fungsi murni dijalankan di node tanpa DOM.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const akar = new URL('../../', import.meta.url)
const baca = p => readFileSync(new URL(p, akar), 'utf8')
const win = {}
new Function('window', baca('public/tebang.js'))(win)
const T = win.AlertTebang
const D = JSON.parse(baca('public/data/alert_tebang.json'))

test('format: bulat kasar, persen bulat, kosong = en dash', () => {
  assert.equal(T.ha(324057), '324.100')
  assert.equal(T.ha(1234), '1.230')
  assert.equal(T.ha(87.4), '87')
  assert.equal(T.ha(NaN), '–')
  assert.equal(T.pct(0.225), '23%')
  assert.equal(T.pct(0.001), '<1%')
  assert.equal(T.pct(0), '0%')
  assert.equal(T.tgl('2026-10-30'), '30 Okt 2026')
})

test('kartu: kabupaten terbesar, jendela hari, sumber, tanggal dari JSON, tanpa NaN/undefined/nama perusahaan', () => {
  const h = T.kartu(D)
  const top = [...D.kabupaten].sort((a, b) => b.ha90 - a.ha90)[0]
  assert.ok(h.includes(top.kab), `kab terbesar ${top.kab} harus tampil`)
  assert.ok(h.includes('Global Forest Watch') && h.includes('Sumber:'))
  assert.ok(h.includes(T.tgl(D.gfw.sampai)))
  assert.ok(h.includes(`${D.jendela.tinggi_hari} hari`) && h.includes(`${D.jendela.semua_hari} hari`))
  assert.ok(/sawit \d+%|sawit <1%/.test(h) && h.includes('HTI') && h.includes('HPH') && h.includes('tambang'))
  assert.ok(!/NaN|undefined|null/.test(h), 'tidak ada nilai bocor')
  assert.ok(!/\bPT\b|\bCV\b/.test(h), 'tidak ada nama perusahaan')
})

test('label jujur: pantauan bukan prediksi; angka model dari JSON', () => {
  const m = D.model.semua_kotak, t = T.modelTeks(D)
  assert.ok(t.includes('TIDAK LOLOS') && t.includes('bukan prediksi'))
  assert.ok(t.includes(m.auc_penuh.toFixed(2).replace('.', ',')) && t.includes(m.auc_dasar.toFixed(2).replace('.', ',')))
  assert.ok(m.selisih_ci95[0] < 0 && m.selisih_ci95[1] > 0, 'CI memang mencakup nol; kalau tidak, teks "mencakup nol" salah')
  assert.ok(T.kartu(D).includes('bukan api'), 'alert = pembukaan tajuk, bukan api')
})

test('poligon sel: satu fitur per ubin 1 derajat, kelas naik monoton', () => {
  const g = T.poligon(D)
  assert.equal(g.features.length, D.sel.length)
  const [la, lo] = D.sel[0], r = g.features[0].geometry.coordinates[0]
  assert.deepEqual(r[0], [lo - .5, la - .5]); assert.deepEqual(r[0], r[4])
  assert.ok(T.kelas(100) <= T.kelas(1000) && T.kelas(1000) <= T.kelas(9999))
})

test('index.html: modul dimuat sesudah lapisan5.js; data tidak di-fetch saat muat awal', () => {
  const h = baca('public/index.html'), js = baca('public/tebang.js')
  assert.ok(h.indexOf('src="tebang.js"') > h.indexOf('src="lapisan5.js"'))
  assert.ok(h.includes('href="tebang.css"'))
  assert.ok(!h.includes('alert_tebang.json'), 'index.html tak memuat data ini')
  assert.ok(/ambil = \(\) => janji \|\|=/.test(js) && /nanti\(\(\) => nyala\(on\)\)/.test(js), 'fetch malas, ditunda lewat nanti()')
})
