// Gerbang kartu "Peta provinsi" interaktif (public/peta_karhutla.js): penjumlahan periode, pembanding, tetangga periode, label, catatan celah,
// dan markup kontrol. Modul murni, dijalankan nyata di node tanpa DOM. Berkas data/peta_karhutla.json (bila sudah ada) diuji lewat invarian, bukan potret angka.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const akar = new URL('../../', import.meta.url)
const win = {}
new Function('window', readFileSync(new URL('public/peta_karhutla.js', akar), 'utf8'))(win)   // realm yang sama: objek hasil berprototipe sama, deepStrictEqual sah
const R = win.PetaKarhutla
assert.equal(typeof R.kontrol, 'function', 'peta_karhutla.js harus mengekspor window.PetaKarhutla')

// 31 hari 2026-09-21 .. 2026-10-21 (Senin 19 Okt = indeks 28); hot = i+1, luas = 10(i+1), belum = 100(i+1); satu provinsi tambahan serba nol
const hari = Array.from({ length: 31 }, (_, i) => R.tambah('2026-09-21', i))
const deret = f => hari.map((_, i) => f(i))
const J = () => ({ versi: 1, dibuat: '2026-10-21T22:00:00+07:00', cutoff: '2026-10-21T07:00:00+07:00', hari: [...hari], faktor: { N20: 4.22, N21: 4.36 }, celah: ['2026-10-20'],
  metode: { hot: 'a', luas: 'b', belum: 'c', padam: 'd', catatan: [] },
  prov: { 62: { nama: 'Kalimantan Tengah', hot: deret(i => i + 1), luas: deret(i => 10 * (i + 1)), belum: deret(i => 100 * (i + 1)), padam: deret(() => 0) },
          14: { nama: 'Riau', hot: deret(() => 0), luas: deret(() => 0), belum: deret(() => 0), padam: deret(() => 0) } } })
const P = R.siapkan(J())
const i = s => P.idx.get(s)

test('cek: kontrak sah lolos, yang rusak ditolak dengan alasan', () => {
  assert.equal(R.cek(J()), '')
  const rusak = f => { const j = J(); f(j); return R.cek(j) }
  assert.match(rusak(j => { j.versi = 2 }), /versi/)
  assert.match(rusak(j => { j.hari.splice(5, 1) }), /berurutan/)
  assert.match(rusak(j => { j.prov[62].hot.pop() }), /62\.hot/)
  assert.match(rusak(j => { j.prov[62].luas[3] = null }), /62\.luas/)
  assert.match(rusak(j => { j.prov = {} }), /prov/)
  assert.ok(R.cek(null))
})

test('rentang: hari, minggu (Senin-Minggu), bulan, tahun, rentang bebas; dipotong ke data, di luar data = null', () => {
  assert.deepEqual(R.rentang(P, 'hari', '2026-10-21'), { i0: 30, i1: 30 })
  assert.deepEqual(R.rentang(P, 'minggu', '2026-10-21'), { i0: i('2026-10-19'), i1: 30 })   // Sen 19 s.d. Min 25, data berakhir 21
  assert.deepEqual(R.rentang(P, 'minggu', '2026-10-14'), { i0: i('2026-10-12'), i1: i('2026-10-18') })
  assert.deepEqual(R.rentang(P, 'minggu', '2026-09-21'), { i0: 0, i1: i('2026-09-27') })    // 21 Sep 2026 = Senin
  assert.deepEqual(R.rentang(P, 'bulan', '2026-10-05'), { i0: i('2026-10-01'), i1: 30 })
  assert.deepEqual(R.rentang(P, 'bulan', '2026-09-30'), { i0: 0, i1: i('2026-09-30') })    // September mulai sebelum data
  assert.deepEqual(R.rentang(P, 'tahun', '2026-10-05'), { i0: 0, i1: 30 })
  assert.deepEqual(R.rentang(P, 'rentang', '2026-10-21', '2026-10-05', '2026-10-01'), { i0: i('2026-10-01'), i1: i('2026-10-05') }, 'a > b ditukar')
  assert.equal(R.rentang(P, 'bulan', '2026-08-15'), null)
  assert.equal(R.rentang(P, 'bulan', '2026-11-01'), null)
  assert.equal(R.rentang(P, 'tahun', '2025-06-01'), null)
})

