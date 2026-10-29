// Sambungan Google Drive (akun pribadi pemilik, OAuth refresh token) untuk bot WA. Tanpa paket googleapis:
// fetch bawaan Node ke Drive REST v3. Mati diam-diam bila DRIVE_CLIENT_ID/SECRET/ROOT atau token belum ada.
//   1. salin()         bahan WA -> antrean lokal -> <root>/Bahan WA/YYYY-MM-DD/
//   2. unggahLaporan() PDF+PPTX -> <root>/Laporan/YYYY-MM-DD/, mengembalikan link folder
//   3. tick()          kuras antrean + ambil berkas baru di <root>/Masuk/ -> outbox yang sama dengan pesan WA
//   4. perintahCari()  balasan untuk pesan "cari <kata>", terbatas pada pohon folder root
// Diuji tests/wa/drive.test.mjs dengan fetch palsu (opsi.fetch, opsi.rumah).
const fs = require('fs')
const path = require('path')
const { RUMAH } = require('./umum.cjs')
const { mimeBoleh } = require('./aman.cjs')

const API = 'https://www.googleapis.com/drive/v3/files'
const UNGGAH = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER = 'application/vnd.google-apps.folder'
const EKSPOR = {
  'application/vnd.google-apps.document': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  'application/vnd.google-apps.spreadsheet': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
  'application/vnd.google-apps.presentation': ['application/pdf', '.pdf'], // Slides diekspor PDF (PPTX tak diizinkan aman.cjs)
}
const BATAS_BERKAS = 20 * 1024 * 1024
const BATAS_ANTRE = 500 * 1024 * 1024
const USIA_SAPU = 14 * 86400e3
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const alnum = (s) => String(s).replace(/[^A-Za-z0-9]/g, '')
const bersih = (s) => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 120)
const wib = (ms) => new Date(ms + 7 * 3600e3).toISOString()
const permanen = (e) => e && e.status >= 400 && e.status < 500 && ![401, 408, 429].includes(e.status) && !e.token

