// Pemeriksaan mesin tiap draf bot laporan sebelum dikirim (K9, ALGORITMA A7, Q11).
// periksa({pptx, pdf, jenis, tanggal, angka, env, dep}) -> {peringatan: string[], gagal: string[], ms}
// Tiga pemeriksaan: gerbang format slide (aturan_slide.py), gerbang bahasa (bahasa.py skill ppt-konsultan),
// dan banding 7 hari. Tidak pernah menahan draf dan tidak pernah melempar: hasilnya hanya daftar kalimat.
// Gerbang dijalankan lewat execFile dengan argumen larik (tanpa shell), batas 20 detik per gerbang.
// Riwayat banding: dep.riwayat(jenis, tanggal) (versi final proyek) lebih dulu. Cadangan public/data/laphar_riwayat.json
// (hanya harian) cuma memuat jumlah kejadian (n, per jenis): angka `kejadian`, `jumlah_kejadian`, `kejadian_<jenis>`
// dibandingkan; medan isian seperti meninggal tidak punya riwayat di sana, jadi banding 7 hari diam sampai
// versi final proyek tersedia lewat dep.riwayat.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const DI = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(DI, '../..')
export const BATAS_MS = 20e3
const MAKS_BARIS = 8

// Gerbang bahasa tidak punya CLI untuk PPTX: teks tiap slide dibaca di sini lalu diberikan ke bahasa.periksa_bahasa.
// Jalur folder skrip dan berkas lewat argv, tidak disisipkan ke kode.
const PY_BAHASA = [
  'import re, sys, zipfile',
  'from xml.etree import ElementTree as ET',
  'sys.path.insert(0, sys.argv[1])',
  'import bahasa',
  "A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'",
  'z = zipfile.ZipFile(sys.argv[2])',
  "sl = sorted((n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\\d+\\.xml', n)), key=lambda n: int(re.findall(r'\\d+', n)[0]))",
  'hasil = []',
  'for i, s in enumerate(sl, 1):',
  '    r = ET.fromstring(z.read(s))',
  "    t = '\\n'.join(''.join(x.text or '' for x in p.iter(A + 't')) for p in r.iter(A + 'p'))",
  "    hasil += ['slide %d: %s' % (i, h) for h in bahasa.periksa_bahasa(t)]",
  "print('\\n'.join(hasil) or 'bahasa lolos')",
  'sys.exit(1 if hasil else 0)',
].join('\n')

const execBawaan = (bin, args, opsi) => new Promise((res, rej) => {
  execFile(bin, args, opsi, (err, stdout, stderr) => {
    if (err) { err.stdout = stdout; err.stderr = stderr; rej(err) } else res({ stdout, stderr })
  })
})

const depBawaan = {
  exec: execBawaan,
  fetch: (...a) => globalThis.fetch(...a),
  bacaJson: (p) => JSON.parse(fs.readFileSync(p, 'utf8')),
  ada: (p) => fs.existsSync(p),
  now: () => Date.now(),
}

const rumahJalur = (p) => (p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p)

// Python untuk gerbang: BL_PY bila disetel, lalu venv bot (WA_PY_BIN), lalu `py -3.14` di Windows atau python3.
export function pilihPython(env = {}, ada = fs.existsSync, platform = process.platform) {
  if (env.BL_PY) return { bin: env.BL_PY, awal: [] }
  const venv = rumahJalur(env.WA_PY_BIN) || path.join(os.homedir(), '.wa-bot', 'py', 'bin')
  const dalam = path.join(venv, 'python3')
  if (ada(dalam)) return { bin: dalam, awal: [] }
  return platform === 'win32' ? { bin: 'py', awal: ['-3.14'] } : { bin: 'python3', awal: [] }
}

export function jalurGerbang(env = {}) {
  const skill = rumahJalur(env.DECK_BNPB) || path.join(os.homedir(), '.claude', 'skills', 'ppt-konsultan', 'bnpb')
  return {
    aturan: rumahJalur(env.BL_ATURAN_SLIDE) || path.join(skill, 'scripts', 'aturan_slide.py'),
    bahasa: rumahJalur(env.BL_BAHASA) || path.join(path.dirname(skill), 'scripts', 'bahasa.py'),
  }
}

