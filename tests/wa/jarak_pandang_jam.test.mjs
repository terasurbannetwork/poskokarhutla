// Uji pemicu jarak pandang: jendela jam, sekali per jam, mati tanpa env, NOAA tidak dikirim, galat hanya ke PEMILIK sekali sehari.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { jalankan } from '../../scripts/wa/otomatis.mjs'
import { diJendela } from '../../scripts/wa/jarak_pandang_jam.mjs'

const TGL = '2026-11-02'
const wibKe = (jam) => new Date(Date.parse(`${TGL}T00:00:00Z`) + (jam - 7) * 3600e3)

function dunia(env = {}, { sumber = 'BMKG Aviation (x)', gagal, tolak } = {}) {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-jp-'))
  const k = { exec: [], teks: [], post: [] }
  const dep = {
    fetch: async (u, o) => {
      if (u.endsWith('/api/jarak-pandang')) { k.post.push({ u, o }); return { ok: !tolak, status: tolak ? 403 : 201 } }
      return { ok: true, status: 200, json: async () => ({ pesan: [] }), text: async () => '' }
    },
    exec: async (cmd, args) => { k.exec.push({ cmd, args }); if (gagal && args[0].endsWith('metar.py')) throw Object.assign(new Error('x'), { stderr: 'baris\nBMKG 403' }) },
    baca: () => JSON.stringify({ sumber, stasiun: [] }),
    kirimTeks: async (t, m) => { k.teks.push({ t, m }) },
    kirimFile: async () => {},
  }
  const e = { PENERIMA: '6281', PEMILIK: '6299', WORKER_URL: 'http://w', WA_MESIN: 'k', LAPORAN_BANJIR: '0', JARAK_PANDANG: '1', ...env }
  const jalan = (jam) => jalankan({ env: e, dep, rumah, log: () => {}, kenali: () => null, tanggalIsi: () => TGL, now: wibKe(jam) })
  return { k, jalan }
}
const metar = (k) => k.exec.filter((x) => x.args[0].endsWith('metar.py'))

test('jendela 05.00-18.59 WIB', () => {
  assert.equal(diJendela(4.9), false); assert.equal(diJendela(5), true); assert.equal(diJendela(18.9), true); assert.equal(diJendela(19), false)
})

test('mati tanpa JARAK_PANDANG=1', async () => {
  const d = dunia({ JARAK_PANDANG: '' }); await d.jalan(10)
  assert.equal(d.k.exec.length, 0); assert.equal(d.k.post.length, 0)
})

test('05.10 di luar 06-23 tetap jalan; 19.30 tidak', async () => {
  const d = dunia(); await d.jalan(5.2); await d.jalan(19.5)
  assert.equal(metar(d.k).length, 1); assert.equal(d.k.post.length, 1)
})

test('sekali per jam, jam berikut jalan lagi; POST bertoken, berkas dikembalikan lewat git checkout', async () => {
  const d = dunia(); await d.jalan(10.1); await d.jalan(10.4); await d.jalan(11.0)
  assert.equal(d.k.post.length, 2)
  assert.equal(d.k.post[0].u, 'http://w/api/jarak-pandang'); assert.equal(d.k.post[0].o.headers.Authorization, 'Bearer k')
  assert.ok(d.k.exec.some((x) => x.cmd === 'git' && x.args[0] === 'checkout'))
  assert.equal(d.k.teks.length, 0)
})

test('sumber NOAA: tidak POST, tidak ada kabar, tidak diulang jam yang sama', async () => {
  const d = dunia({}, { sumber: 'aviationweather.gov (NOAA) cadangan' }); await d.jalan(10.1); await d.jalan(10.4)
  assert.equal(d.k.post.length, 0); assert.equal(d.k.teks.length, 0); assert.equal(metar(d.k).length, 1)
})

test('galat: kabar hanya ke PEMILIK, sekali sehari, dicoba lagi tick berikut', async () => {
  const d = dunia({}, { gagal: true }); await d.jalan(10.1); await d.jalan(10.4); await d.jalan(12)
  assert.equal(metar(d.k).length, 3)
  assert.equal(d.k.teks.length, 1); assert.equal(d.k.teks[0].t, '6299'); assert.ok(!d.k.teks.some((x) => x.t === '6281'))
})

test('Worker menolak (403): galat ke PEMILIK, laporan lain tidak tertahan', async () => {
  const d = dunia({}, { tolak: true }); const h = await d.jalan(10.1)
  assert.equal(d.k.teks.length, 1); assert.ok(h.some((x) => x.status === 'galat'))
})
