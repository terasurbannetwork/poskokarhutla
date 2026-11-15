#!/usr/bin/env node
// Hitung ulang paritas multi-bencana dari docs/multi-bencana/bencana/<id>.md (ALGORITMA 8.2, PB-01).
//   node scripts/agents/paritas.mjs         tulis public/data/paritas.json + tabel di PARITAS-2026-11-15.md
//   node scripts/agents/paritas.mjs --cek   hitung, bandingkan dengan berkas tertulis, tanpa menulis (CI)
//   node scripts/agents/paritas.mjs --uji   self-check logika murni
// Keluar 1 bila: baris G02/G03/G10 gempa|cuaca|udara masih TIDAK BERLAKU (K5), ADA karhutla/banjir turun dari acuan
// (tests/agen/fixtures/paritas-acuan.json), atau (--cek) keluaran tertulis basi. Tanpa dependensi.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = join(ROOT, "docs/multi-bencana/bencana");
const DOK = join(ROOT, "docs/multi-bencana/PARITAS-2026-11-15.md");
const KELUAR = join(ROOT, "public/data/paritas.json");
const ACUAN = join(ROOT, "tests/agen/fixtures/paritas-acuan.json");
const URUTAN = [["banjir", "Banjir"], ["longsor", "Longsor"], ["pesisir", "Pesisir"], ["cuaca", "Cuaca"],
  ["udara", "Udara"], ["gempa", "Gempa"], ["gunungapi", "Gn. api"], ["kekeringan", "Kering"]];
const K5 = { ids: ["gempa", "cuaca", "udara"], kode: ["G02", "G03", "G10"] };
const MULAI = "<!-- paritas:mulai -->", AKHIR = "<!-- paritas:akhir -->";

const STATUS = [[/^(ada|dibuat|diadaptasi)\b/i, "ada"], [/^sebagian\b/i, "sebagian"], [/^belum\b/i, "belum"],
  [/^(tidak berlaku|tb)\b/i, "tb"]];
const statusSel = (s) => { for (const [re, v] of STATUS) if (re.test(s.trim())) return v; return null; };

// Baris tabel "| A01 | nama | ...": status = sel status TERAKHIR dari rangkaian sel status berurutan di awal
// (banjir/longsor/kekeringan punya kolom "status paket" lalu kolom status ADA/SEBAGIAN/BELUM/TB).
export function urai(md) {
  const baris = [];
  for (const l of md.split("\n")) {
    const m = l.match(/^\|\s*([A-G]\d{2})\s*\|(.*)$/);
    if (!m) continue;
    const sel = m[2].split("|").map((s) => s.trim());
    let i = 1, st = null, akhir = 0;
    for (; i < sel.length; i++) { const s = statusSel(sel[i]); if (!s) break; st = s; akhir = i; }
    if (!st) continue;
    baris.push({ kode: m[1], status: st, sisa: sel.slice(akhir + 1).join(" ") });
  }
  return baris;
}

