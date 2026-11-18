// Uji mesin proyek bot laporan (BL-08; RENCANA-UJI T2, T3, T15, T22) tanpa Claude API, Worker, python, atau WhatsApp: semua disuntik.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { tangani, parsePerintah, keIsianGenerator, tanpaKunci, kedaluwarsa, waSha, BANTUAN } from '../../scripts/wa/proyek.mjs'
import { GalatClaude } from '../../scripts/wa/claude.mjs'
import { LAPORAN } from '../../scripts/wa/otomatis.mjs'

const NOW = new Date('2026-10-29T01:00:00Z') // 08.00 WIB
const TGL = '2026-10-26'
const DARI = '6281234567890'
const kenali = (teks) => (String(teks).match(/^\[(\w+)\]/) || [])[1] || null
const tanggalIsi = (t) => String(t).split('] ')[1]
const P = (id, kunci, dari = DARI) => ({ id, diterima: Number(id), dari, teks: `[${kunci}] ${TGL}`, nama_berkas: '', ada_berkas: 0 })
const LENGKAP = () => [P('1', 'rekap_koordalops_24'), P('2', 'bmkg_pagi'), P('3', 'pvmbg_pagi')]
const SISTEM_HURUF = /[·—–]|\p{Extended_Pictographic}/u

function dunia({ pesan = LENGKAP(), berkas = {}, claude, ocr, tahanGenerator, now = NOW, stderrGen = '', gagalStatus = 0 } = {}) {
  const dasar = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-proyek-'))
  const balasan = [], kirim = [], exec = [], keUrai = [], pemilik = [], versi = [], statusLog = []
  const proyek = new Map()
  let nomor = 0
  const jawab = (o) => ({ ok: true, status: 200, json: async () => o, text: async () => JSON.stringify(o) })
  const dep = {
    fetch: async (u, o = {}) => {
      const url = new URL(u)
      if (url.pathname === '/api/wa/masuk') return jawab({ pesan: url.searchParams.get('tanggal') === TGL ? pesan : [] })
      if (url.pathname === '/api/wa/berkas') {
        const b = berkas[url.searchParams.get('id')] ?? ''
        return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(b).buffer, text: async () => b }
      }
      const b = typeof o.body === 'string' ? JSON.parse(o.body) : null
      if (url.pathname === '/api/wa/proyek') {
        if (b.id) { const p = [...proyek.values()].find((x) => x.id === b.id); return p ? jawab({ proyek: { ...p } }) : { ok: false, status: 404, text: async () => '' } }
        const k = `${b.wa_sha}|${b.jenis}|${b.tanggal}`
        if (!proyek.has(k)) proyek.set(k, { id: `P-291026-${String(++nomor).padStart(2, '0')}`, wa_sha: b.wa_sha, jenis: b.jenis, tanggal: b.tanggal, status: 'terbuka', versi: 0, diubah: now.getTime(), bahan: [] })
        const p = proyek.get(k); p.bahan.push(...(b.bahan || []))
        return jawab({ proyek: { ...p } })
      }
      if (url.pathname === '/api/wa/proyek/status') {
        if (gagalStatus > 0) { gagalStatus--; statusLog.push('gagal:' + b.ke); return { ok: false, status: 503, text: async () => 'sibuk' } }
        const p = [...proyek.values()].find((x) => x.id === b.id); statusLog.push(b.ke); p.status = b.ke
        return jawab({ ok: true, proyek: p })
      }
      if (url.pathname === '/api/wa/proyek/versi') {
        const f = o.body
        versi.push({ n: f.get('n'), kunci: [...f.keys()], isian: JSON.parse(await f.get('isian').text()), peringatan: f.get('peringatan') })
        const p = [...proyek.values()].find((x) => x.id === f.get('proyek')); p.versi = Number(f.get('n'))
        return jawab({ ok: true })
      }
      throw new Error('fetch tak terduga ' + u)
    },
    exec: async (cmd, args) => {
      exec.push({ cmd, args })
      if (cmd === 'pdftotext') return { stdout: fs.readFileSync(args[1], 'utf8').replace(/^PDF:/, '') }
      if (args[0] === '-c') return { stdout: 'a,b\n1,2\n' + fs.readFileSync(args[2], 'utf8') }
      if (String(args[0]).endsWith('ubah.py')) {
        const dir = args[4]; fs.mkdirSync(dir, { recursive: true })
        const png = [1, 2, 3].map((n) => path.join(dir, `pratinjau-${n}.png`))
        for (const f of png) fs.writeFileSync(f, 'png')
        return { stdout: JSON.stringify({ png, metode: 'uji' }) }
      }
      if (tahanGenerator) await tahanGenerator
      const out = args[args.indexOf('--out') + 1], tgl = args[args.indexOf('--tanggal') + 1]
      const lap = LAPORAN.find((l) => l.args(tgl, { rekap_koordalops_24: 'k', bmkg_pagi: 'b', satgas: 's', pvmbg_pagi: 'g' }, 'o')[0] === args[0])
      for (const x of ['pdf', 'pptx']) fs.writeFileSync(path.join(out, `${lap.berkas(tgl)}.${x}`), 'x')
      return { stdout: '', stderr: stderrGen }
    },
    ocr: ocr || (async () => null),
    claude: { urai: async (bahan, jenis) => { keUrai.push({ bahan, jenis }); return claude ? claude(bahan, jenis) : { isian: [], pertentangan: [], gagal: [] } } },
  }
  const ctx = {
    env: { WORKER_URL: 'http://w', WA_MESIN: 'k', WA_GARAM: 'garam', PEMILIK: '6299', WA_IZIN: `${DARI},6299,6281111`, WA_PY_BIN: '/opt/py/bin' },
    dep, now, dasar, kenali, tanggalIsi, log: () => {},
    balas: async (t) => { balasan.push(t) },
    balasFile: async (p, nama, caption, mime) => { kirim.push({ p, nama, caption, mime }) },
    kabariPemilik: async (t) => { pemilik.push(t) },
  }
  const semua = () => [...balasan, ...kirim.map((k) => k.caption).filter(Boolean)]
  return { ctx, dasar, balasan, kirim, exec, keUrai, pemilik, versi, statusLog, proyek, semua, gen: () => exec.filter((e) => /_(ringkas|otomatis)\.py$/.test(e.args[0])) }
}
const perintah = (d, teks) => tangani({ dari: DARI, teks }, d.ctx)

