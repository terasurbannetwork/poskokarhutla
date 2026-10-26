/* Ruang Posko: src/posko.js di workerd (Miniflare) dengan D1 + R2 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock klien DB).
   FIRMS dan Resend dijawab fixture lewat outboundService. Jalankan: node --test tests/warga/posko.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: posko.js dan worker.js saling impor
import {PUBLIK_TANPA_SESI} from "../../src/worker.js";
import {buangExif, UNSUR, KENDALA, STATUS_LAP, SUMBER_AIR, STATUS_PANGGILAN, cekTemplat, uraiCsvKontak, titikDalamKonsesi} from "../../src/posko.js";

const JAM = 3600e3, MENIT = 60e3, ADMIN = {"x-admin-token": "rahasia-admin"};
const wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
const sha256 = s => createHash("sha256").update(s).digest("hex");
const tgl = t => new Date(t).toISOString().slice(0, 10), jm = t => new Date(t).toISOString().slice(11, 16).replace(":", "");

/* ---- fixture: konsesi Kalteng kecil (A kotak penuh, B kotak dengan LUBANG di titik VIIRS, C jauh) dan CSV FIRMS yang bisa diubah ---- */
const kotak = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const KONSESI = {prov: "62", nama: "Kalimantan Tengah", perusahaan: [
  {id: "sawit-uji-1", nama: "PT Uji Sawit Satu", geom: [{type: "MultiPolygon", coordinates: [[kotak(113.5, -2.3, 113.7, -2.0)]]}]},
  {id: "hti-uji-2", nama: "PT Uji Hutan Dua", geom: [{type: "Polygon", coordinates: [kotak(113.5, -2.3, 113.7, -2.0), kotak(113.56, -2.13, 113.58, -2.12)]}]},
  {id: "hph-uji-3", nama: "PT Uji Jauh Tiga", geom: [{type: "Polygon", coordinates: [kotak(113.5, -3.6, 113.7, -3.4)]}]},
  {id: "sawit-nama-pendek", nama: "A", geom: [{type: "Polygon", coordinates: [kotak(113.5, -2.3, 113.7, -2.0)]}]},          // nama 1 huruf: dilewati, tidak menggagalkan batch
  {id: "x", nama: "PT Id Terlalu Pendek", geom: [{type: "Polygon", coordinates: [kotak(113.5, -2.3, 113.7, -2.0)]}]},        // id tidak sah: dilewati
]};
const KINI = Date.now(), t1 = KINI - 2 * JAM;
const KEP = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
const KEP_M = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight";
let CSV;
const csvAwal = () => ({
  VIIRS_SNPP_NRT: [KEP, `-2.1234,113.5678,330,0.4,0.4,${tgl(t1)},${jm(t1)},N,VIIRS,h,2.0NRT,290,12.3,D`,           // dalam A, di LUBANG B
    `-2.1300,113.5700,330,0.4,0.4,${tgl(t1)},${jm(t1)},N,VIIRS,l,2.0NRT,290,1.1,N`].join("\n"),                     // keyakinan rendah: tidak diantre
  MODIS_NRT: [KEP_M, `-2.15,113.59,320,1,1,${tgl(t1)},${jm(t1)},Terra,MODIS,50,6.1NRT,290,20,D`,
    `-2.16,113.60,320,1,1,${tgl(t1)},${jm(t1)},Terra,MODIS,85,6.1NRT,290,20,D`].join("\n"),
  VIIRS_NOAA20_NRT: KEP, VIIRS_NOAA21_NRT: KEP});
let luarLog = [], resend = {status: 200};
const luar = async req => {
  const u = new URL(req.url); luarLog.push(u.hostname);
  if (u.hostname === "firms.modaps.eosdis.nasa.gov") { const s = u.pathname.split("/")[5]; return new Response(CSV[s] ?? "", {status: s in CSV ? 200 : 400}); }
  if (u.hostname === "api.resend.com") { resend.diterima = JSON.parse(await req.text()); return new Response(resend.status === 200 ? '{"id":"x"}' : "RAHASIA-BALASAN-RESEND", {status: resend.status}); }
  return new Response("diblok di uji", {status: 599});
};
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/konsesi2026/62.json") return Response.json(KONSESI);
  const f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const opsi = (nama, ikat = {}, r2 = false) => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
  /* cf tetap: tanpa ini miniflare membaca lokasi mesin penguji (runner GitHub = US) dan pemeriksa VPN menolak semua kiriman */
  compatibilityDate: "2024-09-23", cf: {country: "ID", colo: "CGK"}, d1Databases: {DB: nama}, ...(r2 ? {r2Buckets: {MEDIA: nama}} : {}),
  bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin, moderator-dua", AKUN_SITUS: "gerbang@x:sandi", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), SESI_KUNCI: "kunci-sesi-uji", FIRMS_MAP_KEY: "kunci-uji", ...ikat}, serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});
let mf, DB;
before(async () => {
  CSV = csvAwal();
  mf = new Miniflare(opsi("uji-posko", {}, true));
  DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
const api = async (metode, j, body, h = {}, m = mf) => {
  const isi = body === undefined ? undefined : typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body);
  const r = await m.dispatchFetch("http://posko.lokal" + j, {method: metode, headers: {...(typeof body === "object" && !(body instanceof Uint8Array) ? {"content-type": "application/json"} : {}), ...h}, body: isi});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t, h: r.headers};
};
const adm = (metode, j, body) => api(metode, j, body, ADMIN);
const n = async tabel => (await DB.prepare(`SELECT count(*) n FROM ${tabel}`).first()).n;
const gps = (lat, lon, t = Date.now()) => ({lat, lon, akurasi: 12, waktu_gps: t, sampel: [[lat + 0.00001, lon, 10, t - 2000], [lat + 0.00002, lon + 0.00001, 11, t - 1000], [lat, lon, 12, t]]});
let kl = 0;
const lap = (lat, lon, o = {}, t) => ({klien_id: `uji-klien-${++kl}`, status: "menyala", ...gps(lat, lon, t), ...o});
const buatRegu = async (o = {}) => { const r = await adm("POST", "/api/posko/regu", {nama: "Regu Uji", unsur: "BPBD", prov: "62", kab: "Katingan", ...o}); assert.equal(r.s, 201, r.t); return {id: r.j.regu.id, kode: r.j.kode, tautan: r.j.tautan}; };
const kirim = (kode, body) => api("POST", "/api/lapangan", body, {"x-kode-regu": kode});

uji("daftar tetap kode = CHECK migrasi 0018 = lapangan.js (tidak bisa melenceng diam-diam)", () => {
  const sql = readFileSync(path.join(AKAR, "migrations/0018_posko.sql"), "utf8");
  const daftar = [...sql.matchAll(/IN \(([^)]+)\)/g)].map(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]));
  const ada = (nama, isi) => assert.ok(daftar.some(d => d.length === isi.length && d.every((v, i) => v === isi[i])), `${nama} di 0018 harus persis ${JSON.stringify(isi)}`);
  ada("unsur", UNSUR); ada("status laporan", STATUS_LAP); ada("sumber_air", SUMBER_AIR); ada("status panggilan", STATUS_PANGGILAN); ada("kendala (trigger)", Object.keys(KENDALA));
  const js = readFileSync(path.join(AKAR, "public/lapangan.js"), "utf8");
  const dariJs = nama => JSON.parse(js.match(new RegExp(`const ${nama} = (\\[[^\\]]*\\])`))[1]);
  assert.deepEqual(dariJs("STATUS"), STATUS_LAP, "STATUS di lapangan.js");
  assert.deepEqual(dariJs("KENDALA_KODE"), Object.keys(KENDALA), "KENDALA_KODE di lapangan.js");
  assert.deepEqual(dariJs("SUMBER_AIR"), SUMBER_AIR, "SUMBER_AIR di lapangan.js");
});

uji("migrasi 0018 dijalankan dua kali tanpa galat dan tanpa mengubah baris", async () => {
  const f = readFileSync(path.join(AKAR, "migrations/0018_posko.sql"), "utf8");
  await DB.prepare("INSERT INTO paparan_templat (id, isi, diubah) VALUES (1, '{}', 1)").run();
  await DB.batch(pecah(f).map(s => DB.prepare(s)));
  await DB.batch(pecah(f).map(s => DB.prepare(s)));
  const f19 = readFileSync(path.join(AKAR, "migrations/0019_posko_tahan.sql"), "utf8");
  await DB.batch(pecah(f19).map(s => DB.prepare(s))); await DB.batch(pecah(f19).map(s => DB.prepare(s)));   // 0019 juga idempoten
  assert.equal((await DB.prepare("SELECT isi FROM paparan_templat").first()).isi, "{}");
  await DB.prepare("DELETE FROM paparan_templat").run();
});

