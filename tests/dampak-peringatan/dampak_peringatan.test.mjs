/* DP-10: fungsi murni public/inti/dampak_peringatan.js (RENCANA-UJI N1, N2, N3, N10, N11, N13, N14). node --test tests/dampak-peringatan/dampak_peringatan.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import "../../public/inti/dampak_peringatan.js";

const D = globalThis.DampakPeringatan;
const baca = f => readFileSync(new URL("../../" + f, import.meta.url), "utf8");
/* sementara sampai DP-22 menaruh daftar bersama di tests/dampak-peringatan/kata_dilarang.mjs (D32) */
const KATA_DILARANG = /\b(aman|terdampak|korban)\b/i;

const status = {boleh_tampil: false, kab: {"1101": {nama: "Kab. Aceh Selatan", status: {BNJ: {s: 2, pemicu: "keduanya", hari: [2, 1, 1, 0]}}}}};
const ringkas = {peringatan: [{bahaya: "banjir", wilayah: "Aceh Selatan", berlaku_sampai: "2026-11-26T18:00+07:00", web: "javascript:alert(1)"},
  {bahaya: "angin kencang", web: "https://www.bmkg.go.id/x"}],
  kab: {"1101": {nama: "Kab. Aceh Selatan", penduduk_area_peringatan: {worldpop: 54321, dukcapil: null}, jiwa_kelas: {tinggi: 8800, sedang: 20000, rendah: 15000, tak_terliput: 0},
    fasilitas: {sekolah_dapodik: 37, faskes_osm: null}}}};

test("N1: data hilang tidak galat, tampil abu belum terukur", () => {
  const e = D.statusEfektif(undefined, null, "bnj");
  assert.equal(e.s, null); assert.equal(e.belum, true);
  const m = D.modelKartu("9999", "bnj", {});
  assert.equal(m.tingkat, "Belum terukur"); assert.equal(m.token, "--dp-belum"); assert.deepEqual(m.penduduk, ["belum terukur"]);
});

test("N1: pasang dengan jaringan gagal tidak menyentuh peta", async () => {
  const asli = globalThis.fetch; globalThis.fetch = async () => ({ok: false});
  try {
    const panggilan = [];
    const peta = {on() {}, off() {}, addSource: () => panggilan.push("src"), addLayer: () => panggilan.push("lyr")};
    assert.equal(await D.pasang(peta, {bahaya: "bnj"}).nyalakan(), false);
    assert.deepEqual(panggilan, []);
  } finally { globalThis.fetch = asli; }
});

test("N2: hipotesis kecuali boleh_tampil true persis (gagal tertutup)", () => {
  const e = (b, per) => D.statusEfektif({s: 1, boleh_tampil: b}, per, "bnj").hipotesis;
  assert.equal(e(undefined, {}), true); assert.equal(e("true", {}), true); assert.equal(e(1, {}), true); assert.equal(e(true, {}), false);
  assert.equal(D.statusEfektif({s: 1}, {boleh_tampil: true}, "bnj").hipotesis, false);
  assert.equal(D.statusEfektif({s: 1}, {boleh_tampil: {BNJ: true}}, "bnj").hipotesis, false);
  assert.equal(D.statusEfektif({s: 1}, {boleh_tampil: {LSR: true}}, "bnj").hipotesis, true);
  assert.ok(D.modelKartu("1101", "bnj", {ringkas, status}).pil.includes("Hipotesis"));
  assert.ok(!D.modelKartu("1101", "bnj", {ringkas, status: {...status, boleh_tampil: true}}).pil.includes("Hipotesis"));
});

test("N3: hijau Normal hanya bila semua sumber segar; tooltip persis; tanpa ikon centang", () => {
  assert.equal(D.statusEfektif({s: 0}, {}, "bnj").token ?? D.token(D.statusEfektif({s: 0}, {}, "bnj").s), "--dp-0");
  for (const rusak of [{s: 0, sebagian: true}, {s: 0, segar: false}, {s: null}, {s: 4}, {s: "0"}, {}, null]) {
    const e = D.statusEfektif(rusak, {}, "bnj"); assert.equal(e.s, null, JSON.stringify(rusak)); assert.equal(D.token(e.s), "--dp-belum");
  }
  assert.equal(D.tooltip(0), "Normal: tidak ada pemicu di atas ambang dalam 3 hari ke depan menurut prakiraan Centurisk97 dan BMKG. Ini bukan jaminan keselamatan.");
  assert.equal(D.tooltip(null), "Belum terukur: sebagian sumber belum masuk atau sudah basi.");
  assert.doesNotMatch(D.tooltip(0), /[✓✔🛡]|aman/i);
  assert.equal(D.statusEfektif({s: 2, sebagian: true}, {}, "bnj").sebagian, true);   // tingkat naik tetap tampil dengan tanda sebagian
  assert.equal(D.statusEfektif({s: 3}, {}, "bnj").s, 3);
  assert.equal(D.namaTingkat(0, ["Pencegahan rutin", "Patroli terpadu", "Siaga pemadaman awal", "Prioritas pemadaman"]), "Pencegahan rutin");
  assert.equal(D.namaTingkat(3), "Awas");
});

