/* Kurasi media sosial: src/sosmed.js di workerd (Miniflare) dengan D1 lokal sungguhan, migrasi apa adanya.
   oEmbed X dijawab fixture lewat outboundService (workerd tidak memakai globalThis.fetch Node). Jalankan: node --test tests/warga/sosmed.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: sosmed.js dan worker.js saling impor
import {uraiSosmed} from "../../src/sosmed.js";

const ADMIN = {"x-admin-token": "rahasia-admin"};
const aset = async req => {
  const f = path.join(AKAR, "public", decodeURIComponent(new URL(req.url).pathname));
  return existsSync(f) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
let oembed = {status: 200, body: null}, panggilanOembed = [];
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname !== "publish.twitter.com") return new Response("diblok di uji", {status: 599});
  panggilanOembed.push(u.searchParams.get("url"));
  return new Response(oembed.body && JSON.stringify(oembed.body), {status: oembed.status, headers: {"content-type": "application/json"}});
};
let mf, DB;
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-sosmed"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"},
    serviceBindings: {ASSETS: aset}, outboundService: luar, cache: false});
  DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});
const api = async (metode, j, body, h = {}) => {
  const r = await mf.dispatchFetch("http://sosmed.lokal" + j, {method: metode, headers: {"content-type": "application/json", ...h}, body: body ? JSON.stringify(body) : undefined});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
  return {s: r.status, j: x, t, h: r.headers};
};
const IG = "https://www.instagram.com/reel/Cabc123xyz/?igsh=zzz#frag", THR = "https://www.threads.net/@pantau.bencana/post/C8abcDEF123?x=1", X = "https://twitter.com/BNPB_Indonesia/status/1850000000000000001?s=20";

uji("uraiSosmed: tiap platform dinormalkan, query dan fragmen dibuang", () => {
  assert.deepEqual(uraiSosmed(IG), {platform: "instagram", kode: "Cabc123xyz", akun: null, url: "https://www.instagram.com/p/Cabc123xyz/", embed: "https://www.instagram.com/p/Cabc123xyz/embed/captioned/"});
  assert.deepEqual(uraiSosmed(X), {platform: "x", kode: "1850000000000000001", akun: "@BNPB_Indonesia", url: "https://x.com/BNPB_Indonesia/status/1850000000000000001",
    embed: "https://platform.twitter.com/embed/Tweet.html?id=1850000000000000001&dnt=true&lang=id"});
  assert.deepEqual(uraiSosmed(THR), {platform: "threads", kode: "C8abcDEF123", akun: "@pantau.bencana", url: "https://www.threads.com/@pantau.bencana/post/C8abcDEF123",
    embed: "https://www.threads.com/@pantau.bencana/post/C8abcDEF123/embed"});
  assert.equal(uraiSosmed("https://mobile.twitter.com/a/status/12345")?.url, "https://x.com/a/status/12345");
  assert.equal(uraiSosmed("https://instagram.com/p/AbCdE/")?.kode, "AbCdE");
});

uji("uraiSosmed: URL salah DITOLAK (http, host lain, jalur lain, skema berbahaya, kredensial)", () => {
  for (const u of ["http://x.com/a/status/12345", "https://evil.com/a/status/12345", "https://x.com.evil.com/a/status/12345", "https://x.com/a/likes", "https://x.com/a/status/12",
    "https://instagram.com/stories/abc/123", "https://instagram.com/p/ab/", "https://threads.net/a/post/ABCDE", "javascript:alert(1)", "data:text/html,x", "ftp://x.com/a/status/12345",
    "https://u:p@x.com/a/status/12345", "https://x.com:8443/a/status/12345", "bukan url", "", null, undefined, 42])
    assert.equal(uraiSosmed(u), null, String(u));
});

uji("POST /api/sosmed: tanpa admin atau token salah 403, tidak ada baris tertulis", async () => {
  assert.equal((await api("POST", "/api/sosmed", {url: IG})).s, 403);
  assert.equal((await api("POST", "/api/sosmed", {url: IG}, {"x-admin-token": "salah"})).s, 403);
  assert.equal((await api("GET", "/api/sosmed/admin")).s, 403);
  assert.equal((await api("POST", "/api/sosmed/0123456789abcdef", {tampil: 0})).s, 403);
  assert.equal((await DB.prepare("SELECT count(*) n FROM sosmed").first()).n, 0);
});

uji("POST /api/sosmed: isian salah DITOLAK 400", async () => {
  for (const b of [{}, {url: "https://evil.com/a/status/12345"}, {url: IG, teks: "x".repeat(501)}, {url: IG, prov: "1"}, {url: IG, prov: "abc"}, {url: IG, bencana: "Karhutla!"}, {url: IG, akun: 5},
    {url: IG, akun: "a".repeat(40)}, {url: IG, akun: "a".repeat(31)}, {url: IG, akun: "bad name"}, {url: IG, akun: "@"}, {url: IG, akun: "<b>x</b>"},
    {url: IG, prov: 62}, {url: IG, prov: ["62"]}, {url: IG, prov: {}}, {url: IG, teks: 5}]) {
    const r = await api("POST", "/api/sosmed", b, ADMIN);
    assert.equal(r.s, 400, JSON.stringify(b) + " -> " + r.t); assert.ok(r.j.galat);
  }
  assert.equal((await DB.prepare("SELECT count(*) n FROM sosmed").first()).n, 0);
});

uji("POST sah 201 lalu GET publik memuatnya tanpa kolom internal; dobel 409", async () => {
  const r = await api("POST", "/api/sosmed", {url: IG, teks: "Asap tebal di Kapuas", akun: "kapuas_info", prov: "62"}, ADMIN);
  assert.equal(r.s, 201, r.t);
  assert.match(r.j.post.id, /^[0-9a-f]{16}$/); assert.equal(r.j.post.url, "https://www.instagram.com/p/Cabc123xyz/"); assert.equal(r.j.post.akun, "@kapuas_info");
  const g = await api("GET", "/api/sosmed?bencana=karhutla");
  assert.equal(g.s, 200); assert.equal(g.h.get("cache-control"), "public, max-age=120");
  assert.equal(g.j.post.length, 1);
  assert.deepEqual(Object.keys(g.j.post[0]).sort(), ["akun", "dibuat", "embed", "id", "platform", "prov", "teks", "url"]);
  assert.equal(g.j.post[0].embed, "https://www.instagram.com/p/Cabc123xyz/embed/captioned/"); assert.equal(g.j.post[0].prov, "62");
  assert.equal((await api("POST", "/api/sosmed", {url: "https://instagram.com/p/Cabc123xyz/?lain=1"}, ADMIN)).s, 409, "URL kanonik sama");
  assert.equal((await DB.prepare("SELECT count(*) n FROM sosmed").first()).n, 1);
  assert.equal((await api("GET", "/api/sosmed?bencana=banjir")).j.post.length, 0, "bencana lain terpisah");
  assert.equal((await api("GET", "/api/sosmed?bencana=BAD1")).s, 400);
});

uji("teks dan akun admin: karakter kontrol/bidi dibuang; akun 30 karakter lolos tanpa 500", async () => {
  const r = await api("POST", "/api/sosmed", {url: "https://x.com/dd/status/55555", teks: "a‮b\u0000c​d", akun: "x".repeat(30)}, ADMIN);
  assert.equal(r.s, 201, r.t); assert.equal(r.j.post.teks, "abcd"); assert.equal(r.j.post.akun, "@" + "x".repeat(30));
});

uji("GET /api/sosmed: parameter lain tidak memecah kunci cache (cache tepi nyala)", async () => {
  const m2 = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-sosmed"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin"}, serviceBindings: {ASSETS: aset}, cache: true});
  try {
    const ambil = async q => (await (await m2.dispatchFetch("http://sosmed.lokal/api/sosmed" + q)).json()).post.length;
    const n = await ambil("?bencana=karhutla&a=1");
    await DB.prepare("DELETE FROM sosmed WHERE url LIKE '%dd/status%'").run();
    assert.equal(await ambil("?bencana=karhutla&b=2"), n, "kunci cache sama walau query lain berbeda");
  } finally { await m2.dispose(); }
});

uji("X tanpa teks: oEmbed mengisi akun dan teks (tag dibuang, entitas didekode, maks 500); gagal oEmbed tetap tersimpan", async () => {
  oembed = {status: 200, body: {author_name: "BNPB Indonesia", html: '<blockquote class="twitter-tweet"><p lang="in" dir="ltr">Banjir &amp; longsor &lt;Cianjur&gt;<br>cek <a href="https://t.co/x">pic.twitter.com/x</a> &#39;ok&#39;</p>&mdash; BNPB (@BNPB_Indonesia) <a href="https://x.com/BNPB_Indonesia/status/1850000000000000001">Oct 1</a></blockquote>'}};
  panggilanOembed = [];
  const r = await api("POST", "/api/sosmed", {url: X}, ADMIN);
  assert.equal(r.s, 201, r.t);
  assert.deepEqual(panggilanOembed, ["https://x.com/BNPB_Indonesia/status/1850000000000000001"]);
  assert.equal(r.j.post.teks, "Banjir & longsor <Cianjur> cek pic.twitter.com/x 'ok'");
  /* akun dari URL (@BNPB_Indonesia) sudah terisi, jadi author_name oEmbed tidak menimpanya */
  assert.equal(r.j.post.akun, "@BNPB_Indonesia");
  oembed = {status: 200, body: {author_name: "A", html: "<p>" + "z".repeat(900) + "</p>"}};
  const p = await api("POST", "/api/sosmed", {url: "https://x.com/aa/status/22222"}, ADMIN);
  assert.equal(p.j.post.teks.length, 500);
  oembed = {status: 500, body: null};
  const g = await api("POST", "/api/sosmed", {url: "https://x.com/bb/status/33333"}, ADMIN);
  assert.equal(g.s, 201); assert.equal(g.j.post.teks, null); assert.equal(g.j.post.akun, "@bb");
  panggilanOembed = [];
  await api("POST", "/api/sosmed", {url: "https://x.com/cc/status/44444", teks: "dari admin", akun: "@cc"}, ADMIN);
  assert.deepEqual(panggilanOembed, [], "teks diisi admin: tidak memanggil oEmbed");
  await api("POST", "/api/sosmed", {url: THR}, ADMIN);
  assert.deepEqual(panggilanOembed, [], "platform lain tidak memanggil oEmbed");
});

