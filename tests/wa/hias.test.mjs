// Ikon pesan bot (pemilik 19 Nov 2026: "pakai icon/emoji biar ga terlalu polos, tapi jangan overuse"): satu ikon, di depan judul.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { hias } = createRequire(import.meta.url)('../../scripts/wa/hias.cjs')
const IKON = /\p{Extended_Pictographic}/gu

test('satu ikon di depan judul sesuai isi judul', () => {
  const kasus = [
    ['*Draf v1 siap*\n_P-191126-01, versi 1_\n\nisi', '✅'], ['*Draf v1 gagal dibangun*\n_P-1_', '⚠️'], ['*Revisi v2 ditolak*', '⚠️'],
    ['*Perlu dipastikan dulu*', '❓'], ['*Proyek dibatalkan*', '🗑️'], ['*Pemakaian Claude*', '💰'], ['*Saldo kredit diatur*', '💰'],
    ['*Changelog Bot Laporan BNPB*', '📝'], ['*Halo, ini Bot Laporan BNPB*', '👋'], ['*Cara pakai Bot Laporan BNPB*', '📘'],
    ['*Bahan wajib lengkap*', '📥'], ['*Laporan selesai*', '🎉'], ['*Sedang dibangun*', '⏳'],
  ]
  for (const [t, ikon] of kasus) {
    const h = hias(t)
    assert.ok(h.startsWith(ikon + ' *'), `${t.split('\n')[0]} -> ${h.split('\n')[0]}`)
    assert.equal((h.match(IKON) || []).length, 1, 'tidak berlebihan: satu ikon')
    assert.equal(h.slice(ikon.length + 1), t, 'isi lain tidak berubah')
  }
})

test('tanpa judul tebal, sudah berikon, atau judul tanpa padanan: tidak diubah', () => {
  for (const t of ['teks biasa', '✅ *Draf v1 siap*', '*Riwayat proyek*', '', null]) assert.equal(hias(t), String(t ?? ''))
  assert.equal(hias('baris 1\n*Draf v1 siap*'), 'baris 1\n*Draf v1 siap*', 'judul harus di baris pertama')
})
