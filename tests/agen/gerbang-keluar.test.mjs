/* Gerbang pesan keluar (FITUR.md §9, WEBSITE.md §6d, pemilik 21 Nov 2026): satu rumah per kanal.
   Email ke Resend hanya di src/keluar.js; baris baru wa_antre hanya lewat stmtAntreWa di src/hak.js.
   Tanpa daftar pengecualian: sisa salinan sudah dipindah saat gerbang ini lahir.
   Antrean WA baru juga tidak boleh lahir: migrasi sesudah 0168 yang membuat tabel *kabar*, *outbox* atau wa_* merah (pakai wa_antre).
   lapor_kabar, lapor_kabar_bpbd, lj_kabar (<= 0161) dibiarkan: lapor_kabar juga log obrolan web, lj_kabar dipilih KEPUTUSAN-LANJUTAN D12. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, buangKomentarJs } from './fixtures/ratchet.mjs'

const BATAS_MIGRASI = 168
const TABEL_KABAR = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w*(?:kabar|outbox)\w*|wa_\w+)/i
const buangSql = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '')

const RESEND = /api\.resend\.com/
const TULIS_WA = /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+wa_antre\b/i
const langgar = (re, rumah) => berkas('src', /\.m?js$/).filter((f) => f !== rumah && re.test(buangKomentarJs(baca(f))))

test('email ke Resend hanya lewat src/keluar.js', () => {
  assert.deepEqual(langgar(RESEND, 'src/keluar.js'), [], 'panggil kirimEmail dari ./keluar.js, jangan fetch Resend sendiri')
  assert.ok(RESEND.test(baca('src/keluar.js')), 'pemindai buta: keluar.js harus memuat alamat Resend')
})

test('baris wa_antre hanya ditulis stmtAntreWa di src/hak.js', () => {
  assert.deepEqual(langgar(TULIS_WA, 'src/hak.js'), [], 'pakai stmtAntreWa dari ./hak.js')
  const hak = buangKomentarJs(baca('src/hak.js'))
  assert.equal((hak.match(new RegExp(TULIS_WA.source, 'gi')) || []).length, 1, 'hak.js: hanya stmtAntreWa yang menulis wa_antre')
})

test('migrasi sesudah 0168 tidak membuat antrean WA sendiri', () => {
  const salah = berkas('migrations', /\.sql$/).filter((f) => Number(f.match(/migrations\/(\d{4})_/)?.[1]) > BATAS_MIGRASI && TABEL_KABAR.test(buangSql(baca(f))))
  assert.deepEqual(salah, [], 'tulis lewat stmtAntreWa ke wa_antre, jangan tabel kabar baru')
  for (const k of ['CREATE TABLE IF NOT EXISTS xy_kabar (', 'create table wa_kirim (', 'CREATE TABLE "pesan_outbox" (']) assert.ok(TABEL_KABAR.test(k), k)
  for (const k of ['-- CREATE TABLE xy_kabar (', '/* CREATE TABLE wa_x */', 'CREATE INDEX wa_x ON y', 'CREATE TABLE lapor_foto (']) assert.ok(!TABEL_KABAR.test(buangSql(k)), k)
})

test('pola menangkap fixture jahat', () => {
  for (const k of ['fetch("https://api.resend.com/emails")', "INSERT INTO wa_antre (id)", 'insert or ignore into wa_antre (id)']) assert.ok(RESEND.test(k) || TULIS_WA.test(k), k)
  for (const s of ['// api.resend.com di komentar', "SELECT * FROM wa_antre"]) assert.ok(!RESEND.test(buangKomentarJs(s)) && !TULIS_WA.test(s), s)
})
