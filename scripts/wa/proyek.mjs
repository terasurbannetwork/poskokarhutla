// Mesin proyek bot laporan WA (BL-08; data/kajian-bnpb/bot-laporan: K2, K4, K8, K11, K15, D1 sampai D11, Q6, Q7, Q13, Q14).
// tangani(pesan, ctx): bahan masuk ke proyek terbuka pengirim, `buat [jenis] [tanggal]`, `buat saja`, `status`, `bantuan`.
// Alur buat: bahan pengirim (Q6) -> jenis (A2) -> kurang dan bentrok (A3) -> T-TANYA atau bangun -> ekstraksi teks (K15) -> Claude urai ->
// isian.json -> generator --isian (otomatis.mjs) -> pratinjau slide 1-3 (ubah.py) -> PDF (PPTX hanya saat final atau `pptx`, Q1) -> versi v1 -> draf.
// Revisi (BL-10; D1, D3, D6, D8, A5, A6, A8): kalimat bebas pemegang proyek `draf` -> membangun -> inventaris deck terakhir + kunci + operasi lama -> Claude operasi
// -> `tanya` dibalas sebagai pertanyaan (draf lagi) | semua ditolak kunci: T-TOLAK-KUNCI tanpa versi baru | selain itu generator dibangun ulang dari bahan + isian,
// operasi 1..n diterapkan (ubah.py terapkan), PDF bersamaan dengan periksa (BL-11), pratinjau slide pertama yang berubah, versi n+1 dengan ubah.json, draf.
// `versi` riwayat dengan jam; `balik vN` = versi baru dengan operasi vN (append-only); `pptx` kirim PPTX terakhir; `batal` menutup proyek.
// Semua dunia luar lewat ctx (balas, balasFile, kabariPemilik) dan ctx.dep (fetch, exec, ocr, claude, periksa?). Angka sistem tidak pernah dari Claude (D1, K4).
//   node scripts/wa/proyek.mjs --kering   (cek kesiapan mesin, BL-13)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { LAPORAN, ambilBahan, siapkanKeluaran, jalankanGenerator, kunciProses, tanggalWib, jamWib, MIME, dariIzin, KUNCI_BASI_MS } from './otomatis.mjs'
import { parseTanggal, labelTanggal } from './perintah.mjs'
import { buatKlien, GalatClaude, medanTerkunci, sebutAngkaSistem, samarkan } from './claude.mjs'
import * as jenisWa from '../../src/wa_jenis.js'

const DI = path.dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
const { normalWa, daftar, rumah, RUMAH, muatEnv } = req('./umum.cjs')
const GENERATOR = path.resolve(DI, '../../data/laporan-bnpb/generator')
const W = (env) => env.WORKER_URL || 'https://centurisk97.id'
const AKTIF = ['terbuka', 'bertanya', 'membangun', 'draf']
const KEDALUWARSA_MS = 24 * 3600e3 // Q7 bawaan sementara
const MEMBANGUN_BASI_MS = 3600e3 // `membangun` lebih dari 1 jam tanpa kunci hidup = proses mati
const TEKS_MINIMAL = 20 // huruf dan angka; di bawah ini hasil ekstraksi dianggap tidak terbaca (K15)
const MAKS_BAHAN = 50 // sama dengan batas rute POST /api/wa/proyek
const MAKS_KALIMAT = 2000 // kalimat revisi ke Claude
const PERIKSA_MS = 120e3 // periksa (BL-11) tidak pernah menahan draf lebih lama dari ini
const WAKTU_WORKER = 60_000 // tiap fetch Worker: menggantung = galat Worker biasa, antrean pengirim tidak tertahan

const labelBahan = (k) => jenisWa.JENIS_LAPORAN.find((j) => j.kunci === k)?.label || k
const lapDari = (id) => LAPORAN.find((l) => l.id === id)

// wa_sha = sha256("<WA_GARAM>|<62 nomor>") dari daftar.cjs (satu rumus dengan gateway dan pendaftaran, BL-03): satu-satunya pengenal pemakai yang keluar dari mesin.
export const waSha = req('./daftar.cjs').waSha

// ---------- perintah ----------
const JENIS_KATA = { harian: 'harian', bencana: 'harian', 'harian bencana': 'harian', 'kejadian bencana': 'harian',
  penanganan: 'penanganan', karhutla: 'penanganan', 'penanganan karhutla': 'penanganan' }

// -> {aksi:'buat', jenis|null, tanggal, saja} | {aksi:'status'|'bantuan'|'versi'|'pptx'|'batal'|'final'} | {aksi:'balik', n} | null (bukan perintah: bahan atau revisi).
// Teks panjang atau berbaris banyak = bahan (aturan sama dengan perintah.mjs). `status <tanggal>` bukan milik mesin ini (Q14).
export function parsePerintah(teks, now = new Date()) {
  const asli = String(teks ?? '').trim()
  const t = asli.toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ')
  if (!t || t.length > 60 || /\n/.test(asli)) return null
  if (t === 'bantuan') return { aksi: 'bantuan' }
  if (t === 'status') return { aksi: 'status' }
  if (['versi', 'pptx', 'batal', 'final'].includes(t)) return { aksi: t } // final: BL-12; sampai itu dibalas belum tersedia
  const b = t.match(/^balik (?:ke )?v?(\d{1,3})$/)
  if (b) return { aksi: 'balik', n: Number(b[1]) }
  const m = t.match(/^buat\b ?(.*)$/)
  if (!m) return null
  let sisa = m[1], saja = false
  if (/^saja\b/.test(sisa)) { saja = true; sisa = sisa.replace(/^saja\b ?/, '') }
  let jenis = null
  for (const kata of Object.keys(JENIS_KATA).sort((a, b) => b.length - a.length)) {
    if (sisa === kata || sisa.startsWith(kata + ' ')) { jenis = JENIS_KATA[kata]; sisa = sisa.slice(kata.length).trim(); break }
  }
  if (/^saja\b/.test(sisa)) { saja = true; sisa = sisa.replace(/^saja\b ?/, '') }
  const tanggal = parseTanggal(sisa, now)
  if (!tanggal) return { aksi: 'bantuan' }
  return { aksi: 'buat', jenis, tanggal, saja }
}

export const BANTUAN = [
  'Perintah bot laporan:',
  'buat harian [tanggal]',
  'buat penanganan [tanggal]',
  'buat [tanggal] (jenis ditebak dari bahan)',
  'buat saja (bangun dengan bahan yang ada)',
  'status (proyek Anda yang masih terbuka)',
  'Saat draf: balas dengan kalimat revisi, atau versi, balik v2, pptx, batal',
  'bantuan',
  'Kirim atau teruskan bahan laporan dulu, lalu ketik buat.',
  'Tanggal: hari ini (bawaan), kemarin, 26 okt, 26/10, 2026-10-26.',
].join('\n')
const BANTUAN_PEMILIK = 'Khusus pemilik: kirim ulang harian|penanganan [tanggal], status <tanggal>.'

// ---------- penyimpanan lokal mesin (~/.wa-bot/proyek) ----------
const dirProyek = (dasar) => path.join(dasar, 'proyek')
function bacaJson(p, awal) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return awal } }
function tulisJson(p, isi) { fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 }); fs.writeFileSync(p, JSON.stringify(isi, null, 1), { mode: 0o600 }) }
// Indeks proyek per pengirim: `status` tanpa tanggal dan kait kedaluwarsa Q7 (rute Worker tidak punya daftar per wa_sha).
const indeksP = (dasar) => path.join(dirProyek(dasar), 'indeks.json')
function catatIndeks(dasar, p, sha, dari) {
  const ix = bacaJson(indeksP(dasar), { proyek: {} })
  ix.proyek[p.id] = { sha, dari, jenis: p.jenis, tanggal: p.tanggal }
  tulisJson(indeksP(dasar), ix)
}
function hapusIndeks(dasar, id) {
  const ix = bacaJson(indeksP(dasar), { proyek: {} })
  if (ix.proyek[id]) { delete ix.proyek[id]; tulisJson(indeksP(dasar), ix) }
}

// ---------- Worker ----------
async function worker(ctx, jalur, { method = 'GET', body, form } = {}) {
  const { env, dep } = ctx
  const headers = { authorization: `Bearer ${env.WA_MESIN || ''}` }
  if (body) headers['content-type'] = 'application/json'
  const r = await dep.fetch(W(env) + jalur, { method, headers, body: form || (body ? JSON.stringify(body) : undefined), signal: AbortSignal.timeout(WAKTU_WORKER) })
  if (!r.ok) {
    let rinci = ''
    try { rinci = (await r.text()).slice(0, 160) } catch {}
    throw new Error(`${method} ${jalur.split('?')[0]} HTTP ${r.status} ${rinci}`.trim())
  }
  return r.json()
}
const proyekBuka = (ctx, o) => worker(ctx, '/api/wa/proyek', { method: 'POST', body: o })
const proyekStatus = (ctx, id, ke, sha) => worker(ctx, '/api/wa/proyek/status', { method: 'POST', body: { id, ke, wa_sha: sha } })

