// KM-C02: hitung.js (syarat, susunPanduan, nilaiDariProfil, panduan, idn) murni; RU §2.1 A9 A10, L5. Paritas dengan Python di paritas.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AKAR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baca = (p) => readFileSync(join(AKAR, p), "utf8");
// skrip klasik peramban dijalankan di vm (package.json "type":"module"); konst.js lebih dulu supaya KM_KONST ada
function muatHitung() {
  const kotak = { module: { exports: {} } };
  vm.createContext(kotak);
  vm.runInContext(baca("public/kemitraan/konst.js"), kotak);
  kotak.module = { exports: {} };
  vm.runInContext(baca("public/kemitraan/hitung.js"), kotak);
  return kotak.module.exports;
}
const H = muatHitung();
const acuan = JSON.parse(baca("tests/kemitraan/fixtures/acuan.json"));
const bank = JSON.parse(baca("scripts/kemitraan/pertanyaan.json"));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const profil = (kab) => JSON.parse(baca(`public/data/kemitraan/daerah/${kab}.json`));

test("hitung syarat: semua kasus acuan.json (A9) benar", () => {
  for (const c of acuan.syarat) assert.equal(H.syarat(c.masuk.ekspr, c.masuk.profil), c.keluar, `syarat ${c.id}: ${c.masuk.ekspr}`);
});

test("hitung syarat: tepi (kosong benar, 0 bukan false, true bukan angka, kunci null salah, dan berantai)", () => {
  assert.equal(H.syarat("", {}), true);
  assert.equal(H.syarat(null, {}), true);
  assert.equal(H.syarat("tren_naik == true and H >= 0.5", { tren_naik: true, H: 0.5 }), true);
  assert.equal(H.syarat("rpb == false", { rpb: 0 }), false, "0 bukan false");
  assert.equal(H.syarat("F >= 1", { F: true }), false, "true bukan angka");
  assert.equal(H.syarat("rpb == false", { rpb: null }), false);
  assert.equal(H.syarat("rpb == false", {}), false, "kunci hilang = salah");
  assert.equal(H.syarat("H > -0.5", { H: 0 }), true, "angka negatif");
});

