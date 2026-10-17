// Gerbang: mesin penjalaran api (tabelLaju/sebar/hffmc) di public/index.html DIJALANKAN sungguhan
// lewat node:vm, lalu sifat fisiknya dibuktikan di kisi sintetis. Pemilik minta "pastikan logic simulasinya jalan".
// Kalau penanda blok mesin hilang/berpindah, uji ini gagal: perbarui PENANDA_AWAL/PENANDA_AKHIR, jangan dilewati.
// Nilai terukur (kisi 121x121, d=100 m, sel ke-25 dari benih, rumput, bui 30, FFMC 92 kecuali disebut):
//  1 ws0: T=3.51 j di keempat arah (selisih 0%) | 2 ws20 wd270: E=1.05 W=13.32 N=S=16.50 (W/E=12.7)
//  3 wd0: S=1.05 N=13.32 | 4 ws15 tMax48: T maks 45.82, seluruh kisi (14641) terbakar | 5 hujan 5 mm sejak jam 6: mineral T maks 6.00, gambut 35.14
//  7 luas72: 14641 tanpa vs 238 dengan serangan, tahan=2.02 | 8 mult2/1=0.50 | 9 rumput 14641 vs hutan 1668 sel | 10 F60 262 vs F92 14641 sel (1.8%)
//  11 hffmc(85,..): basah/hujan 19.1 < netral 85.3 < panas kering 87.5
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const HTML = new URL('../../public/index.html', import.meta.url);
const PENANDA_AWAL = 'const CURING = cc =>';
const PENANDA_AKHIR = 'const BBF = new WeakMap()';

function muat() {
  const src = readFileSync(HTML, 'utf8');
  const a = src.indexOf(PENANDA_AWAL), b = src.indexOf(PENANDA_AKHIR);
  assert.ok(a >= 0 && b > a,
    `Penanda mesin simulasi tidak ditemukan di public/index.html (awal "${PENANDA_AWAL}", akhir "${PENANDA_AKHIR}"). ` +
    'Akibatnya mesin penjalaran api tidak teruji. Perbaiki: sesuaikan penanda di tests/agen/gerbang-sebar-fbp.test.mjs ke blok mesin yang baru.');
  const kode = src.slice(a, b) + '\nthis.tabelLaju = tabelLaju; this.sebar = sebar; this.hffmc = hffmc; this.BAHAN = BAHAN; this.FUEL = FUEL; this.NF = NF; this.idB = idB; this.ARAH16 = ARAH16; this.HeapT = HeapT;';
  const ctx = vm.createContext({ Math, Float32Array, Float64Array, Int32Array, Uint8Array, Infinity });
  vm.runInContext(kode, ctx);
  return ctx;
}
const M = muat();
const { tabelLaju, sebar, hffmc, idB } = M;

const N = 121, D = 100, C = 60; // kisi 121x121, sel 100 m, benih di (60,60)
const RUMPUT = idB('rumput'), HUTAN = idB('hutan');
const idx = (i, j) => j * N + C * 0 + i;
const BENIH = idx(C, C);

function cuaca({ ws = 0, wd = 270, F = 92, utama = RUMPUT } = {}) {
  return { ws: new Array(73).fill(ws), wd: new Array(73).fill(wd), F: new Array(73).fill(F), utama };
}
function jalan({ ws, wd, F, bahan = 'rumput', fuel, hujan, gb, o = {}, bui = 30 } = {}) {
  const tab = tabelLaju(cuaca({ ws, wd, F, utama: idB(bahan) }), bui);
  const f = fuel ?? new Uint8Array(N * N).fill(idB(bahan));
  const K = { n: N, d: D, benih: [BENIH], gb: gb ?? new Uint8Array(N * N) };
  return sebar(K, tab, f, hujan ?? new Array(73).fill(0), { mult: 1, ...o });
}
const luas = (T, jam = 72) => T.reduce((s, t) => s + (t <= jam ? 1 : 0), 0);
const tiba = (r, di, dj, m = 25) => r.T[idx(C + di * m, C + dj * m)];

