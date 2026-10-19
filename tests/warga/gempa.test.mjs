/* Katalog gempa (src/gempa.js) di workerd (Miniflare): D1 lokal dengan migrasi apa adanya, cron dipicu lewat worker.scheduled(),
   BMKG/USGS dijawab fixture hasil curl nyata (tests/warga/fixtures) lewat outboundService, TANPA jaringan.
   Jalankan: node --test tests/warga/gempa.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import {uraiPotensi, uraiDirasakan, uraiBMKG, uraiUSGS, diIndonesia, jendelaKm} from "../../src/gempa.js";

const FX = n => readFileSync(path.join(AKAR, "tests/warga/fixtures", n), "utf8");
const JAM = 3600e3, HARI = 24 * JAM, UA_PENUH = /^Mozilla\/5\.0 .*Chrome\/\d+/;
const T5 = Math.floor(Date.now() / 300e3) * 300e3, T1 = T5 + 60e3;   // menit kelipatan 5 (semua sumber) dan bukan (autogempa saja)

/* ---------- penguraian murni ---------- */
test("uraiPotensi: tanpa kata tsunami = null (bukan aman), tidak berpotensi = 0, tingkat dari kata BMKG", () => {
  assert.equal(uraiPotensi("Gempa ini dirasakan untuk diteruskan pada masyarakat"), null);
  assert.equal(uraiPotensi(undefined), null);
  assert.equal(uraiPotensi("Tidak berpotensi tsunami"), 0);
  assert.equal(uraiPotensi("Berpotensi tsunami"), 1);
  assert.equal(uraiPotensi("Berpotensi tsunami, status Waspada"), 1);
  assert.equal(uraiPotensi("Berpotensi tsunami, status Siaga"), 2);
  assert.equal(uraiPotensi("Berpotensi tsunami, status Awas"), 3);
});

test("uraiDirasakan: satu, daftar, rentang, sampah", () => {
  assert.equal(uraiDirasakan("II Kabandungan"), 2);
  assert.equal(uraiDirasakan("III Darajat, III Pasirwangi"), 3);
  assert.equal(uraiDirasakan("II - III Kab. Manggarai"), 3);
  assert.equal(uraiDirasakan("III Garut, V Bandung, IV Cianjur"), 5);
  assert.equal(uraiDirasakan("IV-V Bantul"), 5);
  assert.equal(uraiDirasakan("Ibu Kota"), null);
  assert.equal(uraiDirasakan(undefined), null);
});

test("uraiBMKG: fixture nyata, Potensi tanpa tsunami = null, baris rusak dihitung", () => {
  const a = uraiBMKG(JSON.parse(FX("bmkg_autogempa.json")));
  assert.equal(a.baris.length, 1); assert.equal(a.rusak, 0);
  assert.equal(a.baris[0].potensi, null); assert.match(a.baris[0].potensi_teks, /dirasakan/);
  assert.equal(a.baris[0].mmi_maks, 2); assert.equal(a.baris[0].m, 2.5); assert.equal(a.baris[0].dalam, 9);
  assert.equal(a.baris[0].id, "b:2026-10-16T03:21:55+00:00|-6.69,106.63");
  const k = uraiBMKG(JSON.parse(FX("bmkg_gempaterkini.json")));
  assert.equal(k.baris.length, 15); assert.ok(k.baris.every(b => b.potensi === 0 && b.m >= 5));
  const d = uraiBMKG(JSON.parse(FX("bmkg_gempadirasakan.json")));
  assert.ok(d.baris.every(b => b.potensi_teks === null && b.potensi === null));
  const buruk = uraiBMKG({Infogempa: {gempa: [{DateTime: "bukan", Coordinates: "1,2", Magnitude: "5"}, {DateTime: "2026-10-01T00:00:00+00:00", Coordinates: "40,100", Magnitude: "5"}]}});
  assert.equal(buruk.baris.length, 0); assert.equal(buruk.rusak, 2);
});

