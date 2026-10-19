// Gerbang _headers terbit (16 Okt 2026).
//
// Insiden: dua deploy gagal di CI karena public/_headers hasil scripts/terbit/versi.py berisi 136 aturan
// (batas Cloudflare 100, kode 100324). Tidak ada yang menahan sebelum push. Gerbang ini menyalin public/ ke
// direktori sementara, menjalankan versi.py persis seperti terbit.yml (`python3 scripts/terbit/versi.py`),
// lalu menghakimi _headers hasilnya. versi.py menggabung aturan ("/*.html", "/*.js" + pengecualian beratribut
// `! Cache-Control`), jadi jumlahnya ~40; lebih dari 80 = peringatan dini. Kalau merah: kurangi aturan tulisan tangan di
// public/_headers atau minta mekanik-mesin menggabung lebih jauh di versi.py.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MAKS_ATURAN = 100
const PERINGATAN = 80   // peringatan dini: jauh sebelum batas keras Cloudflare
const MAKS_BARIS = 2000

const semua = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? semua(join(d, e.name)) : [join(d, e.name)])
const web = (akar, p) => '/' + relative(akar, p).split(sep).join('/')

// salin public/ lalu terbitkan seperti CI; `ubah(akar)` menyuntik keadaan salah untuk bukti merah
function terbit(ubah) {
  const akar = mkdtempSync(join(tmpdir(), 'headers-'))
  cpSync(join(ROOT, 'public'), akar, { recursive: true })
  ubah?.(akar)
  execFileSync('python3', [join(ROOT, 'scripts/terbit/versi.py'), akar], { stdio: 'pipe' })
  return akar
}

// _headers -> [{ pola, header, lepas, urut }]; aturan = baris yang diawali "/"; "! Nama" = lepas header (Cloudflare)
function urai(teks) {
  const aturan = []
  for (const b of teks.split('\n')) {
    if (b.startsWith('/')) aturan.push({ pola: b.trim(), header: {}, lepas: new Set(), urut: [] })
    else if (/^\s+\S/.test(b) && aturan.length) {
      const a = aturan.at(-1), t = b.trim()
      if (t.startsWith('! ')) { a.lepas.add(t.slice(2).trim().toLowerCase()); a.urut.push(['!', t.slice(2).trim().toLowerCase()]); continue }
      const i = b.indexOf(':'), n = b.slice(0, i).trim().toLowerCase(), v = b.slice(i + 1).trim()
      a.header[n] = v; a.urut.push([n, v])
    }
  }
  return aturan
}

// semantik splat Cloudflare: satu `*` rakus mencocokkan apa pun (termasuk "/")
const cocok = (pola, jalur) =>
  new RegExp('^' + pola.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(jalur)

// Cache-Control efektif sebuah jalur: aturan diterapkan berurutan, "! H" membuang yang terkumpul, nilai ganda digabung koma
function efektif(aturan, jalur) {
  const nilai = []
  for (const a of aturan) if (cocok(a.pola, jalur))
    for (const [n, v] of a.urut) {
      if (n === '!' && v === 'cache-control') nilai.length = 0
      else if (n === 'cache-control') nilai.push(v)
    }
  return nilai
}

// kembalikan daftar pelanggaran (kosong = sehat)
function periksa(akar) {
  const teks = readFileSync(join(akar, '_headers'), 'utf8')
  const aturan = urai(teks)
  const salah = []
  if (aturan.length > MAKS_ATURAN)
    salah.push(`${aturan.length} aturan > ${MAKS_ATURAN}: Cloudflare menolak deploy (kode 100324)`)
  else if (aturan.length > PERINGATAN)
    salah.push(`${aturan.length} aturan > ${PERINGATAN} (peringatan dini; batas Cloudflare ${MAKS_ATURAN}, kode 100324)`)
  for (const b of teks.split('\n'))
    if (b.length > MAKS_BARIS) salah.push(`baris ${b.length} karakter > ${MAKS_BARIS}: ${b.slice(0, 40)}...`)
  const berkas = semua(akar).map((p) => web(akar, p)).filter((p) => p !== '/_headers')
  for (const h of berkas.filter((p) => p.endsWith('.html'))) {
    const nc = aturan.some((a) => a.header['cache-control'] === 'no-cache' && cocok(a.pola, h))
    if (!nc) salah.push(`halaman ${h} tidak kena aturan no-cache`)
  }
  for (const p of berkas) {
    const cc = efektif(aturan, p)
    if (cc.length > 1) salah.push(`${p} kena Cache-Control bentrok: ${cc.join(' | ')}`)
  }
  return salah
}

test('_headers hasil versi.py lolos batas Cloudflare dan tak bentrok', () => {
  const akar = terbit()
  try {
    assert.deepEqual(periksa(akar), [],
      'SEBAB: _headers hasil terbit melanggar batas/aturan Cloudflare. AKIBAT: wrangler deploy ditolak di CI ' +
      '(insiden 16 Okt 2026, 136 aturan). PERBAIKAN: kurangi aturan di public/_headers atau halaman HTML, ' +
      'atau minta mekanik-mesin menggabung aturan per folder di scripts/terbit/versi.py.')
  } finally { rmSync(akar, { recursive: true, force: true }) }
})

test('gerbang _headers bisa merah: aturan >80, baris panjang, no-cache hilang, Cache-Control bentrok', () => {
  // aturan tulisan tangan menggemuk sampai >80 tapi <=100: versi.py masih lolos, gerbang memperingatkan
  const a0 = terbit()
  const n0 = urai(readFileSync(join(a0, '_headers'), 'utf8')).length
  rmSync(a0, { recursive: true, force: true })
  let akar = terbit((a) => {
    const hp = join(a, '_headers')
    let tambah = ''
    for (let i = 0; i < PERINGATAN + 5 - n0; i++) tambah += `/uji-${i}\n  X-Uji: 1\n`
    writeFileSync(hp, readFileSync(hp, 'utf8') + '\n' + tambah)
  })
  try { assert.ok(periksa(akar).some((s) => /aturan > 80/.test(s)), 'peringatan dini >80 harus terdeteksi') }
  finally { rmSync(akar, { recursive: true, force: true }) }

  akar = terbit()
  try {
    const hp = join(akar, '_headers')
    const asli = readFileSync(hp, 'utf8')
    appendFileSync(hp, `\n/panjang\n  X-Uji: ${'a'.repeat(2100)}\n`)
    assert.ok(periksa(akar).some((s) => /karakter > 2000/.test(s)), 'baris >2000 harus terdeteksi')

    writeFileSync(hp, asli.replace(/^\/\*\.html\n {2}Cache-Control: no-cache\n/m, ''))
    assert.ok(periksa(akar).some((s) => /halaman \/index\.html tidak kena aturan no-cache/.test(s)), 'no-cache hilang harus terdeteksi')

    mkdirSync(join(akar, 'banjir/data'), { recursive: true })
    writeFileSync(join(akar, 'banjir/data/x.json'), '{}')
    writeFileSync(hp, asli + '\n/banjir/*\n  Cache-Control: public, max-age=31536000, immutable\n')
    assert.ok(periksa(akar).some((s) => /banjir\/data\/x\.json kena Cache-Control bentrok/.test(s)), 'bentrok harus terdeteksi')
  } finally { rmSync(akar, { recursive: true, force: true }) }
})
