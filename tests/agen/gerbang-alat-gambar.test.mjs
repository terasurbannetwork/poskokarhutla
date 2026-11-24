/* Gerbang alat gambar wilayah (AG-07; data/kajian-bnpb/alat-gambar/RENCANA-UJI.md §3 dan §5).
   Sebab aturan: luas gambar bukan luas terbakar, tanpa vonis "aman", gambar adalah data lokasi pengguna (D10, D11).
   Akibat bila dilanggar: pemakai membaca angka keliru sebagai fakta lapangan atau koordinatnya bocor.
   Perbaikan: ganti kata/pola yang ditunjuk pesan; jangan melonggarkan gerbang ini. */
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const BERKAS = ['public/alat_gambar.js', 'public/alat_gambar_geo.js', 'public/alat_gambar.css']
const D10 = new Set(BERKAS)

const buangKomentar = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1')
/* kalimat dalam komentar/teks yang menafikan ("Bukan luas terbakar") sah; pelanggar = pakai tanpa "bukan"/"tidak" di dekatnya */
export function periksaKata(src) {
  const temuan = [], s = src
  for (const m of s.matchAll(/luas\s+(terbakar|bakar)/gi)) {
    const dekat = s.slice(Math.max(0, m.index - 40), m.index).toLowerCase()
    if (!/\b(bukan|tidak|tanpa|jangan)\b/.test(dekat)) temuan.push(`"${m[0]}" dipakai tanpa penafian`)
  }
  for (const k of ['aman', 'bebas api', 'padam', 'pelaku']) if (new RegExp(`\\b${k}\\b`, 'i').test(s)) temuan.push(`kata terlarang "${k}"`)
  if (/luasTerbakar/.test(s)) temuan.push('peubah luasTerbakar')
  if (/malam[^\n]{0,60}(berarti|artinya|menandakan)[^\n]{0,40}gambut|gambut[^\n]{0,60}(karena|sebab)[^\n]{0,20}malam/i.test(s)) temuan.push('tafsir "malam berarti gambut"')
  return temuan
}
export function periksaKode(kode) {
  const k = buangKomentar(kode), temuan = []
  if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(k)) temuan.push('gambar ditulis ke penyimpanan peramban')
  // KEAMANAN-PRIVASI §17 dan RENCANA-UJI §3: fetch hanya ke berkas JSON milik situs (data/, geo/), tanpa koordinat gambar di alamat.
  if (/XMLHttpRequest|sendBeacon|\bWebSocket\b/.test(k)) temuan.push('jaringan selain berkas JSON situs (XHR/beacon/socket)')
  if (/["'`](https?:)?\/\/[^"'`\s]/.test(k)) temuan.push('alamat di luar situs')
  for (const m of k.matchAll(/\bfetch\s*\(\s*([^)]*)\)/g)) if (m[1].trim() !== 'u' || !/\bmuat\s*=\s*u\s*=>/.test(k)) temuan.push(`fetch di luar pembungkus muat: fetch(${m[1]})`)
  for (const m of k.matchAll(/\bmuat\s*\(\s*(["'`])([^"'`]*)\1/g)) {
    if (!/^\/?(data|geo)\//.test(m[2])) temuan.push(`muat ke luar data/ atau geo/: ${m[2]}`)
    if (/\$\{[^}]*\b(ll|lng|lat|lngLat|simpul|titik|uji|bentuk)\b/.test(m[2])) temuan.push(`koordinat gambar masuk alamat: ${m[2]}`)
  }
  if (/\b(history\.(push|replace)State|location\.(hash|search|href)\s*=|URLSearchParams)/.test(k)) temuan.push('gambar masuk URL')
  if (/\b(ukurAktif|S\.ukur)\b/.test(k)) temuan.push('menyentuh ukurAktif/S.ukur (alat ukur lain)')
  for (const m of k.matchAll(/innerHTML\s*=\s*`([\s\S]*?)`/g))
    for (const e of m[1].matchAll(/\$\{([^}]*)\}/g)) if (/\b(S\.|titik|lngLat|simpul|ll\b)/.test(e[1])) temuan.push(`innerHTML memuat data: \${${e[1]}}`)
  return temuan
}
const baca = p => readFileSync(ROOT + p, 'utf8')
const msg = (b, t) => `${b}: ${t.join('; ')}. Akibat: angka/lokasi pengguna salah dibaca atau bocor. Perbaiki di berkas itu sesuai RENCANA-UJI.md §3, jangan longgarkan gerbang.`

test('pelanggar sintetis ditolak (gerbang tidak buta)', () => {
  assert.ok(periksaKata('const t = "Luas terbakar: 5 km2"').length)
  assert.ok(periksaKata('Area ini aman').length)
  assert.ok(periksaKata('bebas api').length)
  assert.ok(periksaKata('let luasTerbakar = 1').length)
  assert.ok(periksaKata('malam berarti gambut').length)
  assert.equal(periksaKata('Bukan luas terbakar.').length, 0)
  for (const k of ['localStorage.setItem("g",1)', 'fetch("/x")', 'muat("https://a.b/c.json")', 'muat(`data/x?ll=${ll}`)', 'navigator.sendBeacon("/l", s)', 'history.replaceState(0,"",u)', 'S.ukur = 1', 'ukurAktif = true', 'el.innerHTML = `<b>${S.titik}</b>`'])
    assert.ok(periksaKode(k).length, k)
  assert.equal(periksaKode('x.innerHTML = `<b>${IKON}</b>` // fetch( di komentar').length, 0)
  assert.equal(periksaKode('const muat = u => fetch(u); muat("data/a.json"); muat(`geo/desa/${c}.json`)').length, 0)
})

for (const b of BERKAS) {
  test(`${b} lolos kata dan kode terlarang`, () => {
    const src = baca(b), t = [...periksaKata(src), ...(b.endsWith('.js') ? periksaKode(src) : [])]
    assert.deepEqual(t, [], msg(b, t))
  })
}

test('tidak ada berkas publik baru selain tiga berkas D10', () => {
  const ada = readdirSync(ROOT + 'public').filter(f => /^alat_gambar/.test(f)).map(f => 'public/' + f)
  const lebih = ada.filter(f => !D10.has(f))
  assert.deepEqual(lebih, [], `Berkas ${lebih.join(', ')} di luar tiga berkas D10 (alat_gambar.js, _geo.js, .css). Gabungkan ke yang ada atau minta keputusan pemilik.`)
})

test('layar ini terdaftar di LAYAR kartu standar', () => {
  assert.match(baca('tests/agen/gerbang-kartu-std.test.mjs'), /public\/alat_gambar\.js/, 'Tambahkan {skrip:"public/alat_gambar.js", html:"public/index.html"} ke LAYAR di gerbang-kartu-std.test.mjs.')
})
