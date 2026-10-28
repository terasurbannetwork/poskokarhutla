/* Riwayat kedatangan data FIRMS per satelit (migrasi 0075 satelit_granul, src/satelit.js) dan GET /api/satelit/jeda.
   Worker utuh di workerd, D1 lokal sungguhan dengan migrasi apa adanya; FIRMS disuntik lewat stub fetch (seperti jeda_sensor.test.mjs).
   Yang dibuktikan: migrasi idempoten + CHECK (termasuk terlihat >= akuisisi dan satelit_ringkas satu baris); putaran menulis granul (sensor, menit) dengan jumlah deteksi dan TIDAK menimpa terlihat putaran berikutnya;
   sensor galat/kosong tidak menulis; tabel hilang atau galat D1 tidak menggagalkan putaran (satu console.warn); pemangkasan 400 hari sekali sehari;
   ringkasan harian (cron menit 19 -> satelit_ringkas: UPSERT satu baris, gerbang jam 13 UTC, baris belum ada, > 25 jam); endpoint hanya membaca satu baris itu (tak pernah menghitung dari granul):
   bentuk JSON, persentil nearest-rank, siang/malam (WIB), hari_ada, pengecualian sebelum mulai_catat, jendela 30 hari, 503 umum tanpa baris/tabel, metode lain 405, cache tepi.
   Jalankan: node --test tests/warga/satelit_granul.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js SEBELUM modul yang saling mengimpor (RUTE_* dispread saat evaluasi)
import {perbaruiTitik} from "../../src/titik.js";
import {jedaSatelit, hitungJeda, ringkasGranul, granulDari, catatGranul, bersihkanGranul, JENDELA_HARI, SIMPAN_HARI, JAM_PANGKAS_UTC, JAM_RINGKAS_UTC, TELAT_RINGKAS_JAM, JENDELA_URAI_JAM, CELAH_LINTASAN_MENIT} from "../../src/satelit.js";
import {uraiCSV} from "../../src/titik.js";
import {siapkan, berantai} from "./_bnpb.mjs";

const JAM = 3600e3, MENIT = 60e3, HARI = 24 * JAM, uji = berantai();
const KEP_V = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
const KEP_M = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight";
const KINI_A = Date.UTC(2026, 9, 27, 11, 48), KINI_B = KINI_A + 3 * JAM, KINI_C = KINI_B + 3 * JAM;   // 27 Okt 2026, putaran A, B, C tiap 3 jam
const SQL_0075 = readFileSync(path.join(AKAR, "migrations/0075_satelit_granul.sql"), "utf8");

const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const ENV = DB => ({DB, ASSETS: {fetch: aset}, FIRMS_MAP_KEY: "kunci-uji"});
/* baris CSV: [jam UTC "HH:MM", lat, lon, tanggal = "2026-10-27"] */
const csv = (kep, sat, baris) => [kep, ...baris.map(([hm, lat, lon, tg = "2026-10-27"]) => `${lat},${lon},330,0.4,0.4,${tg},${hm.replace(":", "")},${sat},VIIRS,${kep === KEP_M ? 60 : "n"},2.0NRT,290,10,D`)].join("\n");
const iso = (hm, hari = 27) => Date.UTC(2026, 9, hari, ...hm.split(":").map(Number));
const stub = async (peta, fn) => {   // peta: sensor FIRMS -> teks CSV | {status, teks} | Error
  const asli = globalThis.fetch;
  globalThis.fetch = async u => { const v = peta[String(u).split("/")[7]]; if (v instanceof Error) throw v; return typeof v === "string" ? new Response(v) : new Response(v?.teks ?? "", {status: v?.status ?? 500}); };
  try { return await fn(); } finally { globalThis.fetch = asli; }
};
const dengan = async (fn) => {   // tangkap console.warn selama fn
  const asli = console.warn, panggilan = []; console.warn = (...a) => { panggilan.push(a.join(" ")); };
  try { return {hasil: await fn(), warn: panggilan}; } finally { console.warn = asli; }
};
const T = await siapkan("uji-satelit-granul");   // di luar test(): after(dispose) berlaku di akhir berkas
const baris = async (sql = "") => (await T.DB.prepare(`SELECT sensor, akuisisi, terlihat, n, sumber FROM satelit_granul ${sql} ORDER BY sensor, akuisisi`).all()).results;
const jml = async () => (await T.DB.prepare("SELECT count(*) n FROM satelit_granul").first()).n;
const putaranN = async () => (await T.DB.prepare("SELECT count(*) n FROM titik_terbaru").first()).n;
const kosongKan = () => T.DB.prepare("DELETE FROM satelit_granul").run();
const sisip = r => T.DB.batch(r.map(([s, ak, jeda, n = 1]) => T.DB.prepare("INSERT INTO satelit_granul (sensor, akuisisi, terlihat, n) VALUES (?, ?, ?, ?)").bind(s, ak, ak + jeda * MENIT, n)));
const ringkasN = async () => (await T.DB.prepare("SELECT count(*) n FROM satelit_ringkas").first()).n;
const ringkasBaris = () => T.DB.prepare("SELECT isi, dibuat FROM satelit_ringkas WHERE id = 1").first();

