// Gerbang model sub-agent (15 Okt 2026, pola gemah-ripah 28 Sep 2026).
//
// Sub-agent tanpa model tertulis IKUT model sesi induk. Sesi induk di repo ini
// Opus, jadi tiap tugas latar `general-purpose` diam-diam membakar Opus.
// Dua pagar:
//   1. env CLAUDE_CODE_SUBAGENT_MODEL di .claude/settings.json menurunkan
//      agent bawaan (tanpa frontmatter) ke Sonnet;
//   2. tiap agent khusus di .claude/agents/ wajib menulis `model:` sendiri
//      (pengerja sonnet, pemeriksa pola haiku).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

test('settings repo menurunkan sub-agent bawaan dari Opus', () => {
  const s = JSON.parse(readFileSync('.claude/settings.json', 'utf8'))
  const m = s.env?.CLAUDE_CODE_SUBAGENT_MODEL ?? ''
  assert.notEqual(m, '', 'env.CLAUDE_CODE_SUBAGENT_MODEL hilang dari .claude/settings.json')
  assert.ok(!m.toLowerCase().includes('opus'), `CLAUDE_CODE_SUBAGENT_MODEL=${m} masih Opus`)
})

test('tiap agent khusus menulis model di frontmatter', () => {
  const dir = '.claude/agents'
  const tanpa = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .filter((f) => !/^---[\s\S]*?\nmodel:\s*\S+[\s\S]*?\n---/.test(readFileSync(`${dir}/${f}`, 'utf8')))
    : []
  assert.deepEqual(tanpa, [], 'agent tanpa baris model: di frontmatter (akan diam-diam ikut Opus)')
})
