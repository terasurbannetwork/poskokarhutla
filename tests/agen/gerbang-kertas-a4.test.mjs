/* Gerbang kertas A4 (FITUR.md §7.1, peta fitur 21 Nov 2026): tiap laporan cetak memakai kertas A4, tegak atau mendatar.
   Tiap `@page` di public/** (CSS, juga JS yang menulis @page ke <style>) yang menyebut `size:` harus A4.
   @page tanpa size (hanya margin) boleh: ukuran ikut aturan lain. Satu pengecualian: halaman bernama label SIPPA
   (sp-a6, sp-bin di public/pipa/pipa.css) memang kertas label, bukan laporan. Pengecualian baru = keputusan pemilik. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca, buangKomentarCss, buangKomentarJs } from './fixtures/ratchet.mjs'

const LABEL = new Set(['sp-a6', 'sp-bin'])
const PAGE = /@page\s*([\w-]*)\s*(?::[\w-]+\s*)?\{([^}]*)\}/g
const SIZE = /size\s*:\s*([^;}]+)/i
const A4 = /^A4(\s+(portrait|landscape))?$/i

export function periksa(teks) {
  const salah = []
  for (const [, nama, isi] of teks.matchAll(PAGE)) {
    const s = isi.match(SIZE); if (!s || LABEL.has(nama)) continue
    if (!A4.test(s[1].trim())) salah.push(`${nama || '@page'} size:${s[1].trim()}`)
  }
  return salah
}

test('tiap @page yang menyebut ukuran memakai A4', () => {
  const salah = berkas('public', /\.(css|html|m?js)$/).filter((f) => !/ 2\./.test(f)).flatMap((f) => {
    const t = baca(f), bersih = /\.css$/.test(f) ? buangKomentarCss(t) : buangKomentarJs(t)
    return periksa(bersih).map((x) => `${f}: ${x}`)
  })
  assert.deepEqual(salah, [], 'laporan cetak wajib A4 (size:A4 atau size:A4 landscape)')
})

test('pola menangkap fixture', () => {
  assert.deepEqual(periksa('@page{size:A4;margin:12mm}'), [])
  assert.deepEqual(periksa('@page{size:A4 landscape;margin:22mm 10mm 14mm;@top-center{content:"x"}}'), [])
  assert.deepEqual(periksa('@page :first{margin:0}'), [])
  assert.deepEqual(periksa('@page sp-a6{size:105mm 148mm;margin:6mm}'), [])
  assert.deepEqual(periksa('@page{size:letter}'), ['@page size:letter'])
  assert.deepEqual(periksa('@page{ size: 210mm 297mm }'), ['@page size:210mm 297mm'])
  assert.deepEqual(periksa('@page laporan{size:A5}'), ['laporan size:A5'])
})
