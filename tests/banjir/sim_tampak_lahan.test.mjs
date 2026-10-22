/* Uji penyambungan tutupan lahan, penduduk per sel, pita, dan kandidat perlakuan di layar genangan (public/banjir/sim_tampak.js, kait _uji).
   Berkas dimuat seperti di peramban (vm) dengan stub data halaman minimal; mesin sesungguhnya dijalankan di kisi kecil. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

function muat() {
  const ctx = vm.createContext({console, $: () => null, nanti: f => setTimeout(f, 0), toast() {}, esc: x => x, tglPendek: x => x, km: () => 99, fmt: n => Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1}), F2: n => Number(n).toFixed(2), WIB: {timeZone: "Asia/Jakarta"},
    S: {hujan: {hari: ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"], hari_ini: "2026-10-13", grid: [{lat: -6.875, lon: 106.875, h: [0, 120, 40, 10, 0], jam: [6, 6, 6, 6, 6], imax: [0, 30, 10, 3, 0], sm: [.3, .3, .3, .3, .3], a7: 10}]},
      sungai: {hari: [], titik: []}, rob: null, geo: {kec: {}}}, Simulasi: {kec: {}, dasar: {}, kode: "32"}});
  ctx.window = ctx;
  for (const f of ["sim_genangan.js", "sim_lahan.js", "sim_tanggap.js", "sim_longsor.js", "sim_tampak.js"]) vm.runInContext(fs.readFileSync(new URL(`../../public/banjir/${f}`, import.meta.url), "utf8"), ctx);
  return ctx;
}
const nx = 16, ny = 12, N = nx * ny;
function siap(c, adaLahan) {
  const T = c.SimTampak.T; T.titik = {lat: -6.9, lon: 106.9, nama: "t", kab: "k"};
  T.dem = {nx, ny, dx: 50, z: new Float64Array(N)}; T.prep = {laut: new Uint8Array(N), acc: new Float64Array(N), nLaut: 0, z: Float64Array.from({length: N}, (_, k) => 5 + (k % nx) * .05)};
  if (adaLahan) { const cn = new Float32Array(N), n = new Float32Array(N); for (let k = 0; k < N; k++) { cn[k] = k % nx < 8 ? 90 : 73; n[k] = k % nx < 8 ? .1 : .12; } T.lahan = {cn, n, bobot: new Float32Array(N).fill(1), proporsi: {50: .5, 10: .5}}; }
  return T;
}

test("susun: tanpa lahan satu CN seragam (hujan global); dengan lahan hujan per kelas CN dan Manning per sel diteruskan ke mesin", () => {
  const c = muat(), U = c.SimTampak._uji; siap(c, false);
  const a = U.susun(), cfa = U.cfgDari(a, false); assert.ok(!a.seri && cfa.hujan && !cfa.hujanKelas && cfa.manning === undefined, "tanpa lahan: jalur lama persis");
  const c2 = muat(), V = c2.SimTampak._uji, T3 = siap(c2, true), b = V.susun(), cfb = V.cfgDari(b, false);
  assert.equal(b.seri.length, 2, "dua CN unik (90 dan 73) = dua seri"); assert.equal(cfb.hujanKelas.length, 2); assert.equal(cfb.kelas.length, N); assert.equal(cfb.manning.length, N);
  assert.ok(cfb.manning[0] === T3.lahan.n[0] && cfb.manning[N - 1] === T3.lahan.n[N - 1], "Manning sel = n lahan sel");
  const tot = s => s.reduce((x, y) => x + y, 0); assert.ok(tot(b.seri[0]) !== tot(b.seri[1]), "CN beda harus menghasilkan limpasan beda");
  const lo = c2.SimGenangan.cnAMC(73, 1), hi = c2.SimGenangan.cnAMC(90, 3); /* CN dirata-rata per hari, tiap hari dengan AMC sendiri */ assert.ok(b.cn > lo && b.cn < hi, `CN rata-rata ${b.cn} harus di antara kelas (${lo}..${hi}, sesudah koreksi kelembapan tanah)`);
  T3.dcn = 5; const g = V.susun(); assert.ok(g.cn > b.cn + 2 && g.cn <= 100, `geser CN +5 harus naik ~5: ${b.cn} -> ${g.cn}`);
});