// Lingkup bahan (D12): pengirim WA_IZIN (termasuk PEMILIK) memakai SEMUA bahan hari itu dari nomor WA_IZIN dan baris grup operasi, sama dengan
// jalur terjadwal, jadi `buat harian` dan `buat penanganan` menghasilkan deck yang sama. Pengirim bl_daftar hanya memakai barisnya sendiri
// (`dari` = 'bl:' + wa_sha; nomornya tidak pernah disimpan Worker), Q6.
export function lingkupBahan(env, dari, sha) {
  const izin = new Set(daftar(env.WA_IZIN).map(normalWa).filter(Boolean))
  if (izin.has(dari)) { const boleh = dariIzin(env); return { izin: true, boleh } }
  return { izin: false, boleh: (p) => String(p?.dari ?? '') === `bl:${sha}` }
}
export const milikPengirim = (p, dari, sha, env = {}) => lingkupBahan(env, dari, sha).boleh(p)
// fetch yang hanya meneruskan baris dalam lingkup dan menyimpan tiap jawaban /api/wa/masuk.
function fetchLingkup(dep, boleh) {
  const simpan = new Map()
  const f = async (u, o) => {
    if (!/\/api\/wa\/masuk\?/.test(u)) return dep.fetch(u, o)
    if (!simpan.has(u)) {
      const r = await dep.fetch(u, o)
      if (!r.ok) return r
      const j = await r.json()
      simpan.set(u, { ...j, pesan: (j.pesan || []).filter(boleh) })
    }
    const isi = simpan.get(u)
    return { ok: true, status: 200, json: async () => isi }
  }
  return f
}

// ---------- ekstraksi teks (K15) ----------
const EXT = (p) => (String(p.nama_berkas || '').match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase()
function bentukBerkas(p) {
  const e = EXT(p), t = String(p.tipe || '').toLowerCase()
  if (e === '.pdf' || t === 'application/pdf') return 'pdf'
  if (/^\.(jpe?g|png|webp|heic)$/.test(e) || t.startsWith('image/')) return 'gambar'
  if (/^\.(xlsx?|ods)$/.test(e) || /spreadsheet|ms-excel/.test(t)) return 'excel'
  if (e === '.csv' || t === 'text/csv') return 'csv'
  if (e === '.txt' || t.startsWith('text/')) return 'teks'
  return 'lain'
}
const cukup = (t) => String(t || '').replace(/[^\p{L}\p{N}]/gu, '').length >= TEKS_MINIMAL
const pyBin = (env) => path.join(rumah(env.WA_PY_BIN) || path.join(RUMAH, 'py', 'bin'), 'python3')
// Excel ke CSV per lembar (openpyxl di venv bot, sama dengan penanganan_otomatis.py). Jalur berkas lewat argv, bukan disisipkan ke kode.
const PY_CSV = [
  'import csv, sys, openpyxl',
  'wb = openpyxl.load_workbook(sys.argv[1], data_only=True, read_only=True)',
  'w = csv.writer(sys.stdout)',
  'for ws in wb.worksheets:',
  '    print("# Lembar: " + ws.title)',
  '    for r in ws.iter_rows(values_only=True):',
  '        if any(c is not None for c in r): w.writerow(["" if c is None else c for c in r])',
].join('\n')

// Satu pesan -> {id, jenis:'teks'|'tabel', teks, nama} atau {id, tidakTerbaca, nama}. Berkas asli tidak pernah dikirim ke Claude.
export async function ekstrak(p, ctx, kerja) {
  const { env, dep } = ctx
  const nama = p.nama_berkas || ''
  const caption = String(p.teks || '').trim()
  if (!p.ada_berkas) return caption ? { id: String(p.id), jenis: 'teks', teks: caption, nama } : null
  const bentuk = bentukBerkas(p)
  if (bentuk === 'lain') return { id: String(p.id), tidakTerbaca: true, nama }
  let isi = ''
  const ujung = path.join(kerja, `${String(p.id).replace(/[^\w.-]/g, '_')}${EXT(p) || '.bin'}`)
  try {
    const r = await dep.fetch(`${W(env)}/api/wa/berkas?id=${encodeURIComponent(p.id)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` }, signal: AbortSignal.timeout(WAKTU_WORKER) })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const buf = Buffer.from(await r.arrayBuffer())
    if (bentuk === 'teks' || bentuk === 'csv') isi = buf.toString('utf8')
    else {
      fs.mkdirSync(kerja, { recursive: true, mode: 0o700 })
      fs.writeFileSync(ujung, buf, { mode: 0o600 })
      if (bentuk === 'pdf') isi = String((await dep.exec(env.PDFTOTEXT || 'pdftotext', ['-layout', ujung, '-'], { timeout: 60e3, maxBuffer: 20e6 })).stdout || '')
      else if (bentuk === 'excel') isi = String((await dep.exec(pyBin(env), ['-c', PY_CSV, ujung], { timeout: 60e3, maxBuffer: 20e6 })).stdout || '')
      else isi = String((await (dep.ocr || req('./ocr.cjs').bacaStempel)(ujung, 30e3)) || '')
    }
  } catch (e) {
    (ctx.log || (() => {}))('ekstrak gagal', p.id, e.message)
    isi = ''
  } finally { fs.rmSync(ujung, { force: true }) }
  if (!cukup(isi)) return { id: String(p.id), tidakTerbaca: true, nama }
  const tabel = bentuk === 'excel' || bentuk === 'csv'
  return { id: String(p.id), jenis: tabel ? 'tabel' : 'teks', teks: tabel || !caption ? isi : `${caption}\n${isi}`, nama }
}

// ---------- isian: keluaran Claude -> bentuk --isian generator ----------
const angkaBulat = (v) => {
  const a = String(v ?? '').replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1').match(/\d+(?:[.,]\d+)?/g) || []
  return a.length === 1 && /^\d+$/.test(a[0]) ? Number(a[0]) : null
}
const HARIAN_ANGKA = { meninggal: 'meninggal', hilang: 'hilang', mengungsi_jiwa: 'mengungsi', terdampak_jiwa: 'jiwa', terdampak_kk: 'kk' }
const HARIAN_TEKS = { dampak: 'dampak', status_darurat: 'status_darurat', kondisi_terkini: 'kondisi' }

// Buang kunci angka sistem dan teks yang menyebut angka sistem di mana pun (D3, K4): pertahanan kedua sesudah validasiIsian claude.mjs.
export function tanpaKunci(x) {
  if (Array.isArray(x)) return x.map(tanpaKunci).filter((v) => v !== undefined)
  if (x && typeof x === 'object') {
    const o = {}
    for (const [k, v] of Object.entries(x)) {
      if (medanTerkunci(k)) continue
      const b = tanpaKunci(v)
      if (b !== undefined) o[k] = b
    }
    return o
  }
  if (typeof x === 'string' && sebutAngkaSistem(x)) return undefined
  return x
}

// Harian: kejadian per kelompok dicocokkan generator lewat lokasi (kabupaten bila ada); yang tak cocok diabaikan generator dengan peringatan.
// Penanganan: belum dipetakan (kunci peta provinsi generator belum disepakati; isian asing akan MENAMBAH baris provinsi), jadi tanpa --isian.
export function keIsianGenerator(jenis, isian) {
  const sah = (isian || []).filter((e) => e && e.nilai != null && String(e.nilai).trim() && !medanTerkunci(e.medan) && !sebutAngkaSistem(e.nilai))
  if (jenis !== 'harian') return {}
  const kelompok = new Map()
  for (const e of sah) { const k = e.kelompok || ''; if (!kelompok.has(k)) kelompok.set(k, {}); kelompok.get(k)[e.medan] ??= String(e.nilai).trim() }
  const kejadian = []
  for (const m of kelompok.values()) {
    const lokasi = m.kabupaten || m.lokasi
    if (!lokasi) continue
    const angka = {}, teks = {}
    for (const [a, b] of Object.entries(HARIAN_ANGKA)) { const n = m[a] != null ? angkaBulat(m[a]) : null; if (n != null) angka[b] = n }
    for (const [a, b] of Object.entries(HARIAN_TEKS)) if (m[a]) teks[b] = m[a]
    if (!Object.keys(angka).length && !Object.keys(teks).length) continue
    kejadian.push({ lokasi, ...(Object.keys(angka).length ? { angka } : {}), ...(Object.keys(teks).length ? { teks } : {}) })
  }
  return tanpaKunci(kejadian.length ? { kejadian } : {})
}

// ---------- pesan (DESIGN-SYSTEM: baris pertama kode proyek dan versi, tanpa titik tengah, em dash, emoji) ----------
const kepala = (p, n) => (n ? `${p.id} v${n}` : p.id)
const judul = (lap, tanggal) => `${lap.judul} ${labelTanggal(tanggal)}`

// Ringkasan draf (T-BUKA dan T-DRAF dalam satu teks): menempel di keterangan gambar pratinjau, jadi satu draf = 2 kiriman (Q1).
// hitung: {kunci bahan atau 'lain': jumlah pesan}. Kalimat angka sistem hanya untuk laporan yang memuatnya (penanganan karhutla).
export function tDraf(p, n, lap, tanggal, { hitung = {}, catatan = [], peringatan = [], slide = null } = {}) {
  const per = Object.entries(hitung).map(([k, j]) => `${k === 'lain' ? 'bahan lain' : labelBahan(k)} ${j}`)
  return [kepala(p, n), `Draf ${judul(lap, tanggal)}.`,
    per.length ? `Bahan: ${per.join(', ')}.` : 'Bahan: belum ada bahan yang dikenali.',
    ...(lap.id === 'penanganan' ? ['Angka hotspot, firespot, luas terbakar, dan luas belum padam diambil dari sistem (hari D-1), bukan dari bahan.'] : []),
    ...(catatan.length ? ['Catatan:', ...catatan.map((c) => `- ${c}`)] : []),
    ...daftarPeringatan(peringatan),
    ...(slide ? [`Gambar ini pratinjau slide ${slide}, PDF menyusul.`] : []),
    'Balas dengan revisi, atau ketik final.'].join('\n')
}
const daftarPeringatan = (pr) => (pr.length ? ['Pemeriksaan:', ...pr.map((c) => `- ${c}`)] : [])
// Teks dari luar (Claude, deck, pemeriksa) dirapikan ke aturan caption: tanpa titik tengah, em dash, en dash; satu baris; dipotong.
const rapi = (t, maks = 160) => {
  const s = String(t ?? '').replace(/\s*[·—–]\s*/g, ', ').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
  return s.length > maks ? s.slice(0, maks - 3).trimEnd() + '...' : s
}

