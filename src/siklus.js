/* Siklus Bencana: cangkang rute, gerbang peran, halaman, aset berkunci. Skema migrations/0120_sk_kejadian.sql; rancangan data/kajian-bnpb/siklus/DESAIN-TEKNIS.md (2, 4, 7), KEAMANAN-PRIVASI.md.
   TIDAK menyentuh env.DB: semua SQL sk_* ada di bagian Siklus src/hak.js (gerbang tests/agen/gerbang-d1.test.mjs). Rute fitur ada di src/siklus_kejadian.js (RUTE_SIKLUS).
   Urutan penjaga rute API: rute dikenal (404/405) -> POST: x-pb dan Origin (403) -> gerbang peran (401 tanpa sesi, 403 peran) -> handler (badan, validasi, laju, D1).
   Pelaku: STAF = moderator ke atas atau sesi staf pusdalops|koordalops|pimpinan; BP = akun BPBD lewat /api/instansi/siklus/* (cookie berpath /api/instansi); SA = Super Admin. Tanpa peran baru.
   Dipanggil src/worker.js SEBELUM gerbang host centurisk97.id (pola layaniKm): /siklus, /siklus/*, /api/siklus/*, /api/instansi/siklus/*. env.SIKLUS_MATI = "1" mematikan semuanya (503). */
import {gagal, tolakOrigin} from "./worker.js";
import {modOK, superOK} from "./posko.js";
import {stafSesi} from "./staf.js";
import {akunAktif, jsonAman} from "./instansi.js";
import {CSP} from "./bnpb.js";
import {Galat, pelakuAdmin, pelakuSkStaf, pelakuSkInstansi} from "./hak.js";
import {RUTE_SIKLUS as RUTE_KEJADIAN} from "./siklus_kejadian.js";
import {RUTE_SIKLUS_PAPARAN} from "./siklus_paparan.js";
import {RUTE_SIKLUS_KAJI} from "./siklus_kaji.js";
import {RUTE_SIKLUS_PULIH} from "./siklus_pulih.js";
import {RUTE_SIKLUS_DUMMY} from "./siklus_dummy.js";
const RUTE_SIKLUS = {...RUTE_KEJADIAN, ...RUTE_SIKLUS_PAPARAN, ...RUTE_SIKLUS_KAJI, ...RUTE_SIKLUS_PULIH, ...RUTE_SIKLUS_DUMMY};

const JENIS_BPBD = ["pemprov", "pemkab", "pemkot"], PERAN_STAF = ["pusdalops", "koordalops", "pimpinan"];
const ID_KJ = "KJ-\\d{4}-[0-9A-HJKMNP-TV-Z]{8}", ID16 = "[0-9a-f]{16}", POLA = {id: ID_KJ, sid: ID16};
/* kunci `METODE /jalur`; :id = KJ-..., :sid = 16 heks. Jalur lain = 404, jalur ada tetapi metode lain = 405. */
const TABEL = Object.entries(RUTE_SIKLUS).map(([k, def]) => {
  const [metode, jalur] = k.split(" "), nama = [];
  const re = new RegExp("^" + jalur.replace(/:(\w+)/g, (_, n) => { nama.push(n); return `(${POLA[n]})`; }) + "$");
  return {metode, re, nama, def};
});
function cocok(metode, jalur) {
  for (const r of TABEL) { if (r.metode !== metode) continue; const m = r.re.exec(jalur); if (m) return {def: r.def, p: Object.fromEntries(r.nama.map((n, i) => [n, m[i + 1]]))}; }
  return null;
}

