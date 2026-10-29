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

function dunia(pesan, { gagalGenerator, gagalKirim, gagalUnggah } = {}) {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-uji-'))
  const kirim = { file: [], teks: [], exec: [], unggah: [], urut: [], gagalUnggah }
  const dep = {
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ pesan }), text: async () => '' }),
    exec: async (cmd, args, o) => {
      kirim.exec.push(args); kirim.opsi = o; kirim.cmd = cmd
      if (gagalGenerator) throw Object.assign(new Error('x'), { stderr: 'baris1\nWA Koordalops s.d. bukan hari laporan' })
      const out = args[args.indexOf('--out') + 1]
      const lap = LAPORAN.find((l) => l.args(TGL, { rekap_koordalops_24: 'k', bmkg_pagi: 'b', satgas: 's' }, 'o')[0] === args[0])
      for (const x of ['pdf', 'pptx']) fs.writeFileSync(path.join(out, `${lap.berkas(TGL)}.${x}`), 'x')
    },
    unggah: async (a) => { kirim.urut.push('unggah'); if (kirim.gagalUnggah) throw new Error('HTTP 500'); kirim.unggah.push(a) },
    kirimFile: async (t, p, n, c) => { kirim.urut.push('wa'); if (gagalKirim) throw new Error('gateway down'); kirim.file.push({ t, n, c }) },
    kirimTeks: async (t, m) => { kirim.teks.push({ t, m }) },
  }
  const env = { PENERIMA: '6281,120@g.us', PEMILIK: '6299', WORKER_URL: 'http://w', WA_MESIN: 'k', LAPORAN_BANJIR: '0' }
  const jalan = (o = {}) => jalankan({ env, dep, kenali, rumah, log: () => {}, tanggalIsi: () => TGL, tanggal: TGL, now: wibKe(18), ...o })
  return { kirim, jalan, rumah, dep }
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

test('unggah /pelaporan: sebelum WA, bidang benar, revisi 0 lalu 1, sekali per bahan', async () => {
  const d = dunia(LENGKAP)
  await d.jalan()
  assert.equal(d.kirim.urut.indexOf('unggah') < d.kirim.urut.indexOf('wa'), true)
  assert.deepEqual(d.kirim.unggah.map((u) => [u.tanggal, u.laporan, u.revisi]), [[TGL, 'harian', 0], [TGL, 'penanganan', 0]])
  assert.ok(d.kirim.unggah[0].pptx.endsWith('.pptx') && d.kirim.unggah[0].pdf.endsWith('.pdf'))
  await d.jalan()
  assert.equal(d.kirim.unggah.length, 2)
  LENGKAP.push(P('4', 'bmkg_pagi', 200, 'baru'))
  try { await d.jalan() } finally { LENGKAP.pop() }
  assert.deepEqual(d.kirim.unggah.slice(2).map((u) => u.revisi), [1, 1])
})

test('unggah gagal: WA tetap terkirim, PEMILIK dikabari sekali, diulang jalan berikut tanpa membangun/kirim ulang', async () => {
  const d = dunia(LENGKAP, { gagalUnggah: true })
  await d.jalan()
  assert.equal(d.kirim.file.length, 8)
  await d.jalan() // masih gagal: tidak ada kabar kedua, tidak ada WA kedua
  assert.equal(d.kirim.file.length, 8)
  assert.equal(d.kirim.teks.length, 2); assert.ok(d.kirim.teks.every((t) => t.t === '6299' && t.m.includes('Unggah')))
  assert.equal(d.kirim.exec.length, 2)
  d.kirim.gagalUnggah = false
  await d.jalan()
  assert.equal(d.kirim.unggah.length, 2); assert.equal(d.kirim.file.length, 8); assert.equal(d.kirim.exec.length, 2)
})

test('--kering melewati unggah', async () => {
  const d = dunia(LENGKAP)
  await d.jalan({ kering: true })
  assert.equal(d.kirim.unggah.length, 0)
})

