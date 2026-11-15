/* PB-08: daftar periksa regu per jenis (susunChecklist, murni). Butir longsor/pesisir hanya yang bersumber [repo]/[korpus]; karhutla dan jenis lain tidak berubah.
   Jalankan: node --test tests/warga/pb_penugasan.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import "../../src/worker.js";
import {susunChecklist} from "../../src/penugasan.js";

const butir = b => susunChecklist({bencana: b}, 3), teks = b => butir(b).map(x => x.teks).join("|");
const API = /\bapi\b|tahan api|asap|gambut|n95|pompa|selang|jet shooter/i, KAPITAL = /^[^a-z]*[A-Z]{4,}\b/;

test("longsor dan pesisir punya daftar tidak kosong, APD wajib, tanpa kosakata api", () => {
  for (const b of ["longsor", "pesisir"]) {
    const d = butir(b);
    assert.ok(d.length > 8, b); assert.ok(d.some(x => x.k === "apd" && x.wajib === false && x.teks === "APD sesuai penugasan"), b);
    assert.ok(d.some(x => x.k === "air_minum") && d.some(x => x.k === "p3k"), b + " daftar umum tetap");
    assert.doesNotMatch(teks(b), API, b);
    for (const x of d) assert.doesNotMatch(x.teks, /\baman\b/i, `${b}/${x.k}: tanpa kata aman`);
    assert.equal(new Set(d.map(x => x.k)).size, d.length, "kunci unik");
  }
  assert.ok(butir("longsor").some(x => x.k === "sar_perka" && /^Rujukan:/.test(x.teks) && /13\/2010/.test(x.teks) && /6\/2026/.test(x.teks) && !x.wajib));
  assert.ok(!butir("pesisir").some(x => x.k === "sar_perka"), "pesisir: tak ada butir bersumber, daftar umum saja");
});

test("jenis tak dikenal (termasuk nama prototipe) tidak jatuh ke daftar karhutla", () => {
  for (const b of ["tidak_dikenal", "tsunami", "toString", "__proto__", "constructor"]) {
    assert.doesNotMatch(teks(b), /tahan api|asap gambut|n95/i, b);
    assert.ok(butir(b).some(x => x.k === "apd" && x.wajib === false), b);
  }
});

test("karhutla dan jenis lain tetap", () => {
  assert.deepEqual(susunChecklist({}, 2), susunChecklist({bencana: "karhutla"}, 2));
  assert.match(teks("karhutla"), /baju tahan api/); assert.match(teks("karhutla"), /N95/);
  assert.match(teks("banjir"), /pelampung/); assert.match(teks("gempa"), /helm/); assert.match(teks("gunungapi"), /masker penyaring abu/i);
  assert.match(teks("cuaca"), /jas hujan/); assert.match(teks("kekeringan"), /Topi/); assert.match(teks("udara"), /N95/);
});
