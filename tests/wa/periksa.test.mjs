// BL-11: pemeriksaan draf bot laporan (K9, A7, Q11; RENCANA-UJI T11, T19).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { periksa, banding7, keAngka, median, dariLapharRiwayat, pilihPython, jalurGerbang } from '../../scripts/wa/periksa.mjs'

const hari = (vals, akhir = '2026-11-18') => vals.map((v, i) => {
  const d = new Date(akhir + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (vals.length - i))
  return { tanggal: d.toISOString().slice(0, 10), angka: { md: v } }
})

const ada = () => true
const env = { BL_PY: 'python-uji', BL_ATURAN_SLIDE: '/g/aturan_slide.py', BL_BAHASA: '/g/bahasa.py' }

function depLolos(catat = []) {
  return { ada, exec: async (bin, args, opsi) => { catat.push({ bin, args, opsi }); return { stdout: 'lolos', stderr: '' } } }
}

test('T11: 5 kali median memberi peringatan yang menyebut angka, nilai hari ini, dan median', () => {
  const p = banding7({ md: 50 }, hari([10, 10, 10, 10, 10, 10, 10]), '2026-11-18')
  assert.equal(p.length, 1)
  assert.match(p[0], /md/)
  assert.match(p[0], /50/)
  assert.match(p[0], /median 7 hari terakhir \(10\)/)
  assert.doesNotMatch(p[0], /[·—]|\p{Extended_Pictographic}/u)
})

test('T11: kurang dari 3 pembanding tidak memberi peringatan', () => {
  assert.deepEqual(banding7({ md: 500 }, hari([10, 10]), '2026-11-18'), [])
  assert.deepEqual(banding7({ md: 0 }, hari([10, 10]), '2026-11-18'), [])
})

test('A7: kurang dari sepertiga median, nol sesudah 7 hari positif, dan batas tepat 3 kali tidak memicu', () => {
  assert.match(banding7({ md: 2 }, hari([9, 9, 9, 9]), '2026-11-18')[0], /sepertiga median/)
  const nol = banding7({ md: 0 }, hari([4, 5, 6, 5, 4, 5, 6]), '2026-11-18')
  assert.equal(nol.length, 1)
  assert.match(nol[0], /hari ini 0, padahal 7 hari sebelumnya tidak pernah nol/)
  assert.deepEqual(banding7({ md: 30 }, hari([10, 10, 10]), '2026-11-18'), [])
  assert.deepEqual(banding7({ md: 0 }, hari([0, 0, 0, 0]), '2026-11-18'), [])
})

test('A7: hanya 7 hari kalender sebelum tanggal yang dibandingkan, hari ini dan masa depan diabaikan', () => {
  const lama = [{ tanggal: '2026-11-01', angka: { md: 1 } }, { tanggal: '2026-11-02', angka: { md: 1 } }, { tanggal: '2026-11-03', angka: { md: 1 } }]
  assert.deepEqual(banding7({ md: 100 }, lama, '2026-11-18'), [])
  const r = [...hari([10, 10, 10]), { tanggal: '2026-11-18', angka: { md: 999 } }, { tanggal: '2026-11-19', angka: { md: 999 } }]
  assert.equal(banding7({ md: 50 }, r, '2026-11-18').length, 1)
})

test('keAngka dan median membaca angka gaya Indonesia', () => {
  assert.equal(keAngka('1.234'), 1234)
  assert.equal(keAngka('12,5'), 12.5)
  assert.equal(keAngka('1.234 jiwa'), 1234)
  assert.equal(keAngka(7), 7)
  assert.equal(keAngka('nihil'), null)
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([1, 2, 3, 4]), 2.5)
})

test('periksa: dep.riwayat dipakai dan peringatan banding masuk daftar peringatan', async () => {
  const r = await periksa({ pptx: '/d/x.pptx', jenis: 'penanganan', tanggal: '2026-11-18', angka: { md: '1.500' }, env, dep: { ...depLolos(), riwayat: async (j, t) => { assert.equal(j, 'penanganan'); assert.equal(t, '2026-11-18'); return hari([100, 120, 110, 100, 90]) } } })
  assert.deepEqual(r.gagal, [])
  assert.equal(r.peringatan.length, 1)
  assert.match(r.peringatan[0], /1\.500/)
  assert.equal(typeof r.ms, 'number')
})

