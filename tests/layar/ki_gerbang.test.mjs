// KI-12: pembaca gerbang gagal-tertutup (public/inti/gerbang.js) + golden karhutla (scripts/sebaran/gerbang.py memakai mesin inti).
import {test} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const muatG = fetch => { const ctx = vm.createContext({window: {}, fetch}); vm.runInContext(readFileSync(`${AKAR}/public/inti/gerbang.js`, "utf8"), ctx); return ctx.window.Gerbang; };
const resp = (isi, ok = true) => async () => ({ok, json: async () => { if (isi === "RUSAK") throw new SyntaxError("Unexpected token"); return isi; }});
const PIL = "Hipotesis, belum lolos uji";
const entri = (ok, alasan = "alasan uji") => ({boleh_tampil: ok, alasan});

test("berkas hilang (404 / jaringan putus): peta kosong, semua entri berpil", async () => {
  for (const f of [resp(null, false), async () => { throw new TypeError("network"); }]) {
    const G = muatG(f), peta = await G.muat("udara");
    assert.deepEqual({...peta}, {});
    assert.equal(G.boleh(peta, "x"), false);
    assert.ok(G.pil(peta, "x").includes(PIL));
  }
});
test("JSON rusak atau bentuk salah: gagal-tertutup", async () => {
  for (const isi of ["RUSAK", [], "teks", {versi: 1}, {keluaran: "x"}]) {
    const G = muatG(resp(isi)), peta = await G.muat("udara");
    assert.equal(G.boleh(peta, "x"), false, JSON.stringify(isi));
    assert.ok(G.pil(peta, "x").includes(PIL));
  }
});
test("entri tak ada atau boleh_tampil bukan true persis: pil, dengan alasan di title", async () => {
  const G = muatG(resp({keluaran: {a: entri(false, "selisih -1 <= 0"), b: {boleh_tampil: "true"}, c: {boleh_tampil: 1}, d: entri(true)}})), peta = await G.muat("udara");
  assert.ok(G.pil(peta, "a").includes(PIL) && G.pil(peta, "a").includes('title="selisih -1 &lt;= 0"'));
  for (const k of ["b", "c", "tidak_ada"]) assert.ok(G.pil(peta, k).includes(PIL) && G.boleh(peta, k) === false, k);
  assert.ok(G.pil(null, "a").includes(PIL) && G.pil(undefined, "a").includes(PIL));
});
test("entri true: tanpa pil; alasan jahat di-escape", async () => {
  const G = muatG(resp({keluaran: {d: entri(true), e: entri(false, '"><script>x</script>')}})), peta = await G.muat("udara");
  assert.equal(G.boleh(peta, "d"), true);
  assert.equal(G.pil(peta, "d"), "");
  assert.ok(!G.pil(peta, "e").includes("<script>"));
});
test("muat meminta /data/gerbang/<bencana>.json", async () => {
  let url; const G = muatG(async u => { url = u; return {ok: false}; });
  await G.muat("udara");
  assert.equal(url, "/data/gerbang/udara.json");
});
test("udara.json nyata punya kontrak; entri lolos wajib selisih > 0 dan batas bawah > 0", () => {
  const j = JSON.parse(readFileSync(`${AKAR}/public/data/gerbang/udara.json`, "utf8"));
  assert.equal(Object.keys(j)[0], "dibuat");
  for (const [k, e] of Object.entries(j.keluaran)) {
    assert.ok("boleh_tampil" in e && "alasan" in e && "selang95" in e && "vonis_prospektif" in e, k);
    if (e.boleh_tampil) assert.ok(e.selisih > 0 && e.selang95 && e.selang95[0] > 0, `${k}: lolos tanpa selisih>0 dan batas bawah>0`);
  }
});
test("golden karhutla: gerbang_model.json = keluaran bangun() mesin inti, sama persis kecuali 'dibuat'", () => {
  const py = "import sys, json; sys.path.insert(0, 'scripts/sebaran'); import gerbang as g\n" +
    "b = lambda n: json.load(open('public/data/' + n))\n" +
    "o = g.bangun(b('sebaran_kasus.json'), {}, b('prospektif.json'), b('prospektif_historis.json'))\n" +
    "o.pop('dibuat'); print(json.dumps(o, sort_keys=True))";
  const baru = JSON.parse(execFileSync("python3", ["-c", py], {cwd: AKAR, encoding: "utf8"}));
  const lama = JSON.parse(readFileSync(`${AKAR}/public/data/gerbang_model.json`, "utf8")); delete lama.dibuat;
  assert.deepEqual(baru, JSON.parse(JSON.stringify(lama)), "gerbang_model.json tidak sama dengan keluaran mesin inti: jalankan python3 scripts/sebaran/gerbang.py dan periksa selisihnya");
  for (const k of ["model_sel", "mesin_fisika", "jejak_api", "lolos"]) assert.equal(typeof baru[k].boleh_tampil, "boolean", k);
});
