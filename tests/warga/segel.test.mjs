/* U1-U3 segel dokumen (data/kajian-bnpb/segel-dokumen/RENCANA-UJI.md). Fungsi murni src/segel.js; uji rute dan D1 menyusul di SG-04 dst. */
import { test } from "node:test";
import assert from "node:assert/strict";
import "../../src/worker.js";   // dahulu: impor sirkular (segel.js -> worker.js -> RUTE_SEGEL)
import { ABJAD, buatKode, normalKode, tampilKode, dasarRujukan, statusSegel, STATUS } from "../../src/segel.js";

test("U1 buatKode 1.000 kali: 10 huruf Crockford, tanpa duplikat", () => {
  const semua = new Set();
  for (let i = 0; i < 1000; i++) {
    const k = buatKode();
    assert.match(k, /^[0-9A-HJKMNP-TV-Z]{10}$/);
    semua.add(k);
  }
  assert.equal(semua.size, 1000);
  assert.equal(ABJAD.length, 32);
  assert.doesNotMatch(ABJAD, /[ILOU]/);
  // tiap byte memetakan ke abjad tanpa berat sebelah: 0..255 jatuh rata ke 32 huruf
  assert.equal(buatKode(b => b.fill(255)), "ZZZZZZZZZZ");
  assert.equal(buatKode(b => b.fill(32)), "0000000000");
});

test("U2 normalKode: huruf besar tanpa tanda hubung; O jadi 0, I dan L jadi 1; bukan kode = null", () => {
  assert.equal(normalKode("abcde-fghjk"), "ABCDEFGHJK");
  assert.equal(normalKode(" 0O1IL-abcde "), "00111ABCDE");
  assert.equal(normalKode("0o1il abcde"), "00111ABCDE");
  assert.equal(normalKode("ABCDE-FGHJ"), null);       // 9 huruf
  assert.equal(normalKode("ABCDEFGHJKM"), null);      // 11 huruf
  assert.equal(normalKode("ABCDEFGHJU"), null);       // U bukan Crockford
  assert.equal(normalKode("ABCDE'FGHJ"), null);
  assert.equal(normalKode(null), null);
  const k = buatKode();
  assert.equal(normalKode(tampilKode(k).toLowerCase()), k);
  assert.equal(tampilKode("ABCDEFGHJK"), "ABCDE-FGHJK");
});

test("dasarRujukan membuang #ralat dan #versi", () => {
  assert.equal(dasarRujukan("2026-11-24#1"), "2026-11-24");
  assert.equal(dasarRujukan("banjir/2026-11-24#0"), "banjir/2026-11-24");
  assert.equal(dasarRujukan("pbd_abc"), "pbd_abc");
});

test("U3 statusSegel empat keadaan; Dicabut menang atas Tidak cocok", () => {
  assert.equal(statusSegel({dicabut: null, cocok: true, terbaru: null}), "berlaku");
  assert.equal(statusSegel({dicabut: null, cocok: true, terbaru: "ABCDEFGHJK"}), "lebih_baru");
  assert.equal(statusSegel({dicabut: 5, cocok: true, terbaru: null}), "dicabut");
  assert.equal(statusSegel({dicabut: null, cocok: false, terbaru: "ABCDEFGHJK"}), "tidak_cocok");
  assert.equal(statusSegel({dicabut: 5, cocok: false, terbaru: "ABCDEFGHJK"}), "dicabut");
  assert.deepEqual(Object.values(STATUS), ["Dicabut", "Tidak cocok", "Ada versi lebih baru", "Berlaku"]);
});
