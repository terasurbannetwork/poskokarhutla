// Gerbang rute sapuan drone gambut (public/admin/drone_rute.js, halaman /admin/drone, pemilik 28 Okt 2026).
// Menjalankan kode nyata: lajur menutup tiap sel, tidak terbang di atas celah antarsel, dipecah per baterai, KMZ berisi WPML yang sah sebagai XML.
import test from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
await import(path.join(akar, 'public/admin/drone_rute.js'))
globalThis.window ??= globalThis   // laporan_koordalops.js menulis window.LaporanKoordalops
await import(path.join(akar, 'public/laporan_koordalops.js'))
const R = globalThis.DroneRute
const SEL = 0.003375   // derajat, titik_unik.SEL
// kisi 4 x 3 sel 375 m di gambut Pulang Pisau, ditambah satu sel terpisah ~1,5 km ke timur (celah tidak boleh disapu)
const sel = []
for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) sel.push([-2.7 + j * SEL, 114.2 + i * SEL / Math.cos(2.7 * Math.PI / 180), 1])
sel.push([-2.7, 114.2 + 8 * SEL / Math.cos(2.7 * Math.PI / 180), 0])

test('tapak dan jarak lajur dari ketinggian dan sudut pandang', () => {
  const t = R.tapak(100, 49)
  assert.ok(Math.abs(t.lebar - 2 * 100 * Math.tan(24.5 * Math.PI / 180)) < 1e-9 && t.panjang < t.lebar)
  const r = R.rencana(sel, {tinggi: 100, samping: 0.2})
  assert.ok(Math.abs(r.jarak_lajur - t.lebar * 0.8) < 1e-9, r.jarak_lajur)
})

test('lajur menutup semua sel dan melompati celah antarsel', () => {
  const P = R.proyeksi(-2.7, 114.2), xy = sel.map(s => P.ke(s[0], s[1]))
  const L = R.lajur(xy, 70)
  for (const [x, y] of xy) {   // tiap sel dilewati paling sedikit satu lajur yang ruasnya memuat pusat sel
    assert.ok(L.some(l => Math.abs(l.y - y) <= R.SISI / 2 && l.ruas.some(([a, b]) => a <= x && x <= b)), `sel ${x},${y} tidak tersapu`)
  }
  const baris0 = L.find(l => Math.abs(l.y - xy[0][1]) < 35)
  assert.equal(baris0.ruas.length, 2, 'kisi dan sel terpisah = dua ruas, celah ~1 km tidak disapu')
})

test('dipecah per baterai, tiap penerbangan di bawah batas waktu', () => {
  // kisi 1,5 x 1,1 km pada 100 m: ~24 km sapuan (~67 menit pada 6 m/s)
  const panjang = R.rencana(sel, {menit: 300}), sedang = R.rencana(sel, {menit: 25, cadangan_menit: 3})
  assert.equal(panjang.terbang.length, 1)
  assert.ok(sedang.terbang.length > 1, `baterai 22 menit harus dipecah: ${sedang.terbang.length}`)
  for (const f of sedang.terbang) assert.ok(f.menit <= 25 + 1e-9, f.menit)
  assert.ok(Math.abs(sedang.foto - sedang.terbang.reduce((a, f) => a + f.foto, 0)) < 1e-9)
  assert.equal(sedang.peringatan.length, 0, sedang.peringatan.join(' '))
  // baterai terlalu kecil untuk jarak pulang-pergi ke sel terjauh: rute tetap dibuat, tetapi diberi peringatan
  assert.ok(R.rencana(sel, {menit: 6, cadangan_menit: 3}).peringatan.length > 0)
})

test('ketinggian dibatasi 120 m', () => {
  const r = R.rencana(sel, {tinggi: 200})
  assert.equal(r.tinggi, R.MAKS_TINGGI)
  assert.ok(r.peringatan.some(p => p.includes('120')))
})

test('KMZ WPML: dua berkas, titik sesuai rute, aksi foto berjarak', () => {
  const r = R.rencana(sel, {}), b = R.wpml(r, 0, 'K0029 <uji>')
  assert.deepEqual(b.map(x => x[0]), ['wpmz/template.kml', 'wpmz/waylines.wpml'])
  const w = b[1][1]
  assert.equal((w.match(/<Placemark>/g) || []).length, r.terbang[0].titik.length)
  assert.match(w, /<wpml:actionTriggerType>multipleDistance<\/wpml:actionTriggerType>/)
  assert.match(w, /<wpml:executeHeight>100<\/wpml:executeHeight>/)
  assert.ok(b[0][1].includes('K0029 &lt;uji&gt;'), 'nama di-escape')
  for (const [, isi] of b) assert.equal((isi.match(/<[A-Za-z][^>]*[^/]>/g) || []).length > 0, true)
  const z = globalThis.LaporanKoordalops.zip(b)   // zip yang dipakai halaman: tanda tangan PK di awal
  assert.deepEqual([...z.slice(0, 4)], [0x50, 0x4b, 3, 4])
})
