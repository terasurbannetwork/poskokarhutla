/* SP-014: gerbang larangan teks dan angka SIPPA (PRD §9.12.2, RU §2.8 butir 1-6 dan 8), tanpa basis data.
   Butir 6 (handler INP per handler) menyusul di SP-055. Tiap aturan punya fixture pelanggaran: gerbang yang tidak pernah bisa merah tidak dihitung. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync, existsSync} from "node:fs";
import {join, relative} from "node:path";

const AKAR = new URL("../../", import.meta.url).pathname;

function berkasDi(dir, hasil = []) {
  if (!existsSync(dir)) return hasil;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    statSync(p).isDirectory() ? berkasDi(p, hasil) : hasil.push(p);
  }
  return hasil;
}
/* cakupan RU §2.8: public/pipa/**, templat laporan (bila ada), src/sippa*.js */
const sumber = () => [
  ...berkasDi(join(AKAR, "public/pipa")),
  ...berkasDi(join(AKAR, "data/sippa/templat")),
  ...(existsSync(join(AKAR, "src")) ? readdirSync(join(AKAR, "src")).filter(n => /^sippa.*\.js$/.test(n)).map(n => join(AKAR, "src", n)) : []),
];
const TEKS = /\.(js|css|html|md|txt)$/;
const rel = p => relative(AKAR, p);

/* aturan: (jalur, isi) -> daftar pesan pelanggaran; jalur memungkinkan aturan per berkas */
const ATURAN = {
  "1 tanpa 'terbukti'": (j, t) => /terbukti/i.test(t) ? [`${j}: kata "terbukti" (keputusan 50)`] : [],
  "2 tanpa em dash dan titik tengah": (j, t) => /[—·]/.test(t) ? [`${j}: em dash U+2014 atau titik tengah U+00B7`] : [],
  "3 'titik api' bukan untuk data satelit": (j, t) => /titik api/i.test(t) ? [`${j}: "titik api" (pakai "titik panas")`] : [],
  "4 tanpa toFixed( (pakai fmt)": (j, t) => /toFixed\(/.test(t) ? [`${j}: toFixed( di teks tampil`] : [],
  "5 tanpa CDN dan import map": (j, t) => /https?:\/\/cdn|unpkg|jsdelivr|cdnjs|importmap/i.test(t) ? [`${j}: URL CDN atau import map sebaris (CSP script-src 'self')`] : [],
  "8 batas kedalaman satu definisi": (j, t) => {
    const p = [];
    const def = (t.match(/dalam_maks_m\s*:/g) || []).length;
    const hitung = /(^|\/)hitung\.js$/.test(j);
    if (def > 0 && !hitung) p.push(`${j}: definisi dalam_maks_m di luar hitung.js`);
    if (def > 1) p.push(`${j}: dalam_maks_m didefinisikan ${def} kali`);
    if (!hitung && /(kedalaman|lance|dalam_m)[^\n]*(>=?|<=?)\s*5(\.\d+)?\b(?!\d*\s*(km|bar))/i.test(t)) p.push(`${j}: batas kedalaman 5 m ditulis ulang (pakai KONST.dalam_maks_m)`);
    return p;
  },
};
const jalankan = (aturan, j, t) => aturan(j, t);

for (const [nama, aturan] of Object.entries(ATURAN)) {
  test(`gerbang SIPPA butir ${nama}: kode P0 bersih`, () => {
    const pelanggar = sumber().filter(p => TEKS.test(p)).flatMap(p => jalankan(aturan, rel(p), readFileSync(p, "utf8")));
    assert.deepEqual(pelanggar, [], `${pelanggar.length} pelanggaran: ${pelanggar.join("; ")}`);
  });
}

test("gerbang SIPPA butir 8: KONST.dalam_maks_m = 5 tepat satu definisi di hitung.js", () => {
  const t = readFileSync(join(AKAR, "public/pipa/hitung.js"), "utf8");
  assert.equal((t.match(/dalam_maks_m\s*:\s*5\b/g) || []).length, 1, "KONST.dalam_maks_m: 5 harus tepat satu di hitung.js");
});

test("gerbang SIPPA butir 6 RU: tidak ada berkas data (json, csv, geojson) di public/pipa", () => {
  const data = berkasDi(join(AKAR, "public/pipa")).filter(p => /\.(json|csv|geojson)$/i.test(p)).map(rel);
  assert.deepEqual(data, [], `${data.length} berkas data di public/pipa (terbit tanpa sesi): ${data.join(", ")}`);
});

test("gerbang SIPPA: ikon.js tanpa warna tertanam (satu warna currentColor, DS §2.8)", () => {
  const t = readFileSync(join(AKAR, "public/pipa/ikon.js"), "utf8");
  assert.doesNotMatch(t, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, "warna tertanam di ikon.js");
});

/* ---------- uji penolakan: tiap aturan wajib merah pada fixture pelanggaran ---------- */
const PELANGGARAN = {
  "1 tanpa 'terbukti'": "const s = 'Model ini terbukti benar';",
  "2 tanpa em dash dan titik tengah": "const s = 'Air — jalan';",
  "3 'titik api' bukan untuk data satelit": "const s = 'Jumlah titik api hari ini';",
  "4 tanpa toFixed( (pakai fmt)": "el.textContent = x.toFixed(2);",
  "5 tanpa CDN dan import map": "<script src=\"https://cdn.jsdelivr.net/npm/x.js\"></script>",
  "8 batas kedalaman satu definisi": "const MAKS = {dalam_maks_m: 5};\nif (kedalaman > 5) tolak();",
};
const BERSIH = "const s = 'Titik panas'; el.textContent = fmt(1.5); const KONST = {a: 1}; if (n < 5) x();";

for (const [nama, aturan] of Object.entries(ATURAN)) {
  test(`gerbang SIPPA penolakan butir ${nama}: fixture pelanggaran merah, fixture bersih hijau`, () => {
    assert.ok(PELANGGARAN[nama], `butir ${nama} tanpa fixture pelanggaran`);
    assert.ok(jalankan(aturan, "fixture/layar_x.js", PELANGGARAN[nama]).length > 0, `butir ${nama} lolos pada kode yang melanggar: gerbang tidak pernah merah`);
    assert.deepEqual(jalankan(aturan, "fixture/layar_x.js", BERSIH), [], `butir ${nama} menolak kode bersih`);
  });
}

test("gerbang SIPPA penolakan butir 8: definisi kedua dalam_maks_m di berkas lain ditolak, di hitung.js sekali boleh", () => {
  const a = ATURAN["8 batas kedalaman satu definisi"];
  assert.equal(jalankan(a, "public/pipa/hitung.js", "KONST = {dalam_maks_m: 5}").length, 0);
  assert.ok(jalankan(a, "public/pipa/hitung.js", "{dalam_maks_m: 5, dalam_maks_m: 5}").length > 0);
  assert.ok(jalankan(a, "public/pipa/layar_peta.js", "const k = {dalam_maks_m: 5}").length > 0);
});

test("gerbang SIPPA penolakan butir 6 RU: berkas data di public/pipa terdeteksi oleh pola yang dipakai", () => {
  for (const n of ["x.json", "x.CSV", "peta/y.geojson"]) assert.match(n, /\.(json|csv|geojson)$/i);
  assert.doesNotMatch("ikon.js", /\.(json|csv|geojson)$/i);
});
