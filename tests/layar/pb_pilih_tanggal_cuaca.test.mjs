// PB-79c (F-36, D16): adaptor cuaca public/cuaca/tanggal.js. Tanggal hanya yang dilintasi peringatan yang sudah dimuat.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const stabil = x => JSON.parse(JSON.stringify(x));
const wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10), HARI = 864e5;
const iso = ms => new Date(ms).toISOString();
function dunia(S) {
  const win = {}; win.window = win; const panggil = {renderPanel: 0, filter: []}, pilih = {};
  const peta = {getLayer: () => true, setFilter: (id, f) => panggil.filter.push([id, f])};
  const ctx = vm.createContext({window: win, console, setInterval() {}, Date, Promise, Number, Object, Math, JSON, S, peta,
    document: {querySelector: () => ({after() {}}), getElementById: () => ({}), createElement: () => ({style: {}}), hidden: false}, OFS: {WIB: "+07:00", WITA: "+08:00", WIT: "+09:00"},
    PilihTanggal: {pasang: a => { pilih.a = a; }, gambar() {}}, renderPanel: () => panggil.renderPanel++, Laci: {tutup() { panggil.laci = 1; }}});
  vm.runInContext(baca("public/cuaca/tanggal.js"), ctx); return {A: pilih.a, T: win.TanggalCuaca, S, panggil};
}
/* pukul 10.00 WIB hari ini: tetap sama kapan pun uji dijalankan */
const sekarang = Date.parse(wib(Date.now()) + "T10:00:00+07:00");
const NC = [{mulai: iso(sekarang - 36e5), selesai: iso(sekarang + 30 * 36e5)}, {mulai: iso(sekarang - 36e5), selesai: iso(sekarang + 2 * 36e5)}, {mulai: "rusak", selesai: "rusak"}];
const GL = [{prov: "32", zona: "WIB", dari: new Date(sekarang + 7 * 36e5).toISOString().slice(0, 16), sampai: new Date(sekarang + 8 * 36e5 + 3 * HARI).toISOString().slice(0, 16)}];

test("tanggal cuaca: hanya tanggal yang dilintasi peringatan; kemarin dan tanggal tanpa peringatan tidak ditawarkan", () => {
  const {A, T} = dunia({nc: NC, gl: GL, tanggal: null}), j = T.jumlahPerTanggal(), hi = wib(sekarang);
  assert.ok(hi in j); assert.ok(!(wib(sekarang - HARI) in j), "kemarin tanpa peringatan"); assert.ok(A.kalender.bisa(hi)); assert.ok(!A.kalender.bisa(wib(sekarang - HARI)));
  assert.ok(Object.keys(j).length >= 3, "gelombang tiga hari ikut"); assert.equal(A.tanggal().length, Object.keys(j).length);
  assert.ok(A.tanggal().every(Number.isFinite), "peringatan rusak dilewati");
});
test("tanggal cuaca: tanpa peringatan sama sekali = tidak ada tanggal", () => {
  const {A, T} = dunia({nc: [], gl: [], tanggal: null}); assert.deepEqual(stabil(A.tanggal()), []); assert.deepEqual(stabil(T.jumlahPerTanggal()), {}); assert.equal(A.kalender.bisa(wib(sekarang)), false);
});
test("tanggal cuaca: memilih tanggal menyaring nowcast dan gelombang, memasang filter peta, dan membatalkannya", () => {
  const {A, T, S, panggil} = dunia({nc: NC, gl: GL, tanggal: null}), lusa = wib(sekarang + 2 * HARI);
  assert.equal(T.nc(NC[0]), true); A.ubah(lusa);
  assert.equal(S.tanggal, lusa); assert.equal(T.nc(NC[0]), false, "nowcast 30 jam tidak sampai lusa"); assert.equal(T.gl(GL[0]), true); assert.ok(panggil.renderPanel >= 1);
  const f = Object.fromEntries(panggil.filter); assert.deepEqual(stabil(f["bmkg-fill"]), ["in", ["get", "i"], ["literal", []]]); assert.deepEqual(stabil(f.gelombang[2]), ["in", ["get", "kode"], ["literal", ["32"]]]);
  panggil.filter.length = 0; A.ubah(null); assert.equal(S.tanggal, null); const g = Object.fromEntries(panggil.filter); assert.equal(g["bmkg-fill"], null); assert.deepEqual(stabil(g.gelombang), [">", ["get", "lv"], 0]);
});
test("tanggal cuaca: peta.js dan index.html memakai penyaring tanggal dan memuat mesin kalender", () => {
  const p = baca("public/cuaca/peta.js"); assert.match(p, /pd\.nc\(a\)/); assert.match(p, /pd\.gl\(o\)/); assert.match(p, /TanggalCuaca\?\.terapkanPeta\(\)/);
  const h = baca("public/cuaca/index.html"); for (const s of ["inti/kalender.css", "inti/kalender.js", "inti/pilih_tanggal.js", 'src="tanggal.js"']) assert.ok(h.includes(s), s);
  assert.ok(h.indexOf("inti/pilih_tanggal.js") < h.indexOf('src="tanggal.js"'));
});
