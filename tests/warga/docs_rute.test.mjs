/* DC-03: rute Docs Centurisk97 (/docs, /docs/<slug>) di src/worker.js lewat src/docs_rute.js, dijalankan di workerd (Miniflare) tanpa D1 baru.
   - jalur berpola tertutup (/docs, /docs/<modul>[/<halaman>], /docs/pengembang/...) dilayani tanpa sesi di centurisk97.id; alamat langsung .html berpola sama juga; selain itu tetap tertutup atau 404.
   - /docsx, /docs/../admin, slug asing tidak terbuka; /docs tidak melonggarkan halaman terkunci lain; Worker tidak membaca D1 untuk melayani Docs.
   Jalankan: node --test tests/warga/docs_rute.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {ruteDocs, jalurDocs, DOCS_HTML_LANGSUNG} from "../../src/docs_rute.js";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BERKAS = ["/docs", "/docs/peta-karhutla", "/docs/peta-karhutla/sekilas", "/docs/pengembang", "/docs/pengembang/banjir", "/docs/pengembang/banjir/ikhtisar"];
const ASET = {"/docs": "/docs/index.html", "/docs/peta-karhutla": "/docs/peta-karhutla/index.html", "/docs/peta-karhutla/sekilas": "/docs/peta-karhutla/sekilas.html",
  "/docs/pengembang": "/docs/pengembang/index.html", "/docs/pengembang/banjir": "/docs/pengembang/banjir/index.html", "/docs/pengembang/banjir/ikhtisar": "/docs/pengembang/banjir/ikhtisar.html"};
const ASING = ["/docsx", "/docs/", "/docs/BANJIR", "/docs/../admin", "/docs//banjir", "/docs/a.b", "/docs/a/b/c/d", "/docs/banjir.html", "/doc", "/", "/admin", "/docs/%2e%2e/admin", "/docs/" + "a".repeat(49)];

test("ruteDocs: satu entri berpola tertutup, bentuk HTML_RUTE dengan pemetaan aset", () => {
  const r = ruteDocs();
  assert.equal(r.length, 1);
  const [re, bawaan, kanonik, peta] = r[0];
  assert.equal(bawaan, "/docs/index.html"); assert.equal(kanonik, "/docs");
  for (const j of BERKAS) { assert.ok(re.test(j) && re.test(j + "/"), j); assert.equal(peta(j), ASET[j], j); assert.equal(peta(j + "/"), ASET[j], j + "/"); }
  for (const j of ASING.filter(x => x !== "/docs/")) assert.ok(!re.test(j), j);
});

test("jalurDocs: hanya jalur berpola tertutup", () => {
  for (const j of BERKAS) assert.ok(jalurDocs(j), j);
  for (const j of ASING) assert.ok(!jalurDocs(j), j);
});

test("DOCS_HTML_LANGSUNG: berkas keluaran generator, tanpa titik ganda atau segmen asing", () => {
  for (const j of ["/docs/index.html", "/docs/peta-karhutla/index.html", "/docs/peta-karhutla/sekilas.html", "/docs/pengembang/banjir/ikhtisar.html"]) assert.ok(DOCS_HTML_LANGSUNG.test(j), j);
  for (const j of ["/docs/a/b/c/d.html", "/docs/Rahasia.html", "/docs/../x.html", "/docs/a..b.html", "/docs/docs.css", "/docs/cari.json", "/docs/a//b.html", "/docsx/a.html", "/docs/abchtml", "/docs/xhtml"]) assert.ok(!DOCS_HTML_LANGSUNG.test(j), j);
});

test("kabel: worker.js menyisipkan ruteDocs, entri PUBLIK_TANPA_SESI beralasan, _headers CSP ketat tanpa unsafe-inline", () => {
  /* HTML_RUTE dan PUBLIK_TANPA_SESI tinggal di modul daun src/gerbang_halaman.js (PS-04), diekspor ulang worker.js */
  const w = readFileSync(path.join(AKAR, "src/worker.js"), "utf8") + readFileSync(path.join(AKAR, "src/gerbang_halaman.js"), "utf8");
  assert.match(w, /import \{ruteDocs, jalurDocs, DOCS_HTML_LANGSUNG\} from "\.\/docs_rute\.js"/);
  assert.match(w, /\.\.\.ruteDocs\(\)/);
  assert.match(w, /\["\/docs", "[^"]{40,}"\]/, "entri /docs beralasan di PUBLIK_TANPA_SESI");
  const h = readFileSync(path.join(AKAR, "public/_headers"), "utf8");
  const b = h.match(/^\/docs\/\*\r?\n((?:[ \t]+.*\r?\n?)+)/m); assert.ok(b, "blok /docs/* di _headers");
  assert.match(b[1], /script-src 'self'(;|\s|$)/); assert.doesNotMatch(b[1], /unsafe-inline|unsafe-eval/);
});

/* ---- perilaku di workerd; ASSETS = rintisan HTML (public/docs/ belum tentu ada saat uji ini jalan) ---- */
const STUB = new Map([...Object.values(ASET).map(f => [f, `<!doctype html><title>${f}</title>HAL-${f}`]), ["/docs/index.html", "<!doctype html><title>Docs</title>BERANDA-DOCS"],
  ["/docs/docs.css", "body{}"], ["/lapor/index.html", "<!doctype html>LAPOR"], ["/prediksi/index.html", "<!doctype html>PREDIKSI-TERKUNCI"]]);
