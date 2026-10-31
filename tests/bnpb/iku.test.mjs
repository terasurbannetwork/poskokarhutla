// Gerbang panel Kinerja: iku.py --uji hijau + invarian public/data/bnpb/iku.json (kunci, lintasan target, label raster).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const akar = fileURLToPath(new URL('../../', import.meta.url))

test('scripts/bnpb/iku.py --uji hijau', () => {
  const r = spawnSync('python3', ['scripts/bnpb/iku.py', '--uji'], { cwd: akar, encoding: 'utf8', timeout: 60000 })
  assert.equal(r.status, 0, r.stderr.slice(-600))
  assert.match(r.stdout, /--uji hijau/)
})

test('public/data/bnpb/iku.json: invarian', () => {
  const t = readFileSync(`${akar}public/data/bnpb/iku.json`, 'utf8')
  assert.ok(t.startsWith('{"dibuat":'))
  const d = JSON.parse(t)
  for (const k of ['sumber', 'irb', 'kapasitas', 'kerugian_pdb', 'peringatan']) assert.ok(d[k], k)
  assert.equal(d.kerugian_pdb.realisasi[0].v, 0.217)
  assert.equal(d.kerugian_pdb.target.length, 5)
  const L = d.irb.target.lintasan
  assert.equal(L.length, 4)
  L.forEach((p, i) => assert.equal(p.v, Math.round(147.95 * 0.988 ** (i + 1) * 100) / 100))
  assert.match(d.kapasitas.raster.label, /bukan IKD resmi/)
  assert.deepEqual(d.irb.deret.map(x => x.id), ['lama', 'krb2021', 'seb'])
  assert.match(d.peringatan.sistem_kita.jangkauan_penerima, /belum terukur/)
  for (const c of d.irb.capaian_turun_persen) if (c.tahun < 2025) assert.equal(c.target, null)
})