test('parsePerintah: buat, jenis, tanggal, saja; status tanpa tanggal; selain itu bahan', () => {
  const p = (t) => parsePerintah(t, NOW)
  assert.deepEqual(p('buat harian 26 okt'), { aksi: 'buat', jenis: 'harian', tanggal: TGL, saja: false })
  assert.deepEqual(p('Buat penanganan karhutla'), { aksi: 'buat', jenis: 'penanganan', tanggal: '2026-10-29', saja: false })
  assert.deepEqual(p('buat saja'), { aksi: 'buat', jenis: null, tanggal: '2026-10-29', saja: true })
  assert.deepEqual(p('buat harian saja kemarin'), { aksi: 'buat', jenis: 'harian', tanggal: '2026-10-28', saja: true })
  assert.deepEqual(p('status'), { aksi: 'status' })
  assert.deepEqual(p('bantuan'), { aksi: 'bantuan' })
  assert.deepEqual(p('buat mingguan'), { aksi: 'bantuan' })
  assert.equal(p('status 26 okt'), null) // tetap milik perintah.mjs (Q14)
  assert.equal(p('kirim ulang harian'), null)
  assert.equal(p('buat\nlaporan panjang'), null)
  assert.equal(p('Statusnya aman'), null)
})

test('waSha memakai rumus daftar.cjs: sha256("<garam>|<62 nomor>")', () => {
  assert.equal(waSha('081234567890', 'g'), crypto.createHash('sha256').update('g|6281234567890').digest('hex'))
  assert.equal(waSha('081234567890', ''), null)
})

test('T2: buat dengan bahan wajib kurang -> satu T-TANYA, status bertanya, generator tidak jalan', async () => {
  const d = dunia({ pesan: [P('1', 'rekap_koordalops_24'), P('2', 'bmkg_pagi')] })
  await perintah(d, 'buat harian 26 okt')
  assert.equal(d.gen().length, 0)
  assert.deepEqual(d.statusLog, ['bertanya'])
  assert.equal(d.balasan.length, 1)
  const [b] = d.balasan
  assert.match(b, /^P-291026-01\n/)
  assert.match(b, /1\. PVMBG pagi untuk 26 Okt belum ada\. Kirim bahannya\./)
  assert.match(b, /buat saja/)
  assert.equal(d.kirim.length, 0)
})

