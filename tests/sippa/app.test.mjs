/* SP-010: pencocok jalur router /pipa (murni). Jalur liar tidak boleh jatuh ke modul layar mana pun. */
import test from "node:test";
import assert from "node:assert/strict";
import {cocokkanJalur, LAYAR} from "../../public/pipa/app.js";

test("cocokkanJalur: /pipa = ringkas, /pipa/<layar> untuk sebelas layar, garis miring akhir diabaikan", () => {
  assert.deepEqual(cocokkanJalur("/pipa"), {layar: "ringkas"}); assert.deepEqual(cocokkanJalur("/pipa/"), {layar: "ringkas"});
  for (const l of ["peta", "hitung", "pemicu", "kit", "log", "ab", "studio", "3d", "telemetri", "laporan", "data"]) assert.deepEqual(cocokkanJalur("/pipa/" + l), {layar: l}, l);
  assert.equal(LAYAR.length, 12, "ringkas + sebelas layar");
});

test("cocokkanJalur: /pipa/kit/<id 16 heks> membawa id; id liar ditolak", () => {
  assert.deepEqual(cocokkanJalur("/pipa/kit/0123456789abcdef"), {layar: "kit", id: "0123456789abcdef"});
  for (const j of ["/pipa/kit/xyz", "/pipa/kit/0123456789ABCDEF", "/pipa/kit/0123456789abcde", "/pipa/log/0123456789abcdef"]) assert.equal(cocokkanJalur(j), null, j);
});

test("cocokkanJalur: jalur di luar layar ditolak (lapangan itu cangkang lain, awalan mirip, traversal)", () => {
  for (const j of ["/pipa/lapangan", "/pipa/ringkas", "/pipa/../admin", "/pipa/log/../x", "/pipax", "/pipa/peta/x/y", "/pipa/__proto__", "/pipa/constructor", "/"]) assert.equal(cocokkanJalur(j), null, j);
});

test("pastikanInti memuat /inti/nanti.js lebih dulu sehingga nanti() ada sebelum layar mana pun jalan (INP.md kelas 5)", async () => {
  const {readFileSync} = await import("node:fs");
  const {INTI, pastikanInti} = await import("../../public/pipa/app.js");
  assert.equal(INTI[0][1], "/inti/nanti.js", "nanti.js harus pertama");
  const diminta = [];
  globalThis.window = globalThis;
  globalThis.requestAnimationFrame = f => setTimeout(f, 0);
  globalThis.document = {createElement: () => ({}), head: {append: s => {
    diminta.push(s.src);
    /* tiruan pemuatan skrip klasik: nanti.js dijalankan apa adanya dari berkas nyata */
    if (s.src === "/inti/nanti.js") (0, eval)(readFileSync(new URL("../../public/inti/nanti.js", import.meta.url), "utf8"));
    queueMicrotask(() => s.onload());
  }}};
  assert.equal(typeof globalThis.nanti, "undefined", "awalnya belum ada");
  await pastikanInti();
  assert.equal(typeof globalThis.nanti, "function", "nanti harus fungsi sesudah pastikanInti");
  assert.ok(diminta.includes("/inti/nanti.js"));
  await new Promise(ok => globalThis.nanti(ok));
});

test("app.js tidak punya jalan pintas setTimeout untuk menunda kerja layar (tunda = nanti tanpa cadangan diam-diam)", async () => {
  const {readFileSync} = await import("node:fs");
  assert.doesNotMatch(readFileSync(new URL("../../public/pipa/app.js", import.meta.url), "utf8"), /setTimeout\(f, ?0\)/);
});
