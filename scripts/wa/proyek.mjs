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
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { LAPORAN, LAPORAN_PROYEK, ambilBahan, siapkanKeluaran, jalankanGenerator, kunciProses, tanggalWib, jamWib, MIME, dariIzin, KUNCI_BASI_MS } from './otomatis.mjs'
import { parseTanggal, labelTanggal } from './perintah.mjs'
import { buatKlien, GalatClaude, medanTerkunci, sebutAngkaSistem, samarkan } from './claude.mjs'
import * as jenisWa from '../../src/wa_jenis.js'
import * as Agen from './agen.mjs'
import * as Biaya from './biaya.mjs'
import * as Maksud from './maksud.mjs'
import * as Durasi from './durasi.mjs'
import { NAMA_BOT, VERSI, tChangelog, CHANGELOG } from './versi.mjs'
import { periksa as periksaPagar } from './agen_pagar.mjs'

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
const MAKS_KALIMAT = 8000 // kalimat revisi ke Claude; sama dengan batas gabungan kumpul revisi (D35)
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
const lapDari = (id) => [...LAPORAN, ...LAPORAN_PROYEK].find((l) => l.id === id)

// wa_sha = sha256("<WA_GARAM>|<62 nomor>") dari daftar.cjs (satu rumus dengan gateway dan pendaftaran, BL-03): satu-satunya pengenal pemakai yang keluar dari mesin.
export const waSha = req('./daftar.cjs').waSha

// ---------- perintah ----------
const JENIS_KATA = { harian: 'harian', bencana: 'harian', 'harian bencana': 'harian', 'kejadian bencana': 'harian',
  penanganan: 'penanganan', karhutla: 'penanganan', 'penanganan karhutla': 'penanganan',
  'banjir sepekan': 'banjir_sepekan', 'paparan banjir': 'banjir_sepekan', 'paparan banjir sepekan': 'banjir_sepekan', 'banjir mingguan': 'banjir_sepekan',
  gempa: 'gempa', 'gempa bumi': 'gempa', gempabumi: 'gempa', 'laporan gempa': 'gempa', 'laporan khusus gempa': 'gempa' }
// Lokasi laporan gempa: teks tempat bebas (huruf, angka, spasi), paling panjang 40 huruf; dicocokkan generator ke wilayah BMKG.
export const bersihLokasi = (s) => String(s ?? '').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)

// Periode paparan banjir sepekan (pemilik 19 Nov 2026: "bisa diatur juga tanggal yang dimau tanggal berapa aja") -> {awal, akhir} | null.
// Kosong = 7 hari sampai hari ini; satu tanggal = 7 hari sampai tanggal itu; "16-19 nov", "16 sampai 19 nov", "28 okt s.d. 3 nov",
// "16/11-19/11", "2026-11-16 2026-11-19". Paling panjang 31 hari, awal tidak sesudah akhir.
export const MAKS_PERIODE = 31
const tglSah = (y, m, d) => { const x = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, u = new Date(x + 'T00:00:00Z'); return !Number.isNaN(u.getTime()) && u.toISOString().slice(0, 10) === x ? x : null }
export function parsePeriode(s, now = new Date()) {
  const t = String(s ?? '').trim()
  const jadi = (awal, akhir) => (awal && akhir && awal <= akhir && Date.parse(akhir) - Date.parse(awal) < MAKS_PERIODE * 864e5 ? { awal, akhir } : null)
  const m = t.match(/^(\d{4}-\d{1,2}-\d{1,2})(?:\s*(?:-|–|sampai|sd|s\.d\.?|s\/d|hingga)\s*|\s+)(\d{4}-\d{1,2}-\d{1,2})$/)
  if (m) return jadi(parseTanggal(m[1], now), parseTanggal(m[2], now))
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) { const akhir = parseTanggal(t, now); return akhir ? jadi(geserHari(akhir, -6), akhir) : null }
  const bagian =t.split(/\s*(?:\bsampai(?: dengan)?\b|\bhingga\b|\bs\.?d\b\.?|\bs\/d\b|–|-)\s*/).filter(Boolean)
  if (!t || bagian.length === 1) {
    const akhir = parseTanggal(t, now)
    return akhir ? jadi(geserHari(akhir, -6), akhir) : null
  }
  if (bagian.length !== 2) return null
  const akhir = parseTanggal(bagian[1], now)
  if (!akhir) return null
  let awal = parseTanggal(bagian[0], now)
  if (!awal && /^\d{1,2}$/.test(bagian[0])) { // "16-19 nov": bulan dan tahun dari tanggal akhir; "28-3 nov" = 28 bulan sebelumnya
    const [y, mo] = akhir.split('-').map(Number), d = Number(bagian[0])
    awal = tglSah(y, mo, d)
    if (!awal || awal > akhir) awal = mo === 1 ? tglSah(y - 1, 12, d) : tglSah(y, mo - 1, d)
  } else if (awal && awal > akhir && !/\d{4}/.test(bagian[0])) awal = tglSah(Number(awal.slice(0, 4)) - 1, Number(awal.slice(5, 7)), Number(awal.slice(8, 10))) // "28 des - 3 jan"
  return jadi(awal, akhir)
}

// -> {aksi:'buat', jenis|null, tanggal, saja} | {aksi:'status'|'bantuan'|'versi'|'pptx'|'batal'|'final'} | {aksi:'balik', n} | null (bukan perintah: bahan atau revisi).
// Teks panjang atau berbaris banyak = bahan (aturan sama dengan perintah.mjs). `status <tanggal>` bukan milik mesin ini (Q14).
export function parsePerintah(teks, now = new Date()) {
  const asli = String(teks ?? '').trim()
  const t = normalPerintah(asli)
  if (!t || t.length > 60 || /\n/.test(asli)) return null
  if (t === 'bantuan') return { aksi: 'bantuan' }
  if (t === 'terima kurang') return { aksi: 'terima_kurang' } // 12 Nov: WA menyebut 20 kejadian, merinci 15; hanya atas perintah pemilik
  if (t === 'ulangi') return { aksi: 'ulangi' } // ulangi langkah terakhir yang gagal (bangun atau revisi)
  if (t === 'changelog' || t === 'versi bot' || t === 'tentang') return { aksi: 'changelog', semua: false } // nama, versi, changelog (pemilik 19 Nov)
  if (t === 'changelog semua') return { aksi: 'changelog', semua: true }
  if (t === 'biaya') return { aksi: 'biaya' } // pemakaian Claude bulan ini dan hari ini, biaya laporan terakhir (khusus PEMILIK)
  if (t === 'panduan') return { aksi: 'panduan' } // infografis panduan bot, dikirim sebagai PDF (pemilik 18 Nov 2026: PDF, bukan gambar)
  if (t === 'status') return { aksi: 'status' }
  if (t === 'selesai') return { aksi: 'selesai' } // menutup kumpul revisi (sama dengan lanjut saat kumpul terbuka)
  if (t === 'revisi') return { aksi: 'revisi' } // V2.1 D35: buka kumpul revisi (beberapa pesan, lalu lanjut)
  const rv = t.match(/^revisi (p-\d{6}-\d{2})$/)
  if (rv) return { aksi: 'revisi', id: rv[1].toUpperCase() }
  if (t === 'lanjut') return { aksi: 'lanjut' } // K17: bangun proyek terbuka pengirim (bot selalu menunggu kata ini)
  if (t === 'hitung' || t === 'tunggu' || t === 'sekarang') return { aksi: 'satelit', kata: t } // K18/K44: menjawab pilihan data satelit; tanpa pilihan hidup = petunjuk
  // K43: menjawab tawaran slide rincian laporan harian (angka *1*/*2* dijawab di penyalur bila tawaran hidup)
  if (t === 'tambah rincian' || t === 'rincian ya' || t === 'pakai rincian') return { aksi: 'rincian', ya: true }
  if (t === 'tanpa rincian' || t === 'rincian tidak') return { aksi: 'rincian', ya: false }
  if (['versi', 'pptx', 'batal', 'final'].includes(t)) return { aksi: t }
  const k = t.match(/^(versi|pptx|batal|final) (p-\d{6}-\d{2})$/) // berkode: pemegang beberapa draf memilih proyeknya
  if (k) return { aksi: k[1], id: k[2].toUpperCase() }
  if (/^[1-5][\s.]*$/.test(t)) return { aksi: 'menu', n: Number(t[0]) } // menu bernomor di akhir draf; di luar draf dijawab petunjuk
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
  if (jenis && lapDari(jenis)?.lokasi) { // "buat gempa nias", "buat gempa nias 19 nov", "buat gempa": tempat lalu tanggal opsional di ujung
    const kata = sisa.split(' ').filter(Boolean)
    for (let i = 0; i <= kata.length; i++) { // ekor terpanjang yang terbaca sebagai tanggal; sisanya lokasi
      const ekor = kata.slice(i).join(' ')
      const tanggal = ekor ? parseTanggal(ekor, now) : tanggalWib(now)
      if (tanggal) return { aksi: 'buat', jenis, tanggal, lokasi: bersihLokasi(kata.slice(0, i).join(' ')), saja: true }
    }
  }
  if (jenis && lapDari(jenis)?.periode) { // tanpa bahan yang ditunggu: langsung dibangun (setara buat saja)
    const pr = parsePeriode(sisa, now)
    return pr ? { aksi: 'buat', jenis, tanggal: pr.akhir, awal: pr.awal, saja: true } : { aksi: 'bantuan' }
  }
  const tanggal = parseTanggal(sisa, now)
  if (!tanggal) return { aksi: 'bantuan' }
  return { aksi: 'buat', jenis, tanggal, saja }
}

export const BANTUAN = [
  `*Cara pakai ${NAMA_BOT}*`,
  '',
  '*Membuat laporan*',
  '- *buat harian*: mulai laporan kejadian bencana',
  '- *buat penanganan*: mulai laporan penanganan karhutla',
  '- *buat banjir sepekan 16-19 nov*: paparan banjir sepekan, periode bebas, langsung dibuat',
  '- *buat gempa nias*: laporan khusus gempa terbaru di tempat itu (data BMKG dan BPBD), langsung dibuat',
  '- Kirim atau teruskan bahan yang diminta',
  '- *lanjut*: buat laporan dari bahan ada',
  '',
  '*Saat draf*',
  '- *1* atau *revisi*: kirim revisi beberapa pesan, lalu *selesai*',
  '- *2* atau *final*: kirim versi final',
  '- *3* atau *pptx*: minta berkas PPTX',
  '- *4* atau *versi*: lihat riwayat versi',
  '- *5* atau *batal*: batalkan proyek',
  '- *balik v2*: pakai isi versi 2',
  '- Kalimat biasa: revisi atau tanya isi draf',
  '',
  '*Lainnya*',
  '- *status*: proyek yang masih terbuka',
  '- *ulangi*: coba lagi langkah yang gagal',
  '- *batal*: batalkan proyek kapan saja',
  '- *bantuan*: tampilkan pesan ini',
  '- *panduan*: kirim panduan lengkap (PDF)',
  '- *changelog*: perubahan versi terbaru',
  '',
  'Contoh: *buat harian kemarin*, kirim bahannya, lalu *lanjut*',
  'Boleh juga kalimat biasa, misalnya "bikinin laporan harian kemarin".',
  'Tanggal bisa: kemarin, 26 okt, 26/10, 2026-10-26.',
  '',
  `${NAMA_BOT} v${VERSI}`,
].join('\n')
const BANTUAN_PEMILIK = ['', '*Khusus pemilik*', '- *kirim ulang harian 26 okt*: kirim ulang berkas', '- *status 26 okt*: rekap bahan per tanggal', '- *biaya*: pemakaian Claude bulan ini, hari ini, dan per laporan'].join('\n')

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
  '- *panduan*: panduan lengkap (PDF)',
  '',
  `${NAMA_BOT} v${VERSI}`,
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
// Periode laporan berperiode (banjir_sepekan): Worker hanya menyimpan tanggal (= akhir), awalnya disimpan di mesin per proyek.
const periodeP = (dasar, id) => path.join(dirProyek(dasar), id, 'periode.json')
export function periodeProyek(dasar, p) {
  const d = bacaJson(periodeP(dasar, p.id), null)
  return d?.akhir === p.tanggal && d.awal ? d : { awal: geserHari(p.tanggal, -6), akhir: p.tanggal }
}
const catatPeriode = (dasar, p, awal) => tulisJson(periodeP(dasar, p.id), { awal, akhir: p.tanggal })
// Lokasi laporan gempa: Worker hanya menyimpan jenis dan tanggal, teks tempatnya disimpan di mesin per proyek (pola periode).
const lokasiP = (dasar, id) => path.join(dirProyek(dasar), id, 'lokasi.json')
export const lokasiProyek = (dasar, p) => bersihLokasi(bacaJson(lokasiP(dasar, p.id), {})?.lokasi || '')
const catatLokasi = (dasar, p, lokasi) => tulisJson(lokasiP(dasar, p.id), { lokasi: bersihLokasi(lokasi) })
// WA Koordalops tiap hari periode dari bahan tersimpan (laphar D dikirim pagi D+1): berkas untuk --wa generator dan bahan agen.
async function koordalopsPeriode(ctx, dep, awal, akhir, ke) {
  const harian = LAPORAN.find((l) => l.id === 'harian'), log = ctx.log || (() => {}), kini = tanggalWib(ctx.now || new Date()), hasil = []
  fs.mkdirSync(ke, { recursive: true, mode: 0o700 })
  for (let h = geserHari(awal, 1); h <= geserHari(akhir, 1) && h <= kini; h = geserHari(h, 1)) {
    try {
      const b = await ambilBahan({ env: ctx.env, dep, tanggal: h, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log })
      const { teks } = await b.pilihSesuai(harian)
      const t = teks.rekap_koordalops_24
      if (!t || /^biner:/.test(t)) continue
      const f = path.join(ke, `koordalops-${h}.txt`)
      fs.writeFileSync(f, t, { mode: 0o600 })
      hasil.push({ tanggal: h, f, teks: t })
    } catch (e) { log('[periode] koordalops', h, e.message) }
  }
  return hasil
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

// ---------- batal = mulai dari awal (pemilik 19 Nov 2026: "kalau batal, semua inputan untuk project itu hapus aja") ----------
// Bahan tersimpan per tanggal di kotak masuk WA (bukan per proyek), jadi `batal` mencatat waktunya per (nomor, jenis, tanggal):
// proyek berikutnya untuk jenis dan tanggal yang sama hanya memakai bahan yang masuk SESUDAH batal. ~/.wa-bot/proyek/batal.json.
const batalP = (dasar) => path.join(dirProyek(dasar), 'batal.json')
const kunciBatal = (sha, jenis, tanggal) => `${sha}|${jenis}|${tanggal}`
export const waktuPesan = (m) => Number(m?.diterima) || Date.parse(m?.diterima) || 0
export const waktuBatal = (ctx, sha, jenis, tanggal) => Number(bacaJson(batalP(ctx.dasar || RUMAH), {})[kunciBatal(sha, jenis, tanggal)] || 0)
export function catatBatal(ctx, sha, jenis, tanggal) {
  const f = batalP(ctx.dasar || RUMAH), isi = bacaJson(f, {}), kini = (ctx.now || new Date()).getTime()
  for (const [k, t] of Object.entries(isi)) if (kini - Number(t) > 8 * 864e5) delete isi[k] // bahan lebih dari seminggu tidak dipakai lagi
  isi[kunciBatal(sha, jenis, tanggal)] = kini
  tulisJson(f, isi)
}
function sesudahBatal(ctx, sha, jenis, tanggal, boleh) {
  const t = waktuBatal(ctx, sha, jenis, tanggal)
  return t ? (m) => boleh(m) && waktuPesan(m) > t : boleh
}
// fetch yang hanya meneruskan baris dalam lingkup dan menyimpan tiap jawaban /api/wa/masuk.
function fetchLingkup(dep, bolehAsli, bukan = null) {
  const boleh = bukan ? (m) => !bukan.has(String(m?.id)) && bolehAsli(m) : bolehAsli // V2.2 D40: screenshot revisi dan pertanyaan bukan bahan
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
// opsi.simpanGambar: folder; gambar bahan disalin ke sana sebelum dihapus (V2.2 D38), hasil membawa `gambar` (jalur salinan)
export async function ekstrak(p, ctx, kerja, opsi = {}) {
  const { env, dep } = ctx
  const nama = p.nama_berkas || ''
  const caption = String(p.teks || '').trim()
  if (!p.ada_berkas) return caption ? { id: String(p.id), jenis: 'teks', teks: caption, nama } : null
  const bentuk = bentukBerkas(p)
  if (bentuk === 'lain') return { id: String(p.id), tidakTerbaca: true, nama }
  let isi = '', disimpan = null
  const ujung = path.join(kerja, `${String(p.id).replace(/[^\w.-]/g, '_')}${EXT(p) || '.bin'}`)
  try {
    const r = await dep.fetch(`${W(env)}/api/wa/berkas?id=${encodeURIComponent(p.id)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` }, signal: AbortSignal.timeout(WAKTU_WORKER) })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const buf = Buffer.from(await r.arrayBuffer())
    if (bentuk === 'teks' || bentuk === 'csv') isi = buf.toString('utf8')
    else {
      fs.mkdirSync(kerja, { recursive: true, mode: 0o700 })
      fs.writeFileSync(ujung, buf, { mode: 0o600 })
      if (bentuk === 'gambar' && opsi.simpanGambar && buf.length <= MAKS_BAHAN_GAMBAR_BYTE) {
        fs.mkdirSync(opsi.simpanGambar, { recursive: true, mode: 0o700 })
        disimpan = path.join(opsi.simpanGambar, path.basename(ujung)); fs.copyFileSync(ujung, disimpan)
      }
      if (bentuk === 'pdf') isi = String((await dep.exec(env.PDFTOTEXT || 'pdftotext', ['-layout', ujung, '-'], { timeout: 60e3, maxBuffer: 20e6 })).stdout || '')
      else if (bentuk === 'excel') isi = String((await dep.exec(pyBin(env), ['-c', PY_CSV, ujung], { timeout: 60e3, maxBuffer: 20e6 })).stdout || '')
      else isi = String((await (dep.ocr || req('./ocr.cjs').bacaStempel)(ujung, 30e3)) || '')
    }
  } catch (e) {
    (ctx.log || (() => {}))('ekstrak gagal', p.id, e.message)
    isi = ''
  } finally { fs.rmSync(ujung, { force: true }) }
  if (!cukup(isi)) return { id: String(p.id), tidakTerbaca: true, nama, ...(disimpan ? { gambar: disimpan } : {}) }
  const tabel = bentuk === 'excel' || bentuk === 'csv'
  return { id: String(p.id), jenis: tabel ? 'tabel' : 'teks', teks: tabel || !caption ? isi : `${caption}\n${isi}`, nama, ...(disimpan ? { gambar: disimpan } : {}) }
}
export const MAKS_BAHAN_GAMBAR = 10, MAKS_BAHAN_GAMBAR_BYTE = 8 * 1024 * 1024

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
export const MENU = '*Balas angka:*\n*1* Revisi: kirim revisinya (boleh beberapa pesan), lalu *selesai*\n*2* Final\n*3* Minta PPTX\n*4* Lihat versi\n*5* Batal'
// Bubble sendiri sesudah PDF tiap draf (pemilik 19 Nov 2026: "kalau udah beres, tanya revisi"; "bagian ini dan penawaran revisi pindah jadi
// bubble baru aja"): biaya laporan sejauh ini, tawaran revisi (revisi, kirim, selesai), lalu menu angka.
const labelLama = (detik) => { const d = Math.round(Number(detik)); if (!(d > 0)) return ''; const m = Math.floor(d / 60), s = d % 60; return `Lama pembuatan: ${m ? m + ' menit' : ''}${m && s ? ' ' : ''}${s || !m ? s + ' detik' : ''}.` }
export function tMenuDraf(p, n, biaya = 0, lamaDetik = null) {
  // tebal untuk judul dan angka pilihan, miring untuk keterangan, kode untuk perintah (pemilik 19 Nov 2026: "mainin formatting, jangan berantakan")
  const meta = [barisBiayaDraf(biaya), labelLama(lamaDetik)].filter(Boolean).map((x) => `_${x}_`)
  return susun('Ada revisi?', p, n, meta, MENU, '_Revisi satu kalimat juga bisa langsung dikirim._')
}
// 1 = revisi (pemilik 19 Nov 2026: "revisi jadi angka"); angka lain bergeser satu
export const MENU_AKSI = { 1: 'revisi', 2: 'final', 3: 'pptx', 4: 'versi', 5: 'batal' }

