// Gerbang overlay "Luas terbakar" / "Belum padam" per kabupaten di peta utama (public/peta_kab.js + fungsi murni di public/peta_karhutla.js):
// perubahan keadaan kontrol, kontrak data/peta_karhutla_kab.json (v1), penjumlahan periode per kabupaten, batas kelas legenda, warna, dan pengabelan index.html.
// Fungsi murni dijalankan nyata di node tanpa DOM. Berkas data/peta_karhutla_kab.json (bila sudah terbit) diuji lewat invarian terhadap peta_karhutla.json
// dan GeoJSON kabupaten, bukan potret angka.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const akar = new URL('../../', import.meta.url)
const baca = p => readFileSync(new URL(p, akar), 'utf8')
const win = {}
new Function('window', baca('public/peta_karhutla.js'))(win)   // realm yang sama: deepStrictEqual sah
const R = win.PetaKarhutla
for (const f of ['atur', 'cekKab', 'siapkanKab', 'agregatKab', 'batasKab', 'warnaKab', 'kelasKab', 'bulat2', 'teksKab', 'kosongKab']) assert.equal(typeof R[f], 'function', `peta_karhutla.js harus mengekspor ${f}`)

// 31 hari 2026-09-21 .. 2026-10-21 (Senin 19 Okt = indeks 28); celah 20 Okt (indeks 29) dan 25 Sep (indeks 4)
const hari = Array.from({ length: 31 }, (_, i) => R.tambah('2026-09-21', i))
const J = () => ({ versi: 1, dibuat: 'x', cutoff: 'x', hari: [...hari], porsi: 0.534, celah: ['2026-09-25', '2026-10-20'],
  prov: { 62: { nama: 'Kalimantan Tengah', hot: hari.map(() => 0), luas: hari.map(() => 0), belum: hari.map(() => 0), padam: hari.map(() => 0) } } })
const P = R.siapkan(J())
const idx = s => P.idx.get(s)

// dua kabupaten: A punya luas tiap hari (belum = setengahnya), B hanya hari 3 dan 29; C hanya belum (luas >= belum tetap dipegang pipeline, di sini diuji pembaca)
const KB = () => ({
  '62|A': { nama: 'A', prov: '62', d: hari.map((_, i) => [i, 10 * (i + 1), 5 * (i + 1)]) },
  '62|B': { nama: 'B', prov: '62', d: [[3, 7, 2], [29, 40, 40]] },
  '62|C': { nama: 'C', prov: '62', d: [[30, 0, 9]] },
})
const K = () => ({ versi: 1, dibuat: 'x', cutoff: 'x', hari: [...hari], porsi: 0.534, celah: ['2026-09-25', '2026-10-20'], kab: KB() })

test('atur: ukuran, jenis periode, geser, tanggal; masukan tak sah atau tanpa tetangga = null', () => {
  const s = { metrik: 'luas', mode: 'hari', ref: '', a: '', b: '' }
  assert.equal(R.atur(P, s, 'metrik', 'belum').metrik, 'belum')
  assert.deepEqual(s, { metrik: 'luas', mode: 'hari', ref: '', a: '', b: '' }, 'keadaan lama tak diubah')
  // hari -> rentang: 7 hari berakhir di hari terakhir; rentang -> minggu: ref = ujung rentang
  const r = R.atur(P, s, 'mode', 'rentang')
  assert.deepEqual([r.mode, r.a, r.b], ['rentang', hari[24], hari[30]])
  const m = R.atur(P, r, 'mode', 'minggu'); assert.deepEqual([m.mode, m.ref], ['minggu', hari[30]])
  // ref di luar data dijepit ke jangkauan data
  assert.equal(R.atur(P, s, 'ref', '2030-01-01').ref, hari[30])
  assert.equal(R.atur(P, s, 'ref', '2020-01-01').ref, hari[0])
  assert.equal(R.atur(P, s, 'ref', 'bukan-tanggal'), null)
  assert.equal(R.atur(P, s, 'a', '2026-13'), null)
  // geser: tidak ada tetangga setelah hari terakhir; sebelum itu ref bergeser
  assert.equal(R.atur(P, s, 'geser', '1'), null)
  assert.equal(R.atur(P, s, 'geser', '-1').ref, '2026-10-20')
  assert.equal(R.atur(P, { ...s, ref: hari[0] }, 'geser', '-1'), null)
  assert.equal(R.atur(P, s, 'tak-dikenal', 'x'), null)
})

