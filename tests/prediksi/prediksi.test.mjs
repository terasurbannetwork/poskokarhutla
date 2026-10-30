// /prediksi: self-check tiap skrip (tanpa jaringan) + invarian berkas keluaran bila ada.
// Skrip: scripts/prediksi/{catat,nilai,kalibrasi,terbit}.py `uji` menolak masukan salah (peluang > 1, hari sasaran
// tidak sesudah terbit, arsip menyusut/berubah) dan menguji kalibrasi fail-closed (Brier uji tidak turun = mentah).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DATA = join(ROOT, 'public/prediksi/data')

for (const s of ['catat', 'nilai', 'kalibrasi', 'terbit']) {
  test(`${s}.py uji`, () => {
    const out = execFileSync('python3', [join(ROOT, 'scripts/prediksi', s + '.py'), 'uji'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    assert.match(out, /uji lulus/)
  })
}

test('arsip: tiap baris sah, hari = t+1..t+3, (t, kode) unik', () => {
  const dir = join(DATA, 'arsip')
  if (!existsSync(dir)) return
  const kunci = new Set()
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
    for (const b of readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean)) {
      const e = JSON.parse(b)
      const k = `${e.t}|${e.k}`
      assert.ok(!kunci.has(k), `${f}: ${k} tercatat dua kali (jalan ulang menimpa?)`)
      kunci.add(k)
      const t = Date.parse(e.t + 'T00:00:00Z')
      e.hari.forEach((h, i) => assert.equal(Date.parse(h + 'T00:00:00Z') - t, (i + 1) * 864e5, `${f} ${k}: hari[${i}] = ${h} bukan t+${i + 1}`))
      assert.equal(f.slice(0, 7), e.t.slice(0, 7), `${k} di berkas bulan yang salah`)
    }
  }
})

test('prediksi.json: 514 kab, peluang 0..1 dan menurun menurut ambang', () => {
  const p = join(DATA, 'prediksi.json')
  if (!existsSync(p)) return
  const d = JSON.parse(readFileSync(p, 'utf8'))
  assert.equal(d.kab.length, 514, `kab ${d.kab.length}`)
  assert.ok(d.batasan.length > 0)
  const h = d.kode.HJN
  for (const k of d.kab) {
    for (const r of k.HJN || []) {
      if (!r) continue
      const [p1, p20, p50, tot] = r
      assert.ok(p1 >= p20 && p20 >= p50 && p50 >= 0 && p1 <= 1, `${k.id} HJN peluang ${p1}/${p20}/${p50}`)
      assert.ok(tot >= 0 && tot < 1000, `${k.id} HJN tot ${tot}`)
    }
  }
  if (h) for (const v of Object.values(h.vonis)) assert.ok(['belum teruji', 'mengalahkan baseline', 'belum mengalahkan baseline'].includes(v[0]))
})

test('halaman memuat inti, bukan salinan', () => {
  const html = readFileSync(join(ROOT, 'public/prediksi/index.html'), 'utf8')
  for (const f of ['../inti/tema.css', '../inti/gaya.css', '../inti/format.js']) assert.ok(html.includes(f), `index.html tidak memuat ${f}`)
  for (const id of ['p-besok', 'p-rapor', 'p-konfirmasi']) assert.ok(html.includes(`id="${id}"`), `tab ${id} hilang`)
  const js = readFileSync(join(ROOT, 'public/prediksi/prediksi.js'), 'utf8')
  assert.match(js, /x-kode-regu/)
  assert.match(js, /\/api\/prediksi\/konfirmasi/)
})
