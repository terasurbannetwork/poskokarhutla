// Gateway WhatsApp (Baileys) Centurisk97. Dua tugas:
//  1. MASUK: pesan dari nomor di WA_IZIN (teks, caption, dokumen, foto) diteruskan ke worker
//     (POST multipart ke /api/wa/gateway?k=), lewat outbox berkas supaya tak hilang bila worker mati.
//     Sesudah tersimpan, pengatur otomatis (../otomatis.mjs) dipicu dengan debounce 2 menit.
//  2. KELUAR: API lokal 127.0.0.1 /send dan /send-file, lewat limiter anti-blokir (limiter.js).
//  3. DAFTAR (BL-03, ../daftar.cjs): nomor bl_daftar setuju (salinan /api/wa/terdaftar, 5 menit) diteruskan seperti WA_IZIN dengan medan wa_sha;
//     nomor asing pribadi dibalas "Nomor belum terdaftar" sekali sehari dan TIDAK diteruskan (K19: tanpa pendaftaran mandiri); `setuju <nomor> [nama]` / `tolak <nomor>` hanya dari PEMILIK.
//  4. PROYEK (BL-09, ../arah.cjs, hanya bila BL_PROYEK=1): pesan pribadi nomor terdaftar ke ../proyek.mjs tangani(), satu per pengirim.
//     Perintah proyek tidak diteruskan ke Worker; bahan diteruskan dulu lalu ke proyek dengan wa_id. Susulan tidak pernah ke proyek (K11),
//     tiap nomor terdaftar yang sempat menulis saat mati dapat satu T-TERLEWAT. Balasan ke orang yang baru menulis: batas percakapan (Q1).
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
  downloadMediaMessage, normalizeMessageContent, proto, BufferJSON,
} = require('@whiskeysockets/baileys')
const limiter = require('./limiter')
const drive = require('../drive.cjs').buat({ kabar: (t) => kabarPemilik(t) }) // Google Drive: mati sendiri bila belum dikonfigurasi
const OCR = require('../ocr.cjs')
const { samaAman, idAman, idSah, jalurKeluaran, mimeBoleh, ukuranBerkas, buatTerlihat, putusanSusulan } = require('../aman.cjs')
const RW = require('../riwayat.cjs')
const DAFTAR = require('../daftar.cjs')
const ARAH = require('../arah.cjs')

const PORT = Number(process.env.PORT) || 3101
const TOKEN = process.env.GATEWAY_TOKEN || ''
const WORKER = (process.env.WORKER_URL || 'https://centurisk97.id').replace(/\/$/, '')
const KUNCI = process.env.WA_KUNCI || ''
const IZIN = new Set(daftar(process.env.WA_IZIN).map(normalWa).filter(Boolean))
// Grup satgas udara (OPERASI_GRUP, JID ...@g.us pisah koma): semua anggota boleh, teks saja, bot TIDAK PERNAH membalas di grup.
// Worker hanya menyimpan pesan yang dikenali (pengurai operasi / jenis laporan) dan mengganti pengirim dengan id grup; tanpa salinan Drive.
const GRUP_OPS = new Set(daftar(process.env.OPERASI_GRUP).filter((j) => /@g\.us$/.test(j)))
const PEMILIK = normalWa(daftar(process.env.PEMILIK)[0])
const BL = process.env.BL_PROYEK === '1' // bot laporan (BL-09); kosong = perilaku lama utuh
const AUTH_DIR = rumah(process.env.WA_AUTH_DIR) || path.join(RUMAH, 'auth')
const OUTBOX = path.join(RUMAH, 'outbox')
const TERKIRIM = path.join(RUMAH, 'terkirim') // salinan pesan keluar untuk getMessage (kirim ulang bila penerima gagal dekripsi)
const USIA_TERKIRIM = 7 * 86400e3
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
// opsi.balasan: balasan ke pengirim; limiter memakai batas percakapan bila ia menulis dalam 10 menit terakhir (Q1).
async function sendPaced(jid, isi, isGroup, opsi) {
  if (!connected || !sock) return { ok: false, code: 503, error: 'wa belum terhubung' }
  const gate = limiter.check(jid, opsi)
  if (!gate.ok) return { ok: false, code: gate.code, error: gate.error }
  const s = await limiter.slot({ percakapan: gate.percakapan })
  if (!s.ok) return { ok: false, code: s.code, error: s.error }
  const sent = await sock.sendMessage(jid, isi)
  limiter.commit(jid, gate.percakapan)
  simpanTerkirim(sent)
  return { ok: true, kind: isGroup ? 'group' : 'personal', id: (sent && sent.key && sent.key.id) || null, key: (sent && sent.key) || null }
}

