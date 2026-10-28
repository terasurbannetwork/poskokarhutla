// Gerbang jalur mutlak (28 Okt 2026, aturan pemilik).
//
// ATURAN: berkas yang dilacak git tidak memuat jalur absolut mesin lokal.
// Jalur di DALAM proyek hanya boleh relatif; jalur di LUAR proyek (Playwright,
// Chromium, dst.) dibaca dari variabel lingkungan, mis. PLAYWRIGHT_MJS.
//
// Pola terlarang (satu regex, POLA di bawah):
//   /Users/<huruf>          folder rumah macOS (placeholder `/Users/...` lolos)
//   -Users-<huruf>          nama folder sandi Claude (garis miring jadi minus),
//                           mis. ~/.claude/projects/-Users-<nama>-proyek
//   /private/(tmp|var)/     folder sementara macOS
// SENGAJA tidak dilarang: `/home/...` (rute situs dan /home/runner milik GitHub),
// `/tmp/...` polos (skrip memakainya sebagai buram), `file:///` polos (skrip
// siklon.py menguji URL file:///etc/passwd). Semuanya terverifikasi sah di repo.
//
// CAKUPAN: semua berkas dari `git ls-files`, isi di working tree. Teks dipindai
// per baris; berkas yang punya byte NUL di 8000 byte pertama dilewati seperti
// `git grep -I`. Berkas .pptx/.docx/.xlsx (dan .zip) dibuka lewat daftar isi zip
// + node:zlib, tanpa dependensi, dan tiap entri teksnya dipindai, termasuk zip
// bersarang; sebab teks alternatif gambar di slide (`descr="..."`) menyimpan
// jalur lokal. Entri zip yang tak bisa dibaca (metode kompresi selain 0/8,
// terenkripsi, zip64) MENGGAGALKAN uji dengan lantang, bukan dilewati diam-diam.
// Berkas uji ini dan fixture-nya tidak dipindai (keduanya MEMUAT pola).
//
// PEMILIK JALUR: tiap hit dikunci ke nama pemilik jalurnya, yaitu <nama> dari
// `/Users/<nama>` atau `-Users-<nama>` (berhenti di `-` atau `/` berikutnya).
// `/private/(tmp|var)/` yang tak diikuti bagian Users dalam jalur yang sama
// tidak punya nama dan masuk satu kunci tetap, TANPA_NAMA.
//
// SATUAN HITUNG, per (berkas, nama) (kunci ratchet):
//   * berkas teks   = jumlah BARIS yang memuat nama itu (satu baris dengan dua
//     nama dihitung sekali untuk masing-masing);
//   * zip/Office    = jumlah KEMUNCULAN pola, dijumlah dari semua entri teks.
//     XML Office umumnya satu baris panjang, jadi menghitung baris tak berarti;
//     kemunculan membuat satu jalur tambahan di slide yang sama tetap ketahuan.
//     Lokasi di pesan gagal ditulis `berkas.pptx!ppt/slides/slide3.xml:2`.
//
// RATCHET: tests/agen/fixtures/jalur-mutlak-sisa.json = {berkas: {nama: jumlah}}
// untuk jalur milik ORANG LAIN yang belum dibersihkan. Daftar itu hanya boleh
// MENYUSUT:
//   (a) berkas di luar daftar punya hit, ATAU berkas di daftar punya nama yang
//       tidak ada di entrinya (mengganti `/Users/orang-lain` dengan nama sendiri
//       bukan pembersihan, itu pemilik baru)              -> gagal
//   (b) hit satu (berkas, nama) melebihi angkanya        -> gagal
//   (c) hit satu (berkas, nama) kurang dari angkanya / nama atau berkas sudah
//       bersih / berkas hilang -> gagal, minta angkanya diturunkan atau entrinya
//       dicabut; kalau tidak, ada ruang kosong untuk jalur baru yang lolos.
// Daftar itu disunting TANGAN. Jangan pernah dibangkitkan ulang otomatis:
// itu mengubah gerbang menjadi stempel.
//
// Hanya builtin Node (CI menjalankan ini tanpa `npm ci`).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { closeSync, lstatSync, openSync, readFileSync, readSync, readlinkSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync, inflateRawSync } from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BERKAS_UJI = 'tests/agen/gerbang-jalur-mutlak.test.mjs'
const BERKAS_SISA = 'tests/agen/fixtures/jalur-mutlak-sisa.json'
const DILEWATI = new Set([BERKAS_UJI, BERKAS_SISA])

