// G5: pengurai + draf + pencocokan + saringan HP/nama + bentuk body sama dengan validasi server (periksaEntri). Tanpa jaringan, tanpa WA.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { saring, buatDraf, badanEntri, badanKejadian, cocok, ringkas, parseBalasan, terapKoreksi, masuk, cariKab, arah, kepalaApi, depBawaan } from '../../scripts/wa/logbook_wa.mjs'
import { tolakOrigin } from '../../src/worker.js'
import { periksaEntri } from '../../src/logbook.js'

const AKAR = path.resolve(import.meta.dirname, '..', '..')
const kab = JSON.parse(fs.readFileSync(path.join(AKAR, 'public/data/bnpb/wilayah.json'), 'utf8')).kab
const urai = (t) => JSON.parse(execFileSync('python3', [path.join(AKAR, 'scripts/wa/urai_laporan.py')], { input: t, encoding: 'utf8' }))
const KINI = Date.parse('2026-10-27T03:00:00Z')
const L = (judul, tgl, lok, dampak, extra = '') => [judul, `Hari/Tanggal: ${tgl}`, lok, dampak, extra].filter(Boolean).join('\n')

// 22 laporan sintetis (tanpa data pribadi). harap = medan yang HARUS terbaca persis.
const CONTOH = [
  [L('LAPORAN KEJADIAN BANJIR', 'Senin, 26 Oktober 2026 pukul 14.30 WIB', 'Lokasi: Desa Sukamaju, Kec. Cibatu, Kab. Garut, Prov. Jawa Barat', 'Dampak: 120 KK terdampak, 350 jiwa mengungsi, 45 rumah terendam, 2 rumah rusak berat, 1 orang meninggal dunia.', 'Kendala: akses jalan terputus, listrik padam.\nKebutuhan: makanan siap saji, tenda, selimut, perahu karet.\nSumber: BPBD Kab. Garut'),
    { jenis: 'banjir', kab_nama: 'Garut', kec: 'Cibatu', desa: 'Sukamaju', mulai: '2026-10-26T14:30', md: 1, mengungsi_jiwa: 350, mengungsi_kk: 120, rumah_rb: 2, rumah_terendam: 45, sumber_instansi: 'BPBD Kab. Garut' }],
  [L('Banjir', 'Minggu, 25 Oktober 2026 pukul 19.00 WIB', 'Kab. Demak\nProv. Jawa Tengah\nKec. Sayung', '75 KK terdampak, 210 jiwa mengungsi, 30 rumah terendam'),
    { jenis: 'banjir', kab_nama: 'Demak', kec: 'Sayung', mengungsi_kk: 75, mengungsi_jiwa: 210, rumah_terendam: 30 }],
  [L('Tanah Longsor', 'Sabtu, 24 Oktober 2026 pukul 03.15 WIB', 'Desa Cikadu, Kec. Cijulang, Kab. Pangandaran, Prov. Jawa Barat', '3 orang meninggal dunia, 2 orang luka, 5 rumah rusak berat, 8 rumah rusak ringan', 'Kendala: akses jalan tertutup material longsor, alat berat belum tiba'),
    { jenis: 'longsor', kab_nama: 'Pangandaran', kec: 'Cijulang', desa: 'Cikadu', md: 3, luka: 2, rumah_rb: 5, rumah_rr: 8 }],
  [L('Kebakaran Hutan dan Lahan', 'Selasa, 27 Oktober 2026 pukul 10.00 WIB', 'Desa Sungai Rambutan, Kec. Indralaya, Kab. Ogan Ilir, Prov. Sumatera Selatan', 'Luas terbakar sekitar 12 ha lahan gambut', 'Kendala: sumber air terbatas, lahan gambut sulit dipadamkan'),
    { jenis: 'karhutla', kab_nama: 'Ogan Ilir', kec: 'Indralaya', luas_ha: 12 }],
  [L('Puting Beliung', 'Jumat, 23 Oktober 2026 pukul 16.45 WIB', 'Desa Mekarsari, Kec. Tambun Selatan, Kab. Bekasi, Prov. Jawa Barat', '40 rumah rusak ringan, 6 rumah rusak sedang, 3 orang luka'),
    { jenis: 'cuaca', kab_nama: 'Bekasi', desa: 'Mekarsari', rumah_rr: 40, rumah_rs: 6, luka: 3 }],
  [L('Gempabumi', 'Kamis, 22 Oktober 2026 pukul 22.10 WIB', 'Kec. Banjarsari, Kab. Lebak, Prov. Banten', 'Kerusakan 15 rumah rusak sedang dan 20 rumah rusak ringan, 4 orang luka-luka'),
    { jenis: 'gempabumi', kab_nama: 'Lebak', kec: 'Banjarsari', rumah_rs: 15, rumah_rr: 20, luka: 4 }],
  [L('Kebakaran Permukiman', 'Rabu, 21 Oktober 2026 pukul 01.20 WIB', 'Kel. Tanjung Priok, Kota Administrasi Jakarta Utara, Prov. DKI Jakarta', '12 KK terdampak, 40 jiwa mengungsi, 10 rumah rusak berat'),
    { jenis: 'kebakaran_permukiman', kab_nama: 'Kota Administrasi Jakarta Utara', mengungsi_kk: 12, mengungsi_jiwa: 40, rumah_rb: 10 }],
  [L('Banjir', 'Selasa, 27 Oktober 2026 pukul 05.00 WIB', 'Kec. Medan Johor, Kota Medan, Prov. Sumatera Utara', '200 KK terdampak, 800 jiwa mengungsi, 1 orang hilang, 1 orang meninggal dunia'),
    { jenis: 'banjir', kab_nama: 'Kota Medan', kec: 'Medan Johor', mengungsi_kk: 200, mengungsi_jiwa: 800, hilang: 1, md: 1 }],
  [L('Tanah Longsor', 'Senin, 26 Oktober 2026 pukul 21.00 WIB', 'Desa Tinggar, Kec. Ledokombo, Kab. Jember, Prov. Jawa Timur', '2 rumah rusak berat, 1 orang meninggal dunia'),
    { jenis: 'longsor', kab_nama: 'Jember', kec: 'Ledokombo', md: 1, rumah_rb: 2 }],
  [L('Kekeringan', 'Senin, 19 Oktober 2026', 'Kec. Gunung Kidul, Kab. Gunungkidul, Prov. DI Yogyakarta', 'Kekurangan air bersih di 5 desa, 600 KK terdampak', 'Kebutuhan: air bersih, tangki air'),
    { jenis: 'kekeringan', kab_nama: 'Gunungkidul', mengungsi_kk: 600 }],
  [L('Banjir Rob', 'Minggu, 25 Oktober 2026 pukul 07.30 WIB', 'Kec. Pekalongan Utara, Kota Pekalongan, Prov. Jawa Tengah', '150 KK terdampak, 90 rumah terendam'),
    { kab_nama: 'Kota Pekalongan', rumah_terendam: 90 }],
  [L('Karhutla', 'Rabu, 21 Oktober 2026 pukul 13.00 WIB', 'Kec. Kumpeh, Kab. Muaro Jambi, Prov. Jambi', 'Luas terbakar 35,5 ha', 'Kendala: asap pekat, jarak pandang terbatas, personel terbatas'),
    { jenis: 'karhutla', kab_nama: 'Muaro Jambi', kec: 'Kumpeh', luas_ha: 35.5 }],
  [L('Banjir', 'Selasa, 27 Oktober 2026 pukul 08.00 WIB', 'Desa Bantarkawung, Kec. Bantarkawung, Kab. Brebes, Prov. Jawa Tengah', '85 rumah terendam, 300 jiwa mengungsi di balai desa', 'Kebutuhan: makanan, selimut, obat-obatan\nSumber: BPBD Kabupaten Brebes'),
    { jenis: 'banjir', kab_nama: 'Brebes', desa: 'Bantarkawung', rumah_terendam: 85, mengungsi_jiwa: 300 }],
  [L('Angin Kencang', 'Senin, 26 Oktober 2026 pukul 15.30 WIB', 'Kec. Tomohon Timur, Kota Tomohon, Prov. Sulawesi Utara', '18 rumah rusak ringan, 1 rumah rusak berat'),
    { kab_nama: 'Kota Tomohon', rumah_rr: 18, rumah_rb: 1 }],
  [L('Tanah Longsor', 'Minggu, 25 Oktober 2026 pukul 11.00 WITA', 'Desa Batulayar, Kec. Batulayar, Kab. Lombok Barat, Prov. Nusa Tenggara Barat', '4 KK mengungsi, 12 jiwa mengungsi, 3 rumah rusak sedang'),
    { jenis: 'longsor', kab_nama: 'Lombok Barat', mengungsi_kk: 4, mengungsi_jiwa: 12, rumah_rs: 3 }],
  [L('Banjir', 'Sabtu, 24 Oktober 2026 pukul 23.00 WIB', 'Kec. Tembilahan, Kab. Indragiri Hilir, Prov. Riau', '500 KK terdampak, 1.200 jiwa terdampak, 300 rumah terendam', 'Kendala: akses jalan terputus, sinyal komunikasi hilang'),
    { jenis: 'banjir', kab_nama: 'Indragiri Hilir', kec: 'Tembilahan', rumah_terendam: 300 }],
  [L('Gelombang Pasang', 'Jumat, 23 Oktober 2026 pukul 06.00 WIB', 'Desa Pantai Baru, Kec. Pandan, Kab. Tapanuli Tengah, Prov. Sumatera Utara', '25 rumah rusak berat, 30 KK mengungsi'),
    { jenis: 'gelombang_pasang', kab_nama: 'Tapanuli Tengah', rumah_rb: 25, mengungsi_kk: 30 }],
  [L('Kebakaran Hutan dan Lahan', 'Kamis, 22 Oktober 2026 pukul 09.30 WIB', 'Kec. Sungai Raya, Kab. Kubu Raya, Prov. Kalimantan Barat', 'Luas terbakar 3 ha', 'Kendala: sumber air terbatas\nKebutuhan: pompa, selang\nSumber: BPBD Kab. Kubu Raya'),
    { jenis: 'karhutla', kab_nama: 'Kubu Raya', luas_ha: 3, sumber_instansi: 'BPBD Kab. Kubu Raya' }],
  [L('Banjir Bandang', 'Rabu, 21 Oktober 2026 pukul 17.00 WIB', 'Desa Sipirok, Kec. Sipirok, Kab. Tapanuli Selatan, Prov. Sumatera Utara', '5 orang meninggal dunia, 3 orang hilang, 20 rumah rusak berat, 150 KK mengungsi'),
    { kab_nama: 'Tapanuli Selatan', md: 5, hilang: 3, rumah_rb: 20, mengungsi_kk: 150 }],
  [L('Gunung Api Erupsi', 'Selasa, 20 Oktober 2026 pukul 04.00 WIB', 'Kec. Pakis, Kab. Malang, Prov. Jawa Timur', '200 jiwa mengungsi'),
    { jenis: 'gunungapi', kab_nama: 'Malang', mengungsi_jiwa: 200 }],
  [L('Banjir', 'Senin, 26 Oktober 2026 pukul 12.00 WIB', 'Desa Kalirejo, Kec. Kalirejo, Kab. Lampung Tengah, Prov. Lampung', '60 rumah terendam, 180 jiwa terdampak', 'Kendala: hujan masih deras'),
    { jenis: 'banjir', kab_nama: 'Lampung Tengah', rumah_terendam: 60 }],
]

