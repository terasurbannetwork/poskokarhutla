import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

/* L16: kartu entitas di direktori harus bisa diklik utuh: tiap <article> templat punya role=button/link
   (dengan data-* atau data-href/hrefAttr pembukanya). Pengecualian: isi lembar detail dan templat yang tidak dipakai. */
const js = readFileSync(new URL("../../public/akademisi.js", import.meta.url), "utf8");
const KECUALI = new Set(["ak-psk"]);   /* kartuSd (isi lembar detail), kartuSkema/kartuIn (diganti kartuSkemaP/kartuInP) */

test("tiap kartu <article> berperan tombol/tautan dan punya pembuka", () => {
  const tag = [...js.matchAll(/<article class="([^"]+)"([^>]*)>/g)].filter(m => !KECUALI.has(m[1]));
  assert.ok(tag.length >= 8, "terlalu sedikit kartu terdeteksi: " + tag.length);
  for (const [, kelas, sisa] of tag) {
    assert.match(sisa, /role="(button|link)"/, `kartu ${kelas} tanpa role=button/link`);
    assert.match(sisa, /tabindex="0"/, `kartu ${kelas} tanpa tabindex`);
    assert.match(sisa, /data-[a-z]+=|hrefAttr\(/, `kartu ${kelas} tanpa data-* pembuka`);
  }
});
