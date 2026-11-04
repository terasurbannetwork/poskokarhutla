// Uji pemicu renlap: jam, idempoten, mati tanpa RENLAP, galat hanya ke PEMILIK. Tanpa jaringan/python/WA.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { jalankan } from '../../scripts/wa/otomatis.mjs'
import { jatuhTempo } from '../../scripts/wa/renlap_jam.mjs'

const TGL = '2026-11-02'
const wibKe = (jam) => new Date(Date.parse(`${TGL}T00:00:00Z`) + (jam - 7) * 3600e3)

function dunia(env = {}, { gagal } = {}) {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-renlap-'))
  const k = { exec: [], teks: [], file: [], fetch: 0 }
  const dep = {
    fetch: async () => { k.fetch++; return { ok: true, status: 200, json: async () => ({ pesan: [] }), text: async () => '' } },
    exec: async (cmd, args, o) => { k.exec.push({ args, o }); if (gagal) throw Object.assign(new Error('x'), { stderr: 'baris\nWorker menolak 401' }) },
    kirimTeks: async (t, m) => { k.teks.push({ t, m }) },
    kirimFile: async (t) => { k.file.push(t) },
  }
  const e = { PENERIMA: '6281,120@g.us', PEMILIK: '6299', WORKER_URL: 'http://w', WA_MESIN: 'k', LAPORAN_BANJIR: '0', ...env }
  const jalan = (jam) => jalankan({ env: e, dep, rumah, log: () => {}, kenali: () => null, tanggalIsi: () => TGL, now: wibKe(jam) })
  return { k, jalan }
}

test('jam pemicu: pagi 07.00-12.00, malam 20.00-24.00', () => {
  const v = (j) => jatuhTempo(j).map((x) => x.versi)
  assert.deepEqual(v(6.9), []); assert.deepEqual(v(7), ['pagi']); assert.deepEqual(v(11.9), ['pagi']); assert.deepEqual(v(12), [])
  assert.deepEqual(v(19.9), []); assert.deepEqual(v(20), ['malam']); assert.deepEqual(v(23.5), ['malam'])
})

test('mati tanpa RENLAP=1', async () => {
  const d = dunia()
  await d.jalan(20.5); await d.jalan(7.1)
  assert.equal(d.k.exec.length, 0)
})

test('pagi 07.00 jalan, argumen benar, tanpa kirim ke penerima', async () => {
  const d = dunia({ RENLAP: '1' })
  const h = await d.jalan(7.1)
  assert.equal(h[0].id, 'renlap:pagi')
  assert.deepEqual(d.k.exec[0].args, ['scripts/operasi/renlap.py', 'buat', '--versi', 'pagi', '--kirim-api'])
  assert.equal(d.k.exec[0].o.env.WORKER, 'http://w'); assert.equal(d.k.exec[0].o.env.WA_MESIN, 'k')
  assert.equal(d.k.file.length, 0); assert.equal(d.k.teks.length, 0)
})

test('idempoten: dua kali jam yang sama = sekali; malam dan pagi masing-masing sekali sehari', async () => {
  const d = dunia({ RENLAP: '1' })
  await d.jalan(7.1); await d.jalan(7.3)
  assert.equal(d.k.exec.length, 1)
  await d.jalan(20.1); await d.jalan(20.3); await d.jalan(21)
  assert.equal(d.k.exec.length, 2)
  assert.equal(d.k.exec[1].args[3], 'malam')
  assert.equal(d.k.teks.length, 0)                 // laporan harian/penanganan tidak ikut terkirim tanpa bahan
})

test('galat: kabar ke PEMILIK saja, sekali per versi per hari, dicoba lagi tanpa kabar ulang', async () => {
  const d = dunia({ RENLAP: '1' }, { gagal: true })
  const h = await d.jalan(20.1); await d.jalan(20.3)
  assert.equal(h[0].status, 'galat')
  assert.equal(d.k.exec.length, 2)                 // dicoba lagi
  const renlap = d.k.teks.filter((x) => /renlap/.test(x.m))
  assert.equal(renlap.length, 1); assert.equal(renlap[0].t, '6299')
  assert.ok(renlap[0].m.includes('Worker menolak 401'))
  assert.ok(d.k.teks.every((x) => x.t === '6299')); assert.equal(d.k.file.length, 0)
})
