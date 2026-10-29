// Gateway WhatsApp (Baileys) Centurisk97. Dua tugas:
//  1. MASUK: pesan dari nomor di WA_IZIN (teks, caption, dokumen, foto) diteruskan ke worker
//     (POST multipart ke /api/wa/gateway?k=), lewat outbox berkas supaya tak hilang bila worker mati.
//     Sesudah tersimpan, pengatur otomatis (../otomatis.mjs) dipicu dengan debounce 2 menit.
//  2. KELUAR: API lokal 127.0.0.1 /send dan /send-file, lewat limiter anti-blokir (limiter.js).
// Tidak ada LLM. Ini WhatsApp Web TIDAK RESMI: baca ../../../../pangantara/wa-gateway/ANTI-BAN.md.
const fs = require('fs')
const path = require('path')
const express = require('express')
const qrcode = require('qrcode-terminal')
const pino = require('pino')
const { muatEnv, normalWa, daftar, rumah, RUMAH } = require('../umum.cjs')
muatEnv()
const {
  default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion,
  downloadMediaMessage, normalizeMessageContent,
} = require('@whiskeysockets/baileys')
const limiter = require('./limiter')
const drive = require('../drive.cjs').buat({ kabar: (t) => kabarPemilik(t) }) // Google Drive: mati sendiri bila belum dikonfigurasi
const { samaAman, idAman, idSah, jalurKeluaran, mimeBoleh, ukuranBerkas } = require('../aman.cjs')

const PORT = Number(process.env.PORT) || 3101
const TOKEN = process.env.GATEWAY_TOKEN || ''
const WORKER = (process.env.WORKER_URL || 'https://centurisk97.id').replace(/\/$/, '')
const KUNCI = process.env.WA_KUNCI || ''
const IZIN = new Set(daftar(process.env.WA_IZIN).map(normalWa).filter(Boolean))
const PEMILIK = normalWa(process.env.PEMILIK)
const AUTH_DIR = rumah(process.env.WA_AUTH_DIR) || path.join(RUMAH, 'auth')
const OUTBOX = path.join(RUMAH, 'outbox')
const RUSAK = path.join(RUMAH, 'outbox-rusak')
const KELUARAN = path.join(RUMAH, 'keluaran')
const BATAS_OUTBOX = 500 * 1024 * 1024
const USIA_SAPU = 14 * 86400e3
const BATAS_BERKAS = 20 * 1024 * 1024
const DEBOUNCE_MS = 2 * 60 * 1000
for (const d of [RUMAH, OUTBOX, RUSAK, KELUARAN, AUTH_DIR]) { fs.mkdirSync(d, { recursive: true, mode: 0o700 }); fs.chmodSync(d, 0o700) }
const tulis = (f, isi) => fs.writeFileSync(f, isi, { mode: 0o600 })

const log = (...a) => console.log(new Date().toISOString(), ...a)
const tidur = (ms) => new Promise((r) => setTimeout(r, ms))
let sock = null
let connected = false
let restarting = false

// ── KELUAR ──────────────────────────────────────────────────────────────
async function sendPaced(jid, isi, isGroup) {
  const gate = limiter.check(jid)
  if (!gate.ok) return { ok: false, code: gate.code, error: gate.error }
  const s = await limiter.slot()
  if (!s.ok) return { ok: false, code: s.code, error: s.error }
  const sent = await sock.sendMessage(jid, isi)
  limiter.commit(jid)
  return { ok: true, kind: isGroup ? 'group' : 'personal', id: (sent && sent.key && sent.key.id) || null }
}

async function jidDari(target) {
  const mentah = String(target ?? '').trim()
  if (/@g\.us$/i.test(mentah)) return { jid: mentah, isGroup: true }
  const n = normalWa(mentah)
  if (!n) return { error: 'nomor tidak valid', code: 400 }
  const [info] = await sock.onWhatsApp(n)
  if (!info?.exists) return { error: 'nomor tidak terdaftar di WhatsApp', code: 422 }
  return { jid: info.jid, isGroup: false }
}

