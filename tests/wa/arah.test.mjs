// BL-09 arah pesan gateway bot laporan (scripts/wa/arah.cjs; RENCANA-UJI T22, T23; KEPUTUSAN Q1, Q14, K11, D8). Semua dunia luar disuntik.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { cegat } from '../../scripts/wa/perintah.mjs'
const require = createRequire(import.meta.url)
const A = require('../../scripts/wa/arah.cjs')

const PEMILIK = '081100000000', NO_PEMILIK = '6281100000000', NO_LAIN = '6281234567890'
const JAM = new Date('2026-11-18T03:00:00Z') // 10.00 WIB

// Tiruan alur simpanKeOutbox: cegat (proyek hanya bila BL dan pribadi) lalu arah.
function rute({ bl, dari = NO_PEMILIK, teks, pribadi = true, terdaftar = true, grupOps = false, lama = false, adaMedia = false }) {
  const cmd = !adaMedia && !grupOps && !lama ? cegat({ dari, teks, pemilik: PEMILIK, now: JAM, proyek: bl && pribadi }) : null
  return A.arah({ proyek: bl, pribadi, terdaftar, grupOps, lama, adaMedia, teks, cmd })
}

test('BL_PROYEK mati: perilaku lama utuh', () => {
  assert.equal(rute({ bl: false, teks: 'buat harian' }), 'perintah')
  assert.equal(rute({ bl: false, teks: 'status' }), 'perintah') // perintah.mjs: status tanpa tanggal = bantuan, tetap di perintah.mjs
  assert.equal(rute({ bl: false, teks: 'kirim ulang harian kemarin' }), 'perintah')
  assert.equal(rute({ bl: false, dari: NO_LAIN, teks: 'buat harian' }), 'bahan')
  assert.equal(rute({ bl: false, dari: NO_LAIN, teks: 'final' }), 'bahan')
  assert.equal(rute({ bl: false, teks: 'Laporan banjir Kab. Bekasi ...' }), 'bahan')
  assert.equal(rute({ bl: false, teks: 'foto', adaMedia: true }), 'bahan')
})

test('BL_PROYEK nyala: perintah proyek dari pemilik dan nomor terdaftar lain (Q14)', () => {
  for (const teks of ['buat', 'buat harian', 'buat penanganan 17 nov', 'buat saja', 'status', 'bantuan', 'Bantuan.', 'final', 'batal', 'versi', 'balik v2', 'balik ke v2', 'Balik ke v3.', 'pptx']) {
    assert.equal(rute({ bl: true, teks }), 'proyek', 'pemilik ' + teks)
    assert.equal(rute({ bl: true, dari: NO_LAIN, teks }), 'proyek', 'terdaftar ' + teks)
  }
})

test('kirim ulang dan status <tanggal> tetap di perintah.mjs (Q14)', () => {
  assert.equal(rute({ bl: true, teks: 'kirim ulang harian kemarin' }), 'perintah')
  assert.equal(rute({ bl: true, teks: 'status 17 nov' }), 'perintah')
  assert.equal(A.perintahProyek('status 17 nov'), false)
  assert.equal(A.perintahProyek('kirim ulang harian'), false)
})

test('bahan teks dan berkas: diteruskan dulu lalu ke proyek; berkas berketerangan "buat" tetap bahan', () => {
  assert.equal(rute({ bl: true, dari: NO_LAIN, teks: 'Rekap Koordalops 24 jam\nBanjir ...' }), 'bahan+proyek')
  assert.equal(rute({ bl: true, dari: NO_LAIN, teks: 'ganti judul slide 2 jadi Banjir Bekasi' }), 'bahan+proyek') // revisi bebas: proyek yang memutuskan
  assert.equal(rute({ bl: true, teks: 'buat harian', adaMedia: true }), 'bahan+proyek')
  assert.equal(rute({ bl: true, dari: NO_LAIN, teks: '', adaMedia: true }), 'bahan+proyek')
  assert.equal(rute({ bl: true, teks: 'buat harian\nini bahannya' }), 'bahan+proyek') // berbaris banyak = bahan
})