test('cekKab: kontrak sah lolos; kunci, hari, dan entri rusak ditolak dengan alasan', () => {
  assert.equal(R.cekKab(K(), P), '')
  const rusak = f => { const k = K(); f(k); return R.cekKab(k, P) }
  assert.match(rusak(k => { k.versi = 2 }), /versi/)
  assert.match(rusak(k => { k.hari.pop() }), /hari kabupaten/)
  assert.match(rusak(k => { k.hari[5] = '2026-01-01' }), /berurutan/, 'hari rusak ditolak dulu sebagai tak berurutan')
  assert.match(rusak(k => { k.hari = k.hari.map(h => R.tambah(h, 1)) }), /hari kabupaten/, 'berurutan tetapi bergeser: beda dari P')
  assert.match(rusak(k => { k.kab['tanpa-prov'] = { nama: 'x', prov: '62', d: [] } }), /prov\|kabupaten/)
  assert.equal(rusak(k => { k.kab['62|'] = { nama: 'Tanpa kabupaten', prov: '62', d: [[0, 3, 1]] } }), '', '"<prov>|" = deteksi di fitur tanpa nama: sah (overlay membuangnya karena tak punya bentuk)')
  assert.match(rusak(k => { k.kab['62|A'].d = 'x' }), /62\|A\.d/)
  assert.match(rusak(k => { k.kab['62|A'].d[0] = [31, 1, 1] }), /entri tak sah/, 'indeks hari di luar jangkauan')
  assert.match(rusak(k => { k.kab['62|A'].d[0] = [-1, 1, 1] }), /entri tak sah/)
  assert.match(rusak(k => { k.kab['62|A'].d[0] = [0.5, 1, 1] }), /entri tak sah/)
  assert.match(rusak(k => { k.kab['62|A'].d[0] = [0, -1, 1] }), /entri tak sah/)
  assert.match(rusak(k => { k.kab['62|A'].d[0] = [0, 1] }), /entri tak sah/)
  assert.match(rusak(k => { k.kab['62|A'].d[0] = [0, null, 1] }), /entri tak sah/)
  assert.ok(R.cekKab(null, P))
  assert.ok(R.cekKab({ ...K(), kab: null }, P))
  // berdiri sendiri (tanpa P): overlay hanya memuat berkas kabupaten, jadi harinya diperiksa sendiri
  assert.equal(R.cekKab(K()), '')
  const sendiri = f => { const k = K(); f(k); return R.cekKab(k) }
  assert.match(sendiri(k => { k.hari.splice(5, 1) }), /berurutan/)
  assert.match(sendiri(k => { k.hari[0] = '21 Sep' }), /berurutan/)
  assert.match(sendiri(k => { k.hari = [] }), /versi, hari/)
  assert.match(sendiri(k => { k.celah = '2026-09-25' }), /celah/)
  assert.match(sendiri(k => { k.kab['62|A'].d[0] = [31, 1, 1] }), /entri tak sah/, 'indeks dibatasi panjang hari milik berkas itu sendiri')
})

test('siapkanKab: kontrol periode jalan dari berkas kabupaten saja, celah ikut', () => {
  const Pk = R.siapkanKab(K())
  assert.equal(Pk.n, 31); assert.deepEqual([...Pk.celah], ['2026-09-25', '2026-10-20'])
  assert.deepEqual(R.rentang(Pk, 'minggu', '2026-10-21'), R.rentang(P, 'minggu', '2026-10-21'))
  assert.match(R.catatanCelah(Pk, 28, 30, 'luas'), /20 Okt/)
  assert.equal(R.kontrol(Pk, { metrik: 'luas', mode: 'bulan', ref: '2026-10-21', a: '', b: '' }, '2026-10-21', true), R.kontrol(P, { metrik: 'luas', mode: 'bulan', ref: '2026-10-21', a: '', b: '' }, '2026-10-21', true))
  // tanpa celah di berkas: tak ada catatan (bukan galat)
  const { celah, ...tanpa } = K(); assert.equal(R.catatanCelah(R.siapkanKab(tanpa), 0, 30, 'luas'), '')
})

