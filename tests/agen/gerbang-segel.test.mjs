/* Gerbang segel dokumen (paket data/kajian-bnpb/segel-dokumen/, SG-11, RENCANA-UJI bagian Gerbang).
   1. Tiap berkas src yang menulis INSERT INTO lk_snapshot / lkb_snapshot atau memanggil pbDokBeku( (juga ljStmtBekuBaru(, lbrStmtBeku( dan INSERT INTO laporan_berkala langsung) juga memanggil batchBersegel( paling sedikit
      sebanyak itu: titik beku baru tanpa segel = merah (KEPUTUSAN D1, D3).
   2. Append-only (D14, tanpa trigger): tidak ada UPDATE, DELETE, atau REPLACE ke tabel segel dan segel_cabut di src/**.
   3. Pemindai tidak buta: fixture jahat tertangkap, sah lolos. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, buangKomentarJs } from './fixtures/ratchet.mjs'

const hitung = (kode, re) => (kode.match(re) || []).length
const RE_BEKU = [/INSERT\s+INTO\s+lkb?_snapshot\b/g, /\bpbDokBeku\s*\(/g, /\bljStmtBekuBaru\s*\(/g, /\bINSERT\s+INTO\s+laporan_berkala\b/g, /\blbrStmtBeku\s*\(/g]
const RE_SEGEL = /\bbatchBersegel\s*\(/g
const RE_UBAH = /\b(?:UPDATE|DELETE\s+FROM|REPLACE\s+INTO|INSERT\s+OR\s+REPLACE\s+INTO)\s+segel(?:_cabut)?\b/gi

export const periksa = (kode) => {
  const k = buangKomentarJs(kode), beku = RE_BEKU.reduce((n, re) => n + hitung(k, re), 0), segel = hitung(k, RE_SEGEL)
  return {beku, segel, kurang: Math.max(0, beku - segel), ubah: hitung(k, RE_UBAH)}
}

test('tiap titik beku di src/** ikut menyegel', () => {
  const salah = [], ada = []
  for (const f of berkas('src', /\.m?js$/)) {
    if (f === 'src/hak.js') continue   // definisi pbDokBeku, bukan pemanggil
    const r = periksa(baca(f))
    if (r.beku) ada.push(f)
    if (r.kurang) salah.push(`${f}: ${r.beku} titik beku, ${r.segel} batchBersegel`)
  }
  assert.deepEqual(salah, [], 'titik beku tanpa segel; rangkai lewat batchBersegel (src/segel.js)')
  assert.ok(ada.length >= 3, `pemindai buta: hanya ${ada.length} berkas pembeku ditemukan`)
})

test('segel dan segel_cabut append-only di src/**', () => {
  const salah = berkas('src', /\.m?js$/).filter(f => periksa(baca(f)).ubah).map(f => f)
  assert.deepEqual(salah, [], 'UPDATE/DELETE ke tabel segel; mencabut = INSERT segel_cabut')
})

test('fixture jahat tertangkap, sah lolos', () => {
  assert.equal(periksa('env.DB.prepare("INSERT INTO lk_snapshot (a) VALUES (1)")').kurang, 1)
  assert.equal(periksa('await pbDokBeku(env, p, id, 1, s, k)').kurang, 1)
  assert.equal(periksa('await batchTulis(env, lbrStmtBeku(env, d, kini))').kurang, 1)
  assert.equal(periksa('batchBersegel(env, lbrStmtBeku(env, d, kini), s, 0)').kurang, 0)
  assert.equal(periksa('batchBersegel(env, [env.DB.prepare("INSERT INTO lkb_snapshot (a) VALUES (1)")], s)').kurang, 0)
  for (const k of ['DB.prepare("UPDATE segel SET judul = ?")', '"DELETE FROM segel_cabut WHERE kode = ?"', '"insert or replace into segel (kode) values (?)"']) assert.equal(periksa(k).ubah, 1, k)
  for (const k of ['"INSERT INTO segel_cabut (kode) SELECT kode FROM segel"', '// UPDATE segel di komentar', '"UPDATE segelan SET x = 1"']) assert.equal(periksa(k).ubah, 0, k)
})
