/* Pratinjau tautan per rute (src/og_meta.js metaRute, fungsi murni) dengan meta.json tiruan. HTMLRewriter-nya tipis dan
   hanya ada di runtime Workers; yang diuji di sini keputusan judul/keterangan/gambar/url per jalur.
   Jalankan: node --test tests/warga/og.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {metaRute} from "../../src/og_meta.js";

const S = "https://pantau.terasurban.com";
const M = {situs: S, v: "2026-10-14", nama: {"62": "Kalimantan Tengah", "11": "Aceh"},
  halaman: {"/": {judul: "Nasional", desk: "desk nasional", gambar: "ringkasan"}, "/peta": {judul: "Peta", desk: "desk peta", gambar: "peta"},
    "/banjir/": {judul: "Banjir", desk: "desk banjir", gambar: "banjir"}},
  prov: {"62": {judul: "Kalteng · Pantau Bencana", desk: "desk kalteng", gambar: "prov-62"}},
  kompleks: {K0001: ["Seruyan, Kalimantan Tengah: prioritas pemadaman, 725 titik panas 24 jam (12 Okt)", "62"]}};
const u = s => new URL(S + s);
const img = g => `${S}/data/og/${g}.png?v=2026-10-14`;

test("kompleks dikenal: keterangan + gambar provinsinya, url tanpa UTM", () => {
  const m = metaRute(u("/k/K0001?utm_source=whatsapp&utm_medium=share"), M);
  assert.equal(m.url, S + "/k/K0001");
  assert.match(m.desk, /Seruyan/);
  assert.equal(m.gambar, img("prov-62"));
  assert.match(metaRute(u("/sim/K0001"), M).judul, /^Simulasi/);
});

test("kompleks tak dikenal, wil tak dikenal, dan jalur asing DITOLAK ke bawaan", () => {
  assert.equal(metaRute(u("/k/K9999"), M).gambar, img("ringkasan"));
  assert.equal(metaRute(u("/k/K9999"), M).desk, "desk nasional");
  assert.equal(metaRute(u("/?wil=99"), M).url, S + "/");
  assert.equal(metaRute(u("/?wil=%3Cscript%3E"), M).url, S + "/");
  assert.equal(metaRute(u("/bukan-tab"), M), null);
  assert.equal(metaRute(u("/"), {}), null);   // meta.json gagal dimuat: HTML apa adanya
});

test("provinsi lewat ?wil: prioritas pakai gambar provinsi, lainnya nama + gambar nasional", () => {
  assert.equal(metaRute(u("/?wil=62|Seruyan"), M).gambar, img("prov-62"));
  assert.equal(metaRute(u("/peta?wil=62"), M).url, S + "/peta?wil=62");
  const a = metaRute(u("/?wil=11"), M);
  assert.match(a.judul, /^Aceh/);
  assert.equal(a.gambar, img("ringkasan"));
});

test("halaman & tab: peta, banjir, tab lain dapat og:url sendiri", () => {
  assert.equal(metaRute(u("/peta"), M).gambar, img("peta"));
  assert.equal(metaRute(u("/banjir/"), M).url, S + "/banjir/");
  assert.equal(metaRute(u("/index.html"), M).url, S + "/");
  assert.equal(metaRute(u("/dampak"), M).url, S + "/dampak");
});
