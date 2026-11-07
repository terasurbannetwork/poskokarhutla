// Gerbang G-2 status hukum (RU-005, RENCANA-UJI §3.1 dan §6.1).
//
// Aturan: dokumen yang oleh JDIH masih BERLAKU tetapi teksnya dicabut peraturan lain (dicabut_oleh berisi atau
// status_teks beda dari status) wajib tercatat di `konflik` katalog hukum, dan Jam Aturan tidak boleh bersandar pada
// dokumen semacam itu. Akibat bila dilanggar: layar hukum menampilkan pasal yang sudah dicabut sebagai berlaku.
// Sumber = public/data/bnpb/hukum/katalog.json (dilacak git), BUKAN data/raw/hukum (gitignored).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const katalog = () => JSON.parse(readFileSync(join(ROOT, 'public/data/bnpb/hukum/katalog.json'), 'utf8'))
const jam = () => JSON.parse(readFileSync(join(ROOT, 'public/inti/jam_aturan.json'), 'utf8'))

// ---- pemeriksa murni ---------------------------------------------------------------------------------------------

const terisi = (a) => Array.isArray(a) && a.length > 0

// Nilai status_teks yang dikenal (scripts/bnpb/hukum.py status_menurut_teks). Nilai baru wajib didaftarkan di sini dengan sadar.
const STATUS_TEKS = ['BERLAKU', 'TIDAK BERLAKU', 'DICABUT', 'TIDAK_BISA_DICEK']

// (a) dicabut menurut teks tetapi JDIH BERLAKU wajib di konflik, dengan pencabut yang sama
export function periksaKonflik(kat) {
  const konflik = new Map((kat.konflik || []).map((k) => [k.dok, k]))
  const gagal = []
  for (const d of kat.dok || []) {
    if (d.status_teks != null && !STATUS_TEKS.includes(d.status_teks)) {
      gagal.push(`status-hukum: ${d.id} status_teks "${d.status_teks}" di luar daftar dikenal ${JSON.stringify(STATUS_TEKS)}; status baru harus didaftarkan di gerbang ini dan dipastikan tidak membuat dokumen tercabut tampak berlaku`)
    }
    if (d.status_teks === 'TIDAK_BISA_DICEK' && d.halaman > 0) {
      gagal.push(`status-hukum: ${d.id} TIDAK_BISA_DICEK padahal punya ${d.halaman} halaman isi; status itu hanya untuk dokumen tanpa isi, akibatnya pencabutan di teksnya tak diperiksa. Periksa status_menurut_teks di scripts/bnpb/hukum.py`)
    }
    const dicabut = terisi(d.dicabut_oleh) || d.status_teks === 'DICABUT'
    if (d.status !== 'BERLAKU' || !dicabut) continue
    const k = konflik.get(d.id)
    if (!k) {
      gagal.push(`status-hukum: ${d.id} berstatus JDIH BERLAKU tetapi dicabut ${JSON.stringify(d.dicabut_oleh || [])} (status_teks ${d.status_teks}) dan TIDAK ada di konflik; akibatnya layar menampilkannya berlaku. Bangun ulang katalog: python3 scripts/bnpb/hukum.py urai`)
    } else if (terisi(d.dicabut_oleh) && JSON.stringify([...(k.dicabut_oleh || [])].sort()) !== JSON.stringify([...d.dicabut_oleh].sort())) {
      gagal.push(`status-hukum: ${d.id} di konflik dengan pencabut ${JSON.stringify(k.dicabut_oleh)} tetapi dokumennya mencatat ${JSON.stringify(d.dicabut_oleh)}; dua catatan harus sama`)
    }
  }
  for (const k of kat.konflik || []) {
    if (!(kat.dok || []).some((d) => d.id === k.dok)) gagal.push(`status-hukum: konflik memuat ${k.dok} yang tidak ada di dok katalog; id salah ketik atau katalog basi`)
  }
  return gagal
}

