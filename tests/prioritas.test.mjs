// Self-check aturan Prioritas provinsi (public/prioritas.js): histeresis 7 hari, ganti garis 150 -> 120 pada 8 Nov 2026.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const ctx = vm.createContext({console}); ctx.globalThis = ctx;
vm.runInContext(fs.readFileSync(new URL("../public/prioritas.js", import.meta.url), "utf8"), ctx);
const P = ctx.Prioritas;
const hr = (mulai, n) => Array.from({length: n}, (_, i) => new Date(Date.parse(mulai) + i * 864e5).toISOString().slice(0, 10));

test("masuk, bertahan, keluar di hari ke-7 (garis 150/75)", () => {
  const hari = hr("2026-10-01", 30), v = hari.map((_, i) => i < 7 ? 160 : 0);   // H7 = 160 di i=6, lalu meluruh
  const j = P.jalan(hari, v, "9999");
  assert.equal(j[0].st, "prioritas"); assert.equal(j[0].sejak, hari[6]);
  const i1 = j.findIndex(x => x.h7 < 75);                                       // pertama di bawah garis keluar
  assert.ok(j[i1 - 1].st === "bertahan");
  for (let k = 0; k < 6; k++) { assert.equal(j[i1 + k].st, "bertahan"); assert.equal(j[i1 + k].bawah, k + 1); }
  assert.equal(j[i1 + 6].st, "luar"); assert.equal(j[i1 + 6].sejak, null);
});
test("antara garis keluar dan masuk mengulang hitungan", () => {
  const hari = hr("2026-10-01", 30), v = hari.map((_, i) => i < 7 ? 160 : i < 12 ? 0 : 130);   // H7 naik lagi ke 130 (>=75, <150) sebelum 7 hari
  const j = P.jalan(hari, v, "9999");
  assert.ok(j.some(x => x.bawah > 0) && j.at(-1).st === "bertahan" && j.at(-1).bawah === 0);
});
test("ganti garis 150 -> 120 pada 8 Nov, hari berjalan dibuang", () => {
  const hari = hr("2026-10-25", 16), v = hari.map(() => 130);                    // 130: < 150, >= 120
  const j = P.jalan(hari, v, "2026-11-09");
  assert.equal(j.at(-1).tgl, "2026-11-08");
  assert.equal(j.find(x => x.tgl === "2026-11-07").st, "luar");
  const m = j.find(x => x.tgl === "2026-11-08"); assert.equal(m.st, "prioritas"); assert.equal(m.masuk, 120); assert.equal(m.keluar, 60);
  assert.equal(P.garisPada("2026-11-07").masuk, 150);
});
