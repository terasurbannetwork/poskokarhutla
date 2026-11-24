import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
await import("../../public/cuaca/sim_dampak.js");
await import("../../public/cuaca/sim_data.js");
const D = globalThis.SimDampak, SC = globalThis.SimCuaca;
const baca = f => JSON.parse(fs.readFileSync(new URL(`../../public/banjir/data/${f}`, import.meta.url)));

test("sim_dampak: self-check fungsi murni", () => D.uji());
test("sim_data: self-check", () => SC.uji());

test("pita ansambel: p10 <= prakiraan <= p90 di titik nyata, dan tanpa ansambel pitanya sama", () => {
  const ens = baca("hujan_ansambel.json"), g = ens.grid[5], pts = [{lat: g.lat, lon: g.lon}];
  const jam0 = Date.parse(ens.hari[0] + "T00:00:00+07:00"), S = D.baru(1, 2);
  S.hujan[0] = 30; S.hujan[1] = 20;
  const peta = D.petaAnsambel(pts, ens); assert.equal(peta[0], 5, "titik di pusat sel ansambel memilih sel itu");
  const {pita, hariAda} = D.hujanPita(S, 1, jam0, ens, peta);
  assert.equal(hariAda, 2);
  assert.ok(pita[0][0] <= pita[1][0] && pita[1][0] <= pita[2][0], `pita tak urut: ${[pita[0][0], pita[1][0], pita[2][0]]}`);
  const kosong = D.hujanPita(S, 1, jam0, null, new Int32Array([-1]));
  assert.ok(kosong.pita[0][0] === 50 && kosong.pita[2][0] === 50 && kosong.hariAda === 0, "tanpa ansambel pita = prakiraan");
});

test("kontrak berkas nyata: medan, ansambel, param punya bentuk yang dipakai model", () => {
  const m = baca("cuaca_medan.json"); assert.equal(SC.periksa(m), null);
  const ens = baca("hujan_ansambel.json"); assert.ok(ens.grid.every(x => x.q.length === 3 && x.q[0].length === ens.hari.length), "q harus [3][hari]");
  const par = baca("param_banjir.json").param; for (const k of ["stimulan_rumah_rr", "nilai_nyawa_statistik", "biaya_pengungsi_hari"]) assert.ok(par[k][0] > 0, k);
});

test("KI-66: salinan Sphere di sim_dampak.js sama dengan scripts/prediksi/aturan.json; kebutuhan = jiwa x koefisien", () => {
  const aturan = JSON.parse(fs.readFileSync(new URL("../../scripts/prediksi/aturan.json", import.meta.url), "utf8"));
  for (const k of ["air_l", "hunian_m2", "jamban_per", "kkal"]) assert.equal(D.SPHERE[k], aturan.sphere[k], `${k}: ${D.SPHERE[k]} vs aturan.json ${aturan.sphere[k]}`);
  const b = D.kebutuhanSphere(1000);
  assert.equal(b.air_l, 1000 * aturan.sphere.air_l); assert.equal(b.hunian_m2, 1000 * aturan.sphere.hunian_m2); assert.equal(b.jamban, Math.ceil(1000 / aturan.sphere.jamban_per)); assert.equal(b.kkal, 1000 * aturan.sphere.kkal);
});

test("embusan dan hujan nyata lewat langkah(): nilai berhingga dan tak negatif", () => {
  const m = baca("cuaca_medan.json"), pts = [{lat: -6.2, lon: 106.8}, {lat: 0.5, lon: 101.4}, {lat: -8.6, lon: 115.2}], F = [];
  for (let h = 0; h < m.n; h++) F.push(SC.bingkai(m, h));
  const B = D.bobot(m, pts), jam0 = Date.parse(m.t0), S = D.baru(3, D.hariKe(jam0, m.n - 1) + 1);
  D.langkah(S, B, pts, F, jam0, 0, m.n, null);
  for (let i = 0; i < 3; i++) assert.ok(Number.isFinite(S.gmax[i]) && S.gmax[i] > 0 && S.gmax[i] < 250, `embusan titik ${i} = ${S.gmax[i]}`);
  assert.ok(S.hujan.every(x => Number.isFinite(x) && x >= 0));
});