// Ringkasan draf (T-BUKA dan T-DRAF dalam satu teks): menempel di keterangan gambar pratinjau, jadi satu draf = 2 kiriman (Q1).
// hitung: {kunci bahan atau 'lain': jumlah pesan}. Kalimat angka sistem hanya untuk laporan yang memuatnya (penanganan karhutla).
// biaya: USD Claude proyek ini sejauh ini (pemilik 19 Nov 2026: "biaya pembuatan laporan pas di akhir, atau selama proses juga bisa"); 0 = tanpa baris
const barisBiayaDraf = (usd) => (Number(usd) > 0 ? `Biaya Claude laporan ini sejauh ini: ${Biaya.dolar(usd)}.` : '')
// Kelompok catatan di ringkasan draf: tiap butir dipendekkan, paling banyak 4 butir per kelompok (pemilik 19 Nov 2026: "catatan tuh kepanjangan").
const MAKS_PER_KELOMPOK = 4
function bagianRingkas(judul, isi) {
  const b = (isi || []).map((x) => rapi(x, 160)).filter(Boolean)
  return bagian(judul, b.length > MAKS_PER_KELOMPOK ? [...b.slice(0, MAKS_PER_KELOMPOK - 1), `dan ${b.length - MAKS_PER_KELOMPOK + 1} lainnya`] : b)
}
// Temuan pemeriksa otomatis jadi kalimat biasa di kelompok Perlu dicek (pemilik 19 Nov 2026: "Gerbang: bahasa: slide 1: spasi ganda" tidak jelas
// maksudnya). Awalan teknis dibuang, kutipan kosong dibuang, tanda belum dibetulkan ditambahkan.
export function temuanRingkas(x) {
  let t = String(x ?? '').replace(/^Gerbang:\s*/i, '').replace(/^(bahasa|format|format slide):\s*/i, '').replace(/:\s*""\s*$/, '').trim()
  const lain = t.match(/^dan (\d+)/)
  if (lain) return `dan ${lain[1]} temuan lain.`
  t = t.charAt(0).toUpperCase() + t.slice(1)
  return /belum dibetulkan/.test(t) ? t : t.replace(/\.$/, '') + ' (belum dibetulkan).'
}
const blokKelompok = (kelompok) => (kelompok || []).map(([judul, isi]) => bagianRingkas(judul, isi))
export function tDraf(p, n, lap, tanggal, { hitung = {}, catatan = [], peringatan = [], slide = null, biaya = 0, ringkasan = '', kelompok = null } = {}) {
  const per = Object.entries(hitung).map(([k, j]) => `${k === 'lain' ? 'bahan lain' : labelBahan(k)} ${j}`)
  return susun(`Draf v${n} siap`, p, n,
    [judul(lap, tanggal),
      per.length ? `Bahan: ${per.join(', ')}` : 'Bahan: belum ada yang dikenali',
      ...(lap.id === 'penanganan' ? ['Hotspot, firespot, luas terbakar, dan luas belum padam dari sistem (hari D-1).'] : []),
      ...(slide ? [slide > 1 ? `Gambar slide 1 sampai ${slide} menyusul, lalu PDF.` : 'Gambar ini slide 1, PDF menyusul.'] : [])],
    ...(ringkasan ? [rapi(ringkasan, 300)] : []),
    ...(kelompok ? blokKelompok(kelompok) : [bagian('Catatan', catatan)]),
    bagianRingkas('Perlu dicek', peringatan.map(temuanRingkas)))
}
// Teks dari luar (Claude, deck, pemeriksa) dirapikan ke aturan caption: tanpa titik tengah, em dash, en dash; satu baris; dipotong.
const rapi = (t, maks = 160) => {
  const s = String(t ?? '').replace(/\s*[·—–]\s*/g, ', ').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
  return s.length > maks ? s.slice(0, maks - 3).trimEnd() + '...' : s
}

// T-PRATINJAU (gambar) dan T-DRAF revisi (PDF): satu revisi = 2 kiriman (Q1). Keterangan gambar dan PDF tetap pendek.
export const tPratinjau = (p, n, slide) => susun(`Pratinjau slide ${slide}`, p, n, 'Ringkasan perubahan ada di PDF berikutnya.')
export function tDrafRevisi(p, n, lap, tanggal, { perubahan = [], tolak = [], lewat = [], catatan = [], peringatan = [], biaya = 0, kelompok = null } = {}) {
  return susun(`Draf v${n} siap`, p, n, judul(lap, tanggal),
    kelompok ? bagianRingkas('Perubahan', perubahan) : bagian('Perubahan', perubahan), bagian('Tidak diubah', tolak), bagian('Dilewati', lewat),
    ...(kelompok ? blokKelompok(kelompok) : [bagian('Catatan', catatan)]), bagianRingkas('Perlu dicek', peringatan.map(temuanRingkas)))
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
// Cut-off hanya untuk laporan yang memuat angka sistem (penanganan karhutla, 18.00). Laporan kejadian bencana harian tidak punya cut-off
// (pemilik 19 Nov 2026: "bencana harian tuh gaada cut off"); lap.jam harian hanya jam jadwal jalur terjadwal lama.
export const adaCutoff = (lap) => lap?.id === 'penanganan'
export function tDaftarBahan(p, lap, tanggal, terpilih, { cutoff = false, satelit = null } = {}) {
  const lengkap = wajibLengkap(lap, terpilih)
  return susun(lengkap ? 'Bahan wajib lengkap' : 'Kirim bahan laporan', p, null,
    [judul(lap, tanggal), ...(cutoff ? [`Belum cut-off ${lap.jam}.00 WIB, angka sistem hari ini belum lengkap.`] : []), ...(satelit ? [barisSatelit(satelit)] : [])],
    ['*Wajib:*', ...daftarBaris(lap.butuh, terpilih, lap)],
    (lap.pilihan || []).length ? ['*Opsional, boleh dilewati:*', ...daftarBaris(lap.pilihan, terpilih)] : [],
    lengkap ? 'Ketik *lanjut* untuk membuat laporan.' : ['Kirim atau teruskan bahannya ke sini.', 'Ketik *lanjut* bila sudah siap.'])
}
// diterima: label bahan laporan ini yang baru masuk; lain: jumlah kiriman di luar format baku (ikut dibaca Claude saat bangun).
export function tTerima(p, lap, tanggal, terpilih, { diterima = [], lain = 0, beda = [] } = {}) {
  const kalimatBeda = beda.map((b) => `Diterima, tetapi bertanggal ${labelTanggal(b.tgl)}, tidak dipakai untuk laporan ${labelTanggal(tanggal)}: ${b.label}.`).join('\n')
  const n = lap.butuh.length, k = lap.butuh.filter((x) => terpilih[x]).length
  const kalimatLain = lain ? `${lain > 1 ? `${lain} kiriman lain` : 'Kiriman lain'} (bukan format baku) ikut disimpan dan dibaca saat laporan dibuat.` : ''
  if (wajibLengkap(lap, terpilih)) {
    const kurangTambah = (lap.pilihan || []).filter((x) => !terpilih[x]).map((x) => `- ${labelBahan(x)}`)
    return susun('Bahan wajib lengkap', p, null,
      [...(diterima.length ? [`Diterima: ${diterima.join(', ')}.`] : []), ...(kalimatBeda ? [kalimatBeda] : []), ...(kalimatLain ? [kalimatLain] : [])],
      kurangTambah.length ? ['*Opsional, boleh dilewati:*', ...kurangTambah] : [],
      'Ketik *lanjut* untuk membuat laporan.')
  }
  const kurang = lap.butuh.filter((x) => !terpilih[x]).map((x) => `- ${labelBahan(x)}`)
  const akhir = 'Ketik *lanjut* bila ingin membuat dengan bahan yang ada.'
  if (!diterima.length) {
    return susun(lain ? 'Bahan disimpan' : 'Bahan bertanggal lain', p, null, [judul(lap, tanggal), kalimatBeda, kalimatLain],
      ['*Wajib:*', ...daftarBaris(lap.butuh, terpilih, lap)],
      (lap.pilihan || []).length ? ['*Opsional, boleh dilewati:*', ...daftarBaris(lap.pilihan, terpilih)] : [], akhir)
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
  if (sha && Maksud.bacaKumpul(ctx.dasar || RUMAH, sha, ctx.now || new Date())) return false // lanjut milik kumpul revisi: ikut antrean (sapu bug 19 Nov)
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
    // kabariPemilik mengembalikan false bila tidak terkirim (limiter, belum terhubung): jangan ditandai, coba lagi di galat berikutnya
    if (ctx.kabariPemilik) { if ((await ctx.kabariPemilik(teks)) === false) return }
    else { const pm = daftar(ctx.env.PEMILIK)[0]; if (!pm || !ctx.dep.kirimTeks) return; await ctx.dep.kirimTeks(pm, teks) }
  } catch (e) { (ctx.log || (() => {}))('kabar pemilik gagal', e.message); return }
  st[kategori] = hari; tulisJson(f, st)
}
// Baris "Pemilik sudah dikabari." hanya untuk pengirim selain pemilik; pemilik sudah membaca penyebabnya di chat (K26).
const kabarBaris = (ctx, dari) => (new Set(daftar(ctx.env.PEMILIK).map(normalWa)).has(normalWa(dari)) ? [] : ['Pemilik sudah dikabari.'])

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
  try { Biaya.catat(ctx.dasar || RUMAH, { usd: Number(r.biaya || 0) / 1e6, proyek: p.id, kini: ctx.now || new Date(), kegiatan: 'laporan' }) } catch {}
  const hasil ={ isian: r.isian || [], pertentangan: r.pertentangan || [], gagal: r.gagal || [], ditolak: r.ditolak || [], catatan: r.catatan || '' }
  tulisJson(f, { sidik, hasil })
  return hasil
}

const kapital = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const tanyaBentrok = (b) => `${kapital(b.medan.replace(/_/g, ' '))} berbeda: ${b.a.nilai} ("${String(b.a.kutipan).slice(0, 80)}") dan ${b.b.nilai} ("${String(b.b.kutipan).slice(0, 80)}"). Mana yang dipakai?`

