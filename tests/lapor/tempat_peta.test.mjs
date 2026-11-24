/* K83: nama tempat rusak dari laporan untuk peta meja, dan pelolosan nama jalan ke Overpass QL */
import test from "node:test";
import assert from "node:assert/strict";
import {tempatRusak} from "../../src/lapor_tampil.js";
import {polaJalan} from "../../src/lapor_jalan.js";

test("tempatRusak memecah nama bernomor, koma, titik koma; kosong dan belum diabaikan; nama di atas 80 huruf dibuang", () => {
  const t = tempatRusak({isian: {nama_sekolah: {nilai: "SD Negeri 1; SMP Negeri 2, PAUD Melati"}, nama_jalan: {nilai: "1. Jalan Pemuda\n2. Jalan Pramuka"},
    titik_pengungsian: {belum: true}, nama_faskes: {nihil: true}, nama_ibadah: {nilai: "x".repeat(90)}}});
  assert.deepEqual(t, {sekolah: ["SD Negeri 1", "SMP Negeri 2", "PAUD Melati"], jalan: ["Jalan Pemuda", "Jalan Pramuka"]});
  assert.equal(tempatRusak({isian: {}}), null);
});

test("polaJalan tidak bisa keluar dari string atau regex Overpass", () => {
  const p = polaJalan(['Jl. A"]; out;', "B\\C", "Jalan (X)|Y", "baris\nbaru"]);
  assert.ok(!p.includes('"') && !p.includes("\n"));
  assert.match(p, /Jl\\\. A/);
  assert.match(p, /Jalan \\\(X\\\)\\\|Y/);
});
