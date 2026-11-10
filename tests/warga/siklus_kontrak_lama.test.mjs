/* Siklus Bencana F2: kontrak bangunan lama TIDAK berubah (SK-034, UJ-F2-06, PRD F2-07). Uji ini hanya MEMBACA kode produksi lama.
   Jalankan: node --test tests/warga/siklus_kontrak_lama.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {AKAR} from "./_bantu.mjs";
import "../../src/worker.js";
import {RUTE_BANGUNAN} from "../../src/bangunan.js";

const baca = f => readFileSync(path.join(AKAR, f));
/* hash kode kontrak lama; berubah = kontrak berubah: putuskan sadar, lalu perbarui angka ini di commit yang sama */
const HASH_BANGUNAN_JS = "06ce568c0714fc2e5fbec803e1d22e827eec784b8bfba7e2a685cf1d4a02658f";

uji("UJ-F2-06: src/bangunan.js tidak berubah dan hanya mengenal tiga rute /api/bangunan/*", () => {
  assert.equal(createHash("sha256").update(baca("src/bangunan.js")).digest("hex"), HASH_BANGUNAN_JS);
  assert.deepEqual(Object.keys(RUTE_BANGUNAN).sort(), ["GET /api/bangunan/grid", "GET /api/bangunan/kec", "GET /api/bangunan/terpapar"]);
});
uji("UJ-F2-06: terpapar.json lama masih bentuknya (kunci tingkat atas) dan tidak dipindah ke siklus/", () => {
  const j = JSON.parse(baca("public/data/bnpb/terpapar.json"));
  for (const k of ["dibuat", "sumber", "bahaya", "kab", "tahun_data"]) assert.ok(k in j, k);
  assert.ok(!readdirSync(path.join(AKAR, "public/data")).includes("siklus"), "tidak ada salinan di public/data/siklus");
});
uji("UJ-F2-06: kunci R2 bangunan/* masih di tempatnya; modul Siklus tidak menulis ke bangunan/ dan rute Siklus tidak memakai /api/bangunan", () => {
  const b = baca("src/bangunan.js").toString();
  for (const k of ["bangunan/terpapar.json", "bangunan/kec.json", "`bangunan/grid_${p}.json`"]) assert.ok(b.includes(k), k);
  for (const f of readdirSync(path.join(AKAR, "src")).filter(f => /^siklus.*\.js$/.test(f))) {
    const kode = baca("src/" + f).toString().replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(kode, /["'`]bangunan\//, f + " menyentuh kunci bangunan/");
    assert.doesNotMatch(kode, /MEDIA\.(put|delete)/, f + " menulis ke R2 (Siklus hanya membaca)");
  }
});
uji("UJ-F2-06: tiga rute /api/bangunan/* lulus uji lamanya (tests/warga/bangunan.test.mjs)", () => {
  const r = spawnSync(process.execPath, ["--test", "tests/warga/bangunan.test.mjs"], {cwd: AKAR, encoding: "utf8", timeout: 240000});
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(-1500));
});
