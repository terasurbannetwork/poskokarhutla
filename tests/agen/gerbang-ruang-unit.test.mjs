// Gerbang Ruang Unit G-4 dan G-6 (tiket RU-023; data/kajian-bnpb/kedeputian/RENCANA-UJI.md §6.1 butir a sampai f,
// KEAMANAN-PRIVASI.md §2.3, §3.2, §9.3; DESAIN-TEKNIS.md §1.4, §4.6, §4.9).
//
// Menjalankan kode nyata: src/unit.js dan src/gerbang_halaman.js diimpor (lewat src/worker.js yang memasang tabel rute),
// public/bnpb/unit/katalog.js dan rapor.js dijalankan di vm bersama public/inti/format.js asli. Tiap pemeriksa adalah
// fungsi murni yang diuji menolak masukan palsu di berkas ini (pola gerbang-anggaran-cf.test.mjs).
//
// BUTIR a, SENGAJA BERBEDA DARI RU §6.1: RU meminta /bnpb/unit dan /bnpb/unit/<kode> tercatat di HTML_RUTE. DESAIN-TEKNIS
// §1.4 butir 1 (yang dibangun RU-019) meminta kebalikannya: /bnpb/unit* dikecualikan dari halamanTerkunci, karena gerbang
// host centurisk97.id hanya meloloskan admin, operator_cc, Direktori, dan PERAN_DALOPS, sehingga staf berperan `unit`
// akan dipantulkan. Jalur yang ada di HTML_RUTE selalu dianggap terkunci oleh gerbang host (gerbang_halaman.js
// halamanTerkunci), jadi syarat RU dan syarat DT tidak bisa sama-sama benar. Gerbang ini mengikuti DT: jalur unit TIDAK
// di HTML_RUTE, TIDAK di PUBLIK_TANPA_SESI, halamanTerkunci menjawab false, dan rute halaman di src/unit.js memeriksa
// stafOK sendiri sebelum menyajikan apa pun. Dicatat di TIKET.md baris RU-023.
//
// Hanya builtin Node, tanpa DB, tanpa jaringan.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, resolve, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const baca = (p) => readFileSync(resolve(ROOT, p), 'utf8')
const DOK = 'data/kajian-bnpb/kedeputian/'
const FIXTURE_R2 = 'tests/bnpb/fixtures/unit/r2'
const CAKUPAN = 'tests/bnpb/unit_cakupan.json'
const ANTRE_PLAFON = 42   // plafon keras antre (26 Nov 2026); hanya boleh diturunkan tangan

const PERBAIKI = (s, a, c) => `SEBAB: ${s} AKIBAT: ${a} CARA MEMPERBAIKI: ${c}`

// ---------- muat kode nyata ----------
await import(pathToFileURL(resolve(ROOT, 'src/worker.js')).href)   // memasang tabel rute untuk halamanTerkunci
const G = await import(pathToFileURL(resolve(ROOT, 'src/gerbang_halaman.js')).href)
const U = await import(pathToFileURL(resolve(ROOT, 'src/unit.js')).href)
const SRC_UNIT = baca('src/unit.js')

const ctx = { window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN }
vm.createContext(ctx)
vm.runInContext(baca('public/inti/format.js') + '\n;globalThis.esc = esc; globalThis.fmt = fmt;', ctx)
vm.runInContext(baca('public/bnpb/unit/katalog.js'), ctx)
vm.runInContext(baca('public/bnpb/unit/rapor.js'), ctx)
const K = ctx.window.UnitKatalog, R = ctx.window.UnitRapor

function berkasDi(dir, re = /./) {
  const abs = resolve(ROOT, dir)
  if (!existsSync(abs)) return []
  const out = []
  for (const n of readdirSync(abs)) {
    const p = join(abs, n)
    if (statSync(p).isDirectory()) out.push(...berkasDi(relative(ROOT, p), re))
    else if (re.test(n) && !/ 2\./.test(n)) out.push(relative(ROOT, p))
  }
  return out
}

/** Tabel KEPUTUSAN-AWAL §5.1 -> Map(id -> fase). */
export function tabelKA(teks) {
  const a = teks.indexOf('### 5.1'), b = teks.indexOf('\n#', a + 8)
  const m = new Map()
  for (const baris of teks.slice(a, b < 0 ? undefined : b).split('\n')) {
    const k = baris.split('|').map((x) => x.trim())
    if (/^[A-Z]{2,4}-\d$/.test(k[1] || '')) m.set(k[1], k[5])
  }
  return m
}
const KA = tabelKA(baca(DOK + 'KEPUTUSAN-AWAL.md'))
const F12 = [...KA].filter(([, f]) => /^F[12]\*?$/.test(f)).map(([id]) => id)

// =====================================================================
// butir a: staf saja
// =====================================================================

