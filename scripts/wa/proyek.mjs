// Mesin proyek bot laporan WA (BL-08; data/kajian-bnpb/bot-laporan: K2, K4, K8, K11, K15, D1 sampai D11, Q6, Q7, Q13, Q14).
// tangani(pesan, ctx): bahan masuk ke proyek terbuka pengirim, `buat [jenis] [tanggal]`, `buat saja`, `status`, `bantuan`.
// Alur buat: bahan pengirim (Q6) -> jenis (A2) -> kurang dan bentrok (A3) -> T-TANYA atau bangun -> ekstraksi teks (K15) -> Claude urai ->
// isian.json -> generator --isian (otomatis.mjs) -> pratinjau slide 1-3 (ubah.py) -> PDF (PPTX hanya saat final atau `pptx`, Q1) -> versi v1 -> draf.
// Revisi (BL-10; D1, D3, D6, D8, A5, A6, A8): kalimat bebas pemegang proyek `draf` -> membangun -> inventaris deck terakhir + kunci + operasi lama -> Claude operasi
// -> `tanya` dibalas sebagai pertanyaan (draf lagi) | semua ditolak kunci: T-TOLAK-KUNCI tanpa versi baru | selain itu generator dibangun ulang dari bahan + isian,
// operasi 1..n diterapkan (ubah.py terapkan), PDF bersamaan dengan periksa (BL-11), pratinjau slide pertama yang berubah, versi n+1 dengan ubah.json, draf.
// `versi` riwayat dengan jam; `balik vN` = versi baru dengan operasi vN (append-only); `pptx` kirim PPTX terakhir; `batal` menutup proyek.
// `final` (BL-12): PPTX + PDF ke pemegang, Drive <tanggal>/Revisi N/ (tanpa /api/wa/hasil, D13), ditutup + T-FINAL; gagal diulang ulangFinal() tiap 10 menit.
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

// Label tampil: label JENIS_LAPORAN, kecuali yang di LABEL_KHUSUS (laporan Mensesneg dipakai bot sebagai laporan penanganan lengkap).
const LABEL_KHUSUS = { karhutla_mensesneg: 'Laporan penanganan lengkap' }
const labelBahan = (k) => LABEL_KHUSUS[k] || jenisWa.JENIS_LAPORAN.find((j) => j.kunci === k)?.label || k
// Semua jenis bahan milik laporan: wajib, tambahan, dan padanan wajib (lap.setara).
const jenisLap = (lap) => [...lap.butuh, ...(lap.pilihan || []), ...Object.values(lap.setara || {}).flat()]
const labelWajib = (lap, k) => [labelBahan(k), ...(lap.setara?.[k] || []).map((a) => { const l = labelBahan(a); return l[0].toLowerCase() + l.slice(1) })].join(' atau ')
// Perintah satu baris pendek: huruf kecil, spasi tunggal, ekor bukan huruf atau angka dibuang ("lanjut\\", "final!", "lanjut.").
export const normalPerintah = (teks) => String(teks ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+$/u, '').replace(/\s+/g, ' ')
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
  const t = normalPerintah(asli)
  if (!t || t.length > 60 || /\n/.test(asli)) return null
  if (t === 'bantuan') return { aksi: 'bantuan' }
  if (t === 'ulangi') return { aksi: 'ulangi' } // ulangi langkah terakhir yang gagal (bangun atau revisi)
  if (t === 'panduan') return { aksi: 'panduan' } // infografis panduan bot, dikirim sebagai dokumen PNG supaya tidak dikompres WA
  if (t === 'status') return { aksi: 'status' }
  if (t === 'lanjut') return { aksi: 'lanjut' } // K17: bangun proyek terbuka pengirim (bot selalu menunggu kata ini)
  if (t === 'hitung' || t === 'tunggu') return { aksi: 'satelit', kata: t } // K18: menjawab pilihan data satelit; tanpa pilihan hidup = petunjuk
  if (['versi', 'pptx', 'batal', 'final'].includes(t)) return { aksi: t }
  const k = t.match(/^(versi|pptx|batal|final) (p-\d{6}-\d{2})$/) // berkode: pemegang beberapa draf memilih proyeknya
  if (k) return { aksi: k[1], id: k[2].toUpperCase() }
  if (/^[1-4][\s.]*$/.test(t)) return { aksi: 'menu', n: Number(t[0]) } // menu bernomor di akhir draf; di luar draf dijawab petunjuk
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
  '*Cara pakai bot laporan*',
  '',
  '*Membuat laporan*',
  '- *buat harian*: mulai laporan kejadian bencana',
  '- *buat penanganan*: mulai laporan penanganan karhutla',
  '- Kirim atau teruskan bahan yang diminta',
  '- *lanjut*: buat laporan dari bahan ada',
  '',
  '*Saat draf*',
  '- *1* atau *final*: kirim versi final',
  '- *2* atau *pptx*: minta berkas PPTX',
  '- *3* atau *versi*: lihat riwayat versi',
  '- *4* atau *batal*: batalkan proyek',
  '- *balik v2*: pakai isi versi 2',
  '- Kalimat biasa: revisi draf',
  '',
  '*Lainnya*',
  '- *status*: proyek yang masih terbuka',
  '- *ulangi*: coba lagi langkah yang gagal',
  '- *batal*: batalkan proyek kapan saja',
  '- *bantuan*: tampilkan pesan ini',
  '- *panduan*: kirim gambar panduan lengkap',
  '',
  'Contoh: *buat harian kemarin*, kirim bahannya, lalu *lanjut*',
  'Tanggal bisa: kemarin, 26 okt, 26/10, 2026-10-26.',
].join('\n')
const BANTUAN_PEMILIK = ['', '*Khusus pemilik*', '- *kirim ulang harian 26 okt*: kirim ulang berkas', '- *status 26 okt*: rekap bahan per tanggal'].join('\n')

// ---------- T-SAPA: obrolan pendek dari nomor terdaftar tanpa proyek (pemilik 18 Nov 2026) ----------
// Bukan perintah, tidak diteruskan, tanpa lampiran, satu baris paling banyak 80 huruf, tidak dikenali sebagai bahan, dan pengirim tidak memegang
// proyek terbuka, bertanya, atau draf. Sekali per pengirim per 6 jam (~/.wa-bot/proyek/sapa.json); di dalam jendela itu diam.
export const T_SAPA = [
  '*Halo, ini Bot Laporan BNPB*',
  'Bot ini menyusun laporan resmi BNPB dari bahan yang Anda kirim, lalu menyimpannya ke Google Drive Tim IT.',
  '',
  '*Mulai dengan mengetik:*',
  '- *buat harian*: laporan kejadian bencana harian',
  '- *buat penanganan*: laporan penanganan karhutla',
  '',
  '*Butuh bantuan?*',
  '- *bantuan*: daftar perintah',
  '- *panduan*: gambar panduan lengkap',
].join('\n')
const SAPA_JEDA_MS = 6 * 3600e3, SAPA_MAKS = 80
const sapaP = (dasar) => path.join(dirProyek(dasar), 'sapa.json')
async function sapaBila(pesan, sha, ctx) {
  const teks = String(pesan?.teks || '').trim()
  if (!sha || pesan.diteruskan === true || pesan.ada_berkas || !teks || teks.length > SAPA_MAKS || /\n/.test(teks)) return false
  if ((ctx.kenali || jenisWa.kenali)(teks, pesan.nama_berkas || '')) return false
  const kini = (ctx.now || new Date()).getTime(), f = sapaP(ctx.dasar || RUMAH), catat = bacaJson(f, {})
  if (kini - Number(catat[sha] || 0) < SAPA_JEDA_MS) return false
  if (sibukBangun.has(kunciSibukDari(ctx, sha))) return false // pembangunan pengirim ini sedang jalan
  const punya = await proyekPengirim(ctx, sha, (p) => ['terbuka', 'bertanya', 'membangun', 'draf'].includes(p.status), { bersihkan: false })
  if (punya.length) return false
  catat[sha] = kini
  for (const [k, v] of Object.entries(catat)) if (kini - Number(v) > SAPA_JEDA_MS) delete catat[k]
  catat[sha] = kini
  tulisJson(f, catat)
  await ctx.balas(T_SAPA)
  return true
}

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
const proyekStatus = (ctx, id, ke, sha, tambah = {}) => worker(ctx, '/api/wa/proyek/status', { method: 'POST', body: { id, ke, wa_sha: sha, ...tambah } })

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

// ---------- pesan (DESIGN-SYSTEM: judul tebal, kode proyek miring, baris pendek, tanpa titik tengah, em dash, emoji) ----------
// Baris 1 = apa yang terjadi (*tebal*, paling banyak sekitar 5 kata), baris 2 = _kode proyek, versi n_, lalu blok dipisah baris kosong.
export const kodeBaris = (p, n) => `_${p.id}${n ? `, versi ${n}` : ''}_`
const kepala = kodeBaris
const judul = (lap, tanggal) => `${lap.judul} ${labelTanggal(tanggal)}`
// susun(judul, p|null, n|null, ...blok): blok = teks atau daftar baris; blok kosong dilewati.
export function susun(jdl, p, n, ...blok) {
  const atas = [`*${jdl}*`, ...(p?.id ? [kodeBaris(p, n)] : [])].join('\n')
  const isi = blok.map((b) => (Array.isArray(b) ? b.filter((x) => x != null && x !== '').join('\n') : String(b ?? ''))).filter(Boolean)
  return [atas, ...isi].join('\n\n')
}
const bagian = (label, baris) => (baris.length ? [`*${label}:*`, ...baris.map((c) => `- ${c}`)] : [])
// Menu bernomor di akhir tiap draf (pemilik, 18 Nov 2026): angka 1 sampai 4 dari pemegang draf = perintah, tidak pernah revisi.
export const MENU = '*Balas angka:*\n1 Final\n2 Minta PPTX\n3 Lihat versi\n4 Batal\n\nAtau tulis perubahan dengan kalimat biasa.'
export const MENU_AKSI = { 1: 'final', 2: 'pptx', 3: 'versi', 4: 'batal' }

// Ringkasan draf (T-BUKA dan T-DRAF dalam satu teks): menempel di keterangan gambar pratinjau, jadi satu draf = 2 kiriman (Q1).
// hitung: {kunci bahan atau 'lain': jumlah pesan}. Kalimat angka sistem hanya untuk laporan yang memuatnya (penanganan karhutla).
export function tDraf(p, n, lap, tanggal, { hitung = {}, catatan = [], peringatan = [], slide = null } = {}) {
  const per = Object.entries(hitung).map(([k, j]) => `${k === 'lain' ? 'bahan lain' : labelBahan(k)} ${j}`)
  return susun(`Draf v${n} siap`, p, n,
    [judul(lap, tanggal),
      per.length ? `Bahan: ${per.join(', ')}` : 'Bahan: belum ada yang dikenali',
      ...(lap.id === 'penanganan' ? ['Hotspot, firespot, luas terbakar, dan luas belum padam dari sistem (hari D-1).'] : []),
      ...(slide ? [`Gambar ini slide ${slide}, PDF menyusul.`] : [])],
    bagian('Catatan', catatan),
    bagian('Pemeriksaan', peringatan),
    MENU)
}
// Teks dari luar (Claude, deck, pemeriksa) dirapikan ke aturan caption: tanpa titik tengah, em dash, en dash; satu baris; dipotong.
const rapi = (t, maks = 160) => {
  const s = String(t ?? '').replace(/\s*[·—–]\s*/g, ', ').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
  return s.length > maks ? s.slice(0, maks - 3).trimEnd() + '...' : s
}

