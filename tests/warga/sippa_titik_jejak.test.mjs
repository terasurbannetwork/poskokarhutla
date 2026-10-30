/* SP-103 (alarm titik panas dekat kompleks zona A/B, cron FIRMS) dan SP-115 (keputusan + jejak), keputusan pemilik 61.
   Worker utuh di workerd + D1 + R2 sungguhan, semua migrasi apa adanya (TEST.md: tanpa mock). FIRMS dilayani dari CSV fixture lewat outboundService.
   Jalankan: node --test tests/warga/sippa_titik_jejak.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN, MOD2} from "./_bnpb.mjs";
import "../../src/worker.js";

const JAM = 3600e3, PB = {"x-pb": "1", origin: "http://bnpb.lokal"}, uji = berantai();
const KEP_V = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
const tgl = t => new Date(t).toISOString().slice(0, 10), jm = t => new Date(t).toISOString().slice(11, 16).replace(":", "");
let BARIS = [];   // baris CSV VIIRS_SNPP_NRT putaran berjalan
const baris = (lat, lon, t) => `${lat},${lon},330,0.4,0.4,${tgl(t)},${jm(t)},N,VIIRS,h,2.0NRT,290,12.3,D`;
const luar = async req => {
  const u = new URL(req.url); if (u.hostname !== "firms.modaps.eosdis.nasa.gov") return new Response("diblok", {status: 599});
  return u.pathname.split("/")[5] === "VIIRS_SNPP_NRT" ? new Response([KEP_V, ...BARIS].join("\n")) : new Response("Invalid MAP_KEY.", {status: 400});
};
const U = await siapkan("uji-sippa-titik", {r2: true, luar, ikat: {FIRMS_MAP_KEY: "kunci-uji"}}), {mf, DB, api} = U;
const R2 = await mf.getR2Bucket("MEDIA");
const sip = (m, j, b, h) => api(m, "/api/sippa" + j, b, h);
let ip = 0;
const bikin = async (peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1981${++ip}0012005`, unit: "Pusdalops BNPB", email: `st${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie, ...PB}};
};
const pus = await bikin(["pusdalops"]), pim = await bikin(["pimpinan"]), ver = await bikin(["verifikator"]), pus61 = await bikin(["pusdalops"], ["61"]);
const derajat = km => km / 111.32;
const LAT = -2.13, LON = 113.57, KOMP = [
  {id: "K0129", prov: "62", kab: "Kota Palangkaraya", lat: LAT + derajat(1.2), lon: LON, zona_k: "A"},     // 1,2 km dari titik pertama
  {id: "K0130", prov: "62", kab: "Seruyan", lat: LAT, lon: LON + derajat(1.9), zona_k: "B"},                  // 1,9 km: masuk
  {id: "K0131", prov: "62", kab: "Seruyan", lat: LAT, lon: LON + derajat(2.3), zona_k: "A"},                  // 2,3 km: di luar
  {id: "K0132", prov: "62", kab: "Seruyan", lat: LAT + derajat(0.5), lon: LON, zona_k: "C"},                  // zona C: tidak dihitung
  {id: "K0133", prov: "62", kab: "Kapuas", lat: LAT - 0.5, lon: LON, zona_k: "A"}];                           // jauh; dekat titik putaran 3
const putarTitik = async () => { await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.UTC(2026, 9, 16, 3, 15)}); };
const dekat = async () => (await DB.prepare("SELECT kompleks_id, prov, kab, zona, jarak_km FROM sippa_titik_dekat ORDER BY kompleks_id").all()).results;
const butir = async h => (await api("GET", "/api/pantau", undefined, h)).j.butir.filter(b => b.jenis === "sippa_titik");

uji("SP-103 alarm titik: titik baru dalam 2 km dari kompleks zona A atau B jadi satu butir Meja Pantau per kompleks; zona C dan lebih dari 2 km tidak; R2 tak ada = tidak alarm", async () => {
  const t1 = Date.now() - 2 * JAM;
  BARIS = [baris(LAT, LON, t1)];
  await putarTitik();   // R2 belum berisi kelayakan_kompleks: putaran tetap sah, tanpa alarm
  assert.equal((await dekat()).length, 0, "tanpa data kelayakan tidak ada alarm");
  await R2.put("sippa/kelayakan_kompleks.json", JSON.stringify({kompleks: KOMP}));
  BARIS = [baris(LAT, LON, t1), baris(LAT, LON + 0.001, t1 + 60e3)];   // satu titik sudah ada di putaran sebelumnya, satu baru
  await putarTitik();
  const d = await dekat();
  assert.deepEqual(d.map(x => x.kompleks_id), ["K0129", "K0130"], `hanya A/B dalam 2 km: ${JSON.stringify(d)}`);
  assert.ok(Math.abs(d[0].jarak_km - 1.2) < 0.05, `jarak haversine K0129 ${d[0].jarak_km}`);
  const b = await butir(pus.h); assert.equal(b.length, 2);
  const k = b.find(x => x.id.startsWith("sippa-titik:K0129:")); assert.match(k.judul, /^Titik panas baru 1,2 km dari kompleks K0129 \(zona A, Kota Palangkaraya\)$/);
  assert.equal(k.tautan, "/pipa/peta");
  assert.equal((await butir(ver.h)).length, 0, "verifikator bukan penangan jenis ini");
  assert.equal((await butir(pus61.h)).length, 0, "staf wilayah 61 tidak melihat provinsi 62");
});

uji("SP-103 alarm titik: tanpa duplikat 24 jam untuk kompleks yang sama; titik lama tidak dihitung baru; kompleks lain tetap bisa beralarm", async () => {
  const t1 = Date.now() - 2 * JAM;
  BARIS = [baris(LAT, LON, t1), baris(LAT, LON + 0.001, t1 + 60e3), baris(LAT, LON + 0.002, Date.now() - 30 * 60e3)];   // titik ketiga baru, masih dekat K0129 dan K0130
  await putarTitik();
  assert.equal((await dekat()).length, 2, "K0129 dan K0130 sudah beralarm dalam 24 jam: tidak ada baris baru");
  BARIS = [...BARIS, baris(LAT - 0.5, LON, Date.now() - 20 * 60e3)];
  await putarTitik();
  assert.deepEqual((await dekat()).map(x => x.kompleks_id), ["K0129", "K0130", "K0133"], "kompleks lain beralarm");
  await DB.prepare("UPDATE sippa_titik_dekat SET dibuat = dibuat - ?").bind(25 * JAM).run();
  assert.equal((await butir(pus.h)).length, 0, "butir hilang sesudah 24 jam");
  BARIS = [...BARIS, baris(LAT, LON + 0.003, Date.now() - 10 * 60e3)];
  await putarTitik();
  assert.ok((await dekat()).filter(x => x.kompleks_id === "K0129").length === 2, "lewat 24 jam, titik baru beralarm lagi");
});

const KP = (o = {}) => ({kompleks_id: "K0129", putusan: "jalan", alasan: "Air dan jalan lolos cek lapangan", prov: "62", ...o});
uji("SP-115 POST /api/sippa/keputusan: peran tulis 201 + jejak; pimpinan, verifikator, tamu ditolak; masukan liar 400; wilayah lain 404; prov dari R2 bila tak dikirim", async () => {
  const sebelum = (await DB.prepare("SELECT count(*) n FROM pantau_jejak WHERE aksi = 'keputusan'").first()).n;
  const r = await sip("POST", "/keputusan", KP(), pus.h); assert.equal(r.s, 201, r.t);
  assert.deepEqual(Object.keys(r.j.keputusan).sort(), ["alasan", "dummy", "id", "kompleks_id", "oleh", "prov", "putusan", "waktu"]);
  assert.equal(r.j.keputusan.putusan, "jalan");
  const j = await DB.prepare("SELECT oleh, obyek, ke, catatan FROM pantau_jejak WHERE aksi = 'keputusan'").first();
  assert.equal(j.obyek, "sippa_keputusan:" + r.j.keputusan.id); assert.equal(j.ke, "K0129 jalan"); assert.equal(j.catatan, "Air dan jalan lolos cek lapangan");
  assert.equal((await DB.prepare("SELECT count(*) n FROM pantau_jejak WHERE aksi = 'keputusan'").first()).n, sebelum + 1);
  assert.equal((await sip("POST", "/keputusan", KP({prov: undefined, kompleks_id: "K0130", putusan: "tunda"}), pus.h)).j.keputusan.prov, "62", "prov dari kelayakan_kompleks");
  assert.equal((await sip("POST", "/keputusan", KP({prov: "61"}), pus.h)).j.keputusan.prov, "62", "prov kiriman klien diabaikan");
  const takAda = await sip("POST", "/keputusan", KP({kompleks_id: "K9999"}), pus.h), luarWil = await sip("POST", "/keputusan", KP({prov: "61"}), pus61.h);
  assert.equal(takAda.s, 404); assert.equal(luarWil.s, 404); assert.equal(takAda.t, luarWil.t, "tidak ada dan di luar wilayah: jawaban identik");
  assert.equal((await sip("POST", "/keputusan", KP(), pim.h)).s, 403, "pimpinan hanya membaca");
  assert.equal((await sip("POST", "/keputusan", KP(), ver.h)).s, 403);
  assert.equal((await sip("POST", "/keputusan", KP())).s, 401);
  for (const [salah, ket] of [[{kompleks_id: "kompleks"}, "id"], [{putusan: "batal"}, "putusan"], [{alasan: "ab"}, "alasan pendek"], [{alasan: "x".repeat(301)}, "alasan panjang"], [{alasan: 5}, "alasan angka"]])
    assert.equal((await sip("POST", "/keputusan", KP(salah), pus.h)).s, 400, ket);
  assert.equal((await sip("GET", "/keputusan", undefined, pus.h)).s, 405, "metode GET ditolak router");
});

uji("SP-115 GET /api/sippa/jejak: baca untuk peran baca, memuat perubahan SIPPA lain, sejak dan batas divalidasi, disaring provinsi staf", async () => {
  const k = await sip("POST", "/kit", {kode: "SIPPA-050", jenis: "gambut", templat: "gambut", prov: "62", kab: "Kapuas", lokasi: "Gudang"}, MOD2); assert.equal(k.s, 201, k.t);
  const kit61 = await sip("POST", "/kit", {kode: "SIPPA-051", jenis: "gambut", templat: "gambut", prov: "61", kab: "Pontianak", lokasi: "Gudang"}, MOD2); assert.equal(kit61.s, 201, kit61.t);
  const jc = await sip("POST", "/jalan-cek", {kompleks_id: "K0129", prov: "62", musim: "hujan", hasil: "lolos"}, pus.h); assert.equal(jc.s, 201, jc.t);
  const r = await sip("GET", "/jejak", undefined, pim.h); assert.equal(r.s, 200, r.t);
  assert.match(r.h.get("cache-control"), /no-store/);
  const aksi = r.j.jejak.map(x => x.aksi);
  for (const a of ["keputusan", "jalan_cek", "buat"]) assert.ok(aksi.includes(a), `jejak memuat ${a}: ${aksi}`);
  assert.deepEqual(Object.keys(r.j.jejak[0]).sort(), ["aksi", "catatan", "id", "ke", "obyek", "oleh", "prov", "waktu"]);
  assert.ok(r.j.jejak.every(x => x.obyek.startsWith("sippa_")), "hanya jejak SIPPA");
  assert.ok(r.j.jejak.every((x, i, a) => !i || a[i - 1].waktu >= x.waktu), "terbaru dulu");
  assert.equal(r.j.terpotong, false);
  assert.equal((await sip("GET", "/jejak?batas=1", undefined, pim.h)).j.jejak.length, 1);
  assert.equal((await sip("GET", `/jejak?sejak=${Date.now() + 3600e3}`, undefined, pim.h)).j.jejak.length, 0);
  for (const q of ["batas=0", "batas=501", "batas=x", "sejak=-1", "sejak=abc"]) assert.equal((await sip("GET", "/jejak?" + q, undefined, pim.h)).s, 400, q);
  const w = await sip("GET", "/jejak", undefined, pus61.h); assert.equal(w.s, 200);
  assert.ok(w.j.jejak.length >= 1 && w.j.jejak.every(x => x.prov === "61"), `staf wilayah 61 hanya provinsi 61: ${JSON.stringify(w.j.jejak.map(x => x.prov))}`);
  assert.equal((await sip("GET", "/jejak", undefined, ver.h)).s, 403); assert.equal((await sip("GET", "/jejak")).s, 401);
  assert.equal((await sip("POST", "/jejak", {}, pus.h)).s, 405);
});

uji("SP-103 alarm titik: putaran gagal (R2 hilang) tidak menghilangkan titik barunya; putaran berikut membandingkan dengan putaran terakhir yang berhasil", async () => {
  await DB.prepare("DELETE FROM sippa_titik_dekat").run();
  const t = Date.now() - 20 * 60e3, lat = -2.4, lon = 113.9;
  await R2.put("sippa/kelayakan_kompleks.json", JSON.stringify({kompleks: [{id: "K0200", prov: "62", kab: "Pulang Pisau", lat: lat + derajat(1), lon, zona_k: "A"}]}));
  BARIS = [baris(lat, lon, t - 3 * JAM)]; await putarTitik();   // dasar: sudah diproses
  await DB.prepare("DELETE FROM sippa_titik_dekat").run();
  await R2.delete("sippa/kelayakan_kompleks.json");
  BARIS = [baris(lat, lon, t - 3 * JAM), baris(lat, lon + 0.0005, t)]; await putarTitik();   // titik baru, tetapi R2 hilang: dilewati
  assert.equal((await dekat()).length, 0);
  await R2.put("sippa/kelayakan_kompleks.json", JSON.stringify({kompleks: [{id: "K0200", prov: "62", kab: "Pulang Pisau", lat: lat + derajat(1), lon, zona_k: "A"}]}));
  await putarTitik();   // titik yang sama kini bukan "baru" terhadap putaran sebelumnya, tetapi baru terhadap putaran terakhir yang berhasil
  assert.deepEqual((await dekat()).map(x => x.kompleks_id), ["K0200"], "titik dari putaran yang dilewati tetap beralarm");
});
