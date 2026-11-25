// ════════════════════════════════════════════════════════════════════════
// LIMITER anti-ban WA gateway (disalin dari pangantara/wa-gateway/limiter.js; hanya lokasi STATE_FILE yang diubah)
// Menekan pemicu restriksi yang NYATA bisa ditekan dengan pacing:
//   • Jeda ACAK antar pesan lewat "reservation slot" (nextSlotAt) — SATU per
//     satu waktu, tak ada dua kiriman yang nembak barengan.
//   • Batas per menit / jam / hari + per-tujuan/hari (klasifikasi spam).
//   • Mode PEMANASAN otomatis 7 hari sesudah tautan baru / logout (nomor yang
//     baru dipulihkan lalu langsung volume penuh = paling cepat kena lagi).
// (Jam senyap DIHAPUS atas permintaan user — kirim tak pernah gagal karena jam.)
// State harian & per-tujuan dipersist ke limit-state.json (bertahan restart).
//
// CATATAN JUJUR: ini TIDAK bikin gateway "tak terdeteksi". Baileys tetap
// dikenali WhatsApp dari cara handshake-nya (level protokol), bukan dari ritme
// kirim. Yang ditekan di sini cuma pemicu spam/report/volume. Simulasi ngetik
// & acak fingerprint SENGAJA tidak dibuat (teater, tak menyentuh deteksi).
// Solusi andal = WhatsApp Cloud API resmi. Lihat ANTI-BAN.md.
// ════════════════════════════════════════════════════════════════════════

const fs = require('fs')
const path = require('path')

const num = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : d
}

// Jeda acak antar pesan (uniform di [GAP_MIN, GAP_MAX]).
const GAP_MIN = num(process.env.WA_GAP_MIN_MS, 15000)
const GAP_MAX = Math.max(GAP_MIN, num(process.env.WA_GAP_MAX_MS, Math.max(GAP_MIN, 20000)))
// Kalau slot berikutnya lebih jauh dari ini → 429 (jangan tahan request lama);
// app biarkan 'queued' & coba lagi nanti. Default sedikit di atas GAP_MAX supaya
// kiriman berurutan lolos, tapi tumpukan bersamaan (2+ antre) ditolak.
const MAX_WAIT = num(process.env.WA_MAX_WAIT_MS, GAP_MAX + 2000)
const MAX_PER_MINUTE = num(process.env.WA_MAX_PER_MINUTE, 3)
// Balasan percakapan (pemilik 18 Nov 2026: "lama bgt responnya"): orang yang baru menulis ke bot dibalas dengan jeda pendek 2-4 dtk dan
// batas 10 per menit, seperti orang mengetik beberapa bubble. Kiriman lain tetap 15-20 dtk sesudah kiriman APA PUN terakhir dan 3 per menit.
const GAP_PERCAKAPAN_MIN = num(process.env.WA_GAP_PERCAKAPAN_MIN_MS, 2000)
const GAP_PERCAKAPAN_MAX = Math.max(GAP_PERCAKAPAN_MIN, num(process.env.WA_GAP_PERCAKAPAN_MAX_MS, Math.max(GAP_PERCAKAPAN_MIN, 4000)))
const MAX_PER_MINUTE_PERCAKAPAN = Math.max(MAX_PER_MINUTE, num(process.env.WA_MAX_PER_MINUTE_PERCAKAPAN, 10))
const MAX_PER_HOUR = num(process.env.WA_MAX_PER_HOUR, 60)
const MAX_PER_DAY = num(process.env.WA_MAX_PER_DAY, 300)
const MAX_PER_TARGET_DAY = num(process.env.WA_MAX_PER_TARGET_DAY, 8)
// Q1 bot laporan (BL-09): balasan (opts.balasan) ke tujuan yang menulis dalam 10 menit terakhir (noteMasuk) memakai batas
// per tujuan TERPISAH 40/hari. Batas global menit/jam/hari dan pemanasan TIDAK berubah; kiriman lain tetap 8 per tujuan/hari.
// 150 sejak 18 Nov 2026: hari uji pemilik menghabiskan 40 dan balasan sesudahnya terbuang diam-diam; batas harian global 300 tetap.
const MAX_PER_TARGET_PERCAKAPAN = num(process.env.WA_MAX_PER_TARGET_PERCAKAPAN, 150)
const PERCAKAPAN_MS = num(process.env.WA_PERCAKAPAN_MS, 10 * 60000)
// opts.masuk = jam pesan masuk yang dibalas: jendela diputus dari jam itu, jadi balasan sesudah pembangunan lama tetap percakapan,
// asal balasan paling lambat BALAS_MS sesudah pesan masuk. Selama pemanasan percakapan paling banyak separuh batas harian.
const BALAS_MS = num(process.env.WA_BALAS_MS, 2 * 3600000)
const WARMUP_DAYS = num(process.env.WA_WARMUP_DAYS, 7)
const WARMUP_PER_DAY = num(process.env.WA_WARMUP_PER_DAY, 40)
// Pemanasan (19 Nov 2026, sapu bug bot laporan): balasan ke orang yang baru menulis punya jatah sendiri selama pemanasan dan tidak
// memakan jatah kiriman biasa. Sebelumnya semua kiriman dibatasi 40 per hari dan balasan 20, padahal satu laporan sekitar 22 balasan:
// draf atau final bisa terbuang diam-diam. Kiriman biasa (terjadwal, ke orang yang tidak menulis) tetap 40 per hari selama pemanasan.
const WARMUP_PERCAKAPAN_PER_DAY = num(process.env.WA_WARMUP_PERCAKAPAN_PER_DAY, 100)
// Jam senyap SENGAJA dihapus (permintaan user 2026-07-25): jangan pernah
// gagalkan kiriman karena "jam senyap". Pengaturan jam ada di sisi app
// (wa_umum) tapi TIDAK ditegakkan di gateway.

