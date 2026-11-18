// Pendaftaran nomor bot laporan (BL-03; data/kajian-bnpb/bot-laporan K6, K14, D10, ALUR D, ALGORITMA A1, T-DAFTAR).
// Murni dan bisa diuji: fetch, fs, jam, dan kirim disuntik. Dipakai gateway/index.js (CommonJS).
//  - terdaftar(n) = n di WA_IZIN atau sha(n) di salinan GET /api/wa/terdaftar (disegarkan tiap 5 menit dan segera sesudah putusan; gagal jaringan = salinan lama tetap).
//  - Nomor asing (chat pribadi): T-DAFTAR paling banyak sekali per nomor per hari WIB; pesannya tidak pernah diteruskan ke Worker.
//  - "daftar <nama>, <instansi>": POST /api/wa/daftar menunggu, JID ditahan di ~/.wa-bot/daftar/<sha>.json, permintaan diteruskan ke PEMILIK (nomor lengkap hanya ke PEMILIK).
//    Jawaban diam:true (ditolak kurang dari 30 hari) = tidak membalas dan tidak meneruskan.
//  - Hanya PEMILIK: "setuju <nomor>" / "tolak <nomor>" -> POST /api/wa/daftar, segarkan salinan, kabari pendaftar lewat JID tertahan, hapus berkas tertahan.
// wa_sha = sha256(`${WA_GARAM}|${nomor 62...}`) (hex kecil). WA_GARAM kosong = fitur mati (nomor asing tetap dibuang diam seperti sebelumnya).
// Semua kirim lewat kirim(jid, teks) milik gateway, yaitu sendPaced (limiter tidak dilewati).
const crypto = require('crypto')
const nodeFs = require('fs')
const path = require('path')
const { normalWa, daftar: pisahKoma } = require('./umum.cjs')

const RE_SHA = /^[0-9a-f]{64}$/
const SEGAR_MS = 5 * 60 * 1000
const BATAS_BALAS = 30, BATAS_TERUS = 20, USIA_TAHAN = 30 * 864e5 // plafon global per hari WIB (semua nomor); berkas tertahan basi sesudah 30 hari
const KONTROL = /[\u0000-\u001f\u007f​-‏‪-‮﻿]/g
// Gaya pesan: data/kajian-bnpb/bot-laporan/DESIGN-SYSTEM.md (judul tebal, baris pendek, tanpa titik tengah, em dash, emoji).
const T_DAFTAR = '*Nomor belum terdaftar*\n\nNomor ini belum terdaftar di bot laporan BNPB.\nUntuk mendaftar, ketik:\n*daftar nama, instansi*\n\nContoh: daftar Budi Santoso, BPBD Riau'
const T_DIKIRIM = '*Permintaan terkirim*\n\nPermintaan daftar sudah diteruskan ke admin.\nKabar dikirim ke nomor ini sesudah diputuskan.'
const T_FORMAT = '*Format belum sesuai*\n\nKetik: *daftar nama, instansi*\nContoh: daftar Budi Santoso, BPBD Riau'
const T_PENUH = '*Antrean pendaftaran penuh*\n\nCoba daftar lagi besok.'
const T_SUDAH = '*Nomor sudah terdaftar*\n\nKirim ulang pesan tadi.'
const T_SETUJU = '*Pendaftaran disetujui*\n\nNomor ini sekarang terdaftar di bot laporan BNPB.\nKetik *bantuan* untuk melihat cara pakai.'
const T_TOLAK = '*Pendaftaran belum disetujui*\n\nNomor ini belum bisa memakai bot laporan BNPB.'
const INSTANSI = /^(bpbd|bnpb|pemda|pemkab|pemkot|pemprov|pemerintah|dinas|dishut|tni|polri|polda|polres|polsek|kodim|korem|kodam|koramil|lanud|lanal|basarnas|bmkg|brin|klhk|kemen\w*|kementerian|badan|satgas|pmi|manggala|universitas|univ|institut|politeknik|pt|cv|yayasan|kantor|balai|pusdalops|bappeda|sekda|setda)$/i
const RELAWAN = /^(siap|tidak)\s+[a-z0-9]{6}\s*$/i // balasan panggilan relawan (LP-020), bukan sapaan: jangan dibalas T-DAFTAR

