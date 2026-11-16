// PB-79c (F-34): adaptor cuaca public/cuaca/unduh.js + gerbang registri di mesin public/inti/unduh_tabel.js.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const el = (t, o = {}) => ({textContent: t, children: o.anak || [], querySelector: s => (o.q || {})[s] || null, querySelectorAll: s => (o.qa || {})[s] || []});
const tabelHtml = (kolom, baris) => el("", {qa: {"thead th": kolom.map(x => el(x)), "tbody tr": baris.map(r => el("", {anak: r.map(x => el(x))}))}});
const SKRG = Date.now();
const NC = [
  {headline: "Hujan lebat di Bogor", event: "Hujan Lebat", severity: "Severe", n: 3, prov: ["32"], mulai: new Date(SKRG - 36e5).toISOString(), selesai: new Date(SKRG + 36e5).toISOString(), wilayah: "CIAWI, CISARUA, MEGAMENDUNG"},
  {headline: "Angin kencang di Kupang", event: "Angin Kencang", severity: "Moderate", n: 1, prov: ["53"], mulai: new Date(SKRG - 36e5).toISOString(), selesai: new Date(SKRG + 36e5).toISOString(), wilayah: "KUPANG TENGAH"}];
const GL = [{prov: "32", lv: 2, total: 4, kelas: [1, 3, 0]}, {prov: "53", lv: 1, total: 2, kelas: [2, 0, 0]}];
const reg = ok => ({id: "cuaca", bagikan: {sumber: "BMKG, Open-Meteo"}, kemampuan: {layar: {unduh_tabel: ok}}});

function dunia({daftar, S, ekstra = {}, tanggalPd} = {}) {
  const win = {}; win.window = win; const dengar = {};
  const dok = {body: {classList: {add() {}, remove() {}}}, head: {append() {}}, addEventListener: (n, f) => { (dengar[n] ||= []).push(f); }, dispatchEvent: e => { (dengar[e.type] || []).forEach(f => f(e)); return true; },
    querySelector: s => ({"#cari": {value: ""}, ...ekstra})[s] || null};
  const ctx = {window: win, document: dok, console, setTimeout, Date, Intl, Promise, S: S || {nc: NC, gl: GL, per: {}, tanggal: null}, Kejadian: {st: {hal: 0}},
    namaProv: k => ({"32": "Jawa Barat", "53": "Nusa Tenggara Timur"})[k] || k, SEV_ID: {Minor: "Ringan", Moderate: "Sedang", Severe: "Berat", Extreme: "Ekstrem"},
    GEL: [["tinggi", "Tinggi"], ["sangat_tinggi", "Sangat tinggi"], ["ekstrem", "Ekstrem"]], waktuBerlaku: () => "X sampai Y WIB", hurufJudul: t => String(t).toLowerCase(),
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o?.detail; } }, renderPanel: () => { ctx.digambar = (ctx.digambar || 0) + 1; }};
  if (tanggalPd) win.TanggalCuaca = tanggalPd;
  ctx.fetch = async () => ({ok: true, json: async () => ({bencana: daftar})});
  const k = vm.createContext(ctx); vm.runInContext(baca("public/inti/unduh_tabel.js"), k); vm.runInContext(baca("public/cuaca/unduh.js"), k); return {win, ctx, k};
}
const tunggu = () => new Promise(r => setTimeout(r, 5));

