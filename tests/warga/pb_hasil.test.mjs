/* Paritas bencana PB-16 (src/pb_isian.js POST /api/pb/hasil, GET /api/pb/kepatuhan; src/hak.js pbStmtHasil, pbKepatuhan) di workerd (Miniflare) dengan D1 sungguhan.
   Dibuktikan: hak tulis (tamu, gerbang), hasil hanya untuk renlap terbit/selesai, upsert, validasi daftar tetap, batas target_no, kepatuhan dan per_alasan tanpa pengisi,
   kueri baca SEARCH, tanpa migrasi 0130 = 503 / tersedia:false.
   Jalankan: node --test tests/warga/pb_hasil.test.mjs */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import "../../src/worker.js";   // dahulu: impor sirkular
import {siapkan, berantai, MOD2, GERBANG} from "./_bnpb.mjs";
import {migrasi} from "./_bantu.mjs";
import {PB_SQL_HASIL} from "../../src/hak.js";

const uji = berantai();
const REG = JSON.stringify({pesisir: {operasi: true, renlap: {sarana: ["tenda"]}}});
const {DB, api, n} = await siapkan("uji-pb-hasil", {ikat: {PB_REGISTRI: REG}});
const hari = (d = 0) => new Date(Date.now() + 7 * 36e5 - d * 864e5).toISOString().slice(0, 10);
const baris = (id, status, kab, jml, versi = 1, prov = "32") => DB.prepare("INSERT INTO pb_renlap (id, bencana, prov, kab, tanggal, versi, status, jml_target, oleh, dibuat, diubah) VALUES (?,?,?,?,?,?,?,?,?,1,1)")
  .bind(id, "pesisir", prov, kab, hari(), versi, status, jml, "staf:x").run();
const T = "a".repeat(16), D = "b".repeat(16), S = "c".repeat(16), LAIN = "d".repeat(16);
const kirim = (b, h = MOD2) => api("POST", "/api/pb/hasil", b, h);
const kep = (q = "", h = MOD2) => api("GET", `/api/pb/kepatuhan?bencana=pesisir&prov=32${q}`, undefined, h);

uji("hasil: tamu dan gerbang 403 sebelum body; id tak dikenal 404; draf dan diminta 409", async () => {
  await baris(T, "terbit", "3273", 5); await baris(D, "draf", "3273", 5, 2); await baris(S, "selesai", "3204", 3); await baris(LAIN, "terbit", "3171", 2, 1, "31");
  for (const h of [{}, GERBANG]) assert.equal((await kirim({renlap_id: T, butir: []}, h)).s, 403);
  assert.equal((await kirim({id: "0".repeat(16), butir: [{target_no: 1, didatangi: 1}]})).s, 404);
  assert.equal((await kirim({id: D, butir: [{target_no: 1, didatangi: 1}]})).s, 409);
  assert.equal(await n("pb_renlap_hasil"), 0);
});

uji("hasil: validasi daftar tetap, batas target_no, kembar, alasan hanya bila tidak didatangi", async () => {
  const b = x => kirim({id: T, butir: [x]});
  for (const x of [{target_no: 0, didatangi: 1}, {target_no: 6, didatangi: 1}, {target_no: 1.5}, {target_no: 1, didatangi: "ya"}, {target_no: 1, didatangi: 0, alasan: "bosan"},
    {target_no: 1, didatangi: 1, alasan: "cuaca"}, {target_no: 1, didatangi: 1, hasil: "mantap"}, {target_no: 1, didatangi: 1, catatan: "hubungi 081234567890"}, null, {target_no: 1, didatangi: 1, alasan: "constructor"}])
    assert.equal((await b(x)).s, 400, JSON.stringify(x));
  assert.equal((await kirim({id: T, butir: []})).s, 400);
  assert.equal((await kirim({id: T, butir: Array.from({length: 101}, (_, i) => ({target_no: 1 + i % 5, didatangi: 1}))})).s, 400);
  assert.equal((await kirim({id: T, butir: [{target_no: 1, didatangi: 1}, {target_no: 1, didatangi: 0}]})).s, 400);
  assert.equal(await n("pb_renlap_hasil"), 0);
});

uji("hasil: upsert menimpa baris yang sama, log hanya jumlah, tanpa kolom oleh di keluaran", async () => {
  const r = await kirim({id: T, butir: [{target_no: 1, didatangi: 1, hasil: "selesai"}, {target_no: 2, didatangi: 0, alasan: "cuaca", catatan: "ombak tinggi"}, {target_no: 3, didatangi: 0, alasan: "akses_terputus"}]});
  assert.equal(r.s, 200, r.t); assert.equal(r.j.butir, 3);
  assert.equal((await kirim({id: T, butir: [{target_no: 3, didatangi: 1, hasil: "sebagian"}]})).s, 200);
  assert.equal(await n("pb_renlap_hasil", `renlap_id = '${T}'`), 3);
  assert.equal((await DB.prepare("SELECT didatangi, alasan FROM pb_renlap_hasil WHERE renlap_id = ? AND target_no = 3").bind(T).first()).alasan, null);
  const l = await DB.prepare("SELECT sesudah FROM pb_log WHERE tabel = 'pb_renlap_hasil' ORDER BY id LIMIT 1").first();
  assert.deepEqual(JSON.parse(l.sesudah), {butir: 3, didatangi: 1});
  assert.equal((await kirim({id: S, butir: [{target_no: 1, didatangi: 0, alasan: "sudah_aman"}]})).s, 200);   // selesai juga boleh
});

