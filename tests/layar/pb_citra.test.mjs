// PB-81.1 (F-41, D15, D16): mesin bersama banding citra dan timelapse (public/inti/banding.js, timelapse.js), dipasang di /gunungapi dan /cuaca.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
function muat(berkas, ekstra = {}) {
  const win = {}; win.window = win;
  const ctx = vm.createContext({window: win, console, Date, Math, JSON, Number, Object, Array, Promise, URL, setTimeout, clearTimeout, requestAnimationFrame: f => setTimeout(f, 0),
    document: {addEventListener() {}, getElementById: () => null}, fetch: undefined, ...ekstra});
  vm.runInContext(baca(berkas), ctx); return win;
}
const B = muat("public/inti/banding.js").BandingInti.model, T = muat("public/inti/timelapse.js").TimelapseInti.model;
const kini = Date.parse("2026-11-16T10:00:00Z");
const SAT = {k: "sat", nama: "Citra", pendek: "Warna asli", lap: t => t < "2018-03-01" ? "MODIS_Terra_CorrectedReflectance_TrueColor" : "VIIRS_NOAA20_CorrectedReflectance_TrueColor", fmt: "jpg", lv: 9, mz: 9, atr: "VIIRS", dari: "2000-02-24"};
const SO2 = {k: "so2", nama: "Gas SO2", pendek: "Gas SO2", lap: "AIRS_Prata_SO2_Index_Day", fmt: "png", lv: 6, mz: 6, atr: "AIRS", dari: "2012-05-08", dasar: true};

