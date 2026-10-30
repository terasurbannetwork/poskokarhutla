// ════════════════════════════════════════════════════════════════════════
// Gerbang: tiap agent punya ilmu, ingatan kerja, dan wilayah berkas tunggal.
//
// Disalin dari gemah-ripah 15 Okt 2026 bersama mesinnya (scripts/agents/),
// ditulis ulang ke node:test karena repo ini tanpa vitest. Aturan tanpa
// gerbang mekanis dianggap belum jadi, jadi enam hal ini dimesinkan.
// Rinciannya AGENTS.md §1.5.
// ════════════════════════════════════════════════════════════════════════

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ILMU = join(ROOT, '.claude', 'ilmu-agent')
const roster = JSON.parse(readFileSync(join(ROOT, 'scripts', 'agents', 'roster.json'), 'utf8')).agents

const BAGIAN = [
  '## Peta berkas & tabel',
  '## Aturan & invarian',
  '## Ranjau yang pernah meledak',
  '## Gerbang yang menghakimi',
  '## Kasus',
]

test('definisi agent dan katalog orkestrator segar terhadap roster', () => {
  const r = spawnSync('node', ['scripts/agents/build.mjs', '--cek'], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(
    r.status,
    0,
    `npm run agents:check merah:\n${r.stderr}\nJalankan npm run agents:build, lalu commit hasilnya.`,
  )
})

test('tiap agent punya ilmu yang benar-benar terisi', () => {
  const kurang = []
  for (const a of roster) {
    const f = join(ILMU, `${a.nama}.md`)
    if (!existsSync(f)) {
      kurang.push(`${a.nama}: .claude/ilmu-agent/${a.nama}.md tidak ada`)
      continue
    }
    const isi = readFileSync(f, 'utf8')
    const hilang = BAGIAN.filter((b) => !isi.includes(b))
    if (hilang.length) kurang.push(`${a.nama}: bagian hilang ${hilang.join(', ')}`)
    if (isi.includes('(belum diisi)')) kurang.push(`${a.nama}: masih kerangka "(belum diisi)"`)
    if (isi.length < 2000) kurang.push(`${a.nama}: ${isi.length} karakter, di bawah 2000`)
  }
  assert.deepEqual(
    kurang,
    [],
    `${kurang.length} agent belum punya ilmu yang layak; agent tanpa ilmu mulai dari nol tiap dipanggil. ` +
      `Isi dari kode nyata (AGENTS.md §1.5):\n${kurang.join('\n')}`,
  )
})

test('tiap definisi agent memuat protokol ilmu & jejak', () => {
  const dir = join(ROOT, '.claude', 'agents')
  const tanpa = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => {
      const isi = readFileSync(join(dir, f), 'utf8')
      return !isi.includes(`node scripts/agents/ilmu.mjs baca ${f.slice(0, -3)}`) || !isi.includes('ilmu.mjs catat')
    })
  assert.deepEqual(tanpa, [], `agent tanpa protokol ilmu: ${tanpa.join(', ')}. Jalankan npm run agents:build.`)
})

