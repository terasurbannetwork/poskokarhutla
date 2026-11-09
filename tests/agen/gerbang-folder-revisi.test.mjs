// Pemilik 9 Nov 2026: tiap keluaran Laporan Kejadian Bencana Harian dan Laporan Penanganan Karhutla punya folder sendiri,
// "Revisi 3/<nama>.pptx" dan ".pdf", nama berkas tanpa "(rev3)". Folder hari sebelum 10 Nov 2026 dibiarkan apa adanya.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const AKAR = 'data/laporan-bnpb'
const hari = (awalan) => fs.readdirSync(AKAR).filter((d) => new RegExp(`^${awalan}-\\d{4}-\\d{2}-\\d{2}$`).test(d)).sort()
const LAPORAN = /^Laporan (Kejadian Bencana Harian|Penanganan Pengendalian Karhutla) \d{6}( \(rev\d+\)| \d{4})?\.(pptx|pdf)$/

test('lewat_deck punya serah_revisi yang menulis ke folder Revisi N', () => {
  const s = fs.readFileSync(path.join(AKAR, 'generator/lewat_deck.py'), 'utf8')
  assert.match(s, /def serah_revisi\(/)
  assert.ok(s.includes("f'Revisi {n}'"), 'serah_revisi tidak menulis ke folder Revisi N')
})

for (const awalan of ['harian', 'satelit']) {
  test(`skrip ${awalan} terbaru menyerahkan lewat serah_revisi (salinannya dipakai hari berikutnya)`, () => {
    const adaSkrip = hari(awalan).reverse().map((d) => fs.readdirSync(path.join(AKAR, d)).filter((f) => f.endsWith('.py'))
      .map((f) => fs.readFileSync(path.join(AKAR, d, f), 'utf8')).filter((s) => s.includes('lewat_deck.bingkai('))).find((x) => x.length)
    assert.ok(adaSkrip, `tidak ada skrip ${awalan} yang memanggil lewat_deck.bingkai`)
    assert.ok(adaSkrip.every((s) => s.includes('lewat_deck.serah_revisi(')), `skrip ${awalan} terbaru tanpa lewat_deck.serah_revisi`)
  })
}

test('folder hari sejak 10 Nov 2026 tanpa PPT atau PDF laporan di luar folder Revisi', () => {
  const langgar = [...hari('harian'), ...hari('satelit')].filter((d) => d.slice(-10) >= '2026-11-10')
    .flatMap((d) => fs.readdirSync(path.join(AKAR, d)).filter((f) => LAPORAN.test(f)).map((f) => `${d}/${f}`))
  assert.deepEqual(langgar, [], 'pindahkan lewat lewat_deck.serah_revisi')
})
