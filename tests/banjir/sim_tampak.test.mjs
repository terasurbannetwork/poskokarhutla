/* Uji fungsi masukan layar genangan (public/banjir/sim_tampak.js) lewat kait _uji: skenario hujan, luapan sungai, kepadatan
   penduduk, penyusunan masukan mesin. Berkas dimuat seperti di peramban (vm) dengan stub data halaman minimal. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

function muat(data) {
  const ctx = vm.createContext({console, km: (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); },
    fmt: n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1}), WIB: {timeZone: "Asia/Jakarta"}, ...data});
  ctx.window = ctx;
  for (const f of ["sim_genangan.js", "sim_longsor.js", "sim_tampak.js"]) vm.runInContext(fs.readFileSync(new URL(`../../public/banjir/${f}`, import.meta.url), "utf8"), ctx);
  return ctx;
}
const sel = (lat, lon, h) => ({lat, lon, h, jam: [6, 6, 6, 6, 6], imax: h.map(x => x / 3), sm: [.3, .3, .3, .3, .3], a7: 10});
const dasar = () => ({S: {hujan: {hari: ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"], hari_ini: "2026-10-13", grid: [sel(-6.875, 106.875, [0, 60, 10, 5, 0])]},
  sungai: {hari: ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"], titik: []}, rob: null, geo: {kec: {}}},
  Simulasi: {kec: {}, dasar: {}, kode: "32", ens: {hari: ["2026-10-13", "2026-10-14", "2026-10-15"], grid: [{lat: -6.875, lon: 106.875, p50: [.3, .5, 0], p100: [0, .2, 0]}]}}});

test("ansambel basah: hanya hari dengan peluang >= 10 % yang lebih basah dari prakiraan; hari lain ditandai tetap", () => {
  const c = muat(dasar()), U = c.SimTampak._uji, T = c.SimTampak.T; T.titik = {lat: -6.9, lon: 106.9};
  const M = U.masukan(T.titik); assert.ok(M.ens, "titik ansambel <= 1 derajat harus ditemukan");
  T.sk = "ansambel"; const h = U.hariSkenario(M);
  /* Array.from: larik dari realm vm berprototipe lain, deepStrictEqual menolaknya walau isinya sama */
  assert.deepEqual(Array.from(h, x => x.p), [60, 100, 5], "hari 1: 50 mm < prakiraan 60 tetap; hari 2: P(>=100) 0,2 -> 100; hari 3: peluang 0 tetap");
  assert.deepEqual(Array.from(h, x => x.ubah), [false, true, false]);
  T.sk = "dasar"; assert.ok(U.hariSkenario(M).every(x => !x.ubah), "prakiraan tidak boleh menandai perubahan");
});

test("hujan ekstrem: jumlah 3 hari persis sesuai pilihan, juga saat prakiraan kering", () => {
  const c = muat(dasar()), U = c.SimTampak._uji, T = c.SimTampak.T; T.titik = {lat: -6.9, lon: 106.9}; T.sk = "ekstrem"; T.op.ekstrem = 300;
  const jml = h => h.reduce((a, x) => a + x.p, 0);
  assert.ok(Math.abs(jml(U.hariSkenario(U.masukan(T.titik))) - 300) < 1e-9);
  const kering = U.hariSkenario({hari: [{p: 0, jam: 0, imax: 0}, {p: 0, jam: 0, imax: 0}, {p: 0, jam: 0, imax: 0}]});
  assert.ok(Math.abs(jml(kering) - 300) < 1e-9 && kering.every(x => x.p === 100));
});

test("luapan sungai: hanya debit di atas Q2, tak pernah negatif; skenario Q20 memuncak tepat di jam 30", () => {
  const c = muat(dasar()), U = c.SimTampak._uji, T = c.SimTampak.T;
  const sg = {q: [80, 90, 150, 120, 60], q2: 100, q5: 200, q20: 400};
  T.sk = "dasar"; const o = U.luapan(sg);
  assert.equal(o.length, 73); assert.ok(o.every(v => v >= 0), "luapan negatif");
  assert.equal(o[12], 0, "jam 12 hari ini (90 m3/dtk) di bawah Q2 harus 0"); assert.ok(Math.abs(o[36] - 50) < 1e-9, `jam 36 = 150 - 100, dapat ${o[36]}`);
  T.sk = "sungai"; T.op.sungai = 3; const s = U.luapan(sg); assert.ok(Math.abs(s[30] - 300) < 1e-9, `puncak Q20 - Q2 = 300, dapat ${s[30]}`);
  T.op.sungai = 2; assert.ok(Math.abs(U.luapan(sg)[30] - 100) < 1e-9, "puncak Q5 - Q2 = 100");
});