// WA_RUMAH: tiap gateway (peran lapor / laporan, ../peran.cjs) punya nomor sendiri, jadi jatah dan pemanasan sendiri.
const STATE_FILE = path.join(process.env.WA_STATE_DIR || require('../umum.cjs').RUMAH, 'limit-state.json')
const rnd = (a, b) => a + Math.floor(Math.random() * Math.max(0, b - a + 1))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

try { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }) } catch {}
let state = { day: todayStr(), dayCount: 0, perTarget: {}, perTargetPercakapan: {}, dayCountPercakapan: 0, warmupUntil: 0 }
try {
  const loaded = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  if (loaded && typeof loaded === 'object') state = { ...state, ...loaded }
} catch {
  // Tak ada state = tautan baru → nyalakan mode pemanasan.
  state.warmupUntil = Date.now() + WARMUP_DAYS * 86400000
}
if (!state.perTargetPercakapan || typeof state.perTargetPercakapan !== 'object') state.perTargetPercakapan = {}
// Pesan masuk terakhir per tujuan (memori saja): penentu "percakapan".
let masukTerakhir = {}

// Jendela geser di memori (reset saat restart — tak apa, hanya rem jangka pendek).
let minuteHits = []
let hourHits = []
// Waktu paling awal pesan BERIKUTNYA boleh dikirim (reservasi serial): nextSlotAt untuk balasan percakapan (jeda pendek),
// nextSlotBiasaAt untuk kiriman lain (jeda 15-20 dtk dari kiriman apa pun terakhir). nextSlotBiasaAt >= nextSlotAt selalu.
let nextSlotAt = 0
let nextSlotBiasaAt = 0

function persist() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state))
  } catch {}
}

function rollDay() {
  const t = todayStr()
  if (state.day !== t) {
    state.day = t
    state.dayCount = 0
    state.perTarget = {}
    state.perTargetPercakapan = {}
    state.dayCountPercakapan = 0
    persist()
  }
}

