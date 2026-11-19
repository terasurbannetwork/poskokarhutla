// Estimasi waktu pembuatan laporan untuk pesan "Laporan sedang dibuat" (pemilik 19 Nov 2026: "coba ada pesan konfirmasi, Laporan sedang
// dibuat, Estimasi waktu: x-x menit, Selesai pada pukul xx.xx WIB"). Belajar dari lama pembuatan yang benar-benar terjadi di mesin ini:
// ~/.wa-bot/proyek/durasi.json {kunci: [detik, ...]} (10 terakhir per kunci). Kunci = "<v1|v2>:<bangun|revisi>:<jenis>".
import fs from 'node:fs'
import path from 'node:path'

// Bawaan sebelum ada catatan (menit), dari pengamatan 18-19 Nov: V1 harian sekitar 2 menit, V2 sampai 6 menit (D28).
const BAWAAN = {
  'v1:bangun:harian': [1, 3], 'v1:bangun:penanganan': [3, 10], 'v1:revisi': [1, 2],
  'v2:bangun:harian': [4, 8], 'v2:bangun:penanganan': [6, 12], 'v2:revisi': [2, 5],
}
const MAKS_CATAT = 10
const durasiP = (dasar) => path.join(dasar, 'proyek', 'durasi.json')
const baca = (dasar) => { try { return JSON.parse(fs.readFileSync(durasiP(dasar), 'utf8')) } catch { return {} } }
export const kunciDurasi = (versi, mode, jenis) => `${versi}:${mode}:${jenis}`

export function catatDurasi(dasar, kunci, detik) {
  if (!(detik > 0) || detik > 3 * 3600) return
  const isi = baca(dasar)
  isi[kunci] = [...(isi[kunci] || []), Math.round(detik)].slice(-MAKS_CATAT)
  fs.mkdirSync(path.dirname(durasiP(dasar)), { recursive: true, mode: 0o700 })
  fs.writeFileSync(durasiP(dasar), JSON.stringify(isi), { mode: 0o600 })
}

// -> [menit paling cepat, menit paling lama]. Dengan 3 catatan atau lebih: rentang dari catatan terakhir (tercepat dibulatkan ke bawah,
// terlama ke atas); kurang dari itu: bawaan.
export function perkiraan(dasar, kunci) {
  const c = baca(dasar)[kunci] || []
  const [versi, mode] = kunci.split(':')
  const bawaan = BAWAAN[kunci] || BAWAAN[`${versi}:${mode}`] || [2, 6]
  if (c.length < 3) return bawaan
  const lo = Math.max(1, Math.floor(Math.min(...c) / 60)), hi = Math.max(lo + 1, Math.ceil(Math.max(...c) / 60))
  return [lo, hi]
}

// Jam WIB "15.09" untuk kini + menit
export function jamSelesai(kini, menit) {
  const w = new Date(kini.getTime() + menit * 60e3 + 7 * 3600e3)
  return `${String(w.getUTCHours()).padStart(2, '0')}.${String(w.getUTCMinutes()).padStart(2, '0')}`
}
