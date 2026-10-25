// Gerbang angka kawasan di kotak cari (public/angka_kawasan.js): luas terbakar dan belum padam di dalam poligon harus memakai rumus
// scripts/data/peta_karhutla.py (PORSI, 4,3 ha, sel 3x3, jendela 720-2160 menit). Paritas dibuktikan dengan menjalankan bertahan()/sel() Python sungguhan.
// Indeks kawasan (public/data/kawasan_cari.json) diuji lewat invarian: tiap item bersumber, poligon OSM-nya ada, nama contoh pemilik bisa dicari.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const akar = new URL('../../', import.meta.url)
const win = {}
new Function('window', readFileSync(new URL('public/angka_kawasan.js', akar), 'utf8'))(win)
const A = win.AngkaKawasan
const semua = () => true
const BB = [100, -2, 102, 0]

test('konstanta sama dengan peta_karhutla.py', () => {
  const py = JSON.parse(execFileSync('python3', ['-c', 'import sys,json; sys.path.insert(0,"scripts/data"); import peta_karhutla as P; print(json.dumps([P.PORSI,P.G,P.HA]))'], { cwd: akar }).toString())
  assert.deepEqual([A.PORSI, A.G, A.HA], py, `PORSI/G/HA JS ${[A.PORSI, A.G, A.HA]} vs Python ${py}`)
})

test('luas dan belum: hanya N20/N21 n/h hari terpilih; bertahan = sel 3x3 terdeteksi 12-36 jam sebelumnya', () => {
  const G = A.G
  const b = [
    [-1, 101, -0, 'N20', 1, 2, 0, '10-24'],            // hari ini, bertahan (lihat baris 3)
    [-1, 101 + 5 * G, -0, 'N21', 1, 1, 0, '10-24'],    // hari ini, tidak bertahan (tetangga terdekat 5 sel)
    [-1, 101 + G, -20, 'N20', 1, 1, 0, '10-23'],       // 20 jam sebelumnya di sel tetangga
    [-1, 101 + 9 * G, -11.9, 'N20', 1, 1, 0, '10-23'], // 11,9 jam: terlalu dekat
    [-1, 101, -0, 'N', 1, 2, 0, '10-24'],              // S-NPP: hotspot saja
    [-1, 101.5, -0, 'N20', 1, 0, 0, '10-24'],          // keyakinan rendah: hotspot saja
    [-1, 103, -0, 'N20', 1, 2, 0, '10-24'],            // di luar kotak
  ]
  const r = A.hitung(b, BB, semua, new Set(['N', 'N20', 'M']), '10-24')
  assert.deepEqual(r, { hot: 3, titik: 2, bertahan: 1, luas: Math.floor(2 * A.PORSI * 4.3 + 0.5), belum: Math.floor(A.PORSI * 4.3 + 0.5) },
    `hot = N/N20 hari ini di kotak (N21 bukan sensor utama), titik = N20/N21 n/h: ${JSON.stringify(r)}`)
  const tolak = A.hitung(b, BB, () => false, new Set(['N20']), '10-24')
  assert.equal(tolak.hot + tolak.titik, 0, 'titik di luar poligon (dalam() false) tetap terhitung')
})

test('paritas acak dengan bertahan() dan sel() Python', () => {
  let s = 7
  const acak = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  const b = []
  for (let i = 0; i < 400; i++) {
    const jam = -Math.round(acak() * 4800) / 100
    b.push([-1 + acak() * 0.08, 101 + acak() * 0.08, jam, ['N20', 'N21', 'N'][i % 3], 1, i % 5 ? 1 : 0, 0, jam > -24 ? '10-24' : '10-23'])
  }
  const r = A.hitung(b, BB, semua, new Set(['N20']), '10-24')
  const py = JSON.parse(execFileSync('python3', ['-c', `
import sys, json; sys.path.insert(0, "scripts/data"); import peta_karhutla as P
b = json.load(sys.stdin); det = {}
for r in b:
    if r[3] in ("N20", "N21") and r[5] >= 1: det.setdefault(P.sel(r[1], r[0]), []).append(r[2] * 60)
L = [(P.sel(r[1], r[0]), r[2] * 60) for r in b if r[3] in ("N20", "N21") and r[5] >= 1 and r[7] == "10-24"]
t = sum(1 for c, m in L if P.bertahan(det, c, m))
print(json.dumps([len(L), t, P.bul(len(L) * P.PORSI * P.HA), P.bul(t * P.PORSI * P.HA)]))`], { cwd: akar, input: JSON.stringify(b) }).toString())
  assert.ok(py[1] > 0 && py[1] < py[0], `fikstur harus memuat titik bertahan dan tidak: ${py}`)
  assert.deepEqual([r.titik, r.bertahan, r.luas, r.belum], py, `JS ${[r.titik, r.bertahan, r.luas, r.belum]} vs Python ${py}`)
})

const IDX = new URL('public/data/kawasan_cari.json', akar)
test('indeks kawasan: bersumber, berpoligon, contoh pemilik ada', { skip: !existsSync(IDX) && 'kawasan_cari.json belum dibangun' }, () => {
  const d = JSON.parse(readFileSync(IDX, 'utf8'))
  const geo = new Set(JSON.parse(readFileSync(new URL('public/data/kawasan_cari.geojson', akar), 'utf8')).features.map(f => f.properties.id))
  for (const i of d.item) {
    assert.ok(i.sb && i.n && i.p && i.b?.length === 4, `item tanpa sumber/nama/provinsi/bbox: ${JSON.stringify(i).slice(0, 120)}`)
    if (i.id.startsWith('osm:')) assert.ok(geo.has(i.id), `${i.n}: poligon ${i.id} tidak ada di kawasan_cari.geojson`)
    if (i.t === 'metro') assert.ok(i.kab.length >= 2, `${i.n}: metro tanpa kab/kota`)
  }
  const nama = new Set(d.item.map(i => i.n))
  for (const w of ['Taman Nasional Way Kambas', 'Taman Nasional Berbak', 'Taman Nasional Sebangau', 'Taman Nasional Bromo Tengger Semeru', 'Gunung Semeru', 'Danau Toba', 'Jabodetabek'])
    assert.ok(nama.has(w), `'${w}' tidak bisa dicari`)
})