uji("CHECK dan trigger menolak isian liar langsung di D1", async () => {
  const bad = async (sql, ...b) => assert.rejects(DB.prepare(sql).bind(...b).run(), /CHECK|constraint|kendala|FOREIGN|malformed/i, sql.slice(0, 60) + " " + JSON.stringify(b));
  const H = sha256("x");
  await bad("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat) VALUES ('0123456789abcdef', 'Regu', 'Ninja', '62', 'Kab', ?, 1)", H);
  await bad("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat) VALUES ('0123456789abcdef', 'Regu', 'BPBD', '6a', 'Kab', ?, 1)", H);
  await bad("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat) VALUES ('0123456789abcdef', 'Regu', 'BPBD', '62', 'Kab', 'pendek', 1)");
  await bad("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat) VALUES ('0123456789abcdef', 'Regu', 'BPBD', '62', 'Kab', ?, 1)", "G".repeat(64));
  await DB.prepare("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat) VALUES ('aaaaaaaaaaaaaaaa', 'Regu CHECK', 'BPBD', '62', 'Kab', ?, 5)").bind(H).run();
  const ph = k => k.split(",").slice(1).map(() => ", ?").join("");   // satu ? per kolom tambahan
  const L = kolom => `INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, status, prov, kab${kolom}) VALUES ('bbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaa', 'klien-12345', '2026-10-19', 1, 1, ?, ?, ?, '62', 'Kab'${ph(kolom)})`;
  await bad(L(""), 40, 113, "menyala");                       // lat di luar Indonesia
  await bad(L(""), -2, 113, "membara");                       // status liar
  await bad(L(", luas_ha, padam_ha"), -2, 113, "bara", 5, 9); // padam > luas
  await bad(L(", padam_ha"), -2, 113, "bara", 3);             // padam tanpa luas
  await bad(L(", kendala"), -2, 113, "bara", "bukan json");
  await bad(L(", kendala"), -2, 113, "bara", '{"a":1}');
  await bad(L(", kendala"), -2, 113, "bara", '["air_jauh","hantu"]');       // trigger: kendala asing
  await bad(L(", kendala"), -2, 113, "bara", '["air_jauh","air_jauh"]');    // trigger: berulang
  await bad(L(", kendala"), -2, 113, "bara", '["air_jauh","akses_sulit_rawa","roda_empat_sulit","air_tidak_cukup","asap_tebal","angin_kencang","x"]');
  await bad(L(", sumber_air"), -2, 113, "bara", "laut");
  await bad(L(", personel"), -2, 113, "bara", 5000);
  await bad(L(", akurasi"), -2, 113, "bara", 4000);
  await bad(L(", catatan"), -2, 113, "bara", "x".repeat(501));
  await bad("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, status, prov, kab) VALUES ('bbbbbbbbbbbbbbbb', 'tidakada0000000x', 'klien-12345', '2026-10-19', 1, 1, -2, 113, 'bara', '62', 'Kab')");   // FK regu
  const NR = () => `INSERT INTO neraca_harian (tgl, prov, kab, sumber, fs, luas_ha, padam_ha, sisa_ha, personel, kendala, diubah) VALUES ('2026-10-19', '62', 'Kab', ?, ?, ?, ?, ?, ?, '[]', 1)`;
  await bad(NR(), "manual", 1, 10, 5, 5, 5);               // sumber liar
  await bad(NR(), "rakor", 1, 10, 12, 0, 5);               // padam > luas
  await bad(NR(), "rakor", 1, 10, 5, 9, 5);                // sisa tidak cocok luas - padam
  await bad(NR(), "rakor", -1, 10, 5, 5, 5);               // fs negatif
  await bad("INSERT INTO neraca_harian (tgl, prov, kab, sumber, kendala, diubah) VALUES ('19-10-2026', '62', 'Kab', 'rakor', '[]', 1)");
  await bad("INSERT INTO neraca_harian (tgl, prov, kab, sumber, kendala, diubah) VALUES ('2026-10-19', '62', 'Kab', 'rakor', '[\"hantu\"]', 1)");
  await DB.prepare("INSERT INTO neraca_harian (tgl, prov, kab, sumber, kendala, diubah) VALUES ('2026-10-19', '62', 'Kab', 'rakor', '[\"asap_tebal\"]', 1)").run();
  await bad("UPDATE neraca_harian SET kendala = '[\"hantu\"]' WHERE kab = 'Kab'");                // trigger UPDATE
  await DB.prepare("DELETE FROM neraca_harian").run();
  const K = k => `INSERT INTO kontak_pt (id, perusahaan_id, nama_pt, diubah${k}) VALUES ('cccccccccccccccc', 'pt-uji-1', 'PT Uji', 1${ph(k)})`;
  await bad(K(""));                                           // tanpa saluran kontak sama sekali
  await bad(K(", email"), "bukan-email");
  await bad(K(", email"), "a b@c.id");
  await bad(K(", wa"), "0812345678901");                      // harus berawalan 62
  await bad(K(", wa"), "62812abc4567");
  await bad(K(", telepon"), "0536-abc");
  const P = k => `INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, dibuat${k}) VALUES ('dddddddddddddddd', '2026-10-19', 'pt-uji-1', 'PT Uji', '62', 'Kab', 1, 1, 1${ph(k)})`;
  await bad(P(", status"), "diculik");
  await bad(P(", status"), "dipanggil");                                              // dipanggil tanpa dipanggil_pada
  await bad(P(", status, dipanggil_pada, batas, saluran"), "dipanggil", 1000, 1000 + 3600e3, "email");   // batas bukan +2 jam
  await bad(P(", status, dipanggil_pada, saluran"), "dipanggil", 1000, "email");      // batas wajib bersama dipanggil_pada
  await bad(P(", status, dipanggil_pada, batas, saluran"), "dipanggil", 1000, 1000 + 7200e3, "merpati");
  await bad(P(", direspons_pada"), 5);                                                // direspons tanpa dipanggil
  await bad("INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, dibuat) VALUES ('dddddddddddddddd', '2026-10-19', 'pt-uji-1', 'PT Uji', '62', 'Kab', 0, 1, 1)");   // titik_n >= 1
  await bad("INSERT INTO paparan_templat (id, isi, diubah) VALUES (2, '{}', 1)");
  await bad("INSERT INTO paparan_templat (id, isi, diubah) VALUES (1, '[]', 1)");
  await bad("INSERT INTO paparan_templat (id, isi, diubah) VALUES (1, ?, 1)", JSON.stringify({x: "y".repeat(70000)}));
  await DB.prepare("DELETE FROM regu").run();
});

uji("semua rute admin Ruang Posko menolak tanpa token dan dengan token salah (403), tanpa menulis", async () => {
  const id = "0123456789abcdef", salah = {"x-admin-token": "salah"};
  const rute = [["GET", "/api/posko/regu"], ["POST", "/api/posko/regu"], ["POST", `/api/posko/regu/${id}`], ["GET", "/api/posko/lapangan"], ["GET", `/api/posko/foto/${id}`],
    ["GET", "/api/posko/neraca"], ["POST", "/api/posko/neraca"], ["POST", "/api/posko/neraca/hapus"], ["GET", "/api/posko/kontak"], ["POST", "/api/posko/kontak"],
    ["POST", "/api/posko/kontak/impor"], ["POST", `/api/posko/kontak/${id}`], ["GET", "/api/posko/panggilan"], ["POST", `/api/posko/panggilan/${id}`],
    ["GET", "/api/posko/templat"], ["POST", "/api/posko/templat"], ["POST", "/api/posko/dummy"]];
  for (const [m, j] of rute) for (const h of [{}, salah]) {
    const r = await api(m, j, m === "POST" ? {aksi: "isi", nama: "x"} : undefined, h);
    assert.equal(r.s, 403, `${m} ${j} ${JSON.stringify(h)} = ${r.s} ${r.t}`);
  }
  for (const t of ["regu", "lapangan", "neraca_harian", "kontak_pt", "panggilan", "paparan_templat"]) assert.equal(await n(t), 0, `${t} tidak boleh tertulis`);
});

uji("regu: isian salah ditolak; kode muncul sekali, D1 hanya menyimpan sha-nya", async () => {
  for (const b of [{}, {nama: "R", unsur: "BPBD", prov: "62", kab: "Katingan"}, {nama: "Regu", unsur: "Ninja", prov: "62", kab: "Katingan"}, {nama: "Regu", unsur: "BPBD", prov: "6", kab: "Katingan"},
    {nama: "Regu", unsur: "BPBD", prov: "62", kab: "K"}, {nama: "Regu", unsur: "BPBD", prov: "62", kab: "Katingan", perusahaan_id: "a b"}, {nama: "x".repeat(81), unsur: "BPBD", prov: "62", kab: "Katingan"}]) {
    const r = await adm("POST", "/api/posko/regu", b); assert.equal(r.s, 400, JSON.stringify(b) + " -> " + r.t);
  }
  assert.equal(await n("regu"), 0);
  const g = await buatRegu({perusahaan_id: "sawit-uji-1"});
  assert.match(g.kode, /^[0-9a-f]{26}$/); assert.equal(g.tautan, `http://posko.lokal/lapangan#k=${g.kode}`);
  const baris = await DB.prepare("SELECT * FROM regu WHERE id = ?").bind(g.id).first();
  assert.equal(baris.kode_sha, sha256(g.kode));
  assert.ok(!Object.values(baris).includes(g.kode), "kode asli tidak boleh tersimpan di kolom mana pun");
  const daftar = await adm("GET", "/api/posko/regu");
  assert.equal(daftar.s, 200); assert.ok(!daftar.t.includes(g.kode) && !daftar.t.includes(sha256(g.kode)), "daftar regu tidak membocorkan kode maupun sha");
});

uji("POST /api/lapangan: tanpa kode atau kode salah 403, tidak ada baris tertulis", async () => {
  const g = await buatRegu();
  const b = lap(-2.1234, 113.5678);
  for (const h of [{}, {"x-kode-regu": "0".repeat(26)}, {"x-kode-regu": "pendek"}, {"x-kode-regu": g.kode + "00"}, {"x-kode-regu": ADMIN["x-admin-token"]}]) {
    const r = await api("POST", "/api/lapangan", b, h); assert.equal(r.s, 403, JSON.stringify(h) + " " + r.t);
  }
  assert.equal((await api("GET", "/api/lapangan/saya")).s, 403);
  assert.equal(await n("lapangan"), 0);
  const saya = await api("GET", "/api/lapangan/saya", undefined, {"x-kode-regu": g.kode.toUpperCase()});
  assert.equal(saya.s, 200); assert.equal(saya.j.regu.nama, "Regu Uji"); assert.ok(!("id" in saya.j.regu));
});

uji("kode regu yang DICABUT ditolak (laporan, foto, saya) dan tidak ada baris baru", async () => {
  const g = await buatRegu({nama: "Regu Cabut"});
  const ok = await kirim(g.kode, lap(-2.1234, 113.5678)); assert.equal(ok.s, 201, ok.t);
  const sebelum = await n("lapangan");
  assert.equal((await adm("POST", `/api/posko/regu/${g.id}`, {aksi: "salah"})).s, 400);
  assert.equal((await adm("POST", `/api/posko/regu/${g.id}`, {aksi: "cabut"})).s, 200);
  assert.equal((await adm("POST", `/api/posko/regu/${g.id}`, {aksi: "cabut"})).s, 409, "dicabut dua kali");
  assert.equal((await adm("POST", "/api/posko/regu/ffffffffffffffff", {aksi: "cabut"})).s, 404);
  const h = {"x-kode-regu": g.kode};
  assert.equal((await api("POST", "/api/lapangan", lap(-2.1234, 113.5678), h)).s, 403);
  assert.equal((await api("POST", `/api/lapangan/foto/${ok.j.id}`, new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]), h)).s, 403);
  assert.equal((await api("GET", "/api/lapangan/saya", undefined, h)).s, 403);
  assert.equal(await n("lapangan"), sebelum);
  assert.ok((await DB.prepare("SELECT dicabut FROM regu WHERE id = ?").bind(g.id).first()).dicabut > 0);
});

uji("POST /api/lapangan: isian liar DITOLAK 400 dengan angka dan sebab", async () => {
  const g = await buatRegu({nama: "Regu Validasi"}), sebelum = await n("lapangan"), B = lap(-2.1234, 113.5678);
  const cobaan = [{status: "membara"}, {status: undefined}, {kendala: "air_jauh"}, {kendala: ["constructor"]}, {kendala: ["toString"]}, {kendala: ["air_jauh", "air_jauh"]}, {kendala: Object.keys(KENDALA).concat("asap_tebal")},
    {luas_ha: -1}, {luas_ha: 100001}, {luas_ha: "abc"}, {luas_ha: 5, padam_ha: 9}, {padam_ha: 3}, {personel: 1.5}, {personel: 1001}, {sumber_air: "laut"}, {catatan: "x".repeat(501)}, {catatan: 5},
    {klien_id: "pendek"}, {klien_id: "ada spasi disini"}, {klien_id: undefined}, {akurasi: 2000}, {akurasi: undefined}, {lat: 40}, {lon: 10}, {lat: "x"}, {waktu_gps: Date.now() - 30 * JAM},
    {waktu_gps: Date.now() + 10 * MENIT}, {sampel: undefined}, {sampel: B.sampel.slice(0, 2)}, {sampel: "bukan"}, {sampel: B.sampel.map(s => [s[0] + 1, s[1], s[2], s[3]])}];
  for (const c of cobaan) {
    const r = await kirim(g.kode, {...B, klien_id: `uji-liar-${++kl}`, ...c});
    assert.equal(r.s, 400, JSON.stringify(c) + " -> " + r.s + " " + r.t); assert.ok(r.j.galat);
  }
  assert.equal(await n("lapangan"), sebelum, "tidak ada baris dari isian liar");
  const luar = await kirim(g.kode, lap(5, 80)); assert.equal(luar.s, 400, "titik di luar Indonesia");
});

