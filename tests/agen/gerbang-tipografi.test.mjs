/* Gerbang tipografi (ratchet): ukuran huruf px literal di CSS (font-size:Npx dan font:Npx/...) hanya boleh menyusut per berkas.
   public/inti/tema.css BELUM punya skala token ukuran huruf (hanya --font/--display), jadi gerbang ini baru plafon jumlah,
   bukan "pakai token". Setelah skala token ada, ganti jadi larangan px literal. Daftar: fixtures/tipografi-sisa.json. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, tegas, buangKomentarCss } from './fixtures/ratchet.mjs'

const POLA = [/font-size\s*:\s*(?!var\()[^;}]*\d(?:\.\d+)?px/gi, /(?:^|[;{\s])font\s*:\s*(?!var\()[^;}]*\d(?:\.\d+)?px/gi]
export const hitung = (css) => { const b = buangKomentarCss(css); return POLA.reduce((n, p) => n + (b.match(p) || []).length, 0) }

test('px literal font-size tidak bertambah (ratchet)', () => {
  const ukur = {}
  for (const f of berkas('public', /\.css$/)) { const n = hitung(baca(f)); if (n) ukur[f] = n }
  tegas(assert, banding(ukur, muatDaftar('tipografi-sisa.json', ukur)), 'tipografi-sisa.json')
})

test('fixture jahat tertangkap, sah lolos', () => {
  for (const k of ['a{font-size:13px}', 'a{font-size: 10.5px;color:red}', 'body{font:14.5px/1.5 var(--font)}', 'a{font-size:calc(1px + 2em)}']) assert.ok(hitung(k) > 0, `lolos: ${k}`)
  for (const s of ['a{font-size:var(--fs-s)}', 'a{font-size:1.2em}', '/* font-size:9px */a{color:red}', 'a{font:var(--x)}', 'a{line-height:12px}']) assert.equal(hitung(s), 0, s)
})
