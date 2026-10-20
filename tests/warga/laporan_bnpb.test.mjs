/* Laporan BNPB (src/laporan_bnpb.js + migrasi 0023) di workerd (Miniflare) dengan D1 lokal sungguhan, migrasi apa adanya.
   Juga akun AKUN_SITUS_<NAMA> (satu secret per orang) lewat form /admin/masuk. Jalankan: node --test tests/warga/laporan_bnpb.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync, existsSync} from "node:fs";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const uji = (nama, fn) => test(nama, fn);   // gerbang.test.mjs mencari uji("<nama>")
const ADMIN = {"x-admin-token": "rahasia-admin"};
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", cf: {country: "ID", colo: "CGK"}, d1Databases: {DB: "uji-lbnpb"},
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", AKUN_SITUS: "lama@x:sandi-lama", AKUN_SITUS_DIRGA: "dirga:Sandi!!2026", SESI_KUNCI: "kunci-sesi-uji"},
    serviceBindings: {ASSETS: aset}, outboundService: () => new Response("diblok", {status: 599}), cache: false});
  DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

const api = async (m, u, body, h = {}) => {
  const r = await mf.dispatchFetch("https://centurisk97.id" + u, {method: m, headers: {"content-type": "application/json", ...h}, body: body == null ? undefined : JSON.stringify(body), redirect: "manual"});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  return {s: r.status, j, t, h: r.headers};
};
const sah = {jenis: "harian", tanggal: "2026-10-19", isi: {mulai: "2026-10-18", kejadian: [{jenis: "karhutla", prov: "62", utama: "± 24.223,17 ha", status: "berjalan"}], laporan_masuk: 36}};

uji("migrasi 0023 idempoten: dijalankan dua kali tanpa galat", async () => {
  await DB.batch(pecah(readFileSync(path.join(AKAR, "migrations/0023_laporan_bnpb.sql"), "utf8")).map(s => DB.prepare(s)));
  assert.equal((await DB.prepare("SELECT count(*) n FROM laporan_bnpb").first()).n, 0);
});

uji("laporan bnpb: tanpa masuk ditolak 403 (baca dan simpan)", async () => {
  assert.equal((await api("GET", "/api/laporan-bnpb?jenis=harian")).s, 403);
  assert.equal((await api("POST", "/api/laporan-bnpb", sah)).s, 403);
  assert.equal((await api("POST", "/api/laporan-bnpb", sah, {"x-admin-token": "salah"})).s, 403);
  assert.equal((await DB.prepare("SELECT count(*) n FROM laporan_bnpb").first()).n, 0, "penolakan tidak boleh menulis apa pun");
});

uji("laporan bnpb: simpan lalu baca kembali sama persis, simpan ulang menimpa", async () => {
  const r = await api("POST", "/api/laporan-bnpb", sah, ADMIN); assert.equal(r.s, 201, r.t);
  const b = await api("GET", "/api/laporan-bnpb?jenis=harian&tanggal=2026-10-19", null, ADMIN);
  assert.equal(b.s, 200); assert.deepEqual(b.j.isi, sah.isi); assert.equal(b.h.get("cache-control"), "no-store");
  assert.equal((await api("POST", "/api/laporan-bnpb", {...sah, isi: {...sah.isi, laporan_masuk: 40}}, ADMIN)).s, 201);
  assert.equal((await api("GET", "/api/laporan-bnpb?jenis=harian&tanggal=2026-10-19", null, ADMIN)).j.isi.laporan_masuk, 40);
  const d = await api("GET", "/api/laporan-bnpb?jenis=harian", null, ADMIN);
  assert.deepEqual(d.j.daftar.map(x => x.tanggal), ["2026-10-19"], "satu baris per (jenis, tanggal)");
  assert.equal((await api("GET", "/api/laporan-bnpb?jenis=presiden&tanggal=2026-10-19", null, ADMIN)).s, 404, "jenis lain terpisah");
});

uji("laporan bnpb: isian salah DITOLAK 400/413 dan tidak tersimpan", async () => {
  const cobaan = [[{...sah, jenis: "mingguan"}, "jenis asing"], [{...sah, tanggal: "2026-02-30"}, "tanggal mustahil"], [{...sah, tanggal: "19-10-2026"}, "format tanggal"],
    [{...sah, isi: []}, "isi larik"], [{...sah, isi: {"Kunci Aneh": 1}}, "nama kolom"], [{...sah, isi: {__proto__x: 1}}, "kolom garis bawah"],
    [{...sah, isi: {a: "x".repeat(2001)}}, "teks terlalu panjang"], [{...sah, isi: {a: Array(201).fill(0)}}, "larik terlalu panjang"],
    [{...sah, isi: {a: {b: {c: {d: {e: {f: {g: {h: 1}}}}}}}}}, "terlalu dalam"]];
  for (const [b, kata] of cobaan) { const r = await api("POST", "/api/laporan-bnpb", {...b, tanggal: b.tanggal === sah.tanggal ? "2026-10-01" : b.tanggal}, ADMIN); assert.equal(r.s, 400, `${kata}: ${r.t}`); }
  const besar = await api("POST", "/api/laporan-bnpb", {...sah, tanggal: "2026-10-01", isi: {a: Array(60).fill("y".repeat(1990))}}, ADMIN);
  assert.equal(besar.s, 413, "isi > 96 KB ditolak: " + besar.t);
  assert.equal((await DB.prepare("SELECT count(*) n FROM laporan_bnpb WHERE tanggal = '2026-10-01'").first()).n, 0);
});

uji("laporan bnpb: karakter kontrol dan bidi dibuang server", async () => {
  assert.equal((await api("POST", "/api/laporan-bnpb", {...sah, tanggal: "2026-10-02", isi: {penyaji: "A‮B\u0007C"}}, ADMIN)).s, 201);
  assert.equal((await api("GET", "/api/laporan-bnpb?jenis=harian&tanggal=2026-10-02", null, ADMIN)).j.isi.penyaji, "ABC");
});

uji("laporan bnpb: POST dari origin lain ditolak (CSRF)", async () => {
  assert.equal((await api("POST", "/api/laporan-bnpb", sah, {...ADMIN, origin: "https://jahat.example"})).s, 403);
});

uji("akun AKUN_SITUS_<NAMA>: masuk lewat form, sesi membuka API laporan; AKUN_SITUS lama tetap berlaku", async () => {
  for (const [u, p] of [["dirga", "Sandi!!2026"], ["lama@x", "sandi-lama"]]) {
    const m = await mf.dispatchFetch("https://centurisk97.id/admin/masuk", {method: "POST", headers: {"content-type": "application/x-www-form-urlencoded"}, body: `email=${encodeURIComponent(u)}&sandi=${encodeURIComponent(p)}`, redirect: "manual"});
    assert.equal(m.status, 303, `${u} harus bisa masuk`);
    const kue = m.headers.get("set-cookie").split(";")[0];
    assert.equal((await api("GET", "/api/laporan-bnpb?jenis=harian", null, {cookie: kue})).s, 200, `${u}: sesi membuka API`);
  }
  const salah = await mf.dispatchFetch("https://centurisk97.id/admin/masuk", {method: "POST", headers: {"content-type": "application/x-www-form-urlencoded"}, body: "email=dirga&sandi=salah", redirect: "manual"});
  assert.notEqual(salah.status, 303, "sandi salah tidak boleh masuk");
});

uji("halaman /laporan-bnpb: centurisk97.id wajib masuk; alamat lain 404", async () => {
  const r = await mf.dispatchFetch("https://centurisk97.id/laporan-bnpb", {redirect: "manual"});
  assert.equal(r.status, 303); assert.match(r.headers.get("location"), /^\/admin\/masuk\?ke=%2Flaporan-bnpb/);
  assert.equal((await mf.dispatchFetch("https://pantau.terasurban.com/laporan-bnpb", {redirect: "manual"})).status, 404);
});
