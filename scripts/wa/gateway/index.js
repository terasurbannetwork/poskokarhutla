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
  downloadMediaMessage, normalizeMessageContent, proto,
} = require('@whiskeysockets/baileys')
const limiter = require('./limiter')
const drive = require('../drive.cjs').buat({ kabar: (t) => kabarPemilik(t) }) // Google Drive: mati sendiri bila belum dikonfigurasi
const OCR = require('../ocr.cjs')
const { samaAman, idAman, idSah, jalurKeluaran, mimeBoleh, ukuranBerkas, buatTerlihat, putusanSusulan } = require('../aman.cjs')
const RW = require('../riwayat.cjs')

const PORT = Number(process.env.PORT) || 3101
const TOKEN = process.env.GATEWAY_TOKEN || ''
const WORKER = (process.env.WORKER_URL || 'https://centurisk97.id').replace(/\/$/, '')
const KUNCI = process.env.WA_KUNCI || ''
const IZIN = new Set(daftar(process.env.WA_IZIN).map(normalWa).filter(Boolean))
// Grup satgas udara (OPERASI_GRUP, JID ...@g.us pisah koma): semua anggota boleh, teks saja, bot TIDAK PERNAH membalas di grup.
// Worker hanya menyimpan pesan yang dikenali (pengurai operasi / jenis laporan) dan mengganti pengirim dengan id grup; tanpa salinan Drive.
const GRUP_OPS = new Set(daftar(process.env.OPERASI_GRUP).filter((j) => /@g\.us$/.test(j)))
const PEMILIK = normalWa(daftar(process.env.PEMILIK)[0])
const AUTH_DIR = rumah(process.env.WA_AUTH_DIR) || path.join(RUMAH, 'auth')
const OUTBOX = path.join(RUMAH, 'outbox')
const RUSAK = path.join(RUMAH, 'outbox-rusak')
const KELUARAN = path.join(RUMAH, 'keluaran')
const BATAS_OUTBOX = 500 * 1024 * 1024
const USIA_SAPU = 14 * 86400e3
const BATAS_BERKAS = 20 * 1024 * 1024
const DEBOUNCE_MS = 2 * 60 * 1000
for (const d of [RUMAH, OUTBOX, RUSAK, KELUARAN, AUTH_DIR]) { fs.mkdirSync(d, { recursive: true, mode: 0o700 }); fs.chmodSync(d, 0o700) }
const terlihat = buatTerlihat(path.join(RUMAH, 'terlihat.json'), 5000)
// Jangkar riwayat: pesan TERTUA yang pernah terlihat per chat relevan (grup operasi / nomor WA_IZIN); WA meminta riwayat mundur dari satu pesan.
const BERKAS_JANGKAR = path.join(RUMAH, 'jangkar.json')
let jangkar = {}
try { jangkar = JSON.parse(fs.readFileSync(BERKAS_JANGKAR, 'utf8')) || {} } catch {}
function catatJangkar(m) {
  const k = m.key, jid = k && k.remoteJid, ts = Number(m.messageTimestamp?.toString?.() ?? m.messageTimestamp)
  if (!jid || !k.id || !(ts > 0) || jid === 'status@broadcast') return
  if (!GRUP_OPS.has(jid) && !(!jid.endsWith('@g.us') && IZIN.has(pengirim({ ...k, participant: undefined })))) return
  if (jangkar[jid] && jangkar[jid].ts <= ts) return
  jangkar[jid] = { id: k.id, fromMe: !!k.fromMe, ts }
  try { fs.writeFileSync(BERKAS_JANGKAR, JSON.stringify(jangkar), { mode: 0o600 }); fs.chmodSync(BERKAS_JANGKAR, 0o600) } catch {}
}
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
// LP-021: antrean WA modul /petugas ditarik tiap 60 dtk, dikirim lewat limiter yang sama. Mati bila WA_KUNCI kosong.
let lapanganJalan = false
function mulaiLapangan() {
  if (lapanganJalan || !KUNCI) return
  lapanganJalan = true
  import('../lapangan_tarik.mjs').then((L) => L.mulai({
    worker: WORKER, kunci: KUNCI, log,
    kirim: async (target, message) => {
      if (!connected || !sock) return { tunda: true }
      const t = await jidDari(target).catch((e) => ({ error: String(e?.message || e), code: 502 }))
      if (t.error) return t.code >= 500 ? { tunda: true } : { ok: false, galat: t.error }
      const r = await sendPaced(t.jid, { text: message }, t.isGroup).catch((e) => ({ ok: false, code: 502, error: String(e?.message || e) }))
      if (r.ok) return { ok: true }
      return r.code === 429 || r.code >= 500 ? { tunda: true } : { ok: false, galat: r.error }
    },
  })).catch((e) => { lapanganJalan = false; log('[lapangan] gagal muat', String(e?.message || e)) })
}
// Tarik riwayat sekali jalan, di dalam proses ini (satu sesi auth = satu soket). Lihat ../riwayat.cjs dan README.
let menungguRiwayat = null
let riwayatJalan = false
const HALAMAN = 50, MAKS_HALAMAN = 60, JEDA_HALAMAN = 6000, JEDA_MEDIA = 1500, MAKS_MEDIA = 300
function mintaHalaman(jid, a) {
  return new Promise((selesai) => {
    const t = setTimeout(() => { menungguRiwayat = null; selesai([]) }, 45000)
    menungguRiwayat = (msgs) => { clearTimeout(t); menungguRiwayat = null; selesai(msgs) }
    sock.fetchMessageHistory(HALAMAN, { remoteJid: jid, fromMe: a.fromMe, id: a.id }, a.ts * 1000)
      .catch((e) => { log('[riwayat] permintaan gagal', String((e && e.message) || e)); clearTimeout(t); menungguRiwayat = null; selesai([]) })
  })
}
async function tarikRiwayat(jids, r) {
  if (!connected || !sock) throw Object.assign(new Error('wa belum terhubung'), { kode: 503 })
  if (riwayatJalan) throw Object.assign(new Error('riwayat sedang berjalan'), { kode: 409 })
  riwayatJalan = true
  const ring = { diminta: 0, diterima: 0, disimpan: 0, dilewati_terlihat: 0, dilewati_rentang: 0, dilewati_lain: 0, dilewati_batas: 0, gagal: 0, tanpa_jangkar: [] }
  let media = 0
  try {
    for (const jid of jids) {
      for (let i = 0; i < MAKS_HALAMAN; i++) {
        const a = jangkar[jid]
        if (!a) { ring.tanpa_jangkar.push(jid); break }
        if (a.ts * 1000 <= r.dari) break
        const msgs = (await mintaHalaman(jid, a)).filter((m) => m.key && m.key.remoteJid === jid)
        ring.diminta++
        log('[riwayat]', jid, 'halaman', i + 1, 'pesan', msgs.length)
        if (!msgs.length) break
        ring.diterima += msgs.length
        msgs.sort((x, y) => RW.tsMs(x.messageTimestamp) - RW.tsMs(y.messageTimestamp))
        for (const m of msgs) {
          catatJangkar(m)
          if (m.key.fromMe || !m.message) continue
          if (!RW.dalamRentang(m.messageTimestamp, r)) { ring.dilewati_rentang++; continue }
          const dari = pengirim(m.key)
          if (!dari || !(IZIN.has(dari) || GRUP_OPS.has(jid))) { ring.dilewati_lain++; continue }
          if (terlihat.ada(m.key.id)) { ring.dilewati_terlihat++; continue }
          const { media: ada } = isiPesan(m), adaMedia = !!(ada || m.message.videoMessage)
          if (adaMedia && media >= MAKS_MEDIA) { ring.dilewati_batas++; continue }
          if (adaMedia) { media++; await tidur(JEDA_MEDIA) }
          try { await simpanKeOutbox(m, { lama: true }); terlihat.catat(m.key.id); ring.disimpan++ } catch (e) { ring.gagal++; log('[riwayat] galat', m.key.id, String((e && e.message) || e)) }
        }
        if (jangkar[jid].ts >= a.ts) break // tidak mundur: riwayat habis
        await tidur(JEDA_HALAMAN)
      }
    }
    flushOutbox().catch(() => {})
    return ring
  } finally { riwayatJalan = false }
}
app.post('/riwayat', RW.buatRute({
  token: TOKEN, jalankan: tarikRiwayat,
  pilih: (jid) => RW.pilihJid({ jid, grupOps: GRUP_OPS, dikenal: Object.keys(jangkar), terdaftar: new Set(Object.keys(jangkar)), izin: IZIN, nomorDari: (j) => normalWa(String(j).split('@')[0].split(':')[0]) }),
}))
app.listen(PORT, '127.0.0.1', () => log('API lokal di 127.0.0.1:' + PORT))

