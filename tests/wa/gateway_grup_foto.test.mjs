// Gateway butuh WhatsApp sungguhan, jadi ini penjaga sumber: foto grup operasi harus diunduh dan dikirim sebagai berkas.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const src = fs.readFileSync(new URL('../../scripts/wa/gateway/index.js', import.meta.url), 'utf8')
test('foto grup tanpa caption tidak dibuang', () => {
  assert.match(src, /if \(!teks\.trim\(\) && !media\) return/)
  assert.doesNotMatch(src, /!media \|\| grupOps\)\) return/)
})
test('media diunduh juga untuk grup, hanya foto', () => {
  assert.match(src, /\n  if \(media\) \{\n    const tipe/)
  assert.match(src, /GRUP_OPS\.has\(k\.remoteJid\)[^\n]*c\.imageMessage/)
  assert.match(src, /mimeBoleh\(tipe\)/)
  assert.match(src, /ukuranBerkas\(media\.fileLength, BATAS_BERKAS\)/)
})
test('Drive tetap hanya non-grup', () => {
  assert.match(src, /if \(!grupOps\) drive\.salin/)
})
