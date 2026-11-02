// Gerbang kartu "Sinyal komunikasi" (public/sinyal.js): kartu dirender dari JSON nyata menara.json + internet_padam.json,
// label jujur (proksi, bukan jumlah menara), format id-ID, pengabelan index.html (dimuat malas). Fungsi murni di node tanpa DOM.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const akar = new URL('../../', import.meta.url)
const baca = p => readFileSync(new URL(p, akar), 'utf8')
const win = {}
new Function('window', baca('public/sinyal.js'))(win)
const S = win.SinyalKomunikasi
const M = JSON.parse(baca('public/data/menara.json'))
const P = JSON.parse(baca('public/data/internet_padam.json'))

test('format: ribuan titik, kosong = en dash, bulat kasar', () => {
  assert.equal(S.n0(15175), '15.175')
  assert.equal(S.n0(NaN), '–')
  assert.equal(S.bulat(15175), 15200)
  assert.equal(S.bulat(124), 120)
  assert.equal(S.bulat(9), 9)
  assert.equal(S.tgl('2026-10-30'), '30 Okt 2026')
  assert.equal(S.nama('64'), 'Kalimantan Timur')
})

test('top menara terurut menurun; peristiwa terbaru dulu', () => {
  const t = S.topMenara(M, 5)
  assert.equal(t.length, 5)
  assert.ok(t.every((r, i) => i === 0 || t[i - 1].v >= r.v))
  const e = S.terbaru(P, 8)
  assert.ok(e.every((r, i) => i === 0 || e[i - 1].mulai >= r.mulai))
})

test('kartu: sumber, tanggal, label proksi, vonis dari JSON, tanpa NaN/undefined', () => {
  const h = S.kartu(M, P)
  assert.ok(h.includes('OpenCelliD') && h.includes('IODA') && h.includes('Sumber:') && h.includes('CC-BY-SA'))
  assert.ok(h.includes(S.tgl(P.sampai)) && h.includes(S.tgl(M.dibuat)))
  assert.ok(h.includes('Proksi') && h.includes('bukan jumlah menara sebenarnya') && h.includes('bukan bukti listrik'))
  assert.ok(h.includes(S.topMenara(M, 1)[0].nama))
  assert.ok(!/NaN|undefined|null/.test(h), 'tidak ada nilai bocor')
  assert.ok(!/Provinsi \d\d</.test(h), 'semua kode provinsi di kartu punya nama')
})

test('label model dari JSON: vonis dan AUC tak diketik tangan; LOLOS tipis dibaca lemah', () => {
  const b = M.model.bahaya_menara, t = S.modelTeks(M)
  assert.ok(t.includes(b.vonis) && t.includes(b.auc_uji.toFixed(2).replace('.', ',')))
  assert.equal(/sinyalnya lemah/.test(t), /^LOLOS/.test(b.vonis) && b.auc_uji - .5 < .05)
  assert.ok(S.hubTeks(P).toLowerCase().includes(String(P.hubungan_bahaya_padam.vonis).toLowerCase()))
})

test('index.html: modul dimuat sesudah tebang.js; data tidak di-fetch saat muat awal', () => {
  const h = baca('public/index.html'), js = baca('public/sinyal.js')
  assert.ok(h.indexOf('src="sinyal.js"') > h.indexOf('src="lapisan5.js"'))
  assert.ok(h.includes('href="sinyal.css"'))
  assert.ok(!h.includes('menara.json') && !h.includes('internet_padam.json'))
  assert.ok(/ambil = \(\) => janji \|\|=/.test(js) && /nanti\(\(\) => nyala\(on\)\)/.test(js))
})
