/* Uji ruas_jauh.js (ruas berwarna zoom jauh): fungsi murni spesifikasi + bungkus PosUkur.ruas. Fixture di sini saja. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/ruas_jauh.js", src = fs.readFileSync(f, "utf8"), pa = fs.readFileSync("public/banjir/pos_air.js", "utf8");
const ctxPA = vm.createContext({Intl, Date, Math, Number, Object, isNaN});
vm.runInContext(pa.slice(0, pa.indexOf("/* ---------- bagian peta")), ctxPA);
const P = ctxPA.PosAir, plain = x => JSON.parse(JSON.stringify(x));
const panggil = [];
const ctx = vm.createContext({Math, parseInt, Object, document: {addEventListener() {}}, PosUkur: {ruas() { panggil.push("asli"); return 7; }, menyala: () => false}, nanti: fn => panggil.push("nanti")});
const R = vm.runInContext(src + ";RuasJauh", ctx);
const pos = [{id: "d:1", lon: 106.5528, lat: -6.1993, ambang: {siaga3: 1, siaga2: 2, siaga1: 3}, status_resmi: "Siaga 2", v: 5, satuan: "cm", status: "ok", t: Date.now() / 1000}];

test("sintaks sah, tanpa titik tengah atau em dash", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0);
  assert.ok(!/·|—/.test(src));
});

test("spesifikasi: lapis Siaga 2 punya filter within dan warna kelas; kelas tak ada = filter kosong", () => {
  const it = P.ruasLapis(pos, () => null), sp = plain(R.spesifikasi(it, P.WARNA_KELAS)), by = Object.fromEntries(sp.map(s => [s.id, s]));
  assert.equal(by["sp-Siaga2"].warna, P.WARNA_KELAS["Siaga 2"]);
  assert.ok(JSON.stringify(by["sp-Siaga2"].filter).includes('"within"'));
  assert.deepEqual(by["sp-Siaga1"].filter, ["==", ["literal", 1], 0]);
  assert.ok(JSON.stringify(by["sp-dasar"].filter).includes('"within"'));
  assert.equal(R.MAXZ, 12);
});

test("spesifikasi: ruas bernama menambah filter nama; tanpa pos = semua filter kosong", () => {
  const sp = plain(R.spesifikasi(P.ruasLapis(pos, () => "Cirarab"), P.WARNA_KELAS));
  assert.ok(JSON.stringify(sp.find(s => s.id === "sp-Siaga2").filter).includes('"Cirarab"'));
  assert.ok(plain(R.spesifikasi([], P.WARNA_KELAS)).every(s => JSON.stringify(s.filter) === '["==",["literal",1],0]'));
});

test("PosUkur.ruas dibungkus: asli dipanggil dulu, nilai kembali asli dipertahankan, kerja milik lewat nanti", () => {
  assert.equal(ctx.PosUkur.ruas(), 7);
  assert.deepEqual(panggil.slice(-2), ["asli", "nanti"]);
});