// ---------- V2.1 A15: rapikan bahan saat generator gagal membaca ----------
// mentah: teks bahan asli {kunci: teks} (acuan pagar angka); pakai: teks putaran sebelumnya. -> {teks, perubahan} atau null (Claude gagal, pagar menolak).
async function rapikanBahan(ctx, p, mentah, pakai, galat) {
  const log = ctx.log || (() => {})
  const c = ctx.dep?.claude
  if (String(ctx.env.BL_RAPIKAN ?? '1') === '0' || (c ? typeof c.rapikan !== 'function' : !ctx.env.ANTHROPIC_API_KEY)) return null
  const calon = Object.fromEntries(Object.entries(pakai).filter(([, t]) => typeof t === 'string' && !/^biner:/.test(t) && t.trim()))
  if (!Object.keys(calon).length) return null
  try {
    const r = await klien(ctx).rapikan(calon, galat)
    try { Biaya.catat(ctx.dasar || RUMAH, { usd: Number(r.biaya || 0) / 1e6, proyek: p.id, kini: ctx.now || new Date(), kegiatan: 'rapikan' }) } catch {}
    if (!Object.keys(r.bahan).length) { log('[rapikan] tanpa perubahan', r.perubahan.join('; ')); return null }
    // acuan angka = teks asli bahan yang dikirim; kunci di luar kiriman ditolak pagar (kunciAsing)
    const pagar = Maksud.pagarRapikan(Object.fromEntries(Object.keys(calon).map((k) => [k, mentah[k] ?? calon[k]])), r.bahan)
    if (!pagar.lolos) { log('[rapikan] ditolak pagar', JSON.stringify(pagar).slice(0, 400)); return null }
    return { teks: { ...pakai, ...r.bahan }, perubahan: r.perubahan.length ? r.perubahan : ['format teks diseragamkan'] }
  } catch (e) {
    log('[rapikan] gagal', e.message)
    return null
  }
}

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
  // batal = mulai dari awal: bahan sebelum `batal` proyek jenis dan tanggal yang sama tidak dipakai lagi (pemilik 19 Nov 2026)
  let depSaring = { ...dep, fetch: fetchLingkup(dep, cmd.jenis ? sesudahBatal(ctx, sha, cmd.jenis, cmd.tanggal, lingkup.boleh) : lingkup.boleh, bukanBahan(ctx)) }
  let bahan = await ambilBahan({ env, dep: depSaring, tanggal: cmd.tanggal, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log })
  const jenis = cmd.jenis || await tebakJenis(bahan)
  if (!cmd.jenis && jenis && waktuBatal(ctx, sha, jenis, cmd.tanggal)) {
    depSaring = { ...dep, fetch: fetchLingkup(dep, sesudahBatal(ctx, sha, jenis, cmd.tanggal, lingkup.boleh), bukanBahan(ctx)) }
    bahan = await ambilBahan({ env, dep: depSaring, tanggal: cmd.tanggal, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log })
  }
  if (!jenis) return balas(susun('Jenis laporan belum jelas', null, null, `Bahan ${labelTanggal(cmd.tanggal)} belum menunjukkan jenis laporannya.`, ['Ketik salah satu:', `- *buat harian ${cmd.tanggal}*`, `- *buat penanganan ${cmd.tanggal}*`]))
  const lap = lapDari(jenis)
  if ((lap.periode || lap.lokasi) && !pakaiV2(env, dari)) return balas(susun(`${lap.judul} belum bisa dibuat`, null, null, 'Laporan ini hanya dibuat lewat Claude (mode V2). Hubungi pemilik bot.'))
  const { terpilih, teks } = await bahan.pilihSesuai(lap)
  // Bahan teks Claude: bahan terpilih generator ditambah pesan lain dalam lingkup bertanggal itu (teks, PDF, foto, Excel).
  // Foto grup operasi yang tidak terpilih tidak ikut: itu bukti lapangan, bukan bahan laporan, dan OCR-nya mahal.
  const mentah = ((await (await depSaring.fetch(`${W(env)}/api/wa/masuk?tanggal=${encodeURIComponent(cmd.tanggal)}`, { headers: { authorization: `Bearer ${env.WA_MESIN || ''}` }, signal: AbortSignal.timeout(WAKTU_WORKER) })).json()).pesan || [])
    .filter((m) => !/@g\.us$/i.test(String(m.dari || '')))
  const pakai = new Map()
  const bukan = bukanBahan(ctx) // D40: screenshot revisi dan pertanyaan bukan bahan laporan
  for (const m of [...Object.values(terpilih), ...mentah]) if (!bukan.has(String(m.id))) pakai.set(String(m.id), m)
  const kunciDari = new Map(Object.entries(terpilih).map(([k, m]) => [String(m.id), k]))
  const bahanRute = [...pakai.keys()].slice(0, MAKS_BAHAN).map((id) => ({ wa_id: id, ...(kunciDari.has(id) ? { jenis_bahan: kunciDari.get(id) } : {}) }))
  // Daftar bahan (K17) hanya membuka proyek; bahan ditempel sekali, saat membangun (`lanjut`, `buat saja`).
  let { proyek: p } = await proyekBuka(ctx, { wa_sha: sha, jenis, tanggal: cmd.tanggal, bahan: cmd.saja || cmd.lanjut ? bahanRute : [] })
  catatIndeks(dasar, p, sha, dari)
  if (lap.periode && cmd.awal && !['draf', 'membangun'].includes(p.status)) catatPeriode(dasar, p, cmd.awal)
  const periode = lap.periode ? periodeProyek(dasar, p) : null
  if (lap.lokasi && cmd.lokasi !== undefined && !['draf', 'membangun'].includes(p.status)) catatLokasi(dasar, p, cmd.lokasi)
  const lokasi = lap.lokasi ? lokasiProyek(dasar, p) : null
  const berkasKunci = lockProyek(dasar, p.id)
  if (p.status === 'membangun') {
    if (kunciHidup(berkasKunci)) return balas(tSibuk(p, p.versi || null))
    p = await pulihkan(ctx, p, sha)
  }
  // TODO(BL-10): proyek draf menerima revisi; `buat` lagi di sini belum membangun ulang.
  if (p.status === 'draf') return balas(susun('Draf sudah ada', p, p.versi, 'Tulis perubahan dengan kalimat biasa, atau balas *2* untuk final.'))
  if (!AKTIF.includes(p.status)) return balas(susun(`Proyek sudah ${p.status}`, p, null, 'Ketik *buat* untuk memulai proyek baru.'))
  // K17: `buat <jenis>` hanya membuka proyek dan membalas daftar bahan; pembangunan selalu menunggu `lanjut` (atau `buat saja`).
  if (!cmd.saja && !cmd.lanjut) {
    catatTuntun(ctx, sha, p.id)
    const satelit = lap.id === 'penanganan' ? await statusSatelit(ctx, cmd.tanggal) : null // K18: baris status data satelit
    return balas(tDaftarBahan(p, lap, cmd.tanggal, terpilih, { cutoff: adaCutoff(lap) && cmd.tanggal === tanggalWib(now) && jamWib(now) < lap.jam, satelit }))
  }

  const lepas = kunciProses(berkasKunci) // satu proses aktif per proyek (T15)
  if (!lepas) return balas(tSibuk(p, null))
  const kerjaEkstrak = path.join(dirProyek(dasar), p.id, 'ekstrak')
  let status = p.status
  const pindah = async (ke, o) => { if (status === ke) return true; const ok = await pindahStatus(ctx, p, ke, sha, o); if (ok) status = ke; return ok }
  const kunciSibuk = tandaiSibuk(ctx, sha, p.id)
  const prog = await mulaiProgres(ctx)
  const gagalBangun = () => catatGagal(ctx, sha, { langkah: 'bangun', id: p.id, cmd: { jenis, tanggal: cmd.tanggal, saja: !!cmd.saja, ...(periode ? { awal: periode.awal } : {}), ...(lap.lokasi ? { lokasi } : {}), ...(cmd.firespot ? { firespot: cmd.firespot } : {}), ...(cmd.terimaKurang ? { terimaKurang: true } : {}), ...(cmd.rincian !== undefined ? { rincian: cmd.rincian } : {}) } })
  try {
    const bahanTeks = [], tidakTerbaca = []
    let jumlahGambar = 0
    // Berperiode: bahannya WA Koordalops tiap hari periode, bukan pesan tanggal proyek saja.
    // tanpa saring `batal`: WA Koordalops hari-hari periode memang masuk sebelum batal, tetap dipakai saat dibangun ulang
    const kd = periode ? await koordalopsPeriode(ctx, { ...dep, fetch: fetchLingkup(dep, lingkup.boleh) }, periode.awal, periode.akhir, path.join(dirProyek(dasar), p.id, 'koordalops')) : []
    for (const x of kd) bahanTeks.push({ id: `koordalops-${x.tanggal}`, nama: `koordalops-${x.tanggal}`, jenis: 'rekap_koordalops_24', teks: x.teks })
    for (const m of (periode || lap.lokasi) ? [] : pakai.values()) { // gempa: semua data dari generator, pesan WA tidak dibaca
      const simpan = pakaiV2(env, dari) && jumlahGambar < MAKS_BAHAN_GAMBAR ? path.join(kerjaEkstrak, 'gambar') : null
      const e = await ekstrak(m, ctx, kerjaEkstrak, { simpanGambar: simpan })
      if (!e) continue
      if (e.gambar) jumlahGambar++
      if (e.tidakTerbaca && e.gambar) bahanTeks.push({ ...e, tidakTerbaca: false, jenis: 'gambar', teks: '' }) // V2.2: agen membaca gambarnya langsung
      else if (e.tidakTerbaca) tidakTerbaca.push(e.nama || `pesan ${e.id}`)
      else bahanTeks.push(e)
    }
    await prog.ke(1)
    // V2 (D16): agen membaca bahan sendiri dari ruang kerja; urai Claude V1 dan isian generator tidak dipakai.
    const v2 = pakaiV2(env, dari)
    const hasil = v2 ? { isian: [], pertentangan: [], gagal: [], catatan: [] } : await urai(ctx, p, lap, bahanTeks)
    const kurang = lap.butuh.filter((k) => !terpilih[k])
    // K17: bahan wajib yang kurang dan cut-off tidak ditanyakan (pemakai sudah memilih `lanjut`), hanya dicatat di draf.
    // Bentrok dan bahan tak terbaca ditanyakan sekali sesudah `lanjut`; `lanjut` lagi (status bertanya) atau `buat saja` membangun dan mencatatnya.
    const celah = [
      ...(periode ? [`Periode laphar Koordalops ${labelTanggal(periode.awal)} sampai ${labelTanggal(periode.akhir)}; WA Koordalops tersimpan di bot: ${kd.length ? kd.map((x) => labelTanggal(x.tanggal)).join(', ') : 'tidak ada'}.`] : []),
      ...(lap.lokasi ? [`Gempa dicari dari data BMKG: ${lokasi ? `"${lokasi}"` : 'M5 ke atas terbaru'}, sampai ${labelTanggal(cmd.tanggal)}.`] : []),
      ...kurang.map((k) => `${labelBahan(k)} untuk ${labelTanggal(cmd.tanggal)} belum ada.`),
      ...(adaCutoff(lap) && cmd.tanggal === tanggalWib(now) && jamWib(now) < lap.jam ? [`Belum cut-off ${lap.jam}.00 WIB, angka sistem hari ini belum lengkap.`] : []),
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
    if (periode) lapBangun = { ...lap, args: (d, f, o) => lap.args(d, { ...f, awal: periode.awal, wa: kd.map((x) => x.f) }, o) }
    if (lap.lokasi) lapBangun = { ...lap, args: (d, f, o) => lap.args(d, { ...f, lokasi }, o) }
    // terima kurang (per laporan, nomor terdaftar mana pun): WA Koordalops merinci lebih sedikit dari jumlah menonjol; draf memakai yang dirinci dan mencatatnya
    if (cmd.terimaKurang && lap.id === 'harian') {
      lapBangun = { ...lap, args: (d, f, o) => [...lap.args(d, f, o), '--terima-kurang'] }
      catatan.push('Atas perintah terima kurang: WA Koordalops merinci lebih sedikit kejadian dari jumlah menonjol di kepalanya; draf hanya memuat yang dirinci.')
    }
    if (lap.id === 'penanganan') {
      if (cmd.firespot === 'firms') {
        lapBangun = { ...lap, args: (d, f, o) => [...lap.args(d, f, o), '--firespot', 'firms'] }
        catatan.push(CATATAN_FIRMS)
      } else if (cmd.satelit === 'sekarang') {
        catatan.push(CATATAN_SEKARANG)
      } else {
        const st = await statusSatelit(ctx, cmd.tanggal)
        // K44 (pemilik 20 Nov 2026): lintasan siang belum masuk FIRMS = jangan langsung bangun; pemakai memilih *sekarang* atau *tunggu*.
        if (st && st.lintasan_siang === false) {
          await pindah('bertanya')
          catatSatelit(ctx, p.id, { sha, dari, jenis, tanggal: cmd.tanggal, keadaan: 'pilih', pilih: 'lintasan' })
          await prog.akhir('berhenti')
          return await balas(tPilihLintasan(p, st))
        }
        if (st && st.situs_memuat === false && st.lintasan_siang === true) {
          await pindah('bertanya')
          catatSatelit(ctx, p.id, { sha, dari, jenis, tanggal: cmd.tanggal, keadaan: 'pilih' })
          await prog.akhir('berhenti')
          return await balas(tPilihSatelit(p, st))
        }
      }
    }

    // K43: laporan harian dengan kejadian banyak ditanya dulu soal slide rincian (tidak ditanya pada *buat saja* atau *lanjut* kedua = tanpa rincian)
    if (lap.id === 'harian') {
      if (cmd.rincian === undefined && !cmd.saja) {
        const h = await hitungKejadian(ctx, cmd.tanggal, teks.rekap_koordalops_24, path.join(dirProyek(dasar), p.id), { terimaKurang: !!cmd.terimaKurang })
        if (h?.banyak) {
          await pindah('bertanya')
          catatRincian(ctx, p.id, { sha, dari, jenis, tanggal: cmd.tanggal, wa: h.wa, karhutla: h.karhutla, selesai: h.selesai, tampil: h.tampil, ...(cmd.terimaKurang ? { terimaKurang: true } : {}) })
          catatTuntun(ctx, sha, p.id)
          catatMenu(ctx, sha, p.id) // *1*/*2* sesudah ini menjawab tawaran ini, bukan menu draf yang dikirim lebih dulu
          await prog.akhir('berhenti')
          return await balas(tTanyaRincian(p, h, cmd.tanggal))
        }
      }
      if (cmd.rincian) { const sblm = lapBangun; lapBangun = { ...sblm, args: (d, f, o) => [...sblm.args(d, f, o), '--rincian', 'ya'] } }
    }
    try { catatRincian(ctx, p.id, null) } catch {}
    try { catatSatelit(ctx, p.id, null) } catch {} // pembangunan mulai: pilihan data satelit proyek ini selesai
    await pindah('membangun')
    await kabarMulai(ctx, p, lap, { versi: v2 ? 'v2' : 'v1', mode: 'bangun', n: (p.versi || 0) + 1 })
    await prog.ke(2)
    const n = (p.versi || 0) + 1
    const dasarV = path.join(dasar, 'keluaran', 'proyek', p.id, `v${n}`) // di bawah ~/.wa-bot/keluaran: satu-satunya akar yang boleh dikirim gateway
    let berkas, isianGen, teksPakai = teks, dirapikan = null, cobaRapi = 0
    for (;;) try {
      const k = siapkanKeluaran(lap, cmd.tanggal, teksPakai, dasarV)
      berkas = k.berkas
      isianGen = v2 ? {} : keIsianGenerator(jenis, hasil.isian)
      if (Object.keys(isianGen).length) { k.f.isian = path.join(k.kerja, 'isian.json'); tulisJson(k.f.isian, isianGen) }
      // Kunci generator bersama jalur terjadwal; tanggal mulai kejadian lama dibaca dari keluaran terjadwal (WA_MULAI_AKAR).
      const r = await jalankanGenerator(lapBangun, cmd.tanggal, k.f, k.out, k.kerja, dep, env, { kunci: path.join(dasar, 'generator.lock'), envAnak: { WA_MULAI_AKAR: path.join(dasar, 'keluaran') } })
      for (const b of berkas) if (!ada(b.p)) throw new Error('keluaran tidak ada: ' + path.basename(b.p))
      for (const l of String(r?.stderr || '').split('\n')) {
        const m = l.match(/^PERINGATAN isian:\s*(.+)$/)
        if (!m || (cmd.firespot === 'firms' && /firespot/i.test(m[1]))) continue // mode FIRMS: cukup CATATAN_FIRMS (K18)
        catatan.push(`Isian diabaikan generator: ${m[1].trim()}`)
      }
      if (dirapikan) catatan.push(`Bahan dirapikan Claude supaya terbaca: ${dirapikan.join('; ')}.`)
      break
    } catch (e) {
      // V2.1 A15 (K29): galat baca bahan = Claude merapikan bentuk teks WA, generator dijalankan ulang (paling banyak 2 kali, pagar angka D31).
      if (cobaRapi < Maksud.MAKS_PUTARAN_RAPIKAN && !Maksud.galatMesin(e.message)) {
        cobaRapi++
        const r = await rapikanBahan(ctx, p, teks, teksPakai, e.message)
        if (r) { teksPakai = r.teks; dirapikan = r.perubahan; continue }
      }
      if (dirapikan) e.message = `${e.message} (bahan sudah dirapikan Claude, generator tetap gagal)`
      await prog.akhir('gagal')
      await pindah('terbuka', { lempar: false })
      gagalBangun()
      await kabarSekali(ctx, 'bangun', tGalatPemilik(p, n, `Draf v${n} gagal dibangun.`, e.message, 400))
      return await balas(susun(`Draf v${n} gagal dibangun`, p, null, [...penyebab(e.message), ...barisKurang(ctx, dari, lap, e.message), ...kabarBaris(ctx, dari), AKHIR_GAGAL]))
    }
    if (v2) {
      // V2-A: deck generator = deck dasar; agen menyempurnakannya di ruang kerja (D15, D16, D23).
      const pptxGen = berkas.find((b) => b.x === 'pptx').p
      const kem = Agen.cariKemarin({ dasar, jenis, tanggal: cmd.tanggal })
      const ruang = Agen.siapkanRuang({ dasar, id: p.id, n, kemarin: kem, dasarBerkas: [pptxGen, jalurKunci(pptxGen)],
        bahan: bahanTeks.map((b) => ({ nama: b.nama || `pesan-${b.id}`, teks: samarkan(String(b.teks || '')), ...(b.gambar ? { gambar: b.gambar } : {}) })) })
      const prompt = Agen.promptBangun({ jenis, judul: lap.judul, tanggal: cmd.tanggal, id: p.id, ruang, kemarin: kem, catatan })
      return await kerjakanAgen(ctx, { p, sha, dari, lap, mode: 'bangun', n, m: null, ruang, prompt, sesi: Agen.bacaSesi(dasar, p.id)?.sesi || null,
        promptSesiBaru: () => prompt, deckNama: path.basename(pptxGen), catatan, hitung, instruksi: cmd.saja ? 'buat saja' : 'buat',
        pindah, statusGagal: 'terbuka', gagalCatat: gagalBangun })
    }
    await prog.ke(3)
    const pdf = berkas.find((b) => b.x === 'pdf').p, pptx = berkas.find((b) => b.x === 'pptx').p
    const kunciV = bacaJson(jalurKunci(pptx), [])
    // BL-11: periksa jalan bersamaan dengan langkah PDF/pratinjau; peringatannya masuk ringkasan draf, tidak pernah menahan.
    const [png, peringatan] = await Promise.all([
      inventarisAman(ctx, pptx).then((inv) => pratinjau(ctx, pdf, path.join(dasarV, 'pratinjau'), slidesDraf(ctx, inv))),
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
      return await balas(susun(`Draf v${n} gagal disimpan`, p, null, [...penyebab(e.message), ...kabarBaris(ctx, dari), AKHIR_GAGAL]))
    }
    catatGagal(ctx, sha, null)
    // D8 dan Q1: tepat 2 kiriman, gambar pratinjau slide 1 berketerangan ringkasan draf, lalu PDF. Tanpa pratinjau: ringkasan di keterangan PDF.
    const ringkas = tDraf(p, n, lap, cmd.tanggal, { hitung, catatan, peringatan, slide: png.length || null, biaya: Biaya.proyek(dasar, p.id) })
    catatMenu(ctx, sha, p.id) // angka menu berikutnya berlaku untuk proyek ini
    await kirimSlide(ctx, png, { pertama: ringkas })
    await ctx.balasFile(pdf, path.basename(pdf), png.length ? tPdf(p, n, lap, cmd.tanggal) : ringkas, MIME.pdf)
    await kirimMenuDraf(ctx, p, n)
    await prog.akhir('selesai') // sunting akhir sesudah dua berkas draf: jatah limiter didahulukan untuk berkas
  } catch (e) {
    await prog.akhir('gagal')
    if (!(e instanceof GalatClaude)) {
      // galat di luar blok yang sudah menangani dirinya (misalnya Worker gagal saat pindah status): proyek tidak dibiarkan membangun (sapu bug 19 Nov)
      if (['bertanya', 'membangun'].includes(status)) await pindah('terbuka', { lempar: false })
      gagalBangun(); throw e
    }
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

// A8: gambar slide draf. slide: nomor atau daftar nomor. berkas: PDF, atau PPTX bila ada slide disembunyikan (nomor halaman PDF bergeser).
// Sejak 19 Nov 2026 (pemilik: "selama draf, aku pengennya kamu ngasih ss per slidenya") tiap draf mengirim gambar semua slide (slidesDraf).
export const MAKS_SLIDE_KIRIM = 15
const nomorPng = (f) => Number((path.basename(f).match(/(\d+)/) || [])[1]) || 0
async function pratinjau(ctx, pdf, dir, slide = 1) {
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    const daftarSlide = (Array.isArray(slide) ? slide : [slide]).slice(0, MAKS_SLIDE_KIRIM)
    const r = await ctx.dep.exec(pyBin(ctx.env), [path.join(GENERATOR, 'ubah.py'), 'pratinjau', pdf, daftarSlide.join(','), dir], { cwd: GENERATOR, timeout: 180e3, maxBuffer: 20e6 })
    const png = (JSON.parse(String(r.stdout || '{}')).png || []).sort((a, b) => nomorPng(a) - nomorPng(b))
    return png.filter((f) => (ctx.ada || fs.existsSync)(f)).slice(0, MAKS_SLIDE_KIRIM)
  } catch (e) { (ctx.log || (() => {}))('pratinjau gagal', e.message); return [] }
}
// Nomor slide yang dikirim gambarnya: semua slide deck (paling banyak MAKS_SLIDE_KIRIM); ctx.pratinjauSatu (uji lama) = hanya `satu`.
function slidesDraf(ctx, inv, satu = 1) {
  if (ctx.pratinjauSatu) return [satu]
  const n = (inv || []).reduce((a, x) => Math.max(a, Number(x.slide) || 0), 0)
  return n ? Array.from({ length: Math.min(n, MAKS_SLIDE_KIRIM) }, (_, i) => i + 1) : [satu]
}
// Gambar draf berurutan: gambar pertama berketerangan `pertama`, sisanya "Slide N" (ditandai berubah bila nomornya di `berubah`).
async function kirimSlide(ctx, png, { pertama, berubah = [] }) {
  for (const [i, f] of png.entries()) {
    const k = nomorPng(f)
    await ctx.balasFile(f, path.basename(f), i === 0 ? pertama : `Slide ${k}${berubah.includes(k) ? ' (berubah)' : ''}`, 'image/png')
  }
}
// keterangan gambar pertama draf revisi: daftar slide yang berubah
export const tPratinjauRevisi = (p, n, berubah, jumlah) => susun(`Pratinjau draf v${n}`, p, n,
  [jumlah > 1 ? `Gambar slide 1 sampai ${jumlah}, ini slide 1.` : 'Gambar ini slide 1.', berubah.length ? `Slide berubah: ${berubah.join(', ')}.` : 'Tidak ada slide yang berubah isinya.'],
  'Ringkasan perubahan ada di PDF berikutnya.')

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
  const hasil = await worker(ctx, '/api/wa/proyek/versi', { method: 'POST', form: f })
  const m = mulaiBangun.get(p.id) // lama pembuatan sungguhan untuk estimasi berikutnya (durasi.mjs); balik versi tidak dihitung
  if (m && /^balik/.test(String(instruksi))) mulaiBangun.delete(p.id)
  else if (m) { mulaiBangun.delete(p.id); const detik = (Date.now() - m.t) / 1e3; lamaBangun.set(p.id, detik); try { Durasi.catatDurasi(ctx.dasar || RUMAH, m.kunci, detik) } catch {} }
  return hasil
}

// Pesan konfirmasi saat pembuatan mulai (pemilik 19 Nov 2026): satu pesan, estimasi dari lama pembuatan sebelumnya, tidak pernah disunting.
const mulaiBangun = new Map() // id proyek -> {kunci, t}
const lamaBangun = new Map() // id proyek -> detik pembuatan versi terakhir (untuk bubble menu draf)
// Bubble tawaran revisi sesudah PDF: biaya, lama pembuatan, revisi, menu angka
async function kirimMenuDraf(ctx, p, n) {
  const lama = lamaBangun.get(p.id); lamaBangun.delete(p.id)
  return ctx.balas(tMenuDraf(p, n, Biaya.proyek(ctx.dasar || RUMAH, p.id), lama))
}
async function kabarMulai(ctx, p, lap, { versi, mode, n }) {
  const dasar = ctx.dasar || RUMAH, kini = ctx.now || new Date()
  const kunci = Durasi.kunciDurasi(versi, mode, p.jenis)
  mulaiBangun.set(p.id, { kunci, t: Date.now() })
  if (ctx.kabarMulai === false) return // uji lama yang menghitung balasan persis mematikannya; uji kabar mulai menyalakannya
  const [lo, hi] = Durasi.perkiraan(dasar, kunci)
  try {
    await ctx.balas(susun(mode === 'bangun' ? 'Laporan sedang dibuat' : `Revisi v${n} sedang dikerjakan`, p, null,
      [lap ? judul(lap, p.tanggal) : p.jenis, `Estimasi waktu: ${lo}-${hi} menit`, `Perkiraan selesai pukul ${Durasi.jamSelesai(kini, hi)} WIB`],
      'Draf dikirim otomatis begitu selesai.'))
  } catch (e) { (ctx.log || (() => {}))('[mulai] kabar gagal', e.message) }
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
    if (opsi.balik < 1 || opsi.balik > m) return balas(susun(`Versi v${opsi.balik} tidak ada`, p, m, `Versi terakhir v${m}. Balas *4* untuk melihat riwayat versi.`))
    if (opsi.balik === m) return balas(susun('Sudah versi terakhir', p, m, `v${m} sudah versi terakhir, tidak ada yang dikembalikan.`))
  }
  // D24: proyek yang v1-nya dibuat V2 selalu direvisi V2 (dan sebaliknya), walau saklar berubah.
  const v2 = await proyekV2(ctx, p, sha)
  if (v2 === null) {
    catatGagal(ctx, sha, { langkah: 'revisi', id: p.id, ...(opsi.balik != null ? { balik: opsi.balik } : { teks: String(pesan?.teks || '') }) })
    return balas(susun('Draf belum terbaca', p, p.versi, [`Draf v${p.versi} tetap berlaku.`, AKHIR_GAGAL]))
  }
  if (v2) return revisiV2(pesan, dari, sha, p, ctx, opsi)
  const lepas = kunciProses(berkasKunci)
  if (!lepas) return balas(tSibuk(p, m))
  let status = p.status
  const pindah = async (ke, o) => { if (status === ke) return true; const ok = await pindahStatus(ctx, p, ke, sha, o); if (ok) status = ke; return ok }
  const kunciSibuk = tandaiSibuk(ctx, sha, p.id)
  const prog = await mulaiProgres(ctx)
  const gagalRevisi = () => catatGagal(ctx, sha, { langkah: 'revisi', id: p.id, ...(opsi.balik != null ? { balik: opsi.balik } : { teks: String(pesan?.teks || ''), ...(pesan?.gambar?.length ? { gambar: pesan.gambar } : {}) }) })
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
      if (pesan.gambar?.length) kalimat = `${kalimat}\n(Pemakai juga mengirim ${pesan.gambar.length} gambar; bot ini hanya membaca teksnya.)`.trim()
      // Jawaban atas pertanyaan balik Claude (insiden 18 Nov 2026: "ya" dibalas "belum ada pertanyaan"): Claude tidak punya ingatan antarpanggilan,
      // jadi permintaan awal dan pertanyaannya ikut dikirim bersama jawaban. Satu tanya tersimpan per proyek dan versi, berlaku 2 jam.
      const sebelum = ambilTanyaRevisi(ctx, p.id, m)
      const awal = sebelum ? sebelum.kalimat : kalimat
      const kirimKalimat = sebelum ? susunJawaban(sebelum, kalimat) : kalimat
      const r = await klien(ctx).operasi(invLama, kunciLama, opsLama.map((o) => JSON.stringify(o)), kirimKalimat)
      try { Biaya.catat(dasar, { usd: Number(r.biaya || 0) / 1e6, proyek: p.id, kini: ctx.now || new Date(), kegiatan: 'laporan' }) } catch {}
      if (!r.tanya?.length && r.diterima?.length) await kabarMulai(ctx, p, lap, { versi: 'v1', mode: 'revisi', n })
      if (r.tanya?.length) {
        catatTanyaRevisi(ctx, p.id, m, { kalimat: awal, tanya: r.tanya.map((q) => rapi(q.pertanyaan, 300)), jawab: sebelum ? [...(sebelum.jawab || []), kalimat].slice(-3) : [] })
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
      return balas(susun(`Revisi v${n} gagal dibangun`, p, m, [...penyebab(e.message), `Draf v${m} tetap berlaku.`, ...kabarBaris(ctx, dari), AKHIR_GAGAL]))
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
    const png = await pratinjau(ctx, sembunyi ? pptx : pdf, path.join(dasarV, 'pratinjau'), ctx.pratinjauSatu ? slide : slidesDraf(ctx, invBaru, slide))

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
      return await balas(susun(`Revisi v${n} gagal disimpan`, p, m, [...penyebab(e.message), `Draf v${m} tetap berlaku.`, ...kabarBaris(ctx, dari), AKHIR_GAGAL]))
    }
    catatGagal(ctx, sha, null)
    // D8 dan Q1: tepat 2 kiriman, pratinjau slide pertama yang berubah lalu PDF berketerangan T-DRAF. Tanpa pratinjau: PDF saja.
    const ringkas = tDrafRevisi(p, n, lap, p.tanggal, { perubahan, tolak, lewat: kalimatLewat, catatan, peringatan, biaya: Biaya.proyek(dasar, p.id) })
    catatMenu(ctx, sha, p.id)
    await kirimSlide(ctx, png, { pertama: ctx.pratinjauSatu ? tPratinjau(p, n, slide) : tPratinjauRevisi(p, n, berubah, png.length), berubah })
    await ctx.balasFile(pdf, path.basename(pdf), ringkas, MIME.pdf)
    await kirimMenuDraf(ctx, p, n)
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

// ---------- bot V2: agen Claude Code (data/kajian-bnpb/bot-laporan K22-K24, D14-D28, ALUR V2) ----------
// Nomor V2: saklar BL_VERSI=2. Sejak 19 Nov 2026 (pemilik: "terbitkan v2 sekarang, jgn draf lagi", Q17 dijawab) semua nomor terdaftar
// memakai V2; BL_V2_NOMOR terisi = hanya nomor itu (uji terbatas). Proyek dikunci ke versi bot v1-nya (D24).
export const pakaiV2 = (env, dari) => String(env.BL_VERSI || '') === '2' && (!String(env.BL_V2_NOMOR || '').trim() || new Set(daftar(env.BL_V2_NOMOR).map(normalWa).filter(Boolean)).has(normalWa(dari)))
// true | false | null (versi tidak terbaca: jangan menebak, supaya proyek V2 tidak diam-diam direvisi V1)
async function proyekV2(ctx, p, sha) {
  if (!(p.versi > 0)) return false
  try { return (await versiRinci(ctx, p, p.versi, sha))?.isian?.versi_bot === 2 } catch { return null }
}
const biayaWorker = (ctx) => ({
  tgl: tanggalWib(ctx.now || new Date()),
  baca: async (t) => (await worker(ctx, `/api/wa/biaya?tanggal=${t}`)).usd_mikro || 0,
  tambah: async (t, u) => { if (u >= 1) await worker(ctx, '/api/wa/biaya', { method: 'POST', body: { tanggal: t, usd_mikro: Math.min(u, 50e6) } }) },
})
async function isiDeck(ctx, pptx) {
  const r = await ctx.dep.exec(pyBin(ctx.env), [path.join(DI, 'agen_isi.py'), pptx], { timeout: 120e3, maxBuffer: 50e6 })
  return JSON.parse(String(r?.stdout || '{}'))
}
// Angka yang disebut pemakai di revisi dan jawaban sah sebagai sumber (sapu bug 19 Nov: "personel jadi 350" selalu ditolak pagar).
// Disimpan di acuan mesin per proyek supaya versi berikutnya tetap menganggapnya sah.
const izinP = (ac) => path.join(ac, 'izin-pemakai.json')
const bacaIzinPemakai = (ac) => bacaJson(izinP(ac), [])
function catatIzinPemakai(ac, teks) { const t = (teks || []).filter(Boolean); if (t.length) try { tulisJson(izinP(ac), [...bacaIzinPemakai(ac), ...t].slice(-50)) } catch {} }
const teksBahanRuang = (ruang) => { const d = path.join(ruang, 'bahan'); try { return fs.readdirSync(d).filter((f) => /\.txt$/i.test(f)).map((f) => fs.readFileSync(path.join(d, f), 'utf8')) } catch { return [] } }
const pptxDi = (dir) => { try { return fs.readdirSync(dir).filter((f) => /\.pptx$/i.test(f)).map((f) => path.join(dir, f))[0] || null } catch { return null } }

// Satu jalan agen sampai draf terkirim (atau pertanyaan, atau penolakan). o: {p, sha, lap, mode: 'bangun'|'revisi', n, m, ruang, prompt, sesi,
// promptSesiBaru, deckNama, catatan, hitung, instruksi, pindah, statusGagal, gagalCatat}. Dipanggil di dalam kunci proyek pemanggil.
async function kerjakanAgen(ctx, o) {
  const { env, dep, balas } = ctx
  const { p, sha, lap, mode, n, m, ruang } = o
  const dasar = ctx.dasar || RUMAH, ada = ctx.ada || fs.existsSync
  const judulGagal = mode === 'bangun' ? `Draf v${n}` : `Revisi v${n}`
  const tetap = mode === 'revisi' && m ? [`Draf v${m} tetap berlaku.`] : []
  const gagal = async (alasan, kabar, sebab) => {
    await o.pindah(o.statusGagal, { lempar: false })
    o.gagalCatat?.()
    if (kabar) await kabarSekali(ctx, kabar, tGalatPemilik(p, n, `${judulGagal} V2: ${alasan}.`, sebab || '', 400))
    return balas(susun(`${judulGagal} gagal dibuat`, p, m, [...penyebab(sebab ? `${alasan}: ${sebab}` : alasan), ...tetap, ...(kabar ? kabarBaris(ctx, o.dari) : []), AKHIR_GAGAL]))
  }
  await o.pindah('membangun')
  const lepasAgen = Agen.ambilKunciAgen(dasar, p.id)
  if (!lepasAgen) {
    await o.pindah(o.statusGagal, { lempar: false })
    o.gagalCatat?.()
    return balas(susun('Bot sedang sibuk', p, m, ['Bot sedang mengerjakan laporan lain.', ...tetap, 'Ketik *ulangi* beberapa menit lagi.']))
  }
  let r
  try {
    r = await Agen.jalankan({ ...ctx, dasar, promptSesiBaru: o.promptSesiBaru }, { jenis: p.jenis, id: p.id, ruang, prompt: o.prompt, sesi: o.sesi,
      pyBin: path.dirname(pyBin(env)), biaya: biayaWorker(ctx) })
  } catch (e) {
    lepasAgen()
    if (e.kode === 'batas_belanja' || e.kode === 'batas_proyek') {
      await o.pindah(o.statusGagal, { lempar: false })
      await kabarSekali(ctx, `agen:${e.kode}`, tGalatPemilik(p, n, e.kode === 'batas_belanja' ? 'Batas belanja harian tercapai (V2).' : 'Batas biaya per laporan tercapai (V2).', e.message))
      return balas(susun(e.kode === 'batas_belanja' ? 'Kuota hari ini habis' : 'Batas biaya laporan tercapai', p, m, [...tetap, e.kode === 'batas_belanja' ? 'Bot lanjut besok.' : 'Pemilik sudah dikabari.']))
    }
    return gagal(`agen gagal (${e.kode || 'galat'})`, `agen:${e.kode || 'galat'}`, e.message)
  }
  let h = r.hasil
  if (h.tanya.length) {
    lepasAgen()
    Agen.catatTanya(dasar, p.id, { sha, mode, n, m, ruang, deckNama: o.deckNama, catatan: o.catatan || [], hitung: o.hitung || {}, instruksi: o.instruksi })
    await o.pindah(mode === 'bangun' ? 'bertanya' : 'draf')
    return balas(susun('Perlu dipastikan dulu', p, m, h.tanya.map((q, i) => `${i + 1}. ${rapi(q, 300)}`), ['Balas dengan jawabannya.', 'Ketik *lanjut* bila ingin dilanjutkan tanpa jawaban.']))
  }
  Agen.hapusTanya(dasar, p.id)
  // D17, A11: pagar angka atas isi PPTX lengkap. Acuan (deck dasar, kunci, bahan, laporan kemarin) dibaca dari salinan mesin
  // di ~/.wa-bot/agen/acuan/<proyek>, bukan dari ruang kerja yang bisa disentuh agen. Kunci hilang = gagal tertutup.
  const ac = Agen.acuan(dasar, p.id)
  const dasarPptx = path.join(ac, 'dasar', o.deckNama)
  const kunci = bacaJson(jalurKunci(dasarPptx), null)
  const kemPptx = pptxDi(path.join(ac, 'kemarin'))
  // pagar atas deck mana pun (hasil agen, hasil tinjau visual): satu rumus, acuan dari salinan mesin
  const pagarDeck = async (pptxCek) => {
    try {
      if (!Array.isArray(kunci)) throw new Error('daftar kunci angka sistem deck dasar tidak ada')
      if (p.jenis === 'penanganan' && !kunci.length) throw new Error('daftar kunci laporan penanganan kosong')
      const [isiD, isiK, isiKem] = await Promise.all([isiDeck(ctx, dasarPptx), isiDeck(ctx, pptxCek), kemPptx ? isiDeck(ctx, kemPptx) : null])
      return periksaPagar(isiD, isiK, kunci, { izin: [...teksBahanRuang(ac), ...bacaIzinPemakai(ac), ...(o.izinTambah || [])], kemarin: isiKem })
    } catch (e) { return { lolos: false, langgar: [`pagar angka tidak bisa dijalankan: ${rapi(e.message, 120)}`], dihapus: [], tanpaSumber: [], dariKemarin: [] } }
  }
  let pg = await pagarDeck(h.pptx)
  // D36 (V2.2 vision): mesin merender deck, agen melihat gambarnya sekali dan membetulkan tata letak; gagal apa pun = deck sebelum tinjau
  let ubahVisual = []
  try {
    // tinjau visual mati secara bawaan (pemilik 19 Nov 2026: "tinjau visual matiin aja"; draf jadi lebih dari 17 menit); BL_TINJAU_VISUAL=1 menyalakan
  if (pg.lolos && String(env.BL_TINJAU_VISUAL ?? '0') === '1') {
      const t = await tinjauVisual(ctx, o, { h, sesi: r.sesi, pagarDeck })
      if (t) { h = t.h; pg = t.pg; ubahVisual = t.ubah }
    }
  } finally { lepasAgen() } // kunci agen dipegang dari jalan pertama sampai tinjau selesai
  if (!pg.lolos) {
    await o.pindah(o.statusGagal, { lempar: false })
    o.gagalCatat?.()
    await kabarSekali(ctx, 'agen:pagar', tGalatPemilik(p, n, `${judulGagal} V2 ditolak pagar angka.`, pg.langgar.slice(0, 3).join('; '), 400))
    return balas(susun(`${judulGagal} ditolak`, p, m, ['Pagar angka menolak draf ini, draf tidak disimpan:', ...pg.langgar.slice(0, 3).map((x) => `- ${rapi(x, 200)}`), ...tetap], AKHIR_GAGAL))
  }
  // terbitkan: PPTX agen di jalur versi biasa (pastikanPptx, final), PDF dan pratinjau dibuat mesin (D18)
  const pptx = jalurDeck(dasar, p, lap, n), pdf = pptx.replace(/\.pptx$/i, '.pdf'), spasiDirapikan = []
  try {
    fs.mkdirSync(path.dirname(pptx), { recursive: true, mode: 0o700 })
    fs.copyFileSync(h.pptx, pptx)
    if (kunci.length) tulisJson(jalurKunci(pptx), kunci)
    // spasi ganda dirapikan otomatis sebelum PDF (pemilik 19 Nov 2026: temuan aman dibetulkan, bukan hanya dilaporkan); angka sistem tidak disentuh
    try {
      const rs = JSON.parse(String((await dep.exec(pyBin(env), [path.join(DI, 'rapi_spasi.py'), pptx, ...(kunci.length ? [jalurKunci(pptx)] : [])], { cwd: GENERATOR, timeout: 120e3, maxBuffer: 5e6 }))?.stdout || '').trim() || '{}')
      if (rs.diperbaiki > 0) spasiDirapikan.push(`Spasi ganda di slide ${rs.slide.join(', ')} dirapikan otomatis.`)
    } catch (e) { (ctx.log || (() => {}))('[rapi spasi] gagal', e.message) }
    fs.rmSync(pdf, { force: true })
    await dep.exec(pyBin(env), [path.join(GENERATOR, 'pdf.py'), pptx, path.dirname(pdf)], { cwd: GENERATOR, timeout: 300e3, maxBuffer: 20e6 })
    if (!ada(pdf)) throw new Error('PDF tidak terbentuk')
  } catch (e) { return gagal('PDF gagal dibuat', 'agen:pdf', e.message) }
  const sebelum = mode === 'revisi' ? pptxDi(path.join(ruang, 'sebelum')) : null
  const invKeluar = await inventarisAman(ctx, pptx)
  const berubahV2 = sebelum ? slideBerubah(await inventarisAman(ctx, sebelum), invKeluar) : []
  const slide = berubahV2[0] || 1
  const [png, peringatan] = await Promise.all([
    pratinjau(ctx, pdf, path.join(path.dirname(pptx), 'pratinjau'), ctx.pratinjauSatu ? slide : slidesDraf(ctx, invKeluar, slide)),
    jalankanPeriksa(ctx, { pptx, pdf, jenis: p.jenis, tanggal: p.tanggal, angka: async () => angkaDraf(await inventarisAman(ctx, pptx), kunci, []) }),
  ])
  const catatan = [...(o.catatan || []), ...h.catatan,
    ...pg.dihapus.map((x) => `Dihapus: ${x}.`),
    ...(pg.dariKemarin.length ? [`Angka dari laporan kemarin: ${pg.dariKemarin.join(', ')}.`] : []),
    ...(pg.tanpaSumber.length ? [`Angka tanpa sumber di bahan, mohon dicek: ${pg.tanpaSumber.join(', ')}.`] : [])]
  try {
    await simpanVersi(ctx, { p, n, sha, pptx, pdf, png, instruksi: o.instruksi,
      isian: { versi_bot: 2, hasil: { ringkasan: h.ringkasan, perubahan: h.perubahan, catatan: h.catatan }, sesi: r.sesi, pagar: { dihapus: pg.dihapus, tanpaSumber: pg.tanpaSumber, dariKemarin: pg.dariKemarin } },
      catatan: [...h.perubahan, ...catatan, ...peringatan] })
    await o.pindah('draf')
  } catch (e) { return gagal('versi gagal disimpan', 'versi', e.message) }
  catatIzinPemakai(ac, o.izinTambah)
  const kel = h.kelompok || { lain: h.catatan }
  if (kel.teknis?.length) { try { fs.appendFileSync(path.join(dasar, 'agen', 'usul-teknis.log'), kel.teknis.map((x) => `${new Date().toISOString()} ${p.id} v${n}: ${x}\n`).join('')) } catch {} }
  const kelompokDraf = [
    ['Perlu keputusan', kel.keputusan],
    ['Perlu dicek', [...(kel.dicek || []), ...peringatan.map(temuanRingkas), ...(pg.tanpaSumber.length ? [`Angka tanpa sumber di bahan: ${pg.tanpaSumber.join(', ')}`] : []),
      ...(pg.dariKemarin.length ? [`Angka dari laporan kemarin: ${pg.dariKemarin.join(', ')}`] : [])]],
    ['Tidak dimuat', [...(kel.tidak_dimuat || []), ...pg.dihapus.map((x) => `Dihapus: ${x}`)]],
    ['Tata letak dibetulkan setelah dilihat', mode === 'bangun' ? ubahVisual : []], // revisi: sudah ikut di Perubahan
    ['Catatan', [...(o.catatan || []), ...(kel.lain || []), ...spasiDirapikan]],
  ]
  catatGagal(ctx, sha, null)
  catatMenu(ctx, sha, p.id)
  if (mode === 'bangun') {
    const ringkas = tDraf(p, n, lap, p.tanggal, { hitung: o.hitung || {}, ringkasan: h.ringkasan, kelompok: kelompokDraf, slide: png.length || null })
    await kirimSlide(ctx, png, { pertama: ringkas })
    await ctx.balasFile(pdf, path.basename(pdf), png.length ? tPdf(p, n, lap, p.tanggal) : ringkas, MIME.pdf)
    await kirimMenuDraf(ctx, p, n)
  } else {
    const ringkas = tDrafRevisi(p, n, lap, p.tanggal, { perubahan: h.perubahan.length ? h.perubahan : [h.ringkasan || 'Revisi diterapkan.'], kelompok: kelompokDraf })
    await kirimSlide(ctx, png, { pertama: ctx.pratinjauSatu ? tPratinjau(p, n, slide) : tPratinjauRevisi(p, n, berubahV2, png.length), berubah: berubahV2 })
    await ctx.balasFile(pdf, path.basename(pdf), ringkas, MIME.pdf)
    await kirimMenuDraf(ctx, p, n)
  }
  return true // versi tersimpan dan terkirim
}

// ---------- V2.2 tinjau visual (D36, A19) ----------
// Mesin membuat PDF dari deck agen dan merender tiap slide (PyMuPDF lewat ubah.py pratinjau, di luar sandbox), lalu sesi agen dilanjutkan
// sekali untuk melihat gambarnya. -> {h, pg, ubah} atau null (gagal, bertanya, ditolak pagar: keluaran/ dipulihkan, deck sebelum tinjau dipakai).
export const MAKS_SLIDE_TINJAU = 16
async function tinjauVisual(ctx, o, { h, sesi, pagarDeck }) {
  const { env, dep } = ctx, { p, ruang, n } = o, dasar = ctx.dasar || RUMAH, log = ctx.log || (() => {})
  const dir = path.join(ruang, 'kerja', 'tinjau'), keluaran = path.join(ruang, 'keluaran'), cad = path.join(ruang, 'kerja', 'cadangan-keluaran')
  const pulihkan = () => { try { if (fs.existsSync(cad)) { fs.rmSync(keluaran, { recursive: true, force: true }); fs.cpSync(cad, keluaran, { recursive: true }) } } catch (e) { log('[tinjau] pulihkan gagal', e.message) } }
  let mulai = false
  try {
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    const deck = path.join(dir, 'deck.pptx')
    fs.copyFileSync(h.pptx, deck)
    await dep.exec(pyBin(env), [path.join(GENERATOR, 'pdf.py'), deck, dir], { cwd: GENERATOR, timeout: 300e3, maxBuffer: 20e6 })
    const pdfT = path.join(dir, 'deck.pdf')
    if (!fs.existsSync(pdfT)) throw new Error('PDF tinjau tidak terbentuk')
    const invDeck = await inventarisAman(ctx, deck)
    const jumlah = Math.min(MAKS_SLIDE_TINJAU, Math.max(1, invDeck.reduce((a, x) => Math.max(a, Number(x.slide) || 0), 0) || MAKS_SLIDE_TINJAU))
    // revisi: hanya slide yang berubah dari versi sebelumnya (biaya); tanpa slide berubah = tanpa tinjau
    const sebelum = o.mode === 'revisi' ? pptxDi(path.join(ruang, 'sebelum')) : null
    const slides = sebelum ? slideBerubah(await inventarisAman(ctx, sebelum), invDeck).filter((x) => x <= MAKS_SLIDE_TINJAU) : Array.from({ length: jumlah }, (_, i) => i + 1)
    if (!slides.length) return null
    const rr = await dep.exec(pyBin(env), [path.join(GENERATOR, 'ubah.py'), 'pratinjau', pdfT, slides.join(','), dir], { cwd: GENERATOR, timeout: 180e3, maxBuffer: 20e6 })
    const png = (JSON.parse(String(rr?.stdout || '{}')).png || []).filter((f) => fs.existsSync(f))
    if (!png.length) throw new Error('render slide tidak menghasilkan gambar')
    fs.rmSync(cad, { recursive: true, force: true }); fs.cpSync(keluaran, cad, { recursive: true })
    mulai = true
    const prompt = Agen.promptTinjau({ ruang, png })
    Agen.segarkanKunciAgen(dasar, p.id) // kunci agen masih dipegang kerjakanAgen
    const r2 = await Agen.jalankan({ ...ctx, dasar, promptSesiBaru: () => prompt }, { jenis: p.jenis, id: p.id, ruang, prompt, sesi, pyBin: path.dirname(pyBin(env)), biaya: { ...biayaWorker(ctx), kegiatan: 'tinjau' } })
    const h2 = r2.hasil
    if (!h2.pptx || h2.tanya.length) throw new Error('tinjau tidak menghasilkan deck')
    // tinjau hanya tata letak: seluruh teks deck (tanpa spasi dan baris baru) harus sama dengan sebelum tinjau
    const teksRata = (inv) => inv.map((x) => String(x.teks || '')).join('').replace(/\s+/g, '')
    if (teksRata(await inventarisAman(ctx, h2.pptx)) !== teksRata(invDeck)) throw new Error('tinjau mengubah isi teks, bukan hanya tata letak')
    const pg2 = await pagarDeck(h2.pptx)
    if (!pg2.lolos) throw new Error('hasil tinjau ditolak pagar: ' + (pg2.langgar[0] || ''))
    const ubah = h2.perubahan.filter((x) => !h.perubahan.includes(x))
    return { pg: pg2, ubah, h: { ...h2, perubahan: [...h.perubahan, ...ubah], ringkasan: h.ringkasan || h2.ringkasan, catatan: h.catatan, kelompok: h.kelompok } }
  } catch (e) {
    log('[tinjau] dilewati', e.message)
    if (mulai) pulihkan()
    try { fs.appendFileSync(path.join(dasar, 'agen', 'usul-teknis.log'), `${new Date().toISOString()} ${p.id} v${n}: tinjau visual dilewati: ${e.message}\n`) } catch {}
    return null
  }
}

// Bungkus kunci proyek, tanda sibuk, dan mengetik untuk revisi, balik, dan jawaban V2.
async function denganKunciV2(ctx, sha, p, langkah, kerja) {
  const dasar = ctx.dasar || RUMAH
  const lepas = kunciProses(lockProyek(dasar, p.id))
  if (!lepas) return ctx.balas(tSibuk(p, p.versi || null))
  let status = p.status
  const pindah = async (ke, o) => { if (status === ke) return true; const ok = await pindahStatus(ctx, p, ke, sha, o); if (ok) status = ke; return ok }
  const kunciSibuk = tandaiSibuk(ctx, sha, p.id)
  const prog = await mulaiProgres(ctx)
  try { return await kerja(pindah) } catch (e) {
    if (status === 'membangun') await pindah(p.versi > 0 ? 'draf' : 'terbuka', { lempar: false })
    catatGagal(ctx, sha, langkah)
    throw e
  } finally { await prog.akhir('gagal'); lepasSibuk(kunciSibuk); lepas() }
}

// V2-B: revisi dan balik vN proyek V2 (D24).
async function revisiV2(pesan, dari, sha, p, ctx, opsi = {}) {
  const dasar = ctx.dasar || RUMAH, lap = lapDari(p.jenis), m = p.versi, n = m + 1
  const kalimat = String(pesan?.teks || '').trim().slice(0, MAKS_KALIMAT)
  const langkah = { langkah: 'revisi', id: p.id, ...(opsi.balik != null ? { balik: opsi.balik } : { teks: kalimat, ...(pesan?.gambar?.length ? { gambar: pesan.gambar } : {}) }) }
  return denganKunciV2(ctx, sha, p, langkah, async (pindah) => {
    if (opsi.balik != null) {
      await pindah('membangun')
      const src = await pastikanPptx(ctx, p, lap, opsi.balik, sha)
      const pptx = jalurDeck(dasar, p, lap, n), pdf = pptx.replace(/\.pptx$/i, '.pdf')
      fs.mkdirSync(path.dirname(pptx), { recursive: true, mode: 0o700 })
      fs.copyFileSync(src, pptx)
      fs.rmSync(pdf, { force: true })
      await ctx.dep.exec(pyBin(ctx.env), [path.join(GENERATOR, 'pdf.py'), pptx, path.dirname(pdf)], { cwd: GENERATOR, timeout: 300e3, maxBuffer: 20e6 })
      const png = await pratinjau(ctx, pdf, path.join(path.dirname(pptx), 'pratinjau'), slidesDraf(ctx, await inventarisAman(ctx, pptx)))
      const perubahan = [`Isi sama dengan v${opsi.balik}.`]
      await simpanVersi(ctx, { p, n, sha, pptx, pdf, png, instruksi: `balik v${opsi.balik}`, isian: { versi_bot: 2, balik: opsi.balik }, catatan: perubahan })
      await pindah('draf')
      Agen.catatSesi(dasar, p.id, { balik: opsi.balik })
      catatGagal(ctx, sha, null); catatMenu(ctx, sha, p.id)
      await kirimSlide(ctx, png, { pertama: ctx.pratinjauSatu ? tPratinjau(p, n, 1) : tPratinjauRevisi(p, n, [], png.length) })
      await ctx.balasFile(pdf, path.basename(pdf), tDrafRevisi(p, n, lap, p.tanggal, { perubahan }), MIME.pdf)
      return kirimMenuDraf(ctx, p, n)
    }
    if (!Agen.adaAcuan(dasar, p.id)) {
      return ctx.balas(susun('Revisi belum bisa', p, m, ['Bahan dan deck dasar laporan ini sudah tidak ada di mesin.', `Draf v${m} tetap berlaku.`, 'Ketik *batal*, lalu *buat* lagi untuk laporan baru.']))
    }
    const sebelum = await pastikanPptx(ctx, p, lap, m, sha)
    const ruang = Agen.siapkanRuang({ dasar, id: p.id, n, sebelum }) // dasar, bahan, kemarin dari acuan mesin
    const s = Agen.bacaSesi(dasar, p.id) || {}
    const kalimatAman = samarkan(kalimat)
    const gambar = await unduhGambarRevisi(ctx, pesan?.gambar || [], path.join(ruang, 'revisi'))
    const prompt = Agen.promptRevisi({ n, ruang, kalimat: kalimatAman, balik: s.balik || null, gambar })
    const riwayat = (await versiDaftar(ctx, p, sha).catch(() => [])).map((x) => `v${x.n}: ${rapi(x.instruksi || 'buat', 160)}`)
    const promptSesiBaru = () => [Agen.promptBangun({ jenis: p.jenis, judul: lap.judul, tanggal: p.tanggal, id: p.id, ruang, kemarin: Agen.kemarinAcuan(dasar, p.id), riwayat }), '', prompt].join('\n')
    const deckNama = path.basename(pptxDi(path.join(Agen.acuan(dasar, p.id), 'dasar')) || jalurDeck(dasar, p, lap, 1))
    await kabarMulai(ctx, p, lap, { versi: 'v2', mode: 'revisi', n })
    const ok = await kerjakanAgen(ctx, { p, sha, dari, lap, mode: 'revisi', n, m, ruang, prompt, sesi: s.sesi || null, promptSesiBaru, deckNama, catatan: [],
      izinTambah: [kalimatAman], instruksi: `revisi: ${rapi(kalimatAman, 480)}`, pindah, statusGagal: 'draf', gagalCatat: () => catatGagal(ctx, sha, langkah) })
    if (ok === true && s.balik) Agen.catatSesi(dasar, p.id, { balik: null }) // catatan balik hanya hilang sesudah versi baru tersimpan
  })
}

// D25: jawaban atas pertanyaan agen (atau `lanjut` tanpa jawaban), melanjutkan sesi yang sama di ruang kerja yang sama.
async function jawabV2(pesan, dari, sha, p, ctx, t, { tanpaJawaban = false } = {}) {
  const dasar = ctx.dasar || RUMAH, lap = lapDari(p.jenis)
  if ((t.mode === 'revisi' && p.versi !== t.m) || (t.mode === 'bangun' && p.versi > 0) || !fs.existsSync(t.ruang)) { Agen.hapusTanya(dasar, p.id); return null }
  const teks = String(pesan?.teks || '').trim().slice(0, MAKS_KALIMAT)
  // `ulangi` mengirim ulang pesan ini; pertanyaan tetap berlaku (status kembali bertanya/draf) sehingga pesan itu kembali jadi jawaban
  const langkah = { langkah: 'pesan', teks: tanpaJawaban ? 'lanjut' : teks }
  return denganKunciV2(ctx, sha, p, langkah, async (pindah) => {
    Agen.bersihkanKeluaran(t.ruang)
    await kabarMulai(ctx, p, lap, { versi: 'v2', mode: t.mode, n: t.n })
    const prompt = tanpaJawaban ? Agen.promptLanjutTanpaJawaban(t.ruang) : Agen.promptRevisi({ n: t.n, ruang: t.ruang, kalimat: samarkan(teks), jawaban: true })
    await kerjakanAgen(ctx, { p, sha, dari, lap, mode: t.mode, n: t.n, m: t.m, ruang: t.ruang, prompt, sesi: Agen.bacaSesi(dasar, p.id)?.sesi || null,
      promptSesiBaru: () => prompt, deckNama: t.deckNama, catatan: t.catatan || [], hitung: t.hitung || {}, instruksi: t.instruksi || 'buat', izinTambah: tanpaJawaban ? [] : [samarkan(teks)],
      pindah, statusGagal: t.mode === 'bangun' ? 'bertanya' : 'draf', gagalCatat: () => catatGagal(ctx, sha, langkah) })
    return true
  })
}
async function tanyaAgenPengirim(ctx, sha) {
  if (String(ctx.env.BL_VERSI || '') !== '2') return null
  const dasar = ctx.dasar || RUMAH
  const t = Agen.tanyaPengirim(dasar, sha)
  if (!t) return null
  const p = (await proyekPengirim(ctx, sha, (x) => x.id === t.id))[0]
  if (!p || !['bertanya', 'draf'].includes(p.status)) { Agen.hapusTanya(dasar, t.id); return null }
  return { t, p }
}

// ---------- konfirmasi batal dari menu (~/.wa-bot/proyek/konfirmasi.json: {wa_sha: {id, waktu}}) ----------
const KONFIRMASI_MS = 5 * 60e3
const konfirmP = (dasar) => path.join(dirProyek(dasar), 'konfirmasi.json')
const teksYa = (t) => normalPerintah(t) === 'ya'
function konfirmasiBatal(ctx, sha) {
  const k = bacaJson(konfirmP(ctx.dasar || RUMAH), {})[sha]
  return k && (ctx.now || new Date()).getTime() - Number(k.waktu) <= KONFIRMASI_MS ? k : null
}
function catatKonfirmasi(ctx, sha, id, aksi = 'batal') {
  const f = konfirmP(ctx.dasar || RUMAH), isi = bacaJson(f, {})
  if (!id && !isi[sha]) return
  if (id) isi[sha] = { id, aksi, waktu: (ctx.now || new Date()).getTime() }; else delete isi[sha]
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

// ---------- tanya revisi (~/.wa-bot/proyek/tanya_revisi.json: {id: {v, kalimat, tanya, jawab, waktu}}) ----------
const TANYA_REVISI_MS = 2 * 3600e3
const tanyaRevisiP = (dasar) => path.join(dirProyek(dasar), 'tanya_revisi.json')
function catatTanyaRevisi(ctx, id, v, isi) {
  try { const f = tanyaRevisiP(ctx.dasar || RUMAH), semua = bacaJson(f, {}); if (isi) semua[id] = { v, ...isi, waktu: Date.now() }; else delete semua[id]; tulisJson(f, semua) } catch (e) { (ctx.log || (() => {}))('catat tanya revisi gagal', e.message) }
}
// tanya yang masih berlaku untuk proyek id versi v; selalu dihapus saat dibaca (sekali pakai, tanya baru dicatat ulang bila Claude bertanya lagi)
function ambilTanyaRevisi(ctx, id, v) {
  const e = bacaJson(tanyaRevisiP(ctx.dasar || RUMAH), {})[id]
  if (!e) return null
  catatTanyaRevisi(ctx, id, v, null)
  return e.v === v && Date.now() - Number(e.waktu || 0) <= TANYA_REVISI_MS ? e : null
}
export function susunJawaban(e, jawaban) {
  return [`Permintaan revisi awal: "${e.kalimat}"`, ...(e.jawab || []).map((j) => `Jawaban sebelumnya: "${j}"`),
    'Bot bertanya:', ...(e.tanya || []).map((q, i) => `${i + 1}. ${q}`), `Jawaban pemakai: "${jawaban}"`,
    'Terapkan permintaan awal sesuai jawaban ini.'].join('\n').slice(0, MAKS_KALIMAT)
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
// Penyebab galat langsung di chat (pemilik 19 Nov 2026: "bisa dikasih tau aja errornya apa langsung di chat"): satu baris, ringkas,
// jalur folder mesin, token Bearer, dan teks berbentuk kunci API disamarkan. Kabar ke pemilik (sekali sehari per jenis) tetap jalan.
export function barisPenyebab(pesan) {
  const t = String(pesan ?? '').replace(/\s+/g, ' ').trim()
    .replace(/(?:\/(?:Users|home|private|var|tmp|opt|Volumes)\/|[A-Za-z]:[\\/])[^\s'"(),;]*/g, '…')
    .replace(/sk-ant-[\w-]+/g, '[disamarkan]').replace(/Bearer \S+/gi, 'Bearer …')
    .replace(/\s*\(kode \w+, rincian di …\)/g, '') // "generator gagal (kode G1, rincian di <jalur>): x" -> "generator gagal: x"
  return t ? `Penyebab: ${rapi(t, 220)}` : ''
}
const penyebab = (pesan) => { const b = barisPenyebab(pesan); return b ? [b] : [] }
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
// Kepala WA menyebut lebih banyak kejadian dari yang dirinci: pengirim diberi tahu jumlahnya dan jalan keluarnya (keputusan pemilik per laporan).
function barisKurang(ctx, dari, lap, pesan) {
  const m = String(pesan || '').match(/terurai (\d+) kejadian, laporan menyebut (\d+) menonjol/)
  if (!m || lap?.id !== 'harian' || Number(m[1]) >= Number(m[2])) return []
  return [`WA Koordalops menyebut ${m[2]} kejadian menonjol tetapi hanya merinci ${m[1]}.`,
    `Ketik *terima kurang* untuk membuat laporan dengan ${m[1]} kejadian, atau kirim WA yang lengkap lalu *ulangi*.`]
}
// `terima kurang` (semua nomor terdaftar, pemilik 19 Nov 2026: "terapkan umum dong"): ulangi pembangunan harian terakhir yang gagal dengan --terima-kurang.
async function terimaKurang(dari, sha, ctx) {
  const e = gagalTerakhir(ctx, sha)
  if (!e || e.langkah !== 'bangun' || !e.cmd || lapDari(e.cmd.jenis)?.id !== 'harian') { await ctx.balas(susun('Tidak ada yang bisa diterima', null, null, 'Perintah ini hanya untuk laporan harian yang gagal karena jumlah kejadian WA kurang dari kepalanya.')); return { status: 'terima kurang kosong' } }
  catatGagal(ctx, sha, null)
  await buat({ ...e.cmd, aksi: 'buat', lanjut: true, terimaKurang: true }, dari, sha, ctx)
  return { status: 'terima kurang' }
}

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
    return revisi(e.balik != null ? null : { teks: e.teks, gambar: e.gambar || [] }, dari, sha, p, ctx, e.balik != null ? { balik: e.balik } : {})
  }
  if (e.langkah === 'pesan' && e.teks && normalPerintah(e.teks) !== 'ulangi') return tangani({ dari, teks: e.teks }, ctx)
  return ctx.balas(tTakAdaUlang())
}

// ---------- kemajuan: hanya "sedang mengetik" selama membangun (pemilik 18 Nov 2026: "Hapus, cukup mengetik") ----------
// Pesan kemajuan yang disunting dihapus: suntingan dari gateway Baileys tampil sebagai "Waiting for this message" di WA penerima.
// ctx.mengetik(nyala) opsional; gagal = diam, pembangunan tidak pernah terganggu. ke() dan akhir() tetap ada supaya pemanggil tidak berubah.
async function mulaiProgres(ctx) {
  let habis = false
  const ketik = (nyala) => { try { if (typeof ctx.mengetik === 'function') Promise.resolve(ctx.mengetik(nyala)).catch(() => {}) } catch {} }
  ketik(true)
  return {
    async ke() {},
    async akhir() { if (habis) return; habis = true; ketik(false) },
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
// K44: lintasan siang belum masuk FIRMS. *sekarang* = bangun dengan data yang ada (dicatat di draf); *tunggu* = dibangun begitu FIRMS dan situs lengkap.
export const CATATAN_SEKARANG = 'Dibangun sebelum lintasan siang masuk FIRMS: hotspot dan firespot hari ini belum lengkap.'
export const tPilihLintasan = (p, st) => susun('Data satelit belum lengkap', p, null, barisSatelit(st),
  ['Pilih salah satu:', '- *sekarang*: buat sekarang dengan data yang ada', '- *tunggu*: dibangun otomatis begitu lintasan siang masuk FIRMS dan situs memuatnya'])
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
  if (kata === 'sekarang') return buat({ aksi: 'buat', jenis: e.jenis, tanggal: e.tanggal, saja: true, lanjut: true, satelit: 'sekarang' }, dari, sha, ctx)
  if (kata === 'hitung') return buat({ aksi: 'buat', jenis: e.jenis, tanggal: e.tanggal, saja: true, lanjut: true, firespot: 'firms' }, dari, sha, ctx)
  // *tunggu*: jam pesan ini disimpan sebagai jam pesan masuk saat draf dikirim detak (jendela balasan limiter); hitungan mundur mulai lagi.
  const kini = (ctx.now || new Date()).getTime()
  catatSatelit(ctx, e.id, { ...e, keadaan: 'tunggu', masuk: kini, mulaiTunggu: kini, nol: 0, ditanyaUlang: false })
  if (e.pilih === 'lintasan') return ctx.balas(susun('Menunggu data satelit', { id: e.id }, null, ['Laporan dibangun otomatis begitu lintasan siang masuk FIRMS dan situs memuatnya.', 'Dicek tiap 10 menit.'], 'Ketik *sekarang* bila ingin membuat dengan data yang ada.'))
  return ctx.balas(susun('Menunggu situs', { id: e.id }, null, ['Laporan dibangun otomatis begitu situs memuat lintasan siang.', 'Dicek tiap 10 menit.'], 'Ketik *hitung* bila ingin membangun sekarang.'))
}
const tTanyaUlangLintasan = (id, st) => susun('Data satelit masih belum lengkap', { id }, null, st ? barisSatelit(st) : 'Data satelit: status belum terbaca.',
  ['Pilih lagi:', '- *sekarang*: buat sekarang dengan data yang ada', '- *tunggu*: tetap menunggu data lengkap'])
const tTanyaUlangSatelit = (id, st) => susun('Situs masih belum memuat', { id }, null, st ? barisSatelit(st) : 'Data satelit: status belum terbaca.',
  ['Pilih lagi:', '- *hitung*: bangun sekarang, firespot dihitung langsung dari FIRMS dengan rumus yang sama dengan situs', '- *tunggu*: tetap menunggu situs'])

// ---------- K43: tawaran slide rincian laporan harian (~/.wa-bot/proyek/rincian.json: {id: {sha, dari, jenis, tanggal, wa, karhutla, selesai, tampil}}) ----------
// Pemilik 20 Nov 2026 (laporan 39 kejadian): "ada juga pertanyaan tambah slide rincian kejadian", "sekalian kasih tau ada berapa kejadian".
// Sesudah *lanjut*, laporan harian yang kejadiannya lebih dari harian.GABUNG_BARIS (tabel slide 1 digabung per provinsi) ditanya dulu.
// hitungKejadian -> {wa, karhutla, selesai, tampil, banyak} dari `harian_ringkas.py --hitung` (dep.hitungKejadian disuntik di uji); galat = null (tidak menahan).
export async function hitungKejadian(ctx, tanggal, teksKoordalops, dir, opsi = {}) {
  const dep = ctx.dep || {}
  try {
    if ('hitungKejadian' in dep) return dep.hitungKejadian ? (await dep.hitungKejadian(tanggal, teksKoordalops, opsi)) || null : null
    if (typeof dep.exec !== 'function' || !teksKoordalops || /^biner:/.test(teksKoordalops)) return null
    fs.mkdirSync(dir, { recursive: true })
    const f = path.join(dir, 'hitung-koordalops.txt'); fs.writeFileSync(f, teksKoordalops, { mode: 0o600 })
    const r = await dep.exec(pyBin(ctx.env), [path.join(GENERATOR, 'harian_ringkas.py'), '--tanggal', tanggal, '--koordalops', f, '--out', path.join(dir, 'hitung'), '--hitung',
      ...(opsi.terimaKurang ? ['--terima-kurang'] : [])], { cwd: GENERATOR, timeout: 90e3, maxBuffer: 2e6 })
    const j = JSON.parse(String(r?.stdout || '').trim().split('\n').pop())
    return j && typeof j.tampil === 'number' ? j : null
  } catch (e) { (ctx.log || (() => {}))('hitung kejadian gagal', e.message); return null }
}
export const tTanyaRincian = (p, h, tanggal) => {
  const tidak = [h.karhutla ? `${h.karhutla} karhutla (laporan harian tanpa karhutla)` : '', h.selesai ? `${h.selesai} sudah selesai` : ''].filter(Boolean)
  return susun('Kejadian banyak', p, null,
    [`WA Koordalops ${labelTanggal(tanggal)} mencatat *${h.wa}* kejadian.`, `Masuk laporan: *${h.tampil}* kejadian (kejadian baru dan yang masih berlangsung).`,
      ...(tidak.length ? [`Tidak dimuat: ${tidak.join(', ')}.`] : []), '_Tabel slide 1 digabung per provinsi supaya tetap terbaca._'],
    ['Tambah slide rincian kejadian (peta kab/kota dan tabel per kab/kota)?', '*1* Ya, tambah', '*2* Tidak'])
}
const rincianP = (dasar) => path.join(dirProyek(dasar), 'rincian.json')
function catatRincian(ctx, id, isi) {
  const f = rincianP(ctx.dasar || RUMAH), semua = bacaJson(f, {})
  if (!isi && !semua[id]) return
  const kini = (ctx.now || new Date()).getTime()
  if (isi) semua[id] = { dibuat: kini, ...isi }
  else delete semua[id]
  tulisJson(f, semua)
}
// Tawaran hidup pengirim: di bawah 24 jam dan proyeknya masih menunggu (status dibaca ulang dari Worker).
async function pilihanRincian(ctx, sha) {
  const kini = (ctx.now || new Date()).getTime()
  const calon = Object.entries(bacaJson(rincianP(ctx.dasar || RUMAH), {})).map(([id, e]) => ({ id, ...e }))
    .filter((e) => e.sha === sha && kini - Number(e.dibuat || 0) <= SATELIT_BASI_MS).sort((a, b) => b.dibuat - a.dibuat)
  for (const e of calon) {
    try { if (MENUNGGU.includes((await bacaProyek(ctx, e.id, sha)).status)) return e } catch {}
  }
  return null
}

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
    if (st?.situs_memuat !== true || (e.pilih === 'lintasan' && st?.lintasan_siang !== true)) {
      const nol = st ? 0 : Number(e.nol || 0) + 1
      const ulang = !e.ditanyaUlang && (nol >= TUNGGU_NOL_MAKS || kini - Number(e.mulaiTunggu || e.waktu || kini) >= TUNGGU_MAKS_MS)
      catatSatelit(ctx, id, { ...e, waktu: e.waktu, nol, ditanyaUlang: e.ditanyaUlang || ulang })
      if (ulang && c.balas) { try { await c.balas((e.pilih === 'lintasan' ? tTanyaUlangLintasan : tTanyaUlangSatelit)(id, st)) } catch (x) { log('ulang satelit tanya', id, x.message) } }
      hasil.push({ id, status: ulang ? 'tanya ulang' : 'tunggu' })
      continue
    }
    try { await buat({ aksi: 'buat', jenis: e.jenis, tanggal: e.tanggal, saja: true, lanjut: true }, e.dari, e.sha, c); hasil.push({ id, status: 'bangun' }) } catch (x) { log('ulang satelit bangun', id, x.message); hasil.push({ id, status: 'galat' }) }
  }
  return hasil
}

// `lanjut`: proyek terbuka pengirim (yang dituntun lebih dulu, lalu yang terbaru) dibangun; status bertanya = bangun dengan catatan.
async function lanjut(dari, sha, ctx) {
  // V2 (D25): `lanjut` saat agen menunggu jawaban = agen melanjutkan tanpa jawaban dan mencatat asumsinya.
  const ta = await tanyaAgenPengirim(ctx, sha)
  if (ta && (await jawabV2(null, dari, sha, ta.p, ctx, ta.t, { tanpaJawaban: true })) !== null) return
  const ps = await proyekPengirim(ctx, sha, (p) => MENUNGGU.includes(p.status) || p.status === 'membangun' || p.status === 'draf')
  const tunggu = ps.filter((p) => MENUNGGU.includes(p.status))
  const t = tuntunTerakhir(ctx, sha)
  const p = tunggu.find((x) => x.id === t) || tunggu[0]
  if (!p) {
    const lain = ps[0]
    if (lain?.status === 'membangun') return ctx.balas(tSibuk(lain, lain.versi || null))
    if (lain?.status === 'draf') return ctx.balas(susun('Draf sudah ada', lain, lain.versi, 'Tulis perubahan dengan kalimat biasa, atau balas *2* untuk final.'))
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
  const bahan = await ambilBahan({ env: ctx.env, dep: { ...ctx.dep, fetch: fetchLingkup(ctx.dep, sesudahBatal(ctx, sha, p.jenis, p.tanggal, lingkup.boleh)) }, tanggal: p.tanggal, kenali: ctx.kenali, tanggalIsi: ctx.tanggalIsi, log: ctx.log || (() => {}) })
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
  try { Agen.hapusSesi(ctx.dasar || RUMAH, p.id) } catch {} // V2: sesi, ruang kerja, transkrip (D14)
  try { Maksud.tutupKumpulProyek(ctx.dasar || RUMAH, p.id) } catch {} // V2.1 D35: kumpul revisi proyek ini ikut ditutup
  // batal = mulai dari awal: bahan sebelum ini tidak dipakai proyek berikutnya, berkas kerja proyek ini dihapus
  try {
    const dasar = ctx.dasar || RUMAH
    catatBatal(ctx, sha, p.jenis, p.tanggal)
    for (const f of [path.join(dirProyek(dasar), `${p.id}.urai.json`), path.join(dirProyek(dasar), p.id), path.join(dasar, 'keluaran', 'proyek', p.id)]) fs.rmSync(f, { recursive: true, force: true })
  } catch (e) { (ctx.log || (() => {}))('bersihkan batal gagal', e.message) }
  catatGagal(ctx, sha, null)
  hapusIndeks(ctx.dasar || RUMAH, p.id)
  return balas(susun('Proyek dibatalkan', p, p.versi || null, [`${nama} dibatalkan, tanpa unggah.`, 'Bahan yang sudah dikirim ikut dihapus.', 'Ketik *buat* untuk memulai lagi dari awal.']))
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

// ---------- biaya dari D1 (K25, pembaruan 19 Nov: angka bulanan dari bl_biaya per hari; tanpa sisa saldo) ----------
const geserHari = (iso, h) => new Date(Date.parse(iso + 'T00:00:00Z') + h * 864e5).toISOString().slice(0, 10)
async function biayaHarian(ctx, awal) {
  const akhir = tanggalWib(ctx.now || new Date()), hari = []
  for (let t = awal; t <= akhir && hari.length < 62; t = geserHari(t, 1)) hari.push(t)
  const isi = await Promise.all(hari.map(async (t) => [t, Number((await worker(ctx, `/api/wa/biaya?tanggal=${t}`)).usd_mikro) || 0]))
  return Object.fromEntries(isi)
}
// -> baris pemakaian bot bulan ini (dan hari ini bila diminta) dari D1; galat Worker = catatan lokal.
// Tanpa sisa saldo (pemilik 19 Nov 2026: "gausah tampilin sisa saldo karena itu ga realtime, kemungkinan credit dipakai untuk hal lain juga").
async function barisBiaya(ctx, { hari = false } = {}) {
  const dasar = ctx.dasar || RUMAH, kini = ctx.now || new Date(), hariIni = tanggalWib(kini), awalBulan = hariIni.slice(0, 8) + '01'
  try {
    const harian = await biayaHarian(ctx, awalBulan)
    const bulanIni = Object.values(harian).reduce((a, m) => a + m, 0) / 1e6
    return [Biaya.barisBulan(dasar, ctx.env, kini, bulanIni), ...(hari ? [`Pemakaian hari ini: ${Biaya.dolar((harian[hariIni] || 0) / 1e6)}.`] : [])]
  } catch (e) {
    (ctx.log || (() => {}))('biaya D1 gagal', e.message)
    return [Biaya.barisBulan(dasar, ctx.env, kini)]
  }
}

export async function tFinal(ctx, st) {
  const p = { id: st.id }, lap = lapDari(st.jenis)
  let riwayat = []
  try { riwayat = (await versiDaftar(ctx, p, st.sha)).map((x) => `v${x.n} ${jamLabel(x.dibuat)}, ${rapi(x.instruksi || 'buat', 80)}`) } catch (e) { (ctx.log || (() => {}))('riwayat versi gagal', e.message) }
  // Biaya Claude laporan ini (semua versi); pemakaian bot bulan ini hanya untuk PEMILIK (pemilik 19 Nov 2026)
  const dasar = ctx.dasar || RUMAH, kini = ctx.now || new Date()
  const pemilik = new Set(daftar(ctx.env.PEMILIK).map(normalWa)).has(normalWa(st.dari))
  const biaya = [`Biaya Claude laporan ini: ${Biaya.dolar(Biaya.proyek(dasar, st.id))}.`, ...(pemilik ? await barisBiaya(ctx) : [])]
  return susun('Laporan selesai', p, st.n, [`${lap ? judul(lap, st.tanggal) : st.jenis}, final versi ${st.n}.`,
    `Folder Drive${st.folder?.nama ? ' (' + st.folder.nama + ')' : ''}:`, st.driveUrl],
    bagian('Riwayat versi', riwayat),
    biaya,
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
  // V2 (D23, D14): final dicatat sebagai acuan laporan kemarin; sesi agen, ruang kerja, dan transkripnya dihapus.
  try {
    const lap = lapDari(st.jenis), f = lap && jalurDeck(dasar, { id: st.id, tanggal: st.tanggal }, lap, st.n)
    if (f && fs.existsSync(f)) Agen.catatFinal(dasar, { jenis: st.jenis, tanggal: st.tanggal, id: st.id, n: st.n, pptx: f })
    Agen.hapusSesi(dasar, st.id)
    try { Maksud.tutupKumpulProyek(dasar, st.id) } catch {}
  } catch {}
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
      // berkas final tanpa keterangan (pemilik 19 Nov 2026: "ini pisahin aja"); judul, Drive, riwayat, dan biaya ada di pesan Laporan selesai
      await ctx.balasFile(pptx.p, path.basename(pptx.p), null, MIME.pptx)
      await ctx.balasFile(pdf.p, path.basename(pdf.p), null, MIME.pdf)
    }
    const hasil = await lanjutFinal(ctx, st, balas, { kirimBerkas })
    if (hasil === 'buang') return balas(susun('Final belum tercatat', pk, st.n, 'Draf berubah sebelum final tercatat. Ketik *final* lagi.'))
    if (hasil !== 'ditutup') await balas(susun(`Final v${st.n} diterima`, pk, st.n, ['Penutupan belum selesai, diulang otomatis tiap 10 menit.', 'Tautan Drive menyusul.']))
    return hasil
  } finally { lepas() }
}

// Detak 10 menit: kirim ringkasan biaya lokal (per kegiatan, per laporan) ke pemantau /admin/biaya-bot. Galat hanya dicatat.
export async function kirimBiaya(ctx) {
  try { await worker(ctx, '/api/wa/biaya/rinci', { method: 'POST', body: Biaya.ringkas(ctx.dasar || RUMAH) }); return true } catch (e) { (ctx.log || (() => {}))('kirim biaya gagal', e.message); return false }
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
    const [keadaan, lanjut] = { terbuka: ['menunggu bahan', 'Kirim bahan, lalu ketik *lanjut*.'], bertanya: ['menunggu jawaban', 'Kirim jawabannya, atau ketik *lanjut*.'], membangun: ['sedang dibangun', 'Tunggu sebentar.'], draf: ['draf siap', 'Balas *1* untuk revisi atau *2* untuk final.'] }[p.status]
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
  try { Agen.sapuSesi(dasar, now) } catch {} // V2: sesi dan transkrip lebih dari 7 hari (D14)
  for (const [id, e] of Object.entries(ix.proyek)) {
    let p
    try { p = (await proyekBuka(ctx, { id, wa_sha: e.sha })).proyek } catch { continue }
    if (p.status === 'final') continue // ditutup lewat ulangFinal, bukan kedaluwarsa
    if (!AKTIF.includes(p.status)) { hapusIndeks(dasar, id); continue }
    const umur = now - Number(p.diubah || 0)
    if (p.status === 'membangun' ? (umur < MEMBANGUN_BASI_MS || kunciHidup(lockProyek(dasar, id))) : umur < KEDALUWARSA_MS) continue
    if (!await pindahStatus(ctx, p, 'kedaluwarsa', e.sha, { lempar: false })) continue
    try { catatSatelit(ctx, id, null) } catch {}
    try { Agen.hapusSesi(dasar, id) } catch {}
    try { Maksud.tutupKumpulProyek(dasar, id) } catch {}
    hapusIndeks(dasar, id)
    const lap = lapDari(p.jenis)
    try { await (ctx.kirimKe || ((t, s) => ctx.dep.kirimTeks(t, s)))(e.dari, susun('Proyek ditutup otomatis', p, p.versi || null,
      [`${lap ? judul(lap, p.tanggal) : p.jenis} ditutup karena ${p.status === 'membangun' ? 'pembangunan terhenti lebih dari 1 jam' : '24 jam tanpa aktivitas'}, tanpa unggah.`, 'Ketik *buat* untuk memulai lagi.'])) } catch {}
    hasil.push(id)
  }
  return hasil
}

// ---------- V2.2 vision: gambar revisi, tanya draf bergambar, bukan-bahan (K36, D37, D39, D40) ----------
const MAKS_GAMBAR_BYTE = Math.floor(3.7 * 1024 * 1024) // batas 5 MB Claude API berlaku untuk base64 (4/3 ukuran asli)
// jenis gambar dari byte awal, bukan dari nama berkas pilihan pemakai (PNG bernama .jpg = 400 di API)
const mimeIsi = (b) => (b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg'
  : b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP' ? 'image/webp' : b.slice(0, 3).toString('latin1') === 'GIF' ? 'image/gif' : null)
const adalahGambar = (pesan) => /\.(jpe?g|png|webp|gif)$/i.test(String(pesan?.nama_berkas || ''))
const mimeGambar = (nama) => ({ png: 'image/png', webp: 'image/webp', gif: 'image/gif' })[String(nama).toLowerCase().split('.').pop()] || 'image/jpeg'
async function unduhBerkas(ctx, waId) {
  const r = await ctx.dep.fetch(`${W(ctx.env)}/api/wa/berkas?id=${encodeURIComponent(waId)}`, { headers: { authorization: `Bearer ${ctx.env.WA_MESIN || ''}` }, signal: AbortSignal.timeout(WAKTU_WORKER) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return Buffer.from(await r.arrayBuffer())
}
// -> jalur berkas gambar revisi di ruang kerja (gambar-K.<ext>); gambar yang gagal diunduh dilewati
async function unduhGambarRevisi(ctx, gambar, dir) {
  const out = []
  for (const [i, g] of (gambar || []).slice(0, Maksud.MAKS_GAMBAR_REVISI).entries()) {
    try {
      const b = await unduhBerkas(ctx, g.wa_id)
      if (b.length > 15 * 1024 * 1024) continue
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
      const ext = { 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[mimeIsi(b)] || '.jpg'
      const f = path.join(dir, `gambar-${i + 1}${ext}`)
      fs.writeFileSync(f, b, { mode: 0o600 }); out.push({ k: i + 1, f })
    } catch (e) { (ctx.log || (() => {}))('[gambar revisi] gagal', e.message); out.push({ k: i + 1, f: null }) }
  }
  return out
}
// D40: gambar yang dipakai sebagai revisi atau pertanyaan tidak ikut sebagai bahan saat laporan dibangun lagi
const bukanBahanP = (dasar) => path.join(dirProyek(dasar), 'bukan-bahan.json')
function catatBukanBahan(ctx, waId) {
  try { const f = bukanBahanP(ctx.dasar || RUMAH), isi = bacaJson(f, {}); isi[String(waId)] = (ctx.now || new Date()).getTime()
    for (const k of Object.keys(isi).sort((a, b) => isi[a] - isi[b]).slice(0, -500)) delete isi[k]; tulisJson(f, isi) } catch {}
}
const bukanBahan = (ctx) => new Set(Object.keys(bacaJson(bukanBahanP(ctx.dasar || RUMAH), {})))
// gambar berketerangan dari pemegang draf (bukan diteruskan, di luar kumpul): keterangan ditebak Haiku; tanya = jawab dengan gambar,
// revisi = revisi satu pesan dengan gambar, lainnya (atau Claude gagal) = null (bahan biasa)
async function gambarBerketerangan(pesan, dari, sha, ctx) {
  const draf = await drafPengirim(ctx, sha)
  if (!draf) return null
  const m = await maksudPesan(ctx, { dari, teks: pesan.teks }, sha)
  if (!m || !['tanya', 'revisi'].includes(m.maksud)) return null
  const gambar = [{ wa_id: String(pesan.wa_id), nama: pesan.nama_berkas || 'gambar.jpg' }]
  catatBukanBahan(ctx, pesan.wa_id)
  if (m.maksud === 'tanya') { await tanyaDraf({ teks: pesan.teks, gambar }, sha, draf, ctx); return { status: 'tanya draf', proyek: draf.id, gambar: true } }
  await revisi({ teks: pesan.teks, gambar }, dari, sha, draf, ctx)
  return { status: 'revisi', proyek: draf.id, gambar: true }
}

// ---------- V2.1: kumpul revisi, maksud kalimat bebas, tanya draf (K29, K30, D32-D35) ----------
const jedaKumpul = new Map() // wa_sha -> timer tanda terima kumpul
function jadwalTerimaKumpul(ctx, sha) {
  clearTimeout(jedaKumpul.get(sha))
  const t = setTimeout(async () => {
    jedaKumpul.delete(sha)
    const k = Maksud.bacaKumpul(ctx.dasar || RUMAH, sha, ctx.now || new Date())
    if (!k) return
    try {
      await ctx.balas(susun('Revisi tersimpan', null, null, [`${k.pesan.length} pesan revisi untuk ${k.id} sudah dicatat.`,
        ...(k.pesan.length >= Maksud.KUMPUL_MAKS_PESAN ? [`Batas ${Maksud.KUMPUL_MAKS_PESAN} pesan tercapai; pesan berikutnya tidak dicatat.`] : []),
        'Ketik *selesai* kalau sudah, atau *batal* untuk membatalkan revisi.']))
    } catch (e) { (ctx.log || (() => {}))('[kumpul] tanda terima gagal', e.message) }
  }, ctx.jedaKumpulMs ?? 20e3)
  t.unref?.()
  jedaKumpul.set(sha, t)
}
const hentiTerimaKumpul = (sha) => { clearTimeout(jedaKumpul.get(sha)); jedaKumpul.delete(sha) }

// -> {status} bila pesan ditangani alur kumpul, null bila tidak
async function alurKumpul(cmd, pesan, dari, sha, ctx) {
  const dasar = ctx.dasar || RUMAH, kini = ctx.now || new Date()
  if (cmd?.aksi === 'revisi') {
    const drafs = await proyekPengirim(ctx, sha, (p) => p.status === 'draf' && p.versi > 0)
    const p = cmd.id ? drafs.find((x) => x.id === cmd.id) : drafs.length === 1 ? drafs[0] : drafs.find((x) => x.id === menuTerakhir(ctx, sha))
    if (!p) {
      await ctx.balas(drafs.length > 1 && !cmd.id
        ? susun(`Ada ${drafs.length} draf terbuka`, null, null, drafs.map((x) => `- ${x.id}: ${lapDari(x.jenis) ? judul(lapDari(x.jenis), x.tanggal) : x.jenis}`), `Ketik *revisi ${drafs[0].id}* untuk memilih drafnya.`)
        : susun('Belum ada draf', null, null, cmd.id ? `Draf ${cmd.id} tidak terbuka. Ketik *status* untuk melihat proyek Anda.` : 'Belum ada draf untuk direvisi. Ketik *buat* dulu.'))
      return { status: 'revisi tanpa draf' }
    }
    const lama = Maksud.bacaKumpul(dasar, sha, kini)
    if (lama?.id === p.id && lama.pesan.length) { await ctx.balas(susun('Revisi masih dikumpulkan', p, p.versi, [`${lama.pesan.length} pesan revisi sudah dicatat.`, 'Lanjutkan kirim revisinya, lalu ketik *selesai*.'])); return { status: 'kumpul revisi', proyek: p.id } }
    Maksud.bukaKumpul(dasar, sha, p.id, kini)
    await ctx.balas(susun('Siap menerima revisi', p, p.versi, ['Kirim revisinya, boleh beberapa pesan (termasuk pesan yang diteruskan).', 'Ketik *selesai* kalau sudah semua; semua pesan dikerjakan sekaligus.', 'Ketik *batal* untuk membatalkan revisi.']))
    return { status: 'kumpul revisi', proyek: p.id }
  }
  const k = await kumpulHidup(ctx, sha)
  if (!k) return null
  // selesai, lanjut, atau kata penutup pendek (udah, sudah semua, beres, done, itu aja) menjalankan semua revisi yang terkumpul
  const tutup = cmd?.aksi === 'lanjut' || cmd?.aksi === 'selesai' || (!cmd && !pesan.ada_berkas && pesan.diteruskan !== true && /^(sudah|udah|beres|done|sudah semua|udah semua|itu aja|itu saja|cukup)$/.test(normalPerintah(pesan.teks)))
  if (tutup) {
    hentiTerimaKumpul(sha)
    const teks = Maksud.gabungKumpul(k.pesan), gambar = Maksud.gambarKumpul(k.pesan)
    if (!teks) { await ctx.balas(susun('Belum ada revisi', null, null, ['Kirim revisinya dulu, lalu ketik *selesai*.', 'Ketik *batal* untuk membatalkan revisi.'])); return { status: 'kumpul kosong' } }
    catatGagal(ctx, sha, { langkah: 'revisi', id: k.id, teks, ...(gambar.length ? { gambar } : {}) }) // ulangi tetap punya semua revisi bila langkah berikut gagal sebelum revisi mencatat dirinya
    Maksud.tutupKumpul(dasar, sha)
    const p = (await proyekPengirim(ctx, sha, (x) => x.id === k.id))[0]
    if (!p || p.status !== 'draf') { await ctx.balas(susun('Draf tidak terbuka lagi', null, null, `Proyek ${k.id} sudah tidak berstatus draf; revisi tidak dijalankan. Ketik *status* untuk melihat proyek Anda.`)); return { status: 'kumpul tanpa draf' } }
    await revisi({ teks, gambar }, dari, sha, p, ctx)
    return { status: 'revisi', proyek: p.id, kumpul: k.pesan.length }
  }
  if (cmd?.aksi === 'batal' && !cmd.id) {
    hentiTerimaKumpul(sha)
    Maksud.tutupKumpul(dasar, sha)
    await ctx.balas(susun('Revisi dibatalkan', null, null, [`${k.pesan.length} pesan revisi dibuang, draf ${k.id} tetap.`, 'Ketik *batal* lagi bila ingin membatalkan proyeknya.']))
    return { status: 'kumpul batal' }
  }
  if (cmd) return null // perintah lain tetap jalur biasa
  if (pesan.ada_berkas) {
    // screenshot revisi (V2.2, D37): gambar masuk kumpulan dan tidak jadi bahan; berkas lain tetap bahan
    if (!adalahGambar(pesan) || pesan.wa_id == null) return null
    const tk = Maksud.tambahKumpul(dasar, sha, { teks: pesan.teks, gambar: { wa_id: String(pesan.wa_id), nama: pesan.nama_berkas || 'gambar.jpg' } }, kini)
    if (!tk || tk.penuh) { jadwalTerimaKumpul(ctx, sha); return { status: 'kumpul penuh', proyek: k.id } }
    catatBukanBahan(ctx, pesan.wa_id)
    jadwalTerimaKumpul(ctx, sha)
    return { status: 'revisi dicatat', proyek: k.id, gambar: true }
  }
  if (!String(pesan.teks || '').trim()) return null
  Maksud.tambahKumpul(dasar, sha, pesan.teks, kini)
  jadwalTerimaKumpul(ctx, sha)
  return { status: 'revisi dicatat', proyek: k.id }
}

// Kumpulan hidup = belum 2 jam DAN proyeknya masih draf; proyek yang sudah final, batal, atau kedaluwarsa menutup kumpulannya.
async function kumpulHidup(ctx, sha) {
  const dasar = ctx.dasar || RUMAH, k = Maksud.bacaKumpul(dasar, sha, ctx.now || new Date())
  if (!k) return null
  const p = (await proyekPengirim(ctx, sha, (x) => x.id === k.id, { bersihkan: false }))[0]
  if (p?.status === 'draf' || p?.status === 'membangun') return k
  Maksud.tutupKumpul(dasar, sha); hentiTerimaKumpul(sha)
  return null
}

// A16: maksud kalimat bebas. Hasil di-cache 2 menit per (pengirim, teks): klasifikasi gateway dan tangani memakai satu panggilan Claude.
const cacheMaksud = new Map()
async function maksudPesan(ctx, pesan, sha) {
  const teks = String(pesan?.teks || '').trim()
  if (String(ctx.env.BL_MAKSUD ?? '1') === '0' || !Maksud.syaratMaksud(teks) || !calonRevisi(pesan, ctx)) return null
  const c = ctx.dep?.claude
  if (c ? typeof c.maksud !== 'function' : !ctx.env.ANTHROPIC_API_KEY) return null
  const kunci = `${sha}|${teks}`, kini = (ctx.now || new Date()).getTime()
  const ada = cacheMaksud.get(kunci)
  if (ada && kini - ada.waktu < 120e3) return ada.hasil
  try {
    const ps = await proyekPengirim(ctx, sha, () => true, { bersihkan: false })
    const r = await klien(ctx).maksud(teks, { hari_ini: tanggalWib(ctx.now || new Date()), proyek: ps.map((p) => ({ id: p.id, jenis: p.jenis, tanggal: p.tanggal, status: p.status, versi: p.versi || 0 })) })
    try { Biaya.catat(ctx.dasar || RUMAH, { usd: Number(r.biaya || 0) / 1e6, proyek: null, kini: ctx.now || new Date(), kegiatan: 'percakapan' }) } catch {}
    const hasil = Maksud.bersihkanMaksud(r, ctx.now || new Date())
    if (cacheMaksud.size > 200) cacheMaksud.clear()
    cacheMaksud.set(kunci, { waktu: kini, hasil })
    return hasil
  } catch (e) {
    (ctx.log || (() => {}))('[maksud] gagal', e.message)
    cacheMaksud.set(kunci, { waktu: kini, hasil: null })
    return null
  }
}

// A17: pertanyaan tentang draf dijawab dari teks deck versi terakhir; tanpa versi baru.
async function tanyaDraf(pesan, sha, p, ctx) {
  const lap = lapDari(p.jenis)
  try {
    const pptx = await pastikanPptx(ctx, p, lap, p.versi, sha)
    const inv = await inventaris(ctx, pptx)
    const riwayat = (await versiDaftar(ctx, p, sha).catch(() => [])).map((x) => `v${x.n}: ${rapi(x.instruksi || 'buat', 160)}`)
    const gambar = []
    for (const g of (pesan.gambar || []).slice(0, 4)) { const b = await unduhBerkas(ctx, g.wa_id).catch(() => null); const mt = b && mimeIsi(b); if (b && mt && b.length <= MAKS_GAMBAR_BYTE) gambar.push({ media_type: mt, data: b.toString('base64') }) }
    const r = await klien(ctx).jawabDraf(inv, riwayat, String(pesan.teks || ''), gambar)
    try { Biaya.catat(ctx.dasar || RUMAH, { usd: Number(r.biaya || 0) / 1e6, proyek: p.id, kini: ctx.now || new Date(), kegiatan: 'tanya' }) } catch {}
    catatMenu(ctx, sha, p.id)
    return ctx.balas(susun(`Tentang draf v${p.versi}`, p, p.versi, [r.jawaban || 'Jawabannya tidak tertulis di draf.'], 'Tulis revisinya bila ingin ada yang diubah.'))
  } catch (e) {
    (ctx.log || (() => {}))('[tanya draf] gagal', e.message)
    return ctx.balas(susun('Pertanyaan belum bisa dijawab', p, p.versi, [...penyebab(e.message), `Draf v${p.versi} tidak berubah.`]))
  }
}

// D33: final dari kalimat bebas selalu ditanya dulu; `ya` dalam 5 menit menjalankannya.
async function tanyaFinal(sha, ctx) {
  const drafs = await proyekPengirim(ctx, sha, (p) => p.status === 'draf' && p.versi > 0)
  const p = drafs.length === 1 ? drafs[0] : drafs.find((x) => x.id === menuTerakhir(ctx, sha))
  if (!p) {
    return ctx.balas(drafs.length
      ? susun(`Ada ${drafs.length} draf terbuka`, null, null, drafs.map((x) => `- ${x.id}`), `Ketik *final ${drafs[0].id}* (atau kode lain) untuk memilih drafnya.`)
      : susun('Belum ada draf', null, null, 'Belum ada draf untuk difinalkan. Ketik *buat* dulu.'))
  }
  const lap = lapDari(p.jenis)
  catatKonfirmasi(ctx, sha, p.id, 'final')
  return ctx.balas(susun('Perlu dipastikan dulu', p, p.versi, [lap ? judul(lap, p.tanggal) : p.jenis, `Ketik *ya* untuk mengirim draf v${p.versi} sebagai versi final ke Drive.`], 'Berlaku 5 menit. Abaikan pesan ini bila belum jadi.'))
}

// "mau lapor bencana" dari nomor yang belum berizin Lapor Bencana jatuh ke sini dan Claude membacanya sebagai `buat harian` (pemilik 20 Nov 2026):
// kata kerja "lapor" tanpa jenis laporan ditanya balik dulu, tidak langsung membuka proyek. "laporan harian", "buat penanganan" tetap jalan.
export const LAPOR_KEJADIAN = (t) => /\blapor\b/i.test(String(t ?? '')) && !/\b(harian|laphar|penanganan|karhutla|gempa|buat|bikin\w*)\b/i.test(String(t ?? ''))
const T_LAPOR_KEJADIAN = susun('Maksudnya yang mana?', null, null,
  ['1. Membuat *Laporan Kejadian Bencana Harian* (deck): ketik *buat harian*.',
    '2. Melaporkan kejadian bencana di lapangan: nomor ini belum terdaftar di Lapor Bencana. Minta admin mendaftarkan nomor Anda.'])
// -> {cmd} untuk diteruskan ke jalur perintah, {status} bila sudah dijawab, atau null (perilaku lama: revisi pemegang draf, bahan, sapaan)
async function alurMaksud(pesan, dari, sha, ctx) {
  const draf = await drafPengirim(ctx, sha)
  const m = Maksud.maksudBerlaku(await maksudPesan(ctx, pesan, sha), draf)
  if (!m) return null
  const hariIni = tanggalWib(ctx.now || new Date())
  switch (m.maksud) {
    case 'buat':
      if (LAPOR_KEJADIAN(pesan.teks)) { await ctx.balas(T_LAPOR_KEJADIAN); return { status: 'tanya lapor' } }
      return { cmd: { aksi: 'buat', jenis: m.jenis, tanggal: m.tanggal || hariIni, saja: false,
        ...(m.jenis === 'gempa' ? { lokasi: bersihLokasi(m.lokasi), saja: true } : {}) } } // gempa tanpa bahan: langsung dibangun
    case 'lanjut': case 'status': case 'bantuan': return { cmd: { aksi: m.maksud } }
    case 'batal': return { cmd: { aksi: 'batal', tanya: true } }
    case 'final': await tanyaFinal(sha, ctx); return { status: 'tanya final' }
    case 'tanya':
      if (draf) { await tanyaDraf(pesan, sha, draf, ctx); return { status: 'tanya draf', proyek: draf.id } }
      await ctx.balas(susun('Belum ada draf', null, null, ['Belum ada draf yang bisa ditanyakan.', 'Ketik *status* untuk melihat proyek Anda, atau *buat harian* untuk mulai.']))
      return { status: 'tanya tanpa draf' }
    case 'revisi':
      if (draf) return null // jalur revisi biasa
      await ctx.balas(susun('Belum ada draf', null, null, ['Belum ada draf untuk direvisi.', 'Ketik *buat harian* atau *buat penanganan* untuk mulai.']))
      return { status: 'revisi tanpa draf' }
    case 'obrolan':
      if (!m.balasan) return null
      await ctx.balas([m.balasan, '', `_${NAMA_BOT} v${VERSI}. Ketik *bantuan* untuk daftar perintah._`].join('\n'))
      return { status: 'obrolan' }
  }
  return null
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
  // V2.1 D35: selama kumpul revisi terbuka, semua teks pengirim (termasuk yang diteruskan) adalah revisi, tidak pernah bahan
  try { if (sha && !pesan.ada_berkas && String(pesan.teks || '').trim() && await kumpulHidup(ctx, sha)) return 'revisi' } catch { return 'bahan' }
  if (!calonRevisi(pesan, ctx)) return 'bahan'
  if (!sha) return 'bahan'
  if (String(ctx.env.BL_VERSI || '') === '2' && Agen.tanyaPengirim(ctx.dasar || RUMAH, sha)) return 'revisi' // jawaban atas pertanyaan agen V2 (D25), tidak jadi bahan
  try { if (await drafPengirim(ctx, sha, { bersihkan: false })) return 'revisi' } catch { return 'bahan' }
  // V2.1 D32: kalimat bebas yang meminta sesuatu (buat, status, obrolan, ...) tidak disimpan sebagai bahan; hasilnya di-cache untuk tangani
  return Maksud.maksudBerlaku(await maksudPesan(ctx, pesan, sha), false) ? 'revisi' : 'bahan' // tanpa draf: hanya permintaan jelas yang tidak jadi bahan
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
  if (ya) cmd = { aksi: ya.aksi === 'final' ? 'final' : 'batal', id: ya.id } // V2.1 D33: tanya final dari kalimat bebas juga dijawab ya
  if (cmd?.aksi === 'panduan') {
    // Salin infografis dari repo ke ~/.wa-bot/keluaran (satu-satunya akar yang boleh dikirim gateway), kirim sebagai dokumen.
    const asal = path.join(DI, '../../data/kajian-bnpb/bot-laporan/infografis/panduan-bot.pdf')
    const tujuan = path.join(ctx.dasar || RUMAH, 'keluaran', 'panduan', 'Panduan Bot Laporan BNPB.pdf')
    try {
      fs.mkdirSync(path.dirname(tujuan), { recursive: true, mode: 0o700 })
      fs.copyFileSync(asal, tujuan)
      await ctx.balasFile(tujuan, path.basename(tujuan), susun('Panduan bot laporan', null, null, ['Buka PDF ini untuk melihat cara memakai bot.']), MIME.pdf)
    } catch (e) {
      await ctx.balas(susun('Panduan belum tersedia', null, null, ['Ketik *bantuan* untuk daftar perintah.']))
    }
    return { status: 'panduan' }
  }
  if (cmd?.aksi === 'changelog') { await ctx.balas(tChangelog(cmd.semua ? CHANGELOG.length : 3)); return { status: 'changelog' } }
  if (cmd?.aksi === 'biaya') {
    const dasar = ctx.dasar || RUMAH, kini = ctx.now || new Date()
    if (!new Set(daftar(ctx.env.PEMILIK).map(normalWa)).has(dari)) { await ctx.balas(BANTUAN); return { status: 'bantuan' } }
    const akhir = Biaya.terakhir(dasar, 5).map((x) => `- ${x.id}: ${Biaya.dolar(x.usd)}`)
    const keg = Biaya.perKegiatan(dasar, kini)
    // pemakaian sebelum rincian per kegiatan ada (19 Nov 2026) hampir seluruhnya pembuatan laporan: digabung ke kegiatan laporan
    // (pemilik: "Sebelum rincian dicatat, ini apaan bingung", "masukin kemana kek")
    const belum = Biaya.bulan(dasar, kini) - keg.reduce((a, x) => a + x.usd, 0)
    if (keg.length && belum >= 0.005) {
      const lap = keg.find((x) => x.kegiatan === 'laporan')
      if (lap) lap.usd += belum; else keg.push({ kegiatan: 'laporan', label: Biaya.KEGIATAN.laporan, usd: belum })
      keg.sort((a, b) => b.usd - a.usd)
    }
    await ctx.balas(susun('Pemakaian Claude', null, null, await barisBiaya(ctx, { hari: true }),
      keg.length ? ['*Per kegiatan bulan ini:*', ...keg.map((x) => `- ${x.label}: ${Biaya.dolar(x.usd)}`)] : [],
      akhir.length ? ['*Laporan terakhir:*', ...akhir] : [],
      'Dihitung bot dari pemakaian tokennya sendiri (perkiraan). Angka Console bisa sedikit berbeda, apalagi bila kunci yang sama dipakai di tempat lain.'))
    return { status: 'biaya' }
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
    // V2.1 D35: kumpul revisi (`revisi`, pesan-pesan revisi, `lanjut` atau `batal`) didahulukan dari jalur lain.
    if (Maksud.bacaKumpul(ctx.dasar || RUMAH, sha, ctx.now || new Date())) jawab = true
    const kk = await alurKumpul(cmd, pesan, dari, sha, ctx)
    if (kk) { jawab = true; return kk }
    // V2 (D25): selama agen menunggu jawaban, teks pemegang adalah jawabannya (didahulukan dari maksud, bahan, dan revisi).
    if (!cmd && calonRevisi(pesan, ctx)) {
      const ta = await tanyaAgenPengirim(ctx, sha)
      if (ta) { jawab = true; const r = await jawabV2(pesan, dari, sha, ta.p, ctx, ta.t); if (r !== null) return { status: 'jawaban agen', proyek: ta.p.id } }
    }
    // V2.1 D32-D34: kalimat bebas dipahami Claude Haiku; hasilnya jadi perintah biasa, tanya final, tanya draf, atau obrolan.
    if (!cmd && calonRevisi(pesan, ctx)) {
      const mk = await alurMaksud(pesan, dari, sha, ctx)
      if (mk?.status) { jawab = true; return mk }
      if (mk?.cmd) { cmd = mk.cmd; jawab = true }
    }
    // `lanjut`, `ulangi`, `buat saja` saat pembangunan pengirim ini masih jalan: dijawab sekali, tidak membangun kedua kalinya.
    if ((cmd?.aksi === 'lanjut' || cmd?.aksi === 'ulangi' || (cmd?.aksi === 'buat' && cmd.saja)) && await jawabSibuk(ctx, sha)) return { status: 'masih dibangun' }
    if (cmd?.aksi === 'ulangi') { await ulangi(dari, sha, ctx); return { status: 'ulangi' } }
    if (cmd?.aksi === 'terima_kurang') return await terimaKurang(dari, sha, ctx)
    if (cmd?.aksi === 'selesai') { await ctx.balas(susun('Tidak ada revisi terbuka', null, null, ['Belum ada revisi yang sedang dikumpulkan.', 'Ketik *revisi* dulu, kirim revisinya, lalu *selesai*. Ketik *2* atau *final* bila draf sudah sesuai.'])); return { status: 'selesai tanpa kumpul' } }
    if (cmd?.aksi === 'satelit') {
      // K18: *tunggu* / *hitung* hanya menjawab pilihan hidup (di bawah 24 jam, proyek masih menunggu); selain itu petunjuk, tanpa proyek baru.
      const e = await pilihanSatelit(ctx, sha)
      if (!e) { await ctx.balas(susun('Tidak ada pilihan menunggu', null, null, `*${cmd.kata}* hanya menjawab pilihan data satelit laporan penanganan. Ketik *status* untuk melihat proyek.`)); return { status: 'satelit tanpa pilihan' } }
      await pilihSatelit(cmd.kata, e, dari, sha, ctx); return { status: cmd.kata }
    }
    if (cmd?.aksi === 'rincian' || (cmd?.aksi === 'menu' && (cmd.n === 1 || cmd.n === 2))) {
      // K43: *1*/*2* (atau *tambah rincian* / *tanpa rincian*) menjawab tawaran slide rincian yang hidup; tanpa tawaran, angka kembali ke menu draf
      const e = await pilihanRincian(ctx, sha)
      // angka hanya menjawab tawaran bila tawaran itu menu terakhir yang dikirim ke pengirim (menu draf lain yang lebih baru tetap menang)
      if (e && (cmd.aksi === 'rincian' || menuTerakhir(ctx, sha) === e.id)) {
        const ya = cmd.aksi === 'rincian' ? cmd.ya : cmd.n === 1
        await buat({ aksi: 'buat', jenis: e.jenis, tanggal: e.tanggal, saja: true, lanjut: true, rincian: ya, ...(e.terimaKurang ? { terimaKurang: true } : {}) }, dari, sha, ctx)
        return { status: ya ? 'rincian ya' : 'rincian tidak' }
      }
      if (cmd.aksi === 'rincian') { await ctx.balas(susun('Tidak ada tawaran rincian', null, null, 'Slide rincian ditawarkan sesudah *lanjut* bila kejadian laporan harian banyak. Untuk draf yang sudah jadi, tulis revisinya.')); return { status: 'rincian tanpa tawaran' } }
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
      if (aksi === 'revisi') return await alurKumpul(cmd, pesan, dari, sha, ctx)
    }
    if (cmd?.aksi === 'status') { await status(dari, sha, ctx); return { status: 'status' } }
    if (cmd?.aksi === 'buat') { await buat(cmd, dari, sha, ctx); return { status: cmd.saja ? 'buat saja' : 'buat' } }
    if (cmd?.aksi === 'lanjut') { await lanjut(dari, sha, ctx); return { status: 'lanjut' } }
    if (cmd?.aksi === 'final') { const r = await final(dari, sha, ctx, cmd.id || null); return { status: r === 'ditutup' ? 'ditutup' : r === 'tertunda' ? 'final tertunda' : 'final' } }
    if (cmd) { await perintahProyek(cmd, dari, sha, ctx); return { status: cmd.tanya ? 'tanya batal' : cmd.aksi } }
    // Perintah tidak pernah sampai ke sini (tidak pernah ke Claude). Revisi (ALUR B): calonRevisi dari pemegang proyek draf; forward dan bahan dikenali tetap bahan.
    if (!cmd && calonRevisi(pesan, ctx)) {
      const draf = await drafPengirim(ctx, sha)
      if (draf) { jawab = true; await revisi(pesan, dari, sha, draf, ctx); return { status: 'revisi', proyek: draf.id } }
    }
    const sapa = !cmd && await sapaBila(pesan, sha, ctx) // T-SAPA: obrolan pendek tanpa proyek; bahan tetap lewat jalur biasa
    if (pesan.ada_berkas && pesan.diteruskan !== true && adalahGambar(pesan) && pesan.wa_id != null && String(pesan.teks || '').trim()) {
      const gb = await gambarBerketerangan(pesan, dari, sha, ctx)
      if (gb) { jawab = true; return gb }
    }
    if (pesan.wa_id != null) { const r = await tambahBahan(pesan, dari, sha, ctx); return sapa ? { ...r, sapa: true } : r }
    return { status: sapa ? 'sapa' : 'diabaikan' }
  } catch (e) {
    (ctx.log || (() => {}))('[proyek] galat', e.message)
    await kabarSekali(ctx, 'proyek', tGalatPemilik(null, null, 'Perintah gagal.', e.message, 400))
    if (jawab) {
      // Langkah dalam (bangun, revisi) sudah mencatat dirinya; selain itu `ulangi` mengirim ulang pesan ini.
      if (JSON.stringify(gagalTerakhir(ctx, sha)) === gagalSebelum && cmd?.aksi !== 'ulangi') catatGagal(ctx, sha, { langkah: 'pesan', teks: String(pesan.teks || '') })
      await ctx.balas(susun('Perintah gagal diproses', null, null, [...penyebab(e.message), ...kabarBaris(ctx, dari), AKHIR_GAGAL]))
    }
    return { status: 'galat', alasan: e.message }
  }
}

// --kering: cek bahan rahasia dan alat tanpa memanggil Claude, Worker, atau WhatsApp (BL-13).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  muatEnv()
  const env = process.env
  // Modul Python venv bot: python-pptx (revisi lewat ubah.py dan gerbang format slide), openpyxl (Excel), Pillow (pratinjau, gerbang).
  // Generator laporan tidak memakai python-pptx, jadi draf v1 bisa jadi walau revisi pasti gagal (insiden 18 Nov 2026).
  const modul = (m) => { try { execFileSync(pyBin(env), ['-c', `import ${m}`], { stdio: 'ignore', timeout: 30e3 }); return true } catch { return false } }
  const cek = { ANTHROPIC_API_KEY: !!env.ANTHROPIC_API_KEY, WA_GARAM: !!env.WA_GARAM, WA_MESIN: !!env.WA_MESIN, generator: fs.existsSync(path.join(GENERATOR, 'ubah.py')),
    py_pptx: modul('pptx'), py_openpyxl: modul('openpyxl'), py_pillow: modul('PIL') }
  if (String(env.BL_VERSI || '') === '2') { // V2: SDK agen terpasang di gateway (BV-06)
    cek.agen_sdk = fs.existsSync(path.join(DI, 'gateway', 'node_modules', '@anthropic-ai', 'claude-agent-sdk'))
    cek.agen_nomor = true // V2 untuk semua nomor terdaftar, atau BL_V2_NOMOR bila diisi
  }
  console.log(JSON.stringify(cek))
  process.exit(Object.values(cek).every(Boolean) ? 0 : 1)
}
