// Gerbang kartu peluang bersama (public/inti/peluang.js): kontrak peluang/1 dari gempa dirender jadi kartu Insight
// (judul = vonis, satu batang per hari, nilai kecil "<1%", tidak pernah "100%", tanpa subjudul/catatan) dan batasan hanya di bab Metode.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {fileURLToPath} from "node:url";

const akar = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baca = p => fs.readFileSync(path.join(akar, p), "utf8");
// fixture beku berbentuk kontrak peluang/1: pipeline menulis ulang public/gempa/data/peluang.json, literal uji tak boleh ikut berubah
const D = JSON.parse(baca("tests/agen/fixtures/peluang.json"));
const ctx = vm.createContext({document: {addEventListener() {}}, console});
for (const f of ["format.js", "kartu.js", "peluang.js"]) vm.runInContext(baca("public/inti/" + f), ctx, {filename: f});
const P = vm.runInContext("Peluang", ctx);
const salin = o => JSON.parse(JSON.stringify(o));
const batang = h => (h.match(/class="gy"/g) || []).length;

test("pct: nilai kecil tampil, tidak pernah 100%", () => {
  assert.equal(P.pct(0.001), "<1%"); assert.equal(P.pct(0), "0%"); assert.equal(P.pct(0.2759), "28%");
  assert.equal(P.pct(1), ">99%"); assert.equal(P.pct(0.9999), ">99%"); assert.equal(P.pct(null), null);
});

test("kartu gempa: judul = vonis, batang = jumlah hari, tanpa subjudul/catatan", () => {
  const w = D.wilayah.ID, h = P.kartu(D, {ey: "Peluang", kejadian: "gempa"});
  assert.match(h, /<article class="ex">/); assert.match(h, /class="ex-ey">Peluang</);
  assert.ok(h.includes('<span class="hl">74%</span>'), "angka vonis disorot");
  assert.ok(h.includes('<span class="hl">&gt;99%</span>'));
  assert.equal(batang(h), w.hari.length);
  assert.ok(!h.includes("100%")); assert.ok(h.includes("Sumber: " + D.sumber));
  assert.ok(!/<p[ >]|<small|Batasan|uji_balik/i.test(h), "tanpa paragraf catatan/batasan di kartu");
  assert.match(h, /data-set="pelW"/); assert.match(h, /data-set="pelA"/);
  assert.match(h, /class="gy"[^>]*data-tip="&lt;b&gt;Selasa, 20 Okt/);
  assert.match(h, />Sel 20</);
});

test("ambang tanpa data (m4 null) tidak jadi segmen; ambang dipilih lewat st", () => {
  const h = P.kartu(D, {st: {pelA: "m6"}});
  assert.ok(!h.includes('data-v="m4"')); assert.match(h, /data-v="m6" aria-pressed="true"/); assert.match(h, />3%</);
  // legenda ikut menyaring: ambang tanpa batang tidak didaftar (A18), ambang bermodal tetap
  const d = salin(D); for (const w of Object.values(d.wilayah)) for (const x of w.hari || []) x.p[0] = null;
  const g = P.kartu(d); assert.ok(!g.includes("Magnitudo 5 atau lebih") && g.includes("Magnitudo 6 atau lebih"));
  assert.ok(P.kartu(D).includes("Magnitudo 5 atau lebih"));
});

test("wilayah dipilih lewat st dan vonis wilayah itu jadi judul", () => {
  const h = P.kartu(D, {st: {pelW: "11"}});
  assert.ok(h.includes('<span class="hl">58%</span>') && h.includes("di Aceh")); assert.match(h, /<option value="11" selected>/);
});

test("nilai <1%, horizon satu nilai, berkas tak sah", () => {
  const d = salin(D); d.wilayah.ID.hari = [{t: "2026-10-20", p: [0.0004, 0.2, 0.9999], p10: 4, p50: 5, p90: 6}];
  const h = P.kartu(d, {ambang: "m4"}); assert.equal(batang(h), 1); assert.ok(h.includes("&lt;1%")); assert.ok(h.includes("Rentang p10 sampai p90"));
  assert.ok(P.kartu(d, {ambang: "m6"}).includes("&gt;99%"));
  assert.equal(P.kartu(null), ""); assert.equal(P.kartu({versi: "x"}), "");
  d.wilayah.ID.vonis = '<img src=x onerror=1> 5%'; assert.ok(!P.kartu(d).includes("<img"));
});

test("batasan + uji balik hanya di bab Metode", () => {
  const h = P.batasan(D);
  assert.match(h, /^<details class="mt-sek">/); assert.ok(h.includes("<b>0. ")); assert.ok(h.includes("Gempa utama tidak bisa diramal"));
  assert.ok(h.includes("Uji balik") && h.includes("teramati 119") && h.includes("29 dari 30"));
  const d = salin(D); delete d.uji_balik; d.batasan = []; assert.equal(P.batasan(d), "");
});

test("judul tanpa titik akhir, dua kalimat disambung titik koma", () => {
  const h = P.kartu(D), jd = h.match(/<h3>(.*?)<\/h3>/)[1].replace(/<[^>]+>/g, "");
  assert.ok(!jd.endsWith(".")); assert.ok(jd.includes("diketahui; dalam 12 bulan")); assert.ok(!/\.\s/.test(jd));
  const d = salin(D); d.wilayah.ID.vonis = "Peluang 5% di sini."; assert.ok(P.kartu(d).includes("di sini</h3>"));
});

test("singkatan tidak memecah kalimat; entri bulanan; garis normal", () => {
  const d = salin(D); d.wilayah.ID.vonis = "Di Kab. Malang peluang 5%. Tempatnya tidak pasti.";
  const jd = P.kartu(d).match(/<h3>(.*?)<\/h3>/)[1]; assert.ok(jd.includes("Kab. Malang") && jd.includes("5%</span>; tempatnya"), jd);
  const b = salin(D); b.wilayah.ID.hari = [["2026-11-30", .16], ["2026-12-31", .13], ["2027-01-31", .06]].map(([t, v]) => ({t, p: [null, v, .02], p10: null, p50: null, p90: null, p_dasar: [null, .16, .07]}));
  const h = P.kartu(b);
  assert.ok(h.includes(">Nov 2026<") && h.includes(">Des 2026<") && !h.includes(">Sen 30<"));
  assert.ok(h.includes("November 2026") && h.includes("Normalnya: 16%"));
  assert.equal((h.match(/stroke-dasharray="4 3"/g) || []).length, 3); assert.ok(h.includes(">normal<"));
  assert.ok(!P.kartu(D).includes(">normal<") && !P.kartu(D).includes("Normalnya"));
});