function buat(opsi = {}) {
  const env = opsi.env || process.env
  const f = opsi.fetch || ((u, o) => fetch(u, o))
  const dasar = opsi.rumah || RUMAH
  const log = opsi.log || ((...a) => console.log(new Date().toISOString(), '[drive]', ...a))
  const kabar = opsi.kabar || (async () => {})
  const sekarang = opsi.now || (() => Date.now())
  const ANTRE = path.join(dasar, 'drive-antre')
  const RUSAK = path.join(dasar, 'drive-rusak')
  const DIPROSES = path.join(dasar, 'drive-diproses.json')
  const ROOT = env.DRIVE_ROOT || ''

  let refresh = null
  try { refresh = JSON.parse(fs.readFileSync(path.join(dasar, 'drive.json'), 'utf8')).refresh_token || null } catch {}
  // ROOT 'root' = seluruh My Drive: ditolak supaya "cari" tidak pernah menjangkau di luar folder bot.
  const aktif = !!(env.DRIVE_CLIENT_ID && env.DRIVE_CLIENT_SECRET && ROOT && ROOT !== 'root' && refresh)
  let sudahLog = false
  const hidup = () => { if (!aktif && !sudahLog) { sudahLog = true; log('nonaktif: DRIVE_CLIENT_ID/DRIVE_CLIENT_SECRET/DRIVE_ROOT atau ~/.wa-bot/drive.json belum ada') } return aktif }

  let tok = null, tokExp = 0
  async function token() {
    if (tok && sekarang() < tokExp - 60e3) return tok
    const r = await f('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.DRIVE_CLIENT_ID, client_secret: env.DRIVE_CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' }).toString(),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.access_token) throw Object.assign(new Error('token Drive gagal HTTP ' + r.status), { status: r.status, token: true })
    tok = j.access_token; tokExp = sekarang() + (Number(j.expires_in) || 3600) * 1000
    return tok
  }

  // Permintaan berotorisasi; 401 sekali -> token disegarkan lalu ulang.
  async function req(url, o = {}, ulang = true) {
    const r = await f(url, { ...o, headers: { ...(o.headers || {}), authorization: 'Bearer ' + await token() } })
    if (r.status === 401 && ulang) { tok = null; return req(url, o, false) }
    if (!r.ok) throw Object.assign(new Error('Drive HTTP ' + r.status), { status: r.status })
    return r
  }
  const json = async (url, o) => (await req(url, o)).json()
  const daftarFile = async (q, fields = 'id,name,mimeType,size,modifiedTime,webViewLink', n = 100) => {
    const u = `${API}?` + new URLSearchParams({ q, fields: `files(${fields})`, pageSize: String(n), orderBy: 'modifiedTime desc' })
    return (await json(u)).files || []
  }

  const idFolder = new Map()
  async function pastikanFolder(jalur) {
    let induk = ROOT
    const bagian = Array.isArray(jalur) ? jalur : String(jalur).split('/').filter(Boolean)
    for (const nama of bagian) {
      const kunci = induk + '/' + nama
      if (!idFolder.has(kunci)) {
        const ada = await daftarFile(`name = '${esc(nama)}' and '${esc(induk)}' in parents and mimeType = '${FOLDER}' and trashed = false`, 'id', 1)
        let id = ada[0] && ada[0].id
        if (!id) id = (await json(API + '?fields=id', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: nama, mimeType: FOLDER, parents: [induk] }) })).id
        idFolder.set(kunci, id)
      }
      induk = idFolder.get(kunci)
    }
    return induk
  }

  // Resumable: permintaan 1 membuka sesi (Location), permintaan 2 mengirim isi. Aman untuk PPTX > 5 MB.
  async function unggah(folderId, nama, isi, mime) {
    const buf = Buffer.isBuffer(isi) ? isi : fs.readFileSync(isi)
    const tipe = mime || 'application/octet-stream'
    const buka = await req(`${UNGGAH}?uploadType=resumable&fields=id,webViewLink`, {
      method: 'POST', headers: { 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': tipe, 'x-upload-content-length': String(buf.length) },
      body: JSON.stringify({ name: nama, parents: [folderId] }),
    })
    const lokasi = buka.headers.get('location')
    if (!lokasi) throw new Error('Drive tidak memberi alamat unggah')
    return (await req(lokasi, { method: 'PUT', headers: { 'content-type': tipe }, body: buf })).json()
  }

  // ── Alur 2: laporan ────────────────────────────────────────────────────
  async function unggahLaporan({ tanggal, revisi, berkas }) {
    if (!hidup()) return null
    const id = await pastikanFolder(['Laporan', tanggal])
    for (const b of berkas) await unggah(id, (revisi ? 'Revisi ' : '') + path.basename(b.p), b.p, b.mime)
    return (await json(`${API}/${encodeURIComponent(id)}?fields=webViewLink`)).webViewLink || null
  }

  // ── Alur 1: bahan WA -> antrean -> Drive ───────────────────────────────
  const ukuranAntre = () => { let n = 0; try { for (const x of fs.readdirSync(ANTRE)) n += fs.statSync(path.join(ANTRE, x)).size } catch {} return n }
  let kabarPenuh = false
  function salin(m, buf) {
    try {
      if (!hidup()) return
      if (ukuranAntre() > BATAS_ANTRE) { if (!kabarPenuh) { kabarPenuh = true; kabar('Antrean salinan Drive lebih dari 500 MB, bahan baru tidak disalin.').catch(() => {}) } return }
      kabarPenuh = false
      fs.mkdirSync(ANTRE, { recursive: true, mode: 0o700 }); fs.chmodSync(ANTRE, 0o700)
      const w = wib(Number(m.waktu) || sekarang())
      const hhmm = w.slice(11, 13) + w.slice(14, 16)
      const pengirim = bersih(m.nama) || String(m.dari)
      const folder = ['Bahan WA', w.slice(0, 10)]
      const taruh = (nama, mime, isi) => {
        const id = `${sekarang()}-${alnum(m.id || Math.random().toString(36).slice(2))}-${fs.readdirSync(ANTRE).length}`
        if (isi) fs.writeFileSync(path.join(ANTRE, id + '.bin'), isi, { mode: 0o600 })
        fs.writeFileSync(path.join(ANTRE, id + '.json'), JSON.stringify({ id, folder, nama, mime, bin: !!isi }), { mode: 0o600 })
      }
      if (m.teks && m.teks.trim()) taruh(`${hhmm}-${pengirim}.txt`, 'text/plain', Buffer.from(m.teks))
      if (buf && m.berkas) taruh(`${hhmm}-${bersih(m.berkas.nama) || 'berkas'}`, m.berkas.tipe, buf)
      kuras().catch(() => {})
    } catch (e) { log('salin gagal', e.message) }
  }

  let sedangKuras = false
  async function kuras() {
    if (!hidup() || sedangKuras) return
    sedangKuras = true
    try {
      let daftar = []
      try { daftar = fs.readdirSync(ANTRE).filter((x) => x.endsWith('.json')).sort() } catch { return }
      for (const nama of daftar) {
        const jalur = path.join(ANTRE, nama)
        let e
        try { e = JSON.parse(fs.readFileSync(jalur, 'utf8')) } catch { continue }
        try {
          const id = await pastikanFolder(e.folder)
          await unggah(id, e.nama, e.bin ? path.join(ANTRE, e.id + '.bin') : Buffer.from(''), e.mime)
          fs.rmSync(jalur, { force: true }); fs.rmSync(path.join(ANTRE, e.id + '.bin'), { force: true })
        } catch (x) {
          if (permanen(x)) {
            fs.mkdirSync(RUSAK, { recursive: true, mode: 0o700 })
            for (const y of [nama, e.id + '.bin']) { try { fs.renameSync(path.join(ANTRE, y), path.join(RUSAK, y)) } catch {} }
            await kabar(`Salinan ${e.nama} ke Google Drive ditolak (HTTP ${x.status}), disimpan di ${RUSAK}.`)
          } else { log('kuras ditunda', x.message); break } // jaringan/token: coba lagi nanti
        }
      }
    } finally { sedangKuras = false }
  }

  // ── Alur 3: Drive/Masuk -> outbox ──────────────────────────────────────
  const baca = () => { try { return JSON.parse(fs.readFileSync(DIPROSES, 'utf8')) } catch { return {} } }
  async function unduh(file) {
    const ex = EKSPOR[file.mimeType]
    if (file.mimeType.startsWith('application/vnd.google-apps.') && !ex) return null
    if (!ex && !(Number(file.size) <= BATAS_BERKAS)) return null   // ukuran tak diketahui = tolak, jangan muat ke memori
    const url = ex ? `${API}/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(ex[0])}` : `${API}/${encodeURIComponent(file.id)}?alt=media`
    const buf = Buffer.from(await (await req(url)).arrayBuffer())
    if (buf.length > BATAS_BERKAS) return null
    return { buf, tipe: ex ? ex[0] : file.mimeType, nama: ex && !file.name.toLowerCase().endsWith(ex[1]) ? file.name + ex[1] : file.name }
  }
  const pindahKeSudah = async (id, masuk, sudah) => { await req(`${API}/${encodeURIComponent(id)}?addParents=${encodeURIComponent(sudah)}&removeParents=${encodeURIComponent(masuk)}&fields=id`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' }) }

  let sedangMasuk = false
  // masukkan({id, nama, tipe, buf, waktu}) menulis ke outbox gateway; id turunan id Drive supaya penulisan ulang idempoten.
  async function periksaMasuk(masukkan) {
    if (!hidup() || sedangMasuk) return
    sedangMasuk = true
    try {
      const masuk = await pastikanFolder(['Masuk'])
      const sudah = await pastikanFolder(['Masuk', 'Sudah'])
      const proses = baca()
      const simpanProses = () => {
        for (const k of Object.keys(proses)) if (sekarang() - proses[k] > 90 * 86400e3) delete proses[k]
        fs.writeFileSync(DIPROSES, JSON.stringify(proses), { mode: 0o600 })
      }
      for (const file of await daftarFile(`'${esc(masuk)}' in parents and mimeType != '${FOLDER}' and trashed = false`)) {
        if (!proses[file.id]) {
          const d = await unduh(file)
          if (!d || !mimeBoleh(d.tipe)) {
            await kabar(`Berkas Drive "${file.name}" dilewati: jenisnya tidak diizinkan atau lebih dari 20 MB.`)
          } else {
            await masukkan({ id: `${Date.parse(file.modifiedTime) || sekarang()}-drv${alnum(file.id)}`, nama: d.nama, tipe: d.tipe, buf: d.buf, waktu: Date.parse(file.modifiedTime) || sekarang() })
          }
          proses[file.id] = sekarang(); simpanProses() // dicatat SEBELUM pindah: restart tak memasukkan ulang
        }
        // Gagal pindah (mis. berkas milik orang lain) tidak boleh menahan berkas berikutnya; sudah tercatat di DIPROSES.
        try { await pindahKeSudah(file.id, masuk, sudah) } catch (e) { log('pindah ke Sudah gagal', file.name, e.message) }
      }
    } finally { sedangMasuk = false }
  }

  async function tick(masukkan) {
    if (!hidup()) return
    try { await kuras(); await periksaMasuk(masukkan) } catch (e) { log('tick gagal', e.message) }
  }

  // ── Alur 4: cari ───────────────────────────────────────────────────────
  let pohon = null, pohonExp = 0
  async function idPohon() {
    if (pohon && sekarang() < pohonExp) return pohon
    const semua = [ROOT]
    let tingkat = [ROOT]
    while (tingkat.length && semua.length < 2000) {
      const baru = []
      for (let i = 0; i < tingkat.length; i += 30) {
        const q = `(${tingkat.slice(i, i + 30).map((x) => `'${esc(x)}' in parents`).join(' or ')}) and mimeType = '${FOLDER}' and trashed = false`
        for (const x of await daftarFile(q, 'id', 1000)) baru.push(x.id)
      }
      semua.push(...baru); tingkat = baru
    }
    pohon = semua; pohonExp = sekarang() + 10 * 60e3
    return pohon
  }
  async function cari(kata) {
    if (!hidup()) return []
    const k = esc(kata)
    const hasil = []
    const id = await idPohon()
    for (let i = 0; i < id.length; i += 30) {
      const q = `(${id.slice(i, i + 30).map((x) => `'${esc(x)}' in parents`).join(' or ')}) and (name contains '${k}' or fullText contains '${k}') and trashed = false`
      hasil.push(...await daftarFile(q, 'id,name,modifiedTime,webViewLink', 5))
    }
    return hasil.sort((a, b) => String(b.modifiedTime).localeCompare(String(a.modifiedTime))).slice(0, 5)
  }
  // Mengembalikan teks balasan, atau null bila pesan bukan perintah "cari ".
  async function perintahCari(teks) {
    const m = /^cari\s+([\s\S]*)$/i.exec(String(teks || ''))
    if (!m) return null
    if (!hidup()) return 'Pencarian Drive belum dikonfigurasi.'
    const kata = m[1].trim().slice(0, 100)
    if (!kata) return 'Tulis kata kunci setelah "cari".'
    try {
      const h = await cari(kata)
      if (!h.length) return 'Tidak ada berkas yang cocok'
      return h.map((x, i) => `${i + 1}. ${x.name}\n${String(x.modifiedTime).slice(0, 10)}\n${x.webViewLink}`).join('\n\n')
    } catch (e) { log('cari gagal', e.message); return 'Pencarian Drive gagal, coba lagi nanti.' }
  }

  function sapu() {
    for (const d of [ANTRE, RUSAK]) {
      let isi = []
      try { isi = fs.readdirSync(d) } catch { continue }
      for (const x of isi) { try { if (sekarang() - fs.statSync(path.join(d, x)).mtimeMs > USIA_SAPU) fs.rmSync(path.join(d, x), { force: true }) } catch {} }
    }
  }

  return { aktif, token, pastikanFolder, unggah, unggahLaporan, salin, kuras, periksaMasuk, tick, cari, perintahCari, sapu }
}

module.exports = { buat }
