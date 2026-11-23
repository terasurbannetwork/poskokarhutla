// PB-85 (F-36, D16): adaptor udara public/udara/tanggal.js. Tanggal hanya hari prakiraan yang datanya sudah dimuat.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
function dunia(S) {
  const pilih = {}, klik = [], tombol = i => ({click() { klik.push(i); }});
  const hariSeg = {addEventListener() {}}, host = {before() {}, firstChild: null};
  const dok = {querySelector: q => q === "#panel .top" ? {querySelector: () => ({before() {}}), lastChild: {before() {}}} : q === "#hariSeg" ? hariSeg : (q.match(/data-i="(\d+)"/) ? tombol(+q.match(/data-i="(\d+)"/)[1]) : null),
    getElementById: () => host, hidden: false, createElement: () => ({style: {}})};
  const g = {document: dok, console, Date, Promise, Number, Object, Math, JSON, S, BATAS: [15.5, 55.4, 150.4, 250.4], setInterval() {}, renderHari() {}, PilihTanggal: {pasang: a => { pilih.a = a; }, gambar() {}, lepas() {}}};
  g.window = g; vm.runInContext(baca("public/udara/tanggal.js"), vm.createContext(g)); return {A: pilih.a, T: g.TanggalUdara, klik};
}
const kota = (...r24) => ({r24});
const dasar = () => ({uk: {hari: ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"]}, h0: 1, hari: 1, prak: {kota: [kota(10, 60, 70, null), kota(10, 20, 80, null), kota(null, 10, null, null)]}});
test("tanggal udara: hanya hari prakiraan berdata dan belum lewat; hari tanpa nilai tidak ditawarkan", () => {
  const {A, T} = dunia(dasar()), j = T.jumlahPerTanggal();
  assert.deepEqual(stabil(j), {"2026-11-16": 1, "2026-11-17": 2}); assert.equal(A.tanggal().length, 2);
  assert.ok(A.kalender.bisa("2026-11-17")); assert.ok(!A.kalender.bisa("2026-11-15"), "kemarin tidak ada arsip"); assert.ok(!A.kalender.bisa("2026-11-18"), "hari tanpa nilai");
});
test("tanggal udara: tanpa prakiraan = tidak ada tanggal", () => {
  const {A} = dunia({uk: null, h0: 0, hari: 0, prak: null}); assert.deepEqual(stabil(A.tanggal()), []);
});
test("tanggal udara: memilih tanggal menekan tombol hari yang sama, null kembali ke hari ini", () => {
  const {A, klik} = dunia(dasar()); A.ubah("2026-11-17"); assert.deepEqual(klik, [2]);
  A.ubah("2026-11-15"); A.ubah("2026-11-30"); assert.deepEqual(klik, [2], "tanggal tak berdata tidak menekan apa pun");
  const s = dasar(); s.hari = 2; const d = dunia(s); d.A.ubah(null); assert.deepEqual(d.klik, [1]);
});
test("tanggal udara: kalender berlabel hipotesis, index.html memuat kalender dan pemilih sebelum adaptor", () => {
  const {A} = dunia(dasar()); assert.match(A.kalender.ket, /hipotesis/);
  const h = baca("public/udara/index.html"); for (const s of ["inti/kalender.css", "inti/kalender.js", "inti/pilih_tanggal.js", 'src="tanggal.js"']) assert.ok(h.includes(s), s);
  assert.ok(h.indexOf("inti/pilih_tanggal.js") < h.indexOf('src="tanggal.js"')); assert.ok(!/·/.test(baca("public/udara/tanggal.js")));
});
