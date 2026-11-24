/* Jalur tinjau lokal data lanjutan (scripts/lapor/lokal_data.mjs): Worker asli di Miniflare, penyimpanan di HOME sementara (bukan ~/.lapor-lokal asli).
   Jalan: node --test tests/lapor/lokal_data.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), "lapor-lokal-"));
const L = await import("../../scripts/lapor/lokal_data.mjs");

test("berkas-uji lalu masuk dengan tautan ketua dan baca berkas", async () => {
  const r = await L.berkasUji(), t = /t=([0-9a-f]{32})/.exec(r.tautan)?.[1]; assert.ok(t, r.tautan);
  const srv = http.createServer((q, s) => L.layani(q, s, new URL(q.url, "http://x"))); await new Promise(r => srv.listen(0, "127.0.0.1", r)); const p = srv.address().port, U = "http://127.0.0.1:" + p;
  try {
    const m = await fetch(U + "/api/lapor/data/masuk", {method: "POST", headers: {"x-pb": "1", "content-type": "application/json", origin: U}, body: JSON.stringify({t})});
    assert.equal(m.status, 200); const kuki = m.headers.get("set-cookie").split(";")[0]; assert.match(kuki, /^lapor_data=/);
    const b = await fetch(U + "/api/lapor/data/berkas", {headers: {cookie: kuki}}); assert.equal(b.status, 200);
    assert.equal((await fetch(U + "/api/lapor/data/daftar")).status, 200, "staf lokal tanpa kuki");
  } finally { srv.close(); await (await L.mulai()).mf.dispose(); }
});
