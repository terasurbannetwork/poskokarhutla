// PB-86 (F-35): adaptor pesisir public/pesisir/brief.js di atas mesin public/inti/brief.js, memakai data nyata di repo.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const json = p => JSON.parse(baca("public/" + p));
const stabil = x => JSON.parse(JSON.stringify(x));
const rob = json("banjir/data/rob.json"), pas = json("banjir/data/pasut_30h.json"), abr = json("pesisir/data/abrasi.json");
const TGL = rob.hari[3];
const GLB = [{prov: "32", lv: 2, total: 4, sampai: "2026-10-14T18:00", zona: "WIB"}, {prov: "53", lv: 1, total: 2, sampai: "2026-10-14T12:00", zona: "WITA"}];

function dunia(reg) {
  const dipasang = [], ref = {parentNode: {insertBefore: b => dipasang.push(b)}};
  const dok = {documentElement: {classList: {add() {}, remove() {}}}, body: {appendChild() {}}, querySelector: q => q === "#tema" ? ref : null, getElementById: () => null,
    createElement: () => ({set innerHTML(v) { this.firstChild = {html: v}; }})};
  const g = {document: dok, console, Date, Math, Number, Intl, JSON, Promise, Set, setTimeout, addEventListener() {}, removeEventListener() {}, print() {}, fetch: async () => ({ok: !!reg, json: async () => reg}),
    S: {rob, pas, abr, glb: GLB, per: {dibuat: "x"}, gel: null}, fmt: n => Number(n).toLocaleString("id-ID"), m1: n => n == null ? "–" : String(Math.round(n * 10) / 10),
    tglSgk: t => t, jamWIB: t => "WIB " + String(t).slice(0, 16), HARI_INI: () => TGL, SEKARANG: () => Date.parse(TGL + "T10:00:00+07:00"),
    TINGKAT: [["Normal"], ["Waspada"], ["Siaga"], ["Awas"]], namaProv: k => ({"32": "Jawa Barat", "53": "Nusa Tenggara Timur"})[k] || k};
  g.window = g; const c = vm.createContext(g);
  vm.runInContext(baca("public/pesisir/hitung.js"), c); vm.runInContext(baca("public/inti/brief.js"), c); vm.runInContext(baca("public/pesisir/brief.js"), c);
  return {g, dipasang, c};
}
const reg = ok => ({bencana: [{id: "pesisir", kemampuan: {layar: {brief: ok}}}]});

test("brief pesisir: angka sama dengan hitungan halaman, hipotesis dan perkiraan satelit berlabel, tanpa kata aman", () => {
  const {g} = dunia(reg(true)), d = g.Brief.pesisir.bangun({rob, abr, pas, glb: GLB, per: {}, tgl: TGL, sekarang: Date.parse(TGL + "T10:00:00+07:00"), cutoff: "Rob X", nama: g.namaProv});
  const r = g.Pesisir.robHari(rob, TGL);
  assert.equal(d.kpi[0].v, g.fmt(r.L.filter(x => x.lv > 0).length)); assert.match(d.kpi[0].k, /hipotesis model/);
  assert.equal(d.kpi[1].v, "2"); assert.match(d.kpi[1].k, /tinggi/);
  assert.equal(d.kpi[3].v, g.fmt(g.Pesisir.abrasiBersih(abr).length)); assert.match(d.kpi[3].k, /perkiraan satelit/);
  assert.equal(d.tabel1.baris.length, g.Pesisir.dampakRob(rob, null, TGL, {}).daftar.length);
  assert.deepEqual(stabil(d.tabel2.kolom), ["Situs", "Kab/kota", "Laju median (m/th)", "Abrasi nyata"]);
  assert.equal(d.daftar.item.length, 2); assert.match(d.daftar.item[0], /^Jawa Barat: sangat tinggi, 4 perairan/);
  assert.match(d.catatan, /bukan peringatan resmi/); assert.doesNotMatch(JSON.stringify(d), /\baman\b/i);
});
test("brief pesisir: data tak mencakup tanggal atau tak terbaca = belum tersedia, bukan nol (D16)", () => {
  const {g} = dunia(reg(true)), d = g.Brief.pesisir.bangun({rob, abr: null, pas: null, glb: [], per: null, tgl: "2030-01-01", sekarang: Date.now(), cutoff: null, nama: k => k});
  assert.equal(d.kpi[0].v, null); assert.equal(d.kpi[1].v, null); assert.equal(d.kpi[2].v, null); assert.equal(d.kpi[3].v, null);
  assert.match(d.tabel1.kosong, /belum tersedia/); assert.deepEqual(stabil(d.tabel2.baris), []); assert.deepEqual(stabil(d.daftar.item), []);
});
test("brief pesisir: tombol dipasang sebelum #tema hanya bila registri menyalakan brief", async () => {
  const mati = dunia(reg(false)); assert.equal(await mati.g.Brief.pasang("#tema"), false); assert.equal(mati.dipasang.length, 0);
  const hidup = dunia(reg(true)); await new Promise(r => setTimeout(r, 5)); assert.equal(hidup.dipasang.length, 1);
});
test("brief pesisir: index.html memuat mesin sebelum adaptor", () => {
  const h = baca("public/pesisir/index.html"); assert.ok(h.indexOf("inti/brief.js") < h.indexOf('src="brief.js"')); assert.ok(h.includes("inti/brief.css"));
  assert.ok(!/·/.test(baca("public/pesisir/brief.js")));
});
