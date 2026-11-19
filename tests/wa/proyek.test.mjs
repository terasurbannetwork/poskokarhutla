// Uji mesin proyek bot laporan (BL-08, BL-10; RENCANA-UJI T2, T3, T6, T7, T8, T15, T22) tanpa Claude API, Worker, python, atau WhatsApp: semua disuntik.
// Deck palsu: PPTX berisi JSON inventaris [{slide, shape, teks}]; ubah.py palsu (inventaris, terapkan, pratinjau) dan pdf.py palsu bekerja di atasnya.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { tangani, klasifikasi, parsePerintah, keIsianGenerator, tanpaKunci, kedaluwarsa, waSha, BANTUAN, ulangFinal, hapusKonfirmasi, ulangSatelit, jawabSibukLangsung, T_SAPA } from '../../scripts/wa/proyek.mjs'
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
// Gaya pesan WA (DESIGN-SYSTEM bot laporan): baris 1 tebal, baris 2 kode miring bila ada, tanpa titik tengah, em dash, emoji, judul Markdown, pagar kode.
function gayaWa(t) {
  assert.doesNotMatch(t, SISTEM_HURUF, t)
  assert.doesNotMatch(t, /^#|\n#|```/, t)
  const [a, b] = t.split('\n')
  assert.match(a, /^\*[^*]+\*$/, t)
  assert.ok(a.split(' ').length <= 7, 'judul pendek: ' + a)
  if (b && b.startsWith('_')) assert.match(b, /^_P-\d{6}-\d{2}(, versi \d+)?_$/, t)
}
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
      if (String(args[0]).endsWith('rapi_spasi.py')) return { stdout: '{"diperbaiki":0,"slide":[]}' }
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
    dep, now, dasar, kenali, tanggalIsi, log: () => {}, jedaTerima: 0, kabarMulai: false, // uji yang menguji penggabungan atau kabar mulai memasang sendiri
    balas: async (t) => { balasan.push(t) },
    balasFile: async (p, nama, caption, mime) => { kirim.push({ p, nama, caption, mime }) },
    kabariPemilik: async (t) => { pemilik.push(t) },
  }
  const semua = () => [...balasan, ...kirim.map((k) => k.caption).filter(Boolean)]
  return { ctx, dasar, balasan, kirim, exec, keUrai, keOperasi, kePeriksa, pemilik, versi, statusLog, proyek, semua,
    gen: () => exec.filter((e) => /_(ringkas|otomatis)\.py$/.test(e.args[0])), terapkan: () => exec.filter((e) => e.args[1] === 'terapkan') }
}
const perintah = (d, teks) => tangani({ dari: DARI, teks }, d.ctx)
// K17: `buat <jenis>` membalas daftar bahan, `lanjut` membangun. bangun() = keduanya; balasan daftar bahan dibuang supaya uji draf tetap memeriksa balasan draf.
const DAFTAR_BAHAN = /^\*(Kirim bahan laporan|Bahan wajib lengkap)\*\n/
async function bangun(d, teks, dari = DARI) {
  const n = d.balasan.length
  const r = await tangani({ dari, teks }, d.ctx)
  if (d.balasan.length !== n + 1 || !DAFTAR_BAHAN.test(d.balasan[n])) return r
  d.balasan.splice(n, 1)
  return tangani({ dari, teks: 'lanjut' }, d.ctx)
}

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

test('K17: buat membalas daftar bahan (wajib, tambahan, sudah ada), tidak membangun, tidak memanggil Claude', async () => {
  const d = dunia({ pesan: [P('1', 'rekap_koordalops_24'), P('2', 'bmkg_pagi')] })
  assert.equal((await perintah(d, 'buat harian 26 okt')).status, 'buat')
  assert.equal(d.gen().length, 0); assert.equal(d.keUrai.length, 0); assert.deepEqual(d.statusLog, [])
  assert.equal(d.balasan.length, 1)
  assert.equal(d.balasan[0], '*Kirim bahan laporan*\n_P-291026-01_\n\nLaporan Kejadian Bencana Harian 26 Okt\n\n*Wajib:*\n- Rekap Koordalops 24 jam: sudah ada\n- BMKG pagi: sudah ada\n- PVMBG pagi\n\nKirim atau teruskan bahannya ke sini.\nKetik *lanjut* bila sudah siap.')
  gayaWa(d.balasan[0])
  assert.deepEqual([...d.proyek.values()][0].bahan, [], 'bahan belum ditempel sebelum lanjut')
  // penanganan: bagian Tambahan dari LAPORAN.pilihan
  const e = dunia({ pesan: [P('2', 'bmkg_pagi'), P('4', 'satgas')] })
  await perintah(e, 'buat penanganan 26 okt')
  assert.equal(e.balasan[0], '*Bahan wajib lengkap*\n_P-291026-01_\n\nLaporan Penanganan Pengendalian Karhutla 26 Okt\n\n*Wajib:*\n- Satgas pemadaman atau laporan penanganan lengkap: sudah ada\n\n*Opsional, boleh dilewati:*\n- Gelar kekuatan Satgas Udara (Excel)\n\nKetik *lanjut* untuk membuat laporan.')
  assert.equal(e.gen().length, 0, 'wajib lengkap pun tetap menunggu lanjut')
})

test('K17: lanjut dengan bahan wajib kurang membangun dan mencatat kekurangannya; lanjut tanpa proyek = petunjuk', async () => {
  const d = dunia({ pesan: [P('1', 'rekap_koordalops_24'), P('2', 'bmkg_pagi')] })
  assert.equal((await perintah(d, 'lanjut')).status, 'lanjut')
  assert.equal(d.balasan.at(-1), '*Belum ada proyek terbuka*\n\nKetik *buat harian* atau *buat penanganan* dulu, lalu kirim bahannya.')
  assert.equal(d.proyek.size, 0)
  await perintah(d, 'buat harian 26 okt')
  assert.equal(await klasifikasi({ dari: DARI, teks: 'Lanjut.' }, d.ctx), 'perintah')
  await perintah(d, 'lanjut')
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.equal(d.gen().length, 1)
  assert.match(d.kirim[0].caption, /\n\n\*Catatan:\*\n- PVMBG pagi untuk 26 Okt belum ada\.(\n|$)/)
  assert.match(d.versi[0].peringatan, /PVMBG pagi untuk 26 Okt belum ada/)
  assert.deepEqual([...d.proyek.values()][0].bahan.map((b) => b.wa_id).sort(), ['1', '2'])
  await perintah(d, 'lanjut')
  assert.match(d.balasan.at(-1), /^\*Draf sudah ada\*\n_P-291026-01, versi 1_\n/)
  assert.equal(d.gen().length, 1)
})

test('K17: bahan dikirim sebelum buat tetap dipakai; tanda terima hanya untuk proyek dituntun, digabung per jeda', async () => {
  const pesan = [P('1', 'rekap_koordalops_24')]
  const d = dunia({ pesan }); d.ctx.jedaTerima = 30
  // sebelum buat: diam (Q1)
  const r0 = await tangani({ dari: DARI, teks: `[rekap_koordalops_24] ${TGL}`, wa_id: 1 }, d.ctx)
  assert.equal(r0.terima, undefined); assert.equal(d.balasan.length, 0)
  await perintah(d, 'buat harian 26 okt')
  assert.match(d.balasan[0], /- Rekap Koordalops 24 jam: sudah ada\n/, 'bahan sebelum buat terhitung')
  // satu bahan: Diterima + sisa wajib
  pesan.push(P('2', 'bmkg_pagi'))
  const r1 = await tangani({ dari: DARI, teks: `[bmkg_pagi] ${TGL}`, wa_id: 2 }, d.ctx)
  assert.equal(await r1.terima, '*Diterima: BMKG pagi* (2 dari 3 wajib)\n_P-291026-01_\n\n*Masih kurang:*\n- PVMBG pagi\n\nKetik *lanjut* bila ingin membuat dengan bahan yang ada.')
  // tidak dikenali
  const r2 = await tangani({ dari: DARI, teks: 'catatan rapat koordinasi', wa_id: 7 }, d.ctx)
  assert.match(await r2.terima, /^\*Bahan disimpan\*\n_P-291026-01_\n\nLaporan Kejadian Bencana Harian 26 Okt\nKiriman lain \(bukan format baku\) ikut disimpan dan dibaca saat laporan dibuat\.\n\n\*Wajib:\*\n- Rekap Koordalops 24 jam: sudah ada\n- BMKG pagi: sudah ada\n- PVMBG pagi\n/)
  // dua kiriman berdekatan = satu pesan; wajib lengkap = ajakan lanjut, tanpa membangun
  pesan.push(P('3', 'pvmbg_pagi'))
  const n = d.balasan.length
  const [a, b] = await Promise.all([tangani({ dari: DARI, teks: `[pvmbg_pagi] ${TGL}`, wa_id: 3, diteruskan: true }, d.ctx), tangani({ dari: DARI, teks: 'foto posko', wa_id: 8 }, d.ctx)])
  assert.equal(a.terima, b.terima, 'satu janji untuk kiriman yang digabung')
  assert.equal(await a.terima, '*Bahan wajib lengkap*\n_P-291026-01_\n\nDiterima: PVMBG pagi.\nKiriman lain (bukan format baku) ikut disimpan dan dibaca saat laporan dibuat.\n\nKetik *lanjut* untuk membuat laporan.')
  assert.equal(d.balasan.length, n + 1)
  for (const t of d.balasan) assert.doesNotMatch(t, SISTEM_HURUF, t)
  assert.equal(d.gen().length, 0, 'tidak pernah membangun sendiri')
  // sesudah dibangun: tanpa tanda terima
  await perintah(d, 'lanjut')
  assert.equal(d.gen().length, 1)
  const r4 = await tangani({ dari: DARI, teks: 'tambahan lagi', wa_id: 9, diteruskan: true }, d.ctx)
  assert.equal(await r4.terima, null)
  const r5 = await tangani({ dari: DARI, teks: 'lagi', wa_id: 10, diteruskan: true }, d.ctx)
  assert.equal(r5.terima, undefined, 'tuntun dilepas sesudah proyek tidak menunggu bahan')
})

test('T2: pertentangan dari Claude ikut ditanyakan bernomor', async () => {
  const d = dunia({ claude: () => ({ isian: [], gagal: [], pertentangan: [{ medan: 'sorti_water_bombing', a: { nilai: '14', kutipan: 'sorti 14' }, b: { nilai: '12', kutipan: 'sorti 12' } }] }) })
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.gen().length, 0)
  assert.match(d.balasan[0], /^\*Bahan perlu dipastikan\*\n_P-291026-01_\n\nLaporan Kejadian Bencana Harian 26 Okt perlu dipastikan dulu:\n/)
  gayaWa(d.balasan[0])
  assert.match(d.balasan[0], /1\. Sorti water bombing berbeda: 14 \("sorti 14"\) dan 12 \("sorti 12"\)\. Mana yang dipakai\?/)
  assert.match(d.balasan[0], /\n\nKirim jawabannya, atau ketik \*lanjut\* untuk membuat dengan bahan yang ada\.$/)
  assert.deepEqual(d.statusLog, ['bertanya'], 'bentrok ditanyakan sesudah lanjut, sebelum membangun')
  // lanjut lagi: membangun, bentrok masuk catatan, Claude tidak dipanggil ulang untuk bahan sama
  assert.equal((await perintah(d, 'lanjut')).status, 'lanjut')
  assert.equal(d.gen().length, 1); assert.equal(d.keUrai.length, 1)
  assert.match(d.kirim[0].caption, /\*Catatan:\*\n- Sorti water bombing berbeda/)
})

test('T3: buat saja (alias lanjut) membangun dengan catatan kekurangan; Claude tidak dipanggil dua kali untuk bahan sama', async () => {
  const d = dunia({ pesan: [P('1', 'rekap_koordalops_24'), P('2', 'bmkg_pagi')] })
  await perintah(d, 'buat harian 26 okt')
  assert.equal((await perintah(d, 'buat harian saja 26 okt')).status, 'buat saja')
  assert.equal(d.keUrai.length, 1)
  assert.equal(d.gen().length, 1)
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.deepEqual(d.kirim.map((k) => path.extname(k.nama)), ['.png', '.pdf'])
  assert.match(d.kirim[0].caption, /^\*Draf v1 siap\*\n_P-291026-01, versi 1_\n\nLaporan Kejadian Bencana Harian 26 Okt\nBahan: Rekap Koordalops 24 jam 1, BMKG pagi 1\nGambar ini slide 1, PDF menyusul\.\n\n\*Catatan:\*\n- PVMBG pagi untuk 26 Okt belum ada/)
  assert.match(d.balasan.at(-1), /^\*Ada revisi\?\*\n_P-291026-01, versi 1_\n\n\*Balas angka:\*\n\*1\* Revisi: kirim revisinya \(boleh beberapa pesan\), lalu \*selesai\*\n\*2\* Final\n\*3\* Minta PPTX\n\*4\* Lihat versi\n\*5\* Batal\n\n_Revisi satu kalimat juga bisa langsung dikirim\._$/, 'sesudah PDF: bubble tawaran revisi dan menu bernomor')
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
  await bangun(d, 'buat harian 26 okt')
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.deepEqual(d.balasan.map((t) => t.split('\n')[0]), ['*Ada revisi?*'], 'tanpa pesan T-BUKA terpisah; satu bubble tawaran revisi sesudah PDF')
  assert.deepEqual(d.kirim.map((k) => path.extname(k.nama)), ['.png', '.pdf'])
  assert.equal(d.kirim[0].caption, '*Draf v1 siap*\n_P-291026-01, versi 1_\n\nLaporan Kejadian Bencana Harian 26 Okt\nBahan: Rekap Koordalops 24 jam 1, BMKG pagi 1, PVMBG pagi 1\nGambar ini slide 1, PDF menyusul.')
  assert.equal(d.kirim[1].caption, '*PDF draf v1*\n_P-291026-01, versi 1_\n\nLaporan Kejadian Bencana Harian 26 Okt')
  for (const k of d.kirim) gayaWa(k.caption)
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
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.gen()[0].args.includes('--isian'), false)
  assert.deepEqual(keIsianGenerator('penanganan', [{ medan: 'personel_darat', kelompok: 'p', nilai: '20' }]), {})
})

test('tanpaKunci membuang kunci dan teks angka sistem di kedalaman mana pun', () => {
  assert.deepEqual(tanpaKunci({ a: 1, luas_terbakar: 3, b: [{ hotspot: 4, t: 'sisa 12 ha belum dipadamkan', u: 'ok' }] }), { a: 1, b: [{ u: 'ok' }] })
})

test('T15: satu proyek tidak pernah dibangun dua proses bersamaan', async () => {
  let lepas; const tahan = new Promise((r) => { lepas = r })
  const d = dunia({ tahanGenerator: tahan })
  const pertama = bangun(d, 'buat harian 26 okt')
  for (let i = 0; i < 50 && !d.gen().length; i++) await new Promise((r) => setTimeout(r, 10))
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.balasan.at(-1), '*Sedang dibangun*\n_P-291026-01_\n\nTunggu sebentar, draf dikirim begitu siap.')
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
  await bangun(d, 'buat harian 26 okt')
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
  await bangun(d, 'buat harian 26 okt')
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.gen().length, 0)
  assert.equal(d.balasan[0], '*Bahan belum terbaca*\n_P-291026-01_\n\nMesin gagal membaca bahan. Kirim ulang bahannya, lalu coba lagi.\n\nKetik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan.')
  assert.equal(d.pemilik.length, 1)
  assert.match(d.pemilik[0], /Claude gagal \(tolak\)/)
})

