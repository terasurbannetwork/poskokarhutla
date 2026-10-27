/* Uji peluang hujan lebat eksperimental dan pos hujan (public/banjir/eksperimen.js). Fixture di sini saja. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/eksperimen.js", src = fs.readFileSync(f, "utf8"), ctx = vm.createContext({Intl, Number, Object, Set, Map, Math, isFinite, String, Date});
vm.runInContext(src.slice(0, src.indexOf("/* ---------- bagian peta")), ctx);
const E = ctx.EksPA, plain = x => JSON.parse(JSON.stringify(x));
const D = {wilayah: {"11": {cakrawala: {besok: {t: "2026-10-28", p: .05}, lusa: {t: "2026-10-29", p: .3}, h3: {t: "x", p: .6}, h7: {p: 1, p_jumlah150: .2}}}, "11|Aceh Barat": {cakrawala: {besok: {p: .8}}}, "12": {}}};

test("sintaks sah dan teks tanpa titik tengah atau em dash", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0); assert.ok(!/·|—/.test(src));
});

test("kelas dan warna peluang, tanpa data transparan", () => {
  assert.deepEqual([0, .09, .1, .3, .5, .75, .99, 1].map(E.kelas), [0, 0, 1, 2, 3, 4, 4, 4]);
  assert.equal(E.kelas(null), -1); assert.equal(E.warna(undefined), "rgba(0,0,0,0)"); assert.equal(E.warna(.6), E.WARNA[3]);
  assert.equal(E.pct(.372), "37%"); assert.equal(E.pct(.001), "<1%"); assert.equal(E.pct(.999), ">99%"); assert.equal(E.pct(null), "–");
});

test("cakrawala: ubin hanya bila ada, nilai per cakrawala, label definisi", () => {
  assert.ok(E.ada(D)); assert.ok(!E.ada({wilayah: {"11": {}}})); assert.ok(!E.ada(null)); assert.ok(!E.ada({wilayah: {}}));
  assert.equal(E.nilai(D.wilayah["11"], "h7"), 1); assert.equal(E.nilai(D.wilayah["11"], "lusa"), .3); assert.equal(E.nilai(D.wilayah["12"], "besok"), null);
  assert.equal(E.DEFINISI.besok, "≥ 50 mm sehari"); assert.equal(E.DEFINISI.h3, "≥ 100 mm 3 hari"); assert.equal(E.DEFINISI.h7, "≥ 50 mm minimal sehari dalam 7 hari");
  assert.deepEqual(plain(E.CAKRAWALA).map(x => x[1]), ["Besok", "Lusa", "3 hari", "7 hari"]);
});

test("lencana: belum ada vonis, atau vonis dari prospektif", () => {
  assert.equal(E.lencana(D), "Eksperimental, belum ada vonis uji prospektif");
  assert.equal(E.lencana({prospektif: {vonis: "lolos"}}), "Eksperimental, lolos uji prospektif");
});

test("ekspresi warna: kecamatan memakai peluang kabupatennya, dikelompokkan per warna", () => {
  assert.equal(E.kunciPel("11|Aceh Barat|Meureubo"), "11|Aceh Barat"); assert.equal(E.kunciPel("11"), "11");
  const x = plain(E.ekspresi(D, "besok", ["11|Aceh Barat|A", "11|Aceh Barat|B", "11|Lain|C", "12"]));
  assert.equal(x[0], "match"); assert.deepEqual(x[2], ["11|Aceh Barat|A", "11|Aceh Barat|B"]); assert.equal(x[3], E.WARNA[4]); assert.equal(x.at(-1), "rgba(0,0,0,0)");
  assert.equal(E.ekspresi(D, "besok", ["12"]), "rgba(0,0,0,0)");
});

test("pos hujan: warna skala, data lama abu, geojson", () => {
  assert.equal(E.warnaHujan(0), "#c3ccd6"); assert.equal(E.warnaHujan(10), "#4f9be0"); assert.equal(E.warnaHujan(75), "#6a3fc0"); assert.equal(E.warnaHujan(300), "#7a1040"); assert.equal(E.warnaHujan(null), "#c3ccd6");
  const now = 1e6; assert.ok(E.redupHujan({t: now - 7 * 3600}, now)); assert.ok(!E.redupHujan({t: now - 3600}, now)); assert.ok(E.redupHujan({status: "macet", t: now}, now));
  const g = plain(E.geojsonHujan([{id: "a", nama: "A", lon: 106, lat: -6, mm_hari: 12.4, t: now - 60}, {id: "b", lon: null, lat: 1}, {id: "c", nama: "C", lon: 1, lat: 1, mm_hari: null, t: now}], now));
  assert.equal(g.features.length, 2); assert.equal(g.features[0].properties.a, "12"); assert.equal(g.features[1].properties.a, ""); assert.equal(g.features[0].properties.w, "#4f9be0");
  assert.equal(E.kelasHujan(60), "lebat");
});

test("wiring: grup Eksperimental, ubin tersembunyi sampai data ada, label jujur", () => {
  const h = fs.readFileSync("public/banjir/index.html", "utf8"), p = fs.readFileSync("public/banjir/peta.js", "utf8"), k = fs.readFileSync("public/banjir/kejadian.js", "utf8");
  assert.match(h, /<summary>Eksperimental<\/summary>\s*<label hidden[^>]*><input type="checkbox" data-l="peluang">/); assert.match(h, /<label hidden[^>]*><input type="checkbox" data-l="hujanukur">/);
  assert.match(h, /Wilayah Siaga \(prakiraan\)/); assert.match(p, /kejadian: "Wilayah Siaga"/); assert.match(p, /<div class="lbl">Wilayah Siaga \(prakiraan\)<\/div>/);
  assert.match(p, /\(model Open-Meteo, mm\)/); assert.ok(!/Kejadian banjir aktif<\/div>/.test(p));
  assert.match(k, /Prakiraan model, bukan kejadian teramati/);
  assert.match(p, /PosHujan\.hit\(e\.point\)/); assert.match(p, /Eksp\.tampil\(i\.checked\)/);
  assert.match(src, /l\.hidden = !ok/, "ubin tersembunyi bila rute 404 atau cakrawala belum ada");
});

test("p null: wilayah abu, bukan transparan dan bukan 0; label cakrawala bertanggal", () => {
  const d = {wilayah: {"32": {cakrawala: {besok: {t: "2026-10-28", p: null}}}, "32|Bogor": {cakrawala: {besok: {t: "2026-10-28", p: 0}}}}};
  assert.equal(E.warnaWilayah(d.wilayah["32"], "besok"), E.ABU); assert.equal(E.warnaWilayah(d.wilayah["32|Bogor"], "besok"), E.WARNA[0]); assert.equal(E.warnaWilayah(undefined, "besok"), "rgba(0,0,0,0)");
  assert.equal(E.nilai(d.wilayah["32"], "besok"), null); assert.equal(E.pct(null), "–");
  const w = {cakrawala: {besok: {t: "2026-10-28"}, lusa: {t: "2026-10-29"}, h3: {t: "2026-10-28", sampai: "2026-10-30"}, h7: {t: "2026-10-28", sampai: "2026-11-03"}}};
  assert.equal(E.labelCakrawala(w, "besok"), "Besok, Rab 28 Okt"); assert.equal(E.labelCakrawala(w, "lusa"), "Lusa, Kam 29 Okt");
  assert.equal(E.labelCakrawala(w, "h3"), "3 hari, 28 sampai 30 Okt"); assert.equal(E.labelCakrawala(w, "h7"), "7 hari, 28 Okt sampai 3 Nov"); assert.equal(E.labelCakrawala({}, "h3"), "3 hari");
  assert.equal(E.lencana({prospektif: {vonis: null, catatan: "belum ada uji prospektif"}}), "Eksperimental, belum ada vonis uji prospektif");
});

test("istilah gugus kejadian_aktif: Wilayah Siaga (prakiraan) di semua tampilan, kunci data tetap", () => {
  const b = n => fs.readFileSync("public/banjir/" + n, "utf8");
  assert.match(b("kejadian.js"), /nama: k => "Wilayah Siaga " \+/); assert.match(b("insight.js"), /wilayah Siaga \(prakiraan\)"\)} mencakup/); assert.ok(!/banjir aktif melanda/.test(b("insight.js")));
  assert.match(b("mulai.js"), /Wilayah Siaga \(prakiraan\) \$\{esc\(e\.kode\)\}/); assert.match(b("sapa_banjir.js"), /"Wilayah Siaga \(prakiraan\)"/);
  const w = b("wilayah.js"); assert.match(w, /"WS", "Wilayah Siaga \(prakiraan\), gugus"/); assert.match(w, />WS gugus<\/span>/); assert.match(w, />RB titik<\/span>/); assert.match(w, /Rob, titik Waspada\+/); assert.ok(!/>KA<\/span>/.test(w)); assert.match(w, /kejadian_aktif/);
});

test("kartu peluang: pil Eksperimental, vonis teks kecil; cache ekspresi dan tampil ditunda; pos hujan label minimal", () => {
  assert.equal(E.vonis(D), "Belum ada vonis uji prospektif"); assert.equal(E.vonis({prospektif: {vonis: "lolos"}}), "Vonis uji prospektif: lolos");
  assert.match(src, />Eksperimental<\/span><small[^>]*>\$\{esc\(EksPA\.vonis\(this\.d\)\)\}/); assert.match(src, /Sumber: \$\{esc\(this\.d\.sumber\)\}/);
  assert.match(src, /this\._ek\[this\.c\] \|\|=/); assert.match(src, /reset\(\) { this\._ek = {}; }/); assert.match(fs.readFileSync("public/banjir/peta.js", "utf8"), /Eksp\.reset\(\); Eksp\.terapkan\(\);/);
  assert.match(src, /tampil\(on\) {[^]*nanti\(\(\) => { if \(on\) this\.mulai\(\)/);
  assert.match(src, /mm sejak 00\.00 WIB, minimal/); assert.match(src, /mm sejak 00\.00 WIB, data lama/); assert.match(src, /1 jam terakhir, minimal/); assert.match(src, /"≥ " \+ EksPA\.kelasHujan/);
  const k = fs.readFileSync("public/banjir/kejadian.js", "utf8"); assert.ok(!/<\/b> · |\(prakiraan\) · /.test(k));
});
