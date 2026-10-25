/* Buku kontak pemangku kepentingan: src/kontak.js di workerd (Miniflare) dengan D1 lokal sungguhan, migrasi apa adanya.
   Jalankan: node --test tests/warga/kontak.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: kontak.js dan worker.js saling impor
import {normalWa, sahkanKontak} from "../../src/kontak.js";

const ADMIN = {"x-admin-token": "rahasia-admin"};
const aset = async req => {
  const f = path.join(AKAR, "public", decodeURIComponent(new URL(req.url).pathname));
  return existsSync(f) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-kontak"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"},
    serviceBindings: {ASSETS: aset}, cache: false});
  DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
let ip = 1;
const api = async (metode, j, body, h = {}) => {
  const r = await mf.dispatchFetch("http://kontak.lokal" + j, {method: metode, headers: {"content-type": "application/json", "cf-connecting-ip": "10.0.0." + ip, ...h}, body: body ? JSON.stringify(body) : undefined});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t, h: r.headers};
};
const n = async () => (await DB.prepare("SELECT count(*) n FROM kontak_pemangku").first()).n;
const BUPATI = {nama: "Ahmad Bupati", jabatan: "Bupati", lembaga: "Pemkab Pulang Pisau", kategori: "kepala_daerah", prov: "62", kab: "Pulang Pisau", wa: "0812-3456-7890"};

uji("normalWa: bentuk nomor Indonesia dinormalkan, selain itu DITOLAK", () => {
  for (const [a, b] of [["0812-3456-7890", "6281234567890"], ["+62 812 3456 7890", "6281234567890"], ["81234567890", "6281234567890"], ["6281234567890", "6281234567890"]]) assert.equal(normalWa(a), b, a);
  for (const x of [null, undefined, "", "  "]) assert.equal(normalWa(x), null);
  for (const x of ["021-555-1234", "12345", "0812", "+1 415 555 0100", "6281" + "9".repeat(13)]) assert.equal(normalWa(x), false, x);
});

uji("sahkanKontak: isian salah DITOLAK dengan alasan", () => {
  const ya = () => true, tidak = () => false;
  for (const [o, cek] of [[{...BUPATI, nama: ""}, ya], [{...BUPATI, jabatan: "x"}, ya], [{...BUPATI, kategori: "artis"}, ya], [{...BUPATI, prov: "99"}, ya],
    [{...BUPATI, prov: null}, ya], [BUPATI, tidak], [{...BUPATI, wa: "", email: ""}, ya], [{...BUPATI, email: "bukan-email"}, ya], [{...BUPATI, email: "a@b.co?bcc=x@y.z"}, ya], [{...BUPATI, email: "a@b.co#x"}, ya], [{...BUPATI, telepon: "abc"}, ya],
    [{...BUPATI, ambang: "kadang"}, ya], [{...BUPATI, notif: "ya"}, ya], [{...BUPATI, nama: 5}, ya], [{...BUPATI, diverifikasi: 123}, ya]])
    assert.ok(sahkanKontak(o, cek).galat, JSON.stringify(o));
  const k = sahkanKontak({...BUPATI, email: " Bupati@Pulpis.go.id "}, ya).k;
  assert.equal(k.wa, "6281234567890"); assert.equal(k.email, "bupati@pulpis.go.id"); assert.equal(k.notif, 1); assert.equal(k.ambang, "siaga");
  assert.equal(sahkanKontak({nama: "Kepala BNPB", jabatan: "Kepala", kategori: "bnpb", email: "a@bnpb.go.id"}, tidak).k.prov, null, "nasional tanpa provinsi");
});

uji("rute admin kontak: tanpa admin 403, tidak ada baris tertulis atau terbaca", async () => {
  assert.equal((await api("GET", "/api/kontak/admin")).s, 403);
  assert.equal((await api("POST", "/api/kontak/admin", BUPATI)).s, 403);
  assert.equal((await api("POST", "/api/kontak/admin", BUPATI, {"x-admin-token": "salah"})).s, 403);
  assert.equal((await api("POST", "/api/kontak/admin/impor", {baris: [BUPATI]})).s, 403);
  assert.equal((await api("POST", "/api/kontak/admin/0123456789abcdef", BUPATI)).s, 403);
  assert.equal((await api("POST", "/api/kontak/admin/hapus/0123456789abcdef", {})).s, 403);
  assert.equal((await api("POST", "/api/kontak/admin/setujui/0123456789abcdef", {})).s, 403);
  const hal = await mf.dispatchFetch("http://kontak.lokal/admin/kontak", {redirect: "manual"});
  assert.notEqual(hal.status, 200, "halaman admin tanpa sesi tidak dilayani"); await hal.text();
  assert.equal(await n(), 0);
});

uji("admin tambah, ubah, hapus: kab di luar provinsinya DITOLAK, baris aktif", async () => {
  assert.equal((await api("POST", "/api/kontak/admin", {...BUPATI, kab: "Kota Palembang"}, ADMIN)).s, 400, "Palembang bukan di Kalteng");
  const r = await api("POST", "/api/kontak/admin", BUPATI, ADMIN);
  assert.equal(r.s, 201, r.t);
  assert.equal(r.j.kontak.status, "aktif"); assert.equal(r.j.kontak.wa, "6281234567890"); assert.equal(r.j.kontak.setuju_pdp, null);
  const id = r.j.kontak.id;
  const u = await api("POST", "/api/kontak/admin/" + id, {...BUPATI, nama: "Ahmad Bupati, S.H.", notif: 0}, ADMIN);
  assert.equal(u.s, 200, u.t); assert.equal(u.j.kontak.nama, "Ahmad Bupati, S.H."); assert.equal(u.j.kontak.notif, 0); assert.equal(u.j.kontak.status, "aktif");
  assert.equal((await api("POST", "/api/kontak/admin/fedcba9876543210", BUPATI, ADMIN)).s, 404);
  assert.equal((await api("GET", "/api/kontak/admin", null, ADMIN)).j.kontak.length, 1);
  assert.equal((await api("POST", "/api/kontak/admin/hapus/" + id, {}, ADMIN)).s, 200);
  assert.equal(await n(), 0);
});

uji("impor CSV: satu baris salah = tidak ada yang masuk; semua sah = semua masuk", async () => {
  const sah = {nama: "Kalaksa BPBD", jabatan: "Kepala Pelaksana BPBD", kategori: "bpbd", prov: "62", email: "bpbd@kalteng.go.id"};
  const r = await api("POST", "/api/kontak/admin/impor", {baris: [sah, {...sah, kategori: "x"}]}, ADMIN);
  assert.equal(r.s, 400); assert.match(r.j.rincian[0], /^baris 3: /, "baris 1 = judul, baris kedua data = baris 3");
  assert.equal(await n(), 0);
  assert.equal((await api("POST", "/api/kontak/admin/impor", {baris: []}, ADMIN)).s, 400);
  const ok = await api("POST", "/api/kontak/admin/impor", {baris: [sah, BUPATI]}, ADMIN);
  assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.masuk, 2); assert.equal(await n(), 2);
  await DB.prepare("DELETE FROM kontak_pemangku").run();
});

uji("registrasi publik: tanpa persetujuan PDP DITOLAK; sah masuk menunggu, diverifikasi dari publik dibuang", async () => {
  assert.equal((await api("GET", "/api/kontak/konfig")).j.provinsi["62"], "Kalimantan Tengah");
  const hal = await mf.dispatchFetch("http://kontak.lokal/daftar-kontak");
  assert.equal(hal.status, 200); assert.match(hal.headers.get("content-security-policy"), /script-src 'self'/); await hal.text();
  assert.equal((await api("POST", "/api/kontak/daftar", BUPATI)).s, 400, "setuju wajib");
  const r = await api("POST", "/api/kontak/daftar", {...BUPATI, setuju: true, diverifikasi: Date.now()});
  assert.equal(r.s, 201, r.t); assert.deepEqual(r.j, {ok: true}, "jawaban tidak memuat data");
  const b = await DB.prepare("SELECT status, setuju_pdp, diverifikasi, oleh FROM kontak_pemangku").first();
  assert.equal(b.status, "menunggu"); assert.ok(b.setuju_pdp > 0); assert.equal(b.diverifikasi, null); assert.equal(b.oleh, "registrasi");
  assert.equal((await api("GET", "/api/kontak/konfig")).j.kontak, undefined, "rute publik tidak memuat kontak");
});

uji("registrasi publik: nomor yang sama dibatasi 3 per hari walau ganti IP", async () => {
  for (let i = 0; i < 2; i++) { ip++; assert.equal((await api("POST", "/api/kontak/daftar", {...BUPATI, setuju: true})).s, 201); }
  ip++; assert.equal((await api("POST", "/api/kontak/daftar", {...BUPATI, setuju: true})).s, 429);
  assert.equal(await n(), 3);
});

uji("admin menyetujui registrasi: menunggu jadi aktif, yang sudah aktif 404", async () => {
  const id = (await DB.prepare("SELECT id FROM kontak_pemangku LIMIT 1").first()).id;
  const r = await api("POST", "/api/kontak/admin/setujui/" + id, {}, ADMIN);
  assert.equal(r.s, 200, r.t);
  assert.equal((await DB.prepare("SELECT status FROM kontak_pemangku WHERE id = ?").bind(id).first()).status, "aktif");
  assert.equal((await api("POST", "/api/kontak/admin/setujui/" + id, {}, ADMIN)).s, 404);
});

uji("migrasi 0053: CHECK menolak baris tanpa WA dan email, kab tanpa prov, menunggu tanpa persetujuan", async () => {
  const sisip = (kolom, nilai) => DB.prepare(`INSERT INTO kontak_pemangku (id, nama, jabatan, kategori, dibuat, diubah, ${kolom}) VALUES ('aaaaaaaaaaaaaaaa', 'Nama', 'Jabatan', 'bpbd', 1, 1, ${nilai})`).run();
  await assert.rejects(sisip("prov", "'62'"), /CHECK/, "tanpa wa dan email");
  await assert.rejects(sisip("kab, email", "'Pulang Pisau', 'a@b.id'"), /CHECK/, "kab tanpa prov");
  await assert.rejects(sisip("status, email", "'menunggu', 'a@b.id'"), /CHECK/, "menunggu tanpa setuju_pdp");
  await assert.rejects(sisip("wa", "'0812345678'"), /CHECK/, "wa tidak dinormalkan");
});

uji("registrasi publik: antrean menunggu penuh (500) DITOLAK 503 tanpa menyebut migrasi", async () => {
  await DB.prepare(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 500)
    INSERT INTO kontak_pemangku (id, nama, jabatan, kategori, email, status, setuju_pdp, dibuat, diubah) SELECT printf('%016x', i + 4096), 'Nama', 'Jabatan', 'bpbd', 'x' || i || '@b.id', 'menunggu', 1, 1, 1 FROM n`).run();
  ip++;
  const r = await api("POST", "/api/kontak/daftar", {...BUPATI, wa: "081299990000", setuju: true});
  assert.equal(r.s, 503, r.t); assert.doesNotMatch(r.t, /migrasi|0053/);
});