test("uraiUSGS: Filipina dan Timor Leste dibuang, Indonesia (termasuk laut) dipertahankan", () => {
  assert.equal(diIndonesia("8 km SE of Sarangani, Philippines"), false);
  assert.equal(diIndonesia("219 km E of Lospalos, Timor Leste"), false);
  assert.equal(diIndonesia("55 km N of Wewak, Papua New Guinea"), false);
  assert.equal(diIndonesia("71 km SW of Tambolaka, Indonesia"), true);
  assert.equal(diIndonesia("Banda Sea"), true);
  const u = uraiUSGS(JSON.parse(FX("usgs_indonesia.json")));
  assert.deepEqual(u.baris.map(b => b.usgs_id).sort(), ["us6000u1i6", "us6000u1mj", "us6000u1ye"]);
  assert.ok(u.baris.every(b => b.sumber === "usgs" && b.id === "u:" + b.usgs_id));
});

test("jendelaKm Gardner-Knopoff naik dengan magnitudo", () => {
  assert.ok(jendelaKm(5.7) > 40 && jendelaKm(5.7) < 60); assert.ok(jendelaKm(7) > jendelaKm(5.7));
});

/* ---------- Miniflare ---------- */
let mf, worker, DB;
const sumber = {};            // nama -> {status, body, etag}
const diminta = [];           // {nama, ua, inm}
const reset = () => { for (const k of Object.keys(sumber)) delete sumber[k]; diminta.length = 0; };
const isiNyata = () => Object.assign(sumber, {
  autogempa: {body: FX("bmkg_autogempa.json"), etag: 'W/"a1"'}, gempaterkini: {body: FX("bmkg_gempaterkini.json"), etag: 'W/"t1"'},
  gempadirasakan: {body: FX("bmkg_gempadirasakan.json"), etag: 'W/"d1"'}, usgs: {body: FX("usgs_indonesia.json")}});
const luar = async req => {
  const u = new URL(req.url), nama = u.hostname === "data.bmkg.go.id" ? u.pathname.split("/").pop().replace(".json", "") : u.hostname === "earthquake.usgs.gov" ? "usgs" : null;
  if (!nama) return new Response("diblok di uji", {status: 599});
  diminta.push({nama, ua: req.headers.get("user-agent"), inm: req.headers.get("if-none-match")});
  const s = sumber[nama]; if (!s) return new Response("tidak ada", {status: 500});
  if (s.status) return new Response("{}", {status: s.status});
  if (s.etag && req.headers.get("if-none-match") === s.etag) return new Response(null, {status: 304});
  return new Response(s.body, {headers: {"content-type": "application/json", ...(s.etag ? {etag: s.etag} : {})}});
};
const aset = async req => {
  const f = path.join(AKAR, "public", decodeURIComponent(new URL(req.url).pathname));
  return existsSync(f) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-gempa"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"},
    serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});
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
const api = async j => { const r = await mf.dispatchFetch("http://gempa.lokal" + j); const teks = await r.text(); let x = null; try { x = JSON.parse(teks); } catch (e) {} return {status: r.status, j: x, teks}; };

uji("migrasi 0009 idempoten: dijalankan dua kali tidak galat", async () => {
  const sql = pecah(migrasi()).filter(s => /gempa/.test(s) && !/laporan/.test(s));   // 0020 menyebut 'gempa' di CHECK laporan.bahaya (bukan tabel gempa)
  assert.ok(sql.length >= 6);
  await DB.batch(sql.map(s => DB.prepare(s)));
});