/* ---------------------------------------------------------------- skema ---------------------------------------------------------------- */
uji("satelit granul: migrasi 0075 idempoten (dua kali lagi tanpa galat), CHECK sensor/n/sumber/terlihat>=akuisisi, tabel satelit_ringkas satu baris, kunci (sensor, akuisisi), indeks akuisisi", async () => {
  for (let i = 0; i < 2; i++) await T.DB.batch(pecah(SQL_0075).map(s => T.DB.prepare(s)));   // siapkan() sudah menerapkannya sekali
  const sk = (await T.DB.prepare("SELECT name, sql FROM sqlite_master WHERE name LIKE 'satelit_%' ORDER BY name").all()).results;
  assert.deepEqual(sk.map(x => x.name), ["satelit_granul", "satelit_granul_akuisisi", "satelit_ringkas"]);
  assert.match(sk[0].sql, /WITHOUT ROWID/); assert.match(sk[0].sql, /PRIMARY KEY \(sensor, akuisisi\)/);
  const sisipSatu = (s, n = 1, sumber = "worker", akuisisi = 1000, terlihat = 2000) => T.DB.prepare("INSERT INTO satelit_granul (sensor, akuisisi, terlihat, n, sumber) VALUES (?, ?, ?, ?, ?)").bind(s, akuisisi, terlihat, n, sumber).run();
  await assert.rejects(sisipSatu("X"), /CHECK/, "sensor di luar M, N, N20, N21 ditolak");
  await assert.rejects(sisipSatu("N20", -1), /CHECK/, "n negatif ditolak");
  await assert.rejects(sisipSatu("N20", 1, "lain"), /CHECK/, "sumber hanya worker atau pipeline");
  await assert.rejects(sisipSatu("N20", 1, "worker", 2000, 1999), /CHECK/, "terlihat sebelum akuisisi ditolak");
  await sisipSatu("N20", 0, "pipeline");   // n = 0 dan sumber pipeline sah
  await sisipSatu("N21", 1, "worker", 3000, 3000);   // terlihat = akuisisi sah (batas)
  await assert.rejects(sisipSatu("N20"), /UNIQUE|PRIMARY/, "satu baris per (sensor, akuisisi)");
  assert.equal((await baris())[0].sumber, "pipeline");
  await kosongKan();
  /* satelit_ringkas: tepat satu baris (id = 1), isi dan dibuat wajib */
  const ring = (id, isi, dibuat) => T.DB.prepare("INSERT INTO satelit_ringkas (id, isi, dibuat) VALUES (?, ?, ?)").bind(id, isi, dibuat).run();
  await assert.rejects(ring(2, "{}", 1), /CHECK/, "hanya id = 1"); await assert.rejects(ring(1, null, 1), /NOT NULL/); await assert.rejects(ring(1, "{}", null), /NOT NULL/);
  await ring(1, "{}", 1); await assert.rejects(ring(1, "{}", 2), /UNIQUE|PRIMARY/, "satu baris saja");
  await T.DB.prepare("DELETE FROM satelit_ringkas").run();
});

/* ---------------------------------------------------------------- penulis: perbaruiTitik ---------------------------------------------------------------- */
uji("satelit granul: granulDari mengelompokkan per (sensor, menit akuisisi) dengan jumlah deteksi; sensor galat atau kosong tanpa baris (murni)", () => {
  const t = (s, t) => ({s, t});
  assert.deepEqual(granulDari([
    {titik: [t("N", 3000), t("N", 1000), t("N", 3000), t("N", 3000)]}, {titik: []}, {galat: "M: HTTP 500", titik: [], rusak: 0}, {titik: [t("M", 500)]}]),
  [["N", 1000, 1], ["N", 3000, 3], ["M", 500, 1]], "terurut waktu per sensor; titik kosong dilewati");
  assert.deepEqual(granulDari([]), []);
});

uji("satelit granul: putaran menulis satu baris per (sensor, menit akuisisi) dengan jumlah deteksi; terlihat = waktu putaran, termasuk titik di laut", async () => {
  const CSV_A = {
    VIIRS_SNPP_NRT: csv(KEP_V, "N", [["03:32", -2.1, 113.5], ["03:32", -2.11, 113.5], ["03:32", -2.12, 113.5], ["06:55", -2.2, 113.6]]),
    MODIS_NRT: csv(KEP_M, "Terra", [["09:40", -2.3, 113.7], ["09:40", -2.31, 113.7]]),
    VIIRS_NOAA20_NRT: csv(KEP_V, "N20", [["08:20", -2.4, 113.8], ["08:50", -5.5, 108.0]]),   // 08:50 di Laut Jawa: tetap bukti kedatangan granul
    VIIRS_NOAA21_NRT: csv(KEP_V, "N21", [["09:10", -2.5, 113.9]]),
  };
  const h = await stub(CSV_A, () => perbaruiTitik(ENV(T.DB), KINI_A));
  assert.deepEqual(h.granul, {lihat: 6, baru: 6});
  assert.deepEqual(await baris(), [
    {sensor: "M", akuisisi: iso("09:40"), terlihat: KINI_A, n: 2, sumber: "worker"},
    {sensor: "N", akuisisi: iso("03:32"), terlihat: KINI_A, n: 3, sumber: "worker"},
    {sensor: "N", akuisisi: iso("06:55"), terlihat: KINI_A, n: 1, sumber: "worker"},
    {sensor: "N20", akuisisi: iso("08:20"), terlihat: KINI_A, n: 1, sumber: "worker"},
    {sensor: "N20", akuisisi: iso("08:50"), terlihat: KINI_A, n: 1, sumber: "worker"},
    {sensor: "N21", akuisisi: iso("09:10"), terlihat: KINI_A, n: 1, sumber: "worker"}]);
});

uji("satelit granul: putaran berikutnya TIDAK menimpa terlihat atau n granul lama; granul baru dicatat dengan terlihat putaran itu", async () => {
  const CSV_B = {
    VIIRS_SNPP_NRT: csv(KEP_V, "N", [...Array.from({length: 5}, (_, i) => ["03:32", -2.1 - i / 100, 113.5]), ["06:55", -2.2, 113.6], ["10:30", -2.25, 113.65], ["10:30", -2.26, 113.65]]),   // 03:32 kini 5 deteksi (tadi 3)
    MODIS_NRT: csv(KEP_M, "Aqua", [["09:40", -2.3, 113.7], ["09:40", -2.31, 113.7], ["11:00", -2.32, 113.7]]),
    VIIRS_NOAA20_NRT: {status: 500, teks: ""},   // N20 galat putaran ini
    VIIRS_NOAA21_NRT: csv(KEP_V, "N21", [["09:10", -2.5, 113.9]]),
  };
  const h = await stub(CSV_B, () => perbaruiTitik(ENV(T.DB), KINI_B));
  assert.deepEqual(h.granul, {lihat: 6, baru: 2}, "N: 3 granul, M: 2, N21: 1 dilihat; hanya N 10:30 dan M 11:00 yang baru");
  const b = await baris(), per = (s, hm) => b.find(x => x.sensor === s && x.akuisisi === iso(hm));
  assert.equal(per("N", "03:32").terlihat, KINI_A, "terlihat pengambilan pertama tidak tertimpa"); assert.equal(per("N", "03:32").n, 3, "n pengambilan pertama tidak tertimpa (5 deteksi kini)");
  assert.equal(per("N", "10:30").terlihat, KINI_B); assert.equal(per("N", "10:30").n, 2);
  assert.equal(per("M", "11:00").terlihat, KINI_B); assert.equal(per("M", "09:40").terlihat, KINI_A);
  assert.equal(per("N20", "08:20").terlihat, KINI_A, "sensor galat putaran ini: baris lamanya utuh");
  assert.equal(b.length, 8);
});

