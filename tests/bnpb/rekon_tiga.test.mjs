// LA-77: pencocok tiga sumber DIBI, logbook, Lapor Bencana (public/bnpb/rekon_tiga.js), jendela plus minus 3 hari.
import {test} from "node:test";
import assert from "node:assert/strict";
import "../../public/bnpb/rekon_tiga.js";
const {rekon, perluDilengkapi, pesanTagih} = globalThis.RekonTiga;
const B = (prov, kabN, kel, lo, hi, x = {}) => ({prov, kabN, kel, lo, hi, ...x});

test("satu kejadian di tiga sumber dalam jendela 3 hari: satu baris, ketiganya ada", () => {
  const r = rekon({dibi: [B("13", "kotapadang", "banjir", "2026-11-05")], logbook: [B("13", "kotapadang", "banjir", "2026-11-02", "2026-11-04", {nama: "Kota Padang"})],
    lapor: [B("13", "kotapadang", "banjir", "2026-11-07", "2026-11-07", {n: 2})]});
  assert.equal(r.length, 1); assert.deepEqual([r[0].dibi, r[0].logbook, r[0].lapor, r[0].mulai, r[0].akhir, r[0].nama], [true, true, 2, "2026-11-02", "2026-11-07", "Kota Padang"]);
  assert.equal(perluDilengkapi(r[0]), false);
});
test("lebih dari 3 hari terpisah: dua baris; kab atau jenis beda tidak bergabung", () => {
  const r = rekon({dibi: [B("13", "kotapadang", "banjir", "2026-11-01")], logbook: [B("13", "kotapadang", "banjir", "2026-11-05")],
    lapor: [B("13", "kotapadang", "longsor", "2026-11-01"), B("13", "agam", "banjir", "2026-11-01")]});
  assert.equal(r.length, 4);
  const lb = r.find(x => x.logbook); assert.equal(lb.dibi, false); assert.equal(perluDilengkapi(lb), true);
});
test("Lapor tanpa logbook perlu dilengkapi walau ada di DIBI; DIBI saja tidak", () => {
  const r = rekon({dibi: [B("13", "agam", "banjir", "2026-11-01"), B("13", "agam", "longsor", "2026-11-01")], lapor: [B("13", "agam", "banjir", "2026-11-02", null, {n: 1})]});
  assert.deepEqual(r.map(perluDilengkapi), [true, false]);
});
test("butir tanpa wilayah atau tanggal diabaikan; jumlah Lapor tidak dijumlah dengan sumber lain", () => {
  const r = rekon({lapor: [B("", "x", "banjir", "2026-11-01"), B("13", "agam", "banjir", "", null), B("13", "agam", "banjir", "2026-11-01", null, {n: 3})], dibi: []});
  assert.equal(r.length, 1); assert.equal(r[0].lapor, 3); assert.equal(r[0].dibi, false);
});
test("teks tagihan hanya jenis, kab, tanggal, sumber; tanpa isi laporan", () => {
  const [r] = rekon({lapor: [B("13", "agam", "banjir", "2026-11-01", null, {n: 1, nama: "Kabupaten Agam", rahasia: "Budi 0812"})]});
  const t = pesanTagih(r, "banjir");
  assert.match(t, /Kabupaten Agam/); assert.match(t, /2026-11-01/); assert.match(t, /DIBI/); assert.match(t, /laporan harian ke Pusdalops|DIBI/);
  assert.ok(!t.includes("Budi") && !t.includes("0812"));
});
