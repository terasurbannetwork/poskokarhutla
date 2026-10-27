/* Uji tabel wilayah /banjir (public/banjir/wilayah.js): agregasi periode, kalender terkunci/terbuka, label hari. Fixture di sini saja, bukan di public/banjir/data. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/wilayah.js", ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("../../" + f, import.meta.url), "utf8"), ctx);
const Wl = ctx.Wilayah, plain = x => JSON.parse(JSON.stringify(x));
const dok = (hari, provinsi) => ({hari, dibuat: hari + "T00:00:00Z", sumber: [], provinsi, total: {}});
const P = (kode, status, kode_kej, rob, h3, tp, kab = []) => ({kode, nama: kode, status, kejadian_aktif: kode_kej ? kode_kej.length : null, kejadian_kode: kode_kej, rob, hujan3_mm: h3, terpapar_jiwa: tp, kab});

test("sintaks sah dan tanpa titik tengah atau em dash di teks tampil", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0);
  const s = fs.readFileSync(f, "utf8"); assert.ok(!/·|—/.test(s));
});

test("agregat: kejadian yang sama di dua hari terhitung satu, terpapar puncak, status tertinggi, rob dan hujan puncak", () => {
  const a = dok("2026-10-25", [P("A", 1, ["B1", "B2"], 3, 50, 100, [P("A1", 1, ["B1"], 3, 50, 100)]), P("B", null, [], null, null, null)]);
  const b = dok("2026-10-26", [P("A", "Awas", ["B2", "B3"], 1, 80, 70, [P("A1", 3, ["B2"], 1, 80, 70)]), P("B", 0, [], 0, null, null)]);
  a.total = {kejadian_aktif: 2, kejadian_kode: ["B1", "B2"], rob: 3, terpapar_jiwa: 100, per_status: {}}; b.total = {kejadian_aktif: 2, kejadian_kode: ["B2", "B3"], rob: 1, terpapar_jiwa: 70, per_status: {}};
  const r = Wl.agregat([a, b]), A = r.provinsi.find(p => p.kode === "A"), B = r.provinsi.find(p => p.kode === "B");
  assert.equal(A.kejadian_aktif, 3, "B1,B2,B3 unik, bukan 2+2"); assert.deepEqual(plain(A.kejadian_kode), ["B1", "B2", "B3"]);
  assert.equal(A.terpapar_jiwa, 100, "puncak harian, bukan 170"); assert.equal(A.status, 3); assert.equal(A.rob, 3); assert.equal(A.hujan3_mm, 80);
  assert.equal(A.kab[0].kejadian_aktif, 2); assert.equal(A.kab[0].status, 3);
  assert.equal(B.kejadian_aktif, 0); assert.equal(B.terpapar_jiwa, null, "tak pernah ada data = null"); assert.equal(B.status, 0);
  assert.equal(r.total.kejadian_aktif, 3, "unik nasional"); assert.equal(r.total.terpapar_jiwa, 100); assert.equal(r.total.rob, 3);
  assert.equal(r.total.per_status.Awas, 1, "per kabupaten"); assert.equal(r.provinsi[0].kode, "A", "terurut status tertinggi dulu");
  assert.equal(Wl.agregat([a]), a, "satu dokumen dikembalikan apa adanya"); assert.equal(Wl.agregat([null]), null);
});

test("agregat: arsip lama tanpa kejadian_kode membuat WS (wilayah Siaga) null di periode, bukan 0", () => {
  const lama = dok("2026-10-24", [{kode: "A", nama: "A", status: 1, kejadian_aktif: 4, terpapar_jiwa: 5, kab: []}]);
  const baru = dok("2026-10-25", [P("A", 1, ["B1"], 0, 1, 9)]);
  const r = Wl.agregat([lama, baru]); assert.equal(r.provinsi[0].kejadian_aktif, null); assert.equal(r.provinsi[0].terpapar_jiwa, 9);
});

test("kontrak: bentuk total agregat sama dengan total sehari", () => {
  const T = {kejadian_aktif: 1, kejadian_kode: ["B1"], rob: 0, terpapar_jiwa: 5, per_status: {Awas: 0, Siaga: 0, Waspada: 1, Aman: 0}};
  const a = dok("2026-10-25", [P("A", 1, ["B1"], 0, 1, 5, [P("A1", 1, ["B1"], 0, 1, 5)])]), b = dok("2026-10-26", [P("A", 1, ["B1"], 0, 1, 5, [P("A1", 1, ["B1"], 0, 1, 5)])]);
  a.total = b.total = T; const r = Wl.agregat([a, b]);
  assert.deepEqual(Object.keys(r.total).sort(), Object.keys(T).sort()); assert.deepEqual(Object.keys(r.total.per_status).sort(), Object.keys(T.per_status).sort());
  assert.equal(r.total.per_status.Waspada, 1);
});

test("periodeHari: 7, 30, tahun ini, bulan; hanya hari berarsip", () => {
  const ada = ["2026-09-28", "2026-10-01", "2026-10-20", "2026-10-21", "2026-10-26", "2025-12-31"];
  assert.deepEqual(plain(Wl.periodeHari("hari", ada, "2026-10-26")), ["2026-10-26"]);
  assert.deepEqual(plain(Wl.periodeHari("7", ada, "2026-10-26")), ["2026-10-20", "2026-10-21", "2026-10-26"]);
  assert.deepEqual(plain(Wl.periodeHari("30", ada, "2026-10-26")), ["2026-09-28", "2026-10-01", "2026-10-20", "2026-10-21", "2026-10-26"]);
  assert.deepEqual(plain(Wl.periodeHari("th", ada, "2026-10-26")), ["2026-09-28", "2026-10-01", "2026-10-20", "2026-10-21", "2026-10-26"]);
  assert.deepEqual(plain(Wl.periodeHari("bln", ada, "2026-10-26", ["2026-09", "2025-12"])), ["2025-12-31", "2026-09-28"]);
});

test("kalender: hari tanpa arsip terkunci, yang berarsip terbuka, Senin kolom pertama, bulan tetangga berarsip", () => {
  const k = Wl.kalender("2026-10", ["2026-10-26", "2026-10-27", "2026-09-30", "2026-11-02"], "2026-10-27");
  assert.equal(k.judul, "Oktober 2026"); assert.equal(k.kosongAwal, 3, "1 Okt 2026 hari Kamis"); assert.equal(k.sel.length, 31);
  const c = t => k.sel.find(x => x.t === t);
  assert.equal(c("2026-10-26").terkunci, false); assert.equal(c("2026-10-27").terkunci, false);
  assert.equal(c("2026-10-25").terkunci, true); assert.equal(c("2026-10-01").terkunci, true);
  assert.equal(Wl.kalender("2026-10", ["2026-10-28"], "2026-10-27").sel.find(x => x.d === 28).terkunci, true, "tanggal depan tetap terkunci");
  assert.equal(k.sebelum, "2026-09"); assert.equal(k.sesudah, "2026-11");
  assert.equal(Wl.kalender("2026-11", ["2026-10-26"], "2026-11-05").sesudah, null);
});

test("hariAwal: hari terbaru yang berisi, bukan hari ini", () => {
  assert.equal(Wl.hariAwal(["2026-10-24", "2026-10-26"], "2026-10-27"), "2026-10-26");
  assert.equal(Wl.hariAwal(["2026-10-28"], "2026-10-27"), null);
});

test("label hari utuh terakhir dan label periode", () => {
  assert.equal(Wl.labelHari("2026-10-26", "2026-10-27", "2026-10-26"), "Kemarin, Sen 26 Okt (hari utuh terakhir)");
  assert.equal(Wl.labelHari("2026-10-27", "2026-10-27", "2026-10-27"), "Hari ini, Sel 27 Okt");
  assert.equal(Wl.labelHari("2026-10-20", "2026-10-27", "2026-10-20"), "Sel 20 Okt", "data lebih tua dari kemarin: tanggal saja");
  assert.equal(Wl.labelPeriode("7", ["a", "b", "c"], "2026-10-26", [], "2026-10-27", "2026-10-26", 2), "Sel 20 Okt sampai Sen 26 Okt, 2 dari 3 hari");
  assert.equal(Wl.labelHari("2026-10-20", "2026-10-27", "2026-10-26"), "Sel 20 Okt");
  assert.equal(Wl.labelPeriode("bln", ["a", "b"], "2026-10-26", ["2026-10", "2026-09"], "2026-10-27", "2026-10-26"), "Sep 2026, Okt 2026, 2 hari berarsip");
  assert.equal(Wl.labelPeriode("7", [], "2026-10-26", [], "2026-10-27", "2026-10-26"), "Sel 20 Okt sampai Sen 26 Okt, belum ada arsip");
});

test("klik periode dan kalender: chrome urgent, tabel lewat nanti (INP)", () => {
  const s = fs.readFileSync(f, "utf8");
  assert.match(s, /const gambarUlang = \(\) => \{[^\n]*classList\.add\("wl-redup"\); nanti\(/);
  assert.match(s, /setAttribute\("aria-pressed", b === pr\)[\s\S]{0,200}return gambarUlang\(\)/);
});

test("sapa_banjir: tren berpersen dan tanpa titik tengah", () => {
  const s = fs.readFileSync("public/banjir/sapa_banjir.js", "utf8");
  assert.match(s, /const persen = \(d, dasar\) => dasar > 0/); assert.ok(!/ · /.test(s.replace(/\/\*[\s\S]*?\*\//g, "")));
});

test("kolom penduduk jujur: PD, title bukan korban, nol tampil 0 dan null tampil strip; tab segmen berikon", () => {
  const w = fs.readFileSync("public/banjir/wilayah.js", "utf8"), h = fs.readFileSync("public/banjir/index.html", "utf8");
  assert.match(w, />PD jiwa<\/span>/); assert.match(w, /\"PD\", \"Penduduk\"/); assert.match(w, /bukan jumlah korban atau yang tergenang/); assert.ok(!/>TP<\/span>|Terpapar, jiwa/.test(w));
  assert.match(w, /const n = v => v == null \? "–" : fmt\(v\)/);
  for (const m of ["status", "hujan", "sungai", "rob", "riwayat"]) assert.match(h, new RegExp(`data-mp="${m}" aria-pressed="[a-z]+"><svg`), m);
  for (const b of ["b", "l"]) assert.match(h, new RegExp(`data-b="${b}" aria-pressed="[a-z]+"><svg`), b);
});

test("kepala sidebar kiri: cari paling atas, segmen utama berikon, baris indikator; tombol lama tersembunyi tapi tetap ada", () => {
  const h = fs.readFileSync("public/banjir/index.html", "utf8"), j = fs.readFileSync("public/banjir/subtab.js", "utf8");
  const top = h.slice(h.indexOf('<div class="top">'));
  assert.ok(top.indexOf('id="cari"') < top.indexOf('id="utamaSeg"') && top.indexOf('id="utamaSeg"') < top.indexOf('id="indikatorSeg"'), "urutan cari, utama, indikator");
  for (const t of ["Real Time", "Riwayat", "Wilayah Siaga"]) assert.match(top, new RegExp(`<svg[^>]*>.*?</svg>${t}</button>`), t);
  for (const t of ["Banjir", "Rob", "Longsor", "Hujan", "Sungai"]) assert.match(top.slice(top.indexOf('id="indikatorSeg"')), new RegExp(`<svg[^>]*>.*?</svg>${t}</button>`), t);
  assert.match(h, /id="modePeta" hidden/); assert.match(h, /id="bahayaSeg" hidden/); assert.match(h, /<script src="subtab\.js">/);
  assert.equal(spawnSync("node", ["--check", "public/banjir/subtab.js"], {encoding: "utf8"}).status, 0); assert.ok(!/·|—/.test(j));
  assert.match(fs.readFileSync("public/banjir/hujan_kini.js", "utf8"), /<div class="lg-g"><div class="lbl" title="Area hujan/);
});
