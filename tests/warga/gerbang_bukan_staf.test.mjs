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
const TOK = "e".repeat(64);
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-gerbang-bukan-staf"}, r2Buckets: ["MEDIA"],
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", AKUN_SITUS_UJI: "gerbang@x:sandi"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES ('k1k1k1k1k1k1k1k1', 'koordalopsa', 'Nama koordalopsa', '2000100', 'Unit', 'k@b.id', '628120000010', '["koordalops"]', '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, 'k1k1k1k1k1k1k1k1', 1, ?)").bind(sha(TOK), Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const RUTE = ["/api/logbook/hari", "/api/pusdalops/rollcall", "/api/wa/form/terakhir", "/api/pusdalops/medsos", "/api/sensor/status"];
const get = (j, h) => mf.dispatchFetch("http://t.lokal" + j, {headers: h}).then(async r => ({s: r.status, t: await r.text()}));

for (const j of RUTE) test("gerbang ditolak, staf sah dan ADMIN_TOKEN diterima: " + j, async () => {
  const g = await get(j, {"x-admin-token": "gerbang@x:sandi"});
  assert.ok([401, 403].includes(g.s), `akun gerbang harus ditolak di ${j}: ${g.s} ${g.t.slice(0, 80)}`);
  for (const [nama, h] of [["staf koordalops", {cookie: "sesi_staf=" + TOK}], ["ADMIN_TOKEN", {"x-admin-token": "rahasia-admin"}]]) {
    const r = await get(j, h);
    assert.ok(![401, 403].includes(r.s), `${nama} harus lolos gerbang di ${j}: ${r.s} ${r.t.slice(0, 80)}`);
  }
});