uji("laporan sah tersimpan; kirim ulang dengan klien_id sama = satu baris (idempoten); batas 60 per jam per regu", async () => {
  const g = await buatRegu({nama: "Regu Idem"}), B = lap(-2.1234, 113.5678, {luas_ha: 10, padam_ha: 4, personel: 6, kendala: ["air_jauh"], sumber_air: "kanal", catatan: "Api di belakang kebun"});
  const a = await kirim(g.kode, B); assert.equal(a.s, 201, a.t);
  assert.match(a.j.id, /^[0-9a-f]{16}$/); assert.equal(a.j.prov, "62"); assert.ok(a.j.kab);
  const b = await kirim(g.kode, B); assert.equal(b.s, 200); assert.equal(b.j.id, a.j.id); assert.equal(b.j.ulang, true);
  const baris = await DB.prepare("SELECT * FROM lapangan WHERE regu_id = ?").bind(g.id).all();
  assert.equal(baris.results.length, 1);
  const x = baris.results[0];
  assert.equal(x.tgl, wib(B.waktu_gps)); assert.equal(x.status, "menyala"); assert.equal(x.luas_ha, 10); assert.equal(x.kab, a.j.kab); assert.equal(JSON.parse(x.kendala)[0], "air_jauh");
  /* 60 laporan dalam sejam (disisipkan langsung) lalu yang ke-61 ditolak 429 */
  const st = []; for (let i = 0; i < 59; i++) st.push(DB.prepare("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, status, prov, kab) VALUES (?, ?, ?, ?, ?, ?, -2.1, 113.5, 'bara', '62', 'Katingan')")
    .bind(`e${String(i).padStart(15, "0")}`, g.id, `isi-massal-${i}`, wib(Date.now()), Date.now(), Date.now()));
  await DB.batch(st);
  const r = await kirim(g.kode, lap(-2.2, 113.6)); assert.equal(r.s, 429, r.t); assert.ok(r.h.get("retry-after"));
  await DB.prepare("DELETE FROM lapangan WHERE regu_id = ? AND klien_id LIKE 'isi-massal-%'").bind(g.id).run();
});

uji("foto laporan: JPEG/WebP lewat R2 sungguhan; berkas lain, laporan regu lain, dan ukuran besar ditolak; admin saja yang melihat", async () => {
  const g = await buatRegu({nama: "Regu Foto"}), o = await buatRegu({nama: "Regu Lain"});
  const l = await kirim(g.kode, lap(-2.1234, 113.5678)); assert.equal(l.s, 201, l.t);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), url = `/api/lapangan/foto/${l.j.id}`;
  assert.equal((await api("POST", url, jpg)).s, 403, "tanpa kode");
  assert.equal((await api("POST", url, jpg, {"x-kode-regu": o.kode})).s, 404, "laporan milik regu lain");
  assert.equal((await api("POST", url, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), {"x-kode-regu": g.kode})).s, 400, "bukan gambar");
  const besar = new Uint8Array(1.6 * 1048576); besar.set([0xff, 0xd8, 0xff]);
  assert.equal((await api("POST", url, besar, {"x-kode-regu": g.kode})).s, 413, "terlalu besar");
  const ok = await api("POST", url, jpg, {"x-kode-regu": g.kode}); assert.equal(ok.s, 200, ok.t);
  assert.equal((await api("POST", url, jpg, {"x-kode-regu": g.kode})).s, 409, "foto kedua");
  assert.equal((await DB.prepare("SELECT foto FROM lapangan WHERE id = ?").bind(l.j.id).first()).foto, 1);
  assert.equal((await DB.prepare("SELECT foto_sha256 f FROM lapangan WHERE id = ?").bind(l.j.id).first()).f, createHash("sha256").update(jpg).digest("hex"), "0044: foto_sha256 = hash byte yang disimpan");
  assert.equal((await api("GET", `/api/posko/foto/${l.j.id}`)).s, 403, "publik tidak boleh melihat foto");
  const f = await mf.dispatchFetch(`http://posko.lokal/api/posko/foto/${l.j.id}`, {headers: ADMIN});
  assert.equal(f.status, 200); assert.equal(f.headers.get("content-type"), "image/jpeg"); assert.deepEqual([...new Uint8Array(await f.arrayBuffer())], [...jpg]);
  const m2 = new Miniflare(opsi("uji-posko-tanpa-r2"));   // produksi saat ini tanpa binding MEDIA
  try {
    const D2 = await m2.getD1Database("DB"); await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
    const rg = await api("POST", "/api/posko/regu", {nama: "Regu Tanpa R2", unsur: "TNI", prov: "62", kab: "Katingan"}, ADMIN, m2);
    const lp = await api("POST", "/api/lapangan", lap(-2.1234, 113.5678), {"x-kode-regu": rg.j.kode}, m2); assert.equal(lp.s, 201, "laporan tetap tersimpan tanpa R2");
    assert.equal((await api("POST", `/api/lapangan/foto/${lp.j.id}`, jpg, {"x-kode-regu": rg.j.kode}, m2)).s, 503);
  } finally { await m2.dispose(); }
});

uji("neraca: agregat regu dihitung dari laporan (susulan di titik sama mengganti), publik tanpa identitas regu", async () => {
  await DB.prepare("DELETE FROM lapangan").run(); await DB.prepare("DELETE FROM neraca_harian").run();
  const A = await buatRegu({nama: "Regu Rahasia Alfa"}), B = await buatRegu({nama: "Regu Rahasia Beta", unsur: "Manggala Agni"}), now = Date.now();
  const kendalaA = await kirim(A.kode, lap(-2.1234, 113.5678, {luas_ha: 10, padam_ha: 4, personel: 6, kendala: ["air_jauh"]}, now - MINUTE_60()));
  assert.equal(kendalaA.s, 201, kendalaA.t);
  assert.equal((await kirim(A.kode, lap(-2.1234, 113.5678, {luas_ha: 12, padam_ha: 5, personel: 8, kendala: ["air_jauh", "asap_tebal"]}, now))).s, 201);   // susulan: mengganti
  assert.equal((await kirim(A.kode, lap(-2.1334, 113.5678, {status: "padam", luas_ha: 20, padam_ha: 20, personel: 3, kendala: ["angin_kencang"]}, now - 5 * MENIT))).s, 201);
  assert.equal((await kirim(B.kode, lap(-2.1234, 113.5678, {status: "tidak_ditemukan", personel: 5}, now - 2 * MENIT))).s, 201);
  const kab = (await DB.prepare("SELECT DISTINCT kab FROM lapangan").all()).results.map(x => x.kab);
  assert.equal(kab.length, 1, `titik bertetangga harus satu kabupaten: ${kab}`);
  const r = await api("GET", "/api/neraca?prov=62");
  assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.total, {fs: 2, luas_ha: 32, padam_ha: 25, sisa_ha: 7, personel: 13, kendala: ["air_jauh", "asap_tebal", "angin_kencang"]}, r.t);
  assert.equal(r.j.kab.length, 1); assert.equal(r.j.kab[0].sumber, "regu"); assert.equal(r.j.kab[0].kab, kab[0]);
  assert.ok(!/Rahasia|regu_id|kode|unsur|BPBD|Manggala/.test(r.t), "angka agregat saja: tanpa identitas regu: " + r.t);
  assert.match(r.h.get("cache-control"), /no-store|max-age/);
  for (const q of ["", "?prov=6", "?prov=62&tgl=2026-13-40", "?prov=62&tgl=kemarin", "?prov=ab"]) assert.equal((await api("GET", "/api/neraca" + q)).s, 400, q);
  assert.equal((await api("GET", "/api/neraca?prov=62&tgl=2020-01-01")).s, 400, "di luar jendela retensi 400 hari");
  assert.equal((await api("GET", `/api/neraca?prov=62&tgl=${wib(Date.now() + 3 * 24 * JAM)}`)).s, 400, "tanggal depan");
  assert.equal((await api("GET", `/api/neraca?prov=62&tgl=${wib(Date.now() - 3 * 24 * JAM)}`)).j.kab.length, 0, "hari tanpa data = kosong, bukan galat");
});
const MINUTE_60 = () => 60 * MENIT;

uji("neraca rakor MENANG atas agregat regu; hapus rakor mengembalikan agregat; validasi ketat", async () => {
  const kab = (await DB.prepare("SELECT DISTINCT kab FROM lapangan LIMIT 1").first()).kab, hari = wib(Date.now());
  const rakor = {tgl: hari, prov: "62", kab: kab.toUpperCase(), fs: 7, luas_ha: 50, padam_ha: 20, personel: 40, kendala: ["asap_tebal", "air_jauh"], catatan: "dari rakor"};
  for (const c of [{tgl: "kemarin"}, {prov: "6"}, {kab: ""}, {fs: -1}, {fs: 1.5}, {luas_ha: "x"}, {padam_ha: 60}, {sisa_ha: 5}, {kendala: ["hantu"]}, {kendala: ["constructor"]}, {kendala: "air_jauh"}, {catatan: "x".repeat(501)}, {personel: -2}]) {
    const r = await adm("POST", "/api/posko/neraca", {...rakor, ...c}); assert.equal(r.s, 400, JSON.stringify(c) + " " + r.t);
  }
  assert.equal((await DB.prepare("SELECT count(*) n FROM neraca_harian WHERE sumber = 'rakor'").first()).n, 0);
  const ok = await adm("POST", "/api/posko/neraca", rakor); assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.kab, kab, "ejaan kabupaten mengikuti baris regu");
  const baris = await DB.prepare("SELECT sumber, sisa_ha FROM neraca_harian WHERE tgl = ? ORDER BY sumber").bind(hari).all();
  assert.deepEqual(baris.results.map(x => x.sumber), ["rakor", "regu"], "dua baris ada, pembaca memilih rakor"); assert.equal(baris.results[0].sisa_ha, 30);
  const p = await api("GET", "/api/neraca?prov=62");
  assert.deepEqual(p.j.total, {fs: 7, luas_ha: 50, padam_ha: 20, sisa_ha: 30, personel: 40, kendala: ["air_jauh", "asap_tebal"]}); assert.equal(p.j.kab[0].sumber, "rakor");
  assert.ok(!p.t.includes("dari rakor"), "catatan rakor tidak keluar di rute publik");
  /* laporan regu baru TIDAK menimpa rakor */
  const g = await buatRegu({nama: "Regu Setelah Rakor"});
  const susulan = await kirim(g.kode, lap(-2.131, 113.572, {luas_ha: 99, padam_ha: 1})); assert.equal(susulan.s, 201); assert.equal(susulan.j.kab, kab, "titik tetangga harus satu kabupaten");
  assert.equal((await api("GET", "/api/neraca?prov=62")).j.total.luas_ha, 50, "rakor tetap menang setelah agregat berubah");
  assert.equal((await DB.prepare("SELECT luas_ha FROM neraca_harian WHERE tgl = ? AND sumber = 'regu'").bind(hari).first()).luas_ha, 131, "agregat regu tetap dihitung di belakang");
  const adminList = await adm("GET", "/api/posko/neraca"); assert.equal(adminList.j.baris.length, 2);
  assert.equal((await adm("POST", "/api/posko/neraca/hapus", {tgl: hari, prov: "62", kab: "Tidak Ada"})).s, 404);
  assert.equal((await adm("POST", "/api/posko/neraca/hapus", {tgl: hari, prov: "62", kab})).s, 200);
  assert.equal((await api("GET", "/api/neraca?prov=62")).j.total.luas_ha, 131, "tanpa rakor, agregat regu kembali dipakai");
});

