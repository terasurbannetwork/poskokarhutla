/* Tautan bertoken bersama (src/token.js, bagian Tautan bertoken src/hak.js, migrasi 0164). D1 lokal sungguhan lewat Miniflare, migrasi apa adanya, tanpa tiruan.
   Jalankan: node --test tests/warga/token.test.mjs */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai} from "./_bnpb.mjs";
import {terbitkan, periksa, cabut, punya} from "../../src/token.js";
import {tkPakai, pelakuTkPeriksa, pelakuTkTerbit, tkSimpan} from "../../src/hak.js";

const uji = berantai(), U = await siapkan("uji-token"), env = {DB: U.DB}, KINI = Date.parse("2026-11-23T04:00:00Z"), HARI = 864e5;
const baru = (o = {}) => terbitkan(env, {jenis: "mitra_3w", sasaran: {org: "ORG-1", kejadian: "KJ-2026-ABCDEFGH"}, cakupan: ["isi_3w"], ttlMs: 7 * HARI, oleh: "staf-1", ...o}, KINI);

uji("token: terbit, periksa, cabut, kedaluwarsa, dan D1 hanya menyimpan sha-256", async () => {
  const t = await baru();
  assert.match(t.token, /^[A-Za-z0-9_-]{43}$/); assert.equal(t.kedaluwarsa, KINI + 7 * HARI);
  const b = await U.DB.prepare("SELECT * FROM tautan_token WHERE id = ?").bind(t.id).first();
  assert.equal(b.token_sha.length, 64); assert.ok(!JSON.stringify(b).includes(t.token), "token mentah tidak pernah tersimpan");
  const p = await periksa(env, "mitra_3w", t.token, KINI + 1000);
  assert.deepEqual(p, {id: t.id, sasaran: {org: "ORG-1", kejadian: "KJ-2026-ABCDEFGH"}, cakupan: ["isi_3w"], kedaluwarsa: t.kedaluwarsa});
  assert.ok(punya(p, "isi_3w")); assert.ok(!punya(p, "hapus")); assert.ok(!punya(null, "isi_3w"));
  await periksa(env, "mitra_3w", t.token, KINI + 2000);
  assert.deepEqual(await U.DB.prepare("SELECT dipakai_n, terakhir FROM tautan_token WHERE id = ?").bind(t.id).first(), {dipakai_n: 2, terakhir: KINI + 2000}, "pemakaian tercatat");
  assert.equal(await periksa(env, "lain", t.token, KINI), null, "jenis lain ditolak");
  assert.equal(await periksa(env, "mitra_3w", t.token, KINI + 7 * HARI), null, "tepat di batas kedaluwarsa ditolak");
  assert.equal(await cabut(env, "lain", t.id, KINI + 2500), false, "jenis lain tidak bisa mencabut");
  assert.equal(await cabut(env, "mitra_3w", t.id, KINI + 3000), true); assert.equal(await cabut(env, "mitra_3w", t.id, KINI + 4000), false, "cabut dua kali");
  assert.equal(await periksa(env, "mitra_3w", t.token, KINI + 5000), null, "dicabut ditolak");
  assert.equal((await U.DB.prepare("SELECT dipakai_n FROM tautan_token WHERE id = ?").bind(t.id).first()).dipakai_n, 2, "pemeriksaan gagal tidak menambah hitungan");
});

uji("token: masukan salah ditolak sebelum D1; skema menolak baris tanpa kedaluwarsa yang sah", async () => {
  for (const o of [{jenis: "Mitra"}, {ttlMs: 30e3}, {ttlMs: 91 * HARI}, {cakupan: ["A B"]}, {sasaran: "teks"}, {sasaran: ["larik"]}, {sasaran: {x: "y".repeat(600)}}, {oleh: ""}])
    await assert.rejects(() => baru(o), Error, JSON.stringify(o));
  for (const t of ["", "pendek", "x".repeat(43) + "=", null, 123]) assert.equal(await periksa(env, "mitra_3w", t, KINI), null);
  assert.equal(await cabut(env, "mitra_3w", "bukan-id", KINI), false);
  await assert.rejects(() => tkSimpan(env, pelakuTkTerbit, {id: "a".repeat(16), jenis: "mitra_3w", token_sha: "b".repeat(64), sasaran: "{}", cakupan: "[]", dibuat: KINI, kedaluwarsa: KINI, oleh: "s"}), /CHECK/);
  await assert.rejects(() => tkSimpan(env, pelakuTkTerbit, {id: "c".repeat(16), jenis: "mitra_3w", token_sha: "B".repeat(64), sasaran: "{}", cakupan: "[]", dibuat: KINI, kedaluwarsa: KINI + 1, oleh: "s"}), /CHECK/);
  assert.throws(() => tkPakai(env, {peran: "sistem"}, "mitra_3w", "b".repeat(64), KINI), /tidak berhak/);
  assert.throws(() => tkSimpan(env, pelakuTkPeriksa, {}), /tidak berhak/, "pemeriksa tidak bisa menerbitkan");
});
