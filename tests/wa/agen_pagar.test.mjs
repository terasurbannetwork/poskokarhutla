// Pagar angka bot V2 (data/kajian-bnpb/bot-laporan D17, A11; T28, T29). Isi deck buatan + satu deck nyata di repo.
// Termasuk celah dari pemeriksa bersih 19 Nov 2026: shape angka saja diganti nama, kata kunci dan angka di baris berbeda,
// karakter tak terlihat, angka Unicode, tautan eksternal, teks kunci API.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { periksa, angkaDi, nilai, normal } from '../../scripts/wa/agen_pagar.mjs'

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const salin = (o) => JSON.parse(JSON.stringify(o))
const DASAR = {
  slides: [
    { n: 1, tersembunyi: false, shapes: [
      { nama: 's1_judul', teks: 'Situasi hotspot 17 Nov 2026, Cut off 18.00 WIB', tampak: true },
      { nama: 's1_label_hotspot', teks: 'HOTSPOT', tampak: true },
      { nama: 's1_hotspot', teks: '1.234', tampak: true },
      { nama: 's1_kpi_firespot', teks: 'FIRESPOT\n546', tampak: true },
      { nama: 's1_ringkas', teks: 'Hotspot terbanyak di Kalimantan Selatan', tampak: true },
    ] },
    { n: 2, tersembunyi: false, shapes: [
      { nama: 's2_tabel', teks: '', tampak: true, tabel: [['Provinsi', 'Hotspot', 'Luas terbakar (ha)'], ['Riau', '12', '40,5'], ['Jambi', '3', '6']] },
      { nama: 's2_judul', teks: 'Rincian per provinsi', tampak: true },
    ] },
    { n: 3, tersembunyi: false, shapes: [
      { nama: 's3_omc', teks: 'Operasi Modifikasi Cuaca\n2 sortie, NaCl 1.600 kg', tampak: true },
      { nama: 's3_armada', teks: 'Armada udara\n5 helikopter', tampak: true },
    ] },
  ],
  lain: [{ bagian: 'ppt/notesSlides/notesSlide1.xml', teks: 'Catatan penyaji' }],
  media: [{ bagian: 'ppt/media/image1.png', sha256: 'aaa' }],
  luar: [],
}
const KUNCI = [
  { slide: 1, shape: 's1_hotspot', angka: 'hotspot' }, { slide: 1, shape: 's1_kpi_firespot', angka: 'firespot' },
  { slide: 2, shape: 's2_tabel', sel: [1, 1], angka: 'hotspot' }, { slide: 2, shape: 's2_tabel', sel: [1, 2], angka: 'luas terbakar' },
  { slide: 2, shape: 's2_tabel', sel: [2, 1], angka: 'hotspot' }, { slide: 2, shape: 's2_tabel', sel: [2, 2], angka: 'luas terbakar' },
]
const shape = (isi, nama) => isi.slides.flatMap((s) => s.shapes).find((x) => x.nama === nama)
const gagal = (k, opsi) => { const r = periksa(DASAR, k, KUNCI, opsi); assert.equal(r.lolos, false, 'harus ditolak'); return r.langgar.join(' | ') }

test('angka: aturan Indonesia, pemisah spasi, angka Unicode; tanggal, tahun, jam dilewati', () => {
  assert.equal(nilai('1.234'), '1234'); assert.equal(nilai('12,5'), '12.5'); assert.equal(nilai('1.250,75'), '1250.75'); assert.equal(nilai('±2,60'), '2.6')
  assert.deepEqual(angkaDi('Hotspot 17 Nov 2026 pukul 18.00 WIB: 1.234 titik, 17/11/2026'), ['1234'])
  assert.deepEqual(angkaDi('periode 2026-11-17 07.00 sampai 18 November'), [])
  assert.deepEqual(angkaDi('9 999 titik'), ['9999']); assert.deepEqual(angkaDi('１２３４'), ['1234']); assert.deepEqual(angkaDi('٤٥'), ['45'])
  assert.equal(normal('Hot​spot'), 'Hotspot'); assert.equal(normal('fire­spot'), 'firespot')
})

test('deck sama dengan dasar: lolos tanpa peringatan', () => {
  const r = periksa(DASAR, salin(DASAR), KUNCI)
  assert.equal(r.lolos, true, r.langgar.join('; ')); assert.deepEqual(r.dihapus, []); assert.deepEqual(r.tanpaSumber, [])
})

test('angka terkunci diubah = gagal; sel tabel diubah atau hilang = gagal', () => {
  const k = salin(DASAR); shape(k, 's1_hotspot').teks = '1.235'
  assert.match(gagal(k), /hotspot \(slide 1\): berubah/)
  const t = salin(DASAR); shape(t, 's2_tabel').tabel[1][2] = '41'; gagal(t)
  const h = salin(DASAR); shape(h, 's2_tabel').tabel[2] = ['Jambi']; assert.match(gagal(h), /sel tabel angka sistem hilang/)
})

