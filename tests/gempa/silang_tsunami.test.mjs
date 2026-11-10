import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const c = {console, Math, JSON, Date, esc: x => String(x ?? ""), fmt: n => (n == null ? "-" : String(n).replace(".", ","))};
vm.createContext(c);
vm.runInContext(fs.readFileSync("public/gempa/tsunami_zona.js", "utf8") + "\nthis.T = TsunamiZona;", c);
const T = c.T, D = JSON.parse(fs.readFileSync("public/gempa/data/tsunami_zona.json", "utf8")), K = JSON.parse(fs.readFileSync("public/gempa/data/zona_tsunami_kamus.json", "utf8"));
const k15 = D.kejadian.bmg2026pwtr;

test("kamus: 60 zona, tiap zona dipetakan atau tercatat belum_dipetakan", () => {
  assert.equal(K.ringkas.zona, 60);
  assert.equal(K.ringkas.cocok + K.ringkas.sebagian + K.ringkas.belum_dipetakan, 60);
  assert.equal(K.belum_dipetakan.length, K.ringkas.belum_dipetakan);
  assert.equal(K.zona["SULUT|KOTA-BITUNG"].kab[0].id, "7172");
  assert.equal(K.zona["NTT|MANGGARAI BAGIAN UTARA"].kab[0].sebagian, true);
});

test("15 Agu 2026: 2 lalu 22 zona; muka air maks 0,94 m; tingkat tertinggi per kabupaten", () => {
  assert.deepEqual(k15.buletin.slice(0, 2).map(b => b.n_zona), [2, 22]);
  assert.equal(k15.ukur_maks_m, 0.94);
  const ende = k15.kab["5308"];
  assert.equal(ende.tingkat_tertinggi, "SIAGA"); assert.ok(ende.zona.length >= 2, "dua zona satu kabupaten, tingkat tertinggi bukan rata-rata");
});

test("pemutar: keadaan berbeda per buletin dan perubahan terbaca", () => {
  const s = k15.buletin.map(b => JSON.stringify(Object.keys(b.kab).sort()) + b.n_zona);
  assert.notEqual(s[0], s[1]);
  assert.match(T.teksUbah(k15.buletin[1]), /zona baru/);
  assert.equal(T.barisKab(k15, k15.buletin[1])[0].tingkat === "SIAGA" || T.barisKab(k15, k15.buletin[1])[0].tingkat === "AWAS", true);
});

test("null = belum ada data, bukan nol; tanpa kata aman di data dan layar", () => {
  assert.equal(T.sel(null), "belum ada data"); assert.equal(T.sel(0), "0");
  const jawab = fs.readFileSync("public/gempa/tsunami_zona.js", "utf8") + JSON.stringify(D) + JSON.stringify(K);
  assert.doesNotMatch(jawab.replace(/\bamanah\b/gi, ""), /\baman\b/i);
  assert.doesNotMatch(jawab, /Pantau Bencana/);
});

test("label latihan dan peta BMKG utuh dengan sumber", () => {
  const src = fs.readFileSync("public/gempa/tsunami_zona.js", "utf8");
  assert.match(src, /Latihan/); assert.match(src, /gambar utuh/); assert.match(src, /Sumber: <a[^>]*>BMKG/);
  assert.match(T.produk(k15, 2, "tt") || "", /^https:\/\/cdn\.bmkg\.go\.id\/.*\.tt\.png$/);
});

import {spawnSync} from "node:child_process";
test("per_kab sungguhan: sebagian_tingkat campuran mengikuti zona penentu tingkat tertinggi (zona sebagian dari kamus nyata)", () => {
  const kode = `import sys, json
sys.path.insert(0, "scripts/gempa")
import tsunami_zona as z
km = {"zona": json.load(open("public/gempa/data/zona_tsunami_kamus.json"))["zona"]}
km["zona"]["NTT|MANGGARAI"] = {"status": "cocok", "kab": [{"id": "5310", "nama": "Kab. Manggarai", "sebagian": False}]}   # zona penuh tulisan tangan; zona sebagian dari kamus nyata
f = lambda *zs: z.per_kab([list(x) for x in zs], km)["5310"]
P, U = ("NTT", "MANGGARAI"), ("NTT", "MANGGARAI BAGIAN UTARA")
print(json.dumps({"c1": f(P + ("WASPADA", 1), U + ("SIAGA", 2)), "c2": f(P + ("SIAGA", 1), U + ("SIAGA", 2)), "c3": f(U + ("WASPADA", 1), P + ("SIAGA", 2))}))`;
  const p = spawnSync("python3", ["-I", "-c", kode], {encoding: "utf8"});
  assert.equal(p.status, 0, p.stderr);
  const o = JSON.parse(p.stdout);
  assert.deepEqual([o.c1.tingkat_tertinggi, o.c1.sebagian_tingkat, o.c1.sebagian], ["SIAGA", true, false], "zona sebagian penentu tingkat");
  assert.equal(o.c2.sebagian_tingkat, false, "dua zona sama tinggi, satu penuh");
  assert.equal(o.c3.sebagian_tingkat, false, "zona penuh penentu tingkat");
});
