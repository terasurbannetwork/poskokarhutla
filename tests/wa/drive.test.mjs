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
      if (q.startsWith("name = '")) return resp({ files: w.ada && q.includes(`name = '${w.ada}'`) ? [{ id: 'ADA' }] : [] })
      if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) return resp({ files: w.folders.filter((f) => q.includes(`'${f.induk}' in parents`)).map((f) => ({ id: f.id, name: f.nama })) })
      return resp({ files: [{ id: 'h1', name: 'Rekap', modifiedTime: '2026-10-28T00:00:00Z', webViewLink: 'https://drive/h1' }] })
    }
    if (u.pathname === '/drive/v3/files' && o.method === 'POST') {
      const b = JSON.parse(o.body); const id = 'N' + (w.folders.length + 1)
      w.folders.push({ id, nama: b.name, induk: b.parents[0] }); if (w.sesudahBuat) w.sesudahBuat(w.folders.at(-1)); return resp({ id })
    }
    if (o.method === 'PATCH') {
      const b = JSON.parse(o.body || '{}')
      if (b.name) { const id = decodeURIComponent(u.pathname.split('/').pop()); w.folders.find((x) => x.id === id).nama = b.name; return resp({ id }) }
      w.moves.push(u.searchParams.get('addParents')); return resp({ id: 'x' })
    }
    if (u.searchParams.get('alt') === 'media' || u.pathname.endsWith('/export')) return resp(Buffer.from('isi'))
    if (u.searchParams.get('fields') === 'webViewLink') return resp({ webViewLink: 'https://drive/folder' })
    return resp({}, 404)
  }
  w.fetchAsli = fetch
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
  const jalur = (nama) => { const r = []; for (let f = w.folders.find((x) => x.nama === nama); f; f = w.folders.find((x) => x.id === f.induk)) r.unshift(f.nama); return r }
  assert.deepEqual(jalur('4. Kamis, 29 Oktober 2026'), ['Bahan WA', '2026', '10. Oktober 2026', '4. 26 Oktober - 01 November 2026', '4. Kamis, 29 Oktober 2026'])
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

test('jalurTanggal: format contoh pemilik, minggu Senin-Minggu milik bulan Seninnya', () => {
  const { jalurTanggal: j } = createRequire(import.meta.url)('../../scripts/wa/drive.cjs')
  assert.deepEqual(j('2026-10-29'), ['2026', '10. Oktober 2026', '4. 26 Oktober - 01 November 2026', '4. Kamis, 29 Oktober 2026'])
  assert.deepEqual(j('2026-10-19'), ['2026', '10. Oktober 2026', '3. 19 Oktober - 25 Oktober 2026', '1. Senin, 19 Oktober 2026'])
  assert.deepEqual(j('2026-11-01'), ['2026', '10. Oktober 2026', '4. 26 Oktober - 01 November 2026', '7. Minggu, 01 November 2026'])
  assert.deepEqual(j('2026-10-01'), ['2026', '9. September 2026', '4. 28 September - 04 Oktober 2026', '4. Kamis, 01 Oktober 2026'])
  assert.deepEqual(j('2027-01-02'), ['2026', '12. Desember 2026', '4. 28 Desember 2026 - 03 Januari 2027', '6. Sabtu, 02 Januari 2027'])
})

function duniaLaporan() {
  const x = dunia()
  const d = buat({ env: { ...ENV, DRIVE_LAPORAN: 'LH' }, fetch: x.w.fetchAsli, rumah: x.rumah, log: () => {}, kabar: async () => {} })
  return { ...x, d }
}
const jalurDari = (w, nama) => { const r = []; for (let f = w.folders.find((x) => x.nama === nama); f; f = w.folders.find((x) => x.id === f.induk)) r.unshift(f.nama); return r }

test('unggahLaporan dengan DRIVE_LAPORAN: harian ke Bencana, penanganan ke Karhutla, bersusun tanggal', async () => {
  const { w, d } = duniaLaporan()
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'l-')), 'Lap.pdf'); fs.writeFileSync(p, 'x')
  await d.unggahLaporan({ tanggal: '2026-10-29', laporan: 'harian', berkas: [{ p, mime: 'application/pdf' }] })
  await d.unggahLaporan({ tanggal: '2026-10-05', laporan: 'penanganan', berkas: [{ p, mime: 'application/pdf' }] })
  assert.deepEqual(jalurDari(w, '4. Kamis, 29 Oktober 2026'), ['1. Laporan Harian Bencana', '2026', '10. Oktober 2026', '4. 26 Oktober - 01 November 2026', '4. Kamis, 29 Oktober 2026'])
  assert.deepEqual(jalurDari(w, '1. Senin, 05 Oktober 2026'), ['2. Laporan Harian Karhutla', '2026', '10. Oktober 2026', '1. 05 Oktober - 11 Oktober 2026', '1. Senin, 05 Oktober 2026'])
  assert.ok(w.folders.filter((f) => f.nama.includes('Laporan Harian')).every((f) => f.induk === 'LH'))
})

