// Tab Laporan provinsi /prediksi (gaya FFGS BMKG): fungsi murni public/prediksi/laporan_prov.js dijalankan nyata di node,
// cakupan poligon kab diuji terhadap prediksi.json dan geo/kabupaten sungguhan, lengas.json lewat invarian (bukan potret angka).
// Spec: docs/superpowers/specs/2026-11-04-laporan-prov-banjir-design.md
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const akar = new URL('../../', import.meta.url)
const baca = p => readFileSync(new URL(p, akar), 'utf8')
const json = p => JSON.parse(baca(p))
const ada = p => existsSync(new URL(p, akar))

test('lengas.json: nilai di atas 0 sampai 1, minimal 90% dari 514 kab terisi', () => {
  if (!ada('public/prediksi/data/lengas.json')) return
  const d = json('public/prediksi/data/lengas.json')
  assert.match(d.hari, /^\d{4}-\d{2}-\d{2}$/)
  const v = Object.entries(d.kab)
  const salah = v.filter(([, x]) => !(x > 0 && x <= 1))
  assert.deepEqual(salah, [], `lengas di luar (0, 1]: ${salah.slice(0, 5).map(([k, x]) => `${k}=${x}`).join(', ')}`)
  assert.ok(v.length >= 0.9 * 514, `lengas hanya ${v.length} dari 514 kab (sm kosong dari Open-Meteo?)`)
})

const win = {}
new Function('window', baca('public/prediksi/laporan_prov.js'))(win)
const L = win.LaporanProv

test('kunci: nama prediksi.json dan geo/kabupaten bertemu, termasuk 8 ejaan yang dulu beda', () => {
  const pasang = [
    ['Kab. Aceh Selatan', 'Aceh Selatan'], ['Kota Medan', 'Kota Medan'],
    ['Kota Tanjungbalai', 'Kota Tanjung Balai'], ['Kota Padangsidimpuan', 'Kota Padang Sidempuan'],
    ['Kab. Mukomuko', 'Muko Muko'], ['Kota Administrasi Jakarta Utara ', 'Kota Administrasi Jakarta Utara'],
    ['Kab. Kep. Siau Tagulandang Biaro', 'Kepulauan Siau Tagulandang Biaro'], ['Kab. Toli-Toli', 'Toli Toli'],
    ['Kab. Pangkajene dan Kepulauan', 'Pangkajene Kepulauan'], ['Kota Parepare', 'Kota Pare Pare']]
  for (const [a, b] of pasang) assert.equal(L.kunci(a), L.kunci(b), `${a} vs ${b}`)
  assert.notEqual(L.kunci('Kab. Bekasi'), L.kunci('Kota Bekasi'), 'kab dan kota senama tidak boleh tertukar')
})

test('cakupan: tiap kab prediksi.json punya tepat satu poligon di geo/kabupaten provinsinya', () => {
  if (!ada('public/prediksi/data/prediksi.json')) return
  const d = json('public/prediksi/data/prediksi.json'), hilang = [], geo = {}
  for (const k of d.kab) {
    geo[k.prov] ||= json(`public/geo/kabupaten/${k.prov}.json`).features.map(f => L.kunci(f.properties.kab))
    const n = geo[k.prov].filter(x => x === L.kunci(k.nama)).length
    if (n !== 1) hilang.push(`${k.id} ${k.nama} (${n} poligon)`)
  }
  assert.deepEqual(hilang, [], `kab tanpa tepat satu poligon: ${hilang.join('; ')}`)
})

test('kelas: batas kiri inklusif, null/NaN = -1, warna dan label satu lebih banyak dari batas', () => {
  assert.equal(L.kelas(null, [1, 20]), -1)
  assert.equal(L.kelas(NaN, [1, 20]), -1)
  assert.equal(L.kelas(0, [1, 20]), 0)
  assert.equal(L.kelas(1, [1, 20]), 1)
  assert.equal(L.kelas(19.9, [1, 20]), 1)
  assert.equal(L.kelas(500, [1, 20]), 2)
  for (const [n, k] of Object.entries(L.KELAS)) {
    assert.equal(k.warna.length, k.batas.length + 1, `${n} warna`)
    assert.equal(k.label.length, k.warna.length, `${n} label`)
  }
})