uji("satelit granul: granul yang akuisisinya di depan jam Worker (jam satelit maju <= 1 jam) melanggar CHECK, tidak tersimpan, dan tercatat di putaran berikutnya", async () => {
  await kosongKan();
  const depan = {VIIRS_SNPP_NRT: KEP_V, MODIS_NRT: KEP_M, VIIRS_NOAA21_NRT: KEP_V, VIIRS_NOAA20_NRT: csv(KEP_V, "N20", [["12:30", -2.4, 113.8], ["11:00", -2.41, 113.8]])};   // putaran A 11:48: 12:30 di depan, 11:00 sudah lewat
  const a = await stub(depan, () => perbaruiTitik(ENV(T.DB), KINI_A));
  assert.deepEqual(a.granul, {lihat: 2, baru: 1}, "yang di depan dilewati (OR IGNORE membuang baris pelanggar CHECK), yang lain tetap masuk");
  assert.deepEqual((await baris()).map(x => [x.akuisisi, x.terlihat]), [[iso("11:00"), KINI_A]]);
  const b = await stub(depan, () => perbaruiTitik(ENV(T.DB), KINI_B));   // 14:48: 12:30 sudah lewat
  assert.deepEqual(b.granul, {lihat: 2, baru: 1});
  assert.deepEqual((await baris()).map(x => [x.akuisisi, x.terlihat, x.terlihat - x.akuisisi]), [[iso("11:00"), KINI_A, 48 * MENIT], [iso("12:30"), KINI_B, 138 * MENIT]], "tercatat dengan terlihat putaran berikutnya; jeda tak pernah negatif");
  await kosongKan();
});

uji("satelit granul: sensor galat (HTTP 500, MAP_KEY salah, jaringan putus) atau kosong tidak menulis baris; semua galat tidak menulis apa pun", async () => {
  await kosongKan();
  const C = {VIIRS_SNPP_NRT: {status: 500, teks: ""}, VIIRS_NOAA20_NRT: {status: 200, teks: "Invalid MAP_KEY."}, VIIRS_NOAA21_NRT: new Error("jaringan putus"),
    MODIS_NRT: csv(KEP_M, "Terra", [["09:40", -2.3, 113.7]])};
  const h = await stub(C, () => perbaruiTitik(ENV(T.DB), KINI_C));
  assert.equal(h.galat.length, 3, "tiga sensor gagal ditarik");
  assert.deepEqual(h.granul, {lihat: 1, baru: 1});
  assert.deepEqual((await baris()).map(x => x.sensor), ["M"], "hanya sensor yang berhasil menyumbang baris");
  /* semua sensor kosong (hanya kepala CSV): putaran sah, tidak ada baris baru, tidak ada SQL yang dikirim */
  const k = await stub({VIIRS_SNPP_NRT: KEP_V, VIIRS_NOAA20_NRT: KEP_V, VIIRS_NOAA21_NRT: KEP_V, MODIS_NRT: KEP_M}, () => perbaruiTitik(ENV(T.DB), KINI_C + JAM));
  assert.deepEqual(k.granul, {lihat: 0, baru: 0}); assert.equal(await jml(), 1);
  /* semua sensor galat: putaran lama dipakai, tidak ada tulis sama sekali */
  const sebelum = await putaranN();
  const g = await stub({VIIRS_SNPP_NRT: {status: 500}, VIIRS_NOAA20_NRT: {status: 500}, VIIRS_NOAA21_NRT: {status: 500}, MODIS_NRT: {status: 500}}, () => perbaruiTitik(ENV(T.DB), KINI_C + 2 * JAM));
  assert.ok(g.galat && !("granul" in g), "semua galat: kembali dini"); assert.equal(await jml(), 1); assert.equal(await putaranN(), sebelum);
});

uji("satelit granul: tabel hilang (0075 belum diterapkan) tidak menggagalkan putaran; satu console.warn; titik_terbaru tetap tertulis", async () => {
  await T.DB.prepare("DROP TABLE satelit_granul").run();
  const sebelum = await putaranN();
  const {hasil: h, warn} = await dengan(() => stub({VIIRS_SNPP_NRT: csv(KEP_V, "N", [["06:55", -2.2, 113.6]]), VIIRS_NOAA20_NRT: KEP_V, VIIRS_NOAA21_NRT: KEP_V, MODIS_NRT: KEP_M}, () => perbaruiTitik(ENV(T.DB), KINI_C)));
  assert.equal(h.titik, 1, "putaran tetap sah"); assert.deepEqual(h.granul, {galat: "migrasi 0075 belum dijalankan"});
  assert.equal(await putaranN(), sebelum + 1, "titik_terbaru ditulis");
  assert.equal(warn.length, 1, `tepat satu console.warn: ${JSON.stringify(warn)}`); assert.match(warn[0], /granul/);
  const o = await dengan(() => bersihkanGranul(ENV(T.DB), Date.UTC(2026, 10, 20, JAM_PANGKAS_UTC, 17)).then(() => "tidak melempar", e => e.message));
  assert.match(o.hasil, /no such table/, "bersihkanGranul melempar tanpa tabel; bersihSemua menelannya");
  /* endpoint membaca satelit_ringkas saja: tanpa BARIS (granul hilang tak menyentuhnya) dan tanpa TABEL sama-sama 503 JSON umum, bukan 500, tanpa nama migrasi, tidak boleh di-cache */
  const cek503 = async (ket) => { const r = await T.api("GET", "/api/satelit/jeda");
    assert.equal(r.s, 503, `${ket}: ${r.t}`); assert.deepEqual(r.j, {galat: "data belum tersedia"}, ket); assert.doesNotMatch(r.t, /0075|migrasi|satelit_|no such/i, `${ket}: tanpa detail internal`);
    assert.match(r.h.get("content-type"), /application\/json/); assert.equal(r.h.get("cache-control"), "no-store", ket); };
  await cek503("tanpa baris ringkasan");
  await T.DB.prepare("DROP TABLE satelit_ringkas").run(); await cek503("tanpa tabel ringkasan");
  /* cron ringkasan: tabel ringkasan hilang = dilewati tanpa galat (migrasi belum diterapkan); tabel granul hilang juga */
  assert.deepEqual(await ringkasGranul(ENV(T.DB), Date.UTC(2026, 10, 20, JAM_RINGKAS_UTC, 19)), {lewat: "migrasi 0075 belum dijalankan"});
  assert.deepEqual(await ringkasGranul(ENV(T.DB), Date.UTC(2026, 10, 20, 8, 19)), {lewat: "migrasi 0075 belum dijalankan"}, "jam lain: pemeriksaan baris juga ditelan");
  /* pulihkan: migrasi diterapkan lagi (idempoten), tabel kosong, endpoint tetap 503 sampai cron menghitung */
  await T.DB.batch(pecah(SQL_0075).map(s => T.DB.prepare(s)));
  await cek503("pulih tetapi belum dihitung");
});

