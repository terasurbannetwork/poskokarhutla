/* Arsip titik per hari (data/titik_hari) sengaja tidak menulis tgl_wib dan hitung; sambungArsip di peta yang mengisinya.
   Tanpa itu semua hari arsip tampil nol padahal berkasnya berisi (bug 10 Nov 2026). */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html = readFileSync("public/index.html", "utf8");
const awal = html.indexOf("function sambungArsip()"), akhir = html.indexOf("async function muatArsip", awal);
const sumber = html.slice(awal, akhir);

test("baris arsip tujuh kolom mendapat tanggal hari arsip dan tanda terhitung", () => {
  assert.ok(awal > 0 && akhir > awal, "sambungArsip tidak ditemukan");
  const S = {arsip: new Map([["2026-10-24", {wilayah: ["14|Pelalawan|Kuala Kampar"], baris: [[0.4, 120.1, 0.5, 1, 1, 1, 0]]}]]), wilKunci: [], acuan0: new Date("2026-11-10T00:00:00Z"), titik: []};
  new Function("S", sumber + "\nsambungArsip();")(S);
  assert.equal(S.titik.length, 1);
  assert.equal(S.titik[0][7], "10-24");
  assert.equal(S.titik[0][8], 1);
  assert.equal(S.titik[0][6], 0);
});

test("berkas arsip memang tidak memuat tgl_wib dan hitung", () => {
  const j = JSON.parse(readFileSync("public/data/titik_hari/2026-10-24.json", "utf8"));
  assert.deepEqual(j.kolom, ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah"]);
});
