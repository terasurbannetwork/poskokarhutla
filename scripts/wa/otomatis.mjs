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
import { kenali as kenaliAsli } from '../../src/wa_jenis.js'

const DI = path.dirname(fileURLToPath(import.meta.url))
const { muatEnv, daftar, rumah, RUMAH } = createRequire(import.meta.url)('./umum.cjs')
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
  }
}

const MIME = { pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pdf: 'application/pdf' }

export async function jalankan(opsi = {}) {
  muatEnv()
  const env = opsi.env || process.env
  const now = opsi.now || new Date()
  const kering = !!opsi.kering
  const dep = opsi.dep || depBawaan(env)
  const kenali = opsi.kenali || kenaliAsli
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
    let pesan
    try {
      const r = await dep.fetch(`${env.WORKER_URL || 'https://centurisk97.id'}/api/wa/masuk?tanggal=${encodeURIComponent(tanggal)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      pesan = (await r.json()).pesan || []
    } catch (e) { await galat('sistem', `Gagal membaca bahan dari worker: ${e.message}`); return [{ id: '-', status: 'galat' }] }
    delete state.gagal.sistem
    const terpilih = pilihTerbaru(pesan, kenali)

    for (const lap of LAPORAN) {
      const kunci = `${lap.id}:${tanggal}`
      const c = cekSiap(lap, terpilih, now, tanggal)
      if (!c.siap) { log(lap.id, 'tunggu:', c.alasan); hasil.push({ id: lap.id, status: 'tunggu', alasan: c.alasan }); continue }
      try {
        const teks = {}
        for (const k of lap.butuh) teks[k] = await ambilTeks(terpilih[k], dep, env)
        const hash = hashBahan(lap, teks)
        let e = state.laporan[kunci]
        if (e && e.hash === hash && e.selesai) { hasil.push({ id: lap.id, status: 'sudah terkirim' }); continue }
        if (!e || e.hash !== hash) e = { hash, revisi: !!(e && (e.selesai || e.terkirim.length)), terkirim: [], selesai: false }

        const kerja = path.join(dasar, 'kerja', tanggal, lap.id)
        const out = path.join(dasar, 'keluaran', tanggal)
        fs.mkdirSync(kerja, { recursive: true }); fs.mkdirSync(out, { recursive: true })
        const f = {}
        for (const k of lap.butuh) { f[k] = path.join(kerja, k + '.txt'); fs.writeFileSync(f[k], teks[k]) }
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
        const dasarNama = path.join(out, lap.berkas(tanggal))
        const berkas = ['pdf', 'pptx'].map((x) => ({ x, p: `${dasarNama}.${x}` }))
        for (const b of berkas) if (!(opsi.ada || fs.existsSync)(b.p)) throw new Error('keluaran tidak ada: ' + path.basename(b.p))

        const caption = (e.revisi ? 'Revisi: ' : '') + lap.judul + ' ' + tanggal
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