test('generator gagal: pengirim diberi tahu singkat, rincian hanya ke pemilik, status terbuka', async () => {
  const d = dunia()
  d.ctx.dep.exec = async (cmd, args) => { if (/_(ringkas|otomatis)\.py$/.test(args[0])) throw Object.assign(new Error('x'), { stderr: 'meledak' }); return { stdout: '' } }
  await bangun(d, 'buat harian 26 okt')
  assert.deepEqual(d.statusLog, ['membangun', 'terbuka'])
  assert.equal(d.balasan.at(-1), '*Draf v1 gagal dibangun*\n_P-291026-01_\n\nPenyebab: generator gagal: meledak\nPemilik sudah dikabari.\nKetik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan.')
  assert.equal(d.balasan.filter((t) => /gagal/.test(t)).length, 1, 'balasan gagal tidak terkirim dua kali')
  assert.match(d.pemilik[0], /meledak/)
  assert.equal(d.kirim.length, 0)
})

test('A2: jenis ditebak dari bahan; seri ditanyakan tanpa membuka proyek', async () => {
  const d = dunia({ pesan: [] })
  await bangun(d, 'buat 26 okt')
  assert.equal(d.balasan[0], '*Jenis laporan belum jelas*\n\nBahan 26 Okt belum menunjukkan jenis laporannya.\n\nKetik salah satu:\n- *buat harian 2026-10-26*\n- *buat penanganan 2026-10-26*')
  assert.equal(d.proyek.size, 0)
  const d2 = dunia({ pesan: [P('4', 'satgas')] }) // satgas hanya milik penanganan (bmkg pagi bukan lagi wajib penanganan, 18 Nov 2026)
  await bangun(d2, 'buat 26 okt')
  assert.equal([...d2.proyek.values()][0].jenis, 'penanganan')
})

test('status tanpa tanggal: proyek pengirim yang masih terbuka; bantuan; susulan dan grup diabaikan', async () => {
  const d = dunia()
  await perintah(d, 'status')
  assert.match(d.balasan[0], /^\*Belum ada proyek terbuka\*\n\nKirim atau teruskan bahan, lalu ketik \*buat harian\* atau \*buat penanganan\*\.$/)
  await bangun(d, 'buat harian 26 okt')
  d.balasan.length = 0
  await perintah(d, 'status')
  assert.equal(d.balasan[0], '*Proyek terbuka*\n\n_P-291026-01, versi 1_\nLaporan Kejadian Bencana Harian 26 Okt\nStatus: draf siap\nBalas *1* untuk revisi atau *2* untuk final.')
  await perintah(d, 'bantuan')
  assert.equal(d.balasan[1], BANTUAN)
  await tangani({ dari: '6299', teks: 'bantuan' }, d.ctx)
  assert.ok(d.balasan[2].startsWith(BANTUAN + '\n\n*Khusus pemilik*\n- *kirim ulang harian 26 okt*'))
  assert.doesNotMatch(d.balasan[1], /Khusus pemilik/)
  for (const kata of ['*Membuat laporan*', '*Saat draf*', '*Lainnya*', '*buat harian*', '*1* atau *revisi*', '*2* atau *final*', '*5* atau *batal*', 'Contoh: *buat harian kemarin*']) assert.ok(BANTUAN.includes(kata), kata)
  gayaWa(d.balasan[2])
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
  assert.equal((await tangani({ dari: DARI, teks: 'foto lapangan posko', wa_id: 56, ada_berkas: 1, nama_berkas: 'a.jpg' }, d.ctx)).status, 'menunggu buat')
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
  assert.match(ke[0][1], /^\*Proyek ditutup otomatis\*\n_P-291026-01_\n\nLaporan Penanganan Pengendalian Karhutla 26 Okt ditutup karena 24 jam tanpa aktivitas, tanpa unggah\.\nKetik \*buat\* untuk memulai lagi\.$/)
})

test('WA_GARAM kosong: perintah dibalas belum siap, tidak ada rute dipanggil', async () => {
  const d = dunia(); d.ctx.env.WA_GARAM = ''
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.proyek.size, 0)
  assert.match(d.balasan[0], /belum siap/)
})

test('Q6: baris nomor bot laporan (dari = bl:<wa_sha>) milik pemegang sha itu saja', async () => {
  const BOT = '6285555000111', sha = waSha(BOT, 'garam')
  const bl = (id, kunci, s = sha) => ({ ...P(id, kunci), dari: `bl:${s}` })
  const d = dunia({ pesan: [bl('1', 'rekap_koordalops_24'), bl('2', 'bmkg_pagi'), bl('3', 'pvmbg_pagi'), bl('4', 'satgas', 'f'.repeat(64)), P('5', 'satgas')] })
  await bangun(d, 'buat harian 26 okt', BOT)
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
  await bangun(d, 'buat harian 26 okt')
  assert.match(d.balasan.at(-1), /Sedang dibangun/); assert.equal(d.gen().length, 0)
  const lama = (Date.now() - 41 * 60e3) / 1000
  fs.utimesSync(kunci, lama, lama)
  await bangun(d, 'buat harian 26 okt')
  assert.deepEqual(d.statusLog, ['terbuka', 'membangun', 'draf'])
  assert.equal(d.gen().length, 1)
  p.status = 'membangun' // proses kedua mati sesudah v1 tercatat
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.statusLog.at(-1), 'draf')
  assert.equal(d.balasan.at(-1), '*Draf sudah ada*\n_P-291026-01, versi 1_\n\nTulis perubahan dengan kalimat biasa, atau balas *2* untuk final.')
})

test('1: pindah status gagal diulang sekali; gagal dua kali = pemilik dikabari, tidak ditelan', async () => {
  const d = dunia({ gagalStatus: 1 })
  await bangun(d, 'buat harian 26 okt')
  assert.deepEqual(d.statusLog, ['gagal:membangun', 'membangun', 'draf'])
  assert.equal(d.pemilik.length, 0)
  const e = dunia({ gagalStatus: 2 })
  await bangun(e, 'buat harian 26 okt')
  assert.equal(e.gen().length, 0)
  assert.match(e.pemilik[0], /^\*Galat bot laporan\*\n_P-291026-01_\n\nStatus gagal dipindah ke membangun\./)
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
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.gen().length, 1)
  const bahan = [...d.proyek.values()][0].bahan.map((b) => b.wa_id).sort()
  assert.deepEqual(bahan, ['1', '2', '3'])
  const isi = (k) => fs.readFileSync(d.gen()[0].args[d.gen()[0].args.indexOf(k) + 1], 'utf8')
  assert.equal(isi('--bmkg'), `[bmkg_pagi] ${TGL}`) // dari grup operasi, sama dengan jalur terjadwal
})

test('4: baris PERINGATAN isian dari stderr generator masuk catatan T-DRAF', async () => {
  const d = dunia({ stderrGen: "lain\nPERINGATAN isian: isian.kejadian[0] lokasi 'Bogor': tidak ada di bahan, diabaikan\n" })
  await bangun(d, 'buat harian 26 okt')
  assert.match(d.kirim[0].caption, /\*Catatan:\*\n- Isian diabaikan generator: isian\.kejadian\[0\] lokasi 'Bogor': tidak ada di bahan, diabaikan/)
})

test('5: generator menunggu kunci bersama generator.lock milik jalur terjadwal, lalu melepasnya', async () => {
  const d = dunia()
  const kunci = path.join(d.dasar, 'generator.lock')
  fs.writeFileSync(kunci, '')
  let tunggu = 0
  d.ctx.dep.tidur = async () => { tunggu++; assert.equal(d.gen().length, 0); fs.rmSync(kunci) }
  await bangun(d, 'buat harian 26 okt')
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
  await bangun(d, 'buat harian 26 okt')
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
  assert.equal(d.balasan[0], '*Revisi tidak diterapkan*\n_P-291026-01, versi 1_\n\nDraf tetap v1.\n\nHotspot 1.234 di slide 2 adalah angka sistem (hari D-1), tidak bisa diubah lewat revisi.\n\nBila angka lapangan berbeda, minta catatan. Contoh: tambahkan catatan di slide 2 bahwa angka lapangan berbeda.')
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
  assert.equal(d.kirim[0].caption, '*Pratinjau slide 3*\n_P-291026-01, versi 3_\n\nRingkasan perubahan ada di PDF berikutnya.')
  assert.ok(d.exec.some((e) => e.args[1] === 'pratinjau' && e.args[3] === '3'), 'pratinjau slide yang berubah')
  assert.ok(d.exec.some((e) => String(e.args[0]).endsWith('pdf.py')), 'PDF dari deck yang sudah diubah')
  assert.match(fs.readFileSync(d.kirim[1].p, 'utf8'), /Rencana aksi BPBD/)
  assert.equal(d.kirim[1].caption, '*Draf v3 siap*\n_P-291026-01, versi 3_\n\nLaporan Kejadian Bencana Harian 26 Okt\n\n*Perubahan:*\n- Slide 3: "Rencana aksi" diganti "Rencana aksi BPBD".')
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
  assert.match(d.kirim[1].caption, /\n\*Dilewati:\*\n- Slide 1: "LAPORAN HARIAN" diganti "JUDUL BARU": perubahan lama, teks di slide sudah berbeda\. Kirim ulang revisinya bila masih perlu\.(\n|$)/)
  // teks_lama sebagian (lolos validasi Claude) tapi tidak sama persis saat diterapkan: tidak ada versi baru
  await sesudah(d, () => perintah(d, 'banjir jadi banjir besar'))
  assert.equal(d.versi.length, 3)
  assert.equal(d.kirim.length, 0)
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.match(d.balasan[0], /^\*Revisi tidak diterapkan\*\n_P-291026-01, versi 3_\n\nDraf tetap v3\.\n\nSlide 2: "Banjir" diganti "Banjir besar": teks di slide sudah berbeda/)
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
  assert.match(d.kirim[1].caption, /^\*Draf v4 siap\*\n_P-291026-01, versi 4_\n\n.*\n\n\*Perubahan:\*\n- Isi sama dengan v2\.(\n|$)/)
  const deck4 = bacaDeck(d.kirim[1].p.replace(/\.pdf$/, '.pptx'))
  assert.equal(deck4.find((x) => x.shape === 's3_rencana').teks, 'Rencana aksi')
  await sesudah(d, () => perintah(d, 'balik v9'))
  assert.equal(d.balasan[0], '*Versi v9 tidak ada*\n_P-291026-01, versi 4_\n\nVersi terakhir v4. Balas *4* untuk melihat riwayat versi.')
  await sesudah(d, () => perintah(d, 'balik 4'))
  assert.match(d.balasan[0], /^\*Sudah versi terakhir\*\n_P-291026-01, versi 4_\n\nv4 sudah versi terakhir/)
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
  assert.equal(d.balasan[0], '*Revisi perlu dipastikan*\n_P-291026-01, versi 1_\n\n1. Slide mana yang dimaksud, 2 atau 3?\n\nBalas dengan kalimat revisi yang lebih rinci.')
})

