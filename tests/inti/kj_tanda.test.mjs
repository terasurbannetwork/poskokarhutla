/* KP-07: bagian murni Tanda kejadian (pengelompokan 50, model pil, awalan rute). Jalankan: node --test tests/inti/kj_tanda.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const ctx = {}; vm.runInNewContext(readFileSync(new URL("../../public/inti/kj_tanda.js", import.meta.url), "utf8"), ctx);   // skrip klasik: global KjTanda
const K = ctx.KjTanda;

test("bagi memotong per 50", () => {
  const a = Array.from({length: 120}, (_, i) => i), b = K.bagi(a);
  assert.equal(b.map(x => x.length).join(), "50,50,20");   // larik lintas realm vm: bandingkan lewat string
  assert.equal(K.bagi([]).length, 0);
});
test("model: terpasang, ambigu, belum", () => {
  const t = K.model({status: "terpasang", kejadian_id: "KJ-2026-ABCDEFGH"});
  assert.equal(t.teks, "KJ-2026-ABCDEFGH"); assert.equal(t.href, "/siklus/kejadian/KJ-2026-ABCDEFGH"); assert.match(t.label, /KJ-2026-ABCDEFGH/);
  const a = K.model({status: "ambigu", kejadian_id: null, kandidat: ["KJ-1"]});
  assert.equal(a.teks, "perlu dipilih"); assert.equal(a.kelas, "ambigu"); assert.equal(a.href, "/siklus#antrean");
  for (const s of ["belum", "tanpa_wilayah", "asing", undefined]) { const m = K.model(s && {status: s}); assert.equal(m.teks, "belum bertaut"); assert.equal(m.href, null); }
  assert.equal(K.model({status: "terpasang", kejadian_id: null}).href, null);   // tanpa id tak ada tujuan
});
test("tanpa huruf kapital semua dan tanpa titik tengah", () => {
  for (const m of [K.model({status: "ambigu"}), K.model(null)]) assert.doesNotMatch(m.teks + m.label, /[·]|\b[A-Z]{4,}\b/);
});
test("url: awalan per halaman, k dikodekan", () => {
  assert.equal(K.awalan("/instansi"), "/api/instansi/siklus"); assert.equal(K.awalan("/bnpb/logbook"), "/api/siklus");
  const u = K.url([["tugas_api", "a b"], ["sippa", "x"]], "/bnpb/logbook");
  assert.equal(u, "/api/siklus/kejadian/tautan?k=tugas_api%3Aa%20b&k=sippa%3Ax");
});
