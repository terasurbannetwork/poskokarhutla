/* /prediksi fase 2: konfirmasi lapangan. worker.js utuh di workerd + D1 lokal dengan migrasi apa adanya (TEST.md: tanpa mock). */
import {test} from "node:test";
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";

const uji = berantai();
const U = await siapkan("uji-prediksi", {ikat: {PIPA_TOKEN: "token-pipa-uji"}});
const PIPA = {authorization: "Bearer token-pipa-uji"}, wib = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const KINI = Date.now(), HARI_INI = wib(KINI), LUSA_LALU = wib(KINI - 2 * 864e5);
const sah = (o = {}) => ({kab: "Katingan", tanggal: LUSA_LALU, kode: "BNJ", terjadi: 1, nilai: 35, catatan: "genangan 35 cm", ...o});
const post = (b, h) => U.api("POST", "/api/prediksi/konfirmasi", b, h);
let kode;
uji("siapkan regu", async () => {
  const r = await U.adm("POST", "/api/posko/regu", {nama: "Regu Uji", unsur: "BPBD", prov: "62", kab: "Katingan"}); assert.equal(r.s, 201, r.t); kode = r.j.kode;
});

uji("POST: kode regu sah tersimpan, kirim ulang menimpa (satu baris)", async () => {
  const h = {"x-kode-regu": kode};
  assert.equal((await post(sah(), h)).s, 200);
  assert.equal((await post(sah({terjadi: 0, nilai: null}), h)).s, 200);
  const rows = (await U.DB.prepare("SELECT terjadi, nilai, sumber, kode_regu FROM prediksi_konfirmasi").all()).results;
  assert.equal(rows.length, 1, JSON.stringify(rows));
  assert.deepEqual([rows[0].terjadi, rows[0].nilai, rows[0].sumber], [0, null, "regu"]);
  assert.notEqual(rows[0].kode_regu, kode, "yang disimpan id regu, bukan kodenya");
});
uji("POST: sesi staf (admin) juga boleh", async () => {
  assert.equal((await post(sah({kode: "HJN"}), ADMIN)).s, 200);
  assert.equal(await U.n("prediksi_konfirmasi", "kode_regu = 'admin'"), 1);
});
uji("POST: tanpa regu/sesi atau kode regu salah ditolak", async () => {
  assert.equal((await post(sah())).s, 403);
  assert.equal((await post(sah(), {"x-kode-regu": "0".repeat(26)})).s, 403);
  assert.equal((await post(sah(), {"x-kode-regu": "bukan-kode"})).s, 403);
});
uji("POST: field salah ditolak 400 dan tidak tersimpan", async () => {
  const h = {"x-kode-regu": kode}, n0 = await U.n("prediksi_konfirmasi");
  const salah = [{kode: "XXX"}, {kode: "bnj"}, {tanggal: "2020-01-01"}, {tanggal: wib(KINI + 2 * 864e5)}, {tanggal: wib(KINI - 9 * 864e5)}, {tanggal: "bukan"}, {tanggal: undefined},
    {kab: ""}, {kab: "<script>"}, {kab: undefined}, {terjadi: 2}, {terjadi: "1"}, {terjadi: undefined}, {nilai: "abc"}, {nilai: 1e9}, {catatan: "x".repeat(501)}, {catatan: 5}];
  for (const s of salah) { const r = await post(sah(s), h); assert.equal(r.s, 400, JSON.stringify(s) + " -> " + r.t); }
  assert.equal(await U.n("prediksi_konfirmasi"), n0);
});

uji("GET /api/prediksi/konfirmasi: tanpa token 401; token sah memuat baris regu dan warga positif tanpa identitas", async () => {
  const get = (j, h) => U.api("GET", "/api/prediksi/konfirmasi" + j, undefined, h);
  assert.equal((await get("")).s, 401);
  assert.equal((await get("", {authorization: "Bearer salah"})).s, 401);
  assert.equal((await get("?sejak=bukan", PIPA)).s, 400);
  const H = "a".repeat(64), ms = KINI - 864e5;
  await U.DB.prepare(`INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, dibuat, kedaluwarsa, ip_hash, token_hash) VALUES ('warga001', 'info', 'umum', 'banjir', -2.5, 113.9, ?, ?, ?, ?)`).bind(ms, ms + 36e5, H, H).run();
  await U.DB.prepare("INSERT INTO laporan_wilayah (laporan_id, prov, kab, sumber) VALUES ('warga001', '62', 'Katingan', 'masuk')").run();
  await U.DB.prepare("INSERT INTO prediksi_konfirmasi (kab, tanggal, kode, terjadi, sumber, kode_regu, dibuat) VALUES ('Kapuas', ?, 'API', 0, 'regu', 'r1', 'x')").bind(HARI_INI).run();
  const r = await get(`?sejak=${wib(KINI - 3 * 864e5)}`, PIPA);
  assert.equal(r.s, 200, r.t);
  const k = r.j.konfirmasi;
  assert.ok(k.some(x => x.kab === "Kapuas" && x.kode === "API" && x.terjadi === 0 && x.sumber === "regu"), r.t);
  const w = k.find(x => x.sumber === "warga"); assert.ok(w && w.kode === "BNJ" && w.terjadi === 1 && w.kab === "Katingan" && w.tanggal === wib(ms), r.t);
  assert.ok(k.every(x => x.sumber !== "warga" || x.terjadi === 1), "warga positif saja");
  assert.ok(!r.t.includes("kode_regu") && !r.t.includes(H), "tanpa identitas pelapor");
});

uji("POST: batas laju 120 per jam per IP -> 429", async () => {
  const h = {"x-kode-regu": kode, "cf-connecting-ip": "203.0.113.9"};
  let s; for (let i = 0; i < 125; i++) { s = (await post(sah({kode: "ROB"}), h)).s; if (s === 429) break; }
  assert.equal(s, 429);
});

uji("/prediksi di host terkunci tanpa sesi tidak terbuka; dengan sesi admin lolos gerbang", async () => {
  const r = await U.mf.dispatchFetch("https://centurisk97.id/prediksi", {redirect: "manual"});
  assert.ok(r.status === 302 || r.status === 303, `status ${r.status}`);
  assert.match(r.headers.get("location") || "", /masuk|pantau/);
  const s = await U.mf.dispatchFetch("https://centurisk97.id/prediksi", {redirect: "manual", headers: ADMIN});
  assert.ok(s.status !== 302 && s.status !== 303, `status ${s.status}`);
});