uji("kepatuhan: hitung dari terbit/selesai saja, persen dan per_alasan, tanpa pengisi; prov lain terpisah", async () => {
  const k = await kep(`&dari=${hari(1)}&sampai=${hari()}`); assert.equal(k.s, 200, k.t);
  assert.deepEqual(k.j, {tersedia: true, renlap: 2, target: 8, didatangi: 2, belum_diisi: 4, persen: 25, per_alasan: {cuaca: 1, sudah_aman: 1}});   // draf D tidak dihitung
  assert.ok(!JSON.stringify(k.j).includes("staf"));
  const p31 = await api("GET", `/api/pb/kepatuhan?bencana=pesisir&prov=31&dari=${hari(1)}&sampai=${hari()}`, undefined, MOD2);
  assert.equal(p31.j.renlap, 1); assert.equal(p31.j.persen, 0);
  const kosong = await api("GET", `/api/pb/kepatuhan?bencana=pesisir&prov=12&dari=${hari(1)}&sampai=${hari()}`, undefined, MOD2);
  assert.equal(kosong.j.persen, null);
});

uji("hasil: 100 butir sukses; kepatuhan hanya versi terbit terbaru per tanggal", async () => {
  const V = "e".repeat(16), V2 = "f".repeat(16);
  await baris(V, "terbit", "3205", 100); await baris(V2, "terbit", "3205", 100, 2);
  const r = await kirim({id: V, butir: Array.from({length: 100}, (_, i) => ({target_no: 1 + i, didatangi: 1}))}); assert.equal(r.s, 200, r.t);
  const k = await api("GET", `/api/pb/kepatuhan?bencana=pesisir&prov=32&dari=${hari()}&sampai=${hari()}`, undefined, MOD2);
  assert.equal(k.j.renlap, 3); assert.equal(k.j.target, 108); assert.equal(k.j.didatangi, 2);   // V (versi 1) tak dihitung; V2 terbaru, tanpa hasil
  await DB.prepare("UPDATE pb_renlap SET status = 'draf' WHERE id = ?").bind(V2).run();
  const k2 = await api("GET", `/api/pb/kepatuhan?bencana=pesisir&prov=32&dari=${hari()}&sampai=${hari()}`, undefined, MOD2);
  assert.equal(k2.j.didatangi, 102); assert.equal(k2.j.belum_diisi, 4);   // V2 draf: V kembali terbaru yang terbit
  await DB.prepare("UPDATE pb_renlap SET status = 'terbit' WHERE id = ?").bind(V2).run();
});

uji("kepatuhan: hak baca, bencana, rentang", async () => {
  assert.equal((await kep("", {})).s, 403);
  assert.equal((await api("GET", "/api/pb/kepatuhan?bencana=longsor&prov=32", undefined, MOD2)).s, 404);
  assert.equal((await kep("&dari=2026-01-01&sampai=2026-12-31")).s, 400);
  assert.equal((await kep("&dari=bukan")).s, 400);
  assert.equal((await kep(`&dari=${hari(32)}&sampai=${hari()}`)).s, 400);   // 32 hari
  assert.equal((await kep(`&dari=${hari(31)}&sampai=${hari()}`)).s, 200);
  assert.equal((await api("GET", "/api/pb/kepatuhan?bencana=pesisir&prov=../", undefined, MOD2)).s, 400);
});

uji("kueri kepatuhan SEARCH, bukan SCAN", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  for (const sql of [PB_SQL_HASIL.renlap, PB_SQL_HASIL.rinci]) {
    const p = db.prepare("EXPLAIN QUERY PLAN " + sql).all().map(r => r.detail).filter(d => /^SCAN (pb_|h\b|r\b)/.test(d));
    assert.deepEqual(p, [], sql.slice(0, 60));
  }
});

uji("tanpa migrasi 0130: hasil 503, kepatuhan tersedia:false", async () => {
  const U = await siapkan("uji-pb-hasil-lama", {sampai: "0130_", ikat: {PB_REGISTRI: REG}});
  assert.equal((await U.api("POST", "/api/pb/hasil", {id: T, butir: [{target_no: 1, didatangi: 1}]}, MOD2)).s, 503);
  const d = await U.api("GET", "/api/pb/kepatuhan?bencana=pesisir&prov=32", undefined, MOD2);
  assert.equal(d.s, 200); assert.equal(d.j.tersedia, false);
});
