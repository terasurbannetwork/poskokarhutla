// Perintah tetap lewat WhatsApp dari nomor PEMILIK. Deterministik, tanpa LLM. Balasan HANYA ke pengirim perintah, tidak pernah ke PENERIMA.
//   buat harian|penanganan [tanggal] | kirim ulang harian|penanganan [tanggal] | status [tanggal] | bantuan
// parse() murni; tangani() memakai fungsi otomatis.mjs (bukan salinan logika generator) dan semua dunia luar disuntik lewat ctx.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { LAPORAN, cekSiap, tanggalWib, ambilBahan, siapkanKeluaran, jalankanGenerator, kunciProses, ambilKunci, MIME } from './otomatis.mjs'
import { JENIS_LAPORAN } from '../../src/wa_jenis.js'

const { normalWa, daftar, RUMAH } = createRequire(import.meta.url)('./umum.cjs')

const BULAN = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7,
  agu: 8, agt: 8, agustus: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, des: 12, desember: 12 }
const SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const labelTanggal = (d) => `${Number(d.slice(8, 10))} ${SINGKAT[Number(d.slice(5, 7)) - 1]}`
export const BANTUAN = [
  'Perintah bot:',
  'buat harian [tanggal]',
  'buat penanganan [tanggal]',
  'kirim ulang harian [tanggal]',
  'kirim ulang penanganan [tanggal]',
  'status [tanggal]',
  'bantuan',
  'Tanggal: hari ini (bawaan), kemarin, 26 okt, 26 oktober, 26/10, 2026-10-26.',
].join('\n')

const geser = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10)

function iso(y, m, d) {
  const s = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const t = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s ? s : null
}

// Tanggal kosong = hari ini WIB; tak terbaca = null.
export function parseTanggal(s, now = new Date()) {
  const hari = tanggalWib(now), tahun = Number(hari.slice(0, 4))
  let m
  if (s === '' || s === 'hari ini') return hari
  if (s === 'kemarin') return geser(hari, -1)
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return iso(m[1], m[2], m[3])
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/))) return iso(m[3] || tahun, m[2], m[1])
  if ((m = s.match(/^(\d{1,2}) ([a-z]+)(?: (\d{4}))?$/)) && BULAN[m[2]]) return iso(m[3] || tahun, BULAN[m[2]], m[1])
  return null
}

// -> {aksi:'buat'|'kirim_ulang'|'status'|'bantuan', laporan, tanggal} atau null (bukan perintah).
// Teks panjang atau berbaris banyak = bahan laporan, bukan perintah (bahan asli bisa saja berawalan "Status ...").
export function parse(teks, now = new Date()) {
  const t = String(teks ?? '').trim().toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ')
  if (!t || t.length > 60 || /\n/.test(String(teks).trim())) return null
  if (t === 'bantuan') return { aksi: 'bantuan' }
  const m = t.match(/^(buat|kirim ulang|kirim|status)\b ?(.*)$/)
  if (!m) return null
  const [, kata, sisa] = m
  if (kata === 'kirim') return { aksi: 'bantuan' }
  if (kata === 'status') {
    const tanggal = parseTanggal(sisa, now)
    return tanggal ? { aksi: 'status', tanggal } : { aksi: 'bantuan' }
  }
  const n = sisa.match(/^(harian|penanganan)\b ?(.*)$/)
  const tanggal = n && parseTanggal(n[2], now)
  if (!tanggal) return { aksi: 'bantuan' }
  return { aksi: kata === 'buat' ? 'buat' : 'kirim_ulang', laporan: n[1], tanggal }
}

// Pintu masuk gateway: perintah hanya bila pengirim ada di PEMILIK (dinormalkan seperti WA_IZIN) dan pesan tanpa lampiran.
export function cegat({ dari, teks, pemilik, now }) {
  const sah = new Set(daftar(pemilik).map(normalWa).filter(Boolean))
  const d = normalWa(dari)
  return d && sah.has(d) ? parse(teks, now) : null
}

let sibuk = false

// ctx: { env, dep, now, dasar, balas(teks), balasFile(path, nama, caption, mime), log, ada, kenali, tanggalIsi }
export async function tangani(cmd, ctx) {
  const { balas } = ctx
  if (cmd.aksi === 'bantuan') return balas(BANTUAN)
  if (sibuk) return balas('Sedang membuat laporan, tunggu sebentar.')
  sibuk = true
  try {
    if (cmd.aksi === 'buat') await buat(cmd, ctx)
    else if (cmd.aksi === 'kirim_ulang') await kirimUlang(cmd, ctx)
    else if (cmd.aksi === 'status') await status(cmd, ctx)
  } catch (e) {
    await balas(`Perintah gagal: ${String(e.message || e).slice(0, 300)}`)
  } finally { sibuk = false }
}