uji("satelit granul: galat D1 lain pada penulisan juga ditelan dengan satu console.warn (putaran tetap sah)", async () => {
  const rusak = {prepare: q => /satelit_granul/.test(q) ? {bind: () => ({galat: "D1_ERROR: database is locked"})} : T.DB.prepare(q),
    batch: async st => { const g = st.find(x => x.galat); if (g) throw new Error(g.galat); return T.DB.batch(st); }};
  const sebelum = await putaranN();
  const {hasil: h, warn} = await dengan(() => stub({VIIRS_SNPP_NRT: csv(KEP_V, "N", [["06:55", -2.2, 113.6]]), VIIRS_NOAA20_NRT: KEP_V, VIIRS_NOAA21_NRT: KEP_V, MODIS_NRT: KEP_M}, () => perbaruiTitik(ENV(rusak), KINI_C + JAM)));
  assert.equal(h.titik, 1); assert.match(h.granul.galat, /locked/); assert.equal(await putaranN(), sebelum + 1); assert.equal(warn.length, 1);
});

uji("satelit granul: sampai 800 baris per pernyataan: 2000 granul masuk utuh dalam satu batch (tanpa memotong, OR IGNORE melewati ulangan)", async () => {
  await kosongKan();
  const titik = Array.from({length: 2000}, (_, i) => ({s: "N20", t: Date.UTC(2026, 9, 26) + i * MENIT}));
  assert.deepEqual(await catatGranul(ENV(T.DB), [{titik}], KINI_C), {lihat: 2000, baru: 2000});
  assert.deepEqual(await catatGranul(ENV(T.DB), [{titik}], KINI_C + JAM), {lihat: 2000, baru: 0}, "ulangan tidak mengubah apa pun");
  assert.equal(await jml(), 2000); assert.equal((await T.DB.prepare("SELECT count(*) n FROM satelit_granul WHERE terlihat = ?").bind(KINI_C).first()).n, 2000);
  await kosongKan();
});

/* ---------------------------------------------------------------- pemangkasan ---------------------------------------------------------------- */
uji("satelit granul: pemangkasan 400 hari hanya jam 04 UTC (sekali sehari lewat cron menit 17); granul yang lebih muda utuh", async () => {
  assert.equal(SIMPAN_HARI, 400);
  const kini = Date.UTC(2026, 10, 20, JAM_PANGKAS_UTC, 17), tua = kini - 401 * HARI, batas = kini - 399 * HARI;
  const semai = async () => { await kosongKan(); await sisip([["M", tua, 100], ["N20", tua + 5 * MENIT, 100], ["N20", batas, 100], ["N21", kini - HARI, 100]]); };
  await semai();
  assert.deepEqual(await bersihkanGranul(ENV(T.DB), kini - JAM), {lewat: "bukan jamnya"}); assert.equal(await jml(), 4, "jam 03 UTC: tidak menghapus");
  assert.deepEqual(await bersihkanGranul(ENV(T.DB), kini + JAM), {lewat: "bukan jamnya"}); assert.equal(await jml(), 4, "jam 05 UTC: tidak menghapus");
  assert.deepEqual(await bersihkanGranul(ENV(T.DB), kini), {dihapus: 2}); assert.deepEqual((await baris()).map(x => x.akuisisi), [batas, kini - HARI]);
  /* lewat cron sungguhan: scheduled "* * * * *" menit 17 menjalankan bersihSemua */
  const w = await T.mf.getWorker();
  await semai(); assert.equal((await w.scheduled({cron: "* * * * *", scheduledTime: kini + JAM})).outcome, "ok"); assert.equal(await jml(), 4, "cron jam 05:17: tidak menghapus");
  assert.equal((await w.scheduled({cron: "* * * * *", scheduledTime: kini})).outcome, "ok"); assert.equal(await jml(), 2, "cron jam 04:17: yang > 400 hari dibuang");
  assert.equal((await w.scheduled({cron: "* * * * *", scheduledTime: kini - 2 * MENIT})).outcome, "ok"); assert.equal(await jml(), 2, "bukan menit 17: bersih-bersih tidak jalan");
  await kosongKan();
});

/* ---------------------------------------------------------------- pembaca: GET /api/satelit/jeda ---------------------------------------------------------------- */
const KINI = Date.UTC(2026, 10, 20, 14, 0), T0 = Date.UTC(2026, 10, 10, 14, 0);   // contoh kontrak: dibuat 2026-11-20T14:00Z; tabel mulai dicatat 10 Nov 14:00 UTC
const U = (hari, hm) => Date.UTC(2026, 10, hari, ...hm.split(":").map(Number));
const jeda = (kini = KINI) => hitungJeda({DB: T.DB}, kini);   // hitungan murni dari granul (dipakai cron); endpoint publik membaca satelit_ringkas

uji("satelit jeda: tabel kosong -> 200, keempat kode ada dengan nol dan null, mulai_catat null", async () => {
  const j = await jeda(), kosong = {n: 0, lintasan: 0, median_menit: null, p90_menit: null};
  assert.deepEqual(Object.keys(j), ["dibuat", "hari", "dari", "sampai", "mulai_catat", "batas_jeda_menit", "sensor"]);
  assert.deepEqual([j.dibuat, j.hari, j.dari, j.sampai, j.mulai_catat, j.batas_jeda_menit], ["2026-11-20T14:00:00.000Z", 30, "2026-10-21T14:00:00.000Z", "2026-11-20T14:00:00.000Z", null, 1440]);
  assert.deepEqual(Object.keys(j.sensor), ["N20", "N21", "M", "N"]);
  for (const s of Object.values(j.sensor)) assert.deepEqual(s, {n: 0, lintasan: 0, hari_ada: 0, median_menit: null, p90_menit: null, siang: kosong, malam: kosong});
  assert.equal(JENDELA_HARI, 30);
});

