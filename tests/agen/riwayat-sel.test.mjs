// Tren lokasi & prakiraan di laci cluster (public/riwayat_sel.js): kunci ubin harus sama dengan scripts/data/riwayat_sel.py,
// prakiraan sisa hari memakai episode yang sudah bertahan selama umur api, dan saran hanya muncul bila datanya mendukung.
import {test} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync, existsSync} from "node:fs";

const ctx = vm.createContext({window: {}});
vm.runInContext(readFileSync(new URL("../../public/riwayat_sel.js", import.meta.url), "utf8"), ctx);
const R0 = ctx.window.RiwayatSel;   // objek dari realm vm lain: disalin supaya deepEqual membandingkan isi, bukan prototipe
const R = {kunci: (...x) => structuredClone(R0.kunci(...x)), analisa: (...x) => structuredClone(R0.analisa(...x)), html: R0.html};
const meta = {th0: 2012, sd: "2026-10-12"};
// 2012..2026: El Niño 2015/2019/2023 besar; 2026 s.d. 12 Okt sudah 800
const rec = {y: [1, 1, 4, 1272, 0, 0, 1, 300, 0, 0, 0, 200, 0, 1, 800], yd: [1, 1, 1, 718, 0, 0, 0, 250, 0, 0, 0, 150, 0, 1, 800],
  m: [0, 0, 0, 1, 0, 1, 0, 10, 291, 1772, 3, 1], r: [2, 3, 5, 10, 12, 20, 50], k: 2, x: [6, 9], v: [314, 0.5, 1.8, 49], s: [244, 305], nm: 52, f: 3.4};

test("kunci ubin dan sel sama dengan pipeline (K0001 Seruyan)", () => {
  assert.deepEqual(R.kunci(-3.1201, 112.12), {ubin: "17_9", sel: "352_192"});
});

test("ubin hasil pipeline memuat sel pusat cluster contoh", { skip: !existsSync("public/data/riwayat_sel/17_9.json") }, () => {
  const d = JSON.parse(readFileSync("public/data/riwayat_sel/17_9.json", "utf8"));
  assert.ok(d.c["353_192"], "rekaman sel 353_192 hilang dari ubin 17_9");
  assert.equal(d.c["353_192"].y.length, new Date(d.sd).getUTCFullYear() - d.th0 + 1, "panjang seri tahunan tidak cocok th0..sd");
});

test("fakta: kekerapan, tahun ini vs rata-rata, El Niño", () => {
  const a = R.analisa(rec, meta, {hari: 7, wd: 135, ws: 20, gambut: true, dc: 700, teramati: true}, "El Niño");
  assert.match(a.fakta[0], /Terbakar 3 dari 14 tahun/);
  assert.equal(a.tahunIni.peringkat, 1, "800 titik s.d. 12 Okt lebih tinggi dari semua tahun lalu");
  assert.ok(a.fakta.some(f => /tahun El Niño .*2026 juga tahun El Niño/.test(f)));
});

test("prakiraan: sisa hari dari episode yang sudah bertahan >= umur api", () => {
  const a = R.analisa(rec, meta, {hari: 10, wd: 135, ws: 20}, null);
  // episode >= 10 hari: 10, 12, 20, 50 -> median 16 -> sisa 6
  assert.equal(a.lama.sisa, 6);
  assert.deepEqual(a.prakira.find(x => x[0] === "Arah jalar hari ini").slice(0, 2), ["Arah jalar hari ini", "ke barat laut"]);
  assert.equal(a.sisaMusim, 305 - 285);
});

test("saran DITOLAK bila data tidak mendukung", () => {
  const sepi = {y: Array(15).fill(0), yd: Array(15).fill(0), m: Array(12).fill(0), r: [], nm: 0, f: 0};
  sepi.y[3] = 25; sepi.m[8] = 25;
  const a = R.analisa(sepi, meta, {hari: 1, ws: 2, wd: 90}, null);
  assert.ok(!a.saran.some(s => /operasi panjang|sekat bakar|kambuh|langganan/.test(s)), `saran tanpa dasar: ${a.saran.join(" | ")}`);
  assert.ok(!a.prakira.some(x => x[0] === "Arah jalar hari ini"), "angin 2 km/jam tidak boleh dipakai sebagai arah jalar");
  assert.ok(R.html(a).includes("Titik per tahun"));
});
