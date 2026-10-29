/* Prod 27 Okt 2026: migrasi 0066/0068 belum diterapkan, /api/banjir/sungai-ukur hanya berisi SIHKA. Uji ini meniru D1 itu (semua migrasi KECUALI 0066 dan 0068) dan
   menuntut SATU tik cron sudah menghasilkan pos DSDA DKI dan SIPANTAU. Jalankan: node --test tests/warga/sungai_tanpa_migrasi.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, pecah} from "./_bantu.mjs";

const DSDA = readFileSync(path.join(AKAR, "tests/warga/fixtures/dsda_dki_datatmalaststatus.json"), "utf8").replaceAll("2026-10-27T19:", "2026-10-27T16:"), TNG = readFileSync(path.join(AKAR, "tests/warga/fixtures/sipantau_posduga.json"), "utf8");
const KR = Date.parse("2026-10-27T10:23:00Z");
const merc = (lon, lat) => [lon * 6378137 * Math.PI / 180, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 6378137];
const SIHKA = JSON.stringify([{id: "S-jauh", name: "S-jauh", type: "DUGA AIR", tz: "Asia/Jakarta", coordinate: merc(106.9, -6.7).join(","), raw: [{unit: "cm", merek: "X", value: 77, timestamp: new Date(KR - 600e3).toISOString()}]}]);
let mf, DB;
before(async () => {
  const luar = async req => { const h = new URL(req.url).hostname;
    return h === "poskobanjir.dsdadki.web.id" ? new Response(DSDA) : h === "api.dpuprkotang.info" ? new Response(TNG) : h === "sihka.sda.pu.go.id" ? new Response(SIHKA) : new Response("diblok", {status: 599}); };
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    d1Databases: {DB: "uji-tanpa-0066"}, bindings: {SIHKA_STATUS_JEDA_MENIT: "0", IP_SALT: "g", ADMIN_TOKEN: "r"}, serviceBindings: {ASSETS: async () => new Response("", {status: 404})}, outboundService: luar, cache: false});
  DB = await mf.getD1Database("DB");
  for (const f of readdirSync(path.join(AKAR, "migrations")).filter(f => f.endsWith(".sql") && !/^006[68]_/.test(f)).sort())
    await DB.batch(pecah(readFileSync(path.join(AKAR, "migrations", f), "utf8")).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

test("tanpa migrasi 0066/0068: SATU tik cron menit 23 sudah menghasilkan pos DSDA DKI dan SIPANTAU di /api/banjir/sungai-ukur", async () => {
  assert.equal((await DB.prepare("SELECT 1 FROM sqlite_master WHERE name = 'sungai_meta'").first()), null, "prasyarat: tabel belum ada");
  await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: new Date(KR)});
  await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: new Date(KR + 15 * 60e3)});   // menit 38: sumber resmi invokasi sendiri
  const j = await (await mf.dispatchFetch("http://x/api/banjir/sungai-ukur")).json(), per = {};
  for (const p of j.pos) per[p.sumber] = (per[p.sumber] || 0) + 1;
  assert.ok(per["DSDA DKI"] >= 5 && per["SIPANTAU Kota Tangerang"] >= 10 && per.SIHKA >= 1, JSON.stringify(per));
  assert.equal(JSON.parse((await DB.prepare("SELECT isi FROM cuaca_sumber WHERE kunci = 'sungai_dsda'").first()).isi).galat, null);
});
