import {test} from "node:test"; import assert from "node:assert/strict"; import {readFileSync} from "node:fs";
const js = readFileSync(new URL("../../public/lapor/lapor.js", import.meta.url), "utf8");
const mesin = readFileSync(new URL("../../src/lapor_mesin.js", import.meta.url), "utf8");
test("tanda terima tercatat dipisah dari pertanyaan (mesin + klien)", () => {
  assert.match(mesin, /konfirmasi: resi/); assert.match(js, /tambahResi\(j\.konfirmasi\)/);
  const re = /^\*[^*\n]*tercatat\*(?:\n[^\n]+)*(?=\n\n|$)/, t = "*Lokasi tercatat*\nDesa/Kel. Utan Kayu Utara, Kec. Matraman\n\n*Siapa nama?*\nTulis.";
  assert.equal(re.exec(t)[0], "*Lokasi tercatat*\nDesa/Kel. Utan Kayu Utara, Kec. Matraman"); assert.equal(re.exec("*Siapa?*\nTulis"), null);
});
test("batang tingkat hanya untuk skala berurutan; hubungan berikon orang", () => {
  const f = new Function(js.match(/const bertingkat = [^\n]+/)[0] + "; return bertingkat;")();
  assert.equal(f(["Tidak ada", "Sedikit", "Sedang", "Banyak"]), true); assert.equal(f(["Ringan", "Sedang", "Berat", "Tidak tahu"]), true);
  assert.equal(f(["Anak", "Orang tua", "Suami atau istri", "Saudara", "Teman atau tetangga", "Lainnya"]), false);
  assert.match(js, /\^\(anak\|orang tua\|suami\|istri/);
});
test("isian bebas: kotak bertoken lp-isian, Lewati dan Kirim sejajar, umur satu baris papan angka (pemilik 26 Nov 2026)", () => {
  assert.match(js, /j\.minta === "angka" \|\| \(j\.minta !== "setuju" && j\.pilihan\.length === 1 && RE_LEWATI\.test\(j\.pilihan\[0\]\)\)\) \{ isiTeksBebas/);
  assert.match(js, /el\(angka \? "input" : "textarea", "lp-isian"\)/); assert.match(js, /t\.inputMode = "numeric"/);
  assert.match(js, /el\("button", "lp-kedua", j\.pilihan\[0\]\)/); assert.doesNotMatch(js, /"lp-catatan-kecil lp-tautan-polos", j\.pilihan\[0\]/);
  const css = readFileSync(new URL("../../public/lapor/lapor.css", import.meta.url), "utf8");
  assert.match(css, /\.lp-isian\{[^}]*font:[^}]*var\(--font\)/, "kotak ketik memakai huruf situs, bukan monospace bawaan textarea");
});
test("menu Edukasi bernama Edukasi", () => { assert.doesNotMatch(js, /Edukasi siaga"/); assert.match(js, /pilihGrup\("Edukasi"\)/); });
