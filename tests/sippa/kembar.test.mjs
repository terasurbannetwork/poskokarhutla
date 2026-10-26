/* SP-026: kembar JS (public/pipa/hitung.js) dan Python (scripts/data/sippa/*.py lewat kembar_cli.py) terhadap
   tests/sippa/fixtures/acuan.json (RU §1.1 L2, §2.1). Tiap bahasa dalam 1% dari nilai harapan, JS dalam 0,1% dari Python;
   string, kode gerbang, dan vonis sama persis. Kasus baru berlabel `kembar: true` ikut otomatis. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import * as H from "../../public/pipa/hitung.js";

const AKAR = new URL("../../", import.meta.url).pathname;
const SEMUA = JSON.parse(readFileSync(new URL("./fixtures/acuan.json", import.meta.url), "utf8"));
const KASUS = SEMUA.filter(k => k.kembar === true);
const TOL_BAHASA = 0.01, TOL_JS_PY = 0.001;

const kode = g => g.map(x => x.kode);
const JS = {
  hidraulika: m => H.hidraulika(m),
  fSuhu: m => H.fSuhu(m.suhu_c),
  neracaAir: m => H.neracaAir(m),
  joukowsky: m => H.joukowsky(m.dv, m.a),
  zona: m => H.zona(m.air, m.jalan),
  saranSarana: m => H.saranSarana(m.k, m.versi, m.api_aktif ?? false, m.cek),
  matriksRespons: m => H.matriksRespons(m.frp, m.luas_ha, m.zona, m.koef, m.jam_tiba),
  tingkatPemicu: m => H.tingkatPemicu(m),
  kuantil: m => H.kuantil(m.xs, m.p),
  bandingRerata: m => H.bandingRerata(m.a, m.b),
  bandingProporsi: m => H.bandingProporsi(m.xa, m.na, m.xb, m.nb),
  vonisPilot: m => H.vonisPilot(m),
  keuangan: m => ({af: H.af(m.r, m.H), npv: H.npv(m), bcr: H.bcr(m), impas: H.impas(m), crf: H.crf(m.r, m.H)}),
};

/** Selisih (kosong = cocok): bilangan relatif `tol`, selain bilangan sama persis; `gerbang` = kode urut, `gerbang_tanpa` = kode terlarang. */
function banding(harap, hasil, tol, jalur) {
  if (Array.isArray(harap)) {
    if (!Array.isArray(hasil) || harap.length !== hasil.length) return [`${jalur}: harap ${JSON.stringify(harap)}, hasil ${JSON.stringify(hasil)}`];
    return harap.flatMap((h, i) => banding(h, hasil[i], tol, `${jalur}[${i}]`));
  }
  if (harap && typeof harap === "object") {
    if (!hasil || typeof hasil !== "object") return [`${jalur}: harap objek, hasil ${JSON.stringify(hasil)}`];
    return Object.entries(harap).flatMap(([k, v]) => {
      if (k === "gerbang") { const ada = kode(hasil.gerbang ?? []); return JSON.stringify(ada) === JSON.stringify(v) ? [] : [`${jalur}.gerbang: harap ${v}, hasil ${ada}`]; }
      if (k === "gerbang_tanpa") { const ada = kode(hasil.gerbang ?? []); return v.filter(c => ada.includes(c)).map(c => `${jalur}.gerbang_tanpa: ${c} tidak boleh ada, hasil ${ada}`); }
      return k in hasil ? banding(v, hasil[k], tol, `${jalur}.${k}`) : [`${jalur}.${k}: tidak ada di hasil`];
    });
  }
  if (typeof harap === "number") {
    if (typeof hasil !== "number") return [`${jalur}: harap ${harap}, hasil ${JSON.stringify(hasil)}`];
    const batas = Math.max(tol * Math.abs(harap), 1e-9);
    return Math.abs(hasil - harap) <= batas ? [] : [`${jalur}: harap ${harap}, hasil ${hasil} (selisih ${Math.abs(hasil - harap)} > ${batas})`];
  }
  return harap === hasil ? [] : [`${jalur}: harap ${JSON.stringify(harap)}, hasil ${JSON.stringify(hasil)}`];
}

