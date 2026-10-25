// Gerbang dua halaman deck Laporan Kejadian Bencana Harian yang diisi Pusdalops
// (public/laporan_bnpb_slide.js: status_daerah dan pusdalops), dijalankan nyata di node tanpa DOM.
// Menagih: keduanya hanya ikut dicetak bila isiannya ada (deck tetap empat halaman kalau tidak),
// hitungan di judul berasal dari isian, daftar kanan hanya tanggap darurat, teks panjang dipotong,
// butir dokumen jadi titik koma, dan tidak ada titik tengah atau em dash di halaman mana pun.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const win = {}
const ctx = { window: win, document: {}, Intl, Date, Math }
vm.createContext(ctx)
for (const f of ['paparan_slide', 'laporan_bnpb_slide', 'laporan_contoh'])
  vm.runInContext(readFileSync(new URL(`../../public/${f}.js`, import.meta.url), 'utf8'), ctx, { filename: f })
const LB = win.LaporanBnpbSlide

const PROV = { 14: 'Riau', 33: 'Jawa Tengah', 62: 'Kalimantan Tengah' }
const isi = () => JSON.parse(JSON.stringify(win.LaporanContoh.harian('2026-10-21', '2026-10-20')))

/* kanvas perekam: tiap teks yang digambar beserta kotaknya */
const rekam = () => {
  const teks = []
  const k = { teks: (x, y, w, h, r, o = {}) => teks.push({ x, y, w, h, s: o.s || 10, t: (typeof r === 'string' ? [{ t: r }] : Array.isArray(r) ? r : [r]).map(p => p.t ?? p).join('') }),
    kotak() {}, garis() {}, bulat() {}, gambar() {} }
  return { k, teks }
}
/* deckHarian() lahir di realm vm, jadi lariknya dibandingkan sebagai teks: deepStrictEqual
   membandingkan prototipe juga, dan prototipe larik vm berbeda dengan prototipe larik uji. */
const urutan = i => LB.deckHarian({ isi: i }).map(s => s.id).join(', ')
const gambar = (id, i) => {
  const s = LB.DECK.harian.find(x => x.id === id), r = rekam()
  s.gambar(r.k, { isi: i, tanggal: '2026-10-21', tahun: '2026', prov: PROV, aset: {}, no: 1 })
  return { teks: r.teks.map(x => x.t).join('\n'), baris: r.teks }
}
const tanpaPemisahTerlarang = baris => { for (const x of baris) assert.ok(!/[·—–]/.test(x.t), 'tanpa titik tengah dan em dash: ' + x.t) }

test('deck harian: dua halaman Pusdalops hanya ikut bila datanya ada', () => {
  assert.equal(urutan(isi()), 'sampul, ringkasan, rincian, penutup', 'tanpa isian Pusdalops deck tetap empat halaman seperti sebelumnya')

  const i = isi()
  i.status_daerah = [{ prov: '33', kabkota: 'Kab. Karanganyar', jenis_teks: 'Karhutla', macam: 'tanggap', masa: 'SK TMT 17 Okt s.d 30 Okt 2026' }]
  assert.equal(urutan(i), 'sampul, ringkasan, rincian, status_daerah, penutup')

  const j = isi()
  j.kejadian[0] = { ...j.kejadian[0], kendala: 'Sumber air kering', kebutuhan: 'Pompa jinjing' }
  assert.equal(urutan(j), 'sampul, ringkasan, rincian, pusdalops, penutup')

  const d = isi()
  d.status_daerah = [{ prov: '14', kabkota: '', jenis_teks: 'Karhutla', macam: 'siaga', masa: 'SK TMT 13 Feb s.d 30 Nov 2026' }]
  d.kejadian[0] = { ...d.kejadian[0], kendala: 'Akses sulit' }
  assert.equal(urutan(d), 'sampul, ringkasan, rincian, status_daerah, pusdalops, penutup')
})

test('baris status daerah tanpa provinsi tidak menghidupkan halamannya', () => {
  const i = isi()
  i.status_daerah = [{ prov: '', prov_teks: '', kabkota: 'Kab. Entah', jenis_teks: 'Karhutla', macam: 'siaga' }]
  assert.ok(!urutan(i).includes('status_daerah'), urutan(i))
})

