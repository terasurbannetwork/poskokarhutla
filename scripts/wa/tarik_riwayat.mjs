#!/usr/bin/env node
// Pemicu tarik riwayat sekali jalan: node scripts/wa/tarik_riwayat.mjs --sejak 2026-11-04 [--sampai 2026-11-07] [--jid 1203...@g.us]
// Memanggil POST /riwayat di gateway yang sedang hidup (127.0.0.1). Token dibaca dari scripts/wa/.env, tidak pernah dicetak.
import { createRequire } from 'node:module'
const { muatEnv } = createRequire(import.meta.url)('./umum.cjs')
muatEnv()
const arg = (n) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined }
const sejak = arg('sejak'), sampai = arg('sampai') || new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
if (!sejak) { console.error('pakai: --sejak YYYY-MM-DD [--sampai YYYY-MM-DD] [--jid <jid>]'); process.exit(2) }
try {
  const r = await fetch(`http://127.0.0.1:${process.env.PORT || 3101}/riwayat`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: process.env.GATEWAY_TOKEN || '' },
    body: JSON.stringify({ sejak, sampai, ...(arg('jid') ? { jid: arg('jid') } : {}) }), signal: AbortSignal.timeout(60 * 60e3),
  })
  const j = await r.json().catch(() => ({}))
  console.log(r.status, JSON.stringify(j, null, 2))
  process.exit(r.ok ? 0 : 1)
} catch (e) { console.error('gagal:', String(e.message || e)); process.exit(1) }