// ── MASUK ───────────────────────────────────────────────────────────────
function isiPesan(m) {
  const c = normalizeMessageContent(m.message) || {}
  const teks = c.conversation || c.extendedTextMessage?.text || c.documentMessage?.caption || c.imageMessage?.caption || c.videoMessage?.caption || ''
  const media = c.documentMessage || c.imageMessage || null
  return { c, teks, media, adaDok: !!c.documentMessage }
}

// Nomor pengirim: di grup ambil peserta; Baileys baru memberi nomor asli di senderPn bila JID-nya @lid.
const pengirim = (k) => normalWa(String(k.senderPn || k.participantPn || k.participant || k.remoteJid || '').split('@')[0].split(':')[0])

// G5 logbook (logbook_wa.mjs): pesan grup BPBD (LOGBOOK_GRUP) diurai jadi draf TAPI tetap mengalir ke jalur bahan laporan (tambahan, bukan pengganti);
// balasan staf (LOGBOOK_STAF) berbentuk OK/BATAL/KOREKSI/DRAF dicegat penuh (return true). Kosong = fitur mati.
async function logbookCegat(m) {
  try {
    const L = await import('../logbook_wa.mjs'), jid = m.key.remoteJid, { teks } = isiPesan(m), a = L.arah(jid, pengirim(m.key), teks)
    if (!a) return false
    L.masuk({ id: m.key.id, jid, dari: pengirim(m.key), teks, waktu: Number(m.messageTimestamp) * 1000 || Date.now() }, { dep: logbookDep || (logbookDep = L.depBawaan(process.env)) })
      .then((x) => log('[logbook]', x)).catch((e) => log('[logbook] galat', String((e && e.message) || e)))
    return a === 'staf'
  } catch (e) { log('[logbook] galat', String((e && e.message) || e)); return false }
}
let logbookDep = null

