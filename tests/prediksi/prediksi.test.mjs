// /prediksi: self-check tiap skrip (tanpa jaringan) + invarian berkas keluaran bila ada.
// Skrip: scripts/prediksi/{catat,nilai,kalibrasi,terbit}.py `uji` menolak masukan salah (peluang > 1, hari sasaran
// tidak sesudah terbit, arsip menyusut/berubah) dan menguji kalibrasi fail-closed (Brier uji tidak turun = mentah).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DATA = join(ROOT, 'public/prediksi/data')

for (const s of ['catat', 'nilai', 'kalibrasi', 'terbit', 'kalender', 'koreksi', 'dampak', 'jalan']) {
  test(`${s}.py uji`, () => {
    const out = execFileSync('python3', [join(ROOT, 'scripts/prediksi', s + '.py'), 'uji'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    assert.match(out, /uji lulus/)
  })
}

test('bayangan/model.py uji: fitur cocok dengan skrip lab, 514 kab terpetakan, 6 pasang senama tidak tertukar', () => {
  const out = execFileSync('python3', [join(ROOT, 'scripts/prediksi/bayangan/model.py'), 'uji'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  assert.match(out, /uji lulus/)
})

test('arsip bayangan: kode _B berkolom p 0..1 dan tidak ikut kartu Besok', () => {
  const dir = join(DATA, 'arsip')
  if (!existsSync(dir)) return
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
    for (const b of readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean)) {
      const e = JSON.parse(b)
      if (!e.k.endsWith('_B')) continue
      assert.ok(['BNJ_B', 'LSR_B', 'CEX_B', 'KRH_B'].includes(e.k), e.k)
      assert.equal(e.kol[0], 'p')
      for (const r of Object.values(e.kab)) for (const x of r) if (x) assert.ok(x[0] >= 0 && x[0] <= 1, `${e.k} p ${x[0]}`)
    }
  }
  const p = join(DATA, 'prediksi.json')
  if (existsSync(p)) for (const k of Object.keys(JSON.parse(readFileSync(p, 'utf8')).kode)) assert.ok(!k.endsWith('_B'), `${k} bocor ke kartu Besok`)
})

test('skor.json bayangan: tiap baris banding punya vonis dan n_banding', () => {
  const p = join(DATA, 'skor.json')
  if (!existsSync(p)) return
  const b = JSON.parse(readFileSync(p, 'utf8')).bayangan
  if (!b) return
  assert.ok(b.catatan.includes('Sumber hujan beda'))
  for (const x of b.banding) {
    assert.ok(['belum teruji', 'mengalahkan baseline', 'belum mengalahkan baseline'].includes(x.vonis))
    if (x.n_banding < 30) assert.equal(x.vonis, 'belum teruji')
  }
})

test('arsip: tiap baris sah, hari = t+1..t+3, (t, kode) unik', () => {
  const dir = join(DATA, 'arsip')
  if (!existsSync(dir)) return
  const kunci = new Set()
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
    for (const b of readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean)) {
      const e = JSON.parse(b)
      const k = `${e.t}|${e.k}`
      assert.ok(!kunci.has(k), `${f}: ${k} tercatat dua kali (jalan ulang menimpa?)`)
      kunci.add(k)
      const t = Date.parse(e.t + 'T00:00:00Z')
      e.hari.forEach((h, i) => assert.equal(Date.parse(h + 'T00:00:00Z') - t, (i + 1) * 864e5, `${f} ${k}: hari[${i}] = ${h} bukan t+${i + 1}`))
      assert.equal(f.slice(0, 7), e.t.slice(0, 7), `${k} di berkas bulan yang salah`)
    }
  }
})

test('prediksi.json: 514 kab, peluang 0..1 dan menurun menurut ambang', () => {
  const p = join(DATA, 'prediksi.json')
  if (!existsSync(p)) return
  const d = JSON.parse(readFileSync(p, 'utf8'))
  assert.equal(d.kab.length, 514, `kab ${d.kab.length}`)
  assert.ok(d.batasan.length > 0)
  const h = d.kode.HJN
  for (const k of d.kab) {
    for (const r of k.HJN || []) {
      if (!r) continue
      const [p1, p20, p50, tot] = r
      assert.ok(p1 >= p20 && p20 >= p50 && p50 >= 0 && p1 <= 1, `${k.id} HJN peluang ${p1}/${p20}/${p50}`)
      assert.ok(tot >= 0 && tot < 1000, `${k.id} HJN tot ${tot}`)
    }
  }
  if (h) for (const v of Object.values(h.vonis)) assert.ok(['belum teruji', 'mengalahkan baseline', 'belum mengalahkan baseline'].includes(v[0]))
})

test('halaman memuat inti, bukan salinan', () => {
  const html = readFileSync(join(ROOT, 'public/prediksi/index.html'), 'utf8')
  for (const f of ['../inti/tema.css', '../inti/gaya.css', '../inti/format.js']) assert.ok(html.includes(f), `index.html tidak memuat ${f}`)
  for (const id of ['p-besok', 'p-rapor', 'p-dampak', 'p-konfirmasi', 'p-laporan']) assert.ok(html.includes(`id="${id}"`), `tab ${id} hilang`)
  for (const f of ['../inti/kartu.css', '../inti/tip.js', 'laporan_prov.js', 'laporan_layar.js']) assert.ok(html.includes(f), `index.html tidak memuat ${f}`)
  const js = readFileSync(join(ROOT, 'public/prediksi/prediksi.js'), 'utf8')
  assert.match(js, /x-kode-regu/)
  assert.match(js, /\/api\/prediksi\/konfirmasi/)
})

