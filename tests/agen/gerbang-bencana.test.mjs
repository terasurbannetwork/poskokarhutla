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
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const TAHAP = { karhutla: 'aktif', banjir: 'aktif', gempa: 'aktif', cuaca: 'aktif', udara: 'aktif', gunungapi: 'aktif', kekeringan: 'aktif', pesisir: 'aktif' }

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
  const gp = b.bencana.find((x) => x.id === 'gempa')
  gp.status = 'beta'
  gp.rute = '/gempa'
  b.bencana.find((x) => x.id === 'cuaca').kejadian.awalan = 'G' // G = awalan gempa
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

// ---- PB-04: kunci `kemampuan` dan pemetaan logbook (paritas-bencana TIKET PB-04) ----

// Kemampuan yang menyala (true / tidak kosong) wajib punya pemakai nyata: satu berkas di src/ atau public/
// (di luar registry dan modul bangkitan) yang menyebut `kemampuan` dan nama kuncinya. Tanpa itu kunci
// menyala hanya mengaku, tidak mengubah apa pun. Jangan dilonggarkan: tulis pemakainya, bukan kuncinya dicabut.
const bacaKode = (dir) => {
  const h = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) h.push(...bacaKode(p))
    else if (/\.(m?js|html)$/.test(e.name) && !/bencana\.generated\.js$/.test(e.name)) h.push(readFileSync(p, 'utf8'))
  }
  return h
}
const menyala = (k) => {
  const n = []
  for (const x of ['operasi', 'ekonomi', 'pencegahan', 'prioritas']) if (k[x] === true) n.push(x)
  if (k.dokumen.length) n.push('dokumen')
  if (k.renlap.sarana.length || k.renlap.bobot) n.push('renlap')
  if (k.ews.kunci.length || k.ews.tangga) n.push('ews')
  if (k.dasbor.ringkas || k.dasbor.papan_sk) n.push('dasbor')
  return n
}
const tanpaPemakai = (r, kode) => {
  const h = []
  for (const b of r.bencana)
    for (const n of menyala(b.kemampuan))
      if (!kode.some((s) => s.includes('kemampuan') && s.includes(n))) h.push(`${b.id}: kemampuan.${n}`)
  return h
}

test('PB-04: tiap entri punya kemampuan berbentuk sah (penegak: bencana.py periksa)', () => {
  const r = reg()
  for (const b of r.bencana) assert.ok(b.kemampuan && typeof b.kemampuan === 'object', `${b.id}: kunci kemampuan hilang; tambahkan ke public/bencana.json lalu npm run bencana:js`)
  assert.deepEqual(skema(r), [])
})

test('PB-04: kemampuan menyala punya pemakai nyata di src/ atau public/', () => {
  const kode = [...bacaKode(join(ROOT, 'src')), ...bacaKode(join(ROOT, 'public'))]
  assert.deepEqual(tanpaPemakai(reg(), kode), [], 'kemampuan menyala tanpa pemakai: tulis kode yang membacanya (menyebut `kemampuan` dan kuncinya) atau matikan kuncinya di public/bencana.json')
})

// Q1 (bawaan sementara): longsor belum punya entri registri; satu-satunya pengecualian, plafon 1, tidak boleh bertambah.
const PENGECUALIAN_LOGBOOK = ['longsor']

test('PB-04: JENIS_LOGBOOK_KE_BENCANA menunjuk id registri yang ada', async () => {
  const { JENIS_LOGBOOK_KE_BENCANA: peta } = await import(join(ROOT, 'src/bencana.generated.js'))
  const id = new Set(reg().bencana.map((b) => b.id))
  const liar = Object.entries(peta).filter(([, v]) => !id.has(v)).map(([j, v]) => `${j} -> ${v}`)
  assert.deepEqual(liar.map((s) => s.split(' -> ')[1]).sort(), PENGECUALIAN_LOGBOOK, `pemetaan logbook ke id tak terdaftar: ${liar.join(', ')}; daftarkan bencananya di public/bencana.json (jangan menambah pengecualian)`)
  assert.equal(peta.gelombang_pasang, 'pesisir')
  assert.equal(peta.abrasi, 'pesisir')
})

test('PB-04: fixture jahat ditolak (gerbang tidak buta)', () => {
  // bentuk
  const a = reg()
  delete a.bencana[0].kemampuan
  assert.ok(skema(a).some((s) => s.includes('kemampuan')), 'kemampuan hilang lolos')
  const b = reg()
  b.bencana[1].kemampuan.operasi = 'ya'
  b.bencana[1].kemampuan.renlap.sarana = ['roket']
  const g = skema(b).join('\n')
  assert.ok(g.includes('operasi harus bool') && g.includes("'roket' tidak dikenal"), 'bentuk liar lolos')
  // pemakai: kunci menyala tanpa kode pembacanya
  const c = reg()
  c.bencana[0].kemampuan.operasi = true
  c.bencana[2].kemampuan.ews.tangga = true
  assert.deepEqual(tanpaPemakai(c, ['const x = 1']), ['karhutla: kemampuan.operasi', 'pesisir: kemampuan.ews'])
  assert.deepEqual(tanpaPemakai(c, ['b.kemampuan.operasi; b.kemampuan.ews']), [])
  assert.deepEqual(tanpaPemakai(reg(), []), [], 'registri bersih (semua mati) harus lolos tanpa pemakai')
  // generated basi terhadap kemampuan
  const t = mkdtempSync(join(tmpdir(), 'bencana-kmp-'))
  mkdirSync(join(t, 'src'), { recursive: true })
  mkdirSync(join(t, 'public'), { recursive: true })
  writeFileSync(join(t, 'public/bencana.json'), JSON.stringify(c))
  writeFileSync(join(t, 'src/bencana.generated.js'), bangkit(reg()))
  assert.ok(basi(t), 'kemampuan berubah tanpa membangkitkan ulang lolos')
})