test('petaSvg: kotak 1x1 derajat di khatulistiwa jadi persegi, MultiPolygon digabung', () => {
  const sq = (x, y) => [[[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]]]
  const geo = {features: [
    {properties: {kab: 'A'}, geometry: {type: 'Polygon', coordinates: sq(100, 0)}},
    {properties: {kab: 'Kota B'}, geometry: {type: 'MultiPolygon', coordinates: [sq(101, 0), sq(101, -1)]}}]}
  const p = L.petaSvg(geo, 200)
  assert.equal(p.lebar, 200)
  assert.ok(Math.abs(p.tinggi - 200) <= 1, `tinggi ${p.tinggi}`)
  assert.equal(p.d.a.split('M').length - 1, 1)
  assert.equal(p.d.kotab.split('M').length - 1, 2)
})

const AP = {pakai: false, nasional_mm: {waspada: 40}, ambang_mm: {'11|Aceh Selatan': {waspada: 52.2}},
  uji_2024_2025: {persentil: {waspada: {far: 0.973}}}}

test('ambang: kab sampel pakai mm-nya, lainnya nasional bertanda; lebihan = prakiraan - ambang', () => {
  const idx = L.indeksAmbang(AP)
  assert.deepEqual(L.ambangKab(AP, idx, '11', 'Kab. Aceh Selatan'), {mm: 52.2, sumber: 'kab'})
  assert.deepEqual(L.ambangKab(AP, idx, '11', 'Kab. Aceh Barat'), {mm: 40, sumber: 'nasional'})
  assert.equal(L.ambangKab(null, new Map(), '11', 'x'), null)
  assert.equal(L.lebih(60, 52.2), 7.8)
  assert.equal(L.lebih(30, 40), -10)
  assert.equal(L.lebih(null, 40), null)
  assert.equal(L.lebih(30, null), null)
})

test('susun: satu baris per kab provinsi, data hilang = null (bukan 0), urut tabel menurut level', () => {
  const kol = ['p1', 'p20', 'p50', 'tot', 'mulai', 'lama', 'puncak', 'm']
  const h = (tot, p50) => [0.9, 0.5, p50, tot, 10, 3, 12, 1]
  const d = {kode: {HJN: {kol}, BNJ: {kol: ['lv', 'ps']}}, kab: [
    {id: '1101', nama: 'Kab. Aceh Selatan', prov: '11', pn: 'Aceh', HJN: [h(60, 0.4), null, null], BNJ: [[2, 0.3], [1, null], null]},
    {id: '1102', nama: 'Kab. Aceh Tenggara', prov: '11', pn: 'Aceh'},
    {id: '1201', nama: 'Kab. Nias', prov: '12', pn: 'Sumatera Utara', HJN: [h(5, 0), null, null]}]}
  const amatan = {'2026-11-02': {j: 'final', kab: {'1101': [3, 1, 2, 1]}}, '2026-11-03': {j: 'sementara', kab: {'1101': [22.1, 1, 13, 6]}}}
  const s = L.susun({d, amatan, lengas: {kab: {'1101': 0.41}}, ap: AP, prov: '11'})
  assert.equal(s.nama, 'Aceh')
  assert.deepEqual(s.amatan, {hari: '2026-11-03', j: 'sementara'})
  assert.equal(s.n, 2)
  const [a, b] = s.baris
  assert.deepEqual([a.hujan, a.lengas, a.prak, a.p50, a.ambang, a.sumberAmbang, a.lebih], [22.1, 0.41, 60, 0.4, 52.2, 'kab', 7.8])
  assert.deepEqual(a.lv, [2, 1, null])
  assert.deepEqual(a.ps, [0.3, null, null])
  assert.deepEqual([b.hujan, b.lengas, b.prak, b.lebih], [null, null, null, null])
  assert.equal(b.sumberAmbang, 'nasional')
  assert.deepEqual(L.waspada(s.baris, 1).map(x => x.id), ['1101'])
  assert.deepEqual(L.waspada(s.baris, 3), [])
  assert.deepEqual(L.tabel(s.baris).map(x => x.id), ['1101'])
  assert.equal(L.susun({d, amatan: null, lengas: null, ap: null, prov: '11'}).amatan, null)
})

test('laporan_prov.js murni: tanpa DOM, tanpa fetch, tanpa "Sumber: "', () => {
  const js = baca('public/prediksi/laporan_prov.js')
  assert.doesNotMatch(js, /document\.|fetch\(|innerHTML|Sumber: /)
})
