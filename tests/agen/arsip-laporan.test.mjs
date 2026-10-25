// Gerbang bagian "Arsip laporan harian" di tab Laporan (public/arsip_laporan.js) dan tautan dalam
// yang dipakainya. Menagih: tiap baris menautkan ke halaman yang SUDAH ada lewat parameter tanggalnya
// (bukan membuat ulang laporannya), hari depan tidak bisa dipilih, 403 dikatakan "perlu masuk" bukan
// diam-diam kosong, dan kedua halaman tujuan benar-benar membaca parameter itu.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { AKAR } from '../warga/_bantu.mjs'

const baca = (p) => readFileSync(path.join(AKAR, p), 'utf8')

/* DOM seadanya: modul ini hanya menulis innerHTML satu wadah dan memasang dua handler. */
function muatModul() {
  const wadah = { innerHTML: '', addEventListener() {} }
  const boneka = () => ({ set onchange(v) {}, set onclick(v) {} })
  const document = {
    querySelector(s) {
      if (s === '#arsipLaporan') return wadah
      if (s === '#arTgl' || s === '#arPick') return boneka()
      return null
    },
  }
  const win = {}
  new Function('window', 'document', 'fetch', baca('public/arsip_laporan.js'))(win, document, async () => {
    throw new Error('uji tidak memanggil jaringan')
  })
  return { A: win.ArsipLaporan, wadah }
}

