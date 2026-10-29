// Kartu Insight "Perusahaan" (public/aktor.js), jendela sawit-saja 48 jam untuk pertemuan GAPKI (pemilik, 27 Okt 2026):
// sebelum SAWIT_SAJA_SAMPAI hanya sawit tanpa tab jenis; sesudahnya kartu kembali ke semua jenis tapi tetap memakai kolom luas/hotspot/firespot.
// Angka tidak dihitung ulang di layar: dibaca dari aktor_karhutla.json (scripts/data/aktor_sawit.py, aktor_walhi.cek_terkini); diuji juga invarian berkas aslinya.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const akar = new URL('../../', import.meta.url)
const kode = readFileSync(new URL('public/aktor.js', akar), 'utf8')
const per = (nama, jenis, o = {}) => ({
  nama, jenis, prov: 'Riau', grup: [`Grup ${nama}`], negara: jenis === 'sawit' ? ['MY'] : ['SG'], pemegang: [], titik_agu: 5, industri: jenis === 'sawit' ? 'Kelapa sawit' : 'Hutan tanaman (pulp)',
  cek: { poligon: 1, lokasi: 'cocok', titik_viirs: 7, titik_terkini: 0, ...o.cek }, sawit26: o.s26, harian: [], titik: [], kompleks: [],
})
const FIX = () => ({
  periode: { terkini: { dari: '10-20', sampai: '10-27' } }, negara: { MY: 'Malaysia', SG: 'Singapura' }, grup_negara: {}, grup: [], poligon: { p1: 'A', p2: 'B', p3: 'C' },
  perusahaan: [
    per('A', 'sawit', { s26: { titik: 10, luas_bakar_ha: 1200, sampai: '2026-10-19' }, cek: { titik_terkini: 3, firespot_terkini: 2 } }),
    per('B', 'sawit', { s26: { titik: 40, luas_bakar_ha: 3000, sampai: '2026-10-19' }, cek: { titik_terkini: 0, firespot_terkini: 0 } }),
    per('D', 'sawit', { cek: { titik_terkini: 1 } }),   // belum ada laporan konsesi / klasifikasi firespot: tampil "–"
    per('C', 'pbph', { s26: { titik: 99, luas_bakar_ha: 9999, sampai: '2026-10-19' }, cek: { titik_terkini: 5, firespot_terkini: 1 } }),
  ],
})
async function muat() {
  const st = { akJenis: '' }
  const Insight = { EX: ['paparan'], st, LABEL: {}, PENUH: new Set(), hl: t => `<b class="hl">${t}</b>`, seg: (k) => `<SEG ${k}>`, gambar: () => '', leg: () => {},
    ex: (judul, _s, _u, isi, sumber, seg) => `<J>${judul}</J>${isi}<SUMBER>${sumber}</SUMBER>${seg || ''}` }
  const win = {}
  const dok = { documentElement: { dataset: { situs: 'w' } }, querySelectorAll: () => [], addEventListener: () => {} }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const f = new Function('Insight', 'document', 'window', 'muatJSON', 'esc', 'fmt', 'paginasi', 'nanti', 'setTimeout', 'Laci', 'peta', 'S', '$', 'Lapis', 'Peta', 'bukaTab', 'kiriPad', 'maplibregl', 'toast', kode)
  f(Insight, dok, win, async () => FIX(), esc, n => Number(n).toLocaleString('id-ID'), () => '<PGN>', fn => fn(), () => 0, { buka() {} }, undefined, {}, () => null, {}, {}, () => {}, () => 0, {}, () => {})
  const A = win.Aktor
  await A.janji
  return { A, Insight, kartu: () => Insight.exAktor.call(Insight) }
}
const T = (s) => Date.parse(s)

test('batas jendela tepat 29 Okt 2026 10.00 WIB, dua sisi dengan jam disuntik', async () => {
  const { A } = await muat()
  assert.equal(A.SAWIT_SAJA_SAMPAI, Date.parse('2026-10-29T10:00:00+07:00'))
  assert.equal(A.sawitSaja(T('2026-10-27T12:00:00+07:00')), true)
  assert.equal(A.sawitSaja(T('2026-10-29T09:59:59+07:00')), true, 'sedetik sebelum batas masih sawit-saja')
  assert.equal(A.sawitSaja(T('2026-10-29T10:00:00+07:00')), false, 'tepat batas sudah kembali')
  assert.equal(A.sawitSaja(T('2026-11-15T00:00:00+07:00')), false)
})

