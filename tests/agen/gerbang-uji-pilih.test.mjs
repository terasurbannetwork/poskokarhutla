// Gerbang pemilih uji pre-push (pemilik 20 Nov 2026: "yang berubah sedikit ... hanya itu yang diuji", "cukup satu sesi aja yang push").
// Menjaga: (1) pencatat benar-benar mencatat import, baca berkas, readdir, dan proses anak per berkas uji; (2) pemilih menjalankan uji
// yang terdampak dan jatuh ke PENUH bila ragu; (3) dorong.sh keluar 0 tanpa antre bila sesi lain sedang mendorong.
import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync} from "node:fs";
import {spawnSync, execFileSync} from "node:child_process";
// hook pre-push menjalankan uji dengan GIT_DIR dan kawan-kawan menunjuk repo utama; repo mini di bawah harus memakai .git miliknya sendiri
for (const k of Object.keys(process.env)) if (k.startsWith("GIT_")) delete process.env[k];
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pilih, gabung} from "../../scripts/agents/uji_pilih.mjs";

const e = (baca = [], x = {}) => ({baca, dir: [], pdir: [], daftar: false, git: false, gagal: 0, ...x});
const M = f => ({s: "M", f}), A = f => ({s: "A", f});

test("pilih: hanya uji yang membaca berkas yang berubah", () => {
  const peta = {"t/a.test.mjs": e(["src/a.js"]), "t/b.test.mjs": e(["src/b.js"])};
  const r = pilih(Object.keys(peta), [M("src/a.js")], peta);
  assert.equal(r.penuh, null); assert.deepEqual(r.uji, ["t/a.test.mjs"]);
});

test("pilih: uji tanpa catatan, uji yang berubah, inti 60 hari, dan pemakai git selalu jalan", () => {
  const kini = Date.now();
  const peta = {"t/lama.test.mjs": e([], {gagal: kini - 3 * 864e5}), "t/basi.test.mjs": e([], {gagal: kini - 90 * 864e5}), "t/git.test.mjs": e([], {git: true}), "t/ubah.test.mjs": e([])};
  const r = pilih([...Object.keys(peta), "t/baru.test.mjs"], [M("t/ubah.test.mjs")], peta, kini);
  assert.deepEqual(r.uji.sort(), ["t/baru.test.mjs", "t/git.test.mjs", "t/lama.test.mjs", "t/ubah.test.mjs"]);
});

test("pilih: berkas baru di folder yang didaftar, skrip anak sefolder, dan git ls-files", () => {
  const peta = {"t/dir.test.mjs": e([], {dir: ["public/x"]}), "t/py.test.mjs": e([], {pdir: ["scripts/y"]}), "t/ls.test.mjs": e([], {daftar: true})};
  assert.deepEqual(pilih(Object.keys(peta), [M("public/x/a.js")], peta).uji, [], "ubah isi berkas saja: pendaftar folder tidak terdampak");
  assert.deepEqual(pilih(Object.keys(peta), [A("public/x/baru.js")], peta).uji.sort(), ["t/dir.test.mjs", "t/ls.test.mjs"]);
  assert.deepEqual(pilih(Object.keys(peta), [M("scripts/y/lain.py")], peta).uji, ["t/py.test.mjs"]);
});

test("pilih: PENUH bila diff tak terbaca, terlalu besar, atau pemicu besar berubah", () => {
  const s = ["t/a.test.mjs"], peta = {"t/a.test.mjs": e()};
  assert.ok(pilih(s, null, peta).penuh);
  assert.ok(pilih(s, Array.from({length: 301}, (_, i) => M(`x${i}`)), peta).penuh);
  for (const f of ["package.json", "package-lock.json", ".githooks/pre-push", "scripts/agents/uji_pilih.mjs", "scripts/agents/uji_jejak.mjs"]) assert.ok(pilih(s, [M(f)], peta).penuh, f);
});

test("gabung: entri diganti utuh dari proses utama + anak; catatan tanpa proses utama tidak menimpa", () => {
  const peta = {"t/a.test.mjs": e(["lama.js"]), "t/b.test.mjs": e(["tetap.js"])};
  gabung(peta, [{uji: "t/a.test.mjs", utama: true, gagal: false, baca: ["x.js"], dir: [], pdir: []}, {uji: "t/a.test.mjs", utama: false, gagal: false, baca: ["y.py"], dir: [], pdir: ["s"], git: true},
    {uji: "t/b.test.mjs", utama: false, baca: ["anak.js"], dir: [], pdir: []}], 1000);
  assert.deepEqual(peta["t/a.test.mjs"].baca, ["x.js", "y.py"]); assert.equal(peta["t/a.test.mjs"].git, true);
  assert.deepEqual(peta["t/b.test.mjs"].baca, ["tetap.js"]);
  gabung(peta, [{uji: "t/a.test.mjs", utama: true, gagal: true, baca: [], dir: [], pdir: []}], 2000);
  assert.equal(peta["t/a.test.mjs"].gagal, 2000);
});