test('pengurai + draf: 22 contoh, semua medan harap terbaca', () => {
  assert.ok(CONTOH.length >= 20)
  const gagal = []
  for (const [teks, harap] of CONTOH) {
    const d = buatDraf({ teks, waktu: KINI, urai: urai(saring(teks)), kab })
    for (const [k, v] of Object.entries(harap)) if (d[k] !== v) gagal.push(`${teks.split('\n')[0]}: ${k} = ${JSON.stringify(d[k])}, harap ${JSON.stringify(v)}`)
  }
  assert.deepEqual(gagal, [])
})

test('bentuk body lolos periksaEntri server, jenis kejadian baru dan entri lanjutan', () => {
  for (const [teks] of CONTOH) {
    const d = buatDraf({ teks, waktu: KINI, urai: urai(saring(teks)), kab })
    assert.equal(periksaEntri(badanEntri(d, KINI), KINI).galat, undefined, teks.split('\n')[0])
    const b = badanKejadian(d, KINI)
    assert.match(b.kab_kode, /^\d{2}\|/); assert.match(b.kab_bps, /^\d{4}$/); assert.ok(b.kab_bps.startsWith(b.kab_kode.slice(0, 2)))
    assert.equal(periksaEntri(b, KINI).galat, undefined)
  }
})

