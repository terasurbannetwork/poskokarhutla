// Gerbang deck "Penanganan dan Pengendalian Karhutla" dari SNAPSHOT (public/laporan_karhutla_slide.js) dan teks WA (public/laporan_karhutla_wa.js), dijalankan nyata di node tanpa DOM.
// Menagih: jumlah slide mengikuti data; angka slide 1 = snapshot (983,34 / 502,08 / 481,26 / 261 FS); bagian null TIDAK dikarang (dilewati beralasan atau ditulis "belum ada data");
// pengecualian "lanjut tanpa X" dan nomor ralat tercetak; watermark DRAF; teks WA berstruktur A/B/C/D/KESIMPULAN, angka hanya dari snapshot, tanpa " · ".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { teksWA } from '../../public/laporan_karhutla_wa.js'
import { snapshotKaya } from './fixtures/laporan-karhutla-kaya.mjs'

const baca = f => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')
const win = {}, ctx = { window: win, document: {}, Intl, Date, Math }
vm.createContext(ctx)
for (const f of ['paparan_slide', 'laporan_bnpb_slide', 'laporan_karhutla_slide']) vm.runInContext(baca(`public/${f}.js`), ctx, { filename: f })
const K = win.LaporanKarhutlaSlide
const SPARSE = JSON.parse(baca('tests/agen/fixtures/snapshot-karhutla-21okt.json'))   // snapshot nyata dummy 21 Okt: udara, OMC, kondisi, peralatan kosong; konsesi null

const rekam = () => { const teks = [], k = { teks: (x, y, w, h, r, o = {}) => teks.push((typeof r === 'string' ? [{ t: r }] : Array.isArray(r) ? r : [r]).map(p => p.t ?? p).join('')), kotak() {}, garis() {}, bulat() {}, gambar() {} }; return { k, teks } }
const ar = x => JSON.parse(JSON.stringify(x))   // array dari konteks vm berbeda realm: salin dulu sebelum deepEqual
const isiSlide = (d, i) => { const r = rekam(); d.slide[i].gambar(r.k, { no: i + 1, total: d.slide.length, aset: {} }); return r.teks.join(' | ') }
const semua = d => d.slide.map((_, i) => isiSlide(d, i))

