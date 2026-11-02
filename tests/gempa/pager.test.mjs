import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const c = {console, Math, JSON}; vm.createContext(c); vm.runInContext(fs.readFileSync("public/gempa/pager.js", "utf8"), c);
const P = c.GempaPager;

test("PAGER: sintetis dan Cianjur 2022", () => {
  const s = P.hitung({8: 1e6}); assert.ok(Math.abs(s.jiwa - 412.6) < 0.5 && s.kelas === "oranye" && s.atas === s.jiwa * 4);
  const cj = P.hitung({4: 46951347, 5: 5526880, 6: 2235105, 7: 1436440, 8: 342271});
  assert.ok(Math.abs(cj.jiwa - 158.2) < 0.5 && cj.kelas === "oranye");
  assert.equal(P.hitung({3: 1e9}).kelas, "hijau"); assert.equal(P.kelas(1000), "merah"); assert.equal(P.kelas(99.9), "kuning");
  // kelas tampil dari angka yang dibulatkan: 99,5 tampil 100 = oranye, 999,6 tampil 1.000 = merah, 99,4 tampil 99 = kuning
  assert.equal(P.kelas(P.bulat2(99.5)), "oranye"); assert.equal(P.kelas(P.bulat2(999.6)), "merah"); assert.equal(P.kelas(P.bulat2(99.4)), "kuning");
});