test('salin: Laporan Harian Dirdalops diteruskan ke WA ikut ke 3. Laporan Harian Dirdalops menurut tanggal nama berkas, sekali saja', async () => {
  const { w, d } = duniaLaporan()
  const pesan = { id: 'dd1', dari: '6281', nama: 'Ops', teks: '', waktu: Date.parse('2026-10-29T01:00:00Z'), berkas: { nama: 'Laporan Harian Dit. Koordalops BNPB 28102026.docx', tipe: 'application/msword' } }
  d.salin(pesan, Buffer.from('doc')); await d.kuras(); await new Promise((r) => setTimeout(r, 50))
  assert.deepEqual(jalurDari(w, '3. Rabu, 28 Oktober 2026'), ['3. Laporan Harian Dirdalops', '2026', '10. Oktober 2026', '4. 26 Oktober - 01 November 2026', '3. Rabu, 28 Oktober 2026'])
  const nama = () => w.calls.filter((c) => c.u.pathname === '/upload/drive/v3/files').map((c) => JSON.parse(c.o.body).name)
  assert.ok(nama().includes("Laporan Harian Dit. Koordalops BNPB 28102026.docx"))
  w.ada = 'Laporan Harian Dit. Koordalops BNPB 28102026.docx'
  const sebelum = nama().length
  d.salin({ ...pesan, id: 'dd2' }, Buffer.from('doc')); await d.kuras(); await new Promise((r) => setTimeout(r, 50))
  assert.equal(nama().length - sebelum, 1) // hanya salinan Bahan WA; Dirdalops dilewati karena sudah ada
})

// ---------- BL-12: final bot laporan ke <tanggal>/Revisi N/ (Q9, AGENTS 3.6) ----------
test('folderRevisi: Revisi N baru = nomor terbesar yang ada + 1 (Revisi buatan tangan tidak ditimpa), di folder hari kategori', async () => {
  const { w, d } = duniaLaporan()
  const hari = await d.pastikanFolder(['1. Laporan Harian Bencana', ...createRequire(import.meta.url)('../../scripts/wa/drive.cjs').jalurTanggal('2026-10-29')], 'LH')
  w.folders.push({ id: 'X1', nama: 'Revisi 1', induk: hari }, { id: 'X3', nama: 'Revisi 3', induk: hari }, { id: 'XL', nama: 'Revisi lama', induk: hari }, { id: 'Y9', nama: 'Revisi 9', induk: 'LAIN' })
  const f = await d.folderRevisi({ tanggal: '2026-10-29', laporan: 'harian' })
  assert.deepEqual({ nama: f.nama, n: f.n }, { nama: 'Revisi 4', n: 4 })
  assert.deepEqual(jalurDari(w, 'Revisi 4'), ['1. Laporan Harian Bencana', '2026', '10. Oktober 2026', '4. 26 Oktober - 01 November 2026', '4. Kamis, 29 Oktober 2026', 'Revisi 4'])
  assert.equal(w.folders.find((x) => x.nama === 'Revisi 4').id, f.id)
  const g = await d.folderRevisi({ tanggal: '2026-10-29', laporan: 'harian' })
  assert.equal(g.nama, 'Revisi 5', 'panggilan kedua tidak memakai ulang Revisi 4')
  const kosong = await d.folderRevisi({ tanggal: '2026-10-05', laporan: 'penanganan' })
  assert.equal(kosong.nama, 'Revisi 1')
  const induk = []; for (let x = w.folders.find((y) => y.id === kosong.id); x; x = w.folders.find((y) => y.id === x.induk)) induk.unshift(x.nama)
  assert.deepEqual(induk, ['2. Laporan Harian Karhutla', '2026', '10. Oktober 2026', '1. 05 Oktober - 11 Oktober 2026', '1. Senin, 05 Oktober 2026', 'Revisi 1'])
})

