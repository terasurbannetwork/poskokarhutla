// Nomor terdaftar bot laporan (BL-03; data/kajian-bnpb/bot-laporan K6, K14, K19, D10, ALGORITMA A1).
// Murni dan bisa diuji: fetch, fs, jam, dan kirim disuntik. Dipakai gateway/index.js (CommonJS).
//  - terdaftar(n) = n di WA_IZIN atau sha(n) di salinan GET /api/wa/terdaftar (disegarkan tiap 5 menit dan segera sesudah putusan; gagal jaringan = salinan lama tetap).
//  - K19 (pemilik 18 Nov): tanpa pendaftaran mandiri. Nomor asing (chat pribadi) hanya dibalas T_BELUM, paling banyak sekali per nomor per hari WIB
//    dan dalam plafon global harian; pesannya (termasuk "daftar ...") tidak pernah diteruskan ke Worker atau ke PEMILIK.
//  - Hanya PEMILIK: "setuju <nomor> [nama]" mendaftarkan langsung, "tolak <nomor>" mencabut -> POST /api/wa/daftar, segarkan salinan, kabari PEMILIK.
//    Nomor yang didaftarkan tidak dikirimi pesan (bot tidak pernah memulai percakapan).
// wa_sha = sha256(`${WA_GARAM}|${nomor 62...}`) (hex kecil). WA_GARAM, WA_MESIN, atau PEMILIK kosong = fitur mati (nomor asing dibuang diam seperti sebelumnya).
// Semua kirim lewat kirim(jid, teks) milik gateway, yaitu sendPaced (limiter tidak dilewati).
const crypto = require('crypto')
const nodeFs = require('fs')
const path = require('path')
const { normalWa, daftar: pisahKoma } = require('./umum.cjs')

const RE_SHA = /^[0-9a-f]{64}$/
const SEGAR_MS = 5 * 60 * 1000
const BATAS_BALAS = 30, USIA_SISA = 30 * 864e5 // plafon global balasan nomor asing per hari WIB; sisa berkas daftar/ lama dibuang sesudah 30 hari
const KONTROL = /[\u0000-\u001f\u007f​-‏‪-‮﻿]/g
// Gaya pesan: data/kajian-bnpb/bot-laporan/DESIGN-SYSTEM.md (judul tebal, tanpa titik tengah, em dash, emoji).
const T_BELUM = '*Nomor belum terdaftar*\nBot ini hanya bisa dipakai nomor yang terdaftar.'
const RELAWAN = /^(siap|tidak)\s+[a-z0-9]{6}\s*$/i // balasan panggilan relawan (LP-020), bukan sapaan: tidak dibalas

const hariWib = (t) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10)
const bersih = (s, n) => String(s ?? '').normalize('NFC').replace(KONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, n).trim()

function waSha(nomor, garam) {
  const n = normalWa(nomor)
  if (!garam || !n || /@g\.us$/i.test(n)) return null
  return crypto.createHash('sha256').update(`${garam}|${n}`).digest('hex')
}

// "setuju 0812-3456-7890 Budi Santoso" / "tolak +62 812 3456 7890" -> {putusan, nomor 62..., nama?}; argumen harus nomor HP (bukan id pola aturan tetap).
function uraiPutusan(teks) {
  const m = /^\s*(setuju|tolak)\s+(\+?\d[\d .-]*\d)(?:\s+([^\d\s][\s\S]*))?$/i.exec(String(teks ?? ''))
  if (!m) return null
  const putusan = m[1].toLowerCase(), nomor = normalWa(m[2])
  if (!/^628\d{7,12}$/.test(nomor || '')) return null
  if (m[3] && putusan === 'tolak') return null
  const nama = m[3] ? bersih(m[3], 80) : ''
  if (m[3] && nama.length < 2) return null
  return nama ? { putusan, nomor, nama } : { putusan, nomor }
}

