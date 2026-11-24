/* H34: kasus Ciwidey. Menjalankan SimDampak.ringkas (public/cuaca/sim_dampak.js, tanpa diubah) untuk kecamatan Ciwidey + Pasirjambu.
   Paparan = penduduk WorldPop per kecamatan (public/data/penduduk.json), dikonversi ke rumah oleh sim sendiri (jiwa_rumah).
   Pakai: node scripts/cuaca/kasus_ciwidey.mjs  (cetak JSON: tabel embusan x fraksi lajur) */
import {readFileSync} from "node:fs";
await import("../../public/cuaca/sim_dampak.js");
const S = globalThis.SimDampak;
const pen = JSON.parse(readFileSync(new URL("../../public/data/penduduk.json", import.meta.url)));
const KEC = ["32|Bandung|Ciwidey", "32|Bandung|Pasirjambu"], pop = Object.fromEntries(KEC.map(k => [k, pen.kec[k]]));
if (KEC.some(k => !(pop[k] > 0))) throw new Error("kecamatan tidak ada di penduduk.json");
const GUST = [60, 80, 100, 120, 150], FRAC = [.1, .25, .5, 1], nol = [Float32Array.of(0), Float32Array.of(0), Float32Array.of(0)];
const hit = (g, f) => { // satu titik per kecamatan: hanya porsi f penduduk yang kena embusan g; sisanya embusan 0
  const pts = KEC.map(k => ({lat: -7.1, lon: 107.4, w: pop[k] * f, k: "p", elev: 100, lereng: 0}));
  const st = S.baru(pts.length, 1); st.gmax.fill(g);
  const r = S.ringkas(pts, st, nol, []); return {atap: r.rumahAtap, pohon: r.rumahPohon};
};
const rumah = Object.fromEntries(KEC.map(k => [k, pop[k] / S.PARAM.jiwa_rumah[0]]));
const tabel = GUST.map(g => ({gust: g, pAtap: S.pAtap(g), pPohon: S.pPohon(g), baris: FRAC.map(f => ({frac: f, ...hit(g, f)}))}));
console.log(JSON.stringify({sumber: pen.sumber, pop, jiwa_rumah: S.PARAM.jiwa_rumah[0], rumah, rumahTotal: Object.values(rumah).reduce((a, b) => a + b), tabel}, null, 1));
