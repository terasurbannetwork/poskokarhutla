/* RU-043 PERB-1 (RENCANA-UJI 5.1): keluaran nyata perb1.py dirender rapor.js asli. Label wajib "bukan IRB resmi" dan "C proksi"
   ada di kartu, manfaat kecil tidak tampil 0, urutan menurut manfaat per km. Kasus rumus E1-E5 ada di perb1.py --cek. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const AKAR = fileURLToPath(new URL("../..", import.meta.url));
const ctx = {window: {}, Date, Intl, Number, String, Array, Math, Object, isNaN};
vm.createContext(ctx);
vm.runInContext(readFileSync(AKAR + "public/inti/format.js", "utf8") + "\n;globalThis.esc = esc; globalThis.fmt = fmt;", ctx);
vm.runInContext(readFileSync(AKAR + "public/bnpb/unit/rapor.js", "utf8"), ctx);
const py = kode => {
  const r = spawnSync("python3", ["-I", "-c", `import sys, json; sys.path.insert(0, "scripts/bnpb/unit"); ${kode}`], {cwd: AKAR, encoding: "utf8", maxBuffer: 64e6});
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};

test("perb1.py --cek hijau", () => {
  const r = spawnSync("python3", ["-I", "scripts/bnpb/unit/perb1.py", "--cek"], {cwd: AKAR, encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("kartu PERB-1 dari data nyata: label wajib, angka kecil terbaca, urutan menurun", () => {
  const b = JSON.parse(py("import perb1; print(json.dumps(perb1.jalan()['pendampingan_ikd']))"));
  const k = b.kartu[0], h = ctx.window.UnitRapor.html(k, {dibuat: "2026-11-26T00:00:00Z", basi_jam: 1080}, Date.parse("2026-11-26T01:00:00Z"));
  assert.match(h, /bukan IRB resmi/);
  assert.match(h, /C proksi/);
  assert.match(h, /Proksi/);
  assert.match(h, /Asumsi/);
  assert.match(h, /un-asumsi[^>]*>[\s\S]*?Asumsi: biaya proksi paling sedikit 100 km<\/button>/);
  assert.doesNotMatch(h, /(?<!bukan )IRB resmi/);
  const sel = [...h.matchAll(/data-label="Manfaat IRB hitungan \(per sejuta\)"[^>]*>([^<]+)</g)].map(m => m[1]);
  assert.equal(sel.length, k.baris.length);
  assert.ok(sel.every(t => t !== "0"), "manfaat tampil 0 padahal tidak nol");
  const r = k.baris.map(x => x.rasio);
  assert.deepEqual(r, [...r].sort((a, b) => b - a));
});
