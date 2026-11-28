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

// Layar baru (IK-11, DW-09): kepala kartu = nama seksi; tanpa hl() / .hl (kalimat temuan) dan tanpa baris kesimpulan ops-lead.
test("insiden_kaya dan desa-waspada: tanpa kalimat temuan di kepala kartu", () => {
  for (const f of ["public/insiden_kaya.js", "public/desa-waspada/desa-waspada.js"]) {
    const js = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(js, /\bhl\(|class=\\?["']hl|ops-lead/, `${f}: kalimat temuan (.hl) atau ops-lead dipakai; kepala kartu = nama seksi`);
    assert.match(js, /<h3|el\("h3"/, `${f}: kartu tanpa kepala h3`);
  }
});
test("pemeriksa kalimat temuan menangkap pelanggaran contoh", () => {
  const re = /\bhl\(|class=\\?["']hl|ops-lead/;
  for (const jahat of ['x = `<h3>${hl(n)} desa</h3>`', 'x = \'<b class="hl">3</b>\'', 'x = "ops-lead"']) assert.match(jahat, re);
});

// Banjir: kartu status dan nowcast longsor tanpa kalimat temuan di baris pertama.
test("banjir/longsor: tanpa kalimat temuan di kartu status dan nowcast", () => {
  const js = readFileSync(new URL("../../public/banjir/longsor.js", import.meta.url), "utf8");
  assert.doesNotMatch(js, /Awas \$\{fmt\(n\[3\]\)\}|kecamatan berbahaya tinggi|\bhl\(|ops-lead/, "kalimat temuan kembali di longsor.js");
});

// Siklus Bencana (/siklus, 26 Nov 2026): kartu() menaruh kalimat temuan (.hl) di baris .sk-ring, kepala h3 = nama seksi; tak ada pemanggil yang menulis ke h3.
test("siklus: kepala kartu = nama seksi, angka temuan di .sk-ring", () => {
  const baca = f => readFileSync(new URL(`../../public/siklus/${f}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const inti = baca("inti.js");
  assert.match(inti, /ringkas \? namaDariEy\(ey\) : judul/, "kartu() harus memakai nama seksi di h3 bila judul memuat .hl");
  assert.match(inti, /class: "sk-ring"/);
  for (const f of ["gladi.js", "kaji.js", "kejadian.js", "masadepan.js", "paparan.js", "pintu.js", "pulih.js", "registri.js", "renkon.js"])
    assert.doesNotMatch(baca(f), /querySelector\((["'])h3\1\)/, `${f}: judul dinamis ditulis ke h3; pakai .sk-ring`);
});