// Grup 1 = nama pemilik; tak terisi berarti cocok pada /private/(tmp|var)/.
const POLA = /(?:\/Users\/|-Users-)([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)|\/private\/(?:tmp|var)\//
const BAGIAN_PEMILIK = /(?:\/Users\/|-Users-)[A-Za-z]/
const TANPA_NAMA = '(tanpa-nama)'
const ZIP = /\.(?:pptx|docx|xlsx|zip)$/i
const BATAS_BINER = 8000 // seperti buffer_is_binary milik git
const BATAS_ISI_ZIP = 256 * 1024 * 1024 // pagar zip bomb per entri
const BATAS_BARIS_LAPOR = 12 // baris per (berkas, nama) di pesan gagal

// --- mesin pindai ----------------------------------------------------------

const biner = (buf) => buf.subarray(0, BATAS_BINER).includes(0)

// Saringan murah di atas byte mentah: tiga kemungkinan awal pola. Berkas yang
// tak memuatnya tidak perlu didekode atau dipindai regex (kebanyakan berkas).
const AWAL_POLA = ['/Users/', '-Users-', '/private/'].map((s) => Buffer.from(s))
const mungkin = (buf) => AWAL_POLA.some((a) => buf.includes(a))

// Byte NUL di BATAS_BINER byte pertama berkas, tanpa membaca seluruh berkas
// (separuh lebih isi repo adalah PDF/PNG/data biner besar).
function binerDiDisk(abs) {
  const fd = openSync(abs, 'r')
  try {
    const kepala = Buffer.alloc(BATAS_BINER)
    const n = readSync(fd, kepala, 0, BATAS_BINER, 0)
    return kepala.subarray(0, n).includes(0)
  } finally {
    closeSync(fd)
  }
}

function cuplikan(teks, idx, panjang) {
  const a = Math.max(0, idx - 40)
  const z = Math.min(teks.length, idx + panjang + 60)
  const isi = teks.slice(a, z).replace(/\s+/g, ' ').trim()
  return `${a > 0 ? '...' : ''}${isi}${z < teks.length ? '...' : ''}`
}

// Semua kemunculan pola di teks, tiap satu dengan nama pemiliknya. Cocokan
// /private/(tmp|var)/ yang jalurnya masih memuat bagian Users dilewati: jalur
// itu sudah dihitung atas nama pemilik lewat cocokan Users-nya sendiri.
function kejadian(teks) {
  const hasil = []
  const re = new RegExp(POLA.source, 'g')
  let m
  while ((m = re.exec(teks))) {
    let nama = m[1]
    if (nama === undefined) {
      const ekor = teks.slice(re.lastIndex, re.lastIndex + 300).match(/^[^\s"'`)\]>]*/)[0]
      if (BAGIAN_PEMILIK.test(ekor)) continue
      nama = TANPA_NAMA
    }
    hasil.push({ index: m.index, panjang: m[0].length, nama })
  }
  return hasil
}

// Satuan teks: satu hit = satu (baris, nama).
function hitBaris(teks, tempat) {
  if (!POLA.test(teks)) return []
  const hasil = []
  const baris = teks.split('\n')
  for (let i = 0; i < baris.length; i++) {
    if (!POLA.test(baris[i])) continue
    const kejadianBaris = kejadian(baris[i])
    if (!kejadianBaris.length) throw new Error(`${tempat}:${i + 1} cocok pola tetapi tanpa pemilik (cacat gerbang)`)
    const dilihat = new Set()
    for (const k of kejadianBaris) {
      if (dilihat.has(k.nama)) continue
      dilihat.add(k.nama)
      hasil.push({ tempat, baris: i + 1, nama: k.nama, cuplikan: cuplikan(baris[i], k.index, k.panjang) })
    }
  }
  return hasil
}

// Satuan zip: satu hit = satu kemunculan pola.
function hitKemunculan(teks, tempat) {
  if (!POLA.test(teks)) return []
  const hasil = []
  let baris = 1
  let pos = 0
  for (const k of kejadian(teks)) {
    for (;;) {
      const nl = teks.indexOf('\n', pos)
      if (nl === -1 || nl >= k.index) break
      baris++
      pos = nl + 1
    }
    hasil.push({ tempat, baris, nama: k.nama, cuplikan: cuplikan(teks, k.index, k.panjang) })
  }
  return hasil
}

// Daftar isi zip lewat central directory. null = bukan zip.
// Entri yang tak bisa dibaca MELEMPAR: dilewati diam-diam berarti lubang di gerbang.
function bacaZip(buf) {
  let e = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      e = i
      break
    }
  }
  if (e < 0) return null
  const jumlah = buf.readUInt16LE(e + 10)
  let p = buf.readUInt32LE(e + 16)
  if (jumlah === 0xffff || p === 0xffffffff) throw new Error('zip64 tidak didukung gerbang ini')
  const entri = []
  for (let i = 0; i < jumlah; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('central directory zip rusak')
    const bendera = buf.readUInt16LE(p + 8)
    const metode = buf.readUInt16LE(p + 10)
    const ukuran = buf.readUInt32LE(p + 20)
    const lNama = buf.readUInt16LE(p + 28)
    const lEkstra = buf.readUInt16LE(p + 30)
    const lKomentar = buf.readUInt16LE(p + 32)
    const lokal = buf.readUInt32LE(p + 42)
    const nama = buf.toString('utf8', p + 46, p + 46 + lNama)
    p += 46 + lNama + lEkstra + lKomentar
    if (nama.endsWith('/')) continue // folder
    if (bendera & 1) throw new Error(`entri terenkripsi tak bisa dipindai: ${nama}`)
    if (buf.readUInt32LE(lokal) !== 0x04034b50) throw new Error(`header lokal zip rusak: ${nama}`)
    const awal = lokal + 30 + buf.readUInt16LE(lokal + 26) + buf.readUInt16LE(lokal + 28)
    const data = buf.subarray(awal, awal + ukuran)
    if (metode === 0) entri.push({ nama, isi: data })
    else if (metode === 8) entri.push({ nama, isi: inflateRawSync(data, { maxOutputLength: BATAS_ISI_ZIP }) })
    else throw new Error(`metode kompresi ${metode} pada entri ${nama} tidak didukung (hanya 0 dan 8); tambahkan dukungannya di bacaZip`)
  }
  return entri
}

function hitZip(buf, tempat) {
  const entri = bacaZip(buf)
  if (entri === null) return null
  const hasil = []
  for (const { nama, isi } of entri) {
    const di = `${tempat}!${nama}`
    if (ZIP.test(nama)) {
      const dalam = hitZip(isi, di)
      if (dalam !== null) {
        hasil.push(...dalam)
        continue
      }
    }
    if (mungkin(isi) && !biner(isi)) hasil.push(...hitKemunculan(isi.toString('utf8'), di))
  }
  return hasil
}

// null = berkas tidak ada di working tree (terlacak tetapi terhapus).
function pindaiBerkas(rel) {
  const abs = resolve(ROOT, rel)
  let st
  try {
    st = lstatSync(abs)
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
  if (st.isSymbolicLink()) return hitBaris(readlinkSync(abs), rel) // target tautan = jalur
  if (!st.isFile()) return [] // submodule / folder
  if (ZIP.test(rel)) {
    let zip
    try {
      zip = hitZip(readFileSync(abs), rel)
    } catch (err) {
      throw new Error(`gerbang jalur mutlak tidak bisa membuka zip ${rel}: ${err.message}`)
    }
    if (zip !== null) return zip
  }
  if (binerDiDisk(abs)) return []
  const buf = readFileSync(abs)
  return mungkin(buf) ? hitBaris(buf.toString('utf8'), rel) : []
}

function perNama(hits) {
  const peta = new Map()
  for (const h of hits) {
    if (!peta.has(h.nama)) peta.set(h.nama, [])
    peta.get(h.nama).push(h)
  }
  return peta
}

let _pindai
// { hit: Map<berkas, Map<nama, [{tempat, baris, nama, cuplikan}]>> (hanya berkas yang punya hit),
//   ada: Set<berkas> }
function pindai() {
  if (_pindai) return _pindai
  const daftar = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 })
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((f) => !DILEWATI.has(f))
  const hit = new Map()
  const ada = new Set()
  for (const f of daftar) {
    const h = pindaiBerkas(f)
    if (h === null) continue
    ada.add(f)
    if (h.length) hit.set(f, perNama(h))
  }
  return (_pindai = { hit, ada })
}

