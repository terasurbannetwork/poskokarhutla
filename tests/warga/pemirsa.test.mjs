/* Akun pemirsa (src/pemirsa.js, migrations/0036_pemirsa.sql): hanya melihat tab tertentu situs Centurisk97. Worker utuh di workerd + D1 sungguhan (TEST.md: tanpa mock).
   Jalankan: node --test tests/warga/pemirsa.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {siapkan, berantai, ADMIN, MOD2} from "./_bnpb.mjs";
import {AKAR, pecah} from "./_bantu.mjs";
import "../../src/worker.js";
import {TAB, arahPemirsa, cekTab} from "../../src/pemirsa.js";

const uji = berantai();
const U = await siapkan("uji-pemirsa");
const {DB, api, n, mf} = U;
const SQL = readFileSync(path.join(AKAR, "migrations/0036_pemirsa.sql"), "utf8");
let ipN = 0;
/* permintaan ke alamat terkunci centurisk97.id, tanpa mengikuti pengalihan */
const situs = (j, h = {}, init = {}) => mf.dispatchFetch("https://centurisk97.id" + j, {redirect: "manual", ...init, headers: {"cf-connecting-ip": `198.51.100.${++ipN % 250}`, ...h}});
const masuk = (user, sandi, ke = "") => situs("/admin/masuk" + (ke ? "?ke=" + encodeURIComponent(ke) : ""), {"content-type": "application/x-www-form-urlencoded", origin: "https://centurisk97.id"},
  {method: "POST", body: new URLSearchParams({email: user, sandi}).toString()});
const kuki = r => r.headers.getSetCookie().find(c => c.startsWith("sesi_pemirsa="))?.split(";")[0];
let A = null, cookie = null;

