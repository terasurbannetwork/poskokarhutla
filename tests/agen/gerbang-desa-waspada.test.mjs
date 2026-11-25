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
const KOLOM16 = ['kd', 'desa', 'kec', 'kab', 'prov', 'titik7', 'titik24', 'terakhir', 'tahun', 'tahun_akhir', 'gambut', 'p1', 'p2', 'p3', 'lon', 'lat']
const WAJIB_PULAU = ['versi', 'dibuat', 'acuan', 'pulau', 'kolom', 'a', 'b']
const WAJIB_INDEKS = ['versi', 'dibuat', 'acuan', 'definisi', 'kolom', 'pulau', 'peluang', 'laju', 'batasan']
const DIR = 'public/data/desa_waspada/'
const CSV_KOLOM = ['kode desa', 'desa/kelurahan', 'kecamatan', 'kabupaten/kota', 'provinsi', 'titik panas 7 hari (VIIRS)', 'titik panas 24 jam (VIIRS)',
  'terakhir terdeteksi (WIB)', 'tahun terbakar 2012-2025', 'bagian di gambut', 'peluang kab/kota hari ke-1 (%)', 'peluang kab/kota hari ke-2 (%)',
  'peluang kab/kota hari ke-3 (%)', 'bujur', 'lintang', 'daftar']

const kunciSemua = (o, k = []) => { if (Array.isArray(o)) o.forEach(x => kunciSemua(x, k)); else if (o && typeof o === 'object') for (const [a, v] of Object.entries(o)) { k.push(a); kunciSemua(v, k) } return k }
const teksSemua = (o, t = []) => { if (typeof o === 'string') t.push(o); else if (Array.isArray(o)) o.forEach(x => teksSemua(x, t)); else if (o && typeof o === 'object') Object.values(o).forEach(x => teksSemua(x, t)); return t }
const desimal = v => typeof v === 'number' ? (String(v).split('.')[1] || '').length : 0

