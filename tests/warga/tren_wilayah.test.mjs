/* Kartu tren panel peta (public/index.html): 1-3 minggu per hari, 1-6 bulan per minggu, 1 tahun per bulan; pemilik 10 Nov 2026. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html = readFileSync("public/index.html", "utf8");
const awal = html.indexOf("const TREN_WIL ="), akhir = html.indexOf("function isiTrenWil", awal);
const hari = [...Array(400)].map((_, i) => new Date(Date.UTC(2026, 10, 10) - (399 - i) * 864e5).toISOString().slice(0, 10));
const S = {meta: {hari_wib: "2026-11-10"}, h30: {hari: hari.slice(-100), prov: {"62": Array(100).fill(1)}}, hPanjang: {i: new Map(hari.map((t, i) => [t, i])), prov: {"62": Array(400).fill(1)}}};
const {TREN_WIL, batangTren, trenPanjang} = new Function("S", html.slice(awal, akhir) + "\nreturn {TREN_WIL, batangTren, trenPanjang};")(S);

test("jumlah batang tiap rentang sesuai aturan pemilik", () => {
  const n = Object.fromEntries(TREN_WIL.map(r => [r[2], batangTren("62", r[0]).length]));
  assert.deepEqual(n, {"1 minggu": 7, "2 minggu": 14, "3 minggu": 21, "1 bulan": 4, "2 bulan": 8, "3 bulan": 12, "4 bulan": 16, "5 bulan": 20, "6 bulan": 24, "1 tahun": 12});
});

test("hari berakhir kemarin, minggu berisi 7 hari, tahun berakhir di bulan berjalan", () => {
  assert.equal(batangTren("62", "7h").at(-1).x, "9 Nov");
  assert.ok(batangTren("62", "4m").every(b => b.n === 7));
  const t = batangTren("62", "12b");
  assert.equal(t[0].x.slice(0, 3), "Des");
  assert.equal(t.at(-1).n, 9, "bulan berjalan dihitung sampai kemarin");
});

test("rentang di atas 3 bulan memakai arsip panjang", () => {
  assert.deepEqual(TREN_WIL.filter(r => trenPanjang(r[0])).map(r => r[2]), ["4 bulan", "5 bulan", "6 bulan", "1 tahun"]);
});
