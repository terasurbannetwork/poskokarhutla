/* Uji keluaran Docs (revisi 3): satu bilah atas, tanpa pemilih sudut dan pemilih bencana, bilah samping tiga tingkat,
   "Di halaman ini" hanya h2, kaki sebelum-sesudah, beranda dan halaman depan modul, tanpa skrip dan gaya inline, tabel, ukuran, sidik. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DOCS, SUMBER, bagian, halaman, jalur, jenis, petaJson } from './_pembantu.mjs'

const html = (f) => fs.readFileSync(path.join(DOCS, f), 'utf8')
const hitung = (s, re) => (s.match(re) || []).length
const AWALAN = { panduan: '/docs', pengembang: '/docs/pengembang' }
const semua = () => halaman()
const berhalaman = () => semua().filter((f) => jenis(f) === 'halaman')
const bagianNav = (h) => h.slice(h.indexOf('<nav class="dk-nav"'), h.indexOf('</nav>', h.indexOf('<nav class="dk-nav"')))
const urlHtml = (f) => {
  const j = '/docs/' + f.replace(/\.html$/, '').replace(/\/index$/, '')
  return j === '/docs/index' ? '/docs' : j
}
/* urutan baca bagian dari peta.json: kelompok, modul, halaman */
const urutBaca = (b) => {
  const peta = petaJson()
  const out = []
  for (const k of peta.kelompok.filter((x) => x.bagian === b)) {
    for (const m of peta.modul.filter((x) => (x.halaman[b] || []).length && x.kelompok[b] === k.id)) {
      for (const h of m.halaman[b]) out.push({ url: `${AWALAN[b]}/${m.id}/${h.id}`, judul: h.judul, modul: m.judul[b], m: m.id })
    }
  }
  return out
}

test('himpunan keluaran HTML sama dengan jalur dari peta.json: tidak ada halaman hilang atau yatim', () => {
  const dari = new Set(semua().map(urlHtml))
  assert.deepEqual([...dari].sort(), jalur().sort())
  assert.ok(fs.existsSync(path.join(DOCS, 'pengembang', 'index.html')))
  assert.ok(!fs.existsSync(path.join(DOCS, 'banjir.html')), 'halaman datar lama masih ada')
})

test('satu bilah atas khusus Docs: tanpa kepala situs, tanpa pemilih bencana, tanpa pemilih sudut, tanpa kepala.js', () => {
  for (const f of semua()) {
    const h = html(f)
    assert.equal(hitung(h, /<header class="dk-atas">/g), 1, `${f}: satu header.dk-atas`)
    assert.equal(hitung(h, /<header class="top"/g), 0, `${f}: tanpa kepala situs`)
    for (const larang of ['<header class="top">', 'class="bencana"', 'id="burger"', '/inti/kepala.js', '/inti/kepala.css', '/inti/gaya.css', 'data-sudut', 'Sudut pembaca', 'dk-kepala-docs'])
      assert.ok(!h.includes(larang), `${f}: memuat ${larang}`)
    for (const wajib of ['id="tema"', 'id="bukaLaci"', 'href="/" aria-label="Ke situs Centurisk97"', 'aria-label="Bagian"', 'data-cari', 'src="/halaman_statis.js"', '/inti/tema.css'])
      assert.ok(h.includes(wajib), `${f}: tanpa ${wajib}`)
    const tab = h.slice(h.indexOf('<nav class="dk-tab"'), h.indexOf('</nav>', h.indexOf('<nav class="dk-tab"')))
    assert.ok(/<a href="\/docs(\/[a-z0-9-]+)*"[^>]*>Panduan<\/a>/.test(tab) && /<a href="\/docs\/pengembang(\/[a-z0-9-]+)*"[^>]*>Pengembang<\/a>/.test(tab), `${f}: dua tab bagian`)
    assert.equal(hitung(tab, /aria-current="page"/g), 1, `${f}: satu tab aktif`)
    const aktif = bagian(f)
    assert.ok(new RegExp(`href="${AWALAN[aktif]}(/[a-z0-9-]+)*" aria-current="page"`).test(tab), `${f}: tab aktif salah`)
    assert.ok(h.includes(`docs-${aktif}`), `${f}: kelas bagian di body`)
  }
})

