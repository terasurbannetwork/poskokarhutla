/* Paritas bencana PB-28: GET /api/pb/papan-sk (src/pb_ringkas.js, src/hak.js papanSk) di workerd (Miniflare) dengan D1 sungguhan.
   Dibuktikan: hak baca (tamu 403), sisa_hari pada batas hari, akan_berakhir pada 7 hari, tmt_selesai kosong = tanpa_tanggal_selesai, SK provinsi mengalahkan kabupaten,
   SK kedaluwarsa dan belum mulai tidak muncul, tanpa kolom oleh/tautan, filter wilayah staf, kueri SEARCH, tanpa tabel = tersedia:false.
   Jalankan: node --test tests/warga/pb_papan_sk.test.mjs */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import "../../src/worker.js";   // dahulu: impor sirkular
import {siapkan, berantai, MOD2, ADMIN, sha256} from "./_bnpb.mjs";
import {migrasi} from "./_bantu.mjs";
import {PB_SQL_PAPAN_SK} from "../../src/hak.js";

const uji = berantai();
const {DB, api} = await siapkan("uji-pb-papansk", {ikat: {PB_TANPA_CACHE: "1"}});
const hari = d => new Date(Date.now() + 7 * 36e5 + d * 864e5).toISOString().slice(0, 10);
const id = c => c.repeat(16);
const kej = (i, jenis, prov, kab) => DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, status, terakhir, dibuat, diubah) VALUES (?,?,?,?,?, 'buka', 1, 1, 1)").bind(i, jenis, prov, kab, hari(-9)).run();
const sk = (i, kid, tingkat, wil, nomor, mulai, selesai, ke = 0) => DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tgl_sk, tmt_mulai, tmt_selesai, perpanjangan_ke, tautan, oleh, dibuat) VALUES (?,?,?,?,?,?,?,?,?, 'https://x.id/a', 'staf:rahasia', 1)")
  .bind(i, kid, tingkat, wil, nomor, mulai, mulai, selesai, ke).run();
const papan = (q = "", h = MOD2) => api("GET", "/api/pb/papan-sk" + q, undefined, h);

uji("tamu 403; bencana dan prov ngawur 400", async () => {
  assert.equal((await papan("", {})).s, 403);
  assert.equal((await papan("?bencana=xyz")).s, 400);
  assert.equal((await papan("?prov=../")).s, 400);
});

uji("sisa_hari, sinyal, SK provinsi mengalahkan kabupaten, kedaluwarsa dan belum mulai tersingkir, tanpa oleh dan tautan", async () => {
  await kej(id("1"), "banjir", "32", "Kota Bandung"); await kej(id("2"), "karhutla", "14", "Rokan Hilir"); await kej(id("3"), "banjir", "33", "Cilacap"); await kej(id("4"), "longsor", "32", "Garut");
  await sk(id("a"), id("1"), "siaga", "kab", "SK-KAB-1", hari(-8), hari(30));          // kalah dari SK prov di kejadian yang sama
  await sk(id("b"), id("1"), "tanggap", "prov", "SK-PROV-1", hari(-8), hari(7));        // tepat 7 hari: akan_berakhir
  await sk(id("c"), id("2"), "siaga", "kab", "SK-NULL", hari(-8), null);                // tanpa tanggal selesai
  await sk(id("d"), id("3"), "siaga", "kab", "SK-8", hari(-8), hari(8));               // 8 hari: belum sinyal
  await sk(id("e"), id("4"), "siaga", "kab", "SK-LALU", hari(-20), hari(-1));          // sudah berakhir kemarin
  await sk(id("f"), id("4"), "siaga", "kab", "SK-NANTI", hari(1), hari(9));            // belum mulai
  const r = await papan(); assert.equal(r.s, 200, r.t);
  const per = Object.fromEntries(r.j.sk.map(x => [x.nomor, x]));
  assert.deepEqual(Object.keys(per).sort(), ["SK-8", "SK-NULL", "SK-PROV-1"]);
  assert.equal(per["SK-PROV-1"].sisa_hari, 7); assert.equal(per["SK-PROV-1"].sinyal, "akan_berakhir"); assert.equal(per["SK-PROV-1"].bencana, "banjir");
  assert.equal(per["SK-NULL"].sisa_hari, null); assert.equal(per["SK-NULL"].sinyal, "tanpa_tanggal_selesai");
  assert.equal(per["SK-8"].sisa_hari, 8); assert.equal(per["SK-8"].sinyal, null);
  assert.ok(!/rahasia|https:|"oleh"/.test(r.t), "tanpa pembuat dan tautan");
  assert.equal(r.j.tanggal, hari(0));
});

uji("hari ini = sisa 0 masih berlaku; filter bencana dan prov", async () => {
  await kej(id("5"), "kekeringan", "35", "Tuban"); await sk(id("g"), id("5"), "siaga", "kab", "SK-HARIINI", hari(-3), hari(0));
  const x = (await papan("?bencana=kekeringan")).j.sk; assert.equal(x.length, 1); assert.equal(x[0].sisa_hari, 0); assert.equal(x[0].sinyal, "akan_berakhir");
  assert.deepEqual((await papan("?prov=14")).j.sk.map(s => s.nomor), ["SK-NULL"]);
});

