// Gerbang titik tengah (2 Nov 2026, aturan pemilik tanpa-titik-tengah).
//
// ATURAN: teks layar tidak dipisah dengan titik tengah ("·"). Pakai koma,
// kalimat biasa, label sendiri, atau baris baru.
//
// CAKUPAN: berkas dilacak git: public/**/*.js, public/**/*.html,
// public/i18n/*.json. Dilewati: public/data/**, folder vendor/, maplibre.js,
// *.min.*, serta berkas uji ini dan fixture-nya.
//
// HEURISTIK per baris (sederhana, sengaja tidak mengurai JS):
//   DIHITUNG : "&middot;" / "&#183;", atau "·" yang berbatasan dengan spasi,
//              awal/akhir baris, atau kurung tag (`>` `<`) pada salah satu sisi.
//              Contoh: `a · b`, `<b>x</b> ·`, `"· Data"`.
//   TIDAK    : "·" rapat di antara angka/pengenal tanpa spasi (rumus perkalian
//              `0,5·fK`, `147,2·(101 − F0)`), baris regex/pengurai (memuat
//              `.split(` `.replace(` `.match(` `.test(` `new RegExp`), dan
//              komentar (baris berawal `//` `*` `/*` `<!--`, atau ekor
//              `// ...`, `/* ... */`, `<!-- ... -->` di dalam baris).
//   Satuan   : jumlah BARIS terhitung per berkas.
//
// RATCHET: tests/agen/fixtures/titik-tengah-sisa.json = {berkas: jumlah} untuk
// sisa yang belum dibersihkan. Hanya boleh MENYUSUT; disunting TANGAN, jangan
// dibangkitkan otomatis (itu menjadikan gerbang stempel).
//
// Hanya builtin Node.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BERKAS_SISA = 'tests/agen/fixtures/titik-tengah-sisa.json'

const MIDDOT = /&middot;|&#183;|(?:^|[\s<>])·|·(?:$|[\s<>])/
const PARSER = /\.(?:split|replace|replaceAll|match|matchAll|test)\(|RegExp/
const KOMENTAR_AWAL = /^\s*(?:\/\/|\*|\/\*|<!--)/

export function hitungBaris(teks) {
  let n = 0
  for (const baris of teks.split('\n')) {
    if (!baris.includes('·') && !/&middot;|&#183;/.test(baris)) continue
    if (KOMENTAR_AWAL.test(baris) || PARSER.test(baris)) continue
    const bersih = baris
      .replace(/<!--.*?-->/g, '')
      .replace(/\/\*.*?\*\//g, '')
      .replace(/(^|\s)\/\/\s.*$/, '$1')
    if (MIDDOT.test(bersih)) n++
  }
  return n
}

function berkasTercakup() {
  const daftar = execFileSync('git', ['ls-files', '-z', 'public'], { cwd: ROOT, maxBuffer: 1 << 28 })
    .toString().split('\0').filter(Boolean)
  return daftar.filter((f) =>
    (/\.(?:js|html)$/.test(f) || /^public\/i18n\/[^/]+\.json$/.test(f)) &&
    !f.startsWith('public/data/') && !/(?:^|\/)vendor\//.test(f) &&
    !/maplibre\.js$/.test(f) && !/\.min\./.test(f))
}

test('self-test: menangkap " · " di teks, mengabaikan rumus, regex, komentar', () => {
  assert.equal(hitungBaris('const a = "Banjir · Kab. X"'), 1)
  assert.equal(hitungBaris('<p>Sumber&middot;BMKG</p>'), 1)
  assert.equal(hitungBaris('<b>Total</b> ·<i>5</i>'), 1)
  assert.equal(hitungBaris('const r = 147,2·(101 − F0) + 0,5·fK'), 0)
  assert.equal(hitungBaris('t.split(" · ")'), 0)
  assert.equal(hitungBaris('x.replace(/^[·•\\s]+/, "")'), 0)
  assert.equal(hitungBaris('// pisah " · " lama'), 0)
  assert.equal(hitungBaris('const a = 1 // contoh " · "'), 0)
  assert.equal(hitungBaris('<!-- a · b --><p>ok</p>'), 0)
  assert.equal(hitungBaris('a\nb · c\nd · e'), 2)
})

test('titik tengah pemisah: sisa hanya menyusut, berkas baru bersih', () => {
  const sisa = JSON.parse(readFileSync(resolve(ROOT, BERKAS_SISA), 'utf8'))
  const nyata = {}
  for (const f of berkasTercakup()) {
    let n
    try { n = hitungBaris(readFileSync(resolve(ROOT, f), 'utf8')) } catch { continue }
    if (n) nyata[f] = n
  }
  const naik = [], turun = []
  for (const [f, n] of Object.entries(nyata)) {
    const batas = sisa[f] ?? 0
    if (n > batas) naik.push(`${f}: ${n} baris (batas ${batas})`)
  }
  for (const [f, batas] of Object.entries(sisa)) {
    const n = nyata[f] ?? 0
    if (n < batas) turun.push(`${f}: ${n} baris (daftar ${batas})`)
  }
  assert.deepEqual(naik, [],
    'SEBAB: teks layar baru memakai pemisah titik tengah "·" (aturan pemilik: tanpa titik tengah). ' +
    'AKIBAT: gaya layar tidak seragam dan pembersihan harian bocor lagi. ' +
    'CARA MEMPERBAIKI: ganti pemisahnya dengan koma, kalimat biasa, label sendiri, atau baris baru; ' +
    `jangan menaikkan angka di ${BERKAS_SISA}.`)
  assert.deepEqual(turun, [],
    'SEBAB: sisa titik tengah sudah berkurang tetapi daftar belum diturunkan. ' +
    'AKIBAT: ada ruang kosong untuk pemisah baru yang lolos diam-diam. ' +
    `CARA MEMPERBAIKI: turunkan angkanya (atau cabut entrinya bila 0) di ${BERKAS_SISA}, dengan tangan.`)
})
