/* Gerbang token warna (ratchet), aturan pemilik 15 Nov 2026 (~/.claude/DESAIN.md tahap 0): warna di layar adalah
   token dari public/inti/tema.css (var(--...)), bukan literal lepas di CSS halaman.
   Dipindai: semua .css di bawah public/ (tanpa vendor/, salinan " 2.", *.min.css, dan public/inti/tema.css, tempat token didefinisikan).
   Literal = #rgb/#rrggbb/#rrggbbaa, rgb(a)(, hsl(a)(, oklch(, oklab(. Komentar CSS diabaikan.
   KEPUTUSAN properti kustom: deklarasi `--nama: <literal>` TIDAK dihitung. Itu cara sah memberi nama pada warna
   (token lokal), dan memaksa var() di dalamnya mustahil. Yang dihitung adalah pemakaian lepas di properti biasa
   (color, background, border, box-shadow, ...). Akibatnya warna yang dicuci lewat token lokal lolos; nilai token
   lokal itu sendiri ditinjau manusia, jangan dijadikan celah untuk palet halaman sendiri.
   Daftar sisa: fixtures/token-warna-sisa.json ({berkas: jumlah}, hanya boleh menyusut; perintis: ISI_DAFTAR=1). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, buangKomentarCss } from './fixtures/ratchet.mjs'

const LITERAL = /(?<![\w&%-])(?<!url\()#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?|oklch|oklab)\(/gi
const KUSTOM = /(^|[;{\s])--[\w-]+\s*:[^;}]*/g

export const hitung = (css) => (buangKomentarCss(css).replace(KUSTOM, '$1').match(LITERAL) || []).length

export const BERKAS_TEMA = 'public/inti/tema.css'
export const dipindai = () => berkas('public', /\.css$/).filter((f) => f !== BERKAS_TEMA && !/\.min\.css$/.test(f))

export const pesan = (masalah) =>
  masalah.map((m) => m + ' | perbaiki: pakai var(--token) dari public/inti/tema.css, atau tambah token baru di sana')

test('literal warna di CSS tidak bertambah (ratchet)', () => {
  const ukur = {}
  for (const f of dipindai()) { const n = hitung(baca(f)); if (n) ukur[f] = n }
  const m = banding(ukur, muatDaftar('token-warna-sisa.json', ukur))
  assert.deepEqual(pesan(m), [], `\n${pesan(m).join('\n')}\n(daftar: tests/agen/fixtures/token-warna-sisa.json; hanya boleh menyusut, jangan dilonggarkan)`)
})

test('pemeriksa: jahat tertangkap, sah lolos', () => {
  for (const k of ['a{color:#123456}', 'a{color:#fff}', 'a{background:rgba(0,0,0,.5)}', 'a{color:hsl(1 2% 3%)}', 'a{color:oklch(.5 .1 20)}', 'a{border:1px solid #12345678}']) assert.ok(hitung(k) > 0, `lolos: ${k}`)
  for (const s of ['a{color:var(--ink)}', '/* #123456 */a{color:red}', ':root{--x:#123456}', 'a{--y: rgb(1,2,3);color:var(--y)}', 'a{background:url(x.svg#abc)}']) assert.equal(hitung(s), 0, s)
})

test('banding: berkas baru, hitungan naik, entri bersih = merah', () => {
  assert.equal(banding({ 'a.css': 1 }, {}).length, 1, 'berkas baru berliteral harus merah')
  assert.equal(banding({ 'a.css': 3 }, { 'a.css': 2 }).length, 1, 'hitungan naik harus merah')
  assert.equal(banding({}, { 'a.css': 2 }).length, 1, 'entri bersih harus merah')
  assert.deepEqual(banding({ 'a.css': 2 }, { 'a.css': 2 }), [])
})