uji("satelit jeda: median dan p90 nearest-rank, siang/malam WIB (batas 06.00 dan 18.00), hari_ada tanggal WIB, granul sebelum mulai_catat dikecualikan", async () => {
  await kosongKan();
  /* putaran pertama (T0) melihat 24 jam data lama sekaligus: jeda palsu 5 dan 20 jam, akuisisi < mulai_catat -> TIDAK dihitung */
  await sisip([["N20", T0 - 20 * JAM, 20 * 60], ["N20", T0 - 5 * JAM, 5 * 60], ["M", T0 - 6 * JAM, 6 * 60]]);
  await T.DB.prepare("UPDATE satelit_granul SET terlihat = ?").bind(T0).run();
  /* N20: 10 granul, jeda menit 100..180 + 400. Jam akuisisi UTC -> WIB (+7): siang = WIB 06.00..17.59 */
  await sisip([
    ["N20", U(11, "03:00"), 100],   // WIB 10:00 siang, tgl WIB 11
    ["N20", U(11, "10:59"), 110],   // WIB 17:59 siang
    ["N20", U(11, "11:00"), 120],   // WIB 18:00 malam
    ["N20", U(11, "22:59"), 130],   // WIB 05:59 (12 Nov) malam
    ["N20", U(11, "23:00"), 140],   // WIB 06:00 (12 Nov) siang
    ["N20", U(12, "16:59"), 150],   // WIB 23:59 (12 Nov) malam
    ["N20", U(12, "17:00"), 160],   // WIB 00:00 (13 Nov) malam: UTC satu tanggal dengan di atas, WIB beda
    ["N20", U(15, "05:00"), 170],   // WIB 12:00 siang
    ["N20", U(15, "18:00"), 180],   // WIB 01:00 (16 Nov) malam
    ["N20", U(19, "02:00"), 400]]); // WIB 09:00 siang
  await sisip([["M", U(14, "03:00"), 90]]);   // satu granul: median = p90 = 90
  /* N: hanya satu granul di masa depan (akuisisi > sekarang): tak dihitung. N21: tanpa baris */
  await sisip([["N", KINI + 10 * MENIT, 100]]);
  const j = await jeda(), n20 = j.sensor.N20;
  assert.equal(j.mulai_catat, new Date(T0).toISOString(), "mulai_catat = putaran pertama (terlihat granul akuisisi tertua)");
  /* lintasan (celah > 45 menit): 11 Nov 10:59+11:00 satu, 11 Nov 22:59+23:00 satu, 12 Nov 16:59+17:00 satu, sisanya sendiri-sendiri = 7; siang 5; malam 4 (dua pasangan yang melintasi
     batas 06.00/18.00 WIB terbelah: siang + malam = 9 > 7 itu wajar) */
  assert.deepEqual(n20, {n: 10, lintasan: 7, hari_ada: 6, median_menit: 140, p90_menit: 180,   // diurut 100 110 120 130 140 150 160 170 180 400: rank 5 dan 9 (bukan interpolasi 145/202)
    siang: {n: 5, lintasan: 5, median_menit: 140, p90_menit: 400},     // 100 110 140 170 400: rank 3 dan 5
    malam: {n: 5, lintasan: 4, median_menit: 150, p90_menit: 180}});   // 120 130 150 160 180
  assert.deepEqual(j.sensor.M, {n: 1, lintasan: 1, hari_ada: 1, median_menit: 90, p90_menit: 90, siang: {n: 1, lintasan: 1, median_menit: 90, p90_menit: 90}, malam: {n: 0, lintasan: 0, median_menit: null, p90_menit: null}});
  const kosong = {n: 0, lintasan: 0, median_menit: null, p90_menit: null};
  for (const k of ["N21", "N"]) assert.deepEqual(j.sensor[k], {n: 0, lintasan: 0, hari_ada: 0, median_menit: null, p90_menit: null, siang: kosong, malam: kosong}, `${k}: tanpa baris atau hanya masa depan = kosong`);
});

uji("satelit jeda: lintasan = gugus granul berurutan dengan celah > 45 menit (6 menit = satu, 46 menit = dua, tepat 45 = satu); dihitung per sensor dan per siang/malam", async () => {
  assert.equal(CELAH_LINTASAN_MENIT, 45);
  await kosongKan();
  await sisip([["M", U(5, "00:00"), 0]]);   // pembuka: akuisisi tertua = mulai_catat (jeda 0 supaya dirinya tidak terbuang); dihitung sebagai satu granul M
  /* N21: tiga granul berselang 6 menit (satu lintasan) */
  await sisip([["N21", U(12, "03:00"), 100], ["N21", U(12, "03:06"), 100], ["N21", U(12, "03:12"), 100]]);
  let j = await jeda();
  assert.deepEqual([j.sensor.N21.n, j.sensor.N21.lintasan, j.sensor.N21.siang.lintasan, j.sensor.N21.malam.lintasan], [3, 1, 1, 0], "granul berselang 6 menit = satu lintasan");
  /* tepat 45 menit dari granul terakhir: masih satu gugus; 46 menit sesudahnya: gugus kedua */
  await sisip([["N21", U(12, "03:57"), 100]]);
  j = await jeda(); assert.deepEqual([j.sensor.N21.n, j.sensor.N21.lintasan], [4, 1], "celah tepat 45 menit bukan > 45");
  await sisip([["N21", U(12, "04:43"), 100]]);
  j = await jeda(); assert.deepEqual([j.sensor.N21.n, j.sensor.N21.lintasan, j.sensor.N21.siang.lintasan], [5, 2, 2], "celah 46 menit = lintasan baru: dua gugus = 2");
  /* sensor lain tidak ikut menyambung gugus: N20 di antara granul N21 tetap satu lintasan sendiri; M hanya pembuka */
  await sisip([["N20", U(12, "03:30"), 100]]);
  j = await jeda(); assert.equal(j.sensor.N20.lintasan, 1); assert.equal(j.sensor.N21.lintasan, 2); assert.deepEqual([j.sensor.M.n, j.sensor.M.lintasan], [1, 1]);
  /* satu lintasan yang melintasi 18.00 WIB (UTC 11:00): terhitung satu di siang dan satu di malam; di total tetap satu */
  await sisip([["N20", U(13, "10:57"), 100], ["N20", U(13, "11:03"), 100]]);
  j = await jeda(); const n20 = j.sensor.N20;
  assert.deepEqual([n20.n, n20.lintasan, n20.siang.n, n20.siang.lintasan, n20.malam.n, n20.malam.lintasan], [3, 2, 2, 2, 1, 1]);   // 03:30 (siang, 12 Nov) + pasangan 13 Nov
  await kosongKan();
});

