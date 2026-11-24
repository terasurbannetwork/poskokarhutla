/* Gerbang Desa Waspada (DW-09; data/kajian-bnpb/desa-waspada/RENCANA-UJI.md §5, KEPUTUSAN-DESA K1-K5, D8, D14).
   SEBAB: daftar desa bisa terbaca sebagai stigma atau klaim; laju pembanding bukan laju kita; ambang Q2 tebakan; peluang adalah milik kab/kota.
   AKIBAT bila bocor: desa dicap pelaku/rawan, angka orang lain tampil sebagai angka kita, atau berkas terbit sebelum pemilik menjawab Q1.
   PERBAIKI: ubah keluaran/kode yang ditunjuk pesan; jangan melonggarkan gerbang ini. Pemeriksa murni diuji dengan fixture jahat. */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {AKAR, baca, buangKomentarJs} from './fixtures/ratchet.mjs'
import {muatCsv} from '../desa-waspada/_muat.mjs'

const ada = rel => fs.existsSync(AKAR + rel)
const KATA = /\b(pelaku|penyebab|rawan dibakar|aman|bebas api|padam|titik api)\b/i
const PEMBANDING = /(?<![\d.,])(?:0[.,]39|0[.,]116|11[.,]6)(?![\d])|(?<![\d.,])39\s?%/
const TERLARANG = ['sel', 'petak', 'titik', 'nama_orang', 'konsesi', 'pemilik']
const WAJIB = ['versi', 'dibuat', 'acuan', 'definisi', 'kolom', 'a', 'b', 'peluang', 'laju', 'batasan']
const CSV_KOLOM = ['kode desa', 'desa/kelurahan', 'kecamatan', 'kabupaten/kota', 'provinsi', 'titik panas 7 hari (VIIRS)', 'titik panas 24 jam (VIIRS)',
  'terakhir terdeteksi (WIB)', 'tahun terbakar 2012-2025', 'bagian di gambut', 'peluang kab/kota hari ke-1 (%)', 'peluang kab/kota hari ke-2 (%)',
  'peluang kab/kota hari ke-3 (%)', 'bujur', 'lintang', 'daftar']

const kunciSemua = (o, k = []) => { if (Array.isArray(o)) o.forEach(x => kunciSemua(x, k)); else if (o && typeof o === 'object') for (const [a, v] of Object.entries(o)) { k.push(a); kunciSemua(v, k) } return k }
const teksSemua = (o, t = []) => { if (typeof o === 'string') t.push(o); else if (Array.isArray(o)) o.forEach(x => teksSemua(x, t)); else if (o && typeof o === 'object') Object.values(o).forEach(x => teksSemua(x, t)); return t }
const desimal = v => typeof v === 'number' ? (String(v).split('.')[1] || '').length : 0

