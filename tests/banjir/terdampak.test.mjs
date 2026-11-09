/* Uji lapis "Sudah banjir" dan kolom Terdampak: bagian murni TDm (public/banjir/terdampak.js), pipeline terdampak.py, dan berkas tayang public/banjir/data/terdampak.json.
   Berkas tayang publik: HANYA kunci putih; nama petugas, telepon, KK, jiwa, pengungsi, isi laporan tidak boleh ada. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("../../public/banjir/terdampak.js", import.meta.url), "utf8"), ctx);
const T = ctx.TDm, plain = x => JSON.parse(JSON.stringify(x));
const KUNCI = ["kab", "kode", "prov_kode", "provinsi", "sumber", "status", "tanggal"].sort();
const b = (kode, status, tanggal) => ({kode, prov_kode: kode.split("|")[0], provinsi: "P", kab: kode.split("|")[1], status, tanggal, sumber: "x"});

test("tayang: belum surut > 14 hari jadi Belum diketahui, sudah surut > 14 hari dibuang", () => {
  const r = T.tayang({baris: [b("11|A", "Belum surut", "2026-11-08"), b("11|B", "Belum surut", "2026-10-20"), b("11|C", "Sudah surut", "2026-10-20"), b("11|D", "Sudah surut", "2026-11-01")]}, "2026-11-09");
  assert.deepEqual(plain(r.map(x => [x.kab, x.status])), [["A", "Belum surut"], ["B", "Belum diketahui"], ["D", "Sudah surut"]]);
  assert.equal(r[0].umur, 1);
});
test("perProvinsi dan total tidak menghitung Belum diketahui", () => {
  const r = T.tayang({baris: [b("11|A", "Belum surut", "2026-11-08"), b("11|B", "Sudah surut", "2026-11-08"), b("12|C", "Belum surut", "2026-10-01"), b("12|D", "Sudah surut", "2026-11-08")]}, "2026-11-09");
  assert.deepEqual(plain(T.perProvinsi(r)), {"11": 2, "12": 1});
  assert.equal(T.total(r), 3);
});
test("fitur: titik per kab, tanpa pusat dilewati; umurTeks", () => {
  const r = T.tayang({baris: [b("11|A", "Belum surut", "2026-11-08"), b("11|Z", "Belum surut", "2026-11-08")]}, "2026-11-09");
  const f = T.fitur(r, {"11|A": [96, 4]});
  assert.equal(f.features.length, 1); assert.deepEqual(plain(f.features[0].geometry.coordinates), [96, 4]);
  assert.equal(T.umurTeks(0), "hari ini"); assert.equal(T.umurTeks(1), "kemarin"); assert.equal(T.umurTeks(5), "5 hari lalu");
});
test("terdampak.py uji hijau (gerbang kunci terlarang termasuk di dalamnya)", () => {
  const r = spawnSync("python3", ["scripts/banjir/terdampak.py", "uji"], {encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /ok terdampak/);
});
test("berkas tayang terdampak.json hanya berisi kunci putih dan tanpa pola telepon", () => {
  const f = new URL("../../public/banjir/data/terdampak.json", import.meta.url); if (!fs.existsSync(f)) return;
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  assert.deepEqual(Object.keys(d).sort(), ["ambang", "baris", "dibuat", "hari"]);
  for (const x of d.baris) { assert.deepEqual(Object.keys(x).sort(), KUNCI); assert.ok(["Belum surut", "Sudah surut", "Belum diketahui"].includes(x.status)); }
  assert.doesNotMatch(JSON.stringify(d), /\d{6,}|@|\b(KK|jiwa|pengungsi)\b/i);
});
