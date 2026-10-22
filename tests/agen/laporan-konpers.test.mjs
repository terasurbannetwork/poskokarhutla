// Gerbang keluaran konferensi pers /laporan-bnpb (public/laporan_konpers.js, laporan_matador.js, laporan_bnpb_slide.js), dijalankan nyata di node tanpa DOM.
// Menagih: [SLIDE n] = jumlah halaman deck konpers; tidak ada angka di naskah yang bukan dari isian (kecuali pembulatan dan hitungan);
// pemecah Matador tidak pernah > 5 baris; huruf Matador >= 28 (judul >= 44) di 16:9 DAN 32:9; tanpa pemisah " · ".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const win = {}
const ctx = { window: win, document: {}, Intl, Date, Math }
vm.createContext(ctx)
for (const f of ['paparan_slide', 'laporan_bnpb_slide', 'laporan_konpers', 'laporan_matador', 'laporan_contoh'])
  vm.runInContext(readFileSync(new URL(`../../public/${f}.js`, import.meta.url), 'utf8'), ctx, { filename: f })
const LB = win.LaporanBnpbSlide, K = win.LaporanKonpers, M = win.LaporanMatador, PS = win.PaparanSlide

const PROV = { 14: 'Riau', 15: 'Jambi', 16: 'Sumatera Selatan', 18: 'Lampung', 21: 'Kepulauan Riau', 33: 'Jawa Tengah', 35: 'Jawa Timur', 53: 'Nusa Tenggara Timur', 62: 'Kalimantan Tengah', 72: 'Sulawesi Tengah', 73: 'Sulawesi Selatan', 81: 'Maluku' }
const isi = () => JSON.parse(JSON.stringify(win.LaporanContoh.harian('2026-10-21', '2026-10-20')))
const konteks = (i, extra = {}) => ({ isi: i, tanggal: '2026-10-21', tahun: '2026', prov: PROV, aset: { petaM: 'data:image/png;base64,AAAA' }, no: 1, ...extra })

/* kanvas perekam: semua teks yang digambar + ukuran hurufnya */
const rekam = () => { const teks = [], k = { teks: (x, y, w, h, r, o = {}) => teks.push({ s: o.s || 10, t: (typeof r === 'string' ? [{ t: r }] : Array.isArray(r) ? r : [r]).map(p => p.t ?? p).join('') }), kotak() {}, garis() {}, bulat() {}, gambar() {} }; return { k, teks } }

/* angka sah: ada di isian, pembulatan "ribu"/bilangan bulat dari angka isian, hitungan dari isian, atau nomor kontak tetap */
function angkaSah(i) {
  const mentah = new Set(), nilai = new Set()
  const urai = s => Number(s.replace(/\./g, '').replace(',', '.'))
  const ambil = t => { if (typeof t === 'string') mentah.add(t); for (const m of String(t ?? '').matchAll(/\d+(?:\.\d{3})*(?:,\d+)?|\d+(?:\.\d+)?/g)) { mentah.add(m[0]); nilai.add(urai(m[0])); for (const p of m[0].split(/[.,]/)) nilai.add(Number(p)) } }
  ;(function jalan(o) { if (o && typeof o === 'object') Object.values(o).forEach(jalan); else ambil(o) })(i)
  for (const [, v] of LB.KONTAK) ambil(v)
  const ks = i.kejadian, hit = [ks, ...['jenis', 'prov', 'status'].flatMap(f => [...new Set(ks.map(x => x[f]))].map(v => ks.filter(x => x[f] === v)))]
  for (const a of hit) nilai.add(a.length)
  for (const j of new Set(ks.map(x => x.jenis))) for (const s of new Set(ks.map(x => x.status))) nilai.add(ks.filter(x => x.jenis === j && x.status === s).length)
  nilai.add(new Set(ks.map(x => x.prov)).size)
  for (const j of new Set(ks.map(x => x.jenis))) nilai.add(new Set(ks.filter(x => x.jenis === j).map(x => x.prov)).size)
  for (const j of new Set(i.perhatian_tambahan.map(x => x.jenis))) nilai.add(i.perhatian_tambahan.filter(x => x.jenis === j).length)
  nilai.add(i.perhatian_tambahan.length); nilai.add(0)
  const sah = x => mentah.has(x.mentah) || nilai.has(x.v) || [...nilai].some(v => Math.round(v) === x.v || (x.ribu && Math.abs(x.v * x.ribu - v) <= 0.06 * v))
  return sah
}
/* angka di teks naskah: digit (dengan "ribu"/"juta") dan angka berkata ("tujuh belas") */
const SAT = { nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10, sebelas: 11 }
function ekstrak(teks) {
  const hasil = []
  const t = teks.replace(/\[SLIDE \d+\]/g, ' ').replace(/Pertanyaan \d+:/g, ' ')
  for (const m of t.matchAll(/\d+(?:\.\d{3})*(?:,\d+)?(?:\.\d+)?(?:\s+(ribu|juta))?/g)) { const n = m[0].split(/\s/)[0]; hasil.push({ mentah: n, v: Number(n.replace(/\./g, '').replace(',', '.')), ribu: m[1] === 'ribu' ? 1000 : m[1] === 'juta' ? 1e6 : 0, kata: m[0] }) }
  const kata = t.toLowerCase().match(/[a-z]+/g) || []
  for (let i = 0; i < kata.length; i++) {
    const w = kata[i]; let v = null, pj = 1
    if (w in SAT) { v = SAT[w]; if (kata[i + 1] === 'belas' && v >= 1 && v <= 9) { v += 10; pj = 2 } else if (kata[i + 1] === 'puluh') { v *= 10; pj = 2; if (kata[i + 2] in SAT && SAT[kata[i + 2]] >= 1 && SAT[kata[i + 2]] <= 9) { v += SAT[kata[i + 2]]; pj = 3 } } }
    if (v !== null) { hasil.push({ mentah: String(v), v, ribu: 0, kata: kata.slice(i, i + pj).join(' ') }); i += pj - 1 }
  }
  return hasil
}

