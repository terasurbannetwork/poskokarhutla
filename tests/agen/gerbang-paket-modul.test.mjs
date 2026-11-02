// Gerbang paket dokumen modul (pemilik 1 Nov 2026: "tiap mau bikin fitur baru ada gini-gininya lu langsung rekomendasikan").
// Tiap modul yang AGENTS.md wajibkan "baca dulu, baru bangun" (bagian ### 2.x) harus punya paket inti di foldernya.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, readdirSync} from "node:fs";

const AKAR = new URL("../../", import.meta.url);
const WAJIB = ["PRD.md", "DESAIN-TEKNIS.md", "RENCANA-UJI.md", "TIKET.md"];

// murni: ambil folder modul dari bagian "### 2.x ... baca dulu, baru bangun"
export function modulBacaDulu(md) {
  const hasil = [];
  for (const bag of md.split(/\n(?=### )/)) {
    if (!/^### 2\.\d+ .*baca dulu, baru bangun/i.test(bag)) continue;
    const m = bag.match(/`data\/kajian-bnpb\/([a-z0-9-]+)\/`/);
    if (m) hasil.push(m[1]);
  }
  return hasil;
}

export function kurangPaket(berkas) {
  const kurang = WAJIB.filter(f => !berkas.includes(f));
  if (!berkas.some(f => /^KEPUTUSAN.*\.md$/.test(f))) kurang.unshift("KEPUTUSAN-*.md");
  return kurang;
}

test("parser menemukan modul baca-dulu dan menolak paket bolong", () => {
  const md = "# x\n### 2.1 A (`/a`): baca dulu, baru bangun\ndi `data/kajian-bnpb/aa/` ya\n### 2.2 B biasa\n`data/kajian-bnpb/bb/`\n";
  assert.deepEqual(modulBacaDulu(md), ["aa"]);
  assert.deepEqual(kurangPaket(["PRD.md", "TIKET.md"]), ["KEPUTUSAN-*.md", "DESAIN-TEKNIS.md", "RENCANA-UJI.md"]);
  assert.deepEqual(kurangPaket(["KEPUTUSAN-X.md", ...WAJIB]), []);
});

test("tiap modul baca-dulu di AGENTS.md punya paket dokumen lengkap", () => {
  const md = readFileSync(new URL("AGENTS.md", AKAR), "utf8");
  const modul = modulBacaDulu(md);
  assert.ok(modul.length >= 2, `AGENTS.md hanya memuat ${modul.length} modul baca-dulu; parser atau AGENTS.md berubah`);
  const bolong = [];
  for (const m of modul) {
    const dir = new URL(`data/kajian-bnpb/${m}/`, AKAR);
    if (!existsSync(dir)) { bolong.push(`${m}: folder tidak ada`); continue; }
    const k = kurangPaket(readdirSync(dir));
    if (k.length) bolong.push(`${m}: kurang ${k.join(", ")}`);
  }
  assert.deepEqual(bolong, [], `paket dokumen modul belum lengkap:\n${bolong.join("\n")}`);
});