test('tanya lalu jawaban singkat: Claude menerima permintaan awal, pertanyaannya, dan jawaban (insiden 18 Nov 2026 "ya")', async () => {
  let ke = 0
  const d = await drafV1({ ops: () => (ke++ === 0 ? [{ jenis: 'tanya', pertanyaan: 'Panel OMC DAN HUJAN atau SEMAI OMC?' }] : [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')]) })
  await perintah(d, 'panel omc hapus aja')
  assert.match(d.balasan[0], /^\*Revisi perlu dipastikan\*/)
  await perintah(d, 'ya')
  assert.equal(d.keOperasi.length, 2)
  assert.equal(d.keOperasi[1].kalimat, 'Permintaan revisi awal: "panel omc hapus aja"\nBot bertanya:\n1. Panel OMC DAN HUJAN atau SEMAI OMC?\nJawaban pemakai: "ya"\nTerapkan permintaan awal sesuai jawaban ini.')
  assert.equal(d.versi.length, 2, 'jawaban menerapkan revisi')
  await perintah(d, 'judul ganti')
  assert.equal(d.keOperasi[2].kalimat, 'judul ganti', 'tanya sekali pakai: revisi berikutnya tanpa konteks lama')
})

test('revisi sebagian: operasi sah diterapkan, yang terkunci dijelaskan di keterangan PDF (tetap 2 kiriman)', async () => {
  const d = await drafV1({ ops: () => [GANTI(2, 's2_kpi_hotspot', 'HOTSPOT\n1.234', 'HOTSPOT\n9'), GANTI(2, 's2_ringkas', 'Banjir di Bogor', 'Banjir di Kabupaten Bogor')] })
  await perintah(d, 'ganti hotspot dan ringkasan')
  assert.equal(d.versi.length, 2)
  assert.equal(d.kirim.length, 2)
  assert.equal(d.kirim[0].caption, '*Pratinjau slide 2*\n_P-291026-01, versi 2_\n\nRingkasan perubahan ada di PDF berikutnya.')
  assert.match(d.kirim[1].caption, /\*Perubahan:\*\n- Slide 2: "Banjir di Bogor" diganti "Banjir di Kabupaten Bogor"\.\n\n\*Tidak diubah:\*\n- Hotspot 1\.234 di slide 2 adalah angka sistem/)
  assert.equal(d.versi[1].ubah.ditolak[0].kunci, true)
})

test('periksa (BL-11) ada: dipanggil dengan pptx, pdf, jenis, tanggal, angka; peringatannya masuk ringkasan draf v1 dan T-DRAF revisi', async () => {
  const d = dunia({ periksa: () => ({ peringatan: ['Angka hotspot hari ini 1.234 — lebih dari 3 kali median.'] }), ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')],
    claude: () => ({ gagal: [], pertentangan: [], isian: [{ medan: 'kabupaten', kelompok: 'k1', nilai: 'Bogor' }, { medan: 'meninggal', kelompok: 'k1', nilai: '3 jiwa' }, { medan: 'meninggal', kelompok: 'k2', nilai: '2' }] }) })
  await bangun(d, 'buat harian 26 okt')
  const a = d.kePeriksa[0]
  assert.match(a.pptx, /\.pptx$/); assert.match(a.pdf, /\.pdf$/)
  assert.equal(a.jenis, 'harian'); assert.equal(a.tanggal, TGL)
  assert.deepEqual(a.angka, { hotspot: 1234, meninggal: 5 })
  assert.equal(d.kirim.length, 2)
  assert.match(d.kirim[0].caption, /\n\*Perlu dicek:\*\n- Angka hotspot hari ini 1\.234, lebih dari 3 kali median \(belum dibetulkan\)\.(\n|$)/)
  assert.match(d.versi[0].peringatan, /lebih dari 3 kali median/)
  await sesudah(d, () => perintah(d, 'judul ganti'))
  assert.equal(d.kePeriksa.length, 2)
  assert.equal(d.kirim.length, 2)
  assert.match(d.kirim[1].caption, /\n\*Perlu dicek:\*\n- Angka hotspot hari ini 1\.234, lebih dari 3 kali median \(belum dibetulkan\)\.$/)
  for (const t of d.semua()) assert.doesNotMatch(t, SISTEM_HURUF, t)
})

test('periksa tidak ada atau galat: draf tetap terkirim tanpa bagian Pemeriksaan', async () => {
  const d = dunia() // periksa: null = modul tidak ada
  await bangun(d, 'buat harian 26 okt')
  assert.doesNotMatch(d.kirim[0].caption, /Perlu dicek/)
  const e = dunia({ periksa: () => { throw new Error('python hilang') } })
  await bangun(e, 'buat harian 26 okt')
  assert.equal(e.kirim.length, 2)
  assert.doesNotMatch(e.kirim[0].caption, /Perlu dicek/)
  const lambat = dunia({ periksa: () => new Promise(() => {}) })
  lambat.ctx.periksaMs = 20
  await bangun(lambat, 'buat harian 26 okt')
  assert.equal(lambat.kirim.length, 2, 'periksa yang menggantung tidak menahan draf')
})

test('versi: riwayat dengan jam WIB; pptx mengirim PPTX terakhir (unduh dari rute bila berkas lokal hilang)', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  await perintah(d, 'judul ganti')
  await sesudah(d, () => perintah(d, 'versi'))
  assert.equal(d.balasan[0], '*Riwayat versi*\n_P-291026-01, versi 2_\n\nLaporan Kejadian Bencana Harian 26 Okt\n- v1 29 Okt 08.00, buat\n- v2 29 Okt 08.01, revisi: judul ganti\n\nKetik *balik v1* (atau nomor lain) untuk membuat versi baru dengan isi versi itu.')
  await sesudah(d, () => perintah(d, 'pptx'))
  assert.equal(d.kirim.length, 1)
  assert.match(d.kirim[0].nama, /\.pptx$/)
  assert.equal(d.kirim[0].mime, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
  assert.equal(d.kirim[0].caption, '*PPTX draf v2*\n_P-291026-01, versi 2_\n\nLaporan Kejadian Bencana Harian 26 Okt')
  assert.equal(bacaDeck(d.kirim[0].p)[0].teks, 'JUDUL')
  fs.rmSync(path.join(d.dasar, 'keluaran', 'proyek'), { recursive: true })
  await sesudah(d, () => perintah(d, 'pptx'))
  assert.equal(bacaDeck(d.kirim[0].p)[0].teks, 'JUDUL', 'diunduh dari versi tersimpan')
})

test('batal menutup proyek; sesudahnya kalimat bebas bukan revisi; bahan dikenali saat draf tetap bahan', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  assert.equal((await tangani({ dari: DARI, teks: `[satgas] ${TGL}`, wa_id: 77 }, d.ctx)).status, 'ditambah')
  assert.equal(d.keOperasi.length, 0)
  assert.equal((await tangani({ dari: '6281111', teks: 'judul ganti' }, d.ctx)).status, 'sapa', 'nomor lain tanpa draf: bukan revisi, disapa T-SAPA')
  const harian = [...d.proyek.values()].find((x) => x.jenis === 'harian')
  await perintah(d, 'batal')
  assert.equal(harian.status, 'batal', 'draf yang dibatalkan, bukan proyek terbuka lain')
  assert.equal(d.balasan.at(-1), '*Proyek dibatalkan*\n_P-291026-01, versi 1_\n\nLaporan Kejadian Bencana Harian 26 Okt dibatalkan, tanpa unggah.\nBahan yang sudah dikirim ikut dihapus.\nKetik *buat* untuk memulai lagi dari awal.')
  assert.equal((await perintah(d, 'judul ganti')).status, 'diabaikan')
  assert.equal(d.keOperasi.length, 0)
  await perintah(d, 'versi')
  assert.match(d.balasan.at(-1), /^\*Belum ada draf\*\n\n/)
})

test('menu bernomor: angka 1-5 dari pemegang draf = revisi, final, pptx, versi, batal; tidak pernah ke Claude', async () => {
  for (const t of ['1', '2', '3', '4', '5', ' 2 ', '3.', '4 .']) assert.equal(parsePerintah(t)?.aksi, 'menu', t)
  assert.equal(parsePerintah('6'), null); assert.equal(parsePerintah('12'), null); assert.equal(parsePerintah('1 final'), null)
  const d = await drafV1()
  assert.equal(await klasifikasi({ dari: DARI, teks: '2' }, d.ctx), 'perintah', 'angka menu tidak diteruskan ke Worker')
  assert.equal((await perintah(d, '1')).status, 'kumpul revisi', 'angka 1 = revisi (pemilik 19 Nov: revisi jadi angka)')
  await perintah(d, 'batal')
  assert.equal((await perintah(d, '4')).status, 'versi')
  assert.match(d.balasan.at(-1), /^\*Riwayat versi\*\n_P-291026-01, versi 1_\n/)
  assert.equal((await perintah(d, '3')).status, 'pptx')
  assert.match(d.kirim.at(-1).nama, /\.pptx$/)
  assert.equal(d.keOperasi.length, 0, 'angka menu tidak pernah ke Claude')
  assert.equal(d.versi.length, 1, 'angka menu tidak membuat versi')
  assert.equal((await perintah(d, '2')).status, 'final tertunda', 'angka 2 = final (Drive tidak disuntik di uji ini)')
  assert.match(d.balasan.at(-1), /^\*Final v1 diterima\*\n/)
})

test('menu 5: batal ditanyakan sekali, ya dalam 5 menit membatalkan; lewat 5 menit atau pesan lain menghapus tanya', async () => {
  const d = await drafV1()
  const harian = [...d.proyek.values()].find((x) => x.jenis === 'harian')
  assert.equal((await perintah(d, '5')).status, 'tanya batal')
  assert.equal(harian.status, 'draf', 'angka 5 belum membatalkan')
  assert.equal(d.balasan.at(-1), '*Batalkan proyek ini?*\n_P-291026-01, versi 1_\n\nLaporan Kejadian Bencana Harian 26 Okt\nKetik *ya* untuk membatalkan P-291026-01, tanpa unggah.\n\nBerlaku 5 menit. Abaikan pesan ini bila tidak jadi.')
  gayaWa(d.balasan.at(-1))
  assert.equal(await klasifikasi({ dari: DARI, teks: 'Ya.' }, d.ctx), 'perintah', 'ya tidak diteruskan ke Worker selama tanya batal berlaku')
  assert.equal((await perintah(d, 'Ya.')).status, 'batal')
  assert.equal(harian.status, 'batal')
  assert.match(d.balasan.at(-1), /^\*Proyek dibatalkan\*\n_P-291026-01, versi 1_\n/)
  assert.equal(d.keOperasi.length, 0)
  // lewat 5 menit: ya kembali kalimat biasa (revisi pemegang draf)
  const e = await drafV1()
  await perintah(e, '5')
  const lambat = { ...e.ctx, now: new Date(NOW.getTime() + 6 * 60e3) }
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ya' }, lambat), 'revisi')
  // pesan lain sesudah tanya: ya tidak lagi membatalkan
  const g = await drafV1()
  await perintah(g, '5')
  await perintah(g, '4')
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ya' }, g.ctx), 'revisi')
  assert.equal([...g.proyek.values()].find((x) => x.jenis === 'harian').status, 'draf')
})

test('pesan diteruskan tidak pernah jadi angka menu atau ya', async () => {
  const d = await drafV1()
  const harian = () => [...d.proyek.values()].find((x) => x.jenis === 'harian')
  assert.equal(await klasifikasi({ dari: DARI, teks: '1', diteruskan: true }, d.ctx), 'bahan')
  assert.equal((await tangani({ dari: DARI, teks: '1', diteruskan: true }, d.ctx)).status, 'diabaikan')
  assert.equal((await tangani({ dari: DARI, teks: '4', diteruskan: true, wa_id: 91 }, d.ctx)).status, 'menunggu buat')
  assert.equal(harian().status, 'draf'); assert.equal(d.balasan.length, 0); assert.equal(d.kirim.length, 0)
  await perintah(d, '5')
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ya', diteruskan: true }, d.ctx), 'bahan')
  await tangani({ dari: DARI, teks: 'ya', diteruskan: true }, d.ctx)
  assert.equal(harian().status, 'draf', 'ya diteruskan tidak membatalkan')
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ya' }, d.ctx), 'revisi', 'pesan diteruskan pun menghapus tanya batal')
})

test('tanya batal dihapus juga oleh bantuan dan oleh hapusKonfirmasi (perintah pemilik di perintah.mjs)', async () => {
  const d = await drafV1()
  await perintah(d, '5'); await perintah(d, 'bantuan')
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ya' }, d.ctx), 'revisi')
  await perintah(d, '5')
  hapusKonfirmasi({ dari: DARI, env: d.ctx.env, dasar: d.dasar })
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ya' }, d.ctx), 'revisi')
})

test('dua draf: angka berlaku untuk proyek yang menunya terakhir dikirim; tanpa catatan tidak menebak, minta perintah berkode', async () => {
  const d = dunia({ pesan: [...LENGKAP(), P('4', 'satgas')] })
  await bangun(d, 'buat harian 26 okt'); await bangun(d, 'buat penanganan 26 okt')
  const ids = [...d.proyek.values()].filter((x) => x.status === 'draf').map((x) => x.id).sort()
  assert.deepEqual(ids, ['P-291026-01', 'P-291026-02'])
  d.balasan.length = 0
  assert.equal((await perintah(d, '4')).status, 'versi')
  assert.match(d.balasan.at(-1), /^\*Riwayat versi\*\n_P-291026-02, versi 1_\n/, 'menu terakhir = penanganan')
  fs.rmSync(path.join(d.dasar, 'proyek', 'menu.json'))
  assert.equal((await perintah(d, '2')).status, 'menu ganda')
  assert.match(d.balasan.at(-1), /^\*Ada 2 draf terbuka\*\n\n- P-291026-0[12]: Laporan .*\n- P-291026-0[12]: Laporan .*\n\nKetik perintahnya dengan kode proyek, misalnya \*final P-291026-0[12]\*\.$/)
  assert.equal(d.kirim.length, 4, 'hanya 2 kiriman per draf, tidak ada berkas final terkirim')
  assert.deepEqual(parsePerintah('final P-291026-01'), { aksi: 'final', id: 'P-291026-01' })
  assert.equal((await perintah(d, 'versi P-291026-01')).status, 'versi')
  assert.match(d.balasan.at(-1), /^\*Riwayat versi\*\n_P-291026-01, versi 1_\n/)
})

// ---------- K18: data satelit penanganan ----------
const BELUM = { firms_terakhir_wib: '13:42', lintasan_siang: true, situs_memuat: false }
function duniaSatelit(st) {
  const d = dunia({ pesan: [P('2', 'bmkg_pagi'), P('4', 'satgas')] })
  d.st = st; d.panggilSat = []
  d.ctx.dep.statusSatelit = async (t) => { d.panggilSat.push(t); return d.st }
  return d
}

test('K18: daftar bahan penanganan memuat baris data satelit; harian tidak; status satelit galat tidak menahan', async () => {
  const d = duniaSatelit(BELUM)
  await perintah(d, 'buat penanganan 26 okt')
  assert.match(d.balasan[0], /^\*Bahan wajib lengkap\*\n_P-291026-01_\n\nLaporan Penanganan Pengendalian Karhutla 26 Okt\nData satelit: lintasan siang masuk FIRMS 13\.42 WIB, situs belum memuat\.\n\n\*Wajib:\*/)
  assert.deepEqual(d.panggilSat, [TGL])
  const e = duniaSatelit({ ...BELUM, situs_memuat: true }); await perintah(e, 'buat penanganan 26 okt')
  assert.match(e.balasan[0], /situs sudah memuat\./)
  const g = duniaSatelit({ firms_terakhir_wib: '09:10', lintasan_siang: false, situs_memuat: true }); await perintah(g, 'buat penanganan 26 okt')
  assert.match(g.balasan[0], /Data satelit: lintasan siang belum masuk FIRMS \(terakhir 09\.10 WIB\), situs sudah memuat\./)
  const h = dunia(); h.ctx.dep.statusSatelit = async () => { throw new Error('jaringan') }
  await perintah(h, 'buat harian 26 okt')
  assert.doesNotMatch(h.balasan[0], /Data satelit/)
})

test('K18: situs belum memuat lintasan siang = pilih tunggu atau hitung; hitung membangun dengan --firespot firms dan catatan', async () => {
  const d = duniaSatelit(BELUM)
  assert.equal((await perintah(d, 'hitung')).status, 'satelit tanpa pilihan', 'tanpa pilihan hidup: petunjuk')
  assert.match(d.balasan.at(-1), /^\*Tidak ada pilihan menunggu\*\n\n\*hitung\* hanya menjawab pilihan data satelit/)
  assert.equal(d.proyek.size, 0); assert.equal(d.gen().length, 0); d.balasan.length = 0
  await perintah(d, 'buat penanganan 26 okt'); await perintah(d, 'lanjut')
  assert.equal(d.gen().length, 0); assert.deepEqual(d.statusLog, ['bertanya'])
  assert.equal(d.balasan.at(-1), '*Situs belum memuat data satelit*\n_P-291026-01_\n\nData satelit: lintasan siang masuk FIRMS 13.42 WIB, situs belum memuat.\n\nPilih salah satu:\n- *tunggu*: dibangun otomatis begitu situs memuat lintasan itu\n- *hitung*: bangun sekarang, firespot dihitung langsung dari FIRMS dengan rumus yang sama dengan situs')
  gayaWa(d.balasan.at(-1))
  assert.equal(await klasifikasi({ dari: DARI, teks: 'Hitung.' }, d.ctx), 'perintah')
  assert.equal(await klasifikasi({ dari: DARI, teks: 'hitung', diteruskan: true }, d.ctx), 'bahan')
  assert.equal((await perintah(d, 'hitung')).status, 'hitung')
  assert.equal(d.gen().length, 1)
  const a = d.gen()[0].args
  assert.deepEqual(a.slice(a.indexOf('--firespot'), a.indexOf('--firespot') + 2), ['--firespot', 'firms'])
  assert.match(d.kirim[0].caption, /- Firespot dihitung langsung dari FIRMS dengan rumus situs\./)
  assert.equal(await klasifikasi({ dari: DARI, teks: 'hitung' }, d.ctx), 'perintah', 'kata satelit selalu perintah (bukan revisi)')
  assert.equal((await perintah(d, 'hitung')).status, 'satelit tanpa pilihan', 'pilihan selesai saat membangun: petunjuk, tanpa bangun ulang')
  assert.equal(d.gen().length, 1)
  // situs sudah memuat: langsung dibangun tanpa bendera
  const e = duniaSatelit({ ...BELUM, situs_memuat: true }); await bangun(e, 'buat penanganan 26 okt')
  assert.equal(e.gen().length, 1); assert.ok(!e.gen()[0].args.includes('--firespot'))
})

test('K18: tunggu = dicek detak 10 menit (ulangSatelit), dibangun begitu situs memuat; hitung tetap bisa selama menunggu', async () => {
  const d = duniaSatelit(BELUM)
  await perintah(d, 'buat penanganan 26 okt'); await perintah(d, 'lanjut')
  assert.equal((await perintah(d, 'tunggu')).status, 'tunggu')
  assert.equal(d.balasan.at(-1), '*Menunggu situs*\n_P-291026-01_\n\nLaporan dibangun otomatis begitu situs memuat lintasan siang.\nDicek tiap 10 menit.\n\nKetik *hitung* bila ingin membangun sekarang.')
  const keluar = []
  const ctxDetak = { ...d.ctx, balas: undefined, balasFile: undefined, balasKe: (dari) => ({ balas: async (t) => keluar.push({ dari, t }), balasFile: async (p, nama, caption) => keluar.push({ dari, nama, caption }) }) }
  assert.deepEqual(await ulangSatelit(ctxDetak), [{ id: 'P-291026-01', status: 'tunggu' }])
  assert.equal(d.gen().length, 0)
  d.st = { ...BELUM, situs_memuat: true }
  assert.deepEqual(await ulangSatelit(ctxDetak), [{ id: 'P-291026-01', status: 'bangun' }])
  assert.equal(d.gen().length, 1); assert.ok(!d.gen()[0].args.includes('--firespot'))
  assert.ok(keluar.every((k) => k.dari === DARI), 'draf hanya ke pemegang')
  assert.match(keluar[0].caption, /^\*Draf v1 siap\*\n_P-291026-01, versi 1_\n/)
  assert.deepEqual(await ulangSatelit(ctxDetak), [], 'tidak dibangun dua kali')
})

test('K18: pilihan basi (lebih 24 jam) atau proyek batal tidak dihidupkan lagi; batal menghapus pilihan', async () => {
  const d = duniaSatelit(BELUM)
  await perintah(d, 'buat penanganan 26 okt'); await perintah(d, 'lanjut')
  const besok = { ...d.ctx, now: new Date(NOW.getTime() + 25 * 3600e3) }
  assert.equal((await tangani({ dari: DARI, teks: 'hitung' }, besok)).status, 'satelit tanpa pilihan')
  assert.equal(d.gen().length, 0)
  await perintah(d, 'batal')
  assert.equal(fs.existsSync(path.join(d.dasar, 'proyek', 'satelit.json')) && Object.keys(JSON.parse(fs.readFileSync(path.join(d.dasar, 'proyek', 'satelit.json'), 'utf8'))).length, 0)
  assert.equal((await perintah(d, 'tunggu')).status, 'satelit tanpa pilihan')
  assert.equal(d.proyek.size, 1, 'tidak membuka proyek baru')
})

test('K18: tunggu dibatasi: 3 status kosong berturut-turut atau 3 jam = pemegang ditanya sekali lagi', async () => {
  const d = duniaSatelit(BELUM)
  await perintah(d, 'buat penanganan 26 okt'); await perintah(d, 'lanjut'); await perintah(d, 'tunggu')
  const keluar = [], masukLihat = []
  const ke = (now) => ({ ...d.ctx, now, balasKe: (dari, masuk) => { masukLihat.push(masuk); return { balas: async (t) => keluar.push(t), balasFile: async () => {} } } })
  d.st = null
  const h = []
  for (let i = 1; i <= 4; i++) h.push((await ulangSatelit(ke(new Date(NOW.getTime() + i * 600e3))))[0].status)
  assert.deepEqual(h, ['tunggu', 'tunggu', 'tanya ulang', 'tunggu'], 'ditanya sekali saja')
  assert.equal(keluar.length, 1)
  assert.equal(keluar[0], '*Situs masih belum memuat*\n_P-291026-01_\n\nData satelit: status belum terbaca.\n\nPilih lagi:\n- *hitung*: bangun sekarang, firespot dihitung langsung dari FIRMS dengan rumus yang sama dengan situs\n- *tunggu*: tetap menunggu situs')
  assert.ok(masukLihat.every((m) => m === NOW.getTime()), 'jam pesan tunggu dipakai sebagai jam masuk')
  // tunggu lagi = hitungan baru; 3 jam dengan status terbaca tetapi situs belum memuat = ditanya lagi
  await perintah(d, 'tunggu'); keluar.length = 0; d.st = BELUM
  assert.equal((await ulangSatelit(ke(new Date(NOW.getTime() + 3600e3))))[0].status, 'tunggu')
  assert.equal((await ulangSatelit(ke(new Date(NOW.getTime() + 3.1 * 3600e3))))[0].status, 'tanya ulang')
  assert.match(keluar[0], /\nData satelit: lintasan siang masuk FIRMS 13\.42 WIB, situs belum memuat\.\n/)
  assert.equal(d.gen().length, 0)
})

test('K17/K18: kata tuntun yang diteruskan (lanjut, buat saja, hitung, tunggu) = bahan, bukan perintah', async () => {
  const d = duniaSatelit(BELUM)
  await perintah(d, 'buat penanganan 26 okt')
  for (const teks of ['lanjut', 'buat saja', 'hitung', 'tunggu', 'Lanjut.']) {
    assert.equal(await klasifikasi({ dari: DARI, teks, diteruskan: true }, d.ctx), 'bahan', teks)
    assert.notEqual((await tangani({ dari: DARI, teks, diteruskan: true }, d.ctx)).status, 'lanjut', teks)
  }
  assert.equal(d.gen().length, 0); assert.deepEqual(d.statusLog, [])
  assert.equal(await klasifikasi({ dari: DARI, teks: 'buat harian saja', diteruskan: true }, d.ctx), 'perintah', 'buat lengkap tetap perintah seperti dulu')
})

test('K17: tanda terima bahan bertanggal hari lain menyebut tanggalnya dan tidak menghitungnya', async () => {
  const d = dunia({ pesan: [P('1', 'rekap_koordalops_24')] }); d.ctx.jedaTerima = 0
  await perintah(d, 'buat harian 26 okt')
  const r = await tangani({ dari: DARI, teks: '[bmkg_pagi] 2026-10-25', wa_id: 5 }, d.ctx)
  assert.equal(await r.terima, '*Bahan bertanggal lain*\n_P-291026-01_\n\nLaporan Kejadian Bencana Harian 26 Okt\nDiterima, tetapi bertanggal 25 Okt, tidak dipakai untuk laporan 26 Okt: BMKG pagi.\n\n*Wajib:*\n- Rekap Koordalops 24 jam: sudah ada\n- BMKG pagi\n- PVMBG pagi\n\nKetik *lanjut* bila ingin membuat dengan bahan yang ada.')
})

test('K18: mode FIRMS tidak meneruskan PERINGATAN isian firespot generator, hanya CATATAN_FIRMS', async () => {
  const d = dunia({ pesan: [P('2', 'bmkg_pagi'), P('4', 'satgas')], stderrGen: 'PERINGATAN isian: firespot FIRMS dihitung ulang\nPERINGATAN isian: lokasi X diabaikan\n' })
  d.ctx.dep.statusSatelit = async () => BELUM
  await perintah(d, 'buat penanganan 26 okt'); await perintah(d, 'lanjut'); await perintah(d, 'hitung')
  assert.doesNotMatch(d.kirim[0].caption, /Isian diabaikan generator: firespot/)
  assert.match(d.kirim[0].caption, /Isian diabaikan generator: lokasi X diabaikan/)
  assert.match(d.kirim[0].caption, /Firespot dihitung langsung dari FIRMS/)
})

test('angka menu di luar draf: petunjuk singkat ketik buat, tanpa proyek dan tanpa Claude', async () => {
  const d = dunia()
  assert.equal((await perintah(d, '1')).status, 'menu tanpa draf')
  assert.equal(d.balasan.at(-1), '*Belum ada draf*\n\nAngka 1 menjawab menu draf. Kirim bahan, lalu ketik *buat* dulu.')
  assert.equal(d.proyek.size, 0); assert.equal(d.keUrai.length, 0)
  assert.equal(await klasifikasi({ dari: DARI, teks: '4' }, d.ctx), 'perintah')
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ya' }, d.ctx), 'bahan', 'ya tanpa tanya batal tetap seperti dulu')
})

test('revisi: GalatClaude dan generator gagal mengembalikan draf, pemilik dikabari, versi tetap', async () => {
  const d = await drafV1()
  d.ctx.dep.claude.operasi = async () => { throw new GalatClaude('batas_belanja', 'x') }
  await perintah(d, 'judul ganti')
  assert.deepEqual(d.statusLog, ['membangun', 'draf'])
  assert.equal(d.balasan[0], '*Kuota hari ini habis*\n_P-291026-01, versi 1_\n\nKuota pembacaan hari ini sudah habis. Bot lanjut lagi besok.')
  assert.match(d.pemilik.at(-1), /Claude gagal \(batas_belanja\)/)
  const e = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  const asli = e.ctx.dep.exec
  e.ctx.dep.exec = async (cmd, args, o) => { if (/_(ringkas|otomatis)\.py$/.test(args[0])) throw Object.assign(new Error('x'), { stderr: 'meledak' }); return asli(cmd, args, o) }
  await perintah(e, 'judul ganti')
  assert.deepEqual(e.statusLog, ['membangun', 'draf'])
  assert.equal(e.versi.length, 1); assert.equal(e.kirim.length, 0)
  assert.equal(e.balasan.at(-1), '*Revisi v2 gagal dibangun*\n_P-291026-01, versi 1_\n\nPenyebab: generator gagal: meledak\nDraf v1 tetap berlaku.\nPemilik sudah dikabari.\nKetik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan.')
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
  assert.equal(d.kirim[0].caption, '*PPTX final v2*\n_P-291026-01, versi 2_\n\nLaporan Kejadian Bencana Harian 26 Okt')
  assert.deepEqual(f.folderBaru, [{ tanggal: TGL, laporan: 'harian', n: 1 }])
  assert.deepEqual(f.unggahan, [{ folder: 'R1', nama: ['Laporan Kejadian Bencana Harian 261026.pptx', 'Laporan Kejadian Bencana Harian 261026.pdf'] }])
  assert.deepEqual(f.hasil, [], 'D13: final bot tidak menimpa arsip terjadwal')
  const p = proyekId(d)
  assert.equal(p.status, 'ditutup'); assert.equal(p.drive_url, 'https://drive.google.com/drive/folders/R1')
  assert.equal(d.balasan.length, 1)
  assert.equal(d.balasan[0], '*Laporan selesai*\n_P-291026-01, versi 2_\n\nLaporan Kejadian Bencana Harian 26 Okt, final versi 2.\nFolder Drive (Revisi 1):\nhttps://drive.google.com/drive/folders/R1\n\n*Riwayat versi:*\n- v1 29 Okt 08.00, buat\n- v2 29 Okt 08.01, revisi: judul ganti\n\nBiaya Claude laporan ini: $0,00.\n\nProyek ditutup. Bahan berikutnya membuka proyek baru.')
  gayaWa(d.balasan[0])
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
  assert.equal(d.balasan.at(-1), '*Final v1 diterima*\n_P-291026-01, versi 1_\n\nPenutupan belum selesai, diulang otomatis tiap 10 menit.\nTautan Drive menyusul.')
  assert.equal(d.pemilik.length, 1); assert.match(d.pemilik[0], /^\*Galat bot laporan\*\n_P-291026-01, versi 1_\n\nUnggah Google Drive gagal, diulang otomatis tiap 10 menit\./)
  // final lagi saat tertunda: melanjutkan penutupan (Drive masih gagal), tanpa mengirim berkas lagi
  await perintah(d, 'final')
  assert.equal(d.kirim.length, 2); assert.match(d.balasan.at(-1), /Penutupan belum selesai/)
  assert.equal(d.pemilik.length, 1, 'kabar pemilik sekali per proyek')
  assert.deepEqual(await ulang(d), [{ id: 'P-291026-01', status: 'ditutup' }])
  assert.deepEqual(f.folderBaru.map((x) => x.n), [4], 'satu folder Revisi saja, nomor sesudah Revisi 3 yang sudah ada')
  assert.deepEqual(f.unggahan.map((x) => x.folder), ['R4'])
  assert.equal(proyekId(d).status, 'ditutup'); assert.equal(proyekId(d).drive_url, 'https://drive.google.com/drive/folders/R4')
  assert.equal(f.keKirimKe.length, 1); assert.equal(f.keKirimKe[0].t, DARI, 'T-FINAL hanya ke pemegang')
  assert.match(f.keKirimKe[0].s, /^\*Laporan selesai\*\n_P-291026-01, versi 1_\n\nLaporan Kejadian Bencana Harian 26 Okt, final versi 1\.\nFolder Drive \(Revisi 4\):\nhttps:\/\/drive\.google\.com\/drive\/folders\/R4\n/)
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
  assert.match(d.pemilik.at(-1), /Pindah status ke ditutup gagal/)
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
  assert.match(e.balasan.at(-1), /^\*Laporan selesai\*\n_P-291026-01, versi 1_\n\nLaporan Kejadian Bencana Harian 26 Okt, final versi 1\./)
})

test('T10: kirim T-FINAL gagal = keadaan disimpan, diulang, tidak pernah dua kali; lewat 24 jam berhenti dan pemilik dikabari sekali', async () => {
  const d = await drafV1()
  const f = pasangFinal(d, { kirimGagal: 1, driveGagal: 1 })
  await perintah(d, 'final')
  assert.deepEqual(await ulang(d), [{ id: 'P-291026-01', status: 'tertunda' }], 'ditutup, tetapi T-FINAL gagal dikirim')
  assert.equal(proyekId(d).status, 'ditutup'); assert.equal(f.keKirimKe.length, 0)
  assert.match(d.pemilik.at(-1), /Kirim T-FINAL ke pemegang gagal/)
  assert.deepEqual(await ulang(d), [{ id: 'P-291026-01', status: 'ditutup' }])
  assert.equal(f.keKirimKe.length, 1)
  assert.deepEqual(await ulang(d), []); assert.equal(f.keKirimKe.length, 1, 'T-FINAL sekali saja')

  const e = await drafV1()
  pasangFinal(e, { driveGagal: 99 })
  await perintah(e, 'final')
  const kabar = e.pemilik.length
  const besok = new Date(NOW.getTime() + 25 * 3600e3)
  assert.deepEqual(await ulang(e, besok), [{ id: 'P-291026-01', status: 'basi' }])
  assert.equal(e.pemilik.length, kabar + 1); assert.match(e.pemilik.at(-1), /Final belum selesai sesudah 24 jam \(drive\), tidak diulang lagi\. Perlu ditangani manual\./)
  assert.deepEqual(await ulang(e, besok), [], 'tidak diulang dan tidak dikabari lagi')
  assert.equal(e.pemilik.length, kabar + 1)
})

test('ALUR C: sesudah ditutup, pesan berikutnya membuka proyek baru; kalimat bebas bukan revisi proyek lama', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  pasangFinal(d)
  await perintah(d, 'final')
  assert.equal((await perintah(d, 'judul ganti')).status, 'sapa', 'bukan revisi proyek lama (disapa T-SAPA)')
  assert.equal(d.keOperasi.length, 0)
  await perintah(d, 'final')
  assert.match(d.balasan.at(-1), /^\*Belum ada draf untuk difinalkan\*\n\nKirim bahan, lalu ketik \*buat harian\* atau \*buat penanganan\*\.$/)
  for (const a of [d.balasan, d.kirim, d.statusLog]) a.length = 0
  await bangun(d, 'buat harian 26 okt')
  assert.match(d.kirim[0].caption, /^\*Draf v1 siap\*\n_P-291026-02, versi 1_\n/)
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
  assert.match(e.balasan[0], /^\*Revisi belum bisa diproses\*\n_P-291026-01, versi 1_\n\nDaftar angka sistem yang dikunci untuk draf ini tidak ditemukan\./)
  assert.match(e.pemilik.at(-1), /Daftar kunci angka sistem v1 tidak ada/)
})

test('periksa gagal (gerbang format dan bahasa) masuk ringkasan: paling banyak 3 baris + dan N lainnya', async () => {
  const d = dunia({ periksa: () => ({ peringatan: [], gagal: ['slide 2 judul terlalu panjang', 'slide 3 font bukan Roboto', 'slide 4 kosong', 'slide 5 frasa AI', 'slide 6 em dash'], ms: 12 }) })
  await bangun(d, 'buat harian 26 okt')
  assert.match(d.kirim[0].caption, /\n\*Perlu dicek:\*\n- Slide 2 judul terlalu panjang \(belum dibetulkan\)\.\n- Slide 3 font bukan Roboto \(belum dibetulkan\)\.\n- Slide 4 kosong \(belum dibetulkan\)\.\n- dan 2 temuan lain\.(\n|$)/)
})

test('fetch Worker memakai AbortSignal (timeout): panggilan yang menggantung jadi galat Worker biasa', async () => {
  const d = dunia()
  const sinyal = []
  const asli = d.ctx.dep.fetch
  d.ctx.dep.fetch = async (u, o = {}) => { if (!u.includes('/api/wa/masuk')) sinyal.push(o.signal); if (/\/api\/wa\/proyek$/.test(new URL(u).pathname)) throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }); return asli(u, o) }
  const r = await bangun(d, 'buat harian 26 okt')
  assert.equal(r.status, 'galat')
  assert.ok(sinyal.length && sinyal.every((s) => s instanceof AbortSignal))
  assert.match(d.balasan.at(-1), /Perintah gagal diproses/)
  assert.match(d.pemilik[0], /aborted due to timeout/)
})

