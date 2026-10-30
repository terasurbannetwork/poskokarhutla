/* Gerbang saringan bencana multi-pilih: OR antar rumpun terpilih, kosong = semua, URL lama tetap jalan. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const akar = {}; new Function("window", readFileSync(new URL("../../public/saring_bencana.js", import.meta.url), "utf8"))(akar);
const {cocokBencana: c, bacaBencana: b, tulisBencana: t} = akar;

test("himpunan kosong cocok dengan semua butir", () => { assert.equal(c([], ["gempa"]), true); assert.equal(c(new Set(), []), true); });
test("OR: cocok bila punya salah satu rumpun terpilih", () => {
  assert.equal(c(["gempa", "banjir"], ["banjir", "longsor"]), true);
  assert.equal(c(["gempa", "banjir"], ["tsunami"]), false);
  assert.equal(c(new Set(["gempa"]), []), false);
});
test("wabah dipetakan ke rumpun kesehatan bencana", () => { assert.equal(c(["wabah"], ["kesehatan bencana"]), true); });
test("URL: daftar koma dan URL lama satu nilai, hanya kunci sah, tanpa duplikat", () => {
  const sah = ["gempa", "banjir", "tsunami"];
  assert.deepEqual(b("gempa,banjir", sah), ["gempa", "banjir"]);
  assert.deepEqual(b("gempa", sah), ["gempa"]);
  assert.deepEqual(b("gempa,gempa,xxx,", sah), ["gempa"]);
  assert.equal(t(["gempa", "banjir"]), "gempa,banjir");
});