test('T2: pertentangan dari Claude ikut ditanyakan bernomor', async () => {
  const d = dunia({ claude: () => ({ isian: [], gagal: [], pertentangan: [{ medan: 'sorti_water_bombing', a: { nilai: '14', kutipan: 'sorti 14' }, b: { nilai: '12', kutipan: 'sorti 12' } }] }) })
  await perintah(d, 'buat harian 26 okt')
  assert.equal(d.gen().length, 0)
  assert.match(d.balasan[0], /1\. sorti water bombing berbeda: 14 \("sorti 14"\) dan 12 \("sorti 12"\)\. Mana yang dipakai\?/)
})

test('T3: buat saja membangun dengan catatan kekurangan; Claude tidak dipanggil dua kali untuk bahan sama', async () => {
  const d = dunia({ pesan: [P('1', 'rekap_koordalops_24'), P('2', 'bmkg_pagi')] })
  await perintah(d, 'buat harian 26 okt')
  await perintah(d, 'buat harian saja 26 okt')
  assert.equal(d.keUrai.length, 1)
  assert.equal(d.gen().length, 1)
  assert.deepEqual(d.statusLog, ['bertanya', 'membangun', 'draf'])
  assert.deepEqual(d.kirim.map((k) => path.extname(k.nama)), ['.png', '.pdf'])
  assert.match(d.kirim[0].caption, /^P-291026-01 v1\nDraf Laporan Kejadian Bencana Harian 26 Okt\.\nBahan: Rekap Koordalops 24 jam 1, BMKG pagi 1\.\nCatatan:\n- PVMBG pagi untuk 26 Okt belum ada/)
  assert.match(d.versi[0].peringatan, /PVMBG pagi/)
})

test('bangun v1: tepat 2 kiriman (pratinjau berketerangan ringkasan, lalu PDF), tanpa PPTX, versi v1 lalu draf, isian tanpa angka sistem', async () => {
  const d = dunia({ claude: (bahan) => ({ gagal: [], pertentangan: [], isian: [
    { medan: 'kabupaten', kelompok: 'k1', nilai: 'Bogor', kutipan: 'Bogor', sumber_bahan_id: '1' },
    { medan: 'meninggal', kelompok: 'k1', nilai: '3 jiwa', kutipan: '3 jiwa', sumber_bahan_id: '1' },
    { medan: 'dampak', kelompok: 'k1', nilai: 'hotspot 40 titik di sekitar', kutipan: 'x', sumber_bahan_id: '1' },
    { medan: 'kondisi_terkini', kelompok: 'k1', nilai: 'Air mulai surut', kutipan: 'Air mulai surut', sumber_bahan_id: '1' },
    { medan: 'hotspot', kelompok: 'k1', nilai: '40', kutipan: '40', sumber_bahan_id: '1' },
    { medan: 'luas_terbakar', kelompok: 'k1', nilai: '12 ha', kutipan: '12 ha', sumber_bahan_id: '1' },
  ] }) })
  await perintah(d, 'buat harian 26 okt')
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.equal(d.balasan.length, 0, 'tanpa pesan T-BUKA terpisah')
  assert.deepEqual(d.kirim.map((k) => path.extname(k.nama)), ['.png', '.pdf'])
  assert.equal(d.kirim[0].caption, 'P-291026-01 v1\nDraf Laporan Kejadian Bencana Harian 26 Okt.\nBahan: Rekap Koordalops 24 jam 1, BMKG pagi 1, PVMBG pagi 1.\nGambar ini pratinjau slide 1, PDF menyusul.\nBalas dengan revisi, atau ketik final.')
  assert.equal(d.kirim[1].caption, 'P-291026-01 v1\nPDF draf Laporan Kejadian Bencana Harian 26 Okt.')
  assert.ok(d.exec.some((e) => String(e.args[0]).endsWith('ubah.py') && e.args[3] === '1'), 'pratinjau slide 1 saja')
  assert.ok(!d.kirim.some((k) => /\.pptx$/i.test(k.nama) || k.mime?.includes('presentation')), 'draf tidak mengirim PPTX (Q1)')
  // generator dapat --isian; isinya tanpa kunci atau teks angka sistem
  const g = d.gen()[0].args
  const isianF = g[g.indexOf('--isian') + 1]
  const isian = JSON.parse(fs.readFileSync(isianF, 'utf8'))
  assert.deepEqual(isian, { kejadian: [{ lokasi: 'Bogor', angka: { meninggal: 3 }, teks: { kondisi: 'Air mulai surut' } }] })
  assert.doesNotMatch(JSON.stringify(isian), /hotspot|terbakar/i)
  assert.equal(d.versi[0].n, '1')
  assert.deepEqual(d.versi[0].kunci.sort(), ['instruksi', 'isian', 'n', 'pdf', 'pptx', 'pratinjau-1','proyek', 'wa_sha'].sort())
  assert.doesNotMatch(JSON.stringify(d.versi[0].isian.generator), /hotspot|terbakar/i)
  // keluaran proyek tidak menimpa folder jalur terjadwal
  assert.ok(d.kirim.at(-1).p.includes(path.join('keluaran', 'proyek', 'P-291026-01', 'v1')))
  for (const t of d.semua()) assert.doesNotMatch(t, SISTEM_HURUF, t)
})