function sisa() {
  return JSON.parse(readFileSync(resolve(ROOT, BERKAS_SISA), 'utf8'))
}

const urut = ([a], [b]) => (a < b ? -1 : 1)
const jumlahHit = (hit, f, nama) => hit.get(f)?.get(nama)?.length ?? 0

function lokasi(hits) {
  const baris = hits.slice(0, BATAS_BARIS_LAPOR).map((h) => `        ${h.tempat}:${h.baris}  ${h.cuplikan}`)
  if (hits.length > BATAS_BARIS_LAPOR) baris.push(`        ... dan ${hits.length - BATAS_BARIS_LAPOR} hit lain`)
  return baris.join('\n')
}

const PERBAIKI =
  'CARA MEMPERBAIKI: tulis jalur di dalam repo secara RELATIF (dari akar repo, atau dari berkasnya ' +
  'sendiri lewat import.meta.url / __file__); jalur di luar repo (Playwright, Chromium, dst.) dibaca ' +
  'dari variabel lingkungan, mis. PLAYWRIGHT_MJS. Placeholder `/Users/...` aman.'

// --- uji --------------------------------------------------------------------

test('pola: jalur lokal terlarang, jalur sah dibiarkan', () => {
  const terlarang = [
    '/Users/hhizari/WebProjects/x',
    'cd /Users/a/b',
    '/private/tmp/claude-501/-Users-x-proyek/s',
    '~/.claude/projects/-Users-x-proyek/memory',
    '/private/var/folders/ab/cd',
    '/private/tmp/x',
  ]
  const sah = [
    '/Users/...',
    '/home/runner/work/x',
    '/home/detailPaketPenyediaPublic2017',
    '/tmp/sippa',
    'file:///etc/passwd',
    '/usr/local/bin/node',
    'Users/x',
    '/var/log',
  ]
  assert.deepEqual(terlarang.filter((s) => !POLA.test(s)), [], 'pola gagal menangkap jalur lokal')
  assert.deepEqual(sah.filter((s) => POLA.test(s)), [], 'pola salah menangkap jalur sah (jangan diperluas tanpa alasan)')
})

