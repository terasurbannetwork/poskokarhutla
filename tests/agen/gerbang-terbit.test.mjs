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

test("tiap deploy menulis daftar isi untuk cadangan, dan tiap workflow yang menerbitkan memakai cadangan live sesudah memulihkan cache", () => {
  const kurang = [];
  for (const f of readdirSync(".github/workflows").filter(x => x.endsWith(".yml"))) {
    const s = readFileSync(`.github/workflows/${f}`, "utf8"), baris = s.split("\n");
    const deploy = baris.some(b => /wrangler@[\d.]+ deploy\b/.test(b) && !/^\s*#/.test(b));
    if (!deploy) continue;
    baris.forEach((b, i) => {
      if (/wrangler@[\d.]+ deploy\b/.test(b) && !/^\s*#/.test(b) && !/isi_data\.py buat/.test(baris.slice(Math.max(0, i - 3), i + 1).join("\n"))) kurang.push(`${f}:${i + 1} tanpa isi_data.py buat`);
      if (/^\s+restore-keys: data-\s*$/.test(b) && !/isi_data\.py perlu/.test(baris.slice(i, i + 6).join("\n"))) kurang.push(`${f}:${i + 1} pulihkan data- tanpa isi_data.py perlu`);
    });
  }
  assert.deepEqual(kurang, [], kurang.join("; "));
});

test("tiap workflow yang menerbitkan memulihkan cache banjir sebelum deploy (insiden 9 Nov 2026)", () => {
  const kurang = [];
  for (const f of readdirSync(".github/workflows").filter(x => x.endsWith(".yml"))) {
    const baris = readFileSync(`.github/workflows/${f}`, "utf8").split("\n");
    const deploy = baris.findIndex(b => /wrangler@[\d.]+ deploy\b/.test(b) && !/^\s*#/.test(b));
    if (deploy < 0) continue;
    const pulih = baris.findIndex(b => /^\s+restore-keys: banjir-\s*$/.test(b));
    const jalur = baris.slice(Math.max(0, pulih - 5), pulih).join("\n");
    if (pulih < 0 || pulih > deploy || !/public\/banjir\/data\n\s+data\/raw\/banjir/.test(jalur)) kurang.push(f);
  }
  assert.deepEqual(kurang, [], `deploy tanpa pulihkan banjir-: ${kurang.join(", ")}`);
});

test("udara.yml tidak meng-commit jarak_pandang.json versi cache (insiden 10 Nov 2026: rebase bentrok, deploy batal)", () => {
  assert.match(readFileSync(".github/workflows/udara.yml", "utf8"), /f=\$\(git ls-files [^)]*public\/udara\/data\/jarak_pandang\.json/);
});

test("cadangan live: isi rusak dan jalur '..' ditolak, cache yang lebih baru tidak ditimpa", () => {
  assert.match(execFileSync("python3", ["scripts/terbit/isi_data.py", "uji"], {encoding: "utf8"}), /ok/);
});

test("penjaga menolak keadaan insiden (data 12 Okt saat 23 Okt)", () => {
  const out = execFileSync("python3", ["scripts/terbit/jaga_segar.py", "uji"], {encoding: "utf8"});
  assert.match(out, /ok/);
});
