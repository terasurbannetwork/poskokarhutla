/* Foto laporan lapangan untuk staf login (src/foto_lapangan.js) di workerd (Miniflare) dengan D1 dan R2 lokal sungguhan, migrasi apa adanya.
   Dibuktikan: tamu ditolak (daftar dan media), /api/foto publik tidak memuat foto lapangan, staf sesi dan token admin menerima dua sumber,
   dummy / tanpa koordinat / lewat 90 hari / foto absen tidak keluar, respons tanpa nama, orang_id, kunci R2, id jahat ditolak, orang dianonimkan = foto hilang.
   Jalankan: node --test tests/warga/foto_lapangan.test.mjs */
import {test as uji, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah, JPEG_SAH} from "./_bantu.mjs";

const JAM = 3600e3, HARI = 24 * JAM, ADMIN = {"x-admin-token": "rahasia-admin"}, TOK = "c".repeat(64), STAF_ID = "c3".repeat(8);
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
let mf, DB, R2;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    d1Databases: {DB: "uji-foto-lap"}, r2Buckets: {MEDIA: "media-lap"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", AKUN_SITUS_X: "pemirsa:sandi-pemirsa"}, serviceBindings: {ASSETS: aset}, cache: false});
  DB = await mf.getD1Database("DB"); R2 = await mf.getR2Bucket("MEDIA");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  const kini = Date.now(), tulis = (k) => R2.put(k, JPEG_SAH, {httpMetadata: {contentType: "image/jpeg"}});
  await DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, 'stafuji', 'Staf Uji', '910000', 'Pusdalops', 'c@b.id', '628120000000', '["pusdalops"]', '[]', ?, ?, 0, 1, 'tes', 0)`).bind(STAF_ID, "a".repeat(32), "a".repeat(64)).run();
  await DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(createHash("sha256").update(TOK).digest("hex"), STAF_ID, kini + JAM).run();
  const orang = (id, dummy = 0) => DB.prepare("INSERT INTO orang (id, jenis, nama, prov, status, kode_sha, wajah_status, dibuat, diubah, dummy) VALUES (?, 'pegawai', 'Rahasia Nama Petugas', '62', 'aktif', ?, 'belum', 1, 1, ?)").bind(id, id.repeat(4), dummy);
  const tugas = (id, dummy = 0) => DB.prepare("INSERT INTO lp_tugas (id, judul, bencana, lat, lon, radius_m, mulai, selesai, dibuat, dummy) VALUES (?, 'Tugas', 'karhutla', -2.2, 113.9, 500, 1000, 2000, 1, ?)").bind(id, dummy);
  const lb = (id, o, t, dummy = 0) => DB.prepare("INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, waktu, diubah, dummy) VALUES (?, ?, ?, '2026-11-08', 'Patroli', 1, 1, ?)").bind(id, o, t, dummy);
  const fl = (id, lbk, key, sha, lat, lon, waktu, dummy = 0) => DB.prepare("INSERT INTO lp_logbook_foto (id, logbook_id, foto_key, sha256, lat, lon, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, lbk, key, sha.repeat(64).slice(0, 64), lat, lon, waktu, dummy);
  await DB.batch([orang("aaaaaaaaaaaaaaaa"), orang("dddddddddddddddd", 1), tugas("bbbbbbbbbbbbbbbb"), tugas("eeeeeeeeeeeeeeee", 1),
    lb("1111111111111111", "aaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbb"), lb("2222222222222222", "dddddddddddddddd", "eeeeeeeeeeeeeeee", 1)]);
  await DB.batch([fl("a0a0a0a0a0a0a0a0", "1111111111111111", "lapangan/logbook/a0a0a0a0a0a0a0a0.jpg", "1", -2.21, 113.92, kini - HARI),
    fl("a1a1a1a1a1a1a1a1", "1111111111111111", "lapangan/logbook/a1a1a1a1a1a1a1a1.jpg", "2", -2.21, 113.92, kini - 100 * HARI),   // lewat 90 hari
    fl("a2a2a2a2a2a2a2a2", "1111111111111111", "lapangan/logbook/a2a2a2a2a2a2a2a2.jpg", "3", null, null, kini - HARI),             // tanpa koordinat
    fl("a3a3a3a3a3a3a3a3", "2222222222222222", "lapangan/logbook/a3a3a3a3a3a3a3a3.jpg", "4", -2.21, 113.92, kini - HARI, 1)]);      // dummy
  const up = (id, dummy, mime = "image/jpeg") => DB.prepare(`INSERT INTO uji_pilot_lapor (id, lokasi, tahap, isi, nama, regu, catatan, lat, lon, akurasi, diambil, dibuat, mime, ukuran, sha256, ip_hash, dummy)
    VALUES (?, 1, 'injeksi', '{}', 'Nama Pelapor Rahasia', 'Regu Rahasia', 'catatan', -2.3, 113.95, 10, ?, ?, ?, 100, ?, 'iphashrahasia', ?)`)
    .bind(id, kini - 2 * HARI, kini - 2 * HARI, dummy ? null : mime, dummy ? null : id.repeat(4).slice(0, 64), dummy);
  await DB.batch([up("b0b0b0b0b0b0b0b0", 0), up("b1b1b1b1b1b1b1b1", 1)]);
  await DB.prepare(`INSERT INTO lp_absen (id, orang_id, tugas_id, jenis, tanggal, waktu, lat, lon, foto_key, foto_sha256, status, dummy) VALUES ('f0f0f0f0f0f0f0f0', 'aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'masuk', '2026-11-08', ?, -2.21, 113.92, 'lapangan/absen/f0f0f0f0f0f0f0f0.jpg', ?, 'lolos', 0)`).bind(kini, "9".repeat(64)).run();
  for (const k of ["lapangan/logbook/a0a0a0a0a0a0a0a0.jpg", "lapangan/logbook/a1a1a1a1a1a1a1a1.jpg", "lapangan/logbook/a2a2a2a2a2a2a2a2.jpg", "lapangan/logbook/a3a3a3a3a3a3a3a3.jpg",
    "uji-pilot/b0b0b0b0b0b0b0b0", "uji-pilot/b0b0b0b0b0b0b0b0_t", "uji-pilot/b1b1b1b1b1b1b1b1", "lapangan/absen/f0f0f0f0f0f0f0f0.jpg", "lapangan/wajah/rahasia.jpg"]) await tulis(k);
});
after(() => mf?.dispose());
const ambil = async (jalur, h = {}) => { const r = await mf.dispatchFetch("http://warga.lokal" + jalur, {headers: {"cf-connecting-ip": "10.9.9.9", ...h}}); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return {s: r.status, t, j, h: r.headers}; };
const STAF = {cookie: "sesi_staf=" + TOK};
const MEDIA = "/api/foto/lapangan/media";