test("pembulatan: dua angka bermakna, kosong bukan nol", () => {
  assert.equal(D.bulatJiwa(54321), "sekitar 54.000"); assert.equal(D.bulatJiwa(8849), "sekitar 8.800"); assert.equal(D.bulatJiwa(1234567), "sekitar 1.200.000");
  assert.equal(D.bulatJiwa(99), "kurang dari 100"); assert.equal(D.bulatJiwa(0), "0");
  assert.equal(D.bulatJiwa(null), "belum terukur"); assert.equal(D.bulatJiwa(undefined), "belum terukur"); assert.equal(D.bulatJiwa(NaN), "belum terukur");
  const m = D.modelKartu("1101", "bnj", {ringkas, status});
  assert.deepEqual(m.penduduk, ["WorldPop: sekitar 54.000", "Dukcapil: belum terukur"]);
  assert.ok(m.fasilitas.includes("Fasilitas kesehatan (OpenStreetMap): belum terukur"));   // fasilitas per sumber, tanpa gabungan
});

test("N10: registri punya kemampuan.layar.status_dampak berupa daftar slug di semua entri", () => {
  const reg = JSON.parse(baca("public/bencana.json"));
  const daftar = reg.bencana ?? reg;
  const semua = Array.isArray(daftar) ? daftar : Object.values(daftar);
  assert.ok(semua.length >= 9);
  for (const b of semua) {
    const v = b.kemampuan.layar.status_dampak;
    assert.ok(Array.isArray(v) && v.every(x => /^[a-z0-9_]+$/.test(x) && D.BAHAYA[x]), b.id);
  }
});

test("N11: satu halaman hanya bahayanya sendiri", () => {
  const ada = k => D.peringatanUntuk(ringkas.peringatan, k).map(p => p.bahaya);
  assert.deepEqual(ada("bnj"), ["banjir"]); assert.deepEqual(ada("cex"), ["angin kencang"]); assert.deepEqual(ada("kht"), []);
  assert.throws(() => D.pasang({on() {}}, {bahaya: "gempa"}));
  assert.equal(D.modelKartu("1101", "lsr", {ringkas, status}).tingkat, "Belum terukur");   // status BNJ tidak bocor ke LSR
});

test("N14: tautan non-https tampil sebagai teks", () => {
  assert.equal(D.tautanAman("javascript:alert(1)"), null); assert.equal(D.tautanAman("http://x.id"), null); assert.equal(D.tautanAman("data:text/html,x"), null);
  assert.equal(D.tautanAman("https://www.bmkg.go.id/x"), "https://www.bmkg.go.id/x");
  const [a] = D.modelKartu("1101", "bnj", {ringkas, status}).peringatan;
  assert.equal(a.url, null); assert.match(a.teks, /Banjir di Aceh Selatan/);
});

test("N13: teks tanpa titik tengah, tanpa huruf kapital semua, tanpa kata dilarang, tanpa literal warna", () => {
  const m = D.modelKartu("1101", "bnj", {ringkas, status});
  const teks = [m.judul, m.bahaya, m.tingkat, m.tip, ...m.pil, m.pemicu, ...m.hari.flatMap(h => [h.label, h.teks]), ...m.penduduk, ...m.kelas, ...m.fasilitas, ...m.peringatan.map(p => p.teks), D.TIP_NORMAL, D.TIP_BELUM].join("\n");
  for (const t of teks.split("\n")) {
    assert.ok(!t.includes("·"), t); assert.doesNotMatch(t, KATA_DILARANG, t);
    assert.doesNotMatch(t.replace(/\b(BMKG|BNJ|LSR|CEX|KHT|OSM)\b/g, ""), /\b[A-Z]{4,}\b/, t);
  }
  const js = baca("public/inti/dampak_peringatan.js"), css = baca("public/inti/dampak_peringatan.css");
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|oklab)\(/i);
  assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ""), /#[0-9a-f]{6}\b|\boklch\(|\bhsla?\(|\brgba?\(\s*\d/i);
  assert.doesNotMatch(js, /innerHTML/);
});
