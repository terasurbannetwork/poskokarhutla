/* RU-107 JF-2 kebutuhan formasi JF: contoh RU 5.2 (1.720 jam, 1,376 orang), kosong tidak jadi 0, agregat n dari m, jf2.py --cek,
   layar bebas piksel dan titik tengah, tanpa kirim ke server. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = p => readFileSync(AKAR + p, "utf8");
const SUMBER = baca("public/bnpb/unit/jf2.js");
const ctx = {window: {}, Number, String, Array, Math, Object, RangeError};
vm.createContext(ctx);
vm.runInContext(SUMBER, ctx);
const J = ctx.UnitJf2;
const dekat = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const norma = [{kegiatan: "kaji_cepat", jam: 25}, {kegiatan: "renkon", jam: 60}, {kegiatan: "penyuluhan", jam: null}];

test("jf2.py --cek hijau (norma tanpa label ditolak, contoh 1,376 orang, data nyata repo)", () => {
  const r = spawnSync("python3", ["-I", "scripts/bnpb/unit/jf2.py", "--cek"], {cwd: AKAR, encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("contoh RU 5.2: 40 kaji cepat x 25 jam + 12 renkon x 60 jam = 1.720 jam, 1,376 orang", () => {
  const h = J.kebutuhan({kaji_cepat: 40, renkon: 12}, norma, 1250);
  assert.equal(h.jam, 1720); dekat(h.orang, 1.376);
});

test("kegiatan tanpa norma atau tanpa volume dilewati; tanpa satu pun = null, bukan 0", () => {
  assert.equal(J.kebutuhan({kaji_cepat: null, renkon: null, penyuluhan: 9}, norma, 1250), null);
  assert.equal(J.kebutuhan({kaji_cepat: 10, renkon: null}, norma, 1250).jam, 250);
  assert.equal(J.kebutuhan({kaji_cepat: 0, renkon: 0}, norma, 1250).orang, 0, "0 nyata tetap 0");
});

test("norma atau jam efektif tak sah ditolak", () => {
  assert.throws(() => J.kebutuhan({kaji_cepat: 1}, [{kegiatan: "kaji_cepat", jam: 0}], 1250), RangeError);
  assert.throws(() => J.kebutuhan({kaji_cepat: 1}, norma, 0), RangeError);
});

test("agregat provinsi dan nasional menyebut n dari m, kab tanpa volume tidak diisi 0", () => {
  const kab = [["1101", "A", 40, 12, null, null], ["1102", "B", null, null, null, null], ["1201", "C", 10, 0, null, null]];
  const a = J.agregat(kab, ["kaji_cepat", "renkon", "pendampingan_posko", "penyuluhan"], norma, 1250);
  assert.equal(a.prov["11"].n, 1); assert.equal(a.prov["11"].m, 2); dekat(a.prov["11"].orang, 1.376);
  assert.equal(a.nasional.n, 2); assert.equal(a.nasional.m, 3); dekat(a.nasional.orang, 1.376 + 0.2);
});

test("layar: tanpa piksel, titik tengah, kirim ke server, atau warna literal", () => {
  const t = SUMBER.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(t, /\d\s*px\b|·|fetch\(|XMLHttpRequest|#[0-9a-f]{3,8}\b|rgba?\(|\bhsl/i);
  assert.match(SUMBER, /nanti\(/, "hitung ulang ditunda lewat nanti()");
  assert.match(SUMBER, /ex-std/); assert.match(SUMBER, /ex-ey/);
});
