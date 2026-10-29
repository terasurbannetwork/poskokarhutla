// Uji perintah WA tanpa jaringan, python, atau WhatsApp: fetch/exec/balasan disuntik.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse, cegat, tangani, BANTUAN } from '../../scripts/wa/perintah.mjs'
import { LAPORAN } from '../../scripts/wa/otomatis.mjs'

const NOW = new Date('2026-10-29T03:00:00Z') // 10.00 WIB
const wibKe = (jam, tgl = '2026-10-29') => new Date(Date.parse(`${tgl}T00:00:00Z`) + (jam - 7) * 3600e3)
const kenali = (teks) => (teks.match(/^\[(\w+)\]/) || [])[1] || null
const P = (id, kunci, isi, tgl) => ({ id, diterima: Number(id), teks: `[${kunci}] ${tgl}`, nama_berkas: '' })
const tanggalIsi = (t) => t.split('] ')[1]

test('parse: semua bentuk tanggal dan perintah', () => {
  const p = (t) => parse(t, NOW)
  assert.deepEqual(p('buat harian'), { aksi: 'buat', laporan: 'harian', tanggal: '2026-10-29' })
  assert.deepEqual(p('Buat Harian HARI INI'), { aksi: 'buat', laporan: 'harian', tanggal: '2026-10-29' })
  assert.equal(p('buat penanganan kemarin').tanggal, '2026-10-28')
  assert.equal(p('buat harian 26 okt').tanggal, '2026-10-26')
  assert.equal(p('buat harian 26 Oktober').tanggal, '2026-10-26')
  assert.equal(p('buat harian 26/10').tanggal, '2026-10-26')
  assert.equal(p('buat harian 2026-10-26').tanggal, '2026-10-26')
  assert.equal(p('buat harian 26 okt 2025').tanggal, '2025-10-26')
  assert.deepEqual(p('kirim ulang penanganan 26 okt'), { aksi: 'kirim_ulang', laporan: 'penanganan', tanggal: '2026-10-26' })
  assert.deepEqual(p('status'), { aksi: 'status', tanggal: '2026-10-29' })
  assert.equal(p('status 1 nov').tanggal, '2026-11-01')
  assert.deepEqual(p('bantuan'), { aksi: 'bantuan' })
  // tak dikenal tapi berawalan buat/kirim/status -> bantuan; tanggal ngawur -> bantuan
  for (const t of ['buat', 'buat mingguan', 'kirim', 'kirim harian', 'buat harian 31/02', 'buat harian besok', 'status kapan']) assert.deepEqual(p(t), { aksi: 'bantuan' }, t)
  // bahan biasa bukan perintah
  assert.equal(p('halo'), null)
  assert.equal(p('Statusnya aman'), null)
  assert.equal(p('status\nLaporan harian ...'), null)
  assert.equal(p('status ' + 'x'.repeat(80)), null)
})

test('cegat: hanya nomor PEMILIK (dinormalkan), selain itu bahan biasa', () => {
  const pemilik = '08123, +62 899-000'
  assert.equal(cegat({ dari: '628123', teks: 'status', pemilik, now: NOW }).aksi, 'status')
  assert.equal(cegat({ dari: '62899000', teks: 'bantuan', pemilik, now: NOW }).aksi, 'bantuan')
  assert.equal(cegat({ dari: '6281999', teks: 'status', pemilik, now: NOW }), null)   // anggota WA_IZIN biasa
  assert.equal(cegat({ dari: null, teks: 'status', pemilik, now: NOW }), null)
  assert.equal(cegat({ dari: '628123', teks: 'bahan biasa', pemilik, now: NOW }), null)
})

function dunia({ pesan = [], now = NOW, rekap, gagalGenerator } = {}) {
  const dasar = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-perintah-'))
  const balasan = [], berkas = [], exec = [], fetchUrl = []
  const dep = {
    fetch: async (u) => {
      fetchUrl.push(u)
      if (u.includes('/api/wa/rekap')) return { ok: true, json: async () => rekap }
      return { ok: true, json: async () => ({ pesan }), text: async () => '' }
    },
    exec: async (cmd, args) => {
      exec.push(args)
      if (gagalGenerator) throw Object.assign(new Error('x'), { stderr: 'meledak' })
      const out = args[args.indexOf('--out') + 1], tgl = args[args.indexOf('--tanggal') + 1]
      const lap = LAPORAN.find((l) => l.args(tgl, { rekap_koordalops_24: 'k', bmkg_pagi: 'b', satgas: 's' }, 'o')[0] === args[0])
      for (const x of ['pdf', 'pptx']) fs.writeFileSync(path.join(out, `${lap.berkas(tgl)}.${x}`), 'x')
    },
    kirimFile: async () => { throw new Error('tidak boleh ke penerima') },
    kirimTeks: async () => { throw new Error('tidak boleh lewat dep') },
    unggah: async () => { throw new Error('tidak boleh unggah') },
    unggahDrive: async () => { throw new Error('tidak boleh ke drive') },
  }
  const ctx = { env: { WORKER_URL: 'http://w', WA_MESIN: 'k', PENERIMA: '6281' }, dep, now, dasar, kenali, tanggalIsi, log: () => {},
    balas: async (t) => { balasan.push(t) }, balasFile: async (p, n, c, m) => { berkas.push({ p, n, c, m }) } }
  return { ctx, balasan, berkas, exec, dasar, fetchUrl }
}
const LENGKAP = (tgl) => [P('1', 'rekap_koordalops_24', 0, tgl), P('2', 'bmkg_pagi', 0, tgl), P('3', 'satgas', 0, tgl)]

