// Gerbang G-1 Jam Aturan (RU-007, RENCANA-UJI §6.1, DESAIN-TEKNIS §4.2).
//
// Aturan: tiap angka tenggat/ambang di public/inti/jam_aturan.json harus (a) bersitasi pasal dokumen BERLAKU yang
// kutipannya benar-benar ada DI PASAL ITU, atau (b) berlabel `asumsi: true` dengan `catatan`. Tidak ada angka tenggat
// bernama tertanam di luar berkas itu. Akibat bila dilanggar: staf melihat tanda "melewati pasal" yang karangan.
//
// Sumber teks = data/hukum/seed.sql (dilacak git; putusan P-12). BUKAN data/raw/hukum/teks/ (di-gitignore).
// Pemeriksa murni (periksaEntri, pindaiTertanam) diuji dengan masukan palsu supaya penjaga yang lepas ketahuan.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const JAM = join(ROOT, 'public/inti/jam_aturan.json')
const KATALOG = join(ROOT, 'public/data/bnpb/hukum/katalog.json')
const SEED = join(ROOT, 'data/hukum/seed.sql')

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim()

// ---- pemeriksa murni -------------------------------------------------------------------------------------------

// segmen: Map dok -> [{label, halaman, teks}]; katalog: {dok:[{id,status}], konflik?:[...]}
export function periksaEntri(e, katalog, segmen) {
  const awal = `jam-aturan: kunci ${e.kunci} nilai ${e.nilai} ${e.satuan}`
  if (e.asumsi === true) {
    return String(e.catatan ?? '').trim()
      ? []
      : [`${awal}: asumsi: true tetapi catatan kosong; akibatnya label "asumsi" di layar tanpa alasan. Tulis catatan atau beri acuan berpasal`]
  }
  if (!e.acuan || !e.letak || !e.kutipan) {
    return [`${awal}: tanpa acuan/letak/kutipan dan bukan asumsi; angka ini tampil seolah berpasal padahal tidak. Isi ketiganya atau set asumsi: true dengan catatan`]
  }
  const dok = (katalog.dok || []).find((d) => d.id === e.acuan)
  if (!dok) return [`${awal}: acuan ${e.acuan} tidak ada di public/data/bnpb/hukum/katalog.json; periksa ejaan id dokumen`]
  const konflik = new Set((katalog.konflik || []).map((k) => (typeof k === 'string' ? k : k.id || k.dok || k.dari)))
  if (dok.status !== 'BERLAKU' || konflik.has(e.acuan)) {
    return [`${awal}, acuan ${e.acuan}: status ${dok.status}${konflik.has(e.acuan) ? ' dan masuk daftar konflik' : ''}, bukan BERLAKU; pasal dari dokumen dicabut menyesatkan. Ganti acuan ke dokumen pengganti`]
  }
  const semua = segmen.get(e.acuan) || []
  if (!semua.length) return [`${awal}, acuan ${e.acuan}: tidak ada segmen di data/hukum/seed.sql; bangun ulang seed (scripts/bnpb/hukum.py)`]
  const m = /Pasal\s+(\d+)/i.exec(e.letak)
  const h = /hal\.\s*(\d+)/i.exec(e.letak)
  let cakup
  if (m) {
    const lab = `pasal ${m[1]}`
    cakup = semua.filter((s) => norm(s.label) === lab || norm(s.label).startsWith(`${lab} (lanjutan`))
    if (!cakup.length) return [`${awal}, acuan ${e.acuan} ${e.letak}: segmen "Pasal ${m[1]}" tidak ada di seed (${semua.length} segmen dokumen)`]
  } else if (h) {
    cakup = semua.filter((s) => s.halaman === Number(h[1]))
    if (!cakup.length) return [`${awal}, acuan ${e.acuan} ${e.letak}: tidak ada segmen mulai di halaman ${h[1]} di seed`]
  } else {
    return [`${awal}, acuan ${e.acuan}: letak "${e.letak}" bukan "Pasal N ..." atau "hal. N"; gerbang tak bisa mencocokkan kutipan ke tempatnya`]
  }
  const gabung = norm(cakup.map((s) => s.teks).join(' '))
  if (!gabung.includes(norm(e.kutipan))) {
    const elsewhere = semua.some((s) => norm(s.teks).includes(norm(e.kutipan)))
    return [`${awal}, acuan ${e.acuan} ${e.letak}: kutipan "${e.kutipan}" tidak ditemukan di ${cakup.length} segmen ${e.letak}` +
      (elsewhere ? ' (ADA di bagian lain dokumen yang sama: pasal/halaman salah)' : ' maupun di dokumen itu (karangan atau salah OCR)') +
      '; betulkan letak atau kutipan dari data/hukum/seed.sql']
  }
  return []
}

