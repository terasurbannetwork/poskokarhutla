/* src/hak.js: pintu D1 akun staf. Miniflare + D1 sungguhan, tanpa mock.
   1) tiap sel MATRIKS (tabel x pelaku x aksi) diuji boleh dan ditolak lewat fungsi hak.js yang bersangkutan;
   2) tiap tulis admin/diri lewat rute sungguhan menulis pantau_jejak dalam batch yang sama. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import * as H from "../../src/hak.js";
import "../../src/worker.js";

const sha = s => createHash("sha256").update(s).digest("hex");
const ADMIN = "rahasia-admin", SUPER = sha(ADMIN).slice(0, 12), TOK = "c".repeat(64), ID = "d1d1d1d1d1d1d1d1";
const V = {nama: "Uji Hak", nip: "9990001", unit: "Unit", email: "h@b.id", wa: "628120000099", peran: ["pusdalops"], wilayah: []};
let mf, DB, env;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-hak"}, r2Buckets: ["MEDIA"],
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: ADMIN, SUPER_ADMIN: SUPER},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); env = {DB}; await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, 'ujihaka', 'Nama', '2000100', 'Unit', 'k@b.id', '628120000010', '["pusdalops"]', '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(ID),
    DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(TOK), ID, Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const jml = async (sql, ...b) => (await DB.prepare(sql).bind(...b).first()).n;
const PELAKU = {sistem: H.pelakuSistem, diri: H.pelakuDiri(ID), admin: H.pelakuAdmin};
const kini = Date.now();
/* satu pemanggil per (tabel, aksi): memakai fungsi hak.js yang mewakili sel itu */
const SEL = {
  "staf.baca": p => H.stafById(env, p, ID),
  "staf.tambah": p => H.stmtStafBaru(env, p, Math.random().toString(16).slice(2, 18).padEnd(16, "0"), "uji" + Math.random().toString(36).slice(2, 10), {...V, nip: String(Math.random())}, {garam: "g".repeat(32), sandi_sha: "a".repeat(64)}, kini, "tes"),
  "staf.ubah": p => H.stmtSandi(env, p, ID, "g".repeat(32), "a".repeat(64), 0),
  "staf_sesi.baca": p => H.sesiDariToken(env, p, sha(TOK), kini),
  "staf_sesi.tambah": p => H.stmtSesiBaru(env, p, sha("t" + Math.random()), ID, kini, kini + 1000),
  "staf_sesi.hapus": p => H.stmtSesiLain(env, p, ID, sha(TOK)),
  "laju_bnpb.baca": p => H.hitungLaju(env, p, "k", "a", 0),
  "laju_bnpb.tambah": p => H.stmtLaju(env, p, "kunci-uji", "staf.gagal_u", kini),
  "pantau_jejak.tambah": p => H.stmtJejak(env, p, p.peran === "diri" ? "staf:" + ID : "tes", "staf:" + ID, "uji", null, null, kini),
};
const AKSI = ["baca", "tambah", "ubah", "hapus"];

/* tabel sk_* punya pelaku sendiri (sk_staf, sk_instansi) dan diuji sel demi sel di siklus_peran.test.mjs */
for (const tabel of Object.keys(H.MATRIKS).filter(t => !t.startsWith("sk_"))) for (const [nama, p] of Object.entries(PELAKU)) for (const aksi of AKSI) {
  const boleh = H.MATRIKS[tabel][nama]?.includes(aksi) ?? false;
  test(`${tabel}.${aksi} oleh ${nama}: ${boleh ? "boleh" : "ditolak 403"}`, async () => {
    assert.equal(H.boleh(p, tabel, aksi), boleh);
    const f = SEL[`${tabel}.${aksi}`];
    if (!f) { if (boleh) assert.fail("sel boleh tanpa pemanggil uji"); return; }   // aksi yang tak punya fungsi (mis. hapus laju) tak bisa dipanggil sama sekali
    if (boleh) { const r = await f(p); if (r?.run) await r.run(); }
    else await assert.rejects(async () => { const r = await f(p); if (r?.run) await r.run(); }, e => e instanceof H.Galat && e.status === 403);
  });
}

