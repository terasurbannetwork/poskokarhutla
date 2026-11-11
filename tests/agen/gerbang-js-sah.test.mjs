/* Gerbang sintaks: tiap berkas .js terlacak git di bawah public/ lolos `node --check`. 11 Nov 2026: komentar sebaris menelan `el = null;` di
   public/inti/alarm.js, deklarasi `let` jadi galat sintaks, pop-up alarm mati di semua halaman bencana dan terbit tanpa satu uji pun merah.
   Vendor dan .min.js dikecualikan (bukan kode kita). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { AKAR } from './fixtures/ratchet.mjs'

const jalan = promisify(execFile)
const periksa = (f) => jalan(process.execPath, ['--check', f], { cwd: AKAR }).then(() => null, (e) => `${f}: ${String(e.stderr || e.message).split('\n').find((b) => /Error/.test(b)) || 'galat'}`)

test('public/**/*.js lolos node --check', async () => {
  const berkas = execFileSync('git', ['ls-files', '-z', '--', 'public/*.js', 'public/**/*.js'], { cwd: AKAR, encoding: 'utf8' })
    .split('\0').filter((f) => f && !/\/(vendor|lib)\//.test(f) && !/\.min\.js$/.test(f) && !/ 2\./.test(f))
  assert.ok(berkas.length > 100, `pemindai buta: hanya ${berkas.length} berkas`)
  const galat = []
  for (let i = 0; i < berkas.length; i += 8) galat.push(...(await Promise.all(berkas.slice(i, i + 8).map(periksa))).filter(Boolean))
  assert.deepEqual(galat, [])
})

test('pemeriksa tidak buta: deklarasi let yang ditelan komentar tertangkap', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs'), { tmpdir } = await import('node:os'), path = await import('node:path')
  const d = mkdtempSync(path.join(tmpdir(), 'js-sah-')), f = path.join(d, 'x.js')
  try {
    writeFileSync(f, 'let a = 1, b = 2,   // komentar el = null;\nlet c = 3;\n')
    assert.ok(await periksa(f))
    writeFileSync(f, 'let a = 1, el = null;   // komentar\nlet c = 3;\n')
    assert.equal(await periksa(f), null)
  } finally { rmSync(d, { recursive: true, force: true }) }
})