test("mesin lewat cfg layar dengan lahan: neraca terjaga; peta lahan beragam melimpas lebih banyak dari semua-hutan", () => {
  const c = muat(), U = c.SimTampak._uji, T = siap(c, true), SG = c.SimGenangan;
  const run = () => { const X = U.susun(), cfg = U.cfgDari(X, false); cfg.z = T.prep.z; cfg.jam = 72; cfg.dx = 50; return SG.jalankan(cfg); };
  const a = run(); assert.ok(a.neraca.galat < .01, `galat neraca ${a.neraca.galat}`);
  T.lahan.cn.fill(73); T.lahan.n.fill(.12); const b = run();
  assert.ok(a.neraca.hujan > b.neraca.hujan, "separuh sel terbangun (CN 90) harus memasukkan lebih banyak hujan efektif dari semua pohon (CN 73)");
});

test("popSel dan jiwaJam: total sel = kepadatan x luas darat; jiwa hanya dari sel yang cukup dalam", () => {
  const c = muat(), U = c.SimTampak._uji, T = siap(c, true); T.nJalan = 1;
  T.pend = {sel: .25, grid: [[-6.875, 106.875, 1e5]], kec: {}, sumber: "uji"}; T.hasil = {X: {P: T.titik}, dasar: {}};
  const kp = U.kepadatan(T.titik), pop = U.popSel(), km2 = N * 50 * 50 / 1e6, sum = a => a.reduce((x, y) => x + y, 0);
  assert.ok(Math.abs(sum(pop.lo) - kp[0] * km2) < 1e-6 && Math.abs(sum(pop.hi) - kp[1] * km2) < 1e-6, "jumlah penduduk sel harus = kepadatan x luas darat kotak");
  const R = {nx, ny, kedalaman: new Float32Array(N * 2)}; for (let k = 0; k < 10; k++) R.kedalaman[N + k] = .2; R.kedalaman[N + 10] = .05;
  const j = U.jiwaJam(R, pop, 1, .1); assert.ok(Math.abs(j[0] - 10 * pop.lo[0]) < 1e-9, "hanya 10 sel >= 10 cm yang dihitung (sel 5 cm tidak)");
});

test("format layar: rupiah rentang, waktu, kuantil", () => {
  const U = muat().SimTampak._uji;
  assert.equal(U.rpS(25e6, 50e6), "Rp 25–50 juta"); assert.equal(U.rpS(1.2e9, 2.8e9), "Rp 1,2–2,8 miliar"); assert.equal(U.rpS(3e6, 3e6), "Rp 3,0 juta");
  assert.equal(U.waktu(Infinity), "tak terjangkau"); assert.equal(U.waktu(.5), "30 menit"); assert.equal(U.waktu(2.25), "2,3 jam");
  assert.equal(U.kuantil([5, 1, 3, 2, 4, NaN], .5), 3); assert.equal(U.kuantil([], .5), null);
});

test("sisiKec: kotak mengikuti kecamatan (x 1,1), dibatasi 6-24 km; kecamatan tak dikenal = null", () => {
  const c = muat(), U = c.SimTampak._uji, kotak = (w, h) => ({properties: {kab: "K", kec: "A"}, geometry: {type: "Polygon", coordinates: [[[100, 0], [100 + w, 0], [100 + w, h], [100, h], [100, 0]]]}});
  for (const [w, h, ekspektasi] of [[.02, .02, 6000], [.2, .1, 24000], [.1, .08, 12000], [1, 1, 24000]]) {
    c.S.geo.kec["11"] = {features: [kotak(w, h)]}; assert.equal(U.sisiKec("11|K|A"), ekspektasi, `kotak ${w} x ${h} derajat`); }
  assert.equal(U.sisiKec("11|K|Tak ada"), null);
});
