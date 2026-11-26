/* Uji integrasi panel alat EWS (src/alat.js, EW-04; data/kajian-bnpb/ews/RENCANA-UJI.md U3, U5): Worker + D1 sungguhan di Miniflare, migrasi apa adanya (0089 + 0176 geofon).
   Sumber gagal dibuat sungguhan (baris sumber dihapus, aset 404, tabel dibuang), bukan adapter tiruan. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

const uji = test;
const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "e".repeat(64), MNT = 6e4, KINI = Date.now();
let mf, DB, asetMati = false;
const GUNUNG = {sumber: "MAGMA Indonesia, PVMBG (Badan Geologi, KESDM)", dibuat: new Date(KINI - 3600e3).toISOString(),
  gunung: [{nama: "Ibu", kode: "IBU", level: 3, lat: 1.488, lon: 127.63}, {nama: "Agung", kode: "AGU", level: 1, lat: -8.342, lon: 115.508}]};

before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-alat"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12)},
    serviceBindings: {ASSETS: req => !asetMati && new URL(req.url).pathname === "/banjir/data/gunungapi_status.json" ? Response.json(GUNUNG) : new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  await DB.batch([
    DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES ('a1a1a1a1a1a1a1a1', 'pusdalopsalat', 'Nama', '20001000', 'Unit', 'p@b.id', '628120000010', '["pusdalops"]', '[]', 'gggggggggggggggggggggggggggggggg', '${"a".repeat(64)}', 0, 1, 'tes', 0)`),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, 'a1a1a1a1a1a1a1a1', 1, ?)").bind(sha(TOK), KINI + 3600e3),
    ...[["TMA-NAIK", "tma", 1, -0.31234, 100.41234, '{"tinggi_cm":{"waspada":150,"siaga":200,"awas":250}}'], ["TMA-PUTUS", "tma", 1, -0.5, 100.5, '{"tinggi_cm":{"waspada":150}}'],
      ["TMA-KOSONG", "tma", 1, null, null, "{}"], ["HUJAN-MATI", "hujan", 0, -0.2, 100.2, "{}"], ["GTW-01", "gateway", 1, -0.1, 100.1, "{}"], ["GEO-IBU", "geofon", 1, 1.49, 127.62, '{"getar_mms":{"waspada":5}}']]
      .map(([id, jenis, aktif, lat, lon, amb]) => DB.prepare("INSERT INTO sensor_alat (id, jenis, kab, desa, lat, lon, ambang, kunci_hash, aktif, dibuat) VALUES (?, ?, '13|Agam', 'Desa Uji', ?, ?, ?, ?, ?, 1)").bind(id, jenis, lat, lon, amb, "ab".repeat(8), aktif)),
    ...[["TMA-NAIK", KINI - 20 * MNT, '{"tinggi_cm":140}'], ["TMA-NAIK", KINI - 10 * MNT, '{"tinggi_cm":null}'], ["TMA-NAIK", KINI - 2 * MNT, '{"tinggi_cm":182,"suhu_c":27.5}'],
      ["TMA-PUTUS", KINI - 3 * 3600e3, '{"tinggi_cm":0}'], ["GEO-IBU", KINI - MNT, '{"getar_mms":1.2,"frek_hz":4}'], ["HUJAN-MATI", KINI - MNT, '{"hujan_mm":9}']]
      .map(([a, w, n]) => DB.prepare("INSERT INTO sensor_baca (alat_id, waktu, nilai, baterai, rssi, diterima) VALUES (?, ?, ?, 88, -70, ?)").bind(a, w, n, w)),
    DB.prepare("INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES ('sihka_status', ?, ?)").bind(JSON.stringify({dibuat: KINI, pos: [
      {id: "p-siaga", nama: "Pos Siaga", satuan: "centimeter", v: 310, t: Math.floor(KINI / 1000) - 600, status: "biasa", status_resmi: "Siaga 2", pengelola: "Kementerian PU", lon: 106.8, lat: -6.2, ambang: {siaga3: 200, siaga2: 300, siaga1: 400}},
      {id: "p-lama", nama: "Pos Lama", satuan: "cm", v: 0, t: Math.floor(KINI / 1000) - 8 * 3600, status: "lama", status_resmi: "Siaga 1", lon: 106.9, lat: -6.3},
      {id: "p-macet", nama: "Pos Macet", satuan: "cm", v: 420, t: Math.floor(KINI / 1000) - 600, status: "macet", status_resmi: "Siaga 1", lon: 107, lat: -6.4}]}), KINI),
    DB.prepare("INSERT INTO sihka_pos (pos, nama, satuan, dilihat) VALUES ('p-siaga', 'Pos Siaga', 'centimeter', ?)").bind(Math.floor(KINI / 1000)),
    ...[7200, 3600, 600].map((d, i) => DB.prepare("INSERT INTO sihka_baca (pos, t, v) VALUES ('p-siaga', ?, ?)").bind(Math.floor(KINI / 1000) - d, 290 + i * 10)),
  ]);
});
after(() => mf?.dispose());

const STAF = {cookie: "sesi_staf=" + TOK};
const get = async (j, h = {}, m = "GET") => { const r = await mf.dispatchFetch("http://alat.lokal" + j, {method: m, headers: h}); const t = await r.text(); let b = null; try { b = JSON.parse(t); } catch (e) {} return {status: r.status, cc: r.headers.get("cache-control"), t, j: b}; };
const per = r => Object.fromEntries(r.j.pos.map(p => [p.id, p]));
const D2 = ["id", "sumber", "jenis", "nama", "lat", "lon", "kab", "nilai", "utama", "satuan", "waktu", "ambang", "tingkat", "alat", "basi"];

uji("U3: pos alat bentuk D2, publik membulatkan koordinat, staf penuh, alat mati dan gateway tidak tampil", async () => {
  const r = await get("/api/alat/pos?bencana=banjir"); assert.equal(r.status, 200, r.t);
  assert.match(r.cc, /public, max-age=60/);
  const p = per(r);
  assert.deepEqual(Object.keys(p).sort(), ["sensor:TMA-KOSONG", "sensor:TMA-NAIK", "sensor:TMA-PUTUS", "sihka:p-lama", "sihka:p-macet", "sihka:p-siaga"], "geofon bukan jenis banjir; gateway dan alat mati tidak tampil");
  for (const x of r.j.pos) for (const k of D2) assert.ok(k in x, `${x.id} punya ${k}`);
  const naik = p["sensor:TMA-NAIK"];
  assert.deepEqual([naik.lat, naik.lon, naik.desa], [-0.31, 100.41, undefined], "publik: koordinat 0,01 derajat, desa tidak keluar");
  assert.deepEqual([naik.tingkat, naik.basi, naik.nilai.tinggi_cm, naik.utama, naik.satuan, naik.alat.baterai, naik.alat.suhu], ["waspada", false, 182, "tinggi_cm", "cm", 88, 27.5]);
  const putus = p["sensor:TMA-PUTUS"];
  assert.deepEqual([putus.tingkat, putus.basi, putus.nilai.tinggi_cm], ["tanpa_data", true, 0], "basi: tanpa_data, nilai terakhir tetap ada dengan waktunya, tidak dinilai");
  assert.deepEqual([p["sensor:TMA-KOSONG"].tingkat, p["sensor:TMA-KOSONG"].nilai, p["sensor:TMA-KOSONG"].waktu], ["tanpa_data", null, null], "tanpa bacaan: kosong, bukan 0");
  assert.deepEqual([p["sihka:p-siaga"].tingkat, p["sihka:p-siaga"].status_resmi, p["sihka:p-siaga"].satuan, p["sihka:p-siaga"].waktu], ["resmi", "Siaga 2", "cm", (Math.floor(KINI / 1000) - 600) * 1000]);
  assert.equal(p["sihka:p-lama"].tingkat, "tanpa_data");
  assert.equal(p["sihka:p-macet"].status_resmi, null, "status resmi pos macet tidak dipakai (sama dengan pos_air.js)");
  assert.deepEqual(r.j.ringkas, {jumlah_pos: 6, di_atas_ambang: 2, terputus: 3, kamera: null, gagal: []});
  assert.deepEqual(r.j.gagal, []);
  assert.deepEqual(r.j.pos.slice(0, 2).map(x => x.id), ["sensor:TMA-NAIK", "sihka:p-siaga"], "G5: tingkat tertinggi di depan");
  assert.doesNotMatch(r.t, /\baman\b/i);
  assert.doesNotMatch(r.t, /kunci_hash|rssi/);
  const s = await get("/api/alat/pos?bencana=banjir", STAF); assert.equal(s.status, 200, s.t);
  assert.equal(s.cc, "no-store");
  assert.deepEqual([per(s)["sensor:TMA-NAIK"].lat, per(s)["sensor:TMA-NAIK"].lon, per(s)["sensor:TMA-NAIK"].desa], [-0.31234, 100.41234, "Desa Uji"], "staf: koordinat penuh");
  const sesiPalsu = await get("/api/alat/pos?bencana=banjir", {cookie: "sesi_staf=" + "f".repeat(64)});
  assert.equal(sesiPalsu.status, 200); assert.equal(per(sesiPalsu)["sensor:TMA-NAIK"].lat, -0.31, "sesi tidak sah = publik");
  const adm = await get("/api/alat/pos?bencana=banjir", {"x-admin-token": "rahasia-admin", authorization: "Bearer rahasia-admin"});
  assert.equal(adm.status, 200); assert.equal(per(adm)["sensor:TMA-NAIK"].lat, -0.31, "token admin bukan jalur staf di rute publik ini: tetap dibulatkan");
  assert.match(adm.cc, /public, max-age=60/);
  const acak = await get("/api/alat/pos?bencana=banjir&x=" + Math.random() + "&bencana=nyasar"); assert.equal(acak.status, 200, "parameter lain tidak dipakai (kunci cache dari bencana tervalidasi)");
  const g = await get("/api/alat/pos?bencana=gunungapi"); assert.equal(g.status, 200, g.t);
  const pg = per(g);
  assert.ok(pg["sensor:GEO-IBU"] && pg["sensor:TMA-NAIK"] && !pg["sihka:p-siaga"], "gunungapi: geofon + tma + pvmbg, tanpa sihka");
  assert.deepEqual([pg["pvmbg:IBU"].status_resmi, pg["pvmbg:IBU"].tingkat, pg["pvmbg:IBU"].nilai.level, pg["pvmbg:AGU"].tingkat], ["Siaga", "siaga", 3, "normal"]);
  assert.deepEqual([pg["sensor:GEO-IBU"].utama, pg["sensor:GEO-IBU"].satuan, pg["sensor:GEO-IBU"].tingkat], ["getar_mms", "mm/s", "normal"]);
  for (const [j, m] of [["/api/alat/pos", "GET"], ["/api/alat/pos?bencana=nyasar", "GET"], ["/api/alat/pos?bencana=karhutla", "GET"], ["/api/alat/pos?bencana=__proto__", "GET"], ["/api/alat/pos?bencana=constructor", "GET"]])
    assert.equal((await get(j, {}, m)).status, 400, j);
  assert.equal((await get("/api/alat/pos?bencana=banjir", {origin: "http://alat.lokal"}, "POST")).status, 405);
});

uji("U3: seri pos sensor dan SIHKA, nilai kosong tetap kosong, input salah ditolak sebelum D1", async () => {
  const r = await get("/api/alat/seri?pos=sensor:TMA-NAIK&jam=24"); assert.equal(r.status, 200, r.t);
  assert.deepEqual(r.j.titik, [[KINI - 20 * MNT, 140], [KINI - 10 * MNT, null], [KINI - 2 * MNT, 182]], "bacaan null tidak jadi 0");
  assert.deepEqual([r.j.kunci, r.j.satuan, r.j.interval, r.j.ambang], ["tinggi_cm", "cm", 5 * MNT, {waspada: 150, siaga: 200, awas: 250}]);
  assert.equal((await get("/api/alat/seri?pos=sensor:TMA-NAIK&jam=1&kunci=suhu_c")).j.titik.at(-1)[1], 27.5);
  assert.deepEqual((await get("/api/alat/seri?pos=sensor:TMA-PUTUS&jam=1")).j.titik, [], "jam membatasi jendela");
  const h = await get("/api/alat/seri?pos=sihka:p-siaga&jam=24"); assert.equal(h.status, 200, h.t);
  assert.deepEqual(h.j.titik.map(t => t[1]), [290, 300, 310]); assert.equal(h.j.interval, 3600e3); assert.equal(h.j.satuan, "cm");
  assert.equal((await get("/api/alat/seri?pos=sihka:p-siaga&jam=2")).j.titik.length, 2);
  for (const q of ["", "pos=TMA-NAIK", "pos=luar:X", "pos=sensor:a/b", "pos=sensor:TMA-NAIK&jam=0", "pos=sensor:TMA-NAIK&jam=25", "pos=sensor:TMA-NAIK&jam=1.5", "pos=sensor:TMA-NAIK&kunci=Ab", "pos=sihka:p-siaga&kunci=suhu"])
    assert.equal((await get("/api/alat/seri?" + q)).status, 400, q);
  for (const q of ["pos=sensor:TIDAK-ADA", "pos=sensor:GTW-01", "pos=sensor:HUJAN-MATI", "pos=sihka:tidak-ada", "pos=pvmbg:IBU"])
    assert.equal((await get("/api/alat/seri?" + q)).status, 404, q);
  assert.equal((await get("/api/alat/seri?pos=sensor:TMA-NAIK", STAF)).cc, "no-store");
});

uji("U5: sumber gagal dimuat masuk gagal, ringkasan tidak menulis 0 pos", async () => {
  await DB.prepare("DELETE FROM cuaca_sumber WHERE kunci = 'sihka_status'").run();
  const b = await get("/api/alat/pos?bencana=banjir"); assert.equal(b.status, 200, b.t);
  assert.deepEqual(b.j.gagal, ["sihka"]); assert.equal(b.j.ringkas.jumlah_pos, 3, "pos sensor yang berhasil tetap dihitung"); assert.deepEqual(b.j.ringkas.gagal, ["sihka"]);
  asetMati = true;
  const g1 = await get("/api/alat/pos?bencana=gunungapi");
  assert.deepEqual(g1.j.gagal, ["pvmbg"]); assert.ok(g1.j.pos.every(p => p.sumber === "sensor"));
  await DB.batch(["DROP TABLE sensor_baca", "DROP TABLE sensor_lapor", "DROP TABLE sensor_alat"].map(s => DB.prepare(s)));
  const g = await get("/api/alat/pos?bencana=gunungapi"); assert.equal(g.status, 200, g.t);
  assert.deepEqual(g.j.gagal, ["sensor", "pvmbg"]); assert.deepEqual(g.j.pos, []);
  assert.deepEqual(g.j.ringkas, {jumlah_pos: null, di_atas_ambang: null, terputus: null, kamera: null, gagal: ["sensor", "pvmbg"]}, "semua gagal = null, bukan 0");
});
