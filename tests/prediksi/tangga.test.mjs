// Tangga Peringatan /prediksi: self-check tangga.py, invarian tangga.json (bila ada), fungsi murni tangga_inti.js dijalankan nyata di node,
// dan sambungan (tab di index.html, rantai di jalan.py). Aturan: data/kajian-bnpb/tangga/ALGORITMA.md.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const akar = new URL('../../', import.meta.url)
const baca = (p) => readFileSync(new URL(p, akar), 'utf8')
const ada = (p) => existsSync(new URL(p, akar))
const ORDE = ['musim', 'bulan', 'dasarian', 'h10', 'sepekan', 'h3', 'jam']

test('tangga.py uji', () => {
  const out = execFileSync('python3', [new URL('scripts/prediksi/tangga.py', akar).pathname, 'uji'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  assert.match(out, /uji lulus/)
})

const win = {}
new Function('window', baca('public/prediksi/tangga_inti.js'))(win)
const T = win.Tangga

// salinan terbuka aturan sinyal (ALGORITMA 4), ditulis ulang di sini supaya tangga.py tidak menilai dirinya sendiri
function sinyalUlang(r, c) {
  const v = r.filter((x) => x !== null)
  const ix0 = r.map((x, i) => [x, i]).filter(([x]) => x !== null)
  const naik = v.length >= 2 && v.every((x, i) => i === 0 || v[i - 1] <= x) && v.at(-1) >= 1 && v.filter((x) => x >= 1).length >= 2
  const menguat = naik && v.at(-1) > v[0] && new Set(ix0.map(([, i]) => c[i])).size === 1
  let selaras = false
  const ix = r.map((x, i) => [x, i]).filter(([x]) => x !== null)
  for (let i = 0; i < ix.length; i++) for (let j = i + 1; j < ix.length; j++) if (c[ix[i][1]] === c[ix[j][1]] && Math.abs(ix[i][0] - ix[j][0]) >= 2) selaras = true
  return { m: menguat, d: naik && !menguat, s: selaras }
}

test('tangga.json: 514+ kab, tiap pernyataan punya lembaga, cakupan, kalimat; sinyal cocok aturan terbuka', () => {
  if (!ada('public/prediksi/data/tangga.json')) return
  const t = JSON.parse(baca('public/prediksi/data/tangga.json'))
  assert.equal(t.versi, 1)
  assert.deepEqual(t.skala.map((s) => s.id), ORDE)
  const ids = Object.keys(t.kab)
  assert.ok(ids.length >= 514, `hanya ${ids.length} kab`)
  const semua = [...Object.values(t.nasional), ...Object.values(t.prov).flatMap((p) => Object.values(p)), ...Object.values(t.kab).flatMap((k) => ORDE.flatMap((s) => k[s] || []))]
  for (const l of Object.values(t.nasional)) semua.push(...l)
  let n = 0
  for (const e of semua.flat()) {
    n++
    assert.ok(['k', 'b', 'kb'].includes(e.a), `a ${e.a}`)
    assert.ok(['nas', 'prov', 'kab', 'kec'].includes(e.c), `c ${e.c}`)
    assert.ok(typeof e.x === 'string' && e.x.length > 0 && typeof e.t === 'string', 'x dan t wajib')
    const s = t.sumber[e.s]
    assert.ok(s && s.lembaga && s.cakupan && (s.terbit || s.update || s.diambil), `sumber ${e.s} tanpa lembaga/cakupan/tanggal`)
    if (s.terbit) assert.match(s.terbit, /^\d{4}-\d{2}-\d{2}$/, `terbit ${e.s} bukan tanggal terbit sumber`)
    if (Array.isArray(e.tk)) assert.equal(e.tk.length, 2)
    else assert.ok(e.tk === null || (Number.isInteger(e.tk) && e.tk >= 0 && e.tk <= 3), `tk ${e.tk}`)
  }
  assert.ok(n > 1000, `hanya ${n} pernyataan`)
  // cakupan jujur: pernyataan tingkat provinsi/nasional tidak ada di entri kab
  for (const k of Object.values(t.kab)) for (const s of ORDE) for (const e of k[s] || []) assert.ok(['kab', 'kec'].includes(e.c), `${s}: cakupan ${e.c} di entri kab`)
  for (const p of Object.values(t.prov)) for (const l of Object.values(p)) for (const e of l) assert.equal(e.c, 'prov')
  for (const l of Object.values(t.nasional)) for (const e of l) assert.equal(e.c, 'nas')
  // sinyal: dihitung ulang dari r
  let menguat = 0
  for (const [id, k] of Object.entries(t.kab)) {
    for (const a of ['k', 'b']) {
      const sg = k.sg[a]
      assert.equal(sg.r.length, 7, id)
      assert.equal(sg.c.length, 7, id)
      const u = sinyalUlang(sg.r, sg.c)
      assert.equal(sg.m, u.m, `${id} ${a} menguat`)
      assert.equal(sg.s, u.s, `${id} ${a} belum selaras`)
      assert.equal(sg.d, u.d, `${id} ${a} searah`)
      menguat += sg.m
    }
  }
  assert.equal(menguat, t.ringkas.menguat.k + t.ringkas.menguat.b)
  assert.ok(t.ringkas.searah && Number.isInteger(t.ringkas.searah.k) && Number.isInteger(t.ringkas.searah.b))
  // tidak pernah "aman", tidak pernah "Pantau Bencana"
  const teks = JSON.stringify([t.kab, t.prov, t.nasional, t.catatan])
  assert.doesNotMatch(teks, /\baman\b/i)
  assert.doesNotMatch(teks, /Pantau Bencana/i)
  assert.ok(t.ringkas.cakupan.musim.nas === t.ringkas.n_kab || !t.skala[0].ok.k, 'musim tampil nasional untuk semua kab bila sumbernya ada')
})

test('kosakata nyata prakiraan 10 hari BMKG: tidak ada kelas lebat, jadi peringkat basah h10 null dan kondisi tampil apa adanya', () => {
  if (!ada('public/banjir/data/cuaca_bmkg_kab10.json') || !ada('public/prediksi/data/tangga.json')) return
  const kosa = new Set(Object.values(JSON.parse(baca('public/banjir/data/cuaca_bmkg_kab10.json')).kab).flatMap((k) => k.hari.map((h) => h.kondisi)))
  assert.ok(kosa.size > 3)
  const lebat = [...kosa].filter((x) => /Lebat|Ekstrem/i.test(x))
  const t = JSON.parse(baca('public/prediksi/data/tangga.json'))
  const h10b = Object.values(t.kab).flatMap((k) => (k.h10 || []).filter((e) => e.a === 'b'))
  assert.ok(h10b.length > 400)
  // jika BMKG suatu hari memakai kelas lebat, pemetaan harus diputuskan pemilik (Q10): uji ini sengaja gagal supaya tidak diam-diam null
  assert.deepEqual(lebat, [], `kosakata BMKG kini memuat ${lebat}; putuskan pemetaan (KEPUTUSAN Q10)`)
  for (const e of h10b) { assert.equal(e.tk, null); assert.ok(e.t === 'Tanpa hujan' || kosa.has(e.t), `${e.t} bukan kondisi BMKG`) }
})

test('cakupan: FWI, asap, SPI, sifat Normal, hujan sedang tanpa peringkat; prediksi kita level 0 bukan "Normal"', () => {
  if (!ada('public/prediksi/data/tangga.json')) return
  const t = JSON.parse(baca('public/prediksi/data/tangga.json'))
  const semua = [...Object.values(t.prov).flatMap((p) => Object.values(p).flat()), ...Object.values(t.kab).flatMap((k) => ORDE.flatMap((s) => k[s] || []))]
  for (const e of semua) {
    if (['fwi', 'spi'].includes(e.j) || (e.j === 'asap' && t.sumber[e.s].jenis === 'resmi') || e.t === 'Hujan sedang') assert.equal(e.tk, null, `${e.j} ${e.t}`)
    if (t.sumber[e.s].jenis === 'kita' && e.tk === 0) assert.equal(e.t, e.j === 'asap' ? 'Baik/Sedang' : 'Aturan belum terpenuhi')
    if (e.j === 'iklim') assert.equal(e.tk, null, 'sifat/curah hujan tanpa peringkat')
    if (t.sumber[e.s].jenis === 'kita') assert.ok(e.u, `prediksi kita ${e.j} tanpa pil vonis`)
  }
  // belum selaras hanya antar cakupan sama (hitungan ulang di atas) dan ok per ancaman
  for (const s of t.skala) assert.deepEqual(Object.keys(s.ok), ['k', 'b'])
})

test('arsip tangga: satu baris per tanggal, 7 peringkat per ancaman', () => {
  if (!ada('public/prediksi/data/tangga_arsip')) return
  for (const f of ['2026-11.jsonl']) {
    if (!ada('public/prediksi/data/tangga_arsip/' + f)) continue
    const baris = baca('public/prediksi/data/tangga_arsip/' + f).split('\n').filter(Boolean).map((b) => JSON.parse(b))
    assert.equal(new Set(baris.map((b) => b.t)).size, baris.length, 'tanggal ganda di arsip')
    for (const b of baris) for (const r of Object.values(b.kab)) assert.ok(r.length === 2 && r[0].length === 7 && r[1].length === 7)
  }
})

test('tangga_inti: gabung nasional, provinsi, kab menurut ancaman; kosong tidak pernah "aman"', () => {
  const e = (a, tk, c, x = 'x') => ({ a, tk, t: 'L', x, s: 's', c })
  const t = {
    skala: ORDE.map((id, i) => ({ id, nama: id, ok: { k: i !== 1, b: i !== 1 } })),
    sumber: { s: { lembaga: 'BMKG', terbit: '2026-10-02 09:11:18', cakupan: 'nasional', jenis: 'resmi' }, d: { lembaga: 'BMKG', diambil: '2026-11-10T17:51+07:00' } },
    nasional: { musim: [e('kb', null, 'nas')] },
    prov: { 11: { sepekan: [e('b', 2, 'prov'), e('k', 1, 'prov')] } },
    kab: { 1101: { bulan: [e('kb', [2, 0], 'kab')], sepekan: [e('b', 3, 'kab')] } },
  }
  assert.equal(T.pernyataan(t, '1101', '11', 'musim', 'k').length, 1)
  assert.equal(T.pernyataan(t, '1101', '11', 'sepekan', 'b').length, 2)
  assert.deepEqual(T.pernyataan(t, '1101', '11', 'sepekan', 'b').map((x) => x.c), ['prov', 'kab'], 'urutan nasional, provinsi, kab')
  assert.equal(T.pernyataan(t, '1102', '11', 'sepekan', 'k').length, 1, 'kab lain di provinsi sama tetap mewarisi pernyataan provinsi')
  assert.equal(T.pernyataan(t, '1102', '11', 'bulan', 'k').length, 0)
  assert.equal(T.tkItem(t.kab[1101].bulan[0], 'k'), 2)
  assert.equal(T.tkItem(t.kab[1101].bulan[0], 'b'), 0)
  assert.equal(T.tkItem(e('b', 2, 'kab'), 'k'), null)
  assert.equal(T.cakupanTeks('prov'), 'tingkat provinsi')
  assert.equal(T.cakupanTeks('kab'), '')
  assert.equal(T.kosongTeks(t.skala[1], 'k'), 'Belum ada data')
  assert.equal(T.kosongTeks(t.skala[0], 'k'), 'Tidak disebut dalam pernyataan sumber')
  assert.doesNotMatch(T.kosongTeks(t.skala[1], 'k') + T.kosongTeks(t.skala[0], 'k'), /aman/i)
  assert.equal(T.jejak(t, { s: 's' }), 'BMKG, terbit 2 Okt')
  assert.equal(T.jejak(t, { s: 'd' }), 'BMKG, diambil 10 Nov')
  assert.equal(T.tglS('2026-11-09 14:34:39'), '9 Nov')
})

test('tangga_inti: daftar bersinyal dan hitungan provinsi', () => {
  const sg = (km, ks, bm, bs) => ({ k: { m: km, d: false, s: ks, r: [] }, b: { m: bm, d: false, s: bs, r: [] } })
  const t = { kab: { a: { sg: sg(true, false, false, false) }, b: { sg: sg(false, true, false, false) }, c: { sg: sg(false, false, false, false) }, d: { sg: sg(true, false, true, true) } } }
  const daftar = [{ id: 'a', nama: 'Kab. A', prov: '11', pn: 'Aceh' }, { id: 'b', nama: 'Kab. B', prov: '11', pn: 'Aceh' }, { id: 'c', nama: 'Kab. C', prov: '11', pn: 'Aceh' }, { id: 'd', nama: 'Kab. D', prov: '12', pn: 'Sumut' }]
  assert.deepEqual(T.bersinyal(t, daftar, '11', 'semua').map((r) => r.k.id), ['a', 'b'], 'menguat dulu, c tanpa sinyal dibuang')
  assert.deepEqual(T.bersinyal(t, daftar, '11', 'b').map((r) => r.k.id), [], 'saring ancaman basah')
  assert.deepEqual(T.bersinyal(t, daftar, '', 'k').map((r) => r.k.id), ['a', 'd', 'b'], 'menguat dulu, lalu yang hanya belum selaras')
  const pp = T.perProvinsi(t, daftar)
  assert.deepEqual(pp.map((r) => [r.p, r.n, r.mk, r.mb, r.sk, r.sb]), [['11', 3, 1, 0, 1, 0], ['12', 1, 1, 1, 0, 1]])
  const sgx = { r: [null, 0, null, null, 2, null, null], par: [1, 4] }
  const ket = T.ketSinyal({ skala: ORDE.map((id) => ({ id, nama: id })) }, sgx)
  assert.ok(ket.some((x) => x.includes('bulan dan sepekan')) && ket.includes('musim: tanpa tingkat') && ket.includes('bulan: peringkat 0, tingkat tidak diketahui'))
})

test('sambungan: tab Tangga di index.html, prediksi.js, rantai jalan.py; tanpa titik tengah dan tanpa kata terlarang', () => {
  const h = baca('public/prediksi/index.html'), p = baca('public/prediksi/prediksi.js'), j = baca('scripts/prediksi/jalan.py')
  assert.match(h, /data-tab="tangga"/)
  assert.match(h, /id="p-tangga"/)
  assert.match(h, /<script src="tangga_inti\.js"><\/script>\s*<script src="tangga\.js"><\/script>/)
  assert.match(h, /href="tangga\.css"/)
  assert.match(h, /inti\/nanti\.js/)
  assert.match(p, /t === "tangga"\) muatTangga\(\)/)
  assert.match(p, /"laporan", "tangga"\]\.includes\(tab\)/)
  assert.match(j, /import tangga[\s\S]*tangga\.jalankan\(\)/)
  for (const f of ['public/prediksi/tangga.js', 'public/prediksi/tangga_inti.js', 'public/prediksi/tangga.css']) {
    const s = baca(f)
    assert.doesNotMatch(s, /Pantau Bencana/i, f)
    assert.doesNotMatch(s, /&middot;|(?:^|[\s<>])·(?:$|[\s<>])/m, `${f}: titik tengah sebagai pemisah`)
  }
  const js = baca('public/prediksi/tangga.js')
  assert.match(js, /ex-std/)
  assert.match(js, /ex-ey/)
  assert.match(js, /hl/)
  assert.match(js, /nanti\(\(\) => \{[^}]*gambarTg\(\)/, 'isi digambar sesudah satu frame (INP)')
  assert.match(js, /if \(TG\.antri\) return/, 'antrean render digabung')
  assert.match(js, /TG\.provOpsi !== TG\.prov/, 'opsi kab hanya dibangun bila provinsi berubah')
  assert.match(js, /e\.key !== " "/, 'Spasi membuka baris')
  assert.doesNotMatch(js, /Sumber: /)
  assert.doesNotMatch(js, /\.innerHTML\s*=\s*[^;]*\b(?:e\.x|e\.t)\b(?![^;]*esc\()/, 'teks sumber harus lewat esc()')
})
