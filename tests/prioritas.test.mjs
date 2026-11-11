// Self-check aturan Prioritas provinsi (public/prioritas.js): rata-rata 3 hari, histeresis keluar 3 hari, ganti garis 180 -> 144 pada 3 Nov 2026.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const ctx = vm.createContext({console}); ctx.globalThis = ctx;
vm.runInContext(fs.readFileSync(new URL("../public/prioritas.js", import.meta.url), "utf8"), ctx);
const P = ctx.Prioritas;
const hr = (mulai, n) => Array.from({length: n}, (_, i) => new Date(Date.parse(mulai) + i * 864e5).toISOString().slice(0, 10));

test("masuk, bertahan, keluar di hari ke-3 (garis 180/90)", () => {
  const hari = hr("2026-10-01", 20), v = hari.map((_, i) => i < 3 ? 200 : 0);   // H3 = 200 di i=2, lalu meluruh
  const j = P.jalan(hari, v, "9999");
  assert.equal(j[0].st, "prioritas"); assert.equal(j[0].sejak, hari[2]); assert.equal(j[0].masuk, 180);
  const i1 = j.findIndex(x => x.h7 < 90);                                       // pertama di bawah garis keluar
  for (let k = 0; k < 2; k++) { assert.equal(j[i1 + k].st, "bertahan"); assert.equal(j[i1 + k].bawah, k + 1); }
  assert.equal(j[i1 + 2].st, "luar"); assert.equal(j[i1 + 2].sejak, null);
});
test("antara garis keluar dan masuk mengulang hitungan", () => {
  const hari = hr("2026-10-01", 20), v = hari.map((_, i) => i < 3 ? 200 : i < 5 ? 0 : i === 5 ? 300 : 120);   // sehari di bawah 90, lalu H3 naik lagi ke >=90 (<180) sebelum hari ke-3
  const j = P.jalan(hari, v, "9999");
  assert.ok(j.some(x => x.bawah > 0) && j.at(-1).st === "bertahan" && j.at(-1).bawah === 0);
});
test("ganti garis 180 -> 144 pada 3 Nov, hari berjalan dibuang", () => {
  const hari = hr("2026-10-28", 8), v = hari.map(() => 150);                     // 150: < 180, >= 144
  const j = P.jalan(hari, v, "2026-11-04");
  assert.equal(j.at(-1).tgl, "2026-11-03");
  assert.equal(j.find(x => x.tgl === "2026-11-02").st, "luar");
  const m = j.find(x => x.tgl === "2026-11-03"); assert.equal(m.st, "prioritas"); assert.equal(m.masuk, 144); assert.equal(m.keluar, 72);
});
