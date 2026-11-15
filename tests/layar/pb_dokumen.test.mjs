// PB-24: pembuat dokumen (public/inti/dokumen.js). Murni diuji lewat vm; sisanya gerbang statis.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const win = {}; win.window = win; vm.runInContext(baca("public/inti/dokumen.js"), vm.createContext({window: win, Intl, URLSearchParams, Date, console}));
const D = win.PbDokumen;
const reg = {bencana: [{id: "banjir", nama: "Banjir", kemampuan: {dokumen: ["sitrep", "renops"]}}, {id: "longsor", nama: "Longsor", kemampuan: {dokumen: ["sitrep", "laporan_kib"]}}, {id: "gempa", kemampuan: {dokumen: []}}]};

test("jenis dokumen sama dengan src/pb_dokumen.js", () => {
  const m = baca("src/pb_dokumen.js").match(/const JENIS = (\[[^\]]*\])/); assert.deepEqual(Object.keys(D.JENIS), JSON.parse(m[1]));
});
test("registri: hanya bencana ber-kemampuan.dokumen; pilihan saling menyaring", () => {
  assert.deepEqual(D.aktif(reg).map(b => b.id), ["banjir", "longsor"]);
  assert.deepEqual(D.bencanaUntuk(reg, "renops").map(b => b.id), ["banjir"]);
  assert.deepEqual([...D.jenisUntuk(reg, "longsor")], ["sitrep", "laporan_kib"]); assert.deepEqual([...D.jenisUntuk(reg, "gempa")], []);
});
test("badan rakit dan cek: periode, KIB wajib untuk laporan kejadian", () => {
  const f = {jenis: "sitrep", bencana: "banjir", prov: "32", periode: " 2026-11-15 ", kab: "", kib: ""};
  assert.deepEqual(JSON.parse(JSON.stringify(D.badanRakit(f))), {jenis: "sitrep", bencana: "banjir", prov: "32", periode: "2026-11-15"});
  assert.equal(D.cekRakit(D.badanRakit(f)), null);
  assert.ok(D.cekRakit(D.badanRakit({...f, periode: "15/11"})));
  assert.ok(D.cekRakit(D.badanRakit({...f, jenis: "laporan_kib"})));
  assert.equal(D.cekRakit(D.badanRakit({...f, jenis: "laporan_kib", kib: "3273202611151" + "234"})), null);
});
test("badan bekukan: hanya kalimat terisi; batas 1500", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(D.badanBekukan("a".repeat(16), {ringkasan: " x ", kebijakan: " "}))), {id: "a".repeat(16), kalimat: {ringkasan: "x"}});
  assert.ok(D.cekKalimat({ringkasan: "x".repeat(1501)})); assert.equal(D.cekKalimat({ringkasan: "x"}), null);
});
test("angka: null tampil belum tersedia (bukan 0), koma desimal", () => {
  assert.equal(D.barisAngka({nama: "luas_ha", nilai: null})[1], "belum tersedia");
  assert.equal(D.barisAngka({nama: "luas_ha", nilai: 1234.5, satuan: "ha"})[1], "1.234,5 ha");
  assert.equal(D.barisAngka({nama: "renlap_terbit", nilai: 0, satuan: "renlap"})[1], "0 renlap");
});
test("sumber atau waktu kosong tampil belum tersedia; desimal mengikuti angka mesin", () => {
  const b = D.barisAngka({nama: "x", nilai: 5, sumber: "", waktu: null}); assert.equal(b[2], "belum tersedia"); assert.equal(b[3], "belum tersedia");
  assert.equal(D.koma(12), "12"); assert.equal(D.koma(1234.567), "1.234,567"); assert.equal(D.koma(0.5), "0,5"); assert.equal(D.koma(null), "belum tersedia");
});
test("muat() berhenti bila sudah ditutup, sebelum dan sesudah await", () => {
  const js = baca("public/inti/dokumen.js"), m = js.match(/async function muat\(\) \{[\s\S]*?\n    \}\n/)[0];
  assert.match(m, /^async function muat\(\) \{\n\s*if \(S\.tutup\) return;/); assert.match(m, /await api[\s\S]*?if \(S\.tutup \|\| n !== S\.sibuk\) return;/);
});
test("unduh JSON lewat rute berkas; galat server menang", () => {
  assert.equal(D.unduhUrl("a".repeat(16)), "/api/pb/dokumen/berkas?id=" + "a".repeat(16) + "&fmt=json");
  assert.equal(D.galatRamah(400, {galat: "x"}), "x"); assert.match(D.galatRamah(422, null), /data pribadi/); assert.match(D.galatRamah(418, null), /418/);
});
test("gerbang statis: aman teks, tanpa kapital, tanpa PDF, tanpa 'aman', konfirmasi beku, cetak", () => {
  const js = baca("public/inti/dokumen.js"), css = baca("public/inti/dokumen.css");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|outerHTML|document\.write|\beval\(|alert\(|confirm\(|prompt\(/);
  assert.doesNotMatch(css, /text-transform\s*:\s*uppercase/);
  assert.doesNotMatch(js, /["'][^"'\n]*[ ]·[ ][^"'\n]*["']/); assert.doesNotMatch(js, /Sumber:|class="ex-ft"|ops-lead|fmt=pdf|"pdf"/);
  assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ""), /\baman\b/i);
  for (const n of ['"Susun dokumen"', '"Pratinjau dan isian"', '"Versi dokumen"', "/api/pb/dokumen/rakit", "/api/pb/dokumen/bekukan", "requestAnimationFrame", "print"]) assert.ok(js.includes(n), n);
  assert.match(js, /Ya, bekukan/); assert.match(css, /@media print/);
});