test("diri hanya menyentuh barisnya sendiri; jejak diri hanya atas namanya", async () => {
  const d = H.pelakuDiri(ID);
  assert.throws(() => H.stmtSandi(env, d, "orang-lain-xxxx", "g", "s", 0), e => e.status === 403);
  assert.throws(() => H.stmtSesiLain(env, d, "orang-lain-xxxx", "t"), e => e.status === 403);
  assert.throws(() => H.stmtJejak(env, d, "staf:orang-lain", "staf:x", "uji", null, null, kini), e => e.status === 403);
});

test("tulisJejak menolak tulis tanpa jejak dan pelaku sistem; tulisSistem hanya sistem", async () => {
  const s = H.stmtSesiBasi(env, H.pelakuAdmin, ID, 0);
  assert.throws(() => H.tulisJejak(env, H.pelakuAdmin, [s], null));
  assert.throws(() => H.tulisJejak(env, H.pelakuSistem, [s], s), e => e.status === 403);
  assert.throws(() => H.tulisSistem(env, H.pelakuAdmin, [s]), e => e.status === 403);
});

/* ---- rute sungguhan: tiap tulis admin/diri meninggalkan baris pantau_jejak ---- */
const kirim = (m, j, h = {}, b = {}) => mf.dispatchFetch("http://t.lokal" + j, {method: m, headers: {...h, "content-type": "application/json", origin: "http://t.lokal", "x-pb": "1", "cf-connecting-ip": "203.0.113.9"}, body: m === "POST" ? JSON.stringify(b) : undefined})
  .then(async r => ({s: r.status, j: await r.json().catch(() => ({})), h: r.headers}));
const adm = {"x-admin-token": ADMIN};

test("rute admin buat, reset, ubah, cabut: tiap tulis ada jejaknya", async () => {
  const b = await kirim("POST", "/api/staf/admin/buat", adm, {...V, nip: "7770001"});
  assert.equal(b.s, 201, JSON.stringify(b.j));
  const id = b.j.staf.id, n = aksi => jml("SELECT count(*) n FROM pantau_jejak WHERE obyek = ? AND aksi = ?", "staf:" + id, aksi);
  assert.equal(await n("buat"), 1);
  for (const [aksi, extra] of [["reset", {}], ["ubah", {peran: ["udara"], wilayah: []}], ["cabut", {}]]) {
    const r = await kirim("POST", "/api/staf/admin/" + id, adm, {aksi, ...extra});
    assert.equal(r.s, 200, `${aksi}: ${JSON.stringify(r.j)}`);
    assert.equal(await n(aksi), 1, `jejak ${aksi}`);
  }
  assert.equal(await jml("SELECT count(*) n FROM staf_sesi WHERE staf_id = ?", id), 0);
  assert.equal((await DB.prepare("SELECT status FROM staf WHERE id = ?").bind(id).first()).status, "dicabut");
});

test("rute admin tanpa Super Admin ditolak 403 dan tidak menulis jejak", async () => {
  const sebelum = await jml("SELECT count(*) n FROM pantau_jejak");
  const r = await kirim("POST", "/api/staf/admin/buat", {}, {...V, nip: "7770002"});
  assert.ok([401, 403].includes(r.s), String(r.s));
  assert.equal(await jml("SELECT count(*) n FROM pantau_jejak"), sebelum);
});

test("rute diri ganti sandi: jejak ganti_sandi; masuk salah menulis laju; keluar menghapus sesi", async () => {
  const g = await kirim("POST", "/api/staf/gantisandi", {cookie: "sesi_staf=" + TOK});
  assert.equal(g.s, 200, JSON.stringify(g.j));
  assert.equal(await jml("SELECT count(*) n FROM pantau_jejak WHERE oleh = ? AND aksi = 'ganti_sandi'", "staf:" + ID), 1);
  const m = await kirim("POST", "/api/staf/masuk", {}, {username: "uji" + "hakb", sandi: "salah"});
  assert.equal(m.s, 401);
  assert.ok(await jml("SELECT count(*) n FROM laju_bnpb WHERE aksi = 'staf.gagal_u'") >= 1);
  const k = await kirim("POST", "/api/staf/keluar", {cookie: "sesi_staf=" + TOK});
  assert.equal(k.s, 200);
  assert.equal(await jml("SELECT count(*) n FROM staf_sesi WHERE token_sha = ?", sha(TOK)), 0);
});
