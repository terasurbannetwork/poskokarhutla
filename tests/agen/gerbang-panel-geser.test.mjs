/* Gerbang panel geser (ratchet, aturan pemilik): panel overlay di atas peta MapLibre wajib bisa ditarik.
   Mekanisme di repo ini: public/inti/geser_lapis.js (memasang diri ke #lapis lewat <script> di halaman) atau tarik/geser buatan
   sendiri di JS (mis. public/banjir/tarik.js). Berkas JS yang membuat `new maplibregl.Map` + menaruh panel, tetapi tidak
   memanggil mekanisme itu (di JS-nya maupun di halaman HTML yang memuatnya), harus ada di fixtures/panel-geser-sisa.json. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, muatDaftar, banding, tegas, buangKomentarJs } from './fixtures/ratchet.mjs'

const PETA = /new\s+maplibregl\.Map\b/
const PANEL = /\b[a-z0-9]+-(?:panel|lapis|peringkat|legenda)\b|data-panel\b|["'#]lapis\b/
/* Mekanisme yang diakui disebut namanya, bukan pola nama fungsi: 26 Nov 2026 `tarikKotak()` (menarik pesan masuk di /lapor) lolos sebagai
   "tarik" sehingga panel Alun-alun tanpa pegangan tidak tertangkap. */
const MEKANISME = /geser_lapis|geserLapis|geserPanel|panel_geser|tarik_lebar|TarikLebar|data-tarik-lebar-kunci|banjir\/tarik|\/tarik\.js|\bpasangTarik\s*\(|class(?:Name)?\s*=\s*["'`][^"'`]*\btarik\b/
const PETA_TANPA_MEKANISME = (js, htmlPemuat) => {
  const s = buangKomentarJs(js)
  return PETA.test(s) && PANEL.test(s) && !MEKANISME.test(s) && !htmlPemuat.some((h) => MEKANISME.test(h))
}

// Cocok nama berkas utuh di src (boleh berpath dan ?v=), supaya baru.js tidak dianggap dimuat oleh halaman yang menyebut terbaru.js.
const muatSkrip = (h, nama) => new RegExp(`src=["'](?:[^"']*/)?${nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?[^"']*)?["']`).test(h)

test('panel di atas peta MapLibre memakai mekanisme geser (ratchet)', () => {
  const html = berkas('public', /\.html$/).map((f) => baca(f))
  const ukur = {}
  for (const f of berkas('public', /\.js$/)) {
    const js = baca(f)
    if (!PETA.test(js)) continue
    const nama = f.split('/').pop()
    if (PETA_TANPA_MEKANISME(js, html.filter((h) => muatSkrip(h, nama)))) ukur[f] = 1
  }
  tegas(assert, banding(ukur, muatDaftar('panel-geser-sisa.json', ukur)), 'panel-geser-sisa.json')
})

test('fixture jahat tertangkap, sah lolos', () => {
  const jahat = 'const m = new maplibregl.Map({}); el.innerHTML = `<div class="x-panel">`'
  assert.ok(PETA_TANPA_MEKANISME(jahat, []))
  assert.ok(PETA_TANPA_MEKANISME(jahat, ['<script src="/a.js">']))
  assert.ok(!PETA_TANPA_MEKANISME(jahat, ['<script src="/inti/geser_lapis.js">']), 'halaman memuat geser_lapis.js')
  assert.ok(!PETA_TANPA_MEKANISME(jahat + ' geserPanel(el)', []))
  assert.ok(!PETA_TANPA_MEKANISME('new maplibregl.Map({})', []), 'peta tanpa panel tidak diwajibkan')
  assert.ok(!PETA_TANPA_MEKANISME('// new maplibregl.Map x-panel', []))
  assert.ok(PETA_TANPA_MEKANISME(jahat + ' async function tarikKotak() {} tarikKotak()', []), 'nama fungsi berawalan tarik bukan pegangan tarik')
  assert.ok(!PETA_TANPA_MEKANISME(jahat, ['<aside data-tarik-lebar-kunci="x"><script src="/inti/tarik_lebar.js">']), 'modul tarik_lebar bersama')
})
