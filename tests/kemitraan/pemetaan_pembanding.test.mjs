// HR-02 (T1, T2): pembanding per kab memakai paparan.py; rasio null di bawah 100, di atas 1 apa adanya.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
test("pembanding.py --cek hijau (T1, T2)", () => {
  const o = execFileSync("python3", ["-I", join(AKAR, "scripts/pemetaan/pembanding.py"), "--cek"], { encoding: "utf8" });
  assert.match(o, /^OK pembanding\.py/);
});