test('saring: HP, surel, baris kontak, nama bergelar hilang; tanggal dan jam tetap', () => {
  const s = saring('Pelapor: Bapak Slamet\nHubungi Ibu Sari Wulandari di 0812-3456-7890 atau +62 813 9988 7766, tlp (0251) 8123456, a.n. Budi Santoso\nmail x.y@bpbd.go.id\nTanggal 2026-10-26 pukul 14.30, 12 KK, 350 jiwa')
  assert.doesNotMatch(s, /Slamet|Sari|Wulandari|Budi|0812|813|8123456|@/)
  assert.match(s, /2026-10-26 pukul 14\.30, 12 KK, 350 jiwa/)
  assert.doesNotMatch(buatDraf({ teks: '', waktu: KINI, urai: urai(saring('Banjir\nKab. Garut, Prov. Jawa Barat\nCP Pak Asep 081234567890\nKronologi: warga lapor ke Ibu Rina 0812 3456 7890')), kab }).catatan || '', /Asep|Rina|\d{9}/)
})

test('pencocokan kejadian terbuka: kab sudah per daftar, jenis sama, entri terakhir <= 3 hari', () => {
  const d = { jenis: 'banjir' }, j = (id, jenis, hari) => ({ id, jenis, terakhir: KINI - hari * 864e5 })
  assert.equal(cocok(d, [j('a', 'longsor', 0), j('b', 'banjir', 4), j('c', 'banjir', 2), j('d', 'banjir', 1)], KINI).id, 'd')
  assert.equal(cocok(d, [j('b', 'banjir', 4)], KINI), null)
  assert.equal(cocok(d, [], KINI), null)
})

