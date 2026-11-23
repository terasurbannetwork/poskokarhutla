// PB-85 (F-34, F-39): adaptor udara public/udara/unduh.js untuk mesin inti/unduh_tabel.js dan segmen ukuran tabel provinsi.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const sel = t => ({textContent: t});
const BARIS = [["1", "Riau", "62", "4,1 jt", "↑12%", "Tidak sehat"], ["2", "Jambi", "30", "–", "–", "Sedang"]];
function dunia({stasiun = [], urut = null, izin = []} = {}) {
  const pil = {}, ev = [], dok = {querySelectorAll: q => q === "#rows button.tb" ? BARIS.map(r => ({children: r.map(sel)})) : [],
    querySelector: q => q === "#kejadian table" ? null : null, addEventListener: (n, f) => ev.push([n, f])};
  const g = {document: dok, console, Date, Math, Number, JSON, Promise, Set, S: {uk: {hari: ["2026-11-16", "2026-11-17"]}, hari: 1, urut, ukuranIzin: izin},
    UnduhTabel: {tema: a => { pil.a = a; }, registri: async () => [{id: "udara", bagikan: {sumber: "CAMS; BMKG"}}], tombol: () => "<b>unduh</b>"},
    KAT: [{n: "Baik"}, {n: "Sedang"}, {n: "Tidak sehat"}, {n: "Sangat tidak sehat"}, {n: "Berbahaya"}], kat: v => [15.5, 55.4, 150.4, 250.4].reduce((n, b) => n + (v > b), 0),
    renderDaftar() {}, Stasiun: {segar: () => stasiun}, jamWIB: t => "WIB " + t, nanti: f => f()};
  g.window = g; const c = vm.createContext(g), stub = g.UnduhTabel;
  vm.runInContext(baca("public/inti/unduh_tabel.js"), c); Object.assign(g.UnduhTabel, stub);   // tabelHtml dan laporan dari mesin bersama, sisanya tiruan
  vm.runInContext(baca("public/udara/unduh.js"), c); return {g, pil, ev, c};
}
test("unduh udara: tabel provinsi persis seperti yang tampil, berlabel hipotesis model dan hari terpilih", () => {
  const {g} = dunia(), t = g.UnduhTabelUdara.provinsi();
  assert.deepEqual(stabil(t.baris), BARIS); assert.equal(t.nama, "Provinsi"); assert.match(t.ket, /hipotesis/); assert.match(t.ket, /bukan ISPU resmi/); assert.match(t.ket, /17 Nov 2026/);
  assert.equal(t.kolom.length, BARIS[0].length);
});
test("unduh udara: stasiun BMKG tabel terpisah dari model, tanpa stasiun = tidak ada tabel (bukan nol)", () => {
  assert.equal(dunia().g.UnduhTabelUdara.stasiun(), null);
  const {g} = dunia({stasiun: [{nama: "Pekanbaru", v: 70.46, t: "2026-11-16T03:00"}, {nama: "Jambi", v: 20, t: "2026-11-16T03:00"}]}), t = g.UnduhTabelUdara.stasiun();
  assert.equal(t.baris[0][0], "Pekanbaru"); assert.equal(t.baris[0][1], 70.5); assert.equal(t.baris[0][2], "Tidak sehat"); assert.match(t.ket, /bukan model/);
});
test("unduh udara: kumpul menyusun judul, tanggal terpilih, dan sumber tanpa menghitung ulang", async () => {
  const {g, pil} = dunia({stasiun: [{nama: "A", v: 10, t: "x"}]}), d = await pil.a.kumpul();
  assert.equal(pil.a.id, "udara"); assert.equal(d.iso, "2026-11-17"); assert.deepEqual(stabil(d.tabel.map(t => t.nama)), ["Provinsi", "Stasiun BMKG (terukur)"]); assert.match(d.sumber, /CAMS; BMKG/);
  assert.doesNotMatch(JSON.stringify(d), /\baman\b/i);
});
test("unduh udara: ukuran provinsi hanya yang diizinkan registri, memilih mengubah urutan kolom panel", () => {
  const {g} = dunia({izin: [{slug: "pm25", label: "PM2,5"}, {slug: "jiwa", label: "Jiwa terpapar"}]}), U = g.UnduhTabelUdara;
  assert.equal(U.ukAktif(), "pm25"); assert.equal(U.pilihUkuran("jiwa"), true); assert.deepEqual(stabil(g.S.urut), {i: 3, d: -1}); assert.equal(U.ukAktif(), "jiwa");
  assert.equal(U.pilihUkuran("tidak-ada"), false);
  const t = dunia({izin: [{slug: "pm25", label: "PM2,5"}]}).g.UnduhTabelUdara; assert.equal(t.pilihUkuran("jiwa"), false, "slug yang tidak diizinkan registri ditolak");
});
test("unduh udara: index.html memuat mesin sebelum adaptor, css tombol, dan tanpa titik tengah", () => {
  const h = baca("public/udara/index.html"), k = baca("public/udara/unduh.js");
  for (const s of ["inti/unduh.js", "inti/unduh_tabel.js", "unduh_tabel.css"]) assert.ok(h.includes(s), s);
  assert.ok(h.indexOf("inti/unduh_tabel.js") < h.indexOf('src="unduh.js"')); assert.ok(h.indexOf('src="peta.js"') < h.indexOf('src="unduh.js"'));
  assert.ok(!/·/.test(k));
});