function python(kasus) {
  const r = spawnSync("python3", ["-I", "scripts/data/sippa/kembar_cli.py"], {cwd: AKAR, input: JSON.stringify(kasus), encoding: "utf8", maxBuffer: 1 << 26});
  assert.equal(r.status, 0, `kembar_cli.py keluar ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

const PY = python(KASUS);   // satu proses untuk semua kasus; pemanggilan per kasus hanya memperlambat

test("kembar: acuan.json memberi label kembar boolean pada tiap kasus dan memuat kasus berlabel true", () => {
  const tanpa = SEMUA.filter(k => typeof k.kembar !== "boolean").map(k => k.id);
  assert.deepEqual(tanpa, [], `kasus acuan tanpa label kembar true/false: ${tanpa}`);
  assert.ok(KASUS.length > 0, "tidak ada kasus kembar: true di acuan.json");
  assert.equal(PY.length, KASUS.length, `Python mengembalikan ${PY.length} hasil untuk ${KASUS.length} kasus`);
});

test("kembar: tiap fungsi berlabel kembar punya pemanggil JS dan Python", () => {
  const hilang = [...new Set(KASUS.map(k => k.fungsi))].filter(f => !JS[f]);
  assert.deepEqual(hilang, [], `fungsi acuan tanpa pemanggil JS di kembar.test.mjs: ${hilang}`);
});

KASUS.forEach((k, i) => {
  test(`kembar ${k.id} (${k.fungsi}): JS dan Python dalam 1% dari harapan, JS dalam 0,1% dari Python`, () => {
    const tol = Math.min(k.toleransi ?? TOL_BAHASA, TOL_BAHASA);
    const py = PY[i];
    assert.equal(py.id, k.id, `urutan hasil Python bergeser: ${py.id} bukan ${k.id}`);
    assert.ok("hasil" in py, `${k.id}: Python galat ${py.galat}`);
    const js = JS[k.fungsi](k.masukan);
    const gal = [...banding(k.harap, js, tol, `${k.id} JS`), ...banding(k.harap, py.hasil, tol, `${k.id} Python`)];
    assert.deepEqual(gal, [], gal.join("; "));
    // JS terhadap Python: bentuk harapan sebagai kunci (nilai Python jadi harapan), toleransi 0,1%
    const rujuk = typeof k.harap === "object" && k.harap !== null && !Array.isArray(k.harap)
      ? Object.fromEntries(Object.keys(k.harap).map(n => [n, py.hasil[n]]).filter(([n]) => n !== "gerbang" && n !== "gerbang_tanpa"))
      : py.hasil;
    const sel = banding(rujuk, js, TOL_JS_PY, `${k.id} JS-vs-Python`);
    assert.deepEqual(sel, [], sel.join("; "));
    if (k.harap?.gerbang || k.harap?.gerbang_tanpa || k.fungsi === "hidraulika")
      assert.deepEqual(kode(js.gerbang), kode(py.hasil.gerbang), `${k.id}: kode gerbang JS dan Python berbeda`);
    if (k.fungsi === "vonisPilot") assert.deepEqual([js.vonis, js.gagal], [py.hasil.vonis, py.hasil.gagal], `${k.id}: vonis JS dan Python berbeda`);
  });
});

test("kembar: pembanding menolak selisih 2% dan kode gerbang yang beda (penjaga tidak lepas)", () => {
  assert.ok(banding({a: 1}, {a: 1.02}, TOL_BAHASA, "x").length > 0, "2% harus ditolak pada toleransi 1%");
  assert.equal(banding({a: 1}, {a: 1.005}, TOL_BAHASA, "x").length, 0);
  assert.ok(banding({a: 1}, {a: 1.002}, TOL_JS_PY, "x").length > 0, "0,2% harus ditolak pada toleransi 0,1%");
  assert.ok(banding({vonis: "NO-GO"}, {vonis: "HOLD"}, TOL_BAHASA, "x").length > 0);
  assert.ok(banding({gerbang: ["H-TEKANAN"]}, {gerbang: []}, TOL_BAHASA, "x").length > 0);
});