uji("satelit jeda: batas_jeda_menit = jendela urai CSV Worker (24 jam = 1440): granul berumur tepat 24 jam tercatat dengan jeda 1440 menit, 24 jam + 1 menit tidak tercatat", async () => {
  await kosongKan();
  assert.equal(JENDELA_URAI_JAM, 24); assert.equal((await jeda()).batas_jeda_menit, JENDELA_URAI_JAM * 60);
  /* uraiCSV memakai jendela yang sama sebagai bawaan; putaran A di 27 Okt 11:48 UTC: 26 Okt 11:48 (tepat 24 jam) tercatat, 26 Okt 11:47 (24 jam + 1 menit) dibuang */
  const sepi = {VIIRS_SNPP_NRT: KEP_V, MODIS_NRT: KEP_M, VIIRS_NOAA21_NRT: KEP_V};
  assert.equal(uraiCSV(csv(KEP_V, "N20", [["11:47", -2.4, 113.8, "2026-10-26"]]), "VIIRS_NOAA20_NRT", KINI_A).titik.length, 0, "bawaan uraiCSV = JENDELA_URAI_JAM");
  const h = await stub({...sepi, VIIRS_NOAA20_NRT: csv(KEP_V, "N20", [["11:47", -2.4, 113.8, "2026-10-26"], ["11:48", -2.41, 113.8, "2026-10-26"]])}, () => perbaruiTitik(ENV(T.DB), KINI_A));
  assert.deepEqual(h.granul, {lihat: 1, baru: 1});
  const b = await baris(); assert.equal(b.length, 1);
  assert.equal(b[0].terlihat - b[0].akuisisi, (await jeda()).batas_jeda_menit * MENIT, "jeda terpanjang yang bisa tercatat = batas_jeda_menit");
  await kosongKan();
});

uji("satelit jeda: jendela tepat 30 hari (dari termasuk, 1 ms lebih awal tidak); mulai_catat global walau lebih tua dari jendela; jeda dibulatkan menit", async () => {
  await kosongKan();
  const dari = KINI - 30 * HARI, awal = dari - 5 * HARI;
  await sisip([["N21", awal, 180]]);   // granul tertua tabel -> mulai_catat = awal + 3 jam, di luar jendela
  await T.DB.prepare("INSERT INTO satelit_granul (sensor, akuisisi, terlihat, n) VALUES (?, ?, ?, 1), (?, ?, ?, 1), (?, ?, ?, 1), (?, ?, ?, 1)")
    .bind("N21", dari, dari + 200 * MENIT, "N21", dari - 1, dari - 1 + 100 * MENIT,   // tepat di batas: dihitung; 1 ms lebih awal: tidak
      "M", KINI - HARI, KINI - HARI + 90 * MENIT + 31e3,                              // 90 menit 31 detik -> 91 (dibulatkan)
      "M", KINI - 2 * HARI, KINI - 2 * HARI).run();                                     // jeda 0 (terlihat = akuisisi, batas CHECK): sah, nol menit
  const j = await jeda();
  assert.equal(j.mulai_catat, new Date(awal + 180 * MENIT).toISOString());
  assert.equal(j.sensor.N21.n, 1); assert.equal(j.sensor.N21.median_menit, 200);
  assert.equal(j.sensor.M.n, 2); assert.equal(j.sensor.M.median_menit, 0, "dua nilai {0, 91}: nearest-rank median = yang pertama; tak ada jepit karena CHECK menjamin tak negatif"); assert.equal(j.sensor.M.p90_menit, 91);
  assert.equal(await jml(), 5);
  /* granul sebelum mulai_catat tetap dikecualikan walau di dalam jendela */
  await kosongKan();
  await sisip([["N20", dari + HARI, 400], ["N20", dari + 2 * HARI, 60]]);   // tertua: akuisisi dari+1 hari, terlihat dari+1 hari+400 menit = mulai_catat
  const k = await jeda(); assert.equal(k.mulai_catat, new Date(dari + HARI + 400 * MENIT).toISOString());
  assert.equal(k.sensor.N20.n, 1, "granul tertua akuisisinya < mulai_catat (dirinya sendiri): dikecualikan"); assert.equal(k.sensor.N20.median_menit, 60);
});

const ringkasTes = async () => {   // data contoh: pembuka (jeda 0) lalu beberapa granul N20/N21 di sekitar KINI
  await kosongKan(); await T.DB.prepare("DELETE FROM satelit_ringkas").run();
  await sisip([["M", KINI - 5 * HARI, 0], ["N20", KINI - 4 * HARI, 150], ["N20", KINI - 4 * HARI + 6 * MENIT, 154], ["N20", KINI - 2 * HARI, 210], ["N21", KINI - 3 * HARI, 120]]);
};