// T-PRATINJAU (gambar) dan T-DRAF revisi (PDF): satu revisi = 2 kiriman (Q1). Keterangan gambar dan PDF tetap pendek.
export const tPratinjau = (p, n, slide) => susun(`Pratinjau slide ${slide}`, p, n, 'Ringkasan perubahan ada di PDF berikutnya.')
export function tDrafRevisi(p, n, lap, tanggal, { perubahan = [], tolak = [], lewat = [], catatan = [], peringatan = [] } = {}) {
  return susun(`Draf v${n} siap`, p, n, judul(lap, tanggal),
    bagian('Perubahan', perubahan), bagian('Tidak diubah', tolak), bagian('Dilewati', lewat),
    bagian('Catatan', catatan), bagian('Pemeriksaan', peringatan), MENU)
}
export const tPdf = (p, n, lap, tanggal) => susun(`PDF draf v${n}`, p, n, judul(lap, tanggal))

export function tTanya(p, lap, tanggal, pertanyaan) {
  return susun('Bahan perlu dipastikan', p, null,
    [`${judul(lap, tanggal)} perlu dipastikan dulu:`, ...pertanyaan.map((q, i) => `${i + 1}. ${q}`)],
    'Kirim jawabannya, atau ketik *lanjut* untuk membuat dengan bahan yang ada.')
}

// ---------- K17: daftar bahan (sesudah `buat`) dan tanda terima bahan ----------
const daftarBaris = (ks, terpilih, lap = null) => ks.map((k) => `- ${lap ? labelWajib(lap, k) : labelBahan(k)}${terpilih[k] ? ': sudah ada' : ''}`)
const wajibLengkap = (lap, terpilih) => lap.butuh.every((k) => terpilih[k])
export function tDaftarBahan(p, lap, tanggal, terpilih, { cutoff = false, satelit = null } = {}) {
  const lengkap = wajibLengkap(lap, terpilih)
  return susun(lengkap ? 'Bahan wajib lengkap' : 'Kirim bahan laporan', p, null,
    [judul(lap, tanggal), ...(cutoff ? [`Belum cut-off ${lap.jam}.00 WIB, angka sistem hari ini belum lengkap.`] : []), ...(satelit ? [barisSatelit(satelit)] : [])],
    ['*Wajib:*', ...daftarBaris(lap.butuh, terpilih, lap)],
    (lap.pilihan || []).length ? ['*Tambahan:*', ...daftarBaris(lap.pilihan, terpilih)] : [],
    lengkap ? 'Ketik *lanjut* untuk membuat laporan.' : ['Kirim atau teruskan bahannya ke sini.', 'Ketik *lanjut* bila sudah siap.'])
}
// diterima: label bahan laporan ini yang baru masuk; lain: jumlah kiriman yang belum dikenali sebagai bahan laporan ini.
export function tTerima(p, lap, tanggal, terpilih, { diterima = [], lain = 0, beda = [] } = {}) {
  const kalimatBeda = beda.map((b) => `Diterima, tetapi bertanggal ${labelTanggal(b.tgl)}, tidak dipakai untuk laporan ${labelTanggal(tanggal)}: ${b.label}.`).join('\n')
  const n = lap.butuh.length, k = lap.butuh.filter((x) => terpilih[x]).length
  const kalimatLain = lain ? `${lain > 1 ? `${lain} kiriman` : 'Kiriman ini'} belum dikenali sebagai bahan laporan ini, tetap disimpan sebagai bahan lain.` : ''
  if (wajibLengkap(lap, terpilih)) {
    const kurangTambah = (lap.pilihan || []).filter((x) => !terpilih[x]).map((x) => `- ${labelBahan(x)}`)
    return susun('Bahan wajib lengkap', p, null,
      [...(diterima.length ? [`Diterima: ${diterima.join(', ')}.`] : []), ...(kalimatBeda ? [kalimatBeda] : []), ...(kalimatLain ? [kalimatLain] : [])],
      kurangTambah.length ? ['*Tambahan yang belum ada:*', ...kurangTambah] : [],
      'Ketik *lanjut* untuk membuat laporan.')
  }
  const kurang = lap.butuh.filter((x) => !terpilih[x]).map((x) => `- ${labelBahan(x)}`)
  const akhir = 'Ketik *lanjut* bila ingin membuat dengan bahan yang ada.'
  if (!diterima.length) {
    return susun(lain ? 'Bahan belum dikenali' : 'Bahan bertanggal lain', p, null, [judul(lap, tanggal), kalimatBeda, kalimatLain],
      ['*Wajib:*', ...daftarBaris(lap.butuh, terpilih, lap)],
      (lap.pilihan || []).length ? ['*Tambahan:*', ...daftarBaris(lap.pilihan, terpilih)] : [], akhir)
  }
  return [`*Diterima: ${diterima.join(', ')}* (${k} dari ${n} wajib)`, kodeBaris(p)].join('\n') + '\n\n' +
    [[kalimatBeda, kalimatLain].filter(Boolean).join('\n'), ['*Masih kurang:*', ...kurang].join('\n'), akhir].filter(Boolean).join('\n\n')
}
// Judul galat Claude (pesanPemakai di claude.mjs = isi satu baris).
const JUDUL_CLAUDE = { batas_belanja: 'Kuota hari ini habis', tanpa_kunci: 'Bot belum siap', tanpa_sdk: 'Bot belum siap' }
const tClaude = (p, n, e) => susun(JUDUL_CLAUDE[e.kode] || 'Bahan belum terbaca', p, n, e.pesanPemakai, e.kode === 'batas_belanja' ? '' : AKHIR_GAGAL)

// ---------- satu pembangunan per pengirim: `lanjut`/`ulangi` saat masih membangun dijawab sekali "Masih dibangun" ----------
const sibukBangun = new Map() // `${dasar}|${sha}` -> {id, dibalas}
const kunciSibukDari = (ctx, sha) => `${ctx.dasar || RUMAH}|${sha}`
function tandaiSibuk(ctx, sha, id) { const k = kunciSibukDari(ctx, sha); sibukBangun.set(k, { id, dibalas: false }); return k }
function lepasSibuk(k) { sibukBangun.delete(k) }
export const sedangDibangun = (dari, env = process.env, dasar = RUMAH) => { const sha = waSha(normalWa(dari), env.WA_GARAM); return !!sha && sibukBangun.has(`${dasar}|${sha}`) }
// Untuk gateway sebelum antre per pengirim: `lanjut`, `ulangi`, `buat saja` (tidak diteruskan) dari pengirim yang pembangunannya masih jalan
// dijawab sekali saat itu juga -> true (pesan selesai); selain itu false dan pesan masuk antrean seperti biasa.
export async function jawabSibukLangsung(pesan, ctx) {
  if (!pesan || pesan.diteruskan === true || !/^(lanjut|ulangi|buat saja)$/.test(normalPerintah(pesan.teks))) return false
  const sha = waSha(normalWa(pesan.dari), ctx.env?.WA_GARAM)
  return !!sha && jawabSibuk(ctx, sha)
}
async function jawabSibuk(ctx, sha) {
  const s = sibukBangun.get(kunciSibukDari(ctx, sha))
  if (!s) return false
  if (!s.dibalas) { s.dibalas = true; await ctx.balas(susun('Masih dibangun', { id: s.id }, null, 'Tunggu sebentar, draf dikirim begitu siap.')) }
  return true
}
const tSibuk = (p, n) => susun('Sedang dibangun', p, n, 'Tunggu sebentar, draf dikirim begitu siap.')
// Kabar galat ke pemilik: judul tetap, kode proyek, apa yang gagal, rincian teknis dipotong.
const tGalatPemilik = (p, n, apa, rinci, maks = 300) => susun('Galat bot laporan', p, n, [apa, ...(rinci ? [String(rinci).slice(0, maks)] : [])])

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
  await kabarSekali(ctx, 'status', tGalatPemilik(p, null, `Status gagal dipindah ke ${ke}.`, galat.message))
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

const kapital = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const tanyaBentrok = (b) => `${kapital(b.medan.replace(/_/g, ' '))} berbeda: ${b.a.nilai} ("${String(b.a.kutipan).slice(0, 80)}") dan ${b.b.nilai} ("${String(b.b.kutipan).slice(0, 80)}"). Mana yang dipakai?`