test('unggahKeFolder: nama deck polos tanpa "Revisi " dan tanpa (revN), berkas yang sudah ada dilewati, mengembalikan link folder', async () => {
  const { w, d } = duniaLaporan()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l-'))
  const a = path.join(dir, 'Laporan Kejadian Bencana Harian 291026 (rev3).pptx'), b = path.join(dir, 'Laporan Kejadian Bencana Harian 291026.pdf')
  fs.writeFileSync(a, 'p'); fs.writeFileSync(b, 'x')
  const link = await d.unggahKeFolder({ folder: { id: 'RV', nama: 'Revisi 2', n: 2 }, berkas: [{ p: a, mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }, { p: b, mime: 'application/pdf' }] })
  assert.equal(link, 'https://drive/folder')
  const nama = () => w.calls.filter((c) => c.u.pathname === '/upload/drive/v3/files').map((c) => JSON.parse(c.o.body))
  assert.deepEqual(nama(), [{ name: 'Laporan Kejadian Bencana Harian 291026.pptx', parents: ['RV'] }, { name: 'Laporan Kejadian Bencana Harian 291026.pdf', parents: ['RV'] }])
  w.ada = 'Laporan Kejadian Bencana Harian 291026.pptx'
  await d.unggahKeFolder({ folder: { id: 'RV' }, berkas: [{ p: a, mime: 'x' }, { p: b, mime: 'application/pdf' }] })
  assert.equal(nama().length, 3, 'ulangan hanya mengunggah yang belum ada')
  assert.equal(d.namaPolos('/x/Lap (REV12).pdf'), 'Lap.pdf')
})

test('unggahLaporan jalur terjadwal tidak berubah: tanpa subfolder Revisi, awalan "Revisi " hanya bila revisi', async () => {
  const { w, d } = duniaLaporan()
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'l-')), 'Laporan Kejadian Bencana Harian 291026.pdf'); fs.writeFileSync(p, 'x')
  await d.unggahLaporan({ tanggal: '2026-10-29', laporan: 'harian', revisi: false, berkas: [{ p, mime: 'application/pdf' }] })
  await d.unggahLaporan({ tanggal: '2026-10-29', laporan: 'harian', revisi: true, berkas: [{ p, mime: 'application/pdf' }] })
  const up = w.calls.filter((c) => c.u.pathname === '/upload/drive/v3/files').map((c) => JSON.parse(c.o.body))
  const hari = w.folders.find((x) => x.nama === '4. Kamis, 29 Oktober 2026').id
  assert.deepEqual(up, [{ name: 'Laporan Kejadian Bencana Harian 291026.pdf', parents: [hari] }, { name: 'Revisi Laporan Kejadian Bencana Harian 291026.pdf', parents: [hari] }])
  assert.ok(!w.folders.some((x) => /^Revisi/.test(x.nama)))
})

test('folderRevisi dan unggahKeFolder: Drive belum dikonfigurasi = null tanpa jaringan', async () => {
  let n = 0
  const d = buat({ env: {}, rumah: fs.mkdtempSync(path.join(os.tmpdir(), 'd-')), log: () => {}, fetch: async () => { n++; return resp({}) } })
  assert.equal(await d.folderRevisi({ tanggal: '2026-10-29', laporan: 'harian' }), null)
  assert.equal(await d.unggahKeFolder({ folder: { id: 'x' }, berkas: [] }), null)
  assert.equal(n, 0)
})

test('folderRevisi: "revisi 2" dan "Revisi 3 " ikut dihitung; folder bernomor sama dibuat pihak lain = folder kita dinamai ulang ke nomor bebas berikutnya', async () => {
  const { w, d } = duniaLaporan()
  const J = createRequire(import.meta.url)('../../scripts/wa/drive.cjs').jalurTanggal
  const hari = await d.pastikanFolder(['1. Laporan Harian Bencana', ...J('2026-10-29')], 'LH')
  w.folders.push({ id: 'K2', nama: 'revisi 2', induk: hari }, { id: 'K3', nama: 'Revisi 3 ', induk: hari })
  assert.equal((await d.folderRevisi({ tanggal: '2026-10-29', laporan: 'harian' })).nama, 'Revisi 4')
  w.sesudahBuat = (x) => { if (x.nama === 'Revisi 5') { w.sesudahBuat = null; w.folders.push({ id: 'TANGAN', nama: 'Revisi 5', induk: hari }) } }
  const f = await d.folderRevisi({ tanggal: '2026-10-29', laporan: 'harian' })
  assert.deepEqual({ nama: f.nama, n: f.n }, { nama: 'Revisi 6', n: 6 })
  assert.equal(w.folders.find((x) => x.id === f.id).nama, 'Revisi 6', 'folder kita dinamai ulang di Drive')
  assert.equal(w.folders.find((x) => x.id === 'TANGAN').nama, 'Revisi 5', 'folder pihak lain tidak disentuh')
})

test('folderRevisi: kunci per tanggal dan laporan; dua panggilan bersamaan memilih nomor berbeda, kunci dilepas', async () => {
  const { d, rumah } = duniaLaporan()
  const [a, b] = await Promise.all([d.folderRevisi({ tanggal: '2026-10-29', laporan: 'harian' }), d.folderRevisi({ tanggal: '2026-10-29', laporan: 'harian' })])
  assert.deepEqual([a.n, b.n].sort(), [1, 2])
  assert.deepEqual(fs.readdirSync(path.join(rumah, 'proyek')).filter((x) => x.endsWith('.lock')), [])
})
