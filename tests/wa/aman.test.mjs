import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { jalankan } from '../../scripts/wa/otomatis.mjs'
const { samaAman, idAman, idSah, jalurKeluaran, mimeBoleh, ukuranBerkas, buatTerlihat, susulanBaru } = createRequire(import.meta.url)('../../scripts/wa/aman.cjs')

test('idAman: id berbahaya jadi alfanumerik maks 12; id outbox tak sah ditolak', () => {
  const id = idAman('../../etc/passwd\0/x')
  assert.match(id, /^[A-Za-z0-9]{1,12}$/)
  assert.match(idAman(''), /^[A-Za-z0-9]+$/)
  assert.ok(idSah(`${Date.now()}-${id}`))
  for (const jahat of ['../x', '1-../a', 'abc', '1-a/b', '1-a.json', '']) assert.equal(idSah(jahat), false, jahat)
})

test('jalurKeluaran: hanya berkas biasa di keluaran; symlink ke luar, auth, direktori, ../ ditolak', () => {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-aman-'))
  const kel = path.join(r, 'keluaran'), auth = path.join(r, 'auth')
  fs.mkdirSync(path.join(kel, '2026'), { recursive: true }); fs.mkdirSync(auth)
  fs.writeFileSync(path.join(kel, '2026', 'a.pdf'), 'x'); fs.writeFileSync(path.join(auth, 'creds.json'), 's')
  fs.symlinkSync(path.join(auth, 'creds.json'), path.join(kel, 'tautan.pdf'))
  assert.equal(jalurKeluaran(path.join(kel, '2026', 'a.pdf'), kel), fs.realpathSync(path.join(kel, '2026', 'a.pdf')))
  for (const p of [path.join(auth, 'creds.json'), path.join(kel, 'tautan.pdf'), path.join(kel, '2026'), path.join(kel, '..', 'auth', 'creds.json'), path.join(kel, 'nihil')])
    assert.equal(jalurKeluaran(p, kel), null, p)
})

test('samaAman, mimeBoleh, ukuranBerkas', () => {
  assert.ok(samaAman('abc', 'abc')); assert.ok(!samaAman('abc', 'abd')); assert.ok(!samaAman('', '')); assert.ok(!samaAman(undefined, 'x'))
  assert.ok(mimeBoleh('image/jpeg') && mimeBoleh('application/pdf') && mimeBoleh('text/csv; charset=utf-8'))
  assert.ok(!mimeBoleh('application/x-msdownload') && !mimeBoleh('text/html') && !mimeBoleh(''))
  assert.equal(ukuranBerkas({ toString: () => '1000' }, 2000), 1000)
  assert.equal(ukuranBerkas(undefined, 2000), null); assert.equal(ukuranBerkas(3000, 2000), null); assert.equal(ukuranBerkas('x', 2000), null)
})

test('--tanggal tidak sah ditolak sebelum menyentuh jaringan', async () => {
  let dipanggil = false
  const dep = { fetch: async () => { dipanggil = true } }
  for (const t of ['2026-10-29&x=1', '../a', '29-10-2026'])
    await assert.rejects(() => jalankan({ tanggal: t, dep, env: {}, rumah: fs.mkdtempSync(path.join(os.tmpdir(), 'wa-t-')), log: () => {} }), /YYYY-MM-DD/)
  assert.equal(dipanggil, false)
})

test('buatTerlihat: id bertahan lewat restart, tercap 5000 (dibuang yang tertua), berkas 0600', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tl-')), 'terlihat.json')
  const a = buatTerlihat(f, 3)
  for (const id of ['a', 'b', 'c', 'd']) a.catat(id)
  const b = buatTerlihat(f, 3)
  assert.equal(b.ada('a'), false); assert.ok(['b', 'c', 'd'].every((i) => b.ada(i)))
  assert.equal(fs.statSync(f).mode & 0o777, 0o600)
})

test('susulanBaru: hanya <= 24 jam; Long/string diterima, sampah ditolak', () => {
  const now = Date.now(), dtk = (jam) => Math.floor((now - jam * 3600e3) / 1000)
  assert.equal(susulanBaru(dtk(2), now), true)
  assert.equal(susulanBaru({ toString: () => String(dtk(23)) }, now), true)
  assert.equal(susulanBaru(dtk(25), now), false)
  assert.equal(susulanBaru(undefined, now), false)
})