// tenggat bernama tertanam: `xxx_hari: 30`, `jam = 72`, di dalam objek AMBANG juga (nilai("kunci") lolos; AMBANG_INTERNAL dikecualikan)
const POLA_ANGKA = /(hari|jam|bulan)\s*[:=]\s*(24|72|90|30|365)\b/   // tanpa \b depan: nama bergaris bawah (dsp_spj_hari) harus kena
export function pindaiTertanam(berkas, isi, pengecualian = {}) {
  if (pengecualian[berkas]) return []
  return isi.split('\n').flatMap((b, i) => {
    if (/AMBANG_INTERNAL|\bRAPOR\b/.test(b)) return []   // RAPOR = bobot/jendela rapor staf, bukan tenggat berpasal
    return POLA_ANGKA.test(b)
      ? [`jam-aturan: ${berkas}:${i + 1} menanam angka tenggat (${b.trim().slice(0, 80)}); satu sumber angka aturan hanya jam_aturan.json (nilai("kunci")); ganti dengan pembacaan Jam Aturan`]
      : []
  })
}

// seed.sql: gabungkan baris tiap INSERT (teks bisa multibaris, kutip ditulis ''), simpan hanya dok yang diminta
export function bacaSegmen(sql, dokDiminta) {
  const re = /INSERT INTO hukum_segmen \([^)]*\) VALUES \(\d+, '([^']*(?:''[^']*)*)', \d+, '[^']*(?:''[^']*)*', '([^']*(?:''[^']*)*)', (?:NULL|'[^']*(?:''[^']*)*'), (\d+|NULL), '([^']*(?:''[^']*)*)'\);/g
  const peta = new Map()
  for (const m of sql.matchAll(re)) {
    if (!dokDiminta.has(m[1])) continue
    if (!peta.has(m[1])) peta.set(m[1], [])
    peta.get(m[1]).push({ label: m[2].replace(/''/g, "'"), halaman: m[3] === 'NULL' ? null : Number(m[3]), teks: m[4].replace(/''/g, "'") })
  }
  return peta
}

// ---- bukti bahwa yang salah DITOLAK (fixture) --------------------------------------------------------------------

const KAT = { dok: [{ id: 'perban-ok', status: 'BERLAKU' }, { id: 'perban-lama', status: 'TIDAK BERLAKU' }] }
const SEG = new Map([['perban-ok', [
  { label: 'Pasal 4', halaman: 3, teks: 'Laporan kejadian disampaikan paling lambat 3 (tiga)\nhari setelah kejadian.' },
  { label: 'Pasal 21', halaman: 9, teks: '(1) paling lambat setiap tanggal 5 (lima) bulan berikutnya' },
  { label: 'Pasal 21 (lanjutan 1)', halaman: 10, teks: '(2) paling lambat 3 (tiga) bulan setelah masa status berakhir' },
]], ['perban-lama', [{ label: 'Pasal 1', halaman: 1, teks: 'paling lambat 10 hari' }]]])
const BAIK = { kunci: 'k', jenis: 'tenggat', nilai: 3, satuan: 'hari', acuan: 'perban-ok', letak: 'Pasal 4 ayat (1)',
  kutipan: 'paling lambat 3 (tiga) hari setelah kejadian', asumsi: false }

test('G-1 pemeriksa: entri benar lolos (kutipan multibaris, spasi dan huruf dinormalkan, pasal lanjutan)', () => {
  assert.deepEqual(periksaEntri(BAIK, KAT, SEG), [])
  assert.deepEqual(periksaEntri({ ...BAIK, letak: 'Pasal 21 ayat (2)', kutipan: 'PALING  lambat 3 (tiga) bulan' }, KAT, SEG), [])
  assert.deepEqual(periksaEntri({ kunci: 'x', nilai: 90, satuan: 'hari', asumsi: true, catatan: 'tanda internal' }, KAT, SEG), [])
})

test('G-1 pemeriksa: menolak kutipan yang ada di dokumen tetapi di pasal LAIN', () => {
  const r = periksaEntri({ ...BAIK, letak: 'Pasal 21 ayat (1)' }, KAT, SEG)
  assert.equal(r.length, 1)
  assert.match(r[0], /bagian lain dokumen yang sama/)
})

test('G-1 pemeriksa: menolak pasal yang tidak ada, letak tak terbaca, kutipan karangan', () => {
  assert.match(periksaEntri({ ...BAIK, letak: 'Pasal 99' }, KAT, SEG)[0], /segmen "Pasal 99" tidak ada/)
  assert.match(periksaEntri({ ...BAIK, letak: 'lampiran B' }, KAT, SEG)[0], /bukan "Pasal N/)
  const r = periksaEntri({ ...BAIK, kutipan: 'wajib dilaporkan dalam 7 hari kerja' }, KAT, SEG)
  assert.match(r[0], /karangan atau salah OCR/)
})

test('G-1 pemeriksa: menolak acuan dokumen dicabut, acuan tak terdaftar, dan acuan di daftar konflik', () => {
  assert.match(periksaEntri({ ...BAIK, acuan: 'perban-lama', letak: 'Pasal 1', kutipan: 'paling lambat 10 hari' }, KAT, SEG)[0], /status TIDAK BERLAKU/)
  assert.match(periksaEntri({ ...BAIK, acuan: 'perka-1-2012' }, KAT, SEG)[0], /tidak ada di public\/data\/bnpb\/hukum\/katalog.json/)
  const konflik = { ...KAT, konflik: [{ id: 'perban-ok' }] }
  assert.match(periksaEntri(BAIK, konflik, SEG)[0], /daftar konflik/)
})

test('G-1 pemeriksa: menolak tanpa pasal dan tanpa asumsi; asumsi tanpa catatan', () => {
  assert.match(periksaEntri({ kunci: 'x', nilai: 1, satuan: 'hari', acuan: null, letak: null, kutipan: null, asumsi: false }, KAT, SEG)[0], /bukan asumsi/)
  assert.match(periksaEntri({ kunci: 'x', nilai: 1, satuan: 'hari', asumsi: true, catatan: '  ' }, KAT, SEG)[0], /catatan kosong/)
})

test('G-1 pemindai: menolak dsp_spj_hari: 30 dan angka di objek AMBANG, membiarkan nilai(),  AMBANG_INTERNAL dan pengecualian bertanggal', () => {
  const r = pindaiTertanam('src/x.js', 'a\nconst c = {dsp_spj_hari: 30}\nb')
  assert.equal(r.length, 1)
  assert.match(r[0], /src\/x.js:2 /)
  assert.deepEqual(pindaiTertanam('src/y.js', 'export const AMBANG = {\n  kaji_awal_jam: nilai("kaji_awal"),\n};'), [])
  assert.equal(pindaiTertanam('src/y.js', 'export const AMBANG = {\n  kaji_verifikasi_jam: 72,\n};').length, 1)
  assert.equal(pindaiTertanam('src/y.js', 'const AMBANG = {\n  renkon_uji_hari: 365,\n};').length, 1)
  assert.deepEqual(pindaiTertanam('src/z.js', 'const AMBANG_INTERNAL = {renkon_segera_hari: 90}'), [])
  assert.deepEqual(pindaiTertanam('src/x.js', 'jam: 72', { 'src/x.js': 'RU-039' }), [])
})

test('G-1 pembaca seed: menggabung INSERT multibaris, membuka kutip ganda', () => {
  const sql = "INSERT INTO hukum_segmen (id, dok, urut, jenis, label, bab, halaman, teks) VALUES (1, 'd1', 0, 'pasal', 'Pasal 2', NULL, 7, 'baris satu\nbaris ''dua''');\n" +
    "INSERT INTO hukum_segmen (id, dok, urut, jenis, label, bab, halaman, teks) VALUES (2, 'd2', 0, 'pasal', 'Pasal 1', 'BAB I', 8, 'lain');\n"
  const p = bacaSegmen(sql, new Set(['d1']))
  assert.deepEqual(p.get('d1'), [{ label: 'Pasal 2', halaman: 7, teks: "baris satu\nbaris 'dua'" }])
  assert.equal(p.has('d2'), false)
})

// ---- berkas nyata ----------------------------------------------------------------------------------------------

test('G-1 berkas nyata: tiap entri jam_aturan.json berpasal BERLAKU dengan kutipan di pasalnya, atau asumsi bercatatan', () => {
  for (const b of [JAM, KATALOG, SEED]) assert.ok(existsSync(b), `jam-aturan: ${b} tidak terbaca; berkas ini dilacak git, periksa checkout/iCloud`)
  const aturan = JSON.parse(readFileSync(JAM, 'utf8'))
  const katalog = JSON.parse(readFileSync(KATALOG, 'utf8'))
  assert.ok(Array.isArray(aturan) && aturan.length > 0, 'jam-aturan: jam_aturan.json kosong atau bukan larik')
  const kunci = aturan.map((e) => e.kunci)
  assert.deepEqual(kunci.filter((k, i) => kunci.indexOf(k) !== i), [], 'jam-aturan: kunci ganda; satu kunci satu nilai')
  const segmen = bacaSegmen(readFileSync(SEED, 'utf8'), new Set(aturan.map((e) => e.acuan).filter(Boolean)))
  const gagal = aturan.flatMap((e) => periksaEntri(e, katalog, segmen))
  assert.deepEqual(gagal, [], `G-1 gagal pada ${gagal.length} kunci:\n${gagal.join('\n')}`)
})

// Selama RU-008 (meja/pengingat) dan RU-039 (status_pedoman) belum jadi, berkas lama memang merah di sini (tiket RU-007).
// RU-039 mencabut baris pengecualian bertanggal di bawah.
const PENGECUALIAN = { 'public/inti/status_pedoman.js': 'sampai RU-039 (5 Nov 2026): masa status 14 hari/1 bulan/3 bulan masih tertulis di teks' }
test('G-1 berkas nyata: tidak ada angka tenggat tertanam di luar Jam Aturan', () => {
  const pyDir = join(ROOT, 'scripts/bnpb/unit')
  const py = existsSync(pyDir) ? readdirSync(pyDir).filter((f) => f.endsWith('.py')).map((f) => `scripts/bnpb/unit/${f}`) : []
  const daftar = ['src/meja_spek.js', 'src/pengingat.js', 'public/inti/status_pedoman.js', ...py]
  const temuan = daftar.filter((b) => existsSync(join(ROOT, b)))
    .flatMap((b) => pindaiTertanam(b, readFileSync(join(ROOT, b), 'utf8'), PENGECUALIAN))
  assert.deepEqual(temuan, [], `G-1: ${temuan.length} angka tenggat tertanam:\n${temuan.join('\n')}`)
})
