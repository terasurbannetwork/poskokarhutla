/* DP-15 N6: fungsi murni dalops_dampak.js. node --test tests/bnpb/dalops_dampak.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/inti/dampak_peringatan.js";
import "../../public/bnpb/dalops_dampak.js";

const D = globalThis.DalopsDampak, B = globalThis.DampakPeringatan.bulatJiwa;
const desa = {"a": {nama: "Desa A", jiwa_dukcapil: 1234, balita: 50, lansia: 80, jiwa_kelas: {tinggi: 500, sedang: 700, rendah: 34, tak_terliput: 0}, jiwa_jk: {laki: 600, perempuan: 634, label: "perkiraan"}, fasilitas: {sekolah_dapodik: [{nama: "SDN 1"}, {nama: "SDN 2"}], faskes_osm: null}},
  "b": {nama: "Desa B", jiwa_dukcapil: 9000, jiwa_kelas: null}};

test("N6: urut penduduk, kolom sama dengan kepala, angka dibulatkan, kosong bukan nol", () => {
  const u = D.urutDesa(desa); assert.equal(u[0].nama, "Desa B");
  const b = D.barisDesa(desa.b, B); assert.equal(b.length, D.KOLOM.length);
  assert.equal(b[2], "belum terukur"); assert.equal(b[8], "belum terukur"); assert.equal(b[10], "belum terukur");
  const a = D.barisDesa(desa.a, B); assert.equal(a[1], "sekitar 1.200"); assert.equal(a[5], "0");
  assert.match(a[10], /Sekolah \(Dapodik\): SDN 1, SDN 2; Fasilitas kesehatan \(OpenStreetMap\): belum terukur/);
});
test("N6: CSV memuat kepala dan baris persis seperti layar, tanpa nama orang", () => {
  const baris = D.urutDesa(desa).map(x => D.barisDesa(x, B)), c = D.csv(baris);
  assert.ok(c.includes(D.KOLOM.join('";"'))); assert.ok(c.includes('"sekitar 1.200"'));
});
test("daftar kab hanya yang punya bahaya itu", () => {
  const r = {kab: {"1101": {nama: "B", bahaya: {BNJ: {}}}, "1102": {nama: "A", bahaya: {LSR: {}}}, x: {bahaya: {BNJ: {}}}}};
  assert.deepEqual(D.daftarKab(r, "bnj"), [{k: "1101", nama: "B"}]); assert.deepEqual(D.daftarKab(r, "kht"), []);
});
test("tanpa kata terlarang dan tanpa titik tengah di teks klien", () => {
  for (const f of ["public/bnpb/dalops_dampak.js"]) { const t = readFileSync(f, "utf8"); assert.ok(!/\b(aman|terdampak|korban)\b/i.test(t.replace(/\/\*[\s\S]*?\*\//g, ""))); assert.ok(!t.includes(" · ")); }
});
