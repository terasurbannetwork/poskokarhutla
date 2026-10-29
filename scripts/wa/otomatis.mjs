// Pengatur otomatis laporan harian: baca bahan WA dari worker, jalankan generator DETERMINISTIK
// (data/laporan-bnpb/generator/*.py, tanpa LLM), kirim PDF + PPTX lewat gateway lokal.
//   node scripts/wa/otomatis.mjs [--tanggal YYYY-MM-DD] [--kering]
// --kering = jalan penuh kecuali memanggil gateway (tidak /send-file, tidak /send; hanya log).
// Galat HANYA dikabarkan ke PEMILIK (sekali per galat yang sama), tidak pernah ke PENERIMA.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { peringatanBanjir } from './peringatan_banjir.mjs'
import * as jenis from '../../src/wa_jenis.js'

const kenaliAsli = jenis.kenali
const tanggalIsiAsli = jenis.tanggalIsi || (() => null) // belum ada = semua bahan ditolak (aman), bukan lolos

const DI = path.dirname(fileURLToPath(import.meta.url))
const { muatEnv, daftar, rumah, RUMAH } = createRequire(import.meta.url)('./umum.cjs')
const { buat: buatDrive } = createRequire(import.meta.url)('./drive.cjs')
const GENERATOR = path.resolve(DI, '../../data/laporan-bnpb/generator')
const execP = promisify(execFile)

// Aturan jam dari data/laporan-bnpb/generator/README.md: harian cut-off 12.00 WIB, penanganan 17.00 WIB.
export const LAPORAN = [
  { id: 'harian', judul: 'Laporan Kejadian Bencana Harian', butuh: ['rekap_koordalops_24', 'bmkg_pagi'], jam: 12,
    berkas: (d) => `Laporan Kejadian Bencana Harian ${ddmmyy(d)}`,
    args: (d, f, out) => ['harian.py', '--tanggal', d, '--koordalops', f.rekap_koordalops_24, '--bmkg', f.bmkg_pagi, '--jam', '12:00', '--out', out] },
  { id: 'penanganan', judul: 'Laporan Penanganan Pengendalian Karhutla', butuh: ['bmkg_pagi', 'satgas'], jam: 17,
    berkas: (d) => `Laporan Penanganan Pengendalian Karhutla ${ddmmyy(d)}`,
    args: (d, f, out) => ['penanganan.py', '--tanggal', d, '--jam', '17:00', '--bmkg', f.bmkg_pagi, '--operasi', f.satgas, '--out', out] },
]

// Padanan banjir (penanganan_banjir.py): angkanya dari situs yang tayang, tanpa bahan WA (butuh kosong). Cut-off 17.00 WIB seperti penanganan.
// Tidak diunggah ke /pelaporan (worker hanya menerima harian atau penanganan). MATI bawaan; hidupkan dengan LAPORAN_BANJIR=1 di .env setelah contoh deck diperiksa pemilik.
export const LAPORAN_BANJIR = [
  { id: 'penanganan_banjir', judul: 'Laporan Penanganan Banjir, Longsor dan Rob', butuh: [], jam: 17, unggah: false,
    berkas: (d) => `Laporan Penanganan Banjir Longsor dan Rob ${ddmmyy(d)}`,
    args: (d, f, out) => ['penanganan_banjir.py', '--tanggal', d, '--out', out] },
]

export const ddmmyy = (d) => `${d.slice(8, 10)}${d.slice(5, 7)}${d.slice(2, 4)}`
const wib = (now) => new Date(now.getTime() + 7 * 3600e3)
export const tanggalWib = (now) => wib(now).toISOString().slice(0, 10)
export const jamWib = (now) => { const w = wib(now); return w.getUTCHours() + w.getUTCMinutes() / 60 }

// Pesan terbaru per jenis (diterima terbesar; seri: id terbesar). Jenis dikenali dari isi, bukan percaya kolom jenis.
export function pilihTerbaru(pesan, kenali = kenaliAsli) {
  const hasil = {}
  for (const p of pesan || []) {
    const k = kenali(p.teks || '', p.nama_berkas || '') || null
    if (!k) continue
    const lama = hasil[k]
    const t = (x) => Number(x.diterima) || Date.parse(x.diterima) || 0
    if (!lama || t(p) > t(lama) || (t(p) === t(lama) && String(p.id) > String(lama.id))) hasil[k] = p
  }
  return hasil
}