uji("satelit ringkas: ringkasGranul menghitung ringkasan berbentuk persis hitungJeda dan menyimpannya sebagai SATU baris (UPSERT); jam 13 UTC, baris belum ada, ringkasan > 25 jam, paksa", async () => {
  assert.equal(JAM_RINGKAS_UTC, 13); assert.equal(TELAT_RINGKAS_JAM, 25);
  await ringkasTes();
  const t13 = Date.UTC(2026, 10, 20, JAM_RINGKAS_UTC, 19);
  const h = await ringkasGranul(ENV(T.DB), t13);
  assert.equal(h.dibuat, "2026-11-20T13:19:00.000Z"); assert.equal(h.granul, 5, "N20 x3 + N21 x1 + pembuka M x1 (akuisisi = mulai_catat, tidak dikecualikan)"); assert.ok(h.byte > 500 && h.byte < 4000);
  assert.equal(await ringkasN(), 1); let b = await ringkasBaris(); assert.equal(b.dibuat, t13);
  assert.deepEqual(JSON.parse(b.isi), await hitungJeda(ENV(T.DB), t13), "persis bentuk respons: dibuat, hari, dari, sampai, mulai_catat, batas_jeda_menit, sensor");
  const o = JSON.parse(b.isi); assert.deepEqual(Object.keys(o), ["dibuat", "hari", "dari", "sampai", "mulai_catat", "batas_jeda_menit", "sensor"]); assert.equal(o.sensor.N20.n, 3); assert.equal(o.sensor.N20.lintasan, 2);
  /* jam lain + ringkasan segar: hanya SATU SELECT satu baris, tidak menghitung ulang (granul baru belum terlihat di ringkasan) */
  await sisip([["N21", KINI - HARI, 100]]);
  assert.deepEqual(await ringkasGranul(ENV(T.DB), t13 + 3 * JAM), {lewat: "bukan jamnya"}); assert.equal((await ringkasBaris()).dibuat, t13, "tidak berubah");
  assert.deepEqual(await ringkasGranul(ENV(T.DB), t13 + TELAT_RINGKAS_JAM * JAM - MENIT), {lewat: "bukan jamnya"}, "24 jam 59 menit: masih segar");
  /* ringkasan lebih tua dari 25 jam (13:19 hari itu gagal): dihitung ulang di menit 19 jam berikutnya */
  const telat = t13 + TELAT_RINGKAS_JAM * JAM + MENIT, h2 = await ringkasGranul(ENV(T.DB), telat);
  assert.ok(!h2.lewat, JSON.stringify(h2)); b = await ringkasBaris(); assert.equal(b.dibuat, telat); assert.equal(JSON.parse(b.isi).sensor.N21.n, 2, "granul baru ikut"); assert.equal(await ringkasN(), 1, "UPSERT: tetap satu baris");
  /* jam 13 hari berikutnya: dihitung ulang walau segar-ish; paksa di jam lain juga */
  const t13b = t13 + HARI; assert.ok(!(await ringkasGranul(ENV(T.DB), t13b)).lewat); assert.equal((await ringkasBaris()).dibuat, t13b);
  assert.ok(!(await ringkasGranul(ENV(T.DB), t13b + 2 * JAM, {paksa: true})).lewat); assert.equal((await ringkasBaris()).dibuat, t13b + 2 * JAM); assert.equal(await ringkasN(), 1);
  /* baris belum ada (deploy pertama) di jam mana pun: dihitung */
  await T.DB.prepare("DELETE FROM satelit_ringkas").run();
  assert.ok(!(await ringkasGranul(ENV(T.DB), Date.UTC(2026, 10, 20, 8, 19))).lewat); assert.equal(await ringkasN(), 1);
  /* tabel granul kosong: ringkasan sah berisi nol (bukan galat), supaya endpoint 200 dan tle.py memakai nilai bawaan */
  await kosongKan(); await ringkasGranul(ENV(T.DB), t13, {paksa: true});
  const kosong = JSON.parse((await ringkasBaris()).isi); assert.equal(kosong.mulai_catat, null); assert.deepEqual(Object.values(kosong.sensor).map(x => x.n), [0, 0, 0, 0]);
  /* galat D1 selain tabel hilang tidak ditelan (cron mencatatnya) */
  const rusak = {prepare: q => T.DB.prepare(q), batch: async () => { throw new Error("D1_ERROR: database is locked"); }};
  await assert.rejects(ringkasGranul({DB: rusak}, t13, {paksa: true}), /locked/);
  await T.DB.prepare("DELETE FROM satelit_ringkas").run();
});

uji("satelit ringkas: cron menit 19 lewat scheduled: jam 13 UTC menghitung, jam lain dengan ringkasan segar tidak, tanpa ringkasan di jam mana pun menghitung, menit lain tidak", async () => {
  const w = await T.mf.getWorker(), cron = ms => w.scheduled({cron: "* * * * *", scheduledTime: ms});
  const t13 = Date.UTC(2026, 10, 20, 13, 19), mnt = (jam, m) => Date.UTC(2026, 10, 20, jam, m);
  await kosongKan(); await T.DB.prepare("DELETE FROM satelit_ringkas").run();
  await sisip([["M", t13 - 5 * HARI, 0], ["N20", t13 - 4 * HARI, 150]]);
  assert.equal((await cron(mnt(13, 18))).outcome, "ok"); assert.equal(await ringkasN(), 0, "menit 18: bukan jadwal ringkasan");
  assert.equal((await cron(mnt(13, 19))).outcome, "ok"); assert.equal(await ringkasN(), 1); assert.equal((await ringkasBaris()).dibuat, t13);
  assert.equal(JSON.parse((await ringkasBaris()).isi).sensor.N20.n, 1);
  await sisip([["N20", t13 - 3 * HARI, 160]]);
  assert.equal((await cron(mnt(14, 19))).outcome, "ok"); assert.equal((await ringkasBaris()).dibuat, t13, "jam 14 UTC, ringkasan segar: tidak dihitung ulang");
  assert.equal(JSON.parse((await ringkasBaris()).isi).sensor.N20.n, 1);
  await T.DB.prepare("DELETE FROM satelit_ringkas").run();
  assert.equal((await cron(mnt(9, 19))).outcome, "ok"); assert.equal((await ringkasBaris())?.dibuat, mnt(9, 19), "tanpa ringkasan: dihitung di jam mana pun");
  assert.equal(JSON.parse((await ringkasBaris()).isi).sensor.N20.n, 2);
  /* endpoint publik tidak pernah menghitung: tanpa baris tetap 503 walau granul ada */
  await T.DB.prepare("DELETE FROM satelit_ringkas").run();
  assert.equal((await T.api("GET", "/api/satelit/jeda")).s, 503, "granul ada, ringkasan belum: tetap 503");
  assert.equal(await ringkasN(), 0, "permintaan publik tidak menulis ringkasan");
  await kosongKan();
});

