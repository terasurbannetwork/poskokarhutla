// Pemilik 9 Nov 2026: halaman perusahaan dan konsesi hanya untuk Laporan Penanganan 081126; tanggal lain seperti biasa.
// bingkai.py disalin dari hari ke hari, jadi panggilan perusahaan.tambah tidak boleh ikut terbawa ke folder hari lain.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const AKAR = 'data/laporan-bnpb'

test('halaman perusahaan hanya ada di deck penanganan 8 Nov 2026', () => {
  const langgar = fs.readdirSync(AKAR)
    .filter((d) => /^(satelit|harian)-\d{4}-\d{2}-\d{2}$/.test(d) && d !== 'satelit-2026-11-08')
    .flatMap((d) => fs.readdirSync(path.join(AKAR, d)).filter((f) => f.endsWith('.py')).map((f) => path.join(d, f)))
    .filter((f) => fs.readFileSync(path.join(AKAR, f), 'utf8').includes('perusahaan.tambah('))
  assert.deepEqual(langgar, [], 'buang import perusahaan dan halaman 4 ke atas di susun, bagian Perusahaan, dari salinan bingkai.py')
})
