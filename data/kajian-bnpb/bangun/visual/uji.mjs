// Uji diri bangun/visual: node uji.mjs [--tanpa-png] [--fixture=DIR]. Tanpa Chromium; berhenti di assert pertama.
// Fungsi murni (warna, huruf, angka, kelas, penempatan) + semua spek contoh lolos gerbang + invarian data dibaca dari paket
// (bukan angka ketikan) + fixture negatif tiap gerbang berupa SVG atau spek nyata yang dimutasi + PNG keluaran 300 dpi.
//   --tanpa-png    lewati pemeriksaan PNG (keluaran/ belum dirender)
//   --fixture=DIR  tulis fixture bersih dan negatif (SVG + manifest) ke DIR untuk qa/uji.py, beserta DIR/harap.json
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {T, V, warna, lebar, adaGlif, fmt, fmtSig, sisaTerbesar, kuantil, periksa, tumpang, muat} from './dasar.mjs';
import {kelasDari, aturKelas, labelTanpaData, tempatkan, geser, proyeksi} from './peta.mjs';
import {GLIF, KONSEP, glif} from './ikon.mjs';
import {bangun} from './render.mjs';

const DIR = import.meta.dirname, baca = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const arg = process.argv.slice(2), keFixture = arg.find(a => a.startsWith('--fixture='))?.slice(10);

// 1. dasar
assert.equal(warna('navy'), '#051C2C');
assert.equal(warna('skala.air.4'), '#2F86D1');
assert.equal(warna('tint.sorot-baris.pita'), '#FDF1E8');
assert.throws(() => warna('#051C2C'), /nama token/);
assert.throws(() => warna('skala.irbi.1'), /tidak dikenal/);
assert.equal(fmt(1234.56, 1), '1.234,6');
assert.equal(fmt(-5), '-5');
assert.deepEqual([1333.3, 533, 5.0962, 90, 1203.8].map(v => fmtSig(v)), ['1.300', '530', '5,1', '90', '1.200'], 'estimasi model 2 angka bermakna (C4)');
assert.deepEqual(sisaTerbesar([2386.5, 973, 89, 23, 76.5]), [2387, 973, 89, 23, 76], 'sisa terbesar: jumlah 3.548 utuh');
assert.equal(lebar('0', 2048), 1150, 'lebar digit Roboto Regular 1150/2048 em (hmtx)');
assert.ok(lebar('IRBI', 8, 700) > lebar('IRBI', 8, 400), 'Bold lebih lebar dari Regular');
assert.ok(adaGlif('–') && adaGlif('≤') && adaGlif('³') && adaGlif('≥'), 'en dash, kurang/lebih-sama, pangkat tiga ada di Roboto');
assert.ok(!adaGlif('▲') && !adaGlif('→'), 'segitiga dan panah karakter tidak ada di Roboto (D-23)');
assert.equal(kuantil([1, 2, 3, 4], 0.5), 2.5);
assert.deepEqual(muat({berkas: 'data/kajian-bnpb/data/irbi/irbi_kab_2025.csv', saring: {prov_kode: '34'}, kelompok: 'prov_kode', ringkas: {n: 'n'}}), [{prov_kode: '34', n: 5}]);
assert.throws(() => muat({berkas: 'data/kajian-bnpb/data/irbi/irbi_kab_2025.csv', saring: {kolom_lama: '1'}}), /kolom "kolom_lama" tidak ada/, 'kolom saring yang berganti nama harus gagal keras');
assert.throws(() => muat({berkas: 'data/kajian-bnpb/data/irbi/irbi_kab_2025.csv', saring: {prov_kode: '99'}}), /tidak ada baris/, 'saring tanpa hasil harus gagal keras');
for (const [mode, tip] of Object.entries(V.tipografi))
  for (const [n, g] of Object.entries(tip)) if (g.ukuran_pt) assert.ok(g.ukuran_pt >= tip.batas_bawah_pt, `visual.tipografi.${mode}.${n} ${g.ukuran_pt} pt < ${tip.batas_bawah_pt} pt`);
const [ra, rb] = T.objek.ikon_rasio_lingkaran;
assert.ok(V.ikon.rasio >= ra && V.ikon.rasio <= rb, `rasio ikon ${V.ikon.rasio} di luar ${ra} sampai ${rb} (PEDOMAN B5.14)`);
for (const k of ['warna_batang_lama', 'warna_lainnya']) assert.ok(!/^skala\./.test(T.grafik[k]), `grafik.${k} tidak boleh dari ramp skala (B1.8)`);