test('panduan: infografis dikirim sebagai PDF dari keluaran, bukan gambar', async () => {
  const P = await import('../../scripts/wa/proyek.mjs')
  assert.deepEqual(P.parsePerintah('panduan'), { aksi: 'panduan' })
  const fs2 = await import('node:fs'), os2 = await import('node:os'), path2 = await import('node:path')
  const dasar = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'panduan-'))
  const kirim = []
  const ctx = { env: { WA_IZIN: '6281200000001', PEMILIK: '6281200000001' }, dasar, dep: {}, balas: async (t) => kirim.push({ t }), balasFile: async (p, n, c, m, o) => kirim.push({ p, n, c, m, o }) }
  await P.tangani({ dari: '6281200000001', teks: 'panduan' }, ctx)
  assert.equal(kirim.length, 1)
  assert.ok(kirim[0].p && kirim[0].p.startsWith(path2.join(dasar, 'keluaran')), 'berkas di bawah keluaran')
  assert.equal(kirim[0].m, 'application/pdf'); assert.match(kirim[0].n, /\.pdf$/)
  assert.match(kirim[0].c, /^\*Panduan bot laporan\*/)
})

// ---------- 18 Nov 2026 (uji WA langsung): ulangi, batal kapan saja, ekor perintah, satu pembangunan, kemajuan, T-SAPA, laporan penanganan lengkap ----------
const gagalGenerator = (d) => { const asli = d.ctx.dep.exec; d.ctx.dep.exec = async (cmd, args, o) => { if (/_(ringkas|otomatis)\.py$/.test(args[0])) throw Object.assign(new Error('x'), { stderr: 'meledak' }); return asli(cmd, args, o) }; return () => { d.ctx.dep.exec = asli } }

