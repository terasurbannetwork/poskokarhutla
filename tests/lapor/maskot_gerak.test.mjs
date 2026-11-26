import test from "node:test";
import assert from "node:assert/strict";
import {arahPandang, pilihAksi, pilihReaksi, MIMIK, DASAR, gaya, gayaFoto, maskot, maskotSvg, fotoUntuk, urutUntuk, URUT, AKSI_URUT, TEGANG} from "../../public/lapor/maskot.js";
import {existsSync, statSync} from "node:fs";

test("arahPandang tidak melebihi maks dan nol di pusat", () => {
  assert.deepEqual(arahPandang(0, 0), {x: 0, y: 0});
  for (const [dx, dy] of [[1e5, 0], [-300, 400], [3, -2]]) {
    const a = arahPandang(dx, dy); assert.ok(Math.hypot(a.x, a.y) <= 4 + 1e-9, `${dx},${dy} -> ${a.x},${a.y} melewati 4`);
  }
});
test("tiap pose punya mimik dasar yang ada di tabel; sedih tetap prihatin", () => {
  for (const [p, m] of Object.entries(DASAR)) assert.ok(MIMIK[m], `pose ${p} menunjuk mimik tak dikenal ${m}`);
  assert.equal(DASAR.sedih, "prihatin");
});
test("pose sedih tidak pernah memilih aksi riang; reduced-motion tanpa aksi", () => {
  for (let k = 0; k < 200; k++) {
    const a = pilihAksi("sedih", k / 200, {gelembung: true});
    assert.ok(!["rentang", "lambai", "wink"].includes(a), `sedih memilih ${a}`);
    assert.ok(!["lompat", "lambai", "wink"].includes(pilihReaksi("sedih", k / 200)), "reaksi sedih tak boleh tertawa");
  }
  assert.equal(pilihAksi("sapa", .5, {kurang: true}), null);
  assert.notEqual(pilihAksi("sapa", .99, {gelembung: false}), "gelembung");
});
test("CSS tanpa literal hex; tiap mimik punya aturan; SVG kompak dan punya rig", () => {
  const c = gaya();
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(c), "CSS baru memuat hex");
  for (const k of Object.keys(MIMIK)) assert.ok(c.includes(`data-mimik="${k}"`), `mimik ${k} tanpa aturan`);
  for (const p of ["sapa", "semangat", "senang", "sedih"]) {
    const s = maskotSvg(p);
    assert.ok(s.length < 12000, `${p}: ${s.length} byte`);
    for (const g of ["mk-kp", "mk-ir", "mk-l1", "mk-lk", "mk-rk", "mk-fitur", "mk-hm"]) assert.ok(s.includes(g), `${p} tanpa ${g}`);
  }
});
test("maskot render 3D: tiap bingkai urutan ada dan kecil; duka tanpa lambai; wajah tegang hanya untuk aksi serius", () => {
  const semua = new Set([...Object.values(URUT), ...Object.values(AKSI_URUT)].flat().map(([k]) => k));
  for (const k of semua) { const f = new URL(`../../public/lapor/sigap/${k}.webp`, import.meta.url); assert.ok(existsSync(f), `berkas ${k}.webp hilang`); assert.ok(statSync(f).size < 120e3, `${k}.webp terlalu besar`); }
  for (const [p, u] of Object.entries(URUT)) for (const [k, ms] of u) { assert.ok(!TEGANG.includes(k), `pose ${p} memakai wajah tegang ${k}`); assert.ok(ms >= 100 || u.length === 1, `${p}:${k} terlalu cepat`); }
  for (const [a, u] of Object.entries(AKSI_URUT)) if (!["darurat", "penting", "peringatan"].includes(a)) for (const [k] of u) assert.ok(!TEGANG.includes(k), `aksi ${a} memakai wajah tegang ${k}`);
  assert.deepEqual(URUT.sedih.map(([k]) => k), ["sedih"]);
  for (const a of ["darurat", "lapor", "status", "pasang", "peringatan", "hilang", "info", "edukasi", "bahasa", "laporan", "penting"]) assert.ok(AKSI_URUT[a], `aksi ${a} tanpa urutan`);
  assert.equal(fotoUntuk("sapa", "darurat"), "ht"); assert.equal(fotoUntuk("sedih"), "sedih"); assert.equal(urutUntuk("tak-dikenal"), URUT.sapa);
  const s = maskot("sapa", "Sigap"); assert.match(s, /^<svg class="mk sg mk-foto"/); assert.match(s, /role="img" aria-label="Sigap"/); assert.equal((s.match(/class="mk-ft"/g) || []).length, 2);
  assert.match(maskot("semangat", "", "darurat"), /data-aksi="darurat"/); assert.doesNotMatch(maskot("semangat", "", "ngawur"), /data-aksi/);
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(gayaFoto()), "CSS foto memuat hex");
});