/* Siapa yang memanggil: objek hak, atau Response 401/403. SA memakai pelaku `admin` di hak.js; moderator biasa dan staf memakai `sk_staf`. dummyOk: boleh melihat baris dummy = 1 (akun dummy, moderator, Super Admin). */
export async function hakSk(env, req, kini, viaInstansi = false) {
  const m = await modOK(env, req);
  if (m) { const sa = !!(await superOK(env, req)); return {tipe: "staf", oleh: "admin:" + m, sa, pd: sa, ko: sa, pm: false, pelaku: sa ? pelakuAdmin : pelakuSkStaf, dummyOk: true, dummy: false}; }
  const s = await stafSesi(env, req, kini);
  if (s) {
    const p = s.peran.filter(x => PERAN_STAF.includes(x));
    if (!p.length) return gagal(403, `peran staf tidak mencakup Siklus (butuh ${PERAN_STAF.join("/")})`);
    return {tipe: "staf", oleh: "staf:" + s.id, sa: false, wilayah: Array.isArray(s.wilayah) ? s.wilayah : [], peranStaf: p, pd: p.includes("pusdalops"), ko: p.includes("koordalops"), pm: p.includes("pimpinan"), pelaku: pelakuSkStaf, dummyOk: !!s.dummy, dummy: !!s.dummy};
  }
  if (!viaInstansi) return gagal(401, "belum masuk");
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (!JENIS_BPBD.includes(a.jenis)) return gagal(403, "Siklus hanya untuk BPBD provinsi, kabupaten, dan kota serta staf BNPB");
  return {tipe: "bp", oleh: "instansi:" + a.id, sa: false, pd: false, ko: false, pm: false, pelaku: pelakuSkInstansi, dummyOk: !!a.dummy, dummy: !!a.dummy, akun: {...a, cakupan: a.cakupan ?? "[]"}, cakupan: jsonAman(a.cakupan) || []};
}
const LOLOS = {STAF: h => h.tipe === "staf", BP: h => h.tipe === "bp", PDKO: h => h.sa || h.pd || h.ko, KO: h => h.sa || h.ko, PM: h => h.pm, SA: h => h.sa};

/* jawaban staf tidak boleh disimpan bersama: private, no-store, bervariasi menurut cookie */
function pribadi(r) {
  const h = new Headers(r.headers); h.set("cache-control", "private, no-store"); h.append("vary", "cookie");
  return new Response(r.body, {status: r.status, statusText: r.statusText, headers: h});
}
const galatKe = (e, url) => {
  if (e instanceof Galat) return gagal(e.status, e.message);
  const t = String(e?.message || e);
  if (/no such table: sk_/i.test(t)) return gagal(503, "Siklus Bencana belum diaktifkan");
  if (/UNIQUE|constraint failed|sk_fase|sk_publik|sk_r3p|sk_jitupasna_final/i.test(t)) return gagal(409, "data berubah atau melanggar aturan; muat ulang lalu ulangi");
  console.error("siklus", url.pathname, t);
  return gagal(500, "galat server");
};

/* ================================================================ API */
async function layaniApi(env, req, url, ctx, jalur, viaInstansi) {
  const kini = Date.now(), metode = req.method === "HEAD" ? "GET" : req.method;
  const c = cocok(metode, jalur);
  if (!c) {
    const ok = ["GET", "POST"].filter(m => cocok(m, jalur));
    return ok.length ? gagal(405, "metode tidak diizinkan", {allow: ok.join(", ")}) : gagal(404, "tidak ada");
  }
  const sistem = c.def.izin.includes("sistem"), tamu = c.def.izin.includes("tamu");
  if (metode === "POST" && !sistem) {   // CSRF (KEAMANAN 7): header x-pb dan Origin sama-situs
    if (req.headers.get("x-pb") !== "1") return gagal(403, "kiriman Siklus wajib membawa header x-pb: 1");
    const x = tolakOrigin(req, url); if (x) return x;
  }
  let h = null;
  if (!sistem && !tamu) {
    h = await hakSk(env, req, kini, viaInstansi); if (h instanceof Response) return h;
    if (!c.def.izin.some(t => LOLOS[t]?.(h))) return gagal(403, "peran tidak berhak atas rute ini");
  }
  try {
    const r = await c.def.f({env, req, url, ctx, kini, h, p: c.p, bp: viaInstansi});
    return tamu || sistem ? r : pribadi(r);
  } catch (e) { return galatKe(e, url); }
}

