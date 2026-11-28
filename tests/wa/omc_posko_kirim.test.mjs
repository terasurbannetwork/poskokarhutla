import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { kirimOmcPosko } from '../../scripts/wa/omc_posko_kirim.mjs'

const teks = fs.readFileSync(new URL('./fixtures/omc_posko_251126.txt', import.meta.url), 'utf8')
const env = { WA_MESIN: 'k', WORKER_URL: 'http://x' }

test('POST dengan prov_kode 11 dan Bearer', async () => {
  let m
  const f = async (u, o) => { m = { u, o }; return { ok: true, status: 201 } }
  assert.equal(await kirimOmcPosko(teks, { env, fetch: f }), 'terkirim')
  assert.equal(m.u, 'http://x/api/operasi/omc-posko')
  assert.equal(m.o.headers.authorization, 'Bearer k')
  const b = JSON.parse(m.o.body)
  assert.equal(b.prov_kode, '11'); assert.equal(b.tanggal, '2026-11-25'); assert.equal(b.armada.length, 2)
})
test('503, galat jaringan, bukan OMC: tidak melempar', async () => {
  assert.equal(await kirimOmcPosko(teks, { env, fetch: async () => ({ ok: false, status: 503 }) }), 'http_503')
  assert.equal(await kirimOmcPosko(teks, { env, fetch: async () => { throw new Error('putus') } }), 'galat')
  let n = 0
  assert.equal(await kirimOmcPosko('halo', { env, fetch: async () => { n++ } }), 'lewat')
  assert.equal(await kirimOmcPosko(teks, { env: {}, fetch: async () => { n++ } }), 'lewat')
  assert.equal(n, 0)
})