test('tanpa isian yang bisa dipetakan: generator tanpa --isian (deck sama dengan jalur lama)', async () => {
  const d = dunia()
  await perintah(d, 'buat harian 26 okt')
  assert.equal(d.gen()[0].args.includes('--isian'), false)
  assert.deepEqual(keIsianGenerator('penanganan', [{ medan: 'personel_darat', kelompok: 'p', nilai: '20' }]), {})
})

test('tanpaKunci membuang kunci dan teks angka sistem di kedalaman mana pun', () => {
  assert.deepEqual(tanpaKunci({ a: 1, luas_terbakar: 3, b: [{ hotspot: 4, t: 'sisa 12 ha belum dipadamkan', u: 'ok' }] }), { a: 1, b: [{ u: 'ok' }] })
})

test('T15: satu proyek tidak pernah dibangun dua proses bersamaan', async () => {
  let lepas; const tahan = new Promise((r) => { lepas = r })
  const d = dunia({ tahanGenerator: tahan })
  const pertama = perintah(d, 'buat harian 26 okt')
  for (let i = 0; i < 50 && !d.gen().length; i++) await new Promise((r) => setTimeout(r, 10))
  await perintah(d, 'buat harian 26 okt')
  assert.match(d.balasan.at(-1), /^P-291026-01\nSedang dibangun, tunggu sebentar\.$/)
  lepas(); await pertama
  assert.equal(d.gen().length, 1)
  assert.equal(fs.existsSync(path.join(d.dasar, 'proyek', 'P-291026-01.lock')), false)
})

test('K15: PDF dan foto diekstrak jadi teks; yang tidak terbaca dikabarkan dan tidak dikirim ke Claude', async () => {
  const pesan = [...LENGKAP(),
    { id: '7', dari: DARI, teks: '', nama_berkas: 'sitrep.pdf', tipe: 'application/pdf', ada_berkas: 1 },
    { id: '8', dari: DARI, teks: '', nama_berkas: 'kosong.pdf', tipe: 'application/pdf', ada_berkas: 1 },
    { id: '9', dari: DARI, teks: 'foto posko', nama_berkas: 'foto-9.jpg', tipe: 'image/jpeg', ada_berkas: 1 },
    { id: '10', dari: '6280000000', teks: '[satgas] 2026-10-26', nama_berkas: '', ada_berkas: 0 }]
  const d = dunia({ pesan, berkas: { 7: 'PDF:Banjir melanda Kabupaten Bogor, 3 jiwa meninggal dunia', 8: 'PDF:  ', 9: 'jpg' },
    ocr: async () => 'Pengungsi di balai desa 120 jiwa tercatat' })
  await perintah(d, 'buat harian 26 okt')
  const bahan = d.keUrai[0].bahan
  assert.ok(bahan.every((b) => typeof b.teks === 'string' && !('data' in b)), 'hanya teks ke Claude')
  assert.deepEqual(bahan.map((b) => b.id).sort(), ['1', '2', '3', '7', '9'])
  assert.match(bahan.find((b) => b.id === '7').teks, /3 jiwa meninggal/)
  assert.match(bahan.find((b) => b.id === '9').teks, /^foto posko\nPengungsi/)
  assert.ok(d.exec.some((e) => e.cmd === 'pdftotext' && e.args[0] === '-layout' && e.args[2] === '-'))
  assert.ok(!bahan.some((b) => b.id === '10'), 'bahan nomor lain tidak masuk (Q6)')
  assert.match(d.balasan[0], /kosong\.pdf tidak terbaca\. Kirim teks atau PDF\./)
  assert.equal(d.gen().length, 0)
  assert.equal(fs.existsSync(path.join(d.dasar, 'proyek', 'P-291026-01', 'ekstrak')), false, 'berkas sementara dihapus')
})

