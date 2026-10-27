/* Uji unit langsung uraiDsda, uraiSipantau, tarikTeks (tanpa miniflare). Jalankan: node --test tests/warga/sungai_resmi_unit.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {uraiDsda, uraiSipantau, tarikTeks} from "../../src/sungai_resmi.js";

const F = n => readFileSync(new URL("./fixtures/" + n, import.meta.url), "utf8");
const dsda = JSON.parse(F("dsda_dki_datatmalaststatus.json")), sip = JSON.parse(F("sipantau_posduga.json"));
const pos = (o = {}) => ({ID_PINTU_AIR: "1", NAMA_PINTU_AIR: "A", LATITUDE: -6.2, LONGITUDE: 106.8, SIAGA1: 2000, SIAGA2: 1500, SIAGA3: 800, TINGGI_AIR: 100, TANGGAL: "2026-10-27T10:00:00", STATUS_SIAGA: "Status : Normal", ...o});
const sipJ = (lok, map) => JSON.stringify({data: {lokasi: lok, lokasi_map: map}});
const sp = (id, o = {}, c = [106.6, -6.2]) => [{id, nama: "P", minimum_3: 10, minimum_2: 20, minimum_1: 30, ...o}, {data: {id}, geometry: {coordinates: c}}];

test("fixture nyata terurai", () => {
  assert.ok(uraiDsda(JSON.stringify(dsda)).length >= 30);
  assert.ok(uraiSipantau(JSON.stringify(sip)).length >= 20);
});
test("koordinat Malaysia/Filipina ditolak, hulu Bogor lolos (DSDA)", () => {
  assert.equal(uraiDsda(JSON.stringify([pos({LATITUDE: 3.1, LONGITUDE: 101.7})])).length, 0);
  assert.equal(uraiDsda(JSON.stringify([pos({LATITUDE: 14.6, LONGITUDE: 121})])).length, 0);
  assert.equal(uraiDsda(JSON.stringify([pos({LATITUDE: -6.7, LONGITUDE: 106.99})])).length, 1);
});
test("DSDA: nama dipotong 80 per code point, ambang dan v tak wajar", () => {
  const o = uraiDsda(JSON.stringify([pos({NAMA_PINTU_AIR: "😀".repeat(100)})]))[0];
  assert.equal([...o.nama].length, 80); assert.ok(!/[\ud800-\udbff]$/.test(o.nama));
  const x = uraiDsda(JSON.stringify([pos({SIAGA1: 2e6, SIAGA2: 1e6, SIAGA3: 5e5, TINGGI_AIR: 5e7})]))[0];
  assert.deepEqual([x.a1, x.a2, x.a3, x.v], [null, null, null, null]);
  assert.equal(uraiDsda(JSON.stringify([pos({TINGGI_AIR: -500})]))[0].v, -50);
});
test("DSDA: 5000 entri terurai utuh (pemotongan 500 ada di satu())", () => {
  assert.equal(uraiDsda(JSON.stringify(Array.from({length: 5000}, (_, i) => pos({ID_PINTU_AIR: String(i)})))).length, 5000);
});
test("SIPANTAU: pola id, nama 80, koordinat Malaysia, ambang tak wajar", () => {
  const [a, b] = sp("ok-1"), [c, d] = sp("id aneh;--"), [e, f] = sp("my", {}, [101.7, 3.1]), [g, h] = sp("x".repeat(38)), [i, j] = sp("n1", {nama: "n".repeat(300), minimum_3: 1e9, ketinggian: 1});
  const out = uraiSipantau(sipJ([a, c, e, g, i], [b, d, f, h, j]));
  assert.deepEqual(out.map(p => p.id), ["t:ok-1", "t:n1"]);
  assert.equal(out[1].nama.length, 80); assert.equal(out[1].a3, null);
});
test("SIPANTAU: v tak wajar menjadi null", () => {
  const [a, b] = sp("v1"); a.sensor_record_latest = {ketinggian_air: 9e9};
  assert.equal(uraiSipantau(sipJ([a], [b]))[0].v, null);
});
test("tarikTeks: batas per panggilan, redirect 302 ditolak", async () => {
  const asli = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("x".repeat(300e3));
    await assert.rejects(tarikTeks("https://x", () => {}, 256e3), /terlalu besar/);
    assert.equal((await tarikTeks("https://x", () => {})).length, 300e3);
    globalThis.fetch = async () => new Response(null, {status: 302, headers: {location: "http://127.0.0.1/"}});
    await assert.rejects(tarikTeks("https://x", () => {}), /HTTP 302/);
  } finally { globalThis.fetch = asli; }
});