uji("menit kelipatan 5: autogempa + terkini + dirasakan + USGS tersimpan dan digabung, UA peramban penuh", async () => {
  reset(); isiNyata(); await tik(T5);
  assert.deepEqual(diminta.map(d => d.nama).sort(), ["autogempa", "gempadirasakan", "gempaterkini", "usgs"]);
  assert.ok(diminta.every(d => UA_PENUH.test(d.ua)), "semua permintaan harus membawa UA peramban penuh");
  const bogor = (await baris("SELECT * FROM gempa WHERE id = 'b:2026-10-16T03:21:55+00:00|-6.69,106.63'"))[0];
  assert.equal(bogor.potensi, null, "Potensi tanpa kata tsunami harus NULL, bukan 0"); assert.equal(bogor.mmi_maks, 2);
  assert.equal(bogor.shakemap, "20261016102155.mmi.jpg"); assert.equal(bogor.prov, "32");
  const gor = (await baris("SELECT * FROM gempa WHERE usgs_id = 'us6000u1mj'"))[0];
  assert.equal(gor.sumber, "gabung"); assert.equal(gor.m, 5.7, "magnitudo BMKG menang"); assert.ok(gor.id.startsWith("b:")); assert.equal(gor.potensi, 0);
  const sukabumi = (await baris("SELECT * FROM gempa WHERE usgs_id = 'us6000u1i6'"))[0];
  assert.equal(sukabumi.sumber, "gabung"); assert.equal(sukabumi.prov, "32", "gempa laut 193 km: provinsi dari pusat kecamatan terdekat");
  const u = (await baris("SELECT * FROM gempa WHERE usgs_id = 'us6000u1ye'"))[0];
  assert.equal(u.sumber, "gabung", "gempadirasakan M4.9 + USGS M5.1: satu baris"); assert.equal(u.mmi_maks, 3, "rentang 'II - III' -> 3"); assert.equal(u.m, 4.9); assert.equal(u.prov, "35");
  assert.equal((await baris("SELECT count(*) n FROM gempa WHERE wilayah LIKE '%Philippines%' OR wilayah LIKE '%Timor%'"))[0].n, 0);
  assert.equal((await baris("SELECT count(*) n FROM gempa WHERE usgs_id IS NOT NULL"))[0].n, 3, "hanya 3 dari 5 fitur USGS (Indonesia) yang disimpan");
});

uji("putaran ulang bukan kelipatan 5: hanya autogempa, If-None-Match -> 304, tidak ada baris ditulis", async () => {
  const sebelum = await baris("SELECT id, diperbarui FROM gempa ORDER BY id"), dibuat0 = (await baris("SELECT dibuat FROM gempa_sumber WHERE kunci = 'autogempa'"))[0].dibuat;
  diminta.length = 0; await tik(T1);
  assert.deepEqual(diminta.map(d => d.nama), ["autogempa"]); assert.equal(diminta[0].inm, 'W/"a1"');
  assert.deepEqual(await baris("SELECT id, diperbarui FROM gempa ORDER BY id"), sebelum);
  assert.ok((await baris("SELECT dibuat FROM gempa_sumber WHERE kunci = 'autogempa'"))[0].dibuat >= dibuat0, "304 tetap menandai sumber sehat");
});

uji("putaran identik kelipatan 5 tanpa ETag (USGS) tidak mengubah baris", async () => {
  const sebelum = await baris("SELECT id, diperbarui FROM gempa ORDER BY id");
  await tik(T5 + 300e3);
  assert.deepEqual(await baris("SELECT id, diperbarui FROM gempa ORDER BY id"), sebelum);
});

uji("satu sumber mati tidak mematahkan yang lain; semua mati = data lama utuh", async () => {
  const n0 = (await baris("SELECT count(*) n FROM gempa"))[0].n;
  sumber.autogempa = {status: 403}; sumber.gempadirasakan = {status: 500};
  sumber.gempaterkini = {body: JSON.stringify({Infogempa: {gempa: [{DateTime: new Date(Date.now() - HARI).toISOString().replace(/\.\d+Z/, "+00:00"), Coordinates: "-1.5,99.5", Magnitude: "5.3", Kedalaman: "20 km", Wilayah: "uji sumber mati", Potensi: "Tidak berpotensi tsunami"}]}}), etag: 'W/"t2"'};
  await tik(T5 + 600e3);
  assert.equal((await baris("SELECT count(*) n FROM gempa"))[0].n, n0 + 1, "terkini tetap tersimpan walau autogempa 403");
  sumber.gempaterkini = {status: 502}; sumber.usgs = {status: 503};
  await tik(T5 + 900e3);
  assert.equal((await baris("SELECT count(*) n FROM gempa"))[0].n, n0 + 1);
});

