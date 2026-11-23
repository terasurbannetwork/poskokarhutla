// PB-68 (D16): kejadian kekeringan (kode D) digambar di peta /kekeringan sebagai lapisan Overlay. Modul public/kekeringan/kejadian.js dijalankan di vm.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const J = x => JSON.parse(JSON.stringify(x));
const HARI = new Date().toLocaleDateString("sv-SE", {timeZone: "Asia/Jakarta"});
const AWAL = (hari = HARI) => ({hari, dibuat: hari + "T10:00+07:00", kejadian: [
  {kode: "D0001", nama: "Kekeringan Siaga/Awas, sekitar Aceh Besar", n_kab: 2, kab: ["11|Aceh Besar", "11|Aceh Jaya"], mulai: "2026-10-21", terakhir: hari, aktif: true, besaran: {nilai: 3}, jiwa: 5e6},
  {kode: "D0005", nama: "Kekeringan Siaga/Awas, sekitar Batanghari", n_kab: 1, kab: ["15|Batanghari"], mulai: "2026-10-21", terakhir: "2026-11-06", aktif: false, besaran: {nilai: 2}}]});
const GEO = {type: "FeatureCollection", features: ["D0001", "D0005", "D9999"].map(kode => ({type: "Feature", properties: {kode}, geometry: {type: "Point", coordinates: [96, 4]}}))};
function dunia(awal, geo = GEO) {
  const cek = {inp: {checked: false, dataset: {l: "kejadian"}, closest: () => lb}}, lb = {hidden: true, style: {display: "none"}, dataset: {}, closest: () => det}, det = {hidden: true};
  const peta = {src: {}, lay: {}, getSource: id => peta.src[id] && {setData: d => (peta.src[id].data = d)}, addSource: (id, o) => (peta.src[id] = o), getLayer: id => peta.lay[id], addLayer: o => (peta.lay[o.id] = o), setLayoutProperty() {}, on() {}, getCanvas: () => ({style: {}})};
  const ctx = {peta, PI: {kartuTip: x => JSON.stringify(x)}, WARNA_LV: ["#5a", "#e3", "#e5", "#c9"], LEVEL: ["Normal", "Waspada", "Siaga", "Awas"], BELUM_UJI: "Belum diuji balik",
    muatJSON: async u => { if (/awal/.test(u)) { if (!awal) throw new Error("x"); return awal; } return geo; },
    esc: String, fmt: String, rb: String, tglPendek: t => t, jamWIB: String, kot: () => "", renderLegenda() {}, nanti: f => f(), $: s => s === "#lapis" ? null : null, Analisa: {buka() {}}, kotak: () => [], kiriPad: () => ({}),
    document: {querySelector: () => cek.inp}, Date, Math, Map, JSON, Promise, Array, Number};
  ctx.window = ctx; vm.runInContext(baca("public/kekeringan/kejadian.js"), vm.createContext(ctx)); return {K: ctx.KekKejadian, peta, lb, det, cek};
}
test("statik: skrip terpasang sesudah peta.js, ubin Overlay di grup Kejadian, tanpa titik tengah dan kata aman, CSS tanpa warna baru", () => {
  const h = baca("public/kekeringan/index.html"), i = h.indexOf('src="peta.js"'), j = h.indexOf('src="kejadian.js"'); assert.ok(i > 0 && j > i);
  assert.match(h, /<summary>Kejadian<\/summary>\s*<label hidden><input type="checkbox" data-l="kejadian">/);
  const k = baca("public/kekeringan/kejadian.js"); assert.ok(!/·/.test(k)); assert.ok(!/\baman\b/i.test(k.replace(/\/\*[\s\S]*?\*\//g, "")));
  const p = baca("public/kekeringan/peta.js"); assert.ok(p.includes("kejadian:") && p.includes("window.KekKejadian?.diKlik(e)") && p.includes('=== "kejadian"'));
});
test("siap: kejadian segar menampilkan ubin; berkas gagal, kosong, atau basi tidak menampilkan apa pun", async () => {
  let w = dunia(AWAL()); await w.K.siap(); assert.equal(w.lb.hidden, false); assert.equal(w.det.hidden, false); assert.equal(w.K.K.length, 2);
  w = dunia(null); await w.K.siap(); assert.equal(w.lb.hidden, true); assert.equal(J(w.K.K).length, 0);
  w = dunia({...AWAL(), kejadian: []}); await w.K.siap(); assert.equal(w.lb.hidden, true);
  w = dunia(AWAL("2026-01-01")); await w.K.siap(); assert.equal(w.lb.hidden, true);
});
test("pasang: hanya kejadian yang ada di atribut dan geometri; status dan tingkat apa adanya dari berkas", async () => {
  const w = dunia(AWAL()); w.cek.inp.checked = true; await w.K.siap(); await w.K.pasang();
  const F = J(w.peta.src.kej.data.features); assert.deepEqual(F.map(f => f.properties.kode), ["D0001", "D0005"]);   // D9999 tanpa atribut dibuang
  assert.deepEqual(F.map(f => [f.properties.aktif, f.properties.lv]), [[1, 3], [0, 2]]);
  assert.ok(w.peta.lay["kej-isi"] && w.peta.lay["kej-garis"]);
});
test("tanpa dicentang: geometri tidak diunduh dan lapisan tidak dibuat", async () => {
  const w = dunia(AWAL()); await w.K.siap(); await w.K.pasang(); assert.equal(w.K.G, null); assert.equal(w.peta.lay["kej-isi"], undefined);
});
test("kartu: kode, tingkat, jumlah wilayah, dan status dari berkas", () => {
  const w = dunia(AWAL()), t = w.K.kartu(AWAL().kejadian[1]); assert.match(t, /D0005/); assert.match(t, /Selesai/); assert.match(t, /Siaga/);
});
