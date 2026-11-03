import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

// Swauji model campuran (PRAREG-CAMPUR rev.5 §7): tanpa jaringan, tanpa label nyata, data mainan/sintetis.
test("model_kab_campur.py uji lulus", {timeout: 300000}, () => {
  const r = spawnSync("python3", ["scripts/banjir/model_kab_campur.py", "uji"], {encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ok model_kab_campur/);
});

test("model_kab_campur_nilai.py uji lulus", () => {
  const r = spawnSync("python3", ["scripts/banjir/model_kab_campur_nilai.py", "uji"], {encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ok model_kab_campur_nilai/);
});

test("model_kab_campur.py latih nyata ditolak rapi saat pemblokir 6a-A belum beres (bukan crash)", () => {
  const r = spawnSync("python3", ["scripts/banjir/model_kab_campur.py", "latih"], {encoding: "utf8"});
  assert.notEqual(r.status, 0);
  assert.doesNotMatch(r.stderr, /Traceback/, r.stderr);
  assert.match(r.stderr, /ditolak/);
});
