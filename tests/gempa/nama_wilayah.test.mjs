import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

/* PB-68.1: nama wilayah mentah BMKG di tab Kejadian dan kartu Cerita ditulis lewat wilayahPendek, dengan kamus dari pusat_kec.json */
const c = {console, Math, JSON, Set, Object, String, Array, Promise, window: {}, fmt: x => x, jamWIB: x => x, KG: {}, GempaPager: {}};
vm.createContext(c);
const kata = fs.readFileSync("public/gempa/kata.js", "utf8").replace(/^"use strict";/, "");
vm.runInContext(kata + "\n;globalThis.WP = wilayahPendek; globalThis.NW = NamaWil;", c);
c.NW.bangun(JSON.parse(fs.readFileSync("public/banjir/data/pusat_kec.json", "utf8")));
const W = c.WP;

test("nama kabupaten BMKG yang menyatu jadi bentuk rapi", () => {
  assert.equal(W("Pusat gempa berada di laut 265 km Tenggara BURUSELATAN-MALUKU"), "Laut 265 km tenggara Buru Selatan");
  assert.equal(W("127 km BaratLaut GORONTALOUTARA-GORONTALO"), "127 km barat laut Gorontalo Utara");
  assert.equal(W("69 km BaratLaut KEBARMANOKWARI-PAPUABRT"), "69 km barat laut Kebar Manokwari");
  assert.equal(W("20 km BaratLaut SERAMBAGIANTIMUR-MALUKU"), "20 km barat laut Seram Bagian Timur");
  assert.equal(W("30 km Timur OKEIBIL-PAPUAPGNN"), "30 km timur Oke Ibil");
});

test("sama dengan nama kabupaten yang ditulis tab Simulasi", () => {
  const pusat = JSON.parse(fs.readFileSync("public/banjir/data/pusat_kec.json", "utf8"));
  const kab = Object.keys(pusat).map(k => k.split("|")[1]);
  assert.ok(kab.includes("Seram Bagian Timur"));
  assert.ok(W("20 km BaratLaut SERAMBAGIANTIMUR-MALUKU").endsWith("Seram Bagian Timur"));
});

test("tanpa kamus nama tetap terbaca seperti sebelumnya", () => {
  const k = c.NW.kamus; c.NW.kamus = null;
  assert.equal(W("20 km BaratLaut SERAMBAGIANTIMUR-MALUKU"), "20 km barat laut Serambagiantimur");
  c.NW.kamus = k;
});