uji("kontak PT: validasi, wa dinormalkan, upsert per perusahaan; impor CSV semua-atau-tidak; TIDAK bocor di rute publik", async () => {
  const S = {email: "rahasia-pt@contoh.invalid", wa: "6281299887766", telepon: "0536 7770001"};
  for (const c of [{}, {perusahaan_id: "a", nama_pt: "PT X", email: "a@b.id"}, {perusahaan_id: "sawit-uji-1", nama_pt: "P"}, {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji"},
    {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji", email: "bukan-email"}, {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji", wa: "12345"}, {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji", telepon: "abc-def"},
    {perusahaan_id: "sawit uji", nama_pt: "PT Uji", email: "a@b.id"}, {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji", email: 5}]) {
    const r = await adm("POST", "/api/posko/kontak", c); assert.equal(r.s, 400, JSON.stringify(c) + " " + r.t);
  }
  assert.equal(await n("kontak_pt"), 0);
  const ok = await adm("POST", "/api/posko/kontak", {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji Sawit Satu", kontak: "Pak Budi", email: "Rahasia-PT@Contoh.Invalid", wa: "0812-9988-7766", telepon: S.telepon});
  assert.equal(ok.s, 201, ok.t); assert.equal(ok.j.kontak.wa, S.wa); assert.equal(ok.j.kontak.email, S.email);
  await adm("POST", "/api/posko/kontak", {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji Sawit Satu (baru)", email: S.email});
  assert.equal(await n("kontak_pt"), 1, "upsert per perusahaan_id, bukan baris kedua");
  assert.equal((await DB.prepare("SELECT nama_pt, wa FROM kontak_pt").first()).wa, null, "upsert mengganti seluruh kontak");
  await adm("POST", "/api/posko/kontak", {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji Sawit Satu", kontak: "Pak Budi", email: S.email, wa: S.wa, telepon: S.telepon});
  /* publik */
  const publik = ["/api/neraca?prov=62", "/api/paparan/templat", "/api/warga", "/api/titik", "/api/foto", "/api/status", "/api/sosmed", "/lapangan", "/api/lapangan/saya", "/api/posko/kontak", "/api/posko/panggilan", "/api/posko/regu", "/"];
  for (const j of publik) { const r = await api("GET", j); for (const s of [...Object.values(S), "Pak Budi"]) assert.ok(!r.t.includes(s), `${j} membocorkan '${s}'`); }
  const adminK = await adm("GET", "/api/posko/kontak"); assert.ok(adminK.t.includes(S.email) && adminK.t.includes(S.wa), "kontrol positif: admin melihat kontak");
  /* impor CSV */
  assert.deepEqual(uraiCsvKontak('perusahaan_id,nama_pt,catatan\r\nx-1,"PT ""Satu"", Tbk","baris\nbaru"\n\n'), [["perusahaan_id", "nama_pt", "catatan"], ["x-1", 'PT "Satu", Tbk', "baris\nbaru"]]);
  const sebelum = await n("kontak_pt");
  const salah = await adm("POST", "/api/posko/kontak/impor", {csv: "perusahaan_id,nama_pt,email,wa\npt-a-1,PT A,a@a.id,\npt-b-2,PT B,bukan-email,\npt-c-3,PT C,,\npt-a-1,PT A lagi,a@a.id,"});
  assert.equal(s0(salah), 400, salah.t); assert.equal(salah.j.rincian.length, 3, salah.t); assert.equal(await n("kontak_pt"), sebelum, "satu baris salah = tidak ada yang diimpor");
  for (const csv of ["", "nama_pt,email\nPT A,a@a.id", "perusahaan_id,nama_pt,rahasia\npt-a-1,PT A,x", "perusahaan_id,nama_pt,email", "x".repeat(70000)])
    assert.ok([400, 413].includes((await adm("POST", "/api/posko/kontak/impor", {csv})).s), "csv cacat: " + csv.slice(0, 40));
  const baik = await adm("POST", "/api/posko/kontak/impor", {csv: 'perusahaan_id;nama_pt;email;wa;telepon\npt-a-1;"PT A, Tbk";a@a.id;0812 111 2233;\npt-b-2;PT B;;;021-5550001\nsawit-uji-1;PT Uji Sawit Satu;baru@uji.id;;'});
  assert.equal(baik.s, 201, baik.t); assert.equal(baik.j.diimpor, 3); assert.equal(await n("kontak_pt"), 3, "dua baru + satu upsert");
  assert.equal((await DB.prepare("SELECT wa FROM kontak_pt WHERE perusahaan_id = 'pt-a-1'").first()).wa, "628121112233");
  const id = (await DB.prepare("SELECT id FROM kontak_pt WHERE perusahaan_id = 'pt-b-2'").first()).id;
  assert.equal((await adm("POST", `/api/posko/kontak/${id}`, {aksi: "salah"})).s, 400);
  assert.equal((await adm("POST", `/api/posko/kontak/${id}`, {aksi: "hapus"})).s, 200); assert.equal((await adm("POST", `/api/posko/kontak/${id}`, {aksi: "hapus"})).s, 404);
  await adm("POST", "/api/posko/kontak", {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji Sawit Satu", kontak: "Pak Budi", email: S.email, wa: S.wa, telepon: S.telepon});
});
const s0 = r => r.s;

uji("antrean: cron menit 16 mencocokkan titik FIRMS ke konsesi; satu baris per perusahaan per hari; lubang poligon dihormati; tanpa kiriman otomatis", async () => {
  await DB.prepare("DELETE FROM panggilan").run();
  assert.deepEqual([...titikDalamKonsesi(KONSESI.perusahaan.slice(0, 3), [{lat: -2.1234, lon: 113.5678}, {lat: -2.16, lon: 113.6}, {lat: -9, lon: 100}])].map(([i, s]) => [i, [...s].sort()]),
    [[0, [0, 1]], [1, [1]]], "A: dua titik; B: titik di lubang tidak dihitung; C: tak ada");
  const w = await mf.getWorker(), jam = (h, m) => Date.UTC(2026, 9, 16, h, m);
  luarLog = [];
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(3, 16)});
  assert.equal(await n("panggilan"), 0, "belum ada putaran titik: antrean menunggu");
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(3, 15)});
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(4, 16)});
  assert.equal(await n("panggilan"), 0, "menit 16 di jam bukan kelipatan 3 tidak memproses");
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(3, 16)});
  const baris = (await DB.prepare("SELECT * FROM panggilan ORDER BY perusahaan_id").all()).results, hari = wib(t1);
  assert.deepEqual(baris.map(b => [b.perusahaan_id, b.tanggal, b.titik_n, b.status, b.prov]), [["hti-uji-2", hari, 2, "baru", "62"], ["sawit-uji-1", hari, 3, "baru", "62"]],
    "A: VIIRS(h) + 2 MODIS(50,85) = 3 (VIIRS 'l' keyakinan rendah tidak); B: 3 dikurangi titik di lubang = 2; C: tidak ada");
  for (const b of baris) { assert.equal(b.dipanggil_pada, null); assert.equal(b.batas, null); assert.equal(b.saluran, null); assert.equal(b.nama_pt.startsWith("PT Uji"), true); assert.ok(b.kab && b.lat < 0 && b.terdeteksi > 0); }
  assert.ok(!luarLog.includes("api.resend.com"), "cron tidak boleh mengirim email ke perusahaan");
  /* putaran berikutnya: satu titik hilang dari jendela (hitungan turun) tapi titik_n tidak turun; titik baru menaikkan; baris tidak menggandakan */
  await adm("POST", `/api/posko/panggilan/${baris[1].id}`, {aksi: "catat", catatan: "dicatat admin"});
  CSV.MODIS_NRT = [KEP_M, `-2.15,113.59,320,1,1,${tgl(t1)},${jm(t1)},Terra,MODIS,50,6.1NRT,290,20,D`].join("\n");
  CSV.VIIRS_SNPP_NRT = [KEP, `-2.2000,113.6500,330,0.4,0.4,${tgl(t1 + 20 * MENIT)},${jm(t1 + 20 * MENIT)},N,VIIRS,h,2.0NRT,290,12.3,D`].join("\n");
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(3, 15)});
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(3, 16)});
  const lagi = (await DB.prepare("SELECT * FROM panggilan ORDER BY perusahaan_id").all()).results;
  assert.equal(lagi.length, 2, "tetap satu baris per perusahaan per hari");
  assert.deepEqual(lagi.map(b => b.titik_n), [2, 3], "A: max(3, 2 titik di jendela ini); B: max(2, 2)");
  assert.equal(lagi[1].catatan, "dicatat admin", "upsert antrean tidak menimpa pekerjaan admin");
  CSV.MODIS_NRT = [KEP_M, ...[0, 1, 2, 3].map(i => `-2.1${5 + i},113.5${9 + i},320,1,1,${tgl(t1)},${jm(t1)},Terra,MODIS,85,6.1NRT,290,20,D`)].join("\n");
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(3, 15)});
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(3, 16)});
  assert.equal((await DB.prepare("SELECT titik_n FROM panggilan WHERE perusahaan_id = 'sawit-uji-1'").first()).titik_n, 5, "titik baru di jendela menaikkan hitungan");
  assert.equal(await n("panggilan"), 2); CSV = csvAwal();
});