// Tanpa getMessage, permintaan kirim ulang dari penerima yang gagal dekripsi tak terjawab dan pesan
// macet sebagai "Menunggu pesan ini" (12 Nov 2026). Disimpan ke disk supaya tetap bisa dijawab sesudah restart.
const idPesan = (id) => /^[A-Za-z0-9]{8,64}$/.test(String(id || '')) // id dari luar jadi nama berkas: tanpa / atau ..
function simpanTerkirim(sent) {
  const id = sent && sent.key && sent.key.id
  if (!idPesan(id) || !sent.message) return
  try {
    fs.mkdirSync(TERKIRIM, { recursive: true })
    fs.writeFileSync(path.join(TERKIRIM, id + '.json'), JSON.stringify(sent.message, BufferJSON.replacer))
  } catch (e) { log('[terkirim] galat simpan', String((e && e.message) || e)) }
}

async function ambilTerkirim(key) {
  const id = key && key.id
  if (!idPesan(id)) return undefined
  try { return proto.Message.fromObject(JSON.parse(fs.readFileSync(path.join(TERKIRIM, id + '.json'), 'utf8'), BufferJSON.reviver)) }
  catch { return undefined }
}

function sapuTerkirim() {
  let nama = []
  try { nama = fs.readdirSync(TERKIRIM) } catch { return }
  const batas = Date.now() - USIA_TERKIRIM
  for (const n of nama) {
    const f = path.join(TERKIRIM, n)
    try { if (fs.statSync(f).mtimeMs < batas) fs.unlinkSync(f) } catch {}
  }
}