const aset = async req => { const p = new URL(req.url).pathname; return STUB.has(p) ? new Response(STUB.get(p), {headers: p.endsWith(".css") ? {} : {"content-type": "text/html; charset=utf-8"}}) : new Response("tidak ada", {status: 404}); };
/* miniflare belum terpasang (npm ci belum jalan) = bagian perilaku dilewati dengan alasan jelas; di CI selalu jalan */
let mf = null, alasanLewat = null;
try { const {siapkan} = await import("./_bnpb.mjs"); ({mf} = await siapkan("uji-docs-rute", {asetKu: aset})); } catch (e) { if (e?.code !== "ERR_MODULE_NOT_FOUND") throw e; alasanLewat = "miniflare tidak terpasang: " + String(e.message).slice(0, 80); }
const uji = (nama, fn) => test(nama, {skip: alasanLewat || false}, fn);
const buka = async (j, host = "centurisk97.id") => { const r = await mf.dispatchFetch(`https://${host}${j}`, {redirect: "manual", headers: {"cf-connecting-ip": "198.51.100.7"}}); const t = await r.text(); return {s: r.status, t, h: r.headers}; };

uji("centurisk97.id: beranda, modul, halaman, dan sisi pengembang terbuka tanpa sesi, tombol Keluar tidak disisipkan", async () => {
  const b = await buka("/docs"); assert.equal(b.s, 200); assert.match(b.t, /BERANDA-DOCS/); assert.doesNotMatch(b.t, /keluar\.js/);
  assert.equal((await buka("/docs/")).s, 200);
  for (const j of BERKAS.slice(1)) { const r = await buka(j); assert.equal(r.s, 200, j); assert.ok(r.t.includes("HAL-" + ASET[j]), j); assert.doesNotMatch(r.t, /keluar\.js/, j); assert.equal((await buka(j + "/")).s, 200, j + "/"); }
});

uji("centurisk97.id: alamat langsung .html ikut terbuka; cache publik tidak dipaksa private", async () => {
  const a = await buka("/docs/index.html"); assert.equal(a.s, 200); assert.match(a.t, /BERANDA-DOCS/);
  const b = await buka("/docs/pengembang/banjir/ikhtisar.html"); assert.equal(b.s, 200); assert.ok(b.t.includes("HAL-/docs/pengembang/banjir/ikhtisar.html"));
  const r = await buka("/docs/pengembang/banjir"); assert.ok(!/private/.test(r.h.get("cache-control") || ""), "Docs publik boleh di-cache bersama, bukan private/no-store per orang");
});

uji("tidak membuka jalur lain: /docsx, /docs/../admin, jalur tak berpola, berkas tak ada tetap 404, halaman terkunci tetap tertutup", async () => {
  for (const j of ["/docsx", "/docs/BANJIR", "/docs/a/b/c/d", "/docs//banjir", "/docs/%2e%2e/admin"]) { const r = await buka(j); assert.notEqual(r.s, 200, j + " -> " + r.s); assert.doesNotMatch(r.t, /HAL-|BERANDA-DOCS|PREDIKSI-TERKUNCI/, j); }
  assert.equal((await buka("/docs/tidak-ada")).s, 404, "pola cocok, berkas tidak ada: 404 dari aset");
  assert.equal((await buka("/docs/peta-karhutla/tidak-ada")).s, 404);
  assert.equal((await buka("/docs/a/b/c/d.html")).s, 303, "alamat langsung .html terlalu dalam tetap terkunci");
  assert.equal((await buka("/docs/Rahasia.html")).s, 303, "huruf besar tidak berpola, tetap terkunci");
  const t = await buka("/prediksi"); assert.notEqual(t.s, 200, "halaman terkunci lain tetap tertutup"); assert.doesNotMatch(t.t, /PREDIKSI-TERKUNCI/);
  const t2 = await buka("/prediksi/index.html"); assert.notEqual(t2.s, 200); assert.doesNotMatch(t2.t, /PREDIKSI-TERKUNCI/);
  assert.equal((await buka("/lapor/index.html")).s, 200, "/lapor tetap publik seperti semula");
});

test("Docs tidak menyentuh D1 per tampilan dan tidak dipaksa private (statis)", () => {
  const w = readFileSync(path.join(AKAR, "src/worker.js"), "utf8");
  assert.match(w, /if \(!docs\) catatHTML\(/); assert.match(w, /if \(!docs\) try \{ a = await Pub\.angkaPil/);
  assert.match(w, /hostTerkunci\(url\.hostname\) && !docs/);
});

test("tanpa baca D1 baru: Docs tidak punya tabel atau rute API, Docs melewati hit HTML", () => {
  const w = readFileSync(path.join(AKAR, "src/worker.js"), "utf8"), d = readFileSync(path.join(AKAR, "src/docs_rute.js"), "utf8");
  assert.doesNotMatch(d, /env\.|DB|prepare|fetch\(/, "docs_rute.js murni: tanpa env/D1");
  assert.doesNotMatch(w, /"(GET|POST) \/api\/docs/, "tanpa rute /api/docs (A4)");
});
