import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {existsSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const py = (...a) => spawnSync("python3", a, {encoding: "utf8"});

test("laporan_banjir.py uji lulus", () => {
  const r = py("scripts/banjir/laporan_banjir.py", "uji");
  assert.equal(r.status, 0, r.stderr);
});

test("laporan.json nyata sah menurut laporan.py periksa; salah ditolak", {skip: !existsSync("public/banjir/data/laporan.json")}, () => {
  const ok = py("scripts/umum/laporan.py", "periksa", "public/banjir/data/laporan.json");
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const d = JSON.parse(readFileSync("public/banjir/data/laporan.json", "utf8"));
  const n = d.hari.length;
  d.nasional.banjir_sa.pop();
  const f = join(mkdtempSync(join(tmpdir(), "lap-")), "salah.json");
  writeFileSync(f, JSON.stringify(d));
  const bad = py("scripts/umum/laporan.py", "periksa", f);
  assert.notEqual(bad.status, 0, "berkas dengan seri terpotong harus ditolak");
  assert.match(bad.stdout, new RegExp(`panjang ${n - 1}, harus ${n}`));
});

test("halaman laporan memuat mesin bersama dengan id banjir", () => {
  const h = readFileSync("public/banjir/laporan.html", "utf8");
  assert.match(h, /Laporan\.pasang\(\{id: "banjir"\}\)/);
  assert.match(h, /\/inti\/laporan\.js/);
});