test('agregat: hotspot dan luas dijumlah per hari; belum padam = nilai hari terakhir, tidak pernah dijumlah', () => {
  const a = i('2026-10-19'), b = i('2026-10-21')
  const hot = R.agregat(P, 'hot', a, b), luas = R.agregat(P, 'luas', a, b), belum = R.agregat(P, 'belum', a, b)
  assert.equal(hot[62], (a + 1) + (a + 2) + (a + 3))
  assert.equal(luas[62], 10 * ((a + 1) + (a + 2) + (a + 3)))
  assert.equal(belum[62], 100 * (b + 1), 'stok: hanya hari b')
  assert.equal(R.agregat(P, 'belum', 0, 30)[62], 100 * 31, 'stok setahun tetap nilai hari terakhir')
  assert.equal(hot[14], 0)
  // jumlah periode = jumlah dua potongannya (aliran), tapi stok tidak
  const g = (m, x, y) => R.agregat(P, m, x, y)[62]
  assert.equal(g('hot', 0, 30), g('hot', 0, 9) + g('hot', 10, 30))
  assert.notEqual(g('belum', 0, 30), g('belum', 0, 9) + g('belum', 10, 30))
})

// data yang sama tanpa hari bercelah: nilai pembanding diuji di sini, perilaku celah di tes terpisah
const Pn = R.siapkan({ ...J(), celah: [] })
test('banding: periode sama panjang tepat sebelumnya; tanpa pembanding bila data tak cukup', () => {
  // Hari: kemarin
  let c = R.banding(Pn, 'hot', 30, 30)
  assert.equal(c.sebelum[62], 30); assert.equal(c.nama, 'Hari sebelumnya')
  // Minggu parsial 19-21 Okt (3 hari): pembanding = 3 hari sebelum itu (16-18 Okt), bukan 19-21 minggu lalu
  const a = i('2026-10-19')
  c = R.banding(Pn, 'hot', a, 30)
  assert.equal(c.sebelum[62], (a - 2) + (a - 1) + a)
  assert.equal(c.nama, 'Periode sebelumnya (16–18 Okt)')
  // stok: nilai hari terakhir periode pembanding
  c = R.banding(Pn, 'belum', a, 30)
  assert.equal(c.sebelum[62], 100 * (30 - 3 + 1))
  // data tak cukup: Bulan Okt (21 hari) butuh 21 hari sebelum 1 Okt, hanya ada 10 (21-30 Sep)
  const bln = R.rentang(Pn, 'bulan', '2026-10-05')
  assert.equal(R.banding(Pn, 'hot', bln.i0, bln.i1).sebelum, null)
  assert.equal(R.banding(Pn, 'hot', 0, 0).sebelum, null, 'hari pertama data tak punya kemarin')
  // stok hanya butuh hari pembanding ada: periode 10 hari di ujung punya pembanding walau aliran-nya ada juga
  assert.notEqual(R.banding(Pn, 'belum', 21, 30).sebelum, null)
})

