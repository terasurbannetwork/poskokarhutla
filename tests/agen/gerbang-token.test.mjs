/* Gerbang tautan bertoken (FITUR.md §6, WEBSITE.md §6d, pemilik 21 Nov 2026): modul baru memakai src/token.js dan tabel tautan_token (0164),
   tidak membuat tabel atau kolom token sendiri. Titik sempitnya migrasi: tabel token baru selalu lahir di sana.
   Migrasi <= 0164 (tw_token, penugasan, lj_tim, kunci_api, mk_*, ...) dibiarkan; yang sesudahnya merah bila memuat kolom *_sha untuk token/kode/kunci. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca } from './fixtures/ratchet.mjs'

const BATAS = 164, POLA = /(?:token|kode|kunci)\w*_sha\b/i
const nomor = (f) => Number(f.match(/migrations\/(\d{4})_/)?.[1])
const buang = (s) => s.replace(/--.*$/gm, '')

test('migrasi sesudah 0164 tidak membuat kolom token sendiri (pakai tautan_token)', () => {
  const salah = berkas('migrations', /\.sql$/).filter((f) => nomor(f) > BATAS && POLA.test(buang(baca(f))))
  assert.deepEqual(salah, [], 'pakai src/token.js (terbitkan, periksa, cabut) dan tabel tautan_token, bukan kolom *_sha baru')
})

test('rumah token ada dan pemindai tidak buta', () => {
  assert.match(baca('migrations/0164_tautan_token.sql'), /token_sha/)
  assert.match(baca('src/token.js'), /export async function terbitkan/)
  for (const k of ['token_sha TEXT', 'ADD COLUMN kode_sha TEXT', 'kunci_api_sha', 'tw_kode_sha']) assert.ok(POLA.test(k), k)
  for (const s of ['-- token_sha', 'sha256 TEXT', 'foto_sha TEXT']) assert.ok(!POLA.test(buang(s)), s)
})
