// Gerbang registry bencana (ARSITEKTUR.md §3.3 butir 1 dan 8, FASE-0 tahap A5 dan A8).
//
// public/bencana.json sumber tunggal; src/bencana.generated.js dibangkitkan darinya
// (worker tidak boleh mengimpor JSON langsung). Gerbang ini menagih: skema sah,
// id unik, bencana non-mati punya halaman, dan modul bangkitan tidak basi.
// Tiap gerbang dibuktikan BISA MERAH lewat salinan sementara di dalam uji ini;
// berkas asli tidak pernah dirusak.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const PY = join(ROOT, 'scripts/umum')
const reg = () => JSON.parse(readFileSync(join(ROOT, 'public/bencana.json'), 'utf8'))

// skema: satu-satunya penegak ada di bencana.py (periksa); uji ini memanggilnya, bukan menyalin aturannya
const skema = (r) =>
  JSON.parse(
    execFileSync(
      'python3',
      ['-c', 'import sys, json; sys.path.insert(0, sys.argv[1]); import bencana; print(json.dumps(bencana.periksa(json.load(sys.stdin))))', PY],
      { cwd: ROOT, encoding: 'utf8', input: JSON.stringify(r) },
    ),
  )
const bangkit = (r) =>
  execFileSync(
    'python3',
    ['-c', 'import sys, json; sys.path.insert(0, sys.argv[1]); import bencana; sys.stdout.write(bencana.bangkitkan(json.load(sys.stdin)))', PY],
    { cwd: ROOT, encoding: 'utf8', input: JSON.stringify(r) },
  )

const idGanda = (r) => r.bencana.map((b) => b.id).filter((id, i, a) => a.indexOf(id) !== i)
const halamanHilang = (r, akar) =>
  r.bencana.filter((b) => b.status !== 'mati' && !existsSync(join(akar, 'public', b.rute, 'index.html'))).map((b) => `${b.id}: public${b.rute}index.html`)
const basi = (akar) =>
  readFileSync(join(akar, 'src/bencana.generated.js'), 'utf8') !== bangkit(JSON.parse(readFileSync(join(akar, 'public/bencana.json'), 'utf8')))

test('cek: skema registry sah (python3 scripts/umum/bencana.py cek hijau)', () => {
  assert.deepEqual(skema(reg()), [])
  execFileSync('python3', [join(PY, 'bencana.py'), 'cek'], { cwd: ROOT, stdio: 'pipe' })
  execFileSync('python3', [join(PY, 'bencana.py')], { cwd: ROOT, stdio: 'pipe' }) // self-check __main__
})

// Tahap buka bertahap (keputusan pemilik 16 Okt 2026): halaman jadi = 'uji' (menu: Segera),
// terverifikasi = 'aktif'. Tabel ini dibalik SENGAJA saat satu modul naik tahap; jangan dilonggarkan.
const TAHAP = { karhutla: 'aktif', banjir: 'aktif', gempa: 'aktif', cuaca: 'uji', udara: 'aktif', gunungapi: 'aktif', kekeringan: 'aktif' }

test('registry mengikuti tabel tahap per bencana', () => {
  const o = Object.fromEntries(reg().bencana.map((b) => [b.id, b]))
  assert.deepEqual(Object.fromEntries(reg().bencana.map((b) => [b.id, b.status])), TAHAP)
  assert.equal(o.karhutla.rute, '/')
  assert.equal(o.banjir.rute, '/banjir/')
})

test('id unik', () => {
  assert.deepEqual(idGanda(reg()), [])
})

test('bencana non-mati punya halaman', () => {
  assert.deepEqual(halamanHilang(reg(), ROOT), [])
  // rute karhutla dan banjir menunjuk dua halaman yang dimaksud spesifikasi
  assert.ok(existsSync(join(ROOT, 'public/index.html')) && existsSync(join(ROOT, 'public/banjir/index.html')))
  // tiap bencana tahap 'uji' juga sudah punya halamannya (itulah arti 'uji')
  for (const [id, st] of Object.entries(TAHAP)) if (st === 'uji') assert.ok(existsSync(join(ROOT, 'public', id, 'index.html')), id)
})

test('src/bencana.generated.js identik dengan hasil membangkitkan ulang', () => {
  assert.ok(!basi(ROOT), 'src/bencana.generated.js basi; jalankan: npm run bencana:js')
})

test('gerbang bisa merah: salinan sementara yang dirusak ditolak', () => {
  // 1. skema: id ganda, status liar, rute tanpa garis miring penutup, awalan ganda
  const a = reg()
  a.bencana[1].id = 'karhutla'
  assert.ok(idGanda(a).length, 'idGanda tidak melihat id ganda')
  assert.ok(skema(a).some((s) => s.includes('ganda')), 'skema meloloskan id ganda')
  const b = reg()
  b.bencana[2].status = 'beta'
  b.bencana[2].rute = '/gempa'
  b.bencana[3].kejadian.awalan = 'G'
  const g = skema(b).join('\n')
  for (const kata of ['status', 'diawali dan diakhiri', 'awalan']) assert.ok(g.includes(kata), `skema meloloskan: ${kata}`)

  // 2. halaman: akar sementara berisi halaman semua bencana non-mati KECUALI banjir
  const t = mkdtempSync(join(tmpdir(), 'bencana-'))
  mkdirSync(join(t, 'public/banjir'), { recursive: true })
  mkdirSync(join(t, 'src'), { recursive: true })
  const r = reg()
  for (const x of r.bencana) {
    if (x.status === 'mati' || x.id === 'banjir') continue
    mkdirSync(join(t, 'public', x.rute), { recursive: true })
    writeFileSync(join(t, 'public', x.rute, 'index.html'), '<!doctype html>')
  }
  assert.ok(existsSync(join(t, 'public/cuaca/index.html')), 'akar sementara harus memuat halaman bencana tahap uji')
  assert.deepEqual(halamanHilang(r, t), ['banjir: public/banjir/index.html'])
  writeFileSync(join(t, 'public/banjir/index.html'), '<!doctype html>')
  assert.deepEqual(halamanHilang(r, t), [])

  // 3. kesegaran: modul bangkitan yang disunting tangan atau tertinggal dari JSON ditolak
  writeFileSync(join(t, 'public/bencana.json'), JSON.stringify(r))
  writeFileSync(join(t, 'src/bencana.generated.js'), bangkit(r))
  assert.ok(!basi(t), 'salinan segar dianggap basi')
  writeFileSync(join(t, 'src/bencana.generated.js'), bangkit(r) + '// sunting tangan\n')
  assert.ok(basi(t), 'modul yang disunting tangan lolos')
  writeFileSync(join(t, 'src/bencana.generated.js'), bangkit(r))
  r.bencana[0].warna = '#000000'
  writeFileSync(join(t, 'public/bencana.json'), JSON.stringify(r))
  assert.ok(basi(t), 'JSON berubah tanpa membangkitkan ulang lolos')
})