test('pola: nama pemilik jalur diambil sampai "-" atau "/" berikutnya', () => {
  const tabel = [
    ['/Users/hhizari/WebProjects/x', ['hhizari']],
    ['-Users-hhizari-WebProjects-poskokarhutla', ['hhizari']],
    ['/Users/priyankaalfatehan28/.claude/skills', ['priyankaalfatehan28']],
    ['/private/tmp/claude-501/-Users-x-proyek/s', ['x']], // jalur bernama: satu hit saja, bukan dua
    ['/private/var/folders/ab/cd', [TANPA_NAMA]],
    ['/private/tmp/x', [TANPA_NAMA]],
    ['/Users/john.doe/x lalu /Users/ani/y', ['john.doe', 'ani']],
    ['/Users/a/b dan /private/tmp/y', ['a', TANPA_NAMA]],
    ['/private/tmp/a/Users-x', [TANPA_NAMA]], // "Users-x" tanpa minus di depan bukan bagian pemilik
  ]
  const salah = tabel
    .map(([teks, harap]) => [teks, harap, kejadian(teks).map((k) => k.nama)])
    .filter(([, harap, dapat]) => JSON.stringify(harap) !== JSON.stringify(dapat))
  assert.deepEqual(salah, [], 'nama pemilik jalur salah terbaca: [teks, diharapkan, didapat]')
})