test('halaman status darurat daerah: hitungan per macam dan provinsi dari isian', () => {
  const i = isi()
  i.status_daerah = [
    { prov: '33', kabkota: 'Kab. Karanganyar', jenis_teks: 'Karhutla', macam: 'tanggap', masa: 'SK TMT 17 Okt s.d 30 Okt 2026' },
    { prov: '33', kabkota: '', jenis_teks: 'Kekeringan dan Karhutla', macam: 'siaga', masa: 'SK TMT 1 Juni s.d 31 Des 2026' },
    { prov: '33', kabkota: 'Kab. Wonosobo', jenis_teks: 'Karhutla', macam: 'siaga', masa: 'SK TMT 21 Okt s.d 27 Okt 2026' },
    { prov: '14', kabkota: 'Kab. Bengkalis', jenis_teks: 'Karhutla', macam: 'transisi', masa: 'SK TMT 2 Feb s.d 30 Nov 2026' },
  ]
  const { teks, baris } = gambar('status_daerah', i)
  assert.match(teks, /Status darurat berlaku di 2 provinsi, 4 penetapan, 1 di antaranya tanggap darurat/)
  assert.ok(teks.includes('Jawa Tengah') && teks.includes('Riau'), 'tiap provinsi punya barisnya')
  assert.ok(teks.includes('Kab. Karanganyar'), 'daerah tanggap darurat disebut di daftar kanan')
  assert.ok(!teks.includes('Kab. Wonosobo'), 'daftar kanan hanya memuat tanggap darurat')
  tanpaPemisahTerlarang(baris)
})

test('halaman status darurat daerah: tanpa tanggap darurat, kalimatnya dikatakan bukan dikosongkan', () => {
  const i = isi()
  i.status_daerah = [{ prov: '14', kabkota: 'Kab. Bengkalis', jenis_teks: 'Karhutla', macam: 'siaga', masa: 'SK TMT 2 Feb s.d 30 Nov 2026' }]
  const { teks } = gambar('status_daerah', i)
  assert.ok(!/di antaranya tanggap darurat/.test(teks), 'judul tidak menyebut yang nol')
  assert.match(teks, /Tidak ada daerah berstatus tanggap darurat\./)
})

test('halaman hambatan dan kebutuhan: medan lapangan tampil, butir jadi titik koma, teks panjang dipotong', () => {
  const i = isi()
  const panjang = 'Sumber air kering dan jauh dari lokasi ' + 'a'.repeat(300)
  i.kejadian = [
    { ...i.kejadian[0], status: 'belum', kendala: '● ' + panjang, kebutuhan: '● Pompa jinjing ● Tangki air', upaya: 'Pendinginan lanjutan' },
    { ...i.kejadian[1], status: 'selesai', kendala: '', kebutuhan: '', upaya: '' },
  ]
  const { teks, baris } = gambar('pusdalops', i)
  assert.match(teks, /Hambatan dan kebutuhan lapangan pada 1 kejadian, 1 di antaranya belum selesai/)
  assert.ok(teks.includes('KENDALA') && teks.includes('KEBUTUHAN MENDESAK') && teks.includes('UPAYA'))
  assert.ok(teks.includes('Pompa jinjing; Tangki air'), 'butir dokumen jadi titik koma')
  const kendala = baris.find(x => x.t.startsWith('Sumber air kering'))
  assert.ok(kendala.t.length <= 150, 'teks panjang dipotong, panjangnya ' + kendala.t.length)
  assert.ok(kendala.t.endsWith('…'), 'pemotongan ditandai')
  tanpaPemisahTerlarang(baris)
})

test('halaman hambatan dan kebutuhan: yang belum selesai didahulukan, sisanya disebut jumlahnya', () => {
  const i = isi()
  i.kejadian = Array.from({ length: 8 }, (_, n) => ({ ...i.kejadian[0], lokasi: 'Kab. ' + n, status: n === 7 ? 'belum' : 'berjalan', kendala: 'Kendala ' + n }))
  const { teks } = gambar('pusdalops', i)
  assert.ok(teks.includes('Kendala 7'), 'yang belum selesai masuk halaman walau urutannya terakhir')
  assert.match(teks, /Dan 2 kejadian lain dengan rincian lapangan/)
})

test('halaman Pusdalops tidak melempar saat isian kosong (dipakai gerbang yang menggambar seluruh deck)', () => {
  const i = isi()
  i.status_daerah = []
  i.kejadian = []
  for (const id of ['status_daerah', 'pusdalops']) assert.doesNotThrow(() => gambar(id, i), id)
})
