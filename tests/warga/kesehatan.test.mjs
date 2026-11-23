/* Papan kesehatan GET /api/kesehatan (src/kesehatan.js). worker.js utuh di workerd (Miniflare); satu-satunya tiruan: api.github.com (eksternal).
   Jalankan: node --test tests/warga/kesehatan.test.mjs */
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import {ringkasWorkflow, muatWorkflow, ringkasD1, muatD1} from "../../src/kesehatan.js";

const uji = berantai(), KINI = Date.parse("2026-11-23T04:00:00Z"), iso = jam => new Date(KINI - jam * 36e5).toISOString();
const WF = [{id: 1, name: "Titik panas", path: ".github/workflows/titik.yml", state: "active"}, {id: 2, name: "Arsip", path: ".github/workflows/arsip.yml", state: "disabled_manually"},
  {id: 3, name: "Himawari", path: ".github/workflows/himawari.yml", state: "active"}];
const RUN = [
  {workflow_id: 3, status: "completed", conclusion: "failure", created_at: iso(0.5), html_url: "https://github.com/x/3c"},
  {workflow_id: 1, status: "in_progress", conclusion: null, created_at: iso(1), html_url: "https://github.com/x/1b"},
  {workflow_id: 3, status: "completed", conclusion: "timed_out", created_at: iso(1)},
  {workflow_id: 1, status: "completed", conclusion: "success", created_at: iso(3)},
  {workflow_id: 3, status: "completed", conclusion: "success", created_at: iso(2)},
  {workflow_id: 3, status: "completed", conclusion: "failure", created_at: iso(5)},
];

uji("kesehatan: ringkasWorkflow menghitung run terakhir, umur sukses, gagal beruntun, urut yang gagal dulu", () => {
  const d = ringkasWorkflow(WF, RUN, KINI);
  assert.deepEqual(d.map(w => w.berkas), ["himawari.yml", "arsip.yml", "titik.yml"]);
  const [h, a, t] = d;
  assert.equal(h.gagal_beruntun, 2, "failure dan timed_out sebelum sukses; gagal lama sesudah sukses tidak dihitung");
  assert.equal(h.sukses_umur_jam, 2); assert.equal(h.terakhir.hasil, "failure"); assert.equal(h.terakhir.url, "https://github.com/x/3c");
  assert.equal(t.gagal_beruntun, 0, "run yang masih jalan dilewati"); assert.equal(t.terakhir.status, "in_progress"); assert.equal(t.sukses_umur_jam, 3);
  assert.equal(a.aktif, false); assert.equal(a.terakhir, null, "tanpa run di 100 terakhir = null, bukan nol"); assert.equal(a.sukses_umur_jam, null);
});

uji("kesehatan: tanpa GITHUB_TOKEN tidak memanggil GitHub; galat GitHub dilaporkan tanpa isi balasan", async () => {
  let n = 0; const ambil = async () => { n++; return new Response("rahasia", {status: 502}); };
  assert.deepEqual(await muatWorkflow({}, KINI, ambil), {tersedia: false, alasan: "tanpa token"}); assert.equal(n, 0);
  assert.deepEqual(await muatWorkflow({GITHUB_TOKEN: "ghp_uji"}, KINI, ambil), {tersedia: false, alasan: "GitHub HTTP 502"});
  const m = n; assert.deepEqual(await muatWorkflow({GITHUB_TOKEN: "ghp_uji"}, KINI + 30e3, ambil), {tersedia: false, alasan: "GitHub HTTP 502"});
  assert.equal(n, m, "galat disimpan 1 menit: GitHub yang gagal tidak dipukul lagi");
  await muatWorkflow({GITHUB_TOKEN: "ghp_uji"}, KINI + 61e3, ambil); assert.ok(n > m, "sesudah 1 menit dicoba lagi");
});

