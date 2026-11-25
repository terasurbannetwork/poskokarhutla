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
test("isian bebas dengan Lewati: textarea + hitung + Kirim, Lewati tautan kecil", () => {
  assert.match(js, /RE_LEWATI\.test\(j\.pilihan\[0\]\)\) \{ isiTeksBebas/); assert.match(js, /el\("textarea"\); t\.rows = 3; t\.maxLength = 300/);
  assert.match(js, /"lp-catatan-kecil lp-tautan-polos", j\.pilihan\[0\]/);
});
test("menu Edukasi bernama Edukasi", () => { assert.doesNotMatch(js, /Edukasi siaga"/); assert.match(js, /pilihGrup\("Edukasi"\)/); });
