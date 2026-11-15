// Gerbang paket paritas bencana (PB-06; KEPUTUSAN D8, KEAMANAN-PRIVASI 7, Q29).
// Empat pemeriksaan murni (fungsi atas teks), dijalankan ke repo nyata DAN ke fixture
// jahat supaya gerbang terbukti tidak buta. Berkas paket yang belum ada DILEWATI
// secara eksplisit (t.diagnostic), bukan diam-diam.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ada = (p) => existsSync(join(ROOT, p))
const baca = (p) => readFileSync(join(ROOT, p), 'utf8')
const daftar = (d) => (ada(d) ? readdirSync(join(ROOT, d)) : [])

// ---- 1. skema tanpa kolom orang ----
const KOLOM_ORANG = /(^|_)(hp|wa|nik|email|telepon|pelapor|korban|kru|jabatan)(_|$)/
const TABEL_PAKET = /^(pb_\w+|tugas_bencana_x)$/

export function kolomOrang(sql) {
  const bersih = sql.replace(/--[^\n]*/g, '')
  const temuan = []
  for (const m of bersih.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(\w+)\s*\(/gi)) {
    if (!TABEL_PAKET.test(m[1])) continue
    let dalam = 1, i = m.index + m[0].length, awal = i
    const bagian = []
    for (; i < bersih.length && dalam > 0; i++) {
      const c = bersih[i]
      if (c === '(') dalam++
      else if (c === ')') { dalam--; if (dalam === 0) bagian.push(bersih.slice(awal, i)) }
      else if (c === ',' && dalam === 1) { bagian.push(bersih.slice(awal, i)); awal = i + 1 }
    }
    for (const b of bagian) {
      const kol = b.trim().split(/\s+/)[0]?.toLowerCase()
      if (kol && !/^(primary|unique|foreign|check|constraint)$/.test(kol) && KOLOM_ORANG.test(kol)) temuan.push(`${m[1]}.${kol}`)
    }
  }
  return temuan
}