test('Google Drive sukses: link folder ditambahkan ke caption, unggah sekali per laporan, revisi berawalan', async () => {
  const d = dunia(LENGKAP); const n = []
  d.dep.unggahDrive = async (a) => { n.push(a); return 'https://drive.google.com/drive/folders/F' + n.length }
  await d.jalan(); await d.jalan()
  assert.equal(n.length, 2); assert.equal(n[0].tanggal, TGL); assert.equal(n[0].revisi, false)
  assert.deepEqual(n[0].berkas.map((b) => path.extname(b.p)), ['.pdf', '.pptx'])
  assert.equal(d.kirim.file.length, 8)
  assert.ok(d.kirim.file.every((f) => /\nhttps:\/\/drive\.google\.com\/drive\/folders\/F\d$/.test(f.c)))
})

test('Google Drive gagal: WA tetap terkirim tanpa link, PEMILIK dikabari sekali; --kering tidak mengunggah', async () => {
  const d = dunia(LENGKAP)
  d.dep.unggahDrive = async () => { throw new Error('Drive HTTP 500') }
  await d.jalan(); await d.jalan()
  assert.equal(d.kirim.file.length, 8); assert.ok(d.kirim.file.every((f) => !f.c.includes('http')))
  assert.equal(d.kirim.teks.filter((t) => t.m.includes('Google Drive')).length, 2) // harian + penanganan, masing-masing sekali
  assert.ok(d.kirim.teks.every((t) => t.t === '6299'))
  const k = dunia(LENGKAP); let dipanggil = 0
  k.dep.unggahDrive = async () => { dipanggil++ }
  await k.jalan({ kering: true }); assert.equal(dipanggil, 0)
})

test('tanggal isi: bahan lama (tanggal isi beda) diabaikan, tidak ada laporan yang dibuat', async () => {
  const d = dunia(LENGKAP)
  const log = []
  const r = await d.jalan({ tanggalIsi: (t, k) => (k === 'bmkg_pagi' ? '2026-10-27' : TGL), log: (...a) => log.push(a.join(' ')) })
  assert.equal(d.kirim.exec.length, 0); assert.equal(d.kirim.file.length, 0)
  assert.ok(r.every((x) => x.status === 'tunggu'))
  assert.ok(log.some((l) => l.includes('bahan bertanggal 2026-10-27, bukan 2026-10-29')))
})

test('tanggal isi: pesan lama terbaru dilewati, yang cocok tanggalnya dipakai; D-1 dan D+1 ikut dibaca', async () => {
  const urls = []
  const lama = P('9', 'bmkg_pagi', 999, 'LAMA'), baru = P('2', 'bmkg_pagi', 101, 'BARU')
  const d = dunia([...LENGKAP.filter((p) => p.id !== '2'), lama, baru])
  const asli = d.dep.fetch
  d.dep.fetch = async (u, o) => { urls.push(u); return asli(u, o) }
  await d.jalan({ tanggalIsi: (t) => (t.includes('LAMA') ? '2026-10-20' : TGL) })
  assert.deepEqual(urls.map((u) => u.split('=')[1]).sort(), ['2026-10-28', '2026-10-29', '2026-10-30'])
  assert.equal(d.kirim.file.length, 8)
  assert.ok(!fs.readFileSync(path.join(d.rumah, 'kerja', TGL, 'harian', 'bmkg_pagi.txt'), 'utf8').includes('LAMA'))
})

// ---- banjir ----
import { susun } from '../../scripts/wa/peringatan_banjir.mjs'
const PL = (dibuat, a = 0.3) => ({ versi: 'peluang/1', anggota: 51, dibuat, wilayah: {
  '11|A': { nama: 'Aceh Barat, Aceh', tingkat: 'kabupaten', hari: [{ t: '2026-10-30', p: [a, 0.12] }, { t: '2026-10-31', p: [0.05, 0] }] },
  '11': { nama: 'Aceh', tingkat: 'provinsi', hari: [{ t: '2026-10-30', p: [0.9, 0.9] }] } } })

