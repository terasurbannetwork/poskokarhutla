/* Gerbang blok tidak menempel di layar /operasi (pemilik 11 Nov 2026, berulang: "Ini kenapa nempel banget. Lu udah gw bilang
   berkali-kali. gw ga mau rapet begini." lalu "Lu catat ya"). Tiap wadah yang menumpuk kartu atau blok di public/operasi_peta.css
   wajib punya gap minimal 12px; aturan terakhir yang menyebut gap untuk selektor itu yang dihitung (CSS menimpa dari atas ke bawah).
   Wadah penumpuk baru di layar ini wajib masuk daftar WADAH. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const CSS = readFileSync(new URL("../../public/operasi_peta.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const MIN = 12;
const WADAH = ["#opsLaporan .ops-ringkas-slot", "#opsLaporan .ops-wadah", "#opsLaporan .ops-pa-badan", "#opsLaporan .ops-rl-daftar", ".ops-dlg-isi",
  "#opsLaporan .ops-pb-grid", "#opsLaporan .ops-tindak ul", "#opsIsi", "#opsLaporan",
  "#opsLaporan .ops-a", "#opsLaporan .ops-utama", "#opsLaporan .ops-pk-grid", "#opsLaporan .ops-pb-pulau", "#opsLaporan .ops-pb-pulau>section", "#opsLaporan .ops-ap-daftar", "#opsLaporan .ops-kanan", "#opsLaporan .ops-nl2-tema"];

export function gapTerakhir(css, sel) {
  let hasil = null;
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const pemilih = m[1].split(",").map(x => x.trim());
    if (!pemilih.includes(sel)) continue;
    const g = /(?:^|;)\s*gap\s*:\s*([^;]+)/.exec(m[2]); if (g) hasil = g[1].trim();
  }
  return hasil;
}

test("wadah penumpuk di /operasi punya gap >= 12px", () => {
  for (const sel of WADAH) {
    const g = gapTerakhir(CSS, sel);
    assert.ok(g, `${sel}: tidak punya gap, blok di dalamnya menempel`);
    const px = Math.min(...g.split(/\s+/).map(v => parseFloat(v)).filter(Number.isFinite));
    assert.ok(px >= MIN, `${sel}: gap ${g} < ${MIN}px, blok terlalu rapat`);
  }
});

test("pemeriksa menangkap wadah tanpa gap dan gap rapat", () => {
  assert.equal(gapTerakhir(".a{display:grid}", ".a"), null);
  assert.equal(gapTerakhir(".a{gap:20px}.a{gap:4px}", ".a"), "4px");
  assert.equal(gapTerakhir(".b,.a{display:grid;gap:14px 12px}", ".a"), "14px 12px");
});