test('1. tanpa angin: timur/barat/utara/selatan setara', () => {
  const r = jalan({ ws: 0 });
  const t = [tiba(r, 1, 0), tiba(r, -1, 0), tiba(r, 0, 1), tiba(r, 0, -1)];
  assert.ok(t.every(Number.isFinite), `ada arah tak terjangkau: ${t}`);
  const rel = (Math.max(...t) - Math.min(...t)) / Math.min(...t);
  assert.ok(rel <= 0.05, `selisih arah ${(rel * 100).toFixed(2)}% > 5% (T=${t.map(x => x.toFixed(2))}). Mesin bias arah tanpa angin.`);
});

test('2. angin dari barat: ke timur jauh lebih cepat dari ke barat, utara ~ selatan', () => {
  const r = jalan({ ws: 20, wd: 270 });
  const tE = tiba(r, 1, 0), tW = tiba(r, -1, 0), tN = tiba(r, 0, 1), tS = tiba(r, 0, -1);
  assert.ok(Number.isFinite(tE) && Number.isFinite(tW), `timur=${tE} barat=${tW}`);
  assert.ok(tW / tE > 3, `rasio barat/timur=${(tW / tE).toFixed(2)} <= 3`);
  assert.ok(Math.abs(tN - tS) / Math.min(tN, tS) < 0.05, `utara=${tN} selatan=${tS} tak simetris`);
});

test('3. konvensi arah: angin dari utara (wd 0) mendorong api ke selatan (j mengecil)', () => {
  const r = jalan({ ws: 20, wd: 0 });
  const tN = tiba(r, 0, 1), tS = tiba(r, 0, -1);
  assert.ok(tS < tN, `selatan=${tS} utara=${tN}: api harus lebih cepat ke selatan. Konvensi arah terbalik akan membalik peta 3D.`);
  assert.ok(tN / tS > 3, `rasio utara/selatan=${(tN / tS).toFixed(2)} <= 3`);
});

test('4. T[benih]=0, luas kumulatif tak turun, tak ada T terhingga > tMax', () => {
  const tMax = 48, r = jalan({ ws: 15, wd: 270, o: { tMax } });
  assert.equal(r.T[BENIH], 0);
  let prev = 0;
  for (let h = 0; h <= 72; h++) { const L = luas(r.T, h); assert.ok(L >= prev, `luas turun di jam ${h}`); prev = L; }
  assert.ok(luas(r.T, 72) > 100, 'api tidak merambat sama sekali');
  const lewat = r.T.filter(t => Number.isFinite(t) && t > tMax);
  assert.equal(lewat.length, 0, `${lewat.length} sel terhingga melewati tMax=${tMax}, maks ${Math.max(...lewat)}`);
});

test('5. hujan 5 mm/jam memadamkan tanah mineral, gambut tetap jalan', () => {
  const h = 6, hujan = new Array(73).fill(0); for (let i = h; i < 73; i++) hujan[i] = 5;
  const mineral = jalan({ ws: 10, hujan });
  const maks = Math.max(...mineral.T.filter(Number.isFinite));
  assert.ok(maks <= h, `mineral: sel menyala di jam ${maks.toFixed(2)} > ${h} padahal hujan 5 mm`);
  assert.ok(luas(mineral.T) > 1, 'sebelum hujan api harus sempat merambat');
  const gambut = jalan({ ws: 10, hujan, gb: new Uint8Array(N * N).fill(1) });
  const mg = Math.max(...gambut.T.filter(Number.isFinite));
  assert.ok(mg > h + 1, `gambut: api berhenti di jam ${mg.toFixed(2)}, harus merambat lewat jam ${h}`);
});