async function layani(req, res, bangun) {
  if (!TOKEN || !samaAman(req.headers.authorization, TOKEN)) return res.status(401).json({ status: false, error: 'unauthorized' })
  if (!connected || !sock) return res.status(503).json({ status: false, error: 'wa belum terhubung' })
  try {
    const isi = bangun(req.body || {})
    if (isi.error) return res.status(400).json({ status: false, error: isi.error })
    const t = await jidDari(req.body.target)
    if (t.error) return res.status(t.code).json({ status: false, error: t.error })
    const r = await sendPaced(t.jid, isi.pesan, t.isGroup)
    if (!r.ok) return res.status(r.code || 429).json({ status: false, error: r.error })
    log('[kirim]', r.kind, t.isGroup ? t.jid : '***' + String(t.jid).split('@')[0].slice(-4))
    res.json({ status: true, kind: r.kind, id: r.id })
  } catch (e) {
    res.status(502).json({ status: false, error: String((e && e.message) || e) })
  }
}

const app = express()
app.use(express.json({ limit: '1mb' }))
app.get('/', (_req, res) => res.json({ ok: true, connected }))
app.get('/stats', (req, res) => {
  if (!TOKEN || !samaAman(req.headers.authorization, TOKEN)) return res.status(401).json({ status: false })
  res.json({ status: true, connected, limiter: limiter.stats() })
})
app.post('/send', (req, res) => layani(req, res, (b) => {
  const message = String(b.message ?? '')
  if (!b.target || !message) return { error: 'target/message kosong' }
  return { pesan: { text: message } }
}))
// Hanya berkas biasa di bawah ~/.wa-bot/keluaran (hasil generator); auth/, outbox/, state tidak pernah terkirim.
app.post('/send-file', (req, res) => layani(req, res, (b) => {
  if (!b.target || !b.path) return { error: 'target/path kosong' }
  const p = jalurKeluaran(b.path, KELUARAN)
  if (!p) return { error: 'berkas harus di ' + KELUARAN }
  return {
    pesan: {
      document: { url: p }, fileName: String(b.filename || path.basename(p)),
      mimetype: String(b.mimetype || 'application/octet-stream'), caption: String(b.caption || ''),
    },
  }
}))
app.listen(PORT, '127.0.0.1', () => log('API lokal di 127.0.0.1:' + PORT))

// ── MASUK ───────────────────────────────────────────────────────────────
function isiPesan(m) {
  const c = normalizeMessageContent(m.message) || {}
  const teks = c.conversation || c.extendedTextMessage?.text || c.documentMessage?.caption || c.imageMessage?.caption || ''
  const media = c.documentMessage || c.imageMessage || null
  return { c, teks, media, adaDok: !!c.documentMessage }
}

// Nomor pengirim: di grup ambil peserta; Baileys baru memberi nomor asli di senderPn bila JID-nya @lid.
const pengirim = (k) => normalWa(String(k.senderPn || k.participantPn || k.participant || k.remoteJid || '').split('@')[0].split(':')[0])

function ukuranOutbox() {
  let n = 0
  for (const f of fs.readdirSync(OUTBOX)) { try { n += fs.statSync(path.join(OUTBOX, f)).size } catch {} }
  return n
}
let kabarPenuh = false