// T-PRATINJAU (gambar) dan T-DRAF revisi (PDF): satu revisi = 2 kiriman (Q1).
export const tPratinjau = (p, n, slide) => `${kepala(p, n)}\nPratinjau v${n}, slide ${slide}. PDF menyusul.`
export function tDrafRevisi(p, n, lap, tanggal, { perubahan = [], tolak = [], lewat = [], catatan = [], peringatan = [] } = {}) {
  return [kepala(p, n), `Draf ${judul(lap, tanggal)}.`,
    ...(perubahan.length ? ['Perubahan:', ...perubahan.map((c) => `- ${c}`)] : []),
    ...(tolak.length ? ['Tidak diubah:', ...tolak.map((c) => `- ${c}`)] : []),
    ...(lewat.length ? ['Dilewati:', ...lewat.map((c) => `- ${c}`)] : []),
    ...(catatan.length ? ['Catatan:', ...catatan.map((c) => `- ${c}`)] : []),
    ...daftarPeringatan(peringatan),
    'Balas dengan revisi, atau ketik final.'].join('\n')
}
export const tPdf = (p, n, lap, tanggal) => `${kepala(p, n)}\nPDF draf ${judul(lap, tanggal)}.`

export function tTanya(p, lap, tanggal, pertanyaan) {
  return [kepala(p), `Sebelum membangun ${judul(lap, tanggal)}, ada yang perlu dipastikan:`,
    ...pertanyaan.map((q, i) => `${i + 1}. ${q}`),
    'Kirim bahan yang kurang lalu ketik buat lagi, atau ketik buat saja untuk membangun dengan bahan yang ada.'].join('\n')
}

// ---------- kabar pemilik: sekali per kategori galat per hari, dicatat hanya sesudah terkirim ----------
async function kabarSekali(ctx, kategori, teks) {
  const f = path.join(dirProyek(ctx.dasar || RUMAH), 'kabar.json')
  const st = bacaJson(f, {})
  const hari = tanggalWib(ctx.now || new Date())
  if (st[kategori] === hari) return
  try {
    if (ctx.kabariPemilik) await ctx.kabariPemilik(teks)
    else { const pm = daftar(ctx.env.PEMILIK)[0]; if (!pm || !ctx.dep.kirimTeks) return; await ctx.dep.kirimTeks(pm, teks) }
  } catch (e) { (ctx.log || (() => {}))('kabar pemilik gagal', e.message); return }
  st[kategori] = hari; tulisJson(f, st)
}

// Pindah status lewat rute; gagal diulang sekali, lalu pemilik dikabari (tidak pernah ditelan diam-diam).
async function pindahStatus(ctx, p, ke, sha, { lempar = true } = {}) {
  let galat
  for (let i = 0; i < 2; i++) {
    try { await proyekStatus(ctx, p.id, ke, sha); return true } catch (e) { galat = e }
  }
  await kabarSekali(ctx, 'status', `Bot laporan ${p.id}: status gagal dipindah ke ${ke}. ${String(galat.message).slice(0, 300)}`)
  if (lempar) throw galat
  return false
}

const lockProyek = (dasar, id) => path.join(dirProyek(dasar), `${id}.lock`)
const kunciHidup = (berkas) => { try { return Date.now() - fs.statSync(berkas).mtimeMs <= KUNCI_BASI_MS } catch { return false } }

// `membangun` tanpa kunci hidup = sisa proses mati: baca ulang dari Worker, lalu terbuka (belum ada versi) atau draf (versi terakhir tetap).
async function pulihkan(ctx, p, sha) {
  const q = (await proyekBuka(ctx, { id: p.id, wa_sha: sha })).proyek
  if (q.status !== 'membangun') return q
  const ke = q.versi > 0 ? 'draf' : 'terbuka'
  await pindahStatus(ctx, q, ke, sha)
  return { ...q, status: ke }
}

// ---------- klien Claude bawaan ----------
const klienCache = new WeakMap()
function klien(ctx) {
  if (ctx.dep.claude) return ctx.dep.claude
  if (!klienCache.has(ctx.env)) {
    klienCache.set(ctx.env, buatKlien({ env: ctx.env, dep: {
      bacaBiaya: async (t) => (await worker(ctx, `/api/wa/biaya?tanggal=${t}`)).usd_mikro || 0,
      tambahBiaya: async (t, u) => { if (u >= 1) await worker(ctx, '/api/wa/biaya', { method: 'POST', body: { tanggal: t, usd_mikro: Math.min(u, 50e6) } }) },
      kabariPemilik: (teks) => kabarSekali(ctx, 'claude-batas', teks),
    } }))
  }
  return klienCache.get(ctx.env)
}

// Hasil urai disimpan per proyek dan sidik bahan, supaya `buat saja` sesudah T-TANYA tidak membayar Claude dua kali.
async function urai(ctx, p, lap, bahanTeks) {
  if (!bahanTeks.length) return { isian: [], pertentangan: [], gagal: [] }
  const sidik = crypto.createHash('sha256').update(JSON.stringify([lap.id, bahanTeks.map((b) => [b.id, b.jenis, b.teks])])).digest('hex')
  const f = path.join(dirProyek(ctx.dasar || RUMAH), `${p.id}.urai.json`)
  const ada = bacaJson(f, null)
  if (ada?.sidik === sidik) return ada.hasil
  const r = await klien(ctx).urai(bahanTeks, lap.id)
  const hasil = { isian: r.isian || [], pertentangan: r.pertentangan || [], gagal: r.gagal || [], ditolak: r.ditolak || [], catatan: r.catatan || '' }
  tulisJson(f, { sidik, hasil })
  return hasil
}

const tanyaBentrok = (b) => `${b.medan.replace(/_/g, ' ')} berbeda: ${b.a.nilai} ("${String(b.a.kutipan).slice(0, 80)}") dan ${b.b.nilai} ("${String(b.b.kutipan).slice(0, 80)}"). Mana yang dipakai?`

// ---------- A2: jenis dari bahan ----------
async function tebakJenis(bahan) {
  const skor = []
  for (const lap of LAPORAN) {
    const { terpilih } = await bahan.pilihSesuai(lap)
    skor.push({ id: lap.id, n: [...lap.butuh, ...(lap.pilihan || [])].filter((k) => terpilih[k]).length })
  }
  skor.sort((a, b) => b.n - a.n)
  return skor[0].n > 0 && skor[0].n > (skor[1]?.n ?? -1) ? skor[0].id : null
}

