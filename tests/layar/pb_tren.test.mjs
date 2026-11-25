// PB-53 (F-27): grafik tren jangka panjang. Regresi dan pita dihitung mesin Python sungguhan (scripts/umum/selang.py),
// lalu digambar public/inti/tren.js; deret < 60 bulan tanpa garis dan jujur "deret terlalu pendek".
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {svgTren, ringkasTren, cukup} from "../../public/inti/tren.js";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const regresi = nilai => JSON.parse(execFileSync("python3", ["-I", "-c", `
import importlib.util, json, sys
s = importlib.util.spec_from_file_location("selang", sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
print(json.dumps(m.tren_linear(json.loads(sys.stdin.read()))))`, `${AKAR}/scripts/umum/selang.py`], {input: JSON.stringify(nilai)}).toString());
const deret = (n, f, o = {}) => { const nilai = Array.from({length: n}, (_, i) => f(i)); return {nama: "Anomali hujan", satuan: "mm", mulai: "2015-01", nilai, regresi: regresi(nilai), ...o}; };
const gelombang = i => 0.4 * i + 10 * Math.sin(i * 0.52) + ((i * 7919) % 13) - 6;

test("deret 72 bulan: garis, pita 95%, satu kolom hover bertooltip per bulan", () => {
  const s = deret(72, gelombang);
  assert.ok(cukup(s) && s.regresi.arah === "naik", JSON.stringify(s.regresi).slice(0, 200));
  const h = svgTren(s);
  assert.ok(h.includes('class="tr-garis"') && h.includes('class="tr-pita"'));
  const tip = [...h.matchAll(/class="tr-hit"[^>]*data-tip="([^"]*)"/g)].map(m => m[1]);
  assert.equal(tip.length, 72);
  assert.ok(tip[0].startsWith("&lt;b&gt;Jan 2015&lt;/b&gt;") && tip[71].includes("Des 2020") && tip[5].includes("Garis tren"), tip[5]);
  const r = ringkasTren(s);
  assert.match(r, /per 10 tahun, selang 95% .* dari 72 bulan 2015 sampai 2020\./);
  assert.ok(r.includes("bukan prakiraan"));
});

test("deret di bawah 60 bulan: tanpa garis dan pita, tertulis deret terlalu pendek", () => {
  const s = deret(37, gelombang);
  assert.equal(s.regresi.cukup, false);
  const h = svgTren(s);
  assert.ok(!h.includes("tr-garis") && !h.includes("tr-pita") && h.includes('class="tr-deret"'));
  assert.equal(ringkasTren(s), "Deret terlalu pendek untuk garis tren: 37 dari 60 bulan yang dibutuhkan.");
  assert.ok(!svgTren(s).includes("Garis tren:"), "tooltip tanpa nilai garis");
});

test("deret acak tanpa arah: selang memuat nol, ditulis belum jelas", () => {
  const s = deret(120, i => ((i * 7919) % 17) - 8);
  assert.equal(s.regresi.arah, "tidak jelas");
  assert.ok(ringkasTren(s).includes("arahnya belum jelas"));
});

test("bulan kosong memutus garis; pengamat berubah ditandai; teks di-escape; tanpa kata terlarang", () => {
  const s = deret(72, gelombang, {nama: '<img src=x onerror=alert(1)>', pengamat_berubah: "Cakupan pencatatan DIBI naik dari tahun ke tahun"});
  s.nilai[30] = null;
  const h = svgTren(s), d = h.match(/class="tr-deret" d="([^"]*)"/)[1];
  assert.equal((d.match(/M/g) || []).length, 2);
  assert.ok(h.includes("Cakupan pencatatan DIBI naik") && !h.includes("<img") && h.includes("tidak ada data"));
  for (const t of [h, ringkasTren(s), ringkasTren(deret(37, gelombang))]) assert.ok(!/\baman\b|\bprediksi\b|akan (naik|turun)/i.test(t), t.slice(0, 120));
});

test("layar /semua memakai komponen bersama, warna tren hanya dari token", () => {
  const a = readFileSync(`${AKAR}/public/semua/analisis.js`, "utf8"), css = readFileSync(`${AKAR}/public/inti/tren.css`, "utf8");
  assert.ok(a.includes('from "/inti/tren.js"') && a.includes('"Tren jangka panjang"'));
  assert.ok(readFileSync(`${AKAR}/public/semua/index.html`, "utf8").includes('href="/inti/tren.css"'));
  const blok = css.slice(css.indexOf("/* grafik tren jangka panjang"));
  assert.ok(blok.length > 100 && !/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(blok), "literal warna di blok tren");
});
