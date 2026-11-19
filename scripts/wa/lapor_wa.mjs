// Pintu WA Lapor Bencana BNPB (LA-20; data/kajian-bnpb/lapor-ai D1, D6, K2, K24). Mesin percakapan ada di Worker; di sini hanya
// jembatan: salinan izin (/api/lapor/izin), perintah PEMILIK `lapor izin|cabut`, teks/lokasi/foto ke Worker, balasan `teksWa` apa adanya,
// dan tarikan kabar (balasan, status, PDF). Murni dan bisa diuji: fetch dan kirim disuntik. Nomor tidak pernah dilog utuh.
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { normalWa } from './umum.cjs'

export const GANGGUAN = 'Layanan lapor sedang gangguan, coba lagi beberapa menit lagi.'
const SEGAR_MS = 5 * 60e3
const KABAR_MS = 60e3
const samar = (s) => String(s ?? '').replace(/\d{6,}/g, (x) => x.slice(0, 4) + '***')
const NOMOR = '(\\+?\\d[\\d .-]*\\d)'
const RE_IZIN = new RegExp(`^\\s*lapor\\s+izin\\s+${NOMOR}(?:\\s+bpbd\\s+(\\S[\\s\\S]*))?$`, 'i')
const RE_CABUT = new RegExp(`^\\s*lapor\\s+cabut\\s+${NOMOR}\\s*$`, 'i')

// `lapor izin 0812... [bpbd Kab. X]` | `lapor cabut 0812...` -> {wa, peran?, kab?, cabut?} atau null. Nomor harus HP Indonesia.
export function uraiPerintah(teks) {
  const t = String(teks ?? '')
  if (t.length > 200 || /\n/.test(t)) return null
  let m = RE_IZIN.exec(t)
  if (m) {
    const wa = normalWa(m[1])
    if (!/^628\d{7,12}$/.test(wa || '')) return null
    const kab = m[2] ? m[2].replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) : ''
    if (m[2] && kab.length < 2) return null
    return kab ? { wa, peran: 'bpbd', kab } : { wa }
  }
  m = RE_CABUT.exec(t)
  if (!m) return null
  const wa = normalWa(m[1])
  return /^628\d{7,12}$/.test(wa || '') ? { wa, cabut: true } : null
}

// JPEG tanpa metadata: buang segmen APP1..APP15 (EXIF, XMP, ICC) dan komentar; APP0 dan data gambar utuh.
export function bersihJpeg(buf) {
  if (!(buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8)) return null
  const bagian = [buf.subarray(0, 2)]
  let p = 2
  while (p + 4 <= buf.length) {
    if (buf[p] !== 0xff) return null
    const tipe = buf[p + 1]
    if (tipe === 0xff) { p++; continue }
    if (tipe === 0xda) { bagian.push(buf.subarray(p)); return Buffer.concat(bagian) } // SOS: sisanya data piksel
    const n = buf.readUInt16BE(p + 2)
    if (n < 2 || p + 2 + n > buf.length) return null
    if (!((tipe >= 0xe1 && tipe <= 0xef) || tipe === 0xfe)) bagian.push(buf.subarray(p, p + 2 + n))
    p += 2 + n
  }
  return null
}