uji("kejadian G: susulan dalam jendela = satu G (kode tetap saat ulang), di luar jarak atau waktu = G baru", async () => {
  const iso = t => new Date(t).toISOString().replace(/\.\d+Z/, "+00:00"), T0 = Date.now() - 10 * HARI;
  const g = (t, lat, lon, m) => ({DateTime: iso(t), Coordinates: `${lat},${lon}`, Magnitude: String(m), Kedalaman: "10 km", Wilayah: `uji kejadian ${lat},${lon} M${m}`, Potensi: "Tidak berpotensi tsunami"});
  const kirim = async (...isi) => { sumber.autogempa = {status: 404}; sumber.gempadirasakan = {status: 404}; sumber.usgs = {status: 404};
    sumber.gempaterkini = {body: JSON.stringify({Infogempa: {gempa: isi}})}; await tik(T5 + 1200e3); };
  const utama = g(T0, -3, 100, 5.7), susulan = g(T0 + JAM, -3.1, 100.1, 5.2), jauh = g(T0 + JAM, -8, 120, 5.3), lewat = g(T0 + 4 * HARI, -3.05, 100.05, 5.1), kecil = g(T0 + 2 * JAM, -3.0, 100.0, 4.2);
  await kirim(utama);
  const kode = (await baris("SELECT kej FROM gempa WHERE wilayah = ?", utama.Wilayah))[0].kej;
  assert.match(kode, /^G\d{4}$/);
  await kirim(utama, susulan, jauh, kecil);
  const kej = async w => (await baris("SELECT kej FROM gempa WHERE wilayah = ?", w))[0].kej;
  assert.equal(await kej(susulan.Wilayah), kode, "M5.2 sejam kemudian, 15 km: kejadian yang sama");
  const kodeJauh = await kej(jauh.Wilayah); assert.match(kodeJauh, /^G\d{4}$/); assert.notEqual(kodeJauh, kode);
  assert.equal(await kej(kecil.Wilayah), kode, "M4.2 dua jam kemudian di pusat yang sama: susulan kecil tertaut ke kejadiannya");
  assert.equal((await baris("SELECT count(*) n FROM gempa_kejadian WHERE kode = ?", kode))[0].n, 1, "susulan kecil tidak membuat kejadian baru");
  await kirim(utama, susulan, jauh, kecil, lewat);
  assert.notEqual(await kej(lewat.Wilayah), kode, "4 hari kemudian: kejadian lama sudah tidak aktif (72 jam)");
  const n1 = (await baris("SELECT count(*) n FROM gempa_kejadian"))[0].n;
  await kirim(utama, susulan, jauh, kecil, lewat);   // ulang: kode tidak berubah, tidak ada kejadian baru
  assert.equal((await baris("SELECT count(*) n FROM gempa_kejadian"))[0].n, n1);
  assert.equal(await kej(utama.Wilayah), kode);
  assert.equal((await baris("SELECT utama_id FROM gempa_kejadian WHERE kode = ?", kode))[0].utama_id, (await baris("SELECT id FROM gempa WHERE wilayah = ?", utama.Wilayah))[0].id);
});

