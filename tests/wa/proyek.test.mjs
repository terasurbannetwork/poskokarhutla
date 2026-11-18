// Uji mesin proyek bot laporan (BL-08, BL-10; RENCANA-UJI T2, T3, T6, T7, T8, T15, T22) tanpa Claude API, Worker, python, atau WhatsApp: semua disuntik.
// Deck palsu: PPTX berisi JSON inventaris [{slide, shape, teks}]; ubah.py palsu (inventaris, terapkan, pratinjau) dan pdf.py palsu bekerja di atasnya.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { tangani, klasifikasi, parsePerintah, keIsianGenerator, tanpaKunci, kedaluwarsa, waSha, BANTUAN, ulangFinal } from '../../scripts/wa/proyek.mjs'
import { GalatClaude, validasiOperasi } from '../../scripts/wa/claude.mjs'
import { LAPORAN } from '../../scripts/wa/otomatis.mjs'

const NOW = new Date('2026-10-29T01:00:00Z') // 08.00 WIB
const TGL = '2026-10-26'
const DARI = '6281234567890'
const kenali = (teks) => (String(teks).match(/^\[(\w+)\]/) || [])[1] || null
const tanggalIsi = (t) => String(t).split('] ')[1]
const P = (id, kunci, dari = DARI) => ({ id, diterima: Number(id), dari, teks: `[${kunci}] ${TGL}`, nama_berkas: '', ada_berkas: 0 })
const LENGKAP = () => [P('1', 'rekap_koordalops_24'), P('2', 'bmkg_pagi'), P('3', 'pvmbg_pagi')]
const SISTEM_HURUF = /[·—–]|\p{Extended_Pictographic}/u
const DECK = () => [{ slide: 1, shape: 's1_judul', teks: 'LAPORAN HARIAN' }, { slide: 2, shape: 's2_kpi_hotspot', teks: 'HOTSPOT\n1.234' },
  { slide: 2, shape: 's2_ringkas', teks: 'Banjir di Bogor' }, { slide: 3, shape: 's3_rencana', teks: 'Rencana aksi' }]
const KUNCI = () => [{ slide: 2, shape: 's2_kpi_hotspot', angka: 'hotspot' }]
const bacaDeck = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))

