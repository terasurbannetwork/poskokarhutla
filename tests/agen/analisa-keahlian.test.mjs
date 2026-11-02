/* Gerbang analisa keahlian pakar dari histori karya: tiap label punya bukti karya, Kepulauan Riau bukan Riau, ambang minimal, tren dulu vs kini. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const akar = {}; new Function("window", readFileSync(new URL("../../public/fungsi_direktori.js", import.meta.url), "utf8"))(akar);
const a = akar.analisaKeahlian;
const K = [
  {id: "W1", judul: "Peat fire risk mapping in Central Kalimantan", tahun: 2012},
  {id: "W2", judul: "Haze exposure and health in Riau", tahun: 2014},
  {id: "W3", judul: "Wildfire early warning for Kalimantan Tengah", tahun: 2015},
  {id: "W4", judul: "Flood recovery of households in Kepulauan Riau", tahun: 2023},
  {id: "W5", judul: "Flood evacuation shelter planning in Jakarta", tahun: 2024},
  {id: "W6", judul: "Urban flood hazard in Jakarta", tahun: 2025},
];
const kunci = arr => arr.map(e => e.kunci);

test("jenis bencana dihitung dari judul, tiap label membawa bukti karya", () => {
  const r = a(K);
  assert.deepEqual(kunci(r.jenis).sort(), ["banjir", "karhutla"]);
  const kh = r.jenis.find(e => e.kunci === "karhutla");
  assert.equal(kh.n, 3);
  assert.deepEqual(kh.bukti.map(b => b.id), ["W3", "W2", "W1"], "bukti terbaru dulu");
});

test("wilayah: Kepulauan Riau tidak ikut dihitung Riau, Central Kalimantan = Kalimantan Tengah", () => {
  const r = a(K, {min: 1});
  const w = Object.fromEntries(r.wilayah.map(e => [e.kunci, e.n]));
  assert.equal(w["Kalimantan Tengah"], 2);
  assert.equal(w["Kepulauan Riau"], 1);
  assert.equal(w["Riau"], 1, "hanya W2, bukan W4");
  assert.equal(w["DKI Jakarta"], 2);
});

test("ambang bawaan 2 karya: label sekali muncul tidak tampil", () => {
  const r = a(K);
  assert.ok(!kunci(r.fase).includes("tanggap"), "evakuasi cuma satu karya");
  assert.ok(kunci(r.fase).includes("pra"));
  assert.ok(!kunci(r.wilayah).includes("Riau"));
});

test("klaster PB: shelter dan evakuasi masuk pengungsian, health masuk kesehatan", () => {
  const r = a(K, {min: 1});
  assert.ok(kunci(r.klaster).includes("pengungsian"));
  assert.ok(kunci(r.klaster).includes("kesehatan"));
});

test("tren: karhutla dulu, banjir kini; null bila karya terlalu sedikit", () => {
  const r = a(K);
  assert.equal(r.tren.dulu.jenis[0].kunci, "karhutla");
  assert.equal(r.tren.kini.jenis[0].kunci, "banjir");
  assert.equal(r.tren.kini.sampai, 2025);
  assert.equal(a(K.slice(0, 3)).tren, null);
});

test("kata utuh: 'storming' dan 'Serangan' tidak memicu, input kosong aman", () => {
  const r = a([{id: "X", judul: "Brainstorming serangan hama padi", tahun: 2020}, {id: "Y", judul: "Brainstorming serangan hama jagung", tahun: 2021}]);
  assert.deepEqual(r.jenis, []);
  assert.deepEqual(r.wilayah, []);
  assert.deepEqual(a(null).jenis, []);
});

test("klaster sarpras: 'capacity building' dan 'forest structure' bukan bangunan", () => {
  const r = a([{id: "A", judul: "Capacity building for village forest structure", tahun: 2020}, {id: "B", judul: "Capacity building and forest structure in Riau", tahun: 2021}]);
  assert.ok(!r.klaster.some(e => e.kunci === "sarpras"));
  const s = a([{id: "C", judul: "Seismic retrofit of school buildings", tahun: 2020}, {id: "D", judul: "Bridge damage after the Palu earthquake", tahun: 2019}]);
  assert.ok(s.klaster.some(e => e.kunci === "sarpras"));
});

test("SAR radar (synthetic aperture radar) bukan klaster pencarian dan penyelamatan", () => {
  const r = a([{id: "A", judul: "Peat subsidence from SAR interferometry", tahun: 2020, kunci: ["SAR"]}, {id: "B", judul: "SAR mapping of mangroves", tahun: 2021}]);
  assert.ok(!r.klaster.some(e => e.kunci === "sar"));
});
