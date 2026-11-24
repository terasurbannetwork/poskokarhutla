/* Poster QR desa (KEPUTUSAN-LAPOR-AI K92, D131-D133; TIKET LA-84; RENCANA-UJI §23 bagian cetak): fungsi murni public/lapor/poster.js
   dengan data publik sungguhan (desa_cari.json, bpbd_kontak.json). Jalankan: node --test tests/lapor/poster.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {isiPoster, desaDi, tautanPoster} from "../../public/lapor/poster.js";

const D = JSON.parse(fs.readFileSync(new URL("../../public/data/desa_cari.json", import.meta.url)));
const K = JSON.parse(fs.readFileSync(new URL("../../public/data/bpbd_kontak.json", import.meta.url)));

test("tautan poster hanya 10 angka kode desa", () => {
  assert.equal(tautanPoster("https://x.id", "32.01.01.1001"), "https://x.id/lapor/?d=3201011001");
});
test("desa satu kecamatan: hanya kab dan kecamatan itu, urut nama", () => {
  const xs = desaDi(D.baris, "32.01", "Cibinong");
  assert.ok(xs.length > 5); assert.ok(xs.every(x => x.kd.startsWith("32.01.") && x.kec === "Cibinong"));
  assert.deepEqual(xs.map(x => x.desa), [...xs.map(x => x.desa)].sort((a, b) => a.localeCompare(b, "id")));
  assert.ok(!desaDi(D.baris, "32.0", "Cibinong").length, "awalan kab tidak boleh bocor ke kab lain");
});
test("isi poster: nomor BPBD hanya dari sumber tercatat, tanpa duplikat 117, tanpa data orang", () => {
  let adaKab = 0, tanpa = 0;
  for (const kab of Object.keys(D.kab)) {
    const x = desaDi(D.baris, kab)[0]; if (!x) continue;
    const p = isiPoster(x, {kabNama: D.kab[kab], provNama: ""}, K, "https://x.id");
    assert.match(p.url, /^https:\/\/x\.id\/lapor\/\?d=\d{10}$/);
    assert.deepEqual(Object.keys(p).sort(), ["bpbd", "desa", "kab", "kd", "kec", "url"]);
    if (!p.bpbd) { tanpa++; continue; }
    assert.notEqual(p.bpbd.nomor, "117");
    const tercatat = [K.wilayah[kab.replace(".", "")], K.wilayah[kab.slice(0, 2)]].flatMap(r => r?.bpbd || []).map(b => b.nomor);
    assert.ok(tercatat.includes(p.bpbd.nomor), `${kab}: ${p.bpbd.nomor} tidak ada di bpbd_kontak.json`);
    adaKab++;
  }
  assert.ok(adaKab > 100, `nomor BPBD tercatat untuk ${adaKab} kab`); assert.ok(tanpa >= 0);
});