// BL-03: salinan nomor terdaftar + putusan PEMILIK. Balasan lewat sendPaced yang sama (limiter tidak dilewati); WA putus = balasan tidak dikirim.
const DF = DAFTAR.buat({
  env: process.env, rumah: RUMAH, log,
  kirim: async (jid, teks) => {
    if (!connected || !sock) { log('[daftar] balasan dilewati: wa belum terhubung'); return }
    const x = await sendPaced(jid, { text: teks }, false).catch((e) => ({ ok: false, error: String(e?.message || e) }))
    if (!x.ok) log('[daftar] balasan ditahan', x.error)
  },
})
DF.mulai()

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
  return { c, teks, media, adaDok: !!c.documentMessage, diteruskan: ARAH.diteruskan(c) }
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
  const { c, teks, media: mediaAda, adaDok, diteruskan } = isiPesan(m)
  const video = c.videoMessage && GRUP_OPS.has(k.remoteJid) && !IZIN.has(pengirim(k)) ? c.videoMessage : null // video grup operasi: satu frame dikirim sebagai foto
  const media = mediaAda && (!GRUP_OPS.has(k.remoteJid) || IZIN.has(pengirim(k)) || c.imageMessage) ? mediaAda : null // grup operasi: hanya foto (dokumen grup tetap dibuang)
  const dari = pengirim(k)
  const grupOps = !!dari && !IZIN.has(dari) && GRUP_OPS.has(k.remoteJid)
  const blSha = !!dari && !IZIN.has(dari) && !String(k.remoteJid).endsWith('@g.us') ? DF.shaTerdaftar(dari) : null // nomor bl_daftar setuju (BL-03)
  if (!dari || (!IZIN.has(dari) && !grupOps && !blSha)) return
  if (!teks.trim() && !media && !video) return // foto grup tanpa caption tetap diteruskan
  const pribadi = !String(k.remoteJid).endsWith('@g.us')
  let P = null, cmd = null
  if (!media && !grupOps && !lama) { // perintah tetap (perintah.mjs): hanya dari PEMILIK, tidak jadi bahan, balasan hanya ke pengirim
    P = await import('../perintah.mjs')
    cmd = P.cegat({ dari, teks, pemilik: process.env.PEMILIK, proyek: BL && pribadi }) // grup: perilaku lama
  }
  const arah = ARAH.arah({ proyek: BL, pribadi, terdaftar: true, grupOps, lama, adaMedia: !!(media || video), teks, cmd, diteruskan })
  // Perintah pemilik di perintah.mjs (kirim ulang, status <tanggal>) juga menghapus tanya batal menu milik pengirim itu.
  if (arah === 'perintah' && BL && pribadi) import('../proyek.mjs').then((Pr) => Pr.hapusKonfirmasi({ dari, env: process.env, dasar: RUMAH })).catch(() => {})
  if (arah === 'perintah') { jalankanPerintah(P, cmd, dari).catch((e) => log('[perintah] galat', String((e && e.message) || e))); return }
  const masuk = Date.now() // Q1: jendela percakapan dihitung dari pesan masuk ini, bukan dari jam balasan (pembangunan bisa lama)
  if (arah === 'proyek') {
    // `lanjut`, `ulangi`, `buat saja` saat pembangunan pengirim ini masih jalan: dijawab langsung (sekali "Masih dibangun"), tidak antre di belakangnya.
    const Pr = BL ? await import('../proyek.mjs') : null
    if (Pr && typeof Pr.jawabSibukLangsung === 'function' &&
      await Pr.jawabSibukLangsung({ dari, teks, diteruskan }, { env: process.env, dasar: RUMAH, log, ...balasanKe(dari, '[proyek]', masuk) }).catch(() => false)) return
    keProyek(dari, masuk, async () => ({ dari, teks: teks.trim(), diteruskan })); return // perintah proyek: tidak jadi bahan di Worker
  }
  if (!grupOps && !lama && /^cari\s/i.test(teks) && !blSha) { await balasCari(m, teks); return } // perintah Drive, bukan bahan laporan
  if (ukuranOutbox() > BATAS_OUTBOX) {
    if (!kabarPenuh) { kabarPenuh = true; await kabarPemilik('Outbox bot WA lebih dari 500 MB, pesan baru tidak disimpan.') }
    return
  }
  kabarPenuh = false
  const id = `${Date.now()}-${idAman(k.id)}`
  const e = { id, dari, nama: grupOps ? '' : (m.pushName || ''), teks, waktu: Number(m.messageTimestamp) * 1000 || Date.now(), ...(grupOps ? { grup: k.remoteJid } : {}), ...(blSha ? { wa_sha: blSha } : {}) }
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
  const simpan = () => { tulis(path.join(OUTBOX, id + '.json'), JSON.stringify(e)); if (!grupOps) drive.salin(e, lampiran) }
  const denganWaId = (h) => ({ dari, teks, wa_id: h.disimpan === false ? undefined : h.id, nama_berkas: e.berkas ? e.berkas.nama : undefined, ada_berkas: !!e.berkas, diteruskan })
  if (arah === 'bahan+proyek' && !e.berkas && !media && !video) { // teks saja: proyek.klasifikasi memutuskan di antrean (urutan per pengirim terjaga)
    keProyek(dari, masuk, async (Pr, ctx) => {
      const pesan = { dari, teks, ada_berkas: false, diteruskan }
      if (await ARAH.pilihJalur(Pr, pesan, ctx) === 'langsung') return pesan // revisi atau perintah: tidak diteruskan ke Worker, tanpa wa_id
      const tunggu = PENUNGGU.tunggu(id)
      simpan(); flushOutbox().catch(() => {})
      const h = await tunggu
      if (!h) { log('[proyek] bahan tidak sampai ke Worker, dilewati'); return null }
      return denganWaId(h)
    })
    return
  }
  if (arah === 'bahan+proyek') { // berkas selalu bahan: proyek menunggu POST /api/wa/gateway selesai supaya wa_id diketahui
    const tunggu = PENUNGGU.tunggu(id)
    keProyek(dari, masuk, async () => {
      const h = await tunggu
      if (!h) { log('[proyek] bahan tidak sampai ke Worker, dilewati'); return null }
      return denganWaId(h)
    })
  }
  simpan()
}

