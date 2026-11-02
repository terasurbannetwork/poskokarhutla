/* Gerbang perataan tabel (keputusan pemilik 30 Okt 2026, final):
   semua header (th) rata tengah; kolom label rata kiri; kolom lain, termasuk angka, rata tengah.
   Uji statis atas CSS yang dilacak git di public/**: th tidak boleh rata kiri/kanan, td tidak boleh rata kanan.
   td rata kiri dibiarkan, karena kolom label memang kiri dan CSS tidak tahu kolom mana yang label.
   ponytail: statis, tidak melihat cascade atau td tanpa aturan (default kiri); uji layar di Chrome kalau itu jadi masalah. */
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execSync} from 'node:child_process'

const ROOT = new URL('../..', import.meta.url).pathname

export function langgar(css) {
  const s = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const hasil = []
  for (const m of s.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const a = m[2].match(/text-align\s*:\s*(left|right|start|end)\b/)
    if (!a) continue
    for (const bagian of m[1].split(',')) {
      const ujung = bagian.trim().split(/[\s>+~]+/).pop()
      if (/::?(before|after)/.test(ujung)) continue
      const th = /^th\b|[.#\]]th\b/.test(ujung) || /^th(\W|$)/.test(ujung)
      const td = /^td(\W|$)/.test(ujung)
      if ((th && a[1] !== 'center') || (td && /right|end/.test(a[1]))) hasil.push(`${bagian.trim()} { text-align: ${a[1]} }`)
    }
  }
  return hasil
}

test('pendeteksi mengenali pelanggaran dan membiarkan yang sah', () => {
  assert.deepEqual(langgar('.t th{text-align:left}'), ['.t th { text-align: left }'])
  assert.deepEqual(langgar('.t td.n{text-align:right}'), ['.t td.n { text-align: right }'])
  assert.deepEqual(langgar('.t th:first-child{text-align:left}'), ['.t th:first-child { text-align: left }'])
  assert.deepEqual(langgar('.t td:first-child{text-align:left} .t th{text-align:center} .t td{text-align:center}'), [])
  assert.deepEqual(langgar('.t td::before{text-align:right} .tabel{text-align:right}'), [])
})

test('CSS public/** mengikuti perataan tabel', () => {
  const berkas = execSync("git ls-files 'public/*.css' 'public/**/*.css'", {cwd: ROOT}).toString().trim().split('\n').filter(f => f && !/ 2\./.test(f))
  const salah = berkas.flatMap(f => langgar(readFileSync(ROOT + f, 'utf8')).map(x => `${f}: ${x}`))
  assert.deepEqual(salah, [], 'header tabel wajib rata tengah dan sel tidak boleh rata kanan (keputusan 30 Okt 2026)')
})
