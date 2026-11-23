// BL-03 nomor terdaftar bot laporan (scripts/wa/daftar.cjs; RENCANA-UJI T1, T21; K19 tanpa pendaftaran mandiri). fetch, fs (folder sementara), jam, dan kirim disuntik.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const D = require('../../scripts/wa/daftar.cjs')

const GARAM = 'garam-uji', ASING = '6281299990001', ASING_JID = '6281299990001@s.whatsapp.net', PEMILIK = '6281100000000'
const ENV = { WA_GARAM: GARAM, WA_MESIN: 'mesin', PEMILIK: '081100000000', WA_IZIN: '0812 3456 7890', WORKER_URL: 'https://uji.lokal' }
const JAM = Date.parse('2026-11-18T03:00:00Z') // 10.00 WIB
const KE_PEMILIK = PEMILIK + '@s.whatsapp.net'
const nomorKe = (i) => '62813' + String(10000000 + i)

function pasang({ env = ENV, terdaftar = [], daftar = (b) => ({ status: 200, json: { ok: true, status: b.status } }), jaringanMati = false } = {}) {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'bl-daftar-'))
  const t = { jam: JAM, kirim: [], panggil: [], terdaftar: [...terdaftar], jaringanMati }
  const fetch = async (url, o = {}) => {
    t.panggil.push({ url, metode: o.method, auth: o.headers?.authorization, body: o.body ? JSON.parse(o.body) : null })
    if (t.jaringanMati) throw new Error('ECONNREFUSED')
    const jalur = new URL(url).pathname
    const balas = (status, json) => ({ status, json: async () => json })
    if (jalur === '/api/wa/terdaftar') return balas(200, { wa_sha: t.terdaftar })
    if (jalur === '/api/wa/daftar') { const r = daftar(JSON.parse(o.body), t); return balas(r.status, r.json) }
    return balas(404, {})
  }
  const df = D.buat({ env, fetch, rumah, kini: () => t.jam, kirim: async (jid, teks) => { t.kirim.push({ jid, teks }) } })
  df.muat()
  return { df, t, rumah }
}
const shaAsing = D.waSha(ASING, GARAM)

test('wa_sha: sha256 garam|nomor 62, sama untuk 08 dan +62; tanpa garam null', () => {
  assert.match(shaAsing, /^[0-9a-f]{64}$/)
  assert.equal(D.waSha('081299990001', GARAM), shaAsing)
  assert.equal(D.waSha('+62 812-9999-0001', GARAM), shaAsing)
  assert.equal(D.waSha(ASING, ''), null)
  assert.notEqual(D.waSha(ASING, 'garam-lain'), shaAsing)
})

test('urai putusan: setuju <nomor> [nama], tolak <nomor>', () => {
  assert.deepEqual(D.uraiPutusan('setuju 0812-9999-0001'), { putusan: 'setuju', nomor: ASING })
  assert.deepEqual(D.uraiPutusan('setuju 0812 9999 0001 Budi Santoso'), { putusan: 'setuju', nomor: ASING, nama: 'Budi Santoso' })
  assert.deepEqual(D.uraiPutusan('Tolak +62 812 9999 0001'), { putusan: 'tolak', nomor: ASING })
  assert.equal(D.uraiPutusan('tolak 081299990001 Budi'), null, 'tolak tanpa nama')
  assert.equal(D.uraiPutusan('setuju pola-revisi-01'), null, 'id pola aturan tetap bukan putusan nomor')
  assert.equal(D.uraiPutusan('setuju 12345'), null)
  assert.equal(D.uraiPutusan('setuju 081299990001 ' + 'a'.repeat(200)).nama.length, 80)
})

test('T21: terdaftar = WA_IZIN atau sha di salinan; salinan disegarkan dari /api/wa/terdaftar dengan Bearer WA_MESIN', async () => {
  const { df, t, rumah } = pasang({ terdaftar: [shaAsing] })
  assert.equal(df.terdaftar('081234567890'), true, 'WA_IZIN')
  assert.equal(df.shaTerdaftar('081234567890'), null, 'nomor WA_IZIN tidak membawa wa_sha')
  assert.equal(df.terdaftar(ASING), false, 'sebelum segar')
  assert.deepEqual(await df.segarkan(), { ok: true, n: 1 })
  assert.equal(t.panggil[0].url, 'https://uji.lokal/api/wa/terdaftar'); assert.equal(t.panggil[0].auth, 'Bearer mesin')
  assert.equal(df.terdaftar(ASING), true); assert.equal(df.shaTerdaftar('0812-9999-0001'), shaAsing)
  const berkas = path.join(rumah, 'terdaftar.json')
  assert.deepEqual(JSON.parse(fs.readFileSync(berkas, 'utf8')).wa_sha, [shaAsing])
  if (process.platform !== 'win32') assert.equal(fs.statSync(berkas).mode & 0o777, 0o600)
  const df2 = D.buat({ env: ENV, fetch: async () => { throw new Error('x') }, rumah, kini: () => JAM, kirim: async () => {} })
  df2.muat(); assert.equal(df2.terdaftar(ASING), true, 'salinan di disk dipakai sesudah mulai ulang')
})

