import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const baca = f => fs.readFileSync(new URL(`../../public/banjir/${f}`, import.meta.url), "utf8");
const F = ["replay.html", "replay.js", "replay.css", "replay_kerja.js"], T = Object.fromEntries(F.map(f => [f, baca(f)]));

test("skrip replay sah secara sintaks", () => { for (const f of ["replay.js", "replay_kerja.js"]) new vm.Script(T[f], {filename: f}); });
test("aturan teks pemilik: tanpa em dash, tanpa pemisah titik tengah", () => {
  for (const f of F) { assert.ok(!T[f].includes("—"), `${f} memuat em dash`); assert.ok(!T[f].includes(" · "), `${f} memuat pemisah titik tengah`); }
});
test("setiap #id yang dipakai replay.js ada di replay.html", () => {
  const ada = new Set([...T["replay.html"].matchAll(/id="([^"]+)"/g)].map(m => m[1])), pakai = new Set([...T["replay.js"].matchAll(/\$\("#([A-Za-z][\w]*)"\)/g)].map(m => m[1]));
  for (const id of pakai) if (!["hasil-dinamis"].includes(id) && !id.startsWith("p-")) assert.ok(ada.has(id), `#${id} tidak ada di HTML`);
  for (const p of ["ringkasan", "lapisan", "model"]) assert.ok(ada.has("p-" + p));
});
test("data dari JSON hanya masuk lewat textContent (tanpa innerHTML)", () => { assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(T["replay.js"])); });
test("replay.html memuat mesin kisi dan MapLibre 4.7.1", () => { assert.match(T["replay.html"], /maplibre-gl\/4\.7\.1/); assert.match(T["replay.html"], /sim_genangan\.js/); });
test("data replay: tata letak biner konsisten dengan dekode di worker", () => {
  const f = new URL("../../public/banjir/data/replay/maret2025.json", import.meta.url); if (!fs.existsSync(f)) return;
  const d = JSON.parse(fs.readFileSync(f, "utf8")), B = Object.fromEntries(d.biner.bagian.map(b => [b.nama, b]));
  for (const n of ["indeks", "dalam_delta_cm", "hmaks_cm", "jam_hmaks", "dem_dm", "gedung"]) assert.ok(B[n], n);
  assert.equal(B.dalam_delta_cm.jumlah, B.indeks.jumlah * d.jam);
  assert.equal(d.ringkasan.per_jam.length, d.jam); assert.equal(d.kisi.nx * d.kisi.ny, B.hmaks_cm.jumlah); assert.equal(d.kisi.sudut_lonlat.length, 4);
});
