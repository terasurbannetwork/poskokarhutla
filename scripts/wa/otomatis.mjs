// Pengatur otomatis laporan harian: baca bahan WA dari worker, jalankan generator DETERMINISTIK
// (data/laporan-bnpb/generator/*.py, tanpa LLM), kirim PDF + PPTX lewat gateway lokal.
//   node scripts/wa/otomatis.mjs [--tanggal YYYY-MM-DD] [--kering]
// --cutoff = pemicu jam (launchd 12.05 dan 18.05): bangun dengan bahan yang ada; laporan tak bisa dibangun dikabari ke PEMILIK.
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
import { jalankanRenlap, jatuhTempo } from './renlap_jam.mjs'
import { jalankanJarakPandang, diJendela } from './jarak_pandang_jam.mjs'
import * as jenis from '../../src/wa_jenis.js'

const kenaliAsli = jenis.kenali
const tanggalIsiAsli = jenis.tanggalIsi || (() => null) // belum ada = semua bahan ditolak (aman), bukan lolos

const DI = path.dirname(fileURLToPath(import.meta.url))
const { muatEnv, daftar, rumah, RUMAH, normalWa } = createRequire(import.meta.url)('./umum.cjs')
const { buat: buatDrive } = createRequire(import.meta.url)('./drive.cjs')
const GENERATOR = path.resolve(DI, '../../data/laporan-bnpb/generator')
const execP = promisify(execFile)

// --isian <berkas> hanya bila mesin proyek (proyek.mjs, BL-08) mengisi f.isian; jalur terjadwal tidak pernah mengisinya, jadi argumennya sama persis (D9).
const isianArg = (f) => (f.isian ? ['--isian', f.isian] : [])