test('agregatKab: luas = jumlah harian periode; belum padam = nilai hari terakhir (stok), tidak pernah dijumlah; nol tidak ikut', () => {
  const a = idx('2026-10-19'), b = idx('2026-10-21')
  const luas = R.agregatKab(KB(), 'luas', a, b), belum = R.agregatKab(KB(), 'belum', a, b)
  assert.equal(luas['62|A'], 10 * ((a + 1) + (a + 2) + (a + 3)))
  assert.equal(luas['62|B'], 40, 'hanya hari 29 (20 Okt) di dalam periode')
  assert.equal('62|C' in luas, false, 'C luas 0: tidak ikut (transparan)')
  assert.equal(belum['62|A'], 5 * (b + 1), 'stok: hanya hari b')
  assert.equal(belum['62|B'], undefined, 'B tidak punya belum padam di hari b: tidak ikut, nilai hari lain tak terbawa')
  assert.equal(belum['62|C'], 9)
  // periode satu tahun penuh: luas dijumlah, belum padam tetap nilai satu hari
  assert.equal(R.agregatKab(KB(), 'luas', 0, 30)['62|A'], 10 * (31 * 32 / 2))
  assert.equal(R.agregatKab(KB(), 'belum', 0, 30)['62|A'], 5 * 31)
  // aliran bisa dibelah, stok tidak
  const g = (m, x, y) => R.agregatKab(KB(), m, x, y)['62|A']
  assert.equal(g('luas', 0, 30), g('luas', 0, 9) + g('luas', 10, 30))
  assert.notEqual(g('belum', 0, 30), g('belum', 0, 9) + g('belum', 10, 30))
  // sama dengan agregat provinsi bila kabupaten dijumlah (invarian jumlah kabupaten = provinsi)
  const J2 = J(), Kb = { '62|A': { d: [] }, '62|B': { d: [] } }
  hari.forEach((_, i) => { const l = 3 * i + 1, bl = i; J2.prov[62].luas[i] = l; J2.prov[62].belum[i] = bl
    Kb['62|A'].d.push([i, 2 * i + 1, i]); Kb['62|B'].d.push([i, i, 0]) })
  const P2 = R.siapkan(J2)
  for (const [x, y] of [[0, 0], [5, 12], [0, 30]]) {
    for (const m of ['luas', 'belum']) {
      const k = R.agregatKab(Kb, m, x, y), jumlah = (k['62|A'] || 0) + (k['62|B'] || 0)
      assert.equal(jumlah, R.agregat(P2, m, x, y)[62], `${m} ${x}..${y}: jumlah kabupaten harus sama dengan provinsi`)
    }
  }
})

test('batasKab: batas kelas menaik tanpa ganda, di bawah maks, paling banyak 4; satu kelas bila maks <= 1', () => {
  assert.deepEqual(R.batasKab(0), []); assert.deepEqual(R.batasKab(1), []); assert.deepEqual(R.batasKab(0.5), [])
  for (let maks = 2; maks <= 3e6; maks = Math.ceil(maks * 1.37)) {
    const b = R.batasKab(maks)
    assert.ok(b.length >= 1 && b.length <= 4, `maks ${maks}: ${b.length} batas`)
    for (let k = 0; k < b.length; k++) {
      assert.ok(Number.isInteger(b[k]) && b[k] >= 1 && b[k] < maks, `maks ${maks}: batas ${b[k]} harus bulat dalam [1, maks)`)
      if (k) assert.ok(b[k] > b[k - 1], `maks ${maks}: batas ${b} tidak menaik ketat`)
    }
  }
  // bentuk yang terbaca di legenda: bilangan 1-2-5
  for (const maks of [5024, 188167, 106784, 2233, 35419]) for (const x of R.batasKab(maks)) assert.match(String(x), /^[125]0*$/, `batas ${x} bukan 1-2-5`)
})