// ---------- A2: jenis dari bahan ----------
async function tebakJenis(bahan) {
  const skor = []
  for (const lap of LAPORAN) {
    const { terpilih } = await bahan.pilihSesuai(lap)
    skor.push({ id: lap.id, n: jenisLap(lap).filter((k) => terpilih[k]).length })
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
  if (!jenis) return balas(susun('Jenis laporan belum jelas', null, null, `Bahan ${labelTanggal(cmd.tanggal)} belum menunjukkan jenis laporannya.`, ['Ketik salah satu:', `- *buat harian ${cmd.tanggal}*`, `- *buat penanganan ${cmd.tanggal}*`]))
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
  // Daftar bahan (K17) hanya membuka proyek; bahan ditempel sekali, saat membangun (`lanjut`, `buat saja`).
  let { proyek: p } = await proyekBuka(ctx, { wa_sha: sha, jenis, tanggal: cmd.tanggal, bahan: cmd.saja || cmd.lanjut ? bahanRute : [] })
  catatIndeks(dasar, p, sha, dari)
  const berkasKunci = lockProyek(dasar, p.id)
  if (p.status === 'membangun') {
    if (kunciHidup(berkasKunci)) return balas(tSibuk(p, p.versi || null))
    p = await pulihkan(ctx, p, sha)
  }
  // TODO(BL-10): proyek draf menerima revisi; `buat` lagi di sini belum membangun ulang.
  if (p.status === 'draf') return balas(susun('Draf sudah ada', p, p.versi, 'Tulis perubahan dengan kalimat biasa, atau balas *1* untuk final.'))
  if (!AKTIF.includes(p.status)) return balas(susun(`Proyek sudah ${p.status}`, p, null, 'Ketik *buat* untuk memulai proyek baru.'))
  // K17: `buat <jenis>` hanya membuka proyek dan membalas daftar bahan; pembangunan selalu menunggu `lanjut` (atau `buat saja`).
  if (!cmd.saja && !cmd.lanjut) {
    catatTuntun(ctx, sha, p.id)
    const satelit = lap.id === 'penanganan' ? await statusSatelit(ctx, cmd.tanggal) : null // K18: baris status data satelit
    return balas(tDaftarBahan(p, lap, cmd.tanggal, terpilih, { cutoff: cmd.tanggal === tanggalWib(now) && jamWib(now) < lap.jam, satelit }))
  }

  const lepas = kunciProses(berkasKunci) // satu proses aktif per proyek (T15)
  if (!lepas) return balas(tSibuk(p, null))
  const kerjaEkstrak = path.join(dirProyek(dasar), p.id, 'ekstrak')
  let status = p.status
  const pindah = async (ke, o) => { if (status === ke) return true; const ok = await pindahStatus(ctx, p, ke, sha, o); if (ok) status = ke; return ok }
  const kunciSibuk = tandaiSibuk(ctx, sha, p.id)
  const prog = await mulaiProgres(ctx, `Membangun draf v${(p.versi || 0) + 1}`, p, TAHAP_BUAT)
  const gagalBangun = () => catatGagal(ctx, sha, { langkah: 'bangun', id: p.id, cmd: { jenis, tanggal: cmd.tanggal, saja: !!cmd.saja, ...(cmd.firespot ? { firespot: cmd.firespot } : {}) } })
  try {
    const bahanTeks = [], tidakTerbaca = []
    for (const m of pakai.values()) {
      const e = await ekstrak(m, ctx, kerjaEkstrak)
      if (!e) continue
      if (e.tidakTerbaca) tidakTerbaca.push(e.nama || `pesan ${e.id}`)
      else bahanTeks.push(e)
    }
    await prog.ke(1)
    const hasil = await urai(ctx, p, lap, bahanTeks)
    const kurang = lap.butuh.filter((k) => !terpilih[k])
    // K17: bahan wajib yang kurang dan cut-off tidak ditanyakan (pemakai sudah memilih `lanjut`), hanya dicatat di draf.
    // Bentrok dan bahan tak terbaca ditanyakan sekali sesudah `lanjut`; `lanjut` lagi (status bertanya) atau `buat saja` membangun dan mencatatnya.
    const celah = [
      ...kurang.map((k) => `${labelBahan(k)} untuk ${labelTanggal(cmd.tanggal)} belum ada.`),
      ...(cmd.tanggal === tanggalWib(now) && jamWib(now) < lap.jam ? [`Belum cut-off ${lap.jam}.00 WIB, angka sistem hari ini belum lengkap.`] : []),
    ]
    const pertanyaan = [
      ...hasil.pertentangan.map(tanyaBentrok),
      ...tidakTerbaca.map((n) => `${n} tidak terbaca. Kirim teks atau PDF.`),
    ]
    if (pertanyaan.length && !cmd.saja) {
      await pindah('bertanya')
      catatTuntun(ctx, sha, p.id)
      // TODO(BL-10): jawaban bebas atas T-TANYA diurai Claude ke keputusan per nomor (A3); sekarang pemakai mengirim bahan lalu `lanjut`.
      await prog.akhir('berhenti')
      return await balas(tTanya(p, lap, cmd.tanggal, pertanyaan))
    }
    const catatan = [...celah, ...(cmd.saja ? pertanyaan : [])]
    for (const g of hasil.gagal || []) catatan.push(`${kapital(String(g.medan).replace(/_/g, ' '))} tidak terbaca dari bahan.`)
    const hitung = {}
    for (const m of pakai.values()) { const k = kenali(m.teks || '', m.nama_berkas || '') || 'lain'; hitung[k] = (hitung[k] || 0) + 1 }

    // K18: penanganan saat FIRMS sudah memuat lintasan siang tetapi situs belum = pemakai memilih *tunggu* atau *hitung*.
    let lapBangun = lap
    if (lap.id === 'penanganan') {
      if (cmd.firespot === 'firms') {
        lapBangun = { ...lap, args: (d, f, o) => [...lap.args(d, f, o), '--firespot', 'firms'] }
        catatan.push(CATATAN_FIRMS)
      } else {
        const st = await statusSatelit(ctx, cmd.tanggal)
        if (st && st.situs_memuat === false && st.lintasan_siang === true) {
          await pindah('bertanya')
          catatSatelit(ctx, p.id, { sha, dari, jenis, tanggal: cmd.tanggal, keadaan: 'pilih' })
          await prog.akhir('berhenti')
          return await balas(tPilihSatelit(p, st))
        }
      }
    }

    try { catatSatelit(ctx, p.id, null) } catch {} // pembangunan mulai: pilihan data satelit proyek ini selesai
    await pindah('membangun')
    await prog.ke(2)
    const n = (p.versi || 0) + 1
    const dasarV = path.join(dasar, 'keluaran', 'proyek', p.id, `v${n}`) // di bawah ~/.wa-bot/keluaran: satu-satunya akar yang boleh dikirim gateway
    let berkas, isianGen
    try {
      const k = siapkanKeluaran(lap, cmd.tanggal, teks, dasarV)
      berkas = k.berkas
      isianGen = keIsianGenerator(jenis, hasil.isian)
      if (Object.keys(isianGen).length) { k.f.isian = path.join(k.kerja, 'isian.json'); tulisJson(k.f.isian, isianGen) }
      // Kunci generator bersama jalur terjadwal; tanggal mulai kejadian lama dibaca dari keluaran terjadwal (WA_MULAI_AKAR).
      const r = await jalankanGenerator(lapBangun, cmd.tanggal, k.f, k.out, k.kerja, dep, env, { kunci: path.join(dasar, 'generator.lock'), envAnak: { WA_MULAI_AKAR: path.join(dasar, 'keluaran') } })
      for (const b of berkas) if (!ada(b.p)) throw new Error('keluaran tidak ada: ' + path.basename(b.p))
      for (const l of String(r?.stderr || '').split('\n')) {
        const m = l.match(/^PERINGATAN isian:\s*(.+)$/)
        if (!m || (cmd.firespot === 'firms' && /firespot/i.test(m[1]))) continue // mode FIRMS: cukup CATATAN_FIRMS (K18)
        catatan.push(`Isian diabaikan generator: ${m[1].trim()}`)
      }
    } catch (e) {
      await prog.akhir('gagal')
      await pindah('terbuka', { lempar: false })
      gagalBangun()
      await kabarSekali(ctx, 'bangun', tGalatPemilik(p, n, `Draf v${n} gagal dibangun.`, e.message, 400))
      return await balas(susun(`Draf v${n} gagal dibangun`, p, null, ['Pemilik sudah dikabari.', AKHIR_GAGAL]))
    }
    await prog.ke(3)
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
      await prog.akhir('gagal')
      if (status === 'membangun') await pindah('terbuka', { lempar: false })
      gagalBangun()
      await kabarSekali(ctx, 'versi', tGalatPemilik(p, n, `Versi v${n} gagal disimpan.`, e.message))
      return await balas(susun(`Draf v${n} gagal disimpan`, p, null, ['Pemilik sudah dikabari.', AKHIR_GAGAL]))
    }
    catatGagal(ctx, sha, null)
    // D8 dan Q1: tepat 2 kiriman, gambar pratinjau slide 1 berketerangan ringkasan draf, lalu PDF. Tanpa pratinjau: ringkasan di keterangan PDF.
    const ringkas = tDraf(p, n, lap, cmd.tanggal, { hitung, catatan, peringatan, slide: png.length ? 1 : null })
    catatMenu(ctx, sha, p.id) // angka menu berikutnya berlaku untuk proyek ini
    if (png.length) await ctx.balasFile(png[0], path.basename(png[0]), ringkas, 'image/png')
    await ctx.balasFile(pdf, path.basename(pdf), png.length ? tPdf(p, n, lap, cmd.tanggal) : ringkas, MIME.pdf)
    await prog.akhir('selesai') // sunting akhir sesudah dua berkas draf: jatah limiter didahulukan untuk berkas
  } catch (e) {
    await prog.akhir('gagal')
    if (!(e instanceof GalatClaude)) { gagalBangun(); throw e }
    if (['bertanya', 'membangun'].includes(status)) await pindah('terbuka', { lempar: false })
    if (e.kode !== 'batas_belanja') gagalBangun()
    await kabarSekali(ctx, `claude:${e.kode}`, tGalatPemilik(p, null, `Panggilan Claude gagal (${e.kode}).`, e.message))
    await balas(tClaude(p, null, e))
  } finally {
    await prog.akhir('gagal') // tidak berbuat apa pun bila sudah diakhiri
    lepasSibuk(kunciSibuk)
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
      baris.push(`${NAMA_ANGKA[k.angka] || 'Angka sistem'}${nilai ? ` ${nilai}${ha}` : ''} di slide ${k.slide} adalah angka sistem (hari D-1), tidak bisa diubah lewat revisi.`)
      slide.add(k.slide)
    } else {
      baris.push(`Revisi${op?.slide ? ` slide ${op.slide}` : ''} menulis angka hotspot, firespot, luas terbakar, atau belum padam. Angka itu hanya dari sistem (hari D-1).`)
      if (op?.slide) slide.add(op.slide)
    }
  }
  const s = [...slide][0]
  return { baris: [...new Set(baris)], tawaran: `Bila angka lapangan berbeda, minta catatan. Contoh: tambahkan catatan di slide ${s || 'itu'} bahwa angka lapangan berbeda.` }
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
// PPTX (atau PDF) versi n di mesin; hilang (mesin lain, dibersihkan) = unduh dari R2 lewat rute.
async function pastikanPptx(ctx, p, lap, n, sha, ext = 'pptx') {
  const f = jalurDeck(ctx.dasar || RUMAH, p, lap, n).replace(/\.pptx$/, '.' + ext)
  if ((ctx.ada || fs.existsSync)(f)) return f
  const { env, dep } = ctx
  const r = await dep.fetch(`${W(env)}/api/wa/proyek/versi?id=${encodeURIComponent(p.id)}&n=${n}&wa_sha=${sha}&berkas=${encodeURIComponent(path.basename(f))}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` }, signal: AbortSignal.timeout(WAKTU_WORKER) })
  if (!r.ok) throw new Error(`${ext.toUpperCase()} v${n} tidak ada (HTTP ${r.status})`)
  fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 })
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()), { mode: 0o600 })
  return f
}

