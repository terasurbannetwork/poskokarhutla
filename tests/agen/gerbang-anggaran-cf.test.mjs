// Gerbang anggaran Cloudflare Free (aturan pemilik 29 Okt 2026): tidak ada panen per menit; batas Free diprediksi SEBELUM kerja diterima.
// Rencana: docs/panen/RENCANA-PANEN-DATA.md (bagian terakhir). Tiap pemeriksa di bawah adalah fungsi murni yang diuji menolak masukan palsu.
//
// KONVENSI scheduled() di src/worker.js: satu cron "* * * * *" (akun Free maks 5 jadwal untuk SEMUA worker), jadi tiap tugas
// memilih waktunya sendiri. Tugas BARU wajib terpasang pada MENIT TETAP: `m === 15`, `getUTCMinutes() === 38` (satu angka, paling
// sering sekali per jam; dua menit hanya sah bila ada pembatas jam, mis. `getUTCHours() === 0 && (m === 5 || m === 35)`).
// Tugas yang memang lebih sering dari per jam hanya sah bila namanya (string pertama `console.log("...")`, atau nama fungsi
// yang di-await bila tak ada log) terdaftar di LEBIH_SERING dengan alasan. Daftar itu cuma boleh menyusut; jangan ditambah.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const baca = (p) => readFileSync(join(ROOT, p), 'utf8')
const lsFiles = (pola) => execFileSync('git', ['ls-files', '-z', '--', pola], { cwd: ROOT, maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean)

// ---------- 1. cron trigger wrangler ----------
function cekWrangler(nama, crons) {
  const s = JSON.stringify(crons)
  return s === '["* * * * *"]' ? [] : [`${nama}: triggers.crons = ${s}; wajib persis ["* * * * *"]. Akun Workers Free maks 5 jadwal cron untuk SEMUA worker; tugas baru dipasang di scheduled() (src/worker.js) pada menit tetap, bukan jadwal baru.`]
}

// ---------- 2. dispatcher scheduled() ----------
// Tugas yang lebih sering dari per jam (warisan), beserta alasannya. Menyusut saja.
const LEBIH_SERING = {
  'gempa': 'katalog BMKG/USGS tiap menit (inti peringatan dini)',
  'peringatan': 'dicek tiap menit sesudah gempa baru tersimpan',
  'ews gempa': 'email EWS dekat pusat gempa, menyusul gempa tiap menit',
  'nowcast': 'tiap 10 menit (m % 10)',
  'gunungapi': 'tiap 30 menit (MAGMA, 1 permintaan)',
  'hujan': 'SIHKA tiap 10 menit (kuota tulis D1, lihat src/hujan.js)',
  'tugas api': 'cek murah tiap menit atas tugas_kompleks.json; tugas dibuat sekali per versi',
  'kabar ulang': 'coba-ulang kabar gagal, jeda 1/5/15/60 menit',
  'alarm himawari': 'etag R2 berubah -> alarm; cek murah tiap menit',
  'push daerah': 'menit >= 25 jam kelipatan 3: sisa akun dilanjutkan menit berikutnya',
  'sihka': 'di dalam blok menit 23 (tiap jam); barisnya sendiri tanpa syarat menit',
  'sihka dasar': 'di dalam blok menit 23, jam 20 UTC (harian)',
}
const MENIT = '(?:m|getUTCMinutes\\(\\))'
function menitTetap(b) {
  if (new RegExp(`\\b${MENIT}\\s*(>=|<=|>|<|%|!==)`).test(b)) return false
  const n = new Set([...b.matchAll(new RegExp(`\\b${MENIT}\\s*===\\s*(\\d+)`, 'g'))].map((x) => x[1])).size
  return n === 1 || (n > 1 && /getUTCHours\(\)/.test(b))
}
function cekDispatcher(kode, izin = LEBIH_SERING) {
  const a = kode.indexOf('async scheduled(')
  if (a < 0) return ['async scheduled( tidak ditemukan di src/worker.js; gerbang buta']
  const salah = []
  for (const b of kode.slice(a).split('\n').slice(1)) {
    if (/^  \},?\s*$/.test(b)) break
    if (!/\bawait\s+\w+/.test(b) || /ev\.cron === CRON_TITIK/.test(b)) continue
    const nama = b.match(/console\.log\("([^"]+)"/)?.[1] ?? b.match(/await\s+(\w+)/)[1]
    if (nama in izin || menitTetap(b)) continue
    salah.push(`tugas "${nama}" di scheduled() jalan lebih sering dari per jam (tanpa pin menit tetap) dan tidak ada di LEBIH_SERING. Pasang pada menit tetap (m === N) agar paling sering 1x/jam; panen per menit menghabiskan kuota Free (100k request/hari, tulis D1).`)
  }
  return salah
}

// ---------- 3. workflow ----------
// Hanya himawari.yml yang boleh lebih rapat dari per jam.
const WORKFLOW_RAPAT = { 'himawari.yml': ['7,37 * * * *'] /* mosaik citra tiap 30 menit; dibatasi sumbernya */ }
function cekCron(berkas, cron, izin = WORKFLOW_RAPAT) {
  const menit = cron.trim().split(/\s+/)[0]
  if (/^\d+$/.test(menit) || (izin[berkas] ?? []).includes(cron)) return []
  return [`${berkas}: cron "${cron}" lebih sering dari per jam (kolom menit "${menit}" bukan satu angka). Menit Actions terbatas dan GitHub menunda cron; ubah ke satu menit tetap atau daftarkan alasan di WORKFLOW_RAPAT.`]
}
const cronWorkflow = (isi) => [...isi.matchAll(/^\s*-\s*cron:\s*["']([^"']+)["']/gm)].map((m) => m[1])

