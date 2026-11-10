/* RU-109b: akun gerbang situs (AKUN_SITUS*) BUKAN staf BNPB (SIPPA keputusan 32). Rute Pusdalops berbasis staf
   (logbook, pusdalops_umum, wa_form, medsos_antre, sensor) memakai modAtauStaf: gerbang 403, ADMIN_TOKEN dan staf sah lolos. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "e".repeat(64), TOK_UDARA = "d".repeat(64);
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-gerbang-bukan-staf"}, r2Buckets: ["MEDIA"],
    bindings: {IP_SALT: "garam-uji", SESI_KUNCI: "kunci-sesi-uji", ADMIN_TOKEN: "rahasia-admin", AKUN_SITUS_UJI: "gerbang@x:sandi"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES ('k1k1k1k1k1k1k1k1', 'koordalopsa', 'Nama koordalopsa', '2000100', 'Unit', 'k@b.id', '628120000010', '["koordalops"]', '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, 'k1k1k1k1k1k1k1k1', 1, ?)").bind(sha(TOK), Date.now() + 3600e3),
    DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES ('u1u1u1u1u1u1u1u1', 'udaraa', 'Nama udaraa', '2000200', 'Unit', 'u@b.id', '628120000020', '["udara"]', '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, 'u1u1u1u1u1u1u1u1', 1, ?)").bind(sha(TOK_UDARA), Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

/* gerbang berdiri PERTAMA di tiap rute, jadi badan kosong cukup: 401/403 pasti dari gerbang, bukan validasi (validasi = 400) */
const RUTE = [["GET", "/api/logbook/hari"], ["POST", "/api/logbook/kejadian"], ["GET", "/api/pusdalops/rollcall"], ["GET", "/api/pusdalops/lapsus"], ["POST", "/api/pusdalops/lapsus"],
  ["GET", "/api/wa/form/terakhir"], ["POST", "/api/wa/form"], ["GET", "/api/pusdalops/medsos"], ["GET", "/api/pusdalops/medsos/jeda"], ["GET", "/api/sensor/status"]];
const kirim = (m, j, h) => mf.dispatchFetch("http://t.lokal" + j, {method: m, headers: m === "POST" ? {...h, "content-type": "application/json", origin: "http://t.lokal", "x-pb": "1"} : h, body: m === "POST" ? "{}" : undefined}).then(async r => ({s: r.status, t: await r.text()}));

for (const [m, j] of RUTE) test(`gerbang ditolak, staf sah dan ADMIN_TOKEN diterima: ${m} ${j}`, async () => {
  const g = await kirim(m, j, {"x-admin-token": "gerbang@x:sandi"});
  assert.ok([401, 403].includes(g.s), `akun gerbang harus ditolak di ${m} ${j}: ${g.s} ${g.t.slice(0, 80)}`);
  for (const [nama, h] of [["staf koordalops", {cookie: "sesi_staf=" + TOK}], ["ADMIN_TOKEN", {"x-admin-token": "rahasia-admin"}]]) {
    const r = await kirim(m, j, h);
    assert.ok(![401, 403].includes(r.s), `${nama} harus lolos gerbang di ${m} ${j}: ${r.s} ${r.t.slice(0, 80)}`);
  }
});

test("staf berperan salah (udara) ditolak 403 di /api/sensor/status", async () => {
  const r = await kirim("GET", "/api/sensor/status", {cookie: "sesi_staf=" + TOK_UDARA});
  assert.equal(r.s, 403, `peran udara bukan pusdalops/koordalops/pimpinan: ${r.s} ${r.t.slice(0, 80)}`);
});

/* tombol "Masuk staf" di layar 403: akun gerbang dulu dialihkan balik ke ?ke= dan layar berputar tanpa bisa ganti akun (9 Nov 2026).
   Tanpa ?ke= tetap 303: Admin.keMasuk (public/admin/bersama.js) memakai itu untuk membedakan "tak berhak" dari "belum masuk". */
const masuk = (j, token) => mf.dispatchFetch("http://t.lokal" + j, {redirect: "manual", headers: {"x-admin-token": token}});
test("GET /admin/masuk?ke=: akun gerbang dapat form, ADMIN_TOKEN dialihkan", async () => {
  const g = await masuk("/admin/masuk?ke=%2Fbnpb%2Fbahan", "gerbang@x:sandi"), teks = await g.text();
  assert.equal(g.status, 200, "akun gerbang harus melihat form masuk, bukan dipantulkan");
  assert.match(teks, /action="\/admin\/masuk\?ke=%2Fbnpb%2Fbahan"/);
  const a = await masuk("/admin/masuk?ke=%2Fbnpb%2Fbahan", "rahasia-admin"); await a.text();
  assert.equal(a.status, 303); assert.equal(a.headers.get("location"), "/bnpb/bahan");
});
test("GET /admin/masuk tanpa ?ke=: akun gerbang tetap 303 (kontrak Admin.keMasuk)", async () => {
  const g = await masuk("/admin/masuk", "gerbang@x:sandi"); await g.text();
  assert.equal(g.status, 303);
});