test('[SLIDE n] sebanyak halaman deck konpers, berurutan', () => {
  const c = konteks(isi()), n = LB.deckKonpers(c).length, nk = K.naskah(c)
  const penanda = [...nk.teks.matchAll(/\[SLIDE (\d+)\]/g)].map(m => +m[1])
  assert.equal(penanda.length, n)
  assert.deepEqual(Array.from(penanda), Array.from({ length: n }, (_, i) => i + 1))
  assert.equal(nk.bagian.length, n)
  // urutan: sampul, ringkasan, per jenis (karhutla, gempabumi, gunung api), perhatian, tindak, imbauan, penutup
  assert.deepEqual(Array.from(K.rencana(c), h => h.id + (h.jenis ? ':' + h.jenis : '')).filter((x, i, a) => a.indexOf(x) === i),
    ['sampul', 'ringkasan', 'jenis:karhutla', 'jenis:gempabumi', 'jenis:gunungapi', 'perhatian', 'tindak', 'imbauan', 'penutup'])
  assert.ok(nk.teks.includes('ANTISIPASI PERTANYAAN WARTAWAN'))
  assert.ok(nk.qa.length >= 5 && nk.qa.length <= 8)
})

test('deck konpers digambar penuh tanpa galat di 3 keluaran perekam, tanpa " · "', () => {
  const c = konteks(isi())
  for (const s of LB.deckKonpers(c)) { const r = rekam(); s.gambar(r.k, { ...c }); assert.ok(r.teks.length > 0, s.id); for (const x of r.teks) assert.ok(!/[·]|\bNaN\b|undefined/.test(x.t), s.id + ': ' + x.t) }
  for (const s of [...LB.DECK.harian]) { const r = rekam(); s.gambar(r.k, { ...c, aset: {} }); for (const x of r.teks) assert.ok(!/·/.test(x.t), s.id + ': ' + x.t) }
  assert.ok(!/·/.test(K.naskah(c).teks))
})

test('naskah: tidak ada angka yang tidak berasal dari isian', () => {
  for (const ubah of [x => x, x => { x.kejadian = x.kejadian.slice(0, 3); x.perhatian_tambahan = [] }, x => { x.kejadian = []; x.tindak = [] }]) {
    const i = isi(); ubah(i)
    const nk = K.naskah(konteks(i)), sah = angkaSah(i), sampah = ekstrak(nk.teks).filter(x => !sah(x))
    assert.deepEqual(sampah.map(x => x.kata), [], 'angka tak berasal dari isian')
  }
  const nk = K.naskah(konteks(isi())), t = nk.teks
  assert.match(t, /tujuh belas karhutla/); assert.match(t, /sekitar 24 ribu \(tepatnya 24\.402,56\)/); assert.match(t, /padam 63,10/); assert.match(t, /sekitar 28 ribu \(tepatnya 27\.847\)/)
  assert.equal(nk.badan.split('27.847').length - 1, 1, 'angka penting disebut lengkap sekali')
  assert.ok(nk.menit > 0 && /menit/.test(nk.label) && Math.abs(nk.menit - nk.kata / 130) < 1e-9)
})

test('naskah: jawaban hanya dari isian, data kosong = "belum tersedia"', () => {
  const kosong = isi(); kosong.kejadian = []; kosong.perhatian_tambahan = []; kosong.tindak = []
  const jawab = K.naskah(konteks(kosong)).qa.map(x => x[1])
  assert.equal(jawab.filter(a => /Data belum tersedia, akan kami sampaikan/.test(a)).length, jawab.length)
  const penuh = K.naskah(konteks(isi())).qa
  assert.match(penuh.find(x => /pengungsi/.test(x[0]))[1], /27\.847/)
  assert.match(penuh.find(x => /personel/.test(x[0]))[1], /Malang.*lima puluh enam personel/)
  const tanpaPersonel = isi(); tanpaPersonel.kejadian = tanpaPersonel.kejadian.filter(x => !/personel/.test(x.kedua)); tanpaPersonel.tindak = []
  assert.match(K.naskah(konteks(tanpaPersonel)).qa.find(x => /personel/.test(x[0]))[1], /belum tersedia/)   // tak disebut di isian: jangan mengarang
})