function ukuranOutbox() {
  let n = 0
  for (const f of fs.readdirSync(OUTBOX)) { try { n += fs.statSync(path.join(OUTBOX, f)).size } catch {} }
  return n
}
let kabarPenuh = false

// OCR tempelan foto grup operasi di Mac mini (Vision); buffer ditulis sementara di ~/.wa-bot/kerja dan dihapus lagi. Gagal = undefined.
const KERJA = path.join(RUMAH, 'kerja')
for (const f of (() => { try { return fs.readdirSync(KERJA) } catch { return [] } })()) if (/^(ocr-|vid-)/.test(f)) fs.rmSync(path.join(KERJA, f), { recursive: true, force: true }) // sisa proses mati
async function stempelFoto(buf) {
  fs.mkdirSync(KERJA, { recursive: true, mode: 0o700 })
  const f = path.join(KERJA, `ocr-${Date.now()}-${process.pid}.jpg`)
  try { tulis(f, buf); return (await OCR.bacaStempel(f)) || undefined } catch { return undefined } finally { fs.rmSync(f, { force: true }) }
}
// Pemanasan: panggilan Vision pertama sesudah start/kompilasi bisa > 20 dtk dan kena batas waktu; foto grup pertama jangan jadi korbannya.
OCR.bacaStempel(path.join(__dirname, '../../../tests/wa/bahan/stempel-contoh.jpg'), 120000)
  .then((t) => log('[ocr] siap', t ? 'ok' : 'kosong')).catch(() => {})

