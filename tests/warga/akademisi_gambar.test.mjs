/* Uji integrasi GET /api/akademisi/gambar/:kunci (src/akademisi.js): Worker + R2 sungguhan di Miniflare. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

let mf, R2;
const K = "0123456789abcdef0123456789abcdef";
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-gambar"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  const DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  R2 = await mf.getR2Bucket("MEDIA");
  await R2.put(`akademisi/gambar/${K}.png`, new Uint8Array([137, 80, 78, 71]));
  await R2.put(`akademisi/gambar/${K}.svg`, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  await R2.put("akademisi/gambar/abcdef0123456789.html", "<script>x</script>");
});
after(() => mf?.dispose());
const ADMIN = {"x-admin-token": "rahasia-admin"};
const get = j => mf.dispatchFetch("http://akademisi.lokal/api/akademisi/gambar/" + j, {headers: ADMIN});

test("gambar: 401 tanpa sesi", async () => {
  assert.equal((await mf.dispatchFetch(`http://akademisi.lokal/api/akademisi/gambar/${K}.png`)).status, 401);
});
test("gambar: kunci tak valid dan tak ada = 404", async () => {
  for (const k of ["sampul%2Fx.png", "sampul/x.png", "..%2F..%2Fx.png", "../x.png", K.toUpperCase() + ".png", "abcdef0123456789.html", "abc.png", K + ".exe", K]) assert.equal((await get(k)).status, 404, k);
  assert.equal((await get("ffffffffffffffff.png")).status, 404);
});
test("gambar: 200 dengan content-type, nosniff, cache; svg membawa CSP", async () => {
  const r = await get(K + ".png");
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/png"); assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("cache-control"), "private, max-age=604800, immutable"); assert.equal((await r.arrayBuffer()).byteLength, 4);
  const s = await get(K + ".svg");
  assert.equal(s.status, 200); assert.equal(s.headers.get("content-type"), "image/svg+xml");
  assert.equal(s.headers.get("content-security-policy"), "default-src 'none'; style-src 'unsafe-inline'"); assert.equal(s.headers.get("x-content-type-options"), "nosniff");
});

test("CSRF: POST bercookie sesi_staf tanpa Origin ditolak 403 (tolakOrigin)", async () => {
  const r = await mf.dispatchFetch("http://akademisi.lokal/api/akademisi/koreksi", {method: "POST", headers: {cookie: "sesi_staf=" + "a".repeat(64), "x-pb": "1", "content-type": "application/json"}, body: "{}"});
  assert.equal(r.status, 403);
});
