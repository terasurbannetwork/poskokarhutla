/* Uji geometri alat gambar (RENCANA-UJI T1-T9, T11 untuk lapisan geo). Data kecil buatan sendiri, bukan produk. */
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const win = {}
new Function('window', readFileSync(new URL('../../public/alat_gambar_geo.js', import.meta.url), 'utf8'))(win)
const G = win.AlatGambarGeo
const ACUAN = Date.UTC(2026, 10, 24, 12, 0)   /* 12.00 UTC */
const dekat = (a, b, tol) => assert.ok(Math.abs(a - b) / b < tol, `${a} vs ${b}`)
const baris = (lat, lon, jam, frp = 1, tgl = '11-24') => [lat, lon, jam, 'N20', frp, 1, 0, tgl]
const kotakKecil = {bentuk: 'kotak', simpul: [[100, -1], [101, 0]]}
const hit = (b, g = kotakKecil, o = {}) => G.hitungTitik(b, G.penguji(g), {horizon: 168, acuanMs: ACUAN, ...o})

test('T1 kotak 1x1 derajat di ekuator ~12.364 km2', () => {
  dekat(G.penguji({bentuk: 'kotak', simpul: [[100, 0], [101, 1]]}).luas_km2, 12364, 0.005)
})
test('T2 lingkaran 10 km di lintang -2 ~ pi r2', () => {
  dekat(G.penguji({bentuk: 'buffer', simpul: [[110, -2]], r_km: 10}).luas_km2, Math.PI * 100, 0.005)
})
test('T2b kapsul: luas lewat luasA (N=160), mendekati 2rL + pi r2; N=48 kasar tapi dekat; batal -> null', async () => {
  const u = G.penguji({bentuk: 'buffer', simpul: [[110, 0], [110.5, 0]], r_km: 10})
  assert.equal(u.luas_km2, null)
  dekat(await u.luasA(48), 2 * 10 * G.jarakKm([110, 0], [110.5, 0]) + Math.PI * 100, 0.06)
  assert.equal(await u.luasA(160, () => true), null)
  const l = await u.luasA(160)
  dekat(l, 2 * 10 * G.jarakKm([110, 0], [110.5, 0]) + Math.PI * 100, 0.02)
})
test('T3 titik tepat di tepi dianggap di dalam', () => {
  const p = [[0, 0], [2, 0], [2, 2], [0, 2]]
  assert.ok(G.dalamPoligon(1, 0, p)); assert.ok(G.dalamPoligon(2, 1, p)); assert.ok(G.dalamPoligon(0, 0, p))
  assert.ok(!G.dalamPoligon(2.01, 1, p))
})
test('T4 lima baris sama (petak dan tanggal) = 1 titik unik', async () => {
  const r = await hit(Array.from({length: 5}, () => baris(-0.5, 100.5, -3)))
  assert.equal(r.titik_unik, 1)
})
test('T5 dua tanggal WIB berbeda, petak sama = 2 unik, 1 sel', async () => {
  const r = await hit([baris(-0.5, 100.5, -3, 1, '11-23'), baris(-0.5, 100.5, -2, 1, '11-24')])
  assert.equal(r.titik_unik, 2); assert.equal(r.sel, 1)
})
test('T6 acuan 12.00 UTC jam 0 = 19 WIB = malam; siang dan malam terpisah', async () => {
  assert.equal(G.wibJam(ACUAN, 0), 19); assert.ok(G.malam(19)); assert.ok(!G.malam(12)); assert.ok(G.malam(5)); assert.ok(!G.malam(6))
  const r = await hit([baris(-0.5, 100.5, 0), baris(-0.4, 100.4, -7, 1, '11-24')])   /* 19 WIB malam, 12 WIB siang */
  assert.equal(r.malam, 1); assert.equal(r.siang, 1)
})
test('T7 baris tanpa FRP tidak masuk jumlah, dihitung terpisah; semua tanpa FRP = null bukan 0', async () => {
  const r = await hit([baris(-0.5, 100.5, -1, 2.5), baris(-0.4, 100.4, -1, null)])
  assert.equal(r.frp_jumlah, 2.5); assert.equal(r.frp_maks, 2.5); assert.equal(r.frp_tanpa, 1); assert.equal(r.titik_unik, 2)
  const k = await hit([baris(-0.5, 100.5, -1, null)])
  assert.equal(k.frp_jumlah, null); assert.equal(k.frp_maks, null)
})
test('periode: titik lebih tua dari horizon tidak ikut', async () => {
  const b = [baris(-0.5, 100.5, -2), baris(-0.4, 100.4, -30, 1, '11-23')]
  assert.equal((await hit(b, kotakKecil, {horizon: 24})).titik_unik, 1)
  assert.equal((await hit(b, kotakKecil, {horizon: 72})).titik_unik, 2)
})
test('predikat dihitung (definisi angka utama) dipakai bila ada', async () => {
  const b = [baris(-0.5, 100.5, -1), baris(-0.4, 100.4, -1)]
  assert.equal((await hit(b, kotakKecil, {dihitung: r => r[0] === -0.5})).titik_unik, 1)
})
test('titik di luar gambar tidak dihitung; gambar tanpa titik = 0 yang benar-benar dihitung', async () => {
  const r = await hit([baris(5, 120, -1)])
  assert.equal(r.titik_unik, 0); assert.equal(r.frp_jumlah, null)
})
test('T8 poligon 201 simpul ditolak, 200 sah', () => {
  const cincin = n => Array.from({length: n}, (_, i) => [Math.cos(i / n * 6.2832), Math.sin(i / n * 6.2832)])
  assert.match(G.tolak({bentuk: 'poligon', simpul: cincin(201)}), /lebih dari 200/)
  assert.equal(G.tolak({bentuk: 'poligon', simpul: cincin(200)}), null)
})
test('T9 garis menyilang diri ditolak; poligon biasa sah', () => {
  assert.match(G.tolak({bentuk: 'poligon', simpul: [[0, 0], [2, 2], [2, 0], [0, 2]]}), /memotong/)
  assert.equal(G.tolak({bentuk: 'poligon', simpul: [[0, 0], [2, 0], [2, 2], [0, 2]]}), null)
})
test('buffer: jari-jari di luar 1-50 ditolak', () => {
  assert.ok(G.tolak({bentuk: 'buffer', simpul: [[0, 0]], r_km: 0}))
  assert.ok(G.tolak({bentuk: 'buffer', simpul: [[0, 0]], r_km: 51}))
  assert.equal(G.tolak({bentuk: 'buffer', simpul: [[0, 0]], r_km: 50}), null)
})
test('T11 data titik belum dimuat = null, bukan 0', async () => {
  assert.equal(await hit(null), null)
})
test('bulatLuas tanpa presisi palsu', () => {
  assert.equal(G.bulatLuas(12364.7), 12000); assert.equal(G.bulatLuas(45.678), 45.7)
})

