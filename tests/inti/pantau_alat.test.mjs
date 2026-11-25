// EWS U1 (tingkat, basi) dan U12 (seri putus pada celah) atas public/inti/pantau_alat.js; plus G3 ringkasan, G5 urutan.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../src/worker.js";                                  // urutan impor modul rute (sensor.js melingkar ke worker.js)
import {tingkatAmbang as tingkatServer} from "../../src/sensor.js";
import {tingkatAmbang, tingkat, basi, ringkasan, urut, seri, BATAS, INTERVAL, langkahHtml} from "../../public/inti/pantau_alat.js";
import {tindakanUntuk} from "../../public/ews_tindakan.js";

const KINI = Date.UTC(2026, 10, 25, 3, 0);
const AMB = {tinggi_cm: {waspada: 150, siaga: 200, awas: 250}};
const pos = o => ({id: "sensor:A", sumber: "sensor", jenis: "tma", nama: "A", waktu: KINI - 60e3, ambang: AMB, nilai: {tinggi_cm: 100}, ...o});

test("U1: tingkatAmbang sama persis dengan src/sensor.js", () => {
  const kasus = [
    [AMB, {tinggi_cm: 149.9}], [AMB, {tinggi_cm: 150}], [AMB, {tinggi_cm: 200}], [AMB, {tinggi_cm: 250}], [AMB, {tinggi_cm: 999}],
    [AMB, {tinggi_cm: null}], [AMB, {}], [AMB, null], [null, {tinggi_cm: 300}], [{}, {tinggi_cm: 300}],
    [{tinggi_cm: {siaga: 200}}, {tinggi_cm: 210}], [{tinggi_cm: null, hujan_mm: {awas: 50}}, {tinggi_cm: 1, hujan_mm: 50}],
    [{a: {waspada: 1}, b: {awas: 9}}, {a: 5, b: 9}], [{a: {waspada: 1}, b: {awas: 9}}, {a: 5, b: 8}], [AMB, {tinggi_cm: "300"}],
  ];
  for (const [a, n] of kasus) assert.deepEqual(tingkatAmbang(a, n), tingkatServer(a, n), JSON.stringify([a, n]));
  // definisinya pun harus sama teksnya (bukan hanya hasil pada contoh)
  const badan = f => f.toString().replace(/\s+/g, " ");
  assert.equal(badan(tingkatAmbang), badan(tingkatServer));
});

test("U1: tingkat dari ambang, termasuk nilai tepat di ambang dan nilai null", () => {
  assert.deepEqual(tingkat(pos({nilai: {tinggi_cm: 150}}), KINI), {kode: "waspada", label: "Waspada", kunci: "tinggi_cm"});
  assert.equal(tingkat(pos({nilai: {tinggi_cm: 250}}), KINI).kode, "awas");
  assert.equal(tingkat(pos({nilai: {tinggi_cm: 149}}), KINI).kode, "normal");
  assert.equal(tingkat(pos({nilai: {tinggi_cm: null}}), KINI), null);   // tidak dinilai, bukan normal, bukan 0
  assert.equal(tingkat(pos({nilai: null}), KINI), null);
});

test("U1: pos tanpa ambang -> null", () => {
  assert.equal(tingkat(pos({ambang: null}), KINI), null);
  assert.equal(tingkat(pos({ambang: {}}), KINI), null);
  assert.equal(tingkat(pos({ambang: undefined, nilai: {tinggi_cm: 9999}}), KINI), null);
});

test("U1: pos basi selalu tanpa_data, umur tepat di batas belum basi", () => {
  for (const j of ["tma", "hujan", "geofon"]) {
    assert.equal(basi(pos({jenis: j, waktu: KINI - BATAS[j]}), KINI), false, j);
    assert.equal(basi(pos({jenis: j, waktu: KINI - BATAS[j] - 1}), KINI), true, j);
  }
  const lama = pos({waktu: KINI - BATAS.tma - 1, nilai: {tinggi_cm: 0}});
  assert.deepEqual(tingkat(lama, KINI), {kode: "tanpa_data", label: "Tidak ada data terkini"});
  assert.equal(lama.nilai.tinggi_cm, 0);                               // basi tidak mengubah nilai
  assert.equal(tingkat(pos({waktu: null, nilai: {tinggi_cm: 300}}), KINI).kode, "tanpa_data");
  assert.equal(tingkat(pos({basi: true, nilai: {tinggi_cm: 300}}), KINI).kode, "tanpa_data");
  assert.equal(tingkat({sumber: "sihka", jenis: "tma", status: "lama", status_resmi: "Siaga 1", waktu: KINI}, KINI).kode, "tanpa_data");
});

