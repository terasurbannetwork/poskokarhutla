/* TW-01: daftar tunggal delapan klaster PB nasional; fungsi_direktori memakainya tanpa mengubah keluaran. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {KLASTER_PB} from "../../public/inti/klaster.js";

const muat = berkas => { const akar = {KLASTER_PB}; new Function("window", readFileSync(new URL(berkas, import.meta.url), "utf8"))(akar); return akar; };

test("delapan klaster: kunci dan nama persis, urut", () => {
  assert.deepEqual(KLASTER_PB.map(k => [k.kunci, k.nama]), [
    ["kesehatan", "Kesehatan"], ["sar", "Pencarian dan penyelamatan"], ["logistik", "Logistik"],
    ["pengungsian", "Pengungsian dan perlindungan"], ["pendidikan", "Pendidikan"], ["sarpras", "Sarana dan prasarana"],
    ["ekonomi", "Ekonomi"], ["pemulihan", "Pemulihan dini"]]);
  for (const k of KLASTER_PB) assert.ok(k.kata.length > 0);
});

test("analisaKeahlian: penandaan klaster sama dengan keluaran sebelum refaktor", () => {
  const {analisaKeahlian: a} = muat("../../public/fungsi_direktori.js");
  const karya = [
    {id: "A", judul: "Flood evacuation shelter planning and school recovery", tahun: 2020},
    {id: "B", judul: "Hospital health logistics after the earthquake", tahun: 2021},
    {id: "C", judul: "Bridge retrofit and economic loss insurance", tahun: 2022},
    {id: "D", judul: "Search and rescue; rekonstruksi pasca bencana", tahun: 2023},
    {id: "E", judul: "Capacity building for village forest structure", tahun: 2024},
  ];
  const r = a(karya, {min: 1}).klaster.map(e => [e.kunci, e.label, e.n]);
  assert.deepEqual(r, [
    ["pemulihan", "Pemulihan dini", 2], ["ekonomi", "Ekonomi", 1], ["kesehatan", "Kesehatan", 1], ["logistik", "Logistik", 1],
    ["sar", "Pencarian dan penyelamatan", 1], ["pendidikan", "Pendidikan", 1],
    ["pengungsian", "Pengungsian dan perlindungan", 1], ["sarpras", "Sarana dan prasarana", 1]]);
});
