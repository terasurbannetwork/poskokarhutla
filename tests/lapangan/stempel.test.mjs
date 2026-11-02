import test from "node:test";
import assert from "node:assert/strict";
import {namaZona, teksWaktu, teksJam, tanggalLokal, barisStempel, potongLebar} from "../../public/petugas/stempel.js";

const T = Date.UTC(2026, 10, 1, 2, 25, 6);   // 1 Nov 2026 02:25:06 UTC = 09:25:06 WIB (hari Minggu)

test("namaZona: WIB, WITA, WIT, dan zona lain", () => {
  assert.deepEqual([420, 480, 540].map(namaZona), ["WIB", "WITA", "WIT"]);
  assert.equal(namaZona(0), "UTC+0");
  assert.equal(namaZona(-300), "UTC-5");
  assert.equal(namaZona(345), "UTC+5:45");
});

test("teksWaktu: hari, tanggal, jam 24 jam dengan detik, zona", () => {
  assert.equal(teksWaktu(T, 420), "Min, 01 Nov 2026 09:25:06 WIB");
  assert.equal(teksWaktu(T, 480), "Min, 01 Nov 2026 10:25:06 WITA");
  assert.equal(teksWaktu(Date.UTC(2026, 11, 31, 23, 59, 59), 420), "Jum, 01 Jan 2027 06:59:59 WIB");
});

test("teksJam dan tanggalLokal mengikuti offset perangkat", () => {
  assert.equal(teksJam(Date.UTC(2026, 10, 1, 0, 42), 420), "07.42 WIB");
  assert.equal(tanggalLokal(Date.UTC(2026, 10, 1, 17, 30), 420), "2026-11-02");
  assert.equal(tanggalLokal(Date.UTC(2026, 10, 1, 16, 59), 420), "2026-11-01");
});

test("barisStempel: empat baris, koordinat 5 desimal koma, akurasi, nama dan tugas dipisah koma", () => {
  const b = barisStempel({waktuMs: T, offsetMenit: 420, gps: {lat: -0.0579341, lon: 116.4225, akurasi: 8.4}, wilayah: "Kec. Kenohan, Kab. Kutai Kartanegara", nama: "Rina Wulandari", tugas: "Tugas Karhutla Kenohan"});
  assert.deepEqual(b, ["Min, 01 Nov 2026 09:25:06 WIB", "-0,05793 116,42250  ±8 m", "Kec. Kenohan, Kab. Kutai Kartanegara", "Rina Wulandari, Tugas Karhutla Kenohan"]);
});

test("barisStempel: selisih jam server dipakai; tidak ada titik tengah atau em dash", () => {
  const b = barisStempel({waktuMs: T, selisihMs: 90_000, offsetMenit: 420, gps: {lat: 1, lon: 2, akurasi: 5}, wilayah: "A", nama: "B", tugas: "C"});
  assert.equal(b[0], "Min, 01 Nov 2026 09:26:36 WIB");
  assert.ok(!/[·—•]/.test(b.join("\n")));
});

test("barisStempel: tanpa GPS, tanpa akurasi, tanpa nama atau tugas, spasi dirapikan", () => {
  assert.equal(barisStempel({waktuMs: T, offsetMenit: 420, gps: null, wilayah: "", nama: " Ani ", tugas: ""})[1], "Lokasi belum didapat");
  assert.equal(barisStempel({waktuMs: T, offsetMenit: 420, gps: {lat: 1, lon: 2}, wilayah: "x", nama: "A", tugas: "B"})[1], "1,00000 2,00000");
  const b = barisStempel({waktuMs: T, offsetMenit: 420, gps: {lat: NaN, lon: 2}, wilayah: "  Kab.   X  ", nama: " Ani ", tugas: ""});
  assert.equal(b[1], "Lokasi belum didapat"); assert.equal(b[2], "Kab. X"); assert.equal(b[3], "Ani");
  assert.equal(barisStempel({waktuMs: T, offsetMenit: 420, gps: null, wilayah: null, nama: null, tugas: null})[2], "Wilayah belum diisi");
});

test("potongLebar: utuh bila muat, dipotong dengan titik tiga bila tidak", () => {
  const ukur = t => t.length * 10;
  assert.equal(potongLebar("abc", 100, ukur), "abc");
  const p = potongLebar("abcdefghijklmnopqrstuvwxyz", 100, ukur);
  assert.ok(p.endsWith("...") && ukur(p) <= 100 && p.length > 3);
  assert.equal(potongLebar("abcdef", 20, ukur), "...");
});