test('kab ambigu atau tak dikenal tidak ditebak; kota dan kab dibedakan', () => {
  assert.equal(cariKab('Kota Medan', '12', kab).nama, 'Kota Medan')
  assert.equal(cariKab('Kab. Garut', '32', kab).nama, 'Garut')
  assert.equal(cariKab('Kab. Tidak Ada', null, kab), null)
  assert.equal(cariKab('Kab. Medan', '12', kab), null)
})

test('balasan staf: OK, BATAL, KOREKSI, DRAF; lainnya diabaikan', () => {
  assert.deepEqual(parseBalasan('ok a1b2c3'), { aksi: 'ok', kode: 'a1b2c3', yakin: false, medan: [] })
  assert.equal(parseBalasan('OK a1b2c3 yakin').yakin, true)
  assert.deepEqual(parseBalasan('KOREKSI a1b2c3\nmd=2\nkab=Garut').medan, ['md=2', 'kab=Garut'])
  assert.equal(parseBalasan('baik, terima kasih'), null)
  const d = buatDraf({ teks: CONTOH[0][0], waktu: KINI, urai: urai(CONTOH[0][0]), kab })
  const r = terapKoreksi(d, ['md=2', 'kab=Kota Medan', 'mulai=2026-10-25 08.00', 'kendala=akses, sinyal'], kab)
  assert.deepEqual([r.galat, r.draf.md, r.draf.kab_kode, r.draf.mulai, r.draf.kendala], [[], 2, '12|Kota Medan', '2026-10-25T08:00', ['akses', 'sinyal']])
  assert.equal(terapKoreksi(d, ['md=abc', 'ngawur'], kab).galat.length, 2)
})