test('shape terkunci hilang padahal slide masih ada = gagal; slide dihapus utuh = lolos dan tercatat', () => {
  const k = salin(DASAR); k.slides[0].shapes = k.slides[0].shapes.filter((x) => x.nama !== 's1_kpi_firespot')
  assert.match(gagal(k), /hilang atau diganti nama/)
  const s = salin(DASAR); s.slides = s.slides.filter((x) => x.n !== 2)
  const r = periksa(DASAR, s, KUNCI)
  assert.equal(r.lolos, true, r.langgar.join('; ')); assert.match(r.dihapus.join(), /slide dihapus/)
})

test('celah pemeriksa: shape berisi angka saja diganti nama dengan angka lain di samping label = gagal', () => {
  const k = salin(DASAR); const x = shape(k, 's1_hotspot'); x.nama = 'TextBox 9'; x.teks = '9.999'
  assert.match(gagal(k), /hilang atau diganti nama|angka 9999/)
})

test('label terkunci disalin ke shape lain dengan angka lain = gagal; dipindah ke slide lain dengan angka sama = lolos', () => {
  const k = salin(DASAR); k.slides[2].shapes.push({ nama: 'Kotak 3', teks: 'FIRESPOT\n600', tampak: true })
  assert.match(gagal(k), /disalin dengan angka lain/)
  const m = salin(DASAR); const x = shape(m, 's1_kpi_firespot'); m.slides[0].shapes = m.slides[0].shapes.filter((s) => s !== x); m.slides[2].shapes.push(x)
  assert.equal(periksa(DASAR, m, KUNCI).lolos, true)
})

test('slide tersembunyi atau shape tak tampak = gagal', () => {
  const h = salin(DASAR); h.slides[0].tersembunyi = true; assert.match(gagal(h), /disembunyikan/)
  const z = salin(DASAR); shape(z, 's1_kpi_firespot').tampak = false; gagal(z)
})

test('celah pemeriksa: kata kunci dan angka di baris, koma, atau shape berbeda; karakter tak terlihat; angka lebar = gagal', () => {
  for (const teks of ['Hotspot hari ini\n9.999', 'Jumlah hotspot, 9.999 titik', 'Hot​spot nasional 9.999', 'lahan terbakar seluas ９９９ ha', 'Hotspot nasional 9 999'])
    { const k = salin(DASAR); shape(k, 's3_armada').teks = teks; gagal(k) }
  const t = salin(DASAR); t.slides[2].shapes.push({ nama: 'Tabel 2', teks: '', tampak: true, tabel: [['Wilayah', 'Titik api'], ['Riau', '77']] }); gagal(t)
  const c = salin(DASAR); c.lain[0].teks = 'Sebenarnya hotspot 2.000'; assert.match(gagal(c), /notesSlide1/)
  const a = salin(DASAR); shape(a, 's3_armada').alt = 'hotspot 4.444'; gagal(a)
})

test('angka dari bahan boleh di bagian angka sistem; angka dasar tetap boleh', () => {
  const k = salin(DASAR); shape(k, 's3_armada').teks = 'Armada udara 5 helikopter, padam darat 24 ha'
  assert.equal(periksa(DASAR, k, KUNCI, { izin: ['Total hasil operasi darat: ±24,00 ha'] }).lolos, true)
  gagal(k)
})

test('media baru, tautan eksternal baru, teks kunci API = gagal; media dari laporan kemarin boleh', () => {
  const k = salin(DASAR); k.media.push({ bagian: 'ppt/media/image9.png', sha256: 'bbb' })
  assert.match(gagal(k), /image9/)
  assert.equal(periksa(DASAR, k, KUNCI, { kemarin: { slides: [], lain: [], media: [{ bagian: 'x', sha256: 'bbb' }] } }).lolos, true)
  const l = salin(DASAR); l.luar = [{ bagian: 'ppt/slides/_rels/slide1.xml.rels', target: 'http://x/?d=rahasia' }]; assert.match(gagal(l), /tautan eksternal/)
  const s = salin(DASAR); shape(s, 's3_armada').teks = 'catatan sk-ant-api03-abcdefghijklmnop'; assert.match(gagal(s), /kunci API/)
})

