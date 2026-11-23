// PB-86 (F-34): adaptor pesisir public/pesisir/unduh.js + gerbang registri di mesin public/inti/unduh_tabel.js.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const el = (t, o = {}) => ({textContent: t, children: o.anak || [], classList: {contains: c => (o.kelas || []).includes(c)}, title: o.title || "",
  querySelector: s => (o.q || {})[s] || null, querySelectorAll: s => (o.qa || {})[s] || []});
const rw = (nama, pil, wil, jam) => el("", {kelas: ["rw"], q: {".rw-hd b": el(nama), ".rw-hd .pl": pil ? el(pil) : null, ".rw-wil": wil ? el(wil) : null, ".rw-jam": jam ? el(jam) : null}});
const tabelHtml = (kolom, baris) => el("", {qa: {"thead th": kolom.map(x => el(x)), "tbody tr": baris.map(r => el("", {anak: r.map(x => el(x))}))}});
const reg = ok => ({id: "pesisir", bagikan: {sumber: "BMKG Maritim, Open-Meteo"}, kemampuan: {layar: {unduh_tabel: ok}}});

function dunia({daftar, S, ekstra = {}} = {}) {
  const win = {}; win.window = win; const dengar = {};
  const dok = {body: {classList: {add() {}, remove() {}}}, head: {append() {}}, addEventListener: (n, f) => { (dengar[n] ||= []).push(f); }, dispatchEvent: e => { (dengar[e.type] || []).forEach(f => f(e)); return true; },
    querySelector: s => ekstra[s] || null};
  const ctx = {window: win, document: dok, console, setTimeout, Date, Intl, Promise, S: S || {mode: "rob", hari: "2026-11-16"}, tglSgk: () => "16 Nov",
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o?.detail; } }, renderPanel: () => { ctx.digambar = (ctx.digambar || 0) + 1; }};
  ctx.fetch = async () => ({ok: true, json: async () => ({bencana: daftar})});
  const k = vm.createContext(ctx); vm.runInContext(baca("public/inti/unduh_tabel.js"), k); vm.runInContext(baca("public/pesisir/unduh.js"), k); return {win, ctx, k};
}
const tunggu = () => new Promise(r => setTimeout(r, 5));

test("pesisir: tombol hanya dipasang bila registri menyalakan unduh_tabel; panel digambar ulang sekali", async () => {
  const mati = dunia({daftar: [reg(false)]}); await tunggu(); assert.equal(mati.win.UnduhTabel.tombol(), "");
  const hidup = dunia({daftar: [reg(true)]}); assert.equal(hidup.win.UnduhTabel.tombol(), ""); await tunggu();
  assert.match(hidup.win.UnduhTabel.tombol(), /data-unduh/); assert.equal(hidup.ctx.digambar, 1);
});
test("pesisir: daftar panel rob jadi tabel apa adanya; ketentuan hipotesis ikut keterangan", async () => {
  const rows = el("", {anak: [el("", {kelas: ["x"]}), rw("Medan Belawan", "Waspada", "Kota Medan, Sumatera Utara", "Muka laut maks 1,8 m, ambang Waspada 1,8 m"), rw("Tegal Barat", "Tanpa ambang", "Kota Tegal, Jawa Tengah", "Muka laut maks 0,9 m, belum ada ambang")]});
  const d = dunia({daftar: [reg(true)], ekstra: {"#rows": rows}}); const L = await d.win.UnduhTabelPesisir.kumpul();
  assert.equal(L.tabel.length, 1); assert.equal(L.tabel[0].nama, "Status rob"); assert.match(L.tabel[0].ket, /Hipotesis/); assert.match(L.tabel[0].ket, /bukan peringatan resmi/);
  assert.deepEqual(stabil(L.tabel[0].kolom), ["Kecamatan", "Status", "Kab/kota, provinsi", "Rincian"]);
  assert.deepEqual(stabil(L.tabel[0].baris[0]), ["Medan Belawan", "Waspada", "Kota Medan, Sumatera Utara", "Muka laut maks 1,8 m, ambang Waspada 1,8 m"]);
  assert.equal(L.namaTabel, "status-rob"); assert.equal(L.iso, "2026-11-16"); assert.equal(L.sumber, "Sumber: BMKG Maritim, Open-Meteo"); assert.doesNotMatch(JSON.stringify(L), /\baman\b/i);
});
test("pesisir: mode Ombak membawa kelompok sumber (peringatan resmi lawan model) dan panel kosong tanpa tabel", async () => {
  const rows = el("", {anak: [el("Peringatan resmi BMKG Maritim", {kelas: ["gp-sub"]}), rw("Jawa Barat", "Tinggi", "Peringatan BMKG, 3 perairan"), el("Titik pesisir, gelombang model", {kelas: ["gp-sub"]}), rw("Pelabuhan Ratu", "Sedang", "Jawa Barat", "Model: tertinggi 1,6 m")]});
  const d = dunia({daftar: [reg(true)], S: {mode: "ombak", hari: "2026-11-16"}, ekstra: {"#rows": rows}}); const T = (await d.win.UnduhTabelPesisir.kumpul()).tabel[0];
  assert.equal(T.nama, "Gelombang"); assert.deepEqual(stabil(T.baris.map(b => b[4])), ["Peringatan resmi BMKG Maritim", "Titik pesisir, gelombang model"]);
  const k = dunia({daftar: [reg(true)], ekstra: {"#rows": el("", {anak: [el("Data rob tidak terbaca.", {kelas: ["kosong"]})]})}}); assert.equal((await k.win.UnduhTabelPesisir.kumpul()).tabel.length, 0);
});
test("pesisir: kartu tab Dampak ikut sebagai tabel, label hipotesis dan sumber di keterangan", async () => {
  const kartu = el("", {q: {"table": tabelHtml(["Kab/kota", "Status tertinggi"], [["Kota Medan", "Waspada"]]), "h3": el("Kab/kota berstatus rob"), ".ex-ey .pl": el("Hipotesis"), "th[title]": el("", {title: "Status: muka laut model"})}});
  const d = dunia({daftar: [reg(true)], ekstra: {"#dampak": el("", {qa: {"article.ex-std": [kartu]}})}}); const L = await d.win.UnduhTabelPesisir.kumpul();
  assert.equal(L.tabel.length, 1); assert.equal(L.tabel[0].nama, "Kab/kota berstatus rob"); assert.match(L.tabel[0].ket, /^Hipotesis\. Status: muka laut model/);
});
test("pesisir: pesisir.js dan dampak.js menaruh tombol, index.html memuat mesin dan CSS sesudah halaman", () => {
  assert.match(baca("public/pesisir/pesisir.js"), /window\.UnduhTabel\?\.tombol\(\)/); assert.match(baca("public/pesisir/dampak.js"), /window\.UnduhTabel\?\.tombol\(\)/);
  const h = baca("public/pesisir/index.html"); for (const s of ["inti/unduh.js", "inti/unduh_tabel.js", 'src="unduh.js"', "unduh_tabel.css"]) assert.ok(h.includes(s), s);
  assert.ok(h.indexOf('src="pesisir.js"') < h.indexOf('src="unduh.js"')); assert.ok(h.indexOf("inti/unduh_tabel.js") < h.indexOf('src="unduh.js"'));
  assert.ok(!/·/.test(baca("public/pesisir/unduh.js")));
});