// 2. kelas: batas atas inklusif; IRBI wajib ramp api; kelas per bahaya wajib berumus; kelas resmi dari kolom data
assert.equal(kelasDari(144, [14.67, 144]), 1);
assert.equal(kelasDari(144.01, [14.67, 144]), 2);
const resmi = aturKelas({skala: 'irbi', kolom: 'kelas_total'}, ['Sedang', 'Tinggi', 'Sedang', null]);
assert.deepEqual(resmi.label, ['Sedang', 'Tinggi'], 'kelas resmi hanya yang ada di data (BNPB tidak memakai Rendah untuk kab/kota)');
assert.deepEqual(resmi.warna, ['skala.api.3', 'skala.api.5'], 'T8: Sedang dan Tinggi = ramp api kelas 3 dan 5');
assert.equal(resmi.judul, 'Kelas IRBI BNPB');
assert.throws(() => aturKelas({skala: 'irbi', batas: [14.67, 144]}, []), /kolom data/, 'ambang IRBI ketikan ditolak');
assert.throws(() => aturKelas({skala: 'irbi', kolom: 'k', judul: 'Kelas IRBI 2024'}, ['Sedang']), /butuh alasan/);
assert.throws(() => aturKelas({ramp: 'air', kuantil: 5}, [1, 2, 3, 4, 5, 6], 'data/irbi/irbi_kab.csv'), /wajib ramp api/, 'IRBI dengan ramp air ditolak');
assert.throws(() => aturKelas({ramp: 'api', batas: [12, 16, 20, 24]}, [], 'data/irbi/irbi_kab.csv'), /tanpa rumus/, 'batas per bahaya IRBI tanpa rumus ditolak (C6.3)');
const q = aturKelas({ramp: 'api', kuantil: 5, desimal: 1}, Array.from({length: 100}, (_, i) => i + 1), 'irbi.csv');
assert.equal(q.batas.length, 4);
assert.match(q.rumus, /kuintil dari 100 nilai/);
assert.deepEqual(aturKelas({ramp: 'netral', batas: [12, 16, 20, 24]}, []).label, ['≤ 12', '12–16', '16–20', '20–24', '> 24']);
assert.throws(() => aturKelas({ramp: 'netral', batas: [1, 2, 3, 4, 5, 6]}, []), /tidak cocok/);
assert.throws(() => aturKelas({ramp: 'ungu', batas: [1, 2]}, []), /tidak ada/);
assert.throws(() => labelTanpaData({tanpa_data_label: 'Tidak dinilai'}), /Belum terdata/);

// 3. penempatan label dan simbol
const area = {x: 0, y: 0, w: 300, h: 200};
const enam = Array.from({length: 6}, (_, i) => ({id: i, ax: 130 + 8 * i, ay: 100 + (i % 2) * 5, w: 50, h: 12, r0: 0}));   // gugus padat (pola DKI, Banten, Jabar)
const t6 = tempatkan(enam, [], area);
assert.equal(t6.lewat.length, 0, 'enam label bergugus padat harus terpasang');
assert.equal(tumpang(t6.pasang.map(p => ({...p, jenis: 'label', grup: p.l.id}))).length, 0, 'label gugus tidak beririsan');
assert.ok(t6.pasang.filter(p => p.pemandu).length >= 4, 'label yang digeser keluar jangkar memakai garis pemandu');
const sama = tempatkan(Array.from({length: 8}, (_, i) => ({id: i, ax: 150, ay: 100, w: 50, h: 12, r0: 0})), [], area);
assert.equal(tumpang(sama.pasang.map(p => ({...p, jenis: 'label', grup: p.l.id}))).length, 0, 'jangkar kembar: yang terpasang tidak beririsan');
assert.equal(sama.pasang.length + sama.lewat.length, 8, 'jangkar kembar: yang tidak muat dilaporkan');
const tr = tempatkan([{id: 'a', ax: 150, ay: 100, w: 50, h: 12, r0: 0}], [{x: 100, y: 80, w: 100, h: 40}], area);
assert.ok(!tumpang([{...tr.pasang[0], jenis: 'label'}, {x: 100, y: 80, w: 100, h: 40, jenis: 'simbol'}]).length, 'rintang dihormati');
assert.deepEqual(tempatkan([{id: 'b', ax: 5, ay: 5, w: 400, h: 12, r0: 0}], [], area).lewat, ['b'], 'label yang tidak muat dilaporkan, tidak dipaksa');
const sim = [0, 1, 2].map(() => ({x: 50, y: 50, s: 5}));
geser(sim);
assert.equal(tumpang(sim.map((s, i) => ({x: s.x - s.s, y: s.y - s.s, w: 2 * s.s, h: 2 * s.s, jenis: 'simbol', grup: i}))).length, 0, 'simbol sejangkar digeser sampai lepas');
assert.equal(tumpang([{x: 0, y: 0, w: 10, h: 10, jenis: 'label'}, {x: 5, y: 5, w: 10, h: 10, jenis: 'label'}]).length, 1, 'detektor irisan');
const pr = proyeksi([105, -9, 115, -5], 0, 0, 400, null);
assert.ok(Math.abs(pr.f([115, -7])[0] - 400) < 1e-9 && Math.abs(pr.f([105, -9])[1] - pr.h) < 1e-9, 'proyeksi memenuhi lebar');