uji("kejadian bergabung BMKG sesudah USGS: id utama ikut berpindah ke id BMKG", async () => {
  const t = Date.now() - 3 * JAM, iso = new Date(t).toISOString().replace(/\.\d+Z/, "+00:00");
  const us = {type: "FeatureCollection", features: [{id: "us7000test", geometry: {coordinates: [96.5, 2.5, 30]}, properties: {mag: 6.1, magType: "mww", place: "50 km W of Sinabang, Indonesia", time: t + 2000, tsunami: 1, alert: "green", mmi: 6.2, type: "earthquake"}}]};
  sumber.autogempa = {status: 404}; sumber.gempaterkini = {status: 404}; sumber.gempadirasakan = {status: 404}; sumber.usgs = {body: JSON.stringify(us)};
  await tik(T5 + 1500e3);
  const u = (await baris("SELECT * FROM gempa WHERE usgs_id = 'us7000test'"))[0];
  assert.equal(u.sumber, "usgs"); assert.equal(u.tsunami_usgs, 1); assert.match(u.kej, /^G/);
  sumber.gempaterkini = {body: JSON.stringify({Infogempa: {gempa: [{DateTime: iso, Coordinates: "2.45,96.55", Magnitude: "6.0", Kedalaman: "28 km", Wilayah: "uji gabung belakangan", Potensi: "Berpotensi tsunami, status Waspada"}]}})};
  await tik(T5 + 1800e3);
  const rows = await baris("SELECT * FROM gempa WHERE usgs_id = 'us7000test'");
  assert.equal(rows.length, 1); assert.equal(rows[0].sumber, "gabung"); assert.ok(rows[0].id.startsWith("b:")); assert.equal(rows[0].m, 6.0);
  assert.equal(rows[0].potensi, 1); assert.equal(rows[0].kej, u.kej);
  assert.equal((await baris("SELECT utama_id FROM gempa_kejadian WHERE kode = ?", u.kej))[0].utama_id, rows[0].id);
});

uji("GET /api/gempa/terbaru: bentuk JSON, tsunami.kode null vs 0, tanpa kolom internal", async () => {
  const r = await api("/api/gempa/terbaru?jam=720");
  assert.equal(r.status, 200); assert.ok(r.j.n > 10 && r.j.n === r.j.gempa.length); assert.equal(r.j.jam, 720); assert.ok(Date.parse(r.j.dibuat));
  const bogor = r.j.gempa.find(x => x.id.endsWith("|-6.69,106.63"));
  assert.deepEqual(Object.keys(bogor).sort(), ["dalam", "dirasakan", "id", "kab", "kej", "lat", "lon", "m", "mmi_maks", "mtipe", "pager", "prov", "shakemap", "sumber", "tsunami", "waktu", "wilayah"]);
  assert.equal(bogor.tsunami.kode, null); assert.equal(bogor.shakemap, "https://cdn.bmkg.go.id/20261016102155.mmi.jpg"); assert.equal(bogor.waktu, "2026-10-16T03:21:55.000Z");
  assert.equal(r.j.gempa.find(x => x.wilayah.includes("POHUWATO")).tsunami.kode, 0);
  const urut = r.j.gempa.map(x => x.waktu); assert.deepEqual(urut, [...urut].sort().reverse());
  assert.ok(!r.teks.includes("diperbarui") && !r.teks.includes("potensi_teks"));
  assert.equal((await api("/api/gempa/terbaru?jam=24")).j.jam, 24); assert.equal((await api("/api/gempa/terbaru")).j.jam, 72);
  assert.equal((await api("/api/gempa/tidakada")).status, 404);
});

uji("GET /api/gempa/kejadian dan /kejadian/G0001 dan /status", async () => {
  const l = await api("/api/gempa/kejadian"); assert.equal(l.status, 200); assert.ok(l.j.kejadian.length >= 3);
  const k = l.j.kejadian.find(x => x.nama === "uji kejadian -3,100 M5.7");
  assert.deepEqual(Object.keys(k).sort(), ["akhir", "aktif", "aktif_hingga", "jumlah", "kode", "lat", "lon", "m", "mulai", "nama", "utama_id"]);
  assert.equal(k.jumlah, 3); assert.equal(k.aktif, false);
  const d = await api("/api/gempa/kejadian/" + k.kode); assert.equal(d.status, 200); assert.equal(d.j.gempa.length, 3); assert.equal(d.j.gempa[0].id, k.utama_id);
  assert.equal((await api("/api/gempa/kejadian/G9999")).status, 404); assert.equal((await api("/api/gempa/kejadian/x;drop")).status, 404);
  const s = await api("/api/gempa/status"); assert.equal(s.status, 200); assert.ok(s.j.n > 10); assert.equal(typeof s.j.sumber.autogempa.umur_detik, "number");
  assert.ok(!s.teks.includes("W/"), "ETag tidak dibocorkan");
});