async function simpanKeOutbox(m) {
  const k = m.key
  const { teks, media, adaDok } = isiPesan(m)
  const dari = pengirim(k)
  if (!dari || !IZIN.has(dari)) return
  if (!teks.trim() && !media) return
  if (/^cari\s/i.test(teks)) { await balasCari(m, teks); return } // perintah Drive, bukan bahan laporan
  if (ukuranOutbox() > BATAS_OUTBOX) {
    if (!kabarPenuh) { kabarPenuh = true; await kabarPemilik('Outbox bot WA lebih dari 500 MB, pesan baru tidak disimpan.') }
    return
  }
  kabarPenuh = false
  const id = `${Date.now()}-${idAman(k.id)}`
  const e = { id, dari, nama: m.pushName || '', teks, waktu: Number(m.messageTimestamp) * 1000 || Date.now() }
  let lampiran = null
  if (media) {
    const tipe = media.mimetype || 'application/octet-stream'
    if (!mimeBoleh(tipe)) {
      await kabarPemilik(`Lampiran dari ${dari} (${tipe}) jenisnya tidak diizinkan, hanya teks yang diteruskan.`)
    } else if (ukuranBerkas(media.fileLength, BATAS_BERKAS) === null) {
      await kabarPemilik(`Lampiran dari ${dari} lebih dari 20 MB atau ukurannya tidak jelas, tidak diteruskan.`)
    } else {
      const buf = await downloadMediaMessage(m, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
      if (buf.length > BATAS_BERKAS) await kabarPemilik(`Lampiran dari ${dari} lebih dari 20 MB, tidak diteruskan.`)
      else {
        tulis(path.join(OUTBOX, id + '.bin'), buf); lampiran = buf
        e.berkas = { nama: adaDok ? (media.fileName || 'berkas') : `foto-${id}.jpg`, tipe }
      }
    }
  }
  tulis(path.join(OUTBOX, id + '.json'), JSON.stringify(e))
  drive.salin(e, lampiran)
}

async function balasCari(m, teks) {
  const r = await drive.perintahCari(teks)
  // Selalu ke chat pribadi pengirim: link Drive tidak boleh tersebar ke anggota grup di luar WA_IZIN.
  const jid = pengirim(m.key) + '@s.whatsapp.net'
  try { const x = await sendPaced(jid, { text: r }, false); if (!x.ok) log('[cari] balasan ditahan', x.error) } catch (err) { log('[cari] balasan gagal', String(err.message || err)) }
}

// Berkas dari Drive/Masuk masuk ke outbox yang sama dengan pesan WA (dari = PEMILIK); id turunan id Drive jadi idempoten.
async function masukDariDrive({ id, nama, tipe, buf, waktu }) {
  // Worker diam-diam membuang pengirim di luar WA_IZIN, jadi pakai PEMILIK hanya bila ia terdaftar; selain itu nomor izin pertama.
  const dari = IZIN.has(PEMILIK) ? PEMILIK : [...IZIN][0]
  if (!dari) throw new Error('WA_IZIN kosong')
  if (fs.existsSync(path.join(OUTBOX, id + '.json'))) return
  if (ukuranOutbox() > BATAS_OUTBOX) throw new Error('outbox penuh')
  tulis(path.join(OUTBOX, id + '.bin'), buf)
  tulis(path.join(OUTBOX, id + '.json'), JSON.stringify({ id, dari, nama: 'Google Drive', teks: '', waktu, berkas: { nama, tipe } }))
}
const tickDrive = () => drive.tick(masukDariDrive).then(() => flushOutbox()).catch(() => {})
setInterval(tickDrive, 5 * 60 * 1000)
setTimeout(tickDrive, 30000)

async function kirimSatu(e) {
  const f = new FormData()
  f.set('dari', e.dari); f.set('nama', e.nama); f.set('teks', e.teks); f.set('waktu', String(e.waktu))
  if (e.berkas) {
    const buf = fs.readFileSync(path.join(OUTBOX, e.id + '.bin'))
    f.set('berkas', new Blob([buf], { type: e.berkas.tipe }), e.berkas.nama)
  }
  const r = await fetch(`${WORKER}/api/wa/gateway`, { method: 'POST', headers: { 'x-wa-kunci': KUNCI }, body: f, signal: AbortSignal.timeout(60000) })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

let sedangFlush = false
async function flushOutbox() {
  if (sedangFlush) return
  sedangFlush = true
  try {
    const berkas = fs.readdirSync(OUTBOX).filter((f) => f.endsWith('.json')).sort()
    for (const f of berkas) {
      const jalur = path.join(OUTBOX, f)
      const ke_rusak = (id) => {
        for (const x of [f, id + '.bin']) { try { fs.renameSync(path.join(OUTBOX, x), path.join(RUSAK, x)) } catch {} }
      }
      let e
      try { e = JSON.parse(fs.readFileSync(jalur, 'utf8')) } catch { ke_rusak(f.replace(/\.json$/, '')); log('[masuk] berkas outbox rusak', f); continue }
      if (!e || !idSah(e.id)) { ke_rusak(f.replace(/\.json$/, '')); log('[masuk] id outbox tak sah', f); continue }
      let selesai = false
      for (let i = 0; i < 5 && !selesai; i++) {
        try {
          const r = await kirimSatu(e)
          if (r.status < 300 && r.json.ok !== false) { selesai = true; log('[masuk] tersimpan', e.id, r.json.jenis || '', r.json.tanggal || ''); break }
          if (r.status < 500 && r.status !== 408 && r.status !== 429) { // ditolak permanen: simpan, kabari pemilik
            ke_rusak(e.id)
            await kabarPemilik(`Worker menolak kiriman WA dari ${e.dari} (HTTP ${r.status}). Disimpan di ${RUSAK}.`)
            selesai = 'rusak'; break
          }
        } catch (err) { log('[masuk] gagal jaringan', String(err.message || err)) }
        await tidur(2000 * 2 ** i)
      }
      if (selesai === true) {
        fs.rmSync(jalur, { force: true }); fs.rmSync(path.join(OUTBOX, e.id + '.bin'), { force: true })
        picuOtomatis()
      } else if (!selesai) break // worker masih mati: sisanya dicoba pada putaran berikut
    }
  } finally { sedangFlush = false }
}
setInterval(() => flushOutbox().catch(() => {}), 5 * 60 * 1000)

// Sapu: RUSAK dan .bin yatim (tanpa .json) lebih tua dari 14 hari dihapus.
function sapu() {
  const lama = (d, f) => { try { return Date.now() - fs.statSync(path.join(d, f)).mtimeMs > USIA_SAPU } catch { return false } }
  for (const f of fs.readdirSync(RUSAK)) if (lama(RUSAK, f)) fs.rmSync(path.join(RUSAK, f), { force: true })
  for (const f of fs.readdirSync(OUTBOX)) {
    if (f.endsWith('.bin') && !fs.existsSync(path.join(OUTBOX, f.replace(/\.bin$/, '.json'))) && lama(OUTBOX, f)) fs.rmSync(path.join(OUTBOX, f), { force: true })
  }
}
sapu(); setInterval(() => drive.sapu(), 6 * 3600e3); drive.sapu(); setInterval(sapu, 6 * 3600e3)

let timerOtomatis = null
function picuOtomatis() {
  clearTimeout(timerOtomatis)
  timerOtomatis = setTimeout(async () => {
    try {
      const { jalankan } = await import('../otomatis.mjs')
      await jalankan({})
    } catch (e) { log('[otomatis] galat', String((e && e.message) || e)) }
  }, DEBOUNCE_MS)
}

async function kabarPemilik(teks) {
  if (!PEMILIK || !connected || !sock) return
  try { await sendPaced(PEMILIK + '@s.whatsapp.net', { text: teks }, false) } catch {}
}

// ── SAMBUNGAN ───────────────────────────────────────────────────────────
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()
  sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), browser: ['Centurisk97 Bot', 'Chrome', '1.0.0'] })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async (ev) => {
    if (ev.type !== 'notify') return
    for (const m of ev.messages) {
      if (m.key.fromMe || m.key.remoteJid === 'status@broadcast') continue
      try { await simpanKeOutbox(m) } catch (e) { log('[masuk] galat', String((e && e.message) || e)) }
    }
    flushOutbox().catch(() => {})
  })

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u
    if (qr) {
      // QR = kredensial tautan: hanya ke terminal interaktif, tidak pernah ke log launchd.
      if (process.stdout.isTTY) { console.log('\n=== Scan QR ini di WhatsApp > Perangkat Tertaut ===\n'); qrcode.generate(qr, { small: true }) }
      else log('Butuh scan QR: hentikan layanan dan jalankan node gateway/index.js di terminal.')
    }
    if (connection === 'open') { connected = true; log('WA terhubung'); flushOutbox().catch(() => {}) }
    if (connection === 'close') {
      connected = false
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        limiter.noteLogout()
        log('Ter-logout. Hapus ' + AUTH_DIR + ', jalankan ulang di terminal, scan QR. Mode pemanasan aktif.')
      } else if (!restarting) {
        log('Koneksi putus (code ' + code + '), sambung ulang 3 dtk')
        restarting = true
        try { sock && sock.ev.removeAllListeners() } catch {}
        sock = null
        setTimeout(() => { restarting = false; startSock().catch((e) => log('gagal reconnect', e)) }, 3000)
      }
    }
  })
}
startSock().catch((e) => log('gagal start', e))
