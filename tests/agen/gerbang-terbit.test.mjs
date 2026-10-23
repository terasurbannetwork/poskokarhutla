// Gerbang terbit (insiden 23 Okt 2026): situs live mundur ke data 12 Okt karena (1) workflow deploy tanpa cache data segar
// dan (2) salinan sinkronisasi "16_4 3.json" ter-commit, memecah langkah "lapisan statis" sehingga pemulihan ikut gagal.
// Uji ini menolak keduanya secara mekanis.
import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync, readdirSync} from "node:fs";

const berkasGit = execFileSync("git", ["ls-files", "-z", "public", "scripts", "src", ".github"], {encoding: "utf8"}).split("\0").filter(Boolean);

test("tidak ada berkas berspasi atau salinan sinkronisasi (' 2', ' 3') di public/, scripts/, src/, .github/", () => {
  const salah = berkasGit.filter(f => /\s/.test(f) || / \d+(\.[^/]+)?$/.test(f));
  assert.deepEqual(salah, [], `berkas nyasar ter-commit: ${salah.join(", ")}`);
});

test("setiap wrangler deploy didahului penjaga data segar (scripts/terbit/jaga_segar.py)", () => {
  const wf = readdirSync(".github/workflows").filter(f => f.endsWith(".yml"));
  const tanpa = [];
  for (const f of wf) {
    const baris = readFileSync(`.github/workflows/${f}`, "utf8").split("\n");
    baris.forEach((b, i) => {
      if (!/wrangler@[\d.]+ deploy\b/.test(b) || /^\s*#/.test(b)) return;
      const sebelum = baris.slice(Math.max(0, i - 3), i + 1).join("\n");
      if (!/jaga_segar\.py/.test(sebelum)) tanpa.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(tanpa, [], `deploy tanpa penjaga data basi: ${tanpa.join(", ")}`);
});

test("penjaga menolak keadaan insiden (data 12 Okt saat 23 Okt)", () => {
  const out = execFileSync("python3", ["scripts/terbit/jaga_segar.py", "uji"], {encoding: "utf8"});
  assert.match(out, /ok/);
});