test('laporan harian tanpa kunci: "hotspot 999" = gagal; "rumah terbakar" dan "listrik padam" dengan jumlah agen = boleh', () => {
  const d = { slides: [{ n: 1, tersembunyi: false, shapes: [{ nama: 's1_judul', teks: 'Terdapat 12 kejadian bencana', tampak: true }] }], lain: [], media: [], luar: [] }
  const k = salin(d); k.slides[0].shapes.push({ nama: 'x', teks: 'Hotspot nasional 999 titik', tampak: true })
  assert.equal(periksa(d, k, []).lolos, false)
  const j = salin(d); j.slides[0].shapes.push({ nama: 'y', teks: 'Kebakaran permukiman: 7 rumah terbakar, listrik padam di 3 desa, total 8.025 KK', tampak: true })
  const r = periksa(d, j, [])
  assert.equal(r.lolos, true, r.langgar.join()); assert.ok(r.tanpaSumber.includes('8025'), 'tetap jadi peringatan asal angka')
  const t = salin(d); t.slides[0].shapes.push({ nama: 'z', teks: 'Data hotspot per 17 Nov 2026 pukul 07.00 WIB', tampak: true })
  assert.equal(periksa(d, t, []).lolos, true)
})

test('asal angka: angka tanpa sumber dan dari laporan kemarin jadi peringatan di luar bagian angka sistem', () => {
  const k = salin(DASAR); shape(k, 's3_armada').teks = 'Armada udara\n5 helikopter, 8.025 KK terdampak, 77 personel'
  const r = periksa(DASAR, k, KUNCI, { izin: ['77 personel'], kemarin: { slides: [{ n: 1, shapes: [{ nama: 'a', teks: '8.025 KK' }] }], lain: [], media: [] } })
  assert.equal(r.lolos, true, r.langgar.join()); assert.deepEqual(r.dariKemarin, ['8025']); assert.deepEqual(r.tanpaSumber, [])
  assert.deepEqual(periksa(DASAR, k, KUNCI).tanpaSumber.sort(), ['77', '8025'])
})

test('deck nyata (penanganan 16 Nov): isi dibaca lengkap dan pagar lolos terhadap dirinya sendiri', (t) => {
  const pptx = path.join(AKAR, 'data/laporan-bnpb/penanganan-karhutla/2026-11/2026-11-16/Revisi 2/Laporan Penanganan Pengendalian Karhutla 161126.pptx')
  if (!fs.existsSync(pptx)) return t.skip('deck arsip tidak ada')
  let isi
  for (const py of process.platform === 'win32' ? [['py', ['-3.14']], ['python', []]] : [['python3', []]]) {
    try { isi = JSON.parse(execFileSync(py[0], [...py[1], '-I', path.join(AKAR, 'scripts/wa/agen_isi.py'), pptx], { encoding: 'utf8', maxBuffer: 50e6 })); break } catch {}
  }
  if (!isi) return t.skip('python tidak ada')
  assert.equal(isi.slides.length, 3); assert.ok(isi.media.length > 0); assert.deepEqual(isi.luar, [])
  assert.equal(periksa(isi, salin(isi), []).lolos, true)
})

// Sapu bug 19 Nov 2026 (pemeriksa: deck penanganan tanpa perubahan pun ditolak; hapus slide cara python-pptx ditolak).
test('regresi: dua angka sistem berlabel sama ("678 titik", "139 titik") tidak saling dianggap salinan', () => {
  const d = { slides: [{ n: 1, tersembunyi: false, shapes: [
    { nama: 's1_kpi_hotspot', teks: 'HOTSPOT\n678 titik', tampak: true }, { nama: 's1_kpi_firespot', teks: 'FIRESPOT\n139 titik', tampak: true },
    { nama: 's1_teks_2', teks: 'Legenda 1 sampai 100 titik', tampak: true }] }] }
  const kunci = [{ slide: 1, shape: 's1_kpi_hotspot', angka: 'hotspot' }, { slide: 1, shape: 's1_kpi_firespot', angka: 'firespot' }]
  assert.deepEqual(periksa(d, salin(d), kunci).langgar, [])
  const k = salin(d); k.slides[0].shapes.push({ nama: 'Kotak 9', teks: 'HOTSPOT\n999 titik', tampak: true })
  assert.equal(periksa(d, k, kunci).lolos, false, 'salinan label dengan angka baru tetap ditolak')
})

test('regresi: slide yatim (dihapus dari daftar presentasi, bagiannya tertinggal di ZIP) = slide terhapus', () => {
  const k = salin(DASAR)
  k.slides = k.slides.map((s) => (s.n === 1 ? { ...s, tersembunyi: true, yatim: true } : s))
  const r = periksa(DASAR, k, KUNCI)
  assert.deepEqual(r.langgar, [], JSON.stringify(r.langgar))
  assert.ok(r.dihapus.length > 0)
  const t = salin(DASAR); t.slides[0].tersembunyi = true // disembunyikan (show=0), bukan dihapus: tetap ditolak
  assert.equal(periksa(DASAR, t, KUNCI).lolos, false)
})
