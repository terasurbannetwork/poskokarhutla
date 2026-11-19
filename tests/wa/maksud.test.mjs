// V2.1 kecerdasan percakapan (K29, K30; RENCANA-UJI T38-T40, T42-T43): fungsi murni scripts/wa/maksud.mjs.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as M from '../../scripts/wa/maksud.mjs'

test('T38 pagar rapikan: nomor urut dan jumlah menonjol boleh berubah, angka lain tidak', () => {
  const mentah = { rekap: 'Kejadian menonjol 16\n1 .Banjir Kab. Bogor, 3 rumah rusak\n2 .Longsor Kab Garut 1 meninggal' }
  const ok = { rekap: 'Kejadian menonjol 2\n1. Banjir Kab. Bogor, 3 rumah rusak\n2. Longsor Kab. Garut, 1 meninggal' }
  assert.deepEqual(M.pagarRapikan(mentah, ok), { lolos: true, angkaBaru: [], angkaHilang: [], kunciAsing: [], digitAsing: [] })
  const tambah = { rekap: 'Kejadian menonjol 2\n1. Banjir Kab. Bogor, 5 rumah rusak\n2. Longsor Kab. Garut, 1 meninggal' }
  const r = M.pagarRapikan(mentah, tambah)
  assert.equal(r.lolos, false)
  assert.deepEqual(r.angkaBaru.map((x) => x.angka), ['5'])
  // pemeriksa bersih 19 Nov: baris "kejadian", nomor urut palsu, digit Unicode, angka ganda, angka hilang
  const tolak = (a, b) => assert.equal(M.pagarRapikan({ k: a }, { k: b }).lolos, false, b)
  tolak('Waktu kejadian: pukul 14.00', 'Waktu kejadian: pukul 14.00, 250 meninggal')
  tolak('1. a\n2. b 5 rumah', '1. a\n250. b 5 rumah')
  tolak('Dampak 3 rumah', 'Dampak ٣٠٠ rumah')
  tolak('1. a 3 rumah', '1. a 3 rumah\n2. b 3 rumah')
  tolak('1. a 2 rumah\n2. b 7 rumah', '1. a 2 rumah')
  tolak('menonjol 16\n1. a', 'menonjol 9\n1. a')
  const terima = (a, b) => assert.equal(M.pagarRapikan({ k: a }, { k: b }).lolos, true, b)
  terima('1. a 2. b 4 rumah', '1. a\n2. b 4 rumah')
  terima('1. a\n3. b 4 rumah', '1. a\n2. b 4 rumah')
  assert.equal(M.pagarRapikan(mentah, { lain: 'x' }).lolos, false, 'kunci di luar kiriman ditolak')
  assert.equal(M.pagarRapikan({ a: 'luas 1.250 ha' }, { a: 'luas 1250 ha' }).lolos, true, 'pemisah ribuan dinormalkan')
})

test('T38 galat mesin tidak memicu rapikan', () => {
  for (const g of ['generator sedang dipakai proses lain terlalu lama (kunci generator.lock)', 'kunci generator tidak bisa diambil', 'keluaran tidak ada: x.pdf', 'spawn python3 ENOENT', "ModuleNotFoundError: No module named 'pptx'"]) assert.equal(M.galatMesin(g), true, g)
  for (const g of ['generator gagal: ValueError: terurai 15 kejadian, laporan menyebut 16 menonjol', 'KeyError: Lokasi', 'ValueError: kata kunci label tidak dikenal']) assert.equal(M.galatMesin(g), false, g)
  assert.equal(M.maksudBerlaku({ maksud: 'revisi', balasan: '' }, false), null, 'tanpa draf: revisi tebakan tetap bahan')
  assert.equal(M.maksudBerlaku({ maksud: 'obrolan', balasan: '' }, false), null)
  assert.equal(M.maksudBerlaku({ maksud: 'buat', balasan: '' }, true), null, 'pemegang draf: buat tebakan tetap revisi')
  assert.equal(M.maksudBerlaku({ maksud: 'tanya', balasan: '' }, true).maksud, 'tanya')
})

test('A16 maksud dibersihkan: di luar daftar = bahan, jenis dan tanggal disaring, balasan tanpa titik tengah', () => {
  const now = new Date('2026-11-19T03:00:00Z')
  assert.deepEqual(M.bersihkanMaksud({ maksud: 'hapus semua', jenis: 'x', tanggal: '2026-11-18', balasan: '' }, now), { maksud: 'bahan', jenis: null, tanggal: '2026-11-18', balasan: '' })
  assert.equal(M.bersihkanMaksud({ maksud: 'buat', jenis: 'harian', tanggal: '2025-01-01' }, now).tanggal, null)
  assert.equal(M.bersihkanMaksud({ maksud: 'buat', tanggal: '2026-11-20' }, now).tanggal, '2026-11-20', 'besok boleh')
  assert.equal(M.bersihkanMaksud({ maksud: 'obrolan', balasan: 'Halo · siap — bantu' }, now).balasan, 'Halo , siap , bantu')
  assert.equal(M.bersihkanMaksud(null, now).maksud, 'bahan')
  assert.equal(M.syaratMaksud('a'), false)
  assert.equal(M.syaratMaksud('x'.repeat(501)), false)
  assert.equal(M.syaratMaksud('bikinin laporan harian'), true)
})

test('T42 T43 kumpul revisi: buka, tambah, gabung bernomor, tutup, kedaluwarsa 2 jam, batas 30 pesan', () => {
  const dasar = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-kumpul-'))
  const t0 = new Date('2026-11-19T03:00:00Z')
  M.bukaKumpul(dasar, 's', 'P-191126-01', t0)
  assert.deepEqual(M.tambahKumpul(dasar, 's', 'judul tambah BNPB', t0), { n: 1, penuh: false })
  M.tambahKumpul(dasar, 's', 'slide 3 hapus', t0)
  assert.equal(M.gabungKumpul(M.bacaKumpul(dasar, 's', t0).pesan), 'Revisi dari beberapa pesan, kerjakan semuanya:\n1. judul tambah BNPB\n2. slide 3 hapus')
  assert.equal(M.gabungKumpul(['satu saja']), 'satu saja')
  assert.equal(M.gabungKumpul([]), '')
  assert.equal(M.bacaKumpul(dasar, 's', new Date(t0.getTime() + 2 * 3600e3 + 1)), null, 'lewat 2 jam sejak pesan terakhir dibuang')
  M.bukaKumpul(dasar, 's', 'P-191126-01', t0)
  for (let i = 0; i < 31; i++) M.tambahKumpul(dasar, 's', `r${i}`, t0)
  assert.equal(M.bacaKumpul(dasar, 's', t0).pesan.length, 30)
  assert.ok(M.gabungKumpul(Array(40).fill('x'.repeat(400))).length <= M.KUMPUL_MAKS_HURUF)
  assert.equal(M.tutupKumpul(dasar, 's').id, 'P-191126-01')
  assert.equal(M.bacaKumpul(dasar, 's', t0), null)
})
