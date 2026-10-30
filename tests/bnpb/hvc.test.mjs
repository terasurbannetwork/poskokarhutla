// Gerbang pipeline R = H x V / C (scripts/bnpb: hvc_stat, hvc_dasar, bps, terpapar, ikd, kerentanan, risiko_hvc, rs_kapasitas).
// 1) tiap modul menjalankan self-check `--cek` sungguhan (python3, stdlib, tanpa jaringan);
// 2) berkas keluaran di public/data/bnpb diuji lewat INVARIAN, bukan potret angka: ada, ukuran <= 2 MB, kunci `dibuat` pertama,
//    terpapar tinggi <= sedang+ <= penduduk, kapasitas dalam rentang raster, vonis model hanya LOLOS atau GAGAL dan konsisten dengan selang.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const akar = fileURLToPath(new URL('../../', import.meta.url))
const MODUL = ['hvc_stat', 'hvc_dasar', 'bps', 'terpapar', 'ikd', 'kerentanan', 'risiko_hvc', 'rs_kapasitas']

for (const m of MODUL) {
  test(`scripts/bnpb/${m}.py --cek hijau`, () => {
    const r = spawnSync('python3', [`scripts/bnpb/${m}.py`, '--cek'], { cwd: akar, encoding: 'utf8', timeout: 120000 })
    assert.equal(r.status, 0, `${m}: ${r.stderr.slice(-600)}`)
    assert.match(r.stdout, /--cek hijau/)
  })
}

const ada = (nama, f) => test(`public/data/bnpb/${nama}: invarian`, () => {
  const p = `${akar}public/data/bnpb/${nama}`
  assert.ok(existsSync(p), `${nama} belum terbit: jalankan pipeline-nya`)
  const teks = readFileSync(p, 'utf8')
  assert.ok(statSync(p).size <= 2_000_000, `${nama}: ${statSync(p).size} B melewati plafon 2 MB`)
  assert.ok(teks.startsWith('{"dibuat":'), `${nama}: kunci "dibuat" harus pertama`)
  f(JSON.parse(teks))
})

ada('terpapar.json', d => {
  let n = 0
  for (const [kode, k] of Object.entries(d.kab)) {
    assert.match(kode, /^\d{4}$/)
    for (const [h, v] of Object.entries(k.h)) {
      assert.ok(v[2] <= v[0] && v[0] <= k.n, `${kode}/${h}: jiwa tinggi ${v[2]} <= sedang+ ${v[0]} <= penduduk ${k.n}`)
      assert.ok(v[3] <= v[1] && v[1] <= k.b + k.l, `${kode}/${h}: rentan melebihi balita+lansia`)
    }
    n++
  }
  assert.ok(n > 400, `terlalu sedikit kabupaten: ${n}`)
})

ada('ikd.json', d => {
  const v = Object.values(d.kab)
  assert.ok(v.length > 400)
  for (const k of v) assert.ok(k.c > 0 && k.c <= 0.8 && k.min <= k.c && k.c <= k.maks, `kapasitas di luar rentang raster 0-0,79: ${JSON.stringify(k)}`)
  assert.equal(d.uji_ringkasan.hitung_kita.total, v.length)
})

ada('kerentanan.json', d => {
  assert.ok(['MENUNGGU KUNCI', 'OK', 'GAGAL'].includes(d.bps.status))
  for (const [kode, k] of Object.entries(d.kab)) {
    const z = Object.values(k.z).filter(x => x !== null).length
    assert.equal(k.v === null, z < d.min_komponen, `${kode}: V harus null persis bila komponen < ${d.min_komponen}`)
    if (d.bps.status !== 'OK') assert.equal(k.mis, null, `${kode}: tanpa kunci BPS kemiskinan harus null, bukan nol`)
  }
})

ada('risiko_hvc.json', d => {
  const u = d.uji
  assert.ok(['LOLOS', 'GAGAL'].includes(u.vonis))
  const b = u.banding
  assert.equal(u.vonis === 'LOLOS', b.M2_vs_M1.ci95[0] > 0 && b.M2_vs_M0.ci95[0] > 0, 'vonis harus mengikuti batas bawah selang, bukan selera')
  for (const m of ['M0', 'M1', 'M2', 'M3']) {
    assert.ok(['nb', 'poisson'].includes(u.model[m].keluarga))
    assert.ok(u.model[m].n_uji > 100, `${m}: ukuran uji terlalu kecil`)
  }
  assert.equal(u.model.M0.n_uji, u.model.M2.n_uji, 'semua model diuji pada baris yang sama')
  const [tr, te] = [u.pembagian.latih.split('-').map(Number), u.pembagian.uji.split('-').map(Number)]
  assert.ok(tr[1] < te[0], 'latih harus sebelum uji (tanpa bocor waktu)')
  for (const k of Object.values(d.kab)) assert.ok(k.R_total >= 0 && Object.values(k.R).every(r => r >= 0))
})

ada('rs_kapasitas.json', d => {
  for (const [kode, k] of Object.entries(d.kab)) {
    const s = k.skenario
    assert.ok(s.rendah.masuk_per_hari <= s.tengah.masuk_per_hari && s.tengah.masuk_per_hari <= s.tinggi.masuk_per_hari, `${kode}: skenario harus berurut`)
    if (d.siranap.status !== 'OK') assert.ok(Object.values(s).every(x => x.hari_penuh === null), `${kode}: tanpa SIRANAP hari_penuh harus null`)
  }
})
