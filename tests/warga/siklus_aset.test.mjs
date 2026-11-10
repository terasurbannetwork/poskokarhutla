/* Siklus Bencana: aset berkunci, halaman, daftar putih publik (DESAIN-TEKNIS 7, SK-019). UJ-KP-10. Jalankan: node --test tests/warga/siklus_aset.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {mulai, kjAcak, ASET} from "./_siklus.mjs";
import {AKAR} from "./_bantu.mjs";
import {PUBLIK_TANPA_SESI} from "../../src/worker.js";

const U = await mulai("uji-sk-aset");
const [PD, UDARA] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Udara Uji", ["udara"])];
const KJ = kjAcak();
const buka = (j, h = {}, host = "http://bnpb.lokal", metode = "GET") => U.mf.dispatchFetch(host + j, {method: metode, redirect: "manual", headers: h}).then(async r => ({s: r.status, t: await r.text(), h: r.headers}));

uji("wrangler.jsonc: run_worker_first memuat /siklus/* (dan pola yang ada tetap)", () => {
  const w = readFileSync(path.join(AKAR, "wrangler.jsonc"), "utf8");
  assert.match(w, /"run_worker_first": \[[^\]]*"\/\*\.html"[^\]]*"\/logpal\/\*"[^\]]*"\/siklus\/\*"/);
});
uji("UJ-KP-10: tanpa sesi, JS, CSS, dan JSON staf /siklus/* ditolak 401 (bukan berkas)", async () => {
  for (const j of ["/siklus/siklus.js", "/siklus/inti.js", "/siklus/siklus.css", "/siklus/data/rahasia.json"]) { const r = await buka(j); assert.equal(r.s, 401, j); assert.doesNotMatch(r.t, /export const|body\{\}|"x":1/); }
  assert.equal((await buka("/siklus/siklus.js", UDARA.h)).s, 403, "sesi tanpa peran Siklus");
  assert.equal((await buka("/siklus/siklus.js", {"x-admin-token": "salah"})).s, 401);
});
uji("UJ-KP-10: daftar putih publik terbuka tanpa sesi (publik.js, publik.css, atribusi, kamus, masa_depan_ringkas), cache publik 10 menit, tanpa vary cookie", async () => {
  for (const j of ["/siklus/publik.js", "/siklus/publik.css", "/siklus/data/atribusi.json", "/siklus/data/kamus.json", "/siklus/data/masa_depan_ringkas.json"]) {
    const r = await buka(j); assert.equal(r.s, 200, j); assert.equal(r.t, ASET[j]); assert.equal(r.h.get("cache-control"), "public, max-age=600"); assert.equal(r.h.get("x-content-type-options"), "nosniff");
  }
  assert.match((await buka("/siklus/publik.js")).h.get("content-type"), /javascript/); assert.match((await buka("/siklus/data/kamus.json")).h.get("content-type"), /json/);
});
uji("aset staf dengan sesi sah: private, max-age=600, tipe benar, HEAD tanpa badan", async () => {
  const r = await buka("/siklus/siklus.js", PD.h); assert.equal(r.s, 200); assert.equal(r.t, ASET["/siklus/siklus.js"]); assert.equal(r.h.get("cache-control"), "private, max-age=600"); assert.match(r.h.get("vary"), /cookie/i);
  assert.equal((await buka("/siklus/data/rahasia.json", PD.h)).s, 200);
  const hd = await buka("/siklus/siklus.js", PD.h, undefined, "HEAD"); assert.equal(hd.s, 200); assert.equal(hd.t, "");
  assert.equal((await buka("/siklus/tidak-ada.js", PD.h)).s, 404);
});
uji("halaman staf: tanpa sesi 303 ke /admin/masuk?ke=, sesi sah menerima index.html ber-CSP, no-store, noindex", async () => {
  for (const j of ["/siklus", "/siklus/kejadian", "/siklus/paparan", "/siklus/kaji", "/siklus/pulih", "/siklus/renkon", "/siklus/gladi", "/siklus/masa-depan", "/siklus/index.html", `/siklus/pulih/${"a".repeat(16)}`]) {
    const t = await buka(j); assert.equal(t.s, 303, j); assert.equal(t.h.get("location"), "/admin/masuk?ke=" + encodeURIComponent(j));
    const s = await buka(j, PD.h); assert.equal(s.s, 200, j); assert.equal(s.t, ASET["/siklus/index.html"]);
    assert.equal(s.h.get("cache-control"), "no-store"); assert.match(s.h.get("x-robots-tag"), /noindex/); assert.match(s.h.get("content-security-policy"), /script-src 'self'(?!.*unsafe-inline)/);
  }
  assert.equal((await buka("/siklus", UDARA.h)).s, 403, "sesi tanpa peran: 403, bukan 303");
});
uji("/siklus/kejadian/:id: tamu menerima publik.html, staf menerima index.html; di centurisk97.id juga terbuka (dikecualikan dari gerbang host)", async () => {
  const j = `/siklus/kejadian/${KJ}`;
  const t = await buka(j); assert.equal(t.s, 200); assert.equal(t.t, ASET["/siklus/publik.html"]); assert.equal(t.h.get("cache-control"), "no-store");
  assert.equal((await buka(j, PD.h)).t, ASET["/siklus/index.html"]);
  assert.equal((await buka(j, UDARA.h)).t, ASET["/siklus/publik.html"], "sesi tanpa peran Siklus: ringkasan publik saja");
  const h = await buka(j, {}, "https://centurisk97.id"); assert.equal(h.s, 200); assert.equal(h.t, ASET["/siklus/publik.html"]);
  assert.equal((await buka("/siklus/kejadian", {}, "https://centurisk97.id")).s, 303, "daftar tetap wajib sesi di host terkunci");
});
uji("jalur tak dikenal di bawah /siklus 404; publik.html dan id salah format tidak terbuka; metode tulis 405", async () => {
  for (const j of ["/siklus/publik.html", "/siklus/foo", "/siklus/foo.html", "/siklus/kejadian/abc", "/siklus/kejadian/KJ-2026-9A2WGN3I", "/siklus/kaji/xyz", "/siklus/data/x.exe"]) assert.equal((await buka(j, PD.h)).s, 404, j);
  const p = await U.mf.dispatchFetch("http://bnpb.lokal/siklus", {method: "POST", headers: PD.hp}); assert.equal(p.status, 405); await p.text();
});
uji("PUBLIK_TANPA_SESI mencatat /siklus/kejadian dengan alasan", () => {
  assert.ok(PUBLIK_TANPA_SESI.has("/siklus/kejadian")); assert.ok(PUBLIK_TANPA_SESI.get("/siklus/kejadian").length > 40);
  assert.ok(![...PUBLIK_TANPA_SESI.keys()].includes("/siklus"), "halaman staf tidak masuk daftar putih");
});
