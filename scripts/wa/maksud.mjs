// V2.1 kecerdasan percakapan (pemilik 19 Nov 2026, K29 dan K30): fungsi murni dan berkas kumpulan revisi.
// Pemanggil Claude ada di claude.mjs (rapikan, maksud, jawabDraf); perangkaiannya di proyek.mjs.
// Rujukan: data/kajian-bnpb/bot-laporan/ALGORITMA.md A15-A18, KEPUTUSAN D30-D35.
import fs from 'node:fs'
import path from 'node:path'

// ---------- A15. Rapikan bahan ----------
// Galat mesin (kunci, berkas hilang, waktu habis) tidak pernah diperbaiki dengan merapikan bahan.
const GALAT_MESIN = /kunci generator|\.lock\b|keluaran tidak ada|ENOENT|EACCES|timeout|timed out|ETIMEDOUT|dipakai proses lain|SIGTERM|SIGKILL|killed|No module named|ModuleNotFoundError|command not found|spawn /i
export const galatMesin = (pesan) => GALAT_MESIN.test(String(pesan || ''))
export const MAKS_PUTARAN_RAPIKAN = 2

// Angka dinormalkan seperti A4: pemisah ribuan dibuang, koma desimal jadi titik.
const tanpaPemisah = (s) => String(s ?? '').replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1').replace(/(\d)[.,](?=\d)/g, '$1.')
const rata = (s) => String(s ?? '').normalize('NFKC').replace(/\p{Cf}/gu, '')
export const angkaDi = (s) => tanpaPemisah(rata(s)).match(/\d+(?:\.\d+)?/g) || []
const NOMOR_URUT = /^\s*[*_~]*\s*(\d{1,3})\s*[.)]/
const DIGIT_ASING = /[^\P{Nd}0-9]/u // digit Unicode selain 0-9 (Arab-Hindi, Dewanagari, ...): generator Python bisa membacanya, pagar JS tidak

// Pisah angka satu teks: nomor urut berurutan (1, 2, 3 di awal baris) dan angka isi (multiset, per nilai). Angka jumlah kejadian di
// kepala WA termasuk isi: tidak boleh diubah (keputusan pemilik 12 Nov: laporan kurang dari kepala hanya atas perintah *terima kurang*).
function uraiAngka(teks) {
  const isi = new Map(), urut = [], liar = new Set()
  let berikut = 1
  for (const baris of rata(teks).split(/\r?\n/)) {
    let sisa = baris
    const u = baris.match(NOMOR_URUT)
    if (u && Number(u[1]) === berikut) { urut.push(u[1]); berikut++; sisa = baris.slice(u[0].length) } else if (u) liar.add(u[1]) // nomor urut tidak berurutan: boleh hilang saat dirapikan, tetap dihitung sebagai isi
    const a = angkaDi(sisa)
    for (const x of a) isi.set(x, (isi.get(x) || 0) + 1)
  }
  return { isi, urut, liar }
}

// -> {lolos, angkaBaru: [{kunci, angka}], angkaHilang: [{kunci, angka}], kunciAsing, digitAsing: [kunci]}
// mentah, rapi: {kunci: teks}. D31: angka isi teks rapi harus sama persis (multiset) dengan angka isi teks mentah kunci yang sama: tanpa
// angka baru, tanpa angka ganda, tanpa angka hilang. Pengecualian: nomor urut berurutan di awal baris (angka mentah yang jadi nomor urut
// boleh hilang dari isi) dan nomor urut mentah yang tidak berurutan.
export function pagarRapikan(mentah, rapi) {
  const angkaBaru = [], angkaHilang = [], kunciAsing = [], digitAsing = []
  for (const [k, teks] of Object.entries(rapi || {})) {
    if (!(k in (mentah || {}))) { kunciAsing.push(k); continue }
    if (DIGIT_ASING.test(String(teks))) { digitAsing.push(k); continue }
    const m = uraiAngka(mentah[k]), r = uraiAngka(teks)
    for (const [x, n] of r.isi) if (n > (m.isi.get(x) || 0)) angkaBaru.push({ kunci: k, angka: x })
    const jadiUrut = new Set(r.urut)
    for (const [x, n] of m.isi) if (n > (r.isi.get(x) || 0) && !jadiUrut.has(x) && !m.liar.has(x)) angkaHilang.push({ kunci: k, angka: x })
  }
  return { lolos: !angkaBaru.length && !angkaHilang.length && !kunciAsing.length && !digitAsing.length, angkaBaru, angkaHilang, kunciAsing, digitAsing }
}

// ---------- A16. Maksud pesan ----------
export const MAKSUD = ['buat', 'lanjut', 'final', 'batal', 'revisi', 'tanya', 'status', 'bantuan', 'obrolan', 'bahan']
export const MAKS_MAKSUD = 500
export const syaratMaksud = (teks) => { const t = String(teks || '').trim(); return t.length >= 2 && t.length <= MAKS_MAKSUD }
const JENIS = new Set(['harian', 'penanganan'])
const tgl = (d) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10)

// Hasil Claude dibersihkan: maksud di luar daftar = bahan; jenis hanya harian/penanganan; tanggal hanya 14 hari ke belakang sampai besok.
export function bersihkanMaksud(h, now = new Date()) {
  const maksud = MAKSUD.includes(h?.maksud) ? h.maksud : 'bahan'
  const jenis = JENIS.has(h?.jenis) ? h.jenis : null
  let tanggal = typeof h?.tanggal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.tanggal) ? h.tanggal : null
  if (tanggal) {
    const awal = tgl(new Date(now.getTime() - 14 * 864e5)), akhir = tgl(new Date(now.getTime() + 864e5))
    if (tanggal < awal || tanggal > akhir) tanggal = null
  }
  const balasan = typeof h?.balasan === 'string' ? h.balasan.replace(/[·—–]/g, ',').trim().slice(0, 400) : ''
  return { maksud, jenis, tanggal, balasan }
}

