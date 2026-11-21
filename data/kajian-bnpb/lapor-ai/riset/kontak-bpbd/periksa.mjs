// Cek ulang tiap nomor hasil panen: buka URL sumber (mentah), pastikan digit nomor ada di halaman.
// node periksa.mjs hasil/*.json > periksa.json
import fs from 'node:fs'

const digit = (s) => String(s).replace(/\D/g, '')
// bentuk pembanding: 0xxx, 62xxx, dan tanpa awalan (situs kadang menulis +62 / (0xxx))
const bentuk = (d) => {
  const inti = d.startsWith('62') ? d.slice(2) : d.startsWith('0') ? d.slice(1) : d
  return [inti]
}
const cache = new Map()
async function ambil(url) {
  if (cache.has(url)) return cache.get(url)
  let hasil
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/128 Safari/537.36' }, redirect: 'follow', signal: AbortSignal.timeout(25000) })
    const t = await r.text()
    hasil = { status: r.status, teks: digit(t.replace(/<[^>]+>/g, ' ')), mentah: t.length }
  } catch (e) { hasil = { status: 0, galat: String(e.cause?.code || e.message).slice(0, 60) } }
  cache.set(url, hasil)
  return hasil
}

const baris = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')))
const keluar = []
const antre = []
for (const w of baris) for (const lembaga of ['bpbd', 'damkar']) for (const n of w[lembaga] || []) antre.push({ w, lembaga, n })
let i = 0
async function pekerja() {
  while (i < antre.length) {
    const { w, lembaga, n } = antre[i++]
    const d = digit(n.nomor)
    let vonis, catatan = ''
    if (!/^https?:\/\/[^/]*\.go\.id(\/|$|:)/i.test(n.url || '')) vonis = 'tolak_domain'
    else if (d.length < 8 || d.length > 14) vonis = 'tolak_format'
    else {
      const h = await ambil(n.url)
      if (!h.teks) { vonis = 'tak_terbuka'; catatan = h.galat || 'HTTP ' + h.status }
      else vonis = bentuk(d).some((b) => h.teks.includes(b)) ? 'cocok' : 'tak_ditemukan'
      if (h.status && h.status >= 400) catatan = 'HTTP ' + h.status
    }
    keluar.push({ kode: w.kode, nama: w.nama, lembaga, nomor: n.nomor, jenis: n.jenis, url: n.url, vonis, catatan })
  }
}
await Promise.all(Array.from({ length: 6 }, pekerja))
const hitung = keluar.reduce((a, x) => ((a[x.vonis] = (a[x.vonis] || 0) + 1), a), {})
console.error(hitung)
console.log(JSON.stringify(keluar, null, 1))
