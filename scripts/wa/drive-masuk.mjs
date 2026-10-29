// Sekali jalan: izinkan bot membaca Google Drive pemilik (OAuth loopback + PKCE), simpan refresh token.
//   node scripts/wa/drive-masuk.mjs
// Butuh DRIVE_CLIENT_ID dan DRIVE_CLIENT_SECRET di scripts/wa/.env. Token ditulis ke ~/.wa-bot/drive.json (0600), tidak pernah dicetak.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const { muatEnv, RUMAH } = createRequire(import.meta.url)('./umum.cjs')
muatEnv()
const { DRIVE_CLIENT_ID: id, DRIVE_CLIENT_SECRET: rahasia } = process.env
if (!id || !rahasia) { console.error('Isi DRIVE_CLIENT_ID dan DRIVE_CLIENT_SECRET di scripts/wa/.env dulu.'); process.exit(1) }

const b64 = (b) => b.toString('base64url')
const verifier = b64(crypto.randomBytes(48))
const tantangan = b64(crypto.createHash('sha256').update(verifier).digest())
const state = b64(crypto.randomBytes(16))

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1')
  if (u.pathname !== '/') { res.writeHead(404).end(); return }
  const selesai = (kode, pesan, galat) => { res.writeHead(kode, { 'content-type': 'text/plain; charset=utf-8' }).end(pesan); server.close(); if (galat) { console.error(galat); process.exitCode = 1 } }
  if (u.searchParams.get('state') !== state) return selesai(400, 'state tidak cocok', 'state tidak cocok, dibatalkan.')
  const code = u.searchParams.get('code')
  if (!code) return selesai(400, 'ditolak', 'Izin ditolak: ' + (u.searchParams.get('error') || 'tanpa code'))
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: id, client_secret: rahasia, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier }).toString(),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.refresh_token) return selesai(500, 'gagal', `Tukar code gagal (HTTP ${r.status}${j.error ? ' ' + j.error : ''}). Coba lagi; refresh token hanya diberikan bila prompt=consent.`)
    const berkas = path.join(RUMAH, 'drive.json')
    fs.writeFileSync(berkas, JSON.stringify({ refresh_token: j.refresh_token }), { mode: 0o600 }); fs.chmodSync(berkas, 0o600)
    selesai(200, 'Berhasil. Boleh menutup tab ini.')
    console.log('Tersimpan di ' + berkas)
  } catch (e) { selesai(500, 'gagal', 'Galat: ' + e.message) }
})

let redirect = ''
server.listen(0, '127.0.0.1', () => {
  redirect = `http://127.0.0.1:${server.address().port}/`
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: id, redirect_uri: redirect, response_type: 'code', scope: 'https://www.googleapis.com/auth/drive',
    access_type: 'offline', prompt: 'consent', code_challenge: tantangan, code_challenge_method: 'S256', state,
  })
  console.log('Buka alamat ini di browser, masuk dengan akun Google pemilik:\n\n' + url + '\n')
})
