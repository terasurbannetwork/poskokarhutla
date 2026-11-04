// Pemilik tidak mau branch menumpuk (2 dan 4 Nov 2026): hook Stop wajib menjalankan sapu-branch.sh.
// Aturan ini sempat hanya tertulis di AGENTS.md dan komentar skrip, hook-nya tidak pernah terpasang.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

test('hook Stop menjalankan sapu-branch.sh', () => {
  const s = JSON.parse(fs.readFileSync('.claude/settings.json', 'utf8'))
  const perintah = (s.hooks?.Stop || []).flatMap((h) => h.hooks || []).map((h) => h.command || '')
  assert.ok(perintah.some((c) => c.includes('scripts/agents/sapu-branch.sh')), 'hook Stop tanpa sapu-branch.sh')
})

test('sapu-branch.sh menghapus branch yang sudah di main, menyisakan yang belum', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sapu-'))
  const g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'pipe' }).toString()
  g('init', '-q', '-b', 'main'); g('-c', 'user.email=a@b', '-c', 'user.name=a', 'commit', '-q', '--allow-empty', '-m', 'awal')
  g('branch', 'sudah-masuk'); g('checkout', '-q', '-b', 'belum-masuk'); g('-c', 'user.email=a@b', '-c', 'user.name=a', 'commit', '-q', '--allow-empty', '-m', 'baru'); g('checkout', '-q', 'main')
  fs.mkdirSync(path.join(d, 'scripts/agents'), { recursive: true })
  fs.copyFileSync('scripts/agents/sapu-branch.sh', path.join(d, 'scripts/agents/sapu-branch.sh'))
  execFileSync('bash', [path.join(d, 'scripts/agents/sapu-branch.sh')])
  const sisa = g('branch', '--format=%(refname:short)').split('\n').filter(Boolean).sort()
  assert.deepEqual(sisa, ['belum-masuk', 'main'])
  fs.rmSync(d, { recursive: true, force: true })
})