uji("sembunyikan: hilang dari GET publik tapi tetap di daftar admin; tampilkan mengembalikan; id tak dikenal 404; nilai salah 400", async () => {
  const semua = (await api("GET", "/api/sosmed/admin", null, ADMIN)).j.post;
  assert.ok(semua.length >= 5); assert.ok(semua.every(p => p.tampil === 1 && "oleh" in p && "bencana" in p));
  const ig = semua.find(p => p.platform === "instagram");
  assert.equal((await api("POST", "/api/sosmed/" + ig.id, {tampil: 2}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/sosmed/" + ig.id, {}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/sosmed/ffffffffffffffff", {tampil: 0}, ADMIN)).s, 404);
  assert.equal((await api("POST", "/api/sosmed/" + ig.id, {tampil: 0}, ADMIN)).s, 200);
  assert.ok(!(await api("GET", "/api/sosmed")).j.post.some(p => p.id === ig.id));
  assert.equal((await api("GET", "/api/sosmed/admin", null, ADMIN)).j.post.find(p => p.id === ig.id).tampil, 0);
  await api("POST", "/api/sosmed/" + ig.id, {tampil: 1}, ADMIN);
  assert.ok((await api("GET", "/api/sosmed")).j.post.some(p => p.id === ig.id));
  const urut = (await api("GET", "/api/sosmed")).j.post.map(p => p.dibuat);
  assert.deepEqual(urut, [...urut].sort((a, b) => b - a), "terbaru dulu");
});

