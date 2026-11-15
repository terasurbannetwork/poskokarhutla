// PB-31: dashboard pimpinan lintas bencana (public/inti/dasbor_pimpinan.js). Inti murni lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/inti/dasbor_pimpinan.js"), vm.createContext({window: win, URLSearchParams, Date, console}));
const P = win.PbPimpinan;

test("status berkas: tanpa berkas belum tersedia, status server dipakai apa adanya, basi tanpa status", () => {
  assert.equal(P.statusBerkas(null), "belum_tersedia"); assert.equal(P.statusBerkas({status: "mati", basi: true}), "mati");
  assert.equal(P.statusBerkas({basi: true}), "basi"); assert.equal(P.statusBerkas({}), "segar");
});
test("hipotesis: hanya true eksplisit yang memasang label", () => {
  assert.equal(P.hipotesis({prospektif: {hipotesis: null}}), false); assert.equal(P.hipotesis({}), false); assert.equal(P.hipotesis({prospektif: {hipotesis: false}}), false); assert.equal(P.hipotesis({prospektif: {hipotesis: true}}), true);
});
test("angka: null dan bukan angka tampil belum tersedia, nol tetap nol", () => {
  assert.equal(P.angkaTeks(null), "belum tersedia"); assert.equal(P.angkaTeks(0), "0"); assert.equal(P.angkaTeks(1234), (1234).toLocaleString("id-ID")); assert.equal(P.angkaTeks("x"), "belum tersedia");
  const b = P.barisAngka({angka: {kejadian_30h: null, peringatan_aktif: 3}, angka_meta: {peringatan_aktif: {sumber: "peringatan", satuan: "peringatan", arti: "aktif"}}});
  assert.equal(b[0].teks, "belum tersedia"); assert.equal(b[1].teks, "3"); assert.match(b[1].title, /sumber peringatan/); assert.equal(b[0].nama, "kejadian 30h");
});
test("operasi: enam baris, null dari server tetap belum tersedia, sumber di title", () => {
  const a = (nilai, sumber) => ({nilai, sumber, waktu: "2026-11-15T00:00:00.000Z"});
  const b = P.barisOperasi({renlap_terbit_hari_ini: a(0, "d1:pb_renlap"), tindakan_terbuka: a(null, "d1:pb_tindakan")});
  assert.equal(b.length, 6); assert.equal(b[0].teks, "0"); assert.match(b[0].title, /d1:pb_renlap/); assert.equal(b[3].teks, "belum tersedia"); assert.equal(b[5].teks, "belum tersedia");
});
test("saringan jenis jamak: kosong = semua, toggle tambah dan lepas, Semua menghapus", () => {
  const ds = [{id: "banjir"}, {id: "gempa"}, {id: "karhutla"}];
  let s = new Set(); assert.equal(P.terpilih(ds, s).length, 3);
  s = P.ganti(s, "banjir"); s = P.ganti(s, "gempa"); assert.deepEqual(P.terpilih(ds, s).map(b => b.id), ["banjir", "gempa"]);
  s = P.ganti(s, "banjir"); assert.deepEqual(P.terpilih(ds, s).map(b => b.id), ["gempa"]); assert.equal(P.ganti(s, "").size, 0);
});
test("url dan galat", () => {
  assert.equal(P.urlRingkas(""), "/api/pb/ringkas"); assert.equal(P.urlRingkas("32"), "/api/pb/ringkas?prov=32"); assert.match(P.galatRamah(403, null), /tidak berhak/);
});
test("muat() berhenti bila sudah ditutup, sebelum dan sesudah await", () => {
  const m = baca("public/inti/dasbor_pimpinan.js").match(/async function muat\(\) \{[\s\S]*?\n    \}\n/)[0];
  assert.match(m, /^async function muat\(\) \{\n\s*if \(S\.tutup\) return;/); assert.match(m, /await api[\s\S]*?if \(S\.tutup \|\| n !== S\.sibuk\) return;/);
});
test("gerbang statis: aman teks, tanpa kaki sumber, tanpa kapital dipaksa, tanpa kata aman, tanpa titik tengah, tanpa garis target dan TV", () => {
  const js = baca("public/inti/dasbor_pimpinan.js"), css = baca("public/inti/dasbor_pimpinan.css");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|outerHTML|document\.write|\beval\(|alert\(|confirm\(|prompt\(/);
  assert.doesNotMatch(js, /["'][^"'\n]*[ ]·[ ][^"'\n]*["']/); assert.doesNotMatch(js, /Sumber:|class="ex-ft"|ops-lead|text-transform|tv=1/);
  assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ""), /\baman\b/i); assert.doesNotMatch(css, /text-transform|background[^;}]*#0b2545/);
  assert.match(css, /gap:20px/); assert.match(css, /align-items:stretch/);
  for (const n of ["/api/pb/ringkas", "requestAnimationFrame", '"Hipotesis"', "PbPimpinan"]) assert.ok(js.includes(n), n);
});
