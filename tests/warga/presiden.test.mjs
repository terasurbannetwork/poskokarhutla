/* Panel /presiden (docs/presiden/KONTRAK.md): rute publik yang boleh di-iframe, feed sesuai kontrak, dan alarm basi di /api/status.
   worker.js utuh di workerd (Miniflare) dengan aset dari public/ apa adanya. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan} from "./_bnpb.mjs";

const U = await siapkan("uji-presiden");
const teks = f => readFileSync(path.join(AKAR, f), "utf8");

test("/presiden publik di host terkunci, boleh di-iframe dari mana saja, CSP frame-ancestors *", async () => {
  for (const host of ["https://centurisk97.id", "http://bnpb.lokal"]) {
    const r = await U.mf.dispatchFetch(host + "/presiden?w=situasi", {redirect: "manual"});
    assert.equal(r.status, 200, host);
    assert.equal(r.headers.get("x-frame-options"), null, host);
    const csp = r.headers.get("content-security-policy") || r.headers.get("content-security-policy-report-only");
    assert.match(csp, /frame-ancestors \*/, host);
    assert.ok((await r.text()).includes("/presiden.js"), host);
  }
});

test("/presiden.html dialihkan ke satu pintu /presiden dengan query utuh", async () => {
  const r = await U.mf.dispatchFetch("https://centurisk97.id/presiden.html?w=peta&lapis=asap", {redirect: "manual"});
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/presiden?w=peta&lapis=asap");
});

test("/api/status memantau umur panel presiden", async () => {
  const r = await U.api("GET", "/api/status");
  assert.ok(r.j?.sumber?.presiden, "sumber presiden ada di /api/status");
  assert.equal(r.j.sumber.presiden.ambang_jam, 8);
});

test("feed /data/presiden: CORS * dan isi sesuai kontrak", () => {
  assert.match(teks("public/_headers"), /\/data\/presiden\/\*\n\s+Access-Control-Allow-Origin: \*/);
  const mentah = teks("public/data/presiden/semua.json"), s = JSON.parse(mentah);
  assert.equal(s.versi, "presiden/1");
  assert.ok(mentah.length < 150_000, `semua.json ${mentah.length} byte melewati 150 KB`);
  assert.ok(!/walhi/i.test(mentah), "tanpa WALHI (keputusan pemilik 17 Okt)");
  assert.ok(!mentah.includes(" · ") && !mentah.includes("—"), "tanpa pemisah titik tengah dan em dash");
  assert.ok(!/9 provinsi prioritas/i.test(mentah));
  for (const w of s.widget) {
    assert.ok(["ok", "kosong", "basi"].includes(w.status), w.id);
    assert.ok(w.judul && w.label && w.sumber, `${w.id}: judul, label, sumber wajib`);
    assert.ok(!Number.isNaN(Date.parse(w.per)), `${w.id}: per bukan tanggal`);
    assert.ok((w.angka || []).length <= 4 && (w.baris || []).length <= 10 && (w.tindak_lanjut || []).length <= 3, w.id);
    if (w.status === "kosong") assert.deepEqual(w.baris, [], `${w.id}: kosong tanpa baris`);
    for (const a of w.angka || []) assert.ok(typeof a.nilai === "number" && Number.isFinite(a.nilai), `${w.id}: ${a.label} bukan angka`);
    if (w.id === "konsesi" && w.baris.length) assert.match(w.catatan, /bukan penetapan pelaku/);
  }
  const peta = teks("public/data/presiden/peta.json");
  assert.ok(peta.length < 400_000 && !/walhi/i.test(peta));
});
