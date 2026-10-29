// Uji pengatur otomatis WA tanpa jaringan, python, atau WhatsApp: fetch/exec/kirim disuntik.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { jalankan, pilihTerbaru, cekSiap, LAPORAN } from '../../scripts/wa/otomatis.mjs'

const kenali = (teks) => (teks.match(/^\[(\w+)\]/) || [])[1] || null // stub: "[kunci] isi"
const wibKe = (jam, tgl = '2026-10-29') => new Date(Date.parse(`${tgl}T00:00:00Z`) + (jam - 7) * 3600e3)
const TGL = '2026-10-29'
const P = (id, kunci, diterima, extra = '') => ({ id, diterima, teks: `[${kunci}] ${extra}`, nama_berkas: '' })
const LENGKAP = [P('1', 'rekap_koordalops_24', 100, 'a'), P('2', 'bmkg_pagi', 101, 'b'), P('3', 'satgas', 102, 'c')]

function dunia(pesan, { gagalGenerator, gagalKirim } = {}) {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-uji-'))
  const kirim = { file: [], teks: [], exec: [] }
  const dep = {
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ pesan }), text: async () => '' }),
    exec: async (cmd, args, o) => {
      kirim.exec.push(args); kirim.opsi = o; kirim.cmd = cmd
      if (gagalGenerator) throw Object.assign(new Error('x'), { stderr: 'baris1\nWA Koordalops s.d. bukan hari laporan' })
      const out = args[args.indexOf('--out') + 1]
      const lap = LAPORAN.find((l) => l.args(TGL, { rekap_koordalops_24: 'k', bmkg_pagi: 'b', satgas: 's' }, 'o')[0] === args[0])
      for (const x of ['pdf', 'pptx']) fs.writeFileSync(path.join(out, `${lap.berkas(TGL)}.${x}`), 'x')
    },
    kirimFile: async (t, p, n, c) => { if (gagalKirim) throw new Error('gateway down'); kirim.file.push({ t, n, c }) },
    kirimTeks: async (t, m) => { kirim.teks.push({ t, m }) },
  }
  const env = { PENERIMA: '6281,120@g.us', PEMILIK: '6299', WORKER_URL: 'http://w', WA_MESIN: 'k' }
  const jalan = (o = {}) => jalankan({ env, dep, kenali, rumah, log: () => {}, tanggal: TGL, now: wibKe(18), ...o })
  return { kirim, jalan, rumah }
}

test('pilihTerbaru: ambil pesan terbaru per jenis, jenis tak dikenal diabaikan', () => {
  const r = pilihTerbaru([P('1', 'bmkg_pagi', 10), P('2', 'bmkg_pagi', 30), P('3', 'bmkg_pagi', 20), { id: '9', diterima: 99, teks: 'halo' }], kenali)
  assert.equal(r.bmkg_pagi.id, '2'); assert.equal(Object.keys(r).length, 1)
})

test('cekSiap: cut-off 12.00 harian dan 17.00 penanganan, dua jenis wajib ada', () => {
  const [h, p] = LAPORAN
  const t = { rekap_koordalops_24: 1, bmkg_pagi: 1, satgas: 1 }
  assert.equal(cekSiap(h, t, wibKe(11.9), TGL).siap, false)
  assert.equal(cekSiap(h, t, wibKe(12), TGL).siap, true)
  assert.equal(cekSiap(p, t, wibKe(16.9), TGL).siap, false)
  assert.equal(cekSiap(p, t, wibKe(17), TGL).siap, true)
  assert.equal(cekSiap(p, { bmkg_pagi: 1 }, wibKe(20), TGL).siap, false)           // satgas belum ada
  assert.equal(cekSiap(p, t, wibKe(1), '2026-10-28').siap, true)                  // hari lampau: cut-off sudah lewat
})

test('kirim sekali: dua laporan x dua berkas x dua penerima, caption tanpa titik tengah; ulang = tidak kirim lagi', async () => {
  const d = dunia(LENGKAP)
  await d.jalan()
  assert.equal(d.kirim.file.length, 8)
  assert.ok(d.kirim.file.every((f) => !f.c.includes('·') && !f.c.startsWith('Revisi')))
  assert.deepEqual(d.kirim.exec.map((a) => a[0]), ['harian.py', 'penanganan.py'])
  assert.ok(d.kirim.exec[0].includes('12:00') && d.kirim.exec[1].includes('--operasi'))
  await d.jalan()
  assert.equal(d.kirim.file.length, 8); assert.equal(d.kirim.exec.length, 2)
  assert.equal(d.kirim.teks.length, 0)
})

