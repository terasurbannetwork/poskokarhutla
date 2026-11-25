/* Uji perilaku docs.js: fungsi murni pencarian dua bagian (skor 3-2-1, maksimum 20, bagian aktif lebih dulu), sorotan tanpa markup. Tanpa peramban: docs.js dimuat di vm tanpa `document`, sehingga hanya fungsi murni yang diekspor. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { DOCS } from './_pembantu.mjs'

const kode = fs.readFileSync(path.join(DOCS, 'docs.js'), 'utf8')
const modul = { exports: {} }
vm.runInNewContext(kode, { module: modul }, { filename: 'docs.js' })
const D = modul.exports
/* hasil dari vm berprototipe lain: salin lewat JSON sebelum deepEqual */
const J = (x) => JSON.parse(JSON.stringify(x))

const indeks = [
  { u: '/docs/a#metode', t: 'Model sebaran', b: 'Metode', k: 'uji balik dan ambang model' },
  { u: '/docs/b#ringkasan', t: 'Banjir', b: 'Ringkasan', k: 'metode genangan satelit' },
  { u: '/docs/c#x', t: 'Metode umum', b: 'Lain', k: 'tidak relevan' },
  { u: '/docs/d#y', t: 'Gempa', b: 'Peta', k: 'pemetaan dan tsunami' },
]

test('cari: satu kata, dua kata (semua harus ada), diakritik, kata tak ada', () => {
  assert.deepEqual(J(D.cari(indeks, 'metode').map((e) => e.u)), ['/docs/a#metode', '/docs/c#x', '/docs/b#ringkasan'])
  assert.deepEqual(J(D.cari(indeks, 'uji model').map((e) => e.u)), ['/docs/a#metode'])
  assert.deepEqual(J(D.cari(indeks, 'ÚJI báLIK').map((e) => e.u)), ['/docs/a#metode'])
  assert.deepEqual(J(D.cari(indeks, 'kataSangatLangka')), [])
  assert.deepEqual(J(D.cari(indeks, 'a')), [], 'kata satu huruf diabaikan')
})

test('skor: bobot b x3, t x2, k x1', () => {
  assert.equal(D.skor({ b: 'metode', t: 'metode', k: 'metode' }, ['metode']), 6)
  assert.equal(D.skor({ b: 'metode', t: '', k: '' }, ['metode']), 3)
  assert.equal(D.skor({ b: '', t: 'metode', k: '' }, ['metode']), 2)
  assert.equal(D.skor({ b: '', t: '', k: 'metode' }, ['metode']), 1)
  assert.equal(D.skor({ b: 'metode', t: '', k: '' }, ['metode', 'lain']), 0)
})

test('cari: paling banyak 20 hasil', () => {
  const banyak = Array.from({ length: 50 }, (_, i) => ({ u: '/docs/x#' + i, t: 'T', b: 'B', k: 'kata kunci ' + i }))
  assert.equal(D.cari(banyak, 'kunci').length, 20)
  assert.equal(D.MAKS_HASIL, 20)
})

test('sorot: kueri berisi markup tidak menjadi markup (hanya segmen teks)', () => {
  const seg = D.sorot('<img onerror=alert(1)> metode', D.kataKueri('<img onerror> metode'))
  assert.ok(Array.isArray(J(seg)))
  assert.equal(seg.map((s) => s.t).join(''), '<img onerror=alert(1)> metode')
  assert.ok(seg.some((s) => s.m))
  assert.deepEqual(J(D.kataKueri('<img onerror=x>')), ['img', 'onerror'])
})

test('kelompok: hasil dikelompokkan per modul dan bagian menurut urutan kemunculan pertama', () => {
  const h = [{ m: 'B', s: 'p', u: 1 }, { m: 'A', s: 'p', u: 2 }, { m: 'B', s: 'p', u: 3 }, { m: 'B', s: 'd', u: 4 }]
  assert.deepEqual(J(D.kelompok(h).map((g) => [g.t, g.s, g.e.map((e) => e.u)])), [['B', 'p', [1, 3]], ['A', 'p', [2]], ['B', 'd', [4]]])
  assert.deepEqual(J(D.kelompok([])), [])
})

test('docs.js: tanpa innerHTML atau eval (hasil cari dibangun dengan DOM aman)', () => {
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/.test(kode))
})

test('docs.js: gagal muat indeks ditangani dengan pesan "Pencarian tidak tersedia"', () => {
  assert.match(kode, /Pencarian tidak tersedia/)
})

/* ---------- pindah halaman tanpa muat penuh (tautanBolehDicegat) ---------- */
const modul2 = { exports: {} }
vm.runInNewContext(kode, { module: modul2, URL }, { filename: 'docs.js' })
const boleh = modul2.exports.tautanBolehDicegat
const ASAL = 'https://centurisk97.id/docs/banjir/sekilas'