test("registri: hanya bencana dengan layar.citra true (dan bukan karhutla) yang diizinkan", () => {
  const reg = [{id: "gunungapi", kemampuan: {layar: {citra: true}}}, {id: "cuaca", kemampuan: {layar: {citra: false}}}, {id: "karhutla", kemampuan: {layar: {citra: true}}}, {id: "gempa", kemampuan: {}}];
  for (const M of [B, T]) { assert.equal(M.izinReg(reg, "gunungapi"), true); assert.equal(M.izinReg(reg, "cuaca"), false); assert.equal(M.izinReg(reg, "karhutla"), false, "karhutla memakai berkas lamanya");
    assert.equal(M.izinReg(reg, "gempa"), false); assert.equal(M.izinReg([], "gunungapi"), false); assert.equal(M.izinReg(null, "gunungapi"), false); }
});
test("registri nyata: kunci layar.citra ada di gunungapi dan cuaca", () => {
  const r = JSON.parse(baca("public/bencana.json")).bencana;
  for (const id of ["gunungapi", "cuaca"]) assert.equal(typeof r.find(b => b.id === id).kemampuan.layar.citra, "boolean", id);
});
test("tanggal: tidak ada sesudah kemarin atau sebelum awal data lapisan (D16)", () => {
  assert.equal(B.kemarin(kini), "2026-11-15"); assert.equal(B.tglSah(SAT, "2026-11-15", kini), true); assert.equal(B.tglSah(SAT, "2026-11-16", kini), false, "hari ini belum ada citra penuh");
  assert.equal(B.tglSah(SO2, "2012-05-07", kini), false); assert.equal(B.tglSah(SO2, "2012-05-08", kini), true); assert.equal(B.tglSah(SAT, "rusak", kini), false);
  assert.equal(B.tglKlem(SO2, "2010-01-01", kini), "2012-05-08"); assert.equal(B.tglKlem(SAT, "2030-01-01", kini), "2026-11-15");
});
test("url GIBS: lapisan warna asli memilih MODIS sebelum Mar 2018 dan VIIRS sesudahnya; level dan format sesuai lapisan", () => {
  assert.match(B.urlGibs(SAT, "2017-01-01"), /MODIS_Terra_CorrectedReflectance_TrueColor\/default\/2017-01-01\/GoogleMapsCompatible_Level9\/\{z\}\/\{y\}\/\{x\}\.jpg$/);
  assert.match(B.urlGibs(SAT, "2026-11-01"), /VIIRS_NOAA20_CorrectedReflectance_TrueColor/);
  assert.match(B.urlGibs(SO2, "2026-11-01"), /AIRS_Prata_SO2_Index_Day\/default\/2026-11-01\/GoogleMapsCompatible_Level6\/\{z\}\/\{y\}\/\{x\}\.png$/);
  assert.match(T.urlUbin(SO2, "2026-11-01", 5, 10, 20), /Level6\/5\/10\/20\.png$/);
});
test("label sisi menyebut sumber dan tanggal citra", () => {
  const byk = {sat: SAT, so2: SO2};
  const [a, b] = B.label({j: "sat", tgl: "2026-11-09"}, byk); assert.equal(a, "2026"); assert.match(b, /NASA GIBS/); assert.match(b, /9 Nov 2026/);
  assert.match(B.label({j: "so2", tgl: "2026-01-02"}, byk)[1], /Gas SO2, 2 Jan 2026/); assert.deepEqual(stabil(B.label({j: "utama"}, byk)), ["Kini", "Peta utama"]);
  for (const s of [{j: "sat", tgl: "2026-11-09"}, {j: "utama"}, {j: "esri"}]) assert.ok(!B.label(s, byk).join("").includes("·"), "tanpa titik tengah");
});
test("usulan pasangan: dua bawaan ditambah satu per lapisan lain; tanggal masuk jendela data", () => {
  const p = B.preset([SAT, SO2], kini); assert.equal(p.length, 3);
  assert.deepEqual(stabil(p[0][2]), [{j: "sat", tgl: "2026-11-08"}, {j: "sat", tgl: "2026-11-15"}]); assert.deepEqual(stabil(p[1][2]), [{j: "utama"}, {j: "sat", tgl: "2026-11-15"}]);
  assert.deepEqual(stabil(p[2][2]), [{j: "sat", tgl: "2026-11-15"}, {j: "so2", tgl: "2026-11-15"}]);
  assert.equal(B.preset([SAT], kini).length, 2);
});
test("gaya peta: lapisan transparan dialasi citra Esri, warna asli tidak; atribusi memuat NASA GIBS dan tanggal", () => {
  const byk = {sat: SAT, so2: SO2}, g = B.gaya({j: "so2", tgl: "2026-11-09"}, byk), id = g.layers.map(l => l.id);
  assert.deepEqual(stabil(id), ["bg", "esri", "gibs"]); assert.match(g.sources.gibs.attribution, /NASA GIBS, AIRS, 9 Nov 2026/); assert.equal(g.sources.gibs.maxzoom, 6);
  assert.deepEqual(stabil(B.gaya({j: "sat", tgl: "2026-11-09"}, byk).layers.map(l => l.id)), ["bg", "gibs"]); assert.deepEqual(stabil(B.gaya({j: "esri"}, byk).layers.map(l => l.id)), ["bg", "esri"]);
});
test("timelapse: hari frame tertua dulu, berakhir kemarin, maksimum 30; zoom dibatasi level lapisan dan 16 ubin", () => {
  const h = T.hariFrame(7, kini); assert.equal(h.length, 7); assert.equal(h[0], "2026-11-09"); assert.equal(h.at(-1), "2026-11-15"); assert.equal(T.hariFrame(99, kini).length, T.MAXF);
  const P = T.rencana([95, -11, 141, 6], 640, 6); assert.ok(P.z <= 6 && P.z >= 1); assert.ok(P.W >= 64 && P.H >= 64);
  const Q = T.rencana([106.5, -6.5, 107.5, -5.5], 640, 9); assert.ok(Q.z <= 9);
  const ub = (b, z) => (Math.floor((b[2] + 180) / 360 * 2 ** z) - Math.floor((b[0] + 180) / 360 * 2 ** z) + 1); assert.ok(ub([106.5, -6.5, 107.5, -5.5], Q.z) <= 16);
});
test("adaptor: gunung api dan cuaca punya warna asli sebagai lapisan pertama, nama lapisan GIBS yang sah, id sesuai", () => {
  for (const [id, lain] of [["gunungapi", "AIRS_Prata_SO2_Index_Day"], ["cuaca", "VIIRS_NOAA20_Brightness_Temp_BandI5_Day"]]) {
    const win = {}; win.window = win;
    const ctx = vm.createContext({window: win, BandingInti: {pasang(a) { win.a = a; }}, TimelapseInti: {pasang() {}}, document: {getElementById: () => null}, peta: null});
    vm.runInContext(baca(`public/${id}/citra.js`), ctx); const a = win.a; assert.equal(a.id, id); assert.equal(a.lapisan[0].k, "sat"); assert.equal(a.lapisan[0].dasar, undefined);
    assert.equal(a.lapisan.length, 2); assert.equal(a.lapisan[1].lap, lain); assert.equal(a.lapisan[1].dasar, true);
    for (const L of a.lapisan) { assert.ok(L.atr && L.nama && L.pendek && L.dari); assert.ok(L.lv >= L.mz || L.lv === L.mz, "level GIBS = zoom maksimum"); assert.equal(L.lv, L.mz); }
  }
});
test("pemasangan: index.html memuat css dan mesin sebelum adaptor, dan karhutla tidak disentuh", () => {
  for (const id of ["gunungapi", "cuaca"]) { const h = baca(`public/${id}/index.html`);
    for (const s of ["inti/banding.css", "inti/timelapse.css", "inti/banding.js", "inti/timelapse.js", 'src="citra.js"']) assert.ok(h.includes(s), id + " " + s);
    assert.ok(h.indexOf("inti/banding.js") < h.indexOf('src="citra.js"') && h.indexOf("inti/timelapse.js") < h.indexOf('src="citra.js"'));
    assert.ok(h.indexOf('src="citra.js"') > h.indexOf('src="peta.js"'), "adaptor sesudah peta.js"); }
  const k = baca("public/index.html"); assert.ok(k.includes('src="banding.js"') && k.includes('src="timelapse.js"')); assert.ok(!k.includes("inti/banding") && !k.includes("inti/timelapse"));
});
test("selera: pembatas digeser lewat rAF, tanpa warna literal di CSS, tanpa titik tengah di teks tampilan, tanpa kata aman", () => {
  const b = baca("public/inti/banding.js"); assert.match(b, /rafP = requestAnimationFrame/); assert.match(b, /g\.onpointermove = e => \{ if \(r\) atur\(/);
  assert.match(b, /await new Promise\(r => tunda\(r\)\); buatPeta\(\)/, "peta dibuat sesudah kerangka tampil");
  for (const f of ["public/inti/banding.css", "public/inti/timelapse.css"]) assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(/i.test(baca(f).replace(/\/\*[\s\S]*?\*\//g, "")), f + " literal warna");
  for (const f of ["public/inti/banding.js", "public/inti/timelapse.js", "public/gunungapi/citra.js", "public/cuaca/citra.js"]) { const t = baca(f); assert.ok(!/\baman\b/i.test(t), f + " kata aman"); assert.ok(!/[^\\w]·[^\\w]/.test(t.replace(/\/\*[\s\S]*?\*\//g, "")), f + " titik tengah"); }
});