const hariWib = (t) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10)
const bersih = (s, n) => String(s ?? '').normalize('NFC').replace(KONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, n).trim()

function waSha(nomor, garam) {
  const n = normalWa(nomor)
  if (!garam || !n || /@g\.us$/i.test(n)) return null
  return crypto.createHash('sha256').update(`${garam}|${n}`).digest('hex')
}

// "daftar Budi Santoso, BPBD Riau" (pemisah , | ;) -> {nama, instansi}; tanpa pemisah: dipotong di kata instansi pertama, selain itu kata terakhir = instansi.
function uraiDaftar(teks) {
  const m = /^\s*daftar\s+([\s\S]{3,300})$/i.exec(String(teks ?? ''))
  if (!m) return null
  const isi = bersih(m[1], 300)
  let nama, instansi
  const p = /\s*[,|;]\s*|\s+-\s+/.exec(isi)
  if (p) { nama = isi.slice(0, p.index); instansi = isi.slice(p.index + p[0].length) } else {
    const k = isi.split(' ')
    if (k.length < 2) return null
    let i = k.findIndex((w, j) => j > 0 && INSTANSI.test(w))
    if (i < 0) i = k.length - 1
    nama = k.slice(0, i).join(' '); instansi = k.slice(i).join(' ')
  }
  nama = bersih(nama, 80); instansi = bersih(instansi, 120)
  return nama.length >= 2 && instansi.length >= 2 ? { nama, instansi } : null
}

// "setuju 0812-3456-7890" / "tolak +62 812..." -> {putusan, nomor 62...}; argumen harus nomor HP (bukan id pola aturan tetap).
function uraiPutusan(teks) {
  const m = /^\s*(setuju|tolak)\s+(\+?[\d\s.-]{9,24})\s*$/i.exec(String(teks ?? ''))
  if (!m) return null
  const nomor = normalWa(m[2])
  return /^628\d{7,12}$/.test(nomor || '') ? { putusan: m[1].toLowerCase(), nomor } : null
}

