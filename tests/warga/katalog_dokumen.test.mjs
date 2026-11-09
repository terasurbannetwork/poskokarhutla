/* Katalog dokumen repo: GET /api/bnpb/katalog-dokumen dan halaman /bnpb/katalog-dokumen, terbuka tanpa login (permintaan pemilik 9 Nov 2026), di Worker utuh + D1 lokal.
   Jalankan: node --test tests/warga/katalog_dokumen.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai} from "./_bnpb.mjs";
import "../../src/worker.js";

const uji = berantai();
const diambil = [];
const U = await siapkan("uji-katalog-dokumen", {r2: true, luar: req => { diambil.push(req.url); return new Response("# isi"); }}), {api} = U;
const man = async (asal, j) => { const r = await U.mf.dispatchFetch(asal + j, {redirect: "manual"}); await r.text(); return r; };

uji("katalog dokumen: API terbuka tanpa login, catatan agent dan QA tidak ikut", async () => {
  const r = await api("GET", "/api/bnpb/katalog-dokumen");
  assert.equal(r.s, 200, r.t); assert.equal(r.j.ok, true); assert.ok(r.j.dok.length > 100);
  const jalur = r.j.dok.flatMap(e => [...e.b, ...(e.v || []).flatMap(v => v.b)].map(b => b[1]));
  assert.ok(r.j.dok.some(e => e.v?.length >= 5), "revisi satu paparan digabung");
  assert.equal(r.j.dok.filter(e => e.v && /\(rev\d+/i.test(e.j)).length, 0, "judul entri bergabung tanpa penanda revisi");
  assert.equal(new Set(jalur).size, jalur.length);
  assert.equal(jalur.filter(p => /^\.claude\/|^data\/kajian-bnpb\/(qa|naskah|skill)\//.test(p)).length, 0);
});

uji("katalog dokumen: penayang berkas hanya jalur di indeks, hanya Markdown dan PDF, tidak menjadi proksi bebas", async () => {
  const {j: {dok}} = await api("GET", "/api/bnpb/katalog-dokumen");
  const semua = dok.flatMap(e => e.b), cari = x => semua.find(b => b[0] === x)[1], url = p => "/api/bnpb/katalog-dokumen/berkas?k=" + Buffer.from(p).toString("base64url");
  for (const x of ["md", "pdf"]) {
    diambil.length = 0;
    const r = await api("GET", url(cari(x))); assert.equal(r.s, 200, x); assert.match(r.h.get("content-type"), /text\/plain/, "bukan tipe yang direbut pengelola unduhan"); assert.equal(r.h.get("content-disposition"), null); assert.equal(r.h.get("x-content-type-options"), "nosniff");
    assert.equal(diambil.length, 1); assert.match(diambil[0], /^https:\/\/raw\.githubusercontent\.com\/terasurbannetwork\/poskokarhutla\/main\//);
  }
  diambil.length = 0;
  for (const p of ["../../etc/passwd", "AGENTS.md", ".claude/settings.json", "wrangler.jsonc", "https://contoh.invalid/a.pdf", cari("pptx"), ""]) assert.equal((await api("GET", url(p))).s, 404, p);
  assert.equal(diambil.length, 0, "jalur di luar indeks tidak pernah diambil");
});

uji("katalog dokumen: halaman terbuka di centurisk97.id tanpa diindeks mesin pencari, .html dialihkan, tidak ada di navbar", async () => {
  const c = await man("https://centurisk97.id", "/bnpb/katalog-dokumen"); assert.equal(c.status, 200);
  assert.match(c.headers.get("x-robots-tag"), /noindex/); assert.match(c.headers.get("content-security-policy"), /worker-src 'self' blob:/, "worker PDF.js dari asal sendiri");
  const h = await man("http://bnpb.lokal", "/bnpb/katalog-dokumen.html"); assert.equal(h.status, 301); assert.equal(new URL(h.headers.get("location"), "http://bnpb.lokal").pathname, "/bnpb/katalog-dokumen");
  assert.doesNotMatch(readFileSync(path.join(AKAR, "public/bnpb/menu_pusdalops.js"), "utf8"), /katalog-dokumen/);
  assert.doesNotMatch(readFileSync(path.join(AKAR, "public/bnpb/katalog-dokumen.html"), "utf8"), /menu_pusdalops/);
});
