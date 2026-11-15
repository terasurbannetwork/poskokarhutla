/* TW-09: model murni halaman /bantu dan kepatuhan CSP/aturan layar. Jalan: node --test tests/layar/bantu.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ambilToken, siapkanTawaran, labelBarang, tglDariMs, PIL} from "../../public/bantu.js";

const baca = f => readFileSync(new URL("../../public/" + f, import.meta.url), "utf8");
const T = "A".repeat(43);

test("token hanya dari fragmen sah 43 karakter", () => {
  assert.equal(ambilToken("#t=" + T), T);
  for (const h of ["", "#", "#t=pendek", "#t=" + T + "x", "#x=" + T, "?t=" + T]) assert.equal(ambilToken(h), null, h);
});
test("tawaran: batas jumlah, barang lainnya, mitra wajib NGO internasional", () => {
  const sah = {barang: "beras", jumlah: "10", satuan: " dus "};
  assert.deepEqual(siapkanTawaran(sah, "kampus").badan, {barang: "beras", jumlah: 10, satuan: "dus"});
  for (const j of ["0", "1.5", "100000001", "", "abc"]) assert.ok(siapkanTawaran({...sah, jumlah: j}, "kampus").galat, j);
  assert.ok(siapkanTawaran({...sah, barang: ""}, "kampus").galat);
  assert.ok(siapkanTawaran({...sah, barang: "lainnya"}, "kampus").galat);
  assert.ok(siapkanTawaran({...sah, barang: "lainnya", barang_lain: "Sepatu"}, "kampus").badan);
  assert.ok(siapkanTawaran(sah, "ngo_internasional").galat);
  assert.equal(siapkanTawaran({...sah, mitra_lokal: "PMI"}, "ngo_internasional").badan.mitra_lokal, "PMI");
  assert.ok(siapkanTawaran({...sah, jumlah: "100000000"}, "kampus").badan);
});
test("label, tanggal WIB, pil status", () => {
  assert.equal(labelBarang("air_mineral"), "Air mineral");
  assert.equal(tglDariMs(Date.parse("2026-11-10T00:00:00+07:00")), "2026-11-10");
  assert.equal(tglDariMs(null), "");
  assert.deepEqual(Object.keys(PIL), ["masuk", "dicocokkan", "diterima", "dialihkan", "ditolak"]);
});
test("kepatuhan CSP dan aturan layar: tanpa inline, on*=, gaya inline, localStorage, titik tengah", () => {
  const html = baca("bantu.html"), js = baca("bantu.js"), css = baca("bantu.css");
  assert.doesNotMatch(html.replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, ""), /<script|\son[a-z]{3,}\s*=|\sstyle\s*=/i);
  assert.doesNotMatch(js, /\bon[a-z]{3,}\s*=\s*\\?["']|innerHTML|insertAdjacentHTML|localStorage|sessionStorage|\.style\b|setAttribute\(\s*["']style/);
  for (const [n, k] of [["html", html], ["js", js], ["css", css]]) assert.doesNotMatch(k, /·/, n);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/, "literal warna");
  assert.doesNotMatch(css, /font-size:\s*[\d.]+px/);
  assert.match(js, /history\.replaceState/);
  assert.match(html, /<header class="ad-top">/);
});
