/* Uji gambar Docs: figure dari baris ![ket](gambar/x), penyaring SVG (kasus jahat ditolak), ukuran raster, sidik ikut kesegaran.
   Fungsi dipanggil lewat tests/docs/_gambar_uji.py dengan folder gambar sementara; berkas di public/docs/gambar tidak disentuh. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { jalankan } from './_pembantu.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-gambar-'))
const r = jalankan(['tests/docs/_gambar_uji.py', tmp])
fs.rmSync(tmp, { recursive: true, force: true })
assert.equal(r.status, 0, r.stderr)
const H = JSON.parse(r.stdout)

test('SVG sah menjadi figure dengan SVG inline, role img, aria-label dari keterangan, figcaption', () => {
  const { html, galat } = H.svg
  assert.deepEqual(galat, [])
  assert.match(html, /^<figure class="dk-gbr dk-gbr-svg"><svg viewBox="0 0 720 120"/)
  assert.match(html, /role="img" aria-label="Alur dari kotak ke garis"/)
  assert.match(html, /<figcaption>Alur dari kotak ke garis<\/figcaption>/)
  assert.ok(!/<svg[^>]*\s(width|height)=/.test(html), 'ukuran tetap di akar dibuang')
  assert.ok(!/\sstyle=|<script|\son[a-z]+=|foreignObject|href=/i.test(html))
  assert.match(html, /Kotak &amp; teks/)
})

test('id di dalam SVG diberi awalan per gambar supaya tidak bentrok antar-SVG', () => {
  assert.match(H.svg.html, /id="g-arsitektur-alur-p"/)
  assert.match(H.svg.html, /marker-end="url\(#g-arsitektur-alur-p\)"/)
})

test('raster: figure dengan tautan perbesar, img malas muat berukuran dari kepala berkas', () => {
  for (const [k, w, h] of [['png', 640, 360], ['webp', 800, 450]]) {
    const { html, galat } = H[k]
    assert.deepEqual(galat, [])
    assert.match(html, /<figure class="dk-gbr dk-gbr-raster"><a class="dk-zum" href="\/docs\/gambar\/[a-z-]+\.(png|webp)" data-zum/)
    assert.match(html, new RegExp(`width="${w}" height="${h}" loading="lazy" decoding="async"`))
    assert.match(html, /<figcaption>/)
  }
})

test('kasus jahat atau salah menjadi galat, bukan HTML', () => {
  for (const k of ['skrip', 'warna', 'hilang', 'luar', 'keluar', 'tanpa_alt']) {
    assert.ok(H[k].galat.length > 0, `${k}: harus galat`)
    assert.ok(!/<figure/.test(H[k].html), `${k}: tidak boleh menghasilkan figure`)
  }
  assert.match(H.skrip.galat.join(), /script/)
  assert.match(H.warna.galat.join(), /warna literal/)
  assert.match(H.hilang.galat.join(), /tidak ada/)
})

test('gambar di tengah paragraf ditolak (harus di baris sendiri)', () => {
  assert.ok(H.dalam_paragraf.galat.length > 0)
})

test('sidik gambar mencakup tiap berkas di folder gambar', () => {
  assert.deepEqual(H.sidik, ['gambar/arsitektur-alur.svg', 'gambar/jahat.svg', 'gambar/layar-lapor.webp', 'gambar/layar-peta.png', 'gambar/warna.svg'])
})