test('bilah samping tiga tingkat dari peta.json: kelompok, modul lipat, halaman; hanya modul aktif terbuka; satu aria-current', () => {
  const peta = petaJson()
  for (const f of semua()) {
    const b = bagian(f)
    const h = html(f)
    const nav = bagianNav(h)
    const kel = peta.kelompok.filter((k) => k.bagian === b && peta.modul.some((m) => (m.halaman[b] || []).length && m.kelompok[b] === k.id))
    assert.equal(hitung(nav, /class="dk-kel-j"/g), kel.length, `${f}: jumlah kelompok`)
    const modul = peta.modul.filter((m) => (m.halaman[b] || []).length)
    assert.equal(hitung(nav, /<div class="dk-mod[ "]/g), modul.length, `${f}: jumlah modul`)
    assert.equal(hitung(nav, /<li><a href=/g), urutBaca(b).length, `${f}: jumlah halaman di bilah samping`)
    assert.equal(hitung(nav, /aria-current="page"/g), 1, `${f}: satu penanda aktif`)
    const jenisF = jenis(f)
    assert.equal(hitung(nav, /<div class="dk-mod buka">/g), jenisF === 'beranda' ? 0 : 1, `${f}: tepat satu modul terbuka (aktif)`)
    assert.equal(hitung(nav, /aria-expanded="true"/g), jenisF === 'beranda' ? 0 : 1, `${f}: aria-expanded`)
    for (const m of modul) assert.ok(m.judul[b].length <= 40)
    assert.ok(nav.includes(`>Beranda ${b === 'panduan' ? 'Panduan' : 'Pengembang'}<`), `${f}: tautan beranda bagian`)
    assert.ok(!/class="pil|class="no"/.test(nav), `${f}: tanpa lencana di bilah samping`)
    assert.ok(!/\sdata-untuk=/.test(h.slice(0, h.indexOf('<div class="dk-isi"'))), `${f}: tanpa data-untuk (sudut dihapus)`)
  }
})

