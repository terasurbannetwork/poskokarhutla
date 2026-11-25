/* Uji run-out longsor (public/banjir/sim_longsor.js: runout, garis energi H/L). Lereng seragam menurun ke +x. */
import test from "node:test"; import assert from "node:assert/strict"; import vm from "node:vm"; import fs from "node:fs";
/* berkas public/ berformat CommonJS tetapi package.json bertipe module: muat lewat vm dengan `module` buatan */
const mod = {exports: {}}; vm.runInNewContext(fs.readFileSync(new URL("../../public/banjir/sim_longsor.js", import.meta.url), "utf8"), {module: mod, Math, Float32Array, Uint8Array, Uint32Array, Number, Error});
const SL = mod.exports;
const nx = 60, ny = 5, dx = 10, z = new Float32Array(nx * ny);
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) z[j * nx + i] = 60 * Math.exp(-i / 12); /* lereng cekung: curam di atas, melandai ke bawah */
const sumber = () => { const s = new Uint8Array(nx * ny); s[2 * nx + 1] = 1; return s; };

test("jangkauan naik bila H/L turun", () => {
  const a = SL.runout(z, nx, ny, dx, sumber(), 0.4), b = SL.runout(z, nx, ny, dx, sumber(), 0.2);
  assert.ok(b.panjang > a.panjang, `H/L 0,2 harus lebih jauh dari 0,4: ${b.panjang} vs ${a.panjang}`);
  assert.ok(b.n > a.n);
});
test("zona memuat sel sumbernya", () => {
  const s = sumber(), r = SL.runout(z, nx, ny, dx, s, 0.3);
  for (let k = 0; k < s.length; k++) if (s[k]) assert.equal(r.zona[k], 1, `sel sumber ${k} tidak di zona`);
});
test("tanpa sel tak stabil zona kosong", () => {
  const r = SL.runout(z, nx, ny, dx, new Uint8Array(nx * ny), 0.3);
  assert.equal(r.n, 0); assert.equal(r.panjang, 0); assert.ok(r.zona.every(v => v === 0));
});
test("H/L tidak sah ditolak", () => {
  for (const hl of [0, -1, NaN, Infinity, 0.05, 0.7]) assert.throws(() => SL.runout(z, nx, ny, dx, sumber(), hl), /H\/L/, `H/L ${hl} harus ditolak`);
});
test("tidak naik melewati punggungan", () => {
  const z2 = Float32Array.from(z); for (let j = 0; j < ny; j++) z2[j * nx + 10] = 700; /* tembok di i=10 */
  const r = SL.runout(z2, nx, ny, dx, sumber(), 0.1);
  assert.equal(r.zona[2 * nx + 10], 0, "sel di punggungan lebih tinggi dari sumber tidak boleh dicapai");
});
test("zona H/L lebih besar adalah himpunan bagian dari H/L lebih kecil", () => {
  const besar = SL.runout(z, nx, ny, dx, sumber(), 0.5), kecil = SL.runout(z, nx, ny, dx, sumber(), 0.2);
  for (let k = 0; k < z.length; k++) if (besar.zona[k]) assert.equal(kecil.zona[k], 1, `sel ${k} di zona H/L 0,5 tapi tidak di H/L 0,2`);
  assert.ok(kecil.n >= besar.n);
});
test("zona tidak pernah memuat sel laut", () => {
  const laut = new Uint8Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 30; i < nx; i++) laut[j * nx + i] = 1;
  const r = SL.runout(z, nx, ny, dx, sumber(), 0.1, SL.urutan(z), laut);
  for (let k = 0; k < z.length; k++) if (laut[k]) assert.equal(r.zona[k], 0, `sel laut ${k} masuk zona`);
  assert.ok(r.n > 0);
});
test("dataran dilalui selama energi sisa; nBaru tidak menghitung sumber", () => {
  const zp = new Float32Array(nx * ny).fill(10), s = new Uint8Array(nx * ny); zp[2 * nx + 30] = 100; s[2 * nx + 30] = 1;
  const r = SL.runout(zp, nx, ny, dx, s, 0.1); /* e=100 turun 1 per 10 m: dataran setinggi 10 dilalui hingga e < 10 */
  assert.ok(r.nBaru > 8, `dataran harus dilalui, nBaru=${r.nBaru}`);
  assert.equal(r.n - r.nBaru, 1);
});