test('segarkan gagal (jaringan, HTTP, isi rusak) menyimpan salinan lama', async () => {
  const { df, t } = pasang({ terdaftar: [shaAsing] })
  await df.segarkan(); assert.equal(df.ukuran(), 1)
  t.jaringanMati = true
  assert.equal((await df.segarkan()).ok, false); assert.equal(df.terdaftar(ASING), true)
  t.jaringanMati = false; t.terdaftar = 'rusak'
  assert.equal((await df.segarkan()).ok, false); assert.equal(df.terdaftar(ASING), true)
  t.terdaftar = ['bukan-sha', shaAsing.toUpperCase()]
  assert.deepEqual(await df.segarkan(), { ok: true, n: 0 }, 'entri tidak sah dibuang')
})

test('T1/T21 K19: nomor asing dibalas "Nomor belum terdaftar" sekali per hari WIB, tanpa memanggil Worker', async () => {
  const { df, t } = pasang()
  assert.equal(await df.asing({ dari: ASING, jid: ASING_JID, teks: 'halo minta laporan harian' }), 'belum')
  assert.equal(await df.asing({ dari: ASING, jid: ASING_JID, teks: 'halo lagi' }), 'diam')
  assert.deepEqual(t.kirim, [{ jid: ASING_JID, teks: '*Nomor belum terdaftar*\nBot ini hanya bisa dipakai nomor yang terdaftar.' }])
  assert.doesNotMatch(D.T_BELUM, /·|—|daftar\s*</)
  assert.equal(t.panggil.length, 0, 'pesan asing tidak pernah dikirim ke Worker')
  t.jam += 13 * 3600e3 // 23.00 WIB, hari sama
  assert.equal(await df.asing({ dari: ASING, jid: ASING_JID, teks: 'x' }), 'diam')
  t.jam += 2 * 3600e3 // 01.00 WIB besok
  assert.equal(await df.asing({ dari: ASING, jid: ASING_JID, teks: 'x' }), 'belum')
  assert.equal(t.kirim.length, 2)
})

test('K19: "daftar ..." dari nomor asing hanya dibalas sama, tidak ke PEMILIK dan tidak ke /api/wa/daftar', async () => {
  const { df, t } = pasang()
  assert.equal(await df.asing({ dari: ASING, jid: ASING_JID, teks: 'daftar Budi Santoso, BPBD Riau' }), 'belum')
  assert.equal(await df.asing({ dari: ASING, jid: ASING_JID, teks: 'daftar Budi Santoso, BPBD Riau' }), 'diam')
  assert.deepEqual(t.kirim.map((k) => k.jid), [ASING_JID]); assert.equal(t.kirim[0].teks, D.T_BELUM)
  assert.equal(t.panggil.length, 0)
  assert.equal(df.cocokPemilik(ASING, 'setuju 081299990001'), null, 'nomor asing tidak bisa mendaftarkan diri')
})

test('balasan relawan, pemilik, LID, dan fitur mati tidak dibalas', async () => {
  const { df, t } = pasang()
  assert.equal(await df.asing({ dari: ASING, jid: ASING_JID, teks: 'SIAP AB12CD' }), 'diam-relawan')
  assert.equal(await df.asing({ dari: PEMILIK, jid: KE_PEMILIK, teks: 'halo' }), 'diam-pemilik')
  assert.equal(await df.asing({ dari: '123456789012345', jid: '123456789012345@lid', teks: 'halo' }), 'diam-lid')
  assert.equal(t.kirim.length + t.panggil.length, 0)
  const m = pasang({ env: { ...ENV, WA_GARAM: '' } })
  assert.equal(m.df.hidup, false)
  assert.equal(await m.df.asing({ dari: ASING, jid: ASING_JID, teks: 'halo' }), 'mati')
  assert.equal(m.df.cocokPemilik('081100000000', 'setuju 081299990001'), null)
  assert.equal(m.t.kirim.length + m.t.panggil.length, 0)
})

test('plafon global 30 balasan per hari WIB, PEMILIK dikabari sekali, pulih besok', async () => {
  const { df, t } = pasang()
  for (let i = 0; i < 35; i++) await df.asing({ dari: nomorKe(i), jid: nomorKe(i) + '@s.whatsapp.net', teks: 'halo' })
  assert.equal(t.kirim.filter((k) => k.teks === D.T_BELUM).length, 30)
  const kePemilik = t.kirim.filter((k) => k.jid === KE_PEMILIK)
  assert.equal(kePemilik.length, 1); assert.match(kePemilik[0].teks, /30/)
  assert.equal(t.panggil.length, 0)
  t.jam += 864e5; t.kirim.length = 0
  assert.equal(await df.asing({ dari: nomorKe(0), jid: nomorKe(0) + '@s.whatsapp.net', teks: 'halo' }), 'belum')
})