test('imbauan baku per jenis tanpa angka; isian imbauan menang (maks. 6)', () => {
  const baku = K.imbauan(konteks(isi()))
  assert.ok(baku.length >= 5 && baku.length <= 6); assert.ok(baku.some(x => /membakar/i.test(x.judul)) && baku.some(x => /PVMBG/.test(x.isi)) && baku.some(x => /BPBD/.test(x.isi)))
  assert.ok(!baku.some(x => /\d/.test(x.judul + x.isi)))
  const i = isi(); i.imbauan = Array.from({ length: 9 }, (_, n) => ({ judul: 'J' + n, isi: 'i' }))
  assert.equal(K.imbauan(konteks(i)).length, 6)
})

test('pemecah halaman Matador: tidak pernah > 5 baris, semua baris tetap ada', () => {
  const hit = n => n
  for (const n of [0, 1, 4, 5, 6, 11, 17, 40]) {
    const items = Array.from({ length: n }, (_, i) => ({ i, b: (i % 3) + 1 })), hal = K.pecahHalaman(items, x => x.b, 5)
    for (const h of hal) assert.ok(h.reduce((a, x) => a + x.b, 0) <= 5 && h.length >= 1)
    assert.equal(hal.flat().length, n)
  }
  assert.ok(K.pecahHalaman([{ b: 9 }], x => x.b, 5).length === 1)   // butir panjang dipagari 5, tetap satu halaman
  for (const aspek of ['16:9', '32:9']) {
    const [W, H] = M.ASPEK[aspek], c = konteks(isi(), { W, H }), hal = M.halaman(c), daftar = hal.filter(p => p.t === 'daftar')
    assert.ok(daftar.length > 8)
    for (const p of daftar) assert.ok(p.rows.reduce((a, r) => a + r.baris, 0) <= 5 && p.rows.length >= 1, p.judul)
    assert.ok(daftar.some(p => /\(1\/\d\)$/.test(p.judul)), 'judul berlanjut (1/n)')
    const rincian = daftar.filter(p => /^Karhutla, rincian/.test(p.judul)).flatMap(p => p.rows)
    assert.equal(rincian.length, 17, 'semua kejadian karhutla tetap ada')
  }
})

test('huruf Matador >= 28 pt (judul >= 44 pt) di 16:9 dan 32:9; angka utama sangat besar', () => {
  for (const aspek of ['16:9', '32:9']) {
    const [W, H] = M.ASPEK[aspek], c = konteks(isi(), { W, H }), deck = LB.deckMatador(c)
    assert.ok(deck.length >= 20, aspek + ' ' + deck.length)
    let terbesar = 0
    for (const s of deck) { const r = rekam(); s.gambar(r.k, c); assert.ok(r.teks.length, s.id); for (const x of r.teks) { if (!x.t.trim()) continue; assert.ok(x.s >= 28, `${aspek} ${s.id}: ${x.s} pt "${x.t}"`); terbesar = Math.max(terbesar, x.s) } }
    assert.ok(terbesar >= 100, 'angka utama besar')
    for (const s of deck.filter(s => !/^m\d+-(sampul|peta|terima)/.test(s.id))) { const r = rekam(); s.gambar(r.k, c); assert.ok(r.teks[0].s >= 44, `${s.id} judul ${r.teks[0].s}`) }
  }
  assert.ok(M.UKURAN.isi >= 28 && M.UKURAN.judul >= 44)
})

test('Matador membawa semua detail: tiap lokasi kejadian dan butir tindak muncul di teks halaman', () => {
  const i = isi(), c = konteks(i), semua = LB.deckMatador(c).map(s => { const r = rekam(); s.gambar(r.k, c); return r.teks.map(x => x.t).join(' ') }).join(' ')
  for (const x of i.kejadian) if (x.lokasi) assert.ok(semua.includes(x.lokasi), x.lokasi)
  for (const t of i.tindak.filter(t => t.judul)) assert.ok(semua.includes(t.judul))
  for (const t of i.perhatian_tambahan) assert.ok(semua.includes(t.judul))
  assert.ok(PS.W > 13 && M.ASPEK['32:9'][0] === 2 * M.ASPEK['16:9'][0])
})

test('isian contoh = data nyata laporan 20-21 Okt 2026: 18 kejadian, 12 provinsi, 6/8/4, 3 gunung api', () => {
  const i = isi(), ks = i.kejadian, per = f => ks.filter(f).length
  assert.equal(ks.length, 18); assert.equal(per(x => x.jenis === 'karhutla'), 17); assert.equal(per(x => x.jenis === 'gempabumi'), 1)
  assert.equal(new Set(ks.map(x => x.prov)).size, 12)
  assert.deepEqual([per(x => x.status === 'selesai'), per(x => x.status === 'berjalan'), per(x => x.status === 'belum')], [6, 8, 4])
  assert.equal(i.perhatian_tambahan.length, 3); assert.equal(i.laporan_masuk, 19)
  assert.match(i.penyaji, /Kristomei Sianturi/)
})