// Semua pesan per jenis, terbaru dulu (untuk memilih yang tanggal isinya cocok).
export function semuaPerJenis(pesan, kenali = kenaliAsli) {
  const t = (x) => Number(x.diterima) || Date.parse(x.diterima) || 0
  const hasil = {}
  for (const p of pesan || []) {
    const k = kenali(p.teks || '', p.nama_berkas || '') || null
    if (k) (hasil[k] ||= []).push(p)
  }
  for (const l of Object.values(hasil)) l.sort((a, b) => t(b) - t(a) || String(b.id).localeCompare(String(a.id)))
  return hasil
}

// Siap = semua jenis wajib ada DAN (hari laporan sudah lewat ATAU jam WIB >= cut-off).
export function cekSiap(lap, terpilih, now, tanggal) {
  const kurang = lap.butuh.filter((k) => !terpilih[k])
  if (kurang.length) return { siap: false, alasan: 'bahan belum lengkap: ' + kurang.join(', ') }
  if (tanggal === tanggalWib(now) && jamWib(now) < lap.jam) return { siap: false, alasan: `belum cut-off ${lap.jam}.00 WIB` }
  return { siap: true }
}

export const hashBahan = (lap, teks) =>
  crypto.createHash('sha256').update(JSON.stringify(lap.butuh.map((k) => [k, teks[k]]))).digest('hex')

function ambilKunci(berkas) {
  const baca = () => { try { return JSON.parse(fs.readFileSync(berkas, 'utf8')) } catch { return {} } }
  return { baca, tulis: (s) => { fs.mkdirSync(path.dirname(berkas), { recursive: true, mode: 0o700 }); fs.writeFileSync(berkas, JSON.stringify(s, null, 1), { mode: 0o600 }) } }
}

function kunciProses(berkas) {
  fs.mkdirSync(path.dirname(berkas), { recursive: true, mode: 0o700 })
  try {
    if (Date.now() - fs.statSync(berkas).mtimeMs > 15 * 60e3) fs.rmSync(berkas, { force: true }) // sisa proses mati
  } catch {}
  try { fs.closeSync(fs.openSync(berkas, 'wx')) } catch { return null }
  return () => fs.rmSync(berkas, { force: true })
}

// Bagian yang menyentuh dunia luar disuntik lewat `dep` supaya uji tidak butuh jaringan, python, atau WhatsApp.
export function depBawaan(env) {
  const gateway = `http://127.0.0.1:${env.PORT || 3101}`
  const tidur = (ms) => new Promise((r) => setTimeout(r, ms))
  const pos = async (jalur, badan) => {
    for (let i = 0; i < 6; i++) { // 429 = ditahan limiter, 503 = WA belum tersambung: tunggu lalu ulang
      const r = await fetch(gateway + jalur, { method: 'POST', headers: { 'content-type': 'application/json', authorization: env.GATEWAY_TOKEN || '' }, body: JSON.stringify(badan) })
      if (r.ok) return
      if (![429, 503].includes(r.status) || i === 5) throw new Error(`gateway ${jalur} HTTP ${r.status} ${(await r.text()).slice(0, 120)}`)
      await tidur(25000)
    }
  }
  return {
    fetch: (u, o) => fetch(u, o),
    exec: (cmd, args, o) => execP(cmd, args, o),
    kirimFile: (target, p, filename, caption, mimetype) => pos('/send-file', { target, path: p, filename, caption, mimetype }),
    kirimTeks: (target, message) => pos('/send', { target, message }),
    unggahDrive: (a) => buatDrive({ env }).unggahLaporan(a), // null bila Drive belum dikonfigurasi
    unggah: async ({ tanggal, laporan, revisi, pptx, pdf }) => {
      const f = new FormData()
      f.set('tanggal', tanggal); f.set('laporan', laporan); f.set('revisi', String(revisi))
      for (const [k, p] of [['pptx', pptx], ['pdf', pdf]]) f.set(k, new Blob([fs.readFileSync(p)], { type: MIME[k] }), path.basename(p))
      const r = await fetch(`${env.WORKER_URL || 'https://centurisk97.id'}/api/wa/hasil`, { method: 'POST', headers: { authorization: `Bearer ${env.WA_MESIN || ''}` }, body: f, signal: AbortSignal.timeout(120000) })
      if (!r.ok) throw new Error('HTTP ' + r.status)
    },
  }
}

