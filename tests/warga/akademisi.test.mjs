/* Uji integrasi /api/akademisi/karya/:id (src/akademisi.js) lewat Worker sungguhan di Miniflare: gerbang staf sebelum OpenAlex,
   kunci API ikut, ringkasan karya, sumber gagal = 502. OpenAlex ditiru lewat outboundService. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import "../../src/worker.js";   // urutan impor: worker dulu (akademisi.js mengimpor balik worker.js)
import {ringkasOrcid} from "../../src/akademisi.js";

let mf, minta = [], jawab = null, jawabOrcid = null;
const luar = async req => {
  const u = new URL(req.url);
  if (u.hostname === "pub.orcid.org") { minta.push(u); return jawabOrcid ? jawabOrcid(u) : new Response("{}", {status: 404}); }
  if (u.hostname !== "api.openalex.org") return new Response("diblok di uji", {status: 599});
  minta.push(u);
  return jawab ? jawab(u) : new Response("{}", {status: 500});
};
before(async () => {
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", d1Databases: {DB: "uji-akademisi"}, r2Buckets: ["MEDIA"], bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", OPENALEX_KEY: "kunci-uji"},
    serviceBindings: {ASSETS: () => new Response("tidak ada", {status: 404})}, outboundService: luar, cache: false});
  const DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

const ADMIN = {"x-admin-token": "rahasia-admin"};
const api = async (j, h = {}) => { const r = await mf.dispatchFetch("http://akademisi.lokal" + j, {headers: h}); return {status: r.status, j: await r.json().catch(() => null)}; };
const karya = (n, i) => ({id: "https://openalex.org/W" + i, doi: i % 2 ? "https://doi.org/10.1/x" + i : null, display_name: "Judul " + i, publication_year: 2020 + i,
  cited_by_count: 100 - i, primary_location: {source: {display_name: "Jurnal " + i, type: "journal"}},
  authorships: Array.from({length: n}, (_, k) => ({author: {id: "https://openalex.org/" + (k === 1 ? "A5017898742" : "A1" + k), display_name: "Penulis " + k}}))});

test("tanpa sesi staf = 401 dan OpenAlex tidak dipanggil", async () => {
  minta = [];
  assert.equal((await api("/api/akademisi/karya/A5017898742")).status, 401);
  assert.equal(minta.length, 0);
});

test("staf: 8 karya terurut sitasi dari OpenAlex dengan kunci API, diringkas (penulis maks 3 + dkk., DOI atau tautan OpenAlex)", async () => {
  minta = []; jawab = u => u.pathname.startsWith("/authors/") ? new Response(JSON.stringify({counts_by_year: [{year: 2025, works_count: 9, cited_by_count: 400}, {year: 2024, works_count: 7, cited_by_count: 350}], summary_stats: {i10_index: 55}}))
    : new Response(JSON.stringify({results: [karya(5, 1), karya(2, 2)]}));
  const r = await api("/api/akademisi/karya/A5017898742", ADMIN);
  assert.equal(r.status, 200);
  const u = minta.find(x => x.pathname === "/works");
  assert.equal(minta.find(x => x.pathname === "/authors/A5017898742").searchParams.get("api_key"), "kunci-uji");
  assert.deepEqual(r.j.tahunan, [[2024, 7, 350], [2025, 9, 400]], "seri tahunan urut naik"); assert.equal(r.j.i10, 55);
  assert.equal(u.searchParams.get("filter"), "author.id:A5017898742"); assert.equal(u.searchParams.get("sort"), "cited_by_count:desc");
  assert.equal(u.searchParams.get("per-page"), "8"); assert.equal(u.searchParams.get("api_key"), "kunci-uji");
  assert.deepEqual(r.j.karya[0], {judul: "Judul 1", url: "https://doi.org/10.1/x1", tahun: 2021, sitasi: 99, terbitan: "Jurnal 1", penulis: "Penulis 0, Penulis 1, Penulis 2 dkk.",
    urutan: 2, jumlah_penulis: 5, jenis: "Jurnal"});
  assert.equal(r.j.karya[1].url, "https://openalex.org/W2"); assert.equal(r.j.karya[1].penulis, "Penulis 0, Penulis 1");
});

test("saringan karya: halaman, urutan terbaru, jenis jurnal, cari judul dibersihkan; nilai liar jatuh ke bawaan", async () => {
  minta = []; jawab = u => u.pathname.startsWith("/authors/") ? new Response("{}") : new Response(JSON.stringify({meta: {count: 31}, results: [karya(1, 4)]}));
  const r = await api("/api/akademisi/karya/A5017898742?hal=3&urut=terbaru&jenis=jurnal&cari=" + encodeURIComponent("coral, reef|uji:x"), ADMIN);
  assert.equal(r.status, 200); assert.equal(r.j.jumlah, 31); assert.equal(r.j.hal, 3); assert.equal(r.j.per_hal, 8);
  const u = minta.find(x => x.pathname === "/works");
  assert.equal(u.searchParams.get("page"), "3"); assert.equal(u.searchParams.get("sort"), "publication_date:desc");
  assert.equal(u.searchParams.get("filter"), "author.id:A5017898742,primary_location.source.type:journal,title.search:coral reef uji x");
  minta = [];
  await api("/api/akademisi/karya/A5017898742?hal=999&urut=jahat&jenis=x", ADMIN);
  const v = minta.find(x => x.pathname === "/works");
  assert.equal(v.searchParams.get("page"), "50"); assert.equal(v.searchParams.get("sort"), "cited_by_count:desc"); assert.equal(v.searchParams.get("filter"), "author.id:A5017898742");
});

test("profil penulis gagal: karya tetap tampil, seri tahunan kosong", async () => {
  jawab = u => u.pathname.startsWith("/authors/") ? new Response("{}", {status: 500}) : new Response(JSON.stringify({results: [karya(1, 3)]}));
  const r = await api("/api/akademisi/karya/A5017898744", ADMIN);
  assert.equal(r.status, 200); assert.equal(r.j.karya.length, 1); assert.deepEqual(r.j.tahunan, []); assert.equal(r.j.i10, null);
});

test("OpenAlex menolak (429) = 502, layar menyembunyikan bagiannya", async () => {
  jawab = () => new Response("{}", {status: 429});
  const r = await api("/api/akademisi/karya/A5017898743", ADMIN);
  assert.equal(r.status, 502); assert.match(r.j.galat, /OpenAlex 429/);
});

test("id bukan id penulis OpenAlex tidak mencapai rute", async () => {
  minta = [];
  assert.notEqual((await api("/api/akademisi/karya/W123456", ADMIN)).status, 200);
  assert.equal(minta.length, 0);
});

test("rincian SINTA: staf saja, dibaca dari pecahan id % 64, id belum dipanen = 404", async () => {
  const R2 = await mf.getR2Bucket("MEDIA");
  await R2.put("akademisi/sinta/" + (6033412 % 64) + ".json", JSON.stringify({"6033412": {tabel: {"H-Index": [33, 41]}, artikel: [{judul: "Uji", kuartil: "Q1 as Journal"}]}}));
  assert.equal((await api("/api/akademisi/sinta/6033412")).status, 401);
  const r = await api("/api/akademisi/sinta/6033412", ADMIN);
  assert.equal(r.status, 200); assert.deepEqual(r.j.tabel["H-Index"], [33, 41]); assert.equal(r.j.artikel[0].kuartil, "Q1 as Journal");
  assert.equal((await api("/api/akademisi/sinta/6033476", ADMIN)).status, 404, "pecahan sama, id lain belum dipanen");
  assert.equal((await api("/api/akademisi/sinta/5", ADMIN)).status, 404, "pecahan belum ada");
});

test("ringkasOrcid: rekaman kosong = tidak publik; pendidikan dan pekerjaan terurut terbaru, biografi dipotong", () => {
  assert.deepEqual(ringkasOrcid(null), {publik: false});
  assert.equal(ringkasOrcid({"activities-summary": {works: {group: []}}, person: {name: {}}}).publik, false);
  const af = (jenis, nama, mulai, peran) => ({summaries: [{[jenis + "-summary"]: {organization: {name: nama}, "role-title": peran, "start-date": {year: {value: String(mulai)}}}}]});
  const r = ringkasOrcid({person: {biography: {content: "Peneliti tsunami."}}, "activities-summary": {educations: {"affiliation-group": [af("education", "ITB", 1995, "S1"), af("education", "Tohoku University", 2008, "PhD")]},
    employments: {"affiliation-group": [af("employment", "BNPB", 2015, "Kepala Pusat")]}}});
  assert.equal(r.publik, true); assert.equal(r.biografi, "Peneliti tsunami.");
  assert.deepEqual(r.pendidikan.map(x => [x.institusi, x.peran, x.mulai]), [["Tohoku University", "PhD", 2008], ["ITB", "S1", 1995]]);
  assert.equal(r.pekerjaan[0].peran, "Kepala Pusat");
});

test("karya ?orcid= sah: ORCID ditanya hanya di halaman 1; orcid liar diabaikan", async () => {
  jawab = u => u.pathname.startsWith("/authors/") ? new Response("{}") : new Response(JSON.stringify({meta: {count: 1}, results: [karya(1, 5)]}));
  jawabOrcid = () => new Response(JSON.stringify({person: {biography: {content: "Bio"}}}));
  minta = [];
  const r = await api("/api/akademisi/karya/A5017898745?orcid=0000-0002-4522-8258", ADMIN);
  assert.equal(r.j.orcid.publik, true); assert.equal(minta.filter(x => x.hostname === "pub.orcid.org").length, 1);
  minta = [];
  const r2 = await api("/api/akademisi/karya/A5017898745?orcid=0000-0002-4522-8258&hal=2", ADMIN);
  assert.equal(r2.j.orcid, undefined); assert.equal(minta.filter(x => x.hostname === "pub.orcid.org").length, 0);
  minta = [];
  const r3 = await api("/api/akademisi/karya/A5017898746?orcid=jahat/../x", ADMIN);
  assert.equal(r3.j.orcid, undefined); assert.equal(minta.filter(x => x.hostname === "pub.orcid.org").length, 0);
});
