/* Kode logbook terdeploy SEBELUM migrasi 0094 diterapkan: D1 tanpa tabel samping. Semua rute lama harus tetap 200 berbentuk lama; medan juklak diabaikan dengan peringatan; hanya rute SK 503. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";


const uji = test;
const sha = s => createHash("sha256").update(s).digest("hex");
const TOK = "c".repeat(64), TOK_LUAR = "d".repeat(64);
const HARI = 864e5, TUTUP = {tgl_tuntas: new Date().toISOString().slice(0, 10), kondisi_akhir: "Air surut, pengungsi kembali"};
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-logbook-tanpa0094"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha("rahasia-admin").slice(0, 12)},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, cache: false});
  DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi().split("-- Logbook sesuai Juklak BNPB 7/2023")[0]).map(s => DB.prepare(s)));
  for (const [id, un, tok, peran] of [["s1s1s1s1s1s1s1s1", "pusdalopsa", TOK, '["pusdalops"]'], ["s2s2s2s2s2s2s2s2", "kampusa", TOK_LUAR, '["kemitraan"]']])
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, "2000" + id.slice(1, 2) + "000", un + "@b.id", "62812000000" + id.slice(1, 2) + "0", peran),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3)]);
});
after(() => mf?.dispose());

const orig = {origin: "http://logbook.lokal"}, ADMIN = {"x-admin-token": "rahasia-admin", ...orig};
const STAF = {cookie: "sesi_staf=" + TOK, "x-pb": "1", ...orig}, LUAR = {cookie: "sesi_staf=" + TOK_LUAR, "x-pb": "1", ...orig};
const call = async (m, j, h = STAF, b) => { const r = await mf.dispatchFetch("http://logbook.lokal" + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b === undefined ? undefined : JSON.stringify(b)}); return {status: r.status, cc: r.headers.get("cache-control"), vary: r.headers.get("vary"), j: await r.json().catch(() => null)}; };
const KAB = "33|Banjarnegara", hariIni = () => new Date().toISOString().slice(0, 10);
const baru = {jenis: "longsor", kab: KAB, kec: "Pandanarum", desa: "Tulis", lat: -7.3, lon: 109.7, mulai: hariIni(), md: 2, hilang: 5, luka: 3, mengungsi_jiwa: 120, mengungsi_kk: 40, rumah_rb: 4, kendala: ["akses", "sinyal"], kebutuhan: ["tenda", "makanan"], catatan: "akses jalan putus", sumber_instansi: "BPBD Banjarnegara"};
const n = async t => (await DB.prepare(`SELECT count(*) n FROM ${t}`).first()).n;

uji("logbook tanpa 0094: buat, lanjut, buka, hari tetap 200 berbentuk lama; medan juklak diabaikan dengan peringatan; SK 503; dummy jalan", async () => {
  assert.equal(await n("sqlite_master WHERE name LIKE 'logbook_kib'"), 0, "memang tanpa 0094");
  const a = await call("POST", "/api/logbook/kejadian", STAF, baru); assert.equal(a.status, 201, JSON.stringify(a.j)); assert.equal(a.j.juklak, undefined, "tanpa medan baru tanpa peringatan");
  assert.equal(a.j.entri.md, 2); assert.deepEqual(a.j.entri.kendala, ["akses", "sinyal"]); assert.equal(a.j.kejadian.status, "buka"); assert.equal(a.j.kejadian.kib, undefined);
  const id = a.j.kejadian.id;
  const b = await call("POST", "/api/logbook/kejadian", STAF, {...baru, kab: "33|Cilacap", kab_bps: "3301", kerugian_juta: 10, rentan: {bayi: 1}}); assert.equal(b.status, 201, JSON.stringify(b.j)); assert.equal(b.j.juklak, "menunggu migrasi 0094");
  assert.equal((await call("POST", "/api/logbook/kejadian", STAF, {...baru, kerugian_juta: -1})).status, 400, "validasi tetap jalan");
  const l = await call("POST", `/api/logbook/kejadian/${id}/entri`, STAF, {md: 4, pemberi: ["BPBD"]}); assert.equal(l.status, 201, JSON.stringify(l.j)); assert.equal(l.j.entri.md, 4); assert.equal(l.j.juklak, "menunggu migrasi 0094");
  assert.equal((await call("POST", `/api/logbook/kejadian/${id}/entri`, STAF, {md: 5})).j.juklak, undefined);
  const bk = await call("GET", "/api/logbook/buka?kab=" + encodeURIComponent(KAB)); assert.equal(bk.status, 200); assert.equal(bk.j.kejadian[0].entri_terkini.md, 5); assert.equal(bk.j.kejadian[0].dummy, false);
  const h = await call("GET", "/api/logbook/hari?tgl=" + hariIni()); assert.equal(h.status, 200); assert.ok(h.j.entri.length >= 4); assert.ok(h.j.entri[0].kejadian_mulai); assert.equal(h.j.entri[0].kib ?? null, null);
  assert.equal((await call("POST", `/api/logbook/kejadian/${id}/tutup`, STAF, TUTUP)).status, 200);
  for (const [m, j, bd] of [["POST", `/api/logbook/kejadian/${id}/sk`, {tingkat: "siaga", wilayah: "prov", nomor: "1", tmt_mulai: "2026-11-01"}], ["GET", `/api/logbook/kejadian/${id}/sk`]]) { const r = await call(m, j, STAF, bd); assert.equal(r.status, 503, j); assert.match(r.j.galat, /0094/); }
  assert.equal((await call("POST", "/api/logbook/dummy", ADMIN, {aksi: "isi"})).status, 201); assert.equal((await call("POST", "/api/logbook/dummy", ADMIN, {aksi: "hapus"})).status, 200);
  assert.equal(await n("logbook_kejadian WHERE dummy = 1"), 0);
});