function inWarmup() {
  return Date.now() < (state.warmupUntil || 0)
}
// true = kiriman perlu-buah lagi melewati batas harian (ember percakapan atau biasa, termasuk pemanasan)
function lewatHarian(cakap, perlu) {
  if (state.dayCount + perlu > MAX_PER_DAY) return true
  if (!inWarmup()) return false
  if (cakap) return (state.dayCountPercakapan || 0) + perlu > WARMUP_PERCAKAPAN_PER_DAY
  return state.dayCount - (state.dayCountPercakapan || 0) + perlu > WARMUP_PER_DAY
}
function dailyCap() {
  return inWarmup() ? Math.min(WARMUP_PER_DAY, MAX_PER_DAY) : MAX_PER_DAY
}
// Cek batas SEBELUM ambil slot. Semua penolakan → 429 (tahan, bukan gagal).
// (Jam senyap dihapus — tak pernah dijadikan alasan gagal.)
function noteMasuk(target) {
  if (!target) return
  const now = Date.now()
  for (const [t, w] of Object.entries(masukTerakhir)) if (now - w >= PERCAKAPAN_MS + BALAS_MS) delete masukTerakhir[t]
  masukTerakhir[target] = now
}
function percakapan(target, opts) {
  if (!target || !opts || !opts.balasan || !masukTerakhir[target]) return false
  const now = Date.now(), m = Number(opts.masuk), acuan = Number.isFinite(m) && m > 0 && m <= now ? m : now
  if (now - masukTerakhir[target] < PERCAKAPAN_MS) return true
  // pesan masuk yang dibalas masih dalam BALAS_MS, dan pengirim memang menulis sekitar jam itu atau sesudahnya (pesan masuk berikutnya
  // tidak memutus jendela: lanjut, lalu status 11 menit kemudian, lalu draf selesai 22 menit = tetap balasan)
  if (!(Number.isFinite(m) && m > 0 && m <= now)) return false // tanpa jam pesan masuk: hanya jendela 10 menit di atas
  return now - acuan <= BALAS_MS && masukTerakhir[target] > acuan - PERCAKAPAN_MS
}
function check(target, opts) {
  rollDay()
  const now = Date.now()
  minuteHits = minuteHits.filter((t) => now - t < 60000)
  hourHits = hourHits.filter((t) => now - t < 3600000)
  const cakap = percakapan(target, opts)
  if (minuteHits.length >= (cakap ? MAX_PER_MINUTE_PERCAKAPAN : MAX_PER_MINUTE)) return { ok: false, code: 429, error: 'batas per menit' }
  if (hourHits.length >= MAX_PER_HOUR) return { ok: false, code: 429, error: 'batas per jam' }
  if (lewatHarian(cakap, 1))
    return { ok: false, code: 429, error: inWarmup() ? (cakap ? 'batas percakapan (pemanasan)' : 'batas harian (pemanasan)') : 'batas harian' }
  if (cakap) {
    if ((state.perTargetPercakapan[target] || 0) >= MAX_PER_TARGET_PERCAKAPAN)
      return { ok: false, code: 429, error: 'batas percakapan per tujuan/hari' }
    return { ok: true, percakapan: true }
  }
  if (target && (state.perTarget[target] || 0) >= MAX_PER_TARGET_DAY)
    return { ok: false, code: 429, error: 'batas per tujuan/hari' }
  return { ok: true, percakapan: false }
}

// Ambil slot kirim: reservasi nextSlotAt secara atomik (JS single-thread), lalu
// tidur sampai giliran. Kalau antre terlalu jauh (> MAX_WAIT) → 429.
// `opts.noCap` (Uji Kirim): jangan pernah 429 — tetap tunggu jeda, tapi tunggu
// diklamp ke ~GAP_MAX biar route uji (maxDuration 60s) tak time-out.
// opts.percakapan (dari check): jeda pendek; selain itu jeda biasa.
async function slot(opts) {
  const now = Date.now()
  const cakap = !!(opts && opts.percakapan)
  const at = Math.max(now, cakap ? nextSlotAt : nextSlotBiasaAt)
  const wait = at - now
  if (!(opts && opts.noCap) && wait > MAX_WAIT) {
    return { ok: false, code: 429, error: 'antrean terlalu panjang' }
  }
  nextSlotAt = Math.max(nextSlotAt, at + rnd(GAP_PERCAKAPAN_MIN, GAP_PERCAKAPAN_MAX)) // balasan berikutnya minimal sejauh ini
  nextSlotBiasaAt = Math.max(nextSlotBiasaAt, at + rnd(GAP_MIN, GAP_MAX), nextSlotAt) // kiriman biasa berikutnya minimal sejauh ini
  const eff = opts && opts.noCap ? Math.min(wait, GAP_MAX + 2000) : wait
  if (eff > 0) await sleep(eff)
  return { ok: true }
}

