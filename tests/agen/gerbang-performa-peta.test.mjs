/* Gerbang performa peta (PKH-15), aturan: scratchpad pk/docs/rendering-performance.md.
   Dipindai: public/index.html dan public/*.js (satu tingkat, tanpa vendor) yang menyebut maplibre.
   Tiga aturan: (1) set(Paint|Layout)Property/setFilter di dalam setInterval, atau di putaran requestAnimationFrame/setTimeout
   yang menjadwalkan dirinya lagi: tiap panggilan itu membuang cache tekstur seluruh ubin terrain; (2) setPixelRatio harus dibatasi <= 2;
   (3) lapisan kustom (type "custom") butuh jalur berhenti saat document.hidden (visibilitychange/visibilityState/document.hidden di berkasnya).
   BATAS analisis statis (regex + kurung seimbang, bukan AST): fungsi callback hanya dilacak bila ditulis inline atau bernama dan
   didefinisikan di berkas yang sama; panggilan lewat objek/impor lain, string kode, atau nama dinamis lolos; aturan (3) hanya memeriksa
   keberadaan penanda di berkas, bukan bahwa jalurnya sungguh menghentikan pekerjaan. Daftar sisa: fixtures/performa-peta-sisa.json
   (hanya boleh menyusut; perintis: ISI_DAFTAR=1). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { AKAR, baca, muatDaftar, banding, buangKomentarJs, tegas } from './fixtures/ratchet.mjs'

const MUTASI = /\.(?:setPaintProperty|setLayoutProperty|setFilter)\s*\(/
const PENJADWAL = /\b(setInterval|requestAnimationFrame|setTimeout)\s*\(/g

/** teks dari `(` pada indeks i sampai kurung penutup seimbang (tanpa memahami string/regex; cukup untuk kode layar ini). */
function seimbang(k, i, buka = '(', tutup = ')') {
  let d = 0
  for (let j = i; j < k.length; j++) {
    if (k[j] === buka) d++
    else if (k[j] === tutup && --d === 0) return k.slice(i, j + 1)
  }
  return k.slice(i)
}

/** badan fungsi bernama `nama` di berkas yang sama ('' bila tidak ketemu). */
function badanFungsi(k, nama) {
  const re = new RegExp(`(?:function\\s+${nama}\\s*\\(|(?:const|let|var)\\s+${nama}\\s*=\\s*(?:async\\s*)?(?:function\\s*\\(|\\([^)]*\\)\\s*=>|\\w+\\s*=>)|\\b${nama}\\s*\\([^)]*\\)\\s*\\{)`)
  const m = re.exec(k)
  if (!m) return ''
  const b = k.indexOf('{', m.index + m[0].length - 1)
  return b < 0 ? '' : seimbang(k, b, '{', '}')
}