// Proyek aktif pengirim dari indeks lokal, terbaru dulu; yang tidak aktif lagi dibuang dari indeks.
// bersihkan: false = tanpa menulis indeks (klasifikasi tanpa efek samping); rute {id} hanya membaca.
async function proyekPengirim(ctx, sha, saring = () => true, { bersihkan = true, jugaFinal = false } = {}) {
  const dasar = ctx.dasar || RUMAH
  const ix = bacaJson(indeksP(dasar), { proyek: {} })
  const buang = (id) => { if (bersihkan) hapusIndeks(dasar, id) }
  const ada = []
  for (const [id, e] of Object.entries(ix.proyek)) {
    if (e.sha !== sha) continue
    let p
    try { p = (await proyekBuka(ctx, { id, wa_sha: sha })).proyek } catch (x) { if (/HTTP 404/.test(x.message)) buang(id); continue }
    if (p.status === 'final') { if (jugaFinal && saring(p)) ada.push(p); continue } // final tetap di indeks sampai ditutup (BL-12)
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
  if (!lap) return balas(susun('Revisi belum bisa', p, p.versi || null, `Jenis ${p.jenis} belum bisa direvisi lewat bot. Hubungi pemilik.`))
  const berkasKunci = lockProyek(dasar, p.id)
  if (p.status === 'membangun') {
    if (kunciHidup(berkasKunci)) return balas(tSibuk(p, p.versi || null))
    p = await pulihkan(ctx, p, sha)
  }
  if (p.status !== 'draf' || !(p.versi > 0)) return balas(susun('Belum ada draf', p, p.versi || null, `Belum ada draf untuk ${opsi.balik ? 'dikembalikan' : 'direvisi'}. Ketik *buat* dulu.`))
  const m = p.versi, n = m + 1
  if (opsi.balik != null) {
    if (opsi.balik < 1 || opsi.balik > m) return balas(susun(`Versi v${opsi.balik} tidak ada`, p, m, `Versi terakhir v${m}. Balas *3* untuk melihat riwayat versi.`))
    if (opsi.balik === m) return balas(susun('Sudah versi terakhir', p, m, `v${m} sudah versi terakhir, tidak ada yang dikembalikan.`))
  }
  const lepas = kunciProses(berkasKunci)
  if (!lepas) return balas(tSibuk(p, m))
  let status = p.status
  const pindah = async (ke, o) => { if (status === ke) return true; const ok = await pindahStatus(ctx, p, ke, sha, o); if (ok) status = ke; return ok }
  const kunciSibuk = tandaiSibuk(ctx, sha, p.id)
  const prog = await mulaiProgres(ctx, `Menerapkan revisi v${n}`, p, TAHAP_REVISI)
  const gagalRevisi = () => catatGagal(ctx, sha, { langkah: 'revisi', id: p.id, ...(opsi.balik != null ? { balik: opsi.balik } : { teks: String(pesan?.teks || '') }) })
  const keDraf = async (teks) => { await prog.akhir('berhenti'); await pindah('draf'); return balas(teks) }
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
      await kabarSekali(ctx, 'kunci', tGalatPemilik(p, m, `Daftar kunci angka sistem v${m} tidak ada di mesin maupun versi tersimpan, revisi ditolak.`))
      return await keDraf(susun('Revisi belum bisa diproses', p, m, ['Daftar angka sistem yang dikunci untuk draf ini tidak ditemukan.', `Pemilik sudah dikabari, draf v${m} tetap berlaku.`]))
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
        return await keDraf(susun('Revisi perlu dipastikan', p, m, r.tanya.map((q, i) => `${i + 1}. ${rapi(q.pertanyaan, 300)}`),
          'Balas dengan kalimat revisi yang lebih rinci.'))
      }
      tolakKunci = (r.ditolak || []).filter((x) => x.kunci).map((x) => x.op)
      tolakLain = (r.ditolak || []).filter((x) => !x.kunci)
      baru = r.diterima || []
      if (!baru.length) {
        const tk = tolakKunci.length ? tTolakKunci(tolakKunci, invLama, kunciLama) : null
        return await keDraf(susun('Revisi tidak diterapkan', p, m, `Draf tetap v${m}.`,
          tk ? tk.baris : [], tk ? tk.tawaran : '',
          tolakLain.length ? `Bagian lain belum bisa dipetakan ke slide (${rapi(tolakLain[0].alasan, 80)}). Sebut nomor slide dan teks yang diganti.` : '',
          !tk && !tolakLain.length ? 'Tidak ada perubahan yang terbaca dari kalimat itu. Sebut nomor slide dan teks yang diganti.' : ''))
      }
      ops = [...opsLama, ...baru]
      instruksi = `revisi: ${rapi(samarkan(kalimat), 480)}`
    }
    await prog.ke(1)

    // Bangun ulang dari bahan + isian versi terakhir (D1, D6), lalu operasi 1..n.
    const lingkup = lingkupBahan(env, dari, sha)
    const bahan = await ambilBahan({ env, dep: { ...dep, fetch: fetchLingkup(dep, lingkup.boleh) }, tanggal: p.tanggal, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log })
    const { teks } = await bahan.pilihSesuai(lap)
    const dasarV = path.join(dasar, 'keluaran', 'proyek', p.id, `v${n}`)
    const catatan = []
    let pptx, pdf, lewat = [], terpakai = ops
    const gagalBangun = async (e) => {
      await prog.akhir('gagal')
      gagalRevisi()
      await pindah('draf', { lempar: false })
      await kabarSekali(ctx, 'bangun', tGalatPemilik(p, n, `Revisi v${n} gagal dibangun.`, e.message, 400))
      return balas(susun(`Revisi v${n} gagal dibangun`, p, m, [`Draf v${m} tetap berlaku. Pemilik sudah dikabari.`, AKHIR_GAGAL]))
    }
    await prog.ke(2)
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
      return await keDraf(susun('Revisi tidak diterapkan', p, m, `Draf tetap v${m}.`, tk ? tk.baris : [], tk ? tk.tawaran : '', kalimatLewat))
    }

    await prog.ke(3)
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
      await prog.akhir('gagal')
      gagalRevisi()
      if (status === 'membangun') await pindah('draf', { lempar: false })
      await kabarSekali(ctx, 'versi', tGalatPemilik(p, n, `Versi v${n} gagal disimpan.`, e.message))
      return await balas(susun(`Revisi v${n} gagal disimpan`, p, m, [`Draf v${m} tetap berlaku. Pemilik sudah dikabari.`, AKHIR_GAGAL]))
    }
    catatGagal(ctx, sha, null)
    // D8 dan Q1: tepat 2 kiriman, pratinjau slide pertama yang berubah lalu PDF berketerangan T-DRAF. Tanpa pratinjau: PDF saja.
    const ringkas = tDrafRevisi(p, n, lap, p.tanggal, { perubahan, tolak, lewat: kalimatLewat, catatan, peringatan })
    catatMenu(ctx, sha, p.id)
    if (png.length) await ctx.balasFile(png[0], path.basename(png[0]), tPratinjau(p, n, slide), 'image/png')
    await ctx.balasFile(pdf, path.basename(pdf), ringkas, MIME.pdf)
    await prog.akhir('selesai')
  } catch (e) {
    await prog.akhir('gagal')
    if (status === 'membangun') await pindah('draf', { lempar: false })
    if (!(e instanceof GalatClaude)) { gagalRevisi(); throw e }
    if (e.kode !== 'batas_belanja') gagalRevisi()
    await kabarSekali(ctx, `claude:${e.kode}`, tGalatPemilik(p, m, `Panggilan Claude gagal (${e.kode}).`, e.message))
    await balas(tClaude(p, m, e))
  } finally { await prog.akhir('gagal'); lepasSibuk(kunciSibuk); lepas() }
}

// ---------- konfirmasi batal dari menu (~/.wa-bot/proyek/konfirmasi.json: {wa_sha: {id, waktu}}) ----------
const KONFIRMASI_MS = 5 * 60e3
const konfirmP = (dasar) => path.join(dirProyek(dasar), 'konfirmasi.json')
const teksYa = (t) => normalPerintah(t) === 'ya'
function konfirmasiBatal(ctx, sha) {
  const k = bacaJson(konfirmP(ctx.dasar || RUMAH), {})[sha]
  return k && (ctx.now || new Date()).getTime() - Number(k.waktu) <= KONFIRMASI_MS ? k : null
}
function catatKonfirmasi(ctx, sha, id) {
  const f = konfirmP(ctx.dasar || RUMAH), isi = bacaJson(f, {})
  if (!id && !isi[sha]) return
  if (id) isi[sha] = { id, waktu: (ctx.now || new Date()).getTime() }; else delete isi[sha]
  tulisJson(f, isi)
}

// Hapus tanya batal pengirim dari luar mesin proyek (perintah pemilik yang ditangani perintah.mjs, lewat gateway).
export function hapusKonfirmasi({ dari, env = process.env, dasar = RUMAH } = {}) {
  const sha = waSha(normalWa(dari), env.WA_GARAM)
  if (sha) catatKonfirmasi({ dasar }, sha, null)
}
// Proyek yang menunya terakhir dikirim ke pengirim (~/.wa-bot/proyek/menu.json: {wa_sha: id}).
const menuP = (dasar) => path.join(dirProyek(dasar), 'menu.json')
const menuTerakhir = (ctx, sha) => bacaJson(menuP(ctx.dasar || RUMAH), {})[sha] || null
function catatMenu(ctx, sha, id) {
  try { const f = menuP(ctx.dasar || RUMAH), isi = bacaJson(f, {}); isi[sha] = id; tulisJson(f, isi) } catch (e) { (ctx.log || (() => {}))('catat menu gagal', e.message) }
}

// ---------- K17: proyek dituntun (~/.wa-bot/proyek/tuntun.json: {wa_sha: id}) ----------
// Hanya proyek yang dibuka lewat `buat <jenis>` (daftar bahan terkirim) yang membalas tanda terima bahan; bahan tanpa `buat` tetap diam (Q1).
const tuntunP = (dasar) => path.join(dirProyek(dasar), 'tuntun.json')
const tuntunTerakhir = (ctx, sha) => bacaJson(tuntunP(ctx.dasar || RUMAH), {})[sha] || null
function catatTuntun(ctx, sha, id) {
  try { const f = tuntunP(ctx.dasar || RUMAH), isi = bacaJson(f, {}); isi[sha] = id; tulisJson(f, isi) } catch (e) { (ctx.log || (() => {}))('catat tuntun gagal', e.message) }
}
const MENUNGGU = ['terbuka', 'bertanya']

// ---------- ulangi: langkah gagal terakhir per pengirim (~/.wa-bot/proyek/gagal.json: {wa_sha: {langkah, cmd|id, teks, balik, waktu}}) ----------
// langkah: 'bangun' (draf baru, cmd buat yang sama dengan `lanjut`), 'revisi' (kalimat atau balik yang sama), 'pesan' (perintah lain yang galat).
// Dihapus saat versi tersimpan, saat `ulangi` dijalankan (gagal lagi = dicatat lagi), dan saat proyek dibatalkan.
export const AKHIR_GAGAL = 'Ketik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan.'
const gagalP = (dasar) => path.join(dirProyek(dasar), 'gagal.json')
function catatGagal(ctx, sha, isi) {
  try {
    const f = gagalP(ctx.dasar || RUMAH), semua = bacaJson(f, {})
    if (!isi && !semua[sha]) return
    if (isi) semua[sha] = { ...isi, waktu: (ctx.now || new Date()).getTime() }; else delete semua[sha]
    tulisJson(f, semua)
  } catch (e) { (ctx.log || (() => {}))('catat gagal', e.message) }
}
const gagalTerakhir = (ctx, sha) => bacaJson(gagalP(ctx.dasar || RUMAH), {})[sha] || null
const tTakAdaUlang = (rinci = 'Belum ada langkah yang gagal.') => susun('Tidak ada yang perlu diulang', null, null, `${rinci} Ketik *status* untuk melihat proyek.`)
const ULANGI_BASI_MS = 24 * 3600e3 // catatan gagal lebih tua dari ini diabaikan
async function ulangi(dari, sha, ctx) {
  const e = gagalTerakhir(ctx, sha)
  if (!e) return ctx.balas(tTakAdaUlang())
  catatGagal(ctx, sha, null)
  if ((ctx.now || new Date()).getTime() - Number(e.waktu || 0) > ULANGI_BASI_MS) return ctx.balas(tTakAdaUlang())
  // proyek asal dibaca ulang dari Worker: harus masih terbuka (bangun: terbuka atau bertanya; revisi: draf)
  let p = null
  if (e.id) { try { p = await bacaProyek(ctx, e.id, sha) } catch {} }
  if (e.langkah === 'bangun' && e.cmd) {
    if (!p || !MENUNGGU.includes(p.status)) return ctx.balas(tTakAdaUlang(e.id ? `Proyek ${e.id} tidak lagi menunggu dibangun.` : undefined))
    return buat({ ...e.cmd, aksi: 'buat', lanjut: true }, dari, sha, ctx)
  }
  if (e.langkah === 'revisi') {
    if (!p || p.status !== 'draf' || !(p.versi > 0)) return ctx.balas(tTakAdaUlang(`Proyek ${e.id} tidak lagi berstatus draf.`))
    return revisi(e.balik != null ? null : { teks: e.teks }, dari, sha, p, ctx, e.balik != null ? { balik: e.balik } : {})
  }
  if (e.langkah === 'pesan' && e.teks && normalPerintah(e.teks) !== 'ulangi') return tangani({ dari, teks: e.teks }, ctx)
  return ctx.balas(tTakAdaUlang())
}

