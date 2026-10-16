/* Peringatan dini (src/peringatan.js) di workerd (Miniflare): D1 lokal dengan migrasi apa adanya, cron gempa dipicu lewat worker.scheduled(),
   BMKG dijawab fixture inline lewat outboundService, TANPA jaringan. Jalankan: node --test tests/warga/peringatan.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import {tingkatGempa} from "../../src/peringatan.js";

const JAM = 3600e3;
const T10 = Math.floor(Date.now() / 600e3) * 600e3;   // menit kelipatan 10: gempaterkini + aturan cuaca ikut jalan
const iso = t => new Date(t).toISOString().replace(/\.\d+Z/, "+00:00");
const g = (t, lat, lon, m, dalam, wil, potensi = "Tidak berpotensi tsunami") => ({DateTime: iso(t), Coordinates: `${lat},${lon}`, Magnitude: String(m), Kedalaman: `${dalam} km`, Wilayah: wil, Potensi: potensi});

test("tingkatGempa: Waspada M>=5 atau MMI IV, Siaga M>=6 dangkal, M kecil tanpa dirasakan tidak", () => {
  assert.equal(tingkatGempa({m: 5.8, dalam: 10, mmi_maks: null}), "Waspada");
  assert.equal(tingkatGempa({m: 6.0, dalam: 60, mmi_maks: null}), "Siaga");
  assert.equal(tingkatGempa({m: 6.4, dalam: 150, mmi_maks: null}), "Waspada", "dalam bukan dangkal");
  assert.equal(tingkatGempa({m: 6.4, dalam: null, mmi_maks: null}), "Waspada");
  assert.equal(tingkatGempa({m: 4.2, dalam: 10, mmi_maks: null}), null);
  assert.equal(tingkatGempa({m: 4.2, dalam: 10, mmi_maks: 3}), null);
  assert.equal(tingkatGempa({m: 4.2, dalam: 10, mmi_maks: 4}), "Waspada");
});

let mf, worker, DB, cuaca = null;   // cuaca = isi tiruan nowcast (null = berkas asli)
const sumber = {};
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname !== "data.bmkg.go.id") return new Response("diblok di uji", {status: 599});
  const nama = u.pathname.split("/").pop().replace(".json", ""), s = sumber[nama];
  return s ? new Response(JSON.stringify({Infogempa: {gempa: s}}), {headers: {"content-type": "application/json"}}) : new Response("{}", {status: 404});
};
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/banjir/data/peringatan.json" && cuaca) return new Response(JSON.stringify({nowcast: cuaca}));
  const f = path.join(AKAR, "public", p);
  return existsSync(f) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const buatMf = (nama, cache) => new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
  compatibilityDate: "2024-09-23", d1Databases: {DB: nama}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"}, serviceBindings: {ASSETS: aset}, outboundService: luar, cache});
before(async () => {
  mf = buatMf("uji-peringatan", false);
  DB = await mf.getD1Database("DB"); worker = await mf.getWorker();
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
const tik = t => worker.scheduled({cron: "* * * * *", scheduledTime: new Date(t)});
const baris = async (sql, ...b) => (await DB.prepare(sql).bind(...b).all()).results;
const api = async (j, init) => { const r = await mf.dispatchFetch("http://peringatan.lokal" + j, init); const teks = await r.text(); let x = null; try { x = JSON.parse(teks); } catch (e) {} return {status: r.status, j: x, teks, h: r.headers}; };
const ADMIN = {"x-admin-token": "rahasia-admin"};

uji("migrasi 0010 peringatan idempoten: dijalankan dua kali tidak galat", async () => {
  const sql = pecah(migrasi()).filter(s => /peringatan/.test(s));
  assert.ok(sql.length >= 2);
  await DB.batch(sql.map(s => DB.prepare(s)));
});

uji("gempa M5,8 dangkal di darat = satu alarm Waspada berlabel BMKG; diulang tetap satu; M4,2 dan M5,5 di laut jauh tidak berbunyi", async () => {
  const t = Date.now() - JAM;
  sumber.gempaterkini = [g(t, -7.2, 107.9, 5.8, 10, "uji darat Garut"), g(t, -9.5, 128, 4.2, 10, "uji laut kecil"), g(t, -11.2, 100, 5.5, 10, "uji laut jauh M5.5")];
  await tik(T10);
  const a = await baris("SELECT * FROM peringatan WHERE jenis IN ('gempa', 'tsunami')");
  assert.equal(a.length, 1, JSON.stringify(a.map(x => x.judul)));
  assert.equal(a[0].jenis, "gempa"); assert.equal(a[0].tingkat, "Waspada"); assert.equal(a[0].sumber, "BMKG"); assert.equal(a[0].prov, "32");
  assert.match(a[0].kunci, /^gempa:G\d{4}:waspada$/); assert.match(a[0].judul, /M5,8/); assert.ok(a[0].teks.includes("uji darat Garut"));
  assert.ok(a[0].berlaku_hingga > Date.now() && a[0].dicabut === null);
  await tik(T10 + 300e3); await tik(T10 + 900e3);
  assert.equal((await baris("SELECT count(*) n FROM peringatan"))[0].n, 1, "putaran ulang tidak menggandakan");
});

uji("gempa M6,2 dangkal di darat = Siaga; teks sumber pihak ketiga dipotong", async () => {
  const t = Date.now() - JAM, panjang = "X".repeat(900);
  sumber.gempaterkini = [g(t, -7.2, 107.9, 5.8, 10, "uji darat Garut"), g(t + 60e3, -2.0, 101.5, 6.2, 12, panjang)];
  await tik(T10 + 1500e3);
  const s = await baris("SELECT * FROM peringatan WHERE tingkat = 'Siaga' AND jenis = 'gempa'");
  assert.equal(s.length, 1); assert.ok(s[0].teks.length <= 600 && s[0].teks.includes("XXXX"));
  assert.equal((await baris("SELECT count(*) n FROM peringatan WHERE jenis = 'gempa'"))[0].n, 2);
});

uji("Potensi tsunami BMKG kode 1-3 = alarm Awas berlabel InaTEWS; 'Tidak berpotensi' tidak membuat alarm tsunami", async () => {
  const t = Date.now() - 30 * 60e3;
  sumber.gempaterkini = [g(t, -3.2, 99.9, 7.1, 20, "uji Mentawai", "Berpotensi tsunami, status Awas")];
  await tik(T10 + 2100e3);
  const ts = await baris("SELECT * FROM peringatan WHERE jenis = 'tsunami'");
  assert.equal(ts.length, 1); assert.equal(ts[0].tingkat, "Awas"); assert.equal(ts[0].sumber, "InaTEWS"); assert.match(ts[0].teks, /Berpotensi tsunami/);
  assert.ok(!/aman/i.test(ts[0].judul + ts[0].teks));
  await tik(T10 + 2700e3);
  assert.equal((await baris("SELECT count(*) n FROM peringatan WHERE jenis = 'tsunami'"))[0].n, 1);
});

uji("cuaca BMKG: Severe = Siaga, Extreme = Awas, Moderate dan sudah selesai tidak; ulang tetap satu", async () => {
  const mulai = Date.now() - JAM, selesai = Date.now() + 2 * JAM;
  const c = (id, severity, sel = selesai) => ({id, event: "Hujan Lebat", severity, aktif: true, selesai: new Date(sel).toISOString(), wilayah: "uji", headline: `Hujan ${severity}`, deskripsi: "uji cuaca", prov: ["32"], url: "https://www.bmkg.go.id/alerts/nowcast/id/" + id});
  cuaca = [c("uji.sedang", "Moderate"), c("uji.berat", "Severe"), c("uji.ekstrem", "Extreme"), c("uji.lewat", "Severe", mulai)];
  await tik(T10 + 3000e3);
  const r = await baris("SELECT kunci, tingkat, sumber, prov FROM peringatan WHERE jenis = 'cuaca' ORDER BY kunci");
  assert.deepEqual(r.map(x => [x.kunci, x.tingkat, x.sumber, x.prov]), [["cuaca:uji.berat:siaga", "Siaga", "BMKG", "32"], ["cuaca:uji.ekstrem:awas", "Awas", "BMKG", "32"]]);
  await tik(T10 + 3600e3);
  assert.equal((await baris("SELECT count(*) n FROM peringatan WHERE jenis = 'cuaca'"))[0].n, 2);
  cuaca = null;
});

uji("GET /api/peringatan/aktif: bentuk JSON tanpa kolom internal; sejak menyaring; kedaluwarsa dan tak sah tidak ikut", async () => {
  const r = await api("/api/peringatan/aktif");
  assert.equal(r.status, 200); assert.equal(r.j.n, r.j.peringatan.length); assert.equal(r.j.n, 6);
  assert.deepEqual(Object.keys(r.j.peringatan[0]).sort(), ["berlaku_hingga", "dibuat", "jenis", "kab", "kunci", "lat", "lon", "judul", "prov", "sumber", "sumber_url", "teks", "tingkat"].sort());
  assert.ok(!r.teks.includes("dicabut"));
  const urut = r.j.peringatan.map(x => x.dibuat); assert.deepEqual(urut, [...urut].sort().reverse());
  assert.equal((await api("/api/peringatan/aktif?sejak=" + (Date.now() + 3600e3))).j.n, 0, "sejak di masa depan: kosong");
  assert.equal((await api("/api/peringatan/aktif?sejak=abc")).j.n, 6, "sejak tak sah diabaikan");
  await DB.prepare("UPDATE peringatan SET berlaku_hingga = ? WHERE jenis = 'cuaca' AND tingkat = 'Awas'").bind(Date.now() - 1000).run();
  assert.equal((await api("/api/peringatan/aktif")).j.n, 5, "kedaluwarsa hilang");
});

uji("/api/peringatan/aktif: selain GET/HEAD = 405, HEAD dilayani; /api/peringatan/lain = bukan rute", async () => {
  const p = await api("/api/peringatan/aktif", {method: "POST", body: "{}"});
  assert.equal(p.status, 405); assert.equal(p.h.get("allow"), "GET, HEAD");
  assert.equal((await api("/api/peringatan/aktif", {method: "DELETE"})).status, 405);
  const h = await mf.dispatchFetch("http://peringatan.lokal/api/peringatan/aktif", {method: "HEAD"});
  assert.equal(h.status, 200); assert.equal(await h.text(), "");
  assert.equal((await mf.dispatchFetch("http://peringatan.lokal/api/peringatan/semua")).status, 404);
});

uji("cabut admin: tanpa token 403, GET 405, token benar menghilangkan dari /aktif, ulang aman, tidak muncul lagi saat cron berjalan", async () => {
  const ada = (await api("/api/peringatan/aktif")).j.peringatan, k = ada.find(x => x.jenis === "tsunami").kunci, url = "/api/admin/peringatan/" + encodeURIComponent(k) + "/cabut";
  assert.equal((await api(url, {method: "POST"})).status, 403);
  assert.equal((await api(url, {method: "POST", headers: {"x-admin-token": "salah"}})).status, 403);
  assert.equal((await api(url, {method: "GET", headers: ADMIN})).status, 405);
  assert.equal((await api(url, {method: "POST", headers: {...ADMIN, origin: "https://jahat.example"}})).status, 403, "origin lain");
  assert.equal((await api(url, {method: "POST", headers: ADMIN})).status, 200);
  assert.ok(!(await api("/api/peringatan/aktif")).j.peringatan.some(x => x.kunci === k));
  const dua = await api(url, {method: "POST", headers: ADMIN}); assert.equal(dua.status, 200); assert.equal(dua.j.sudah, true);
  assert.equal((await api("/api/admin/peringatan/tidak-ada/cabut", {method: "POST", headers: ADMIN})).status, 404);
  const r = (await baris("SELECT dicabut, dicabut_oleh FROM peringatan WHERE kunci = ?", k))[0]; assert.ok(r.dicabut > 0 && r.dicabut_oleh);
  sumber.gempaterkini = [g(Date.now() - 30 * 60e3, -3.2, 99.9, 7.1, 20, "uji Mentawai", "Berpotensi tsunami, status Awas")];
  await tik(T10 + 4200e3);
  assert.ok(!(await api("/api/peringatan/aktif")).j.peringatan.some(x => x.kunci === k), "alarm yang dicabut tidak dihidupkan lagi oleh cron");
});

uji("satu baris melanggar CHECK tidak membunuh alarm sah lain; sejak > 7 hari diabaikan; Origin rusak = 403", async () => {
  await DB.prepare("CREATE TRIGGER uji_rusak BEFORE INSERT ON peringatan WHEN new.kunci LIKE '%rusak%' BEGIN SELECT RAISE(ABORT, 'uji'); END").run();
  try {
    const selesai = new Date(Date.now() + 2 * JAM).toISOString();
    const c = id => ({id, event: "Hujan", severity: "Severe", aktif: true, selesai, wilayah: "uji", headline: "uji " + id, deskripsi: "uji", prov: ["32"]});
    cuaca = [c("uji.rusak.1"), c("uji.sehat.2")];
    await tik(T10 + 5400e3);
    assert.equal((await baris("SELECT count(*) n FROM peringatan WHERE kunci = 'cuaca:uji.sehat.2:siaga'"))[0].n, 1, "baris sehat tetap tertulis");
    assert.equal((await baris("SELECT count(*) n FROM peringatan WHERE kunci LIKE '%rusak%'"))[0].n, 0);
  } finally { cuaca = null; await DB.prepare("DROP TRIGGER uji_rusak").run(); }
  const dekat = (await api("/api/peringatan/aktif?sejak=" + (Date.now() - 8 * 24 * JAM))).j.n, semua = (await api("/api/peringatan/aktif")).j.n;
  assert.equal(dekat, semua, "sejak 8 hari lalu = tanpa sejak");
  const o = await api("/api/admin/peringatan/x-yz/cabut", {method: "POST", headers: {...ADMIN, origin: "bukan url ::"}});
  assert.equal(o.status, 403);
});

uji("galat D1 (tabel hilang): /aktif tetap 200 daftar kosong, cron diam tanpa mematahkan putaran lain", async () => {
  await DB.prepare("ALTER TABLE peringatan RENAME TO peringatan_x").run();
  try {
    const r = await api("/api/peringatan/aktif"); assert.equal(r.status, 200); assert.equal(r.j.n, 0); assert.deepEqual(r.j.peringatan, []);
    await tik(T10 + 4800e3);   // tidak melempar
  } finally { await DB.prepare("ALTER TABLE peringatan_x RENAME TO peringatan").run(); }
  assert.ok((await api("/api/peringatan/aktif")).j.n >= 3);
});

/* instance kedua: cache tepi AKTIF */
uji("cache tepi /aktif: 30 dtk, kunci hanya jalur + sejak dibulatkan ke menit (parameter liar dibuang)", async () => {
  const mf2 = buatMf("uji-peringatan-cache", true);
  try {
    const D2 = await mf2.getD1Database("DB"); await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
    const ins = k => D2.prepare("INSERT INTO peringatan (kunci,jenis,tingkat,judul,sumber,dibuat,berlaku_hingga) VALUES (?,?,?,?,?,?,?)").bind(k, "gempa", "Waspada", "uji " + k, "BMKG", Date.now(), Date.now() + JAM).run();
    const get = async j => { const r = await mf2.dispatchFetch("http://peringatan.lokal" + j); return {status: r.status, j: await r.json(), h: r.headers}; };
    await ins("gempa:G0001:waspada");
    const a = await get("/api/peringatan/aktif"); assert.equal(a.j.n, 1); assert.equal(a.h.get("cache-control"), "public, max-age=30");
    await ins("gempa:G0002:waspada");
    assert.equal((await get("/api/peringatan/aktif?x=acak1")).j.n, 1, "parameter liar tidak membuat kunci cache baru");
    assert.equal((await get("/api/peringatan/aktif?sejak=abc&y=2")).j.n, 1);
    const s = Math.floor(Date.now() / 60e3) * 60e3 - 60e3;
    assert.equal((await get("/api/peringatan/aktif?sejak=" + s)).j.n, 2, "sejak sah = kunci lain");
    assert.equal((await get("/api/peringatan/aktif?sejak=" + (s + 12345))).j.n, 2, "sejak dibulatkan ke menit: kunci sama dengan sebelumnya");
  } finally { await mf2.dispose(); }
});
