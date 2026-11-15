/* Pesan layar. Jalankan: node --test tests/inti/pesan.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const SRC = readFileSync(new URL("../../public/inti/pesan.js", import.meta.url), "utf8");
const ctx = {}; ctx.window = ctx; vm.runInNewContext(SRC, ctx);
const P = ctx.PesanLayar;

test("tetapan", () => {
  assert.equal(P.KOSONG, "–"); assert.equal(P.MASUK_WA, "Masuk dengan nomor WhatsApp");
  assert.equal(P.MENUNGGU, "Menunggu pemeriksaan"); assert.equal(P.LURING, "Tidak ada koneksi.");
});
test("tunggu: batas 89/90 detik, bulat ke atas", () => {
  assert.equal(P.tunggu(89), "89 detik"); assert.equal(P.tunggu(90), "2 menit"); assert.equal(P.tunggu(120), "2 menit");
  assert.equal(P.tunggu(121), "3 menit"); assert.equal(P.tunggu(3600), "60 menit"); assert.equal(P.tunggu(1), "1 detik");
  assert.equal(P.tunggu(1500 * 60), "1.500 menit");
});
test("galat: putus, 429 dengan dan tanpa retry, pesan server, bawaan", () => {
  assert.equal(P.galat(0, "x"), "Tidak ada koneksi.");
  assert.equal(P.galat(429, "x", 30), "Terlalu sering. Coba lagi 30 detik lagi.");
  assert.equal(P.galat(429, "x", 600), "Terlalu sering. Coba lagi 10 menit lagi.");
  assert.equal(P.galat(429), "Terlalu sering. Coba lagi nanti."); assert.equal(P.galat(429, null, 0), "Terlalu sering. Coba lagi nanti.");
  assert.equal(P.galat(400, "Nomor salah."), "Nomor salah."); assert.equal(P.galat(500, ""), "Gagal. Coba lagi.");
  assert.equal(P.galat(500, "  "), "Gagal. Coba lagi."); assert.equal(P.galat(500, 5), "Gagal. Coba lagi.");
});
test("tanggal: zona WIB di sekitar tengah malam UTC", () => {
  assert.equal(P.tanggal(Date.UTC(2026, 10, 15, 12)), "15 Nov 2026");
  assert.equal(P.tanggal(Date.UTC(2026, 10, 14, 16, 59, 59)), "14 Nov 2026");   // 23:59:59 WIB
  assert.equal(P.tanggal(Date.UTC(2026, 10, 14, 17, 0, 0)), "15 Nov 2026");     // 00:00 WIB
  assert.equal(P.tanggal(Date.UTC(2026, 11, 31, 17, 0, 0)), "1 Jan 2027");
  assert.equal(P.tanggal(null), "–"); assert.equal(P.tanggal(NaN), "–"); assert.equal(P.tanggal(undefined), "–");
});
test("relatif: batas 59/60 detik, jam, 29/30 hari, kosong", () => {
  const k = Date.UTC(2026, 10, 15, 12);
  assert.equal(P.relatif(k - 59e3, k), "baru saja"); assert.equal(P.relatif(k - 60e3, k), "1 menit lalu");
  assert.equal(P.relatif(k - 3599e3, k), "59 menit lalu"); assert.equal(P.relatif(k - 3600e3, k), "1 jam lalu");
  assert.equal(P.relatif(k - 86399e3, k), "23 jam lalu"); assert.equal(P.relatif(k - 86400e3, k), "1 hari lalu");
  assert.equal(P.relatif(k - 29 * 86400e3, k), "29 hari lalu");
  assert.equal(P.relatif(k - 30 * 86400e3, k), P.tanggal(k - 30 * 86400e3));
  assert.equal(P.relatif(k + 5e3, k), "baru saja");
  assert.equal(P.relatif(null, k), "Belum pernah"); assert.equal(P.relatif(NaN, k), "Belum pernah");
  assert.match(P.relatif(Date.now() - 5e3), /baru saja/);
});
test("samar: empat terakhir, bentuk lama dinormalkan, pendek, kosong", () => {
  assert.equal(P.samar("628001234567"), "xxxxxxxx4567");
  assert.equal(P.samar("••••••••4567"), "xxxxxxxx4567"); assert.equal(P.samar("xxxxxxxx4567"), "xxxxxxxx4567");
  assert.equal(P.samar("12345"), "x2345"); assert.equal(P.samar("123"), "xxx"); assert.equal(P.samar("1234"), "xxxx");
  assert.equal(P.samar(null), "–"); assert.equal(P.samar(""), "–"); assert.equal(P.samar(628001234567), "xxxxxxxx4567");
  assert.doesNotMatch(P.samar("••••••••4567"), /[•·]/);
});
test("aman dimuat dua kali, sumber bersih", () => {
  const sama = ctx.PesanLayar; vm.runInNewContext(SRC, ctx); assert.equal(ctx.PesanLayar, sama);
  assert.doesNotMatch(SRC, /innerHTML|console\.|setInterval|setTimeout|document\.|·|•/);
});