test('peringatan banjir: hanya kabupaten di atas 10%, angka apa adanya, tanpa titik tengah', () => {
  const t = susun(PL('2026-10-29T01:00:00+00:00'), TGL)
  assert.match(t, /Jumat, 30 Oktober 2026\n- Aceh Barat, Aceh: 30% hujan 50 mm atau lebih \(mungkin\), 12% hujan 100/)
  assert.ok(!t.includes('Aceh: 90%') && !t.includes('·') && /Sumber: ECMWF/.test(t))
  assert.equal(susun(PL('2026-10-29T01:00:00+00:00', 0.02), TGL), null)
})

test('peringatan banjir: MATI tanpa penerima; kirim sekali ke penerima khusus; peluang basi menunggu', async () => {
  const peluang = PL('2026-10-29T01:00:00+00:00')
  const d = dunia([])
  const dep = { ...d.dep, fetch: async (u) => u.includes('peluang.json') ? { ok: true, json: async () => peluang } : { ok: true, json: async () => ({ pesan: [] }) } }
  const env = (x) => ({ PENERIMA: '6281', PEMILIK: '6299', WORKER_URL: 'http://w', WA_MESIN: 'k', LAPORAN_BANJIR: '0', ...x })
  const mati = await jalankan({ env: env({}), dep, kenali, rumah: d.rumah, log: () => {}, tanggalIsi: () => TGL, tanggal: TGL, now: wibKe(8) })
  assert.ok(!mati.some((x) => x.id === 'peringatan_banjir')); assert.equal(d.kirim.teks.length, 0)
  const e = env({ PENERIMA_PERINGATAN_BANJIR: '6277,6278' })
  await jalankan({ env: e, dep, kenali, rumah: d.rumah, log: () => {}, tanggalIsi: () => TGL, tanggal: TGL, now: wibKe(8) })
  assert.deepEqual(d.kirim.teks.map((x) => x.t), ['6277', '6278'])
  await jalankan({ env: e, dep, kenali, rumah: d.rumah, log: () => {}, tanggalIsi: () => TGL, tanggal: TGL, now: wibKe(9) })
  assert.equal(d.kirim.teks.length, 2)                                        // sekali per tanggal
  const d2 = dunia([]); peluang.dibuat = '2026-10-19T01:00:00+00:00'
  const h = await jalankan({ env: e, dep: { ...d2.dep, fetch: dep.fetch }, kenali, rumah: d2.rumah, log: () => {}, tanggalIsi: () => TGL, tanggal: TGL, now: wibKe(8) })
  assert.equal(h.find((x) => x.id === 'peringatan_banjir').status, 'tunggu'); assert.equal(d2.kirim.teks.length, 0)
})

test('laporan banjir: butuh tanpa bahan WA, jalan sesudah 17.00, tidak diunggah ke /pelaporan, ke PENERIMA', async () => {
  const d = dunia([])
  const exec = async (cmd, args) => { d.kirim.exec.push(args); const out = args[args.indexOf('--out') + 1]; for (const x of ['pdf', 'pptx']) fs.writeFileSync(path.join(out, `Laporan Penanganan Banjir Longsor dan Rob 291026.${x}`), 'x') }
  const dep = { ...d.dep, exec }
  const env = { PENERIMA: '6281', PEMILIK: '6299', WORKER_URL: 'http://w', WA_MESIN: 'k' }
  const o = { env, dep, kenali, rumah: d.rumah, log: () => {}, tanggalIsi: () => TGL, tanggal: TGL }
  assert.equal((await jalankan({ ...o, now: wibKe(16) })).find((x) => x.id === 'penanganan_banjir').status, 'tunggu')
  await jalankan({ ...o, now: wibKe(18) })
  assert.deepEqual(d.kirim.exec.map((a) => a[0]), ['penanganan_banjir.py']); assert.equal(d.kirim.file.length, 2); assert.equal(d.kirim.unggah.length, 0)
  await jalankan({ ...o, now: wibKe(19) })
  assert.equal(d.kirim.file.length, 2)
})