test('banding: periode atau pembanding yang memuat hari bercelah tidak dibandingkan (perubahan dari data tak lengkap hanya artefak)', () => {
  const c20 = i('2026-10-20')   // celah di J()
  // hari bercelah itu sendiri (20 Okt vs 19 Okt): tanpa pembanding, celahSendiri
  let c = R.banding(P, 'hot', c20, c20)
  assert.equal(c.sebelum, null); assert.equal(c.celah, true); assert.equal(c.celahSendiri, true)
  // hari sesudah celah (21 Okt vs 20 Okt): pembandingnya yang bercelah
  c = R.banding(P, 'hot', 30, 30)
  assert.equal(c.sebelum, null); assert.equal(c.celah, true); assert.equal(c.celahSendiri, false)
  // 19 Okt vs 18 Okt: bersih, perubahan tampil
  c = R.banding(P, 'hot', i('2026-10-19'), i('2026-10-19'))
  assert.notEqual(c.sebelum, null); assert.equal(c.celah, false)
  // minggu 19-21 (memuat 20 Okt) vs 16-18: celah di periode sekarang
  assert.equal(R.banding(P, 'luas', i('2026-10-19'), 30).sebelum, null)
  // stok: hanya hari terakhir periode dan hari pembandingnya yang dicek; celah di tengah periode tidak membatalkan perubahan
  c = R.banding(P, 'belum', i('2026-10-19'), i('2026-10-21'))   // 20 Okt di tengah; hari akhir 21 dan pembanding 18 bersih
  assert.notEqual(c.sebelum, null, 'stok tak bergantung hari tengah')
  assert.equal(R.banding(P, 'belum', 30, 30).sebelum, null, 'stok hari 21 Okt: pembanding 20 Okt bercelah')
  // tanpa pembanding sama sekali tidak dihitung sebagai celah
  assert.equal(R.banding(P, 'hot', 0, 0).celah, false)
  // catatan kedua: alasan lencana hilang, sesuai sumber celahnya
  assert.match(R.catatanBanding(P, 'hot', c20, c20), /periode ini tidak lengkap/)
  assert.match(R.catatanBanding(P, 'hot', 30, 30), /pembanding tidak lengkap/)
  assert.equal(R.catatanBanding(P, 'hot', i('2026-10-19'), i('2026-10-19')), '')
  // celah per ukuran (bila JSON kelak memisahkan): S-NPP hilang di 20 Okt hanya menggugurkan hotspot, tidak luas dan belum padam
  const Pm = R.siapkan({ ...J(), celah_hot: ['2026-10-20'], celah_luas: [] })
  assert.equal(R.banding(Pm, 'hot', c20, c20).sebelum, null)
  assert.notEqual(R.banding(Pm, 'luas', c20, c20).sebelum, null)
  assert.notEqual(R.banding(Pm, 'belum', c20, c20).sebelum, null)
  assert.equal(R.catatanCelah(Pm, c20, c20, 'luas'), ''); assert.match(R.catatanCelah(Pm, c20, c20, 'hot'), /20 Okt/)
})

test('tetangga: label pendek, ref ter-klem ke data, dinonaktifkan di luar jangkauan data', () => {
  let t = R.tetangga(P, 'hari', '2026-10-21', 1); assert.equal(t.ada, false); assert.equal(t.label, '22 Okt')
  t = R.tetangga(P, 'hari', '2026-10-21', -1); assert.deepEqual([t.ada, t.ref, t.label], [true, '2026-10-20', '20 Okt'])
  t = R.tetangga(P, 'hari', '2026-09-21', -1); assert.equal(t.ada, false)
  t = R.tetangga(P, 'minggu', '2026-10-21', -1); assert.deepEqual([t.ada, t.ref, t.label], [true, '2026-10-12', '12–18 Okt'])
  t = R.tetangga(P, 'minggu', '2026-10-21', 1); assert.equal(t.ada, false)
  t = R.tetangga(P, 'minggu', '2026-09-25', -1); assert.equal(t.ada, false, 'minggu 14-20 Sep seluruhnya sebelum data')
  t = R.tetangga(P, 'bulan', '2026-10-21', -1); assert.deepEqual([t.ada, t.ref, t.label], [true, '2026-09-21', '21–30 Sep'], 'ref ter-klem ke awal data; data mulai 21 Sep, jadi tombol menamai isi yang terbuka, bukan "Sep 2026"')
  t = R.tetangga(P, 'minggu', '2026-10-14', 1); assert.deepEqual([t.ada, t.ref, t.label], [true, '2026-10-19', '19–21 Okt'], 'minggu 19-25 Okt terpotong data: tombol 19–21, bukan 19–25')
  t = R.tetangga(P, 'bulan', '2026-10-21', 1); assert.deepEqual([t.ada, t.label], [false, 'Nov 2026'])
  t = R.tetangga(P, 'bulan', '2026-09-21', -1); assert.deepEqual([t.ada, t.label], [false, 'Agu 2026'])
  t = R.tetangga(P, 'tahun', '2026-10-21', -1); assert.deepEqual([t.ada, t.label], [false, '2025'])
  t = R.tetangga(P, 'tahun', '2026-10-21', 1); assert.deepEqual([t.ada, t.label], [false, '2027'])
  // lintas tahun: data 2025-12-20 .. 2026-01-10
  const P2 = R.siapkan({ ...J(), hari: Array.from({ length: 22 }, (_, k) => R.tambah('2025-12-20', k)), celah: [], prov: { 62: { nama: 'x', hot: Array(22).fill(1), luas: Array(22).fill(1), belum: Array(22).fill(1) } } })
  t = R.tetangga(P2, 'tahun', '2026-01-05', -1); assert.deepEqual([t.ada, t.ref, t.label], [true, '2025-12-20', '20–31 Des'], '2025 hanya tercakup 20–31 Des')
  t = R.tetangga(P2, 'bulan', '2026-01-05', -1); assert.deepEqual([t.ada, t.ref], [true, '2025-12-20'])
})