test('tiap berkas kode punya tepat satu pemilik', async () => {
  // Dua pemilik = dua pengerja menyunting berkas yang sama dan balapan;
  // nol pemilik = kerja itu jatuh lagi ke agent umum yang mulai dari nol.
  // Aset (public/data, lambang, geo, img) dikecualikan: itu keluaran, bukan kode.
  const { pemilik, muatRoster } = await import('../../scripts/agents/ilmu.mjs')
  const r = muatRoster()
  const berkas = execFileSync('git', ['ls-files', 'src', 'migrations', 'scripts', 'public', 'tests', '.github'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((f) => f && !/^public\/(data|lambang|geo|img)\//.test(f))
  assert.ok(berkas.length > 150, `cuma ${berkas.length} berkas terbaca; gerbang ini jadi hijau kosong`) // 215 saat lahir

  const tanpa = []
  const ganda = []
  for (const f of berkas) {
    const p = pemilik(f, r)
    if (!p.length) tanpa.push(f)
    else if (p.length > 1) ganda.push(`${f} → ${p.join(' + ')}`)
  }
  assert.deepEqual(tanpa, [], `berkas tanpa pemilik; tambahkan glob ke "milik" di roster.json:\n${tanpa.join('\n')}`)
  assert.deepEqual(ganda, [], `berkas dengan dua pemilik sama spesifiknya; pertajam salah satu:\n${ganda.join('\n')}`)
})

test('jejak melewati berkas yang tak berubah dan memeriksa ulang yang berubah', () => {
  // Dijalankan sungguhan. "Jangan ulang review" yang juga melewati berkas yang
  // sudah BERUBAH lebih buruk daripada tidak punya jejak sama sekali.
  const dir = mkdtempSync(join(tmpdir(), 'ilmu-'))
  const f = join(dir, 'contoh.py')
  writeFileSync(f, 'a = 1\n')
  const env = { ...process.env, ILMU_DIR: dir }
  const jalan = (...arg) => execFileSync('node', ['scripts/agents/ilmu.mjs', ...arg], { cwd: ROOT, encoding: 'utf8', env })

  assert.match(jalan('cek', 'validasi-model', f), /^BARU /m, 'berkas baru harus tampil BARU')
  jalan('catat', 'validasi-model', f, 'bersih', 'uji gerbang')
  assert.match(jalan('cek', 'validasi-model', f), /^LEWATI /m, 'berkas tak berubah tidak dilewati')
  writeFileSync(f, 'a = 2\n')
  assert.match(jalan('cek', 'validasi-model', f), /^ULANG /m, 'berkas yang SUDAH berubah ikut dilewati')

  const salah = spawnSync('node', ['scripts/agents/ilmu.mjs', 'catat', 'validasi-model', f, 'mantap', 'x'], {
    cwd: ROOT,
    encoding: 'utf8',
    env,
  })
  assert.notEqual(salah.status, 0, 'vonis di luar bersih|temuan|dikerjakan diterima')
})

test('prompt pemilik tercatat, disamarkan, berlabel, dan hook tak pernah menahan', () => {
  // Repo publik: penyamaran ini satu-satunya penjaga sebelum prompt di-commit.
  const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'))
  const hook = JSON.stringify(settings.hooks?.UserPromptSubmit ?? [])
  assert.ok(hook.includes('ilmu.mjs') && hook.includes('prompt-catat'), 'hook UserPromptSubmit prompt-catat tidak terdaftar')

  const dir = mkdtempSync(join(tmpdir(), 'prompt-'))
  const env = { ...process.env, ILMU_DIR: dir }
  const kirim = (input) =>
    spawnSync('node', ['scripts/agents/ilmu.mjs', 'prompt-catat'], { cwd: ROOT, encoding: 'utf8', env, input })

  const rahasia = [
    'sk-ant-api03-AbCdEfGhIjKlMnOpQrStUv',
    'ghp_0123456789abcdefghijABCDEFGHIJ',
    'pinka@contoh.id',
    '0812-3456-7890',
    '+62 812 3456 7890',
    '3201011234567890',
    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    'isi rapat rahasia',
    'akunmesinlain',
  ]
  const prompt =
    `benerin src/worker.js dan banjir rob; baca /Users/${rahasia[8]}/Downloads/x.pdf; kunci ${rahasia[0]} ${rahasia[1]}, email ${rahasia[2]}, ` +
    `WA ${rahasia[3]} / ${rahasia[4]}, NIK ${rahasia[5]}, sha ${rahasia[6]}, password: hunter22 ` +
    `<pasted_content id="x">${rahasia[7]}</pasted_content id="x">`
  assert.equal(kirim(JSON.stringify({ session_id: 'abcdef123456', prompt })).status, 0)
  assert.equal(kirim('bukan json').status, 0, 'stdin rusak membuat hook gagal: prompt pemilik bisa tertahan')
  assert.equal(kirim(JSON.stringify({ prompt: '<task-notification>x</task-notification>' })).status, 0)
  assert.equal(kirim(JSON.stringify({ prompt: 'Tolong coba lagi' })).status, 0)
  assert.equal(kirim(JSON.stringify({ prompt: '<agent-message from="a1">laporan subagent</agent-message>' })).status, 0)

  const r = spawnSync('node', ['scripts/agents/ilmu.mjs', 'prompt'], { cwd: ROOT, encoding: 'utf8', env })
  assert.match(r.stdout, /1 dari 1 prompt/, `harus tepat 1 prompt tercatat (notifikasi otomatis dilewati):\n${r.stdout}`)
  const bocor = rahasia.filter((s) => r.stdout.includes(s))
  assert.deepEqual(bocor, [], `penyamaran bocor, ini akan terbit di repo publik: ${bocor.join(' | ')}`)
  assert.ok(!r.stdout.includes('hunter22'), 'password: <nilai> tidak disamarkan')
  assert.match(r.stdout, /\[banjir, warga-api\]/, `label agent salah:\n${r.stdout}`)
  assert.match(r.stdout, /src\/worker\.js/, 'jalur berkas ikut tersamar; agent kehilangan konteks')
})

test('AGENTS.md menulis pengetahuan dan otoritas orkestrator', () => {
  const agents = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')
  assert.ok(agents.includes('### 1.5 Orkestrator'), 'AGENTS.md §1.5 hilang')
  for (const kata of ['roster.json', 'agents:build', 'ilmu.mjs pemilik', 'KATALOG.md', 'Otoritas membuat agent'])
    assert.ok(agents.includes(kata), `AGENTS.md §1.5 tidak lagi menyebut "${kata}"`)
  assert.ok(existsSync(join(ILMU, 'orkestrator.md')), 'ilmu orkestrator hilang')
})
