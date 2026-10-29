// Pembantu bersama gateway (CJS) dan otomatis.mjs: muat .env, normalisasi nomor, daftar koma.
const fs = require('fs')
const os = require('os')
const path = require('path')

const RUMAH = path.join(os.homedir(), '.wa-bot')
// ~/.wa-bot memuat sesi WA dan token: hanya pemilik akun.
try { fs.mkdirSync(RUMAH, { recursive: true, mode: 0o700 }); fs.chmodSync(RUMAH, 0o700) } catch {}

function muatEnv(berkas = path.join(__dirname, '.env')) {
  let isi = ''
  try { isi = fs.readFileSync(berkas, 'utf8') } catch { return }
  for (const baris of isi.split(/\r?\n/)) {
    const m = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m || baris.trim().startsWith('#')) continue
    const v = m[2].replace(/^(['"])(.*)\1$/, '$2')
    if (process.env[m[1]] === undefined) process.env[m[1]] = v
  }
}

// 08.. / +62.. / 62.. -> 62..; JID grup (...@g.us) dibiarkan.
function normalWa(v) {
  const s = String(v ?? '').trim()
  if (/@g\.us$/i.test(s)) return s
  const d = s.replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('62')) return d
  if (d.startsWith('0')) return '62' + d.slice(1)
  return d
}

const daftar = (v) => String(v ?? '').split(',').map((x) => x.trim()).filter(Boolean)
const rumah = (p) => String(p || '').replace(/^~(?=\/|$)/, os.homedir())

module.exports = { muatEnv, normalWa, daftar, rumah, RUMAH }