test('GalatClaude: pesan ramah ke pengirim, pemilik dikabari sekali, status kembali terbuka', async () => {
  const d = dunia({ claude: () => { throw new GalatClaude('tolak', 'x') } })
  await perintah(d, 'buat harian 26 okt')
  await perintah(d, 'buat harian 26 okt')
  assert.equal(d.gen().length, 0)
  assert.equal(d.balasan[0], 'P-291026-01\nGagal membaca bahan, coba lagi atau kirim ulang.')
  assert.equal(d.pemilik.length, 1)
  assert.match(d.pemilik[0], /Claude gagal \(tolak\)/)
})

test('generator gagal: pengirim diberi tahu singkat, rincian hanya ke pemilik, status terbuka', async () => {
  const d = dunia()
  d.ctx.dep.exec = async (cmd, args) => { if (/_(ringkas|otomatis)\.py$/.test(args[0])) throw Object.assign(new Error('x'), { stderr: 'meledak' }); return { stdout: '' } }
  await perintah(d, 'buat harian 26 okt')
  assert.deepEqual(d.statusLog, ['membangun', 'terbuka'])
  assert.match(d.balasan.at(-1), /Draf v1 gagal dibangun\. Pemilik sudah dikabari/)
  assert.match(d.pemilik[0], /meledak/)
  assert.equal(d.kirim.length, 0)
})

test('A2: jenis ditebak dari bahan; seri ditanyakan tanpa membuka proyek', async () => {
  const d = dunia({ pesan: [P('2', 'bmkg_pagi')] })
  await perintah(d, 'buat 26 okt')
  assert.match(d.balasan[0], /belum jelas dari bahan\. Ketik buat harian 2026-10-26 atau buat penanganan 2026-10-26\./)
  assert.equal(d.proyek.size, 0)
  const d2 = dunia({ pesan: [P('2', 'bmkg_pagi'), P('4', 'satgas')] })
  await perintah(d2, 'buat 26 okt')
  assert.equal([...d2.proyek.values()][0].jenis, 'penanganan')
})

test('status tanpa tanggal: proyek pengirim yang masih terbuka; bantuan; susulan dan grup diabaikan', async () => {
  const d = dunia()
  await perintah(d, 'status')
  assert.match(d.balasan[0], /Belum ada proyek laporan yang terbuka/)
  await perintah(d, 'buat harian 26 okt')
  d.balasan.length = 0
  await perintah(d, 'status')
  assert.equal(d.balasan[0], 'P-291026-01 v1\nLaporan Kejadian Bencana Harian 26 Okt, status draf. Balas dengan revisi, atau ketik final.')
  await perintah(d, 'bantuan')
  assert.equal(d.balasan[1], BANTUAN)
  await tangani({ dari: '6299', teks: 'bantuan' }, d.ctx)
  assert.match(d.balasan[2], /Khusus pemilik: kirim ulang/)
  assert.deepEqual(await tangani({ dari: DARI, teks: 'buat harian', lama: true }, d.ctx), { status: 'susulan dibuang' })
  assert.deepEqual(await tangani({ dari: '120363@g.us', teks: 'buat harian' }, d.ctx), { status: 'bukan pemakai' })
  assert.equal(d.balasan.length, 3)
})

