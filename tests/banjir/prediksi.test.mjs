// Prakiraan 72 jam (status.py -> prakiraan72.json) + catatan prospektif: swa-uji Python dijalankan sungguhan,
// lalu invarian pada keluaran nyata bila berkasnya ada (berkas data tidak di-commit semua; tanpa berkas = dilewati).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const D = "public/banjir/data/";
const baca = (f) => JSON.parse(readFileSync(D + f, "utf8"));

for (const s of ["status", "ansambel_hujan", "prospektif", "uji_balik", "seri_status", "kejadian_aktif"]) {
  test(`swa-uji ${s}.py lulus`, () => {
    const out = execFileSync("python3", [`scripts/banjir/${s}.py`, "uji"], { encoding: "utf8" });
    assert.match(out, /ok/, `${s}.py uji tidak mencetak ok: ${out}`);
  });
}

test("prakiraan72.json: peluang 0..100, W >= S >= A, horizon tak turun, level sejajar status.json", { skip: !existsSync(D + "prakiraan72.json") }, () => {
  const P = baca("prakiraan72.json"), st = baca("status.json");
  assert.equal(P.hari.length, 4);
  assert.deepEqual(P.hari, st.hari, "hari prakiraan72 beda dengan status.json: dibuat oleh jalan status.py yang sama");
  for (const [k, v] of Object.entries(P.kec)) {
    if (!st.kec[k]) assert.ok(["pb", "pl", "hb", "hl"].some((q) => (v[q] || []).some((h) => h.slice(1).some((x) => x >= 10))), `${k}: kecamatan tanpa status harus punya peluang Siaga/Awas >= 10% (hari atau jendela)`);
    if (st.kec[k]) assert.deepEqual([v.b, v.l], [st.kec[k].b, st.kec[k].l], `${k}: level deterministik beda dari status.json`);
    for (const q of ["pb", "pl", "hb", "hl"]) {
      if (!v[q]) continue;
      v[q].forEach((h, i) => {
        assert.ok(h.every((x) => Number.isInteger(x) && x >= 0 && x <= 100), `${k} ${q}[${i}] di luar 0..100: ${h}`);
        assert.ok(h[0] >= h[1] && h[1] >= h[2], `${k} ${q}[${i}] ${h}: peluang tingkat lebih tinggi melampaui tingkat lebih rendah`);
      });
    }
    for (const [h, d] of [["hb", "pb"], ["hl", "pl"]]) {
      if (!v[h]) continue;
      assert.deepEqual(v[h][0], v[d][0], `${k} ${h}: 24 jam harus sama dengan hari ke-0`);
      for (let i = 1; i < 3; i++) v[h][i].forEach((x, lv) => assert.ok(x >= v[h][i - 1][lv], `${k} ${h}: jendela lebih panjang tak boleh punya peluang lebih kecil (${v[h][i - 1]} -> ${v[h][i]})`));
    }
  }
});

test("prakiraan72.json: rob terpisah, tidak ada kunci rob di blok banjir", { skip: !existsSync(D + "prakiraan72.json") }, () => {
  const P = baca("prakiraan72.json");
  for (const v of Object.values(P.kec)) assert.ok(!("rob" in v));
  for (const [k, r] of Object.entries(P.rob.kec)) {
    assert.equal(r.lv.length, 4, k);
    assert.equal(r.h.length, 4, k);
    assert.ok(r.p95 != null, `${k}: rob tanpa ambang tidak boleh tampil`);
  }
});

test("prospektif.json: tanggal terbit urut, kab berkunci prov|kab, level 0..3", { skip: !existsSync(D + "prospektif.json") }, () => {
  const L = baca("prospektif.json"), t = Object.keys(L.terbit);
  assert.deepEqual(t, [...t].sort(), "tanggal terbit tidak urut");
  assert.ok(L.n_kab > 100, `n_kab ${L.n_kab} terlalu kecil`);
  for (const e of Object.values(L.terbit)) for (const [k, v] of Object.entries(e.kab)) {
    assert.match(k, /^\d+\|/);
    assert.equal(v.length, e.hari.length);
    for (const [lb, ll] of v) assert.ok([lb, ll].every((x) => x >= 0 && x <= 3), `${k}: level ${lb},${ll}`);
  }
});

test("layar: peta.js dan insight.js memuat prakiraan72 dan uji balik", () => {
  const peta = readFileSync("public/banjir/peta.js", "utf8"), ins = readFileSync("public/banjir/insight.js", "utf8");
  assert.match(peta, /data\/prakiraan72\.json/);
  assert.match(ins, /data\/validasi\.json/);
  assert.match(ins, /exUjibalik/);
  assert.match(ins, /exPeluang/);
  // kejujuran peluang: layar wajib menyebut batasnya, di popup (peta.js) dan kartu Peluang (insight.js)
  for (const [nama, src] of [["peta.js", peta], ["insight.js", ins]]) {
    assert.match(src, /belum diuji balik/, `${nama}: peluang harus ditulis belum diuji balik`);
    assert.match(src, /kalibrasinya belum diketahui/, `${nama}: kalibrasi belum diketahui harus ditulis`);
    assert.match(src, /jalur hujan saja/, `${nama}: peluang jalur hujan saja harus ditulis`);
    assert.ok(!/\?\? 0\)/.test(src.match(/const Pra72[\s\S]*?\n};/)?.[0] || ""), `${nama}: peluang tak tercatat harus "<10%", bukan 0%`);
  }
  assert.ok(!/24\/48\/72 jam|\d+ jam <b>/.test(peta + ins), "label jam menyesatkan: jendela adalah hari status");
  assert.match(ins, /kejadian kecil sering tidak tercatat/i);
  assert.match(ins, /sungai dan ansambel tidak/);
  assert.match(peta, /sampelnya kecil dan ambangnya dihitung dari data yang sama/i);
  execFileSync("node", ["--check", "public/banjir/peta.js"]);
  execFileSync("node", ["--check", "public/banjir/insight.js"]);
});
