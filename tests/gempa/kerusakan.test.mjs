import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const muat = (...berkas) => { const c = {console, Math, JSON}; vm.createContext(c); for (const b of berkas) vm.runInContext(fs.readFileSync(b, "utf8"), c); return c; };
const K = muat("public/gempa/kerusakan.js").GempaKerusakan;
const GG = muat("public/gempa/guncangan.js").GempaGuncangan;

test("kerapuhan: naik bersama PGA, peluang tak melebihi 1, nol tanpa guncangan", () => {
  for (const k of K.KELAS) {
    assert.equal(K.rusak(0, k).rb, 0);
    let sebelum = 0;
    for (const pga of [20, 80, 150, 300, 600, 1200]) {
      const r = K.rusak(pga, k), total = r.rr + r.rs + r.rb;
      assert.ok(r.rr >= 0 && r.rs >= 0 && r.rb >= 0, `${k.id} ${pga}: peluang negatif ${JSON.stringify(r)}`);
      assert.ok(total <= 1 + 1e-9 && r.runtuh <= r.rb + 1e-9, `${k.id} ${pga}: jumlah ${total}`);
      assert.ok(r.rb >= sebelum, `${k.id}: RB turun di PGA ${pga}`);
      sebelum = r.rb;
    }
  }
  const pga = 300; // tembok tanpa tulangan lebih rapuh daripada beton, beton daripada kayu
  assert.ok(K.rusak(pga, "tembokan").rb > K.rusak(pga, "beton").rb && K.rusak(pga, "beton").rb > K.rusak(pga, "kayu").rb);
});

test("hitung: rentang rendah <= tengah <= tinggi, korban jiwa mengikuti runtuhan", () => {
  const kec = [{p: 50000, pga: [150, 300, 600]}, {p: 20000, pga: [30, 60, 120]}];
  const h = K.hitung(kec);
  for (const n of ["rb", "jiwa"]) assert.ok(h[n][0] <= h[n][1] && h[n][1] <= h[n][2], `${n}: ${h[n]}`);
  const sedangPlus = h.rb.map((v, i) => v + h.rs[i]); // RS sendiri tidak monoton (pindah ke RB), RS+RB harus monoton
  assert.ok(sedangPlus[0] <= sedangPlus[1] && sedangPlus[1] <= sedangPlus[2], `RS+RB: ${sedangPlus}`);
  assert.ok(h.rb[1] > 0 && h.jiwa[1] > 0 && h.rb[1] < h.rumah, `RB ${h.rb[1]} dari ${h.rumah} rumah`);
  assert.equal(K.hitung([{p: 1000, pga: [0, 0, 0]}]).jiwa[1], 0);
  assert.ok(K.sigmaLn("antarmuka") > K.sigmaLn("kerak"));
});

test("Vs30 per sel: dalam rentang proksi, dataran rendah lebih lunak dari pegunungan, di luar grid jatuh ke 400", () => {
  const meta = JSON.parse(fs.readFileSync("public/gempa/data/vs30.json", "utf8")), bytes = new Uint8Array(fs.readFileSync("public/gempa/data/vs30.bin"));
  assert.equal(bytes.length, meta.nx * meta.ny, "ukuran vs30.bin tidak cocok dengan meta");
  const v = GG.vs30Grid(meta, bytes, 400);
  for (let i = 0; i < bytes.length; i += 97) if (bytes[i]) assert.ok(bytes[i] * meta.sat >= 180 && bytes[i] * meta.sat <= 760, `sel ${i}: ${bytes[i] * meta.sat}`);
  assert.ok(v(-6.2, 106.8) < v(-6.8, 107.6), "Jakarta (dataran) harus lebih lunak dari Lembang (lereng)");
  assert.equal(v(-30, 10), 400);
  assert.equal(v(-12.5, 120), 400);
});

test("pita sigma: MMI p16 < p50 < p84 lewat pgaKeMmi, dan tanah lunak mengguncang lebih kuat", () => {
  const model = JSON.parse(fs.readFileSync("public/gempa/data/model_guncangan.json", "utf8")), M = GG.pasang(model);
  const pg = M.pga(6.8, 15, 10, "kerak", 400), s = K.sigmaLn("kerak");
  const [a, b, c] = [pg * Math.exp(-s), pg, pg * Math.exp(s)].map(M.pgaKeMmi);
  assert.ok(a < b && b < c, `${a} ${b} ${c}`);
  assert.ok(Math.abs(b - M.mmi(6.8, 15, 10, "kerak", 400)) < 1e-12);
  assert.ok(M.mmi(6.8, 15, 10, "kerak", 200) > M.mmi(6.8, 15, 10, "kerak", 700));
});