test('kelasKab: sejajar dengan aturan step peta (nilai bulat, batas + 0,5); tiap nilai 1..maks punya tepat satu kelas, menaik', () => {
  const b = R.batasKab(5024)
  let lalu = 0
  for (let v = 1; v <= 5024; v++) {
    const k = R.kelasKab(b, v)
    assert.ok(k >= lalu && k <= b.length, `v ${v}: kelas ${k}`)
    // aturan step MapLibre: kelas = jumlah ambang (batas + 0,5) yang <= v
    assert.equal(k, b.filter(x => v >= x + 0.5).length, `v ${v}`)
    lalu = k
  }
  assert.equal(R.kelasKab(b, 1), 0); assert.equal(R.kelasKab(b, 5024), b.length)
  assert.equal(R.kelasKab([], 7), 0, 'satu kelas')
})

test('warnaKab: n warna muda ke tua, hex sah, kelas terakhir tepat warna sasaran deck, kelas pertama masih terbaca', () => {
  for (const [sasaran, n] of [['#3F5F80', 5], ['#D9600B', 5], ['#3F5F80', 1], ['#D9600B', 2]]) {
    const w = R.warnaKab(sasaran, n)
    assert.equal(w.length, n); for (const c of w) assert.match(c, /^#[0-9a-f]{6}$/)
    assert.equal(w[n - 1], sasaran.toLowerCase(), 'kelas tertinggi = warna sasaran')
    const terang = c => [1, 3, 5].reduce((a, i) => a + parseInt(c.slice(i, i + 2), 16), 0)
    for (let k = 1; k < n; k++) assert.ok(terang(w[k]) < terang(w[k - 1]), `${sasaran}: kelas ${k} harus lebih gelap dari ${k - 1}`)
    if (n > 1) assert.notEqual(w[0], '#ffffff', 'kelas pertama bukan putih (hilang di peta terang)')
  }
})

test('kontrol ringkas: tanpa baris ukuran dan catatan banding; belum padam hanya mencatat celah di hari terakhir periode', () => {
  const lengkap = R.kontrol(P, { metrik: 'luas', mode: 'hari', ref: '2026-10-21', a: '', b: '' }, '2026-10-21')
  const ringkas = R.kontrol(P, { metrik: 'luas', mode: 'hari', ref: '2026-10-21', a: '', b: '' }, '2026-10-21', true)
  assert.match(lengkap, /Ukuran peta/); assert.doesNotMatch(ringkas, /Ukuran peta/)
  assert.match(ringkas, /Jenis periode/); assert.match(ringkas, /data-pk="geser"/)
  // jenis periode dan tombol terbagi rata: lima tombol, kelas seg penuh
  assert.equal((ringkas.match(/data-pk="mode"/g) || []).length, 5)
  assert.match(ringkas, /class="seg penuh lp-md"/)
  // celah 20 Okt di tengah minggu 19-21 Okt: luas mencatatnya, belum padam (hari akhir 21 Okt bersih) tidak
  const minggu = (metrik, ref) => R.kontrol(P, { metrik, mode: 'minggu', ref, a: '', b: '' }, ref, true)
  assert.match(minggu('luas', '2026-10-21'), /Data satelit tidak lengkap pada 20 Okt/)
  assert.doesNotMatch(minggu('belum', '2026-10-21'), /tidak lengkap/)
  // hari terakhir periode bercelah: belum padam ikut mencatat
  const hr = R.kontrol(P, { metrik: 'belum', mode: 'hari', ref: '2026-10-20', a: '', b: '' }, '2026-10-20', true)
  assert.match(hr, /Data satelit tidak lengkap pada 20 Okt/)
  // celah ada, perubahan (banding) tak pernah disebut di overlay
  assert.doesNotMatch(hr, /Perubahan tidak ditampilkan/)
  // mode rentang: dua tanggal asli, tanpa baris ukuran
  const rg = R.kontrol(P, { metrik: 'luas', mode: 'rentang', ref: '', a: '2026-10-01', b: '2026-10-10' }, '2026-10-10', true)
  assert.match(rg, /type="date" data-pk="a" value="2026-10-01"/); assert.match(rg, /type="date" data-pk="b" value="2026-10-10"/)
})

test('pengabelan: peta_kab.js sah secara sintaks; index.html memuatnya sesudah peta_karhutla.js dan sebelum lapisan5.js; dua kotak centang ada di grup Api & respons', () => {
  new Function(baca('public/peta_kab.js'))   // melempar SyntaxError bila rusak
  const h = baca('public/index.html')
  const s = x => h.indexOf(`<script src="${x}"`)
  assert.ok(s('peta_karhutla.js') > 0 && s('peta_kab.js') > s('peta_karhutla.js') && s('lapisan5.js') > s('peta_kab.js'), 'urutan skrip')
  assert.match(h, /<link href="peta_kab\.css" rel="stylesheet">/)
  const grup = h.slice(h.indexOf('<details open><summary>Api & respons</summary>'), h.indexOf('</details>', h.indexOf('<details open><summary>Api & respons</summary>')))
  assert.match(grup, /data-l="kabluas"/); assert.match(grup, /data-l="kabbelum"/)
  assert.doesNotMatch(grup, /data-l="kabluas" checked|data-l="kabbelum" checked/, 'overlay baru tidak menyala sendiri')
  assert.match(h, /kabluas: \["#3F5F80"/); assert.match(h, /kabbelum: \["#D9600B"/)
  assert.match(h, /kabluas: "Luas terbakar", kabbelum: "Belum padam"/, 'nama pendek ubin')
  assert.match(h, /window\.PetaKab\?\.klik\(e\)/, 'klik peta utama menyerahkan ke popup kabupaten')
  // dimuat malas: tak satu pun fetch data kabupaten di index.html sendiri, hanya di modul yang dipanggil saat overlay pertama dinyalakan
  assert.doesNotMatch(h, /peta_karhutla_kab\.json/)
  const j = baca('public/peta_kab.js')
  assert.match(j, /janji \|\|= /, 'satu janji, dimuat sekali'); assert.match(j, /muatJSON\("data\/peta_karhutla_kab\.json"\)/)
  // semua teks tampil baru punya padanan EN (kalimat tetap di en.json)
  const en = JSON.parse(baca('public/i18n/en.json')).kamus
  for (const t of ['Luas terbakar per kabupaten (perkiraan satelit)', 'Belum padam per kabupaten (perkiraan satelit)', 'Periode peta kabupaten', 'Perkiraan satelit',
    'Perkiraan satelit, bukan luas resmi.', 'Peta kabupaten gagal dimuat', 'Luas terbakar (ha)', 'Belum padam (ha)', 'Tanpa deteksi', 'Jumlah luas harian (perkiraan satelit)',
    'Luas terbakar (perkiraan satelit)', 'Belum padam (perkiraan satelit)']) assert.ok(en[t], `en.json tanpa kunci: ${t}`)
})

test('selera pemilik: angka di tooltip/popup overlay ditulis apa adanya ("1.234 ha"), tanpa tanda ±', () => {
  const j = baca('public/peta_kab.js')
  assert.doesNotMatch(j, /±/, 'peta_kab.js memakai ± (pemilik: tanpa ±)')
  assert.match(j, /const nilai = k => hit\[k\] \? `\$\{fmt\(hit\[k\]\)\} ha` : "Tanpa deteksi"/)
  assert.doesNotMatch(baca('public/peta_kab.css'), /±/)
})

test('en.json: kalimat baru overlay kabupaten (sumber FIRMS, deteksi ulang, belum padam kosong) punya padanan EN, termasuk yang dihasilkan fungsi murni', () => {
  const en = JSON.parse(baca('public/i18n/en.json')).kamus
  for (const t of ['Perkiraan satelit NASA FIRMS, bukan luas resmi.', 'Api yang sama terhitung lagi tiap hari.', 'Tanpa deteksi pada periode ini', 'Tidak ada yang belum padam',
    R.kosongKab('luas', 0), R.kosongKab('luas', 5), R.kosongKab('belum', 0), R.kosongKab('belum', 5)]) assert.ok(en[t], `en.json tanpa kunci: ${t}`)
})

test('overlay kabupaten: sumber disebut, periode jumlah diberi catatan deteksi ulang, satu penghitung waktu per input tanggal, warna lewat feature-state, pasang dipisah dari gambar', () => {
  const j = baca('public/peta_kab.js')
  assert.match(j, /R\.teksKab\(st\.metrik, hit\[k\], fmt\)/, 'angka tooltip/popup lewat R.teksKab (bulat2 + belum padam 0 = "0 ha")')
  assert.match(j, /R\.kosongKab\(m, kls\.maks\)/, 'baris legenda petak kosong lewat R.kosongKab')
  assert.match(j, /Perkiraan satelit NASA FIRMS, bukan luas resmi\./, 'popup menyebut sumber')
  assert.match(j, /Api yang sama terhitung lagi tiap hari\./, 'jumlah periode luas diberi catatan deteksi ulang')
  // satu penghitung bersama membuat Sampai (Tab dari Dari < 600 ms) membatalkan komit Dari
  assert.doesNotMatch(j, /clearTimeout\(tunda\)/, 'peta_kab.js: penghitung waktu tanggal harus per input (c._h), bukan bersama')
  assert.match(j, /clearTimeout\(c\._h\)/)
  const lap = baca('public/laporan.js')
  assert.doesNotMatch(lap, /clearTimeout\(tundaTgl\)/, 'laporan.js: penghitung waktu tanggal harus per input (c._h), bukan bersama')
  assert.match(lap, /clearTimeout\(c\._h\)/)
  // ganti periode tidak boleh memuat ulang ubin: warna kelas di feature-state "c", ekspresi paint tetap
  assert.doesNotMatch(j, /setPaintProperty\("kab-fill"/, 'setPaintProperty dengan ekspresi baru memuat ulang semua ubin sumber tiap ganti periode')
  assert.match(j, /\["feature-state", "c"\]/)
  // pasang sumber dan penggambaran awal tidak satu tugas dengan penyelesaian fetch
  assert.match(j, /await new Promise\(nanti\); if \(id !== gen\) return;\s+pasang\(\); nanti\(/)
})

test('selera pemilik: ± yang sudah dibersihkan dari teks tampil tidak kembali (kartu Peta provinsi di laporan.js, tooltip/laci di index.html)', () => {
  assert.doesNotMatch(baca('public/laporan.js'), /`±\$\{|"±" \+|HPH ± 2014/, 'laporan.js: ± kembali di kartu Peta provinsi / sumber konsesi')
  assert.doesNotMatch(baca('public/index.html'),
    /"Sel ± 11 km"|"±" \+ fmt\(Math\.round\(d\.pg|"± " \+ fmt\(x\.(siklus_menit|siram_per_jam)|per sel ± 11 km\)<\/div>|Konsesi \(data ± 2014\)|garis api aktif ± \$|sawit & HPH ± 2014 · HTI|<td class="n num">± \$\{fmtJam/,
    'index.html: ± kembali di teks tampil yang sudah dibersihkan')
})

test('bulat2: dua angka penting untuk tampilan luas; di bawah 100 tak berubah, galat relatif paling banyak 5%', () => {
  assert.equal(R.bulat2(4687), 4700); assert.equal(R.bulat2(397), 400); assert.equal(R.bulat2(83), 83); assert.equal(R.bulat2(1), 1); assert.equal(R.bulat2(0), 0)
  assert.equal(R.bulat2(233748), 230000); assert.equal(R.bulat2(191551), 190000); assert.equal(R.bulat2(99), 99); assert.equal(R.bulat2(100), 100); assert.equal(R.bulat2(995), 1000)
  for (let v = 1; v < 100; v++) assert.equal(R.bulat2(v), v, `${v} < 100 harus tetap`)
  for (let v = 1; v <= 2.5e6; v = Math.ceil(v * 1.07)) { const r = R.bulat2(v); assert.ok(r >= 1 && Math.abs(r - v) / v <= 0.0501, `${v} -> ${r}: galat > 5% atau jatuh ke 0`) }
})

test('teksKab / kosongKab: belum padam 0 tidak pernah tertulis "Tanpa deteksi" (kabupaten itu bisa punya deteksi yang tak bertahan 12-36 jam)', () => {
  const f = n => n.toLocaleString('id-ID')
  assert.equal(R.teksKab('luas', undefined, f), 'Tanpa deteksi'); assert.equal(R.teksKab('luas', 0, f), 'Tanpa deteksi')
  assert.equal(R.teksKab('belum', undefined, f), '0 ha'); assert.equal(R.teksKab('belum', 0, f), '0 ha')
  assert.equal(R.teksKab('luas', 4687, f), '4.700 ha'); assert.equal(R.teksKab('belum', 397, f), '400 ha'); assert.equal(R.teksKab('luas', 83, f), '83 ha')
  for (const v of [undefined, 0, 5, 4687]) assert.doesNotMatch(R.teksKab('belum', v, f), /Tanpa deteksi/)
  for (const maks of [0, 1, 5, 4687]) assert.doesNotMatch(R.kosongKab('belum', maks), /Tanpa deteksi/)
  assert.equal(R.kosongKab('luas', 5), 'Tanpa deteksi'); assert.equal(R.kosongKab('luas', 0), 'Tanpa deteksi pada periode ini')
  assert.equal(R.kosongKab('belum', 0), 'Tidak ada yang belum padam')
})

// data/peta_karhutla_kab.json (bila sudah terbit): invarian terhadap peta_karhutla.json dan GeoJSON kabupaten layar
// PETA_KAB_JSON = jalur berkas lain (mis. contoh buatan) untuk membuktikan uji ini sendiri; tanpa itu yang diuji berkas terbit
const jalurKab = process.env.PETA_KAB_JSON || fileURLToPath(new URL('public/data/peta_karhutla_kab.json', akar))
const adaKab = existsSync(jalurKab) && existsSync(new URL('public/data/peta_karhutla.json', akar))
test('data/peta_karhutla_kab.json (bila sudah terbit): kontrak v1, kunci ada di GeoJSON kabupaten layar, belum <= luas, jumlah kabupaten = provinsi dalam toleransi pembulatan',
  { skip: adaKab ? false : 'belum terbit' }, () => {
    const prov = JSON.parse(baca('public/data/peta_karhutla.json')), kab = JSON.parse(readFileSync(jalurKab, 'utf8'))
    const Pp = R.siapkan(prov)
    assert.equal(R.cek(prov), ''); assert.equal(R.cekKab(kab, Pp), '')
    assert.deepEqual(kab.hari, prov.hari, 'hari sama dengan provinsi'); assert.equal(kab.porsi, prov.porsi)
    const geo = new Map()
    const S = new Map()   // `${prov}|${i}` -> [jumlah luas, jumlah belum, banyak kabupaten]
    for (const [kunci, o] of Object.entries(kab.kab)) {
      const [p, ...sisa] = kunci.split('|'), nama = sisa.join('|')
      assert.equal(o.prov, p, `${kunci}: prov tak cocok kunci`)
      if (nama) {   // "<prov>|" tanpa nama = titik di fitur tanpa nama (danau); layar tak punya fiturnya
        if (!geo.has(p)) geo.set(p, new Set(JSON.parse(baca(`public/geo/kabupaten/${p}.json`)).features.map(f => f.properties.kab)))
        assert.ok(geo.get(p).has(nama), `${kunci}: nama tak ada di public/geo/kabupaten/${p}.json, overlay tidak bisa menggambarnya`)
      }
      for (const [i, luas, belum] of o.d) {
        assert.ok(belum <= luas, `${kunci} hari ${prov.hari[i]}: belum padam ${belum} > luas ${luas}`)
        const s = S.get(`${p}|${i}`) || S.set(`${p}|${i}`, [0, 0, 0]).get(`${p}|${i}`)
        s[0] += luas; s[1] += belum; s[2]++
      }
    }
    for (const p of Object.keys(prov.prov)) for (let i = 0; i < prov.hari.length; i++) {
      const [jl, jb, m] = S.get(`${p}|${i}`) || [0, 0, 0]
      for (const [jumlah, nama] of [[jl, 'luas'], [jb, 'belum']]) {
        const sel = Math.abs(jumlah - prov.prov[p][nama][i])
        assert.ok(sel <= (m + 1) / 2 + 1e-9, `${prov.hari[i]} prov ${p} ${nama}: jumlah ${m} kabupaten ${jumlah} vs provinsi ${prov.prov[p][nama][i]} (selisih ${sel} > ${(m + 1) / 2})`)
      }
    }
  })
