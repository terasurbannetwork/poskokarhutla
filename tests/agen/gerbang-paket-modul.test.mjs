// Gerbang paket dokumen modul (pemilik 1 Nov 2026: "tiap mau bikin fitur baru ada gini-gininya lu langsung rekomendasikan";
// 10 Nov 2026: "disiapkan semuanya dari hulu ke hilir baru dikerjakan kodingannya biar ga jelek. CATAT!!").
// 1. Tiap modul yang AGENTS.md wajibkan "baca dulu, baru bangun" (bagian ### 2.x) punya paket sebelas dokumen.
// 2. Folder modul baru di public/ atau scripts/ wajib tercantum di bagian "baca dulu, baru bangun" (fitur besar tidak bisa lahir tanpa paket).
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, readdirSync, statSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const AKAR = new URL("../../", import.meta.url);
const WAJIB = ["RISET.md", "PRD.md", "ALUR.md", "ALGORITMA.md", "DESIGN-SYSTEM.md", "DESAIN-TEKNIS.md", "KEAMANAN-PRIVASI.md", "RENCANA-UJI.md", "TIKET.md", "GLOSARIUM.md"];
const UKURAN_MIN = 400;
// utang modul yang lahir sebelum aturan 10 Nov: hanya boleh menyusut
const UTANG = {pipa: ["RISET.md", "ALUR.md", "ALGORITMA.md", "KEAMANAN-PRIVASI.md", "GLOSARIUM.md"], kampus: ["RISET.md"]};

// murni: ambil folder modul dari bagian "### 2.x ... baca dulu, baru bangun"
export function bagianBacaDulu(md) {
  return md.split(/\n(?=### )/).filter(b => /^### 2\.\d+ .*baca dulu, baru bangun/i.test(b));
}
export function modulBacaDulu(md) {
  return bagianBacaDulu(md).map(b => b.match(/`data\/kajian-bnpb\/([a-z0-9-]+)\/`/)?.[1]).filter(Boolean);
}

export function kurangPaket(berkas) {
  const kurang = WAJIB.filter(f => !berkas.includes(f));
  if (!berkas.some(f => /^KEPUTUSAN.*\.md$/.test(f))) kurang.unshift("KEPUTUSAN-*.md");
  return kurang;
}

export function folderTakBerpaket(ada, lama, md) {
  const teks = bagianBacaDulu(md).join("\n");
  return ada.filter(d => !lama.includes(d) && !teks.includes(d));
}

const subdir = rel => readdirSync(new URL(rel + "/", AKAR), {withFileTypes: true}).filter(e => e.isDirectory()).map(e => `${rel}/${e.name}`);

test("parser menemukan modul baca-dulu dan menolak paket bolong", () => {
  const md = "# x\n### 2.1 A (`/a`): baca dulu, baru bangun\ndi `data/kajian-bnpb/aa/` ya\n### 2.2 B biasa\n`data/kajian-bnpb/bb/`\n";
  assert.deepEqual(modulBacaDulu(md), ["aa"]);
  assert.deepEqual(kurangPaket(["PRD.md", "TIKET.md"]).slice(0, 3), ["KEPUTUSAN-*.md", "RISET.md", "ALUR.md"]);
  assert.deepEqual(kurangPaket(["KEPUTUSAN-X.md", ...WAJIB]), []);
});

test("mode gagal: folder modul baru tanpa bagian baca-dulu ditolak", () => {
  const md = "### 2.1 A (`/a`): baca dulu, baru bangun\n`public/a/**` di `data/kajian-bnpb/a/`\n";
  assert.deepEqual(folderTakBerpaket(["public/a", "public/lama", "public/baru"], ["public/lama"], md), ["public/baru"]);
});

test("tiap modul baca-dulu di AGENTS.md punya paket dokumen lengkap dan tidak kosong", () => {
  const md = readFileSync(new URL("AGENTS.md", AKAR), "utf8");
  const modul = modulBacaDulu(md);
  assert.ok(modul.length >= 2, `AGENTS.md hanya memuat ${modul.length} modul baca-dulu; parser atau AGENTS.md berubah`);
  const bolong = [];
  for (const m of modul) {
    const dir = new URL(`data/kajian-bnpb/${m}/`, AKAR);
    if (!existsSync(dir)) { bolong.push(`${m}: folder tidak ada`); continue; }
    const berkas = readdirSync(dir);
    const utang = UTANG[m] || [];
    for (const f of utang) if (berkas.includes(f)) bolong.push(`${m}: ${f} sudah ada, hapus dari UTANG`);
    const k = kurangPaket(berkas).filter(f => !utang.includes(f));
    if (k.length) bolong.push(`${m}: kurang ${k.join(", ")}`);
    for (const f of berkas.filter(f => f.endsWith(".md") && (WAJIB.includes(f) || f.startsWith("KEPUTUSAN")))) {
      const n = statSync(new URL(f, dir)).size;
      if (n < UKURAN_MIN) bolong.push(`${m}/${f}: ${n} byte, di bawah ${UKURAN_MIN}, paket kosong tidak dihitung`);
    }
    if (berkas.includes("TIKET.md") && !/\b[A-Z]{2,}-\d{1,3}\b/.test(readFileSync(new URL("TIKET.md", dir), "utf8"))) bolong.push(`${m}/TIKET.md: tidak ada kode tiket`);
  }
  assert.deepEqual(bolong, [], `Paket dokumen modul belum lengkap. Akibat: kode lahir tanpa rancangan. Perbaiki: lengkapi data/kajian-bnpb/<modul>/.\n${bolong.join("\n")}`);
});

test("folder modul baru di public/ atau scripts/ wajib punya bagian baca-dulu di AGENTS.md", () => {
  const md = readFileSync(new URL("AGENTS.md", AKAR), "utf8");
  const lama = JSON.parse(readFileSync(new URL("tests/agen/fixtures/modul-lama.json", AKAR), "utf8"));
  const ada = [...subdir("public"), ...subdir("scripts")];
  assert.deepEqual(lama.filter(d => !ada.includes(d)), [], "tests/agen/fixtures/modul-lama.json memuat folder yang sudah tidak ada: hapus barisnya");
  const liar = folderTakBerpaket(ada, lama, md);
  assert.deepEqual(liar, [], `Folder modul baru tanpa paket dokumen: ${liar.join(", ")}. Perbaiki: buat paket di data/kajian-bnpb/<modul>/ dan bagian "### 2.x ...: baca dulu, baru bangun" di AGENTS.md yang menyebut foldernya, sebelum kode.`);
});

test("pengingat aktif untuk fitur besar, diam untuk perbaikan biasa", () => {
  const skrip = fileURLToPath(new URL("scripts/agents/pengingat-paket.mjs", AKAR));
  const jalan = prompt => spawnSync("node", [skrip], {input: JSON.stringify({prompt}), encoding: "utf8"}).stdout;
  assert.match(jalan("kerjain 7 fitur besar ini"), /hulu ke hilir/);
  assert.match(jalan("buatkan sistem pelaporan"), /hulu ke hilir/);
  assert.equal(jalan("benerin typo di kartu"), "");
});