// (b) acuan Jam Aturan bukan dokumen konflik / TIDAK BERLAKU
export function periksaAcuanJam(kat, entri) {
  const konflik = new Set((kat.konflik || []).map((k) => k.dok))
  return entri.filter((e) => e.acuan).flatMap((e) => {
    const d = (kat.dok || []).find((x) => x.id === e.acuan)
    if (!d) return [`status-hukum: Jam Aturan kunci ${e.kunci} mengacu ${e.acuan} yang tidak ada di katalog`]
    if (konflik.has(e.acuan) || d.status !== 'BERLAKU') {
      return [`status-hukum: Jam Aturan kunci ${e.kunci} mengacu ${e.acuan} (${konflik.has(e.acuan) ? 'dicabut menurut teks' : d.status}); tenggat dari pasal tercabut menyesatkan. Pindahkan acuan ke pengganti`]
    }
    return []
  })
}

// (c) kontrol yang wajib tetap berlaku tidak boleh di konflik; (d) pencabutan wajib harus tercatat persis
export function periksaWajib(kat, tetapBerlaku, wajibDicabut) {
  const konflik = new Map((kat.konflik || []).map((k) => [k.dok, k]))
  const gagal = []
  for (const id of tetapBerlaku) {
    if (konflik.has(id)) gagal.push(`status-hukum: ${id} kontrol yang wajib TETAP BERLAKU, tetapi masuk konflik (dicabut ${JSON.stringify(konflik.get(id).dicabut_oleh)}); mesin salah menangkap perubahan/rujukan sebagai pencabutan`)
  }
  for (const [id, pencabut] of Object.entries(wajibDicabut)) {
    const k = konflik.get(id)
    if (!k) gagal.push(`status-hukum: ${id} wajib tercatat dicabut ${pencabut} tetapi tidak ada di konflik; klausul pencabutan tidak tertangkap (jendela _konteks di scripts/bnpb/hukum.py)`)
    else if (!(k.dicabut_oleh || []).includes(pencabut)) gagal.push(`status-hukum: ${id} di konflik tetapi pencabutnya ${JSON.stringify(k.dicabut_oleh)}, seharusnya memuat ${pencabut}`)
  }
  return gagal
}

// ---- bukti bahwa yang salah DITOLAK (fixture) --------------------------------------------------------------------

const FIX = {
  dok: [
    { id: 'a', status: 'BERLAKU', status_teks: 'DICABUT', dicabut_oleh: ['b'] },
    { id: 'b', status: 'BERLAKU', status_teks: 'BERLAKU', dicabut_oleh: [] },
    { id: 'c', status: 'TIDAK BERLAKU', status_teks: 'TIDAK BERLAKU', dicabut_oleh: [] },
  ],
  konflik: [{ dok: 'a', status_jdih: 'BERLAKU', status_teks: 'DICABUT', dicabut_oleh: ['b'] }],
}

test('G-2 pemeriksa: katalog benar lolos', () => {
  assert.deepEqual(periksaKonflik(FIX), [])
  assert.deepEqual(periksaWajib(FIX, ['b'], { a: 'b' }), [])
})

test('G-2 pemeriksa: pencabutan antardokumen BERLAKU yang tak tercatat di konflik ditolak, pesan mencetak pasangan', () => {
  const r = periksaKonflik({ ...FIX, konflik: [] })
  assert.equal(r.length, 1)
  assert.match(r[0], /a berstatus JDIH BERLAKU.*\["b"\].*TIDAK ada di konflik/)
})

test('G-2 pemeriksa: pencabut di konflik beda dari dokumen, id konflik yatim, dan status_teks beda tanpa konflik ditolak', () => {
  assert.match(periksaKonflik({ ...FIX, konflik: [{ dok: 'a', dicabut_oleh: ['z'] }] })[0], /dua catatan harus sama/)
  assert.match(periksaKonflik({ ...FIX, konflik: [...FIX.konflik, { dok: 'hantu', dicabut_oleh: [] }] })[0], /hantu yang tidak ada/)
  const hanyaTeks = { dok: [{ id: 'q', status: 'BERLAKU', status_teks: 'DICABUT', dicabut_oleh: [] }], konflik: [] }
  assert.equal(periksaKonflik(hanyaTeks).length, 1)
})

