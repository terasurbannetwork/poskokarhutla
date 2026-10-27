/* Menit 23 = SIHKA saja (stempel 'sihka' tertulis), menit 38 = DSDA + SIPANTAU saja (stempel sendiri), /api/status sumber.sungai_resmi, galat sumber terekam. Jalankan: node --test tests/warga/sungai_resmi_menit.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, pecah} from "./_bantu.mjs";

const DSDA = readFileSync(path.join(AKAR, "tests/warga/fixtures/dsda_dki_datatmalaststatus.json"), "utf8").replaceAll("2026-10-27T19:", "2026-10-27T16:"), TNG = readFileSync(path.join(AKAR, "tests/warga/fixtures/sipantau_posduga.json"), "utf8");
const T23 = Date.parse("2026-10-27T10:23:00Z"), T38 = Date.parse("2026-10-27T10:38:00Z");
const merc = (lon, lat) => [lon * 6378137 * Math.PI / 180, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 6378137];
const SIHKA = JSON.stringify([{id: "S-jauh", name: "S-jauh", type: "DUGA AIR", tz: "Asia/Jakarta", coordinate: merc(106.9, -6.7).join(","), raw: [{unit: "cm", merek: "X", value: 77, timestamp: new Date(T23 - 600e3).toISOString()}]}]);
let mf, DB, W, tngKode = 200;
const tik = t => W.scheduled({cron: "* * * * *", scheduledTime: new Date(t)});
const stempel = async k => { const r = await DB.prepare("SELECT isi, dibuat FROM cuaca_sumber WHERE kunci = ?").bind(k).first(); return r && {...JSON.parse(r.isi), dibuat: r.dibuat}; };
const status = async () => (await (await mf.dispatchFetch("http://x/api/status")).json()).sumber;
before(async () => {
  const luar = async req => { const h = new URL(req.url).hostname;
    return h === "poskobanjir.dsdadki.web.id" ? new Response(DSDA) : h === "api.dpuprkotang.info" ? new Response(tngKode === 200 ? TNG : "mati", {status: tngKode}) : h === "sihka.sda.pu.go.id" ? new Response(SIHKA) : new Response("diblok", {status: 599}); };
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    d1Databases: {DB: "uji-menit"}, bindings: {SIHKA_STATUS_JEDA_MENIT: "0", IP_SALT: "g", ADMIN_TOKEN: "r"}, serviceBindings: {ASSETS: async () => new Response("", {status: 404})}, outboundService: luar, cache: false});
  DB = await mf.getD1Database("DB"); W = await mf.getWorker();
  for (const f of readdirSync(path.join(AKAR, "migrations")).filter(f => f.endsWith(".sql")).sort()) await DB.batch(pecah(readFileSync(path.join(AKAR, "migrations", f), "utf8")).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

test("menit 23 hanya SIHKA; menit 38 hanya sumber resmi; keduanya menstempel sendiri", async () => {
  await tik(T23);
  assert.equal((await stempel("sihka")).dibuat, T23);
  assert.equal(await stempel("sungai_dsda"), null, "DSDA tidak jalan di menit 23");
  assert.equal((await status()).sungai_resmi, undefined);
  await tik(T38);
  assert.equal((await stempel("sungai_dsda")).dibuat, T38); assert.equal((await stempel("sungai_tng")).dibuat, T38);
  assert.equal((await stempel("sihka")).dibuat, T23, "menit 38 tidak menyentuh stempel SIHKA");
  const sr = (await status()).sungai_resmi;
  assert.deepEqual(sr, {dibuat: new Date(T38).toISOString(), ok: true, galat: null});
  const per = {}; for (const p of (await (await mf.dispatchFetch("http://x/api/banjir/sungai-ukur")).json()).pos) per[p.sumber] = (per[p.sumber] || 0) + 1;
  assert.ok(per["DSDA DKI"] >= 5 && per["SIPANTAU Kota Tangerang"] >= 10 && per.SIHKA >= 1, JSON.stringify(per));
});

test("galat sumber terekam di /api/status tanpa membaca D1; percobaan terbaru tampil", async () => {
  tngKode = 500; const T = T38 + 3600e3;
  await tik(T);
  const sr = (await status()).sungai_resmi;
  assert.equal(sr.dibuat, new Date(T).toISOString()); assert.equal(sr.ok, false);
  assert.match(sr.galat, /tng: HTTP 500/); assert.ok(sr.galat.length <= 200);
  assert.equal((await stempel("sungai_dsda")).dibuat, T, "DSDA tetap sehat dan menstempel sendiri");
  tngKode = 200;
});
