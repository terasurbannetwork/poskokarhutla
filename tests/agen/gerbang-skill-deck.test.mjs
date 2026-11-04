// Gerbang: skill deck BNPB terdaftar dan diingatkan tiap kali slide diminta (pemilik 3 Nov 2026).
// Kasus asal: deck brief narasi karhutla dibuat dari HTML tanpa logo/footer BNPB karena skill-nya
// hanya ada di data/kajian-bnpb/skill dan docs/pedoman-deck, tidak terlihat di daftar skill agent.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, realpathSync} from "node:fs";
import {POLA, PESAN} from "../../scripts/agents/pengingat-deck.mjs";

const AKAR = new URL("../../", import.meta.url).pathname;

test("skill deck-bnpb dan ppt-format-bnpb terdaftar di .claude/skills dan menunjuk berkas asli", () => {
  for (const [jalur, asli, nama] of [
    [".claude/skills/deck-bnpb/SKILL.md", "data/kajian-bnpb/skill/deck-bnpb/SKILL.md", "deck-bnpb"],
    [".claude/skills/ppt-format-bnpb/SKILL.md", "docs/pedoman-deck/ppt-format-bnpb.md", "ppt-format-bnpb"],
  ]) {
    assert.ok(existsSync(AKAR + jalur), `${jalur} tidak ada: skill tak terlihat agent`);
    assert.equal(realpathSync(AKAR + jalur), realpathSync(AKAR + asli), `${jalur} harus symlink ke ${asli}, bukan salinan yang bisa basi`);
    assert.match(readFileSync(AKAR + jalur, "utf8"), new RegExp(`^---\\nname: ${nama}\\n`), `${jalur} tanpa frontmatter name: ${nama}`);
  }
});

test("hook pengingat-deck terpasang di UserPromptSubmit", () => {
  const s = JSON.parse(readFileSync(AKAR + ".claude/settings.json", "utf8"));
  const cmd = (s.hooks?.UserPromptSubmit || []).flatMap(g => g.hooks || []).map(h => h.command);
  assert.ok(cmd.some(c => c.includes("scripts/agents/pengingat-deck.mjs")), "hook pengingat-deck.mjs tidak terdaftar");
});

test("pola menangkap permintaan slide pemilik, dan tidak menangkap prompt lain", () => {
  for (const p of ["buatkan dalam slide presentasi juga ya", "format ppt tapi langsung pdf", "bikin deck BNPB", "paparan Jambi besok", "Yang ppt agar lengkapi chart"])
    assert.ok(POLA.test(p), `tidak terpicu: "${p}"`);
  for (const p of ["hitung firespot dulu", "buatkan narasi publik", "fix bug peta"])
    assert.ok(!POLA.test(p), `salah picu: "${p}"`);
  assert.match(PESAN, /deck-bnpb/);
  assert.match(PESAN, /Dilarang membangun deck dari HTML/);
});

test("router AGENTS.md mengarahkan slide ke skill deck-bnpb", () => {
  assert.match(readFileSync(AKAR + "AGENTS.md", "utf8"), /\| Slide, PPT, deck, paparan, presentasi .*deck-bnpb/);
});
