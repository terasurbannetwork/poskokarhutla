import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const src = fs.readFileSync("public/banjir/dini.js", "utf8"), ctx = vm.createContext({Number, Object, Math, isFinite, Date});
vm.runInContext(src.slice(0, src.indexOf("if (typeof window")), ctx);
const Dini = vm.runInContext("Dini", ctx);
const h = (t, p0, p1) => ({t, p: [p0, p1]});
test("daftar: H+1..H+3, urut peluang, hanya kabupaten", () => {
  const d = {versi: "peluang/1", wilayah: {ID: {tingkat: "nasional", hari: [h("2026-10-30", .9, .5)]},
    "11|A": {nama: "A", tingkat: "kabupaten", hari: [h("2026-10-30", .2, 0), h("2026-11-01", .4, .1)]},
    "11|B": {nama: "B", tingkat: "kabupaten", hari: [h("2026-10-30", .6, .1), h("2026-10-29", .9, 0)]}}};
  const L = Dini.daftar(d, "2026-10-29");
  assert.deepEqual([...L.map(x => x.t)], ["2026-10-30", "2026-10-31", "2026-11-01"]);
  assert.deepEqual([...L[0].baris.map(b => b.nama)], ["B", "A"]); assert.equal(L[1].n, 0); assert.equal(L[2].baris[0].nama, "A");
  assert.equal(Dini.daftar(null, "2026-10-29")[0].n, 0);
});
test("pct dan kemajuan", () => {
  assert.equal(Dini.pct(.004), "<1%"); assert.equal(Dini.pct(.5), "50%");
  const m = Dini.kemajuan({kriteria: {n_hari_min: 60, kejadian_min: 100}, tunda: {"1": {n_hari: 3, n_kejadian: 4, vonis: "belum cukup data"}, "0": {n_hari: 1, n_kejadian: 0, vonis: "lulus"}}});
  assert.equal(m.tunda[0].tunda, 0); assert.equal(m.tunda[0].vonis, "lulus"); assert.equal(m.tunda[1].vonis, null);
  assert.equal(Dini.kemajuan(null), null);
});
