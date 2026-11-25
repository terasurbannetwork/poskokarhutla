/* SB-10: renlap OMC membedakan zona banjir (-B) dari karhutla: judul, alasan sasaran, nama berkas unduhan. */
import test from "node:test";
import assert from "node:assert/strict";
await import("../../public/renlap_omc.js");
const R = globalThis.RenlapOmcMurni;
const d = {sasaran: [{kab: "3172", nama: "Kota Jakarta Utara"}, {kab: "3275", nama: "Kota Bekasi"}]};
const zb = {id: "2026112512-BA", huruf: "A", kota: "lepas pantai dekat Kota Tangerang", prov: "Banten", alasan: {sasaran: ["3172", "3275"]}};
const zk = {id: "2026112512-A", huruf: "A", kota: "Palangka Raya", prov: "Kalimantan Tengah"};

test("zona -B: judul tujuan banjir dan alasan sasaran", () => {
  assert.ok(R.banjir(zb)); assert.ok(!R.banjir(zk));
  assert.deepEqual(R.namaSasaran(d, zb), ["Kota Jakarta Utara", "Kota Bekasi"]);
  assert.equal(R.judulRute(d, zb), "Rute OMC banjir zona A: cegat awan di hulu angin, sasaran Kota Jakarta Utara, Kota Bekasi");
  assert.equal(R.namaBerkas(zb), "Renlap OMC banjir zona A 2026112512");
  assert.doesNotMatch(R.judulRute(d, zb), /aman|akan hujan|mencegah banjir/i);
});

test("zona karhutla: judul dan nama berkas tetap seperti dulu", () => {
  assert.equal(R.judulRute(d, zk), "Rute OMC zona A: Palangka Raya, Kalimantan Tengah");
  assert.equal(R.namaBerkas(zk), "Renlap OMC zona A 2026112512");
});
