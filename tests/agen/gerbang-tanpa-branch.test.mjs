// Pemilik berulang kali (16 Okt sampai 9 Nov 2026): "gw ga pernah mau ada branch". Penyapu Stop hanya membersihkan sesudah kejadian;
// gerbang ini menjaga penolakan SEJAK pembuatan, dan AGENTS.md tidak boleh lagi menyuruh agent memakai worktree.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const jalan = input => spawnSync("node", ["scripts/agents/tolak-branch.mjs"], {input: JSON.stringify(input), encoding: "utf8"}).status;
const bash = command => jalan({tool_name: "Bash", tool_input: {command}});

test("hook terdaftar untuk Bash, Agent, dan EnterWorktree", () => {
  const pre = JSON.parse(fs.readFileSync(".claude/settings.json", "utf8")).hooks.PreToolUse;
  for (const alat of ["Bash", "Agent", "EnterWorktree"])
    assert.ok(pre.some(h => h.matcher.split("|").includes(alat) && h.hooks.some(x => x.command.includes("scripts/agents/tolak-branch.mjs"))), `hook belum terdaftar untuk ${alat}`);
});

for (const c of ["git checkout -b coba", "git switch -c coba", "git switch --create coba", "git branch coba", "git branch coba main", "git worktree add ../x", "git -C ../repo worktree add ../x", "cd a && git checkout -B coba",
  "git push origin coba", "git push -u origin HEAD:coba", "git push origin main:refs/heads/coba", "git push origin +coba"])
  test(`ditolak: ${c}`, () => assert.equal(bash(c), 2));

for (const c of ["git status", "git branch", "git branch -a", "git branch -d coba", "git branch -D coba", "git branch --list 'x*'", "git worktree list", "git worktree remove x", "git checkout main", "git checkout -- a.js", "git switch main",
  "git push origin main", "git push", "git push origin 9f5f55288:main", "git push origin --delete coba", "git push origin :coba",
  `git commit -m "jangan git checkout -b dan git worktree add" -- a.js`, `grep -n "git branch coba" a.md`, "python3 - <<'E'\ngit branch coba\nE"])
  test(`boleh: ${c.split("\n")[0]}`, () => assert.equal(bash(c), 0));

test("Agent isolation worktree dan EnterWorktree ditolak; Agent biasa boleh", () => {
  assert.equal(jalan({tool_name: "Agent", tool_input: {prompt: "x", isolation: "worktree"}}), 2);
  assert.equal(jalan({tool_name: "EnterWorktree", tool_input: {}}), 2);
  assert.equal(jalan({tool_name: "Agent", tool_input: {prompt: "x"}}), 0);
});

test("AGENTS.md tidak menyuruh memakai worktree", () => {
  assert.doesNotMatch(fs.readFileSync("AGENTS.md", "utf8"), /pakai `isolation: "worktree"`/);
});