/** Pelanggaran dokumen desa_waspada.json; `q2` = pemilik sudah menjawab Q2. */
export function periksaJson(d, ukuran, q2 = false) {
  const t = []
  if (ukuran > 450 * 1024) t.push(`ukuran ${ukuran} B > 450 KB`)
  for (const k of WAJIB) if (!(k in d)) t.push(`kunci wajib "${k}" hilang`)
  for (const k of kunciSemua(d)) if (TERLARANG.includes(k)) t.push(`kunci terlarang "${k}"`)
  const K = Object.fromEntries((d.kolom || []).map((c, i) => [c, i]))
  for (const l of ['a', 'b']) for (const r of d[l]?.baris || []) {
    for (const c of ['lon', 'lat']) if (desimal(r[K[c]]) > 3) t.push(`${l}:${r[K.kd]} ${c} ${r[K[c]]} > 3 desimal`)
    for (const c of ['p1', 'p2', 'p3', 'tahun']) if (r[K[c]] === 0) t.push(`${l}:${r[K.kd]} ${c} = 0 (harus null bila tak terukur)`)
  }
  const ln = d.laju?.status; if (ln === 'lulus' && !q2) t.push('laju.status "lulus" padahal Q2 belum dijawab (hanya "lulus_sementara")')
  for (const grup of [d.laju?.kelompok, d.laju?.kepekaan?.noaa20]) for (const [n, g] of Object.entries(grup || {})) if (g && Math.abs(g.laju - 0.39) < 1e-9 || g && Math.abs(g.laju - 0.116) < 1e-9) t.push(`laju ${n} = ${g.laju} sama dengan angka pembanding`)
  const {a: _a, b: _b, ...sisa} = d
  for (const s of teksSemua(sisa)) { const m = s.match(KATA); if (m) t.push(`kata terlarang "${m[0]}" di JSON`); if (s.includes('·')) t.push('pemisah "·" di JSON'); if (PEMBANDING.test(s)) t.push(`angka pembanding di teks JSON: ${s.slice(0, 40)}`) }
  return t
}
/** Pelanggaran teks halaman (JS tanpa komentar, atau HTML). */
export function periksaTeks(src, nama) {
  const t = [], s = nama.endsWith('.js') ? buangKomentarJs(src) : src
  const m = s.match(KATA); if (m) t.push(`${nama}: kata terlarang "${m[0]}"`)
  if (s.includes('·')) t.push(`${nama}: pemisah "·"`)
  if (PEMBANDING.test(s)) t.push(`${nama}: angka pembanding (0,39 / 39% / 11,6)`)
  // peluang selalu peluang kab/kota: abaikan identitas kode (D.peluang, .peluang?, peluang:), sisanya wajib berdekatan dengan "kab/kota"
  const teks = s.replace(/\b(?:D|d)\.peluang\b\??\.?\w*|\bpeluang\s*:/g, '')
  for (const x of teks.matchAll(/peluang/gi)) {
    const sebelum = teks.slice(Math.max(0, x.index - 12), x.index).toLowerCase(), sesudah = teks.slice(x.index, x.index + 70).toLowerCase()
    if (/^peluang\s+desa/.test(sesudah) && !/\b(bukan|tidak)\s+$/.test(sebelum)) t.push(`${nama}: "peluang desa" tanpa penafian`)
    else if (!/kab(upaten)?\/kota/.test(sebelum + sesudah) && !/^peluang\s+desa/.test(sesudah) && !/^peluang\w/.test(sesudah)) t.push(`${nama}: "peluang" tanpa "kab/kota" di dekatnya: ...${teks.slice(Math.max(0, x.index - 12), x.index + 30)}...`)
  }
  return t
}

const sah = () => ({versi: 1, dibuat: 'x', acuan: 'x', definisi: {}, kolom: ['kd', 'p1', 'tahun', 'lon', 'lat'], peluang: {}, batasan: ['Peluang adalah peluang kab/kota.'],
  laju: {status: 'lulus_sementara', kelompok: {a: {laju: 0.3894}}}, a: {baris: [['1', 30, 5, 112.321, -3.264]]}, b: {baris: []}})

test('pemeriksa JSON: fixture sah lolos, tiap pelanggaran contoh MERAH', () => {
  assert.deepEqual(periksaJson(sah(), 1000), [])
  const jahat = f => { const d = sah(); f(d); return periksaJson(d, 1000) }
  assert.ok(jahat(d => { d.titik = [] }).length, 'kunci titik lolos')
  assert.ok(jahat(d => { d.a.baris[0][3] = 112.3214 }).length, '4 desimal lolos')
  assert.ok(jahat(d => { d.a.baris[0][1] = 0 }).length, 'p1 = 0 lolos')
  assert.ok(jahat(d => { d.laju.status = 'lulus' }).length, 'status lulus tanpa Q2 lolos')
  assert.ok(jahat(d => { d.laju.kelompok.a.laju = 0.39 }).length, 'laju 0,39 lolos')
  assert.ok(jahat(d => { d.laju.kelompok.a.laju = 0.116 }).length, 'laju 0,116 lolos')
  assert.ok(jahat(d => { d.batasan.push('Desa ini rawan dibakar') }).length, 'kata terlarang lolos')
  assert.ok(jahat(d => { d.batasan.push('A · B') }).length, '"·" lolos')
  assert.ok(jahat(d => { d.batasan.push('Laju pembanding 11,6%') }).length, '11,6 lolos')
  assert.ok(jahat(d => { delete d.laju }).length, 'kunci wajib hilang lolos')
  assert.ok(periksaJson(sah(), 451 * 1024).length, '> 450 KB lolos')
  assert.deepEqual((() => { const d = sah(); d.laju.status = 'lulus'; return periksaJson(d, 1000, true) })(), [], 'lulus sesudah Q2 dijawab harus boleh')
})

