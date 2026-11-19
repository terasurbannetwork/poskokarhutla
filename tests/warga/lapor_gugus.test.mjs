/* Uji gugus laporan (ALGORITMA A9, TIKET LA-24): ambang jarak dan waktu, mode luas per kab, dua nomor berbeda, label kuat, kode GL. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {hitungGugus} from "../../src/lapor_gugus.js";

const J = 3600e3, T0 = Date.UTC(2026, 10, 19, 3);   // 19 Nov 2026 10.00 WIB
const L = (nomor, o) => ({nomor, jenis: "banjir", lat: -6.2, lon: 106.85, kab: "Kota Jakarta Timur", desa: "Utan Kayu Utara", t: T0, wa: "62811", fotoSah: false, status: "baru", ...o});

test("banjir: dua pelapor berbeda dalam 3 km dan 6 jam jadi satu gugus", () => {
  const h = hitungGugus([L("A"), L("B", {wa: "62822", lat: -6.21, t: T0 + 5 * J})]);
  assert.equal(h.gugus.length, 1); assert.equal(h.gugus[0].n_pelapor, 2); assert.equal(h.gugus[0].label, "gugus");
  assert.equal(h.gugus[0].kode, "GL-191126-01"); assert.equal(h.per.A, h.per.B);
});
test("dua laporan dari satu nomor tidak mendirikan gugus", () => {
  assert.equal(hitungGugus([L("A"), L("B")]).gugus.length, 0);
});
test("di luar radius atau jendela: bukan gugus; kekeringan tidak dihitung; tidak valid dibuang", () => {
  assert.equal(hitungGugus([L("A"), L("B", {wa: "2", lat: -6.3, desa: "Lain"})]).gugus.length, 0);   // ~11 km
  assert.equal(hitungGugus([L("A"), L("B", {wa: "2", t: T0 + 7 * J})]).gugus.length, 0);
  assert.equal(hitungGugus([L("A", {jenis: "kekeringan"}), L("B", {wa: "2", jenis: "kekeringan"})]).gugus.length, 0);
  assert.equal(hitungGugus([L("A"), L("B", {wa: "2", status: "tidak_valid"})]).gugus.length, 0);
});
test("jenis berbeda tidak pernah satu gugus; desa sama tanpa titik tetap cocok", () => {
  assert.equal(hitungGugus([L("A"), L("B", {wa: "2", jenis: "longsor"})]).gugus.length, 0);
  assert.equal(hitungGugus([L("A", {lat: null, lon: null}), L("B", {wa: "2"})]).gugus.length, 1);
});
test("gempa mode luas: kab sama dalam 12 jam, jarak tidak dipakai", () => {
  const g = hitungGugus([L("A", {jenis: "gempa"}), L("B", {jenis: "gempa", wa: "2", lat: -6.6, t: T0 + 11 * J})]);
  assert.equal(g.gugus.length, 1);
  assert.equal(hitungGugus([L("A", {jenis: "gempa"}), L("B", {jenis: "gempa", wa: "2", kab: "Kota Bogor"})]).gugus.length, 0);
});
test("gugus kuat: tiga pelapor, atau dua pelapor berfoto sah; berantai ikut tergabung", () => {
  assert.equal(hitungGugus([L("A"), L("B", {wa: "2"}), L("C", {wa: "3"})]).gugus[0].label, "gugus kuat");
  assert.equal(hitungGugus([L("A", {fotoSah: true}), L("B", {wa: "2", fotoSah: true})]).gugus[0].label, "gugus kuat");
  const r = hitungGugus([L("A"), L("B", {wa: "2", t: T0 + 5 * J}), L("C", {wa: "3", t: T0 + 10 * J})]);
  assert.equal(r.gugus.length, 1); assert.equal(r.gugus[0].n_laporan, 3);
});