// ---------- kemajuan: satu pesan yang disunting per tahap, ditambah "sedang mengetik" (pemilik 18 Nov 2026: "pakai dua-duanya") ----------
// ctx.kirimProgres(teks) -> pegangan | null, ctx.ubahProgres(pegangan, teks) -> false bila gagal, ctx.mengetik(nyala): semuanya opsional.
// Paling banyak 4 suntingan per draf (3 pindah tahap + 1 akhir). Gagal kirim atau sunting = tanpa kemajuan, pembangunan tidak pernah terganggu.
export const TAHAP_BUAT = ['Membaca bahan', 'Mengurai bahan dengan AI', 'Membuat slide', 'PDF dan pemeriksaan']
export const TAHAP_REVISI = ['Membaca permintaan', 'Menerapkan perubahan', 'Membuat slide', 'PDF dan pemeriksaan']
export const MAKS_UBAH_PROGRES = 4
const SUNTING_MAKS_MS = 14 * 60e3
export function teksProgres(jdl, p, tahap, ke, akhir = null) {
  const tanda = (i) => {
    if (akhir === 'selesai' || i < ke) return 'selesai'
    if (i === ke) return akhir === 'gagal' ? 'gagal' : akhir === 'berhenti' ? 'selesai' : 'jalan'
    return 'menunggu'
  }
  return susun(jdl, p, null, tahap.map((t, i) => `[${tanda(i)}] ${t}`), akhir === 'berhenti' ? 'Berhenti dulu, lihat pesan berikutnya.' : '')
}
async function mulaiProgres(ctx, jdl, p, tahap) {
  const log = ctx.log || (() => {})
  let pegangan = null, ubah = 0, ke = 0, habis = false, dikirim = 0
  const kini = () => (typeof ctx.jam === 'function' ? ctx.jam() : Date.now())
  const ketik = (nyala) => { try { if (typeof ctx.mengetik === 'function') Promise.resolve(ctx.mengetik(nyala)).catch(() => {}) } catch {} }
  const sunting = async (teks) => {
    if (!pegangan || ubah >= MAKS_UBAH_PROGRES || typeof ctx.ubahProgres !== 'function') return
    if (kini() - dikirim > SUNTING_MAKS_MS) { pegangan = null; log('kemajuan lewat 14 menit, suntingan dilewati'); return } // WA menolak sunting sesudah 15 menit
    ubah++
    try { if ((await ctx.ubahProgres(pegangan, teks)) === false) pegangan = null } catch (e) { pegangan = null; log('sunting kemajuan gagal', e.message) }
  }
  ketik(true)
  if (typeof ctx.kirimProgres === 'function') {
    try { pegangan = (await ctx.kirimProgres(teksProgres(jdl, p, tahap, 0))) || null; dikirim = kini() } catch (e) { log('kirim kemajuan gagal', e.message) }
  }
  return {
    async ke(i) { if (habis || i <= ke) return; ke = i; await sunting(teksProgres(jdl, p, tahap, ke)) },
    async akhir(keadaan) { if (habis) return; habis = true; ketik(false); await sunting(teksProgres(jdl, p, tahap, ke, keadaan)) },
    get habis() { return habis },
  }
}

// ---------- K18: status data satelit penanganan, pilihan *tunggu* atau *hitung* (~/.wa-bot/proyek/satelit.json: {id: {sha, dari, jenis, tanggal, keadaan}}) ----------
// statusSatelit(ctx, tanggal) -> {firms_terakhir_wib, lintasan_siang, situs_memuat, ...} | null. dep.statusSatelit disuntik (uji), null = mati;
// tanpa itu: `segar_situs.py --status --tanggal D` lewat dep.exec (execFile). Galat apa pun = null (tidak pernah menahan laporan).
export const CATATAN_FIRMS = 'Firespot dihitung langsung dari FIRMS dengan rumus situs.'
export async function statusSatelit(ctx, tanggal) {
  const dep = ctx.dep || {}
  try {
    if ('statusSatelit' in dep) return dep.statusSatelit ? (await dep.statusSatelit(tanggal)) || null : null
    if (typeof dep.exec !== 'function') return null
    const r = await dep.exec(pyBin(ctx.env), [path.join(GENERATOR, 'segar_situs.py'), '--status', '--tanggal', tanggal], { cwd: GENERATOR, timeout: 90e3, maxBuffer: 2e6 })
    const j = JSON.parse(String(r?.stdout || ''))
    return j && typeof j === 'object' ? j : null
  } catch (e) { (ctx.log || (() => {}))('status satelit gagal', e.message); return null }
}
const jamTitik = (j) => String(j || '').replace(':', '.')
export function barisSatelit(st) {
  if (st.lintasan_siang == null) return 'Data satelit: status belum terbaca.'
  const situs = st.situs_memuat === true ? 'situs sudah memuat' : st.situs_memuat === false ? 'situs belum memuat' : 'status situs belum terbaca'
  if (!st.lintasan_siang) return `Data satelit: lintasan siang belum masuk FIRMS${st.firms_terakhir_wib ? ` (terakhir ${jamTitik(st.firms_terakhir_wib)} WIB)` : ''}, ${situs}.`
  return `Data satelit: lintasan siang masuk FIRMS ${jamTitik(st.firms_terakhir_wib)} WIB, ${situs}.`
}
export const tPilihSatelit = (p, st) => susun('Situs belum memuat data satelit', p, null, barisSatelit(st),
  ['Pilih salah satu:', '- *tunggu*: dibangun otomatis begitu situs memuat lintasan itu', '- *hitung*: bangun sekarang, firespot dihitung langsung dari FIRMS dengan rumus yang sama dengan situs'])
const satelitP = (dasar) => path.join(dirProyek(dasar), 'satelit.json')
const SATELIT_BASI_MS = 24 * 3600e3 // pilihan lebih tua dari ini diabaikan
const TUNGGU_MAKS_MS = 3 * 3600e3, TUNGGU_NOL_MAKS = 3 // lewat ini pemegang ditanya sekali lagi
function catatSatelit(ctx, id, isi) {
  const f = satelitP(ctx.dasar || RUMAH), semua = bacaJson(f, {})
  if (!isi && !semua[id]) return
  const kini = (ctx.now || new Date()).getTime()
  if (isi) { const { id: _, ...sisa } = isi; semua[id] = { dibuat: kini, ...sisa, waktu: kini } } else delete semua[id]
  tulisJson(f, semua)
}
// Pilihan hidup pengirim: umur di bawah 24 jam dan proyeknya masih menunggu (dibaca ulang dari Worker). Tanpa menulis apa pun.
async function pilihanSatelit(ctx, sha) {
  const kini = (ctx.now || new Date()).getTime()
  const calon = Object.entries(bacaJson(satelitP(ctx.dasar || RUMAH), {})).map(([id, e]) => ({ id, ...e }))
    .filter((e) => e.sha === sha && kini - Number(e.dibuat || e.waktu || 0) <= SATELIT_BASI_MS).sort((a, b) => b.waktu - a.waktu)
  for (const e of calon) {
    try { if (MENUNGGU.includes((await bacaProyek(ctx, e.id, sha)).status)) return e } catch {}
  }
  return null
}

async function pilihSatelit(kata, e, dari, sha, ctx) {
  if (kata === 'hitung') return buat({ aksi: 'buat', jenis: e.jenis, tanggal: e.tanggal, saja: true, lanjut: true, firespot: 'firms' }, dari, sha, ctx)
  // *tunggu*: jam pesan ini disimpan sebagai jam pesan masuk saat draf dikirim detak (jendela balasan limiter); hitungan mundur mulai lagi.
  const kini = (ctx.now || new Date()).getTime()
  catatSatelit(ctx, e.id, { ...e, keadaan: 'tunggu', masuk: kini, mulaiTunggu: kini, nol: 0, ditanyaUlang: false })
  return ctx.balas(susun('Menunggu situs', { id: e.id }, null, ['Laporan dibangun otomatis begitu situs memuat lintasan siang.', 'Dicek tiap 10 menit.'], 'Ketik *hitung* bila ingin membangun sekarang.'))
}
const tTanyaUlangSatelit = (id, st) => susun('Situs masih belum memuat', { id }, null, st ? barisSatelit(st) : 'Data satelit: status belum terbaca.',
  ['Pilih lagi:', '- *hitung*: bangun sekarang, firespot dihitung langsung dari FIRMS dengan rumus yang sama dengan situs', '- *tunggu*: tetap menunggu situs'])

// Detak 10 menit gateway: proyek yang memilih *tunggu* dibangun begitu situs memuat lintasan siang.
// ctx.balasKe(dari, masuk) -> {balas, balasFile}; masuk = jam pesan *tunggu*. Sesudah 3 status kosong berturut-turut atau 3 jam, pemegang ditanya sekali lagi.
export async function ulangSatelit(ctx) {
  const hasil = [], log = ctx.log || (() => {}), kini = (ctx.now || new Date()).getTime()
  for (const [id, e] of Object.entries(bacaJson(satelitP(ctx.dasar || RUMAH), {}))) {
    if (e.keadaan !== 'tunggu') continue
    if (kini - Number(e.dibuat || e.waktu || 0) > SATELIT_BASI_MS) { catatSatelit(ctx, id, null); hasil.push({ id, status: 'basi' }); continue }
    let p
    try { p = await bacaProyek(ctx, id, e.sha) } catch (x) { log('ulang satelit', id, x.message); continue }
    if (!MENUNGGU.includes(p.status)) { catatSatelit(ctx, id, null); hasil.push({ id, status: 'buang' }); continue }
    const st = await statusSatelit(ctx, e.tanggal)
    const c = { ...ctx, ...(ctx.balasKe ? ctx.balasKe(e.dari, e.masuk) : {}) }
    if (st?.situs_memuat !== true) {
      const nol = st ? 0 : Number(e.nol || 0) + 1
      const ulang = !e.ditanyaUlang && (nol >= TUNGGU_NOL_MAKS || kini - Number(e.mulaiTunggu || e.waktu || kini) >= TUNGGU_MAKS_MS)
      catatSatelit(ctx, id, { ...e, waktu: e.waktu, nol, ditanyaUlang: e.ditanyaUlang || ulang })
      if (ulang && c.balas) { try { await c.balas(tTanyaUlangSatelit(id, st)) } catch (x) { log('ulang satelit tanya', id, x.message) } }
      hasil.push({ id, status: ulang ? 'tanya ulang' : 'tunggu' })
      continue
    }
    try { await buat({ aksi: 'buat', jenis: e.jenis, tanggal: e.tanggal, saja: true, lanjut: true }, e.dari, e.sha, c); hasil.push({ id, status: 'bangun' }) } catch (x) { log('ulang satelit bangun', id, x.message); hasil.push({ id, status: 'galat' }) }
  }
  return hasil
}

// `lanjut`: proyek terbuka pengirim (yang dituntun lebih dulu, lalu yang terbaru) dibangun; status bertanya = bangun dengan catatan.
async function lanjut(dari, sha, ctx) {
  const ps = await proyekPengirim(ctx, sha, (p) => MENUNGGU.includes(p.status) || p.status === 'membangun' || p.status === 'draf')
  const tunggu = ps.filter((p) => MENUNGGU.includes(p.status))
  const t = tuntunTerakhir(ctx, sha)
  const p = tunggu.find((x) => x.id === t) || tunggu[0]
  if (!p) {
    const lain = ps[0]
    if (lain?.status === 'membangun') return ctx.balas(tSibuk(lain, lain.versi || null))
    if (lain?.status === 'draf') return ctx.balas(susun('Draf sudah ada', lain, lain.versi, 'Tulis perubahan dengan kalimat biasa, atau balas *1* untuk final.'))
    return ctx.balas(susun('Belum ada proyek terbuka', null, null, 'Ketik *buat harian* atau *buat penanganan* dulu, lalu kirim bahannya.'))
  }
  return buat({ aksi: 'buat', jenis: p.jenis, tanggal: p.tanggal, saja: p.status === 'bertanya', lanjut: true }, dari, sha, ctx)
}

