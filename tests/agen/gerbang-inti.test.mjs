// Gerbang inti (PAKET-FITUR E05): tidak ada CSS/JS salinan antar berkas layar.
//
// Aturan: berkas bersama tinggal di public/inti/ dan modul MEMAKAINYA, bukan menyalin. Pernah terjadi:
// CSS banjir disalin ke public/{gempa,gunungapi,udara}/*.css dan gempa/kartu.js membuat adaptor sendiri.
// Salinan menyimpang pelan-pelan (satu dibetulkan, yang lain lupa) dan membengkakkan muatan awal.
//
// Pemeriksaan (tanpa daftar pengecualian; blok identik di dua berkas berbeda = pelanggaran):
//   CSS: aturan "selector{isi}" identik (spasi/komentar dinormalkan), panjang >= 90 karakter.
//   JS : deklarasi `function nama(...){...}` identik, panjang >= 200 karakter.
// Cara memperbaiki: pindahkan blok ke public/inti/ (atau pakai yang sudah ada di sana) lalu muat dari kedua halaman.
// JANGAN melonggarkan ambang atau menambah pengecualian supaya lolos.
//
// Salinan lama dilunasi 19 Okt 2026 (inti-layar); sejak itu ikut uji:agen dan memblokir salinan baru. Gerbang ini milik penulis-gerbang.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const CSS_MIN = 90
const JS_MIN = 200

const norm = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/ ?([{};:,]) ?/g, '$1').trim()

export function berkasLayar() {
  return execFileSync('git', ['ls-files', 'public'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.(css|js)$/.test(f))
    .filter((f) => !/^public\/(vendor|i18n|img|og|data)\//.test(f) && !/\/data\//.test(f) && !/ 2\./.test(f))
    .filter((f) => existsSync(join(ROOT, f)))
}

export function blok(f, teks) {
  const hasil = []
  const baris = (i) => teks.slice(0, i).split('\n').length
  if (f.endsWith('.css')) {
    for (const m of teks.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const k = norm(m[1]) + '{' + norm(m[2]) + '}'
      if (k.length >= CSS_MIN) hasil.push({ jenis: 'css', k, baris: baris(m.index + m[0].length - m[0].trimStart().length) })
    }
  } else {
    for (const m of teks.matchAll(/(?:^|\n)[ \t]*(?:async\s+)?function\s+(\w+)\s*\(/g)) {
      let d = 0
      let j = teks.indexOf('{', m.index + m[0].length)
      for (; j < teks.length; j++) {
        if (teks[j] === '{') d++
        else if (teks[j] === '}' && --d === 0) break
      }
      const k = norm(teks.slice(m.index, j + 1))
      if (k.length >= JS_MIN) hasil.push({ jenis: 'js', k, baris: baris(m.index) + 1, nama: m[1] })
    }
  }
  return hasil
}

export function salinan(berkas = berkasLayar(), baca = (f) => readFileSync(join(ROOT, f), 'utf8')) {
  const indeks = new Map()
  for (const f of berkas) {
    for (const b of blok(f, baca(f))) {
      const id = b.jenis + '|' + b.k
      if (!indeks.has(id)) indeks.set(id, [])
      indeks.get(id).push({ ...b, f })
    }
  }
  return [...indeks.values()].filter((v) => new Set(v.map((x) => x.f)).size > 1)
}

test('self-check: pendeteksi menangkap salinan CSS dan fungsi JS identik', () => {
  const css = '.a-b{display:flex;gap:8px;padding:10px 12px;border-radius:10px;background:var(--paper);color:var(--ink)}'
  const js = 'function hitungSesuatu(a,b){const x = a.map(v => v*2).filter(Boolean); const y = b.map(v => v+1); return x.concat(y).reduce((p,c)=>p+c,0)+x.length*y.length+a.length*b.length+Math.max(...x,...y)+Math.min(...x,...y)}'
  const isi = { 'a.css': css, 'b.css': '/* salinan */\n' + css.replace(/;/g, ';\n  '), 'c.js': js, 'd.js': '\n  ' + js, 'e.css': '.z{color:red}', 'f.css': '.z{color:red}' }
  const r = salinan(Object.keys(isi), (f) => isi[f])
  assert.equal(r.length, 2, 'harus tepat satu salinan CSS dan satu salinan JS (blok pendek e/f tidak dihitung)')
  assert.deepEqual(r.map((v) => v[0].jenis).sort(), ['css', 'js'])
})

test('tidak ada CSS/JS salinan antar berkas layar: pakai public/inti/', () => {
  const r = salinan()
  const pesan = r.map((v) => `  - ${v[0].jenis === 'js' ? 'fungsi ' + v[0].nama + '()' : 'aturan ' + v[0].k.slice(0, 60) + '…'}\n      ${v.map((x) => `${x.f}:${x.baris}`).join('\n      ')}`)
  assert.equal(
    r.length,
    0,
    `\n${r.length} blok disalin antar berkas (SEBAB: modul menyalin, bukan memakai berkas bersama).\n` +
      `AKIBAT: salinan menyimpang saat satu dibetulkan dan muatan awal membengkak.\n` +
      `PERBAIKI: pindahkan ke public/inti/ (atau pakai yang sudah ada) dan muat dari kedua halaman; jangan melonggarkan gerbang.\n` +
      pesan.join('\n'),
  )
})
