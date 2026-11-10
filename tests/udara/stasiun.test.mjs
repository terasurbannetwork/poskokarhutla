import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

/* stasiun.js adalah skrip klasik: dijalankan di konteks vm dengan data nyata public/udara/data/bmkg_pm25.json */
const baca = p => fs.readFileSync(new URL("../../public/" + p, import.meta.url), "utf8");
const KAT = [{n: "Baik", w: "#5a9e74", fg: "#fff"}, {n: "Sedang", w: "#e3b94e", fg: "#000"}, {n: "Tidak sehat", w: "#e8743b", fg: "#fff"}, {n: "Sangat tidak sehat", w: "#d64545", fg: "#fff"}, {n: "Berbahaya", w: "#8a2be2", fg: "#fff"}];
const ctx = vm.createContext({innerWidth: 1200, document: {querySelector: () => null, addEventListener() {}}, KAT, kat: v => [15.5, 55.4, 150.4, 250.4].reduce((n, b) => n + (v > b), 0), jamWIB: t => "J" + t,
  Insight: {eyIk: (id, n) => n}, fetch: async u => ({ok: true, json: async () => JSON.parse(baca(String(u).replace(/^\//, "")))}), console});
for (const f of ["inti/format.js", "inti/kartu.js", "udara/stasiun.js"]) vm.runInContext(baca(f), ctx, {filename: f});
const jalan = s => vm.runInContext(s, ctx);
await jalan("Stasiun.muat()");

test("berkas: stasiun segar punya nilai, basi tidak pernah nol", () => {
  const D = JSON.parse(baca("udara/data/bmkg_pm25.json"));
  assert.ok(D.n_stasiun >= 10 && D.stasiun.length === D.n_stasiun);
  for (const s of D.stasiun) assert.ok(s.v === null || s.v >= 0, "v tak valid " + s.nama);
  assert.equal(jalan("Stasiun.segar().length"), D.stasiun.filter(s => s.v != null).length);
});
test("kartu: berlabel pengukuran BMKG, bukan model, dengan sumber dan jam", () => {
  const h = jalan("Stasiun.ex()");
  for (const t of ["pengukuran stasiun BMKG, bukan model", "Sumber: BMKG", "µg/m³", "ex-std"].filter(t => t !== "ex-std")) assert.ok(h.includes(t), "tak ada: " + t);
  assert.ok(!h.includes("Pantau Bencana") && !h.includes("·"));
});
test("tanpa stasiun segar: kartu, legenda dan peta dibuang", () => {
  jalan("Stasiun.D = {stasiun: [{nama: 'X', lat: 1, lon: 2, v: null}]}");
  assert.equal(jalan("Stasiun.ex()"), ""); assert.equal(jalan("Stasiun.legenda()"), ""); assert.equal(jalan("Stasiun.geo().features.length"), 0);
});
