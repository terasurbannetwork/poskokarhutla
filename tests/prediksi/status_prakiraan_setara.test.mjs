// DP-05: levelKode Python (status_prakiraan.level_kode) sama dengan besok_inti.js; kontrol negatif membuktikan pembanding tidak buta.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {setara, lcg, AKAR, ringkas} from '../../scripts/umum/setara.mjs'

const win = {}
new Function('window', readFileSync(join(AKAR, 'public/prediksi/besok_inti.js'), 'utf8'))(win)
const B = win.Besok
const KOL = {HJN: ['p1', 'p20', 'p50', 'tot', 'mulai', 'lama', 'puncak', 'm'], API: ['p', 'd'], BNJ: ['lv', 'ps'], LSR: ['lv', 'ps'],
  ASP: ['pm', 'kat'], ROB: ['lewat', 'sel'], GEL: ['hs', 'lv'], CEX: ['emb', 'lv']}
const r = lcg(7)
const nilai = () => { const u = r(); return u < .1 ? null : u < .2 ? -2 + r() * 8 : Math.round(r() * 120 * 100) / 100 }
const kasus = []
for (const kode of Object.keys(KOL)) for (let i = 0; i < 150; i++) {
  const baris = r() < .1 ? null : KOL[kode].map(nilai)
  kasus.push({kode, n: 1 + Math.floor(r() * 3), k: {[kode]: [baris, baris, baris]}})
}
kasus.push({kode: 'BNJ', n: 3, k: {}}, {kode: 'BNJ', n: 3, k: {BNJ: [[1, 0]]}}, {kode: 'ZZZ', n: 1, k: {ZZZ: [[1]]}})
const KODE = `import importlib.util as u
s = u.spec_from_file_location("sp", ${JSON.stringify(join(AKAR, 'scripts/prediksi/status_prakiraan.py'))}); m = u.module_from_spec(s); s.loader.exec_module(m)
KOL = ${JSON.stringify(KOL)}
def f(c): return m.level_kode(c['k'], KOL.get(c['kode']), c['n'], c['kode'])`
const js = c => B.levelKode(c.k, KOL, c.n, c.kode)

test('levelKode Python == besok_inti.js', () => {
  const h = setara({kasus, kode: KODE, js})
  assert.equal(h.beda.length, 0, ringkas(h))
})
test('kontrol negatif: JS digeser harus terdeteksi', () => {
  const h = setara({kasus, kode: KODE, js: c => { const x = js(c); return x == null ? x : (x + 1) % 4 }})
  assert.ok(h.beda.length > 0, 'pembanding buta')
})