uji("panggilan: WhatsApp memulai hitung mundur +2 jam tepat; kirim ulang tidak menggeser; urutan status dijaga; terlambat ditandai", async () => {
  const daftar = await adm("GET", "/api/posko/panggilan"); assert.equal(daftar.s, 200);
  assert.equal(daftar.j.batas_respons_ms, 7200000); assert.equal(daftar.j.email_siap, false);
  const A = daftar.j.panggilan.find(p => p.perusahaan_id === "sawit-uji-1"), B = daftar.j.panggilan.find(p => p.perusahaan_id === "hti-uji-2");
  assert.deepEqual([A.ada_email, A.ada_wa, A.ada_telepon], [true, true, true]); assert.deepEqual([B.ada_email, B.ada_wa, B.ada_telepon], [false, false, false]);
  assert.ok(!daftar.t.includes("rahasia-pt") && !daftar.t.includes("6281299887766"), "daftar panggilan hanya membawa penanda ada/tidak, bukan nilai kontak");
  assert.equal((await adm("POST", `/api/posko/panggilan/${B.id}`, {aksi: "wa"})).s, 409, "tanpa kontak WA");
  assert.equal((await adm("POST", `/api/posko/panggilan/${B.id}`, {aksi: "email"})).s, 409, "tanpa kontak email");
  assert.equal((await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "direspons"})).s, 409, "direspons sebelum dipanggil");
  assert.equal((await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "terbang"})).s, 400);
  assert.equal((await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "constructor"})).s, 400, "kunci prototipe bukan aksi");
  assert.equal((await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "catat", hasil: "x".repeat(301)})).s, 400);
  assert.equal((await adm("POST", "/api/posko/panggilan/ffffffffffffffff", {aksi: "wa"})).s, 404);
  assert.equal((await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "email"})).s, 503, "Resend belum diset: status tidak berubah");
  assert.equal((await DB.prepare("SELECT status FROM panggilan WHERE id = ?").bind(A.id).first()).status, "baru");
  const wa = await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "wa", pesan: "Mohon balas lewat nomor ini"}); assert.equal(wa.s, 200, wa.t);
  assert.ok(wa.j.tautan.startsWith("https://wa.me/6281299887766?text="));
  const teks = decodeURIComponent(wa.j.tautan.split("text=")[1]);
  assert.match(teks, /PT Uji Sawit Satu/); assert.match(teks, /5 titik panas/); assert.match(teks, /Batas respons/); assert.match(teks, /Mohon balas lewat nomor ini/);
  const p1 = await DB.prepare("SELECT * FROM panggilan WHERE id = ?").bind(A.id).first();
  assert.equal(p1.status, "dipanggil"); assert.equal(p1.saluran, "wa"); assert.equal(p1.batas, p1.dipanggil_pada + 2 * JAM, "batas = dipanggil + 2 jam persis");
  await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "wa"});
  assert.equal((await DB.prepare("SELECT dipanggil_pada FROM panggilan WHERE id = ?").bind(A.id).first()).dipanggil_pada, p1.dipanggil_pada, "kirim ulang tidak menggeser batas");
  const dir = await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "direspons", hasil: "PIC menjawab, regu berangkat"}); assert.equal(dir.s, 200, dir.t);
  const p2 = await DB.prepare("SELECT * FROM panggilan WHERE id = ?").bind(A.id).first();
  assert.equal(p2.status, "direspons"); assert.ok(p2.direspons_pada >= p2.dipanggil_pada); assert.equal(p2.hasil, "PIC menjawab, regu berangkat");
  assert.equal((await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "tarik"})).s, 409, "tarik hanya dari dipanggil");
  for (const a of ["dicek", "tindak_lanjut", "selesai"]) assert.equal((await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: a})).s, 200, a);
  assert.ok((await DB.prepare("SELECT dicek_pada FROM panggilan WHERE id = ?").bind(A.id).first()).dicek_pada > 0);
  assert.equal((await adm("POST", `/api/posko/panggilan/${A.id}`, {aksi: "wa"})).s, 409, "selesai: tidak dipanggil lagi");
  assert.ok(!(await adm("GET", "/api/posko/panggilan")).j.panggilan.some(p => p.id === A.id), "selesai keluar dari antrean aktif");
  assert.ok((await adm("GET", "/api/posko/panggilan?semua=1")).j.panggilan.some(p => p.id === A.id), "tetap ada di ?semua=1");
  /* abaikan -> buka; telepon -> tarik */
  assert.equal((await adm("POST", `/api/posko/panggilan/${B.id}`, {aksi: "abaikan"})).s, 200);
  assert.equal((await adm("POST", `/api/posko/panggilan/${B.id}`, {aksi: "telepon"})).s, 409, "abaikan: buka dulu");
  assert.equal((await adm("POST", `/api/posko/panggilan/${B.id}`, {aksi: "buka"})).s, 200);
  assert.equal((await adm("POST", `/api/posko/panggilan/${B.id}`, {aksi: "telepon"})).s, 200);
  assert.equal((await adm("POST", `/api/posko/panggilan/${B.id}`, {aksi: "tarik"})).s, 200);
  const p3 = await DB.prepare("SELECT status, dipanggil_pada, batas, saluran FROM panggilan WHERE id = ?").bind(B.id).first();
  assert.deepEqual(p3, {status: "baru", dipanggil_pada: null, batas: null, saluran: null});
  /* lewat batas */
  await DB.prepare("UPDATE panggilan SET status = 'dipanggil', saluran = 'telepon', dipanggil_pada = ?1, batas = ?1 + 7200000 WHERE id = ?2").bind(Date.now() - 3 * JAM, B.id).run();
  const lt = (await adm("GET", "/api/posko/panggilan")).j.panggilan.find(p => p.id === B.id); assert.equal(lt.terlambat, true, "3 jam sejak dipanggil, tanpa respons = terlambat");
});

uji("panggilan: email lewat Resend hanya saat admin menekan; gagal kirim tidak memulai hitung mundur", async () => {
  const m2 = new Miniflare(opsi("uji-posko-email", {EMAIL_API_KEY: "re_uji", EMAIL_FROM: "Posko <posko@contoh.id>", EMAIL_TO: "admin@contoh.id"}));
  try {
    const D2 = await m2.getD1Database("DB"); await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
    await api("POST", "/api/posko/kontak", {perusahaan_id: "sawit-uji-1", nama_pt: "PT Uji Sawit Satu", email: "pt@uji.id"}, ADMIN, m2);
    const kini = Date.now(), hari = wib(kini);
    await D2.prepare("INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, lat, lon, dibuat) VALUES ('eeeeeeeeeeeeeeee', ?, 'sawit-uji-1', 'PT Uji Sawit Satu', '62', 'Katingan', 4, ?, -2.12, 113.56, ?)").bind(hari, kini, kini).run();
    assert.equal((await api("GET", "/api/posko/panggilan", undefined, ADMIN, m2)).j.email_siap, true);
    luarLog = []; resend = {status: 500};
    const gagalKirim = await api("POST", "/api/posko/panggilan/eeeeeeeeeeeeeeee", {aksi: "email"}, ADMIN, m2);
    assert.equal(gagalKirim.s, 502, gagalKirim.t); assert.ok(!gagalKirim.t.includes("RAHASIA-BALASAN"), "isi balasan Resend tidak ikut respons"); assert.match(gagalKirim.t, /Resend HTTP 500/); assert.equal((await D2.prepare("SELECT status FROM panggilan").first()).status, "baru", "kirim gagal: tidak ada hitung mundur");
    resend = {status: 200};
    const ok = await api("POST", "/api/posko/panggilan/eeeeeeeeeeeeeeee", {aksi: "email", pesan: "Mohon balas"}, ADMIN, m2); assert.equal(ok.s, 200, ok.t); assert.equal(ok.j.terkirim, true);
    assert.deepEqual(resend.diterima.to, ["pt@uji.id"]); assert.equal(resend.diterima.from, "Posko <posko@contoh.id>"); assert.equal(resend.diterima.reply_to, "admin@contoh.id");
    assert.match(resend.diterima.subject, /4 titik panas di konsesi PT Uji Sawit Satu/); assert.match(resend.diterima.text, /Batas respons/); assert.match(resend.diterima.html, /Mohon balas/);
    const p = await D2.prepare("SELECT status, saluran, dipanggil_pada, batas FROM panggilan").first();
    assert.equal(p.status, "dipanggil"); assert.equal(p.saluran, "email"); assert.equal(p.batas, p.dipanggil_pada + 2 * JAM);
    assert.equal(luarLog.filter(h => h === "api.resend.com").length, 2, "tepat dua panggilan Resend: satu gagal, satu berhasil, tak ada kiriman lain");
  } finally { await m2.dispose(); }
});

uji("templat paparan: skema ketat, publik membaca tanpa data sensitif, simpan hanya admin", async () => {
  const k = await api("GET", "/api/paparan/templat"); assert.equal(k.s, 200); assert.deepEqual(k.j, {versi: 1, slide: [], tambahan: []});
  const sah = {versi: 1, slide: [{id: "pembuka", aktif: true, urutan: 1}, {id: "neraca", aktif: false, urutan: 2}],
    tambahan: [{id: "catatan-kapolda", judul: "Arahan Kapolda", sub: "19 Okt", isi: ["Satu", "Dua"], gambar_url: "/img/dummy/001.jpg", setelah: "pembuka"}]};
  const cobaan = [[{...sah, versi: 2}, "versi"], [{...sah, rahasia: 1}, "kunci"], [[], "objek"], [{versi: 1, slide: [{id: "Besar", aktif: true, urutan: 1}]}, "id"], [{versi: 1, slide: [{id: "a", aktif: "ya", urutan: 1}]}, "aktif"],
    [{versi: 1, slide: [{id: "a", aktif: true, urutan: 1}, {id: "a", aktif: true, urutan: 2}]}, "berulang"], [{versi: 1, slide: [{id: "a", aktif: true, urutan: -1}]}, "urutan"],
    [{versi: 1, tambahan: [{id: "t", judul: "<b>x</b>", isi: [], setelah: "a"}]}, "<"], [{versi: 1, tambahan: [{id: "t", judul: "", isi: [], setelah: "a"}]}, "judul"],
    [{versi: 1, tambahan: [{id: "t", judul: "x", isi: Array(21).fill("a"), setelah: "a"}]}, "isi"], [{versi: 1, tambahan: [{id: "t", judul: "x", isi: [5], setelah: "a"}]}, "isi[0]"],
    [{versi: 1, tambahan: [{id: "t", judul: "x", isi: [], setelah: "a", gambar_url: "javascript:alert(1)"}]}, "gambar"], [{versi: 1, tambahan: [{id: "t", judul: "x", isi: [], setelah: "a", gambar_url: "//evil.com/x.png"}]}, "gambar"],
    [{versi: 1, tambahan: [{id: "t", judul: "x", isi: [], setelah: "a", gambar_url: "http://evil.com/x.png"}]}, "gambar"], [{versi: 1, tambahan: [{id: "t", judul: "x", isi: [], setelah: "a", gambar_url: "https://cdn.contoh.id/x.png"}]}, "gambar"], [{versi: 1, tambahan: [{id: "t", judul: "x", isi: [], setelah: "A B"}]}, "setelah"],
    [{versi: 1, slide: Array.from({length: 61}, (_, i) => ({id: "s" + i, aktif: true, urutan: i}))}, "60"]];
  for (const [c, kata] of cobaan) { const r = await adm("POST", "/api/posko/templat", c); assert.equal(r.s, 400, kata + " " + r.t); assert.ok(r.j.galat, kata); }
  assert.equal((await adm("POST", "/api/posko/templat", {versi: 1, tambahan: [{id: "t", judul: "x", isi: ["y".repeat(300)], setelah: "a"}]})).s, 201);
  assert.equal((await adm("POST", "/api/posko/templat", {versi: 1, tambahan: Array.from({length: 30}, (_, i) => ({id: "t" + i, judul: "j".repeat(120), sub: "s".repeat(200), isi: Array(20).fill("i".repeat(300)), setelah: "a"}))})).s, 413, "lebih dari 64 KB = 413");
  assert.equal(await n("paparan_templat"), 1);
  assert.equal((await api("POST", "/api/posko/templat", sah)).s, 403, "publik tidak boleh menyimpan");
  const ok = await adm("POST", "/api/posko/templat", sah); assert.equal(ok.s, 201, ok.t);
  const baca = await api("GET", "/api/paparan/templat"); assert.deepEqual(baca.j, sah); assert.equal(await n("paparan_templat"), 1, "tetap satu baris");
  assert.deepEqual((await adm("GET", "/api/posko/templat")).j.templat, sah);
  assert.ok("galat" in (cekTemplat({versi: 1, slide: "x"})));
});

