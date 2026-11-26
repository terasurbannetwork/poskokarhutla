import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {kodeKab, barisPrakiraan} from "../../public/lapor/dampak_peringatan.js";

const win = {}; new Function("globalThis", "document", readFileSync(new URL("../../public/inti/dampak_peringatan.js", import.meta.url), "utf8"))(win, {});
const DP = win.DampakPeringatan;
const ringkas = {kab: {"3501": {nama: "Kab. Pacitan"}, "3571": {nama: "Kota Kediri"}}};
const st = (s, extra = {}) => ({s, segar: true, boleh_tampil: true, ...extra});
const status = {kab: {"3501": {status: {BNJ: st(2), LSR: st(1), CEX: st(0), KHT: st(3, {boleh_tampil: false})}}, "3571": {status: {BNJ: st(0)}}}};

test("kodeKab memetakan kab_kode ke kode 4 angka", () => {
  assert.equal(kodeKab("35|Pacitan", ringkas, status), "3501");
  assert.equal(kodeKab("35|Kota Kediri", ringkas, status), "3571");
  assert.equal(kodeKab("36|Pacitan", ringkas, status), null);
  assert.equal(kodeKab("", ringkas, status), null);
});
test("baris memilih tingkat tertinggi dan menandai hipotesis", () => {
  const b = barisPrakiraan("35|Pacitan", {status, ringkas, DP});
  assert.deepEqual([b.kode, b.teks, b.hipotesis], ["kht", "Status prakiraan: Awas karhutla", true]);
});
test("Normal, tanpa data, atau kab tak dikenal: tidak ada baris (N9, tidak mengubah apa pun)", () => {
  assert.equal(barisPrakiraan("35|Kota Kediri", {status, ringkas, DP}), null);
  assert.equal(barisPrakiraan("35|Pacitan", {status: null, ringkas, DP}), null);
  assert.equal(barisPrakiraan("99|Xyz", {status, ringkas, DP}), null);
});
