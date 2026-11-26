/* RU-054 RRP-3 kalkulator Jitupasna permukiman: kasus RENCANA-UJI 2.5 J1-J6, invarian linear, kolom Formulir 08 beku,
   tanpa fetch POST, kartu IKK dari keluaran nyata ikk.py lewat rapor.js. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const baca = p => readFileSync(AKAR + p, "utf8");
const SUMBER = baca("public/bnpb/unit/rrp3.js");
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN, RangeError};
vm.createContext(ctx);
vm.runInContext(baca("public/inti/format.js") + "\n;globalThis.esc = esc; globalThis.fmt = fmt;", ctx);
vm.runInContext(baca("public/bnpb/unit/rapor.js"), ctx);
vm.runInContext(SUMBER, ctx);
const J = ctx.UnitRrp3, R = ctx.window.UnitRapor;
const py = (...a) => spawnSync("python3", ["-I", ...a], {cwd: AKAR, encoding: "utf8"});
const dekat = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

const unit = {RB: 120, RS: 300, RR: 800}, harga = {RB: 150, RS: 75, RR: 25}, satuan = {RB: 60, RS: 30, RR: 15};

test("J1: kerusakan Rp60.500 juta, kebutuhan dasar Rp28.200 juta, berindeks Rp31.725 juta", () => {
  assert.equal(J.kerusakan(unit, harga), 60500);
  const k = J.kebutuhan(unit, satuan, {kab: 112.5, prov: 108});
  assert.equal(k.dasar, 28200); dekat(k.berindeks, 31725); assert.equal(k.sumber_ikk, "IKK kab/kota");
});

test("J2 dan J3: tanda periksa hitung ganda hanya bila huntap + stimulan RB melebihi RB terverifikasi", () => {
  const a = J.periksaGanda(50, 90, 120); assert.equal(a.ganda, true); assert.equal(a.jumlah, 140);
  assert.equal(J.periksaGanda(30, 90, 120).ganda, false);
  assert.equal(J.periksaGanda(null, 90, 120).ganda, null, "kosong bukan tanpa tanda");
});

test("J4 dan J5: IKK kab kosong memakai IKK provinsi berlabel; keduanya kosong: berindeks null, kerusakan tetap", () => {
  const p = J.kebutuhan(unit, satuan, {kab: null, prov: 108.0});
  assert.equal(p.sumber_ikk, "IKK provinsi"); dekat(p.berindeks, 28200 * 1.08);
  const n = J.kebutuhan(unit, satuan, {kab: null, prov: null});
  assert.equal(n.berindeks, null); assert.match(n.alasan, /belum ada data/); assert.equal(n.dasar, 28200);
  assert.equal(J.kerusakan(unit, harga), 60500);
});

test("J6: unit negatif atau pecahan ditolak sebelum hitung", () => {
  for (const u of [{...unit, RB: -1}, {...unit, RS: 2.5}, {...unit, RR: null}, {RB: 1, RS: 1}])
    assert.throws(() => J.kerusakan(u, harga), /bilangan bulat/);
  assert.throws(() => J.kebutuhan(unit, {...satuan, RB: -5}, {kab: 100}), /satuan biaya/);
  assert.throws(() => J.periksaGanda(1.5, 1, 2), /bilangan bulat/);
});

test("invarian: kebutuhan linear terhadap unit", () => {
  const dua = Object.fromEntries(Object.entries(unit).map(([t, x]) => [t, 2 * x]));
  dekat(J.kebutuhan(dua, satuan, {kab: 112.5}).berindeks, 2 * J.kebutuhan(unit, satuan, {kab: 112.5}).berindeks);
});

test("CSV: kolom sama dengan Formulir 08 beku, rupiah penuh, kerugian kosong (bukan 0)", () => {
  const beku = JSON.parse(baca("tests/bnpb/fixtures/unit/rrp3_kolom.json")).kolom;
  const f = J.barisFormulir(beku, "Kab. Contoh", unit, harga, J.kebutuhan(unit, satuan, {kab: 112.5}));
  const csv = R.csv(f), kepala = csv.replace(/^﻿/, "").split("\r\n")[0];
  assert.equal(kepala, beku.map(k => `"${k}"`).join(","));
  const isi = csv.split("\r\n")[1].split(",");
  assert.equal(isi[7], '"150000000"'); assert.equal(isi[10], '"18000000000"'); assert.equal(isi[13], '""'); assert.equal(isi[15], '"31725000000"');
});

test("tanpa simpan server: tidak ada fetch, POST, sendBeacon, atau penyimpanan di rrp3.js", () => {
  assert.doesNotMatch(SUMBER, /\bfetch\s*\(|method\s*:|POST|sendBeacon|XMLHttpRequest|localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(SUMBER, /·|\baman\b/i);
});

test("ikk.py --cek hijau dan kartu IKK nyata dirender tanpa nol palsu", () => {
  const c = py("scripts/bnpb/unit/ikk.py", "--cek"); assert.equal(c.status, 0, c.stderr || c.stdout);
  const r = py("-c", "import sys,json;sys.path.insert(0,'scripts/bnpb');from unit import ikk;print(json.dumps(ikk.jalan()['ikk'],ensure_ascii=False))");
  assert.equal(r.status, 0, r.stderr);
  const b = {...JSON.parse(r.stdout), dibuat: "2026-11-26T00:00:00Z", basi_jam: 1080};
  assert.deepEqual(b.data.tarif_juta, {RB: 60, RS: 30, RR: 15});
  const h = R.html(b.kartu[0], b, Date.parse(b.dibuat) + 3600e3);
  assert.match(h, /Indeks biaya konstruksi IKK BPS/); assert.match(h, /Angka resmi/);
  assert.doesNotMatch(h, /·|\baman\b/i); assert.doesNotMatch(h, /NaN|undefined/);
});