// ---------- buat ----------
async function buat(cmd, dari, sha, ctx) {
  const { env, dep, balas } = ctx
  const now = ctx.now || new Date(), dasar = ctx.dasar || RUMAH, log = ctx.log || (() => {}), ada = ctx.ada || fs.existsSync
  const kenali = ctx.kenali || jenisWa.kenali
  const lingkup = lingkupBahan(env, dari, sha)
  const depSaring = { ...dep, fetch: fetchLingkup(dep, lingkup.boleh) }
  const bahan = await ambilBahan({ env, dep: depSaring, tanggal: cmd.tanggal, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log })
  const jenis = cmd.jenis || await tebakJenis(bahan)
  if (!jenis) return balas(`Jenis laporan ${labelTanggal(cmd.tanggal)} belum jelas dari bahan. Ketik buat harian ${cmd.tanggal} atau buat penanganan ${cmd.tanggal}.`)
  const lap = lapDari(jenis)
  const { terpilih, teks } = await bahan.pilihSesuai(lap)
  // Bahan teks Claude: bahan terpilih generator ditambah pesan lain dalam lingkup bertanggal itu (teks, PDF, foto, Excel).
  // Foto grup operasi yang tidak terpilih tidak ikut: itu bukti lapangan, bukan bahan laporan, dan OCR-nya mahal.
  const mentah = ((await (await depSaring.fetch(`${W(env)}/api/wa/masuk?tanggal=${encodeURIComponent(cmd.tanggal)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` }, signal: AbortSignal.timeout(WAKTU_WORKER) })).json()).pesan || [])
    .filter((m) => !/@g\.us$/i.test(String(m.dari || '')))
  const pakai = new Map()
  for (const m of [...Object.values(terpilih), ...mentah]) pakai.set(String(m.id), m)
  const kunciDari = new Map(Object.entries(terpilih).map(([k, m]) => [String(m.id), k]))
  const bahanRute = [...pakai.keys()].slice(0, MAKS_BAHAN).map((id) => ({ wa_id: id, ...(kunciDari.has(id) ? { jenis_bahan: kunciDari.get(id) } : {}) }))
  let { proyek: p } = await proyekBuka(ctx, { wa_sha: sha, jenis, tanggal: cmd.tanggal, bahan: bahanRute })
  catatIndeks(dasar, p, sha, dari)
  const berkasKunci = lockProyek(dasar, p.id)
  if (p.status === 'membangun') {
    if (kunciHidup(berkasKunci)) return balas(`${kepala(p, p.versi || null)}\nSedang dibangun, tunggu sebentar.`)
    p = await pulihkan(ctx, p, sha)
  }
  // TODO(BL-10): proyek draf menerima revisi; `buat` lagi di sini belum membangun ulang.
  if (p.status === 'draf') return balas(`${kepala(p, p.versi)}\nDraf sudah ada. Balas dengan revisi, atau ketik final.`)
  if (!AKTIF.includes(p.status)) return balas(`${kepala(p)}\nProyek ${p.status}. Ketik buat untuk memulai lagi.`)

  const lepas = kunciProses(berkasKunci) // satu proses aktif per proyek (T15)
  if (!lepas) return balas(`${kepala(p)}\nSedang dibangun, tunggu sebentar.`)
  const kerjaEkstrak = path.join(dirProyek(dasar), p.id, 'ekstrak')
  let status = p.status
  const pindah = async (ke, o) => { if (status === ke) return true; const ok = await pindahStatus(ctx, p, ke, sha, o); if (ok) status = ke; return ok }
  try {
    const bahanTeks = [], tidakTerbaca = []
    for (const m of pakai.values()) {
      const e = await ekstrak(m, ctx, kerjaEkstrak)
      if (!e) continue
      if (e.tidakTerbaca) tidakTerbaca.push(e.nama || `pesan ${e.id}`)
      else bahanTeks.push(e)
    }
    const hasil = await urai(ctx, p, lap, bahanTeks)
    const kurang = lap.butuh.filter((k) => !terpilih[k])
    const pertanyaan = [
      ...kurang.map((k) => `${labelBahan(k)} untuk ${labelTanggal(cmd.tanggal)} belum ada. Kirim bahannya.`),
      ...(cmd.tanggal === tanggalWib(now) && jamWib(now) < lap.jam ? [`Belum cut-off ${lap.jam}.00 WIB, angka sistem hari ini belum lengkap.`] : []),
      ...hasil.pertentangan.map(tanyaBentrok),
      ...tidakTerbaca.map((n) => `${n} tidak terbaca. Kirim teks atau PDF.`),
    ]
    if (pertanyaan.length && !cmd.saja) {
      await pindah('bertanya')
      // TODO(BL-10): jawaban bebas atas T-TANYA diurai Claude ke keputusan per nomor (A3); sekarang pemakai mengirim bahan lalu `buat` atau `buat saja`.
      return await balas(tTanya(p, lap, cmd.tanggal, pertanyaan))
    }
    const catatan = cmd.saja ? [...pertanyaan] : []
    for (const g of hasil.gagal || []) catatan.push(`${String(g.medan).replace(/_/g, ' ')} tidak terbaca dari bahan.`)
    const hitung = {}
    for (const m of pakai.values()) { const k = kenali(m.teks || '', m.nama_berkas || '') || 'lain'; hitung[k] = (hitung[k] || 0) + 1 }

    await pindah('membangun')
    const n = (p.versi || 0) + 1
    const dasarV = path.join(dasar, 'keluaran', 'proyek', p.id, `v${n}`) // di bawah ~/.wa-bot/keluaran: satu-satunya akar yang boleh dikirim gateway
    let berkas, isianGen
    try {
      const k = siapkanKeluaran(lap, cmd.tanggal, teks, dasarV)
      berkas = k.berkas
      isianGen = keIsianGenerator(jenis, hasil.isian)
      if (Object.keys(isianGen).length) { k.f.isian = path.join(k.kerja, 'isian.json'); tulisJson(k.f.isian, isianGen) }
      // Kunci generator bersama jalur terjadwal; tanggal mulai kejadian lama dibaca dari keluaran terjadwal (WA_MULAI_AKAR).
      const r = await jalankanGenerator(lap, cmd.tanggal, k.f, k.out, k.kerja, dep, env, { kunci: path.join(dasar, 'generator.lock'), envAnak: { WA_MULAI_AKAR: path.join(dasar, 'keluaran') } })
      for (const b of berkas) if (!ada(b.p)) throw new Error('keluaran tidak ada: ' + path.basename(b.p))
      for (const l of String(r?.stderr || '').split('\n')) { const m = l.match(/^PERINGATAN isian:\s*(.+)$/); if (m) catatan.push(`Isian diabaikan generator: ${m[1].trim()}`) }
    } catch (e) {
      await pindah('terbuka', { lempar: false })
      await kabarSekali(ctx, 'bangun', `Bot laporan ${p.id}: draf v${n} gagal dibangun. ${String(e.message).slice(0, 400)}`)
      return await balas(`${kepala(p)}\nDraf v${n} gagal dibangun. Pemilik sudah dikabari, coba lagi nanti.`)
    }
    const pdf = berkas.find((b) => b.x === 'pdf').p, pptx = berkas.find((b) => b.x === 'pptx').p
    const kunciV = bacaJson(jalurKunci(pptx), [])
    // BL-11: periksa jalan bersamaan dengan langkah PDF/pratinjau; peringatannya masuk ringkasan draf, tidak pernah menahan.
    const [png, peringatan] = await Promise.all([
      pratinjau(ctx, pdf, path.join(dasarV, 'pratinjau')),
      jalankanPeriksa(ctx, { pptx, pdf, jenis, tanggal: cmd.tanggal, angka: async () => angkaDraf(await inventarisAman(ctx, pptx), kunciV, hasil.isian) }),
    ])
    try {
      await simpanVersi(ctx, { p, n, sha, isian: { generator: isianGen, urai: hasil.isian, catatan: hasil.catatan, kunci: kunciV }, pptx, pdf, png, instruksi: cmd.saja ? 'buat saja' : 'buat', catatan: [...catatan, ...peringatan] })
      await pindah('draf')
    } catch (e) {
      if (status === 'membangun') await pindah('terbuka', { lempar: false })
      await kabarSekali(ctx, 'versi', `Bot laporan ${p.id}: versi v${n} gagal disimpan. ${String(e.message).slice(0, 300)}`)
      return await balas(`${kepala(p)}\nDraf v${n} gagal disimpan. Pemilik sudah dikabari, coba lagi nanti.`)
    }
    // D8 dan Q1: tepat 2 kiriman, gambar pratinjau slide 1 berketerangan ringkasan draf, lalu PDF. Tanpa pratinjau: ringkasan di keterangan PDF.
    // TODO(BL-12): `final` mengirim PPTX, unggah Drive dan /api/wa/hasil.
    const ringkas = tDraf(p, n, lap, cmd.tanggal, { hitung, catatan, peringatan, slide: png.length ? 1 : null })
    if (png.length) await ctx.balasFile(png[0], path.basename(png[0]), ringkas, 'image/png')
    await ctx.balasFile(pdf, path.basename(pdf), png.length ? tPdf(p, n, lap, cmd.tanggal) : ringkas, MIME.pdf)
  } catch (e) {
    if (!(e instanceof GalatClaude)) throw e
    if (['bertanya', 'membangun'].includes(status)) await pindah('terbuka', { lempar: false })
    await kabarSekali(ctx, `claude:${e.kode}`, `Bot laporan ${p.id}: panggilan Claude gagal (${e.kode}). ${String(e.message).slice(0, 300)}`)
    await balas(`${kepala(p)}\n${e.pesanPemakai}`)
  } finally {
    fs.rmSync(kerjaEkstrak, { recursive: true, force: true })
    lepas()
  }
}

// A8: v1 = slide 1; revisi = slide pertama yang berubah. Satu gambar per draf (Q1). berkas: PDF, atau PPTX bila ada slide disembunyikan (nomor halaman PDF bergeser).
async function pratinjau(ctx, pdf, dir, slide = 1) {
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    const r = await ctx.dep.exec(pyBin(ctx.env), [path.join(GENERATOR, 'ubah.py'), 'pratinjau', pdf, String(slide), dir], { cwd: GENERATOR, timeout: 120e3, maxBuffer: 20e6 })
    const png = (JSON.parse(String(r.stdout || '{}')).png || []).slice(0, 1)
    return png.filter((f) => (ctx.ada || fs.existsSync)(f))
  } catch (e) { (ctx.log || (() => {}))('pratinjau gagal', e.message); return [] }
}

async function simpanVersi(ctx, { p, n, sha, isian, ubah, pptx, pdf, png, instruksi, catatan }) {
  const f = new FormData()
  f.set('proyek', p.id); f.set('n', String(n)); f.set('wa_sha', sha); f.set('instruksi', instruksi)
  if (catatan.length) f.set('peringatan', catatan.join('\n').slice(0, 8000))
  const blob = (x, tipe) => new Blob([fs.readFileSync(x)], { type: tipe })
  f.set('isian', new Blob([JSON.stringify(isian)], { type: 'application/json' }), 'isian.json')
  if (ubah) f.set('ubah', new Blob([JSON.stringify(ubah)], { type: 'application/json' }), 'ubah.json')
  f.set('pptx', blob(pptx, MIME.pptx), path.basename(pptx))
  f.set('pdf', blob(pdf, MIME.pdf), path.basename(pdf))
  for (const x of png) { const m = path.basename(x).match(/^pratinjau-(\d+)\.png$/); if (m) f.set(`pratinjau-${m[1]}`, blob(x, 'image/png'), path.basename(x)) }
  return worker(ctx, '/api/wa/proyek/versi', { method: 'POST', form: f })
}

