/* Gerbang pencocokan karya riset ke kejadian besar: Merapi bukan Marapi, Cianjur cocok "Cianjur earthquake", tahun di luar rentang tidak. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const akar = {}; new Function("window", readFileSync(new URL("../../public/fungsi_direktori.js", import.meta.url), "utf8"))(akar);
const c = akar.cocokKejadian;
const cianjur = () => ({nama: "Gempa Cianjur", jenis: "gempa", tanggal: "2022-11-21"});

test("tempat + jenis + tahun cocok", () => {
  assert.equal(c(cianjur(), {judul: "Rapid assessment of the Cianjur earthquake", tahun: 2023}), true);
  assert.equal(c(cianjur(), {judul: "Gempa Cianjur dan kerusakan bangunan", tahun: 2022}), true);
});
test("tahun di luar rentang tidak cocok", () => { assert.equal(c(cianjur(), {judul: "Cianjur earthquake damage", tahun: 2030}), false); assert.equal(c(cianjur(), {judul: "Cianjur earthquake damage", tahun: 2015}), false); });
test("jenis berbeda tidak cocok", () => { assert.equal(c(cianjur(), {judul: "Flood risk in Cianjur", tahun: 2022}), false); });
test("Merapi tidak sama dengan Marapi", () => {
  const merapi = {nama: "Erupsi Merapi", jenis: "gunung api", tanggal: "2010-10-26"}, marapi = {nama: "Erupsi Marapi", jenis: "gunung api", tanggal: "2023-12-03"};
  assert.equal(c(merapi, {judul: "Merapi volcano eruption 2010 lahar", tahun: 2011}), true);
  assert.equal(c(merapi, {judul: "Marapi volcano eruption", tahun: 2011}), false);
  assert.equal(c(marapi, {judul: "Merapi volcano eruption", tahun: 2023}), false);
});
test("nama tanpa kata tempat (hanya kata umum) tidak mencocokkan apa pun", () => { assert.equal(c({nama: "Gempa besar", jenis: "gempa", tanggal: "2020-01-01"}, {judul: "earthquake", tahun: 2020}), false); });
