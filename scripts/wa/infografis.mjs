// Perintah `infografis <periode>` Bot Laporan BNPB (K-infografis, pemilik 24 Nov 2026 "gas"): hanya lewat perintah, tanpa jadwal,
// berkas hanya ke pengirim yang terdaftar, tanpa grup, tanpa Drive. Generator: scripts/bnpb/infografis_tahunan.py (angka dari sistem, tanpa LLM).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SKRIP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bnpb/infografis_tahunan.py')
const MIME = { pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pdf: 'application/pdf' }
export const BATAS_MS = 15 * 60e3
export const PERINTAH_INFO = 'Contoh: *infografis 2025* (tahun), *infografis 2026-10* (bulan), *infografis 2026-T3* (triwulan).'

// "2025" | "2026-10" | "2026-t3" (sudah huruf kecil) -> kode periode bagi skrip, atau null. Hanya tahun 2000-2099.
export function periodeInfografis(s) {
  const m = String(s ?? '').trim().toLowerCase().match(/^(20\d\d)(?:-(0[1-9]|1[0-2])|-t([1-4]))?$/)
  return m ? m[1] + (m[2] ? '-' + m[2] : m[3] ? '-T' + m[3] : '') : null
}

const RAMAH = /belum genap|tidak ada di DIBI|tidak dikenal/
let sibuk = false

// ctx: {dep:{exec}, dasar, balas, balasFile, kabariPemilik?, log?}; boleh = pengirim lolos daftar bot (diputuskan pemanggil); py = interpreter python bot.
export async function infografis({ periode, boleh }, ctx, py) {
  const { balas } = ctx
  if (!boleh) { await balas('*Nomor belum terdaftar*\nBot ini hanya bisa dipakai nomor yang terdaftar.'); return { status: 'infografis ditolak' } }
  if (!periode) { await balas(`*Periode belum jelas*\n\n${PERINTAH_INFO}`); return { status: 'infografis periode' } }
  if (sibuk) { await balas('*Infografis sedang dibuat*\n\nTunggu sebentar, berkas dikirim begitu siap.'); return { status: 'infografis sibuk' } }
  sibuk = true
  try {
    const keluar = path.join(ctx.dasar, 'keluaran', 'infografis', periode) // di bawah akar yang boleh dikirim gateway
    fs.rmSync(keluar, { recursive: true, force: true })
    fs.mkdirSync(keluar, { recursive: true, mode: 0o700 })
    await balas(`*Membuat infografis ${periode}*\n\nMohon tunggu beberapa menit, berkas menyusul.`)
    try {
      await ctx.dep.exec(py, [SKRIP, periode, '--keluar', keluar], { timeout: BATAS_MS, maxBuffer: 20e6 })
    } catch (e) {
      const baris = String(e.stderr || e.message || e).trim().split('\n').filter(Boolean).pop() || ''
      if (RAMAH.test(baris)) { await balas(`*Infografis belum bisa dibuat*\n\n${baris.slice(0, 300)}`); return { status: 'infografis ditolak skrip' } }
      ;(ctx.log || (() => {}))('infografis gagal', baris.slice(0, 300))
      if (ctx.kabariPemilik) try { await ctx.kabariPemilik(`Infografis ${periode} gagal: ${baris.slice(0, 300)}`) } catch {}
      await balas('*Infografis gagal dibuat*\n\nPemilik sudah dikabari. Coba lagi nanti.')
      return { status: 'infografis gagal' }
    }
    const berkas = fs.readdirSync(keluar).filter((n) => /\.(pptx|pdf)$/.test(n)).sort()
    if (!berkas.length) { await balas('*Infografis gagal dibuat*\n\nBerkas keluaran tidak ditemukan.'); return { status: 'infografis kosong' } }
    for (const n of berkas) await ctx.balasFile(path.join(keluar, n), n, null, MIME[n.endsWith('.pdf') ? 'pdf' : 'pptx'])
    return { status: 'infografis' }
  } finally { sibuk = false }
}
