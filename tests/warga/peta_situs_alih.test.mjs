/* PS-10: pensiun dan alih halaman lama menurut bawaan Q1-Q5 KEPUTUSAN-PETA-SITUS (diterima pemilik 25 Nov 2026).
   Q1: /warga 301 ke /lapor, tujuan tetap (query dibuang, bukan pengalih terbuka). Q3: /laporan-konsesi dibuka tamu di Centurisk97.
   Q5: /presiden tetap publik. Worker utuh di workerd (TEST.md: tanpa mock). Jalankan: node --test tests/warga/peta_situs_alih.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "./_bnpb.mjs";

const uji = berantai();
const {mf} = await siapkan("uji-peta-alih");
const buka = (url, h = {}) => mf.dispatchFetch(url, {redirect: "manual", headers: h});

uji("Q1: /warga, /warga/, /warga/index.html 301 ke /lapor/ tanpa membawa query", async () => {
  for (const j of ["/warga", "/warga/", "/warga/index.html", "/warga?ke=//jahat.example", "/warga/?next=https://jahat.example"]) {
    const r = await buka("https://centurisk97.id" + j); await r.text();
    assert.equal(r.status, 301, j);
    assert.equal(r.headers.get("location"), "/lapor/", j);
  }
  const p = await buka("https://pantau.terasurban.com/warga/index.html"); await p.text();
  assert.equal(p.status, 301); assert.equal(p.headers.get("location"), "/lapor/");
});

uji("Q1: jalur mirip /warga tidak ikut dialihkan", async () => {
  for (const j of ["/wargaku", "/warga/lain"]) {
    const r = await buka("https://centurisk97.id" + j); await r.text();
    assert.ok(!/^\/lapor/.test(r.headers.get("location") || ""), j);
  }
});

uji("LR-01: /lapor 301 ke /lapor/ (cakupan service worker) dengan query utuh, /lapor/ dan /lapor/lacak tidak dialihkan", async () => {
  for (const [j, ke] of [["/lapor", "/lapor/"], ["/lapor?ke=%2Fx&t=ab", "/lapor/?ke=%2Fx&t=ab"], ["/lapor?", "/lapor/"]]) {
    for (const method of ["GET", "HEAD"]) {
      const r = await mf.dispatchFetch("https://centurisk97.id" + j, {method, redirect: "manual"}); await r.text();
      assert.equal(r.status, 301, method + " " + j); assert.equal(r.headers.get("location"), ke, method + " " + j);
    }
  }
  const p = await mf.dispatchFetch("https://centurisk97.id/lapor", {method: "POST", redirect: "manual"}); await p.text();
  assert.notEqual(p.status, 301, "POST /lapor tidak dialihkan");
  for (const j of ["/lapor/", "/lapor/?t=ab", "/lapor/lacak"]) {
    const r = await buka("https://centurisk97.id" + j); await r.text();
    assert.equal(r.status, 200, j);
  }
  const w = await buka("https://centurisk97.id/warga"); await w.text();
  const r = await buka("https://centurisk97.id" + w.headers.get("location")); await r.text();
  assert.equal(r.status, 200, "/warga sampai /lapor/ tanpa lompatan kedua");
});

uji("Q3: /laporan-konsesi terbuka untuk tamu di centurisk97.id, berkas .html langsung tetap terkunci", async () => {
  const r = await buka("https://centurisk97.id/laporan-konsesi"); await r.text();
  assert.equal(r.status, 200);
  const l = await buka("https://centurisk97.id/laporan_konsesi.html"); await l.text();
  assert.equal(l.status, 303);
  assert.match(l.headers.get("location"), /^\/masuk\?ke=/);
});

uji("Q5: /presiden tetap publik dan bisa disematkan", async () => {
  const r = await buka("https://centurisk97.id/presiden"); await r.text();
  assert.equal(r.status, 200);
  assert.notEqual(r.headers.get("x-frame-options"), "SAMEORIGIN");
});