test('6. sekat 1 sel tak terbakar tak bisa dilompati (diagonal/kuda)', () => {
  const fuel = new Uint8Array(N * N).fill(RUMPUT);
  const kolom = C + 5;
  for (let j = 0; j < N; j++) fuel[idx(kolom, j)] = 0;
  const r = jalan({ ws: 25, wd: 270, fuel });
  let bocor = 0, sisiBenih = 0;
  for (let j = 0; j < N; j++) {
    for (let i = kolom + 1; i < N; i++) if (Number.isFinite(r.T[idx(i, j)])) bocor++;
    for (let i = 0; i < kolom; i++) if (Number.isFinite(r.T[idx(i, j)])) sisiBenih++;
  }
  assert.ok(sisiBenih > 100, 'api tak merambat di sisi benih');
  assert.equal(bocor, 0, `${bocor} sel di seberang sekat terbakar: api melompati garis tak terbakar`);
  assert.equal(r.T[idx(kolom, C)], Infinity, 'sel sekat sendiri terbakar');
});

test('7. serangan awal memperkecil luas 72 jam dan mengisi tahan', () => {
  const dasar = jalan({ ws: 10 });
  const sr = jalan({ ws: 10, o: { T0: 2, P: 1e6 } });
  assert.ok(luas(sr.T) < luas(dasar.T), `serangan ${luas(sr.T)} >= tanpa ${luas(dasar.T)}`);
  assert.ok(sr.tahan !== null && sr.tahan >= 2, `tahan=${sr.tahan}`);
  assert.equal(dasar.tahan, null);
});

test('8. mult 2 vs 1: waktu tiba kira-kira setengah', () => {
  const a = jalan({ ws: 10, wd: 270 }), b = jalan({ ws: 10, wd: 270, o: { mult: 2 } });
  for (const [di, dj] of [[1, 0], [0, 1], [-1, 0]]) {
    const ra = tiba(a, di, dj, 20), rb = tiba(b, di, dj, 20), rasio = rb / ra;
    assert.ok(rasio > 0.45 && rasio < 0.55, `arah (${di},${dj}) rasio=${rasio.toFixed(3)}`);
  }
});

test('9. rumput lebih cepat dari hutan pada cuaca sama', () => {
  const rm = jalan({ ws: 10, wd: 270, bahan: 'rumput' }), ht = jalan({ ws: 10, wd: 270, bahan: 'hutan' });
  assert.ok(luas(rm.T) > luas(ht.T), `rumput=${luas(rm.T)} hutan=${luas(ht.T)}`);
  assert.ok(tiba(rm, 1, 0, 10) < tiba(ht, 1, 0, 10), 'waktu tiba rumput harus lebih singkat');
});

test('10. FFMC basah (60) nyaris tak merambat dibanding FFMC 92', () => {
  const basah = luas(jalan({ ws: 10, F: 60 }).T), kering = luas(jalan({ ws: 10, F: 92 }).T);
  assert.ok(basah * 20 < kering, `basah=${basah} kering=${kering}: harus < 5%`);
});

test('11. hffmc: RH tinggi + hujan turun, panas kering naik, selalu di [0,101]', () => {
  const basah = hffmc(85, 25, 98, 5, 10), kering = hffmc(85, 35, 25, 15, 0), netral = hffmc(85, 28, 60, 8, 0);
  assert.ok(basah < 85, `RH98+hujan10mm: ${basah}`);
  assert.ok(kering > 85, `panas kering: ${kering}`);
  assert.ok(basah < netral && netral < kering, `urutan ${basah} ${netral} ${kering}`);
  for (const F of [0, 50, 85, 101]) for (const T of [-5, 20, 40]) for (const H of [1, 50, 100]) for (const W of [0, 30, 80]) for (const R of [0, 1, 50, 300]) {
    const v = hffmc(F, T, H, W, R);
    assert.ok(Number.isFinite(v) && v >= 0 && v <= 101, `hffmc(${F},${T},${H},${W},${R})=${v}`);
  }
});