// ---------- deck: inventaris, kunci, angka (A5, A6) ----------
const jalurKunci = (pptx) => pptx.replace(/\.pptx$/i, '') + '.kunci.json'
// Jalur lokal deck versi n: sama dengan siapkanKeluaran(lap, tanggal, _, <dasar>/keluaran/proyek/<id>/v<n>).
const jalurDeck = (dasar, p, lap, n) => path.join(dasar, 'keluaran', 'proyek', p.id, `v${n}`, 'keluaran', p.tanggal, lap.berkas(p.tanggal) + '.pptx')
const pyUbah = (ctx, args, timeout = 120e3) => ctx.dep.exec(pyBin(ctx.env), [path.join(GENERATOR, 'ubah.py'), ...args], { cwd: GENERATOR, timeout, maxBuffer: 20e6 })
async function inventaris(ctx, pptx) {
  const v = JSON.parse(String((await pyUbah(ctx, ['inventaris', pptx])).stdout || '[]'))
  if (!Array.isArray(v)) throw new Error('inventaris bukan daftar')
  return v
}
async function inventarisAman(ctx, pptx) { try { return await inventaris(ctx, pptx) } catch (e) { (ctx.log || (() => {}))('inventaris gagal', e.message); return [] } }

const NAMA_ANGKA = { hotspot: 'Hotspot', firespot: 'Firespot', luas_terbakar: 'Luas terbakar', belum_padam: 'Luas belum padam' }
const selDari = (k) => (k?.sel == null ? null : Array.isArray(k.sel) ? { baris: Number(k.sel[0]), kolom: Number(k.sel[1]) } : { baris: Number(k.sel.baris), kolom: Number(k.sel.kolom) })
// Teks angka di deck ("1.234", "12,5 ha") dan nilai JS-nya.
const teksAngka = (t) => (String(t ?? '').match(/\d[\d.,]*/) || [''])[0].replace(/[.,]+$/, '')
const keNilai = (t) => { const s = teksAngka(t); if (!s) return null; const v = Number(s.replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.')); return Number.isFinite(v) ? v : null }
function teksKunci(k, inv) {
  const x = (inv || []).find((e) => Number(e.slide) === Number(k.slide) && e.shape === k.shape)
  if (!x) return ''
  const s = selDari(k)
  return s && Array.isArray(x.tabel) ? String(x.tabel[s.baris]?.[s.kolom] ?? '') : String(x.teks ?? '')
}
// Entri kunci yang disentuh operasi (aturan sama dengan sentuhKunci claude.mjs).
function kunciUntuk(op, kunci) {
  for (const k of kunci || []) {
    if (Number(k.slide) !== Number(op?.slide)) continue
    if (op.jenis === 'sembunyikan_slide') return k
    if (k.shape !== op.shape) continue
    const s = selDari(k)
    if (!s || op.jenis !== 'ganti_sel' || (s.baris === Number(op.baris) && s.kolom === Number(op.kolom))) return k
  }
  return null
}

// angka untuk periksa (BL-11, A7): {nama: nilai}. Kunci dari deck (shape utuh lebih dulu, bila hanya sel: dijumlah) ditambah medan angka isian (dijumlah per medan).
export function angkaDraf(inv, kunci, isianUrai = []) {
  const angka = {}, utuh = new Set()
  for (const k of kunci || []) {
    const v = keNilai(teksKunci(k, inv)), nama = k.angka || 'angka_sistem'
    if (v == null || utuh.has(nama)) continue
    if (!selDari(k)) { angka[nama] = v; utuh.add(nama) } else angka[nama] = (angka[nama] || 0) + v
  }
  for (const e of isianUrai || []) {
    if (!e || medanTerkunci(e.medan) || (kunci || []).some((k) => k.angka === e.medan)) continue
    const v = angkaBulat(e.nilai)
    if (v != null) angka[e.medan] = (angka[e.medan] || 0) + v
  }
  return angka
}

// T-TOLAK-KUNCI: nama angka, nilai, asal, tawaran catatan. ops: operasi yang ditolak karena kunci (Claude atau ubah.py).
export function tTolakKunci(ops, inv, kunci) {
  const baris = [], slide = new Set()
  for (const op of ops) {
    const k = kunciUntuk(op, kunci)
    if (k) {
      const nilai = teksAngka(teksKunci(k, inv))
      const ha = /^(luas_terbakar|belum_padam)$/.test(k.angka) && nilai ? ' ha' : ''
      baris.push(`${NAMA_ANGKA[k.angka] || 'Angka sistem'}${nilai ? ` ${nilai}${ha}` : ''} di slide ${k.slide} adalah angka sistem (dari sistem, hari D-1), tidak diubah lewat revisi.`)
      slide.add(k.slide)
    } else {
      baris.push(`Revisi${op?.slide ? ` slide ${op.slide}` : ''} menulis angka hotspot, firespot, luas terbakar, atau belum padam. Angka itu hanya dari sistem (hari D-1).`)
      if (op?.slide) slide.add(op.slide)
    }
  }
  const s = [...slide][0]
  return { baris: [...new Set(baris)], tawaran: `Bila angka lapangan berbeda, minta catatan, misalnya: tambahkan catatan di slide ${s || 'itu'} bahwa angka lapangan berbeda (tanpa menulis angka sistem).` }
}

// A8: slide yang teks inventarisnya beda dari versi sebelumnya, urut naik.
export function slideBerubah(lama, baru) {
  const peta = (inv) => {
    const m = new Map()
    for (const x of inv || []) m.set(Number(x.slide), (m.get(Number(x.slide)) || '') + JSON.stringify([x.shape, x.teks ?? '', x.tabel ?? null]))
    return m
  }
  const a = peta(lama), b = peta(baru)
  return [...new Set([...a.keys(), ...b.keys()])].filter((n) => a.get(n) !== b.get(n)).sort((x, y) => x - y)
}

// Satu baris ringkasan per operasi yang diterapkan (fakta dari operasi, bukan kalimat Claude).
function uraiOp(op) {
  const t = (x) => `"${rapi(x, 70)}"`
  switch (op.jenis) {
    case 'ganti_teks': return `Slide ${op.slide}: ${t(op.teks_lama)} diganti ${t(op.teks_baru)}.`
    case 'ganti_sel': return `Slide ${op.slide}: sel baris ${op.baris} kolom ${op.kolom} diganti ${t(op.teks_baru)}.`
    case 'tambah_baris': return `Slide ${op.slide}: baris baru ${t(op.teks)}.`
    case 'hapus_baris': return `Slide ${op.slide}: baris ${t(op.teks_lama)} dihapus.`
    case 'catatan': return `Slide ${op.slide}: catatan ${t(op.teks)}.`
    case 'sembunyikan_slide': return `Slide ${op.slide} disembunyikan.`
    case 'tampilkan_slide': return `Slide ${op.slide} ditampilkan lagi.`
    default: return `Slide ${op.slide}: ${op.jenis}.`
  }
}
const alasanKunci = (a) => /terkunci|angka sistem/i.test(String(a || ''))

// ---------- periksa (BL-11): modul opsional ./periksa.mjs ----------
async function muatPeriksa(ctx) {
  if (ctx.dep && 'periksa' in ctx.dep) return ctx.dep.periksa || null // uji dan pemanggil boleh menyuntik atau mematikan (null)
  try { return (await import('./periksa.mjs')).periksa || null } catch (e) {
    if (e?.code !== 'ERR_MODULE_NOT_FOUND') (ctx.log || (() => {}))('periksa tidak termuat', e.message)
    return null
  }
}
// -> daftar kalimat peringatan, ditambah pelanggaran gerbang (gagal: format slide, bahasa) paling banyak 3 baris + "dan N lainnya".
// Galat, modul tidak ada, atau lewat PERIKSA_MS = [] (tidak pernah menahan draf).
async function jalankanPeriksa(ctx, { pptx, pdf, jenis, tanggal, angka }) {
  const log = ctx.log || (() => {})
  const fn = await muatPeriksa(ctx)
  if (typeof fn !== 'function') return []
  let jam
  try {
    const nilai = typeof angka === 'function' ? await angka() : angka
    const kerja = Promise.resolve(fn({ pptx, pdf, jenis, tanggal, angka: nilai, env: ctx.env, dep: ctx.dep.periksaDep || {} }))
    const batas = new Promise((r) => { jam = setTimeout(() => { log('periksa lewat batas waktu'); r(null) }, ctx.periksaMs ?? PERIKSA_MS); jam.unref?.() })
    const h = await Promise.race([kerja, batas])
    if (h && h.ms != null) log('periksa selesai', `${h.ms} ms`)
    const pr = (Array.isArray(h?.peringatan) ? h.peringatan : []).map((x) => rapi(x, 200)).filter(Boolean).slice(0, 8)
    const gg = (Array.isArray(h?.gagal) ? h.gagal : []).map((x) => rapi(x, 160)).filter(Boolean)
    return [...pr, ...gg.slice(0, 3).map((x) => `Gerbang: ${x}`), ...(gg.length > 3 ? [`Gerbang: dan ${gg.length - 3} lainnya.`] : [])]
  } catch (e) { log('periksa gagal', e.message); return [] } finally { clearTimeout(jam) }
}

// ---------- versi (rute GET /api/wa/proyek/versi) ----------
const versiDaftar = async (ctx, p, sha) => (await worker(ctx, `/api/wa/proyek/versi?id=${encodeURIComponent(p.id)}&wa_sha=${sha}`)).versi || []
const versiRinci = (ctx, p, n, sha) => worker(ctx, `/api/wa/proyek/versi?id=${encodeURIComponent(p.id)}&n=${n}&wa_sha=${sha}`)
const opsDari = (rinci) => (Array.isArray(rinci?.ubah?.operasi) ? rinci.ubah.operasi : [])
// PPTX versi n di mesin; hilang (mesin lain, dibersihkan) = unduh dari R2 lewat rute.
async function pastikanPptx(ctx, p, lap, n, sha) {
  const f = jalurDeck(ctx.dasar || RUMAH, p, lap, n)
  if ((ctx.ada || fs.existsSync)(f)) return f
  const { env, dep } = ctx
  const r = await dep.fetch(`${W(env)}/api/wa/proyek/versi?id=${encodeURIComponent(p.id)}&n=${n}&wa_sha=${sha}&berkas=${encodeURIComponent(path.basename(f))}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` }, signal: AbortSignal.timeout(WAKTU_WORKER) })
  if (!r.ok) throw new Error(`PPTX v${n} tidak ada (HTTP ${r.status})`)
  fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 })
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()), { mode: 0o600 })
  return f
}

