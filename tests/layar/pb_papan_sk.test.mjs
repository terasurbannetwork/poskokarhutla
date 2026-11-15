// PB-29: papan SK status darurat (public/inti/papan_sk.js). Murni diuji lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/inti/papan_sk.js"), vm.createContext({window: win, URLSearchParams, Date, console}));
const P = win.PbPapanSk;
const reg = {bencana: [{id: "banjir", nama: "Banjir"}, {id: "longsor"}]};
const sk = {bencana: "banjir", prov: "32", kab: "3273", wilayah: "kab", tingkat: "siaga darurat", nomor: "SK/12/2026", tgl_sk: "2026-11-01", tmt_mulai: "2026-11-02", tmt_selesai: "2026-11-20", perpanjangan_ke: 0, sisa_hari: 5, sinyal: "akan_berakhir"};

test("tanggal dan sisa hari: null tampil belum tersedia, bukan 0", () => {
  assert.equal(P.tgl("2026-11-02"), "2 Nov 2026"); assert.equal(P.tgl(null), "belum tersedia");
  assert.equal(P.sisaTeks(null), "belum tersedia"); assert.equal(P.sisaTeks(0), "berakhir hari ini"); assert.equal(P.sisaTeks(5), "5 hari"); assert.equal(P.sisaTeks(-2), "lewat 2 hari");
});
test("penanda mengikuti sinyal server (7 hari, Q27); tanpa sinyal kosong", () => {
  assert.equal(P.penanda(sk), "Akan berakhir"); assert.equal(P.penanda({sinyal: "tanpa_tanggal_selesai"}), "Tanpa tanggal selesai"); assert.equal(P.penanda({sinyal: null}), "");
  assert.equal(P.hitungBerakhir([sk, {sinyal: null}, sk]), 2);
});
test("baris SK: wilayah kab dan prov, selesai kosong tampil belum tersedia", () => {
  const b = P.barisSk(sk, reg, {32: "Jawa Barat"});
  assert.deepEqual([...b], ["Banjir", "Tingkat siaga darurat", "Kab/kota 3273, Jawa Barat", "SK/12/2026", "2 Nov 2026", "20 Nov 2026", "5 hari", "Akan berakhir"]);
  const t = P.barisSk({...sk, wilayah: "prov", kab: null, tmt_selesai: null, sisa_hari: null, sinyal: "tanpa_tanggal_selesai"}, reg, {});
  assert.equal(t[2], "Provinsi 32"); assert.equal(t[5], "belum tersedia"); assert.equal(t[6], "belum tersedia");
});
test("registri dan url: semua bencana ada, query hanya yang terisi", () => {
  assert.deepEqual(P.pilihBencana(reg).map(x => [...x]), [["banjir", "Banjir"], ["longsor", "longsor"]]);
  assert.equal(P.urlPapan("", ""), "/api/pb/papan-sk"); assert.equal(P.urlPapan("banjir", "32"), "/api/pb/papan-sk?bencana=banjir&prov=32");
  assert.equal(P.galatRamah(400, {galat: "x"}), "x"); assert.match(P.galatRamah(403, null), /tidak berhak/);
});
test("muat() berhenti bila sudah ditutup, sebelum dan sesudah await", () => {
  const m = baca("public/inti/papan_sk.js").match(/async function muat\(\) \{[\s\S]*?\n    \}\n/)[0];
  assert.match(m, /^async function muat\(\) \{\n\s*if \(S\.tutup\) return;/); assert.match(m, /await api[\s\S]*?if \(S\.tutup \|\| n !== S\.sibuk\) return;/);
});
test("gerbang statis: aman teks, tanpa 'aman', tanpa titik tengah, tanpa kesimpulan model", () => {
  const js = baca("public/inti/papan_sk.js");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|outerHTML|document\.write|\beval\(|alert\(|confirm\(|prompt\(/);
  assert.doesNotMatch(js, /["'][^"'\n]*[ ]·[ ][^"'\n]*["']/); assert.doesNotMatch(js, /Sumber:|class="ex-ft"|ops-lead|text-transform/);
  assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ""), /\baman\b/i);
  for (const n of ['"Papan SK status darurat"', "/api/pb/papan-sk", "requestAnimationFrame", '"Penanda"']) assert.ok(js.includes(n), n);
});
