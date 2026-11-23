/* Uji integrasi proksi InaRISK (src/inarisk.js) lewat Worker sungguhan di Miniflare + D1 sungguhan; hulu ditiru lewat outboundService. */
import {test, before, after} from "node:test";
const uji = test;
import assert from "node:assert/strict";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

let mf, minta = [], jawab = null;
const PNG = () => new Response(new Uint8Array([137, 80, 78, 71]), {headers: {"content-type": "image/png"}});
const ok = o => new Response(JSON.stringify(o), {headers: {"content-type": "application/json"}});
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-inarisk"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"}, cache: false,
    serviceBindings: {ASSETS: req => /^\/bnpb\/(inarisk|saham)\.html$/.test(new URL(req.url).pathname) ? new Response("<h1>x</h1>") : new Response("tidak ada", {status: 404})},
    outboundService: async req => { const u = new URL(req.url); if (!/^(inarisk|gis)\.bnpb\.go\.id$/.test(u.hostname)) return new Response("diblok", {status: 599});
      minta.push({u, m: req.method, ua: req.headers.get("user-agent"), badan: req.method === "POST" ? await req.text() : null}); return jawab(u); }});
  const DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());
const GET = async j => { const r = await mf.dispatchFetch("http://ir.lokal" + j), t = await r.text(); return {status: r.status, t, h: r.headers, j: (() => { try { return JSON.parse(t); } catch { return null; } })()}; };
const POST = async (b, mentah) => { const r = await mf.dispatchFetch("http://ir.lokal/api/inarisk/dampak", {method: "POST", headers: {"content-type": "application/json"}, body: mentah ?? JSON.stringify(b)}); const t = await r.text(); return {status: r.status, t, j: (() => { try { return JSON.parse(t); } catch { return null; } })()}; };

uji("inarisk: unduhan hanya meneruskan parameter daftar-putih dan UA peramban", async () => {
  minta = []; jawab = () => ok({data: []});
  const r = await GET("/api/inarisk/unduhan?page=2&per_page=10&search=banjir&evil=1&region=3171&per_page2=9");
  assert.equal(r.status, 200);
  const q = minta[0].u.searchParams; assert.equal(minta[0].u.pathname, "/apiv4/downloads");
  assert.deepEqual([...q.keys()].sort(), ["page", "per_page", "region", "search"]); assert.match(minta[0].ua, /Mozilla/);
  minta = []; await GET("/api/inarisk/unduhan?per_page=500&search=" + "x".repeat(81) + "&region=ab");
  assert.equal(minta[0].u.search, "", "nilai di luar batas dibuang");
  minta = []; await GET("/api/inarisk/unduhan/ringkas?category=x"); assert.equal(minta[0].u.pathname, "/apiv4/downloads/summary");
});

uji("inarisk: jalur tak dikenal dan lapisan di luar daftar izin 404, tanpa fetch", async () => {
  minta = []; jawab = PNG;
  assert.equal((await GET("/api/inarisk/lain")).status, 404);
  assert.equal((await GET("/api/inarisk/ubin/layer_bahaya_tsunami_30?bbox=0,0,1,1")).status, 404);
  assert.equal((await GET("/api/inarisk/ubin/layer_risiko_tanah_longsor?bbox=0,0,1,1")).status, 404);
  assert.equal((await GET("/api/inarisk/ubin/layer_kerentanan_banjir?bbox=0,0,1,1")).status, 404);
  assert.equal((await GET("/api/inarisk/ubin/..%2Fx?bbox=0,0,1,1")).status, 404);
  assert.equal(minta.length, 0);
});

uji("inarisk: ubin PNG lewat, bbox salah 400, hulu bukan gambar 502", async () => {
  minta = []; jawab = PNG;
  const r = await mf.dispatchFetch("http://ir.lokal/api/inarisk/ubin/layer_bahaya_banjir?bbox=11000000,-900000,11100000,-800000");
  assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/png"); await r.arrayBuffer();
  assert.equal(minta[0].u.pathname, "/server/rest/services/inarisk/layer_bahaya_banjir/ImageServer/exportImage");
  assert.equal(minta[0].u.searchParams.get("imageSR"), "3857"); assert.equal(minta[0].u.searchParams.get("size"), "256,256");
  await GET("/api/inarisk/ubin/batas_administrasi?bbox=1,1,2,2"); assert.equal(minta[1].u.pathname, "/server/rest/services/Basemap/batas_administrasi/MapServer/export");   // bukan di folder inarisk/
  for (const bb of ["", "1,2,3", "a,b,c,d", "0,0,30000000,1", "5,5,1,1"]) assert.equal((await GET("/api/inarisk/ubin/layer_bahaya_banjir?bbox=" + bb)).status, 400, bb);
  jawab = () => new Response("<html>token</html>", {headers: {"content-type": "text/html"}});
  assert.equal((await GET("/api/inarisk/ubin/layer_bahaya_gempabumi?bbox=1,1,2,2")).status, 502);
});

