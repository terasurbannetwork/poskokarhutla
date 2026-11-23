// PB-79c (F-35): adaptor cuaca public/cuaca/brief.js di atas mesin public/inti/brief.js.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const SKRG = Date.now();
const NC = [
  {headline: "Hujan lebat di Bogor", event: "Hujan Lebat", severity: "Severe", n: 3, prov: ["32"], mulai: new Date(SKRG - 36e5).toISOString(), selesai: new Date(SKRG + 36e5).toISOString(), wilayah: "CIAWI, CISARUA"},
  {headline: "Angin kencang di Kupang", event: "Angin Kencang", severity: "Moderate", n: 1, prov: ["53"], mulai: new Date(SKRG - 36e5).toISOString(), selesai: new Date(SKRG + 36e5).toISOString(), wilayah: "KUPANG TENGAH"}];
const GL = [{prov: "32", lv: 2, total: 4, kelas: [1, 3, 0]}];
const KEJ = [{kode: "C0001", nama: "Hujan lebat Bogor", jenis: "cap:hujan", besaran: {nilai: "Severe"}, n_kab: 2, aktif: true}, {kode: "C0002", nama: "Deteksi Jabar", jenis: "deteksi", besaran: {nilai: 2}, n_kab: 5, aktif: true}, {kode: "C0003", nama: "Selesai", jenis: "deteksi", besaran: {nilai: 1}, n_kab: 1, aktif: false}];

function dunia(reg, {S, kej = KEJ} = {}) {
  const dipasang = [], ref = {parentNode: {insertBefore: b => dipasang.push(b)}};
  const dok = {documentElement: {classList: {add() {}, remove() {}}}, body: {appendChild() {}}, querySelector: q => q.includes("laporan") ? ref : null, getElementById: () => null,
    createElement: () => ({set innerHTML(v) { this.firstChild = {html: v}; }})};
  const g = {document: dok, console, Date, Math, Number, Intl, JSON, Promise, Set, setTimeout, addEventListener() {}, removeEventListener() {}, print() {}, fetch: async () => ({ok: !!reg, json: async () => reg}),
    S: S || {pr: {}, per: {dibuat: "2026-11-16T03:00:00Z"}, nc: NC, gl: GL}, Kejadian: {muatAwal: async () => kej}, fmt: n => Number(n).toLocaleString("id-ID"),
    namaProv: k => ({"32": "Jawa Barat", "53": "Nusa Tenggara Timur"})[k] || k, SEV_ID: {Minor: "Ringan", Moderate: "Sedang", Severe: "Berat", Extreme: "Ekstrem"},
    GEL: [["tinggi", "Tinggi", "2,5 sampai 4 m"], ["sangat_tinggi", "Sangat tinggi", "4 sampai 6 m"], ["ekstrem", "Ekstrem", "di atas 6 m"]],
    jamRentang: () => "08.00 sampai 10.00", hurufJudul: t => String(t), jamWIB: t => "WIB " + String(t).slice(0, 16)};
  g.window = g; const c = vm.createContext(g);
  vm.runInContext(baca("public/inti/brief.js"), c); vm.runInContext(baca("public/cuaca/brief.js"), c);
  return {g, dipasang};
}
const reg = ok => ({bencana: [{id: "cuaca", kemampuan: {layar: {brief: ok}}}]});

test("brief cuaca: angka sama dengan data yang tampil, hipotesis berlabel, tanpa kata aman dan tanpa prakiraan model", () => {
  const {g} = dunia(reg(true)); const d = g.Brief.cuaca.bangun(NC, GL, KEJ, {cutoff: "WIB X", sekarang: SKRG});
  assert.deepEqual(stabil(d.kpi.map(k => k.v)), ["2", "2", "1", "2"]); assert.match(d.kpi[0].k, /1 berkategori Berat atau Ekstrem/); assert.match(d.kpi[2].k, /sangat tinggi/);
  assert.deepEqual(stabil(d.tabel1.baris[0]), ["Jawa Barat", "1", "Berat", "Sangat tinggi"]); assert.deepEqual(stabil(d.tabel1.baris[1]), ["Nusa Tenggara Timur", "1", "Sedang", "–"]);
  assert.equal(d.tabel2.baris[0][3], "Berat"); assert.equal(d.daftar.item.length, 2); assert.match(d.daftar.item.find(x => x.startsWith("C0002")), /hipotesis/); assert.match(d.daftar.item[0], /peringatan BMKG/);
  assert.doesNotMatch(JSON.stringify(d), /\baman\b/i); assert.doesNotMatch(JSON.stringify(d.kpi) + JSON.stringify(d.tabel1) + JSON.stringify(d.tabel2), /prakiraan hujan/i);
  assert.match(d.catatan, /prakiraan model Centurisk97 tidak dimasukkan/);
});
test("brief cuaca: data kosong ditulis belum tersedia, bukan nol", () => {
  const {g} = dunia(reg(true)); const d = g.Brief.cuaca.bangun([], [], null, {cutoff: null, sekarang: SKRG});
  assert.equal(d.kpi[3].v, null); assert.equal(d.tabel1.baris.length, 0); assert.match(d.tabel1.kosong, /belum tersedia/); assert.deepEqual(stabil(d.daftar.item), []);
});
test("brief cuaca: gerbang registri, tombol dipasang hanya bila brief true", async () => {
  const hidup = dunia(reg(true)); await new Promise(r => setTimeout(r, 10)); assert.equal(hidup.dipasang.length, 1);
  const mati = dunia(reg(false)); await new Promise(r => setTimeout(r, 10)); assert.equal(mati.dipasang.length, 0);
  const tanpa = dunia(null); await new Promise(r => setTimeout(r, 10)); assert.equal(tanpa.dipasang.length, 0);
});
test("brief cuaca: index.html memuat css dan skrip mesin sebelum adaptor", () => {
  const h = baca("public/cuaca/index.html"); assert.ok(h.includes("inti/brief.css")); assert.ok(h.indexOf('src="../inti/brief.js"') > 0 && h.indexOf('src="../inti/brief.js"') < h.indexOf('src="brief.js"'));
});
