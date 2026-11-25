/* Genangan radar publik dari R2 (GS-14, Q13 "R2 aja"): src/banjir_genangan.js di worker.js utuh (Miniflare + R2).
   Jalankan: node --test tests/warga/banjir_genangan.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, kjAcak} from "./_siklus.mjs";
import {dirujuk} from "../../src/banjir_genangan.js";

const U = await mulai("uji-banjir-genangan");
const R2 = await U.mf.getR2Bucket("MEDIA");
const tamu = (j, method = "GET") => U.mf.dispatchFetch("http://bnpb.lokal" + j, {method});
const A = kjAcak(2025), B = kjAcak(2026);
const kej = (kj, mulai, versi) => ({kj, mulai, versi, dibuat: mulai + "T00:00:00Z", ringkas: {kab_sah: 1}, kab: [
  {kab4: "1103", sah: true, sel: "1103_sel.geojson", citra: {radar_pra: {berkas: "1103_radar_pra.png"}, asli_pra: {status: "tertutup awan"}}},
  {kab4: "1104", sah: false, alasan: "sinyal lemah"}]});

uji("belum ada terbitan: 404, bukan daftar kosong", async () => {
  assert.equal((await tamu("/api/banjir/genangan")).status, 404);
});

uji("daftar dirangkai dari banjir/genangan/<KJ>.json, terbaru dulu; berkas hanya yang dirujuk versi yang sama", async () => {
  await R2.put(`banjir/genangan/${A}.json`, JSON.stringify(kej(A, "2025-11-26", 2)));
  await R2.put(`banjir/genangan/${B}.json`, JSON.stringify(kej(B, "2026-01-10", 1)));
  await R2.put(`banjir/genangan/KJ-UJI-X.json`, JSON.stringify(kej("KJ-UJI-X", "2027-01-01", 1)));   // bukan pola KJ resmi: tidak ikut
  await R2.put(`banjir/genangan/${A}/v2/1103_radar_pra.png`, new Uint8Array([137, 80, 78, 71]));
  await R2.put(`banjir/genangan/${A}/v2/1104_radar_pra.png`, new Uint8Array([1]));                    // ada di R2 tapi tidak dirujuk (kab tak sah)
  await R2.put(`banjir/genangan/${A}/v1/1103_radar_pra.png`, new Uint8Array([1]));                    // versi lama
  await R2.put(`banjir/genangan/${A}/v2/1103_sel.geojson`, "x".repeat(300_001));                      // melebihi batas
  const r = await tamu("/api/banjir/genangan");
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.deepEqual(d.kejadian.map(k => k.kj), [B, A]);
  assert.equal(d.yakin, "estimasi-model");
  assert.match(r.headers.get("cache-control"), /public, max-age=600/);
  assert.match((await tamu(`/api/banjir/genangan/${B}/v9/1103_radar_pra.png`)).headers.get("cache-control"), /max-age=60\b/);   // 404 ikut cache pendek
  const png = await tamu(`/api/banjir/genangan/${A}/v2/1103_radar_pra.png`);
  assert.equal(png.status, 200);
  assert.equal(png.headers.get("content-type"), "image/png");
  assert.equal((await tamu(`/api/banjir/genangan/${A}/v2/1104_radar_pra.png`)).status, 404);
  assert.equal((await tamu(`/api/banjir/genangan/${A}/v1/1103_radar_pra.png`)).status, 404);
  assert.equal((await tamu(`/api/banjir/genangan/${A}/v2/1103_sel.geojson`)).status, 413);
  assert.equal((await tamu(`/api/banjir/genangan/${A}/v2/../x.png`)).status, 404);
  assert.equal((await tamu(`/api/banjir/genangan/${A}/v02/1103_radar_pra.png`)).status, 404);   // alias bernol tidak menggandakan kunci cache
  assert.equal((await tamu(`/api/banjir/genangan/KJ-UJI-X/v1/1103_radar_pra.png`)).status, 404);
  assert.equal((await tamu("/api/banjir/genangan", "POST")).status, 405);
  assert.equal((await tamu(`/api/banjir/genangan/${A}/v2/1103_radar_pra.png`, "HEAD")).status, 200);
});

uji("rute sungai SIHKA tetap dilayani sesudah rute genangan", async () => {
  assert.notEqual((await tamu("/api/banjir/sungai-ukur")).status, 404);
});

uji("dirujuk: hanya sel dan citra.*.berkas", () => {
  const k = kej(A, "2025-11-26", 2);
  assert.ok(dirujuk(k, "1103_sel.geojson") && dirujuk(k, "1103_radar_pra.png"));
  assert.ok(!dirujuk(k, "1103_asli_pra.png") && !dirujuk(null, "x"));
});