test('grup dan grup operasi tidak berubah', () => {
  assert.equal(rute({ bl: true, teks: 'buat harian', pribadi: false }), 'perintah') // pemilik di grup: perintah lama, bukan proyek
  assert.equal(rute({ bl: true, dari: NO_LAIN, teks: 'final', pribadi: false }), 'bahan')
  assert.equal(rute({ bl: true, dari: NO_LAIN, teks: 'Laporan hari ini', pribadi: false, grupOps: true }), 'bahan')
  assert.equal(rute({ bl: true, teks: 'foto', pribadi: false, grupOps: true, adaMedia: true }), 'bahan')
})

test('nomor tidak terdaftar tidak pernah ke proyek', () => {
  assert.equal(rute({ bl: true, dari: NO_LAIN, teks: 'buat', terdaftar: false }), 'bahan')
  assert.equal(rute({ bl: true, dari: NO_LAIN, teks: 'bahan', terdaftar: false }), 'bahan')
})

test('K11: susulan (lama) tidak pernah ke proyek, tetap ke jalur terjadwal', () => {
  for (const teks of ['buat harian', 'final', 'status', 'Rekap Koordalops ...']) {
    assert.equal(rute({ bl: true, teks, lama: true }), 'bahan')
    assert.equal(rute({ bl: true, dari: NO_LAIN, teks, lama: true }), 'bahan')
  }
  assert.equal(rute({ bl: true, teks: 'foto', lama: true, adaMedia: true }), 'bahan')
})

const tidur = (ms) => new Promise((r) => setTimeout(r, ms))

test('antre: satu tangani per pengirim, pengirim lain tidak menunggu', async () => {
  const q = A.buatAntre()
  const urut = [], aktif = {}, maks = {}
  const kerja = (k, n, ms) => async () => {
    aktif[k] = (aktif[k] || 0) + 1; maks[k] = Math.max(maks[k] || 0, aktif[k])
    urut.push(`${k}${n}+`); await tidur(ms); urut.push(`${k}${n}-`); aktif[k]--
  }
  const a1 = q.tambah('A', kerja('A', 1, 40)), a2 = q.tambah('A', kerja('A', 2, 5)), b1 = q.tambah('B', kerja('B', 1, 5))
  q.tambah('A', async () => { throw new Error('galat tidak memutus antre') })
  const a3 = q.tambah('A', kerja('A', 3, 1))
  assert.equal(q.sibuk('A'), true)
  await Promise.all([a1, a2, b1, a3])
  assert.equal(maks.A, 1)
  assert.ok(urut.indexOf('B1-') < urut.indexOf('A1-'), 'B selesai sebelum A1 selesai')
  assert.deepEqual(urut.filter((x) => x[0] === 'A'), ['A1+', 'A1-', 'A2+', 'A2-', 'A3+', 'A3-'])
  await tidur(0)
  assert.equal(q.sibuk('A'), false)
})

test('penunggu: hasil Worker diteruskan, batas waktu = null', async () => {
  const p = A.buatPenunggu({ batasMs: 20 })
  const t = p.tunggu('x')
  assert.equal(p.selesai('x', { ok: true, id: 7 }), true)
  assert.deepEqual(await t, { ok: true, id: 7 })
  assert.equal(p.selesai('x', {}), false)
  assert.equal(await p.tunggu('y'), null)
})