test('ulangi: bangun gagal dibangun ulang seperti lanjut; revisi gagal diulang dengan kalimat yang sama; tanpa galat = petunjuk', async () => {
  const d = dunia()
  assert.equal((await perintah(d, 'ulangi')).status, 'ulangi')
  assert.equal(d.balasan.at(-1), '*Tidak ada yang perlu diulang*\n\nBelum ada langkah yang gagal. Ketik *status* untuk melihat proyek.')
  await perintah(d, 'buat harian 26 okt')
  const pulih = gagalGenerator(d)
  await perintah(d, 'lanjut')
  assert.equal(d.versi.length, 0)
  pulih()
  assert.equal((await perintah(d, 'ulangi')).status, 'ulangi')
  assert.equal(d.versi.length, 1, 'ulangi membangun draf v1')
  assert.match(d.kirim.at(-1).caption, /^\*PDF draf v1\*/)
  await perintah(d, 'ulangi')
  assert.match(d.balasan.at(-1), /^\*Tidak ada yang perlu diulang\*/, 'sesudah berhasil tidak ada lagi yang diulang')
  // revisi
  const e = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  const pulihE = gagalGenerator(e)
  await perintah(e, 'judul ganti')
  assert.equal(e.versi.length, 1)
  pulihE()
  await perintah(e, 'ulangi.')
  assert.equal(e.versi.length, 2)
  assert.deepEqual(e.keOperasi.map((x) => x.kalimat), ['judul ganti', 'judul ganti'], 'kalimat revisi yang sama')
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ulangi', diteruskan: true }, e.ctx), 'bahan', 'ulangi diteruskan = bahan')
})

test('batal bekerja di tiap status terbuka: terbuka, bertanya, membangun yang basi, draf', async () => {
  const a = dunia(); await perintah(a, 'buat harian 26 okt')
  assert.equal((await perintah(a, 'batal')).status, 'batal'); assert.equal([...a.proyek.values()][0].status, 'batal')
  assert.match(a.balasan.at(-1), /^\*Proyek dibatalkan\*\n_P-291026-01_\n/)
  const b = dunia({ claude: () => ({ isian: [], gagal: [], pertentangan: [{ medan: 'sorti', a: { nilai: '1', kutipan: 'x' }, b: { nilai: '2', kutipan: 'y' } }] }) })
  await bangun(b, 'buat harian 26 okt'); assert.equal([...b.proyek.values()][0].status, 'bertanya')
  await perintah(b, 'Batal!'); assert.equal([...b.proyek.values()][0].status, 'batal')
  const c = dunia(); await perintah(c, 'buat harian 26 okt')
  const p = [...c.proyek.values()][0]; p.status = 'membangun' // proses mati: tanpa kunci hidup
  await perintah(c, 'batal'); assert.equal(p.status, 'batal')
})

test('ekor bukan huruf atau angka pada perintah satu baris diabaikan', () => {
  for (const [t, aksi] of [['lanjut\\', 'lanjut'], ['lanjut.', 'lanjut'], ['final!', 'final'], ['Ulangi?', 'ulangi'], ['status..', 'status'], ['4 .', 'menu']]) assert.equal(parsePerintah(t)?.aksi, aksi, t)
  assert.equal(parsePerintah('lanjut\\\nlagi'), null, 'berbaris banyak tetap bukan perintah')
})

test('lanjut kedua saat pembangunan masih jalan: sekali "Masih dibangun", tidak membangun dua kali', async () => {
  let lepas; const tahan = new Promise((r) => { lepas = r })
  const d = dunia({ tahanGenerator: tahan })
  await perintah(d, 'buat harian 26 okt')
  const pertama = perintah(d, 'lanjut')
  for (let i = 0; i < 50 && !d.gen().length; i++) await new Promise((r) => setTimeout(r, 10))
  assert.equal((await perintah(d, 'lanjut')).status, 'masih dibangun')
  assert.equal(await jawabSibukLangsung({ dari: DARI, teks: 'lanjut\\' }, d.ctx), true, 'gateway menjawab tanpa antre')
  assert.equal(await jawabSibukLangsung({ dari: DARI, teks: 'lanjut', diteruskan: true }, d.ctx), false)
  assert.equal(d.balasan.filter((t) => /^\*Masih dibangun\*/.test(t)).length, 1, 'dijawab sekali')
  assert.equal(d.balasan.filter((t) => /^\*Masih dibangun\*/.test(t))[0], '*Masih dibangun*\n_P-291026-01_\n\nTunggu sebentar, draf dikirim begitu siap.')
  lepas(); await pertama
  assert.equal(d.gen().length, 1)
  assert.equal(await jawabSibukLangsung({ dari: DARI, teks: 'lanjut' }, d.ctx), false, 'sesudah selesai tidak sibuk')
})

function pasangKemajuan(d, { tutupSesudah = Infinity } = {}) {
  const k = { kirim: [], ubah: [], ketik: [] }
  d.ctx.kirimProgres = async (t) => { k.kirim.push(t); return { id: 'K' + k.kirim.length } }
  d.ctx.ubahProgres = async (h, t) => { if (k.ubah.length >= tutupSesudah) return false; k.ubah.push({ h, t }); return true }
  d.ctx.mengetik = (on) => { k.ketik.push(on) }
  return k
}

test('kemajuan: tanpa pesan kemajuan (tidak ada kirim atau sunting), hanya mengetik nyala lalu mati; bangun, gagal, revisi', async () => {
  const d = dunia(); const k = pasangKemajuan(d)
  await bangun(d, 'buat harian 26 okt')
  assert.equal(k.kirim.length, 0); assert.equal(k.ubah.length, 0); assert.deepEqual(k.ketik, [true, false]); assert.equal(d.versi.length, 1)
  const e = dunia(); const k2 = pasangKemajuan(e)
  await perintah(e, 'buat harian 26 okt'); gagalGenerator(e); await perintah(e, 'lanjut')
  assert.equal(k2.kirim.length, 0); assert.deepEqual(k2.ketik, [true, false])
  const f = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] }); const k3 = pasangKemajuan(f)
  await perintah(f, 'judul ganti')
  assert.equal(k3.kirim.length, 0); assert.equal(k3.ubah.length, 0); assert.deepEqual(k3.ketik, [true, false])
})

test('T-SAPA: sapaan pendek tanpa proyek dibalas sekali per 6 jam; diteruskan, panjang, atau pemegang draf tidak', async () => {
  const d = dunia({ pesan: [] })
  const r = await tangani({ dari: DARI, teks: 'halo', wa_id: 31 }, d.ctx)
  assert.equal(r.sapa, true); assert.equal(d.balasan.at(-1), T_SAPA)
  assert.equal(T_SAPA, '*Halo, ini Bot Laporan BNPB*\nBot ini menyusun laporan resmi BNPB dari bahan yang Anda kirim, lalu menyimpannya ke Google Drive Tim IT.\n\n*Mulai dengan mengetik:*\n- *buat harian*: laporan kejadian bencana harian\n- *buat penanganan*: laporan penanganan karhutla\n\n*Butuh bantuan?*\n- *bantuan*: daftar perintah\n- *panduan*: panduan lengkap (PDF)\n\nBot Laporan BNPB v' + (await import('../../scripts/wa/versi.mjs')).VERSI)
  assert.doesNotMatch(T_SAPA, SISTEM_HURUF)
  assert.equal(d.proyek.size, 0, 'sapaan tidak masuk proyek')
  assert.equal((await tangani({ dari: DARI, teks: 'selamat pagi', wa_id: 32 }, d.ctx)).sapa, undefined, 'dalam 6 jam diam')
  assert.equal(d.balasan.length, 1)
  const nanti = { ...d.ctx, now: new Date(NOW.getTime() + 7 * 3600e3) }
  assert.equal((await tangani({ dari: DARI, teks: 'test', wa_id: 33 }, nanti)).sapa, true)
  const e = dunia({ pesan: [] })
  await tangani({ dari: DARI, teks: 'halo', wa_id: 34, diteruskan: true }, e.ctx)
  await tangani({ dari: DARI, teks: 'x'.repeat(81), wa_id: 35 }, e.ctx)
  await tangani({ dari: DARI, teks: `[satgas] ${TGL}`, wa_id: 36 }, e.ctx)
  assert.equal(e.balasan.length, 0, 'diteruskan, panjang, atau bahan dikenali: tanpa T-SAPA')
  const f = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'JUDUL')] })
  assert.equal((await perintah(f, 'halo')).status, 'revisi', 'pemegang draf: kalimat bebas tetap revisi')
  assert.ok(!f.balasan.includes(T_SAPA))
})

test('penanganan: wajib laporan Satgas ATAU laporan penanganan lengkap (Mensesneg), tanpa BMKG pagi; lengkap dikirim sebagai --operasi', async () => {
  const d = dunia({ pesan: [P('5', 'karhutla_mensesneg')] })
  await perintah(d, 'buat penanganan 26 okt')
  assert.match(d.balasan[0], /^\*Bahan wajib lengkap\*\n_P-291026-01_\n\nLaporan Penanganan Pengendalian Karhutla 26 Okt\n\n\*Wajib:\*\n- Satgas pemadaman atau laporan penanganan lengkap: sudah ada\n\n\*Opsional, boleh dilewati:\*/)
  await perintah(d, 'lanjut')
  const a = d.gen()[0].args
  assert.ok(!a.includes('--bmkg'))
  assert.equal(fs.readFileSync(a[a.indexOf('--operasi') + 1], 'utf8'), `[karhutla_mensesneg] ${TGL}`)
  assert.doesNotMatch(d.kirim[0].caption, /belum ada/, 'tanpa catatan bahan wajib kurang')
  // satgas lebih dulu bila keduanya ada
  const e = dunia({ pesan: [P('5', 'karhutla_mensesneg'), P('4', 'satgas')] })
  await bangun(e, 'buat penanganan 26 okt')
  const b = e.gen()[0].args
  assert.equal(fs.readFileSync(b[b.indexOf('--operasi') + 1], 'utf8'), `[satgas] ${TGL}`)
  // tanda terima memakai label laporan penanganan lengkap
  const masukG = []; const g = dunia({ pesan: masukG }); await perintah(g, 'buat penanganan 26 okt')
  masukG.push(P('9', 'karhutla_mensesneg'))
  const r = await tangani({ dari: DARI, teks: `[karhutla_mensesneg] ${TGL}`, wa_id: 9 }, g.ctx)
  assert.match(await r.terima, /^\*Bahan wajib lengkap\*\n_P-291026-01_\n\nDiterima: Laporan penanganan lengkap\./)
})

test('laporan penanganan lengkap (bagian Operasi format Satgas) dikenali sebagai karhutla_mensesneg dengan tanggal isinya', async () => {
  const { kenali: kenaliAsli, tanggalIsi: tanggalAsli } = await import('../../src/wa_jenis.js')
  const satgas = fs.readFileSync(new URL('./bahan/satgas_271026.txt', import.meta.url), 'utf8')
  const lengkap = 'Yth. Bapak Mensesneg\n*LAPORAN PENANGANAN KARHUTLA DI ENAM PROVINSI PRIORITAS*\n_27 Oktober 2026_\n\n***A. SITUASI UMUM***\nRingkasan.\n\n' + satgas.split('\n').slice(2).join('\n')
  assert.equal(kenaliAsli(lengkap, ''), 'karhutla_mensesneg')
  assert.equal(tanggalAsli(lengkap, 'karhutla_mensesneg'), '2026-10-27')
  // wa_operasi.operasi() membacanya sama dengan teks Satgas: data/laporan-bnpb/generator/tests/test_operasi_lengkap.py
})

test('BMKG pagi diteruskan sendirian tidak membuka proyek harian; tetap terhitung saat buat harian', async () => {
  const d = dunia({ pesan: [P('2', 'bmkg_pagi')] })
  const r = await tangani({ dari: DARI, teks: `[bmkg_pagi] ${TGL}`, wa_id: 2, diteruskan: true }, d.ctx)
  assert.equal(r.status, 'menunggu buat'); assert.equal(d.proyek.size, 0); assert.equal(d.balasan.length, 0)
  await perintah(d, 'buat harian 26 okt')
  assert.match(d.balasan.at(-1), /\n- BMKG pagi: sudah ada\n/)
})

