/* Gerbang tautan bertoken (FITUR.md §6, WEBSITE.md §6d, pemilik 21 Nov 2026): modul baru memakai src/token.js dan tabel tautan_token (0164),
   tidak membuat tabel atau kolom token sendiri. Titik sempitnya migrasi: tabel token baru selalu lahir di sana.
   Migrasi <= 0164 (tw_token, penugasan, lj_tim, kunci_api, mk_*, ...) dibiarkan; yang sesudahnya merah bila memuat kolom *_sha untuk token/kode/kunci. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca } from './fixtures/ratchet.mjs'

const BATAS = 164, POLA = /(?:token|kode|kunci|akses|tautan|rahasia|secret)\w*?(?:_sha\d*|_hash)\b|\bsha\d*_(?:token|kode|kunci)/i
const nomor = (f) => Number(f.match(/migrations\/(\d{4})_/)?.[1])
const buang = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '')

/* Bangun ulang tabel lama menyalin kolom yang lahir sebelum 0164. Tiap entri menyebut berkas, kolom, dan migrasi asal; kolom lain di berkas itu tetap diperiksa. */
const BANGUN_ULANG = {'migrations/0176_sensor_geofon.sql': {kolom: ['kunci_hash'], asal: 'migrations/0089_sensor.sql', alasan: 'EW-03: CHECK jenis geofon memaksa sensor_alat dibangun ulang; kunci_hash HMAC alat dari 0089'}}
const POLA_G = new RegExp(POLA.source, 'gi')
const kolomToken = (f) => (buang(baca(f)).match(POLA_G) || []).map((x) => x.toLowerCase()).filter((x) => !(BANGUN_ULANG[f]?.kolom || []).includes(x))

test('migrasi sesudah 0164 tidak membuat kolom token sendiri (pakai tautan_token)', () => {
  for (const [f, e] of Object.entries(BANGUN_ULANG)) for (const k of e.kolom) assert.match(buang(baca(e.asal)), new RegExp(`\\b${k}\\b`), `${f}: ${k} harus sudah ada di ${e.asal}`)
  const salah = berkas('migrations', /\.sql$/).filter((f) => nomor(f) > BATAS && kolomToken(f).length)
  assert.deepEqual(salah, [], 'pakai src/token.js (terbitkan, periksa, cabut) dan tabel tautan_token, bukan kolom *_sha baru')
})

test('rumah token ada dan pemindai tidak buta', () => {
  assert.match(baca('migrations/0164_tautan_token.sql'), /token_sha/)
  assert.match(baca('src/token.js'), /export async function terbitkan/)
  for (const k of ['token_sha TEXT', 'ADD COLUMN kode_sha TEXT', 'kunci_api_sha', 'tw_kode_sha', 'token_sha256 TEXT', 'token_hash TEXT', 'sha_token TEXT', 'akses_sha TEXT', 'tautan_sha TEXT']) assert.ok(POLA.test(k), k)
  for (const s of ['-- token_sha', '/* token_sha */', 'sha256 TEXT', 'foto_sha TEXT', 'berkas_hash TEXT']) assert.ok(!POLA.test(buang(s)), s)
})