// D33 (pemeriksa bersih 19 Nov): tanpa draf, kalimat yang ditebak revisi/tanya/obrolan kosong tetap bahan (bahan tidak boleh hilang);
// dengan draf, maksud selain ini tetap revisi ("buat judulnya lebih pendek" bukan proyek baru).
const TANPA_DRAF = new Set(['buat', 'lanjut', 'final', 'batal', 'status', 'bantuan'])
const DENGAN_DRAF = new Set(['tanya', 'final', 'batal', 'status', 'bantuan'])
// draf: proyek draf pengirim (atau null/false). Pemegang draf harian yang meminta laporan penanganan (jenis lain) tetap boleh *buat*.
export function maksudBerlaku(m, draf) {
  if (!m) return null
  if (m.maksud === 'obrolan') return m.balasan ? m : null
  if (draf && m.maksud === 'buat' && m.jenis && draf.jenis && m.jenis !== draf.jenis) return m
  return (draf ? DENGAN_DRAF : TANPA_DRAF).has(m.maksud) ? m : null
}

// ---------- A18. Kumpul revisi ----------
export const KUMPUL_MS = 2 * 3600e3, KUMPUL_MAKS_PESAN = 30, KUMPUL_MAKS_HURUF = 8000
const kumpulP = (dasar) => path.join(dasar, 'proyek', 'kumpul.json')
const baca = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return {} } }
const tulis = (p, isi) => { fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 }); fs.writeFileSync(p, JSON.stringify(isi, null, 1), { mode: 0o600 }) }

export function bukaKumpul(dasar, sha, id, kini = new Date()) {
  const isi = baca(kumpulP(dasar))
  isi[sha] = { id, mulai: kini.getTime(), waktu: kini.getTime(), pesan: [] }
  tulis(kumpulP(dasar), isi)
  return isi[sha]
}
// -> kumpulan hidup pengirim atau null (lewat 2 jam sejak pesan terakhir = dibuang)
export function bacaKumpul(dasar, sha, kini = new Date()) {
  const isi = baca(kumpulP(dasar)), k = isi[sha]
  if (!k) return null
  if (kini.getTime() - Number(k.waktu) > KUMPUL_MS) { delete isi[sha]; tulis(kumpulP(dasar), isi); return null }
  return k
}
// -> {n, penuh}; pesan ke-31 dan seterusnya tidak disimpan
// teks: string, atau {teks, gambar: {wa_id, nama}} untuk screenshot revisi (V2.2, D37)
export function tambahKumpul(dasar, sha, teks, kini = new Date()) {
  const isi = baca(kumpulP(dasar)), k = isi[sha]
  if (!k) return null
  const butir = teks && typeof teks === 'object' ? { teks: String(teks.teks || '').trim(), gambar: teks.gambar } : String(teks || '').trim()
  const penuh = k.pesan.length >= KUMPUL_MAKS_PESAN
  if ((typeof butir === 'string' ? butir : butir.gambar) && !penuh) k.pesan.push(butir)
  k.waktu = kini.getTime()
  tulis(kumpulP(dasar), isi)
  return { n: k.pesan.length, penuh }
}
export function tutupKumpul(dasar, sha) {
  const isi = baca(kumpulP(dasar))
  if (!isi[sha]) return null
  const k = isi[sha]; delete isi[sha]; tulis(kumpulP(dasar), isi)
  return k
}
// Proyek keluar dari draf (final, batal, kedaluwarsa): kumpulan untuk proyek itu dibuang, siapa pun pengirimnya.
export function tutupKumpulProyek(dasar, id) {
  const isi = baca(kumpulP(dasar)), sha = Object.keys(isi).filter((k) => isi[k]?.id === id)
  if (!sha.length) return 0
  for (const k of sha) delete isi[k]
  tulis(kumpulP(dasar), isi)
  return sha.length
}
// -> teks satu permintaan revisi: satu pesan apa adanya; beberapa pesan bernomor; dipotong 8000 huruf
// Gambar ke-K dalam kumpulan (urut kiriman), paling banyak MAKS_GAMBAR_REVISI
export const MAKS_GAMBAR_REVISI = 6
export const gambarKumpul = (pesan) => (pesan || []).filter((x) => x && typeof x === 'object' && x.gambar).map((x) => x.gambar).slice(0, MAKS_GAMBAR_REVISI)
export function gabungKumpul(pesan) {
  let g = 0
  const p = (pesan || []).map((t) => (t && typeof t === 'object' ? (t.gambar && ++g <= MAKS_GAMBAR_REVISI ? `[gambar ${g}] ${t.teks || ''}`.trim() : String(t.teks || '').trim()) : String(t).trim())).filter(Boolean)
  if (!p.length) return ''
  const isi = p.length === 1 ? p[0] : ['Revisi dari beberapa pesan, kerjakan semuanya:', ...p.map((t, i) => `${i + 1}. ${t}`)].join('\n')
  return isi.length > KUMPUL_MAKS_HURUF ? isi.slice(0, KUMPUL_MAKS_HURUF) : isi
}
