/* Halaman /desa-waspada publik (KEPUTUSAN-DESA K6, KEPUTUSAN-MASUK K20): di centurisk97.id (gerbang tertutup) tamu tanpa sesi dapat 200, bukan 303.
   Jalankan: node --test tests/warga/desa_waspada_rute.test.mjs */
import assert from "node:assert/strict";
import {siapkan, berantai} from "./_bnpb.mjs";
import "../../src/worker.js";

const uji = berantai();
const U = await siapkan("uji-desa-waspada", {});
const man = async (j, asal = "https://centurisk97.id") => { const r = await U.mf.dispatchFetch(asal + j, {redirect: "manual"}); const t = await r.text(); return {s: r.status, h: r.headers, t}; };

uji("desa-waspada: /desa-waspada dan /desa-waspada/ terbuka tanpa sesi di centurisk97.id", async () => {
  for (const j of ["/desa-waspada", "/desa-waspada/"]) {
    const r = await man(j); assert.equal(r.s, 200, j); assert.match(r.t, /desa-waspada\.js/, j);
  }
});

uji("desa-waspada: tetap 200 di host lokal; halaman lain tetap tertutup bagi tamu (gerbang tidak melebar)", async () => {
  assert.equal((await man("/desa-waspada", "http://bnpb.lokal")).s, 200);
  assert.equal((await man("/direktori")).s, 303, "gerbang default tertutup tidak berubah");
});

uji("desa-waspada: negatif di host terkunci, hanya jalur persisnya yang terbuka", async () => {
  assert.equal((await man("/desa-waspada/index.html")).s, 200);
  assert.equal((await man("/desa-waspada/x.html")).s, 303, "html lain di bawah folder tetap terkunci");
  const x = await man("/desa-waspada-x");
  assert.notEqual(x.s, 200); assert.doesNotMatch(x.t, /desa-waspada\.js/);
});