test('bahan masuk: jenis milik satu laporan masuk proyek terbuka pengirim tanpa balasan; bahan bersama menunggu buat', async () => {
  const d = dunia()
  const r = await tangani({ dari: DARI, teks: `[satgas] ${TGL}`, wa_id: 55 }, d.ctx)
  assert.equal(r.status, 'ditambah')
  const p = [...d.proyek.values()][0]
  assert.equal(p.jenis, 'penanganan'); assert.equal(p.tanggal, TGL)
  assert.deepEqual(p.bahan, [{ wa_id: '55', jenis_bahan: 'satgas' }])
  assert.equal(p.wa_sha, waSha(DARI, 'garam'))
  assert.equal((await tangani({ dari: DARI, teks: `[bmkg_pagi] ${TGL}`, wa_id: 56 }, d.ctx)).status, 'menunggu buat')
  assert.equal(d.balasan.length, 0)
})

test('Q7: proyek 24 jam tanpa aktivitas jadi kedaluwarsa dan pemegangnya diberi tahu', async () => {
  const d = dunia()
  await tangani({ dari: DARI, teks: `[satgas] ${TGL}`, wa_id: 55 }, d.ctx)
  const ke = []
  const hasil = await kedaluwarsa({ ...d.ctx, now: new Date(NOW.getTime() + 25 * 3600e3), kirimKe: async (t, s) => ke.push([t, s]) })
  assert.deepEqual(hasil, ['P-291026-01'])
  assert.deepEqual(d.statusLog, ['kedaluwarsa'])
  assert.equal(ke[0][0], DARI)
  assert.match(ke[0][1], /^P-291026-01\nLaporan Penanganan Pengendalian Karhutla 26 Okt ditutup otomatis/)
})

test('WA_GARAM kosong: perintah dibalas belum siap, tidak ada rute dipanggil', async () => {
  const d = dunia(); d.ctx.env.WA_GARAM = ''
  await perintah(d, 'buat harian 26 okt')
  assert.equal(d.proyek.size, 0)
  assert.match(d.balasan[0], /belum siap/)
})

test('Q6: baris nomor bot laporan (dari = bl:<wa_sha>) milik pemegang sha itu saja', async () => {
  const BOT = '6285555000111', sha = waSha(BOT, 'garam')
  const bl = (id, kunci, s = sha) => ({ ...P(id, kunci), dari: `bl:${s}` })
  const d = dunia({ pesan: [bl('1', 'rekap_koordalops_24'), bl('2', 'bmkg_pagi'), bl('3', 'pvmbg_pagi'), bl('4', 'satgas', 'f'.repeat(64)), P('5', 'satgas')] })
  await tangani({ dari: BOT, teks: 'buat harian 26 okt' }, d.ctx)
  assert.deepEqual(d.keUrai[0].bahan.map((b) => b.id).sort(), ['1', '2', '3'])
  assert.equal(d.gen().length, 1)
  assert.equal([...d.proyek.values()][0].wa_sha, sha)
})

test('1: membangun tanpa kunci hidup dipulihkan (versi 0 -> terbuka lalu bangun; versi > 0 -> draf); kunci hidup = sedang dibangun', async () => {
  const d = dunia()
  await tangani({ dari: DARI, teks: `[pvmbg_pagi] ${TGL}`, wa_id: 3 }, d.ctx) // PVMBG pagi hanya bahan harian: membuka proyek
  const p = [...d.proyek.values()][0]
  p.status = 'membangun'
  fs.mkdirSync(path.join(d.dasar, 'proyek'), { recursive: true })
  const kunci = path.join(d.dasar, 'proyek', `${p.id}.lock`)
  fs.writeFileSync(kunci, '')
  await perintah(d, 'buat harian 26 okt')
  assert.match(d.balasan.at(-1), /Sedang dibangun/); assert.equal(d.gen().length, 0)
  const lama = (Date.now() - 41 * 60e3) / 1000
  fs.utimesSync(kunci, lama, lama)
  await perintah(d, 'buat harian 26 okt')
  assert.deepEqual(d.statusLog, ['terbuka', 'membangun', 'draf'])
  assert.equal(d.gen().length, 1)
  p.status = 'membangun' // proses kedua mati sesudah v1 tercatat
  await perintah(d, 'buat harian 26 okt')
  assert.equal(d.statusLog.at(-1), 'draf')
  assert.match(d.balasan.at(-1), /^P-291026-01 v1\nDraf sudah ada/)
})