function buat({ env = process.env, fetch = globalThis.fetch, fs = nodeFs, rumah, kini = Date.now, kirim, log = () => {} } = {}) {
  const garam = env.WA_GARAM || ''
  const worker = (env.WORKER_URL || 'https://centurisk97.id').replace(/\/$/, '')
  const izin = new Set(pisahKoma(env.WA_IZIN).map(normalWa).filter(Boolean))
  const pemilik = normalWa(pisahKoma(env.PEMILIK)[0])
  const hidup = !!(garam && env.WA_MESIN && pemilik)
  const F = { terdaftar: path.join(rumah, 'terdaftar.json'), hari: path.join(rumah, 'daftar-hari.json'), sisa: path.join(rumah, 'daftar') }
  const baca = (f, awal) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) ?? awal } catch { return awal } }
  const tulis = (f, isi) => {
    fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 })
    const s = f + '.' + process.pid + '.tmp'
    fs.writeFileSync(s, JSON.stringify(isi), { mode: 0o600 })
    try { fs.chmodSync(s, 0o600) } catch {}
    fs.renameSync(s, f)
  }
  // Sisa berkas ~/.wa-bot/daftar/<sha>.json dari versi pendaftaran mandiri (sebelum K19): dibuang sesudah 30 hari, tidak dipakai lagi.
  function sapu() {
    let nama = []
    try { nama = fs.readdirSync(F.sisa) } catch { return }
    for (const x of nama) {
      if (!/^[0-9a-f]{64}\.json$/.test(x)) continue
      const f = path.join(F.sisa, x), t = baca(f, null)
      if (!(Number(t?.waktu) > kini() - USIA_SISA)) try { fs.rmSync(f, { force: true }) } catch {}
    }
  }
  let set = new Set()
  let hari = { tanggal: '', n: {} }

  function muat() {
    const t = baca(F.terdaftar, {})
    set = new Set((Array.isArray(t.wa_sha) ? t.wa_sha : []).filter((x) => RE_SHA.test(x)))
    hari = baca(F.hari, { tanggal: '', n: {} })
    if (!hari || typeof hari.n !== 'object') hari = { tanggal: '', n: {} }
    sapu()
    return set.size
  }

  const api = async (metode, jalur, body) => {
    const r = await fetch(worker + jalur, {
      method: metode,
      headers: { authorization: `Bearer ${env.WA_MESIN || ''}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    })
    return { status: r.status, json: await r.json().catch(() => ({})) }
  }

  // Salinan himpunan wa_sha setuju. Jaringan gagal, HTTP gagal, atau isi rusak = salinan lama tetap dipakai.
  async function segarkan() {
    if (!hidup) return { ok: false, alasan: 'mati' }
    try {
      const r = await api('GET', '/api/wa/terdaftar')
      if (r.status !== 200 || !Array.isArray(r.json.wa_sha)) { log('[daftar] segarkan gagal HTTP', r.status); return { ok: false, alasan: 'http ' + r.status } }
      const baru = new Set(r.json.wa_sha.filter((x) => typeof x === 'string' && RE_SHA.test(x)))
      set = baru
      sapu()
      try { tulis(F.terdaftar, { diperbarui: kini(), wa_sha: [...baru] }) } catch (e) { log('[daftar] simpan salinan gagal', String(e?.message || e)) }
      return { ok: true, n: baru.size }
    } catch (e) { log('[daftar] segarkan gagal', String(e?.message || e)); return { ok: false, alasan: 'jaringan' } }
  }

  let timer = null
  function mulai() {
    muat()
    if (!hidup) { log('[daftar] mati: WA_GARAM, WA_MESIN, atau PEMILIK kosong'); return }
    segarkan()
    timer = setInterval(segarkan, SEGAR_MS)
    timer.unref?.()
  }
  const henti = () => { clearInterval(timer); timer = null }

  // sha bila nomor terdaftar lewat bl_daftar (bukan WA_IZIN); null selain itu
  function shaTerdaftar(nomor) {
    const n = normalWa(nomor)
    if (!n || izin.has(n)) return null
    const s = waSha(n, garam)
    return s && set.has(s) ? s : null
  }
  const terdaftar = (nomor) => izin.has(normalWa(nomor)) || !!shaTerdaftar(nomor)

  const hariIni = () => { const tgl = hariWib(kini()); if (hari.tanggal !== tgl) hari = { tanggal: tgl, n: {} }; return hari }
  // satu balasan per nomor per hari WIB
  function jatah(sha) {
    const h = hariIni()
    if (h.n[sha]) return false
    h.n[sha] = 1
    try { tulis(F.hari, hari) } catch {}
    return true
  }
  // plafon global balasan per hari WIB. Lewat = diam, PEMILIK dikabari sekali hari itu.
  async function plafon() {
    const h = hariIni(), g = h.g || (h.g = { balas: 0, kabar: 0 })
    if (g.balas >= BATAS_BALAS) {
      if (g.kabar) return false
      g.kabar = 1
      try { tulis(F.hari, hari) } catch {}
      await kirim(pemilik + '@s.whatsapp.net', `*Balasan nomor asing ditahan*\nHari ini sudah ${BATAS_BALAS} nomor belum terdaftar dibalas. Nomor berikutnya tidak dibalas sampai besok.`)
      return false
    }
    g.balas++
    try { tulis(F.hari, hari) } catch {}
    return true
  }

  // Pesan pribadi dari nomor yang tidak terdaftar: hanya T_BELUM, tidak pernah meneruskan pesan dan tidak pernah mengirim data laporan.
  async function asing({ dari, jid, teks }) {
    const n = normalWa(dari)
    const sha = hidup ? waSha(n, garam) : null
    if (!sha || !jid || /@g\.us$/i.test(jid)) return 'mati'
    if (n === pemilik) return 'diam-pemilik' // pemilik di luar WA_IZIN tidak dibalas
    if (!/^62/.test(n)) return 'diam-lid' // hanya LID tanpa nomor
    if (RELAWAN.test(teks || '')) return 'diam-relawan'
    if (!jatah(sha)) return 'diam'
    if (!(await plafon())) return 'diam-batas'
    await kirim(jid, T_BELUM)
    return 'belum'
  }

  // Perintah putusan: hanya dari PEMILIK, satu baris, argumen nomor HP. Sinkron supaya gateway tahu pesan ini dicegat.
  function cocokPemilik(dari, teks) {
    if (!hidup || normalWa(dari) !== pemilik) return null
    return uraiPutusan(teks)
  }

  // setuju = daftarkan langsung (tanpa permintaan sebelumnya), tolak = cabut. Hanya PEMILIK yang dikabari.
  async function putuskan({ putusan, nomor, nama }) {
    const ke = pemilik + '@s.whatsapp.net'
    const sha = waSha(nomor, garam)
    let r
    try { r = await api('POST', '/api/wa/daftar', { wa_sha: sha, status: putusan, ...(nama ? { nama } : {}) }) } catch { r = { status: 0, json: {} } }
    if (r.status !== 200) { await kirim(ke, `*Gagal disimpan*\n${putusan} ${nomor} belum tersimpan (HTTP ${r.status || 'jaringan'}). Ulangi sebentar lagi.`); return 'gagal' }
    await segarkan()
    const siapa = r.json.nama ? `${r.json.nama}, ${nomor}` : nomor
    await kirim(ke, putusan === 'setuju' ? `*Nomor terdaftar*\n${siapa} sekarang bisa memakai bot laporan.` : `*Nomor dicabut*\n${siapa} tidak lagi terdaftar.`)
    return putusan
  }

  return { hidup, muat, mulai, henti, segarkan, terdaftar, shaTerdaftar, asing, cocokPemilik, putuskan, ukuran: () => set.size }
}

module.exports = { buat, waSha, uraiPutusan, hariWib, T_BELUM, SEGAR_MS, BATAS_BALAS }
