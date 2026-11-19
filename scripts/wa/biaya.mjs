// Catatan biaya Claude di mesin bot (pemilik 19 Nov 2026: "setelah final, pemakaian tokennya berapa usd terus nampilin sisa").
// Per laporan dan per bulan (WIB), dari biaya yang dihitung bot sendiri (claude.mjs biaya() untuk V1, total_cost_usd SDK untuk V2).
// API Anthropic tidak punya endpoint saldo kredit; sisa = BL_ANGGARAN_BULAN dikurangi pemakaian bot bulan ini menurut catatan ini.
// Batas belanja harian tetap di D1 bl_biaya (A10); berkas ini hanya untuk laporan ke pemakai. ~/.wa-bot/biaya-lokal.json:
// {bulan: {"2026-11": usd}, proyek: {"P-191126-01": {usd, waktu}}}
import fs from 'node:fs'
import path from 'node:path'

const MAKS_PROYEK = 500
const berkas = (dasar) => path.join(dasar, 'biaya-lokal.json')
const baca = (dasar) => { try { const j = JSON.parse(fs.readFileSync(berkas(dasar), 'utf8')); return { bulan: j.bulan || {}, proyek: j.proyek || {} } } catch { return { bulan: {}, proyek: {} } } }
const bulanWib = (d = new Date()) => new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 7)

// usd: dolar (bukan mikro). proyek boleh null (biaya tanpa proyek).
export function catat(dasar, { usd, proyek = null, kini = new Date() }) {
  if (!(Number(usd) > 0)) return
  const s = baca(dasar), b = bulanWib(kini)
  s.bulan[b] = Number(s.bulan[b] || 0) + Number(usd)
  if (proyek) {
    s.proyek[proyek] = { usd: Number(s.proyek[proyek]?.usd || 0) + Number(usd), waktu: kini.getTime() }
    const ids = Object.keys(s.proyek).sort((a, c) => s.proyek[a].waktu - s.proyek[c].waktu)
    for (const id of ids.slice(0, Math.max(0, ids.length - MAKS_PROYEK))) delete s.proyek[id]
  }
  fs.mkdirSync(dasar, { recursive: true, mode: 0o700 })
  fs.writeFileSync(berkas(dasar), JSON.stringify(s, null, 1), { mode: 0o600 })
}
export const proyek = (dasar, id) => Number(baca(dasar).proyek[id]?.usd || 0)
export const bulan = (dasar, kini = new Date()) => Number(baca(dasar).bulan[bulanWib(kini)] || 0)
export const terakhir = (dasar, n = 5) => Object.entries(baca(dasar).proyek).sort((a, b) => b[1].waktu - a[1].waktu).slice(0, n).map(([id, v]) => ({ id, usd: v.usd }))

// $1,23 (format Indonesia, dua desimal)
export const dolar = (usd) => '$' + Number(usd || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
// Baris pemakaian bulan ini. pakai (USD) dari jumlah harian D1 bl_biaya (lengkap sejak 18 Nov, pemilik 19 Nov: berkas lokal baru
// mulai siang itu sehingga "$0,14" padahal Console $7,46); tanpa pakai = berkas lokal. Dengan anggaran (BL_ANGGARAN_BULAN) = "dari $200".
export function barisBulan(dasar, env = {}, kini = new Date(), pakai = null) {
  if (pakai == null) pakai = bulan(dasar, kini)
  const ang = Number(env.BL_ANGGARAN_BULAN)
  const nama = NAMA_BULAN[Number(bulanWib(kini).slice(5, 7)) - 1]
  if (!(ang > 0)) return `Pemakaian bot ${nama}: ${dolar(pakai)}.`
  return `Pemakaian bot ${nama}: ${dolar(pakai)} dari anggaran ${dolar(ang)}.`
}

// ---------- saldo kredit Console (perintah pemilik `saldo 192,54`) ----------
// API Anthropic tidak punya saldo kredit; pemilik menyalin "Organization credits" dari Console, bot menguranginya dengan pemakaian
// bot sesudahnya (jumlah D1 per hari). {usd, tanggal, hariItu (mikro D1 tanggal itu saat diatur), waktu}
const saldoP = (dasar) => path.join(dasar, 'saldo-console.json')
export const bacaSaldo = (dasar) => { try { return JSON.parse(fs.readFileSync(saldoP(dasar), 'utf8')) } catch { return null } }
export function aturSaldo(dasar, { usd, tanggal, hariItu, kini = new Date() }) {
  fs.mkdirSync(dasar, { recursive: true, mode: 0o700 })
  fs.writeFileSync(saldoP(dasar), JSON.stringify({ usd: Number(usd), tanggal, hariItu: Number(hariItu) || 0, waktu: kini.getTime() }), { mode: 0o600 })
}
// harian: {tanggal: mikro} dari D1 untuk tanggal >= saldo.tanggal -> perkiraan saldo sekarang (USD) atau null
export function sisaSaldo(saldo, harian) {
  if (!saldo) return null
  let mikro = 0
  for (const [t, m] of Object.entries(harian || {})) {
    if (t > saldo.tanggal) mikro += Number(m) || 0
    else if (t === saldo.tanggal) mikro += Math.max(0, (Number(m) || 0) - saldo.hariItu)
  }
  return Number(saldo.usd) - mikro / 1e6
}
export const nilaiUsd = (s) => { const t = String(s ?? '').replace(/^\$/, '').trim(); const n = Number(/,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')); return Number.isFinite(n) && n >= 0 ? n : null }
