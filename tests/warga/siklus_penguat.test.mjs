/* Siklus Bencana G1: perbaikan temuan pemeriksa (paritas dummy antrean, penyaringan BP, jejak dummy, cache 404 publik, ingest tanpa kejadian yatim, kab4 antrean).
   worker.js utuh di Miniflare + D1 sungguhan. Jalankan: node --test tests/warga/siklus_penguat.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, kjAcak} from "./_siklus.mjs";
import * as H from "../../src/hak.js";

const U = await mulai("uji-sk-penguat");
const {DB, api, GET, POST, n, kej, SA, TAMU} = U;
const KO = await U.staf("Ko Uji", ["koordalops"]), PD = await U.staf("Pd Uji", ["pusdalops"]), BP = await U.bp();
const TOK = {authorization: "Bearer token-pipa-uji"};
const ING = k => api("POST", "/api/siklus/ingest/kejadian", {keputusan: [k]}, TOK);
const dasar = (o = {}) => ({sumber: "gdacs", kode: "x" + Math.random().toString(36).slice(2), aksi: "baru", jenis: "banjir", kab4: "3201", mulai: "2026-03-02", diambil: 1_780_000_000_000, nama: "Banjir contoh", ...o});

uji("item 1: antrean menolak 409 bila paritas dummy sumber dan kejadian berbeda (kedua arah); paritas sama lolos", async () => {
  assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-04"})).s, 200);
  const nyata = await kej(KO, {mulai: "2026-04-03", nama: "Banjir nyata paritas"});
  const dum = (await DB.prepare("SELECT id FROM sk_kejadian WHERE dummy = 1 AND fase = 'tanggap'").first()).id;
  const sd = (await DB.prepare("SELECT id FROM sk_kejadian_sumber WHERE dummy = 1 AND status = 'ambigu'").first()).id;
  await DB.prepare("UPDATE sk_kejadian_sumber SET kandidat = ? WHERE id = ?").bind(JSON.stringify([nyata, dum]), sd).run();
  const r = await POST(SA, `/antrean/${sd}`, {pilih: nyata}); assert.equal(r.s, 409, r.t); assert.match(r.t, /dummy/);
  assert.equal((await DB.prepare("SELECT status FROM sk_kejadian_sumber WHERE id = ?").bind(sd).first()).status, "ambigu", "tidak menulis");
  const ok = await POST(SA, `/antrean/${sd}`, {pilih: dum}); assert.equal(ok.s, 200, ok.t);
  const i = await ING(dasar({aksi: "ambigu", kandidat: [dum, nyata], kode: "nyata-ambigu"})); assert.equal(i.s, 200, i.t);
  const sn = (await DB.prepare("SELECT id FROM sk_kejadian_sumber WHERE kode = 'nyata-ambigu'").first()).id;
  const t = await POST(SA, `/antrean/${sn}`, {pilih: dum}); assert.equal(t.s, 409, "sumber nyata ke kejadian dummy");
  assert.equal((await POST(SA, `/antrean/${sn}`, {pilih: nyata})).s, 200);
});

uji("item 2 dan 5: BP hanya melihat kab dalam lingkup, tanpa sumber[].kandidat dan catatan jejak; jejak dummy tersaring bagi staf nyata", async () => {
  const id = await kej(KO, {mulai: "2026-05-02", nama: "Banjir multi kab"});
  assert.equal((await POST(KO, `/kejadian/${id}/fase`, {ke: "terverifikasi", alasan: "catatan internal verifikasi"})).s, 200);
  assert.equal((await ING(dasar({aksi: "tambah", kejadian_id: id, kab4: "3202", kode: "multi-1", mulai: "2026-05-02"}))).s, 200);
  await DB.prepare("UPDATE sk_kejadian_sumber SET kandidat = ? WHERE kode = 'multi-1'").bind(JSON.stringify([id])).run();
  const d = await GET(BP, `/kejadian/${id}`); assert.equal(d.s, 200, d.t);
  assert.deepEqual(d.j.kab, ["3201"], "3202 di luar lingkup BP Bogor");
  assert.ok(d.j.sumber.length >= 1); for (const s of d.j.sumber) assert.ok(!("kandidat" in s), "kandidat tidak untuk BP");
  assert.ok(d.j.jejak.length >= 1); for (const j of d.j.jejak) { assert.ok(!("catatan" in j) && !("oleh" in j)); }
  const s = await GET(KO, `/kejadian/${id}`); assert.deepEqual(s.j.kab, ["3201", "3202"]); assert.ok(s.j.sumber.every(x => "kandidat" in x));
  assert.ok(s.j.jejak.some(j => j.catatan === "catatan internal verifikasi"));
  /* jejak dummy */
  assert.equal((await POST(SA, "/dummy", {aksi: "isi", halaman: "kejadian", periode: "2026-06"})).s, 200);
  const dum = (await DB.prepare("SELECT id FROM sk_kejadian WHERE dummy = 1 AND mulai >= '2026-06-01'").first()).id;
  assert.equal((await GET(PD, `/jejak?id=${dum}`)).j.jejak.length, 0, "staf nyata tidak melihat jejak dummy");
  assert.ok((await GET(SA, `/jejak?id=${dum}`)).j.jejak.length >= 1);
  await POST(SA, "/dummy", {aksi: "hapus"});
});