test('sel sama dengan AngkaKawasan.selUnik dan luas sel ~14,08 ha', () => {
  const w2 = {}; new Function('window', readFileSync(new URL('../../public/angka_kawasan.js', import.meta.url), 'utf8'))(w2)
  for (const [la, lo] of [[-0.5, 100.5], [-7.2, 112.7], [2.9, 97.4], [-8.55, 140.87]]) assert.equal(G.selKunci(la, lo), w2.AngkaKawasan.selUnik(la, lo))
  dekat(G.PIKSEL_HA, 14.08, 0.002)
})
test('jarakKeGaris: berhenti dini tetap <= batas, tanpa batas = minimum sebenarnya', () => {
  const garis = [[100, 0], [100.5, 0], [101, 0.5]], p = [100.2, 0.01]
  const penuh = G.jarakKeGaris(p, garis)
  assert.ok(G.jarakKeGaris(p, garis, 5) <= 5 || penuh > 5)
  dekat(penuh, G.jarakKm(p, [100.2, 0]), 0.05)
  assert.ok(G.jarakKeGaris(p, [[100, 0]]) > 0)
})
test('hitungTitik: batal menghentikan hitungan; tanpa dihitung berlabel definisi petak, dengan dihitung berlabel utama', async () => {
  const b = Array.from({length: 40000}, (_, i) => baris(-0.9 + (i % 200) * 0.004, 100.1 + Math.floor(i / 200) * 0.004, -3, 1, '11-24'))
  const uji = G.penguji({bentuk: 'kotak', simpul: [[100, -1], [101, 0]]})
  let n = 0
  assert.deepEqual(await G.hitungTitik(b, uji, {horizon: 168, acuanMs: ACUAN, dihitung: () => { for (let i = 0; i < 2e3; i++); return true }, batal: () => ++n > 0}), {dibatalkan: true})
  assert.equal((await G.hitungTitik(b.slice(0, 5), uji, {horizon: 168, acuanMs: ACUAN})).definisi, 'petak')
  assert.equal((await G.hitungTitik(b.slice(0, 5), uji, {horizon: 168, acuanMs: ACUAN, dihitung: () => true})).definisi, 'utama')
})
