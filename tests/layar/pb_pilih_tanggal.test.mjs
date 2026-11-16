// PB-73 (F-36): mesin public/inti/pilih_tanggal.js (daftar tanggal berdata, label WIB, gerbang registri) + penyaringan gempa per tanggal WIB di public/gempa/peta.js.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const tunggu = () => new Promise(r => setTimeout(r, 5));

function dunia({daftar, fetchGagal = false} = {}) {
  const win = {}; win.window = win;
  const ctx = {window: win, console, setTimeout, Date, Promise, Number, Set};
  if (daftar !== undefined || fetchGagal) ctx.fetch = async () => fetchGagal ? {ok: false, status: 500} : {ok: true, json: async () => ({bencana: daftar})};
  vm.runInContext(baca("public/inti/pilih_tanggal.js"), vm.createContext(ctx)); return win.PilihTanggal;
}
const reg = (id, ok) => ({id, kemampuan: {layar: {pilih_tanggal: ok}}});
/* 16 Nov 2026 10.00 WIB = 03.00 UTC */
const KINI = Date.parse("2026-11-16T03:00:00Z");
const m = iso => Date.parse(iso);

test("daftarTanggal: hanya tanggal berdata, terbaru dulu, label Hari ini/Kemarin dalam WIB", () => {
  const P = dunia().model;
  const d = P.daftarTanggal([m("2026-11-16T01:00:00Z"), m("2026-11-16T02:00:00Z"), m("2026-11-14T20:00:00Z"), m("2026-11-12T05:00:00Z")], KINI);
  /* 14 Nov 20.00 UTC = 15 Nov 03.00 WIB = Kemarin */
  assert.deepEqual(JSON.parse(JSON.stringify(d)), [{iso: "2026-11-16", label: "Hari ini"}, {iso: "2026-11-15", label: "Kemarin"}, {iso: "2026-11-12", label: "12 Nov"}]);
  assert.equal(P.daftarTanggal([], KINI).length, 0); assert.equal(P.daftarTanggal(null, KINI).length, 0);
  assert.equal(P.daftarTanggal([NaN, undefined], KINI).length, 0, "waktu tak valid dibuang");
});
test("batas hari WIB: 17.00 UTC sudah hari berikutnya", () => {
  const P = dunia().model; assert.equal(P.wibIso(m("2026-11-15T17:00:00Z")), "2026-11-16"); assert.equal(P.wibIso(m("2026-11-15T16:59:00Z")), "2026-11-15");
  assert.equal(P.geser("2026-03-01", -1), "2026-02-28");
});
test("bagi: Hari ini/Kemarin tanpa data = null (tidak ditawarkan), sisanya ke Tanggal lain", () => {
  const P = dunia().model, d = P.daftarTanggal([m("2026-11-14T05:00:00Z"), m("2026-11-11T05:00:00Z")], KINI), b = P.bagi(d, KINI);
  assert.equal(b.hariIni, null); assert.equal(b.kemarin, null); assert.deepEqual(JSON.parse(JSON.stringify(b.lain.map(x => x.iso))), ["2026-11-14", "2026-11-11"]);
  const c = P.bagi(P.daftarTanggal([m("2026-11-16T01:00:00Z")], KINI), KINI); assert.equal(c.hariIni, "2026-11-16"); assert.equal(c.lain.length, 0);
});
test("gerbang registri: false/tanpa kunci/id asing/karhutla = tidak terpasang; true = terpasang", async () => {
  assert.equal(dunia().model.izinReg([reg("gempa", false)], "gempa"), false);
  assert.equal(dunia().model.izinReg([{id: "gempa", kemampuan: {}}], "gempa"), false);
  assert.equal(dunia().model.izinReg([reg("banjir", true)], "gempa"), false);
  assert.equal(dunia().model.izinReg([reg("karhutla", true)], "karhutla"), false, "karhutla punya pemilih sendiri");
  assert.equal(dunia().model.izinReg([reg("gempa", true)], "gempa"), true);
  for (const o of [{daftar: [reg("gempa", false)]}, {fetchGagal: true}, {}]) {
    const P = dunia(o), host = {innerHTML: "", firstChild: null, addEventListener() {}};
    P.pasang({id: "gempa", host: () => host, tanggal: () => [KINI], ubah() {}}); await tunggu(); assert.equal(P.diizinkan(), false); assert.equal(host.innerHTML, "", JSON.stringify(o));
  }
});
test("terpasang bila registri true: host berisi tiga bagian, Real Time/Riwayat hanya bila adaptor punya riwayat", async () => {
  const P = dunia({daftar: [reg("gempa", true)]}), host = {innerHTML: "", firstChild: null, addEventListener() {}}; let riw = null;
  P.pasang({id: "gempa", host: () => host, tanggal: () => [Date.now()], ubah() {}, get riwayat() { return riw; }}); await tunggu();
  assert.equal(P.diizinkan(), true); assert.match(host.innerHTML, /Hari ini/); assert.match(host.innerHTML, /Kemarin/); assert.match(host.innerHTML, /<select[^>]*data-pt-lain/); assert.doesNotMatch(host.innerHTML, /Riwayat/);
  assert.match(host.innerHTML, /data-pt="[^"]+" aria-pressed="false">Hari ini/, "hari ini berdata, tombol hidup");
  assert.match(host.innerHTML, /data-pt="" aria-pressed="false" disabled>Kemarin/, "kemarin tanpa data, tombol mati");
  assert.doesNotMatch(host.innerHTML, /#[0-9a-f]{3,6}\b/i, "tanpa warna literal");
  riw = {ubah() {}}; host.innerHTML = ""; host.firstChild = null; P.gambar(); assert.match(host.innerHTML, /Real Time/); assert.match(host.innerHTML, /Riwayat/);
});
test("sesuai dan penyaringan gempa per tanggal WIB memakai dalamRentang di peta.js", () => {
  const P = dunia().model; assert.equal(P.sesuai(m("2026-11-15T17:30:00Z"), "2026-11-16"), true); assert.equal(P.sesuai(m("2026-11-15T10:00:00Z"), "2026-11-16"), false); assert.equal(P.sesuai(1, null), true);
  const src = baca("public/gempa/peta.js"), ambil = n => src.split(/\r?\n/).find(l => l.startsWith("const " + n + " ="));
  const S = {gempa: [], rentang: 24, tanggal: null}, ctx = vm.createContext({S, Date}); vm.runInContext(ambil("tglWIB") + "\n" + ambil("dalamRentang") + "\nglobalThis.dalam = dalamRentang;", ctx);
  S.gempa = [{id: "a", t: m("2026-11-15T17:30:00Z")}, {id: "b", t: m("2026-11-15T10:00:00Z")}, {id: "c", t: m("2026-11-14T20:00:00Z")}, {id: "d", t: m("2026-11-16T01:00:00Z")}];
  S.tanggal = "2026-11-16"; assert.deepEqual(ctx.dalam().map(g => g.id), ["a", "d"]);
  S.tanggal = "2026-11-15"; assert.deepEqual(ctx.dalam().map(g => g.id), ["b", "c"]);
  S.tanggal = "2026-11-01"; assert.deepEqual(ctx.dalam().map(g => g.id), []);
  assert.ok(src.includes("tglWIB(g.t) !== S.tanggal"), "geoGempa (peta) ikut menyaring per tanggal");
});
test("kode mesin menyebut kemampuan dan pilih_tanggal (gerbang bencana); adaptor menyerahkan render berat ke nanti", () => {
  const s = baca("public/inti/pilih_tanggal.js"); assert.ok(s.includes("kemampuan") && s.includes("pilih_tanggal") && s.includes("nanti"));
  assert.ok(baca("public/gempa/tanggal.js").includes("PilihTanggal.pasang"));
});
