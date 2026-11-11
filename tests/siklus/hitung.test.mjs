// hitung.js (peramban) = src/siklus_hitung.js (Worker): badan fungsi sama persis, vektor acuan ALGORITMA F1 (SK-026, UJ-G0-03).
// Jalan: node --test tests/siklus/hitung.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as B from '../../public/siklus/hitung.js';
import * as W from '../../src/siklus_hitung.js';

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ACUAN = JSON.parse(readFileSync(path.join(AKAR, 'tests/siklus/fixtures/acuan.json'), 'utf8'));
const badan = (f) => readFileSync(path.join(AKAR, f), 'utf8').slice(readFileSync(path.join(AKAR, f), 'utf8').indexOf('export const BASI_HARI'))
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s+\/\/ .*$/gm, '').replace(/\s+/g, ' ').trim();

test('badan fungsi hitung.js sama persis dengan siklus_hitung.js (paritas)', () => {
  assert.equal(badan('public/siklus/hitung.js'), badan('src/siklus_hitung.js'));
  assert.deepEqual(Object.keys(B).sort(), Object.keys(W).sort());
});

test('hitung.js tanpa DOM dan tanpa impor: bisa dimuat di Worker maupun peramban', () => {
  const t = readFileSync(path.join(AKAR, 'public/siklus/hitung.js'), 'utf8');
  assert.doesNotMatch(t, /\bdocument\b|\bwindow\b|^import /m);
});

test('ID kejadian: vektor acuan (bila tabrakan, kunci|n) dan format 16 karakter', async () => {
  for (const v of ACUAN.id_kejadian) {
    const [jenis, kab, tgl, n] = v.masukan.split('|');
    const kunci = `${jenis}|${kab}|${tgl}`;
    assert.equal(await B.idKejadian(kunci, n ? Number(n) : 1), v.id, v.masukan);
    assert.equal(v.id.length, 16); assert.match(v.id, B.RE_KJ);
  }
});

test('selisih antarsumber: vektor acuan, null bukan nol, tanpa total', () => {
  for (const v of ACUAN.selisih) {
    const s = B.selisihAntarsumber(v.nilai);
    assert.equal(s.n, v.n); assert.equal(s.selisih, v.selisih); assert.deepEqual(s.arah, v.arah); assert.equal(s.persen, v.persen);
    assert.ok(!('total' in s) && !('jumlah' in s));
  }
  assert.deepEqual(B.selisihAntarsumber({dibi: 5, logbook: null}), {n: 1, selisih: null, arah: null, persen: null});
  const d = B.selisihDampak({dibi: {meninggal: {n: 12}, terdampak: {n: null}}, logbook: {meninggal: {n: 15}}});
  assert.deepEqual(d.map((x) => x.metrik), ['meninggal', 'terdampak']); assert.equal(d[0].selisih, 3); assert.equal(d[1].selisih, null);
});

test('transisi fase sah, alias, dan basi sama di kedua sisi', async () => {
  for (const dari of [...B.FASE, 'dibatalkan', 'digabung']) for (const ke of [...B.FASE, 'dibatalkan', 'digabung']) assert.equal(B.faseSah(dari, ke), W.faseSah(dari, ke), `${dari}->${ke}`);
  assert.equal(B.faseSah('terdeteksi', 'dibatalkan'), true); assert.equal(B.faseSah('tanggap', 'selesai'), false);
  const peta = {A: {fase: 'digabung', ke: 'B'}, B: {fase: 'digabung', ke: 'C'}, C: {fase: 'tanggap'}};
  assert.equal(await B.resolusiAlias('A', (x) => peta[x] ?? null), 'C');
  await assert.rejects(B.resolusiAlias('A', (x) => ({A: {fase: 'digabung', ke: 'A'}})[x]), /berputar/);
  await assert.rejects(B.resolusiAlias('Z', () => null), /putus/);
  assert.equal(B.basi('2026-11-01', '2026-11-05'), true); assert.equal(B.basi('2026-11-01', '2026-11-04'), false); assert.equal(B.hariAntara('2026-11-01', '2026-11-04'), 3);
  assert.equal(B.angkaPublik(4), 'di bawah 5'); assert.equal(B.angkaPublik(5), 5); assert.equal(B.angkaPublik(null), null);
});