// alur penuh dengan dep palsu: grup -> draf -> ringkasan ke staf -> OK -> POST (kejadian baru, lalu entri lanjutan)
test('alur: draf dikirim ke staf, POST hanya setelah OK, kejadian terbuka jadi entri lanjutan, duplikat diabaikan', async () => {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'logbook-wa-'))
  const env = { LOGBOOK_GRUP: '111@g.us', LOGBOOK_STAF: '6282' }
  const kirim = [], pos = []
  let terbuka = []
  const dep = { kab, urai: async (t) => urai(t), kirimTeks: async (t, m) => kirim.push([t, m]),
    api: async (method, jalur, body) => { if (method === 'GET') return { status: 200, json: { kejadian: terbuka } }; pos.push([jalur, body]); return { status: 201, json: { kejadian: { kib: '320599' } } } } }
  const o = { env, dep, rumah, kini: KINI }
  const lap = CONTOH[0][0] + '\nPelapor: Bapak Slamet 0812-3456-7890'
  assert.equal(await masuk({ id: 'm1', jid: '111@g.us', dari: '6281', teks: lap, waktu: KINI }, o), 'draf')
  assert.equal(await masuk({ id: 'm1', jid: '111@g.us', dari: '6281', teks: lap, waktu: KINI }, o), 'ulang')
  assert.equal(await masuk({ id: 'm2', jid: '111@g.us', dari: '6281', teks: 'selamat siang bapak ibu', waktu: KINI }, o), 'pendek')
  assert.equal(pos.length, 0)
  assert.equal(kirim.length, 1); assert.equal(kirim[0][0], '6282@s.whatsapp.net')
  assert.doesNotMatch(kirim[0][1], /Slamet|0812/); assert.match(kirim[0][1], /kejadian baru/)
  const kode = /DRAF LOGBOOK (\w+)/.exec(kirim[0][1])[1]
  assert.equal(await masuk({ id: 'm3', jid: '999@g.us', dari: '6299', teks: `OK ${kode}`, waktu: KINI }, o), 'abaikan')   // bukan staf
  assert.equal(await masuk({ id: 'm4', jid: '222@g.us', dari: '6282', teks: `OK ${kode}`, waktu: KINI }, o), 'kejadian')
  assert.equal(pos[0][0], '/api/logbook/kejadian'); assert.equal(pos[0][1].kab_kode, '32|Garut'); assert.ok(!JSON.stringify(pos[0][1]).match(/Slamet|0812/))
  assert.equal(await masuk({ id: 'm5', jid: '222@g.us', dari: '6282', teks: `OK ${kode}`, waktu: KINI }, o), 'tak-ada')   // sudah terpakai
  terbuka = [{ id: 'KEJ123', jenis: 'banjir', kib: '3205991026101-', terakhir: KINI - 864e5 }]
  await masuk({ id: 'm6', jid: '111@g.us', dari: '6281', teks: CONTOH[0][0].replace('120 KK', '150 KK'), waktu: KINI }, o)
  const k2 = /DRAF LOGBOOK (\w+)/.exec(kirim.at(-1)[1])[1]; assert.match(kirim.at(-1)[1], /entri lanjutan ke kejadian KEJ123/)
  assert.equal(await masuk({ id: 'm7', jid: '222@g.us', dari: '6282', teks: `KOREKSI ${k2}\nmd=3`, waktu: KINI }, o), 'koreksi')
  assert.equal(await masuk({ id: 'm8', jid: '222@g.us', dari: '6282', teks: `OK ${k2}`, waktu: KINI }, o), 'entri')
  assert.equal(pos[1][0], '/api/logbook/kejadian/KEJ123/entri'); assert.equal(pos[1][1].md, 3); assert.equal(pos[1][1].mengungsi_kk, 150)
  // BATAL
  await masuk({ id: 'm9', jid: '111@g.us', dari: '6281', teks: CONTOH[1][0], waktu: KINI }, o)
  const k3 = /DRAF LOGBOOK (\w+)/.exec(kirim.at(-1)[1])[1]
  assert.equal(await masuk({ id: 'm10', jid: '222@g.us', dari: '6282', teks: `batal ${k3}`, waktu: KINI }, o), 'batal')
  assert.equal(pos.length, 2)
  fs.rmSync(rumah, { recursive: true })
})