function dunia({ pesan = LENGKAP(), berkas = {}, claude, ops, ocr, tahanGenerator, now = NOW, stderrGen = '', gagalStatus = 0, periksa = null, deck = DECK } = {}) {
  const dasar = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-proyek-'))
  const balasan = [], kirim = [], exec = [], keUrai = [], keOperasi = [], pemilik = [], versi = [], statusLog = [], kePeriksa = []
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
        // seperti blProyekBuka: proyek yang sudah tidak aktif tidak dipakai lagi, kombinasi sama membuka proyek baru
        if (proyek.has(k) && !['terbuka', 'bertanya', 'membangun', 'draf'].includes(proyek.get(k).status)) { const lama = proyek.get(k); proyek.delete(k); proyek.set('lama:' + lama.id, lama) }
        if (!proyek.has(k)) proyek.set(k,{ id: `P-291026-${String(++nomor).padStart(2, '0')}`, wa_sha: b.wa_sha, jenis: b.jenis, tanggal: b.tanggal, status: 'terbuka', versi: 0, diubah: now.getTime(), bahan: [] })
        const p = proyek.get(k); p.bahan.push(...(b.bahan || []))
        return jawab({ proyek: { ...p } })
      }
      if (url.pathname === '/api/wa/proyek/status') {
        if (gagalStatus > 0) { gagalStatus--; statusLog.push('gagal:' + b.ke); return { ok: false, status: 503, text: async () => 'sibuk' } }
        if (dep.tolakStatus?.(b)) { statusLog.push('gagal:' + b.ke); return { ok: false, status: 503, text: async () => 'sibuk' } }
        const p = [...proyek.values()].find((x) => x.id === b.id); statusLog.push(b.ke); p.status = b.ke
        if (b.drive_url) p.drive_url = b.drive_url
        return jawab({ ok: true, proyek: p })
      }
      if (url.pathname === '/api/wa/proyek/versi' && (o.method || 'GET') === 'GET') {
        const id = url.searchParams.get('id'), n = url.searchParams.get('n'), nama = url.searchParams.get('berkas')
        const vs = versi.filter((v) => v.proyek === id)
        if (n == null) return jawab({ versi: vs.map((v) => ({ n: Number(v.n), instruksi: v.instruksi, dibuat: v.dibuat })) })
        const v = vs.find((x) => x.n === n)
        if (!v) return { ok: false, status: 404, text: async () => 'versi tidak ada' }
        if (nama != null) return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(v.pptxIsi).buffer }
        return jawab({ versi: { n: Number(v.n), instruksi: v.instruksi }, isian: v.isian, ubah: v.ubah })
      }
      if (url.pathname === '/api/wa/proyek/versi') {
        const f = o.body
        const p = [...proyek.values()].find((x) => x.id === f.get('proyek'))
        if (Number(f.get('n')) !== p.versi + 1) return { ok: false, status: 409, text: async () => 'versi sudah ada' }
        versi.push({ proyek: f.get('proyek'), n: f.get('n'), kunci: [...f.keys()], isian: JSON.parse(await f.get('isian').text()), peringatan: f.get('peringatan'),
          instruksi: f.get('instruksi'), ubah: f.get('ubah') ? JSON.parse(await f.get('ubah').text()) : null, pptxIsi: await f.get('pptx').text(), dibuat: now.getTime() + versi.length * 60e3 })
        p.versi = Number(f.get('n'))
        return jawab({ ok: true })
      }
      throw new Error('fetch tak terduga ' + u)
    },
    exec: async (cmd, args) => {
      exec.push({ cmd, args })
      if (cmd === 'pdftotext') return { stdout: fs.readFileSync(args[1], 'utf8').replace(/^PDF:/, '') }
      if (args[0] === '-c') return { stdout: 'a,b\n1,2\n' + fs.readFileSync(args[2], 'utf8') }
      if (String(args[0]).endsWith('ubah.py') && args[1] === 'inventaris') return { stdout: JSON.stringify(bacaDeck(args[2])) }
      if (String(args[0]).endsWith('ubah.py') && args[1] === 'terapkan') {
        const inv = bacaDeck(args[2]), daftarOps = JSON.parse(fs.readFileSync(args[3], 'utf8'))
        const kunci = args[4] === '-' ? [] : JSON.parse(fs.readFileSync(args[4], 'utf8'))
        const hasil = { diterapkan: [], dilewati: [], tanya: [] }
        daftarOps.forEach((op, ke) => {
          if (op.jenis === 'catatan') { inv.push({ slide: op.slide, shape: `s${op.slide}_catatan_bot_1`, teks: op.teks }); hasil.diterapkan.push(op); return }
          const sh = inv.find((x) => x.slide === op.slide && x.shape === op.shape)
          if (!sh) return hasil.dilewati.push({ ke, op, alasan: 'shape tidak ada' })
          if (kunci.some((k) => k.slide === op.slide && k.shape === op.shape)) return hasil.dilewati.push({ ke, op, alasan: 'shape terkunci: memuat angka sistem' })
          if (sh.teks !== op.teks_lama) return hasil.dilewati.push({ ke, op, alasan: 'teks_lama tidak cocok dengan teks sekarang' })
          sh.teks = op.teks_baru; hasil.diterapkan.push(op)
        })
        fs.writeFileSync(args[5], JSON.stringify(inv))
        return { stdout: JSON.stringify(hasil) }
      }
      if (String(args[0]).endsWith('ubah.py')) {
        const dir = args[4]; fs.mkdirSync(dir, { recursive: true })
        const png = String(args[3]).split(',').map((n) => path.join(dir, `pratinjau-${n}.png`))
        for (const f of png) fs.writeFileSync(f, 'png')
        return { stdout: JSON.stringify({ png, metode: 'uji' }) }
      }
      if (String(args[0]).endsWith('pdf.py')) {
        const pdf = path.join(args[2], path.basename(args[1]).replace(/\.pptx$/, '.pdf'))
        fs.writeFileSync(pdf, 'PDF ' + fs.readFileSync(args[1], 'utf8'))
        return { stdout: pdf }
      }
      if (tahanGenerator) await tahanGenerator
      const out = args[args.indexOf('--out') + 1], tgl = args[args.indexOf('--tanggal') + 1]
      const lap = LAPORAN.find((l) => l.args(tgl, { rekap_koordalops_24: 'k', bmkg_pagi: 'b', satgas: 's', pvmbg_pagi: 'g' }, 'o')[0] === args[0])
      fs.writeFileSync(path.join(out, `${lap.berkas(tgl)}.pdf`), 'x')
      fs.writeFileSync(path.join(out, `${lap.berkas(tgl)}.pptx`), JSON.stringify(deck()))
      fs.writeFileSync(path.join(out, `${lap.berkas(tgl)}.kunci.json`), JSON.stringify(KUNCI()))
      return { stdout: '', stderr: stderrGen }
    },
    ocr: ocr || (async () => null),
    claude: {
      urai: async (bahan, jenis) => { keUrai.push({ bahan, jenis }); return claude ? claude(bahan, jenis) : { isian: [], pertentangan: [], gagal: [] } },
      // Claude palsu untuk revisi: ops(kalimat, inventaris) -> operasi mentah, divalidasi validasiOperasi asli (kunci, teks_lama).
      operasi: async (inv, kunci, riwayat, kalimat) => {
        keOperasi.push({ inv, kunci, riwayat, kalimat })
        const mentah = ops ? await ops(kalimat, inv) : []
        return { ...validasiOperasi(mentah, inv, kunci), ringkasan: '' }
      },
    },
    periksa: periksa && (async (a) => { kePeriksa.push(a); return periksa(a) }),
  }
  const ctx = {
    env: { WORKER_URL: 'http://w', WA_MESIN: 'k', WA_GARAM: 'garam', PEMILIK: '6299', WA_IZIN: `${DARI},6299,6281111`, WA_PY_BIN: '/opt/py/bin' },
    dep, now, dasar, kenali, tanggalIsi, log: () => {},
    balas: async (t) => { balasan.push(t) },
    balasFile: async (p, nama, caption, mime) => { kirim.push({ p, nama, caption, mime }) },
    kabariPemilik: async (t) => { pemilik.push(t) },
  }
  const semua = () => [...balasan, ...kirim.map((k) => k.caption).filter(Boolean)]
  return { ctx, dasar, balasan, kirim, exec, keUrai, keOperasi, kePeriksa, pemilik, versi, statusLog, proyek, semua,
    gen: () => exec.filter((e) => /_(ringkas|otomatis)\.py$/.test(e.args[0])), terapkan: () => exec.filter((e) => e.args[1] === 'terapkan') }
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

// ---------- BL-10: revisi, kunci, versi, balik, pptx, batal ----------
const GANTI = (slide, shape, lama, baru) => ({ jenis: 'ganti_teks', slide, shape, teks_lama: lama, teks_baru: baru })
// v1 siap, lalu catatan uji dikosongkan supaya tiap uji menghitung kiriman revisinya sendiri.
async function drafV1(o = {}) {
  const d = dunia(o)
  await perintah(d, 'buat harian 26 okt')
  assert.equal(d.versi.length, 1)
  for (const a of [d.balasan, d.kirim, d.statusLog, d.exec, d.kePeriksa]) a.length = 0
  return d
}
const sesudah = (d, f) => { for (const a of [d.balasan, d.kirim, d.statusLog, d.exec]) a.length = 0; return f() }