test('buat hari lampau: abaikan cut-off, kirim PPTX dan PDF hanya ke peminta, state dan unggah tak disentuh', async () => {
  const d = dunia({ pesan: LENGKAP('2026-10-26'), now: wibKe(1) })
  await tangani(parse('buat harian 26 okt', d.ctx.now), d.ctx)
  assert.equal(d.exec.length, 1); assert.equal(d.exec[0][0], 'harian.py')
  assert.deepEqual(d.berkas.map((b) => path.extname(b.n)).sort(), ['.pdf', '.pptx'])
  assert.ok(d.berkas.every((b) => b.c === 'Laporan Kejadian Bencana Harian 2026-10-26 (permintaan, belum dikirim ke penerima)'))
  assert.equal(fs.existsSync(path.join(d.dasar, 'state.json')), false)
  assert.equal(fs.existsSync(path.join(d.dasar, 'otomatis.lock')), false) // kunci dilepas
})

test('buat hari ini sebelum cut-off: menunggu dengan alasan, generator tak jalan', async () => {
  const d = dunia({ pesan: LENGKAP('2026-10-29'), now: wibKe(10) })
  await tangani(parse('buat harian', d.ctx.now), d.ctx)
  assert.equal(d.exec.length, 0); assert.equal(d.berkas.length, 0)
  assert.match(d.balasan.join('\n'), /menunggu: belum cut-off 12\.00 WIB/)
})

test('buat dengan bahan kurang: sebut jenis yang kurang dan tanggal bahan yang ada', async () => {
  const d = dunia({ pesan: [P('1', 'rekap_koordalops_24', 0, '2026-10-26'), P('2', 'bmkg_pagi', 0, '2026-10-25')], now: wibKe(1) })
  await tangani(parse('buat harian 26 okt', d.ctx.now), d.ctx)
  assert.equal(d.exec.length, 0)
  const b = d.balasan.join('\n')
  assert.match(b, /Rekap Koordalops 24 jam: ada, bertanggal 26 Okt/)
  assert.match(b, /BMKG pagi: belum untuk 26 Okt, yang ada bertanggal 25 Okt/)
})

test('generator gagal: galat hanya ke peminta, tanpa berkas', async () => {
  const d = dunia({ pesan: LENGKAP('2026-10-26'), now: wibKe(1), gagalGenerator: true })
  await tangani(parse('buat harian 26 okt', d.ctx.now), d.ctx)
  assert.equal(d.berkas.length, 0); assert.match(d.balasan.at(-1), /Perintah gagal: generator gagal/)
})

test('kirim ulang: ada keluaran dikirim ke peminta, tidak ada dibalas tiada', async () => {
  const d = dunia()
  const tgl = '2026-10-26', lap = LAPORAN[1]
  await tangani(parse('kirim ulang penanganan 26 okt', NOW), d.ctx)
  assert.match(d.balasan.at(-1), /Belum ada keluaran/); assert.equal(d.berkas.length, 0)
  const out = path.join(d.dasar, 'keluaran', tgl); fs.mkdirSync(out, { recursive: true })
  for (const x of ['pdf', 'pptx']) fs.writeFileSync(path.join(out, `${lap.berkas(tgl)}.${x}`), 'x')
  await tangani(parse('kirim ulang penanganan 26 okt', NOW), d.ctx)
  assert.equal(d.berkas.length, 2); assert.equal(d.exec.length, 0)
})

test('status: hitung dari rekap, sebut yang belum, dan status kirim hari ini dari state', async () => {
  const jenis = [{ kunci: 'a', label: 'Aa', wajib: true }, { kunci: 'b', label: 'Bb', wajib: true }, { kunci: 'c', label: 'Cc', wajib: false }]
  const d = dunia({ rekap: { jenis, per: [{ tanggal: '2026-10-26', isi: { a: { n: 1 } } }] } })
  fs.writeFileSync(path.join(d.dasar, 'state.json'), JSON.stringify({ laporan: { 'harian:2026-10-29': { selesai: true } } }))
  await tangani(parse('status 26 okt', NOW), d.ctx)
  assert.match(d.fetchUrl[0], /\/api\/wa\/rekap\?sampai=2026-10-26&hari=1/)
  assert.equal(d.balasan[0], '1 dari 2 laporan wajib masuk untuk 26 Okt. Belum: Bb.\nHari ini (29 Okt) laporan harian sudah dikirim ke penerima, penanganan belum.')
})

test('bantuan dan sibuk: daftar perintah; perintah kedua saat sibuk ditolak', async () => {
  const d = dunia({ pesan: LENGKAP('2026-10-26'), now: wibKe(1) })
  await tangani({ aksi: 'bantuan' }, d.ctx)
  assert.equal(d.balasan[0], BANTUAN)
  let lepas; const tahan = new Promise((r) => { lepas = r })
  d.ctx.dep.exec = async () => { await tahan }
  const pertama = tangani(parse('buat harian 26 okt', d.ctx.now), d.ctx)
  await new Promise((r) => setTimeout(r, 30))
  const d2 = dunia(); await tangani(parse('status', NOW), d2.ctx)
  assert.equal(d2.balasan[0], 'Sedang membuat laporan, tunggu sebentar.')
  lepas(); await pertama
})
