// PB-86 (F-37, F-38): adaptor pesisir public/pesisir/cari.js untuk mesin inti/cari.js dan inti/profil_kab.js, plus kartu Sinyal di tab Dampak.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
function dunia({aktif = true} = {}) {
  const win = {}; win.window = win; const dengar = {}, doc = {}, tema = [], buka = [], terbang = [];
  const kotak = {value: "", placeholder: "", addEventListener: (n, f) => { dengar[n] = f; }}, hasil = {hidden: true, innerHTML: "", addEventListener: (n, f) => { dengar["h" + n] = f; }};
  const ctx = vm.createContext({window: win, console, setTimeout, clearTimeout, Number, S: {}, peta: {fitBounds() {}, flyTo: a => terbang.push(a)}, kiriPad: () => ({}), nanti: f => f(), namaProv: k => k,
    CariLuas: {tema: a => tema.push(a), aktif: async () => aktif, ketik: (q, f) => f({hasil: [{t: "kab", id: "32.01", n: "Kab. Bogor"}, {t: "faskes", n: "RS X"}]}), html: h => h.map((x, i) => `<button data-ci="${i}">${x.n}</button>`).join(""), pilih: i => doc.dipilih = i},
    document: {querySelector: q => q === "#cari" ? kotak : q === "#hasil" ? hasil : null, addEventListener: (n, f) => { dengar["d" + n] = f; }}});
  win.ProfilKab = {pasang: id => { doc.profilId = id; }, buka: id => buka.push(id)};
  vm.runInContext(baca("public/pesisir/cari.js"), ctx); return {win, kotak, hasil, dengar, tema, buka, doc, terbang};
}
const tunggu = () => new Promise(r => setTimeout(r, 400));

test("cari pesisir: adaptor memakai id pesisir, placeholder luas hanya bila registri menyalakan lapisan", async () => {
  const hidup = dunia(); await tunggu(); assert.equal(hidup.tema[0].id, "pesisir"); assert.equal(hidup.doc.profilId, "pesisir"); assert.match(hidup.kotak.placeholder, /desa, faskes, atau sekolah/);
  const mati = dunia({aktif: false}); await tunggu(); assert.equal(mati.kotak.placeholder, "");
});
test("cari pesisir: ketik menampilkan hasil mesin; klik kab membuka profil, klik faskes hanya menerbangkan peta", async () => {
  const d = dunia(); await tunggu(); d.kotak.value = "bogor"; d.dengar.input({target: d.kotak}); await tunggu();
  assert.equal(d.hasil.hidden, false); assert.match(d.hasil.innerHTML, /Kab\. Bogor/);
  d.dengar.hclick({target: {closest: () => ({dataset: {ci: "0"}})}}); await tunggu(); assert.equal(d.doc.dipilih, 0); assert.deepEqual(d.buka, ["32.01"]); assert.equal(d.hasil.hidden, true);
  d.kotak.value = "rs"; d.dengar.input({target: d.kotak}); await tunggu(); d.dengar.hclick({target: {closest: () => ({dataset: {ci: "1"}})}}); await tunggu(); assert.deepEqual(d.buka, ["32.01"]);
});
test("cari pesisir: index.html punya #hasil dan memuat mesin sebelum adaptor; Dampak memasang Sinyal dengan id pesisir tanpa warna kab", () => {
  const h = baca("public/pesisir/index.html"); assert.match(h, /id="hasil"/); assert.ok(h.indexOf("inti/cari.js") < h.indexOf('src="cari.js"')); assert.ok(h.indexOf("inti/profil_kab.js") < h.indexOf('src="cari.js"'));
  assert.ok(h.indexOf("inti/sinyal.js") < h.indexOf('src="dampak.js"'));
  const dm = baca("public/pesisir/dampak.js"); assert.match(dm, /SinyalInti\.pasang\(el, \{id: "pesisir"/); assert.ok(!/·/.test(baca("public/pesisir/cari.js")));
});
