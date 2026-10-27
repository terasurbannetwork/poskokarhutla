/* Layar Kit: judul kartu ringkas (satu klausa) dan status sebagai pil, bukan kalimat daftar lokasi yang membungkus. DOM tidak disentuh. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
const K = await import("../../public/pipa/layar_kit.js");

test("judulKit: jumlah kit dan kehilangan, tanpa daftar lokasi; kosong berkalimat", () => {
  const kits = [{status: "gudang", lokasi: "Gudang dummy"}, {status: "gudang", lokasi: "Gudang dummy"}, {status: "banjir", lokasi: "Posko banjir dummy"}];
  assert.equal(K.judulKit(kits, 1.2), "3 kit; kehilangan komponen musim ini 1,2%");
  assert.equal(K.judulKit(kits, null), "3 kit");
  assert.equal(K.judulKit([], null), "Belum ada kit terdaftar");
  assert.ok(K.judulKit(kits, 1.2).length < 50, "judul pendek, tidak membungkus tiga baris");
});

test("pilStatusKit: satu pil per status berurutan siklus hidup, jumlah id-ID, lokasi di tooltip, teks data di-escape", () => {
  const kits = [{status: "banjir", lokasi: "Posko <b>x</b>"}, {status: "gudang", lokasi: "Gudang A"}, {status: "gudang", lokasi: "Gudang A"}, {status: "gudang", lokasi: "Gudang B"}];
  const h = K.pilStatusKit(kits);
  assert.ok(h.indexOf("3 di gudang") < h.indexOf("1 dipakai banjir"), "gudang lebih dulu dari banjir (urutan STATUS)");
  assert.match(h, /<span class="sp-status gudang" title="Gudang A, Gudang B">3 di gudang<\/span>/);
  assert.match(h, /title="Posko &lt;b&gt;x&lt;\/b&gt;"/); assert.doesNotMatch(h, /<b>x/);
  assert.equal(K.pilStatusKit([]), "");
  assert.match(K.pilStatusKit([{status: "servis", lokasi: null}]), /<span class="sp-status servis">1 servis<\/span>/, "tanpa lokasi: tanpa title");
});