// Video grup operasi: unduh (<= 20 MB), ambil satu frame (ffmpeg), OCR. Video asli dihapus, tidak pernah dikirim. Tanpa ffmpeg = dilewati.
async function frameDariVideo(m, video, id) {
  if (ukuranBerkas(video.fileLength, BATAS_BERKAS) === null) { log('[video] grup-ops dilewati: lebih dari 20 MB atau ukuran tak jelas'); return null }
  try {
    const buf = await downloadMediaMessage(m, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
    if (buf.length > BATAS_BERKAS) { log('[video] grup-ops dilewati: lebih dari 20 MB sesudah unduh'); return null }
    const fv = await OCR.frameVideo(buf, KERJA)
    if (!fv) log('[video] grup-ops dilewati: ffmpeg tidak ada atau tak ada frame', id)
    return fv
  } catch (err) { log('[video] grup-ops dilewati:', String((err && err.message) || err)); return null }
}

// lama:true (susulan append / riwayat): hanya simpan ke outbox; perintah PEMILIK dan 'cari' lama tidak dieksekusi/dibalas ulang.
async function simpanKeOutbox(m, { lama = false } = {}) {
  const k = m.key
  const { c, teks, media: mediaAda, adaDok } = isiPesan(m)
  const video = c.videoMessage && GRUP_OPS.has(k.remoteJid) && !IZIN.has(pengirim(k)) ? c.videoMessage : null // video grup operasi: satu frame dikirim sebagai foto
  const media = mediaAda && (!GRUP_OPS.has(k.remoteJid) || IZIN.has(pengirim(k)) || c.imageMessage) ? mediaAda : null // grup operasi: hanya foto (dokumen grup tetap dibuang)
  const dari = pengirim(k)
  const grupOps = !!dari && !IZIN.has(dari) && GRUP_OPS.has(k.remoteJid)
  if (!dari || (!IZIN.has(dari) && !grupOps)) return
  if (!teks.trim() && !media && !video) return // foto grup tanpa caption tetap diteruskan
  if (!media && !grupOps && !lama) { // perintah tetap (perintah.mjs): hanya dari PEMILIK, tidak jadi bahan, balasan hanya ke pengirim
    const P = await import('../perintah.mjs')
    const cmd = P.cegat({ dari, teks, pemilik: process.env.PEMILIK })
    if (cmd) { jalankanPerintah(P, cmd, dari).catch((e) => log('[perintah] galat', String((e && e.message) || e))); return }
  }
  if (!grupOps && !lama && /^cari\s/i.test(teks)) { await balasCari(m, teks); return } // perintah Drive, bukan bahan laporan
  if (ukuranOutbox() > BATAS_OUTBOX) {
    if (!kabarPenuh) { kabarPenuh = true; await kabarPemilik('Outbox bot WA lebih dari 500 MB, pesan baru tidak disimpan.') }
    return
  }
  kabarPenuh = false
  const id = `${Date.now()}-${idAman(k.id)}`
  const e = { id, dari, nama: grupOps ? '' : (m.pushName || ''), teks, waktu: Number(m.messageTimestamp) * 1000 || Date.now(), ...(grupOps ? { grup: k.remoteJid } : {}) }
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
        if (grupOps && c.imageMessage) e.stempel = await stempelFoto(buf)
      }
    }
  } else if (video) {
    const fv = await frameDariVideo(m, video, id)
    if (fv) {
      tulis(path.join(OUTBOX, id + '.bin'), fv.jpg); lampiran = fv.jpg
      e.berkas = { nama: `frame-video-${idAman(k.id)}.jpg`, tipe: 'image/jpeg' }
      if (fv.stempel) e.stempel = fv.stempel
    }
  }
  tulis(path.join(OUTBOX, id + '.json'), JSON.stringify(e))
  if (!grupOps) drive.salin(e, lampiran)
}

