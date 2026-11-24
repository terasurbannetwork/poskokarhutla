/* LJ-11: antrean lj_kabar lewat gateway (GET /api/lapor/kabar, POST .../l<id>/terkirim) dan bersih-bersih menit 17. worker.js utuh di workerd, D1 sungguhan.
   Jalan: node --test tests/lapor/lanjut_kabar.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "../warga/_bnpb.mjs";
import "../../src/worker.js";
import {bersihkanLapor} from "../../src/lapor_ai.js";

const uji = berantai();
const U = await siapkan("uji-lanjut-kabar", {ikat: {WA_MESIN: "mesin-rahasia"}}), {api, DB} = U;
const MESIN = {authorization: "Bearer mesin-rahasia"}, kini = Date.now(), HARI = 864e5;
const WA = "6281299882001", TOKEN = "TOKEN-TAUTAN-MENTAH-123";
const tambah = (jenis, dibuat, terkirim = null, teks = `halo ${TOKEN}`) => DB.prepare("INSERT INTO lj_kabar (wa, jenis, teks, dibuat, terkirim) VALUES (?, ?, ?, ?, ?)").bind(WA, jenis, teks, dibuat, terkirim).run().then(r => r.meta.last_row_id);
const baris = id => DB.prepare("SELECT * FROM lj_kabar WHERE id = ?").bind(id).first();

uji("GET kabar tanpa kunci mesin 403", async () => {
  assert.equal((await api("GET", "/api/lapor/kabar")).s, 403);
  assert.equal((await api("POST", "/api/lapor/kabar/l1/terkirim")).s, 403);
});

uji("GET kabar memuat lj_kabar berawalan l bersama lapor_kabar, tanpa bentrok awalan b", async () => {
  const a = await tambah("pembuka", kini), b = await tambah("tim", kini);
  await DB.prepare("INSERT INTO lapor_kabar (wa, nomor, jenis, teks, dibuat) VALUES (?, 'LA-261123-01', 'pdf', 'PDF siap', ?)").bind(WA, kini).run();
  await DB.prepare("INSERT INTO lapor_kabar_bpbd (wa, teks, dibuat) VALUES (?, 'kabar bpbd', ?)").bind(WA, kini).run().catch(() => {});
  const r = await api("GET", "/api/lapor/kabar", undefined, MESIN); assert.equal(r.s, 200);
  const l = r.j.kabar.filter(x => String(x.id).startsWith("l"));
  assert.deepEqual(l.map(x => [x.id, x.jenis, x.wa, x.url, x.nomor]), [[`l${a}`, "pembuka", WA, null, null], [`l${b}`, "tim", WA, null, null]]);
  assert.match(l[0].teks, new RegExp(TOKEN));
  assert.ok(r.j.kabar.some(x => typeof x.id === "number"), "lapor_kabar tetap ikut");
});

uji("tandai l<id>: teks jadi penanda, terkirim terisi; kedua kali 404; id l tak ada 404; awalan b tak terpengaruh", async () => {
  const id = (await DB.prepare("SELECT min(id) id FROM lj_kabar").first()).id;
  const r = await api("POST", `/api/lapor/kabar/l${id}/terkirim`, undefined, MESIN); assert.equal(r.s, 200);
  const b = await baris(id); assert.equal(b.teks, "-"); assert.ok(b.terkirim > 0); assert.ok(!b.teks.includes(TOKEN));
  assert.equal((await api("POST", `/api/lapor/kabar/l${id}/terkirim`, undefined, MESIN)).s, 404);
  assert.equal((await api("POST", "/api/lapor/kabar/l999999/terkirim", undefined, MESIN)).s, 404);
  assert.equal((await api("POST", `/api/lapor/kabar/b${id}/terkirim`, undefined, MESIN)).s, 404, "b diarahkan ke lapor_kabar_bpbd, bukan lj_kabar");
  assert.equal((await baris(id + 1)).terkirim, null, "baris lain utuh");
  const g = await api("GET", "/api/lapor/kabar", undefined, MESIN);
  assert.ok(!g.j.kabar.some(x => x.id === `l${id}`), "yang terkirim tidak muncul lagi");
});

uji("bersih: pembuka dan tim belum terkirim >1 hari dihapus, yang baru tidak; harian belum terkirim dihapus sesudah 7 hari; terkirim >30 hari dihapus, 5 hari tidak", async () => {
  const lama = await tambah("pembuka", kini - 2 * HARI), baru = await tambah("pembuka", kini - 3600e3),
    harianLama = await tambah("harian", kini - 2 * HARI), timLama = await tambah("tim", kini - 2 * HARI), harianMacet = await tambah("harian", kini - 8 * HARI), kirimLama = await tambah("tim", kini - 40 * HARI, kini - 40 * HARI, "-"), kirimBaru = await tambah("tim", kini - 6 * HARI, kini - 5 * HARI, "-");
  await bersihkanLapor({DB}, kini);
  for (const id of [lama, timLama, harianMacet, kirimLama]) assert.equal(await baris(id), null, `baris ${id} harus terhapus`);
  for (const id of [baru, harianLama, kirimBaru]) assert.ok(await baris(id), `baris ${id} harus tetap`);
});

uji("EXPLAIN: antrean dan bersih memakai indeks lj_kabar_antre", async () => {
  const ex = async q => (await DB.prepare("EXPLAIN QUERY PLAN " + q).all()).results.map(r => r.detail).join(" | ");
  assert.match(await ex("SELECT id, wa, jenis, teks FROM lj_kabar WHERE terkirim IS NULL ORDER BY id LIMIT 20"), /lj_kabar_antre/);
  assert.match(await ex("DELETE FROM lj_kabar WHERE (terkirim IS NULL AND (dibuat < 3 OR (jenis IN ('pembuka', 'tim') AND dibuat < 1))) OR terkirim < 2"), /lj_kabar_antre/);
});