// Proyek aktif pengirim dari indeks lokal, terbaru dulu; yang tidak aktif lagi dibuang dari indeks.
// bersihkan: false = tanpa menulis indeks (klasifikasi tanpa efek samping); rute {id} hanya membaca.
async function proyekPengirim(ctx, sha, saring = () => true, { bersihkan = true } = {}) {
  const dasar = ctx.dasar || RUMAH
  const ix = bacaJson(indeksP(dasar), { proyek: {} })
  const buang = (id) => { if (bersihkan) hapusIndeks(dasar, id) }
  const ada = []
  for (const [id, e] of Object.entries(ix.proyek)) {
    if (e.sha !== sha) continue
    let p
    try { p = (await proyekBuka(ctx, { id, wa_sha: sha })).proyek } catch (x) { if (/HTTP 404/.test(x.message)) buang(id); continue }
    if (!AKTIF.includes(p.status)) { buang(id); continue }
    if (saring(p)) ada.push(p)
  }
  return ada.sort((a, b) => Number(b.diubah || 0) - Number(a.diubah || 0))
}

const jamLabel = (ms) => {
  const t = Number(ms) < 1e12 ? Number(ms) * 1000 : Number(ms)
  const d = new Date(t)
  return `${labelTanggal(tanggalWib(d))} ${new Date(t + 7 * 3600e3).toISOString().slice(11, 16).replace(':', '.')}`
}