uji("pemirsa: migrasi 0036 idempoten dan trigger menolak tab asing atau berulang", async () => {
  await DB.batch(pecah(SQL).map(s => DB.prepare(s)));   // dijalankan kedua kalinya
  const sisip = tab => DB.prepare("INSERT INTO pemirsa (id, username, nama, tab, garam, sandi_sha, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind("f".repeat(16), "lihatuji", "Uji", tab, "a".repeat(32), "0".repeat(64), Date.now()).run();
  await assert.rejects(sisip('["berita","admin"]'), /tab pemirsa tidak sah/);
  await assert.rejects(sisip('["berita","berita"]'), /tab pemirsa tidak sah/);
  assert.equal(await n("pemirsa"), 0);
});

uji("pemirsa: daftar tab sama dengan trigger 0036 dan tab menu public/index.html", () => {
  const diTrigger = SQL.match(/NOT IN \(([^)]+)\)/)[1].split(",").map(x => x.trim().replace(/'/g, ""));
  assert.deepEqual(diTrigger, Object.keys(TAB));
  const idx = readFileSync(path.join(AKAR, "public/index.html"), "utf8"), tabs = idx.match(/const TABS = (\[.+\]);/)[1];
  for (const k of Object.keys(TAB)) assert.ok(tabs.includes(`["${k}", "${TAB[k]}"]`), `tab ${k} ada di index.html dengan label ${TAB[k]}`);
  assert.equal(cekTab(["berita", "berita"]), null); assert.equal(cekTab([]), null); assert.deepEqual(cekTab(["foto"]), ["foto"]);
  assert.equal(arahPemirsa({tab: ["insight"]}, "/kompleks"), null); assert.equal(arahPemirsa({tab: ["sim"]}, "/sim/K0001"), null); assert.equal(arahPemirsa({tab: ["berita"]}, "/"), "/berita");
});

uji("pemirsa: hanya Super Admin membuat dan melihat daftar; isian salah 400", async () => {
  assert.equal((await api("POST", "/api/pemirsa/admin/buat", {nama: "Wartawan", tab: ["berita"]}, MOD2)).s, 403);
  assert.equal((await api("GET", "/api/pemirsa/admin/daftar", undefined, MOD2)).s, 403);
  assert.equal((await api("POST", "/api/pemirsa/admin/buat", {nama: "Wartawan", tab: []}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/pemirsa/admin/buat", {nama: "Wartawan", tab: ["admin"]}, ADMIN)).s, 400);
  assert.equal((await api("POST", "/api/pemirsa/admin/buat", {nama: "", tab: ["berita"]}, ADMIN)).s, 400);
  const r = await api("POST", "/api/pemirsa/admin/buat", {nama: "Wartawan Uji", tab: ["berita"]}, ADMIN);
  assert.equal(r.s, 201, r.t); assert.match(r.j.username, /^lihatwartawan\d{3}$/); assert.equal(r.j.sandi.length, 16);
  A = {id: r.j.pemirsa.id, username: r.j.username, sandi: r.j.sandi};
  const d = await api("GET", "/api/pemirsa/admin/daftar", undefined, ADMIN);
  assert.equal(d.s, 200); assert.deepEqual(d.j.pemirsa.map(p => p.tab), [["berita"]]); assert.ok(!("sandi_sha" in d.j.pemirsa[0]) && !("garam" in d.j.pemirsa[0]));
});

uji("pemirsa: masuk lewat form login yang sama, diarahkan ke tab miliknya; sandi salah 401", async () => {
  assert.equal((await masuk(A.username, "salah-sekali")).status, 401);
  const r = await masuk(A.username, A.sandi, "/peta");
  assert.equal(r.status, 303); assert.equal(r.headers.get("location"), "/berita", "ke= tab lain diabaikan");
  cookie = kuki(r); assert.ok(cookie, "cookie sesi_pemirsa terpasang");
  assert.ok(r.headers.getSetCookie().some(c => /^sesi_admin=;.*Max-Age=0/.test(c)), "sesi admin di peramban ini dihapus");
  assert.equal(await n("pemirsa_sesi"), 1);
  for (const ke of ["//evil.com", "/\\evil.com", "/\t/evil.com"]) {   // open redirect lewat ?ke= sesudah masuk admin
    const a = await masuk("gerbang@x", "sandi", ke); assert.equal(a.status, 303, ke); assert.equal(a.headers.get("location"), "/admin/statistik", ke);
  }
  const h = await situs("/berita", {cookie: kuki(r)}, {method: "HEAD"}); assert.equal(h.status, 200, "HEAD tab miliknya");
  assert.equal((await situs("/peta", {cookie: kuki(r)}, {method: "HEAD"})).headers.get("location"), "/berita", "HEAD tab lain dialihkan");
});

uji("pemirsa: tab miliknya terbuka dengan data-pemirsa-tab dan no-store; tab dan halaman lain dialihkan", async () => {
  const b = await situs("/berita", {cookie});
  assert.equal(b.status, 200); const t = await b.text();
  assert.match(t.match(/<html[^>]*>/)[0], /data-pemirsa-tab="berita"/); assert.match(b.headers.get("cache-control"), /no-store/);
  for (const j of ["/", "/peta", "/insight", "/sim/K0001", "/laporan", "/banjir"]) {
    const r = await situs(j, {cookie}); assert.equal(r.status, 303, j); assert.equal(r.headers.get("location"), "/berita", j);
  }
  const dok = await situs("/api", {cookie}); assert.equal(dok.status, 200, "pemirsa boleh membaca dokumentasi /api"); assert.match(dok.headers.get("cache-control"), /no-store/); await dok.arrayBuffer();
  const ad = await situs("/admin/statistik", {cookie}); assert.equal(ad.status, 303); assert.match(ad.headers.get("location"), /^\/admin\/masuk/);
  assert.equal((await api("GET", "/api/pemirsa/admin/daftar", undefined, {cookie})).s, 403, "pemirsa bukan admin");
  const tanpa = await situs("/berita"); assert.equal(tanpa.status, 303); assert.match(tanpa.headers.get("location"), /^\/admin\/masuk/);
  const adm = await situs("/peta", ADMIN); assert.equal(adm.status, 200); assert.doesNotMatch((await adm.text()).match(/<html[^>]*>/)[0], /data-pemirsa-tab/, "admin tidak dibatasi");
});

uji("pemirsa: ubah tab berlaku untuk sesi yang hidup; cabut mengakhiri sesi; keluar menghapus sesi", async () => {
  assert.equal((await api("POST", `/api/pemirsa/admin/${A.id}`, {aksi: "ubah", tab: ["foto", "berita"]}, ADMIN)).s, 200);
  assert.equal((await situs("/foto", {cookie})).status, 200);
  assert.equal((await situs("/peta", {cookie})).headers.get("location"), "/foto");
  const k = await situs("/admin/keluar", {cookie, origin: "https://centurisk97.id"}, {method: "POST"});
  assert.equal(k.status, 303); assert.ok(k.headers.getSetCookie().some(c => /^sesi_pemirsa=;.*Max-Age=0/.test(c)));
  assert.equal(await n("pemirsa_sesi"), 0);
  cookie = kuki(await masuk(A.username, A.sandi));
  const rs = await api("POST", `/api/pemirsa/admin/${A.id}`, {aksi: "reset"}, ADMIN); assert.equal(rs.s, 200);
  assert.equal((await situs("/berita", {cookie})).status, 303, "reset mencabut sesi");
  assert.equal((await masuk(A.username, A.sandi)).status, 401, "sandi lama mati");
  cookie = kuki(await masuk(A.username, rs.j.sandi));
  assert.equal((await api("POST", `/api/pemirsa/admin/${A.id}`, {aksi: "cabut"}, ADMIN)).s, 200);
  assert.match((await situs("/berita", {cookie})).headers.get("location"), /^\/admin\/masuk/);
  assert.equal((await masuk(A.username, rs.j.sandi)).status, 401, "akun dicabut tidak bisa masuk");
  assert.equal((await api("POST", `/api/pemirsa/admin/${A.id}`, {aksi: "ubah", tab: ["peta"]}, ADMIN)).s, 409);
});

uji("sandi awal pilihan Super Admin: buat dan reset memakai sandi itu; isian salah ditolak tanpa menulis; kosong tetap acak", async () => {
  const awal = await n("pemirsa");
  for (const sandi of ["pendek7", "x".repeat(65), " berspasi1", "berspasi1 ", 12345678])
    assert.equal((await api("POST", "/api/pemirsa/admin/buat", {nama: "Tamu Sandi", tab: ["peta"], sandi}, ADMIN)).s, 400, `sandi ${JSON.stringify(sandi)}`);
  assert.equal(await n("pemirsa"), awal, "isian salah tidak membuat akun");
  const r = await api("POST", "/api/pemirsa/admin/buat", {nama: "Tamu Sandi", tab: ["peta"], sandi: "Kolteguh#2026"}, ADMIN);
  assert.equal(r.s, 201); assert.equal(r.j.sandi, "Kolteguh#2026");
  assert.equal((await masuk(r.j.username, "Kolteguh#2026")).status, 303, "masuk dengan sandi awal");
  const id = r.j.pemirsa.id;
  assert.equal((await api("POST", `/api/pemirsa/admin/${id}`, {aksi: "reset", sandi: "pendek"}, ADMIN)).s, 400);
  assert.equal((await masuk(r.j.username, "Kolteguh#2026")).status, 303, "reset yang ditolak tidak mengubah sandi");
  const rs = await api("POST", `/api/pemirsa/admin/${id}`, {aksi: "reset", sandi: "SandiBaru-2026"}, ADMIN);
  assert.equal(rs.s, 200); assert.equal(rs.j.sandi, "SandiBaru-2026");
  assert.equal((await masuk(r.j.username, "Kolteguh#2026")).status, 401, "sandi lama mati");
  assert.equal((await masuk(r.j.username, "SandiBaru-2026")).status, 303);
  const acak = await api("POST", `/api/pemirsa/admin/${id}`, {aksi: "reset", sandi: ""}, ADMIN);
  assert.equal(acak.s, 200); assert.notEqual(acak.j.sandi, "SandiBaru-2026"); assert.ok(acak.j.sandi.length >= 12, "kosong = sandi acak");
  assert.equal((await api("POST", "/api/pemirsa/admin/buat", {nama: "Tamu Sandi", tab: ["peta"], sandi: "Kolteguh#2026"}, MOD2)).s, 403, "moderator biasa tetap ditolak");
});
