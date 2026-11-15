/* T13 pencocok orang (KP-22). node --test tests/agen/cocok_orang.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import {mkdtempSync, writeFileSync, readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {cocok, keSql, diDalamRepo} from "../../scripts/agents/cocok_orang.mjs";

const NIP = "198001012005011001", NIP2 = "199002022015021002";
const orang = [{id: "o".repeat(16), nip: NIP, wa: "6281200000001"}, {id: "p".repeat(16), nip: NIP2, wa: "6281200000002"}];
const A = (o = {}) => ({tabel: "staf", id: "a".repeat(16), nip: null, wa: null, ...o});

test("T13 NIP baku sama (spasi dan titik dibuang) jadi pasangan", () => {
  const h = cocok([A({nip: "19800101 2005 01 1001"}), A({id: "b".repeat(16), nip: NIP.slice(0, 8) + "." + NIP.slice(8)})], orang);
  assert.deepEqual(h.pasang.map(p => p.cara + p.orang_id[0]), ["nipo", "nipo"]); assert.equal(h.tinjau.length, 0);
});
test("T13 WA sama persis jadi pasangan walau ditulis 0812...", () => {
  const h = cocok([A({wa: "0812-0000-0002"})], orang);
  assert.deepEqual(h.pasang, [{tabel: "staf", akun_id: "a".repeat(16), orang_id: "p".repeat(16), cara: "wa"}]);
});
test("T13 NIP ke A dan WA ke B jadi tinjau bentrok, bukan pasangan", () => {
  const h = cocok([A({nip: NIP, wa: "6281200000002"})], orang);
  assert.equal(h.pasang.length, 0); assert.equal(h.tinjau[0].alasan, "bentrok"); assert.deepEqual(h.tinjau[0].kandidat, ["o".repeat(16), "p".repeat(16)]);
});
test("T13 NIP 7 karakter jadi tinjau nip_tidak_baku", () => {
  const h = cocok([A({nip: "1234567"})], orang);
  assert.equal(h.tinjau[0].alasan, "nip_tidak_baku"); assert.equal(h.pasang.length, 0);
});
test("T13 nama sama tanpa NIP dan WA tidak dipasangkan", () => {
  const h = cocok([{...A(), nama: "Budi"}], orang.map(o => ({...o, nama: "Budi"})));
  assert.deepEqual(h, {pasang: [], tinjau: []});
});
test("T13 SQL berisi id saja dan apostrof lolos", () => {
  const s = keSql({pasang: [], tinjau: [{akun_tabel: "staf", akun_id: "a".repeat(16), kandidat: ["x"], alasan: "bentrok"}]}, 1);
  assert.match(s, /INSERT OR IGNORE INTO orang_tinjau/); assert.ok(!/nama/i.test(s.split("\n").slice(1).join("")));
});
test("T13 path keluar di dalam repo ditolak, di luar repo ditulis", () => {
  assert.ok(diDalamRepo("scripts/x.sql")); assert.ok(diDalamRepo("public/data/baru/x.sql"));
  const d = mkdtempSync(path.join(tmpdir(), "co-")), f = (n, j) => { const p = path.join(d, n); writeFileSync(p, JSON.stringify(j)); return p; };
  const o = f("o.json", [{results: orang}]), s = f("s.json", [{id: "a".repeat(16), nip: NIP, wa: "6281200000001"}]);
  const dalam = spawnSync("node", ["scripts/agents/cocok_orang.mjs", "--orang", o, "--staf", s, "--keluar", "tests/agen/hasil.sql"], {encoding: "utf8"});
  assert.equal(dalam.status, 1); assert.match(dalam.stderr, /dalam repo/);
  const k = path.join(d, "keluar.sql");
  execFileSync("node", ["scripts/agents/cocok_orang.mjs", "--orang", o, "--staf", s, "--keluar", k]);
  assert.match(readFileSync(k, "utf8"), /INSERT OR IGNORE INTO orang_akun/);
});