// ---------- revisi dan balik (ALUR B) ----------
// opsi.balik = nomor versi yang isinya disalin (tanpa Claude). Selain itu pesan.teks = kalimat revisi.
async function revisi(pesan, dari, sha, p, ctx, opsi = {}) {
  const { env, dep, balas } = ctx
  const dasar = ctx.dasar || RUMAH, log = ctx.log || (() => {}), ada = ctx.ada || fs.existsSync
  const lap = lapDari(p.jenis)
  if (!lap) return balas(`${kepala(p, p.versi || null)}\nJenis ${p.jenis} belum bisa direvisi lewat bot.`)
  const berkasKunci = lockProyek(dasar, p.id)
  if (p.status === 'membangun') {
    if (kunciHidup(berkasKunci)) return balas(`${kepala(p, p.versi || null)}\nSedang dibangun, tunggu sebentar.`)
    p = await pulihkan(ctx, p, sha)
  }
  if (p.status !== 'draf' || !(p.versi > 0)) return balas(`${kepala(p, p.versi || null)}\nBelum ada draf untuk ${opsi.balik ? 'dikembalikan' : 'direvisi'}. Ketik buat dulu.`)
  const m = p.versi, n = m + 1
  if (opsi.balik != null) {
    if (opsi.balik < 1 || opsi.balik > m) return balas(`${kepala(p, m)}\nVersi v${opsi.balik} tidak ada. Versi terakhir v${m}, ketik versi untuk riwayatnya.`)
    if (opsi.balik === m) return balas(`${kepala(p, m)}\nv${m} sudah versi terakhir.`)
  }
  const lepas = kunciProses(berkasKunci)
  if (!lepas) return balas(`${kepala(p, m)}\nSedang dibangun, tunggu sebentar.`)
  let status = p.status
  const pindah = async (ke, o) => { if (status === ke) return true; const ok = await pindahStatus(ctx, p, ke, sha, o); if (ok) status = ke; return ok }
  const keDraf = async (teks) => { await pindah('draf'); return balas(teks) }
  try {
    await pindah('membangun')
    const akhir = await versiRinci(ctx, p, m, sha)
    const opsLama = opsDari(akhir)
    const isianV = akhir?.isian && typeof akhir.isian === 'object' ? akhir.isian : {}
    const pptxLama = await pastikanPptx(ctx, p, lap, m, sha)
    const kunciSimpan = Array.isArray(akhir?.ubah?.kunci) ? akhir.ubah.kunci : Array.isArray(isianV.kunci) ? isianV.kunci : null
    const kunciLama = bacaJson(jalurKunci(pptxLama), null) ?? kunciSimpan
    if (!Array.isArray(kunciLama)) {
      // Tanpa daftar kunci angka sistem tidak ada yang menjaga K4: revisi ditolak, tidak pernah dijalankan tanpa kunci.
      await kabarSekali(ctx, 'kunci', `Bot laporan ${p.id}: daftar kunci angka sistem v${m} tidak ada di mesin maupun versi tersimpan; revisi ditolak.`)
      return await keDraf(`${kepala(p, m)}\nRevisi belum bisa diproses: daftar angka sistem yang dikunci untuk draf ini tidak ditemukan. Pemilik sudah dikabari.`)
    }
    const invLama = await inventaris(ctx, pptxLama)

    let ops, baru = [], tolakKunci = [], tolakLain = [], instruksi, kalimat = null
    if (opsi.balik != null) {
      ops = opsDari(await versiRinci(ctx, p, opsi.balik, sha))
      instruksi = `balik v${opsi.balik}`
    } else {
      kalimat = String(pesan.teks || '').trim().slice(0, MAKS_KALIMAT)
      const r = await klien(ctx).operasi(invLama, kunciLama, opsLama.map((o) => JSON.stringify(o)), kalimat)
      if (r.tanya?.length) {
        return await keDraf([kepala(p, m), 'Revisi belum diterapkan, ada yang perlu dipastikan:',
          ...r.tanya.map((q, i) => `${i + 1}. ${rapi(q.pertanyaan, 300)}`), 'Balas dengan kalimat revisi yang lebih rinci.'].join('\n'))
      }
      tolakKunci = (r.ditolak || []).filter((x) => x.kunci).map((x) => x.op)
      tolakLain = (r.ditolak || []).filter((x) => !x.kunci)
      baru = r.diterima || []
      if (!baru.length) {
        const tk = tolakKunci.length ? tTolakKunci(tolakKunci, invLama, kunciLama) : null
        return await keDraf([kepala(p, m), 'Revisi tidak diterapkan, draf tetap v' + m + '.',
          ...(tk ? [...tk.baris, tk.tawaran] : []),
          ...(tolakLain.length ? [`Bagian lain belum bisa dipetakan ke slide (${rapi(tolakLain[0].alasan, 80)}). Sebut nomor slide dan teks yang diganti.`] : []),
          ...(!tk && !tolakLain.length ? ['Tidak ada perubahan yang bisa dibaca dari kalimat itu. Sebut nomor slide dan teks yang diganti.'] : [])].join('\n'))
      }
      ops = [...opsLama, ...baru]
      instruksi = `revisi: ${rapi(samarkan(kalimat), 480)}`
    }

    // Bangun ulang dari bahan + isian versi terakhir (D1, D6), lalu operasi 1..n.
    const lingkup = lingkupBahan(env, dari, sha)
    const bahan = await ambilBahan({ env, dep: { ...dep, fetch: fetchLingkup(dep, lingkup.boleh) }, tanggal: p.tanggal, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log })
    const { teks } = await bahan.pilihSesuai(lap)
    const dasarV = path.join(dasar, 'keluaran', 'proyek', p.id, `v${n}`)
    const catatan = []
    let pptx, pdf, lewat = [], terpakai = ops
    const gagalBangun = async (e) => {
      await pindah('draf', { lempar: false })
      await kabarSekali(ctx, 'bangun', `Bot laporan ${p.id}: revisi v${n} gagal dibangun. ${String(e.message).slice(0, 400)}`)
      return balas(`${kepala(p, m)}\nRevisi v${n} gagal dibangun. Pemilik sudah dikabari, draf v${m} tetap berlaku.`)
    }
    try {
      const k = siapkanKeluaran(lap, p.tanggal, teks, dasarV)
      const isianGen = isianV.generator && typeof isianV.generator === 'object' ? isianV.generator : {}
      if (Object.keys(isianGen).length) { k.f.isian = path.join(k.kerja, 'isian.json'); tulisJson(k.f.isian, tanpaKunci(isianGen)) }
      const r = await jalankanGenerator(lap, p.tanggal, k.f, k.out, k.kerja, dep, env, { kunci: path.join(dasar, 'generator.lock'), envAnak: { WA_MULAI_AKAR: path.join(dasar, 'keluaran') } })
      pdf = k.berkas.find((b) => b.x === 'pdf').p; pptx = k.berkas.find((b) => b.x === 'pptx').p
      if (!ada(pptx)) throw new Error('keluaran tidak ada: ' + path.basename(pptx))
      for (const l of String(r?.stderr || '').split('\n')) { const x = l.match(/^PERINGATAN isian:\s*(.+)$/); if (x) catatan.push(`Isian diabaikan generator: ${x[1].trim()}`) }
      if (ops.length) {
        const opsF = path.join(k.kerja, 'operasi.json'), keluar = path.join(k.kerja, 'ubah.pptx')
        let kunciF = jalurKunci(pptx)
        // Generator tidak menulis kunci: pakai kunci versi terakhir lewat berkas sementara; ubah.py tidak pernah jalan tanpa kunci ('-').
        if (!ada(kunciF)) { kunciF = path.join(k.kerja, 'kunci-versi.json'); tulisJson(kunciF, kunciLama) }
        tulisJson(opsF, ops)
        const t = JSON.parse(String((await pyUbah(ctx, ['terapkan', pptx, opsF, kunciF, keluar], 300e3)).stdout || '{}'))
        if (!ada(keluar)) throw new Error('ubah.py terapkan tidak menulis PPTX')
        fs.renameSync(keluar, pptx)
        lewat = Array.isArray(t.dilewati) ? t.dilewati : []
        const ke = new Set(lewat.map((x) => Number(x.ke)))
        terpakai = ops.filter((_, i) => !ke.has(i))
      }
    } catch (e) { return await gagalBangun(e) }

    const awalBaru = ops.length - baru.length
    const baruJalan = terpakai.filter((o) => ops.indexOf(o) >= awalBaru)
    const lewatKunci = lewat.filter((x) => alasanKunci(x.alasan)).map((x) => x.op)
    const lewatTeks = lewat.filter((x) => !alasanKunci(x.alasan))
    const kunciBaru = bacaJson(jalurKunci(pptx), null) ?? kunciLama
    const invBaru = await inventarisAman(ctx, pptx)
    const tk = [...tolakKunci, ...lewatKunci].length ? tTolakKunci([...tolakKunci, ...lewatKunci], invBaru.length ? invBaru : invLama, kunciBaru.length ? kunciBaru : kunciLama) : null
    const kalimatLewat = lewatTeks.map((x) => `${uraiOp(x.op || {}).replace(/\.$/, '')}: ${Number(x.ke) < awalBaru ? 'perubahan lama, ' : ''}teks di slide sudah berbeda. Kirim ulang revisinya bila masih perlu.`)
    if (opsi.balik == null && !baruJalan.length) {
      // Tidak ada perubahan baru yang lolos: versi tidak bertambah, berkas bangunan ini dibuang.
      fs.rmSync(dasarV, { recursive: true, force: true })
      return await keDraf([kepala(p, m), `Revisi tidak diterapkan, draf tetap v${m}.`, ...(tk ? [...tk.baris, tk.tawaran] : []), ...kalimatLewat].join('\n'))
    }

    const sembunyi = terpakai.some((o) => o.jenis === 'sembunyikan_slide')
    const berubah = slideBerubah(invLama, invBaru)
    const slide = berubah[0] || baruJalan.find((o) => o.slide)?.slide || terpakai.find((o) => o.slide)?.slide || 1
    // PDF (bila deck diubah) dan periksa jalan bersamaan (BL-11); periksa tidak pernah menahan.
    const langkahPdf = (async () => {
      if (!ops.length) return
      fs.rmSync(pdf, { force: true })
      await dep.exec(pyBin(env), [path.join(GENERATOR, 'pdf.py'), pptx, path.dirname(pdf)], { cwd: GENERATOR, timeout: 300e3, maxBuffer: 20e6 })
      if (!ada(pdf)) throw new Error('PDF tidak terbentuk: ' + path.basename(pdf))
    })()
    const langkahPeriksa = jalankanPeriksa(ctx, { pptx, pdf, jenis: p.jenis, tanggal: p.tanggal, angka: () => angkaDraf(invBaru, kunciBaru, isianV.urai) })
    let peringatan
    try { [, peringatan] = await Promise.all([langkahPdf, langkahPeriksa]) } catch (e) { return await gagalBangun(e) }
    const png = await pratinjau(ctx, sembunyi ? pptx : pdf, path.join(dasarV, 'pratinjau'), slide)

    const ubah = { operasi: terpakai, baru: baruJalan, dari_versi: m, ...(opsi.balik != null ? { balik: opsi.balik } : {}),
      dilewati: lewat.map((x) => ({ ke: x.ke, alasan: x.alasan })), ditolak: [...tolakKunci.map((op) => ({ op, kunci: true })), ...tolakLain], kunci: kunciBaru }
    const perubahan = opsi.balik != null ? [`Isi sama dengan v${opsi.balik}.`] : baruJalan.map(uraiOp)
    const tolak = tk ? [...tk.baris, tk.tawaran] : []
    try {
      await simpanVersi(ctx, { p, n, sha, isian: { ...isianV, kunci: kunciBaru }, ubah, pptx, pdf, png, instruksi,
        catatan: [...perubahan, ...tolak, ...kalimatLewat, ...catatan, ...peringatan] })
      await pindah('draf')
    } catch (e) {
      if (status === 'membangun') await pindah('draf', { lempar: false })
      await kabarSekali(ctx, 'versi', `Bot laporan ${p.id}: versi v${n} gagal disimpan. ${String(e.message).slice(0, 300)}`)
      return await balas(`${kepala(p, m)}\nRevisi v${n} gagal disimpan. Pemilik sudah dikabari, draf v${m} tetap berlaku.`)
    }
    // D8 dan Q1: tepat 2 kiriman, pratinjau slide pertama yang berubah lalu PDF berketerangan T-DRAF. Tanpa pratinjau: PDF saja.
    const ringkas = tDrafRevisi(p, n, lap, p.tanggal, { perubahan, tolak, lewat: kalimatLewat, catatan, peringatan })
    if (png.length) await ctx.balasFile(png[0], path.basename(png[0]), tPratinjau(p, n, slide), 'image/png')
    await ctx.balasFile(pdf, path.basename(pdf), ringkas, MIME.pdf)
  } catch (e) {
    if (status === 'membangun') await pindah('draf', { lempar: false })
    if (!(e instanceof GalatClaude)) throw e
    await kabarSekali(ctx, `claude:${e.kode}`, `Bot laporan ${p.id}: panggilan Claude gagal (${e.kode}). ${String(e.message).slice(0, 300)}`)
    await balas(`${kepala(p, m)}\n${e.pesanPemakai}`)
  } finally { lepas() }
}

// ---------- versi, pptx, batal ----------
async function perintahProyek(cmd, dari, sha, ctx) {
  const { balas } = ctx
  const ps = await proyekPengirim(ctx, sha, (p) => cmd.aksi === 'batal' || p.versi > 0)
  const p = ps.find((x) => x.status === 'draf') || ps[0]
  if (!p) return balas(cmd.aksi === 'batal' ? 'Tidak ada proyek laporan yang terbuka.' : 'Belum ada draf. Kirim bahan lalu ketik buat harian atau buat penanganan.')
  const lap = lapDari(p.jenis)
  const nama = lap ? judul(lap, p.tanggal) : p.jenis
  if (cmd.aksi === 'balik') return revisi(null, dari, sha, p, ctx, { balik: cmd.n })
  if (cmd.aksi === 'versi') {
    const v = await versiDaftar(ctx, p, sha)
    const baris = v.map((x) => `v${x.n} ${jamLabel(x.dibuat)}, ${rapi(x.instruksi || 'buat', 80)}`)
    return balas([kepala(p, p.versi), `Riwayat versi ${nama}:`, ...baris, 'Ketik balik vN untuk membuat versi baru yang sama dengan vN.'].join('\n'))
  }
  if (cmd.aksi === 'pptx') {
    if (!lap) return balas(`${kepala(p, p.versi)}\nPPTX jenis ini belum bisa dikirim lewat bot.`)
    const f = await pastikanPptx(ctx, p, lap, p.versi, sha)
    return ctx.balasFile(f, path.basename(f), `${kepala(p, p.versi)}\nPPTX draf ${nama}.`, MIME.pptx) // dihitung limiter seperti kiriman lain (Q1)
  }
  // batal
  if (p.status === 'membangun' && kunciHidup(lockProyek(ctx.dasar || RUMAH, p.id))) return balas(`${kepala(p, p.versi || null)}\nSedang dibangun, tunggu sebentar lalu ketik batal lagi.`)
  await pindahStatus(ctx, p, 'batal', sha)
  hapusIndeks(ctx.dasar || RUMAH, p.id)
  return balas(`${kepala(p, p.versi || null)}\n${nama} dibatalkan, tanpa unggah. Ketik buat untuk memulai lagi.`)
}

