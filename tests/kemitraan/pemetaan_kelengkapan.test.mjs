// HR-04 (T1, T2, T8): kelengkapan.py dengan jawaban ohsome tiruan, tanpa jaringan.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
test("kelengkapan.py --cek hijau (T1, T2, T8)", () => {
  const o = execFileSync("python3", ["-I", join(AKAR, "scripts/pemetaan/kelengkapan.py"), "--cek"], { encoding: "utf8" });
  assert.match(o, /^OK kelengkapan\.py/);
});
