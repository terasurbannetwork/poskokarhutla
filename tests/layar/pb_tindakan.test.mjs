// PB-27: checklist tangga tindakan (public/inti/tangga_tugas.js). Murni diuji lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/inti/tangga_tugas.js"), vm.createContext({window: win, URLSearchParams, Date, console}));
const T = win.PbTangga;

test("pelaksana enum sama dengan server (src/pb_isian.js), tanpa nama orang", () => {
  const m = /PELAKSANA = \[([^\]]+)\]/.exec(baca("src/pb_isian.js"))[1].match(/"(\w+)"/g).map(s => s.slice(1, -1));
  assert.deepEqual([...T.PELAKSANA].map(x => x[0]).filter(Boolean), m); assert.equal(T.labelPelaksana(null), "Pelaksana belum ditentukan");
});
test("batas: tampil WIB, kosong belum tersedia, bolak-balik datetime-local", () => {
  const ms = Date.UTC(2026, 10, 15, 3, 5); // 10.05 WIB
  assert.equal(T.batasTeks(ms), "15 Nov 10.05 WIB"); assert.equal(T.batasTeks(null), "belum tersedia");
  assert.equal(T.nilaiBatas(ms), "2026-11-15T10:05"); assert.equal(T.dariBatas("2026-11-15T10:05"), ms); assert.equal(T.dariBatas(""), null);
});
test("terlambat hanya untuk butir belum selesai; hitung selesai", () => {
  assert.equal(T.terlambat({selesai: false, batas: 5}, 10), true); assert.equal(T.terlambat({selesai: true, batas: 5}, 10), false); assert.equal(T.terlambat({selesai: false, batas: null}, 10), false);
  assert.deepEqual({...T.hitung([{selesai: true}, {selesai: false}])}, {selesai: 1, total: 2});
});
test("badan POST dan url sesuai kontrak server", () => {
  assert.equal(T.urlTindakan("a|b"), "/api/pb/tindakan?peringatan=a%7Cb");
  assert.deepEqual({...T.badanSimpan("k", {no: 2, pelaksana: "bpbd"}, true, "regu", 99)}, {peringatan: "k", butir: 2, selesai: true, pelaksana: "regu", batas: 99});
  assert.deepEqual({...T.badanSimpan("k", {no: 0}, false, "", null)}, {peringatan: "k", butir: 0, selesai: false, pelaksana: ""});
  assert.match(T.galatRamah(403, null), /tidak berhak/);
});
test("warga tanpa hak tulis: kontrol tulis tidak digambar (statis)", () => {
  const js = baca("public/inti/tangga_tugas.js");
  assert.match(js, /cek\.disabled = !o\.bisaTulis/); assert.match(js, /if \(o\.bisaTulis\) \{[\s\S]*?datetime-local[\s\S]*?\} else baris\.append\(ket\)/);
});
test("muat() berhenti bila ditutup", () => {
  const m = baca("public/inti/tangga_tugas.js").match(/async function muat\(\) \{[\s\S]*?\n    \}\n/)[0];
  assert.match(m, /^async function muat\(\) \{\n\s*if \(S\.tutup\) return;/); assert.match(m, /await api[\s\S]*?if \(S\.tutup \|\| n !== S\.sibuk\) return;/);
});
test("gerbang statis: aman teks, tanpa 'aman', tanpa titik tengah, tanpa kesimpulan", () => {
  const js = baca("public/inti/tangga_tugas.js");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|outerHTML|document\.write|\beval\(|alert\(|confirm\(|prompt\(/);
  assert.doesNotMatch(js, /["'][^"'\n]*[ ]·[ ][^"'\n]*["']/); assert.doesNotMatch(js, /Sumber:|class="ex-ft"|ops-lead|text-transform/);
  assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ""), /\baman\b/i);
  for (const n of ['"Tangga tindakan"', "/api/pb/tindakan", "requestAnimationFrame"]) assert.ok(js.includes(n), n);
});