test('server menolak angka tak wajar: staf diberi tahu, bisa OK <kode> YAKIN', async () => {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'logbook-wa-'))
  const kirim = []
  const dep = { kab, urai: async (t) => urai(t), kirimTeks: async (t, m) => kirim.push(m), api: async (m) => ({ status: m === 'GET' ? 200 : 201, json: { kejadian: [] } }) }
  const o = { env: { LOGBOOK_GRUP: 'g@g.us', LOGBOOK_STAF: '6282' }, dep, rumah, kini: KINI }
  await masuk({ id: 'a', jid: 'g@g.us', dari: '1', teks: CONTOH[0][0].replace('1 orang meninggal', '9000 orang meninggal'), waktu: KINI }, o)
  const kode = /DRAF LOGBOOK (\w+)/.exec(kirim[0])[1]
  assert.equal(await masuk({ id: 'b', jid: 's@g.us', dari: '6282', teks: `OK ${kode}`, waktu: KINI }, o), 'ditolak-lokal')
  assert.match(kirim.at(-1), /batas wajar/)
  fs.rmSync(rumah, { recursive: true })
})

test('arah: pesan grup diurai DAN diteruskan ke penangan lama; hanya balasan staf dicegat penuh', async () => {
  const env = { LOGBOOK_GRUP: 'g@g.us', LOGBOOK_STAF: '6282' }
  env.LOGBOOK_STAF = '6282'
  assert.equal(arah('g@g.us', '6281', 'laporan apa saja', env), 'grup')   // gateway: masuk() dipanggil, lalu return false -> jalur bahan jalan
  assert.equal(arah('x@s.whatsapp.net', '6282', 'OK a1b2c3', env), 'staf')
  assert.equal(arah('x@s.whatsapp.net', '6299', 'ok siap laksanakan', env), null)   // bukan staf: mengalir ke laporan
  assert.equal(arah('x@s.whatsapp.net', '6299', 'OK a1b2c3', env), null)            // gateway: return true
  assert.equal(arah('x@s.whatsapp.net', '6282', 'bahan laporan biasa', env), null)
  assert.equal(arah('g@g.us', '6281', 'x', {}), null)
  assert.equal(arah('g@g.us', '6281', 'x', { LOGBOOK_GRUP: 'g@g.us', LOGBOOK_STAF: 'staf@g.us' }), null)   // JID grup ditolak, fitur mati
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'logbook-wa-')), kirim = []
  const dep = { kab, urai: async (t) => urai(t), kirimTeks: async (t, m) => kirim.push(m), api: async () => ({ status: 200, json: { kejadian: [] } }) }
  assert.equal(await masuk({ id: 'z', jid: 'g@g.us', dari: '1', teks: CONTOH[0][0], waktu: KINI }, { env, dep, rumah, kini: KINI }), 'draf')
  fs.rmSync(rumah, { recursive: true })
})

test('T1: header api() lolos tolakOrigin nyata (POST bersesi, login, dan tanpa Origin ditolak)', () => {
  const host = 'https://centurisk97.id', url = new URL(host + '/api/logbook/kejadian')
  const req = (h) => new Request(url, { method: 'POST', headers: h })
  assert.equal(tolakOrigin(req(kepalaApi(host, 'sesi_staf=' + 'a'.repeat(64), true)), url), null)
  assert.equal(tolakOrigin(req(kepalaApi(host, null, true)), new URL(host + '/api/staf/masuk')), null)
  assert.equal(tolakOrigin(req({ cookie: 'sesi_staf=' + 'a'.repeat(64) }), url)?.status, 403)   // kontrol: tanpa origin memang ditolak
})

