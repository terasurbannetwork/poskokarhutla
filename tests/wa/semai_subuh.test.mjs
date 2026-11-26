// SA-24: teks ringkasan subuh, jendela data basi, idempotensi, galat hanya ke PEMILIK. Pengirim tiruan; tidak ada WA sungguhan.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const { susun, jalankan, basi, teksBelumAda } = await import('../../scripts/wa/semai_subuh.mjs')

const WIB = (iso) => Date.parse(iso + '+07:00')
const data = { dibuat: '2026-11-25T22:20:00Z', putaran: { init: '2026-11-25T12:00:00Z' }, api: { n_cluster: 4, frp_mw: 6231 },
  zona: [{ huruf: 'A', lat: -1.4, lon: 115.3, skor: 0.74, jendela: ['2026-11-26T06:00Z', '2026-11-26T09:00Z'], zona_waktu: 'WIB', prov: 'Kalimantan Tengah', ketinggian_kaki: 3500, bahan: 'NaCl' }],
  asap: { lintas: { negara: 'TL', jam: '2026-11-26T09:00Z', tiba_jam: 24, kota: 'Dili' }, kota: [] } }
const KINI = WIB('2026-11-26T05:15:00')

test('teks: zona teratas, jendela, ketinggian, bahan, Perlu tindakan untuk asap lintas batas, kalimat batas', () => {
  const t = susun(data, KINI)
  assert.match(t, /Kalimantan Tengah, sekitar -1.5, 115.5, 13\.00 sampai 16\.00 WIB; ketinggian sekitar 3\.500 kaki/)
  assert.match(t, /bahan NaCl/)
  assert.match(t, /Api: 4 cluster besar, 6\.231 MW/)
  assert.match(t, /Perlu tindakan: asap menyeberang ke Timor-Leste sekitar 24 jam lagi, kota terdekat Dili/)
  assert.match(t, /Usulan mesin, bukan prakiraan resmi\. Konfirmasi tiap operasi dengan BMKG\.$/)
  assert.doesNotMatch(t, /akan hujan|memadamkan|aman|·|—/i)
})
test('koordinat: blok mitra dipakai; tanpa blok dibulatkan 0,5; tidak ada koordinat 3 desimal', () => {
  const z = data.zona[0]
  assert.match(susun({ ...data, zona: [{ ...z, mitra: { lat: -1.0, lon: 115.0 } }] }, KINI), /sekitar -1\.0, 115\.0,/)
  assert.match(susun({ ...data, zona: [{ ...z, lat: -4.6, lon: 121.9 }] }, KINI), /sekitar -4\.5, 122\.0,/)
  assert.doesNotMatch(susun(data, KINI), /-?\d+[.,]\d{3}(?!\d)(?=,|\s*$)/m)
})
test('tanpa asap lintas batas: tanpa Perlu tindakan; tanpa zona: kalimat kosong, bukan 0', () => {
  const t = susun({ ...data, asap: { lintas: null, kota: [] }, zona: [], alasan_kosong: 'tidak_ada_awan' }, KINI)
  assert.doesNotMatch(t, /Perlu tindakan/)
  assert.match(t, /Tidak ada awan layak semai yang hanyut ke api/)
  assert.match(t, /belum menyeberang ke negara lain/)
  assert.doesNotMatch(susun({ ...data, asap: null }, KINI), /Perlu tindakan/)
})
test('basi: lebih dari 9 jam', () => {
  assert.equal(basi(data, KINI), false)
  assert.equal(basi({ ...data, dibuat: '2026-11-25T10:10:00Z' }, KINI), true)
  assert.equal(basi({}, KINI), true)
})

const mulai = (api) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'subuh-')), kirim = []
  return { kirim, berkas: path.join(dir, 's.json'), env: { PENERIMA_SEMAI: '12345-1@g.us', PEMILIK: '6281200000000' },
    dep: { api, kirimTeks: async (t, m) => { kirim.push([t, m]) } } }
}
const ok = async () => ({ status: 200, json: data })

test('kirim sekali per hari, ke grup saja', async () => {
  const x = mulai(ok)
  assert.equal((await jalankan({ ...x, kini: KINI })).status, 'terkirim')
  assert.equal((await jalankan({ ...x, kini: KINI + 600e3 })).status, 'sudah terkirim')
  assert.deepEqual(x.kirim.map((k) => k[0]), ['12345-1@g.us'])
})
test('mati bila PENERIMA_SEMAI kosong; --kering tidak mengirim dan tidak menulis state', async () => {
  const x = mulai(ok)
  assert.equal((await jalankan({ ...x, env: {}, kini: KINI })).status, 'mati')
  assert.equal((await jalankan({ ...x, kering: true, kini: KINI, log: () => {} })).status, 'kering')
  assert.equal(x.kirim.length, 0); assert.equal(fs.existsSync(x.berkas), false)
})
test('data basi: menunggu sebelum 06.30, sesudahnya kirim kalimat belum tersedia sekali', async () => {
  const x = mulai(async () => ({ status: 200, json: { ...data, dibuat: '2026-11-25T10:10:00Z' } }))
  assert.equal((await jalankan({ ...x, kini: KINI })).status, 'tunggu'); assert.equal(x.kirim.length, 0)
  const akhir = WIB('2026-11-26T06:45:00')
  assert.equal((await jalankan({ ...x, kini: akhir })).status, 'terkirim')
  assert.equal(x.kirim[0][1], teksBelumAda(akhir))
  assert.equal((await jalankan({ ...x, kini: akhir + 1 })).status, 'sudah terkirim')
})
test('galat: PEMILIK dikabari sekali, grup tidak; hari berikut dicoba lagi', async () => {
  const x = mulai(async () => ({ status: 500, json: {} }))
  const l = () => {}
  assert.equal((await jalankan({ ...x, kini: KINI, log: l })).status, 'galat')
  await jalankan({ ...x, kini: KINI + 1800e3, log: l })
  assert.deepEqual(x.kirim.map((k) => k[0]), ['6281200000000'])
  assert.match(x.kirim[0][1], /gagal: semai\.json HTTP 500/)
})