test('1: pindah status gagal diulang sekali; gagal dua kali = pemilik dikabari, tidak ditelan', async () => {
  const d = dunia({ gagalStatus: 1 })
  await perintah(d, 'buat harian 26 okt')
  assert.deepEqual(d.statusLog, ['gagal:membangun', 'membangun', 'draf'])
  assert.equal(d.pemilik.length, 0)
  const e = dunia({ gagalStatus: 2 })
  await perintah(e, 'buat harian 26 okt')
  assert.equal(e.gen().length, 0)
  assert.match(e.pemilik[0], /status gagal dipindah ke membangun/)
  assert.match(e.balasan.at(-1), /Perintah gagal diproses/)
})

test('1 dan Q7: membangun lebih dari 1 jam tanpa kunci ikut kedaluwarsa', async () => {
  const d = dunia()
  await tangani({ dari: DARI, teks: `[satgas] ${TGL}`, wa_id: 55 }, d.ctx)
  const p = [...d.proyek.values()][0]; p.status = 'membangun'
  const ke = []
  assert.deepEqual(await kedaluwarsa({ ...d.ctx, now: new Date(NOW.getTime() + 30 * 60e3), kirimKe: async (t, s) => ke.push(s) }), [])
  assert.deepEqual(await kedaluwarsa({ ...d.ctx, now: new Date(NOW.getTime() + 61 * 60e3), kirimKe: async (t, s) => ke.push(s) }), [p.id])
  assert.match(ke[0], /pembangunan terhenti lebih dari 1 jam/)
})

test('2 D12: pengirim WA_IZIN memakai semua bahan WA_IZIN dan grup operasi hari itu, bukan baris bot atau nomor asing', async () => {
  const d = dunia({ pesan: [P('1', 'rekap_koordalops_24', '6281111'), P('2', 'bmkg_pagi', '120363@g.us'), P('3', 'pvmbg_pagi'),
    { ...P('4', 'bmkg_pagi'), diterima: 99, dari: 'bl:' + 'a'.repeat(64) }, { ...P('5', 'pvmbg_pagi', '6289999'), diterima: 98 }] })
  await perintah(d, 'buat harian 26 okt')
  assert.equal(d.gen().length, 1)
  const bahan = [...d.proyek.values()][0].bahan.map((b) => b.wa_id).sort()
  assert.deepEqual(bahan, ['1', '2', '3'])
  const isi = (k) => fs.readFileSync(d.gen()[0].args[d.gen()[0].args.indexOf(k) + 1], 'utf8')
  assert.equal(isi('--bmkg'), `[bmkg_pagi] ${TGL}`) // dari grup operasi, sama dengan jalur terjadwal
})

test('4: baris PERINGATAN isian dari stderr generator masuk catatan T-DRAF', async () => {
  const d = dunia({ stderrGen: "lain\nPERINGATAN isian: isian.kejadian[0] lokasi 'Bogor': tidak ada di bahan, diabaikan\n" })
  await perintah(d, 'buat harian 26 okt')
  assert.match(d.kirim[0].caption, /Catatan:\n- Isian diabaikan generator: isian\.kejadian\[0\] lokasi 'Bogor': tidak ada di bahan, diabaikan/)
})

test('5: generator menunggu kunci bersama generator.lock milik jalur terjadwal, lalu melepasnya', async () => {
  const d = dunia()
  const kunci = path.join(d.dasar, 'generator.lock')
  fs.writeFileSync(kunci, '')
  let tunggu = 0
  d.ctx.dep.tidur = async () => { tunggu++; assert.equal(d.gen().length, 0); fs.rmSync(kunci) }
  await perintah(d, 'buat harian 26 okt')
  assert.equal(tunggu, 1)
  assert.equal(d.gen().length, 1)
  assert.equal(fs.existsSync(kunci), false)
  const opsi = d.exec.find((e) => /_ringkas\.py$/.test(e.args[0]))
  assert.ok(opsi)
})