function buat({ env = process.env, fetch = globalThis.fetch, fs = nodeFs, rumah, kini = Date.now, kirim, log = () => {} } = {}) {
  const garam = env.WA_GARAM || ''
  const worker = (env.WORKER_URL || 'https://centurisk97.id').replace(/\/$/, '')
  const izin = new Set(pisahKoma(env.WA_IZIN).map(normalWa).filter(Boolean))
  const pemilik = normalWa(pisahKoma(env.PEMILIK)[0])
  const hidup = !!(garam && env.WA_MESIN && pemilik)
  const F = {
    terdaftar: path.join(rumah, 'terdaftar.json'),
    hari: path.join(rumah, 'daftar-hari.json'),
    ditolak: path.join(rumah, 'daftar-ditolak.json'),
    tahan: path.join(rumah, 'daftar'),
  }
  const tahanan = (sha) => path.join(F.tahan, sha + '.json')
  const baca = (f, awal) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) ?? awal } catch { return awal } }
  const tulis = (f, isi) => {
    fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 })
    const s = f + '.' + process.pid + '.tmp'
    fs.writeFileSync(s, JSON.stringify(isi), { mode: 0o600 })
    try { fs.chmodSync(s, 0o600) } catch {}
    fs.renameSync(s, f)
  }
  // berkas tertahan lebih tua dari 30 hari dibuang (permintaan yang tak pernah diputus boleh diteruskan lagi)
  function sapu() {
    let nama = []
    try { nama = fs.readdirSync(F.tahan) } catch { return }
    for (const x of nama) {
      if (!/^[0-9a-f]{64}\.json$/.test(x)) continue
      const f = path.join(F.tahan, x), t = baca(f, null)
      if (!(Number(t?.waktu) > kini() - USIA_TAHAN)) try { fs.rmSync(f, { force: true }) } catch {}
    }
  }
  let set = new Set()
  let hari = { tanggal: '', n: {} }
  let ditolak = {}

  function muat() {
    const t = baca(F.terdaftar, {})
    set = new Set((Array.isArray(t.wa_sha) ? t.wa_sha : []).filter((x) => RE_SHA.test(x)))
    hari = baca(F.hari, { tanggal: '', n: {} })
    if (!hari || typeof hari.n !== 'object') hari = { tanggal: '', n: {} }
    ditolak = baca(F.ditolak, {}) || {}
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

  // jatah balasan per nomor per hari WIB: t = T-DAFTAR, d = permintaan daftar
  const hariIni = () => { const tgl = hariWib(kini()); if (hari.tanggal !== tgl) hari = { tanggal: tgl, n: {} }; return hari }
  // plafon global per hari WIB: 'balas' (T-DAFTAR, T_FORMAT) dan 'terus' (ke PEMILIK). Lewat = diam, PEMILIK dikabari sekali hari itu.
  async function plafon(jenis) {
    const h = hariIni(), g = h.g || (h.g = { balas: 0, terus: 0, kabar: {} })
    const batas = jenis === 'balas' ? BATAS_BALAS : BATAS_TERUS
    if (g[jenis] >= batas) {
      if (g.kabar[jenis]) return false
      g.kabar[jenis] = 1
      try { tulis(F.hari, hari) } catch {}
      await kirim(pemilik + '@s.whatsapp.net', jenis === 'balas'
        ? `*Batas balasan daftar tercapai*\n\nBalasan cara mendaftar hari ini sudah ${batas}.\nNomor asing berikutnya tidak dibalas sampai besok.`
        : `*Batas permintaan daftar tercapai*\n\nPermintaan daftar hari ini sudah ${batas} diteruskan.\nPermintaan berikutnya ditahan sampai besok.`)
      return false
    }
    g[jenis]++
    try { tulis(F.hari, hari) } catch {}
    return true
  }
  function jatah(sha, jenis) {
    hariIni()
    const x = hari.n[sha] || (hari.n[sha] = {})
    if (x[jenis]) return false
    x[jenis] = 1
    try { tulis(F.hari, hari) } catch {}
    return true
  }
  function lepas(sha, jenis) { if (hari.n[sha]) { delete hari.n[sha][jenis]; try { tulis(F.hari, hari) } catch {} } }
  const masihDitolak = (sha) => Number(ditolak[sha]) > kini()
  function catatTolak(sha, sampai) {
    for (const [k, v] of Object.entries(ditolak)) if (!(Number(v) > kini())) delete ditolak[k]
    if (sampai) ditolak[sha] = sampai; else delete ditolak[sha]
    try { tulis(F.ditolak, ditolak) } catch {}
  }

  // Pesan pribadi dari nomor yang tidak terdaftar. Tidak pernah meneruskan pesan ke Worker dan tidak pernah mengirim data laporan.
  async function asing({ dari, jid, teks }) {
    const n = normalWa(dari)
    const sha = hidup ? waSha(n, garam) : null
    if (!sha || !jid || /@g\.us$/i.test(jid)) return 'mati'
    if (n === pemilik) return 'diam-pemilik' // pemilik di luar WA_IZIN tidak dibalas cara mendaftar
    if (!/^62/.test(n)) return 'diam-lid' // hanya LID tanpa nomor: tidak bisa disetujui pemilik
    if (masihDitolak(sha)) return 'diam-ditolak'
    const d = uraiDaftar(teks)
    if (!d) {
      if (RELAWAN.test(teks || '')) return 'diam-relawan'
      const format = /^\s*daftar\b/i.test(teks || '')
      if (!jatah(sha, 't')) return 'diam'
      if (!(await plafon('balas'))) return 'diam-batas'
      await kirim(jid, format ? T_FORMAT : T_DAFTAR)
      return format ? 'format' : 't-daftar'
    }
    if (fs.existsSync(tahanan(sha))) return 'diam-menunggu' // sudah diteruskan dan belum diputus: tidak diteruskan lagi
    if (!jatah(sha, 'd')) return 'diam'
    if (!(await plafon('terus'))) return 'diam-batas'
    let r
    try { r = await api('POST', '/api/wa/daftar', { wa_sha: sha, status: 'menunggu', nama: d.nama, instansi: d.instansi }) } catch (e) {
      lepas(sha, 'd'); log('[daftar] kirim ke Worker gagal', String(e?.message || e)); return 'gagal'
    }
    if (r.status === 429) { await kirim(jid, T_PENUH); return 'penuh' }
    if (r.status >= 500) { lepas(sha, 'd'); log('[daftar] Worker HTTP', r.status); return 'gagal' }
    if (r.status !== 200) { await kirim(jid, T_FORMAT); return 'ditolak-worker' }
    if (r.json.diam) { catatTolak(sha, Number(r.json.tolak_sampai) || kini() + 30 * 864e5); return 'diam-ditolak' }
    if (r.json.status === 'setuju') { await segarkan(); await kirim(jid, T_SUDAH); return 'sudah' }
    if (r.json.status !== 'menunggu') return 'diam'
    tulis(tahanan(sha), { jid, nomor: n, nama: d.nama, instansi: d.instansi, waktu: kini() })
    await kirim(pemilik + '@s.whatsapp.net', `*Permintaan daftar baru*\n\nNama: ${d.nama}\nInstansi: ${d.instansi}\nNomor: ${n}\n\nBalas *setuju ${n}* atau *tolak ${n}*`)
    await kirim(jid, T_DIKIRIM)
    return 'daftar'
  }

  // Perintah putusan: hanya dari PEMILIK, satu baris, argumen nomor HP. Sinkron supaya gateway tahu pesan ini dicegat.
  function cocokPemilik(dari, teks) {
    if (!hidup || normalWa(dari) !== pemilik) return null
    return uraiPutusan(teks)
  }

  async function putuskan({ putusan, nomor }) {
    const ke = pemilik + '@s.whatsapp.net'
    const sha = waSha(nomor, garam)
    let r
    try { r = await api('POST', '/api/wa/daftar', { wa_sha: sha, status: putusan }) } catch (e) { r = { status: 0, json: {} } }
    if (r.status !== 200) { await kirim(ke, `*Putusan gagal disimpan*\n\n${putusan} ${nomor} (HTTP ${r.status || 'jaringan'}).\nKirim ulang putusannya sebentar lagi.`); return 'gagal' }
    catatTolak(sha, putusan === 'tolak' ? kini() + 30 * 864e5 : 0)
    await segarkan()
    const t = baca(tahanan(sha), null)
    const siapa = r.json.nama ? `${r.json.nama}${r.json.instansi ? ' (' + r.json.instansi + ')' : ''}, ${nomor}` : nomor
    if (t && t.jid) {
      await kirim(t.jid, putusan === 'setuju' ? T_SETUJU : T_TOLAK)
      try { fs.rmSync(tahanan(sha), { force: true }) } catch {}
      await kirim(ke, `*${putusan === 'setuju' ? 'Disetujui' : 'Ditolak'}*\n\n${siapa}\nPendaftar sudah dikabari.`)
    } else {
      await kirim(ke, `*${putusan === 'setuju' ? 'Disetujui' : 'Ditolak'}*\n\n${siapa}\nTidak ada permintaan tertahan, jadi pendaftar tidak dikabari.`)
    }
    return putusan
  }

  return { hidup, muat, mulai, henti, segarkan, terdaftar, shaTerdaftar, asing, cocokPemilik, putuskan, ukuran: () => set.size }
}

module.exports = { buat, waSha, uraiDaftar, uraiPutusan, hariWib, T_DAFTAR, T_DIKIRIM, T_SETUJU, T_TOLAK, SEGAR_MS }