uji("item 6: 404 publik ikut dicache tepi 60 detik, dan sama untuk id yang tak pernah ada serta kejadian belum publik", async () => {
  const hilang = await GET(TAMU, `/publik/kejadian/${kjAcak()}`); assert.equal(hilang.s, 404);
  assert.match(hilang.h.get("cache-control"), /s-maxage=60/);
  const id = await kej(KO, {mulai: "2026-05-10", nama: "Belum publik"});
  const belum = await GET(TAMU, `/publik/kejadian/${id}`); assert.equal(belum.s, 404); assert.equal(belum.t, hilang.t);
});

uji("item 7: kejadian dan kab tidak dibuat bila baris sumber sudah ada (kalah balapan ingest); tanpa itu ada kejadian yatim", async () => {
  const p = H.pelakuSistem, env = {DB}, kini = Date.now(), id = kjAcak(), sid = "ab".repeat(8);
  await DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, kab4, mulai, diambil, dibuat, diubah, dummy) VALUES (?, 'dibi', 'balap-1', 'tanpa_wilayah', 'banjir', NULL, '2026-05-20', 1, 1, 1, 0)").bind("cd".repeat(8)).run();
  const sebelum = await n("sk_kejadian");
  const res = await H.skBatch(env, p, [
    H.skStmtKejadianBaru(env, p, {id, jenis: "banjir", nama: "Banjir balap", prov: "32", kab4: "3201", mulai: "2026-05-20", asal: "otomatis", kini, oleh: "sistem:ingest", belumAda: ["dibi", "balap-1"]}),
    H.skStmtKab(env, p, id, "3201", kini, 0, ["dibi", "balap-1"]),
    H.skStmtSumberBaru(env, p, {id: sid, sumber: "dibi", kode: "balap-1", kejadian_id: id, status: "terpasang", jenis: "banjir", kab4: "3201", mulai: "2026-05-20", diambil: kini, kini}),
    H.skStmtJejak(env, p, "sistem:ingest", "ingest", sid, "ingest", null, "1", null, kini)]);
  assert.equal(res[0].meta.changes, 0); assert.equal(res[2].meta.changes, 0);
  assert.equal(await n("sk_kejadian"), sebelum, "tidak ada kejadian yatim"); assert.equal(await n("sk_kejadian_kab", `kejadian_id = '${id}'`), 0);
  /* jalur normal tetap membuat */
  const i = await ING(dasar({kode: "normal-7", mulai: "2026-05-21"})); assert.equal(i.j.baru, 1);
  assert.equal(await n("sk_kejadian_kab", "mulai = '2026-05-21'"), 1, "kab menyimpan mulai kejadian");
});