uji("tamu: daftar dan media ditolak tanpa data", async () => {
  for (const j of ["/api/foto/lapangan", `${MEDIA}/logbook/a0a0a0a0a0a0a0a0`, `${MEDIA}/uji_pilot/b0b0b0b0b0b0b0b0`]) {
    const r = await ambil(j); assert.ok(r.s === 401 || r.s === 403, `${j}: ${r.s}`);
    assert.ok(!/a0a0a0a0|b0b0b0b0|"lat"/.test(r.t), "tanpa isi");
  }
  assert.equal((await ambil("/api/foto/lapangan", {"x-admin-token": "salah"})).s, 403);
  assert.equal((await ambil("/api/foto/lapangan", {cookie: "sesi_staf=" + "9".repeat(64)})).s, 403, "cookie asing");
});

uji("/api/foto publik tidak berubah dan tidak memuat foto lapangan", async () => {
  const r = await ambil("/api/foto"); assert.equal(r.s, 200); assert.deepEqual(r.j.foto, []);
  assert.ok(!/a0a0a0a0|b0b0b0b0|lapangan/.test(r.t));
  assert.equal((await ambil("/api/foto/a0a0a0a0a0a0a0a0")).s, 404);
});

uji("staf (sesi) dan admin (token): dua sumber, tanpa dummy, tanpa koordinat kosong, tanpa lewat 90 hari, tanpa foto absen", async () => {
  for (const h of [STAF, ADMIN]) {
    const r = await ambil("/api/foto/lapangan", h); assert.equal(r.s, 200, r.t);
    assert.deepEqual(r.j.foto.map(f => f.id).sort(), ["a0a0a0a0a0a0a0a0", "b0b0b0b0b0b0b0b0"]);
    const lb = r.j.foto.find(f => f.sumber === "logbook"), up = r.j.foto.find(f => f.sumber === "uji_pilot");
    assert.ok(lb && up, "kedua sumber"); assert.equal(lb.ket, "Patroli"); assert.equal(up.ket, "injeksi");
    assert.equal(lb.prov, "62", `wilayah dari koordinat: ${JSON.stringify(lb)}`);
    assert.equal(r.h.get("cache-control"), "private, no-store");
    assert.ok(!/Rahasia|orang_id|aaaaaaaaaaaaaaaa|iphashrahasia|foto_key|lapangan\/|uji-pilot\/|sha256|regu|f0f0f0f0|wajah/i.test(r.t), "tidak membocorkan: " + r.t);
    assert.deepEqual(Object.keys(lb).sort(), ["id", "kab", "kec", "ket", "lat", "lon", "prov", "sumber", "waktu"]);
  }
});