test('setuju <nomor> [nama] dari PEMILIK mendaftarkan langsung tanpa permintaan; tolak mencabut; nomor itu tidak dikirimi pesan', async () => {
  const keputusan = []
  const { df, t } = pasang({ daftar: (b, tt) => {
    keputusan.push(b)
    tt.terdaftar = b.status === 'setuju' ? [b.wa_sha] : []
    return { status: 200, json: { ok: true, status: b.status, nama: b.nama ?? 'Budi Santoso', instansi: null } }
  } })
  assert.equal(df.cocokPemilik('081234567890', 'setuju 081299990001'), null, 'nomor WA_IZIN lain tidak bisa')
  const c = df.cocokPemilik('081100000000', 'setuju 0812-9999-0001 Budi Santoso')
  assert.deepEqual(c, { putusan: 'setuju', nomor: ASING, nama: 'Budi Santoso' })
  assert.equal(await df.putuskan(c), 'setuju')
  assert.deepEqual(keputusan.at(-1), { wa_sha: shaAsing, status: 'setuju', nama: 'Budi Santoso' })
  assert.ok(!JSON.stringify(keputusan).includes(ASING), 'nomor tidak dikirim ke Worker')
  assert.equal(df.terdaftar(ASING), true, 'salinan disegarkan segera')
  assert.deepEqual(t.kirim.map((k) => k.jid), [KE_PEMILIK], 'hanya PEMILIK dikabari')
  assert.match(t.kirim[0].teks, /^\*Nomor terdaftar\*\nBudi Santoso, 6281299990001/)
  t.kirim.length = 0
  assert.equal(await df.putuskan(df.cocokPemilik(PEMILIK, 'tolak 081299990001')), 'tolak')
  assert.deepEqual(keputusan.at(-1), { wa_sha: shaAsing, status: 'tolak' })
  assert.equal(df.terdaftar(ASING), false, 'dicabut seketika di salinan')
  assert.deepEqual(t.kirim.map((k) => k.jid), [KE_PEMILIK]); assert.match(t.kirim[0].teks, /^\*Nomor dicabut\*/)
})

test('putusan gagal disimpan: PEMILIK dikabari, salinan tidak berubah', async () => {
  const { df, t } = pasang({ daftar: () => ({ status: 500, json: {} }) })
  assert.equal(await df.putuskan({ putusan: 'setuju', nomor: ASING }), 'gagal')
  assert.deepEqual(t.kirim.map((k) => k.jid), [KE_PEMILIK]); assert.match(t.kirim[0].teks, /HTTP 500/)
  assert.equal(df.terdaftar(ASING), false)
})

test('sisa berkas daftar/ lebih dari 30 hari disapu saat mulai dan saat segar', async () => {
  const { df, t, rumah } = pasang()
  const dir = path.join(rumah, 'daftar'); fs.mkdirSync(dir, { recursive: true })
  const lama = path.join(dir, 'a'.repeat(64) + '.json'), baru = path.join(dir, 'b'.repeat(64) + '.json')
  fs.writeFileSync(lama, JSON.stringify({ jid: 'x', waktu: JAM - 31 * 864e5 })); fs.writeFileSync(baru, JSON.stringify({ jid: 'y', waktu: JAM - 864e5 }))
  df.muat()
  assert.equal(fs.existsSync(lama), false); assert.equal(fs.existsSync(baru), true)
  t.jam += 30 * 864e5
  await df.segarkan()
  assert.equal(fs.existsSync(baru), false)
})

// Gateway butuh WhatsApp sungguhan: penjaga sumber untuk sambungan BL-03.
test('T21 gateway: nomor asing pribadi tidak diteruskan, nomor terdaftar membawa wa_sha, balasan lewat sendPaced', () => {
  const src = fs.readFileSync(new URL('../../scripts/wa/gateway/index.js', import.meta.url), 'utf8')
  assert.match(src, /if \(pribadi && !izin && !bl\) \{[^\n]*\n[^\n]*DF\.asing\([^\n]*\n\s*continue/)
  assert.match(src, /if \(!dari \|\| \(!IZIN\.has\(dari\) && !grupOps && !blSha\)\) return/)
  assert.match(src, /if \(e\.wa_sha\) f\.set\('wa_sha', e\.wa_sha\)/)
  assert.match(src, /sendPaced\(jid, \{ text: teks \}, false\)/)
  assert.match(src, /DF\.cocokPemilik\(dari, /)
  assert.doesNotMatch(src, /limiter\.(commit|slot)\([^)]*\)[^\n]*daftar/)
})
