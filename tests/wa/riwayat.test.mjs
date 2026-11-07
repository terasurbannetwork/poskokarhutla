import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
const req = createRequire(import.meta.url)
const { putusanSusulan, susulanBaru } = req('../../scripts/wa/aman.cjs')
const RW = req('../../scripts/wa/riwayat.cjs')
const NOW = Date.parse('2026-11-07T04:00:00Z')
const ts = (hari) => Math.floor((NOW - hari * 86400e3) / 1000)

test('susulan: batas 7 hari, grup operasi diterima, alasan pembuangan tercatat', () => {
  assert.equal(susulanBaru(ts(6.9), NOW), true)
  assert.equal(susulanBaru(ts(7.1), NOW), false)
  assert.deepEqual(putusanSusulan({ diterima: true, ts: ts(3), terlihat: false, now: NOW }), { ok: true })
  assert.match(putusanSusulan({ diterima: true, ts: ts(8), terlihat: false, now: NOW }).alasan, /umur lebih dari 7 hari/)
  assert.equal(putusanSusulan({ diterima: true, ts: ts(1), terlihat: true, now: NOW }).alasan, 'sudah terlihat')
  assert.equal(putusanSusulan({ diterima: false, ts: ts(1), terlihat: false, now: NOW }).alasan, 'bukan izin')
  assert.equal(putusanSusulan({ diterima: true, ts: ts(20), terlihat: false, now: NOW, hari: 30 }).ok, true)
})

