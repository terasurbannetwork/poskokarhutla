/* Gerbang kuota baca D1 (11 Nov 2026: D1 Free 5 jt baris/hari habis, situs dan masuk admin 500 sampai 07.00 WIB).
   Penyebab: /api/monitor dijajak tiap 2 menit dengan OR yang memindai seluruh tugas_api. D1 tidak punya statistik (ANALYZE), jadi
   rencana SQLite di sini sama dengan rencana di D1: EXPLAIN QUERY PLAN di skema hasil migrasi menunjukkan pindai penuh.
   1. Ratchet: tiap SELECT/UPDATE/DELETE literal di src/** yang direncanakan "SCAN <tabel>" (termasuk "SCAN … USING INDEX": tetap membaca
      seluruh indeks) dihitung per berkas; plafon di fixtures/d1-pindai.json hanya boleh turun. Kueri baru wajib SEARCH lewat indeks.
   2. Kueri dinamis yang dijajak (src/monitor_sql.js) diperiksa langsung: tanpa SCAN tugas_api.
   3. Ratchet: setInterval di public/** wajib berhenti saat tab tersembunyi (document.hidden / visibilityState); plafon lama di
      fixtures/poll-tampak.json. Penunggu singkat yang membersihkan dirinya sendiri (clearInterval di baris yang sama) dikecualikan. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { berkas, baca, muatDaftar, banding, tegas, buangKomentarJs } from './fixtures/ratchet.mjs'
import { migrasi } from '../warga/_bantu.mjs'
import { sqlDaftar, AGREGAT } from '../../src/monitor_sql.js'

/* = FILTER_BENCANA di src/monitor.js (tak bisa diimpor: monitor.js <-> instansi.js saling impor) */
const FILTER_BENCANA = {karhutla: "AND NOT EXISTS (SELECT 1 FROM tugas_bencana bb WHERE bb.tugas_id = t.id AND bb.bencana != 'karhutla')", banjir: "AND EXISTS (SELECT 1 FROM tugas_bencana bb WHERE bb.tugas_id = t.id AND bb.bencana = 'banjir')"}

const db = new DatabaseSync(':memory:')
db.exec(migrasi())
const rencana = (sql) => db.prepare('EXPLAIN QUERY PLAN ' + sql).all().map((r) => r.detail)
/* pindai penuh tabel nyata; json_each, subkueri, CTE, dan baris konstan bukan tabel */
export const pindai = (sql) => rencana(sql).filter((d) => /^SCAN /.test(d) && !/^SCAN (json_each|CONSTANT ROW|\(subquery|SUBQUERY)/.test(d))

const RE_SQL = /\.prepare\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1\s*\)/g
function pindaiBerkas(kode) {
  let n = 0
  for (const m of buangKomentarJs(kode).matchAll(RE_SQL)) {
    const sql = m[2]
    if (m[1] === '`' && sql.includes('${')) continue   // dinamis: kueri panas yang dinamis didaftar di uji 2
    if (!/^\s*(SELECT|UPDATE|DELETE|WITH)\b/i.test(sql)) continue
    let s; try { s = pindai(sql) } catch { continue }   // tabel opsional / sintaks khusus D1: bukan urusan gerbang ini
    if (s.length) n++
  }
  return n
}

test('kueri D1 literal di src/** tidak menambah pindai penuh (ratchet)', () => {
  const ukur = {}
  for (const f of berkas('src', /\.m?js$/)) { const n = pindaiBerkas(baca(f)); if (n) ukur[f] = n }
  tegas(assert, banding(ukur, muatDaftar('d1-pindai.json', ukur)), 'd1-pindai.json')
})

test('/api/monitor dan /api/pantau/ringkas (dijajak) tanpa pindai penuh tugas_api', () => {
  for (const [b, f] of Object.entries(FILTER_BENCANA)) {
    for (const sql of [sqlDaftar('t.dummy = 0', f), sqlDaftar("t.dummy = 0 AND t.prov = ? AND lower(t.kab) = lower(?)", f), AGREGAT(true).replace('?1', f.replace(/^AND /, '')), AGREGAT(false).replace('?1', '1')]) {
      assert.deepEqual(pindai(sql).filter((d) => /\b(t|tugas_api)\b/.test(d)), [], `${b}: ${sql.replace(/\s+/g, ' ').slice(0, 160)}`)
    }
  }
})

test('pemindai tidak buta: OR lama tertangkap, versi berindeks lolos', () => {
  assert.ok(pindai("SELECT t.id FROM tugas_api t WHERE t.dummy = 0 AND (t.status = 'buka' OR t.dibuat > ? OR t.padam_pada > ?) ORDER BY t.dibuat DESC LIMIT 300").length)
  assert.ok(pindai('SELECT count(*) FROM tugas_api WHERE prov = ?').length)
  assert.equal(pindai('SELECT * FROM tugas_api WHERE id = ?').length, 0)
  assert.equal(pindaiBerkas('await env.DB.prepare("SELECT kunci FROM peringatan WHERE dibuat >= ?").all()'), 1)
  assert.equal(pindaiBerkas('await env.DB.prepare("SELECT * FROM tugas_api WHERE id = ?").first()'), 0)
})

/* setInterval tanpa jeda tab tersembunyi: per kemunculan, teksnya sampai setInterval berikut atau akhir baris */
export function pollTanpaJeda(kode) {
  let n = 0
  for (const baris of buangKomentarJs(kode).split('\n')) {
    const bagian = baris.split(/(?=\bsetInterval\s*\()/).filter((x) => /^setInterval\s*\(/.test(x))
    for (const x of bagian) if (!/\bhidden\b|visibilityState|clearInterval/.test(x)) n++
  }
  return n
}

test('setInterval di public/** berhenti saat tab tersembunyi (ratchet)', () => {
  const ukur = {}
  for (const f of berkas('public', /\.(m?js|html)$/)) {
    if (/\/(vendor|lib)\//.test(f) || /\.min\.js$/.test(f)) continue
    const n = pollTanpaJeda(baca(f)); if (n) ukur[f] = n
  }
  tegas(assert, banding(ukur, muatDaftar('poll-tampak.json', ukur)), 'poll-tampak.json')
})

test('pemeriksa poll tidak buta', () => {
  assert.equal(pollTanpaJeda('setInterval(muat, 60e3);'), 1)
  assert.equal(pollTanpaJeda('setInterval(() => { if (!document.hidden) muat(); }, 60e3); setInterval(muatBj, 30 * 6e4);'), 1)
  assert.equal(pollTanpaJeda('setInterval(() => { if (document.visibilityState === "visible") muat(); }, 60e3);'), 0)
  assert.equal(pollTanpaJeda('const t = setInterval(() => { if (siap()) { clearInterval(t); jalan(); } }, 300);'), 0)
})