test('label dan kata waktu: bahasa Indonesia, tanpa presisi palsu', () => {
  const a = i('2026-10-19')
  assert.equal(R.label(P, 'hari', 30, 30), '21 Okt 2026')
  assert.equal(R.label(P, 'minggu', a, 30), '19–21 Okt 2026')
  assert.equal(R.label(P, 'bulan', i('2026-10-01'), 30), '1–21 Okt 2026', 'Okt baru tercakup s.d. 21: bukan "Oktober 2026"')
  assert.equal(R.label(P, 'tahun', 0, 30), '21 Sep – 21 Okt 2026', 'tahun parsial memakai rentang tercakup')
  assert.equal(R.label(P, 'rentang', i('2026-09-28'), i('2026-10-03')), '28 Sep – 3 Okt 2026')
  assert.equal(R.labelTgl('rentang', '2025-12-30', '2026-01-02'), '30 Des 2025 – 2 Jan 2026')
  assert.equal(R.waktu(P, 'hari', 30, 30, 'hot'), 'pada 21 Okt 2026')
  assert.equal(R.waktu(P, 'minggu', a, 30, 'hot'), 'selama 19–21 Okt 2026')
  assert.equal(R.waktu(P, 'tahun', 0, 30, 'luas'), 'selama 21 Sep – 21 Okt 2026', '"sepanjang" hanya untuk tahun penuh')
  assert.equal(R.waktu(P, 'bulan', i('2026-10-01'), 30, 'belum'), 'per 21 Okt 2026', 'belum padam selalu "per <tanggal akhir>"')
  assert.equal(R.waktu(P, 'rentang', 30, 30, 'hot'), 'pada 21 Okt 2026')
})

