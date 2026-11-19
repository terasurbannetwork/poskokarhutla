// Gerbang versioning Bot Laporan BNPB (pemilik 19 Nov 2026: "buat versioning, kamu yang urus setelahnya ya").
// VERSI sama dengan entri changelog teratas, entri berurutan turun, tanggal sah, isi berbahasa pemakai (tanpa nama berkas atau jalur).
// Jejak: sidik berkas perilaku bot dicatat per versi di tests/wa/fixtures/versi-sidik.json; berkas berubah tanpa versi naik = gagal.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { VERSI, CHANGELOG, NAMA_BOT, tChangelog } from '../../scripts/wa/versi.mjs'

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const banding = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d } return 0 }
// Berkas yang menentukan perilaku bot di WA (bukan uji, bukan dokumen)
export const BERKAS_BOT = ['scripts/wa/proyek.mjs', 'scripts/wa/agen.mjs', 'scripts/wa/agen_pagar.mjs', 'scripts/wa/agen_isi.py', 'scripts/wa/biaya.mjs',
  'scripts/wa/claude.mjs', 'scripts/wa/arah.cjs', 'scripts/wa/gateway/index.js', 'scripts/wa/gateway/limiter.js', 'scripts/wa/agen/PEDOMAN.md',
  'scripts/wa/agen/PEDOMAN-HARIAN.md', 'scripts/wa/agen/PEDOMAN-PENANGANAN.md', 'scripts/wa/maksud.mjs', 'scripts/wa/hias.cjs', 'scripts/wa/durasi.mjs', 'scripts/wa/rapi_spasi.py',
  ...fs.readdirSync(path.join(AKAR, 'scripts/wa/claude')).filter((n) => n.endsWith('.md')).sort().map((n) => 'scripts/wa/claude/' + n)]
const sidik = () => {
  const h = crypto.createHash('sha256')
  for (const f of BERKAS_BOT) h.update(f + '\0' + fs.readFileSync(path.join(AKAR, f), 'utf8').replace(/\r\n/g, '\n') + '\0')
  return h.digest('hex').slice(0, 16)
}

test('nama, versi, dan changelog konsisten', () => {
  assert.equal(NAMA_BOT, 'Bot Laporan BNPB')
  assert.equal(CHANGELOG[0].versi, VERSI, 'VERSI harus sama dengan entri changelog teratas')
  for (let i = 1; i < CHANGELOG.length; i++) assert.ok(banding(CHANGELOG[i - 1].versi, CHANGELOG[i].versi) > 0, `urutan turun: ${CHANGELOG[i - 1].versi} > ${CHANGELOG[i].versi}`)
  for (const c of CHANGELOG) {
    assert.match(c.tanggal, /^\d{4}-\d{2}-\d{2}$/); assert.ok(c.isi.length > 0)
    for (const x of c.isi) assert.doesNotMatch(x, /\.(mjs|cjs|js|py|json)\b|scripts\/|~\//, `bahasa pemakai, tanpa nama berkas: ${x}`)
  }
  assert.match(tChangelog(), new RegExp(`Versi sekarang: v${VERSI.replace(/\./g, '\\.')}`))
})

test('berkas perilaku bot berubah = versi naik (sidik per versi)', () => {
  const f = path.join(AKAR, 'tests/wa/fixtures/versi-sidik.json')
  const catat = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}
  const s = sidik()
  if (process.env.PERBARUI_SIDIK_VERSI === '1') { catat[VERSI] = s; fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(catat, null, 1) + '\n'); return }
  assert.ok(catat[VERSI], `versi ${VERSI} belum punya sidik: jalankan PERBARUI_SIDIK_VERSI=1 node --test tests/wa/versi.test.mjs sesudah menulis changelog`)
  assert.equal(catat[VERSI], s, `berkas perilaku bot berubah sesudah v${VERSI} dirilis: naikkan VERSI, tambah entri changelog, lalu perbarui sidik`)
})
