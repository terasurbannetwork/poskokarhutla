/* SS-05 Rapor Sumber: menjalankan rapor_sumber.py sungguhan (fixture tulisan tangan untuk tepi) dan membaca rapor_sumber.json nyata. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {py, uji_mandiri, AKAR} from "./_silang.mjs";

const D = "scripts/bnpb/silang";
const R = JSON.parse(readFileSync(AKAR + "public/data/bnpb/rapor_sumber.json", "utf8"));

test("self-check Python rapor_sumber.py uji hijau", () => {
  const r = uji_mandiri(D + "/rapor_sumber.py");
  assert.equal(r.status, 0, r.err);
});

// 40 hari berturut-turut, kejadian tiap hari di provinsi 11; n hari dan jumlah kejadian diatur per skenario
const skenario = py(D, `
import rapor_sumber as r, datetime as dt
h40 = r.rentang("2026-01-02", "2026-02-10")
base = [(t, (dt.date.fromisoformat(t) - dt.timedelta(days=1)).isoformat(), "hujan", {"11"}) for t in h40]
def nas(F, E, sampai="2026-12-31"):
    return [x for x in r.hitung(F, E, {"DIBI": sampai}, ["11", "12"]) if x["daerah"]["tingkat"] == "nas" and x["kejadian"] == "DIBI"][0]
E40 = {("DIBI", "hujan"): {("11", t) for t in h40}}
F40, _ = r.susun({"S": base}); F29, _ = r.susun({"S": base[:29]})
F30, _ = r.susun({"S": base[:30]})
E29 = {("DIBI", "hujan"): {("11", t) for t in h40[:29]}}   # a+c = 29
E30 = {("DIBI", "hujan"): {("11", t) for t in h40[:30]}}   # a+c = 30
# beku: sama/sesudah target dibuang, tenggang negatif tidak pernah muncul
Fb, buang = r.susun({"S": [("2026-03-05", "2026-03-05", "hujan", {"11"}), ("2026-03-05", "2026-03-06", "hujan", {"11"}), ("2026-03-05", "2026-03-04", "hujan", set())]})
print(json.dumps({"s40": nas(F40, E40), "s29": nas(F29, E40), "k29": nas(F40, E29), "k30": nas(F40, E30),
  "h30": nas(F30, {("DIBI", "hujan"): {("11", t) for t in h40[:30]}}),
  "buang": buang, "kunci_beku": [list(k) for k in Fb], "tgl_beku": {str(k): list(v) for k, v in Fb[("S","hujan",1)].items()},
  "bagi_nol": r.skor(0, 0, 0, 5), "skor": r.skor(10, 5, 5, 80)}, default=sorted))
`);

test("gerbang n: hari < 30 belum_cukup tanpa angka; a+c < 30 n_kurang tanpa persen; selebihnya angka", () => {
  const {s29, k29, k30, s40, h30} = skenario;
  assert.equal(s29.status, "belum_cukup");
  for (const k of ["a", "b", "c", "d", "n_kejadian", "pod", "far", "csi", "ets", "pod_ci", "far_ci"]) assert.equal(s29[k], null, `belum_cukup tidak boleh membawa ${k}`);
  assert.equal(k29.status, "n_kurang");
  assert.equal(k29.n_kejadian, 29);
  assert.equal(k29.a + k29.c, 29);
  for (const k of ["pod", "far", "csi", "ets", "pod_ci", "far_ci"]) assert.equal(k29[k], null, `n < 30 tanpa persen: ${k}`);
  assert.equal(k30.status, "angka");   // batas tepat 30 lolos
  assert.equal(h30.status, "angka");   // 30 hari dinilai lolos
  assert.equal(s40.status, "angka");
  assert.equal(s40.pod, 1);
});

test("skor: bagi nol = null, contoh tulisan tangan POD/FAR/CSI/ETS", () => {
  assert.deepEqual(skenario.bagi_nol, {pod: null, far: null, csi: null, ets: null});
  assert.deepEqual(skenario.skor, {pod: 0.667, far: 0.333, csi: 0.5, ets: 0.437});
});

test("prakiraan beku di hari target atau sesudahnya dibuang", () => {
  assert.equal(skenario.buang, 2);
  assert.deepEqual(skenario.kunci_beku, [["S", "hujan", 1]]);
  assert.deepEqual(Object.keys(skenario.tgl_beku), ["2026-03-05"]);
  assert.equal(skenario.tgl_beku["2026-03-05"][0], "2026-03-04");
});

test("arsip append-only: hari sama tidak menimpa, baris lama utuh", () => {
  const o = py(D, `
import tempfile, os
from dasar import tambah_arsip
with tempfile.TemporaryDirectory() as t:
    j = os.path.join(t, "x", "2026-03.jsonl")
    a = tambah_arsip(j, "2026-03-30", {"x": 1}); b = tambah_arsip(j, "2026-03-30", {"x": 2}); c = tambah_arsip(j, "2026-03-31", {"x": 3})
    print(json.dumps({"a": a, "b": b, "c": c, "baris": open(j).read().splitlines()}))
`);
  assert.deepEqual([o.a, o.b, o.c], [true, false, true]);
  assert.equal(o.baris.length, 2);
  assert.equal(JSON.parse(o.baris[0]).x, 1, "baris lama tidak boleh berubah");
});

test("rapor_sumber.json nyata: tiap sel punya a b c d n; status sesuai gerbang; tanpa persen di bawah n 30", () => {
  assert.ok(R.sel.length > 0);
  assert.equal(R.n_min, 30);
  assert.equal(R.hari_min, 30);
  for (const x of R.sel) {
    for (const k of ["a", "b", "c", "d", "n_kejadian", "status", "hari_dinilai"]) assert.ok(k in x, `sel tanpa ${k}`);
    const id = `${x.sumber}/${x.bahaya}/${x.kejadian}/${x.tenggang}/${x.daerah.kode}`;
    if (x.hari_dinilai < 30) { assert.equal(x.status, "belum_cukup", id); assert.equal(x.a, null, id); }
    else if (x.a + x.c < 30) assert.equal(x.status, "n_kurang", id);
    else assert.equal(x.status, "angka", id);
    if (x.status !== "angka") for (const k of ["pod", "far", "csi", "ets", "pod_ci", "far_ci"]) assert.equal(x[k], null, `${id} ${k}: persen tanpa n >= 30`);
    if (x.status !== "belum_cukup") assert.equal(x.n_kejadian, x.a + x.c, id);
  }
});

test("keluaran nyata tanpa kata terlarang: aman, Pantau Bencana", () => {
  const t = JSON.stringify(R).toLowerCase().replaceAll("peringatan dini", "");
  assert.doesNotMatch(t, /\baman\b/);
  assert.doesNotMatch(t, /pantau bencana/);
});
