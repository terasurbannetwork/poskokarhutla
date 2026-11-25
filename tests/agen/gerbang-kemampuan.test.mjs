// Gerbang matriks Kemampuan Inti (KI-70, data/kajian-bnpb/kemampuan-inti/).
// Pemilik 24 Nov 2026: "gw pengen setiap bencana jadi paling lengkap", "Pastikan tapi berguna ya".
// Tiap sel ✗ di RISET.md wajib punya tiket hidup yang menyebut kode bencananya di kurung, atau baris alasan
// di tabel "Sel ✗ tanpa tiket". Tiap kode KI yang dirujuk matriks wajib ada di TIKET.md.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const DIR = new URL("../../data/kajian-bnpb/kemampuan-inti/", import.meta.url);
const KOLOM = ["Krh", "Bnj", "Rob", "Lsr", "Pss", "Cca", "Udr", "Gmp", "Tsn", "Gna", "Kkr"];

const sel = baris => baris.split("|").slice(1, -1).map(x => x.trim());

// murni: baris matriks {kode, sel: {Krh: "✓", ...}, tiket: [{kode, bencana: [..]}]}
export function bacaMatriks(md) {
  const out = [];
  for (const b of md.split("\n")) {
    const c = sel(b);
    if (c.length !== 3 + KOLOM.length || !/^[MPSED]\d+$/.test(c[0])) continue;
    const tiket = [...c[c.length - 1].matchAll(/\b((?:KI|PB|LS)-[0-9A-Za-z.*-]*[0-9A-Za-z*])(?:\s*\(([^)]*)\))?/g)]
      .map(m => ({kode: m[1], bencana: (m[2] || "").split(",").map(x => x.trim()).filter(Boolean)}));
    out.push({kode: c[0], sel: Object.fromEntries(KOLOM.map((k, i) => [k, c[2 + i]])), tiket});
  }
  return out;
}

// murni: {"M2": Set("Cca"), ...} dari tabel bagian "Sel ✗ tanpa tiket"
export function bacaPengecualian(md) {
  const m = /\n##[^\n]*Sel ✗ tanpa tiket[^\n]*\n/.exec(md), i = m ? m.index + 1 : -1, j = i < 0 ? -1 : md.indexOf("\n## ", i + 1);
  const out = {};
  if (i < 0) return out;
  for (const b of md.slice(i, j < 0 ? undefined : j).split("\n")) {
    const c = sel(b);
    if (c.length !== 3 || !/^[MPSED]\d+$/.test(c[0])) continue;
    if (!c[2] || c[2].length < 15) continue;   // alasan wajib berisi
    (out[c[0]] ||= new Set()); c[1].split(",").map(x => x.trim()).forEach(x => out[c[0]].add(x));
  }
  return out;
}

// murni: status tiket {KI-01: "-", KI-13: "DITUTUP ..."}
export function bacaTiket(md) {
  const out = {};
  for (const b of md.split("\n")) {
    const c = sel(b);
    if (/^KI-\d+$/.test(c[0] || "")) out[c[0]] = c[c.length - 1] || "";
  }
  return out;
}

const mati = st => /^(DITUTUP|DIGABUNG)/.test(st || "");

export function celah(riset, tiketMd) {
  const tiket = bacaTiket(tiketMd), kecuali = bacaPengecualian(riset), salah = [];
  for (const r of bacaMatriks(riset)) {
    for (const t of r.tiket) if (t.kode.startsWith("KI-") && !(t.kode in tiket)) salah.push(`${r.kode}: ${t.kode} tidak ada di TIKET.md`);
    for (const t of r.tiket) if (t.kode.startsWith("KI-") && mati(tiket[t.kode])) salah.push(`${r.kode}: ${t.kode} berstatus ${tiket[t.kode].split(":")[0]}, ganti dengan tiket hidup atau pindahkan sel ke "Sel ✗ tanpa tiket"`);
    for (const k of KOLOM) {
      if (r.sel[k] !== "✗") continue;
      const lewat = r.tiket.some(t => t.bencana.includes(k) && !(t.kode.startsWith("KI-") && mati(tiket[t.kode])));
      if (!lewat && !kecuali[r.kode]?.has(k)) salah.push(`${r.kode} ${k}: sel ✗ tanpa tiket dan tanpa alasan`);
    }
  }
  return salah;
}

test("parser: sel ✗ tanpa tiket ditolak, dengan tiket atau alasan diterima", () => {
  const kepala = "| Kode | T | " + KOLOM.join(" | ") + " | Tiket |\n";
  const baris = (kode, isi, tk) => `| ${kode} | x | ${isi.join(" | ")} | ${tk} |\n`;
  const semua = v => KOLOM.map(() => v);
  const a = [...semua("✓")]; a[2] = "✗"; a[10] = "✗";
  const tk = "| Tiket | Isi | Status |\n| KI-01 | a | - |\n| KI-02 | b | DITUTUP: tidak berguna |\n";
  assert.deepEqual(celah(kepala + baris("M1", a, "KI-01 (Rob, Kkr)"), tk), []);
  assert.deepEqual(celah(kepala + baris("M1", a, "KI-01 (Rob)"), tk), ["M1 Kkr: sel ✗ tanpa tiket dan tanpa alasan"]);
  const alasan = "\n## 7. Sel ✗ tanpa tiket\n| Baris | Bencana | Alasan |\n| M1 | Kkr | Data kejadian per kab terlalu sedikit untuk dinilai. |\n";
  assert.deepEqual(celah(kepala + baris("M1", a, "KI-01 (Rob)") + alasan, tk), []);
  assert.ok(celah(kepala + baris("M1", a, "KI-02 (Rob, Kkr)"), tk).some(x => x.includes("berstatus DITUTUP")));
  assert.ok(celah(kepala + baris("M1", a, "KI-09 (Rob, Kkr)"), tk).some(x => x.includes("tidak ada di TIKET.md")));
  const alasanKosong = "\n## 7. Sel ✗ tanpa tiket\n| M1 | Kkr | x |\n";
  assert.ok(celah(kepala + baris("M1", a, "KI-01 (Rob)") + alasanKosong, tk).length === 1, "alasan pendek tidak dihitung");
});

test("matriks Kemampuan Inti: tiap sel ✗ punya tiket hidup atau alasan", () => {
  const riset = readFileSync(new URL("RISET.md", DIR), "utf8"), tiket = readFileSync(new URL("TIKET.md", DIR), "utf8");
  const n = bacaMatriks(riset).length;
  assert.ok(n >= 30, `hanya ${n} baris matriks terbaca dari RISET.md; format tabel berubah?`);
  const salah = celah(riset, tiket);
  assert.deepEqual(salah, [], `Matriks Kemampuan Inti bolong (${salah.length}). Akibat: celah bencana hilang dari rencana. Perbaiki: tambah kode bencana di kurung tiket baris itu, atau tulis alasannya di "Sel ✗ tanpa tiket".\n${salah.join("\n")}`);
});