// ── PROYEK (BL-09) ──────────────────────────────────────────────────────
const ANTRE = ARAH.buatAntre({ log }) // satu tangani per pengirim; pengirim lain jalan bersamaan
const PENUNGGU = ARAH.buatPenunggu({ batasMs: 30 * 60e3 }) // Worker mati lebih lama = bahan tidak ke proyek
const TERLEWAT = BL ? ARAH.buatTerlewat({
  berkas: path.join(RUMAH, 'terlewat.json'), log,
  kirim: (nomor, teks) => sendPaced(nomor + '@s.whatsapp.net', { text: teks }, false).catch((x) => ({ ok: false, error: String((x && x.message) || x) })),
}) : null
if (TERLEWAT) setInterval(() => { if (connected) TERLEWAT.detak() }, 60e3).unref()
// BL-12 (T10): proyek final yang unggah Drive, /api/wa/hasil, atau ditutup-nya gagal diulang tiap 10 menit dan 1 menit sesudah tersambung.
const kirimKe = async (target, teks) => {
  const x = await sendPaced(normalWa(target) + '@s.whatsapp.net', { text: teks }, false)
  if (!x.ok) throw new Error(x.error || 'kirim gagal')
}
const ULANG_FINAL = BL ? ARAH.buatUlangFinal({
  terhubung: () => connected, log,
  jalankan: async () => {
    const [Pr, O] = await Promise.all([import('../proyek.mjs'), muatOtomatis()])
    const h = await Pr.ulangFinal({ env: process.env, dep: O.depBawaan(process.env), now: new Date(), dasar: RUMAH, log, kabariPemilik: kabarPemilik, kirimKe })
    // K18: proyek penanganan yang memilih *tunggu* dibangun begitu situs memuat lintasan siang (detak 10 menit yang sama).
    if (typeof Pr.ulangSatelit === 'function') {
      try { await Pr.ulangSatelit({ env: process.env, dep: O.depBawaan(process.env), now: new Date(), dasar: RUMAH, log, kabariPemilik: kabarPemilik, kirimKe, balasKe: (d, masuk) => balasanKe(d, '[satelit]', Number(masuk) || Date.now()) }) } catch (e) { log('[satelit] ulang gagal', String((e && e.message) || e)) }
    }
    return h
  },
}) : null
if (ULANG_FINAL) ULANG_FINAL.mulai()

// Kemajuan pembangunan (pemilik 18 Nov 2026): "sedang mengetik" (presence, di luar limiter, berhenti bila soket tertutup) dan satu pesan
// kemajuan yang disunting per tahap. Pesan kemajuan = 1 kiriman balasan; suntingan juga kiriman balasan dan hanya bila limiter longgar
// (menyisakan jatah untuk pratinjau dan PDF), selain itu dilewati. Galat apa pun = tanpa kemajuan, pembangunan jalan terus.
function kemajuanKe(dari, masuk) {
  const jid = dari + '@s.whatsapp.net'
  let detak = null
  const hadir = (keadaan) => { if (connected && sock) sock.sendPresenceUpdate(keadaan, jid).catch(() => {}) }
  return {
    mengetik: (nyala) => {
      if (detak) { clearInterval(detak); detak = null }
      if (!nyala) return hadir('paused')
      hadir('composing')
      detak = setInterval(() => { if (!connected || !sock) { clearInterval(detak); detak = null; return } hadir('composing') }, 10e3)
      if (detak.unref) detak.unref()
    },
    kirimProgres: async (teks) => {
      // hanya bila ada ruang untuk pesan kemajuan ditambah pratinjau dan PDF; selain itu tanpa kemajuan (mengetik tetap jalan)
      if (!limiter.longgar(3, jid, { balasan: true, masuk })) { log('[kemajuan] dilewati, limiter sibuk'); return null }
      const x = await sendPaced(jid, { text: teks }, false, { balasan: true, masuk })
      if (!x.ok) { log('[kemajuan] ditahan', x.error); return null }
      return x.key
    },
    ubahProgres: async (key, teks) => {
      if (!key || !connected || !sock) return false
      if (!limiter.longgar(2, jid, { balasan: true, masuk })) { log('[kemajuan] suntingan dilewati, limiter sibuk'); return true }
      const x = await sendPaced(jid, { text: teks, edit: key }, false, { balasan: true, masuk })
      if (!x.ok) log('[kemajuan] suntingan ditahan', x.error)
      return !!x.ok
    },
  }
}

