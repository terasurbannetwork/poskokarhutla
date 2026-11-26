/* DP-09: rute baca status prakiraan dan dampak peringatan (src/dampak_peringatan.js) di Miniflare dengan R2 sungguhan. RENCANA-UJI N15. */
import assert from "node:assert/strict";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import "../../src/worker.js";

const U = await siapkan("uji-dampak-peringatan", {r2: true}), uji = berantai();
const R2 = await U.mf.getR2Bucket("MEDIA");
const ip = n => ({"cf-connecting-ip": `10.8.0.${n}`});
const RINGKAS = {versi: 1, kab: {"1101": {nama: "Kab. Aceh Selatan", status: {BNJ: {s: 2}}, fasilitas: {sekolah_dapodik: 37, faskes_osm: null}, desa: {"x": 1}, titik: [1, 2]}}};

uji("objek belum terbit: belum_terukur, bukan nol (publik dan staf)", async () => {
  for (const j of ["ringkas", "status"]) {
    const r = await U.api("GET", `/api/dampak-peringatan/${j}`, undefined, ip(1));
    assert.equal(r.s, 200); assert.equal(r.j.belum_terukur, true); assert.ok(r.j.alasan);
  }
  const d = await U.api("GET", "/api/dampak-peringatan/desa?kab=1101", undefined, ADMIN);
  assert.equal(d.s, 200); assert.equal(d.j.belum_terukur, true);
});

uji("publik: ringkas tersaji tanpa kunci tingkat desa atau titik, fasilitas tetap hitungan", async () => {
  await R2.put("dampak_peringatan/ringkas.json", JSON.stringify(RINGKAS));
  const r = await U.api("GET", "/api/dampak-peringatan/ringkas", undefined, ip(2));
  assert.equal(r.s, 200); assert.equal(r.j.kab["1101"].nama, "Kab. Aceh Selatan");
  assert.equal(r.j.kab["1101"].fasilitas.sekolah_dapodik, 37); assert.equal(r.j.kab["1101"].fasilitas.faskes_osm, null);
  assert.ok(!/"desa"|"titik"/.test(r.t), "kunci desa/titik bocor");
  assert.match(r.h.get("cache-control") || "", /public, max-age=120/);
});

uji("N15: rute desa tanpa sesi 401; kab bukan empat digit 400; staf menerima berkas desa", async () => {
  await R2.put("dampak_peringatan/desa/1101.json", JSON.stringify({desa: [{kd: "1101012001", nama: "Contoh", fasilitas: {faskes_osm: [{nama: "Puskesmas X"}]}}]}));
  assert.equal((await U.api("GET", "/api/dampak-peringatan/desa?kab=1101", undefined, ip(3))).s, 401);
  for (const k of ["", "11", "11011", "abcd", "1101/../x"]) assert.equal((await U.api("GET", `/api/dampak-peringatan/desa?kab=${encodeURIComponent(k)}`, undefined, ADMIN)).s, 400, k);
  const r = await U.api("GET", "/api/dampak-peringatan/desa?kab=1101", undefined, ADMIN);
  assert.equal(r.s, 200); assert.equal(r.j.desa[0].nama, "Contoh"); assert.match(r.h.get("cache-control") || "", /no-store/);
});

uji("N15: publik tidak menyajikan jalur desa dan hanya GET", async () => {
  assert.equal((await U.api("POST", "/api/dampak-peringatan/ringkas", {}, ip(4))).s >= 400, true);
  assert.ok(!/Puskesmas X/.test((await U.api("GET", "/api/dampak-peringatan/status", undefined, ip(4))).t));
});

uji("objek rusak (bukan JSON) dijawab belum_terukur", async () => {
  await R2.put("dampak_peringatan/status.json", "{rusak");
  const r = await U.api("GET", "/api/dampak-peringatan/status", undefined, ip(5));
  assert.equal(r.s, 200); assert.equal(r.j.belum_terukur, true);
});

uji("publik: poligon peringatan BMKG dan nama kab lewat tanpa berubah, kunci desa tetap dibuang", async () => {
  const poligon = [[107.1, -6.2], [107.3, -6.2], [107.3, -6.4], [107.1, -6.2]];
  await R2.put("dampak_peringatan/ringkas.json", JSON.stringify({...RINGKAS, peringatan: [{id: "a", bahaya: "banjir", poligon}]}));
  const r = await U.api("GET", "/api/dampak-peringatan/ringkas", undefined, ip(6));
  assert.deepEqual(r.j.peringatan[0].poligon, poligon);
  assert.equal(r.j.kab["1101"].nama, "Kab. Aceh Selatan");
  assert.ok(!/"desa"|"titik"/.test(r.t));
});
