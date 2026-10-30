/* Gerbang aturan pemilik: semua deretan pilihan (.ak-seg) selebar wadah, tombol dibagi rata, dan tiap tombol berikon. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css = readFileSync(new URL("../../public/akademisi.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const aturan = sel => css.split("}").map(r => r.split("{")).filter(([a, b]) => b !== undefined && !a.includes("@") && a.split(",").map(x => x.trim()).includes(sel)).map(([, b]) => b).join(";");

test(".ak-seg selebar wadah (flex atau grid, width 100%)", () => {
  const d = aturan(".ak-seg");
  assert.match(d, /display:\s*(flex|grid)/, "display flex/grid");
  assert.match(d, /width:\s*100%/, "width 100%");
});

test("tombol di .ak-seg dibagi rata (flex: 1 1 0)", () => {
  assert.match(aturan(".ak-seg button"), /flex:\s*1 1 0/);
});

test("JS melengkapi ikon bagi tombol .ak-seg tanpa ikon", () => {
  const js = readFileSync(new URL("../../public/akademisi.js", import.meta.url), "utf8");
  assert.match(js, /function hiasSeg/);
  assert.match(js, /\.ak-seg button:not\(\[data-ik\]\)/);
});

test("tidak ada titik tengah dan tidak ada merek lama di layar direktori", () => {
  for (const f of ["akademisi.js", "akademisi.html"]) {
    const t = readFileSync(new URL("../../public/" + f, import.meta.url), "utf8");
    assert.ok(!t.includes("·"), f + " memuat titik tengah");
    assert.ok(!/pantau bencana/i.test(t), f + " memuat merek lama");
  }
});
