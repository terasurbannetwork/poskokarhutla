// SENGAJA MERAH (blok B0, 19 Okt 2026): audit menemukan simulasi udara/cuaca/gunungapi tak ada di "tab" registry (rute 404),
// simulasi gempa di tab_sembunyi tapi tampil di nav, dan gempa mencatat tab tanpa bagian halaman. Hijau begitu public/bencana.json dibetulkan.
//
// Gerbang tab registry (public/bencana.json) vs halamannya.
//
// Registry "tab" / "tab_sembunyi" dibaca footer (kaki.js), rute /<bencana>/<tab> di worker, dan OG.
// Kalau halaman punya tab yang tak tercatat, rutenya 404; kalau registry menyebut tab yang
// tak ada, tautannya mati; kalau tab_sembunyi tak dihormati halaman, tab yang diminta
// disembunyikan tetap tampil di nav. Sumber kebenaran halaman = TABS + TAB_SEMBUNYI di kode
// halaman dan <section id="p-..."> di index.html. Pesan merah menyebut bencana dan tabnya.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const baca = (p) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '')
const reg = JSON.parse(baca('public/bencana.json')).bencana.filter((b) => b.status !== 'mati')

// berkas JS tempat TABS/TAB_SEMBUNYI hidup per modul (karhutla = public/index.html)
const BERKAS = {
  karhutla: ['public/index.html'],
  banjir: ['public/banjir/index.html'],
  gempa: ['public/gempa/tab.js'],
  cuaca: ['public/cuaca/cuaca.js'],
  udara: ['public/udara/app.js'],
  gunungapi: ['public/gunungapi/app.js'],
  kekeringan: ['public/kekeringan/app.js'],
}

function halaman(b) {
  const dir = b.rute === '/' ? 'public/' : `public${b.rute}`
  const html = baca(dir + 'index.html')
  const kode = (BERKAS[b.id] || []).map(baca).join('\n')
  const larik = kode.match(/const TABS\s*=\s*\[([\s\S]*?)\];/)
  const sembunyi = kode.match(/const TAB_SEMBUNYI\s*=\s*new Set\(\[([^\]]*)\]\)/)
  const TABS = larik ? [...larik[1].matchAll(/\[\s*"([a-z_]+)"\s*,/g)].map((m) => m[1]) : []
  const SEMB = sembunyi ? [...sembunyi[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]) : []
  const bagian = [...html.matchAll(/<section[^>]*\bid="p-([a-z_]+)"/g)].map((m) => m[1])
  // halaman simulasi terpisah yang benar-benar ditautkan dari index.html juga sebuah tab
  const sepasang = existsSync(join(ROOT, dir, 'simulasi.html')) && /simulasi\.html/.test(html) ? ['simulasi'] : []
  return { TABS, SEMB, bagian, ada: new Set([...TABS, ...bagian, ...sepasang]) }
}

const lapor = (baris, sebab) => `${sebab}\n  - ${baris.join('\n  - ')}`

test('parser halaman menemukan TABS dan bagian tiap bencana non-mati (bukan lulus karena kosong)', () => {
  const kosong = reg.filter((b) => { const h = halaman(b); return !h.TABS.length || !h.bagian.length }).map((b) => b.id)
  assert.deepEqual(kosong, [], `gerbang buta: TABS/section tak terbaca untuk ${kosong.join(', ')}. Daftarkan berkas kodenya di BERKAS pada tests/agen/gerbang-tab-registry.test.mjs.`)
})

test('tiap tab di registry punya bagian halaman yang nyata', () => {
  const hilang = []
  for (const b of reg) {
    const { ada } = halaman(b)
    for (const t of b.tab) if (!ada.has(t)) hilang.push(`${b.id}: tab "${t}" ada di registry tapi tak ada <section id="p-${t}"> / TABS di halamannya`)
  }
  assert.deepEqual(hilang, [], lapor(hilang, 'Akibatnya tautan footer/rute mati. Hapus tab dari public/bencana.json atau bangun bagiannya.'))
})

test('tiap tab di halaman tercatat di registry "tab" (kalau tidak, rutenya 404)', () => {
  const luput = []
  for (const b of reg) {
    const { ada } = halaman(b)
    for (const t of ada) if (!b.tab.includes(t)) luput.push(`${b.id}: tab "${t}" ada di halaman tapi tidak di "tab" registry (rute ${b.rute}${t} 404)`)
  }
  assert.deepEqual(luput, [], lapor(luput, 'Tambahkan tab ke "tab" bencana itu di public/bencana.json (dan ke "tab_sembunyi" bila tak boleh tampil di nav).'))
})

test('tab di tab_sembunyi benar-benar tidak tampil di nav', () => {
  const bocor = []
  for (const b of reg) {
    const { TABS, SEMB } = halaman(b)
    for (const t of b.tab_sembunyi || []) {
      if (!b.tab.includes(t)) bocor.push(`${b.id}: tab_sembunyi memuat "${t}" yang tak ada di "tab"`)
      else if (TABS.includes(t) && !SEMB.includes(t)) bocor.push(`${b.id}: tab "${t}" di tab_sembunyi tapi tetap tampil di nav (TABS halaman memuatnya, TAB_SEMBUNYI tidak)`)
    }
  }
  assert.deepEqual(bocor, [], lapor(bocor, 'Registry bilang disembunyikan, halaman menampilkannya. Samakan TAB_SEMBUNYI di kode halaman atau kosongkan tab_sembunyi di registry.'))
})
