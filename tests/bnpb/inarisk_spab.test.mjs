// Cermin SPAB dan uji IRBI lawan DIBI (KEPUTUSAN-INARISK K6, IR-10): bentuk keluaran, bukan angka tetap (data berubah mingguan).
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const baca = n => JSON.parse(readFileSync(new URL(`../../public/data/inarisk/${n}.json`, import.meta.url), "utf8"));

test("spab.json: kode kab ada di IRBI, capaian 0..1, tanpa data pribadi", () => {
  const sp = baca("spab"), irbi = baca("irbi");
  assert.deepEqual(sp.kolom, ["sekolah", "pilar1", "pilar2", "pilar3", "capaian", "optimal", "belum", "tidak"]);
  const kode = Object.keys(sp.kab);
  assert.ok(kode.length > 400);
  for (const k of kode) {
    assert.ok(irbi.kab[k], `kode ${k} tak ada di IRBI`);
    const v = sp.kab[k];
    assert.ok(v[0] > 0, "kab tanpa sekolah melapor tidak boleh ditulis (belum ada data, bukan 0)");
    assert.ok(v[4] >= 0 && v[4] <= 1);
  }
  assert.ok(!JSON.stringify(sp).match(/alamat|lat|lon/i));
});

test("uji_dibi.json: dua dasar terpisah, vonis dari data", () => {
  const u = baca("uji_dibi");
  assert.ok(u.baris.length >= 10);
  assert.ok(u.baris.some(r => r.dasar === "HV2015") && u.baris.some(r => r.dasar === "HV2021"));
  assert.ok(u.baris.every(r => (r.dasar === "HV2021") === (r.tahun_irbi >= 2025)));
  assert.ok(u.vonis.some(t => /^HV2015, kejadian: IRBI lebih baik dari persistensi di \d+ dari \d+ tahun/.test(t)));
  assert.ok(u.vonis.every(t => !/aman/i.test(t)));
});