test('periksa: harian jatuh ke laphar_riwayat.json bila dep.riwayat kosong', async () => {
  const json = { harian: { '2026-11-15': { n: 20, jenis: { banjir: 5 } }, '2026-11-16': { n: 22, jenis: { banjir: 6 } }, '2026-11-17': { n: 21, jenis: { banjir: 5 } } } }
  let dibaca = ''
  const r = await periksa({ pptx: '/d/x.pptx', jenis: 'harian', tanggal: '2026-11-18', angka: { kejadian: 90, 'kejadian_banjir': 5 }, env, dep: { ...depLolos(), riwayat: async () => [], bacaJson: async (p) => { dibaca = p; return json } } })
  assert.match(dibaca, /laphar_riwayat\.json$/)
  assert.equal(r.peringatan.length, 1)
  assert.match(r.peringatan[0], /kejadian hari ini 90/)
  assert.deepEqual(dariLapharRiwayat(json)[0].angka.n, 20)
})

test('gerbang dijalankan lewat execFile dengan larik argumen, tanpa shell, batas 20 detik', async () => {
  const catat = []
  await periksa({ pptx: '/d/Laporan 181126.pptx', tanggal: '2026-11-18', env, dep: depLolos(catat) })
  assert.equal(catat.length, 2)
  for (const c of catat) {
    assert.equal(c.bin, 'python-uji')
    assert.ok(Array.isArray(c.args))
    assert.ok(c.args.includes('/d/Laporan 181126.pptx'), 'jalur berkas utuh satu argumen')
    assert.equal(c.opsi.shell, undefined)
    assert.equal(c.opsi.timeout, 20000)
    assert.equal(c.opsi.env.PYTHONUTF8, '1')
  }
  assert.deepEqual(catat[0].args, ['/g/aturan_slide.py', '/d/Laporan 181126.pptx', '--tanggal', '2026-11-18'])
  assert.equal(catat[1].args[0], '-c')
  const src = fs.readFileSync(new URL('../../scripts/wa/periksa.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /shell:\s*true|\bexecSync\b|\bexec\(\s*['"`]|spawn\(/)
})

test('kegagalan gerbang diurai jadi baris pendek di gagal, tanpa titik tengah dan em dash', async () => {
  const dep = { ada, exec: async (bin, args) => {
    const e = new Error('Command failed'); e.code = 1; e.stderr = ''
    e.stdout = args[0] === '-c' ? 'slide 3: kata tidak baku "resiko" · pakai "risiko"\n' : 'slide 2: logo KRIS tidak ada\nslide 2: logo KRIS tidak ada\nslide 5: catatan "sementara" di baris kaki dilarang — x\n'
    throw e
  } }
  const r = await periksa({ pptx: '/d/x.pptx', tanggal: '2026-11-18', env, dep })
  assert.deepEqual(r.gagal.slice(0, 2), ['format slide: slide 2: logo KRIS tidak ada', 'format slide: slide 5: catatan "sementara" di baris kaki dilarang , x'])
  assert.match(r.gagal[2], /^bahasa: slide 3: kata tidak baku/)
  for (const g of r.gagal) assert.doesNotMatch(g, /[·—]/)
  assert.deepEqual(r.peringatan, [])
})

test('gerbang atau python tidak ada, batas waktu, dan galat Python jadi peringatan, tidak pernah melempar', async () => {
  const tanpaBerkas = await periksa({ pptx: '/d/x.pptx', env, dep: { ada: (p) => p === '/d/x.pptx', exec: async () => { throw new Error('tidak boleh dipanggil') } } })
  assert.deepEqual(tanpaBerkas.peringatan, ['pemeriksaan format slide tidak tersedia (berkas gerbang tidak ditemukan)', 'pemeriksaan bahasa tidak tersedia (berkas gerbang tidak ditemukan)'])
  assert.deepEqual(tanpaBerkas.gagal, [])

  const enoent = await periksa({ pptx: '/d/x.pptx', env, dep: { ada, exec: async () => { const e = new Error('spawn ENOENT'); e.code = 'ENOENT'; throw e } } })
  assert.match(enoent.peringatan[0], /pemeriksaan format slide tidak tersedia \(python tidak ditemukan\)/)

  const lama = await periksa({ pptx: '/d/x.pptx', env, dep: { ada, exec: async () => { const e = new Error('t'); e.killed = true; e.signal = 'SIGTERM'; throw e } } })
  assert.match(lama.peringatan[0], /lewat 20 detik/)

  const modul = await periksa({ pptx: '/d/x.pptx', env, dep: { ada, exec: async () => { const e = new Error('x'); e.code = 1; e.stdout = ''; e.stderr = "Traceback\nModuleNotFoundError: No module named 'pptx'"; throw e } } })
  assert.match(modul.peringatan[0], /tidak tersedia \(ModuleNotFoundError/)
  assert.deepEqual(modul.gagal, [])

  const aneh = await periksa({ pptx: '/d/x.pptx', tanggal: '2026-11-18', angka: { md: 1 }, env, dep: { ada, exec: async () => { throw 'rusak' }, riwayat: async () => { throw new Error('jaringan') }, bacaJson: () => { throw new Error('x') } } })
  assert.equal(aneh.gagal.length, 0)
  assert.ok(aneh.peringatan.length >= 2)
})

test('T19: ms diukur dari dep.now', async () => {
  let t = 1000
  const r = await periksa({ pptx: '/d/x.pptx', env, dep: { ...depLolos(), now: () => (t += 400) } })
  assert.equal(r.ms, 400)
})

test('PPTX tidak ada: gerbang dilewati dengan peringatan, banding tetap jalan', async () => {
  const r = await periksa({ pptx: '/d/hilang.pptx', jenis: 'x', tanggal: '2026-11-18', angka: { md: 50 }, env, dep: { ada: () => false, exec: async () => { throw new Error('jangan') }, riwayat: async () => hari([10, 10, 10]) } })
  assert.match(r.peringatan[0], /dilewati/)
  assert.equal(r.peringatan.length, 2)
})

test('pilihPython dan jalurGerbang mengikuti env', () => {
  assert.deepEqual(pilihPython({ BL_PY: '/x/py' }), { bin: '/x/py', awal: [] })
  assert.deepEqual(pilihPython({}, () => false, 'win32'), { bin: 'py', awal: ['-3.14'] })
  assert.deepEqual(pilihPython({}, () => false, 'darwin'), { bin: 'python3', awal: [] })
  const g = jalurGerbang({ DECK_BNPB: '/s/ppt-konsultan/bnpb' })
  assert.match(g.aturan.replace(/\\/g, '/'), /\/s\/ppt-konsultan\/bnpb\/scripts\/aturan_slide\.py$/)
  assert.match(g.bahasa.replace(/\\/g, '/'), /\/s\/ppt-konsultan\/scripts\/bahasa\.py$/)
})

test('A7: nol hanya diperingatkan bila ketujuh hari sebelumnya ada dan semuanya > 0', () => {
  assert.deepEqual(banding7({ md: 0 }, hari([5, 5, 5, 5, 5, 5]), '2026-11-18'), [])
  assert.deepEqual(banding7({ md: 0 }, hari([5, 5, 5, 0, 5, 5, 5]), '2026-11-18'), [])
  assert.equal(banding7({ md: 0 }, hari([5, 5, 5, 5, 5, 5, 5]), '2026-11-18').length, 1)
})

test('cadangan laphar_riwayat: kejadian dan jumlah_kejadian dibandingkan, medan isian meninggal diam', async () => {
  const harian = {}
  for (let i = 1; i <= 7; i++) harian[`2026-11-${String(10 + i).padStart(2, '0')}`] = { n: 20, jenis: { banjir: 5 } }
  const r = await periksa({ pptx: '/d/x.pptx', jenis: 'harian', tanggal: '2026-11-18', angka: { kejadian: 90, jumlah_kejadian: 2, meninggal: 500 }, env, dep: { ...depLolos(), bacaJson: async () => ({ harian }) } })
  assert.equal(r.peringatan.length, 2)
  assert.match(r.peringatan[0], /kejadian hari ini 90/)
  assert.match(r.peringatan[1], /jumlah_kejadian hari ini 2/)
  assert.ok(!r.peringatan.some((x) => /meninggal/.test(x)))
})
