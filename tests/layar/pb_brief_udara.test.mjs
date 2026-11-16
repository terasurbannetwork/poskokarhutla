// PB-85 (F-35): adaptor udara public/udara/brief.js di atas mesin public/inti/brief.js. Angka dari data halaman, model berlabel hipotesis, stasiun dipisah (D6).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const BATAS = [15.5, 55.4, 150.4, 250.4], KAT = [{n: "Baik"}, {n: "Sedang"}, {n: "Tidak sehat"}, {n: "Sangat tidak sehat"}, {n: "Berbahaya"}];
const kat = v => BATAS.reduce((n, b) => n + (v > b), 0);
function dunia(reg) {
  const dipasang = [], ref = {parentNode: {insertBefore: b => dipasang.push(b)}};
  const dok = {documentElement: {classList: {add() {}, remove() {}}}, body: {appendChild() {}}, querySelector: q => q.includes("laporan") ? ref : null, getElementById: () => null, createElement: () => ({set innerHTML(v) { this.firstChild = {html: v}; }})};
  const g = {document: dok, console, Date, Math, Number, Intl, JSON, Promise, Set, setTimeout, addEventListener() {}, removeEventListener() {}, print() {}, fetch: async () => ({ok: !!reg, json: async () => reg}),
    S: {uk: {}, prak: {}}, Stasiun: {segar: () => []}, Kejadian: {muatAwal: async () => []}, BATAS, KAT, kat, fmt: n => Number(n).toLocaleString("id-ID"),
    kr: v => v >= 1e6 ? (v / 1e6).toLocaleString("id-ID", {maximumFractionDigits: 1}) + " jt" : Math.round(v / 1e3) + " rb", namaProv: k => ({"14": "Riau", "15": "Jambi"})[k] || k, jamWIB: t => "WIB " + t};
  g.window = g; const c = vm.createContext(g); vm.runInContext(baca("public/inti/brief.js"), c); vm.runInContext(baca("public/udara/brief.js"), c); return {g, dipasang};
}
const reg = ok => ({bencana: [{id: "udara", kemampuan: {layar: {brief: ok}}}]});
const UK = {hari: ["2026-11-16"], nasional: [{jiwa: [100, 50, 3e6, 1e6, 0], rata: 47.6}], prov: {"14": [[10, 10, 3e6, 1e6, 0, 80.2, 90]], "15": [[10, 40, 0, 0, 0, 30.1, 40]]}, kab: [[["14", "Kab. Siak", 90.4, 100, 5e5, 5e5], ["15", "Kota Jambi", 20, 30, 1e5, 0]]]};
const PRAK = {kota: [{jiwa: 5, r24: [90]}, {jiwa: 4, r24: [20]}, {jiwa: 0, r24: [200]}, {jiwa: 3, r24: [null]}]};
test("brief udara: angka sama dengan data, model berlabel hipotesis dan stasiun BMKG dipisah", () => {
  const {g} = dunia(reg(true)), d = g.Brief.udara.bangun({uk: UK, prak: PRAK, h: 0, stasiun: [{v: 70}, {v: 20}, {v: 10}], kejadian: [{kode: "U1", nama: "Riau", n_kab: 3, aktif: true}, {kode: "U0", nama: "lama", aktif: false}], cutoff: "WIB X"});
  assert.deepEqual(stabil(d.kpi.map(k => k.v)), ["sekitar 4 jt", "1", "48 µg/m³", "1"]); assert.match(d.kpi[0].k, /hipotesis/); assert.match(d.kpi[1].k, /dari 2 kab\/kota berpenduduk/); assert.match(d.kpi[3].k, /dari 3 stasiun.*bukan model/);
  const b0 = d.tabel1.baris[0]; assert.equal(b0[0], "Riau"); assert.equal(b0[1], "80"); assert.match(b0[2], /^sekitar /); assert.equal(b0[3], "Tidak sehat"); assert.equal(d.tabel1.baris[1][3], "Sedang");
  assert.deepEqual(stabil(d.tabel2.baris[0]), ["Kab. Siak", "Riau", "90", "Tidak sehat"]); assert.equal(d.daftar.item.length, 1); assert.match(d.daftar.item[0], /hipotesis/);
  assert.match(d.catatan, /bukan ISPU resmi/); assert.doesNotMatch(JSON.stringify(d), /\baman\b/i);
});
test("brief udara: data kosong ditulis belum tersedia, bukan nol", () => {
  const {g} = dunia(reg(true)), d = g.Brief.udara.bangun({uk: {hari: ["2026-11-16"], nasional: [], prov: {}, kab: [[]]}, prak: {kota: []}, h: 0, stasiun: [], kejadian: null, cutoff: null});
  assert.equal(d.kpi[0].v, null); assert.equal(d.kpi[1].v, null); assert.equal(d.kpi[2].v, null); assert.equal(d.kpi[3].v, null); assert.equal(d.tabel1.baris.length, 0); assert.match(d.tabel1.kosong, /belum tersedia/); assert.deepEqual(stabil(d.daftar.item), []);
});
test("brief udara: gerbang registri, tombol dipasang hanya bila brief true", async () => {
  const hidup = dunia(reg(true)); await new Promise(r => setTimeout(r, 10)); assert.equal(hidup.dipasang.length, 1);
  const mati = dunia(reg(false)); await new Promise(r => setTimeout(r, 10)); assert.equal(mati.dipasang.length, 0);
  assert.ok(!/·/.test(baca("public/udara/brief.js")));
});