uji("dummy Super Admin: isi menumbuhkan seluruh rantai (tiap ember terisi), hapus mengembalikan jumlah baris SEMULA dan angka asli utuh", async () => {
  const tabel = ["regu", "lapangan", "neraca_harian", "kontak_pt", "panggilan"];
  await adm("POST", "/api/posko/dummy", {aksi: "hapus"});   // sapu sisa dummy lama dulu, baru potret 'sebelum'
  const potret = async () => Object.fromEntries(await Promise.all(tabel.map(async t => [t, await n(t)])));
  const asli = await DB.prepare("SELECT * FROM neraca_harian ORDER BY tgl, prov, kab, sumber").all();
  const sebelum = await potret(), pubSebelum = (await api("GET", `/api/neraca?prov=62&tgl=${wib(Date.now())}`)).j;
  assert.equal((await api("POST", "/api/posko/dummy", {aksi: "isi"})).s, 403, "dummy hanya admin");
  assert.equal((await adm("POST", "/api/posko/dummy", {aksi: "terbang"})).s, 400);
  assert.equal(await n("regu"), sebelum.regu, "aksi liar tidak menulis");
  const isi = await adm("POST", "/api/posko/dummy", {aksi: "isi"}); assert.equal(isi.s, 201, isi.t);
  assert.equal((await adm("POST", "/api/posko/dummy", {aksi: "isi"})).s, 409, "gerbang 'sudah ada' menghitung baris yang MASIH hidup");
  const sesudah = await potret();
  for (const t of tabel) assert.ok(sesudah[t] > sebelum[t], `${t}: ${sebelum[t]} -> ${sesudah[t]} (tabel harus terisi)`);
  const dm = async (sql, ...b) => (await DB.prepare(sql).bind(...b).all()).results;
  /* tiap ember status terisi */
  assert.deepEqual((await dm("SELECT DISTINCT status s FROM panggilan WHERE dummy = 1 ORDER BY s")).map(x => x.s), [...STATUS_PANGGILAN].sort(), "tiap status panggilan punya baris");
  assert.deepEqual((await dm("SELECT DISTINCT status s FROM lapangan WHERE dummy = 1 ORDER BY s")).map(x => x.s), [...STATUS_LAP].sort(), "tiap status laporan regu terisi");
  assert.deepEqual([...new Set((await dm("SELECT kendala FROM lapangan WHERE dummy = 1")).flatMap(x => JSON.parse(x.kendala)))].sort(), Object.keys(KENDALA).sort(), "keenam kendala terisi");
  assert.deepEqual((await dm("SELECT DISTINCT sumber s FROM neraca_harian WHERE dummy = 1 ORDER BY s")).map(x => x.s), ["rakor", "regu"]);
  assert.ok((await dm("SELECT DISTINCT unsur FROM regu WHERE dummy = 1")).length >= 3, "beberapa unsur regu");
  assert.ok((await dm("SELECT count(*) n FROM panggilan WHERE dummy = 1 AND status = 'dipanggil' AND batas < ?", Date.now()))[0].n >= 1 && (await dm("SELECT count(*) n FROM panggilan WHERE dummy = 1 AND status = 'dipanggil' AND batas > ?", Date.now()))[0].n >= 1,
    "satu dipanggil yang sudah lewat batas dan satu yang masih berjalan");
  /* KELAS B: sisi yang dibandingkan layar tidak sama rata */
  const lp = await dm("SELECT luas_ha, padam_ha FROM lapangan WHERE dummy = 1 AND luas_ha IS NOT NULL");
  assert.ok(lp.some(x => x.padam_ha != null && x.padam_ha < x.luas_ha) && lp.some(x => x.padam_ha === x.luas_ha) && lp.some(x => x.padam_ha == null), "ada yang kurang, ada yang sama, ada yang kosong");
  assert.ok((await dm("SELECT count(*) n FROM neraca_harian WHERE dummy = 1 AND sumber = 'regu' AND sisa_ha > 0 AND padam_ha > 0 AND padam_ha < luas_ha"))[0].n >= 1, "neraca regu: padam < luas, sisa > 0");
  const rk = (await dm("SELECT kab, luas_ha FROM neraca_harian WHERE dummy = 1 AND sumber = 'rakor'")).find(x => x.luas_ha === 96.5);
  assert.ok(rk && (await dm("SELECT 1 FROM neraca_harian WHERE sumber = 'regu' AND kab = ? AND luas_ha != 96.5", rk.kab)).length, "rakor beda dari agregat regu di kabupaten yang sama");
  /* layar: publik tidak melihat dummy; admin ?dummy=1 melihat, dan rakor menang */
  const hari = wib(Date.now());
  assert.deepEqual((await api("GET", `/api/neraca?prov=62&tgl=${hari}`)).j, pubSebelum, "dummy tidak muncul di rute publik");
  const dm1 = await mf.dispatchFetch(`http://posko.lokal/api/neraca?prov=62&tgl=${hari}&dummy=1`, {headers: ADMIN}).then(r => r.json());
  assert.equal(dm1.kab.find(x => x.kab === rk.kab).luas_ha, 96.5); assert.equal(dm1.kab.find(x => x.kab === rk.kab).sumber, "rakor");
  assert.ok(dm1.total.fs > 0 && dm1.total.luas_ha > 0 && dm1.total.padam_ha > 0 && dm1.total.sisa_ha > 0 && dm1.total.personel > 0 && dm1.total.kendala.length > 0, "TIAP kolom neraca berangka: " + JSON.stringify(dm1.total));
  /* hapus: jumlah baris semula, angka asli utuh */
  const h = await adm("POST", "/api/posko/dummy", {aksi: "hapus"}); assert.equal(h.s, 200, h.t);
  assert.deepEqual(await potret(), sebelum, "selisih positif = kotoran dummy tertinggal, negatif = data asli ikut terhapus");
  assert.deepEqual((await DB.prepare("SELECT * FROM neraca_harian ORDER BY tgl, prov, kab, sumber").all()).results.map(x => ({...x, diubah: 0})), asli.results.map(x => ({...x, diubah: 0})), "angka asli (agregat + rakor) kembali persis");
  assert.equal((await adm("POST", "/api/posko/dummy", {aksi: "isi"})).s, 201, "isi lagi sesudah hapus harus berhasil");
  await adm("POST", "/api/posko/dummy", {aksi: "hapus"});
});

uji("halaman: /lapangan dilayani dengan CSP ketat; /admin/posko hanya untuk admin; berkas klien ada", async () => {
  for (const f of ["lapangan.html", "lapangan.js", "lapangan.css", "admin/posko.js", "admin/posko.css"]) assert.ok(existsSync(path.join(AKAR, "public", f)), f);
  const l = await mf.dispatchFetch("http://posko.lokal/lapangan"), t = await l.text();
  assert.equal(l.status, 200); assert.ok(t.includes("/lapangan.js"));
  assert.match(l.headers.get("content-security-policy"), /script-src 'self'/); assert.doesNotMatch(l.headers.get("content-security-policy"), /unsafe-inline/); assert.equal(l.headers.get("referrer-policy"), "no-referrer");
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(t) && !/\son\w+=/i.test(t) && !/\sstyle=/i.test(t), "tanpa skrip/gaya inline (CSP)");
  const a = await mf.dispatchFetch("http://posko.lokal/admin/posko", {redirect: "manual"}); assert.equal(a.status, 303); assert.match(a.headers.get("location"), /\/admin\/masuk/);
  const ok = await mf.dispatchFetch("http://posko.lokal/admin/posko", {headers: ADMIN}), h = await ok.text();
  assert.equal(ok.status, 200); assert.ok(h.includes("/admin/posko.js")); assert.match(ok.headers.get("content-security-policy"), /script-src 'self'/);
});

uji("bersih-bersih menit 17: laporan > 180 hari dibuang, yang baru utuh", async () => {
  const g = await buatRegu({nama: "Regu Bersih"}), kini = Date.now();
  const ins = (id, dibuat) => DB.prepare("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, status, prov, kab) VALUES (?, ?, ?, ?, ?, ?, -2.1, 113.5, 'bara', '62', 'Katingan')").bind(id, g.id, "bersih-" + id, wib(dibuat), dibuat, dibuat).run();
  await ins("a000000000000001", kini - 200 * 24 * JAM); await ins("a000000000000002", kini - 2 * JAM);
  await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 16, 5, 17)});
  assert.deepEqual((await DB.prepare("SELECT id FROM lapangan WHERE regu_id = ?").bind(g.id).all()).results.map(x => x.id), ["a000000000000002"]);
  await DB.prepare("DELETE FROM lapangan WHERE regu_id = ?").bind(g.id).run(); await DB.prepare("DELETE FROM neraca_harian").run();   // jangan meninggalkan baris tak teragregasi untuk uji berikutnya
});

const ipH = ip => sha256("garam-uji|" + ip);
const MOD = {"x-admin-token": "moderator-dua"}, GERBANG = {"x-admin-token": "gerbang@x:sandi"};

uji("peran: dummy hanya Super Admin (tertutup bila SUPER_ADMIN kosong); kontak PT dan kirim ke perusahaan bukan untuk akun gerbang situs", async () => {
  const sebelum = await n("regu");
  for (const h of [MOD, GERBANG, {}]) { const r = await api("POST", "/api/posko/dummy", {aksi: "isi"}, h); assert.equal(r.s, 403, JSON.stringify(h) + r.t); }
  assert.equal(await n("regu"), sebelum, "ditolak = tidak menulis");
  const m2 = new Miniflare(opsi("uji-posko-tanpa-super", {SUPER_ADMIN: ""}));
  try {
    const D2 = await m2.getD1Database("DB"); await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
    const r = await api("POST", "/api/posko/dummy", {aksi: "isi"}, ADMIN, m2); assert.equal(r.s, 403, "tanpa SUPER_ADMIN dummy tertutup bahkan untuk admin: " + r.t);
    assert.equal((await D2.prepare("SELECT count(*) n FROM regu").first()).n, 0);
  } finally { await m2.dispose(); }
  assert.equal((await api("GET", "/api/posko/kontak", undefined, MOD)).s, 200, "moderator boleh");
  const id = "0123456789abcdef";
  for (const [m, j, b] of [["GET", "/api/posko/kontak"], ["POST", "/api/posko/kontak", {perusahaan_id: "pt-x-1", nama_pt: "PT X", email: "a@b.id"}], ["POST", "/api/posko/kontak/impor", {csv: "perusahaan_id,nama_pt,email\npt-x-1,PT X,a@b.id"}],
    ["POST", `/api/posko/kontak/${id}`, {aksi: "hapus"}], ["POST", `/api/posko/panggilan/${id}`, {aksi: "wa"}], ["POST", `/api/posko/panggilan/${id}`, {aksi: "email"}], ["POST", `/api/posko/panggilan/${id}`, {aksi: "telepon"}]]) {
    const r = await api(m, j, b, GERBANG); assert.equal(r.s, 403, `${m} ${j} akun gerbang = ${r.s}`); assert.match(r.j.galat, /moderator/);
  }
  assert.equal((await api("GET", "/api/posko/regu", undefined, GERBANG)).s, 200, "akun gerbang tetap admin biasa untuk yang lain");
  const tolak = await api("GET", "/api/posko/regu"); assert.equal(tolak.j.galat, "akses ditolak"); assert.ok(!/ADMIN_TOKEN/.test(tolak.t), "pesan 403 generik, tanpa bocoran konfigurasi");
});