// Tanda terima: satu pesan per kiriman; kiriman yang datang dalam JEDA_TERIMA_MS digabung jadi satu pesan (limiter, Q1).
const JEDA_TERIMA_MS = 20e3
const antreTerima = new Map()
function jadwalTerima(ctx, sha, dari, id, k, tgl = null) {
  const kunciAntre = `${ctx.dasar || RUMAH}|${sha}` // per mesin dan pengirim
  let a = antreTerima.get(kunciAntre)
  if (!a) {
    a = { k: [], id, dari }
    a.janji = new Promise((selesai) => {
      setTimeout(async () => {
        antreTerima.delete(kunciAntre)
        try { selesai(await kirimTerima(a.ctx, sha, a)) } catch (e) { (a.ctx.log || (() => {}))('[proyek] tanda terima gagal', e.message); selesai(null) }
      }, ctx.jedaTerima ?? JEDA_TERIMA_MS)
    })
    antreTerima.set(kunciAntre, a)
  }
  a.ctx = ctx // balas terbaru: jendela balasan limiter dihitung dari pesan masuk terakhir
  a.k.push({ k, tgl })
  return a.janji
}
async function kirimTerima(ctx, sha, a) {
  const p = await bacaProyek(ctx, a.id, sha)
  if (!MENUNGGU.includes(p.status)) { // sudah dibangun atau ditutup: tanpa tanda terima, tuntun dilepas
    const f = tuntunP(ctx.dasar || RUMAH), isi = bacaJson(f, {})
    if (isi[sha] === a.id) { delete isi[sha]; tulisJson(f, isi) }
    return null
  }
  const lap = lapDari(p.jenis)
  if (!lap) return null
  const lingkup = lingkupBahan(ctx.env, a.dari, sha)
  const bahan = await ambilBahan({ env: ctx.env, dep: { ...ctx.dep, fetch: fetchLingkup(ctx.dep, lingkup.boleh) }, tanggal: p.tanggal, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log: ctx.log || (() => {}) })
  const { terpilih } = await bahan.pilihSesuai(lap)
  const milik = new Set(jenisLap(lap))
  const kenal = a.k.filter((x) => x.k && milik.has(x.k))
  const beda = kenal.filter((x) => x.tgl && x.tgl !== p.tanggal) // bahan bertanggal hari lain: tidak dipakai untuk proyek ini
  const diterima = [...new Set(kenal.filter((x) => !beda.includes(x)).map((x) => labelBahan(x.k)))]
  const lain = a.k.length - kenal.length
  const teks = tTerima(p, lap, p.tanggal, terpilih, { diterima, lain, beda: beda.map((x) => ({ label: labelBahan(x.k), tgl: x.tgl })) })
  await ctx.balas(teks)
  return teks
}

// ---------- versi, pptx, batal ----------
async function perintahProyek(cmd, dari, sha, ctx) {
  const { balas } = ctx
  const ps = await proyekPengirim(ctx, sha, (p) => cmd.aksi === 'batal' || p.versi > 0)
  const p = cmd.id ? ps.find((x) => x.id === cmd.id) : ps.find((x) => x.status === 'draf') || ps[0]
  if (!p) {
    if (cmd.id) return balas(susun(cmd.aksi === 'batal' ? 'Tidak ada yang dibatalkan' : 'Proyek tidak ditemukan', null, null, `Proyek ${cmd.id} sudah tidak terbuka. Ketik *status* untuk melihat proyek Anda.`))
    return balas(cmd.aksi === 'batal' ? susun('Tidak ada proyek terbuka', null, null, 'Tidak ada yang perlu dibatalkan.') : susun('Belum ada draf', null, null, 'Kirim bahan, lalu ketik *buat harian* atau *buat penanganan*.'))
  }
  const lap = lapDari(p.jenis)
  const nama = lap ? judul(lap, p.tanggal) : p.jenis
  if (cmd.aksi === 'balik') return revisi(null, dari, sha, p, ctx, { balik: cmd.n })
  if (cmd.aksi === 'versi') {
    const v = await versiDaftar(ctx, p, sha)
    const baris = v.map((x) => `v${x.n} ${jamLabel(x.dibuat)}, ${rapi(x.instruksi || 'buat', 80)}`)
    return balas(susun('Riwayat versi', p, p.versi, [nama, ...baris.map((b) => `- ${b}`)], 'Ketik *balik v1* (atau nomor lain) untuk membuat versi baru dengan isi versi itu.'))
  }
  if (cmd.aksi === 'pptx') {
    if (!lap) return balas(susun('PPTX belum bisa dikirim', p, p.versi, `Jenis ${p.jenis} belum bisa dikirim lewat bot. Hubungi pemilik.`))
    const f = await pastikanPptx(ctx, p, lap, p.versi, sha)
    return ctx.balasFile(f, path.basename(f), susun(`PPTX draf v${p.versi}`, p, p.versi, nama), MIME.pptx) // dihitung limiter seperti kiriman lain (Q1)
  }
  // batal; dari menu (angka 4) bertanya sekali dulu, `ya` dalam 5 menit menjalankannya (cmd.id)
  if (cmd.tanya) {
    catatKonfirmasi(ctx, sha, p.id)
    return balas(susun('Batalkan proyek ini?', p, p.versi || null, [nama, `Ketik *ya* untuk membatalkan ${p.id}, tanpa unggah.`], 'Berlaku 5 menit. Abaikan pesan ini bila tidak jadi.'))
  }
  if (p.status === 'membangun' && kunciHidup(lockProyek(ctx.dasar || RUMAH, p.id))) return balas(susun('Sedang dibangun', p, p.versi || null, 'Tunggu sebentar, lalu ketik *batal* lagi.'))
  await pindahStatus(ctx, p, 'batal', sha)
  try { catatSatelit(ctx, p.id, null) } catch {}
  catatGagal(ctx, sha, null)
  hapusIndeks(ctx.dasar || RUMAH, p.id)
  return balas(susun('Proyek dibatalkan', p, p.versi || null, [`${nama} dibatalkan, tanpa unggah.`, 'Ketik *buat* untuk memulai lagi.']))
}

// ---------- final dan closing (BL-12; ALUR C, K7, Q1, Q9, Q10, T10, D13) ----------
// final: keadaan dicatat di proyek/final.json LEBIH DULU, lalu draf -> final; PPTX lalu PDF versi terakhir ke pemegang (2 kiriman, PPTX ikut limiter);
// Drive <tanggal>/Revisi N/ (drive.cjs folderRevisi); ditutup dengan drive_url; T-FINAL. Q10: tidak pernah ke PENERIMA.
// D13: final bot TIDAK diunggah ke /api/wa/hasil (kunci lapor-otomatis/<tanggal>/<laporan> milik jalur terjadwal); final bot sudah tersimpan di bl_versi.
// Gagal (pindah status, Drive, ditutup, kirim T-FINAL): keadaan tetap di final.json, ulangFinal() (tiap 10 menit) melanjutkan dari langkah yang belum.
// Folder Revisi yang terpilih disimpan sebelum unggah: ulangan tidak pernah membuat Revisi kedua. Pemilik dikabari sekali per proyek per jenis galat.
// Lewat 24 jam belum selesai: berhenti diulang, pemilik dikabari sekali untuk ditangani manual. T-FINAL tidak pernah dikirim dua kali (st.tfinal).
const BATAS_ULANG_FINAL_MS = 24 * 3600e3
const finalP = (dasar) => path.join(dirProyek(dasar), 'final.json')
const bacaFinal = (dasar) => bacaJson(finalP(dasar), { proyek: {} })
function simpanFinal(dasar, st) { const ix = bacaFinal(dasar); ix.proyek[st.id] = st; tulisJson(finalP(dasar), ix) }
function hapusFinal(dasar, id) { const ix = bacaFinal(dasar); if (ix.proyek[id]) { delete ix.proyek[id]; tulisJson(finalP(dasar), ix) } }
const driveDari = (ctx) => ctx.dep.drive || req('./drive.cjs').buat({ env: ctx.env, log: ctx.log })
async function kePemilik(ctx, teks) {
  if (ctx.kabariPemilik) return ctx.kabariPemilik(teks)
  const pm = daftar(ctx.env.PEMILIK)[0]
  if (pm && ctx.dep.kirimTeks) await ctx.dep.kirimTeks(pm, teks)
}
const bacaProyek = async (ctx, id, sha) => (await proyekBuka(ctx, { id, wa_sha: sha })).proyek

export async function tFinal(ctx, st) {
  const p = { id: st.id }, lap = lapDari(st.jenis)
  let riwayat = []
  try { riwayat = (await versiDaftar(ctx, p, st.sha)).map((x) => `v${x.n} ${jamLabel(x.dibuat)}, ${rapi(x.instruksi || 'buat', 80)}`) } catch (e) { (ctx.log || (() => {}))('riwayat versi gagal', e.message) }
  return susun('Laporan selesai', p, st.n, [`${lap ? judul(lap, st.tanggal) : st.jenis}, final versi ${st.n}.`,
    `Folder Drive${st.folder?.nama ? ' (' + st.folder.nama + ')' : ''}:`, st.driveUrl],
    bagian('Riwayat versi', riwayat),
    'Proyek ditutup. Bahan berikutnya membuka proyek baru.')
}

async function galatFinal(ctx, st, jenis, e) {
  (ctx.log || (() => {}))('final', st.id, jenis, e.message)
  st.galat = { ...(st.galat || {}), [jenis]: String(e.message).slice(0, 300) }
  if (!st.kabar?.[jenis]) {
    const apa = { status: 'pindah status ke final', drive: 'unggah Google Drive', tutup: 'pindah status ke ditutup', kirim: 'kirim T-FINAL ke pemegang' }[jenis]
    try { await kePemilik(ctx, tGalatPemilik({ id: st.id }, st.n, `${kapital(apa || String(jenis))} gagal, diulang otomatis tiap 10 menit.`, e.message)); st.kabar = { ...(st.kabar || {}), [jenis]: true } } catch (x) { (ctx.log || (() => {}))('kabar pemilik gagal', x.message) }
  }
  simpanFinal(ctx.dasar || RUMAH, st)
}

// Pastikan Worker berstatus final (atau sudah ditutup). Jawaban hilang = baca ulang. -> 'ok' | 'tertunda' | 'buang' (proyek berubah, keadaan dibuang).
async function pastikanFinal(ctx, st) {
  if (st.statusFinal) return 'ok'
  let q
  try { q = await bacaProyek(ctx, st.id, st.sha) } catch (e) { await galatFinal(ctx, st, 'status', e); return 'tertunda' }
  if (q.status === 'draf' && Number(q.versi) === Number(st.n)) {
    try { await proyekStatus(ctx, st.id, 'final', st.sha) } catch (e) {
      try { q = await bacaProyek(ctx, st.id, st.sha) } catch {}
      if (!['final', 'ditutup'].includes(q?.status)) { await galatFinal(ctx, st, 'status', e); return 'tertunda' }
    }
    q = { ...q, status: q.status === 'ditutup' ? 'ditutup' : 'final' }
  }
  if (!['final', 'ditutup'].includes(q.status)) return 'buang'
  st.statusFinal = true
  if (q.status === 'ditutup') { st.ditutup = true; if (!st.driveUrl && q.drive_url) st.driveUrl = q.drive_url }
  simpanFinal(ctx.dasar || RUMAH, st)
  return 'ok'
}

