// PB-79c (F-38 dan F-37): adaptor cuaca public/cuaca/cari.js. Mesin: public/inti/cari.js dan public/inti/profil_kab.js.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const tunggu = ms => new Promise(r => setTimeout(r, ms));
function dunia({aktif, hasil = []} = {}) {
  const dengar = {}, kotak = {value: "", placeholder: "", addEventListener: (n, f) => { dengar.kotak = f; }}, h = {hidden: true, innerHTML: "", addEventListener: (n, f) => { dengar.hasil = f; }};
  const rec = {terbang: [], profil: [], ketik: []};
  const win = {ProfilKab: {pasang: id => { rec.pasangProfil = id; }, buka: id => { rec.profil.push(id); }}}; win.window = win;
  const ctx = vm.createContext({window: win, console, setTimeout, clearTimeout, Promise, S: {}, peta: {fitBounds: b => rec.terbang.push(["bb", b]), flyTo: o => rec.terbang.push(["c", o.center])}, kiriPad: () => ({}), nanti: f => f(),
    renderPanel() { rec.panel = (rec.panel || 0) + 1; }, namaProv: k => k,
    document: {querySelector: s => ({"#cari": kotak, "#hasil": h})[s], addEventListener() {}},
    CariLuas: {tema: a => { rec.tema = a; }, aktif: async () => aktif, ketik: (q, f) => { rec.ketik.push(q); f({hasil}); }, html: l => l.map((x, i) => `<button data-ci="${i}">${x.n}</button>`).join(""), pilih: i => rec.terbang.push(["pilih", i])}});
  vm.runInContext(baca("public/cuaca/cari.js"), ctx); return {dengar, kotak, h, rec, ctx};
}
test("cari cuaca: registri tanpa lapisan = tidak mencari dan tidak menampilkan hasil", async () => {
  const d = dunia({aktif: false}); await tunggu(5); assert.equal(d.kotak.placeholder, ""); d.kotak.value = "bogor"; d.dengar.kotak({target: d.kotak}); await tunggu(250);
  assert.deepEqual(d.rec.ketik, []); assert.equal(d.h.hidden, true); assert.equal(d.rec.tema.id, "cuaca");
});
test("cari cuaca: lapisan menyala = hasil tampil di #hasil; memilih kab menerbangkan peta dan membuka profil, faskes tidak", async () => {
  const d = dunia({aktif: true, hasil: [{t: "kab", id: "32.01", n: "Bogor"}, {t: "faskes", id: "f1", n: "RS A"}]}); await tunggu(5); assert.match(d.kotak.placeholder, /desa, faskes/);
  d.kotak.value = "bogor"; d.dengar.kotak({target: d.kotak}); await tunggu(250); assert.equal(d.h.hidden, false); assert.match(d.h.innerHTML, /data-ci="1"/); assert.equal(d.rec.pasangProfil, "cuaca");
  const klik = i => d.dengar.hasil({target: {closest: () => ({dataset: {ci: String(i)}})}});
  klik(0); assert.deepEqual(d.rec.profil, ["32.01"]); assert.deepEqual(d.rec.terbang[0], ["pilih", 0]);
  d.h.hidden = false; klik(1); assert.deepEqual(d.rec.profil, ["32.01"]); assert.equal(d.h.hidden, true);
});
test("cari cuaca: ketikan satu huruf menutup hasil; index.html memuat mesin sebelum adaptor dan menaruh #hasil di dalam .cari", () => {
  const d = dunia({aktif: true}); d.kotak.value = "b"; d.dengar.kotak({target: d.kotak}); assert.equal(d.h.hidden, true);
  const h = baca("public/cuaca/index.html"); assert.ok(h.indexOf("inti/cari.js") < h.indexOf('src="cari.js"')); assert.ok(h.indexOf("inti/profil_kab.js") < h.indexOf('src="cari.js"'));
  assert.match(h, /<div class="cari">[\s\S]*?id="cari"[\s\S]*?id="hasil"[\s\S]*?<\/div>/);
});