uji("staf berwilayah hanya melihat provinsinya; luar wilayah 403", async () => {
  const tok = "9".repeat(64);
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, 'pbpapan', 'Staf', '920099', 'Pusdalops', 'p@b.id', '628120000099', '["pusdalops"]', '["32"]', ?, ?, 0, 1, 'tes', 0)`).bind("pp" + "0".repeat(14), "b".repeat(32), "a".repeat(64)).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), "pp" + "0".repeat(14), Date.now() + 3600e3).run();
  const h = {cookie: "sesi_staf=" + tok, "x-pb": "1"};
  const r = await papan("", h); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.sk.map(s => s.nomor), ["SK-PROV-1"]);
  assert.equal((await papan("?prov=14", h)).s, 403);
});

uji("kueri papan SEARCH, bukan SCAN logbook_sk tanpa indeks", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  const p = db.prepare("EXPLAIN QUERY PLAN " + PB_SQL_PAPAN_SK).all().map(r => r.detail).filter(d => /^SCAN (logbook_sk|k\b|logbook_kejadian)/.test(d));
  assert.deepEqual(p, []);
});

uji("tanpa tabel logbook_sk (0094 belum jalan): tersedia:false", async () => {
  const U = await siapkan("uji-pb-papansk-lama", {sampai: "0094_"});
  const d = await U.api("GET", "/api/pb/papan-sk", undefined, MOD2);
  assert.equal(d.s, 200, d.t); assert.equal(d.j.tersedia, false);
});

const stafDi = async (U, nama, wil) => {
  const tok = (nama === "satu" ? "5" : "6").repeat(64), sid = "st" + nama.padEnd(14, "0");
  await U.DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, 'Staf', ?, 'Pusdalops', ?, ?, '["pusdalops"]', ?, ?, ?, 0, 1, 'tes', 0)`).bind(sid, "pb" + nama, "93" + wil.join("") + nama.length, nama + "@b.id", "6281300" + wil.join("") + nama.length, JSON.stringify(wil), "b".repeat(32), "a".repeat(64)).run();
  await U.DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(tok), sid, Date.now() + 3600e3).run();
  return {cookie: "sesi_staf=" + tok, "x-pb": "1"};
};

uji("cache isolate nyata: staf 32, pemirsa nasional, staf 14 dalam 5 menit, tiap respons hanya wilayahnya", async () => {
  const U = await siapkan("uji-pb-papansk-cache");   // tanpa PB_TANPA_CACHE
  const k = (i, prov, kab) => U.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, status, terakhir, dibuat, diubah) VALUES (?, 'banjir', ?, ?, ?, 'buka', 1, 1, 1)").bind(i, prov, kab, hari(-9)).run();
  const s = (i, kid, nomor) => U.DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tmt_mulai, tmt_selesai, perpanjangan_ke, dibuat) VALUES (?, ?, 'siaga', 'kab', ?, ?, ?, 0, 1)").bind(i, kid, nomor, hari(-5), hari(20)).run();
  await k(id("1"), "32", "Bandung"); await k(id("2"), "14", "Siak"); await s(id("a"), id("1"), "SK-32"); await s(id("b"), id("2"), "SK-14");
  const nomor = async h => { const r = await U.api("GET", "/api/pb/papan-sk", undefined, h); assert.equal(r.s, 200, r.t); return r.j.sk.map(x => x.nomor).sort(); };
  const h32 = await stafDi(U, "satu", ["32"]), h14 = await stafDi(U, "dua", ["14"]);
  const buat = await U.api("POST", "/api/pemirsa/admin/buat", {nama: "Dir Dalops", tab: ["pusdalops"]}, ADMIN); assert.equal(buat.s, 201, buat.t);
  const m = await U.mf.dispatchFetch("https://centurisk97.id/admin/masuk", {method: "POST", redirect: "manual", headers: {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id"}, body: new URLSearchParams({email: buat.j.username, sandi: buat.j.sandi}).toString()});
  const hP = {cookie: m.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0]};
  assert.deepEqual(await nomor(h32), ["SK-32"]);
  assert.deepEqual(await nomor(hP), ["SK-14", "SK-32"]);
  assert.deepEqual(await nomor(h14), ["SK-14"]);
  await U.DB.prepare("DELETE FROM logbook_sk").run();   // bukti cache: jawaban ke-4 masih dari isolate
  assert.deepEqual(await nomor(h32), ["SK-32"]);
});

uji("SK tanpa tmt_selesai tidak memakan kuota 500 sebelum SK bertanggal", async () => {
  const U = await siapkan("uji-pb-papansk-kuota", {ikat: {PB_TANPA_CACHE: "1"}});
  await U.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, status, terakhir, dibuat, diubah) VALUES (?, 'banjir', '36', 'Lebak', ?, 'buka', 1, 1, 1)").bind(id("7"), hari(-9)).run();
  await U.DB.prepare("INSERT INTO logbook_kejadian (id, jenis, prov, kab, mulai, status, terakhir, dibuat, diubah) VALUES (?, 'banjir', '36', 'Pandeglang', ?, 'buka', 1, 1, 1)").bind(id("8"), hari(-9)).run();
  await U.DB.batch(Array.from({length: 500}, (_, i) => U.DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tmt_mulai, tmt_selesai, perpanjangan_ke, dibuat) VALUES (?, ?, 'siaga', 'kab', ?, ?, NULL, 0, 1)").bind(String(i).padStart(16, "0"), id("7"), "N" + i, hari(-5))));
  await U.DB.prepare("INSERT INTO logbook_sk (id, kejadian_id, tingkat, wilayah, nomor, tmt_mulai, tmt_selesai, perpanjangan_ke, dibuat) VALUES (?, ?, 'siaga', 'kab', 'BERTANGGAL', ?, ?, 0, 1)").bind(id("d"), id("8"), hari(-5), hari(3)).run();
  const r = await U.api("GET", "/api/pb/papan-sk", undefined, MOD2);
  assert.equal(r.j.sk[0].nomor, "BERTANGGAL");
  assert.ok(r.j.terpotong);
});