const HARI_INI = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
const geser = (s, n) => new Date(Date.parse(s + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)

test('arsip: tiap baris menautkan ke halaman laporan lewat parameter tanggalnya', () => {
  const { A, wadah } = muatModul()
  const h = geser(HARI_INI, -3)
  A.S.akses = 'ok'
  A.S.bnpb = new Set([h])
  A.S.karhutla = new Set([h, geser(h, -1)])
  A.S.hari = h
  A.gambar()
  const html = wadah.innerHTML

  /* & di href ditulis &amp; (HTML sah) — itu yang dicari di sini, bukan & telanjang */
  assert.ok(html.includes(`href="/laporan-bnpb?tanggal=${h}"`), 'buka laporan bencana harian')
  assert.ok(html.includes(`href="/laporan-bnpb?tanggal=${h}&amp;unduh=pptx"`), 'ikon PPT')
  assert.ok(html.includes(`href="/laporan-bnpb?tanggal=${h}&amp;unduh=pdf"`), 'ikon PDF')
  assert.ok(html.includes(`href="/laporan?hari=${h}"`), 'buka laporan karhutla harian')
  assert.ok(html.includes(`href="/laporan?hari=${h}&amp;cetak=1"`), 'ikon PDF karhutla')
  /* hari tanpa laporan bencana tersimpan: tetap ada jalan masuk untuk mengisinya */
  assert.ok(html.includes(`href="/laporan-bnpb?tanggal=${geser(h, -1)}"`) && html.includes('belum dibuat'))
  assert.ok(!html.includes(`/laporan-bnpb?tanggal=${geser(h, -1)}&amp;unduh=`), 'yang belum dibuat tidak diberi tombol unduh')
})

test('arsip: hari tanpa data karhutla dikatakan, bukan ditautkan ke halaman kosong', () => {
  const { A, wadah } = muatModul()
  A.S.akses = 'ok'
  A.S.bnpb = new Set()
  A.S.karhutla = new Set()
  A.S.hari = geser(HARI_INI, -2)
  A.gambar()
  assert.ok(wadah.innerHTML.includes('tidak ada data'))
  assert.ok(!wadah.innerHTML.includes('/laporan?hari='), 'tanpa data tidak ada tautan karhutla')
})

test('arsip: akses ditolak dikatakan "perlu masuk", bukan "belum dibuat"', () => {
  const { A, wadah } = muatModul()
  A.S.akses = 'tolak'
  A.S.karhutla = new Set([HARI_INI])
  A.S.hari = HARI_INI
  A.gambar()
  assert.ok(wadah.innerHTML.includes('perlu masuk'))
  assert.ok(!wadah.innerHTML.includes('belum dibuat'), '403 bukan berarti laporannya belum ada')
  assert.ok(!wadah.innerHTML.includes('/laporan-bnpb?tanggal='), 'tanpa akses tidak ada tautannya')
})

test('arsip: hari depan tidak bisa dipilih', () => {
  const { A, wadah } = muatModul()
  A.S.akses = 'ok'
  A.S.hari = HARI_INI
  A.gambar()
  const html = wadah.innerHTML
  assert.match(html, new RegExp(`data-h="${geser(HARI_INI, 1)}"[^>]*disabled`), 'tombol Besok mati di hari ini')
  A.pilih(geser(HARI_INI, 5))
  assert.equal(A.S.hari, HARI_INI, 'pilih() menolak tanggal sesudah hari ini')
})

test('arsip: kartu periode = satu baris Kemarin/Periode/Besok dan strip tujuh hari', () => {
  const { A, wadah } = muatModul()
  A.S.akses = 'ok'
  A.S.hari = geser(HARI_INI, -10)
  A.gambar()
  const html = wadah.innerHTML
  assert.ok(html.includes('&lsaquo; Kemarin') && html.includes('Besok &rsaquo;'))
  assert.ok(html.includes('Periode'), 'label periode seperti kartu pangantara')
  assert.equal((html.match(/class="ar-hari/g) || []).length, 7, 'strip satu pekan penuh, Senin sampai Minggu')
  assert.equal((html.match(/class="ar-ujung"/g) || []).length, 2, 'loncat pekan di kedua ujung')
  /* tanggal ditulis sendiri dalam bahasa Indonesia, bukan dibiarkan format bawaan peramban */
  assert.ok(!/<input type="date"[^>]*class=/.test(html))
  assert.match(html, /class="ar-pick"[^>]*>.*?(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),/s)
})

test('arsip: baris sebanyak 14 hari ke belakang dari tanggal terpilih', () => {
  const { A, wadah } = muatModul()
  A.S.akses = 'ok'
  A.S.hari = geser(HARI_INI, -1)
  A.gambar()
  const baris = (wadah.innerHTML.match(/<tr class=/g) || []).length   // baris kepala tabel tanpa class
  assert.equal(baris, 14)
})

test('halaman tujuan benar-benar membaca parameter tanggalnya', () => {
  const lb = baca('public/laporan_bnpb.js')
  assert.ok(lb.includes('q.get("tanggal")') && lb.includes('q.get("unduh")'), '/laporan-bnpb membaca ?tanggal dan ?unduh')
  assert.match(lb, /unduhQ === "pptx" \|\| unduhQ === "pdf"/, 'hanya dua format yang diterima')
  const lp = baca('public/laporan.js')
  assert.ok(lp.includes('get("hari")'), '/laporan membaca ?hari')
  assert.ok(lp.includes('get("cetak") === "1"'), '/laporan membaca ?cetak')
  assert.ok(lp.includes('D.hari.includes(hariQ)'), '?hari yang datanya tidak ada diabaikan')
})

test('tab Laporan memuat arsip: wadah, gaya, skrip, dan panggilan saat tab dibuka', () => {
  const ix = baca('public/index.html')
  assert.ok(ix.includes('<div id="arsipLaporan"></div>'), 'wadah ada di dalam section Laporan')
  assert.ok(ix.includes('href="/arsip_laporan.css"'))
  assert.ok(ix.includes('src="/arsip_laporan.js"'))
  assert.ok(ix.includes('if (id === "pelaporan") window.ArsipLaporan?.muat();'), 'daftar dimuat saat tab dibuka')
  const sec = ix.slice(ix.indexOf('id="p-pelaporan"'), ix.indexOf('id="p-tren"'))
  assert.ok(sec.includes('<div id="arsipLaporan"></div>'), 'wadahnya di section yang benar')
})
