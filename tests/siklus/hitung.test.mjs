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