// Aturan jam: harian cut-off 12.00 WIB; penanganan 18.00 WIB (pemilik 16 Nov 2026, sama dengan laporan manual 13 Nov).
export const LAPORAN = [
  { id: 'harian', judul: 'Laporan Kejadian Bencana Harian', butuh: ['rekap_koordalops_24', 'bmkg_pagi', 'pvmbg_pagi'], jam: 12,
    berkas: (d) => `Laporan Kejadian Bencana Harian ${ddmmyy(d)}`,
    // format laporan manual 16 Nov (kejadian baru + masih berlangsung, Peringatan Dini, Rencana Aksi); harian.py tetap dipakai pembangun manual
    args: (d, f, out) => ['harian_ringkas.py', '--tanggal', d, '--koordalops', f.rekap_koordalops_24, '--bmkg', f.bmkg_pagi, '--pvmbg', f.pvmbg_pagi, '--jam', '12:00', '--out', out, ...isianArg(f)] },
  // opsional: mode --cutoff membangun dari data sistem walau bahan WA belum ada. pilihan: bahan tambahan yang dipakai bila ada, tidak ditunggu
  // (Excel 'Gelar Kekuatan Satgas Udara Karhutla' untuk panel Armada Udara, pemilik 16 Nov 2026). Format laporan manual 13 Nov, cut-off 18.00.
  { id: 'penanganan', judul: 'Laporan Penanganan Pengendalian Karhutla', butuh: ['bmkg_pagi', 'satgas'], pilihan: ['gelar_udara'], opsional: true, jam: 18, waktu: 25 * 60e3,
    berkas: (d) => `Laporan Penanganan Pengendalian Karhutla ${ddmmyy(d)}`,
    args: (d, f, out) => ['penanganan_otomatis.py', '--tanggal', d, '--jam', '18:00', ...(f.bmkg_pagi ? ['--bmkg', f.bmkg_pagi] : []), ...(f.satgas ? ['--operasi', f.satgas] : []),
      ...(f.gelar_udara ? ['--gelar', f.gelar_udara] : []), '--out', out, ...isianArg(f)] },
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
// cutoff=true (pemicu jam): laporan `opsional` tetap siap tanpa bahan WA; yang tidak opsional (harian: generator wajib Koordalops) tetap menunggu.
export function cekSiap(lap, terpilih, now, tanggal, cutoff = false) {
  const kurang = (cutoff && lap.opsional ? [] : lap.butuh).filter((k) => !terpilih[k])
  if (kurang.length) return { siap: false, alasan: 'bahan belum lengkap: ' + kurang.join(', ') }
  if (tanggal === tanggalWib(now) && jamWib(now) < lap.jam) return { siap: false, alasan: `belum cut-off ${lap.jam}.00 WIB` }
  return { siap: true }
}

export const hashBahan = (lap, teks) =>
  crypto.createHash('sha256').update(JSON.stringify([...lap.butuh, ...(lap.pilihan || []).filter((k) => teks[k] != null)].map((k) => [k, teks[k]]))).digest('hex')

function ambilKunci(berkas) {
  const baca = () => { try { return JSON.parse(fs.readFileSync(berkas, 'utf8')) } catch { return {} } }
  return { baca, tulis: (s) => { fs.mkdirSync(path.dirname(berkas), { recursive: true, mode: 0o700 }); fs.writeFileSync(berkas, JSON.stringify(s, null, 1), { mode: 0o600 }) } }
}

// 40 menit: penanganan bisa jalan 25 menit (lap.waktu), jadi kunci yang lebih muda dari ini dianggap masih hidup.
export const KUNCI_BASI_MS = 40 * 60e3
function kunciProses(berkas) {
  fs.mkdirSync(path.dirname(berkas), { recursive: true, mode: 0o700 })
  try {
    if (Date.now() - fs.statSync(berkas).mtimeMs > KUNCI_BASI_MS) fs.rmSync(berkas, { force: true }) // sisa proses mati
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
    fetch: (u, o = {}) => fetch(u, { signal: AbortSignal.timeout(60_000), ...o }), // panggilan Worker yang menggantung tidak menahan antrean pengirim
    exec: (cmd, args, o) => execP(cmd, args, o),
    kirimFile: (target, p, filename, caption, mimetype) => pos('/send-file', { target, path: p, filename, caption, mimetype }),
    kirimTeks: (target, message) => pos('/send', { target, message }),
    unggahDrive: (a) => buatDrive({ env }).unggahLaporan(a), // null bila Drive belum dikonfigurasi
    // Pantau Dalops: perbarui tabel kejadian per jenis di R2 dari rekap WA Koordalops di folder kerja bot (scripts/data/dalops_banjir.py --wa).
    dalops: ({ dasar }) => execP('python3', [path.resolve(DI, '../data/dalops_banjir.py'), '--wa', '--unggah'], { cwd: path.resolve(DI, '../..'), timeout: 10 * 60e3, maxBuffer: 20e6, env: { ...process.env, WA_BOT_DIR: dasar } }),
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
// Jalur terjadwal (D9, BL-03): nomor bot laporan yang disetujui (bukan WA_IZIN) kini ikut tersimpan di wa_masuk; bahannya hanya untuk proyek.mjs.
// hanyaIzin=true membuang baris yang pengirimnya nomor HP di luar WA_IZIN. Baris grup operasi (@g.us) dan sumber bukan nomor (misal 'form') tetap.
// WA_IZIN kosong = tanpa saringan (gateway lama tanpa izin tidak meneruskan apa pun).
export function dariIzin(env) {
  const izin = new Set(daftar(env.WA_IZIN).map(normalWa).filter(Boolean))
  return (p) => {
    if (!izin.size) return true
    if (/^bl:/.test(String(p.dari ?? ''))) return false // nomor bot laporan (dari = 'bl:' + wa_sha): bukan WA_IZIN
    const n = normalWa(p.dari)
    return !n || /@g\.us$/i.test(n) || !/^\d+$/.test(n) || izin.has(n)
  }
}

export async function ambilBahan({ env, dep, tanggal, kenali = kenaliAsli, tanggalIsi = tanggalIsiAsli, log = () => {}, hanyaIzin = false }) {
  const boleh = hanyaIzin ? dariIzin(env) : () => true
  const geser = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10)
  const pesanMap = new Map()
  for (const [i, tgl] of [[0, tanggal], [1, geser(tanggal, -1)], [2, geser(tanggal, 1)]]) {
    try {
      const r = await dep.fetch(`${env.WORKER_URL || 'https://centurisk97.id'}/api/wa/masuk?tanggal=${encodeURIComponent(tgl)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      for (const p of (await r.json()).pesan || []) if (boleh(p)) pesanMap.set(String(p.id), p)
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
    for (const k of [...lap.butuh, ...(lap.pilihan || [])]) {
      for (const p of semua[k] || []) {
        let t
        try { t = await teksDari(p) } catch (x) { log(lap.id, k, 'teks tak terbaca:', x.message); continue }
        const td = BERKAS_BINER.test(p.nama_berkas || '') ? tanggalWib(new Date(Number(p.diterima) || Date.parse(p.diterima) || 0)) : tanggalIsi(t, k) // Excel tanpa tanggal isi: tanggal terima
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
  for (const k of [...lap.butuh, ...(lap.pilihan || [])]) {
    if (teks[k] == null) continue
    const biner = String(teks[k]).match(/^biner:(\.\w+):/) // berkas biner (Excel) dari ambilTeks
    f[k] = path.join(kerja, k + (biner ? biner[1] : '.txt'))
    fs.writeFileSync(f[k], biner ? Buffer.from(teks[k].slice(biner[0].length), 'base64') : teks[k])
  }
  const dasarNama = path.join(out, lap.berkas(tanggal))
  return { kerja, out, f, berkas: ['pdf', 'pptx'].map((x) => ({ x, p: `${dasarNama}.${x}` })) }
}

// Satu generator jalan pada satu waktu untuk jalur terjadwal, perintah lama, dan mesin proyek (kunci bersama `<rumah>/generator.lock`).
// Menunggu kunci paling lama `tunggu` (bawaan 30 menit, cukup untuk satu penanganan 25 menit); lewat itu = galat.
export async function kunciGenerator(berkas, { tunggu = 30 * 60e3, tidur = (ms) => new Promise((r) => setTimeout(r, ms)), jeda = 2000 } = {}) {
  const batas = Date.now() + tunggu
  for (;;) {
    const lepas = kunciProses(berkas)
    if (lepas) return lepas
    if (Date.now() >= batas) throw new Error('generator sedang dipakai proses lain terlalu lama (kunci ' + path.basename(berkas) + ')')
    await tidur(jeda)
  }
}

// opsi: kunci (jalur generator.lock bersama; kosong = tanpa kunci), envAnak (tambahan env proses anak), tidur (uji).
// Kembalian: hasil exec ({stdout, stderr}) supaya pemanggil bisa membaca baris PERINGATAN.
export async function jalankanGenerator(lap, tanggal, f, out, kerja, dep, env = process.env, opsi = {}) {
  const lepas = opsi.kunci ? await kunciGenerator(opsi.kunci, { tidur: opsi.tidur || dep.tidur }) : () => {}
  try {
    // Seluruh pohon proses perlu Python >= 3.12 + Pillow (penanganan.py memanggil `python3` telanjang): venv di depan PATH.
    const pyBin = rumah(env.WA_PY_BIN) || path.join(RUMAH, 'py', 'bin')
    return (await dep.exec(path.join(pyBin, 'python3'), lap.args(tanggal, f, out), { cwd: GENERATOR, timeout: lap.waktu || 10 * 60e3, maxBuffer: 20e6, env: { ...process.env, ...(opsi.envAnak || {}), PATH: pyBin + path.delimiter + (process.env.PATH || '') } })) || {}
  } catch (x) {
    const penuh = String(x.stderr || x.message || x)
    try { fs.writeFileSync(path.join(kerja, 'galat.txt'), penuh, { mode: 0o600 }) } catch {}
    const ujung = penuh.trim().split('\n').filter(Boolean).pop() || ''
    throw new Error(`generator gagal (kode G1, rincian di ${path.join(kerja, 'galat.txt')}): ${ujung.slice(0, 200)}`)
  } finally { lepas() }
}

export { kunciProses, ambilKunci, MIME }

export async function jalankan(opsi = {}) {
  muatEnv()
  const env = opsi.env || process.env
  const now = opsi.now || new Date()
  const kering = !!opsi.kering
  if (kering) process.env.WA_KERING = '1' // generator tidak mengunggah ke luar saat uji tanpa kirim
  const dep = opsi.dep || depBawaan(env)
  const kenali = opsi.kenali || kenaliAsli
  const tanggalIsi = opsi.tanggalIsi || tanggalIsiAsli
  const log = opsi.log || ((...a) => console.log(new Date().toISOString(), ...a))
  const dasar = opsi.rumah || RUMAH
  const tanggal = opsi.tanggal || tanggalWib(now)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('--tanggal harus YYYY-MM-DD')
  const hasil = []

  // Penjaga jam hanya untuk jalan otomatis tanpa --tanggal.
  // Renlap (RENLAP=1) punya jendela sendiri: malam 20.00-24.00 dan pagi 07.00-12.00; di luar 06.00-23.00 hanya renlap yang jalan.
  const diLuar = !opsi.tanggal && (jamWib(now) < 6 || jamWib(now) >= 23)
  if (diLuar && !(env.RENLAP === '1' && jatuhTempo(jamWib(now)).length) && !(env.JARAK_PANDANG === '1' && diJendela(jamWib(now)))) return [{ id: '-', status: 'di luar jam 06.00-23.00 WIB' }]

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
    if (!opsi.tanggal) hasil.push(...await jalankanRenlap({ env, now, tanggal, jam: jamWib(now), state, simpan, kering, dep, log, pemilik, dasar }))
    // Jarak pandang BMKG (JARAK_PANDANG=1): galat tertangkap di dalam modul, tidak menahan laporan.
    if (!opsi.tanggal) try { hasil.push(...await jalankanJarakPandang({ env, now, jam: jamWib(now), state, simpan, kering, dep, log, pemilik })) } catch (e) { log('jarak pandang tak terduga', e.message) }
    if (diLuar) return hasil
    let bahan
    try { bahan = await ambilBahan({ env, dep, tanggal, kenali, tanggalIsi, log, hanyaIzin: true }) } catch (e) { await galat('sistem', e.message); return [{ id: '-', status: 'galat' }] }
    delete state.gagal.sistem
    const { pilihSesuai } = bahan

    for (const lap of [...LAPORAN, ...(env.LAPORAN_BANJIR === '1' ? LAPORAN_BANJIR : [])]) {
      const kunci = `${lap.id}:${tanggal}`
      const { terpilih, teks: teksSesuai } = await pilihSesuai(lap)
      const c = cekSiap(lap, terpilih, now, tanggal, !!opsi.cutoff)
      if (!c.siap) {
        log(lap.id, 'tunggu:', c.alasan); hasil.push({ id: lap.id, status: 'tunggu', alasan: c.alasan })
        // Pemicu jam lewat cut-off tetapi laporan tak bisa dibangun: kabari PEMILIK sekali (bukan di slide).
        if (opsi.cutoff && !kering && pemilik && jamWib(now) >= lap.jam && !/belum cut-off/.test(c.alasan) && state.gagal['cutoff:' + kunci] !== c.alasan) {
          state.gagal['cutoff:' + kunci] = c.alasan; simpan()
          try { await dep.kirimTeks(pemilik, `${lap.judul} ${tanggal} belum bisa dibuat pada cut-off ${lap.jam}.00 WIB: ${c.alasan}. Kirim bahannya, bot membangun otomatis.`.slice(0, 600)) } catch (x) { log('kabar pemilik gagal', x.message) }
        }
        continue
      }
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
        if (!sudahJadi) await jalankanGenerator(lap, tanggal, f, out, kerja, dep, env, { kunci: path.join(dasar, 'generator.lock') })
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
        // 9 Nov: satu nomor kena batas harian limiter tidak boleh menahan penerima lain; yang gagal diulang jalan berikut.
        const gagalKirim = []
        for (const t of penerima) {
          if (e.terkirim.includes(t)) continue
          try {
            for (const b of berkas) {
              if (kering) { log('[kering] akan kirim', path.basename(b.p), 'ke', t.replace(/\d(?=\d{4})/g, '*'), '|', caption); continue }
              await dep.kirimFile(t, b.p, path.basename(b.p), caption, MIME[b.x])
            }
            e.terkirim.push(t)
            state.laporan[kunci] = e; simpan()
          } catch (x) { gagalKirim.push(`${t.replace(/\d(?=\d{4})/g, '*')}: ${x.message}`) }
        }
        if (gagalKirim.length) throw new Error(`terkirim ${e.terkirim.length} dari ${penerima.length} penerima. ${gagalKirim.join('; ')}`)
        if (!kering) { e.selesai = true; state.laporan[kunci] = e; delete state.gagal[kunci]; simpan() }
        hasil.push({ id: lap.id, status: kering ? 'kering' : 'terkirim', revisi: e.revisi, ...(lap.butuh.some((k) => teks[k] == null) ? { bahanBelumMasuk: lap.butuh.filter((k) => teks[k] == null) } : {}) })
      } catch (x) {
        await galat(kunci, x.message)
        hasil.push({ id: lap.id, status: 'galat', alasan: x.message })
      }
    }
    // Pantau Dalops ikut rekap WA Koordalops hari ini, walau deck harian gagal dibangun (pemilik 11 Nov 2026: "kenapa belum terupdate").
    // Sekali per isi rekap; gagal = PEMILIK dikabari sekali lewat galat(), diulang jalan berikut.
    if (dep.dalops && !kering) {
      const rekap = path.join(dasar, 'kerja', tanggal, 'harian', 'rekap_koordalops_24.txt')
      if (fs.existsSync(rekap)) {
        const sidik = crypto.createHash('sha256').update(fs.readFileSync(rekap)).digest('hex').slice(0, 16), kunciD = 'dalops:' + tanggal
        state.dalops ||= {}
        if (state.dalops[tanggal] !== sidik) {
          try { await dep.dalops({ dasar, tanggal }); state.dalops[tanggal] = sidik; delete state.gagal[kunciD]; simpan(); hasil.push({ id: 'dalops', status: 'diperbarui' }) }
          catch (x) { await galat(kunciD, `Pantau Dalops gagal diperbarui dari rekap WA: ${String(x.stderr || x.message).slice(-200)}`); hasil.push({ id: 'dalops', status: 'galat' }) }
        }
      }
    }
    const pb = await peringatanBanjir({ env, dep, tanggal, state, simpan, kering, log, galat, jamWib: opsi.tanggal && tanggal !== tanggalWib(now) ? 24 : jamWib(now) })
    if (pb.status !== 'mati') hasil.push(pb)
    return hasil
  } finally { lepas() }
}

// Excel (gelar udara) diambil utuh sebagai biner, dikodekan 'biner:.xlsx:<base64>' supaya tetap satu string di hash dan state.
const BERKAS_BINER = /\.(xlsx?|ods)$/i
async function ambilTeks(p, dep, env) {
  const biner = BERKAS_BINER.test(p.nama_berkas || '')
  if (!biner && p.teks && p.teks.trim()) return p.teks
  if (!p.ada_berkas) throw new Error(`pesan ${p.id} kosong`)
  const r = await dep.fetch(`${env.WORKER_URL || 'https://centurisk97.id'}/api/wa/berkas?id=${encodeURIComponent(p.id)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` } })
  if (!r.ok) throw new Error(`berkas ${p.id} HTTP ${r.status}`)
  if (biner) return `biner:${p.nama_berkas.match(BERKAS_BINER)[0].toLowerCase()}:${Buffer.from(await r.arrayBuffer()).toString('base64')}`
  return await r.text()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2)
  const i = a.indexOf('--tanggal')
  jalankan({ tanggal: i >= 0 ? a[i + 1] : undefined, kering: a.includes('--kering'), cutoff: a.includes('--cutoff') })
    .then((h) => { console.log(JSON.stringify(h)); process.exit(h.some((x) => x.status === 'galat') ? 1 : 0) })
    .catch((e) => { console.error(e); process.exit(1) })
}
