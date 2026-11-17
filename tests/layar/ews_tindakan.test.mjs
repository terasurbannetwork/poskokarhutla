// PB-36a/38a/40/42/44/46a: gerbang kamus tangga tindakan. Entri LAMA dibekukan; jenis baru wajib bersumber.
import test from "node:test"; import assert from "node:assert/strict";
import {BENCANA, tindakanUntuk} from "../../public/ews_tindakan.js";
const LAMA = ["karhutla", "banjir", "longsor", "cuaca", "rob"];   // gempa dan tsunami bersumber sejak PB-44
test("tingkat hanya 1..3 dan tidak ada daftar kosong (server memakai length daftar)", () => {
  for (const [id, b] of Object.entries(BENCANA)) for (const [t, d] of Object.entries(b.tindakan)) {
    assert.ok([1, 2, 3].includes(+t), `${id} tingkat ${t}`); assert.ok(Array.isArray(d) && d.length, `${id} tingkat ${t} kosong`);
  }
});
test("jenis baru: tiap butir punya rujukan paralel, tanpa 'aman', tanpa titik tengah", () => {
  for (const [id, b] of Object.entries(BENCANA).filter(([id]) => !LAMA.includes(id))) for (const [t, d] of Object.entries(b.tindakan)) {
    assert.equal(b.rujukan?.[t]?.length, d.length, `${id} tingkat ${t} butir tanpa rujukan`);
    for (const k of d) { assert.doesNotMatch(k, /\baman\b/i); assert.doesNotMatch(k, / · /); }
  }
});
test("tindakanUntuk jenis tak dikenal kosong; tsunami tingkat 1 jatuh ke tingkat terendah", () => {
  assert.deepEqual(tindakanUntuk("pesisir", 2), []); assert.equal(tindakanUntuk("tsunami", 1), BENCANA.tsunami.tindakan[2]);
});
test("udara (PB-38a): tiap tingkat 1..3 ada tindakan, tiap butir bersumber Kemenkes, gambar ada", async () => {
  const u = BENCANA.udara; assert.ok(u);
  for (const t of [1, 2, 3]) { assert.ok(u.tindakan[t]?.length, `tingkat ${t}`); for (const r of u.rujukan[t]) assert.match(r, /^Kemenkes, \d{1,2} \w+ \d{4}, ".+" \(kemkes\.go\.id\)$/); }
  assert.ok((await import("node:fs")).existsSync(new URL(`../../public/img/${u.gambar}`, import.meta.url)));
});
