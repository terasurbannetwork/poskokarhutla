/* Gerbang tanpa kalimat kesimpulan di kartu (pemilik 11 Nov 2026: "gausah ada kesimpulan ini", "Catet ya gausah ada yang gini.
   Jelek banget sumpah"). AGENTS.md 3.5 (pembaruan 11 Nov): kepala kartu = nama seksi, isi kartu tanpa kalimat kesimpulan.
   Layar yang sudah dirombak masuk daftar LAYAR; layar lain menyusul saat disentuh. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const LAYAR = ["public/operasi_laporan.js"];

test("layar dirombak: kepala kartu = nama seksi, tanpa baris kesimpulan di isi", () => {
  for (const f of LAYAR) {
    const js = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
    const bagian = js.match(/const bagian = \(ey, judul, isi[^\n]*\n[\s\S]*?\n  \};?\n/)?.[0] || js.match(/const bagian = [\s\S]*?<\/details>`;[^\n]*/)?.[0];
    assert.ok(bagian, `${f}: fungsi bagian() tidak ditemukan`);
    assert.doesNotMatch(bagian, /ops-lead/, `${f}: isi kartu memuat baris kesimpulan (ops-lead)`);
    assert.match(bagian, /<h3>\$\{nama\}<\/h3>/, `${f}: kepala kartu lipat harus memakai nama seksi, bukan judul kalimat`);
    assert.doesNotMatch(js, /class="ops-lead"/, `${f}: kelas ops-lead (kalimat kesimpulan) masih dipakai`);
  }
});
