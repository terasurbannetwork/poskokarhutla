/* KP-02 / T14: satu penormal nomor WA; kontrak lama tiap pemanggil tetap. Tanpa mock. */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
await import("../../src/worker.js");   // worker dulu: wa.js dan worker.js saling impor
import {normalWA} from "../../src/nomor.js";
import {normalWA as dariWorker} from "../../src/worker.js";
import {normalWa} from "../../src/kontak.js";
import {normalNo} from "../../src/wa.js";

uji("T14: semua bentuk -> 628… ; worker.js mengekspor fungsi yang sama", () => {
  assert.equal(dariWorker, normalWA);
  for (const a of ["0812-3456-789", "+62 812 3456 789", "812 3456 789", "62 812 3456 789", "(0812) 3456.789", "628123456789"]) assert.equal(normalWA(a), "628123456789", a);
  assert.match(normalWA("0812-34567"), /^62[0-9]+$/);   // lolos CHECK GLOB '62[0-9]*'
});
uji("normalWA: tak sah -> null", () => {
  for (const x of [null, undefined, "", "  ", "021-555-1234", "12345", "0812", "+1 415 555 0100", "0812abc345678", "6281" + "9".repeat(13), "0912345678"]) assert.equal(normalWA(x), null, String(x));
});
uji("kontrak kontak.js: null kosong, false tak sah, string sah", () => {
  assert.equal(normalWa("81234567890"), "6281234567890");
  for (const x of [null, "", "  "]) assert.equal(normalWa(x), null);
  for (const x of ["021-555-1234", "0812", "+1 415 555 0100"]) assert.equal(normalWa(x), false);
});
uji("kontrak wa.js normalNo: JID, nomor asing dan id tetap digit mentah, kosong -> ''", () => {
  assert.equal(normalNo("081234567890@s.whatsapp.net"), "6281234567890");
  assert.equal(normalNo("6281234567890:12@s.whatsapp.net"), "628123456789012");   // perilaku lama: sufiks perangkat ikut digit
  assert.equal(normalNo("14155550100@s.whatsapp.net"), "14155550100");
  assert.equal(normalNo(null), "");
  assert.equal(normalNo("812345678901@lid"), "812345678901");   // id LID berawalan 8 bukan nomor Indonesia: tidak boleh jadi 62..., normalNo sengaja tidak memakai normalWA
});
