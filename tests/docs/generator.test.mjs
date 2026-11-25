/* Uji generator Docs: uji diri, kesegaran keluaran, pemeriksa sumber, peta.json, dan mode gagal (sumber salah ditolak). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { SUMBER, bangun, jalankan, jalur, petaJson } from './_pembantu.mjs'

test('bangun.py --uji hijau', () => {
  const r = bangun('--uji')
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /semua lolos/)
})

test('keluaran public/docs segar terhadap sumber (--cek, ketat)', () => {
  const r = bangun('--cek')
  assert.equal(r.status, 0, r.stderr)
})

test('--cek-sumber tanpa galat dan tanpa peringatan bahasa awam pada Panduan', () => {
  const r = bangun('--cek-sumber')
  assert.equal(r.status, 0, r.stdout.split('\n').filter((l) => l.startsWith('galat')).join('\n'))
  assert.match(r.stdout, /^galat: 0$/m)
  assert.deepEqual(r.stdout.split('\n').filter((l) => /bahasa awam/.test(l) && !l.startsWith('ringkasan')), [])
})

test('--jalur: bersih, unik, beranda dua bagian, modul dan halaman dari peta.json', () => {
  const j = jalur()
  assert.equal(new Set(j).size, j.length)
  for (const x of j) assert.match(x, /^\/docs(\/[a-z0-9]+(-[a-z0-9]+)*)*$/)
  assert.ok(j.includes('/docs') && j.includes('/docs/pengembang'))
  const peta = petaJson()
  for (const m of peta.modul) {
    if ((m.halaman.panduan || []).length) assert.ok(j.includes(`/docs/${m.id}`), `modul panduan ${m.id}`)
    for (const h of m.halaman.panduan || []) assert.ok(j.includes(`/docs/${m.id}/${h.id}`), `${m.id}/${h.id}`)
    if ((m.halaman.pengembang || []).length) assert.ok(j.includes(`/docs/pengembang/${m.id}`), `modul pengembang ${m.id}`)
    for (const h of m.halaman.pengembang || []) assert.ok(j.includes(`/docs/pengembang/${m.id}/${h.id}`), `pengembang ${m.id}/${h.id}`)
  }
})

test('peta.json: tiap halaman punya berkas sumber dan judul paling banyak 40 karakter', () => {
  const peta = petaJson()
  for (const m of peta.modul) {
    for (const b of ['panduan', 'pengembang']) {
      if (!(m.halaman[b] || []).length) continue
      assert.ok(m.judul[b].length <= 40, `${m.id}/${b}: judul modul`)
      for (const h of m.halaman[b]) {
        assert.ok(h.judul.length <= 40, `${m.id}/${h.id}: judul ${h.judul.length} karakter`)
        assert.ok(fs.existsSync(path.join(SUMBER, h.berkas)), `${h.berkas} tidak ada`)
      }
    }
  }
})

/* kode Python tanpa garis miring terbalik: baris baru lewat chr(10) */
const baris = 'chr(10)'

test('mode gagal: HTML mentah, tautan terlarang, dua h1, dan tautan Docs hilang dilaporkan sebagai galat', () => {
  const kode = [
    'import sys; sys.path.insert(0, "scripts/docs"); import bangun',
    `n = ${baris}`,
    'ada = lambda rel: None',
    'salah = n.join(["# A", "", "x", "", "# B", "", "## Z", "", "x"])',
    'print("h1", len([x for x in bangun.periksa_sumber(salah, "x.md", ada) if x[0] == "galat"]))',
    'mentah = n.join(["# A", "", "## Z", "", "<div>x</div>"])',
    'print("mentah", len([x for x in bangun.periksa_sumber(mentah, "x.md", ada) if x[0] == "galat" and "mentah" in x[2]]))',
    'g = []; bangun.inline("[x](javascript:alert(1))", g); print("tautan", len(g))',
    'hilang = n.join(["# A", "", "## Z", "", "[x](/docs/tidak/ada)"])',
    'print("hilang", len([x for x in bangun.periksa_sumber(hilang, "x.md", ada, None, {"/docs"}) if x[0] == "galat"]))',
  ].join('\n')
  const r = jalankan(['-c', kode])
  assert.equal(r.status, 0, r.stderr)
  for (const k of ['h1', 'mentah', 'tautan', 'hilang']) {
    const m = r.stdout.match(new RegExp(`^${k} ([0-9]+)$`, 'm'))
    assert.ok(m && Number(m[1]) > 0, `${k} tidak terdeteksi: ${r.stdout}`)
  }
})

test('mode gagal: peta.json yang salah ditolak (judul terlalu panjang, nomor bercelah, ikon tak dikenal, id kembar)', () => {
  const kode = [
    'import sys, json; sys.path.insert(0, "scripts/docs"); import bangun',
    'ok = lambda r: True',
    'p = bangun.peta_uji(); print("sah", len(bangun.cek_peta(p, ok)))',
    'p["modul"][0]["judul"]["panduan"] = "x" * 41; print("judul", len(bangun.cek_peta(p, ok)))',
    'p = bangun.peta_uji(); p["modul"][0]["halaman"]["panduan"][1]["berkas"] = "panduan/satu/05-hitung.md"; print("celah", len(bangun.cek_peta(p, ok)))',
    'p = bangun.peta_uji(); p["modul"][0]["ikon"] = "x"; print("ikon", len(bangun.cek_peta(p, ok)))',
    'p = bangun.peta_uji(); p["modul"].append(json.loads(json.dumps(p["modul"][0]))); print("kembar", len(bangun.cek_peta(p, ok)))',
  ].join('\n')
  const r = jalankan(['-c', kode])
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /^sah 0$/m)
  for (const k of ['judul', 'celah', 'ikon', 'kembar']) {
    const m = r.stdout.match(new RegExp(`^${k} ([0-9]+)$`, 'm'))
    assert.ok(m && Number(m[1]) > 0, `${k} tidak terdeteksi: ${r.stdout}`)
  }
})