// Satu langkah lanjut untuk proyek final; idempoten. kirim(teks) = T-FINAL ke pemegang. -> 'ditutup' | 'tertunda' | 'buang'
async function lanjutFinal(ctx, st, kirim, { kirimBerkas = null } = {}) {
  const dasar = ctx.dasar || RUMAH
  const lap = lapDari(st.jenis)
  const simpan = () => simpanFinal(dasar, st)
  const ok = await pastikanFinal(ctx, st)
  if (ok === 'buang') { hapusFinal(dasar, st.id); return 'buang' }
  if (ok !== 'ok') return 'tertunda'
  const berkas = async () => {
    const p = { id: st.id, tanggal: st.tanggal }
    return [{ p: await pastikanPptx(ctx, p, lap, st.n, st.sha, 'pptx'), mime: MIME.pptx }, { p: await pastikanPptx(ctx, p, lap, st.n, st.sha, 'pdf'), mime: MIME.pdf }]
  }
  if (kirimBerkas && !st.berkasTerkirim) {
    try { await kirimBerkas(await berkas()) } catch (e) { (ctx.log || (() => {}))('kirim berkas final gagal', e.message) }
    st.berkasTerkirim = true; simpan() // sekali saja: PPTX dan PDF tidak dikirim ulang oleh ulangan
  }
  if (!st.driveUrl) {
    try {
      const drive = driveDari(ctx)
      if (!st.folder) {
        const f = await drive.folderRevisi({ tanggal: st.tanggal, laporan: st.jenis })
        if (!f?.id) throw new Error('Google Drive belum dikonfigurasi (DRIVE_CLIENT_ID, DRIVE_ROOT, DRIVE_LAPORAN, ~/.wa-bot/drive.json)')
        st.folder = { id: f.id, nama: f.nama, n: f.n }; simpan() // dicatat SEBELUM unggah: ulangan memakai folder yang sama
      }
      const url = await drive.unggahKeFolder({ folder: st.folder, berkas: await berkas() })
      if (!url) throw new Error('Drive tidak memberi tautan folder')
      st.driveUrl = url; simpan()
    } catch (e) { await galatFinal(ctx, st, 'drive', e); return 'tertunda' }
  }
  if (!st.ditutup) {
    try { await proyekStatus(ctx, st.id, 'ditutup', st.sha, { drive_url: st.driveUrl }) } catch (e) {
      let q = null
      try { q = await bacaProyek(ctx, st.id, st.sha) } catch {}
      if (q?.status !== 'ditutup') { await galatFinal(ctx, st, 'tutup', e); return 'tertunda' }
    }
    st.ditutup = true; simpan()
  }
  if (!st.tfinal) {
    try { await kirim(await tFinal(ctx, st)) } catch (e) { await galatFinal(ctx, st, 'kirim', e); return 'tertunda' }
    st.tfinal = true; simpan()
  }
  hapusFinal(dasar, st.id)
  hapusIndeks(dasar, st.id)
  return 'ditutup'
}

async function final(dari, sha, ctx, id = null) {
  const { balas } = ctx
  const dasar = ctx.dasar || RUMAH
  const tunda = Object.values(bacaFinal(dasar).proyek).find((x) => x.sha === sha)
  const ps = await proyekPengirim(ctx, sha, (p) => p.versi > 0, { jugaFinal: true })
  // urutan: final yang tercatat di mesin, lalu proyek yang di Worker sudah final (jawaban hilang, keadaan lokal hilang), lalu draf
  const p = (tunda && (!id || tunda.id === id) && { id: tunda.id }) || ps.find((x) => x.status === 'final' && (!id || x.id === id)) || ps.find((x) => x.status === 'draf' && (!id || x.id === id))
  if (!p) {
    if (ps.some((x) => x.status === 'membangun')) return balas(susun('Sedang dibangun', ps[0], ps[0].versi || null, 'Tunggu sebentar, lalu ketik *final* lagi.'))
    return balas(susun('Belum ada draf untuk difinalkan', null, null, 'Kirim bahan, lalu ketik *buat harian* atau *buat penanganan*.'))
  }
  const lepas = kunciProses(lockProyek(dasar, p.id))
  if (!lepas) return balas(susun('Sedang diproses', p, p.versi || tunda?.n || null, 'Tunggu sebentar, lalu ketik *final* lagi.'))
  try {
    let st = tunda
    if (!st) {
      const lap = lapDari(p.jenis)
      if (!lap) return balas(susun('Final belum bisa', p, p.versi, `Jenis ${p.jenis} belum bisa difinalkan lewat bot. Hubungi pemilik.`))
      st = { id: p.id, sha, dari, jenis: p.jenis, tanggal: p.tanggal, n: p.versi, folder: null, driveUrl: null, ditutup: false, tfinal: false, kabar: {}, mulai: (ctx.now || new Date()).getTime() }
      await pastikanPptx(ctx, p, lap, st.n, sha, 'pptx'); await pastikanPptx(ctx, p, lap, st.n, sha, 'pdf') // berkas ada sebelum status berubah
      try { catatSatelit(ctx, st.id, null) } catch {}
      simpanFinal(dasar, st) // SEBELUM pindah ke final: mati di tengah = ulangFinal melanjutkan
    } else if (st.basi) {
      return balas(susun('Final sedang ditangani', { id: st.id }, st.n, `Final v${st.n} belum selesai lebih dari 24 jam. Pemilik sedang menanganinya, tunggu kabar.`))
    }
    const lap = lapDari(st.jenis), nama = judul(lap, st.tanggal), pk = { id: st.id }
    // Q1: PPTX dikirim saat final (dihitung limiter seperti kiriman lain), lalu PDF. Hanya ke pemegang (Q10).
    const kirimBerkas = async ([pptx, pdf]) => {
      await ctx.balasFile(pptx.p, path.basename(pptx.p), susun(`PPTX final v${st.n}`, pk, st.n, nama), MIME.pptx)
      await ctx.balasFile(pdf.p, path.basename(pdf.p), susun(`PDF final v${st.n}`, pk, st.n, nama), MIME.pdf)
    }
    const hasil = await lanjutFinal(ctx, st, balas, { kirimBerkas })
    if (hasil === 'buang') return balas(susun('Final belum tercatat', pk, st.n, 'Draf berubah sebelum final tercatat. Ketik *final* lagi.'))
    if (hasil !== 'ditutup') await balas(susun(`Final v${st.n} diterima`, pk, st.n, ['Penutupan belum selesai, diulang otomatis tiap 10 menit.', 'Tautan Drive menyusul.']))
    return hasil
  } finally { lepas() }
}

// Untuk detak 10 menit: lanjutkan tiap proyek final yang belum ditutup. ctx seperti tangani tanpa balas; T-FINAL lewat ctx.kirimKe(dari, teks).
export async function ulangFinal(ctx) {
  const dasar = ctx.dasar || RUMAH, now = (ctx.now || new Date()).getTime()
  const hasil = []
  for (const st of Object.values(bacaFinal(dasar).proyek)) {
    if (st.basi) continue
    const lepas = kunciProses(lockProyek(dasar, st.id))
    if (!lepas) continue // `final` sedang berjalan untuk proyek ini
    try {
      if (now - Number(st.mulai || now) > BATAS_ULANG_FINAL_MS) {
        try { await kePemilik(ctx, tGalatPemilik({ id: st.id }, st.n, `Final belum selesai sesudah 24 jam (${Object.keys(st.galat || {}).join(', ') || 'tanpa galat tercatat'}), tidak diulang lagi. Perlu ditangani manual.`)); st.basi = true; simpanFinal(dasar, st) } catch (x) { (ctx.log || (() => {}))('kabar pemilik gagal', x.message) }
        hasil.push({ id: st.id, status: 'basi' })
        continue
      }
      const kirim = (t) => (ctx.kirimKe || ((a, b) => ctx.dep.kirimTeks(a, b)))(st.dari, t)
      hasil.push({ id: st.id, status: await lanjutFinal(ctx, st, kirim) })
    } catch (e) { (ctx.log || (() => {}))('ulang final gagal', st.id, e.message); hasil.push({ id: st.id, status: 'galat' }) } finally { lepas() }
  }
  return hasil
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
    if (p.status === 'final') continue
    if (!AKTIF.includes(p.status)) { hapusIndeks(dasar, id); continue }
    const lap = lapDari(p.jenis)
    const [keadaan, lanjut] = { terbuka: ['menunggu bahan', 'Kirim bahan, lalu ketik *lanjut*.'], bertanya: ['menunggu jawaban', 'Kirim jawabannya, atau ketik *lanjut*.'], membangun: ['sedang dibangun', 'Tunggu sebentar.'], draf: ['draf siap', 'Balas *1* untuk final, atau tulis revisi.'] }[p.status]
    blok.push([kodeBaris(p, p.versi || null), lap ? judul(lap, p.tanggal) : p.jenis, `Status: ${keadaan}`, lanjut].join('\n'))
  }
  return ctx.balas(blok.length ? susun(blok.length > 1 ? `${blok.length} proyek terbuka` : 'Proyek terbuka', null, null, ...blok) : susun('Belum ada proyek terbuka', null, null, 'Kirim atau teruskan bahan, lalu ketik *buat harian* atau *buat penanganan*.'))
}

// ---------- bahan masuk (Q6) ----------
const TANPA_BUKA = new Set(['bmkg_pagi'])
async function tambahBahan(pesan, dari, sha, ctx) {
  const kenali = ctx.kenali || jenisWa.kenali
  const k = kenali(pesan.teks || '', pesan.nama_berkas || '')
  // K17: pemegang proyek yang dituntun mendapat tanda terima (digabung per jeda); status proyek diperiksa saat dikirim.
  const t = tuntunTerakhir(ctx, sha)
  const tglBahan = k ? (ctx.tanggalIsi || jenisWa.tanggalIsi || (() => null))(pesan.teks || '', k) || null : null // hanya tanggal yang tertulis di bahan
  const terima = t ? { terima: jadwalTerima(ctx, sha, dari, t, k, tglBahan) } : {}
  if (!k) return { status: 'menunggu buat', ...terima } // jenis tak dikenali (foto, PDF lain): dipakai saat `buat` dari /api/wa/masuk
  // TANPA_BUKA (BMKG pagi): tidak pernah membuka proyek sendiri; tetap tersimpan sebagai bahan dan terhitung saat pengirim mengetik `buat`.
  // Bahan milik lebih dari satu laporan juga menunggu `buat` menentukan jenisnya.
  const calon = TANPA_BUKA.has(k) ? [] : LAPORAN.filter((l) => jenisLap(l).includes(k))
  if (calon.length !== 1) return { status: 'menunggu buat', ...terima }
  const tanggal = (ctx.tanggalIsi || jenisWa.tanggalIsi || (() => null))(pesan.teks || '', k) || tanggalWib(ctx.now || new Date())
  const { proyek: p } = await proyekBuka(ctx, { wa_sha: sha, jenis: calon[0].id, tanggal, bahan: [{ wa_id: String(pesan.wa_id), jenis_bahan: k }] })
  catatIndeks(ctx.dasar || RUMAH, p, sha, dari)
  // TODO(BL-10): bahan baru untuk proyek draf memicu tawaran bangun ulang.
  return { status: 'ditambah', proyek: p.id, ...terima } // tanpa proyek dituntun: tanpa balasan (limiter 8 kiriman per tujuan per hari, Q1)
}

