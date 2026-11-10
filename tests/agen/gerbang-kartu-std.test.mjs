/* Gerbang kartu laporan standar .ex-std (keputusan pemilik 4 Nov 2026: "ini standar ke depannya").
   Tiap bagian layar laporan = satu kartu: pil kategori, judul kalimat temuan dengan angka .hl, isi (tabel menempel penuh),
   tanpa kaki keterangan/sumber (pemilik 4 Nov 2026: "hilangkan"). Gaya tunggalnya di public/inti/kartu.css; layar laporan memakainya, bukan membuat kepala sendiri.
   Layar laporan baru: tambahkan ke LAYAR di bawah (skrip + halaman HTML yang memuatnya).
   ponytail: statis (cari kelas di sumber), tidak merender; uji layar di peramban kalau perlu bukti tampilan. */
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const ROOT = new URL('../..', import.meta.url).pathname
const baca = p => readFileSync(ROOT + p, 'utf8')

const LAYAR = [
  {skrip: 'public/bnpb/dalops.js', html: 'public/bnpb/dalops.html', lama: [/dl-kepala/, /class:\s*"bn-blok",\s*id/]},
  {skrip: 'public/bnpb/katalog-dokumen.js', html: 'public/bnpb/katalog-dokumen.html', lama: []},
  {skrip: 'public/bnpb/saham.js', html: 'public/bnpb/saham.html', lama: [/class:\s*"bn-blok",\s*"data-panel"/]},
  {skrip: 'public/operasi_laporan.js', html: 'public/index.html', lama: []},
  {skrip: 'public/prediksi/laporan_layar.js', html: 'public/prediksi/index.html', lama: []},
]

test('kartu.css memuat semua bagian kartu standar', () => {
  const css = baca('public/inti/kartu.css').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const sel of ['.ex.ex-std', '.ex-std>.ex-hd', '.ex-std .ex-ey', '.ex-std .ex-jd>h3', '.ex-std .hl', '.ex-std>.ex-bd', '.ex-std .ex-tabel'])
    assert.ok(css.includes(sel + '{') || css.includes(sel + ','), `kartu.css tidak punya aturan ${sel}`)
})

for (const l of LAYAR) {
  test(`${l.skrip} memakai kartu standar`, () => {
    const js = baca(l.skrip)
    assert.match(js, /ex-std/, 'bagian layar harus dibungkus kartu .ex-std')
    assert.match(js, /ex-ey/, 'kartu harus punya pil kategori .ex-ey')
    assert.match(js, /class:\s*"hl"|class="hl"|\bhl\(/, 'judul kartu harus menyorot angka temuan dengan .hl')
    assert.doesNotMatch(js, /Sumber: |class:\s*"ex-ft"/, 'kartu standar tanpa kaki keterangan/sumber (pemilik 4 Nov 2026)')
    for (const re of l.lama) assert.doesNotMatch(js, re, `pola kepala lama ${re} masih dipakai`)
    assert.match(baca(l.html), /\/inti\/kartu\.css/, `${l.html} harus memuat /inti/kartu.css`)
  })
}