function balasanKe(dari, tag, masuk) {
  const jid = dari + '@s.whatsapp.net' // selalu ke pengirim, tidak pernah ke PENERIMA
  const kirim = async (isi) => { const x = await sendPaced(jid, isi, false, { balasan: true, masuk }); if (!x.ok) log(tag, 'balasan ditahan', x.error) }
  // berkas (pratinjau, PDF, PPTX): ditolak batas per menit atau antrean = diulang sesudah jendela menit, paling banyak 3 kali
  const kirimBerkas = async (isi) => {
    const x = await ARAH.kirimUlangMenit(() => sendPaced(jid, isi, false, { balasan: true, masuk }), { log: (...a) => log(tag, ...a) })
    if (!x.ok) log(tag, 'berkas ditahan', x.error)
  }
  return {
    balas: (teks) => kirim({ text: teks }),
    balasFile: async (p, nama, caption, mimetype, opsi) => {
      const aman = jalurKeluaran(p, KELUARAN)
      if (!aman) throw new Error('berkas di luar keluaran')
      await kirimBerkas(ARAH.isiBerkas(aman, nama, caption, mimetype, opsi))
    },
  }
}

// ambilPesan(Pr, ctx) -> pesan untuk proyek.tangani, atau null (lewati). masuk = jam pesan masuk (jendela percakapan Q1).
function keProyek(dari, masuk, ambilPesan) {
  ANTRE.tambah(dari, async () => {
    const [Pr, O] = await Promise.all([import('../proyek.mjs'), muatOtomatis()])
    const ctx = {
      env: process.env, dep: O.depBawaan(process.env), now: new Date(), dasar: RUMAH, log,
      ...balasanKe(dari, '[proyek]', masuk), ...kemajuanKe(dari, masuk), kabariPemilik: kabarPemilik,
      kirimKe, masuk,
    }
    const pesan = await ambilPesan(Pr, ctx)
    if (!pesan) return
    const r = await Pr.tangani(pesan, { ...ctx, now: new Date() })
    log('[proyek]', (r && r.status) || '-')
  })
}

async function jalankanPerintah(P, cmd, dari) {
  await P.tangani(cmd, { env: process.env, dep: (await muatOtomatis()).depBawaan(process.env), log, ...balasanKe(dari, '[perintah]', Date.now()) })
}

async function balasCari(m, teks) {
  const r = await drive.perintahCari(teks)
  // Selalu ke chat pribadi pengirim: link Drive tidak boleh tersebar ke anggota grup di luar WA_IZIN.
  const jid = pengirim(m.key) + '@s.whatsapp.net'
  try { const x = await sendPaced(jid, { text: r }, false, { balasan: true }); if (!x.ok) log('[cari] balasan ditahan', x.error) } catch (err) { log('[cari] balasan gagal', String(err.message || err)) }
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
  if (e.wa_sha) f.set('wa_sha', e.wa_sha) // Worker mencocokkan ke bl_daftar setuju (src/wa.js)
  if (e.stempel) f.set('stempel', String(e.stempel).slice(0, 4000))
  if (e.berkas) {
    const buf = fs.readFileSync(path.join(OUTBOX, e.id + '.bin'))
    f.set('berkas', new Blob([buf], { type: e.berkas.tipe }), e.berkas.nama)
  }
  const r = await fetch(`${WORKER}/api/wa/gateway`, { method: 'POST', headers: { 'x-wa-kunci': KUNCI }, body: f, signal: AbortSignal.timeout(60000) })
  return { status: r.status, json: await r.json().catch(() => ({})) }
}

