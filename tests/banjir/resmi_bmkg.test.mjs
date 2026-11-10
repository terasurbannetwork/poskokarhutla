import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const ctx = vm.createContext({Date, Math}); vm.runInContext(fs.readFileSync("public/banjir/resmi_bmkg.js", "utf8").split("if (typeof window")[0], ctx);
const R = vm.runInContext("ResmiBMKG", ctx);
test("daftar dasarian mulai dari yang terakhir selesai", () => {
  assert.equal(R.daftar("2026-11-10")[0].nama, "Dasarian III Oktober 2026");
  assert.equal(R.daftar("2026-11-11")[0].nama, "Dasarian I November 2026");
  assert.equal(R.daftar("2026-01-05")[0].nama, "Dasarian III Desember 2025");
  assert.equal(R.daftar("2026-11-10").length, 9);
});
test("URL gambar memakai date dan num seperti halaman BMKG", () => assert.match(R.gambar({t: "2026-10-01", n: 3}), /LAYERS=pcht_das,prov,kabkot&date=2026-10-01&num=3&/));
