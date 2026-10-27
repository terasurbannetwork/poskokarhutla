/* Uji lapis ekstra banjir (public/banjir/lapis_ekstra.js): fungsi murni, semua overlay mati bawaan. Fixture di sini saja. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/lapis_ekstra.js", src = fs.readFileSync(f, "utf8"), ctx = vm.createContext({Intl, Number, Object, Math, isFinite, String, Array});
vm.runInContext(src.slice(0, src.indexOf("/* ---------- bagian peta")), ctx);
const E = ctx.LEm, plain = x => JSON.parse(JSON.stringify(x));

test("sintaks sah, tanpa titik tengah atau em dash", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0); assert.ok(!/·|—/.test(src));
});

test("keempat lapisan bawaan mati: tak ada checked dan tak ada setLapis/nyala awal", () => {
  const menu = src.slice(src.indexOf("menu()"), src.indexOf("muat(k, u)"));
  assert.ok(menu.includes('type="checkbox"') && !/checked/.test(menu));
  assert.deepEqual(plain(ctx.LEm && ["pompa", "gfm", "padam", "subsiden"]), ["pompa", "gfm", "padam", "subsiden"]);
  for (const k of ["pompa", "gfm", "padam", "subsiden"]) assert.ok(src.includes(`["${k}", "`), k);
  assert.ok(/D: \{\}, P: \{\}, nyala: \{\}/.test(src));
  const peta = fs.readFileSync("public/banjir/peta.js", "utf8"), idx = fs.readFileSync("public/banjir/index.html", "utf8");
  assert.ok(!/data-l="(pompa|gfm|padam|subsiden)"[^>]*checked/.test(idx + peta));
});

test("pompa per kecamatan Siaga/Awas dan daftar Siaga tanpa pompa", () => {
  const pompa = [[1, 1, "A", "Kota X|Alfa", ""], [1, 1, "B", "Kota X|Alfa", ""], [1, 1, "C", "Kota X|Beta", ""]];
  const st = {"31|Kota X|Alfa": {b: [2, 0]}, "31|Kota X|Beta": {b: [3, 1]}, "31|Kota X|Gama": {b: [2, 2]}, "31|Kota X|Delta": {b: [1, 1]}, "12|Luar|Kec": {b: [3, 3]}};
  const r = plain(E.ringkasPompa(pompa, st, "b", 0));
  assert.equal(r.total, 3); assert.equal(r.siaga.length, 3); assert.equal(r.pompaDiSiaga, 3);
  assert.deepEqual(r.tanpaPompa.map(x => x.nama), ["Gama"]); assert.deepEqual(r.denganPompa.map(x => x.nama).sort(), ["Alfa", "Beta"]);
  assert.equal(r.siaga[0].lv, 3);
  assert.deepEqual(plain(E.ringkasPompa(pompa, st, "b", 1)).siaga.map(x => x.nama), ["Gama"]);
  assert.deepEqual(plain(E.ringkasPompa(null, null, "b", 0)).siaga, []);
  assert.equal(E.kunciKec("31|Kota X|Alfa"), "Kota X|Alfa");
});

test("GFM: kali tergenang = tanggal berbeda, luas terbesar, kelas pekat", () => {
  const kec = (g, mask = 10) => ({luas_km2: 40, diamati_km2: 30, tergenang_km2: g, mask_km2: mask, kering_tak_mask_km2: 0});
  const d = {kejadian: {"2020-01": [{wib: "2020-01-02T05:33+07:00", kec: {"K|A": kec(.17), "K|B": kec(0)}}, {wib: "2020-01-02T17:00+07:00", kec: {"K|A": kec(.3)}}],
    "2021-02": [{wib: "2021-02-10T05:00+07:00", kec: {"K|A": kec(.05), "K|B": kec(0)}}]}};
  const r = plain(E.ringkasGfm(d));
  assert.equal(r["K|A"].kali, 2); assert.deepEqual(r["K|A"].tanggal, ["2020-01-02", "2021-02-10"]); assert.equal(r["K|A"].luasMaks, .3); assert.equal(r["K|A"].tglMaks, "2020-01-02");
  assert.equal(r["K|B"].kali, 0); assert.equal(r["K|B"].lintasan, 2); assert.equal(r["K|A"].maskPct, 25);
  assert.deepEqual([0, 1, 2, 3, 9, null].map(E.kelasGfm), [0, 1, 2, 3, 3, 0]);
  assert.equal(E.warnaGfm(3), E.GFM_WARNA[3]); assert.notEqual(E.warnaGfm(1), E.warnaGfm(2));
  assert.deepEqual(plain(E.ringkasGfm(null)), {});
});

test("listrik padam: angka apa adanya, pill hipotesis selama metode hipotesis", () => {
  const k = {ringkas: {kec_dinilai: 11, hari_pasca: 21, pernah_gelap: {jiwa: 7087}, masih_gelap: {jiwa: 7087}, masih_redup: {jiwa: 175156}, pulih: {jiwa: 72853}}};
  const w = plain(E.wargaPadam(k, {hipotesis: true}));
  assert.equal(w.gelap, 7087); assert.equal(w.redup, 175156); assert.equal(w.hipotesis, true); assert.equal(w.kecDinilai, 11);
  assert.equal(E.wargaPadam(k, {hipotesis: false}).hipotesis, false); assert.equal(E.wargaPadam(k, undefined).hipotesis, true);
  assert.equal(E.wargaPadam(null, null).redup, null);
  assert.equal(E.ribu(175156), "±175 ribu"); assert.equal(E.ribu(7087), "±7 ribu"); assert.equal(E.ribu(500), "kurang dari 1 ribu"); assert.equal(E.ribu(null), "–");
  assert.ok(/^±\d/.test(E.ribu(12000)));
});

test("penurunan tanah: titik per kota dari maksimum kutipan, tanpa angka dilewati", () => {
  const s = {kota: {jakarta: {sumber: [{maks_cm_thn: 28}, {maks_cm_thn: 5}]}, cirebon: {sumber: []}, semarang: {sumber: [{maks_cm_thn: null}, {maks_cm_thn: 19}]}, antah: {sumber: [{maks_cm_thn: 3}]}}};
  const g = plain(E.subsidenTitik(s));
  assert.deepEqual(g.features.map(x => [x.properties.id, x.properties.maks]), [["jakarta", 28], ["semarang", 19]]);
  assert.equal(g.features[0].geometry.type, "Point");
  assert.equal(E.warnaSub(2), E.SUB_WARNA[0][1]); assert.equal(E.warnaSub(5), E.SUB_WARNA[1][1]); assert.equal(E.warnaSub(28), E.SUB_WARNA[3][1]);
});

test("pompa.json nyata: titik di DKI dengan kolom sesuai", () => {
  const p = JSON.parse(fs.readFileSync("public/banjir/data/genangan/pompa.json", "utf8"));
  assert.ok(p.pompa.length > 100); assert.equal(p.pompa[0].length, p.kolom.length); assert.ok(p.pompa.every(x => x[0] > 106 && x[1] < -5));
});
