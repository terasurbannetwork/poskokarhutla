/* Pembanding realisme: skenario setara Merapi 2010 (awan panas ~15-17 km di Kali Gendol, erupsi besar 26 Okt - 5 Nov 2010) lewat model simulasi yang sama
   (Lahar.simulasi + Tanggap.paparanUnit + grid WorldPop). Butuh jaringan (ubin terrarium S3) dan sharp. Jalankan: node scripts/gunungapi/cek_merapi2010.mjs
   Catatan 2010 (BNPB/PVMBG): ~367 meninggal dengan evakuasi, sekitar 350.000 orang mengungsi; zona bahaya diperluas bertahap 10 -> 15 -> 20 km. */
import {readFileSync} from "node:fs";
import sharp from "sharp";
const R = new URL("../../public/gunungapi/", import.meta.url).pathname;
const muat = f => { const m = {exports: {}}; new Function("module", "self", readFileSync(R + f, "utf8"))(m, undefined); return m.exports; };
const L = muat("sim_lahar.js"), T = muat("sim_tanggap.js");
const lat = -7.542, lon = 110.442, Z = 12, JU = 5, n = JU * 256;
const [gx, gy] = L.llKePx(Z, lon, lat), tx0 = Math.floor(gx / 256) - 2, ty0 = Math.floor(gy / 256) - 2, rgba = new Uint8Array(n * n * 4);
for (let i = 0; i < n * n; i++) { rgba[i * 4] = 128; rgba[i * 4 + 3] = 255; }
for (let j = 0; j < JU; j++) for (let i = 0; i < JU; i++) { const b = Buffer.from(await (await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx0 + i}/${ty0 + j}.png`)).arrayBuffer()), {data} = await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const o = ((j * 256 + y) * n + i * 256 + x) * 4, q = (y * 256 + x) * 4; rgba[o] = data[q]; rgba[o + 1] = data[q + 1]; rgba[o + 2] = data[q + 2]; } }
const dem = L.elevasi(rgba, n * n), pop = JSON.parse(readFileSync(R + "data/pop/merapi.json", "utf8")), pusat = [gx - tx0 * 256, gy - ty0 * 256];
const hasil = [];
for (const [nama, V, hl] of [["bawaan layar (V 1 jt m3, H/L 0,3)", 1e6, 0.3], ["setara 2010 (V 10 jt m3, H/L 0,18)", 1e7, 0.18], ["setara 2010 (V 10 jt m3, H/L 0,15)", 1e7, 0.15]]) {
  const r = L.simulasi({dem, n, m: n, z: Z, lat, pusat, V, hl}), u = T.paparanUnit(pop, r, (x, y) => L.pxKeLL(Z, tx0 * 256 + x + .5, ty0 * 256 + y + .5), n, (r.dx / 1000) ** 2, 1);
  const terpapar = u.reduce((a, x) => a + x.jiwa * x.frak, 0); hasil.push({nama, pdc_km: +r.ringkas.pdc_km.toFixed(1), lahar_km: +r.ringkas.lahar_km.toFixed(1), terpapar: Math.round(terpapar), rasio_367: +(terpapar / 367).toFixed(1)});
}
console.table(hasil);
