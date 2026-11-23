// PB-86 (F-36, D16): adaptor pesisir public/pesisir/tanggal.js. Tanggal hanya dari data rob dan pasang surut yang sudah dimuat.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const ROB = {hari: ["2026-11-14", "2026-11-15", "2026-11-16"], titik: [{lv: [0, 1, 2]}, {lv: [0, 0, 1]}, {lv: [0, null, 0]}]};
const PAS = {stasiun: [{hari: [["2026-11-10", 70, "20:30"], ["2026-11-16", 80, "21:00"]]}, {hari: [["2026-11-11", 60, "01:00"]]}]};
function dunia(S) {
  const win = {}; win.window = win; const pilih = {}, panggil = {renderPanel: 0, renderHari: 0, segar: 0, lepas: 0, laci: 0};
  const hariSeg = {addEventListener: (n, f) => { pilih.klik = f; }}, host = {};
  const ctx = vm.createContext({window: win, console, setInterval() {}, Date, Promise, Number, Object, Math, JSON, Set, S, HARI_INI: () => "2026-11-16", nanti: f => f(),
    Peta: {segarkan: () => panggil.segar++}, Laci: {tutup: () => panggil.laci++}, renderPanel: () => panggil.renderPanel++, renderHari: () => panggil.renderHari++,
    document: {querySelector: q => q === "#hariSeg" ? hariSeg : {after() {}}, getElementById: () => host, createElement: () => ({style: {}}), hidden: false},
    PilihTanggal: {pasang: a => { pilih.a = a; }, gambar() {}, lepas: () => panggil.lepas++}});
  vm.runInContext(baca("public/pesisir/tanggal.js"), ctx); return {A: pilih.a, T: win.TanggalPesisir, S, panggil, pilih};
}

test("tanggal pesisir: gabungan hari model rob dan hari pasang surut, tanpa tanggal karangan", () => {
  const {A, T} = dunia({rob: ROB, pas: PAS, hari: "2026-11-16"});
  assert.deepEqual(stabil(T.tanggalBerdata()), ["2026-11-10", "2026-11-11", "2026-11-14", "2026-11-15", "2026-11-16"]); assert.equal(A.tanggal().length, 5); assert.ok(A.tanggal().every(Number.isFinite));
  assert.ok(A.kalender.bisa("2026-11-11")); assert.ok(!A.kalender.bisa("2026-11-12"), "tanggal tanpa data tidak ditawarkan"); assert.equal(A.kalender.awal, "2026-11-10");
});
test("tanggal pesisir: angka kalender = titik rob Waspada atau lebih; hari hanya pasang surut bernilai 0", async () => {
  const {A} = dunia({rob: ROB, pas: PAS, hari: "2026-11-16"}), j = (await A.kalender.muat()).jumlah;
  assert.deepEqual(stabil(j), {"2026-11-10": 0, "2026-11-11": 0, "2026-11-14": 0, "2026-11-15": 1, "2026-11-16": 2});
});
test("tanggal pesisir: tanpa data sama sekali = tidak ada tanggal", () => {
  const {A, T} = dunia({rob: null, pas: null, hari: "2026-11-16"}); assert.deepEqual(stabil(A.tanggal()), []); assert.equal(A.kalender.bisa("2026-11-16"), false); assert.deepEqual(stabil(T.jumlahPerTanggal()), {});
});
test("tanggal pesisir: memilih tanggal mengatur S.hari, menggambar ulang garis waktu dan panel; null kembali ke hari ini; garis waktu bawaan melepas pilihan", () => {
  const {A, S, panggil, pilih} = dunia({rob: ROB, pas: PAS, hari: "2026-11-16"});
  A.ubah("2026-11-11"); assert.equal(S.hari, "2026-11-11"); assert.equal(panggil.renderHari, 1); assert.equal(panggil.renderPanel, 1); assert.equal(panggil.segar, 1); assert.equal(panggil.laci, 1);
  A.ubah(null); assert.equal(S.hari, "2026-11-16"); pilih.klik(); assert.equal(panggil.lepas, 1);
});
test("tanggal pesisir: index.html memuat kalender dan pemilih sebelum adaptor, sesudah halaman", () => {
  const h = baca("public/pesisir/index.html"); for (const s of ["inti/kalender.css", "inti/kalender.js", "inti/pilih_tanggal.js", 'src="tanggal.js"']) assert.ok(h.includes(s), s);
  assert.ok(h.indexOf("inti/pilih_tanggal.js") < h.indexOf('src="tanggal.js"')); assert.ok(h.indexOf('src="pesisir.js"') < h.indexOf('src="tanggal.js"')); assert.ok(!/·/.test(baca("public/pesisir/tanggal.js")));
});
test("tanggal pesisir: panel memanggil PilihTanggal.gambar sesudah data dimuat", () => {
  assert.match(baca("public/pesisir/pesisir.js"), /window\.PilihTanggal\?\.gambar\(\)/);
});
