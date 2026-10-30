/* Uji lapis air banjir (public/banjir/lapis_air.js): fungsi murni, semua overlay mati bawaan, data nyata berbentuk benar. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/lapis_air.js", src = fs.readFileSync(f, "utf8"), ctx = vm.createContext({Intl, Number, Object, Math, isFinite, String, Array, Date});
vm.runInContext(src.slice(0, src.indexOf("/* ---------- bagian peta")), ctx);
const A = ctx.LAm, plain = x => JSON.parse(JSON.stringify(x));

test("sintaks sah, tanpa titik tengah atau em dash, semua mati bawaan", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0); assert.ok(!/·|—/.test(src));
  const menu = src.slice(src.indexOf("menu()"), src.indexOf("muat(k)")); assert.ok(menu.includes('type="checkbox"') && !/checked/.test(menu));
  const idx = fs.readFileSync("public/banjir/index.html", "utf8"); assert.ok(idx.includes("lapis_air.js") && !/data-l="(bendungan|embung|pasut30|pospu)"[^>]*checked/.test(idx));
  assert.ok(/bendungan: \[\], embung: \[\], pasut30: \[\], pospu: \[\]/.test(fs.readFileSync("public/banjir/peta.js", "utf8")));
});

test("ukuran ikon bendungan naik dengan volume, tanpa volume terkecil", () => {
  assert.equal(A.ukuran(null), 0.55); assert.ok(A.ukuran(10) < A.ukuran(1000) && A.ukuran(1e9) <= 1.15);
  assert.ok(A.beroperasi("Sudah Terbangun / Beroperasi") && !A.beroperasi("Sedang Dibangun / Tidak Beroperasi") && !A.beroperasi(""));
});

const s = (nama, prov, p90, hari) => ({nama, prov, p90, status7: p90 == null ? null : "tinggi", hari});
test("jendelaProv: rentang beruntun, puncak, urut tanggal; p90 null diabaikan", () => {
  const d = {stasiun: [s("A", "P1", 50, [["2026-11-01", 60, "10:00"], ["2026-11-02", 70, "11:00"], ["2026-11-03", 40, "12:00"], ["2026-11-10", 55, "09:00"]]),
    s("B", "P1", 50, [["2026-11-02", 80, "10:00"]]), s("C", "P2", 30, [["2026-10-30", 31, "10:00"]]), s("D", "P3", null, [["2026-10-29", 999, "10:00"]])]};
  const j = plain(A.jendelaProv(d));
  assert.deepEqual(j.map(x => x.prov), ["P2", "P1"]);
  assert.equal(j[1].runs.length, 2); assert.equal(j[1].runs[0].dari, "2026-11-01"); assert.equal(j[1].runs[0].sampai, "2026-11-02");
  assert.deepEqual([j[1].runs[0].puncak.stasiun, j[1].runs[0].puncak.cm, j[1].runs[0].puncak.lebih], ["B", 80, 30]);
  assert.equal(A.rentang(j[1].runs[0]), "1 Nov sampai 2 Nov"); assert.equal(A.rentang(j[0].runs[0]), "30 Okt");
  assert.deepEqual(plain(A.ringkasPasut(d)), {n: 4, tinggi: 3, sedang: 0, biasa: 0, tanpa: 1, mulai: null});
});

test("berkas data nyata: ukuran, kolom, sumber dan tanggal ada", () => {
  const b = JSON.parse(fs.readFileSync("public/banjir/data/bendungan.json", "utf8")), p = JSON.parse(fs.readFileSync("public/banjir/data/pos_pu.json", "utf8"));
  const q = JSON.parse(fs.readFileSync("public/banjir/data/pasut_30h.json", "utf8"));
  assert.ok(b.sumber_bendungan && b.sumber_embung && b.tanggal && b.bendungan.length > 250 && b.embung.length > 80);
  assert.ok(b.bendungan.every(r => r.length === 11 && r[1] > -12 && r[1] < 7 && r[0] > 94 && r[0] < 142));
  assert.ok(p.sumber && p.tanggal && p.pos.length > 500 && p.pos.every(r => ["d", "k"].includes(r[3])));
  assert.ok(!JSON.stringify(p).includes("tma"), "pos tanpa nilai");
  assert.ok(q.sumber && q.dibuat && q.stasiun.length >= 60 && q.stasiun.every(x => x.hari.length > 0 && x.hari.length <= 31));
  for (const x of [b, p, q]) assert.ok(JSON.stringify(x).length < 3e6);
  assert.equal(A.fiturBendungan(b).features.length, b.bendungan.length);
});