test("U1: status resmi sumber luar apa adanya, tidak dipetakan", () => {
  const s = tingkat({sumber: "sihka", jenis: "tma", status: "biasa", status_resmi: "Siaga 1", waktu: KINI}, KINI);
  assert.equal(s.kode, "resmi"); assert.equal(s.label, "Siaga 1"); assert.match(s.pengelola, /SIHKA/);
  assert.equal(tingkat({sumber: "sihka", jenis: "tma", waktu: KINI}, KINI), null);
  const g = tingkat({sumber: "pvmbg", jenis: "level", status_resmi: "Siaga", waktu: KINI}, KINI);
  assert.equal(g.kode, "siaga"); assert.equal(g.label, "Siaga"); assert.match(g.pengelola, /PVMBG/);
});

test("G3: ringkasan menghitung dari daftar; semua sumber gagal -> null, bukan 0", () => {
  const daftar = [pos({nilai: {tinggi_cm: 210}}), pos({waktu: null}), pos({ambang: null}),
    {sumber: "sihka", jenis: "tma", status: "biasa", status_resmi: "Siaga 3", waktu: KINI}, {sumber: "sihka", jenis: "tma", status_resmi: "Normal", waktu: KINI}];
  assert.deepEqual(ringkasan(daftar, KINI, {kamera: 0}), {jumlah_pos: 5, di_atas_ambang: 2, terputus: 1, kamera: 0, gagal: []});
  assert.deepEqual(ringkasan([], KINI, {gagal: ["sensor"]}), {jumlah_pos: null, di_atas_ambang: null, terputus: null, kamera: null, gagal: ["sensor"]});
  assert.equal(ringkasan([], KINI).jumlah_pos, 0);
});

test("G5: urutan tingkat tertinggi, lalu basi, lalu nama", () => {
  const d = [pos({nama: "Zeta"}), pos({nama: "Basi", waktu: null}), pos({nama: "Waspada", nilai: {tinggi_cm: 160}}),
    pos({nama: "Awas", nilai: {tinggi_cm: 260}}), pos({nama: "Alfa", ambang: null})];
  assert.deepEqual(urut(d, KINI).map(p => p.nama), ["Awas", "Waspada", "Basi", "Alfa", "Zeta"]);
});

test("U12: seri putus pada celah lebih dari 2x interval, nilai kosong tidak jadi 0", () => {
  const i = INTERVAL.tma, t0 = KINI - 3600e3;
  const titik = [[t0, 1], [t0 + i, 2], [t0 + 3 * i, 3], [t0 + 3 * i + 2 * i + 1, 4], [t0 + 6 * i, null], [t0 + 7 * i, 5]];
  const s = seri(titik, i);
  // celah tepat 2x interval tetap menyambung; > 2x memutus; null memutus dan tidak digambar
  assert.deepEqual(s.map(g => g.map(t => t[1])), [[1, 2, 3], [4], [5]]);
  assert.deepEqual(seri([[t0 + i, 2], [t0, 1]], i).map(g => g.map(t => t[1])), [[1, 2]]);   // urut waktu
  assert.deepEqual(seri([], i), []); assert.deepEqual(seri(null, i), []); assert.deepEqual(seri(titik, 0), []);
  assert.ok(!s.flat().some(t => t[1] === 0));
});

test("U11 dini: tidak ada kata aman di modul", () => {
  const teks = readFileSync(new URL("../../public/inti/pantau_alat.js", import.meta.url), "utf8")
    .split("\n").filter(b => !/kata "aman" tidak pernah dipakai/.test(b)).join("\n");
  assert.doesNotMatch(teks, /\baman\b/i);
});

test("EW-09: langkahHtml memakai tingkat tertinggi, butir persis tangga; tanpa tingkat atau hanya status resmi SIHKA kosong", () => {
  const li = h => [...h.matchAll(/<li[^>]*>([^<]*)<\/li>/g)].map(m => m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  const awas = langkahHtml("banjir", [pos({nilai: {tinggi_cm: 160}}), pos({nilai: {tinggi_cm: 260}}), pos({waktu: KINI - 3600e3, nilai: {tinggi_cm: 999}})], KINI);
  assert.match(awas, /data-w="awas"/); assert.deepEqual(li(awas), tindakanUntuk("banjir", 3));
  const gsiaga = langkahHtml("gunungapi", [{id: "pvmbg:x", sumber: "pvmbg", nama: "G", waktu: KINI - 60e3, status_resmi: "Siaga", nilai: {level: 3}}], KINI);
  assert.deepEqual(li(gsiaga), tindakanUntuk("gunungapi", 2));
  assert.equal(langkahHtml("banjir", [pos({})], KINI), "", "normal: tanpa kotak");
  assert.equal(langkahHtml("banjir", [], KINI), "");
  assert.equal(langkahHtml("banjir", [{id: "sihka:1", sumber: "sihka", jenis: "tma", nama: "K", waktu: KINI - 60e3, status_resmi: "Siaga 1", nilai: {tinggi: 300}}], KINI), "", "Q7: SIHKA tidak dipetakan");
  assert.equal(langkahHtml("karhutla", [pos({waktu: KINI - 3600e3})], KINI), "", "pos basi tidak memicu");
});