export function pelanggaranTimer(kode) {
  const k = buangKomentarJs(kode)
  const lihat = new Set()
  for (const m of k.matchAll(PENJADWAL)) {
    const args = seimbang(k, m.index + m[0].length - 1)
    const nama = /^\(\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(args)?.[1]
    const badan = nama ? badanFungsi(k, nama) : args
    if (!MUTASI.test(badan)) continue
    // bergelang = setInterval, atau callback menjadwalkan DIRINYA lagi (callback bernama: `timer(nama...)`; inline: timer yang sama)
    // `return setTimeout(f, n)` = coba lagi sampai siap, bukan denyut
    const lagi = nama ? new RegExp(`(?<!return\\s)\\b(?:setTimeout|requestAnimationFrame)\\s*\\(\\s*${nama}\\b`) : new RegExp(`(?<!return\\s)\\b${m[1]}\\s*\\(`)
    const berulang = m[1] === 'setInterval' || lagi.test(badan)
    if (berulang) lihat.add(badan) // satu fungsi bergelang dihitung sekali, walau dijadwalkan dari dua tempat
  }
  return lihat.size
}

export function pelanggaranDpr(kode) {
  const k = buangKomentarJs(kode)
  let n = 0
  for (const m of k.matchAll(/\.setPixelRatio\s*\(/g)) {
    const a = seimbang(k, m.index + m[0].length - 1).slice(1, -1)
    const angka = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(a)
    const min = /Math\.min\s*\(([^)]*)\)/.exec(a)
    const sah = angka ? +angka[1] <= 2 : min && min[1].split(',').some((x) => /^\s*\d+(?:\.\d+)?\s*$/.test(x) && +x <= 2)
    if (!sah) n++
  }
  return n
}

export function pelanggaranKustom(kode) {
  const k = buangKomentarJs(kode)
  if (!/\btype\s*:\s*['"]custom['"]/.test(k)) return 0
  return /visibilitychange|visibilityState|document\.hidden/.test(k) ? 0 : 1
}

export function dipindai() {
  return ['public/index.html', ...fs.readdirSync(AKAR + 'public').filter((f) => /\.js$/.test(f) && !/ 2\./.test(f)).map((f) => 'public/' + f)]
    .filter((f) => /maplibre/i.test(baca(f)))
}

const ATURAN = { timer: pelanggaranTimer, dpr: pelanggaranDpr, kustom: pelanggaranKustom }
const ukurSemua = () => {
  const u = {}
  for (const f of dipindai()) for (const [a, fn] of Object.entries(ATURAN)) { const n = fn(baca(f)); if (n) u[`${f}|${a}`] = n }
  return u
}

test('performa peta: pelanggaran tidak bertambah (ratchet)', () => {
  const ukur = ukurSemua()
  const m = banding(ukur, muatDaftar('performa-peta-sisa.json', ukur)).map((x) => x + ' | sebab: perubahan paint/layout/filter berkala, DPR > 2, atau lapisan kustom tanpa jeda tab tersembunyi memaksa repaint terrain; perbaiki: animasikan lewat custom layer/canvas, batasi Math.min(devicePixelRatio, 2), hentikan di document.hidden')
  tegas(assert, m, 'performa-peta-sisa.json')
})

test('pemeriksa: contoh pelanggaran sintetis merah, contoh sah hijau', () => {
  assert.equal(pelanggaranTimer('setInterval(() => { map.setPaintProperty("a","circle-radius",3) }, 100)'), 1)
  assert.equal(pelanggaranTimer('function t(){ map.setFilter("a",null); requestAnimationFrame(t) }\nrequestAnimationFrame(t)'), 1)
  assert.ok(pelanggaranTimer('setTimeout(function loop(){ map.setLayoutProperty("a","visibility","none"); setTimeout(loop, 50) }, 50)') > 0)
  assert.equal(pelanggaranTimer('function p(){ if(!ok) return setTimeout(p, 9); map.setFilter("a",null) }\np()'), 0, 'coba-lagi bukan denyut')
  assert.equal(pelanggaranTimer('setTimeout(() => map.setFilter("a",null), 100)'), 0, 'sekali jalan tidak berulang')
  assert.equal(pelanggaranTimer('setInterval(() => { kanvas.draw() }, 100); /* setInterval(()=>map.setFilter()) */'), 0)
  assert.equal(pelanggaranDpr('m.setPixelRatio(window.devicePixelRatio)'), 1)
  assert.equal(pelanggaranDpr('m.setPixelRatio(3)'), 1)
  assert.equal(pelanggaranDpr('m.setPixelRatio(Math.min(devicePixelRatio, 2))'), 0)
  assert.equal(pelanggaranDpr('m.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))'), 0)
  assert.equal(pelanggaranKustom('map.addLayer({ id:"x", type: "custom", render(){} })'), 1)
  assert.equal(pelanggaranKustom('map.addLayer({ id:"x", type: "custom" }); if (document.hidden) stop()'), 0)
  assert.equal(pelanggaranKustom('map.addLayer({ id:"x", type: "fill" })'), 0)
})

test('pemindai menemukan berkas MapLibre', () => assert.ok(dipindai().includes('public/index.html'), 'index.html harus terpindai'))
