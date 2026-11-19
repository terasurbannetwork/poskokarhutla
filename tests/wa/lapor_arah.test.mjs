// LA-20: pintu WA Lapor Bencana. Server HTTP lokal sungguhan memerankan Worker (kontrak /api/lapor/*); tanpa Baileys dan tanpa WA sungguhan.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buat, uraiPerintah, bersihJpeg, keJpeg, GANGGUAN } from '../../scripts/wa/lapor_wa.mjs'
import { buat as buatPdf } from '../../scripts/wa/lapor_pdf.mjs'

const NOMOR = '6281234567890'
const MESIN = 'mesin-ok'

// Worker tiruan: mencatat tiap permintaan; `st` mengatur perilaku.
async function worker(st = {}) {
  const log = []
  st.izin ??= [NOMOR]; st.kabar ??= []; st.antre ??= []
  const srv = http.createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${MESIN}`) { res.writeHead(401); return res.end('{}') }
    const bagian = []
    req.on('data', (c) => bagian.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(bagian)
      const json = () => { try { return JSON.parse(raw.toString()) } catch { return null } }
      const u = req.url
      log.push({ metode: req.method, url: u, tipe: req.headers['content-type'], badan: u.startsWith('/api/lapor/pdf/') && req.method === 'POST' ? raw : json() })
      const kirim = (o, kode = 200) => { res.writeHead(kode, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
      if (st.gagal) return kirim({}, 503)
      if (u === '/api/lapor/izin' && req.method === 'GET') return kirim({ wa: st.izin })
      if (u === '/api/lapor/izin') { const j = json(); if (j.cabut) st.izin = st.izin.filter((x) => x !== j.wa); else st.izin.push(j.wa); return kirim({ ok: true }) }
      if (st.kode && (u === '/api/lapor/foto' || u === '/api/lapor/pesan')) return kirim({ galat: 'x', sisaDetik: 5, teksWa: st.kode === 409 ? 'Belum tahap foto.' : 'Kuota habis, coba lagi nanti.' }, st.kode)
      if (u === '/api/lapor/pesan') return kirim({ teksWa: '*Lapor Bencana BNPB*\n\n1 Warga\n2 Petugas BPBD' })
      if (u === '/api/lapor/foto') return kirim({ teksWa: '*Foto diterima*' })
      if (u === '/api/lapor/kabar') return kirim({ kabar: st.kabar })
      if (/^\/api\/lapor\/kabar\/[^/]+\/terkirim$/.test(u)) { st.kabar = st.kabar.filter((k) => !u.includes(`/kabar/${k.id}/`)); return kirim({ ok: true }) }
      if (u === '/berkas/x.pdf') { res.writeHead(200); return res.end('%PDF-isi') }
      if (u === '/berkas/f.jpg') { res.writeHead(200); return res.end('JPGDATA') }
      if (u === '/api/lapor/pdf/antre') return kirim(st.antre)
      if (u.startsWith('/api/lapor/pdf/')) return kirim({ ok: true })
      kirim({}, 404)
    })
  })
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  return { url: 'http://127.0.0.1:' + srv.address().port, log, st, tutup: () => { srv.close(); srv.closeAllConnections() } }
}

const jpegDenganExif = () => {
  const exif = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, 0x0b]), Buffer.from('Exif\0\0GPS')])
  return Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46]), exif, Buffer.from([0xff, 0xda, 0x00, 0x02, 1, 2, 3, 0xff, 0xd9])])
}

function pasang(w, opsi = {}) {
  const kirim = []
  const L = buat({ worker: w.url, mesin: MESIN, pemilik: '081200000001', kirim: async (wa, isi, o) => { kirim.push({ wa, isi, o }); return opsi.hasilKirim ?? { ok: true } }, ...opsi.buat })
  return { L, kirim }
}

test('arah: nomor berizin pribadi -> lapor; tidak berizin atau grup -> jalur lama', async () => {
  const w = await worker()
  const { L } = pasang(w)
  assert.deepEqual(await L.segarkan(), { ok: true, n: 1 })
  assert.equal(L.arah('081234567890', true), 'lapor') // normalisasi 08.. ke 62..
  assert.equal(L.arah('6289999999999', true), 'lama')
  assert.equal(L.arah(NOMOR, false), 'lama') // grup
  assert.equal(L.arah(null, true), 'lama')
  assert.equal(w.log[0].tipe, undefined)
  w.tutup()
})

test('salinan izin: Worker gagal = salinan lama tetap; izin dicabut hilang pada segar berikut', async () => {
  const w = await worker()
  const { L } = pasang(w)
  await L.segarkan()
  w.st.gagal = true
  assert.equal((await L.segarkan()).ok, false)
  assert.equal(L.berizin(NOMOR), true)
  w.st.gagal = false; w.st.izin = []
  await L.segarkan()
  assert.equal(L.berizin(NOMOR), false)
  w.tutup()
})

test('perintah PEMILIK: izin, bpbd, cabut; nomor lain tidak dicegat', async () => {
  assert.deepEqual(uraiPerintah('lapor izin 0812-3456-7891'), { wa: '6281234567891' })
  assert.deepEqual(uraiPerintah('Lapor izin +62 812 3456 7891 bpbd Kab. Belitung'), { wa: '6281234567891', peran: 'bpbd', kab: 'Kab. Belitung' })
  assert.deepEqual(uraiPerintah('lapor cabut 081234567891'), { wa: '6281234567891', cabut: true })
  for (const t of ['lapor izin 123', 'lapor izin', 'lapor', 'lapor izin 081234567891\nbpbd x', 'lapor cabut 081234567891 bpbd x']) assert.equal(uraiPerintah(t), null, t)

  const w = await worker({ izin: [] })
  const { L, kirim } = pasang(w)
  assert.equal(L.cocokPemilik('6285555555555', 'lapor izin 081234567891'), null) // bukan pemilik
  const p = L.cocokPemilik('081200000001', 'lapor izin 081234567891 bpbd Belitung')
  assert.equal(await L.putuskan(p), 'izin')
  const post = w.log.find((x) => x.metode === 'POST' && x.url === '/api/lapor/izin')
  assert.deepEqual(post.badan, { wa: '6281234567891', peran: 'bpbd', kab: 'Belitung' })
  assert.equal(L.berizin('6281234567891'), true) // disegarkan sesudah putusan
  assert.match(kirim[0].isi.text, /Izin lapor diberikan/)
  assert.ok(!kirim[0].isi.text.includes('6281234567891'), 'nomor tidak ditulis utuh')
  assert.equal(await L.putuskan(L.cocokPemilik('081200000001', 'lapor cabut 081234567891')), 'cabut')
  assert.equal(L.berizin('6281234567891'), false)
  w.tutup()
})

test('teks, lokasi, kata kembali/batal/status diteruskan; balasan Worker apa adanya', async () => {
  const w = await worker()
  const { L, kirim } = pasang(w)
  await L.tangani({ wa: NOMOR, jid: NOMOR + '@s.whatsapp.net', c: { conversation: 'kembali' }, masuk: 5 })
  await L.tangani({ wa: NOMOR, jid: 'j', c: { locationMessage: { degreesLatitude: -2.74, degreesLongitude: 107.65 } } })
  await L.tangani({ wa: NOMOR, jid: 'j', c: { liveLocationMessage: { degreesLatitude: -2.7, degreesLongitude: 107.6 } } })
  await L.tangani({ wa: NOMOR, jid: 'j', c: { stickerMessage: {} } }) // tak dilayani
  const p = w.log.filter((x) => x.url === '/api/lapor/pesan').map((x) => x.badan)
  assert.deepEqual(p[0], { wa: NOMOR, saluran: 'wa', teks: 'kembali' })
  assert.deepEqual(p[1], { wa: NOMOR, saluran: 'wa', lokasi: { lat: -2.74, lon: 107.65, sumber: 'wa' } })
  assert.equal(p[2].lokasi.lon, 107.6)
  assert.equal(p.length, 3)
  assert.equal(kirim.length, 3)
  assert.equal(kirim[0].isi.text, '*Lapor Bencana BNPB*\n\n1 Warga\n2 Petugas BPBD')
  assert.deepEqual(kirim[0].o, { jid: NOMOR + '@s.whatsapp.net', balasan: true, masuk: 5 })
  w.tutup()
})

test('foto: metadata dibuang, JPEG base64 + jam pesan; caption jadi teks', async () => {
  const w = await worker()
  const { L, kirim } = pasang(w)
  const asli = jpegDenganExif()
  assert.ok(asli.includes('GPS'))
  await L.tangani({ wa: NOMOR, jid: 'j', c: { imageMessage: { caption: 'banjir di jalan' } }, waktu: 1763500000000, unduh: async () => asli })
  const f = w.log.find((x) => x.url === '/api/lapor/foto').badan
  assert.equal(f.waktu, 1763500000000); assert.equal(f.wa, NOMOR)
  const kirimBalik = Buffer.from(f.data, 'base64')
  assert.ok(!kirimBalik.includes('GPS') && !kirimBalik.includes('Exif'))
  assert.deepEqual([kirimBalik[0], kirimBalik[1]], [0xff, 0xd8])
  assert.equal(kirim[0].isi.text, '*Foto diterima*')
  assert.equal(w.log.find((x) => x.url === '/api/lapor/pesan').badan.teks, 'banjir di jalan')
  w.tutup()
})

test('keJpeg: bukan JPEG diubah lewat sips (macOS); sampah = null', async (t) => {
  assert.equal(bersihJpeg(Buffer.from('bukan jpeg')), null)
  assert.equal(await keJpeg(Buffer.from('bukan gambar')), null)
  if (!fs.existsSync('/usr/bin/sips')) return t.skip('tanpa sips')
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGP4z8AARwzEcQCukw/x0F8jngAAAABJRU5ErkJggg==', 'base64')
  const j = await keJpeg(png)
  assert.ok(j && j[0] === 0xff && j[1] === 0xd8)
})

test('Worker gagal atau mati: pesan sopan tanpa jejak galat', async () => {
  const w = await worker({ gagal: true })
  const { L, kirim } = pasang(w)
  await L.tangani({ wa: NOMOR, jid: 'j', c: { conversation: 'halo' } })
  await L.tangani({ wa: NOMOR, jid: 'j', c: { imageMessage: {} }, unduh: async () => jpegDenganExif() })
  assert.equal(kirim[0].isi.text, GANGGUAN)
  assert.equal(kirim[1].isi.text, GANGGUAN)
  assert.equal(GANGGUAN, 'Layanan lapor sedang gangguan, coba lagi beberapa menit lagi.')
  w.tutup()
  const mati = pasang({ url: 'http://127.0.0.1:1' })
  await mati.L.tangani({ wa: NOMOR, jid: 'j', c: { conversation: 'halo' } })
  assert.equal(mati.kirim[0].isi.text, GANGGUAN)
  assert.ok(!/ECONN|fetch|http/i.test(mati.kirim[0].isi.text))
})

test('kabar: kirim teks dan PDF lalu tandai terkirim; tunda = tidak ditandai; tidak kirim ulang', async () => {
  const w = await worker({ kabar: [
    { id: 'a1', wa: NOMOR, jenis: 'balasan', teks: 'Halo dari petugas', nomor: 'LA-1' },
    { id: 'a2', wa: NOMOR, jenis: 'pdf', teks: 'Laporan Anda', url: '/berkas/x.pdf', nomor: 'LA-191126-01' },
  ] })
  const { L, kirim } = pasang(w)
  const r = await L.kabar()
  assert.equal(r.n, 2)
  assert.equal(kirim[0].isi.text, 'Halo dari petugas')
  assert.equal(kirim[1].isi.fileName, 'Laporan LA-191126-01.pdf')
  assert.equal(kirim[1].isi.document.toString(), '%PDF-isi')
  assert.equal(kirim[1].isi.mimetype, 'application/pdf')
  const tanda = w.log.filter((x) => /terkirim$/.test(x.url)).map((x) => x.url)
  assert.deepEqual(tanda, ['/api/lapor/kabar/a1/terkirim', '/api/lapor/kabar/a2/terkirim'])
  assert.equal((await L.kabar()).n, 0) // antrean kosong

  w.st.kabar = [{ id: 'b1', wa: NOMOR, jenis: 'status', teks: 'Diteruskan', nomor: 'LA-2' }]
  const t = pasang(w, { hasilKirim: { tunda: true } })
  await t.L.kabar()
  assert.equal(w.log.filter((x) => x.url.includes('/b1/')).length, 0) // belum terkirim: tidak ditandai
  w.tutup()
})

test('lapor_pdf: tarik antrean, unduh foto jadi .berkas, jalankan dokumen, unggah pdf dan docx', async () => {
  const w = await worker({ antre: [{ nomor: 'LA-191126-01', versi: 2, bahan: { nomor: 'LA-191126-01', foto: [{ url: '/berkas/f.jpg', lencana: 'GPS' }] } }] })
  const kerja = fs.mkdtempSync(path.join(os.tmpdir(), 'uji-lapor-'))
  // skrip Python tiruan: baca bahan.json, pastikan foto sudah jadi berkas, tulis .docx dan .pdf
  const skrip = path.join(kerja, 'dok.py')
  fs.writeFileSync(skrip, `import json,sys,os
b=json.load(open(sys.argv[1]));f=b['foto'][0]
assert f['berkas'].endswith('.berkas') and open(f['berkas'],'rb').read()==b'JPGDATA' and 'url' not in f
open(sys.argv[2]+'.docx','wb').write(b'DOCX');open(sys.argv[2]+'.pdf','wb').write(b'PDF')
`)
  const P = buatPdf({ worker: w.url, mesin: MESIN, kerja, skrip })
  assert.deepEqual(await P.putaran(), { n: 1 })
  const unggah = w.log.filter((x) => x.metode === 'POST')
  assert.deepEqual(unggah.map((x) => x.url), ['/api/lapor/pdf/LA-191126-01/2?jenis=pdf', '/api/lapor/pdf/LA-191126-01/2?jenis=docx'])
  assert.equal(unggah[0].badan.toString(), 'PDF'); assert.equal(unggah[0].tipe, 'application/pdf')
  assert.equal(unggah[1].badan.toString(), 'DOCX')
  assert.deepEqual(fs.readdirSync(kerja).filter((x) => x.startsWith('lapor-pdf-')), [], 'folder sementara dibersihkan')
  w.tutup()
})

test('409 dan 429 dari Worker: teksWa diteruskan ke pelapor, bukan pesan gangguan', async () => {
  for (const [kode, teks] of [[409, 'Belum tahap foto.'], [429, 'Kuota habis, coba lagi nanti.']]) {
    const w = await worker({ kode })
    const { L, kirim } = pasang(w)
    await L.tangani({ wa: NOMOR, jid: 'j', c: { imageMessage: {} }, unduh: async () => jpegDenganExif() })
    await L.tangani({ wa: NOMOR, jid: 'j', c: { conversation: 'halo' } })
    assert.deepEqual(kirim.map((k) => k.isi.text), [teks, teks])
    w.tutup()
  }
})

test('URL unduhan bukan origin Worker ditolak: PDF kabar dan foto bahan tidak diunduh, tanpa token bocor', async () => {
  const luar = await worker()
  const w = await worker({ kabar: [{ id: 'z1', wa: NOMOR, jenis: 'pdf', teks: 't', url: luar.url + '/berkas/x.pdf', nomor: 'LA-1' }],
    antre: [{ nomor: 'LA-2', versi: 1, bahan: { foto: [{ url: luar.url + '/berkas/f.jpg' }] } }] })
  const { L, kirim } = pasang(w)
  assert.equal((await L.kabar()).n, 0)
  assert.equal(kirim.length, 0)
  const kerja = fs.mkdtempSync(path.join(os.tmpdir(), 'uji-lapor-'))
  const skrip = path.join(kerja, 'dok.py')
  fs.writeFileSync(skrip, "import json,sys\nassert json.load(open(sys.argv[1]))['foto']==[]\nopen(sys.argv[2]+'.docx','wb').write(b'D');open(sys.argv[2]+'.pdf','wb').write(b'P')\n")
  await buatPdf({ worker: w.url, mesin: MESIN, kerja, skrip }).putaran()
  assert.equal(luar.log.filter((x) => x.url.startsWith('/berkas/')).length, 0, 'tidak ada permintaan ke origin lain')
  luar.tutup(); w.tutup()
})