test("uji_pilih + uji_jejak: repo mini, peta tercatat lalu hanya uji terdampak yang jalan", () => {
  const d = mkdtempSync(join(tmpdir(), "pilih-"));
  const git = (...a) => execFileSync("git", a, {cwd: d, encoding: "utf8"}).trim();
  mkdirSync(join(d, "scripts/agents"), {recursive: true}); mkdirSync(join(d, "t")); mkdirSync(join(d, "src")); mkdirSync(join(d, "data"));
  for (const f of ["uji_pilih.mjs", "uji_jejak.mjs"]) writeFileSync(join(d, "scripts/agents", f), readFileSync(join("scripts/agents", f)));
  writeFileSync(join(d, "package.json"), JSON.stringify({scripts: {"uji:x": "node --test --test-concurrency=1 t/*.test.mjs"}}));
  writeFileSync(join(d, "src/a.js"), "export const a = 1;\n"); writeFileSync(join(d, "data/b.json"), "{}"); writeFileSync(join(d, "src/c.txt"), "c");
  writeFileSync(join(d, "t/a.test.mjs"), 'import {test} from "node:test"; import {a} from "../src/a.js"; test("a", () => {});\n');
  writeFileSync(join(d, "t/b.test.mjs"), 'import {test} from "node:test"; import {readFileSync} from "node:fs"; test("b", () => { JSON.parse(readFileSync(new URL("../data/b.json", import.meta.url), "utf8")); });\n');
  writeFileSync(join(d, "t/c.test.mjs"), 'import {test} from "node:test"; import {execFileSync} from "node:child_process"; test("c", () => { execFileSync("cat", ["src/c.txt"]); });\n');
  git("init", "-q"); git("config", "user.email", "a@b.c"); git("config", "user.name", "x"); git("add", "."); git("commit", "-qm", "awal");
  const peta = join(d, "peta.json"), jalan = (...a) => spawnSync("node", ["scripts/agents/uji_pilih.mjs", "uji:x", ...a, "--peta", peta], {cwd: d, encoding: "utf8"});
  const r0 = jalan(); assert.equal(r0.status, 0, r0.stdout + r0.stderr); assert.match(r0.stdout, /PENUH/);
  const p = JSON.parse(readFileSync(peta, "utf8"));
  assert.ok(p["t/a.test.mjs"].baca.includes("src/a.js"), JSON.stringify(p));
  assert.ok(p["t/b.test.mjs"].baca.includes("data/b.json"), JSON.stringify(p));
  assert.ok(p["t/c.test.mjs"].baca.includes("src/c.txt"), JSON.stringify(p));
  const awal = git("rev-parse", "HEAD");
  writeFileSync(join(d, "data/b.json"), '{"x":1}'); git("commit", "-qam", "data");
  const r1 = jalan("--dasar", awal, "--sampai", "HEAD");
  assert.equal(r1.status, 0, r1.stdout + r1.stderr);
  assert.match(r1.stdout, /1 dari 3 uji terdampak/); assert.match(r1.stdout, /t\/b\.test\.mjs: membaca data\/b\.json/);
});

test("dorong.sh: sesi lain sedang mendorong = keluar 0 seketika tanpa antre", () => {
  const d = mkdtempSync(join(tmpdir(), "dorong1-"));
  execFileSync("git", ["init", "-q"], {cwd: d});
  const kunci = join(d, ".git/dorong.kunci"); mkdirSync(kunci); writeFileSync(join(kunci, "pid"), String(process.pid));
  const t = Date.now(), r = spawnSync("sh", [join(process.cwd(), "scripts/agents/dorong.sh")], {cwd: d, encoding: "utf8", timeout: 20000});
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /sedang dijalankan sesi lain/);
  assert.ok(Date.now() - t < 5000, "tidak boleh menunggu"); assert.ok(existsSync(kunci), "kunci sesi lain tidak boleh dilepas");
});
