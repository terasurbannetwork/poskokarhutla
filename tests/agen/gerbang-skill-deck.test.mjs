// Gerbang: deck BNPB selalu lewat skill ppt-konsultan dan diingatkan tiap kali slide diminta (pemilik 3 dan 4 Nov 2026).
// Kasus 4 Nov: brief narasi karhutla dibangun ulang dengan skill deck-bnpb (mesin lama) sehingga sampul tanpa penyaji,
// tanpa daftar isi, tanpa pembatas seksi. deck-bnpb dan ppt-format-bnpb kini pensiun dan diumumkan pensiun di frontmatter.
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
  assert.match(PESAN, /Skill ppt-konsultan/);
  assert.match(PESAN, /daftar-isi/);
  assert.match(PESAN, /Kristomei/);
  assert.match(PESAN, /S\.Sos\., M\.Si\. \(Han\)/, "gelar Kepala BNPB: M.Si. sekali, yang ber-(Han) (pemilik 4 Nov 2026)");
  assert.doesNotMatch(PESAN, /M\.Si\., M\.Si\./);
  assert.match(PESAN, /KRIS/, "logo KRIS wajib di sampul dan penutup (pemilik 4 Nov 2026)");
  assert.match(PESAN, /KRIS wajib di TIAP slide/, "logo KRIS di tiap slide, termasuk deck sunting langsung (pemilik 9 Nov 2026)");
  assert.match(PESAN, /tanpa catatan/, "baris Sumber tanpa catatan keraguan (pemilik 9 Nov 2026)");
  assert.match(PESAN, /aturan_slide\.py/, "deck apa pun wajib lolos pemeriksa keluaran (pemilik 9 Nov 2026)");
  assert.match(PESAN, /deck-bnpb dan ppt-format-bnpb .*PENSIUN/);
  assert.match(PESAN, /Dilarang membangun deck dari HTML/);
});

test("router AGENTS.md mengarahkan slide ke skill ppt-konsultan, bukan deck-bnpb", () => {
  const baris = readFileSync(AKAR + "AGENTS.md", "utf8").split("\n").find(l => l.startsWith("| Slide, PPT, deck, paparan, presentasi"));
  assert.ok(baris, "baris router slide hilang dari AGENTS.md");
  assert.match(baris, /Skill `ppt-konsultan`/);
  assert.match(baris, /`deck-bnpb` dan `ppt-format-bnpb` PENSIUN/);
});

test("skill lama deck-bnpb dan ppt-format-bnpb mengumumkan pensiun di description, supaya tidak dipilih agent", () => {
  for (const jalur of [".claude/skills/deck-bnpb/SKILL.md", ".claude/skills/ppt-format-bnpb/SKILL.md"]) {
    const desc = (readFileSync(AKAR + jalur, "utf8").match(/^description: (.*)$/m) || [])[1] || "";
    assert.match(desc, /^PENSIUN .*JANGAN DIPAKAI.*ppt-konsultan/, `${jalur} description harus diawali PENSIUN dan menunjuk ppt-konsultan`);
  }
});