test('K11: T-TERLEWAT tepat sekali per nomor per jendela mati, tersimpan', async () => {
  const berkas = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bl-terlewat-')), 'terlewat.json')
  const mati = Date.parse('2026-11-18T07:05:00Z'), nyala = Date.parse('2026-11-18T09:30:00Z') // 14.05 sampai 16.30 WIB
  fs.writeFileSync(berkas, JSON.stringify({ detak: mati, terkirim: {} }))
  let jam = nyala
  const kirim = []
  const tw = A.buatTerlewat({ berkas, kini: () => jam, kirim: async (n, t) => { kirim.push({ n, t }); return { ok: true } } })
  assert.equal(tw.susulan(NO_LAIN, mati + 60e3), null, 'sebelum tersambung tidak ada jendela')
  tw.buka()
  await Promise.all([tw.susulan(NO_LAIN, mati + 60e3), tw.susulan(NO_LAIN, mati + 120e3), tw.susulan(NO_PEMILIK, mati + 600e3)])
  await tw.susulan(NO_LAIN, mati + 900e3)
  assert.equal(kirim.length, 2)
  assert.deepEqual(kirim.map((x) => x.n).sort(), [NO_PEMILIK, NO_LAIN].sort())
  assert.equal(kirim[0].t, 'Bot tadi mati dari jam 14.05 sampai 16.30, pesan di jam itu tidak diproses. Kirim ulang bila masih perlu.')
  // Proses dimulai ulang tanpa mati baru: jendela tersimpan tidak mengulang kiriman untuk nomor yang sama.
  const simpan = JSON.parse(fs.readFileSync(berkas, 'utf8'))
  assert.equal(simpan.terkirim[NO_LAIN], String(nyala))
  // Mati lagi besok: jendela baru, satu pemberitahuan lagi, lintas hari memuat tanggal.
  jam = Date.parse('2026-11-19T01:00:00Z')
  fs.writeFileSync(berkas, JSON.stringify({ ...simpan, detak: Date.parse('2026-11-18T16:00:00Z') }))
  const tw3 = A.buatTerlewat({ berkas, kini: () => jam, kirim: async (n, t) => { kirim.push({ n, t }); return { ok: true } } })
  tw3.buka()
  await tw3.susulan(NO_LAIN, jam - 3600e3)
  await tw3.susulan(NO_LAIN, jam - 1800e3)
  assert.equal(kirim.length, 3)
  assert.match(kirim[2].t, /^Bot tadi mati dari 18 Nov jam 23\.00 sampai 19 Nov jam 08\.00, /)
})

test('K11: T-TERLEWAT gagal kirim diulang, tetap sekali sesudah berhasil', async () => {
  const berkas = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bl-terlewat-')), 'terlewat.json')
  let n = 0
  const ok = []
  const tunda = []
  const tw = A.buatTerlewat({ berkas, kini: () => JAM.getTime(), setT: (f) => { tunda.push(f) },
    kirim: async (nomor) => { n++; if (n === 1) return { ok: false, error: 'batas per menit' }; ok.push(nomor); return { ok: true } } })
  tw.buka() // tanpa detak lama: jendela dimulai dari jam pesan susulan
  assert.equal(await tw.susulan(NO_LAIN, JAM.getTime() - 3600e3), false)
  assert.equal(tw.susulan(NO_LAIN, JAM.getTime() - 3600e3), null, 'sedang diulang: tidak dobel')
  await tunda.shift()()
  assert.deepEqual(ok, [NO_LAIN])
  assert.equal(tw.susulan(NO_LAIN, JAM.getTime()), null)
})

test('pratinjau PNG dikirim sebagai gambar berketerangan, PDF sebagai dokumen (D8, Q1)', () => {
  const g = A.isiBerkas('/k/slide-1.png', 'slide-1.png', 'Draf v1', 'image/png')
  assert.deepEqual(g, { image: { url: '/k/slide-1.png' }, caption: 'Draf v1', mimetype: 'image/png' })
  assert.equal(g.document, undefined)
  const d = A.isiBerkas('/k/a.pdf', 'a.pdf', 'PDF draf', 'application/pdf')
  assert.deepEqual(d, { document: { url: '/k/a.pdf' }, fileName: 'a.pdf', mimetype: 'application/pdf', caption: 'PDF draf' })
})