test('deck dari snapshot dummy: 11 slide, angka slide 1 cocok, bagian null dilewati beralasan', () => {
  const d = K.deck(SPARSE), t = semua(d), s1 = t[0]
  assert.equal(d.slide.length, 11)
  assert.deepEqual(ar(d.slide.map(s => s.id)), ['utama', 'ringkasan', 'kompleks', 'lampiran', 'a1', 'a2', 'a4', 'a5', 'a8', 'b1', 'b5'])
  for (const x of ['261 titik api', '983,34', '502,08', '481,26', '261 FS', 'CUT OFF DATA', '21 Okt 2026, 07.00 WIB', 'Penanganan dan Pengendalian Karhutla per Tanggal 21 Oktober 2026']) assert.ok(s1.includes(x), `slide 1 memuat "${x}"`)
  assert.deepEqual(ar(d.dilewati.map(x => x.id)), ['a3', 'a6', 'a7', 'a9', 'a10', 'a11', 'b2', 'b3', 'b4'])
  for (const x of d.dilewati) assert.ok(x.alasan.length > 15, 'tiap lampiran yang dilewati punya alasan: ' + x.id)
  const lamp = t[3]; assert.ok(lamp.includes('dilewati') && lamp.includes('baru ada satu hari laporan'), 'daftar lampiran mencatat yang dilewati')
  assert.match(t[1], /belum ada data|Tidak ada sortie OMC|Belum ada data OMC/i, 'OMC kosong tidak dikarang')
  assert.ok(t[2].includes('belum ada data'), 'konsesi dan gambut null ditulis belum ada data')
  for (const [i, x] of t.entries()) assert.ok(!/undefined|NaN|\[object|null/.test(x), `slide ${d.slide[i].id} bersih dari undefined/NaN/null`)
})

test('tiga hari hanya satu: kolom hari lain NA, tidak mengarang angka kemarin', () => {
  const r = rekam(); const d = K.deck(SPARSE); const t = isiSlide(d, 0)
  assert.ok(t.includes('18 Okt') && t.includes('19 Okt') && t.includes('20 Okt'))
  assert.equal((t.match(/NA/g) || []).length >= 14, true, 'dua dari tiga kolom hari = NA')
  assert.ok(!r.teks.length)
})

test('deck snapshot terisi: 16 slide, a6 dan B2 sampai B4 dilewati, lampiran terisi dari data', () => {
  const s = snapshotKaya(), d = K.deck(s), t = semua(d)
  assert.equal(d.slide.length, 16)
  assert.deepEqual(ar(d.dilewati.map(x => x.id)), ['a6', 'b2', 'b3', 'b4'])
  const id = d.slide.map(x => x.id), por = i => t[id.indexOf(i)]
  assert.ok(por('utama').includes('7.950') && por('utama').includes('4.213') && por('utama').includes('2.083'), 'tiga hari dari snapshot sebelumnya')
  assert.ok(por('a3').includes('hotspot turun dari 10.932'), 'judul A3 dihitung dari angka')
  assert.ok(por('a4').includes('Kalimantan Tengah') && por('a4').includes('±321,35 ha') && por('a4').includes('±304,89 ha'), 'judul A4: sisa dan TNTP')
  assert.ok(por('a7').includes('Berbahaya') && por('a7').includes('Ketapang'), 'kondisi wilayah')
  assert.ok(por('a9').includes('PK-ALE') && por('a9').includes('Nihil') && por('a9').includes('kg Dry ice'), 'udara dan OMC')
  assert.ok(por('a10').includes('Tanggap darurat'), 'kedaruratan')
  assert.ok(por('a11').includes('Karanganyar') && por('a11').includes('NA'), 'luar prioritas, luas tak disebut = NA')
  assert.ok(por('b5').includes('Luasan kumulatif'), 'kumulatif tidak dijumlahkan dicetak')
  for (const [i, x] of t.entries()) assert.ok(!/undefined|NaN|\[object|null/.test(x), `slide ${id[i]} bersih`)
})

test('pengecualian dan ralat tercetak di slide; DRAF berwatermark', () => {
  const s = snapshotKaya({ pengecualian: [{ sumber: 'omc', alasan: 'OMC tidak beroperasi karena awan tertutup', data_terakhir: '2026-10-19' }], ralat: 1 })
  const d = K.deck(s), t = semua(d), id = d.slide.map(x => x.id)
  assert.ok(t[0].includes('OMC: ') && t[0].includes('data terakhir 19 Oktober 2026') && t[0].includes('awan tertutup') && t[0].includes('Ralat-1'), 'slide 1 mencetak pengecualian dan ralat')
  assert.ok(t.every(x => x.includes('Ralat-1')), 'footer tiap slide menyebut Ralat-1')
  assert.ok(t[id.indexOf('b5')].includes('Dikunci dengan pengecualian'))
  assert.ok(!semua(K.deck(snapshotKaya())).some(x => x.includes('DRAF')), 'terkunci: tanpa DRAF')
  const dr = semua(K.deck(snapshotKaya(), { draf: true })); assert.ok(dr.every(x => x.includes('DRAF')), 'draf: semua slide berwatermark')
})

test('slide 1: catatan pengecualian selalu di dalam kanvas dan tidak menimpa footer, banyak pengecualian pindah ke slide lanjutan', () => {
  const kotakan = (d, i) => { const o = []; const k = { teks: (x, y, w, h) => o.push({ x, y, w, h }), kotak: (x, y, w, h) => o.push({ x, y, w, h }), garis() {}, bulat() {}, gambar() {} }; d.slide[i].gambar(k, { no: i + 1, total: d.slide.length, aset: {} }); return o }
  const lolos = (d, i) => kotakan(d, i).filter(o => o.y < 7.0 && o.h < 7).every(o => o.y + o.h <= 7.04 + 1e-6 && o.x + o.w <= 13.34)   // footer mulai y 7,04; sisanya harus di atasnya (latar penuh kanvas dikecualikan)
  const alasan = 'sumber tidak mengirim karena gangguan jaringan di lapangan sehingga angka terakhir yang diverifikasi dipakai ulang oleh tim verifikasi pusat'
  const peng = ['omc', 'udara', 'kondisi', 'peralatan', 'hambatan'].map(x => ({ sumber: x, label: x.toUpperCase(), alasan, data_terakhir: '2026-10-19' }))
  const ringan = K.deck(snapshotKaya({ pengecualian: peng.slice(0, 1) })), berat = K.deck(snapshotKaya({ pengecualian: peng, ralat: 2 }))
  for (const d of [K.deck(SPARSE), ringan, berat]) assert.ok(lolos(d, 0), 'slide 1 tidak menimpa footer')
  assert.ok(!ar(ringan.slide.map(x => x.id)).includes('utama2') && !ar(ringan.dilewati.map(x => x.id)).includes('utama2'), 'satu pengecualian muat di slide 1')
  const id = ar(berat.slide.map(x => x.id)); assert.equal(id[1], 'utama2', 'pengecualian banyak pindah ke slide lanjutan tepat sesudah slide 1')
  const t1 = isiSlide(berat, 0), t2 = isiSlide(berat, 1)
  assert.ok(t2.includes('data terakhir 19 Oktober 2026') && t2.includes('Ralat-2') && t2.includes('6 catatan') && lolos(berat, 1), 'slide lanjutan memuat semua catatan dan muat')
  assert.ok(t1.includes('lihat slide berikutnya'), 'slide 1 menunjuk ke slide lanjutan')
})

test('sumber modul tanpa pemisah " · " dan tanpa em dash', () => {
  for (const f of ['public/laporan_karhutla_slide.js', 'public/laporan_karhutla_deck.js', 'public/laporan_karhutla_wa.js']) { const s = baca(f); assert.ok(!/ · /.test(s), f); assert.ok(!/—/.test(s), f + ' em dash') }
})

const BAGIAN = ['***A. SITUASI UMUM***', '**1. Hotspot, Firespot dan Luas Kebakaran**', '**2. Kondisi wilayah**', '***B. UPAYA PEMADAMAN DAN HASIL YANG DICAPAI***', '**1. Operasi Darat**', '*a. Kekuatan personel*', '*b. Peralatan*', '*c. Kegiatan pemadaman*', '**2. Operasi Udara**',
  '***C. HAMBATAN DAN CARA MENGATASI***', '***D. PENANGANAN KARHUTLA DI LUAR 6 PROVINSI PRIORITAS***', '=============================================================\n\n*KESIMPULAN*', '*Dmmp*']
test('teks WA: struktur A/B/C/D/KESIMPULAN berurutan, angka dari snapshot, tanpa pemisah titik', () => {
  for (const [nama, s] of [['dummy', SPARSE], ['terisi', snapshotKaya()]]) {
    const w = teksWA(s), L = w.laporan_karhutla; let pos = -1
    for (const b of BAGIAN) { const i = L.indexOf(b); assert.ok(i > pos, `${nama}: bagian "${b}" ada dan berurutan`); pos = i }
    for (const x of ['*4.129 hotspot (HS)*', '*261 FS*', '±983,34 ha', '*±502,08 ha pada 173 FS telah padam*', '*±481,26 ha pada 88 FS belum padam*', '*±71.878 personel*', 'Kalimantan Tengah: 2.083 HS, target ±431,66 ha pada 98 FS', 'Di TNTP, target ±356,89 ha pada 52 FS',
      'hasil verifikasi dan rekap penanganan mencatat *0 FS, 0 ha terbakar, dan 0 ha belum padam*', 'Sampai hari ini, Rabu, 21 Oktober 2026', 'Luas area belum padam terbesar berada di *Kalimantan Tengah*, termasuk TNTP']) assert.ok(L.includes(x), `${nama}: "${x}"`)
    for (const [k, v] of Object.entries(w)) { assert.ok(!/ · /.test(v), k); assert.ok(!/undefined|NaN|\[object|null/.test(v), `${nama}/${k} bersih`); assert.ok(!/OMC menghasilkan hujan/i.test(v), k) }
    assert.ok(L.startsWith('*LAPORAN KARHUTLA*\n_21 Oktober 2026_\n\n***A.') && L.endsWith('\n\n*Dmmp*'), `${nama}: kepala dan penutup persis contoh`)
    assert.deepEqual(Object.keys(w), ['laporan_karhutla', 'gelar_pesawat', 'rekap_dry_ice', 'hasil_hujan_omc'])
  }
})

test('teks WA terisi: gelar armada, rekap OMC, hujan dilaporkan setelah OMC (bukan sebab-akibat), dan data kosong tidak dikarang', () => {
  const w = teksWA(snapshotKaya())
  assert.ok(w.gelar_pesawat.includes('*TOTAL KESELURUHAN: 7 UNIT*') && w.gelar_pesawat.includes('* BNPB: 4 Unit') && w.gelar_pesawat.includes('* Helikopter Water Bombing: *4 Unit*') && w.gelar_pesawat.includes('PK-FPU tidak terbang (visibilitas)'))
  assert.ok(w.rekap_dry_ice.includes('1.300 kg') && w.rekap_dry_ice.includes('Total sortie: *3 sortie*') && w.rekap_dry_ice.includes('PM2,5 sebelum 1.907,00 dan sesudah 1.200,00'))
  assert.ok(!/turun \d+%/.test(w.rekap_dry_ice), 'tanpa persen penurunan yang tak berpembanding')
  assert.ok(w.hasil_hujan_omc.includes('Hujan dilaporkan setelah OMC di Ketapang') && w.hasil_hujan_omc.includes('belum membuktikan hubungan sebab-akibat'))
  assert.ok(w.laporan_karhutla.includes('Hujan dilaporkan setelah OMC di Ketapang dan Palangka Raya. Kesesuaian lokasi hujan'))
  assert.ok(w.laporan_karhutla.includes('VN-8424:') && w.laporan_karhutla.includes('Rincian lokasi memuat luasan kumulatif'))
  const k = teksWA(SPARSE)
  assert.ok(k.laporan_karhutla.includes('belum ada data peralatan') && k.gelar_pesawat.includes('belum ada data armada udara') && k.hasil_hujan_omc.includes('Tidak ada sortie OMC'))
  const lt = teksWA(snapshotKaya({ pengecualian: [{ sumber: 'omc', alasan: 'OMC tidak beroperasi karena awan tertutup', data_terakhir: '2026-10-19' }], ralat: 1 }))
  assert.ok(lt.laporan_karhutla.includes('_Catatan: OMC, data terakhir 19 Okt 2026 (OMC tidak beroperasi karena awan tertutup)_') && lt.laporan_karhutla.includes('Ralat-1'))
})