test('pemeriksa teks halaman: kata terlarang, pembanding, peluang tanpa kab/kota MERAH', () => {
  assert.deepEqual(periksaTeks('const a = "Peluang kab/kota hari 1"; D.peluang?.status', 'x.js'), [])
  for (const jahat of ['"desa aman"', '"bebas api"', '"pelaku"', '"penyebab"', '"titik api"', '"rawan dibakar"', '"A · B"', '"laju 39%"', '"0,39"', '"11,6"', '"Peluang desa hari 1"', '"Peluang hari ke-1 tinggi"'])
    assert.ok(periksaTeks(`const x = ${jahat}`, 'x.js').length, `${jahat} lolos`)
  assert.deepEqual(periksaTeks('// pelaku di komentar\nconst x = 1', 'x.js'), [], 'komentar tak dihitung')
  assert.deepEqual(periksaTeks('const n = 0.3894', 'x.js'), [], '0,3894 bukan 0,39')
})

test('layar nyata bersih: JS, HTML, dan JSON publik', () => {
  for (const f of ['public/desa-waspada/desa-waspada.js', 'public/desa-waspada/index.html']) assert.deepEqual(periksaTeks(baca(f), f), [])
  if (ada('public/data/desa_waspada.json')) { const s = fs.readFileSync(AKAR + 'public/data/desa_waspada.json'); assert.deepEqual(periksaJson(JSON.parse(s), s.length, q2Dijawab()), []) }
  if (ada('scripts/data/desa_waspada_laju.json')) { const l = JSON.parse(baca('scripts/data/desa_waspada_laju.json')); assert.notEqual(l.status, 'lulus' && !q2Dijawab() ? 'lulus' : null, 'desa_waspada_laju.json status "lulus" tanpa Q2') }
})

const baris = q => baca('data/kajian-bnpb/desa-waspada/KEPUTUSAN-DESA.md').split('\n').find(b => b.startsWith(`| ${q} |`)) || ''
const q2Dijawab = () => !/\[SEMENTARA/.test(baris('Q2'))
const q1Dijawab = () => !/\[SEMENTARA/.test(baris('Q1'))

test('terbit dijaga Q1: .assetsignore memuat berkas dan folder selama Q1 belum dijawab', () => {
  assert.ok(baris('Q1'), 'baris Q1 tidak ditemukan di KEPUTUSAN-DESA.md (format tabel berubah?)')
  if (q1Dijawab()) return
  const b = baca('public/.assetsignore').split('\n').map(s => s.trim())
  for (const p of ['data/desa_waspada.json', 'desa-waspada/']) assert.ok(b.includes(p), `SEBAB: Q1 belum dijawab pemilik, halaman dibangun tetapi tidak terbit. PERBAIKI: kembalikan baris "${p}" di public/.assetsignore (atau jawab Q1 di KEPUTUSAN-DESA.md lebih dulu)`)
})

test('status laju tak pernah "lulus" tanpa jawaban Q2 tercatat', () => {
  assert.ok(baris('Q2'), 'baris Q2 tidak ditemukan')
  if (q2Dijawab()) return
  const py = buangKomentarJs(baca('scripts/data/desa_waspada.py')).replace(/^\s*#.*$/gm, '')
  assert.doesNotMatch(py, /["']status["']\s*:\s*["']lulus["']/, 'desa_waspada.py menulis status "lulus" langsung; hanya "lulus_sementara" sebelum Q2')
  assert.doesNotMatch(py, /status\s*=\s*["']lulus["']/)
  const js = baca('public/desa-waspada/desa-waspada.js')
  assert.match(js, /status\s*!==\s*"lulus"/, 'layar harus menyalakan pil hipotesis kecuali status persis "lulus"')
})

test('kolom CSV sesuai DESAIN-TEKNIS §4 (16 kolom, urutan) dan kolom JSON memuat semuanya', () => {
  const {KOLOM_CSV} = muatCsv()
  assert.deepEqual([...KOLOM_CSV], CSV_KOLOM)
  if (ada('public/data/desa_waspada.json')) assert.deepEqual(JSON.parse(baca('public/data/desa_waspada.json')).kolom, ['kd', 'desa', 'kec', 'kab', 'prov', 'titik7', 'titik24', 'terakhir', 'tahun', 'tahun_akhir', 'gambut', 'p1', 'p2', 'p3', 'lon', 'lat'])
})

test('penetral CSV nyata menetralkan = + - @ tab CR', () => {
  const {netral} = muatCsv()
  for (const a of ['=', '+', '-', '@', '\t', '\r']) assert.equal(netral(a + 'x'), "'" + a + 'x')
})
