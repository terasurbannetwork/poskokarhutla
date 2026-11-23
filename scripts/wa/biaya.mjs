// Catatan biaya Claude di mesin bot (pemilik 19 Nov 2026: "setelah final, pemakaian tokennya berapa usd terus nampilin sisa").
// Per laporan dan per bulan (WIB), dari biaya yang dihitung bot sendiri (claude.mjs biaya() untuk V1, total_cost_usd SDK untuk V2).
// API Anthropic tidak punya endpoint saldo kredit; sisa = BL_ANGGARAN_BULAN dikurangi pemakaian bot bulan ini menurut catatan ini.
// Batas belanja harian tetap di D1 bl_biaya (A10); berkas ini hanya untuk laporan ke pemakai. ~/.wa-bot/biaya-lokal.json:
// {bulan: {"2026-11": usd}, proyek: {"P-191126-01": {usd, waktu}}}
import fs from 'node:fs'
import path from 'node:path'

const MAKS_PROYEK = 500
const berkas = (dasar) => path.join(dasar, 'biaya-lokal.json')
const baca = (dasar) => { try { const j = JSON.parse(fs.readFileSync(berkas(dasar), 'utf8')); return { bulan: j.bulan || {}, proyek: j.proyek || {}, kegiatan: j.kegiatan || {} } } catch { return { bulan: {}, proyek: {}, kegiatan: {} } } }
const bulanWib = (d = new Date()) => new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 7)

// Kegiatan pemakaian Claude (pemilik 19 Nov 2026: "coba track pemakaian selain bikin laporan"); dicatat per bulan WIB.
export const KEGIATAN = { laporan: 'Membuat dan merevisi laporan', tinjau: 'Tinjau visual draf', tanya: 'Tanya isi draf', rapikan: 'Rapikan bahan WA', percakapan: 'Kalimat bebas dan obrolan' }
// usd: dolar (bukan mikro). proyek boleh null (biaya tanpa proyek). kegiatan: kunci KEGIATAN (bawaan laporan).
export function catat(dasar, { usd, proyek = null, kini = new Date(), kegiatan = 'laporan' }) {
  if (!(Number(usd) > 0)) return
  const s = baca(dasar), b = bulanWib(kini)
  s.bulan[b] = Number(s.bulan[b] || 0) + Number(usd)
  const k = KEGIATAN[kegiatan] ? kegiatan : 'laporan'
  s.kegiatan[b] = { ...(s.kegiatan[b] || {}), [k]: Number(s.kegiatan[b]?.[k] || 0) + Number(usd) }
  if (proyek) {
    s.proyek[proyek] = { usd: Number(s.proyek[proyek]?.usd || 0) + Number(usd), waktu: kini.getTime() }
    const ids = Object.keys(s.proyek).sort((a, c) => s.proyek[a].waktu - s.proyek[c].waktu)
    for (const id of ids.slice(0, Math.max(0, ids.length - MAKS_PROYEK))) delete s.proyek[id]
  }
  fs.mkdirSync(dasar, { recursive: true, mode: 0o700 })
  fs.writeFileSync(berkas(dasar), JSON.stringify(s, null, 1), { mode: 0o600 })
}
// -> [{kegiatan, label, usd}] bulan ini, terbesar dulu
export const perKegiatan = (dasar, kini = new Date()) => Object.entries(baca(dasar).kegiatan[bulanWib(kini)] || {})
  .map(([k, usd]) => ({ kegiatan: k, label: KEGIATAN[k] || k, usd: Number(usd) || 0 })).filter((x) => x.usd > 0).sort((a, b) => b.usd - a.usd)
// Ringkasan untuk pemantau /admin/biaya-bot (dikirim mesin tiap 10 menit): 12 bulan dan 200 laporan terakhir, tanpa nomor.
export function ringkas(dasar) {
  const s = baca(dasar), bln = Object.keys(s.bulan).sort().slice(-12), pr = Object.entries(s.proyek).sort((a, c) => c[1].waktu - a[1].waktu).slice(0, 200)
  return { bulan: Object.fromEntries(bln.map((b) => [b, Number(s.bulan[b]) || 0])), kegiatan: Object.fromEntries(Object.keys(s.kegiatan).sort().slice(-12).map((b) => [b, s.kegiatan[b]])),
    proyek: Object.fromEntries(pr.map(([id, v]) => [id, { usd: Number(v.usd) || 0, waktu: Math.round(Number(v.waktu)) || 1 }])) }
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