const jalan = promisify(execFile)
// Bukan JPEG (webp, png): ubah lewat sips macOS, lalu buang metadata. Gagal = null.
export async function keJpeg(buf, { kerja = os.tmpdir(), perintah = 'sips' } = {}) {
  const langsung = bersihJpeg(buf)
  if (langsung) return langsung
  const dir = fs.mkdtempSync(path.join(kerja, 'lapor-foto-'))
  try {
    const masuk = path.join(dir, 'masuk'), keluar = path.join(dir, 'keluar.jpg')
    fs.writeFileSync(masuk, buf, { mode: 0o600 })
    await jalan(perintah, ['-s', 'format', 'jpeg', masuk, '--out', keluar], { timeout: 30000 })
    return bersihJpeg(fs.readFileSync(keluar))
  } catch { return null } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

export function buat({ worker, mesin, pemilik, kirim, fetchFn = fetch, log = () => {}, timeoutMs = 45000, kerja } = {}) {
  const base = String(worker || '').replace(/\/$/, '')
  const pem = normalWa(pemilik)
  let izin = new Set()
  const head = (json) => ({ authorization: `Bearer ${mesin || ''}`, ...(json ? { 'content-type': 'application/json' } : {}) })
  const panggil = (metode, jalur, body, ekstra = {}) => fetchFn(base + jalur, { method: metode, headers: { ...head(body !== undefined && !ekstra.biner), ...(ekstra.header || {}) }, ...(body !== undefined ? { body: ekstra.biner ? body : JSON.stringify(body) } : {}), signal: AbortSignal.timeout(ekstra.timeout || timeoutMs) })

  const hidup = !!(base && mesin)
  const berizin = (nomor) => izin.has(normalWa(nomor))
  // K2: hanya pesan PRIBADI dari nomor berizin ke mesin Lapor; grup dan nomor lain tetap jalur lama.
  const arah = (nomor, pribadi) => (pribadi && !!nomor && berizin(nomor) ? 'lapor' : 'lama')

  async function segarkan() {
    if (!hidup) return { ok: false, alasan: 'mati' }
    try {
      const r = await panggil('GET', '/api/lapor/izin', undefined, { timeout: 20000 })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !Array.isArray(j.wa)) { log('[lapor] segarkan izin gagal HTTP', r.status); return { ok: false, alasan: 'http ' + r.status } }
      izin = new Set(j.wa.map(normalWa).filter(Boolean))
      return { ok: true, n: izin.size }
    } catch (e) { log('[lapor] segarkan izin gagal', samar(e?.message || e)); return { ok: false, alasan: 'jaringan' } }
  }

  // Hanya PEMILIK, hanya satu baris. Sinkron supaya gateway tahu pesan ini dicegat.
  const cocokPemilik = (dari, teks) => (hidup && pem && normalWa(dari) === pem ? uraiPerintah(teks) : null)

  async function putuskan(p) {
    const ke = pem + '@s.whatsapp.net'
    let status = 0
    try { status = (await panggil('POST', '/api/lapor/izin', p, { timeout: 20000 })).status } catch {}
    if (status !== 200) { await kirim(ke, { text: `*Gagal disimpan*\nlapor ${p.cabut ? 'cabut' : 'izin'} ${samar(p.wa)} belum tersimpan (HTTP ${status || 'jaringan'}). Ulangi sebentar lagi.` }, { jid: ke }); return 'gagal' }
    await segarkan()
    const siapa = p.wa.slice(0, 4) + '****' + p.wa.slice(-4)
    await kirim(ke, { text: p.cabut ? `*Izin lapor dicabut*\n${siapa} tidak lagi dilayani Lapor Bencana.` : `*Izin lapor diberikan*\n${siapa} dilayani Lapor Bencana${p.kab ? `, petugas BPBD ${p.kab}` : ''}.` }, { jid: ke })
    return p.cabut ? 'cabut' : 'izin'
  }

  // Teks balasan Worker apa adanya (teksWa); gagal Worker = pesan sopan, tanpa jejak galat.
  async function ke(jalur, body) {
    try {
      const r = await panggil('POST', jalur, body)
      const j = await r.json().catch(() => ({}))
      const t = r.ok ? (typeof j.teksWa === 'string' && j.teksWa ? j.teksWa : typeof j.balasan === 'string' ? j.balasan : '') : ''
      if (!t) log('[lapor] Worker', jalur, 'HTTP', r.status)
      return t || GANGGUAN
    } catch (e) { log('[lapor] Worker tak terjangkau', jalur, samar(e?.message || e)); return GANGGUAN }
  }
  const pesan = (wa, o) => ke('/api/lapor/pesan', { wa, saluran: 'wa', ...o })
  async function foto(wa, buf, waktu) {
    const jpg = await keJpeg(buf, { kerja })
    if (!jpg) return 'Foto tidak terbaca. Kirim ulang sebagai foto biasa (bukan berkas).'
    return ke('/api/lapor/foto', { wa, data: jpg.toString('base64'), waktu })
  }

  // c = isi pesan ternormalkan Baileys. unduh() -> Buffer foto. Balasan dikirim lewat kirim(wa, {text}, {jid, balasan:true, masuk}).
  async function tangani({ wa, jid, c = {}, waktu, unduh, masuk }) {
    const opsi = { jid, balasan: true, masuk }
    const balas = (text) => kirim(wa, { text }, opsi)
    const lok = c.locationMessage || c.liveLocationMessage
    if (lok && Number.isFinite(Number(lok.degreesLatitude)) && Number.isFinite(Number(lok.degreesLongitude))) {
      return balas(await pesan(wa, { lokasi: { lat: Number(lok.degreesLatitude), lon: Number(lok.degreesLongitude), sumber: 'wa' } }))
    }
    if (c.imageMessage) {
      let buf = null
      try { buf = await unduh() } catch (e) { log('[lapor] unduh foto gagal', samar(e?.message || e)) }
      await balas(buf ? await foto(wa, buf, waktu) : 'Foto belum bisa diambil. Kirim ulang fotonya.')
      const ket = String(c.imageMessage.caption || '').trim()
      if (ket) await balas(await pesan(wa, { teks: ket }))
      return
    }
    const teks = c.conversation || c.extendedTextMessage?.text || ''
    if (!String(teks).trim()) return // stiker, suara, video, dokumen: tidak dilayani
    return balas(await pesan(wa, { teks: String(teks) }))
  }

  // Kabar keluar. id yang sudah terkirim tetapi gagal ditandai disimpan agar tidak dikirim ulang.
  const belumTanda = new Set()
  const asal = (u) => { try { return new URL(u, base + '/').origin === new URL(base).origin } catch { return false } }
  async function unduhPdf(url) {
    const u = new URL(url, base + '/')
    const r = await fetchFn(u, { headers: asal(url) ? head(false) : {}, signal: AbortSignal.timeout(timeoutMs) })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return Buffer.from(await r.arrayBuffer())
  }
  async function tandai(id) {
    try { const r = await panggil('POST', `/api/lapor/kabar/${encodeURIComponent(id)}/terkirim`, {}, { timeout: 20000 }); if (r.ok) belumTanda.delete(id); return r.ok } catch { return false }
  }
  let sibuk = false
  async function kabar() {
    if (!hidup || sibuk) return { lewat: true }
    sibuk = true
    let n = 0
    try {
      for (const id of [...belumTanda]) await tandai(id)
      let j
      try { const r = await panggil('GET', '/api/lapor/kabar', undefined, { timeout: 20000 }); if (!r.ok) return { n }; j = await r.json() } catch { return { n } }
      for (const k of Array.isArray(j.kabar) ? j.kabar : []) {
        if (!k || k.id == null || !k.wa || belumTanda.has(k.id)) continue
        let isi
        if (k.jenis === 'pdf') {
          if (!k.url) continue
          try { isi = { document: await unduhPdf(k.url), fileName: `Laporan ${String(k.nomor || '').replace(/[^\w.-]/g, '')}.pdf`, mimetype: 'application/pdf', caption: String(k.teks || '') } } catch (e) { log('[lapor] unduh pdf gagal', samar(e?.message || e)); continue }
        } else isi = { text: String(k.teks || '') }
        if (!isi.text && !isi.document) continue
        const x = await kirim(k.wa, isi, { jid: null, balasan: false })
        if (x && x.tunda) break // limiter atau WA belum siap: ulang putaran berikut
        if (!(x && x.ok)) { log('[lapor] kabar gagal kirim', samar(k.wa), x && x.galat); continue }
        belumTanda.add(k.id); n++
        await tandai(k.id)
      }
      return { n }
    } finally { sibuk = false }
  }

  const timer = []
  function mulai() {
    if (!hidup) { log('[lapor] mati: WORKER_URL atau WA_MESIN kosong'); return }
    segarkan()
    timer.push(setInterval(segarkan, SEGAR_MS), setInterval(() => kabar().catch(() => {}), KABAR_MS))
    timer.forEach((t) => t.unref?.())
  }
  const henti = () => { timer.forEach(clearInterval); timer.length = 0 }

  return { hidup, berizin, arah, segarkan, cocokPemilik, putuskan, tangani, pesan, foto, kabar, mulai, henti, ukuran: () => izin.size }
}