test('revisi: bahan berubah -> bangun ulang, kirim ulang dengan awalan "Revisi: "', async () => {
  const d = dunia(LENGKAP)
  await d.jalan()
  LENGKAP.push(P('4', 'bmkg_pagi', 200, 'baru'))
  try { await d.jalan() } finally { LENGKAP.pop() }
  const baru = d.kirim.file.slice(8)
  assert.equal(baru.length, 8)
  assert.ok(baru.every((f) => f.c.startsWith('Revisi: ')))
})

test('belum cut-off atau bahan kurang: tidak membangun apa pun', async () => {
  const d = dunia(LENGKAP)
  await d.jalan({ now: wibKe(11) })
  assert.equal(d.kirim.exec.length, 0)
  const e = dunia(LENGKAP.slice(0, 2)) // satgas belum ada
  await e.jalan({ now: wibKe(20) })
  assert.deepEqual(e.kirim.exec.map((a) => a[0]), ['harian.py'])
})

test('galat generator: hanya PEMILIK dikabari, satu kali, penerima nol', async () => {
  const d = dunia(LENGKAP, { gagalGenerator: true })
  const h = await d.jalan()
  await d.jalan()
  assert.equal(d.kirim.file.length, 0)
  assert.ok(h.some((x) => x.status === 'galat'))
  assert.equal(d.kirim.teks.length, 2) // harian + penanganan, masing-masing sekali walau dijalankan dua kali
  assert.ok(d.kirim.teks.every((t) => t.t === '6299' && t.m.includes('bukan hari laporan')))
})

test('gateway mati saat kirim: galat ke PEMILIK saja, belum ditandai terkirim, lanjut kirim saat pulih', async () => {
  const d = dunia(LENGKAP, { gagalKirim: true })
  await d.jalan()
  assert.equal(d.kirim.file.length, 0)
  assert.ok(d.kirim.teks.every((t) => t.t === '6299'))
  const st = JSON.parse(fs.readFileSync(path.join(d.rumah, 'state.json'), 'utf8'))
  assert.ok(Object.values(st.laporan).every((e) => !e.selesai))
})

test('keluaran hilang: dianggap galat, tidak ada kiriman', async () => {
  const d = dunia(LENGKAP)
  await d.jalan({ ada: () => false })
  assert.equal(d.kirim.file.length, 0)
  assert.ok(d.kirim.teks.some((t) => t.m.includes('keluaran tidak ada')))
})

test('--kering: generator jalan tapi tidak ada /send-file, /send, atau state tersimpan', async () => {
  const d = dunia(LENGKAP)
  const h = await d.jalan({ kering: true })
  assert.equal(d.kirim.exec.length, 2)
  assert.equal(d.kirim.file.length, 0); assert.equal(d.kirim.teks.length, 0)
  assert.ok(h.every((x) => x.status === 'kering'))
  assert.equal(fs.existsSync(path.join(d.rumah, 'state.json')), false)
  const g = dunia(LENGKAP, { gagalGenerator: true })
  await g.jalan({ kering: true })
  assert.equal(g.kirim.teks.length, 0)
})

test('kunci: proses kedua ditolak selama yang pertama jalan', async () => {
  const d = dunia(LENGKAP)
  fs.writeFileSync(path.join(d.rumah, 'otomatis.lock'), '')
  const h = await d.jalan()
  assert.equal(h[0].status, 'masih ada proses lain'); assert.equal(d.kirim.exec.length, 0)
})

test('proses anak generator: PATH diawali WA_PY_BIN dan python3 dari sana', async () => {
  const d = dunia(LENGKAP)
  await d.jalan({ env: { PENERIMA: '6281', PEMILIK: '6299', WORKER_URL: 'http://w', WA_PY_BIN: '/opt/py/bin' } })
  assert.ok(d.kirim.opsi.env.PATH.startsWith('/opt/py/bin' + path.delimiter))
  assert.equal(d.kirim.cmd, '/opt/py/bin/python3')
  assert.equal(d.kirim.opsi.timeout, 600000)
})