test('kalender_risiko.json: p = tahun ada / tahun penuh, 0..1', () => {
  const p = join(DATA, 'kalender_risiko.json')
  if (!existsSync(p)) return
  const d = JSON.parse(readFileSync(p, 'utf8'))
  assert.ok(d.n_tahun > 0 && d.metode)
  for (const [id, k] of Object.entries(d.kab)) for (const j of d.jenis) {
    assert.equal(k[j].ada.length, 12, id)
    k[j].ada.forEach((a, i) => {
      assert.ok(a >= 0 && a <= d.n_tahun, `${id} ${j} ${i}`)
      assert.equal(k[j].p[i], Math.round(a / d.n_tahun * 100) / 100)
    })
  }
})

test('koreksi bulanan: riwayat append-only, versi aktif konsisten', () => {
  const r = join(DATA, 'koreksi_riwayat.jsonl')
  if (!existsSync(r)) return
  const baris = readFileSync(r, 'utf8').split('\n').filter(Boolean).map((b) => JSON.parse(b))
  const k = new Set()
  for (const b of baris) {
    assert.ok(['dipakai', 'ditolak', 'menunggu'].includes(b.status))
    assert.ok(!k.has(b.bulan + b.grup), `${b.bulan} ${b.grup} dicatat dua kali`)
    k.add(b.bulan + b.grup)
  }
  const a = JSON.parse(readFileSync(join(DATA, 'kalibrasi_aktif.json'), 'utf8'))
  assert.equal(a.versi, new Set(baris.filter((b) => b.status === 'dipakai').map((b) => b.bulan)).size)
})

test('tab Dampak: dimuat malas, data lewat esc(), tanpa sisa interpolasi mentah yang dulu bocor', () => {
  const js = readFileSync(join(ROOT, 'public/prediksi/prediksi.js'), 'utf8')
  const mulai = js.slice(js.indexOf('async function mulai()'), js.indexOf('let tunda'))
  assert.ok(!/dampak\.json|jalan\.json/.test(mulai), 'dampak.json/jalan.json tidak boleh ditarik saat halaman dibuka')
  assert.match(js, /if \(t === "dampak"\) muatDampak\(\)/)
  assert.ok(!js.includes('${jam(mulai)}'), 'jam() tanpa esc')
  assert.ok(!js.includes('<td>${x.ambang}</td>') && !js.includes('+${x.tenggang}</td>'), 'ambang/tenggang tanpa esc')
  const g = js.slice(js.indexOf('function gambarDampak'), js.indexOf('async function muatDampak'))
  for (const f of ['o.nama', 'o.kelas', 'o.way', 'g.kelas', 'tgl(f.acuan', 'k.nama']) assert.ok(g.includes(`esc(${f}`), `${f} tanpa esc di tab Dampak`)
})

test('dampak.json: 514 kab, berlabel skenario/paparan, bidang null bila sumber tak memuat', () => {
  const p = join(DATA, 'dampak.json')
  if (!existsSync(p)) return
  const d = JSON.parse(readFileSync(p, 'utf8'))
  assert.match(d.label, /bukan prakiraan/)
  assert.equal(Object.keys(d.kab).length, 514)
  for (const v of Object.values(d.kab)) assert.deepEqual(Object.keys(v).sort(), ['gempa', 'genangan', 'terisolir'])
})

test('jalan.json: ruas tunggal <= jumlah way, top terurut menurun', () => {
  const p = join(DATA, 'jalan.json')
  if (!existsSync(p)) return
  const d = JSON.parse(readFileSync(p, 'utf8'))
  assert.match(d.label, /Bukan peluang/)
  for (const [id, k] of Object.entries(d.kab)) {
    assert.ok(k.way_tunggal <= k.way && k.ruas_tunggal >= k.way_tunggal, id)
    k.top.slice(1).forEach((o, i) => assert.ok(o.km_terisolir <= k.top[i].km_terisolir, `${id} top tak terurut`))
  }
})

test('tab Laporan provinsi: data dimuat malas, teks lewat esc(), pil hipotesis membaca pakai', () => {
  const js = readFileSync(join(ROOT, 'public/prediksi/prediksi.js'), 'utf8')
  assert.ok(!/lengas\.json|amatan\/HJN\.json|ambang_persentil/.test(js), 'data laporan hanya ditarik laporan_layar.js saat tab dibuka')
  assert.match(js, /if \(t === "laporan"\) muatLaporan\(\)/)
  const g = readFileSync(join(ROOT, 'public/prediksi/laporan_layar.js'), 'utf8')
  assert.doesNotMatch(g.slice(0, g.indexOf('async function muatLaporan')), /ambil\(|fetch\(/, 'laporan_layar.js tidak boleh menarik data sebelum tab dibuka')
  assert.match(g, /\.pakai/, 'pil hipotesis harus membaca ambang_persentil.pakai, bukan angka tetap')
  assert.match(g, /window\.print\(\)/)
  for (const f of ['b.nama', 's.nama']) assert.ok(g.includes(`esc(${f}`), `${f} tanpa esc di tab Laporan`)
})
