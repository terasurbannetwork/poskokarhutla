/* Kartu Laporan warga di Pantau Dalops (public/bnpb/dalops_lapor.js): kelompok per kejadian sama, gugus, lalu tiket; hanya yang masih berjalan.
   Jalan: node --test tests/bnpb/dalops_lapor.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
globalThis.window = globalThis;
await import("../../public/bnpb/dalops_lapor.js");
const D = globalThis.DalopsLapor;

const b = (nomor, o = {}) => ({nomor, jenisId: "banjir", jenis: "Banjir", status: "dilihat", wa: "62800000000" + nomor.slice(-1), terkirim: 1, wilayah: {desa: "Utan Kayu", kab: "Kota Administrasi Jakarta Timur"}, ...o});

test("kelompok: kejadian sama dulu, lalu gugus, lalu tiket; selesai dan tidak valid dibuang; jenis lain dibuang", () => {
  const g = D.kelompok([
    b("LA-1", {kejadian: {kode: "KJ-201126-01"}, gugus: {kode: "GL-1"}, terkirim: 5, status: "baru"}),
    b("LA-2", {kejadian: {kode: "KJ-201126-01"}, terkirim: 9, wa: "628000000001"}),
    b("LA-3", {gugus: {kode: "GL-2"}, terkirim: 3}),
    b("LA-4", {terkirim: 7}),
    b("LA-5", {status: "selesai"}), b("LA-6", {status: "tidak_valid"}), b("LA-7", {jenisId: "longsor"}),
  ], "banjir");
  assert.deepEqual(g.map(x => x.kunci), ["KJ-201126-01", "LA-4", "GL-2"]);   // urut laporan terakhir
  const kj = g[0];
  assert.equal(kj.n, 2); assert.equal(kj.pelapor, 1); assert.equal(kj.baru, 1);
  assert.equal(kj.status, "dilihat");   // status tiket terakhir
  assert.equal(kj.label, "Kejadian sama");
  assert.deepEqual(kj.tempat, ["Utan Kayu, Kota Jakarta Timur"]);
  assert.equal(kj.wa, undefined);   // nomor pelapor tidak ikut keluar
});

test("kelompok: tab gempa ikut membawa tsunami; jenis tanpa padanan kosong", () => {
  assert.equal(D.kelompok([b("LA-1", {jenisId: "tsunami"})], "gempa").length, 1);
  assert.equal(D.kelompok([b("LA-1")], "tidak_ada").length, 0);
});
