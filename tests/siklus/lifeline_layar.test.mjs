// LF-06: model murni kartu Status layanan. Jalan: node --test tests/siklus/lifeline_layar.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
runInThisContext(readFileSync('public/inti/format.js', 'utf8') + ';globalThis.fmt = fmt;');   // fmt klasik, seperti di peramban
const {modelSel, buktiDipilih, teksIsyarat, WARNA, LAYANAN} = await import('../../public/siklus/lifeline.js');

test('warna server -> token dan huruf; tak dikenal jatuh ke abu', () => {
  assert.deepEqual(['hijau', 'kuning', 'merah', 'abu'].map(w => modelSel({warna: w}).w), ['ok', 'warn', 'bad', 'line']);
  assert.deepEqual(['hijau', 'kuning', 'merah', 'abu'].map(w => modelSel({warna: w}).huruf), ['B', 'T', 'L', '?']);
  assert.equal(modelSel({warna: 'ungu'}).warna, 'abu');
  assert.equal(modelSel(undefined).huruf, '?');
  assert.equal(LAYANAN.length, 8);
});
test('jam basi dan titik beda hanya bila perlu', () => {
  assert.equal(modelSel({warna: 'hijau', basi: true}).basi, true);
  assert.equal(modelSel({warna: 'hijau'}).basi, false);
  assert.equal(modelSel({warna: 'hijau', usulan: {warna: 'hijau'}}).beda, false);
  assert.equal(modelSel({warna: 'abu', usulan: {warna: 'merah'}}).beda, true);
  assert.equal(modelSel({warna: 'abu', usulan: null}).beda, false);
});
test('label sel memuat nama, warna, basi, usulan (pembaca layar)', () => {
  const l = modelSel({warna: 'merah', basi: true, usulan: {warna: 'kuning'}}, 'Cilacap', 'Listrik').label;
  assert.match(l, /Cilacap Listrik: Lumpuh/); assert.match(l, /24 jam/); assert.match(l, /usulan mesin Terganggu/);
});
test('bukti terpilih hanya kunci yang diminta server', () => {
  const isy = [{sumber: 'logbook', kode: 'kendala:listrik', jumlah: 2, waktu: 5, label: 'x'}, {sumber: 'lapor_warga', kode: 'listrik:padam', jumlah: 6, waktu: 7, label: 'x'}];
  assert.deepEqual(buktiDipilih(isy, new Set([1])), [{sumber: 'lapor_warga', kode: 'listrik:padam', jumlah: 6, waktu: 7}]);
  assert.deepEqual(buktiDipilih(null, new Set()), []);
  assert.match(teksIsyarat(isy[0]), /Logbook Pusdalops, kendala listrik, 2/);
});
test('tanpa titik tengah dan tanpa huruf kapital semua di teks tampil', () => {
  for (const [, , n] of Object.values(WARNA)) assert.doesNotMatch(n, /·|^[A-Z ]+$/);
});
test('konteks IODA: per provinsi, tanpa data = tidak ada data, tanpa titik tengah', async () => {
  const {konteksIoda, teksIoda} = await import('../../public/siklus/lifeline.js');
  const d = {dari: '2025-10-29', sampai: '2026-10-28', per_provinsi: {32: {peristiwa: 2, jam_total: 9}}, peristiwa: [{prov: '32', tanggal: '2026-05-01'}, {prov: '32', tanggal: '2026-09-02'}, {prov: '63', tanggal: '2026-10-24'}]};
  const [a, b] = konteksIoda(d, ['3201', '3202', '63'].map(x => x.slice(0, 2)));
  assert.equal(konteksIoda(d, ['32', '32', '63']).length, 2);
  assert.deepEqual([a.prov, a.ada, a.peristiwa, a.terbaru], ['32', true, 2, '2026-09-02']);
  assert.equal(b.ada, false);
  assert.match(teksIoda(b, 'Papua'), /tidak ada data$/);
  assert.equal(konteksIoda(null, ['32'])[0].ada, false);
  assert.doesNotMatch(teksIoda(a, 'Jawa Barat'), /·|\bnull\b|undefined|NaN/);
});
