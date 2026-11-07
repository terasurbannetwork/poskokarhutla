/* Uji integrasi GET /api/dalops/banjir (src/dalops.js) lewat Worker + D1 + R2 sungguhan di Miniflare, migrasi apa adanya; tanpa mock.
   Gerbang: tanpa sesi 401, peran lain 401, peran koordalops/pusdalops/admin 200 dengan cache privat, berkas R2 belum ada 404. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "e".repeat(64), TOK_LUAR = "f".repeat(64);
let mf, DB, R2;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-dalops"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  R2 = await mf.getR2Bucket("MEDIA");
  for (const [id, un, tok, peran] of [["k1k1k1k1k1k1k1k1", "koordalopsa", TOK, '["koordalops"]'], ["k2k2k2k2k2k2k2k2", "verifa", TOK_LUAR, '["verifikator"]']])
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, "2000" + id.slice(1, 2) + "000", un + "@b.id", "62812000000" + id.slice(1, 2) + "0", peran),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const call = async h => { const r = await mf.dispatchFetch("http://dalops.lokal/api/dalops/banjir", {headers: h});
  return {status: r.status, cc: r.headers.get("cache-control"), vary: r.headers.get("vary"), diperbarui: r.headers.get("x-diperbarui"), j: await r.json().catch(() => null)}; };
const STAF = {cookie: "sesi_staf=" + TOK}, LUAR = {cookie: "sesi_staf=" + TOK_LUAR}, ADMIN = {"x-admin-token": "rahasia-admin"};

test("berkas R2 belum diunggah: staf sah dapat 404 berpesan, bukan 500", async () => {
  const r = await call(STAF);
  assert.equal(r.status, 404); assert.match(JSON.stringify(r.j), /dalops_banjir\.py/);
});

test("tanpa sesi dan peran lain ditolak; koordalops dan admin dapat isi R2 apa adanya dengan cache privat", async () => {
  const isi = {v: 1, hari: "2026-11-01", sumber: "Logbook Pusdalops BNPB", kejadian: [{id: "LB26-03782", kab_kode: ["11|Kota Subulussalam"], surut: false}]};
  await R2.put("dalops/banjir.json", JSON.stringify(isi));
  assert.equal((await call({})).status, 401);
  assert.equal((await call(LUAR)).status, 401, "verifikator tidak berhak");
  for (const h of [STAF, ADMIN]) {
    const r = await call(h);
    assert.equal(r.status, 200); assert.deepEqual(r.j, isi);
    assert.equal(r.cc, "private, no-store"); assert.match(r.vary, /cookie/i); assert.ok(Date.parse(r.diperbarui));
  }
});

test("longsor dan karhutla (pemilik 5 Nov 2026): satu rute per jenis, kunci R2 terpisah, gerbang staf sama, tidak bocor antarjenis", async () => {
  const jenis = j => mf.dispatchFetch("http://dalops.lokal/api/dalops/" + j, {headers: STAF}).then(async r => ({status: r.status, j: await r.json().catch(() => null)}));
  assert.equal((await jenis("longsor")).status, 404, "longsor belum diunggah = 404, bukan isi banjir");
  const ls = {v: 1, hari: "2026-11-04", kejadian: [{id: "WA26-110403", kab_kode: ["11|Gayo Lues"], surut: false}]};
  await R2.put("dalops/longsor.json", JSON.stringify(ls));
  assert.deepEqual((await jenis("longsor")).j, ls);
  assert.equal((await jenis("karhutla")).status, 404);
  assert.equal((await mf.dispatchFetch("http://dalops.lokal/api/dalops/karhutla", {headers: LUAR})).status, 401, "verifikator tidak berhak");
  assert.equal((await mf.dispatchFetch("http://dalops.lokal/api/dalops/gempa", {headers: STAF})).status, 404, "jenis lain tidak punya rute");
});

test("RU-109: akun gerbang AKUN_SITUS* ditolak 401 tanpa badan data di ketiga jenis; staf sah dan moderator tetap 200", async () => {
  /* Miniflare kedua: hanya ini yang membawa AKUN_SITUS_UJI, supaya opsi suite lain tidak berubah */
  const m2 = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-dalops-gerbang"}, r2Buckets: ["MEDIA"],
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", AKUN_SITUS_UJI: "gerbang@x:sandi"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  try {
    const d2 = await m2.getD1Database("DB"); await d2.batch(pecah(migrasi()).map(s => d2.prepare(s)));
    const r2 = await m2.getR2Bucket("MEDIA");
    await d2.batch([d2.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES ('k1k1k1k1k1k1k1k1', 'koordalopsa', 'Nama', '20001234', 'Unit', 'k@b.id', '628120000000', '["koordalops"]', '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`),
      d2.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, 'k1k1k1k1k1k1k1k1', 1, ?)").bind(sha(TOK), Date.now() + 3600e3)]);
    for (const j of ["banjir", "longsor", "karhutla"]) {
      await r2.put(`dalops/${j}.json`, JSON.stringify({v: 1, kejadian: [{id: "RAHASIA-" + j}]}));
      const url = "http://dalops.lokal/api/dalops/" + j;
      const g = await m2.dispatchFetch(url, {headers: {"x-admin-token": "gerbang@x:sandi"}});
      const teks = await g.text();
      assert.equal(g.status, 401, `akun gerbang harus 401 di ${j}, dapat ${g.status}`);
      assert.ok(!teks.includes("RAHASIA"), `badan 401 ${j} membocorkan data staf`);
      assert.equal((await m2.dispatchFetch(url, {headers: STAF})).status, 200, "staf sah " + j);
      assert.equal((await m2.dispatchFetch(url, {headers: ADMIN})).status, 200, "moderator " + j);
    }
  } finally { await m2.dispose(); }
});

test("/bnpb/dalops.html dialihkan ke jalur bersih /bnpb/dalops", async () => {
  const r = await mf.dispatchFetch("http://dalops.lokal/bnpb/dalops.html", {redirect: "manual"});
  assert.equal(r.status, 301); assert.equal(r.headers.get("location"), "/bnpb/dalops");
});