// Catat kiriman SUKSES (naikkan counter menit/jam/hari/per-tujuan + persist).
// percakapanKah = nilai `percakapan` dari check() kiriman ini (jendela 10 menit bisa lewat selama menunggu slot).
function commit(target, percakapanKah) {
  rollDay()
  const now = Date.now()
  minuteHits.push(now)
  hourHits.push(now)
  state.dayCount += 1
  if (target && percakapanKah) {
    state.perTargetPercakapan[target] = (state.perTargetPercakapan[target] || 0) + 1
    state.dayCountPercakapan = (state.dayCountPercakapan || 0) + 1
  }
  else if (target) state.perTarget[target] = (state.perTarget[target] || 0) + 1
  persist()
}

// Dipanggil saat ter-logout dari WhatsApp → mulai lagi mode pemanasan.
function noteLogout() {
  state.warmupUntil = Date.now() + WARMUP_DAYS * 86400000
  persist()
}

// Kiriman kosmetik (sunting pesan kemajuan bot laporan): hanya bila tidak perlu antre slot dan jatah menit/jam masih menyisakan `cadangan`
// kiriman penting (pratinjau dan PDF draf). Tidak mengubah batas apa pun; pemanggil melewati suntingan bila false.
// target/opts sama dengan check(): ember percakapan (40 per tujuan, separuh jatah harian selama pemanasan) atau ember biasa (8 per tujuan).
function longgar(cadangan = 2, target = null, opts = null) {
  rollDay()
  const now = Date.now(), perlu = 1 + cadangan
  const menit = minuteHits.filter((t) => now - t < 60000).length, jam = hourHits.filter((t) => now - t < 3600000).length
  const cakap = !!target && percakapan(target, opts)
  if ((cakap ? nextSlotAt : nextSlotBiasaAt) > now || menit + perlu > (cakap ? MAX_PER_MINUTE_PERCAKAPAN : MAX_PER_MINUTE) || jam + perlu > MAX_PER_HOUR) return false
  if (lewatHarian(cakap, perlu)) return false // termasuk batas pemanasan
  if (!target) return true
  if (cakap) {
    if ((state.perTargetPercakapan[target] || 0) + perlu > MAX_PER_TARGET_PERCAKAPAN) return false
    return true
  }
  return (state.perTarget[target] || 0) + perlu <= MAX_PER_TARGET_DAY
}

function stats() {
  const now = Date.now()
  return {
    warmup: inWarmup(),
    warmup_until: state.warmupUntil || null,
    day: state.day,
    sent_today: state.dayCount,
    daily_cap: dailyCap(),
    last_minute: minuteHits.filter((t) => now - t < 60000).length,
    last_hour: hourHits.filter((t) => now - t < 3600000).length,
    next_slot_in_ms: Math.max(0, nextSlotAt - now),
    gap_ms: [GAP_MIN, GAP_MAX],
    gap_percakapan_ms: [GAP_PERCAKAPAN_MIN, GAP_PERCAKAPAN_MAX],
    caps: { minute: MAX_PER_MINUTE, minute_percakapan: MAX_PER_MINUTE_PERCAKAPAN, hour: MAX_PER_HOUR, day: MAX_PER_DAY, target_day: MAX_PER_TARGET_DAY, target_day_percakapan: MAX_PER_TARGET_PERCAKAPAN },
  }
}

module.exports = { check, slot, commit, noteLogout, noteMasuk, stats, longgar }