test('ulangi: catatan gagal lebih tua dari 24 jam atau proyek asal tidak lagi terbuka = petunjuk, tanpa bangun', async () => {
  const d = dunia(); await perintah(d, 'buat harian 26 okt')
  const pulih = gagalGenerator(d); await perintah(d, 'lanjut'); pulih()
  const besok = { ...d.ctx, now: new Date(NOW.getTime() + 25 * 3600e3) }
  assert.equal((await tangani({ dari: DARI, teks: 'ulangi' }, besok)).status, 'ulangi')
  assert.match(d.balasan.at(-1), /^\*Tidak ada yang perlu diulang\*/); assert.equal(d.versi.length, 0)
  const e = dunia(); await perintah(e, 'buat harian 26 okt')
  const pulihE = gagalGenerator(e); await perintah(e, 'lanjut'); pulihE()
  ;[...e.proyek.values()][0].status = 'batal' // dibatalkan dari tempat lain
  await perintah(e, 'ulangi')
  assert.equal(e.balasan.at(-1), '*Tidak ada yang perlu diulang*\n\nProyek P-291026-01 tidak lagi menunggu dibangun. Ketik *status* untuk melihat proyek.')
  assert.equal(e.versi.length, 0); assert.equal(e.gen().length, 0, 'tidak membangun lagi')
})

test('T-SAPA diam selama pengirim punya proyek membangun atau pembangunan sedang jalan', async () => {
  const d = dunia(); await perintah(d, 'buat harian 26 okt')
  ;[...d.proyek.values()][0].status = 'membangun'
  assert.notEqual((await tangani({ dari: DARI, teks: 'halo', wa_id: 40 }, d.ctx)).sapa, true)
  let lepas; const tahan = new Promise((r) => { lepas = r })
  const e = dunia({ tahanGenerator: tahan }); await perintah(e, 'buat harian 26 okt')
  const jalan = perintah(e, 'lanjut')
  for (let i = 0; i < 50 && !e.gen().length; i++) await new Promise((r) => setTimeout(r, 10))
  assert.notEqual((await tangani({ dari: DARI, teks: 'halo', wa_id: 41 }, e.ctx)).sapa, true)
  lepas(); await jalan
  assert.ok(!e.balasan.includes(T_SAPA)); assert.ok(!d.balasan.includes(T_SAPA))
})

test('cut-off: hanya laporan penanganan; laporan kejadian bencana harian tanpa cut-off (pemilik 19 Nov 2026)', async () => {
  const { adaCutoff } = await import('../../scripts/wa/proyek.mjs')
  const { LAPORAN } = await import('../../scripts/wa/otomatis.mjs')
  assert.equal(adaCutoff(LAPORAN.find((l) => l.id === 'harian')), false)
  assert.equal(adaCutoff(LAPORAN.find((l) => l.id === 'penanganan')), true)
  const src = (await import('node:fs')).readFileSync(new URL('../../scripts/wa/proyek.mjs', import.meta.url), 'utf8')
  const jumlah = (x) => src.split(x).length - 1
  assert.ok(jumlah('jamWib(now) < lap.jam') >= 2, 'baris cut-off ada')
  assert.equal(jumlah('jamWib(now) < lap.jam'), jumlah('adaCutoff(lap) && cmd.tanggal === tanggalWib(now) && jamWib(now) < lap.jam'), 'tiap baris cut-off dijaga adaCutoff')
})

// ---------- bot V2: agen Claude Code (data/kajian-bnpb/bot-laporan ALUR V2; T28, T30-T32) ----------
// Deck V2 palsu: kepala ZIP + penanda + JSON inventaris (lolos cek PPTX bacaHasil); agen_isi.py palsu membaca JSON-nya.
const PK = Buffer.from([0x50, 0x4b, 3, 4])
const deckV2 = (inv) => Buffer.concat([PK, Buffer.from('ppt/presentation.xml#DECK#' + JSON.stringify(inv) + '#AKHIR#'), Buffer.alloc(1200, 32)])
const invDari = (f) => {
  const s = fs.readFileSync(f).toString('latin1')
  return s.startsWith('[') ? JSON.parse(fs.readFileSync(f, 'utf8')) : JSON.parse(Buffer.from(s.split('#DECK#')[1].split('#AKHIR#')[0], 'latin1').toString('utf8'))
}
const isiDari = (inv) => {
  const slides = new Map()
  for (const x of inv) { if (!slides.has(x.slide)) slides.set(x.slide, { n: x.slide, tersembunyi: false, shapes: [] }); slides.get(x.slide).shapes.push({ nama: x.shape, teks: x.teks, tampak: true }) }
  return { slides: [...slides.values()], lain: [], media: [] }
}
// agen palsu: ubah(inv, prompt) -> inv baru, atau {tanya: [...]}. Mencatat prompt dan opsi tiap jalan.
function duniaV2({ ubah = (inv) => inv.map((x) => (x.shape === 's3_rencana' ? { ...x, teks: 'Rencana Aksi pemantauan banjir' } : x)), ...o } = {}) {
  const d = dunia(o)
  d.ctx.env = { ...d.ctx.env, BL_VERSI: '2', BL_V2_NOMOR: DARI, ANTHROPIC_API_KEY: 'k', BL_BATAS_USD: '100', BL_TINJAU_VISUAL: o.tinjau ? '1' : '0' }
  d.agen = []
  d.biaya = 0
  const fetchAsli = d.ctx.dep.fetch
  d.ctx.dep.fetch = async (u, opsi = {}) => {
    const url = new URL(u)
    if (url.pathname === '/api/wa/biaya') {
      if ((opsi.method || 'GET') === 'POST') d.biaya += JSON.parse(opsi.body).usd_mikro
      return { ok: true, status: 200, json: async () => ({ usd_mikro: d.biaya }), text: async () => '' }
    }
    return fetchAsli(u, opsi)
  }
  const execAsli = d.ctx.dep.exec
  d.ctx.dep.exec = async (cmd, args, opsi) => {
    if (String(args[0]).endsWith('agen_isi.py')) return { stdout: JSON.stringify(isiDari(invDari(args[1]))) }
    if (String(args[0]).endsWith('ubah.py') && args[1] === 'inventaris') return { stdout: JSON.stringify(invDari(args[2])) }
    if (String(args[0]).endsWith('pdf.py')) {
      const pdf = path.join(args[2], path.basename(args[1]).replace(/\.pptx$/, '.pdf'))
      fs.writeFileSync(pdf, 'PDF'); return { stdout: pdf }
    }
    return execAsli(cmd, args, opsi)
  }
  let sesi = 0
  d.ctx.dep.agenQuery = ({ prompt, options }) => (async function* () {
    d.agen.push({ prompt, options })
    const id = options.resume || `sesi-${String(++sesi).padStart(8, '0')}`
    yield { type: 'system', subtype: 'init', session_id: id }
    yield { type: 'assistant', session_id: id }
    const ruang = (prompt.match(/Ruang kerja versi ini: (.+)/) || [])[1].trim()
    const sumber = fs.readdirSync(path.join(ruang, 'sebelum')).find((f) => f.endsWith('.pptx'))
    const asal = sumber ? path.join(ruang, 'sebelum', sumber) : path.join(ruang, 'dasar', fs.readdirSync(path.join(ruang, 'dasar')).find((f) => f.endsWith('.pptx')))
    const hasil = ubah(invDari(asal), prompt, d.agen.length)
    if (hasil.tanya) fs.writeFileSync(path.join(ruang, 'keluaran', 'hasil.json'), JSON.stringify({ tanya: hasil.tanya }))
    else {
      const nama = path.basename(asal)
      fs.writeFileSync(path.join(ruang, 'keluaran', nama), deckV2(hasil))
      fs.writeFileSync(path.join(ruang, 'keluaran', 'hasil.json'), JSON.stringify({ pptx: nama, ringkasan: 'Rencana aksi dirapikan.', perubahan: ['Slide 3: rencana aksi dirapikan'], catatan: [] }))
    }
    yield { type: 'result', subtype: 'success', is_error: false, total_cost_usd: 1.5, num_turns: 4, session_id: id }
  })()
  return d
}

test('V2 T30: lanjut = generator ke deck dasar, agen menyempurnakan, versi_bot 2, dua kiriman; nomor di luar BL_V2_NOMOR tetap V1', async () => {
  const d = duniaV2()
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.gen().length, 1, 'generator membangun deck dasar'); assert.equal(d.keUrai.length, 0, 'urai Claude V1 tidak dipakai')
  assert.equal(d.agen.length, 1); assert.equal(d.agen[0].options.resume, undefined)
  assert.match(d.agen[0].prompt, /bahan\/: 3 berkas/); assert.match(d.agen[0].options.systemPrompt.append, /Pedoman: Laporan Kejadian Bencana Harian/)
  assert.equal(d.versi.length, 1); assert.equal(d.versi[0].isian.versi_bot, 2); assert.equal(d.versi[0].isian.sesi, 'sesi-00000001')
  assert.match(d.versi[0].pptxIsi, /Rencana Aksi pemantauan banjir/)
  assert.equal(d.kirim.length, 2); assert.equal(d.kirim[1].mime, 'application/pdf'); assert.match(d.kirim[0].caption, /Rencana aksi dirapikan\./)
  assert.deepEqual(d.statusLog, ['membangun', 'draf']); assert.equal(d.biaya, 1.5e6, 'biaya agen ke batas harian bersama')
  const ruang1 = path.join(d.dasar + '-agen', 'P-291026-01', 'v1')
  assert.ok(fs.readdirSync(path.join(ruang1, 'dasar')).some((f) => f.endsWith('.kunci.json')), 'kunci generator di deck dasar')
  const v1 = duniaV2(); v1.ctx.env.BL_V2_NOMOR = '6281111'
  await bangun(v1, 'buat harian 26 okt')
  assert.equal(v1.agen.length, 0); assert.equal(v1.keUrai.length, 1, 'nomor lain tetap V1'); assert.equal(v1.versi[0].isian.versi_bot, undefined)
})

test('V2 T28: agen mengubah angka sistem terkunci = draf ditolak, tanpa versi, status kembali terbuka, ulangi tersedia', async () => {
  const d = duniaV2({ ubah: (inv) => inv.map((x) => (x.shape === 's2_kpi_hotspot' ? { ...x, teks: 'HOTSPOT\n999' } : x)) })
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.versi.length, 0); assert.equal(d.kirim.length, 0)
  assert.match(d.balasan.at(-1), /^\*Draf v1 ditolak\*/); assert.match(d.balasan.at(-1), /Pagar angka menolak draf ini/)
  assert.deepEqual(d.statusLog, ['membangun', 'terbuka'])
  assert.match(d.pemilik.at(-1), /pagar angka/)
})

test('V2 T31: revisi melanjutkan sesi (resume), V1 operasi tidak dipakai; balik v1 menyalin PPTX v1; revisi gagal kembali draf', async () => {
  let gagalKe = 0
  const d = duniaV2({ ubah: (inv, prompt, ke) => {
    if (ke === gagalKe) throw new Error('agen meledak')
    if (/hapus slide 3/.test(prompt)) return inv.filter((x) => x.slide !== 3)
    return inv.map((x) => (x.shape === 's3_rencana' ? { ...x, teks: 'Rencana Aksi pemantauan banjir' } : x))
  } })
  await bangun(d, 'buat harian 26 okt')
  await perintah(d, 'hapus slide 3 ya')
  assert.equal(d.agen.length, 2); assert.equal(d.agen[1].options.resume, 'sesi-00000001'); assert.equal(d.keOperasi.length, 0)
  assert.match(d.agen[1].prompt, /DATA dari WhatsApp/); assert.match(d.agen[1].prompt, /hapus slide 3 ya/)
  assert.equal(d.versi.length, 2); assert.doesNotMatch(d.versi[1].pptxIsi, /s3_rencana/); assert.match(d.versi[1].instruksi, /^revisi: hapus slide 3 ya/)
  assert.ok(fs.readdirSync(path.join(d.dasar + '-agen', 'P-291026-01', 'v2', 'sebelum')).length === 1, 'deck v1 di sebelum/')
  await perintah(d, 'balik v1')
  assert.equal(d.versi.length, 3); assert.equal(d.versi[2].pptxIsi, d.versi[0].pptxIsi); assert.equal(d.versi[2].isian.balik, 1); assert.equal(d.agen.length, 2, 'balik tanpa agen')
  gagalKe = 3
  const n = d.statusLog.length
  await perintah(d, 'ganti judul slide 1')
  assert.equal(d.versi.length, 3); assert.match(d.balasan.at(-1), /^\*Revisi v4 gagal dibuat\*/); assert.match(d.balasan.at(-1), /Draf v3 tetap berlaku/)
  assert.deepEqual(d.statusLog.slice(n), ['membangun', 'draf'])
  assert.match(d.agen[2].prompt, /salinan v1/, 'agen diberi tahu draf sekarang salinan v1')
})

test('V2 T32: pertanyaan agen saat bangun = bertanya; teks berikutnya jawaban ke sesi sama; lanjut tanpa jawaban; klasifikasi revisi', async () => {
  const d = duniaV2({ ubah: (inv, prompt, ke) => (ke === 1 ? { tanya: ['Panel OMC dan Hujan atau Semai OMC yang dihapus?'] } : inv) })
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.versi.length, 0); assert.match(d.balasan.at(-1), /^\*Perlu dipastikan dulu\*/); assert.match(d.balasan.at(-1), /Semai OMC/)
  assert.deepEqual(d.statusLog, ['membangun', 'bertanya'])
  assert.equal(await klasifikasi({ dari: DARI, teks: 'yang OMC dan Hujan saja, panel armada dilebarkan memenuhi slide supaya rapi' }, d.ctx), 'revisi', 'jawaban tidak jadi bahan')
  await tangani({ dari: DARI, teks: 'yang OMC dan Hujan saja, panel armada dilebarkan memenuhi slide supaya rapi', wa_id: 77 }, d.ctx)
  assert.equal(d.agen.length, 2); assert.equal(d.agen[1].options.resume, 'sesi-00000001'); assert.match(d.agen[1].prompt, /Jawaban pemakai/)
  assert.equal(d.versi.length, 1); assert.equal(d.versi[0].isian.versi_bot, 2)
  const e = duniaV2({ ubah: (inv, prompt, ke) => (ke === 1 ? { tanya: ['Yang mana?'] } : inv) })
  await bangun(e, 'buat harian 26 okt')
  await perintah(e, 'lanjut')
  assert.match(e.agen[1].prompt, /lanjut tanpa menjawab/); assert.equal(e.versi.length, 1, JSON.stringify(e.balasan.slice(-2)) + JSON.stringify(e.pemilik))
})

test('V2: final mencatat acuan laporan kemarin dan menghapus sesi agen', async () => {
  const d = duniaV2()
  d.ctx.dep.drive = { unggah: async () => ({ url: 'https://drive.google.com/x' }) }
  await bangun(d, 'buat harian 26 okt')
  assert.ok(fs.existsSync(path.join(d.dasar, 'agen', 'sesi.json')))
  const { bacaSesi } = await import('../../scripts/wa/agen.mjs')
  assert.equal(bacaSesi(d.dasar, 'P-291026-01').sesi, 'sesi-00000001')
  await perintah(d, 'batal')
  assert.equal(bacaSesi(d.dasar, 'P-291026-01'), null, 'batal menghapus sesi')
  assert.equal(fs.existsSync(path.join(d.dasar + '-agen', 'P-291026-01')), false, 'ruang kerja dihapus')
})

