/* Siklus Bencana G1: rencana kueri (SK-044, UJ-F7-03). Setiap SQL sk_* yang dirakit src/hak.js dikumpulkan lewat env.DB tiruan (perekam), lalu
   EXPLAIN QUERY PLAN dijalankan di D1 Miniflare dengan migrasi apa adanya. Tak boleh ada SCAN tabel penuh kecuali yang terdaftar KECIL/INDEKS_BOLEH.
   Jalankan: node --test tests/warga/siklus_rencana_kueri.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";
import * as H from "../../src/hak.js";

const U = await mulai("uji-sk-rencana", {r2: false});
const {DB} = U;
const rek = [];
const env = {DB: {prepare(sql) { const o = {bind: () => o, first: async () => ({n: 0}), all: async () => ({results: []}), run: async () => ({})}; rek.push(sql); return o; }}};
const adm = H.pelakuAdmin, sis = H.pelakuSistem, ID = "KJ-2026-9A2WGN3G";
const f0 = {dari: "2026-03-01", sampai: "2026-03-31", batas: 50, dummyOk: false}, ses = {mulai: "2026-03-05", id: ID};
const panggil = [
  () => H.skKejadianDaftar(env, adm, f0), () => H.skKejadianDaftar(env, adm, {...f0, dummyOk: true, kab4: "3201", prov: "32", jenis: "banjir", fase: "tanggap", sesudah: ses}),
  () => H.skKejadianDaftar(env, adm, {...f0, lingkup: '["3201","3202"]'}), () => H.skKejadianDaftar(env, adm, {...f0, lingkup: '["3201"]', kab4: "3201", sesudah: ses, dummyOk: true}),
  () => H.skKejadianById(env, adm, ID), () => H.skKejadianKab(env, adm, ID), () => H.skSumberDariKejadian(env, adm, ID), () => H.skSumberById(env, adm, "0123456789abcdef"),
  () => H.skJejakObyek(env, adm, "kejadian", ID, 50, false), () => H.skJejakObyek(env, adm, "kejadian", ID, 50, true), () => H.skKejadianRingkas(env, adm, ID),
  () => H.skKejadianRingkasBanyak(env, adm, [ID]), () => H.skIdTerpakai(env, adm, [ID]), () => H.skKejadianPublik(env, adm, ID),
  () => H.skKejadianSerupa(env, adm, "3201", "2026-03-01", "2026-03-05", true), () => H.skKejadianSerupa(env, adm, "3201", "2026-03-01", "2026-03-05", false),
  () => H.skAntreanDaftar(env, adm, {batas: 50, dummyOk: false}), () => H.skAntreanDaftar(env, adm, {status: "ambigu", batas: 50, dummyOk: true, sesudah: ses}),
  () => H.skIngestJendela(env, sis, {...f0, sesudah: ses}), () => H.skIngestJendela(env, sis, f0), () => H.skIngestSumber(env, sis, {...f0, sesudah: ses}), () => H.skIngestSumber(env, sis, f0),
  () => H.skSumberAda(env, sis, [["dibi", "x"]]), () => H.skDummyKejadianAda(env, adm, "2026-03-01", "2026-03-31"),
  () => H.skStmtKab(env, adm, ID, "3201", 1, 0, ["dibi", "x"]), () => H.skStmtKabSalin(env, adm, ID, ID, 1),
  () => H.skStmtSumberPindahSemua(env, adm, ID, ID, 1), () => H.skStmtSumberPindah(env, adm, "0123456789abcdef", ID, ID, 1), () => H.skStmtAntrean(env, adm, "0123456789abcdef", "ditolak", null, null, 1),
  () => H.skStmtFase(env, adm, ID, "tanggap", 1), () => H.skStmtPublik(env, adm, ID, true, "x", 1), () => H.skStmtDummyHapus(env, adm),
];
for (const f of panggil) await f();
const sk = [...new Set(rek.filter(s => /\bsk_/.test(s)))];

/* SCAN yang dibolehkan: tidak ada tabel sk_* penuh. Pemindaian indeks parsial dummy hanya menyentuh baris dummy (kecil). */
const INDEKS_BOLEH = /USING (COVERING )?INDEX (sk_kej_dummy|sk_jejak_dummy)\b/;
const params = sql => (sql.match(/\?/g) ?? []).length;

uji("kueri terkumpul: semua fungsi baca dan tulis sk_* ikut diperiksa", () => { assert.ok(sk.length >= 30, `hanya ${sk.length} kueri`); });
for (const sql of sk) uji(`UJ-F7-03: tanpa SCAN tabel penuh: ${sql.replace(/\s+/g, " ").slice(0, 90)}`, async () => {
  const baris = (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...Array(params(sql)).fill("[]")).all()).results.map(r => r.detail);
  for (const d of baris) {
    if (!/^SCAN /.test(d)) continue;
    if (/ VIRTUAL TABLE INDEX|^SCAN json_each|^SCAN j\b/.test(d)) continue;   // json_each: kecil, dibatasi isi parameter
    assert.ok(INDEKS_BOLEH.test(d), `SCAN tak terdaftar: ${d}\n${sql}\n${baris.join("\n")}`);
  }
});

uji("indeks A: daftar kejadian memakai sk_kej_mulai (mulai DESC, id DESC) tanpa urut ulang; antrean memakai sk_ks_antre (status, mulai, id)", async () => {
  const plan = async (sql, ...b) => (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...b).all()).results.map(r => r.detail).join(" | ");
  const a = await plan("SELECT id FROM sk_kejadian e WHERE e.fase != 'digabung' AND e.mulai >= ? AND e.mulai <= ? ORDER BY e.mulai DESC, e.id DESC LIMIT 51", "2026-03-01", "2026-03-31");
  assert.match(a, /sk_kej_mulai/); assert.doesNotMatch(a, /TEMP B-TREE/, a);
  const q = rek.find(s => /FROM sk_kejadian_sumber WHERE status IN \('ambigu', 'tanpa_wilayah'\) AND dummy = 0 ORDER BY mulai, id/.test(s));   // kueri nyata antreanDaftar tanpa saringan status
  const b = await plan(q, 51);
  assert.match(b, /sk_ks_antre/);   // TEMP B-TREE untuk ORDER BY tetap ada (dua status digabung), tetapi hanya di atas baris antrean (indeks parsial), bukan seluruh tabel
});
uji("indeks B: daftar BP mencari lewat sk_kejkab_kab (kab4, mulai) memakai rentang mulai", async () => {
  const sql = rek.find(s => /FROM sk_kejadian_kab k JOIN sk_kejadian e/.test(s) && /json_each/.test(s));
  const baris = (await DB.prepare("EXPLAIN QUERY PLAN " + sql).bind(...Array(params(sql)).fill("[]")).all()).results.map(r => r.detail);
  const k = baris.find(d => /sk_kejkab_kab/.test(d)); assert.ok(k, baris.join("\n"));
  assert.match(k, /^SEARCH k USING (COVERING )?INDEX sk_kejkab_kab \(kab4=\? AND mulai>\? AND mulai<\?\)/, k);
});