test('F4: vektor acuan ALGORITMA sama di peramban dan Worker (klasifikasi, kerusakan, stimulan, DTH, sisa 90, PDNA)', () => {
  const F = ACUAN.f4, JT = 1e6, H = {rb: 100 * JT, rs: 50 * JT, rr: 20 * JT};
  for (const M of [B, W]) {
    for (const [p, t] of F.klasifikasi) assert.equal(M.klasifikasiTingkat(p), t, `${p}`);
    const baris = [{sektor: 'perumahan', tingkat: 'rb', unit: 10}, {sektor: 'perumahan', tingkat: 'rs', unit: 20}, {sektor: 'perumahan', tingkat: 'rr', unit: 30}];
    assert.equal(M.nilaiKerusakan(baris, (s, t) => H[t] ?? null).total, F.kerusakan_rp);
    assert.equal(M.stimulan({rb: 10, rs: 20, rr: 30}).nilai, F.stimulan_rp);
    assert.equal(M.dth(F.dth_kk).nilai, F.dth_rp);
    assert.deepEqual(M.sisa90(F.sisa90.tanggap, F.sisa90.hari_ini), {berlalu: F.sisa90.berlalu, sisa: F.sisa90.sisa, lewat: false});
    assert.deepEqual(M.pdna(F.pdna.akhir), {bnpb: F.pdna.bnpb, bpbd: F.pdna.bpbd});
    assert.equal(M.nilaiKerusakan([{sektor: 'pendidikan', tingkat: 'rb', unit: 2}], () => null).total, null, 'kosong menunggu, bukan 0');
  }
});

test('F5: vektor acuan ALGORITMA sama di peramban dan Worker (kebutuhan, kesegaran, skor, pemutaran ulang; tanpa data = menunggu)', () => {
  const F = ACUAN.f5, T = Date.UTC(2026, 2, 1, 1, 0);
  for (const M of [B, W]) {
    const c = M.kebutuhanDasar({jiwa: 1000, hari: 5}).komponen;
    for (const [n, v] of Object.entries(F.kebutuhan_1000_5)) assert.equal(c[n].nilai, v, n);
    assert.equal(c.tempat_sampah.nilai, null, 'KK kosong menunggu, bukan 0');
    const s = M.kesegaran({tgl_sah: F.kesegaran.tgl_sah, hariIni: F.kesegaran.hari_ini});
    assert.deepEqual([s.berlaku_sampai, s.sisa, s.status], [F.kesegaran.berlaku_sampai, F.kesegaran.sisa, F.kesegaran.status]);
    const barang = [M.kesenjanganItem('beras', {nilai: 2000, satuan: 'kg'}, {baik: 1200, satuan: 'kg'}), M.kesenjanganItem('air_minum', {nilai: 51000, satuan: 'liter'}, {baik: 60000, satuan: 'liter'})];
    const k = M.skorGladi({kesegaran: 'berlaku', barang, personel: M.kesenjanganPersonel(50, 40)});
    assert.deepEqual([k.skor, k.label], [F.skor.nilai, F.skor.label]);
    assert.equal(M.skorGladi({kesegaran: 'berlaku'}).skor, null);
    const e = [{waktu: T + 24 * 36e5, sumber: 'a', metrik: 'm', nilai: 5}, {waktu: T, sumber: 'a', metrik: 'm', nilai: 0}, {waktu: T + 3.5 * 36e5, sumber: 'a', metrik: 'm', nilai: 3}];
    assert.deepEqual(M.putarUlang(e).langkah.map((x) => x.t_jam), F.putar_t_jam);
  }
});
