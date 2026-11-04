// Gerbang: surat dinas BNPB selalu lewat skill surat-bnpb (pemilik 4 Nov 2026: "catat skill untuk membuat surat").
// Kasus asal: lima surat audiensi kampus Yogyakarta; aturan pemilik (tujuan ke unit kerja sama, bukan Rektor;
// tanpa "beserta tim"; nomor HP tidak masuk repo publik) dikunci di self-check mesin dan di sini.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, realpathSync, readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";

const AKAR = new URL("../../", import.meta.url).pathname;
const ASLI = AKAR + "data/kajian-bnpb/skill/surat-bnpb/";

test("skill surat-bnpb terdaftar di .claude/skills sebagai symlink ke berkas asli", () => {
  const jalur = AKAR + ".claude/skills/surat-bnpb/SKILL.md";
  assert.ok(existsSync(jalur), "skill surat-bnpb tak terlihat agent");
  assert.equal(realpathSync(jalur), realpathSync(ASLI + "SKILL.md"));
  assert.match(readFileSync(jalur, "utf8"), /^---\nname: surat-bnpb\n/);
});

test("self-check mesin surat lulus", () => {
  const keluar = execFileSync("python3", [ASLI + "scripts/buat_surat.py", "--cek"], {encoding: "utf8"});
  assert.match(keluar, /cek surat: lulus/);
});

test("contoh surat di repo tidak memuat nomor HP (repo publik)", () => {
  for (const f of readdirSync(ASLI + "contoh")) {
    const isi = readFileSync(ASLI + "contoh/" + f, "utf8");
    assert.doesNotMatch(isi, /(\+62|\b08)\d{8,}/, `${f} memuat nomor HP`);
  }
});

test("router AGENTS.md mengarahkan surat ke skill surat-bnpb", () => {
  assert.match(readFileSync(AKAR + "AGENTS.md", "utf8"), /\n\| Surat dinas[^\n]*Skill `surat-bnpb`/);
});