// ---------- Q7: kedaluwarsa (fungsi saja; penjadwalnya di tiket lain) ----------
export async function kedaluwarsa(ctx) {
  const dasar = ctx.dasar || RUMAH, now = (ctx.now || new Date()).getTime()
  const ix = bacaJson(indeksP(dasar), { proyek: {} })
  const hasil = []
  for (const [id, e] of Object.entries(ix.proyek)) {
    let p
    try { p = (await proyekBuka(ctx, { id, wa_sha: e.sha })).proyek } catch { continue }
    if (p.status === 'final') continue // ditutup lewat ulangFinal, bukan kedaluwarsa
    if (!AKTIF.includes(p.status)) { hapusIndeks(dasar, id); continue }
    const umur = now - Number(p.diubah || 0)
    if (p.status === 'membangun' ? (umur < MEMBANGUN_BASI_MS || kunciHidup(lockProyek(dasar, id))) : umur < KEDALUWARSA_MS) continue
    if (!await pindahStatus(ctx, p, 'kedaluwarsa', e.sha, { lempar: false })) continue
    try { catatSatelit(ctx, id, null) } catch {}
    hapusIndeks(dasar, id)
    const lap = lapDari(p.jenis)
    try { await (ctx.kirimKe || ((t, s) => ctx.dep.kirimTeks(t, s)))(e.dari, susun('Proyek ditutup otomatis', p, p.versi || null,
      [`${lap ? judul(lap, p.tanggal) : p.jenis} ditutup karena ${p.status === 'membangun' ? 'pembangunan terhenti lebih dari 1 jam' : '24 jam tanpa aktivitas'}, tanpa unggah.`, 'Ketik *buat* untuk memulai lagi.'])) } catch {}
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
// Pesan diteruskan yang isinya persis kata tuntun (angka menu, lanjut, buat saja, hitung, tunggu) = bahan, bukan perintah.
function bukanPerintahTerusan(cmd, teks) {
  if (['menu', 'lanjut', 'satelit', 'ulangi'].includes(cmd.aksi)) return true
  return cmd.aksi === 'buat' && normalPerintah(teks) === 'buat saja'
}
const drafPengirim = async (ctx, sha, o) => (await proyekPengirim(ctx, sha, (p) => p.status === 'draf' && p.versi > 0, o))[0] || null

// Untuk gateway (BL-09) sebelum meneruskan pesan teks ke Worker: 'perintah' | 'revisi' | 'bahan'. Tanpa efek samping (hanya membaca proyek).
// 'revisi' hanya bila pengirim memegang proyek draf dan calonRevisi; kalimat revisi tidak diteruskan ke Worker, jadi tidak pernah jadi bahan.
export async function klasifikasi(pesan, ctx) {
  if (!pesan || pesan.lama) return 'bahan'
  const cmd = pesan.ada_berkas ? null : parsePerintah(pesan.teks, ctx.now || new Date())
  if (cmd && !(pesan.diteruskan === true && bukanPerintahTerusan(cmd, pesan.teks))) return 'perintah' // angka menu, lanjut, buat saja, hitung, tunggu yang diteruskan = bahan
  const dari = normalWa(pesan.dari), sha = dari && !/@g\.us$/.test(dari) ? waSha(dari, ctx.env.WA_GARAM) : null
  if (sha && !pesan.ada_berkas && pesan.diteruskan !== true && teksYa(pesan.teks) && konfirmasiBatal(ctx, sha)) return 'perintah' // `ya` atas tanya batal dari menu
  if (!calonRevisi(pesan, ctx)) return 'bahan'
  if (!sha) return 'bahan'
  try { return (await drafPengirim(ctx, sha, { bersihkan: false })) ? 'revisi' : 'bahan' } catch { return 'bahan' }
}

// pesan: {dari, teks, wa_id?, nama_berkas?, ada_berkas?, diteruskan?, lama?}. Revisi tidak butuh wa_id (gateway tidak meneruskannya ke Worker). ctx: {env, dep, now, dasar, log, balas, balasFile, kabariPemilik?, kirimKe?, kenali?, tanggalIsi?, ada?}.
// Kembalian: {status} untuk pemanggil (gateway, BL-09).
export async function tangani(pesan, ctxAsli) {
  // Satu pesan masuk tidak pernah dijawab dua kali dengan teks yang sama (mis. galat dalam lalu galat umum).
  const sudah = new Set()
  const ctx = typeof ctxAsli?.balas === 'function' ? { ...ctxAsli, balas: async (t) => { if (sudah.has(t)) return; sudah.add(t); return ctxAsli.balas(t) } } : ctxAsli
  if (pesan?.lama) return { status: 'susulan dibuang' } // K11: pesan saat mesin mati tidak masuk proyek. TODO(BL-14): T-TERLEWAT sekali per nomor.
  const dari = normalWa(pesan?.dari)
  if (!dari || /@g\.us$/.test(dari)) return { status: 'bukan pemakai' }
  const sha = waSha(dari, ctx.env.WA_GARAM)
  let cmd = pesan.ada_berkas ? null : parsePerintah(pesan.teks, ctx.now || new Date())
  if (cmd && pesan.diteruskan === true && bukanPerintahTerusan(cmd, pesan.teks)) cmd = null // pesan diteruskan tidak pernah jadi angka menu, lanjut, buat saja, hitung, tunggu
  // `ya` dalam 5 menit sesudah angka 4 = batal proyek yang ditanyakan; pesan lain apa pun (termasuk bantuan) menghapus tanya batal itu.
  const ya = sha && !pesan.ada_berkas && pesan.diteruskan !== true && teksYa(pesan.teks) ? konfirmasiBatal(ctx, sha) : null
  if (sha) try { catatKonfirmasi(ctx, sha, null) } catch {}
  if (ya) cmd = { aksi: 'batal', id: ya.id }
  if (cmd?.aksi === 'panduan') {
    // Salin infografis dari repo ke ~/.wa-bot/keluaran (satu-satunya akar yang boleh dikirim gateway), kirim sebagai dokumen.
    const asal = path.join(DI, '../../data/kajian-bnpb/bot-laporan/infografis/panduan-bot.png')
    const tujuan = path.join(ctx.dasar || RUMAH, 'keluaran', 'panduan', 'Panduan Bot Laporan BNPB.png')
    try {
      fs.mkdirSync(path.dirname(tujuan), { recursive: true, mode: 0o700 })
      fs.copyFileSync(asal, tujuan)
      await ctx.balasFile(tujuan, path.basename(tujuan), susun('Panduan bot laporan', null, null, ['Buka berkas ini untuk melihat gambar ukuran penuh.']), 'image/png', { dokumen: true })
    } catch (e) {
      await ctx.balas(susun('Panduan belum tersedia', null, null, ['Ketik *bantuan* untuk daftar perintah.']))
    }
    return { status: 'panduan' }
  }
  if (cmd?.aksi === 'bantuan') {
    const pemilik = new Set(daftar(ctx.env.PEMILIK).map(normalWa))
    await ctx.balas(BANTUAN + (pemilik.has(dari) ? '\n' + BANTUAN_PEMILIK : ''))
    return { status: 'bantuan' }
  }
  if (!sha) {
    if (cmd) { await ctx.balas(susun('Bot belum siap', null, null, 'Pemilik sudah dikabari. Coba lagi beberapa saat lagi.')); await kabarSekali(ctx, 'garam', tGalatPemilik(null, null, 'WA_GARAM belum diisi di scripts/wa/.env.')) }
    return { status: 'belum siap' }
  }
  let jawab = !!cmd // galat dibalas ke pengirim hanya untuk perintah dan revisi, tidak untuk bahan biasa
  const gagalSebelum = JSON.stringify(gagalTerakhir(ctx, sha))
  try {
    // `lanjut`, `ulangi`, `buat saja` saat pembangunan pengirim ini masih jalan: dijawab sekali, tidak membangun kedua kalinya.
    if ((cmd?.aksi === 'lanjut' || cmd?.aksi === 'ulangi' || (cmd?.aksi === 'buat' && cmd.saja)) && await jawabSibuk(ctx, sha)) return { status: 'masih dibangun' }
    if (cmd?.aksi === 'ulangi') { await ulangi(dari, sha, ctx); return { status: 'ulangi' } }
    if (cmd?.aksi === 'satelit') {
      // K18: *tunggu* / *hitung* hanya menjawab pilihan hidup (di bawah 24 jam, proyek masih menunggu); selain itu petunjuk, tanpa proyek baru.
      const e = await pilihanSatelit(ctx, sha)
      if (!e) { await ctx.balas(susun('Tidak ada pilihan menunggu', null, null, `*${cmd.kata}* hanya menjawab pilihan data satelit laporan penanganan. Ketik *status* untuk melihat proyek.`)); return { status: 'satelit tanpa pilihan' } }
      await pilihSatelit(cmd.kata, e, dari, sha, ctx); return { status: cmd.kata }
    }
    if (cmd?.aksi === 'menu') {
      // Angka menu hanya berarti perintah untuk pemegang draf; di luar draf dijawab petunjuk, tidak pernah ke Claude.
      // Beberapa draf: angka berlaku untuk proyek yang menunya terakhir dikirim ke pengirim ini (menu.json); tanpa catatan itu tidak menebak.
      const drafs = await proyekPengirim(ctx, sha, (p) => p.status === 'draf' && p.versi > 0)
      if (!drafs.length) { await ctx.balas(susun('Belum ada draf', null, null, `Angka ${cmd.n} menjawab menu draf. Kirim bahan, lalu ketik *buat* dulu.`)); return { status: 'menu tanpa draf' } }
      const terakhir = menuTerakhir(ctx, sha)
      const sasaran = drafs.length === 1 ? drafs[0] : drafs.find((p) => p.id === terakhir)
      if (!sasaran) {
        const contoh = `${MENU_AKSI[cmd.n]} ${drafs[0].id}`
        await ctx.balas(susun(`Ada ${drafs.length} draf terbuka`, null, null, drafs.map((p) => `- ${p.id}: ${lapDari(p.jenis) ? judul(lapDari(p.jenis), p.tanggal) : p.jenis}`),
          `Ketik perintahnya dengan kode proyek, misalnya *${contoh}*.`))
        return { status: 'menu ganda' }
      }
      const aksi = MENU_AKSI[cmd.n]
      cmd = aksi === 'batal' ? { aksi, tanya: true, id: sasaran.id } : { aksi, id: sasaran.id }
    }
    if (cmd?.aksi === 'status') { await status(dari, sha, ctx); return { status: 'status' } }
    if (cmd?.aksi === 'buat') { await buat(cmd, dari, sha, ctx); return { status: cmd.saja ? 'buat saja' : 'buat' } }
    if (cmd?.aksi === 'lanjut') { await lanjut(dari, sha, ctx); return { status: 'lanjut' } }
    if (cmd?.aksi === 'final') { const r = await final(dari, sha, ctx, cmd.id || null); return { status: r === 'ditutup' ? 'ditutup' : r === 'tertunda' ? 'final tertunda' : 'final' } }
    if (cmd) { await perintahProyek(cmd, dari, sha, ctx); return { status: cmd.tanya ? 'tanya batal' : cmd.aksi } }
    // Perintah tidak pernah sampai ke sini (tidak pernah ke Claude). Revisi (ALUR B): calonRevisi dari pemegang proyek draf; forward dan bahan dikenali tetap bahan.
    if (calonRevisi(pesan, ctx)) {
      const draf = await drafPengirim(ctx, sha)
      if (draf) { jawab = true; await revisi(pesan, dari, sha, draf, ctx); return { status: 'revisi', proyek: draf.id } }
    }
    const sapa = !cmd && await sapaBila(pesan, sha, ctx) // T-SAPA: obrolan pendek tanpa proyek; bahan tetap lewat jalur biasa
    if (pesan.wa_id != null) { const r = await tambahBahan(pesan, dari, sha, ctx); return sapa ? { ...r, sapa: true } : r }
    return { status: sapa ? 'sapa' : 'diabaikan' }
  } catch (e) {
    (ctx.log || (() => {}))('[proyek] galat', e.message)
    await kabarSekali(ctx, 'proyek', tGalatPemilik(null, null, 'Perintah gagal.', e.message, 400))
    if (jawab) {
      // Langkah dalam (bangun, revisi) sudah mencatat dirinya; selain itu `ulangi` mengirim ulang pesan ini.
      if (JSON.stringify(gagalTerakhir(ctx, sha)) === gagalSebelum && cmd?.aksi !== 'ulangi') catatGagal(ctx, sha, { langkah: 'pesan', teks: String(pesan.teks || '') })
      await ctx.balas(susun('Perintah gagal diproses', null, null, ['Pemilik sudah dikabari.', AKHIR_GAGAL]))
    }
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
