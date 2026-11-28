/* Gerbang DP-22 (data/kajian-bnpb/dampak-peringatan/RENCANA-UJI.md P3, P4, P5, P25, N13; KEPUTUSAN D8, D18, D25, D32, K11, K15).
   Aturan: tanpa kata terlarang dan titik tengah di teks buatan kita, tanpa kunci desa di keluaran publik, satu modul bersama,
   kunci registri kemampuan.layar.status_dampak, pembulatan di keluaran. Literal warna: gerbang-token-warna.test.mjs (tema.css saja). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { berkas, baca } from './fixtures/ratchet.mjs'
import { KATA_DILARANG } from '../dampak-peringatan/kata_dilarang.mjs'

const PY = 'scripts/siklus/dampak_peringatan.py'
const KLIEN = ['public/inti/dampak_peringatan.js', 'public/inti/dampak_peringatan.css', 'public/lapor/dampak_peringatan.js', 'public/bnpb/dalops_dampak.js']
const BUILDER = [PY, 'scripts/prediksi/status_prakiraan.py', 'src/dampak_peringatan.js']
const DOCS = ['docs/centurisk97/panduan/prediksi/09-status-dampak.md', 'docs/centurisk97/pengembang/prediksi/12-status-dampak.md']
const kata = (daftar) => new RegExp(`\\b(${daftar.join('|')})\\b`, 'i')
/* komentar dan daftar KATA_DILARANG sendiri bukan teks tampil */
const teksTampil = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/"""[\s\S]*?"""/g, '').replace(/^\s*#.*$/gm, '').replace(/^KATA_DILARANG\b.*$/m, '')
const temuan = (s, daftar = KATA_DILARANG) => [...(s.match(new RegExp(kata(daftar).source + '|·', 'gi')) || [])]
const AKAR_PY = (kode) => spawnSync('python3', ['-I', '-c', `import sys,json;sys.path[:0]=['scripts/siklus','scripts'];import dampak_peringatan as d;${kode}`], { encoding: 'utf8', cwd: new URL('../..', import.meta.url).pathname })

test('P25: KATA_DILARANG Python sama persis dengan JS', () => {
  const py = baca(PY).match(/^KATA_DILARANG\s*=\s*\(([^)]*)\)/m)
  assert.ok(py, `KATA_DILARANG tidak ditemukan di ${PY}`)
  const daftar = [...py[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  assert.deepEqual(daftar, KATA_DILARANG, 'dua daftar kata dilarang berbeda; sunting keduanya (D32): tests/dampak-peringatan/kata_dilarang.mjs dan ' + PY)
})

test('P4/N13: teks tampil bebas kata terlarang dan titik tengah (klien, pembangun, docs)', () => {
  const masalah = []
  for (const f of [...KLIEN, ...BUILDER]) for (const t of temuan(teksTampil(baca(f)))) masalah.push(`${f}: "${t}"`)
  /* docs boleh menyebut "korban" untuk menyangkalnya ("bukan jumlah korban"); kata lain tetap dilarang */
  for (const f of DOCS) for (const t of temuan(baca(f), KATA_DILARANG.filter((k) => k !== 'korban'))) masalah.push(`${f}: "${t}"`)
  assert.deepEqual(masalah, [], 'kata terlarang menjanjikan keselamatan atau klaim korban; ganti dengan kalimat polos tanpa klaim, pisahkan dengan koma bukan titik tengah\n' + masalah.join('\n'))
})

test('pemeriksa kata: pelanggaran tertangkap', () => {
  for (const s of ['wilayah aman', 'jumlah terdampak', 'a · b', 'Bebas api']) assert.ok(temuan(teksTampil(`const x = "${s}"`)).length, s)
  assert.equal(temuan(teksTampil('/* aman */ const tautanAman = 1 // korban')).length, 0)
})

/* ---- kunci publik (D18, P5) ---- */
const TERLARANG = ['desa', 'kd', 'jiwa_jk', 'rentan', 'balita', 'lansia', 'titik', 'nama_fasilitas', 'fasilitas_nama']
const kunciDi = (o, jalur = '') => (o && typeof o === 'object')
  ? Object.entries(o).flatMap(([k, v]) => [...(TERLARANG.includes(k) ? [`${jalur}/${k}`] : []), ...kunciDi(v, `${jalur}/${k}`)]) : []
const kunciSpekWorker = (src) => [...(src.split('const SPEK')[0].match(/\b[a-z_0-9]+(?=:\s)/g) || [])]

test('P5: daftar izin Python dan Worker tanpa kunci tingkat desa', () => {
  const py = baca(PY)
  const izin = [...py.match(/^KUNCI_IZIN_KAB\s*=\s*\(([^)]*)\)/m)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  const tolak = [...py.match(/^KUNCI_TERLARANG\s*=\s*\(([^)]*)\)/m)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  assert.deepEqual(tolak, TERLARANG, `${PY} KUNCI_TERLARANG berubah; daftar gerbang ini harus sama atau lebih ketat (D18)`)
  assert.deepEqual(izin.filter((k) => TERLARANG.includes(k)), [], 'daftar izin kab publik memuat kunci tingkat desa; keluarkan dari KUNCI_IZIN_KAB')
  const w = kunciSpekWorker(baca('src/dampak_peringatan.js')).filter((k) => TERLARANG.includes(k))
  assert.deepEqual(w, [], 'penyaring publik src/dampak_peringatan.js meloloskan kunci tingkat desa; hapus dari spek (D18, R2 desa hanya untuk staf)')
  const gagal = AKAR_PY("assert d.kunci_terlarang({'kab':{'x':[{'desa':{}}]}})==['/kab/x/0/desa'];assert d.paparan_publik(None) is None")
  assert.equal(gagal.status, 0, gagal.stderr)
})

test('pemeriksa kunci: kunci desa bersarang tertangkap (mutasi dalam memori)', () => {
  assert.deepEqual(kunciDi({ kab: { 1101: { bahaya: { BNJ: { desa: {} } } } } }), ['/kab/1101/bahaya/BNJ/desa'])
  assert.deepEqual(kunciDi({ kab: { 1101: { nama: 'x' } } }), [])
  assert.ok(kunciSpekWorker(baca('src/dampak_peringatan.js') + '').length > 5, 'penyaring spek tidak terbaca')
  assert.ok(kunciSpekWorker('desa: P, ' + baca('src/dampak_peringatan.js')).includes('desa'), 'mutasi desa tidak tertangkap')
})

/* ---- satu modul bersama ---- */
const FUNGSI = ['modelKartu', 'bulatJiwa', 'bolehTampil']
const definisi = (f, teks) => new RegExp(`(function\\s+${f}\\b|\\b(?:const|let|var)\\s+${f}\\s*=)`).test(teks)
const kandidat = () => ['public', 'src'].flatMap((d) => berkas(d, /\.js$/)).filter((f) => !/^public\/docs\//.test(f))

test('satu modul bersama: logika status dan warna hanya di public/inti/dampak_peringatan.js', () => {
  const salah = []
  for (const f of kandidat()) {
    if (f === 'public/inti/dampak_peringatan.js') continue
    const teks = baca(f)
    for (const fn of FUNGSI) if (definisi(fn, teks)) salah.push(`${f} mendefinisikan ${fn}`)
  }
  assert.deepEqual(salah, [], 'salinan logika status; pakai globalThis.DampakPeringatan dari public/inti/dampak_peringatan.js (D25, tanpa salinan per halaman)\n' + salah.join('\n'))
  const asli = baca('public/inti/dampak_peringatan.js')
  for (const fn of FUNGSI) assert.ok(definisi(fn, asli), `${fn} hilang dari modul bersama`)
  assert.ok(definisi('bulatJiwa', 'function bulatJiwa(){}'), 'pemeriksa: salinan harus tertangkap'); assert.ok(!definisi('bulatJiwa', 'x.bulatJiwa()'))
})

/* ---- registri (K11, K15) ---- */
test('registri: kemampuan.layar.status_dampak per bahaya, JSON dan bangkitan sama', async () => {
  const harap = { karhutla: ['kht'], banjir: ['bnj', 'lsr'], cuaca: ['cex'], kekeringan: ['kek'], pesisir: ['gel'], gempa: [], gunungapi: [] }
  const j = JSON.parse(baca('public/bencana.json')).bencana
  const gen = (await import('../../src/bencana.generated.js')).default
  const peta = (a) => Object.fromEntries((Array.isArray(a) ? a : Object.values(a)).map((e) => [e.id, e.kemampuan?.layar?.status_dampak]))
  const pj = peta(j), pg = peta(gen.bencana ?? gen)
  for (const [id, kode] of Object.entries(harap)) {
    assert.deepEqual(pj[id], kode, `public/bencana.json ${id}: kemampuan.layar.status_dampak harus ${JSON.stringify(kode)} (K11, K15; gempa dan gunung api sengaja kosong)`)
    assert.deepEqual(pg[id], kode, `src/bencana.generated.js ${id} basi; jalankan python3 scripts/umum/bencana.py js`)
  }
  assert.notDeepEqual({ ...pj, banjir: [] }.banjir, harap.banjir, 'pemeriksa registri')
})

/* ---- pembulatan (D8, P3) ---- */
test('P3: pembulatan di keluaran Python dan klien, tanpa angka mentah', async () => {
  const r = AKAR_PY('print(json.dumps([d.bulat(x) for x in (7,10,54,55,99,100,995,54308,1083781,None,0)]))')
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(JSON.parse(r.stdout), ['kurang dari 10', 10, 50, 60, 100, 100, 1000, 54000, 1100000, null, 0], 'pembulatan keluaran berubah (ALGORITMA 4)')
  await import('../../public/inti/dampak_peringatan.js')
  const D = globalThis.DampakPeringatan
  assert.equal(D.bulatJiwa(1083781), 'sekitar 1.100.000'); assert.equal(D.bulatJiwa(54308), 'sekitar 54.000')
  assert.equal(D.bulatJiwa(null), 'belum terukur'); assert.equal(D.bulatJiwa(0), '0')
  assert.notEqual(D.bulatJiwa(54308), 'sekitar 54.308', 'pemeriksa: angka mentah harus tertangkap')
  const t = AKAR_PY("pp={'BNJ':{'1101':{'nama':'x','terliput':True,'penduduk_area_peringatan':{'worldpop':d.bulat(54308)},'jiwa_kelas':{'tinggi':d.bulat(7)}}}};print(json.dumps(d.paparan_publik({'kab':pp})))")
  assert.equal(t.status, 0, t.stderr)
  assert.ok(!/54308|\b7\b/.test(t.stdout), 'keluaran publik memuat angka mentah')
})
