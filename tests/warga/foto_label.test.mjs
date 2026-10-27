/* Label kerusakan foto (0071 foto_label, src/foto_label.js) di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan, migrasi apa adanya. Tanpa mock.
   Jalankan: node --test tests/warga/foto_label.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: modul rute dan worker.js saling impor
import {kesepakatan, AMBANG_LABEL, KELAS} from "../../src/foto_label.js";

const A = {"x-admin-token": "rahasia-a"}, B = {"x-admin-token": "rahasia-b"};
const aset = async req => { const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404}); };
let mf, DB, R2;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-label"}, r2Buckets: {MEDIA: "media-label"},
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-a,rahasia-b"}, serviceBindings: {ASSETS: aset}, cache: false});
  DB = await mf.getD1Database("DB"); R2 = await mf.getR2Bucket("MEDIA");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());
const api = (j, o = {}) => mf.dispatchFetch("http://warga.lokal" + j, o);
const post = (j, body, h = A) => api(j, {method: "POST", headers: {"content-type": "application/json", ...h}, body: JSON.stringify(body)});
const get = (j, h = A) => api(j, {headers: h});
const T0 = 1_760_000_000_000;
let nid = 0; const id = () => (++nid).toString(16).padStart(16, "0");
async function foto(o = {}) {
  const i = o.id || id();
  await DB.prepare(`INSERT INTO foto (id, jenis, kategori, lat, lon, akurasi, diambil, dibuat, ukuran, mime, status, ip_hash, dummy) VALUES (?, 'foto', 'dampak', ?, ?, 10, ?, ?, 1000, 'image/jpeg', ?, ?, ?)`)
    .bind(i, o.lat ?? -2.21, o.lon ?? 113.92, o.dibuat ?? T0, o.dibuat ?? T0, o.status || "tayang", "a".repeat(64), o.dummy ? 1 : 0).run();
  return i;
}
const label = async (h, sumber, foto_id, kelas, jenis_objek) => (await post("/api/labelfoto/simpan", {sumber, foto_id, kelas, jenis_objek}, h)).status;
const baris = async () => (await DB.prepare("SELECT * FROM foto_label ORDER BY waktu").all()).results;
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});

uji("label foto: migrasi 0071 idempoten; CHECK kelas dan jenis_objek; unik per pelabel", async () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0071_foto_label.sql"), "utf8");
  for (let k = 0; k < 2; k++) await DB.batch(pecah(sql).map(s => DB.prepare(s)));   // diterapkan lagi di atas yang sudah ada
  const ins = (kelas, jenis, pelabel = "p1") => DB.prepare("INSERT INTO foto_label (sumber, foto_id, pelabel, kelas, jenis_objek, waktu) VALUES ('foto', ?, ?, ?, ?, 1)").bind("f".repeat(16), pelabel, kelas, jenis).run();
  await assert.rejects(ins("rusak_parah", null), /CHECK/);
  await assert.rejects(ins("rusak_berat", "kapal"), /CHECK/);
  await ins("rusak_berat", null);
  await assert.rejects(ins("tidak_rusak", null), /UNIQUE|PRIMARY/);
  await ins("tidak_rusak", "rumah", "p2");   // pelabel lain boleh
  await assert.rejects(DB.prepare("INSERT INTO foto_label (sumber, foto_id, pelabel, kelas, waktu) VALUES ('lain', ?, 'p', 'rusak_berat', 1)").bind("f".repeat(16)).run(), /CHECK/);
  await DB.prepare("DELETE FROM foto_label").run();
});

uji("label foto: semua rute admin saja (403 tanpa token)", async () => {
  const i = await foto();
  for (const [m, j, b] of [["GET", "/api/labelfoto/antre"], ["GET", "/api/labelfoto/statistik"], ["GET", "/api/labelfoto/ekspor"], ["GET", `/api/labelfoto/media/${i}?s=foto`],
    ["POST", "/api/labelfoto/simpan", {sumber: "foto", foto_id: i, kelas: "rusak_berat"}], ["POST", "/api/labelfoto/dummy", {aksi: "isi"}], ["GET", "/admin/labelfoto"]]) {
    const r = await api(j, m === "GET" ? {redirect: "manual"} : {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(b)});
    assert.ok(r.status === 403 || r.status === 303, `${m} ${j} -> ${r.status}`);
  }
  assert.equal((await baris()).length, 0);
  assert.equal((await get("/admin/labelfoto", {...A, accept: "text/html"})).status, 200);   // admin berhasil membuka halamannya
});

uji("label foto: validasi simpan; hanya foto tayang yang bisa dilabel", async () => {
  const ok = await foto(), menunggu = await foto({status: "menunggu"}), ditolak = await foto({status: "ditolak"});
  assert.equal(await label(A, "gudang", ok, "rusak_berat"), 400);
  assert.equal(await label(A, "foto", "pendek", "rusak_berat"), 400);
  assert.equal(await label(A, "foto", ok, "hancur"), 400);
  assert.equal(await label(A, "foto", ok, "rusak_berat", "kapal"), 400);
  assert.equal(await label(A, "foto", id(), "rusak_berat"), 404);
  assert.equal(await label(A, "foto", menunggu, "rusak_berat"), 404);
  assert.equal(await label(A, "foto", ditolak, "rusak_berat"), 404);
  assert.equal(await label(A, "uji_pilot", ok, "rusak_berat"), 404);   // id foto warga bukan id uji pilot
  assert.equal((await baris()).length, 0);
});

uji("label foto: simpan, ubah, dan dua pelabel pada satu foto", async () => {
  const f = await foto();
  assert.equal(await label(A, "foto", f, "rusak_berat", "rumah"), 200);
  assert.equal(await label(A, "foto", f, "rusak_sedang"), 200);   // ubah: tetap satu baris
  let b = await baris(); assert.equal(b.length, 1); assert.equal(b[0].kelas, "rusak_sedang"); assert.equal(b[0].jenis_objek, null); assert.equal(b[0].pelabel.length, 12);
  assert.equal(await label(B, "foto", f, "rusak_sedang", "sekolah"), 200);
  b = await baris(); assert.equal(b.length, 2); assert.notEqual(b[0].pelabel, b[1].pelabel);
  await DB.prepare("DELETE FROM foto_label").run();
});

uji("label foto: antre terbaru dulu, hanya yang lolos moderasi dan belum saya label, paginasi", async () => {
  await DB.prepare("DELETE FROM foto").run();
  const ids = []; for (let k = 0; k < 5; k++) ids.push(await foto({dibuat: T0 + k * 1000}));
  await foto({status: "menunggu", dibuat: T0 + 99000});
  await DB.prepare("INSERT INTO uji_pilot_lapor (id, lokasi, tahap, lat, lon, akurasi, diambil, dibuat, mime, ukuran, sha256) VALUES (?, 1, 'tiba', -2.2, 113.9, 5, ?, ?, 'image/jpeg', 100, ?)")
    .bind(id(), T0 + 500, T0 + 500, "b".repeat(64)).run();
  let j = await (await get("/api/labelfoto/antre?batas=3")).json();
  assert.equal(j.foto.length, 3); assert.equal(j.sisa, 6); assert.equal(j.foto[0].id, ids[4]); assert.ok(j.berikut);
  assert.equal(j.foto[0].url, `/api/foto/media/${ids[4]}`); assert.ok(j.foto.every(x => x.id !== undefined && x.lat === -2.21));
  const j2 = await (await get(`/api/labelfoto/antre?batas=3&sebelum=${encodeURIComponent(j.berikut)}`)).json();
  assert.equal(j2.foto.length, 3); assert.equal(j2.berikut, null);
  assert.ok([...j.foto, ...j2.foto].some(x => x.sumber === "uji_pilot" && x.url.startsWith("/api/labelfoto/media/")));
  assert.equal((await get("/api/labelfoto/antre?sebelum=ngawur")).status, 400);
  await label(A, "foto", ids[4], "tidak_rusak");
  j = await (await get("/api/labelfoto/antre?batas=50")).json(); assert.equal(j.sisa, 5); assert.ok(!j.foto.some(x => x.id === ids[4]));
  j = await (await get("/api/labelfoto/antre?batas=50", B)).json(); assert.equal(j.sisa, 6);   // B masih bisa melabelinya (pelabel kedua)
  j = await (await get("/api/labelfoto/antre?batas=50&mode=baru", B)).json(); assert.equal(j.sisa, 5);   // mode baru: belum dilabel siapa pun
  await DB.prepare("DELETE FROM foto_label").run();
});

uji("label foto: kesepakatan dan Cohen kappa dari contoh hitungan tangan", async () => {
  const baris = [["f1", "rusak_berat", "rusak_berat"], ["f2", "rusak_berat", "tidak_rusak"], ["f3", "tidak_rusak", "tidak_rusak"], ["f4", "tidak_rusak", "tidak_rusak"]]
    .flatMap(([k, a, b]) => [{k, pelabel: "a", kelas: a}, {k, pelabel: "b", kelas: b}]);
  assert.deepEqual(kesepakatan(baris), {foto_ganda: 4, pasangan: 1, persen: 0.75, kappa: 0.5});   // po .75, pe .5 -> kappa .5
  assert.equal(kesepakatan([]).kappa, null);
  assert.equal(kesepakatan([{k: "x", pelabel: "a", kelas: "tidak_rusak"}, {k: "x", pelabel: "b", kelas: "tidak_rusak"}]).kappa, null);   // pe = 1: tak terdefinisi
  assert.equal(AMBANG_LABEL, 500); assert.equal(KELAS.length, 6);
});

uji("label foto: statistik per kelas, kesepakatan, dan foto yang ditolak sesudah dilabel tak dihitung", async () => {
  await DB.prepare("DELETE FROM foto").run(); await DB.prepare("DELETE FROM uji_pilot_lapor").run();
  const f = []; for (let k = 0; k < 4; k++) f.push(await foto({dibuat: T0 + k}));
  const A1 = ["rusak_berat", "rusak_berat", "tidak_rusak", "tidak_rusak"], B1 = ["rusak_berat", "tidak_rusak", "tidak_rusak", "tidak_rusak"];
  for (let k = 0; k < 4; k++) { await label(A, "foto", f[k], A1[k]); await label(B, "foto", f[k], B1[k]); }
  let s = await (await get("/api/labelfoto/statistik")).json();
  assert.equal(s.ambang, 500); assert.equal(s.terlabel, 4); assert.equal(s.label_total, 8); assert.equal(s.saya, 4); assert.equal(s.total_foto, 4);
  assert.equal(s.per_kelas.rusak_berat, 3); assert.equal(s.per_kelas.tidak_rusak, 5); assert.equal(s.per_kelas.tidak_jelas, 0);
  assert.deepEqual(s.kesepakatan, {foto_ganda: 4, pasangan: 1, persen: 0.75, kappa: 0.5});
  await DB.prepare("UPDATE foto SET status = 'ditolak' WHERE id = ?").bind(f[0]).run();
  s = await (await get("/api/labelfoto/statistik")).json(); assert.equal(s.terlabel, 3); assert.equal(s.label_total, 6); assert.equal(s.total_foto, 3);
});

uji("label foto: ekspor membawa kunci R2, koordinat, tanggal, jenis bencana, semua label, dan kesepakatan", async () => {
  const r = await get("/api/labelfoto/ekspor"); assert.equal(r.status, 200);
  assert.match(r.headers.get("content-disposition"), /attachment/);
  const j = await r.json(); assert.equal(j.foto.length, 3); assert.deepEqual(j.kelas, KELAS); assert.equal(j.statistik.terlabel, 3);
  const x = j.foto[0];
  assert.equal(x.kunci_r2, `foto/${x.id}`); assert.equal(x.lat, -2.21); assert.equal(x.lon, 113.92); assert.equal(x.jenis_bencana, "karhutla");
  assert.equal(x.tanggal, new Date(T0 + 1).toISOString()); assert.equal(x.label.length, 2);
  assert.equal(x.kesepakatan.n_label, 2); assert.ok(j.foto.some(y => y.kesepakatan.sepakat === false && y.kesepakatan.kelas_mayoritas === null));
  assert.ok(j.foto.some(y => y.kesepakatan.sepakat === true && y.kesepakatan.kelas_mayoritas));
  assert.ok(!JSON.stringify(j).includes("ip_hash") && !JSON.stringify(j).includes("a".repeat(64)));   // tanpa data pribadi pengunggah
});

uji("label foto: media R2 untuk foto non-warga hanya admin, jenis dari kolom mime", async () => {
  const u = id(); await R2.put(`uji-pilot/${u}`, new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]));
  await DB.prepare("INSERT INTO uji_pilot_lapor (id, lokasi, tahap, lat, lon, akurasi, diambil, dibuat, mime, ukuran, sha256) VALUES (?, 1, 'tiba', -2.2, 113.9, 5, ?, ?, 'image/jpeg', 6, ?)").bind(u, T0, T0, "c".repeat(64)).run();
  const r = await get(`/api/labelfoto/media/${u}?s=uji_pilot`); assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "image/jpeg"); assert.equal((await r.arrayBuffer()).byteLength, 6);
  assert.equal((await api(`/api/labelfoto/media/${u}?s=uji_pilot`)).status, 403);
  assert.equal((await get(`/api/labelfoto/media/${u}?s=foto`)).status, 404);
  assert.equal((await get(`/api/labelfoto/media/${u}?s=gudang`)).status, 400);
  assert.equal(await label(A, "uji_pilot", u, "rusak_ringan"), 200);   // label foto uji pilot ikut tersimpan
  assert.equal((await baris()).filter(b => b.sumber === "uji_pilot").length, 1);
});

uji("label foto: dummy 409 tanpa foto dummy, isi, sudah ada 409, hapus tidak menyentuh label asli", async () => {
  await DB.prepare("DELETE FROM foto").run(); await DB.prepare("DELETE FROM foto_label").run();
  assert.equal((await post("/api/labelfoto/dummy", {aksi: "isi"})).status, 409);   // belum ada foto dummy tayang
  assert.equal((await post("/api/labelfoto/dummy", {aksi: "ngawur"})).status, 400);
  const asli = await foto(); await label(A, "foto", asli, "rusak_ringan");
  for (let k = 0; k < 12; k++) await foto({dummy: true, dibuat: T0 + k});
  const r = await post("/api/labelfoto/dummy", {aksi: "isi"}); assert.equal(r.status, 200);
  assert.equal((await post("/api/labelfoto/dummy", {aksi: "isi"})).status, 409);
  const s = await (await get("/api/labelfoto/statistik?dummy=1")).json();
  assert.equal(s.terlabel, 8); assert.ok(KELAS.every(k => s.per_kelas[k] > 0), "tiap kelas terisi"); assert.ok(s.kesepakatan.persen > 0 && s.kesepakatan.kappa != null);
  const q = await (await get("/api/labelfoto/antre?dummy=1&batas=50&mode=baru")).json(); assert.equal(q.sisa, 4);   // sepertiga dibiarkan belum dilabel siapa pun
  assert.equal((await (await get("/api/labelfoto/statistik")).json()).terlabel, 1);   // statistik asli tidak tercampur dummy
  assert.equal((await post("/api/labelfoto/dummy", {aksi: "hapus"})).status, 200);
  assert.deepEqual((await baris()).map(b => b.dummy), [0]);
});

uji("label foto: batas laju per pelabel dihitung di laju_bnpb", async () => {
  const f = await foto(); let kode = 0;
  for (let k = 0; k < 91 && kode !== 429; k++) kode = await label(B, "foto", f, KELAS[k % 6]);
  assert.equal(kode, 429);
  assert.equal(await label(A, "foto", f, "rusak_berat"), 200);   // pelabel lain tak terkena
});