// ---- 2. tulis public/ di luar daftar putih ----
const PUTIH = /^public\/data\/(ringkas|ekonomi|pencegahan|prioritas)\//
const VERBA_TULIS = /write|open\(|dump|save|copy|rename|mkdir|put\(|>>?\s*public/i
export function tulisPublicLiar(teks) {
  // ponytail: heuristik per baris (jalur public/ + kata tulis); naik ke AST bila kena positif palsu.
  const temuan = []
  teks.split('\n').forEach((baris, n) => {
    if (/^\s*(#|\/\/|\*)/.test(baris)) return
    for (const m of baris.matchAll(/public\/[\w./${}<>%-]*/g)) {
      if (!PUTIH.test(m[0]) && VERBA_TULIS.test(baris)) temuan.push(`baris ${n + 1}: ${m[0]}`)
    }
  })
  return temuan
}

// ---- 3. ukuran dan kunci terlarang ----
const BATAS_RINGKAS = 100 * 1024, BATAS_LAIN = 1024 * 1024
export const batasUkuran = (jalur) => (/^public\/data\/ringkas\//.test(jalur) ? BATAS_RINGKAS : BATAS_LAIN)
const KUNCI_LARANG = new Set(['nama_kru', 'pelapor', 'no_hp', 'nik', 'plafon', 'harga_kontrak', 'tarif'])
export function kunciLarang(nilai, akar = []) {
  const t = []
  if (Array.isArray(nilai)) nilai.forEach((v, i) => t.push(...kunciLarang(v, [...akar, i])))
  else if (nilai && typeof nilai === 'object')
    for (const [k, v] of Object.entries(nilai)) {
      if (KUNCI_LARANG.has(k)) t.push([...akar, k].join('.'))
      t.push(...kunciLarang(v, [...akar, k]))
    }
  return t
}

// ---- 4. workflow ----
export function masalahWorkflow(yml, { wajibTanpaTulis = true } = {}) {
  const m = []
  if (!/^permissions:\s*\n\s+contents:\s*read\s*$/m.test(yml)) m.push('tanpa `permissions: contents: read` tingkat atas')
  if (wajibTanpaTulis && /git\s+(commit|push)/.test(yml)) m.push('berisi git commit/push')
  if (/\$\{\{\s*(github\.event\.)?inputs\./.test(yml.split('\n').filter((l) => /run:|^\s{8,}\S/.test(l) && !/^\s*(env|with):/.test(l) && !/^\s+\w+:\s*\$\{\{/.test(l)).join('\n'))) m.push('`${{ inputs.* }}` di dalam run: (lewatkan lewat env:)')
  return m
}

// ================= repo nyata =================
test('skema pb_* dan tugas_bencana_x tanpa kolom orang (D8)', (t) => {
  const berkas = daftar('migrations').filter((f) => f.endsWith('.sql') && !/ 2\./.test(f))
  let dipindai = 0
  for (const f of berkas) {
    const sql = baca(`migrations/${f}`)
    if (!/CREATE TABLE(?: IF NOT EXISTS)?\s+(pb_|tugas_bencana_x)/i.test(sql)) continue
    dipindai++
    assert.deepEqual(kolomOrang(sql), [], `${f}: kolom orang di tabel paket. Sebab: D8 melarang data orang; akibat: PII masuk D1 dan ekspor. Perbaiki: buang kolom, simpan hanya 'oleh' (staf:<id>).`)
  }
  t.diagnostic(`migrasi dipindai: ${dipindai}; 0131 ${ada('migrations/0131_paritas_dokumen.sql') ? 'ada' : 'DILEWATI (belum ada)'}`)
  assert.ok(dipindai >= 1, 'tidak ada migrasi paket sama sekali; 0130 hilang?')
})

test('kode paket tidak menulis ke public/ di luar daftar putih', (t) => {
  const kode = [
    ...daftar('src').filter((f) => /^pb_.*\.js$/.test(f)).map((f) => `src/${f}`),
    ...daftar('scripts/umum').filter((f) => /^(renlap.*|pb_.*)\.py$/.test(f)).map((f) => `scripts/umum/${f}`),
  ]
  if (ada('.github/workflows/renlap-pb.yml')) kode.push('.github/workflows/renlap-pb.yml')
  t.diagnostic(`dipindai: ${kode.join(', ') || '(kosong)'}; dilewati karena belum ada: ${['src/pb_*.js', 'scripts/umum/renlap.py', 'scripts/umum/pb_*.py', '.github/workflows/renlap-pb.yml'].filter((p) => !kode.some((k) => new RegExp('^' + p.replace(/[.]/g, '\\.').replace('*', '.*') + '$').test(k))).join(', ') || '-'}`)
  for (const f of kode) {
    assert.deepEqual(tulisPublicLiar(baca(f)), [], `${f} menulis ke public/ di luar public/data/{ringkas,ekonomi,pencegahan,prioritas}/. Sebab: public/ dilayani tanpa login dan repo publik; akibat: data operasi bocor. Perbaiki: simpan di D1/R2.`)
  }
})

test('berkas statis paket: ukuran dan kunci terlarang', (t) => {
  const jalur = ['public/data/paritas.json']
  for (const d of ['ringkas', 'ekonomi', 'pencegahan', 'prioritas'])
    for (const f of daftar(`public/data/${d}`)) if (f.endsWith('.json')) jalur.push(`public/data/${d}/${f}`)
  const lewat = jalur.filter((j) => !ada(j))
  t.diagnostic(`dilewati karena belum ada: ${lewat.join(', ') || '-'}`)
  for (const j of jalur.filter(ada)) {
    const u = statSync(join(ROOT, j)).size
    assert.ok(u <= batasUkuran(j), `${j} ${u} byte melebihi batas ${batasUkuran(j)} (Q29: ringkas 100 KB, lainnya 1 MB). Akibat: biaya aset dan muat layar; perkecil atau pecah.`)
    assert.deepEqual(kunciLarang(JSON.parse(baca(j))), [], `${j} memuat kunci terlarang (nama_kru, pelapor, no_hp, nik, plafon, harga_kontrak, tarif). Buang dari keluaran.`)
  }
})

test('workflow paket: contents: read, tanpa commit/push', (t) => {
  const wf = ['paritas.yml', 'renlap-pb.yml']
  t.diagnostic(`dilewati karena belum ada: ${wf.filter((w) => !ada(`.github/workflows/${w}`)).join(', ') || '-'}`)
  for (const w of wf.filter((w) => ada(`.github/workflows/${w}`)))
    assert.deepEqual(masalahWorkflow(baca(`.github/workflows/${w}`)), [], `${w} melanggar KEAMANAN-PRIVASI 7.4. Perbaiki: permissions contents: read, tanpa git commit/push, masukan lewat env:.`)
})

// ================= fixture jahat: gerbang tidak buta =================
test('fixture jahat: tiap pemeriksaan bisa merah', () => {
  assert.deepEqual(kolomOrang('CREATE TABLE IF NOT EXISTS pb_x (id TEXT, nama_kru TEXT, no_hp TEXT CHECK (a IN (1,2)), "x" INT, PRIMARY KEY (id));\nCREATE TABLE lain (nik TEXT);'), ['pb_x.nama_kru', 'pb_x.no_hp'])
  assert.deepEqual(kolomOrang('CREATE TABLE tugas_bencana_x (jabatan TEXT, oleh TEXT, dibuat INTEGER);'), ['tugas_bencana_x.jabatan'])
  assert.equal(tulisPublicLiar('open("public/data/renlap/x.json", "w")').length, 1)
  assert.equal(tulisPublicLiar('fs.writeFileSync(`public/data/titik.json`, s)').length, 1)
  assert.equal(tulisPublicLiar('open("public/data/ringkas/a.json", "w")').length, 0)
  assert.equal(tulisPublicLiar('# open("public/x", "w")\nbaca = open("src/a")').length, 0)
  assert.equal(batasUkuran('public/data/ringkas/a.json'), 102400)
  assert.equal(batasUkuran('public/data/paritas.json'), 1048576)
  assert.deepEqual(kunciLarang({ a: [{ b: { nik: 1 } }], tarif: 2 }), ['a.0.b.nik', 'tarif'])
  assert.equal(masalahWorkflow('on: push\njobs: {}').length, 1)
  assert.equal(masalahWorkflow('permissions:\n  contents: read\njobs:\n  a:\n    steps:\n      - run: git push\n').length, 1)
  assert.equal(masalahWorkflow('permissions:\n  contents: read\njobs:\n  a:\n    steps:\n      - run: echo ${{ inputs.x }}\n').length, 1)
  assert.equal(masalahWorkflow('permissions:\n  contents: read\njobs:\n  a:\n    steps:\n      - run: echo ok\n        env:\n          X: ${{ inputs.x }}\n').length, 0)
})
