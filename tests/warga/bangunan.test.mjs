/* Paparan bangunan (src/bangunan.js) di workerd + R2 lokal sungguhan lewat tests/warga/_bangunan_worker.mjs. Berkas hanya untuk pengguna masuk. */
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync} from "node:fs";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, GERBANG} from "./_bnpb.mjs";

const U = await siapkan("uji-bangunan", {r2: true, skrip: "tests/warga/_bangunan_worker.mjs"}), uji = berantai(), {mf, api} = U;
const R2 = await mf.getR2Bucket("MEDIA");
const RUTE = ["/api/bangunan/terpapar", "/api/bangunan/kec", "/api/bangunan/grid?prov=62"];
const ISI = {terpapar: {kompleks: [{id: "k1", bangunan: 1234}]}, kec: {kec: {"62|01|01": 7}}, grid_62: {sel: [[1, 2, 3]]}};

uji("GET /api/bangunan/*: tanpa masuk atau token salah ditolak 403, bahkan saat berkas ada", async () => {
  await R2.put("bangunan/terpapar.json", JSON.stringify(ISI.terpapar));
  for (const j of RUTE) {
    assert.equal((await api("GET", j)).s, 403, `${j} tanpa token`);
    assert.equal((await api("GET", j, undefined, {"x-admin-token": "salah"})).s, 403, `${j} token salah`);
  }
  const r = await api("GET", "/api/bangunan/terpapar");
  assert.ok(!r.t.includes("1234"), "isi berkas tidak boleh bocor ke tamu");
  assert.equal((await api("GET", "/api/bangunan/grid?prov=zz")).s, 403, "kode salah tanpa auth tetap 403, bukan 400");
});

uji("GET /api/bangunan/grid: kode provinsi salah DITOLAK 400", async () => {
  for (const p of ["", "6", "620", "99", "00", "../x", "62/../11", "6a", "%36%32%00"]) {
    const r = await api("GET", "/api/bangunan/grid?prov=" + p, undefined, ADMIN);
    assert.equal(r.s, 400, `prov=${JSON.stringify(p)} harus 400, dapat ${r.s}`);
  }
  assert.equal((await api("GET", "/api/bangunan/grid", undefined, ADMIN)).s, 400, "tanpa prov");
});

uji("GET /api/bangunan/*: berkas belum diunggah = 404 berpesan jelas", async () => {
  for (const j of ["/api/bangunan/kec", "/api/bangunan/grid?prov=11"]) {
    const r = await api("GET", j, undefined, ADMIN);
    assert.equal(r.s, 404, `${j} -> ${r.s}`); assert.match(r.j.galat, /pipeline belum berjalan/);
  }
});

uji("GET /api/bangunan/*: berkas ada = 200 isi sama persis, private no-store (akun situs juga boleh)", async () => {
  await R2.put("bangunan/kec.json", JSON.stringify(ISI.kec));
  await R2.put("bangunan/grid_62.json", JSON.stringify(ISI.grid_62));
  for (const [j, k] of [["/api/bangunan/terpapar", "terpapar"], ["/api/bangunan/kec", "kec"], ["/api/bangunan/grid?prov=62", "grid_62"]]) {
    for (const h of [ADMIN, GERBANG]) {
      const r = await api("GET", j, undefined, h);
      assert.equal(r.s, 200, `${j} -> ${r.s} ${r.t.slice(0, 80)}`);
      assert.deepEqual(r.j, ISI[k]);
      assert.equal(r.h.get("cache-control"), "private, no-store");
      assert.match(r.h.get("content-type"), /^application\/json/);
    }
  }
  assert.equal((await api("GET", "/api/bangunan/grid?prov=63", undefined, ADMIN)).s, 404, "provinsi sah tapi grid-nya belum ada");
});

uji("kabel worker.js: RUTE_BANGUNAN digabung ke RUTE", () => {
  const w = readFileSync(path.join(AKAR, "src/worker.js"), "utf8");
  assert.match(w, /import \{RUTE_BANGUNAN\} from "\.\/bangunan\.js"/, "import hilang");
  assert.match(w, /\.\.\.RUTE_BANGUNAN/, "spread ke RUTE hilang");
});