test('T2: dua OK berdekatan = satu POST', async () => {
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'logbook-wa-')), pos = [], kirim = []
  const dep = { kab, urai: async (t) => urai(t), kirimTeks: async (t, m) => kirim.push(m),
    api: async (m, j, b) => { if (m === 'GET') return { status: 200, json: { kejadian: [] } }; pos.push(j); await new Promise((r) => setTimeout(r, 30)); return { status: 201, json: {} } } }
  const o = { env: { LOGBOOK_GRUP: 'g@g.us', LOGBOOK_STAF: '6282' }, dep, rumah, kini: KINI }
  await masuk({ id: 'a', jid: 'g@g.us', dari: '1', teks: CONTOH[0][0], waktu: KINI }, o)
  const kode = /DRAF LOGBOOK (\w+)/.exec(kirim[0])[1], ok = { jid: 'x', dari: '6282', teks: `OK ${kode}`, waktu: KINI }
  const r = await Promise.all([masuk({ id: 'b', ...ok }, o), masuk({ id: 'c', ...ok }, o)])
  assert.deepEqual(r.sort(), ['kejadian', 'tak-ada']); assert.equal(pos.length, 1)
  // POST gagal: draf kembali, staf diberi tahu
  dep.api = async (m) => m === 'GET' ? { status: 200, json: { kejadian: [] } } : { status: 500, json: { galat: 'x' } }
  await masuk({ id: 'd', jid: 'g@g.us', dari: '1', teks: CONTOH[1][0], waktu: KINI }, o)
  const k2 = /DRAF LOGBOOK (\w+)/.exec(kirim.at(-1))[1]
  assert.equal(await masuk({ id: 'e', jid: 'x', dari: '6282', teks: `OK ${k2}`, waktu: KINI }, o), 'gagal-post')
  assert.equal(await masuk({ id: 'f', jid: 'x', dari: '6282', teks: 'DRAF', waktu: KINI }, o), 'daftar'); assert.match(kirim.at(-1), new RegExp(k2))
  fs.rmSync(rumah, { recursive: true })
})

test('T5/T6/T8: koreksi tanggal dan angka ketat, WA_IZIN, batas draf, WORKER_URL http ditolak', async () => {
  const d = buatDraf({ teks: CONTOH[0][0], waktu: KINI, urai: urai(CONTOH[0][0]), kab })
  assert.equal(terapKoreksi(d, ['mulai=2026-13-45'], kab).galat.length, 1)
  assert.equal(terapKoreksi(d, ['md=1e3', 'luka=-1', 'constructor=1', '__proto__=1'], kab).galat.length, 4)
  assert.equal(terapKoreksi(d, ['md=2,5'], kab).galat.length, 0)
  const rumah = fs.mkdtempSync(path.join(os.tmpdir(), 'logbook-wa-'))
  const dep = { kab, urai: async (t) => urai(t), kirimTeks: async () => {}, api: async () => ({ status: 200, json: { kejadian: [] } }) }
  const env = { LOGBOOK_GRUP: 'g@g.us', LOGBOOK_STAF: '6282', WA_IZIN: '6281' }
  assert.equal(await masuk({ id: 'a', jid: 'g@g.us', dari: '6277', teks: CONTOH[0][0], waktu: KINI }, { env, dep, rumah, kini: KINI }), 'bukan-izin')
  assert.equal(await masuk({ id: 'b', jid: 'g@g.us', dari: '6281', teks: CONTOH[0][0], waktu: KINI }, { env, dep, rumah, kini: KINI }), 'draf')
  const st = JSON.parse(fs.readFileSync(path.join(rumah, 'logbook.json'), 'utf8')); for (let i = 0; i < 49; i++) st.draf['k' + i] = st.draf[Object.keys(st.draf)[0]]
  fs.writeFileSync(path.join(rumah, 'logbook.json'), JSON.stringify(st))
  assert.equal(await masuk({ id: 'c', jid: 'g@g.us', dari: '6281', teks: CONTOH[1][0], waktu: KINI }, { env, dep, rumah, kini: KINI }), 'penuh')
  assert.throws(() => depBawaan({ WORKER_URL: 'http://centurisk97.id' }), /https/)
  fs.rmSync(rumah, { recursive: true })
})
