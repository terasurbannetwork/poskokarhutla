// Pemilik 11 Nov 2026 ("pill ini masukin lagi"): Laporan Penanganan Karhutla memuat lagi pil CUT OFF DATA di slide pertama.
// Membatalkan aturan 9 Nov 2026 (tanpa pil, jam data cukup di kaki Sumber).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const BERKAS = 'data/laporan-bnpb/generator/lewat_deck.py'
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')

test('bingkai format penanganan tidak membuang pil dan menagihnya di hasil akhir', () => {
  const s = fs.readFileSync(BERKAS, 'utf8')
  assert.doesNotMatch(s, /buang_pil_cutoff/, 'pil CUT OFF DATA masih dibuang')
  assert.match(s, /if format == 'penanganan':[^\n]*cek_ada_pil\(keluar\)/, 'hasil akhir penanganan tidak diperiksa cek_ada_pil')
})

test('cek_ada_pil menolak deck tanpa pil di slide pertama', () => {
  const kode = String.raw`
import os, sys, tempfile, zipfile
sys.path.insert(0, 'data/laporan-bnpb/generator')
import lewat_deck as L
d = tempfile.mkdtemp(); ada, tanpa = os.path.join(d, 'a.pptx'), os.path.join(d, 't.pptx')
pil = '<p:sp><a:t>CUT OFF DATA   </a:t><a:t>11 Nov 2026, 18.00 WIB</a:t></p:sp>'
with zipfile.ZipFile(ada, 'w') as z: z.writestr('ppt/slides/slide1.xml', pil); z.writestr('ppt/slides/slide10.xml', '<p:sp/>')
with zipfile.ZipFile(tanpa, 'w') as z: z.writestr('ppt/slides/slide1.xml', '<p:sp/>'); z.writestr('ppt/slides/slide2.xml', pil)
L.cek_ada_pil(ada)
try: L.cek_ada_pil(tanpa); sys.exit('cek_ada_pil meloloskan deck tanpa pil di slide pertama')
except RuntimeError: pass
`
  const r = spawnSync(PY, ['-c', kode], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } })
  assert.equal(r.status, 0, r.stderr || r.stdout)
})