test('T6: operasi ke shape terkunci ditolak, T-TOLAK-KUNCI (nama, nilai, asal, tawaran catatan), tanpa bangun ulang dan tanpa versi baru', async () => {
  const d = await drafV1({ ops: () => [GANTI(2, 's2_kpi_hotspot', 'HOTSPOT\n1.234', 'HOTSPOT\n1.300')] })
  const r = await perintah(d, 'hotspot di slide 2 jadi 1.300')
  assert.equal(r.status, 'revisi')
  assert.equal(d.keOperasi.length, 1)
  assert.deepEqual(d.keOperasi[0].kunci, KUNCI(), 'kunci deck terakhir ikut ke Claude')
  assert.equal(d.gen().length, 0); assert.equal(d.terapkan().length, 0)
  assert.equal(d.versi.length, 1)
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.equal(d.kirim.length, 0); assert.equal(d.balasan.length, 1)
  assert.match(d.balasan[0], /^P-291026-01 v1\nRevisi tidak diterapkan, draf tetap v1\.\nHotspot 1\.234 di slide 2 adalah angka sistem \(dari sistem, hari D-1\), tidak diubah lewat revisi\.\nBila angka lapangan berbeda, minta catatan, misalnya: tambahkan catatan di slide 2/)
  for (const t of d.semua()) assert.doesNotMatch(t, SISTEM_HURUF, t)
})

test('T7: versi n = generator dibangun ulang + operasi 1..n; tepat 2 kiriman per revisi (pratinjau slide pertama yang berubah, lalu PDF T-DRAF)', async () => {
  let giliran = 0
  const d = await drafV1({ ops: () => [++giliran === 1 ? GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'LAPORAN HARIAN BNPB') : GANTI(3, 's3_rencana', 'Rencana aksi', 'Rencana aksi BPBD')] })
  await perintah(d, 'judul tambahkan BNPB')
  assert.equal(d.gen().length, 1, 'generator dijalankan ulang dari bahan')
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.equal(d.versi[1].n, '2')
  assert.deepEqual(d.versi[1].ubah.operasi, [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'LAPORAN HARIAN BNPB')])
  assert.equal(d.versi[1].instruksi, 'revisi: judul tambahkan BNPB')
  assert.ok(d.versi[1].kunci.includes('ubah'))
  assert.deepEqual(d.kirim.map((k) => path.extname(k.nama)), ['.png', '.pdf'])

  await sesudah(d, () => perintah(d, 'rencana aksi sebut BPBD'))
  assert.equal(d.keOperasi[1].inv.find((x) => x.shape === 's1_judul').teks, 'LAPORAN HARIAN BNPB', 'Claude melihat deck versi terakhir')
  assert.deepEqual(d.keOperasi[1].riwayat, [JSON.stringify(GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'LAPORAN HARIAN BNPB'))])
  const t = d.terapkan()[0].args
  assert.equal(JSON.parse(fs.readFileSync(t[3], 'utf8')).length, 2, 'operasi 1..n diterapkan ulang di atas deck baru')
  assert.equal(d.gen().length, 1)
  const akhir = bacaDeck(d.kirim[1].p.replace(/\.pdf$/, '.pptx'))
  assert.equal(akhir.find((x) => x.shape === 's1_judul').teks, 'LAPORAN HARIAN BNPB')
  assert.equal(akhir.find((x) => x.shape === 's3_rencana').teks, 'Rencana aksi BPBD')
  assert.equal(d.versi[2].ubah.operasi.length, 2)
  assert.equal(d.kirim.length, 2)
  assert.equal(d.kirim[0].caption, 'P-291026-01 v3\nPratinjau v3, slide 3. PDF menyusul.')
  assert.ok(d.exec.some((e) => e.args[1] === 'pratinjau' && e.args[3] === '3'), 'pratinjau slide yang berubah')
  assert.ok(d.exec.some((e) => String(e.args[0]).endsWith('pdf.py')), 'PDF dari deck yang sudah diubah')
  assert.match(fs.readFileSync(d.kirim[1].p, 'utf8'), /Rencana aksi BPBD/)
  assert.equal(d.kirim[1].caption, 'P-291026-01 v3\nDraf Laporan Kejadian Bencana Harian 26 Okt.\nPerubahan:\n- Slide 3: "Rencana aksi" diganti "Rencana aksi BPBD".\nBalas dengan revisi, atau ketik final.')
  assert.ok(!d.kirim.some((k) => /\.pptx$/i.test(k.nama)), 'revisi tidak mengirim PPTX (Q1)')
  for (const t2 of d.semua()) assert.doesNotMatch(t2, SISTEM_HURUF, t2)
})

