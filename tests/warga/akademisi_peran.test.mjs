/* Gerbang peran direktori /akademisi (src/akademisi.js, P_AKADEMISI): operator_cc (command center, src/staf.js) TIDAK boleh membuka satu pun rute /api/akademisi, baca maupun tulis.
   Temuan guard-api 2 Nov 2026: gerbang lama memakai Object.keys(PERAN), jadi peran baru ikut lolos ke 15 titik (POST koreksi/riwayat/ringkasan, PATCH/DELETE riwayat, GET data pribadi pakar).
   Rute diambil dari RUTE_AKADEMISI itu sendiri: rute akademisi baru otomatis ikut diuji. Pembanding: staf pusdalops (peran lama) harus tetap lolos, supaya 401 operator_cc benar
   berasal dari peran, bukan dari header yang kurang. Jalankan: node --test tests/warga/akademisi_peran.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {RUTE_AKADEMISI, P_AKADEMISI} from "../../src/akademisi.js";
import {PERAN} from "../../src/staf.js";

const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = {cc: "c".repeat(64), pusdalops: "d".repeat(64), kemitraan: "e".repeat(64)};
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-akademisi-peran"}, r2Buckets: ["MEDIA"],
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12)},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, outboundService: () => new Response("diblok di uji", {status: 599}), cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  let i = 0;
  for (const [peran, tok] of Object.entries(TOK)) {
    const id = "s" + (++i) + "s".repeat(14);
    await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, '[]', ?, ?, 0, 1, 'tes', 0)`).bind(id, "akper" + i + "xx", "Uji " + peran, "9000" + i + "000", `a${i}@b.id`, "62812000000" + i, JSON.stringify([peran === "cc" ? "operator_cc" : peran]), "g".repeat(32), "a".repeat(64)).run();
    await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3).run();
  }
});
after(() => mf?.dispose());

const head = tok => ({cookie: "sesi_staf=" + tok, "x-pb": "1", origin: "http://akademisi.lokal", "content-type": "application/json"});
const ISI = {"POST /api/akademisi/koreksi": {jenis: "pakar", id: "A12_x-1", butir: "email", isi: "Email lama, sudah pindah kampus"}};
/* jalur nyata dari kunci rute: ":id" diganti nilai yang lolos regex jalur worker (id OpenAlex A+angka, W+angka, SINTA angka, riwayat angka) */
const jalurDari = j => j.replace("/karya/:id", "/karya/A12345").replace("/riset/:id", "/riset/W12345").replace("/sinta/:id", "/sinta/123").replace("/gambar/:id", "/gambar/abc").replace("/riwayat/:id", "/riwayat/1");
async function panggil(kunci, tok) {
  const [metode, j] = kunci.split(" ");
  const r = await mf.dispatchFetch("http://akademisi.lokal" + jalurDari(j), {method: metode, headers: head(tok), body: metode === "GET" || metode === "DELETE" ? undefined : JSON.stringify(ISI[kunci] ?? {})});
  await r.arrayBuffer();
  return r.status;
}

test("P_AKADEMISI: daftar eksplisit, semua anggotanya peran nyata, tanpa operator_cc", () => {
  assert.ok(P_AKADEMISI.length > 0);
  for (const p of P_AKADEMISI) assert.ok(Object.hasOwn(PERAN, p), `${p} bukan peran di PERAN`);
  assert.ok(Object.hasOwn(PERAN, "operator_cc"), "operator_cc harus ada di PERAN (sumber temuan)");
  assert.ok(!P_AKADEMISI.includes("operator_cc"));
  assert.equal(new Set(P_AKADEMISI).size, P_AKADEMISI.length, "tanpa duplikat");
});

test("operator_cc: SEMUA rute /api/akademisi (baca dan tulis) ditolak: 401 (GET koreksi khusus admin: 403)", async () => {
  const kunci = Object.keys(RUTE_AKADEMISI);
  assert.ok(kunci.length >= 20, "daftar rute terbaca: " + kunci.length);
  assert.ok(["POST /api/akademisi/koreksi", "POST /api/akademisi/riwayat", "POST /api/akademisi/ringkasan", "PATCH /api/akademisi/riwayat/:id", "DELETE /api/akademisi/riwayat/:id"].every(k => kunci.includes(k)));
  const lolos = [];
  for (const k of kunci) { const s = await panggil(k, TOK.cc); if (s !== (k === "GET /api/akademisi/koreksi" ? 403 : 401)) lolos.push(`${k} -> ${s}`); }   // daftar koreksi memakai adminOK -> 403 untuk staf mana pun
  assert.deepEqual(lolos, [], "rute yang lolos untuk operator_cc");
});

test("pembanding: staf pusdalops dan kemitraan (peran lama) tetap lolos gerbang; hanya GET koreksi (khusus admin) tertutup", async () => {
  for (const tok of [TOK.pusdalops, TOK.kemitraan]) {
    const tertutup = [];
    for (const k of Object.keys(RUTE_AKADEMISI)) if (await panggil(k, tok) === 401) tertutup.push(k);
    assert.deepEqual(tertutup, [], "rute staf yang 401 untuk peran lama");   // GET koreksi memakai adminOK -> 403, bukan 401
  }
  const s = await mf.dispatchFetch("http://akademisi.lokal/api/akademisi/koreksi", {method: "POST", headers: head(TOK.pusdalops), body: JSON.stringify(ISI["POST /api/akademisi/koreksi"])});
  assert.equal(s.status, 201, "koreksi staf pusdalops sah tetap 201");
  const cc = await mf.dispatchFetch("http://akademisi.lokal/api/akademisi/koreksi", {method: "POST", headers: head(TOK.cc), body: JSON.stringify(ISI["POST /api/akademisi/koreksi"])});
  assert.equal(cc.status, 401, "body sah yang sama ditolak untuk operator_cc");
});