let _berkas = null;
function berkasRepo() {
  if (!_berkas) _berkas = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: ROOT, maxBuffer: 1 << 28 })
    .toString().split("\n").filter(Boolean);
  return _berkas;
}
// Token berkas dalam bukti (tanpa akhiran :baris); ada bila persis atau sebagai akhiran jalur di repo.
export function adaBerkas(teks, daftar) {
  const tok = [...teks.matchAll(/[\w.\-/]+\.(?:py|mjs|js|json|jsonc|ya?ml|html|css|md|sql|sh)\b/g)].map((x) => x[0].replace(/^\.?\//, ""));
  return tok.some((t) => daftar.some((p) => p === t || p.endsWith("/" + t)));
}

export function hitung(id, baris, daftar, lapor) {
  const h = { ada: 0, sebagian: 0, belum: 0, tb: 0 }, g = { ada: 0, sebagian: 0, belum: 0, tb: 0 };
  for (const b of baris) {
    let st = b.status;
    if (K5.ids.includes(id) && K5.kode.includes(b.kode) && st === "tb")
      lapor.galat.push(`${id} ${b.kode}: masih TIDAK BERLAKU, K5 mewajibkan berlaku`);
    if (st === "ada" && !adaBerkas(b.sisa, daftar)) {
      lapor.turun.push(`${id} ${b.kode}: ADA tanpa berkas bukti yang ada, diturunkan ke SEBAGIAN`);
      st = "sebagian";
    }
    (b.kode[0] === "G" ? g : h)[st]++;
  }
  const jml = (x) => ({ ...x, berlaku: x.ada + x.sebagian + x.belum });
  return { a_f: jml(h), g: jml(g) };
}

export function bandingAcuan(hasil, acuan, lapor) {
  for (const [id, a] of Object.entries(acuan || {})) {
    const ada = hasil[id]?.a_f.ada;
    if (ada !== undefined && ada < a.ada) lapor.galat.push(`${id}: ADA ${ada} turun dari acuan ${a.ada}`);
  }
}

export function tabel(hasil) {
  const b = (k, f) => URUTAN.map(([id, n]) => `| ${n} | ${hasil[id][k].ada} | ${hasil[id][k].sebagian} | ${hasil[id][k].belum} | ${hasil[id][k].tb} |`).join("\n");
  const kep = "| Bencana | ADA | SEBAGIAN | BELUM | Tidak berlaku |\n|---|---|---|---|---|\n";
  return `${MULAI}\n${kep}${b("a_f")}\n\nKomponen baru G01-G11 (hitungan skrip):\n\n${kep}${b("g")}\n${AKHIR}`;
}

export function sisipTabel(dok, t) {
  const re = new RegExp(`${MULAI}[\\s\\S]*?${AKHIR}`);
  if (re.test(dok)) return dok.replace(re, () => t);
  // pertama kali: ganti tabel hitungan lama di bawah "## Hitungan 113 komponen"
  const lama = /(## Hitungan 113 komponen\n\n)\| Bencana \|[\s\S]*?\n\n/;
  assert.ok(lama.test(dok), "tabel hitungan lama tidak ditemukan");
  return dok.replace(lama, (_, h) => `${h}${t}\n\n`);
}

function semua() {
  const daftar = berkasRepo(), lapor = { galat: [], turun: [] }, hasil = {};
  for (const [id] of URUTAN) {
    const baris = urai(readFileSync(join(DIR, `${id}.md`), "utf8"));
    const kode = new Set(baris.map((b) => b.kode));
    if (kode.size !== 124 || baris.length !== 124) lapor.galat.push(`${id}: ${baris.length} baris (${kode.size} kode unik), seharusnya 113 + 11 = 124`);
    hasil[id] = hitung(id, baris, daftar, lapor);
  }
  const acuan = existsSync(ACUAN) ? JSON.parse(readFileSync(ACUAN, "utf8")) : null;
  if (acuan) bandingAcuan(hasil, acuan, lapor); else lapor.turun.push("acuan beku tests/agen/fixtures/paritas-acuan.json belum ada; perbandingan karhutla/banjir dilewati");
  return { hasil, lapor };
}

function uji() {
  const md = `| A01 | x | dibuat | ADA | scripts/agents/paritas.mjs:3 | c |\n| G02 | y | belum | catatan |\n| A02 | z | tidak berlaku (alasan) | - |\n| A03 | w | sebagian | SEBAGIAN | - | c |`;
  const b = urai(md);
  assert.deepEqual(b.map((x) => x.status), ["ada", "belum", "tb", "sebagian"]);
  const daftar = ["scripts/agents/paritas.mjs"];
  const l1 = { galat: [], turun: [] };
  const h = hitung("banjir", b, daftar, l1);
  assert.deepEqual([h.a_f.ada, h.a_f.sebagian, h.a_f.belum, h.a_f.tb, h.a_f.berlaku], [1, 1, 0, 1, 2]);
  assert.equal(h.g.belum, 1);
  const l2 = { galat: [], turun: [] };
  assert.equal(hitung("banjir", b, [], l2).a_f.ada, 0); // bukti tak ada: turun
  assert.equal(l2.turun.length, 1);
  const l3 = { galat: [], turun: [] };
  hitung("gempa", urai("| G02 | y | tidak berlaku | -- |"), daftar, l3);
  assert.equal(l3.galat.length, 1); // K5
  const l4 = { galat: [], turun: [] };
  hitung("longsor", urai("| G02 | y | tidak berlaku | -- |"), daftar, l4);
  assert.equal(l4.galat.length, 0);
  const l5 = { galat: [], turun: [] };
  bandingAcuan({ banjir: { a_f: { ada: 74 } } }, { banjir: { ada: 75 } }, l5);
  assert.equal(l5.galat.length, 1);
  const t = tabel(Object.fromEntries(URUTAN.map(([id]) => [id, h])));
  assert.equal(sisipTabel(sisipTabel(`## Hitungan 113 komponen\n\n| Bencana | ADA |\n|---|---|\n| a | 1 |\n\nx`, t), t).split(MULAI).length, 2);
  console.log("paritas --uji: ok");
}

const arg = process.argv[2];
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (arg === "--uji") uji();
  else {
    const { hasil, lapor } = semua();
    const json = JSON.stringify({ versi: 1, acuan_dari: "docs/multi-bencana/bencana/*.md", bencana: hasil, diturunkan: lapor.turun }, null, 1) + "\n";
    const dok = sisipTabel(readFileSync(DOK, "utf8"), tabel(hasil));
    for (const [id] of URUTAN) {
      const { a_f: a, g } = hasil[id];
      console.log(`${id.padEnd(10)} A-F ada ${a.ada} sebagian ${a.sebagian} belum ${a.belum} tb ${a.tb} | G ada ${g.ada} sebagian ${g.sebagian} belum ${g.belum} tb ${g.tb}`);
    }
    lapor.turun.forEach((x) => console.log("TURUN", x));
    lapor.galat.forEach((x) => console.error("GALAT", x));
    if (lapor.galat.length) process.exit(1);
    if (arg === "--cek") {
      const basi = !existsSync(KELUAR) || readFileSync(KELUAR, "utf8") !== json || readFileSync(DOK, "utf8") !== dok;
      if (basi) { console.error("GALAT paritas.json atau tabel dokumen basi: jalankan node scripts/agents/paritas.mjs"); process.exit(1); }
    } else { writeFileSync(KELUAR, json); writeFileSync(DOK, dok); }
  }
}
