// Gerbang angka kawasan di kotak cari (public/angka_kawasan.js): luas terbakar dan belum padam di dalam poligon harus memakai rumus
// scripts/data/peta_karhutla.py (faktor per satelit F20/F21, sel 3x3, jendela 720-2160 menit). Paritas dibuktikan dengan menjalankan bertahan()/sel() Python sungguhan.
// Lokasi unik (AngkaKawasan.unik = angka titik di seluruh halaman) dibuktikan sama dengan scripts/data/titik_unik.py.
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
  const py = JSON.parse(execFileSync('python3', ['-c', 'import sys,json; sys.path.insert(0,"scripts/data"); import peta_karhutla as P; print(json.dumps([P.F20,P.F21,P.G]))'], { cwd: akar }).toString())
  assert.deepEqual([A.F.N20, A.F.N21, A.G], py, `F20/F21/G JS ${[A.F.N20, A.F.N21, A.G]} vs Python ${py}`)
})

test('luas dan belum: hanya N20/N21 n/h hari terpilih; bertahan = sel 3x3 terdeteksi 12-36 jam sebelumnya', () => {
  const G = A.G
  const b = [
    [-1, 101, -0, 'N20', 1, 2, 0, '10-24'],            // hari ini, bertahan (lihat baris 3)
    [-1, 101 + 5 * G, -0, 'N21', 1, 1, 0, '10-24'],    // hari ini, tidak bertahan (tetangga terdekat 5 sel)
    [-1, 101 + G, -20, 'N20', 1, 1, 0, '10-23'],       // 20 jam sebelumnya di sel tetangga
    [-1, 101 + 9 * G, -11.9, 'N20', 1, 1, 0, '10-23'], // 11,9 jam: terlalu dekat
    [-1, 101, -0, 'N', 1, 2, 0, '10-24'],              // S-NPP di sel yang sama dengan N20 baris 1: lokasi yang sama, tidak menambah hot
    [-1, 101.5, -0, 'N20', 1, 0, 0, '10-24'],          // keyakinan rendah: ikut hot (pemilik 28 Okt 2026), tidak ikut luas/belum
    [-1, 103, -0, 'N20', 1, 2, 0, '10-24'],            // di luar kotak
  ]
  const u = A.unik(b)
  const r = A.hitung(b, BB, semua, x => u.has(x), '10-24')
  // luas = (1 titik N20 x F20 + 1 titik N21 x F21) / 2; belum = titik N20 yang bertahan x F20 / 2
  assert.deepEqual(r, { hot: 3, titik: 2, bertahan: 1, luas: Math.floor((A.F.N20 + A.F.N21) / 2 + 0.5), belum: Math.floor(A.F.N20 / 2 + 0.5) },
    `hot = lokasi unik semua keyakinan hari ini di kotak (N20 + N21 + N20 rendah; N di sel N20 tidak dobel), titik = N20/N21 n/h: ${JSON.stringify(r)}`)
  // hari tanpa lintasan NOAA-21 se-Indonesia: NOAA-20 dipakai sendiri, tidak dibagi 2
  const tanpa21 = A.hitung(b.filter(x => x[3] !== 'N21'), BB, semua, semua, '10-24')
  assert.equal(tanpa21.luas, Math.floor(A.F.N20 + 0.5), `satelit hilang harus tidak ikut dirata-rata: ${JSON.stringify(tanpa21)}`)
  const tolak = A.hitung(b, BB, () => false, semua, '10-24')
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
  const r = A.hitung(b, BB, semua, semua, '10-24')
  const py = JSON.parse(execFileSync('python3', ['-c', `
import sys, json; sys.path.insert(0, "scripts/data"); import peta_karhutla as P
b = json.load(sys.stdin); det = {}
for r in b:
    if r[3] in ("N20", "N21") and r[5] >= 1: det.setdefault(P.sel(r[1], r[0]), []).append(r[2] * 60)
L = [(P.sel(r[1], r[0]), r[2] * 60, r[3]) for r in b if r[3] in ("N20", "N21") and r[5] >= 1 and r[7] == "10-24"]
F = {"N20": P.F20, "N21": P.F21}; ada = {s for _, _, s in L}
ha = lambda s: F[s] / len(ada)
tb = [(c, m, s) for c, m, s in L if P.bertahan(det, c, m)]
print(json.dumps([len(L), len(tb), P.bul(sum(ha(s) for _, _, s in L)), P.bul(sum(ha(s) for _, _, s in tb))]))`], { cwd: akar, input: JSON.stringify(b) }).toString())
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

test('lokasi unik: kmin 1 menolak keyakinan rendah, satu sel sekali per hari, deteksi paling awal yang dihitung', () => {
  const b = [[-1, 101, 0, 'N20', 1, 0, 0, '10-24'],          // keyakinan rendah
    [-1, 101.1, -0.2, 'N21', 1, 1, 0, '10-24'], [-1, 101.1, -1, 'N20', 1, 2, 0, '10-24'],   // sel sama: N20 lebih awal yang dihitung
    [-1, 101.1, -30, 'N', 1, 1, 0, '10-23'],                 // sel sama hari lain: dihitung lagi
    [-1, 101.2, 0, 'X', 1, 2, 0, '10-24']]                   // sensor asing
  const u = A.unik(b, 1)
  assert.deepEqual([...u].map(r => r[3]).sort(), ['N', 'N20'], `yang dihitung: ${JSON.stringify([...u])}`)
  assert.equal(A.unik(b).size, 3, 'bawaan (pemilik 28 Okt 2026, titik_unik.KEYAKINAN_MIN = 0) harus ikut menghitung keyakinan rendah')
})

test('paritas lokasi unik dengan titik_unik.py', () => {
  let s = 11
  const acak = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  const b = []
  for (let i = 0; i < 600; i++) {   // padat (0,03 derajat ~ 9 sel) supaya banyak sel bertabrakan antarsatelit
    const jam = -Math.round(acak() * 4800) / 100
    b.push([-6 + acak() * 12 * (i % 4 ? 0.0025 : 1), 101 + acak() * 0.03, jam, ['M', 'N', 'N20', 'N21', 'X'][i % 5], 1, i % 7 ? 1 + (i % 2) : 0, 0, jam > -24 ? '10-24' : '10-23'])
  }
  const js = [...A.unik(b)].map(r => b.indexOf(r)).sort((x, y) => x - y)
  const py = JSON.parse(execFileSync('python3', ['-c', `
import sys, json; sys.path.insert(0, "scripts/data"); import titik_unik as T
b = json.load(sys.stdin); i = sorted(range(len(b)), key=lambda k: b[k][2])
u = T.unik([dict(k=k, s=b[k][3], c=b[k][5], lat=b[k][0], lon=b[k][1], h=b[k][7]) for k in i], lambda p: p["h"])
print(json.dumps(sorted(p["k"] for p in u)))`], { cwd: akar, input: JSON.stringify(b) }).toString())
  assert.ok(py.length > 50 && py.length < b.length * 0.6, `fikstur harus memuat lokasi dobel: ${py.length} dari ${b.length}`)
  assert.deepEqual(js, py, `JS ${js.length} lokasi vs Python ${py.length}; beda pertama di indeks ${js.find((x, k) => x !== py[k])}`)
})
