import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/sapa_banjir.js";

test("sapa_banjir.js sintaks sah", () => {
  const r = spawnSync("node", ["--check", f], {encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr);
});

test("selisih kemarin disembunyikan bila seri kurang dari 2 hari (bukan ditulis 0)", () => {
  const s = readFileSync(f, "utf8");
  assert.match(s, /seri\?\.hari\?\.length >= 2 \? seri\.nas\?\.\[ky\] : null/);
  assert.match(s, /d == null \? ""/);
});
