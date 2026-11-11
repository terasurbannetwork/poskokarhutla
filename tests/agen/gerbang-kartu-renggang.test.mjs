/* Gerbang kartu renggang (pemilik 11 Nov 2026: "gw ga pernah suka yang nempel gini", "review semuanya jangan ada yang nempel").
   1. public/inti/kartu.css memberi jarak antar-kartu .ex yang bersebelahan (>= 16px) dengan spesifisitas di atas .ex.ex-std{margin:0}.
   2. CSS halaman yang menolkan margin kartu (.ex{margin:0}) hanya boleh bila wadahnya grid/flex ber-gap; yang belum diperiksa tercatat di SISA
      dan hanya boleh berkurang (ratchet). Kartu baru yang ditumpuk di wadah blok tanpa jarak langsung merah. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const css = execFileSync("git", ["ls-files", "public/**/*.css", "public/*.css"], {encoding: "utf8"}).split("\n").filter(f => f && !/ 2\./.test(f));
const aturan = [];
for (const f of css) {
  const s = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/@import[^;]*;/g, "");
  for (const m of s.matchAll(/([^{}]+)\{([^{}]*)\}/g)) aturan.push({f, sel: m[1].trim(), isi: m[2]});
}
/* wadah yang belum diperiksa saat gerbang lahir; hapus barisnya begitu wadahnya diberi gap atau terbukti berisi satu kartu */
const SISA = new Set(["#insight .ct-bab", "#satelit", "#posko", "#tren", "#dampak", "#laporan #insight", ".sp-slot", ".sp-kartu-tautan"]);

test("kartu.css: kartu .ex yang bersebelahan diberi jarak minimal 16px", () => {
  const r = aturan.find(a => a.f === "public/inti/kartu.css" && a.sel.split(",").some(x => /^\.ex(\.ex-std)?\+\.ex$/.test(x.replace(/\s+/g, ""))));
  assert.ok(r, "aturan .ex+.ex di kartu.css hilang");
  const m = r.isi.match(/margin-top\s*:\s*(\d+)px/); assert.ok(m && +m[1] >= 16, "margin-top antar-kartu kurang dari 16px");
  assert.ok(r.sel.includes(".ex.ex-std+.ex"), "butuh varian .ex.ex-std+.ex supaya menang atas .ex.ex-std{margin:0}");
});

test("CSS halaman yang menolkan margin kartu hanya di wadah grid/flex ber-gap (ratchet)", () => {
  const ber = c => aturan.some(a => a.sel.split(",").some(x => x.trim() === c) && /\bgap\s*:/.test(a.isi) && /display\s*:\s*(grid|flex)/.test(a.isi));
  const langgar = new Set();
  for (const a of aturan) {
    if (!/(^|;)\s*margin(-top)?\s*:\s*0(px)?\s*(;|$)/.test(a.isi.trim() + ";") && !/(^|;)\s*margin\s*:\s*0(px)?\s+0/.test(a.isi)) continue;
    for (const p of a.sel.split(",").map(x => x.trim())) {
      if (!/(\.ex|\.ex-std)$/.test(p) || /\.ex2 \.ex$/.test(p) || p === ".ex.ex-std") continue;
      const wadah = p.replace(/\s*>?\s*(\.ex(\.ex-std)?|\.ex-std)$/, "").trim();
      if (wadah && !ber(wadah)) langgar.add(wadah);
    }
  }
  const baru = [...langgar].filter(w => !SISA.has(w)), lunas = [...SISA].filter(w => !langgar.has(w));
  assert.deepEqual(baru, [], `kartu ditumpuk menempel: wadah ini menolkan margin kartu tanpa gap. Beri wadahnya display:grid;gap:20px`);
  assert.deepEqual(lunas, [], "wadah ini sudah tidak melanggar; hapus dari SISA");
});
