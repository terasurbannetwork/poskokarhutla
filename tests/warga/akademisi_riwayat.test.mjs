/* Uji integrasi /api/akademisi/riwayat (src/akademisi.js, migrasi 0087): Worker + D1 sungguhan di Miniflare. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";

const uji = test;
const sha = s => createHash("sha256").update(s).digest("hex");
const T1 = "a".repeat(64), T2 = "b".repeat(64);
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-riwayat"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  for (const [id, un, tok] of [["s1s1s1s1s1s1s1s1", "anistaf", T1], ["s2s2s2s2s2s2s2s2", "budistaf", T2]]) {
    await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, '["kemitraan"]', '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, "1000" + un.length + id, un + "@b.id", "62812345" + un.length + "00").run();
    await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3).run();
  }
});
after(() => mf?.dispose());

const ADMIN = {"x-admin-token": "rahasia-admin"}, orig = {origin: "http://akademisi.lokal"};
const STAF1 = {cookie: "sesi_staf=" + T1, "x-pb": "1", ...orig}, STAF2 = {cookie: "sesi_staf=" + T2, "x-pb": "1", ...orig};
const call = async (m, j, h = ADMIN, b) => { const r = await mf.dispatchFetch("http://akademisi.lokal" + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b === undefined ? undefined : JSON.stringify(b)}); return {status: r.status, cc: r.headers.get("cache-control"), j: await r.json().catch(() => null)}; };
const ok = {jenis_target: "pakar", target_id: "A123", jenis: "narasumber", tanggal: "2024-03-10", judul: "Narasumber rakor gempa", kejadian_id: "palu-donggala-2018", catatan: "Sangat membantu", penilaian: 5};

uji("riwayat: tanpa sesi 401 di semua metode", async () => {
  assert.equal((await call("GET", "/api/akademisi/riwayat?kejadian_id=x", orig)).status, 401);
  assert.equal((await call("POST", "/api/akademisi/riwayat", orig, ok)).status, 401);
  assert.equal((await call("PATCH", "/api/akademisi/riwayat/1", orig, {judul: "x"})).status, 401);
  assert.equal((await call("DELETE", "/api/akademisi/riwayat/1", orig)).status, 401);
});

uji("riwayat: input salah 400 dan tidak tersimpan", async () => {
  for (const x of [{jenis: "nyasar"}, {jenis_target: "kampus"}, {target_id: "a b"}, {target_id: ""}, {tanggal: "10-03-2024"}, {tanggal: "2024-02-31"}, {tanggal_selesai: "2024-03-01"},
    {judul: ""}, {judul: "j".repeat(201)}, {catatan: "c".repeat(2001)}, {penilaian: 0}, {penilaian: 6}, {penilaian: 2.5}, {penilaian: "3"}, {kejadian_id: "x y"}])
    assert.equal((await call("POST", "/api/akademisi/riwayat", STAF1, {...ok, ...x})).status, 400, JSON.stringify(x).slice(0, 40));
  assert.equal((await DB.prepare("SELECT count(*) n FROM akademisi_riwayat").first()).n, 0);
});

uji("riwayat: staf menambah, oleh dari sesi (body diabaikan), GET per target dan per kejadian terurut tanggal turun", async () => {
  const a = await call("POST", "/api/akademisi/riwayat", STAF1, {...ok, oleh: "penyusup"}); assert.equal(a.status, 201, JSON.stringify(a.j));
  assert.equal(a.j.riwayat.oleh, undefined, "oleh mentah tidak boleh dikirim ke layar"); assert.equal(a.j.riwayat.oleh_nama, "Nama anistaf"); assert.ok(a.j.riwayat.id > 0);
  const b = await call("POST", "/api/akademisi/riwayat", STAF2, {...ok, jenis: "lapangan", tanggal: "2025-01-05", tanggal_selesai: "2025-01-09", judul: "Kirim ke Cianjur", kejadian_id: "cianjur-2022", penilaian: null}); assert.equal(b.status, 201);
  await call("POST", "/api/akademisi/riwayat", ADMIN, {...ok, jenis_target: "lembaga", target_id: "L9", judul: "Kontrak lembaga"});
  const t = await call("GET", "/api/akademisi/riwayat?jenis_target=pakar&target_id=A123", STAF2);
  assert.equal(t.status, 200); assert.match(t.cc, /private/); assert.match(t.cc, /no-store/);
  assert.deepEqual(t.j.riwayat.map(r => r.tanggal), ["2025-01-05", "2024-03-10"]);
  const adm = (await call("GET", "/api/akademisi/riwayat?jenis_target=lembaga&target_id=L9", STAF1)).j.riwayat[0];
  assert.equal(adm.oleh_nama, "Admin"); assert.equal(adm.milik, false);
  assert.deepEqual(t.j.riwayat.map(r => [r.oleh_nama, r.milik]), [["Nama budistaf", true], ["Nama anistaf", false]]);
  assert.ok(t.j.riwayat.every(r => !("oleh" in r)), "GET tidak membawa oleh mentah");
  assert.ok((await call("GET", "/api/akademisi/riwayat?jenis_target=lembaga&target_id=L9", ADMIN)).j.riwayat.every(r => r.milik));
  const k = await call("GET", "/api/akademisi/riwayat?kejadian_id=palu-donggala-2018", STAF1);
  assert.deepEqual(k.j.riwayat.map(r => r.judul), ["Kontrak lembaga", "Narasumber rakor gempa"]);
  assert.equal((await call("GET", "/api/akademisi/riwayat", STAF1)).status, 400);
  assert.equal((await call("GET", "/api/akademisi/riwayat?jenis_target=zzz&target_id=A1", STAF1)).status, 400);
});

uji("riwayat: ubah dan hapus hanya penulis atau admin; staf lain 403, tidak ada 404", async () => {
  const id = (await call("POST", "/api/akademisi/riwayat", STAF1, ok)).j.riwayat.id, u = `/api/akademisi/riwayat/${id}`;
  assert.equal((await call("PATCH", u, STAF2, {judul: "bajak"})).status, 403);
  assert.equal((await call("DELETE", u, STAF2)).status, 403);
  assert.equal((await call("PATCH", u, {...STAF1, origin: "https://jahat.example"}, {judul: "x"})).status, 403);
  const p = await call("PATCH", u, STAF1, {judul: "Judul baru", penilaian: 3}); assert.equal(p.status, 200, JSON.stringify(p.j));
  assert.equal(p.j.riwayat.judul, "Judul baru"); assert.equal(p.j.riwayat.penilaian, 3); assert.equal(p.j.riwayat.tanggal, ok.tanggal); assert.ok(p.j.riwayat.diubah);
  assert.equal((await call("PATCH", u, STAF1, {tanggal: "bukan"})).status, 400);
  assert.equal((await call("PATCH", u, ADMIN, {catatan: "disunting admin"})).status, 200);
  assert.equal((await call("DELETE", u, STAF1)).status, 200);
  assert.equal((await call("DELETE", u, STAF1)).status, 404);
  const id2 = (await call("POST", "/api/akademisi/riwayat", STAF1, ok)).j.riwayat.id;
  assert.equal((await call("DELETE", `/api/akademisi/riwayat/${id2}`, ADMIN)).status, 200);
});
