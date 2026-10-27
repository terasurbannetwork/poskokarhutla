/* Cache tepi (cacheTepi di src/worker.js) dan Turnstile, di workerd (Miniflare) dengan D1 lokal + migrasi apa adanya.
   Cache Miniflare AKTIF di sini (api.test.mjs mematikannya supaya uji alur tidak membaca daftar basi).
   challenges.cloudflare.com dijawab fixture lewat outboundService: token "lolos" sah, selain itu gagal. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

let mf, DB;
const ASET = {};   // jalur -> isi; selain itu 404 (uji /api/status mengisinya supaya 200 dan bisa disimpan cache)
const verifikasi = [];
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname !== "challenges.cloudflare.com") return new Response("diblok di uji", {status: 599});
  const f = await req.formData(); verifikasi.push(f.get("response"));
  return Response.json({success: f.get("secret") === "rahasia-ts" && f.get("response") === "lolos"});
};
const opsi = ikat => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
  compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-tepi"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", ...ikat},
  serviceBindings: {ASSETS: async req => { const p = new URL(req.url).pathname; return p in ASET ? new Response(ASET[p]) : new Response("tidak ada", {status: 404}); }}, outboundService: luar});

before(async () => {
  mf = new Miniflare(opsi({TURNSTILE_SITEKEY: "kunci-situs", TURNSTILE_SECRET: "rahasia-ts"}));
  DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
let ipN = 0;
const panggil = async (m, jalur, body, h = {}, w = mf) => {
  const r = await w.dispatchFetch("http://warga.lokal" + jalur, {method: m, headers: {"cf-connecting-ip": `10.1.0.${++ipN}`, "content-type": "application/json", ...h},
    body: body === undefined ? undefined : JSON.stringify(body)});
  const teks = await r.text(); let j = null; try { j = JSON.parse(teks); } catch (e) {}
  return {status: r.status, j, teks, h: r.headers};
};
const lapor = (turnstile, lat = -2.5) => panggil("POST", "/api/warga", {jenis: "info", sub: "umum", bahaya: "umum", teks: "uji cache tepi", lat, lon: 113.9, turnstile});

uji("Turnstile diset: tanpa token atau token salah DITOLAK 403, token sah diterima, konfig memantulkan sitekey", async () => {
  assert.equal((await panggil("GET", "/api/warga/konfig")).j.turnstile, "kunci-situs");
  for (const t of [undefined, "", "palsu"]) {
    const r = await lapor(t);
    assert.equal(r.status, 403, `token ${JSON.stringify(t)} harus 403, dapat ${r.status}: ${r.teks}`);
  }
  assert.equal((await DB.prepare("SELECT count(*) n FROM laporan").first()).n, 0, "kiriman yang ditolak Turnstile tidak boleh tersimpan");
  const r = await lapor("lolos");
  assert.equal(r.status, 201, `token sah harus 201: ${r.teks}`);
  assert.ok(verifikasi.includes("lolos"), "token harus diverifikasi ke siteverify");
});

uji("Turnstile tanpa sitekey (hanya secret) tidak memblokir kiriman: widget tak pernah tampil di peramban", async () => {
  const m2 = new Miniflare(opsi({TURNSTILE_SECRET: "rahasia-ts", TURNSTILE_SITEKEY: ""}));
  try {
    const D2 = await m2.getD1Database("DB"); await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
    const r = await panggil("POST", "/api/warga", {jenis: "info", sub: "umum", bahaya: "umum", teks: "tanpa sitekey", lat: -2.5, lon: 113.9}, {}, m2);
    assert.equal(r.status, 201, `secret tanpa sitekey harus dilewati: ${r.status} ${r.teks}`);
  } finally { await m2.dispose(); }
});

uji("cache tepi: daftar GET disimpan 30 dtk per kueri ternormalisasi; admin dan POST tidak pernah", async () => {
  const a = await panggil("GET", "/api/warga?jam=24&bbox=110,-5,120,0");
  assert.equal(a.status, 200, a.teks);
  assert.equal(a.h.get("cache-control"), "public, max-age=30");
  const n0 = a.j.features.length;
  assert.equal((await lapor("lolos", -2.6)).status, 201);
  const b = await panggil("GET", "/api/warga?bbox=110,-5,120,0&jam=24");   // urutan parameter beda -> kunci sama
  assert.equal(b.j.features.length, n0, `urutan parameter beda harus kena cache (${b.j.features.length} vs ${n0})`);
  const c = await panggil("GET", "/api/warga?jam=23&bbox=110,-5,120,0");
  assert.equal(c.j.features.length, n0 + 1, "kueri lain harus segar dari D1");
  const e = await panggil("GET", "/api/warga?jam=999");
  assert.equal(e.status, 400); assert.equal(e.h.get("cache-control"), "no-store", "galat tidak boleh disimpan cache");
  const adm = await panggil("GET", "/api/warga/admin", undefined, {"x-admin-token": "rahasia-admin"});
  assert.equal(adm.h.get("cache-control"), "no-store", `admin harus no-store: ${adm.status}`);
  const p = await lapor("lolos", -2.7);
  assert.equal(p.h.get("cache-control"), "no-store", "POST harus no-store");
});

/* /api/status: kunci cache tanpa kueri, jadi ?x=acak tidak melewati cache dan tidak menjalankan periksaStatus penuh (hanya 200 yang disimpan; 503 tetap tak di-cache) */
uji("cache tepi: /api/status memakai satu kunci walau kuerinya acak; rute lain tetap per kueri", async () => {
  const meta = jam => JSON.stringify({dibuat: new Date(Date.now() - jam * 3600e3).toISOString().slice(0, 16) + "+00:00", isi: "x".repeat(2000)});
  Object.assign(ASET, Object.fromEntries(["gempa", "cuaca", "udara", "gunungapi", "kekeringan"].map(n => [`/banjir/data/berita_${n}.json`, meta(2)])),
    {"/data/kekeringan_meta.json": meta(2), "/udara/data/prakiraan.json": meta(2), "/banjir/data/gunungapi_status.json": meta(2), "/data/meta.json": meta(2), "/data/presiden/semua.json": meta(2),
     "/banjir/data/meta.json": meta(20), "/data/berita.json": meta(5), "/data/dampak.json": meta(100), "/banjir/data/cuaca_meta.json": meta(3)});
  await DB.prepare("INSERT INTO gempa_sumber (kunci, etag, isi, dibuat) VALUES ('autogempa', NULL, '{}', ?)").bind(Date.now() - 360e3).run();
  await DB.prepare("INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES ('nowcast', '{}', ?)").bind(Date.now() - 1800e3).run();
  try {
    const a = await panggil("GET", "/api/status");
    assert.equal(a.status, 200, a.teks); assert.equal(a.h.get("cache-control"), "public, max-age=60");
    await new Promise(r => setTimeout(r, 25));   // putaran periksaStatus baru akan membawa `kini` berbeda
    for (const q of ["?x=1", "?x=acak-" + Math.random(), "?a=1&b=2", "?"]) {
      const b = await panggil("GET", "/api/status" + q);
      assert.equal(b.status, 200, b.teks); assert.equal(b.j.kini, a.j.kini, `${q}: harus kena cache (kini sama), bukan periksaStatus baru`); assert.equal(b.teks, a.teks);
    }
  } finally { for (const k of Object.keys(ASET)) delete ASET[k]; await DB.prepare("DELETE FROM gempa_sumber").run(); await DB.prepare("DELETE FROM cuaca_sumber").run(); }
});
