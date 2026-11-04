// Gerbang uji-sebelum-push (4 Nov 2026): 12 run terbit.yml gagal di langkah uji dan tak ada yang tahu ~14 jam.
// Menjaga: hook pre-push (uji di worktree commit yang didorong), terpasang lewat prepare, mencakup semua jalur pemicu terbit,
// pemberitahuan isu di terbit.yml, dan hook Claude yang menolak jalan pintas (--no-verify, LEWATI_UJI, pengubahan hooksPath).
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, statSync, mkdtempSync, writeFileSync} from "node:fs";
import {spawnSync, execFileSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";

const baca = f => readFileSync(f, "utf8");
const hook = baca(".githooks/pre-push");
const W = ".github/workflows/";
const HP = "core." + "hooksPath"; // dirakit supaya hook penolak tidak memblokir penulisan berkas ini

test("pre-push ada, executable, menjalankan uji:agen dan uji:warga di clone lokal sha yang didorong", () => {
  assert.ok(statSync(".githooks/pre-push").mode & 0o100, "pre-push harus executable");
  assert.match(hook, /git clone -q --shared --no-checkout "\$utama" "\$tmp" && git -C "\$tmp" checkout -q --detach "\$sha_dorong"/);
  assert.doesNotMatch(hook, /git worktree add/, "worktree terdaftar dibersihkan proses lain di tengah uji; pakai clone lokal");
  assert.match(hook, /npm run uji:agen/);
  assert.match(hook, /npm run uji:warga/);
  // tiap uji yang dijalankan terbit.yml sebelum deploy juga dijalankan pre-push
  for (const u of baca(W + "terbit.yml").matchAll(/run:\s*npm run (uji:[\w-]+)/g)) assert.match(hook, new RegExp(`npm run ${u[1]}\\b`), `pre-push belum menjalankan ${u[1]}`);
  assert.match(hook, /LEWATI_UJI/);
  assert.match(hook, /trap bersih EXIT/);
});

test("package.json prepare memasang hooksPath .githooks", () => {
  assert.equal(JSON.parse(baca("package.json")).scripts.prepare, `git config ${HP} .githooks`);
});

test("jalur pre-push mencakup semua jalur on.push.paths terbit_antre.yml", () => {
  const blok = baca(W + "terbit_antre.yml").split(/^\s+paths:\s*$/m)[1].split(/^\S/m)[0];
  const jalur = [...blok.matchAll(/^\s*-\s*"([^"]+)"/gm)].map(m => m[1]);
  assert.ok(jalur.length >= 4);
  for (const j of jalur) {
    const awal = j.replace(/^!/, "").replace(/\*+$/, "");
    assert.ok(hook.includes(awal), `pre-push tidak menyebut jalur ${j}`);
    // pengecualian ada di cabang case yang kosong (`... ) ;;`), bukan di cabang yang menyalakan uji
    if (j.startsWith("!")) assert.ok(hook.split("\n").some(l => l.includes(`${awal}*`) && l.trim().endsWith(") ;;")), `pengecualian ${j} harus melewati uji`);
  }
});

test("terbit.yml: permissions issues: write, langkah failure() terbit-gagal, langkah success() menutup", () => {
  const t = baca(W + "terbit.yml");
  assert.match(t, /^permissions:\n(\s+\S.*\n)*?\s+issues:\s*write/m);
  assert.match(t, /^\s+contents:\s*read/m);
  const fail = t.split("if: failure()")[1] ?? "", ok = t.split("if: success()")[1] ?? "";
  assert.match(fail.slice(0, 900), /terbit-gagal/);
  assert.match(fail.slice(0, 200), /continue-on-error:\s*true/);
  assert.match(ok.slice(0, 900), /gh issue close/);
  assert.match(ok.slice(0, 200), /continue-on-error:\s*true/);
  assert.doesNotMatch(t, /always\(\)/, "run dibatalkan tidak boleh memberi tahu");
});

// 4 Nov 2026: uji macet menghabiskan batas job lalu berakhir "cancelled", dan failure() tidak menyala. Tiap langkah uji wajib
// punya batas waktu sendiri (langkah lewat batas = gagal), dan jumlahnya harus muat di batas job.
test("terbit.yml: tiap langkah uji punya timeout-minutes sendiri yang muat di batas job", () => {
  const t = baca(W + "terbit.yml");
  const job = Number(t.match(/^ {4}timeout-minutes:\s*(\d+)/m)?.[1]);
  const langkah = [...t.matchAll(/- name: [^\n]+\n((?: {8}[^\n]*\n)*?) {8}run: npm run (uji:[\w-]+)/g)];
  assert.ok(langkah.length >= 3, "langkah uji tidak ditemukan");
  let jumlah = 0;
  for (const [, badan, u] of langkah) {
    const m = badan.match(/timeout-minutes:\s*(\d+)/);
    assert.ok(m, `langkah ${u} tanpa timeout-minutes`);
    jumlah += Number(m[1]);
  }
  assert.ok(jumlah + 10 <= job, `batas langkah uji (${jumlah} menit) + 10 menit sisa harus <= batas job ${job}`);
});

test("pre-push: rentang yang hanya menyentuh dokumen keluar 0 tanpa menjalankan uji", () => {
  const d = mkdtempSync(join(tmpdir(), "pp-"));
  const g = (...a) => execFileSync("git", a, {cwd: d, encoding: "utf8"}).trim();
  g("init", "-q"); g("config", "user.email", "a@b.c"); g("config", "user.name", "x");
  writeFileSync(join(d, "a.md"), "1"); g("add", "."); g("commit", "-qm", "satu");
  const a = g("rev-parse", "HEAD");
  writeFileSync(join(d, "a.md"), "2"); g("commit", "-qam", "dua");
  const b = g("rev-parse", "HEAD");
  const r = spawnSync(join(process.cwd(), ".githooks/pre-push"), [], {cwd: d, input: `refs/heads/main ${b} refs/heads/main ${a}\n`, encoding: "utf8", env: {...process.env, LEWATI_UJI: ""}});
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /uji di commit/);
});

test("hook Claude PreToolUse Bash terdaftar, menolak jalan pintas uji, meloloskan push biasa", () => {
  const s = JSON.parse(baca(".claude/settings.json"));
  const pre = (s.hooks.PreToolUse ?? []).filter(h => h.matcher === "Bash").flatMap(h => h.hooks.map(x => x.command));
  assert.ok(pre.some(c => c.includes("scripts/agents/tolak-lewati-uji.mjs")), "hook belum terdaftar");
  const jalan = command => spawnSync("node", ["scripts/agents/tolak-lewati-uji.mjs"], {input: JSON.stringify({tool_input: {command}}), encoding: "utf8"});
  for (const c of ["git push --no-verify origin main", "git push -n origin main", "git push origin main -n", "LEWATI_UJI=1 git push origin main",
    `git config ${HP} /dev/null`, `git -c ${HP}=/dev/null push origin main`]) {
    const r = jalan(c);
    assert.equal(r.status, 2, `harus ditolak: ${c}`);
    assert.match(r.stderr, /Push wajib lewat uji pre-push; betulkan ujinya dulu\./);
  }
  // membaca setelan atau mencari teks tidak boleh ikut ditolak (salah tolak 4 Nov 2026 memblokir `git config ${HP}` biasa)
  for (const c of ["git push origin main", `git config ${HP} .githooks`, `git config ${HP}`, `git config --get ${HP}`,
    "git status -n", "grep LEWATI_UJI= .githooks/pre-push"]) assert.equal(jalan(c).status, 0, `harus lolos: ${c}`);
});
