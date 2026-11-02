/* Jarak pandang dari bot Mac mini (src/jarak_pandang.js): POST bearer mesin -> R2, GET publik dengan cadangan aset statis. workerd + R2 lokal sungguhan.
   Jalankan: node --test tests/warga/jarak_pandang.test.mjs */
import assert from "node:assert/strict";
import {berantai, siapkan} from "./_bnpb.mjs";

const uji = berantai();
const MESIN = {authorization: "Bearer mesin-rahasia"};
const stas = (o = {}) => ({icao: "WIII", nama: "Soekarno-Hatta", lat: -6.1, lon: 106.65, prov: "Banten", basi: false, jam: [{t: "2026-11-02T01:00:00Z", vis_m: 3000, wx: "HZ"}, {t: "2026-11-02T00:00:00Z", vis_m: null, wx: null}], ...o});
const isi = (o = {}) => ({dibuat: new Date().toISOString(), sumber: "bmkg", stasiun: [stas()], ...o});
const CADANGAN = {dibuat: new Date(Date.now() - 600e3).toISOString(), sumber: "noaa", stasiun: [stas({icao: "WADD"})]};
const aset = async req => new URL(req.url).pathname === "/udara/data/jarak_pandang.json" ? new Response(JSON.stringify(CADANGAN)) : new Response("tidak ada", {status: 404});

const U = await siapkan("uji-jarak-pandang", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}, asetKu: aset}), {api, mf} = U;
const kirim = (b, h = MESIN) => api("POST", "/api/jarak-pandang", typeof b === "string" ? b : JSON.stringify(b), {"content-type": "application/json", ...h});
let n = 0;
const ambil = () => api("GET", `/api/jarak-pandang?x=${++n}`);   // URL unik: lewati cache tepi

uji("jarak pandang POST: tanpa token dan token salah 403 sebelum body dibaca", async () => {
  assert.equal((await kirim("bukan json", {})).s, 403);
  assert.equal((await kirim("bukan json", {authorization: "Bearer salah"})).s, 403);
  assert.equal((await kirim(isi(), {"x-admin-token": "rahasia-admin"})).s, 403, "admin biasa bukan mesin");
});

uji("jarak pandang POST: validasi bentuk dan batas 1 MB", async () => {
  for (const [nama, b] of [["bukan JSON", "{x"], ["dibuat buruk", isi({dibuat: "kemarin"})], ["stasiun kosong", isi({stasiun: []})],
    ["icao huruf kecil", isi({stasiun: [stas({icao: "wiii"})]})], ["icao 3 huruf", isi({stasiun: [stas({icao: "WII"})]})],
    ["lat di luar bbox", isi({stasiun: [stas({lat: 40})]})], ["lon string", isi({stasiun: [stas({lon: "106"})]})],
    ["vis_m negatif", isi({stasiun: [stas({jam: [{t: "2026-11-02T01:00:00Z", vis_m: -1, wx: null}]})]})],
    ["vis_m 100000", isi({stasiun: [stas({jam: [{t: "2026-11-02T01:00:00Z", vis_m: 100000, wx: null}]})]})],
    ["t buruk", isi({stasiun: [stas({jam: [{t: "x", vis_m: 1, wx: null}]})]})],
    ["49 jam", isi({stasiun: [stas({jam: Array.from({length: 49}, () => ({t: "2026-11-02T01:00:00Z", vis_m: 1, wx: null}))})]})],
    ["401 stasiun", isi({stasiun: Array.from({length: 401}, () => stas())})]]) assert.equal((await kirim(b)).s, 400, nama);
  const besar = await kirim(isi({stasiun: [stas({nama: "x".repeat(1100000)})]})); assert.equal(besar.s, 413);
  assert.equal((await ambil()).h.get("cache-control"), "public, max-age=300");
  assert.equal((await ambil()).j.cadangan, true, "belum ada yang tersimpan: tetap dari aset");
});

uji("jarak pandang: simpan lalu GET mengembalikan isi R2 dengan umur_menit", async () => {
  const dibuat = new Date(Date.now() - 5 * 60e3).toISOString();
  const r = await kirim(isi({dibuat, stasiun: [stas(), stas({icao: "WARR"})]})); assert.equal(r.s, 201, r.t); assert.deepEqual(r.j, {ok: true, stasiun: 2});
  const o = await (await mf.getR2Bucket("MEDIA")).head("udara/jarak_pandang.json"); assert.equal(o.customMetadata.dibuat, dibuat);
  const g = await ambil(); assert.equal(g.s, 200); assert.equal(g.j.stasiun.length, 2); assert.equal(g.j.cadangan, undefined);
  assert.ok(g.j.umur_menit >= 5 && g.j.umur_menit <= 6, String(g.j.umur_menit));
});

uji("jarak pandang GET: R2 basi > 3 jam jatuh ke aset statis bertanda cadangan", async () => {
  assert.equal((await kirim(isi({dibuat: new Date(Date.now() - 4 * 3600e3).toISOString()}))).s, 201);
  const g = await ambil(); assert.equal(g.s, 200); assert.equal(g.j.cadangan, true); assert.equal(g.j.stasiun[0].icao, "WADD"); assert.ok(g.j.umur_menit >= 10);
});

uji("jarak pandang: tanpa R2 POST 503 dan GET tetap jalan dari aset", async () => {
  const T = await siapkan("uji-jarak-pandang-tanpa-r2", {ikat: {WA_MESIN: "mesin-rahasia"}, asetKu: aset});
  const p = await T.api("POST", "/api/jarak-pandang", JSON.stringify(isi()), {"content-type": "application/json", ...MESIN}); assert.equal(p.s, 503);
  assert.equal((await T.api("POST", "/api/jarak-pandang", "x", {})).s, 403, "auth tetap pertama");
  const g = await T.api("GET", "/api/jarak-pandang"); assert.equal(g.s, 200); assert.equal(g.j.cadangan, true);
});
