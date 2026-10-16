/* Pop-up alarm peringatan dini (public/inti/alarm.js) terpasang di tiap halaman bencana yang tidak "mati" dan di /semua,
   dan tidak pernah memakai kata "aman" (A25 + PERINGATAN-DINI.md: tanpa pernyataan resmi tidak pernah ditulis aman). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const reg = JSON.parse(readFileSync("public/bencana.json", "utf8"));
const halaman = [...reg.bencana.filter(b => b.status !== "mati").map(b => "public" + b.rute + "index.html"), "public/semua/index.html"];

test("tiap halaman bencana memuat inti/alarm.js", () => {
  for (const h of halaman) assert.match(readFileSync(h, "utf8"), /<script src="\/inti\/alarm\.js" defer><\/script>/, h);
});

test("alarm.js meng-escape teks API dan tanpa kata 'aman'", () => {
  const s = readFileSync("public/inti/alarm.js", "utf8");
  for (const f of ["a.judul", "a.teks", "a.sumber", "a.tingkat"]) assert.ok(s.includes(`esc(${f})`), `${f} harus lewat esc()`);
  assert.ok(!/\baman\b/i.test(s.replace(/\/\*[\s\S]*?\*\//g, "")), "kata 'aman' dilarang");
});