uji("kesehatan: ringkasD1 tujuh hari UTC, hari tanpa data null bukan nol", () => {
  const h = ringkasD1([{dimensions: {date: "2026-11-23"}, sum: {rowsRead: 4e6, rowsWritten: 10, readQueries: 5, writeQueries: 1}},
    {dimensions: {date: "2026-11-17"}, sum: {rowsRead: 1, rowsWritten: 0, readQueries: 1, writeQueries: 0}}], KINI);
  assert.deepEqual(h.map(x => x.tanggal), ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"]);
  assert.equal(h[6].baca, 4e6); assert.equal(h[0].tulis, 0, "nol asli tetap nol"); assert.equal(h[3].baca, null);
});

uji("kesehatan: muatD1 tanpa secret tidak memanggil Cloudflare; galat GraphQL tidak membawa pesannya", async () => {
  let n = 0; const ambil = async () => { n++; return Response.json({errors: [{message: "akun 1234 rahasia"}]}); };
  assert.deepEqual(await muatD1({CF_ANALITIK_TOKEN: "t"}, KINI, ambil), {tersedia: false, alasan: "tanpa token"}); assert.equal(n, 0);
  assert.deepEqual(await muatD1({CF_ANALITIK_TOKEN: "t", CF_AKUN_ID: "a"}, KINI, ambil), {tersedia: false, alasan: "Cloudflare GraphQL galat"});
  assert.equal(n, 1); await muatD1({CF_ANALITIK_TOKEN: "t", CF_AKUN_ID: "a"}, KINI + 30e3, ambil); assert.equal(n, 1, "galat disimpan 1 menit");
});

const panggil = [], panggilCf = [];
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname === "api.cloudflare.com" && u.pathname === "/client/v4/graphql") {
    const b = await req.json(); panggilCf.push({auth: req.headers.get("authorization"), v: b.variables});
    return Response.json({data: {viewer: {accounts: [{d1AnalyticsAdaptiveGroups: [{dimensions: {date: "2026-11-23"}, sum: {rowsRead: 4.2e6, rowsWritten: 100, readQueries: 9, writeQueries: 2}}]}]}}});
  }
  if (u.hostname !== "api.github.com") return new Response("diblok di uji", {status: 599});
  panggil.push({url: req.url, auth: req.headers.get("authorization")});
  if (u.pathname.endsWith("/actions/workflows")) return Response.json({workflows: WF});
  if (u.pathname.endsWith("/actions/runs")) return Response.json({workflow_runs: RUN});
  return new Response("tidak ada", {status: 404});
};
const aset = async req => { const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404}); };
const U = await siapkan("uji-kesehatan", {ikat: {GITHUB_TOKEN: "ghp_uji", CF_ANALITIK_TOKEN: "cf_uji", CF_AKUN_ID: "akun_uji"}, luar, asetKu: aset});

uji("kesehatan: GET /api/kesehatan tanpa masuk 403, admin 200 berisi status dan workflow, tanpa cache publik", async () => {
  assert.equal((await U.api("GET", "/api/kesehatan")).s, 403);
  assert.equal((await U.api("GET", "/api/kesehatan", undefined, {cookie: "sesi_staf=" + "a".repeat(64)})).s, 403, "sesi staf palsu");
  const r = await U.api("GET", "/api/kesehatan", undefined, ADMIN);
  assert.equal(r.s, 200, r.t); assert.equal(r.h.get("cache-control"), "no-store");
  assert.equal(typeof r.j.status.ok, "boolean"); assert.ok(Array.isArray(r.j.status.basi)); assert.ok(r.j.status.sumber.titik, "sumber dari periksaStatus");
  assert.equal(r.j.workflow.tersedia, true); assert.equal(r.j.workflow.daftar[0].berkas, "himawari.yml");
  assert.ok(panggil.every(p => p.auth === "Bearer ghp_uji" && p.url.startsWith("https://api.github.com/repos/terasurbannetwork/poskokarhutla/actions/")));
  assert.equal(r.j.d1.tersedia, true, JSON.stringify(r.j.d1)); assert.equal(r.j.d1.batas.baca, 5e6); assert.equal(r.j.d1.hari.length, 7);
  assert.equal(panggilCf.length, 1); const [{auth, v}] = panggilCf;
  assert.equal(auth, "Bearer cf_uji"); assert.equal(v.a, "akun_uji"); assert.equal(Date.parse(v.k) - Date.parse(v.m), 6 * 864e5, "jendela 7 hari UTC");
  assert.equal(r.j.d1.hari.at(-1).tanggal, v.k); assert.equal(r.j.d1.hari[0].tanggal, v.m);
  const n = panggil.length; assert.equal((await U.api("GET", "/api/kesehatan", undefined, ADMIN)).s, 200);
  assert.equal(panggil.length, n, "jawaban GitHub di-cache 5 menit: buka ulang tidak memanggil lagi");
});