uji("inarisk: kegiatan membuang nama petugas dan foto dari host asing", async () => {
  minta = []; jawab = () => ok({features: [{type: "Feature", geometry: {type: "Point", coordinates: [1, 2]}, properties: {"User Pemantau": "Budi", Kegiatan: "Simulasi", Lokasi: "Desa A", Tgl: "2026-01-01", email: "a@b.id", telp_hp: "08", Foto: ["http://inarisk2.bnpb.go.id/a.jpg", "https://evil.example/b.jpg"]}}]});
  const r = await GET("/api/inarisk/kegiatan/12/3171");
  assert.equal(r.status, 200); assert.equal(minta[0].u.pathname, "/apiv4/posgagah/download-kegiatan-geojson/12/3171");
  const p = r.j.features[0].properties;
  assert.deepEqual(Object.keys(p).sort(), ["Foto", "Kegiatan", "Lokasi", "Tgl"]); assert.deepEqual(p.Foto, ["https://inarisk2.bnpb.go.id/a.jpg"]);
  assert.ok(!r.t.includes("Budi"));
  assert.equal((await GET("/api/inarisk/kegiatan/12/3?date_from=2026-01-01")).status, 404, "pcode 1 digit");
});

uji("inarisk: dampak lingkaran dan poligon diteruskan bersih, masukan buruk ditolak", async () => {
  minta = []; jawab = () => ok({success: true, data: {query: {id: 1, name: "Dampak Infra by Radius"}, result: {jiwa: 5}}, rahasia: "x"});   // bentuk hulu nyata 23 Nov 2026
  const c = {type: "circle", center: {lat: -7.8, lng: 110.37}, radius_meter: 1000, geometry: {type: "Point", coordinates: [110.37, -7.8]}, ekstra: "x"};
  const r = await POST(c); assert.equal(r.status, 200); assert.deepEqual(r.j, {jiwa: 5});
  assert.match(minta[0].u.pathname, /spatial-query\/1$/); assert.equal(minta[0].m, "POST");
  assert.deepEqual(JSON.parse(minta[0].badan), {type: "circle", crs: "EPSG:4326", center: {lat: -7.8, lng: 110.37}, radius_meter: 1000, geometry: {type: "Point", coordinates: [110.37, -7.8]}});
  const cincin = [[110, -7], [111, -7], [111, -8], [110, -7]];
  assert.equal((await POST({type: "polygon", geometry: {type: "Polygon", coordinates: [cincin]}})).status, 200); assert.match(minta[1].u.pathname, /spatial-query\/0$/);
  assert.equal((await POST({...c, radius_meter: 50001})).status, 400);
  assert.equal((await POST({...c, radius_meter: "10"})).status, 400);
  assert.equal((await POST({...c, center: {lat: 99, lng: 0}})).status, 400);
  assert.equal((await POST({type: "lain"})).status, 400);
  assert.equal((await POST(null, "{bukan json")).status, 400);
  const banyak = Array.from({length: 2001}, (_, i) => [110 + (i % 5) / 100, -7 - (i % 7) / 100]); banyak.push(banyak[0]);
  assert.equal((await POST({type: "polygon", geometry: {type: "Polygon", coordinates: [banyak]}})).status, 400);
  assert.equal((await POST(null, JSON.stringify({a: "x".repeat(70000)}))).status, 413);
});

uji("inarisk: hulu gagal jadi 502 tanpa badan hulu", async () => {
  jawab = () => new Response("TRACE rahasia-hulu", {status: 503});
  for (const j of ["/api/inarisk/unduhan?page=9", "/api/inarisk/kegiatan/99/3171"]) { const r = await GET(j); assert.equal(r.status, 502, j); assert.ok(!r.t.includes("rahasia-hulu")); }
  const r = await POST({type: "point", center: {lat: 1, lng: 1}, geometry: {type: "Point", coordinates: [1, 1]}}); assert.equal(r.status, 502); assert.ok(!r.t.includes("rahasia-hulu"));
});

uji("inarisk: CSP /bnpb/inarisk memuat Esri dan host foto; halaman lain tak berubah", async () => {
  const csp = async j => (await mf.dispatchFetch("http://ir.lokal" + j)).headers.get("content-security-policy");
  const a = await csp("/bnpb/inarisk"); assert.match(a, /img-src [^;]*inarisk2\.bnpb\.go\.id/); assert.match(a, /img-src [^;]*arcgisonline\.com/); assert.match(a, /connect-src [^;]*arcgisonline/); assert.match(a, /frame-ancestors 'none'/);
  const s = await csp("/bnpb/saham"); assert.ok(!/arcgisonline|inarisk/.test(s));
});
