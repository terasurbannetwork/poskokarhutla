// Self-check klip Indonesia (public/inti/peta/nasa.js): titik dalam poligon, bungkus URL, ubin di luar kotak tanpa fetch.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm"; import zlib from "node:zlib";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
let fetchan = [], protokol = {};
const win = {maplibregl: {getVersion: () => "4.7.1", addProtocol: (n, f) => protokol[n] = f}, document: {getElementById: () => null}};
win.window = win;
const ctx = vm.createContext({window: win, maplibregl: win.maplibregl, atob, Uint8Array, Blob, Math, console, Path2D: class {}, OffscreenCanvas: class {},
  fetch: async u => { fetchan.push(u); return {json: async () => JSON.parse(baca("public/data/geo/batas_indonesia.json"))}; }});
vm.runInContext(baca("public/inti/peta/nasa.js"), ctx);
const N = win.NASA;
test("titik dalam/luar Indonesia", async () => {
  const B = await N.batas();
  for (const [x, y] of [[106.85, -6.2], [110.4, -7.8], [140.7, -2.5], [95.3, 5.55]]) assert.ok(N.dalam(B, x, y), `${x},${y}`);
  for (const [x, y] of [[101.69, 3.14], [103.82, 1.35], [115, -25], [77.2, 28.6], [114.9, 4.9]]) assert.ok(!N.dalam(B, x, y), `${x},${y}`);
});
test("bungkus URL: https dibungkus, geoportal Kemenhut tidak", () => {
  const [a, b] = N.klip(["https://tiles.globalforestwatch.org/x/{z}/{x}/{y}.png", "https://geoportal.planologi.kehutanan.go.id/e?bbox={bbox-epsg-3857}"]);
  assert.equal(a, "indo://{z}/{x}/{y}/https://tiles.globalforestwatch.org/x/{z}/{x}/{y}.png"); assert.ok(b.startsWith("https://geoportal"));
  assert.ok(protokol.indo);
});
test("ubin di luar kotak Indonesia: transparan, tanpa fetch ubin", async () => {
  fetchan = []; await N.batas();
  const r = await protokol.indo({url: "indo://5/10/10/https://contoh.org/a.png"}, {signal: {}});   // Eropa barat
  assert.ok(r.data.byteLength > 0 && !fetchan.some(u => u.includes("contoh.org")));
  /* piksel IDAT harus benar-benar tembus: PNG lama berisi biru opak dan tampil sebagai kotak biru di laut */
  const png = Buffer.from(r.data), i = png.indexOf("IDAT"), px = zlib.inflateSync(png.subarray(i + 4, i + 4 + png.readUInt32BE(i - 4)));
  assert.equal(px[px.length - 1], 0, "alpha ubin kosong harus 0");
});
