/* Uji integrasi /api/akademisi/{kampus,kontak,terdekat} (src/akademisi.js): Worker + R2 sungguhan di Miniflare. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

const uji = test;
let mf, R2;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-akad-dekat"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  const DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  R2 = await mf.getR2Bucket("MEDIA");
});
after(() => mf?.dispose());

const ADMIN = {"x-admin-token": "rahasia-admin"};
const api = async (j, h = ADMIN) => { const r = await mf.dispatchFetch("http://akademisi.lokal" + j, {headers: h}); return {status: r.status, cc: r.headers.get("cache-control"), j: await r.json().catch(() => null)}; };
const baris = (id, kampus, rumpun, h, prodi = "P") => [id, "Dr " + id, kampus, rumpun, h, 1, 10, "", [], "", 0, prodi];

uji("berkas belum diunggah = 503 jelas (staf), tanpa sesi = 401 lebih dulu", async () => {
  for (const j of ["/api/akademisi/kampus", "/api/akademisi/kontak", "/api/akademisi/terdekat?rumpun=banjir&lat=-6&lon=107"]) {
    assert.equal((await api(j, {})).status, 401, j);
    const r = await api(j); assert.equal(r.status, 503, j); assert.match(r.j.galat, /belum diunggah/);
  }
});

uji("staf menerima kampus dan kontak apa adanya, no-store", async () => {
  await R2.put("akademisi/kampus.json", JSON.stringify({UI: {lat: -6.36, lon: 106.83, prov: "32", kota: "Depok"}}));
  await R2.put("akademisi/kontak.json", JSON.stringify({p1: {email: ["a@ui.ac.id"], sumber: "ORCID"}}));
  const k = await api("/api/akademisi/kampus"), c = await api("/api/akademisi/kontak");
  assert.equal(k.status, 200); assert.equal(k.j.UI.kota, "Depok"); assert.equal(k.cc, "private, no-store");
  assert.deepEqual(c.j.p1.email, ["a@ui.ac.id"]); assert.equal(c.cc, "private, no-store");
});

uji("terdekat: urut jarak, tie-break h, prov + isi luar_prov, tanpa lokasi dihitung, email dari kontak", async () => {
  await R2.put("akademisi/kampus.json", JSON.stringify({
    UI: {lat: -6.36, lon: 106.83, prov: "32"}, ITB: {lat: -6.89, lon: 107.61, prov: "32"}, UGM: {lat: -7.77, lon: 110.37, prov: "34"},
    UNAND: {lat: -0.91, lon: 100.46, prov: "13"}, KOSONG: {lat: null, lon: null, prov: null}}));
  await R2.put("akademisi/induk.json", JSON.stringify({orang: [
    baris("p1", "UI", ["banjir"], 5), baris("p2", "UI", ["banjir", "iklim"], 9), baris("p3", "ITB", ["banjir"], 1), baris("p4", "UGM", ["banjir"], 3),
    baris("p5", "UNAND", ["banjir"], 7), baris("p6", "UI", ["gempa"], 99), baris("p7", "KOSONG", ["banjir"], 2), baris("p8", "TAKADA", ["banjir"], 2)]}));
  const r = await api("/api/akademisi/terdekat?rumpun=banjir&lat=-6.2&lon=106.8");
  assert.equal(r.status, 200); assert.equal(r.cc, "private, no-store");
  assert.deepEqual(r.j.pakar.map(x => x.id), ["p2", "p1", "p3", "p4", "p5"], "UI (h 9 sebelum 5), ITB, UGM, UNAND");
  assert.equal(r.j.kampus_tanpa_lokasi, 2);
  assert.ok(r.j.pakar[0].km > 15 && r.j.pakar[0].km < 25 && r.j.pakar[0].km === Math.round(r.j.pakar[0].km * 10) / 10, "km 1 desimal");
  assert.equal(r.j.pakar[0].prov, "32"); assert.deepEqual(r.j.pakar[0].email, []); assert.deepEqual(r.j.pakar[1].email, ["a@ui.ac.id"], "p1 ada di kontak");
  assert.equal((await api("/api/akademisi/terdekat?rumpun=banjir&lat=-6.2&lon=106.8&n=2")).j.pakar.length, 2);
  const p = await api("/api/akademisi/terdekat?rumpun=banjir&lat=-6.2&lon=106.8&prov=34&n=3");
  assert.deepEqual(p.j.pakar.map(x => [x.id, !!x.luar_prov]), [["p4", false], ["p2", true], ["p1", true]], "dalam prov dulu lalu terdekat di luar");
});

uji("masukan buruk = 400", async () => {
  for (const q of ["rumpun=nyasar&lat=-6&lon=107", "rumpun=banjir&lat=50&lon=107", "rumpun=banjir&lat=-6&lon=10", "rumpun=banjir&lon=107", "rumpun=banjir&lat=-6&lon=107&n=0",
    "rumpun=banjir&lat=-6&lon=107&n=21", "rumpun=banjir&lat=-6&lon=107&prov=3"]) assert.equal((await api("/api/akademisi/terdekat?" + q)).status, 400, q);
});

uji("akademisi data: tamu 401, nama di luar daftar 404, belum diunggah 503", async () => {
  for (const n of ["riset", "baru"]) assert.equal((await api("/api/akademisi/data/" + n, {})).status, 401, n);
  for (const n of ["induk", "../induk", "kampus", "riset.json"]) assert.equal((await api("/api/akademisi/data/" + n)).status, 404, n);
  const r = await api("/api/akademisi/data/riset"); assert.equal(r.status, 503); assert.match(r.j.galat, /belum diunggah/);
  assert.equal((await api("/api/akademisi/data/baru")).status, 404, "tanpa berkas bulanan");
});

uji("akademisi data: staf menerima berkas daftar tetap, no-store, nosniff, x-diperbarui", async () => {
  for (const n of ["riset", "kejadian", "kolaborasi", "jurnal", "pusat_studi", "pengadaan"]) {
    await R2.put(`akademisi/${n}.json`, JSON.stringify({n}));
    const r = await mf.dispatchFetch("http://akademisi.lokal/api/akademisi/data/" + n, {headers: ADMIN});
    assert.equal(r.status, 200, n); assert.deepEqual(await r.json(), {n});
    assert.equal(r.headers.get("cache-control"), "private, no-store"); assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.ok(r.headers.get("x-diperbarui"));
  }
});

uji("akademisi data: baru memilih YYYY-MM terbaru", async () => {
  await R2.put("akademisi/baru/2026-09.json", JSON.stringify({bulan: "09"}));
  await R2.put("akademisi/baru/2026-10.json", JSON.stringify({bulan: "10"}));
  await R2.put("akademisi/baru/catatan.json", JSON.stringify({bulan: "x"}));
  const r = await api("/api/akademisi/data/baru"); assert.equal(r.status, 200); assert.equal(r.j.bulan, "10");
});
