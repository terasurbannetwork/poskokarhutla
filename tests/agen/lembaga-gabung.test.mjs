/* Gerbang L00/L20: validator dan penggabung direktori lembaga benar-benar membuang kontak tanpa sumber dan menolak data rusak. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {bersihkan, gabung, telp, yakin} from "../../scripts/akademisi/lembaga_gabung.mjs";

const SAH = {id: "pmi-prov-riau", nama: "PMI Provinsi Riau", kategori: "kerelawanan", skala: "provinsi", prov: "14", kab: "Kota Pekanbaru",
  telepon: ["0761-123456"], email: ["pmi@riau.or.id"], web: "https://pmiriau.or.id", bidang: ["kesehatan", "ngarang"],
  sumber: [{butir: "telepon", url: "https://pmiriau.or.id/kontak"}, {butir: "email", url: "https://pmiriau.or.id/kontak"}], diperiksa: "2026-10-30"};

test("telepon dinormalkan ke E.164 atau nomor layanan pendek", () => {
  assert.equal(telp("0761-123456"), "+62761123456");
  assert.equal(telp("+62 (0) 21 345 6789"), "+62213456789");
  assert.equal(telp("115"), "115");
  assert.equal(telp("Bp. Iqbal"), null);
  assert.equal(telp("+1 202 555 0100"), null);
});

test("lembaga sah lolos, bidang asing dibuang", () => {
  const r = bersihkan(SAH);
  assert.ok(r.ok);
  assert.deepEqual(r.l.telepon, ["+62761123456"]);
  assert.deepEqual(r.l.bidang, ["kesehatan"]);
  assert.deepEqual(r.buang, []);
});

test("data rusak ditolak atau kontaknya dibuang", () => {
  assert.equal(bersihkan({...SAH, kategori: "ormas"}).ok, false);
  assert.equal(bersihkan({...SAH, nama: " "}).ok, false);
  const tanpa = bersihkan({...SAH, sumber: []});
  assert.ok(tanpa.ok);
  assert.deepEqual(tanpa.l.telepon, []);
  assert.deepEqual(tanpa.l.email, []);
  assert.ok(tanpa.buang.includes("telepon tanpa sumber"));
  assert.equal(bersihkan({...SAH, sumber: [{butir: "telepon", url: "javascript:alert(1)"}]}).l.telepon.length, 0);
  assert.equal(bersihkan({...SAH, web: "javascript:alert(1)"}).l.web, null);
  assert.equal(bersihkan({...SAH, web: 'https://x"onmouseover=alert(1)'}).l.web, null);
  assert.equal(bersihkan({...SAH, web: "https://x/\"><script>"}).l.web, null);
  assert.equal(bersihkan({...SAH, __proto__: {jahat: 1}, sisipan: "<b>"}).l.sisipan, undefined);
  assert.equal(bersihkan({...SAH, prov: "99"}).l.prov, null);
  assert.equal(bersihkan({...SAH, prov: "Riau"}).l.prov, "14");
  assert.equal(bersihkan({...SAH, pimpinan: {nama: "X", jabatan: "Ketua"}}).l.pimpinan, null);
  assert.equal(bersihkan({...SAH, lat: 40, lon: 10}).l.lat, null);
});

test("duplikat digabung dan lokasi diisi dari kantor BPBD", () => {
  const bpbd = [{nama: "BPBD PROVINSI", prov: "14", kab: "Kota Pekanbaru", lat: 0.5, lon: 101.4}, {nama: "KAMPAR", prov: "14", kab: "Kampar", lat: 0.3, lon: 101.1}];
  const {hasil, laporan} = gabung([SAH, {...SAH, id: "pmi-riau", telepon: ["0761-999999"], sumber: [{butir: "telepon", url: "https://x.id/k"}]},
    {...SAH, id: "pmi-kampar", nama: "PMI Kabupaten Kampar", skala: "kabkota", kab: "Kabupaten Kampar", web: null}, {...SAH, id: "x", kategori: "?"}], bpbd);
  assert.equal(hasil.length, 2);
  assert.equal(laporan.ditolak.length, 1);
  const riau = hasil.find(l => l.id === "pmi-prov-riau");
  assert.deepEqual(riau.telepon.sort(), ["+62761123456", "+62761999999"]);
  const kampar = hasil.find(l => l.id === "pmi-kampar");
  assert.deepEqual([kampar.lat, kampar.lokasi_sumber], [0.3, "kota"]);
});

test("skor yakin: sumber resmi dan lengkap = tinggi, tanpa sumber = rendah", () => {
  const kini = new Date("2026-10-30");
  const a = yakin({web: "https://pmiriau.or.id", sumber: [{url: "https://pmiriau.or.id/kontak"}], telepon: ["+62761"], pimpinan: {nama: "X"}, alamat: "Jl", lokasi_sumber: "alamat", diperiksa: "2026-10-30"}, kini);
  assert.equal(a.label, "tinggi"); assert.equal(a.skor, 1);
  const b = yakin({web: "https://x.id", sumber: [{url: "https://idalamat.com/x"}], telepon: ["+62761"], diperiksa: "2025-01-01"}, kini);
  assert.equal(b.label, "rendah");
});
