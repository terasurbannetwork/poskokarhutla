import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const c = {console, Math, JSON, Date, esc: x => String(x ?? ""), fmt: n => (n == null ? "-" : String(n).replace(".", ","))};
vm.createContext(c);
vm.runInContext(fs.readFileSync("public/gempa/beruntun.js", "utf8") + "\nthis.B = Beruntun;", c);
const B = c.B, D = JSON.parse(fs.readFileSync("public/gempa/data/beruntun.json", "utf8")), BL = JSON.parse(fs.readFileSync("public/gempa/data/beruntun_baseline.json", "utf8"));

test("label Deteksi Centurisk97, bukan prediksi, hipotesis belum teruji, hanya M 4,5+", () => {
  assert.equal(D.label, "Deteksi Centurisk97"); assert.equal(D.bukan_prediksi, true); assert.equal(D.teruji, false);
  assert.equal(D.ambang.status, "hipotesis"); assert.equal(D.baseline, "historis:USGS_M4.5"); assert.equal(D.hanya_m45_ke_atas, true);
  assert.match(D.keterbatasan, /kawanan gempa kecil vulkanik tidak terlihat/);
  assert.match(fs.readFileSync("public/gempa/beruntun.js", "utf8"), /kawanan gempa kecil vulkanik tidak terlihat/, "keterbatasan tampil di kartu");
});

test("tanpa klaim prediksi, janji kejadian, atau kata aman", () => {
  const s = fs.readFileSync("public/gempa/beruntun.js", "utf8") + JSON.stringify(D);
  assert.doesNotMatch(s, /akan terjadi|\baman\b|Pantau Bencana/i);
  assert.doesNotMatch(B.judul(D).replace(/<[^>]+>/g, ""), /prediksi|akan /i);
});

test("USGS saja, binomial negatif dari data, N >= 3, usulan radius berlabel, tanpa status laju_nol", () => {
  assert.match(D.sumber_hitungan, /USGS saja/); assert.equal(D.ambang.n_min_menyala, 3);
  assert.ok(D.overdispersi.alpha > 0 && D.overdispersi.n_pasang > 0 && D.overdispersi.n_menyala_total <= D.overdispersi.n_menyala_poisson_total);
  assert.equal(D.ringkas.dinilai + D.ringkas.tidak_dinilai, D.ringkas.sasaran);
  for (const s of D.sasaran) {
    assert.ok(Number.isInteger(s.n_menyala) && s.n_menyala >= 0);
    if (s.status === "tidak_dinilai") { assert.equal(s.p_koreksi, null); assert.equal(s.N, null); assert.ok(s.alasan); }
    else { assert.ok(s.p_koreksi >= 0 && s.p_koreksi <= 1); if (s.status === "perlu_dicek") assert.ok(s.N >= 3 && s.p_koreksi < D.ambang.p_koreksi); }
    if (s.laju_prior_saja) { assert.equal(s.n_hist, 0); assert.match(s.usulan_radius.label, /usulan/); } else assert.equal(s.usulan_radius, null);
  }
});

test("baseline: nilai-b bukan bukti kelengkapan, tanggal unduh, komposisi era", () => {
  assert.equal(BL.m_min, 4.5); assert.ok(BL.diunduh); assert.match(BL.kelengkapan.catatan, /BUKAN bukti kelengkapan/); assert.ok(Object.keys(BL.kelengkapan.bagian_m45_sampai_47_per_era).length >= 5);
  assert.equal(Object.keys(BL.sasaran).length, D.sasaran.length);
  assert.match(fs.readFileSync("public/gempa/beruntun.js", "utf8"), /bukan bukti kelengkapan/);
  for (const s of D.sasaran) assert.ok(s.magma && "level" in s.magma);
});

test("layar membaca overdispersi dari JSON dan menyebut syarat N minimal, USGS, kepala kolom dikoreksi", () => {
  const src = fs.readFileSync("public/gempa/beruntun.js", "utf8");
  assert.match(src, /ov\.alpha/); assert.match(src, /Peluang ekor \(dikoreksi\)/); assert.match(src, /n_min_menyala/); assert.match(src, /USGS/);
  assert.doesNotMatch(src, /Peluang ekor", 1\]/);
});

test("urutan: perlu dicek dulu; p maksimal dua desimal; waktu data WIB", () => {
  const u = B.urut({sasaran: [{nama: "b", status: "biasa", N: 1}, {nama: "a", status: "perlu_dicek", N: 0}, {nama: "c", status: "tidak_dinilai", N: 9}]});
  assert.equal(u.map(x => x.nama).join(), "a,b,c");
  assert.equal(B.p3(null), "–"); assert.match(B.p3(0.0004), /< 0,01/); assert.equal(B.p3(0.456), "0,46");
  assert.match(B.waktuData("2026-11-10T09:47Z"), /^10 Nov 2026 pukul 16\.47 WIB$/);
  assert.match(B.pilLevel({level: 3, level_nama: "Siaga"}), /Level 3 Siaga/); assert.equal(B.pilLevel(null), "–");
});
