/* Layar Pemicu: sel Tingkat ringkas (pil + sebab pendek, rinci di tooltip) dan spanduk data basi di atas layar. DOM tidak disentuh. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
const P = await import("../../public/pipa/layar_pemicu.js");

const baris = (kab, tingkat, o = {}) => ({prov: "62", kab, tingkat, wilayah_iklim: "kalbar_kalteng", musim: "SON 2026", anom_pct: -29.5, anom_p10: -45.6, anom_p90: -13.3, hari_ps50: 4, titik_panas_zona_ab: 0, alasan: ["a"], ...o});
const SEGAR = {dibuat: "2026-10-25T07:00+07:00", ansambel_dibuat: "2026-10-25T02:00+07:00", titik24_acuan: "2026-10-25T05:00:00+00:00", basi: {ansambel: false, titik24: false}};
const KINI = Date.parse("2026-10-25T08:00+07:00");
const model = (b, basi) => P.barisModel({baris: [b], ...SEGAR, basi: {ansambel: false, titik24: false, ...basi}}, {pusat: new Map(), kits: [], peran: "W", kini: KINI})[0];

test("selTingkat: pil ringkas; saran tindakan dan sebab basi pindah ke tooltip, bukan kolom kata-kata tinggi", () => {
  const h = P.selTingkat(model(baris("A", "SIAGA"), {ansambel: true}));
  assert.match(h, /<span class="sp-tingkat t-siaga" title="[^"]*Cek kesiapan kit[^"]*">SIAGA<\/span>/, "chip SIAGA, saran di title");
  assert.match(h, /<span class="sr">PRA-POSISI dan GELAR: –, data ansambel basi<\/span>/, "sebab basi tetap untuk pembaca layar; tampilan cukup spanduk atas (28 Okt)");
  assert.doesNotMatch(h, /sp-yakin/, "tanpa pil basi berulang per baris");
  assert.doesNotMatch(h, /<small/, "tanpa baris kecil yang membungkus");
  assert.ok(h.replace(/<span class="sr">.*?<\/span>/g, "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).length <= 3, "teks tampil paling banyak tiga kata: " + h);
  assert.match(P.selTingkat(model(baris("B", "GELAR"), {ansambel: true})), /t-basi" title="–, data ansambel basi">basi</, "GELAR dipadamkan basi: pil basi, bukan kalimat");
  assert.doesNotMatch(P.selTingkat(model(baris("C", "NORMAL", {anom_pct: -2}))), /basi/);
});

test("selTingkat: saran tindakan tetap terbaca pembaca layar", () => {
  const h = P.selTingkat(model(baris("A", "PRA-POSISI")));
  assert.match(h, /<span class="sr">[^<]*depot depan[^<]*<\/span>/);
});

test("bannerBasi: kosong bila segar; ansambel basi: spanduk status bilang SIAGA bukan berarti aman dan menyebut waktu dibuat", () => {
  assert.equal(P.bannerBasi(SEGAR, KINI), "");
  const a = P.bannerBasi({...SEGAR, basi: {ansambel: true, titik24: false}}, KINI);
  assert.match(a, /role="status"/); assert.match(a, /Data ansambel basi/); assert.match(a, /SIAGA bukan berarti aman/); assert.match(a, /PRA-POSISI dan GELAR tidak dihitung/);
  assert.match(a, /dibuat 25 Okt 02\.00 WIB/);
  const t = P.bannerBasi({...SEGAR, basi: {ansambel: false, titik24: true}}, KINI);
  assert.match(t, /Data titik panas basi/); assert.doesNotMatch(t, /SIAGA bukan berarti aman/);
  assert.match(P.bannerBasi({...SEGAR, basi: {ansambel: true, titik24: true}}, KINI), /Data ansambel dan titik panas basi/);
});
