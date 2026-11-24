// Perintah `infografis <periode>`: parser nyata, router proyek.tangani nyata, skrip Python di-stub lewat dep.exec.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parsePerintah, tangani } from '../../scripts/wa/proyek.mjs'
import { periodeInfografis } from '../../scripts/wa/infografis.mjs'

test('periodeInfografis: tahun, bulan, triwulan sah; selebihnya null', () => {
  assert.equal(periodeInfografis('2025'), '2025')
  assert.equal(periodeInfografis('2026-10'), '2026-10')
  assert.equal(periodeInfografis('2026-t3'), '2026-T3')
  for (const x of ['', 'x', '2026-13', '2026-00', '2026-t5', '1999', '2026-10; rm -rf /', '../2025', '2026-1', '20250']) assert.equal(periodeInfografis(x), null, x)
})

test('parsePerintah: infografis', () => {
  assert.deepEqual(parsePerintah('infografis 2025'), { aksi: 'infografis', periode: '2025' })
  assert.deepEqual(parsePerintah('Infografis 2026-T3!'), { aksi: 'infografis', periode: '2026-T3' })
  assert.deepEqual(parsePerintah('infografis 2026-10'), { aksi: 'infografis', periode: '2026-10' })
  assert.deepEqual(parsePerintah('infografis'), { aksi: 'infografis', periode: null })
  assert.deepEqual(parsePerintah('infografis bulan lalu'), { aksi: 'infografis', periode: null })
  assert.equal(parsePerintah('infografisnya bagus'), null)
})

function ctxUji({ terdaftar, exec }) {
  const dasar = fs.mkdtempSync(path.join(os.tmpdir(), 'ig-'))
  const balasan = [], berkas = [], panggil = []
  return {
    balasan, berkas, panggil, dasar,
    ctx: {
      env: { WA_GARAM: 'g', WA_IZIN: '628111', PEMILIK: '628111' }, dasar, now: new Date('2026-11-24T03:00:00Z'), log() {},
      ...(terdaftar ? { terdaftar } : {}),
      dep: { exec: async (c, a, o) => { panggil.push({ c, a, o }); return exec(a, dasar) } },
      balas: async (t) => { balasan.push(t) }, balasFile: async (p, n, cap, mime) => { berkas.push({ p, n, mime, ada: fs.existsSync(p) }) },
    },
  }
}
const tulisKeluaran = (a) => { const d = a[a.indexOf('--keluar') + 1]; fs.writeFileSync(path.join(d, 'Bencana Indonesia 2025.pptx'), 'x'); fs.writeFileSync(path.join(d, 'Bencana Indonesia 2025.pdf'), 'x') }

test('nomor terdaftar: skrip dipanggil tanpa shell, pptx dan pdf dikirim ke pengirim saja', async () => {
  const u = ctxUji({ exec: (a) => { tulisKeluaran(a); return {} } })
  const r = await tangani({ dari: '628111', teks: 'infografis 2025' }, u.ctx)
  assert.equal(r.status, 'infografis')
  assert.equal(u.panggil.length, 1)
  assert.ok(Array.isArray(u.panggil[0].a) && u.panggil[0].a[1] === '2025' && u.panggil[0].a[2] === '--keluar')
  assert.ok(u.panggil[0].o.timeout > 0)
  assert.deepEqual(u.berkas.map((b) => b.n).sort(), ['Bencana Indonesia 2025.pdf', 'Bencana Indonesia 2025.pptx'])
  assert.ok(u.berkas.every((b) => b.ada && b.p.startsWith(path.join(u.dasar, 'keluaran'))))
})

test('nomor tidak terdaftar ditolak: skrip tidak jalan, tidak ada berkas', async () => {
  const u = ctxUji({ exec: () => assert.fail('tidak boleh jalan') })
  const r = await tangani({ dari: '628999', teks: 'infografis 2025' }, u.ctx)
  assert.equal(r.status, 'infografis ditolak')
  assert.equal(u.panggil.length, 0); assert.equal(u.berkas.length, 0)
  assert.match(u.balasan[0], /belum terdaftar/)
})

test('daftar gateway (ctx.terdaftar) menentukan, bukan WA_IZIN', async () => {
  const u = ctxUji({ terdaftar: (n) => n === '628222', exec: (a) => { tulisKeluaran(a); return {} } })
  assert.equal((await tangani({ dari: '628111', teks: 'infografis 2025' }, u.ctx)).status, 'infografis ditolak')
  assert.equal((await tangani({ dari: '628222', teks: 'infografis 2025' }, u.ctx)).status, 'infografis')
})

test('periode tidak sah: dibalas contoh, skrip tidak jalan', async () => {
  const u = ctxUji({ exec: () => assert.fail('tidak boleh jalan') })
  const r = await tangani({ dari: '628111', teks: 'infografis 2026-13' }, u.ctx)
  assert.equal(r.status, 'infografis periode'); assert.match(u.balasan[0], /infografis 2026-T3/)
})

test('periode berjalan ditolak skrip: pesan ramah, tidak ada berkas', async () => {
  const u = ctxUji({ exec: () => { const e = new Error('gagal'); e.stderr = 'Nov 2026 belum genap pada tanggal potong data 2026-11-20; infografis hanya dibuat untuk bulan atau triwulan yang sudah lewat\n'; throw e } })
  const r = await tangani({ dari: '628111', teks: 'infografis 2026-11' }, u.ctx)
  assert.equal(r.status, 'infografis ditolak skrip'); assert.equal(u.berkas.length, 0)
  assert.match(u.balasan.at(-1), /belum genap/)
})

test('galat tak dikenal: pengirim dapat pesan umum tanpa jejak tumpukan', async () => {
  const u = ctxUji({ exec: () => { const e = new Error('x'); e.stderr = 'Traceback\nKeyError: rahasia\n'; throw e } })
  const r = await tangani({ dari: '628111', teks: 'infografis 2025' }, u.ctx)
  assert.equal(r.status, 'infografis gagal'); assert.doesNotMatch(u.balasan.at(-1), /KeyError|Traceback/)
})