test("uraiUSGS: magnitudo di luar CHECK dibuang, mtipe dipotong, pager hanya warna sah", () => {
  const f = (id, mag, extra = {}) => ({id, geometry: {coordinates: [110, -7, 10]}, properties: {mag, place: "5 km N of Solo, Indonesia", time: Date.now() - JAM, type: "earthquake", ...extra}});
  const u = uraiUSGS({features: [f("a", 11), f("b", -1), f("c", 5, {magType: "x".repeat(40), alert: "purple"}), f("d", 5.5, {alert: "red"})]});
  assert.equal(u.rusak, 2); assert.deepEqual(u.baris.map(b => b.usgs_id), ["c", "d"]);
  assert.equal(u.baris[0].mtipe.length, 10); assert.equal(u.baris[0].pager, null); assert.equal(u.baris[1].pager, "red");
});

uji("/api/gempa/*: selain GET/HEAD = 405, HEAD dilayani, jam tidak sah = 400", async () => {
  const p = await mf.dispatchFetch("http://gempa.lokal/api/gempa/terbaru", {method: "POST", body: "{}"});
  assert.equal(p.status, 405); assert.equal(p.headers.get("allow"), "GET, HEAD");
  assert.equal((await mf.dispatchFetch("http://gempa.lokal/api/gempa/kejadian", {method: "DELETE"})).status, 405);
  const h = await mf.dispatchFetch("http://gempa.lokal/api/gempa/terbaru?jam=24", {method: "HEAD"});
  assert.equal(h.status, 200); assert.equal(await h.text(), "");
  for (const j of ["abc", "5", "24x", "-24", ""]) assert.equal((await api("/api/gempa/terbaru?jam=" + j)).status, 400, "jam=" + j);
});

/* instance kedua: cache tepi AKTIF, DB belum bermigrasi (galat D1) lalu bermigrasi */
uji("/api/gempa/*: tabel belum ada = 503 (terbaru = kosong); kunci cache hanya pathname + jam sah", async () => {
  const mf2 = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-gempa-cache"}, bindings: {IP_SALT: "garam-uji"}, serviceBindings: {ASSETS: aset}, outboundService: luar});
  try {
    const get = async j => { const r = await mf2.dispatchFetch("http://gempa.lokal" + j); return {status: r.status, j: await r.json()}; };
    const k = await get("/api/gempa/kejadian"); assert.equal(k.status, 503); assert.deepEqual(k.j, {galat: "katalog gempa belum siap"});
    assert.equal((await get("/api/gempa/status")).status, 503);
    const t = await get("/api/gempa/terbaru"); assert.equal(t.status, 200); assert.equal(t.j.n, 0); assert.deepEqual(t.j.gempa, []);
    const D2 = await mf2.getD1Database("DB"); await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
    await D2.prepare("INSERT INTO gempa (id,t,lat,lon,m,sumber,diperbarui) VALUES ('b:x',?,-3,100,4.5,'bmkg',1)").bind(Date.now() - JAM).run();
    await get("/api/gempa/terbaru?jam=720");                                  // mengisi cache untuk kunci jam=720
    await D2.prepare("INSERT INTO gempa (id,t,lat,lon,m,sumber,diperbarui) VALUES ('b:y',?,-3,100.5,4.5,'bmkg',1)").bind(Date.now() - JAM).run();
    assert.equal((await get("/api/gempa/terbaru?jam=720&x=acak1")).j.n, 1, "parameter lain tidak membuat kunci cache baru");
    assert.equal((await get("/api/gempa/terbaru?x=acak2&jam=720")).j.n, 1);
    assert.equal((await get("/api/gempa/terbaru?jam=168")).j.n, 2, "jam lain = kunci lain");
  } finally { await mf2.dispose(); }
});
