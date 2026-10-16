/* Nowcast cuaca BMKG di Worker (src/nowcast.js) di workerd (Miniflare): D1 lokal dengan migrasi apa adanya, RSS + CAP dijawab fixture
   lewat outboundService, TANPA jaringan. Jalankan: node --test tests/warga/cuaca_nowcast.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: nowcast.js saling impor dengannya
import {uraiRSS, uraiCAP, bersih} from "../../src/nowcast.js";

const JAM = 3600e3, T10 = Math.floor(Date.now() / 600e3) * 600e3;
const iso = t => new Date(t).toISOString().replace(/\.\d+Z/, "+00:00");
const URL_CAP = id => `https://www.bmkg.go.id/alerts/nowcast/id/${id}_alert.xml`;
const POLI_JAMBI = "-1.9,103.1 -2.0,103.2 -2.1,103.1 -1.9,103.1";
const cap = ({id, selesai, event = "Hujan Lebat dan Petir", area = "Jambi", desk = "Hujan lebat akan terjadi di sebagian wilayah Jambi, khususnya di BATIN XXIV, MANDIANGIN.\n Kondisi ini berpotensi banjir lokal.", poli = POLI_JAMBI, web = "https://nowcasting.bmkg.go.id/x.jpg"}) =>
  `<?xml version="1.0" ?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>${id}</identifier><sent>${iso(T10 - 1800e3)}</sent><info><language>id</language>
<event>${event}</event><urgency>Immediate</urgency><severity>Moderate</severity><certainty>Observed</certainty><effective>${iso(T10 - 600e3)}</effective><expires>${iso(selesai)}</expires>
<headline>${event} di ${area}</headline><description>${desk}</description><web>${web}</web><area><areaDesc>${area}</areaDesc><polygon>${poli}</polygon></area></info></alert>`;
const rss = (ids, lastBuild = new Date(T10).toUTCString()) => `<?xml version="1.0"?><rss version="2.0"><channel><title>BMKG</title><link>https://www.bmkg.go.id/alerts/nowcast/id/rss.xml</link>
<lastBuildDate>${lastBuild}</lastBuildDate>${ids.map(i => `<item><title>t</title><link>${URL_CAP(i)}</link></item>`).join("")}</channel></rss>`;

test("uraiRSS: tautan CAP unik dan sah, terbit dari lastBuildDate channel; bukan RSS = lempar", () => {
  const r = uraiRSS(rss(["A1", "A1", "B2"]) .replace("</channel>", `<item><link>https://jahat.example/x_alert.xml</link></item></channel>`));
  assert.deepEqual(r.tautan, [URL_CAP("A1"), URL_CAP("B2")]);
  assert.equal(r.terbit, T10 - T10 % 1000);
  assert.throws(() => uraiRSS("<html>Just a moment...</html>"), /bukan RSS/);
  assert.deepEqual(uraiRSS(rss([])).tautan, []);
});

test("uraiCAP: bentuk sama dengan peringatan.py (wilayah dari 'khususnya di', poligon [lon,lat] 3 desimal, deskripsi kalimat pertama)", () => {
  const c = uraiCAP(cap({id: "CAP-X1", selesai: T10 + JAM}));
  assert.equal(c.t, T10 + JAM - (T10 + JAM) % 1000);
  assert.equal(c.p.id, "CAP-X1"); assert.equal(c.p.event, "Hujan Lebat dan Petir"); assert.equal(c.p.severity, "Moderate"); assert.equal(c.p.urgency, "Immediate");
  assert.equal(c.p.wilayah, "BATIN XXIV, MANDIANGIN"); assert.ok(c.p.deskripsi.endsWith("MANDIANGIN."));
  assert.deepEqual(c.p.polygon[0][0], [103.1, -1.9]); assert.equal(c.p.web, "https://nowcasting.bmkg.go.id/x.jpg");
  for (const k of ["id", "event", "severity", "urgency", "certainty", "mulai", "selesai", "wilayah", "headline", "deskripsi", "polygon", "web"]) assert.ok(k in c.p, k);
});

test("uraiCAP: tanpa 'khususnya di' wilayah = areaDesc; identifier/expires rusak = null; poligon di luar Indonesia dibuang; web bukan bmkg dibuang", () => {
  assert.equal(uraiCAP(cap({id: "CAP-X2", selesai: T10, desk: "Hujan lebat.", area: "Jambi"})).p.wilayah, "Jambi");
  assert.equal(uraiCAP(cap({id: "a b", selesai: T10})), null);
  assert.equal(uraiCAP(cap({id: "CAP-X3", selesai: T10}).replace(/<expires>.*<\/expires>/, "<expires>kemarin</expires>")), null);
  assert.equal(uraiCAP("<html/>"), null);
  assert.equal(uraiCAP(cap({id: "CAP-X4", selesai: T10, poli: "40.0,10.0 41.0,10.0 41.0,11.0"})).p.polygon, null);
  assert.equal(uraiCAP(cap({id: "CAP-X5", selesai: T10, web: "https://jahat.example/x"})).p.web, null);
});

test("bersih/uraiCAP meloloskan teks luar dengan aman: tag, entitas ter-escape, kontrol, CDATA dibuang; panjang dipotong", () => {
  assert.equal(bersih("a &lt;script&gt;x&lt;/script&gt; <b>b</b>\u0001 &amp; <![CDATA[c<d]]>", 100), "a x b cd");
  assert.ok(!/[<>&]/.test(bersih("&#60;img src=x onerror=1&#62; &amp;amp;", 100)));
  const c = uraiCAP(cap({id: "CAP-X6", selesai: T10, event: "&lt;img src=x onerror=alert(1)&gt;" + "E".repeat(500), desk: "Z".repeat(5000) + ". "}));
  assert.ok(!/[<>]/.test(c.p.event) && c.p.event.length <= 80); assert.ok(c.p.deskripsi.length <= 240);
});

let mf, worker, DB;
let rssIsi = null, rssStatus = 200, unduhan = [];   // kendali fixture
const caps = {};
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname !== "www.bmkg.go.id") return new Response("diblok di uji", {status: 599});
  unduhan.push(u.pathname);
  if (u.pathname === "/alerts/nowcast/id") return new Response(rssStatus === 200 ? rssIsi : "gagal", {status: rssStatus});
  const id = u.pathname.split("/").pop().replace("_alert.xml", "");
  return caps[id] ? new Response(caps[id]) : new Response("tidak ada", {status: 404});
};
const aset = async req => {
  const f = path.join(AKAR, "public", decodeURIComponent(new URL(req.url).pathname));
  return existsSync(f) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-nowcast"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"}, serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});
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
const api = async (j, init) => { const r = await mf.dispatchFetch("http://nowcast.lokal" + j, init); const teks = await r.text(); let x = null; try { x = JSON.parse(teks); } catch (e) {} return {status: r.status, j: x, h: r.headers}; };

uji("migrasi 0014 cuaca_nowcast idempoten: dijalankan dua kali tidak galat", async () => {
  const sql = pecah(migrasi()).filter(s => /cuaca_(nowcast|sumber)/.test(s));
  assert.ok(sql.length >= 4);
  await DB.batch(sql.map(s => DB.prepare(s)));
});

uji("cron menit bukan kelipatan 10 tidak menarik BMKG sama sekali", async () => {
  rssIsi = rss(["AKTIF1"]); unduhan = [];
  await tik(T10 + 300e3);
  assert.deepEqual(unduhan.filter(p => p.startsWith("/alerts/nowcast")), []);
  assert.equal((await baris("SELECT count(*) n FROM cuaca_sumber"))[0].n, 0);
});

uji("GET sebelum ada putaran: dibuat null, nowcast kosong (tidak mengarang)", async () => {
  const r = await api("/api/cuaca/nowcast");
  assert.equal(r.status, 200); assert.equal(r.j.dibuat, null); assert.deepEqual(r.j.nowcast, []);
});

uji("kelipatan 10: RSS + CAP baru diurai dan disimpan; API memberi bentuk peringatan.json + dibuat/terbit; kedaluwarsa tersaring", async () => {
  caps.AKTIF1 = cap({id: "AKTIF1", selesai: T10 + 2 * JAM});
  caps.AKTIF2 = cap({id: "AKTIF2", selesai: T10 + JAM, event: "Hujan Petir", area: "Jambi"});
  caps.LEWAT1 = cap({id: "LEWAT1", selesai: T10 - JAM});
  rssIsi = rss(["AKTIF1", "AKTIF2", "LEWAT1", "RUSAK1"]); caps.RUSAK1 = "<html>bukan CAP</html>"; unduhan = [];
  await tik(T10);
  assert.equal(unduhan.length, 5, "1 RSS + 4 CAP");
  assert.equal((await baris("SELECT count(*) n FROM cuaca_nowcast"))[0].n, 3, "RUSAK1 dilewati");
  const r = await api("/api/cuaca/nowcast");
  assert.equal(r.status, 200); assert.match(r.h.get("cache-control"), /public, max-age=60/);
  assert.equal(r.j.dibuat, new Date(T10).toISOString()); assert.equal(r.j.terbit, new Date(T10 - T10 % 1000).toISOString());
  assert.deepEqual(r.j.nowcast.map(a => a.id).sort(), ["AKTIF1", "AKTIF2"], "LEWAT1 sudah selesai: tidak ikut");
  const a = r.j.nowcast.find(x => x.id === "AKTIF1");
  assert.equal(a.aktif, true); assert.deepEqual(a.prov, ["15"]); assert.equal(a.wilayah, "BATIN XXIV, MANDIANGIN"); assert.equal(a.url, URL_CAP("AKTIF1"));
  for (const k of ["id", "event", "severity", "urgency", "certainty", "mulai", "selesai", "aktif", "wilayah", "headline", "deskripsi", "prov", "polygon", "web"]) assert.ok(k in a, k);
});

uji("putaran ulang idempoten: CAP yang sudah ada tidak diunduh lagi, baris tidak berlipat, stempel maju", async () => {
  const sebelum = (await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'nowcast'"))[0].dibuat; unduhan = [];
  await tik(T10 + 600e3);
  assert.deepEqual(unduhan.filter(p => p.endsWith("_alert.xml") && !/RUSAK1|LEWAT1/.test(p)), [], "AKTIF1/2 tidak diunduh ulang");
  assert.equal((await baris("SELECT count(*) n FROM cuaca_nowcast WHERE id IN ('AKTIF1','AKTIF2')"))[0].n, 2);
  assert.ok((await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'nowcast'"))[0].dibuat > sebelum);
});

uji("upsert: id sama dengan isi baru menimpa satu baris", async () => {
  caps.AKTIF1B = cap({id: "AKTIF1", selesai: T10 + 3 * JAM, event: "Hujan Sangat Lebat"});
  rssIsi = rss(["AKTIF1B"]); await tik(T10 + 1200e3);
  const r = await baris("SELECT isi, selesai FROM cuaca_nowcast WHERE id = 'AKTIF1'");
  assert.equal(r.length, 1); assert.equal(JSON.parse(r[0].isi).event, "Hujan Sangat Lebat");
});

uji("gagal-lunak: BMKG 500 atau halaman bukan RSS = data terakhir utuh dengan stempel aslinya", async () => {
  rssStatus = 500; await tik(T10 + 1800e3);
  rssStatus = 200; rssIsi = "<html>Just a moment...</html>"; await tik(T10 + 2400e3);
  const s1 = (await api("/api/cuaca/nowcast")).j;
  assert.equal(s1.dibuat, new Date(T10 + 1200e3).toISOString(), "stempel = putaran sehat terakhir, bukan waktu gagal");
  assert.deepEqual(s1.nowcast.map(a => a.id).sort(), ["AKTIF1", "AKTIF2"]);
  assert.equal((await baris("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'nowcast'"))[0].dibuat, T10 + 1200e3, "stempel tidak maju saat gagal");
});

uji("teks BMKG berbahaya tersimpan sebagai teks polos terpotong", async () => {
  caps.XSS1 = cap({id: "XSS1", selesai: T10 + JAM, event: "&lt;script&gt;alert(1)&lt;/script&gt;", desk: "<img src=x onerror=alert(1)>Awas. Lanjut."});
  rssIsi = rss(["XSS1"]); await tik(T10 + 3000e3);
  const a = (await api("/api/cuaca/nowcast")).j.nowcast.find(x => x.id === "XSS1");
  assert.ok(a); assert.ok(!/[<>]/.test(JSON.stringify(a)), JSON.stringify(a));
});

uji("GET/HEAD saja: POST 405; HEAD tanpa badan", async () => {
  const p = await mf.dispatchFetch("http://nowcast.lokal/api/cuaca/nowcast", {method: "POST", body: "{}"});
  assert.equal(p.status, 405); assert.match(p.headers.get("allow"), /GET/);
  const h = await mf.dispatchFetch("http://nowcast.lokal/api/cuaca/nowcast", {method: "HEAD"});
  assert.equal(h.status, 200); assert.equal(await h.text(), "");
});

uji("/api/status melaporkan cuaca_nowcast di `uji` dengan ambang 1 jam", async () => {
  const r = await api("/api/status");
  assert.equal(r.j.uji.cuaca_nowcast.ambang_jam, 1); assert.ok(r.j.uji.cuaca_nowcast.dibuat);
});

uji("tabel hilang (migrasi 0014 belum jalan): GET 503 bukan 500, cron tidak melempar", async () => {
  await DB.batch([DB.prepare("DROP TABLE cuaca_nowcast"), DB.prepare("DROP TABLE cuaca_sumber")]);
  const r = await api("/api/cuaca/nowcast"); assert.equal(r.status, 503);
  await tik(T10 + 3600e3);
  const s = await api("/api/status"); assert.equal(s.j.uji.cuaca_nowcast.dibuat, null);
});