test('dalam jendela: hanya sawit, tanpa tab jenis, kolom Grup/Provinsi + luas/hotspot/firespot, judul netral', async () => {
  const { A, kartu } = await muat()
  A.kini = () => T('2026-10-28T08:00:00+07:00')
  const h = kartu()
  assert.ok(!h.includes('<SEG'), 'tab Semua/Sawit/PBPH/Modal asing tidak boleh ada dalam jendela')
  assert.ok(h.includes('data-ak="A"') && h.includes('data-ak="B"') && h.includes('data-ak="D"') && !h.includes('data-ak="C"'), 'PBPH (C) tidak boleh tampil')
  assert.ok(h.includes('<b class="hl">3 perusahaan sawit</b> terindikasi karhutla 2026'), `judul: ${h.slice(0, 300)}`)
  assert.ok(h.includes('<b class="hl">4.200 ha</b>'), 'total indikasi luas = 1.200 + 3.000 (D tanpa laporan tidak dihitung, C bukan sawit)')
  assert.ok(h.includes('<b class="hl">2</b> masih ada titik panas di konsesinya 20–27 Okt'), 'A (3) dan D (1); B 0')
  for (const k of ['Perusahaan', 'Grup', 'Provinsi', 'Indikasi luas terbakar (ha)', 'Hotspot', 'Firespot']) assert.ok(h.includes(k), `kolom ${k}`)
  assert.ok(h.includes('1 Jan–19 Okt') && h.includes('20–27 Okt'), 'label periode tampil di kepala kolom')
  assert.ok(!h.includes('>Negara') && !h.includes('>Industri<'), 'Negara/Industri dibuang dalam jendela (semua sawit)')
  assert.ok(h.includes('<th class="n">No</th>'))
  assert.ok(/data-ak-urut="luas"/.test(h) && /data-ak-urut="fs"/.test(h) && /data-ak-urut="hs"/.test(h), 'tiap kolom angka bisa diurut')
  // urutan awal = luas terbesar dulu (B 3.000, A 1.200, D tanpa data terakhir)
  assert.ok(h.indexOf('data-ak="B"') < h.indexOf('data-ak="A"') && h.indexOf('data-ak="A"') < h.indexOf('data-ak="D"'), 'urut luas turun, tanpa data di dasar')
  // D: luas, hotspot 2026, firespot tidak ada -> "–", bukan 0
  const barisD = h.slice(h.indexOf('data-ak="D"')).split('</tr>')[0]
  assert.equal((barisD.match(/Belum ada datanya/g) || []).length, 3, `D: luas, hotspot 2026, firespot harus "–": ${barisD}`)
  assert.ok(h.includes('piksel VIIRS unik x 14,06 ha') && h.includes('bukan citra'), 'sumber menyebut metode indikasi luas')
  assert.ok(!/siapa|pembakar|pelaku/i.test(h), 'bahasa netral')
})

test('urut dan halaman: kolom firespot mengurutkan; 10 per halaman', async () => {
  const { A, Insight, kartu } = await muat()
  A.kini = () => T('2026-10-28T08:00:00+07:00')
  Insight.st.akUrut = 'fs'; Insight.st.akTurun = true
  const h = kartu()
  assert.ok(h.indexOf('data-ak="A"') < h.indexOf('data-ak="B"') && h.indexOf('data-ak="B"') < h.indexOf('data-ak="D"'), 'firespot A=2 > B=0 > D tanpa data')
  const lagi = Array.from({ length: 12 }, (_, i) => per(`X${i}`, 'sawit', { s26: { titik: 1, luas_bakar_ha: i, sampai: '2026-10-19' } }))
  A.d.perusahaan.push(...lagi)
  Insight.st.akUrut = 'luas'
  const baris = kartu().match(/<tr data-ak=/g).length
  assert.equal(baris, 10, `satu halaman = 10 baris, dapat ${baris}`)
})

test('sesudah jendela: tab dan kolom lama kembali otomatis, kolom baru tetap', async () => {
  const { A, Insight, kartu } = await muat()
  A.kini = () => T('2026-10-29T10:00:00+07:00')
  Insight.st.akJenis = ''
  const h = kartu()
  assert.ok(h.includes('<SEG akJenis>'), 'tab jenis kembali')
  assert.ok(h.includes('data-ak="C"') && h.includes('data-ak="A"'), 'PBPH tampil lagi')
  assert.ok(h.includes('>Negara') && h.includes('>Industri<'), 'kolom lama kembali')
  assert.ok(h.includes('<b class="hl">4 perusahaan</b> terindikasi karhutla 2026'), 'judul lama')
  for (const k of ['Indikasi luas terbakar (ha)', 'Hotspot', 'Firespot']) assert.ok(h.includes(k), `kolom baru ${k} tetap ada`)
  Insight.st.akJenis = 'pbph'
  assert.ok(!kartu().includes('data-ak="A"'), 'filter jenis berfungsi lagi')
})

test('aktor_karhutla.json asli: tiap sawit bercek punya sawit26, firespot tidak melebihi titik terkini', () => {
  const d = JSON.parse(readFileSync(new URL('public/data/aktor_karhutla.json', akar), 'utf8'))
  const sawit = d.perusahaan.filter(p => p.jenis === 'sawit' && p.cek?.poligon)
  assert.ok(sawit.length > 0)
  const tanpa = sawit.filter(p => !p.sawit26).map(p => p.nama)
  assert.deepEqual(tanpa, [], `sawit26 hilang (jalankan aktor_walhi.py): ${tanpa.join(', ')}`)
  for (const p of d.perusahaan) {
    if (p.cek?.firespot_terkini != null) assert.ok(p.cek.firespot_terkini <= p.cek.titik_terkini, `${p.nama}: firespot ${p.cek.firespot_terkini} > titik terkini ${p.cek.titik_terkini}`)
    if (p.sawit26) assert.ok(p.sawit26.luas_bakar_ha >= 0 && p.sawit26.titik >= 0, p.nama)
  }
})

test('pembangun data: aktor_sawit.py uji dan aktor_walhi.py uji lolos', () => {
  for (const s of ['aktor_sawit.py', 'aktor_walhi.py']) execFileSync('python3', [`scripts/data/${s}`, 'uji'], { cwd: akar, stdio: 'pipe' })
})