const bersih = (s) => String(s).replace(/[·—–]/g, ',').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()

const baris = (t) => String(t || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)

// Satu gerbang: {lolos} | {gagal: [...]} | {peringatan: '...'}. Keluar 1 dengan keluaran baris = pelanggaran;
// berkas atau python tidak ada, batas waktu, atau galat Python = peringatan.
async function jalankanGerbang(nama, { bin, args, skrip, dep, env }) {
  if (!dep.ada(skrip)) return { peringatan: `pemeriksaan ${nama} tidak tersedia (berkas gerbang tidak ditemukan)` }
  try {
    await dep.exec(bin, args, { timeout: BATAS_MS, windowsHide: true, maxBuffer: 4e6, cwd: REPO, env: { ...process.env, ...env, PYTHONUTF8: '1' } })
    return { lolos: true }
  } catch (e) {
    if (e && e.code === 'ENOENT') return { peringatan: `pemeriksaan ${nama} tidak tersedia (python tidak ditemukan)` }
    if (e && (e.killed || e.signal === 'SIGTERM' || e.code === 'ETIMEDOUT')) return { peringatan: `pemeriksaan ${nama} berhenti, lewat ${BATAS_MS / 1000} detik` }
    const keluar = baris(e && e.stdout)
    const galat = baris(e && e.stderr)
    if (e && e.code === 1 && keluar.length && !galat.some((x) => /Traceback|Error\b/.test(x))) {
      const unik = [...new Set(keluar)].map(bersih)
      const lebih = unik.length - MAKS_BARIS
      return { gagal: unik.slice(0, MAKS_BARIS).map((x) => `${nama}: ${x}`).concat(lebih > 0 ? [`${nama}: ${lebih} temuan lain`] : []) }
    }
    const sebab = galat.at(-1) || keluar.at(-1) || (e && e.message) || 'tanpa keterangan'
    if (/ModuleNotFoundError|No module named/.test(sebab)) return { peringatan: `pemeriksaan ${nama} tidak tersedia (${bersih(sebab).slice(0, 120)})` }
    return { peringatan: `pemeriksaan ${nama} galat: ${bersih(sebab).slice(0, 160)}` }
  }
}

// ---------- Banding 7 hari (A7, Q11) ----------

// Angka dari draf bisa angka JS atau teks gaya Indonesia ("1.234", "12,5", "1.234 jiwa").
export function keAngka(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const m = v.trim().match(/^-?[\d.]+(,\d+)?/)
  if (!m || !/\d/.test(m[0])) return null
  let s = m[0]
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) || s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function median(xs) {
  const a = [...xs].sort((x, y) => x - y)
  const t = Math.floor(a.length / 2)
  return a.length % 2 ? a[t] : (a[t - 1] + a[t]) / 2
}

const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })

const hariSebelum = (tanggal, k) => {
  const d = new Date(tanggal + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - k)
  return d.toISOString().slice(0, 10)
}

// Riwayat [{tanggal, angka}] -> hanya 7 hari kalender sebelum `tanggal`.
export function jendela7(riwayat, tanggal) {
  const awal = hariSebelum(tanggal, 7)
  return (riwayat || []).filter((r) => r && r.tanggal >= awal && r.tanggal < tanggal).sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)).slice(-7)
}

