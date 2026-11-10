/* Siklus Bencana: lingkupKab4 (src/siklus_kab.js, DESAIN-TEKNIS 4.1). UJ di SK-018. Murni, tanpa DB. Jalankan: node --test tests/warga/siklus_kab.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";
import {NAMA_KAB4, lingkupKab4, daftarKab4} from "../../src/siklus_kab.js";

const kota = JSON.parse(readFileSync(path.join(AKAR, "scripts/udara/kota.json"), "utf8"));
const iKode = kota.kolom.indexOf("kode"), iKab = kota.kolom.indexOf("kab");

uji("NAMA_KAB4 sama persis dengan kolom kode dan kab scripts/udara/kota.json", () => {
  const dari = Object.fromEntries(kota.baris.map(r => [r[iKode], r[iKab]]));
  assert.deepEqual({...NAMA_KAB4}, dari);
  assert.equal(Object.keys(NAMA_KAB4).length, 514);
  assert.ok(Object.isFrozen(NAMA_KAB4));
});

const kab = (prov, nama) => ({tingkat: "kab", prov, kab: nama, cakupan: JSON.stringify([prov])});
const prov = (...p) => ({tingkat: "prov", prov: p[0], kab: null, cakupan: JSON.stringify(p)});

uji("akun kab: kabupaten sendiri lolos (huruf besar kecil tak dibedakan), tetangga dan provinsi lain ditolak", () => {
  const bogor = kab("32", "Bogor");
  assert.equal(lingkupKab4(bogor, "3201"), true);
  assert.equal(lingkupKab4(kab("32", "BOGOR"), "3201"), true);
  assert.equal(lingkupKab4(bogor, "3216"), false, "Kab. Bekasi tetangga");
  assert.equal(lingkupKab4(bogor, "3271"), false, "Kota Bogor bernama 'Kota Bogor', bukan 'Bogor'");
  assert.equal(lingkupKab4(bogor, "3301"), false, "provinsi lain");
  assert.equal(lingkupKab4(kab("33", "Bogor"), "3201"), false, "provinsi akun tidak cocok walau nama sama");
});

uji("akun prov: provinsi sendiri lolos, provinsi lain ditolak, cakupan banyak provinsi", () => {
  assert.equal(lingkupKab4(prov("32"), "3201"), true);
  assert.equal(lingkupKab4(prov("32"), "3275"), true);
  assert.equal(lingkupKab4(prov("32"), "3301"), false);
  assert.equal(lingkupKab4(prov("32", "33"), "3301"), true);
  assert.equal(daftarKab4(prov("33")).every(k => k.startsWith("33")), true);
  assert.equal(daftarKab4(prov("33")).length, Object.keys(NAMA_KAB4).filter(k => k.startsWith("33")).length);
});

uji("kab4 tak dikenal, null, bukan 4 digit, dan akun rusak ditolak", () => {
  for (const salah of [null, undefined, "", "320", "32011", "32a1", "9999", "0000", 3201, {}, [], "32 01"]) {
    assert.equal(lingkupKab4(prov("32"), salah), false, String(salah));
    assert.equal(lingkupKab4(kab("32", "Bogor"), salah), false, String(salah));
  }
  assert.equal(lingkupKab4(null, "3201"), false);
  assert.equal(lingkupKab4({tingkat: "prov", cakupan: "bukan json"}, "3201"), false);
  assert.equal(lingkupKab4({tingkat: "prov", cakupan: '"32"'}, "3201"), false, "cakupan bukan larik");
  assert.equal(lingkupKab4({tingkat: "lain", cakupan: '["32"]', prov: "32", kab: "Bogor"}, "3201"), false);
  assert.equal(lingkupKab4({tingkat: "kab", prov: "32", kab: null}, "3201"), false);
  assert.equal(lingkupKab4(prov("32"), "constructor"), false, "kunci prototipe");
});