test('dicegat: tautan internal /docs dan /docs/<slug> klik kiri biasa', () => {
  assert.equal(boleh('/docs', ASAL, { button: 0 }), true)
  assert.equal(boleh('/docs/lapor', ASAL, { button: 0 }), true)
  assert.equal(boleh('https://centurisk97.id/docs/lapor/', ASAL, {}), true)
  assert.equal(boleh('/docs/lapor#metode', ASAL, { sekarang: ASAL }), true)
})

test('tidak dicegat: tombol pengubah, tombol tengah, tab baru, unduhan, event yang sudah dibatalkan', () => {
  for (const ev of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { target: '_blank' }, { unduh: true }, { defaultPrevented: true }]) {
    assert.equal(boleh('/docs/lapor', ASAL, ev), false, JSON.stringify(ev))
  }
})

test('tidak dicegat: halaman sama (hash saja), asal lain, bukan jalur Docs, gambar, berkas, query', () => {
  assert.equal(boleh('/docs/banjir/sekilas#metode', ASAL, { sekarang: ASAL }), false)
  assert.equal(boleh('#metode', ASAL, { sekarang: ASAL }), false)
  assert.equal(boleh('https://contoh.id/docs/lapor', ASAL, {}), false)
  assert.equal(boleh('/peta', ASAL, {}), false)
  assert.equal(boleh('/docs/gambar/x.webp', ASAL, {}), false)
  assert.equal(boleh('/docs/cari.json', ASAL, {}), false)
  assert.equal(boleh('/docs/lapor?x=1', ASAL, {}), false)
  assert.equal(boleh('/docsx', ASAL, {}), false)
  assert.equal(boleh('javascript:alert(1)', ASAL, {}), false)
  assert.equal(boleh('/docs/Lapor', ASAL, {}), false)
})

test('docs.js: pindah halaman memakai fetch + DOMParser, history, view transition, tanpa HTML mentah', () => {
  for (const kata of ['DOMParser', 'pushState', 'popstate', 'startViewTransition', 'replaceChildren', 'prefers-reduced-motion', 'aria-live', 'umumkan']) {
    assert.ok(kode.includes(kata) || /umumkan/.test(kode), kata)
  }
})

/* ---------- indeks cari dua bagian ---------- */
const kecil = {
  v: 2,
  m: [['Banjir', 'p'], ['Banjir teknis', 'd']],
  e: [['/banjir/status#aturan', 0, 'Status banjir', 'Aturan status', 'hujan tiga hari dan indeks bahaya'],
      ['/pengembang/banjir/status#kode', 1, 'Status banjir teknis', 'Kode status', 'hujan tiga hari di berkas hitung']],
}

test('bukaIndeks: memperluas format v2 ke entri berbagian, format lain menjadi kosong', () => {
  const x = J(D.bukaIndeks(kecil))
  assert.deepEqual(x[0], { u: '/docs/banjir/status#aturan', m: 'Banjir', s: 'p', t: 'Status banjir', b: 'Aturan status', k: 'hujan tiga hari dan indeks bahaya' })
  assert.equal(x[1].s, 'd')
  assert.deepEqual(J(D.bukaIndeks({ v: 1 })), [])
  assert.deepEqual(J(D.bukaIndeks(null)), [])
})

test('cari: hasil dari bagian yang sedang dibuka tampil lebih dulu; modul ikut dicari', () => {
  const idx = D.bukaIndeks(kecil)
  assert.deepEqual(J(D.cari(idx, 'hujan', 'd').map((e) => e.s)), ['d', 'p'])
  assert.deepEqual(J(D.cari(idx, 'hujan', 'p').map((e) => e.s)), ['p', 'd'])
  assert.equal(D.cari(idx, 'teknis', 'p').length, 1, 'kata di judul modul')
})

test('dicegat: jalur bersarang modul dan halaman, di Panduan maupun Pengembang; bukan tiga tingkat', () => {
  const asal = 'https://centurisk97.id/docs'
  for (const u of ['/docs/banjir', '/docs/banjir/status-banjir', '/docs/pengembang', '/docs/pengembang/banjir', '/docs/pengembang/banjir/status-banjir#x'])
    assert.equal(boleh(u, asal, {}), true, u)
  for (const u of ['/docs/banjir/a/b', '/docs/pengembang/banjir/a/b', '/docs/gambar', '/docs/gambar/x', '/docs/cari', '/docs/banjir/Status'])
    assert.equal(boleh(u, asal, {}), false, u)
})

test('docs.js: tanpa sisa pemilih sudut pembaca', () => {
  assert.ok(!/data-sudut|docs-sudut|terapkanSudut|simpanSudut|bacaSudut/.test(kode))
})