// Aturan A7: nilai > 3 x median atau < median / 3 (median > 0, nilai bukan nol); nol hanya bila 7 pembanding semua > 0; kurang dari 3 pembanding: diam.
export function banding7(angka, riwayat, tanggal) {
  const hari = jendela7(riwayat, tanggal)
  const keluar = []
  for (const [nama, mentah] of Object.entries(angka || {})) {
    const nilai = keAngka(mentah)
    if (nilai === null) continue
    const banding = hari.map((r) => keAngka(r.angka ? r.angka[nama] : undefined)).filter((x) => x !== null)
    if (banding.length < 3) continue
    const med = median(banding)
    if (nilai === 0) {
      // Aturan nol hanya bila ketujuh hari sebelumnya ada nilainya dan semuanya > 0 (A7, Q11).
      if (banding.length === 7 && banding.every((x) => x > 0)) keluar.push(`Angka ${nama} hari ini 0, padahal 7 hari sebelumnya tidak pernah nol (median ${fmt(med)}). Periksa lagi.`)
    } else if (med > 0 && nilai > 3 * med) {
      keluar.push(`Angka ${nama} hari ini ${fmt(nilai)}, lebih dari 3 kali median 7 hari terakhir (${fmt(med)}). Periksa lagi.`)
    } else if (med > 0 && nilai < med / 3) {
      keluar.push(`Angka ${nama} hari ini ${fmt(nilai)}, kurang dari sepertiga median 7 hari terakhir (${fmt(med)}). Periksa lagi.`)
    }
  }
  return keluar
}

// laphar_riwayat.json: harian[YYYY-MM-DD] = {n, jenis: {banjir, ...}} -> angka datar dengan beberapa nama lazim.
export function dariLapharRiwayat(json) {
  const h = (json && json.harian) || {}
  return Object.entries(h).map(([tanggal, v]) => {
    const angka = {}
    if (typeof v.n === 'number') for (const k of ['n', 'kejadian', 'jumlah_kejadian', 'total_kejadian']) angka[k] = v.n
    for (const [j, x] of Object.entries(v.jenis || {})) if (typeof x === 'number') { angka[`jenis.${j}`] = x; angka[`kejadian_${j}`] = x }
    return { tanggal, angka }
  })
}

async function ambilRiwayat({ jenis, tanggal, dep }) {
  if (typeof dep.riwayat === 'function') {
    try {
      const r = await dep.riwayat(jenis, tanggal)
      if (Array.isArray(r) && r.length) return { riwayat: r }
    } catch (e) {
      // jatuh ke berkas riwayat harian
    }
  }
  if (jenis === 'harian') {
    try {
      return { riwayat: dariLapharRiwayat(await dep.bacaJson(path.join(REPO, 'public', 'data', 'laphar_riwayat.json'))) }
    } catch (e) {
      return { riwayat: [] }
    }
  }
  return { riwayat: [] }
}

// ---------- Pintu ----------

export async function periksa({ pptx, pdf, jenis, tanggal, angka, env = {}, dep = {} } = {}) {
  const d = { ...depBawaan, ...dep }
  const mulai = d.now()
  const peringatan = []
  const gagal = []
  try {
    const py = pilihPython(env, d.ada)
    const g = jalurGerbang(env)
    if (!pptx || !d.ada(pptx)) {
      peringatan.push('pemeriksaan format slide dan bahasa dilewati, berkas PPTX tidak ada')
    } else {
      const tgl = /^\d{4}-\d{2}-\d{2}$/.test(tanggal || '') ? ['--tanggal', tanggal] : []
      const hasil = await Promise.all([
        jalankanGerbang('format slide', { bin: py.bin, args: [...py.awal, g.aturan, pptx, ...tgl], skrip: g.aturan, dep: d, env }),
        jalankanGerbang('bahasa', { bin: py.bin, args: [...py.awal, '-c', PY_BAHASA, path.dirname(g.bahasa), pptx], skrip: g.bahasa, dep: d, env }),
      ])
      for (const h of hasil) {
        if (h.gagal) gagal.push(...h.gagal)
        if (h.peringatan) peringatan.push(h.peringatan)
      }
    }
    if (pdf && !d.ada(pdf)) peringatan.push('berkas PDF draf tidak ada')
    if (tanggal && angka && Object.keys(angka).length) {
      const { riwayat } = await ambilRiwayat({ jenis, tanggal, dep: d })
      peringatan.push(...banding7(angka, riwayat, tanggal))
    }
  } catch (e) {
    peringatan.push(`pemeriksaan draf galat: ${bersih((e && e.message) || e).slice(0, 160)}`)
  }
  return { peringatan, gagal, ms: Math.max(0, Math.round(d.now() - mulai)) }
}
