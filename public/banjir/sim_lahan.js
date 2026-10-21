"use strict";
/* sim_lahan.js: tutupan lahan nyata per sel untuk simulasi genangan, murni (tanpa DOM). Dipakai tiga cara seperti sim_genangan.js:
   <script> di halaman (window.SimLahan), importScripts di sim_kerja.js, dan vm di tests/banjir/sim_lahan.test.mjs.
   Sumber: ESA WorldCover 2021 v200 (10 m, 11 kelas, CC BY 4.0) lewat ubin PNG Microsoft Planetary Computer (ber-CORS). Tiap sel
   disampel 3x3 titik; CN SCS dan Manning n per sel = rata-rata nilai kelas titik-titiknya. Hasilnya menggantikan CN 80 dan n 0,06
   seragam. Nilai kelas = ASUMSI (pilihan tengah dari tabel rujukan, tanah kelompok C); gagal memuat = pemanggil kembali ke nilai seragam. */
(function (akar) {
const salah = m => { throw new Error("SimLahan: " + m); };
/* kode ESA: [nama, CN kondisi II tanah C, n Manning, bobot penduduk relatif]
   CN: USDA TR-55 (1986) tabel 2-2a..2-2d, kelompok C: pohon = hutan "fair" 73; semak = brush fair 70; rumput = pasture fair 79;
   lahan tanam = row crops baris lurus kondisi baik 85; terbangun = permukiman 65 % kedap 90; lahan terbuka = fallow 91;
   air 100; lahan basah dan bakau 90 / 85 (tanah jenuh, asumsi); lumut 79 (disamakan rumput); salju/es 98.
   n: Chow (1959) tabel 5-6 dataran banjir dan tabel nilai n untuk NLCD (Kalyanapu dkk. 2009; HEC-RAS 2D, USACE):
   pohon 0,12; semak 0,08; rumput 0,035; lahan tanam 0,04; terbangun 0,10; terbuka 0,03; air 0,035; lahan basah 0,07; bakau 0,12.
   Bobot penduduk: terbangun 1; lahan tanam 0,12; rumput 0,04; semak 0,03; pohon 0,02; terbuka 0,02, lainnya 0 (ASUMSI, menyebar
   penduduk kotak ke sel yang berpermukiman; bukan peta penduduk). */
const KELAS = {
  10: ["Pohon", 73, .12, .02, [0, 100, 0]], 20: ["Semak", 70, .08, .03, [255, 187, 34]], 30: ["Rumput", 79, .035, .04, [255, 255, 76]],
  40: ["Lahan tanam", 85, .04, .12, [240, 150, 255]], 50: ["Terbangun", 90, .10, 1, [250, 0, 0]], 60: ["Lahan terbuka", 91, .03, .02, [180, 180, 180]],
  70: ["Salju/es", 98, .03, 0, [240, 240, 240]], 80: ["Air", 100, .035, 0, [0, 100, 200]], 90: ["Lahan basah", 90, .07, 0, [0, 150, 160]],
  95: ["Bakau", 85, .12, 0, [0, 207, 117]], 100: ["Lumut", 79, .05, 0, [250, 230, 160]],
};
const PETA_WARNA = new Map(Object.entries(KELAS).map(([k, v]) => [v[4][0] << 16 | v[4][1] << 8 | v[4][2], +k]));
/* piksel RGBA -> kode ESA; 0 = tak diketahui (transparan atau warna di luar palet) */
function kelasDariRGB(r, g, b, a = 255) {
  if (a < 128) return 0; const k = PETA_WARNA.get(r << 16 | g << 8 | b); if (k) return k;
  let best = 0, bd = 300; for (const [c, id] of PETA_WARNA) { const d = ((c >> 16) - r) ** 2 + ((c >> 8 & 255) - g) ** 2 + ((c & 255) - b) ** 2; if (d < bd) { bd = d; best = id; } }
  return best;
}
const URL_WC = "https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}.png?collection=esa-worldcover&item={item}&assets=map&colormap_name=esa-worldcover";
/* ubin 3x3 derajat: ESA_WorldCover_10m_2021_v200_S03E105 (sudut barat daya) */
function itemId(lat, lon) {
  const la = Math.floor(lat / 3) * 3, lo = Math.floor(lon / 3) * 3, p = (v, n) => String(Math.abs(v)).padStart(n, "0");
  return `ESA_WorldCover_10m_2021_v200_${la < 0 ? "S" : "N"}${p(la, 2)}${lo < 0 ? "W" : "E"}${p(lo, 3)}`;
}
const dariDunia = (x, y, z) => { const n = 256 * 2 ** z; return [x / n * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI]; };
/* unduh satu ubin PNG -> RGBA 256x256; 404 (di luar ubin item) = null */
async function bacaPNG(url) {
  const r = await fetch(url, {signal: AbortSignal.timeout(20000)}); if (r.status === 404) return null; if (!r.ok) salah(`ubin HTTP ${r.status}`);
  const bm = await createImageBitmap(await r.blob(), {colorSpaceConversion: "none", premultiplyAlpha: "none"});
  const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement("canvas"), {width: 256, height: 256});
  const g = cv.getContext("2d", {willReadFrequently: true}); g.drawImage(bm, 0, 0); return g.getImageData(0, 0, 256, 256).data;
}
const SUB = 3;
/* K = rencanaKisi (nx, ny, zoom, s, x0, y0). Kembali {cn, n, bangun, bobot, dom, proporsi, kosong, gagal, ubin} atau null bila > 30 % ubin gagal
   atau < 50 % sel punya data. bacaUbin(url) -> RGBA 256x256 | null (disuntik supaya bisa diuji tanpa jaringan). */
async function kisiLahan(K, bacaUbin = bacaPNG, dasar = {cn: 80, n: .06}) {
  const {nx, ny, zoom, s, x0, y0} = K, N = nx * ny, lat0 = K.lat, zw = Math.max(12, Math.min(14, Math.ceil(Math.log2(156543.03 * Math.cos(lat0 * Math.PI / 180) * 3 / (K.dx)))));
  const f = 2 ** (zw - zoom), tx0 = Math.floor(x0 * f / 256), ty0 = Math.floor(y0 * f / 256), tx1 = Math.floor((x0 + nx * s) * f / 256), ty1 = Math.floor((y0 + ny * s) * f / 256);
  ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) <= 64) || salah("area terlalu besar untuk ubin tutupan lahan");
  const ubin = new Map(); let gagal = 0, total = 0;
  const tugas = []; for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) tugas.push([tx, ty]);
  await Promise.all(tugas.map(async ([tx, ty]) => {
    const sudut = [[0, 0], [256, 0], [0, 256], [256, 256]].map(([a, b]) => dariDunia(tx * 256 + a, ty * 256 + b, zw)), item = [...new Set(sudut.map(([lo, la]) => itemId(la, lo)))];
    total++; try { const im = await Promise.all(item.map(it => bacaUbin(URL_WC.replace("{z}", zw).replace("{x}", tx).replace("{y}", ty).replace("{item}", it)))); ubin.set(tx + "," + ty, im.filter(Boolean)); } catch (e) { gagal++; } }));
  if (gagal > total * .3) return null;
  const cn = new Float32Array(N), n = new Float32Array(N), bangun = new Float32Array(N), bobot = new Float32Array(N), dom = new Uint8Array(N), cacah = {};
  let kosong = 0; const c = new Int16Array(101);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let sc = 0, sn = 0, sb = 0, sw = 0, m = 0; c.fill(0);
    for (let b = 0; b < SUB; b++) for (let a = 0; a < SUB; a++) {
      const X = (x0 + (i + (a + .5) / SUB) * s) * f, Y = (y0 + (j + (b + .5) / SUB) * s) * f, tx = Math.floor(X / 256), ty = Math.floor(Y / 256), im = ubin.get(tx + "," + ty); if (!im) continue;
      const o = (Math.min(255, Math.floor(Y - ty * 256)) * 256 + Math.min(255, Math.floor(X - tx * 256))) * 4; let k = 0;
      for (const d of im) { k = kelasDariRGB(d[o], d[o + 1], d[o + 2], d[o + 3]); if (k) break; }
      if (!k) continue; const v = KELAS[k]; sc += v[1]; sn += v[2]; sw += v[3]; if (k === 50) sb++; c[k]++; cacah[k] = (cacah[k] || 0) + 1; m++; }
    const q = j * nx + i;
    if (!m) { kosong++; cn[q] = dasar.cn; n[q] = dasar.n; continue; }
    cn[q] = sc / m; n[q] = sn / m; bobot[q] = sw / m; bangun[q] = sb / m; let bk = 0; for (let k = 10; k <= 100; k++) if (c[k] > c[bk]) bk = k; dom[q] = bk;
  }
  if (kosong > N * .5) return null;
  const tot = Object.values(cacah).reduce((x, y) => x + y, 0), proporsi = Object.fromEntries(Object.entries(cacah).map(([k, v]) => [k, v / tot]));
  return {cn, n, bangun, bobot, dom, proporsi, kosong, gagal, ubin: total, zoomLahan: zw};
}
/* ringkasan teks untuk layar: kelas terbesar dulu, hanya yang >= 3 % */
const ringkasLahan = L => Object.entries(L.proporsi).filter(([, v]) => v >= .03).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({kode: +k, nama: KELAS[k][0], bagian: v}));
/* sebaran penduduk kotak ke sel: total [lo, hi] jiwa dibagi menurut bobot lahan sel darat; tanpa lahan = rata. Kembali Float64Array [lo, hi] per sel */
function sebarPenduduk(total, bobot, laut) {
  const N = laut.length; let sw = 0; const w = new Float64Array(N);
  for (let k = 0; k < N; k++) if (!laut[k]) { w[k] = bobot ? bobot[k] : 1; sw += w[k]; }
  if (!(sw > 0)) for (let k = 0; k < N; k++) if (!laut[k]) { w[k] = 1; sw++; }
  const lo = new Float64Array(N), hi = new Float64Array(N);
  for (let k = 0; k < N; k++) { lo[k] = total[0] * w[k] / sw; hi[k] = total[1] * w[k] / sw; }
  return {lo, hi};
}
const API = {KELAS, kelasDariRGB, itemId, kisiLahan, ringkasLahan, sebarPenduduk, bacaPNG, URL_WC};
if (typeof module !== "undefined" && module.exports) module.exports = API; else akar.SimLahan = API;
})(typeof self !== "undefined" ? self : globalThis);