/** Pelanggaran satu berkas pulau (K8: batas 450 KB berlaku PER BERKAS). */
export function periksaPulau(d, ukuran) {
  const t = []
  if (ukuran > 450 * 1024) t.push(`ukuran ${ukuran} B > 450 KB`)
  for (const k of WAJIB_PULAU) if (!(k in d)) t.push(`kunci wajib "${k}" hilang`)
  for (const k of kunciSemua(d)) if (TERLARANG.includes(k)) t.push(`kunci terlarang "${k}"`)
  if (JSON.stringify(d.kolom) !== JSON.stringify(KOLOM16)) t.push(`kolom bukan 16 kolom tetap DESAIN-TEKNIS §3: ${JSON.stringify(d.kolom)}`)
  const K = Object.fromEntries((d.kolom || []).map((c, i) => [c, i]))
  for (const l of ['a', 'b']) for (const r of d[l]?.baris || []) {
    for (const c of ['lon', 'lat']) if (desimal(r[K[c]]) > 3) t.push(`${l}:${r[K.kd]} ${c} ${r[K[c]]} > 3 desimal`)
    for (const c of ['p1', 'p2', 'p3', 'tahun']) if (r[K[c]] === 0) t.push(`${l}:${r[K.kd]} ${c} = 0 (harus null bila tak terukur)`)
  }
  const {a: _a, b: _b, ...sisa} = d
  for (const s of teksSemua(sisa)) cekTeks(s, t)
  return t
}
function cekTeks(s, t) {
  const m = s.match(KATA); if (m) t.push(`kata terlarang "${m[0]}" di JSON`)
  if (s.includes('·')) t.push('pemisah "·" di JSON')
  if (PEMBANDING.test(s)) t.push(`angka pembanding di teks JSON: ${s.slice(0, 40)}`)
}
/** Pelanggaran indeks.json; Q2 sudah dijawab (K7) jadi "lulus" sah. */
export function periksaIndeks(d, ukuran = 0) {
  const t = []
  if (ukuran > 450 * 1024) t.push(`ukuran ${ukuran} B > 450 KB`)
  for (const k of WAJIB_INDEKS) if (!(k in d)) t.push(`kunci wajib "${k}" hilang`)
  for (const k of kunciSemua(d)) if (TERLARANG.includes(k)) t.push(`kunci terlarang "${k}"`)
  const dimiliki = {}
  for (const [n, p] of Object.entries(d.pulau || {})) for (const kp of p.provinsi || []) (dimiliki[kp] ||= []).push(n)
  for (const [kp, ns] of Object.entries(dimiliki)) if (ns.length !== 1) t.push(`provinsi ${kp} ada di ${ns.length} pulau (${ns.join(', ')}); harus tepat satu`)
  for (const [n, g] of Object.entries(d.laju?.kelompok || {})) if (g && (Math.abs(g.laju - 0.39) < 1e-9 || Math.abs(g.laju - 0.116) < 1e-9)) t.push(`laju ${n} = ${g.laju} sama dengan angka pembanding`)
  for (const [n, g] of Object.entries(d.laju?.kepekaan?.noaa20 || {})) if (g && (Math.abs(g.laju - 0.39) < 1e-9 || Math.abs(g.laju - 0.116) < 1e-9)) t.push(`laju noaa20 ${n} = ${g.laju} sama dengan angka pembanding`)
  for (const s of teksSemua(d)) cekTeks(s, t)
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

const sahPulau = () => ({versi: 1, dibuat: 'x', acuan: 'x', pulau: 'Jawa', kolom: [...KOLOM16],
  a: {baris: [['1', 'D', 'K', 'B', 'P', 3, 1, '2026-11-25 10:00', null, null, 0.2, 30, 20, 10, 112.321, -3.264]]}, b: {baris: []}})
const sahIndeks = () => ({versi: 2, dibuat: 'x', acuan: 'x', definisi: {}, kolom: [...KOLOM16], pulau: {Jawa: {berkas: 'jawa.json', provinsi: ['31', '32']}, Papua: {berkas: 'papua.json', provinsi: ['91']}},
  peluang: {}, batasan: ['Peluang adalah peluang kab/kota.'], laju: {status: 'lulus', kelompok: {a: {laju: 0.3894}}}})

test('pemeriksa berkas pulau: fixture sah lolos, tiap pelanggaran contoh MERAH', () => {
  assert.deepEqual(periksaPulau(sahPulau(), 1000), [])
  const jahat = f => { const d = sahPulau(); f(d); return periksaPulau(d, 1000) }
  assert.ok(jahat(d => { d.titik = [] }).length, 'kunci titik lolos')
  assert.ok(jahat(d => { d.a.baris[0][14] = 112.3214 }).length, '4 desimal lolos')
  assert.ok(jahat(d => { d.a.baris[0][11] = 0 }).length, 'p1 = 0 lolos')
  assert.ok(jahat(d => { d.a.baris[0][8] = 0 }).length, 'tahun = 0 lolos')
  assert.ok(jahat(d => { d.kolom.pop() }).length, '15 kolom lolos')
  assert.ok(jahat(d => { d.kolom.reverse() }).length, 'urutan kolom lolos')
  assert.ok(jahat(d => { d.catatan = 'Desa ini rawan dibakar' }).length, 'kata terlarang lolos')
  assert.ok(jahat(d => { d.catatan = 'A · B' }).length, '"·" lolos')
  assert.ok(jahat(d => { d.catatan = 'Laju pembanding 11,6%' }).length, '11,6 lolos')
  assert.ok(jahat(d => { delete d.pulau }).length, 'kunci wajib hilang lolos')
  assert.ok(periksaPulau(sahPulau(), 451 * 1024).length, '> 450 KB per berkas lolos')
})

test('pemeriksa indeks: fixture sah lolos (status lulus sah sesudah K7), pelanggaran MERAH', () => {
  assert.deepEqual(periksaIndeks(sahIndeks()), [])
  const jahat = f => { const d = sahIndeks(); f(d); return periksaIndeks(d) }
  assert.ok(jahat(d => { d.pulau.Papua.provinsi.push('31') }).length, 'provinsi di dua pulau lolos')
  assert.ok(jahat(d => { d.laju.kelompok.a.laju = 0.39 }).length, 'laju 0,39 lolos')
  assert.ok(jahat(d => { d.laju.kelompok.a.laju = 0.116 }).length, 'laju 0,116 lolos')
  assert.ok(jahat(d => { d.laju.kepekaan = {noaa20: {a: {laju: 0.39}}} }).length, 'laju noaa20 0,39 lolos')
  assert.ok(jahat(d => { d.batasan.push('Laju pembanding 39%') }).length, '39% lolos')
  assert.ok(jahat(d => { d.batasan.push('desa aman') }).length, 'kata terlarang lolos')
  for (const k of ['laju', 'peluang', 'batasan']) assert.ok(jahat(d => { delete d[k] }).length, `${k} hilang lolos`)
  assert.ok(jahat(d => { d.sel = [] }).length, 'kunci sel lolos')
})

test('pemeriksa teks halaman: kata terlarang, pembanding, peluang tanpa kab/kota MERAH', () => {
  assert.deepEqual(periksaTeks('const a = "Peluang kab/kota hari 1"; D.peluang?.status', 'x.js'), [])
  for (const jahat of ['"desa aman"', '"bebas api"', '"pelaku"', '"penyebab"', '"titik api"', '"rawan dibakar"', '"A · B"', '"laju 39%"', '"0,39"', '"11,6"', '"Peluang desa hari 1"', '"Peluang hari ke-1 tinggi"'])
    assert.ok(periksaTeks(`const x = ${jahat}`, 'x.js').length, `${jahat} lolos`)
  assert.deepEqual(periksaTeks('// pelaku di komentar\nconst x = 1', 'x.js'), [], 'komentar tak dihitung')
  assert.deepEqual(periksaTeks('const n = 0.3894', 'x.js'), [], '0,3894 bukan 0,39')
})

test('layar nyata bersih: JS, HTML, dan JSON publik per pulau', () => {
  for (const f of ['public/desa-waspada/desa-waspada.js', 'public/desa-waspada/index.html']) assert.deepEqual(periksaTeks(baca(f), f), [])
  assert.ok(!ada('public/data/desa_waspada.json'), 'SEBAB: K8 memecah keluaran per pulau. PERBAIKI: hapus public/data/desa_waspada.json (berkas lama), pakai folder public/data/desa_waspada/')
  if (!ada(DIR + 'indeks.json')) return
  const idx = JSON.parse(baca(DIR + 'indeks.json'))
  assert.deepEqual(periksaIndeks(idx, fs.statSync(AKAR + DIR + 'indeks.json').size), [])
  const berkas = Object.values(idx.pulau).map(p => p.berkas)
  assert.deepEqual(fs.readdirSync(AKAR + DIR).filter(f => f !== 'indeks.json' && f.endsWith('.json')).sort(), [...berkas].sort(), 'berkas pulau di folder harus persis yang tercatat di indeks.json')
  for (const f of berkas) { const s = fs.readFileSync(AKAR + DIR + f); assert.deepEqual(periksaPulau(JSON.parse(s), s.length), [], f) }
  assert.deepEqual(idx.kolom, KOLOM16)
  if (ada('scripts/data/desa_waspada_laju.json')) assert.ok(JSON.parse(baca('scripts/data/desa_waspada_laju.json')).status, 'desa_waspada_laju.json tanpa status')
})

const baris = q => baca('data/kajian-bnpb/desa-waspada/KEPUTUSAN-DESA.md').split('\n').find(b => b.startsWith(`| ${q} |`)) || ''
const q1Dijawab = () => !/\[SEMENTARA/.test(baris('Q1'))
const q2Dijawab = () => !/\[SEMENTARA/.test(baris('Q2'))

test('terbit dijaga Q1: sebelum dijawab .assetsignore memuat folder; sesudah (K6) TIDAK boleh memuatnya', () => {
  assert.ok(baris('Q1'), 'baris Q1 tidak ditemukan di KEPUTUSAN-DESA.md (format tabel berubah?)')
  const b = baca('public/.assetsignore').split('\n').map(s => s.trim()).filter(x => x && !x.startsWith('#'))
  const kena = b.filter(x => /desa-waspada|desa_waspada/.test(x))
  if (q1Dijawab()) assert.deepEqual(kena, [], `SEBAB: K6 menetapkan /desa-waspada publik. AKIBAT: baris ${kena.join(', ')} di public/.assetsignore menahan halaman dan data dari produksi. PERBAIKI: hapus baris itu`)
  else for (const p of ['data/desa_waspada/', 'desa-waspada/']) assert.ok(b.includes(p), `SEBAB: Q1 belum dijawab pemilik. PERBAIKI: kembalikan baris "${p}" di public/.assetsignore atau jawab Q1 di KEPUTUSAN-DESA.md`)
})

test('pil hipotesis laju: "lulus" diizinkan (K7), pil tetap muncul bila status bukan persis "lulus"', () => {
  assert.ok(baris('Q2'), 'baris Q2 tidak ditemukan')
  const js = baca('public/desa-waspada/desa-waspada.js')
  assert.match(js, /status\s*!==\s*"lulus"/, 'layar harus menyalakan pil hipotesis kecuali status persis "lulus"')
  if (!q2Dijawab()) {
    const py = buangKomentarJs(baca('scripts/data/desa_waspada.py')).replace(/^\s*#.*$/gm, '')
    assert.doesNotMatch(py, /["']status["']\s*:\s*["']lulus["']/, 'Q2 belum dijawab: hanya "lulus_sementara"')
  }
})

test('kolom CSV sesuai DESAIN-TEKNIS §4 (16 kolom, urutan)', () => {
  const {KOLOM_CSV} = muatCsv()
  assert.deepEqual([...KOLOM_CSV], CSV_KOLOM)
})

test('penetral CSV nyata menetralkan = + - @ tab CR', () => {
  const {netral} = muatCsv()
  for (const a of ['=', '+', '-', '@', '\t', '\r']) assert.equal(netral(a + 'x'), "'" + a + 'x')
})