async function jalankanPerintah(P, cmd, dari) {
  const jid = dari + '@s.whatsapp.net' // selalu ke pengirim, tidak pernah ke PENERIMA
  const kirim = async (isi) => { const x = await sendPaced(jid, isi, false); if (!x.ok) log('[perintah] balasan ditahan', x.error) }
  await P.tangani(cmd, {
    env: process.env, dep: (await muatOtomatis()).depBawaan(process.env), log,
    balas: (teks) => kirim({ text: teks }),
    balasFile: async (p, nama, caption, mimetype) => {
      const aman = jalurKeluaran(p, KELUARAN)
      if (!aman) throw new Error('berkas di luar keluaran')
      await kirim({ document: { url: aman }, fileName: nama, mimetype, caption })
    },
  })
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
  if (e.grup) f.set('grup', e.grup)
  if (e.stempel) f.set('stempel', String(e.stempel).slice(0, 4000))
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

// 10 Nov 2026: gateway hidup berhari-hari; import biasa membekukan otomatis.mjs versi saat start, sehingga tiap bahan baru membangun ulang laporan dengan format lama.
// ponytail: hanya otomatis.mjs yang disegarkan; impor di dalamnya tetap versi saat pertama dimuat, ubah salah satunya = mulai ulang gateway.
const muatOtomatis = () => import('../otomatis.mjs?m=' + fs.statSync(path.join(__dirname, '../otomatis.mjs')).mtimeMs)

let timerOtomatis = null
function picuOtomatis() {
  clearTimeout(timerOtomatis)
  timerOtomatis = setTimeout(async () => {
    try {
      const { jalankan } = await muatOtomatis()
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
    if (ev.type !== 'notify' && ev.type !== 'append') return
    for (const m of ev.messages) {
      catatJangkar(m)
      if (m.key.fromMe || m.key.remoteJid === 'status@broadcast') continue
      const susulan = ev.type === 'append'
      if (!susulan && await logbookCegat(m)) continue
      const izin = IZIN.has(pengirim(m.key))
      const id = m.key.id
      const diterima = izin || (GRUP_OPS.has(m.key.remoteJid) && !!pengirim(m.key))
      if (susulan) { // aturan sama dengan pesan langsung, termasuk grup operasi; yang dibuang selalu dicatat beserta alasannya
        const p = putusanSusulan({ diterima, ts: m.messageTimestamp, terlihat: terlihat.ada(id) })
        if (!p.ok) { log('[susulan] dibuang:', p.alasan, m.key.remoteJid.endsWith('@g.us') ? m.key.remoteJid : '-', id); continue }
      }
      const { c, teks, media } = isiPesan(m)
      const jenis = c.documentMessage ? 'dokumen' : c.imageMessage ? 'gambar' : teks ? 'teks' : 'lain:' + (Object.keys(c)[0] || 'kosong')
      log(susulan ? '[susulan]' : '[pesan]', izin ? 'izin' : GRUP_OPS.has(m.key.remoteJid) ? 'grup-ops' : 'asing', m.key.remoteJid.endsWith('@g.us') ? m.key.remoteJid : '-', jenis, media ? (media.mimetype || '?') : '-', media ? (media.fileLength?.toString?.() ?? '?') + 'B' : teks.length + ' huruf')
      try { await simpanKeOutbox(m, { lama: susulan }); if (diterima && id) terlihat.catat(id) } catch (e) { log('[masuk] galat', String((e && e.message) || e)) }
    }
    flushOutbox().catch(() => {})
  })

  sock.ev.on('messaging-history.set', (ev) => {
    if (ev.syncType === proto.HistorySync.HistorySyncType.ON_DEMAND && menungguRiwayat) return menungguRiwayat(ev.messages || [])
    for (const m of ev.messages || []) catatJangkar(m)
  })

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u
    if (qr) {
      // QR = kredensial tautan: hanya ke terminal interaktif, tidak pernah ke log launchd.
      if (process.stdout.isTTY) { console.log('\n=== Scan QR ini di WhatsApp > Perangkat Tertaut ===\n'); qrcode.generate(qr, { small: true }) }
      else log('Butuh scan QR: hentikan layanan dan jalankan node gateway/index.js di terminal.')
    }
    if (connection === 'open') { connected = true; log('WA terhubung'); flushOutbox().catch(() => {}); mulaiLapangan() }
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
