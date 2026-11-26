/* PH-08: fungsi murni potensi-hidromet di public/inti/dampak_peringatan.js. node --test tests/potensi/inti.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import "../../public/inti/dampak_peringatan.js";
const D = globalThis.DampakPeringatan;

test("statusHari: hari, ringkas, semua null", () => {
  const e = {s: 2, hari: [0, 2, null, 1]};
  assert.equal(D.statusHari(e, 1), 2); assert.equal(D.statusHari(e, 2), null);
  assert.equal(D.statusHari(e, "ringkas"), 2);
  assert.equal(D.statusHari({hari: [null, null, null, null]}, "ringkas"), null);
  assert.equal(D.statusHari(undefined, 0), null);
  assert.equal(D.statusHari({hari: [0, 0, 0, 0]}, "ringkas"), 0);
});

test("kelasKab: batas aturan ALGORITMA 5", () => {
  assert.equal(D.kelasKab([0, 0, 0, 0]), null);
  assert.equal(D.kelasKab([10, 0, 0, 0]), null);
  assert.equal(D.kelasKab([0, 6, 0, 4]), "tinggi");        // n3/N = 40%
  assert.equal(D.kelasKab([0, 6, 0, 3]), "sedang");        // 33% -> sedang
});
test("kelasKab: 30 desa dan 10 persen tepat", () => {
  assert.equal(D.kelasKab([0, 270, 0, 30]), "tinggi");
  assert.equal(D.kelasKab([0, 271, 0, 30]), "sedang");     // 30/301 < 10%: sedang karena n3 >= 10
});
test("kelasKab: 10 persen, 10 desa, 60 persen kelas 2-3, rendah", () => {
  assert.equal(D.kelasKab([0, 9, 0, 1]), "sedang");        // 10%
  assert.equal(D.kelasKab([0, 99, 0, 9]), "rendah");       // 9/108 < 10%, n3 < 10, tanpa n2
  assert.equal(D.kelasKab([0, 190, 0, 10]), "sedang");     // n3 = 10
  assert.equal(D.kelasKab([0, 4, 6, 0]), "sedang");        // (n2+n3)/N = 60%
  assert.equal(D.kelasKab([0, 41, 59, 0]), "rendah");      // 59%
  assert.equal(D.kelasKab([5, 1, 0, 0]), "rendah");
});

const status = {kab: {
  "1101": {BNJ: {s: 2, hari: [2, 1, 1, 0]}, LSR: {s: 1, hari: [1, 1, 0, 0]}},
  "1102": {BNJ: {s: 2, hari: [2, 0, 0, 0], E: 3}, LSR: {s: 0, hari: [0, 0, 0, 0]}},
  "1103": {BNJ: {s: 0, hari: [0, 0, 0, 0]}, LSR: {s: 0, hari: [0, 0, 0, 0], sebagian: true}},
  "1104": {BNJ: {s: 0, hari: [0, 0, 0, 0]}, LSR: {s: 0, hari: [0, 0, 0, 0]}},
  "1105": {BNJ: {s: 3, hari: [3, 0, 0, 0]}, LSR: {s: null, hari: [null, null, null, null]}},
}};
const kelas = {kab: {"1101": {nama: "A", n: 10, baseline: {BNJ: [0, 0, 0, 5]}, K: {BNJ: "rendah"}}, "1102": {nama: "B", n: 10, baseline: {BNJ: [0, 0, 0, 1]}, K: {BNJ: "tinggi"}},
  "1103": {nama: "C"}, "1104": {nama: "D"}, "1105": {nama: "E"}}};

test("urutKab: status, E, nama; pil Semua memilih bahaya tertinggi", () => {
  const u = D.urutKab(status, null, 0, kelas);
  assert.deepEqual(u.map(x => x.kab), ["1105", "1102", "1101", "1103", "1104"]);   // 1102 E=3 mengalahkan 1101
  assert.equal(u[2].kode, "BNJ");
  assert.equal(D.urutKab(status, "lsr", 0, kelas)[0].kab, "1101");
});
test("urutKab: seri status dan E diputus K, porsi, lalu nama", () => {
  const st = {kab: {"1": {BNJ: {hari: [2]}}, "2": {BNJ: {hari: [2]}}, "3": {BNJ: {hari: [2]}}, "4": {BNJ: {hari: [2]}}}};
  const kl = {kab: {"1": {nama: "Z", K: {BNJ: "rendah"}}, "2": {nama: "Y", n: 10, baseline: {BNJ: [0, 0, 0, 1]}, K: {BNJ: "tinggi"}}, "3": {nama: "X", n: 10, baseline: {BNJ: [0, 0, 0, 4]}, K: {BNJ: "tinggi"}}, "4": {nama: "W", K: {}}}};
  assert.deepEqual(D.urutKab(st, "BNJ", 0, kl).map(x => x.kab), ["3", "2", "1", "4"]);
});

test("ringkas: Normal hanya bila semua bahaya 0 dan segar", () => {
  assert.deepEqual(D.ringkas(status, 0, ["BNJ", "LSR"]), {awas: 1, siaga: 2, waspada: 0, normal: 1, belum: 1});
  // hanya BNJ tampil: 1103 jadi normal, 1105 awas
  assert.deepEqual(D.ringkas(status, 0, ["BNJ"]), {awas: 1, siaga: 2, waspada: 0, normal: 2, belum: 0});
  assert.deepEqual(D.ringkas(status, "ringkas", ["BNJ", "LSR"]), {awas: 1, siaga: 2, waspada: 0, normal: 1, belum: 1});
  assert.deepEqual(D.ringkas({kab: {}}, 0, ["BNJ"]), {awas: 0, siaga: 0, waspada: 0, normal: 0, belum: 0});
});

test("chipFakta: empat jenis, tak dikenal jadi belum terukur", () => {
  assert.equal(D.chipFakta("sumber").label, "Bersumber");
  assert.equal(D.chipFakta("hitung").label, "Dihitung");
  assert.equal(D.chipFakta("hipotesis").label, "Hipotesis");
  assert.equal(D.chipFakta("belum").label, "Belum terukur");
  assert.equal(D.chipFakta("x").label, "Belum terukur");
  assert.equal(new Set(["sumber", "hitung", "hipotesis", "belum"].map(j => D.chipFakta(j).kelas)).size, 4);
});
