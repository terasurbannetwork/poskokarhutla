// Pintu WA Pantau Bencana BNPB (LA-20; data/kajian-bnpb/lapor-ai D1, D6, K2, K24). Mesin percakapan ada di Worker; di sini hanya
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

export function buat({ worker, mesin, pemilik, kirim, fetchFn = fetch, log = () => {}, timeoutMs = 45000, kerja, bahasaBerkas } = {}) {
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
    await kirim(ke, { text: p.cabut ? `*Izin lapor dicabut*\n${siapa} tidak lagi dilayani Pantau Bencana.` : `*Izin lapor diberikan*\n${siapa} dilayani Pantau Bencana${p.kab ? `, petugas BPBD ${p.kab}` : ''}.` }, { jid: ke })
    return p.cabut ? 'cabut' : 'izin'
  }

  // Teks balasan Worker apa adanya (teksWa); gagal Worker = pesan sopan, tanpa jejak galat.
  async function ke(jalur, body) {
    try {
      const r = await panggil('POST', jalur, body)
      const j = await r.json().catch(() => ({}))
      // 409 (sesi bukan tahap foto) dan 429 (kuota) membawa teksWa untuk pelapor: dikirim apa adanya
      const t = typeof j.teksWa === 'string' && j.teksWa ? j.teksWa : r.ok && typeof j.balasan === 'string' ? j.balasan : ''
      if (!t || !r.ok) log('[lapor] Worker', jalur, 'HTTP', r.status)
      return t || GANGGUAN
    } catch (e) { log('[lapor] Worker tak terjangkau', jalur, samar(e?.message || e)); return GANGGUAN }
  }
  /* bahasa per nomor (pemilik 20 Nov 2026: "update bot WA, dia bisa bahasa daerah juga"; KEPUTUSAN-LAPOR-AI K58, D80): ditanya sekali saat pertama
     mengetik "lapor", diganti kapan saja dengan "bahasa". Pilihan disimpan di Mac mini (bukan repo); Worker menerjemahkan pesan dan teksWa. */
  const berkasBahasa = bahasaBerkas || path.join(os.homedir(), '.lapor-wa', 'bahasa.json')
  let pilihanBahasa = {}
  try { pilihanBahasa = JSON.parse(fs.readFileSync(berkasBahasa, 'utf8')) || {} } catch {}
  const simpanBahasa = () => { try { fs.mkdirSync(path.dirname(berkasBahasa), { recursive: true, mode: 0o700 }); fs.writeFileSync(berkasBahasa, JSON.stringify(pilihanBahasa), { mode: 0o600 }) } catch (e) { log('[lapor] simpan bahasa gagal', samar(e?.message || e)) } }
  const tungguBahasa = new Map()
  let daftarBahasa = null, daftarWaktu = 0
  async function ambilDaftarBahasa() {
    if (daftarBahasa && Date.now() - daftarWaktu < 3600e3) return daftarBahasa
    try { const r = await panggil('GET', '/api/lapor/bahasa', undefined, { timeout: 15000 }); const j = await r.json().catch(() => ({})); daftarBahasa = r.ok && Array.isArray(j.bahasa) ? j.bahasa : [] } catch { daftarBahasa = [] }
    daftarWaktu = Date.now(); return daftarBahasa
  }
  /* membaca maksud dari kalimat biasa (pemilik 20 Nov 2026: "bisa baca kira-kira kita mau arahnya kemana"): nama bahasa dan sebutan sehari-harinya */
  const SEBUT_BAHASA = { id: ['indonesia', 'bahasa indonesia'], en: ['english', 'inggris', 'bahasa inggris'], jv: ['jawa', 'jowo', 'basa jawa'], su: ['sunda', 'basa sunda'],
    mad: ['madura', 'meduro'], ban: ['bali'], sas: ['sasak', 'lombok'], min: ['minang', 'minangkabau', 'padang'], bbc: ['batak toba', 'toba'], btx: ['karo', 'batak karo'],
    btm: ['mandailing', 'batak mandailing'], bts: ['simalungun', 'batak simalungun'], nia: ['nias'], ace: ['aceh'], msa: ['melayu'], ljp: ['lampung'], bjn: ['banjar'],
    nij: ['dayak', 'ngaju', 'dayak ngaju'], bug: ['bugis', 'ugi'], mak: ['makassar', 'mangkasara'], sda: ['toraja'], gor: ['gorontalo'], abs: ['ambon'], pmy: ['papua'] }
  const cariBahasa = (teks, d) => {   // kode bahasa yang disebut dalam teks, sebutan terpanjang menang ("batak toba" mengalahkan "toba")
    const t = ' ' + String(teks).toLowerCase().replace(/[^a-z\u00c0-\u024f ]+/g, ' ').replace(/\s+/g, ' ') + ' '
    let hasil = null, panjang = 0
    for (const b of d) for (const sb of [...(SEBUT_BAHASA[b.kode] || []), b.nama.toLowerCase()]) if (t.includes(' ' + sb + ' ') && sb.length > panjang) { hasil = b; panjang = sb.length }
    return hasil
  }
  // maksud ganti bahasa hanya bila kalimat menyebut kata bahasa, atau sangat pendek ("english please", "sunda aja");
  // "rumah saya di jawa barat terendam" bukan permintaan ganti bahasa
  const maksudBahasa = (t) => /\b(bahasa|basa|bhs|language|speak)\b/i.test(t) || t.trim().split(/\s+/).length <= 3
  const teksDaftarBahasa = (d) => `*Pilih bahasa / Choose language*\nBalas dengan nomornya.\n\n${d.map((b, i) => `${i + 1}. ${b.nama}`).join('\n')}`
  const bhs = (wa) => (pilihanBahasa[wa] && pilihanBahasa[wa] !== 'id' ? { bahasa: pilihanBahasa[wa] } : {})
  const pesan = (wa, o) => ke('/api/lapor/pesan', { wa, saluran: 'wa', ...bhs(wa), ...o })
  async function foto(wa, buf, waktu) {
    const jpg = await keJpeg(buf, { kerja })
    if (!jpg) return 'Foto tidak terbaca. Kirim ulang sebagai foto biasa (bukan berkas).'
    return ke('/api/lapor/foto', { wa, data: jpg.toString('base64'), waktu, ...bhs(wa) })
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
    const t = String(teks).trim()
    if (tungguBahasa.has(wa)) {   // jawaban atas daftar bahasa: nomor 1..n atau nama bahasanya
      const st = tungguBahasa.get(wa), n = Number(t); tungguBahasa.delete(wa)
      const b = Number.isInteger(n) && n >= 1 && n <= st.daftar.length ? st.daftar[n - 1] : cariBahasa(t, st.daftar)
      if (b) {
        pilihanBahasa[wa] = b.kode; simpanBahasa()
        if (st.lanjut) return balas(await pesan(wa, { teks: st.lanjut }))
        return balas(`*${b.nama}*\nPesan berikutnya dijawab dalam bahasa ini. Ketik *bahasa* untuk mengganti, atau *lapor* untuk mulai melapor.`)
      }
    }
    // kalimat biasa yang menyebut bahasa ("pakai bahasa sunda dong", "english please"): langsung diganti, laporan yang sedang diisi tidak terganggu
    if (t.length <= 80 && maksudBahasa(t)) {
      const d = await ambilDaftarBahasa(), b = d.length > 1 ? cariBahasa(t, d) : null
      if (b && !/^lapor\b/i.test(t)) { pilihanBahasa[wa] = b.kode; simpanBahasa(); return balas(`*${b.nama}*\nPesan berikutnya dijawab dalam bahasa ini. Lanjutkan saja laporannya, atau ketik *lapor* untuk mulai.`) }
    }
    if (/^(bahasa|ganti bahasa|language|basa)$/i.test(t) || (/^lapor\b/i.test(t) && !(wa in pilihanBahasa))) {
      const d = await ambilDaftarBahasa()
      if (d.length > 1) { tungguBahasa.set(wa, { daftar: d, lanjut: /^lapor\b/i.test(t) ? t : null }); return balas(teksDaftarBahasa(d)) }
    }
    return balas(await pesan(wa, { teks: t }))
  }

  // Kabar keluar. id yang sudah terkirim tetapi gagal ditandai disimpan agar tidak dikirim ulang.
  const belumTanda = new Set()
  const asal = (u) => { try { return new URL(u, base + '/').origin === new URL(base).origin } catch { return false } }
  async function unduhPdf(url) {
    if (!asal(url)) throw new Error('URL bukan origin Worker')
    const u = new URL(url, base + '/')
    const r = await fetchFn(u, { headers: head(false), redirect: 'error', signal: AbortSignal.timeout(timeoutMs) })
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
