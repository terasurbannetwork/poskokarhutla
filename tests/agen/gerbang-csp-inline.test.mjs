/* Gerbang CSP inline (ratchet): halaman tidak boleh memuat <script> inline (selain application/ld+json) dan atribut on*=,
   supaya CSP ketat tanpa 'unsafe-inline' bisa dipasang. Halaman/berkas lama ada di fixtures/csp-inline-sisa.json dengan plafon
   (hanya turun). JS yang menulis on*="..." ke HTML juga dihitung. Vendor dilewati. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, tegas, buangKomentarJs } from './fixtures/ratchet.mjs'

const SKRIP = /<script\b(?![^>]*\bsrc\s*=)(?![^>]*\btype\s*=\s*["']?application\/ld\+json)[^>]*>/gi
const ATRIBUT = /\son[a-z]{3,}\s*=\s*["']/gi
const DALAM_JS = /\bon[a-z]{3,}\s*=\s*\\?["']/g
export const hitungHtml = (k) => (k.replace(/<!--[\s\S]*?-->/g, '').match(SKRIP) || []).length + (k.replace(/<!--[\s\S]*?-->/g, '').match(ATRIBUT) || []).length
export const hitungJs = (k) => (buangKomentarJs(k).match(DALAM_JS) || []).length

test('tidak ada inline script / on*= baru (ratchet)', () => {
  const ukur = {}
  for (const f of berkas('public', /\.html$/)) { const n = hitungHtml(baca(f)); if (n) ukur[f] = n }
  for (const f of berkas('public', /\.js$/)) { const n = hitungJs(baca(f)); if (n) ukur[f] = n }
  tegas(assert, banding(ukur, muatDaftar('csp-inline-sisa.json', ukur)), 'csp-inline-sisa.json')
})

test('fixture jahat tertangkap, sah lolos', () => {
  for (const k of ['<script>alert(1)</script>', '<script type="module">x()</script>', '<button onclick="x()">a</button>', "<a onmouseover='y'>"]) assert.ok(hitungHtml(k) > 0, `lolos: ${k}`)
  for (const s of ['<script src="/a.js"></script>', '<script type="application/ld+json">{}</script>', '<!-- <script>x</script> -->', '<div class="onboarding">']) assert.equal(hitungHtml(s), 0, s)
  assert.ok(hitungJs('h.innerHTML = `<b onclick="x()">`') > 0)
  assert.equal(hitungJs('el.onclick = fn; // onclick="x"'), 0)
})
