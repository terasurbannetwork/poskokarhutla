import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { buat } from '../../scripts/wa/lapangan_tarik.mjs'

// Server tiruan lokal: kunci benar = 'kunci-ok'.
async function server(antre, opsi = {}) {
  const lapor = []; const st = { antre: 0, status: opsi.status }
  const srv = http.createServer((req, res) => {
    if (req.headers['x-wa-kunci'] !== 'kunci-ok') { res.writeHead(401); return res.end('{}') }
    if (st.status) { res.writeHead(st.status); return res.end('{}') }
    if (req.url === '/api/petugas/wa/antre') { st.antre++; res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ ok: true, pesan: antre })) }
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      if (opsi.hasil503) { res.writeHead(503); return res.end('{}') }
      lapor.push(JSON.parse(b)); res.end('{"ok":true}')
    })
  })
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  return { url: 'http://127.0.0.1:' + srv.address().port, lapor, st, tutup: () => { srv.close(); srv.closeAllConnections() } }
}

test('tarik, kirim satu per satu, lapor berkelompok, tidak kirim ulang', async () => {
  const s = await server([{ id: 1, tujuan: '0812345678', pesan: 'a' }, { id: 2, tujuan: '+62 813 999', pesan: 'b' }])
  const kirim = []
  const t = buat({ worker: s.url, kunci: 'kunci-ok', kirim: async (n, p) => { kirim.push([n, p]); return { ok: true } } })
  await t.putaran(); await t.putaran() // server menarik ulang id yang sama
  assert.deepEqual(kirim, [['62812345678', 'a'], ['62813999', 'b']])
  assert.equal(s.lapor.length, 1)
  assert.deepEqual(s.lapor[0].hasil, [{ id: 1, ok: true }, { id: 2, ok: true }])
  s.tutup()
})

test('DITOLAK: kunci salah (401) tidak memicu kirim', async () => {
  const s = await server([{ id: 1, tujuan: '0812345678', pesan: 'a' }])
  let n = 0
  const t = buat({ worker: s.url, kunci: 'salah', kirim: async () => { n++; return { ok: true } } })
  await t.putaran()
  assert.equal(n, 0); assert.equal(s.st.antre, 0); assert.equal(s.lapor.length, 0)
  s.tutup()
})

test('DITOLAK: nomor tidak sah dilewati dan dilapor gagal', async () => {
  const s = await server([{ id: 7, tujuan: 'abc', pesan: 'x' }, { id: 8, tujuan: '0811111', pesan: 'y' }])
  const kirim = []
  const t = buat({ worker: s.url, kunci: 'kunci-ok', kirim: async (n) => { kirim.push(n); return { ok: false, galat: 'nomor tidak terdaftar' } } })
  await t.putaran()
  assert.deepEqual(kirim, ['62811111'])
  assert.deepEqual(s.lapor[0].hasil.map((h) => [h.id, h.ok]), [[7, false], [8, false]])
  assert.match(s.lapor[0].hasil[1].galat, /tidak terdaftar/)
  s.tutup()
})

test('503 antre dan jaringan putus tidak crash; limiter menunda tanpa lapor', async () => {
  const s = await server([{ id: 1, tujuan: '0811', pesan: 'a' }], { status: 503 })
  const t = buat({ worker: s.url, kunci: 'kunci-ok', kirim: async () => ({ ok: true }) })
  await t.putaran() // 503
  s.tutup()
  await t.putaran() // koneksi ditolak
  const s2 = await server([{ id: 1, tujuan: '0811', pesan: 'a' }])
  const t2 = buat({ worker: s2.url, kunci: 'kunci-ok', kirim: async () => ({ tunda: true }) })
  await t2.putaran()
  assert.equal(s2.lapor.length, 0)
  s2.tutup()
})

test('lapor gagal (503) disimpan dan dilapor putaran berikut tanpa kirim ulang', async () => {
  const s = await server([{ id: 1, tujuan: '0811', pesan: 'a' }], { hasil503: true })
  let n = 0
  const t = buat({ worker: s.url, kunci: 'kunci-ok', kirim: async () => { n++; return { ok: true } } })
  await t.putaran()
  assert.equal(t.tertunda.size, 1)
  const s2 = await server([{ id: 1, tujuan: '0811', pesan: 'a' }])
  const t2 = buat({ worker: s2.url, kunci: 'kunci-ok', kirim: async () => { n++; return { ok: true } } })
  t2.tertunda.set(1, { id: 1, ok: true })
  await t2.putaran()
  await t2.putaran()
  assert.equal(n, 1); assert.equal(s2.lapor.length, 1)
  s.tutup(); s2.tutup()
})
