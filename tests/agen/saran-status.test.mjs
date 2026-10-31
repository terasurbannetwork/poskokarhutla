// Gerbang saran status darurat (scripts/umum/saran_status.py): self-check Python jalan, keluaran punya skema yang dibaca layar,
// tidak ada gempa/tsunami, omc hanya karhutla/kekeringan Siaga tanpa SK, kunci kab = kode IRBI 4 digit milik ikd.json.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const akar = new URL('../../', import.meta.url)
const baca = p => JSON.parse(readFileSync(new URL(p, akar), 'utf8'))

test('self-check python status_darurat dan saran_status hijau', () => {
  for (const s of ['status_darurat', 'saran_status'])
    assert.match(execFileSync('python3', [`scripts/umum/${s}.py`, 'uji'], { cwd: akar.pathname, encoding: 'utf8' }), /ok/)
})
test('keluaran saran_status.json: skema, tanpa gempa/tsunami, omc/basi/teks publik benar', { skip: !existsSync(new URL('public/data/saran_status.json', akar)) }, () => {
  const d = baca('public/data/saran_status.json')
  assert.deepEqual(Object.keys(d).slice(0, 1), ['dibuat'])
  for (const k of ['sumber', 'sumber_berkas', 'catatan', 'catatan_teknis', 'aturan', 'sinyal_dari', 'sinyal_sampai', 'kab', 'ringkas']) assert.ok(k in d, k)
  assert.match(d.catatan, /bukan penetapan/)
  assert.doesNotMatch(d.catatan, /omc true|sk =|berkas pipeline|\.json/)
  assert.match(d.catatan, /Transisi Darurat ke Pemulihan tidak disarankan otomatis/)
  assert.ok(d.sumber.every(s => !/\.json|\d{4}-\d{2}-\d{2}/.test(s)) && d.sumber_berkas.every(s => s.endsWith('.json')))
  assert.ok(Object.values(d.aturan).every(s => !/\.json|scripts\//.test(s)))
  const ikd = baca('public/data/bnpb/ikd.json').kab
  const jenis = ['karhutla', 'banjir', 'kekeringan', 'cuaca', 'gunungapi', 'longsor']
  const status = ['Siaga Darurat', 'Tanggap Darurat', 'Transisi Darurat ke Pemulihan']
  const cakupan = d.ringkas.sk_cakupan_sampai
  const per = {}
  let basi = 0, hip = 0, n = 0
  for (const [kode, es] of Object.entries(d.kab)) {
    assert.ok(kode in ikd, `kode ${kode} tidak ada di ikd.json`)
    for (const e of es) {
      n++
      assert.ok(jenis.includes(e.jenis) && !/gempa|tsunami/i.test(e.jenis), e.jenis)
      assert.ok(status.includes(e.saran) && e.alasan.length > 20)
      assert.equal(e.omc, e.jenis === 'karhutla' && e.saran === 'Siaga Darurat' && e.sk === null && cakupan !== null && cakupan >= e.tanggal_sinyal)
      assert.ok(!/\d\.\d{1,2}(?!\d)/.test(e.alasan), e.alasan)
      assert.ok(!/\.json|\d{4}-\d{2}-\d{2}/.test(e.alasan), e.alasan)
      assert.match(e.tanggal_sinyal, /^\d{4}-\d{2}-\d{2}$/)
      assert.equal(e.basi, e.umur_hari > (e.jenis === 'karhutla' ? 2 : 3))
      assert.ok(e.berkas.endsWith('.json'))
      if (e.jenis === 'karhutla' && e.saran === 'Tanggap Darurat') assert.equal(e.omc, false)
      if (e.sk) assert.deepEqual(Object.keys(e.sk), ['nomor', 'status', 'berakhir'])
      if (e.jenis === 'kekeringan') { assert.match(e.alasan, /ambang hipotesis/); assert.equal(e.hipotesis, true); assert.equal(e.omc, false) }
      if (e.basi) basi++
      if (e.hipotesis) hip++
      per[e.jenis] = (per[e.jenis] || 0) + 1
    }
  }
  assert.deepEqual(d.ringkas.per_jenis, per)
  assert.equal(d.ringkas.kab_dengan_saran, Object.keys(d.kab).length)
  assert.deepEqual([d.ringkas.basi, d.ringkas.hipotesis, d.ringkas.tanpa_hipotesis], [basi, hip, n - hip])
  assert.ok(Object.keys(d.aturan).every(j => jenis.includes(j)))
})
test('status_darurat.json: kolom masa berlaku konsisten dengan ringkas', () => {
  const d = baca('public/data/status_darurat.json')
  const kab = d.sk.filter(x => x.skala === 'kabupaten')
  for (const x of d.sk) {
    assert.equal(x.batas_hari, x.skala === 'kabupaten' ? 14 : 31)
    assert.equal(x.lewat_batas, x.hari !== null && x.hari > x.batas_hari)
  }
  assert.equal(d.ringkas.kab_lewat_batas, kab.filter(x => x.lewat_batas).length)
  assert.equal(d.ringkas.kab_total, kab.length)
  assert.equal(d.ringkas.tanggal_janggal, d.sk.filter(x => x.tanggal_janggal).length)
  assert.equal(d.ringkas.jeda_n, d.sk.filter(x => x.jeda_kejadian_hari !== null).length)
  assert.ok(d.sk.filter(x => x.tanggal_janggal).every(x => x.hari === null && x.lewat_batas === false))
})
test('status_darurat.json: peringatan tahun berjalan', () => {
  const d = baca('public/data/status_darurat.json')
  assert.equal(typeof d.tahun_berjalan, 'number')
  assert.equal(typeof d.tahun_berjalan_ada, 'boolean')
  assert.equal(d.tahun_berjalan_ada, d.tahun.includes(d.tahun_berjalan))
  assert.equal(/Paket SK tahun \d{4} belum terbit/.test(d.catatan), !d.tahun_berjalan_ada)
  assert.ok(d.ringkas.sk_terakhir_mulai === null || /^\d{4}-\d{2}-\d{2}$/.test(d.ringkas.sk_terakhir_mulai))
})