// Zip satu entri buatan tangan (tanpa CRC; pembaca gerbang ini tak memeriksanya).
function zipMini(nama, metode, data, bendera = 0) {
  const n = Buffer.from(nama)
  const lokal = Buffer.alloc(30)
  lokal.writeUInt32LE(0x04034b50, 0)
  lokal.writeUInt16LE(metode, 8)
  lokal.writeUInt32LE(data.length, 18)
  lokal.writeUInt16LE(n.length, 26)
  const pusat = Buffer.alloc(46)
  pusat.writeUInt32LE(0x02014b50, 0)
  pusat.writeUInt16LE(bendera, 8)
  pusat.writeUInt16LE(metode, 10)
  pusat.writeUInt32LE(data.length, 20)
  pusat.writeUInt16LE(n.length, 28)
  const ujung = Buffer.alloc(22)
  ujung.writeUInt32LE(0x06054b50, 0)
  ujung.writeUInt16LE(1, 8)
  ujung.writeUInt16LE(1, 10)
  ujung.writeUInt32LE(46 + n.length, 12)
  ujung.writeUInt32LE(30 + n.length + data.length, 16)
  return Buffer.concat([lokal, n, data, pusat, n, ujung])
}

test('pembaca zip: metode 0 dan 8 terbaca; metode lain atau terenkripsi menggagalkan dengan lantang', () => {
  const isi = Buffer.from('<a descr="/Users/siapa/x"/>\n')
  assert.equal(bacaZip(zipMini('a.xml', 0, isi))[0].isi.toString(), isi.toString())
  assert.equal(bacaZip(zipMini('a.xml', 8, deflateRawSync(isi)))[0].isi.toString(), isi.toString())
  const hit = hitZip(zipMini('ppt/slides/s1.xml', 8, deflateRawSync(isi)), 'k.pptx')
  assert.deepEqual(hit.map((h) => [h.tempat, h.baris, h.nama]), [['k.pptx!ppt/slides/s1.xml', 1, 'siapa']])
  assert.throws(() => bacaZip(zipMini('a.xml', 12, Buffer.from('xx'))), /metode kompresi 12/, 'metode asing dilewati diam-diam')
  assert.throws(() => bacaZip(zipMini('a.xml', 0, isi, 1)), /terenkripsi/, 'entri terenkripsi dilewati diam-diam')
  assert.equal(bacaZip(Buffer.from('bukan zip sama sekali')), null)
})

test('daftar sisa: bentuk benar, tidak memuat berkas yang dikecualikan', () => {
  const salah = []
  for (const [f, namaHit] of Object.entries(sisa())) {
    if (DILEWATI.has(f)) salah.push(`${f}: berkas uji ini / fixture-nya tak boleh ada di daftar`)
    if (!namaHit || typeof namaHit !== 'object' || Array.isArray(namaHit) || !Object.keys(namaHit).length) {
      salah.push(`${f}: harus objek {nama: jumlah} yang tidak kosong`)
      continue
    }
    for (const [nama, n] of Object.entries(namaHit)) {
      if (!nama || !Number.isInteger(n) || n < 1) salah.push(`${f} -> "${nama}": jumlah harus bilangan bulat >= 1`)
    }
  }
  assert.deepEqual(salah, [], `${BERKAS_SISA} harus {berkas: {nama: jumlah hit bulat >= 1}}`)
})

