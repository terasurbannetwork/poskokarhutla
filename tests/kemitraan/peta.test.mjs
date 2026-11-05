// KM-B07: proyeksi peta SVG .km-peta-wil murni: pojok bbox -> sudut viewBox, evenodd untuk cincin, render prov 62 < 50 ms.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// package.json "type":"module" membuat require() memuat .js sebagai ESM; peta.js adalah skrip klasik peramban, jadi dijalankan di vm dengan `module` buatan
const kotak = { module: { exports: {} }, Math, Number, String, Set };
vm.runInNewContext(readFileSync(join(AKAR, "public/kemitraan/peta.js"), "utf8"), kotak);
const { proyeksi, xy, jalur, html } = kotak.module.exports;
const geo = (p) => JSON.parse(readFileSync(join(AKAR, `public/geo/${p}.json`), "utf8")).features;
const dekat = (a, b, pesan) => assert.ok(Math.abs(a - b) < 0.01, `${pesan}: ${a} != ${b}`);

const persegi = { type: "Feature", properties: { kab: "Uji" }, geometry: { type: "Polygon", coordinates: [[[100, -2], [104, -2], [104, 2], [100, 2], [100, -2]]] } };

test("proyeksi equirectangular: titik pojok bbox jatuh di sudut viewBox (barat-utara = pad, timur-selatan = ukuran - pad)", () => {
  const P = proyeksi([persegi]), [x0, y0, x1, y1] = P.bbox;
  const [ax, ay] = xy(P, x0, y1), [bx, by] = xy(P, x1, y0);
  dekat(ax, P.pad, "barat-utara x"); dekat(ay, P.pad, "barat-utara y");
  dekat(bx, P.W - P.pad, "timur-selatan x"); dekat(by, P.H - P.pad, "timur-selatan y");
  assert.equal(Math.max(P.W, P.H) - 2 * P.pad, 1000, "sisi terpanjang harus 1000 satuan di luar pad");
});

test("proyeksi: lebar dikoreksi cos(lintang tengah), geo kosong = null, kab nyata tidak keluar viewBox", () => {
  const dekatKutub = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[0, 59], [2, 59], [2, 61], [0, 61], [0, 59]]] } };
  const P = proyeksi([dekatKutub]);
  assert.ok(P.W < P.H, `lintang 60: lebar ${P.W} harus lebih sempit dari tinggi ${P.H} (cos 60 = 0,5)`);
  assert.equal(proyeksi([]), null);
  assert.equal(html({ geo: [] }), "");
  const fs = geo("kabupaten/62"), Q = proyeksi(fs);
  for (const f of fs) for (const poli of f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) for (const [lo, la] of poli[0]) {
    const [x, y] = xy(Q, lo, la);
    assert.ok(x >= -0.01 && x <= Q.W + 0.01 && y >= -0.01 && y <= Q.H + 0.01, `titik ${lo},${la} di luar viewBox: ${x},${y} dari ${Q.W}x${Q.H}`);
  }
});

test("jalur: tiap cincin satu subpath tertutup (lubang = cincin kedua) dan MultiPolygon digabung; CSS memakai fill-rule evenodd", () => {
  const P = proyeksi([persegi]);
  const lubang = { type: "Polygon", coordinates: [persegi.geometry.coordinates[0], [[101, -1], [102, -1], [102, 1], [101, 1], [101, -1]]] };
  assert.equal((jalur(lubang, P).match(/M/g) || []).length, 2, "Polygon berlubang harus 2 subpath");
  assert.equal((jalur(lubang, P).match(/Z/g) || []).length, 2);
  const multi = { type: "MultiPolygon", coordinates: [persegi.geometry.coordinates, persegi.geometry.coordinates] };
  assert.equal((jalur(multi, P).match(/M/g) || []).length, 2, "MultiPolygon 2 bagian = 2 subpath");
  const css = readFileSync(join(AKAR, "public/kemitraan.css"), "utf8");
  assert.match(css, /\.km-peta-wil path\{[^}]*fill-rule:evenodd/, "kemitraan.css harus memberi fill-rule:evenodd pada path peta");
});

test("html: kelas mengisi k0..k3, tanpa kelas = kn, sorot, arsir celah, titik kampus dan desa, nilai di-esc, tanpa gaya inline", () => {
  const dua = [persegi, { ...persegi, properties: { kab: "<b>Dua</b>" } }];
  const s = html({ geo: dua, kelas: { Uji: 3 }, sorot: "Uji", arsir: ["<b>Dua</b>"], titik: [{ lat: 0, lon: 102, jenis: "kampus", nama: "Kampus \"A\"" }, { lat: 1, lon: 101, jenis: "desa" }, { lat: null, lon: 1 }] });
  assert.match(s, /class="k3 pilih"/); assert.match(s, /class="kn"/); assert.match(s, /class="km-celah" fill="url\(#km-pola-\d+\)"/);
  assert.equal((s.match(/km-titik-kampus/g) || []).length, 1); assert.equal((s.match(/km-titik-desa/g) || []).length, 1, "titik tanpa koordinat harus dilewati");
  assert.ok(!s.includes("<b>Dua"), "nama kab tidak di-esc"); assert.ok(s.includes("&lt;b&gt;Dua"), "nama ter-esc tidak muncul di tooltip");
  assert.ok(!/\sstyle\s*=|\son[a-z]+\s*=/i.test(s), "SVG tidak boleh memuat gaya/handler inline (CSP)");
  assert.notEqual(html({ geo: dua }).match(/km-pola-\d+/)[0], s.match(/km-pola-\d+/)[0], "id pola harus unik per peta");
});

test("render prov 62 (kabupaten dan kecamatan) kurang dari 50 ms", () => {
  for (const [nama, fs] of [["kabupaten/62", geo("kabupaten/62")], ["kecamatan/62", geo("kecamatan/62")]]) {
    html({ geo: fs });   // pemanasan JIT
    const t = performance.now(); const s = html({ geo: fs, kelas: {} }); const ms = performance.now() - t;
    assert.ok(s.length > 1000, `${nama}: keluaran kosong`);
    assert.ok(ms < 50, `${nama}: render ${ms.toFixed(1)} ms (${fs.length} fitur, ${s.length} byte) melebihi 50 ms`);
  }
});
