/* Keterpaduan KP-06: GET /api/siklus/kejadian/tautan (juga /api/instansi/siklus/...). T4 (BP kab A tidak melihat KJ kab B), staf melihat semua, tamu 401, 51 pasang 400, sumber asing 400, ambigu + kandidat, EXPLAIN memakai UNIQUE.
   worker.js utuh di Miniflare + D1 sungguhan. Jalankan: node --test tests/warga/kejadian_tautan_baca.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16} from "./_siklus.mjs";

const U = await mulai("uji-kejadian-tautan-baca");
const {DB, api, SA, TAMU, GET} = U, T = Date.now();
const pasang = (sumber, kode, o = {}) => DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, kejadian_id, status, jenis, kab4, mulai, kandidat, diambil, dibuat, diubah, dummy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
  .bind(id16(), sumber, kode, o.kj ?? null, o.status ?? "terpasang", "banjir", o.kab4 ?? null, "2026-03-02", o.kandidat ? JSON.stringify(o.kandidat) : null, T, T, T, o.dummy ?? 0).run();

const A = await U.bp({kab: "Bogor"}), B = await U.bp({kab: "Bandung"}), staf = await U.staf("Pimpinan Uji", ["pimpinan"]);
const kjA = await U.kej(SA, {kab4: "3201"}), kjB = await U.kej(SA, {kab4: "3204"});
await pasang("tugas_api", "t-a", {kj: kjA, kab4: "3201"});
await pasang("tugas_api", "t-b", {kj: kjB, kab4: "3204"});
await pasang("logbook_d1", "l-amb", {status: "ambigu", kab4: "3201", kandidat: [kjA, kjB]});
await pasang("lapangan", "p-nol", {status: "tanpa_wilayah"});
await pasang("sippa", "s-dummy", {kj: kjA, kab4: "3201", dummy: 1});
const q = (a, ...k) => GET(a, "/kejadian/tautan?" + k.map(x => "k=" + encodeURIComponent(x)).join("&"));
const per = r => Object.fromEntries(r.j.tautan.map(x => [x.kode, x]));

uji("tamu 401; 51 pasang 400; sumber asing 400; tanpa parameter 400", async () => {
  assert.equal((await q(TAMU, "tugas_api:t-a")).s, 401);
  assert.equal((await q(SA, ...Array.from({length: 51}, (_, i) => "tugas_api:x" + i))).s, 400);
  assert.equal((await q(SA, ...Array.from({length: 50}, (_, i) => "tugas_api:x" + i))).s, 200);
  assert.equal((await q(SA, "orang:abc")).s, 400);
  assert.equal((await GET(SA, "/kejadian/tautan")).s, 400);
  assert.equal((await GET(SA, "/kejadian/tautan?sumber=tugas_api&kode=t-a")).j.tautan[0].kejadian_id, kjA, "bentuk sumber= kode=");
});

uji("staf melihat semua status; baris tak ada = belum; dummy tak terlihat staf nyata", async () => {
  const r = await q(staf, "tugas_api:t-a", "tugas_api:t-b", "logbook_d1:l-amb", "lapangan:p-nol", "sippa:s-dummy", "gempa_d1:tidak-ada"), p = per(r);
  assert.equal(r.s, 200, r.t);
  assert.deepEqual([p["t-a"].status, p["t-a"].kejadian_id], ["terpasang", kjA]);
  assert.equal(p["t-b"].kejadian_id, kjB);
  assert.equal(p["l-amb"].status, "ambigu"); assert.deepEqual(p["l-amb"].kandidat.sort(), [kjA, kjB].sort());
  assert.equal(p["p-nol"].status, "tanpa_wilayah");
  assert.equal(p["tidak-ada"].status, "belum");
  assert.equal(p["s-dummy"].status, "belum", "dummy disembunyikan dari staf nyata");
  assert.equal(per(await q(SA, "sippa:s-dummy"))["s-dummy"].status, "terpasang", "SA boleh melihat dummy");
});

uji("T4: BP kab A hanya melihat KJ kab A; kab B = belum tanpa kejadian_id; kandidat disaring", async () => {
  const a = per(await q(A, "tugas_api:t-a", "tugas_api:t-b", "logbook_d1:l-amb", "lapangan:p-nol"));
  assert.equal(a["t-a"].kejadian_id, kjA);
  assert.deepEqual(a["t-b"], {sumber: "tugas_api", kode: "t-b", status: "belum", kejadian_id: null, kandidat: null}, "sama dengan baris tak ada");
  assert.deepEqual(a["l-amb"].kandidat, [kjA], "kandidat kab B tidak bocor");
  assert.equal(a["p-nol"].status, "belum", "tanpa wilayah bukan milik BP mana pun");
  const b = per(await q(B, "tugas_api:t-a", "tugas_api:t-b"));
  assert.equal(b["t-a"].kejadian_id, null); assert.equal(b["t-b"].kejadian_id, kjB);
  assert.equal(JSON.stringify(a).includes(kjB), false);
});

uji("kueri per pasangan memakai indeks UNIQUE (sumber, kode, dummy)", async () => {
  const r = await DB.prepare("EXPLAIN QUERY PLAN SELECT sumber, kode, kejadian_id, status, kab4, kandidat FROM sk_kejadian_sumber WHERE sumber = ? AND kode = ? AND dummy IN (0, ?) ORDER BY dummy LIMIT 1").bind("tugas_api", "t-a", 1).all();
  const rencana = r.results.map(x => x.detail).join(" | ");
  assert.match(rencana, /USING (COVERING )?INDEX sqlite_autoindex_sk_kejadian_sumber/, rencana); assert.doesNotMatch(rencana, /SCAN sk_kejadian_sumber/);
});