// 4. ikon: tiap konsep punya glif dari registri tema.json glif atau deck harian; Lucide sama dengan paketnya bila LUCIDE_DIR diset
for (const n of KONSEP) assert.ok(glif(n), n);
assert.ok(Object.keys(GLIF).filter(k => k.startsWith('deck:')).length >= 9, 'glif deck harian tidak terbaca');
for (const id of new Set(KONSEP.map(n => T.ikon[n]).filter(v => !v.startsWith('deck:')))) assert.ok(T.glif[id], `${id} tidak ada di tema.json glif (D-25)`);
assert.equal(new Set(KONSEP.map(n => T.ikon[n])).size, KONSEP.length, 'satu konsep satu glif (D-25)');
let lucide = 'lewat (LUCIDE_DIR tidak diset)';
if (process.env.LUCIDE_DIR) {
  const node = n => eval(`(${fs.readFileSync(path.join(process.env.LUCIDE_DIR, `${n}.mjs`), 'utf8').match(/const __iconData = (\{[\s\S]*?\n\});/)[1]})`).node
    .map(([tag, a]) => `<${tag} ${Object.entries(a).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  const ids = Object.keys(T.glif).filter(k => k.startsWith('lucide:'));
  for (const id of ids) assert.equal(T.glif[id], node(id.slice(7)), `${id} berbeda dari paket lucide di LUCIDE_DIR`);
  lucide = `${ids.length} glif sama dengan paket`;
}

// 5. semua spek contoh lolos gerbang, plus invarian data dibaca dari paket
const hasil = {};
for (const f of fs.readdirSync(path.join(DIR, 'spek')).filter(f => f.endsWith('.json')).sort())
  for (const s of [].concat(baca(`spek/${f}`))) {
    const out = bangun(s);
    assert.deepEqual(out.salah, [], `${s.nama}: ${out.salah.join('; ')}`);
    hasil[s.nama] = {...out, spek: s};
  }
const man = n => hasil[n].manifest, kls = n => man(n).kelas, total = k => k.jumlah.reduce((a, b) => a + b, 0) + k.tanpa_data;
assert.equal(total(kls('peta-irbi-total-2024-nasional')), 514, 'peta nasional harus memuat 514 kab/kota');
assert.equal(total(kls('peta-irbi-banjir-2024-jawa')), 119, 'peta Jawa harus memuat 119 kab/kota');
const hk = muat({berkas: 'data/kajian-bnpb/data/irbi/irbi_hitung_kelas.csv', saring: {tingkat: 'kab', tahun: '2024'}})[0], kn = kls('peta-irbi-total-2024-nasional');
assert.deepEqual(Object.fromEntries(kn.label.map((l, i) => [l, kn.jumlah[i]])), {Sedang: +hk.n_sedang, Tinggi: +hk.n_tinggi}, 'cacah kelas peta = irbi_hitung_kelas.csv 2024');
assert.ok(!kn.label.includes('Rendah'), 'kelas Rendah tidak dipakai BNPB untuk kab/kota');
assert.match(man('peta-irbi-total-2024-nasional').sumber, new RegExp(hk.ambang.replace(/[>]/g, '\\$&')), 'ambang di Sumber disuntik dari irbi_hitung_kelas.csv');
const agr = muat({berkas: 'data/kajian-bnpb/data/irbi/irbi_agregat_provinsi.csv', saring: {tahun: '2024'}}).sort((a, b) => b.total_sederhana - a.total_sederhana).slice(0, 10).map(r => r.prov_kode);
assert.deepEqual(man('peta-irbi-total-2024-nasional').provinsi_teratas, agr, 'label provinsi = sepuluh rerata tertinggi dari agregat');
const jawa = man('peta-irbi-banjir-2024-jawa');
assert.equal(jawa.kelas.ramp, 'api', 'IRBI banjir memakai ramp api (T8)');
assert.match(jawa.kelas.rumus, /kuintil/);
assert.equal(jawa.unsur_peta.skala_kena_darat, 0, `skala batang peta Jawa menyentuh daratan di pojok ${jawa.unsur_peta.skala_pojok}`);
assert.ok(jawa.unsur_peta.inset && jawa.simbol > 0, 'peta Jawa berinset dan bendungan tergambar');
assert.ok(hasil['peta-irbi-banjir-2024-jawa'].svg.includes(jawa.unsur_peta.catatan), 'catatan batas tidak resmi tertulis di peta');
for (const b of man('rentang-korban-skenario-nasional').baris_rentang) {
  if (b.tercatat > b.tinggi) assert.ok(b.geser && b.tampil[0] === b.tercatat && b.tampil[1] === null, `${b.id}: tercatat di atas batas tinggi harus jadi batas bawah skenario`);
  assert.ok(b.tampil[1] === null || b.tampil[1] >= b.tercatat, `${b.id}: batas atas ${b.tampil[1]} di bawah tercatat ${b.tercatat}`);
  assert.equal(b.median, b.rendah, 'titik median = ujung rendah (rendah = median tahunan)');
}
for (const c of man('bertumpuk-dibi-kejadian-2020-2024').jumlah_per_batang) assert.equal(c.segmen.reduce((a, b) => a + b, 0), c.total, `${c.x}: segmen tidak berjumlah total`);
assert.equal(man('titik-irbi-bahaya-jawa-2024').sel.length, 6 * 9, 'matriks titik memuat 6 provinsi x 9 bahaya');
assert.equal(man('matriks-banjir-longsor-jawa-2024').butir, 6, 'matriks Jawa memuat 6 provinsi');

// 6. fixture negatif: SVG keluaran atau spek contoh yang dimutasi, lalu dibangun ulang; gerbang harus menolak dengan kodenya
const B = hasil['batang-irbi-nasional-2015-2024'], svgB = B.svg, manB = B.manifest;
const ubah = (nama, f) => { const s = structuredClone(hasil[nama].spek); f(s); return s; };
const lewatSvg = svg => ({svg, man: manB});
const lewatSpek = s => { const o = bangun(s); return {svg: o.svg, man: o.manifest}; };
const FIX = [
  // nama, kode, pembangun, ikut qa (kode gerbang qa/periksa.py)
  ['d9-hex-terlarang', 'D-9', () => lewatSvg(svgB.replace('#051C2C', '#D9650B'))],
  ['d1-em-dash', 'D-1', () => lewatSvg(svgB.replace('>2015<', '>2015 — awal<'))],
  ['d2-titik-tengah', 'D-2', () => lewatSvg(svgB.replace('>2016<', '>2016 · x<'))],
  ['d3-emoji', 'D-3', () => lewatSvg(svgB.replace('>2018<', '>2018 \u{1F525}<'))],
  ['d23-segitiga', 'D-23', () => lewatSvg(svgB.replace('>2017<', '>▲ 2017<'))],
  ['d4-atribut-arial', 'D-4', () => lewatSvg(svgB.replace('font-family="Roboto"', 'font-family="Arial"'))],
  ['d4-style-arial', 'D-4', () => lewatSvg(svgB.replace('<text x', '<text style="font-family:Arial" x'))],
  ['d5-teks-5pt', 'D-5', () => lewatSvg(svgB.replace('</svg>', '<text x="40" y="20" font-size="5">catatan kecil</text></svg>'))],
  ['d8-teks-tumpuk', 'D-8', () => lewatSvg(svgB.replace('</svg>', '<text x="120" y="40" font-size="9">tumpuk satu</text><text x="126" y="42" font-size="9">tumpuk dua</text></svg>')), 'D-8'],
  ['d8-tanpa-inset', 'D-8', () => lewatSpek(ubah('peta-irbi-banjir-2024-jawa', s => { s.inset = false; })), 'D-8'],
  ['d8-label-tidak-muat', 'D-8', () => lewatSpek(ubah('peta-irbi-total-2024-nasional', s => { s.ukuran = 'tiga-kolom'; s.label = {provinsi: true}; }))],
  ['d21-legenda-hilang', 'D-21', () => lewatSvg(svgB.replace(/<g class="legenda"[\s\S]*?<\/g>/, '')), 'D-21'],
  ['d21-legenda-palsu', 'D-21', () => lewatSvg(svgB.replace(/(<g class="legenda" data-warna=")[^"]*"/, '$1#3F5F80"'))],
  ['d24-hex-tanpa-peran', 'D-24', () => lewatSvg(svgB.replace(/(<path d="M[^"]*" fill=")#051C2C"/, '$1#3F5F80"'))],
  ['d24-hex-dua-peran', 'D-24', () => lewatSpek(ubah('peta-irbi-banjir-2024-jawa', s => { s.titik[0].warna = 'teks-3'; })), 'D-24'],
  ['d28-pesan-jenis', 'D-28', () => lewatSpek(ubah('batang-irbi-nasional-2015-2024', s => { s.pesan = 'G19'; })), 'D-28'],
  ['d28-g2-sepuluh-periode', 'D-28', () => lewatSpek(ubah('garis-irbi-tren-pita', s => { s.pesan = 'G2'; delete s.alasan; }))],
  ['d28-tanpa-besaran', 'D-28', () => lewatSpek(ubah('peta-irbi-total-2024-nasional', s => { delete s.besaran; })), 'D-28'],
  ['d28-g25', 'D-28', () => lewatSpek(ubah('batang-irbi-nasional-2015-2024', s => { s.pesan = 'G25'; }))],
  ['d28-tanpa-alasan', 'D-28', () => lewatSpek(ubah('matriks-banjir-longsor-jawa-2024', s => { delete s.alasan; }))],
  ['d31-keterangan-tanpa-tahun', 'D-31', () => lewatSpek(ubah('batang-irbi-nasional-2015-2024', s => { s.keterangan = 'IRBI nasional per tahun'; }))],
  ['d32-catatan-panjang', 'D-32', () => lewatSpek(ubah('batang-irbi-nasional-2015-2024', s => { s.catatan = 'Nilai kab/kota yang belum lengkap pada salah satu tahun tidak dimasukkan ke rerata nasional supaya perbandingan antartahun tetap setara.'; }))],
  ['p10-rentang-di-bawah-tercatat', 'P10', () => lewatSpek(ubah('rentang-korban-skenario-nasional', s => { s.tercatat_batas_bawah = false; }))],
  ['b11-kontras-segmen', 'B1.1', () => lewatSpek(ubah('bertumpuk-dibi-kejadian-2020-2024', s => { s.seri[0].warna = 'slate'; }))],
  ['b510-nilai-tak-tertulis', 'B5.10', () => lewatSpek(ubah('bertumpuk-dibi-kejadian-2020-2024', s => { s.celah_rasio = 0.03; }))],
];
const KODE_QA = ['D-8', 'D-21', 'D-24', 'D-28'];
const harap = {};
for (const [nama, kode, f, qa] of FIX) {
  const {svg, man: m} = f(), salah = periksa(svg, m);
  assert.ok(salah.some(x => x.startsWith(kode + ' ')), `fixture ${nama}: gerbang ${kode} tidak menolak, gerbang rusak (${salah.join('; ') || 'lolos'})`);
  if (qa) {
    const kena = KODE_QA.filter(k => salah.some(x => x.startsWith(k + ' ')));
    assert.deepEqual(kena, [qa], `fixture qa ${nama}: harap ditolak tepat ${qa}, nyatanya ${kena}`);
    if (keFixture) { fs.mkdirSync(path.join(keFixture, nama), {recursive: true}); fs.writeFileSync(path.join(keFixture, nama, `${nama}.svg`), svg); fs.writeFileSync(path.join(keFixture, nama, `${nama}.json`), JSON.stringify(m)); harap[nama] = [qa]; }
  }
}
assert.throws(() => bangun({jenis: 'pai', nama: 'x'}), /tidak dikenal/);
const sederet = n => Array.from({length: n}, (_, i) => ({t: String(1990 + i), v: i + 1}));
assert.throws(() => bangun({jenis: 'batang', nama: 'x', pesan: 'G1', seri_label: 'x', data: {sumber: sederet(30), x: 't', y: 'v'}}), /24/);
assert.throws(() => bangun({jenis: 'bertumpuk', nama: 'x', pesan: 'G9', data: {sumber: [], x: 't', seri: 's', nilai: 'v'},
  seri: 'abcdef'.split('').map(id => ({id, label: id, warna: 'navy'}))}), /segmen/);
assert.throws(() => bangun({jenis: 'garis', nama: 'x', pesan: 'G2', seri: [{label: 'a', warna: 'navy', data: {sumber: sederet(5), x: 't', y: 'v'}}],
  anotasi: ['1990', '1991', '1992', '1993'].map(x => ({x, teks: x}))}), /anotasi/);
assert.throws(() => bangun({jenis: 'batang', nama: 'x', pesan: 'G1', data: {sumber: sederet(3), x: 't', y: 'v'}}), /legenda/);
assert.throws(() => bangun(ubah('bertumpuk-dibi-kejadian-2020-2024', s => { s.seri[4].warna = 'skala.netral.2'; })), /ramp skala/, 'seri dari ramp skala ditolak (B1.8)');
assert.throws(() => bangun(ubah('garis-irbi-tren-pita', s => { delete s.kepala.seri; })), /kepala.seri/, 'kepala neto dua seri wajib menyebut serinya');
assert.throws(() => bangun(ubah('peta-irbi-total-2024-nasional', s => { s.koroplet.judul_legenda = 'Kelas IRBI 2024'; })), /alasan_legenda/);
assert.throws(() => bangun(ubah('peta-irbi-banjir-2024-jawa', s => { s.koroplet.tanpa_data_label = 'Tidak dinilai'; })), /Belum terdata/);
// pil Estimasi model (garis oranye) di gambar yang menampilkan keluarga api: garis pil netral, #D9600B tetap satu arti (B1.8)
const api = bangun({nama: 'x', jenis: 'rentang', pesan: 'G12', keterangan: 'Uji, 2015', satuan: 'jiwa', pil: {keyakinan: 'estimasi-model'},
  data: {sumber: [{k: 'a', lo: 1, hi: 5}, {k: 'b', lo: 2, hi: 9}], kategori: 'k', rendah: 'lo', tinggi: 'hi', warna_kategori: {a: 'kategori.api', b: 'kategori.basah'},
    legenda_warna: {'kategori.api': 'api', 'kategori.basah': 'basah'}}});
assert.deepEqual(api.salah, [], api.salah.join('; '));
assert.ok(api.manifest.pil_garis_netral && !api.manifest.hex['#D9600B'].includes('pil'), 'garis pil Estimasi model netral bila keluarga api tampil');
if (keFixture) {   // fixture bersih untuk qa: semua spek contoh, harus lolos keempat gerbang qa
  fs.mkdirSync(path.join(keFixture, 'bersih'), {recursive: true});
  for (const [nama, o] of Object.entries(hasil)) { fs.writeFileSync(path.join(keFixture, 'bersih', `${nama}.svg`), o.svg); fs.writeFileSync(path.join(keFixture, 'bersih', `${nama}.json`), JSON.stringify(o.manifest)); }
  fs.writeFileSync(path.join(keFixture, 'harap.json'), JSON.stringify(harap, null, 1));
}

// 7. PNG keluaran: lebar = ukuran cetak pada 300 dpi, pHYs 300 dpi; PNG yang belum ada = gagal (render dulu, atau --tanpa-png)
const KEL = path.join(DIR, 'keluaran');
let png = 0;
if (!arg.includes('--tanpa-png')) for (const [nama, out] of Object.entries(hasil)) {
  const p = path.join(KEL, `${nama}.png`);
  assert.ok(fs.existsSync(p), `${p} belum ada: jalankan node render.mjs (butuh PLAYWRIGHT, lihat README) atau uji dengan --tanpa-png`);
  const b = fs.readFileSync(p), w = b.readUInt32BE(16), harapW = out.manifest.ukuran_pt[0] / 72 * V.dpi;
  assert.ok(Math.abs(w - harapW) <= 4, `${nama}.png lebar ${w} px, harap ${harapW.toFixed(0)} px (${V.dpi} dpi)`);
  const i = b.indexOf('pHYs');
  assert.ok(i > 0 && Math.round(b.readUInt32BE(i + 4) * 0.0254) === V.dpi, `${nama}.png tanpa pHYs ${V.dpi} dpi`);
  png++;
}
console.log(`uji visual hijau: ${Object.keys(hasil).length} spek lolos gerbang, ${FIX.length} fixture negatif (SVG atau spek) ditolak`
  + `${keFixture ? `, ${Object.keys(harap).length} fixture qa ditulis ke ${keFixture}` : ''}, glif Lucide: ${lucide}, `
  + (arg.includes('--tanpa-png') ? 'PNG dilewati (--tanpa-png)' : `${png} PNG berukuran cetak ${V.dpi} dpi`));
