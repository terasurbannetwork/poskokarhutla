// Uji sambungan Google Drive tanpa jaringan: fetch palsu mensimulasikan OAuth + Drive REST v3.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
const { buat } = createRequire(import.meta.url)('../../scripts/wa/drive.cjs')

const ENV = { DRIVE_CLIENT_ID: 'cid', DRIVE_CLIENT_SECRET: 'sec', DRIVE_ROOT: 'ROOT' }
const resp = (j, status = 200, headers = {}) => ({ ok: status < 400, status, json: async () => j, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, arrayBuffer: async () => (Buffer.isBuffer(j) ? j : Buffer.from(JSON.stringify(j))) })

// Drive palsu: folder (id,nama,induk), berkas di Masuk, rekam semua panggilan.
function dunia({ token = true, folder = [], masuk = [], gagalUnggah } = {}) {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'drive-uji-'))
  if (token) fs.writeFileSync(path.join(rumah, 'drive.json'), '{"refresh_token":"rt"}')
  const w = { calls: [], folders: [...folder], masuk: [...masuk], kabar: [], unggahan: [], moves: [], no: 0 }
  const fetch = async (url, o = {}) => {
    const u = new URL(url); w.calls.push({ url, u, o })
    if (u.hostname === 'oauth2.googleapis.com') { w.no++; return resp({ access_token: 'at' + w.no, expires_in: 3600 }) }
    if (u.pathname === '/upload/drive/v3/files') {
      if (gagalUnggah) return resp({}, gagalUnggah)
      return resp({}, 200, { location: 'https://up.example/sesi1' })
    }
    if (u.hostname === 'up.example') { w.unggahan.push({ body: o.body, tipe: o.headers['content-type'] }); return resp({ id: 'F' + w.unggahan.length, webViewLink: 'https://drive/f' }) }
    if (u.pathname === '/drive/v3/files' && (o.method || 'GET') === 'GET') {
      const q = u.searchParams.get('q')
      if (q.includes("mimeType = 'application/vnd.google-apps.folder'") && q.includes('name =')) {
        const [, nama] = /name = '((?:[^'\\]|\\.)*)'/.exec(q); const [, induk] = /'([^']+)' in parents/.exec(q)
        const f = w.folders.find((x) => x.nama === nama && x.induk === induk)
        return resp({ files: f ? [{ id: f.id }] : [] })
      }
      if (q.includes('mimeType != ')) return resp({ files: w.masuk })
      if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) return resp({ files: w.folders.filter((f) => q.includes(`'${f.induk}' in parents`)).map((f) => ({ id: f.id })) })
      return resp({ files: [{ id: 'h1', name: 'Rekap', modifiedTime: '2026-10-28T00:00:00Z', webViewLink: 'https://drive/h1' }] })
    }
    if (u.pathname === '/drive/v3/files' && o.method === 'POST') {
      const b = JSON.parse(o.body); const id = 'N' + (w.folders.length + 1)
      w.folders.push({ id, nama: b.name, induk: b.parents[0] }); return resp({ id })
    }
    if (o.method === 'PATCH') { w.moves.push(u.searchParams.get('addParents')); return resp({ id: 'x' }) }
    if (u.searchParams.get('alt') === 'media' || u.pathname.endsWith('/export')) return resp(Buffer.from('isi'))
    if (u.searchParams.get('fields') === 'webViewLink') return resp({ webViewLink: 'https://drive/folder' })
    return resp({}, 404)
  }
  const d = buat({ env: ENV, fetch, rumah, log: () => {}, kabar: async (t) => { w.kabar.push(t) } })
  return { w, d, rumah }
}
const FOLDERS = [{ id: 'M', nama: 'Masuk', induk: 'ROOT' }, { id: 'S', nama: 'Sudah', induk: 'M' }]

test('token: refresh sekali lalu di-cache', async () => {
  const { w, d } = dunia()
  assert.equal(await d.token(), 'at1'); assert.equal(await d.token(), 'at1')
  assert.equal(w.no, 1)
  const body = new URLSearchParams(w.calls[0].o.body)
  assert.equal(body.get('grant_type'), 'refresh_token'); assert.equal(body.get('refresh_token'), 'rt')
})

