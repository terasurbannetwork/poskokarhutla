// Pembantu keamanan murni (tanpa jaringan), diuji di tests/wa/aman.test.mjs.
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Token dibandingkan konstan-waktu: sha256 kedua sisi lalu timingSafeEqual.
const samaAman = (a, b) => {
  if (!a || !b) return false
  const h = (x) => crypto.createHash('sha256').update(String(x)).digest()
  return crypto.timingSafeEqual(h(a), h(b))
}

// id pesan WA berasal dari luar: hanya alfanumerik, maks 12.
const idAman = (raw) => String(raw || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12) || crypto.randomBytes(4).toString('hex')
const idSah = (id) => /^\d+-[A-Za-z0-9]+$/.test(String(id))

// Berkas yang boleh dikirim /send-file: nyata (realpath), berkas biasa, di dalam `kunci` (keluaran/) saja.
function jalurKeluaran(p, kunci) {
  try {
    const dasar = fs.realpathSync(kunci)
    const nyata = fs.realpathSync(path.resolve(String(p)))
    if (!nyata.startsWith(dasar + path.sep) || !fs.statSync(nyata).isFile()) return null
    return nyata
  } catch { return null }
}

const MIME_BOLEH = [/^image\//, /^application\/pdf$/, /^text\/(plain|csv)$/,
  /^application\/msword$/, /^application\/vnd\.ms-excel$/,
  /^application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)$/,
  /^application\/vnd\.oasis\.opendocument\.(text|spreadsheet)$/]
const mimeBoleh = (m) => MIME_BOLEH.some((r) => r.test(String(m || '').toLowerCase().split(';')[0].trim()))

// fileLength dari Baileys bisa number, string, atau Long. NaN/negatif/lewat batas -> null.
function ukuranBerkas(len, batas) {
  const n = Number(len?.toString?.() ?? len)
  return Number.isFinite(n) && n >= 0 && n <= batas ? n : null
}

// Id pesan yang sudah diteruskan (susulan offline tidak boleh dikirim dua kali, juga lewat restart). Berkas 0600, maks `cap` id.
function buatTerlihat(berkas, cap = 5000) {
  let daftar = []
  try { const j = JSON.parse(fs.readFileSync(berkas, 'utf8')); if (Array.isArray(j)) daftar = j.map(String) } catch {}
  const set = new Set(daftar)
  return {
    ada: (id) => set.has(String(id)),
    catat(id) {
      id = String(id)
      if (set.has(id)) return
      set.add(id)
      while (set.size > cap) set.delete(set.values().next().value)
      fs.writeFileSync(berkas, JSON.stringify([...set]), { mode: 0o600 })
      fs.chmodSync(berkas, 0o600)
    },
  }
}

// 'append' = susulan offline: hanya yang <= 24 jam (ts detik dari Baileys, bisa Long).
const susulanBaru = (ts, now = Date.now()) => { const t = Number(ts?.toString?.() ?? ts) * 1000; return Number.isFinite(t) && t > 0 && now - t <= 86400e3 }

module.exports = { samaAman, idAman, idSah, jalurKeluaran, mimeBoleh, ukuranBerkas, buatTerlihat, susulanBaru }
