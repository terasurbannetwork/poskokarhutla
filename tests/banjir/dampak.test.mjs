import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {existsSync, readFileSync} from "node:fs";

test("dampak.py uji lulus", () => {
  const r = spawnSync("python3", ["scripts/banjir/dampak.py", "uji"], {encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr);
});

test("dampak.json: invarian jumlah dan cakupan", {skip: !existsSync("public/banjir/data/dampak.json")}, () => {
  const d = JSON.parse(readFileSync("public/banjir/data/dampak.json", "utf8"));
  for (const [nama, b] of Object.entries({hariIni: d.terpapar, ...(d.prakiraan || {})})) {
    if (!b) continue;
    const jml = Object.values(b.prov).reduce((s, p) => s + p.kec, 0);
    assert.equal(jml, b.kec, `${nama}: jumlah kec per provinsi ${jml} != ${b.kec}`);
    // sekolah/faskes/jalan di luar cakupan harus DIBUANG, bukan 0
    for (const [kp, p] of Object.entries(b.prov)) {
      if (!d.cakupan.prov_sekolah.includes(kp)) assert.equal(p.sekolah, undefined, `${nama}: prov ${kp} di luar cakupan sekolah tapi sekolah=${p.sekolah}`);
      if (!d.cakupan.prov_faskes.includes(kp)) assert.equal(p.faskes, undefined, `${nama}: prov ${kp} di luar cakupan faskes tapi faskes=${p.faskes}`);
      if (!d.cakupan.prov_jalan.includes(kp)) assert.equal(p.jalan_km, undefined, `${nama}: prov ${kp} di luar cakupan jalan tapi jalan_km=${p.jalan_km}`);
    }
  }
});