test('pastikanFolder: cari dulu, buat bila tidak ada, id di-cache', async () => {
  const { w, d } = dunia({ folder: [{ id: 'A1', nama: 'Laporan', induk: 'ROOT' }] })
  const id = await d.pastikanFolder(['Laporan', '2026-10-29'])
  assert.equal(id, 'N2'); assert.equal(w.folders.length, 2) // Laporan ada, tanggal dibuat
  const n = w.calls.length
  assert.equal(await d.pastikanFolder('Laporan/2026-10-29'), 'N2'); assert.equal(w.calls.length, n)
})

test('unggah resumable: dua permintaan, sesi lalu isi', async () => {
  const { w, d } = dunia()
  const r = await d.unggah('FOLD', 'a.pdf', Buffer.from('pdf'), 'application/pdf')
  const k = w.calls.filter((c) => c.u.hostname !== 'oauth2.googleapis.com')
  assert.equal(k.length, 2)
  assert.equal(new URL(k[0].url).searchParams.get('uploadType'), 'resumable')
  assert.deepEqual(JSON.parse(k[0].o.body), { name: 'a.pdf', parents: ['FOLD'] })
  assert.equal(k[1].o.method, 'PUT'); assert.equal(r.webViewLink, 'https://drive/f')
})

test('cari: q terbatas ke folder root + turunan, petik dan backslash di-escape', async () => {
  const { w, d } = dunia({ folder: [{ id: 'K1', nama: 'Laporan', induk: 'ROOT' }] })
  const teks = await d.perintahCari("cari O'Brien\\x")
  const q = w.calls.map((c) => c.u.searchParams.get('q')).filter(Boolean).pop()
  assert.match(q, /'ROOT' in parents or 'K1' in parents/)
  assert.ok(q.includes("name contains 'O\\'Brien\\\\x' or fullText contains 'O\\'Brien\\\\x'") && q.endsWith('trashed = false'))
  assert.ok(teks.includes('Rekap') && teks.includes('https://drive/h1'))
  assert.equal(await d.perintahCari('halo'), null)
})

test('cari: tanpa hasil membalas "Tidak ada berkas yang cocok"', async () => {
  const { d } = dunia()
  d.cari = null
  const sepi = buat({ env: ENV, rumah: fs.mkdtempSync(path.join(os.tmpdir(), 'd-')), log: () => {}, fetch: async (url) => (url.includes('oauth2') ? resp({ access_token: 'x', expires_in: 3600 }) : resp({ files: [] })) })
  assert.equal(sepi.aktif, false) // tanpa drive.json
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'd-')); fs.writeFileSync(path.join(rumah, 'drive.json'), '{"refresh_token":"r"}')
  const aktif = buat({ env: ENV, rumah, log: () => {}, fetch: async (url) => (url.includes('oauth2') ? resp({ access_token: 'x', expires_in: 3600 }) : resp({ files: [] })) })
  assert.equal(await aktif.perintahCari('Cari zzz'), 'Tidak ada berkas yang cocok')
})

