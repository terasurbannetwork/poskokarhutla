/* label: ekspor label harian teranonim. worker.js utuh di workerd + D1 lokal (TEST.md: tanpa mock). */
import {test} from "node:test";
import assert from "node:assert/strict";
import {siapkan, berantai} from "./_bnpb.mjs";
import "../../src/worker.js";   // dulu: modul src saling impor lewat worker.js
import {labelHarian} from "../../src/label.js";

const uji = berantai();
const U = await siapkan("uji-label", {ikat: {PIPA_TOKEN: "token-pipa-uji"}});
const PIPA = {authorization: "Bearer token-pipa-uji"}, wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const KINI = Date.now(), KEMARIN = KINI - 864e5, TGL = wib(KEMARIN);
const get = (j, h) => U.api("GET", "/api/pipa/label" + j, undefined, h);
const H = "a".repeat(64);
const laporan = (id, bahaya, lat, lon, ekstra = {}) => U.DB.prepare(`INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, teks, dibuat, kedaluwarsa, ip_hash, token_hash, disembunyikan) VALUES (?, 'info', 'umum', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  .bind(id, bahaya, lat, lon, ekstra.teks || "", KEMARIN, KEMARIN + 36e5, H, H, ekstra.sembunyi || 0).run();
const tugas = (id, status, padam, konf, lat = 5.5707, lon = 95.3302) => U.DB.prepare(`INSERT INTO tugas_api (id, prov, kab, lat, lon, level, dibuat, terakhir_terdeteksi, status, padam_pada, konfirmasi_pada, dummy) VALUES (?, '11', 'Kota Banda Aceh', ?, ?, 1, ?, ?, ?, ?, ?, ?)`)
  .bind(id, lat, lon, KEMARIN - 1e6, KEMARIN - 1e6, status, padam, konf, id.startsWith("dummy") ? 1 : 0).run();

uji("auth: tanpa token 401, token salah 401, token Worker kosong 503", async () => {
  assert.equal((await get("")).s, 401);
  assert.equal((await get("", {authorization: "Bearer salah"})).s, 401);
  assert.equal((await get("?sejak=bukan", PIPA)).s, 400);
  assert.equal((await get("", PIPA)).s, 200);
  const T = await siapkan("uji-label-503");
  assert.equal((await T.api("GET", "/api/pipa/label", undefined, PIPA)).s, 503);
});

uji("agregasi: regu + warga + konfirmasi dijumlah per (tanggal, kec, jenis, status, sumber)", async () => {
  await tugas("regu000000000001", "padam", KEMARIN, KEMARIN);
  await tugas("regu000000000002", "padam", KEMARIN, KEMARIN);
  await tugas("regu000000000003", "buka", null, KEMARIN);
  await tugas("regu000000000004", "bukan_api", null, KEMARIN);
  await tugas("regu000000000005", "buka", null, null);                  // belum dikonfirmasi lapangan: tidak ikut
  await tugas("dummy00000000006", "padam", KEMARIN, KEMARIN);          // dummy: tidak ikut
  await laporan("warga001", "banjir", 5.5707, 95.3302, {teks: "rumah pak Budi 08123456789"});
  await laporan("warga002", "banjir", 5.5707, 95.3302);
  await laporan("warga003", "karhutla", 5.5707, 95.3302, {sembunyi: 1});  // disembunyikan: tidak ikut
  await U.DB.prepare("INSERT INTO prediksi_konfirmasi (kab, tanggal, kode, terjadi, sumber, kode_regu, dibuat) VALUES ('Katingan', ?, 'BNJ', 0, 'regu', 'rahasia-regu', 'x')").bind(TGL).run();
  const r = await get(`?sejak=${wib(KINI - 3 * 864e5)}`, PIPA); assert.equal(r.s, 200, r.t);
  const cari = (sumber, jenis, status) => r.j.label.filter(x => x.sumber === sumber && x.jenis === jenis && x.status === status && x.tanggal === TGL);
  const sum = a => a.reduce((s, x) => s + x.n, 0);
  assert.equal(sum(cari("regu", "karhutla", "padam")), 2, r.t);
  assert.equal(sum(cari("regu", "karhutla", "menyala")), 1, r.t);
  assert.equal(sum(cari("regu", "karhutla", "bukan_api")), 1, r.t);
  assert.equal(sum(cari("warga", "banjir", "terjadi")), 2, r.t);
  assert.equal(sum(cari("warga", "karhutla", "terjadi")), 0, "laporan tersembunyi tidak ikut");
  assert.equal(sum(cari("konfirmasi", "banjir", "tidak_terjadi")), 1, r.t);
  assert.equal(r.j.label.length, r.j.n);
  assert.ok(cari("regu", "karhutla", "padam")[0].kec, "titik dikunci ke kecamatan: " + r.t);
  assert.equal(sum(r.j.label.filter(x => x.sumber === "regu")), 4, "belum-konfirmasi dan dummy tidak ikut");
});

uji("sejak memotong baris lama", async () => {
  const r = await get(`?sejak=${wib(KINI + 864e5)}`, PIPA); assert.equal(r.s, 200);
  assert.equal(r.j.n, 0, r.t);
});

uji("privasi: tidak ada id, nama, nomor, hash IP, teks bebas, koordinat, atau kode regu di keluaran", async () => {
  const r = await get(`?sejak=${wib(KINI - 3 * 864e5)}`, PIPA); assert.equal(r.s, 200); assert.ok(r.j.n > 0);
  const BOLEH = ["tanggal", "prov", "kab", "kec", "jenis", "status", "sumber", "n"];
  for (const x of r.j.label) assert.deepEqual(Object.keys(x), BOLEH, "bentuk baris tetap");
  for (const s of ["regu000000000001", "warga001", "Budi", "08123456789", H, "rahasia-regu", "kode_regu", "ip_hash", "token_hash", '"lat"', '"lon"', "5.5707", "95.3302"]) assert.ok(!r.t.includes(s), `bocor: ${s}`);
});

uji("murni: labelHarian tanpa wilayah jatuh ke kab/prov tugas; kecocokan tak ada = lokasi kosong", () => {
  const out = labelHarian({regu: [{tanggal: "2026-01-02", lat: 0, lon: 100, prov: "13", kab: "X", status: "padam"}], warga: [{tanggal: "2026-01-02", lat: 0, lon: 100, bahaya: "rob"}]}, () => null);
  assert.deepEqual(out.map(x => [x.sumber, x.prov, x.kab, x.kec, x.n]), [["regu", "13", "X", null, 1], ["warga", null, null, null, 1]]);
});

uji("laju: 301 token salah dari satu IP -> 429; token sah dari IP lain tetap lolos", async () => {
  const h = {authorization: "Bearer salah", "cf-connecting-ip": "203.0.113.77"};
  let s; for (let i = 0; i < 305; i++) { s = (await get("", h)).s; if (s === 429) break; }
  assert.equal(s, 429);
  assert.equal((await get("", {...PIPA, "cf-connecting-ip": "203.0.113.78"})).s, 200);
});
