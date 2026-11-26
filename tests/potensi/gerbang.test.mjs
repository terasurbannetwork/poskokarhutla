/* Gerbang PH-15 (data/kajian-bnpb/potensi-hidromet/RENCANA-UJI.md U9; KEPUTUSAN K1, D11, D21; KEAMANAN-PRIVASI).
   Aturan: tanpa kata terlarang, titik tengah, status huruf kapital, atau literal warna di public/potensi; katalog rekomendasi per pihak
   tidak pernah di public/ (hanya lewat rute staf); tab Rekomendasi tidak statis; /potensi terdaftar dan terkunci sampai pemilik menjawab Q10. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { berkas, baca } from '../agen/fixtures/ratchet.mjs'
import { KATA_DILARANG } from '../dampak-peringatan/kata_dilarang.mjs'
import { KATALOG } from '../../src/rekomendasi_katalog.js'
import { PUBLIK_TANPA_SESI, HTML_RUTE } from '../../src/gerbang_halaman.js'

const BERKAS = berkas('public/potensi', /\.(js|css|html)$/)
const KAPITAL = /(["'`>])\s*(AWAS|SIAGA|WASPADA|NORMAL)\s*(?=["'`<])/
const WARNA = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/
const buangKomentar = (f, s) => f.endsWith('.css') ? s.replace(/\/\*[\s\S]*?\*\//g, '')
  : f.endsWith('.html') ? s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  : s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1')
const kata = new RegExp(`\\b(${KATA_DILARANG.join('|')})\\b|·`, 'i')
/* kalimat yang menyangkal ("tidak pernah menyatakan ... aman", "tidak berarti nol atau aman") sah, seperti docs dampak-peringatan; vonisnya yang dilarang */
const nafi = (l) => l.replace(/\b(tidak|tanpa|bukan|jangan)\b[^.;]{0,70}/gi, '')
const temuan = (files, re, saring = (s) => s) => files.flatMap((f) => buangKomentar(f, baca(f)).split('\n').map((l, i) => [f, i + 1, saring(l)]).filter(([, , l]) => re.test(l)).map(([f, i, l]) => `${f}:${i} ${l.trim().slice(0, 80)}`))

test('PH-15: berkas public/potensi terbaca', () => assert.ok(BERKAS.length >= 8, 'pemindai tidak menemukan berkas public/potensi'))

test('PH-15: tanpa kata terlarang dan titik tengah di teks tampil', () => {
  const m = temuan(BERKAS, kata, nafi)
  assert.deepEqual(m, [], 'kata terlarang menjanjikan keselamatan atau klaim korban (K1); ganti dengan kalimat polos tanpa klaim, pisahkan dengan koma bukan titik tengah\n' + m.join('\n'))
})

test('PH-15: tanpa teks status huruf kapital semua di string tampil (CSS text-transform tidak dihitung)', () => {
  const m = temuan(BERKAS.filter((f) => !f.endsWith('.css')), KAPITAL)
  assert.deepEqual(m, [], 'status ditulis Awas, Siaga, Waspada, Normal (huruf kapital hanya di awal); pemilik membenci kapital semua\n' + m.join('\n'))
})

test('PH-15: tanpa literal warna di CSS atau blok style (token dari public/inti/tema.css)', () => {
  const m = temuan(BERKAS.filter((f) => !f.endsWith('.js')), WARNA, (l) => l.replace(/<meta[^>]*>/g, '').replace(/^\s*--[\w-]+\s*:.*$/, ''))
  assert.deepEqual(m, [], 'warna harus var(--token) dari public/inti/tema.css; tambah token di tema.css bila belum ada, jangan literal di sini\n' + m.join('\n'))
})

test('PH-15: katalog rekomendasi per pihak tidak ada di public/ (D11)', () => {
  const butir = ['pusat', 'prov', 'kab'].flatMap((p) => Object.values(KATALOG[p]).flat().map((x) => x.teks))
  assert.ok(butir.length >= 10, 'katalog tidak terbaca dari src/rekomendasi_katalog.js')
  const sampel = [...new Set(butir)].map((t) => t.slice(0, 50))
  const publik = [...berkas('public', /\.(js|css|html|json)$/)].filter((f) => f !== 'public/ews_tindakan.js')
  const bocor = publik.flatMap((f) => { const s = baca(f); return sampel.filter((t) => s.includes(t)).map((t) => `${f}: "${t}"`) })
  assert.deepEqual(bocor, [], 'butir katalog pusat/prov/kab hanya boleh keluar lewat rute staf /api/potensi/rekomendasi; hapus dari public/ (D11, K1)\n' + bocor.join('\n'))
})

test('PH-15: index.html tanpa tab Rekomendasi statis (dibuat app.js sesudah rute staf 200)', () => {
  assert.doesNotMatch(baca('public/potensi/index.html'), /rekomendasi/i, 'tab Rekomendasi tidak boleh ada di HTML statis; tab hanya dibuat app.js bila /api/potensi/rekomendasi menjawab 200 (D21)')
  assert.match(baca('public/potensi/app.js'), /\/api\/potensi\/rekomendasi/, 'app.js harus menguji rute staf sebelum membuat tab')
})

test('PH-15: /potensi terdaftar di peta situs dan terkunci (bukan PUBLIK_TANPA_SESI) sampai Q10', () => {
  assert.match(baca('src/peta_situs.js'), /\["\/potensi"/, 'tiap halaman baru wajib punya entri registri src/peta_situs.js (PS-*)')
  assert.ok(HTML_RUTE.some(([re]) => re.test('/potensi')), 'rute /potensi hilang dari HTML_RUTE di src/gerbang_halaman.js')
  assert.ok(!PUBLIK_TANPA_SESI.has('/potensi'), '/potensi masuk PUBLIK_TANPA_SESI: pemilik belum menjawab Q10; bila sengaja dibuka, ubah gerbang ini bersama keputusannya')
})

test('pemeriksa: fixture jahat tertangkap', () => {
  assert.ok(!kata.test(nafi('tidak pernah menyatakan wilayah aman')) && kata.test(nafi('wilayah aman')), 'nafi')
  for (const s of ['wilayah aman', 'a · b', 'jumlah terdampak']) assert.ok(kata.test(s), s)
  for (const s of ['x = "AWAS"', "<b>NORMAL</b>"]) assert.ok(KAPITAL.test(s), s)
  for (const s of ['color:#fff', 'color: rgb(1,2,3)', 'a{background:hsla(0 0% 0%)}']) assert.ok(WARNA.test(s), s)
  assert.ok(!KAPITAL.test('x = "Awas"') && !WARNA.test('color:var(--ink)'))
})
