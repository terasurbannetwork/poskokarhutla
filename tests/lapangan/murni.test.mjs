import test from "node:test";
import assert from "node:assert/strict";
import {bacaKode, statusWajah, labelJenis, pesanGalat, cekCsv, tautanLapangan, MAKS_CSV, potong} from "../../public/petugas/murni.js";

const K = "0123456789abcdef0123456789";

test("bacaKode: hanya #k= + 26 heks, huruf besar dikecilkan", () => {
  assert.equal(bacaKode("#k=" + K), K);
  assert.equal(bacaKode("#k=" + K.toUpperCase()), K);
  for (const salah of ["", null, undefined, "#k=", "#k=abc", "#k=" + K + "0", "#k=" + K.slice(1), "#k=" + "z".repeat(26), "k=" + K, "#x=" + K, "#k=" + K + "&a=1", " #k=" + K])
    assert.equal(bacaKode(salah), null, String(salah));
});

test("statusWajah: peta label dan warna; status asing tidak dianggap terdaftar", () => {
  assert.deepEqual(statusWajah("terdaftar"), {label: "Terdaftar", kelas: "hijau", daftar: true});
  assert.equal(statusWajah("belum").kelas, "kuning");
  assert.equal(statusWajah("dihapus").daftar, false);
  for (const x of [undefined, null, "", "aneh", "__proto__", "constructor"]) assert.equal(statusWajah(x).daftar, false, String(x));
});

test("labelJenis memakai istilah glosarium", () => {
  assert.equal(labelJenis("relawan"), "Relawan BNPB");
  assert.equal(labelJenis("pegawai"), "Pegawai");
  assert.equal(labelJenis("x"), "");
});

test("pesanGalat: kalimat manusiawi per status, tanpa titik tengah atau em dash", () => {
  for (const s of [0, 401, 403, 429, 500, 503]) assert.ok(pesanGalat(s).length > 20 && !/[·—]/.test(pesanGalat(s)));
  assert.notEqual(pesanGalat(401), pesanGalat(500));
});

test("cekCsv: terima yang sah, tolak kosong, tanpa kolom nama, kolom asing, terlalu besar", () => {
  assert.deepEqual(cekCsv("nama,nip,unit\nAni,1,A\nBudi,2,B\n"), {jumlah: 2, galat: null});
  assert.deepEqual(cekCsv("﻿nama;wa\r\nAni;0812"), {jumlah: 1, galat: null});
  assert.ok(cekCsv("").galat); assert.ok(cekCsv(null).galat); assert.ok(cekCsv("  \n ").galat);
  assert.match(cekCsv("nip,unit\n1,A").galat, /kolom nama/);
  assert.match(cekCsv("nama,gaji\nAni,1").galat, /gaji/);
  assert.ok(cekCsv("nama\n" + "a".repeat(MAKS_CSV)).galat);
});

test("tautanLapangan: kode di fragmen, bukan di query", () => {
  const t = tautanLapangan("https://centurisk97.id", K);
  assert.equal(t, `https://centurisk97.id/petugas#k=${K}`);
  assert.ok(!t.includes("?"));
});

test("potong: 100 pertama + sisa", () => {
  const a = Array.from({length: 250}, (_, i) => i);
  assert.deepEqual([potong(a).tampil.length, potong(a).sisa], [100, 150]);
  assert.deepEqual(potong([1, 2]), {tampil: [1, 2], sisa: 0});
});