test('T7: operasi lama yang teks_lama-nya tidak cocok lagi sesudah bahan berubah dilewati dan dilaporkan; operasi baru dengan teks_lama salah tidak membuat versi', async () => {
  let judul = 'LAPORAN HARIAN', giliran = 0
  const d = await drafV1({ deck: () => DECK().map((x) => x.shape === 's1_judul' ? { ...x, teks: judul } : x),
    ops: () => [[GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL BARU')], [GANTI(3, 's3_rencana', 'Rencana aksi', 'Rencana BPBD')], [GANTI(2, 's2_ringkas', 'Banjir', 'Banjir besar')]][giliran++] })
  await perintah(d, 'ganti judul')
  judul = 'LAPORAN HARIAN (revisi bahan)' // bahan berubah: generator menulis judul lain
  await sesudah(d, () => perintah(d, 'rencana sebut BPBD'))
  assert.equal(d.versi.length, 3)
  assert.deepEqual(d.versi[2].ubah.operasi, [GANTI(3, 's3_rencana', 'Rencana aksi', 'Rencana BPBD')], 'operasi yang dilewati tidak ikut versi')
  assert.match(d.kirim[1].caption, /\nDilewati:\n- Slide 1: "LAPORAN HARIAN" diganti "JUDUL BARU": perubahan lama, teks di slide sudah berbeda\. Kirim ulang revisinya bila masih perlu\.\n/)
  // teks_lama sebagian (lolos validasi Claude) tapi tidak sama persis saat diterapkan: tidak ada versi baru
  await sesudah(d, () => perintah(d, 'banjir jadi banjir besar'))
  assert.equal(d.versi.length, 3)
  assert.equal(d.kirim.length, 0)
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.match(d.balasan[0], /^P-291026-01 v3\nRevisi tidak diterapkan, draf tetap v3\.\nSlide 2: "Banjir" diganti "Banjir besar": teks di slide sudah berbeda/)
})

test('T8: balik v2 membuat versi baru dengan operasi v2, tanpa Claude; versi lama tidak berubah; v tidak ada dan v terakhir ditolak', async () => {
  let giliran = 0
  const d = await drafV1({ ops: () => [++giliran === 1 ? GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL A') : GANTI(3, 's3_rencana', 'Rencana aksi', 'Rencana B')] })
  await perintah(d, 'judul A')
  await perintah(d, 'rencana B')
  const lama = JSON.stringify(d.versi)
  await sesudah(d, () => perintah(d, 'balik v2'))
  assert.equal(d.keOperasi.length, 2, 'balik tidak memanggil Claude')
  assert.equal(d.versi.length, 4)
  assert.equal(JSON.stringify(d.versi.slice(0, 3)), lama, 'versi lama utuh (append-only)')
  assert.deepEqual(d.versi[3].ubah.operasi, d.versi[1].ubah.operasi)
  assert.equal(d.versi[3].ubah.balik, 2)
  assert.equal(d.versi[3].instruksi, 'balik v2')
  assert.deepEqual(d.kirim.map((k) => path.extname(k.nama)), ['.png', '.pdf'])
  assert.match(d.kirim[1].caption, /^P-291026-01 v4\n.*\nPerubahan:\n- Isi sama dengan v2\.\n/)
  const deck4 = bacaDeck(d.kirim[1].p.replace(/\.pdf$/, '.pptx'))
  assert.equal(deck4.find((x) => x.shape === 's3_rencana').teks, 'Rencana aksi')
  await sesudah(d, () => perintah(d, 'balik v9'))
  assert.match(d.balasan[0], /^P-291026-01 v4\nVersi v9 tidak ada\. Versi terakhir v4/)
  await sesudah(d, () => perintah(d, 'balik 4'))
  assert.match(d.balasan[0], /v4 sudah versi terakhir/)
  assert.equal(d.versi.length, 4); assert.deepEqual(d.statusLog, [])
  // balik v1: tanpa operasi, deck generator apa adanya
  await sesudah(d, () => perintah(d, 'balik ke v1'))
  assert.deepEqual(d.versi[4].ubah.operasi, [])
  assert.equal(d.terapkan().length, 0)
})

test('tanya: kalimat ambigu dibalas pertanyaan bernomor, status kembali draf, tanpa bangun ulang', async () => {
  const d = await drafV1({ ops: () => [{ jenis: 'tanya', pertanyaan: 'Slide mana yang dimaksud — 2 atau 3?' }] })
  await perintah(d, 'ganti yang itu')
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.equal(d.gen().length, 0); assert.equal(d.versi.length, 1)
  assert.equal(d.balasan[0], 'P-291026-01 v1\nRevisi belum diterapkan, ada yang perlu dipastikan:\n1. Slide mana yang dimaksud, 2 atau 3?\nBalas dengan kalimat revisi yang lebih rinci.')
})

test('revisi sebagian: operasi sah diterapkan, yang terkunci dijelaskan di keterangan PDF (tetap 2 kiriman)', async () => {
  const d = await drafV1({ ops: () => [GANTI(2, 's2_kpi_hotspot', 'HOTSPOT\n1.234', 'HOTSPOT\n9'), GANTI(2, 's2_ringkas', 'Banjir di Bogor', 'Banjir di Kabupaten Bogor')] })
  await perintah(d, 'ganti hotspot dan ringkasan')
  assert.equal(d.versi.length, 2)
  assert.equal(d.kirim.length, 2)
  assert.equal(d.kirim[0].caption, 'P-291026-01 v2\nPratinjau v2, slide 2. PDF menyusul.')
  assert.match(d.kirim[1].caption, /Perubahan:\n- Slide 2: "Banjir di Bogor" diganti "Banjir di Kabupaten Bogor"\.\nTidak diubah:\n- Hotspot 1\.234 di slide 2 adalah angka sistem/)
  assert.equal(d.versi[1].ubah.ditolak[0].kunci, true)
})

test('periksa (BL-11) ada: dipanggil dengan pptx, pdf, jenis, tanggal, angka; peringatannya masuk ringkasan draf v1 dan T-DRAF revisi', async () => {
  const d = dunia({ periksa: () => ({ peringatan: ['Angka hotspot hari ini 1.234 — lebih dari 3 kali median.'] }), ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')],
    claude: () => ({ gagal: [], pertentangan: [], isian: [{ medan: 'kabupaten', kelompok: 'k1', nilai: 'Bogor' }, { medan: 'meninggal', kelompok: 'k1', nilai: '3 jiwa' }, { medan: 'meninggal', kelompok: 'k2', nilai: '2' }] }) })
  await perintah(d, 'buat harian 26 okt')
  const a = d.kePeriksa[0]
  assert.match(a.pptx, /\.pptx$/); assert.match(a.pdf, /\.pdf$/)
  assert.equal(a.jenis, 'harian'); assert.equal(a.tanggal, TGL)
  assert.deepEqual(a.angka, { hotspot: 1234, meninggal: 5 })
  assert.equal(d.kirim.length, 2)
  assert.match(d.kirim[0].caption, /\nPemeriksaan:\n- Angka hotspot hari ini 1\.234, lebih dari 3 kali median\.\n/)
  assert.match(d.versi[0].peringatan, /lebih dari 3 kali median/)
  await sesudah(d, () => perintah(d, 'judul ganti'))
  assert.equal(d.kePeriksa.length, 2)
  assert.equal(d.kirim.length, 2)
  assert.match(d.kirim[1].caption, /\nPemeriksaan:\n- Angka hotspot hari ini 1\.234, lebih dari 3 kali median\.\nBalas dengan revisi/)
  for (const t of d.semua()) assert.doesNotMatch(t, SISTEM_HURUF, t)
})

test('periksa tidak ada atau galat: draf tetap terkirim tanpa bagian Pemeriksaan', async () => {
  const d = dunia() // periksa: null = modul tidak ada
  await perintah(d, 'buat harian 26 okt')
  assert.doesNotMatch(d.kirim[0].caption, /Pemeriksaan/)
  const e = dunia({ periksa: () => { throw new Error('python hilang') } })
  await perintah(e, 'buat harian 26 okt')
  assert.equal(e.kirim.length, 2)
  assert.doesNotMatch(e.kirim[0].caption, /Pemeriksaan/)
  const lambat = dunia({ periksa: () => new Promise(() => {}) })
  lambat.ctx.periksaMs = 20
  await perintah(lambat, 'buat harian 26 okt')
  assert.equal(lambat.kirim.length, 2, 'periksa yang menggantung tidak menahan draf')
})

test('versi: riwayat dengan jam WIB; pptx mengirim PPTX terakhir (unduh dari rute bila berkas lokal hilang)', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  await perintah(d, 'judul ganti')
  await sesudah(d, () => perintah(d, 'versi'))
  assert.equal(d.balasan[0], 'P-291026-01 v2\nRiwayat versi Laporan Kejadian Bencana Harian 26 Okt:\nv1 29 Okt 08.00, buat\nv2 29 Okt 08.01, revisi: judul ganti\nKetik balik vN untuk membuat versi baru yang sama dengan vN.')
  await sesudah(d, () => perintah(d, 'pptx'))
  assert.equal(d.kirim.length, 1)
  assert.match(d.kirim[0].nama, /\.pptx$/)
  assert.equal(d.kirim[0].mime, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  assert.equal(d.kirim[0].caption, 'P-291026-01 v2\nPPTX draf Laporan Kejadian Bencana Harian 26 Okt.')
  assert.equal(bacaDeck(d.kirim[0].p)[0].teks, 'JUDUL')
  fs.rmSync(path.join(d.dasar, 'keluaran', 'proyek'), { recursive: true })
  await sesudah(d, () => perintah(d, 'pptx'))
  assert.equal(bacaDeck(d.kirim[0].p)[0].teks, 'JUDUL', 'diunduh dari versi tersimpan')
})

test('batal menutup proyek; sesudahnya kalimat bebas bukan revisi; bahan dikenali saat draf tetap bahan', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  assert.equal((await tangani({ dari: DARI, teks: `[satgas] ${TGL}`, wa_id: 77 }, d.ctx)).status, 'ditambah')
  assert.equal(d.keOperasi.length, 0)
  assert.equal((await tangani({ dari: '6281111', teks: 'judul ganti' }, d.ctx)).status, 'diabaikan', 'nomor lain tanpa draf: bukan revisi')
  const harian = [...d.proyek.values()].find((x) => x.jenis === 'harian')
  await perintah(d, 'batal')
  assert.equal(harian.status, 'batal', 'draf yang dibatalkan, bukan proyek terbuka lain')
  assert.equal(d.balasan.at(-1), 'P-291026-01 v1\nLaporan Kejadian Bencana Harian 26 Okt dibatalkan, tanpa unggah. Ketik buat untuk memulai lagi.')
  assert.equal((await perintah(d, 'judul ganti')).status, 'diabaikan')
  assert.equal(d.keOperasi.length, 0)
  await perintah(d, 'versi')
  assert.match(d.balasan.at(-1), /^Belum ada draf/)
})

test('revisi: GalatClaude dan generator gagal mengembalikan draf, pemilik dikabari, versi tetap', async () => {
  const d = await drafV1()
  d.ctx.dep.claude.operasi = async () => { throw new GalatClaude('batas_belanja', 'x') }
  await perintah(d, 'judul ganti')
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.equal(d.balasan[0], 'P-291026-01 v1\nKuota hari ini habis, bot lanjut besok.')
  assert.match(d.pemilik.at(-1), /Claude gagal \(batas_belanja\)/)
  const e = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  const asli = e.ctx.dep.exec
  e.ctx.dep.exec = async (cmd, args, o) => { if (/_(ringkas|otomatis)\.py$/.test(args[0])) throw Object.assign(new Error('x'), { stderr: 'meledak' }); return asli(cmd, args, o) }
  await perintah(e, 'judul ganti')
  assert.deepEqual(e.statusLog, ['membangun', 'draf'])
  assert.equal(e.versi.length, 1); assert.equal(e.kirim.length, 0)
  assert.match(e.balasan.at(-1), /^P-291026-01 v1\nRevisi v2 gagal dibangun\. Pemilik sudah dikabari, draf v1 tetap berlaku\.$/)
})

test('parsePerintah BL-10: versi, pptx, batal, balik vN', () => {
  const p = (t) => parsePerintah(t, NOW)
  assert.deepEqual(p('versi'), { aksi: 'versi' })
  assert.deepEqual(p('PPTX'), { aksi: 'pptx' })
  assert.deepEqual(p('batal.'), { aksi: 'batal' })
  assert.deepEqual(p('balik v2'), { aksi: 'balik', n: 2 })
  assert.deepEqual(p('Balik ke v12'), { aksi: 'balik', n: 12 })
  assert.equal(p('balik ke versi yang tadi'), null)
  assert.equal(p('versinya salah'), null)
})

// ---------- tinjauan BL-09/10/11 ----------
test('final dikenal sebagai perintah: tidak pernah ke Claude atau revisi', async () => {
  assert.deepEqual(parsePerintah('final', NOW), { aksi: 'final' })
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  pasangFinal(d)
  assert.equal(await klasifikasi({ dari: DARI, teks: 'Final' }, d.ctx), 'perintah')
  for (const t of ['versi', 'balik v1', 'pptx', 'status']) assert.equal(await klasifikasi({ dari: DARI, teks: t }, d.ctx), 'perintah')
  await perintah(d, 'Final')
  assert.equal(d.keOperasi.length, 0)
})

// ---------- BL-12: final (T10) ----------
// Drive palsu. driveGagal = jumlah unggah yang gagal lebih dulu. dep.unggah (/api/wa/hasil) dipasang hanya untuk membuktikan tidak dipanggil (D13).
function pasangFinal(d, { driveGagal = 0, revisiAda = [], kirimGagal = 0 } = {}) {
  const f = { folderBaru: [], unggahan: [], hasil: [], keKirimKe: [], revisiAda: [...revisiAda] }
  d.ctx.env.PENERIMA = '6288800001,6288800002'
  d.ctx.dep.drive = {
    folderRevisi: async ({ tanggal, laporan }) => {
      const n = Math.max(0, ...f.revisiAda) + 1
      f.revisiAda.push(n); f.folderBaru.push({ tanggal, laporan, n })
      return { id: 'R' + n, nama: `Revisi ${n}`, n }
    },
    unggahKeFolder: async ({ folder, berkas }) => {
      if (driveGagal > 0) { driveGagal--; throw new Error('Drive HTTP 503') }
      f.unggahan.push({ folder: folder.id, nama: berkas.map((b) => path.basename(b.p)) })
      return `https://drive.google.com/drive/folders/${folder.id}`
    },
  }
  d.ctx.dep.unggah = async (a) => { f.hasil.push(a) }
  d.ctx.kirimKe = async (t, s) => { if (kirimGagal > 0) { kirimGagal--; throw new Error('gateway mati') } f.keKirimKe.push({ t, s }) }
  return f
}
const ulang = (d, now) => ulangFinal({ ...d.ctx, balas: undefined, balasFile: undefined, ...(now ? { now } : {}) })
const proyekId = (d, id = 'P-291026-01') => [...d.proyek.values()].find((x) => x.id === id)
const finalJson = (d) => JSON.parse(fs.readFileSync(path.join(d.dasar, 'proyek', 'final.json'), 'utf8')).proyek

test('T10: final mengirim PPTX lalu PDF ke pemegang, unggah Drive Revisi N, ditutup dengan drive_url, T-FINAL; tanpa /api/wa/hasil (D13); tidak ke PENERIMA', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  await perintah(d, 'judul ganti')
  const f = pasangFinal(d)
  for (const a of [d.balasan, d.kirim, d.statusLog]) a.length = 0
  const r = await perintah(d, 'final')
  assert.equal(r.status, 'ditutup')
  assert.deepEqual(d.statusLog, ['final', 'ditutup'])
  assert.deepEqual(d.kirim.map((k) => [path.extname(k.nama), k.mime]), [['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'], ['.pdf', 'application/pdf']])
  assert.equal(bacaDeck(d.kirim[0].p)[0].teks, 'JUDUL', 'PPTX versi terakhir (v2)')
  assert.equal(d.kirim[0].caption, 'P-291026-01 v2\nPPTX final Laporan Kejadian Bencana Harian 26 Okt.')
  assert.deepEqual(f.folderBaru, [{ tanggal: TGL, laporan: 'harian', n: 1 }])
  assert.deepEqual(f.unggahan, [{ folder: 'R1', nama: ['Laporan Kejadian Bencana Harian 261026.pptx', 'Laporan Kejadian Bencana Harian 261026.pdf'] }])
  assert.deepEqual(f.hasil, [], 'D13: final bot tidak menimpa arsip terjadwal')
  const p = proyekId(d)
  assert.equal(p.status, 'ditutup'); assert.equal(p.drive_url, 'https://drive.google.com/drive/folders/R1')
  assert.equal(d.balasan.length, 1)
  assert.equal(d.balasan[0], 'P-291026-01 v2\nFinal Laporan Kejadian Bencana Harian 26 Okt, versi v2.\nFolder Drive Revisi 1: https://drive.google.com/drive/folders/R1\nRiwayat versi:\nv1 29 Okt 08.00, buat\nv2 29 Okt 08.01, revisi: judul ganti\nProyek ditutup. Pesan berikutnya membuka proyek baru.')
  assert.ok(!d.semua().some((t) => SISTEM_HURUF.test(t)))
  assert.deepEqual(f.keKirimKe, [], 'Q10: tidak ada kiriman ke PENERIMA atau nomor lain')
  assert.equal(d.pemilik.length, 0)
  assert.deepEqual(finalJson(d), {})
  assert.deepEqual(await ulang(d), [], 'tidak ada yang tertunda')
})

test('T10: Drive gagal = status tetap final, pemilik dikabari sekali, ulangFinal melanjutkan ke folder Revisi yang sama lalu ditutup dan T-FINAL lewat kirimKe', async () => {
  const d = await drafV1()
  const f = pasangFinal(d, { driveGagal: 2, revisiAda: [1, 3] })
  assert.equal((await perintah(d, 'final')).status, 'final tertunda')
  assert.deepEqual(d.statusLog, ['final'])
  assert.equal(proyekId(d).status, 'final')
  assert.equal(d.kirim.length, 2, 'PPTX dan PDF tetap terkirim ke pemegang')
  assert.match(d.balasan.at(-1), /^P-291026-01 v1\nFinal v1 diterima\. Penutupan belum selesai, diulang otomatis tiap 10 menit\. Tautan Drive menyusul\.$/)
  assert.equal(d.pemilik.length, 1); assert.match(d.pemilik[0], /P-291026-01 v1: unggah Google Drive gagal, diulang otomatis/)
  // final lagi saat tertunda: melanjutkan penutupan (Drive masih gagal), tanpa mengirim berkas lagi
  await perintah(d, 'final')
  assert.equal(d.kirim.length, 2); assert.match(d.balasan.at(-1), /Penutupan belum selesai/)
  assert.equal(d.pemilik.length, 1, 'kabar pemilik sekali per proyek')
  assert.deepEqual(await ulang(d), [{ id: 'P-291026-01', status: 'ditutup' }])
  assert.deepEqual(f.folderBaru.map((x) => x.n), [4], 'satu folder Revisi saja, nomor sesudah Revisi 3 yang sudah ada')
  assert.deepEqual(f.unggahan.map((x) => x.folder), ['R4'])
  assert.equal(proyekId(d).status, 'ditutup'); assert.equal(proyekId(d).drive_url, 'https://drive.google.com/drive/folders/R4')
  assert.equal(f.keKirimKe.length, 1); assert.equal(f.keKirimKe[0].t, DARI, 'T-FINAL hanya ke pemegang')
  assert.match(f.keKirimKe[0].s, /^P-291026-01 v1\nFinal Laporan Kejadian Bencana Harian 26 Okt, versi v1\.\nFolder Drive Revisi 4: https:\/\/drive\.google\.com\/drive\/folders\/R4\n/)
  assert.deepEqual(await ulang(d), [])
})

test('T10: jawaban pindah ke final hilang (Worker sudah final) = dilanjutkan; ditutup gagal diulang tanpa unggah ulang', async () => {
  const d = await drafV1()
  const f = pasangFinal(d)
  let hilang = 1, tolakTutup = 1
  d.ctx.dep.tolakStatus = (b) => {
    if (b.ke === 'final' && hilang-- > 0) { proyekId(d).status = 'final'; return true } // Worker menerima, jawabannya hilang
    return b.ke === 'ditutup' && tolakTutup-- > 0
  }
  assert.equal((await perintah(d, 'final')).status, 'final tertunda')
  assert.equal(d.kirim.length, 2); assert.equal(f.unggahan.length, 1)
  assert.match(d.pemilik.at(-1), /pindah status ke ditutup gagal/)
  assert.deepEqual(await ulang(d), [{ id: 'P-291026-01', status: 'ditutup' }])
  assert.equal(f.unggahan.length, 1, 'Drive tidak diunggah ulang'); assert.equal(f.folderBaru.length, 1)
  assert.equal(f.keKirimKe.length, 1)
})

test('T10: mati sesudah final.json tercatat dan sebelum pindah status = ulangFinal memindahkan ke final dan menutup; final lagi di proyek final tanpa catatan lokal = dilanjutkan', async () => {
  const d = await drafV1()
  const f = pasangFinal(d)
  // tiruan mati: pindah ke final melempar galat tak terduga dan Worker tetap draf
  let mati = true
  d.ctx.dep.tolakStatus = (b) => b.ke === 'final' && mati
  assert.equal((await perintah(d, 'final')).status, 'final tertunda')
  assert.equal(proyekId(d).status, 'draf'); assert.equal(d.kirim.length, 0, 'berkas hanya dikirim sesudah status final'); assert.equal(f.folderBaru.length, 0)
  assert.equal(finalJson(d)['P-291026-01'].n, 1, 'keadaan tercatat sebelum pindah status')
  mati = false
  assert.deepEqual(await ulang(d), [{ id: 'P-291026-01', status: 'ditutup' }])
  assert.equal(proyekId(d).status, 'ditutup'); assert.equal(f.keKirimKe.length, 1)

  // Worker final, final.json hilang: `final` melanjutkan penutupan, bukan "Belum ada draf"
  const e = await drafV1()
  const g = pasangFinal(e)
  proyekId(e).status = 'final'
  const r = await perintah(e, 'final')
  assert.equal(r.status, 'ditutup')
  assert.equal(proyekId(e).status, 'ditutup'); assert.equal(g.unggahan.length, 1)
  assert.match(e.balasan.at(-1), /^P-291026-01 v1\nFinal Laporan Kejadian Bencana Harian 26 Okt, versi v1\./)
})

test('T10: kirim T-FINAL gagal = keadaan disimpan, diulang, tidak pernah dua kali; lewat 24 jam berhenti dan pemilik dikabari sekali', async () => {
  const d = await drafV1()
  const f = pasangFinal(d, { kirimGagal: 1, driveGagal: 1 })
  await perintah(d, 'final')
  assert.deepEqual(await ulang(d), [{ id: 'P-291026-01', status: 'tertunda' }], 'ditutup, tetapi T-FINAL gagal dikirim')
  assert.equal(proyekId(d).status, 'ditutup'); assert.equal(f.keKirimKe.length, 0)
  assert.match(d.pemilik.at(-1), /kirim T-FINAL ke pemegang gagal/)
  assert.deepEqual(await ulang(d), [{ id: 'P-291026-01', status: 'ditutup' }])
  assert.equal(f.keKirimKe.length, 1)
  assert.deepEqual(await ulang(d), []); assert.equal(f.keKirimKe.length, 1, 'T-FINAL sekali saja')

  const e = await drafV1()
  pasangFinal(e, { driveGagal: 99 })
  await perintah(e, 'final')
  const kabar = e.pemilik.length
  const besok = new Date(NOW.getTime() + 25 * 3600e3)
  assert.deepEqual(await ulang(e, besok), [{ id: 'P-291026-01', status: 'basi' }])
  assert.equal(e.pemilik.length, kabar + 1); assert.match(e.pemilik.at(-1), /final belum selesai sesudah 24 jam \(drive\), tidak diulang lagi\. Perlu ditangani manual\./)
  assert.deepEqual(await ulang(e, besok), [], 'tidak diulang dan tidak dikabari lagi')
  assert.equal(e.pemilik.length, kabar + 1)
})

test('ALUR C: sesudah ditutup, pesan berikutnya membuka proyek baru; kalimat bebas bukan revisi proyek lama', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  pasangFinal(d)
  await perintah(d, 'final')
  assert.equal((await perintah(d, 'judul ganti')).status, 'diabaikan')
  assert.equal(d.keOperasi.length, 0)
  await perintah(d, 'final')
  assert.match(d.balasan.at(-1), /^Belum ada draf untuk difinalkan/)
  for (const a of [d.balasan, d.kirim, d.statusLog]) a.length = 0
  await perintah(d, 'buat harian 26 okt')
  assert.match(d.kirim[0].caption, /^P-291026-02 v1\n/)
})

test('klasifikasi: revisi hanya teks bukan forward dari pemegang draf, bukan bahan dikenali; tanpa efek samping; tangani menerima revisi tanpa wa_id', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  const ix = path.join(d.dasar, 'proyek', 'indeks.json'), sebelum = fs.readFileSync(ix, 'utf8')
  const k = (o) => klasifikasi({ dari: DARI, ...o }, d.ctx)
  assert.equal(await k({ teks: 'judul ganti' }), 'revisi')
  assert.equal(await k({ teks: 'judul ganti', diteruskan: true }), 'bahan', 'forward selalu bahan')
  assert.equal(await k({ teks: `[satgas] ${TGL}` }), 'bahan', 'bahan dikenali')
  assert.equal(await k({ teks: 'judul ganti', ada_berkas: 1, nama_berkas: 'a.pdf' }), 'bahan')
  assert.equal(await k({ teks: '   ' }), 'bahan')
  assert.equal(await klasifikasi({ dari: '6281111', teks: 'judul ganti' }, d.ctx), 'bahan', 'tanpa draf')
  assert.equal(await klasifikasi({ dari: '120363@g.us', teks: 'judul ganti' }, d.ctx), 'bahan')
  assert.deepEqual(d.statusLog, []); assert.equal(d.keOperasi.length, 0); assert.equal(d.balasan.length, 0)
  assert.equal(fs.readFileSync(ix, 'utf8'), sebelum, 'indeks tidak ditulis')
  // forward ke tangani: tidak jadi revisi
  assert.equal((await tangani({ dari: DARI, teks: 'judul ganti', diteruskan: true }, d.ctx)).status, 'diabaikan')
  assert.equal(d.keOperasi.length, 0)
  const r = await tangani({ dari: DARI, teks: 'judul ganti' }, d.ctx) // tanpa wa_id
  assert.equal(r.status, 'revisi'); assert.equal(d.versi.length, 2)
})

test('kunci: berkas kunci generator hilang = kunci versi tersimpan lewat berkas sementara; tanpa kunci sama sekali revisi ditolak', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  const asli = d.ctx.dep.exec
  d.ctx.dep.exec = async (cmd, args, o) => {
    const r = await asli(cmd, args, o)
    if (/_ringkas\.py$/.test(args[0])) { const out = args[args.indexOf('--out') + 1]; for (const f of fs.readdirSync(out)) if (f.endsWith('.kunci.json')) fs.rmSync(path.join(out, f)) }
    return r
  }
  await perintah(d, 'judul ganti')
  const t = d.terapkan()[0].args
  assert.notEqual(t[4], '-')
  assert.match(t[4], /kunci-versi\.json$/)
  assert.deepEqual(JSON.parse(fs.readFileSync(t[4], 'utf8')), KUNCI())
  assert.deepEqual(d.versi[1].ubah.kunci, KUNCI())
  // tanpa kunci lokal dan tanpa kunci tersimpan
  const e = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  for (const f of fs.readdirSync(path.join(e.dasar, 'keluaran', 'proyek', 'P-291026-01', 'v1', 'keluaran', TGL))) if (f.endsWith('.kunci.json')) fs.rmSync(path.join(e.dasar, 'keluaran', 'proyek', 'P-291026-01', 'v1', 'keluaran', TGL, f))
  delete e.versi[0].isian.kunci
  await perintah(e, 'judul ganti')
  assert.equal(e.keOperasi.length, 0); assert.equal(e.versi.length, 1); assert.equal(e.gen().length, 0)
  assert.deepEqual(e.statusLog, ['membangun', 'draf'])
  assert.match(e.balasan[0], /^P-291026-01 v1\nRevisi belum bisa diproses: daftar angka sistem yang dikunci untuk draf ini tidak ditemukan\./)
  assert.match(e.pemilik.at(-1), /daftar kunci angka sistem v1 tidak ada/)
})

test('periksa gagal (gerbang format dan bahasa) masuk ringkasan: paling banyak 3 baris + dan N lainnya', async () => {
  const d = dunia({ periksa: () => ({ peringatan: [], gagal: ['slide 2 judul terlalu panjang', 'slide 3 font bukan Roboto', 'slide 4 kosong', 'slide 5 frasa AI', 'slide 6 em dash'], ms: 12 }) })
  await perintah(d, 'buat harian 26 okt')
  assert.match(d.kirim[0].caption, /\nPemeriksaan:\n- Gerbang: slide 2 judul terlalu panjang\n- Gerbang: slide 3 font bukan Roboto\n- Gerbang: slide 4 kosong\n- Gerbang: dan 2 lainnya\.\n/)
})

test('fetch Worker memakai AbortSignal (timeout): panggilan yang menggantung jadi galat Worker biasa', async () => {
  const d = dunia()
  const sinyal = []
  const asli = d.ctx.dep.fetch
  d.ctx.dep.fetch = async (u, o = {}) => { if (!u.includes('/api/wa/masuk')) sinyal.push(o.signal); if (/\/api\/wa\/proyek$/.test(new URL(u).pathname)) throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }); return asli(u, o) }
  const r = await perintah(d, 'buat harian 26 okt')
  assert.equal(r.status, 'galat')
  assert.ok(sinyal.length && sinyal.every((s) => s instanceof AbortSignal))
  assert.match(d.balasan.at(-1), /Perintah gagal diproses/)
  assert.match(d.pemilik[0], /aborted due to timeout/)
})