test('celah: catatan muncul hanya bila periode memuat hari bercelah', () => {
  assert.equal(R.catatanCelah(P, i('2026-10-20'), i('2026-10-20')), 'Data satelit tidak lengkap pada 20 Okt')
  assert.equal(R.catatanCelah(P, i('2026-10-21'), i('2026-10-21')), '')
  assert.equal(R.catatanCelah(P, 0, 30), 'Data satelit tidak lengkap pada 20 Okt')
  const banyak = R.siapkan({ ...J(), celah: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'] })
  assert.equal(R.catatanCelah(banyak, 0, 30), 'Data satelit tidak lengkap pada 4 hari, mulai 1 Okt')
})

test('awalRentang: periode yang sedang tampil jadi rentang awal; satu hari = 7 hari berakhir di sana', () => {
  assert.deepEqual(R.awalRentang(P, 'hari', '2026-10-21'), { a: '2026-10-15', b: '2026-10-21' })
  assert.deepEqual(R.awalRentang(P, 'hari', '2026-09-23'), { a: '2026-09-21', b: '2026-09-23' }, 'tidak mundur melewati awal data')
  assert.deepEqual(R.awalRentang(P, 'minggu', '2026-10-14'), { a: '2026-10-12', b: '2026-10-18' })
})

test('pilihan periode: terbaru dulu, ref selalu di dalam data', () => {
  const m = R.pilihan(P, 'bulan'); assert.deepEqual(m.map(x => x.label), ['1–21 Okt 2026', '21–30 Sep 2026'], 'pilihan bulan memuat batas yang tercakup, bukan nama bulan penuh'); assert.equal(m[1].ref, '2026-09-21')
  const w = R.pilihan(P, 'minggu'); assert.equal(w.length, 5); assert.equal(w[0].label, '19–21 Okt 2026'); assert.equal(w.at(-1).ref, '2026-09-21')
  assert.ok(w.every(x => P.idx.has(x.ref)))
  assert.deepEqual(R.pilihan(P, 'tahun').map(x => x.label), ['21 Sep – 21 Okt 2026'])
})

test('kontrol: ukuran dan jenis periode terbagi rata, tombol pilihan di luar data nonaktif, kontrol native', () => {
  const s = (ubah = {}) => R.kontrol(P, { metrik: 'hot', mode: 'hari', ref: '', a: '', b: '', ...ubah }, ubah.ref || '2026-10-21')
  let h = s()
  for (const t of ['Hotspot', 'Luas terbakar', 'Belum padam', 'Hari', 'Minggu', 'Bulan', 'Rentang', '12 Bulan']) assert.ok(h.includes(`>${t}</button>`), `tombol ${t}`)
  assert.equal((h.match(/data-pk="metrik"/g) || []).length, 3); assert.equal((h.match(/data-pk="mode"/g) || []).length, 5)
  assert.match(h, /data-pk="metrik" data-v="hot" aria-pressed="true"/); assert.match(h, /data-pk="mode" data-v="hari" aria-pressed="true"/)
  assert.match(h, /type="date" data-pk="ref" value="2026-10-21" min="2026-09-21" max="2026-10-21"/)
  assert.match(h, /data-v="1" disabled aria-label="Periode berikutnya: 22 Okt"/, 'hari terakhir: tombol berikutnya nonaktif')
  assert.doesNotMatch(h, /data-v="-1" disabled/)
  assert.match(h, /class="lp-cl" role="note"><span>Perubahan tidak ditampilkan: data satelit pembanding tidak lengkap<\/span><\/div>/, '21 Okt bersih, tetapi pembandingnya 20 Okt bercelah')
  assert.ok(R.kontrol(Pn, { metrik: 'hot', mode: 'hari', ref: '', a: '', b: '' }, '2026-10-21').includes('class="lp-cl"') === false, 'tanpa celah di periode maupun pembanding: tanpa catatan')
  assert.ok(s({ ref: '2026-10-20' }).includes('Data satelit tidak lengkap pada 20 Okt'))
  h = s({ metrik: 'belum', mode: 'bulan', ref: '2026-10-05' })
  assert.match(h, /<select data-pk="ref" aria-label="Pilih bulan"><option value="2026-10-01" selected>1–21 Okt 2026<\/option>/)
  assert.match(h, /data-pk="metrik" data-v="belum" aria-pressed="true"/)
  h = s({ mode: 'rentang', a: '2026-10-01', b: '2026-10-05' })
  assert.match(h, /data-pk="a" value="2026-10-01" min="2026-09-21" max="2026-10-05"/); assert.match(h, /data-pk="b" value="2026-10-05" min="2026-10-01" max="2026-10-21"/)
  assert.doesNotMatch(h, /lp-nv/, 'rentang memakai dua tanggal, tanpa tombol geser')
  h = s({ mode: 'tahun' }); assert.match(h, /data-pk="ref" data-v="2026-09-21" aria-pressed="true">21 Sep – 21 Okt 2026</)
  assert.doesNotMatch(h, /<script|onerror|javascript:/i)
})

test('skrip sah secara sintaks (peta_karhutla.js, laporan.js)', () => {
  for (const f of ['public/peta_karhutla.js', 'public/laporan.js']) execFileSync(process.execPath, ['--check', new URL(f, akar).pathname])
})

test('waktuBagian: kata depan dan label terpisah (label dibungkus sendiri di judul supaya terjemahan kalimat tetap)', () => {
  assert.deepEqual(R.waktuBagian(P, 'hari', 30, 30, 'hot'), ['pada', '21 Okt 2026'])
  assert.deepEqual(R.waktuBagian(P, 'bulan', 21, 30, 'luas'), ['selama', '12–21 Okt 2026'])
  assert.deepEqual(R.waktuBagian(P, 'tahun', 0, 30, 'hot'), ['selama', '21 Sep – 21 Okt 2026'])
  assert.deepEqual(R.waktuBagian(P, 'minggu', 21, 30, 'belum'), ['per', '21 Okt 2026'])
})

// bentuk data nyata: 1 Jan s.d. 20 Okt 2026 (293 hari). Bulan/tahun yang tidak tercakup penuh tidak boleh memakai nama nominalnya.
const dataSd = (awal, n) => R.siapkan({ ...J(), hari: Array.from({ length: n }, (_, k) => R.tambah(awal, k)), celah: [],
  prov: { 62: { nama: 'x', hot: Array(n).fill(1), luas: Array(n).fill(2), belum: Array(n).fill(3) } } })
test('label bulan/tahun parsial: nama rentang yang tercakup, nama nominal hanya bila bulan/tahun tercakup penuh', () => {
  const PF = dataSd('2026-01-01', 293), k = s => PF.idx.get(s), akhir = 292
  assert.equal(PF.hari[akhir], '2026-10-20')
  assert.equal(R.label(PF, 'tahun', 0, akhir), '1 Jan – 20 Okt 2026', 'data s.d. 20 Okt: bukan "2026" polos')
  assert.ok(R.label(PF, 'tahun', 0, akhir).includes('20 Okt'))
  assert.equal(R.label(PF, 'tahun', 0, akhir, true), '1 Jan – 20 Okt')
  assert.equal(R.label(PF, 'bulan', k('2026-10-01'), akhir), '1–20 Okt 2026')
  assert.equal(R.label(PF, 'bulan', k('2026-01-01'), k('2026-01-31')), 'Januari 2026', 'bulan penuh tetap bernama bulan')
  assert.equal(R.label(PF, 'bulan', k('2026-09-01'), k('2026-09-30'), true), 'Sep 2026')
  assert.deepEqual(R.waktuBagian(PF, 'tahun', 0, akhir, 'hot'), ['selama', '1 Jan – 20 Okt 2026'])
  assert.deepEqual(R.waktuBagian(PF, 'bulan', k('2026-10-01'), akhir, 'luas'), ['selama', '1–20 Okt 2026'])
  assert.deepEqual(R.waktuBagian(PF, 'bulan', k('2026-03-01'), k('2026-03-31'), 'luas'), ['selama', 'Maret 2026'])
  // pilihan: Oktober parsial, sembilan bulan sebelumnya penuh
  const m = R.pilihan(PF, 'bulan'); assert.equal(m.length, 10); assert.equal(m[0].label, '1–20 Okt 2026'); assert.equal(m[1].label, 'September 2026'); assert.equal(m.at(-1).label, 'Januari 2026')
  assert.deepEqual(R.pilihan(PF, 'tahun').map(x => x.label), ['1 Jan – 20 Okt 2026'])
  // tahun penuh: nama nominal dan "sepanjang"
  const PT = dataSd('2026-01-01', 365)
  assert.equal(R.label(PT, 'tahun', 0, 364), '2026'); assert.deepEqual(R.waktuBagian(PT, 'tahun', 0, 364, 'hot'), ['sepanjang', '2026'])
  // minggu terpotong data: tombol geser menamai isi yang terbuka (19–20 Okt), bukan batas nominal 19–25
  const t = R.tetangga(PF, 'minggu', '2026-10-14', 1); assert.deepEqual([t.ada, t.label], [true, '19–20 Okt'])
})

test('kontrol: catatan celah dua kalimat (celah + alasan lencana hilang), tiap kalimat di simpulnya sendiri', () => {
  const h = R.kontrol(P, { metrik: 'hot', mode: 'hari', ref: '', a: '', b: '' }, '2026-10-20')
  assert.match(h, /<div class="lp-cl" role="note"><span>Data satelit tidak lengkap pada 20 Okt<\/span><span>Perubahan tidak ditampilkan: data satelit periode ini tidak lengkap<\/span><\/div>/)
})

const nyata = new URL('public/data/peta_karhutla.json', akar)
test('data/peta_karhutla.json (bila sudah terbit): kontrak v1, 38 provinsi, nasional = jumlah provinsi per hari', { skip: !existsSync(nyata) && 'berkas belum ada' }, () => {
  const d = JSON.parse(readFileSync(nyata, 'utf8'))
  assert.equal(R.cek(d), '')
  assert.equal(Object.keys(d.prov).length, 38, 'harus 38 provinsi')
  assert.equal(d.porsi, undefined, 'bentuk lama (porsi) tidak boleh terbit lagi')
  for (const s of ['N20', 'N21']) assert.ok(Number.isFinite(d.faktor?.[s]) && d.faktor[s] > 1 && d.faktor[s] < 10, `faktor ${s} ${d.faktor?.[s]} ha/titik`)
  for (const m of ['hot', 'luas', 'belum', 'padam']) {
    assert.ok(Array.isArray(d.nasional[m]) && d.nasional[m].length === d.hari.length, `nasional.${m} sejajar hari`)
    d.hari.forEach((h, k) => {
      const j = Object.values(d.prov).reduce((a, o) => a + o[m][k], 0)
      assert.ok(Number.isInteger(d.nasional[m][k]) && d.nasional[m][k] === j, `nasional.${m} ${h}: ${d.nasional[m][k]} != jumlah provinsi ${j}`)
    })
  }
  for (const h of d.celah || []) assert.ok(d.hari.includes(h), `celah ${h} di luar hari`)
  for (const k of ['hot', 'luas', 'belum', 'padam', 'catatan']) assert.ok(d.metode && d.metode[k] != null, `metode.${k} kosong`)
})

test('data/peta_karhutla.json (bila sudah terbit): periode terakhir menyebut hari terakhir data, tidak tampil seolah penuh', { skip: !existsSync(nyata) && 'berkas belum ada' }, () => {
  const PD = R.siapkan(JSON.parse(readFileSync(nyata, 'utf8'))), akhir = PD.n - 1, h = PD.hari[akhir], [y, mo, dd] = h.split('-').map(Number)
  const hariKeAkhir = new Date(Date.UTC(y, mo, 0)).getUTCDate()   // hari terakhir bulan itu
  const tahun = R.label(PD, 'tahun', 0, akhir), bulan = R.label(PD, 'bulan', PD.idx.get(`${y}-${String(mo).padStart(2, '0')}-01`) ?? 0, akhir)
  if (!(mo === 12 && dd === 31) && PD.hari[0] === `${y}-01-01`) assert.ok(tahun.includes(`${dd} `), `label tahun "${tahun}" tidak menyebut hari terakhir ${h}`)
  if (dd !== hariKeAkhir) assert.ok(bulan.includes(String(dd)), `label bulan "${bulan}" tidak menyebut hari terakhir ${h}`)
  assert.ok(!/sepanjang/.test(R.waktu(PD, 'tahun', 0, akhir, 'hot')) || (mo === 12 && dd === 31), 'sepanjang hanya untuk tahun penuh')
})
