// HR-05 (T10): uji_jujur.py: kriteria terkunci (sidik), undian deterministik, vonis 7 dari 10; lembar nyata belum diisi = menunggu.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PY = join(AKAR, "scripts/pemetaan/uji_jujur.py");
test("uji_jujur.py --cek hijau (T10)", () => {
  assert.match(execFileSync("python3", ["-I", PY, "--cek"], { encoding: "utf8" }), /^OK uji_jujur\.py/);
});
test("vonis lembar nyata dihitung dari isian manusia, bukan diketik", () => {
  const v = JSON.parse(execFileSync("python3", ["-I", PY, "--vonis"], { encoding: "utf8" }));
  assert.ok(["menunggu periksa pemilik", "lulus", "gagal"].includes(v.vonis), v.vonis);
  assert.equal(v.n, 10);
  if (v.vonis === "menunggu periksa pemilik") assert.equal(v.cocok, null);
});
