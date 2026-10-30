import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

/* cache immutable 1 hari: ketiga berkas direktori harus satu versi ?v= supaya peramban tidak mencampur JS lama dengan yang baru */
test("akademisi.css, fungsi_direktori.js, akademisi.js memakai ?v= yang sama", () => {
  const h = readFileSync(new URL("../../public/akademisi.html", import.meta.url), "utf8");
  const v = n => { const m = h.match(new RegExp(n.replace(".", "\\.") + "\\?v=(\\d+)")); assert.ok(m, n + " tanpa ?v="); return m[1]; };
  const a = [v("akademisi.css"), v("fungsi_direktori.js"), v("akademisi.js")];
  assert.equal(new Set(a).size, 1, "versi berbeda: " + a.join(", "));
});
