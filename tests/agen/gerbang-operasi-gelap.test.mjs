/* Gerbang warna gelap hanya di kepala halaman /operasi (pemilik 11 Nov 2026: "highlight belakangnya gelap tuh cuma untuk yang atas").
   Kepala bagian, kepala kartu, dan kepala tabel di public/operasi_peta.css tidak boleh berlatar gelap. Yang dihitung: deklarasi
   background terakhir untuk selektor itu (CSS menimpa dari atas ke bawah). DESIGN-SYSTEM operasi-udara §8, AGENTS §3.5. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const CSS = readFileSync(new URL("../../public/operasi_peta.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const TERANG = ["#opsLaporan .ex-tabel thead th", "#opsLaporan .ops-wadah details.ops-kartu>summary.ex-hd", "#opsLaporan .ops-pb>header",
  "#opsLaporan .ops-ringkas-slot .ops-pa-sek.ops-rk>summary", "#opsLaporan .ops-ringkas-slot .ops-tindak>header",
  "#opsLaporan .ops-pa-sek>summary", "#opsLaporan .ops-omc-sas small.pv", "#opsLaporan .ops-pb-icao"];
const GELAP = /#0b2545|#7a1f12|#0b1730|#163056|rgb\(\s*11\s*,\s*37\s*,\s*69/i;

export function latarTerakhir(css, sel) {
  let hasil = null;
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const pemilih = m[1].split(",").map(x => x.trim());
    if (!pemilih.includes(sel)) continue;
    const g = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/.exec(m[2]); if (g) hasil = g[1].trim();
  }
  return hasil;
}

test("kepala bagian, kartu, dan tabel /operasi tidak berlatar gelap", () => {
  for (const sel of TERANG) {
    const bg = latarTerakhir(CSS, sel);
    assert.ok(bg, `${sel}: latar tidak ditetapkan`);
    assert.ok(!GELAP.test(bg.replace(/color-mix\([^)]*\)/g, "")), `${sel}: latar gelap (${bg}); gelap hanya untuk kepala halaman`);
  }
});

test("pemeriksa menangkap latar gelap terakhir", () => {
  assert.equal(latarTerakhir(".a{background:#fff}.a{background:#0b2545}", ".a"), "#0b2545");
  assert.equal(latarTerakhir(".b,.a{background:#fff!important}", ".a"), "#fff!important");
});