test('biaya: urai V1 dicatat per laporan dan per bulan; perintah biaya khusus pemilik dengan sisa anggaran; format dolar', async () => {
  const Biaya = await import('../../scripts/wa/biaya.mjs')
  assert.equal(Biaya.dolar(1234.5), '$1.234,50'); assert.equal(Biaya.dolar(0.05), '$0,05')
  const d = dunia({ claude: () => ({ isian: [], pertentangan: [], gagal: [], biaya: 1_250_000 }) })
  await bangun(d, 'buat harian 26 okt')
  assert.equal(Biaya.proyek(d.dasar, 'P-291026-01'), 1.25)
  d.ctx.env.BL_ANGGARAN_BULAN = '200'
  assert.equal(Biaya.barisBulan(d.dasar, d.ctx.env, NOW), 'Pemakaian bot Oktober: $1,25 dari anggaran $200,00.')
  // angka bulanan dari D1 bl_biaya per hari (lengkap), bukan berkas lokal (pemilik 19 Nov: bot $0,14, Console $7,46)
  const harian = { '2026-10-28': 5_000_000, '2026-10-29': 860_000 }
  const fetchAsli = d.ctx.dep.fetch
  d.ctx.dep.fetch = async (u, o = {}) => {
    const url = new URL(u)
    if (url.pathname === '/api/wa/biaya') return { ok: true, status: 200, json: async () => ({ usd_mikro: harian[url.searchParams.get('tanggal')] || 0 }), text: async () => '' }
    return fetchAsli(u, o)
  }
  // biaya laporan tampil di ringkasan draf selama proses (pemilik 19 Nov: "atau selama proses juga bisa")
  assert.ok(d.balasan.some((t) => /^\*Ada revisi\?\*\n_P-291026-01, versi 1_\n\n_Biaya Claude laporan ini sejauh ini: \$1,25\._\n/.test(t)), d.balasan.join('\n---\n'))
  const n = d.balasan.length
  await tangani({ dari: '6299', teks: 'biaya' }, d.ctx)
  assert.match(d.balasan[n], /^\*Pemakaian Claude\*\n\nPemakaian bot Oktober: \$5,86 dari anggaran \$200,00\.\nPemakaian hari ini: \$0,86\.\n/)
  assert.match(d.balasan[n], /\*Laporan terakhir:\*\n- P-291026-01: \$1,25\n/)
  assert.doesNotMatch(d.balasan[n], /saldo|sisa/i, 'tanpa sisa saldo (pemilik 19 Nov: tidak realtime)')
  await tangani({ dari: DARI, teks: 'biaya' }, d.ctx)
  assert.equal(d.balasan.at(-1), BANTUAN, 'bukan pemilik: bantuan biasa')
  assert.deepEqual(parsePerintah('biaya', NOW), { aksi: 'biaya' })
  assert.equal(parsePerintah('saldo 192,54', NOW), null, 'perintah saldo dicabut')
})

test('batal = mulai dari awal: bahan sebelum batal tidak dipakai proyek baru jenis dan tanggal sama; berkas kerja dihapus; jenis lain tetap', async () => {
  const d = dunia()
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.versi.length, 1)
  fs.mkdirSync(path.join(d.dasar, 'keluaran', 'proyek', 'P-291026-01'), { recursive: true })
  d.ctx.now = new Date(NOW.getTime() + 60e3)
  await perintah(d, 'batal')
  assert.equal(fs.existsSync(path.join(d.dasar, 'keluaran', 'proyek', 'P-291026-01')), false, 'berkas kerja proyek dihapus')
  d.ctx.now = new Date(NOW.getTime() + 120e3)
  const n = d.balasan.length
  await perintah(d, 'buat harian 26 okt')
  assert.match(d.balasan[n], /^\*Kirim bahan laporan\*\n_P-291026-02_/, 'proyek baru tanpa bahan lama')
  assert.doesNotMatch(d.balasan[n], /sudah ada/)
  const { waktuBatal, barisPenyebab } = await import('../../scripts/wa/proyek.mjs')
  assert.ok(waktuBatal(d.ctx, waSha(DARI, 'garam'), 'harian', TGL) > 0)
  assert.equal(waktuBatal(d.ctx, waSha(DARI, 'garam'), 'penanganan', TGL), 0, 'jenis lain tidak terpengaruh')
  assert.equal(barisPenyebab('generator gagal (kode G1, rincian di /Users/.../.wa-bot/keluaran/galat.txt): ModuleNotFoundError: No module named pptx'), 'Penyebab: generator gagal: ModuleNotFoundError: No module named pptx')
  assert.equal(barisPenyebab('POST /api/x HTTP 401 Bearer abc.def sk-ant-api03-xyz'), 'Penyebab: POST /api/x HTTP 401 Bearer … [disamarkan]')
})

test('kabar pemilik: tidak terkirim = tidak ditandai, dicoba lagi; pemilik sendiri tidak dibalas "Pemilik sudah dikabari"', async () => {
  const d = dunia(); gagalGenerator(d)
  let terkirim = false
  d.ctx.kabariPemilik = async () => terkirim // limiter menahan
  await bangun(d, 'buat harian 26 okt')
  assert.match(d.balasan.at(-1), /Pemilik sudah dikabari\./, 'pengirim bukan pemilik tetap diberi tahu')
  const kabar = () => { try { return JSON.parse(fs.readFileSync(path.join(d.dasar, 'proyek', 'kabar.json'), 'utf8')) } catch { return {} } }
  assert.equal(kabar().bangun, undefined, 'kabar yang ditahan tidak ditandai terkirim')
  terkirim = true
  await perintah(d, 'ulangi')
  assert.ok(kabar().bangun, 'galat berikutnya mengabari lagi')
  const e = dunia(); gagalGenerator(e)
  await bangun(e, 'buat harian 26 okt', '6299')
  assert.doesNotMatch(e.balasan.at(-1), /Pemilik sudah dikabari/); assert.match(e.balasan.at(-1), /Penyebab: generator gagal: meledak/)
})

// ---------- V2.1 kecerdasan percakapan (K29, K30; RENCANA-UJI T37-T43) ----------
const tunda = (ms) => new Promise((r) => setTimeout(r, ms))

test('T37: generator gagal baca bahan, Claude merapikan, generator ulang berhasil dan draf mencatatnya', async () => {
  const d = dunia()
  const keRapikan = []
  d.ctx.dep.claude.rapikan = async (bahan, galat) => { keRapikan.push({ bahan, galat }); return { bahan: { rekap_koordalops_24: `[rekap_koordalops_24] ${TGL} RAPI` }, perubahan: ['Penomoran kejadian diseragamkan'], biaya: 0 } }
  const asli = d.ctx.dep.exec
  d.ctx.dep.exec = async (cmd, args) => {
    if (/_ringkas\.py$/.test(args[0])) {
      const f = args[args.indexOf('--koordalops') + 1]
      if (!/RAPI/.test(fs.readFileSync(f, 'utf8'))) throw Object.assign(new Error('x'), { stderr: 'ValueError: terurai 15 kejadian, laporan menyebut 16 menonjol' })
    }
    return asli(cmd, args)
  }
  await bangun(d, 'buat harian 26 okt')
  assert.equal(keRapikan.length, 1)
  assert.match(keRapikan[0].galat, /16 menonjol/)
  assert.deepEqual(Object.keys(keRapikan[0].bahan).sort(), ['bmkg_pagi', 'pvmbg_pagi', 'rekap_koordalops_24'])
  assert.equal(d.versi.length, 1, 'draf v1 jadi')
  assert.ok(d.semua().some((t) => /Bahan dirapikan Claude supaya terbaca: Penomoran kejadian diseragamkan/.test(t)), d.semua().join('\n---\n'))
})

test('T38: rapikan yang menambah angka ditolak pagar; generator tidak diulang dan pengirim diberi penyebab', async () => {
  const d = dunia()
  d.ctx.dep.claude.rapikan = async () => ({ bahan: { rekap_koordalops_24: `[rekap_koordalops_24] ${TGL} 99 rumah rusak` }, perubahan: ['x'], biaya: 0 })
  let jalan = 0
  d.ctx.dep.exec = async (cmd, args) => { if (/_ringkas\.py$/.test(args[0])) { jalan++; throw Object.assign(new Error('x'), { stderr: 'ValueError: label' }) } return { stdout: '' } }
  await bangun(d, 'buat harian 26 okt')
  assert.equal(jalan, 1)
  assert.match(d.balasan.at(-1), /^\*Draf v1 gagal dibangun\*/)
  assert.match(d.balasan.at(-1), /Penyebab: generator gagal: ValueError: label\n/)
})

test('T38: rapikan berhasil tapi generator tetap gagal: paling banyak 2 putaran, penyebab menyebut rapikan', async () => {
  const d = dunia()
  let n = 0
  d.ctx.dep.claude.rapikan = async () => ({ bahan: { rekap_koordalops_24: `[rekap_koordalops_24] ${TGL} ${'x'.repeat(++n)}` }, perubahan: ['y'], biaya: 0 })
  let jalan = 0
  d.ctx.dep.exec = async (cmd, args) => { if (/_ringkas\.py$/.test(args[0])) { jalan++; throw Object.assign(new Error('x'), { stderr: 'ValueError: tetap' }) } return { stdout: '' } }
  await bangun(d, 'buat harian 26 okt')
  assert.equal(n, 2)
  assert.equal(jalan, 3)
  assert.match(d.balasan.at(-1), /bahan sudah dirapikan Claude, generator tetap gagal/)
})

const denganMaksud = (d, f) => { const ke = []; d.ctx.dep.claude.maksud = async (teks, konteks) => { ke.push({ teks, konteks }); return { ...f(teks, konteks), biaya: 0 } }; return ke }

test('T39: kalimat bebas "bikinin laporan harian 26 okt" = daftar bahan, tidak disimpan sebagai bahan', async () => {
  const d = dunia()
  const ke = denganMaksud(d, () => ({ maksud: 'buat', jenis: 'harian', tanggal: TGL, balasan: '' }))
  const pesan = { dari: DARI, teks: 'tolong bikinin laporan harian tgl 26 dong' }
  assert.equal(await klasifikasi(pesan, d.ctx), 'revisi', 'langsung ke mesin proyek, tidak ke Worker')
  await tangani(pesan, d.ctx)
  assert.equal(ke.length, 1, 'klasifikasi dan tangani memakai satu panggilan (cache)')
  assert.match(d.balasan.at(-1), DAFTAR_BAHAN)
  assert.equal(d.gen().length, 0, 'buat dari kalimat bebas tidak membangun')
  assert.equal((await klasifikasi({ dari: DARI, teks: 'lanjut' }, d.ctx)), 'perintah')
  assert.equal(ke.length, 1, 'perintah baku tidak memanggil Claude')
})

test('T39: "udah oke finalkan" dari pemegang draf ditanya dulu; batal dari kalimat bebas juga ditanya', async () => {
  const d = await drafV1()
  denganMaksud(d, (t) => ({ maksud: /final/.test(t) ? 'final' : 'batal', jenis: '', tanggal: '', balasan: '' }))
  const r = await perintah(d, 'udah oke finalkan aja')
  assert.equal(r.status, 'tanya final')
  assert.match(d.balasan.at(-1), /^\*Perlu dipastikan dulu\*\n_P-291026-01, versi 1_\n/)
  assert.match(d.balasan.at(-1), /Ketik \*ya\* untuk mengirim draf v1 sebagai versi final ke Drive/)
  assert.equal(await klasifikasi({ dari: DARI, teks: 'ya' }, d.ctx), 'perintah')
  assert.equal(d.keOperasi.length, 0, 'bukan revisi')
  await perintah(d, 'batalin aja deh laporannya')
  assert.match(d.balasan.at(-1), /^\*Batalkan proyek ini\?\*/)
  await perintah(d, 'ya')
  assert.equal([...d.proyek.values()].find((x) => x.jenis === 'harian').status, 'batal')
})

test('T40: maksud gagal (galat Claude) = perilaku lama: pemegang draf direvisi, nomor lain disapa', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'LAPORAN HARIAN BNPB')] })
  d.ctx.dep.claude.maksud = async () => { throw new GalatClaude('tolak') }
  assert.equal((await perintah(d, 'judul tambahkan BNPB')).status, 'revisi')
  assert.equal(d.keOperasi.length, 1)
  assert.equal((await tangani({ dari: '6281111', teks: 'halo bot' }, d.ctx)).status, 'sapa')
})

test('T41: pertanyaan tentang draf dijawab dari isi deck tanpa versi baru dan tanpa generator', async () => {
  const d = await drafV1()
  denganMaksud(d, () => ({ maksud: 'tanya', jenis: '', tanggal: '', balasan: '' }))
  const ke = []
  d.ctx.dep.claude.jawabDraf = async (inv, riwayat, q) => { ke.push({ inv, riwayat, q }); return { jawaban: 'Slide 2 memuat ringkasan banjir di Bogor.', biaya: 0 } }
  const r = await perintah(d, 'slide 2 isinya apa ya?')
  assert.equal(r.status, 'tanya draf')
  assert.equal(ke[0].q, 'slide 2 isinya apa ya?')
  assert.ok(ke[0].inv.some((x) => x.shape === 's2_ringkas'))
  assert.match(d.balasan.at(-1), /^\*Tentang draf v1\*\n_P-291026-01, versi 1_\n\nSlide 2 memuat ringkasan banjir di Bogor\./)
  assert.equal(d.versi.length, 1)
  assert.equal(d.gen().length, 0)
  assert.equal(d.keOperasi.length, 0)
})

test('T42: revisi, tiga pesan (satu diteruskan), lanjut = satu revisi berisi ketiganya bernomor', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'LAPORAN HARIAN BNPB')] })
  d.ctx.jedaKumpulMs = 5
  assert.equal(await klasifikasi({ dari: DARI, teks: 'revisi' }, d.ctx), 'perintah')
  assert.equal((await perintah(d, 'revisi')).status, 'kumpul revisi')
  assert.match(d.balasan.at(-1), /^\*Siap menerima revisi\*/)
  const terusan = { dari: DARI, teks: 'catatan lapangan: jembatan putus', diteruskan: true }
  assert.equal(await klasifikasi(terusan, d.ctx), 'revisi', 'pesan diteruskan saat kumpul tidak jadi bahan')
  assert.equal((await perintah(d, 'judul tambahkan BNPB')).status, 'revisi dicatat')
  assert.equal((await tangani(terusan, d.ctx)).status, 'revisi dicatat')
  assert.equal((await perintah(d, 'slide 3 rencana aksi sebut BPBD')).status, 'revisi dicatat')
  assert.equal(d.keOperasi.length, 0, 'belum dikerjakan sebelum lanjut')
  await tunda(30)
  assert.equal(d.balasan.filter((t) => /^\*Revisi tersimpan\*/.test(t)).length, 1, 'tanda terima digabung')
  assert.match(d.balasan.at(-1), /3 pesan revisi untuk P-291026-01/)
  const r = await perintah(d, 'lanjut')
  assert.equal(r.status, 'revisi')
  assert.equal(d.keOperasi.length, 1, 'satu revisi')
  assert.equal(d.keOperasi[0].kalimat, 'Revisi dari beberapa pesan, kerjakan semuanya:\n1. judul tambahkan BNPB\n2. catatan lapangan: jembatan putus\n3. slide 3 rencana aksi sebut BPBD')
  assert.equal(d.versi.length, 2)
  assert.equal(await klasifikasi({ dari: DARI, teks: 'catatan lain', diteruskan: true }, d.ctx), 'bahan', 'kumpul ditutup sesudah lanjut')
})

