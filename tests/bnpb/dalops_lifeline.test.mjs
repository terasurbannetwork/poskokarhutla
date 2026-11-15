/* LF-07: ringkasan Status Lifeline di Pantau Dalops (public/bnpb/dalops_lifeline.js): hitungan per status, tanda lewat 24 jam, muat hanya saat dipanggil.
   Jalan: node --test tests/bnpb/dalops_lifeline.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
globalThis.window = globalThis;
await import("../../public/bnpb/dalops_lifeline.js");
const D = globalThis.DalopsLifeline;

test("ringkas: hitung sel per warna, abu untuk warna tak dikenal, basi terpisah dan tidak mengubah warna", () => {
  const l = (w, basi = false) => ({warna: w, basi});
  const r = D.ringkas({kab: [{kab4: "1101", layanan: {listrik: l("merah", true), sinyal: l("kuning"), air: l("hijau"), jalan: l("abu")}},
    {kab4: "1102", layanan: {listrik: l("ungu"), sinyal: l("merah", true)}}]});
  assert.deepEqual(r, {merah: 2, kuning: 1, hijau: 1, abu: 2, basi: 2, kab: 2, sel: 6});
  assert.deepEqual(D.ringkas(null), {merah: 0, kuning: 0, hijau: 0, abu: 0, basi: 0, kab: 0, sel: 0});
});

test("aktif: selesai, dibatalkan, digabung tidak ikut", () => {
  assert.deepEqual(["tanggap", "selesai", "dibatalkan", "digabung", "pemulihan"].filter(f => D.aktif({fase: f})), ["tanggap", "pemulihan"]);
});

test("ambil: satu panggilan daftar lalu satu kisi per kejadian aktif; jenis tanpa padanan tidak memanggil apa pun", async () => {
  const urls = [];
  globalThis.fetch = async u => { urls.push(u); const ok = j => ({ok: true, status: 200, json: async () => j});
    return u.includes("/lifeline") ? ok({kab: [{kab4: "1101", layanan: {listrik: {warna: "merah", basi: true}}}]}) : ok({baris: [{id: "KJ-1", fase: "tanggap"}, {id: "KJ-2", fase: "selesai"}]}); };
  assert.deepEqual(await D.ambil("tidak_ada"), {baris: [], lebih: 0}); assert.equal(urls.length, 0);
  const a = await D.ambil("banjir");
  assert.equal(urls.length, 2); assert.match(urls[0], /jenis=banjir/); assert.match(urls[1], /KJ-1\/lifeline$/);
  assert.equal(a.baris.length, 1); assert.equal(a.baris[0].ringkas.merah, 1);
  globalThis.fetch = async () => ({ok: false, status: 403});
  assert.match((await D.ambil("banjir")).galat, /staf/);
});

test("dalops.js memuat data hanya saat dibuka dan html memuat modul; tanpa titik tengah, tanpa kapital semua, tanpa warna literal", () => {
  const js = readFileSync("public/bnpb/dalops.js", "utf8"), mod = readFileSync("public/bnpb/dalops_lifeline.js", "utf8"), html = readFileSync("public/bnpb/dalops.html", "utf8");
  assert.match(js, /d\.open && !d\.dataset\.muat/); assert.match(html, /dalops_lifeline\.js/);
  assert.doesNotMatch(mod.replace(/\/\*[\s\S]*?\*\//, ""), /·|#[0-9a-f]{3,6}\b|text-transform/i);
});
