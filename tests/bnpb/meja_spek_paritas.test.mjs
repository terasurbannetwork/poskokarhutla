/* KP-17: server (validasi) dan peramban (periksa atas spekPublik, seperti public/bnpb/meja.js) menolak contoh yang sama dengan pesan yang sama. */
import test from "node:test";
import assert from "node:assert/strict";
import "../../src/worker.js";   // posko.js dan worker.js saling impor: worker dulu
import {MEJA, spekPublik, validasi} from "../../src/meja_spek.js";
import {periksa, dariMeja} from "../../public/inti/spek.js";

test("paritas server dan klien atas spekPublik", () => {
  const pub = JSON.parse(JSON.stringify(spekPublik())), KINI = Date.parse("2026-11-15T03:00:00Z");
  const contoh = [["dsp", {}], ["dsp", {setuju: "ya"}], ["logistik", {jumlah_kirim: 5, tgl_kirim: "2026-11-15", barang: "beras"}, "dikirim"], ["logistik", {jumlah_kirim: "x", tgl_kirim: "2026-11-15"}, "dikirim"], ["logistik", {jumlah_kirim: 5, tgl_kirim: "2026-02-30"}, "dikirim"], ["pengungsi", {kolom_liar: 1}]];
  let tolak = 0;
  for (const [id, isi, tahap = null] of contoh) {
    const s = validasi(id, isi, tahap, KINI), m = pub.meja.find(x => x.id === id), c = periksa(dariMeja({kolom: m.kolom}, {tahap}), isi, {kini: KINI});
    assert.equal(c.ok, !s.galat, `${id} ${JSON.stringify(isi)}`);
    if (s.galat) { tolak++; assert.equal(c.galat[0].pesan, s.galat, "pesan sama"); }
  }
  assert.ok(tolak >= 5, "contoh memang menolak");
  assert.ok(Object.keys(MEJA).length > 0);
});
