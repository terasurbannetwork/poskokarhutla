import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const src = fs.readFileSync("public/banjir/logbook_tren.js", "utf8"), ctx = vm.createContext({Number, Object, Math, Set, String});
vm.runInContext(src.slice(0, src.indexOf("if (typeof window")), ctx);
const L = vm.runInContext("LogbookTren", ctx);
const lb = {tahun_penuh: ["2014", "2015"], hari_tercatat: {2013: 100, 2014: 365, 2015: 365, 2016: 200}, nasional: {2013: {banjir: 9}, 2014: {banjir: 10}, 2015: {banjir: 30}, 2016: {banjir: 99}}};
test("seri menandai tahun dasar dari berkas", () => { const s = L.seri(lb, "banjir"); assert.deepEqual([...s.map(x => x.dasar)], [false, true, true, false]); });
test("judul hanya dari tahun dasar", () => { const j = L.judul(L.seri(lb, "banjir"), "banjir", t => t); assert.match(j, /^30 kejadian banjir tercatat pada 2015, tertinggi dari 2 tahun dasar 2014–2015$/); });
test("rata-rata: rentang bersambung dan arah", () => {
  const lb2 = {tahun_penuh: ["2014", "2015", "2016", "2024", "2025"], hari_tercatat: {2014: 365, 2015: 365, 2016: 365, 2024: 365, 2025: 365}, nasional: {}};
  [100, 300, 200, 50, 150].forEach((n, i) => lb2.nasional[[2014, 2015, 2016, 2024, 2025][i]] = {banjir: n});
  assert.equal(L.judul(L.seri(lb2, "banjir"), "banjir", t => t), "150 kejadian banjir tercatat pada 2025, di bawah rata-rata tahun dasar 2014–2016 dan 2024–2025 (160 kejadian)");
});

const P = (lift, ci, laju = .083) => ({nasional: {n: 100, k: 8, laju, dasar: .04, lift, ci95: ci, hari0: {n: 100, k: 9, laju: .094}}, kab: {"11|A": {n: 20, k: 6}, "11|B": {n: 50, k: 4}, "11|C": {n: 9, k: 5}}});
const sl = {jendela_hari: 3, min_pemicu: 10, min_k_kab: 5, ci_metode: "bootstrap blok kab-tahun", tahun_dasar: ["2014", "2015", "2016"], pasangan: {"banjir>longsor": P(2.12, [1.96, 2.28]), "cuaca>banjir": P(1.42, [1.28, 1.55]), "cuaca>longsor": P(1.54, [1.39, 1.66]), "gempabumi>longsor": P(.99, [.64, 1.35])}};
test("susulan: hitung kab n>=10 dan k>=5, tanpa peringkat kab", () => { const a = L.susulan(sl); assert.equal(a.nKab, 1); assert.equal(a.kab, undefined); });
test("judul susulan: angka kunci di depan, hari 1-3", () => { assert.equal(L.judulSusulan(sl, t => t), "8 dari 100 banjir disusul longsor 1–3 hari kemudian di kab/kota yang sama, 2,1 kali hari biasa di bulan yang sama (tahun dasar 2014–2016)"); });
test("svg: selang mencakup 1 = tidak berbeda; lainnya tampil kali", () => { const s = L.svgSusulan(sl, "#000"); assert.match(s, /tidak berbeda dari hari biasa<\/text>/); assert.match(s, /2,1 kali/); assert.equal((s.match(/<rect class="gy"/g) || []).length, 4); });
