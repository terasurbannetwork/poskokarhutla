// Pengenal jenis cadangan lewat Claude (pemilik 21 Nov 2026: "gimana kalau nanti formatnya berubah padahal isinya sama?").
// Pola wa_jenis.js tetap lebih dulu; bahan panjang yang lolos dari pola ditanyakan sekali ke Claude, hasilnya tersimpan per sidik teks.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { kenaliClaude, kenaliDari, tanggalIsiDari } from '../../scripts/wa/proyek.mjs'

// Kalimat pembuka yang belum pernah dilihat pola (format masa depan), isinya tetap rekap Koordalops
const REKAP = 'Kepada Yth. Kepala BNPB\nBerikut ringkasan kejadian bencana nasional periode 20 Nov 2026 07.00 WIB hingga 21 Nov 2026 07.00 WIB, total 29 kejadian.\n\n' +
  '*A. Prov. Aceh*\n1. Bencana Alam Banjir di Kota Subulussalam *(Pengkinian Data)*\n* Dampak: 2.192 KK / 9.102 jiwa terdampak\n'.repeat(4)
const OBROLAN = 'oke siap, nanti saya kirim lagi ya'.padEnd(400, ' .')

function ctxUji(jawab) {
  const dasar = fs.mkdtempSync(path.join(os.tmpdir(), 'kenali-'))
  const panggil = []
  const claude = { async kenaliJenis(teks, daftar) { panggil.push({ teks, daftar }); return { ...jawab(teks), biaya: 10 } } }
  return { ctx: { env: {}, dasar, dep: { claude }, now: new Date('2026-11-21T01:00:00Z') }, panggil }
}

test('format baru: Claude menentukan jenis dan tanggal, sekali per teks', async () => {
  const { ctx, panggil } = ctxUji((t) => /29 kejadian/.test(t) ? { jenis: 'rekap_koordalops_24', tanggal: '2026-11-21', alasan: 'rekap' } : { jenis: 'bukan', tanggal: '', alasan: 'obrolan' })
  assert.equal(kenaliDari(ctx)(REKAP, ''), null) // pola saja tidak kenal
  await kenaliClaude(ctx, [{ teks: REKAP }, { teks: OBROLAN }])
  await kenaliClaude(ctx, [{ teks: REKAP }, { teks: OBROLAN }]) // kedua kali: dari simpanan, tanpa panggilan
  assert.equal(panggil.length, 2)
  assert.ok(!panggil[0].daftar.some((d) => d.kunci === 'laphar_pdf'), 'jenis dari nama berkas tidak ditawarkan')
  assert.equal(kenaliDari(ctx)(REKAP, ''), 'rekap_koordalops_24')
  assert.equal(tanggalIsiDari(ctx)(REKAP, 'rekap_koordalops_24'), '2026-11-21')
  assert.equal(tanggalIsiDari(ctx)(REKAP, 'bmkg_pagi'), null) // tanggal hanya untuk jenis yang ditebak
  assert.equal(kenaliDari(ctx)(OBROLAN, ''), null)
})

test('jawaban di luar daftar atau tanggal rusak dibuang; pola dan teks pendek tidak ditanyakan', async () => {
  const { ctx, panggil } = ctxUji(() => ({ jenis: 'karangan', tanggal: 'kemarin', alasan: '' }))
  await kenaliClaude(ctx, [{ teks: REKAP }, { teks: 'lanjut' }, { teks: 'Selamat Pagi\nBerikut kami sampaikan Laporan Meteorologi dan Klimatologi (BMKG):\n'.padEnd(400, 'x') }])
  assert.equal(panggil.length, 1) // hanya REKAP: 'lanjut' terlalu pendek, BMKG sudah dikenali pola
  assert.equal(kenaliDari(ctx)(REKAP, ''), null)
})

test('BL_KENALI=0 atau tanpa Claude: tidak ada panggilan', async () => {
  const { ctx, panggil } = ctxUji(() => ({ jenis: 'bmkg_pagi', tanggal: '', alasan: '' }))
  ctx.env.BL_KENALI = '0'
  assert.equal(await kenaliClaude(ctx, [{ teks: REKAP }]), 0)
  assert.equal(await kenaliClaude({ env: {}, dasar: ctx.dasar, dep: {} }, [{ teks: REKAP }]), 0)
  assert.equal(panggil.length, 0)
})

test('Claude galat: berhenti tanpa melempar, pola tetap berlaku', async () => {
  const dasar = fs.mkdtempSync(path.join(os.tmpdir(), 'kenali-'))
  const ctx = { env: {}, dasar, dep: { claude: { async kenaliJenis() { throw new Error('batas_belanja') } } } }
  assert.equal(await kenaliClaude(ctx, [{ teks: REKAP }]), 0)
  assert.equal(kenaliDari(ctx)(REKAP, ''), null)
})