uji("item 8: antrean tidak menimpa kab4 baris yang sudah punya wilayah; baris tanpa wilayah memakai kab4 dari keputusan", async () => {
  const id = await kej(KO, {mulai: "2026-05-25", nama: "Banjir antrean kab"});
  assert.equal((await ING(dasar({aksi: "ambigu", kandidat: [id], kode: "ant-1", mulai: "2026-05-25"}))).s, 200);
  const a = (await DB.prepare("SELECT id FROM sk_kejadian_sumber WHERE kode = 'ant-1'").first()).id;
  const r = await POST(KO, `/antrean/${a}`, {pilih: id, kab4: "3202"}); assert.equal(r.s, 200, r.t);
  assert.equal((await DB.prepare("SELECT kab4 FROM sk_kejadian_sumber WHERE id = ?").bind(a).first()).kab4, "3201", "kab4 sumber tidak ditimpa");
  assert.equal(await n("sk_kejadian_kab", `kejadian_id = '${id}' AND kab4 = '3202'`), 0);
  assert.equal((await ING(dasar({aksi: "tanpa_wilayah", kode: "ant-2", mulai: "2026-05-25"}))).s, 200);
  const b = (await DB.prepare("SELECT id FROM sk_kejadian_sumber WHERE kode = 'ant-2'").first()).id;
  assert.equal((await POST(KO, `/antrean/${b}`, {pilih: "baru", kab4: "3202"})).s, 200);
  assert.equal((await DB.prepare("SELECT kab4 FROM sk_kejadian_sumber WHERE id = ?").bind(b).first()).kab4, "3202");
});

uji("saya: staf bersesi memperoleh {peran, dummyOk, wilayah}; tamu 401; BP lewat /api/siklus 401", async () => {
  const w = await U.staf("Wil Uji", ["koordalops"], ["32"]);
  const r = await GET(w, "/saya"); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j, {peran: ["koordalops"], dummyOk: false, wilayah: ["32"]});
  assert.deepEqual((await GET(SA, "/saya")).j, {peran: ["superadmin"], dummyOk: true, wilayah: []});
  assert.equal((await GET(TAMU, "/saya")).s, 401); assert.equal((await api("GET", "/api/siklus/saya", undefined, BP.h)).s, 401);
  assert.equal(r.h.get("cache-control").includes("private"), true);
});

uji("daftar kejadian memuat dampak ringkas per baris (korban sumber berdampingan + selisih, tanpa total); tanpa sumber = null; karhutla = null (KA 6)", async () => {
  const id = await kej(KO, {mulai: "2026-08-02", nama: "Banjir dampak"}), id2 = await kej(KO, {mulai: "2026-08-02", kab4: "3202", nama: "Banjir kosong"}), kh = await kej(KO, {jenis: "karhutla", mulai: "2026-08-02", kab4: "3203", nama: "Karhutla dampak"});
  for (const [kode, sumber, m] of [["d1", "dibi", 5], ["d2", "logbook", 9]]) assert.equal((await ING(dasar({aksi: "tambah", kejadian_id: id, sumber, kode, mulai: "2026-08-02", dampak: {meninggal: {n: m, y: "resmi", t: "2026"}}}))).s, 200);
  assert.equal((await ING(dasar({aksi: "tambah", kejadian_id: kh, kode: "kh1", mulai: "2026-08-02", dampak: {terdampak: {n: 100, y: "resmi", t: "2026"}}}))).s, 200);
  const l = await GET(KO, "/kejadian?dari=2026-08-02&sampai=2026-08-02"); assert.equal(l.s, 200, l.t);
  const by = Object.fromEntries(l.j.baris.map(b => [b.id, b]));
  assert.equal(by[id].dampak.sumber.dibi.meninggal.n, 5); assert.equal(by[id].dampak.sumber.logbook.meninggal.n, 9);
  const sel = by[id].dampak.selisih.find(x => x.metrik === "meninggal"); assert.equal(sel.selisih, 4); assert.ok(!JSON.stringify(by[id].dampak).includes("total"));
  assert.equal(by[id2].dampak, null); assert.equal(by[kh].dampak, null);
  const bp = await GET(BP, "/kejadian?dari=2026-08-02&sampai=2026-08-02"); assert.ok(bp.j.baris.every(b => "dampak" in b));
});

uji("rencana: kueri dampak banyak memakai indeks sk_ks_kej", async () => {
  const q = "EXPLAIN QUERY PLAN SELECT kejadian_id, sumber, kode, dampak FROM sk_kejadian_sumber WHERE kejadian_id IN (SELECT value FROM json_each(?)) AND status = 'terpasang' AND dampak IS NOT NULL ORDER BY sumber, kode LIMIT 1000";
  const d = (await DB.prepare(q).bind("[]").all()).results.map(r => r.detail).join(" | "); assert.match(d, /sk_ks_kej/, d);
});
