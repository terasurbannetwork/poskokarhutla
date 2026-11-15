// HR-01 (T3): konst.py pemetaan = konst.js pemetaan, urutan ambang, selaras bangunan.py.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const JS_TEKS = readFileSync(join(AKAR, "public/pemetaan/konst.js"), "utf8");
const dariJs = (t) => {
  const m = t.match(/const PM_KONST = (\{[\s\S]*?\n\});\n/);
  assert.ok(m, "konst.js: blok 'const PM_KONST = {...};' tidak ditemukan");
  return JSON.parse(m[1]);
};
const PY = JSON.parse(execFileSync("python3", ["-I", join(AKAR, "scripts/pemetaan/konst.py"), "--json"], { encoding: "utf8" }));

test("pemetaan konst.py dan konst.js identik", () => {
  assert.deepEqual(dariJs(JS_TEKS), PY);
});

test("konst.js yang sengaja beda DITOLAK", () => {
  const rusak = JS_TEKS.replace('"MEMADAI_MIN": 0.85', '"MEMADAI_MIN": 0.9');
  assert.notEqual(rusak, JS_TEKS);
  assert.notDeepEqual(dariJs(rusak), PY);
});

test("ambang kelas urut, ambang keyakinan = bangunan.py, self-check py hijau", () => {
  assert.ok(PY.KELAS.TIPIS_MAKS < PY.KELAS.MEMADAI_MIN);
  assert.equal(PY.AMBANG_KEYAKINAN, 0.7);
  execFileSync("python3", ["-I", join(AKAR, "scripts/pemetaan/konst.py"), "--cek"]);
});