uji("satelit jeda: rute publik GET 200 JSON (bentuk kontrak) dari SATU baris ringkasan, tidak dihitung dari granul; query diabaikan, HEAD 200 tanpa isi, metode lain 405, cache-control 6 jam", async () => {
  await kosongKan(); await T.DB.prepare("DELETE FROM satelit_ringkas").run();
  const kini = Date.now(), t0 = kini - 3 * HARI;
  assert.equal((await T.api("GET", "/api/satelit/jeda")).s, 503, "belum ada ringkasan");
  await sisip([["N20", t0 - 10 * JAM, 600], ["N20", t0 + JAM, 150], ["N20", t0 + 5 * JAM, 210], ["N21", t0 + 2 * JAM, 120], ["M", t0 + 3 * JAM, 100], ["N", t0 + 4 * JAM, 250]]);
  assert.equal((await T.api("GET", "/api/satelit/jeda")).s, 503, "granul ada tetapi ringkasan belum dihitung: endpoint tidak menghitung");
  await ringkasGranul(ENV(T.DB), Date.now(), {paksa: true});
  const r = await T.api("GET", "/api/satelit/jeda");
  assert.equal(r.s, 200, r.t); assert.match(r.h.get("content-type"), /^application\/json/);
  assert.equal(r.h.get("cache-control"), "public, max-age=21600", "cache tepi 6 jam"); assert.equal(r.h.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Object.keys(r.j), ["dibuat", "hari", "dari", "sampai", "mulai_catat", "batas_jeda_menit", "sensor"]); assert.equal(r.j.batas_jeda_menit, 1440);
  assert.equal(r.j.hari, 30); assert.equal(Date.parse(r.j.sampai) - Date.parse(r.j.dari), 30 * HARI); assert.ok(Math.abs(Date.parse(r.j.dibuat) - kini) < 60e3);
  assert.deepEqual(Object.keys(r.j.sensor), ["N20", "N21", "M", "N"]);
  for (const s of Object.values(r.j.sensor)) assert.deepEqual(Object.keys(s), ["n", "lintasan", "hari_ada", "median_menit", "p90_menit", "siang", "malam"]);
  assert.equal(r.j.mulai_catat, new Date(t0).toISOString(), "granul tertua (akuisisi t0 - 10 jam) terlihat di t0");
  assert.equal(r.j.sensor.N20.n, 2, "granul tertua (sebelum mulai_catat) tidak dihitung"); assert.deepEqual([r.j.sensor.N20.median_menit, r.j.sensor.N20.p90_menit], [150, 210]);
  assert.deepEqual([r.j.sensor.N21.median_menit, r.j.sensor.M.median_menit, r.j.sensor.N.median_menit], [120, 100, 250]);
  assert.ok(!/ip_hash|token|kunci/i.test(r.t), "tanpa data pribadi");
  assert.equal(r.t, (await ringkasBaris()).isi, "badan respons = teks baris tersimpan apa adanya");
  /* bukti tidak menghitung per permintaan: granul dikosongkan, jawaban tetap sama sampai cron menghitung ulang */
  await kosongKan();
  const q = await T.api("GET", "/api/satelit/jeda?hari=1&sensor=N20&x=" + Math.random()); assert.equal(q.s, 200); assert.equal(q.t, r.t, "query diabaikan dan isi dari ringkasan tersimpan"); assert.equal(q.j.sensor.N20.n, 2);
  const hd = await T.mf.dispatchFetch("http://bnpb.lokal/api/satelit/jeda", {method: "HEAD"});
  assert.equal(hd.status, 200); assert.equal(await hd.text(), ""); assert.equal(hd.headers.get("cache-control"), "public, max-age=21600");
  for (const m of ["POST", "PUT", "DELETE", "PATCH"]) {
    const x = await T.api(m, "/api/satelit/jeda", m === "DELETE" ? undefined : {a: 1}); assert.equal(x.s, 405, `${m}: ${x.t}`); assert.equal(x.h.get("allow"), "GET, HEAD"); assert.ok(x.j.galat);
  }
  assert.equal((await T.api("POST", "/api/satelit/jeda", {a: 1}, {"x-admin-token": "rahasia-admin"})).s, 405, "admin pun tidak menulis lewat rute ini");
  assert.equal(await ringkasN(), 1, "permintaan publik tidak mengubah ringkasan");
  await T.DB.prepare("DELETE FROM satelit_ringkas").run();
});

uji("satelit jeda: cache tepi menyimpan 200 (kunci tanpa query) dan tidak menyimpan 503 (tanpa tabel maupun tanpa baris)", async () => {
  /* Miniflare terpisah dengan cache AKTIF (siapkan() mematikannya) */
  const mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-satelit-tepi"}, bindings: {IP_SALT: "garam-uji"}, serviceBindings: {ASSETS: aset}, outboundService: () => new Response("diblok", {status: 599})});
  try {
    const DB = await mf.getD1Database("DB");
    await DB.batch(pecah(migrasi()).filter(s => !/satelit_(granul|ringkas)/.test(s)).map(s => DB.prepare(s)));   // tanpa 0075
    const ambil = async (j = "") => { const r = await mf.dispatchFetch("http://warga.lokal/api/satelit/jeda" + j); const t = await r.text(); return {s: r.status, t, j: JSON.parse(t)}; };
    assert.equal((await ambil()).s, 503, "tanpa tabel");
    await DB.batch(pecah(SQL_0075).map(s => DB.prepare(s)));
    assert.equal((await ambil()).s, 503, "tabel ada, baris belum");
    const simpan = (dibuat) => DB.prepare("INSERT INTO satelit_ringkas (id, isi, dibuat) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET isi = excluded.isi, dibuat = excluded.dibuat").bind(JSON.stringify({dibuat: new Date(dibuat).toISOString(), hari: 30}), dibuat).run();
    await simpan(1e12);
    const a = await ambil(); assert.equal(a.s, 200, "503 tidak masuk cache: begitu baris ada langsung 200"); assert.equal(a.j.dibuat, new Date(1e12).toISOString());
    await new Promise(r => setTimeout(r, 50));   // c.put lewat waitUntil
    await simpan(2e12);
    const b = await ambil("?acak=" + Math.random());
    assert.equal(b.j.dibuat, a.j.dibuat, "jawaban kedua dari cache (kunci tanpa query), bukan dibaca ulang dari D1");
  } finally { await mf.dispose(); }
});