test("cuaca: tombol hanya dipasang bila registri menyalakan unduh_tabel; panel digambar ulang sekali", async () => {
  const mati = dunia({daftar: [reg(false)]}); await tunggu(); assert.equal(mati.win.UnduhTabel.tombol(), "");
  const hidup = dunia({daftar: [reg(true)]}); assert.equal(hidup.win.UnduhTabel.tombol(), ""); await tunggu();
  assert.match(hidup.win.UnduhTabel.tombol(), /data-unduh/); assert.equal(hidup.ctx.digambar, 1);
});
test("cuaca: nowcast dan gelombang dari data yang tampil, urutan panel, nama berkas laporan", async () => {
  const d = dunia({daftar: [reg(true)]}); const L = await d.win.UnduhTabelCuaca.kumpul();
  assert.deepEqual(stabil(L.tabel.map(t => t.nama)), ["Nowcast BMKG", "Gelombang tinggi"]);
  assert.deepEqual(stabil(L.tabel[0].baris.map(b => [b[0], b[2], b[3]])), [["Kupang", "Sedang", 1], ["Bogor", "Berat", 3]].reverse());
  assert.deepEqual(stabil(L.tabel[1].baris), [["Jawa Barat", "Sangat tinggi", 1, 3, 0, 4], ["Nusa Tenggara Timur", "Tinggi", 2, 0, 0, 2]]);
  assert.equal(L.tabel[0].ket, "Peringatan yang berlaku saat ini"); assert.equal(L.sumber, "Sumber: BMKG, Open-Meteo"); assert.equal(L.namaTabel, "laporan");
});
test("cuaca: kotak cari menyaring seperti panel; tanggal terpilih ikut keterangan dan nama berkas", async () => {
  const d = dunia({daftar: [reg(true)], ekstra: {"#cari": {value: "bogor"}}}); const L = await d.win.UnduhTabelCuaca.kumpul();
  assert.equal(L.tabel.length, 1); assert.equal(L.tabel[0].nama, "Nowcast BMKG"); assert.equal(L.namaTabel, "nowcast-bmkg");
  const e = dunia({daftar: [reg(true)], S: {nc: NC, gl: GL, per: {}, tanggal: "2026-11-15"}, tanggalPd: {nc: () => true, gl: o => o.prov === "53"}});
  const M = await e.win.UnduhTabelCuaca.kumpul(); assert.equal(M.iso, "2026-11-15"); assert.equal(M.tabel[0].ket, "Berlaku pada 15 Nov 2026");
  assert.deepEqual(stabil(M.tabel[1].baris.map(b => b[0])), ["Nusa Tenggara Timur"]);
  assert.equal(e.win.UnduhTabel.model.namaBerkas({id: "cuaca"}, M, "xlsx"), "cuaca-laporan-2026-11-15.xlsx");
});
test("cuaca: tabel Kejadian dari layar, baris deteksi Centurisk97 diberi keterangan hipotesis; tanpa peringatan = tanpa tabel", async () => {
  const ekstra = {"#kejadian table": tabelHtml(["Kode ↓", "Sumber"], [["C0001", "Deteksi Centurisk97"]])};
  const d = dunia({daftar: [reg(true)], ekstra}); const L = await d.win.UnduhTabelCuaca.kumpul(); const kj = L.tabel.find(t => t.nama === "Kejadian");
  assert.deepEqual(stabil(kj.kolom), ["Kode", "Sumber"]); assert.match(kj.ket, /hipotesis/); assert.match(kj.ket, /bukan pernyataan BMKG/); assert.doesNotMatch(JSON.stringify(L), /\baman\b/i);
  const k = dunia({daftar: [reg(true)], S: {nc: [], gl: [], per: {}, tanggal: null}}); assert.equal((await k.win.UnduhTabelCuaca.kumpul()).tabel.length, 0);
});
test("cuaca: peta.js menaruh tombol di panel nowcast/gelombang tanpa mengisi pesan kosong", () => {
  const p = baca("public/cuaca/peta.js"); assert.match(p, /window\.UnduhTabel\?\.tombol\(\)/); assert.match(p, /if \(isi\) return void/);
  const h = baca("public/cuaca/index.html"); for (const s of ["inti/unduh.js", "inti/unduh_tabel.js", "cuaca/unduh.js".replace("cuaca/", ""), "unduh_tabel.css"]) assert.ok(h.includes(s), s);
  assert.ok(h.indexOf('src="peta.js"') < h.indexOf('src="unduh.js"'));
});
