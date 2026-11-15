/* Paritas bencana PB-12 (src/pb_isian.js renlap, src/hak.js pbRenlap*, migrasi 0130) di workerd (Miniflare) dengan D1 dan R2 sungguhan.
   Dibuktikan: minta (versi, jendela 30 menit, tanggal, laju 6/jam), callback HMAC mengikat isi berkas (salah, basi, badan diganti, status acak, id tak dikenal, mundur),
   kunci prototipe ditolak, nomor HP dan NIK di berkas 422, R2 tulis sekali,
   terbit, hak baca berkas (pemirsa dan tamu ditolak, header), tanpa migrasi 503, kueri baca SEARCH.
   PB-14: pemicu workflow (tanpa token picu:false) dan GET /api/pb/titik/mesin (HMAC).
   Jalankan: node --test tests/warga/pb_renlap.test.mjs */
import assert from "node:assert/strict";
import {createHmac, createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {siapkan, berantai, MOD2, GERBANG, ADMIN} from "./_bnpb.mjs";
import {migrasi} from "./_bantu.mjs";
import {PB_SQL_RENLAP} from "../../src/hak.js";
import "../../src/worker.js";
import {badanDispatch} from "../../src/pb_isian.js";   // sesudah worker.js: impor sirkular

const uji = berantai(), KUNCI = "kunci-renlap-uji";
const REG = JSON.stringify({pesisir: {operasi: true, renlap: {sarana: ["tenda"]}}});
const {DB, mf, api, n} = await siapkan("uji-pb-renlap", {r2: true, ikat: {PB_REGISTRI: REG, RENLAP_KUNCI: KUNCI}});
const R2 = await mf.getR2Bucket("MEDIA");
const hari = (d = 0) => new Date(Date.now() + 7 * 36e5 - d * 864e5).toISOString().slice(0, 10);
const R = (o = {}) => ({bencana: "pesisir", prov: "32", kab: "3273", tanggal: hari(), ...o});
const minta = (b, h = MOD2) => api("POST", "/api/pb/renlap", b, h);
/* pesan HMAC = id|waktu|status|fmt:sha256,... (urut abjad); sama dengan ringkasBerkas di src/pb_isian.js */
const ringkas = (isi = {}) => Object.keys(isi).sort().map(f => `${f}:${typeof isi[f] === "string" ? createHash("sha256").update(isi[f]).digest("hex") : "-"}`).join(",");
const tanda = (kunci, id, waktu, status, isi) => createHmac("sha256", kunci).update(`${id}|${waktu}|${status}|${ringkas(isi)}`).digest("hex");
const mesin = (b, {kunci = KUNCI, waktu = Math.floor(Date.now() / 1000), status = b.status, id = b.id, isi = b.berkas} = {}) =>
  api("POST", "/api/pb/renlap/selesai", b, {"x-renlap-waktu": String(waktu), "x-renlap-kunci": tanda(kunci, id, waktu, status, isi)});
const JSONR = JSON.stringify({target: []});
let a, b;

uji("minta: tamu dan akun gerbang 403 sebelum body; bencana tak aktif 404; tanggal sah 7 hari ke belakang, depan 400", async () => {
  for (const h of [{}, GERBANG]) assert.equal((await minta(R(), h)).s, 403);
  assert.equal((await minta(R({bencana: "banjir"}))).s, 404);
  assert.equal((await minta(R({tanggal: hari(-1)}))).s, 400);
  assert.equal((await minta(R({tanggal: hari(8)}))).s, 400);
  assert.equal((await minta(R({kab: "../x"}))).s, 400);
  assert.equal((await minta(R({prov: "../"}))).s, 400);
  assert.equal(await n("pb_renlap"), 0);
  const r = await minta(R({tanggal: hari(7)})); assert.equal(r.s, 201, r.t);
});

uji("minta: versi 1, diminta kedua dalam 30 menit 409; dua bersamaan tidak membuat versi ganda", async () => {
  const r = await minta(R()); assert.equal(r.s, 201, r.t); a = r.j; assert.equal(a.versi, 1); assert.equal(a.status, "diminta");
  assert.equal((await minta(R())).s, 409);
  const [x, y] = await Promise.all([minta(R({kab: "3204"})), minta(R({kab: "3204"}))]);
  assert.deepEqual([x.s, y.s].sort(), [201, 409]);
  assert.equal(await n("pb_renlap", "kab = '3204'"), 1);
  assert.equal(await n("pb_log", "tabel = 'pb_renlap' AND aksi = 'minta'"), 3);
});

uji("callback: HMAC salah, waktu basi, tanpa header, id tak dikenal = 403 sama; status acak 400; json belum ada 409", async () => {
  const body = {id: a.id, status: "draf", berkas: {json: JSONR}};
  assert.equal((await mesin(body, {kunci: "salah"})).s, 403);
  assert.equal((await mesin(body, {waktu: Math.floor(Date.now() / 1000) - 400})).s, 403);
  assert.equal((await api("POST", "/api/pb/renlap/selesai", body, {})).s, 403);
  assert.equal((await mesin({...body, id: "0".repeat(16)})).s, 403);
  assert.equal((await mesin({id: a.id, status: "terbit"})).s, 400);          // HMAC sah tapi status bukan draf/gagal
  assert.equal((await mesin({id: a.id, status: "draf", berkas: {pdf: "x"}})).s, 400);
  assert.equal((await mesin({id: a.id, status: "draf"})).s, 409);             // json belum ada di R2
  assert.equal((await mesin(body, {isi: {json: "{}"}})).s, 403);               // tanda tangan untuk isi lain: badan diganti ditolak
  assert.equal((await mesin({id: a.id, status: "draf", berkas: {constructor: "x"}})).s, 400);   // kunci prototipe bukan format
  assert.equal((await mesin({id: a.id, status: "draf", berkas: {json: JSONR, txt: "hubungi 081234567890"}})).s, 422);
  assert.equal((await mesin({id: a.id, status: "draf", berkas: {json: JSON.stringify({nik: "3273012345678901"})}})).s, 422);
  assert.equal((await DB.prepare("SELECT status FROM pb_renlap WHERE id = ?").bind(a.id).first()).status, "diminta");
});

uji("callback sah: draf, berkas ditulis ke R2 sekali (tidak menimpa), mundur ditolak", async () => {
  const r = await mesin({id: a.id, status: "draf", jml_target: 12, berkas: {json: JSONR, txt: "halo"}}); assert.equal(r.s, 200, r.t);
  const kunci = `operasi/renlap/pesisir/${hari()}/32-3273/v1/renlap.json`;
  assert.equal(await (await R2.get(kunci)).text(), JSONR);
  assert.equal((await mesin({id: a.id, status: "draf", berkas: {json: "{}"}})).s, 409);   // sudah draf
  assert.equal((await mesin({id: a.id, status: "gagal"})).s, 409);
  assert.equal(await (await R2.get(kunci)).text(), JSONR);
  assert.equal(await R2.put(kunci, "{}", {onlyIf: {etagDoesNotMatch: "*"}}), null);       // put kedua pada kunci sama gagal
  const gagalR = (await minta(R({kab: "3204", tanggal: hari(1)}))).j;
  assert.equal((await mesin({id: gagalR.id, status: "gagal", galat: "mesin macet"})).s, 200);
  assert.equal((await DB.prepare("SELECT galat FROM pb_renlap WHERE id = ?").bind(gagalR.id).first()).galat, "mesin macet");
});

uji("versi berikutnya 2 setelah draf; terbit berlaku 14 hari, tak dapat diulang; selesai-tandai hanya dari terbit", async () => {
  const v2 = await minta(R()); assert.equal(v2.s, 201); assert.equal(v2.j.versi, 2); b = v2.j;
  assert.equal((await api("POST", "/api/pb/renlap/terbit", {id: b.id}, MOD2)).s, 409);       // masih diminta
  assert.equal((await api("POST", "/api/pb/renlap/terbit", {id: a.id}, {})).s, 403);
  assert.equal((await api("POST", "/api/pb/renlap/terbit", {id: a.id}, GERBANG)).s, 403);
  assert.equal((await api("POST", "/api/pb/renlap/terbit", {id: "0".repeat(16)}, MOD2)).s, 404);
  const t = await api("POST", "/api/pb/renlap/terbit", {id: a.id}, MOD2); assert.equal(t.s, 200, t.t);
  const row = await DB.prepare("SELECT berlaku_sampai, diubah FROM pb_renlap WHERE id = ?").bind(a.id).first();
  assert.ok(Math.abs(row.berlaku_sampai - row.diubah - 14 * 864e5) < 1000);
  assert.equal((await api("POST", "/api/pb/renlap/terbit", {id: a.id}, MOD2)).s, 409);
  assert.equal((await mesin({id: a.id, status: "draf"})).s, 409);                             // terbit ke draf ditolak
  assert.equal((await api("POST", "/api/pb/renlap/selesai-tandai", {id: a.id}, MOD2)).s, 200);
  assert.equal((await api("POST", "/api/pb/renlap/selesai-tandai", {id: a.id}, MOD2)).s, 409);
});

uji("laju: ketujuh dalam sejam 429", async () => {
  const sisa = 6 - await n("pb_log", "aksi = 'minta'");
  for (let i = 0; i < sisa; i++) assert.equal((await minta(R({kab: "3205", tanggal: hari(i)}))).s, 201);
  assert.equal((await minta(R({kab: "3206"}))).s, 429);
});

uji("daftar dan berkas: hak baca, header, tamu ditolak", async () => {
  const d = await api("GET", `/api/pb/renlap?bencana=pesisir&prov=32&dari=${hari(7)}&sampai=${hari()}`, undefined, MOD2);
  assert.equal(d.s, 200); assert.equal(d.j.tersedia, true); assert.ok(d.j.renlap.length >= 3);
  assert.ok(!("oleh" in d.j.renlap[0]));
  assert.equal((await api("GET", "/api/pb/renlap?bencana=pesisir&prov=32", undefined, {})).s, 403);
  assert.equal((await api("GET", "/api/pb/renlap?bencana=pesisir&dari=2026-01-01&sampai=2026-12-31", undefined, MOD2)).s, 400);
  const f = await api("GET", `/api/pb/renlap/berkas?id=${a.id}&fmt=json`, undefined, MOD2);
  assert.equal(f.s, 200); assert.equal(f.t, JSONR);
  assert.equal(f.h.get("cache-control"), "private, no-store"); assert.equal(f.h.get("x-content-type-options"), "nosniff");
  assert.equal(f.h.get("content-security-policy"), "sandbox"); assert.match(f.h.get("content-disposition"), /^attachment/);
  assert.equal((await api("GET", `/api/pb/renlap/berkas?id=${a.id}&fmt=json`, undefined, {})).s, 403);
  assert.equal((await api("GET", `/api/pb/renlap/berkas?id=${a.id}&fmt=exe`, undefined, MOD2)).s, 400);
  assert.equal((await api("GET", `/api/pb/renlap/berkas?id=${a.id}&fmt=constructor`, undefined, MOD2)).s, 400);
  assert.equal((await api("GET", `/api/pb/renlap/berkas?id=${"0".repeat(16)}&fmt=json`, undefined, {})).s, 403);   // tamu: id tak ada pun 403
  const buat = await api("POST", "/api/pemirsa/admin/buat", {nama: "Dir Dalops", tab: ["pusdalops"]}, ADMIN); assert.equal(buat.s, 201, buat.t);
  const m = await mf.dispatchFetch("https://centurisk97.id/admin/masuk", {method: "POST", redirect: "manual", headers: {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id"}, body: new URLSearchParams({email: buat.j.username, sandi: buat.j.sandi}).toString()});
  const PEMIRSA = {cookie: m.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa=")).split(";")[0]};
  assert.equal((await api("GET", `/api/pb/renlap?bencana=pesisir&prov=32&dari=${hari(7)}&sampai=${hari()}`, undefined, PEMIRSA)).s, 200);   // pemirsa melihat daftar
  assert.equal((await api("GET", `/api/pb/renlap/berkas?id=${a.id}&fmt=json`, undefined, PEMIRSA)).s, 403);                                // tapi tidak mengunduh
  assert.equal((await api("GET", `/api/pb/renlap/berkas?id=${a.id}&fmt=pdf`, undefined, MOD2)).s, 404);   // tak ada di R2
  assert.equal((await api("GET", `/api/pb/renlap/berkas?id=${b.id}&fmt=json`, undefined, MOD2)).s, 409); // belum siap
});

uji("kueri baca renlap SEARCH, bukan SCAN", () => {
  const db = new DatabaseSync(":memory:"); db.exec(migrasi());
  for (const sql of [PB_SQL_RENLAP.daftar, PB_SQL_RENLAP.satu, PB_SQL_RENLAP.lajuMinta]) {
    const p = db.prepare("EXPLAIN QUERY PLAN " + sql).all().map(r => r.detail).filter(d => /^SCAN pb_/.test(d));
    assert.deepEqual(p, [], sql.slice(0, 60));
  }
});

uji("tanpa migrasi 0130: minta dan callback 503, daftar tersedia:false", async () => {
  const U = await siapkan("uji-pb-renlap-lama", {r2: true, sampai: "0130_", ikat: {PB_REGISTRI: REG, RENLAP_KUNCI: KUNCI}});
  assert.equal((await U.api("POST", "/api/pb/renlap", R(), MOD2)).s, 503);
  const w = Math.floor(Date.now() / 1000), id = "1".repeat(16);
  assert.equal((await U.api("POST", "/api/pb/renlap/selesai", {id, status: "gagal"}, {"x-renlap-waktu": String(w), "x-renlap-kunci": tanda(KUNCI, id, w, "gagal")})).s, 503);
  const d = await U.api("GET", "/api/pb/renlap?bencana=pesisir&prov=32", undefined, MOD2);
  assert.equal(d.s, 200); assert.equal(d.j.tersedia, false);
});

uji("PB-14: minta tanpa GITHUB_TOKEN picu:false; badan dispatch semua string", async () => {
  assert.equal(a.picu, false); assert.match(a.pesan, /belum disambungkan/);   // a = respons minta pertama (laju 6/jam sudah habis di sini)
  const d = badanDispatch({id: "a".repeat(16), bencana: "pesisir", prov: "32", kab: null, tanggal: hari()}, 3);
  assert.equal(d.ref, "main"); assert.equal(d.inputs.versi, "3"); assert.equal(d.inputs.kab, "");
  assert.ok(Object.values(d.inputs).every(v => typeof v === "string"));
});

uji("PB-14: titik/mesin HMAC sah 200 tanpa oleh; salah, basi, tanpa header 403 seragam", async () => {
  await DB.prepare("INSERT INTO pb_titik (id, golongan, jenis, bencana, prov, kab, nama, lat, lon, status, oleh, dibuat, diubah) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind("b".repeat(16), "sarana", "tenda", "pesisir", "32", "3273", "Tenda uji", -6.9, 107.6, "siap", "staf:x", 1, 1).run();
  const jalur = "/api/pb/titik/mesin?bencana=pesisir&prov=32&kab=3273", w = Math.floor(Date.now() / 1000);
  const h = (kunci = KUNCI, waktu = w, kab = "3273") => ({"x-renlap-waktu": String(waktu), "x-renlap-kunci": createHmac("sha256", kunci).update(`titik|${waktu}|pesisir|32|${kab}`).digest("hex")});
  const ok = await api("GET", jalur, undefined, h()); assert.equal(ok.s, 200, ok.t);
  assert.equal(ok.j.titik.length, 1); assert.ok(!("oleh" in ok.j.titik[0]));
  assert.equal((await api("GET", jalur, undefined, h("salah"))).s, 403);
  assert.equal((await api("GET", jalur, undefined, h(KUNCI, w - 400))).s, 403);
  assert.equal((await api("GET", jalur, undefined, h(KUNCI, w, ""))).s, 403);   // tanda untuk wilayah lain
  assert.equal((await api("GET", jalur, undefined, {})).s, 403);
  const hx = (b, p, k) => ({"x-renlap-waktu": String(w), "x-renlap-kunci": createHmac("sha256", KUNCI).update(`titik|${w}|${b}|${p}|${k}`).digest("hex")});
  assert.equal((await api("GET", "/api/pb/titik/mesin?bencana=pesisir&prov=99&kab=", undefined, hx("pesisir", "99", ""))).s, 400);     // prov tak sah sesudah tanda sah
  assert.equal((await api("GET", "/api/pb/titik/mesin?bencana=pesisir&prov=32&kab=3300", undefined, hx("pesisir", "32", "3300"))).s, 400);
  assert.equal((await api("GET", "/api/pb/titik/mesin?bencana=xyz&prov=32&kab=", undefined, hx("xyz", "32", ""))).s, 404);
  assert.equal((await api("POST", jalur, {}, h())).s, 405);
});