test('T43: batal saat kumpul hanya menutup kumpulan; revisi tanpa draf dijawab; kumpulan lewat 2 jam dibuang', async () => {
  const d = await drafV1()
  d.ctx.jedaKumpulMs = 5
  await perintah(d, 'revisi')
  await perintah(d, 'hapus slide 3')
  assert.equal((await perintah(d, 'batal')).status, 'kumpul batal')
  assert.match(d.balasan.at(-1), /^\*Revisi dibatalkan\*\n\n1 pesan revisi dibuang, draf P-291026-01 tetap\./)
  assert.equal([...d.proyek.values()][0].status, 'draf')
  assert.equal(d.keOperasi.length, 0)
  await perintah(d, 'revisi')
  d.ctx.now = new Date(NOW.getTime() + 3 * 3600e3)
  assert.equal(await klasifikasi({ dari: DARI, teks: 'x', diteruskan: true }, d.ctx), 'bahan')
  const e = dunia()
  assert.equal((await perintah(e, 'revisi')).status, 'revisi tanpa draf')
  assert.match(e.balasan.at(-1), /^\*Belum ada draf\*/)
  await tunda(20)
})

test('kabar mulai: lanjut dan revisi membalas sekali "sedang dibuat" dengan estimasi dan jam selesai; estimasi belajar dari lama pembuatan', async () => {
  const Durasi = await import('../../scripts/wa/durasi.mjs')
  const d = dunia({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'LAPORAN HARIAN BNPB')] })
  d.ctx.kabarMulai = true
  await bangun(d, 'buat harian 26 okt')
  const mulai = d.balasan.filter((t) => /^\*Laporan sedang dibuat\*/.test(t))
  assert.equal(mulai.length, 1)
  assert.equal(mulai[0], '*Laporan sedang dibuat*\n_P-291026-01_\n\nLaporan Kejadian Bencana Harian 26 Okt\nEstimasi waktu: 1-3 menit\nPerkiraan selesai pukul 08.03 WIB\n\nDraf dikirim otomatis begitu selesai.')
  assert.equal(d.versi.length, 1)
  await perintah(d, 'judul tambahkan BNPB')
  assert.ok(d.balasan.some((t) => /^\*Revisi v2 sedang dikerjakan\*\n_P-291026-01_\n/.test(t)), d.balasan.join('\n---\n'))
  // estimasi belajar: 3 catatan atau lebih = rentang dari catatan
  for (const detik of [130, 200, 290]) Durasi.catatDurasi(d.dasar, 'v1:bangun:penanganan', detik)
  assert.deepEqual(Durasi.perkiraan(d.dasar, 'v1:bangun:penanganan'), [2, 5])
  assert.deepEqual(Durasi.perkiraan(d.dasar, 'v2:revisi:penanganan'), [3, 6], 'bawaan per versi dan mode (v2.2 termasuk tinjau visual)')
  assert.equal(Durasi.jamSelesai(new Date('2026-11-19T07:58:00Z'), 6), '15.04')
})

test('terima kurang: WA menyebut 20 tetapi merinci 15 = petunjuk; terima kurang dari nomor terdaftar mana pun membangun dengan --terima-kurang', async () => {
  const d = dunia()
  const asli = d.ctx.dep.exec, argGen = []
  d.ctx.dep.exec = async (cmd, args) => {
    if (/_ringkas\.py$/.test(args[0])) { argGen.push(args); if (!args.includes('--terima-kurang')) throw Object.assign(new Error('x'), { stderr: 'ValueError: terurai 15 kejadian, laporan menyebut 20 menonjol' }) }
    return asli(cmd, args)
  }
  await bangun(d, 'buat harian 26 okt')
  assert.match(d.balasan.at(-1), /WA Koordalops menyebut 20 kejadian menonjol tetapi hanya merinci 15\.\nKetik \*terima kurang\*/)
  assert.equal((await tangani({ dari: DARI, teks: 'terima kurang' }, d.ctx)).status, 'terima kurang', 'bukan pemilik juga boleh')
  assert.ok(argGen.at(-1).includes('--terima-kurang'))
  assert.equal(d.versi.length, 1)
  assert.ok(d.semua().some((t) => /Atas perintah terima kurang/.test(t)))
})

test('ringkasan draf berkelompok dan bubble Ada revisi (biaya, lama pembuatan, menu) terpisah dari keterangan draf', async () => {
  const P = await import('../../scripts/wa/proyek.mjs')
  const lap = LAPORAN.find((l) => l.id === 'harian')
  const t = P.tDraf({ id: 'P-191126-05' }, 1, lap, '2026-11-19', { ringkasan: 'Memuat 6 kejadian.', kelompok: [
    ['Perlu keputusan', ['Kekeringan Blitar tidak disebut WA hari ini; dimasukkan?']], ['Perlu dicek', ['a', 'b', 'c', 'd', 'e']], ['Tidak dimuat', []]] })
  assert.match(t, /\n\nMemuat 6 kejadian\.\n\n\*Perlu keputusan:\*\n- Kekeringan Blitar/)
  assert.match(t, /\*Perlu dicek:\*\n- a\n- b\n- c\n- dan 2 lainnya$/)
  assert.doesNotMatch(t, /Tidak dimuat|Biaya|Balas angka/)
  const m = P.tMenuDraf({ id: 'P-191126-05' }, 1, 2.59, 372)
  assert.equal(m, '*Ada revisi?*\n_P-191126-05, versi 1_\n\n_Biaya Claude laporan ini sejauh ini: $2,59._\n_Lama pembuatan: 6 menit 12 detik._\n\n*Balas angka:*\n*1* Revisi: kirim revisinya (boleh beberapa pesan), lalu *selesai*\n*2* Final\n*3* Minta PPTX\n*4* Lihat versi\n*5* Batal\n\n_Revisi satu kalimat juga bisa langsung dikirim._')
})

test('selesai dan kata penutup pendek menjalankan kumpul revisi; selesai tanpa kumpul dijawab petunjuk', async () => {
  const d = await drafV1({ ops: () => [GANTI(1, 's1_judul', 'LAPORAN HARIAN', 'LAPORAN HARIAN BNPB')] })
  d.ctx.jedaKumpulMs = 5
  assert.equal((await perintah(d, 'selesai')).status, 'selesai tanpa kumpul')
  await perintah(d, 'revisi')
  await perintah(d, 'judul tambahkan BNPB')
  assert.equal((await perintah(d, 'udah')).status, 'revisi')
  assert.equal(d.keOperasi.length, 1)
  await perintah(d, 'revisi'); await perintah(d, 'slide 3 hapus')
  assert.equal((await perintah(d, 'selesai')).status, 'revisi')
  await new Promise((r) => setTimeout(r, 20))
})

// ---------- V2.2 vision (K36; RENCANA-UJI T45, T46) ----------
test('T45 tinjau visual: mesin merender slide, sesi agen dilanjutkan dengan gambarnya, perbaikan tata letak dipakai dan dicatat', async () => {
  const d = duniaV2({ tinjau: true, ubah: (inv) => inv.map((x) => (x.shape === 's3_rencana' ? { ...x, teks: 'Rencana Aksi pemantauan banjir' } : x)) })
  const asli = d.ctx.dep.agenQuery
  d.ctx.dep.agenQuery = (a) => {
    if (!/Tinjau visual/.test(a.prompt)) return asli(a)
    // agen tinjau menulis perubahan visual sendiri
    return (async function* () {
      for await (const m of asli(a)) {
        if (m.type === 'result') {
          const ruang = a.prompt.match(/Ruang kerja versi ini: (.+)/)[1].trim()
          const h = JSON.parse(fs.readFileSync(path.join(ruang, 'keluaran', 'hasil.json'), 'utf8'))
          fs.writeFileSync(path.join(ruang, 'keluaran', 'hasil.json'), JSON.stringify({ ...h, perubahan: ['Slide 3: ukuran huruf rencana aksi dikecilkan supaya tidak meluber'] }))
        }
        yield m
      }
    })()
  }
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.agen.length, 2, 'satu jalan bangun, satu jalan tinjau')
  assert.match(d.agen[1].prompt, /Tinjau visual deck/); assert.match(d.agen[1].prompt, /kerja.tinjau.pratinjau-1.png/)
  assert.equal(d.agen[1].options.resume, d.agen.length && 'sesi-00000001', 'sesi yang sama dilanjutkan')
  assert.match(d.versi[0].pptxIsi, /Rencana Aksi pemantauan banjir/)
  assert.match(d.kirim[0].caption, /\*Tata letak dibetulkan setelah dilihat:\*\n- Slide 3: ukuran huruf rencana aksi dikecilkan/)
})

test('T46 tinjau visual yang mengubah isi teks ditolak: deck sebelum tinjau dipakai', async () => {
  const d = duniaV2({ tinjau: true, ubah: (inv, prompt) => inv.map((x) => (x.shape === 's3_rencana' ? { ...x, teks: /Tinjau visual/.test(prompt) ? 'Rencana diganti saat tinjau' : 'Rencana Aksi pemantauan banjir' } : x)) })
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.agen.length, 2)
  assert.match(d.versi[0].pptxIsi, /Rencana Aksi pemantauan banjir/); assert.doesNotMatch(d.versi[0].pptxIsi, /diganti saat tinjau/)
})

test('T46 tinjau visual gagal atau bertanya = deck sebelum tinjau dipakai, draf tetap jadi; BL_TINJAU_VISUAL=0 tanpa tinjau', async () => {
  const d = duniaV2({ tinjau: true, ubah: (inv, prompt) => (/Tinjau visual/.test(prompt) ? { tanya: ['Panel ini dihapus?'] } : inv.map((x) => (x.shape === 's3_rencana' ? { ...x, teks: 'Rencana Aksi pemantauan banjir' } : x))) })
  await bangun(d, 'buat harian 26 okt')
  assert.equal(d.agen.length, 2)
  assert.equal(d.versi.length, 1)
  assert.match(d.versi[0].pptxIsi, /Rencana Aksi pemantauan banjir/, 'deck jalan pertama dipulihkan')
  assert.doesNotMatch(d.kirim[0].caption, /Tata letak dibetulkan/)
  const e = duniaV2()
  await bangun(e, 'buat harian 26 okt')
  assert.equal(e.agen.length, 1, 'tinjau mati: satu jalan agen')
})

test('T47 screenshot revisi: gambar di kumpul masuk kumpulan dan ruang kerja agen, tidak jadi bahan', async () => {
  const d = duniaV2({ berkas: { 501: 'GAMBAR-SCREENSHOT' } })
  await bangun(d, 'buat harian 26 okt')
  d.ctx.jedaKumpulMs = 5
  await perintah(d, '1')
  const r = await tangani({ dari: DARI, teks: 'judul ini kepanjangan', wa_id: 501, nama_berkas: 'ss.jpg', ada_berkas: true }, d.ctx)
  assert.equal(r.status, 'revisi dicatat'); assert.equal(r.gambar, true)
  await perintah(d, 'panel kanan dihapus')
  assert.equal((await perintah(d, 'selesai')).status, 'revisi')
  const prompt = d.agen.at(-1).prompt
  assert.match(prompt, /1\. \[gambar 1\] judul ini kepanjangan\n2\. panel kanan dihapus/)
  const fGambar = (prompt.match(/- gambar 1: (.+)/) || [])[1]
  assert.ok(fGambar && fs.readFileSync(fGambar.trim(), 'utf8') === 'GAMBAR-SCREENSHOT', 'gambar diunduh ke revisi/ ruang kerja')
  assert.ok(Object.keys(JSON.parse(fs.readFileSync(path.join(d.dasar, 'proyek', 'bukan-bahan.json'), 'utf8'))).includes('501'), 'dicatat bukan bahan')
  assert.equal(d.versi.length, 2)
  await new Promise((s) => setTimeout(s, 20))
})

test('T48 bahan gambar: gambar asli ikut ke bahan/ agen di samping teks OCR; pagar hanya membaca .txt', async () => {
  const foto = { id: '7', diterima: 7, dari: DARI, teks: '', nama_berkas: 'infografis.png', ada_berkas: 1 }
  const d = duniaV2({ pesan: [...LENGKAP(), foto], berkas: { 7: 'PNG-ASLI' } })
  await bangun(d, 'buat harian 26 okt')
  const bahan = fs.readdirSync(path.join(d.dasar + '-agen', 'P-291026-01', 'v1', 'bahan'))
  assert.ok(bahan.some((f) => /infografis\.png$/.test(f)), bahan.join(', '))
  assert.match(d.agen[0].prompt, /gambar asli bahan/)
  assert.equal(d.versi.length, 1, 'draf tetap jadi')
})

test('T49 tanya draf bergambar: gambar berketerangan dari pemegang draf dijawab dengan gambar ikut; tanpa keterangan tetap bahan', async () => {
  const d = await drafV1()
  const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('PNG-SLIDE')])
  const fetchAsli = d.ctx.dep.fetch
  d.ctx.dep.fetch = async (u, o) => (new URL(u).pathname === '/api/wa/berkas' && new URL(u).searchParams.get('id') === '601'
    ? { ok: true, status: 200, arrayBuffer: async () => PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.length) } : fetchAsli(u, o))
  const ke = []
  d.ctx.dep.claude.maksud = async () => ({ maksud: 'tanya', jenis: '', tanggal: '', balasan: '', biaya: 0 })
  d.ctx.dep.claude.jawabDraf = async (inv, riwayat, q, gambar) => { ke.push({ q, gambar }); return { jawaban: 'Judul slide 1 terlalu panjang.', biaya: 0 } }
  const r = await tangani({ dari: DARI, teks: 'ini kenapa ya?', wa_id: 601, nama_berkas: 'ss.jpg', ada_berkas: true }, d.ctx) // nama .jpg, isi PNG: jenis dari isi
  assert.equal(r.status, 'tanya draf')
  assert.equal(ke[0].gambar.length, 1); assert.equal(ke[0].gambar[0].media_type, 'image/png')
  assert.ok(Buffer.from(ke[0].gambar[0].data, 'base64').equals(PNG))
  assert.match(d.balasan.at(-1), /Judul slide 1 terlalu panjang/)
  assert.equal((await tangani({ dari: DARI, teks: '', wa_id: 602, nama_berkas: 'foto.jpg', ada_berkas: true }, d.ctx)).status, 'menunggu buat', 'tanpa keterangan: bahan')
})

test('biaya per kegiatan: laporan, tanya draf, kalimat bebas dicatat terpisah dan tampil di perintah biaya (pemilik 19 Nov)', async () => {
  const Biaya = await import('../../scripts/wa/biaya.mjs')
  const d = dunia()
  const kini = NOW
  Biaya.catat(d.dasar, { usd: 0.5, kini })
  Biaya.catat(d.dasar, { usd: 2, proyek: 'P-1', kini, kegiatan: 'laporan' })
  Biaya.catat(d.dasar, { usd: 0.3, proyek: 'P-1', kini, kegiatan: 'tinjau' })
  Biaya.catat(d.dasar, { usd: 0.02, kini, kegiatan: 'percakapan' })
  assert.deepEqual(Biaya.perKegiatan(d.dasar, kini).map((x) => [x.kegiatan, x.usd]), [['laporan', 2.5], ['tinjau', 0.3], ['percakapan', 0.02]])
  d.ctx.dep.fetch = async () => ({ ok: true, status: 200, json: async () => ({ usd_mikro: 0 }), text: async () => '' })
  await tangani({ dari: '6299', teks: 'biaya' }, d.ctx)
  assert.match(d.balasan.at(-1), /\*Per kegiatan bulan ini:\*\n- Membuat dan merevisi laporan: \$2,50\n- Tinjau visual draf: \$0,30\n- Kalimat bebas dan obrolan: \$0,02/)
})