test('halaman: satu h1, remah roti, aksi, isi h2 dan h3 tanpa kartu, tanpa lima bagian baku lama', () => {
  for (const f of berhalaman()) {
    const h = html(f)
    assert.equal(hitung(h, /<h1[ >]/g), 1, `${f}: h1`)
    assert.match(h, /<nav class="dk-remah" aria-label="Remah roti"><a href="\/docs">Docs<\/a>/, `${f}: remah roti`)
    assert.ok(h.includes('data-aksi="salin"') && h.includes('data-aksi="cetak"'), `${f}: tombol aksi`)
    assert.equal(hitung(h, /class="ex ex-std"|class="ex-ey"|class="ex-hd"|class="hl"|class="ex-ft"/g), 0, `${f}: tanpa kartu laporan`)
    assert.equal(hitung(h, /<section class="dk-bag/g), 0, `${f}: tanpa pembungkus bagian baku`)
    assert.ok(!/<details class="lipat"/.test(h), `${f}: tanpa akordeon referensi teknis`)
    assert.ok(/class="dk-pengantar"/.test(h), `${f}: pengantar`)
    if (bagian(f) === 'pengembang') assert.ok(h.includes('<a href="/docs/pengembang">Pengembang</a>'), `${f}: remah roti Pengembang`)
  }
})

test('ukuran halaman: paling banyak 8 h2, kurang dari 2.000 kata, di bawah 120 KB', () => {
  for (const f of berhalaman()) {
    const h = html(f)
    const isi = h.slice(h.indexOf('<div class="dk-bd">'), h.indexOf('<nav class="dk-pn"'))
    assert.ok(hitung(isi, /<h2 id=/g) <= 8, `${f}: lebih dari 8 h2`)
    const kata = isi.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
    assert.ok(kata < 2000, `${f}: ${kata} kata`)
    assert.ok(Buffer.byteLength(h) < 120 * 1024, `${f}: ${Buffer.byteLength(h)} byte`)
  }
})

test('"Di halaman ini": hanya h2, tersembunyi (tak ditulis) bila kurang dari 2 h2, tombol buka di layar sempit', () => {
  for (const f of berhalaman()) {
    const h = html(f)
    const isi = h.slice(h.indexOf('<div class="dk-bd">'), h.indexOf('<nav class="dk-pn"'))
    const n = hitung(isi, /<h2 id=/g)
    const toc = h.includes('<nav class="dk-toc"') ? h.slice(h.indexOf('<nav class="dk-toc"'), h.indexOf('</nav>', h.indexOf('<nav class="dk-toc"'))) : ''
    if (n < 2) {
      assert.equal(toc, '', `${f}: ${n} h2 tetapi ada daftar isi`)
      assert.match(h, /<div class="dk-toc-w" id="tocW"><\/div>/, `${f}: pembungkus kosong`)
    } else {
      assert.ok(toc.includes('id="tocTombol"') && toc.includes('aria-controls="tocDaftar"'), `${f}: tombol daftar isi`)
      const butir = [...toc.matchAll(/<li><a href="#([^"]+)"/g)].map((m) => m[1])
      assert.equal(butir.length, n, `${f}: butir daftar isi sama dengan jumlah h2`)
      for (const id of butir) assert.ok(isi.includes(`<h2 id="${id}"`), `${f}: butir ${id} bukan h2`)
    }
  }
})

test('Sebelumnya dan Berikutnya mengikuti urutan baca bagian (lintas modul), halaman pertama dan terakhir tanpa salah satunya', () => {
  for (const b of ['panduan', 'pengembang']) {
    const urut = urutBaca(b)
    urut.forEach((hl, i) => {
      const f = hl.url.replace('/docs/', '') + '.html'
      const h = html(f)
      assert.ok(h.includes('<nav class="dk-pn"'), `${f}: kaki sebelum-sesudah`)
      assert.equal(h.includes('rel="prev"'), i > 0, `${f}: Sebelumnya`)
      assert.equal(h.includes('rel="next"'), i < urut.length - 1, `${f}: Berikutnya`)
      if (i > 0) assert.ok(h.includes(`rel="prev" href="${urut[i - 1].url}"`), `${f}: prev salah`)
      if (i < urut.length - 1) assert.ok(h.includes(`rel="next" href="${urut[i + 1].url}"`), `${f}: next salah`)
      if (i < urut.length - 1 && urut[i + 1].m !== hl.m) assert.ok(h.includes(`${urut[i + 1].modul}: `), `${f}: label tujuan memuat nama modul`)
    })
  }
})

test('callout Hipotesis: paling banyak satu per halaman, dan ada bila halaman memuat lencana HIPOTESIS', () => {
  for (const f of berhalaman()) {
    const h = html(f)
    const isi = h.slice(h.indexOf('<div class="dk-bd">'), h.indexOf('<nav class="dk-pn"')).replace(/<aside[\s\S]*?<\/aside>/g, '')
    const memuat = /class="pil pil-hipotesis">HIPOTESIS</.test(isi)
    const n = hitung(h, /class="dk-co dk-co-hipotesis"/g)
    assert.ok(n <= 1, `${f}: callout hipotesis lebih dari satu`)
    if (memuat) assert.equal(n, 1, `${f}: ada lencana HIPOTESIS tetapi tanpa callout`)
  }
})

test('beranda: hero, cari besar, dua tombol, kartu mulai dari peta.json, kisi modul per kelompok, satu h1, kartu satu tingkat', () => {
  const peta = petaJson()
  for (const b of ['panduan', 'pengembang']) {
    const f = b === 'panduan' ? 'index.html' : 'pengembang/index.html'
    const h = html(f)
    assert.equal(hitung(h, /<h1[ >]/g), 1)
    assert.ok(h.includes('class="dk-cari dk-cari-besar"'), `${f}: kotak cari besar`)
    assert.equal(hitung(h, /class="dk-mulai-j"/g), peta.mulai[b].length, `${f}: kartu mulai`)
    const modul = peta.modul.filter((m) => (m.halaman[b] || []).length)
    assert.equal(hitung(h, /class="dk-kartu" href=/g), modul.length, `${f}: kartu modul`)
    for (const m of modul) assert.ok(h.includes(`class="dk-kartu" href="${AWALAN[b]}/${m.id}"`), `${f}: kartu ${m.id}`)
    assert.equal(hitung(h, /<section class="dk-kel-bag"/g), peta.kelompok.filter((k) => k.bagian === b && modul.some((m) => m.kelompok[b] === k.id)).length)
    assert.equal(hitung(h, /class="tb tb-primer"/g), 1, `${f}: satu tombol primer`)
    assert.ok(!/<a class="dk-kartu"[^>]*>(?:(?!<\/a>)[\s\S])*<a class="dk-kartu"/.test(h), 'kartu di dalam kartu')
    assert.ok(/ halaman<\/span>/.test(h), `${f}: jumlah halaman di kartu modul`)
    for (const kartu of peta.mulai[b]) for (const [m, hl] of kartu.tautan) assert.ok(h.includes(`href="${AWALAN[b]}/${m}/${hl}"`), `${f}: tautan mulai ${m}/${hl}`)
  }
  assert.ok(html('index.html').includes('Panduan untuk pengembang') && html('pengembang/index.html').includes('Kembali ke panduan'))
})

test('halaman depan modul: kisi kartu halaman bernomor sesuai urutan, tombol Mulai dari halaman 1', () => {
  const peta = petaJson()
  for (const f of semua().filter((x) => jenis(x) === 'modul')) {
    const b = bagian(f)
    const mid = f.replace(/^pengembang\//, '').split('/')[0]
    const m = peta.modul.find((x) => x.id === mid)
    const h = html(f)
    assert.equal(hitung(h, /<h1[ >]/g), 1)
    assert.equal(hitung(h, /class="dk-kartu" href=/g), m.halaman[b].length, `${f}: kartu halaman`)
    m.halaman[b].forEach((hl, i) => assert.ok(h.includes(`class="dk-kartu" href="${AWALAN[b]}/${mid}/${hl.id}"><span class="dk-kartu-no">${i + 1}</span>`), `${f}: kartu ${hl.id} bernomor ${i + 1}`))
    assert.ok(h.includes(`class="tb tb-primer" href="${AWALAN[b]}/${mid}/${m.halaman[b][0].id}">Mulai dari halaman 1`), `${f}: tombol mulai`)
    assert.ok(h.includes('aria-current="page"'), `${f}: penanda aktif`)
  }
})

test('kaki per bagian: kolom sesuai kelompok bagian itu, tanggal dibangun, tanpa skrip', () => {
  for (const f of semua()) {
    const h = html(f)
    const kaki = h.slice(h.indexOf('<footer class="dk-kaki">'), h.indexOf('</footer>'))
    const b = bagian(f)
    const peta = petaJson()
    for (const k of peta.kelompok.filter((x) => x.bagian === b && peta.modul.some((m) => (m.halaman[b] || []).length && m.kelompok[b] === x.id)))
      assert.ok(kaki.includes(`<p>${k.judul}</p>`), `${f}: kolom ${k.judul}`)
    assert.ok(kaki.includes('Diperbarui '), `${f}: tanggal`)
    assert.ok(kaki.includes('<p>Situs</p>'))
  }
})

test('<body data-tanpa-keluar>, tanpa skrip, gaya, dan handler inline; hanya sudut.js dan docs.js', () => {
  for (const f of semua()) {
    const h = html(f)
    assert.match(h, /<body data-tanpa-keluar[ >]/, `${f}: body`)
    assert.equal(hitung(h, /<script(?![^>]*\bsrc=)[^>]*>/gi), 0, `${f}: skrip inline`)
    assert.equal(hitung(h, /\sstyle=/gi), 0, `${f}: atribut style`)
    assert.equal(hitung(h, /<style[\s>]/gi), 0, `${f}: blok style`)
    assert.equal(hitung(h, /\son[a-z]+=/gi), 0, `${f}: handler inline`)
    assert.equal(hitung(h, /<script src="\/docs\/sudut\.js"><\/script>/g), 1, `${f}: sudut.js sekali`)
    assert.ok(h.includes('<script src="/docs/docs.js" defer></script>') && h.includes('id="docsStatus"') && h.includes('aria-live="polite"'), `${f}: docs.js dan status live`)
    assert.ok(/<button type="button" class="dk-tutup" id="tutupLaci"/.test(h), `${f}: tutup laci berupa tombol`)
  }
})

test('tanpa host luar pada aset (src, link); huruf hanya Google Fonts yang sudah dimuat situs', () => {
  for (const f of semua()) {
    const h = html(f)
    for (const m of h.matchAll(/<(?:script|img)\b[^>]*\bsrc="([^"]+)"/g)) assert.ok(m[1].startsWith('/'), `${f}: src luar ${m[1]}`)
    for (const m of h.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)) {
      assert.ok(m[1].startsWith('/') || /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|centurisk97\.id)\b/.test(m[1]), `${f}: link luar ${m[1]}`)
    }
  }
})

test('tabel: dibungkus div.tabel-gulir dan berkelas ex-tabel', () => {
  for (const f of semua()) {
    const h = html(f)
    assert.equal(hitung(h, /<div class="tabel-gulir"><table class="ex-tabel">/g), hitung(h, /<table/g), `${f}: tabel tak berbungkus`)
  }
})

test('docs.css dan gambar.css: hanya var(--token), tanpa literal warna, di bawah 24 KB; isi rata kiri; tanpa gaya pemilih sudut', () => {
  for (const [nama, plafon] of [['docs.css', 24], ['gambar.css', 24], ['cetak.css', 24]]) {
    const css = fs.readFileSync(path.join(DOCS, nama), 'utf8')
    assert.ok(css.length < plafon * 1024, `${nama} ${css.length} karakter`)
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), `literal warna di ${nama}`)
  }
  const css = fs.readFileSync(path.join(DOCS, 'docs.css'), 'utf8')
  assert.ok(!/text-align:\s*justify/.test(css), 'justify dilarang (DS-7)')
  assert.ok(!/data-sudut|dk-kepala-docs|dk-bag\b/.test(css), 'sisa gaya revisi lama')
  const sudut = fs.readFileSync(path.join(DOCS, 'sudut.js'), 'utf8')
  assert.ok(!/docs-sudut|data-sudut/.test(sudut.replace(/\/\*[\s\S]*?\*\//g, '')), 'sudut.js tak lagi mengurus sudut pembaca')
  assert.match(sudut, /classList\.add\("js"\)/)
})

test('isi sumber tidak menghasilkan tautan javascript:', () => {
  for (const f of semua()) assert.equal(hitung(html(f), /javascript:/gi), 0, f)
})

test('ukuran: halaman di bawah 1 MB, cari.json di bawah 300 KB dengan penanda dua bagian', () => {
  for (const f of [...semua(), 'cari.json']) assert.ok(fs.statSync(path.join(DOCS, f)).size < 1024 * 1024, f)
  assert.ok(fs.statSync(path.join(DOCS, 'cari.json')).size < 300 * 1024, 'cari.json 300 KB')
  const c = JSON.parse(html('cari.json'))
  assert.equal(c.v, 2)
  assert.deepEqual([...new Set(c.m.map((x) => x[1]))].sort(), ['d', 'p'], 'dua bagian bertanda p dan d')
  for (const e of c.e) { assert.ok(e[0].startsWith('/') && e[1] >= 0 && e[1] < c.m.length) }
  assert.ok(c.e.some((e) => e[0].startsWith('/pengembang/')) && c.e.some((e) => !e[0].startsWith('/pengembang/')))
})

test('_rute.json sama dengan --jalur; _bangun.json: hash tiap sumber cocok dengan berkasnya', () => {
  assert.deepEqual(JSON.parse(html('_rute.json')), jalur())
  const b = JSON.parse(html('_bangun.json'))
  assert.equal(b.halaman, semua().length)
  assert.match(b.tanggal, /^\d{4}-\d\d-\d\d$/)
  for (const [nama, hash] of Object.entries(b.sumber)) {
    if (nama.startsWith('mesin:')) continue
    const isi = fs.readFileSync(nama.startsWith('gambar/') ? path.join(DOCS, nama) : path.join(SUMBER, nama))
    assert.equal(crypto.createHash('sha256').update(isi).digest('hex'), hash, `${nama}: sidik basi, jalankan bangun.py`)
  }
})

test('CELAH.md dan berkas lama datar tidak diterbitkan', () => {
  assert.ok(!semua().some((f) => /(^|\/)celah\.html$/i.test(f)))
  assert.ok(!semua().some((f) => /^[a-z-]+\.html$/.test(f) && f !== 'index.html'), 'ada halaman datar lama di public/docs')
})