test("hitung syarat: ekspresi salah bentuk ditolak dan tidak pernah dijalankan sebagai kode (parser tanpa eval)", () => {
  for (const jelek of ["rpb = false", "F >= abc", "__import__('os')", "rpb == false or F > 1", "rpb >= true", "F > 1 and", "H > 0.5; x", "F>=0.6 && H>1", "globalThis.x = 1"]) {
    assert.throws(() => H.syarat(jelek, { rpb: false, F: 1, H: 1 }), /syarat salah bentuk|operator/, `harus ditolak: ${jelek}`);
  }
  globalThis.__kena = false;
  assert.throws(() => H.syarat("(globalThis.__kena = true) == 1", {}));
  assert.equal(globalThis.__kena, false, "ekspresi dijalankan sebagai kode");
  const src = baca("public/kemitraan/hitung.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/\beval\s*\(|new\s+Function|\bFunction\s*\(|\bsetTimeout\s*\(\s*["'`]/.test(src), "hitung.js memakai eval atau Function");
});

test("hitung susunPanduan: slot kosong membuang templat, tanpa kurung kurawal (A10), sub hanya di arah akar", () => {
  for (const c of acuan.susun_panduan) {
    const h = H.susunPanduan(c.masuk.templat, c.masuk.profil);
    assert.deepEqual(JSON.parse(JSON.stringify(h)), c.keluar, `susun_panduan ${c.id}`);
    assert.ok(h.every((x) => !/[{}]/.test(x.teks)));
  }
  const ak = H.susunPanduan([{ id: "a", teks: "Mengapa {wilayah}?", arah: "akar", isian: ["wilayah"] }, { id: "b", teks: "Apa {wilayah}?", arah: "upaya", isian: ["wilayah"] }], { wilayah: "W" }, ["1", "2", "3", "4"]);
  assert.deepEqual(JSON.parse(JSON.stringify(ak.map((x) => x.sub))), [["1", "2", "3"], []], "Mengapa maksimal 3 dan hanya di akar");
});

test("hitung susunPanduan: batas per narasumber membuang prioritas rendah dulu, urut arah lalu id", () => {
  const t = Array.from({ length: 6 }, (_, i) => ({ id: `x${String(i).padStart(2, "0")}`, teks: "Apa {wilayah}?", arah: "kapasitas", isian: ["wilayah"], prioritas: i < 3 ? 3 : 1 }));
  const h = H.susunPanduan(t, { wilayah: "W" }, null, 4);
  assert.deepEqual(h.map((x) => x.id), ["x00", "x03", "x04", "x05"]);
  const campur = H.susunPanduan([{ id: "b", teks: "B {wilayah}?", arah: "harapan", isian: ["wilayah"] }, { id: "a", teks: "A {wilayah}?", arah: "konfirmasi", isian: ["wilayah"] }], { wilayah: "W" });
  assert.deepEqual(campur.map((x) => x.id), ["a", "b"]);
});

test("hitung idn: setengah-genap seperti Python, pemisah titik dan koma", () => {
  assert.equal(H.idn(1234.5, 0), "1.234", "tie genap ke bawah");
  assert.equal(H.idn(1235.5, 0), "1.236");
  assert.equal(H.idn(2.5, 0), "2");
  assert.equal(H.idn(0.25, 1), "0,2");
  assert.equal(H.idn(0.15, 1), "0,1", "0,15 biner sedikit di bawah: bukan tie");
  assert.equal(H.idn(1779810, 0), "1.779.810");
  assert.equal(H.idn(82.8, 1), "82,8");
  assert.equal(H.idn(0, 1), "0,0");
});

test("hitung panduan L5: atas 12 profil nyata, tiap arah berurut, tanpa slot kosong atau nilai mentah", () => {
  const kabs = ["1101", "3174", "3374", "6201", "7371", "1471", "5171", "9171", "3203", "1271", "6471", "8171"];
  let butir = 0;
  for (const k of kabs) {
    const p = profil(k);
    for (const m of [null, ...(p.masalah || []).slice(0, 2)]) {
      const r = H.panduan(bank, p, m, null, { prov_nama: "Provinsi Uji" });
      for (const [ns, g] of Object.entries(r.narasumber)) {
        const arah = Object.keys(g), tot = arah.flatMap((a) => g[a]);
        assert.deepEqual(arah, ["konfirmasi", "akar", "kapasitas", "upaya", "kebutuhan", "harapan"].filter((a) => g[a]), `${k}/${ns}: urutan arah`);
        assert.ok(tot.length > 0 && tot.length <= 40, `${k}/${ns}: ${tot.length} pertanyaan di luar 1..40`);
        for (const x of tot) assert.ok(!/[{}]|undefined|NaN|null|None/.test(x.teks), `${k}/${ns}/${x.id}: ${x.teks}`);
        butir += tot.length;
      }
    }
  }
  assert.ok(butir > 1000, `terlalu sedikit butir (${butir}): panduan kosong?`);
});

test("hitung panduan: narasumber tak dikenal ditolak; tanpa masalah riset kosong", () => {
  const p = profil("3374");
  assert.throws(() => H.panduan(bank, p, null, ["gaib"]), /narasumber tak dikenal/);
  assert.deepEqual(JSON.parse(JSON.stringify(H.panduan(bank, p, null, ["bpbd"]).riset)), []);
  assert.equal(H.syarat("constructor == 1", {}), false, "kunci prototipe bukan nilai profil");
  assert.ok(H.panduan(bank, p, p.masalah[0], ["bpbd"]).riset.length > 0);
});

test("hitung panduanHtml: nama wilayah berbahaya lolos esc, tidak jadi tag", () => {
  const p = profil("3374"); p.nama = '<img src=x onerror=alert(1)> "Kab"';
  const h = H.panduanHtml(H.panduan(bank, p, null, ["bpbd"], { prov_nama: "<b>P</b>" }), esc);
  assert.ok(h.includes("&lt;img src=x onerror=alert(1)&gt;"), "nama tidak di-escape atau tidak muncul");
  assert.ok(!/<img|<b>P/.test(h), "tag dari data lolos ke HTML");
  assert.match(h, /<ol class="km-tanya">/);
});
