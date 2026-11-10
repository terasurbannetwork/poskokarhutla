/* Siklus Bencana: rute ingest pipeline (Bearer PIPA_TOKEN), SK-022. UJ-F1-13, UJ-KP-06. worker.js utuh di Miniflare + D1 sungguhan.
   Jalankan: node --test tests/warga/siklus_ingest.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16} from "./_siklus.mjs";
import {idKejadian, kunciPendiri} from "../../src/siklus_hitung.js";

const U = await mulai("uji-sk-ingest");
const {DB, api, n, kej} = U;
const KO = await U.staf("Ko Uji", ["koordalops"]);
const TOK = {authorization: "Bearer token-pipa-uji"};
const ING = "/api/siklus/ingest/";
const GET = (j, h = TOK) => api("GET", ING + j, undefined, h), POST = (b, h = TOK) => api("POST", ING + "kejadian", b, h);
const satu = (sql, ...b) => DB.prepare(sql).bind(...b).first();
const item = (o = {}) => ({sumber: "dibi", kode: "dibi|3201|2026-03-02", aksi: "baru", jenis: "banjir", kab4: "3201", mulai: "2026-03-02", nama: "Banjir Kabupaten Bogor", diambil: 1_780_000_000_000, dampak: {meninggal: {n: 12, y: "resmi", t: "2026"}}, ...o});

uji("UJ-KP-06: tanpa Bearer 401, Bearer salah 401, cookie sesi 400 (walau Bearer benar), PIPA_TOKEN kosong 503; GET dan POST sama", async () => {
  for (const [m, j, b] of [["GET", "jendela?dari=2026-03-01&sampai=2026-03-02"], ["GET", "sumber?dari=2026-03-01&sampai=2026-03-02"], ["POST", "kejadian", {keputusan: [item()]}]]) {
    assert.equal((await api(m, ING + j, b, {})).s, 401, `${m} ${j} tanpa token`);
    assert.equal((await api(m, ING + j, b, {authorization: "Bearer salah"})).s, 401);
    assert.equal((await api(m, ING + j, b, {"x-admin-token": "rahasia-admin"})).s, 401, "token admin bukan token pipeline");
    assert.equal((await api(m, ING + j, b, {...TOK, cookie: KO.h.cookie})).s, 400, "cookie sesi pada ingest");
    assert.equal((await api(m, ING + j, b, {...TOK, cookie: "sesi_admin=" + "a".repeat(64)})).s, 400);
  }
  const M = await mulai("uji-sk-ingest-503", {ikat: {PIPA_TOKEN: ""}});
  assert.equal((await M.api("GET", ING + "jendela?dari=2026-03-01&sampai=2026-03-02", undefined, TOK)).s, 503);
  assert.equal(await n("sk_kejadian"), 0, "penolakan tidak menulis");
});

uji("UJ-F1-13: ingest/kejadian: baru membuat kejadian + kab + sumber + satu jejak sistem:ingest; ID dari hash; id tabrakan menghash ulang termasuk dalam satu batch", async () => {
  const r = await POST({keputusan: [item(), item({kode: "logbook|3201|2026-03-02", sumber: "logbook"})]}); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j, {terpasang: 2, baru: 2, antre: 0, duplikat: 0});
  const ids = (await DB.prepare("SELECT id FROM sk_kejadian ORDER BY id").all()).results.map(x => x.id);
  assert.deepEqual(ids, ["KJ-2026-8N57ZZ0Y", "KJ-2026-9A2WGN3G"], "vektor acuan: hash dan hash|2");
  assert.equal(ids[1], await idKejadian(kunciPendiri("banjir", "3201", "2026-03-02")));
  const k = await satu("SELECT * FROM sk_kejadian WHERE id = 'KJ-2026-9A2WGN3G'"); assert.equal(k.fase, "terdeteksi"); assert.equal(k.asal, "otomatis"); assert.equal(k.dummy, 0); assert.equal(k.oleh, "sistem:ingest"); assert.equal(k.prov, "32");
  assert.equal(await n("sk_kejadian_kab"), 2); const s = await satu("SELECT * FROM sk_kejadian_sumber WHERE kode = 'dibi|3201|2026-03-02'"); assert.equal(s.status, "terpasang"); assert.equal(s.kejadian_id, "KJ-2026-9A2WGN3G"); assert.equal(JSON.parse(s.dampak).meninggal.n, 12);
  assert.equal(await n("sk_jejak"), 1, "satu jejak per batch"); const j = await satu("SELECT * FROM sk_jejak"); assert.equal(j.oleh, "sistem:ingest"); assert.equal(j.obyek, "ingest"); assert.equal(j.dummy, 0);
});
uji("UJ-F1-13: kiriman sama dua kali = duplikat, nol baris baru, dampak tidak ditimpa (ON CONFLICT DO NOTHING)", async () => {
  const sebelum = [await n("sk_kejadian"), await n("sk_kejadian_sumber"), await n("sk_kejadian_kab"), await n("sk_jejak")];
  const r = await POST({keputusan: [item({dampak: {meninggal: {n: 999, y: "resmi", t: "2026"}}})]}); assert.equal(r.s, 200); assert.deepEqual(r.j, {terpasang: 0, baru: 0, antre: 0, duplikat: 1});
  assert.deepEqual([await n("sk_kejadian"), await n("sk_kejadian_sumber"), await n("sk_kejadian_kab"), await n("sk_jejak")], sebelum, "tak ada baris baru, jejak pun tidak");
  assert.equal(JSON.parse((await satu("SELECT dampak FROM sk_kejadian_sumber WHERE kode = 'dibi|3201|2026-03-02'")).dampak).meninggal.n, 12);
  const dalam = await POST({keputusan: [item({kode: "x1", mulai: "2026-04-01"}), item({kode: "x1", mulai: "2026-04-01"})]}); assert.deepEqual(dalam.j, {terpasang: 1, baru: 1, antre: 0, duplikat: 1}, "duplikat dalam satu batch");
});
uji("ingest: tambah ke kejadian yang ada, ambigu dan tanpa_wilayah masuk antrean; sumber berbeda dengan kode sama tidak bentrok", async () => {
  const id = "KJ-2026-9A2WGN3G", lain = (await kej(KO, {nama: "Kandidat lain", kab4: "3202", mulai: "2026-05-01"}));
  const r = await POST({keputusan: [item({aksi: "tambah", sumber: "usgs", kode: "us1", kejadian_id: id, kab4: "3202", dampak: null}), item({aksi: "ambigu", sumber: "gdacs", kode: "g1", kandidat: [id, lain], kab4: null}), item({aksi: "tanpa_wilayah", sumber: "dibi", kode: "tw1", kab4: "3201", jenis: "gempa"}),
    item({sumber: "logbook", kode: "dibi|3201|2026-03-02", aksi: "tambah", kejadian_id: id})]});
  assert.equal(r.s, 200, r.t); assert.deepEqual(r.j, {terpasang: 2, baru: 0, antre: 2, duplikat: 0});
  assert.deepEqual((await DB.prepare("SELECT kab4 FROM sk_kejadian_kab WHERE kejadian_id = ? ORDER BY kab4").bind(id).all()).results.map(x => x.kab4), ["3201", "3202"], "tambah menambah kab4 ke kejadian multi-kabupaten");
  const am = await satu("SELECT status, kejadian_id, kandidat FROM sk_kejadian_sumber WHERE kode = 'g1'"); assert.equal(am.status, "ambigu"); assert.equal(am.kejadian_id, null); assert.deepEqual(JSON.parse(am.kandidat), [id, lain]);
  const tw = await satu("SELECT status, kab4 FROM sk_kejadian_sumber WHERE kode = 'tw1'"); assert.deepEqual({...tw}, {status: "tanpa_wilayah", kab4: null});
  assert.equal(await n("sk_kejadian_sumber", "kode = 'dibi|3201|2026-03-02'"), 2, "(sumber, kode) unik, bukan kode saja");
});
uji("UJ-F1-13: batch 201 ditolak 413; kosong, bukan larik, item liar, dummy, dan referensi tak ada ditolak 400 tanpa menulis apa pun", async () => {
  const sebelum = [await n("sk_kejadian"), await n("sk_kejadian_sumber"), await n("sk_jejak")];
  const banyak = Array.from({length: 201}, (_, i) => item({kode: "b" + i})); assert.equal((await POST({keputusan: banyak})).s, 413);
  assert.equal((await POST({keputusan: banyak.slice(0, 200).map(x => ({...x, sumber: "ngawur!"}))})).s, 400, "200 diterima ukurannya tetapi item liar ditolak");
  const salah = [[], "x", null, [item({dummy: 1})], [item({dummy: true})], [5], [item({aksi: "hapus"})], [item({sumber: "A!"})], [item({kode: ""})], [item({kode: "k\u0000"})], [item({kode: "x".repeat(121)})], [item({jenis: "ngawur"})], [item({jenis: "longsor+banjir"})],
    [item({kab4: "9999"})], [item({kab4: null})], [item({mulai: "2026-02-30"})], [item({diambil: -1})], [item({diambil: "kemarin"})], [item({nama: "ab"})], [item({nama: undefined})], [item({dampak: "teks"})], [item({dampak: {total: {n: 5}}})],
    [item({dampak: {jumlah_gabungan: {n: 5}}})], [item({dampak: {meninggal: {n: "dua"}}})], [item({dampak: {meninggal: {n: 1, y: "pasti"}}})], [item({dampak: {Meninggal: {n: 1}}})], [item({dampak: Object.fromEntries(Array.from({length: 31}, (_, i) => ["k" + i, {n: 1}]))})],
    [item({dampak: {meninggal: {n: 1, t: "x".repeat(17)}}})], [item({aksi: "tambah", kode: "t0"})], [item({aksi: "tambah", kode: "t1", kejadian_id: "KJ-2026-ZZZZZZZZ"})], [item({aksi: "tambah", kode: "t2", kejadian_id: "bukan"})], [item({aksi: "ambigu", kandidat: []})], [item({aksi: "ambigu", kandidat: ["bukan"]})],
    [item({aksi: "ambigu", kandidat: Array.from({length: 31}, () => "KJ-2026-9A2WGN3G")})], [item({kode_hari: "x".repeat(17)})], [item({pengenal_luar: "y".repeat(121)})]];
  for (const k of salah) { const r = await POST({keputusan: k}); assert.equal(r.s, 400, JSON.stringify(k).slice(0, 90) + " -> " + r.t); }
  assert.equal((await POST({keputusan: [item({kode: "oke"}), item({kode: "liar", jenis: "ngawur"})]})).s, 400); assert.match((await POST({keputusan: [item({kode: "oke"}), item({kode: "liar", jenis: "ngawur"})]})).t, /keputusan\[1\]/);
  assert.equal((await api("POST", ING + "kejadian", "{bukan", TOK)).s, 400);
  assert.equal((await api("POST", ING + "kejadian", {keputusan: [item({nama: "x".repeat(300000)})]}, TOK)).s, 413);
  assert.deepEqual([await n("sk_kejadian"), await n("sk_kejadian_sumber"), await n("sk_jejak")], sebelum);
  const mati = await kej(KO, {nama: "Akan dibatalkan", kab4: "3203", mulai: "2026-06-01"}); await DB.prepare("UPDATE sk_kejadian SET fase = 'dibatalkan' WHERE id = ?").bind(mati).run();
  assert.equal((await POST({keputusan: [item({aksi: "tambah", kejadian_id: mati, kode: "ke-mati"})]})).s, 400, "kejadian dibatalkan tidak menerima sumber baru");
});
uji("UJ-F1-13: ingest/jendela dan ingest/sumber dipaginasi lewat lanjut tanpa baris hilang atau ganda; hanya dummy = 0; jendela <= 120 hari; ingest/kaji ada (SK-053)", async () => {
  await DB.prepare(`WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM c WHERE i < 1003)
    INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, mulai, diambil, dibuat, diubah, dummy) SELECT printf('%016x', i), 'uji_massal', 'k' || i, 'tanpa_wilayah', 'banjir', '2024-05-01', 1, 1, 1, 0 FROM c`).run();
  await DB.prepare(`WITH RECURSIVE c(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM c WHERE i < 1003)
    INSERT INTO sk_kejadian (id, jenis, nama, mulai, fase_diubah, asal, dibuat, diubah, oleh, dummy) SELECT printf('KJ-2024-%08d', i), 'banjir', 'Massal ' || i, '2024-05-01', 1, 'otomatis', 1, 1, 'x', 0 FROM c`).run();
  await DB.prepare("INSERT INTO sk_kejadian_sumber (id, sumber, kode, status, jenis, mulai, diambil, dibuat, diubah, dummy) VALUES (?, 'uji_massal', 'dummy1', 'tanpa_wilayah', 'banjir', '2024-05-01', 1, 1, 1, 1)").bind(id16()).run();
  for (const [j, total, kolomKunci] of [["sumber", 1003, ["id", "sumber", "kode", "kejadian_id", "status", "jenis", "kab4", "mulai"]], ["jendela", 1003, ["id", "jenis", "kab4", "mulai", "fase"]]]) {
    const semua = []; let lanjut = "", hal = 0;
    do { const r = await GET(`${j}?dari=2024-05-01&sampai=2024-05-01${lanjut}`); assert.equal(r.s, 200, r.t); assert.ok(r.j.baris.length <= 1000); semua.push(...r.j.baris); lanjut = r.j.lanjut ? "&lanjut=" + encodeURIComponent(r.j.lanjut) : ""; hal++; } while (lanjut && hal < 5);
    assert.equal(hal, 2, j); assert.equal(semua.length, total, `${j}: tak ada baris hilang`); assert.equal(new Set(semua.map(x => x.id)).size, total, `${j}: tak ada ganda`); assert.deepEqual(Object.keys(semua[0]), kolomKunci, "kolom minimal");
    assert.ok(!semua.some(x => x.kode === "dummy1"), "dummy tidak ikut");
  }
  for (const q of ["jendela", "jendela?dari=2024-05-01", "jendela?dari=2024-05-02&sampai=2024-05-01", "jendela?dari=2024-01-01&sampai=2024-05-02", "sumber?dari=x&sampai=y", "jendela?dari=2024-05-01&sampai=2024-05-01&lanjut=ngawur"]) assert.equal((await GET(q)).s, 400, q);
  assert.equal((await GET("jendela?dari=2024-01-01&sampai=2024-04-30")).s, 200, "tepat 120 hari sah"); assert.equal((await GET("jendela?dari=2024-01-01&sampai=2024-05-01")).s, 400, "121 hari");
  assert.equal((await api("POST", ING + "kaji", {}, TOK)).s, 400, "ingest/kaji ada sejak SK-053: badan kosong ditolak validasi");
});

uji("kab[]: ingest mengisi sk_kejadian_kab untuk semua kabupaten (baru dan tambah), kab4 tetap utama; >50, kode asing, bukan larik ditolak 400; tanpa duplikat", async () => {
  const r = await POST({keputusan: [item({kode: "kab-1", kab4: "3201", kab: ["3202", "3201", "3202", "3203"], mulai: "2026-07-01"})]}); assert.equal(r.s, 200, r.t); assert.equal(r.j.baru, 1);
  const id = (await DB.prepare("SELECT id, kab4 FROM sk_kejadian WHERE mulai = '2026-07-01'").first());
  assert.equal(id.kab4, "3201");
  assert.deepEqual((await DB.prepare("SELECT kab4, mulai FROM sk_kejadian_kab WHERE kejadian_id = ? ORDER BY kab4").bind(id.id).all()).results.map(x => x.kab4 + "|" + x.mulai), ["3201|2026-07-01", "3202|2026-07-01", "3203|2026-07-01"]);
  const t = await POST({keputusan: [item({kode: "kab-2", aksi: "tambah", kejadian_id: id.id, kab4: "3204", kab: ["3205"], mulai: "2026-07-01"})]}); assert.equal(t.s, 200, t.t);
  assert.equal(await n("sk_kejadian_kab", `kejadian_id = '${id.id}'`), 5);
  const semua = Object.keys((await import("../../src/siklus_kab.js")).NAMA_KAB4);
  for (const kab of [semua.slice(0, 51), ["9999"], "3201", [3201]]) assert.equal((await POST({keputusan: [item({kode: "kab-x", kab, mulai: "2026-07-02"})]})).s, 400, JSON.stringify(kab).slice(0, 30));
  assert.equal((await POST({keputusan: [item({kode: "kab-y", kab: semua.slice(0, 50), mulai: "2026-07-03"})]})).s, 200, "50 boleh");
});
