// U2 (lapor-kejadian RENCANA-UJI): terverifikasiBpbd, lima syarat A3 satu per satu dibalik.
import {test} from "node:test";
import assert from "node:assert/strict";
import {terverifikasiBpbd, kejadianTerverifikasi, penandaPemeriksa, waktuVerifikasi} from "../../src/lapor_kejadian.js";
import {cakupanMeja} from "../../src/lapor_meja_hak.js";

const W = {provKode: "13", kabKode: "13.71", kab: "Kota Padang"};
const LAP = {status: "ditindaklanjuti", wilayah: W};
const BPBD = {jenis: "bpbd", tingkat: "kab", prov: "13", kab: "13.71", kabNama: null};
const P = (id, hasil, waktu, akun = BPBD) => ({id, hasil, waktu, akun});
const OK = [P(1, "valid", 1000)];

test("semua syarat benar: terverifikasi", () => assert.equal(terverifikasiBpbd(LAP, OK), true));
test("1: sebagian salah, tidak_valid salah, tanpa pengecekan salah", () => {
  assert.equal(terverifikasiBpbd(LAP, [P(1, "sebagian", 1000)]), false);
  assert.equal(terverifikasiBpbd(LAP, [P(1, "tidak_valid", 1000)]), false);
  assert.equal(terverifikasiBpbd(LAP, []), false);
});
test("1: Valid lalu Tidak valid, terakhir menang; Tidak valid lalu Valid benar", () => {
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000), P(2, "tidak_valid", 2000)]), false);
  assert.equal(terverifikasiBpbd(LAP, [P(1, "tidak_valid", 1000), P(2, "valid", 2000)]), true);
});
test("1: waktu sama, id terbesar menang", () => {
  assert.equal(terverifikasiBpbd(LAP, [P(5, "sebagian", 1000), P(4, "valid", 1000)]), false);
  assert.equal(terverifikasiBpbd(LAP, [P(4, "sebagian", 1000), P(5, "valid", 1000)]), true);
});
test("2: staf BNPB salah, tanpa penanda salah, BPBD wilayah lain salah, bpbd_klaim salah", () => {
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, penandaPemeriksa(cakupanMeja({bnpb: true, nama: "BPBD Kota Padang"})))]), false);
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, null)]), false);
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, {...BPBD, kab: "13.01"})]), false);
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, {...BPBD, prov: "12", kab: "12.71"})]), false);
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, {jenis: "bpbd_klaim", tingkat: "kab", prov: "13", kab: "13.71"})]), false);
});
test("2: BPBD provinsi wilayahnya benar; penanda dari cakupanMeja akun pemkot benar", () => {
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, {jenis: "bpbd", tingkat: "prov", prov: "13"})]), true);
  const c = cakupanMeja({jenis: "pemkot", tingkat: "kab", prov: "13", kab: "13.71", wilayah: "Kota Padang", status: "aktif", nama: "Andi"});
  const t = penandaPemeriksa(c);
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, t)]), true);
  // akun kab tanpa kode (hanya nama kab): penanda kab_nama dari baris D1 dibaca sama
  const n = penandaPemeriksa(cakupanMeja({jenis: "pemkot", tingkat: "kab", prov: "13", kab: "Kota Padang", status: "aktif"}));
  assert.equal(n.kab, null); assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, n)]), true);
  assert.equal(terverifikasiBpbd(LAP, [P(1, "valid", 1000, {...n, kab_nama: "kota bukittinggi"})]), false);
});
test("3: tiket Tidak valid salah", () => assert.equal(terverifikasiBpbd({...LAP, status: "tidak_valid"}, OK), false));
test("4: versi lebih baru dari pengecekan salah; versi lebih lama benar", () => {
  assert.equal(terverifikasiBpbd(LAP, OK, [{waktu: 1500}]), false);
  assert.equal(terverifikasiBpbd(LAP, OK, [{waktu: 500}]), true);
});
test("5: tarikan aktif salah; tarikan dicabut benar", () => {
  assert.equal(terverifikasiBpbd(LAP, OK, [], [{id: 1, aktif: 1, waktu: 1200}]), false);
  assert.equal(terverifikasiBpbd(LAP, OK, [], [{id: 1, aktif: 1, waktu: 1200}, {id: 2, aktif: 0, waktu: 1300}]), true);
});
test("kejadian: satu anggota terverifikasi cukup; hanya anggotanya yang dihitung; waktu = Valid terbaru", () => {
  const k = kejadianTerverifikasi([
    {nomor: "LA-201126-01", laporan: LAP, periksa: [P(1, "valid", 1000)], versi: []},
    {nomor: "LA-201126-02", laporan: LAP, periksa: [P(2, "sebagian", 3000)], versi: []},
    {nomor: "LA-201126-03", laporan: LAP, periksa: [P(3, "valid", 2000)], versi: []}]);
  assert.deepEqual(k, {terverifikasi: true, waktu: 2000, anggota: ["LA-201126-01", "LA-201126-03"]});
  assert.deepEqual(kejadianTerverifikasi([{nomor: "x", laporan: LAP, periksa: [], versi: []}]), {terverifikasi: false, waktu: null, anggota: []});
  assert.equal(waktuVerifikasi(LAP, OK, [], [{id: 1, aktif: 1, waktu: 9}]), null);
});