let sedangFlush = false
let flushLagi = false
async function flushOutbox() {
  if (sedangFlush) { flushLagi = true; return } // pesan yang tiba saat flush berjalan ikut putaran berikut, bukan 5 menit lagi
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
          if (r.status < 300 && r.json.ok !== false) { selesai = true; PENUNGGU.selesai(e.id, r.json); log('[masuk] tersimpan', e.id, r.json.jenis || '', r.json.tanggal || ''); break }
          if (r.status < 500 && r.status !== 408 && r.status !== 429) { // ditolak permanen: simpan, kabari pemilik
            ke_rusak(e.id); PENUNGGU.selesai(e.id, null)
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
  } finally {
    sedangFlush = false
    if (flushLagi) { flushLagi = false; setTimeout(() => flushOutbox().catch(() => {}), 1000) }
  }
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

// -> true bila terkirim; false bila tidak (belum terhubung, ditahan limiter, galat): pemanggil (kabarSekali) tidak menandai
// "sudah dikabari" supaya kabar dicoba lagi pada galat berikutnya (pemilik 19 Nov 2026: kabar tidak pernah sampai).
async function kabarPemilik(teks) {
  if (!PEMILIK || !connected || !sock) { log('[kabar] pemilik tidak dikabari: PEMILIK kosong atau WA belum terhubung'); return false }
  try {
    const x = await sendPaced(PEMILIK + '@s.whatsapp.net', { text: teks }, false)
    if (!x || !x.ok) { log('[kabar] kabar pemilik ditahan', x && x.error); return false }
    return true
  } catch (e) { log('[kabar] kabar pemilik gagal', String((e && e.message) || e)); return false }
}

// ── SAMBUNGAN ───────────────────────────────────────────────────────────
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()
  sapuTerkirim()
  sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), browser: ['Centurisk97 Bot', 'Chrome', '1.0.0'], getMessage: ambilTerkirim })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async (ev) => {
    if (ev.type !== 'notify' && ev.type !== 'append') return
    for (const m of ev.messages) {
      catatJangkar(m)
      if (m.key.fromMe || m.key.remoteJid === 'status@broadcast') continue
      const susulan = ev.type === 'append'
      if (!susulan && await logbookCegat(m)) continue
      const dari = pengirim(m.key), pribadi = !m.key.remoteJid.endsWith('@g.us')
      const id = m.key.id
      const putusan = !susulan && pribadi ? DF.cocokPemilik(dari, isiPesan(m).teks) : null // setuju <nomor> [nama] | tolak <nomor>, hanya PEMILIK
      if (putusan) { if (id) terlihat.catat(id); DF.putuskan(putusan).then((x) => log('[daftar] putusan', x)).catch((e) => log('[daftar] galat', String(e?.message || e))); continue }
      const izin = IZIN.has(dari)
      const bl = !izin && pribadi && !!DF.shaTerdaftar(dari)
      if (pribadi && !izin && !bl) { // nomor asing: tidak pernah diteruskan ke Worker (D10); susulan tidak dibalas
        if (!susulan && dari) DF.asing({ dari, jid: m.key.remoteJid, teks: isiPesan(m).teks }).then((x) => log('[daftar] asing', x)).catch((e) => log('[daftar] galat', String(e?.message || e)))
        continue
      }
      const diterima = izin || bl || (GRUP_OPS.has(m.key.remoteJid) && !!dari)
      if (susulan && TERLEWAT && pribadi && (izin || bl) && !terlihat.ada(id)) TERLEWAT.susulan(dari, ARAH.tsMs(m.messageTimestamp)) // K11: satu T-TERLEWAT per nomor
      if (!susulan && BL && pribadi && (izin || bl)) limiter.noteMasuk(dari + '@s.whatsapp.net') // Q1: jendela percakapan 10 menit
      if (susulan) { // aturan sama dengan pesan langsung, termasuk grup operasi; yang dibuang selalu dicatat beserta alasannya
        const p = putusanSusulan({ diterima, ts: m.messageTimestamp, terlihat: terlihat.ada(id) })
        if (!p.ok) { log('[susulan] dibuang:', p.alasan, m.key.remoteJid.endsWith('@g.us') ? m.key.remoteJid : '-', id); continue }
      }
      const { c, teks, media } = isiPesan(m)
      const jenis = c.documentMessage ? 'dokumen' : c.imageMessage ? 'gambar' : teks ? 'teks' : 'lain:' + (Object.keys(c)[0] || 'kosong')
      log(susulan ? '[susulan]' : '[pesan]', izin ? 'izin' : bl ? 'terdaftar' : GRUP_OPS.has(m.key.remoteJid) ? 'grup-ops' : 'asing', m.key.remoteJid.endsWith('@g.us') ? m.key.remoteJid : '-', jenis, media ? (media.mimetype || '?') : '-', media ? (media.fileLength?.toString?.() ?? '?') + 'B' : teks.length + ' huruf')
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
    if (connection === 'open') { connected = true; log('WA terhubung'); if (TERLEWAT) TERLEWAT.buka(); if (ULANG_FINAL) ULANG_FINAL.buka(); flushOutbox().catch(() => {}); mulaiLapangan() }
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