uji("angka publik dari satu kode: luas/padam <= 5000, pencilan DITAHAN sampai admin setuju, dedup per sel, waktu_gps <= 6 jam, batas per kabupaten per hari", async () => {
  await DB.prepare("DELETE FROM lapangan").run(); await DB.prepare("DELETE FROM neraca_harian").run();   // lembar bersih: baseline tidak tercemar baris langsung dari uji lain
  const g = await buatRegu({nama: "Regu Pencilan"}), total = async () => (await api("GET", "/api/neraca?prov=62")).j.total, awal = await total(), now = Date.now();
  for (const c of [{luas_ha: 5001}, {luas_ha: 5000, padam_ha: 5001}, {waktu_gps: now - 7 * JAM}]) assert.equal((await kirim(g.kode, {...lap(-2.2, 113.7), ...c})).s, 400, JSON.stringify(c));
  assert.rejects(DB.prepare("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, status, prov, kab, luas_ha) VALUES ('f000000000000001', ?, 'klien-luas-1', '2026-10-19', 1, 1, -2, 113, 'bara', '62', 'K', 6000)").bind(g.id).run(), /5000/);
  const r = await kirim(g.kode, lap(-2.2, 113.7, {luas_ha: 4000, padam_ha: 100})); assert.equal(r.s, 201, r.t); assert.equal(r.j.ditahan, true);
  assert.deepEqual(await total(), awal, "ditahan: tidak masuk angka publik");
  await assert.rejects(DB.prepare("UPDATE lapangan SET kendala = '[\"hantu\"]' WHERE id = ?").bind(r.j.id).run(), /kendala/, "trigger UPDATE kendala (0019)");
  const th = await DB.prepare("SELECT putusan, alasan FROM lapangan_tahan WHERE lapangan_id = ?").bind(r.j.id).first(); assert.equal(th.putusan, "tahan"); assert.match(th.alasan, /luas 4000/);
  const daftar = await adm("GET", "/api/posko/lapangan"); assert.equal(daftar.j.laporan.find(x => x.id === r.j.id).putusan, "tahan");
  assert.equal((await adm("POST", `/api/posko/lapangan/${r.j.id}`, {aksi: "ngawur"})).s, 400); assert.equal((await adm("POST", "/api/posko/lapangan/ffffffffffffffff", {aksi: "setuju"})).s, 404);
  assert.equal((await api("POST", `/api/posko/lapangan/${r.j.id}`, {aksi: "setuju"})).s, 403);
  assert.equal((await adm("POST", `/api/posko/lapangan/${r.j.id}`, {aksi: "setuju"})).s, 200);
  const t2 = await total(); assert.equal(t2.luas_ha, awal.luas_ha + 4000); assert.equal(t2.fs, awal.fs + 1);
  assert.equal((await adm("POST", `/api/posko/lapangan/${r.j.id}`, {aksi: "tahan"})).s, 200); assert.deepEqual(await total(), awal, "ditahan lagi: kembali");
  /* laporan wajar tidak ditahan; dua laporan satu regu di satu sel ~1 km dihitung sekali (yang terbaru) */
  const a = await kirim(g.kode, lap(-2.141, 113.571, {luas_ha: 3}, now - 60e3)); assert.equal(a.j.ditahan, false);
  const b2 = await kirim(g.kode, lap(-2.143, 113.573, {luas_ha: 4}, now)); assert.equal(b2.s, 201); assert.equal(b2.j.kab, a.j.kab, "dua titik satu sel harus satu kabupaten");
  const t3 = await total(); 
  assert.equal(t3.fs, awal.fs + 1, "dua laporan satu sel = satu"); assert.equal(t3.luas_ha, awal.luas_ha + 4, "yang terbaru menang");
  /* batas per kabupaten per hari: atomik di INSERT */
  const kab = (await DB.prepare("SELECT kab FROM lapangan WHERE id = ?").bind(a.j.id).first()).kab, lama = Date.now() - 3 * JAM, st = [];
  for (let i = 0; i < 300; i++) st.push(DB.prepare("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, status, prov, kab) VALUES (?, ?, ?, ?, ?, ?, -2.1, 113.5, 'bara', '62', ?)").bind(`c${String(i).padStart(15, "0")}`, g.id, `massal-kab-${i}`, wib(Date.now()), lama, lama, kab));
  await DB.batch(st);
  const lalu = await kirim(g.kode, lap(-2.14, 113.57)); assert.equal(lalu.s, 429, lalu.t);
  assert.equal((await DB.prepare("SELECT count(*) n FROM lapangan WHERE klien_id LIKE 'uji-klien-%' AND regu_id = ? AND luas_ha IS NULL").bind(g.id).first()).n, 0, "429 = tidak ada baris");
  await DB.prepare("DELETE FROM lapangan WHERE klien_id LIKE 'massal-kab-%'").run();
});

uji("tebakan kode regu dan token admin dihitung per IP bergaram; login dan IP lain tidak terganggu", async () => {
  const ip = "203.0.113.7", g = await buatRegu({nama: "Regu Brute"}), pasang = async (k, aksi, jumlah) => DB.batch(Array.from({length: jumlah}, () => DB.prepare("INSERT INTO laju_posko (kunci, aksi, waktu) VALUES (?, ?, ?)").bind(k, aksi, Date.now())));
  for (let i = 0; i < 3; i++) assert.equal((await api("POST", "/api/lapangan", lap(-2.1, 113.5), {"cf-connecting-ip": ip, "x-kode-regu": "0".repeat(26)})).s, 403);
  const baris = (await DB.prepare("SELECT kunci FROM laju_posko WHERE aksi = 'kode_gagal'").all()).results;
  assert.equal(baris.filter(x => x.kunci === ipH(ip)).length, 3, "tiap kegagalan tercatat"); assert.ok(!baris.some(x => x.kunci === ip), "IP mentah tidak tersimpan");
  await pasang(ipH(ip), "kode_gagal", 297);
  const blok = await api("POST", "/api/lapangan", lap(-2.1234, 113.5678), {"cf-connecting-ip": ip, "x-kode-regu": g.kode}); assert.equal(blok.s, 201, "300 gagal: kode BENAR tetap lolos (tidak ikut terkunci)");
  const salahLagi = await api("POST", "/api/lapangan", lap(-2.1234, 113.5678), {"cf-connecting-ip": ip, "x-kode-regu": "0".repeat(26)}); assert.equal(salahLagi.s, 429, "300 gagal: tebakan salah berikutnya 429"); assert.ok(salahLagi.h.get("retry-after"));
  assert.equal((await api("POST", "/api/lapangan", lap(-2.1234, 113.5678), {"cf-connecting-ip": "203.0.113.8", "x-kode-regu": g.kode})).s, 201, "IP lain tidak terkena");
  /* admin lewat header */
  const ip2 = "203.0.113.9", salah = {"cf-connecting-ip": ip2, "x-admin-token": "tebakan"};
  for (let i = 0; i < 3; i++) assert.equal((await api("GET", "/api/posko/regu", undefined, salah)).s, 403);
  assert.equal((await DB.prepare("SELECT count(*) n FROM laju_posko WHERE aksi = 'admin_gagal' AND kunci = ?").bind(ipH(ip2)).first()).n, 3);
  assert.equal((await api("GET", "/api/posko/regu", undefined, {"cf-connecting-ip": ip2, ...ADMIN})).s, 200, "di bawah batas: token benar lolos");
  await pasang(ipH(ip2), "admin_gagal", 297);
  assert.equal((await api("GET", "/api/posko/regu", undefined, {"cf-connecting-ip": ip2, ...ADMIN})).s, 403, "300 gagal: token benar pun ditolak dari IP itu");
  assert.equal((await api("GET", "/api/posko/regu", undefined, {"cf-connecting-ip": "203.0.113.10", ...ADMIN})).s, 200, "IP lain normal");
  assert.equal((await api("GET", "/api/posko/regu", undefined, ADMIN)).s, 200, "tanpa IP (skrip lokal) normal");
  const masuk = await mf.dispatchFetch("http://posko.lokal/admin/masuk", {method: "POST", redirect: "manual", headers: {"cf-connecting-ip": ip2, "content-type": "application/x-www-form-urlencoded"}, body: "email=gerbang%40x&sandi=sandi"});
  assert.equal(masuk.status, 303, "form masuk punya batas sendiri dan tidak ikut terkunci"); const ck = masuk.headers.get("set-cookie"); assert.match(ck, /sesi_admin=/);
  const sesi = await mf.dispatchFetch("http://posko.lokal/api/posko/regu", {headers: {cookie: ck.split(";")[0], "cf-connecting-ip": ip2}}); assert.equal(sesi.status, 200, "cookie sesi tidak lewat penghitung header");
  await DB.prepare("DELETE FROM laju_posko").run();
});

uji("body dibaca per byte: chunked tanpa Content-Length tetap kena 413 (JSON dan foto); foto: EXIF dibuang, batas 30 foto per jam per regu", async () => {
  const aliran = (total, h) => { let kirimn = 0; return mf.dispatchFetch("http://posko.lokal" + h.j, {method: "POST", headers: h.h, duplex: "half", body: new ReadableStream({pull(c) { if (kirimn >= total) return c.close(); c.enqueue(new Uint8Array(65536).fill(0x41)); kirimn += 65536; }})}); };
  const r1 = await aliran(100 * 1024, {j: "/api/posko/regu", h: {...ADMIN, "content-type": "application/json"}}); assert.equal(r1.status, 413, await r1.text());
  const g = await buatRegu({nama: "Regu Foto Dua"}), l = await kirim(g.kode, lap(-2.1234, 113.5678)); assert.equal(l.s, 201);
  const r2 = await aliran(2 * 1048576, {j: `/api/lapangan/foto/${l.j.id}`, h: {"x-kode-regu": g.kode}}); assert.equal(r2.status, 413, await r2.text());
  assert.equal((await DB.prepare("SELECT foto FROM lapangan WHERE id = ?").bind(l.j.id).first()).foto, 0);
  const jfif = [0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0], exif = [0xff, 0xe1, 0, 8, 69, 120, 105, 102, 0, 0], sos = [0xff, 0xda, 0, 8, 1, 1, 0, 0, 63, 0, 1, 2, 3, 0xff, 0xd9];
  const asli = new Uint8Array([0xff, 0xd8, ...jfif, ...exif, ...sos]), bersih = new Uint8Array([0xff, 0xd8, ...jfif, ...sos]);
  assert.deepEqual([...buangExif(asli)], [...bersih]); assert.deepEqual([...buangExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1]))].length, 7, "struktur janggal = apa adanya");
  assert.equal((await api("POST", `/api/lapangan/foto/${l.j.id}`, asli, {"x-kode-regu": g.kode})).s, 200);
  const f = await mf.dispatchFetch(`http://posko.lokal/api/posko/foto/${l.j.id}`, {headers: ADMIN}); assert.deepEqual([...new Uint8Array(await f.arrayBuffer())], [...bersih], "APP1/EXIF tidak tersimpan di R2");
  const l2 = await kirim(g.kode, lap(-2.3, 113.6)); assert.equal(l2.s, 201);
  await DB.batch(Array.from({length: 30}, () => DB.prepare("INSERT INTO laju_posko (kunci, aksi, waktu) VALUES (?, 'foto', ?)").bind(g.id, Date.now())));
  const batas = await api("POST", `/api/lapangan/foto/${l2.j.id}`, asli, {"x-kode-regu": g.kode}); assert.equal(batas.s, 429, batas.t);
  await DB.prepare("DELETE FROM laju_posko").run();
});

uji("origin tak terurai ditolak 403 JSON (bukan 500) di rute POST", async () => {
  for (const o of ["bukan url", "http://", "://x"]) { const r = await api("POST", "/api/posko/regu", {x: 1}, {...ADMIN, origin: o}); assert.equal(r.s, 403, o + " " + r.t); assert.ok(r.j.galat); }
  const w = await api("POST", "/api/warga", {}, {origin: "bukan url"}); assert.equal(w.s, 403);
});