// Gateway butuh WhatsApp sungguhan: penjaga sumber untuk sambungan arah.cjs dan limiter di index.js.
const src = fs.readFileSync(new URL('../../scripts/wa/gateway/index.js', import.meta.url), 'utf8')
test('gateway: arah, antrean, susulan, dan batas percakapan tersambung', () => {
  assert.match(src, /const BL = process\.env\.BL_PROYEK === '1'/)
  assert.match(src, /cegat\(\{ dari, teks, pemilik: process\.env\.PEMILIK, proyek: BL && pribadi \}\)/)
  assert.match(src, /ARAH\.arah\(\{ proyek: BL, pribadi, terdaftar: true, grupOps, lama,/)
  assert.match(src, /PENUNGGU\.selesai\(e\.id, r\.json\)/)
  assert.match(src, /ANTRE\.tambah\(dari,/)
  assert.match(src, /limiter\.commit\(jid, gate\.percakapan\)/)
  assert.match(src, /sendPaced\(jid, isi, false, \{ balasan: true, masuk \}\)/)
  assert.match(src, /ARAH\.pilihJalur\(Pr, pesan, ctx\) === 'langsung'\) return pesan/)
  assert.match(src, /diteruskan: ARAH\.diteruskan\(c\)/)
  assert.match(src, /TERLEWAT\.susulan\(dari, ARAH\.tsMs\(m\.messageTimestamp\)\)/)
  assert.match(src, /if \(TERLEWAT\) TERLEWAT\.buka\(\)/)
  assert.match(src, /susulan && TERLEWAT && pribadi && \(izin \|\| bl\) && !terlihat\.ada\(id\)/)
  assert.match(src, /ARAH\.isiBerkas\(aman, nama, caption, mimetype\)/)
  assert.equal((src.match(/Pr\.tangani\(/g) || []).length, 1, 'proyek hanya dipanggil dari antrean')
})

test('klasifikasi proyek: revisi dan perintah langsung, bahan diteruskan; belum diekspor atau galat = bahan', async () => {
  const pesan = { dari: NO_LAIN, teks: 'ganti judul slide 2' }
  const dgn = (k) => ({ klasifikasi: async (p, ctx) => { assert.equal(p, pesan); assert.equal(ctx.x, 1); return k } })
  assert.equal(await A.pilihJalur(dgn('revisi'), pesan, { x: 1 }), 'langsung')
  assert.equal(await A.pilihJalur(dgn('perintah'), pesan, { x: 1 }), 'langsung')
  assert.equal(await A.pilihJalur(dgn('bahan'), pesan, { x: 1 }), 'bahan')
  assert.equal(await A.pilihJalur({ tangani() {} }, pesan, {}), 'bahan')
  assert.equal(await A.pilihJalur({ klasifikasi: async () => { throw new Error('x') } }, pesan, {}), 'bahan')
})

test('tanda diteruskan WhatsApp terbaca dari teks, dokumen, dan foto', () => {
  assert.equal(A.diteruskan({ conversation: 'hai' }), false)
  assert.equal(A.diteruskan({ extendedTextMessage: { text: 'x', contextInfo: { isForwarded: true, forwardingScore: 1 } } }), true)
  assert.equal(A.diteruskan({ documentMessage: { contextInfo: { isForwarded: true } } }), true)
  assert.equal(A.diteruskan({ imageMessage: { contextInfo: { isForwarded: false } } }), false)
  assert.equal(A.diteruskan({ documentWithCaptionMessage: { message: { documentMessage: { contextInfo: { isForwarded: true } } } } }), true)
  assert.equal(A.diteruskan(null), false)
})

test('jam susulan: number, string, Long; tak jelas = null dan teks tanpa jam, tidak pernah NaN', async () => {
  assert.equal(A.tsMs(1763449200), 1763449200000)
  assert.equal(A.tsMs('1763449200'), 1763449200000)
  assert.equal(A.tsMs({ toNumber: () => 1763449200, low: 1, high: 0 }), 1763449200000)
  assert.equal(A.tsMs({ low: 1 }), null)
  assert.equal(A.tsMs(undefined), null)
  assert.equal(A.teksTerlewat(NaN, Date.now()), 'Bot tadi mati, pesan selama itu tidak diproses. Kirim ulang bila masih perlu.')
  const berkas = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bl-terlewat-')), 'terlewat.json')
  const kirim = []
  const tw = A.buatTerlewat({ berkas, kini: () => JAM.getTime(), kirim: async (n, t) => { kirim.push(t); return { ok: true } } })
  tw.buka() // tanpa detak lama
  await tw.susulan(NO_LAIN, A.tsMs({ low: 1 }))
  assert.doesNotMatch(kirim[0], /NaN/)
  assert.equal(kirim[0], 'Bot tadi mati, pesan selama itu tidak diproses. Kirim ulang bila masih perlu.')
})