test("kepadatan: titik pilihan = rentang lebar orde besaran; kecamatan = antara sel dan rata-rata kecamatan; tanpa data = null", () => {
  const d = dasar(); d.S.geo.kec["32"] = {features: [{properties: {kab: "K", kec: "A"}, geometry: {type: "Polygon", coordinates: [[[106.8, -6.9], [106.9, -6.9], [106.9, -6.8], [106.8, -6.8], [106.8, -6.9]]]}}]};
  const c = muat(d), U = c.SimTampak._uji, T = c.SimTampak.T, luasSel = (.25 * 111.32) ** 2 * Math.cos(-6.875 * Math.PI / 180);
  T.pend = {sel: .25, grid: [[-6.875, 106.875, 500000, "32"], [-6.875, 106.875, 270000, "36"]], kec: {"32|K|A": 120000}};
  T.titik = {lat: -6.85, lon: 106.85}; const a = U.kepadatan(T.titik), ds = 770000 / luasSel;
  assert.ok(Math.abs(a[0] - ds / 3) < 1e-6 && Math.abs(a[1] - ds * 3) < 1e-6, `titik: ${a}`);
  T.titik = null; T.k = "32|K|A"; const b = U.kepadatan({lat: -6.85, lon: 106.85}), dk = 120000 / (.1 * .1 * 111.32 ** 2 * Math.cos(-6.9 * Math.PI / 180));
  assert.ok(Math.abs(b[0] - Math.min(ds, dk)) / dk < 1e-6 && Math.abs(b[1] - Math.max(ds, dk)) / dk < 1e-6, `kecamatan: ${b} vs ${ds}, ${dk}`);
  T.titik = {lat: 2, lon: 99}; T.cache.kp = null; assert.equal(U.kepadatan(T.titik), null, "sel tanpa penduduk = tak ada estimasi");
  assert.equal(U.orde(476), "500"); assert.equal(U.orde(12345), "10.000"); assert.equal(U.orde(0), "0");
});

test("susun: luapan disuntik di sel akumulasi terbesar dekat titik sungai; laut tanpa rob memakai muka asumsi", () => {
  const d = dasar(); const c = muat(d), SG = c.SimGenangan, U = c.SimTampak._uji, T = c.SimTampak.T;
  const K = SG.rencanaKisi(-6.9, 106.9, 3000, 30), n = 30, z = new Float64Array(n * n);
  for (let k = 0; k < z.length; k++) { const i = k % n, j = (k / n) | 0; z[k] = i < 2 ? -3 : 2 + Math.abs(j - 15) * .5 + i * .2; } /* lembah ke barat, laut di kolom 0-1 */
  T.dem = {...K, z}; T.prep = SG.siapkanArea(T.dem, c.SimLongsor.lereng); T.titik = {lat: -6.9, lon: 106.9}; T.sk = "dasar"; T.cache = {};
  d.S.sungai.titik.push({lat: -6.9, lon: 106.9, kec: "X", q: [50, 300, 300, 300, 50], q2: 100, q5: 200, q20: 400});
  const X = U.susun();
  assert.ok(X.sungai && X.sungai.k >= 0, "sungai dalam area harus disuntik");
  const r = 3000 / K.dx, [ci, cj] = SG.keSel(T.dem, 106.9, -6.9); let best = -1;
  for (let k = 0; k < n * n; k++) { const i = k % n, j = (k / n) | 0; if (!T.prep.laut[k] && (i - ci) ** 2 + (j - cj) ** 2 <= r * r && (best < 0 || T.prep.acc[k] > T.prep.acc[best])) best = k; }
  assert.equal(X.sungai.k, best, "titik suntik = akumulasi terbesar dalam radius 3 km");
  assert.ok(Math.max(...X.sungai.q) > 0 && X.sungai.q.every(v => v >= 0));
  assert.ok(T.prep.nLaut > 0 && X.mukaSumber === "asumsi" && Math.abs(Math.max(...X.muka) - .5) < 1e-9, `muka asumsi 0,5 m, dapat ${X.muka && Math.max(...X.muka)}`);
  const cfg = U.cfgDari(X, false); assert.equal(cfg.masuk[0].k, X.sungai.k); assert.ok(SG.jalankan(cfg).neraca.galat < 1e-9, "masukan tersusun harus bisa dijalankan mesin");
});