// ---------- status tanpa tanggal ----------
async function status(dari, sha, ctx) {
  const dasar = ctx.dasar || RUMAH
  const ix = bacaJson(indeksP(dasar), { proyek: {} })
  const blok = []
  for (const [id, e] of Object.entries(ix.proyek)) {
    if (e.sha !== sha) continue
    let p
    try { p = (await proyekBuka(ctx, { id, wa_sha: sha })).proyek } catch (x) { if (/HTTP 404/.test(x.message)) hapusIndeks(dasar, id); continue }
    if (!AKTIF.includes(p.status)) { hapusIndeks(dasar, id); continue }
    const lap = lapDari(p.jenis)
    const lanjut = { terbuka: 'Kirim bahan lalu ketik buat.', bertanya: 'Menunggu jawaban atau buat saja.', membangun: 'Sedang dibangun.', draf: 'Balas dengan revisi, atau ketik final.' }[p.status]
    blok.push(`${kepala(p, p.versi || null)}\n${lap ? judul(lap, p.tanggal) : p.jenis}, status ${p.status}. ${lanjut}`)
  }
  return ctx.balas(blok.length ? blok.join('\n\n') : 'Belum ada proyek laporan yang terbuka. Kirim bahan lalu ketik buat harian atau buat penanganan.')
}

// ---------- bahan masuk (Q6) ----------
async function tambahBahan(pesan, dari, sha, ctx) {
  const kenali = ctx.kenali || jenisWa.kenali
  const k = kenali(pesan.teks || '', pesan.nama_berkas || '')
  if (!k) return { status: 'menunggu buat' } // jenis tak dikenali (foto, PDF lain): dipakai saat `buat` dari /api/wa/masuk
  const calon = LAPORAN.filter((l) => [...l.butuh, ...(l.pilihan || [])].includes(k))
  if (calon.length !== 1) return { status: 'menunggu buat' } // bahan bersama (BMKG pagi) menunggu `buat` menentukan jenisnya
  const tanggal = (ctx.tanggalIsi || jenisWa.tanggalIsi || (() => null))(pesan.teks || '', k) || tanggalWib(ctx.now || new Date())
  const { proyek: p } = await proyekBuka(ctx, { wa_sha: sha, jenis: calon[0].id, tanggal, bahan: [{ wa_id: String(pesan.wa_id), jenis_bahan: k }] })
  catatIndeks(ctx.dasar || RUMAH, p, sha, dari)
  // TODO(BL-10): bahan baru untuk proyek draf memicu tawaran bangun ulang.
  return { status: 'ditambah', proyek: p.id } // tanpa balasan: limiter 8 kiriman per tujuan per hari (Q1)
}

// ---------- Q7: kedaluwarsa (fungsi saja; penjadwalnya di tiket lain) ----------
export async function kedaluwarsa(ctx) {
  const dasar = ctx.dasar || RUMAH, now = (ctx.now || new Date()).getTime()
  const ix = bacaJson(indeksP(dasar), { proyek: {} })
  const hasil = []
  for (const [id, e] of Object.entries(ix.proyek)) {
    let p
    try { p = (await proyekBuka(ctx, { id, wa_sha: e.sha })).proyek } catch { continue }
    if (!AKTIF.includes(p.status)) { hapusIndeks(dasar, id); continue }
    const umur = now - Number(p.diubah || 0)
    if (p.status === 'membangun' ? (umur < MEMBANGUN_BASI_MS || kunciHidup(lockProyek(dasar, id))) : umur < KEDALUWARSA_MS) continue
    if (!await pindahStatus(ctx, p, 'kedaluwarsa', e.sha, { lempar: false })) continue
    hapusIndeks(dasar, id)
    const lap = lapDari(p.jenis)
    try { await (ctx.kirimKe || ((t, s) => ctx.dep.kirimTeks(t, s)))(e.dari, `${kepala(p, p.versi || null)}\n${lap ? judul(lap, p.tanggal) : p.jenis} ditutup otomatis karena ${p.status === 'membangun' ? 'pembangunan terhenti lebih dari 1 jam' : '24 jam tanpa aktivitas'}, tanpa unggah. Ketik buat untuk memulai lagi.`) } catch {}
    hasil.push(id)
  }
  return hasil
}

// ---------- pintu masuk ----------
// Calon revisi: teks saja, bukan diteruskan (forward selalu bahan), bukan perintah, bukan bahan yang dikenali. Murni, tanpa Worker.
function calonRevisi(pesan, ctx) {
  const teks = String(pesan?.teks || '').trim()
  return !pesan.ada_berkas && pesan.diteruskan !== true && !!teks && !parsePerintah(teks, ctx.now || new Date()) &&
    !(ctx.kenali || jenisWa.kenali)(teks, pesan.nama_berkas || '')
}
const drafPengirim = async (ctx, sha, o) => (await proyekPengirim(ctx, sha, (p) => p.status === 'draf' && p.versi > 0, o))[0] || null

// Untuk gateway (BL-09) sebelum meneruskan pesan teks ke Worker: 'perintah' | 'revisi' | 'bahan'. Tanpa efek samping (hanya membaca proyek).
// 'revisi' hanya bila pengirim memegang proyek draf dan calonRevisi; kalimat revisi tidak diteruskan ke Worker, jadi tidak pernah jadi bahan.
export async function klasifikasi(pesan, ctx) {
  if (!pesan || pesan.lama) return 'bahan'
  if (!pesan.ada_berkas && parsePerintah(pesan.teks, ctx.now || new Date())) return 'perintah'
  if (!calonRevisi(pesan, ctx)) return 'bahan'
  const dari = normalWa(pesan.dari), sha = dari && !/@g\.us$/.test(dari) ? waSha(dari, ctx.env.WA_GARAM) : null
  if (!sha) return 'bahan'
  try { return (await drafPengirim(ctx, sha, { bersihkan: false })) ? 'revisi' : 'bahan' } catch { return 'bahan' }
}

// pesan: {dari, teks, wa_id?, nama_berkas?, ada_berkas?, diteruskan?, lama?}. Revisi tidak butuh wa_id (gateway tidak meneruskannya ke Worker). ctx: {env, dep, now, dasar, log, balas, balasFile, kabariPemilik?, kirimKe?, kenali?, tanggalIsi?, ada?}.
// Kembalian: {status} untuk pemanggil (gateway, BL-09).
export async function tangani(pesan, ctx) {
  if (pesan?.lama) return { status: 'susulan dibuang' } // K11: pesan saat mesin mati tidak masuk proyek. TODO(BL-14): T-TERLEWAT sekali per nomor.
  const dari = normalWa(pesan?.dari)
  if (!dari || /@g\.us$/.test(dari)) return { status: 'bukan pemakai' }
  const sha = waSha(dari, ctx.env.WA_GARAM)
  const cmd = pesan.ada_berkas ? null : parsePerintah(pesan.teks, ctx.now || new Date())
  if (cmd?.aksi === 'bantuan') {
    const pemilik = new Set(daftar(ctx.env.PEMILIK).map(normalWa))
    await ctx.balas(BANTUAN + (pemilik.has(dari) ? '\n' + BANTUAN_PEMILIK : ''))
    return { status: 'bantuan' }
  }
  if (!sha) {
    if (cmd) { await ctx.balas('Bot laporan belum siap, pemilik sudah dikabari.'); await kabarSekali(ctx, 'garam', 'Bot laporan: WA_GARAM belum diisi di scripts/wa/.env.') }
    return { status: 'belum siap' }
  }
  let jawab = !!cmd // galat dibalas ke pengirim hanya untuk perintah dan revisi, tidak untuk bahan biasa
  try {
    if (cmd?.aksi === 'status') { await status(dari, sha, ctx); return { status: 'status' } }
    if (cmd?.aksi === 'buat') { await buat(cmd, dari, sha, ctx); return { status: 'buat' } }
    if (cmd?.aksi === 'final') { await ctx.balas('Perintah final belum tersedia, segera menyusul.'); return { status: 'final belum tersedia' } } // TODO(BL-12)
    if (cmd) { await perintahProyek(cmd, dari, sha, ctx); return { status: cmd.aksi } }
    // Perintah tidak pernah sampai ke sini (tidak pernah ke Claude). Revisi (ALUR B): calonRevisi dari pemegang proyek draf; forward dan bahan dikenali tetap bahan.
    if (calonRevisi(pesan, ctx)) {
      const draf = await drafPengirim(ctx, sha)
      if (draf) { jawab = true; await revisi(pesan, dari, sha, draf, ctx); return { status: 'revisi', proyek: draf.id } }
    }
    if (pesan.wa_id != null) return await tambahBahan(pesan, dari, sha, ctx)
    return { status: 'diabaikan' }
  } catch (e) {
    (ctx.log || (() => {}))('[proyek] galat', e.message)
    await kabarSekali(ctx, 'proyek', `Bot laporan: perintah gagal. ${String(e.message).slice(0, 400)}`)
    if (jawab) await ctx.balas('Perintah gagal diproses. Pemilik sudah dikabari, coba lagi nanti.')
    return { status: 'galat', alasan: e.message }
  }
}

// --kering: cek bahan rahasia dan alat tanpa memanggil Claude, Worker, atau WhatsApp (BL-13).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  muatEnv()
  const env = process.env
  const cek = { ANTHROPIC_API_KEY: !!env.ANTHROPIC_API_KEY, WA_GARAM: !!env.WA_GARAM, WA_MESIN: !!env.WA_MESIN, generator: fs.existsSync(path.join(GENERATOR, 'ubah.py')) }
  console.log(JSON.stringify(cek))
  process.exit(Object.values(cek).every(Boolean) ? 0 : 1)
}