/** Gerbang host: jalur unit tidak publik, tidak di HTML_RUTE (DT §1.4 butir 1), tidak terkunci host. */
export function periksaGerbangHalaman({ htmlRute, publik, terkunci, jalur }) {
  const g = []
  for (const j of jalur) {
    if (publik.has(j)) g.push(`${j} ada di PUBLIK_TANPA_SESI (tamu bisa membuka Ruang Unit)`)
    if (htmlRute.some(([re]) => re.test(j))) g.push(`${j} cocok dengan HTML_RUTE (gerbang host memantulkan staf berperan unit, DT §1.4 butir 1)`)
    if (terkunci(new URL(j, 'https://centurisk97.id'))) g.push(`${j}: halamanTerkunci menjawab true (staf berperan unit dipantulkan gerbang host)`)
  }
  return g
}

/** Badan fungsi bernama di teks sumber (sampai baris '}' pertama di kolom 0). */
function badan(src, nama) {
  const i = src.search(new RegExp(`(?:async\\s+)?function\\s+${nama}\\s*\\(`))
  if (i < 0) return null
  const j = src.indexOf('\n}', i)
  return src.slice(i, j < 0 ? undefined : j + 2)
}

/** Teks pemeriksaan hak tiap rute: fungsi bernama dipakai langsung, pembungkus panah diikuti ke fungsi yang dipanggilnya. */
export function teksRute(src, fn) {
  if (fn.name && !/^(?:anonymous)?$/.test(fn.name) && badan(src, fn.name)) return badan(src, fn.name)
  const t = fn.toString(), m = t.match(/=>\s*(?:await\s+)?([A-Za-z_$][\w$]*)\s*\(/)
  return (m && badan(src, m[1])) || t
}

/** Tiap rute Ruang Unit memeriksa hak sebelum menyentuh R2, D1, aset, atau daftar nama. */
export function periksaRuteUnit(rute) {
  const g = []
  for (const [kunci, teks] of Object.entries(rute)) {
    const [metode, jalur] = kunci.split(' ')
    if (!/^\/(api\/unit|bnpb\/unit)(\/|$)/.test(jalur)) { g.push(`${kunci}: jalur di luar /bnpb/unit dan /api/unit`); continue }
    const hak = teks.search(/\b(?:stafOK|modAtauStaf)\s*\)?\s*\(/)   // juga (t ? modAtauStaf : stafOK)(...)
    if (hak < 0) { g.push(`${kunci}: tidak memanggil stafOK atau modAtauStaf`); continue }
    const sentuh = teks.search(/env\.(MEDIA|DB|ASSETS)\b|\bhalamanBnpbPublik\s*\(|\bDATA_UNIT\.includes\b/)
    if (sentuh >= 0 && sentuh < hak) g.push(`${kunci}: menyentuh data atau daftar nama sebelum memeriksa hak`)
    if (metode !== 'GET' && metode !== 'HEAD') {
      if (!/\bmodAtauStaf\s*\)?\s*\(/.test(teks) || /\bstafOK\s*\)?\s*\(/.test(teks)) g.push(`${kunci}: rute tulis wajib modAtauStaf (stafOK meloloskan akun gerbang AKUN_SITUS*, KA §8)`)
    }
    if (/:nama$/.test(jalur) && !(/\bDATA_UNIT_TERBATAS\b/.test(teks) && /\bmodAtauStaf\b/.test(teks)))
      g.push(`${kunci}: berkas kelas T (DATA_UNIT_TERBATAS) wajib lewat modAtauStaf`)
  }
  return g
}

/** KP §3.2: nama DATA_UNIT berkelas T, atau tidak tercatat, wajib di DATA_UNIT_TERBATAS. */
export function kelasKP(teks) {
  const a = teks.indexOf('### 3.2'), b = teks.indexOf('\n### ', a + 8)
  const m = new Map()
  for (const baris of teks.slice(a, b).split('\n')) {
    const k = baris.split('|').map((x) => x.trim())
    if (!k[1] || !/`/.test(k[1])) continue
    for (const [, n] of k[1].matchAll(/`([a-z0-9_]+)\.json`/g)) m.set(n, k[3])
  }
  return m
}
export function periksaKelas(dataUnit, terbatas, kelas) {
  const g = []
  for (const n of terbatas) if (!dataUnit.includes(n)) g.push(`${n} di DATA_UNIT_TERBATAS tetapi tidak di DATA_UNIT`)
  for (const n of dataUnit) {
    const k = kelas.get(n)
    if (k !== 'S' && !terbatas.includes(n)) g.push(`${n}: kelas ${k ?? 'tidak tercatat (= T)'} di KEAMANAN-PRIVASI §3.2 tetapi tidak di DATA_UNIT_TERBATAS`)
  }
  return g
}

/** Rute /api/unit atau /bnpb/unit yang ditulis di luar src/unit.js lolos dari pemeriksaan di atas. */
export function ruteLiar(berkas) {
  const g = []
  for (const [f, t] of Object.entries(berkas))
    for (const m of t.matchAll(/["'`](GET|POST|PUT|PATCH|DELETE|HEAD) \/(?:api\/unit|bnpb\/unit)\b[^"'`]*["'`]/g)) g.push(`${f}: ${m[0]}`)
  return g
}

const JALUR_UNIT = ['/bnpb/unit', '/bnpb/unit/', ...U.KODE_UNIT.map((k) => '/bnpb/unit/' + k)]

test('a (uji diri): pemeriksa hak menolak masukan palsu', () => {
  const nyata = { htmlRute: [[/^\/x$/]], publik: new Map(), terkunci: () => false, jalur: ['/bnpb/unit'] }
  assert.deepEqual(periksaGerbangHalaman(nyata), [])
  assert.equal(periksaGerbangHalaman({ ...nyata, publik: new Map([['/bnpb/unit', 'x']]) }).length, 1, 'jalur unit di PUBLIK_TANPA_SESI wajib ditolak')
  assert.equal(periksaGerbangHalaman({ ...nyata, htmlRute: [[/^\/bnpb\/unit\/?$/]] }).length, 1, 'jalur unit di HTML_RUTE wajib ditolak')
  assert.equal(periksaGerbangHalaman({ ...nyata, terkunci: () => true }).length, 1, 'halamanTerkunci true wajib ditolak')

  const baik = 'async function d(env, req, n) {\n  const t = DATA_UNIT_TERBATAS.includes(n);\n  if (!await (t ? modAtauStaf : stafOK)(env, req, P)) return 401;\n  if (!DATA_UNIT.includes(n)) return 404;\n  env.MEDIA.get(n);\n}\n'
  assert.deepEqual(periksaRuteUnit({ 'GET /api/unit/data/:nama': baik }), [])
  assert.equal(periksaRuteUnit({ 'GET /api/unit/indeks': 'async function i(env) {\n  return env.MEDIA.get("x");\n}\n' }).length, 1, 'rute tanpa stafOK wajib ditolak')
  assert.equal(periksaRuteUnit({ 'GET /api/unit/indeks': 'async function i(env, req) {\n  env.MEDIA.get("x");\n  if (!await stafOK(env, req, P)) return 401;\n}\n' }).length, 1, 'R2 sebelum hak wajib ditolak')
  assert.equal(periksaRuteUnit({ 'GET /api/unit/data/:nama': 'async function d(env, req, n) {\n  if (!await stafOK(env, req, P)) return 401;\n  env.MEDIA.get(n);\n}\n' }).length, 1, 'data tanpa modAtauStaf untuk DATA_UNIT_TERBATAS wajib ditolak')
  assert.equal(periksaRuteUnit({ 'POST /api/unit/ketuk': 'async function k(env, req) {\n  if (!await stafOK(env, req, P)) return 401;\n  env.DB.prepare("x");\n}\n' }).length, 1, 'rute tulis dengan stafOK wajib ditolak')
  assert.equal(periksaRuteUnit({ 'GET /bnpb/unit': 'async function h(env, req) {\n  return halamanBnpbPublik(env);\n}\n' }).length, 1, 'halaman tanpa hak wajib ditolak')

  const kelas = new Map([['a', 'S'], ['b', 'T']])
  assert.deepEqual(periksaKelas(['a', 'b'], ['b'], kelas), [])
  assert.equal(periksaKelas(['a', 'b'], [], kelas).length, 1, 'kelas T di luar DATA_UNIT_TERBATAS wajib ditolak')
  assert.equal(periksaKelas(['a', 'baru'], [], kelas).length, 1, 'nama tak tercatat (= T) wajib ditolak')
  assert.equal(ruteLiar({ 'src/x.js': 'const R = {"GET /api/unit/rahasia": f};' }).length, 1, 'rute unit di berkas lain wajib ditolak')
})

test('a: /bnpb/unit* tidak publik, tidak di HTML_RUTE, tidak dikunci gerbang host (DT §1.4)', () => {
  const g = periksaGerbangHalaman({ htmlRute: G.HTML_RUTE, publik: G.PUBLIK_TANPA_SESI, terkunci: G.halamanTerkunci, jalur: JALUR_UNIT })
  assert.deepEqual(g, [], PERBAIKI(
    'jalur Ruang Unit terbuka untuk tamu, atau dipegang gerbang host centurisk97.id.',
    'tamu membaca halaman staf, atau staf berperan unit dipantulkan tanpa akhir.',
    'cabut jalur dari PUBLIK_TANPA_SESI dan HTML_RUTE (src/gerbang_halaman.js), pertahankan pengecualian /bnpb/unit di halamanTerkunci; hak dijaga src/unit.js.'))
})

test('a: tiap rute src/unit.js memeriksa stafOK, atau modAtauStaf untuk kelas T dan tulis, sebelum menyentuh data', () => {
  const rute = Object.fromEntries(Object.entries(U.RUTE_UNIT).map(([k, f]) => [k, teksRute(SRC_UNIT, f)]))
  assert.ok(Object.keys(rute).length >= 4, 'RUTE_UNIT kosong: impor src/unit.js gagal membaca rute')
  assert.deepEqual(periksaRuteUnit(rute), [], PERBAIKI(
    'rute Ruang Unit tidak memeriksa hak, memeriksanya sesudah membaca R2 atau D1, atau memakai stafOK di tempat yang wajib modAtauStaf.',
    'tamu atau akun gerbang AKUN_SITUS* membaca data staf (KEAMANAN-PRIVASI §2.3).',
    'panggil stafOK(env, req, P_UNIT_BACA) di baris pertama handler; modAtauStaf untuk DATA_UNIT_TERBATAS dan semua rute tulis (DT §4.9).'))
  assert.deepEqual(periksaKelas(U.DATA_UNIT, U.DATA_UNIT_TERBATAS, kelasKP(baca(DOK + 'KEAMANAN-PRIVASI.md'))), [], PERBAIKI(
    'berkas R2 kelas T atau yang belum tercatat kelasnya dilayani lewat stafOK.',
    'akun gerbang situs ikut membaca data terbatas.',
    'tambah namanya ke DATA_UNIT_TERBATAS (src/unit.js), atau catat kelas S-nya di KEAMANAN-PRIVASI §3.2 di commit yang sama.'))
  const lain = Object.fromEntries(berkasDi('src', /\.js$/).filter((f) => f !== 'src/unit.js').map((f) => [f, baca(f)]))
  assert.deepEqual(ruteLiar(lain), [], PERBAIKI('rute /api/unit atau /bnpb/unit ditulis di luar src/unit.js.', 'rute itu lolos dari pemeriksaan hak gerbang ini.', 'pindahkan rutenya ke RUTE_UNIT di src/unit.js.'))
})

// =====================================================================
// butir b: kepala berkas R2 dan sumber per angka (DT §4.6, §4.8, P-7)
// =====================================================================

export const LABEL_SAH = ['resmi', 'sekunder', 'hitungan_kita', 'proksi']
export const BASI_SAH = [48, 240, 1080]   // harian, mingguan, bulanan (DT §9.4)
const isoUTC = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/.test(s) && !isNaN(Date.parse(s))
const labelSah = (l) => (Array.isArray(l) ? l : [l]).length > 0 && (Array.isArray(l) ? l : [l]).every((x) => LABEL_SAH.includes(x))
const punyaSumber = (o) => Array.isArray(o?.sumber) ? o.sumber.length > 0 : typeof o?.sumber === 'string' && o.sumber.trim() !== ''

export function periksaBerkasR2(o) {
  const g = []
  if (!isoUTC(o?.dibuat)) g.push('dibuat bukan ISO 8601 UTC')
  if (!BASI_SAH.includes(o?.basi_jam)) g.push(`basi_jam ${o?.basi_jam} bukan salah satu ${BASI_SAH.join(', ')}`)
  if (!labelSah(o?.label)) g.push(`label kepala ${JSON.stringify(o?.label)} di luar ${LABEL_SAH.join(', ')}`)
  if (!Array.isArray(o?.sumber) || !o.sumber.length) g.push('sumber kepala kosong')
  else o.sumber.forEach((s, i) => {
    if (!(s?.url || s?.nama)) g.push(`sumber[${i}] tanpa asal (url atau nama)`)
    if (!isoUTC(s?.diambil) && !/^\d{4}-\d{2}-\d{2}$/.test(s?.diambil || '')) g.push(`sumber[${i}] tanpa tanggal diambil`)
    if (typeof s?.lisensi !== 'string') g.push(`sumber[${i}] tanpa lisensi (tulis "tidak tertulis")`)
  })
  // tiap nilai angka mewarisi sumber dan label dari objek terdekat yang punya keduanya (kartu, lalu kepala)
  const jalan = (x, jalur, induk) => {
    if (Array.isArray(x)) return x.forEach((v, i) => jalan(v, `${jalur}[${i}]`, induk))
    if (!x || typeof x !== 'object') return
    // `label` di angka dan kolom adalah teks tampilan; objek bersumber (kartu, kepala) yang membawa label P-7
    const kini = 'sumber' in x ? x : induk
    if (x !== o && 'sumber' in x) {
      if (!labelSah(x.label)) g.push(`${jalur}: label ${JSON.stringify(x.label)} di luar ${LABEL_SAH.join(', ')}`)
      if (!punyaSumber(x)) g.push(`${jalur}: sumber kosong`)
    }
    if (typeof x.nilai === 'number' && !(kini && labelSah(kini.label) && punyaSumber(kini))) g.push(`${jalur}.nilai tanpa sumber dan label`)
    for (const [k, v] of Object.entries(x)) if (k !== 'sumber') jalan(v, `${jalur}.${k}`, kini)
  }
  ;(Array.isArray(o?.kartu) ? o.kartu : []).forEach((k, i) => { if (!('sumber' in k)) g.push(`$.kartu[${i}] (${k?.id}): kartu tanpa sumber dan label sendiri`) })
  jalan(o, '$', null)
  return g
}

const R2 = berkasDi(FIXTURE_R2, /\.json$/).map((f) => [f, JSON.parse(baca(f))])

test('b (uji diri): pemeriksa berkas R2 menolak masukan palsu', () => {
  const [, contoh] = R2[0]
  const salin = () => JSON.parse(JSON.stringify(contoh))
  assert.deepEqual(periksaBerkasR2(salin()), [])
  const tanpa = (k) => { const x = salin(); delete x[k]; return x }
  assert.ok(periksaBerkasR2(tanpa('dibuat')).some((x) => /dibuat/.test(x)), 'berkas tanpa dibuat wajib ditolak')
  assert.ok(periksaBerkasR2(tanpa('basi_jam')).some((x) => /basi_jam/.test(x)), 'berkas tanpa basi_jam wajib ditolak')
  const x1 = salin(); x1.kartu[0].label = ['karangan']
  assert.ok(periksaBerkasR2(x1).some((x) => /karangan/.test(x)), 'label di luar daftar wajib ditolak')
  const x2 = salin(); delete x2.kartu[0].sumber; delete x2.kartu[0].label; delete x2.sumber
  assert.ok(periksaBerkasR2(x2).some((x) => /nilai tanpa sumber/.test(x)), 'angka tanpa sumber wajib ditolak')
  const x3 = salin(); x3.sumber[0].diambil = null
  assert.ok(periksaBerkasR2(x3).some((x) => /tanggal/.test(x)), 'sumber tanpa tanggal wajib ditolak')
})

test('b: tiap fixture R2 Ruang Unit berkepala DT dan tiap angka bersumber', () => {
  assert.ok(R2.length > 0, `${FIXTURE_R2} kosong: gerbang tidak memeriksa apa pun`)
  const g = R2.flatMap(([f, o]) => periksaBerkasR2(o).map((x) => `${f}: ${x}`))
  assert.deepEqual(g, [], PERBAIKI(
    'berkas keluaran Ruang Unit tanpa dibuat, basi_jam, label, atau sumber per angka.',
    'layar tidak bisa menandai basi dan angka tampil tanpa asal (prinsip 3).',
    'isi kepala lewat rapor.py berkas() dan kartu() (DT §4.6), label dari resmi, sekunder, hitungan_kita, proksi.'))
})

// =====================================================================
// butir c: sumber per angka sebagai atribut, bukan kaki kartu
// =====================================================================

export function periksaAtributAngka(html) {
  const g = []
  const el = [...html.matchAll(/<span class="hl"[^>]*>/g), ...html.matchAll(/<td class="n[^"]*"[^>]*>/g)].map((m) => m[0])
  for (const e of el) {
    if (!/data-sumber="[^"]+"/.test(e)) g.push(`tanpa data-sumber: ${e}`)
    if (!/title="[^"]+"/.test(e)) g.push(`tanpa title: ${e}`)
  }
  if (/class="ex-ft"|Sumber: /.test(html)) g.push('kaki sumber (.ex-ft atau "Sumber: ") dilarang')
  return g
}

test('c (uji diri): .hl tanpa data-sumber ditolak', () => {
  assert.deepEqual(periksaAtributAngka('<span class="hl" data-sumber="a" title="b">3</span>'), [])
  assert.equal(periksaAtributAngka('<span class="hl" title="b">3</span>').length, 1)
  assert.equal(periksaAtributAngka('<td class="n" data-sumber="a">3</td>').length, 1)
  assert.equal(periksaAtributAngka('<footer class="ex-ft">Sumber: X</footer>').length, 1)
})

test('c: rapor.js menaruh data-sumber dan title di tiap angka fixture', () => {
  let n = 0
  const g = []
  for (const [f, o] of R2) for (const k of o.kartu || []) {
    const h = R.html(k, o, Date.parse(o.dibuat) + 3600e3)
    n += (h.match(/class="hl"|<td class="n/g) || []).length
    g.push(...periksaAtributAngka(h).map((x) => `${f} ${k.id}: ${x}`))
  }
  assert.ok(n > 0, 'fixture tidak menghasilkan satu angka pun: butir c tidak teruji')
  assert.deepEqual(g, [], PERBAIKI('angka di kartu Ruang Unit tanpa asal di atributnya.', 'pembaca tidak tahu angka itu resmi atau hitungan kita.', 'render angka lewat angkaHtml/sel di public/bnpb/unit/rapor.js.'))
  const lain = berkasDi('public/bnpb/unit', /\.js$/).filter((f) => !f.endsWith('rapor.js'))
  const hl = lain.filter((f) => /class[:=]\s*["']hl["']/.test(baca(f)))
  assert.deepEqual(hl, [], PERBAIKI('.hl dibuat di luar rapor.js.', 'angka itu lolos dari jaminan data-sumber.', 'gambar angka lewat UnitRapor.'))
})

// =====================================================================
// butir d: label wajib dan kata terlarang
// =====================================================================

export const LABEL_WAJIB = { 'PERB-1': 'bukan IRB resmi', 'PUS-2': 'KIB usulan', 'PLP-2': 'daftar pendek', 'SDU-1': 'kandidat konsolidasi', 'WIL-3': 'saran' }
// KEAMANAN-PRIVASI §9.3 KATA_TUDUH (perluasan G-4 butir d)
export const KATA_TUDUH = ['korupsi', 'penyimpangan', 'pelanggaran', 'mark-up', 'markup', 'kemahalan', 'fiktif', 'kolusi', 'tersangka', 'pemecahan paket', 'tidak wajar', 'disalahgunakan', 'lalai']
const RE_TUDUH = new RegExp(`\\b(${KATA_TUDUH.map((k) => k.replace('-', '\\-')).join('|')})\\b`, 'i')

/** Baris keluaran: komentar dan baris assert (uji diri skrip) dibuang. */
export function barisKeluaran(teks, python) {
  return teks.split('\n').map((b) => python ? b.replace(/(^|\s)#.*$/, '') : b.replace(/(^|\s)\/\/\s.*$/, '').replace(/\/\*.*?\*\//g, ''))
    .filter((b) => !/^\s*(assert\b|\*|\/\*|<!--)/.test(b))
}
export function periksaKata(berkas) {
  const g = []
  for (const [f, teks] of Object.entries(berkas)) {
    barisKeluaran(teks, f.endsWith('.py')).forEach((b, i) => {
      const at = `${f}:${i + 1}`
      if (/pantau bencana/i.test(b)) g.push(`${at}: nama lama "Pantau Bencana" (tulis Centurisk97)`)
      if (/(?<!bukan )IRB resmi/i.test(b)) g.push(`${at}: "IRB resmi" tanpa "bukan"`)
      if (/KIB resmi/i.test(b)) g.push(`${at}: "KIB resmi" (tulis KIB usulan)`)
      const t = b.match(RE_TUDUH); if (t) g.push(`${at}: kata tuduhan "${t[1]}" (KEAMANAN-PRIVASI §9.3)`)
      if (/(^|[\s<>"'])·|·($|[\s<>"'])|&middot;|&#183;/.test(b)) g.push(`${at}: titik tengah`)
    })
  }
  return g
}
/** label wajib: tiap sistem yang keluarannya sudah ada di repo memuat kata labelnya. */
export function periksaLabelWajib(keluaran) {
  return Object.entries(keluaran).filter(([id, t]) => t != null && !t.includes(LABEL_WAJIB[id])).map(([id]) => `${id}: label "${LABEL_WAJIB[id]}" tidak ada di keluarannya`)
}

test('d (uji diri): kata terlarang dan label wajib', () => {
  assert.deepEqual(periksaKata({ 'a.js': 'const j = "Pendampingan IKD, bukan IRB resmi";' }), [])
  assert.equal(periksaKata({ 'a.js': 'h1.textContent = "Pantau Bencana";' }).length, 1, 'layar fixture bernama lama wajib ditolak')
  assert.equal(periksaKata({ 'k.json': '{"judul": "indikasi korupsi"}' }).length, 1, 'kartu fixture "indikasi korupsi" wajib ditolak')
  assert.equal(periksaKata({ 'a.py': 'judul = "IRB resmi kab"' }).length, 1)
  assert.equal(periksaKata({ 'a.py': 'judul = "KIB resmi"' }).length, 1)
  assert.equal(periksaKata({ 'a.js': 'x = "Banjir · Kab"' }).length, 1)
  assert.deepEqual(periksaKata({ 'a.py': '    assert "·" not in teks  # markup dibuang' }), [], 'uji diri dan komentar bukan keluaran')
  assert.deepEqual(periksaLabelWajib({ 'PERB-1': 'x bukan IRB resmi', 'PUS-2': null }), [])
  assert.equal(periksaLabelWajib({ 'PERB-1': 'Pendampingan IKD' }).length, 1, 'keluaran PERB-1 tanpa label wajib ditolak')
})

test('d: layar, skrip, dan fixture Ruang Unit tanpa kata terlarang; label wajib ada di keluaran', () => {
  const daftar = [...berkasDi('public/bnpb/unit'), ...berkasDi('scripts/bnpb/unit', /\.(py|json)$/), ...R2.map(([f]) => f)]
  assert.ok(daftar.length > 5, 'berkas Ruang Unit tidak ditemukan')
  assert.deepEqual(periksaKata(Object.fromEntries(daftar.map((f) => [f, baca(f)]))), [], PERBAIKI(
    'layar atau keluaran Ruang Unit memuat nama lama, "IRB resmi" tanpa "bukan", "KIB resmi", kata tuduhan, atau titik tengah.',
    'kartu dibaca sebagai klaim resmi atau tuduhan (KEAMANAN-PRIVASI §9.3).',
    'tulis Centurisk97, "bukan IRB resmi", "KIB usulan", bahasa netral §9.3, dan koma alih-alih titik tengah.'))
  const keluaran = {}
  for (const id of Object.keys(LABEL_WAJIB)) {
    const s = K.SISTEM.find((x) => x.id === id)
    const p = [s?.skrip, `scripts/bnpb/unit/${id.toLowerCase().replace('-', '')}.py`].filter((f) => f && existsSync(resolve(ROOT, f)))
    // docstring dan komentar bukan keluaran: label wajib harus ada di string yang ditulis skrip
    keluaran[id] = p.length ? p.map((f) => barisKeluaran(baca(f).replace(/"""[\s\S]*?"""/g, ''), f.endsWith('.py')).join('\n')).join('\n') : null
  }
  assert.ok(keluaran['PERB-1'] != null, 'scripts/bnpb/unit/perb1.py hilang: label wajib PERB-1 tidak teruji')
  assert.deepEqual(periksaLabelWajib(keluaran), [], PERBAIKI('keluaran sistem tanpa label wajibnya.', 'hitungan kita terbaca sebagai angka resmi.', 'tulis label persis RU §6.1 butir d di kartu skripnya.'))
})

// =====================================================================
// butir e: registri cakupan
// =====================================================================

export function periksaCakupan(reg, idF12, ada, plafon = ANTRE_PLAFON) {
  const g = []
  for (const k of ['diuji', 'dikecualikan', 'antre']) if (!reg?.[k]) g.push(`daftar ${k} tidak ada`)
  if (g.length) return g
  const terdaftar = [...Object.keys(reg.diuji), ...Object.keys(reg.dikecualikan), ...reg.antre]
  for (const id of idF12) {
    const n = terdaftar.filter((x) => x === id).length
    if (n === 0) g.push(`${id} (F1/F2) tidak terdaftar`)
    if (n > 1) g.push(`${id} terdaftar ${n} kali`)
  }
  for (const id of new Set(terdaftar)) if (!idF12.includes(id)) g.push(`${id} bukan ID F1/F2 KEPUTUSAN-AWAL §5.1`)
  for (const [id, a] of Object.entries(reg.dikecualikan)) if (typeof a !== 'string' || a.trim().length < 15) g.push(`${id}: alasan dikecualikan < 15 huruf`)
  for (const [id, v] of Object.entries(reg.diuji))
    for (const bag of String(v).split(';').map((x) => x.trim()).filter(Boolean)) {
      const f = bag.split(/\s+/)[0], p = f.includes('/') ? f : 'scripts/bnpb/unit/' + f
      if (!ada(p)) g.push(`${id}: bukti "${bag}" menunjuk ${p} yang tidak ada`)
    }
  if (typeof reg.antre_maks !== 'number' || reg.antre_maks > plafon) g.push(`antre_maks ${reg.antre_maks} melewati plafon ${plafon}`)
  else if (reg.antre.length > reg.antre_maks) g.push(`antre ${reg.antre.length} melewati antre_maks ${reg.antre_maks} (antre hanya boleh menyusut)`)
  else if (reg.antre.length < reg.antre_maks) g.push(`antre menyusut ke ${reg.antre.length}: turunkan antre_maks ke ${reg.antre.length}`)
  return g
}

test('e (uji diri): registri cakupan menolak masukan palsu', () => {
  const ada = () => true
  const baik = { diuji: { 'A-1': 'a.py --cek' }, dikecualikan: {}, antre: ['B-1'], antre_maks: 1 }
  assert.deepEqual(periksaCakupan(baik, ['A-1', 'B-1'], ada), [])
  assert.ok(periksaCakupan(baik, ['A-1', 'B-1', 'C-1'], ada).some((x) => /C-1/.test(x)), 'ID F1 tak terdaftar wajib ditolak')
  assert.ok(periksaCakupan({ ...baik, antre: ['B-1', 'C-1'] }, ['A-1', 'B-1', 'C-1'], ada).some((x) => /melewati antre_maks/.test(x)), 'antre bertambah wajib ditolak')
  assert.ok(periksaCakupan({ ...baik, antre_maks: 99 }, ['A-1', 'B-1'], ada).some((x) => /plafon/.test(x)), 'antre_maks dinaikkan wajib ditolak')
  assert.ok(periksaCakupan(baik, ['A-1', 'B-1'], () => false).some((x) => /tidak ada/.test(x)), 'bukti diuji yang tidak ada wajib ditolak')
  assert.ok(periksaCakupan({ ...baik, antre: ['B-1', 'WIL-4'], antre_maks: 2 }, ['A-1', 'B-1'], ada, 2).some((x) => /WIL-4/.test(x)), 'ID F3 di registri wajib ditolak')
})

test('e: tiap ID F1 dan F2 KEPUTUSAN-AWAL §5.1 terdaftar tepat sekali di unit_cakupan.json', () => {
  assert.ok(F12.length >= 40, `tabel KEPUTUSAN-AWAL §5.1 terbaca ${F12.length} ID F1/F2: pengurai tabel rusak`)
  const g = periksaCakupan(JSON.parse(baca(CAKUPAN)), F12, (p) => existsSync(resolve(ROOT, p)))
  assert.deepEqual(g, [], PERBAIKI(
    `registri ${CAKUPAN} tidak sesuai katalog F1/F2.`,
    'sistem lahir tanpa uji, atau antre membengkak diam-diam.',
    'tambah ID ke diuji (potongan nama uji yang ada), dikecualikan (alasan >= 15 huruf), atau antre; antre hanya menyusut, antre_maks diturunkan tangan.'))
})

// =====================================================================
// butir f (G-6): tanpa kartu untuk ID F3 atau T
// =====================================================================

export function periksaFase(sistem, ka, kartu, teksLayar) {
  const g = []
  for (const s of sistem) {
    if (!ka.has(s.id)) g.push(`${s.id} di katalog.js tidak ada di KEPUTUSAN-AWAL §5.1`)
    else if (ka.get(s.id) !== s.fase) g.push(`${s.id}: fase katalog.js ${s.fase}, KEPUTUSAN-AWAL ${ka.get(s.id)}`)
    if (/^(F3|T)$/.test(s.fase) && (s.berkas || s.bentuk)) g.push(`${s.id} (${s.fase}) punya berkas atau bentuk kartu`)
  }
  for (const id of ka.keys()) if (!sistem.some((s) => s.id === id)) g.push(`${id} dari KEPUTUSAN-AWAL §5.1 hilang di katalog.js`)
  const f3t = [...ka].filter(([, f]) => /^(F3|T)$/.test(f)).map(([id]) => id)
  for (const [f, k] of kartu) {
    if (!k.sistem) g.push(`${f} ${k.id}: kartu tanpa ID sistem`)
    else if (!/^F[12]\*?$/.test(ka.get(k.sistem) || '')) g.push(`${f} ${k.id}: kartu untuk ${k.sistem} (${ka.get(k.sistem) ?? 'tidak dikenal'})`)
  }
  for (const [f, t] of Object.entries(teksLayar))
    for (const id of f3t) if (new RegExp(`\\b${id}\\b`, 'i').test(t) || new RegExp(`["'\`]${id.replace('-', '').toLowerCase()}[-_"'\`]`).test(t)) g.push(`${f}: menyebut ${id} (${ka.get(id)})`)
  return g
}

test('f (uji diri): kartu WIL-4 (F3) ditolak', () => {
  const ka = new Map([['WIL-1', 'F2'], ['WIL-4', 'F3']])
  const sis = [{ id: 'WIL-1', fase: 'F2', berkas: 'meja_wilayah', bentuk: 'khusus' }, { id: 'WIL-4', fase: 'F3', berkas: null, bentuk: null }]
  assert.deepEqual(periksaFase(sis, ka, [['r2.json', { id: 'w1', sistem: 'WIL-1' }]], { 'unit.js': 'x' }), [])
  assert.equal(periksaFase(sis, ka, [['r2.json', { id: 'w4', sistem: 'WIL-4' }]], {}).length, 1, 'kartu R2 WIL-4 wajib ditolak')
  assert.equal(periksaFase([sis[0], { ...sis[1], berkas: 'jejak_dsp' }], ka, [], {}).length, 1, 'F3 berberkas di katalog wajib ditolak')
  assert.equal(periksaFase(sis, ka, [], { 'unit.js': 'seksi("wil4-jejak", ...)' }).length, 1, 'layar yang menggambar kartu wil4 wajib ditolak')
  assert.equal(periksaFase([sis[0], { ...sis[1], fase: 'F2' }], ka, [], {}).length, 1, 'fase katalog berbeda dari KEPUTUSAN-AWAL wajib ditolak')
})

test('f: kartu Ruang Unit hanya untuk ID F1 dan F2; katalog.js sama dengan KEPUTUSAN-AWAL §5.1', () => {
  const kartu = R2.flatMap(([f, o]) => (o.kartu || []).map((k) => [f, k]))
  const layar = Object.fromEntries(berkasDi('public/bnpb/unit', /\.(js|html)$/).filter((f) => !f.endsWith('katalog.js')).map((f) => [f, baca(f)]))
  assert.deepEqual(periksaFase(K.SISTEM, KA, kartu, layar), [], PERBAIKI(
    'ada kartu, berkas, atau kode layar untuk sistem berfase F3 atau T, atau katalog.js menyimpang dari KEPUTUSAN-AWAL §5.1.',
    'sistem yang menunggu izin atau keputusan pemilik (mis. WIL-4, IRT-2; KEAMANAN-PRIVASI §8) tampil sebelum waktunya.',
    'hapus kartunya; ubah fase hanya di KEPUTUSAN-AWAL §5.1 lewat keputusan pemilik, lalu samakan katalog.js.'))
})