test('bahan dari Drive: masuk outbox sekali, dipindah ke Sudah, tidak diproses dua kali walau restart', async () => {
  const berkas = { id: 'd1', name: 'catatan.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: '10', modifiedTime: '2026-10-29T01:00:00Z' }
  const doc = { id: 'd2', name: 'Rapat', mimeType: 'application/vnd.google-apps.document', modifiedTime: '2026-10-29T02:00:00Z' }
  const exe = { id: 'd3', name: 'x.exe', mimeType: 'application/x-msdownload', size: '5', modifiedTime: '2026-10-29T03:00:00Z' }
  const { w, d, rumah } = dunia({ folder: FOLDERS, masuk: [berkas, doc, exe] })
  const masuk = []
  await d.periksaMasuk(async (x) => { masuk.push(x) })
  assert.deepEqual(masuk.map((x) => x.nama), ['catatan.docx', 'Rapat.docx'])
  assert.ok(w.calls.some((c) => c.u.pathname.endsWith('/export')))
  assert.equal(w.moves.length, 3); assert.ok(w.moves.every((x) => x === 'S'))
  assert.equal(w.kabar.length, 1) // .exe ditolak
  // restart: instance baru, berkas masih tampil di daftar (pemindahan gagal) -> tidak masuk lagi
  const d2 = buat({ env: ENV, rumah, log: () => {}, kabar: async () => {}, fetch: async (url, o) => {
    const u = new URL(url)
    if (u.hostname === 'oauth2.googleapis.com') return resp({ access_token: 'z', expires_in: 3600 })
    const q = u.searchParams.get('q') || ''
    if (q.includes('name =')) return resp({ files: [{ id: q.includes("'Sudah'") ? 'S' : 'M' }] })
    if (q.includes('mimeType != ')) return resp({ files: [berkas, doc, exe] })
    return resp({ id: 'x' })
  } })
  const lagi = []
  await d2.periksaMasuk(async (x) => { lagi.push(x) })
  assert.equal(lagi.length, 0)
})

test('salin: bahan WA diantre lalu terunggah ke Bahan WA/tanggal WIB dengan awalan HHMM-', async () => {
  const { w, d, rumah } = dunia({ folder: [] })
  d.salin({ id: 'ab1', dari: '6281', nama: 'Budi/Satgas', teks: 'halo', waktu: Date.parse('2026-10-28T20:05:00Z'), berkas: { nama: 'rekap.pdf', tipe: 'application/pdf' } }, Buffer.from('pdf'))
  await d.kuras(); await new Promise((r) => setTimeout(r, 50))
  const metas = w.calls.filter((c) => c.u.pathname === '/upload/drive/v3/files').map((c) => JSON.parse(c.o.body).name).sort()
  assert.deepEqual(metas, ['0305-Budi_Satgas.txt', '0305-rekap.pdf']) // 20:05 UTC = 03:05 WIB hari berikutnya
  assert.ok(w.folders.some((f) => f.nama === '2026-10-29') && w.folders.some((f) => f.nama === 'Bahan WA'))
  assert.equal(fs.readdirSync(path.join(rumah, 'drive-antre')).length, 0)
})

test('salin: ditolak permanen (403) pindah ke drive-rusak + kabar pemilik; jaringan mati tetap di antrean', async () => {
  const a = dunia({ gagalUnggah: 403 })
  a.d.salin({ id: 'a', dari: '6281', nama: 'B', teks: 'x', waktu: Date.now() }, null)
  await new Promise((r) => setTimeout(r, 80))
  assert.equal(a.w.kabar.length, 1); assert.equal(fs.readdirSync(path.join(a.rumah, 'drive-rusak')).length, 2)
  const b = dunia({ gagalUnggah: 503 })
  b.d.salin({ id: 'a', dari: '6281', nama: 'B', teks: 'x', waktu: Date.now() }, null)
  await new Promise((r) => setTimeout(r, 80))
  assert.equal(b.w.kabar.length, 0); assert.equal(fs.readdirSync(path.join(b.rumah, 'drive-antre')).length, 2)
})

test('unggahLaporan: ke Laporan/tanggal, awalan "Revisi " bila revisi, mengembalikan link folder', async () => {
  const { w, d } = dunia()
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'l-')), 'Lap 291026.pdf'); fs.writeFileSync(p, 'x')
  const link = await d.unggahLaporan({ tanggal: '2026-10-29', revisi: true, berkas: [{ p, mime: 'application/pdf' }] })
  assert.equal(link, 'https://drive/folder')
  assert.equal(JSON.parse(w.calls.find((c) => c.u.pathname === '/upload/drive/v3/files').o.body).name, 'Revisi Lap 291026.pdf')
})

test('konfigurasi kosong: semua fungsi no-op tanpa melempar dan tanpa jaringan', async () => {
  let n = 0
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'd-'))
  const d = buat({ env: {}, rumah, log: () => {}, fetch: async () => { n++; return resp({}) } })
  assert.equal(d.aktif, false)
  assert.equal(await d.unggahLaporan({ tanggal: 'x', berkas: [] }), null)
  d.salin({ id: 'a', dari: '1', teks: 'x', waktu: 1 }, null)
  await d.kuras(); await d.tick(async () => { throw new Error('tak boleh') }); d.sapu()
  assert.deepEqual(await d.cari('x'), [])
  assert.match(await d.perintahCari('cari x'), /belum dikonfigurasi/)
  assert.equal(n, 0); assert.equal(fs.existsSync(path.join(rumah, 'drive-antre')), false)
})
