/* sekitar(): rumah ibadah dari berkas lokal ibadah/<prov>.json, tanpa Overpass. Jalankan: node --test tests/lapor/sekitar_ibadah.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {buatInfo} from "../../src/lapor_info.js";

const L = {lat: -6.2, lon: 106.8, wilayah: {provKode: "ZZ"}};
const buat = data => buatInfo({muat: async j => { if (j in data) return data[j]; throw new Error("404"); }, wilayah: {}});
test.beforeEach(() => { globalThis.fetch = () => Promise.reject(new Error("Overpass mati")); });

test("ibadah lokal muncul, tidak sebagian walau Overpass gagal", async () => {
  const [s, j] = await buat({"/data/osm_nasional/ibadah/ZZ.json": [[-6.201, 106.801, "Masjid Al-Ikhlas"], [-7, 107, "Masjid Jauh"]]}).sekitar({jenis: "ibadah", q: "masjid rusak"}, {...L, lat: -6.2001}, null);
  assert.equal(s, 200); assert.deepEqual(j.tempat.map(x => x.nama), ["Masjid Al-Ikhlas"]); assert.equal(j.sebagian, false);
});
test("tanpa berkas ibadah tetap jalan, ditandai sebagian, jenis lain tak terganggu", async () => {
  const b = buat({"/data/osm_nasional/YY.json": {sekolah: [[-6.2, 106.8, "SDN 1"]]}});
  const [s, j] = await b.sekitar({jenis: "ibadah", q: ""}, {...L, lat: -6.21, lon: 106.8, wilayah: {provKode: "YY"}}, null);
  assert.equal(s, 200); assert.equal(j.sebagian, true); assert.deepEqual(j.tempat, []);
  const [, k] = await b.sekitar({jenis: "sekolah", q: ""}, {...L, lat: -6.2, lon: 106.8, wilayah: {provKode: "YY"}}, null);
  assert.equal(k.tempat[0].nama, "SDN 1");
});
