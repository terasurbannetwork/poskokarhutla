// Pemilik 9 Nov 2026: Laporan Penanganan Karhutla tanpa pil CUT OFF DATA di kanan atas, seterusnya; jam data cukup di kaki Sumber.
// Laporan Kejadian Bencana Harian tidak kena aturan ini.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const BERKAS = 'data/laporan-bnpb/generator/lewat_deck.py'
const PY = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')

test('bingkai format penanganan membuang pil dan menagihnya di hasil akhir', () => {
  const s = fs.readFileSync(BERKAS, 'utf8')
  const blok = s.slice(s.indexOf("if format == 'penanganan':   # pemilik 8 Nov"), s.indexOf('shutil.copyfile(pptx, isi)'))
  assert.match(blok, /buang_pil_cutoff\(pptx\)/, 'bingkai penanganan tidak memanggil buang_pil_cutoff')
  assert.match(s, /if format == 'penanganan':[^\n]*cek_tanpa_pil\(keluar\)/, 'hasil akhir penanganan tidak diperiksa cek_tanpa_pil')
})

test('buang_pil_cutoff membuang latar dan teks pil, bentuk lain utuh', () => {
  const kode = String.raw`
import os, sys, tempfile, zipfile
sys.path.insert(0, 'data/laporan-bnpb/generator')
import lewat_deck as L
letak = '<a:off x="8849380" y="896112"/><a:ext cx="2793675" cy="228600"/>'
latar = f'<p:sp>{letak}<a:prstGeom prst="roundRect"/></p:sp>'
teks = f'<p:sp>{letak}<a:t>CUT OFF DATA   </a:t></p:sp>'
lain = '<p:sp><a:off x="1" y="2"/><a:ext cx="3" cy="4"/><a:t>Sumber: 18.00 WIB</a:t></p:sp>'
f = os.path.join(tempfile.mkdtemp(), 'u.pptx')
with zipfile.ZipFile(f, 'w') as z: z.writestr('ppt/slides/slide1.xml', latar + teks + lain)
try: L.cek_tanpa_pil(f); sys.exit('cek_tanpa_pil meloloskan pil')
except RuntimeError: pass
L.buang_pil_cutoff(f); L.cek_tanpa_pil(f)
x = zipfile.ZipFile(f).read('ppt/slides/slide1.xml').decode()
assert x == lain, x
`
  const r = spawnSync(PY, ['-c', kode], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } })
  assert.equal(r.status, 0, r.stderr || r.stdout)
})
