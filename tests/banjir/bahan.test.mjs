import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const src = fs.readFileSync("public/banjir/bahan.js", "utf8"), ctx = vm.createContext({Number, Object, Math, isFinite, Date, String});
vm.runInContext(src.slice(0, src.indexOf("if (typeof window")), ctx);
const Bahan = vm.runInContext("Bahan", ctx), baca = f => JSON.parse(fs.readFileSync(`public/banjir/data/${f}.json`, "utf8"));
test("berkas nyata menghasilkan kartu ex-std ber-angka, tanpa pemisah titik tengah", () => {
  for (const h of [Bahan.charter(baca("charter")), Bahan.mcdwd(baca("mcdwd_model")), Bahan.genangan(baca("kecamatan_genangan"))]) {
    assert.match(h, /ex ex-std/); assert.match(h, /class="hl"/); assert.ok(!h.includes("·")); assert.ok(!/ on\w+=/.test(h));
  }
});
test("berkas kosong atau bentuk lain = tanpa kartu", () => {
  for (const f of [Bahan.charter, Bahan.mcdwd, Bahan.genangan]) { assert.equal(f(null), ""); assert.equal(f({}), ""); }
});
test("vonis dan label dari berkas, bukan karangan", () => {
  assert.match(Bahan.mcdwd(baca("mcdwd_model")), /GAGAL/); assert.match(Bahan.genangan(baca("kecamatan_genangan")), /Hipotesis, belum lolos uji/);
});