test('G-2 pemeriksa: TIDAK_BISA_DICEK bukan konflik; DICABUT tanpa konflik tetap ditolak; status asing dan TIDAK_BISA_DICEK ber-isi ditolak', () => {
  const dok = (o) => ({ dok: [{ id: 'x', status: 'BERLAKU', status_teks: 'BERLAKU', dicabut_oleh: [], halaman: 3, ...o }], konflik: [] })
  assert.deepEqual(periksaKonflik(dok({ status_teks: 'TIDAK_BISA_DICEK', halaman: 0 })), [])
  assert.equal(periksaKonflik(dok({ status_teks: 'DICABUT' })).length, 1)
  assert.match(periksaKonflik(dok({ status_teks: 'BARU_ANEH' }))[0], /x status_teks "BARU_ANEH" di luar daftar/)
  assert.match(periksaKonflik(dok({ status_teks: 'TIDAK_BISA_DICEK' }))[0], /x TIDAK_BISA_DICEK padahal punya 3 halaman/)
})

test('G-2 pemeriksa: acuan Jam Aturan ke dokumen konflik, TIDAK BERLAKU, atau tak terdaftar ditolak', () => {
  assert.deepEqual(periksaAcuanJam(FIX, [{ kunci: 'k1', acuan: 'b' }, { kunci: 'k2', acuan: null }]), [])
  assert.match(periksaAcuanJam(FIX, [{ kunci: 'k', acuan: 'a' }])[0], /dicabut menurut teks/)
  assert.match(periksaAcuanJam(FIX, [{ kunci: 'k', acuan: 'c' }])[0], /TIDAK BERLAKU/)
  assert.match(periksaAcuanJam(FIX, [{ kunci: 'k', acuan: 'x' }])[0], /tidak ada di katalog/)
})

test('G-2 pemeriksa: kontrol tetap-berlaku di konflik dan pencabutan wajib yang hilang ditolak', () => {
  assert.match(periksaWajib(FIX, ['a'], {})[0], /a kontrol yang wajib TETAP BERLAKU/)
  assert.match(periksaWajib(FIX, [], { b: 'a' })[0], /b wajib tercatat dicabut a/)
  assert.match(periksaWajib(FIX, [], { a: 'z' })[0], /pencabutnya \["b"\], seharusnya memuat z/)
})

// ---- berkas nyata ------------------------------------------------------------------------------------------------

test('G-2 katalog nyata: tiap dokumen dicabut menurut teks tetapi BERLAKU di JDIH ada di konflik dengan pencabut sama', () => {
  const kat = katalog()
  assert.ok(Array.isArray(kat.konflik) && kat.konflik.length > 0, 'status-hukum: kunci konflik hilang/kosong di katalog.json; bangun ulang: python3 scripts/bnpb/hukum.py urai')
  const gagal = periksaKonflik(kat)
  assert.deepEqual(gagal, [], `G-2 gagal pada ${gagal.length} dokumen:\n${gagal.join('\n')}`)
})

test('G-2 katalog nyata: tidak ada acuan Jam Aturan yang berstatus konflik atau TIDAK BERLAKU', () => {
  const gagal = periksaAcuanJam(katalog(), jam())
  assert.deepEqual(gagal, [], `G-2: ${gagal.length} acuan Jam Aturan bermasalah:\n${gagal.join('\n')}`)
})

test('G-2 katalog nyata: kontrol tetap BERLAKU tidak di konflik; perban-6-2021 dicabut perban-4-2025, perka-4-2008 dicabut perban-3-2026', () => {
  const gagal = periksaWajib(katalog(), ['perban-6-2025', 'perban-4-2020'], { 'perban-6-2021': 'perban-4-2025', 'perka-4-2008': 'perban-3-2026' })
  assert.deepEqual(gagal, [], `G-2: ${gagal.length} pelanggaran:\n${gagal.join('\n')}`)
})

test('G-2 katalog nyata: 13 dokumen wajib-dicabut RU §3.1 semuanya di konflik', () => {
  const wajib = ['perka-1-2012', 'perka-7-2015', 'perka-4-2008', 'perka-4-2016', 'perban-6-2021', 'perban-7-2021', 'perban-1-2022', 'perban-2-2022', 'perban-4-2019', 'perban-5-2020', 'perka-8-2014', 'perban-2-2019', 'perka-17-2010']
  const ada = new Set(katalog().konflik.map((k) => k.dok))
  const hilang = wajib.filter((id) => !ada.has(id))
  assert.deepEqual(hilang, [], `G-2: ${hilang.length} dokumen wajib-dicabut tidak di konflik: ${hilang.join(', ')}; klausul pencabutan tidak tercatat oleh hukum.py`)
})
