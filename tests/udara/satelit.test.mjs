import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

/* satelit.js adalah skrip klasik: dijalankan di konteks vm dengan data nyata public/udara/data */
const baca = p => fs.readFileSync(new URL("../../public/" + p, import.meta.url), "utf8");
const ctx = vm.createContext({innerWidth: 1200, document: {querySelector: () => null, addEventListener() {}}, Insight: {eyIk: (id, n) => n}, namaProv: k => "P" + k, jamWIB: t => t,
  fetch: async u => ({ok: true, json: async () => JSON.parse(baca(String(u).replace(/^\//, "")))}), console});
for (const f of ["inti/format.js", "inti/kartu.js", "udara/satelit.js"]) vm.runInContext(baca(f), ctx, {filename: f});
const jalan = s => vm.runInContext(s, ctx);
await jalan("Satelit.muatKartu()");

test("kartu TROPOMI: label pengamatan, TAK TERUJI, sumber, satuan mol/m2", () => {
  const h = jalan("Satelit.exTropo()");
  for (const t of ["pengamatan satelit", "TAK TERUJI", "NASA GES DISC", "mol/m²"]) assert.ok(h.includes(t), "tak ada: " + t);
});
test("rapor model: angka dari berkas, MOS lolos tapi kalah dari persistensi, gabungan GAGAL, batas stasiun", () => {
  const U = JSON.parse(baca("udara/data/uji_panen_pm25.json")), a = U.mos.mae_uji, h = jalan("Satelit.exRapor()");
  const f = v => v.toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  assert.ok(h.includes(f(a.mos)) && h.includes(f(a.cams_mentah)) && h.includes(f(a.persistensi_24j)), "angka MAE tidak dibaca dari berkas");
  assert.ok(h.includes("LOLOS") && h.includes("GAGAL") && h.includes("kalah dari"), "vonis atau kekalahan tak tampil");
  assert.ok(/Jabodetabek dan Bali/.test(h), "batas representasi stasiun tak tertulis");
});
test("berkas hilang = kartu dibuang", () => {
  jalan("Satelit._s = null; Satelit._u = null");
  assert.equal(jalan("Satelit.exTropo()"), ""); assert.equal(jalan("Satelit.exRapor()"), "");
});
