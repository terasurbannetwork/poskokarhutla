/* SB-15: render murni kartu Rapor uji. */
import test from "node:test";
import assert from "node:assert/strict";
const mod = await import("../../public/operasi_semai_murni.js");
const M = globalThis.OpsSemaiMurni || mod.default;

test("rapor kosong atau galat: data kurang, bukan 0 persen", () => {
  for (const r of [null, {galat: 404}, {lapis_a: null, lapis_b: {n: 0}}]) {
    const h = M.raporHtml(r);
    assert.match(h, /data kurang \(n = 0 dari sekitar 250\)/);
    assert.doesNotMatch(h, /efek 0/);
    assert.match(h, /kesesuaian, bukan sebab-akibat/);
  }
});
test("rapor terisi: pil vonis dan angka berformat Indonesia", () => {
  const h = M.raporHtml({lapis_a: null, lapis_b: {n: 1234, efek: -32.45, ci95: [-48.2, -10.1], mde: 41, vonis: "sejalan"}});
  assert.match(h, /sm-pv-sejalan/);
  assert.match(h, /n = 1\.234, efek -32,[45]%/);
  assert.match(h, /selang 95% -48,2 sampai -10,1%/);
  assert.match(h, /MDE 41%/);
  assert.doesNotMatch(h, /\b(aman|akan hujan|mencegah banjir)\b/);
});
