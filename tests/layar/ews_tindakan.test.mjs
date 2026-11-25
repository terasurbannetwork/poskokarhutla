// PB-36a/38a/40/42/44/46a: gerbang kamus tangga tindakan. Entri LAMA dibekukan; jenis baru wajib bersumber.
import test from "node:test"; import assert from "node:assert/strict";
import {BENCANA, tindakanUntuk} from "../../public/ews_tindakan.js";
const LAMA = [];   // semua jenis bersumber: cuaca PB-42, gempa dan tsunami PB-44, karhutla/banjir/longsor/rob/pesisir/kekeringan KI-56
/* butir tanpa rujukan tak kosong: daftar "tingkat t butir i" yang cacat */
const cacat = b => Object.entries(b.tindakan).flatMap(([t, d]) => d.flatMap((_, i) => String(b.rujukan?.[t]?.[i] ?? "").trim() ? [] : [`${t}/${i}`]).concat(
  (b.rujukan?.[t]?.length ?? 0) === d.length ? [] : [`${t}/panjang`]));
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
  assert.deepEqual(tindakanUntuk("tak_dikenal", 2), []); assert.equal(tindakanUntuk("tsunami", 1), BENCANA.tsunami.tindakan[2]);
});
test("udara (PB-38a): tiap tingkat 1..3 ada tindakan, tiap butir bersumber Kemenkes, gambar ada", async () => {
  const u = BENCANA.udara; assert.ok(u);
  for (const t of [1, 2, 3]) { assert.ok(u.tindakan[t]?.length, `tingkat ${t}`); for (const r of u.rujukan[t]) assert.match(r, /^Kemenkes, \d{1,2} \w+ \d{4}, ".+" \(kemkes\.go\.id\)$/); }
  assert.ok((await import("node:fs")).existsSync(new URL(`../../public/img/${u.gambar}`, import.meta.url)));
});
test("KI-56: karhutla, banjir, longsor, rob, pesisir, kekeringan: tiap butir punya rujukan Buku Saku BNPB, tanpa 'aman'", () => {
  for (const id of ["karhutla", "banjir", "longsor", "rob", "pesisir", "kekeringan"]) {
    assert.deepEqual(cacat(BENCANA[id]), [], `${id} butir tanpa rujukan`);
    for (const r of Object.values(BENCANA[id].rujukan).flat()) assert.match(r, /^BNPB, Buku Saku Tanggap Tangkas Tangguh \((2012|cetakan 4, 2019)\), hlm\. \d+/);
    for (const d of Object.values(BENCANA[id].tindakan).flat()) assert.doesNotMatch(d, /\baman\b/i);
  }
});
test("KI-56: validator menolak butir tanpa rujukan atau rujukan kosong", () => {
  assert.deepEqual(cacat({tindakan: {1: ["a", "b"]}, rujukan: {1: ["x", ""]}}), ["1/1"]);
  assert.deepEqual(cacat({tindakan: {1: ["a"]}}), ["1/0", "1/panjang"]);
  assert.deepEqual(cacat({tindakan: {1: ["a"]}, rujukan: {1: ["x"]}}), []);
});
