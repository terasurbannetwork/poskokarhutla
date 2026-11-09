/* Gerbang D1 (ratchet): akses D1 hanya di src/hak.js. Berkas src lama yang masih menyentuh D1 ada di
   fixtures/d1-sisa.json dengan plafon jumlah panggilan (hanya boleh turun; berkas data sensitif lapangan*, logpal, instansi,
   kemitraan_akun, sippa terjaga plafonnya di situ). Berkas src baru yang menyentuh D1 langsung merah.
   Pola sengaja sempit: .exec( dan .batch( umum bentrok dengan regex JS, jadi hanya DB.exec/DB.batch dan .prepare(. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, tegas, buangKomentarJs } from './fixtures/ratchet.mjs'

const POLA = [/\benv\s*\.\s*DB\b/g, /\bDB\s*\.\s*(?:prepare|batch|exec|dump)\b/g, /\.\s*prepare\s*\(/g, /\[\s*["'`](?:DB|prepare)["'`]\s*\]/g]
const hitung = (kode) => { const b = buangKomentarJs(kode); return POLA.reduce((n, p) => n + (b.match(p) || []).length, 0) }

test('src/** selain hak.js tidak menambah akses D1 (ratchet)', () => {
  const ukur = {}
  for (const f of berkas('src', /\.m?js$/)) {
    if (f === 'src/hak.js') continue
    const n = hitung(baca(f)); if (n) ukur[f] = n
  }
  tegas(assert, banding(ukur, muatDaftar('d1-sisa.json', ukur)), 'd1-sisa.json')
})

// hak.js dibuat pengerja lain; bila belum ada di tree ini, kebutaan pemindai tetap dijaga oleh fixture jahat di bawah.
test('hak.js memegang D1 (pemindai tidak buta)', { skip: !berkas('src', /^hak\.js$/).length }, () => assert.ok(hitung(baca('src/hak.js')) > 0))

test('berkas sensitif punya plafon di daftar', () => {
  const d = muatDaftar('d1-sisa.json')
  for (const f of ['lapangan', 'lapangan_panel', 'lapangan_wa', 'logpal', 'instansi', 'kemitraan_akun', 'sippa'])
    assert.ok(`src/${f}.js` in d, `src/${f}.js hilang dari d1-sisa.json padahal berkas sensitif; pulihkan plafonnya`)
})

test('fixture jahat tertangkap, sah lolos', () => {
  for (const k of ["await env.DB.prepare('x').first()", "const { DB } = env; await DB.prepare('x')", 'db.prepare(`DELETE`)', "env['DB']", 'env\n .DB', '/* a */ const d = env.DB; // b'])
    assert.ok(hitung(k) > 0, `lolos: ${k}`)
  for (const s of ['// env.DB.prepare di hak.js', '/* .prepare( */ 1', 'x.exec(re); lst.batch(3)', "await hak.baca(env, akun, 'akun', {})"]) assert.equal(hitung(s), 0, s)
})
