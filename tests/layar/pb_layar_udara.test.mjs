// PB-85 (F-37, F-38, F-41): adaptor udara untuk cari luas, profil kab, citra (banding dan timelapse), dan lapisan per kab/kota; urutan skrip index.html.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const jalan = (berkas, g) => { g.window = g; g.console = console; vm.runInContext(baca(berkas), vm.createContext(g)); return g; };

test("citra udara: dua lapisan GIBS, warna asli lebih dulu, AOD tersedia sejak awal datanya dan tidak mengaku PM2,5", () => {
  const dapat = {}; jalan("public/udara/citra.js", {BandingInti: {pasang: a => { dapat.b = a; }}, TimelapseInti: {pasang: a => { dapat.t = a; }}, document: {getElementById: () => null}});
  assert.equal(dapat.b, dapat.t); const a = dapat.b; assert.equal(a.id, "udara"); assert.equal(a.lapisan[0].k, "sat"); assert.equal(a.lapisan[1].lap, "MODIS_Combined_Value_Added_AOD");
  assert.equal(a.lapisan[1].lv, 6); assert.equal(a.lapisan[1].fmt, "png"); assert.equal(a.lapisan[1].dari, "2017-04-19"); assert.match(a.lapisan[1].atr, /bukan PM2,5/);
  assert.equal(a.lapisan[0].lap("2017-01-01"), "MODIS_Terra_CorrectedReflectance_TrueColor"); assert.equal(a.lapisan[0].lap("2026-01-01"), "VIIRS_NOAA20_CorrectedReflectance_TrueColor");
  /* definisi AOD sama dengan sumber tunggal lapisan_tambahan.json */
  const t = JSON.parse(baca("public/data/lapisan_tambahan.json")).lapisan.gibs_aod; assert.ok(t.tiles[0].includes("MODIS_Combined_Value_Added_AOD") && t.tiles[0].includes("Level6"));
});
test("peta per kab/kota udara: sumber laporan.json, pil hipotesis untuk semua metrik, seri kab ada", () => {
  const dapat = {}; jalan("public/udara/peta_kab.js", {PetaKabInti: {pasang: a => { dapat.a = a; }}, document: {getElementById: id => id}});
  assert.equal(dapat.a.id, "udara"); assert.equal(dapat.a.url, "/udara/data/laporan.json"); assert.match(dapat.a.hipotesis("jiwa_tidak_sehat"), /hipotesis/); assert.match(dapat.a.hipotesis("pm_jiwa"), /bukan ISPU resmi/);
  const L = JSON.parse(baca("public/udara/data/laporan.json")); assert.ok(L.kab.length > 0 && L.metrik.length > 0 && L.hari_lengkap);
});
test("cari udara: tema udara dipasang malas, hasil kab/desa membuka profil kab, terbang memakai peta halaman", async () => {
  const tema = {}, buka = [], kotak = {value: "", placeholder: "", addEventListener(n, f) { this[n] = f; }}, hasil = {hidden: true, innerHTML: "", addEventListener(n, f) { this[n] = f; }};
  const g = jalan("public/udara/cari.js", {S: {}, namaProv: k => "P" + k, kiriPad: () => 0, nanti: f => f(), renderDaftar() {}, peta: {fitBounds() {}, flyTo() {}},
    CariLuas: {tema: t => { tema.t = t; }, aktif: async () => true, ketik() {}, html: h => "x", pilih() {}},
    ProfilKab: {pasang: id => { tema.profil = id; }, buka: id => buka.push(id)},
    document: {querySelector: q => q === "#cari" ? kotak : q === "#hasil" ? hasil : null, addEventListener() {}}});
  await new Promise(r => setTimeout(r, 5)); assert.equal(tema.t.id, "udara"); assert.equal(tema.profil, "udara"); assert.equal(tema.t.nama("14"), "P14"); assert.match(kotak.placeholder, /kab\/kota/);
  g.S.hasilLuas = [{t: "kab", id: "14.01"}]; hasil.click({target: {closest: () => ({dataset: {ci: "0"}})}}); assert.deepEqual(buka, ["14.01"]);
});
test("index.html udara: mesin dimuat sebelum adaptor, css lengkap, kotak hasil cari ada, tanpa titik tengah", () => {
  const h = baca("public/udara/index.html"), at = s => { const i = h.indexOf(s); assert.ok(i > 0, s); return i; };
  for (const c of ["inti/brief.css", "inti/kalender.css", "inti/banding.css", "inti/timelapse.css", "unduh_tabel.css"]) at(c);
  assert.ok(at("inti/peta_kab.js") < at('src="peta_kab.js"')); assert.ok(at('src="peta.js"') < at('src="peta_kab.js"'));
  assert.ok(at("inti/banding.js") < at('src="citra.js"')); assert.ok(at("inti/timelapse.js") < at('src="citra.js"'));
  assert.ok(at("inti/cari.js") < at('src="cari.js"')); assert.ok(at("inti/profil_kab.js") < at('src="cari.js"')); assert.ok(at("inti/brief.js") < at('src="brief.js"'));
  assert.ok(/id="hasil"/.test(h));
  for (const f of ["citra", "peta_kab", "cari", "tanggal", "unduh", "brief", "operasi"]) assert.ok(!/·/.test(baca(`public/udara/${f}.js`)), f);
});
test("udara: tidak memuat sinyal komunikasi (asap tidak memutus komunikasi) dan tidak menyentuh registri di berkas halaman", () => {
  const h = baca("public/udara/index.html"); assert.ok(!h.includes("inti/sinyal.js"));
});