const dasarDari = (ctx) => ctx.dasar || RUMAH
const berkasDari = (lap, tanggal, dasar) => ['pptx', 'pdf'].map((x) => ({ x, p: path.join(dasar, 'keluaran', tanggal, `${lap.berkas(tanggal)}.${x}`) }))

async function kirimBerkas(lap, tanggal, berkas, caption, ctx) {
  for (const b of berkas) await ctx.balasFile(b.p, path.basename(b.p), caption, MIME[b.x])
}

async function buat({ laporan, tanggal }, ctx) {
  const { env, dep, balas, log = () => {} } = ctx
  const now = ctx.now || new Date(), dasar = dasarDari(ctx), ada = ctx.ada || fs.existsSync
  const lap = LAPORAN.find((l) => l.id === laporan)
  const lepas = kunciProses(path.join(dasar, 'otomatis.lock'))
  if (!lepas) return balas('Sedang membuat laporan, tunggu sebentar.')
  try {
    const bahan = await ambilBahan({ env, dep, tanggal, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log })
    const { terpilih, teks } = await bahan.pilihSesuai(lap)
    const kurang = lap.butuh.filter((k) => !terpilih[k])
    if (kurang.length) {
      const baris = []
      for (const k of lap.butuh) {
        const label = JENIS_LAPORAN.find((j) => j.kunci === k)?.label || k
        if (terpilih[k]) { baris.push(`${label}: ada, bertanggal ${labelTanggal(tanggal)}`); continue }
        const tgl = await bahan.tanggalAda(k)
        baris.push(`${label}: ` + (tgl.length ? `belum untuk ${labelTanggal(tanggal)}, yang ada bertanggal ${tgl.map((x) => (/^\d{4}-/.test(x) ? labelTanggal(x) : x)).join(', ')}` : 'belum ada'))
      }
      return balas(`Bahan ${lap.judul} ${labelTanggal(tanggal)} belum lengkap.\n` + baris.join('\n'))
    }
    // Cut-off dilewati hanya untuk hari lampau (cekSiap); hari ini tetap 12.00 / 17.00 WIB.
    const c = cekSiap(lap, terpilih, now, tanggal)
    if (!c.siap) return balas(`${lap.judul} ${labelTanggal(tanggal)} menunggu: ${c.alasan}.`)
    const { kerja, out, f, berkas } = siapkanKeluaran(lap, tanggal, teks, dasar)
    await balas(`Membuat ${lap.judul} ${labelTanggal(tanggal)}, mohon tunggu.`)
    await jalankanGenerator(lap, tanggal, f, out, kerja, dep, env)
    for (const b of berkas) if (!ada(b.p)) throw new Error('keluaran tidak ada: ' + path.basename(b.p))
    // Sengaja TIDAK menulis state, TIDAK mengunggah ke /api/wa/hasil, TIDAK mengirim ke PENERIMA: itu tugas jalur otomatis.
    await kirimBerkas(lap, tanggal, berkas, `${lap.judul} ${tanggal} (permintaan, belum dikirim ke penerima)`, ctx)
  } finally { lepas() }
}

async function kirimUlang({ laporan, tanggal }, ctx) {
  const lap = LAPORAN.find((l) => l.id === laporan), ada = ctx.ada || fs.existsSync
  const berkas = berkasDari(lap, tanggal, dasarDari(ctx))
  if (!berkas.every((b) => ada(b.p))) return ctx.balas(`Belum ada keluaran ${lap.judul} ${labelTanggal(tanggal)}. Pakai: buat ${laporan} ${tanggal}`)
  await kirimBerkas(lap, tanggal, berkas, `${lap.judul} ${tanggal} (permintaan, kirim ulang)`, ctx)
}

async function status({ tanggal }, ctx) {
  const { env, dep, balas } = ctx
  const now = ctx.now || new Date()
  const r = await dep.fetch(`${env.WORKER_URL || 'https://centurisk97.id'}/api/wa/rekap?sampai=${encodeURIComponent(tanggal)}&hari=1`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` } })
  if (!r.ok) throw new Error('rekap HTTP ' + r.status)
  const j = await r.json()
  const isi = (j.per || []).find((p) => p.tanggal === tanggal)?.isi || {}
  const wajib = (j.jenis || JENIS_LAPORAN).filter((x) => x.wajib)
  const belum = wajib.filter((x) => !isi[x.kunci])
  const state = ambilKunci(path.join(dasarDari(ctx), 'state.json')).baca()
  const hari = tanggalWib(now)
  const kirim = (id) => (state.laporan?.[`${id}:${hari}`]?.selesai ? 'sudah' : 'belum')
  await balas(`${wajib.length - belum.length} dari ${wajib.length} laporan wajib masuk untuk ${labelTanggal(tanggal)}.` +
    (belum.length ? ` Belum: ${belum.map((x) => x.label).join(', ')}.` : '') +
    `\nHari ini (${labelTanggal(hari)}) laporan harian ${kirim('harian')} dikirim ke penerima, penanganan ${kirim('penanganan')}.`)
}
