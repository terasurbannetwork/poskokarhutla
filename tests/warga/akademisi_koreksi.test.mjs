/* Uji integrasi POST/GET /api/akademisi/koreksi dan GET /api/akademisi/saya (src/akademisi.js): Worker + R2 + D1 sungguhan di Miniflare. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

const sha = s => createHash("sha256").update(s).digest("hex");
const TOKEN_STAF = "a".repeat(64);
let mf, R2, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-koreksi"}, r2Buckets: ["MEDIA"],
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin,admin-biasa", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12)},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  R2 = await mf.getR2Bucket("MEDIA");
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES ('s1s1s1s1s1s1s1s1', 'anipusdalops', 'Ani', '12345', 'Unit', 'a@b.id', '628123456789', '["pusdalops"]', '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, 's1s1s1s1s1s1s1s1', 1, ?)").bind(sha(TOKEN_STAF), Date.now() + 3600e3).run();
});
after(() => mf?.dispose());

const ADMIN = {"x-admin-token": "rahasia-admin"}, BIASA = {"x-admin-token": "admin-biasa"}, STAF = {cookie: "sesi_staf=" + TOKEN_STAF, "x-pb": "1"};
const call = async (m, j, h = ADMIN, b) => { const r = await mf.dispatchFetch("http://akademisi.lokal" + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b === undefined ? undefined : typeof b === "string" ? b : JSON.stringify(b)}); return {status: r.status, j: await r.json().catch(() => null)}; };
const ok = {jenis: "pakar", id: "A12_x-1", butir: "email", isi: "Email lama, sudah pindah <b>kampus</b>", sumber_url: "https://kampus.ac.id/staf"};

test("saya: 401 tanpa sesi; super admin, admin biasa, dan staf bersesi dibedakan", async () => {
  assert.equal((await call("GET", "/api/akademisi/saya", {})).status, 401);
  assert.deepEqual((await call("GET", "/api/akademisi/saya", ADMIN)).j, {peran: ["admin"], super: true});
  assert.deepEqual((await call("GET", "/api/akademisi/saya", BIASA)).j, {peran: ["admin"], super: false});
  assert.deepEqual((await call("GET", "/api/akademisi/saya", STAF)).j, {peran: ["pusdalops"], super: false});
});

test("koreksi: 401, 400 input salah, 413 body besar, 403 origin asing", async () => {
  assert.equal((await call("POST", "/api/akademisi/koreksi", {}, ok)).status, 401);
  for (const x of [{jenis: "nyasar"}, {id: "a b"}, {id: "x".repeat(81)}, {id: ""}, {butir: ""}, {butir: "y".repeat(41)}, {isi: ""}, {isi: "  "}, {isi: "z".repeat(1001)}, {isi: 5},
    {sumber_url: "javascript:alert(1)"}, {sumber_url: "bukan url"}, {sumber_url: 5}]) assert.equal((await call("POST", "/api/akademisi/koreksi", ADMIN, {...ok, ...x})).status, 400, JSON.stringify(x).slice(0, 50));
  assert.equal((await call("POST", "/api/akademisi/koreksi", ADMIN, "bukan json")).status, 400);
  assert.equal((await call("POST", "/api/akademisi/koreksi", ADMIN, {...ok, isi: "q".repeat(3000)})).status, 413);
  assert.equal((await call("POST", "/api/akademisi/koreksi", {...ADMIN, origin: "https://jahat.example", cookie: "sesi_admin=abc"}, ok)).status, 403);
  assert.equal((await R2.list({prefix: "akademisi/koreksi/"})).objects.length, 0, "tidak ada yang tersimpan dari permintaan ditolak");
});

test("koreksi: staf menyimpan, admin melihat di antrean (tanpa < >); staf biasa dan tanpa sesi ditolak GET", async () => {
  const a = await call("POST", "/api/akademisi/koreksi", STAF, ok); assert.equal(a.status, 201, JSON.stringify(a.j));
  const b = await call("POST", "/api/akademisi/koreksi", ADMIN, {jenis: "lembaga", id: "L1", butir: "web", isi: "Alamat web baru"}); assert.equal(b.status, 201);
  const l = await call("GET", "/api/akademisi/koreksi", ADMIN); assert.equal(l.status, 200); assert.equal(l.j.koreksi.length, 2);
  const k = l.j.koreksi.find(x => x.uuid === a.j.uuid);
  assert.equal(k.jenis, "pakar"); assert.equal(k.id, "A12_x-1"); assert.equal(k.oleh, "staf:s1s1s1s1s1s1s1s1"); assert.equal(k.sumber_url, "https://kampus.ac.id/staf"); assert.ok(!/[<>]/.test(k.isi), k.isi);
  assert.equal(l.j.koreksi.find(x => x.uuid === b.j.uuid).sumber_url, null);
  assert.match((await R2.list({prefix: "akademisi/koreksi/"})).objects[0].key, /^akademisi\/koreksi\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.json$/);
  assert.equal((await call("GET", "/api/akademisi/koreksi", STAF)).status, 403);
  assert.equal((await call("GET", "/api/akademisi/koreksi", {})).status, 403);
});

test("koreksi: kiriman ke-21 per staf dalam sejam = 429, staf lain tidak terkena", async () => {
  // staf s1 sudah 1 kiriman; 19 lagi lolos, ke-21 ditolak
  for (let i = 0; i < 19; i++) assert.equal((await call("POST", "/api/akademisi/koreksi", STAF, ok)).status, 201, String(i));
  const t = await call("POST", "/api/akademisi/koreksi", STAF, ok); assert.equal(t.status, 429, JSON.stringify(t.j));
  assert.equal((await call("POST", "/api/akademisi/koreksi", ADMIN, ok)).status, 201);
});