uji("centurisk97.id: /lapangan terbuka tanpa sesi lewat daftar putih bernama; semua halaman lain tertutup (halaman baru ikut terkunci)", async () => {
  /* /instansi masuk daftar putih atas keputusan pemilik 21 Okt 2026: pemda, polisi, dan TNI memakai akun instansi sendiri (bukan sesi admin); sesi, status aktif, dan cakupan dicek di API */
  /* /presiden: panel publik agregat karhutla untuk dashboard presiden, tanpa data pribadi (keputusan pemilik 22 Okt 2026) */
  /* /daftar-kontak: registrasi kontak pemangku kepentingan yang tak punya akun situs (permintaan pemilik 23 Okt 2026); hanya menulis baris menunggu */
  /* /pendataan: staf direktorat BNPB membuat akun pendataan sendiri (keputusan pemilik 26 Okt 2026); akun menunggu persetujuan Super Admin */
  /* /uji-pilot: regu uji pilot SIPPA membuka dossier dan melapor lewat tautan bertoken (keputusan SIPPA 59); token dicek di tiap API */
  assert.deepEqual([...PUBLIK_TANPA_SESI.keys()], ["/lapangan", "/daftar-kontak", "/uji-pilot", "/presiden", "/instansi", "/pendataan"], "daftar putih persis enam halaman, masing-masing bersama alasan");
  assert.ok([...PUBLIK_TANPA_SESI.values()].every(a => a.length > 20));
  const buka = j => mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", headers: {"cf-connecting-ip": "198.51.100.9"}}).then(async r => { await r.text(); return r; });
  assert.equal((await buka("/lapangan")).status, 200);
  assert.equal((await buka("/pendataan")).status, 200);
  const a = await buka("/admin/posko"); assert.equal(a.status, 303); assert.match(a.headers.get("location"), /\/admin\/masuk/);
  const halaman = new Set(["/", "/peringatan", "/privasi", "/laporan", "/f/0123456789abcdef"]);
  for (const f of ["worker.js", "foto.js", "sosmed.js", "posko.js", "ews.js", "gempa.js", "statistik.js"])
    for (const [, x] of readFileSync(path.join(AKAR, "src", f), "utf8").matchAll(/^\s*"GET (\/[\w\/:]*)":/gm)) if (!/^\/(api|admin|ews|ubin|pipa)(\/|$)/.test(x) && x !== "/lapangan") halaman.add(x.replace(":id", "0123456789abcdef"));
  assert.ok(halaman.has("/statistik"), "pemindai menemukan rute halaman");
  for (const j of halaman) { const r = await buka(j); assert.equal(r.status, 303, `${j} di centurisk97.id harus terkunci tanpa sesi, dapat ${r.status}`); assert.match(r.headers.get("location"), /^\/admin\/masuk/); }
  /* berkas HTML statis dibuka langsung lewat nama (run_worker_first ["/*.html"] di wrangler*.jsonc memanggil Worker HANYA untuk pola ini) */
  for (const j of ["/laporan.html", "/index.html", "/warga/index.html", "/paparan.html", "/banjir/index.html", "/tentang.html", "/LAPORAN.HTML"]) { const r = await buka(j); assert.equal(r.status, 303, `${j} di centurisk97.id = ${r.status}`); assert.match(r.headers.get("location"), /^\/admin\/masuk/); }
  const lh = await buka("/lapangan.html"); assert.equal(lh.status, 303); assert.equal(lh.headers.get("location"), "/lapangan", "lapangan.html dialihkan ke satu pintu");
  const sesi = await mf.dispatchFetch("https://centurisk97.id/laporan.html", {headers: ADMIN}); assert.equal(sesi.status, 200, "dengan sesi admin berkas terbuka"); await sesi.text();
  for (const j of ["/laporan.html", "/index.html", "/warga/index.html"]) { const r = await mf.dispatchFetch("https://pantau.terasurban.com" + j, {redirect: "manual"}); await r.text(); assert.equal(r.status, 200, `${j} di host publik harus 200`); }
  for (const j of ["/data/meta.json", "/informasi_jenis.js", "/admin/admin.css"]) { const r = await buka(j); assert.equal(r.status, 200, `${j} (JSON/JS/CSS) tidak digerbang`); }
  assert.equal((await mf.dispatchFetch("https://centurisk97.id/admin/masuk", {redirect: "manual"})).status, 200, "halaman masuk tetap terbuka");
  const ews = await mf.dispatchFetch("https://centurisk97.id/ews/berhenti?x=1", {redirect: "manual"}); assert.ok(!(ews.headers.get("location") || "").startsWith("/admin/masuk"), "tautan surel EWS tidak digerbang admin");
});

/* ================================================================ L1: laporan regu berkode menaut ke tugas api terdekat (src/instansi.js tautkanLaporanRegu) */
uji("L1: laporan regu menaut ke tugas api terdekat di kabupaten sama; padam = laporan padam, menyala sesudah padam = muncul_lagi; kabupaten lain dan >2 km tidak; respons regu tidak berubah", async () => {
  const lat = -2.1234, lon = 113.5678, now = Date.now(), dm = m => m / 111320;
  const tugas = async (kab, la, lo, o = {}) => {
    const id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
    await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status) VALUES (?, '62', ?, 'Kec Uji', ?, ?, 3, 5, 10, ?, ?, 'buka')").bind(id, kab, la, lo, now - JAM, now - JAM).run();
    return id;
  };
  const baca = id => DB.prepare("SELECT status, padam_verif, padam_pada, verif_pada FROM tugas_api WHERE id = ?").bind(id).first();
  const tautan = id => DB.prepare("SELECT tugas_id, status, jarak_km FROM tugas_lapangan WHERE lapangan_id = ?").bind(id).first();
  const g1 = await buatRegu(), probe = await kirim(g1.kode, lap(lat, lon, {status: "tidak_ditemukan"}, now)); assert.equal(probe.s, 201, probe.t);
  const kab = probe.j.kab; assert.deepEqual(Object.keys(probe.j).sort(), ["ditahan", "id", "kab", "kompleks_id", "prov"], "kontrak respons /api/lapangan tidak berubah");
  assert.equal(await DB.prepare("SELECT 1 x FROM tugas_lapangan WHERE lapangan_id = ?").bind(probe.j.id).first(), null, "tanpa tugas di dekatnya: tidak ada tautan");
  const dekat = await tugas(kab, lat + dm(300), lon), jauh = await tugas(kab, lat + dm(2600), lon), lain = await tugas("Kabupaten Lain Uji", lat, lon);
  /* padam dari regu: tugas dekat menjadi padam_dilaporkan, padam_pada = waktu GPS laporan */
  const g2 = await buatRegu(), p = await kirim(g2.kode, lap(lat, lon, {status: "padam", luas_ha: 2, padam_ha: 2}, now)); assert.equal(p.s, 201, p.t);
  assert.equal((await baca(dekat)).status, "buka", "keamanan ops: satu regu padam hanya klaim");
  const g2b = await buatRegu(), p2 = await kirim(g2b.kode, lap(lat + 0.0001, lon, {status: "padam", luas_ha: 2, padam_ha: 2}, now + 1000)); assert.equal(p2.s, 201, p2.t);
  const t = await baca(dekat); assert.equal(t.status, "padam"); assert.equal(t.padam_verif, "padam_dilaporkan"); assert.ok(Math.abs(t.padam_pada - now) < 5000, "padam_pada = waktu GPS laporan");
  const tl = await tautan(p.j.id); assert.equal(tl.tugas_id, dekat); assert.equal(tl.status, "padam"); assert.ok(Math.abs(tl.jarak_km - 0.3) < 0.05, tl.jarak_km);
  for (const x of [jauh, lain]) assert.deepEqual([(await baca(x)).status, (await baca(x)).padam_verif], ["buka", null], "tugas >2 km dan kabupaten lain tak tersentuh");
  /* menyala sesudah padam dari regu lain: tugas dibuka kembali, rincian sumber regu */
  await DB.prepare("UPDATE tugas_api SET padam_pada = ?, verif_pada = ? WHERE id = ?").bind(now - 3 * JAM, now - 3 * JAM, dekat).run();
  const g3 = await buatRegu(), m = await kirim(g3.kode, lap(lat, lon, {status: "bara"}, Date.now())); assert.equal(m.s, 201, m.t);
  const t2 = await baca(dekat); assert.equal(t2.status, "buka"); assert.equal(t2.padam_verif, "muncul_lagi");
  const mu = await DB.prepare("SELECT sumber, jarak_km FROM tugas_muncul WHERE tugas_id = ?").bind(dekat).first(); assert.equal(mu.sumber, "regu"); assert.ok(mu.jarak_km < 0.4);
  /* laporan yang ditahan (pencilan luas) menaut tetapi tidak mengubah status tugas */
  await DB.prepare("UPDATE tugas_api SET status = 'padam', padam_verif = 'padam_dilaporkan', padam_pada = ?, verif_pada = ? WHERE id = ?").bind(now - 3 * JAM, now - 3 * JAM, dekat).run();
  const g4 = await buatRegu(), tahan = await kirim(g4.kode, lap(lat, lon, {status: "menyala", luas_ha: 5000}, Date.now())); assert.equal(tahan.s, 201, tahan.t); assert.equal(tahan.j.ditahan, true);
  assert.equal((await baca(dekat)).padam_verif, "padam_dilaporkan", "laporan ditahan: tidak membuka kembali"); assert.equal((await tautan(tahan.j.id)).tugas_id, dekat);
});

uji("keamanan ops: regu dengan GPS di kabupaten lain tidak berefek pada tugas; klaim tercatat tetapi tidak dipercaya", async () => {
  const lat = -2.1234, lon = 113.5678, now = Date.now();
  const id = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
  const g0 = await buatRegu(), probe = await kirim(g0.kode, lap(lat, lon, {status: "tidak_ditemukan"}, now)); assert.equal(probe.s, 201, probe.t);
  await DB.prepare("INSERT INTO tugas_api (id, prov, kab, kec, lat, lon, level, n24, luas_ha, dibuat, terakhir_terdeteksi, status) VALUES (?, '62', ?, 'Kec Uji', ?, ?, 3, 5, 10, ?, ?, 'buka')").bind(id, probe.j.kab, lat, lon, now - JAM, now - JAM).run();
  /* dua regu terdaftar di kabupaten LAIN, tetapi GPS-nya di kabupaten tugas: laporan tersimpan, tugas tidak berubah */
  for (const i of [1, 2]) { const g = await buatRegu({kab: "Kabupaten Jauh Uji"}), r = await kirim(g.kode, lap(lat + i * 0.0001, lon, {status: "padam", luas_ha: 2, padam_ha: 2}, now + i * 1000)); assert.equal(r.s, 201, r.t); }
  assert.equal((await DB.prepare("SELECT status FROM tugas_api WHERE id = ?").bind(id).first()).status, "buka");
  assert.equal((await DB.prepare("SELECT count(*) n FROM tugas_lapangan WHERE tugas_id = ? AND dipercaya = 0").bind(id).first()).n, 2, "klaim tercatat, tidak dipercaya");
  assert.equal((await DB.prepare("SELECT count(*) n FROM lapangan WHERE regu_id IN (SELECT id FROM regu WHERE kab = 'Kabupaten Jauh Uji')").first()).n, 2, "laporan tetap tersimpan");
});
