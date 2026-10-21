// Gerbang: tidak ada penanda konflik git di berkas yang dilacak.
// 20 Okt 2026: commit 130ff7e meng-commit <<<<<<< di public/udara/data/*.json,
// JSON.parse gagal di layar tanpa satu pun uji merah.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("tidak ada penanda konflik git di berkas yang dilacak", () => {
  let keluar = "";
  try {
    keluar = execFileSync("git", ["grep", "-lE", "^(<<<<<<<|>>>>>>>) ", "--", "public", "src", "scripts", "migrations", "tests", ".github"], { encoding: "utf8" });
  } catch (e) {
    if (e.status === 1) return; // git grep: tak ada yang cocok
    throw e;
  }
  const berkas = keluar.trim().split("\n").filter(Boolean);
  assert.equal(berkas.length, 0, `${berkas.length} berkas berisi penanda konflik git: ${berkas.join(", ")}`);
});
