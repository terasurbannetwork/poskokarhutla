// Tarik riwayat WA sekali jalan (murni, tanpa jaringan; dipakai gateway/index.js, diuji tests/wa/riwayat.test.mjs).
const { samaAman } = require('./aman.cjs')

const MAKS_HARI = 14
const WIB = 7 * 3600e3
// 'YYYY-MM-DD' (hari WIB) -> [awal, akhir) dalam ms; tanggal tak sah -> null.
function hariWib(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''))
  if (!m) return null
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3])
  const d = new Date(t)
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null
  return [t - WIB, t - WIB + 86400e3]
}
// Rentang sejak..sampai (inklusif, hari WIB) -> {dari, sampai} ms, atau null bila tak sah / terbalik.
function rentang(sejak, sampai) {
  const a = hariWib(sejak), b = hariWib(sampai)
  return a && b && a[0] <= b[0] ? { dari: a[0], sampai: b[1] } : null
}
const tsMs = (ts) => Number(ts?.toString?.() ?? ts) * 1000
const dalamRentang = (ts, r) => { const t = tsMs(ts); return Number.isFinite(t) && t >= r.dari && t < r.sampai }

// JID yang boleh diminta: grup operasi, atau chat nomor WA_IZIN (`nomorDari` = jid -> nomor). Tanpa `jid` = semua yang dikenal.
function pilihJid({ jid, grupOps, dikenal, izin, nomorDari, terdaftar = new Set() }) {
  // terdaftar = chat yang sudah lolos saringan izin saat dicatat sebagai jangkar (JID @lid tak bisa dipetakan ke nomor)
  const sah = (j) => grupOps.has(j) || (!/@g\.us$/.test(j) && (terdaftar.has(j) || izin.has(nomorDari(j))))
  if (jid) return sah(jid) ? { jids: [jid] } : { error: 'jid bukan grup operasi atau chat nomor izin' }
  return { jids: [...new Set([...grupOps, ...[...dikenal].filter(sah)])] }
}

// Handler HTTP (req/res gaya Express): token dulu (Authorization polos atau "Bearer "), lalu body, lalu `jalankan`.
function buatRute({ token, jalankan, pilih }) {
  return async (req, res) => {
    const h = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token || !samaAman(h, token)) return res.status(401).json({ status: false, error: 'unauthorized' })
    const b = req.body || {}
    const r = rentang(b.sejak, b.sampai)
    if (!r) return res.status(400).json({ status: false, error: 'sejak/sampai harus YYYY-MM-DD, sejak <= sampai' })
    if ((r.sampai - r.dari) / 86400e3 > MAKS_HARI) return res.status(400).json({ status: false, error: `rentang maksimal ${MAKS_HARI} hari` })
    const p = pilih(b.jid)
    if (p.error) return res.status(400).json({ status: false, error: p.error })
    try { res.json({ status: true, ...(await jalankan(p.jids, r)) }) } catch (e) {
      res.status(e.kode || 502).json({ status: false, error: String((e && e.message) || e) })
    }
  }
}

module.exports = { hariWib, rentang, dalamRentang, pilihJid, buatRute, tsMs }