// ---------- 4. anggaran aset ----------
const PLAFON_BERKAS = 15000, PLAFON_UKURAN = 25 * 1024 * 1024
function cekAset(daftar) {
  const salah = []
  if (daftar.length > PLAFON_BERKAS) salah.push(`public/ memuat ${daftar.length} berkas terlacak git; plafon ${PLAFON_BERKAS} (75% dari 20.000 batas aset Workers Free). Lewat batas = deploy ditolak; arsipkan ke R2 atau gabung berkas.`)
  for (const [p, u] of daftar.filter(([, u]) => u > PLAFON_UKURAN)) salah.push(`${p} berukuran ${(u / 1048576).toFixed(1)} MiB > 25 MiB; batas aset tunggal Workers 25 MiB. Pecah berkas atau pindahkan ke R2.`)
  return salah
}

test('wrangler: persis satu cron "* * * * *" di kedua config', () => {
  for (const f of ['wrangler.jsonc', 'wrangler.warga.jsonc']) {
    const c = JSON.parse(baca(f).replace(/^\s*\/\/.*$/gm, '')).triggers?.crons ?? []
    assert.deepEqual(cekWrangler(f, c), [])
  }
  assert.equal(cekWrangler('x', ['* * * * *', '0 * * * *']).length, 1, 'cron tambahan harus ditolak')
  assert.equal(cekWrangler('x', []).length, 1, 'tanpa cron harus ditolak')
  assert.equal(cekWrangler('x', ['*/5 * * * *']).length, 1, 'cron lain harus ditolak')
})

test('scheduled(): tugas di luar daftar warisan wajib pada menit tetap', () => {
  assert.deepEqual(cekDispatcher(baca('src/worker.js')), [])
  const buruk = (l) => `async scheduled(ev, env) {\n${l}\n  },\n`
  assert.equal(cekDispatcher(buruk('try { console.log("panen baru", JSON.stringify(await panenBaru(env))); } catch {}')).length, 1, 'tanpa pin menit harus ditolak')
  assert.equal(cekDispatcher(buruk('if (m % 5 === 0) try { console.log("panen baru", await panenBaru(env)); } catch {}')).length, 1, 'tiap 5 menit harus ditolak')
  assert.equal(cekDispatcher(buruk('if (m >= 10) try { await panenBaru(env); } catch {}')).length, 1, 'rentang menit harus ditolak')
  assert.equal(cekDispatcher(buruk('if (m === 5 || m === 35) try { await panenBaru(env); } catch {}')).length, 1, 'dua menit tanpa pembatas jam harus ditolak')
  assert.deepEqual(cekDispatcher(buruk('if (m === 41) try { await panenBaru(env); } catch {}')), [], 'menit tetap lolos')
  assert.deepEqual(cekDispatcher(buruk('if (w.getUTCHours() === 0 && (m === 5 || m === 35)) try { await panenBaru(env); } catch {}')), [], 'dua menit + pembatas jam lolos')
  assert.equal(cekDispatcher('tanpa dispatcher').length, 1, 'dispatcher hilang harus ditolak (bukan lolos diam)')
})

test('scheduled(): daftar warisan tidak menyimpan nama yang sudah tak ada di kode', () => {
  const kode = baca('src/worker.js')
  const mati = Object.keys(LEBIH_SERING).filter((n) => !kode.includes(`"${n}"`))
  assert.deepEqual(mati, [], `LEBIH_SERING memuat tugas yang sudah hilang: ${mati.join(', ')}; hapus (daftar hanya boleh menyusut)`)
})

test('workflow berjadwal: tidak ada cron lebih rapat dari per jam kecuali warisan', () => {
  const salah = []; let n = 0
  for (const f of lsFiles('.github/workflows/*.yml')) for (const c of cronWorkflow(baca(f))) { n++; salah.push(...cekCron(f.split('/').pop(), c)) }
  assert.deepEqual(salah, [])
  assert.ok(n > 10, `hanya ${n} cron terbaca; regex gerbang buta`)
  assert.equal(cekCron('baru.yml', '*/5 * * * *').length, 1, 'tiap 5 menit harus ditolak')
  assert.equal(cekCron('baru.yml', '7,37 * * * *').length, 1, 'dua menit/jam di workflow baru harus ditolak')
  assert.equal(cekCron('himawari.yml', '7,37 * * * *').length, 0, 'warisan himawari lolos')
  assert.equal(cekCron('himawari.yml', '*/10 * * * *').length, 1, 'himawari tidak boleh makin rapat')
  assert.equal(cekCron('baru.yml', '40 */3 * * *').length, 0)
})

test('anggaran aset: berkas public/ terlacak <= 15.000 dan tiap berkas <= 25 MiB', () => {
  const daftar = lsFiles('public').flatMap((p) => { try { return [[p, statSync(join(ROOT, p)).size]] } catch { return [] } })
  console.log(`# public/: ${daftar.length} berkas terlacak (plafon ${PLAFON_BERKAS}), terbesar ${Math.max(...daftar.map(([, u]) => u))} byte`)
  assert.deepEqual(cekAset(daftar), [])
  assert.equal(cekAset(Array.from({ length: PLAFON_BERKAS + 1 }, (_, i) => [`public/f${i}`, 1])).length, 1, '15.001 berkas harus ditolak')
  assert.equal(cekAset(Array.from({ length: PLAFON_BERKAS }, (_, i) => [`public/f${i}`, 1])).length, 0, '15.000 tepat lolos')
  assert.equal(cekAset([['public/besar.bin', PLAFON_UKURAN + 1]]).length, 1, 'berkas > 25 MiB harus ditolak')
})
