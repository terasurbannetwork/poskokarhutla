/* Uji gelembung angka /banjir (public/banjir/gelembung.js): agregasi per provinsi dan kabupaten, tren 7 hari dan persen, ambang zoom, pusat poligon. Fixture di sini saja. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/gelembung.js", src = fs.readFileSync(f, "utf8"), ctx = vm.createContext({});
vm.runInContext(src, ctx);
const G = ctx.Gelembung, plain = x => JSON.parse(JSON.stringify(x));

test("sintaks sah, tanpa titik tengah atau em dash di teks tampil", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0);
  assert.ok(!/·|—/.test(src));
});

test("agregWil: Siaga+Awas per provinsi dan kabupaten, warna dari status tertinggi, hari dan bahaya dipilih", () => {
  const kec = {"11|A|x": {b: [3, 0], l: [1, 1]}, "11|A|y": {b: [2, 2], l: [0, 0]}, "11|B|z": {b: [1, 0], l: [2, 2]}, "12|C|w": {b: [0, 0]}};
  const a = plain(G.agregWil(kec, "b", 0));
  assert.equal(a["11"].s, 2); assert.equal(a["11"].lv, 3); assert.deepEqual(a["11"].n, [0, 1, 1, 1]);
  assert.equal(a["11|A"].s, 2); assert.equal(a["11|B"].s, 0); assert.equal(a["11|B"].lv, 1); assert.equal(a["12"], undefined);
  assert.equal(plain(G.agregWil(kec, "b", 1))["11"].s, 1);
  assert.equal(plain(G.agregWil(kec, "l", 1))["11"].s, 1, "bahaya longsor terpisah");
  assert.deepEqual(plain(G.agregWil(null, "b", 0)), {});
});

test("ambang zoom: provinsi di bawah 6,5, kabupaten dari 6,5 sampai 9, tidak tumpang tindih; layer memakainya; pin pos dari zoom 7", () => {
  assert.equal(G.ZOOM.provMaks, 6.5); assert.equal(G.ZOOM.kabMin, G.ZOOM.provMaks); assert.ok(G.ZOOM.kabMaks > G.ZOOM.kabMin);
  assert.match(src, /minzoom: mn, maxzoom: mk/);
  assert.match(fs.readFileSync("public/banjir/pos_air.js", "utf8"), /id: "pos", type: "symbol", source: "pos", minzoom: 7/);
});

test("pusatKab: rata-rata kecamatan, lon lalu lat; pusatGeom: poligon terbesar", () => {
  assert.deepEqual(plain(G.pusatKab({"11|A|x": [2, 96], "11|A|y": [4, 98], "12|B|z": [1, 100]})), {"11|A": [97, 3], "12|B": [100, 1]});
  const kecil = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], besar = [[10, 10], [14, 10], [14, 14], [10, 14], [10, 10]];
  assert.deepEqual(plain(G.pusatGeom({type: "MultiPolygon", coordinates: [[kecil], [besar]]})).map(Math.round), [12, 12]);
  assert.equal(G.pusatGeom(null), null);
});

const dok = (hari, kab) => ({hari, provinsi: [{kode: "11", kab: kab.map(s => ({status: s}))}]});
test("seriProv: kabupaten Siaga atau Awas per hari berarsip, status teks atau angka, hari tanpa provinsi dilewati", () => {
  const d = [dok("2026-10-27", ["Siaga", 3, "Waspada"]), dok("2026-10-13", ["Waspada", null]), {hari: "2026-10-20", provinsi: [{kode: "99", kab: []}]}];
  assert.deepEqual(plain(G.seriProv(d, "11")), [{hari: "2026-10-13", n: 0}, {hari: "2026-10-27", n: 2}]);
  assert.deepEqual(plain(G.seriProv([], "11")), []);
});

test("hariAkhir: sampai 7 hari terakhir dari yang ada", () => {
  assert.deepEqual(plain(G.hariAkhir(["2026-10-13", "2026-10-27", "2026-10-26", "2026-10-21", "2026-10-20"])), ["2026-10-21", "2026-10-26", "2026-10-27"]);
  assert.deepEqual(plain(G.hariAkhir([])), []);
});

test("persenHarian dan tren 3 hari vs 3 sebelumnya", () => {
  assert.deepEqual(plain(G.persenHarian([2, 3, 3, 0, 0, 4])), [null, 50, 0, -100, null, "baru"]);
  assert.equal(G.tren([1, 2]), null, "kurang dari 4 hari: tanpa vonis");
  assert.deepEqual(plain(G.tren([4, 4, 4, 2, 2, 2])), {d: -50, arah: -1});
  assert.deepEqual(plain(G.tren([1, 1, 1, 2, 2, 2])), {d: 100, arah: 1});
  assert.deepEqual(plain(G.tren([2, 2, 2, 2])), {d: 0, arah: 0});
  assert.equal(G.tren([0, 0, 0, 2, 2, 2]), null, "pembanding nol");
  assert.deepEqual(plain(G.tren([0, 0, 0, 0, 0, 0])), {d: 0, arah: 0});
  assert.equal(G.vonisTeks({d: -50, arah: -1}), "MEMBAIK -50%"); assert.equal(G.vonisTeks({d: 100, arah: 1}), "MEMBURUK +100%"); assert.equal(G.vonisTeks({d: 0, arah: 0}), "STABIL"); assert.equal(G.vonisTeks(null), null);
});

test("INP statis: hover lewat rAF dengan cache per wilayah, klik membuka kartu urgent dan laci menyusul lewat nanti", () => {
  assert.match(src, /requestAnimationFrame\(\(\) => \{ const p = this\._p/);
  assert.match(src, /this\.cache\.get\(ck\)/); assert.match(src, /this\.cache\.set\(ck, h\)/);
  assert.match(src, /nanti\(\(\) => turun\(kunci\)\)/); assert.match(src, /nanti\(\(\) => \{ const g = prov/);
  assert.match(src, /grafik\(kode\) \{\s*const s = seriProv\(this\.docs, kode\); if \(s\.length < 2\) return ""/, "tanpa arsip cukup grafik tidak tampil");
});