uji("media: staf menerima, tamu ditolak, dummy dan lewat 90 hari dan tanpa koordinat 404, kunci tidak dari klien, id jahat ditolak", async () => {
  for (const [j, h] of [[`${MEDIA}/logbook/a0a0a0a0a0a0a0a0`, STAF], [`${MEDIA}/uji_pilot/b0b0b0b0b0b0b0b0`, ADMIN], [`${MEDIA}/uji_pilot/b0b0b0b0b0b0b0b0?t=1`, STAF]]) {
    const r = await mf.dispatchFetch("http://warga.lokal" + j, {headers: h}); assert.equal(r.status, 200, j);
    assert.equal(r.headers.get("cache-control"), "private, no-store"); assert.equal(r.headers.get("content-type"), "image/jpeg");
    assert.equal((await r.arrayBuffer()).byteLength, JPEG_SAH.length);
  }
  for (const j of [`${MEDIA}/logbook/a1a1a1a1a1a1a1a1`, `${MEDIA}/logbook/a2a2a2a2a2a2a2a2`, `${MEDIA}/logbook/a3a3a3a3a3a3a3a3`, `${MEDIA}/uji_pilot/b1b1b1b1b1b1b1b1`,
    `${MEDIA}/logbook/f0f0f0f0f0f0f0f0`, `${MEDIA}/logbook/b0b0b0b0b0b0b0b0`, `${MEDIA}/uji_pilot/a0a0a0a0a0a0a0a0`]) assert.equal((await ambil(j, STAF)).s, 404, j + " harus 404");
  for (const j of [`${MEDIA}/logbook/..%2F..%2Ffoto%2Fx`, `${MEDIA}/logbook/lapangan%2Fwajah%2Frahasia`, `${MEDIA}/logbook/AAAAAAAAAAAAAAAA`, `${MEDIA}/uji_pilot/b0b0b0b0b0b0b0b0%00`, `${MEDIA}/absen/f0f0f0f0f0f0f0f0`, `${MEDIA}/logbook/a0a0a0a0a0a0a0a`]) {
    const r = await ambil(j, STAF); assert.ok(r.s === 404 || r.s === 400, `${j}: ${r.s}`);
  }
});

uji("orang dianonimkan/dihapus: foto logbook hilang dari daftar dan media", async () => {
  await DB.batch([DB.prepare("DELETE FROM lp_logbook_foto WHERE logbook_id IN (SELECT id FROM lp_logbook WHERE orang_id = 'aaaaaaaaaaaaaaaa')"), DB.prepare("DELETE FROM lp_logbook WHERE orang_id = 'aaaaaaaaaaaaaaaa'")]);
  const r = await ambil("/api/foto/lapangan", STAF); assert.deepEqual(r.j.foto.map(f => f.sumber), ["uji_pilot"]);
  assert.equal((await ambil(`${MEDIA}/logbook/a0a0a0a0a0a0a0a0`, STAF)).s, 404);
});

uji("akun gerbang AKUN_SITUS_X (pemirsa) ditolak 403 di daftar, media logbook, dan media uji pilot", async () => {
  const G = {"x-admin-token": "pemirsa:sandi-pemirsa"};
  for (const j of ["/api/foto/lapangan", `${MEDIA}/logbook/a0a0a0a0a0a0a0a0`, `${MEDIA}/uji_pilot/b0b0b0b0b0b0b0b0`]) {
    const r = await ambil(j, G); assert.equal(r.s, 403, j); assert.ok(!/"lat"|b0b0b0b0/.test(r.t));
  }
});
