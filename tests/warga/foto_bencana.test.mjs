/* Foto per bencana (migrasi 0013, MODUL-PLUG-AND-PLAY §3 foto): kolom `bencana`, kategori per bencana dari tabel rujukan foto_kategori,
   GET /api/foto?bencana=, gagal lunak sebelum migrasi dijalankan, dan halaman statistik/skrip modul yang digerakkan registry.
   Worker di workerd (Miniflare) dengan D1 + R2 lokal sungguhan. Jalankan: node --test tests/warga/foto_bencana.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah, JPEG_SAH, WEBP_SAH} from "./_bantu.mjs";

const REG = JSON.parse(readFileSync(path.join(AKAR, "public/bencana.json"), "utf8")).bencana, ADMIN = {"x-admin-token": "rahasia-admin"};
const aset = async req => { const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p.endsWith("/") ? p + "index.html" : p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404}); };
const opsi = nama => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
  compatibilityDate: "2024-09-23", d1Databases: {DB: nama}, r2Buckets: {MEDIA: nama + "-r2"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"}, serviceBindings: {ASSETS: aset}, cache: false});
const JPEG = JPEG_SAH, WEBP = WEBP_SAH;
let n = 0; const ipBaru = () => `10.9.${Math.floor(++n / 250)}.${n % 250}`;
const unggahDi = async (mf, isian) => { const f = new FormData();
  const t = Date.now();   // anti GPS palsu (src/gps.js, migrasi 0015): >= 3 bacaan berurutan, yang terakhir = titik kiriman dan waktu_gps
  const sampel = JSON.stringify([[-2.21002, 113.91999, 18, t - 2000], [-2.20999, 113.92002, 16, t - 1000], [-2.21, 113.92, 15, t]]);
  for (const [k, v] of Object.entries({kategori: "api", lat: "-2.2100", lon: "113.9200", akurasi: "15", waktu_gps: String(t), setuju: "1", keterangan: "uji", sampel, ...isian})) f.append(k, v);
  f.append("media", new File([JPEG], "a.bin")); f.append("thumb", new File([WEBP], "t.bin"));
  const r0 = new Response(f), body = new Uint8Array(await r0.arrayBuffer());   // Content-Length eksplisit, seperti peramban (server mewajibkannya)
  return mf.dispatchFetch("http://warga.lokal/api/foto", {method: "POST", body, headers: {"cf-connecting-ip": ipBaru(), "content-type": r0.headers.get("content-type"), "content-length": String(body.length)}, cf: {country: "ID"}}).then(async r => ({s: r.status, j: await r.json()})); };
const ambil = async (mf, jalur) => { const r = await mf.dispatchFetch("http://warga.lokal" + jalur, {headers: {"cf-connecting-ip": "10.8.8.8"}}); return {s: r.status, j: await r.json().catch(() => null)}; };
const setujui = (mf, id) => mf.dispatchFetch("http://warga.lokal/api/foto/admin/" + id, {method: "POST", headers: {"content-type": "application/json", "cf-connecting-ip": "10.8.8.8", ...ADMIN}, body: JSON.stringify({aksi: "setujui"})});

let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
let mf, DB;
before(async () => { mf = new Miniflare(opsi("uji-fb")); DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s))); });
after(() => mf?.dispose());

uji("migrasi 0013: bagian tabel rujukan idempoten dan seed = foto_kategori tiap bencana di registry", async () => {
  const ulang = pecah(migrasi()).filter(s => /foto_kategori/.test(s) && !/^ALTER/.test(s) && !/^CREATE TRIGGER/.test(s));
  await DB.batch(ulang.map(s => DB.prepare(s)));   // dijalankan ulang: IF NOT EXISTS / INSERT OR IGNORE tidak melempar
  const baris = (await DB.prepare("SELECT bencana, kode, nama FROM foto_kategori ORDER BY bencana, kode").all()).results;
  const harap = REG.flatMap(b => (b.foto_kategori || []).map(([kode, nama]) => ({bencana: b.id, kode, nama}))).sort((a, b) => (a.bencana + a.kode).localeCompare(b.bencana + b.kode));
  assert.deepEqual(baris, harap, "foto_kategori di D1 harus sama dengan public/bencana.json (bencana baru = migrasi seed baru)");
});

test("tiap bencana registry: unggah kategorinya sah, disaring per ?bencana=, tidak bocor ke bencana lain", async () => {
  const id = {};
  for (const b of REG) {
    const [kode] = b.foto_kategori[0];
    const r = await unggahDi(mf, {bencana: b.id, kategori: kode});
    assert.equal(r.s, 201, `${b.id}/${kode}: ${JSON.stringify(r.j)}`);
    assert.equal((await setujui(mf, r.j.id)).status, 200); id[b.id] = r.j.id;
  }
  for (const b of REG) {
    const d = await ambil(mf, "/api/foto?bencana=" + b.id);
    assert.equal(d.s, 200); assert.deepEqual(d.j.foto.map(f => f.id), [id[b.id]], `${b.id}: hanya fotonya sendiri`);
    assert.equal(d.j.foto[0].bencana, b.id); assert.equal(d.j.foto[0].kategori, b.foto_kategori[0][0]);
    assert.deepEqual(Object.keys(d.j.kategori), b.foto_kategori.map(k => k[0]));
  }
  assert.deepEqual((await ambil(mf, "/api/foto")).j.foto.map(f => f.id), [id.karhutla], "tanpa ?bencana= = karhutla, persis seperti sebelum 0013");
  assert.equal((await ambil(mf, "/api/foto/" + id.banjir)).j.bencana, "banjir", "rincian membawa bencana");
});

test("kategori dari bencana lain dan bencana tak dikenal ditolak server (400)", async () => {
  assert.equal((await unggahDi(mf, {bencana: "banjir", kategori: "api"})).s, 400, "api bukan kategori banjir");
  assert.equal((await unggahDi(mf, {bencana: "karhutla", kategori: "genangan"})).s, 400, "genangan bukan kategori karhutla");
  assert.equal((await unggahDi(mf, {bencana: "tsunami", kategori: "api"})).s, 400);
  assert.equal((await ambil(mf, "/api/foto?bencana=tsunami")).s, 400);
  assert.equal((await unggahDi(mf, {kategori: "api"})).s, 201, "tanpa field bencana = karhutla");
});

uji("trigger foto_kategori_sah menolak pasangan (bencana, kode) di luar tabel rujukan walau lewat SQL langsung", async () => {
  const sisip = (ben, kat, katb) => DB.prepare("INSERT INTO foto (id, jenis, kategori, lat, lon, akurasi, prov, kab, kec, keterangan, nama, tampil_nama, email, diambil, dibuat, exif_waktu, exif_jarak, kamera, ukuran, durasi, mime, ip_hash, bencana, kategori_b) VALUES (?, 'foto', ?, -2.2, 113.9, 10, '62', 'x', 'y', '', '', 0, '', 1, ?, 0, NULL, 0, 10, NULL, 'image/jpeg', '" + "h".repeat(64) + "', ?, ?)")
    .bind(Math.random().toString(16).slice(2, 18).padEnd(16, "0"), kat, Date.now(), ben, katb).run();
  await assert.rejects(sisip("banjir", "lainnya", "api"), /kategori foto tidak dikenal/);
  await assert.rejects(sisip("ngawur", "api", ""), /kategori foto tidak dikenal/);
  await sisip("banjir", "lainnya", "rob");
});

test("gagal lunak: tanpa migrasi 0013 karhutla tetap jalan, bencana lain kosong (GET) / 503 (unggah)", async () => {
  const dir = path.join(AKAR, "migrations");
  const lama = readdirSync(dir).filter(f => f.endsWith(".sql") && !f.startsWith("0013")).sort().map(f => readFileSync(path.join(dir, f), "utf8")).join("\n");
  const m2 = new Miniflare(opsi("uji-fb-lama"));
  try {
    const d2 = await m2.getD1Database("DB"); await d2.batch(pecah(lama).map(s => d2.prepare(s)));
    assert.equal((await unggahDi(m2, {kategori: "api"})).s, 201, "karhutla seperti dulu");
    assert.equal((await unggahDi(m2, {bencana: "banjir", kategori: "genangan"})).s, 503);
    assert.deepEqual((await ambil(m2, "/api/foto?bencana=banjir")).j.foto, []);
    assert.equal((await ambil(m2, "/api/foto")).s, 200);
  } finally { await m2.dispose(); }
});

test("POST /api/jejak menerima halaman tiap bencana registry dan menolak yang tak dikenal (HAL dari registry)", async () => {
  const kirim = h => mf.dispatchFetch("http://warga.lokal/api/jejak", {method: "POST", headers: {"content-type": "application/json", "cf-connecting-ip": ipBaru(), "user-agent": "Mozilla/5.0 (X11; Linux) Chrome/129.0"},
    body: JSON.stringify({v: String(++n).padStart(24, "a"), h, o: 1, b: 0, kv: 1, k: 1, d: 10, s: [], e: [["tampil", "peta"]]})}).then(r => r.status);
  for (const b of REG) assert.equal(await kirim(b.id), 204, b.id);
  assert.equal(await kirim("tsunami"), 400);
});

test("skrip modul: tiap halaman bencana memuat jejak.js (data-halaman = id) dan kaki.js; jejak.js tanpa nama bencana tertulis tangan", () => {
  for (const b of REG) {
    const h = readFileSync(path.join(AKAR, "public", b.rute === "/" ? "" : b.rute, "index.html"), "utf8");
    assert.match(h, new RegExp(`<script src="(\\.\\./)?jejak\\.js" data-halaman="${b.id}"`), `${b.id}: jejak.js`);
    assert.match(h, /<script src="(\.\.\/)?kaki\.js"/, `${b.id}: kaki.js`);
  }
  assert.ok(!/banjir\|warga/.test(readFileSync(path.join(AKAR, "public/jejak.js"), "utf8")), "jejak.js: awalan rute dari registry");
});
