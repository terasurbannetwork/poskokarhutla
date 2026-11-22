// Nomor BPBD untuk pelapor (K88): kab, lalu provinsi, lalu 117; tidak pernah nomor karangan.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {kontakBpbd, kontakDamkar, kalimatBpbd} from "../../src/lapor_kontak.js";

const data = {wilayah: {
  "3175": {nama: "Kota Adm. Jakarta Timur", bpbd: [{nomor: "021-1111111", jenis: "kantor"}, {nomor: "0811-2222222", jenis: "call_center"}], damkar: [{nomor: "021-1131131"}]},
  "33": {nama: "Jawa Tengah", bpbd: [{nomor: "024-333333", jenis: "kantor"}]},
  "3301": {nama: "Kab. Lama", bpbd: [{nomor: "0280-111111", jenis: "pusdalops", lama: true}, {nomor: "0280-222222", jenis: "kantor"}]},
}};

test("kab dengan nomor: call center didahulukan, kode bertitik dikenali", () => {
  const k = kontakBpbd(data, {kabKode: "31.75", provKode: "31", kab: "Kota Adm. Jakarta Timur"});
  assert.equal(k.tingkat, "kab"); assert.equal(k.nomor, "0811-2222222"); assert.deepEqual(k.lain, ["021-1111111"]);
  assert.match(kalimatBpbd(k), /BPBD Kota Adm\. Jakarta Timur\*: \*0811-222/);
});
test("nomor bertanda lama tidak dipakai; kab yang hanya punya nomor lama jatuh ke provinsi", () => {
  assert.equal(kontakBpbd(data, {kabKode: "3301", provKode: "33"}).nomor, "0280-222222");
  const d2 = {wilayah: {...data.wilayah, "3302": {nama: "Kab. Tua", bpbd: [{nomor: "0281-123456", jenis: "kantor", lama: true}]}}};
  const k = kontakBpbd(d2, {kabKode: "33.02", provKode: "33"});
  assert.equal(k.tingkat, "prov"); assert.equal(k.nomor, "024-333333");
});
test("data rusak tidak melempar galat (laporan tetap tersimpan)", () => {
  for (const bpbd of [5, "abc", [null], [{jenis: "kantor"}], [{nomor: 12345678}], [{nomor: "-"}]])
    assert.equal(kontakBpbd({wilayah: {"1101": {nama: "X", bpbd}}}, {kabKode: "11.01", provKode: "11"}).nomor, "117");
  assert.equal(kontakDamkar({wilayah: {"1101": {damkar: "x"}}}, {kabKode: "11.01"}), null);
});
test("kab tanpa nomor jatuh ke BPBD provinsi", () => {
  const k = kontakBpbd(data, {kabKode: "33.02", provKode: "33", prov: "Jawa Tengah"});
  assert.equal(k.tingkat, "prov"); assert.equal(k.nama, "BPBD Provinsi Jawa Tengah"); assert.equal(k.nomor, "024-333333");
});
test("tanpa data sama sekali: 117, kalimat jujur", () => {
  const k = kontakBpbd(data, {kabKode: "91.01", provKode: "91"});
  assert.equal(k.nomor, "117"); assert.match(kalimatBpbd(k), /belum tercatat/);
  assert.equal(kontakBpbd(null, null).nomor, "117");
});
test("damkar hanya bila tercatat", () => {
  assert.equal(kontakDamkar(data, {kabKode: "31.75"}).nomor, "021-1131131");
  assert.equal(kontakDamkar(data, {kabKode: "33.02"}), null);
});
test("berkas data nyata: tiap nomor bersumber .go.id dan berdigit wajar", () => {
  const D = JSON.parse(fs.readFileSync(new URL("../../data/kajian-bnpb/lapor-ai/riset/kontak-bpbd/bpbd_kontak_2026-11-22.json", import.meta.url)));
  let n = 0;
  for (const [k, r] of Object.entries(D.wilayah)) {
    assert.match(k, /^\d{2}(\d{2})?$/, k);
    for (const x of [...(r.bpbd || []), ...(r.damkar || [])]) {
      n++;
      assert.match(x.url, /^https?:\/\/[^/]*\.go\.id(\/|$)/, `${k} ${x.nomor}`);
      const d = x.nomor.replace(/\D/g, "");
      assert.ok(d.length >= 8 && d.length <= 14 && !/^(112|113|117|110)$/.test(d), `${k} ${x.nomor}`);
    }
  }
  assert.ok(n > 200);
});