test('gateway: handler susulan memakai putusanSusulan, grup ops dicatat terlihat, tak ada continue diam', () => {
  const src = fs.readFileSync(new URL('../../scripts/wa/gateway/index.js', import.meta.url), 'utf8')
  assert.match(src, /putusanSusulan\(\{ diterima/)
  assert.match(src, /\[susulan\] dibuang:/)
  assert.match(src, /if \(diterima && id\) terlihat\.catat\(id\)/)
  assert.doesNotMatch(src, /susulanBaru\(m\.messageTimestamp\)/)
})

test('rentang: hari WIB inklusif, tanggal ngawur dan terbalik ditolak', () => {
  const r = RW.rentang('2026-11-04', '2026-11-05')
  assert.equal(r.dari, Date.parse('2026-11-03T17:00:00Z'))
  assert.equal(r.sampai, Date.parse('2026-11-05T17:00:00Z'))
  assert.equal(RW.dalamRentang(Date.parse('2026-11-04T00:00:00+07:00') / 1000, r), true)
  assert.equal(RW.dalamRentang(Date.parse('2026-11-05T23:59:59+07:00') / 1000, r), true)
  assert.equal(RW.dalamRentang(Date.parse('2026-11-06T00:00:00+07:00') / 1000, r), false)
  assert.equal(RW.dalamRentang(Date.parse('2026-11-03T23:59:59+07:00') / 1000, r), false)
  assert.equal(RW.rentang('2026-02-30', '2026-03-01'), null)
  assert.equal(RW.rentang('2026-11-05', '2026-11-04'), null)
  assert.equal(RW.rentang('besok', '2026-11-04'), null)
})

test('pilihJid: hanya grup ops atau chat nomor izin; tanpa jid = semua yang dikenal', () => {
  const a = { grupOps: new Set(['G1@g.us']), dikenal: ['G1@g.us', 'G2@g.us', '62811@s.whatsapp.net', '62899@s.whatsapp.net'], izin: new Set(['62811']), nomorDari: (j) => j.split('@')[0] }
  assert.deepEqual(RW.pilihJid({ ...a, jid: 'G1@g.us' }), { jids: ['G1@g.us'] })
  assert.deepEqual(RW.pilihJid({ ...a, jid: '62811@s.whatsapp.net' }), { jids: ['62811@s.whatsapp.net'] })
  assert.ok(RW.pilihJid({ ...a, jid: 'G2@g.us' }).error)
  assert.ok(RW.pilihJid({ ...a, jid: '62899@s.whatsapp.net' }).error)
  assert.deepEqual(RW.pilihJid(a).jids, ['G1@g.us', '62811@s.whatsapp.net'])
})

test('rute /riwayat: tanpa token 401, token salah 401, body ngawur 400, sah memanggil jalankan', async () => {
  let dipanggil = null
  const h = RW.buatRute({ token: 'rahasia', jalankan: async (j, r) => { dipanggil = [j, r]; return { diminta: 1 } }, pilih: (jid) => (jid === 'x' ? { error: 'tolak' } : { jids: ['G1@g.us'] }) })
  const panggil = async (headers, body) => { let out = { c: 200 }; await h({ headers, body }, { status(c) { out.c = c; return this }, json(j) { out.j = j } }); return out }
  assert.equal((await panggil({}, { sejak: '2026-11-04', sampai: '2026-11-05' })).c, 401)
  assert.equal((await panggil({ authorization: 'salah' }, { sejak: '2026-11-04', sampai: '2026-11-05' })).c, 401)
  assert.equal(dipanggil, null)
  assert.equal((await panggil({ authorization: 'rahasia' }, { sejak: 'x', sampai: 'y' })).c, 400)
  assert.equal((await panggil({ authorization: 'rahasia' }, { sejak: '2026-11-04', sampai: '2026-11-05', jid: 'x' })).c, 400)
  const ok = await panggil({ authorization: 'Bearer rahasia' }, { sejak: '2026-11-04', sampai: '2026-11-05' })
  assert.equal(ok.c, 200); assert.equal(ok.j.diminta, 1); assert.deepEqual(dipanggil[0], ['G1@g.us'])
  const h2 = RW.buatRute({ token: '', jalankan: async () => ({}), pilih: () => ({ jids: [] }) })
  const o = { c: 200 }; await h2({ headers: { authorization: '' }, body: {} }, { status(x) { o.c = x; return this }, json() {} }); assert.equal(o.c, 401)
})

test('jalur lama (susulan/riwayat) tidak menjalankan perintah atau cari; jangkar tanpa pn; batas media', () => {
  const src = fs.readFileSync(new URL('../../scripts/wa/gateway/index.js', import.meta.url), 'utf8')
  assert.match(src, /async function simpanKeOutbox\(m, \{ lama = false \} = \{\}\)/)
  assert.match(src, /if \(!media && !grupOps && !lama\) \{/)
  assert.match(src, /if \(!grupOps && !lama && \/\^cari/)
  assert.match(src, /simpanKeOutbox\(m, \{ lama: susulan \}\)/)
  assert.match(src, /simpanKeOutbox\(m, \{ lama: true \}\)/)
  assert.doesNotMatch(src, /simpanKeOutbox\(m\)/)
  assert.doesNotMatch(src, /jangkar\[jid\] = \{[^}]*pn/)
  assert.match(src, /chmodSync\(BERKAS_JANGKAR, 0o600\)/)
  assert.match(src, /MAKS_MEDIA = 300/); assert.match(src, /JEDA_MEDIA = 1500/); assert.match(src, /dilewati_batas\+\+/)
})

test('rentang lebih dari 14 hari ditolak 400; terdaftar (@lid) sah tanpa nomor', async () => {
  const h = RW.buatRute({ token: 't', jalankan: async () => ({}), pilih: () => ({ jids: [] }) })
  const o = { c: 200 }
  await h({ headers: { authorization: 't' }, body: { sejak: '2026-10-01', sampai: '2026-11-07' } }, { status(c) { o.c = c; return this }, json() {} })
  assert.equal(o.c, 400)
  o.c = 200
  await h({ headers: { authorization: 't' }, body: { sejak: '2026-10-25', sampai: '2026-11-07' } }, { status(c) { o.c = c; return this }, json() {} })
  assert.equal(o.c, 200)
  const a = { grupOps: new Set(), dikenal: ['1@lid'], terdaftar: new Set(['1@lid']), izin: new Set(), nomorDari: () => null }
  assert.deepEqual(RW.pilihJid(a).jids, ['1@lid'])
})
