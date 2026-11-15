// HR-07: paket.py (AOI, instruksi, hashtag, citra saran; tanpa kirim, bukan ke public/).
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
test("paket.py --cek hijau", () => {
  const o = execFileSync("python3", ["-I", join(AKAR, "scripts/pemetaan/paket.py"), "--cek"], { encoding: "utf8" });
  assert.match(o, /^OK paket\.py/);
});
