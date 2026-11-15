// TW-08: model murni kartu Siapa di mana dan Tawaran. Rute yang dipanggil layar: tiga-w, token, cabut, tawaran, keputusan, org.
// Jalan: node --test tests/siklus/tiga_w_layar.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
runInThisContext(readFileSync('public/inti/format.js', 'utf8') + ';globalThis.fmt = fmt;');
const {modelPeta, barisSel, badanKeputusan, bisaPutus, namaOrg, NAMA_KLASTER, STATUS_TAWARAN, JENIS_ORG} = await import('../../public/siklus/tiga_w.js');

const D = {klaster: ['kesehatan', 'sar', 'logistik'], ambang_tumpang: 3, celah_tumpang: [{kab4: '3201', celah: ['sar'], tumpang: ['logistik'], per_klaster: {kesehatan: 1, sar: 0, logistik: 4}}, {kab4: '3202', celah: [], tumpang: [], per_klaster: {kesehatan: 0, sar: 2, logistik: 3}}]};

test('peta: tanda celah, tumpang tindih, ok, kosong; urutan klaster dari server', () => {
  const m = modelPeta(D);
  assert.deepEqual(m.kab[0].sel.map(s => s.tanda), ['ok', 'celah', 'tumpang']);
  assert.deepEqual(m.kab[1].sel.map(s => s.tanda), ['kosong', 'ok', 'ok'], '3 organisasi bukan tumpang tindih; 0 tanpa celah = kosong');
  assert.deepEqual(m.kab[0].sel.map(s => s.n), [1, 0, 4]);
  assert.match(m.kab[0].sel[2].label, /tumpang tindih \(hipotesis\)/);
  assert.equal(m.ambang, 3);
  assert.deepEqual(modelPeta(null).kab, []);
  assert.equal(modelPeta({}).klaster.length, 8, 'tanpa daftar server: delapan klaster baku');
});
test('delapan klaster baku, status tawaran, jenis organisasi tanpa titik tengah dan kapital penuh', () => {
  assert.equal(Object.keys(NAMA_KLASTER).length, 8);
  for (const n of [...Object.values(NAMA_KLASTER), ...Object.values(STATUS_TAWARAN), ...Object.values(JENIS_ORG)]) assert.doesNotMatch(n, /·/);
  for (const n of [...Object.values(NAMA_KLASTER), ...Object.values(STATUS_TAWARAN)]) assert.doesNotMatch(n, /^[A-Z ]+$/);   // singkatan resmi (TNI, PMI) di JENIS_ORG dikecualikan
});
test('baris sel: hanya kab dan klaster itu', () => {
  const b = [{kab4: '3201', klaster: 'sar', org_nama: 'A'}, {kab4: '3201', klaster: 'logistik'}, {kab4: '3202', klaster: 'sar'}];
  assert.equal(barisSel(b, '3201', 'sar').length, 1); assert.deepEqual(barisSel(null, '3201', 'sar'), []);
});
test('keputusan: alasan organisasi wajib bagi alihkan dan tolak, terima boleh tanpa alasan, kebutuhan hanya {sumber,id}', () => {
  assert.ok(badanKeputusan({status: 'ditolak', alasanOrg: ''}).galat);
  assert.ok(badanKeputusan({status: 'dialihkan', alasanOrg: 'abc'}).galat, 'kurang dari 5 karakter');
  assert.ok(badanKeputusan({status: 'masuk'}).galat);
  assert.equal(badanKeputusan({status: 'diterima'}).badan.alasan_organisasi, null);
  const x = badanKeputusan({status: 'ditolak', alasanOrg: 'sudah tercukupi', alasanInternal: ' catatan ', kebutuhan: [{sumber: 'meja', id: '7', sisa: 5, kab4: '3201'}]}).badan;
  assert.deepEqual(x, {status: 'ditolak', alasan_organisasi: 'sudah tercukupi', alasan_internal: 'catatan', kebutuhan: [{sumber: 'meja', id: '7'}]});
});
test('hanya tawaran masuk atau dicocokkan bisa diputus; nama organisasi tak dikenal = tidak ada data', () => {
  assert.deepEqual(['masuk', 'dicocokkan', 'diterima', 'dialihkan', 'ditolak'].map(s => bisaPutus({status: s})), [true, true, false, false, false]);
  assert.equal(namaOrg(new Map([['a', 'PMI']]), 'a'), 'PMI'); assert.equal(namaOrg(new Map(), 'b'), 'tidak ada data');
});
test('rute yang dipanggil layar tertulis di sumbernya', () => {
  const s = readFileSync('public/siklus/tiga_w.js', 'utf8');
  for (const r of ['tiga-w', 'tiga-w/token', 'token/cabut', 'tawaran', 'keputusan', '/api/siklus/org']) assert.ok(s.includes(r), r);
});