test('berkas dan pemilik jalur di luar daftar sisa bebas jalur mutlak', () => {
  const { hit } = pindai()
  const s = sisa()
  const baru = []
  for (const [f, peta] of hit) {
    const entri = Object.hasOwn(s, f) ? s[f] : {}
    const asing = [...peta].filter(([nama]) => !Object.hasOwn(entri, nama)).sort(urut)
    if (asing.length) baru.push([f, asing, Object.keys(entri)])
  }
  if (!baru.length) return
  baru.sort(urut)
  const rinci = baru
    .map(([f, asing, dikenal]) => {
      const kepala = dikenal.length
        ? `  ${f}  (nama baru di berkas daftar sisa; entri daftar sisa: ${dikenal.join(', ')})`
        : `  ${f}  (berkas baru)`
      const isi = asing.map(([nama, h]) => `      nama "${nama}": ${h.length} hit\n${lokasi(h)}`).join('\n')
      return `${kepala}\n${isi}`
    })
    .join('\n')
  assert.fail(
    `\nJALUR MUTLAK BARU di ${baru.length} berkas yang tidak ada di ${BERKAS_SISA} (berkas atau nama pemilik):\n${rinci}\n` +
      'SEBAB: berkas terlacak git memuat jalur absolut mesin lokal (/Users/<nama>/..., -Users-<nama>-..., /private/tmp|var/...).\n' +
      'AKIBAT: jalur itu hanya ada di satu mesin, jadi skrip gagal di CI dan mesin lain, dan nama folder rumah ikut bocor ke repo.\n' +
      `${PERBAIKI}\n` +
      'Mengganti nama pemilik (mis. membangkitkan ulang berkas di mesin sendiri) BUKAN pembersihan: itu pemilik baru. ' +
      'Jangan menambah berkas atau nama ke daftar sisa: daftar itu hanya boleh menyusut. ' +
      'Berkas yang cuma dipindah/di-rename dari entri daftar sisa: pindahkan entrinya, angkanya tidak boleh naik.',
  )
})

test('berkas di daftar sisa tidak menambah jalur mutlak', () => {
  const { hit } = pindai()
  const naik = []
  for (const [f, namaHit] of Object.entries(sisa()).sort(urut)) {
    for (const [nama, n] of Object.entries(namaHit).sort(urut)) {
      const sekarang = jumlahHit(hit, f, nama)
      if (sekarang > n) naik.push(`  ${f}  nama "${nama}": daftar sisa ${n}, sekarang ${sekarang}\n${lokasi(hit.get(f).get(nama))}`)
    }
  }
  if (!naik.length) return
  assert.fail(
    `\nJALUR MUTLAK BERTAMBAH di ${naik.length} (berkas, nama) daftar sisa:\n${naik.join('\n')}\n` +
      'SEBAB: berkas yang sudah punya jalur lokal menambah jalur lokal lagi.\n' +
      'AKIBAT: utang bertambah padahal daftar sisa hanya boleh menyusut.\n' +
      `${PERBAIKI} Angka di ${BERKAS_SISA} tidak dinaikkan.`,
  )
})

test('daftar sisa hanya menyusut: entri yang turun, bersih, atau hilang dicabut', () => {
  const { hit, ada } = pindai()
  const usang = []
  for (const [f, namaHit] of Object.entries(sisa()).sort(urut)) {
    if (!ada.has(f)) {
      usang.push(`  ${f}: berkas sudah tidak ada -> cabut entrinya`)
      continue
    }
    if (!hit.has(f)) {
      usang.push(`  ${f}: sudah bersih -> cabut entrinya`)
      continue
    }
    for (const [nama, n] of Object.entries(namaHit).sort(urut)) {
      const sekarang = jumlahHit(hit, f, nama)
      if (sekarang === 0) usang.push(`  ${f}  nama "${nama}": sudah bersih (daftar sisa ${n}) -> cabut nama itu dari entrinya`)
      else if (sekarang < n) usang.push(`  ${f}  nama "${nama}": turun dari ${n} ke ${sekarang} -> turunkan angkanya jadi ${sekarang}`)
    }
  }
  if (!usang.length) return
  assert.fail(
    `\nDAFTAR SISA USANG di ${usang.length} entri:\n${usang.join('\n')}\n` +
      `SEBAB: ${BERKAS_SISA} masih mencatat jalur lokal yang sudah dibersihkan atau berkasnya hilang.\n` +
      'AKIBAT: selisihnya jadi ruang kosong; jalur baru di berkas itu lolos tanpa ketahuan.\n' +
      'CARA MEMPERBAIKI: sunting daftar itu dengan tangan (turunkan angka / hapus nama atau berkas). ' +
      'Jangan dibangkitkan ulang otomatis dan jangan pernah dinaikkan.',
  )
})