/* ================================================================ halaman dan aset */
const RE_HAL = new RegExp(`^/siklus(/(kejadian|paparan|kaji|pulih|renkon|gladi|masa-depan|index\\.html)|/(kejadian)/${ID_KJ}|/(kaji|pulih|renkon)/${ID16})?$`);
const RE_ASET = /^\/siklus\/[\w-]+(\/[\w-]+)*\.(js|css|json|svg|png|webp|woff2)$/;
const PUBLIK_ASET = new Set(["/siklus/publik.js", "/siklus/publik.css", "/siklus/data/atribusi.json", "/siklus/data/kamus.json", "/siklus/data/masa_depan_ringkas.json"]);
const TIPE = {js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json; charset=utf-8", svg: "image/svg+xml", png: "image/png", webp: "image/webp", woff2: "font/woff2"};
const kepalaHal = {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow", "content-security-policy": CSP, vary: "cookie"};

async function sajiHalaman(env, req, url, berkas) {
  const r = await env.ASSETS.fetch(new Request(new URL(berkas, url)));
  if (!r.ok) { r.body?.cancel(); return gagal(404, "halaman belum ada"); }
  return new Response(req.method === "HEAD" ? null : r.body, {headers: kepalaHal});
}
async function layaniHalaman(env, req, url, jalur, kini) {
  if (jalur === "/siklus/publik.html") return gagal(404, "halaman tidak ada");   // cangkang publik hanya lewat /siklus/kejadian/:id
  if (!RE_HAL.test(jalur)) return gagal(404, "halaman tidak ada");
  const h = await hakSk(env, req, kini, false);
  if (/^\/siklus\/kejadian\/KJ-/.test(jalur) && h instanceof Response) return sajiHalaman(env, req, url, "/siklus/publik.html");   // tamu atau sesi tanpa hak: ringkasan publik saja
  if (h instanceof Response) return h.status === 401 ? new Response(null, {status: 303, headers: {location: "/admin/masuk?ke=" + encodeURIComponent(jalur), "cache-control": "no-store"}}) : h;
  return sajiHalaman(env, req, url, "/siklus/index.html");
}
async function layaniAset(env, req, url, jalur, kini) {
  const terbuka = PUBLIK_ASET.has(jalur);
  if (!terbuka) { const h = await hakSk(env, req, kini, false); if (h instanceof Response) return h; }
  const r = await env.ASSETS.fetch(new Request(url, {headers: {accept: req.headers.get("accept") || "*/*"}}));
  if (!r.ok) { r.body?.cancel(); return gagal(r.status === 404 ? 404 : 502, "berkas tidak ada"); }
  return new Response(req.method === "HEAD" ? null : r.body, {headers: {"content-type": TIPE[jalur.split(".").pop()], "cache-control": terbuka ? "public, max-age=600" : "private, max-age=600", ...(terbuka ? {} : {vary: "cookie"}), "x-content-type-options": "nosniff"}});
}

/* null = bukan urusan modul */
export async function layaniSk(env, req, url, ctx) {
  const jalur = url.pathname.replace(/\/+$/, "") || "/";
  const viaInstansi = jalur.startsWith("/api/instansi/siklus/"), api = viaInstansi || jalur.startsWith("/api/siklus/");
  if (!api && jalur !== "/siklus" && !jalur.startsWith("/siklus/")) return null;
  if (env.SIKLUS_MATI === "1") return gagal(503, "Siklus Bencana sedang dimatikan");
  if (api) return layaniApi(env, req, url, ctx, viaInstansi ? jalur.replace("/api/instansi/siklus", "/api/siklus") : jalur, viaInstansi);
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "metode tidak diizinkan", {allow: "GET, HEAD"});
  return RE_ASET.test(jalur) ? layaniAset(env, req, url, jalur, Date.now()) : layaniHalaman(env, req, url, jalur, Date.now());
}
