/* KI-40: peringkat perlakuan tanggap gempa (public/gempa/tanggap.js) di atas mesin inti. node --test tests/gempa/tanggap.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const c = {console, Math, JSON}; vm.createContext(c); c.globalThis = c;
const m = {exports: {}}; new Function("module", baca("public/inti/perlakuan.js"))(m); c.Perlakuan = m.exports;
vm.runInContext(baca("public/gempa/kerusakan.js"), c); vm.runInContext(baca("public/gempa/tanggap.js"), c);
const T = c.GempaTanggap, K = c.GempaKerusakan, aturan = JSON.parse(baca("scripts/prediksi/aturan.json"));
const taksir = K.taksir([{p: 40000, pg: 400}, {p: 60000, pg: 250}, {p: 20000, pg: 120}], "kerak", 6.5, 3);

test("koefisien Sphere sama dengan scripts/prediksi/aturan.json (satu sumber)", () => {
  for (const k of ["air_l", "hunian_m2", "jamban_per", "kkal"]) assert.equal(T.SPHERE[k], aturan.sphere[k], `${k}: ${T.SPHERE[k]} vs aturan.json ${aturan.sphere[k]}`);
});
test("analisis: front punya manfaat dan biaya positif, kebutuhan = jiwa x koefisien Sphere, tiap asumsi berlabel sumber", () => {
  const r = T.analisis(taksir, null), B = r.kebutuhan;
  assert.ok(taksir.rb[1] > 0 && r.pareto.length >= 1, "kerusakan fixture harus menghasilkan front");
  assert.equal(r.semua, T.TIM.length * T.COVER.length, "dasar + semua kombinasi tim x cakupan");
  assert.ok(Math.abs(B.air_l_hari - B.mengungsi * aturan.sphere.air_l) < 1e-6 && Math.abs(B.hunian_m2 - B.mengungsi * aturan.sphere.hunian_m2) < 1e-6);
  assert.ok(Math.abs(B.kkal_hari - B.mengungsi * aturan.sphere.kkal) < 1e-6 && B.jamban === Math.ceil(B.mengungsi / aturan.sphere.jamban_per), "kkal dan jamban = jiwa x koefisien aturan.json");
  for (const p of r.pareto) assert.ok(p.selamat > 0 && p.biaya > 0, `${p.nama}: manfaat ${p.selamat}, biaya ${p.biaya}`);
  for (const [k, a] of Object.entries(T.ASUMSI)) assert.ok(a.sumber && typeof a.bersumber === "boolean", `${k}: asumsi harus punya sumber atau pengakuan tanpa sumber`);
  assert.equal(JSON.stringify(T.analisis(taksir, null)), JSON.stringify(r), "biji sama = hasil sama");
});
test("biaya dan manfaat naik dengan jumlah tim; tanpa kerusakan tak ada manfaat; asumsi bisa diganti", () => {
  const P = T.nilaiAsumsi(null), u = [.5, .5], h = n => T.hitung(taksir, P, {tim: n, cover: 0}, u);
  assert.ok(h(10).biaya > h(5).biaya && h(10).selamat >= h(5).selamat);
  const nol = {rb: [0, 0, 0], rs: [0, 0, 0], jiwa: [0, 0, 0], rumah: 0};
  assert.equal(T.hitung(nol, P, {tim: 20, cover: 1}, u).selamat, 0);
  assert.equal(T.analisis(taksir, {biaya_tim_hari: 30e6}).param.biaya_tim_hari, 30e6);
});