const MIME = { pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pdf: 'application/pdf' }

// Bahan 3 hari (D, D-1, D+1) dari worker; tanggal ISI bahan sendiri harus == tanggal laporan (kiriman ulang laporan lama tersimpan dengan tanggal hari ini).
// Dipakai jalankan() dan perintah WA (perintah.mjs). `semua` = pesan per jenis, terbaru dulu.
export async function ambilBahan({ env, dep, tanggal, kenali = kenaliAsli, tanggalIsi = tanggalIsiAsli, log = () => {} }) {
  const geser = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10)
  const pesanMap = new Map()
  for (const [i, tgl] of [[0, tanggal], [1, geser(tanggal, -1)], [2, geser(tanggal, 1)]]) {
    try {
      const r = await dep.fetch(`${env.WORKER_URL || 'https://centurisk97.id'}/api/wa/masuk?tanggal=${encodeURIComponent(tgl)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      for (const p of (await r.json()).pesan || []) pesanMap.set(String(p.id), p)
    } catch (e) {
      if (i === 0) throw new Error(`Gagal membaca bahan dari worker: ${e.message}`)
      log('tetangga', tgl, 'gagal dibaca:', e.message) // D-1/D+1 hanya tambahan
    }
  }
  const semua = semuaPerJenis([...pesanMap.values()], kenali)
  const teksCache = new Map()
  const teksDari = async (p) => { if (!teksCache.has(p.id)) teksCache.set(p.id, await ambilTeks(p, dep, env)); return teksCache.get(p.id) }
  const pilihSesuai = async (lap) => {
    const terpilih = {}, teks = {}
    for (const k of lap.butuh) {
      for (const p of semua[k] || []) {
        let t
        try { t = await teksDari(p) } catch (x) { log(lap.id, k, 'teks tak terbaca:', x.message); continue }
        const td = tanggalIsi(t, k)
        if (td === tanggal) { terpilih[k] = p; teks[k] = t; break }
        log(`bahan bertanggal ${td || 'tak terbaca'}, bukan ${tanggal}`, k, p.id)
      }
    }
    return { terpilih, teks }
  }
  // Tanggal isi tiap bahan yang ADA per jenis (untuk menjelaskan bahan yang salah hari).
  const tanggalAda = async (k) => {
    const hasil = []
    for (const p of semua[k] || []) { try { hasil.push(tanggalIsi(await teksDari(p), k) || 'tak terbaca') } catch { hasil.push('tak terbaca') } }
    return [...new Set(hasil)]
  }
  return { semua, pilihSesuai, tanggalAda }
}

export function siapkanKeluaran(lap, tanggal, teks, dasar) {
  const kerja = path.join(dasar, 'kerja', tanggal, lap.id)
  const out = path.join(dasar, 'keluaran', tanggal)
  fs.mkdirSync(kerja, { recursive: true }); fs.mkdirSync(out, { recursive: true })
  const f = {}
  for (const k of lap.butuh) { f[k] = path.join(kerja, k + '.txt'); fs.writeFileSync(f[k], teks[k]) }
  const dasarNama = path.join(out, lap.berkas(tanggal))
  return { kerja, out, f, berkas: ['pdf', 'pptx'].map((x) => ({ x, p: `${dasarNama}.${x}` })) }
}

export async function jalankanGenerator(lap, tanggal, f, out, kerja, dep, env = process.env) {
  try {
    // Seluruh pohon proses perlu Python >= 3.12 + Pillow (penanganan.py memanggil `python3` telanjang): venv di depan PATH.
    const pyBin = rumah(env.WA_PY_BIN) || path.join(RUMAH, 'py', 'bin')
    await dep.exec(path.join(pyBin, 'python3'), lap.args(tanggal, f, out), { cwd: GENERATOR, timeout: 10 * 60e3, maxBuffer: 20e6, env: { ...process.env, PATH: pyBin + path.delimiter + (process.env.PATH || '') } })
  } catch (x) {
    const penuh = String(x.stderr || x.message || x)
    try { fs.writeFileSync(path.join(kerja, 'galat.txt'), penuh, { mode: 0o600 }) } catch {}
    const ujung = penuh.trim().split('\n').filter(Boolean).pop() || ''
    throw new Error(`generator gagal (kode G1, rincian di ${path.join(kerja, 'galat.txt')}): ${ujung.slice(0, 200)}`)
  }
}

export { kunciProses, ambilKunci, MIME }

export async function jalankan(opsi = {}) {
  muatEnv()
  const env = opsi.env || process.env
  const now = opsi.now || new Date()
  const kering = !!opsi.kering
  const dep = opsi.dep || depBawaan(env)
  const kenali = opsi.kenali || kenaliAsli
  const tanggalIsi = opsi.tanggalIsi || tanggalIsiAsli
  const log = opsi.log || ((...a) => console.log(new Date().toISOString(), ...a))
  const dasar = opsi.rumah || RUMAH
  const tanggal = opsi.tanggal || tanggalWib(now)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('--tanggal harus YYYY-MM-DD')
  const hasil = []

  // Penjaga jam hanya untuk jalan otomatis tanpa --tanggal.
  if (!opsi.tanggal && (jamWib(now) < 6 || jamWib(now) >= 23)) return [{ id: '-', status: 'di luar jam 06.00-23.00 WIB' }]

  const lepas = kunciProses(path.join(dasar, 'otomatis.lock'))
  if (!lepas) return [{ id: '-', status: 'masih ada proses lain' }]
  const st = ambilKunci(path.join(dasar, 'state.json'))
  const state = st.baca()
  state.gagal ||= {}
  state.laporan ||= {}
  const simpan = () => { if (!kering) st.tulis(state) }
  const pemilik = daftar(env.PEMILIK)[0]
  const penerima = daftar(env.PENERIMA)

  // Satu kabar per galat yang sama; hanya ke PEMILIK; --kering tidak memanggil gateway sama sekali.
  const galat = async (kunci, pesan) => {
    log('GALAT', kunci, pesan)
    if (state.gagal[kunci] === pesan) return
    state.gagal[kunci] = pesan; simpan()
    if (kering || !pemilik) return
    try { await dep.kirimTeks(pemilik, `Bot laporan: ${kunci} gagal. ${pesan}`.slice(0, 600)) } catch (e) { log('kabar pemilik gagal', e.message) }
  }

  try {
    let bahan
    try { bahan = await ambilBahan({ env, dep, tanggal, kenali, tanggalIsi, log }) } catch (e) { await galat('sistem', e.message); return [{ id: '-', status: 'galat' }] }
    delete state.gagal.sistem
    const { pilihSesuai } = bahan

    for (const lap of [...LAPORAN, ...(env.LAPORAN_BANJIR === '1' ? LAPORAN_BANJIR : [])]) {
      const kunci = `${lap.id}:${tanggal}`
      const { terpilih, teks: teksSesuai } = await pilihSesuai(lap)
      const c = cekSiap(lap, terpilih, now, tanggal)
      if (!c.siap) { log(lap.id, 'tunggu:', c.alasan); hasil.push({ id: lap.id, status: 'tunggu', alasan: c.alasan }); continue }
      try {
        const teks = teksSesuai
        const hash = hashBahan(lap, teks)
        let e = state.laporan[kunci]
        if (e && e.hash === hash && e.selesai && (e.diunggah || kering || lap.unggah === false)) { hasil.push({ id: lap.id, status: 'sudah terkirim' }); continue }
        if (!e || e.hash !== hash) {
          // rev = nomor revisi untuk /pelaporan (0 pertama); naik hanya bila versi lama sudah keluar (terkirim atau terunggah).
          const keluar = !!(e && (e.selesai || e.terkirim.length || e.diunggah))
          e = { hash, rev: keluar ? (e.rev || 0) + 1 : (e?.rev || 0), revisi: !!(e && (e.selesai || e.terkirim.length)), terkirim: [], selesai: false, diunggah: false }
        }

        const { kerja, out, f, berkas } = siapkanKeluaran(lap, tanggal, teks, dasar)
        const ada = opsi.ada || fs.existsSync
        const sudahJadi = state.laporan[kunci]?.hash === hash && berkas.every((b) => ada(b.p)) // coba ulang kirim/unggah tanpa membangun lagi
        if (!sudahJadi) await jalankanGenerator(lap, tanggal, f, out, kerja, dep, env)
        for (const b of berkas) if (!ada(b.p)) throw new Error('keluaran tidak ada: ' + path.basename(b.p))

        // Unggah ke /pelaporan SEBELUM kirim WA; gagal tidak menahan WA, diulang pada jalan berikut (status terpisah dari terkirim).
        if (lap.unggah !== false && !e.diunggah && !kering) {
          try {
            await dep.unggah({ tanggal, laporan: lap.id, revisi: e.rev, pptx: berkas.find((b) => b.x === 'pptx').p, pdf: berkas.find((b) => b.x === 'pdf').p })
            e.diunggah = true; delete state.gagal['unggah:' + kunci]
          } catch (x) { await galat('unggah:' + kunci, `Unggah ke /pelaporan gagal, WA tetap dikirim, diulang jalan berikut: ${String(x.message).slice(0, 200)}`) }
          state.laporan[kunci] = e; simpan()
        }
        // Salin ke Google Drive sekali per versi; gagal = WA tetap terkirim tanpa link, PEMILIK dikabari lewat galat().
        if (!e.linkDrive && !kering && dep.unggahDrive) {
          try {
            e.linkDrive = (await dep.unggahDrive({ tanggal, laporan: lap.id, revisi: e.revisi, berkas: berkas.map((b) => ({ p: b.p, mime: MIME[b.x] })) })) || ''
            delete state.gagal['drive:' + kunci]
          } catch (x) { await galat('drive:' + kunci, `Unggah ke Google Drive gagal, WA tetap dikirim tanpa link: ${String(x.message).slice(0, 200)}`) }
          state.laporan[kunci] = e; simpan()
        }
        const caption = (e.revisi ? 'Revisi: ' : '') + lap.judul + ' ' + tanggal + (e.linkDrive ? '\n' + e.linkDrive : '')
        for (const t of penerima) {
          if (e.terkirim.includes(t)) continue
          for (const b of berkas) {
            if (kering) { log('[kering] akan kirim', path.basename(b.p), 'ke', t.replace(/\d(?=\d{4})/g, '*'), '|', caption); continue }
            await dep.kirimFile(t, b.p, path.basename(b.p), caption, MIME[b.x])
          }
          e.terkirim.push(t)
          state.laporan[kunci] = e; simpan()
        }
        if (!kering) { e.selesai = true; state.laporan[kunci] = e; delete state.gagal[kunci]; simpan() }
        hasil.push({ id: lap.id, status: kering ? 'kering' : 'terkirim', revisi: e.revisi })
      } catch (x) {
        await galat(kunci, x.message)
        hasil.push({ id: lap.id, status: 'galat', alasan: x.message })
      }
    }
    const pb = await peringatanBanjir({ env, dep, tanggal, state, simpan, kering, log, galat, jamWib: opsi.tanggal && tanggal !== tanggalWib(now) ? 24 : jamWib(now) })
    if (pb.status !== 'mati') hasil.push(pb)
    return hasil
  } finally { lepas() }
}

async function ambilTeks(p, dep, env) {
  if (p.teks && p.teks.trim()) return p.teks
  if (!p.ada_berkas) throw new Error(`pesan ${p.id} kosong`)
  const r = await dep.fetch(`${env.WORKER_URL || 'https://centurisk97.id'}/api/wa/berkas?id=${encodeURIComponent(p.id)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` } })
  if (!r.ok) throw new Error(`berkas ${p.id} HTTP ${r.status}`)
  return await r.text()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2)
  const i = a.indexOf('--tanggal')
  jalankan({ tanggal: i >= 0 ? a[i + 1] : undefined, kering: a.includes('--kering') })
    .then((h) => { console.log(JSON.stringify(h)); process.exit(h.some((x) => x.status === 'galat') ? 1 : 0) })
    .catch((e) => { console.error(e); process.exit(1) })
}
