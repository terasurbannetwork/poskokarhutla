import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
/* PB-68.2: pop-up Situasi hari ini memakai S.h0; S.h0 harus sudah benar begitu S.pr terpasang (sebelum await nowcast). */
const src = fs.readFileSync(new URL("../../public/cuaca/cuaca.js", import.meta.url), "utf8");
const ambil = re => { const m = src.match(re); assert.ok(m, "tidak ketemu: " + re); return m[0]; };
const tglWIB = t => new Date(t + 7 * 36e5).toISOString().slice(0, 10);
const hariIniIdx = new Function("tglWIB", ambil(/const hariIniIdx = [^\n]*\n?/).replace("const hariIniIdx =", "return") + "; return hariIniIdx;")(tglWIB);
const pr = {hari: ["2026-11-12", "2026-11-13", "2026-11-16", "2026-11-17"], hari_ini: "2026-11-12"};

test("hariIniIdx: hari ini bila data memuatnya, bukan hari_ini data yang basi", () => {
  assert.equal(hariIniIdx(pr, Date.parse("2026-11-16T09:00:00+07:00")), 2);
});
test("hariIniIdx: data basi jatuh ke hari_ini data", () => {
  assert.equal(hariIniIdx(pr, Date.parse("2026-12-30T09:00:00+07:00")), 0);
});
test("urutan muat: S.h0 ditetapkan tepat sesudah S.pr dan sebelum await pertama", () => {
  const f = ambil(/async function muatData\(\) \{[\s\S]*?\n\}/);
  const iPr = f.indexOf("Object.assign(S, {pr, meta, geo})"), iH0 = f.indexOf("S.h0 = S.hari"), iAw = f.indexOf("await", iPr);
  assert.ok(iPr > 0 && iH0 > iPr && iAw > iH0, "S.h0 harus di antara pemasangan S.pr dan await berikutnya");
});
test("simulasi: nowcast tertunda, pembaca di antara tetap melihat hari ini", async () => {
  const S = {}; let lihat;
  const muat = async () => { S.pr = pr; S.h0 = hariIniIdx(pr, Date.parse("2026-11-16T09:00:00+07:00")); await new Promise(r => setTimeout(r, 20)); };
  const p = muat(); await new Promise(r => setTimeout(r, 5)); lihat = S.pr.hari[S.h0]; await p;
  assert.equal(lihat, "2026-11-16");
});
