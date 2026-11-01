/* Uji lapis genangan historis (public/banjir/lapis_genangan_historis.js): fungsi murni, mati bawaan, data nyata berbentuk benar. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/lapis_genangan_historis.js", src = fs.readFileSync(f, "utf8"), ctx = vm.createContext({Intl, Number, Object, Math, isFinite, String, Array});
vm.runInContext(src.slice(0, src.indexOf("/* ---------- bagian peta")), ctx);
const G = ctx.LGHm, plain = x => JSON.parse(JSON.stringify(x));

test("sintaks sah, tanpa titik tengah, mati bawaan, terpasang di layar", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0); assert.ok(!/·|—|Pantau Bencana/.test(src));
  const idx = fs.readFileSync("public/banjir/index.html", "utf8");
  assert.ok(idx.includes("lapis_genangan_historis.js") && /data-l="genhis"/.test(idx) && !/data-l="genhis"[^>]*checked/.test(idx));
  assert.ok(/genhis: \[\]/.test(fs.readFileSync("public/banjir/peta.js", "utf8")));
  assert.ok(G.SUMBER.includes("Google Flood Forecasting") && G.SUMBER.includes("GLAD 1999-2020") && G.SUMBER.includes("CC BY 4.0"));
});

test("provTampak memilih provinsi yang beririsan dengan batas peta", () => {
  const idx = {prov: {"11": {kotak: [95, 2, 98, 6]}, "12": {kotak: [97, -1, 100, 4]}, "91": {kotak: [138, -9, 141, -2]}}};
  assert.deepEqual(plain(G.provTampak(idx, [96, 1, 99, 3])), ["11", "12"]);
  assert.deepEqual(plain(G.provTampak(idx, [139, -5, 140, -4])), ["91"]);
  assert.deepEqual(plain(G.provTampak(idx, [110, 0, 111, 1])), []);
  assert.deepEqual(plain(G.provTampak(null, [0, 0, 1, 1])), []);
});

test("barisKec: urut tinggi ke rendah, nol dibuang; kelasAda hanya yang tergambar", () => {
  assert.deepEqual(plain(G.barisKec([12.5, 0, 3])), [["tinggi", 12.5], ["rendah", 3]]);
  assert.deepEqual(plain(G.barisKec(null)), []);
  assert.deepEqual(plain(G.kelasAda({features: [{properties: {k: "tinggi"}}, {properties: {k: "rendah"}}]})), ["rendah", "tinggi"]);
  assert.equal(G.fmt(12.5), "12,5");
  assert.ok(G.tipKelas("tinggi").includes("5%") && G.tipKelas("sedang").includes("1%") && G.tipKelas("rendah").includes("0,5%"));
});

test("data nyata: ringkasan kecamatan dan berkas lapisan berbentuk benar, tiap berkas < 2 MB", { skip: !fs.existsSync("public/banjir/data/genangan_historis_kec.json") }, () => {
  const kec = JSON.parse(fs.readFileSync("public/banjir/data/genangan_historis_kec.json", "utf8"));
  assert.ok(kec.n_kec > 7000 && kec.sumber === G.SUMBER);
  for (const v of Object.values(kec.kec)) { assert.equal(v.length, 3); assert.ok(v.every(x => x >= 0 && x <= 100) && v[0] + v[1] + v[2] <= 100.3); }
  const d = "public/banjir/data/genangan_historis/", idx = JSON.parse(fs.readFileSync(d + "indeks.json", "utf8"));
  for (const [k, v] of Object.entries(idx.prov)) { assert.ok(fs.statSync(d + k + ".json").size < 2e6 && v.kotak.length === 4);
    const fc = JSON.parse(fs.readFileSync(d + k + ".json", "utf8")); assert.ok(fc.features.every(x => G.URUT.includes(x.properties.k))); }
});

test("tertinggi: tinggi > sedang > rendah, bukan urutan fitur; pct dan barisKec membulatkan", () => {
  const fs_ = ks => ks.map(k => ({properties: {k}}));
  assert.equal(G.tertinggi(fs_(["rendah", "sedang"])), "sedang");
  assert.equal(G.tertinggi(fs_(["rendah", "tinggi", "sedang"])), "tinggi");
  assert.equal(G.tertinggi(fs_(["sedang", "tinggi"])), "tinggi");
  assert.equal(G.tertinggi([]), null);
  assert.equal(G.pct(0.7), "< 1%"); assert.equal(G.pct(12.5), "13%"); assert.equal(G.pct(4.4), "4%");
  assert.deepEqual(plain(G.barisKec([10, 0.3, 0.6])), [["tinggi", 10], ["rendah", 0.6]]);
  assert.ok(G.tipKelas("tinggi").includes(G.SUMBER));
});