uji("migrasi 0012 sosmed idempoten dan CHECK menolak baris salah langsung di D1", async () => {
  await DB.batch(pecah(migrasi()).filter(s => /sosmed/.test(s)).map(s => DB.prepare(s)));
  const ins = (...v) => DB.prepare("INSERT INTO sosmed (id, platform, kode, url, prov, tampil, dibuat) VALUES (?, ?, 'kode1', ?, ?, ?, 1)").bind(...v).run();
  await assert.rejects(ins("0123456789abcdef", "facebook", "https://a/1", null, 1), /CHECK/i);
  await assert.rejects(ins("0123456789abcdef", "x", "http://a/1", null, 1), /CHECK/i);
  await assert.rejects(ins("0123456789abcdef", "x", "https://a/1", "1a", 1), /CHECK/i);
  await assert.rejects(ins("0123456789abcdef", "x", "https://a/1", null, 5), /CHECK/i);
});

uji("GET /admin/sosmed: tanpa sesi dialihkan ke masuk, dengan token memuat halaman dan skrip", async () => {
  const r = await mf.dispatchFetch("http://sosmed.lokal/admin/sosmed", {redirect: "manual"});
  assert.equal(r.status, 303); assert.match(r.headers.get("location"), /\/admin\/masuk/);
  const ok = await mf.dispatchFetch("http://sosmed.lokal/admin/sosmed", {headers: ADMIN}), t = await ok.text();
  assert.equal(ok.status, 200); assert.ok(t.includes("/admin/sosmed.js")); assert.ok(existsSync(path.join(AKAR, "public/admin/sosmed.js")));
  assert.match(ok.headers.get("content-security-policy"), /script-src 'self'/);
});
